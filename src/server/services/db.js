'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Lưu trữ JSON đơn giản: nạp toàn bộ vào RAM, ghi định kỳ.
// Nạp an toàn: file hỏng thì không bao giờ chạy với bảng rỗng (sẽ ghi đè mất dữ liệu thật),
// ghi bền: file tạm + fsync + đổi tên + fsync thư mục, lỗi ghi được đếm để báo động.
const FILES = [
  ['accounts', 'accounts.json', () => ({})],
  ['chars', 'characters.json', () => ({})],
  ['clans', 'clans.json', () => ({})],
  ['meta', 'meta.json', () => ({ nextClanId: 1 })],
];
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
  constructor(dir, opts = {}) {
    this.dir = dir;
    this.forceEmpty = opts.forceEmpty != null ? !!opts.forceEmpty : process.env.FORCE_EMPTY === '1';
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
    this._failLeft = process.env.NS_TEST === '1' ? Math.max(0, parseInt(process.env.NS_TEST_SAVE_FAIL, 10) || 0) : 0;
    this.loadNotes = [];
    // opts.lock: giữ khóa DATA_DIR suốt đời tiến trình (máy chủ); công cụ chỉ đọc thì không khóa
    if (opts.lock) this.lock();
    const bad = [];
    for (const [key, name, def] of FILES) {
      const r = this._load(name, def);
      if (r.bad) bad.push(r.bad);
      this[key] = r.data;
    }
    if (bad.length) {
      this.unlock();
      throw new DBLoadError(`Dữ liệu hỏng, không khởi động để tránh ghi đè: ${bad.join('; ')}`, bad);
    }
    this.dirty = false;
  }

  _file(name) { return path.join(this.dir, name); }

  // Nạp một file → { data, bad? }. Thiếu file → mặc định. Hỏng → đổi tên .corrupt-<giờ>, thử .tmp;
  // không có bản tốt thì báo bad (trừ khi forceEmpty)
  _load(name, def) {
    const f = this._file(name);
    const tmp = `${f}.tmp`;
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
    if (why) {
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
      try {
        fs.renameSync(tmp, f);
        fsyncDir(this.dir);
      } catch (e) {
        console.error(`[db] ${name}: không đưa được ${path.basename(tmp)} về file chính: ${e.message}`);
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
    try {
      return fs.readdirSync(this.dir).filter((x) => x.startsWith(`${name}.corrupt-`)).sort();
    } catch (e) {
      return [];
    }
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

  // ---------- Ghi
  _writeAll(fd, buf) {
    let off = 0;
    while (off < buf.length) {
      if (this._failLeft > 0) {
        this._failLeft--;
        throw new Error('NS_TEST_SAVE_FAIL: giả lỗi ghi');
      }
      off += fs.writeSync(fd, buf, off, buf.length - off);
    }
  }

  _write(name, data) {
    const f = this._file(name);
    const tmp = `${f}.tmp`;
    const buf = Buffer.from(JSON.stringify(data));
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

  // Ghi đồng bộ cả 4 file; trả true nếu thành công
  save() {
    const t0 = Date.now();
    try {
      for (const [key, name] of FILES) this._write(name, this[key]);
      fsyncDir(this.dir);
    } catch (e) {
      this.saveErrors++;
      this.lastSaveError = e.message;
      console.error(`[ALERT] lưu thất bại (lần ${this.saveErrors} liên tiếp): ${e.message}`);
      if (this.onSaveError) {
        try { this.onSaveError(e, this.saveErrors); } catch (e2) { console.error('[db] onSaveError:', e2.message); }
      }
      return false;
    }
    const had = this.saveErrors;
    this.saveErrors = 0;
    this.lastSaveError = '';
    this.lastSaveAt = Date.now();
    this.lastSaveMs = this.lastSaveAt - t0;
    this.dirty = false;
    if (had) {
      console.log(`[db] lưu lại được sau ${had} lần lỗi`);
      if (this.onSaveOk) {
        try { this.onSaveOk(had); } catch (e2) { console.error('[db] onSaveOk:', e2.message); }
      }
    }
    return true;
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
    this.dirty = true;
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
    this.dirty = true;
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

  putChar(c) {
    this.chars[c.name.toLowerCase()] = c;
    this.dirty = true;
  }

  deleteChar(name) {
    delete this.chars[name.toLowerCase()];
    this.dirty = true;
  }

  newClanId() {
    const id = this.meta.nextClanId++;
    this.dirty = true;
    return String(id);
  }
}

module.exports = { DB, DBLoadError, DBLockError, FILES, LOCK, LOCK_STALE, readLock, pidAlive, fsyncDir, stamp };
