'use strict';

// Di chuyển: server tự kiểm tra độ cao theo vật lý nhảy.
const { sleep, ok } = require('../lib/harness');

// Server tự kiểm độ cao theo vật lý nhảy: cú nhảy thật không bị sửa, lơ lửng trên không bị kéo xuống
async function airTest(a) {
  console.log('7d. Server kiểm tra độ cao (không tin y máy khách gửi)');
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');
  // giữa hai bục của làng, bên dưới không có bục; chờ hết thời gian ân hạn sau khi đổi bản đồ
  await a.walkTo(560);
  await sleep(500);
  const X = 560;
  let from = a.msgs.length;
  // mô phỏng đúng vật lý máy khách: nhảy, nhảy đôi ở đỉnh, gửi mỗi 4 khung, khung chạm đất gửi ngay; nhảy liền 3 lần
  for (let hop = 0; hop < 3; hop++) {
    let y = 300;
    let vy = -378;
    let jumps = 1;
    for (let f = 1; ; f++) {
      vy = Math.min(600, vy + 1000 / 60);
      y += vy / 60;
      if (jumps === 1 && vy >= 0) {
        vy = -330;
        jumps = 2;
      }
      if (y >= 300) break;
      if (f % 4 === 0) {
        a.send('move', { x: X, y: Math.round(y), dir: 1, st: 2 });
        await sleep(66);
      }
    }
    a.send('move', { x: X, y: 300, dir: 1, st: 0 });
    await sleep(16);
  }
  await sleep(150);
  ok(!a.msgs.slice(from).some((m) => m.t === 'pos'), 'nhảy đôi liên tục đúng vật lý: server không sửa vị trí');
  from = a.msgs.length;
  for (let i = 0; i < 30; i++) {
    a.send('move', { x: X, y: 200, dir: 1, st: 2 });
    await sleep(100);
  }
  await sleep(150);
  const fixes = a.msgs.slice(from).filter((m) => m.t === 'pos');
  ok(fixes.some((m) => m.y > 200 && m.y < 300) && fixes.some((m) => m.y === 300), `lơ lửng cao 100px: server hạ độ cao rồi kéo về mặt đất (${fixes.length} lần sửa)`);
  a.send('move', { x: X, y: 300, dir: 1, st: 0 });
  await sleep(100);
}

const tp = async (bot, map) => {
  if (bot.map === map) return;
  bot.send('chat', { ch: 'map', msg: `/tp ${map}` });
  await bot.wait('enterMap', (m) => m.map === map);
};

// ping/pong và nhặt đồ thủ công (gói pickup): món của người khác trong 15 giây đầu bị từ chối, chủ nhặt được
async function pickupTest({ a, c }) {
  console.log('7p. Nhặt đồ thủ công, ping');
  a.send('ping', { ts: 4242 });
  ok((await a.wait('pong')).ts === 4242, 'ping: server trả pong kèm ts của máy khách');
  await tp(a, 'fire_field');
  await tp(c, 'fire_field');
  // diệt quái tới khi có món rơi còn nằm trên đất (không bị tự nhặt do đứng sát) trong tầm nhặt tay
  let g = null;
  for (let k = 0; k < 8 && !g; k++) {
    const mobs = [...a.monsters.values()].filter((m) => m.y === 300).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x));
    const tg = mobs[0];
    if (!tg) break;
    await a.walkTo(Math.max(30, Math.round(tg.x - 45)));
    const from = a.msgs.length;
    for (let i = 0; i < 10 && a.monsters.has(tg.id); i++) {
      a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
      a.send('skill', { sid: 'k0', tid: `m${tg.id}`, dir: 1 });
      await sleep(400);
    }
    await sleep(250);
    const later = a.msgs.slice(from);
    const gone = new Set(later.filter((m) => m.t === 'gDel').map((m) => m.id));
    g = later.find((m) => m.t === 'gAdd' && !gone.has(m.id) && Math.abs(m.x - a.x) < 70 && Math.abs(m.y - 300) < 60) || null;
  }
  ok(!!g, `diệt quái có món rơi nằm trên đất (${g ? g.k : 'không có'})`);
  if (!g) return;
  await c.walkTo(g.x + 30);
  await sleep(150);
  c.send('pickup', { id: g.id });
  ok(!!(await c.wait('notice', (m) => /thuộc về người khác/.test(m.msg)).catch(() => null)), 'pickup món của người khác (chưa hết 15 giây) bị từ chối');
  const from = a.msgs.length;
  a.send('pickup', { id: g.id });
  const del = await a.wait('gDel', (m) => m.id === g.id);
  ok(del.by === a.me.id && a.msgs.slice(from).some((m) => m.t === 'loot'), 'pickup thủ công: chủ món nhặt được (gDel + loot)');
}

module.exports = { airTest, pickupTest };
