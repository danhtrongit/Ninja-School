'use strict';

// Lệnh admin, điểm tiềm năng, học kỹ năng, 3 bộ thanh kỹ năng, cường hóa.
const { sleep, ok } = require('../lib/harness');

async function skillsTest(ctx) {
  const { a } = ctx;
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

module.exports = { skillsTest };
