'use strict';

// Tiện ích dùng chung cho lõi và các module
// chỉ nhận số/chuỗi: đối tượng từ gói JSON ({ toString: 1 }...) làm phép ép kiểu ném lỗi
const prim = (v) => typeof v === 'number' || typeof v === 'string';
const int = (v, d = 0) => (prim(v) && Number.isFinite(+v) ? Math.floor(+v) : d);
const clean = (s, n) => (prim(s) ? String(s) : '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Ngoại hình / trạng thái người chơi đổi: báo cả bản đồ
function refreshInfo(p) {
  if (p.map) p.map.broadcast('pInfo', p.info());
}

module.exports = { int, clean, own, refreshInfo };
