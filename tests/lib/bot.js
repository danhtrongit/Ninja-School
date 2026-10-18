'use strict';

// Bot WebSocket: ghi lại mọi tin nhắn, chờ tin theo loại, đi bộ tới tọa độ.
const WebSocket = require('ws');
const { PORT, sleep } = require('./harness');

class Bot {
  // port: máy chủ riêng của phần kiểm thử (mặc định máy chủ chung của harness)
  constructor(name, port = PORT) {
    this.name = name;
    this.port = port;
    this.msgs = [];
    this.waiters = [];
    this.used = new Set();
    this.sendIdx = 0;
    this.state = {};
  }

  connect(headers) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${this.port}/ws`, headers ? { headers } : undefined);
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        this.msgs.push(m);
        const idx = this.msgs.length - 1;
        if (m.t === 'me') this.me = m;
        if (m.t === 'enterMap') {
          this.me = m.me;
          this.map = m.map;
          this.x = m.x;
          this.y = m.y;
          this.monsters = new Map(m.monsters.map((x) => [x.id, x]));
        }
        if (m.t === 'inv') this.inv = m;
        if (m.t === 'state' && this.monsters) for (const [id, x, y, , , hp] of m.m) if (this.monsters.has(id)) Object.assign(this.monsters.get(id), { x, y, hp });
        if (m.t === 'mSpawn' && this.monsters) this.monsters.set(m.id, m);
        if (m.t === 'mDie' && this.monsters) this.monsters.delete(m.id);
        if (m.t === 'pos') { this.x = m.x; this.y = m.y; }
        if (m.t === 'data') {
          this.data = m;
          resolve();
        }
        for (const w of this.waiters.slice()) {
          if (!this.used.has(idx) && w.t === m.t && (!w.pred || w.pred(m))) {
            this.used.add(idx);
            this.waiters.splice(this.waiters.indexOf(w), 1);
            clearTimeout(w.timer);
            w.resolve(m);
          }
        }
      });
      this.ws.on('error', reject);
    });
  }

  send(t, d = {}) {
    this.sendIdx = this.msgs.length;
    this.ws.send(JSON.stringify({ t, ...d }));
  }

  // Chờ tin nhắn loại t đến sau lần gửi gần nhất (kể cả tin đã đến trước khi gọi wait)
  wait(t, pred, ms = 4000) {
    for (let i = this.sendIdx; i < this.msgs.length; i++) {
      const m = this.msgs[i];
      if (!this.used.has(i) && m.t === t && (!pred || pred(m))) {
        this.used.add(i);
        return Promise.resolve(m);
      }
    }
    return new Promise((resolve, reject) => {
      const w = { t, pred, resolve };
      w.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        reject(new Error(`${this.name}: hết thời gian chờ "${t}"`));
      }, ms);
      this.waiters.push(w);
    });
  }

  async walkTo(x) {
    while (Math.abs(this.x - x) > 4) {
      const step = Math.sign(x - this.x) * Math.min(14, Math.abs(x - this.x));
      this.x += step;
      this.send('move', { x: this.x, y: this.y, dir: Math.sign(step), st: 1 });
      await sleep(90);
    }
  }
}

module.exports = { Bot };
