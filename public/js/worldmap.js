// Bản đồ thế giới: cuộn tranh giấy da vẽ pixel bằng code, nút bản đồ theo vị trí địa lý
import { S } from './store.js';
import { routeMaps } from './pathfind.js';

// Kích thước tranh theo pixel nghệ thuật
const W = 280;
const H = 160;
const INK = '#1d1424';

// Vị trí địa lý của từng bản đồ (pixel nghệ thuật). lb: phía đặt nhãn (b dưới, t trên, l trái, r phải)
export const WORLD_LAYOUT = {
  fire_field: { x: 18, y: 118, lb: 'b' },
  v_fire: { x: 50, y: 110, lb: 'b' },
  arena: { x: 44, y: 142, lb: 'r' },
  bamboo: { x: 80, y: 101, lb: 'b' },
  sakura_garden: { x: 62, y: 72, lb: 'b' },
  v_water: { x: 110, y: 113, lb: 'b' },
  water_lake: { x: 106, y: 138, lb: 'b' },
  coast: { x: 140, y: 126, lb: 'b' },
  bat_cave: { x: 168, y: 107, lb: 'b' },
  v_wind: { x: 198, y: 120, lb: 'b' },
  wind_hill: { x: 220, y: 143, lb: 'r' },
  wasteland: { x: 230, y: 102, lb: 'b' },
  ancient_ruins: { x: 264, y: 126, lb: 'b' },
  misty_valley: { x: 254, y: 70, lb: 'b' },
  snow_mountain: { x: 218, y: 46, lb: 'b' },
  ice_peak: { x: 188, y: 62, lb: 'b' },
  crystal_cave: { x: 196, y: 22, lb: 'b' },
  demon_forest: { x: 156, y: 74, lb: 'b' },
  demon_cave: { x: 130, y: 62, lb: 'b' },
  hell_gate: { x: 98, y: 48, lb: 'b' },
  heaven: { x: 128, y: 22, lb: 'b' },
  abyss: { x: 64, y: 30, lb: 'b' },
  dragon_palace: { x: 22, y: 60, lb: 'b' },
};

// Màu vùng đất theo theme (pha với nền giấy da)
const REGION = {
  village_fire: '#dcc28c', village_water: '#cfc996', village_wind: '#c8cb8e',
  grass_fire: '#c9c07a', grass_wind: '#a9c47c', lake: '#9fc4b8', bamboo: '#97b56c', beach: '#ead39a',
  cave: '#ab9e88', desert: '#e3c27c', mist: '#b2bba8', snow: '#f2f2ea', ice: '#cfe6ea',
  dark_forest: '#7c7488', lava: '#a8644c', hell: '#7a4448', arena: '#d4b07e',
  heaven: '#eef2f6', abyss: '#6e4a78', dragon_palace: '#8fc0c8', sakura: '#e4c2b4', crystal: '#a99cbc', ruins: '#e3c27c',
};
const VILLAGE_ROOF = { village_fire: '#d84a2c', village_water: '#3c86c9', village_wind: '#4f9a3c' };

// ---------- Tiện ích
const hash = (x, y) => {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi) + (hash(xi + 1, yi) - hash(xi, yi)) * sx;
  const b = hash(xi, yi + 1) + (hash(xi + 1, yi + 1) - hash(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mk = (w, hh) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = hh;
  return c;
};

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return e;
}

// ---------- Hình pixel dạng chuỗi (tự thêm viền tối 1px)
const GLYPHS = {
  house: [
    '......a......',
    '....aAAAa....',
    '..aAAAAAAAa..',
    'aAAAAAAAAAAAa',
    '.bbbbbbbbbbb.',
    '..wwwwwwwww..',
    '..wLLwdwLLw..',
    '..wLLwdwLLw..',
    '..wwwwdwwww..',
  ],
  hill: [
    '.....gGg.....',
    '...gGGGGGg...',
    '..gGGfGGGGg..',
    '.gGGGGGGfGGg.',
    'gGGfGGGGGGGGd',
    'GGGGGGGfGGGdd',
  ],
  pond: [
    '...wwwwwww...',
    '.wwWWWWWWWww.',
    'wWWWWWWpWWWWw',
    'wWWWWWpppWWWw',
    '.wwWWWWWWWww.',
    '...wwwwwww...',
  ],
  bamboo: [
    '.l...l...l.',
    'lGl.lGl.lGl',
    '.G...G...G.',
    '.g..lG...g.',
    '.G...G..lG.',
    '.G...g...G.',
    '.G...G...G.',
    'ddddddddddd',
  ],
  palm: [
    '..lll.lll..',
    '.lLLLlLLLl.',
    'lL..lGl..Ll',
    '.....t.....',
    '....t......',
    '....t......',
    '...t.....s.',
    'sssssssssss',
  ],
  cave: [
    '....rrrr.....',
    '..rRRRRRRr...',
    '.rRRRkkRRRr..',
    'rRRRkkkkRRRr.',
    'RRRRkkkkRRRRd',
    'RRRRkkkkRRRdd',
  ],
  pyramid: [
    '......y......',
    '.....yYs.....',
    '....yYYYs....',
    '...yYYYYYs...',
    '..yYYYdYYYs..',
    '.yYYYYdYYYYs.',
    'yYYYYYYYYYYYs',
  ],
  mist: [
    '...gGg.......',
    '..gGGGg.gGg..',
    'wwwwwwwwwwwww',
    'gGGGGGGGGGGGd',
    '.WWWWWWWWWWW.',
    'gGGGGGGGGGGdd',
  ],
  snow: [
    '......w......',
    '.....wWw.....',
    '....wWWsg....',
    '...wWWsggg...',
    '..ggWsgGggg..',
    '.ggggggGGggg.',
    'gggggggGGGggg',
  ],
  ice: [
    '.....w.....',
    '....wC.....',
    '...wCCc..w.',
    '...wCCc.wCc',
    '.w.wCCc.wCc',
    'wCcwCCcwCCc',
    'CCCCCCCCCCC',
  ],
  darktree: [
    '....pPp......',
    '..pPPPPPp.p..',
    '.pPPePPePPPp.',
    '..pPPPPPPPPp.',
    '....PttPPPp..',
    '.....tt..t...',
    '....tttt.....',
  ],
  volcano: [
    '....o.O.o....',
    '.....oOo.....',
    '....bOOOb....',
    '...bbbObbb...',
    '..bBbbbbbbb..',
    '.bBBbbbbbbbb.',
    'bBBbbbbbbbbbb',
  ],
  hellgate: [
    'h...........h',
    '.h.rrrrrrr.h.',
    '..rRRRRRRRr..',
    '..R.......R..',
    '..R..fOf..R..',
    '..R.fOOOf.R..',
    '.RRRrrrrrRRR.',
  ],
  arena: [
    '...sssssss...',
    '.sSSSSSSSSSs.',
    'sSdSdSdSdSdSs',
    'sSSSSSSSSSSSs',
    'sSdSdSdSdSdSs',
    '.sSSSSSSSSSs.',
  ],
  heaven: [
    '......a......',
    '....aAAAa....',
    '...bbbbbbb...',
    '....wLwLw....',
    '.cc.wwwww.cc.',
    'cCCccCCCCcCCc',
    '.cCCCCCCCCCc.',
  ],
  pagoda: [
    '.....A.....',
    '...aAAAa...',
    '....wLw....',
    '..aAAAAAa..',
    '...wwLww...',
    'wWwWwWwWwWw',
  ],
  sakura: [
    '...pPpPp.....',
    '.pPPpPPPPp...',
    'pPPPPpPPPPPp.',
    '.pPPPPPtPPp..',
    '...pPtPPp....',
    '.....tt......',
    '....tttt.....',
  ],
  ruins: [
    '.s.......s...',
    'sSs.....sSs..',
    '.S..sss..S...',
    '.S..sSs..S...',
    '.S...S...S.s.',
    'ddddddddddddd',
  ],
  crystal: [
    '.....v.......',
    '....vV...v...',
    '..r.vVr.vV...',
    '.rRrvVRrvVr..',
    'rRRRRRRRRRRr.',
    'RRRRRRRRRRRRd',
  ],
  abyss: [
    '...ppppp...',
    '.pPPpppPPp.',
    'pPppPPPppPp',
    'pPpPkkkPpPp',
    'pPppPPPppPp',
    '.pPPpppPPp.',
    '...ppppp...',
  ],
};

// Bảng màu cho từng hình
function glyphPal(kind, theme) {
  const roof = VILLAGE_ROOF[theme] || '#c0392b';
  const P = {
    house: { a: '#ffd36a', A: roof, b: '#3a1a10', w: '#f3e3c0', L: '#ffcc55', d: '#5a3a22' },
    hill: theme === 'grass_wind'
      ? { g: '#b8e07a', G: '#6fae3e', d: '#467a2a', f: '#ffffff' }
      : { g: '#e0d070', G: '#a8a83c', d: '#6d7024', f: '#e8442a' },
    pond: { w: '#4f8fae', W: '#7cc4e2', p: '#ff9ec4' },
    bamboo: { l: '#9ad65a', G: '#4f9a3c', g: '#2f6a2a', d: '#6d5a2a' },
    palm: { l: '#9ad65a', L: '#4f9a3c', G: '#2f6a2a', t: '#8a5a2c', s: '#e8c87a' },
    cave: { r: '#b0a090', R: '#7d6e60', k: '#2a1c18', d: '#4e4238' },
    pyramid: { y: '#ffe29a', Y: '#e0b45c', s: '#a87a34', d: '#5a3a1a' },
    mist: { g: '#9ac08a', G: '#6a8a64', d: '#4a6448', w: '#ffffff', W: '#e6ece8' },
    snow: { w: '#ffffff', W: '#e8f0f4', s: '#a8b8c8', g: '#8a96a8', G: '#5c6878' },
    ice: { w: '#ffffff', C: '#7ad4ec', c: '#3a96c0' },
    darktree: { p: '#6a5a8a', P: '#3c2e58', e: '#ff4848', t: '#3a241a' },
    volcano: { o: '#ffd24a', O: '#ff6a1a', b: '#6a3a2a', B: '#9a5a3a' },
    hellgate: { h: '#e8d8c8', r: '#c0301a', R: '#6a1010', f: '#ffb03a', O: '#ff4a1a' },
    arena: { s: '#e8d0a0', S: '#b8946a', d: '#5a3a22' },
    heaven: { a: '#ffe48a', A: '#f0b030', b: '#8a4a10', w: '#ffffff', L: '#ffd36a', c: '#ffffff', C: '#d8e8f8' },
    pagoda: { a: '#7ae8d8', A: '#1a9a8a', w: '#f3e3c0', L: '#ffcc55', W: '#4f8fae' },
    sakura: { p: '#ffc8dc', P: '#f07aa8', t: '#6a3a24' },
    ruins: { s: '#e8d8b0', S: '#b8a478', d: '#8a6a3a' },
    crystal: { v: '#f0c8ff', V: '#a86ae0', r: '#a09088', R: '#6a5c56', d: '#3a302c' },
    abyss: { p: '#a86ae0', P: '#5a2a8a', k: '#14081e' },
  };
  return P[kind];
}

const THEME_GLYPH = {
  village_fire: 'house', village_water: 'house', village_wind: 'house', grass_fire: 'hill', grass_wind: 'hill', lake: 'pond',
  bamboo: 'bamboo', beach: 'palm', cave: 'cave', desert: 'pyramid', mist: 'mist', snow: 'snow', ice: 'ice',
  dark_forest: 'darktree', lava: 'volcano', hell: 'hellgate', arena: 'arena',
  heaven: 'heaven', dragon_palace: 'pagoda', sakura: 'sakura', ruins: 'ruins', crystal: 'crystal', abyss: 'abyss',
};

const glyphCache = new Map();
// Vẽ hình theo theme thành canvas nhỏ có viền tối
const glyphCanvas = (kind, theme) => glyphCanvasRaw(`${kind}|${theme}`, GLYPHS[kind], glyphPal(kind, theme), INK);
const glyphOf = (m) => THEME_GLYPH[m.theme] || (m.town ? 'house' : 'hill');

// Huy hiệu nhỏ: sọ boss, kiếm chéo PK, dấu chấm than nhiệm vụ, mũi tên vị trí
const BADGES = {
  skull: { rows: ['.rrrrr.', 'rrwwwrr', 'rwkwkwr', 'rrwwwrr', 'rrwrwrr', '.rrrrr.'], pal: { r: '#b8241a', w: '#fff4e0', k: '#2a0a0a' } },
  crown: { rows: ['y.y.y', 'yyyyy', 'yryry', 'yyyyy'], pal: { y: '#ffd23c', r: '#e8442a' } },
  pk: { rows: ['s...s', '.s.s.', '..s..', '.s.s.', 'h...h'], pal: { s: '#ffffff', h: '#ff5252' } },
  quest: { rows: ['yy', 'yy', 'yy', 'yy', '..', 'yy'], pal: { y: '#ffe14a' } },
  arrow: { rows: ['yyyyyyy', '.yyyyy.', '..yyy..', '...y...'], pal: { y: '#fff176' } },
  torii: { rows: ['rrrrrrr', '.r...r.', 'rrrrrrr', '.r...r.', '.r...r.'], pal: { r: '#d8361e' } },
  // Tà Thú đang xuất hiện: mặt quỷ sừng trắng mắt vàng
  beast: { rows: ['w.....w', 'ww...ww', '.rrrrr.', 'rryryrr', 'rrrrrrr', '.rwrwr.'], pal: { w: '#eceff1', r: '#c62828', y: '#fff176' } },
};
function badgeCanvas(name, outline = '#120804') {
  return glyphCanvasRaw(`b:${name}|${outline}`, BADGES[name].rows, BADGES[name].pal, outline);
}
// Vẽ hình chuỗi thành canvas, tự thêm viền 1px
function glyphCanvasRaw(key, rows, pal, outline) {
  let c = glyphCache.get(key);
  if (c) return c;
  const gw = rows[0].length;
  const gh = rows.length;
  c = mk(gw + 2, gh + 2);
  const g = c.getContext('2d');
  const on = (x, y) => y >= 0 && y < gh && x >= 0 && x < gw && rows[y][x] !== '.';
  g.fillStyle = outline;
  for (let y = -1; y <= gh; y++) {
    for (let x = -1; x <= gw; x++) {
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (rows[y][x] === '.') continue;
      g.fillStyle = pal[rows[y][x]] || '#ff00ff';
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  glyphCache.set(key, c);
  return c;
}

// ---------- Bố cục: lấy vị trí có sẵn, bản đồ mới thì xếp cạnh bản đồ nối với nó
function layoutNodes(maps) {
  const ids = Object.keys(maps).filter((id) => !maps[id].instance);
  const pos = {};
  for (const id of ids) if (WORLD_LAYOUT[id]) pos[id] = { ...WORLD_LAYOUT[id] };
  const neigh = (id) => {
    const out = new Set();
    for (const p of maps[id].portals || []) if (maps[p.to]) out.add(p.to);
    for (const o of ids) for (const p of maps[o].portals || []) if (p.to === id) out.add(o);
    return [...out];
  };
  const free = (x, y) => x > 12 && x < W - 12 && y > 14 && y < H - 12 && Object.values(pos).every((q) => Math.hypot(q.x - x, q.y - y) >= 20);
  let todo = ids.filter((id) => !pos[id]);
  for (let pass = 0; pass < 4 && todo.length; pass++) {
    for (const id of todo) {
      const base = neigh(id).find((n) => pos[n]);
      if (!base && pass < 3) continue;
      const b = base ? pos[base] : { x: W / 2, y: H / 2 };
      let spot = null;
      for (let r = 24; r <= 90 && !spot; r += 8) {
        for (let a = 0; a < 16 && !spot; a++) {
          const ang = (a / 16) * Math.PI * 2 + hash(id.length, r) * 0.4;
          const x = Math.round(b.x + Math.cos(ang) * r);
          const y = Math.round(b.y + Math.sin(ang) * r * 0.7);
          if (free(x, y)) spot = { x, y, lb: 'b' };
        }
      }
      pos[id] = spot || { x: Math.round(b.x + 10), y: Math.round(b.y + 10), lb: 'b' };
    }
    todo = ids.filter((id) => !pos[id]);
  }
  return pos;
}

// Đường nối theo cổng (gộp hai chiều; cổng door vẽ khác)
function buildEdges(maps, pos) {
  const seen = new Map();
  for (const id in pos) {
    for (const p of maps[id].portals || []) {
      if (!pos[p.to]) continue;
      const k = id < p.to ? `${id}|${p.to}` : `${p.to}|${id}`;
      const e = seen.get(k);
      const from = p.door ? id : null;
      if (e) { e.door = e.door || !!p.door; e.from = e.from || from; }
      else seen.set(k, { a: id < p.to ? id : p.to, b: id < p.to ? p.to : id, door: !!p.door, from });
    }
  }
  const edges = [...seen.values()];
  for (const e of edges) {
    const A = pos[e.a];
    const B = pos[e.b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    // đường cong nhẹ, hướng cong cố định theo cặp bản đồ
    const bend = (hash(e.a.length * 31 + e.b.length, A.x + B.y) < 0.5 ? -1 : 1) * Math.min(6, len * 0.14);
    const cx = (A.x + B.x) / 2 + (-dy / len) * bend;
    const cy = (A.y + B.y) / 2 + (dx / len) * bend;
    const pts = [];
    let last = '';
    const n = Math.ceil(len * 1.6);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = Math.round((1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cx + t * t * B.x);
      const y = Math.round((1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cy + t * t * B.y);
      const key = `${x},${y}`;
      if (key !== last) pts.push([x, y]);
      last = key;
    }
    e.pts = pts;
    // cổng torii lệch về phía nhánh phụ để nhãn bản đồ chính có chỗ
    if (e.door) {
      const dest = e.from === e.b ? A : B;
      let i = Math.floor((pts.length - 1) * (e.from === e.b ? 0.3 : 0.7));
      const step = e.from === e.b ? 1 : -1;
      while (pts[i + step] && Math.hypot(pts[i][0] - dest.x, pts[i][1] - dest.y) < 15) i += step;
      e.torii = pts[i];
    }
  }
  return edges;
}

// Biển: vịnh phía nam và biển phía tây bắc
function seaVal(x, y) {
  const n = vnoise(x / 7, y / 7) * 0.18;
  const s1 = ((x - 154) / 50) ** 2 + ((y - 172) / 31) ** 2;
  const s2 = ((x + 6) / 34) ** 2 + ((y - 62) / 30) ** 2;
  return Math.min(s1, s2) - n;
}

// ---------- Nền tranh (vẽ một lần, giữ trong bộ nhớ)
let bgCache = null;
function paintBackground(maps, pos, edges) {
  const key = Object.keys(pos).sort().map((id) => `${id}:${pos[id].x},${pos[id].y},${maps[id].theme}`).join(';');
  if (bgCache && bgCache.key === key) return bgCache.c;
  const c = mk(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  const P0 = rgb('#ecd8a8');
  const P1 = rgb('#dcc08a');
  const P2 = rgb('#f6e6bc');
  const EDGE = rgb('#9a6a36');
  const SEA = rgb('#86b8c4');
  const SEA2 = rgb('#6a9fb2');
  const SHORE = rgb('#5a3e24');
  const nodes = Object.keys(pos).map((id) => ({ id, x: pos[id].x, y: pos[id].y, col: rgb(REGION[maps[id].theme] || '#d8c48e') }));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const th = BAYER[(y & 3) * 4 + (x & 3)];
      const nz = vnoise(x / 11, y / 11) * 0.65 + vnoise(x / 3.5, y / 3.5) * 0.35;
      let col = nz < 0.36 ? (th < 0.5 ? P1 : P0) : nz > 0.7 ? (th < 0.4 ? P2 : P0) : P0;
      // vùng đất theo bản đồ gần nhất
      let best = null;
      let bd = 1e9;
      for (const nd of nodes) {
        const dd = (nd.x - x) ** 2 + ((nd.y - y) * 1.25) ** 2;
        if (dd < bd) { bd = dd; best = nd; }
      }
      const R = 17 + vnoise(x / 6, y / 6) * 8;
      const dist = Math.sqrt(bd);
      if (best && dist < R) {
        const f = dist < R * 0.55 ? 1 : (R - dist) / (R * 0.45);
        if (f > th) col = mix(best.col, col, nz < 0.3 ? 0.12 : 0);
      }
      // biển
      const sv = seaVal(x, y);
      if (sv < 1) {
        const near = sv > 0.86;
        const wave = (y % 6 === 0 && (x + (y >> 1)) % 9 < 3) || (y % 6 === 3 && (x + 4 + (y >> 1)) % 9 < 2);
        col = near ? SHORE : sv > 0.72 ? mix(SEA, P2, 0.35) : wave ? mix(SEA, P2, 0.45) : sv < 0.45 && th < 0.5 ? SEA2 : SEA;
        if (sv > 0.86 && sv < 0.93) col = SHORE;
        else if (sv >= 0.93) col = mix(SEA, P2, 0.55);
      }
      // mép giấy cháy sẫm
      const ed = Math.min(x, y, W - 1 - x, H - 1 - y) + vnoise(x / 4, y / 4) * 3;
      if (ed < 6) col = mix(col, EDGE, ((6 - ed) / 6) ** 1.4 * (th < 0.8 ? 0.85 : 0.6));
      const i = (y * W + x) * 4;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  // mặt nạ để trang trí không đè đường, nút, nhãn
  const busy = new Uint8Array(W * H);
  const mark = (x, y, r) => {
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) busy[yy * W + xx] = 1;
  };
  for (const e of edges) for (const [x, y] of e.pts) mark(x, y, 2);
  for (const id in pos) {
    const p = pos[id];
    for (let yy = p.y - 12; yy <= p.y + 16; yy++) for (let xx = p.x - 22; xx <= p.x + 22; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) busy[yy * W + xx] = 1;
  }

  // trang trí nhỏ theo vùng
  const deco = (kind, x, y) => {
    const px = (dx, dy, cl) => { g.fillStyle = cl; g.fillRect(x + dx, y + dy, 1, 1); };
    const rect = (dx, dy, w, hh, cl) => { g.fillStyle = cl; g.fillRect(x + dx, y + dy, w, hh); };
    if (kind === 'tree') { rect(-1, -3, 3, 2, '#5f8a3a'); rect(-2, -2, 5, 1, '#4a7030'); px(0, -1, '#5a3a22'); px(-1, -3, '#86b04e'); }
    else if (kind === 'pine') { px(0, -4, '#3c2e58'); rect(-1, -3, 3, 1, '#3c2e58'); rect(-2, -2, 5, 1, '#2c2044'); px(0, -1, '#2a1a14'); }
    else if (kind === 'stalk') { rect(-1, -4, 1, 4, '#3f7a30'); rect(1, -5, 1, 5, '#4f9a3c'); px(2, -5, '#9ad65a'); px(-2, -4, '#9ad65a'); }
    else if (kind === 'mount') { px(0, -4, '#ffffff'); rect(-1, -3, 3, 1, '#e8f0f4'); rect(-2, -2, 5, 1, '#8a96a8'); rect(-3, -1, 7, 1, '#6a7688'); px(1, -3, '#a8b8c8'); }
    else if (kind === 'rock') { rect(-1, -2, 3, 1, '#8e8070'); rect(-2, -1, 5, 1, '#6a5c50'); px(-1, -2, '#b0a090'); }
    else if (kind === 'dune') { rect(-2, -1, 5, 1, '#c09048'); rect(-1, -2, 3, 1, '#f0d090'); }
    else if (kind === 'tuft') { px(-1, -1, '#6d8a34'); px(1, -1, '#6d8a34'); px(0, -2, '#8aa844'); }
    else if (kind === 'flame') { px(0, -3, '#ffd24a'); rect(-1, -2, 3, 1, '#ff8a2a'); rect(-1, -1, 3, 1, '#c0301a'); }
    else if (kind === 'cloud') { rect(-2, -2, 5, 1, '#ffffff'); rect(-3, -1, 7, 1, '#e6eef6'); px(1, -3, '#ffffff'); }
    else if (kind === 'blossom') { px(0, -2, '#f07aa8'); px(-1, -1, '#ffc8dc'); px(1, -1, '#f07aa8'); px(0, -1, '#6a3a24'); }
    else if (kind === 'reed') { rect(0, -3, 1, 3, '#5f7a3a'); px(1, -4, '#8a5a2c'); px(-1, -2, '#6d8a34'); }
  };
  const DECO = {
    village_fire: 'tree', village_water: 'tree', village_wind: 'tree', grass_fire: 'tuft', grass_wind: 'tree', lake: 'reed', bamboo: 'stalk',
    beach: 'tuft', cave: 'rock', desert: 'dune', mist: 'mount', snow: 'mount', ice: 'mount', dark_forest: 'pine', lava: 'flame', hell: 'flame', arena: 'tuft',
    heaven: 'cloud', sakura: 'blossom', abyss: 'flame', dragon_palace: null, crystal: 'rock', ruins: 'dune',
  };
  const ID_DECO = { fire_field: 'flame' };
  for (let gy = 6; gy < H - 4; gy += 8) {
    for (let gx = 6 + ((gy >> 3) & 1) * 4; gx < W - 6; gx += 9) {
      const x = gx + Math.floor(hash(gx, gy) * 5) - 2;
      const y = gy + Math.floor(hash(gy, gx) * 5) - 2;
      if (x < 7 || y < 8 || x > W - 8 || y > H - 6) continue;
      if (busy[y * W + x] || seaVal(x, y) < 1.15) continue;
      let best = null;
      let bd = 1e9;
      for (const nd of nodes) {
        const dd = (nd.x - x) ** 2 + ((nd.y - y) * 1.25) ** 2;
        if (dd < bd) { bd = dd; best = nd; }
      }
      if (!best || bd > 21 * 21 || hash(x * 3, y * 7) < 0.3) continue;
      const kind = best.id in ID_DECO ? ID_DECO[best.id] : DECO[maps[best.id].theme];
      if (kind) { deco(kind, x, y); mark(x, y, 2); }
    }
  }
  // sóng nhỏ trên biển
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i, 91) * W);
    const y = Math.floor(hash(91, i) * H);
    if (seaVal(x, y) > 0.6 || busy[y * W + x]) continue;
    g.fillStyle = '#d8eef2';
    g.fillRect(x, y, 2, 1);
    g.fillRect(x + 2, y - 1, 2, 1);
  }

  // đường đi: đường chính nét gạch nâu, cửa nhánh phụ nét chấm đỏ kèm cổng torii
  for (const e of edges) {
    e.pts.forEach(([x, y], i) => {
      const near = (id) => Math.hypot(pos[id].x - x, pos[id].y - 3 - y) < 7;
      if (near(e.a) || near(e.b)) return;
      if (e.door) {
        if (i % 3 === 2) return;
        g.fillStyle = '#b8321e';
      } else {
        if (i % 5 >= 3) return;
        g.fillStyle = '#6b4423';
      }
      g.fillRect(x, y, 1, 1);
      g.fillStyle = 'rgba(255,240,200,0.55)';
      g.fillRect(x, y + 1, 1, 1);
    });
    if (e.door) {
      const [mx, my] = e.torii;
      const t = badgeCanvas('torii', INK);
      g.drawImage(t, mx - (t.width >> 1), my - t.height + 2);
    }
  }

  // la bàn ở góc trên phải
  compass(g, W - 20, 20);

  // nút bản đồ
  for (const id in pos) {
    const p = pos[id];
    const m = maps[id];
    const gc = glyphCanvas(glyphOf(m), m.theme);
    // bóng đổ dưới chân
    g.fillStyle = 'rgba(60,30,10,0.28)';
    g.fillRect(p.x - (gc.width >> 1) + 1, p.y + 3, gc.width - 2, 1);
    g.fillRect(p.x - (gc.width >> 1) + 3, p.y + 4, gc.width - 6, 1);
    g.drawImage(gc, p.x - (gc.width >> 1), p.y + 3 - gc.height);
  }
  bgCache = { key, c };
  return c;
}

function compass(g, cx, cy) {
  const px = (x, y, cl) => { g.fillStyle = cl; g.fillRect(cx + x, cy + y, 1, 1); };
  g.fillStyle = 'rgba(107,68,35,0.5)';
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(t) * 9), Math.round(cy + Math.sin(t) * 9), 1, 1);
  }
  for (let i = 1; i <= 7; i++) {
    const w = Math.max(0, 2 - Math.floor(i / 3));
    for (let k = -w; k <= w; k++) {
      px(k, -i, k <= 0 ? '#c0301a' : '#7a1a0a');
      px(k, i, k <= 0 ? '#f6e6bc' : '#9a7a4a');
      px(-i, k, k <= 0 ? '#e8d0a0' : '#8a6a3a');
      px(i, k, k <= 0 ? '#e8d0a0' : '#8a6a3a');
    }
  }
  px(0, 0, '#f0c869');
  // chữ B (Bắc) đặt ở lớp chữ
}

// ---------- Hàm chính
let lastSel = null;

// eventMaps (tùy chọn): [{ map, name, title, lv }] bản đồ đang có boss sự kiện (Tà Thú), vẽ vòng đỏ nhấp nháy + huy hiệu
export function buildWorldMap({ cur, questMaps = [], partyMaps = [], eventMaps = [], onGo } = {}) {
  const maps = (S.G && S.G.maps) || {};
  const monsters = (S.G && S.G.monsters) || {};
  const pos = layoutNodes(maps);
  const edges = buildEdges(maps, pos);
  const bg = paintBackground(maps, pos, edges);
  const myLv = (S.me && S.me.level) || 1;
  const myName = S.me && S.me.name;
  const qset = new Set(questMaps || []);
  const evAt = {};
  for (const e of eventMaps || []) if (e && e.map && maps[e.map]) evAt[e.map] = e;
  const party = {};
  for (const pm of partyMaps || []) {
    if (!pm || !pm.mapId || !pos[pm.mapId] || pm.name === myName) continue;
    (party[pm.mapId] = party[pm.mapId] || []).push(pm.name);
  }
  const bossesOf = (id) => (maps[id] && (maps[id].bosses || maps[id].boss)) || [];
  const over = (id) => !!(maps[id].lv && maps[id].lv[0] > myLv + 5);
  // server chặn vào khu PK dưới cấp 10
  const lockedPvp = (id) => !!(maps[id].pvp && myLv < 10);

  // phóng to nguyên theo kích thước màn hình
  const touch = document.body.classList.contains('touch');
  const Z = !touch && window.innerWidth >= 1200 && window.innerHeight >= 660 ? 3 : 2;
  const dpr = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  const K = Z * dpr;
  const cw = W * Z;
  const ch = H * Z;

  const cv = el('canvas', { class: 'wmap-cv', width: W * K, height: H * K });
  cv.style.width = `${cw}px`;
  cv.style.height = `${ch}px`;
  const tip = el('div', { class: 'wmap-tip' });
  const stage = el('div', { class: 'wmap-stage' }, cv, tip);
  stage.style.width = `${cw}px`;
  stage.style.height = `${ch}px`;
  const view = el('div', { class: 'wmap-view' }, stage);
  const info = el('div', { class: 'wmap-info' });
  const root = el('div', { class: `wmap z${Z}` }, el('div', { class: 'wmap-roll' }, view), info);

  // ---- lớp tĩnh phân giải cao: nền phóng to + huy hiệu + nhãn chữ
  // hai lớp tĩnh: nền (dưới lộ trình) và chữ (trên lộ trình)
  const hi = mk(W * K, H * K);
  const hiText = mk(W * K, H * K);
  const labelBoxes = {};
  const fontPx = Z >= 3 ? 17 : 15;
  const drawStatic = () => {
    const g = hi.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, hi.width, hi.height);
    g.drawImage(bg, 0, 0, W * K, H * K);
    const put = (c, x, y) => g.drawImage(c, Math.round(x) * K, Math.round(y) * K, c.width * K, c.height * K);
    for (const id in pos) {
      const p = pos[id];
      const m = maps[id];
      const gc = glyphCanvas(glyphOf(m), m.theme);
      const gw = gc.width;
      const top = p.y + 3 - gc.height;
      if (bossesOf(id).length) put(badgeCanvas('skull'), p.x - (gw >> 1) - 5, top - 3);
      if (m.pvp) put(badgeCanvas('pk'), p.x - (gw >> 1) - 4, top - 3);
      if (over(id)) {
        g.fillStyle = 'rgba(220,40,30,0.85)';
        const r = Math.round(gw / 2) + 1;
        for (let a = 0; a < 28; a++) {
          if (a % 2) continue;
          const t = (a / 28) * Math.PI * 2;
          g.fillRect(Math.round(p.x + Math.cos(t) * r) * K, Math.round(p.y - 2 + Math.sin(t) * (r * 0.75)) * K, K, K);
        }
      }
    }
    // chữ: tên bản đồ + cấp quái
    const g2 = hiText.getContext('2d');
    g2.clearRect(0, 0, hiText.width, hiText.height);
    g2.textAlign = 'center';
    g2.textBaseline = 'top';
    const fs = fontPx * dpr;
    const fs2 = (fontPx - 1) * dpr;
    placeLabels(g2, fs, fs2);
    for (const id in pos) drawLabel(g2, id, false, fs, fs2);
    // chữ B trên la bàn
    g2.font = `${fs}px VT323, monospace`;
    g2.lineWidth = 3 * dpr;
    g2.strokeStyle = '#120804';
    g2.fillStyle = '#f0c869';
    g2.strokeText('B', (W - 20) * K, dpr);
    g2.fillText('B', (W - 20) * K, dpr);
  };
  // đặt nhãn tránh đè: thử dưới, trên, phải, trái; chọn chỗ ít chồng lấn nhất
  const placeLabels = (g, fs, fs2) => {
    const boxes = [];
    for (const id in pos) {
      const p = pos[id];
      const gc = glyphCanvas(glyphOf(maps[id]), maps[id].theme);
      boxes.push([(p.x - (gc.width >> 1) - 1) * K, (p.y + 2 - gc.height) * K, (gc.width + 2) * K, (gc.height + 2) * K]);
      if (bossesOf(id).length || maps[id].pvp) boxes.push([(p.x - (gc.width >> 1) - 5) * K, (p.y - gc.height) * K, 9 * K, 8 * K]);
      // dấu nhiệm vụ và mũi tên vị trí là lớp động nhưng chỗ đặt cố định
      const top = p.y + 3 - gc.height;
      if (qset.has(id)) boxes.push([(p.x + (gc.width >> 1) - 1) * K, (top - 9) * K, 5 * K, 10 * K]);
      if (evAt[id]) boxes.push([(p.x - 5 + (id === cur ? 9 : 0)) * K, (top - 10) * K, 10 * K, 9 * K]);
      if (id === cur) boxes.push([(p.x - 4) * K, (top - 9) * K, 10 * K, 9 * K]);
    }
    for (const e of edges) if (e.torii) boxes.push([(e.torii[0] - 4) * K, (e.torii[1] - 6) * K, 9 * K, 7 * K]);
    boxes.push([(W - 31) * K, 8 * K, 22 * K, 24 * K]);
    const overlap = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    // làng được ưu tiên chỗ đẹp; chạy 2 lượt để nhãn đặt trước cũng né được nhãn đặt sau
    const ids = Object.keys(pos).sort((x, y) => (maps[y].town ? 1 : 0) - (maps[x].town ? 1 : 0));
    const fixed = boxes.length;
    const meta = {};
    for (const id of ids) {
      const m = maps[id];
      const lvTxt = m.town ? '' : m.pvp ? 'PK tự do' : m.lv ? `Lv ${m.lv[0]}-${m.lv[1]}` : '';
      g.font = `${fs}px VT323, monospace`;
      const w1 = g.measureText(m.name).width;
      g.font = `${fs2}px VT323, monospace`;
      const bw = Math.max(w1, lvTxt ? g.measureText(lvTxt).width : 0);
      const lh = fs * 0.86;
      meta[id] = { lvTxt, bw, lh, bh: lh + (lvTxt ? fs2 * 0.86 : 0), gh: glyphCanvas(glyphOf(m), m.theme).height };
    }
    const CANDS = [['b', 0], ['t', 0], ['r', 0], ['l', 0], ['b', 0.3], ['b', -0.3], ['t', 0.3], ['t', -0.3]];
    const placed = {};
    for (let pass = 0; pass < 2; pass++) {
      for (const id of ids) {
        const p = pos[id];
        const { bw, bh, gh } = meta[id];
        const others = boxes.slice(0, fixed).concat(ids.filter((o) => o !== id && placed[o]).map((o) => placed[o].r));
        const pref = p.lb || 'b';
        let best = null;
        CANDS.forEach(([sd, sh], i) => {
          let cx = p.x * K + sh * bw;
          let ty = (p.y + 6) * K;
          if (sd === 't') ty = (p.y + 1 - gh) * K - bh;
          else if (sd === 'r') { cx = (p.x + 9) * K + bw / 2; ty = (p.y - 3) * K - bh / 2; }
          else if (sd === 'l') { cx = (p.x - 9) * K - bw / 2; ty = (p.y - 3) * K - bh / 2; }
          cx = Math.max(bw / 2 + 4 * dpr, Math.min(W * K - bw / 2 - 4 * dpr, cx));
          ty = Math.max(2 * dpr, Math.min(H * K - bh - 2 * dpr, ty));
          const r = [cx - bw / 2 - 2 * dpr, ty, bw + 4 * dpr, bh];
          let score = (sd === pref && !sh ? 0 : 30 + i * 12) * dpr * dpr;
          for (const o of others) score += overlap(r, o);
          if (!best || score < best.score) best = { score, cx, ty, r };
        });
        placed[id] = best;
      }
    }
    for (const id of ids) {
      const P = placed[id];
      labelBoxes[id] = { ...meta[id], cx: P.cx, ty: P.ty, x: P.r[0] / K, y: P.r[1] / K, w: P.r[2] / K, h: P.r[3] / K };
    }
  };
  const drawLabel = (g, id, hot, fs, fs2) => {
    const L = labelBoxes[id];
    const m = maps[id];
    if (!L) return;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.lineJoin = 'round';
    g.lineWidth = 3 * dpr;
    g.strokeStyle = '#120804';
    g.font = `${fs}px VT323, monospace`;
    g.strokeText(m.name, L.cx, L.ty);
    g.fillStyle = hot ? '#ffffff' : m.town ? '#c8ecff' : m.pvp ? '#ff9a8a' : '#fff3c4';
    g.fillText(m.name, L.cx, L.ty);
    if (L.lvTxt) {
      g.font = `${fs2}px VT323, monospace`;
      g.strokeText(L.lvTxt, L.cx, L.ty + L.lh);
      g.fillStyle = over(id) ? '#ff6a5a' : hot ? '#fff59d' : '#f0c869';
      g.fillText(L.lvTxt, L.cx, L.ty + L.lh);
    }
  };
  drawStatic();
  if (document.fonts && !document.fonts.check(`${fontPx}px VT323`)) {
    document.fonts.load(`${fontPx}px VT323`).then(drawStatic).catch(() => {});
  }

  // ---- trạng thái chọn / di chuột
  let sel = lastSel && pos[lastSel] ? lastSel : pos[cur] ? cur : Object.keys(pos)[0];
  let hover = null;
  let route = null;
  const computeRoute = () => {
    route = null;
    if (!pos[cur] || !sel || sel === cur) return;
    try { route = routeMaps(maps, cur, sel); } catch (e) { route = null; }
  };

  // điểm trên đường nối giữa 2 bản đồ theo đúng chiều đi
  const edgePts = (a, b) => {
    const e = edges.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (!e) return null;
    return e.a === a ? e.pts : e.pts.slice().reverse();
  };

  // ---- lớp động: vẽ mỗi khung khi cửa sổ mở
  const ctx = cv.getContext('2d');
  const rect = (x, y, w, hh, cl) => { ctx.fillStyle = cl; ctx.fillRect(x * K, y * K, w * K, hh * K); };
  const putB = (c, x, y) => ctx.drawImage(c, Math.round(x) * K, Math.round(y) * K, c.width * K, c.height * K);
  const corners = (id, cl, grow) => {
    const p = pos[id];
    const gw = glyphCanvas(glyphOf(maps[id]), maps[id].theme).width;
    const x0 = p.x - (gw >> 1) - 2 - grow;
    const x1 = p.x + (gw >> 1) + 1 + grow;
    const y0 = p.y - 14 - grow;
    const y1 = p.y + 5 + grow;
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      rect(Math.min(x, x + sx * 2), y, 3, 1, cl);
      rect(x, Math.min(y, y + sy * 2), 1, 3, cl);
    }
  };
  const draw = (t) => {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(hi, 0, 0);
    // lộ trình được tô sáng
    if (route && route.length > 1) {
      const off = Math.floor(t * 14);
      for (let i = 0; i < route.length - 1; i++) {
        const pts = edgePts(route[i], route[i + 1]);
        if (!pts) continue;
        pts.forEach(([x, y], j) => {
          const near = (id) => Math.hypot(pos[id].x - x, pos[id].y - 3 - y) < 7;
          if (near(route[i]) || near(route[i + 1])) return;
          rect(x, y + 1, 1, 1, 'rgba(60,20,0,0.6)');
          rect(x, y, 1, 1, (j - off) % 6 < 3 && (j - off) % 6 >= -3 ? '#fff59d' : '#f0a830');
        });
      }
      for (let i = 1; i < route.length - 1; i++) {
        const p = pos[route[i]];
        if (p) { rect(p.x - 1, p.y + 5, 3, 1, '#f0a830'); }
      }
    }
    ctx.drawImage(hiText, 0, 0);
    if (hover && hover !== sel) corners(hover, '#fff8dc', 0);
    if (sel && pos[sel]) corners(sel, Math.floor(t * 3) % 2 ? '#ffd23c' : '#fff59d', Math.floor(t * 3) % 2);
    // đồng đội: chấm xanh dưới chân
    for (const id in party) {
      const p = pos[id];
      party[id].slice(0, 4).forEach((n, i) => {
        const x = p.x - 9 + i * 4;
        rect(x - 1, p.y + 2, 4, 4, '#120804');
        rect(x, p.y + 3, 2, 2, '#5ab4ff');
      });
    }
    // Tà Thú: vòng đỏ đứt quãng xoay quanh biểu tượng + huy hiệu mặt quỷ nhấp nháy
    for (const id in evAt) {
      const p = pos[id];
      if (!p) continue;
      const gc = glyphCanvas(glyphOf(maps[id]), maps[id].theme);
      const r = (gc.width >> 1) + 4;
      const pulse = Math.floor(t * 3) % 2;
      ctx.fillStyle = pulse ? '#ff1744' : '#ff8a80';
      for (let a = 0; a < 30; a++) {
        if ((a + Math.floor(t * 10)) % 5 < 2) continue;
        const ang = (a / 30) * Math.PI * 2;
        ctx.fillRect(Math.round(p.x + Math.cos(ang) * r) * K, Math.round(p.y - 3 + Math.sin(ang) * r * 0.62) * K, K, K);
      }
      const top = p.y + 3 - gc.height;
      putB(badgeCanvas('beast'), p.x - 4 + (id === cur ? 9 : 0), top - 9 - pulse);
    }
    // dấu nhiệm vụ
    const bob = Math.round(Math.sin(t * 4) * 1.5);
    for (const id of qset) {
      const p = pos[id];
      if (!p) continue;
      const gc = glyphCanvas(glyphOf(maps[id]), maps[id].theme);
      putB(badgeCanvas('quest'), p.x + (gc.width >> 1) - 1, p.y + 3 - gc.height - 7 + bob);
    }
    // vị trí hiện tại: mũi tên nhấp nháy + vòng sáng
    if (pos[cur]) {
      const p = pos[cur];
      const r = 8 + (Math.floor(t * 4) % 3);
      ctx.fillStyle = 'rgba(255,241,118,0.85)';
      for (let a = 0; a < 24; a++) {
        if ((a + Math.floor(t * 8)) % 3 === 0) continue;
        const ang = (a / 24) * Math.PI * 2;
        ctx.fillRect(Math.round(p.x + Math.cos(ang) * r) * K, Math.round(p.y + 3 + Math.sin(ang) * r * 0.35) * K, K, K);
      }
      const gh = glyphCanvas(glyphOf(maps[cur]), maps[cur].theme).height;
      if (Math.floor(t * 2.5) % 4 !== 3) putB(badgeCanvas('arrow'), p.x - 4, p.y + 3 - gh - 7 + bob);
    }
    // nhãn sáng khi di chuột / chọn
    const fs = fontPx * dpr;
    for (const id of new Set([hover, sel])) if (id && pos[id]) drawLabel(ctx, id, true, fs, (fontPx - 1) * dpr);
  };

  let raf = 0;
  let seen = false;
  let frames = 0;
  const loop = (now) => {
    raf = 0;
    if (!root.isConnected) {
      // cho phép vài khung chờ gắn vào DOM; bị gỡ hoặc không bao giờ gắn thì dừng hẳn
      if (seen || ++frames > 3) return;
    } else seen = true;
    draw(now / 1000);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // ---- khung thông tin
  const kindOf = (m) => m.town ? 'Làng' : m.pvp ? 'Đấu trường PK' : 'Bãi luyện công';
  const renderInfo = () => {
    info.textContent = '';
    if (!sel || !maps[sel]) return;
    const m = maps[sel];
    const sec = (title, ...kids) => el('div', { class: 'wmi-sec' }, el('div', { class: 'wmi-sub' }, title), ...kids);
    info.appendChild(el('div', { class: 'wmi-head' },
      el('div', { class: 'wmi-name' }, m.name),
      el('div', { class: 'wmi-tags' },
        el('span', { class: `wmi-tag k-${m.town ? 'town' : m.pvp ? 'pvp' : 'field'}` }, kindOf(m)),
        m.lv ? el('span', { class: `wmi-tag${over(sel) ? ' danger' : ''}` }, `Lv ${m.lv[0]}-${m.lv[1]}`) : null,
        sel === cur ? el('span', { class: 'wmi-tag here' }, 'Đang ở đây') : null,
        qset.has(sel) ? el('span', { class: 'wmi-tag quest' }, 'Nhiệm vụ') : null,
        evAt[sel] ? el('span', { class: 'wmi-tag event' }, 'Tà Thú') : null)));
    if (evAt[sel]) {
      const e = evAt[sel];
      info.appendChild(el('div', { class: 'wmi-event' }, el('b', null, e.title || 'Sự kiện'), `: ${e.name}${e.lv ? ` (Lv ${e.lv})` : ''} đang xuất hiện ở đây!`));
    }
    if (over(sel)) info.appendChild(el('div', { class: 'wmi-warn' }, `Quái mạnh hơn ngươi nhiều (cấp ${myLv}). Hãy cẩn thận.`));
    if (m.pvp) info.appendChild(el('div', { class: 'wmi-warn' }, 'Khu vực PK tự do: người chơi có thể tấn công nhau.'));
    if (lockedPvp(sel)) info.appendChild(el('div', { class: 'wmi-warn' }, `Cần đạt cấp 10 để vào ${m.name}.`));

    const mobs = (m.mobs || []).map((k) => monsters[k]).filter(Boolean);
    if (mobs.length) {
      info.appendChild(sec('Quái vật', el('ul', { class: 'wmi-list' }, ...mobs.map((d) =>
        el('li', null, el('span', null, d.name), el('b', { class: d.lv > myLv + 5 ? 'bad' : '' }, `Lv ${d.lv}`))))));
    }
    const bosses = bossesOf(sel).map((b) => monsters[b.m]).filter(Boolean);
    if (bosses.length) {
      info.appendChild(sec('Boss', el('ul', { class: 'wmi-list boss' }, ...bosses.map((d) =>
        el('li', null, el('span', null, d.name), el('b', null, `Lv ${d.lv}`))))));
    }
    if (m.town && m.npcs && m.npcs.length) {
      const types = (S.G && S.G.npcTypes) || {};
      info.appendChild(sec('Nhân vật', el('ul', { class: 'wmi-list npc' }, ...m.npcs.map((n) =>
        el('li', null, el('span', null, n.name), el('i', null, (types[n.type] && types[n.type].title) || ''))))));
    }
    if (party[sel]) info.appendChild(sec('Đồng đội ở đây', el('div', { class: 'wmi-party' }, ...party[sel].map((n) => el('span', { class: 'wmi-mate' }, n)))));

    // lộ trình
    let routeBox;
    if (sel === cur) routeBox = el('div', { class: 'wmi-route muted' }, 'Ngươi đang ở bản đồ này.');
    else if (!pos[cur]) routeBox = el('div', { class: 'wmi-route muted' }, 'Hãy rời phó bản trước khi tìm đường.');
    else if (!route) routeBox = el('div', { class: 'wmi-route bad' }, 'Không có đường đi tới đây.');
    else {
      const n = route.length - 1;
      routeBox = el('div', { class: 'wmi-route' },
        el('div', null, 'Cần đi qua ', el('b', null, String(n)), ' bản đồ'),
        el('div', { class: 'wmi-path' }, route.map((id) => (maps[id] ? maps[id].name : id)).join(' › ')));
    }
    info.appendChild(sec('Lộ trình', routeBox));
    if (sel !== cur) {
      const can = !!(route && onGo && !lockedPvp(sel));
      info.appendChild(el('button', {
        class: 'btn primary wmi-go', disabled: !can,
        onclick: () => { if (can) onGo(sel); },
      }, 'Đi tới'));
    }
  };

  const select = (id) => {
    sel = id;
    lastSel = id;
    computeRoute();
    renderInfo();
    info.scrollTop = 0;
  };
  computeRoute();
  renderInfo();

  // ---- tương tác chuột và cảm ứng
  const toArt = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const pick = (a) => {
    let best = null;
    let bd = 13;
    for (const id in pos) {
      const p = pos[id];
      const dd = Math.hypot(p.x - a.x, (p.y - 4 - a.y) * 1.1);
      if (dd < bd) { bd = dd; best = id; }
    }
    if (best) return best;
    for (const id in labelBoxes) {
      const b = labelBoxes[id];
      if (a.x >= b.x && a.x <= b.x + b.w && a.y >= b.y && a.y <= b.y + b.h) return id;
    }
    return null;
  };
  const showTip = (id) => {
    if (!id || !party[id]) { tip.classList.remove('on'); return; }
    tip.textContent = '';
    tip.appendChild(el('b', null, maps[id].name));
    for (const n of party[id]) tip.appendChild(el('div', null, n));
    const p = pos[id];
    tip.style.left = `${Math.round(p.x * Z)}px`;
    tip.style.top = `${Math.round((p.y - 16) * Z)}px`;
    tip.classList.add('on');
    clearTimeout(tipT);
    if (!hover) tipT = setTimeout(() => tip.classList.remove('on'), 2500);
  };
  let down = null;
  let tipT = 0;
  cv.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop, id: e.pointerId, mouse: e.pointerType === 'mouse', moved: false };
    if (down.mouse) { try { cv.setPointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ } }
  });
  cv.addEventListener('pointermove', (e) => {
    if (down && down.id === e.pointerId) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
      // kéo chuột để cuộn khi bản đồ lớn hơn khung
      if (down.mouse && down.moved) { view.scrollLeft = down.sl - dx; view.scrollTop = down.st - dy; }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const id = pick(toArt(e));
    if (id !== hover) {
      hover = id;
      cv.style.cursor = id ? 'pointer' : '';
      showTip(id);
    }
  });
  cv.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const tap = !down.moved;
    down = null;
    if (!tap) return;
    const id = pick(toArt(e));
    if (id) {
      select(id);
      if (e.pointerType !== 'mouse') showTip(id);
    }
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && !down) { hover = null; showTip(null); cv.style.cursor = ''; }
  });

  // cuộn khung tới vị trí đang chọn khi bản đồ lớn hơn khung nhìn
  requestAnimationFrame(() => {
    const p = pos[sel] || pos[cur];
    if (!p || !root.isConnected) return;
    view.scrollLeft = Math.max(0, p.x * Z - view.clientWidth / 2);
    view.scrollTop = Math.max(0, p.y * Z - view.clientHeight / 2);
  });
  return root;
}
