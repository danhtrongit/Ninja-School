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
function beamSprite(col, w, h, core = true) {
  const key = `${col}|${w}|${h}|${core ? 1 : 0}`;
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
      const white = core && dx < 0.16 && vy > 0.1;
      const i = (y * w + x) * 4;
      img.data[i] = white ? 255 : R;
      img.data[i + 1] = white ? 255 : G;
      img.data[i + 2] = white ? 255 : B;
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
  const pal = { L: shade(c, -0.5), M: c };
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
  // vòng kín: tô theo hàng giữa elip ngoài và elip trong -> liền nét, không chồng alpha ở bán kính lớn
  if (a1 - a0 >= TAU - 1e-3 && rx >= 3) {
    ringRows(ctx, R0(cx), R0(cy), rx, ry, w, h);
    return;
  }
  const n = Math.max(10, Math.min(2000, R0(((rx + ry) * Math.PI * ((a1 - a0) / TAU)) / step)));
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

// Cột sáng cao H (sprite cùng chiều cao, không co giãn dọc); đoạn 40px cuối (vùng thân nhân vật) mờ hơn
// để vẫn đọc được nhân vật bên trong cột
function bodyBeam(ctx, img, x, yFoot, bw, a, bodyA) {
  const H = img.height;
  const top = yFoot + 2 - H;
  const cut = H - 42;
  const dx = x - (bw >> 1);
  ctx.globalAlpha = a;
  ctx.drawImage(img, 0, 0, img.width, cut, dx, top, bw, cut);
  ctx.globalAlpha = a * bodyA;
  ctx.drawImage(img, 0, cut, img.width, 42, dx, top + cut, bw, 42);
}

// Viền elip dày w (ngang) x h (dọc), mỗi hàng tối đa 2 fillRect
function ringRows(ctx, cx, cy, rx, ry, w, h) {
  const ox = rx + w / 2;
  const oy = Math.max(0.5, ry + h / 2);
  const ix = rx - w / 2;
  const iy = ry - h / 2;
  const n = Math.ceil(oy);
  for (let dy = -n; dy <= n; dy++) {
    const v = dy / oy;
    if (v * v >= 1) continue;
    const ho = R0(ox * Math.sqrt(1 - v * v));
    const u = iy > 0.5 ? dy / iy : 2;
    const hi = u * u < 1 ? R0(ix * Math.sqrt(1 - u * u)) : -1;
    if (hi < 0 || ho - hi < 1) ctx.fillRect(cx - ho, cy + dy, ho * 2 + 1, 1);
    else {
      ctx.fillRect(cx - ho, cy + dy, ho - hi, 1);
      ctx.fillRect(cx + hi + 1, cy + dy, ho - hi, 1);
    }
  }
}

// Elip đặc tô theo từng hàng (1 fillRect/hàng, không chồng alpha)
function fillEllipse(ctx, cx, cy, rx, ry) {
  if (rx < 0.5 || ry < 0.5) return;
  const n = Math.ceil(ry);
  for (let dy = -n; dy <= n; dy++) {
    const v = dy / (ry + 0.5);
    if (v * v >= 1) continue;
    const hw = R0(rx * Math.sqrt(1 - v * v));
    ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

const SPRITE_OUTLINE = '#1d1424';

// Chữ phù văn 5x5 tự thiết kế (lên cấp, cường hóa, triệu hồi)
const RUNES = [
  ['#####', '..#..', '.###.', '..#..', '.#.#.'],
  ['#####', '....#', '.##.#', '.#..#', '.####'],
  ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  ['#.#.#', '#.#.#', '#####', '..#..', '..#..'],
  ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'],
  ['###..', '..#..', '..###', '..#..', '###..'],
  ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  ['..#..', '.###.', '#.#.#', '..#..', '#####'],
];
const runeCache = new Map();
function runeSprite(c, i) {
  const key = `${c}|${i}`;
  let cv = runeCache.get(key);
  if (cv) return cv;
  const m = RUNES[i % RUNES.length];
  cv = mkCanvas(7, 7);
  const g = cv.getContext('2d');
  const img = g.createImageData(7, 7);
  const lit = rgb(shade(c, 0.55));
  const mid = rgb(c);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (m[y][x] !== '#') continue;
      // ánh sáng trên-trái: điểm có ô trống phía trên hoặc bên trái sáng hơn
      const edge = y === 0 || x === 0 || m[y - 1][x] !== '#' || m[y][x - 1] !== '#';
      const col = edge ? lit : mid;
      const k = ((y + 1) * 7 + x + 1) * 4;
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  }
  outlineImg(img, 7, 7, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  runeCache.set(key, cv);
  return cv;
}

// Dấu "!" cảnh báo chiêu boss
const bangCache = new Map();
function bangSprite(c) {
  let cv = bangCache.get(c);
  if (cv) return cv;
  const m = ['LMM', 'LMM', 'LMD', 'LMD', 'MMD', '...', 'LMD', 'MDD'];
  const pal = { L: shade(c, 0.6), M: c, D: shade(c, -0.3) };
  cv = mkCanvas(5, 10);
  const g = cv.getContext('2d');
  const img = g.createImageData(5, 10);
  m.forEach((row, y) => {
    for (let x = 0; x < 3; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = rgb(pal[ch]);
      const k = ((y + 1) * 5 + x + 1) * 4;
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  });
  outlineImg(img, 5, 10, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  bangCache.set(c, cv);
  return cv;
}

// Mảnh đá vỡ (viền tối, sáng trên-trái), 2 cỡ
const ROCK_SHAPES = {
  3: ['.ooo.', 'oLLMo', 'oLMDo', 'oMDDo', '.ooo.'],
  4: ['.oooo.', 'oLLLMo', 'oLMMDo', 'oMMDDo', '.oDDDo', '..ooo.'],
};
const rockCache = new Map();
function rockSprite(c, s) {
  const key = `${c}|${s}`;
  let cv = rockCache.get(key);
  if (cv) return cv;
  const m = ROCK_SHAPES[s] || ROCK_SHAPES[3];
  const pal = { o: SPRITE_OUTLINE, L: shade(c, 0.35), M: c, D: shade(c, -0.3) };
  cv = mkCanvas(m[0].length, m.length);
  const g = cv.getContext('2d');
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      g.fillStyle = pal[row[x]];
      g.fillRect(x, y, 1, 1);
    }
  });
  rockCache.set(key, cv);
  return cv;
}

// Sao lấp lánh 4 cánh có viền tối (thời trang), n = độ dài cánh 1..3
const twkCache = new Map();
function twinkleSprite(c, n) {
  const key = `${c}|${n}`;
  let cv = twkCache.get(key);
  if (cv) return cv;
  const S = n * 2 + 3;
  const m = n + 1;
  cv = mkCanvas(S, S);
  const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const put = (x, y, col) => {
    const k = (y * S + x) * 4;
    img.data[k] = col[0];
    img.data[k + 1] = col[1];
    img.data[k + 2] = col[2];
    img.data[k + 3] = 255;
  };
  const mid = rgb(c);
  const lit = rgb(shade(c, 0.5));
  for (let i = 1; i <= n; i++) {
    // cánh trên và trái sáng hơn (ánh sáng trên-trái)
    put(m, m - i, i === 1 ? lit : mid);
    put(m - i, m, i === 1 ? lit : mid);
    put(m, m + i, mid);
    put(m + i, m, mid);
  }
  if (n >= 3) {
    put(m - 1, m - 1, lit);
    put(m + 1, m + 1, mid);
  }
  put(m, m, [255, 255, 255]);
  outlineImg(img, S, S, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  twkCache.set(key, cv);
  return cv;
}

// Màu cường hóa theo mốc +, khớp bảng độ hiếm
function plusColor(plus) {
  if (plus >= 13) return '#ff8a3c';
  if (plus >= 9) return '#c77dff';
  if (plus >= 5) return '#ffd23c';
  return '#5ab4ff';
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
    // Rung màn hình: cường độ (pixel nghệ thuật), giảm dần trong update
    this.shake = 0;
    // hệ số rung do game đặt (0 = tắt rung theo tùy chọn người chơi)
    this.shakeScale = 1;
    this.shakeOff = { x: 0, y: 0 };
    this.frame = 0;
    this.groundFrame = -1;
    // khung nhìn của lần vẽ trước, để giảm rung theo khoảng cách
    this.viewX = 0;
    this.viewY = 0;
    this.viewW = 0;
    this.viewH = 0;
  }

  addShake(v) {
    const s = (+v || 0) * (this.shakeScale >= 0 ? this.shakeScale : 1);
    if (s > 0) this.shake = Math.min(12, Math.max(this.shake, s));
  }

  // Rung tại vị trí thế giới: đủ mạnh khi trong khung nhìn, nhỏ dần ra ngoài, tắt khi xa hơn nửa màn hình
  shakeAt(x, y, v) {
    const W = this.viewW;
    if (!W) return this.addShake(v);
    const dx = Math.max(0, Math.abs(x - (this.viewX + W / 2)) - W / 2);
    const dy = Math.max(0, Math.abs(y - (this.viewY + this.viewH / 2)) - this.viewH / 2);
    const k = 1 - Math.max(dx / (W * 0.5), dy / Math.max(1, this.viewH * 0.5));
    if (k > 0) this.addShake(v * k);
  }

  // Độ lệch camera nguyên pixel cho khung hiện tại (đối tượng dùng lại, không cấp phát)
  shakeXY() {
    const o = this.shakeOff;
    const s = this.shake;
    if (s < 0.3) {
      o.x = 0;
      o.y = 0;
    } else {
      o.x = R0(Math.sin(this.time * 91) * s);
      o.y = R0(Math.cos(this.time * 73) * s * 0.6);
    }
    return o;
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
    this.spawn('glow', x, y, 0, 0, 0.12, glowCol(c, el), { s: 4 + Math.min(10, n * 0.5), s1: 2, a: 0.55, add: true });
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
    this.add({ k: 'slash', x, y, dir: dir || 1, c: c || '#ffffff', big: !!big, life: big ? 0.26 : 0.2, el: elemOf(c) });
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
    const e = this.add({ k: 'burst', x, y, r: Math.max(16, r), c: col, big: !!big, life: big ? 0.6 : 0.48, el, acc: 0 });
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
    this.add({ k: 'whirl', x, y, r: Math.max(30, r), c: col, big: !!big, el, life: big ? 0.9 : 0.75, deb, acc: 0 });
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
    this.add({ k: 'level', get, life: 1.5, acc: 0, burst: false });
  }

  // ---- Cảnh báo chiêu boss trên mặt đất. kind: 'circle' | 'line' (radius = chiều dài, dấu = hướng) | 'pillar'
  // width (tùy chọn, chỉ cho 'line'): bề dày dải trên mặt đất theo pixel, mặc định 14
  telegraph(x, y, radius, dur, color, kind, width) {
    const d = Math.max(0.2, Math.min(6, +dur || 1));
    const k = kind === 'line' || kind === 'pillar' ? kind : 'circle';
    const r = +radius || 60;
    const e = { k: 'tele', ground: true, x, y, kind: k, dur: d, life: d + 0.16, c: color || '#ff5252', acc: 0 };
    if (k === 'line') {
      e.dir = r < 0 ? -1 : 1;
      e.len = Math.max(16, Math.abs(r));
      e.h = Math.max(3, Math.min(40, R0((+width || 14) / 2)));
    } else e.r = Math.max(12, Math.abs(r));
    return this.add(e);
  }

  // ---- Chiêu boss tung ra. kind: 'quake' | 'roar' | 'summon' | 'beam' | 'nova'
  bossSkill(x, y, kind, color, scale) {
    const sc = Math.max(0.5, Math.min(3, +scale || 1));
    switch (kind) {
      case 'quake': return this.bsQuake(x, y, color || '#ff7043', sc);
      case 'roar': return this.bsRoar(x, y, color || '#ffe0b2', sc);
      case 'summon': return this.bsSummon(x, y, color || '#c77dff', sc);
      case 'beam': return this.bsBeam(x, y, color || '#80d8ff', sc);
      default: return this.bsNova(x, y, color || '#ff8a3c', sc);
    }
  }

  // Rung của chiêu boss: tăng chậm theo cỡ boss, giảm theo khoảng cách tới khung nhìn
  bossShake(x, y, base, sc) {
    this.shakeAt(x, y, base * Math.min(1.4, 0.7 + 0.3 * sc));
  }

  rock(x, y, vx, vy, c, floor, s) {
    return this.spawn('rock', x, y, vx, vy, rnd(0.7, 1.1), c, { g: 420, floor, s: s || (Math.random() < 0.5 ? 3 : 4) });
  }

  bsQuake(x, y, c, sc) {
    const R = 90 * sc;
    const g = Math.min(sc, 2);
    const cracks = [];
    for (const side of [-1, 1]) {
      for (let m = 0; m < 3; m++) {
        const reach = R * (m === 2 ? rnd(0.35, 0.55) : rnd(0.75, 1));
        const tilt = (m - 1) * rnd(0.12, 0.22);
        const pts = [0, 0];
        let px = 0;
        let py = 0;
        while (Math.abs(px) < reach) {
          px += side * rnd(5, 10);
          py = Math.max(-R * 0.22, Math.min(R * 0.22, py + tilt * 7 + rnd(-1.6, 1.6)));
          pts.push(px, py);
        }
        cracks.push(pts);
      }
    }
    this.add({ k: 'quake', ground: true, x, y, c, sc, R, cracks, life: 0.95, acc: 0 });
    // vòng bụi đất (màu đất, không cộng sáng) để khác hẳn vòng trắng của nova
    const RR = Math.min(150, R);
    this.spawn('dring', x, y, 0, 0, 0.55, '#a1887f', { s: 6, s1: RR * 0.95, ry: 0.3, w: 3 });
    this.spawn('dring', x, y, 0, 0, 0.7, '#8d6e63', { s: 4, s1: RR * 0.68, ry: 0.3, w: 2 });
    this.spawn('glow', x, y - 4, 0, 0, 0.25, c, { s: 10 * g, s1: 20 * g, a: 0.4, add: true });
    const rocks = ['#8d6e63', '#6d4c41', '#a1887f', '#795548'];
    for (let i = 0; i < R0(16 * g); i++) {
      const a = rnd(-1, 1);
      this.rock(x + a * R * 0.6, y - rnd(0, 3), a * rnd(40, 120), -rnd(90, 210), pick(rocks), y + rnd(-3, 4));
    }
    for (let i = 0; i < R0(10 * g); i++) {
      const sm = this.smoke(x + rnd(-R, R) * 0.7, y - rnd(0, 4), pick(['#bcaaa4', '#a1887f', '#d7ccc8']), 3, 8, 0.9, 0.6);
      if (sm) sm.vx = (sm.x - x) * 0.9;
    }
    this.bossShake(x, y, 6, sc);
  }

  bsRoar(x, y, c, sc) {
    const hy = y - 26 * sc;
    const g = Math.min(sc, 2);
    this.add({ k: 'roar', x, y, hy, c, sc, R: 95 * sc, life: 0.8, acc: 0 });
    this.spawn('glow', x, hy, 0, 0, 0.2, '#ffffff', { s: 8 * g, s1: 16 * g, a: 0.45, add: true });
    for (let i = 0; i < R0(8 * g); i++) {
      const sm = this.smoke(x + rnd(-10, 10) * sc, y - 1, pick(['#d7ccc8', '#bcaaa4']), 2, 6, 0.6, 0.5);
      if (sm) sm.vx = (i % 2 ? 1 : -1) * rnd(50, 110);
    }
    this.bossShake(x, y, 3, sc);
  }

  bsSummon(x, y, c, sc) {
    const g = Math.min(sc, 2);
    this.add({ k: 'summon', ground: true, x, y, c, sc, R: 34 * sc, life: 1.25, acc: 0, popped: false, dark: shade(c, -0.6), lite: shade(c, 0.5) });
    this.spawn('glow', x, y - 2, 0, 0, 0.3, c, { s: 10 * g, s1: 30 * g, a: 0.35, add: true });
  }

  bsBeam(x, y, c, sc) {
    const g = Math.min(sc, 2);
    this.add({ k: 'beam', x, y, c, sc, life: 0.85, acc: 0 });
    const gc = glowCol(c, elemOf(c));
    const brp = ramp(gc);
    this.spawn('glow', x, y - 8, 0, 0, 0.25, '#ffffff', { s: 12 * g, s1: 22 * g, a: 0.6, add: true });
    // vòng sóng theo màu nguyên tố của tia (không phải vòng trắng)
    this.spawn('dring', x, y, 0, 0, 0.45, brp[2], { s: 6, s1: 46 * g, ry: 0.32, w: 2 });
    this.spawn('dring', x, y, 0, 0, 0.6, brp[3], { s: 4, s1: 32 * g, ry: 0.32, w: 2 });
    const sp = EP[elemOf(c)].spark;
    for (let i = 0; i < R0(22 * g); i++) {
      const a = rnd(-Math.PI, 0);
      const v = rnd(50, 150);
      this.spawn('spark', x + rnd(-4, 4), y - 2, Math.cos(a) * v, Math.sin(a) * v, rnd(0.25, 0.5), i % 2 ? '#ffffff' : pick(sp), { g: 160, drag: 2, s: 3, add: true, floor: y });
    }
    this.bossShake(x, y, 4, sc);
  }

  bsNova(x, y, c, sc) {
    const el = elemOf(c);
    // cỡ hình ảnh tối đa 2: sc lớn chỉ mở rộng vòng mặt đất, không phủ trắng màn hình
    const g = Math.min(sc, 2);
    const cy = y - 12 * g;
    // vòng mặt đất tối đa 160px: lớn hơn thì elip cao quá khung nhìn 150px
    const R = Math.min(160, 100 * sc);
    this.add({ k: 'nova', x, y, cy, c, el, sc, g, R, life: 0.8, acc: 0 });
    this.spawn('glow', x, cy, 0, 0, 0.22, '#ffffff', { s: 16 * g, s1: Math.min(60, 36 * g), a: 0.75 - 0.15 * (g - 1), add: true });
    this.spawn('ring', x, y, 0, 0, 0.55, '#ffffff', { s: 10, s1: R, ry: 0.34, add: true, w: 3 });
    this.spawn('ring', x, y, 0, 0, 0.75, glowCol(c, el), { s: 6, s1: R * 0.85, ry: 0.34, add: true, w: 2 });
    const sp = EP[el].spark;
    for (let i = 0; i < R0(30 * g); i++) {
      const a = Math.random() * TAU;
      const v = rnd(80, 200) * Math.min(1.6, sc);
      this.spawn('spark', x, cy, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 20, rnd(0.3, 0.6), i % 3 ? pick(sp) : '#ffffff', { g: 110, drag: 2.2, s: 3, add: true });
    }
    // khói sáng ấm, mỏng, bay ra ngoài và lên trên thay cho khói đen của nổ thường
    if (el === 'fire' || el === 'water' || el === 'ice') this.explode(x, cy, 40 * g, c, el === 'fire' ? 'fire' : 'water', true, ['#ffccbc', '#ffe0b2', '#d7ccc8']);
    else for (let i = 0; i < 12; i++) {
      const st = this.star(x, cy, i % 2 ? '#ffffff' : c, 5, 0.5);
      if (st) {
        st.vx = Math.cos((i / 12) * TAU) * 120;
        st.vy = Math.sin((i / 12) * TAU) * 70;
        st.drag = 2.5;
      }
    }
    this.bossShake(x, y, 7, sc);
  }

  // ---- Cường hóa: ok = thành công/thất bại, plus = cấp + sau khi cường hóa (đổi màu theo mốc)
  enhance(x, y, ok, plus) {
    const p = Math.max(0, +plus || 0);
    const c = plusColor(p);
    if (ok) {
      this.add({ k: 'enh', x, y, ok: true, c, plus: p, life: 1.1, acc: 0 });
      this.spawn('glow', x, y - 14, 0, 0, 0.2, '#ffffff', { s: 8, s1: 18, a: 0.35, add: true });
      const n = p >= 9 ? 16 : 12;
      for (let i = 0; i < n; i++) {
        const st = this.star(x, y - 14, i % 2 ? c : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos((i / n) * TAU) * 70;
          st.vy = Math.sin((i / n) * TAU) * 45 - 15;
          st.drag = 2.6;
        }
      }
      if (p >= 13) this.addShake(2);
    } else {
      this.add({ k: 'enh', x, y, ok: false, c: '#90a4ae', plus: p, life: 0.85, acc: 0 });
      this.spawn('glow', x, y - 12, 0, 0, 0.18, '#ff5252', { s: 8, s1: 14, a: 0.4, add: true });
      // khói thấp sát đất và dạt hai bên để dấu X ở giữa vẫn rõ
      for (let i = 0; i < 8; i++) {
        const d = i % 2 ? 1 : -1;
        const sm = this.smoke(x + d * rnd(6, 14), y - rnd(0, 5), pick(['#78909c', '#607d8b', '#546e7a']), 2, 6, 0.8, 0.5);
        if (sm) {
          sm.vx = d * rnd(15, 35);
          sm.vy = -rnd(4, 12);
        }
      }
      for (let i = 0; i < 6; i++) {
        const d = i % 2 ? 1 : -1;
        this.rock(x + d * rnd(4, 9), y - rnd(4, 10), d * rnd(30, 70), -rnd(40, 100), pick(['#90a4ae', '#78909c', '#b0bec5']), y + rnd(-2, 3), 3);
      }
      this.addShake(1.5);
    }
  }

  // ---- Bụi chân thú cưỡi: gọi khoảng 8 lần/giây khi thú đang chạy (dir = hướng chạy)
  mountDust(x, y, dir) {
    const d = dir < 0 ? -1 : 1;
    const n = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const sm = this.smoke(x - d * rnd(2, 8), y - rnd(0, 2), pick(['#d7ccc8', '#bcaaa4', '#a1887f']), 2, rnd(4, 6) | 0, 0.5, 0.7);
      if (sm) {
        sm.vx = -d * rnd(15, 40);
        sm.vy = -rnd(6, 16);
      }
    }
    if (Math.random() < 0.4) this.spawn('px', x - d * 4, y - 1, -d * rnd(20, 50), -rnd(30, 60), 0.4, pick(['#8d6e63', '#6d4c41']), { g: 260, floor: y, a: 1 });
  }

  // ---- Lấp lánh khi khảm ngọc vào trang bị
  gemSocket(x, y, color) {
    const c = color || '#5ab4ff';
    this.add({ k: 'gem', x, y, c, lite: shade(c, 0.5), dark: shade(c, -0.55), life: 0.75, acc: 0, popped: false });
  }

  // ---- Lấp lánh thời trang (ngoại trang mới): xoắn ánh sáng quanh thân + sao lấp lánh
  costumeSparkle(x, y, color) {
    const c = color || '#f48fb1';
    this.add({ k: 'cost', x, y, c, lite: shade(c, 0.5), mid: shade(c, -0.15), dark: shade(c, -0.5), life: 1.1, acc: 0, popped: false });
  }

  // ================= CẬP NHẬT =================
  update(dt) {
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * (4 + this.shake * 5));
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
    this.spawn('glow', x, y, 0, 0, 0.14, glowCol(c, el), { s: e.boom ? 14 : 6, s1: e.boom ? 22 : 9, a: 0.6, add: true });
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

  // smoke (tùy chọn): bảng màu khói sáng, bay ra ngoài và lên cao để không che người ở tâm nổ
  explode(x, y, r, c, el, big, smoke) {
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
    if (!smoke) {
      for (let i = 0; i < (big ? 10 : 4); i++) this.smoke(x + rnd(-r, r) * 0.4, y - rnd(0, 14), pick(EP.fire.smoke), 3, big ? 9 : 6, big ? 1.2 : 0.9, 0.6);
      return;
    }
    for (let i = 0; i < (big ? 8 : 4); i++) {
      const d = i % 2 ? 1 : -1;
      const sm = this.smoke(x + d * rnd(0.7, 1.1) * r, y - rnd(10, 24), pick(smoke), 3, big ? 8 : 6, 0.9, 0.32);
      if (sm) {
        sm.vx = d * rnd(25, 50);
        sm.vy = -rnd(25, 45);
      }
    }
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
      // hạt bay hai bên thân, không phủ lên mặt nhân vật
      const sd = Math.random() < 0.5 ? -1 : 1;
      if (i % 2) this.spawn('ember', o.x + sd * rnd(6, 15), o.y - rnd(0, 6), rnd(-6, 6), -rnd(50, 110), rnd(0.6, 1.1), pick(['#fff59d', '#ffd54f', '#ffffff']), { add: true, drag: 0.6 });
      else this.star(o.x + sd * rnd(11, 20), o.y - rnd(0, 50), pick(['#fff59d', '#ffffff', '#ffe082']), rnd(2, 4) | 0, 0.5, -20);
      // hạt vàng vuông bay lên theo mép cột sáng
      if (i % 3 === 0) this.spawn('px', o.x + sd * rnd(7, 12), o.y - rnd(0, 10), rnd(-4, 4), -rnd(60, 120), rnd(0.6, 1), pick(['#ffd54f', '#ffca28', '#fff59d']), { s: 2, s1: 1, add: true });
    }
  }

  u_tele(e, dt) {
    if (e.t > e.dur) return;
    const f = e.t / e.dur;
    const k = this.tick(e, dt, e.kind === 'line' ? 10 + e.len * 0.08 : 8 + e.r * 0.12);
    const lit = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      if (e.kind === 'line') {
        const px = e.x + e.dir * Math.random() * e.len * f;
        this.spawn('px', px, e.y + rnd(-e.h, e.h), 0, -rnd(15, 35), rnd(0.3, 0.55), i % 2 ? '#ffffff' : lit, { add: true });
      } else if (e.kind === 'pillar' && i % 2) {
        this.spawn('px', e.x + rnd(-e.r, e.r) * 0.6, e.y - rnd(60, 150), 0, rnd(120, 220), rnd(0.3, 0.5), i % 4 === 1 ? '#ffffff' : lit, { add: true, s: 1, s1: 1 });
      } else {
        const a = Math.random() * TAU;
        this.spawn('px', e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r * 0.34, 0, -rnd(15, 35), rnd(0.3, 0.55), i % 2 ? '#ffffff' : lit, { add: true });
      }
    }
  }

  u_quake(e, dt) {
    const f = e.t / e.life;
    if (f > 0.45) return;
    const k = this.tick(e, dt, 26 * e.sc);
    for (let i = 0; i < k; i++) {
      const pts = pick(e.cracks);
      const j = (Math.random() * (pts.length >> 1)) << 1;
      const px = e.x + pts[j];
      const py = e.y + pts[j + 1];
      if (i % 2) this.spawn('ember', px, py, rnd(-10, 10), -rnd(30, 70), rnd(0.4, 0.8), pick(EP.fire.spark), { add: true, drag: 1 });
      else this.smoke(px, py - 1, pick(['#bcaaa4', '#a1887f']), 1, 4, 0.6, 0.45);
    }
  }

  u_roar(e, dt) {
    const f = e.t / e.life;
    if (f > 0.6) return;
    const k = this.tick(e, dt, 50 * e.sc);
    for (let i = 0; i < k; i++) {
      const d = i % 2 ? 1 : -1;
      this.wline(e.x + d * rnd(8, 20) * e.sc, e.hy + rnd(-20, 20) * e.sc, d * rnd(160, 260), rnd(6, 14), i % 3 ? '#ffffff' : e.c, 0.3);
    }
  }

  u_summon(e, dt) {
    const f = e.t / e.life;
    const R = e.R;
    if (f < 0.75) {
      const k = this.tick(e, dt, 50 * e.sc);
      for (let i = 0; i < k; i++) {
        const a = Math.random() * TAU;
        const rr = R * rnd(0.3, 1);
        this.spawn('px', e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * 0.34, 0, -rnd(30, 80), rnd(0.5, 0.9), i % 3 ? e.lite : '#ffffff', { add: true, s: 2, s1: 1 });
      }
    }
    if (!e.popped && e.t >= 0.5) {
      e.popped = true;
      const g = Math.min(2, e.sc);
      this.spawn('glow', e.x, e.y - 18 * e.sc, 0, 0, 0.3, '#ffffff', { s: 10 * g, s1: 22 * g, a: 0.6, add: true });
      this.spawn('vring', e.x, e.y - 18 * e.sc, 0, 0, 0.4, e.c, { s: 6, s1: 30 * e.sc });
      for (let i = 0; i < 14; i++) {
        const st = this.star(e.x, e.y - 18 * e.sc, i % 2 ? e.lite : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos((i / 14) * TAU) * 80;
          st.vy = Math.sin((i / 14) * TAU) * 60 - 20;
          st.drag = 2.4;
        }
      }
      for (let i = 0; i < 8; i++) this.smoke(e.x + rnd(-R, R) * 0.6, e.y - rnd(0, 6), pick([e.dark, '#3a2a48', '#4a3858']), 3, 8, 1, 0.42);
      this.bossShake(e.x, e.y, 2.5, e.sc);
    }
  }

  u_beam(e, dt) {
    const f = e.t / e.life;
    if (f > 0.6) return;
    const w = 10 * e.sc;
    const k = this.tick(e, dt, 60 * e.sc);
    const lit = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      if (i % 3 === 2) this.spawn('spark', e.x + rnd(-w, w), e.y - 2, rnd(-60, 60), -rnd(40, 110), rnd(0.25, 0.45), i % 2 ? '#ffffff' : lit, { g: 160, drag: 2, s: 2, add: true, floor: e.y });
      else this.spawn('px', e.x + rnd(-w, w), e.y - rnd(80, 200), 0, rnd(260, 380), rnd(0.25, 0.4), i % 2 ? '#ffffff' : lit, { add: true, s: 1, s1: 1 });
    }
  }

  u_nova(e, dt) {
    const f = e.t / e.life;
    if (f > 0.5) return;
    const k = this.tick(e, dt, 40 * e.sc);
    const rx = e.R * easeOut3(clamp01(f / 0.6));
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = e.x + Math.cos(a) * rx;
      const py = e.y + Math.sin(a) * rx * 0.34;
      if (e.el === 'fire') this.flame(px, py - 2, Math.cos(a) * 20, -rnd(30, 60), flameRamp(e.c, 'fire'), 3, 0.45);
      else if (e.el === 'water' || e.el === 'ice') this.drop(px, py - 2, Math.cos(a) * 40, -rnd(50, 120), pick(EP[e.el].drop), py + 2);
      else if (e.el === 'wind') this.leaf(px, py - 4, Math.cos(a) * 80, -rnd(20, 60));
      else this.spawn('spark', px, py - 3, Math.cos(a) * 40, -rnd(20, 60), 0.3, i % 2 ? '#ffffff' : e.c, { g: 100, s: 2, add: true });
    }
  }

  u_enh(e, dt) {
    const f = e.t / e.life;
    if (!e.ok || f > 0.6) return;
    const k = this.tick(e, dt, e.plus >= 9 ? 55 : 38);
    const lite = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      if (i % 2) this.spawn('px', e.x + sd * rnd(6, 12), e.y - rnd(0, 8), rnd(-4, 4), -rnd(50, 100), rnd(0.5, 0.8), pick([e.c, lite, '#ffffff']), { s: 2, s1: 1, add: true });
      else this.star(e.x + sd * rnd(10, 17), e.y - rnd(2, 34), pick([lite, '#ffffff']), 3, 0.45, -15);
      if (e.plus >= 13 && i % 3 === 0) this.ember(e.x + sd * rnd(5, 10), e.y - rnd(0, 6), pick(EP.fire.spark), 80);
    }
  }

  u_gem(e) {
    if (e.popped || e.t < 0.28) return;
    e.popped = true;
    const cy = e.y;
    this.spawn('glow', e.x, cy, 0, 0, 0.22, e.c, { s: 6, s1: 14, a: 0.7, add: true });
    this.star(e.x, cy, '#ffffff', 7, 0.35);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      this.spawn('spark', e.x, cy, Math.cos(a) * 60, Math.sin(a) * 60 - 10, rnd(0.25, 0.4), i % 2 ? '#ffffff' : e.lite, { g: 60, drag: 3, s: 2, add: true });
    }
  }

  u_cost(e, dt) {
    if (!e.popped && e.t > e.life * 0.62) {
      // dải xoắn chạm đỉnh đầu: tung sao ra xung quanh
      e.popped = true;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        this.spawn('twk', e.x, e.y - 36, Math.cos(a) * 55, Math.sin(a) * 40 - 10, rnd(0.45, 0.6), i % 2 ? e.c : e.lite, { drag: 3 });
      }
    }
    if (e.t > e.life * 0.8) return;
    const k = this.tick(e, dt, 26);
    for (let i = 0; i < k; i++) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      this.spawn('twk', e.x + sd * rnd(8, 18), e.y - rnd(2, 36), 0, -rnd(4, 12), rnd(0.4, 0.6), pick([e.c, e.lite, e.mid]));
    }
  }

  // ================= VẼ (canvas phân giải thấp) =================
  draw(ctx, camX, camY) {
    this.cw = ctx.canvas.width;
    this.ch = ctx.canvas.height;
    this.viewX = camX;
    this.viewY = camY;
    this.viewW = this.cw;
    this.viewH = this.ch;
    // nếu game đã gọi drawGround trong khung này thì không vẽ lại hiệu ứng mặt đất
    const skipGround = this.groundFrame === this.frame;
    this.frame++;
    ctx.save();
    for (const e of this.list) {
      if (e.delay > 0 || (skipGround && e.ground)) continue;
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
    // lượt trên cùng: ký hiệu cần đọc được (dấu "!", dấu X thất bại) không bị khói/hạt che
    for (const e of this.list) {
      if (e.delay > 0) continue;
      const fn = this[`o_${e.k}`];
      if (fn) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        fn.call(this, ctx, e, camX, camY);
      }
    }
    ctx.restore();
  }

  // Tùy chọn: vẽ hiệu ứng nằm trên mặt đất (cảnh báo boss, vết nứt, vòng triệu hồi) TRƯỚC khi vẽ quái/người.
  // Gọi cùng tham số với draw(); nếu không gọi thì draw() tự vẽ chúng.
  drawGround(ctx, camX, camY) {
    this.cw = ctx.canvas.width;
    this.ch = ctx.canvas.height;
    this.groundFrame = this.frame;
    ctx.save();
    for (const e of this.list) {
      if (e.delay > 0 || !e.ground) continue;
      const fn = this[`d_${e.k}`];
      if (!fn) continue;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      fn.call(this, ctx, e, camX, camY);
    }
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
        case 'twk': {
          // nhỏ -> to -> nhỏ theo 3 cỡ sprite
          const tw = Math.sin(f * Math.PI);
          const cv = twinkleSprite(p.c, tw > 0.75 ? 3 : tw > 0.35 ? 2 : 1);
          ctx.globalAlpha = 1;
          ctx.drawImage(cv, x - (cv.width >> 1), y - (cv.height >> 1));
          break;
        }
        case 'rock': {
          const cv = rockSprite(p.c, p.s);
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
        case 'dring': {
          // vòng sóng mặt đất vẽ thường (bụi đất, màu nguyên tố): mép dưới tối, thân màu, mép trên sáng
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          const ry = r * (p.ry || 0.3);
          const w = p.w || 2;
          const a = (1 - f) * (p.a || 1);
          ctx.globalAlpha = 0.7 * a;
          ctx.fillStyle = shade(p.c, -0.35);
          ringPx(ctx, x, y + 1, r, ry, w, 1);
          ctx.globalAlpha = 0.9 * a;
          ctx.fillStyle = p.c;
          ringPx(ctx, x, y, r, ry, w, w > 2 ? 2 : 1);
          ctx.fillStyle = shade(p.c, 0.35);
          ringPx(ctx, x, y - 1, r - 1, ry - 0.5, 1, 1, Math.PI + 0.3, TAU - 0.3);
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
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = shade(gc, -0.35);
      const cl = Math.min(len, 60);
      ctx.fillRect(e.dir > 0 ? x - cl - 8 : x + 8, y + 1, cl, 1);
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
    const B = bladeSprite(e.c, 18, 7, e.dir > 0 ? 0 : 8, 1.25);
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
    const rp = ramp(gc);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, gc, rx, 0.22 * env, 0.34);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.7 * env;
    ctx.fillStyle = rp[4];
    ringPx(ctx, x, y + 1, rx, ry, 2, 1);
    ctx.globalAlpha = 0.9 * env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, 1);
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y, rx - 1, ry - 0.5, 1, 1, 0.3, Math.PI - 0.3);
    const rot = e.t * 3;
    for (let k = 0; k < 8; k++) {
      const a0 = rot + (k * TAU) / 8;
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, rx * 0.7, ry * 0.7, 1, 1, a0, a0 + 0.35);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, rx * 0.7, ry * 0.7, 1, 1, a0, a0 + 0.35);
    }
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
      ctx.globalAlpha = 0.3 * env;
      ctx.fillStyle = rp[2];
      ctx.fillRect(R0(x0 + sway(p) - r), R0(y0 - p * H), R0(r * 2), step);
      ctx.globalAlpha = 0.55 * env;
      ctx.fillStyle = rp[5];
      ctx.fillRect(R0(x0 + sway(p) - r - 1), R0(y0 - p * H), 1, step);
      ctx.fillRect(R0(x0 + sway(p) + r), R0(y0 - p * H), 1, step);
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
          ctx.fillStyle = u < 0.12 ? '#ffffff' : u < 0.35 ? rp[1] : u < 0.7 ? rp[2] : rp[3];
          ctx.fillRect(px, py - 1, 2, 2);
          if (u > 0.5) {
            ctx.fillStyle = rp[4];
            ctx.fillRect(px, py + 1, 2, 1);
          }
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
    ctx.globalAlpha = 0.45 * env;
    ctx.drawImage(beamSprite(gc, 24, 72, false), x - (bw >> 1), y - 70, bw, 72);
    drawGlow(ctx, x, y - 12, gc, 16, 0.35 * env);
    for (let k = 0; k < 3; k++) {
      const p = (e.t * 1.4 + k / 3) % 1;
      const r = 5 + p * 20;
      ctx.globalAlpha = env * (1 - p) * 0.9;
      ctx.fillStyle = k === 0 ? '#ffffff' : gc;
      ringPx(ctx, x, y, r, r * 0.3, 1, 1);
    }
    // vòng phù văn
    ctx.globalCompositeOperation = 'source-over';
    const rp = ramp(gc);
    const rot = e.t * 4;
    ctx.globalAlpha = 0.85 * env;
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, 13, 4, 1, 1, rot + (k * TAU) / 6, rot + (k * TAU) / 6 + 0.5);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, 13, 4, 1, 1, rot + (k * TAU) / 6, rot + (k * TAU) / 6 + 0.5);
    }
    // lưỡi hào quang hai bên thân
    const T = this.time;
    for (let k = 0; k < 8; k++) {
      const side = k < 4 ? -1 : 1;
      const dx = side * (7 + (k % 4) * 2);
      const h = R0((20 - (k % 4) * 4) * env * (0.65 + 0.35 * Math.sin(T * 17 + k * 2.1)));
      for (let j = 0; j < h; j++) {
        const u = j / Math.max(1, h);
        ctx.globalAlpha = 0.75 * env * (1 - u * 0.6);
        ctx.fillStyle = u > 0.75 ? rp[1] : u > 0.35 ? rp[2] : rp[3];
        const sw = R0(Math.sin(T * 9 + k + j * 0.3) * u * 1.5);
        ctx.fillRect(x + dx + sw, y - 2 - j, u > 0.6 ? 1 : 2, 1);
      }
    }
  }

  d_heal(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.12 ? f / 0.12 : f > 0.65 ? (1 - f) / 0.35 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * env;
    ctx.drawImage(beamSprite(e.c, 20, 60, false), x - 10, y - 58);
    drawGlow(ctx, x, y - 1, e.c, 20, 0.45 * env, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    const r = 15 + 3 * easeOut(clamp01(f * 3));
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = shade(e.c, -0.55);
    ringPx(ctx, x, y + 1, r, r * 0.32, 2, 1);
    ctx.globalAlpha = 0.95 * env;
    ctx.fillStyle = e.c;
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
      ctx.globalAlpha = fade * (0.18 + u * 0.45);
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
      const len = R0(l.len * (1 - f * 0.5));
      ctx.fillStyle = shade(e.c, -0.45);
      ctx.fillRect(e.dir > 0 ? px - len : px, y + R0(l.y) + 1, len, 1);
      ctx.fillStyle = l.c;
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
    const cy = y - 14;
    // cột sáng vàng + lõi trắng
    ctx.globalCompositeOperation = 'lighter';
    const bw = R0(28 * (0.7 + 0.3 * env) + Math.sin(e.t * 18) * 2);
    bodyBeam(ctx, beamSprite('#ffd54f', 32, 130), x, y, bw, 0.65 * env, 0.4);
    bodyBeam(ctx, beamSprite('#ffffff', 10, 130), x, y, 8, 0.55 * env, 0.15);
    drawGlow(ctx, x, cy, '#ffe082', 20, 0.16 * env);
    drawGlow(ctx, x, y, '#ffd54f', 30, 0.3 * env, 0.32);
    for (let k = 0; k < 2; k++) {
      const p = (e.t * 1.1 + k / 2) % 1;
      const r = 8 + p * 34;
      ctx.globalAlpha = env * (1 - p);
      ctx.fillStyle = k === 0 ? '#ffffff' : '#ffd54f';
      ringPx(ctx, x, y, r, r * 0.3, 2, 1);
    }
    // vòng phù văn dưới chân + vòng phù văn bay lên quanh thân
    const grow = easeOut3(clamp01(e.t / 0.3));
    this.runeRing(ctx, x, y, 24 * grow, 8 * grow, e.t * 2.2, 8, '#ffd54f', env, true);
    const up = easeOut(clamp01(e.t / 1.1));
    this.runeRing(ctx, x, R0(y - 4 - up * 34), 15, 5, -e.t * 3.4, 6, '#fff59d', env * (1 - up * 0.5), false);
  }

  // Vòng phù văn (elip dẹt), chữ phía sau mờ hơn để tạo chiều sâu
  runeRing(ctx, x, y, rx, ry, rot, n, c, a, line) {
    if (a <= 0.01 || rx < 2) return;
    const rp = ramp(c);
    ctx.globalCompositeOperation = 'source-over';
    if (line) {
      ctx.globalAlpha = 0.7 * a;
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, rx, ry, 2, 1);
      ctx.globalAlpha = 0.9 * a;
      ctx.fillStyle = rp[2];
      ringPx(ctx, x, y, rx, ry, 2, 1);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, rx * 0.72, ry * 0.72, 1, 1);
    }
    for (let k = 0; k < n; k++) {
      const ang = rot + (k * TAU) / n;
      const sn = Math.sin(ang);
      const gx = R0(x + Math.cos(ang) * rx);
      const gy = R0(y + sn * ry);
      if (sn > 0) {
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, gx, gy, c, 6, 0.35 * a);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = a * (sn > 0 ? 1 : 0.45);
      ctx.drawImage(runeSprite(c, k), gx - 3, gy - 3);
    }
  }

  // ================= CẢNH BÁO & CHIÊU BOSS =================
  d_tele(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const rp = ramp(e.c);
    // sau thời gian cảnh báo: chớp trắng rồi tắt
    if (e.t > e.dur) {
      const q = 1 - (e.t - e.dur) / (e.life - e.dur);
      ctx.globalAlpha = 0.55 * q;
      ctx.fillStyle = '#ffffff';
      if (e.kind === 'line') {
        const x0 = e.dir > 0 ? x : x - e.len;
        ctx.fillRect(x0, y - e.h, R0(e.len), e.h * 2 + 1);
      } else fillEllipse(ctx, x, y, e.r, Math.max(4, e.r * 0.34));
      return;
    }
    const f = e.t / e.dur;
    const env = clamp01(e.t / 0.12);
    // nhịp đập 3Hz -> 9Hz (pha = tích phân tần số), đổi độ sáng mượt chứ không bật/tắt
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (3 * e.t + (3 * e.t * e.t) / e.dur));
    const hot = env * pulse * (0.35 + 0.55 * f);
    if (e.kind === 'line') {
      const L = R0(e.len);
      const H = e.h;
      const x0 = e.dir > 0 ? x : x - L;
      ctx.globalCompositeOperation = 'lighter';
      if (H <= 15) drawGlow(ctx, x0 + (L >> 1), y, e.c, H * 2, 0.2 * env * (0.6 + 0.4 * f), 1, L / (H * 4));
      ctx.globalCompositeOperation = 'source-over';
      // viền tối ngoài cùng để đọc được trên mọi nền
      ctx.globalAlpha = 0.8 * env;
      ctx.fillStyle = SPRITE_OUTLINE;
      ctx.fillRect(x0 - 1, y - H - 1, L + 2, 1);
      ctx.fillRect(x0 - 1, y + H + 1, L + 2, 1);
      ctx.fillRect(x0 - 1, y - H, 1, H * 2 + 1);
      ctx.fillRect(x0 + L, y - H, 1, H * 2 + 1);
      ctx.globalAlpha = 0.34 * env;
      ctx.fillStyle = rp[4];
      ctx.fillRect(x0, y - H, L, H * 2 + 1);
      const fl = R0(L * f);
      ctx.globalAlpha = 0.58 * env;
      ctx.fillStyle = rp[3];
      ctx.fillRect(e.dir > 0 ? x : x - fl, y - H, fl, H * 2 + 1);
      ctx.globalAlpha = 0.95 * env;
      ctx.fillStyle = rp[1];
      ctx.fillRect(x + e.dir * fl - (e.dir > 0 ? 1 : 0), y - H, 1, H * 2 + 1);
      // viền màu + lớp trắng đập theo nhịp
      ctx.globalAlpha = env;
      ctx.fillStyle = rp[2];
      ctx.fillRect(x0, y - H, L, 1);
      ctx.fillRect(x0, y + H, L, 1);
      ctx.fillRect(x0, y - H, 1, H * 2 + 1);
      ctx.fillRect(x0 + L - 1, y - H, 1, H * 2 + 1);
      ctx.globalAlpha = hot;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y - H, L, 1);
      ctx.fillRect(x0, y + H, L, 1);
      // mũi tên ">" chạy theo hướng đánh, cao theo bề dày dải
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.75 * env;
      const ah = Math.max(2, Math.min(H - 2, 6));
      const gap = 10 + ah * 2;
      const off = (e.t * 46) % gap;
      for (let s = off; s < L - ah - 1; s += gap) {
        const cx = R0(e.dir > 0 ? x0 + s : x0 + L - s);
        for (let j = -ah; j <= ah; j++) ctx.fillRect(cx - e.dir * Math.abs(j), y + j, 2, 1);
      }
      return;
    }
    const rx = e.r;
    const ry = Math.max(4, rx * 0.34);
    if (e.kind === 'pillar') {
      // cột báo trước chỗ trụ giáng xuống: lớp màu thường + lớp sáng, hai mép tối
      const bw = Math.max(6, R0(rx * 1.4));
      const top = y - 170;
      ctx.globalAlpha = (0.3 + 0.35 * f) * env;
      ctx.drawImage(beamSprite(rp[3], 24, 120, false), x - (bw >> 1), top, bw, 172);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.1 + 0.22 * f) * env * (0.75 + 0.25 * pulse);
      ctx.drawImage(beamSprite(e.c, 24, 120, false), x - (bw >> 1), top, bw, 172);
      ctx.globalCompositeOperation = 'source-over';
      const ex = [x - (bw >> 1) - 1, x + (bw >> 1)];
      for (let s = 0; s < 5; s++) {
        const a = (1 - s / 5) * env;
        ctx.globalAlpha = 0.55 * a;
        ctx.fillStyle = SPRITE_OUTLINE;
        ctx.fillRect(ex[0], y - 20 * (s + 1), 1, 20);
        ctx.fillRect(ex[1], y - 20 * (s + 1), 1, 20);
        ctx.globalAlpha = 0.8 * a;
        ctx.fillStyle = rp[2];
        ctx.fillRect(ex[0] + 1, y - 20 * (s + 1), 1, 20);
        ctx.fillRect(ex[1] - 1, y - 20 * (s + 1), 1, 20);
      }
    }
    if (rx <= 60) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, x, y, e.c, rx, 0.18 * env * (0.6 + 0.4 * f), 0.34);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 0.34 * env;
    ctx.fillStyle = rp[4];
    fillEllipse(ctx, x, y, rx, ry);
    const fr = rx * f;
    if (fr > 1) {
      ctx.globalAlpha = 0.55 * env;
      ctx.fillStyle = rp[3];
      fillEllipse(ctx, x, y, fr, fr * (ry / rx));
      ctx.globalAlpha = 0.95 * env;
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, fr, fr * (ry / rx), 1, 1);
    }
    // viền tối ngoài cùng + bóng dưới
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = SPRITE_OUTLINE;
    ringPx(ctx, x, y, rx + 2, ry + 1, 1, 1);
    ctx.fillStyle = rp[5];
    ringPx(ctx, x, y + 1, rx, ry, 2, 1);
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, 1);
    ctx.globalAlpha = hot;
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y, rx, ry, 2, 1);
    // vạch đứt quay chậm bên ngoài
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = rp[3];
    const rot = e.t * 1.5;
    const seg = Math.min(0.28, 14 / rx);
    for (let k = 0; k < 10; k++) {
      const a0 = rot + (k * TAU) / 10;
      ringPx(ctx, x, y, rx + 5, ry + 2.5, 2, 1, a0, a0 + seg);
    }
  }

  // Lượt vẽ trên cùng (sau hạt): dấu "!" luôn hiện, chỉ nảy nhanh dần
  o_tele(ctx, e, camX, camY) {
    if (e.t > e.dur) return;
    const f = e.t / e.dur;
    const bx = e.kind === 'line' ? e.x + e.dir * 8 : e.x;
    const x = R0(bx - camX);
    const y = R0(e.y - camY);
    const hop = R0(Math.abs(Math.sin(e.t * (6 + 8 * f))) * (2 + 2 * f));
    // cam đỏ để không nhầm với dấu "!" vàng nhiệm vụ trên đầu NPC
    const bg = bangSprite('#ff6d3a');
    ctx.globalAlpha = clamp01(e.t / 0.12);
    ctx.drawImage(bg, x - 2, y - 13 - hop);
  }

  d_quake(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = e.x - camX;
    const y = e.y - camY;
    const rv = easeOut3(clamp01(e.t / 0.22));
    const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
    const glowA = (f < 0.5 ? 1 : (1 - f) / 0.5) * (0.75 + 0.25 * Math.sin(e.t * 40));
    const rp = flameRamp(e.c, 'fire');
    // hố lún tối ở tâm
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = SPRITE_OUTLINE;
    fillEllipse(ctx, R0(x), R0(y), 14 * e.sc, 3 * e.sc);
    for (const pts of e.cracks) {
      const n = pts.length >> 1;
      const lim = (n - 1) * rv;
      for (let i = 0; i < n - 1 && i < lim; i++) {
        const u = Math.min(1, lim - i);
        const ax = x + pts[i * 2];
        const ay = y + pts[i * 2 + 1];
        const bx = ax + (pts[i * 2 + 2] - pts[i * 2]) * u;
        const by = ay + (pts[i * 2 + 3] - pts[i * 2 + 1]) * u;
        const thick = i < n * 0.5 ? 2 : 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = SPRITE_OUTLINE;
        linePx(ctx, ax, ay, bx, by, thick + 1);
        if (i < n * 0.7) {
          // lõi dung nham trong khe nứt
          ctx.globalAlpha = glowA;
          ctx.fillStyle = i < n * 0.3 ? rp[1] : rp[2];
          linePx(ctx, ax, ay, bx, by, 1);
        }
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, R0(x), R0(y), e.c, Math.min(44, e.R * 0.6), 0.3 * glowA, 0.3);
  }

  d_roar(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const hy = R0(e.hy - camY);
    const rp = ramp(e.c);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, hy, e.c, 14 * Math.min(2, e.sc), 0.4 * (1 - e.t / e.life));
    // cung sóng không cắm xuống đất: chiều cao cung (0.64*ry) < khoảng đầu-chân
    const ryMax = (e.y - e.hy) / 0.66;
    // sóng âm hai bên dạng "((( )))"
    for (let k = 0; k < 4; k++) {
      const lt = (e.t - k * 0.09) / 0.5;
      if (lt <= 0 || lt >= 1) continue;
      const r = 8 + easeOut(lt) * e.R;
      const ry = Math.min(r * 0.75, ryMax);
      const a = 1 - lt;
      for (const side of [0, Math.PI]) {
        ctx.globalCompositeOperation = 'source-over';
        const th = lt < 0.5 ? 3 : 2;
        ctx.globalAlpha = 0.75 * a;
        ctx.fillStyle = rp[4];
        ringPx(ctx, x + 1, hy + 1, r, ry, th, th, side - 0.7, side + 0.7);
        ctx.globalAlpha = a;
        ctx.fillStyle = k % 2 ? rp[3] : '#ffffff';
        ringPx(ctx, x, hy, r, ry, th, th, side - 0.7, side + 0.7);
        ctx.fillStyle = k % 2 ? '#ffffff' : rp[2];
        ringPx(ctx, x, hy, r - th, ry - th, 1, 1, side - 0.45, side + 0.45);
      }
    }
  }

  d_summon(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const env = f > 0.72 ? (1 - f) / 0.28 : 1;
    const grow = easeOut3(clamp01(e.t / 0.25));
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const R = e.R * (0.3 + 0.7 * grow);
    const ry = R * 0.34;
    const rp = ramp(e.c);
    // cột triệu hồi: lớp màu thường để giữ sắc tím trên nền sáng, thêm lớp sáng cộng
    const bw = R0(R * 1.3);
    const pul = 0.7 + 0.3 * Math.sin(e.t * 16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.42 * env;
    ctx.drawImage(beamSprite(rp[4], 24, 100, false), x - (bw >> 1), y - 96, bw, 98);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, e.c, Math.min(60, R * 1.1), 0.3 * env, 0.34);
    ctx.globalAlpha = 0.22 * env * pul;
    ctx.drawImage(beamSprite(e.c, 24, 100, false), x - (bw >> 1), y - 96, bw, 98);
    ctx.globalCompositeOperation = 'source-over';
    // nền vòng tối + viền ngoài #1d1424
    ctx.globalAlpha = 0.35 * env;
    ctx.fillStyle = e.dark;
    fillEllipse(ctx, x, y, R, ry);
    ctx.globalAlpha = 0.75 * env;
    ctx.fillStyle = SPRITE_OUTLINE;
    ringPx(ctx, x, y, R + 2, ry + 1, 1, 1);
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = rp[5];
    ringPx(ctx, x, y + 1, R, ry, 2, 1);
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, R, ry, 2, 1);
    ctx.fillStyle = rp[1];
    ringPx(ctx, x, y, R * 0.74, ry * 0.74, 1, 1);
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, R * 0.4, ry * 0.4, 1, 1);
    // vạch tỏa tròn quay giữa hai vòng trong (đọc rõ ở góc nhìn dẹt, khác ngôi sao)
    const rot = e.t * 1.8;
    for (let k = 0; k < 12; k++) {
      const a = rot + (k * TAU) / 12;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const long = k % 3 === 0;
      const r0 = long ? 0.42 : 0.5;
      const r1 = long ? 0.98 : 0.72;
      ctx.globalAlpha = env * (s > 0 ? 1 : 0.55);
      ctx.fillStyle = long ? '#ffffff' : rp[1];
      linePx(ctx, x + c * R * r0, y + s * ry * r0, x + c * R * r1, y + s * ry * r1);
    }
    // tâm: hình thoi sáng nhấp nháy nhẹ
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[4];
    ctx.fillRect(x - 3, y, 7, 1);
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = pul > 0.85 ? '#ffffff' : rp[1];
    ctx.fillRect(x - 2, y - 1, 5, 1);
    ctx.fillRect(x, y - 2, 1, 3);
    this.runeRing(ctx, x, y, R + 7, ry + 2.5, -e.t * 1.2, 8, e.c, env * grow, false);
  }

  d_beam(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const gc = glowCol(e.c, elemOf(e.c));
    const top = -20;
    const H = Math.max(10, y - top);
    // nở nhanh rồi thu nhỏ dần
    const wk = f < 0.08 ? f / 0.08 : 1 - (f - 0.08) * 0.95;
    const bw = Math.max(2, R0(26 * e.sc * wk + Math.sin(e.t * 50) * 2));
    const a = f > 0.5 ? (1 - f) / 0.5 : 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = SPRITE_OUTLINE;
    fillEllipse(ctx, x, y, 16 * e.sc, 4 * e.sc);
    const brp = ramp(gc);
    // lớp màu phủ thường để tia không bị trắng xóa trên nền sáng
    ctx.globalAlpha = 0.55 * a;
    ctx.drawImage(beamSprite(brp[3], 34, 120, false), x - (bw >> 1), top, bw, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 * a;
    ctx.drawImage(beamSprite(gc, 34, 120), x - (bw >> 1), top, bw, H);
    const cw = Math.max(2, R0(bw * 0.38));
    ctx.globalAlpha = 0.9 * a;
    ctx.drawImage(beamSprite('#ffffff', 10, 120), x - (cw >> 1), top, cw, H);
    // mép tia nhấp nháy
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * a * (Math.sin(e.t * 60) > 0 ? 1 : 0.6);
    ctx.fillStyle = brp[4];
    ctx.fillRect(x - (bw >> 1) - 1, top, 1, H);
    ctx.fillRect(x + (bw >> 1), top, 1, H);
    ctx.fillStyle = brp[2];
    ctx.fillRect(x - (bw >> 1), top, 1, H);
    ctx.fillRect(x + (bw >> 1) - 1, top, 1, H);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 4, gc, Math.min(44, 22 * e.sc), 0.55 * a, 0.5);
    drawGlow(ctx, x, y - 2, '#ffffff', Math.min(16, 8 * e.sc), 0.6 * a, 0.6);
  }

  d_nova(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const cy = R0(e.cy - camY);
    const fade = f > 0.55 ? (1 - f) / 0.45 : 1;
    const rp = ramp(glowCol(e.c, e.el));
    const rx = e.R * easeOut3(clamp01(f / 0.6));
    ctx.globalCompositeOperation = 'lighter';
    // quầng sáng giới hạn ở cỡ sprite lớn nhất, không kéo giãn thành bậc thang
    drawGlow(ctx, x, y, rp[2], Math.min(60, rx), 0.3 * fade, 0.34);
    if (f < 0.3) drawGlow(ctx, x, cy, '#ffffff', 22 * e.g * (1 - f / 0.3) + 6, (0.7 - 0.15 * (e.g - 1)) * (1 - f / 0.3));
    this.shockRing(ctx, x, y, rx, rx * 0.34, rp, fade, true);
    // vòng cầu nổ trên không (giới hạn để không tràn khỏi màn hình)
    const rs = Math.min(62 * e.g, 50 + 15 * e.g) * easeOut3(clamp01(f / 0.45));
    if (rs > 3 && f < 0.7) {
      const a = 1 - f / 0.7;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.6 * a;
      ctx.fillStyle = rp[5];
      ringPx(ctx, x + 1, cy + 1, rs, rs * 0.8, 2, 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, cy, rs, rs * 0.8, 2, 2);
      // tia tỏa ra
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 12; k++) {
        const an = (k * TAU) / 12 + 0.13;
        const c = Math.cos(an);
        const s = Math.sin(an) * 0.8;
        linePx(ctx, x + c * rs * 0.55, cy + s * rs * 0.55, x + c * rs * 0.85, cy + s * rs * 0.85);
      }
    }
  }

  // ================= CƯỜNG HÓA / KHẢM NGỌC / THỜI TRANG =================
  d_enh(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    if (e.ok) {
      const env = f < 0.1 ? f / 0.1 : f > 0.55 ? (1 - f) / 0.45 : 1;
      ctx.globalCompositeOperation = 'lighter';
      const bw = Math.max(2, R0(18 * env + Math.sin(e.t * 20) * 2));
      bodyBeam(ctx, beamSprite(e.c, 24, 80), x, y, bw, 0.6 * env, 0.4);
      bodyBeam(ctx, beamSprite('#ffffff', 8, 80), x, y, 6, 0.5 * env, 0.15);
      drawGlow(ctx, x, y - 14, e.c, 16, 0.16 * env);
      const p = (e.t * 1.6) % 1;
      ctx.globalAlpha = env * (1 - p);
      ctx.fillStyle = '#ffffff';
      ringPx(ctx, x, y, 6 + p * 24, (6 + p * 24) * 0.3, 2, 1);
      const grow = easeOut3(clamp01(e.t / 0.25));
      this.runeRing(ctx, x, y, 17 * grow, 6 * grow, e.t * 3, 6, e.c, env, true);
      return;
    }
    // thất bại: vòng phù văn vỡ thành mảnh rơi xuống
    const a = 1 - f;
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 6; k++) {
      const a0 = (k * TAU) / 6 + 0.2;
      const out = 1 + f * 0.6;
      const dy = R0(f * f * 14);
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = '#37474f';
      ringPx(ctx, x, y + 1 + dy, 16 * out, 5.5 * out, 2, 1, a0, a0 + 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = k % 2 ? '#90a4ae' : '#b0bec5';
      ringPx(ctx, x, y + dy, 16 * out, 5.5 * out, 2, 1, a0, a0 + 0.7);
    }
  }

  // Lượt vẽ trên cùng: dấu X đỏ khi cường hóa thất bại (không bị khói/đá che)
  o_enh(ctx, e, camX, camY) {
    if (e.ok) return;
    const f = e.t / e.life;
    if (f > 0.5) return;
    const x = R0(e.x - camX);
    const cy = R0(e.y - camY) - 16;
    // bật to rồi thu về, mờ dần ở nửa sau
    const g = R0(f < 0.08 ? 4 + f * 50 : 7);
    ctx.globalAlpha = f < 0.3 ? 1 : 1 - (f - 0.3) / 0.2;
    ctx.fillStyle = SPRITE_OUTLINE;
    for (let o = -1; o <= 1; o += 2) {
      linePx(ctx, x - g + o, cy - g, x + g + o, cy + g, 2);
      linePx(ctx, x - g + o, cy + g, x + g + o, cy - g, 2);
      linePx(ctx, x - g, cy - g + o, x + g, cy + g + o, 2);
      linePx(ctx, x - g, cy + g + o, x + g, cy - g + o, 2);
    }
    ctx.fillStyle = '#ff5252';
    linePx(ctx, x - g, cy - g, x + g, cy + g, 2);
    linePx(ctx, x - g, cy + g, x + g, cy - g, 2);
    ctx.fillStyle = '#ffab91';
    linePx(ctx, x - g, cy - g, x - 1, cy - 1, 1);
    linePx(ctx, x + 1, cy - 1, x + g, cy - g, 1);
  }

  d_gem(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    if (e.t < 0.28) {
      // 4 tia hội tụ vào ô khảm
      const p = e.t / 0.28;
      const r = 18 * (1 - easeOut(p)) + 1;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const a = (k * TAU) / 4 + p * 2.2;
        const px = R0(x + Math.cos(a) * r);
        const py = R0(y + Math.sin(a) * r);
        ctx.globalAlpha = 0.5 + p * 0.5;
        ctx.fillStyle = e.lite;
        ctx.fillRect(px - 2, py, 5, 1);
        ctx.fillRect(px, py - 2, 1, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 1, 1);
      }
      drawGlow(ctx, x, y, e.c, 4 + p * 6, 0.5 * p);
      return;
    }
    // hình thoi nở ra sau khi khảm
    const q = (e.t - 0.28) / (e.life - 0.28);
    const r = 3 + easeOut3(q) * 14;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * (1 - q);
    ctx.fillStyle = e.dark;
    linePx(ctx, x - r, y + 1, x, y - r + 1);
    linePx(ctx, x, y - r + 1, x + r, y + 1);
    linePx(ctx, x + r, y + 1, x, y + r + 1);
    linePx(ctx, x, y + r + 1, x - r, y + 1);
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = q < 0.3 ? '#ffffff' : e.lite;
    linePx(ctx, x - r, y, x, y - r);
    linePx(ctx, x, y - r, x + r, y);
    linePx(ctx, x + r, y, x, y + r);
    linePx(ctx, x, y + r, x - r, y);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, e.c, 10 * (1 - q) + 2, 0.5 * (1 - q));
  }

  d_cost(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = e.x - camX;
    const y = e.y - camY;
    const env = f > 0.7 ? (1 - f) / 0.3 : 1;
    const head = easeOut(clamp01(f / 0.7)) * 1.25;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, R0(x), R0(y - 16), e.c, 18, 0.3 * env);
    ctx.globalCompositeOperation = 'source-over';
    // hai dải xoắn bay lên quanh thân: vẽ viền tối trước rồi tới màu để dải nổi trên mọi nền
    const N = 18;
    for (let pass = 0; pass < 2; pass++) {
      for (let s = 0; s < 2; s++) {
        for (let j = N - 1; j >= 0; j--) {
          const h = head - j * 0.03;
          if (h < 0 || h > 1) continue;
          const a = e.t * 6 + h * 8 + s * Math.PI;
          const sn = Math.sin(a);
          const front = sn > 0;
          const px = R0(x + Math.cos(a) * 14);
          const py = R0(y - 2 - h * 34 + sn * 3);
          const sz = j < 2 ? 3 : j < 9 ? 2 : 1;
          const fade = env * (1 - j / N);
          if (pass === 0) {
            if (!front) continue;
            ctx.globalAlpha = 0.85 * fade;
            ctx.fillStyle = SPRITE_OUTLINE;
            ctx.fillRect(px - 1, py - 1, sz + 2, sz + 2);
          } else {
            ctx.globalAlpha = fade * (front ? 1 : 0.5);
            ctx.fillStyle = j < 2 ? '#ffffff' : j < 6 ? e.lite : j < 12 ? e.c : e.mid;
            ctx.fillRect(px, py, sz, sz);
          }
        }
      }
    }
  }

  // ================= CHỮ (canvas phân giải cao) =================
  renderText(t, scale) {
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
    g.strokeStyle = '#1a1020';
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
    t.cs = scale;
    t.nofont = !this.fontOK;
  }

  drawTexts(ctx, toScreen, scale) {
    if (!this.fontOK && this.texts.length) this.fontOK = !document.fonts || document.fonts.check('16px VT323');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const t of this.texts) {
      if (!t.cv || t.cs !== scale || (t.nofont && this.fontOK)) this.renderText(t, scale);
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
