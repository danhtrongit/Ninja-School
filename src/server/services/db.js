'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Lưu trữ JSON (ADR-10-1): toàn bộ dữ liệu nằm trong RAM; trên đĩa mỗi nhân vật một file chars/<khóa>.json,
// accounts/clans/meta mỗi loại một file. Chỉ ghi bản ghi bẩn, bất đồng bộ, có ngân sách mỗi tick; thao tác đổi nhiều
// bản ghi (giao dịch, thư có quà...) ghi qua nhóm ghi có nhật ký (commit). Nạp an toàn: file hỏng thì không chạy rỗng.
const fsp = fs.promises;
const { performance } = require('perf_hooks');
const TABLES = [
  ['accounts', 'accounts.json', () => ({})],
  ['clans', 'clans.json', () => ({})],
  ['meta', 'meta.json', () => ({ nextClanId: 1 })],
];
// bố cục 1 (một file cho mọi nhân vật): còn đọc để tách sang chars/
const LEGACY = 'characters.json';
const CHAR_DIR = 'chars';
const JOURNAL_DIR = 'journal';
const LAYOUT = 2;
// nhịp ghi: nhân vật tối đa 1 lần / 30 giây, bảng 5 giây (khẩn thì ngay); ngân sách mỗi tick; lùi khi đĩa lỗi
const CHAR_EVERY = 30000;
const TABLE_EVERY = 5000;
const BUDGET_MS = 8;
const BUDGET_N = 20;
// tối đa số lần ghi bất đồng bộ cùng lúc: giới hạn bộ nhớ đệm đang bay (RSS) khi hàng đợi dài
const MAX_INFLIGHT = 24;
const RETRY_MS = 5000;
const LOCK = 'server.lock';
// khóa của máy khác (container khác dùng chung ổ) không kiểm được pid: còn sống nếu được làm mới trong khoảng này
const LOCK_STALE = 90 * 1000;
// số lần lưu lỗi liên tiếp thì chặn vào game mới (người đang chơi vẫn chơi tiếp)
const SAVE_BLOCK = 3;

// thời gian dạng YYYYMMDD-HHmmss (giờ máy) cho tên file hỏng
function stamp(t = Date.now()) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Lỗi nạp dữ liệu: index.js thoát mã 2
class DBLoadError extends Error {
  constructor(msg, files) {
    super(msg);
    this.code = 'EDBLOAD';
    this.files = files || [];
  }
}

// Thư mục dữ liệu đang có tiến trình khác dùng: index.js thoát mã 3
class DBLockError extends Error {
  constructor(msg, pid) {
    super(msg);
    this.code = 'EDBLOCK';
    this.pid = pid;
  }
}

const isTable = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM: tiến trình có thật nhưng của người dùng khác
    return e.code === 'EPERM';
  }
}

// Đọc khóa thư mục: { pid, host, at } hoặc null; alive = tiến trình giữ khóa còn sống (không tính chính mình)
function readLock(dir) {
  const file = path.join(dir, LOCK);
  let info = null;
  let mtime = 0;
  try {
    mtime = fs.statSync(file).mtimeMs;
    info = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
  }
  if (!isTable(info)) return { pid: 0, alive: false };
  const sameHost = !info.host || info.host === os.hostname();
  const alive = info.pid !== process.pid && (sameHost ? pidAlive(info.pid) : Date.now() - mtime < LOCK_STALE);
  return { ...info, mtime, alive };
}

function fsyncDir(dir) {
  let fd = null;
  try {
    fd = fs.openSync(dir, 'r');
    fs.fsyncSync(fd);
  } catch (e) {
    // hệ điều hành không cho fsync thư mục (Windows, vài hệ tệp): bỏ qua
    if (!['EISDIR', 'EPERM', 'EINVAL', 'EBADF', 'EACCES', 'ENOTSUP'].includes(e.code)) throw e;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

async function fsyncDirAsync(dir) {
  let fh = null;
  try {
    fh = await fsp.open(dir, 'r');
    await fh.sync();
  } catch (e) {
    if (!['EISDIR', 'EPERM', 'EINVAL', 'EBADF', 'EACCES', 'ENOTSUP'].includes(e.code)) throw e;
  } finally {
    if (fh) await fh.close();
  }
}

// Băm mật khẩu bất đồng bộ (luồng libuv) qua hàng đợi nhỏ: không chặn vòng lặp, không chiếm hết luồng của fs
const HASH_RUN = 2;
const HASH_WAIT = 64;
const hashQ = { run: 0, wait: [] };
function hashNext() {
  while (hashQ.run < HASH_RUN && hashQ.wait.length) {
    const job = hashQ.wait.shift();
    hashQ.run++;
    crypto.scrypt(job.pw, job.salt, 64, (err, key) => {
      hashQ.run--;
      if (err) job.reject(err);
      else job.resolve(key.toString('hex'));
      hashNext();
    });
  }
}

class DB {
  // opts.forceEmpty: chấp nhận chạy rỗng khi file hỏng (mặc định theo FORCE_EMPTY=1); lỗi nạp → DBLoadError, khóa → DBLockError
  // opts.readonly: công cụ chỉ đọc (restore --check): không tách bố cục, không phát lại nhật ký xuống đĩa
  constructor(dir, opts = {}) {
    this.dir = dir;
    this.forceEmpty = opts.forceEmpty != null ? !!opts.forceEmpty : process.env.FORCE_EMPTY === '1';
    this.readonly = !!opts.readonly;
    fs.mkdirSync(dir, { recursive: true });
    // trạng thái lưu: saveErrors = số lần lỗi liên tiếp (về 0 khi ghi được)
    this.saveErrors = 0;
    this.lastSaveAt = 0;
    this.lastSaveMs = 0;
    this.lastSaveError = '';
    this.onSaveError = null;
    this.onSaveOk = null;
    this.locked = false;
    // giả lỗi ghi cho kiểm thử: chỉ khi NS_TEST=1
    // NS_TEST_SAVE_FAIL=n: n lần ghi liên tiếp ném lỗi, bắt đầu từ lần lưu tay đầu tiên (SIGUSR2 → armFail),
    // để đăng ký / tạo nhân vật trước đó ghi bình thường
    this._failArm = process.env.NS_TEST === '1' ? Math.max(0, parseInt(process.env.NS_TEST_SAVE_FAIL, 10) || 0) : 0;
    this._failLeft = 0;
    this._crashAfter = process.env.NS_TEST === '1' ? process.env.NS_CRASH_AFTER || '' : '';
    this.loadNotes = [];
    // bản ghi bẩn: khóa → { at, urgent }; Map giữ thứ tự chèn nên cũ nhất đứng trước
    this.dirtyMap = new Map();
    this.lastWrite = new Map();
    // khóa → promise của lần ghi bất đồng bộ đang chạy
    this.inflight = new Map();
    // nhóm ghi chưa xong: gen → { rel, str, keys, recs }; khóa đang thuộc nhóm ghi → số nhóm (flushTick không ghi chen)
    this.journals = new Map();
    this.pending = new Map();
    this.commitQ = Promise.resolve();
    this.bufPool = [];
    // số thứ tự lần ghi mỗi khóa: lần ghi bất đồng bộ cũ không được đổi tên đè lên lần ghi mới hơn
    this.wseq = new Map();
    // _gen của bản ghi trên đĩa (nhóm ghi cuối cùng chạm tới), không giữ trong đối tượng RAM
    this.gens = Object.create(null);
    this.retryAt = 0;
    // opts.lock: giữ khóa DATA_DIR suốt đời tiến trình (máy chủ); công cụ chỉ đọc thì không khóa
    if (opts.lock) this.lock();
    const bad = [];
    for (const [key, name, def] of TABLES) {
      const r = this._load(name, def);
      if (r.bad) bad.push(r.bad);
      this[key] = this._strip(`#${key}`, r.data);
    }
    const layout2 = this.meta.layout === LAYOUT && fs.existsSync(this._file(CHAR_DIR));
    if (layout2) this.chars = this._loadChars(bad);
    else {
      const r = this._load(LEGACY, () => ({}));
      if (r.bad) bad.push(r.bad);
      this.chars = r.data;
    }
    if (bad.length) {
      this.unlock();
      throw new DBLoadError(`Dữ liệu hỏng, không khởi động để tránh ghi đè: ${bad.join('; ')}`, bad);
    }
    if (!layout2 && !this.readonly) this.migrateLayout();
    else if (layout2 && !this.readonly && fs.existsSync(this._file(LEGACY))) this._retireLegacy();
    this._replayJournal();
    // thế hệ nhóm ghi tăng mãi: không thấp hơn _gen nào đã có trên đĩa
    this.meta.gen = Math.max(this.meta.gen || 0, ...Object.values(this.gens), 0);
  }

  armFail() {
    if (!this._failArm) return;
    this._failLeft = this._failArm;
    this._failArm = 0;
  }

  _file(name) { return path.join(this.dir, name); }

  // _gen trong file là của đĩa: bỏ khỏi đối tượng RAM, nhớ riêng
  _strip(key, data) {
    if (data && typeof data === 'object' && '_gen' in data) {
      this.gens[key] = +data._gen || 0;
      delete data._gen;
    }
    return data;
  }

  // Nạp một file → { data, bad? }. Thiếu file → mặc định. Hỏng → đổi tên .corrupt-<giờ>, thử .tmp;
  // không có bản tốt thì báo bad (trừ khi forceEmpty)
  _load(name, def) {
    const f = this._file(name);
    const tmp = `${f}.tmp`;
    // .atmp: lần ghi bất đồng bộ chưa kịp đổi tên, file chính vẫn là bản hợp lệ trước đó
    if (!this.readonly) fs.rmSync(`${f}.atmp`, { force: true });
    let raw = null;
    let why = '';
    try {
      raw = fs.readFileSync(f, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') why = e.message;
    }
    if (raw !== null) {
      try {
        const data = JSON.parse(raw);
        if (isTable(data)) return { data };
        why = 'không phải bảng JSON';
      } catch (e) {
        why = raw.length ? `JSON hỏng (${e.message})` : 'file rỗng 0 byte';
      }
    }
    // file gốc hỏng: giữ nguyên nội dung dưới tên khác, không bao giờ xóa
    if (why && !this.readonly) {
      const keep = `${f}.corrupt-${stamp()}`;
      try {
        fs.renameSync(f, keep);
        console.error(`[db] ${name}: ${why}. Đã giữ file hỏng ở ${path.basename(keep)}`);
      } catch (e) {
        console.error(`[db] ${name}: ${why}. Không đổi tên được: ${e.message}`);
      }
    }
    // file tạm của lần ghi dở: hợp lệ thì dùng và đưa về làm file chính
    const fromTmp = this._readTmp(tmp);
    if (fromTmp) {
      if (!this.readonly) {
        try {
          fs.renameSync(tmp, f);
          fsyncDir(path.dirname(f));
        } catch (e) {
          console.error(`[db] ${name}: không đưa được ${path.basename(tmp)} về file chính: ${e.message}`);
        }
      }
      const note = `${name}: nạp từ ${path.basename(tmp)}`;
      this.loadNotes.push(note);
      console.error(`[db] ${note}`);
      return { data: fromTmp };
    }
    // thiếu file mà còn dấu file hỏng từ lần khởi động trước: vẫn là dữ liệu bị mất, không chạy rỗng
    if (!why) {
      const prev = this._corruptOf(name);
      if (!prev.length) return { data: def() };
      why = `thiếu file, còn file hỏng ${prev[prev.length - 1]}`;
    }
    if (this.forceEmpty) {
      const note = `${name}: ${why} → chạy rỗng (FORCE_EMPTY=1)`;
      this.loadNotes.push(note);
      console.error(`[db] ${note}`);
      return { data: def() };
    }
    return { data: def(), bad: `${name} (${why})` };
  }

  _readTmp(tmp) {
    try {
      const data = JSON.parse(fs.readFileSync(tmp, 'utf8'));
      return isTable(data) ? data : null;
    } catch (e) {
      return null;
    }
  }

  _corruptOf(name) {
    const f = this._file(name);
    try {
      return fs.readdirSync(path.dirname(f)).filter((x) => x.startsWith(`${path.basename(f)}.corrupt-`)).sort();
    } catch (e) {
      return [];
    }
  }

  // chars/<khóa>.json: mỗi nhân vật một file; nhận cả khóa chỉ còn .tmp (ghi dở) hay .corrupt-* (hỏng lần trước)
  _loadChars(bad) {
    const dir = this._file(CHAR_DIR);
    const keys = new Set();
    for (const x of fs.readdirSync(dir)) {
      if (x.endsWith('.atmp')) {
        // ghi bất đồng bộ dở dang lúc tắt: file chính vẫn là bản trước, bỏ
        if (!this.readonly) try { fs.unlinkSync(path.join(dir, x)); } catch (e) { /* đã mất */ }
        continue;
      }
      const m = /^(.+)\.json(?:\.tmp|\.corrupt-.*)?$/.exec(x);
      if (m) keys.add(m[1]);
    }
    const chars = {};
    for (const fk of keys) {
      const r = this._load(path.join(CHAR_DIR, `${fk}.json`), () => null);
      if (r.bad) bad.push(r.bad);
      if (!r.data) continue;
      const key = decodeURIComponent(fk);
      chars[key] = this._strip(key, r.data);
    }
    return chars;
  }

  // Tách characters.json (bố cục 1) thành chars/<khóa>.json, ghi meta.layout = 2 rồi đổi tên file cũ (giữ lại)
  migrateLayout() {
    fs.mkdirSync(this._file(CHAR_DIR), { recursive: true });
    for (const [key, c] of Object.entries(this.chars)) this._writeSync(this._relOf(key), JSON.stringify(c));
    fsyncDir(this._file(CHAR_DIR));
    this.meta.layout = LAYOUT;
    this._writeSync('meta.json', JSON.stringify(this.meta));
    fsyncDir(this.dir);
    const n = Object.keys(this.chars).length;
    if (fs.existsSync(this._file(LEGACY))) {
      this._retireLegacy();
      const note = `tách ${LEGACY} thành ${CHAR_DIR}/ (${n} nhân vật)`;
      this.loadNotes.push(note);
      console.log(`[db] ${note}`);
    }
  }

  _retireLegacy() {
    try {
      fs.renameSync(this._file(LEGACY), this._file(`characters.migrated-${stamp()}.json`));
      for (const x of [`${LEGACY}.tmp`]) if (fs.existsSync(this._file(x))) fs.unlinkSync(this._file(x));
      fsyncDir(this.dir);
    } catch (e) {
      console.error(`[db] không đổi tên được ${LEGACY}: ${e.message}`);
    }
  }

  // ---------- Khóa bản ghi: tên nhân vật (chữ thường) hoặc '#accounts' / '#clans' / '#meta'
  _relOf(key) {
    if (key[0] === '#') return `${key.slice(1)}.json`;
    return path.join(CHAR_DIR, `${encodeURIComponent(key)}.json`);
  }

  _recOf(key) {
    if (key[0] === '#') return this[key.slice(1)];
    return own(this.chars, key) ? this.chars[key] : null;
  }

  _keyOf(name) {
    const k = String(name);
    return k[0] === '#' ? k : k.toLowerCase();
  }

  // ---------- Khóa thư mục: hai tiến trình cùng ghi một DATA_DIR sẽ đè dữ liệu của nhau
  lock() {
    const file = this._file(LOCK);
    const body = JSON.stringify({ pid: process.pid, host: os.hostname(), at: Date.now() });
    for (let i = 0; i < 2; i++) {
      try {
        const fd = fs.openSync(file, 'wx');
        try { fs.writeSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        this.locked = true;
        return;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
      const cur = readLock(this.dir);
      if (cur && cur.alive) throw new DBLockError(`DATA_DIR đang được tiến trình ${cur.pid} dùng (${file})`, cur.pid);
      // khóa của tiến trình đã chết (sập, mất điện): bỏ đi rồi lấy lại
      try { fs.unlinkSync(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    throw new DBLockError(`Không lấy được khóa ${file}`, 0);
  }

  // làm mới giờ của khóa (máy khác dùng chung ổ biết tiến trình này còn chạy)
  touchLock() {
    if (!this.locked) return;
    const now = new Date();
    try { fs.utimesSync(this._file(LOCK), now, now); } catch (e) { /* bỏ qua */ }
  }

  unlock() {
    if (!this.locked) return;
    this.locked = false;
    const cur = readLock(this.dir);
    if (cur && cur.pid === process.pid) {
      try { fs.unlinkSync(this._file(LOCK)); } catch (e) { /* đã mất */ }
    }
  }

  // ---------- Đánh dấu bẩn
  // touch(tên nhân vật | '#accounts' | '#clans' | '#meta', khẩn): khẩn = ghi trong ≤ 1 giây (tiêu lượng, cường hóa cao, nhận quà...)
  touch(name, urgent = false) {
    const key = this._keyOf(name);
    const e = this.dirtyMap.get(key);
    if (!e) this.dirtyMap.set(key, { at: Date.now(), urgent: !!urgent });
    else if (urgent) e.urgent = true;
  }

  // mã cũ đọc db.dirty: còn bản ghi chưa ghi
  get dirty() {
    return this.dirtyMap.size > 0;
  }

  // ---------- Ghi
  _writeAll(fd, buf) {
    let off = 0;
    while (off < buf.length) {
      this._maybeFail();
      off += fs.writeSync(fd, buf, off, buf.length - off);
    }
  }

  _maybeFail() {
    if (this._failLeft > 0) {
      this._failLeft--;
      throw new Error('NS_TEST_SAVE_FAIL: giả lỗi ghi');
    }
  }

  // ghi đồng bộ: tmp + fsync + rename (thư mục fsync do người gọi khi ghi nhiều file)
  _writeSync(rel, str) {
    const f = this._file(rel);
    const tmp = `${f}.tmp`;
    const buf = Buffer.from(str);
    const fd = fs.openSync(tmp, 'w');
    try {
      this._writeAll(fd, buf);
      fs.fsyncSync(fd);
    } catch (e) {
      fs.closeSync(fd);
      try { fs.unlinkSync(tmp); } catch (e2) { /* không còn */ }
      throw e;
    }
    fs.closeSync(fd);
    fs.renameSync(tmp, f);
  }

  _seq(key) {
    const n = (this.wseq.get(key) || 0) + 1;
    this.wseq.set(key, n);
    return n;
  }

  // chuỗi JSON của bản ghi kèm _gen (nếu bản ghi từng nằm trong một nhóm ghi); null = bản ghi đã xóa
  _serialize(key) {
    const rec = this._recOf(key);
    if (!rec) return null;
    const str = JSON.stringify(rec);
    const g = this.gens[key];
    return g && str.length > 2 ? `{"_gen":${g},${str.slice(1)}` : str;
  }

  _unlinkRec(key) {
    for (const f of [this._file(this._relOf(key)), `${this._file(this._relOf(key))}.tmp`]) {
      try { fs.unlinkSync(f); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
  }

  _saveFailed(e) {
    this.saveErrors++;
    this.lastSaveError = e.message;
    console.error(`[ALERT] lưu thất bại (lần ${this.saveErrors} liên tiếp): ${e.message}`);
    if (this.onSaveError) {
      try { this.onSaveError(e, this.saveErrors); } catch (e2) { console.error('[db] onSaveError:', e2.message); }
    }
  }

  _saveOk(ms) {
    const had = this.saveErrors;
    this.saveErrors = 0;
    this.lastSaveError = '';
    this.lastSaveAt = Date.now();
    if (ms != null) this.lastSaveMs = ms;
    if (had) {
      console.log(`[db] lưu lại được sau ${had} lần lỗi`);
      if (this.onSaveOk) {
        try { this.onSaveOk(had); } catch (e2) { console.error('[db] onSaveOk:', e2.message); }
      }
    }
  }

  // Bộ lập lịch, gọi mỗi tick (50 ms): ghi bản ghi bẩn cũ nhất trước, mỗi nhân vật tối đa 1 lần / 30 giây
  // (bảng tài khoản/gia tộc/meta: 5 giây) trừ khi khẩn; ngân sách 8 ms stringify hoặc 20 bản ghi mỗi tick
  flushTick(now = Date.now()) {
    if (!this.dirtyMap.size || now < this.retryAt) return 0;
    const t0 = performance.now();
    let n = 0;
    for (const [key, e] of this.dirtyMap) {
      if (n >= BUDGET_N || this.inflight.size >= MAX_INFLIGHT || performance.now() - t0 >= BUDGET_MS) break;
      if (this.inflight.has(key) || this.pending.has(key)) continue;
      const every = key[0] === '#' ? TABLE_EVERY : CHAR_EVERY;
      if (!e.urgent && now - (this.lastWrite.get(key) || 0) < every) continue;
      this.dirtyMap.delete(key);
      n++;
      this._writeAsync(key, this._serialize(key));
    }
    return n;
  }

  // ghi một bản ghi bất đồng bộ (tmp riêng .atmp + fsync + rename); bản ghi đang ghi dở thì không ghi chồng
  _writeAsync(key, str) {
    const seq = this._seq(key);
    const f = this._file(this._relOf(key));
    const t0 = Date.now();
    const job = str === null ? fsp.rm(f, { force: true })
      // lần ghi đồng bộ mới hơn (tắt máy, nhóm ghi) đã ghi khóa này: bỏ bản cũ
      : this._writeFileAsync(this._relOf(key), str, () => this.wseq.get(key) === seq);
    const done = job.then(() => {
      this.lastWrite.set(key, Date.now());
      this._saveOk(Date.now() - t0);
    }, (e) => {
      // giữ cờ bẩn để ghi lại, lùi 5 giây cho đĩa đang lỗi khỏi bị dội
      if (!this.dirtyMap.has(key)) this.dirtyMap.set(key, { at: Date.now(), urgent: true });
      this.retryAt = Date.now() + RETRY_MS;
      this._saveFailed(e);
    }).finally(() => {
      if (this.inflight.get(key) === done) this.inflight.delete(key);
    });
    this.inflight.set(key, done);
    return done;
  }

  // Xả hết hàng đợi bằng ghi đồng bộ (tắt máy, lỗi chết người, công cụ). Trả true nếu không lỗi
  flushAllSync() {
    const t0 = Date.now();
    let fail = null;
    // nhóm ghi chưa xong: ghi nhật ký trước (đồng bộ), sập giữa lúc ghi các bản ghi bên dưới thì vẫn phát lại được
    const open = [...this.journals.keys()].sort((a, b) => a - b);
    try {
      if (open.length) {
        fs.mkdirSync(this._file(JOURNAL_DIR), { recursive: true });
        for (const gen of open) this._writeSync(this.journals.get(gen).rel, this.journals.get(gen).str);
        fsyncDir(this._file(JOURNAL_DIR));
      }
    } catch (e) {
      this._saveFailed(e);
      return false;
    }
    // bản ghi đang ghi bất đồng bộ / thuộc nhóm ghi cũng ghi lại: tiến trình sắp thoát thì các lần ghi đó không kịp xong
    const keys = [...new Set([...this.dirtyMap.keys(), ...this.inflight.keys(), ...this.pending.keys()])];
    for (const key of keys) {
      try {
        this._seq(key);
        const str = this._serialize(key);
        if (str === null) this._unlinkRec(key);
        else this._writeSync(this._relOf(key), str);
        this.dirtyMap.delete(key);
        this.lastWrite.set(key, Date.now());
      } catch (e) {
        // đĩa lỗi: dừng, phần còn lại giữ cờ bẩn cho lần sau
        fail = e;
        break;
      }
    }
    try {
      if (keys.some((k) => k[0] !== '#')) fsyncDir(this._file(CHAR_DIR));
      fsyncDir(this.dir);
      // mọi bản ghi của các nhóm đã nằm trên đĩa với _gen ≥ gen: bỏ nhật ký
      if (!fail && open.length) {
        for (const gen of open) {
          fs.rmSync(this._file(this.journals.get(gen).rel), { force: true });
          this.journals.delete(gen);
        }
        this.pending.clear();
        fsyncDir(this._file(JOURNAL_DIR));
      }
    } catch (e) {
      fail = fail || e;
    }
    if (fail) {
      // đĩa đang lỗi: ghi nền cũng lùi 5 giây
      this.retryAt = Date.now() + RETRY_MS;
      this._saveFailed(fail);
      return false;
    }
    this._saveOk(Date.now() - t0);
    return true;
  }

  // Lưu ngay mọi thứ (lệnh tay, SIGUSR2, công cụ): ghi cả 3 bảng và mọi bản ghi bẩn
  save() {
    for (const [key] of TABLES) this.touch(`#${key}`);
    return this.flushAllSync();
  }

  // Nhóm ghi nguyên tử cho thao tác đổi nhiều bản ghi (giao dịch, tạo nhân vật, mã quà...), không chặn vòng lặp:
  // ngay lúc gọi: gen = ++meta.gen, chụp các bản ghi (kèm _gen); sau đó theo hàng đợi (từng nhóm một):
  // (1) ghi journal/<gen>.json + fsync; (2) ghi từng bản ghi + fsync; (3) xóa nhật ký.
  // Sập trước (1) xong: không bản ghi nào đổi; sập giữa (2): lần khởi động sau phát lại nhật ký.
  // Trả promise → true khi ghi xong (lỗi đĩa: false, tự thử lại sau 5 giây; tắt máy thì flushAllSync ghi thay)
  commit(names, reason) {
    const keys = [...new Set([].concat(names).map((n) => this._keyOf(n)))];
    const gen = (this.meta.gen || 0) + 1;
    this.meta.gen = gen;
    const recs = {};
    for (const key of keys) {
      this.gens[key] = gen;
      recs[key] = this._serialize(key);
      this.dirtyMap.delete(key);
      this.pending.set(key, (this.pending.get(key) || 0) + 1);
    }
    const body = keys.map((k) => `${JSON.stringify(k)}:${recs[k] === null ? 'null' : recs[k]}`).join(',');
    const str = `{"gen":${gen},"reason":${JSON.stringify(String(reason || ''))},"at":${Date.now()},"recs":{${body}}}`;
    this.journals.set(gen, { rel: path.join(JOURNAL_DIR, `${gen}.json`), str, keys, recs });
    // meta.gen phải còn sau khởi động lại: ghi theo nhịp thường
    this.touch('#meta');
    const job = this.commitQ.then(() => this._commitAsync(gen));
    this.commitQ = job;
    return job;
  }

  async _commitAsync(gen) {
    const j = this.journals.get(gen);
    // flushAllSync (tắt máy, lưu tay) đã ghi trọn nhóm này
    if (!j) return true;
    const live = () => this.journals.get(gen) === j;
    const t0 = Date.now();
    try {
      await fsp.mkdir(this._file(JOURNAL_DIR), { recursive: true });
      await this._writeFileAsync(j.rel, j.str, live);
      await fsyncDirAsync(this._file(JOURNAL_DIR));
      for (let i = 0; i < j.keys.length; i++) {
        const key = j.keys[i];
        // lần ghi thường bắt đầu trước nhóm này mang dữ liệu cũ hơn: chờ nó xong để không đè lên
        const prev = this.inflight.get(key);
        if (prev) await prev;
        if (!live()) return true;
        const seq = this._seq(key);
        const own = () => live() && this.wseq.get(key) === seq;
        if (j.recs[key] === null) {
          if (own()) await fsp.rm(this._file(this._relOf(key)), { force: true });
        } else await this._writeFileAsync(this._relOf(key), j.recs[key], own);
        this.lastWrite.set(key, Date.now());
        if (this._crashAfter === `commit-rec-${i + 1}`) process.kill(process.pid, 'SIGKILL');
      }
      if (!live()) return true;
      await fsyncDirAsync(this._file(CHAR_DIR));
      await fsyncDirAsync(this.dir);
      if (!live()) return true;
      await fsp.rm(this._file(j.rel), { force: true });
      this._closeJournal(gen);
      this._saveOk(Date.now() - t0);
      return true;
    } catch (e) {
      // RAM đã đúng; nhật ký (nếu đã ghi) được phát lại lúc khởi động. Thử lại cả nhóm sau 5 giây
      this._saveFailed(e);
      if (live()) {
        const t = setTimeout(() => { this.commitQ = this.commitQ.then(() => this._commitAsync(gen)); }, RETRY_MS);
        if (t.unref) t.unref();
      }
      return false;
    }
  }

  _closeJournal(gen) {
    const j = this.journals.get(gen);
    if (!j) return;
    this.journals.delete(gen);
    for (const key of j.keys) {
      const n = (this.pending.get(key) || 1) - 1;
      if (n > 0) this.pending.set(key, n);
      else this.pending.delete(key);
    }
  }

  // ghi file bất đồng bộ bền: .atmp + fsync, rồi đổi tên nếu ok() còn đúng (không thì bỏ bản tạm).
  // Mã hóa vào bộ đệm dùng lại (không cấp Buffer mới mỗi lần ghi: bộ nhớ ngoài heap không phình khi xả hàng loạt)
  async _writeFileAsync(rel, str, ok) {
    const f = this._file(rel);
    const tmp = `${f}.atmp`;
    const len = Buffer.byteLength(str);
    const buf = this.bufPool.pop() || null;
    const b = buf && buf.length >= len ? buf : Buffer.allocUnsafe(Math.max(len, 65536));
    b.write(str, 0, len);
    let fh = null;
    try {
      fh = await fsp.open(tmp, 'w');
      this._maybeFail();
      for (let off = 0; off < len;) off += (await fh.write(b, off, len - off, off)).bytesWritten;
      await fh.sync();
      await fh.close();
      fh = null;
    } catch (e) {
      if (fh) await fh.close().catch(() => {});
      await fsp.rm(tmp, { force: true }).catch(() => {});
      throw e;
    } finally {
      if (this.bufPool.length < MAX_INFLIGHT + 2) this.bufPool.push(b);
    }
    if (ok && !ok()) {
      await fsp.rm(tmp, { force: true });
      return false;
    }
    await fsp.rename(tmp, f);
    return true;
  }

  // Phát lại nhật ký nhóm ghi còn sót (sập giữa commit): bản ghi có _gen < gen của nhật ký thì lấy từ nhật ký
  _replayJournal() {
    const jdir = this._file(JOURNAL_DIR);
    let list = [];
    try { list = fs.readdirSync(jdir).filter((x) => /^\d+\.json$/.test(x)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); } catch (e) { return; }
    for (const x of list) {
      let j = null;
      try { j = JSON.parse(fs.readFileSync(path.join(jdir, x), 'utf8')); } catch (e) { /* ghi dở ở bước (2): chưa bản ghi nào bị đổi */ }
      if (j && isTable(j.recs) && j.gen > 0) {
        let n = 0;
        for (const [key, rec] of Object.entries(j.recs)) {
          if ((this.gens[key] || 0) >= j.gen) continue;
          n++;
          if (key[0] === '#') this[key.slice(1)] = this._strip(key, rec);
          else if (rec) this.chars[key] = this._strip(key, rec);
          else delete this.chars[key];
          this.gens[key] = j.gen;
          if (!this.readonly) {
            if (rec) this._writeSync(this._relOf(key), this._serialize(key));
            else this._unlinkRec(key);
          }
        }
        const note = `phát lại nhật ký ${x} (${j.reason}): ${n} bản ghi`;
        this.loadNotes.push(note);
        console.error(`[db] ${note}`);
        this.meta.gen = Math.max(this.meta.gen || 0, j.gen);
      }
      if (!this.readonly) {
        fs.unlinkSync(path.join(jdir, x));
        fsyncDir(jdir);
      }
    }
    if (list.length && !this.readonly) this._writeSync('meta.json', this._serialize('#meta'));
  }

  // đang lỗi lưu nặng: không cho vào game mới (tiến độ mới sẽ không được ghi)
  saveBlocked() {
    return this.saveErrors >= SAVE_BLOCK;
  }

  // ---------- Tài khoản
  // scryptSync giữ cho công cụ ngoài vòng lặp game; máy chủ dùng hashAsync
  static hash(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  // cùng tham số với hash() nên băm cũ vẫn so được. Hàng đợi đầy → lỗi code 'EBUSY'
  static hashAsync(password, salt) {
    if (hashQ.wait.length >= HASH_WAIT) {
      const e = new Error('Hàng đợi băm mật khẩu đầy');
      e.code = 'EBUSY';
      return Promise.reject(e);
    }
    return new Promise((resolve, reject) => {
      hashQ.wait.push({ pw: password, salt, resolve, reject });
      hashNext();
    });
  }

  createAccount(username, password) {
    const key = username.toLowerCase();
    if (this.accounts[key]) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    return this._putAccount(username, salt, DB.hash(password, salt));
  }

  async createAccountAsync(username, password) {
    const key = username.toLowerCase();
    if (this.accounts[key]) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await DB.hashAsync(password, salt);
    // có người đăng ký trùng tên trong lúc chờ băm
    if (this.accounts[key]) return null;
    return this._putAccount(username, salt, hash);
  }

  _putAccount(username, salt, hash) {
    const key = username.toLowerCase();
    this.accounts[key] = { username, salt, hash, created: Date.now(), chars: [], tokens: {} };
    this.touch('#accounts', true);
    return this.accounts[key];
  }

  _same(h, acc) {
    const a = Buffer.from(h, 'hex');
    const b = Buffer.from(String(acc.hash || ''), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  checkPassword(username, password) {
    const acc = this.accounts[username.toLowerCase()];
    if (!acc) return null;
    return this._same(DB.hash(password, acc.salt), acc) ? acc : null;
  }

  async checkPasswordAsync(username, password) {
    const key = username.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(this.accounts, key)) return null;
    const acc = this.accounts[key];
    const h = await DB.hashAsync(password, acc.salt);
    return this.accounts[key] === acc && this._same(h, acc) ? acc : null;
  }

  issueToken(acc) {
    const token = crypto.randomBytes(24).toString('hex');
    acc.tokens = acc.tokens || {};
    const now = Date.now();
    for (const k in acc.tokens) if (acc.tokens[k] < now) delete acc.tokens[k];
    const keys = Object.keys(acc.tokens);
    if (keys.length > 5) delete acc.tokens[keys[0]];
    acc.tokens[token] = now + 30 * 24 * 3600 * 1000;
    this.touch('#accounts');
    return token;
  }

  checkToken(username, token) {
    const acc = this.accounts[String(username).toLowerCase()];
    if (!acc || !acc.tokens || typeof token !== 'string') return null;
    const exp = acc.tokens[token];
    if (!exp || exp < Date.now()) return null;
    return acc;
  }

  // tên do người chơi/admin gõ: chỉ lấy khóa riêng của bảng ('__proto__', 'constructor' không trỏ vào Object.prototype)
  getChar(name) {
    const k = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.chars, k) ? this.chars[k] : null;
  }

  // đặt/đánh dấu bẩn bản ghi nhân vật; urgent = ghi trong ≤ 1 giây
  putChar(c, urgent = false) {
    this.chars[c.name.toLowerCase()] = c;
    this.touch(c.name, urgent);
  }

  deleteChar(name) {
    delete this.chars[name.toLowerCase()];
    this.touch(name, true);
  }

  newClanId() {
    const id = this.meta.nextClanId++;
    this.touch('#meta');
    return String(id);
  }
}

module.exports = { DB, DBLoadError, DBLockError, TABLES, LEGACY, CHAR_DIR, JOURNAL_DIR, LOCK, LOCK_STALE, readLock, pidAlive, fsyncDir, stamp };
