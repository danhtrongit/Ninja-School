'use strict';

// Bảng vật phẩm dùng chung: các file loại vật phẩm thêm vào ITEMS theo thứ tự gọi trong index.js
// (thứ tự khóa của ITEMS là thứ tự gửi cho máy khách, giữ ổn định)
const ITEMS = {};
const add = (id, def) => { ITEMS[id] = def; };

const TIER_NAMES = ['Gỗ', 'Đồng', 'Sắt', 'Bạc', 'Vàng', 'Ngọc', 'Huyền', 'Long', 'Thiên', 'Thần', 'Tiên', 'Thánh'];
const TIER_LV = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const TIER_COLORS = ['#a0703c', '#c9803c', '#9aa4ad', '#dfe6ec', '#f2c230', '#3fd0a0', '#8a63e8', '#e8463c', '#5cc4ff', '#ff7ef0', '#fff176', '#ff4081'];
const TIERS = TIER_NAMES.length;
// Ô trang bị. Ngoài 9 ô chiến đấu (GEAR_SLOTS): 'pet' thú cưng và 4 ô thời trang (FASHION_SLOTS).
// Các ô này không rơi ngẫu nhiên, không bán ở lò rèn, không cường hóa. Nhân vật cũ thiếu ô thì coi như trống.
const GEAR_SLOTS = ['weapon', 'hat', 'armor', 'gloves', 'pants', 'shoes', 'necklace', 'ring', 'amulet'];
const FASHION_SLOTS = ['mask', 'cloak', 'costume', 'mount'];
const SLOTS = [...GEAR_SLOTS, 'pet', ...FASHION_SLOTS];
const SLOT_NAMES = {
  weapon: 'Vũ khí', hat: 'Nón', armor: 'Áo', gloves: 'Găng tay', pants: 'Quần',
  shoes: 'Giày', necklace: 'Dây chuyền', ring: 'Nhẫn', amulet: 'Ngọc bội', pet: 'Thú cưng',
  mask: 'Mặt nạ', cloak: 'Áo choàng', costume: 'Trang phục', mount: 'Thú cưỡi',
};
const RARITY = [
  { name: 'Thường', color: '#ffffff', opts: [0, 0] },
  { name: 'Tốt', color: '#5ab4ff', opts: [1, 2] },
  { name: 'Hiếm', color: '#ffd23c', opts: [2, 3] },
  { name: 'Sử thi', color: '#c77dff', opts: [3, 4] },
  { name: 'Huyền thoại', color: '#ff8a3c', opts: [4, 5] },
];
const STAT_LABELS = {
  atk: 'Tấn công', def: 'Phòng thủ', hp: 'Sinh lực', mp: 'Chakra', crit: 'Chí mạng %',
  dodge: 'Né tránh %', spd: 'Tốc chạy %', str: 'Sức mạnh', agi: 'Thân pháp', int: 'Chakra (điểm)', vit: 'Thể lực',
  skillDmg: 'ST kỹ năng %', hit: 'Chính xác', expPct: 'Kinh nghiệm %', hpPct: 'Sinh lực %', lifesteal: 'Hút máu %',
};

module.exports = { ITEMS, add, TIER_NAMES, TIER_LV, TIER_COLORS, TIERS, GEAR_SLOTS, FASHION_SLOTS, SLOTS, SLOT_NAMES, RARITY, STAT_LABELS };
