'use strict';

// Nội dung hậu kỳ: cấp 120, tuyệt kỹ, đồ ăn, thú cưng, vũ khí bậc Thánh, bản đồ mới.
const { sleep, ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');

// Đồ ăn (buff lưu c.buffs) trên thế giới giả: cộng đúng % chỉ số, hết hạn thì móc playerSecond của module buffs gỡ
function foodBuffUnitTests() {
  console.log('7a. Buff đồ ăn (thế giới giả)');
  const { Player, newChar } = require('../../src/server/core/player');
  const { Inventory } = require('../../src/server/modules/inventory');
  const buffs = require('../../src/server/modules/buffs');
  const { makeItem } = require('../../src/shared/data/items');
  const { PERSIST_BUFFS } = require('../../src/shared/constants');
  const world = { nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; }, social: { handle() {} } };
  const sent = [];
  const p = new Player(world, { send: (t, d) => sent.push([t, d]) }, newChar('fbunit', 'kiem', 'm'));
  const inv = new Inventory(world);
  p.c.level = 60;
  p.recalc();
  // tấn công/phòng thủ/sinh lực trước khi nhân %: lấy từ công thức recalc khi buff = 0
  const raw = { ...p.s };
  const eat = (id) => {
    p.c.inv[5] = makeItem(id, 1);
    inv.useItem(p, { slot: 5 });
  };
  eat('food_atk');
  const left = p.c.buffs.food_atk - Date.now();
  ok(PERSIST_BUFFS.food_atk[1] === 10 && Math.abs(p.s.atk - raw.atk * 1.1) <= 1 && p.s.def === raw.def && !p.c.inv[5]
    && left > 29 * 60000 && left <= 30 * 60000,
  `Bánh Bao Sức Mạnh: tấn công +10% đúng (${raw.atk} → ${p.s.atk}), 30 phút, tiêu hao món ăn`);
  eat('food_def');
  eat('food_hp');
  ok(Math.abs(p.s.def - raw.def * 1.1) <= 1 && Math.abs(p.s.maxHp - raw.maxHp * 1.1) <= 1 && Math.abs(p.s.atk - raw.atk * 1.1) <= 1,
    `Trà Thiết Bích +10% phòng thủ (${raw.def} → ${p.s.def}), Canh Nhân Sâm +10% sinh lực (${raw.maxHp} → ${p.s.maxHp}), cộng dồn với buff tấn công`);
  const second = buffs.hooks.playerSecond.fn;
  // đồng hồ giả: còn hạn thì giữ nguyên
  second.call(buffs, p, Date.now() + 60000);
  ok(p.c.buffs.food_atk && p.c.buffs.food_def && p.c.buffs.food_hp, 'playerSecond: buff đồ ăn còn hạn thì giữ nguyên');
  // hết hạn: đặt mốc hết hạn về quá khứ rồi chạy móc (recalc dùng giờ thật nên buff phải bị xóa khỏi c.buffs mới mất)
  p.c.buffs.food_atk = Date.now() - 1;
  sent.length = 0;
  second.call(buffs, p, Date.now());
  ok(!('food_atk' in p.c.buffs) && p.s.atk === raw.atk && p.c.buffs.food_def && Math.abs(p.s.def - raw.def * 1.1) <= 1
    && sent.some(([t, d]) => t === 'notice' && /Hiệu lực món ăn đã hết/.test(d.msg)),
  'playerSecond: món ăn hết hạn tự gỡ, tấn công về như cũ, báo "Hiệu lực món ăn đã hết", buff khác còn hạn giữ nguyên');
  p.c.buffs.food_def = Date.now() - 1;
  p.c.buffs.food_hp = Date.now() - 1;
  second.call(buffs, p, Date.now());
  ok(!Object.keys(p.c.buffs).length && p.s.def === raw.def && p.s.maxHp === raw.maxHp, 'playerSecond: hết hạn cả hai buff còn lại, chỉ số về gốc');
}

async function endgameTest(ctx) {
  const { a } = ctx;
  foodBuffUnitTests();
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

module.exports = { endgameTest, foodBuffUnitTests };
