'use strict';

// Kiểm tra chéo dữ liệu game: mọi tham chiếu (vật phẩm, quái, bản đồ, nhiệm vụ, kỹ năng) phải hợp lệ.
// Chạy: npm run check
const { ITEMS, SHOPS, TIERS, TIER_NAMES, TIER_LV, TIER_COLORS, RARITY, SLOTS, FASHION_SLOTS, STAT_LABELS, GEM, GEM_TYPES, gemHoles } = require('../src/shared/data/items');
const { MONSTERS } = require('../src/shared/data/monsters');
const { MAPS, NPC_TYPES, clientMaps } = require('../src/shared/data/maps');
const { MAIN_QUESTS } = require('../src/shared/data/quests');
const { SKILLS, PASSIVE_STATS, classSkills } = require('../src/shared/data/skills');
const { CLASSES } = require('../src/shared/data/classes');
const { CHECKIN, WHEEL, TATHU, MAIL, GIFTCODES, CODE_LIMIT, SEASONS, ARENA } = require('../src/shared/data/extras');
const { eventMaps } = require('../src/server/modules/events');
const { PET, PET_SKILLS, PETS, PET_FOOD } = require('../src/shared/data/pets');
const AUDIO = require('../src/shared/data/audio');

// Đọc mã nguồn client để dò tên hình vẽ. File vào (render/icons.js) đã tách phần thân ra thư mục
// con (render/icons/*.js) nên đọc gộp cả file lẫn thư mục đó.
const CLIENT_JS = require('path').join(__dirname, '..', 'src', 'client', 'js');
const PART_DIRS = { 'render/maprender.js': 'render/map', 'render/monsterart.js': 'render/monster' };
function clientSrc(rel) {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(CLIENT_JS, rel);
  const dir = path.join(CLIENT_JS, PART_DIRS[rel] || rel.replace(/\.js$/, ''));
  let code = fs.readFileSync(file, 'utf8');
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort()) code += '\n' + fs.readFileSync(path.join(dir, f), 'utf8');
  }
  return code;
}

const ICON_KINDS = new Set(['sword', 'blade', 'kunai', 'shuriken', 'bow', 'fan', 'hat', 'armor', 'gloves', 'pants', 'shoes', 'necklace', 'ring',
  'amulet', 'potion', 'scroll', 'book', 'stone', 'charm', 'chest', 'card', 'material', 'food', 'pet', 'xu', 'mask', 'cloak', 'costume', 'mount', 'gem', 'petfood', 'mooncake']);
const SPRITE_TYPES = new Set(['slime', 'bunny', 'mushroom', 'imp', 'flyer', 'humanoid', 'crab', 'golem', 'ghost', 'beast', 'snowman']);
const FX_KINDS = new Set(['slash', 'proj', 'burst', 'wave', 'rain', 'meteor', 'whirl', 'aura', 'heal', 'dash']);
const PROJ = new Set(['shuriken', 'arrow', 'kunai', 'wind', 'fire', 'water', 'ice']);
const THEMES = new Set(['village_fire', 'village_water', 'village_wind', 'grass_fire', 'lake', 'grass_wind', 'bamboo', 'beach', 'cave', 'desert',
  'mist', 'snow', 'ice', 'dark_forest', 'lava', 'hell', 'arena', 'heaven', 'dragon_palace', 'abyss', 'sakura', 'ruins', 'crystal']);
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
  if (it.type === 'equip' && !SLOTS.includes(it.slot)) err(`Vật phẩm ${id}: ô "${it.slot}" không có trong SLOTS`);
  if (it.type === 'equip' && !!it.fashion !== FASHION_SLOTS.includes(it.slot)) err(`Vật phẩm ${id}: cờ fashion phải khớp với ô thời trang`);
  if (it.type === 'book' && (it.icon.k !== 'book' || it.icon.s !== 'pas')) err(`Sách ${id}: icon phải là { k: 'book', s: 'pas' } để khác bí kíp thường`);
}
for (const [shop, sh] of Object.entries(SHOPS)) for (const id of [...(sh.items || []), ...(sh.luong || [])]) itemRef(id, `Cửa hàng ${shop}`);
CHECKIN.forEach((r, i) => (r.items || []).forEach(([id]) => itemRef(id, `Điểm danh ngày ${i + 1}`)));
WHEEL.prizes.forEach((p) => (p.items || []).forEach(([id]) => itemRef(id, `Vòng quay "${p.label}"`)));
if (!WHEEL.prizes.some((p) => p.fashion)) err('Vòng quay: thiếu ô thưởng thời trang 7 ngày');

// Ngọc khảm: đủ 10 cấp mỗi loại, chỉ số tăng dần, chỉ số có nhãn, icon có hình theo loại, tỉ lệ ghép giảm dần
{
  const GEM_STATS = new Set(['atk', 'hp', 'def', 'dodge', 'crit', 'lifesteal']);
  const icSrc = clientSrc('render/icons.js');
  const gemShapes = new Set([...((icSrc.match(/const GEM_SHAPES = \{([\s\S]*?)\n\};/) || ['', ''])[1].matchAll(/^ {2}([a-z_]+):/gm))].map((m) => m[1]));
  if (GEM.rate.length !== GEM.max - 1) err(`Ngọc: GEM.rate cần ${GEM.max - 1} mốc (ghép 1→2 … ${GEM.max - 1}→${GEM.max})`);
  GEM.rate.forEach((r, i) => { if (!(r > 0 && r <= 100) || (i && r > GEM.rate[i - 1])) err(`Ngọc: tỉ lệ ghép mốc ${i + 1} (${r}%) phải trong 1-100 và giảm dần`); });
  for (const [k, t] of Object.entries(GEM_TYPES)) {
    const where = `Ngọc ${k}`;
    if (!GEM_STATS.has(t.stat) || !STAT_LABELS[t.stat]) err(`${where}: chỉ số "${t.stat}" không hợp lệ hoặc thiếu nhãn STAT_LABELS`);
    if (!Array.isArray(t.v) || t.v.length !== GEM.max || t.v.some((v, i) => !(v > 0) || (i && v <= t.v[i - 1]))) err(`${where}: v phải có ${GEM.max} giá trị dương tăng dần`);
    if (!gemShapes.has(k)) err(`${where}: chưa có hình trong GEM_SHAPES của icons.js`);
    for (let lv = 1; lv <= GEM.max; lv++) {
      const it = ITEMS[`gem_${k}_${lv}`];
      if (!it || it.type !== 'gem' || it.gem !== k || it.glv !== lv || !it.stack) { err(`${where}: thiếu vật phẩm gem_${k}_${lv}`); continue; }
      if (it.icon.k !== 'gem' || it.icon.s !== `${k}${lv}` || it.icon.c !== t.c) err(`${where} cấp ${lv}: icon phải là { k: 'gem', c: '${t.c}', s: '${k}${lv}' }`);
    }
  }
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.type === 'gem' && !GEM_TYPES[it.gem]) err(`Ngọc ${id}: loại "${it.gem}" không có trong GEM_TYPES`);
    if (it.type === 'equip' && (it.noUpgrade || it.fashion || it.slot === 'pet') && gemHoles(it)) err(`Vật phẩm ${id}: thú cưng/thời trang không được có lỗ khảm`);
  }
  for (let t = 0; t < TIERS; t++) if (!(GEM.holes(t) >= 1 && GEM.holes(t) <= 3) || (t && GEM.holes(t) < GEM.holes(t - 1))) err(`Ngọc: số lỗ bậc ${t} phải 1-3 và không giảm theo bậc`);
  if (Object.keys(GEM_TYPES).length < 3) err('Ngọc: cần ít nhất 3 loại (mỗi món tối đa 3 lỗ, không trùng loại)');
  if (!SHOPS.smith.items.some((id) => ITEMS[id] && ITEMS[id].type === 'gem')) err('Ngọc: Lò Rèn phải bán ngọc cấp 1');
}

// Thú cưng: mã hình có trong petart.js (PET_ART), kỹ năng hợp lệ, chỉ số có nhãn, thức ăn bán ở cửa hàng
{
  const fs = require('fs');
  const pa = clientSrc('render/petart.js');
  const art = new Set([...((pa.match(/export const PET_ART = \{([\s\S]*?)\n\};/) || ['', ''])[1].matchAll(/^ {2}([a-z_]+):/gm))].map((m) => m[1]));
  const ic = clientSrc('render/icons.js');
  const foodIcons = new Set([...((ic.match(/const PETFOOD_ICONS = \{([\s\S]*?)\n\};/) || ['', ''])[1].matchAll(/^ {2}([a-z_]+):/gm))].map((m) => m[1]));
  if (!art.size) err('Không đọc được PET_ART trong petart.js');
  const looks = new Set();
  const sold = new Set(Object.values(SHOPS).flatMap((sh) => [...(sh.items || []), ...(sh.luong || [])]));
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.slot !== 'pet') continue;
    const where = `Thú cưng ${id}`;
    looks.add(it.look);
    if (!art.has(it.look)) err(`${where}: look "${it.look}" chưa có hình trong PET_ART (petart.js)`);
    if (it.icon.k !== 'pet' || it.icon.s !== it.look) err(`${where}: icon phải là { k: 'pet', s: '${it.look}' } để icon cùng hình với thú`);
    if (!it.noUpgrade) err(`${where}: thú cưng không được cường hóa (thiếu noUpgrade)`);
    if (!Array.isArray(it.petSkills) || !it.petSkills.length || it.petSkills.some((k) => !PET_SKILLS[k])) err(`${where}: petSkills phải gồm kỹ năng có trong PET_SKILLS`);
    for (const k of Object.keys(it.stats)) if (!STAT_LABELS[k]) err(`${where}: chỉ số "${k}" thiếu nhãn STAT_LABELS`);
    if (!(it.stats.expPct > 0 && it.stats.expPct <= 25)) err(`${where}: expPct cấp 1 phải trong 1-25`);
  }
  if (looks.size !== PETS.length) err('Thú cưng: mỗi loài cần mã hình riêng');
  if (!(PET.maxLv >= 10 && PET.maxLv <= 100) || !(PET.share > 0 && PET.share <= 0.3)) err('Thú cưng: maxLv 10-100, share 0-30%');
  if (!(PET.loveLazy > 0 && PET.loveLazy < PET.loveStart && PET.loveStart <= PET.loveMax)) err('Thú cưng: cần 0 < loveLazy < loveStart <= loveMax');
  for (let lv = 2; lv < PET.maxLv; lv++) if (!(PET.need(lv) > PET.need(lv - 1))) err(`Thú cưng: EXP cần cấp ${lv} phải lớn hơn cấp trước`);
  PET_FOOD.forEach(([id], i) => {
    const it = ITEMS[id];
    if (!it || it.type !== 'petfood') return err(`Thức ăn thú ${id}: thiếu vật phẩm`);
    if (!(it.effect.petExp > 0 && it.effect.love > 0)) err(`Thức ăn thú ${id}: phải cộng EXP và thân mật`);
    if (!foodIcons.has(it.icon.s) || it.icon.k !== 'petfood') err(`Thức ăn thú ${id}: icon { k: 'petfood', s: '${it.icon.s}' } chưa có hình trong icons.js`);
    if (!sold.has(id)) err(`Thức ăn thú ${id}: không bán ở cửa hàng nào`);
    if (i && it.effect.petExp <= ITEMS[PET_FOOD[i - 1][0]].effect.petExp) err(`Thức ăn thú ${id}: EXP phải tăng dần theo thứ tự`);
  });
}

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
// Boss sự kiện không đặt cố định: world gọi ra ở bãi luyện công hợp cấp
for (const id of TATHU.bosses) {
  if (!MONSTERS[id] || !MONSTERS[id].boss || !MONSTERS[id].event) { err(`Tà Thú ${id}: phải là boss có cờ event`); continue; }
  if (!eventMaps(id).length) err(`Tà Thú ${id}: không có bãi luyện công nào hợp cấp ${MONSTERS[id].lv}`);
  placed.add(id);
}
for (const id of Object.keys(MONSTERS)) if (MONSTERS[id].event && !TATHU.bosses.includes(id)) err(`Boss sự kiện ${id}: chưa có trong TATHU.bosses`);
for (const id of Object.keys(MONSTERS)) if (!placed.has(id)) err(`Quái ${id}: không xuất hiện ở bản đồ nào`);
// Chiêu boss: hình ảnh có trong fx.bossSkill, vùng đánh hợp lệ, thời gian niệm đủ để chạy ra (kể cả khi cuồng nộ)
const BOSS_K = new Set(['quake', 'roar', 'summon', 'beam', 'nova']);
// dải hệ số theo loại chiêu (DESIGN_RULES mục 9)
const MUL_RANGE = { quake: [1.3, 1.8], beam: [1.4, 2.0], nova: [2.0, 2.6], roar: [0.5, 0.7], summon: [0, 0] };
const SHAPES = new Set(['circle', 'line', 'pillar']);
for (const [id, m] of Object.entries(MONSTERS)) {
  if (!m.boss) continue;
  const sks = m.skills || [];
  if (sks.length < 2 || sks.length > 3) err(`Boss ${id}: cần 2-3 chiêu riêng (đang có ${sks.length})`);
  sks.forEach((sk, i) => {
    const where = `Boss ${id} chiêu ${i + 1}`;
    if (!sk.name) err(`${where}: thiếu tên`);
    if (!BOSS_K.has(sk.k)) err(`${where}: k "${sk.k}" chưa có trong fx.bossSkill`);
    if (!SHAPES.has(sk.shape)) err(`${where}: shape "${sk.shape}" không hợp lệ`);
    const maxR = sk.shape === 'line' ? 320 : sk.shape === 'pillar' ? 40 : 160;
    if (!(sk.r > 0 && sk.r <= maxR)) err(`${where}: r = ${sk.r} ngoài khoảng (0, ${maxR}]`);
    if (!(sk.windup >= 800 && sk.windup <= 3000)) err(`${where}: windup ${sk.windup}ms phải trong 800-3000ms để né được`);
    if (!(sk.cd > sk.windup)) err(`${where}: hồi chiêu phải dài hơn thời gian niệm`);
    if (!(sk.mul >= 0 && sk.mul <= 3)) err(`${where}: hệ số sát thương ${sk.mul} ngoài 0-3`);
    const mr = MUL_RANGE[sk.k];
    if (mr && !(sk.mul >= mr[0] && sk.mul <= mr[1])) err(`${where}: hệ số ${sk.k} ×${sk.mul} ngoài ${mr[0]}-${mr[1]}`);
    const ex = sk.extra || {};
    if (sk.k === 'summon' && (!MONSTERS[ex.m] || MONSTERS[ex.m].boss || !placed.has(ex.m) || !(ex.n >= 1 && ex.n <= 4))) err(`${where}: quái con "${ex.m}" x${ex.n} không hợp lệ`);
    if (sk.k === 'roar' && !(ex.slow > 0 && ex.slow <= 60 && ex.dur > 0 && ex.dur <= 5000)) err(`${where}: làm chậm phải 1-60% trong tối đa 5 giây`);
    if (sk.shape === 'pillar' && !(ex.n >= 1 && ex.n <= 5)) err(`${where}: số cột sáng phải 1-5`);
  });
}
// Phần thưởng sự kiện Tà Thú
TATHU.rewards.forEach((r, i) => {
  (r.items || []).forEach(([id]) => itemRef(id, `Thưởng Tà Thú mốc ${i + 1}`));
  const prev = TATHU.rewards[i - 1];
  if (i && prev.to !== 0 && r.to !== 0 && r.to <= prev.to) err(`Thưởng Tà Thú mốc ${i + 1}: hạng phải tăng dần`);
});
if (TATHU.rewards[TATHU.rewards.length - 1].to !== 0) err('Thưởng Tà Thú: mốc cuối phải là to: 0 (mọi người đạt % máu tối thiểu)');
// Theme phải có cả bảng màu (THEMES) lẫn cảnh nền (SCENES) trong maprender.js, và màu vùng trên bản đồ thế giới
{
  const fs = require('fs');
  const path = require('path');
  const src = clientSrc;
  // lấy khóa cấp 1 của một object literal "const NAME = { ... };" (đủ cho cách viết trong các file này)
  const keysOf = (code, name) => {
    const i = code.indexOf(`const ${name} = {`);
    if (i < 0) return null;
    const body = code.slice(i, code.indexOf('\n};', i));
    return new Set([...body.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]));
  };
  const mr = src('render/maprender.js');
  const wm = src('ui/worldmap.js');
  const thClient = keysOf(mr, 'THEMES');
  const scClient = keysOf(mr, 'SCENES');
  const wmRegion = new Set([...(wm.match(/const REGION = \{([\s\S]*?)\};/) || ['', ''])[1].matchAll(/([a-z_]+):/g)].map((m) => m[1]));
  for (const t of THEMES) {
    if (thClient && !thClient.has(t)) err(`Theme "${t}": thiếu trong THEMES của maprender.js`);
    if (scClient && !scClient.has(t)) err(`Theme "${t}": thiếu trong SCENES của maprender.js`);
    if (!wmRegion.has(t)) err(`Theme "${t}": thiếu màu vùng REGION trong worldmap.js`);
  }
  if (!thClient || !scClient) err('Không đọc được THEMES/SCENES trong maprender.js');
  // Thời trang + thú cưỡi: mã hình (look) phải có cách vẽ trong sprites.js và icon trong icons.js
  const sp = src('render/sprites.js');
  const ic = src('render/icons.js');
  const LOOKS = {
    mask: [keysOf(sp, 'MASKS'), keysOf(ic, 'MASK_ICONS')],
    cloak: [keysOf(sp, 'CLOAKS'), null],
    costume: [keysOf(sp, 'COSTUMES'), new Set([...((ic.match(/const COSTUME_ICON = \{([^\n]*)\};/) || ['', ''])[1].matchAll(/([a-z_]+):/g))].map((m) => m[1]))],
    mount: [keysOf(sp, 'MOUNTS'), keysOf(ic, 'MOUNT_ICONS')],
  };
  const PRICE_MAX = { mask: 300, cloak: 300, costume: 300, mount: 600 };
  for (const [id, it] of Object.entries(ITEMS)) {
    if (!it.fashion) continue;
    const where = `Thời trang ${id}`;
    const [draw, icon] = LOOKS[it.slot] || [];
    if (!draw || !draw.has(it.look)) err(`${where}: look "${it.look}" chưa có hình vẽ trong sprites.js`);
    if (icon && !icon.has(it.look)) err(`${where}: look "${it.look}" chưa có icon trong icons.js`);
    if (it.icon.k !== it.slot || it.icon.s !== it.look) err(`${where}: icon phải là { k: '${it.slot}', s: '${it.look}' }`);
    if (!(it.grade >= 1 && it.grade < RARITY.length)) err(`${where}: grade ${it.grade} ngoài 1-${RARITY.length - 1}`);
    if (!it.noUpgrade) err(`${where}: thời trang không được cường hóa (thiếu noUpgrade)`);
    if (it.slot === 'mount' && !(it.stats.spd >= 5 && it.stats.spd <= 40)) err(`${where}: thú cưỡi phải cộng 5-40% tốc chạy`);
    if (it.slot !== 'mount' && it.stats.spd) err(`${where}: chỉ thú cưỡi được cộng tốc chạy`);
    if (it.stats.expPct > 10 || it.stats.hpPct > 8 || it.stats.crit > 3 || it.stats.dodge > 3) err(`${where}: chỉ số vượt mức thời trang (expPct ≤ 10, hpPct ≤ 8, crit/dodge ≤ 3)`);
    const sold = Object.values(SHOPS).some((sh) => (sh.luong || []).includes(id));
    if (sold && !(it.priceLuong > 0 && it.priceLuong <= PRICE_MAX[it.slot])) err(`${where}: giá ${it.priceLuong} lượng ngoài 1-${PRICE_MAX[it.slot]}`);
    if (it.grade >= 4 && sold) err(`${where}: món Huyền thoại chỉ có từ rương/vòng quay, không bán`);
  }
  if (!LOOKS.mask[0] || !LOOKS.mount[0]) err('Không đọc được MASKS/MOUNTS trong sprites.js');
  const mounts = Object.values(ITEMS).filter((it) => it.slot === 'mount');
  if (new Set(mounts.map((it) => it.look)).size < 4) err('Thú cưỡi: cần ít nhất 4 loại hình khác nhau');
}
// Dữ liệu bản đồ gửi client (mobs/bosses dùng cho bản đồ thế giới và tìm đường)
for (const [id, cm] of Object.entries(clientMaps())) {
  if (!Array.isArray(cm.mobs) || !Array.isArray(cm.bosses)) { err(`Bản đồ ${id}: thiếu mobs/bosses gửi client`); continue; }
  if (new Set(cm.mobs).size !== cm.mobs.length) err(`Bản đồ ${id}: mobs bị trùng`);
  cm.mobs.forEach((m, i) => {
    if (!MONSTERS[m] || MONSTERS[m].boss) err(`Bản đồ ${id}: mobs chứa quái không hợp lệ "${m}"`);
    else if (i && MONSTERS[cm.mobs[i - 1]] && MONSTERS[cm.mobs[i - 1]].lv > MONSTERS[m].lv) err(`Bản đồ ${id}: mobs chưa sắp theo cấp`);
  });
  for (const b of cm.bosses) if (!MONSTERS[b.m] || !MONSTERS[b.m].boss || !Number.isFinite(b.x)) err(`Bản đồ ${id}: bosses không hợp lệ "${b.m}"`);
}

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
const bossDrops = new Set(Object.values(MONSTERS).filter((m) => m.boss).flatMap((m) => (m.drops || []).map(([d]) => d)));
for (const [id, sk] of Object.entries(SKILLS)) {
  if (!CLASSES[sk.cls]) err(`Kỹ năng ${id}: phái không tồn tại`);
  if (sk.type === 'passive') {
    // Nội tại: chỉ số hợp lệ, có sách đúng phái, sách bán trong cửa hàng lượng và rơi từ boss
    if (!sk.pas || !PASSIVE_STATS[sk.pas.stat] || !Array.isArray(sk.pas.v) || sk.pas.v.length !== 2) err(`Kỹ năng nội tại ${id}: pas.stat/pas.v không hợp lệ`);
    const bk = ITEMS[sk.book];
    if (!bk || bk.type !== 'book' || bk.skill !== id || bk.cls !== sk.cls) { err(`Kỹ năng nội tại ${id}: thiếu sách "${sk.book}" hoặc sách sai phái`); continue; }
    if (!Object.values(SHOPS).some((sh) => (sh.luong || []).includes(sk.book))) err(`Sách ${sk.book}: không bán trong cửa hàng lượng`);
    if (!bossDrops.has(sk.book)) err(`Sách ${sk.book}: không boss nào rơi`);
    if (sk.fx || sk.mp || sk.cd) err(`Kỹ năng nội tại ${id}: không được có fx/mp/cd`);
    continue;
  }
  if (!sk.fx || !FX_KINDS.has(sk.fx.k)) err(`Kỹ năng ${id}: fx.k "${sk.fx && sk.fx.k}" chưa có trong fx.js`);
  if (sk.fx && sk.fx.p && !PROJ.has(sk.fx.p)) err(`Kỹ năng ${id}: loại đạn "${sk.fx.p}" chưa có trong fx.js`);
  if (['single', 'aoe', 'line', 'dash'].includes(sk.type) && !sk.mul) err(`Kỹ năng ${id}: thiếu hệ số sát thương`);
}
for (const [id, it] of Object.entries(ITEMS)) {
  if (it.type === 'book' && (!SKILLS[it.skill] || SKILLS[it.skill].type !== 'passive' || SKILLS[it.skill].book !== id)) err(`Sách ${id}: không trỏ tới kỹ năng nội tại hợp lệ`);
}
if (RARITY.length !== 5) err('RARITY phải có 5 bậc');

// Hộp thư, giftcode, sự kiện theo mùa (extras.js)
{
  const DAY = 86400000;
  const vn = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? Date.parse(`${d}T00:00:00+07:00`) : NaN);
  const rewardOk = (r, where) => {
    if (!r || typeof r !== 'object') return err(`${where}: thiếu phần thưởng`);
    if ((r.xu || 0) < 0 || (r.luong || 0) < 0 || !(r.xu > 0 || r.luong > 0 || (r.items || []).length)) err(`${where}: phần thưởng trống hoặc âm`);
    for (const [id, q] of r.items || []) {
      itemRef(id, where);
      if (!(q >= 1)) err(`${where}: số lượng ${id} phải ≥ 1`);
    }
    if (r.days && !(r.days > 0 && r.days <= 90)) err(`${where}: days phải 1-90`);
    if (r.luong > 100) err(`${where}: thưởng quá 100 lượng mỗi lần`);
  };
  if (!(MAIL.max >= 10 && MAIL.max <= 100 && MAIL.keepDays >= 7 && MAIL.maxItems >= 1 && MAIL.maxItems <= 10)) err('Hộp thư: max 10-100, keepDays ≥ 7, maxItems 1-10');
  if (!(CODE_LIMIT.fails >= 3 && CODE_LIMIT.fails <= 10 && CODE_LIMIT.ipFails >= CODE_LIMIT.fails && CODE_LIMIT.window >= 30000)) err('Giftcode: CODE_LIMIT fails 3-10, ipFails ≥ fails, window ≥ 30 giây');
  for (const [code, g] of Object.entries(GIFTCODES)) {
    const where = `Giftcode ${code}`;
    if (!/^[A-Z0-9]{4,20}$/.test(code)) err(`${where}: mã phải gồm 4-20 chữ in hoa hoặc số`);
    if (g.from && Number.isNaN(vn(g.from))) err(`${where}: from "${g.from}" phải dạng YYYY-MM-DD`);
    if (Number.isNaN(vn(g.until))) err(`${where}: thiếu ngày hết hạn until dạng YYYY-MM-DD`);
    if (g.from && vn(g.from) > vn(g.until)) err(`${where}: from sau until`);
    if (g.lv && !(g.lv >= 1 && g.lv <= 120)) err(`${where}: lv ngoài 1-120`);
    rewardOk(g.reward, where);
  }
  const ids = new Set();
  const spans = [];
  for (const s of SEASONS) {
    const where = `Sự kiện ${s.id}`;
    if (!s.id || ids.has(s.id)) err(`${where}: id trống hoặc trùng`);
    ids.add(s.id);
    const a = vn(s.from);
    const b = vn(s.until) + DAY;
    if (Number.isNaN(a) || Number.isNaN(b) || a >= b) err(`${where}: from/until phải dạng YYYY-MM-DD và from ≤ until`);
    if (b - a > 92 * DAY) err(`${where}: kéo dài quá 92 ngày`);
    for (const [x, y, o] of spans) if (a < y && x < b) err(`${where}: trùng thời gian với ${o}`);
    spans.push([a, b, s.id]);
    if (!s.name || !s.desc) err(`${where}: thiếu tên hoặc mô tả`);
    const tok = ITEMS[s.token];
    if (!tok || tok.type !== 'event' || !tok.stack) err(`${where}: token "${s.token}" phải là vật phẩm type 'event' cộng dồn được`);
    const d = s.drop || {};
    if (!(d.rate > 0 && d.rate <= 0.2)) err(`${where}: tỉ lệ rơi phải 0-20%`);
    if (!(d.lvGap >= 0 && d.lvGap <= 30)) err(`${where}: lvGap phải 0-30`);
    for (const k of ['boss', 'event']) if (d[k] && !(d[k][0] >= 1 && d[k][1] >= d[k][0] && d[k][1] <= 50)) err(`${where}: drop.${k} phải [min, max] trong 1-50`);
    if (!Array.isArray(s.exchange) || !s.exchange.length) err(`${where}: thiếu bảng đổi quà`);
    const rows = new Set();
    for (const e of s.exchange || []) {
      const w = `${where} đổi "${e.id}"`;
      if (!/^[a-z0-9_]{1,20}$/.test(e.id || '') || rows.has(e.id)) err(`${w}: id trống, trùng hoặc có ký tự lạ`);
      rows.add(e.id);
      if (!(Number.isInteger(e.cost) && e.cost > 0)) err(`${w}: cost phải là số nguyên dương`);
      if (e.limit !== undefined && !(Number.isInteger(e.limit) && e.limit >= 1)) err(`${w}: limit phải là số nguyên ≥ 1`);
      rewardOk(e.reward, w);
      for (const [id] of e.reward.items || []) {
        const it = ITEMS[id];
        if (it && it.type === 'equip' && !e.limit) err(`${w}: trang bị/thời trang phải có limit`);
        if (it && it.fashion && !(e.reward.days > 0)) err(`${w}: thời trang đổi quà phải có hạn dùng (days)`);
        if (id === s.token) err(`${w}: không được đổi ra chính token`);
      }
    }
  }
  if (!NPC_TYPES.event) err('NPC_TYPES thiếu loại "event" (Sứ Giả Lễ Hội)');
  for (const [id, map] of Object.entries(MAPS)) {
    if (map.town && !map.instance && map.npcs.length && !map.npcs.some((n) => n.type === 'event')) err(`Làng ${id}: thiếu Sứ Giả Lễ Hội (NPC 'event')`);
  }
  const fs = require('fs');
  const path = require('path');
  const sp = clientSrc('render/sprites.js');
  const mr = clientSrc('render/maprender.js');
  const ic = clientSrc('render/icons.js');
  for (const t of Object.keys(NPC_TYPES)) {
    if (!new RegExp(`^ {2}${t}\\(sp(, pal)?\\) \\{`, 'm').test(sp)) err(`NPC ${t}: chưa có ngoại hình trong NPCS của sprites.js`);
    if (!new RegExp(`^ {2}${t}: \\{`, 'm').test(mr)) err(`NPC ${t}: chưa có nhà (SHOP) trong maprender.js`);
  }
  if (!/^ {2}mail: \[/m.test(ic)) err('Thiếu icon giao diện "mail" trong UI_MAPS (icons.js)');

  // Lôi đài xếp hạng: cấu hình, bản đồ phòng đấu, NPC đăng ký, thưởng tuần
  const A = ARENA || {};
  if (!(A.minLv >= 10 && A.minLv <= 120)) err('Lôi đài: minLv phải 10-120');
  if (!(A.elo >= 100 && A.k >= 8 && A.k <= 64)) err('Lôi đài: elo khởi đầu ≥ 100, hệ số k 8-64');
  const M = A.match || {};
  if (!(M.base > 0 && M.grow > 0 && M.growEvery >= 1000 && M.max >= M.base)) err('Lôi đài: match.base/grow > 0, growEvery ≥ 1 giây, max ≥ base');
  if (!(A.countdown >= 3000 && A.countdown <= 15000 && A.dur >= 60000 && A.dur <= 600000 && A.close >= 1000)) err('Lôi đài: đếm ngược 3-15 giây, trận 1-10 phút, close ≥ 1 giây');
  if (!(A.pairDaily >= 1 && A.daily >= 1 && A.weeklyMin >= 1)) err('Lôi đài: pairDaily, daily, weeklyMin phải ≥ 1');
  if (!(Number.isInteger(A.weeklyWin) && A.weeklyWin >= 0 && A.weeklyWin <= A.weeklyMin)) err('Lôi đài: weeklyWin phải là số nguyên 0..weeklyMin');
  if (!(A.dodgeLock >= 0 && A.dodgeLock <= 30 * 60000)) err('Lôi đài: dodgeLock (khóa đăng ký sau khi bỏ trận chưa giao đấu) phải 0-30 phút');
  for (const k of ['win', 'lose', 'draw']) if (!A[k] || !(A[k].xu >= 0 && A[k].fame >= 0)) err(`Lôi đài: thưởng trận ${k} thiếu xu/fame`);
  if (A.win && A.draw && A.lose && !(A.win.xu >= A.draw.xu && A.draw.xu >= A.lose.xu && A.win.fame >= A.draw.fame && A.draw.fame >= A.lose.fame)) err('Lôi đài: thưởng thắng ≥ hòa ≥ thua');
  (A.weekly || []).forEach((r, i) => {
    if (!(Number.isInteger(r.to) && r.to >= 1 && (!i || r.to > A.weekly[i - 1].to))) err(`Lôi đài thưởng tuần mốc ${i + 1}: to phải tăng dần`);
    if (i && (r.luong || 0) > (A.weekly[i - 1].luong || 0)) err(`Lôi đài thưởng tuần mốc ${i + 1}: hạng thấp không được nhiều lượng hơn hạng cao`);
    rewardOk(r, `Lôi đài thưởng tuần mốc ${i + 1}`);
  });
  if (!(A.weekly || []).length) err('Lôi đài: thiếu thưởng tuần');
  const ld = MAPS.loidai;
  if (!ld || !ld.instance || !ld.arena || ld.portals.length || ld.spawns.length || ld.npcs.length) err('Bản đồ loidai: phải là phó bản (instance, arena), không cổng, không quái, không NPC');
  if (ld && ld.platforms.some(([x, , w]) => x < 40 || x + w > ld.w - 40)) err('Bản đồ loidai: bục nằm ngoài sàn đấu');
  if (!Object.values(MAPS).some((m) => !m.instance && m.npcs.some((n) => n.type === 'arena'))) err('Lôi đài: chưa đặt NPC loại "arena" (Võ Sư) ở bản đồ nào');
  for (const m of Object.values(MAPS)) if (m.arena && !m.instance) err(`Bản đồ ${m.id}: cờ arena chỉ dùng cho phòng đấu (instance)`);
}

// Âm thanh: mỗi theme có nhạc, mỗi kỹ năng chủ động và chiêu boss có tiếng tổng hợp
{
  const ID = /^[a-z0-9_]+$/;
  const ids = [AUDIO.MUSIC_DEFAULT, ...Object.values(AUDIO.MUSIC_THEME), ...Object.values(AUDIO.MUSIC_SCENE), ...Object.values(AUDIO.SKILL_SFX),
    ...Object.values(AUDIO.FX_SFX), ...Object.values(AUDIO.EVENT_SFX), ...Object.values(AUDIO.BOSS_SFX)];
  for (const id of ids) if (typeof id !== 'string' || !ID.test(id)) err(`Âm thanh: id file "${id}" không hợp lệ (chỉ a-z, 0-9, _)`);
  for (const t of THEMES) if (!AUDIO.MUSIC_THEME[t]) err(`Âm thanh: theme "${t}" chưa có nhạc nền trong MUSIC_THEME (audio.js)`);
  for (const t in AUDIO.MUSIC_THEME) if (!THEMES.has(t)) err(`Âm thanh: MUSIC_THEME có theme lạ "${t}"`);
  for (const [sid, sk] of Object.entries(SKILLS)) {
    if (sk.type === 'passive') continue;
    if (!AUDIO.SKILL_SFX[sid] && !(sk.fx && AUDIO.FX_SFX[sk.fx.k])) err(`Âm thanh: kỹ năng ${sid} chưa có tiếng (SKILL_SFX hoặc FX_SFX["${sk.fx && sk.fx.k}"])`);
  }
  for (const sid in AUDIO.SKILL_SFX) if (!SKILLS[sid]) err(`Âm thanh: SKILL_SFX có kỹ năng lạ "${sid}"`);
  for (const m of Object.values(MONSTERS)) for (const bs of m.skills || []) if (!AUDIO.BOSS_SFX[bs.k]) err(`Âm thanh: chiêu boss "${bs.k}" (${m.name}) chưa có tiếng trong BOSS_SFX`);
  const fs = require('fs');
  const path = require('path');
  // tiếng hiệu ứng tổng hợp bằng WebAudio: mọi id tiếng trong bảng và mọi sfx('...') phải có công thức trong RECIPES (core/sound.js)
  const snd = fs.readFileSync(path.join(CLIENT_JS, 'core', 'sound.js'), 'utf8');
  const rec = snd.slice(snd.indexOf('const RECIPES = {'), snd.indexOf('\n};', snd.indexOf('const RECIPES = {')));
  const have = new Set([...rec.matchAll(/^ {2}([a-z0-9_]+): \[/gm)].map((m) => m[1]));
  const alias = snd.match(/const ALIAS = \{([^}]*)\}/);
  if (alias) for (const m of alias[1].matchAll(/([a-z_]+): '([a-z0-9_]+)'/g)) if (have.has(m[2])) have.add(m[1]);
  const sfxIds = new Set([...Object.values(AUDIO.SKILL_SFX), ...Object.values(AUDIO.FX_SFX), ...Object.values(AUDIO.EVENT_SFX), ...Object.values(AUDIO.BOSS_SFX)]);
  const clientJs = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? clientJs(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
  for (const f of clientJs(CLIENT_JS)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bsfx\('([a-z0-9_]+)'\)/g)) sfxIds.add(AUDIO.EVENT_SFX[m[1]] || m[1]);
  for (const id of sfxIds) if (!have.has(id)) err(`Âm thanh: tiếng "${id}" chưa có công thức tổng hợp trong RECIPES (src/client/js/core/sound.js)`);
}

// Xu khóa: thưởng xu (trao thành xu khóa) phải là số nguyên không âm
{
  const bad = (v) => v != null && !(Number.isInteger(v) && v >= 0);
  for (const [k, g] of Object.entries(GIFTCODES)) if (g.reward && bad(g.reward.xu)) err(`Giftcode ${k}: reward.xu phải là số nguyên ≥ 0`);
  CHECKIN.forEach((r, i) => { if (bad(r.xu)) err(`Điểm danh ngày ${i + 1}: xu phải là số nguyên ≥ 0`); });
  for (const s of SEASONS) for (const e of s.exchange || []) if (e.reward && bad(e.reward.xu)) err(`Lễ hội ${s.id}/${e.id}: reward.xu phải là số nguyên ≥ 0`);
}

// Cân bằng: quái/boss so với người chơi trung bình cùng cấp (mô hình trong tools/balance.js, dải ở DESIGN_RULES mục 9)
{
  const { mobRows, bossRows } = require('./balance');
  const pc = (x) => `${(x * 100).toFixed(1)}%`;
  for (const r of mobRows()) {
    if (!(r.hitK >= 0.015 && r.hitK <= 0.07)) err(`Cân bằng: quái ${r.id} (cấp ${r.lv}) đánh Kiếm trung bình ${pc(r.hitK)} HP/đòn, cần 1,5-7%`);
    if (!(r.hitsToKill >= 2 && r.hitsToKill <= 8.5)) err(`Cân bằng: quái ${r.id} cần ${r.hitsToKill.toFixed(1)} đòn thường, cần 2-8,5`);
  }
  for (const r of bossRows()) {
    if (r.skillC > 0.47) err(`Cân bằng: boss ${r.id} chiêu ${r.skill} lấy ${pc(r.skillC)} HP Cung trung bình, tối đa 47%`);
    if (r.event) {
      if (r.eventMin[1] > 15) err(`Cân bằng: Tà Thú ${r.id} 1 người mất ${r.eventMin[1].toFixed(1)} phút, tối đa 15`);
      if (r.eventMin[10] < 2) err(`Cân bằng: Tà Thú ${r.id} 10 người chỉ ${r.eventMin[10].toFixed(1)} phút, tối thiểu 2`);
    } else {
      if (!(r.hitK >= 0.04 && r.hitK <= 0.18)) err(`Cân bằng: boss ${r.id} đánh thường ${pc(r.hitK)} HP Kiếm, cần 4-18%`);
      if (!(r.soloMin >= 2 && r.soloMin <= 6)) err(`Cân bằng: boss ${r.id} solo ${r.soloMin.toFixed(1)} phút, cần 2-6`);
    }
  }
}

// Atlas ảnh ×3 (DESIGN_RULES mục 11): src/client/art/<nhóm>/<id>.png + .json
const ART_DIR = require('path').join(__dirname, '..', 'src', 'client', 'art');
const ART_MAX_KB = { monster: 200, boss: 400 };
const atlasOk = [];
{
  const fs = require('fs');
  const path = require('path');
  const { checkAtlas } = require('./lib/atlas');
  const credits = fs.existsSync(path.join(ART_DIR, 'CREDITS.md')) ? fs.readFileSync(path.join(ART_DIR, 'CREDITS.md'), 'utf8') : '';
  const atlasIds = new Set();
  for (const grp of fs.existsSync(ART_DIR) ? fs.readdirSync(ART_DIR) : []) {
    const dir = path.join(ART_DIR, grp);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (!ART_MAX_KB[grp]) { err(`Atlas: nhóm "${grp}" chưa có luật kiểm (monster, boss)`); continue; }
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const m = f.match(/^([a-z0-9_]+)\.(png|json)$/);
      if (!m) { err(`Atlas ${grp}/${f}: tên file phải là <id>.png hoặc <id>.json`); continue; }
      if (!files.includes(`${m[1]}.${m[2] === 'png' ? 'json' : 'png'}`)) err(`Atlas ${grp}/${f}: thiếu file ${m[2] === 'png' ? '.json' : '.png'} đi kèm`);
      if (m[2] !== 'json' || !files.includes(`${m[1]}.png`)) continue;
      const id = m[1];
      const key = `${grp}/${id}`;
      const def = MONSTERS[id];
      if (!def) { err(`Atlas ${key}: không có quái "${id}"`); continue; }
      if (!!def.boss !== (grp === 'boss')) err(`Atlas ${key}: ${def.boss ? 'boss phải nằm ở art/boss/' : 'quái thường phải nằm ở art/monster/'}`);
      let meta;
      try {
        meta = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (e) {
        err(`Atlas ${key}: JSON lỗi (${e.message})`);
        continue;
      }
      const es = checkAtlas(fs.readFileSync(path.join(dir, `${id}.png`)), meta, { maxColors: 40, maxBytes: ART_MAX_KB[grp] * 1024 });
      for (const e of es) err(`Atlas ${key}: ${e}`);
      // monsterHeight = h / 3 (danh mục gửi máy khách); giữ trong khoảng hợp lý so với hitbox để nhãn tên và thanh máu không lệch
      const wh = meta.h / 3;
      if (!(wh >= def.h * 0.9 && wh <= def.h * 2.2)) err(`Atlas ${key}: cao ${wh} đơn vị thế giới (h ${meta.h} / 3), cần 0.9-2.2 lần hitbox ${def.h}`);
      if (!new RegExp(`^\\| ${key} \\| @cf/[^|]+ \\| \\d+ \\| \\d{4}-\\d{2}-\\d{2} \\|`, 'm').test(credits)) err(`Atlas ${key}: thiếu dòng nguồn (model, seed, ngày) trong src/client/art/CREDITS.md`);
      atlasIds.add(id);
      if (!es.length) atlasOk.push(key);
    }
  }
  // cùng một bản đồ không được nửa hình code nửa atlas ×3 (mục 0.4, 11)
  for (const [mid, map] of Object.entries(MAPS)) {
    const ids = [...new Set([...(map.spawns || []).map((s) => s.m), ...(map.boss || []).map((b) => b.m)])];
    const have = ids.filter((id) => atlasIds.has(id));
    if (have.length && have.length < ids.length) err(`Atlas: bản đồ ${mid} có ${have.join(', ')} vẽ ×3 nhưng ${ids.filter((id) => !atlasIds.has(id)).join(', ')} chưa có atlas`);
  }
}

// Điểm hồi sinh "Về làng" (rv): phải là làng (town) có thật, không đặt trên làng hay phó bản
for (const id in MAPS) {
  const rv = MAPS[id].rv;
  if (rv === undefined) continue;
  if (!MAPS[rv] || !MAPS[rv].town) err(`Bản đồ ${id}: rv "${rv}" không phải làng có thật`);
  if (MAPS[id].town || MAPS[id].instance) err(`Bản đồ ${id}: làng/phó bản không đặt rv`);
}

if (errors.length) {
  console.log(errors.map((e) => `✘ ${e}`).join('\n'));
  console.log(`\nDỮ LIỆU CÓ ${errors.length} LỖI`);
  process.exit(1);
}
console.log(`✔ Dữ liệu hợp lệ: ${Object.keys(ITEMS).length} vật phẩm, ${Object.keys(MONSTERS).length} quái, ${Object.keys(MAPS).length} bản đồ, ${MAIN_QUESTS.length} nhiệm vụ, ${Object.keys(SKILLS).length} kỹ năng`);
console.log(`✔ Atlas ×3: ${atlasOk.length} atlas hợp lệ (đủ khóa, đủ 5 hoạt ảnh idle/walk/atk/hit/die, ≤ 40 màu, viền ngoài #1d1424, cao h / 3 khớp monsterHeight, có nguồn trong CREDITS.md)${atlasOk.length ? ': ' + atlasOk.join(', ') : ''}`);
