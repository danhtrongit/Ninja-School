'use strict';

// Nhân vật mẫu cho kiểm thử lưu trữ: hậu kỳ (cấp 120, túi 120 ô + kho 60 ô đồ có dòng chỉ số và ngọc, thư, bạn bè)
const { newChar } = require('../../src/server/core/player');
const { ITEMS, makeItem } = require('../../src/shared/data/items');

const CLS = ['kiem', 'tieu', 'kunai', 'cung', 'dao', 'quat'];
const GEAR = Object.keys(ITEMS).filter((id) => ITEMS[id].slot && ITEMS[id].slot !== 'pet');

function lateChar(name, i = 0) {
  const c = newChar(name, CLS[i % 6], i % 2 ? 'f' : 'm');
  const it = (k) => ({ ...makeItem(GEAR[(i + k) % GEAR.length], 1), p: k % 16, r: k % 4, o: [['atk', 120 + k], ['hp', 900], ['crit', 12], ['def', 80], ['spd', 5]], gems: ['gem_hoa_3', 'gem_loi_2', null] });
  c.level = 120;
  c.xu = 1000000 + i;
  c.invExt = 80;
  c.inv = Array.from({ length: 120 }, (_, k) => it(k));
  c.storage = Array.from({ length: 60 }, (_, k) => it(k + 7));
  c.friends = Array.from({ length: 30 }, (_, k) => `Ban${(i + k) % 5000}`);
  c.mail = Array.from({ length: 20 }, (_, k) => ({ id: k + 1, at: 1760000000000 + k, from: 'Hệ thống', title: `Thư ${k}`, body: 'Phần thưởng hằng ngày của ngươi đây.', xu: 0, xuk: 100, luong: 0, items: [], read: true, got: true }));
  return c;
}

module.exports = { lateChar, CLS };
