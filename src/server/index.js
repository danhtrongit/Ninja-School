'use strict';

// Khởi động máy chủ: cấu hình, dữ liệu, thế giới, HTTP tĩnh + WebSocket, lưu định kỳ, tắt an toàn
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DB } = require('./services/db');
const { createHttpServer } = require('./services/http');
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
const db = new DB(config.dataDir);
const world = new World(db, config);
const metrics = new Metrics();
metrics.watch(world, db);
const server = createHttpServer(path.join(__dirname, '..', 'client'), () => ({ ok: true, version: VERSION, commit: COMMIT, online: world.players.size, accounts: Object.keys(db.accounts).length }), {
  extra: (req, res, url) => metrics.handle(req, res, url, process.env.METRICS_TOKEN || ''),
  devTools: config.devTools,
});
attachGateway(server, { db, world, config, gameData: buildGameData(VERSION) });

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
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
setInterval(() => { if (db.dirty) db.save(); }, 15000);
setInterval(() => db.backup(), 6 * 3600 * 1000);
setTimeout(() => db.backup(), 60 * 1000);

module.exports = { server, world, db, metrics };
