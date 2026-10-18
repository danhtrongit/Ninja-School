'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');

const { DB } = require('./db');
const { World } = require('./game/world');
const { newChar, lookOf: playerLook } = require('./game/player');
const { CLASSES, ELEMENTS, STAT_NAMES } = require('./data/classes');
const { SKILLS, SKILL_MAX_LV, PASSIVE_STATS } = require('./data/skills');
const { ITEMS, SLOTS, GEAR_SLOTS, FASHION_SLOTS, SLOT_NAMES, RARITY, TIER_COLORS, STAT_LABELS, UPGRADE, TIERS, GEM, GEM_TYPES } = require('./data/items');
const { MONSTERS } = require('./data/monsters');
const { clientMaps, NPC_TYPES, GROUND } = require('./data/maps');
const { MAIN_QUESTS } = require('./data/quests');
const { CHECKIN, WHEEL, MAIL } = require('./data/extras');
const { seasonClient } = require('./game/season');
const { petClientInfo } = require('./data/pets');
const { arenaClient } = require('./game/arena');
const { expNeed, MAX_LEVEL, HOTBAR, HOTBAR_SETS } = require('./game/player');

const config = {
  port: +process.env.PORT || 3000,
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
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

const db = new DB(config.dataDir);
const world = new World(db, config);
const VERSION = '1.0.0';

// Dữ liệu tĩnh gửi cho client sau khi kết nối
const UPGRADE_INFO = {
  max: UPGRADE.max, rate: UPGRADE.rate,
  stone: Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.stone(i)),
  stoneQty: Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.stoneQty(i)),
  cost: Array.from({ length: TIERS }, (_, t) => Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.cost(i, t))),
  bonus: UPGRADE.bonus,
};
// Ngọc khảm: bảng tra sẵn (máy khách không cần công thức)
const GEM_INFO = {
  max: GEM.max, types: GEM_TYPES, rate: GEM.rate, lifestealCap: GEM.lifestealCap,
  mergeCost: Array.from({ length: GEM.max + 1 }, (_, lv) => (lv ? GEM.mergeCost(lv) : 0)),
  takeCost: Array.from({ length: GEM.max + 1 }, (_, lv) => (lv ? GEM.takeCost(lv) : 0)),
  holes: Array.from({ length: TIERS }, (_, t) => GEM.holes(t)),
};
const GAME_DATA = JSON.stringify({
  t: 'data', version: VERSION,
  classes: CLASSES, elements: ELEMENTS, statNames: STAT_NAMES, skills: SKILLS, skillMax: SKILL_MAX_LV, passiveStats: PASSIVE_STATS,
  items: ITEMS, slots: SLOTS, gearSlots: GEAR_SLOTS, fashionSlots: FASHION_SLOTS, slotNames: SLOT_NAMES, rarity: RARITY, tierColors: TIER_COLORS, statLabels: STAT_LABELS,
  upgrade: UPGRADE_INFO, gems: GEM_INFO, pet: petClientInfo(),
  monsters: Object.fromEntries(Object.entries(MONSTERS).map(([k, m]) => [k, { name: m.name, lv: m.lv, type: m.type, pal: m.pal, el: m.el, boss: !!m.boss, event: !!m.event, scale: m.scale, w: m.w, h: m.h, fly: m.fly, ranged: m.ranged, aggro: m.aggro, drops: m.drops || [] }])),
  maps: clientMaps(), npcTypes: NPC_TYPES, ground: GROUND,
  quests: MAIN_QUESTS.map((q) => ({ name: q.name, req: q.req })),
  mail: { max: MAIL.max, keep: MAIL.keepDays }, seasons: seasonClient(), arena: arenaClient(),
  checkin: CHECKIN, wheel: { cost: WHEEL.cost, prizes: WHEEL.prizes.map((x) => ({ label: x.label, c: x.c })) },
  expTable: Array.from({ length: MAX_LEVEL + 1 }, (_, i) => (i ? expNeed(i) : 0)),
  maxLevel: MAX_LEVEL, hotbar: HOTBAR, hotbarSets: HOTBAR_SETS,
});

// ---------- HTTP tĩnh
const PUBLIC = path.join(__dirname, '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

// Nén gzip file tĩnh dạng văn bản, giữ bộ đệm theo thời điểm sửa file
const GZIP_EXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest']);
const staticCache = new Map();
function readStatic(file, st, gzip, cb) {
  const key = `${file}|${gzip ? 1 : 0}`;
  const hit = staticCache.get(key);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return cb(null, hit.buf);
  fs.readFile(file, (e, raw) => {
    if (e) return cb(e);
    const buf = gzip ? zlib.gzipSync(raw, { level: 6 }) : raw;
    staticCache.set(key, { mtime: st.mtimeMs, size: st.size, buf });
    cb(null, buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, version: VERSION, online: world.players.size, accounts: Object.keys(db.accounts).length }));
  }
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      file = path.join(file, 'index.html');
      try {
        st = fs.statSync(file);
      } catch (e) {
        st = null;
      }
    }
    if (err && !st) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Không tìm thấy');
    }
    const ext = path.extname(file);
    const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && GZIP_EXT.has(ext);
    const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}${gzip ? '-gz' : ''}"`;
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag, Vary: 'Accept-Encoding' };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    readStatic(file, st, gzip, (e, buf) => {
      if (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Không tìm thấy');
      }
      if (gzip) headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      res.end(buf);
    });
  });
});

// ---------- WebSocket
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

class Conn {
  constructor(ws, ip) {
    this.ws = ws;
    this.ip = ip;
    this.account = null;
    this.player = null;
    this.msgCount = 0;
    this.msgWindow = Date.now();
  }

  sendRaw(s) {
    if (this.ws.readyState === 1) this.ws.send(s);
  }

  send(t, d) {
    this.sendRaw(JSON.stringify({ t, ...d }));
  }

  close(reason) {
    if (reason) this.send('kicked', { msg: reason });
    setTimeout(() => this.ws.close(), 50);
  }
}

const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const USER_RE = /^[A-Za-z0-9_]{4,16}$/;
const onlineAccounts = new Map();
const authFails = new Map();

function charSummary(c) {
  return { name: c.name, cls: c.cls, gender: c.gender, level: c.level, map: c.map, look: lookOf(c) };
}

// Ngoại hình ở màn chọn nhân vật: trang bị + thời trang, bỏ thú cưng/thú cưỡi (khung xem trước nhỏ)
function lookOf(c) {
  const look = playerLook(c);
  delete look.pet;
  delete look.mount;
  return look;
}

function sendChars(conn) {
  const acc = db.accounts[conn.account.toLowerCase()];
  const chars = acc.chars.map((n) => db.getChar(n)).filter(Boolean).map(charSummary);
  conn.send('chars', { chars, max: config.maxChars });
}

function loginOk(conn, acc, token) {
  const key = acc.username.toLowerCase();
  const prev = onlineAccounts.get(key);
  if (prev && prev !== conn) {
    if (prev.player) world.leave(prev.player);
    prev.close('Tài khoản đã đăng nhập ở nơi khác.');
  }
  onlineAccounts.set(key, conn);
  conn.account = acc.username;
  conn.send('auth', { ok: true, user: acc.username, token: token || db.issueToken(acc) });
  sendChars(conn);
}

function tooManyFails(ip) {
  const f = authFails.get(ip);
  return f && f.n >= 8 && Date.now() - f.t < 60000;
}

function addFail(ip) {
  const f = authFails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 60000) {
    f.n = 0;
    f.t = Date.now();
  }
  f.n++;
  authFails.set(ip, f);
}

// Giới hạn tạo tài khoản mỗi IP: không có nó thì giới hạn nhập mã theo tài khoản bị lách bằng tài khoản mới
const regLog = new Map();
const LOOPBACK_RE = /^(127\.|::1$|localhost$)/;
function regAllowed(ip) {
  if (!config.regPerHour || LOOPBACK_RE.test(ip)) return true;
  const now = Date.now();
  if (regLog.size > 5000) for (const [k, l] of regLog) if (!l.some((t) => now - t < 3600000)) regLog.delete(k);
  const list = (regLog.get(ip) || []).filter((t) => now - t < 3600000);
  regLog.set(ip, list);
  return list.length < config.regPerHour;
}
function regAdd(ip) {
  const list = regLog.get(ip) || [];
  list.push(Date.now());
  regLog.set(ip, list);
}

// IP mạng nội bộ/loopback: kết nối từ proxy chạy cùng máy hoặc cùng mạng docker
const PRIVATE_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:)/i;
// IP người chơi. Chỉ tin X-Forwarded-For khi đứng sau proxy, và đếm từ cuối danh sách:
// phần đầu do máy khách tự ghi được (giả IP để lách giới hạn hoặc khóa nhập mã của người khác)
function clientIp(req) {
  const sock = String(req.socket.remoteAddress || '').replace(/^::ffff:/i, '');
  const hops = config.trustProxy === 'auto' ? (PRIVATE_RE.test(sock) ? 1 : 0) : config.trustProxy;
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!hops || !xff.length) return sock;
  return xff[Math.max(0, xff.length - hops)].replace(/^::ffff:/i, '').slice(0, 64);
}

function handleLobby(conn, m) {
  const err = (msg) => conn.send('err', { msg });
  switch (m.t) {
    case 'register': {
      const u = String(m.u || '');
      const pw = String(m.p || '');
      if (!USER_RE.test(u)) return err('Tên tài khoản 4-16 ký tự (chữ, số, _).');
      if (pw.length < 6 || pw.length > 64) return err('Mật khẩu 6-64 ký tự.');
      if (!regAllowed(conn.ip)) return err('Đã tạo quá nhiều tài khoản từ mạng này. Hãy thử lại sau.');
      const acc = db.createAccount(u, pw);
      if (!acc) return err('Tài khoản đã tồn tại.');
      regAdd(conn.ip);
      return loginOk(conn, acc);
    }
    case 'login': {
      if (tooManyFails(conn.ip)) return err('Đăng nhập sai quá nhiều lần, thử lại sau 1 phút.');
      const u = String(m.u || '');
      let acc = null;
      if (m.token) acc = db.checkToken(u, m.token);
      else acc = db.checkPassword(u, String(m.p || ''));
      if (!acc) {
        addFail(conn.ip);
        return err(m.token ? 'Phiên đăng nhập hết hạn.' : 'Sai tài khoản hoặc mật khẩu.');
      }
      return loginOk(conn, acc, m.token);
    }
    default:
  }
  if (!conn.account) return err('Chưa đăng nhập.');
  const acc = db.accounts[conn.account.toLowerCase()];
  switch (m.t) {
    case 'createChar': {
      const name = String(m.name || '');
      if (!NAME_RE.test(name)) return err('Tên nhân vật 3-12 ký tự (chữ, số, _), không dấu.');
      if (!CLASSES[m.cls]) return err('Phái không hợp lệ.');
      if (acc.chars.length >= config.maxChars) return err(`Tối đa ${config.maxChars} nhân vật.`);
      if (db.getChar(name)) return err('Tên nhân vật đã tồn tại.');
      const c = newChar(name, m.cls, m.gender);
      db.putChar(c);
      acc.chars.push(name);
      db.dirty = true;
      return sendChars(conn);
    }
    case 'deleteChar': {
      const name = String(m.name || '');
      const i = acc.chars.findIndex((n) => n.toLowerCase() === name.toLowerCase());
      if (i < 0) return;
      if (String(m.confirm || '') !== acc.chars[i]) return err('Nhập đúng tên nhân vật để xác nhận xóa.');
      const online = world.byName.get(name.toLowerCase());
      if (online) world.leave(online);
      const c = db.getChar(name);
      if (c && c.clan && db.clans[c.clan]) world.social.leaveClan(c.name, c.clan);
      db.deleteChar(name);
      acc.chars.splice(i, 1);
      return sendChars(conn);
    }
    case 'selectChar': {
      const name = String(m.name || '');
      if (!acc.chars.some((n) => n.toLowerCase() === name.toLowerCase())) return err('Không tìm thấy nhân vật.');
      const c = db.getChar(name);
      if (!c) return err('Không tìm thấy nhân vật.');
      if (conn.player) world.leave(conn.player);
      conn.player = world.join(conn, c);
      return;
    }
    case 'logoutChar': {
      if (conn.player) world.leave(conn.player);
      return sendChars(conn);
    }
    default:
  }
}

wss.on('connection', (ws, req) => {
  const conn = new Conn(ws, clientIp(req));
  conn.sendRaw(GAME_DATA);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - conn.msgWindow > 1000) {
      conn.msgWindow = now;
      conn.msgCount = 0;
    }
    if (++conn.msgCount > 80) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!m || typeof m.t !== 'string') return;
    try {
      // 'Đổi nhân vật' gửi logoutChar khi đang trong game: phải về sảnh, thế giới không xử lý gói này
      if (conn.player && world.players.has(conn.player.id) && m.t !== 'logoutChar') world.handle(conn.player, m);
      else handleLobby(conn, m);
    } catch (e) {
      console.error('[ws] Lỗi xử lý', m.t, e);
    }
  });
  ws.on('close', () => {
    if (conn.player) world.leave(conn.player);
    if (conn.account && onlineAccounts.get(conn.account.toLowerCase()) === conn) onlineAccounts.delete(conn.account.toLowerCase());
  });
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

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
