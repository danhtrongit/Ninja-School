'use strict';

// Khởi động máy chủ: cấu hình, dữ liệu, thế giới, HTTP tĩnh + WebSocket, lưu định kỳ, tắt an toàn
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { monitorEventLoopDelay } = require('perf_hooks');
const { DB } = require('./services/db');
const { Backup } = require('./services/backup');
const { createHttpServer, artIndex } = require('./services/http');
const { World } = require('./core/world');
const { buildGameData } = require('./core/gamedata');
const { attachGateway } = require('./core/gateway');
const { Metrics } = require('./services/metrics');

const config = {
  port: +process.env.PORT || 3000,
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
  admins: (process.env.ADMINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  motd: process.env.MOTD || '',
  // TATHU=0 tắt lịch tự động của sự kiện Tà Thú (lệnh admin /event vẫn dùng được)
  tathu: process.env.TATHU !== '0',
  // SEASON=0 tắt lịch lễ hội theo mùa (lệnh admin /sukien vẫn ép bật được)
  season: process.env.SEASON !== '0',
  // số proxy tin cậy đứng trước server (Caddy, Render...): 'auto' = 1 nếu kết nối tới từ mạng nội bộ/loopback, 0 = bỏ X-Forwarded-For
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? +process.env.TRUST_PROXY : 'auto',
  // số tài khoản tạo mới tối đa mỗi IP mỗi giờ (0 = không giới hạn; kết nối loopback khi chạy thử không bị tính)
  regPerHour: /^\d+$/.test(process.env.REG_LIMIT || '') ? +process.env.REG_LIMIT : 10,
  maxChars: 3,
  // DEV_TOOLS=1 mở /dev/gallery (vẫn cần đăng nhập admin); production không đặt
  devTools: process.env.DEV_TOOLS === '1',
};

// Mã commit đang chạy: GIT_SHA (image CI) → REVISION (git archive điền sẵn) → git rev-parse (chạy từ repo)
function revision() {
  if (/^[0-9a-f]{7,40}$/.test(process.env.GIT_SHA || '')) return process.env.GIT_SHA;
  try {
    const r = fs.readFileSync(path.join(__dirname, 'REVISION'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(r)) return r;
  } catch (e) { /* không có file */ }
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) { return ''; }
}
const COMMIT = revision();
const VERSION = require('../../package.json').version + (COMMIT ? `+${COMMIT.slice(0, 7)}` : '');

// Dữ liệu: khóa DATA_DIR (mã 3 nếu tiến trình khác đang dùng), nạp an toàn (mã 2 nếu file hỏng, không chạy rỗng)
let db;
try {
  db = new DB(config.dataDir, { lock: true });
} catch (e) {
  if (e.code === 'EDBLOCK') {
    console.error(`[db] ${e.message}. Tắt tiến trình kia hoặc dùng DATA_DIR khác.`);
    process.exit(3);
  }
  if (e.code === 'EDBLOAD') {
    console.error(`[db] ${e.message}`);
    console.error('[db] File hỏng đã được giữ nguyên dưới tên *.corrupt-<giờ>. Cách xử lý:');
    console.error('  - xem bản sao lưu: node scripts/restore.js --list, kiểm rồi phục hồi: --check <bản>, --apply <bản>');
    console.error('  - hoặc chấp nhận chạy rỗng phần hỏng: FORCE_EMPTY=1 (mất dữ liệu của file đó)');
    process.exit(2);
  }
  throw e;
}

let world = null;
const isAdmin = (p) => !!(p.conn && p.conn.account) && config.admins.includes(String(p.conn.account).toLowerCase());
function tellAdmins(msg) {
  if (!world) return;
  for (const p of world.players.values()) if (isAdmin(p)) p.notice(msg, 'warn');
}
db.onSaveError = (e, n) => tellAdmins(`Lưu dữ liệu thất bại ${n} lần liên tiếp: ${e.message}`);
db.onSaveOk = (n) => tellAdmins(`Lưu dữ liệu đã bình thường lại (sau ${n} lần lỗi).`);

// Lỗi chưa bắt: lưu khẩn cấp đồng bộ rồi thoát mã 1 (Docker/pm2 khởi động lại)
let dying = false;
function fatal(kind, err) {
  if (dying) return;
  dying = true;
  try {
    process.stderr.write(`${JSON.stringify({ lvl: 'fatal', kind, err: String((err && err.message) || err), stack: err && err.stack, at: new Date().toISOString() })}\n`);
  } catch (e) { /* stderr đóng */ }
  if (world) {
    for (const p of world.players.values()) {
      try {
        world.persistPos(p);
        db.putChar(p.c, true);
      } catch (e) { /* vẫn lưu phần còn lại */ }
    }
  }
  let saved = false;
  try { saved = db.flushAllSync(); } catch (e) { /* đã ghi ALERT */ }
  console.error(`[fatal] lưu khẩn cấp ${saved ? 'xong' : 'THẤT BẠI'}, thoát mã 1`);
  db.unlock();
  process.exit(1);
}
process.on('uncaughtException', (e) => fatal('uncaughtException', e));
process.on('unhandledRejection', (e) => fatal('unhandledRejection', e));
process.on('exit', () => db.unlock());

world = new World(db, config);
const metrics = new Metrics();
metrics.watch(world, db);

// NS_DEBUG_LAG=1: mỗi giây in độ trễ tick lớn nhất (so với nhịp 50 ms) và trễ vòng lặp lớn nhất
if (process.env.NS_DEBUG_LAG === '1') {
  const loop = monitorEventLoopDelay({ resolution: 1 });
  loop.enable();
  let last = 0;
  let worst = 0;
  const tick = world.tick;
  world.tick = function lagTick(...a) {
    const t = performance.now();
    if (last) worst = Math.max(worst, t - last - 50);
    last = t;
    return tick.apply(this, a);
  };
  setInterval(() => {
    console.log(`[lag] tick trễ tối đa ${Math.max(0, worst).toFixed(1)} ms, vòng lặp tối đa ${(loop.max / 1e6).toFixed(1)} ms`);
    worst = 0;
    loop.reset();
  }, 1000);
}

const status = () => ({
  ok: db.saveErrors === 0,
  version: VERSION,
  commit: COMMIT,
  online: world.players.size,
  accounts: Object.keys(db.accounts).length,
  saveErrors: db.saveErrors,
  lastSaveAt: db.lastSaveAt,
});
const server = createHttpServer(path.join(__dirname, '..', 'client'), status, {
  extra: (req, res, url) => metrics.handle(req, res, url, process.env.METRICS_TOKEN || ''),
  devTools: config.devTools,
});
attachGateway(server, { db, world, config, gameData: buildGameData(VERSION, { art: artIndex(path.join(__dirname, '..', 'client')) }) });

server.listen(config.port, () => {
  console.log(`Ninja School server đang chạy tại http://localhost:${config.port}`);
  console.log(`Dữ liệu lưu tại: ${config.dataDir}${config.admins.length ? ` | Admin: ${config.admins.join(', ')}` : ''}`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Đang lưu dữ liệu và tắt server...');
  for (const p of [...world.players.values()]) world.leave(p, 'Máy chủ đang bảo trì.');
  world.stop();
  // lần lưu cuối lỗi: mã ≠ 0 để trình quản lý tiến trình biết
  process.exit(db.saveErrors ? 1 : 0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// ghi dữ liệu do world.tick → db.flushTick() lo; ở đây chỉ làm mới khóa thư mục
setInterval(() => db.touchLock(), 15000);
// kiểm thử: SIGUSR2 = lưu ngay (chỉ khi NS_TEST=1). Chờ các lần ghi nền và nhóm ghi đang chạy xong trước,
// để giả lỗi NS_TEST_SAVE_FAIL đếm đúng từng lần lưu tay
if (process.env.NS_TEST === '1') {
  process.on('SIGUSR2', () => {
    Promise.all([...db.inflight.values(), db.commitQ]).then(() => {
      db.armFail();
      world.saveAll();
      db.save();
    });
  });
}

// Sao lưu theo tầng (services/backup.js): kiểm lịch mỗi phút, lần đầu sau BACKUP_DELAY_MS (mặc định 60 giây).
// PRE_DEPLOY=<nhãn>: thêm một bản "trước triển khai" lúc khởi động nếu chưa có bản cùng nhãn. BACKUP=0 tắt lịch.
const backup = new Backup(config.dataDir);
const backupRun = (p) => p.then((files) => {
  for (const f of [].concat(files || [])) console.log(`[backup] đã tạo ${path.relative(backup.dir, f)}`);
}).catch((e) => console.error(`[ALERT] sao lưu thất bại: ${e.message}`));
if (process.env.PRE_DEPLOY) backupRun(backup.pre(process.env.PRE_DEPLOY, { once: true }));
if (process.env.BACKUP !== '0') {
  const delay = /^\d+$/.test(process.env.BACKUP_DELAY_MS || '') ? +process.env.BACKUP_DELAY_MS : 60 * 1000;
  setTimeout(() => {
    backupRun(backup.tick());
    setInterval(() => backupRun(backup.tick()), 60 * 1000);
  }, delay);
}

module.exports = { server, world, db, metrics, backup };
