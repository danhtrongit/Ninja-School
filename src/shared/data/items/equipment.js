'use strict';

const { CLASSES } = require('../classes');
const { cleanPet, petMul } = require('../pets');
const { ITEMS, TIERS, TIER_LV, TIER_NAMES, TIER_COLORS, RARITY } = require('./base');
const { gemDef, GEM_TYPES } = require('./gems');

const W = (t) => 8 + t * t * 6 + t * 14;
const A = (t) => 5 + t * t * 3 + t * 8;
const price = (t, mul) => Math.round(100 * Math.pow(t + 1, 2.2) * mul);

// Trang bị chiến đấu theo bậc: vũ khí từng phái + 8 ô còn lại
function build() {
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
}

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

module.exports = { build, rollOptions, makeItem, itemStats, sellPrice, UPGRADE };
