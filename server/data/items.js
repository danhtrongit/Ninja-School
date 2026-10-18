'use strict';

const { CLASSES } = require('./classes');
const { SKILLS } = require('./skills');
const { PETS, PET_FOOD, PET, cleanPet, petMul } = require('./pets');

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

const W = (t) => 8 + t * t * 6 + t * 14;
const A = (t) => 5 + t * t * 3 + t * 8;
const price = (t, mul) => Math.round(100 * Math.pow(t + 1, 2.2) * mul);

const ITEMS = {};

for (let t = 0; t < TIERS; t++) {
  const lv = TIER_LV[t];
  const tn = TIER_NAMES[t];
  const color = TIER_COLORS[t];
  for (const cls of Object.keys(CLASSES)) {
    const c = CLASSES[cls];
    ITEMS[`w_${cls}_${t}`] = {
      name: `${c.weaponName} ${tn}`, type: 'equip', slot: 'weapon', tier: t, lv, cls,
      stats: { atk: W(t) }, price: price(t, 1.5), icon: { k: c.weapon, c: color },
    };
  }
  const eq = (slot, name, stats, mul, k) => {
    ITEMS[`${slot}_${t}`] = { name: `${name} ${tn}`, type: 'equip', slot, tier: t, lv, stats, price: price(t, mul), icon: { k: k || slot, c: color } };
  };
  eq('hat', 'Nón', { def: Math.round(A(t) * 0.4), hp: 10 + t * 20 }, 0.8);
  eq('armor', 'Áo', { def: A(t), hp: 20 + t * 40 }, 1.2);
  eq('gloves', 'Găng Tay', { atk: Math.round(W(t) * 0.25), def: Math.round(A(t) * 0.2) }, 0.8);
  eq('pants', 'Quần', { def: Math.round(A(t) * 0.6), hp: 10 + t * 25 }, 1.0);
  eq('shoes', 'Giày', { def: Math.round(A(t) * 0.3), dodge: 1 + t * 0.5, spd: 2 + t }, 0.9);
  eq('necklace', 'Dây Chuyền', { hp: 30 + t * 60, mp: 10 + t * 20 }, 1.0);
  eq('ring', 'Nhẫn', { atk: Math.round(W(t) * 0.3), crit: 1 + t * 0.5 }, 1.1);
  eq('amulet', 'Ngọc Bội', { hp: 20 + t * 30, mp: 20 + t * 30, def: Math.round(A(t) * 0.2) }, 1.1);
}

const add = (id, def) => { ITEMS[id] = def; };
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
// Thú cưng: đi theo chủ, tăng kinh nghiệm và chỉ số theo cấp thú (pets.js). look = mã hình trong petart.js
for (const [id, name, lv, stats, luong, look, skills] of PETS) {
  ITEMS[id] = {
    name, type: 'equip', slot: 'pet', tier: 0, lv, stats, look, petSkills: skills, noUpgrade: true,
    priceLuong: luong || undefined, price: luong ? 0 : 50000,
    icon: { k: 'pet', c: '#ffb74d', s: look }, desc: luong ? 'Thú cưng đi theo chủ nhân, lên cấp khi chủ diệt quái hoặc được cho ăn.' : 'Chỉ rơi từ Long Vương. Thú cưng mạnh nhất.',
  };
}
// Thức ăn thú: dùng khi đang mang thú theo, tăng EXP và độ thân mật của thú
for (const [id, name, exp, love, xu, luong, s, c] of PET_FOOD) {
  add(id, {
    name, type: 'petfood', lv: 1, effect: { petExp: exp, love }, price: xu, priceLuong: luong || undefined, stack: 999,
    icon: { k: 'petfood', c, s }, desc: `Cho thú cưng đang mang theo ăn: +${exp.toLocaleString('vi-VN')} EXP thú, +${love} thân mật.`,
  });
}
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
for (const [id, name, slot, look, grade, lv, stats, luong] of FASHION) {
  ITEMS[id] = {
    name, type: 'equip', slot, tier: 0, lv, stats, look, grade, fashion: true, noUpgrade: true,
    priceLuong: luong || undefined, price: 0,
    icon: { k: slot, c: FASHION_COLOR[look], s: look },
    desc: `${FASHION_DESC[slot]}${luong ? '' : ' Chỉ có từ Rương Báu và Vòng Quay May Mắn (hạn 7 ngày).'}`,
  };
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
add('charm', { name: 'Bùa Bảo Hộ', type: 'misc', lv: 1, priceLuong: 2, stack: 999, icon: { k: 'charm', c: '#ffee58' }, desc: 'Giữ cấp trang bị khi cường hóa thất bại.' });
add('chest', { name: 'Rương Báu', type: 'chest', lv: 1, price: 0, stack: 999, icon: { k: 'chest', c: '#ffb300' }, desc: 'Mở ra nhận vật phẩm ngẫu nhiên.' });
add('revive_card', { name: 'Thẻ Hồi Sinh', type: 'misc', lv: 1, priceLuong: 1, stack: 999, icon: { k: 'card', c: '#ef5350' }, desc: 'Hồi sinh tại chỗ khi trọng thương (thay cho 1 lượng).' });
// Vật phẩm sự kiện theo mùa (SEASONS trong extras.js): rơi từ quái khi sự kiện diễn ra, đổi quà ở NPC Lễ Hội
add('banh_trungthu', { name: 'Bánh Trung Thu', type: 'event', lv: 1, price: 5, stack: 999, icon: { k: 'mooncake', c: '#d9973a' }, desc: 'Bánh nướng nhân sen trứng muối. Mang tới Sứ Giả Lễ Hội ở làng để đổi quà Lễ Hội Trăng Rằm.' });
// Sách kỹ năng nội tại: đọc để học cấp 1 (id = book_<mã kỹ năng>). Giá lượng và màu bìa theo cấp yêu cầu.
// Bìa tránh tông tím của Bí Kíp Nhân Đôi; icon.s 'pas' vẽ thêm huy hiệu nội tại.
const BOOK_GRADE = { 15: [30, '#5ab4ff'], 35: [60, '#e5484d'], 50: [100, '#ffb02e'] };
for (const sid of Object.keys(SKILLS)) {
  const sk = SKILLS[sid];
  if (sk.type !== 'passive') continue;
  const [luong, c] = BOOK_GRADE[sk.req] || BOOK_GRADE[50];
  add(sk.book, {
    name: `Sách ${sk.name}`, type: 'book', lv: sk.req, cls: sk.cls, skill: sid, priceLuong: luong, price: sk.req * 200, stack: 999,
    icon: { k: 'book', c, s: 'pas' }, desc: `Đọc để học kỹ năng nội tại ${sk.name} (phái ${CLASSES[sk.cls].name}).`,
  });
}
const BOOKS = Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'book');

// Ngọc khảm: 6 loại × 10 cấp, id gem_<loại>_<cấp>, cộng dồn trong túi như đá cường hóa.
// Ghép 3 viên cấp N (cùng loại) thành 1 viên cấp N+1 ở Thợ Rèn. unit '%' = chỉ số phần trăm (giữ 1 chữ số lẻ).
const GEM_MAX = 10;
const GEM_TYPES = {
  hoa: { name: 'Hỏa Tâm Ngọc', stat: 'atk', label: 'tấn công', unit: '', c: '#ff5a1f', v: [12, 28, 50, 80, 120, 170, 230, 300, 380, 470] },
  thuy: { name: 'Thủy Linh Ngọc', stat: 'hp', label: 'sinh lực', unit: '', c: '#3fa9f5', v: [60, 140, 250, 400, 600, 850, 1150, 1500, 1900, 2400] },
  tho: { name: 'Thổ Giáp Ngọc', stat: 'def', label: 'phòng thủ', unit: '', c: '#e0952a', v: [8, 18, 32, 50, 75, 105, 140, 180, 225, 280] },
  phong: { name: 'Phong Ảnh Ngọc', stat: 'dodge', label: 'né tránh', unit: '%', c: '#5fd36a', v: [0.4, 0.6, 0.9, 1.2, 1.6, 2, 2.5, 3, 3.5, 4] },
  loi: { name: 'Lôi Quang Ngọc', stat: 'crit', label: 'chí mạng', unit: '%', c: '#9b7bff', v: [0.4, 0.6, 0.9, 1.2, 1.6, 2, 2.5, 3, 3.5, 4] },
  huyet: { name: 'Huyết Hồn Ngọc', stat: 'lifesteal', label: 'hút máu', unit: '%', c: '#e8304f', v: [0.3, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.4, 2.8, 3.2] },
};
const GEM_KINDS = Object.keys(GEM_TYPES);
const GEM = {
  max: GEM_MAX,
  // tỉ lệ ghép thành công theo cấp đang ghép (1→2 … 9→10); thất bại mất 1 viên, trả lại 2
  rate: [100, 90, 80, 70, 60, 50, 40, 32, 25],
  mergeCost: (lv) => 1000 * lv * lv,
  takeCost: (lv) => 300 + 200 * lv * lv,
  // số lỗ khảm theo bậc trang bị: Gỗ-Sắt 1, Bạc-Huyền 2, Long trở lên 3
  holes: (tier) => (tier <= 2 ? 1 : tier <= 6 ? 2 : 3),
  // trần tổng % hút máu (của đòn gây ra)
  lifestealCap: 15,
  // quái thường rơi ngọc
  dropRate: 0.012,
  price: (lv) => 1500 * Math.pow(3, lv - 1),
};
const gemId = (k, lv) => `gem_${k}_${lv}`;
const fmtGem = (t, v) => `+${t.unit === '%' ? v : v.toLocaleString('vi-VN')}${t.unit} ${t.label}`;
for (const k of GEM_KINDS) {
  const t = GEM_TYPES[k];
  for (let lv = 1; lv <= GEM_MAX; lv++) {
    add(gemId(k, lv), {
      name: `${t.name} Cấp ${lv}`, type: 'gem', gem: k, glv: lv, lv: 1, price: GEM.price(lv), stack: 999,
      icon: { k: 'gem', c: t.c, s: `${k}${lv}` },
      desc: `Khảm vào trang bị tại Thợ Rèn: ${fmtGem(t, t.v[lv - 1])}.${lv < GEM_MAX ? ` Ghép 3 viên thành ${t.name} Cấp ${lv + 1}.` : ' Cấp cao nhất.'}`,
    });
  }
}
// Số lỗ khảm của một loại trang bị (thú cưng, thời trang không có lỗ)
function gemHoles(def) {
  return def && def.type === 'equip' && !def.noUpgrade && GEAR_SLOTS.includes(def.slot) ? GEM.holes(def.tier || 0) : 0;
}
// Ngọc ngẫu nhiên cấp lv (rơi đồ)
function randomGem(lv) {
  return gemId(GEM_KINDS[Math.floor(Math.random() * GEM_KINDS.length)], Math.max(1, Math.min(GEM_MAX, lv | 0)));
}
const gemDef = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id) && ITEMS[id].type === 'gem' ? ITEMS[id] : null);
// Dọn mảng ngọc của một món (dữ liệu cũ/hỏng): bỏ id lạ, cắt theo số lỗ, bỏ loại trùng
function cleanGems(it) {
  if (!it || it.gems === undefined) return it;
  const n = gemHoles(ITEMS[it.id]);
  const seen = new Set();
  const g = (Array.isArray(it.gems) ? it.gems : []).slice(0, n).map((id) => {
    const d = gemDef(id);
    if (!d || seen.has(d.gem)) return null;
    seen.add(d.gem);
    return id;
  });
  if (g.some(Boolean)) it.gems = g;
  else delete it.gems;
  return it;
}

// Vật phẩm nhiệm vụ
[
  ['nam_doc', 'Nấm Độc', '#d84343'], ['vo_cua', 'Vỏ Cua', '#ff8a65'], ['xuong', 'Xương Cũ', '#eeeeee'],
  ['long_soi', 'Lông Sói', '#9e9e9e'], ['tinh_the_bang', 'Tinh Thể Băng', '#80deea'], ['sung_quy', 'Sừng Quỷ', '#e53935'],
  ['mat_ong', 'Mật Ong', '#ffca28'], ['cat_vang', 'Cát Vàng', '#ffd54f'],
  ['canh_hoa', 'Cánh Hoa Tiên', '#f8bbd0'], ['manh_tuong', 'Mảnh Tượng Đá', '#bcaaa4'], ['tinh_the_tim', 'Tinh Thể Tím', '#b388ff'],
  ['long_vu', 'Lông Lôi Điểu', '#fff59d'], ['hon_ma', 'Hồn Ma Giới', '#7e57c2'], ['vay_rong', 'Vảy Rồng', '#4dd0e1'],
].forEach(([id, name, c]) => add(id, { name, type: 'quest', lv: 1, price: 5, stack: 999, icon: { k: 'material', c }, desc: 'Vật phẩm nhiệm vụ.' }));

// Hàng bán tại NPC
const SHOPS = {
  potion: {
    name: 'Tiệm Thuốc',
    items: ['hp1', 'hp2', 'hp3', 'hp4', 'mp1', 'mp2', 'mp3', 'mp4', 'scroll_home', 'food_atk', 'food_def', 'food_hp', ...PET_FOOD.filter((f) => f[4] > 0).map((f) => f[0])],
    luong: ['exp2', 'charm', 'revive_card', ...PETS.filter((p) => p[4] > 0).map((p) => p[0]), ...PET_FOOD.filter((f) => f[5] > 0).map((f) => f[0]), ...FASHION_SHOP, ...BOOKS],
  },
  smith: {
    name: 'Lò Rèn',
    items: ['stone1', ...GEM_KINDS.map((k) => gemId(k, 1))],
    equipTiers: [0, 1, 2, 3],
  },
};

const OPTION_POOL = [
  ['atk', (t) => 3 + t * 6], ['def', (t) => 2 + t * 4], ['hp', (t) => 15 + t * 35], ['mp', (t) => 10 + t * 20],
  ['crit', (t) => 1 + t * 0.3], ['dodge', (t) => 1 + t * 0.3], ['str', (t) => 1 + t], ['agi', (t) => 1 + t],
  ['int', (t) => 1 + t], ['vit', (t) => 1 + t], ['skillDmg', (t) => 2 + t * 0.8],
];

function rollOptions(tier, rarity) {
  const [mn, mx] = RARITY[rarity].opts;
  const n = mn + Math.floor(Math.random() * (mx - mn + 1));
  const pool = OPTION_POOL.slice();
  const opts = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [k, f] = pool.splice(idx, 1)[0];
    let v = f(tier) * (0.6 + Math.random() * 0.6) * (1 + rarity * 0.15);
    v = k === 'crit' || k === 'dodge' || k === 'skillDmg' ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
    opts.push([k, v]);
  }
  return opts;
}

// days > 0: vật phẩm có hạn dùng (it.exp = thời điểm hết hạn, ms). Thời trang luôn mang độ hiếm theo grade, không có dòng phụ.
function makeItem(id, qty, rarity, days) {
  const def = ITEMS[id];
  if (!def) return null;
  const it = { id, q: Math.max(1, qty | 0 || 1) };
  if (def.type === 'equip') {
    it.q = 1;
    it.p = 0;
    it.r = def.fashion ? def.grade : Math.max(0, Math.min(RARITY.length - 1, rarity | 0));
    it.o = it.r > 0 && !def.fashion ? rollOptions(def.tier, it.r) : [];
    if (days > 0) it.exp = Date.now() + Math.round(days * 86400000);
    if (def.slot === 'pet') cleanPet(it);
  }
  return it;
}

const UPGRADE = {
  max: 16,
  rate: [100, 95, 90, 80, 70, 60, 50, 42, 35, 28, 22, 16, 12, 9, 6, 4],
  stone: (plus) => (plus < 4 ? 'stone1' : plus < 8 ? 'stone2' : plus < 12 ? 'stone3' : 'stone4'),
  stoneQty: (plus) => (plus % 4) + 1,
  cost: (plus, tier) => (plus + 1) * (plus + 1) * 400 * (tier + 1),
  bonus: 0.08,
};

function itemStats(it) {
  const def = ITEMS[it.id];
  const out = {};
  if (!def || !def.stats) return out;
  const mul = 1 + UPGRADE.bonus * (it.p || 0);
  // thú cưng: chỉ số tăng theo cấp thú thay cho cấp cường hóa
  const pet = def.slot === 'pet';
  for (const k in def.stats) {
    const v = def.stats[k] * (pet ? petMul(k, it.plv || 1) : mul);
    out[k] = k === 'crit' || k === 'dodge' || k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v);
  }
  for (const [k, v] of it.o || []) out[k] = (out[k] || 0) + v;
  // ngọc khảm: cộng thẳng, không nhân theo cấp cường hóa
  for (const id of it.gems || []) {
    const d = gemDef(id);
    if (!d) continue;
    const t = GEM_TYPES[d.gem];
    out[t.stat] = Math.round(((out[t.stat] || 0) + t.v[d.glv - 1]) * 10) / 10;
  }
  return out;
}

function sellPrice(it) {
  const def = ITEMS[it.id];
  if (!def) return 0;
  let base = def.price || (def.priceLuong ? 50 : 1);
  if (def.type === 'equip') base = base * (1 + (it.r || 0) * 0.5) * (1 + (it.p || 0) * 0.3);
  // ngọc đang khảm bán kèm theo món, tính thêm giá bán của từng viên
  let gems = 0;
  for (const id of it.gems || []) if (gemDef(id)) gems += Math.floor(gemDef(id).price * 0.25);
  return Math.max(1, Math.floor(base * 0.25)) + gems;
}

module.exports = {
  ITEMS, SHOPS, BOOKS, GEM, GEM_TYPES, GEM_KINDS, SLOTS, GEAR_SLOTS, FASHION_SLOTS, FASHION, FASHION_DAYS, TIERS, SLOT_NAMES, RARITY, TIER_NAMES, TIER_LV, TIER_COLORS, STAT_LABELS, UPGRADE,
  makeItem, itemStats, sellPrice, rollOptions, rollFashion, gemId, gemHoles, gemDef, randomGem, cleanGems, cleanPet, PET,
};
