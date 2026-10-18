'use strict';

// Hành trang: mở rộng bằng lượng, hủy nhanh nhiều món
const { sleep, ok } = require('../lib/harness');
const { INV_SIZE, INV_EXPAND, invSize } = require('../../src/shared/constants');

function bagUnitTests() {
  console.log('Hành trang (kiểm tra đơn vị): số ô theo lần mở rộng');
  ok(invSize({}) === INV_SIZE && invSize({ invExt: 2 }) === INV_SIZE + 2 * INV_EXPAND.step, 'số ô = gốc + bước × số lần mở rộng');
  ok(invSize({ invExt: 999 }) === INV_SIZE + INV_EXPAND.step * INV_EXPAND.cost.length && invSize({ invExt: -3 }) === INV_SIZE && invSize({ invExt: '5' }) === INV_SIZE, 'số lần mở rộng hỏng bị chặn trong giới hạn');
}

async function bagTest(a) {
  console.log('Hành trang: mở rộng bằng lượng, hủy nhanh nhiều món');
  const slots = () => a.inv.inv.length;
  const n0 = slots();
  a.send('chat', { ch: 'map', msg: '/luong 500' });
  await a.wait('chat', (m) => /\+500 lượng/.test(m.msg));
  await sleep(150);
  const l0 = a.me.luong;
  a.send('invExpand');
  await sleep(250);
  ok(slots() === n0 + INV_EXPAND.step && a.me.luong === l0 - INV_EXPAND.cost[(n0 - INV_SIZE) / INV_EXPAND.step], 'mở rộng hành trang trừ đúng lượng, thêm ô trống');

  a.send('chat', { ch: 'map', msg: '/item food_atk 2' });
  a.send('chat', { ch: 'map', msg: '/item w_kiem_11 1' });
  a.send('chat', { ch: 'map', msg: '/item food_def 1' });
  await sleep(300);
  const at = (id) => a.inv.inv.findIndex((it) => it && it.id === id);
  const sAtk = at('food_atk');
  const sW = a.inv.inv.findLastIndex((it) => it && it.id === 'w_kiem_11');
  const sDef = at('food_def');
  ok(sAtk >= 0 && sW >= 0 && sDef >= 0, 'nhận đủ vật phẩm để thử hủy');
  // id sai (túi đã đổi chỗ) thì không hủy
  a.send('discardMany', { items: [[sDef, 'food_atk']] });
  await sleep(200);
  ok(at('food_def') === sDef, 'hủy nhanh bỏ qua ô có id không khớp');
  const before = a.inv.inv.filter(Boolean).length;
  a.send('discardMany', { items: [[sAtk, 'food_atk'], [sW, 'w_kiem_11'], [sAtk, 'food_atk'], ['x', 'y'], [9999, 'food_atk'], 'rác'] });
  await sleep(250);
  ok(!a.inv.inv[sAtk] && !a.inv.inv[sW] && a.inv.inv[sDef] && a.inv.inv.filter(Boolean).length === before - 2, 'hủy nhanh đúng các món đã chọn, bỏ qua dữ liệu rác');
  a.send('discardMany', { items: 'x' });
  a.send('discardMany', {});
  await sleep(150);
  ok(a.inv.inv[sDef], 'gói hủy nhanh sai kiểu không làm hỏng túi');
}

module.exports = { bagUnitTests, bagTest };
