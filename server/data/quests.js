'use strict';

// Chuỗi nhiệm vụ chính (nhận và trả tại Trưởng Làng bất kỳ)
// kind: talk | kill (m, n) | collect (item, n) | level (n)
// reward.items: [[itemId, qty]] ; 'W' = vũ khí đúng phái theo tier
const MAIN_QUESTS = [
  { name: 'Nhập Môn Ninja', req: 1, kind: 'talk', desc: 'Gặp Trưởng Làng để nhập môn.', reward: { exp: 60, xu: 300, items: [['hat_0', 1], ['shoes_0', 1]] } },
  { name: 'Dọn Dẹp Slime', req: 1, kind: 'kill', m: 'slime', n: 8, desc: 'Tiêu diệt 8 Slime Xanh ngoài làng.', reward: { exp: 160, xu: 400, items: [['hp1', 15]] } },
  { name: 'Thỏ Phá Ruộng', req: 2, kind: 'kill', m: 'bunny', n: 10, desc: 'Tiêu diệt 10 Thỏ Rừng.', reward: { exp: 450, xu: 600, items: [['armor_0', 1], ['pants_0', 1]] } },
  { name: 'Thu Thập Nấm Độc', req: 4, kind: 'collect', item: 'nam_doc', n: 6, desc: 'Thu thập 6 Nấm Độc từ quái Nấm Độc.', reward: { exp: 900, xu: 900, luong: 2, items: [['mp1', 15], ['gloves_0', 1]] } },
  { name: 'Đột Phá Cấp 8', req: 6, kind: 'level', n: 8, desc: 'Luyện công đạt cấp 8. Hãy cộng điểm tiềm năng và kỹ năng!', reward: { exp: 600, xu: 1200, items: [['necklace_0', 1], ['ring_0', 1], ['amulet_0', 1]] } },
  { name: 'Khỉ Trúc Tinh Nghịch', req: 8, kind: 'kill', m: 'monkey', n: 12, desc: 'Đến Rừng Trúc (dùng Phu Xe nếu cần) tiêu diệt 12 Khỉ Trúc.', reward: { exp: 2400, xu: 1500, items: [['stone1', 5]] } },
  { name: 'Mật Ong Rừng', req: 9, kind: 'collect', item: 'mat_ong', n: 8, desc: 'Thu thập 8 Mật Ong từ Ong Bắp Cày.', reward: { exp: 3500, xu: 2000, items: [['hp2', 20]] } },
  { name: 'Trừng Trị Sơn Tặc', req: 11, kind: 'kill', m: 'bandit', n: 15, desc: 'Tiêu diệt 15 Sơn Tặc tại Rừng Trúc.', reward: { exp: 6000, xu: 3000, luong: 5, items: [['W1', 1]] } },
  { name: 'Vỏ Cua Cứng', req: 13, kind: 'collect', item: 'vo_cua', n: 10, desc: 'Thu thập 10 Vỏ Cua tại Bờ Biển San Hô.', reward: { exp: 9000, xu: 4000, items: [['armor_1', 1], ['pants_1', 1]] } },
  { name: 'Hải Tặc Xâm Lăng', req: 16, kind: 'kill', m: 'pirate', n: 20, desc: 'Đánh đuổi 20 Hải Tặc.', reward: { exp: 14000, xu: 5000, items: [['stone1', 10], ['mp2', 20]] } },
  { name: 'Hang Dơi Âm U', req: 19, kind: 'kill', m: 'bat', n: 20, desc: 'Tiêu diệt 20 Dơi Hang.', reward: { exp: 20000, xu: 6000, items: [['hat_1', 1], ['shoes_1', 1]] } },
  { name: 'Xương Cốt Hang Sâu', req: 22, kind: 'collect', item: 'xuong', n: 12, desc: 'Thu thập 12 Xương Cũ từ Bộ Xương.', reward: { exp: 28000, xu: 8000, luong: 5, items: [['W2', 1]] } },
  { name: 'Diệt Dơi Chúa', req: 25, kind: 'kill', m: 'boss_bat', n: 1, desc: 'Cùng đồng đội tiêu diệt boss Dơi Chúa tại Hang Dơi.', reward: { exp: 50000, xu: 15000, luong: 10, items: [['chest', 3]] } },
  { name: 'Cát Vàng Sa Mạc', req: 26, kind: 'collect', item: 'cat_vang', n: 12, desc: 'Thu thập 12 Cát Vàng từ Bọ Cạp Cát.', reward: { exp: 45000, xu: 12000, items: [['stone2', 3], ['hp3', 20]] } },
  { name: 'Sói Xám Hung Tợn', req: 32, kind: 'collect', item: 'long_soi', n: 15, desc: 'Thu thập 15 Lông Sói tại Thung Lũng Sương.', reward: { exp: 70000, xu: 18000, items: [['armor_3', 1], ['W3', 1]] } },
  { name: 'Ninja Lang Thang', req: 38, kind: 'kill', m: 'rogue', n: 25, desc: 'Đánh bại 25 Ninja Lang Thang.', reward: { exp: 100000, xu: 25000, luong: 10, items: [['stone2', 6]] } },
  { name: 'Lang Vương', req: 42, kind: 'kill', m: 'boss_wolf', n: 1, desc: 'Hạ gục Lang Vương tại Thung Lũng Sương.', reward: { exp: 150000, xu: 40000, luong: 15, items: [['chest', 5]] } },
  { name: 'Tinh Thể Băng', req: 50, kind: 'collect', item: 'tinh_the_bang', n: 15, desc: 'Thu thập 15 Tinh Thể Băng tại Đỉnh Băng Giá.', reward: { exp: 220000, xu: 50000, items: [['W5', 1], ['stone3', 3]] } },
  { name: 'Sừng Quỷ Đỏ', req: 60, kind: 'collect', item: 'sung_quy', n: 20, desc: 'Thu thập 20 Sừng Quỷ tại Rừng Ma.', reward: { exp: 350000, xu: 80000, luong: 20, items: [['W6', 1], ['stone3', 5]] } },
  { name: 'Quỷ Vương', req: 80, kind: 'kill', m: 'boss_oni', n: 1, desc: 'Tiêu diệt Quỷ Vương tại Hang Quỷ.', reward: { exp: 800000, xu: 200000, luong: 50, items: [['W8', 1], ['chest', 10]] } },
  { name: 'Ma Thần Diệt Thế', req: 95, kind: 'kill', m: 'boss_god', n: 1, desc: 'Đánh bại Ma Thần tại Cổng Địa Ngục, trở thành Ninja huyền thoại!', reward: { exp: 2000000, xu: 500000, luong: 100, items: [['W9', 1]] } },
];

const DAILY = {
  max: 20,
  count: (lv) => 15 + Math.min(25, Math.floor(lv / 4)),
  reward: (lv) => ({ exp: Math.round((10 + lv * 8) * (12 + lv * 0.3)), xu: 200 + lv * 60, luong: 1 }),
};

module.exports = { MAIN_QUESTS, DAILY };
