'use strict';

// Cổng WebSocket: kết nối, giới hạn tốc độ gói, sảnh (đăng ký, đăng nhập, tạo/xóa/chọn nhân vật) rồi chuyển gói cho thế giới
const { WebSocketServer } = require('ws');
const { CLASSES } = require('../../shared/data/classes');
const { newChar, lookOf: playerLook } = require('./player');

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
const LOOPBACK_RE = /^(127\.|::1$|localhost$)/;
// IP mạng nội bộ/loopback: kết nối từ proxy chạy cùng máy hoặc cùng mạng docker
const PRIVATE_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:)/i;

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

// server: máy chủ HTTP; gameData: chuỗi JSON gói 'data' gửi ngay khi kết nối
function attachGateway(server, { db, world, config, gameData }) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
  const onlineAccounts = new Map();
  const authFails = new Map();

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
        // rời gia tộc...
        world.emit('charDeleted', db.getChar(name));
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
    conn.sendRaw(gameData);
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

  return wss;
}

module.exports = { attachGateway, Conn };
