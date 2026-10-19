'use strict';

// Di chuyển: server tự kiểm tra độ cao theo vật lý nhảy.
const fs = require('fs');
const path = require('path');
const { sleep, ok } = require('../lib/harness');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const constOf = (src, name) => {
  const m = src.match(new RegExp(`^const ${name} = ([0-9.]+);`, 'm'));
  return m ? +m[1] : null;
};
const clientFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? clientFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));

// Vật lý nhảy của máy khách và server phải trùng nhau (server tự tính độ cao nhảy được, xem modules/movement)
function physicsUnitTests() {
  const cli = read('src/client/js/game/game.js');
  const srv = read('src/server/modules/movement/index.js');
  const want = { JUMP: 378, JUMP2: 330, GRAV: 1000 };
  const got = Object.keys(want).map((k) => `${k} ${constOf(cli, k)}/${constOf(srv, k)}`);
  ok(Object.keys(want).every((k) => constOf(cli, k) === want[k] && constOf(srv, k) === want[k]),
    `hằng JUMP 378, JUMP2 330, GRAV 1000 giống nhau ở game/game.js và modules/movement/index.js (${got.join(', ')})`);
  const inClient = clientFiles(path.join(ROOT, 'src/client/js')).filter((f) => /\bAIR_(MAX|SLACK)\b/.test(fs.readFileSync(f, 'utf8')));
  ok(constOf(srv, 'AIR_MAX') === 2.4 && constOf(srv, 'AIR_SLACK') === 0.3 && !inClient.length,
    `AIR_MAX 2.4, AIR_SLACK 0.3 chỉ có ở server (modules/movement/index.js)${inClient.length ? ` (máy khách: ${inClient.join(', ')})` : ''}`);
}

// Ngân sách quãng đường của gói move, chạy trên đồng hồ giả (thay Date.now trong lúc chạy)
function budgetUnitTests() {
  const { Movement } = require('../../src/server/modules/movement');
  const { MAPS, GROUND } = require('../../src/shared/data/maps');
  const def = MAPS.dragon_palace;
  const mv = new Movement({});
  const realNow = Date.now;
  let T = 1e6;
  Date.now = () => T;
  // người chơi giả đứng trên mặt đất, hết ân hạn sau khi vào bản đồ
  const mk = (x, spd = 0) => {
    const p = { dead: false, map: { def }, x, y: GROUND, dir: 1, st: 0, lastMoveAt: T, moveGrace: 0, airAt: 0, baseY: GROUND, pulls: 0, last: null };
    p.moveSpd = () => spd;
    p.send = (t, m) => { if (t === 'pos') { p.pulls++; p.last = m; } };
    return p;
  };
  // gói tin theo thời điểm tới server (ms tính từ lúc bắt đầu)
  const run = (p, packets) => {
    const T0 = T;
    for (const [at, x] of packets) {
      T = T0 + at;
      mv.move(p, { x, y: GROUND, dir: 1, st: 1 });
    }
  };
  try {
    // 1) dồn gói: mỗi gói đi đúng mức tối đa gói đơn lẻ cho phép (176 px/giây × dt + 30), bám theo vị trí server
    const res = [10, 20, 40, 80].map((n) => {
      const p = mk(200);
      const T0 = T;
      const iv = 1000 / n;
      const marks = [p.x];
      for (let i = 1; i <= 6 * n; i++) {
        T = T0 + Math.round(i * iv);
        const dt = Math.min(1.2, (T - p.lastMoveAt) / 1000);
        mv.move(p, { x: p.x + (176 * dt + 30 - 0.5), y: GROUND, dir: 1, st: 1 });
        if (i % n === 0) marks.push(p.x);
      }
      // giây đầu còn ngân sách dồn sẵn (đứng yên trước đó), các giây sau là tốc ổn định
      const per = marks.slice(2).map((v, k) => v - marks[k + 1]);
      return { n, max: Math.max(...per), first: marks[1] - marks[0] };
    });
    ok(res.every((r) => r.max <= 198), `dồn gói 10/20/40/80 gói/giây, mỗi gói đi tối đa, spd = 0: quãng đi trong 1 giây ≤ 198 px (${res.map((r) => Math.round(r.max)).join('/')} px; giây đầu có ngân sách dồn ${res.map((r) => Math.round(r.first)).join('/')} px)`);

    // 2) máy khách hợp lệ: 15 gói/giây, chạy qua lại liên tục, trễ 60 ms ± 40 ms (gói không vượt nhau)
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const walk = (speed, secs, lagAt = -1) => {
      const p = mk(300, speed === 110 ? 0 : Math.round((speed / 110 - 1) * 100));
      const lo = 300;
      const span = 1500;
      const at = (ms) => {
        const d = (speed * ms) / 1000;
        const k = d % (2 * span);
        return lo + (k < span ? k : 2 * span - k);
      };
      const packets = [];
      let prev = 0;
      for (let s = 1000 / 15; s <= secs * 1000; s += 1000 / 15) {
        let arr = Math.max(prev, s + 60 + (rnd() * 80 - 40));
        // mất sóng 1 giây: các gói gửi trong lúc đó tới dồn cùng một lúc
        if (lagAt >= 0 && s >= lagAt && s < lagAt + 1000) arr = lagAt + 1000 + 60;
        prev = arr;
        packets.push([Math.round(arr), Math.round(at(s))]);
      }
      run(p, packets);
      return { pulls: p.pulls, n: packets.length };
    };
    const w0 = walk(110, 60);
    ok(w0.pulls === 0, `máy khách hợp lệ 15 gói/giây, nhiễu ±40 ms, 60 giây: 0 lần kéo lại (${w0.pulls} lần / ${w0.n} gói)`);
    const w40 = walk(110 * 1.4, 60);
    ok(w40.pulls === 0, `thú cưỡi spd = 40, 15 gói/giây, nhiễu ±40 ms, 60 giây: 0 lần kéo lại (${w40.pulls} lần / ${w40.n} gói)`);
    const lag = walk(110, 8, 3000);
    ok(lag.pulls <= 1, `mất sóng 1 giây rồi dồn 15 gói: ≤ 1 lần kéo lại (${lag.pulls} lần)`);

    // 3) server đặt lại vị trí (vào bản đồ, chiêu lướt): ngân sách đầy lại, gói ngay sau đó không bị kéo
    const p = mk(200);
    for (let i = 0; i < 40; i++) {
      T += 25;
      mv.move(p, { x: p.x + 30, y: GROUND, dir: 1, st: 1 });
    }
    const drained = p.moveBudget < 1 && p.pulls > 0;
    p.pulls = 0;
    p.x = 1500;
    p.moveGrace = T + 600;
    run(p, [[100, 1500], [700, 1560], [800, 1580], [900, 1600]]);
    ok(drained && p.pulls === 0, `cạn ngân sách rồi được server đặt lại vị trí (ân hạn): đi tiếp không bị kéo lại (${p.pulls} lần)`);
  } finally {
    Date.now = realNow;
  }
}

function movementUnitTests() {
  physicsUnitTests();
  budgetUnitTests();
}

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

module.exports = { airTest, pickupTest, movementUnitTests };
