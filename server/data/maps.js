'use strict';

const { MONSTERS } = require('./monsters');

const GROUND = 300;
const MAP_H = 360;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tạo bãi luyện công: bục nhảy + điểm sinh quái (cấp thấp bên trái, cấp cao bên phải)
function genField(w, seed, mobs) {
  const rnd = mulberry32(seed);
  const platforms = [];
  for (let x = 200; x < w - 280; x += 220 + Math.floor(rnd() * 90)) {
    const pw = 110 + Math.floor(rnd() * 80);
    const y = GROUND - 62 - Math.floor(rnd() * 14);
    platforms.push([x, y, pw]);
    if (rnd() < 0.5) {
      const ux = x + 20 + Math.floor(rnd() * 50);
      platforms.push([ux, y - 62, Math.max(80, pw - 20)]);
    }
  }
  const pool = [];
  for (const [id, n] of mobs) for (let i = 0; i < n; i++) pool.push(id);
  pool.sort((a, b) => MONSTERS[a].lv - MONSTERS[b].lv);
  const spawns = [];
  const total = pool.length;
  const used = new Set();
  pool.forEach((id, i) => {
    const cx = 160 + ((w - 320) * (i + 0.5)) / total;
    // 35% đứng trên bục gần đó (nếu còn trống)
    if (rnd() < 0.35 && !MONSTERS[id].boss) {
      let best = -1;
      let bd = 1e9;
      platforms.forEach((p, pi) => {
        if (used.has(pi)) return;
        const d = Math.abs(p[0] + p[2] / 2 - cx);
        if (d < bd) { bd = d; best = pi; }
      });
      if (best >= 0 && bd < 200) {
        used.add(best);
        const p = platforms[best];
        spawns.push({ m: id, x1: p[0] + 8, x2: p[0] + p[2] - 8, y: p[1] });
        return;
      }
    }
    spawns.push({ m: id, x1: Math.max(120, cx - 80), x2: Math.min(w - 120, cx + 80), y: GROUND });
  });
  return { platforms, spawns };
}

const NPC_TYPES = {
  elder: { title: 'Nhiệm vụ chính', look: ['#5d4037', '#fafafa', '#ffd54f'] },
  potion: { title: 'Bán thuốc', look: ['#ad1457', '#f8bbd0', '#ffffff'] },
  smith: { title: 'Rèn - Cường hóa', look: ['#424242', '#ff8f00', '#bdbdbd'] },
  task: { title: 'Nhiệm vụ hằng ngày', look: ['#2e7d32', '#c8e6c9', '#ffeb3b'] },
  tele: { title: 'Dịch chuyển', look: ['#1565c0', '#bbdefb', '#ffffff'] },
  clan: { title: 'Gia tộc', look: ['#6a1b9a', '#e1bee7', '#ffd54f'] },
  arena: { title: 'Đấu trường', look: ['#b71c1c', '#ffcdd2', '#212121'] },
  storage: { title: 'Thủ kho', look: ['#795548', '#d7ccc8', '#ffcc80'] },
  dungeon: { title: 'Hang động thử thách', look: ['#37474f', '#b0bec5', '#ff5252'] },
};

function village(id, name, theme, element, names, portals) {
  const w = 1500;
  const types = ['elder', 'potion', 'smith', 'task', 'tele', 'clan', 'storage', 'dungeon'];
  const xs = [330, 470, 620, 880, 1030, 1180, 1320, 190];
  return {
    id, name, theme, element, town: true, w, h: MAP_H, ground: GROUND, spawnX: 750,
    platforms: [[240, 232, 140], [1240, 232, 140], [690, 214, 120]],
    portals,
    npcs: types.map((t, i) => ({ id: `${id}_${t}`, type: t, name: names[i], x: xs[i] })),
    spawns: [],
  };
}

const MAPS = {};
function reg(m) { MAPS[m.id] = m; }

reg(village('v_fire', 'Làng Hỏa Vân', 'village_fire', 'fire',
  ['Trưởng Làng Hỏa Long', 'Bà Thuốc Mai', 'Thợ Rèn Tetsu', 'Tiểu Nhị Ken', 'Phu Xe Rin', 'Lão Gia Tộc', 'Thủ Kho Bo', 'Hộ Pháp Ryu'],
  [{ x: 16, to: 'fire_field', tx: 1180 }, { x: 1484, to: 'bamboo', tx: 60 }, { x: 750, to: 'arena', tx: 120, door: true }]));
reg(village('v_water', 'Làng Thủy Nguyệt', 'village_water', 'water',
  ['Trưởng Làng Thủy Minh', 'Bà Thuốc Lan', 'Thợ Rèn Gan', 'Tiểu Nhị Yuki', 'Phu Thuyền Sora', 'Lão Gia Tộc', 'Thủ Kho Mizu', 'Hộ Pháp Kai'],
  [{ x: 16, to: 'bamboo', tx: 1740 }, { x: 1484, to: 'coast', tx: 60 }, { x: 750, to: 'water_lake', tx: 80, door: true }]));
reg(village('v_wind', 'Làng Phong Lâm', 'village_wind', 'wind',
  ['Trưởng Làng Phong Vân', 'Bà Thuốc Hoa', 'Thợ Rèn Daichi', 'Tiểu Nhị Haru', 'Phu Xe Kaze', 'Lão Gia Tộc', 'Thủ Kho Fuu', 'Hộ Pháp Jin'],
  [{ x: 16, to: 'bat_cave', tx: 1840 }, { x: 1484, to: 'wasteland', tx: 60 }, { x: 750, to: 'wind_hill', tx: 80, door: true }]));

function field(id, name, theme, element, w, seed, mobs, portals, extra = {}) {
  const g = genField(w, seed, mobs);
  reg({ id, name, theme, element, w, h: MAP_H, ground: GROUND, spawnX: 80, platforms: g.platforms, spawns: g.spawns, portals, npcs: [], ...extra });
}

const beginner = [['slime', 6], ['bunny', 6], ['mushroom', 5]];
field('fire_field', 'Đồi Hỏa Diệm', 'grass_fire', null, 1260, 11, beginner, [{ x: 1244, to: 'v_fire', tx: 60 }]);
field('water_lake', 'Hồ Thủy Tiên', 'lake', null, 1260, 12, beginner, [{ x: 16, to: 'v_water', tx: 750 }]);
field('wind_hill', 'Đồi Gió Lộng', 'grass_wind', null, 1260, 13, beginner, [{ x: 16, to: 'v_wind', tx: 750 }]);
field('bamboo', 'Rừng Trúc', 'bamboo', 'wind', 1800, 21, [['monkey', 7], ['bee', 6], ['bandit', 6]],
  [{ x: 16, to: 'v_fire', tx: 1440 }, { x: 1784, to: 'v_water', tx: 60 }, { x: 1320, to: 'sakura_garden', tx: 80, door: true }], { boss: [{ m: 'boss_slime', x: 900 }] });
field('coast', 'Bờ Biển San Hô', 'beach', 'water', 1800, 31, [['crab', 7], ['crab2', 6], ['pirate', 7]],
  [{ x: 16, to: 'v_water', tx: 1440 }, { x: 1784, to: 'bat_cave', tx: 60 }]);
field('bat_cave', 'Hang Dơi', 'cave', 'wind', 1900, 41, [['bat', 7], ['skeleton', 7], ['rockgolem', 6]],
  [{ x: 16, to: 'coast', tx: 1740 }, { x: 1884, to: 'v_wind', tx: 60 }], { boss: [{ m: 'boss_bat', x: 950 }] });
field('wasteland', 'Hoang Mạc Cát', 'desert', 'fire', 1900, 51, [['scorpion', 7], ['sandbandit', 6], ['mummy', 7]],
  [{ x: 16, to: 'v_wind', tx: 1440 }, { x: 1884, to: 'misty_valley', tx: 60 }, { x: 960, to: 'ancient_ruins', tx: 80, door: true }]);
field('misty_valley', 'Thung Lũng Sương', 'mist', 'wind', 2000, 61, [['wolf', 8], ['ghost', 6], ['rogue', 7]],
  [{ x: 16, to: 'wasteland', tx: 1840 }, { x: 1984, to: 'snow_mountain', tx: 60 }], { boss: [{ m: 'boss_wolf', x: 1000 }] });
field('snow_mountain', 'Núi Tuyết', 'snow', 'water', 2000, 71, [['snowman', 7], ['icewolf', 7], ['yeti', 6]],
  [{ x: 16, to: 'misty_valley', tx: 1940 }, { x: 1984, to: 'ice_peak', tx: 60 }]);
field('ice_peak', 'Đỉnh Băng Giá', 'ice', 'water', 2000, 81, [['icegolem', 7], ['frostghost', 6], ['iceninja', 7]],
  [{ x: 16, to: 'snow_mountain', tx: 1940 }, { x: 1984, to: 'demon_forest', tx: 60 }, { x: 1520, to: 'crystal_cave', tx: 80, door: true }], { boss: [{ m: 'boss_yeti', x: 1000 }] });
field('demon_forest', 'Rừng Ma', 'dark_forest', 'fire', 2000, 91, [['oni', 7], ['demonbat', 7], ['shadow', 7]],
  [{ x: 16, to: 'ice_peak', tx: 1940 }, { x: 1984, to: 'demon_cave', tx: 60 }]);
field('demon_cave', 'Hang Quỷ', 'lava', 'fire', 2000, 101, [['lavagolem', 7], ['fireghost', 6], ['samurai', 7]],
  [{ x: 16, to: 'demon_forest', tx: 1940 }, { x: 1984, to: 'hell_gate', tx: 60 }], { boss: [{ m: 'boss_oni', x: 1000 }] });
field('hell_gate', 'Cổng Địa Ngục', 'hell', 'wind', 2100, 111, [['hellhound', 8], ['deathknight', 7], ['darkdragon', 5]],
  [{ x: 16, to: 'demon_cave', tx: 1940 }, { x: 2084, to: 'heaven', tx: 60 }], { boss: [{ m: 'boss_god', x: 1100 }] });

// Nhánh phụ (vào qua cửa giữa bản đồ)
field('sakura_garden', 'Vườn Anh Đào', 'grass_fire', 'wind', 1500, 121, [['flowerfairy', 7], ['treant', 6], ['foxspirit', 6]],
  [{ x: 16, to: 'bamboo', tx: 1320 }], { boss: [{ m: 'boss_fox', x: 900 }] });
field('ancient_ruins', 'Phế Tích Cổ', 'desert', 'fire', 1600, 131, [['stoneguard', 7], ['cursedmummy', 7], ['sandworm', 6]],
  [{ x: 16, to: 'wasteland', tx: 960 }], { boss: [{ m: 'boss_pharaoh', x: 950 }] });
field('crystal_cave', 'Hang Pha Lê', 'cave', 'water', 1600, 141, [['crystalgolem', 7], ['crystalbat', 7], ['gemcrab', 6]],
  [{ x: 16, to: 'ice_peak', tx: 1520 }], { boss: [{ m: 'boss_crystal', x: 950 }] });
// Hậu kỳ cấp 95-120
field('heaven', 'Thiên Cung', 'ice', 'fire', 2100, 151, [['celestial', 8], ['cloudspirit', 7], ['thunderbird', 7]],
  [{ x: 16, to: 'hell_gate', tx: 2040 }, { x: 2084, to: 'abyss', tx: 60 }]);
field('abyss', 'Ma Giới', 'hell', 'fire', 2100, 161, [['abyssdemon', 8], ['bonedragon', 6], ['voidknight', 7]],
  [{ x: 16, to: 'heaven', tx: 2040 }, { x: 2084, to: 'dragon_palace', tx: 60 }], { boss: [{ m: 'boss_heaven', x: 1100 }] });
field('dragon_palace', 'Long Cung', 'lake', 'water', 2200, 171, [['seaserpent', 8], ['coralgolem', 7], ['dragonguard', 7]],
  [{ x: 16, to: 'abyss', tx: 2040 }], { boss: [{ m: 'boss_dragon', x: 1200 }] });

reg({
  id: 'arena', name: 'Đấu Trường', theme: 'arena', element: null, w: 900, h: MAP_H, ground: GROUND, spawnX: 120,
  platforms: [[200, 236, 120], [580, 236, 120], [390, 176, 120]], portals: [{ x: 16, to: 'v_fire', tx: 750 }],
  npcs: [], spawns: [], pvp: true,
});

// Phó bản: mỗi lượt vào tạo một bản sao riêng
reg({
  id: 'dungeon', name: 'Hang Động Thử Thách', theme: 'cave', element: null, instance: true, w: 1100, h: MAP_H, ground: GROUND, spawnX: 100,
  platforms: [[230, 238, 150], [520, 238, 150], [810, 238, 150], [370, 176, 130], [670, 176, 130]],
  portals: [{ x: 16, to: '@home', tx: 750 }], npcs: [], spawns: [],
});

// Thông tin gửi xuống client (bỏ dữ liệu sinh quái)
function clientMaps() {
  const out = {};
  for (const id in MAPS) {
    const m = MAPS[id];
    out[id] = {
      id, name: m.name, theme: m.theme, element: m.element, town: !!m.town, pvp: !!m.pvp, instance: !!m.instance, w: m.w, h: m.h,
      ground: m.ground, platforms: m.platforms, portals: m.portals, npcs: m.npcs, spawnX: m.spawnX,
      lv: m.spawns.length ? [Math.min(...m.spawns.map((s) => MONSTERS[s.m].lv)), Math.max(...m.spawns.map((s) => MONSTERS[s.m].lv))] : null,
    };
  }
  return out;
}

const VILLAGES = ['v_fire', 'v_water', 'v_wind'];

module.exports = { MAPS, GROUND, MAP_H, NPC_TYPES, VILLAGES, clientMaps, mulberry32 };
