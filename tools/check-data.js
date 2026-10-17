'use strict';

// Kiểm tra chéo dữ liệu game: mọi tham chiếu (vật phẩm, quái, bản đồ, nhiệm vụ, kỹ năng) phải hợp lệ.
// Chạy: npm run check
const { ITEMS, SHOPS, TIERS, TIER_NAMES, TIER_LV, TIER_COLORS, RARITY } = require('../server/data/items');
const { MONSTERS } = require('../server/data/monsters');
const { MAPS, NPC_TYPES } = require('../server/data/maps');
const { MAIN_QUESTS } = require('../server/data/quests');
const { SKILLS, classSkills } = require('../server/data/skills');
const { CLASSES } = require('../server/data/classes');
const { CHECKIN, WHEEL } = require('../server/data/extras');

const ICON_KINDS = new Set(['sword', 'blade', 'kunai', 'shuriken', 'bow', 'fan', 'hat', 'armor', 'gloves', 'pants', 'shoes', 'necklace', 'ring',
  'amulet', 'potion', 'scroll', 'book', 'stone', 'charm', 'chest', 'card', 'material', 'food', 'pet', 'xu']);
const SPRITE_TYPES = new Set(['slime', 'bunny', 'mushroom', 'imp', 'flyer', 'humanoid', 'crab', 'golem', 'ghost', 'beast', 'snowman']);
const FX_KINDS = new Set(['slash', 'proj', 'burst', 'wave', 'rain', 'meteor', 'whirl', 'aura', 'heal', 'dash']);
const PROJ = new Set(['shuriken', 'arrow', 'kunai', 'wind', 'fire', 'water', 'ice']);
const THEMES = new Set(['village_fire', 'village_water', 'village_wind', 'grass_fire', 'lake', 'grass_wind', 'bamboo', 'beach', 'cave', 'desert',
  'mist', 'snow', 'ice', 'dark_forest', 'lava', 'hell', 'arena']);
const QUEST_KINDS = new Set(['talk', 'kill', 'collect', 'level', 'visit', 'upgrade', 'dungeon']);

const errors = [];
const err = (m) => errors.push(m);
const itemRef = (id, where) => { if (!ITEMS[id]) err(`${where}: vật phẩm không tồn tại "${id}"`); };

// Vật phẩm
if (TIER_LV.length !== TIERS || TIER_COLORS.length !== TIERS) err(`Số bậc không khớp: TIER_NAMES ${TIER_NAMES.length}, TIER_LV ${TIER_LV.length}, TIER_COLORS ${TIER_COLORS.length}`);
for (const [id, it] of Object.entries(ITEMS)) {
  if (!it.name) err(`Vật phẩm ${id}: thiếu tên`);
  if (!it.icon || !ICON_KINDS.has(it.icon.k)) err(`Vật phẩm ${id}: icon.k "${it.icon && it.icon.k}" chưa có hình trong icons.js`);
  if (it.type === 'equip' && it.slot !== 'pet' && (it.tier == null || it.tier >= TIERS)) err(`Vật phẩm ${id}: bậc không hợp lệ`);
  if (it.sprite && !MONSTERS[it.sprite]) err(`Thú cưng ${id}: sprite "${it.sprite}" không phải quái có sẵn`);
}
for (const [shop, sh] of Object.entries(SHOPS)) for (const id of [...(sh.items || []), ...(sh.luong || [])]) itemRef(id, `Cửa hàng ${shop}`);
CHECKIN.forEach((r, i) => (r.items || []).forEach(([id]) => itemRef(id, `Điểm danh ngày ${i + 1}`)));
WHEEL.prizes.forEach((p) => (p.items || []).forEach(([id]) => itemRef(id, `Vòng quay "${p.label}"`)));

// Quái
for (const [id, m] of Object.entries(MONSTERS)) {
  if (!SPRITE_TYPES.has(m.type)) err(`Quái ${id}: kiểu sprite "${m.type}" không có trong monsterart.js`);
  if (!Array.isArray(m.pal) || m.pal.length !== 3) err(`Quái ${id}: bảng màu phải có 3 màu`);
  for (const [d] of m.drops || []) itemRef(d, `Quái ${id} rơi`);
}

// Bản đồ
const placed = new Set();
for (const [id, map] of Object.entries(MAPS)) {
  if (!THEMES.has(map.theme)) err(`Bản đồ ${id}: theme "${map.theme}" chưa có trong maprender.js`);
  for (const p of map.portals) {
    if (p.to === '@home') continue;
    if (!MAPS[p.to]) { err(`Bản đồ ${id}: cổng tới bản đồ không tồn tại "${p.to}"`); continue; }
    if (!MAPS[p.to].portals.some((q) => q.to === id)) err(`Bản đồ ${id} → ${p.to}: cổng một chiều (thiếu cổng quay lại)`);
    if (p.tx < 0 || p.tx > MAPS[p.to].w) err(`Bản đồ ${id} → ${p.to}: điểm đến x=${p.tx} nằm ngoài bản đồ`);
  }
  for (const s of map.spawns) {
    if (!MONSTERS[s.m]) err(`Bản đồ ${id}: quái không tồn tại "${s.m}"`);
    placed.add(s.m);
  }
  for (const b of map.boss || []) {
    if (!MONSTERS[b.m] || !MONSTERS[b.m].boss) err(`Bản đồ ${id}: boss không hợp lệ "${b.m}"`);
    if (b.x < 100 || b.x > map.w - 100) err(`Bản đồ ${id}: boss ${b.m} đặt quá sát mép`);
    placed.add(b.m);
  }
  for (const n of map.npcs) if (!NPC_TYPES[n.type]) err(`Bản đồ ${id}: loại NPC không tồn tại "${n.type}"`);
}
for (const id of Object.keys(MONSTERS)) if (!placed.has(id)) err(`Quái ${id}: không xuất hiện ở bản đồ nào`);

// Nhiệm vụ
MAIN_QUESTS.forEach((q, i) => {
  const where = `Nhiệm vụ ${i + 1} "${q.name}"`;
  if (!QUEST_KINDS.has(q.kind)) err(`${where}: loại không hợp lệ "${q.kind}"`);
  if (i && q.req < MAIN_QUESTS[i - 1].req) err(`${where}: cấp yêu cầu ${q.req} nhỏ hơn nhiệm vụ trước`);
  if (q.kind === 'kill' && !MONSTERS[q.m]) err(`${where}: quái không tồn tại "${q.m}"`);
  if (q.kind === 'kill' && MONSTERS[q.m] && !placed.has(q.m)) err(`${where}: quái "${q.m}" không có trên bản đồ`);
  if (q.kind === 'collect') {
    itemRef(q.item, where);
    if (!Object.values(MONSTERS).some((m) => (m.drops || []).some(([d]) => d === q.item))) err(`${where}: không quái nào rơi "${q.item}"`);
  }
  if (q.kind === 'visit' && !MAPS[q.map]) err(`${where}: bản đồ không tồn tại "${q.map}"`);
  for (const [id] of q.reward.items || []) itemRef(id[0] === 'W' ? `w_kiem_${id.slice(1)}` : id, where);
});

// Kỹ năng
for (const cls of Object.keys(CLASSES)) {
  const list = classSkills(cls);
  if (list.filter((s) => SKILLS[s].basic).length !== 1) err(`Phái ${cls}: phải có đúng 1 đòn thường`);
}
for (const [id, sk] of Object.entries(SKILLS)) {
  if (!CLASSES[sk.cls]) err(`Kỹ năng ${id}: phái không tồn tại`);
  if (!sk.fx || !FX_KINDS.has(sk.fx.k)) err(`Kỹ năng ${id}: fx.k "${sk.fx && sk.fx.k}" chưa có trong fx.js`);
  if (sk.fx && sk.fx.p && !PROJ.has(sk.fx.p)) err(`Kỹ năng ${id}: loại đạn "${sk.fx.p}" chưa có trong fx.js`);
  if (['single', 'aoe', 'line', 'dash'].includes(sk.type) && !sk.mul) err(`Kỹ năng ${id}: thiếu hệ số sát thương`);
}
if (RARITY.length !== 5) err('RARITY phải có 5 bậc');

if (errors.length) {
  console.log(errors.map((e) => `✘ ${e}`).join('\n'));
  console.log(`\nDỮ LIỆU CÓ ${errors.length} LỖI`);
  process.exit(1);
}
console.log(`✔ Dữ liệu hợp lệ: ${Object.keys(ITEMS).length} vật phẩm, ${Object.keys(MONSTERS).length} quái, ${Object.keys(MAPS).length} bản đồ, ${MAIN_QUESTS.length} nhiệm vụ, ${Object.keys(SKILLS).length} kỹ năng`);
