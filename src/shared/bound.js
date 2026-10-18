'use strict';

// Tiền khóa & vật phẩm khóa. it.b = 1: không chuyển được sang người chơi khác (giao dịch, ký gửi, thư người chơi, thả đất).
// Dùng chung cho lõi (core/player), module và kiểm thử; không require module nào.
const XUK_MAX = 2e9;

const isBound = (it) => !!(it && it.b);

function bind(it) {
  if (it && typeof it === 'object') it.b = 1;
  return it;
}

// Cùng chồng được: cùng loại và cùng trạng thái khóa (chồng khóa không gộp vào chồng thường)
const sameStack = (it, id, b) => !!it && it.id === id && !!it.b === !!b;

// Được chuyển cho người chơi khác: không khóa, không có hạn dùng
const canTransfer = (it) => !!it && !it.b && !it.exp;

// Chuẩn hóa cờ trên dữ liệu cũ hoặc bị sửa tay: chỉ giữ b = 1
function cleanBound(it) {
  if (!it || typeof it !== 'object') return it;
  if (it.b) it.b = 1;
  else delete it.b;
  return it;
}

const cleanXuk = (v) => Math.max(0, Math.min(XUK_MAX, Number.isFinite(+v) ? Math.floor(+v) : 0));

module.exports = { XUK_MAX, isBound, bind, sameStack, canTransfer, cleanBound, cleanXuk };
