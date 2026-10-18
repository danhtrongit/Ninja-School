'use strict';

// Xu khóa (c.xuk) và cờ khóa vật phẩm (it.b): dọn dữ liệu cũ, gửi số dư cho máy khách.
// Luật khóa nằm ở từng module (shop, trade, gems...) và gọi hàm chung trong shared/bound.js
const { cleanBound, cleanXuk, canTransfer, isBound, bind } = require('../../../shared/bound');

module.exports = {
  name: 'bound',
  hooks: {
    // chạy sau mail (order 1) để dọn cả đồ đính kèm thư
    sanitize: {
      order: 2,
      fn(c) {
        c.xuk = cleanXuk(c.xuk);
        const eq = c.equip && typeof c.equip === 'object' ? Object.values(c.equip) : [];
        const mail = Array.isArray(c.mail) ? c.mail.flatMap((m) => (m && Array.isArray(m.items) ? m.items : [])) : [];
        for (const it of [...eq, ...(c.inv || []), ...(c.storage || []), ...(c.pending || []), ...mail]) cleanBound(it);
      },
    },
    selfData(p, d) { d.xuk = p.c.xuk || 0; },
  },
  canTransfer, isBound, bind,
};
