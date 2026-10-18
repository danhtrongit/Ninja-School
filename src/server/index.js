'use strict';

// Khởi động máy chủ: cấu hình, dữ liệu, thế giới, HTTP tĩnh + WebSocket, lưu định kỳ, tắt an toàn
const path = require('path');
const { DB } = require('./services/db');
const { createHttpServer } = require('./services/http');
const { World } = require('./core/world');
const { buildGameData } = require('./core/gamedata');
const { attachGateway } = require('./core/gateway');

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
};

const VERSION = '1.0.0';
const db = new DB(config.dataDir);
const world = new World(db, config);
const server = createHttpServer(path.join(__dirname, '..', 'client'), () => ({ ok: true, version: VERSION, online: world.players.size, accounts: Object.keys(db.accounts).length }));
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

module.exports = { server, world, db };
