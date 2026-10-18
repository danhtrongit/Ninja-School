'use strict';

// Hồi sinh: về làng và tại chỗ đều hồi máu, đều báo máy khách vẽ lại thanh máu (gói 'me')
const { ok, sleep } = require('../lib/harness');
const pkMod = require('../../src/server/modules/pk');
const { CLASSES } = require('../../src/shared/data/classes');

function fakePlayer(over) {
  const sent = [];
  return {
    sent, dead: true, x: 300, y: 300, dirtyMe: false, map: null,
    c: { cls: Object.keys(CLASSES)[0], hp: 0, mp: 5, luong: 3 },
    s: { maxHp: 900, maxMp: 400 },
    send(t, d) { sent.push({ t, ...d }); },
    markMe() { this.dirtyMe = true; },
    notice(msg) { sent.push({ t: 'notice', msg }); },
    countItem() { return 0; },
    removeItem() {},
    ...over,
  };
}

function pkUnitTests() {
  console.log('Hồi sinh (kiểm tra đơn vị): về làng hồi đầy máu và gửi lại chỉ số');
  const moves = [];
  const world = { changeMap(p, map) { moves.push(map); p.dirtyMe = false; } };
  const pk = pkMod.init(world);

  const p = fakePlayer();
  pk.revive(p, {});
  ok(!p.dead && p.c.hp === 900 && p.c.mp === 400, 'hồi sinh về làng: hết trọng thương, đầy sinh lực và chakra');
  ok(moves[0] === CLASSES[p.c.cls].village, 'hồi sinh về làng: đưa về làng của môn phái');
  ok(p.dirtyMe, 'hồi sinh về làng: đánh dấu gửi lại gói me sau khi đổi bản đồ (thanh máu cập nhật)');

  const q = fakePlayer();
  pk.revive(q, { mode: 'here' });
  ok(!q.dead && q.c.hp === 540 && q.c.luong === 2 && q.dirtyMe && moves.length === 1, 'hồi sinh tại chỗ: 60% sinh lực, trừ 1 lượng, gửi lại gói me');

  const r = fakePlayer({ dead: false, c: { cls: q.c.cls, hp: 10, mp: 0, luong: 0 } });
  pk.revive(r, {});
  ok(r.c.hp === 10 && moves.length === 1, 'chưa trọng thương thì gói revive bị bỏ qua');
}

const cmd = async (bot, msg, re) => {
  bot.send('chat', { ch: 'map', msg });
  await bot.wait('chat', (m) => m.ch === 'sys' && re.test(m.msg));
};
const notice = (bot, re, ms = 3000) => bot.wait('notice', (m) => re.test(m.msg), ms).then(() => true).catch(() => false);
const tp = async (bot, map) => {
  bot.send('chat', { ch: 'map', msg: `/tp ${map}` });
  await bot.wait('enterMap', (m) => m.map === map);
};

// Bot thật (3 nhân vật của phần gia tộc): bật/tắt PK, thách đấu duelReq/duelAccept tới khi phân thắng bại, hồi sinh về làng
async function pkBotTest({ a, b, c }) {
  console.log('7n. PK, thách đấu, hồi sinh về làng (bot thật)');
  c.send('pk', { on: true });
  ok(await notice(c, /Cần đạt cấp 10/), 'pk: dưới cấp 10 không bật được chế độ PK');
  if (a.map !== 'v_fire') await tp(a, 'v_fire');
  a.send('pk', { on: true });
  ok(await notice(a, /Không thể bật PK trong làng/) && !a.me.pkMode, 'pk: không bật được trong làng');
  await cmd(b, '/lv 15', /Cấp hiện tại/);
  if (b.map !== 'v_fire') await tp(b, 'v_fire');
  a.send('duelReq', { name: 'TocLao' });
  ok(await notice(a, /Không thể thách đấu trong làng/), 'duelReq: không thách đấu trong làng');

  await tp(a, 'fire_field');
  await tp(b, 'fire_field');
  a.send('pk', { on: true });
  const on = await a.wait('me', (m) => m.pkMode === true);
  const seen = await b.wait('pInfo', (m) => m.id === a.me.id && m.pkMode === true).catch(() => null);
  ok(on.pkMode && !!seen, 'pk on ngoài làng: bật chế độ PK, người cùng bản đồ thấy (pInfo pkMode)');
  a.send('pk', { on: false });
  ok((await a.wait('me', (m) => m.pkMode === false)).pkMode === false, 'pk off: tắt chế độ PK');

  // thách đấu: đứng sát nhau, A đánh tới khi B còn 1 máu thì trận kết thúc, B không trọng thương
  await cmd(a, '/lv 60', /Cấp hiện tại/);
  await b.walkTo(a.x + 30);
  await sleep(200);
  a.send('duelReq', { name: 'TocLao' });
  const inv = await b.wait('invite', (m) => m.kind === 'duel');
  ok(inv.from === 'TocTruong', 'duelReq: TocLao nhận lời thách đấu');
  b.send('duelAccept', { from: 'TocTruong' });
  const da = await a.wait('duel', (m) => m.with === b.me.id);
  const db = await b.wait('duel', (m) => m.with === a.me.id);
  ok(da.name === 'TocLao' && db.name === 'TocTruong', 'duelAccept: cả hai vào trận thách đấu');
  const from = b.msgs.length;
  let ended = false;
  for (let i = 0; i < 60 && !ended; i++) {
    a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
    a.send('skill', { sid: 'k0', tid: `p${b.me.id}`, dir: 1 });
    await sleep(400);
    ended = b.msgs.slice(from).some((m) => m.t === 'duel' && m.with === 0);
  }
  await sleep(200);
  ok(ended && !b.me.dead && b.me.hp >= 1, `thách đấu kết thúc khi bên thua cạn máu, không trọng thương (máu còn ${b.me.hp})`);
  ok(a.msgs.some((m) => m.t === 'chat' && /TocTruong đã chiến thắng TocLao/.test(m.msg)), 'cả bản đồ nhận tin người thắng trận thách đấu');
  b.send('duelAccept', { from: 'TocTruong' });
  ok(await notice(b, /hết hạn/), 'duelAccept lần nữa: lời mời đã dùng không còn hiệu lực');

  // hồi sinh về làng
  await tp(c, 'fire_field');
  c.send('chat', { ch: 'map', msg: '/chet' });
  await c.wait('me', (m) => m.dead === true);
  c.send('revive', {});
  await c.wait('revived');
  await c.wait('enterMap', (m) => m.map === 'v_fire');
  await sleep(150);
  ok(!c.me.dead && c.me.hp === c.me.s.maxHp && c.map === 'v_fire', 'revive về làng (bot thật): đưa về làng môn phái, đầy sinh lực');
}

module.exports = { pkUnitTests, pkBotTest };
