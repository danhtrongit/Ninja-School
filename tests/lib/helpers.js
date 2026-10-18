'use strict';

// Tiện ích cho bot dùng chung giữa các phần kiểm thử.
const fs = require('fs');
const path = require('path');
const { sleep } = require('./harness');

// Đợi tin loại t (thỏa pred) xuất hiện trong bot.msgs từ vị trí from (không phụ thuộc lần gửi gần nhất)
async function seek(bot, t, pred, from, ms = 6000) {
  const t0 = Date.now();
  for (;;) {
    for (let i = from; i < bot.msgs.length; i++) {
      const m = bot.msgs[i];
      if (m.t === t && (!pred || pred(m))) return { m, i };
    }
    if (Date.now() - t0 > ms) throw new Error(`${bot.name}: hết thời gian chờ "${t}"`);
    await sleep(25);
  }
}

// Đi nhanh (bước nhỏ hơn ngưỡng kiểm tra tốc độ của server) để kịp né chiêu
async function dash(bot, x) {
  while (Math.abs(bot.x - x) > 2) {
    const step = Math.sign(x - bot.x) * Math.min(26, Math.abs(x - bot.x));
    bot.x += step;
    bot.send('move', { x: bot.x, y: 300, dir: Math.sign(step), st: 1 });
    await sleep(65);
  }
}

// Bot đã gục thì hồi sinh tại chỗ (tốn 1 lượng); trả về số lượng đã tiêu
async function revive(bot) {
  if (!bot.me.dead) return 0;
  const l0 = bot.me.luong;
  bot.send('revive', { mode: 'here' });
  await bot.wait('revived', null, 2000).catch(() => null);
  await sleep(120);
  return Math.max(0, l0 - bot.me.luong);
}

// Chỗ an toàn gần nhất ngoài vùng chiêu c (vị trí chốt lúc niệm)
function safeX(c, x) {
  if (c.shape === 'line') return c.x - c.dir * 40;
  if (c.shape === 'pillar') return Math.max(...c.pts.map((p) => Math.abs(p[0] - x))) < 200 ? x + 90 : x;
  const side = x >= c.x ? 1 : -1;
  return c.x + side * (c.r + 30);
}

// db giả cho thế giới giả: ghi lại các lần touch/commit (services/db.js lưu theo bản ghi)
function fakeDb(extra = {}) {
  return {
    touched: [], commits: [],
    touch(name) { this.touched.push(String(name)); },
    commit(names, reason) { this.commits.push({ names: [].concat(names).map(String), reason }); return true; },
    get dirty() { return this.touched.length + this.commits.length > 0; },
    ...extra,
  };
}

// nhân vật trên đĩa (bố cục chars/<khóa>.json của services/db.js): đọc hết thành { khóa: nhân vật } (bỏ _gen), ghi lại từng file
const charPath = (dir, key) => path.join(dir, 'chars', `${encodeURIComponent(key)}.json`);
function readChars(dir) {
  const out = {};
  for (const f of fs.readdirSync(path.join(dir, 'chars'))) {
    if (!f.endsWith('.json')) continue;
    const c = JSON.parse(fs.readFileSync(path.join(dir, 'chars', f), 'utf8'));
    delete c._gen;
    out[decodeURIComponent(f.slice(0, -5))] = c;
  }
  return out;
}
function writeChars(dir, chars) {
  for (const [key, c] of Object.entries(chars)) fs.writeFileSync(charPath(dir, key), JSON.stringify(c));
}

module.exports = { seek, dash, revive, safeX, fakeDb, readChars, writeChars };
