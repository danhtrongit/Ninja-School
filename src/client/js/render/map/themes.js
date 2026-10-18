// Dữ liệu chủ đề bản đồ: bảng màu (THEMES), cấu hình cảnh nền (SCENES), làng (VILLAGE), biến thể theo bản đồ.
import { CLOUD, CLOUD_D, sprTree, sprRock, sprCrystal } from './flora.js';
import { sprProp } from './props.js';
import { puffRow } from './backdrop.js';
import { sakuraStream } from './ambient.js';

export const THEMES = {
  village_fire: { sky: ['#f7b267', '#fde2c4'], far: '#b5657a', mid: '#c97b63', top: '#6aa84f', dirt: '#7a4b2a', plat: 'wood', roof: '#c0392b', part: 'petal', town: 'fire' },
  village_water: { sky: ['#7fb8f0', '#e0f4ff'], far: '#6b8fc4', mid: '#7fb1cf', top: '#5cb85c', dirt: '#6b4f3a', plat: 'wood', roof: '#2e6da4', part: 'sparkle', town: 'water', water: '#4aa3df' },
  village_wind: { sky: ['#9fdcc0', '#eef8d9'], far: '#6c9f78', mid: '#88b884', top: '#7cc36b', dirt: '#6f5236', plat: 'wood', roof: '#4e8a3a', part: 'leaf', town: 'wind' },
  grass_fire: { sky: ['#ffcf8f', '#fff1d6'], far: '#c88d6e', mid: '#9fbf6a', top: '#86b84e', dirt: '#82522f', plat: 'wood', part: 'maple', decor: ['maple', 'bush', 'flower', 'rock', 'maple', 'flower', 'round', 'grass'] },
  lake: { sky: ['#87c5f5', '#e8f6ff'], far: '#7aa6d6', mid: '#6db38a', top: '#64bb5a', dirt: '#6b4f3a', plat: 'wood', water: '#4aa3df', part: 'sparkle', decor: ['round', 'reed', 'flower', 'bush', 'rock', 'reed', 'willow', 'flower'] },
  grass_wind: { sky: ['#a6e3c9', '#f1fbe8'], far: '#7fb08e', mid: '#9ccc7a', top: '#82c66a', dirt: '#73563a', plat: 'wood', part: 'leaf', decor: ['round', 'bush', 'flower', 'grass', 'round', 'tallgrass', 'rock', 'flower'] },
  bamboo: { sky: ['#b9e4b5', '#effbe6'], far: '#88b98a', mid: '#6ea56b', top: '#5c9e4b', dirt: '#5d4632', plat: 'bamboo', part: 'leaf', decor: ['bamboo', 'bamboo', 'bush', 'bamboo', 'rock', 'stonelantern', 'bamboo', 'grass'] },
  beach: { sky: ['#6ec6ff', '#e3f7ff'], far: '#9ad0ec', mid: '#3d9bd6', top: '#f2dc9b', dirt: '#d8bb72', plat: 'wood', water: '#2f8fd1', part: null, decor: ['palm', 'shell', 'rock', 'palm', 'coral', 'starfish', 'barrel'] },
  cave: { sky: ['#15121f', '#2b2340'], far: '#231d33', mid: '#2e2644', top: '#5a5170', dirt: '#3a3349', plat: 'stone', ceiling: true, dark: 0.42, part: 'dust', decor: ['crystal', 'rock', 'stalag', 'crystal', 'bones', 'mushroomglow', 'stalag'] },
  desert: { sky: ['#f8c46b', '#fde9b8'], far: '#e3a65c', mid: '#e9b872', top: '#f0cd85', dirt: '#c99a55', plat: 'stone', part: 'sand', decor: ['cactus', 'rock', 'bones', 'cactus', 'pillar', 'skull', 'cactus'] },
  mist: { sky: ['#8fa3b8', '#d3dde6'], far: '#7d8fa3', mid: '#677a8c', top: '#5d7a5a', dirt: '#4a3d33', plat: 'stone', mist: true, part: 'mist', decor: ['deadtree', 'rock', 'grave', 'pine', 'bush', 'stonelantern', 'deadtree'] },
  snow: { sky: ['#b8d3ec', '#f2f7fc'], far: '#c9d9ea', mid: '#9fb7cf', top: '#f4f8fb', dirt: '#8aa3b8', plat: 'ice', snowcap: true, part: 'snow', decor: ['pine', 'pine', 'rock', 'snowman', 'pine', 'icecrystal'] },
  ice: { sky: ['#9ed8f0', '#e8fbff'], far: '#b6e3f5', mid: '#7cc4e4', top: '#d4f3ff', dirt: '#5d8fb0', plat: 'ice', snowcap: true, part: 'snow', decor: ['icespike', 'pine', 'icespike', 'crystal', 'rock'] },
  dark_forest: { sky: ['#24162f', '#4a2f4f'], far: '#3a2546', mid: '#2f2340', top: '#4a5a46', dirt: '#2a2020', plat: 'wood', dark: 0.34, part: 'firefly', decor: ['deadtree', 'mushroomglow', 'grave', 'deadtree', 'bush', 'pumpkin', 'skull'] },
  lava: { sky: ['#2a0808', '#6e1e0c'], far: '#4a1410', mid: '#5c1a10', top: '#4a3434', dirt: '#2e2020', plat: 'stone', ceiling: true, lava: true, dark: 0.32, part: 'ember', decor: ['rock', 'stalag', 'bones', 'pillar', 'torch', 'rock'] },
  hell: { sky: ['#160303', '#4a0b0b'], far: '#2e0606', mid: '#3b0909', top: '#3a1a1a', dirt: '#1f0e0e', plat: 'stone', lava: true, dark: 0.2, part: 'ember', decor: ['bones', 'pillar', 'deadtree', 'skull', 'torch', 'spikes'] },
  arena: { sky: ['#7fb8f0', '#e6f3ff'], far: '#8aa0b8', mid: '#a58a6c', top: '#b9a58a', dirt: '#8a7457', plat: 'stone', part: null, decor: ['banner', 'torch', 'rack', 'banner', 'torch'] },
  // Hậu kỳ: dayK = mức chịu ảnh hưởng ngày/đêm (1 = ngoài trời, nhỏ = dưới lòng đất/biển)
  heaven: { sky: ['#8aa8ec', '#fff2d8'], far: '#c8bee6', mid: '#b4a8dc', top: '#f4f0ff', dirt: '#8e82c2', plat: 'cloud', part: 'feather', decor: ['goldtree', 'cloudpillar', 'lotus', 'censer', 'goldtree', 'cloudpuff', 'cloudpillar', 'lotus'], dayK: 0.8 },
  dragon_palace: { sky: ['#0c3a5a', '#3aa8c8'], far: '#1e5a7a', mid: '#2a7a8a', top: '#ecd49a', dirt: '#b8925a', plat: 'stone', platPal: ['#e0fff2', '#8ad8c0', '#4ea892', '#2a6a60'], platTrim: '#ffd54f', part: 'bubble', decor: ['kelp', 'coral', 'clam', 'jadepillar', 'kelp', 'coral', 'starfish', 'kelp', 'shell'], dayK: 0.55 },
  sakura: { sky: ['#9ac4f0', '#ffe8f0'], far: '#c8a8d0', mid: '#e8a8c4', top: '#8cc862', dirt: '#7a5038', plat: 'wood', part: 'petal', decor: ['sakura', 'stonelantern', 'pondbridge', 'sakura', 'parasol', 'flower', 'sakura', 'stonelantern', 'bush'] },
  ruins: { sky: ['#3a78c8', '#fbe0b0'], far: '#d89a68', mid: '#e8c08a', top: '#e8bf78', dirt: '#a87a44', plat: 'stone', platPal: ['#f0d098', '#c89a5e', '#94683a', '#5e3e22'], platEdge: '#2a1810', part: 'sand', decor: ['pillar', 'statue', 'rubble', 'fallen', 'obelisk', 'pillar', 'urn', 'cactus'] },
  crystal: { sky: ['#0a0818', '#2a2060'], far: '#1e1840', mid: '#2a2250', top: '#6e5c96', dirt: '#3a3058', plat: 'stone', platPal: ['#8a7cbc', '#5c5092', '#40366e', '#28224a'], platCrys: ['#d08aff', '#6ae0ff', '#ff8ad8'], ceiling: true, dark: 0.42, part: 'mote', crys: ['#c07aff', '#5ad8ff', '#ff7ad0'], crysDecor: ['#9a64d0', '#3e9ec0', '#c060a8'], decor: ['crystal', 'geode', 'crystal', 'mushroomglow', 'rock', 'crystal', 'stalag', 'geode'], dayK: 0.2 },
  abyss: { sky: ['#05010a', '#4a1048'], far: '#24102e', mid: '#1a0a22', top: '#4a4252', dirt: '#1c1820', plat: 'stone', platPal: ['#7a7084', '#544c5e', '#3a3444', '#221e2a'], platGlow: '#d040ff', dark: 0.22, part: 'void', crys: ['#d040ff', '#ff3a8a'], decor: ['deadtree', 'thorn', 'spikes', 'eyestalk', 'skull', 'voidcrystal', 'bones', 'thorn'], dayK: 0.45 },
  // Thượng Giới: đầm lầy, tinh hà, núi đá vôi ngọc bích
  swamp: { sky: ['#6e7a5a', '#b4bc98'], far: '#56604a', mid: '#4a5640', top: '#5a6a3a', dirt: '#3a3424', plat: 'wood', water: '#3a4a34', mist: true, dark: 0.12, part: 'firefly', decor: ['willow', 'reed', 'deadtree', 'reed', 'mushroomglow', 'rock', 'lotus', 'reed'], dayK: 0.85 },
  starfield: { sky: ['#0a0a2a', '#3a2a6a'], far: '#2a2458', mid: '#22204a', top: '#d8d4ff', dirt: '#5a5490', plat: 'cloud', platPal: ['#e8e4ff', '#b0a8ec', '#7a70c0', '#4a4290'], platGlow: '#9ab4ff', dark: 0.18, part: 'sparkle', crys: ['#9ab4ff', '#ffd76a'], decor: ['cloudpillar', 'crystal', 'cloudpuff', 'jadepillar', 'crystal', 'lotus'], dayK: 0.3 },
  jade_peak: { sky: ['#8ad0d8', '#eefaf4'], far: '#7ab8aa', mid: '#5e9e8a', top: '#7cc08a', dirt: '#5a6a4a', plat: 'stone', platPal: ['#cfe8d8', '#9ac8b0', '#6a9a84', '#40685a'], water: '#4ab8b0', part: 'mist', decor: ['pine', 'rock', 'bamboo', 'stonelantern', 'pine', 'tallgrass', 'rock', 'flower'], dayK: 1 },
};

// ======================= Cấu hình cảnh cho từng chủ đề =======================
export const SCENES = {
  village_fire: {
    sky: ['#3a2c66', '#6e3a78', '#b8507a', '#e8745e', '#f8a466', '#ffd79e'], stars: 30, skyH: 200,
    sun: { k: 'sun', x: 0.66, y: 112, r: 12, col: '#fff2cc', glow: '#ffb070' },
    clouds: { pal: ['#ffd8b4', '#f2a088', '#c26c86', '#8a4a78'], n: 7, y: [14, 92] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 26, n: 6, hmin: 55, hmax: 116, lit: '#c47888', shd: '#8e567c', rim: '#f6b4a0', base: '#e8907c', snow: '#ffe2d2', snowS: '#d8a6bc', snowLine: 84, volcano: true },
      { t: 'hills', h: 120, fx: 0.2, fy: 0.25, off: 10, base: 54, amp: 14, col: '#9a4e6a', lit: '#b8687a', dark: '#d88a84', trees: ['#e09ab0', '#b86a8c', '#8e4a72', '#6e3a60'], treeN: 70, feat: ['pagoda', 'castle', 'house', 'house', 'torii'], featCol: '#8e2a28' },
      { t: 'trees', h: 120, fx: 0.42, fy: 0.5, off: 20, gh: 14, ground: '#7a4a58', dark: '#5a3448', kinds: ['sakura', 'sakura', 'maple'], hmin: 54, hmax: 84, haze: '#d88a8a', amt: 0.5, gap: 58, houses: ['#b8402e', '#efdcc0'] },
    ],
    ground: 'cobble', light: { top: ['#ff8040', 0.13], bot: ['#4a1e4a', 0.1], vig: 0.28 }, portal: '#ffb060',
  },
  village_water: {
    sky: ['#2c6cc0', '#4a8ed8', '#82bcee', '#c2e2fa', '#ecf8ff'],
    sun: { k: 'sun', x: 0.22, y: 34, r: 9, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.12, off: 46, n: 6, hmin: 50, hmax: 108, lit: '#94b4de', shd: '#6a8cc4', rim: '#e0ecff', base: '#b6d0ea', snow: '#f6faff', snowS: '#c6d6f0', snowLine: 66 },
      { t: 'hills', h: 70, fx: 0.18, fy: 0.12, off: 46, base: 12, amp: 9, col: '#4e8a6a', lit: '#6ca87a', dark: '#90bcb4', trees: ['#6aaa72', '#4a8a5a', '#346a48', '#26503a'], treeN: 110, feat: ['pagoda', 'house', 'house', 'castle', 'house'], featCol: '#2e5a9a' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 9, ground: '#4e8a4e', dark: '#3a6a3e', kinds: ['willow', 'round', 'pine'], hmin: 44, hmax: 70, haze: '#a0c8d8', amt: 0.42, gap: 110, rows: [[110, 44, 70, 0.42]] },
    ],
    water: { hz: 46, top: '#9ad0f4', col: '#4a9ad8', deep: '#2e6eb0', refl: [0, 1], fy: 0.12 },
    ground: 'cobble', light: { top: ['#ffffff', 0.05], rays: 0.05, vig: 0.2 }, portal: '#7ad8ff',
  },
  village_wind: {
    sky: ['#3a9ec8', '#62bcd6', '#9ed8d4', '#d4f0dc', '#f4fbe4'],
    sun: { k: 'sun', x: 0.8, y: 40, r: 9, col: '#fffcea', glow: '#fff6c8' },
    clouds: { pal: ['#ffffff', '#f0faf4', '#c8e4dc', '#9ac4c0'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 24, n: 6, hmin: 50, hmax: 104, lit: '#82bca0', shd: '#5a947e', rim: '#d8f6e2', base: '#acdac4' },
      { t: 'hills', h: 120, fx: 0.2, fy: 0.25, off: 8, base: 50, amp: 15, col: '#6aa858', lit: '#8cc66c', dark: '#b0dcb4', terrace: true, trees: ['#8cc86a', '#5e9e4a', '#447a3c', '#2e5a30'], treeN: 50, feat: ['windmill', 'house', 'pagoda', 'house', 'windmill'], featCol: '#3a7a3a' },
      { t: 'trees', h: 140, fx: 0.42, fy: 0.5, off: 18, gh: 14, ground: '#5a9a4a', dark: '#3e7838', kinds: ['bamboo', 'bamboo', 'round'], hmin: 66, hmax: 116, haze: '#bce2c4', amt: 0.45, gap: 34, houses: ['#3f8a4a', '#f0ead0'] },
    ],
    ground: 'cobble', light: { top: ['#fff8c0', 0.05], rays: 0.05, vig: 0.2 }, portal: '#8aff9a',
  },
  grass_fire: {
    sky: ['#4a7ed4', '#7aa6dc', '#d6c6aa', '#ffd494', '#fff0cc'],
    sun: { k: 'sun', x: 0.76, y: 64, r: 11, col: '#fff6d8', glow: '#ffd890' },
    clouds: { pal: ['#fff6e8', '#ffe0c0', '#e8b498', '#b88a80'], n: 6, y: [12, 80] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 22, n: 6, hmin: 50, hmax: 112, lit: '#c8907a', shd: '#9c6870', rim: '#ffd4b4', base: '#e8b89c', volcano: true },
      { t: 'hills', h: 90, fx: 0.2, fy: 0.25, off: 8, base: 26, amp: 13, col: '#a4a858', lit: '#c6c472', dark: '#e8d6a2', trees: ['#ffb050', '#e07a34', '#b85428', '#8a3a20'], treeN: 70, feat: ['torii', 'house', 'house'], featCol: '#9a3a2a' },
      { t: 'trees', h: 104, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#8aa048', dark: '#6a7e3a', kinds: ['maple', 'maple', 'round'], hmin: 44, hmax: 72, haze: '#f0d4a4', amt: 0.42, gap: 52 },
    ],
    ground: 'grass', light: { top: ['#ffb060', 0.08], vig: 0.2 }, portal: '#ffcf6a',
  },
  lake: {
    sky: ['#3e88dc', '#72aeec', '#b0d8f6', '#e6f6ff'],
    sun: { k: 'sun', x: 0.28, y: 32, r: 9, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.12, off: 42, n: 6, hmin: 52, hmax: 116, lit: '#8aa8d8', shd: '#6a84bc', rim: '#e0ecff', base: '#b4cce8', snow: '#f6faff', snowS: '#c8d6ee', snowLine: 74 },
      { t: 'hills', h: 60, fx: 0.18, fy: 0.12, off: 42, base: 10, amp: 8, col: '#4a8a5a', lit: '#6aaa6a', dark: '#8cbcaa', trees: ['#6ab46a', '#4a9058', '#346e48', '#26523a'], treeN: 150, treeR: 5 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#5aa04a', dark: '#3e7a3a', kinds: ['round', 'willow'], hmin: 44, hmax: 70, haze: '#a8d0e0', amt: 0.4, gap: 150, rows: [[150, 44, 70, 0.4]] },
    ],
    water: { hz: 42, top: '#a4d6f6', col: '#58a8e0', deep: '#3a86c8', refl: [0, 1], fy: 0.12 },
    ground: 'grass', light: { vig: 0.18 }, portal: '#7ad8ff',
  },
  grass_wind: {
    sky: ['#46aae0', '#78c6e6', '#b8e6e0', '#eefaea'],
    sun: { k: 'sun', x: 0.7, y: 36, r: 9, col: '#fffcea', glow: '#fff6c8' },
    clouds: { pal: ['#ffffff', '#f0faf4', '#c8e4dc', '#9ac4c0'], n: 8, y: [8, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 22, n: 7, hmin: 46, hmax: 100, lit: '#8cc4b2', shd: '#64a092', rim: '#e0fff0', base: '#b4decf' },
      { t: 'hills', h: 92, fx: 0.2, fy: 0.25, off: 8, base: 24, amp: 16, col: '#76b656', lit: '#98d070', dark: '#c0e6b8', trees: ['#8cc86a', '#5e9e4a', '#447a3c', '#2e5a30'], treeN: 60, feat: ['windmill', 'windmill', 'house'], featCol: '#3a7a3a' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#6aaa4a', dark: '#4a8a3a', kinds: ['round', 'round', 'pine'], hmin: 40, hmax: 70, haze: '#c8ecc8', amt: 0.42, gap: 60 },
    ],
    ground: 'grass', light: { vig: 0.16 }, portal: '#8aff9a',
  },
  bamboo: {
    sky: ['#86c69e', '#acdab0', '#d6eec6', '#f0fae0'],
    clouds: { pal: ['#ffffff', '#f0faf0', '#d0e8d0', '#b0d0b0'], n: 4, y: [10, 50] },
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 14, n: 7, hmin: 50, hmax: 104, lit: '#b2d2b0', shd: '#98bc9e', rim: '#e8f8e0', base: '#d0e8c8' },
      { t: 'trees', h: 140, fx: 0.22, fy: 0.28, off: 6, gh: 8, ground: '#8ab070', dark: '#7aa064', kinds: ['bamboo'], hmin: 80, hmax: 125, haze: '#d4ecca', amt: 0.72, gap: 18, noOutline: true, rows: [[18, 80, 125, 0.72]] },
      { t: 'trees', h: 160, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#5e8a46', dark: '#46703a', kinds: ['bamboo'], hmin: 100, hmax: 150, haze: '#b4d8aa', amt: 0.42, gap: 40, rows: [[40, 100, 150, 0.42]] },
    ],
    ground: 'grass', light: { top: ['#f0ffc0', 0.06], rays: 0.07, vig: 0.24 }, portal: '#c8ff8a',
  },
  beach: {
    sky: ['#2286de', '#4aa8ec', '#88ccf6', '#c8ecff', '#eef9ff'],
    sun: { k: 'sun', x: 0.6, y: 30, r: 10, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [8, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 90, fx: 0.05, fy: 0.1, off: 52, n: 5, hmin: 12, hmax: 46, steep: 1.3, lit: '#7ab88a', shd: '#5a9a7a', rim: '#d0f0d8', base: '#a8d0d8', fade: 20 },
      { t: 'mount', h: 60, fx: 0.12, fy: 0.1, off: 52, n: 3, hmin: 6, hmax: 26, steep: 2.2, lit: '#8a9a8a', shd: '#6a7a72', rim: '#c8d8d0', base: '#88b8c8', fade: 12, minH: -10 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 14, ground: '#f0d898', dark: '#e0c080', kinds: ['palm'], hmin: 44, hmax: 66, haze: '#c8e8f0', amt: 0.3, gap: 130, rows: [[130, 44, 66, 0.3]] },
    ],
    water: { hz: 52, top: '#8ad8f4', col: '#2a98d8', deep: '#1a78c0', refl: [0, 1], fy: 0.1, foam: true },
    ground: 'sand', light: { top: ['#ffffff', 0.04], vig: 0.16 }, portal: '#7ae8ff',
  },
  cave: {
    sky: ['#100c1c', '#1a1530', '#262042', '#362c56'], birds: 'bat',
    layers: [
      { t: 'cave', h: 250, fx: 0.15, fy: 0.2, off: 0, pal: ['#4e4470', '#3c345a', '#2e2848', '#241e3a'], cols: 6, spikes: 22, minS: 20, maxS: 70, crystal: '#9a7aff', camt: 0.35 },
      { t: 'cave', h: 210, fx: 0.32, fy: 0.4, off: 0, pal: ['#62568a', '#4a4270', '#383256', '#2a2442'], cols: 4, spikes: 30, minS: 15, maxS: 60, crystal: '#b388ff', camt: 0.15 },
      { t: 'props', h: 60, fx: 0.55, fy: 0.62, off: 0, gh: 8, ground: '#2e2840', rim: '#4a4064', haze: '#241e34', amt: 0.35, gap: 50, items: [(R) => sprCrystal(14 + ((R() * 12) | 0), R() < 0.5 ? '#b388ff' : '#4fc3f7', (R() * 4) | 0), (R) => sprProp('stalag', (R() * 3) | 0, 'cave'), (R) => sprRock(20, 10, (R() * 3) | 0, ['#6a6082', '#4c4466', '#3a3450', '#2a2440'])] },
    ],
    ceil: { h: 80, fx: 0.6, fy: 0.7, pal: ['#4c4266', '#342c48', '#221c30'], drip: '#8ab0ff', n: 46 },
    ground: 'rock', gpal: ['#6a6082', '#4e4666', '#3a3450', '#2a2440', '#1e1a2e'],
    light: { dark: 0.36, darkCol: '#08040e', top: ['#5a3a9a', 0.1], vig: 0.32 }, portal: '#b388ff',
  },
  desert: {
    sky: ['#3488d6', '#6eaee0', '#c4d6c0', '#f6d89c', '#fcecc8'],
    sun: { k: 'sun', x: 0.5, y: 26, r: 13, col: '#ffffff', glow: '#fff0a0' },
    clouds: { pal: ['#ffffff', '#fff6e0', '#f0d8b0', '#d0b088'], n: 3, y: [10, 50] }, birds: 'bird',
    layers: [
      { t: 'mesa', h: 120, fx: 0.06, fy: 0.1, off: 16, n: 5, hmin: 40, hmax: 82, lit: '#e09460', shd: '#b86c4c', band: '#c87a50', base: '#f0c898', rim: '#ffd8a8' },
      { t: 'dunes', h: 70, fx: 0.2, fy: 0.25, off: 8, base: 14, amp: 18, lit: '#f2c474', shd: '#d29a5a', rim: '#ffe4a8', base2: '#f8dcaa', cacti: 6, amt: 0.4 },
      { t: 'dunes', h: 62, fx: 0.42, fy: 0.5, off: 0, base: 10, amp: 14, lit: '#eab264', shd: '#c2824a', rim: '#f8d292', base2: '#e0b070', cacti: 5, amt: 0.2 },
    ],
    ground: 'sand', light: { top: ['#ffb050', 0.08], vig: 0.2 }, portal: '#ffd86a',
  },
  mist: {
    sky: ['#64788e', '#8698ae', '#acbac9', '#d0dae3'],
    sun: { k: 'sun', x: 0.3, y: 46, r: 9, col: '#f4f4ee', glow: '#dde4ea' },
    clouds: { pal: ['#e8eef2', '#d0dae2', '#b4c2ce', '#9aaabb'], n: 5, y: [10, 70] },
    layers: [
      { t: 'karst', h: 170, fx: 0.06, fy: 0.1, off: 18, n: 12, hmin: 60, hmax: 140, lit: '#a4b2c2', shd: '#8496aa', base: '#c4ced8', rim: '#aebccc', tree: '#7e9294' },
      { t: 'karst', h: 140, fx: 0.2, fy: 0.25, off: 6, n: 9, hmin: 40, hmax: 110, lit: '#8a9a94', shd: '#5e706c', base: '#a6b6bc', rim: '#8ea49a', tree: '#4e6e56' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#4a6450', dark: '#3a5040', kinds: ['pine', 'dead'], leaf: 'mist', bark: 'grey', hmin: 44, hmax: 76, haze: '#a8b8c0', amt: 0.5, gap: 56 },
    ],
    fog: true, ground: 'grass', light: { top: ['#d8e0e8', 0.08], vig: 0.26 }, portal: '#cfe8ff',
  },
  snow: {
    sky: ['#7aa4d4', '#9cbce0', '#c4d8ee', '#e8f0f8'],
    sun: { k: 'sun', x: 0.7, y: 40, r: 9, col: '#ffffff', glow: '#f0f6ff' },
    clouds: { pal: ['#ffffff', '#eef2f8', '#cfd8e6', '#aab8cc'], n: 6, y: [8, 70] },
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 20, n: 6, hmin: 56, hmax: 120, lit: '#eef4fa', shd: '#a8bcd8', rim: '#ffffff', base: '#d0dcec', snow: '#ffffff', snowS: '#c4d4ea', snowLine: 30 },
      { t: 'hills', h: 92, fx: 0.2, fy: 0.25, off: 8, base: 24, amp: 14, col: '#d0deec', lit: '#f2f6fb', dark: '#dce6f2', trees: ['#6a9a8e', '#4a7a70', '#33605a', '#24484a'], treeKind: 'pine', snowy: true, treeN: 110, treeR: 4 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#eef4fa', dark: '#c8d8ea', kinds: ['pine'], snow: true, hmin: 46, hmax: 80, haze: '#d6e2ee', amt: 0.45, gap: 40 },
    ],
    ground: 'snow', light: { top: ['#e8f4ff', 0.06], vig: 0.2 }, portal: '#9ae4ff',
  },
  ice: {
    sky: ['#0c2e52', '#1a5a86', '#3e96bc', '#8cd2e8', '#d4f4fc'], stars: 50, aurora: true,
    sun: { k: 'moon', x: 0.2, y: 30, r: 8, glow: '#c8f0ff' },
    clouds: { pal: ['#e8f8ff', '#c8e8f6', '#9ccce6', '#78aed0'], n: 4, y: [30, 80] },
    layers: [
      { t: 'mount', h: 160, fx: 0.06, fy: 0.1, off: 20, n: 9, hmin: 50, hmax: 130, steep: 1.8, lit: '#c8ecf8', shd: '#7ab8dc', rim: '#ffffff', base: '#a8dcf0', snow: '#ffffff', snowS: '#b4dcf0', snowLine: 46 },
      { t: 'mount', h: 90, fx: 0.2, fy: 0.25, off: 6, n: 14, hmin: 20, hmax: 70, steep: 3.2, lit: '#9adcf4', shd: '#58a2cc', rim: '#eafcff', base: '#8ad0ea', snow: '#f4fcff', snowS: '#c4e6f6', snowLine: 50 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#d4f3ff', dark: '#a8d8ee', kinds: ['pine'], snow: true, hmin: 40, hmax: 76, haze: '#b8e4f4', amt: 0.42, gap: 56 },
    ],
    ground: 'ice', light: { top: ['#a0f0ff', 0.06], vig: 0.22 }, portal: '#9ae4ff',
  },
  dark_forest: {
    sky: ['#0c0716', '#1c1230', '#36204a', '#5a3060'], stars: 140,
    sun: { k: 'moon', x: 0.72, y: 36, r: 13, glow: '#c8b8ff' },
    clouds: { pal: ['#6a5888', '#4a3c68', '#33284c', '#221a36'], n: 4, y: [20, 80] }, birds: 'bat',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 20, n: 8, hmin: 40, hmax: 104, steep: 1.5, lit: '#4e3866', shd: '#3a2850', rim: '#9a80c0', base: '#4a3058' },
      { t: 'trees', h: 120, fx: 0.22, fy: 0.28, off: 6, gh: 8, ground: '#2e2240', dark: '#2a1e3a', kinds: ['dead'], bark: 'purple', hmin: 54, hmax: 96, haze: '#3a2a52', amt: 0.55, gap: 34, noOutline: true, rows: [[34, 54, 96, 0.55]] },
      { t: 'trees', h: 120, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#221a30', dark: '#1a1424', kinds: ['dead', 'round', 'dead'], leaf: 'dark', bark: 'purple', eyes: true, hmin: 50, hmax: 90, haze: '#2a1e3a', amt: 0.42, gap: 48, rows: [[48, 50, 90, 0.42]] },
    ],
    ground: 'grass', light: { dark: 0.34, darkCol: '#0a0614', top: ['#6a40a0', 0.08], vig: 0.35 }, portal: '#c88aff',
  },
  lava: {
    sky: ['#0c0303', '#1c0606', '#360c08', '#561408'], birds: 'bat',
    layers: [
      { t: 'cave', h: 250, fx: 0.15, fy: 0.2, off: 0, pal: ['#4a1c16', '#3a1410', '#2a0e0c', '#200a08'], cols: 5, spikes: 20, minS: 20, maxS: 70, lavafall: true },
      { t: 'cave', h: 210, fx: 0.32, fy: 0.4, off: 0, pal: ['#62302a', '#4a221c', '#331612', '#24100c'], cols: 3, spikes: 30, minS: 15, maxS: 60 },
      { t: 'props', h: 60, fx: 0.55, fy: 0.62, off: 0, gh: 8, ground: '#2a1410', rim: '#8a3a1a', haze: '#2a0e0c', amt: 0.3, gap: 44, items: [(R) => sprProp('stalag', (R() * 3) | 0, 'lava'), (R) => sprRock(22, 11, (R() * 3) | 0, ['#7a4a40', '#5a3430', '#40241f', '#2a1714'])] },
    ],
    ceil: { h: 80, fx: 0.6, fy: 0.7, pal: ['#5a2a22', '#3e1c18', '#28100e'], drip: '#ff8a3a', n: 40 },
    ground: 'basalt', light: { dark: 0.3, darkCol: '#160404', bot: ['#ff4a10', 0.16], vig: 0.35 }, portal: '#ff9a4a',
  },
  hell: {
    sky: ['#0a0102', '#280507', '#560c0a', '#9a2612', '#de5a26'],
    sun: { k: 'redmoon', x: 0.32, y: 40, r: 16, glow: '#ff4a2a' },
    clouds: { pal: ['#8a3028', '#621c1e', '#441218', '#2c0a10'], n: 6, y: [10, 80] }, birds: 'bat',
    layers: [
      { t: 'mount', h: 160, fx: 0.06, fy: 0.1, off: 16, n: 13, hmin: 40, hmax: 128, steep: 3, lit: '#3e1416', shd: '#2a0a0e', rim: '#ff6a3a', base: '#7a1e14', fade: 50 },
      { t: 'ruins', h: 130, fx: 0.22, fy: 0.28, off: 6, n: 8, hmin: 30, hmax: 90, col: '#1e0808', rim: '#c84a2a', win: '#ff9a3a', gate: true, horns: true },
      { t: 'trees', h: 110, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#1a0808', dark: '#120404', kinds: ['dead'], bark: 'dark', hmin: 50, hmax: 90, haze: '#3a0c0c', amt: 0.35, gap: 70 },
    ],
    ground: 'basalt', light: { top: ['#ff2a10', 0.1], bot: ['#ff5a10', 0.16], dark: 0.18, darkCol: '#1a0202', vig: 0.4 }, portal: '#ff5a3a',
  },
  arena: {
    sky: ['#3a8ae0', '#6aacec', '#a8d0f4', '#e0f0ff'],
    sun: { k: 'sun', x: 0.75, y: 32, r: 10, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 6, y: [8, 60] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 30, n: 6, hmin: 50, hmax: 110, lit: '#9ab0c8', shd: '#7a90b0', rim: '#e0ecff', base: '#c0d4ea', snow: '#ffffff', snowS: '#d0dcee', snowLine: 80 },
      { t: 'stands', h: 92, fx: 0.3, fy: 0.35, off: 4 },
      { t: 'wall', h: 50, fx: 0.55, fy: 0.62, off: 0 },
    ],
    ground: 'tiles', light: { top: ['#fff4d0', 0.05], vig: 0.2 }, portal: '#ffd86a',
  },
  heaven: {
    sky: ['#4a7ada', '#7aa4ec', '#b8c8f4', '#e8dcf2', '#ffe8d6', '#fff4e2'], skyH: 260,
    sun: { k: 'sun', x: 0.72, y: 50, r: 14, col: '#fffbe8', glow: '#ffe08a' },
    rainbow: { x: 0.3, y: 158, r: 104 },
    clouds: { pal: ['#ffffff', '#fff6ea', '#f2dccc', '#d8c0bc'], n: 8, y: [8, 84] }, birds: 'bird', birdCol: 'rgba(255,255,255,0.9)',
    layers: [
      { t: 'clouds', h: 140, fx: 0.06, fy: 0.1, off: 30, base: 46, amp: 18, n: 24, rmin: 11, rmax: 24, pal: ['#ffffff', '#ece6fa', '#cfc6ec', '#b0a8d8'], haze: '#e4def6', feat: ['skytemple', 'skytemple', 'pagoda'], featCol: '#f0b840', featHaze: 0.38 },
      { t: 'colonnade', h: 116, fx: 0.22, fy: 0.28, off: 8, gh: 10, pal: ['#ffffff', '#ece8f8', '#c4bee0', '#9690c0'], trim: '#f0b840', roof: '#e8a830', hmin: 48, hmax: 70, haze: '#e8e2f6', amt: 0.3, space: 70, cloud: CLOUD, cloudHaze: '#e0daf2' },
      { t: 'trees', h: 110, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#c4bae4', dark: '#9a8ecc', kinds: ['gold', 'jade', 'gold'], hmin: 44, hmax: 70, haze: '#b8acd8', amt: 0.16, gap: 74, rows: [[74, 44, 70, 0.16]], front: (b, R, gy) => puffRow(b, R, gy + 3, 3, 34, 5, 10, CLOUD_D, '#8a80bc') },
    ],
    fog: true, fogA: 0.22, ground: 'cloud', cliff: ['#f4f0ff', '#c8c0e4', '#988ec8', '#6a60a0'], cap: '#ffffff',
    light: { top: ['#fff0c0', 0.08], rays: 0.035, vig: 0.14 }, portal: '#ffd86a',
  },
  dragon_palace: {
    sky: ['#4cc4d4', '#2c9cbc', '#1a7aa0', '#125c82', '#0e466a'], skyH: 280, surface: true,
    birds: 'fish',
    layers: [
      { t: 'hills', h: 130, fx: 0.06, fy: 0.1, off: 26, base: 40, amp: 18, col: '#0e4466', lit: '#1a5c7e', dark: '#145a7c', rim: '#3a8aa8', trees: ['#c86a90', '#a04a78', '#7a3466', '#582654'], treeN: 40, treeR: 3, feat: ['seapalace', 'seapalace'], featCol: '#2ab08a', featHaze: 0.36 },
      { t: 'props', h: 76, fx: 0.22, fy: 0.28, off: 6, gh: 10, ground: '#2e7a86', rim: '#5aa8a8', haze: '#1a5a7a', amt: 0.52, gap: 38, items: [(R) => sprProp('coralfan', (R() * 3) | 0, 'dragon_palace'), (R) => sprTree('kelp', 40 + ((R() * 30) | 0), (R() * 3) | 0), (R) => sprRock(24, 12, (R() * 3) | 0, ['#7a9aa8', '#5a7a8a', '#40606e', '#2a4652'])] },
      { t: 'trees', h: 110, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#c8ac78', dark: '#a48654', kinds: ['kelp'], hmin: 36, hmax: 80, haze: '#1e6a86', amt: 0.42, gap: 78, rows: [[78, 36, 80, 0.42]] },
    ],
    ground: 'sand', cliff: ['#8ab0b8', '#6a8e9a', '#4e6e7c', '#34505e'], cap: '#e2d4a6',
    light: { top: ['#6af0ff', 0.1], bot: ['#003a5a', 0.22], rays: 0.12, raysCol: '#c8fff4', vig: 0.32 }, portal: '#6af0ff',
  },
  sakura: {
    sky: ['#6aa6e8', '#9cc4f0', '#d8d6f4', '#ffe0ec', '#fff2f6'],
    sun: { k: 'sun', x: 0.24, y: 40, r: 10, col: '#fffbe8', glow: '#ffe8f0' },
    clouds: { pal: ['#ffffff', '#fff0f6', '#f0d0e0', '#d0a8c4'], n: 7, y: [8, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 24, n: 6, hmin: 52, hmax: 118, lit: '#c8aad8', shd: '#a08abc', rim: '#ffe8f4', base: '#e8d2ea', snow: '#ffffff', snowS: '#e0d2ec', snowLine: 80 },
      { t: 'hills', h: 96, fx: 0.2, fy: 0.25, off: 8, base: 28, amp: 14, col: '#8ab070', lit: '#a8c888', dark: '#ecd8e6', trees: ['#ffe4ee', '#f8aac8', '#e082a8', '#b05a88'], treeN: 100, treeR: 5, feat: ['pagoda', 'torii', 'house', 'house'], featCol: '#c8403a' },
      { t: 'trees', h: 110, fx: 0.42, fy: 0.5, off: 0, gh: 12, ground: '#6a9a50', dark: '#4a7a40', kinds: ['sakura', 'sakura', 'pine'], hmin: 46, hmax: 76, haze: '#e8c8d8', amt: 0.24, gap: 64, rows: [[64, 46, 76, 0.24]], extra: sakuraStream },
    ],
    ground: 'grass', flowers: ['#ffd6e6', '#ff9ac0', '#ffffff', '#ffe066'], petals: true, steps: true, light: { top: ['#ffd0e0', 0.08], vig: 0.18 }, portal: '#ffb0d0',
  },
  ruins: {
    sky: ['#2462b0', '#3e86cc', '#7ab6de', '#cfd8c8', '#f6cc92'],
    sun: { k: 'sun', x: 0.78, y: 74, r: 15, col: '#fff2d0', glow: '#ffc070' },
    clouds: { pal: ['#ffffff', '#f4f0ea', '#d8d4d0', '#aab0bc'], n: 4, y: [10, 60] }, birds: 'bird',
    layers: [
      { t: 'mesa', h: 120, fx: 0.06, fy: 0.1, off: 18, n: 5, hmin: 36, hmax: 78, lit: '#e8a46c', shd: '#c07a52', band: '#d08a5a', base: '#f0cc9c', rim: '#ffdcac' },
      { t: 'hills', h: 90, fx: 0.2, fy: 0.25, off: 8, base: 22, amp: 10, col: '#e0b070', lit: '#f2c88a', dark: '#f4d8a8', rim: '#ffe4b0', feat: ['ziggurat', 'ziggurat', 'ziggurat'], featCol: '#c8a070', featHaze: 0.32 },
      { t: 'colonnade', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#e8c080', dark: '#c89a5a', pal: ['#f8e0b0', '#e0b880', '#b48a58', '#80603a'], hmin: 40, hmax: 66, broken: 0.7, statue: true, fallen: true, haze: '#f0d4a4', amt: 0.32, space: 30 },
    ],
    ground: 'sand', paved: true, light: { top: ['#ffb050', 0.04], vig: 0.22 }, portal: '#ffd86a',
  },
  crystal: {
    sky: ['#08061a', '#120e2c', '#1c1640', '#2a2058'], birds: 'bat',
    layers: [
      { t: 'cave', h: 250, fx: 0.15, fy: 0.2, off: 0, pal: ['#3e3666', '#2e2852', '#221e40', '#1a1632'], cols: 6, vary: true, spikes: 22, minS: 20, maxS: 70, crystal: ['#b070ff', '#4ad0ff', '#ff70d0'], crysN: 18, crysH: 16, camt: 0.36 },
      { t: 'cave', h: 210, fx: 0.32, fy: 0.4, off: 0, pal: ['#4c4478', '#3a3462', '#2a264c', '#201c3a'], cols: 4, vary: true, spikes: 26, minS: 15, maxS: 60, crystal: ['#a070d8', '#4ab0d0'], crysN: 10, crysH: 12, camt: 0.3 },
      { t: 'props', h: 80, fx: 0.55, fy: 0.62, off: 0, gh: 8, ground: '#221e38', rim: '#4a4070', haze: '#1c1830', amt: 0.4, gap: 40, items: [(R) => sprCrystal(18 + ((R() * 24) | 0), ['#8a5ab8', '#3a88a8', '#a85a90'][(R() * 3) | 0], (R() * 4) | 0), (R) => sprProp('geode', 0, 'crystal'), (R) => sprRock(20, 10, (R() * 3) | 0, ['#6a6090', '#4c4470', '#3a3458', '#2a2442'])] },
    ],
    ceil: { h: 90, fx: 0.6, fy: 0.7, pal: ['#4a3e70', '#30284e', '#201a36'], drip: '#c8a0ff', n: 34, crys: ['#c07aff', '#5ad8ff', '#ff7ad0'] },
    ground: 'rock', gpal: ['#6a5e98', '#4c4278', '#383060', '#282244', '#1a1630'], veins: ['#d08aff', '#6ae0ff', '#ff8ad8'],
    light: { dark: 0.34, darkCol: '#06040e', top: ['#7a4aff', 0.1], vig: 0.3 }, portal: '#d08aff',
  },
  abyss: {
    sky: ['#040108', '#12041c', '#260a34', '#421046', '#6a1a4e'], stars: 40, eyes: 7,
    sun: { k: 'eclipse', x: 0.62, y: 44, r: 14, glow: '#e060ff' },
    clouds: { pal: ['#6a2a7a', '#4a1a5a', '#331044', '#200a2e'], n: 6, y: [10, 80] }, birds: 'bat',
    layers: [
      { t: 'mount', h: 170, fx: 0.06, fy: 0.1, off: 16, n: 13, hmin: 40, hmax: 136, steep: 3, lit: '#341a44', shd: '#200c2c', rim: '#c04aff', base: '#5a1a5a', fade: 50 },
      { t: 'ruins', h: 140, fx: 0.22, fy: 0.28, off: 6, n: 8, hmin: 30, hmax: 96, col: '#180a20', rim: '#7a3aa8', win: '#6a2252', gate: true, gateCol: '#c040ff', horns: true },
      { t: 'trees', h: 120, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#16121c', dark: '#0e0b12', kinds: ['dead'], bark: 'dark', eyes: true, eyeCol: '#ff3a5a', hmin: 50, hmax: 96, haze: '#1c1622', amt: 0.5, gap: 60 },
    ],
    ground: 'basalt', zig: true, bpal: ['#4e4858', '#36303e', '#25212c', '#16131c'], crack: ['#d040ff', '#7a20b0', '#ffb0ff'], cliff: ['#4e4858', '#36303e', '#25212c', '#16131c'],
    light: { top: ['#a020ff', 0.08], bot: ['#ff2a8a', 0.1], dark: 0.2, darkCol: '#0c0214', vig: 0.42 }, portal: '#e070ff',
  },
  swamp: {
    sky: ['#4a5642', '#6a7656', '#8e9a74', '#b8bf9a'],
    sun: { k: 'sun', x: 0.32, y: 44, r: 9, col: '#eef0d8', glow: '#cfd6a8' },
    clouds: { pal: ['#c8ccb0', '#a8b090', '#8a9474', '#6e785c'], n: 5, y: [12, 70] }, birds: 'bird',
    layers: [
      { t: 'hills', h: 90, fx: 0.06, fy: 0.1, off: 46, base: 22, amp: 12, col: '#4a5a40', lit: '#5c6c4c', dark: '#8e9a74', trees: ['#6a7e5a', '#4e6244', '#3a4c34', '#2a3826'], treeKind: 'pine', treeN: 36, treeR: 4 },
      { t: 'trees', h: 110, fx: 0.2, fy: 0.25, off: 40, gh: 8, ground: '#46523a', dark: '#36422e', kinds: ['willow', 'dead', 'willow'], leaf: 'mist', bark: 'grey', hmin: 50, hmax: 80, haze: '#8a9478', amt: 0.45, gap: 52 },
      { t: 'props', h: 50, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#3a4630', rim: '#56663e', haze: '#6e7a5c', amt: 0.3, gap: 64, items: [(R) => sprTree('dead', 26 + ((R() * 14) | 0), (R() * 3) | 0, { bark: 'grey' }), (R) => sprProp('reed', 0, 'swamp'), (R) => sprRock(22, 11, (R() * 3) | 0, ['#5a6a4a', '#46543a', '#33402a', '#222c1c'])] },
    ],
    water: { hz: 40, top: '#5a6a50', col: '#3a4a34', deep: '#26321f', refl: [0, 1], fy: 0.12 },
    fog: true, fogA: 0.18, ground: 'grass', light: { top: ['#c8d8a0', 0.05], dark: 0.12, darkCol: '#141a10', vig: 0.3 }, portal: '#b6ff7a',
  },
  starfield: {
    sky: ['#05051a', '#0e0c30', '#22185a', '#3a2a74', '#5a3a86'], stars: 220, aurora: true,
    sun: { k: 'moon', x: 0.78, y: 34, r: 10, glow: '#c8d0ff' },
    clouds: { pal: ['#6a5aa8', '#4a3a88', '#33286a', '#22184c'], n: 4, y: [30, 90] },
    layers: [
      { t: 'mount', h: 160, fx: 0.06, fy: 0.1, off: 20, n: 11, hmin: 40, hmax: 124, steep: 2.2, lit: '#3a3478', shd: '#24205a', rim: '#a0a8ff', base: '#5a3a86', fade: 40 },
      { t: 'clouds', h: 140, fx: 0.22, fy: 0.28, off: 12, base: 42, amp: 16, n: 22, rmin: 10, rmax: 22, pal: ['#8a80d8', '#6a60b8', '#4e4898', '#363278'], haze: '#3a2e78', feat: ['skytemple'], featCol: '#ffd76a', featHaze: 0.4 },
      { t: 'colonnade', h: 116, fx: 0.42, fy: 0.5, off: 0, gh: 10, pal: ['#e8e4ff', '#b0a8ec', '#7a70c0', '#4a4290'], trim: '#ffd76a', hmin: 46, hmax: 70, haze: '#3a2e78', amt: 0.34, space: 110, cloud: ['#8a80d8', '#6a60b8', '#4e4898', '#363278'], cloudHaze: '#3a2e78' },
    ],
    ground: 'cloud', cliff: ['#d8d4ff', '#a8a0e0', '#7068b0', '#48407e'], cap: '#ffffff',
    light: { top: ['#9ab4ff', 0.06], dark: 0.18, darkCol: '#06061a', vig: 0.3 }, portal: '#ffd76a',
  },
  jade_peak: {
    sky: ['#4aa8c8', '#7cc6d8', '#b4e2e0', '#e8f8f0'],
    sun: { k: 'sun', x: 0.7, y: 36, r: 9, col: '#fffcea', glow: '#e8ffe0' },
    clouds: { pal: ['#ffffff', '#eef8f4', '#cfe6e0', '#a8ccc6'], n: 7, y: [10, 80] }, birds: 'bird',
    layers: [
      { t: 'karst', h: 170, fx: 0.06, fy: 0.1, off: 48, n: 12, hmin: 60, hmax: 140, lit: '#a4d4c4', shd: '#78ae9e', base: '#c4e6dc', rim: '#e0fff4', tree: '#5a8a6a' },
      { t: 'karst', h: 140, fx: 0.2, fy: 0.25, off: 42, n: 9, hmin: 40, hmax: 110, lit: '#6aaa8a', shd: '#3e7a62', base: '#8ac4a8', rim: '#b4e8cc', tree: '#2e5a40' },
      { t: 'trees', h: 110, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#6a9a74', dark: '#4e7a5c', kinds: ['pine', 'bamboo'], hmin: 46, hmax: 84, haze: '#b4e2d4', amt: 0.4, gap: 70 },
    ],
    water: { hz: 46, top: '#9ae0d4', col: '#4ab8b0', deep: '#2a8a88', refl: [0, 1], fy: 0.12 },
    fog: true, fogA: 0.12, ground: 'rock', gpal: ['#e4f6ec', '#b0d8c4', '#7eae98', '#56806e', '#3a5a4e'],
    light: { top: ['#e8fff4', 0.06], vig: 0.16 }, portal: '#7affd8',
  },
};

// Bảng màu làng theo hệ (mặt đất lát đá, nhà, cây)
export const VILLAGE = {
  fire: { roof: '#cf4630', wall: '#f3e2c4', wood: '#5e3424', stone: ['#efdcbc', '#d2bc96', '#a8906c', '#7a6650'], tree: 'sakura', glow: '#ffb050' },
  water: { roof: '#3a6fb8', wall: '#eef0ee', wood: '#463634', stone: ['#ccd4de', '#a8b2c0', '#828c9e', '#5a6274'], tree: 'willow', glow: '#ffd890' },
  wind: { roof: '#4a9a52', wall: '#f2ead0', wood: '#5a4228', stone: ['#dcdcc0', '#b8bc9c', '#8e9478', '#666c56'], tree: 'bamboo', glow: '#fff0a0' },
};

// Biến thể theo bản đồ: dùng lại chủ đề có sẵn nhưng đổi loại cây/hạt cho hợp tên bản đồ
// (chỉ áp dụng khi bản đồ còn dùng chủ đề gốc `from`)
export const MAP_VARIANTS = {
  sakura_garden: { from: 'grass_fire', part: 'petal', swap: { maple: 'sakura' } },
  // Hạ Giới mở rộng
  ga_ruongbac: { from: 'grass_wind', part: 'leaf', swap: { round: 'willow', rock: 'reed' } },
  ga_modong: { from: 'cave', part: 'dust', swap: { crystal: 'torch', mushroomglow: 'barrel', bones: 'rubble' } },
  ga_rungnam: { from: 'mist', part: 'firefly', swap: { deadtree: 'mushroomglow', grave: 'mushroomglow', pine: 'round' } },
  ga_ocdao: { from: 'desert', part: 'leaf', swap: { cactus: 'palm', skull: 'reed', bones: 'bush' } },
  gb_tunglam: { from: 'snow', part: 'snow', swap: { snowman: 'pine', icecrystal: 'rock' } },
  gb_hanphong: { from: 'ice', part: 'mote', swap: { pine: 'icecrystal' } },
  gb_bangho: { from: 'ice', part: 'sparkle', swap: { pine: 'icespike', rock: 'icecrystal' } },
  gc_baithama: { from: 'mist', part: 'firefly', swap: { pine: 'deadtree', bush: 'grave', rock: 'urn' } },
  gc_lorenquy: { from: 'lava', part: 'ember', swap: { bones: 'anvil', pillar: 'barrel' } },
  gc_concatdo: { from: 'desert', part: 'ember', swap: { cactus: 'rock', pillar: 'deadtree' } },
  gd_vancot: { from: 'cave', part: 'dust', swap: { crystal: 'bones', mushroomglow: 'skull' } },
  gd_huyetho: { from: 'hell', part: 'ember', swap: { deadtree: 'thorn' } },
  ge_kimkhuyet: { from: 'heaven', part: 'sparkle', swap: { lotus: 'goldtree', cloudpuff: 'censer' } },
  ge_huvo: { from: 'crystal', part: 'void', swap: { mushroomglow: 'voidcrystal', geode: 'voidcrystal' } },
  ge_longmo: { from: 'dragon_palace', part: 'bubble', swap: { coral: 'bones', clam: 'skull' } },
  // Thượng Giới
  bl_thuyphu: { from: 'dragon_palace', part: 'sparkle', swap: { kelp: 'jadepillar' } },
  bl_thanlau: { from: 'lake', part: 'mist', swap: { flower: 'lotus', reed: 'lotus', round: 'willow' } },
  xv_xichsa: { from: 'desert', part: 'ember', swap: { cactus: 'rock', pillar: 'torch' } },
  xv_hoadiem: { from: 'lava', part: 'ember', swap: { bones: 'torch', pillar: 'obelisk' } },
  xv_hacdieu: { from: 'cave', part: 'ember', swap: { crystal: 'voidcrystal', mushroomglow: 'torch' } },
  bn_bangho: { from: 'ice', part: 'mote', swap: { pine: 'icecrystal' } },
  bn_vannien: { from: 'mist', part: 'snow', swap: { deadtree: 'pine', grave: 'icespike', bush: 'rock' } },
  hl_hoangsa: { from: 'desert', part: 'sand', swap: { cactus: 'statue', skull: 'obelisk' } },
  hl_quandien: { from: 'ruins', part: 'mote', swap: { cactus: 'urn', fallen: 'statue' } },
  hl_thachquan: { from: 'jade_peak', part: 'sand', swap: { bamboo: 'statue', flower: 'grave', stonelantern: 'urn' } },
  um_quylam: { from: 'mist', part: 'firefly', swap: { pine: 'deadtree', stonelantern: 'grave' } },
  um_saohuyet: { from: 'dark_forest', part: 'void', swap: { pumpkin: 'skull', bush: 'thorn' } },
  um_vongxuyen: { from: 'bamboo', part: 'firefly', swap: { stonelantern: 'grave', bush: 'deadtree' } },
  th_tinhlam: { from: 'crystal', part: 'sparkle', swap: { mushroomglow: 'crystal' } },
  th_vanlo: { from: 'heaven', part: 'sparkle', swap: { goldtree: 'cloudpillar', lotus: 'cloudpuff' } },
  hd_huyettri: { from: 'hell', part: 'ember', swap: { deadtree: 'thorn', pillar: 'bones' } },
  hd_madien: { from: 'lava', part: 'ember', swap: { rock: 'obelisk', bones: 'banner' } },
  hd_tedan: { from: 'hell', part: 'void', swap: { torch: 'obelisk', spikes: 'skull' } },
  hd_hukhong: { from: 'starfield', part: 'void', swap: { lotus: 'voidcrystal' } },
  tc_vanmon: { from: 'heaven', part: 'petal', swap: { censer: 'stonelantern' } },
  tc_thuycanh: { from: 'dragon_palace', part: 'sparkle', swap: { kelp: 'lotus', coral: 'jadepillar' } },
  tc_thanhdien: { from: 'heaven', part: 'sparkle', swap: { lotus: 'censer', goldtree: 'jadepillar' } },
  tc_daonguyen: { from: 'sakura', part: 'petal', swap: { parasol: 'censer' } },
  tc_bandao: { from: 'jade_peak', part: 'petal', swap: { pine: 'sakura', bamboo: 'goldtree' } },
};
