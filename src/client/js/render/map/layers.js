// Bộ đệm lớp nền theo chủ đề (dùng lại khi đổi bản đồ) và ảnh phản chiếu mặt nước.
import { rng, seedOf, rgbOf, hx, Buf } from './util.js';
import { bMount, bHills, bTreeRow, bMesa, bDunes, bKarst, bCave, bRuins, bStands, bCeiling, bCloudBank, bColonnade, bProps, bWall } from './backdrop.js';

// ======================= Bộ đệm theo chủ đề (dùng lại khi đổi bản đồ) =======================
const LW = 1024;
const LAYER_CACHE = new Map();
function avgRow(b, y) {
  let r = 0;
  let g = 0;
  let bl = 0;
  let n = 0;
  for (let x = 0; x < b.w; x += 3) {
    const v = b.d[y * b.w + x];
    if (v >>> 24 < 255) continue;
    r += v & 255; g += (v >> 8) & 255; bl += (v >> 16) & 255; n++;
  }
  return n ? hx(r / n, g / n, bl / n) : null;
}
export function getLayers(theme, sc) {
  let L = LAYER_CACHE.get(theme);
  if (L) return L;
  const seed = seedOf(theme);
  L = sc.layers.map((spec, i) => {
    const R = rng(seed + i * 101);
    const b = new Buf(spec.w || LW, spec.h, true);
    const fn = { mount: bMount, hills: bHills, trees: bTreeRow, mesa: bMesa, dunes: bDunes, karst: bKarst, cave: bCave, ruins: bRuins, stands: bStands, props: bProps, wall: bWall, clouds: bCloudBank, colonnade: bColonnade }[spec.t];
    if (fn) fn(b, spec, R);
    return { cv: b.canvas, b, w: b.w, h: spec.h, fx: spec.fx, fy: spec.fy, off: spec.off || 0, fill: avgRow(b, spec.h - 1) };
  });
  const wt = sc.water;
  if (wt) for (const i of wt.refl) L[i].refl = makeRefl(L[i].b, wt);
  if (sc.ceil) {
    const b = new Buf(LW, sc.ceil.h, true);
    bCeiling(b, sc.ceil, rng(seed + 999));
    L.ceil = { cv: b.canvas, w: LW, h: sc.ceil.h, fx: sc.ceil.fx, fy: sc.ceil.fy, fill: sc.ceil.pal[1] };
  }
  for (const l of L) l.b = null;
  LAYER_CACHE.set(theme, L);
  return L;
}
// Ảnh phản chiếu trên mặt nước (lật dọc, nhuộm màu nước, gợn sóng)
function makeRefl(src, wt) {
  const W = src.w;
  const H = Math.min(src.h, 120);
  const b = new Buf(W, H, true);
  const wc = rgbOf(wt.col);
  for (let y = 0; y < H; y++) {
    const sy = src.h - 1 - y;
    const shift = Math.round(Math.sin(y * 0.9) * (1 + y * 0.02));
    const k = 0.42 + Math.min(0.4, y * 0.006);
    if (y % 4 === 3) continue;
    for (let x = 0; x < W; x++) {
      const v = src.d[sy * W + (((x + shift) % W) + W) % W];
      if (v >>> 24 < 255) continue;
      const r = (v & 255) * (1 - k) + wc[0] * k;
      const g = ((v >> 8) & 255) * (1 - k) + wc[1] * k;
      const bb = ((v >> 16) & 255) * (1 - k) + wc[2] * k;
      b.d[y * W + x] = ((255 << 24) | (bb << 16) | (g << 8) | r) >>> 0;
    }
  }
  return b.canvas;
}
