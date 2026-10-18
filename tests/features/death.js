'use strict';

// Tử trận và hồi sinh (cmb-death-revive, GDD 05 mục 2.10): mất EXP, giá hồi sinh tại chỗ leo thang, bảo hộ 3 giây,
// về điểm hồi sinh rv của bản đồ, gói dead có cost
const path = require('path');
const { spawnSync } = require('child_process');
const { ok, sleep } = require('../lib/harness');
const pkMod = require('../../src/server/modules/pk');
const { Combat } = require('../../src/server/core/combat');
const { Monster } = require('../../src/server/core/monster');
const { CLASSES } = require('../../src/shared/data/classes');
const { MAPS } = require('../../src/shared/data/maps');
const { REVIVE } = require('../../src/shared/constants');
const { expNeed } = require('../../src/shared/formulas');

const KIEM = Object.keys(CLASSES).find((k) => CLASSES[k].village === 'v_fire');

// người chơi giả đủ trường cho revive / damagePlayer / killPlayer
function fakePlayer(over = {}) {
  const sent = [];
  const p = {
    id: 7, name: 'ChetTest', sent, dead: true, x: 520, y: 300, map: null, match: null, duel: null, lastSkillAt: 0, cards: 0,
    s: { maxHp: 1000, maxMp: 400 },
    send(t, d) { sent.push({ t, ...d }); },
    markMe() {},
    info() { return { id: this.id }; },
    notice(msg) { sent.push({ t: 'notice', msg }); },
    countItem(id) { return id === 'revive_card' ? this.cards : 0; },
    removeItem(id, n) { if (id === 'revive_card') this.cards -= n; },
    ...over,
  };
  p.c = { cls: KIEM, hp: 0, mp: 5, luong: 10, level: 30, exp: 0, pk: 0, ...(over.c || {}) };
  return p;
}
const last = (p, t) => p.sent.filter((m) => m.t === t).pop();

function deathUnitTests() {
  console.log('Tử trận & hồi sinh (kiểm tra đơn vị): giá leo thang, bảo hộ, điểm hồi sinh, mất EXP');
  const moves = [];
  const world = { changeMap(p, map) { moves.push(map); } };
  const pk = pkMod.init(world);
  const combat = new Combat(world);
  const field = { def: MAPS.fire_field, monsters: new Map(), broadcast() {} };

  // giá leo thang: 1/2/3 rồi giữ 3; quá 10 phút trở lại 1
  const p = fakePlayer();
  const paid = [];
  for (let i = 0; i < 4; i++) {
    p.dead = true;
    const l0 = p.c.luong;
    pk.revive(p, { mode: 'here' });
    paid.push(l0 - p.c.luong);
  }
  ok(paid.join(',') === '1,2,3,3' && !p.dead && p.reviveLog.length === REVIVE.cost.length,
    `hồi sinh tại chỗ lần 1/2/3 trong 10 phút trừ 1/2/3 lượng, lần sau vẫn 3 (đã trừ ${paid.join(',')})`);
  p.reviveLog = p.reviveLog.map((t) => t - REVIVE.win - 1);
  p.dead = true;
  let l0 = p.c.luong;
  pk.revive(p, { mode: 'here' });
  ok(l0 - p.c.luong === 1, 'hồi sinh tại chỗ: sau 10 phút giá trở lại 1 lượng');

  const q = fakePlayer({ cards: 2 });
  q.reviveLog = [Date.now() - 1000, Date.now() - 500];
  pk.revive(q, { mode: 'here' });
  ok(!q.dead && q.cards === 1 && q.c.luong === 10, 'có Thẻ Hồi Sinh: chỉ trừ 1 thẻ, không trừ lượng (kể cả khi giá lượng đã leo thang)');

  const poor = fakePlayer({ c: { luong: 1 } });
  poor.reviveLog = [Date.now() - 1000];
  pk.revive(poor, { mode: 'here' });
  ok(poor.dead && poor.c.luong === 1 && /Cần 2 lượng/.test(last(poor, 'notice').msg), 'thiếu lượng theo giá leo thang: từ chối, không trừ gì');

  // bảo hộ 3 giây: đòn quái và đòn PK không trừ máu, ra chiêu là hết
  const g = fakePlayer({ map: field });
  pk.revive(g, { mode: 'here' });
  const hp0 = g.c.hp;
  const rv = last(g, 'revived');
  combat.damagePlayer(g, 300, { monster: { def: { name: 'Sơn Tặc' } } });
  combat.damagePlayer(g, 300, { player: fakePlayer({ dead: false, name: 'KeThu' }) });
  ok(rv.guard === REVIVE.guard && g.c.hp === hp0 && !g.dead, `3 giây sau hồi sinh tại chỗ: đòn quái và đòn PK không trừ máu (revived.guard = ${rv.guard})`);
  g.guard.until = Date.now() - 1;
  combat.damagePlayer(g, 100, { monster: { def: { name: 'Sơn Tặc' } } });
  ok(g.c.hp === hp0 - 100, 'hết 3 giây bảo hộ: đòn quái trừ máu bình thường');
  const s = fakePlayer({ map: field });
  pk.revive(s, { mode: 'here' });
  s.lastSkillAt = Date.now();
  combat.damagePlayer(s, 100, { monster: { def: { name: 'Sơn Tặc' } } });
  ok(s.c.hp === 600 - 100, 'dùng kỹ năng thì bảo hộ hết ngay: đòn tiếp theo trúng');

  // quái chủ động không chọn người đang được bảo hộ
  const pl = fakePlayer({ map: null });
  const mmap = { world: { nextMid: 1, combat }, def: MAPS.bamboo, players: new Map([[pl.id, pl]]), monsters: new Map(), broadcast() {} };
  pl.map = mmap;
  pk.revive(pl, { mode: 'here' });
  const mob = new Monster(mmap, 'bandit', { m: 'bandit', x1: 500, x2: 500, y: 300 }, false);
  mob.x = 500;
  mob.nextAttack = Date.now() + 1e6;
  mob.update(0.05, Date.now());
  const guardedT = mob.target;
  pl.guard = null;
  mob.aggroCheck = 0;
  mob.update(0.05, Date.now());
  ok(guardedT === 0 && mob.target === pl.id, 'quái chủ động không nhắm người đang được bảo hộ, hết bảo hộ thì nhắm lại');

  // lôi đài không có bảo hộ (bị hạ ở lôi đài không phải chết thật)
  const ar = fakePlayer({ map: field, match: { state: 'fight' } });
  pk.revive(ar, { mode: 'here' });
  ok(ar.guard === null && last(ar, 'revived').guard === 0, 'đang trong trận lôi đài: hồi sinh không có bảo hộ');

  // về làng: bản đồ có rv thì về rv, không có thì về làng phái; đầy máu và chakra
  moves.length = 0;
  const t1 = fakePlayer({ map: { def: MAPS.wasteland, broadcast() {} } });
  pk.revive(t1, { mode: 'town' });
  const t2 = fakePlayer({ map: { def: MAPS.bamboo, broadcast() {} } });
  pk.revive(t2, { mode: 'town' });
  ok(MAPS.wasteland.rv === 'v_wind' && moves[0] === 'v_wind' && t1.c.hp === 1000 && t1.c.mp === 400 && !t1.dead,
    "'Về làng' ở bản đồ có rv (Hoang Mạc Cát → v_wind): đưa tới đúng rv, đầy máu và chakra");
  ok(!MAPS.bamboo.rv && moves[1] === CLASSES[KIEM].village, "'Về làng' ở bản đồ không có rv: về làng phái như cũ");

  // revive khi còn sống không làm gì; mode lạ coi như về làng
  const alive = fakePlayer({ dead: false, c: { hp: 10 } });
  pk.revive(alive, { mode: 'here' });
  pk.revive(alive, { mode: 'town' });
  ok(alive.c.hp === 10 && alive.c.luong === 10 && moves.length === 2 && !alive.sent.length, 'revive khi còn sống không làm gì (không trừ lượng, không đổi bản đồ)');
  const odd = fakePlayer({ map: { def: MAPS.coast, broadcast() {} } });
  pk.revive(odd, { mode: 'constructor' });
  pk.revive(fakePlayer({ map: { def: MAPS.coast, broadcast() {} } }), null);
  ok(moves[2] === 'v_water' && moves[3] === 'v_water' && odd.c.luong === 10 && odd.c.hp === 1000, "mode lạ (hay thiếu) coi như 'town': về rv, không trừ lượng");

  // mất EXP: 2% bị quái hạ, 1% bị người chơi hạ, 5% có điểm hiếu chiến; dưới cấp 5 và bản đồ PvP không mất
  const lose = (over, src, map = field) => {
    const v = fakePlayer({ dead: false, map, c: { hp: 1, exp: 1e9, ...over } });
    combat.killPlayer(v, src);
    return { v, lost: last(v, 'dead').lost };
  };
  const need = expNeed(30);
  const killer = fakePlayer({ dead: false, name: 'KeThu', pkMode: true, c: { pk: 0 } });
  killer.notice = () => {};
  const byMob = lose({}, { monster: { def: { name: 'Sơn Tặc' } } });
  const byPk = lose({}, { player: killer });
  const red = lose({ pk: 3 }, { monster: { def: { name: 'Sơn Tặc' } } });
  ok(byMob.lost === Math.round(need * 0.02) && byPk.lost === Math.round(need * 0.01) && red.lost === Math.round(need * 0.05) && byMob.v.c.exp === 1e9 - byMob.lost,
    `mất EXP đúng 2%/1%/5% EXP cấp (quái hạ / người chơi hạ / có điểm hiếu chiến: ${byMob.lost}/${byPk.lost}/${red.lost})`);
  const low = lose({ level: 4 }, {});
  const arenaMap = { def: MAPS.arena, monsters: new Map(), broadcast() {} };
  const pvp = lose({}, { player: killer }, arenaMap);
  ok(low.lost === 0 && pvp.lost === 0 && low.v.c.exp === 1e9 && pvp.v.c.exp === 1e9, 'dưới cấp 5 và bản đồ PvP không mất EXP');

  // gói dead có cost (thẻ / lượng theo giá leo thang)
  const d1 = lose({}, {}).v;
  const d2 = fakePlayer({ dead: false, map: field, cards: 1, c: { hp: 1 } });
  d2.reviveLog = [Date.now() - 2000, Date.now() - 1000];
  combat.killPlayer(d2, {});
  const c1 = last(d1, 'dead').cost;
  const c2 = last(d2, 'dead').cost;
  ok(c1.card === 0 && c1.luong === 1 && c2.card === 1 && c2.luong === 3 && d2.dead && d2.guard === null,
    `gói dead có trường cost { card, luong } (${JSON.stringify(c1)}, ${JSON.stringify(c2)})`);

  // npm run check: rv phải là làng có thật
  const bad = spawnSync(process.execPath, ['-e', "require('./src/shared/data/maps').MAPS.coast.rv = 'bamboo'; require('./tools/check-data.js');"],
    { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  ok(bad.status !== 0 && /coast: rv "bamboo" không phải làng có thật/.test(bad.stdout), 'npm run check: rv không phải bản đồ town có thật thì báo lỗi');
}

// Bot thật (nhân vật c của phần PK, đang ở làng Hỏa Vân): /chet → dead.cost leo thang, hồi sinh tại chỗ, về làng theo rv
async function deathBotTest(c) {
  console.log('7n2. Tử trận & hồi sinh (bot thật): giá leo thang, về điểm hồi sinh rv');
  const chat = (msg) => c.send('chat', { ch: 'map', msg });
  chat('/tp wasteland');
  await c.wait('enterMap', (m) => m.map === 'wasteland');
  chat('/luong 10');
  await c.wait('chat', (m) => m.ch === 'sys' && /lượng/.test(m.msg));
  const costs = [];
  const paid = [];
  for (let i = 0; i < 2; i++) {
    chat('/chet');
    costs.push((await c.wait('dead')).cost);
    await sleep(100);
    const l0 = c.me.luong;
    c.send('revive', { mode: 'here' });
    const r = await c.wait('revived');
    await c.wait('me', (m) => !m.dead);
    paid.push(`${l0 - c.me.luong}/${r.guard}`);
  }
  ok(costs[0].luong === 1 && costs[1].luong === 2 && paid.join(',') === `1/${REVIVE.guard},2/${REVIVE.guard}`,
    `bot: dead.cost theo giá leo thang, hồi sinh tại chỗ trừ đúng lượng, revived có guard (${paid.join(',')})`);
  chat('/chet');
  const d = await c.wait('dead');
  c.send('revive', { mode: 'town' });
  await c.wait('enterMap', (m) => m.map === 'v_wind');
  await sleep(150);
  ok(d.cost.luong === 3 && !c.me.dead && c.map === 'v_wind' && c.me.hp === c.me.s.maxHp && c.me.mp === c.me.s.maxMp,
    'bot: về làng ở Hoang Mạc Cát đưa tới điểm hồi sinh rv (Làng Phong Lâm), đầy sinh lực và chakra');
  chat('/tp v_fire');
  await c.wait('enterMap', (m) => m.map === 'v_fire');
}

module.exports = { deathUnitTests, deathBotTest };
