// Màu nhân vật: bảng màu theo phái/bậc trang bị, tóc, mắt, da; đổi sáng tối (shade) và băm khóa.

export const ELEMENT_COLORS = { fire: '#ff7043', water: '#42a5f5', wind: '#7ccd5a' };
// Chiều cao nhân vật (từ lòng bàn chân tới đỉnh tóc), dùng cho nhãn tên / hitbox
export const NINJA_H = 28;

export const CLASS_OUTFIT = { kiem: '#a8383c', tieu: '#b8682c', kunai: '#2e5fa3', cung: '#22808c', dao: '#3d8a40', quat: '#7d8a24' };
// 20 bậc: Gỗ, Đồng, Sắt, Bạc, Vàng, Ngọc, Huyền, Long, Thiên, Thần, Tiên, Thánh, Phượng, Kỳ Lân, Nhật Nguyệt, Tinh Hà, Hỗn Nguyên, Thái Cực, Vô Cực, Chí Tôn
export const TIER_OUTFIT = ['#7a5a3c', '#9a5a2e', '#55606e', '#6f8094', '#b48a1c', '#1f9070', '#5e40b8', '#b02a24', '#2a80c8', '#b850b4', '#d8b23a', '#c2185b',
  '#c8431c', '#4f8a2a', '#3a4f8c', '#26246e', '#127a78', '#e8e4dc', '#4a1e7a', '#7a1420'];
export const TIER_METAL = ['#a0703c', '#c9803c', '#9aa4ad', '#dfe6ec', '#f2c230', '#3fd0a0', '#8a63e8', '#e8463c', '#5cc4ff', '#ff7ef0', '#fff176', '#ff4081',
  '#ff7a2e', '#b6f05a', '#a8c4ff', '#4a6cff', '#38e8e0', '#f4f4f4', '#c86bff', '#ffd700'];
export const TIER_TRIM = ['#e8dcc0', '#f0d8b0', '#d0d8e0', '#f4f8fc', '#ffe27a', '#f2c230', '#f2c230', '#ffd54a', '#e0f6ff', '#ffe46a', '#ffffff', '#ffd6e8',
  '#ffd27a', '#f0ffd0', '#ffffff', '#c8d4ff', '#e0fffc', '#2a2433', '#ffd6ff', '#ffd700'];
export const HAIR = ['#2a2433', '#4a2c20', '#7a4628', '#273760', '#7c2a34', '#d8d4dc', '#3c2a4a', '#5a3018'];
export const IRIS = ['#3b2a6a', '#1f4f8a', '#5a3218', '#1f6a4a', '#7a2a4a', '#2a2a3a'];
export const SKIN = ['#ffd6b0', '#fcd0a8', '#f6c49a'];

function parseColor(c) {
  if (c[0] === '#') {
    let s = c.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

const shadeCache = new Map();
export function shade(col, f) {
  const key = `${col}|${f}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  let [r, g, b] = parseColor(col);
  if (f < 0) {
    r *= 1 + f; g *= 1 + f; b *= 1 + f;
  } else {
    r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
  }
  const out = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, out);
  return out;
}

export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Băm trộn đều (chọn kiểu tóc, màu tóc… theo tên)
export function mixHash(s) {
  let h = hash(s) ^ 0x5bd1e995;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// ---------- Màu dạng số nguyên 0xRRGGBB
const intCache = new Map();
export function C(c) {
  if (typeof c === 'number') return c;
  if (!c) return 0x808080;
  let v = intCache.get(c);
  if (v === undefined) {
    const [r, g, b] = parseColor(c);
    v = (r << 16) | (g << 8) | b;
    intCache.set(c, v);
  }
  return v;
}
// Đổ bóng lệch sắc: tối ngả tím-xanh, sáng ngả vàng ấm
export function sh(n, f) {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  let tr = 255;
  let tg = 250;
  let tb = 226;
  let k = f;
  if (f < 0) {
    tr = 26; tg = 14; tb = 46; k = -f;
  }
  return (((r + (tr - r) * k) | 0) << 16) | (((g + (tg - g) * k) | 0) << 8) | ((b + (tb - b) * k) | 0);
}
export function mx(a, b, t) {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
  const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
  const bl = (a & 255) * (1 - t) + (b & 255) * t;
  return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}
export function css(n, a = 1) {
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
