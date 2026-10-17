'use strict';

// Quà điểm danh 7 ngày (lặp lại)
const CHECKIN = [
  { xu: 2000, items: [['hp2', 5]] },
  { xu: 3000, items: [['stone1', 3]] },
  { luong: 2, items: [['mp2', 5]] },
  { xu: 5000, items: [['chest', 1]] },
  { luong: 3, items: [['stone1', 5]] },
  { xu: 8000, items: [['exp2', 1]] },
  { luong: 10, items: [['chest', 2], ['charm', 1]] },
];

// Vòng quay may mắn: w = trọng số khi quay bằng xu, wl = trọng số khi quay bằng lượng
const WHEEL = {
  cost: { xu: 10000, luong: 2 },
  prizes: [
    { label: '3.000 xu', xu: 3000, w: 28, wl: 6, c: '#ffd54f' },
    { label: '10 bình HP', items: [['hp2', 10]], w: 16, wl: 10, c: '#ef5350' },
    { label: '3 đá Sơ', items: [['stone1', 3]], w: 16, wl: 12, c: '#90caf9' },
    { label: '15.000 xu', xu: 15000, w: 10, wl: 14, c: '#ffb300' },
    { label: 'Bí kíp x2', items: [['exp2', 1]], w: 9, wl: 14, c: '#ab47bc' },
    { label: '1 đá Trung', items: [['stone2', 1]], w: 8, wl: 14, c: '#ce93d8' },
    { label: 'Rương báu', items: [['chest', 1]], w: 7, wl: 14, c: '#ff8f00' },
    { label: '3 lượng', luong: 3, w: 4, wl: 10, c: '#80deea' },
    { label: 'Bùa bảo hộ', items: [['charm', 1]], w: 2, wl: 5, c: '#fff176' },
    { label: '20 lượng', luong: 20, w: 0.3, wl: 1, c: '#00e5ff' },
  ],
};

module.exports = { CHECKIN, WHEEL };
