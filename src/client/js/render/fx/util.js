// Tiện ích hiệu ứng: hằng số, số ngẫu nhiên, màu theo hệ, canvas offscreen, quầng sáng cache.
import { shade } from '../sprites.js';

export const TAU = Math.PI * 2;
export const MAX_PARTS = 900;
export const MAX_TEXTS = 70;
export const OUTLINE = '#1a1020';
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[(Math.random() * a.length) | 0];
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOut = (v) => 1 - (1 - v) * (1 - v);
export const easeOut3 = (v) => 1 - (1 - v) * (1 - v) * (1 - v);
export const R0 = Math.round;

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

// ================= MÀU =================
const rgbCache = new Map();
export function rgb(col) {
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
export function elemOf(c, p) {
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

export const EP = {
  fire: { glow: '#ff8a3c', spark: ['#fff59d', '#ffd54f', '#ffb74d', '#ff7043'], smoke: ['#4a3833', '#3b2e2b', '#5a4842'] },
  water: { glow: '#40c4ff', spark: ['#ffffff', '#b3e5fc', '#4fc3f7'], drop: ['#e1f5fe', '#81d4fa', '#4fc3f7', '#29b6f6'] },
  ice: { glow: '#80d8ff', spark: ['#ffffff', '#e1f5fe', '#b3e5fc'], drop: ['#ffffff', '#e1f5fe', '#b3e5fc'] },
  wind: { glow: '#b2ff59', spark: ['#ffffff', '#f1f8e9', '#ccff90'], leaf: ['#7cb342', '#9ccc65', '#aed581', '#558b2f', '#c5e1a5'] },
  neutral: { glow: '#ffffff', spark: ['#ffffff', '#fffde7', '#e3f2fd'] },
};

const rampCache = new Map();
// [trắng, rất sáng, sáng, màu gốc, tối, rất tối]
export function ramp(c) {
  let r = rampCache.get(c);
  if (r) return r;
  const { l } = hsl(c);
  if (l > 0.9) r = ['#ffffff', '#ffffff', c, shade(c, -0.12), '#9fb8d8', '#5a6f8f'];
  else r = ['#ffffff', shade(c, 0.65), shade(c, 0.35), c, shade(c, -0.3), shade(c, -0.55)];
  rampCache.set(c, r);
  return r;
}

const flameCache = new Map();
export function flameRamp(c, el) {
  const key = `${c}|${el}`;
  let r = flameCache.get(key);
  if (r) return r;
  if (el === 'fire') r = ['#fffde7', '#fff176', '#ffca28', c, shade(c, -0.35), '#5a2418'];
  else r = ['#ffffff', shade(c, 0.6), shade(c, 0.3), c, shade(c, -0.35), shade(c, -0.65)];
  flameCache.set(key, r);
  return r;
}

export function glowCol(c, el) {
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
export function drawGlow(ctx, x, y, col, r, a, sy = 1, sx = 1) {
  if (a <= 0.01 || r < 0.5) return;
  ctx.globalAlpha = Math.min(1, a);
  const w = r * 2 * sx;
  const h = r * 2 * sy;
  ctx.drawImage(glowSprite(col, pickR(r)), R0(x - w / 2), R0(y - h / 2), R0(w), R0(h));
}
