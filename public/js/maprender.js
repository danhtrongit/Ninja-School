// Vẽ bản đồ: bầu trời, núi xa (parallax), mặt đất, bục nhảy, trang trí, cổng dịch chuyển
import { shade } from './sprites.js';

const THEMES = {
  village_fire: { sky: ['#f7b267', '#fde2c4'], far: '#b5657a', mid: '#c97b63', top: '#6aa84f', dirt: '#7a4b2a', plat: 'wood', roof: '#c0392b', decor: ['house', 'sakura', 'lantern', 'house', 'torii', 'sakura', 'fence'], part: 'petal' },
  village_water: { sky: ['#7fb8f0', '#e0f4ff'], far: '#6b8fc4', mid: '#7fb1cf', top: '#5cb85c', dirt: '#6b4f3a', plat: 'wood', roof: '#2e6da4', decor: ['house', 'willow', 'lantern', 'house', 'well', 'willow', 'fence'], part: null },
  village_wind: { sky: ['#9fdcc0', '#eef8d9'], far: '#6c9f78', mid: '#88b884', top: '#7cc36b', dirt: '#6f5236', plat: 'wood', roof: '#4e8a3a', decor: ['house', 'bamboo', 'windmill', 'house', 'lantern', 'bamboo', 'fence'], part: 'leaf' },
  grass_fire: { sky: ['#ffcf8f', '#fff1d6'], far: '#c88d6e', mid: '#9fbf6a', top: '#77b255', dirt: '#82522f', plat: 'wood', decor: ['tree', 'bush', 'flower', 'rock', 'tree', 'flower'], part: 'petal' },
  lake: { sky: ['#87c5f5', '#e8f6ff'], far: '#7aa6d6', mid: '#6db38a', top: '#64bb5a', dirt: '#6b4f3a', plat: 'wood', water: '#4aa3df', decor: ['tree', 'reed', 'flower', 'bush', 'rock', 'reed'], part: null },
  grass_wind: { sky: ['#a6e3c9', '#f1fbe8'], far: '#7fb08e', mid: '#9ccc7a', top: '#82c66a', dirt: '#73563a', plat: 'wood', decor: ['tree', 'bush', 'flower', 'tree', 'grass'], part: 'leaf' },
  bamboo: { sky: ['#b9e4b5', '#effbe6'], far: '#88b98a', mid: '#6ea56b', top: '#5c9e4b', dirt: '#5d4632', plat: 'bamboo', decor: ['bamboo', 'bamboo', 'bush', 'bamboo', 'rock'], part: 'leaf' },
  beach: { sky: ['#6ec6ff', '#e3f7ff'], far: '#9ad0ec', mid: '#3d9bd6', top: '#f2dc9b', dirt: '#d8bb72', plat: 'wood', water: '#2f8fd1', decor: ['palm', 'shell', 'rock', 'palm', 'coral'], part: null },
  cave: { sky: ['#15121f', '#2b2340'], far: '#231d33', mid: '#2e2644', top: '#5a5170', dirt: '#3a3349', plat: 'stone', ceiling: true, decor: ['crystal', 'rock', 'stalag', 'crystal', 'bones'], part: 'dust' },
  desert: { sky: ['#f8c46b', '#fde9b8'], far: '#e3a65c', mid: '#e9b872', top: '#f0cd85', dirt: '#c99a55', plat: 'stone', decor: ['cactus', 'rock', 'bones', 'cactus', 'pillar'], part: null },
  mist: { sky: ['#8fa3b8', '#d3dde6'], far: '#7d8fa3', mid: '#677a8c', top: '#5d7a5a', dirt: '#4a3d33', plat: 'stone', mist: true, decor: ['deadtree', 'rock', 'grave', 'deadtree', 'bush'], part: 'mist' },
  snow: { sky: ['#b8d3ec', '#f2f7fc'], far: '#c9d9ea', mid: '#9fb7cf', top: '#f4f8fb', dirt: '#8aa3b8', plat: 'ice', snowcap: true, decor: ['pine', 'pine', 'rock', 'snowman', 'pine'], part: 'snow' },
  ice: { sky: ['#9ed8f0', '#e8fbff'], far: '#b6e3f5', mid: '#7cc4e4', top: '#d4f3ff', dirt: '#5d8fb0', plat: 'ice', snowcap: true, decor: ['icespike', 'pine', 'icespike', 'crystal'], part: 'snow' },
  dark_forest: { sky: ['#24162f', '#4a2f4f'], far: '#3a2546', mid: '#2f2340', top: '#3d5a3a', dirt: '#2a2020', plat: 'wood', decor: ['deadtree', 'mushroomglow', 'grave', 'deadtree', 'bush'], part: 'firefly' },
  lava: { sky: ['#2a0808', '#6e1e0c'], far: '#4a1410', mid: '#5c1a10', top: '#4a3434', dirt: '#2e2020', plat: 'stone', ceiling: true, lava: true, decor: ['rock', 'stalag', 'bones', 'pillar', 'rock'], part: 'ember' },
  hell: { sky: ['#160303', '#4a0b0b'], far: '#2e0606', mid: '#3b0909', top: '#3a1a1a', dirt: '#1f0e0e', plat: 'stone', lava: true, decor: ['bones', 'pillar', 'deadtree', 'skull', 'pillar'], part: 'ember' },
  arena: { sky: ['#7fb8f0', '#e6f3ff'], far: '#8aa0b8', mid: '#a58a6c', top: '#b9a58a', dirt: '#8a7457', plat: 'stone', decor: ['banner', 'pillar', 'banner', 'pillar'], part: null },
};

function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) | 0;
  return h;
}

// Đường viền núi lặp lại
function ridge(len, seed, amp, rough) {
  const r = rng(seed);
  const pts = [];
  const n = 16;
  for (let i = 0; i < n; i++) pts.push(r());
  const out = new Float32Array(len);
  for (let x = 0; x < len; x++) {
    const f = (x / len) * n;
    const i = Math.floor(f);
    const t = f - i;
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    const s = t * t * (3 - 2 * t);
    out[x] = (a + (b - a) * s) * amp + Math.sin(x * 0.11 + seed) * rough;
  }
  return out;
}

export class MapRenderer {
  constructor(map) {
    this.map = map;
    this.th = THEMES[map.theme] || THEMES.grass_fire;
    this.seed = seedOf(map.id);
    this.farR = ridge(640, this.seed, 60, 2);
    this.midR = ridge(800, this.seed + 9, 40, 1.5);
    this.terrain = this.buildTerrain();
    this.particles = [];
  }

  buildTerrain() {
    const m = this.map;
    const th = this.th;
    const c = document.createElement('canvas');
    c.width = m.w;
    c.height = m.h;
    const g = c.getContext('2d');
    const r = rng(this.seed + 3);
    const G = m.ground;
    const P = (x, y, w, h, col) => {
      g.fillStyle = col;
      g.fillRect(x | 0, y | 0, w | 0, h | 0);
    };

    // Trang trí phía sau (vẽ trước mặt đất)
    const spots = [];
    const skip = (x) => m.portals.some((p) => Math.abs(p.x - x) < 70) || (m.npcs || []).some((n) => Math.abs(n.x - x) < 26);
    let x = 40 + r() * 60;
    let k = 0;
    while (x < m.w - 40) {
      const type = th.decor[k++ % th.decor.length];
      if (!skip(x) || type === 'house') spots.push([x, type]);
      x += (type === 'house' ? 170 : 60) + r() * 90;
    }
    if (m.town) {
      // Làng: nhà ở các vị trí cố định phía sau NPC
      for (const [hx, t] of spots) if (t !== 'house') this.decor(g, P, hx, G, t, r);
      for (const hx of [180, 560, 960, 1340]) if (hx < m.w - 60) this.decor(g, P, hx, G, 'house', r);
    } else {
      for (const [dx, t] of spots) if (t !== 'house') this.decor(g, P, dx, G, t, r);
    }

    // Mặt hồ/biển phía sau
    if (th.water) {
      for (let i = 0; i < 6; i++) P(0, G - 18 + i * 3, m.w, 3, shade(th.water, -0.05 * i));
    }

    // Mặt đất
    P(0, G, m.w, m.h - G, th.dirt);
    for (let i = 0; i < m.w * 0.6; i++) {
      const dx = r() * m.w;
      const dy = G + 6 + r() * (m.h - G - 6);
      P(dx, dy, 2, 1, shade(th.dirt, r() < 0.5 ? -0.18 : 0.1));
    }
    P(0, G, m.w, 4, th.top);
    P(0, G + 4, m.w, 1, shade(th.top, -0.25));
    for (let gx = 0; gx < m.w; gx += 3) {
      if (r() < 0.6) P(gx, G - 1, 1, 1, shade(th.top, 0.15));
      if (r() < 0.15) P(gx, G - 2, 1, 2, shade(th.top, -0.1));
    }
    if (th.lava) {
      // dòng dung nham dưới đáy
      for (let lx = 0; lx < m.w; lx += 1) {
        const yy = m.h - 14 + Math.sin(lx * 0.08) * 2;
        P(lx, yy, 1, m.h - yy, '#ff6d00');
        if (lx % 7 === 0) P(lx, yy, 1, 1, '#ffd54f');
      }
    }

    // Bục nhảy
    for (const [px, py, pw] of m.platforms) this.platform(g, P, px, py, pw, r);
    if (th.ceiling) {
      for (let cx = 0; cx < m.w; cx += 4) {
        const hh = 18 + Math.sin(cx * 0.05 + this.seed) * 8 + r() * 6;
        P(cx, 0, 4, hh, th.far);
        P(cx, hh - 2, 4, 2, shade(th.far, 0.2));
      }
    }
    return c;
  }

  platform(g, P, x, y, w, r) {
    const th = this.th;
    const type = th.plat;
    if (type === 'wood') {
      P(x, y, w, 5, '#9c6b3e');
      P(x, y, w, 1, '#c99a63');
      P(x, y + 5, w, 1, '#5d3d22');
      for (let i = x + 6; i < x + w; i += 12) P(i, y + 1, 1, 4, '#7a5230');
      P(x + 6, y + 6, 2, 10, '#6d4a2b');
      P(x + w - 8, y + 6, 2, 10, '#6d4a2b');
      if (th.top) P(x, y - 1, w, 1, shade(th.top, 0.1));
    } else if (type === 'bamboo') {
      P(x, y, w, 4, '#8fbf4a');
      P(x, y, w, 1, '#c5e384');
      P(x, y + 4, w, 1, '#4f7a23');
      for (let i = x + 10; i < x + w; i += 18) P(i, y, 1, 4, '#5e8f2a');
      P(x + 4, y + 5, 2, 14, '#6ea33a');
      P(x + w - 6, y + 5, 2, 14, '#6ea33a');
    } else if (type === 'ice') {
      P(x, y, w, 6, '#a8dcf2');
      P(x, y, w, 2, '#f4fcff');
      P(x, y + 6, w, 1, '#5d9fc4');
      for (let i = x + 3; i < x + w - 2; i += 7) P(i, y + 7, 2, 2 + ((i * 7) % 4), '#cdeffc');
    } else {
      P(x, y, w, 7, shade(th.dirt, 0.15));
      P(x, y, w, 2, th.top);
      P(x, y + 7, w, 1, shade(th.dirt, -0.35));
      for (let i = x + 4; i < x + w - 4; i += 9) P(i, y + 3, 4, 2, shade(th.dirt, -0.1));
    }
  }

  decor(g, P, x, G, type, r) {
    const th = this.th;
    switch (type) {
      case 'tree': {
        const h = 40 + r() * 20;
        P(x - 2, G - h, 4, h, '#6d4c41');
        P(x - 1, G - h, 1, h, '#8d6e63');
        const lc = shade(th.top, -0.1);
        P(x - 14, G - h - 14, 28, 16, lc);
        P(x - 10, G - h - 22, 20, 10, shade(lc, 0.12));
        P(x - 18, G - h - 6, 36, 8, shade(lc, -0.15));
        P(x - 6, G - h - 20, 6, 3, shade(lc, 0.3));
        break;
      }
      case 'sakura': {
        const h = 44;
        P(x - 2, G - h, 4, h, '#5d4037');
        P(x - 16, G - h - 12, 32, 14, '#f8a5c2');
        P(x - 11, G - h - 20, 22, 9, '#fbc4d8');
        P(x - 20, G - h - 2, 40, 6, '#f48fb1');
        P(x - 5, G - h - 18, 5, 3, '#ffe1ec');
        break;
      }
      case 'willow': {
        const h = 50;
        P(x - 2, G - h, 4, h, '#5d4037');
        P(x - 14, G - h - 10, 28, 12, '#7cb342');
        for (let i = -14; i < 14; i += 3) P(x + i, G - h, 2, 14 + ((i * 13) % 8), '#8bc34a');
        break;
      }
      case 'palm': {
        for (let i = 0; i < 50; i++) P(x + Math.sin(i * 0.05) * 6, G - i, 3, 1, i % 4 ? '#a1887f' : '#795548');
        const tx = x + Math.sin(2.5) * 6;
        for (const [dx, dy] of [[-14, 2], [14, 2], [-10, -4], [10, -4], [0, -6]]) P(tx + Math.min(0, dx), G - 52 + dy, Math.abs(dx) || 3, 3, '#43a047');
        P(tx - 2, G - 49, 5, 4, '#6d4c41');
        break;
      }
      case 'pine': {
        const h = 54;
        P(x - 2, G - 10, 4, 10, '#5d4037');
        for (let i = 0; i < 4; i++) {
          const w = 26 - i * 6;
          P(x - w / 2, G - 18 - i * 11, w, 10, '#2e7d4f');
          if (th.snowcap) P(x - w / 2 + 2, G - 18 - i * 11, w - 4, 2, '#ffffff');
        }
        P(x - 1, G - h, 2, 6, th.snowcap ? '#ffffff' : '#2e7d4f');
        break;
      }
      case 'bamboo': {
        const h = 70 + r() * 40;
        for (let j = 0; j < 3; j++) {
          const bx = x + j * 7 - 7;
          P(bx, G - h + j * 6, 3, h - j * 6, j === 1 ? '#7cb342' : '#689f38');
          for (let yy = G - h + j * 6 + 10; yy < G; yy += 14) P(bx, yy, 3, 1, '#33691e');
          P(bx + 3, G - h + j * 6 + 12, 5, 2, '#8bc34a');
          P(bx - 5, G - h + j * 6 + 24, 5, 2, '#8bc34a');
        }
        break;
      }
      case 'bush':
        P(x - 10, G - 8, 20, 8, shade(th.top, -0.15));
        P(x - 7, G - 12, 14, 5, shade(th.top, -0.05));
        P(x - 4, G - 11, 3, 2, shade(th.top, 0.25));
        break;
      case 'flower':
        for (let i = 0; i < 5; i++) {
          const fx = x + i * 5 - 10;
          P(fx, G - 5, 1, 5, '#558b2f');
          P(fx - 1, G - 7, 3, 2, ['#ff5c8a', '#ffd54f', '#ffffff', '#ba68c8'][i % 4]);
        }
        break;
      case 'grass':
        for (let i = 0; i < 8; i++) P(x + i * 2 - 8, G - 3 - (i % 3), 1, 3 + (i % 3), shade(th.top, -0.2));
        break;
      case 'reed':
        for (let i = 0; i < 4; i++) {
          P(x + i * 4, G - 24 + i * 2, 1, 24 - i * 2, '#7a9a3a');
          P(x + i * 4 - 1, G - 26 + i * 2, 3, 4, '#8d6e63');
        }
        break;
      case 'rock':
        P(x - 9, G - 7, 18, 7, '#8a8f98');
        P(x - 6, G - 10, 12, 4, '#a3a8b0');
        P(x - 4, G - 9, 4, 2, '#c5c9cf');
        P(x - 9, G - 2, 18, 2, '#6b7078');
        break;
      case 'shell':
        P(x - 3, G - 3, 6, 3, '#ffccbc');
        P(x - 2, G - 4, 4, 1, '#ffab91');
        P(x + 8, G - 2, 3, 2, '#fff3e0');
        break;
      case 'coral':
        P(x - 1, G - 14, 2, 14, '#ff7043');
        P(x - 6, G - 10, 2, 8, '#ff8a65');
        P(x + 4, G - 12, 2, 10, '#ff8a65');
        P(x - 6, G - 3, 12, 3, '#e64a19');
        break;
      case 'cactus':
        P(x - 2, G - 26, 5, 26, '#558b2f');
        P(x - 8, G - 18, 3, 8, '#558b2f');
        P(x - 8, G - 11, 6, 3, '#558b2f');
        P(x + 6, G - 22, 3, 10, '#558b2f');
        P(x + 3, G - 13, 6, 3, '#558b2f');
        P(x - 1, G - 26, 1, 24, '#7cb342');
        break;
      case 'pillar':
        P(x - 6, G - 50, 12, 50, '#9e9e9e');
        P(x - 8, G - 54, 16, 5, '#bdbdbd');
        P(x - 8, G - 4, 16, 4, '#757575');
        P(x - 4, G - 48, 2, 44, '#bdbdbd');
        if (th.lava) P(x - 6, G - 30, 12, 3, '#5d1010');
        break;
      case 'bones':
        P(x - 6, G - 2, 12, 2, '#eeeeee');
        P(x - 7, G - 3, 2, 3, '#ffffff');
        P(x + 5, G - 3, 2, 3, '#ffffff');
        P(x + 10, G - 4, 4, 4, '#e0e0e0');
        P(x + 11, G - 3, 1, 1, '#212121');
        break;
      case 'skull':
        P(x - 4, G - 8, 8, 6, '#e0e0e0');
        P(x - 3, G - 2, 6, 2, '#bdbdbd');
        P(x - 2, G - 6, 2, 2, '#212121');
        P(x + 1, G - 6, 2, 2, '#212121');
        break;
      case 'crystal': {
        const cc = this.map.theme === 'ice' ? '#80deea' : this.map.theme === 'cave' ? '#b388ff' : '#4fc3f7';
        P(x - 2, G - 16, 4, 16, cc);
        P(x - 7, G - 9, 4, 9, shade(cc, -0.2));
        P(x + 4, G - 11, 4, 11, shade(cc, -0.1));
        P(x - 1, G - 15, 1, 10, '#ffffff');
        break;
      }
      case 'icespike':
        for (let i = 0; i < 3; i++) {
          const h = 14 + i * 7;
          for (let j = 0; j < h; j++) P(x + i * 7 - 7 - (h - j) / 5, G - j, 2 + ((h - j) / 3) | 0, 1, j > h - 3 ? '#ffffff' : '#b3e5fc');
        }
        break;
      case 'stalag':
        // thạch nhũ dưới đất
        for (let j = 0; j < 18; j++) P(x - (18 - j) / 4, G - j, ((18 - j) / 2) | 0 || 1, 1, shade(th.top, -0.15));
        break;
      case 'deadtree': {
        const h = 46;
        const tc = this.map.theme === 'dark_forest' ? '#3e2a4a' : '#5b4a3f';
        P(x - 2, G - h, 4, h, tc);
        P(x - 12, G - h + 8, 10, 2, tc);
        P(x - 12, G - h + 2, 2, 7, tc);
        P(x + 2, G - h + 14, 10, 2, tc);
        P(x + 10, G - h + 6, 2, 9, tc);
        P(x - 1, G - h - 6, 2, 6, tc);
        break;
      }
      case 'grave':
        P(x - 5, G - 12, 10, 12, '#9e9e9e');
        P(x - 4, G - 14, 8, 2, '#9e9e9e');
        P(x - 1, G - 10, 2, 6, '#616161');
        P(x - 3, G - 8, 6, 2, '#616161');
        break;
      case 'mushroomglow':
        P(x - 1, G - 6, 2, 6, '#e1bee7');
        P(x - 4, G - 9, 8, 3, '#ab47bc');
        P(x + 7, G - 4, 2, 4, '#e1bee7');
        P(x + 5, G - 6, 6, 2, '#7e57c2');
        break;
      case 'snowman':
        P(x - 6, G - 10, 12, 10, '#ffffff');
        P(x - 4, G - 18, 8, 8, '#ffffff');
        P(x - 2, G - 15, 1, 1, '#212121');
        P(x + 1, G - 15, 1, 1, '#212121');
        P(x + 2, G - 14, 3, 1, '#ff7043');
        break;
      case 'banner':
        P(x - 1, G - 60, 2, 60, '#5d4037');
        P(x + 1, G - 58, 14, 20, '#c62828');
        P(x + 4, G - 52, 8, 8, '#ffd54f');
        break;
      case 'house': {
        const roof = th.roof || '#8d4a2b';
        const w = 90;
        const h = 46;
        P(x - w / 2, G - h, w, h, '#efe2c4');
        P(x - w / 2, G - h, w, 3, '#8d6e63');
        for (let i = 0; i < 5; i++) P(x - w / 2 + i * (w / 4) - 1, G - h, 3, h, '#8d6e63');
        P(x - 10, G - 26, 20, 26, '#5d4037');
        P(x - 9, G - 25, 8, 25, '#6d4c41');
        P(x + 22, G - 34, 14, 12, '#ffecb3');
        P(x + 28, G - 34, 1, 12, '#8d6e63');
        P(x - 36, G - 34, 14, 12, '#ffecb3');
        P(x - 30, G - 34, 1, 12, '#8d6e63');
        // mái cong
        for (let i = 0; i < 16; i++) P(x - w / 2 - 10 + i, G - h - 16 + i, w + 20 - i * 2, 1, i % 3 ? roof : shade(roof, -0.25));
        P(x - w / 2 - 14, G - h - 1, w + 28, 3, shade(roof, -0.35));
        P(x - w / 2 - 14, G - h - 4, 4, 3, shade(roof, -0.35));
        P(x + w / 2 + 10, G - h - 4, 4, 3, shade(roof, -0.35));
        break;
      }
      case 'lantern':
        P(x - 1, G - 34, 2, 34, '#4e342e');
        P(x - 5, G - 40, 10, 9, '#e53935');
        P(x - 4, G - 38, 8, 5, '#ffcc80');
        P(x - 5, G - 41, 10, 1, '#212121');
        P(x - 5, G - 31, 10, 1, '#212121');
        break;
      case 'torii':
        P(x - 26, G - 58, 52, 5, '#c62828');
        P(x - 30, G - 62, 60, 4, '#212121');
        P(x - 20, G - 58, 5, 58, '#d32f2f');
        P(x + 15, G - 58, 5, 58, '#d32f2f');
        P(x - 24, G - 46, 48, 3, '#c62828');
        break;
      case 'well':
        P(x - 10, G - 12, 20, 12, '#9e9e9e');
        P(x - 10, G - 12, 20, 2, '#bdbdbd');
        P(x - 12, G - 34, 2, 22, '#5d4037');
        P(x + 10, G - 34, 2, 22, '#5d4037');
        P(x - 14, G - 36, 28, 3, '#8d4a2b');
        break;
      case 'windmill':
        P(x - 6, G - 50, 12, 50, '#d7ccc8');
        P(x - 8, G - 54, 16, 5, '#6d4c41');
        P(x - 3, G - 20, 6, 20, '#5d4037');
        break;
      case 'fence':
        for (let i = 0; i < 6; i++) P(x + i * 6 - 18, G - 10, 2, 10, '#a1887f');
        P(x - 18, G - 8, 36, 2, '#8d6e63');
        P(x - 18, G - 4, 36, 2, '#8d6e63');
        break;
      default:
    }
  }

  // Bầu trời + núi xa (gọi mỗi khung hình)
  drawBackground(ctx, camX, camY, W, H, t) {
    const th = this.th;
    const bands = 12;
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1);
      ctx.fillStyle = mix(th.sky[0], th.sky[1], f);
      ctx.fillRect(0, Math.floor((i * H) / bands), W, Math.ceil(H / bands) + 1);
    }
    const G = this.map.ground;
    // mặt trời / trăng
    if (!th.ceiling) {
      const dark = ['dark_forest', 'hell', 'lava'].includes(this.map.theme);
      ctx.fillStyle = dark ? '#ffcdd2' : '#fff8e1';
      const sx = Math.round(W * 0.78 - camX * 0.02);
      const sy = Math.round(30 - camY * 0.1);
      ctx.fillRect(sx - 8, sy - 6, 16, 12);
      ctx.fillRect(sx - 6, sy - 8, 12, 16);
      // mây
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 173 + t * (4 + i)) - camX * 0.08) % (W + 120);
        const cxx = (cx < 0 ? cx + W + 120 : cx) - 60;
        const cy = 18 + ((i * 37) % 50) - camY * 0.1;
        ctx.fillRect(Math.round(cxx), Math.round(cy), 34, 6);
        ctx.fillRect(Math.round(cxx + 8), Math.round(cy - 4), 18, 5);
      }
    }
    // núi xa
    const baseY = G - camY;
    this.drawRidge(ctx, this.farR, camX * 0.15, baseY - 40, W, th.far, H, th.snowcap);
    this.drawRidge(ctx, this.midR, camX * 0.35, baseY - 8, W, th.mid, H, false);
  }

  drawRidge(ctx, arr, off, base, W, col, H, cap) {
    const len = arr.length;
    ctx.fillStyle = col;
    for (let x = 0; x < W; x += 2) {
      const i = Math.floor(x + off) % len;
      const h = arr[(i + len) % len];
      const top = Math.round(base - h);
      ctx.fillRect(x, top, 2, H - top);
    }
    if (cap) {
      ctx.fillStyle = '#ffffff';
      for (let x = 0; x < W; x += 2) {
        const i = Math.floor(x + off) % len;
        const h = arr[(i + len) % len];
        if (h > 42) ctx.fillRect(x, Math.round(base - h), 2, 3);
      }
    }
  }

  drawTerrain(ctx, camX, camY, W, H) {
    const sx = Math.max(0, Math.floor(camX));
    const sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(this.terrain.width - sx, W + 1);
    const sh = Math.min(this.terrain.height - sy, H + 1);
    if (sw > 0 && sh > 0) ctx.drawImage(this.terrain, sx, sy, sw, sh, sx - Math.floor(camX), sy - Math.floor(camY), sw, sh);
    // dưới đáy bản đồ
    const below = this.map.h - camY;
    if (below < H) {
      ctx.fillStyle = shade(this.th.dirt, -0.3);
      ctx.fillRect(0, Math.floor(below), W, H - below + 1);
    }
  }

  drawPortals(ctx, camX, camY, t, maps) {
    const G = this.map.ground;
    for (const p of this.map.portals) {
      const x = Math.round(p.x - camX);
      const y = Math.round(G - camY);
      if (p.door) {
        // cổng gỗ có vòng xoáy
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(x - 16, y - 44, 4, 44);
        ctx.fillRect(x + 12, y - 44, 4, 44);
        ctx.fillStyle = '#c62828';
        ctx.fillRect(x - 20, y - 48, 40, 5);
        ctx.fillStyle = '#212121';
        ctx.fillRect(x - 22, y - 51, 44, 3);
        for (let i = 0; i < 18; i++) {
          const a = t * 3 + i * 0.7;
          const rr = 3 + (i % 6) * 2;
          ctx.fillStyle = i % 2 ? 'rgba(144,202,249,0.9)' : 'rgba(225,245,254,0.9)';
          ctx.fillRect(Math.round(x + Math.cos(a) * rr * 0.8), Math.round(y - 22 + Math.sin(a) * rr), 2, 2);
        }
      } else {
        // cột sáng ở mép bản đồ
        for (let i = 0; i < 40; i++) {
          const alpha = (1 - i / 40) * 0.5;
          ctx.fillStyle = `rgba(255,236,179,${alpha})`;
          ctx.fillRect(x - 6, y - i * 1.5 - 2, 12, 2);
        }
        for (let i = 0; i < 6; i++) {
          const py = (t * 30 + i * 11) % 50;
          ctx.fillStyle = '#fff59d';
          ctx.fillRect(x - 5 + ((i * 7) % 10), Math.round(y - py), 1, 2);
        }
        // biển chỉ đường
        const dir = p.x < this.map.w / 2 ? -1 : 1;
        const bx = x - dir * 24;
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(bx - 1, y - 24, 2, 24);
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(bx - 9, y - 30, 18, 8);
        ctx.fillStyle = '#4e342e';
        if (dir < 0) {
          ctx.fillRect(bx - 6, y - 27, 10, 2);
          ctx.fillRect(bx - 6, y - 28, 2, 4);
        } else {
          ctx.fillRect(bx - 4, y - 27, 10, 2);
          ctx.fillRect(bx + 4, y - 28, 2, 4);
        }
      }
    }
  }

  // Hạt bay theo chủ đề (lá, tuyết, tàn lửa...)
  drawParticles(ctx, camX, camY, W, H, dt) {
    const kind = this.th.part;
    if (!kind) return;
    const ps = this.particles;
    const want = kind === 'mist' ? 14 : 40;
    while (ps.length < want) {
      ps.push({ x: Math.random() * W, y: Math.random() * H, v: Math.random(), s: Math.random() });
    }
    for (const p of ps) {
      if (kind === 'snow') { p.y += (12 + p.v * 14) * dt; p.x += Math.sin(p.y * 0.05 + p.s * 6) * 6 * dt; }
      else if (kind === 'ember') { p.y -= (10 + p.v * 20) * dt; p.x += Math.sin(p.y * 0.07) * 8 * dt; }
      else if (kind === 'petal' || kind === 'leaf') { p.y += (10 + p.v * 10) * dt; p.x -= (8 + p.v * 12) * dt; }
      else if (kind === 'firefly') { p.x += Math.sin(p.s * 50 + p.y * 0.02) * 8 * dt; p.y += Math.cos(p.v * 50 + p.x * 0.02) * 8 * dt; }
      else if (kind === 'dust') { p.y += 3 * dt; }
      else if (kind === 'mist') { p.x += (4 + p.v * 6) * dt; }
      if (p.y > H + 4) p.y = -4;
      if (p.y < -4) p.y = H + 4;
      if (p.x < -40) p.x = W + 4;
      if (p.x > W + 40) p.x = -4;
      let col = '#ffffff';
      let w = 1;
      let h = 1;
      if (kind === 'ember') col = p.v > 0.5 ? '#ffab40' : '#ff6d00';
      if (kind === 'petal') { col = '#f8bbd0'; w = 2; }
      if (kind === 'leaf') { col = '#8bc34a'; w = 2; }
      if (kind === 'firefly') col = Math.sin(p.s * 100 + performance.now() / 300) > 0 ? '#e6ee9c' : 'rgba(230,238,156,0.3)';
      if (kind === 'dust') col = 'rgba(200,190,230,0.4)';
      if (kind === 'mist') { col = 'rgba(230,236,240,0.18)'; w = 60; h = 10; }
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), w, h);
    }
  }

  drawForeground(ctx, camX, camY, W, H, t) {
    if (this.th.mist) {
      ctx.fillStyle = 'rgba(220,228,236,0.18)';
      ctx.fillRect(0, Math.round(this.map.ground - camY - 30), W, 30);
    }
    if (this.map.theme === 'cave' || this.map.theme === 'lava' || this.map.theme === 'dark_forest' || this.map.theme === 'hell') {
      ctx.fillStyle = 'rgba(10,0,20,0.12)';
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function mix(a, b, f) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = ((pa >> 16) & 255) * (1 - f) + ((pb >> 16) & 255) * f;
  const g = ((pa >> 8) & 255) * (1 - f) + ((pb >> 8) & 255) * f;
  const bb = (pa & 255) * (1 - f) + (pb & 255) * f;
  return `rgb(${r | 0},${g | 0},${bb | 0})`;
}

export { THEMES };
