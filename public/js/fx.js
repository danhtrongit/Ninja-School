// Hiệu ứng kỹ năng, hạt, số sát thương (pixel art phát sáng, cache sprite offscreen)
import { shade } from './sprites.js';

const TAU = Math.PI * 2;
const MAX_PARTS = 900;
const MAX_TEXTS = 70;
const OUTLINE = '#1a1020';
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (v) => 1 - (1 - v) * (1 - v);
const easeOut3 = (v) => 1 - (1 - v) * (1 - v) * (1 - v);
const R0 = Math.round;

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

// ================= MÀU =================
const rgbCache = new Map();
function rgb(col) {
  let v = rgbCache.get(col);
  if (v) return v;
  if (col && col[0] === '#') {
    let s = col.slice(1);
    if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
    const n = parseInt(s, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const m = String(col).match(/\d+(\.\d+)?/g) || [255, 255, 255];
    v = m.slice(0, 3).map(Number);
  }
  rgbCache.set(col, v);
  return v;
}

function hsl(col) {
  const [r, g, b] = rgb(col).map((x) => x / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

// Suy ra hệ (lửa/nước/băng/gió/trung tính) từ màu + loại đạn
const elemCache = new Map();
function elemOf(c, p) {
  if (p === 'fire' || p === 'ice' || p === 'water' || p === 'wind') return p;
  const key = c || '#ffffff';
  let e = elemCache.get(key);
  if (e) return e;
  const { h, s, l } = hsl(key);
  if (s < 0.22 || l > 0.93) e = 'neutral';
  else if (h < 62 || h >= 330) e = 'fire';
  else if (h < 165) e = 'wind';
  else if (h < 265) e = l > 0.745 ? 'ice' : 'water';
  else e = 'neutral';
  elemCache.set(key, e);
  return e;
}

const EP = {
  fire: { glow: '#ff8a3c', spark: ['#fff59d', '#ffd54f', '#ffb74d', '#ff7043'], smoke: ['#4a3833', '#3b2e2b', '#5a4842'] },
  water: { glow: '#40c4ff', spark: ['#ffffff', '#b3e5fc', '#4fc3f7'], drop: ['#e1f5fe', '#81d4fa', '#4fc3f7', '#29b6f6'] },
  ice: { glow: '#80d8ff', spark: ['#ffffff', '#e1f5fe', '#b3e5fc'], drop: ['#ffffff', '#e1f5fe', '#b3e5fc'] },
  wind: { glow: '#b2ff59', spark: ['#ffffff', '#f1f8e9', '#ccff90'], leaf: ['#7cb342', '#9ccc65', '#aed581', '#558b2f', '#c5e1a5'] },
  neutral: { glow: '#ffffff', spark: ['#ffffff', '#fffde7', '#e3f2fd'] },
};

const rampCache = new Map();
// [trắng, rất sáng, sáng, màu gốc, tối, rất tối]
function ramp(c) {
  let r = rampCache.get(c);
  if (r) return r;
  const { l } = hsl(c);
  if (l > 0.9) r = ['#ffffff', '#ffffff', c, shade(c, -0.12), '#9fb8d8', '#5a6f8f'];
  else r = ['#ffffff', shade(c, 0.65), shade(c, 0.35), c, shade(c, -0.3), shade(c, -0.55)];
  rampCache.set(c, r);
  return r;
}

const flameCache = new Map();
function flameRamp(c, el) {
  const key = `${c}|${el}`;
  let r = flameCache.get(key);
  if (r) return r;
  if (el === 'fire') r = ['#fffde7', '#fff176', '#ffca28', c, shade(c, -0.35), '#5a2418'];
  else r = ['#ffffff', shade(c, 0.6), shade(c, 0.3), c, shade(c, -0.35), shade(c, -0.65)];
  flameCache.set(key, r);
  return r;
}

function glowCol(c, el) {
  if (el === 'neutral') return c && hsl(c).l < 0.9 ? c : '#fff8e1';
  return c;
}

// ================= SPRITE CACHE =================
// Đốm sáng tròn phân bậc (pixel art)
const GLOW_R = [2, 3, 4, 6, 8, 11, 16, 22, 32, 44, 60];
const glowCache = new Map();
function glowSprite(col, r) {
  const key = `${col}|${r}`;
  let c = glowCache.get(key);
  if (c) return c;
  const s = r * 2;
  c = mkCanvas(s, s);
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  const [R, G, B] = rgb(col);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (x + 0.5 - r) / r;
      const dy = (y + 0.5 - r) / r;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      let a = Math.pow(1 - d, 1.9);
      a = Math.round(a * 8) / 8;
      if (a <= 0) continue;
      const i = (y * s + x) * 4;
      img.data[i] = R;
      img.data[i + 1] = G;
      img.data[i + 2] = B;
      img.data[i + 3] = R0(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  glowCache.set(key, c);
  return c;
}
function pickR(r) {
  for (const v of GLOW_R) if (v >= r) return v;
  return 60;
}
function drawGlow(ctx, x, y, col, r, a, sy = 1, sx = 1) {
  if (a <= 0.01 || r < 0.5) return;
  ctx.globalAlpha = Math.min(1, a);
  const w = r * 2 * sx;
  const h = r * 2 * sy;
  ctx.drawImage(glowSprite(col, pickR(r)), R0(x - w / 2), R0(y - h / 2), R0(w), R0(h));
}

// Chấm tròn đặc (khói, lõi cầu lửa)
const dotCache = new Map();
function dotSprite(col, r) {
  const key = `${col}|${r}`;
  let c = dotCache.get(key);
  if (c) return c;
  const s = r * 2 + 1;
  c = mkCanvas(s, s);
  const g = c.getContext('2d');
  g.fillStyle = col;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x - r;
      const dy = y - r;
      if (dx * dx + dy * dy <= r * r + r * 0.6) g.fillRect(x, y, 1, 1);
    }
  }
  dotCache.set(key, c);
  return c;
}

// Cột sáng dọc (buff, lên cấp)
const beamCache = new Map();
function beamSprite(col, w, h) {
  const key = `${col}|${w}|${h}`;
  let c = beamCache.get(key);
  if (c) return c;
  c = mkCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const [R, G, B] = rgb(col);
  for (let y = 0; y < h; y++) {
    const vy = y / h;
    const ay = Math.pow(vy, 0.8) * (vy > 0.94 ? 1 - (vy - 0.94) * 6 : 1);
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - w / 2) / (w / 2);
      let a = Math.pow(1 - dx, 2) * ay;
      a = Math.round(a * 6) / 6;
      if (a <= 0) continue;
      const core = dx < 0.16 && vy > 0.1;
      const i = (y * w + x) * 4;
      img.data[i] = core ? 255 : R;
      img.data[i + 1] = core ? 255 : G;
      img.data[i + 2] = core ? 255 : B;
      img.data[i + 3] = R0(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  beamCache.set(key, c);
  return c;
}

function outlineImg(img, w, h, col) {
  const [R, G, B] = rgb(col);
  const d = img.data;
  const src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      if ((x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x])) {
        const i = (y * w + x) * 4;
        d[i] = R;
        d[i + 1] = G;
        d[i + 2] = B;
        d[i + 3] = 255;
      }
    }
  }
}

// Dải trăng khuyết: tâm (cx,cy), bán kính ngoài R, dày tối đa T, từ góc a0 (đuôi) tới a1 (đầu)
function bandImg(img, w, h, cx, cy, R, T, a0, a1, cols, opt = {}) {
  const span = a1 - a0;
  if (span <= 0.02) return;
  const d = img.data;
  const skew = opt.skew || 1.4;
  const rgbs = cols.map(rgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > R || r < R - T - 1) continue;
      let a = Math.atan2(dy, dx);
      while (a < a0) a += TAU;
      while (a >= a0 + TAU) a -= TAU;
      if (a > a1) continue;
      const u = (a - a0) / span;
      const th = T * Math.pow(Math.sin(Math.PI * Math.pow(u, skew)), 0.85);
      if (th < 0.7) continue;
      const v = (R - r) / th;
      if (v > 1) continue;
      const ci = v < 0.22 ? 0 : v < 0.48 ? 1 : v < 0.78 ? 2 : 3;
      let al = opt.tail ? Math.min(1, 0.15 + u * 1.5) : 1;
      al = Math.ceil(al * 4) / 4;
      const i = (y * w + x) * 4;
      const c = rgbs[ci];
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = R0(al * 255);
    }
  }
}

// Khung hình vệt chém trăng khuyết (8 khung) theo màu
const SLASH_A0 = -2.15;
const SLASH_A1 = 0.75;
const slashCache = new Map();
function slashFrames(c, big) {
  const key = `${c}|${big ? 1 : 0}`;
  let s = slashCache.get(key);
  if (s) return s;
  const R = big ? 21 : 15;
  const T = big ? 10 : 7;
  const cx = Math.ceil(R * 0.62) + 2;
  const cy = R + 2;
  const w = cx + R + 2;
  const h = cy + Math.ceil(R * 0.86) + 2;
  const rp = ramp(c);
  const cols = [rp[0], rp[1], rp[3], rp[4]];
  const frames = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N;
    const head = SLASH_A0 + (SLASH_A1 - SLASH_A0) * easeOut3(clamp01(f / 0.45));
    const tail = SLASH_A0 + (SLASH_A1 - SLASH_A0) * Math.pow(clamp01((f - 0.05) / 0.95), 1.5);
    const cv = mkCanvas(w, h);
    const g = cv.getContext('2d');
    const img = g.createImageData(w, h);
    bandImg(img, w, h, cx, cy, R, T * (1 - f * 0.35), tail, head, cols, { tail: true, skew: 1.5 });
    g.putImageData(img, 0, 0);
    frames.push(cv);
  }
  s = { frames, cx, cy, R };
  slashCache.set(key, s);
  return s;
}

// Lưỡi khí dọc ")" (kiếm khí, lưỡi gió) xoay theo góc
const bladeCache = new Map();
function bladeSprite(c, R, T, angIdx, span = 1.2) {
  const key = `${c}|${R}|${T}|${angIdx}|${span}`;
  let s = bladeCache.get(key);
  if (s) return s;
  const ang = (angIdx / 16) * TAU;
  const S = R * 2 + 4;
  const cv = mkCanvas(S, S);
  const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const rp = ramp(c);
  bandImg(img, S, S, S / 2, S / 2, R, T, ang - span, ang + span, [rp[0], rp[1], rp[3], rp[4]], { skew: 1 });
  g.putImageData(img, 0, 0);
  s = { cv, S };
  bladeCache.set(key, s);
  return s;
}

// Phi tiêu 4 cánh (khung xoay)
const shuriCache = new Map();
function shurikenFrames(c, R) {
  const key = `${c}|${R}`;
  let fr = shuriCache.get(key);
  if (fr) return fr;
  fr = [];
  const rp = ramp(c);
  const light = rgb(rp[1]);
  const mid = rgb(rp[3]);
  const dark = rgb(rp[4]);
  const S = R * 2 + 3;
  const cx = S / 2;
  for (let k = 0; k < 8; k++) {
    const rot = (k / 8) * (Math.PI / 2);
    const cv = mkCanvas(S, S);
    const g = cv.getContext('2d');
    const img = g.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cx;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > R + 0.3) continue;
        let a = Math.atan2(dy, dx) - rot - (r / R) * 0.35;
        let la = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
        const core = R * 0.42;
        const tip = Math.max(0, 1 - Math.abs(la) / (Math.PI / 4));
        const rf = core + (R + 0.3 - core) * Math.pow(tip, 2.4);
        if (r > rf) continue;
        let col = la < 0 ? light : mid;
        if (r > rf - 0.9 && la > 0) col = dark;
        if (r < 1.1) col = rgb(OUTLINE);
        else if (r < 1.9) col = dark;
        const i = (y * S + x) * 4;
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = 255;
      }
    }
    outlineImg(img, S, S, OUTLINE);
    g.putImageData(img, 0, 0);
    fr.push(cv);
  }
  shuriCache.set(key, fr);
  return fr;
}

// Mảnh băng nhọn xoay theo góc
const iceCache = new Map();
function iceSprite(len, angIdx) {
  const key = `${len}|${angIdx}`;
  let s = iceCache.get(key);
  if (s) return s;
  const ang = (angIdx / 16) * TAU;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const S = len + 6;
  const cv = mkCanvas(S, S);
  const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  const half = len / 2;
  const wmax = Math.max(1.6, len * 0.2);
  const cols = [rgb('#ffffff'), rgb('#e1f5fe'), rgb('#81d4fa'), rgb('#0288d1')];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - S / 2;
      const dy = y + 0.5 - S / 2;
      const al = dx * ux + dy * uy;
      const pn = -dx * uy + dy * ux;
      if (al < -half || al > half) continue;
      const t = al > half * 0.3 ? 1 - (al - half * 0.3) / (half * 0.7) : 1 - (half * 0.3 - al) / (half * 1.3);
      const wd = wmax * t;
      if (Math.abs(pn) > wd) continue;
      const ci = pn < -wd * 0.25 ? 0 : pn < wd * 0.2 ? 1 : pn < wd * 0.65 ? 2 : 3;
      const c = cols[ci];
      const i = (y * S + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  outlineImg(img, S, S, '#0d2a4a');
  g.putImageData(img, 0, 0);
  s = { cv, S };
  iceCache.set(key, s);
  return s;
}

// Thiên thạch (đá nóng chảy / cầu nước)
const meteorCache = new Map();
function meteorSprite(c, el, r) {
  const key = `${c}|${el}|${r}`;
  let s = meteorCache.get(key);
  if (s) return s;
  const S = r * 2 + 3;
  const cv = mkCanvas(S, S);
  const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const d = img.data;
  const fl = flameRamp(c, el);
  const cx = S / 2;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cx;
      const rr = Math.sqrt(dx * dx + dy * dy);
      if (rr > r + 0.2) continue;
      const lit = (dx + dy) / (r * 1.4);
      const n = rand();
      let col;
      if (el === 'water') {
        col = lit > 0.35 ? '#ffffff' : lit > -0.1 ? '#b3e5fc' : lit > -0.5 ? c : shade(c, -0.4);
        if (n > 0.86) col = '#e1f5fe';
      } else {
        col = lit > 0.45 ? fl[1] : lit > 0.1 ? fl[2] : n > 0.72 ? fl[3] : lit > -0.4 ? '#5d3a2a' : '#3e2420';
        if (n > 0.9) col = fl[2];
      }
      const cc = rgb(col);
      const i = (y * S + x) * 4;
      d[i] = cc[0];
      d[i + 1] = cc[1];
      d[i + 2] = cc[2];
      d[i + 3] = 255;
    }
  }
  outlineImg(img, S, S, el === 'water' ? '#0d2a4a' : '#2a0d08');
  g.putImageData(img, 0, 0);
  s = { cv, S };
  meteorCache.set(key, s);
  return s;
}

// Dấu cộng hồi máu
const plusCache = new Map();
function plusSprite(c, big) {
  const key = `${c}|${big ? 1 : 0}`;
  let cv = plusCache.get(key);
  if (cv) return cv;
  const m = big
    ? ['..ooo..', '..oLo..', 'oooLooo', 'oLLWLLo', 'oooMooo', '..oMo..', '..ooo..']
    : ['.ooo.', 'ooLoo', 'oLWMo', 'ooMoo', '.ooo.'];
  const pal = { o: shade(c, -0.6), L: shade(c, 0.45), W: '#ffffff', M: c };
  cv = mkCanvas(m[0].length, m.length);
  const g = cv.getContext('2d');
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  plusCache.set(key, cv);
  return cv;
}

// Bóng người (ảnh ảo khi lướt)
const silCache = new Map();
function silhouette(c) {
  let cv = silCache.get(c);
  if (cv) return cv;
  const m = [
    '......LLLLL.....', '.....LMMMMML....', '....LMMMMMMML...', 'LL..LMMMMMMMML..', '.LLLLMMMMMMMML..',
    '...LLMMMMMMMML..', '....LMMMMMMMML..', '.....LMMMMMML...', '......LMMMML....', '.....LMMMMMML...',
    '....LMMMMMMMMLL.', '...LMMMMMMMMMMML', '..LMLMMMMMMML.LL', '.LL.LMMMMMMML...', '....LMMMMMMML...',
    '....LMMMMMMML...', '....LMMMMMMMML..', '...LMMML.LMMML..', '..LMMML...LMMML.', '.LMMML.....LMML.',
    'LMMML.......LML.', 'LML..........LL.',
  ];
  const pal = { L: '#ffffff', M: c };
  cv = mkCanvas(16, m.length);
  const g = cv.getContext('2d');
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  silCache.set(c, cv);
  return cv;
}

// Lá cây xoay 4 khung
const LEAF_SHAPES = [
  [[0, 0, 0], [1, 0, 1], [2, 0, 2], [1, -1, 1]],
  [[0, 0, 0], [1, 1, 1], [2, 2, 2], [1, 0, 1]],
  [[0, 0, 0], [0, 1, 1], [0, 2, 2], [1, 1, 1]],
  [[0, 0, 0], [1, -1, 1], [2, -2, 2], [2, -1, 1]],
];

// ================= TIỆN ÍCH VẼ =================
function ringPx(ctx, cx, cy, rx, ry, w, h, a0 = 0, a1 = TAU, step = 1.6) {
  const n = Math.max(10, Math.min(320, R0(((rx + ry) * Math.PI * ((a1 - a0) / TAU)) / step)));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    ctx.fillRect(R0(cx + Math.cos(a) * rx - w / 2), R0(cy + Math.sin(a) * ry - h / 2), w, h);
  }
}

function linePx(ctx, x0, y0, x1, y1, w = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) ctx.fillRect(R0(x0 + (dx * i) / n), R0(y0 + (dy * i) / n), w, w);
}

// ================= LỚP FX =================
export class FX {
  constructor() {
    this.list = [];
    this.parts = [];
    this.texts = [];
    this.time = 0;
    this.mctx = mkCanvas(4, 4).getContext('2d');
    this.fontOK = false;
  }

  add(e) {
    e.t = 0;
    this.list.push(e);
    return e;
  }

  // ---- hạt
  spawn(k, x, y, vx, vy, life, c, o) {
    if (this.parts.length >= MAX_PARTS) return null;
    const p = { k, x, y, vx, vy, life, c, t: 0, g: 0, drag: 0, s: 1, s1: 1, a: 1, add: false, floor: 1e9, ph: Math.random() * TAU };
    if (o) Object.assign(p, o);
    if (o && o.s1 === undefined) p.s1 = p.s;
    this.parts.push(p);
    return p;
  }

  flame(x, y, vx, vy, rp, s = 3, life = 0.45) {
    return this.spawn('flame', x, y, vx, vy, life * rnd(0.7, 1.2), rp, { s, g: -40, drag: 2.2, add: true });
  }

  ember(x, y, c, up = 40) {
    return this.spawn('ember', x, y, rnd(-25, 25), -rnd(up * 0.4, up), rnd(0.5, 1.1), c, { g: -10, drag: 1.2, add: true });
  }

  smoke(x, y, c, s = 2, s1 = 5, life = 0.8, a = 0.55) {
    return this.spawn('smoke', x, y, rnd(-8, 8), -rnd(8, 22), life * rnd(0.8, 1.2), c, { s, s1, a, drag: 1.5 });
  }

  drop(x, y, vx, vy, c, floor) {
    return this.spawn('drop', x, y, vx, vy, rnd(0.45, 0.85), c, { g: 260, floor: floor === undefined ? 1e9 : floor });
  }

  leaf(x, y, vx, vy, c) {
    return this.spawn('leaf', x, y, vx, vy, rnd(0.6, 1.1), c || pick(EP.wind.leaf), { g: 25, drag: 1.6 });
  }

  wline(x, y, vx, len, c, life = 0.3) {
    return this.spawn('wline', x, y, vx, 0, life, c, { s: len, drag: 3, add: true });
  }

  star(x, y, c, s = 3, life = 0.4, vy = 0) {
    return this.spawn('star', x, y, rnd(-6, 6), vy, life, c, { s, add: true });
  }

  sparks(x, y, color, n = 8, speed = 60) {
    const c = color || '#ffffff';
    const el = elemOf(c);
    const sp = EP[el].spark;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.5 + Math.random() * 0.9);
      this.spawn('spark', x, y, Math.cos(a) * v, Math.sin(a) * v - 25, 0.22 + Math.random() * 0.28, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? c : pick(sp), { g: 150, drag: 2.2, s: Math.random() < 0.5 ? 3 : 2, add: true });
    }
    this.spawn('glow', x, y, 0, 0, 0.12, glowCol(c, el), { s: 4 + Math.min(10, n * 0.5), s1: 2, a: 0.85, add: true });
    if (n >= 10) this.star(x, y, '#ffffff', 6, 0.18);
  }

  text(x, y, str, color, big) {
    const s = String(str);
    const t = { x: x + (Math.random() * 10 - 5), y, s, c: color || '#ffffff', t: 0, big: !!big, cv: null, cs: 0 };
    t.miss = s === 'Né';
    t.crit = !!big && /\d!$/.test(s);
    t.banner = !!big && !t.crit;
    t.life = t.banner ? 1.6 : t.crit ? 1.25 : 1.1;
    t.side = Math.random() < 0.5 ? -1 : 1;
    this.texts.push(t);
    if (this.texts.length > MAX_TEXTS) this.texts.shift();
  }

  // ================= CÁC LOẠI HIỆU ỨNG =================
  slash(x, y, dir, c, big) {
    this.add({ k: 'slash', x, y, dir: dir || 1, c: c || '#ffffff', big: !!big, life: big ? 0.3 : 0.24, el: elemOf(c) });
  }

  proj(x0, y0, x1, y1, p, c, opts = {}) {
    const col = c || '#ffffff';
    const ang = Math.atan2(y1 - y0, x1 - x0);
    this.add({
      k: 'proj', x0, y0, x1, y1, p: p || 'fire', c: col, life: opts.life || 0.22, delay: opts.delay || 0, boom: opts.boom, big: opts.big,
      el: elemOf(col, p), ang, ux: Math.cos(ang), uy: Math.sin(ang), dir: x1 >= x0 ? 1 : -1, acc: 0,
    });
  }

  burst(x, y, r, c, big) {
    const col = c || '#ffffff';
    const el = elemOf(col);
    const e = this.add({ k: 'burst', x, y, r: Math.max(16, r), c: col, big: !!big, life: big ? 0.8 : 0.62, el, acc: 0 });
    if (el === 'ice') {
      const n = big ? 20 : 13;
      e.spikes = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd(-0.2, 0.2);
        const d = rnd(0.35, 0.95);
        e.spikes.push({ a, d, h: rnd(7, big ? 17 : 13), w: rnd(1.5, 2.6) });
      }
      e.spikes.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    }
    const R = e.r;
    this.spawn('glow', x, y - 10, 0, 0, 0.18, '#ffffff', { s: 10, s1: 16, a: 0.5, add: true });
    const n = big ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = R * rnd(0.9, 1.9);
      this.spawn('spark', x, y - 8, Math.cos(a) * v, Math.sin(a) * v * 0.5 - 30, rnd(0.25, 0.5), i % 2 ? '#ffffff' : pick(EP[el].spark), { g: 120, drag: 2.5, s: 3, add: true });
    }
  }

  wave(x, y, dir, range, c, p) {
    const col = c || '#ffffff';
    this.add({ k: 'wave', x, y, dir: dir || 1, range: range || 150, c: col, p, life: p === 'arrow' ? 0.5 : 0.48, el: elemOf(col), acc: 0, lastRing: 0 });
  }

  rain(x, y, r, p, c, big) {
    const col = c || '#ffffff';
    const n = big ? 18 : 10;
    this.add({ k: 'mark', x, y, r: Math.max(20, r), c: col, el: elemOf(col, p), life: big ? 1.05 : 0.8 });
    for (let i = 0; i < n; i++) {
      const tx = x + (Math.random() * 2 - 1) * r * 0.9;
      const ty = y - 3 + Math.random() * 6;
      const h = rnd(110, 140);
      this.proj(tx - h * 0.28, ty - h, tx, ty, p || 'shuriken', col, { life: rnd(0.26, 0.34), delay: i * (big ? 0.035 : 0.045), big: p === 'fire' && i % 3 === 0 });
    }
  }

  meteor(x, y, r, c) {
    const col = c || '#ff5722';
    let el = elemOf(col);
    if (el !== 'water' && el !== 'ice') el = 'fire';
    this.add({ k: 'meteor', x, y, r: Math.max(30, r), c: col, el, life: 1.3, hit: 0.32, big: r >= 150, acc: 0 });
  }

  whirl(x, y, r, c, big) {
    const col = c || '#9ccc65';
    const el = elemOf(col);
    const deb = [];
    const n = big ? 16 : 11;
    for (let i = 0; i < n; i++) {
      deb.push({ a: Math.random() * TAU, h: Math.random(), w: rnd(6, 11), vh: rnd(0.5, 1.1), kind: i % 3 === 0 ? 'rock' : 'leaf', c: i % 3 === 0 ? pick(['#8d6e63', '#6d4c41', '#a1887f']) : pick(EP.wind.leaf) });
    }
    this.add({ k: 'whirl', x, y, r: Math.max(30, r), c: col, big: !!big, el, life: big ? 1.15 : 0.95, deb, acc: 0 });
  }

  aura(get, c) {
    const col = c || '#ffd54f';
    this.add({ k: 'aura', get, c: col, el: elemOf(col), life: 1.25, acc: 0 });
  }

  heal(get, c) {
    const col = c || '#69f0ae';
    this.add({ k: 'heal', get, c: col, el: elemOf(col), life: 1.35, acc: 0 });
  }

  dash(x0, x1, y, dir, c) {
    const col = c || '#aed581';
    const lines = [];
    for (let i = 0; i < 12; i++) lines.push({ y: rnd(-26, -2), u: Math.random(), len: rnd(10, 36), c: i % 3 ? '#ffffff' : col });
    this.add({ k: 'dash', x0, x1, y, dir: dir || 1, c: col, el: elemOf(col), life: 0.55, lines, acc: 0 });
    for (let i = 0; i < 8; i++) this.smoke(x0 + rnd(-6, 6), y - rnd(0, 4), pick(['#d7ccc8', '#bcaaa4', '#efebe9']), 2, 5, 0.6, 0.6);
    this.slash(x1, y, dir || 1, col, true);
  }

  levelUp(get) {
    this.add({ k: 'level', get, life: 1.9, acc: 0, burst: false });
  }

  // ================= CẬP NHẬT =================
  update(dt) {
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    for (const e of this.list) {
      if (e.delay > 0) {
        e.delay -= dt;
        continue;
      }
      e.t += dt;
      const fn = this[`u_${e.k}`];
      if (fn) fn.call(this, e, dt);
    }
    let n = 0;
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const e = L[i];
      if (e.t < e.life || e.delay > 0) L[n++] = e;
    }
    L.length = n;

    const P = this.parts;
    n = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.k === 'leaf') p.x += Math.sin(p.t * 7 + p.ph) * 14 * dt;
      if (p.y > p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.5;
      }
      P[n++] = p;
    }
    P.length = n;
    for (const t of this.texts) t.t += dt;
    n = 0;
    for (let i = 0; i < this.texts.length; i++) if (this.texts[i].t < this.texts[i].life) this.texts[n++] = this.texts[i];
    this.texts.length = n;
  }

  // phát hạt theo nhịp (rate hạt/giây)
  tick(e, dt, rate) {
    e.acc = (e.acc || 0) + dt * rate;
    const k = Math.floor(e.acc);
    e.acc -= k;
    return k;
  }

  u_slash(e, dt) {
    const f = e.t / e.life;
    if (f > 0.55) return;
    const R = e.big ? 21 : 15;
    const head = SLASH_A0 + (SLASH_A1 - SLASH_A0) * easeOut3(clamp01(f / 0.45));
    const cx = e.x + e.dir * 3;
    const cy = e.y - 13;
    const hx = cx + e.dir * Math.cos(head) * R * 0.85;
    const hy = cy + Math.sin(head) * R * 0.85;
    const tx = -Math.sin(head) * e.dir;
    const ty = Math.cos(head);
    const k = this.tick(e, dt, e.big ? 70 : 35);
    const rp = ramp(e.c);
    for (let i = 0; i < k; i++) {
      const v = rnd(40, 90);
      this.spawn('spark', hx, hy, tx * v + rnd(-15, 15), ty * v + rnd(-15, 15), rnd(0.15, 0.3), i % 2 ? '#ffffff' : rp[1], { g: 60, drag: 3, s: 2, add: true });
      if (!e.big) continue;
      if (e.el === 'fire') {
        this.flame(hx + rnd(-2, 2), hy + rnd(-2, 2), tx * 30, ty * 30 - 10, flameRamp(e.c, 'fire'), 3, 0.35);
        if (Math.random() < 0.5) this.ember(hx, hy, pick(EP.fire.spark));
      } else if (e.el === 'water' || e.el === 'ice') {
        this.drop(hx, hy, tx * rnd(40, 80), ty * 50 - 30, pick(EP.water.drop), e.y);
        if (e.el === 'ice' && Math.random() < 0.4) this.star(hx, hy, '#e1f5fe', 3, 0.35);
      } else if (e.el === 'wind') {
        if (Math.random() < 0.35) this.leaf(hx, hy, tx * 70, ty * 40 - 20);
        this.wline(hx, hy + rnd(-4, 4), tx * 120, rnd(4, 9), '#f1f8e9', 0.22);
      }
    }
  }

  u_proj(e, dt) {
    const f = Math.min(1, e.t / e.life);
    const x = e.x0 + (e.x1 - e.x0) * f;
    const y = e.y0 + (e.y1 - e.y0) * f;
    if (!e.done && e.t < e.life) {
      const big = e.big || e.boom;
      if (e.p === 'fire') {
        const k = this.tick(e, dt, big ? 110 : 70);
        const rp = flameRamp(e.c, e.el);
        for (let i = 0; i < k; i++) this.flame(x + rnd(-2, 2), y + rnd(-2, 2), -e.ux * 30 + rnd(-10, 10), -e.uy * 30 - 10, rp, big ? 4 : 3, 0.35);
        if (Math.random() < dt * 14) this.smoke(x, y, pick(EP.fire.smoke), 1, 4, 0.6, 0.45);
        if (Math.random() < dt * 20) this.ember(x, y, rp[2]);
      } else if (e.p === 'water') {
        const k = this.tick(e, dt, 50);
        for (let i = 0; i < k; i++) this.drop(x, y, -e.ux * 30 + rnd(-15, 15), -e.uy * 30 - rnd(10, 40), pick(EP.water.drop));
        if (Math.random() < dt * 10) this.spawn('bubble', x, y, rnd(-8, 8), -rnd(10, 25), 0.6, '#e1f5fe', { s: 1 });
      } else if (e.p === 'ice') {
        const k = this.tick(e, dt, 45);
        for (let i = 0; i < k; i++) {
          if (i % 2) this.star(x - e.ux * 4 + rnd(-3, 3), y - e.uy * 4 + rnd(-3, 3), '#e1f5fe', 2, 0.35);
          else this.spawn('px', x - e.ux * 3, y + rnd(-2, 2), -e.ux * 20, rnd(-8, 8), 0.4, pick(EP.ice.spark), { add: true });
        }
      } else if (e.p === 'wind') {
        const k = this.tick(e, dt, 40);
        for (let i = 0; i < k; i++) this.wline(x - e.ux * 4, y + rnd(-5, 5), e.ux * 40, rnd(4, 10), i % 2 ? '#ffffff' : e.c, 0.25);
        if (Math.random() < dt * 6) this.leaf(x, y, -e.ux * 30, rnd(-20, 10));
      } else if (e.el !== 'neutral') {
        const k = this.tick(e, dt, 30);
        for (let i = 0; i < k; i++) {
          if (e.el === 'fire') this.ember(x - e.ux * 3, y - e.uy * 3, pick(EP.fire.spark), 20);
          else if (e.el === 'water' || e.el === 'ice') this.drop(x, y, -e.ux * 20, -20, pick(EP.water.drop));
          else this.spawn('px', x, y, -e.ux * 20, rnd(-6, 6), 0.35, pick(EP.wind.spark), { add: true });
        }
      }
    }
    if (e.t >= e.life && !e.done) {
      e.done = true;
      this.impact(e);
    }
  }

  impact(e) {
    const { x1: x, y1: y, el, c } = e;
    const sp = EP[el].spark;
    const n = e.boom ? 20 : e.p === 'arrow' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = rnd(30, e.boom ? 110 : 70);
      this.spawn('spark', x, y, Math.cos(a) * v - e.ux * 20, Math.sin(a) * v - 20, rnd(0.18, 0.35), i % 2 ? '#ffffff' : pick(sp), { g: 140, drag: 2.5, s: 2, add: true });
    }
    this.spawn('glow', x, y, 0, 0, 0.14, glowCol(c, el), { s: e.boom ? 14 : 6, s1: e.boom ? 22 : 9, a: 0.9, add: true });
    this.star(x, y, '#ffffff', e.boom ? 7 : 4, 0.16);
    if (el === 'water') for (let i = 0; i < 7; i++) this.drop(x, y, rnd(-50, 50), -rnd(30, 90), pick(EP.water.drop));
    else if (el === 'ice') {
      for (let i = 0; i < 6; i++) this.spawn('shard', x, y, rnd(-60, 60), -rnd(20, 70), rnd(0.3, 0.5), pick(EP.ice.spark), { g: 200 });
      this.spawn('ring', x, y, 0, 0, 0.3, '#b3e5fc', { s: 3, s1: 14, ry: 0.5, add: true });
    } else if (el === 'wind') {
      for (let i = 0; i < 4; i++) this.wline(x + rnd(-6, 6), y + rnd(-6, 6), rnd(-60, 60), rnd(5, 10), '#ffffff', 0.25);
      if (e.p === 'wind') for (let i = 0; i < 2; i++) this.leaf(x, y, rnd(-50, 50), -rnd(20, 60));
    } else if (el === 'fire' && e.p !== 'shuriken') {
      const rp = flameRamp(c, el);
      for (let i = 0; i < 5; i++) this.flame(x + rnd(-3, 3), y + rnd(-3, 3), rnd(-30, 30), -rnd(10, 40), rp, 3, 0.4);
    }
    if (e.boom) this.explode(x, y, 26, c, el === 'neutral' ? 'fire' : el, false);
  }

  explode(x, y, r, c, el, big) {
    this.add({ k: 'boom', x, y, r, c, el, life: big ? 0.6 : 0.45 });
    this.spawn('glow', x, y, 0, 0, 0.2, '#ffffff', { s: r * 0.4, s1: r * 0.6, a: 0.6, add: true });
    if (el === 'water' || el === 'ice') {
      for (let i = 0; i < (big ? 36 : 16); i++) this.drop(x + rnd(-6, 6), y, rnd(-70, 70), -rnd(60, 170), pick(el === 'ice' ? EP.ice.drop : EP.water.drop), y + 10);
      for (let i = 0; i < (big ? 10 : 4); i++) this.spawn('bubble', x + rnd(-r, r) * 0.5, y - rnd(0, 20), rnd(-10, 10), -rnd(15, 35), rnd(0.6, 1), '#e1f5fe', { s: Math.random() < 0.5 ? 1 : 2 });
      return;
    }
    const rp = flameRamp(c, 'fire');
    for (let i = 0; i < (big ? 30 : 14); i++) {
      const a = Math.random() * TAU;
      const v = rnd(20, big ? 110 : 70);
      this.flame(x + Math.cos(a) * 3, y + Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 30, rp, big ? 5 : 4, 0.5);
    }
    for (let i = 0; i < (big ? 20 : 8); i++) this.ember(x + rnd(-8, 8), y - rnd(0, 8), pick(EP.fire.spark), big ? 110 : 70);
    for (let i = 0; i < (big ? 10 : 4); i++) this.smoke(x + rnd(-r, r) * 0.4, y - rnd(0, 14), pick(EP.fire.smoke), 3, big ? 9 : 6, big ? 1.2 : 0.9, 0.6);
  }

  u_burst(e, dt) {
    const f = e.t / e.life;
    const R = e.r;
    const rx = R * (0.25 + 0.75 * easeOut3(clamp01(f / 0.7)));
    const ry = rx * 0.36;
    if (f > 0.85) return;
    const rate = (e.big ? 150 : 90) * (0.4 + R / 140);
    const k = this.tick(e, dt, rate);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = e.x + Math.cos(a) * rx;
      const py = e.y + Math.sin(a) * ry;
      if (e.el === 'fire') {
        this.flame(px, py - 2, Math.cos(a) * 15, -rnd(30, 60), flameRamp(e.c, 'fire'), e.big ? 4 : 3, 0.5);
        if (i % 3 === 0) this.ember(px, py - 4, pick(EP.fire.spark), 70);
        if (f > 0.4 && i % 5 === 0) this.smoke(px, py - 6, pick(EP.fire.smoke), 2, 6, 0.8, 0.4);
      } else if (e.el === 'water') {
        this.drop(px, py - 4, Math.cos(a) * rnd(20, 60), -rnd(60, 140), pick(EP.water.drop), py + 2);
        if (i % 4 === 0) this.spawn('bubble', px, py - rnd(0, 20), rnd(-8, 8), -rnd(15, 35), rnd(0.5, 0.9), '#e1f5fe', { s: Math.random() < 0.6 ? 1 : 2 });
      } else if (e.el === 'ice') {
        if (i % 2) this.star(px, py - rnd(0, 18), pick(['#ffffff', '#e1f5fe']), 3, 0.45, -10);
        else this.spawn('px', px, py - rnd(0, 10), rnd(-10, 10), -rnd(10, 30), rnd(0.5, 0.9), '#ffffff', { add: true });
      } else if (e.el === 'wind') {
        const tx = -Math.sin(a);
        if (i % 3 === 0) this.leaf(px, py - rnd(2, 16), tx * rnd(60, 120) + Math.cos(a) * 30, -rnd(20, 60));
        else this.wline(px, py - rnd(2, 20), tx * rnd(80, 140), rnd(5, 12), i % 2 ? '#ffffff' : e.c, 0.25);
      } else {
        this.spawn('spark', px, py - 4, Math.cos(a) * 40, -rnd(20, 60), 0.3, i % 2 ? '#ffffff' : e.c, { g: 100, s: 2, add: true });
      }
    }
    if (e.el === 'ice' && f > 0.72 && !e.shattered) {
      e.shattered = true;
      for (const s of e.spikes) {
        const px = e.x + Math.cos(s.a) * R * s.d;
        const py = e.y + Math.sin(s.a) * R * s.d * 0.36;
        for (let i = 0; i < 3; i++) this.spawn('shard', px, py - rnd(2, s.h), rnd(-50, 50), -rnd(30, 90), rnd(0.35, 0.6), pick(EP.ice.spark), { g: 260, floor: py });
      }
    }
  }

  u_wave(e, dt) {
    const f = e.t / e.life;
    if (f > 0.8) return;
    const u = f / 0.8;
    const hx = e.x + e.dir * e.range * u;
    const hy = e.y - 12;
    const k = this.tick(e, dt, e.p === 'arrow' ? 60 : 80);
    for (let i = 0; i < k; i++) {
      if (e.p === 'arrow') {
        this.spawn('px', hx - e.dir * rnd(4, 20), hy + rnd(-3, 3), -e.dir * rnd(5, 20), rnd(-10, 10), rnd(0.25, 0.5), i % 2 ? '#ffffff' : e.c, { add: true });
      } else if (e.el === 'fire') {
        this.flame(hx - e.dir * 4, hy + rnd(-12, 12), -e.dir * 40, -rnd(5, 25), flameRamp(e.c, 'fire'), 3, 0.35);
        if (i % 3 === 0) this.ember(hx, hy + rnd(-12, 12), pick(EP.fire.spark));
      } else if (e.el === 'water' || e.el === 'ice') {
        this.drop(hx - e.dir * 3, hy + rnd(-12, 12), -e.dir * rnd(20, 60), -rnd(20, 60), pick(EP.water.drop), e.y);
      } else if (e.el === 'wind') {
        this.wline(hx - e.dir * 6, hy + rnd(-12, 12), e.dir * 60, rnd(6, 14), '#ffffff', 0.25);
        if (i % 4 === 0) this.leaf(hx, hy + rnd(-10, 10), -e.dir * 40, -rnd(10, 40));
      } else {
        this.spawn('spark', hx, hy + rnd(-10, 10), -e.dir * 50, rnd(-20, 20), 0.3, '#ffffff', { s: 2, drag: 3, add: true });
      }
    }
    if (e.p === 'arrow' && Math.abs(hx - e.x) - e.lastRing > 30) {
      e.lastRing += 30;
      this.spawn('vring', hx - e.dir * 4, hy, 0, 0, 0.35, e.c, { s: 5, s1: 13, add: true });
    }
    if (e.p !== 'arrow' && Math.random() < dt * 30) this.smoke(hx, e.y - 1, pick(['#d7ccc8', '#bcaaa4']), 1, 4, 0.5, 0.45);
  }

  u_mark() {}

  u_meteor(e, dt) {
    const fall = clamp01(e.t / e.hit);
    const big = e.big;
    if (e.t < e.hit) {
      const ff = Math.pow(fall, 1.35);
      const x = e.x - 70 + 70 * ff;
      const y = e.y - 165 + 155 * ff;
      const k = this.tick(e, dt, big ? 180 : 130);
      if (e.el === 'water' || e.el === 'ice') {
        for (let i = 0; i < k; i++) {
          if (i % 2) this.drop(x + rnd(-4, 4), y + rnd(-4, 4), rnd(-30, 30) - 20, -rnd(20, 60), pick(EP.water.drop));
          else this.spawn('px', x + rnd(-5, 5), y + rnd(-5, 5), rnd(-10, 10), rnd(-20, 0), rnd(0.25, 0.5), pick(['#ffffff', '#b3e5fc', e.c]), { add: true, s: 2, s1: 1 });
        }
        if (Math.random() < dt * 25) this.spawn('bubble', x, y, rnd(-15, 15), rnd(-15, 15), 0.6, '#e1f5fe', { s: 2 });
      } else {
        const rp = flameRamp(e.c, 'fire');
        for (let i = 0; i < k; i++) this.flame(x + rnd(-4, 4), y + rnd(-4, 4), rnd(-25, 15) - 25, -rnd(30, 70), rp, big ? 5 : 4, 0.45);
        if (Math.random() < dt * 45) this.smoke(x - 4, y - 6, pick(EP.fire.smoke), 3, 8, 1, 0.55);
        if (Math.random() < dt * 40) this.ember(x, y, pick(EP.fire.spark), 30);
      }
    } else if (!e.done) {
      e.done = true;
      const r = e.r;
      this.spawn('glow', e.x, e.y - 14, 0, 0, 0.22, '#ffffff', { s: 16, s1: 30, a: 0.7, add: true });
      this.spawn('ring', e.x, e.y, 0, 0, 0.5, '#ffffff', { s: 8, s1: r, ry: 0.36, add: true, w: 3 });
      this.spawn('ring', e.x, e.y, 0, 0, 0.7, glowCol(e.c, e.el), { s: 4, s1: r * 0.8, ry: 0.36, add: true, w: 2 });
      this.burst(e.x, e.y, r, e.c, true);
      this.explode(e.x, e.y - 6, 30, e.c, e.el === 'fire' ? 'fire' : 'water', true);
      if (e.el === 'fire') {
        for (let i = 0; i < (big ? 18 : 12); i++) {
          this.spawn('debris', e.x + rnd(-8, 8), e.y - rnd(2, 10), rnd(-90, 90), -rnd(60, 170), rnd(0.7, 1.1), pick(['#4e342e', '#6d4c41', '#3e2723']), { g: 380, floor: e.y + rnd(-4, 6), s: Math.random() < 0.5 ? 2 : 1 });
        }
      }
    }
  }

  u_whirl(e, dt) {
    const f = e.t / e.life;
    if (f > 0.85) return;
    const k = this.tick(e, dt, e.big ? 70 : 45);
    const W = Math.min(e.big ? 36 : 26, e.r * 0.34);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      if (i % 3 === 0) {
        const sm = this.smoke(e.x + Math.cos(a) * 6, e.y - 1, pick(['#d7ccc8', '#c5e1a5', '#bcaaa4']), 2, 6, 0.6, 0.5);
        if (sm) sm.vx = Math.cos(a) * 50;
      } else if (i % 3 === 1) {
        const h = rnd(4, e.big ? 60 : 42);
        const rr = 4 + (h / 60) * W;
        this.wline(e.x + Math.cos(a) * rr, e.y - h, (Math.sin(a) > 0 ? 1 : -1) * rnd(60, 120), rnd(4, 10), Math.random() < 0.5 ? '#ffffff' : e.c, 0.2);
      } else if (Math.random() < 0.5) this.leaf(e.x + rnd(-W, W), e.y - rnd(10, 50), rnd(-100, 100), -rnd(20, 70));
    }
  }

  u_aura(e, dt) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    if (f > 0.8) return;
    const k = this.tick(e, dt, 45);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = o.x + Math.cos(a) * rnd(5, 11);
      const py = o.y - rnd(0, 6);
      if (e.el === 'fire') {
        this.flame(px, py, rnd(-5, 5), -rnd(30, 55), flameRamp(e.c, 'fire'), 3, 0.6);
        if (i % 2) this.ember(px, py - rnd(0, 20), pick(EP.fire.spark), 50);
      } else if (e.el === 'water') {
        this.spawn('bubble', px, py - rnd(0, 16), rnd(-5, 5), -rnd(20, 40), rnd(0.6, 0.9), '#e1f5fe', { s: Math.random() < 0.6 ? 1 : 2 });
      } else if (e.el === 'ice') {
        this.star(px, py - rnd(0, 26), pick(['#ffffff', '#b3e5fc']), 3, 0.5, -20);
      } else if (e.el === 'wind') {
        if (i % 2) this.leaf(px, py - rnd(0, 20), Math.cos(a) * 30, -rnd(30, 60));
        else this.spawn('px', px, py, 0, -rnd(40, 70), rnd(0.4, 0.7), pick(['#ffffff', e.c, '#ccff90']), { add: true });
      } else {
        if (i % 2) this.smoke(px, py - rnd(0, 18), pick(['#cfd8dc', '#b0bec5', '#eceff1']), 2, 6, 0.7, 0.5);
        else this.star(px, py - rnd(0, 26), '#ffffff', 3, 0.45, -15);
      }
      if (i % 4 === 0) this.spawn('px', o.x + rnd(-12, 12), o.y - rnd(0, 30), 0, -rnd(25, 50), rnd(0.4, 0.7), '#ffffff', { add: true });
    }
  }

  u_heal(e, dt) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    if (f > 0.72) return;
    const k = this.tick(e, dt, 26);
    for (let i = 0; i < k; i++) {
      this.spawn('plus', o.x + rnd(-13, 13), o.y - rnd(0, 26), rnd(-4, 4), -rnd(18, 30), rnd(0.6, 0.85), e.c, { big: Math.random() < 0.4 });
      if (i % 2) this.star(o.x + rnd(-14, 14), o.y - rnd(2, 30), pick(['#ffffff', shade(e.c, 0.5)]), 3, 0.45, -12);
      if (e.el === 'wind' && Math.random() < 0.3) this.leaf(o.x + rnd(-10, 10), o.y - rnd(0, 10), rnd(-20, 20), -rnd(30, 50), pick(['#a5d6a7', '#c5e1a5', '#81c784']));
    }
  }

  u_dash(e, dt) {
    const f = e.t / e.life;
    if (f > 0.5) return;
    const k = this.tick(e, dt, 60);
    for (let i = 0; i < k; i++) {
      const x = e.x0 + (e.x1 - e.x0) * Math.random();
      if (e.el === 'wind' && i % 2) this.leaf(x, e.y - rnd(4, 24), e.dir * rnd(40, 100), -rnd(10, 40));
      else this.spawn('spark', x, e.y - rnd(4, 24), e.dir * rnd(60, 120), rnd(-20, 20), 0.25, i % 2 ? '#ffffff' : e.c, { s: 3, drag: 3, add: true });
    }
  }

  u_level(e, dt) {
    const o = e.get();
    if (!o) return;
    if (!e.burst) {
      e.burst = true;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const st = this.star(o.x, o.y - 14, i % 2 ? '#fff59d' : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos(a) * 70;
          st.vy = Math.sin(a) * 50 - 20;
          st.drag = 2.5;
        }
      }
    }
    if (e.t > e.life * 0.75) return;
    const k = this.tick(e, dt, 60);
    for (let i = 0; i < k; i++) {
      if (i % 2) this.spawn('ember', o.x + rnd(-14, 14), o.y - rnd(0, 6), rnd(-6, 6), -rnd(50, 110), rnd(0.6, 1.1), pick(['#fff59d', '#ffd54f', '#ffffff']), { add: true, drag: 0.6 });
      else this.star(o.x + rnd(-18, 18), o.y - rnd(0, 50), pick(['#fff59d', '#ffffff', '#ffe082']), rnd(2, 4) | 0, 0.5, -20);
    }
  }

  // ================= VẼ (canvas phân giải thấp) =================
  draw(ctx, camX, camY) {
    this.cw = ctx.canvas.width;
    this.ch = ctx.canvas.height;
    ctx.save();
    for (const e of this.list) {
      if (e.delay > 0) continue;
      const fn = this[`d_${e.k}`];
      if (fn) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        fn.call(this, ctx, e, camX, camY);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.drawParts(ctx, camX, camY, false);
    ctx.globalCompositeOperation = 'lighter';
    this.drawParts(ctx, camX, camY, true);
    ctx.restore();
  }

  drawParts(ctx, camX, camY, add) {
    const W = this.cw + 20;
    const H = this.ch + 20;
    for (const p of this.parts) {
      if ((p.k === 'glow' || p.k === 'ring' || p.k === 'vring') !== add) continue;
      const x = R0(p.x - camX);
      const y = R0(p.y - camY);
      if (x < -60 || y < -60 || x > W + 40 || y > H + 40) continue;
      const f = p.t / p.life;
      const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
      switch (p.k) {
        case 'px': {
          const s = Math.max(1, R0(p.s + (p.s1 - p.s) * f));
          ctx.globalAlpha = p.a * fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
          break;
        }
        case 'spark': {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const ux = p.vx / sp;
          const uy = p.vy / sp;
          const len = Math.max(1, R0(p.s * Math.min(1, sp / 60)));
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          for (let j = 1; j <= len; j++) ctx.fillRect(R0(p.x - ux * j - camX), R0(p.y - uy * j - camY), 1, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'flame': {
          const rp = p.c;
          const idx = Math.min(rp.length - 1, 1 + Math.floor(f * (rp.length - 1.5)));
          const s = Math.max(1, R0(p.s * (1 - f * 0.75)));
          ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
          ctx.fillStyle = rp[idx];
          ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
          break;
        }
        case 'ember': {
          ctx.globalAlpha = (Math.sin(p.t * 34 + p.ph) > -0.4 ? 1 : 0.35) * fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'smoke': {
          const r = Math.max(1, R0(p.s + (p.s1 - p.s) * easeOut(f)));
          ctx.globalAlpha = p.a * (1 - f) * (f < 0.1 ? f / 0.1 : 1);
          ctx.drawImage(dotSprite(p.c, r), x - r, y - r);
          break;
        }
        case 'drop': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, 1, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'bubble': {
          const r = p.s;
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = p.c;
          const bx = x + R0(Math.sin(p.t * 9 + p.ph) * 1.5);
          if (r <= 1) {
            ctx.fillRect(bx - 1, y, 1, 1);
            ctx.fillRect(bx + 1, y, 1, 1);
            ctx.fillRect(bx, y - 1, 1, 1);
            ctx.fillRect(bx, y + 1, 1, 1);
          } else {
            ctx.fillRect(bx - 1, y - 2, 3, 1);
            ctx.fillRect(bx - 1, y + 2, 3, 1);
            ctx.fillRect(bx - 2, y - 1, 1, 3);
            ctx.fillRect(bx + 2, y - 1, 1, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bx - 1, y - 1, 1, 1);
          }
          break;
        }
        case 'leaf': {
          const sh = LEAF_SHAPES[Math.floor(p.t * 12 + p.ph * 3) & 3];
          ctx.globalAlpha = fade;
          const dark = shade(p.c, -0.35);
          for (const [dx, dy, k] of sh) {
            ctx.fillStyle = k === 1 ? p.c : k === 2 ? dark : shade(p.c, 0.3);
            ctx.fillRect(x + dx - 1, y + dy, 1, 1);
          }
          break;
        }
        case 'wline': {
          const len = Math.max(1, R0(p.s * (1 - f * 0.5)));
          const d = p.vx >= 0 ? 1 : -1;
          ctx.globalAlpha = 0.85 * (1 - f);
          ctx.fillStyle = p.c;
          ctx.fillRect(d > 0 ? x - len : x, y, len, 1);
          ctx.globalAlpha = 1 - f;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(d > 0 ? x - 1 : x, y, 2, 1);
          break;
        }
        case 'shard': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          if (Math.floor(p.t * 16 + p.ph) & 1) ctx.fillRect(x - 1, y, 3, 1);
          else ctx.fillRect(x, y - 1, 1, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'star': {
          const tw = Math.sin(f * Math.PI);
          const L = Math.max(0, R0(p.s * tw));
          ctx.globalAlpha = Math.min(1, tw * 1.4);
          ctx.fillStyle = p.c;
          if (L > 0) {
            ctx.fillRect(x - L, y, L * 2 + 1, 1);
            ctx.fillRect(x, y - L, 1, L * 2 + 1);
          }
          if (L > 2) {
            ctx.fillRect(x - 1, y - 1, 3, 3);
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'plus': {
          const cv = plusSprite(p.c, p.big);
          ctx.globalAlpha = fade;
          ctx.drawImage(cv, x - (cv.width >> 1), y - (cv.height >> 1));
          break;
        }
        case 'debris': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, p.s, p.s);
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'glow': {
          const r = p.s + (p.s1 - p.s) * f;
          drawGlow(ctx, x, y, p.c, r, p.a * (1 - f));
          break;
        }
        case 'ring': {
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          ctx.globalAlpha = (1 - f) * (p.a || 1);
          ctx.fillStyle = p.c;
          const w = p.w || 2;
          ringPx(ctx, x, y, r, r * (p.ry || 0.4), w, w > 2 ? 2 : 1);
          break;
        }
        case 'vring': {
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          ctx.globalAlpha = 1 - f;
          ctx.fillStyle = p.c;
          ringPx(ctx, x, y, r * 0.32, r, 1, 1);
          break;
        }
        default:
      }
    }
    ctx.globalAlpha = 1;
  }

  d_slash(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const S = slashFrames(e.c, e.big);
    const fr = S.frames[Math.min(S.frames.length - 1, Math.floor(f * S.frames.length))];
    const cx = R0(e.x + e.dir * 3 - camX);
    const cy = R0(e.y - 13 - camY);
    const blit = (ox, oy) => {
      if (e.dir > 0) ctx.drawImage(fr, cx - S.cx + ox, cy - S.cy + oy);
      else {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(fr, -S.cx + ox, -S.cy + oy);
        ctx.restore();
      }
    };
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, cx + e.dir * S.R * 0.5, cy - 2, glowCol(e.c, e.el), S.R * 0.95, (e.big ? 0.42 : 0.24) * (1 - f), 1.15, 0.8);
    ctx.globalAlpha = (e.big ? 0.4 : 0.22) * (1 - f);
    blit(-1, 0);
    blit(1, 0);
    blit(0, -1);
    blit(0, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = f > 0.75 ? (1 - f) / 0.25 : 1;
    blit(0, 0);
  }

  d_proj(ctx, e, camX, camY) {
    if (e.done) return;
    const f = Math.min(1, e.t / e.life);
    const wx = e.x0 + (e.x1 - e.x0) * f;
    const wy = e.y0 + (e.y1 - e.y0) * f;
    const x = R0(wx - camX);
    const y = R0(wy - camY);
    const { ux, uy } = e;
    const dist = Math.hypot(e.x1 - e.x0, e.y1 - e.y0) * f;
    const big = e.big || e.boom;
    const gc = glowCol(e.c, e.el);
    switch (e.p) {
      case 'arrow': {
        const L = big ? 14 : 11;
        const tl = Math.min(dist, big ? 34 : 24);
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < tl; j += 1) {
          ctx.globalAlpha = 0.75 * (1 - j / tl);
          ctx.fillStyle = j < tl * 0.35 ? '#ffffff' : gc;
          ctx.fillRect(R0(x - ux * (L + j)), R0(y - uy * (L + j)), 1, big && j < tl * 0.6 ? 2 : 1);
        }
        drawGlow(ctx, x, y, gc, big ? 7 : 4, 0.6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const nx = -uy;
        const ny = ux;
        ctx.fillStyle = '#5d4037';
        for (let j = 2; j < L; j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = '#d7ccc8';
        for (let j = 3; j < L - 2; j += 2) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = e.el === 'neutral' ? '#b0bec5' : e.c;
        ctx.fillRect(R0(x - ux), R0(y - uy), 1, 1);
        ctx.fillRect(R0(x - ux * 2 + nx), R0(y - uy * 2 + ny), 1, 1);
        ctx.fillRect(R0(x - ux * 2 - nx), R0(y - uy * 2 - ny), 1, 1);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(R0(x - ux * 3 + nx * 1.5), R0(y - uy * 3 + ny * 1.5), 1, 1);
        ctx.fillRect(R0(x - ux * 3 - nx * 1.5), R0(y - uy * 3 - ny * 1.5), 1, 1);
        ctx.fillStyle = e.el === 'neutral' ? '#ffffff' : shade(e.c, 0.4);
        for (let j = L - 3; j < L; j++) {
          ctx.fillRect(R0(x - ux * (j + 1) + nx), R0(y - uy * (j + 1) + ny), 1, 1);
          ctx.fillRect(R0(x - ux * (j + 1) - nx), R0(y - uy * (j + 1) - ny), 1, 1);
        }
        break;
      }
      case 'kunai': {
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 6; j < 18; j++) {
          ctx.globalAlpha = 0.5 * (1 - (j - 6) / 12);
          ctx.fillStyle = gc;
          ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const nx = -uy;
        const ny = ux;
        ctx.fillStyle = '#eceff1';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#b0bec5';
        for (let j = 1; j < 4; j++) {
          ctx.fillRect(R0(x - ux * j + nx * 0.6), R0(y - uy * j + ny * 0.6), 1, 1);
          ctx.fillRect(R0(x - ux * j - nx * 0.6), R0(y - uy * j - ny * 0.6), 1, 1);
        }
        ctx.fillStyle = '#5d4037';
        for (let j = 4; j < 7; j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = e.c;
        ctx.fillRect(R0(x - ux * 7), R0(y - uy * 7), 1, 1);
        break;
      }
      case 'shuriken': {
        const R = big ? 5 : 4;
        const fr = shurikenFrames(e.el === 'neutral' ? '#cfd8dc' : e.c, R);
        const k = Math.floor(e.t * 48) & 7;
        const cv = fr[k];
        const h = cv.width >> 1;
        if (e.el !== 'neutral') {
          ctx.globalCompositeOperation = 'lighter';
          drawGlow(ctx, x, y, gc, R + 4, 0.55);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 0.22;
        ctx.drawImage(fr[(k + 6) & 7], R0(x - ux * 9) - h, R0(y - uy * 9) - h);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(fr[(k + 7) & 7], R0(x - ux * 4.5) - h, R0(y - uy * 4.5) - h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = e.el === 'neutral' ? '#ffffff' : gc;
        for (let j = 4; j < Math.min(dist, 16); j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(cv, x - h, y - h);
        break;
      }
      case 'wind': {
        const ai = ((R0((Math.atan2(uy, ux) / TAU) * 16) % 16) + 16) % 16;
        const B = bladeSprite(e.c, big ? 8 : 6, big ? 4 : 3, ai, 1.15);
        const h = B.S >> 1;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, gc, big ? 9 : 7, 0.45);
        ctx.globalAlpha = 0.35;
        ctx.drawImage(B.cv, R0(x - ux * 6) - h, R0(y - uy * 6) - h);
        ctx.globalAlpha = 0.18;
        ctx.drawImage(B.cv, R0(x - ux * 12) - h, R0(y - uy * 12) - h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(B.cv, x - h, y - h);
        break;
      }
      case 'ice': {
        const ai = ((R0((Math.atan2(uy, ux) / TAU) * 16) % 16) + 16) % 16;
        const I = iceSprite(big ? 13 : 10, ai);
        const h = I.S >> 1;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, '#80d8ff', 8, 0.55);
        for (let j = 4; j < Math.min(dist, 22); j++) {
          ctx.globalAlpha = 0.6 * (1 - j / 22);
          ctx.fillStyle = j < 10 ? '#ffffff' : '#81d4fa';
          ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(I.cv, x - h, y - h);
        break;
      }
      case 'water': {
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, '#40c4ff', big ? 9 : 7, 0.6);
        ctx.globalCompositeOperation = 'source-over';
        for (let j = 4; j >= 1; j--) {
          const r = Math.max(1, 3 - j * 0.6) | 0;
          ctx.globalAlpha = 0.7 - j * 0.12;
          ctx.drawImage(dotSprite(j > 2 ? '#29b6f6' : '#81d4fa', r), R0(x - ux * j * 3) - r, R0(y - uy * j * 3) - r);
        }
        ctx.globalAlpha = 1;
        const r = big ? 3 : 2;
        ctx.drawImage(dotSprite('#0288d1', r + 1), x - r - 1, y - r - 1);
        ctx.drawImage(dotSprite('#4fc3f7', r), x - r, y - r);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        break;
      }
      default: {
        // cầu lửa (đạn quái dùng màu riêng)
        const rp = flameRamp(e.c, e.el);
        const r = big ? 3 : 2;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, gc, big ? 11 : 7, 0.7);
        for (let j = 5; j >= 1; j--) {
          const rr = Math.max(1, r + 1 - j * 0.6) | 0;
          ctx.globalAlpha = 0.85 - j * 0.12;
          ctx.drawImage(dotSprite(rp[Math.min(5, 1 + (j >> 1) + 1)], rr), R0(x - ux * j * 2.6) - rr, R0(y - uy * j * 2.6 + Math.sin(e.t * 40 + j) * 0.8) - rr);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(dotSprite(rp[3], r + 1), x - r - 1, y - r - 1);
        ctx.drawImage(dotSprite(rp[1], r), x - r, y - r);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  d_boom(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const r = e.r * easeOut3(f);
    const water = e.el === 'water' || e.el === 'ice';
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, water ? '#40c4ff' : '#ff8a3c', e.r * (1 - f * 0.4), 0.5 * (1 - f));
    if (f < 0.35) drawGlow(ctx, x, y, '#ffffff', e.r * 0.35, 0.6 * (1 - f / 0.35));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = water ? '#0277bd' : '#bf360c';
    ringPx(ctx, x, y + 1, r + 1, r * 0.8 + 1, 2, 1);
    ctx.fillStyle = water ? '#e1f5fe' : '#ffe082';
    ringPx(ctx, x, y, r, r * 0.8, 2, 1);
    if (!water && f < 0.45) {
      const k = 1 - f / 0.45;
      const rr = Math.max(1, R0(e.r * 0.42 * k));
      ctx.globalAlpha = 1;
      ctx.drawImage(dotSprite('#e64a19', rr + 2), x - rr - 2, y - rr - 2);
      ctx.drawImage(dotSprite('#ffa726', rr + 1), x - rr - 1, y - rr - 1);
      ctx.drawImage(dotSprite('#ffe082', rr), x - rr, y - rr);
      if (rr > 3) ctx.drawImage(dotSprite('#fffde7', rr - 3), x - rr + 2, y - rr + 2);
    }
  }

  d_burst(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const R = e.r;
    const rx = R * (0.25 + 0.75 * easeOut3(clamp01(f / 0.7)));
    const ry = rx * 0.36;
    const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
    const rp = ramp(e.c);
    const gc = glowCol(e.c, e.el);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 1, gc, rx * 1.05, 0.3 * fade, 0.38);
    if (f < 0.25) drawGlow(ctx, x, y - 12, '#ffffff', 14 * (1 - f / 0.25) + 4, 0.5 * (1 - f / 0.25));
    if (e.el === 'water') this.waterWall(ctx, e, x, y, rx, ry, f, fade, true);
    else if (e.el === 'fire') this.fireWall(ctx, e, x, y, rx, ry, f, fade, true);
    this.shockRing(ctx, x, y, rx, ry, rp, fade, e.big);
    const r2 = R * 0.7 * easeOut(clamp01((f - 0.1) / 0.6));
    if (r2 > 4) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = rp[2];
      ringPx(ctx, x, y, r2, r2 * 0.36, 2, 1);
    }
    if (e.el === 'water') {
      this.waterWall(ctx, e, x, y, rx, ry, f, fade, false);
      if (!e.big) this.spinArcs(ctx, e, x, y - 7, rx * 0.62, fade, ['#ffffff', '#b3e5fc', '#29b6f6', '#01579b']);
    } else if (e.el === 'fire') this.fireWall(ctx, e, x, y, rx, ry, f, fade, false);
    else if (e.el === 'ice') this.iceSpikes(ctx, e, x, y, rx, f, fade);
    else if (e.el === 'wind') this.spinArcs(ctx, e, x, y - 8, rx * 0.8, fade, ['#ffffff', rp[1], rp[3], rp[5]]);
  }

  shockRing(ctx, x, y, rx, ry, rp, fade, big) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = rp[4];
    ringPx(ctx, x, y + 1, rx + 1, ry + 0.5, 2, 1);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, big ? 2 : 1);
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y - 1, rx - 1, ry - 0.5, 1, 1, 0.2, Math.PI - 0.2);
  }

  fireWall(ctx, e, x, y, rx, ry, f, fade, back) {
    const n = Math.max(14, Math.min(56, R0(rx * 0.5)));
    const rp = flameRamp(e.c, 'fire');
    const hmax = (e.big ? 28 : 21) * Math.sin(Math.PI * clamp01(f / 0.85));
    if (hmax < 1) return;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + i * 0.21;
      const s = Math.sin(a);
      if (back ? s >= 0 : s < 0) continue;
      const px = R0(x + Math.cos(a) * rx);
      const py = R0(y + s * ry);
      const fl = 0.6 + 0.4 * Math.sin(this.time * 21 + i * 2.7);
      const h = Math.max(3, R0(hmax * fl * (0.75 + 0.25 * Math.sin(i * 1.7))));
      ctx.globalAlpha = (back ? 0.65 : 0.95) * fade;
      for (let j = 0; j < h; j++) {
        const u = j / h;
        const wo = R0(6 * Math.pow(1 - u, 0.8)) + 1;
        const sw = R0(Math.sin(this.time * 15 + i + j * 0.35) * u * 1.6);
        ctx.fillStyle = u > 0.7 ? rp[4] : rp[3];
        ctx.fillRect(px - (wo >> 1) + sw, py - j, wo, 1);
        const wi = wo - 2;
        if (wi > 0) {
          ctx.fillStyle = u < 0.3 ? rp[1] : rp[2];
          ctx.fillRect(px - (wi >> 1) + sw, py - j, wi, 1);
          if (u < 0.25 && wi > 1) {
            ctx.fillStyle = rp[0];
            ctx.fillRect(px + sw, py - j, 1, 1);
          }
        }
      }
    }
  }

  waterWall(ctx, e, x, y, rx, ry, f, fade, back) {
    const hmax = (e.big ? 24 : 12) * Math.sin(Math.PI * clamp01(f / 0.8));
    if (hmax < 1) return;
    ctx.globalCompositeOperation = 'source-over';
    const lim = Math.floor(rx);
    for (let dx = -lim; dx <= lim; dx += 2) {
      const c = dx / rx;
      const sn = Math.sqrt(Math.max(0, 1 - c * c));
      const py = R0(y + (back ? -sn : sn) * ry);
      const wv = 0.6 + 0.4 * Math.sin(dx * 0.21 + e.t * 14 + (back ? 1.7 : 0));
      const h = Math.max(1, R0(hmax * wv * (0.5 + 0.5 * sn)));
      const px = x + dx;
      ctx.globalAlpha = (back ? 0.45 : 0.75) * fade;
      ctx.fillStyle = '#0277bd';
      ctx.fillRect(px, py - h, 2, h);
      ctx.fillStyle = '#29b6f6';
      ctx.fillRect(px, py - h, 2, Math.max(1, R0(h * 0.72)));
      ctx.fillStyle = '#81d4fa';
      ctx.fillRect(px, py - h, 2, Math.max(1, R0(h * 0.38)));
      ctx.globalAlpha = (back ? 0.55 : 0.95) * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py - h - 1, 2, 2);
    }
  }

  iceSpikes(ctx, e, x, y, rx, f, fade) {
    ctx.globalCompositeOperation = 'source-over';
    if (!e.shattered) {
      for (const s of e.spikes) {
        const grow = easeOut3(clamp01((rx / e.r - s.d * 0.9) * 5));
        if (grow <= 0) continue;
        const px = R0(x + Math.cos(s.a) * e.r * s.d);
        const py = R0(y + Math.sin(s.a) * e.r * s.d * 0.36);
        const h = Math.max(1, R0(s.h * grow));
        const w = s.w;
        ctx.globalAlpha = 0.95 * fade;
        for (let j = 0; j < h; j++) {
          const u = j / h;
          const hw = Math.max(0, R0(w * (1 - u)));
          ctx.fillStyle = '#0d2a4a';
          ctx.fillRect(px - hw - 1, py - j, hw * 2 + 3, 1);
          ctx.fillStyle = '#4fc3f7';
          ctx.fillRect(px - hw, py - j, hw * 2 + 1, 1);
          ctx.fillStyle = '#e1f5fe';
          ctx.fillRect(px - hw, py - j, hw + 1, 1);
          if (u < 0.85) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - hw, py - j, 1, 1);
          }
        }
        ctx.fillStyle = '#0d2a4a';
        ctx.fillRect(px, py - h, 1, 1);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 6, '#80d8ff', e.r * 0.5, 0.3 * fade, 0.5);
  }

  spinArcs(ctx, e, x, y, rr, fade, cols) {
    ctx.globalCompositeOperation = 'source-over';
    for (let b = 0; b < 3; b++) {
      const a0 = e.t * 14 + (b * TAU) / 3;
      const n = 32;
      for (let j = 0; j < n; j++) {
        const a = a0 - j * 0.07;
        const u = j / n;
        const sn = Math.sin(a);
        ctx.globalAlpha = fade * (1 - u * 0.7) * (sn > 0 ? 1 : 0.55);
        const th = u < 0.25 ? 4 : u < 0.6 ? 3 : 2;
        const px = R0(x + Math.cos(a) * rr);
        const py = R0(y + sn * rr * 0.36);
        ctx.fillStyle = cols[3];
        ctx.fillRect(px - 1, py - th + 1, 3, th + 1);
        ctx.fillStyle = u < 0.15 ? cols[0] : u < 0.5 ? cols[1] : cols[2];
        ctx.fillRect(px - 1, py - th, 3, th);
      }
    }
  }

  d_wave(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const u = Math.min(1, f / 0.8);
    const fade = f > 0.8 ? (1 - f) / 0.2 : 1;
    const hx = e.x + e.dir * e.range * u;
    const x = R0(hx - camX);
    const y = R0(e.y - 12 - camY);
    const gc = glowCol(e.c, e.el);
    if (e.p === 'arrow') {
      const big = e.range > 260;
      const len = Math.min(Math.abs(hx - e.x), big ? 140 : 100);
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < len; j += 2) {
        const v = 1 - j / len;
        ctx.globalAlpha = fade * v * 0.8;
        ctx.fillStyle = v > 0.7 ? '#ffffff' : gc;
        const th = v > 0.5 ? (big ? 3 : 2) : 1;
        ctx.fillRect(R0(x - e.dir * (j + 8)) - (e.dir < 0 ? 1 : 0), y - (th >> 1), 2, th);
      }
      drawGlow(ctx, x, y, gc, big ? 14 : 10, 0.65 * fade);
      drawGlow(ctx, x, y, '#ffffff', 5, 0.8 * fade);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade;
      const L = big ? 18 : 15;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.dir > 0 ? x - L : x, y, L, 1);
      ctx.fillStyle = gc;
      ctx.fillRect(e.dir > 0 ? x - L : x, y + 1, L, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - e.dir * 2, y - 2, 1, 5);
      ctx.fillRect(x - e.dir * 3, y - 3, 1, 1);
      ctx.fillRect(x - e.dir * 3, y + 3, 1, 1);
      ctx.fillRect(x + e.dir, y, 1, 1);
      ctx.fillStyle = gc;
      ctx.fillRect(x - e.dir * L, y - 2, 1, 2);
      ctx.fillRect(x - e.dir * (L - 2), y - 2, 1, 2);
      ctx.fillRect(x - e.dir * L, y + 2, 1, 2);
      ctx.fillRect(x - e.dir * (L - 2), y + 2, 1, 2);
      return;
    }
    // kiếm khí: lưỡi trăng khuyết lớn bay ngang
    const B = bladeSprite(e.c, 16, 6, e.dir > 0 ? 0 : 8, 1.25);
    const h = B.S >> 1;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x + e.dir * 8, y, gc, 18, 0.5 * fade, 1.2, 0.7);
    for (let k = 3; k >= 1; k--) {
      ctx.globalAlpha = fade * (0.42 - k * 0.1);
      ctx.drawImage(B.cv, R0(x - e.dir * k * 9) - h, y - h);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.drawImage(B.cv, x - h, y - h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * fade;
    ctx.drawImage(B.cv, x - h, y - h);
  }

  d_mark(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const env = f < 0.15 ? f / 0.15 : f > 0.7 ? (1 - f) / 0.3 : 1;
    const rx = e.r * (0.85 + 0.15 * env);
    const ry = rx * 0.34;
    const gc = glowCol(e.c, e.el);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, gc, rx, 0.3 * env, 0.34);
    ctx.globalAlpha = 0.75 * env;
    ctx.fillStyle = gc;
    ringPx(ctx, x, y, rx, ry, 2, 1);
    ctx.globalAlpha = 0.55 * env;
    ctx.fillStyle = '#ffffff';
    const rot = e.t * 3;
    for (let k = 0; k < 8; k++) ringPx(ctx, x, y, rx * 0.72, ry * 0.72, 1, 1, rot + (k * TAU) / 8, rot + (k * TAU) / 8 + 0.35);
  }

  d_meteor(ctx, e, camX, camY) {
    const fall = clamp01(e.t / e.hit);
    const gx = R0(e.x - camX);
    const gy = R0(e.y - camY);
    const water = e.el !== 'fire';
    const gc = water ? '#40c4ff' : '#ff6d00';
    const big = e.big;
    if (e.t < e.hit) {
      ctx.globalCompositeOperation = 'lighter';
      const pr = e.r * (0.55 - fall * 0.15);
      ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(e.t * 30));
      ctx.fillStyle = water ? '#80d8ff' : '#ff8a65';
      ringPx(ctx, gx, gy, pr, pr * 0.34, 2, 1);
      drawGlow(ctx, gx, gy, gc, pr, 0.25 * fall, 0.34);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 * fall;
      const sr = 4 + fall * 14;
      ctx.fillStyle = '#000000';
      ctx.fillRect(R0(gx - sr), gy - 1, R0(sr * 2), 3);
      ctx.fillRect(R0(gx - sr * 0.7), gy - 2, R0(sr * 1.4), 5);
      const ff = Math.pow(fall, 1.35);
      const x = R0(e.x - 70 + 70 * ff - camX);
      const y = R0(e.y - 165 + 155 * ff - camY);
      const ux = 70 / 170;
      const uy = 155 / 170;
      const tl = big ? 50 : 40;
      ctx.globalCompositeOperation = water ? 'source-over' : 'lighter';
      for (let j = 0; j < tl; j++) {
        const v = 1 - j / tl;
        const w = Math.max(1, R0((big ? 9 : 7) * v));
        const wob = water ? Math.sin(j * 0.45 - e.t * 30) * 3 * v : 0;
        ctx.globalAlpha = (water ? 0.55 : 0.6) * v;
        ctx.fillStyle = v > 0.8 ? '#ffffff' : v > 0.5 ? (water ? '#81d4fa' : '#ffca28') : water ? '#0288d1' : gc;
        ctx.fillRect(R0(x - ux * j - w / 2 + wob), R0(y - uy * j - w / 2), w, w);
      }
      if (water) {
        for (let j = 0; j < tl; j++) {
          const v = 1 - j / tl;
          ctx.globalAlpha = 0.9 * v;
          ctx.fillStyle = j % 3 ? '#e1f5fe' : '#ffffff';
          ctx.fillRect(R0(x - ux * j + Math.sin(j * 0.45 - e.t * 30 + Math.PI) * 5 * v), R0(y - uy * j), 1, 1);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, x, y, gc, big ? 18 : 14, 0.6);
      drawGlow(ctx, x, y, '#ffffff', 6, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const M = meteorSprite(e.c, water ? 'water' : 'fire', big ? 6 : 5);
      const h = M.S >> 1;
      ctx.drawImage(M.cv, x - h, y - h);
    } else {
      const f = (e.t - e.hit) / (e.life - e.hit);
      ctx.globalCompositeOperation = 'lighter';
      const bh = (big ? 120 : 95) * (0.6 + 0.4 * easeOut(clamp01(f * 4)));
      const bw = R0((big ? 34 : 26) * (1 - f * 0.6));
      ctx.globalAlpha = 0.75 * (1 - f) * (1 - f);
      ctx.drawImage(beamSprite(gc, 34, 120), gx - (bw >> 1), R0(gy - bh), bw, R0(bh));
      drawGlow(ctx, gx, gy - 4, gc, e.r * 0.7, 0.4 * (1 - f), 0.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 * (1 - f);
      ctx.fillStyle = water ? '#01579b' : '#1a0d08';
      const cr = 16 + (big ? 6 : 0);
      ctx.fillRect(gx - cr, gy - 1, cr * 2, 3);
      ctx.fillRect(R0(gx - cr * 0.6), gy - 2, R0(cr * 1.2), 5);
    }
  }

  d_whirl(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const env = f < 0.15 ? easeOut(f / 0.15) : f > 0.75 ? (1 - f) / 0.25 : 1;
    const x0 = e.x - camX;
    const y0 = R0(e.y - camY);
    const H = (e.big ? 78 : 58) * (0.55 + 0.45 * env);
    const W = Math.min(e.big ? 34 : 24, e.r * 0.34) * (0.4 + 0.6 * env);
    const rp = ramp(e.c);
    const sway = (p) => Math.sin(p * 3.2 + e.t * 5) * 4 * p;
    const rad = (p) => 2 + Math.pow(p, 1.25) * W;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x0, y0 - 2, glowCol(e.c, e.el), W + 10, 0.35 * env, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    const step = 3;
    const layers = Math.max(4, Math.floor(H / step));
    for (let i = 0; i <= layers; i++) {
      const p = i / layers;
      const r = rad(p);
      ctx.globalAlpha = 0.24 * env;
      ctx.fillStyle = rp[2];
      ctx.fillRect(R0(x0 + sway(p) - r), R0(y0 - p * H), R0(r * 2), step);
    }
    this.whirlDebris(ctx, e, x0, y0, H, rad, sway, env, false);
    for (let i = 0; i <= layers; i++) {
      const p = i / layers;
      const r = rad(p);
      const cx = x0 + sway(p);
      const cy = y0 - p * H;
      const rot = e.t * 15 + p * 6 + i * 1.3;
      const n = Math.max(6, R0(r * 1.7));
      for (let j = 0; j < n; j++) {
        const u = j / n;
        const a = rot - u * Math.PI * 1.05;
        const sn = Math.sin(a);
        const front = sn > 0;
        const px = R0(cx + Math.cos(a) * r);
        const py = R0(cy + sn * r * 0.3);
        if (front) {
          ctx.globalAlpha = env * (1 - u * 0.5);
          ctx.fillStyle = u < 0.12 ? '#ffffff' : u < 0.4 ? rp[1] : u < 0.75 ? rp[2] : rp[3];
          ctx.fillRect(px, py - 1, 2, 2);
        } else {
          ctx.globalAlpha = env * 0.5 * (1 - u * 0.5);
          ctx.fillStyle = rp[4];
          ctx.fillRect(px, py, 2, 1);
        }
      }
    }
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x0 + sway(1), y0 - H, rad(1), rad(1) * 0.3, 1, 1, e.t * 12, e.t * 12 + 2.4);
    ctx.fillStyle = rp[1];
    ringPx(ctx, x0 + sway(1), y0 - H, rad(1), rad(1) * 0.3, 1, 1, e.t * 12 + 2.4, e.t * 12 + 5);
    this.whirlDebris(ctx, e, x0, y0, H, rad, sway, env, true);
  }

  whirlDebris(ctx, e, x0, y0, H, rad, sway, env, front) {
    ctx.globalCompositeOperation = 'source-over';
    for (const d of e.deb) {
      const p = (d.h + e.t * d.vh) % 1;
      const a = d.a + e.t * d.w;
      const sn = Math.sin(a);
      if (front !== sn > 0) continue;
      const rr = rad(p) + 3;
      const px = R0(x0 + sway(p) + Math.cos(a) * rr);
      const py = R0(y0 - p * H + sn * rr * 0.3);
      ctx.globalAlpha = env * (front ? 1 : 0.55);
      ctx.fillStyle = d.c;
      if (d.kind === 'rock') {
        ctx.fillRect(px, py, 2, 2);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(px + 1, py + 1, 1, 1);
      } else {
        ctx.fillRect(px, py, 2, 1);
        ctx.fillStyle = shade(d.c, -0.35);
        ctx.fillRect(px + (Math.floor(e.t * 10 + d.a) & 1), py + 1, 1, 1);
      }
    }
  }

  d_aura(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.12 ? f / 0.12 : f > 0.65 ? (1 - f) / 0.35 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    const gc = glowCol(e.c, e.el);
    ctx.globalCompositeOperation = 'lighter';
    const bw = R0(18 + 6 * Math.sin(e.t * 10));
    ctx.globalAlpha = 0.6 * env;
    ctx.drawImage(beamSprite(gc, 24, 72), x - (bw >> 1), y - 70, bw, 72);
    drawGlow(ctx, x, y - 12, gc, 16, 0.35 * env);
    for (let k = 0; k < 3; k++) {
      const p = (e.t * 1.4 + k / 3) % 1;
      const r = 5 + p * 20;
      ctx.globalAlpha = env * (1 - p) * 0.9;
      ctx.fillStyle = k === 0 ? '#ffffff' : gc;
      ringPx(ctx, x, y, r, r * 0.3, 1, 1);
    }
    // vòng phù văn
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = shade(gc, 0.4);
    const rot = e.t * 4;
    for (let k = 0; k < 6; k++) ringPx(ctx, x, y, 13, 4, 1, 1, rot + (k * TAU) / 6, rot + (k * TAU) / 6 + 0.5);
  }

  d_heal(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.12 ? f / 0.12 : f > 0.65 ? (1 - f) / 0.35 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 * env;
    ctx.drawImage(beamSprite(e.c, 20, 60), x - 10, y - 58);
    drawGlow(ctx, x, y - 1, e.c, 20, 0.45 * env, 0.35);
    ctx.globalAlpha = 0.9 * env;
    ctx.fillStyle = e.c;
    const r = 15 + 3 * easeOut(clamp01(f * 3));
    ringPx(ctx, x, y, r, r * 0.32, 2, 1);
    ctx.fillStyle = '#ffffff';
    const rot = -e.t * 3;
    for (let k = 0; k < 4; k++) ringPx(ctx, x, y, r * 0.66, r * 0.66 * 0.32, 1, 1, rot + (k * TAU) / 4, rot + (k * TAU) / 4 + 0.9);
    for (let k = 0; k < 6; k++) {
      const a = e.t * 2 + (k * TAU) / 6;
      const px = R0(x + Math.cos(a) * r);
      const py = R0(y + Math.sin(a) * r * 0.32);
      ctx.fillRect(px - 1, py, 3, 1);
      ctx.fillRect(px, py - 1, 1, 3);
    }
  }

  d_dash(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const fade = 1 - f;
    const y = R0(e.y - camY);
    const sil = silhouette(glowCol(e.c, e.el));
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 1; k <= 5; k++) {
      const u = k / 6;
      const px = R0(e.x0 + (e.x1 - e.x0) * u - camX);
      ctx.globalAlpha = fade * (0.1 + u * 0.4);
      if (e.dir > 0) ctx.drawImage(sil, px - 8, y - sil.height);
      else {
        ctx.save();
        ctx.translate(px, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sil, -8, y - sil.height);
        ctx.restore();
      }
    }
    const xa = Math.min(e.x0, e.x1) - camX;
    const span = Math.abs(e.x1 - e.x0);
    for (const l of e.lines) {
      const px = R0(xa + l.u * span + e.dir * f * 20);
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = l.c;
      const len = R0(l.len * (1 - f * 0.5));
      ctx.fillRect(e.dir > 0 ? px - len : px, y + R0(l.y), len, 1);
    }
    for (let k = 0; k < 3; k++) {
      const t0 = 0.04 + k * 0.05;
      const lt = (e.t - t0) / 0.3;
      if (lt <= 0 || lt >= 1) continue;
      const cx = R0(e.x0 + (e.x1 - e.x0) * (0.3 + k * 0.3) - camX);
      const cy = y - 13;
      const g = easeOut3(clamp01(lt * 3)) * 9;
      ctx.globalAlpha = 1 - lt;
      ctx.fillStyle = shade(e.c, -0.45);
      linePx(ctx, cx - g + 1, cy - g, cx + g + 1, cy + g);
      linePx(ctx, cx - g + 1, cy + g, cx + g + 1, cy - g);
      ctx.fillStyle = '#ffffff';
      linePx(ctx, cx - g, cy - g, cx + g, cy + g);
      ctx.fillStyle = e.c;
      linePx(ctx, cx - g, cy + g, cx + g, cy - g);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
    }
  }

  d_level(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.08 ? f / 0.08 : f > 0.55 ? (1 - f) / 0.45 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.24 * env;
    ctx.fillStyle = '#fff59d';
    const cy = y - 14;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + 0.2 + ((Math.PI - 0.4) * k) / 8 + Math.sin(e.t * 2 + k) * 0.08;
      const L = (k % 2 ? 36 : 54) * (0.6 + 0.4 * env);
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x + Math.cos(a - 0.07) * L, cy + Math.sin(a - 0.07) * L);
      ctx.lineTo(x + Math.cos(a + 0.07) * L, cy + Math.sin(a + 0.07) * L);
      ctx.closePath();
      ctx.fill();
    }
    const bw = R0(28 * (0.7 + 0.3 * env) + Math.sin(e.t * 18) * 2);
    ctx.globalAlpha = 0.65 * env;
    ctx.drawImage(beamSprite('#ffd54f', 32, 130), x - (bw >> 1), y - 128, bw, 130);
    ctx.globalAlpha = 0.55 * env;
    ctx.drawImage(beamSprite('#ffffff', 10, 130), x - 4, y - 128, 8, 130);
    drawGlow(ctx, x, cy, '#ffe082', 20, 0.4 * env);
    for (let k = 0; k < 3; k++) {
      const p = (e.t * 1.1 + k / 3) % 1;
      const r = 6 + p * 34;
      ctx.globalAlpha = env * (1 - p);
      ctx.fillStyle = k === 0 ? '#ffffff' : '#ffd54f';
      ringPx(ctx, x, y, r, r * 0.3, 2, 1);
    }
  }

  // ================= CHỮ (canvas phân giải cao) =================
  renderText(t, scale) {
    if (!this.fontOK) this.fontOK = !document.fonts || document.fonts.check('16px VT323');
    const base = t.banner ? 30 : t.crit ? 31 : t.miss ? 21 : 23;
    const size = Math.round(base * scale * 1.15);
    const font = `bold ${size}px VT323, monospace`;
    const m = this.mctx;
    m.font = font;
    const tw = m.measureText(t.s).width;
    const pad = Math.ceil(size * 0.35);
    const w = Math.ceil(tw + pad * 2);
    const h = Math.ceil(size + pad * 2);
    const cv = mkCanvas(w, h);
    const g = cv.getContext('2d');
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const cx = w / 2;
    const cy = h / 2 + size * 0.04;
    let top;
    let mid;
    let bot;
    if (t.crit) {
      top = '#fffde7';
      mid = t.c;
      bot = '#ff6d00';
    } else {
      top = shade(t.c, 0.7);
      mid = t.c;
      bot = shade(t.c, -0.28);
    }
    if (t.crit || t.banner) {
      g.shadowColor = t.crit ? 'rgba(255,90,0,0.95)' : 'rgba(255,200,40,0.9)';
      g.shadowBlur = size * 0.35;
    }
    g.lineWidth = Math.max(3, size * 0.24);
    g.strokeStyle = '#140810';
    g.strokeText(t.s, cx, cy);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
    g.lineWidth = Math.max(1.5, size * 0.1);
    g.strokeStyle = t.crit ? '#7a1f00' : shade(t.c, -0.6);
    g.strokeText(t.s, cx, cy);
    const gr = g.createLinearGradient(0, cy - size * 0.38, 0, cy + size * 0.38);
    gr.addColorStop(0, top);
    gr.addColorStop(0.45, mid);
    gr.addColorStop(1, bot);
    g.fillStyle = gr;
    g.fillText(t.s, cx, cy);
    t.cv = cv;
    t.cs = this.fontOK ? scale : -1;
  }

  drawTexts(ctx, toScreen, scale) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const t of this.texts) {
      if (!t.cv || t.cs !== scale) this.renderText(t, scale);
      const T = t.t;
      let dx = 0;
      let dy;
      let sc = 1;
      let a = 1;
      if (t.miss) {
        dx = easeOut3(Math.min(1, T / 0.6)) * 9 * t.side;
        dy = -18 * easeOut3(Math.min(1, T / 0.7));
        sc = T < 0.08 ? 1.25 - (T / 0.08) * 0.25 : 1;
        a = T > 0.6 ? Math.max(0, 1 - (T - 0.6) / 0.5) : 1;
      } else if (t.crit) {
        sc = T < 0.07 ? 0.5 + (T / 0.07) * 1.2 : T < 0.2 ? 1.7 - ((T - 0.07) / 0.13) * 0.55 : 1.15;
        dy = -12 * easeOut3(Math.min(1, T / 0.22)) - Math.max(0, T - 0.45) * 26;
        dx = T < 0.22 ? Math.sin(T * 95) * 1.2 * (1 - T / 0.22) : 0;
        a = T > 0.85 ? Math.max(0, 1 - (T - 0.85) / 0.4) : 1;
      } else if (t.banner) {
        sc = T < 0.1 ? 0.6 + (T / 0.1) * 0.6 : T < 0.2 ? 1.2 - ((T - 0.1) / 0.1) * 0.2 : 1;
        dy = -22 * easeOut3(Math.min(1, T / 1.2));
        a = T > 1.2 ? Math.max(0, 1 - (T - 1.2) / 0.4) : 1;
      } else {
        sc = T < 0.07 ? 1.45 - (T / 0.07) * 0.45 : 1;
        dy = -26 * easeOut3(Math.min(1, T / 0.85));
        a = T > 0.72 ? Math.max(0, 1 - (T - 0.72) / 0.38) : 1;
      }
      const [sx, sy] = toScreen(t.x + dx, t.y + dy);
      const w = t.cv.width * sc / 1.15;
      const h = t.cv.height * sc / 1.15;
      ctx.globalAlpha = a;
      ctx.drawImage(t.cv, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
    }
    ctx.restore();
  }
}
