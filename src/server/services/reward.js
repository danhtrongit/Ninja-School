'use strict';

// Trao phần thưởng { xu, luong, items: [[id, sl]], days } vào hành trang (điểm danh, vòng quay)
const { ITEMS } = require('../../shared/data/items');

// Không đủ chỗ thì báo và không trao gì. Trả về true khi đã trao. opt.bound: trao xu khóa và vật phẩm khóa
function giveReward(p, r, opt = {}) {
  const b = opt.bound ? 1 : 0;
  const items = r.items || [];
  const need = items.reduce((s, [id, q]) => s + (ITEMS[id].stack ? 1 : q), 0);
  if (p.freeSlots() < need) {
    p.notice(`Cần ${need} ô trống trong hành trang.`, 'warn');
    return false;
  }
  if (r.xu) { if (b) p.gainXuk(r.xu); else p.gainXu(r.xu); }
  if (r.luong) p.c.luong += r.luong;
  for (const [id, q] of items) p.addItem(id, q, 0, r.days || 0, b);
  p.markMe();
  return true;
}

function rewardLabel(r, bound) {
  const parts = [];
  if (r.xu) parts.push(`${r.xu.toLocaleString('vi-VN')} ${bound ? 'xu khóa' : 'xu'}`);
  if (r.luong) parts.push(`${r.luong} lượng`);
  for (const [id, q] of r.items || []) parts.push(`${ITEMS[id].name}${q > 1 ? ` x${q}` : ''}`);
  return parts.join(', ');
}

module.exports = { giveReward, rewardLabel };
