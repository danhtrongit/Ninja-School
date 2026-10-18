'use strict';

// Nội dung hậu kỳ: cấp 120, tuyệt kỹ, đồ ăn, thú cưng, vũ khí bậc Thánh, bản đồ mới.
const { sleep, ok } = require('../lib/harness');

async function endgameTest(ctx) {
  const { a } = ctx;
  console.log('7. Nội dung hậu kỳ: cấp 120, tuyệt kỹ, thú cưng, đồ ăn, bản đồ mới');
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  await a.wait('chat', (m) => /Cấp hiện tại: 120/.test(m.msg));
  await sleep(120);
  ok(a.me.level === 120, 'đạt cấp tối đa 120');
  a.send('learnSkill', { sid: 'k6' });
  await sleep(150);
  ok(a.me.skills.k6 === 1, 'học tuyệt kỹ cấp 60 Hỏa Long Thần Kiếm');
  ok(a.me.hbi === 1 && a.me.hotbar.includes('k6') && !a.me.hotbars[0].includes('k6'), 'kỹ năng mới tự gán vào bộ đang dùng');
  a.send('chat', { ch: 'map', msg: '/item pet_bunny 1' });
  a.send('chat', { ch: 'map', msg: '/item food_atk 1' });
  a.send('chat', { ch: 'map', msg: '/item w_kiem_11 1' });
  await sleep(250);
  const atk0 = a.me.s.atk;
  a.send('useItem', { slot: a.inv.inv.findIndex((it) => it && it.id === 'food_atk') });
  await sleep(150);
  ok(a.me.s.atk > atk0 && a.me.buffs.some((b) => b.k === 'food_atk'), 'đồ ăn tăng % tấn công');
  a.send('equip', { slot: a.inv.inv.findIndex((it) => it && it.id === 'pet_bunny') });
  await sleep(150);
  ok(a.inv.equip.pet && a.me.s.expMul >= 1.08 && a.me.look.pet === 'bunny', 'trang bị thú cưng tăng EXP');
  a.send('equip', { slot: a.inv.inv.findIndex((it) => it && it.id === 'w_kiem_11') });
  await sleep(150);
  ok(a.inv.equip.weapon.id === 'w_kiem_11', 'mặc vũ khí bậc Thánh cấp 110');
  a.send('chat', { ch: 'map', msg: '/plus 11' });
  ok(!!(await a.wait('chat', (m) => /Vũ khí \+11/.test(m.msg))), 'lệnh admin /plus đặt cấp cường hóa vũ khí');
}

module.exports = { endgameTest };
