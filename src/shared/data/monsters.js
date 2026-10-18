'use strict';

const { SKILLS } = require('./skills');

// type = kiểu sprite phía client: slime, bunny, mushroom, imp, flyer, humanoid, crab, golem, ghost, beast, snowman
// pal  = bảng màu [chính, phụ, điểm nhấn]
const LIST = [
  ['slime', 'Slime Xanh', 1, 'slime', ['#7cd96a', '#3f9a37', '#1b3b17'], null, 0, []],
  ['bunny', 'Thỏ Rừng', 3, 'bunny', ['#f4efe6', '#d8b4ac', '#ff8fa3'], null, 0, []],
  ['mushroom', 'Nấm Độc', 5, 'mushroom', ['#d84343', '#f3e6c8', '#ffffff'], null, 0, [['nam_doc', 0.45]]],
  ['monkey', 'Khỉ Trúc', 7, 'imp', ['#8d5a32', '#d9a066', '#3a2414'], 'wind', 0, []],
  ['bee', 'Ong Bắp Cày', 9, 'flyer', ['#ffcc33', '#2b2b2b', '#e8f4ff'], 'wind', 1, [['mat_ong', 0.4]]],
  ['bandit', 'Sơn Tặc', 11, 'humanoid', ['#6d4c41', '#8d6e63', '#3e2723'], 'fire', 1, []],
  ['crab', 'Cua Đá', 13, 'crab', ['#ff7043', '#ffab91', '#3e2723'], 'water', 0, [['vo_cua', 0.4]]],
  ['crab2', 'Cua Hoàng Đế', 15, 'crab', ['#7e57c2', '#b39ddb', '#1a0f33'], 'water', 1, [['vo_cua', 0.3]]],
  ['pirate', 'Hải Tặc', 17, 'humanoid', ['#1e3a5f', '#eceff1', '#c62828'], 'water', 1, []],
  ['bat', 'Dơi Hang', 19, 'flyer', ['#5e35b1', '#311b92', '#ff5252'], 'wind', 1, []],
  ['skeleton', 'Bộ Xương', 22, 'humanoid', ['#eeeeee', '#bdbdbd', '#212121'], 'fire', 1, [['xuong', 0.4]]],
  ['rockgolem', 'Thạch Nhân', 24, 'golem', ['#8d8d8d', '#5f5f5f', '#ffeb3b'], 'water', 0, []],
  ['scorpion', 'Bọ Cạp Cát', 26, 'crab', ['#e0a84a', '#fbe0a0', '#4e342e'], 'fire', 1, [['cat_vang', 0.35]]],
  ['sandbandit', 'Đạo Tặc Sa Mạc', 29, 'humanoid', ['#d7b56d', '#8d6e63', '#bf360c'], 'fire', 1, [], 1],
  ['mummy', 'Xác Ướp', 31, 'humanoid', ['#e8dcb5', '#bfae82', '#4caf50'], 'wind', 1, []],
  ['wolf', 'Sói Xám', 33, 'beast', ['#8a8f96', '#d0d4d8', '#ff5252'], 'wind', 1, [['long_soi', 0.4]]],
  ['ghost', 'U Linh', 36, 'ghost', ['#c5d5ff', '#8fa4e8', '#1a237e'], 'water', 1, [], 1],
  ['rogue', 'Ninja Lang Thang', 39, 'humanoid', ['#263238', '#b71c1c', '#eceff1'], 'fire', 1, []],
  ['snowman', 'Người Tuyết', 42, 'snowman', ['#fafafa', '#90a4ae', '#ff7043'], 'water', 0, []],
  ['icewolf', 'Sói Băng', 45, 'beast', ['#e3f2fd', '#90caf9', '#0d47a1'], 'water', 1, []],
  ['yeti', 'Bạch Viên', 48, 'golem', ['#f5f5f5', '#bdbdbd', '#4fc3f7'], 'water', 1, []],
  ['icegolem', 'Băng Nhân', 52, 'golem', ['#80deea', '#26c6da', '#e0f7fa'], 'water', 0, [['tinh_the_bang', 0.35]]],
  ['frostghost', 'Hồn Băng', 55, 'ghost', ['#b2ebf2', '#4dd0e1', '#006064'], 'water', 1, [], 1],
  ['iceninja', 'Ninja Băng', 58, 'humanoid', ['#e1f5fe', '#4fc3f7', '#01579b'], 'water', 1, []],
  ['oni', 'Quỷ Đỏ', 62, 'imp', ['#d32f2f', '#ffcdd2', '#212121'], 'fire', 1, [['sung_quy', 0.35]]],
  ['demonbat', 'Ma Dơi', 65, 'flyer', ['#b71c1c', '#212121', '#ffeb3b'], 'fire', 1, []],
  ['shadow', 'Ảnh Ninja', 68, 'humanoid', ['#1a1a2e', '#6a1b9a', '#e040fb'], 'wind', 1, []],
  ['lavagolem', 'Dung Nham Nhân', 72, 'golem', ['#ff6f00', '#4e342e', '#ffeb3b'], 'fire', 1, []],
  ['fireghost', 'Hỏa Hồn', 76, 'ghost', ['#ffab40', '#ff6d00', '#bf360c'], 'fire', 1, [], 1],
  ['samurai', 'Quỷ Võ Sĩ', 79, 'humanoid', ['#4a0d0d', '#b71c1c', '#ffd54f'], 'fire', 1, []],
  ['hellhound', 'Địa Ngục Khuyển', 83, 'beast', ['#212121', '#d50000', '#ff9100'], 'fire', 1, []],
  ['deathknight', 'Tử Thần Kỵ Sĩ', 88, 'humanoid', ['#1b1b1b', '#2e7d32', '#76ff03'], 'wind', 1, []],
  ['darkdragon', 'Hắc Long', 95, 'beast', ['#311b92', '#7c4dff', '#ff1744'], 'wind', 1, [], 0, 1.6],
  // Vườn Anh Đào (nhánh phụ cấp 14-20)
  ['flowerfairy', 'Hoa Tiên Tử', 14, 'flyer', ['#f48fb1', '#fce4ec', '#ad1457'], 'wind', 0, [['canh_hoa', 0.4]]],
  ['treant', 'Mộc Tinh', 17, 'golem', ['#6d8b3a', '#4e342e', '#f8bbd0'], 'wind', 0, []],
  ['foxspirit', 'Hồ Ly Tinh', 19, 'beast', ['#ff8f00', '#fff3e0', '#d50000'], 'fire', 1, []],
  // Phế Tích Cổ (nhánh phụ cấp 34-40)
  ['stoneguard', 'Tượng Đá Cổ', 35, 'golem', ['#bcaaa4', '#795548', '#ffd54f'], 'water', 0, [['manh_tuong', 0.4]]],
  ['cursedmummy', 'Xác Ướp Nguyền', 37, 'humanoid', ['#d7ccc8', '#8d6e63', '#7cb342'], 'wind', 1, []],
  ['sandworm', 'Sa Trùng', 39, 'beast', ['#d4a24c', '#fff8e1', '#6d4c41'], 'fire', 1, []],
  // Hang Pha Lê (nhánh phụ cấp 56-62)
  ['crystalgolem', 'Pha Lê Nhân', 56, 'golem', ['#9575cd', '#d1c4e9', '#e040fb'], 'water', 0, [['tinh_the_tim', 0.35]]],
  ['crystalbat', 'Dơi Pha Lê', 59, 'flyer', ['#4dd0e1', '#006064', '#e0f7fa'], 'water', 1, []],
  ['gemcrab', 'Cua Ngọc', 61, 'crab', ['#00bfa5', '#a7ffeb', '#004d40'], 'water', 1, []],
  // Thiên Cung (cấp 95-105)
  ['celestial', 'Thiên Binh', 96, 'humanoid', ['#fff8e1', '#ffd600', '#5d4037'], 'fire', 1, []],
  ['cloudspirit', 'Vân Linh', 100, 'ghost', ['#ffffff', '#b3e5fc', '#0277bd'], 'wind', 1, [], 1],
  ['thunderbird', 'Lôi Điểu', 103, 'flyer', ['#ffeb3b', '#1a237e', '#ffffff'], 'wind', 1, [['long_vu', 0.35]]],
  // Ma Giới (cấp 105-112)
  ['abyssdemon', 'Ma Giới Quỷ', 106, 'imp', ['#4a148c', '#ce93d8', '#ff1744'], 'fire', 1, [['hon_ma', 0.35]]],
  ['bonedragon', 'Cốt Long', 109, 'beast', ['#eceff1', '#78909c', '#76ff03'], 'wind', 1, [], 0, 1.4],
  ['voidknight', 'Hư Không Kỵ Sĩ', 112, 'humanoid', ['#0d0d1a', '#651fff', '#00e5ff'], 'water', 1, []],
  // Long Cung (cấp 113-120)
  ['seaserpent', 'Hải Xà', 114, 'beast', ['#00897b', '#80cbc4', '#ffd600'], 'water', 1, [['vay_rong', 0.35]]],
  ['coralgolem', 'San Hô Nhân', 117, 'golem', ['#ff7043', '#ffccbc', '#00e5ff'], 'water', 1, []],
  ['dragonguard', 'Long Vệ', 120, 'humanoid', ['#004d40', '#1de9b6', '#ffd600'], 'water', 1, []],
];

// Boss thế giới
const BOSSES = [
  ['boss_slime', 'Vua Slime', 12, 'slime', ['#4caf50', '#1b5e20', '#ffd600'], 'water', 2.6],
  ['boss_bat', 'Dơi Chúa', 28, 'flyer', ['#4a148c', '#12005e', '#ff1744'], 'wind', 2.3],
  ['boss_wolf', 'Lang Vương', 42, 'beast', ['#455a64', '#cfd8dc', '#ff1744'], 'wind', 2.0],
  ['boss_yeti', 'Tuyết Quái Vương', 62, 'golem', ['#ffffff', '#b3e5fc', '#0091ea'], 'water', 1.9],
  ['boss_oni', 'Quỷ Vương', 85, 'imp', ['#b71c1c', '#ffccbc', '#ffd600'], 'fire', 2.6],
  ['boss_god', 'Ma Thần', 100, 'humanoid', ['#120024', '#6200ea', '#ff1744'], 'wind', 2.3],
  ['boss_fox', 'Cửu Vĩ Hồ', 22, 'beast', ['#ff6d00', '#fff8e1', '#d50000'], 'fire', 2.0],
  ['boss_pharaoh', 'Pharaoh Phục Sinh', 42, 'humanoid', ['#ffd54f', '#1565c0', '#4e342e'], 'fire', 2.3],
  ['boss_crystal', 'Tinh Thể Vương', 66, 'golem', ['#7c4dff', '#e1bee7', '#00e5ff'], 'water', 1.9],
  ['boss_heaven', 'Thiên Ma', 112, 'humanoid', ['#000000', '#ff1744', '#ffd600'], 'fire', 2.4],
  ['boss_dragon', 'Long Vương', 125, 'beast', ['#006064', '#4dd0e1', '#ffd600'], 'water', 2.6],
  // Boss sự kiện Tà Thú Xuất Thế: không đặt cố định trên bản đồ, world.js gọi ra theo lịch
  ['ev_hacviem', 'Hắc Viêm Tà Thú', 32, 'beast', ['#2b1a24', '#ff6d00', '#ffe082'], 'fire', 2.4, 1],
  ['ev_bangphach', 'Băng Phách Tà Thú', 60, 'golem', ['#3d5a80', '#98c1d9', '#e0fbfc'], 'water', 2.1, 1],
  ['ev_huyetnguyet', 'Huyết Nguyệt Tà Thú', 95, 'imp', ['#3b0a1e', '#f8bbd0', '#ff1744'], 'wind', 2.5, 1],
];

// Chiêu boss. shape: circle (vòng quanh boss), line (dải từ boss theo hướng mục tiêu, r = chiều dài),
// pillar (cột sáng giáng xuống chỗ đứng người chơi, extra.n cột). windup = thời gian niệm (ms) để người chơi chạy ra.
// ground: chỉ trúng người đứng sát mặt đất (nhảy lên né được). extra: summon { m, n }, roar { slow (% tốc chạy), dur (ms) }.
const quake = (r, mul, o) => ({ name: 'Địa Chấn', k: 'quake', shape: 'circle', r, windup: 1400, cd: 9000, mul, ground: true, ...o });
const fissure = (r, mul, o) => ({ name: 'Liệt Địa', k: 'quake', shape: 'line', r, windup: 1200, cd: 10000, mul, w: 18, ...o });
const roar = (r, slow, o) => ({ name: 'Kinh Hồn Hống', k: 'roar', shape: 'circle', r, windup: 1000, cd: 15000, mul: 0.6, extra: { slow, dur: 3000 }, ...o });
const summon = (m, n, o) => ({ name: 'Triệu Hồi', k: 'summon', shape: 'circle', r: 46, windup: 1300, cd: 20000, mul: 0, extra: { m, n }, ...o });
const beam = (r, mul, o) => ({ name: 'Quang Tuyến', k: 'beam', shape: 'line', r, windup: 1100, cd: 9000, mul, w: 16, ...o });
const pillar = (n, mul, o) => ({ name: 'Thiên Trụ', k: 'beam', shape: 'pillar', r: 24, windup: 1300, cd: 12000, mul, extra: { n }, ...o });
const nova = (r, mul, o) => ({ name: 'Bạo Liệt', k: 'nova', shape: 'circle', r, windup: 1800, cd: 16000, mul, ...o });

const BOSS_SKILLS = {
  boss_slime: [quake(90, 1.5), summon('slime', 3)],
  boss_fox: [beam(220, 1.6, { name: 'Hồ Hỏa Tuyến' }), pillar(2, 1.5, { name: 'Hồ Hỏa Trụ' }), roar(130, 35)],
  boss_bat: [roar(140, 40, { name: 'Âm Ba Thét' }), summon('bat', 3)],
  boss_wolf: [fissure(230, 1.7, { name: 'Lang Trảo' }), roar(130, 40, { name: 'Lang Hống' })],
  boss_pharaoh: [pillar(3, 1.6, { name: 'Thái Dương Trụ' }), summon('mummy', 3), nova(130, 2.0, { name: 'Sa Bạo' })],
  boss_yeti: [quake(110, 1.8), roar(150, 45, { name: 'Băng Hống' })],
  boss_crystal: [pillar(3, 1.7, { name: 'Pha Lê Trụ' }), nova(140, 2.0, { name: 'Tinh Bạo' })],
  boss_oni: [quake(100, 1.8), beam(260, 1.9, { name: 'Quỷ Hỏa Tuyến' }), summon('oni', 2)],
  boss_god: [nova(150, 2.2, { name: 'Ma Thần Bạo' }), pillar(4, 1.8, { name: 'Hắc Lôi Trụ' }), beam(280, 2.0)],
  boss_heaven: [pillar(4, 1.9, { name: 'Thiên Phạt' }), nova(160, 2.0), roar(160, 45)],
  boss_dragon: [beam(300, 1.8, { name: 'Long Tức' }), quake(120, 1.8, { name: 'Long Chấn' }), summon('seaserpent', 2)],
  ev_hacviem: [beam(260, 1.8, { name: 'Hắc Viêm Tuyến' }), quake(110, 1.8, { name: 'Viêm Chấn' }), roar(150, 40, { name: 'Tà Hống' })],
  ev_bangphach: [pillar(4, 1.8, { name: 'Băng Phách Trụ' }), quake(120, 1.8, { name: 'Băng Chấn' }), summon('icewolf', 2)],
  ev_huyetnguyet: [nova(160, 2.0, { name: 'Huyết Nguyệt Bạo' }), pillar(4, 1.9, { name: 'Huyết Trụ' }), roar(160, 45, { name: 'Tà Hống' })],
};
// Cuồng nộ khi máu dưới 30%: hồi chiêu và đánh thường nhanh hơn, niệm chiêu ngắn hơn (vẫn đủ thời gian chạy ra)
const RAGE = { hp: 0.3, cd: 0.6, windup: 0.85, atkCd: 0.75, speed: 1.2 };

// Sách nội tại cấp yêu cầu req của mọi phái, mỗi cuốn tỉ lệ ch (6 phái: tổng khoảng 6·ch có ít nhất 1 cuốn)
const books = (req, ch) => Object.keys(SKILLS).filter((id) => SKILLS[id].type === 'passive' && SKILLS[id].req === req).map((id) => [SKILLS[id].book, ch]);

// Vật phẩm đặc biệt boss rơi thêm (ngoài trang bị, đá, rương)
const BOSS_DROPS = {
  boss_slime: [...books(15, 0.02)],
  boss_fox: [['pet_fox', 0.1], ...books(15, 0.03)],
  boss_bat: [...books(15, 0.03)],
  boss_wolf: [...books(15, 0.02), ...books(35, 0.025)],
  boss_pharaoh: [...books(15, 0.02), ...books(35, 0.025)],
  boss_yeti: [...books(35, 0.03), ...books(50, 0.02)],
  boss_crystal: [...books(35, 0.03), ...books(50, 0.02)],
  boss_oni: [...books(35, 0.02), ...books(50, 0.03)],
  boss_god: [['stone4', 1], ...books(50, 0.035)],
  boss_heaven: [['stone4', 1], ['pet_ghost', 0.1], ...books(50, 0.035)],
  boss_dragon: [['stone4', 1], ['pet_dragon', 0.25], ...books(50, 0.035)],
  ev_hacviem: [...books(15, 0.03), ...books(35, 0.02)],
  ev_bangphach: [...books(35, 0.03), ...books(50, 0.02)],
  ev_huyetnguyet: [['stone4', 1], ...books(50, 0.035)],
};

const SIZES = {
  slime: [16, 12], bunny: [14, 14], mushroom: [14, 16], imp: [14, 18], flyer: [18, 12], humanoid: [12, 22],
  crab: [20, 12], golem: [20, 26], ghost: [16, 20], beast: [24, 14], snowman: [16, 22],
};

function baseStats(lv) {
  return {
    hp: Math.round(40 + lv * lv * 2 + lv * 20),
    // công tăng theo bình phương để theo kịp thủ người chơi khi có ngọc/thời trang/nội tại/thú
    atk: Math.round(8 + lv * 6 + 0.12 * lv * lv),
    def: Math.round(lv * 1.5),
    exp: Math.round(10 + lv * 8),
  };
}

const MONSTERS = {};
for (const [id, name, lv, type, pal, el, aggro, drops, ranged, scale] of LIST) {
  const s = baseStats(lv);
  const sz = SIZES[type];
  MONSTERS[id] = {
    name, lv, type, pal, el, aggro: !!aggro, drops, ranged: !!ranged, scale: scale || 1,
    hp: Math.round(s.hp * (scale || 1)), atk: s.atk, def: s.def, exp: Math.round(s.exp * (scale || 1)),
    speed: type === 'flyer' || type === 'beast' ? 55 : type === 'golem' || type === 'snowman' ? 30 : 42,
    atkRange: ranged ? 120 : 26, atkCd: ranged ? 2000 : 1600, respawn: 6000,
    w: Math.round(sz[0] * (scale || 1)), h: Math.round(sz[1] * (scale || 1)),
    fly: type === 'flyer' || type === 'ghost',
  };
}
// Tà Thú: hệ số HP theo n = số người online đủ cấp lúc xuất hiện (1..20). 1 người ~8-10 phút, 10 người ~3 phút
const EVENT_HP = { base: 300, per: 120, cap: 20 };
function eventHpMul(n) {
  const k = Math.max(1, Math.min(EVENT_HP.cap, Math.floor(Number(n) || 1)));
  return EVENT_HP.base + EVENT_HP.per * k;
}
// Hệ số boss so với quái thường cùng cấp (DESIGN_RULES mục 9). Tà Thú: HP theo số người online lúc xuất hiện
// (eventHpMul, module events đặt lại maxHp), giá trị ở đây là mức 1 người để dữ liệu tĩnh và lệnh admin luôn hợp lệ.
const BOSS_MUL = { hp: 150, atk: 1.5, def: 1.6, exp: 60 };
const EVENT_MUL = { atk: 1.5, def: 1.6, exp: 150 };

for (const [id, name, lv, type, pal, el, scale, event] of BOSSES) {
  const s = baseStats(lv);
  const sz = SIZES[type];
  MONSTERS[id] = {
    name, lv, type, pal, el, aggro: true, boss: true, event: !!event, ranged: false, scale,
    hp: Math.round(s.hp * (event ? eventHpMul(1) : BOSS_MUL.hp)),
    atk: Math.round(s.atk * (event ? EVENT_MUL.atk : BOSS_MUL.atk)),
    def: Math.round(s.def * (event ? EVENT_MUL.def : BOSS_MUL.def)),
    exp: Math.round(s.exp * (event ? EVENT_MUL.exp : BOSS_MUL.exp)),
    baseHp: s.hp,
    speed: 45, atkRange: 40 * scale * 0.6, atkCd: 1500, aoe: 60 * scale * 0.5, respawn: 10 * 60 * 1000,
    w: Math.round(sz[0] * scale), h: Math.round(sz[1] * scale), fly: type === 'flyer' || type === 'ghost',
    drops: BOSS_DROPS[id] || [], skills: BOSS_SKILLS[id] || [],
  };
}

module.exports = { MONSTERS, RAGE, baseStats, eventHpMul, EVENT_HP, BOSS_MUL, EVENT_MUL };
