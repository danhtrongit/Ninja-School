'use strict';

// Sao lưu theo tầng trong DATA_DIR/backups/<tầng>/<YYYYMMDD-HHmmss>[-nhãn].tgz (giờ Việt Nam).
// Mỗi bản là tar.gz của DATA_DIR (trừ backups/, khóa, file tạm, file hỏng), tạo bằng tiến trình con `tar`
// nên không chặn vòng lặp game. Lịch theo chu kỳ, không theo lần khởi động: tầng nào chưa có bản của
// chu kỳ hiện tại thì tạo (khởi động lại nhiều lần không sinh thêm bản, không xoay mất bản cũ).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { LOCK } = require('./db');

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const VN = 7 * HOUR;
// off: phút lệch trong chu kỳ (giờ: phút 05; ngày: 03:05; tuần: thứ Hai 03:10)
const TIERS = {
  hourly: { keep: 48, off: 5 * MIN },
  daily: { keep: 30, off: 3 * HOUR + 5 * MIN },
  weekly: { keep: 12, off: 3 * HOUR + 10 * MIN },
  pre: { keep: 10 },
};
const SCHEDULED = ['hourly', 'daily', 'weekly'];
const NAME_RE = /^(\d{8})-(\d{6})(?:-([A-Za-z0-9_.]{1,40}))?\.tgz$/;
const TAG_RE = /^[A-Za-z0-9_.]{1,40}$/;
// file/thư mục trong DATA_DIR không đưa vào bản sao lưu
const skipEntry = (n) => n === 'backups' || n === 'restore' || n === LOCK || n.startsWith('.') || n.endsWith('.tmp') || n.includes('.corrupt-') || n.startsWith('before-restore-');

// chu kỳ (số nguyên tăng dần) của thời điểm t theo tầng
function period(tier, t) {
  const x = t + VN - TIERS[tier].off;
  if (tier === 'hourly') return Math.floor(x / HOUR);
  const d = Math.floor(x / DAY);
  if (tier === 'daily') return d;
  // tuần bắt đầu thứ Hai (1/1/1970 là thứ Năm)
  return d - ((d + 3) % 7);
}

function fileName(t, tag) {
  const d = new Date(t + VN);
  const p = (n) => String(n).padStart(2, '0');
  const s = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${s}${tag ? `-${tag}` : ''}.tgz`;
}

// thời điểm tạo từ tên file (null nếu không phải tên bản sao lưu)
function parseName(name) {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const [y, mo, d] = [m[1].slice(0, 4), m[1].slice(4, 6), m[1].slice(6, 8)].map(Number);
  const [h, mi, s] = [m[2].slice(0, 2), m[2].slice(2, 4), m[2].slice(4, 6)].map(Number);
  return { t: Date.UTC(y, mo - 1, d, h, mi, s) - VN, tag: m[3] || '' };
}

// chạy lệnh, trả { code, out, err }
function run(cmd, args, o = {}) {
  return new Promise((resolve) => {
    let ch;
    try {
      ch = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...o });
    } catch (e) {
      return resolve({ code: -1, out: '', err: e.message });
    }
    let out = '';
    let err = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('error', (e) => { err += e.message; });
    ch.on('close', (code) => resolve({ code: code == null ? -1 : code, out, err }));
  });
}

// macOS: không cho tar thêm file ._ chứa thuộc tính mở rộng
const TAR_ENV = { ...process.env, COPYFILE_DISABLE: '1' };

// Kiểm một bản .tgz: giải nén được trọn vẹn (gzip/tar không cụt); trả danh sách mục hoặc ném lỗi
async function listArchive(file) {
  const r = await run('tar', ['-tzf', file], { env: TAR_ENV });
  if (r.code !== 0) throw new Error(`bản sao lưu hỏng (${(r.err || '').trim().split('\n')[0] || `tar mã ${r.code}`})`);
  return r.out.split('\n').map((s) => s.trim().replace(/^\.\//, '')).filter(Boolean);
}

class Backup {
  // o.now: đồng hồ (kiểm thử dùng đồng hồ giả); o.snapshot(dest): tạo bản chụp (mặc định tar);
  // o.keep: { tầng: số bản }; o.pushCmd: lệnh đẩy bản ngày ra ngoài máy (biến BACKUP_FILE = đường dẫn bản)
  constructor(dataDir, o = {}) {
    this.dataDir = dataDir;
    this.dir = o.dir || path.join(dataDir, 'backups');
    this.now = o.now || Date.now;
    this.keep = Object.fromEntries(Object.keys(TIERS).map((k) => [k, (o.keep && o.keep[k]) || TIERS[k].keep]));
    this.snapshot = o.snapshot || ((dest) => this.tarSnapshot(dest));
    this.pushCmd = o.pushCmd != null ? o.pushCmd : process.env.BACKUP_PUSH_CMD || '';
    this.log = o.log || ((s) => console.log(s));
    this.running = null;
  }

  tierDir(tier) { return path.join(this.dir, tier); }

  // bản của một tầng, cũ trước
  list(tier) {
    let names = [];
    try { names = fs.readdirSync(this.tierDir(tier)); } catch (e) { return []; }
    return names.map((name) => ({ name, ...parseName(name) })).filter((x) => x.t != null)
      .map((x) => ({ ...x, tier, file: path.join(this.tierDir(tier), x.name) }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  // tầng đến hạn ở thời điểm t: chưa có bản nào thuộc chu kỳ hiện tại
  due(t = this.now()) {
    return SCHEDULED.filter((tier) => {
      const cur = period(tier, t);
      return !this.list(tier).some((x) => period(tier, x.t) === cur);
    });
  }

  // Một lượt lịch (gọi mỗi phút). Chạy chồng thì trả lại lượt đang chạy. Trả danh sách file đã tạo.
  tick() {
    if (!this.running) this.running = this._tick().finally(() => { this.running = null; });
    return this.running;
  }

  async _tick() {
    const t = this.now();
    this.cleanParts(t);
    const due = this.due(t);
    if (!due.length) return [];
    // một bản chụp dùng chung cho mọi tầng đến hạn (liên kết cứng, không tốn thêm chỗ)
    const first = await this.create(due[0], t);
    const made = [first];
    for (const tier of due.slice(1)) made.push(await this.linkInto(first, tier, t));
    const daily = made.find((f) => path.basename(path.dirname(f)) === 'daily');
    if (daily && this.pushCmd) this.push(daily);
    return made;
  }

  // Bản trước triển khai / trước nâng cấp dữ liệu. once: đã có bản cùng nhãn thì bỏ qua (khởi động lại container)
  async pre(tag, o = {}) {
    if (!TAG_RE.test(String(tag || ''))) throw new Error('Nhãn sao lưu chỉ gồm chữ, số, _ và . (tối đa 40)');
    if (o.once) {
      const had = this.list('pre').find((x) => x.tag === tag);
      if (had) return null;
    }
    return this.create('pre', this.now(), tag);
  }

  async create(tier, t, tag) {
    const dir = this.tierDir(tier);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { fs.chmodSync(this.dir, 0o700); } catch (e) { /* hệ tệp không hỗ trợ */ }
    const final = path.join(dir, fileName(t, tag));
    const part = `${final}.part`;
    try {
      await this.snapshot(part);
      fs.renameSync(part, final);
    } catch (e) {
      try { fs.unlinkSync(part); } catch (e2) { /* chưa có */ }
      this.writeLast({ at: t, tier, file: path.relative(this.dir, final), ok: false, err: e.message });
      throw e;
    }
    const bytes = fs.statSync(final).size;
    this.writeLast({ at: t, tier, file: path.relative(this.dir, final), bytes, ok: true });
    this.rotate(tier);
    return final;
  }

  async linkInto(src, tier, t) {
    const dir = this.tierDir(tier);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const dest = path.join(dir, fileName(t));
    try {
      fs.linkSync(src, dest);
    } catch (e) {
      if (e.code === 'EEXIST') return dest;
      await fs.promises.copyFile(src, dest);
    }
    this.rotate(tier);
    return dest;
  }

  // giữ keep bản mới nhất; bản mới nhất (vừa tạo, đã kiểm) không bao giờ bị xóa
  rotate(tier) {
    const all = this.list(tier);
    const keep = Math.max(1, this.keep[tier]);
    for (const x of all.slice(0, Math.max(0, all.length - keep))) {
      try { fs.unlinkSync(x.file); } catch (e) { /* đã mất */ }
    }
  }

  // file .part bỏ dở (tiến trình bị tắt giữa chừng) quá 10 phút
  cleanParts(t) {
    for (const tier of Object.keys(TIERS)) {
      let names = [];
      try { names = fs.readdirSync(this.tierDir(tier)); } catch (e) { continue; }
      for (const n of names) {
        if (!n.endsWith('.part')) continue;
        const f = path.join(this.tierDir(tier), n);
        try { if (t - fs.statSync(f).mtimeMs > 10 * MIN) fs.unlinkSync(f); } catch (e) { /* bỏ qua */ }
      }
    }
  }

  writeLast(o) {
    try {
      fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(path.join(this.dir, 'last.json'), JSON.stringify(o));
    } catch (e) { /* không quan trọng */ }
  }

  // tar.gz của DATA_DIR rồi đọc lại toàn bộ để chắc bản không cụt
  async tarSnapshot(dest) {
    const entries = fs.readdirSync(this.dataDir).filter((n) => !skipEntry(n)).sort();
    if (!entries.length) throw new Error('DATA_DIR không có dữ liệu để sao lưu');
    const r = await run('tar', ['-czf', dest, '-C', this.dataDir, ...entries], { env: TAR_ENV });
    if (r.code !== 0) throw new Error(`tar lỗi mã ${r.code}: ${(r.err || '').trim().slice(0, 200)}`);
    const got = new Set(await listArchive(dest));
    const miss = entries.filter((n) => !got.has(n) && !got.has(`${n}/`));
    if (miss.length) throw new Error(`bản sao lưu thiếu ${miss.join(', ')}`);
  }

  // Đẩy bản ngày ra ngoài máy (không chặn; lỗi chỉ ghi log). Thành công → backups/offsite.json
  push(file) {
    const ch = spawn('sh', ['-c', this.pushCmd], { env: { ...process.env, BACKUP_FILE: file }, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ch.stderr.on('data', (d) => { err += d; });
    ch.on('error', (e) => { err += e.message; });
    ch.on('close', (code) => {
      if (code === 0) {
        try { fs.writeFileSync(path.join(this.dir, 'offsite.json'), JSON.stringify({ at: Date.now(), file: path.relative(this.dir, file), ok: true })); } catch (e) { /* bỏ qua */ }
        this.log(`[backup] đã đẩy ra ngoài máy: ${path.relative(this.dir, file)}`);
      } else {
        console.error(`[ALERT] đẩy bản sao lưu ra ngoài máy thất bại (mã ${code}): ${err.trim().slice(0, 200)}`);
      }
    });
  }
}

module.exports = { Backup, TIERS, SCHEDULED, period, fileName, parseName, listArchive, run, skipEntry, TAR_ENV };
