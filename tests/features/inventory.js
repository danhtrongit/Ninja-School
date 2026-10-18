'use strict';

// Hành trang: mở rộng bằng lượng, hủy nhanh nhiều món
const { sleep, ok } = require('../lib/harness');
const { INV_SIZE, INV_EXPAND, invSize, USE_MANY } = require('../../src/shared/constants');

function bagUnitTests() {
  console.log('Hành trang (kiểm tra đơn vị): số ô theo lần mở rộng, hủy nhanh khi đang giao dịch');
  const { Inventory } = require('../../src/server/modules/inventory');
  const inv = [{ id: 'hp1', q: 3 }, { id: 'mp1', q: 2 }];
  const p = { trade: { with: 2 }, c: { inv }, markInv() {}, notice() {}, onInventoryChanged() {} };
  Inventory.prototype.discardMany.call({ world: {} }, p, { items: [[0, 'hp1'], [1, 'mp1']] });
  const kept = !!(inv[0] && inv[1]);
  p.trade = null;
  Inventory.prototype.discardMany.call({ world: {} }, p, { items: [[0, 'hp1'], [1, 'mp1']] });
  ok(kept && !inv[0] && !inv[1], 'hủy nhanh bị chặn khi đang giao dịch (túi giữ nguyên), hết giao dịch thì hủy được');
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
  // mở rộng tới tối đa (6 lần × 10 ô), lần thứ 7 báo tối đa và không trừ lượng
  a.send('chat', { ch: 'map', msg: '/luong 5000' });
  await a.wait('chat', (m) => /\+5000 lượng/.test(m.msg));
  for (let k = slots(); k < INV_SIZE + INV_EXPAND.step * INV_EXPAND.cost.length; k += INV_EXPAND.step) { a.send('invExpand'); await sleep(150); }
  await sleep(200);
  const l7 = a.me.luong;
  const from7 = a.msgs.length;
  a.send('invExpand');
  await sleep(250);
  ok(slots() === INV_SIZE + INV_EXPAND.step * INV_EXPAND.cost.length && a.me.luong === l7 && a.msgs.slice(from7).some((m) => m.t === 'notice' && /mở rộng tối đa/.test(m.msg)), `lần mở rộng thứ ${INV_EXPAND.cost.length + 1} báo đã tối đa, không trừ lượng (${slots()} ô)`);

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

// Dùng nhiều: rương mở n lần báo một dòng, đồ ăn/bí kíp cộng dồn thời gian có trần, n rác thành 1
async function useManyTest(a) {
  console.log('Hành trang: dùng nhiều (rương, đồ ăn, bí kíp nhân đôi)');
  const count = (id) => a.inv.inv.reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0);
  // chồng lớn nhất của món (rương mở ra có thể tạo chồng nhỏ riêng)
  const at = (id) => a.inv.inv.reduce((b, it, i) => (it && it.id === id && (b < 0 || it.q > a.inv.inv[b].q) ? i : b), -1);
  const use = async (id, n, re) => {
    const from = a.msgs.length;
    a.send('useItem', { slot: at(id), n });
    // chờ thông báo thay vì ngủ cố định: máy tải cao thì 250 ms chưa đủ cho 50 lượt mở rương
    await a.wait('notice', (m) => !re || re.test(m.msg), 3000).catch(() => null);
    await sleep(150);
    return a.msgs.slice(from).filter((m) => m.t === 'notice' && (!re || re.test(m.msg)));
  };
  a.send('chat', { ch: 'map', msg: '/item chest 8' });
  await a.wait('chat', (m) => /chest|Rương/.test(m.msg)).catch(() => null);
  await sleep(200);
  const c0 = count('chest');
  ok(c0 >= 8, `nhận 8 rương để thử (${c0})`);
  const n5 = await use('chest', 5);
  ok(count('chest') === c0 - 5 && n5.length === 1 && /^Mở 5 Rương Báu nhận: /.test(n5[0].msg), `dùng nhiều 5 rương: trừ đúng 5, gộp thành một thông báo (${n5[0] && n5[0].msg})`);
  await use('chest', 'abc');
  ok(count('chest') === c0 - 6, 'số lượng không phải số thì chỉ dùng 1');
  await use('chest', -4);
  ok(count('chest') === c0 - 7, 'số lượng âm thì chỉ dùng 1');
  const c7 = count('chest');
  const q7 = a.inv.inv[at('chest')].q;
  const big = await use('chest', 9999, /^Mở /);
  const k = Math.min(USE_MANY.max, q7);
  ok(count('chest') === c7 - k && big.length === 1 && (k > 1 ? big[0].msg.startsWith(`Mở ${k} `) : big[0].msg.startsWith('Mở rương nhận')), `số lượng quá lớn bị chặn ở ${USE_MANY.max} và số món đang có (${big[0] && big[0].msg.slice(0, 40)})`);

  a.send('chat', { ch: 'map', msg: '/item food_hp 5' });
  await sleep(250);
  const f0 = count('food_hp');
  const fn = await use('food_hp', 3, /Canh Nhân Sâm/);
  const buff = (k) => (a.me.buffs || []).find((b) => b.k === k);
  const fb = buff('food_hp');
  ok(count('food_hp') === f0 - 3 && fn.length === 1 && /Dùng 3 Canh Nhân Sâm/.test(fn[0].msg), `dùng nhiều 3 đồ ăn: trừ 3, một thông báo (${fn[0] && fn[0].msg})`);
  ok(!!fb && fb.until - Date.now() > 85 * 60000, 'đồ ăn dùng nhiều cộng dồn thời gian hiệu ứng (≥ 85 phút)');

  a.send('chat', { ch: 'map', msg: '/item exp2 60' });
  await sleep(250);
  const e0 = count('exp2');
  const en = await use('exp2', 50);
  const used = e0 - count('exp2');
  const cap = USE_MANY.buffCap / (30 * 60000);
  ok(used >= 1 && used <= cap && en.some((m) => /cộng dồn tối đa 24 giờ/.test(m.msg)), `bí kíp nhân đôi dừng ở trần 24 giờ (dùng ${used}/50, tối đa ${cap})`);
  const until = a.msgs.filter((m) => m.t === 'me').pop();
  const eb = (until && until.buffs || []).find((b) => b.k === 'exp2');
  ok(!!eb && eb.until - Date.now() <= USE_MANY.buffCap + 5000, 'thời gian nhân đôi không vượt trần');
}

module.exports = { bagUnitTests, bagTest, useManyTest };
