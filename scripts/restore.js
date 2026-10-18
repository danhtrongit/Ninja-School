'use strict';

// Phục hồi từ bản sao lưu (services/backup.js). <bản> là đường dẫn file hoặc đường dẫn trong DATA_DIR/backups (vd daily/20261018-030500.tgz).
//   node scripts/restore.js --list                     liệt kê bản theo tầng, kích thước
//   node scripts/restore.js --check <bản>              giải nén ra thư mục tạm, nạp bằng DB, chạy sanitize mọi nhân vật
//   node scripts/restore.js --apply <bản>              thay dữ liệu hiện tại (máy chủ phải tắt); dữ liệu cũ dời vào DATA_DIR/before-restore-<giờ>/
//   node scripts/restore.js --char <tên> --from <bản>  lấy một nhân vật ra DATA_DIR/restore/<tên>-<giờ>.json để GM xem
//   thêm --data <thư mục> (mặc định DATA_DIR hoặc ./data)
// Mã thoát: 0 đạt, 1 bản hỏng/lỗi, 2 sai tham số, 3 máy chủ đang chạy.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Backup, TIERS, listArchive, run, skipEntry, TAR_ENV } = require('../src/server/services/backup');
const { DB, LOCK, readLock, stamp } = require('../src/server/services/db');

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const flag = (k) => argv.includes(k);
const dataDir = path.resolve(opt('--data') || process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const backupDir = path.join(dataDir, 'backups');

function resolveBackup(arg) {
  if (!arg) return null;
  for (const f of [path.resolve(arg), path.join(backupDir, arg)]) if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  return null;
}

async function extract(file) {
  await listArchive(file);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-restore-'));
  const r = await run('tar', ['-xzf', file, '-C', tmp], { env: TAR_ENV });
  if (r.code !== 0) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw new Error(`không giải nén được (${(r.err || '').trim().split('\n')[0]})`);
  }
  return tmp;
}

// Nạp bản giải nén như máy chủ: lỗi → ném; trả số liệu
// chỉ đọc: không tách bố cục, nhật ký nhóm ghi chỉ phát lại trong RAM
function inspect(dir) {
  const db = new DB(dir, { forceEmpty: false, readonly: true });
  const { Player } = require('../src/server/core/player');
  const world = { nextPid: 1, db: { dirty: false }, announce() {}, clanView() { return null; }, players: new Map(), mods: {}, byName: new Map() };
  const bad = [];
  for (const [k, c] of Object.entries(db.chars)) {
    try {
      if (!c || typeof c !== 'object' || typeof c.name !== 'string') throw new Error('không phải nhân vật');
      // chạy trên bản sao: sanitize sửa dữ liệu tại chỗ
      new Player(world, { send() {} }, JSON.parse(JSON.stringify(c)));
    } catch (e) {
      bad.push(`${k}: ${e.message}`);
    }
  }
  const lost = [];
  for (const acc of Object.values(db.accounts)) for (const n of (acc && acc.chars) || []) if (!db.getChar(n)) lost.push(n);
  return { accounts: Object.keys(db.accounts).length, chars: Object.keys(db.chars).length, clans: Object.keys(db.clans).length, bad, lost };
}

async function check(file) {
  const tmp = await extract(file);
  try {
    return inspect(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function list() {
  const bk = new Backup(dataDir);
  let n = 0;
  for (const tier of Object.keys(TIERS)) {
    const items = bk.list(tier);
    if (!items.length) continue;
    console.log(`${tier} (${items.length}):`);
    for (const x of items.slice().reverse()) {
      n++;
      const size = fs.statSync(x.file).size;
      console.log(`  ${tier}/${x.name}  ${(size / 1024).toFixed(1)} KB  ${new Date(x.t).toISOString()}`);
    }
  }
  try { console.log(`Lần sao lưu gần nhất: ${fs.readFileSync(path.join(backupDir, 'last.json'), 'utf8')}`); } catch (e) { /* chưa có */ }
  if (!n) console.log(`Chưa có bản sao lưu nào trong ${backupDir}`);
  return 0;
}

function liveServer() {
  const cur = readLock(dataDir);
  return cur && cur.alive ? cur : null;
}

async function apply(file) {
  const live = liveServer();
  if (live) {
    console.error(`Từ chối: máy chủ đang chạy với DATA_DIR này (pid ${live.pid}). Tắt máy chủ trước khi phục hồi.`);
    return 3;
  }
  const info = await check(file);
  if (info.bad.length) {
    console.error(`Bản sao lưu có ${info.bad.length} nhân vật lỗi, không phục hồi:\n  ${info.bad.slice(0, 10).join('\n  ')}`);
    return 1;
  }
  // giữ khóa trong lúc thay file để máy chủ không khởi động giữa chừng
  const lockFile = path.join(dataDir, LOCK);
  try { fs.unlinkSync(lockFile); } catch (e) { /* khóa cũ đã chết hoặc không có */ }
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, host: os.hostname(), at: Date.now(), restore: true }), { flag: 'wx' });
  try {
    const keep = path.join(dataDir, `before-restore-${stamp()}`);
    fs.mkdirSync(keep, { recursive: true });
    for (const n of fs.readdirSync(dataDir)) {
      if (n === 'backups' || n === 'restore' || n === LOCK || n.startsWith('before-restore-')) continue;
      fs.renameSync(path.join(dataDir, n), path.join(keep, n));
    }
    const r = await run('tar', ['-xzf', file, '-C', dataDir], { env: TAR_ENV });
    if (r.code !== 0) throw new Error(`giải nén lỗi: ${(r.err || '').trim()}`);
    console.log(`Đã phục hồi ${path.relative(backupDir, file)}: ${info.accounts} tài khoản, ${info.chars} nhân vật. Dữ liệu cũ ở ${path.basename(keep)}/`);
    return 0;
  } finally {
    try { fs.unlinkSync(lockFile); } catch (e) { /* đã mất */ }
  }
}

async function oneChar(name, file) {
  const tmp = await extract(file);
  try {
    const db = new DB(tmp, { forceEmpty: false, readonly: true });
    const c = db.getChar(name);
    if (!c) {
      console.error(`Bản sao lưu không có nhân vật ${name}`);
      return 1;
    }
    const out = path.join(dataDir, 'restore');
    fs.mkdirSync(out, { recursive: true, mode: 0o700 });
    const f = path.join(out, `${c.name}-${stamp()}.json`);
    fs.writeFileSync(f, JSON.stringify(c, null, 1));
    console.log(`Đã lấy ${c.name} (cấp ${c.level}) ra ${path.relative(dataDir, f)}`);
    return 0;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function main() {
  if (flag('--list')) return list();
  const charName = opt('--char');
  if (charName) {
    const file = resolveBackup(opt('--from'));
    if (!file) { console.error('Thiếu hoặc không tìm thấy --from <bản>'); return 2; }
    return oneChar(charName, file);
  }
  const mode = flag('--check') ? '--check' : flag('--apply') ? '--apply' : null;
  if (!mode) {
    console.error('Dùng: node scripts/restore.js --list | --check <bản> | --apply <bản> | --char <tên> --from <bản> [--data <thư mục>]');
    return 2;
  }
  const file = resolveBackup(opt(mode));
  if (!file) { console.error(`Không tìm thấy bản sao lưu: ${opt(mode) || '(trống)'}`); return 2; }
  if (mode === '--apply') return apply(file);
  try {
    const info = await check(file);
    console.log(`${path.basename(file)}: ${info.accounts} tài khoản, ${info.chars} nhân vật, ${info.clans} gia tộc`);
    if (info.lost.length) console.log(`  cảnh báo: ${info.lost.length} nhân vật có trong tài khoản nhưng không có dữ liệu (${info.lost.slice(0, 5).join(', ')})`);
    if (info.bad.length) {
      console.error(`HỎNG: ${info.bad.length} nhân vật không nạp được:\n  ${info.bad.slice(0, 10).join('\n  ')}`);
      return 1;
    }
    console.log('HỢP LỆ');
    return 0;
  } catch (e) {
    console.error(`HỎNG: ${e.message}`);
    return 1;
  }
}

main().then((code) => process.exit(code), (e) => {
  console.error(`Lỗi: ${e.message}`);
  process.exit(1);
});
