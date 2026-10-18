'use strict';

// Tiện ích cho bot dùng chung giữa các phần kiểm thử.
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

module.exports = { seek, dash, revive, safeX };
