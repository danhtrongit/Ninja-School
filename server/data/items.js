'use strict';

const { CLASSES } = require('./classes');

const TIER_NAMES = ['Gỗ', 'Đồng', 'Sắt', 'Bạc', 'Vàng', 'Ngọc', 'Huyền', 'Long', 'Thiên', 'Thần', 'Tiên', 'Thánh'];
const TIER_LV = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
const TIER_COLORS = ['#a0703c', '#c9803c', '#9aa4ad', '#dfe6ec', '#f2c230', '#3fd0a0', '#8a63e8', '#e8463c', '#5cc4ff', '#ff7ef0', '#fff176', '#ff4081'];
const TIERS = TIER_NAMES.length;
// 'pet' là ô thú cưng: không rơi ngẫu nhiên, không bán ở lò rèn, không cường hóa
const SLOTS = ['weapon', 'hat', 'armor', 'gloves', 'pants', 'shoes', 'necklace', 'ring', 'amulet', 'pet'];
const GEAR_SLOTS = SLOTS.filter((s) => s !== 'pet');
const SLOT_NAMES = {
  weapon: 'Vũ khí', hat: 'Nón', armor: 'Áo', gloves: 'Găng tay', pants: 'Quần',
  shoes: 'Giày', necklace: 'Dây chuyền', ring: 'Nhẫn', amulet: 'Ngọc bội', pet: 'Thú cưng',
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
  skillDmg: 'ST kỹ năng %', hit: 'Chính xác', expPct: 'Kinh nghiệm %', hpPct: 'Sinh lực %',
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
// Thú cưng: đi theo chủ, tăng kinh nghiệm và chỉ số (sprite = loại quái dùng để vẽ)
[
  ['pet_slime', 'Slime Con', 1, { expPct: 5, hp: 100 }, 20, 'slime'],
  ['pet_bunny', 'Thỏ Ngọc', 10, { expPct: 8, crit: 2, hp: 200 }, 40, 'bunny'],
  ['pet_bat', 'Dơi Nhỏ', 30, { expPct: 10, atk: 40, dodge: 2 }, 70, 'bat'],
  ['pet_fox', 'Hồ Ly Con', 50, { expPct: 15, atk: 90, crit: 3 }, 120, 'foxspirit'],
  ['pet_ghost', 'Linh Hồn Nhỏ', 70, { expPct: 18, mp: 400, skillDmg: 6 }, 160, 'ghost'],
  ['pet_dragon', 'Rồng Con', 100, { expPct: 25, atk: 220, hp: 1200, crit: 4 }, 0, 'seaserpent'],
].forEach(([id, name, lv, stats, luong, sprite]) => {
  ITEMS[id] = {
    name, type: 'equip', slot: 'pet', tier: 0, lv, stats, sprite, noUpgrade: true,
    priceLuong: luong || undefined, price: luong ? 0 : 50000,
    icon: { k: 'pet', c: '#ffb74d' }, desc: luong ? 'Thú cưng đi theo chủ nhân, tăng kinh nghiệm và chỉ số.' : 'Chỉ rơi từ Long Vương. Thú cưng mạnh nhất.',
  };
});
add('charm', { name: 'Bùa Bảo Hộ', type: 'misc', lv: 1, priceLuong: 2, stack: 999, icon: { k: 'charm', c: '#ffee58' }, desc: 'Giữ cấp trang bị khi cường hóa thất bại.' });
add('chest', { name: 'Rương Báu', type: 'chest', lv: 1, price: 0, stack: 999, icon: { k: 'chest', c: '#ffb300' }, desc: 'Mở ra nhận vật phẩm ngẫu nhiên.' });
add('revive_card', { name: 'Thẻ Hồi Sinh', type: 'misc', lv: 1, priceLuong: 1, stack: 999, icon: { k: 'card', c: '#ef5350' }, desc: 'Hồi sinh tại chỗ khi trọng thương (thay cho 1 lượng).' });
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
    items: ['hp1', 'hp2', 'hp3', 'hp4', 'mp1', 'mp2', 'mp3', 'mp4', 'scroll_home', 'food_atk', 'food_def', 'food_hp'],
    luong: ['exp2', 'charm', 'revive_card', 'pet_slime', 'pet_bunny', 'pet_bat', 'pet_fox', 'pet_ghost'],
  },
  smith: {
    name: 'Lò Rèn',
    items: ['stone1'],
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

function makeItem(id, qty, rarity) {
  const def = ITEMS[id];
  if (!def) return null;
  const it = { id, q: Math.max(1, qty | 0 || 1) };
  if (def.type === 'equip') {
    it.q = 1;
    it.p = 0;
    it.r = rarity | 0;
    it.o = it.r > 0 ? rollOptions(def.tier, it.r) : [];
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
  for (const k in def.stats) {
    const v = def.stats[k] * mul;
    out[k] = k === 'crit' || k === 'dodge' || k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v);
  }
  for (const [k, v] of it.o || []) out[k] = (out[k] || 0) + v;
  return out;
}

function sellPrice(it) {
  const def = ITEMS[it.id];
  if (!def) return 0;
  let base = def.price || (def.priceLuong ? 50 : 1);
  if (def.type === 'equip') base = base * (1 + (it.r || 0) * 0.5) * (1 + (it.p || 0) * 0.3);
  return Math.max(1, Math.floor(base * 0.25));
}

module.exports = {
  ITEMS, SHOPS, SLOTS, GEAR_SLOTS, TIERS, SLOT_NAMES, RARITY, TIER_NAMES, TIER_LV, TIER_COLORS, STAT_LABELS, UPGRADE,
  makeItem, itemStats, sellPrice, rollOptions,
};
