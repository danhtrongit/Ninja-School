'use strict';

const { ITEMS } = require('./base');

// Thời trang & thú cưỡi: chỉ số nhỏ, đổi ngoại hình (look = mã hình trong sprites.js), grade = độ hiếm hiển thị.
// luong = giá ở cửa hàng lượng (0 = không bán, chỉ ra từ rương/vòng quay với hạn FASHION_DAYS ngày).
// Thú cưỡi: spd cộng riêng ngoài trần 60% của trang bị (xem Player.recalc).
const FASHION_DAYS = 7;
// màu icon theo mã hình (mặt nạ tự có bảng màu riêng trong icons.js)
const FASHION_COLOR = {
  fox: '#f6f2ea', oni: '#d32f2f', tengu: '#d32f2f', wind: '#2e9d8f', night: '#3a3f86', flame: '#c62828', snow: '#dfe9f2',
  sakura: '#f48fb1', ocean: '#1e88e5', shadow: '#4a4a5c', dragon: '#c0262a',
  horse: '#8a5634', wolf: '#8e9aab', crane: '#f6f4ef', tiger: '#f1ece2', qilin: '#2e9e83',
};
const FASHION = [
  ['mask_fox', 'Mặt Nạ Hồ Ly', 'mask', 'fox', 2, 10, { expPct: 5, crit: 1 }, 40],
  ['mask_oni', 'Mặt Nạ Quỷ Đỏ', 'mask', 'oni', 3, 30, { atk: 60, crit: 2 }, 90],
  ['mask_tengu', 'Mặt Nạ Thiên Cẩu', 'mask', 'tengu', 4, 50, { expPct: 8, atk: 100, dodge: 2 }, 0],
  ['cloak_wind', 'Áo Choàng Phong Vân', 'cloak', 'wind', 1, 10, { dodge: 1, hp: 150 }, 30],
  ['cloak_night', 'Áo Choàng Dạ Ảnh', 'cloak', 'night', 2, 20, { def: 30, hpPct: 3 }, 60],
  ['cloak_flame', 'Áo Choàng Xích Diễm', 'cloak', 'flame', 3, 40, { atk: 80, hpPct: 4 }, 120],
  ['cloak_snow', 'Áo Choàng Tuyết Hồ', 'cloak', 'snow', 4, 60, { def: 80, hpPct: 6, expPct: 5 }, 0],
  ['costume_sakura', 'Y Phục Anh Đào', 'costume', 'sakura', 2, 1, { expPct: 5, hp: 100 }, 50],
  ['costume_ocean', 'Hải Lam Y', 'costume', 'ocean', 2, 1, { expPct: 5, mp: 100 }, 50],
  ['costume_shadow', 'Dạ Hành Phục', 'costume', 'shadow', 3, 20, { expPct: 5, atk: 40, dodge: 2 }, 100],
  ['costume_dragon', 'Long Bào Kim Tuyến', 'costume', 'dragon', 4, 40, { expPct: 10, hpPct: 5, atk: 80 }, 0],
  ['mount_horse', 'Ngựa Hồng Tông', 'mount', 'horse', 1, 10, { spd: 15 }, 50],
  ['mount_wolf', 'Sói Ngân Nguyệt', 'mount', 'wolf', 2, 20, { spd: 20, atk: 40 }, 120],
  ['mount_crane', 'Hạc Tiên Vân Du', 'mount', 'crane', 3, 35, { spd: 25, dodge: 2, mp: 200 }, 250],
  ['mount_tiger', 'Bạch Hổ Sơn Quân', 'mount', 'tiger', 3, 50, { spd: 28, atk: 90, crit: 2 }, 400],
  ['mount_qilin', 'Kỳ Lân Hỏa Vân', 'mount', 'qilin', 4, 70, { spd: 35, atk: 150, hp: 600 }, 0],
];
const FASHION_DESC = {
  mask: 'Mặt nạ thời trang, che mặt khi đeo.',
  cloak: 'Áo choàng thời trang, tung bay theo bước chạy.',
  costume: 'Trang phục thời trang, thay ngoại hình áo và quần.',
  mount: 'Thú cưỡi: tăng tốc chạy khi cưỡi, không tính vào giới hạn 60% tốc chạy của trang bị.',
};

function build() {
  for (const [id, name, slot, look, grade, lv, stats, luong] of FASHION) {
    ITEMS[id] = {
      name, type: 'equip', slot, tier: 0, lv, stats, look, grade, fashion: true, noUpgrade: true,
      priceLuong: luong || undefined, price: 0,
      icon: { k: slot, c: FASHION_COLOR[look], s: look },
      desc: `${FASHION_DESC[slot]}${luong ? '' : ' Chỉ có từ Rương Báu và Vòng Quay May Mắn (hạn 7 ngày).'}`,
    };
  }
}

const FASHION_SHOP = FASHION.filter((f) => f[7] > 0).map((f) => f[0]);
// Rương/vòng quay: món hiếm ra ít hơn (trọng số theo grade)
const FASHION_POOL = FASHION.map((f) => [f[0], [0, 6, 4, 2, 1][f[4]]]);
function rollFashion() {
  const total = FASHION_POOL.reduce((s, x) => s + x[1], 0);
  let r = Math.random() * total;
  for (const [id, w] of FASHION_POOL) {
    r -= w;
    if (r < 0) return id;
  }
  return FASHION_POOL[0][0];
}

module.exports = { build, FASHION, FASHION_DAYS, FASHION_SHOP, rollFashion };
