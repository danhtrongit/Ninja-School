'use strict';

// Tiện ích dùng chung cho lõi và các module
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Ngoại hình / trạng thái người chơi đổi: báo cả bản đồ
function refreshInfo(p) {
  if (p.map) p.map.broadcast('pInfo', p.info());
}

module.exports = { int, clean, own, refreshInfo };
