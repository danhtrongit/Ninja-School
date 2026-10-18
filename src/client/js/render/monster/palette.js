// Màu cho sprite quái: chuyển đổi RGB/HSL, bảng 3 tông theo ánh sáng (T), màu mắt/má dùng chung.

// ================= MÀU =================
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export function parse(c) {
  if (typeof c !== 'string') return [255, 0, 255];
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s = clamp01(s);
  l = clamp01(l);
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
export const pack = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
function hueTo(h, target, amt) {
  const d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), amt);
}
export function css(c, a = 1) {
  const [r, g, b] = parse(c);
  return `rgba(${r},${g},${b},${a})`;
}
// Điều chỉnh độ sáng màu (dl: -1..1) -> chuỗi hex
export function adj(col, dl) {
  const [r, g, b] = parse(col);
  const [h, s, l] = rgb2hsl(r, g, b);
  const o = hsl2rgb(h, s, l + dl);
  return `#${((1 << 24) | (o[0] << 16) | (o[1] << 8) | o[2]).toString(16).slice(1)}`;
}

// Bộ tông: hi (bóng sáng) / lt (sáng) / md (gốc) / dk (tối) / ol (viền) — đổ bóng ngả lạnh, sáng ngả ấm
const toneCache = new Map();
export function T(col, a = 255) {
  const key = `${col}|${a}`;
  let r = toneCache.get(key);
  if (r) return r;
  const [R, G, B] = parse(col);
  const [h, s, l] = rgb2hsl(R, G, B);
  const grey = s < 0.08;
  const mk = (hh, ss, ll) => hsl2rgb(hh, ss, ll);
  let hi;
  let lt;
  let dk;
  let ol;
  if (l > 0.86) {
    hi = mk(h, s, 1);
    lt = mk(hueTo(h, 55, 6), s, Math.min(1, l + 0.07));
    dk = grey ? mk(218, 0.28, l - 0.2) : mk(hueTo(h, 235, 18), Math.min(1, s + 0.15), l - 0.2);
    ol = grey ? mk(232, 0.3, 0.2) : mk(hueTo(h, 250, 25), Math.min(1, s * 0.7 + 0.2), 0.2);
  } else if (l < 0.2) {
    hi = mk(hueTo(h, 55, 10), s, l + 0.34);
    lt = mk(hueTo(h, 55, 6), s, l + 0.17);
    dk = mk(hueTo(h, 250, 10), s, l * 0.55);
    ol = [10, 6, 16];
  } else {
    hi = mk(hueTo(h, 55, 14), s * 0.92, l + (1 - l) * 0.55);
    lt = mk(hueTo(h, 55, 8), s, l + (1 - l) * 0.27);
    dk = grey ? mk(225, 0.12, l * 0.7) : mk(hueTo(h, 245, 14), Math.min(1, s * 1.08), l * 0.7);
    ol = grey ? mk(240, 0.25, Math.min(0.16, l * 0.3)) : mk(hueTo(h, 255, 24), Math.min(1, s * 0.9), Math.min(0.17, l * 0.32));
  }
  r = { hi: pack(...hi, a), lt: pack(...lt, a), md: pack(R, G, B, a), dk: pack(...dk, a), ol: pack(...ol, a), col };
  toneCache.set(key, r);
  return r;
}
export function mixPx(base, col, a) {
  const ba = base >>> 24;
  if (!ba) return pack(col & 255, (col >>> 8) & 255, (col >>> 16) & 255, Math.round(a * 255));
  const m = (sh) => Math.round(((base >>> sh) & 255) * (1 - a) + ((col >>> sh) & 255) * a);
  return pack(m(0), m(8), m(16), ba);
}

export const EYE = pack(29, 20, 40);
export const EYE2 = pack(92, 78, 140);
export const WHITE = pack(255, 255, 255);
export const BLUSH = pack(255, 120, 160);
export const LIGHT = [-0.45, -0.68, 0.58];
