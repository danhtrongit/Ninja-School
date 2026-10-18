'use strict';

// Bot nhẹ cho đo hiệu năng và đo tải: không lưu lịch sử tin nhắn, chỉ giữ vị trí, quái gần và số byte nhận.
// Dùng ngoài bộ chạy npm test (không phụ thuộc cổng của harness).
const WebSocket = require('ws');

const CLS = ['kiem', 'tieu', 'kunai', 'cung', 'dao', 'quat'];
const BASIC = { kiem: 'k0', tieu: 't0', kunai: 'n0', cung: 'c0', dao: 'd0', quat: 'q0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class LightBot {
  constructor(url, user, i = 0) {
    this.url = url;
    this.user = user;
    this.cls = CLS[i % CLS.length];
    this.bytes = 0;
    this.msgs = 0;
    this.mobs = new Map();
    this.x = 0;
    this.y = 0;
    this.map = null;
    this.errors = 0;
    this.closed = false;
    this.handlers = new Map();
  }

  // Chờ một gói loại t (pred tùy chọn), hết hạn thì trả null
  next(t, pred, ms = 8000) {
    return new Promise((resolve) => {
      const list = this.handlers.get(t) || [];
      const h = { pred, resolve };
      list.push(h);
      this.handlers.set(t, list);
      setTimeout(() => { const i = list.indexOf(h); if (i >= 0) { list.splice(i, 1); resolve(null); } }, ms);
    });
  }

  onMsg(m) {
    switch (m.t) {
      case 'enterMap':
        this.map = m.map && (m.map.id || m.map);
        this.x = m.x; this.y = m.y;
        this.mobs = new Map((m.monsters || []).map((x) => [x.id, x]));
        break;
      case 'state':
        if (m.m) for (const [id, x, y, , , hp] of m.m) { const o = this.mobs.get(id); if (o) { o.x = x; o.y = y; o.hp = hp; } }
        break;
      case 'mSpawn': this.mobs.set(m.id, m); break;
      case 'mDie': this.mobs.delete(m.id); break;
      case 'pos': this.x = m.x; this.y = m.y; break;
      case 'err': this.lastErr = m.msg; break;
      default:
    }
    const list = this.handlers.get(m.t);
    if (list) for (const h of list.slice()) if (!h.pred || h.pred(m)) { list.splice(list.indexOf(h), 1); h.resolve(m); }
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      const to = setTimeout(() => reject(new Error(`${this.user}: kết nối quá lâu`)), 20000);
      this.ws.on('message', (raw) => {
        this.bytes += raw.length;
        this.msgs++;
        let m;
        try { m = JSON.parse(raw); } catch (e) { return; }
        if (m.t === 'data') { clearTimeout(to); resolve(); }
        this.onMsg(m);
      });
      this.ws.on('error', (e) => { this.errors++; clearTimeout(to); reject(e); });
      this.ws.on('close', () => { this.closed = true; });
    });
  }

  send(t, d = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t, ...d }));
  }

  // Đăng ký (hoặc đăng nhập nếu đã có), tạo nhân vật nếu chưa có, vào game
  async login(pass = 'matkhau1') {
    await this.connect();
    let chars = this.next('chars');
    this.send('register', { u: this.user, p: pass });
    let c = await Promise.race([chars, this.next('err').then(() => null)]);
    if (!c) {
      chars = this.next('chars');
      this.send('login', { u: this.user, p: pass });
      c = await chars;
    }
    if (!c) throw new Error(`${this.user}: không đăng nhập được (${this.lastErr || 'hết giờ'})`);
    const name = this.user.slice(0, 10) + 'x';
    if (!c.chars.length) {
      const again = this.next('chars');
      this.send('createChar', { name, cls: this.cls, gender: this.cls.length % 2 ? 'f' : 'm' });
      c = await again;
    }
    const enter = this.next('enterMap');
    this.send('selectChar', { name: c.chars[0].name || c.chars[0] });
    if (!(await enter)) throw new Error(`${this.user}: không vào được game`);
  }

  cmd(text) { this.send('chat', { msg: text, ch: 'map' }); }

  async tp(mapId) {
    const enter = this.next('enterMap', (m) => (m.map && (m.map.id || m.map)) === mapId);
    this.cmd(`/tp ${mapId}`);
    return !!(await enter);
  }

  // Một nhịp chơi: đi về phía quái gần nhất và ra chiêu cơ bản
  step() {
    let best = null;
    let bd = 1e9;
    for (const o of this.mobs.values()) { const d = Math.abs(o.x - this.x); if (d < bd && !(o.hp <= 0)) { bd = d; best = o; } }
    if (best && bd > 60) {
      const dx = Math.sign(best.x - this.x) * Math.min(40, bd - 50);
      this.x += dx;
      this.send('move', { x: this.x, y: this.y, dir: Math.sign(dx) || 1, st: 1 });
    } else if (best) {
      this.send('skill', { sid: BASIC[this.cls], tid: `m${best.id}`, dir: Math.sign(best.x - this.x) || 1 });
    } else {
      this.x += (Math.random() - 0.5) * 60;
      this.send('move', { x: this.x, y: this.y, dir: 1, st: 1 });
    }
  }

  close() { try { this.ws.close(); } catch (e) { /* đã đóng */ } }
}

module.exports = { LightBot, sleep, CLS };
