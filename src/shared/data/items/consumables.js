'use strict';

const { add } = require('./base');

// Bình thuốc, cuộn, đá cường hóa, đồ ăn
function build() {
  // Bình máu / chakra
  [[1, 100, 20, 1], [2, 400, 90, 10], [3, 1500, 320, 30], [4, 5000, 1000, 60]].forEach(([n, v, p, lv]) => {
    add(`hp${n}`, { name: `Bình Sinh Lực ${['', 'Nhỏ', 'Vừa', 'Lớn', 'Cực Đại'][n]}`, type: 'potion', lv, effect: { hp: v }, price: p, stack: 999, icon: { k: 'potion', c: '#e53935', s: n }, desc: `Hồi ${v} sinh lực.` });
    add(`mp${n}`, { name: `Bình Chakra ${['', 'Nhỏ', 'Vừa', 'Lớn', 'Cực Đại'][n]}`, type: 'potion', lv, effect: { mp: Math.round(v * 0.6) }, price: p, stack: 999, icon: { k: 'potion', c: '#1e88e5', s: n }, desc: `Hồi ${Math.round(v * 0.6)} chakra.` });
  });
  add('scroll_home', { name: 'Cuộn Về Làng', type: 'scroll', lv: 1, effect: { home: true }, price: 50, stack: 999, icon: { k: 'scroll', c: '#ffe082' }, desc: 'Dịch chuyển về làng của phái.' });
  add('exp2', { name: 'Bí Kíp Nhân Đôi', type: 'scroll', lv: 1, effect: { buff: 'exp2', dur: 30 * 60 * 1000 }, priceLuong: 5, stack: 999, icon: { k: 'book', c: '#ab47bc' }, desc: 'Nhân đôi kinh nghiệm nhận được trong 30 phút.' });
  add('stone1', { name: 'Đá Cường Hóa Sơ', type: 'stone', lv: 1, price: 300, stack: 999, icon: { k: 'stone', c: '#90caf9' }, desc: 'Dùng cường hóa trang bị +1 đến +4.' });
  add('stone2', { name: 'Đá Cường Hóa Trung', type: 'stone', lv: 1, price: 2500, stack: 999, icon: { k: 'stone', c: '#ce93d8' }, desc: 'Dùng cường hóa trang bị +5 đến +8.' });
  add('stone3', { name: 'Đá Cường Hóa Cao', type: 'stone', lv: 1, price: 15000, stack: 999, icon: { k: 'stone', c: '#ffcc80' }, desc: 'Dùng cường hóa trang bị +9 đến +12.' });
  add('stone4', { name: 'Đá Cường Hóa Thần', type: 'stone', lv: 1, price: 80000, stack: 999, icon: { k: 'stone', c: '#ff5252' }, desc: 'Dùng cường hóa trang bị +13 đến +16. Rơi từ quái cấp 90+ và boss.' });
  // Đồ ăn: buff kéo dài 30 phút, giữ cả khi thoát game
  add('food_atk', { name: 'Bánh Bao Sức Mạnh', type: 'food', lv: 1, effect: { buff: 'food_atk', dur: 30 * 60 * 1000 }, price: 3000, stack: 999, icon: { k: 'food', c: '#ffcc80' }, desc: '+10% tấn công trong 30 phút.' });
  add('food_def', { name: 'Trà Thiết Bích', type: 'food', lv: 1, effect: { buff: 'food_def', dur: 30 * 60 * 1000 }, price: 3000, stack: 999, icon: { k: 'food', c: '#a5d6a7' }, desc: '+10% phòng thủ trong 30 phút.' });
  add('food_hp', { name: 'Canh Nhân Sâm', type: 'food', lv: 1, effect: { buff: 'food_hp', dur: 30 * 60 * 1000 }, price: 3000, stack: 999, icon: { k: 'food', c: '#ef9a9a' }, desc: '+10% sinh lực tối đa trong 30 phút.' });
}

// Vật phẩm lẻ: bùa, rương, thẻ hồi sinh, vật phẩm sự kiện
function buildMisc() {
  add('charm', { name: 'Bùa Bảo Hộ', type: 'misc', lv: 1, priceLuong: 2, stack: 999, icon: { k: 'charm', c: '#ffee58' }, desc: 'Giữ cấp trang bị khi cường hóa thất bại.' });
  add('chest', { name: 'Rương Báu', type: 'chest', lv: 1, price: 0, stack: 999, icon: { k: 'chest', c: '#ffb300' }, desc: 'Mở ra nhận vật phẩm ngẫu nhiên.' });
  add('revive_card', { name: 'Thẻ Hồi Sinh', type: 'misc', lv: 1, priceLuong: 1, stack: 999, icon: { k: 'card', c: '#ef5350' }, desc: 'Hồi sinh tại chỗ khi trọng thương (thay cho 1 lượng).' });
  // Vật phẩm sự kiện theo mùa (SEASONS trong extras.js): rơi từ quái khi sự kiện diễn ra, đổi quà ở NPC Lễ Hội
  add('banh_trungthu', { name: 'Bánh Trung Thu', type: 'event', lv: 1, price: 5, stack: 999, icon: { k: 'mooncake', c: '#d9973a' }, desc: 'Bánh nướng nhân sen trứng muối. Mang tới Sứ Giả Lễ Hội ở làng để đổi quà Lễ Hội Trăng Rằm.' });
}

// Vật phẩm nhiệm vụ
function buildQuest() {
  [
    ['nam_doc', 'Nấm Độc', '#d84343'], ['vo_cua', 'Vỏ Cua', '#ff8a65'], ['xuong', 'Xương Cũ', '#eeeeee'],
    ['long_soi', 'Lông Sói', '#9e9e9e'], ['tinh_the_bang', 'Tinh Thể Băng', '#80deea'], ['sung_quy', 'Sừng Quỷ', '#e53935'],
    ['mat_ong', 'Mật Ong', '#ffca28'], ['cat_vang', 'Cát Vàng', '#ffd54f'],
    ['canh_hoa', 'Cánh Hoa Tiên', '#f8bbd0'], ['manh_tuong', 'Mảnh Tượng Đá', '#bcaaa4'], ['tinh_the_tim', 'Tinh Thể Tím', '#b388ff'],
    ['long_vu', 'Lông Lôi Điểu', '#fff59d'], ['hon_ma', 'Hồn Ma Giới', '#7e57c2'], ['vay_rong', 'Vảy Rồng', '#4dd0e1'],
  ].forEach(([id, name, c]) => add(id, { name, type: 'quest', lv: 1, price: 5, stack: 999, icon: { k: 'material', c }, desc: 'Vật phẩm nhiệm vụ.' }));
}

module.exports = { build, buildMisc, buildQuest };
