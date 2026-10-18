'use strict';

// Lệnh admin, điểm tiềm năng, học kỹ năng, 3 bộ thanh kỹ năng, cường hóa.
const { sleep, ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');

// Thế giới giả (không cần server): addStat (điểm tiềm năng) và các chốt chặn của useSkill ở máy chủ
function skillsUnitTests() {
  console.log('4a. Tiềm năng & dùng kỹ năng (thế giới giả)');
  const { Player, newChar } = require('../../src/server/core/player');
  const { Skills } = require('../../src/server/modules/skills');
  const { Combat } = require('../../src/server/core/combat');
  const { SKILLS, skillVal } = require('../../src/shared/data/skills');
  const world = { nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; }, social: { handle() {} } };
  const sent = [];
  const p = new Player(world, { send: (t, d) => sent.push([t, d]) }, newChar('sunit', 'kiem', 'm'));
  const sk = new Skills(world);
  const st = () => JSON.stringify(p.c.stats);

  // addStat: cộng đúng ô, kẹp theo số điểm còn, khóa lạ / không còn điểm thì bỏ qua
  p.c.potential = 10;
  sk.addStat(p, { k: 'agi', n: 3 });
  ok(p.c.stats.agi === 8 && p.c.potential === 7, 'addStat cộng 3 điểm vào agi, tiềm năng còn 7');
  const s0 = st();
  for (const k of ['hp', 'atk', '__proto__', 'constructor', 'toString', '', null, 5]) sk.addStat(p, { k, n: 2 });
  ok(st() === s0 && p.c.potential === 7 && ({}).hp === undefined && Object.keys(p.c.stats).join() === 'str,agi,int,vit',
    'addStat khóa lạ (hp, atk, __proto__, constructor...) bị bỏ qua, không trừ điểm');
  sk.addStat(p, { k: 'str', n: 999 });
  ok(p.c.stats.str === 12 && p.c.potential === 0, 'addStat n = 999 khi còn 7 điểm: chỉ cộng 7, không vượt số điểm còn');
  const s1 = st();
  for (const n of [1, 5, -3, 0, 'abc']) sk.addStat(p, { k: 'vit', n });
  ok(st() === s1 && p.c.potential === 0, 'addStat hết điểm tiềm năng (n dương, âm, 0, rác) không cộng thêm');
  p.c.potential = 4;
  sk.addStat(p, { k: 'int', n: -50 });
  ok(p.c.stats.int === 6 && p.c.potential === 3, 'addStat n âm được tính là 1 điểm (không trừ ngược chỉ số)');

  // useSkill: phái, đã học, hồi chiêu (dung sai 60 ms), cách 180 ms, chakra (bản đồ giả trống, k2 = đánh lan quanh mình)
  const fx = [];
  p.map = { def: {}, monsters: new Map(), players: new Map(), broadcast: (t, d) => { if (t === 'fx') fx.push(d); } };
  const cb = new Combat(world);
  const cost = Math.round(skillVal(SKILLS.k2.mp, 1));
  p.c.level = 30;
  p.recalc();
  p.c.mp = p.s.maxMp;
  const cast = (sid) => {
    const n = fx.length;
    const mp = p.c.mp;
    cb.useSkill(p, { sid, dir: 1 });
    return fx.length > n && p.c.mp < mp;
  };
  ok(!cast('c1') && !cast('t1') && !cast('__proto__'), 'useSkill: chiêu của phái khác (c1, t1) hay sid rác bị từ chối');
  delete p.c.skills.k2;
  ok(!cast('k2'), 'useSkill: chiêu chưa học bị từ chối');
  p.c.skills.k7 = 1;
  ok(!cast('k7'), 'useSkill: kỹ năng nội tại không dùng bằng lệnh skill');
  delete p.c.skills.k7;
  p.c.skills.k2 = 1;
  const mp0 = p.c.mp;
  const okCast = cast('k2');
  ok(okCast && p.c.mp === mp0 - cost && p.cool.k2 - Date.now() > SKILLS.k2.cd - 100, `useSkill: chiêu đã học ra được, trừ ${cost} chakra, đặt hồi chiêu ${SKILLS.k2.cd} ms`);
  p.lastSkillAt = 0;
  ok(!cast('k2'), 'useSkill: đang hồi chiêu thì bị từ chối');
  p.cool.k2 = Date.now() + 120;
  ok(!cast('k2'), 'useSkill: còn 120 ms hồi chiêu (quá dung sai 60 ms) bị từ chối');
  p.cool.k2 = Date.now() + 40;
  ok(cast('k2'), 'useSkill: còn 40 ms hồi chiêu (trong dung sai 60 ms) vẫn ra chiêu');
  p.cool.k2 = 0;
  p.lastSkillAt = Date.now() - 100;
  ok(!cast('k2'), 'useSkill: hai lần ra chiêu cách nhau dưới 180 ms bị từ chối');
  p.lastSkillAt = Date.now() - 200;
  ok(cast('k2'), 'useSkill: cách lần trước 200 ms thì ra chiêu được');
  p.cool.k2 = 0;
  p.lastSkillAt = 0;
  p.c.mp = cost - 1;
  sent.length = 0;
  ok(!cast('k2') && p.c.mp === cost - 1 && sent.some(([t, d]) => t === 'notice' && d.msg === 'Không đủ chakra!'),
    'useSkill: thiếu chakra bị từ chối ở máy chủ, báo "Không đủ chakra!", không trừ chakra');
}

async function skillsTest(ctx) {
  const { a } = ctx;
  skillsUnitTests();
  console.log('4. Lệnh admin, kỹ năng, cường hóa');
  a.send('chat', { ch: 'map', msg: '/lv 25' });
  await a.wait('chat', (m) => /Cấp hiện tại/.test(m.msg));
  await sleep(120);
  ok(a.me.level === 25 && a.me.potential === 120, 'lên cấp 25, có 120 điểm tiềm năng');
  a.send('addStat', { k: 'str', n: 10 });
  await sleep(120);
  ok(a.me.stats.str === 15, 'cộng 10 điểm sức mạnh');
  a.send('learnSkill', { sid: 'k2' });
  await sleep(120);
  ok(a.me.skills.k2 === 1 && a.me.hotbar.includes('k2'), 'học Liệt Hỏa Hoàn và gán vào thanh kỹ năng');
  ok(a.me.hotbars.length === 3 && a.me.hbi === 0 && a.me.hotbars.every((hb) => hb.length === 6)
    && a.me.hotbar.join() === a.me.hotbars[0].join() && a.me.hotbars[1].every((x) => x === null), 'có 3 bộ kỹ năng, bộ 0 đang dùng');
  const hb0 = a.me.hotbar.join();
  // sid độc hại / không hợp lệ: khóa của Object.prototype, phái khác, đòn thường, chưa học, ô ngoài phạm vi
  for (const [i, sid] of [[5, '__proto__'], [4, 'constructor'], [3, 'hasOwnProperty'], [2, 'c1'], [1, 'k0'], [5, 'k3'], [9, 'k1'], [-1, 'k1']]) a.send('hotbar', { i, sid });
  a.send('hotbarSet', { n: 7 });
  a.send('hotbarSet', { n: '2' });
  a.send('constructor', {});
  a.send('__proto__', {});
  a.send('hotbarSet', { n: 1 });
  a.send('hotbarSet', { n: 2 });
  await a.wait('me', (m) => m.hbi === 1);
  await sleep(150);
  ok(a.me.hbi === 1 && a.me.hotbars[0].join() === hb0, 'bỏ qua sid độc hại/không hợp lệ, đổi sang bộ 1 (chặn đổi liên tục)');
  ok(a.me.hotbar.every((x) => x === null), 'bộ 1 ban đầu trống');
  a.send('hotbar', { i: 0, sid: 'k2' });
  a.send('hotbar', { i: 1, sid: 'k1' });
  await a.wait('me', (m) => m.hotbar[1] === 'k1');
  ok(a.me.hotbars[1][0] === 'k2' && a.me.hotbar[0] === 'k2' && a.me.hotbars[0].join() === hb0, 'gán kỹ năng ghi vào đúng bộ đang dùng');
  a.send('hotbar', { i: 1, sid: 'k2' });
  await a.wait('me', (m) => m.hotbar[1] === 'k2');
  ok(a.me.hotbar[0] === 'k1', 'gán kỹ năng đã có trong bộ thì hoán đổi ô');
  await sleep(320);
  a.send('hotbarSet', { n: 0 });
  await a.wait('me', (m) => m.hbi === 0);
  ok(a.me.hotbar.join() === hb0, 'quay về bộ 0 giữ nguyên thanh cũ');
  await sleep(320);
  a.send('hotbarSet', { n: 1 });
  await a.wait('me', (m) => m.hbi === 1);
  a.send('chat', { ch: 'map', msg: '/item stone1 10' });
  a.send('chat', { ch: 'map', msg: '/xu 100000' });
  const homeSlot = a.inv.inv.findIndex((it) => it && it.id === 'scroll_home');
  a.send('useItem', { slot: homeSlot });
  await a.wait('enterMap');
  ok(a.map === 'v_fire', 'dùng Cuộn Về Làng');
  await a.walkTo(620);
  a.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot: 'weapon' });
  const up = await a.wait('upgradeResult');
  ok(up.ok && up.plus === 1, 'cường hóa vũ khí lên +1');
}

// Tẩy điểm tiềm năng (20 lượng): thiếu lượng bị từ chối; đủ thì trả mọi điểm đã cộng về tiềm năng
async function resetStatsTest(b) {
  console.log('7o. Tẩy điểm tiềm năng');
  b.send('chat', { ch: 'map', msg: '/lv 20' });
  await b.wait('chat', (m) => /Cấp hiện tại/.test(m.msg));
  await sleep(120);
  const pot0 = b.me.potential;
  b.send('addStat', { k: 'str', n: 6 });
  b.send('addStat', { k: 'vit', n: 4 });
  await b.wait('me', (m) => m.stats.vit === 9);
  ok(b.me.stats.str === 11 && b.me.potential === pot0 - 10, 'cộng 6 sức mạnh + 4 thể lực');
  const l0 = b.me.luong;
  if (l0 >= 20) {
    b.send('chat', { ch: 'map', msg: `/luong ${-l0}` });
    await b.wait('chat', (m) => /lượng/.test(m.msg));
    await sleep(120);
  }
  b.send('resetStats');
  ok(!!(await b.wait('notice', (m) => /cần 20 lượng/.test(m.msg))) && b.me.stats.str === 11, 'resetStats thiếu 20 lượng bị từ chối, điểm giữ nguyên');
  b.send('chat', { ch: 'map', msg: '/luong 30' });
  await b.wait('chat', (m) => /lượng/.test(m.msg));
  await sleep(120);
  const l1 = b.me.luong;
  const hp1 = b.me.s.maxHp;
  b.send('resetStats');
  await b.wait('notice', (m) => /Đã tẩy điểm tiềm năng/.test(m.msg));
  await sleep(150);
  const st = b.me.stats;
  ok(st.str === 5 && st.agi === 5 && st.int === 5 && st.vit === 5 && b.me.potential === pot0 && b.me.luong === l1 - 20 && b.me.s.maxHp < hp1,
    `resetStats: chỉ số về 5, hoàn ${b.me.potential} điểm tiềm năng, trừ 20 lượng, sinh lực tính lại`);
}

module.exports = { skillsTest, resetStatsTest, skillsUnitTests };
