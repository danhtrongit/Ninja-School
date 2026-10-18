'use strict';

// Chuỗi nhiệm vụ chính (nhận và trả tại Trưởng Làng bất kỳ), cấp 1 → 120
// kind: talk | kill (m, n) | collect (item, n) | level (n) | visit (map) | upgrade (n = cấp cường hóa) | dungeon (n lượt hoàn thành)
// reward.items: [[itemId, qty]] ; 'W<tier>' = vũ khí đúng phái
const expNeed = (lv) => Math.floor(20 * lv * lv + 80 * lv);

// q(tên, cấp yêu cầu, loại, mục tiêu, số lượng, mô tả, vật phẩm thưởng, lượng, hệ số exp)
function q(name, req, kind, target, n, desc, items = [], luong = 0, expF = 0.6) {
  const quest = { name, req, kind, n, desc, reward: { exp: Math.round(expNeed(req) * expF), xu: 200 + req * req * 8, luong, items } };
  if (kind === 'kill') quest.m = target;
  if (kind === 'collect') quest.item = target;
  if (kind === 'visit') quest.map = target;
  return quest;
}

const MAIN_QUESTS = [
  q('Nhập Môn Ninja', 1, 'talk', null, 1, 'Gặp Trưởng Làng để nhập môn.', [['hat_0', 1], ['shoes_0', 1]], 0, 0.6),
  q('Dọn Dẹp Slime', 1, 'kill', 'slime', 8, 'Tiêu diệt 8 Slime Xanh ngoài làng.', [['hp1', 15]], 0, 1.5),
  q('Thỏ Phá Ruộng', 2, 'kill', 'bunny', 10, 'Tiêu diệt 10 Thỏ Rừng.', [['armor_0', 1], ['pants_0', 1]], 0, 1.2),
  q('Thu Thập Nấm Độc', 4, 'collect', 'nam_doc', 6, 'Thu thập 6 Nấm Độc từ quái Nấm Độc.', [['mp1', 15], ['gloves_0', 1]], 2, 1.0),
  q('Đột Phá Cấp 8', 6, 'level', null, 8, 'Luyện công đạt cấp 8. Hãy cộng điểm tiềm năng và kỹ năng!', [['necklace_0', 1], ['ring_0', 1], ['amulet_0', 1]], 0, 0.5),
  q('Lò Rèn Đầu Tiên', 7, 'upgrade', null, 2, 'Gặp Thợ Rèn cường hóa một trang bị đang mặc lên +2.', [['stone1', 6]], 1, 0.5),
  q('Khỉ Trúc Tinh Nghịch', 8, 'kill', 'monkey', 12, 'Đến Rừng Trúc (dùng Phu Xe nếu cần) tiêu diệt 12 Khỉ Trúc.', [['stone1', 5]], 0, 0.8),
  q('Mật Ong Rừng', 9, 'collect', 'mat_ong', 8, 'Thu thập 8 Mật Ong từ Ong Bắp Cày ở Rừng Trúc.', [['hp2', 20]], 0, 0.8),
  q('Thử Thách Hang Động', 10, 'dungeon', null, 1, 'Gặp Hộ Pháp trong làng, vượt qua Hang Động Thử Thách một lần.', [['chest', 1]], 3, 0.8),
  q('Trừng Trị Sơn Tặc', 11, 'kill', 'bandit', 15, 'Tiêu diệt 15 Sơn Tặc tại Rừng Trúc.', [['W1', 1]], 5, 0.8),
  q('Vua Slime', 12, 'kill', 'boss_slime', 1, 'Hạ gục boss Vua Slime ở giữa Rừng Trúc.', [['chest', 2]], 5, 1.0),
  q('Vỏ Cua Cứng', 13, 'collect', 'vo_cua', 10, 'Thu thập 10 Vỏ Cua tại Bờ Biển San Hô.', [['armor_1', 1], ['pants_1', 1]], 0, 0.7),
  q('Vườn Anh Đào', 14, 'visit', 'sakura_garden', 1, 'Tìm cánh cửa bí mật ở phía đông Rừng Trúc dẫn vào Vườn Anh Đào.', [['food_atk', 2]], 0, 0.4),
  q('Cánh Hoa Tiên', 15, 'collect', 'canh_hoa', 10, 'Thu thập 10 Cánh Hoa Tiên từ Hoa Tiên Tử.', [['hat_1', 1], ['shoes_1', 1]], 0, 0.7),
  q('Hải Tặc Xâm Lăng', 16, 'kill', 'pirate', 20, 'Đánh đuổi 20 Hải Tặc ở Bờ Biển San Hô.', [['stone1', 10], ['mp2', 20]], 0, 0.7),
  q('Hang Dơi Âm U', 19, 'kill', 'bat', 20, 'Tiêu diệt 20 Dơi Hang.', [['gloves_1', 1], ['ring_1', 1]], 0, 0.7),
  q('Cửu Vĩ Hồ', 21, 'kill', 'boss_fox', 1, 'Cùng đồng đội hạ boss Cửu Vĩ Hồ tại Vườn Anh Đào.', [['chest', 2], ['necklace_1', 1]], 8, 1.0),
  q('Xương Cốt Hang Sâu', 22, 'collect', 'xuong', 12, 'Thu thập 12 Xương Cũ từ Bộ Xương ở Hang Dơi.', [['W2', 1]], 5, 0.7),
  q('Cường Hóa +5', 23, 'upgrade', null, 5, 'Cường hóa một trang bị đang mặc lên +5.', [['stone2', 3], ['charm', 1]], 3, 0.5),
  q('Diệt Dơi Chúa', 25, 'kill', 'boss_bat', 1, 'Tiêu diệt boss Dơi Chúa tại Hang Dơi.', [['chest', 3]], 10, 1.0),
  q('Cát Vàng Sa Mạc', 26, 'collect', 'cat_vang', 12, 'Thu thập 12 Cát Vàng từ Bọ Cạp Cát ở Hoang Mạc.', [['stone2', 3], ['hp3', 20]], 0, 0.7),
  q('Đạo Tặc Sa Mạc', 29, 'kill', 'sandbandit', 20, 'Đánh bại 20 Đạo Tặc Sa Mạc.', [['armor_2', 1], ['pants_2', 1]], 0, 0.6),
  q('Lông Sói Xám', 32, 'collect', 'long_soi', 15, 'Thu thập 15 Lông Sói tại Thung Lũng Sương.', [['armor_3', 1], ['W3', 1]], 0, 0.6),
  q('Phế Tích Cổ', 34, 'visit', 'ancient_ruins', 1, 'Tìm lối vào Phế Tích Cổ ở giữa Hoang Mạc Cát.', [['food_def', 3]], 0, 0.3),
  q('Mảnh Tượng Đá', 35, 'collect', 'manh_tuong', 12, 'Thu thập 12 Mảnh Tượng Đá từ Tượng Đá Cổ.', [['hat_3', 1], ['shoes_3', 1]], 0, 0.6),
  q('Ninja Lang Thang', 38, 'kill', 'rogue', 25, 'Đánh bại 25 Ninja Lang Thang ở Thung Lũng Sương.', [['stone2', 6]], 10, 0.6),
  q('Pharaoh Phục Sinh', 40, 'kill', 'boss_pharaoh', 1, 'Phong ấn lại Pharaoh Phục Sinh trong Phế Tích Cổ.', [['chest', 4], ['W4', 1]], 12, 1.0),
  q('Lang Vương', 42, 'kill', 'boss_wolf', 1, 'Hạ gục Lang Vương tại Thung Lũng Sương.', [['chest', 5]], 15, 1.0),
  q('Người Tuyết Nổi Giận', 43, 'kill', 'snowman', 25, 'Tiêu diệt 25 Người Tuyết trên Núi Tuyết.', [['armor_4', 1], ['pants_4', 1]], 0, 0.6),
  q('Hang Động Tinh Anh', 45, 'dungeon', null, 3, 'Vượt qua Hang Động Thử Thách thêm 3 lần nữa.', [['chest', 3], ['exp2', 2]], 10, 0.8),
  q('Bạch Viên Núi Tuyết', 48, 'kill', 'yeti', 25, 'Tiêu diệt 25 Bạch Viên.', [['hat_4', 1], ['shoes_4', 1], ['gloves_4', 1]], 0, 0.6),
  q('Tinh Thể Băng', 50, 'collect', 'tinh_the_bang', 15, 'Thu thập 15 Tinh Thể Băng tại Đỉnh Băng Giá.', [['W5', 1], ['stone3', 3]], 0, 0.6),
  q('Hang Pha Lê', 56, 'visit', 'crystal_cave', 1, 'Tìm cửa vào Hang Pha Lê ở phía đông Đỉnh Băng Giá.', [['food_hp', 3]], 0, 0.3),
  q('Tinh Thể Tím', 58, 'collect', 'tinh_the_tim', 15, 'Thu thập 15 Tinh Thể Tím từ Pha Lê Nhân.', [['armor_5', 1], ['pants_5', 1]], 0, 0.6),
  q('Tuyết Quái Vương', 60, 'kill', 'boss_yeti', 1, 'Đánh bại Tuyết Quái Vương tại Đỉnh Băng Giá. Đã đến lúc học Tuyệt Kỹ!', [['chest', 5]], 20, 1.0),
  q('Sừng Quỷ Đỏ', 62, 'collect', 'sung_quy', 20, 'Thu thập 20 Sừng Quỷ tại Rừng Ma.', [['W6', 1], ['stone3', 5]], 20, 0.6),
  q('Tinh Thể Vương', 65, 'kill', 'boss_crystal', 1, 'Tiêu diệt Tinh Thể Vương trong Hang Pha Lê.', [['chest', 5], ['necklace_6', 1]], 20, 1.0),
  q('Cường Hóa +10', 67, 'upgrade', null, 10, 'Cường hóa một trang bị đang mặc lên +10.', [['stone3', 6], ['charm', 3]], 20, 0.5),
  q('Ảnh Ninja', 68, 'kill', 'shadow', 30, 'Đánh bại 30 Ảnh Ninja tại Rừng Ma.', [['armor_6', 1], ['pants_6', 1]], 0, 0.6),
  q('Dung Nham Nhân', 72, 'kill', 'lavagolem', 30, 'Tiêu diệt 30 Dung Nham Nhân tại Hang Quỷ.', [['hat_7', 1], ['shoes_7', 1]], 0, 0.6),
  q('Quỷ Võ Sĩ', 78, 'kill', 'samurai', 30, 'Đánh bại 30 Quỷ Võ Sĩ tại Hang Quỷ.', [['W7', 1]], 20, 0.6),
  q('Quỷ Vương', 82, 'kill', 'boss_oni', 1, 'Tiêu diệt Quỷ Vương tại Hang Quỷ.', [['W8', 1], ['chest', 8]], 50, 1.0),
  q('Địa Ngục Khuyển', 84, 'kill', 'hellhound', 30, 'Tiêu diệt 30 Địa Ngục Khuyển tại Cổng Địa Ngục.', [['armor_8', 1], ['pants_8', 1]], 0, 0.6),
  q('Ma Thần Diệt Thế', 95, 'kill', 'boss_god', 1, 'Đánh bại Ma Thần tại Cổng Địa Ngục để mở đường lên Thiên Cung.', [['W9', 1], ['stone4', 2]], 80, 1.0),
  q('Thiên Cung', 96, 'visit', 'heaven', 1, 'Vượt qua Cổng Địa Ngục, tiến lên Thiên Cung.', [['exp2', 3]], 10, 0.3),
  q('Lông Lôi Điểu', 100, 'collect', 'long_vu', 20, 'Thu thập 20 Lông Lôi Điểu tại Thiên Cung.', [['W10', 1], ['armor_10', 1]], 30, 0.6),
  q('Hồn Ma Giới', 106, 'collect', 'hon_ma', 20, 'Thu thập 20 Hồn Ma Giới từ Ma Giới Quỷ.', [['pants_10', 1], ['hat_10', 1], ['stone4', 3]], 30, 0.6),
  q('Thiên Ma', 110, 'kill', 'boss_heaven', 1, 'Hạ gục Thiên Ma đang chiếm giữ Ma Giới.', [['W11', 1], ['chest', 10]], 100, 1.0),
  q('Vảy Rồng', 114, 'collect', 'vay_rong', 25, 'Thu thập 25 Vảy Rồng tại Long Cung.', [['armor_11', 1], ['pants_11', 1], ['stone4', 5]], 50, 0.6),
  q('Long Vương', 118, 'kill', 'boss_dragon', 1, 'Thử thách cuối cùng: đánh bại Long Vương dưới đáy Long Cung!', [['chest', 15], ['stone4', 5]], 200, 1.0),
  q('Ninja Huyền Thoại', 118, 'level', null, 120, 'Đạt cấp tối đa 120 để trở thành Ninja Huyền Thoại.', [['chest', 20]], 500, 0),
];

const DAILY = {
  max: 20,
  count: (lv) => 15 + Math.min(25, Math.floor(lv / 4)),
  reward: (lv) => ({ exp: Math.round((10 + lv * 8) * (12 + lv * 0.3)), xu: 200 + lv * 60, luong: 1 }),
};

module.exports = { MAIN_QUESTS, DAILY };
