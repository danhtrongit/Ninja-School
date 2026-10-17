'use strict';

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
];

// Boss thế giới
const BOSSES = [
  ['boss_slime', 'Vua Slime', 12, 'slime', ['#4caf50', '#1b5e20', '#ffd600'], 'water', 2.6],
  ['boss_bat', 'Dơi Chúa', 28, 'flyer', ['#4a148c', '#12005e', '#ff1744'], 'wind', 2.3],
  ['boss_wolf', 'Lang Vương', 42, 'beast', ['#455a64', '#cfd8dc', '#ff1744'], 'wind', 2.0],
  ['boss_yeti', 'Tuyết Quái Vương', 62, 'golem', ['#ffffff', '#b3e5fc', '#0091ea'], 'water', 1.9],
  ['boss_oni', 'Quỷ Vương', 85, 'imp', ['#b71c1c', '#ffccbc', '#ffd600'], 'fire', 2.6],
  ['boss_god', 'Ma Thần', 100, 'humanoid', ['#120024', '#6200ea', '#ff1744'], 'wind', 2.3],
];

const SIZES = {
  slime: [16, 12], bunny: [14, 14], mushroom: [14, 16], imp: [14, 18], flyer: [18, 12], humanoid: [12, 22],
  crab: [20, 12], golem: [20, 26], ghost: [16, 20], beast: [24, 14], snowman: [16, 22],
};

function baseStats(lv) {
  return {
    hp: Math.round(40 + lv * lv * 2 + lv * 20),
    atk: Math.round(8 + lv * 5),
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
for (const [id, name, lv, type, pal, el, scale] of BOSSES) {
  const s = baseStats(lv);
  const sz = SIZES[type];
  MONSTERS[id] = {
    name, lv, type, pal, el, aggro: true, boss: true, ranged: false, scale,
    hp: Math.round(s.hp * 45), atk: Math.round(s.atk * 2.2), def: Math.round(s.def * 1.6), exp: Math.round(s.exp * 40),
    speed: 45, atkRange: 40 * scale * 0.6, atkCd: 1500, aoe: 60 * scale * 0.5, respawn: 10 * 60 * 1000,
    w: Math.round(sz[0] * scale), h: Math.round(sz[1] * scale), fly: type === 'flyer' || type === 'ghost',
    drops: [],
  };
}

module.exports = { MONSTERS };
