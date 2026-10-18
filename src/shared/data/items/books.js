'use strict';

const { CLASSES } = require('../classes');
const { SKILLS } = require('../skills');
const { add } = require('./base');

// Sách kỹ năng nội tại: đọc để học cấp 1 (id = book_<mã kỹ năng>). Giá lượng và màu bìa theo cấp yêu cầu.
// Bìa tránh tông tím của Bí Kíp Nhân Đôi; icon.s 'pas' vẽ thêm huy hiệu nội tại.
const BOOK_GRADE = { 15: [30, '#5ab4ff'], 35: [60, '#e5484d'], 50: [100, '#ffb02e'] };
const BOOKS = [];

function build() {
  for (const sid of Object.keys(SKILLS)) {
    const sk = SKILLS[sid];
    if (sk.type !== 'passive') continue;
    const [luong, c] = BOOK_GRADE[sk.req] || BOOK_GRADE[50];
    add(sk.book, {
      name: `Sách ${sk.name}`, type: 'book', lv: sk.req, cls: sk.cls, skill: sid, priceLuong: luong, price: sk.req * 200, stack: 999,
      icon: { k: 'book', c, s: 'pas' }, desc: `Đọc để học kỹ năng nội tại ${sk.name} (phái ${CLASSES[sk.cls].name}).`,
    });
    BOOKS.push(sk.book);
  }
}

module.exports = { build, BOOKS };
