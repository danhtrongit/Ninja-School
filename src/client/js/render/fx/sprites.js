// Sprite hiệu ứng vẽ sẵn (cache offscreen): chấm, tia, vệt chém, phi tiêu, băng, thiên thạch, bóng người.
import { shade } from '../sprites.js';
import { TAU, OUTLINE, clamp01, easeOut3, R0, mkCanvas, rgb, ramp, flameRamp } from './util.js';

// Chấm tròn đặc (khói, lõi cầu lửa)
const dotCache = new Map();
export function dotSprite(col, r) {
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
export function beamSprite(col, w, h, core = true) {
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

export function outlineImg(img, w, h, col) {
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
export const SLASH_A0 = -2.15;
export const SLASH_A1 = 0.75;
const slashCache = new Map();
export function slashFrames(c, big) {
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
export function bladeSprite(c, R, T, angIdx, span = 1.2) {
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
export function shurikenFrames(c, R) {
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
export function iceSprite(len, angIdx) {
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
export function meteorSprite(c, el, r) {
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
export function plusSprite(c, big) {
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
export function silhouette(c) {
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
