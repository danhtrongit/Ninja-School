// Sprite quái vật — pixel art tự thiết kế, dựng thủ tục bằng code:
// hình khối (ellipse/đa giác/đường) -> tô 3 tông theo ánh sáng -> viền tối tự động -> chi tiết (mắt, má hồng...).
// Mỗi khung hình được dựng 1 lần rồi cache vào canvas offscreen theo (kiểu, biến thể, khung, bảng màu); nháy trắng cache riêng.
import * as SP from './sprites.js';

// Chiều cao ninja (sprites.js có thể export NINJA_H)
const ninjaH = () => (typeof SP.NINJA_H === 'number' ? SP.NINJA_H : 22);

// ================= MÀU =================
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function parse(c) {
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
function rgb2hsl(r, g, b) {
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
const pack = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
function hueTo(h, target, amt) {
  const d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), amt);
}
function css(c, a = 1) {
  const [r, g, b] = parse(c);
  return `rgba(${r},${g},${b},${a})`;
}
// Điều chỉnh độ sáng màu (dl: -1..1) -> chuỗi hex
function adj(col, dl) {
  const [r, g, b] = parse(col);
  const [h, s, l] = rgb2hsl(r, g, b);
  const o = hsl2rgb(h, s, l + dl);
  return `#${((1 << 24) | (o[0] << 16) | (o[1] << 8) | o[2]).toString(16).slice(1)}`;
}

// Bộ tông: hi (bóng sáng) / lt (sáng) / md (gốc) / dk (tối) / ol (viền) — đổ bóng ngả lạnh, sáng ngả ấm
const toneCache = new Map();
function T(col, a = 255) {
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
function mixPx(base, col, a) {
  const ba = base >>> 24;
  if (!ba) return pack(col & 255, (col >>> 8) & 255, (col >>> 16) & 255, Math.round(a * 255));
  const m = (sh) => Math.round(((base >>> sh) & 255) * (1 - a) + ((col >>> sh) & 255) * a);
  return pack(m(0), m(8), m(16), ba);
}

const EYE = pack(29, 20, 40);
const EYE2 = pack(92, 78, 140);
const WHITE = pack(255, 255, 255);
const BLUSH = pack(255, 120, 160);
const LIGHT = [-0.45, -0.68, 0.58];

// ================= BỘ DỰNG SPRITE =================
class Mask {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.m = new Uint8Array(w * h);
  }
  set(x, y, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.m[y * this.w + x] = v;
  }
  ell(cx, cy, rx, ry, v = 1, ang = 0) {
    const R = Math.max(rx, ry) + 1;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = (dx * ca + dy * sa) / rx;
        const q = (-dx * sa + dy * ca) / ry;
        if (u * u + q * q <= 1) this.set(x, y, v);
      }
    }
    return this;
  }
  rect(x, y, w, h, v = 1) {
    for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) this.set(i, j, v);
    return this;
  }
  poly(p, v = 1) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < p.length; k += 2) {
      x0 = Math.min(x0, p[k]); x1 = Math.max(x1, p[k]);
      y0 = Math.min(y0, p[k + 1]); y1 = Math.max(y1, p[k + 1]);
    }
    const n = p.length / 2;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let a = 0, b = n - 1; a < n; b = a++) {
          const ax = p[a * 2]; const ay = p[a * 2 + 1];
          const bx = p[b * 2]; const by = p[b * 2 + 1];
          if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
        }
        if (inside) this.set(x, y, v);
      }
    }
    return this;
  }
  line(x0, y0, x1, y1, th = 1, v = 1) {
    const r = th / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
      for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
        const px = x + 0.5 - x0;
        const py = y + 0.5 - y0;
        const k = Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
        const ex = px - k * dx;
        const ey = py - k * dy;
        if (ex * ex + ey * ey <= r * r + 0.01) this.set(x, y, v);
      }
    }
    return this;
  }
  // Đường gấp khúc qua các điểm
  path(p, th = 1, v = 1) {
    for (let k = 0; k + 3 < p.length; k += 2) this.line(p[k], p[k + 1], p[k + 2], p[k + 3], th, v);
    return this;
  }
  and(o) {
    for (let i = 0; i < this.m.length; i++) if (!o.m[i]) this.m[i] = 0;
    return this;
  }
  rows(a, b) {
    for (let y = 0; y < this.h; y++) if (y < a || y > b) this.m.fill(0, y * this.w, (y + 1) * this.w);
    return this;
  }
}

class Spr {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.c = new Uint32Array(w * h);
    this.p = new Uint16Array(w * h);
    this.parts = [null];
    this.dec = [];
    this.eyes = [];
    this.glow = [];
    this.head = [w / 2, 0];
  }
  M() { return new Mask(this.w, this.h); }
  // Tô 1 mảng. o.sh: 'sph' (khối cầu), 'edge' (viền trên sáng/dưới tối), 'v' (dọc), 'flat', 'facet' (pha lê)
  // o.il: 1 viền tối khi đè lên mảng phía sau, 2 viền mềm, 0 không viền
  fill(mk, tn, o = {}) {
    const id = this.parts.length;
    this.parts.push({ tn, il: o.il === undefined ? 1 : o.il });
    const { w, h } = this;
    const m = mk.m;
    let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!m[y * w + x]) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return id;
    const sh = o.sh || 'sph';
    const cx = o.c ? o.c[0] : (x0 + x1 + 1) / 2;
    const cy = o.c ? o.c[1] : (y0 + y1 + 1) / 2;
    const rx = o.c ? o.c[2] : (x1 - x0 + 1) / 2;
    const ry = o.c ? o.c[3] : (y1 - y0 + 1) / 2;
    const ltT = o.lt ?? 0.6;
    const dkT = o.dk ?? 0.12;
    const hiT = o.hi ?? 9;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        if (!m[i]) continue;
        let col = tn.md;
        if (sh === 'sph') {
          let nx = (x + 0.5 - cx) / rx;
          let ny = (y + 0.5 - cy) / ry;
          let d2 = nx * nx + ny * ny;
          if (d2 > 1) { const k = 1 / Math.sqrt(d2); nx *= k; ny *= k; d2 = 1; }
          const d = nx * LIGHT[0] + ny * LIGHT[1] + Math.sqrt(1 - d2) * LIGHT[2];
          col = d > hiT ? tn.hi : d > ltT ? tn.lt : d < dkT ? tn.dk : tn.md;
        } else if (sh === 'edge') {
          const up = y > 0 && m[i - w];
          const dn = y < h - 1 && m[i + w];
          const lf = x > 0 && m[i - 1];
          col = !up ? tn.lt : !dn ? tn.dk : !lf && o.side ? tn.lt : tn.md;
        } else if (sh === 'v') {
          const f = (y + 0.5 - y0) / (y1 - y0 + 1);
          col = f < (o.vt ?? 0.3) ? tn.lt : f > (o.vb ?? 0.7) ? tn.dk : tn.md;
        } else if (sh === 'fn') {
          col = o.fn(x, y, tn);
        } else if (sh === 'facet') {
          const mid = o.fx ?? cx;
          col = y === y0 ? tn.hi : x + 0.5 < mid - 0.5 ? tn.lt : x + 0.5 < mid + 0.5 ? tn.hi : tn.md;
          if (y === y1 || (x === x1 && y > y0)) col = tn.dk;
        }
        this.c[i] = col;
        this.p[i] = id;
      }
    }
    return id;
  }
  // Chi tiết (không tạo viền)
  px(x, y, col, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.dec.push(y * this.w + x, typeof col === 'string' ? T(col).md : col, a);
  }
  rc(x, y, w, h, col, a = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col, a);
  }
  // Chi tiết theo mặt nạ
  dm(mk, col, a = 1) {
    for (let i = 0; i < mk.m.length; i++) if (mk.m[i]) this.dec.push(i, col, a);
  }
  // Mắt to dễ thương: con ngươi tối + đốm sáng
  eye(x, y, w = 2, h = 3, o = {}) {
    x = Math.round(x);
    y = Math.round(y);
    this.eyes.push([x + w / 2, y + h / 2]);
    if (o.blink) {
      for (let i = 0; i < w; i++) this.px(x + i, y + h - 2, EYE);
      if (w > 2) { this.px(x - 0, y + h - 3, EYE, 0.5); }
      return;
    }
    const pc = o.col ?? EYE;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, pc);
    this.px(x, y, o.hl ?? WHITE);
    if (h >= 3 && w >= 2) this.px(x + w - 1, y + h - 1, o.iris ?? EYE2);
    if (w >= 3 && h >= 3) this.px(x + 1, y, o.hl ?? WHITE, 0.6);
  }
  blush(x, y, w = 2) {
    for (let i = 0; i < w; i++) this.px(x + i, y, BLUSH, 0.55);
  }
  bake() {
    const { w, h, c, p, parts } = this;
    const n = w * h;
    const out = new Uint32Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const A = p[i];
        if (A) {
          let col = c[i];
          let best = 0;
          for (let k = 0; k < 4; k++) {
            const xx = x + (k === 0 ? -1 : k === 1 ? 1 : 0);
            const yy = y + (k === 2 ? -1 : k === 3 ? 1 : 0);
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const B = p[yy * w + xx];
            if (B > A) {
              const f = parts[B].il;
              if (f === 1 && best < 2) { best = 2; col = parts[A].tn.ol; }
              else if (f === 2 && best < 1) { best = 1; col = parts[A].tn.dk; }
            }
          }
          out[i] = col;
        } else {
          let B = 0;
          if (x > 0 && p[i - 1] > B) B = p[i - 1];
          if (x < w - 1 && p[i + 1] > B) B = p[i + 1];
          if (y > 0 && p[i - w] > B) B = p[i - w];
          if (y < h - 1 && p[i + w] > B) B = p[i + w];
          if (B) out[i] = parts[B].tn.ol;
        }
      }
    }
    const d = this.dec;
    for (let k = 0; k < d.length; k += 3) {
      const i = d[k];
      out[i] = d[k + 2] >= 1 ? d[k + 1] : mixPx(out[i], d[k + 1], d[k + 2]);
    }
    let top = h;
    let x0 = w;
    let x1 = 0;
    for (let i = 0; i < n; i++) {
      if (!(out[i] >>> 24)) continue;
      if (top === h) top = Math.floor(i / w);
      const x = i % w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.putImageData(new ImageData(new Uint8ClampedArray(out.buffer), w, h), 0, 0);
    return { img: cv, white: null, data: out, W: w, H: h, top, bw: Math.max(1, x1 - x0 + 1), eyes: this.eyes, glow: this.glow, head: this.head };
  }
}

function whiteOf(sp) {
  if (sp.white) return sp.white;
  const src = sp.data;
  const o = new Uint32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const a = src[i] >>> 24;
    if (a) o[i] = pack(255, 255, 255, a);
  }
  const cv = document.createElement('canvas');
  cv.width = sp.W;
  cv.height = sp.H;
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(o.buffer), sp.W, sp.H), 0, 0);
  sp.white = cv;
  return cv;
}

// ================= THIẾT KẾ TỪNG LOÀI =================
// Toạ độ trong khung W x H, quay mặt sang phải; mặt đất = hàng H-1 (hàng viền dưới cùng).
const R = Math.round;
const IRON = '#5b5668';
const WOOD = '#7a5233';

// Tinh thể lục giác nghiêng: mặt trái sáng, sống giữa rất sáng, mặt phải tối
function crystal(S, bx, by, ang, w, len, tn, il = 1) {
  const ux = Math.sin(ang);
  const uy = -Math.cos(ang);
  const px = Math.cos(ang);
  const py = Math.sin(ang);
  const hw = w / 2;
  const pts = [
    bx - px * hw, by - py * hw,
    bx - px * hw + ux * len * 0.7, by - py * hw + uy * len * 0.7,
    bx + ux * len, by + uy * len,
    bx + px * hw + ux * len * 0.7, by + py * hw + uy * len * 0.7,
    bx + px * hw, by + py * hw,
  ];
  S.fill(S.M().poly(pts), tn, {
    il,
    sh: 'fn',
    fn: (x, y, t) => {
      const side = (x + 0.5 - bx) * px + (y + 0.5 - by) * py;
      const along = (x + 0.5 - bx) * ux + (y + 0.5 - by) * uy;
      if (along > len * 0.78) return t.hi;
      return side < -0.7 ? t.lt : side < 0.5 ? t.hi : side > hw - 0.9 ? t.dk : t.md;
    },
  });
}

const DESIGNS = {
  // ---------------- SLIME: khối thạch nảy co giãn
  slime: {
    W: 24, H: 20, idle: [0, 1, 2, 1], walk: 4, fps: [4, 9],
    draw(S, P, an, i, v, bl) {
      let rx = 8.8;
      let ry = 7.6;
      let lift = 0;
      let cx = 12;
      let mouth = 0;
      if (an === 'idle') { rx = 8.8 + i * 0.4; ry = 7.6 - i * 0.4; }
      else if (an === 'walk') [rx, ry, lift] = [[10.2, 6.2, 0], [7.8, 8.6, 1], [8.2, 8, 3], [9.6, 6.8, 0]][i];
      else if (i === 0) { rx = 10.6; ry = 5.8; cx = 11; } else { rx = 10; ry = 7; cx = 13; mouth = 1; }
      const base = 18 - lift;
      const cy = base + 1 - ry * (lift ? 0.96 : 0.8);
      const body = S.M().ell(cx, cy, rx, ry).rows(0, base);
      S.fill(body, P.a, { c: [cx, cy, rx, ry], lt: 0.66, dk: 0.2 });
      // lõi thạch phía dưới
      const core = S.M().ell(cx + 1, base - 1.2, rx * 0.72, 2.2).and(body);
      S.fill(core, P.b2, { il: 0, sh: 'flat' });
      if (v === 'king') {
        // ngọc vua to lơ lửng trong lõi thạch
        const gx = cx - rx * 0.45;
        S.fill(S.M().poly([gx - 2, base - 4, gx, base - 6.6, gx + 2, base - 4, gx, base - 1.6]), P.c, { il: 1, sh: 'facet', fx: gx });
        S.px(R(gx) - 1, R(base - 5), WHITE);
        S.glow.push([gx, base - 4, 4, P.c.col]);
      }
      const top = cy - ry;
      // đốm sáng bóng thạch
      const hx = R(cx - rx * 0.6);
      const hy = R(top + ry * 0.38);
      S.rc(hx, hy, 2, 1, WHITE, 0.95);
      S.px(hx - 1 + 0, hy + 1, WHITE, 0.85);
      S.px(hx + 3, hy - 1, WHITE, 0.6);
      S.px(R(cx + rx * 0.55), R(base - 2), P.a.lt, 1);
      S.px(R(cx - rx * 0.35), R(base - 1), P.a.lt, 1);
      // mặt
      const ex = R(cx + rx * 0.02);
      const ey = R(cy - ry * 0.28);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      if (mouth) { S.rc(ex + 2, ey + 3, 2, 2, EYE); S.px(ex + 2, ey + 4, BLUSH); }
      else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); S.px(ex + 2, ey + 4, P.a.dk, 0); }
      S.blush(ex - 1, ey + 3);
      S.blush(ex + 5, ey + 3);
      S.head = [cx + 1, top];
    },
  },

  // ---------------- THỎ: nhảy lò cò, tai vẫy
  bunny: {
    W: 24, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 9],
    draw(S, P, an, i, v, bl) {
      let by = 0;
      let hx = 0;
      let hy = 0;
      let ea = -0.25;
      let eb = 0.05;
      let hind = 0;
      let paw = 0;
      let mouth = 0;
      if (an === 'idle') { ea += [0, 0.12, 0.05][i]; eb += [0, 0.1, -0.05][i]; hy = i === 2 ? 1 : 0; }
      else if (an === 'walk') {
        [by, hind, paw] = [[0, 0, 0], [2, -2, 1], [4, -3, 2], [1, 1, 0]][i];
        ea -= [0.1, 0.35, 0.5, 0.2][i];
        eb -= [0.1, 0.3, 0.45, 0.15][i];
        if (i === 0) hy = 1;
      } else if (i === 0) { hx = -1; hy = -1; ea -= 0.3; eb -= 0.3; hind = 1; }
      else { hx = 3; by = 1; ea -= 0.8; eb -= 0.75; mouth = 1; paw = 2; hind = -3; }
      const Y = 2 - by;
      // tai sau + đuôi + chân sau
      const ear1 = S.M().ell(12.2 + hx, 4.6 + Y + hy, 1.7, 4.8, 1, ea);
      S.fill(ear1, P.a, { c: [12 + hx, 6 + Y, 3, 6] });
      S.fill(S.M().ell(12.4 + hx, 5 + Y + hy, 0.7, 3.3, 1, ea), P.c, { il: 0, sh: 'flat' });
      S.fill(S.M().ell(6.5 + hind, 20.2 + Y - (by ? 1 : 0), 3.3, 1.6), P.a, { sh: 'edge' });
      S.fill(S.M().ell(4.2 + hind * 0.3, 14.6 + Y, 1.9, 1.9), P.aL, { lt: 0.4 });
      // thân
      S.fill(S.M().ell(9.6, 16.2 + Y, 6.2, 4.6), P.a, { lt: 0.55 });
      S.fill(S.M().ell(10.5, 18.4 + Y, 3.6, 2).and(S.M().ell(9.6, 16.2 + Y, 6.2, 4.6)), P.aL, { il: 0, sh: 'flat' });
      S.fill(S.M().ell(14 + paw, 20.3 + Y - (paw ? 1 : 0), 1.8, 1.3), P.a, { sh: 'edge' });
      // tai trước
      const ear2 = S.M().ell(15 + hx, 4.1 + Y + hy, 1.8, 5, 1, eb);
      S.fill(ear2, P.a, { c: [15 + hx, 6 + Y, 3, 6] });
      S.fill(S.M().ell(15.1 + hx, 4.6 + Y + hy, 0.75, 3.5, 1, eb), P.c, { il: 0, sh: 'flat' });
      // đầu
      const hcx = 14.6 + hx;
      const hcy = 10.8 + Y + hy;
      S.fill(S.M().ell(hcx, hcy, 5.8, 5), P.a, { lt: 0.5 });
      S.fill(S.M().ell(hcx + 2.6, hcy + 2.4, 2.6, 1.6).and(S.M().ell(hcx, hcy, 5.8, 5)), P.aL, { il: 0, sh: 'flat' });
      const ex = R(hcx - 0.6);
      const ey = R(hcy - 1.8);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      S.px(ex + 6, ey + 3, P.c.md);
      S.px(ex + 6, ey + 2, P.c.lt);
      if (mouth) { S.px(ex + 4, ey + 4, EYE); S.px(ex + 5, ey + 4, EYE); }
      else { S.px(ex + 5, ey + 4, P.a.ol, 0.7); S.px(ex + 4, ey + 4, P.a.dk); }
      S.blush(ex - 1, ey + 3);
      S.blush(ex + 3, ey + 3, 1);
      S.head = [hcx, hcy - 5];
    },
  },

  // ---------------- NẤM: lạch bạch, mũ có đốm
  mushroom: {
    W: 24, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw(S, P, an, i, v, bl) {
      let bob = 0;
      let cs = 0;
      let cd = 0;
      let lf = 0;
      let rf = 0;
      let crx = 10;
      let spore = 0;
      let arm = 0;
      if (an === 'idle') { cd = [0, 1, 0][i]; crx = 10 + (i === 1 ? 0.4 : 0); arm = i === 2 ? 1 : 0; }
      else if (an === 'walk') { [lf, rf, bob, cs] = [[1, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, -1], [0, 0, 1, 0]][i]; arm = i % 2; }
      else if (i === 0) { cd = 2; crx = 10.6; arm = -1; }
      else { cs = 2; bob = 1; spore = 1; crx = 9.6; arm = 2; }
      const X = 12;
      // chân
      S.fill(S.M().ell(X - 3.2, 21.6 - lf, 2.4, 1.5), P.bD, { sh: 'edge' });
      S.fill(S.M().ell(X + 3.4, 21.6 - rf, 2.4, 1.5), P.bD, { sh: 'edge' });
      S.fill(S.M().ell(X - 5.6, 17.4 - bob - arm * 0.5, 1.4, 1.9), P.b);
      // thân
      const body = S.M().ell(X + 0.2, 17.2 - bob, 5.4, 4.7);
      S.fill(body, P.b, { lt: 0.5 });
      S.fill(S.M().ell(X + 6, 17.4 - bob - arm, 1.4, 1.9), P.b);
      // phiến dưới mũ
      const ccx = X + cs * 0.5;
      const ccy = 11.4 - bob + cd;
      S.fill(S.M().ell(ccx, ccy + 0.9, crx - 1.6, 1.7), P.bD, { il: 2, sh: 'flat' });
      // mũ nấm
      const cap = S.M().ell(ccx, ccy, crx, 8.2).rows(0, R(ccy));
      S.fill(cap, P.a, { c: [ccx, ccy, crx, 8.2], lt: 0.58, dk: 0.32 });
      // vành mũ cong
      S.fill(S.M().ell(ccx, ccy + 0.2, crx - 0.2, 1.2).and(S.M().rect(0, R(ccy), 24, 2)), P.aD, { il: 0, sh: 'flat' });
      const spots = [[-4.6, -4.4, 2, 1.6], [1.6, -6.2, 2.3, 1.6], [5.8, -2.6, 1.7, 1.5], [-8, -1.2, 1.2, 1.3], [0.8, -2, 1.4, 1.1]];
      for (const [dx, dy, rx, ry] of spots) {
        S.fill(S.M().ell(ccx + dx * crx / 10, ccy + dy, rx, ry).and(cap), P.c, { il: 2, c: [ccx, ccy, crx, 8.2], lt: 0.5, dk: 0.2 });
      }
      S.px(R(ccx - 6), R(ccy - 4), WHITE, 0.8);
      S.px(R(ccx - 5), R(ccy - 5), WHITE, 0.6);
      // mặt
      const ex = X - 1;
      const ey = R(15.2 - bob);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      if (an === 'atk' && i === 1) { S.rc(ex + 2, ey + 3, 2, 2, EYE); }
      else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3);
      if (spore) {
        const sc = P.c.md;
        for (const [sx, sy] of [[21, 6], [22, 9], [19, 3], [23, 12], [17, 1]]) S.px(sx, sy, sc, 0.9);
        S.px(20, 5, P.a.lt, 0.8);
      }
      S.head = [ccx, ccy - 8.2];
    },
  },

  // ---------------- IMP: khỉ / quỷ chibi đầu to
  imp: {
    W: 28, H: 28, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw(S, P, an, i, v, bl) {
      const king = v === 'oniK';
      const oni = v === 'oni' || king;
      const monkey = v === 'monkey';
      const abyss = v === 'abyss';
      let lb = 0; let lf = 0; let ab = 0; let af = 0; let bob = 0; let hb = 0; let tw = 0;
      let pose = 0; // 0 thường, 1 giơ cao, 2 đập/vồ tới
      if (an === 'idle') { hb = [0, 0, 1][i]; tw = [0, 1, 1][i]; af = i === 2 ? 1 : 0; }
      else if (an === 'walk') { [lb, lf, ab, af, bob] = [[-2, 2, 2, -2, 0], [0, 0, 0, 0, 1], [2, -2, -2, 2, 0], [0, 0, 0, 0, 1]][i]; tw = [0, 1, 0, -1][i]; }
      else if (i === 0) { pose = 1; hb = -1; lf = 1; lb = -1; tw = -1; }
      else { pose = 2; hb = 1; lf = 2; lb = -2; tw = 1; }
      const X = 13;
      const Y = -bob;
      // đuôi
      if (monkey) {
        S.fill(S.M().path([X - 3.5, 21 + Y, X - 7, 20.4 + Y, X - 9, 17.4 + Y, X - 8.6 + tw, 14 + Y, X - 6.6 + tw, 13 + Y, X - 5.4 + tw, 14.6 + Y], 1.7), P.a, { sh: 'edge' });
      } else if (!oni) {
        S.fill(S.M().path([X - 3.5, 21 + Y, X - 7.5, 21 + Y, X - 9.5, 17.5 + Y + tw * 0.5], 1.4), P.a, { sh: 'edge' });
        S.fill(S.M().poly([X - 11.2, 17 + Y + tw * 0.5, X - 9.8, 13.6 + Y + tw * 0.5, X - 8.2, 16.8 + Y + tw * 0.5]), P.c, { sh: 'facet', fx: X - 9.6 });
      }
      if (abyss) {
        // cánh dơi đỏ thẫm sau lưng, xương cánh tím sáng: tách hẳn khỏi thân tím
        const w = tw * 0.8;
        const wm = S.M().poly([X - 2, 17 + Y, X - 7.6, 7.6 + Y - w, X - 12.4, 9.6 + Y - w, X - 10.2, 12 + Y, X - 11.2, 15.4 + Y, X - 8, 14.6 + Y, X - 7, 18.4 + Y, X - 3.4, 19.6 + Y]);
        S.fill(wm, T('#8e1030'), { sh: 'edge' });
        S.dm(S.M().path([X - 2.6, 17.6 + Y, X - 7.6, 8 + Y - w, X - 12, 9.8 + Y - w], 1).path([X - 7.4, 9 + Y - w, X - 9.8, 13.4 + Y], 1).and(wm), P.b.md, 1);
      }
      // chân sau + tay sau (Quỷ Vương: chân sẫm tách khỏi thân đỏ)
      const legT = king ? T(adj(P.a.col, -0.16)) : P.a;
      const legD = king ? T(adj(P.a.col, -0.24)) : P.aD;
      S.fill(S.M().line(X - 1.6, 21.5 + Y, X - 2 + lb, 25.2, 2.6), legD, { sh: 'edge' });
      S.fill(S.M().ell(X - 1.6 + lb, 25.9, 2.1, 1.2), king ? T('#3a2a2a') : oni ? P.aD : P.bD, { sh: 'edge' });
      const abx = pose === 1 ? X - 6.5 : pose === 2 ? X - 5 : X - 5.4 + ab;
      const aby = pose === 1 ? 14 + Y : pose === 2 ? 17 + Y : 21.4 + Y;
      S.fill(S.M().line(X - 2.6, 17.6 + Y, abx, aby, 2.2), P.aD, { sh: 'edge' });
      S.fill(S.M().ell(abx, aby + 0.4, 1.6, 1.5), monkey ? P.bD : P.aD);
      // thân
      const body = S.M().ell(X, 20 + Y, 4.5, 4.1);
      S.fill(body, P.a, { lt: 0.55 });
      S.fill(S.M().ell(X + 1.2, 20.8 + Y, 2.8, 2.7).and(body), oni ? P.aL : P.b, { il: 2, lt: 0.75, dk: 0 });
      if (oni) {
        const cloth = S.M().rect(X - 5, 21.6 + Y, 10, 2.6).and(S.M().ell(X, 20.6 + Y, 5.2, 4.8)).poly([X - 1, 23 + Y, X + 1.5, 26 + Y, X + 4, 23 + Y]);
        S.fill(cloth, P.tiger, { il: 1, sh: 'v', vt: 0.35, vb: 0.75 });
        for (const [sx, sy] of [[-3, 22], [-2, 23], [0, 22], [2, 23], [3, 22], [1, 24]]) S.px(X + sx, sy + Y, P.tiger.ol, 0.9);
      }
      // chân trước
      S.fill(S.M().line(X + 1.6, 22 + Y, X + 2 + lf, 25.2, 2.6), legT, { sh: 'edge' });
      S.fill(S.M().ell(X + 2.6 + lf, 25.9, 2.2, 1.2), king ? T('#4a3636') : oni ? P.a : P.b, { sh: 'edge' });
      // đầu
      const hx = X + 0.5 + (pose === 2 ? 1 : 0);
      const hy = 10.4 + Y + hb;
      if (monkey) {
        for (const [ex, er] of [[-6.9, 2.6], [7, 2.4]]) {
          S.fill(S.M().ell(hx + ex, hy + 0.8, er, er + 0.2), P.a);
          S.fill(S.M().ell(hx + ex * 1.04, hy + 1, er * 0.5, er * 0.56), P.b, { il: 0, sh: 'flat' });
        }
      }
      if (abyss) {
        // sừng ngà cong vút ra sau, chóp sẫm (không còn giống tai)
        const ivory = T('#efe2c0');
        for (const [bx, by, sg] of [[hx - 3.4, hy - 4.4, -1], [hx + 2.6, hy - 4.8, -0.6]]) {
          S.fill(S.M().line(bx, by, bx + sg * 1.6, by - 3.4, 2.6).line(bx + sg * 1.6, by - 3.4, bx + sg * 4, by - 5.2, 1.8).line(bx + sg * 4, by - 5.2, bx + sg * 5.8, by - 5, 1.2), ivory, { sh: 'edge' });
          S.px(bx + sg * 5.6, by - 5, P.a.dk);
        }
      }
      const head = S.M().ell(hx, hy, 6.9, 6.1);
      S.fill(head, P.a, { lt: 0.5, dk: 0.1 });
      if (monkey) {
        const face = S.M().ell(hx + 1.6, hy + 1.9, 4.7, 3.4).ell(hx - 0.2, hy - 0.4, 2.8, 2.8).ell(hx + 3.5, hy - 0.4, 2.8, 2.8).and(head);
        S.fill(face, P.b, { il: 2, lt: 0.42, dk: 0 });
        S.fill(S.M().poly([hx - 2.4, hy - 5.2, hx - 1.4, hy - 8, hx + 0.2, hy - 5.8, hx + 1.6, hy - 7.4, hx + 1.8, hy - 5.2]), P.a, { il: 0, sh: 'edge' });
      }
      if (oni) {
        // tóc xoăn trước trán + sừng
        if (king) {
          // sừng ngắn chĩa ngang để boss không cao quá hitbox
          crystal(S, hx - 5.2, hy - 2.6, -1.02, 3.2, 5.4, P.horn);
          crystal(S, hx + 4.6, hy - 3, 0.98, 3.2, 5.4, P.horn);
        } else {
          crystal(S, hx - 3.6, hy - 4.4, -0.42, 3.2, 5, P.horn);
          crystal(S, hx + 2.8, hy - 4.8, 0.38, 3.2, 5.2, P.horn);
        }
        const kd = king ? 0.8 : 0;
        const hair = S.M().ell(hx - 4, hy - 3.8 + kd, 2.7, 2.5).ell(hx - 0.8, hy - 5 + kd, 2.9, 2.3).ell(hx + 2.6, hy - 4.6 + kd, 2.6, 2.2)
          .ell(hx - 6.2, hy - 1, 2.1, 2.7).ell(hx - 5.6, hy + 2.2, 1.6, 1.8);
        hair.ell(hx + 1.8, hy + 1.4, 5.2, 4, 0);
        const ht = king ? T('#5c2a3e') : P.hair;
        S.fill(hair, ht, { lt: 0.45, il: 1 });
        S.dm(S.M().path([hx - 5, hy - 3 + kd, hx - 4, hy - 4.2 + kd, hx - 2.8, hy - 3.4 + kd], 1).path([hx - 1.8, hy - 4.2 + kd, hx - 0.6, hy - 5.2 + kd, hx + 0.6, hy - 4.4 + kd], 1).path([hx - 6.8, hy, hx - 6, hy - 1.2], 1), ht.dk, 1);
        if (king) {
          // sợi tóc sáng tạo khối cho bờm Quỷ Vương
          S.dm(S.M().path([hx - 4.6, hy - 4.6 + kd, hx - 3.4, hy - 5.4 + kd], 1).path([hx - 1.4, hy - 6 + kd, hx, hy - 6.4 + kd], 1).path([hx - 7, hy - 2.4, hx - 6.6, hy - 3.2], 1), ht.hi, 0.9);
        }
      }
      const ex = R(hx);
      const ey = R(hy - 1);
      S.eye(ex, ey, 2, 3, { blink: bl, iris: oni || abyss ? P.c.lt : undefined });
      S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: oni || abyss ? P.c.lt : undefined });
      if (abyss) { S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE); }
      if (oni) {
        S.px(ex - 1, ey - 2, EYE); S.px(ex, ey - 1, EYE); S.px(ex + 1, ey - 1, EYE);
        S.px(ex + 6, ey - 2, EYE); S.px(ex + 5, ey - 1, EYE); S.px(ex + 4, ey - 1, EYE);
        S.rc(ex + 1, ey + 4, 4, 1, EYE);
        if (pose) S.rc(ex + 2, ey + 5, 2, 1, EYE);
        S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE);
      } else if (monkey) {
        S.px(ex + 2, ey + 3, P.b.dk); S.px(ex + 3, ey + 3, P.b.dk);
        if (pose) { S.rc(ex + 2, ey + 4, 2, 2, P.a.ol); }
        else { S.px(ex + 1, ey + 4, P.a.ol); S.px(ex + 2, ey + 5, P.a.ol); S.px(ex + 3, ey + 5, P.a.ol); S.px(ex + 4, ey + 4, P.a.ol); }
      } else {
        S.rc(ex + 2, ey + 4, 2, 1, EYE);
      }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3, 2);
      if (king) {
        // chuỗi hạt ngà to vắt ngang ngực, vẽ sau đầu để luôn thấy rõ
        for (let k = 0; k < 7; k++) {
          const a = 0.3 + k * 0.42;
          S.fill(S.M().ell(hx - 0.6 + Math.cos(a) * 5.4, hy + 6.4 + Math.sin(a) * 2.2, 1.35, 1.35), k === 3 ? T('#4caf50') : T('#f3e2b8'), { lt: 0.4 });
        }
      }
      // tay trước (+ chùy gai của quỷ)
      let afx = X + 5 + af;
      let afy = 21 + Y;
      if (pose === 1) { afx = X + 1; afy = 6 + Y; }
      if (pose === 2) { afx = X + 9; afy = 16 + Y; }
      if (oni) {
        let c0; let c1;
        if (pose === 1) { c0 = [afx, afy]; c1 = [afx - 9, afy - 3]; }
        else if (pose === 2) { c0 = [afx, afy]; c1 = [afx + 5, afy + 8.5]; }
        else { c0 = [afx + 0.6, afy + 1.6]; c1 = [afx + 3.8, afy - 10.5]; }
        const lx = (f) => c0[0] + (c1[0] - c0[0]) * f;
        const ly = (f) => c0[1] + (c1[1] - c0[1]) * f;
        const k = S.M().line(c0[0], c0[1], lx(0.3), ly(0.3), 1.8).line(lx(0.26), ly(0.26), lx(0.84), ly(0.84), 3.8).ell(lx(0.86), ly(0.86), 2.4, 2.4);
        S.fill(k, P.iron, { lt: 0.45 });
        for (const f of [0.45, 0.62, 0.79]) S.px(lx(f) - 1, ly(f), P.iron.hi);
        for (const f of [0.53, 0.7, 0.9]) S.px(lx(f) + 1, ly(f), P.iron.lt);
      }
      S.fill(S.M().line(X + 2.6, 17.6 + Y, afx, afy, 2.2), P.a, { sh: 'edge' });
      S.fill(S.M().ell(afx + 0.3, afy + 0.3, 1.7, 1.6), monkey ? P.b : P.a);
      if (pose === 2 && !oni) {
        for (const [sx, sy] of [[3, -4], [4, -2], [4, 0], [3, 2]]) S.px(afx + sx, afy + sy, WHITE, 0.75);
      }
      S.head = [hx + 0.2, hy - (king ? 6.4 : oni ? 9 : 6)];
    },
  },

  // ---------------- FLYER: ong / dơi, vỗ cánh
  flyer: {
    W: 30, H: 20, idle: [0, 1, 2, 3], walk: 4, fps: [12, 14], always: true,
    draw(S, P, an, i, v, bl) {
      if (v === 'bee') return drawBee(S, P, an, i, bl);
      if (v === 'fairy') return drawFairy(S, P, an, i, bl);
      if (v === 'bird') return drawBird(S, P, an, i, bl);
      return drawBat(S, P, an, i, bl, v);
    },
  },

  // ---------------- CUA / BỌ CẠP
  crab: {
    W: 32, H: 20, idle: [0, 1, 2, 1], walk: 4, fps: [3, 10],
    draw(S, P, an, i, v, bl) {
      if (v === 'scorp') return drawScorpion(S, P, an, i, bl);
      let bob = 0;
      let open = 0.6;
      let clawY = 0;
      let lp = 0;
      let lunge = 0;
      if (an === 'idle') { open = [0.3, 0.8, 1.1][i]; clawY = i === 2 ? -1 : 0; }
      else if (an === 'walk') { lp = i; bob = i % 2; open = [0.5, 0.9, 0.5, 0.2][i]; clawY = -(i % 2); }
      else if (i === 0) { open = 1.4; clawY = -3; }
      else { open = 0; clawY = 1; lunge = 2; }
      const X = 16 + lunge * 0.5;
      const Y = -bob;
      // chân (3 mỗi bên)
      for (let k = 0; k < 3; k++) {
        const up = (k + lp) % 2 === 0 && an === 'walk' ? 1 : 0;
        const ox = 3.5 + k * 1.7;
        S.fill(S.M().path([X - ox, 14 + Y, X - ox - 3, 15 + Y - up, X - ox - 3.6, 18.4 - up], 1.2), P.aD, { sh: 'edge' });
        S.fill(S.M().path([X + ox, 14 + Y, X + ox + 3, 15 + Y - (1 - up) * (an === 'walk' ? 1 : 0), X + ox + 3.6, 18.4 - (an === 'walk' ? 1 - up : 0)], 1.2), P.aD, { sh: 'edge' });
      }
      // càng sau (trái)
      const emp = v === 'emperor';
      const cl = (sx, sgn, o, cy) => {
        const k = emp && sgn > 0 ? 1.55 : 1;
        S.fill(S.M().line(X + sgn * 6.5, 12 + Y, sx, cy + 2, 2.2), P.a, { sh: 'edge' });
        const c = S.M().ell(sx + sgn * 0.6, cy, 3.4 * k, 2.7 * k);
        if (o > 0.05) c.poly([sx + sgn * 0.4, cy - 0.2, sx + sgn * 4.6 * k, cy - 0.6 - 1.6 * o * k, sx + sgn * 4.6 * k, cy + 0.6 * o], 0);
        S.fill(c, P.a, { lt: 0.5 });
        S.px(sx + sgn * 2.2 - (sgn < 0 ? 1 : 0), cy - 2, P.a.hi);
        // càng lớn của Cua Hoàng Đế: mũi càng bọc vàng
        if (k > 1) S.fill(S.M().ell(sx + sgn * 3.6, cy - 1, 1.6, 1.2).and(c), T(GOLD), { il: 1, lt: 0.4 });
      };
      cl(X - 10.5, -1, open, 8.5 + Y + clawY);
      // mai
      const body = S.M().ell(X, 12.6 + Y, 8.8, 5.2).rows(0, R(16.6 + Y));
      S.fill(body, P.a, { lt: 0.55, dk: 0.25 });
      S.fill(S.M().rect(0, R(15 + Y), 32, 3).and(body), P.b, { il: 2, sh: 'flat' });
      for (const [dx, dy] of [[-5, -2], [-2, -3], [4, -2.5], [6, 0]]) S.px(X + dx, 12.6 + Y + dy, P.a.lt);
      S.px(X - 4, 9 + Y, P.a.hi); S.px(X - 3, 9 + Y, P.a.hi);
      if (emp) {
        // vương miện gai vàng trên mai + ngọc trai lớn giữa mai của Cua Hoàng Đế
        // gai vàng dựng ở nửa sau mai (mắt cuống không che) + ngọc trai lớn
        for (const [dx, dy, h, a] of [[-8.6, 2, 4.4, -0.75], [-6.4, 0.4, 6, -0.45], [-4, -0.4, 4.6, -0.15]]) {
          const ux = Math.sin(a); const uy = -Math.cos(a);
          const bx = X + dx; const by = 10.4 + Y + dy;
          crystal(S, bx, by, a, 2.8, h, T(GOLD));
          S.px(bx + ux * h * 0.6, by + uy * h * 0.6, WHITE, 0.8);
        }
        S.fill(S.M().ell(X - 4.4, 12 + Y, 2, 1.8), T('#fff8e1'), { il: 1, lt: 0.4 });
        S.px(R(X - 5), R(11.4 + Y), WHITE);
        S.glow.push([X - 4.4, 12 + Y, 4, '#fff8e1']);
      } else if (v === 'gem') {
        // cụm ngọc to trên mai, tông đậm hơn thân để nổi khối
        // cụm ngọc sáng mọc nửa sau mai, chéo về sau để không bị mắt che
        const gem = P.b;
        crystal(S, X - 8.4, 11.4 + Y, -0.8, 2.8, 5, gem);
        crystal(S, X - 6.4, 9.8 + Y, -0.45, 3.2, 7.2, gem);
        crystal(S, X - 4, 9.4 + Y, -0.1, 2.8, 5.2, gem);
        S.px(R(X - 8), R(4.6 + Y), WHITE);
        S.glow.push([X - 7, 5 + Y, 7, P.b.col]);
      }
      // mắt cuống
      for (const sx of [-2.6, 2.6]) {
        S.fill(S.M().line(X + sx, 9.5 + Y, X + sx * 1.15, 6.4 + Y, 1.4), P.a, { sh: 'flat' });
      }
      for (const sx of [-2.6, 2.6]) {
        const ex = X + sx * 1.2;
        S.fill(S.M().ell(ex, 5 + Y, 1.9, 1.9), P.eyeW, { lt: 0.5 });
        if (bl) S.rc(R(ex - 1), R(5 + Y), 2, 1, EYE);
        else { S.rc(R(ex - 0.4), R(4.2 + Y), 1, 2, EYE); S.px(R(ex - 0.4), R(4.2 + Y), WHITE, 0.4); S.px(R(ex + 0.6), R(4.2 + Y), EYE); }
        S.eyes.push([ex + 0.2, 5 + Y]);
      }
      // miệng + má
      const my = R(12.4 + Y);
      if (an === 'atk' && i === 0) { S.rc(R(X - 1), my, 2, 2, EYE); }
      else { S.px(R(X - 1), my, EYE); S.px(R(X), my + 1, EYE); S.px(R(X + 1), my, EYE); }
      S.blush(R(X - 5), my);
      S.blush(R(X + 3), my);
      // càng trước (phải)
      cl(X + 10.5, 1, open, 8.5 + Y + clawY);
      S.head = [X, 7.4 + Y];
    },
  },

  // ---------------- GOLEM: đá nặng nề + pha lê phát sáng / người tuyết lông
  golem: {
    W: 34, H: 34, idle: [0, 1, 2, 1], walk: 4, fps: [2.5, 6],
    draw(S, P, an, i, v, bl) {
      if (v === 'yeti' || v === 'yetiK') return drawYeti(S, P, an, i, bl, v === 'yetiK');
      // mỗi loài một bóng dáng: đá khom lưng, băng góc cạnh, pha lê thẳng người, tượng vuông vức, cây thân gỗ, san hô cành nhánh
      const lava = v === 'lava';
      const ice = v === 'ice';
      const tree = v === 'tree';
      const statue = v === 'statue';
      const coral = v === 'coral';
      const kingC = v === 'crystalK';
      const cryst = v === 'crystal' || kingC;
      const rockV = !lava && !ice && !tree && !statue && !coral && !cryst;
      const noCrys = lava || tree || statue || coral;
      const useB = lava || coral;
      // Tinh Thể Vương: phần tối kéo về tím chàm thay vì lam bão hòa; Mộc Tinh: vỏ cây sáng hơn để thấy mắt
      const rock = kingC ? { ...P.a, dk: T('#4a2f96').md, ol: T('#2a1650').md } : tree ? T(adj(P.b.col, 0.16)) : useB ? P.b : P.a;
      const rockD = kingC ? { ...P.aD, dk: T('#3d2680').md, ol: T('#2a1650').md } : tree ? T(adj(P.b.col, 0.07)) : useB ? P.bD : P.aD;
      const crys = lava ? P.a : tree ? T('#e6ff7a') : P.c;
      const leaf = T(adj(P.a.col, 0.04));
      let bob = 0; let lb = 0; let lf = 0; let ab = 0; let af = 0;
      let pose = 0;
      if (an === 'idle') bob = [0, 0, 1][i];
      else if (an === 'walk') [lb, lf, bob, ab, af] = [[2, 0, 0, -1, 1], [0, 0, 1, 0, 0], [0, 2, 0, 1, -1], [0, 0, 1, 0, 0]][i];
      else pose = i + 1;
      const X = 17;
      const Y = bob;
      // tay: mỗi loài một kiểu cẳng tay / nắm tay
      const arm = (sx, sy, fx, fy, tn, front) => {
        const sg = front ? 1 : -1;
        if (tree) {
          S.fill(S.M().line(sx, sy, fx, fy, 2.6).line((sx + fx) / 2, (sy + fy) / 2, (sx + fx) / 2 + sg * 1.6, (sy + fy) / 2 - 3.4, 1.4), tn, { sh: 'edge' });
          const lm = S.M().ell(fx + sg * 0.6, fy - 0.4, 3, 2.4);
          patFill(S, lm, front ? leaf : T(adj(leaf.col, -0.07)), (x, y) => ((x * 3 + y * 5) % 7 === 0 ? leaf.dk : null));
          return;
        }
        if (coral) {
          S.fill(S.M().line(sx, sy, fx, fy, 3.2).line(fx, fy, fx + sg * 2.8, fy - 3.4, 1.6).line(fx, fy, fx - sg * 1, fy - 3.8, 1.4), tn, { sh: 'edge' });
          S.fill(S.M().ell(fx + sg * 2.8, fy - 3.6, 1.3, 1.3).ell(fx - sg * 1, fy - 4.2, 1.1, 1.1).ell(fx, fy + 0.6, 2.4, 2.1), tn, { lt: 0.45 });
          return;
        }
        if (statue) {
          S.fill(S.M().line(sx, sy, fx, fy, 5), tn, { sh: 'edge' });
          S.fill(S.M().rect(R(fx - 3), R(fy - 2.6), 6, 6), tn, { sh: 'edge', side: 1 });
          S.rc(R(fx - 3), R(fy + 0.4), 6, 1, tn.dk);
          return;
        }
        if (ice) {
          S.fill(S.M().line(sx, sy, fx, fy, 4.4), tn, { lt: 0.5 });
          S.fill(S.M().poly([fx - 3.8, fy, fx, fy - 3.8, fx + 3.8, fy, fx, fy + 3.6]), tn, { sh: 'facet', fx });
          // nhũ băng rủ dưới nắm tay
          S.fill(S.M().poly([fx - 2.6, fy + 1.6, fx - 1.6, fy + 5.6, fx - 0.6, fy + 2.4]), P.ice, { sh: 'facet' });
          return;
        }
        S.fill(S.M().line(sx, sy, fx, fy, rockV ? 6 : cryst ? 4.2 : 5), tn);
        S.fill(S.M().ell(fx, fy, rockV ? 5 : 4.4, rockV ? 4.4 : 3.9), tn, { lt: 0.5 });
        if (rockV) for (const dx of [-2, 0, 2]) S.px(R(fx + dx + sg * 0.5), R(fy + 3), tn.dk);
      };
      // chân
      if (tree) {
        for (const [x0, l, t] of [[X - 4.4, lb, rockD], [X + 4.4, lf, rock]]) {
          S.fill(S.M().ell(x0, 30.4 - l, 4, 2.6).rows(0, 32 - l).line(x0 - 2.4, 31.2 - l, x0 - 4.8, 32.4, 1.4).line(x0 + 2.4, 31.2 - l, x0 + 4.6, 32.4, 1.4), t, { sh: 'edge' });
        }
      } else if (statue) {
        S.fill(S.M().rect(R(X - 8.2), R(28 - lb), 7, 5 + lb), rockD, { sh: 'edge' });
        S.fill(S.M().rect(R(X + 1.4), R(28 - lf), 7, 5 + lf), rock, { sh: 'edge' });
      } else {
        S.fill(S.M().ell(X - 4.5, 29.4 - lb, 3.8, 3.6).rows(0, 32 - lb), rockD, { sh: 'edge' });
        S.fill(S.M().ell(X + 4.5, 29.4 - lf, 4, 3.6).rows(0, 32 - lf), rock, { sh: 'edge' });
      }
      // tay sau
      const shY = (rockV ? 16.6 : tree ? 13 : 15) + Y;
      let bfx = (tree ? X - 11.4 : rockV ? X - 12 : X - 11) + ab;
      let bfy = (tree ? 17 : rockV ? 27.4 : 25) + Y;
      if (pose === 1) { bfx = X - 8; bfy = 6; }
      if (pose === 2) { bfx = X + 9; bfy = 28; }
      arm(X - (tree ? 6 : 8), shY, bfx, bfy, rockD, false);
      // pha lê / cành sau lưng
      if (!noCrys) {
        const big = ice ? 9 : rockV ? 6.4 : kingC ? 7.6 : 10.5;
        crystal(S, X - 11, 16 + Y, -0.75, 3.6, kingC ? 5.6 : rockV ? 4.4 : 7, crys);
        crystal(S, X - 7.5, 14 + Y, -0.28, 4.2, big, crys);
        if (!rockV) crystal(S, X - 3.5, 13 + Y, 0.12, 3.4, kingC ? 5.6 : 8, crys);
        S.glow.push([X - 7, 7 + Y, 7, crys.col]);
      } else if (coral) {
        const br = S.M().path([X - 6, 15 + Y, X - 8, 9 + Y, X - 7, 4 + Y], 2.2).path([X - 8, 9 + Y, X - 11.6, 6 + Y], 1.8).path([X - 2.6, 13 + Y, X - 2.4, 6 + Y, X - 4, 2.6 + Y], 2).path([X - 2.4, 7 + Y, X + 0.6, 4 + Y], 1.6)
          .ell(X - 7, 3.6 + Y, 1.4, 1.4).ell(X - 11.8, 5.8 + Y, 1.3, 1.3).ell(X - 4.2, 2.4 + Y, 1.3, 1.3).ell(X + 0.8, 3.8 + Y, 1.2, 1.2);
        S.fill(br, P.a, { sh: 'edge' });
        for (const [x, y] of [[-7, 3.4], [-11.8, 5.6], [-4.2, 2.2], [0.8, 3.6]]) S.px(R(X + x), R(y + Y), P.a.hi);
      }
      // thân
      let body;
      if (ice) body = S.M().poly([X - 10.6, 12 + Y, X + 10.6, 12 + Y, X + 8.6, 21 + Y, X + 6.4, 28 + Y, X - 6.4, 28 + Y, X - 8.6, 21 + Y]);
      else if (statue) body = S.M().poly([X - 7.4, 10.6 + Y, X + 7.4, 10.6 + Y, X + 9.6, 13 + Y, X + 9.6, 27.6 + Y, X - 9.6, 27.6 + Y, X - 9.6, 13 + Y]);
      else if (tree) body = S.M().poly([X - 6, 7 + Y, X + 6.4, 7 + Y, X + 7.2, 23 + Y, X + 9, 28.6 + Y, X - 9, 28.6 + Y, X - 7.2, 23 + Y]);
      else if (cryst) body = S.M().ell(X, 19.4 + Y, 8.8, 8.8).ell(X + 0.5, 23 + Y, 7.8, 6);
      else if (rockV) body = S.M().ell(X, 21 + Y, 11.4, 8).ell(X + 0.5, 24.4 + Y, 10, 5.2);
      else body = S.M().ell(X, 19.4 + Y, 10.4, 8.8).ell(X + 0.5, 23 + Y, 9, 6);
      if (tree) patFill(S, body, rock, (x, y) => (x % 3 === 0 && (x * 7 + y) % 9 > 1 ? rock.dk : null));
      else if (ice) S.fill(body, rock, { sh: 'facet', fx: X - 1.5 });
      else if (statue) patFill(S, body, rock, null);
      else S.fill(body, rock, { c: [X, 19 + Y, 10.4, 9], lt: 0.55, dk: 0.16 });
      // vết nứt / mảng đá
      if (!tree && !ice && !statue) {
        const cracks = lava
          ? [[X - 6, 13, X - 3, 16.5, X - 4, 20.5, X - 1.5, 23.5], [X + 3, 12.5, X + 5.5, 16.5, X + 4, 20], [X + 6, 21.5, X + 8.5, 25], [X - 8.5, 21, X - 6, 24.5, X - 7, 27], [X - 1, 25, X + 2, 27.5]]
          : [[X - 4, 18, X - 2, 21, X - 3, 24], [X + 4, 21, X + 6, 24, X + 5, 26], [X + 1, 16, X + 3, 18]];
        for (const c of cracks) {
          const m = S.M().path(c.map((q, k) => (k % 2 ? q + Y : q)), 1).and(body);
          S.dm(m, lava ? P.a.lt : rock.dk, 1);
          if (lava) {
            S.px(c[2], c[3] + Y, P.c.hi);
            S.glow.push([c[2], c[3] + Y, 5, P.a.col]);
          }
        }
      }
      if (lava) {
        // lõi dung nham trước ngực
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 2.6, 2.3).and(body), P.a.lt, 1);
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 1.4, 1.3), P.c.hi, 1);
        S.glow.push([X + 1.5, 18.6 + Y, 9, P.c.col]);
      }
      if (ice) {
        // vân nứt băng sáng chéo ngực
        S.dm(S.M().path([X - 6, 15 + Y, X - 2, 18 + Y, X + 1, 16 + Y], 1).and(body), P.c.hi, 0.9);
        S.dm(S.M().line(X + 3, 20 + Y, X + 5, 24 + Y, 1).and(body), P.c.hi, 0.7);
      }
      if (cryst) {
        // pha lê lớn giữa ngực phát sáng
        crystal(S, X + 1, 25 + Y, 0, 3.6, 7, crys);
        S.glow.push([X + 1, 21 + Y, 6, crys.col]);
      }
      if (rockV) {
        // rêu xanh phủ vai khom
        S.fill(S.M().ell(X - 5, 14 + Y, 4.4, 1.9).ell(X + 4.6, 14.4 + Y, 3, 1.5).and(body), T('#7cb342'), { il: 0, sh: 'edge' });
      }
      if (statue) {
        // gờ vai, đai khắc + ấn vàng phát sáng trước ngực
        S.rc(R(X - 9), R(13 + Y), 19, 1, rock.lt);
        S.fill(S.M().rect(0, R(24 + Y), 34, 2).and(body), rockD, { il: 2, sh: 'edge' });
        S.fill(S.M().ell(X - 6, 12 + Y, 3, 1.3).and(body), T('#7cb342'), { il: 0, sh: 'edge' });
        const g = P.c;
        for (const [x, y] of [[0, 0], [1, 0], [2, 0], [1, -1], [1, 1], [1, 2], [0, 2], [2, 2]]) S.px(X + x, 17 + Y + y, x === 1 && y === 0 ? WHITE : g.hi, 0.95);
        S.glow.push([X + 1, 18 + Y, 6, g.col]);
      }
      if (coral) {
        for (const [x, y] of [[-6, 20], [5, 24], [-2, 25], [3, 15]]) S.fill(S.M().ell(X + x, y + Y, 1.4, 1.1), T('#fff3e0'), { il: 1, lt: 0.4 });
      }
      // đầu
      const hx = X + 2 + (pose === 2 ? 2 : 0);
      const hy = (tree ? 12.6 : rockV ? 12.4 : 9.6) + Y + (pose === 2 ? (tree ? 1 : 2) : 0);
      if (statue) S.fill(S.M().poly([hx - 4, hy - 3, hx - 2.4, hy - 8.4, hx + 0.4, hy - 6, hx + 2.6, hy - 8.6, hx + 4.4, hy - 3]), rockD, { sh: 'facet', fx: hx });
      if (ice) S.fill(S.M().poly([hx - 5.6, hy, hx - 3.6, hy - 4.6, hx + 3.6, hy - 4.6, hx + 5.8, hy, hx + 3.6, hy + 4.2, hx - 3.6, hy + 4.2]), rock, { sh: 'facet', fx: hx - 0.5 });
      else if (statue) {
        S.fill(S.M().poly([hx - 5, hy - 4.4, hx + 5, hy - 4.4, hx + 5.6, hy + 3.8, hx - 5.4, hy + 3.8]), rock, { sh: 'edge', side: 1 });
        S.rc(R(hx - 5), R(hy - 1.6), 10, 1, rock.dk);
      } else if (!tree) {
        S.fill(S.M().ell(hx, hy, rockV ? 5.4 : 5.8, rockV ? 4.4 : 4.8), rock, { lt: 0.5 });
        S.rc(R(hx - 4), R(hy - 1.6), 9, 1, rock.dk);
      }
      // mắt (Mộc Tinh: hốc tối trên thân cây + mắt vàng lục sáng)
      if (tree) for (const ex of [hx - 2, hx + 2]) S.rc(R(ex) - 1, R(hy - 1.6), 4, 3, rock.ol);
      if (bl) { S.rc(R(hx - 2), R(hy), 2, 1, crys.dk); S.rc(R(hx + 2), R(hy), 2, 1, crys.dk); S.eyes.push([hx - 1, hy + 0.5], [hx + 3, hy + 0.5]); }
      else {
        for (const ex of [hx - 2, hx + 2]) {
          S.rc(R(ex), R(hy - 0.6), 2, 2, crys.hi);
          S.px(R(ex) + 1, R(hy - 0.6) + 1, crys.lt);
          if (tree) S.px(R(ex), R(hy - 0.6), WHITE);
          S.eyes.push([ex + 1, hy + 0.4]);
        }
        if (tree) S.glow.push([hx + 1, hy, 4, crys.col]);
      }
      S.rc(R(hx), R(hy + 2.4), 3, 1, rock.ol);
      if (pose === 2) S.rc(R(hx), R(hy + 2.4), 3, 2, rock.ol);
      if (tree) {
        // tán lá dày + hoa hồng to viền tối trên ngọn
        const cn = S.M().ell(X - 3, 5.6 + Y, 5.6, 3.8).ell(X + 2.8, 4.4 + Y, 5.4, 3.8).ell(X + 7, 7 + Y, 3.4, 2.8).ell(X - 7.6, 8 + Y, 3.4, 2.6);
        patFill(S, cn, leaf, (x, y) => ((x * 3 + y * 5) % 11 === 0 ? leaf.dk : null));
        for (const [x, y] of [[-5, 3.4], [0, 2], [5, 4.6], [-1, 6.6], [-8, 7.6]]) {
          S.fill(S.M().ell(X + x, y + Y, 1.5, 1.4), P.c, { il: 1, lt: 0.4 });
          S.px(R(X + x), R(y + Y), '#ffeb3b');
        }
      } else if (coral) {
        S.fill(S.M().path([hx + 1, hy - 4, hx + 1.6, hy - 7.4, hx + 3.6, hy - 9], 1.6).path([hx + 1.4, hy - 6.4, hx - 1, hy - 8.4], 1.4).ell(hx + 3.8, hy - 9.2, 1.1, 1.1).ell(hx - 1.2, hy - 8.6, 1, 1), P.a, { sh: 'edge' });
      } else if (kingC) {
        // vương miện pha lê 5 nhánh đối xứng quanh đỉnh đầu + vành vàng
        for (const [dx, a, l] of [[-4.4, -0.62, 3.4], [4.4, 0.62, 3.4], [-2.2, -0.3, 4.8], [2.2, 0.3, 4.8], [0, 0, 6.4]]) crystal(S, hx + dx, hy - 3.4 + Math.abs(dx) * 0.18, a, 2.4, l, crys);
        S.fill(S.M().ell(hx, hy - 3.6, 5.2, 1.2), T(GOLD), { sh: 'edge', il: 1 });
        S.glow.push([hx, hy - 7, 7, crys.col]);
      } else if (v === 'crystal') {
        crystal(S, hx - 1.4, hy - 3.8, -0.25, 2.4, 4.4, crys);
      } else if (ice) {
        crystal(S, hx - 2.4, hy - 4, -0.35, 2.2, 3.4, P.ice);
        crystal(S, hx + 1.2, hy - 4.4, 0.15, 2.2, 4, P.ice);
      }
      // pha lê vai trước
      if (!noCrys) {
        crystal(S, X + 7.5, (rockV ? 15 : 13) + Y, 0.45, 3, rockV ? 4.6 : 6, crys);
        if (kingC) crystal(S, X + 4, 12 + Y, 0.1, 2.6, 5, crys);
        S.glow.push([X + 9, 9 + Y, 5, crys.col]);
      }
      // tay trước
      let ffx = (tree ? X + 11.6 : rockV ? X + 12 : X + 11) + af;
      let ffy = (tree ? 17.4 : rockV ? 27.6 : 25.5) + Y;
      if (pose === 1) { ffx = X + 6; ffy = 5; }
      if (pose === 2) { ffx = X + 13; ffy = 28.5; }
      arm(X + (tree ? 6 : 8), shY, ffx, ffy, rock, true);
      if (!tree && !coral) S.px(R(ffx - 2), R(ffy - 2), rock.hi);
      if (cryst) crystal(S, ffx + 2.4, ffy - 1.2, 0.9, 2.4, 4, crys);
      if (lava) { S.px(R(ffx + 1), R(ffy - 1), P.c.hi); S.px(R(ffx + 2), R(ffy), P.a.lt); S.px(R(ffx), R(ffy + 1), P.a.lt); S.px(R(ffx + 3), R(ffy - 2), P.a.md); S.glow.push([ffx + 1, ffy, 5, P.a.col]); }
      if (pose === 2) {
        for (const [dx, dy] of [[-3, 3], [4, 2], [-5, 1], [6, 0]]) S.px(R(ffx + dx), R(ffy + dy), '#d8ccb8', 0.8);
      }
      S.head = [hx, tree ? 1 + Y : hy - (statue ? 8.4 : coral ? 10 : kingC ? 10.6 : ice ? 4.6 : 4.8)];
    },
  },

  // ---------------- GHOST: u linh lơ lửng
  ghost: {
    W: 26, H: 28, idle: [0, 1, 2, 3], walk: 4, fps: [5, 7], always: true,
    draw(S, P, an, i, v, bl) {
      let sw = [0, 1, 0, -1][i] || 0;
      let lx = 0;
      let arm = [0, 1, 0, 1][i] || 0;
      let boo = 0;
      if (an === 'atk') { sw = i ? -1 : 1; lx = i ? 2 : -1; arm = i ? -3 : -2; boo = i; }
      const X = 13 + lx;
      // tay sau
      S.fill(S.M().ell(X - 7.4, 15.4 - arm * 0.5, 2.2, 1.6, 1, 0.4), P.a);
      const body = S.M().ell(X, 10.4, 7.6, 7.6).ell(X - 0.4, 15, 7.2, 4.8)
        .ell(X - 2.4 + sw * 0.5, 19.4, 4.8, 3.4).ell(X - 5 + sw, 22.4, 3, 2.2).ell(X - 7.3 + sw * 1.6, 24.4, 1.8, 1.4);
      S.fill(body, P.a, { c: [X, 11, 8.5, 11], lt: 0.6, dk: 0.06 });
      S.fill(S.M().ell(X - 2.5 + sw, 20.5, 3.4, 2).ell(X - 5.4 + sw, 23, 1.8, 1.2).and(body), P.b, { il: 0, sh: 'flat' });
      // ngọn lửa / gai băng trên đầu
      if (v === 'fire') {
        const f = [0, 1, 2, 1][i] || 0;
        S.fill(S.M().poly([X - 5, 6, X - 4 - f * 0.3, 0.6 + f * 0.4, X - 2, 4.4, X - 0.6, -0.2 + (2 - f) * 0.5, X + 1.4, 3.6, X + 3.4, 1 + f * 0.6, X + 5, 6]).and(S.M().rect(0, 0, 26, 7)), P.b, { il: 0, sh: 'v', vt: 0.15, vb: 0.95 });
        S.px(X - 4, 2 + f * 0.4, P.c.hi); S.px(X - 0.5, 1 + (2 - f) * 0.5, P.c.hi);
      } else if (v === 'frost') {
        for (const [dx, h] of [[-4.5, 3], [-1, 4.4], [2.5, 3.4]]) {
          S.fill(S.M().poly([X + dx - 1.4, 4.6, X + dx, 4.6 - h, X + dx + 1.4, 4.6]), P.ice, { sh: 'facet', fx: X + dx + 0.5, il: 1 });
        }
      } else if (v === 'cloud') {
        // đuôi thành mây giông (đáy xanh sẫm) + bướu mây trên đầu + tia sét vàng to
        const cl = S.M().ell(X - 5.4 + sw, 21.6, 3.2, 2.4).ell(X - 1 + sw * 0.5, 22.4, 3.6, 2.6).ell(X + 3.6, 21, 3, 2.2);
        S.fill(cl, P.a, { lt: 0.5, il: 1 });
        S.fill(S.M().rect(0, 23, 26, 3).and(cl), P.b, { il: 0, sh: 'flat' });
        S.fill(S.M().ell(X - 4, 3.6, 2.8, 2.4).ell(X + 2.6, 2.8, 3, 2.6), P.a, { lt: 0.5, il: 2 });
        const g = i % 2;
        const bx = X - 1 + g * 3;
        const bolt = S.M().poly([bx + 1, 23.4, bx + 3.4, 23.4, bx + 1.8, 25.6, bx + 3.4, 25.6, bx - 0.4, 28, bx + 0.8, 25.8, bx - 0.6, 25.8]);
        S.fill(bolt, T('#ffeb3b'), { sh: 'flat', il: 1 });
        S.px(bx + 1, 24, WHITE);
        S.glow.push([bx + 1.4, 25.6, 5, '#ffeb3b']);
        // tia sét nhỏ trên bướu mây: điểm nhấn sáng ở đầu
        S.fill(S.M().poly([X + 0.4, -0.2, X + 2, -0.2, X + 1, 1.6, X + 2.2, 1.6, X - 0.2, 3.6, X + 0.4, 1.8, X - 0.6, 1.8]), T('#ffeb3b'), { sh: 'flat', il: 1 });
      } else if (!v) {
        // khăn tam giác trắng trên trán + ma trơi xanh bay cạnh
        S.fill(S.M().poly([X - 2.6, 4.6, X - 0.4, 1.4, X + 1.8, 4.6]), T('#ffffff'), { sh: 'flat', il: 1 });
        const fy = 6 + [0, -1, -2, -1][i] + (an === 'atk' ? -1 : 0);
        S.fill(S.M().ell(X + 9.6, fy + 2, 1.6, 1.6).poly([X + 8, fy + 2, X + 9.4, fy - 2.6, X + 11.2, fy + 2]), T('#80d8ff'), { lt: 0.45, il: 1 });
        S.glow.push([X + 9.6, fy + 1, 5, '#40c4ff']);
      }
      // sáng lõi
      S.px(X - 4, 6, WHITE, 0.85); S.px(X - 5, 7, WHITE, 0.7); S.px(X - 3, 5, WHITE, 0.55);
      // mặt
      const ex = R(X - 1);
      const ey = 8;
      S.eye(ex, ey, 2, 3, { blink: bl, col: v === 'fire' ? pack(60, 18, 10) : EYE });
      S.eye(ex + 4, ey, 2, 3, { blink: bl, col: v === 'fire' ? pack(60, 18, 10) : EYE });
      if (boo) { S.rc(ex + 1, ey + 4, 3, 3, EYE); S.px(ex + 2, ey + 6, BLUSH); }
      else if (an === 'atk') { S.rc(ex + 2, ey + 4, 2, 2, EYE); }
      else { S.rc(ex + 2, ey + 4, 2, 1 + (i % 2), EYE); }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3);
      // tay trước
      S.fill(S.M().ell(X + 7.6, 15.6 + arm * 0.6, 2.4, 1.6, 1, -0.4), P.a);
      S.head = [X + 0.5, 2.8];
    },
  },

  // ---------------- BEAST: sói / chó địa ngục / rồng — chạy 4 chân
  beast: {
    W: 36, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 11],
    draw(S, P, an, i, v, bl) {
      if (v === 'worm') return drawWorm(S, P, an, i, bl);
      if (v === 'serpent' || v === 'dragonK') return drawSerpent(S, P, an, i, bl, v === 'dragonK');
      const hound = v === 'hound';
      const bone = v === 'bone';
      const dragon = v === 'dragon' || bone;
      const fox9 = v === 'fox9';
      const fox = v === 'fox' || fox9;
      const icy = v === 'ice';
      const king = v === 'wolfK';
      let ph = 0;
      let run = 0;
      let bob = 0;
      let hb = 0;
      let wag = 0;
      let lunge = 0;
      let mouth = 0;
      let pose = 0;
      if (an === 'idle') { wag = [0, 0.25, 0.5][i]; hb = i === 2 ? 1 : 0; }
      else if (an === 'walk') { ph = (i * Math.PI) / 2; run = 1; bob = [0, 1, 0, 1][i]; wag = [0.4, 0.1, -0.2, 0.1][i]; }
      else if (i === 0) { pose = 1; hb = 1; bob = -1; wag = -0.3; }
      else { pose = 2; lunge = 3; mouth = 1; bob = 1; wag = 0.6; }
      const X = 16 + lunge;
      const Y = -bob;
      const leg = (hx, hy, phase, tn, front, near) => {
        let dx = run ? Math.cos(phase) * 3 : 0;
        let lift = run ? Math.max(0, Math.sin(phase)) * 2.2 : 0;
        if (pose === 1) { dx = front ? 1.5 : -1; lift = 0; }
        if (pose === 2) { dx = front ? 4.5 : -4; lift = front ? 2.5 : 0.5; }
        const px = hx + dx;
        const py = 21.3 - lift;
        if (!front && near) S.fill(S.M().ell(hx + 0.4, hy - 0.2, 3, 3.6), tn, { lt: 0.5 });
        S.fill(S.M().line(hx, hy + (front ? 0 : 1.5), px, py - 0.4, bone ? 1.8 : front ? 2.6 : 2.4), tn, { sh: 'edge' });
        S.fill(S.M().ell(px + 0.7, py + 0.4, 2, 1.2), tn, { sh: 'edge' });
      };
      // đuôi
      if (dragon) {
        S.fill(S.M().path([X - 7, 12.4 + Y, X - 11, 11.4 + Y - wag * 2, X - 14, 8.6 + Y - wag * 3], 2.6).path([X - 14, 8.6 + Y - wag * 3, X - 15, 5.6 + Y - wag * 3], 1.6), P.a, { sh: 'edge' });
        const tx = X - 15.2; const ty = 5 + Y - wag * 3;
        S.fill(S.M().poly([tx - 2, ty + 0.8, tx, ty - 2.8, tx + 2, ty + 0.8, tx, ty - 0.2]), P.b, { sh: 'facet', fx: tx + 0.5 });
      } else if (hound) {
        const f = an === 'walk' ? i % 2 : i % 2;
        const tm = S.M().poly([X - 7, 10.5 + Y, X - 11.5, 8 + Y - wag * 3, X - 15, 2.6 + Y - wag * 4 + f, X - 11.6, 6 + Y - wag * 3, X - 12.6, 1.6 + Y - wag * 2 - f, X - 9, 6 + Y - wag, X - 6, 13 + Y]);
        S.fill(tm, P.b, { sh: 'v', il: 1, vt: 0.2, vb: 0.8 });
        S.dm(S.M().poly([X - 8, 10.5 + Y, X - 11.2, 7.6 + Y - wag * 3, X - 12.4, 4 + Y - wag * 3, X - 9.4, 7.6 + Y - wag, X - 7, 12 + Y]).and(tm), P.c.md, 1);
        S.dm(S.M().poly([X - 8.4, 10.6 + Y, X - 10.2, 8.4 + Y - wag * 2, X - 8.6, 8.6 + Y - wag]).and(tm), P.c.hi, 1);
        S.glow.push([X - 11, 7 + Y, 6, P.c.col]);
      } else if (fox9) {
        // đuôi xòe quạt rộng, mỗi đuôi tách rời có viền tối và chóp trắng; đếm được ở zoom nhỏ
        const order = [0, 4, 1, 3, 2];
        for (const k of order) {
          const a = -2.25 + k * 0.55 + wag * 0.3;
          const bx = X - 6.6;
          const by = 11.6 + Y;
          const cx = bx + Math.sin(a) * 6;
          const cy = by - Math.cos(a) * 6;
          const tm = S.M().ell(cx, cy, 1.7, 5.2, 1, a);
          S.fill(tm, k % 2 ? P.aD : P.a, { lt: 0.5, il: 1 });
          S.fill(S.M().ell(bx + Math.sin(a) * 10, by - Math.cos(a) * 10, 1.7, 2.2, 1, a).and(tm), P.b, { il: 0, lt: 0.5 });
        }
        S.glow.push([X - 12, 6 + Y, 6, P.c.col]);
      } else if (fox) {
        const tail = S.M().ell(X - 11.2, 8.4 + Y - wag * 2, 4, 7, 1, -1.1 + wag);
        S.fill(tail, P.a, { lt: 0.5 });
        S.fill(S.M().ell(X - 15, 5 + Y - wag * 3.6, 3, 3.2, 1, -1.1 + wag).and(tail), P.b, { il: 0, lt: 0.5 });
        S.glow.push([X - 16, 3 + Y - wag * 3, 5, P.c.col]);
      } else {
        const tail = S.M().ell(X - 10.6, 9.6 + Y - wag * 2, 3.3, 5.8, 1, -1.05 + wag);
        S.fill(tail, P.a, { lt: 0.5 });
        S.fill(S.M().ell(X - 14, 7.2 + Y - wag * 3.6, 2.2, 2.6, 1, -1.05 + wag).and(tail), P.b2, { il: 0, sh: 'flat' });
      }
      // chân phía xa
      leg(X - 6.6, 15 + Y, ph + Math.PI + 0.6, P.aD, false, false);
      leg(X + 5.4, 15 + Y, ph + 0.6, P.aD, true, false);
      // cánh xương Cốt Long: 3 ngón xương dựng cao, màng rách tối mờ
      if (bone) {
        const wf = an === 'walk' ? [0, 1, 2, 1][i] : pose ? 2 : i === 1 ? 1 : 0;
        const wy = [0, 1.2, 2.6][wf];
        const sx = X - 1; const sy = 8.6 + Y;
        const tips = [[X - 3.6, 0.6 + wy * 0.5], [X - 9.6, 0.8 + wy], [X - 14.4, 5.4 + wy]];
        const mem = S.M().poly([sx, sy, ...tips[0], X - 6.4, 4.2 + wy, ...tips[1], X - 11.2, 5.8 + wy, ...tips[2], X - 10.4, 9.4 + Y, X - 6, 9.6 + Y]);
        S.fill(mem, T('#8fa3ad', 210), { sh: 'v', vt: 0.25, vb: 0.75, il: 0 });
        const fb = S.M();
        for (const [tx, ty] of tips) fb.line(sx, sy, tx, ty, 2);
        S.fill(fb, P.bone, { sh: 'flat' });
        for (const [tx, ty] of tips) S.px(tx, ty, WHITE);
      } else if (dragon) {
        const wf = an === 'walk' ? [0, 1, 2, 1][i] : pose ? 2 : i === 1 ? 1 : 0;
        const wy = [-1, 1.5, 4][wf];
        const wm = S.M().poly([X - 3, 9 + Y, X - 6, 1 + Y + wy, X - 11, -0.4 + Y + wy * 1.4, X - 9.6, 3.4 + Y + wy, X - 7.4, 3.6 + Y + wy * 0.8, X - 6.6, 6 + Y + wy * 0.5, X - 4.6, 6.4 + Y + wy * 0.3, X + 1, 10 + Y]);
        S.fill(wm, P.b, { sh: 'edge', il: 1 });
        S.dm(S.M().path([X - 3, 9 + Y, X - 6, 1.4 + Y + wy, X - 10.4, 0.2 + Y + wy * 1.4], 1), P.b.dk, 1);
      }
      // thân
      const body = S.M().ell(X - 1.4, 12.8 + Y, 9, 5).ell(X + 4, 12.4 + Y, 5.2, 4.8);
      S.fill(body, P.a, { c: [X - 1, 12.4 + Y, 9.4, 5.4], lt: 0.58, dk: 0.12 });
      S.fill(S.M().ell(X, 17.6 + Y, 8, 2.6).and(body), dragon ? P.b : P.b2, { il: 0, sh: 'flat' });
      if (bone) {
        for (let k = 0; k < 4; k++) S.fill(S.M().rect(R(X - 6 + k * 2.6), R(10.4 + Y), 1, 6).and(body), T('#2c2a36'), { il: 0, sh: 'flat' });
      }
      if (icy) {
        for (const [dx, a, l] of [[-6, -0.5, 3.6], [-3, -0.2, 5], [0.4, 0.15, 4.2], [3.4, 0.4, 3]]) crystal(S, X + dx, 9 + Y, a, 2.2, l, P.ice);
        S.glow.push([X - 1, 5 + Y, 6, P.b.col]);
      }
      if (dragon && !bone) {
        for (let k = 0; k < 4; k++) {
          const sx = X - 7 + k * 3.4;
          S.fill(S.M().poly([sx - 1.4, 8.4 + Y, sx + 0.2, 5 + Y + (k === 0 ? 1 : 0), sx + 1.4, 8.4 + Y]), P.b, { sh: 'facet', fx: sx + 0.5 });
        }
        for (const sx of [-4, -1, 2, 5]) S.px(X + sx, 17 + Y, P.b.lt);
      }
      // chân phía gần
      leg(X - 5.4, 15.4 + Y, ph + Math.PI, P.a, false, true);
      leg(X + 6.6, 15.4 + Y, ph, P.a, true, true);
      // bờm / ngực
      if (hound) {
        const mf = i % 2;
        const mane = S.M().poly([X + 1.6, 15 + Y, X + 0.6, 8.6 + Y, X + 1.4, 3.6 + Y + mf, X + 4, 7 + Y, X + 5.4, 2 + Y + (1 - mf), X + 7, 6.4 + Y, X + 9.4, 3.8 + Y + mf, X + 9.6, 14.6 + Y]);
        S.fill(mane, P.b, { sh: 'v', il: 1, vt: 0.2, vb: 0.8 });
        S.dm(S.M().poly([X + 2.6, 14 + Y, X + 2.4, 8 + Y, X + 4, 9.4 + Y, X + 5.6, 5.6 + Y + (1 - mf), X + 7, 9.4 + Y, X + 8.4, 7.4 + Y, X + 8.4, 14 + Y]).and(mane), P.c.md, 1);
        S.dm(S.M().poly([X + 4, 13 + Y, X + 4.6, 10 + Y, X + 5.6, 8.6 + Y, X + 6.6, 11 + Y, X + 7, 13 + Y]).and(mane), P.c.hi, 1);
        S.glow.push([X + 5, 8 + Y, 7, P.c.col]);
      } else if (!dragon) {
        const ruff = king
          ? S.M().ell(X + 6.6, 12.4 + Y, 5, 5.6).poly([X + 2.4, 14 + Y, X + 3.4, 19.4 + Y, X + 5.4, 16.6 + Y, X + 7, 20 + Y, X + 8.6, 16.6 + Y, X + 10.4, 19 + Y, X + 11, 14 + Y])
          : S.M().ell(X + 7.4, 13.6 + Y, 3.8, 4.2).poly([X + 4.6, 16 + Y, X + 5.6, 19 + Y, X + 7, 16.6 + Y, X + 8.4, 18.6 + Y, X + 9.6, 16 + Y]);
        S.fill(ruff, P.b2, { il: 2, lt: 0.5 });
        if (king) {
          // vòng cổ sắt gai
          S.fill(S.M().ell(X + 7.6, 13.6 + Y, 3.6, 1.3, 1, 1.25), P.iron, { lt: 0.45 });
          for (const [dx, dy] of [[-1.2, -1.6], [0, 1.2], [1.2, 3.8]]) crystal(S, X + 7.6 + dx, 13.6 + Y + dy, -1.4, 1.4, 2.2, T('#d7dbe3'));
        }
      }
      // đầu
      const hx = X + 10.2 + (pose === 2 ? 1 : 0) + (bone ? 0.6 : 0);
      const hy = 8.4 + Y + hb - (bone ? 2.2 : 0);
      // cổ xương dài nâng đầu sọ
      if (bone) S.fill(S.M().path([X + 5, 11 + Y, X + 7.4, 8.6 + Y, hx - 1.6, hy + 1.4], 2.6), P.a, { sh: 'edge' });
      if (dragon) {
        S.fill(S.M().path([hx - 1.6, hy - 3.4, hx - 4.4, hy - 5.8, hx - 7.6, hy - 6.2], 1.8), P.bone, { sh: 'edge' });
        S.fill(S.M().path([hx + 0.8, hy - 4, hx - 1.4, hy - 7, hx - 4.2, hy - 8.4], 1.8), P.bone, { sh: 'edge' });
      } else {
        S.fill(S.M().poly([hx - 4.2, hy - 0.6, hx - 3.4, hy - 8, hx - 0.4, hy - 3.2]), P.aD, { sh: 'facet', fx: hx - 3.2 });
      }
      // rồng: sọ nhỏ dẹt, mõm dài nhọn (khác hẳn đầu tròn của sói)
      const head = dragon ? S.M().ell(hx, hy + 0.4, 4.4, 3.8) : S.M().ell(hx, hy, 5.4, 4.8);
      S.fill(head, P.a, { lt: 0.5 });
      // mõm
      const sny = hy + 1.8;
      const snout = dragon ? S.M().ell(hx + 4.8, sny, 4.6, mouth ? 1.4 : 1.9).poly([hx + 7.6, sny - 1.4, hx + 10, sny - 0.2, hx + 7.6, sny + 1.2]) : S.M().ell(hx + 4.6, sny, 3.3, mouth ? 1.5 : 2.1);
      S.fill(snout, dragon ? P.a : P.b2, { il: 2, lt: 0.5 });
      if (mouth) {
        S.fill(S.M().ell(hx + 3.8, sny + 3, 2.8, 1.2, 1, 0.35), dragon ? P.a : P.b2, { il: 1, sh: 'edge' });
        S.rc(R(hx + 2.6), R(sny + 1.4), 5, 1, EYE);
        S.px(R(hx + 6.4), R(sny + 1.4), WHITE); S.px(R(hx + 4), R(sny + 1.4), WHITE);
      } else {
        S.rc(R(hx + 3.4), R(sny + 1.4), 3, 1, P.a.ol);
      }
      S.rc(R(hx + 7), R(sny - 1.2), 2, 2, EYE);
      S.px(R(hx + 7), R(sny - 1.2), pack(120, 110, 140));
      if (!dragon) {
        S.fill(S.M().poly([hx - 1.2, hy - 3.2, hx + 0.8, hy - 8.8, hx + 3, hy - 2.6]), P.a, { sh: 'facet', fx: hx + 0.8 });
        S.fill(S.M().poly([hx - 0.2, hy - 3.4, hx + 0.9, hy - 6.8, hx + 1.9, hy - 3.2]), hound ? P.c : fox ? P.b : P.ear, { il: 0, sh: 'flat' });
        if (fox) S.fill(S.M().poly([hx + 0.2, hy - 7, hx + 0.8, hy - 8.8, hx + 1.6, hy - 6.8]), T('#3a2418'), { il: 0, sh: 'flat' });
      }
      // mắt
      const ex = R(hx + 0.4);
      const ey = R(hy - 2);
      const ec = hound || dragon ? P.c.dk : EYE;
      if (bl) { S.rc(ex, ey + 2, 2, 1, EYE); S.eyes.push([ex + 1, ey + 1.5]); }
      else {
        S.eye(ex, ey, 2, 3, { col: ec, iris: hound || dragon ? P.c.hi : EYE2 });
        S.px(ex - 1, ey - 1, P.a.ol); S.px(ex, ey - 1, P.a.ol, 0.5);
      }
      if (fox) {
        S.px(ex + 2, ey + 1, P.c.md); S.px(ex + 3, ey + 2, P.c.md); S.px(ex - 1, ey + 3, P.c.md, 0.8);
        S.px(R(hx - 1.6), R(hy - 3.4), P.c.md); S.px(R(hx - 1.6), R(hy - 2.4), P.c.lt);
      } else if (king) {
        S.px(ex - 1, ey - 1, P.c.md); S.px(ex, ey, P.c.md); S.px(ex + 1, ey + 1, P.c.md); S.px(ex + 2, ey + 2, P.c.md);
      } else if (!bone) S.blush(ex + 2, ey + 3, 2);
      if (icy && !pose) for (const [dx, dy] of [[9, 0], [10, -1], [11, 0], [12, -1]]) S.px(R(hx + dx), R(sny + dy), WHITE, 0.45);
      if (bone) {
        // hốc mắt sọ tối quanh đốm lửa hồn + hàm răng
        S.px(ex - 1, ey, P.a.ol); S.px(ex + 2, ey, P.a.ol); S.px(ex - 1, ey + 2, P.a.ol, 0.6);
        if (!mouth) for (let k = 0; k < 5; k += 2) S.px(R(hx + 4 + k), R(sny + 1.4), WHITE);
        S.glow.push([ex + 1, ey + 1, 4, P.c.col]);
      }
      S.head = [hx - 0.5, hy - 4.8];
    },
  },

  // ---------------- NGƯỜI: mỗi loài một bộ trang phục riêng (xem HUM)
  humanoid: {
    W: 40, H: 38, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw: (S, P, an, i, v, bl) => drawHumanoid(S, P, an, i, v, bl),
  },

  // ---------------- NGƯỜI TUYẾT: khăn quàng + mũ len
  snowman: {
    W: 28, H: 30, idle: [0, 1, 2, 1], walk: 4, fps: [3, 7],
    draw(S, P, an, i, v, bl) {
      let sq = 0; let b1 = 0; let b2 = 0; let aw = 0; let fl = 0; let pose = 0;
      if (an === 'idle') { b2 = [0, 0, 1][i]; aw = [0, 1, 2][i]; fl = i; }
      else if (an === 'walk') { [sq, b1, b2] = [[1, 1, 1], [0, 0, 0], [0, -1, -1], [0, 0, 0]][i]; aw = [0, 2, 3, 1][i]; fl = i; }
      else pose = i + 1;
      const X = 14;
      const twig = P.twig;
      const hx = X + 0.5;
      const hy = 10.4 + b2;
      // tay sau
      const bax = X - 10.4; const bay = 14 + aw * 0.5;
      S.fill(S.M().line(X - 5, 19 + b1, bax, bay, 1.2).line(bax + 1.6, bay + 1.2, bax - 0.6, bay - 1.8, 1).line(bax + 1, bay + 0.6, bax - 1.8, bay + 0.8, 1), twig, { sh: 'flat' });
      // khăn bay phía sau
      const sf = [0, 1, 2, 1][fl % 4];
      const sy = 15.4 + b1 * 0.5 + b2 * 0.5;
      S.fill(S.M().poly([X - 3.4, sy - 0.6, X - 7.6 - sf * 0.5, sy + 3.6 + sf * 0.3, X - 9.4 - sf * 0.7, sy + 6.6, X - 6.2, sy + 6.8, X - 5.2, sy + 3.6, X - 1.6, sy + 1.2]), P.c, { sh: 'edge' });
      for (let k = 0; k < 3; k++) S.px(R(X - 9.2 - sf * 0.7) + k, R(sy + 7.4), P.c.md);
      // thân dưới
      const bot = S.M().ell(X, 25 + sq * 0.5, 8.2 + sq * 0.7, 5 - sq * 0.4).rows(0, 28);
      S.fill(bot, P.a, { c: [X, 24.6, 8.2, 5.4], lt: 0.5, dk: 0.2 });
      // thân giữa
      const mid = S.M().ell(X, 19.8 + b1, 6.6, 4.5);
      S.fill(mid, P.a, { lt: 0.5, dk: 0.2 });
      for (const by of [18.5, 21.5]) S.rc(X + 1, R(by + b1), 2, 1, EYE);
      S.px(X + 1, R(18.5 + b1) - 1, WHITE, 0.5);
      // đầu
      S.fill(S.M().ell(hx, hy, 6, 5.2), P.a, { lt: 0.5, dk: 0.2 });
      // khăn quàng
      const sc = S.M().ell(hx - 0.3, sy, 6.4, 1.9);
      S.fill(sc, P.c, { sh: 'v', vt: 0.4, vb: 0.75 });
      for (const sx of [-4, -1, 2, 5]) S.px(R(hx + sx), R(sy), P.c.lt);
      // mũ len + quả bông
      const hat = S.M().ell(hx, hy - 3.8, 5.8, 4.8).rows(0, R(hy - 5.4));
      S.fill(hat, P.hat, { c: [hx, hy - 3.8, 5.8, 4.8], lt: 0.5 });
      for (const sx of [-3, 0, 3]) S.px(R(hx + sx), R(hy - 7), P.hat.dk);
      S.fill(S.M().rect(R(hx - 6), R(hy - 5.4), 12, 2), P.knit, { sh: 'v', vt: 0.5, vb: 0.5 });
      for (let k = 1; k < 12; k += 2) S.px(R(hx - 6) + k, R(hy - 4.4), P.knit.dk);
      S.fill(S.M().ell(hx - 2.8 - sf * 0.3, hy - 8.6 + (fl % 2) * 0.3, 2.1, 1.9), P.knit, { lt: 0.4 });
      // mặt
      const ex = R(hx - 0.4);
      const ey = R(hy - 2.4);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 6, ey + 3, 1);
      // mũi cà rốt
      S.fill(S.M().poly([hx + 2.4, hy + 0.4, hx + 7.6, hy + 1.6, hx + 2.4, hy + 2.6]), P.carrot, { sh: 'edge' });
      S.px(R(hx + 4.4), R(hy + 1), P.carrot.dk);
      // miệng than
      if (pose) { S.rc(ex + 1, R(hy + 3), 3, 2, EYE); }
      else { S.px(ex, R(hy + 3), EYE); S.px(ex + 1, R(hy + 3.6), EYE); S.px(ex + 2, R(hy + 3.6), EYE); S.px(ex + 3, R(hy + 3), EYE); }
      // tay trước + quả cầu tuyết
      let fax = X + 10.4; let fay = 14 - aw * 0.5;
      if (pose === 1) { fax = X + 4; fay = 4.6; }
      if (pose === 2) { fax = X + 12; fay = 16.6; }
      S.fill(S.M().line(X + 5, 19 + b1, fax, fay, 1.2).line(fax - 1.4, fay + 1.4, fax + 1.6, fay - 0.4, 1).line(fax - 0.6, fay + 0.4, fax + 0.4, fay - 2, 1), twig, { sh: 'flat' });
      if (pose) {
        const bx = pose === 1 ? fax - 1.4 : fax + 1.4;
        const by = pose === 1 ? fay - 1.8 : fay - 1.6;
        S.fill(S.M().ell(bx, by, 2.2, 2.2), P.a, { lt: 0.5 });
      }
      S.head = [hx, hy - 8];
    },
  },
};

// ---------- Ong
function drawBee(S, P, an, i, bl) {
  let lx = 0;
  let tilt = 0;
  if (an === 'atk') { lx = i ? 3 : -2; tilt = i ? 1 : -1; }
  const X = 15 + lx;
  const wa = [-0.25, -0.95, -1.55, -0.95][i % 4];
  const wing = (rx0, ry0, a, d) => {
    const cx = rx0 + Math.sin(a) * 4.4;
    const cy = ry0 - Math.cos(a) * 4.4;
    S.fill(S.M().ell(cx, cy, 2.6, 4.8, 1, a), P.wing, { sh: 'flat', il: d });
    S.px(cx - Math.sin(a) * 2 - 0.5, cy + Math.cos(a) * -2, WHITE, 0.5);
  };
  wing(X - 1.5, 7.5, wa - 0.4, 0);
  // ngòi
  S.fill(S.M().poly([X - 8.6, 11 + tilt, X - 12.6, 13.6 + tilt * 2, X - 8.6, 14.2 + tilt]), P.b, { sh: 'facet', fx: X - 10 });
  // bụng sọc
  const abd = S.M().ell(X - 4, 12.2 + tilt * 0.5, 5.6, 4.5, 1, tilt * 0.15);
  S.fill(abd, P.a, { lt: 0.55 });
  for (const sx of [-6.4, -3.2]) {
    const st = S.M().rect(R(X + sx), 0, 2, 20).and(abd);
    S.fill(st, P.b, { il: 0, c: [X - 4, 12.2, 5.6, 4.5], lt: 0.55 });
  }
  // chân nhỏ
  S.fill(S.M().line(X - 1, 15.4, X - 2, 17.6, 1).line(X + 2, 15.4, X + 2, 17.6, 1), P.b, { sh: 'flat' });
  // đầu-ngực
  const hx = X + 3.2;
  const hy = 10.6;
  const head = S.M().ell(hx, hy, 5.4, 5);
  S.fill(head, P.a, { lt: 0.5 });
  // râu
  S.fill(S.M().path([hx - 1, hy - 4.4, hx - 2, hy - 7.4], 1).path([hx + 2, hy - 4.6, hx + 3.6, hy - 7.6], 1), P.b, { sh: 'flat' });
  S.fill(S.M().ell(hx - 2.2, hy - 8, 1.2, 1.2).ell(hx + 3.9, hy - 8.2, 1.2, 1.2), P.b, { lt: 0.4 });
  const ex = R(hx - 0.8);
  const ey = R(hy - 1.8);
  S.eye(ex, ey, 2, 3, { blink: bl });
  S.eye(ex + 4, ey, 2, 3, { blink: bl });
  if (an === 'atk' && i === 1) S.rc(ex + 2, ey + 3, 2, 2, EYE);
  else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); }
  S.blush(ex - 2, ey + 3);
  S.blush(ex + 5, ey + 3, 2);
  wing(X + 0.5, 7.2, wa, 1);
  if (an === 'atk' && i === 1) for (const yy of [8, 11, 14]) S.rc(X - 16, yy, 3, 1, WHITE, 0.6);
  S.head = [hx, hy - 5];
}

// ---------- Dơi (cánh dang hai bên)
function drawBat(S, P, an, i, bl, v) {
  const demon = v === 'demon';
  const crys = v === 'cbat';
  const king = v === 'batK';
  const X = 15;
  let th = [0.85, 0.25, -0.45, 0.25][i % 4];
  let mouth = 0;
  let ly = 0;
  if (an === 'atk') { th = i ? -0.2 : 1.1; mouth = 1; ly = i ? 2 : -1; }
  const by = 9.6 + ly + (th < 0 ? -1 : th > 0.5 ? 1 : 0);
  const wing = (sgn, front) => {
    const sx = X + sgn * 3.4;
    const sy = by - 0.6;
    const len = king ? 12.5 : 11;
    const u = [sgn * Math.cos(th), -Math.sin(th)];
    const p = [sgn * Math.sin(th) * 0.9, Math.cos(th)];
    const pt = (a, b) => [sx + u[0] * len * a + p[0] * b, sy + u[1] * len * a + p[1] * b];
    const pts = [pt(0, -1.6), pt(0.5, -2.6), pt(1, -0.6), pt(0.84, 2.6), pt(0.68, 1.4), pt(0.52, 3.4), pt(0.36, 2), pt(0.18, 3.8), pt(0, 3.4)].flat();
    // Dơi Pha Lê: màng cánh trong sáng màu chính, xương cánh tối
    S.fill(S.M().poly(pts), crys ? P.aL : P.b, { sh: 'edge', il: front ? 1 : 0 });
    const bone = S.M().path([...pt(0, -1), ...pt(0.5, -2), ...pt(1, -0.6)], 1);
    S.dm(bone, crys ? P.b.md : P.a.md, 1);
    S.dm(S.M().path([...pt(0.5, -2), ...pt(0.7, 1.4)], 1), king ? P.c.md : P.b.lt, king ? 0.8 : 0.55);
    if (crys) {
      // mảnh pha lê mọc dọc mép cánh
      for (const [a, b, l] of [[1, -0.6, 3.6], [0.68, 1.4, 3], [0.36, 2, 2.6]]) {
        const [cx, cy] = pt(a, b);
        crystal(S, cx, cy + 0.6, sgn * 0.9 - th * sgn * 0.6 + (1 - a) * sgn * 0.8, 2, l, P.c, front ? 1 : 0);
      }
      S.glow.push([...pt(1, -0.6), 4, P.c.col]);
    }
  };
  wing(-1, false);
  wing(1, true);
  // tai (Dơi Pha Lê: tai là hai khối pha lê)
  if (crys) {
    crystal(S, X - 2.6, by - 3, -0.35, 2.8, 5, P.c);
    crystal(S, X + 3.6, by - 3, 0.35, 2.8, 5, P.c);
  } else {
    S.fill(S.M().poly([X - 3.8, by - 2.6, X - 4.2, by - 7.6, X - 0.8, by - 4]), P.a, { sh: 'facet', fx: X - 3.6 });
    S.fill(S.M().poly([X + 1.8, by - 4, X + 5.2, by - 7.8, X + 4.8, by - 2.6]), P.a, { sh: 'facet', fx: X + 4.4 });
    S.fill(S.M().poly([X - 3.4, by - 3.4, X - 3.6, by - 6, X - 1.8, by - 4]).poly([X + 2.8, by - 4, X + 4.6, by - 6.2, X + 4.2, by - 3.4]), P.c, { il: 0, sh: 'flat' });
  }
  if (demon) {
    crystal(S, X - 1.4, by - 3.8, -0.25, 2.2, 4.2, P.horn);
    crystal(S, X + 2.4, by - 3.8, 0.25, 2.2, 4.2, P.horn);
  }
  if (king) {
    // sừng cong đen của Dơi Chúa
    const hn = T('#2b1f33');
    S.fill(S.M().path([X - 1.6, by - 3.6, X - 3, by - 7, X - 5.4, by - 8.6], 1.8), hn, { sh: 'edge' });
    S.fill(S.M().path([X + 2.6, by - 3.6, X + 4, by - 7, X + 6.4, by - 8.6], 1.8), hn, { sh: 'edge' });
  }
  // thân tròn lông xù (Dơi Pha Lê: thân mài giác như viên ngọc)
  const body = S.M().ell(X + 0.5, by, 5.2, 4.8);
  if (crys) S.fill(body, P.a, { sh: 'facet', fx: X - 0.5 });
  else S.fill(body, P.a, { lt: 0.55 });
  S.fill(S.M().ell(X + 1, by + 2.6, 3, 2).and(body), P.aL, { il: 0, sh: 'flat' });
  if (king) {
    S.fill(S.M().ell(X + 1, by + 2.8, 1.4, 1.4), P.c, { lt: 0.4 });
    S.glow.push([X + 1, by + 2.8, 4, P.c.col]);
  }
  // chân
  S.fill(S.M().line(X - 1, by + 4.4, X - 1, by + 6.2, 1).line(X + 2, by + 4.4, X + 2, by + 6.2, 1), P.b, { sh: 'flat' });
  const ex = R(X - 1);
  const ey = R(by - 2);
  S.eye(ex, ey, 2, 3, { blink: bl, iris: P.c.md });
  S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: P.c.md });
  if (mouth) { S.rc(ex + 1, ey + 3, 4, 2, EYE); S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE); }
  else { S.rc(ex + 1, ey + 3, 4, 1, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE); }
  if (king) { S.px(ex + 1, ey + 5, WHITE); S.px(ex + 4, ey + 5, WHITE); S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE); }
  else {
    S.blush(ex - 2, ey + 3);
    S.blush(ex + 6, ey + 3, 1);
  }
  S.head = [X + 0.5, by - 4.8];
}

// ---------- Bọ cạp
function drawScorpion(S, P, an, i, bl) {
  let bob = 0; let lp = 0; let sw = 0; let open = 0.6; let strike = 0;
  if (an === 'idle') { sw = [0, 1, 1][i]; open = [0.3, 0.8, 1][i]; }
  else if (an === 'walk') { lp = i; bob = i % 2; sw = [0, 1, 0, -1][i]; open = 0.5; }
  else if (i === 0) { sw = -2; open = 1.3; }
  else { strike = 1; open = 0; }
  const X = 15;
  const Y = -bob;
  // chân
  for (let k = 0; k < 3; k++) {
    const up = an === 'walk' && (k + lp) % 2 === 0 ? 1 : 0;
    const lx = X - 4 + k * 3.4;
    S.fill(S.M().path([lx, 15 + Y, lx - 1.6, 16.4 + Y - up, lx - 2.4, 18.4 - up], 1.2), P.aD, { sh: 'flat' });
  }
  // đuôi
  const seg = strike
    ? [[X - 6, 12.4], [X - 6.4, 8.8], [X - 3.6, 5.6], [X + 0.4, 4.4], [X + 4, 5.4]]
    : [[X - 6.4, 12.6], [X - 8.4, 9.6], [X - 8 + sw * 0.5, 6.4], [X - 5.6 + sw, 4], [X - 2.4 + sw, 3.4]];
  const rr = [2.4, 2.2, 2, 1.9, 1.7];
  for (let k = 0; k < seg.length; k++) S.fill(S.M().ell(seg[k][0], seg[k][1] + Y, rr[k], rr[k] * 0.92), P.a, { lt: 0.5 });
  const [tx, ty] = seg[seg.length - 1];
  const st = strike ? [tx + 1, ty + Y - 1, tx + 4.6, ty + Y + 2.6, tx + 0.6, ty + Y + 1.6] : [tx + 0.6, ty + Y - 1.6, tx + 4, ty + Y + 0.6, tx + 0.8, ty + Y + 1.4];
  S.fill(S.M().poly(st), P.sting, { sh: 'facet', fx: tx + 1.5 });
  // thân đốt
  const body = S.M().ell(X, 14 + Y, 7.6, 3.6);
  S.fill(body, P.a, { lt: 0.55, dk: 0.22 });
  for (const sx of [-4, -1, 2]) { S.dm(S.M().rect(X + sx, R(11 + Y), 1, 6).and(body), P.a.dk, 0.7); }
  S.px(X - 5, R(11.6 + Y), P.a.hi); S.px(X - 2, R(11.2 + Y), P.a.hi); S.px(X + 1, R(11.2 + Y), P.a.hi);
  // càng
  const claw = (bx, by2, sx, sy, o, tn) => {
    S.fill(S.M().line(bx, by2, sx, sy + 1, 2), tn, { sh: 'edge' });
    const c = S.M().ell(sx + 1.2, sy, 3.4, 2.5);
    if (o > 0.05) c.poly([sx + 1, sy + 0.2, sx + 5, sy - 0.8 - 1.6 * o, sx + 5, sy + 0.8 * o], 0);
    S.fill(c, tn, { lt: 0.5 });
    S.px(sx + 0.4, sy - 1.4, tn.hi);
  };
  claw(X + 5, 14.6 + Y, X + 9.4, 16 + Y, open * 0.7, P.aD);
  // đầu
  const hx = X + 6.4;
  const hy = 13.2 + Y;
  S.fill(S.M().ell(hx, hy, 3.6, 3.2), P.a, { lt: 0.5 });
  const ex = R(hx - 0.6);
  const ey = R(hy - 2);
  S.eye(ex - 1, ey - 1, 2, 3, { blink: bl });
  S.eye(ex + 2, ey - 1, 2, 3, { blink: bl });
  S.blush(ex - 2, ey + 2, 1);
  claw(X + 7, 13 + Y, X + 11.4 + (strike ? 1 : 0), 10.8 + Y, open, P.a);
  S.head = [X + 1, 9 + Y];
}

// ---------- Bạch viên / Tuyết quái (golem lông)
function drawYeti(S, P, an, i, bl, king) {
  let bob = 0; let lb = 0; let lf = 0; let ab = 0; let af = 0; let pose = 0;
  if (an === 'idle') bob = [0, 0, 1][i];
  else if (an === 'walk') [lb, lf, bob, ab, af] = [[2, 0, 0, -1, 1], [0, 0, 1, 0, 0], [0, 2, 0, 1, -1], [0, 0, 1, 0, 0]][i];
  else pose = i + 1;
  const X = 17;
  const Y = bob;
  const fur = (m, cx, cy, rx, ry, n, a0, len) => {
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * rx;
      const y0 = cy + Math.sin(a) * ry;
      const ta = a + 0.5;
      m.poly([x0 - Math.cos(ta) * 1.4, y0 - Math.sin(ta) * 1.4, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, x0 + Math.cos(ta) * 1.4, y0 + Math.sin(ta) * 1.4]);
    }
    return m;
  };
  // chân
  S.fill(S.M().ell(X - 4.5, 30 - lb, 3.6, 3).rows(0, 32 - lb), P.aD, { sh: 'edge' });
  S.fill(S.M().ell(X + 4.5, 30 - lf, 3.8, 3).rows(0, 32 - lf), P.a, { sh: 'edge' });
  S.fill(S.M().rect(R(X + 2), 31 - lf, 6, 1), P.b, { il: 0, sh: 'flat' });
  // tay sau
  let bfx = X - 11 + ab; let bfy = 26 + Y;
  if (pose === 1) { bfx = X - 7; bfy = 5; }
  if (pose === 2) { bfx = X + 9; bfy = 28; }
  S.fill(fur(S.M().line(X - 7, 14 + Y, bfx, bfy, 5), (X - 7 + bfx) / 2, (14 + Y + bfy) / 2, 2.4, 4, 5, 0.3, 2.2), P.aD, { lt: 0.5 });
  S.fill(S.M().ell(bfx, bfy + 1, 2.8, 2.2), P.bD, { lt: 0.5 });
  // thân lông
  const body = fur(S.M().ell(X, 18.6 + Y, 10, 10), X, 18.6 + Y, 9.4, 9.4, 14, 0.2, 2.4);
  S.fill(body, P.a, { c: [X, 18.6 + Y, 11, 11], lt: 0.55, dk: 0.12 });
  for (const [dx, dy] of [[-5, 4], [-3, 7], [4, 8], [-6, 0], [6, 3]]) {
    S.px(X + dx, 18.6 + Y + dy, P.a.dk); S.px(X + dx + 1, 18.6 + Y + dy - 1, P.a.dk);
  }
  // mặt
  const hx = X + 2 + (pose === 2 ? 1 : 0);
  const hy = 13 + Y + (pose === 2 ? 1 : 0);
  const face = S.M().ell(hx, hy, 5.8, 4.6);
  S.fill(face, P.face, { il: 1, lt: 0.5 });
  S.fill(S.M().ell(hx + 0.6, hy + 2.4, 3.4, 1.9).and(face), P.faceL, { il: 2, sh: 'flat' });
  S.fill(S.M().ell(hx - 0.4, hy - 5, 7, 2.6).and(S.M().ell(hx, hy, 7.6, 6.2)).and(S.M().rows(0, R(hy - 3))), P.a, { il: 1, sh: 'edge' });
  const ex = R(hx - 2.6);
  const ey = R(hy - 2);
  S.eye(ex, ey, 2, 3, { blink: bl, iris: P.c.md });
  S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: P.c.md });
  if (pose) { S.rc(ex + 1, ey + 4, 4, 2, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE); }
  else { S.rc(ex + 2, ey + 4, 2, 1, P.face.ol); S.px(ex + 1, ey + 5, P.face.ol); S.px(ex + 4, ey + 5, P.face.ol); S.px(ex + 2, ey + 5, P.face.ol); S.px(ex + 3, ey + 5, P.face.ol); }
  S.blush(ex - 2, ey + 3, 2);
  S.blush(ex + 6, ey + 3, 1);
  // tay trước
  let ffx = X + 11 + af; let ffy = 26 + Y;
  if (pose === 1) { ffx = X + 6; ffy = 4; }
  if (pose === 2) { ffx = X + 13; ffy = 28; }
  S.fill(fur(S.M().line(X + 7, 14 + Y, ffx, ffy, 5.2), (X + 7 + ffx) / 2, (14 + Y + ffy) / 2, 2.4, 4, 5, 0.1, 2.2), P.a, { lt: 0.5 });
  S.fill(S.M().ell(ffx, ffy + 1, 3, 2.4), P.b, { lt: 0.5 });
  for (const dx of [-1.4, 0.4, 2.2]) S.px(R(ffx + dx), R(ffy + 3), P.b.lt);
  if (king) {
    // sừng băng cong ra ngoài rồi vểnh lên, đầu nhọn trắng (không dựng chữ V như tai)
    for (const sg of [-1, 1]) {
      const bx = hx + sg * 4.6;
      const by = hy - 3;
      const p1 = [bx + sg * 3.2, by - 1.2];
      const p2 = [bx + sg * 4.6, by - 3.6];
      S.fill(S.M().line(bx, by, ...p1, 2.8).line(...p1, ...p2, 2.2), P.c, { sh: 'edge' });
      S.fill(S.M().poly([p2[0] - 1.1, p2[1] + 0.6, p2[0] + sg * 0.6, p2[1] - 2.6, p2[0] + 1.1, p2[1] + 0.4]), T('#ffffff'), { sh: 'facet', fx: p2[0] });
    }
    crystal(S, X - 8, 12 + Y, -0.9, 2.6, 5, P.c, 1);
    S.glow.push([hx, hy - 6, 6, P.c.col]);
  }
  S.head = [X + 1, king ? 5 + Y : 8 + Y];
}

// ---------- Sa trùng: thân đốt trồi lên từ ụ cát, miệng tròn răng nhọn, càng hàm
function drawWorm(S, P, an, i, bl) {
  let sw = 0; let lean = 0; let dy = 0; let mouth = 0;
  if (an === 'idle') sw = [0, 0.8, 1.6][i];
  else if (an === 'walk') { sw = [-1.5, 0, 1.5, 0][i]; dy = [0, 1, 0, 1][i]; }
  else if (i === 0) { lean = -3; dy = -1; }
  else { lean = 5; dy = 3; mouth = 1; }
  const X = 15;
  const p0 = [X - 6, 22];
  const p1 = [X - 7 + sw, 5];
  const p2 = [X + 5 + lean, 7 + dy];
  const B = (t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    const [x, y] = B(t);
    const r = 4.4 - t * 1.1;
    S.fill(S.M().ell(x, y, r, r * 0.9), k % 2 ? P.aL : P.a, { lt: 0.5, dk: 0.15 });
  }
  const [hx, hy] = B(1);
  // càng hàm phía sau + đầu
  const op = mouth ? 1.6 : 0;
  S.fill(S.M().path([hx + 1.6, hy - 3, hx + 5.4, hy - 4 - op, hx + 7.2, hy - 1.6 - op], 1.4), P.c, { sh: 'edge' });
  S.fill(S.M().ell(hx + 1, hy, 4.6, 4.2), P.a, { lt: 0.5 });
  S.fill(S.M().ell(hx - 0.4, hy + 2.6, 3.4, 1.4).and(S.M().ell(hx + 1, hy, 4.6, 4.2)), P.b, { il: 0, sh: 'flat' });
  const mw = mouth ? 2.4 : 1.4;
  const mh = mouth ? 3.2 : 2.2;
  S.fill(S.M().ell(hx + 3.8, hy + 0.6, mw, mh), T('#4a1c1c'), { il: 1, sh: 'flat' });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    S.px(hx + 3.8 + Math.cos(a) * (mw - 0.6), hy + 0.6 + Math.sin(a) * (mh - 0.6), WHITE, 0.95);
  }
  S.fill(S.M().path([hx + 1.6, hy + 3.4, hx + 5.4, hy + 4.4 + op, hx + 7, hy + 2.2 + op], 1.4), P.c, { sh: 'edge' });
  S.eye(R(hx - 1.6), R(hy - 3), 2, 2, { blink: bl });
  S.eye(R(hx + 1.4), R(hy - 3.4), 2, 2, { blink: bl });
  // ụ cát che gốc thân
  const sand = T('#e2bf72');
  const mound = S.M().ell(X - 5.4, 23.4, 8.6, 3.4).rows(0, 22);
  S.fill(mound, sand, { sh: 'edge' });
  for (const [x, y] of [[-10, 21], [-6, 20], [-2, 21], [1, 22]]) S.px(X + x, y, sand.dk);
  if (mouth) for (const [x, y] of [[5, 18], [8, 17], [3, 16]]) S.px(X + x, y, sand.lt, 0.9);
  S.head = [hx + 1, hy - 4.2];
}

// ---------- Hải xà / Long Vương: thân rắn uốn sóng, vây lưng; king = rồng phương Đông có sừng, râu, bờm, chân
function drawSerpent(S, P, an, i, bl, king) {
  let ph = 0; let lift = 0; let lunge = 0; let mouth = 0;
  if (an === 'idle') ph = i * 0.6;
  else if (an === 'walk') ph = (i * Math.PI) / 2;
  else if (i === 0) { lift = 3; lunge = -2; ph = 0.8; }
  else { lunge = 3; mouth = 1; ph = 1.6; lift = 1; }
  const N = 26;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const r = 1 + 2.4 * Math.sin(Math.PI * (0.05 + t * 0.7));
    const wave = Math.sin(t * Math.PI * 2.2 - ph) * 2.2 * (1 - t * 0.55);
    const rise = t > 0.68 ? ((t - 0.68) / 0.32) ** 1.4 * (7 + lift) : 0;
    // rồng vua: thân ngắn hơn để đầu to mà bề ngang vẫn gọn
    pts.push([2 + t * (king ? 16.5 : 22) + lunge * t * t, 21.6 - r - Math.max(0, wave) * 1.4 - rise, r]);
  }
  // vây lưng / bờm vàng (lớp sau)
  const fin = S.M();
  for (let k = 3; k < N - 2; k += king ? 2 : 3) {
    const [x, y, r] = pts[k];
    const hgt = king ? 2.4 : 2 + r * 0.3;
    fin.poly([x - 1.4, y - r + 0.8, x - 0.4, y - r - hgt, x + 1.3, y - r + 0.8]);
  }
  S.fill(fin, P.c, { sh: 'facet' });
  // thân
  const body = S.M();
  const spine = new Float32Array(S.w).fill(99);
  const rad = new Float32Array(S.w);
  for (const [x, y, r] of pts) {
    body.ell(x, y, r + 0.3, r);
    const c = R(x);
    if (c >= 0 && c < S.w && y < spine[c]) { spine[c] = y; rad[c] = r; }
  }
  patFill(S, body, P.a, (x, y) => {
    const sy = spine[x] < 99 ? spine[x] : null;
    if (sy == null) return null;
    if (y > sy + rad[x] * 0.3) return (x % (king ? 3 : 2) === 0 && y > sy + rad[x] * 0.5) ? P.b.dk : P.b.md;
    if (!king && (x + y * 2) % 4 === 0 && y > sy - rad[x] + 1) return P.a.dk;
    return null;
  });
  // chân (rồng)
  if (king) {
    for (const k of [8, 15]) {
      const [x, y, r] = pts[k];
      S.fill(S.M().line(x, y + r * 0.4, x + 1.6, 21.6, 1.8), P.a, { sh: 'edge' });
      S.fill(S.M().rect(R(x + 0.6), 21, 3, 1).rect(R(x + 3), 20, 1, 1), P.c, { sh: 'flat' });
    }
  }
  const [ex0, ey0] = pts[N];
  const k = king ? 1.3 : 1;
  const hx = ex0 + 2;
  const hy = ey0 - 0.4 - (king ? 0.6 : 0);
  // tai vây / sừng
  S.fill(S.M().poly([hx - 1.6 * k, hy - 1, hx - 5.4 * k, hy - 4.6, hx - 3.4 * k, hy - 1.6, hx - 5.6 * k, hy + 0.6, hx - 2 * k, hy + 1.2]), P.c, { sh: 'facet', fx: hx - 3.4 * k });
  if (king) {
    // gạc mảnh vươn ra sau đầu, tách khỏi mặt
    const ant = S.M().path([hx - 2, hy - 3.2, hx - 4.6, hy - 6, hx - 8.4, hy - 7.2], 1).path([hx - 4.8, hy - 6.2, hx - 4.8, hy - 8.6], 1)
      .path([hx - 7, hy - 6.8, hx - 7.8, hy - 8.8], 1);
    S.fill(ant, P.c, { sh: 'edge' });
  }
  // đầu + mõm
  const head = S.M().ell(hx, hy, 3.8 * k, 3.2 * k).ell(hx + 3.6 * k, hy + 0.6 * k - mouth * 0.6, 3 * k, 1.8 * k);
  S.fill(head, P.a, { c: [hx + k, hy, 5 * k, 3.4 * k], lt: 0.5 });
  if (mouth) {
    S.fill(S.M().ell(hx + 3.4 * k, hy + 3 * k, 3 * k, 1.2 * k, 1, 0.3), P.b, { sh: 'edge' });
    S.rc(R(hx + 2 * k), R(hy + 1.6 * k), R(5 * k), 1, EYE);
    S.px(R(hx + 3 * k), R(hy + 1.6 * k), WHITE); S.px(R(hx + 5 * k), R(hy + 1.6 * k), WHITE);
  } else {
    S.fill(S.M().ell(hx + 2.8 * k, hy + 2.2 * k, 3 * k, 1).and(head), P.b, { il: 0, sh: 'flat' });
  }
  // lỗ mũi ở chóp mõm: cho biết hướng mặt
  S.px(R(hx + 6 * k), R(hy), EYE);
  if (king) S.px(R(hx + 6 * k) - 1, R(hy) - 1, P.a.hi);
  const ex = R(hx - 0.4);
  const ey = R(hy - 1.6);
  if (bl) S.rc(ex, ey + 1, 2, 1, EYE);
  else { S.rc(ex, ey, 2, 2, P.c.dk); S.px(ex, ey, WHITE); S.px(ex + 1, ey + 1, P.c.hi); }
  S.px(ex - 1, ey - 1, P.a.ol); S.px(ex, ey - 1, P.a.ol); S.px(ex + 1, ey - 1, P.a.ol, 0.5);
  S.eyes.push([ex + 1, ey + 1]);
  if (king) {
    // râu dài lượn
    const w = Math.sin(ph) * 1.2;
    S.fill(S.M().path([hx + 6.4, hy + 1.6, hx + 5.6, hy + 4 + w, hx + 3.4, hy + 5.2 + w], 1).path([hx + 4.4, hy + 2.6, hx + 2.6, hy + 4.6 + w * 0.6, hx + 0.4, hy + 4.8 + w * 0.6], 1), P.c, { sh: 'flat', il: 1 });
    S.glow.push([hx - 3, hy - 6, 6, P.c.col]);
  }
  S.head = [hx, hy - (king ? 9 : 4.6)];
}

// ---------- Hoa tiên tử: cánh bướm, váy cánh hoa, mũ hoa, đũa sao
function drawFairy(S, P, an, i, bl) {
  const X = 15;
  const f = [0, 0.4, 0.8, 0.4][i % 4];
  let lean = 0;
  let wand = 0;
  if (an === 'atk') { lean = i ? 1 : -1; wand = i + 1; }
  const skin = T('#fbe0cf');
  // cánh bướm (sau)
  const wing = T(P.b.col, 215);
  const wm = S.M().ell(X - 4 + lean, 6.6, 5 * (1 - f * 0.45), 3.6, 1, -0.7).ell(X - 3.2 + lean, 12, 3.6 * (1 - f * 0.4), 2.4, 1, 0.55);
  S.fill(wm, wing, { lt: 0.45, il: 1 });
  S.fill(S.M().ell(X - 5.6 + lean + f, 5.6, 1.4, 1.2).ell(X - 4 + lean + f * 0.6, 12.4, 1, 0.9).and(wm), P.a, { il: 0, sh: 'flat' });
  // chân
  S.fill(S.M().line(X - 1, 15.6, X - 1.6, 18, 1).line(X + 1.2, 15.6, X + 1.4, 18, 1), skin, { sh: 'flat' });
  // váy cánh hoa
  const sk = S.M().ell(X - 2 + lean, 13.4, 2, 3, 1, 0.55).ell(X + 2 + lean, 13.4, 2, 3, 1, -0.55).ell(X + lean, 14, 2.2, 3);
  S.fill(sk, P.a, { lt: 0.5 });
  S.fill(S.M().ell(X + lean, 10.8, 2.2, 2), P.a, { lt: 0.5 });
  // đầu
  const hx = X + 0.6 + lean;
  const hy = 6.4;
  S.fill(S.M().ell(hx - 2.8, hy + 0.6, 1.8, 2.6), P.c, { lt: 0.5 });
  S.fill(S.M().ell(hx, hy, 4.2, 3.8), skin, { lt: 0.5, dk: -1 });
  S.fill(S.M().ell(hx - 0.6, hy - 1.6, 4.4, 2.6).rows(0, R(hy - 1.4)), P.c, { lt: 0.5 });
  // mũ hoa
  const hat = S.M();
  for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.55; hat.ell(hx - 0.6 + Math.cos(a) * 2.2, hy - 3.6 + Math.sin(a) * 1.4, 1.4, 1.4); }
  S.fill(hat, P.a, { lt: 0.45 });
  S.fill(S.M().ell(hx - 0.6, hy - 4.2, 0.9, 0.9), T('#ffe082'), { il: 0, lt: 0.4 });
  const ex = R(hx - 0.6);
  const ey = R(hy - 1);
  S.eye(ex, ey, 2, 2, { blink: bl });
  S.eye(ex + 3, ey, 2, 2, { blink: bl });
  S.px(ex + 2, ey + 3, EYE, 0.8);
  S.blush(ex - 1, ey + 2, 1);
  S.blush(ex + 4, ey + 2, 1);
  // tay + đũa sao
  const ax = X + 3.4 + lean + (wand === 2 ? 2.4 : 0);
  const ay = wand === 1 ? 7 : 11.4;
  S.fill(S.M().line(X + 1.6 + lean, 10.6, ax, ay, 1.2), skin, { sh: 'flat' });
  const tx = ax + (wand === 2 ? 3 : 1.4);
  const ty = ay - (wand === 1 ? 3 : 2.6);
  S.fill(S.M().line(ax, ay, tx, ty, 1), T(WOOD), { sh: 'flat' });
  S.fill(S.M().poly([tx - 1.6, ty, tx, ty - 1.6, tx + 1.6, ty, tx, ty + 1.6]), T('#ffe57f'), { sh: 'facet', fx: tx });
  S.glow.push([tx, ty, wand === 2 ? 6 : 4, '#ffe57f']);
  const g = i % 4;
  for (const [x, y] of [[-8, 16], [-6, 2], [8, 15], [-9, 9]]) if ((x + g) % 3) S.px(X + x + g * 0.5, y - g * 0.5, '#fff59d', 0.8);
  if (wand === 2) for (const [x, y] of [[2, -2], [3, 1], [1, 2], [-1, -1]]) S.px(tx + x, ty + y, WHITE, 0.85);
  S.head = [hx, hy - 5.4];
}

// ---------- Lôi điểu: chim tròn, mào tia sét, cánh lông vỗ, đuôi dài
function drawBird(S, P, an, i, bl) {
  const X = 14;
  let up = [0.9, 0.3, -0.35, 0.3][i % 4];
  let lean = 0;
  let mouth = 0;
  if (an === 'atk') { up = i ? -0.4 : 1.1; lean = i ? 2 : -1; mouth = i; }
  const bx = X + lean;
  const by = 11 + (up < 0 ? 1 : 0);
  // cánh xa
  featherWing(S, bx - 1, by - 2, 9, up, P.bD, P.a, 4, -1, 0.75);
  // đuôi
  const tail = S.M().path([bx - 5, by + 1, bx - 10, by + 2.6, bx - 13, by + 2], 1.8).path([bx - 5, by + 2, bx - 10, by + 4.6, bx - 12.4, by + 5.6], 1.6);
  S.fill(tail, P.b, { sh: 'edge' });
  S.fill(S.M().rect(R(bx - 13), R(by + 1.4), 2, 1).rect(R(bx - 12.6), R(by + 5), 2, 1), P.a, { il: 0, sh: 'flat' });
  // móng
  const claw = T('#ff9800');
  S.fill(S.M().line(bx - 1, by + 3.6, bx - 1.4, by + 6.6, 1).line(bx + 1.4, by + 3.6, bx + 1.6, by + 6.6, 1), claw, { sh: 'flat' });
  // thân
  const body = S.M().ell(bx, by, 5.6, 4.6);
  S.fill(body, P.a, { lt: 0.55 });
  S.fill(S.M().ell(bx + 1.6, by + 2, 3.2, 2.4).and(body), P.c, { il: 0, sh: 'flat' });
  // đầu + mào tia sét
  const hx = bx + 4.6;
  const hy = by - 4.4;
  const crest = S.M().poly([hx - 2.6, hy - 2, hx - 4.6, hy - 6.6, hx - 2.4, hy - 5, hx - 2.8, hy - 8.6, hx - 0.6, hy - 5.4, hx + 0.6, hy - 2.6]);
  S.fill(crest, P.a, { sh: 'facet', fx: hx - 2.4 });
  S.fill(S.M().ell(hx, hy, 3.6, 3.4), P.a, { lt: 0.5 });
  S.fill(S.M().poly([hx + 2.6, hy - 0.6, hx + 6.2, hy + 0.6 - mouth, hx + 2.8, hy + 1.2]), claw, { sh: 'edge' });
  if (mouth) S.fill(S.M().poly([hx + 2.6, hy + 1.4, hx + 5.6, hy + 3, hx + 2.6, hy + 2.6]), claw, { sh: 'edge' });
  const ex = R(hx);
  const ey = R(hy - 1.4);
  S.eye(ex, ey, 2, 2, { blink: bl, col: P.b.md });
  S.px(ex - 1, ey - 1, P.b.dk); S.px(ex, ey - 1, P.b.dk); S.px(ex + 1, ey - 1, P.b.dk, 0.6);
  // cánh gần
  featherWing(S, bx - 1.4, by - 1, 10, up, P.b, P.a, 4, -1, 0.75);
  // tia điện
  const g = i % 2;
  const bolt = [[-9, 3], [-8, 4], [-9, 5], [-8, 6]];
  for (const [x, y] of bolt) S.px(bx + x + g * 18, by + y - 10 + g * 2, WHITE, 0.85);
  S.glow.push([hx - 2.4, hy - 5, 5, P.a.col]);
  if (an === 'atk' && i === 1) {
    for (let k = 0; k < 5; k++) S.px(hx + 6 + k, hy + (k % 2 ? 2 : 0), k % 2 ? '#fff59d' : WHITE, 0.95);
    S.glow.push([hx + 8, hy + 1, 6, P.a.col]);
  }
  S.head = [hx - 1, hy - 8.6];
}

// ================= NGƯỜI (HUMANOID) =================
// Khung 40x38, thân giữa khung (X=20), đế chân ở hàng 36. Dáng chibi đầu to như ninja nhưng mỗi loài
// có trang phục, mũ, mặt và vũ khí riêng. Hoa văn trên áo/mũ tô thẳng vào lớp (không dùng chi tiết nổi)
// để tay hay vũ khí vẽ sau che đúng thứ tự.
const SKIN = '#f2c39b';
const STEEL = '#c3cbd8';
const GOLD = '#ffc928';
const BANDAGE = '#e8dcb5';
const DARKWOOD = '#4a3328';
// áo choàng tím than cho Xác Ướp Nguyền (tách khỏi băng quấn sáng và lửa xanh)
const CLOAK = T('#4a3552');
// áo Thiên Ma / Ma Thần: sáng hơn màu pal gần đen để vẫn thấy khối
const HEAVEN_ROBE = '#3a2e44';
const GOD_ROBE = T('#34205a');

// Tông tối hơn của một bộ tông (cho chân/tay phía sau)
const darker = (t, d = 0.09) => T(adj(t.col, -d));

// Tô mảng với bóng viền gối (trên/trái sáng, dưới/phải tối) và hoa văn f(x, y) -> màu hoặc null
function patFill(S, m, t, f, o = {}) {
  const w = S.w;
  const h = S.h;
  const mm = m.m;
  return S.fill(m, t, {
    il: o.il,
    sh: 'fn',
    fn: (x, y, tt) => {
      const r = f ? f(x, y, tt) : null;
      if (r != null) return r;
      const i = y * w + x;
      const up = y > 0 && mm[i - w];
      const dn = y < h - 1 && mm[i + w];
      const lf = x > 0 && mm[i - 1];
      const rt = x < w - 1 && mm[i + 1];
      return !up || (!lf && !o.noL) ? tt.lt : !dn || (!rt && !o.noR) ? tt.dk : tt.md;
    },
  });
}
// Băng quấn chéo (xác ướp)
const wrapPat = (tn, k = 3) => (x, y) => {
  const r = (y + (x >> 2)) % k;
  return r === 0 ? tn.dk : null;
};

// Cánh lông vũ xòe về phía sau (sgn=-1) hoặc phía trước (sgn=1); up: độ vỗ
function featherWing(S, x, y, span, up, tn, tip, n, sgn = -1, tf = 0.8, rim = null) {
  const m = S.M();
  const tips = S.M();
  for (let k = 0; k < n; k++) {
    const a = sgn * (0.9 + k * 0.34) - sgn * up;
    const len = span * (1 - k * 0.11);
    const ex = x + Math.sin(a) * len;
    const ey = y - Math.cos(a) * len;
    m.line(x, y, ex, ey, 3 - k * 0.25);
    tips.line(x + Math.sin(a) * len * tf, y - Math.cos(a) * len * tf, ex, ey, 2.6 - k * 0.25);
  }
  S.fill(m, tn, { lt: 0.45 });
  if (tip) S.fill(tips.and(m), tip, { il: 0, lt: 0.45 });
  // viền sáng mép trên để cánh tối vẫn nổi trên nền tối
  if (rim) {
    const w = S.w;
    const rm = S.M();
    for (let i = w; i < m.m.length; i++) if (m.m[i] && !m.m[i - w] && !tips.m[i]) rm.m[i] = 1;
    S.dm(rm, rim, 1);
  }
}

// Dáng theo khung: lb/lf lệch bàn chân sau/trước, bob nhún thân, sw đung đưa tay, atk 1 lấy đà / 2 ra đòn
function humPose(an, i) {
  const p = { lb: 0, lf: 0, bob: 0, sw: 0, atk: 0, lean: 0, fl: i };
  if (an === 'idle') { p.bob = [0, 0, 1][i]; p.sw = [0, 0.6, 0][i]; }
  else if (an === 'walk') [p.lb, p.lf, p.bob, p.sw] = [[-2.5, 2.5, 0, 1.6], [0, 0, 1, 0], [2.5, -2.5, 0, -1.6], [0, 0, 1, 0]][i];
  else { p.atk = i + 1; p.lean = i ? 1 : -1; p.lf = i ? 2.5 : 0.5; p.lb = i ? -2.5 : -0.5; p.fl = i * 2 + 1; }
  return p;
}

const WSTYLE = { spear: 'thrust', trident: 'thrust', orb: 'staff', crook: 'staff', lantern: 'staff', none: 'none' };

// Vũ khí ở tay trước: (x, y) nắm tay, a góc lưỡi (0 = dựng đứng, dương = ngả về trước)
function humWeapon(S, P, C, x, y, a, g) {
  const k = C.wpn;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  const at = (f, o = 0) => [x + ux * f + nx * o, y + uy * f + ny * o];
  const line = (f0, f1, th, o0 = 0, o1 = o0) => S.M().line(...at(f0, o0), ...at(f1, o1), th);
  const poly = (pts) => S.M().poly(pts.flat());
  const steel = C.blade ? T(C.blade) : T(STEEL);
  const grip = T(C.grip || '#3b2a33');
  const guard = T(C.guard || GOLD);
  // lưỡi có sống sáng: lớp sáng mảnh nằm trong lưỡi, không viền
  const blade = (m, t, f0, f1, o) => {
    S.fill(m, t, { sh: 'flat' });
    S.fill(line(f0, f1, 1, o).and(m), { ...t, md: t.hi }, { il: 0, sh: 'flat' });
  };
  if (k === 'club') {
    S.fill(line(-2.5, 3, 1.6), T(WOOD), { sh: 'flat' });
    const m = line(2.5, 8, 3.4).ell(...at(8.4), 2.1, 2.1);
    S.fill(m, T(WOOD), { lt: 0.5 });
    const iron = T(IRON);
    S.fill(S.M().rect(...at(5, -1.8).map(R), 1, 1).rect(...at(7.4, 1.4).map(R), 1, 1).rect(...at(9.4, -1).map(R), 1, 1), { ...iron, md: iron.hi }, { il: 0, sh: 'flat' });
  } else if (k === 'katana' || k === 'sword') {
    const len = C.len || (k === 'katana' ? 12.5 : 9.5);
    S.fill(line(-3, 1, 1.6), grip, { sh: 'flat' });
    S.fill(line(1, 1, 1.4, -1.8, 1.8), guard, { sh: 'flat' });
    blade(line(1.8, len, k === 'katana' ? 1.8 : 2.2), steel, 2.2, len - 1.2, -0.4);
  } else if (k === 'cutlass') {
    S.fill(line(-2.2, 1, 1.5), grip, { sh: 'flat' });
    S.fill(S.M().ell(...at(0.4, 1), 1.5, 1.9, 1, a), guard, { lt: 0.5 });
    const m = S.M().path([...at(1.4, 0), ...at(5, -0.5), ...at(8.2, 0.1), ...at(10, 1.6)], 2.4);
    blade(m, steel, 2, 8.5, -0.7);
  } else if (k === 'dagger' || k === 'kunai') {
    if (k === 'kunai') {
      S.fill(S.M().ell(...at(-2.8), 1.4, 1.4).ell(...at(-2.8), 0.5, 0.5, 0), grip, { sh: 'flat' });
      S.fill(line(-1.8, 0.8, 1.3), grip, { sh: 'flat' });
      blade(poly([at(0.6, -1.4), at(6.2, 0), at(0.6, 1.4)]), steel, 1, 5, -0.2);
    } else {
      S.fill(line(-1.6, 0.8, 1.4), grip, { sh: 'flat' });
      S.fill(line(0.9, 0.9, 1.2, -1.4, 1.4), guard, { sh: 'flat' });
      blade(S.M().path([...at(1.4, 0), ...at(4, -0.2), ...at(6, 1)], 2), steel, 1.6, 4.6, -0.5);
    }
  } else if (k === 'scythe') {
    // lưỡi hái quay về phía trước để không bị khe mũ che khi đứng
    // lúc đứng cán dài, lưỡi nằm trên mũ; lúc đánh cán ngắn lại để không tràn khung
    const L = g.p.atk ? 0 : (C.len || 13) - 13;
    const q = (f, o) => at(f + L, -o);
    S.fill(line(-6, 13 + L, 1.5), T(C.pole || DARKWOOD), { sh: 'flat' });
    const m = poly([q(11.2, 1.2), q(14.4, -1.2), q(14, -4.2), q(12, -6.6), q(12, -3.8), q(10.4, -1)]);
    S.fill(m, steel, { sh: 'flat' });
    if (C.edge) S.fill(S.M().path([...q(10.8, -0.8), ...q(12.2, -3.8), ...q(12, -6.4)], 1.4).and(m), { ...T(C.edge), md: T(C.edge).hi }, { il: 0, sh: 'flat' });
    S.fill(S.M().line(...q(12.4, 0.6), ...q(12.4, -1.2), 1.6), guard, { sh: 'flat' });
  } else if (k === 'spear' || k === 'trident') {
    const pole = T(C.pole || WOOD);
    S.fill(line(-7, 12, 1.5), pole, { sh: 'flat' });
    if (k === 'spear') {
      blade(poly([at(11.6, -1.5), at(17, 0), at(11.6, 1.5)]), steel, 12, 16, -0.4);
      S.fill(S.M().ell(...at(10.6, 1), 1.1, 1.8, 1, a).line(...at(10.6, 1), ...at(8.6, 2.2), 1.2), T(C.tassel || '#e53935'), { lt: 0.5 });
    } else {
      const m = S.M().path([...at(11.6, -2.3), ...at(11, 0), ...at(11.6, 2.3)], 1.5)
        .line(...at(11, 0), ...at(16.4, 0), 1.4).line(...at(11.6, -2.3), ...at(14.8, -2.3), 1.3).line(...at(11.6, 2.3), ...at(14.8, 2.3), 1.3)
        .poly([...at(16, -0.9), ...at(17.6, 0), ...at(16, 0.9)]).poly([...at(14.4, -3), ...at(15.8, -2.3), ...at(14.4, -1.6)]).poly([...at(14.4, 1.6), ...at(15.8, 2.3), ...at(14.4, 3)]);
      S.fill(m, T(C.whead || GOLD), { sh: 'flat' });
      S.fill(line(11.4, 16.4, 1, -0.4).and(m), { ...T(C.whead || GOLD), md: T(C.whead || GOLD).hi }, { il: 0, sh: 'flat' });
    }
  } else if (k === 'greatsword') {
    S.fill(line(-3.2, 1, 1.8), grip, { sh: 'flat' });
    S.fill(line(1, 1, 1.8, -3, 3), guard, { sh: 'flat' });
    const m = line(1.6, 12.6, 3.2).poly([...at(12.2, -1.6), ...at(15, 0), ...at(12.2, 1.6)]);
    S.fill(m, steel, { sh: 'flat' });
    const e = C.edge ? T(C.edge) : steel;
    S.fill(line(2, 13.6, 1, -1.2).and(m), { ...e, md: e.hi }, { il: 0, sh: 'flat' });
    if (C.edge1) S.fill(line(2, 13.6, 1, 1.2).and(m), { ...steel, md: steel.dk }, { il: 0, sh: 'flat' });
    else S.fill(line(2, 13.6, 1, 1.2).and(m), { ...e, md: e.md }, { il: 0, sh: 'flat' });
    if (C.edge) S.glow.push([...at(8), 6, C.edge]);
  } else if (k === 'orb') {
    S.fill(line(-7, 10.4, 1.5), T(C.pole || '#2a2133'), { sh: 'flat' });
    S.fill(S.M().path([...at(9.6, -2.4), ...at(11, -2.6), ...at(13, -1.4)], 1.2).path([...at(9.6, 2.4), ...at(11, 2.6), ...at(13, 1.4)], 1.2).line(...at(9.6, -2.4), ...at(9.6, 2.4), 1.4), T(C.whead || GOLD), { sh: 'flat' });
    const orb = T(C.orb || '#ff1744');
    S.fill(S.M().ell(...at(11.8), 2, 2), orb, { lt: 0.4, il: 1 });
    S.glow.push([...at(11.8), 7, orb.col]);
  } else if (k === 'crook') {
    const gold = T(C.whead || GOLD);
    const band = T(C.band || '#1565c0');
    S.fill(line(-7, 10, 1.7), gold, { sh: 'flat' });
    for (const f of [-5, -1.5, 2, 5.5]) S.fill(line(f, f + 0.9, 1.7), band, { il: 0, sh: 'flat' });
    S.fill(S.M().path([...at(9.6, 0), ...at(12, 0.3), ...at(13.4, 1.8), ...at(13, 3.6), ...at(11.6, 4)], 1.7), gold, { sh: 'flat' });
    S.fill(S.M().ell(...at(9.6, 0), 1.3, 1.3), band, { lt: 0.4 });
  } else if (k === 'lantern') {
    S.fill(S.M().line(...at(-7), ...at(10), 1.4).path([...at(10), ...at(11, 1.2), ...at(10.6, 2.8)], 1.2), T(DARKWOOD), { sh: 'flat' });
    const [lx, ly] = at(10.6, 2.8);
    const fr = T('#3b3530');
    S.fill(S.M().rect(R(lx - 1.5), R(ly + 1), 4, 5), fr, { sh: 'flat' });
    const fl = T(C.flame || '#7cb342');
    S.fill(S.M().rect(R(lx - 0.5), R(ly + 2), 2, 3), { ...fl, md: fl.hi }, { il: 0, sh: 'flat' });
    S.glow.push([R(lx) + 0.5, R(ly) + 3.5, 6, fl.col]);
  }
}

function drawHumanoid(S, P, an, i, v, bl) {
  const C = HUM[v] || HUM.bandit;
  const p = humPose(an, i);
  const style = WSTYLE[C.wpn] || 'swing';
  const X = 20 + p.lean;
  const Y = p.bob;
  const tn = (k, d) => (k == null ? d : typeof k !== 'string' ? k : k[0] === '#' ? T(k) : P[k]);
  const skin = tn(C.skin, T(SKIN));
  const top = tn(C.top, P.a);
  const pants = tn(C.pants, P.aD);
  const boots = tn(C.boots, T('#3a2a2a'));
  const armT = tn(C.arm, top);
  const hand = tn(C.hand, skin);
  const wrapP = C.wrap ? wrapPat(C.wrap === true ? P.b : tn(C.wrap)) : null;
  const g = { X, Y, p, an, i, bl, fl: p.fl, C, skin, top, pants, boots, P };
  g.hx = X + 0.8 + (C.hunch ? 1.4 : 0) + (p.atk === 2 ? 0.6 : 0);
  g.hy = 14.6 + Y + (C.hunch ? 1 : 0);
  g.sb = [X - 3.4, 22.6 + Y];
  g.sf = [X + 3.2, 22.6 + Y];
  // vị trí tay theo dáng
  let hb = [X - 5.2 + p.sw * 0.6, 28.4 + Y];
  let hf = [X + 5.4 - p.sw * 0.6, 28 + Y];
  let wa = C.rest ?? (style === 'thrust' ? 0.3 : style === 'staff' ? 0.4 : 0.35);
  if (style === 'none' && C.armsFwd && !p.atk) { hf = [X + 9.2, 23.4 + Y + p.sw * 0.4]; hb = [X + 7.6, 24.6 + Y - p.sw * 0.4]; }
  if (p.atk === 1) {
    if (style === 'thrust') { hf = [X - 0.6, 25 + Y]; hb = [X - 5.2, 25.4 + Y]; wa = 1.62; }
    else if (style === 'staff') { hf = [X + 6, 19.6 + Y]; hb = [X - 5.6, 26 + Y]; wa = -0.15; }
    else if (style === 'none') { hf = [X + 4, 16.6 + Y]; hb = [X + 1.6, 17.6 + Y]; }
    else { hf = [X - 1.6, 17.4 + Y]; hb = [X - 6, 25.6 + Y]; wa = -1.1; }
  } else if (p.atk === 2) {
    if (style === 'thrust') { hf = [X + 7.6, 24.6 + Y]; hb = [X + 2.6, 25 + Y]; wa = 1.57; }
    else if (style === 'staff') { hf = [X + 8.2, 23.4 + Y]; hb = [X - 5.6, 25.4 + Y]; wa = 0.95; }
    else if (style === 'none') { hf = [X + 10.6, 24.6 + Y]; hb = [X + 9, 26.6 + Y]; }
    else { hf = [X + 7.6, 25.4 + Y]; hb = [X - 6.4, 23.4 + Y]; wa = 1.95; }
  }
  g.hb = hb; g.hf = hf; g.wa = wa;
  const fillP = (m, t, o) => (wrapP ? patFill(S, m, t, wrapP, o) : S.fill(m, t, o || { sh: 'edge' }));

  // lớp sau: áo choàng, cánh, khăn bay...
  if (C.back) C.back(S, P, g);
  // tay sau
  const armTh = C.thin ? 1.6 : 2.4;
  fillP(S.M().line(...g.sb, ...hb, armTh), darker(armT), { sh: 'edge' });
  S.fill(S.M().ell(hb[0], hb[1] + 0.2, C.thin ? 1.2 : 1.5, C.thin ? 1.2 : 1.5), darker(hand), { lt: 0.5 });
  if (C.backHand) C.backHand(S, P, g);
  // chân
  const leg = (x0, dx, front) => {
    const fx = x0 + dx;
    const hip = 28.4 + Y;
    const pt = front ? pants : darker(pants);
    const bt = front ? boots : darker(boots);
    if (C.thin) {
      S.fill(S.M().line(x0, hip, fx, 35.2, 1.8), pt, { sh: 'edge' });
      S.fill(S.M().rect(R(fx - 1), 35, 4, 2), pt, { sh: 'edge' });
      return;
    }
    fillP(S.M().line(x0, hip, fx, C.smoke ? 33 : 33.6, C.baggy ? 4.2 : 3), pt, { sh: 'edge' });
    if (C.smoke) {
      S.fill(S.M().ell(fx + 0.4, 34.6, 2.6, 1.6), T(C.smoke, 190), { il: 0, lt: 0.5 });
      return;
    }
    const bt0 = C.bootTop ?? 33;
    fillP(S.M().rect(R(fx - 1.5), bt0, 3, 37 - bt0).rect(R(fx - 1.5), 35, 5, 2), bt, { sh: 'edge' });
  };
  if (!C.robe) {
    leg(X - 1.8, p.lb, false);
    leg(X + 1.8, p.lf, true);
  }
  // thân
  let torso;
  if (C.robe) {
    const sw = p.atk ? -p.lean : p.sw * 0.8;
    torso = S.M().poly([X - 4.2, 20.6 + Y, X + 4.2, 20.6 + Y, X + 7.4 + sw, 36.8, X - 7.6 + sw, 36.8]).ell(X, 21.6 + Y, 4.2, 1.6);
  } else {
    torso = S.M().poly([X - 4, 20.6 + Y, X + 4, 20.6 + Y, X + 4.8, 29.6 + Y, X - 4.7, 29.6 + Y]).ell(X, 21.6 + Y, 4.2, 1.6);
  }
  g.torso = torso;
  if (C.torso) C.torso(S, P, g, torso);
  else if (wrapP) patFill(S, torso, top, wrapP);
  else S.fill(torso, top, { c: [X - 0.5, 24 + Y, 5.4, 6], lt: 0.55, dk: 0.1 });
  if (C.belt) S.fill(S.M().rect(X - 5, R(27.4 + Y), 11, 2).and(torso), tn(C.belt), { il: 2, sh: 'edge' });
  if (C.body) C.body(S, P, g);
  // tay trước + vũ khí; lúc lấy đà vũ khí giơ sau đầu nên vẽ trước đầu
  const frontArm = () => {
    fillP(S.M().line(...g.sf, ...hf, armTh), armT, { sh: 'edge' });
    if (C.wpn && C.wpn !== 'none') humWeapon(S, P, C, hf[0], hf[1], wa, g);
    S.fill(S.M().ell(hf[0], hf[1] + 0.2, C.thin ? 1.2 : 1.6, C.thin ? 1.2 : 1.6), hand, { lt: 0.5 });
    if (C.hands) C.hands(S, P, g);
  };
  const early = (p.atk === 1 && style !== 'thrust') || (C.wpnBehind && !p.atk);
  if (early) frontArm();
  // đầu
  C.head(S, P, g);
  if (!early) frontArm();
  if (C.fx) C.fx(S, P, g);
  // vệt chém
  if (p.atk === 2 && style === 'swing') {
    // vệt chém liền nét 2px: đậm dần về cuối cung, mép ngoài trắng
    const tc = C.trail || '#ffffff';
    const seen = new Set();
    for (let a = 0.5; a <= 2.35; a += 0.04) {
      const f = (a - 0.5) / 1.85;
      for (const [r, col, al] of [[13.6, WHITE, 0.4 + f * 0.55], [12.6, tc, 0.3 + f * 0.6], [11.6, tc, f * 0.45]]) {
        const x = R(g.sf[0] + Math.sin(a) * r);
        const y = R(g.sf[1] - Math.cos(a) * r);
        const key = y * 64 + x;
        if (al < 0.08 || seen.has(key)) continue;
        seen.add(key);
        S.px(x, y, col, Math.min(0.95, al));
      }
    }
  }
  if (p.atk === 2 && style === 'none') {
    for (const dy of [-3, 0, 3]) for (let k = 0; k < 4; k++) S.px(hf[0] + 3 + k, hf[1] + dy - 2 + k, C.trail || '#ffffff', 0.35 + k * 0.15);
  }
  if (!S.head[1]) S.head = [g.hx, g.hy - 6];
}

// ---------- Mảnh dùng chung cho đầu
const headM = (S, g, rx = 6.2, ry = 5.6, dy = 0) => S.M().ell(g.hx, g.hy + dy, rx, ry);
// Mắt to dễ thương + chân mày giận (quái cấp cao)
function hEyes(S, g, o = {}) {
  const ex = R(g.hx - 0.2 + (o.dx || 0));
  const ey = R(g.hy - 1 + (o.dy || 0));
  const h = o.h || 3;
  if (o.only !== 1) S.eye(ex, ey, 2, h, { blink: g.bl, col: o.col, iris: o.iris });
  if (o.only !== 0) S.eye(ex + 4, ey, 2, h, { blink: g.bl, col: o.col, iris: o.iris });
  if (o.brow) {
    const bc = o.browC ?? EYE;
    if (o.only !== 1) { S.px(ex - 1, ey - 2, bc); S.px(ex, ey - 2, bc); S.px(ex + 1, ey - 1, bc); }
    if (o.only !== 0) { S.px(ex + 6, ey - 2, bc); S.px(ex + 5, ey - 2, bc); S.px(ex + 4, ey - 1, bc); }
  }
  return [ex, ey];
}
// Mắt phát sáng (khe sáng) — dùng cho mũ giáp, bóng tối
function gEyes(S, g, t, o = {}) {
  const ex = R(g.hx - 0.2 + (o.dx || 0));
  const ey = R(g.hy - 1 + (o.dy || 0));
  const h = o.h || 2;
  for (const dx of o.one ? [4] : [0, 4]) {
    if (g.bl) { S.rc(ex + dx, ey + h - 1, 2, 1, t.dk); }
    else {
      S.rc(ex + dx, ey, 2, h, t.hi);
      S.px(ex + dx + 1, ey + h - 1, t.lt);
      if (o.white !== false) S.px(ex + dx, ey, WHITE);
    }
    S.eyes.push([ex + dx + 1, ey + h / 2]);
  }
  if (o.glow) S.glow.push([ex + (o.one ? 5 : 3), ey + 1, o.glow, t.col]);
  return [ex, ey];
}
// Hai vạt khăn buộc bay sau gáy
function knotTails(S, g, t, kx, ky, len = 5) {
  const w = [0, 0.8, 1.6, 0.8][g.fl % 4];
  S.fill(S.M().path([kx, ky, kx - len * 0.5, ky + 0.6 + w, kx - len, ky + w * 0.4], 1.6).path([kx, ky + 0.6, kx - len * 0.4, ky + 2.2 + w * 0.6, kx - len * 0.8, ky + 2.6 + w], 1.4), t, { sh: 'edge' });
}
// Khăn quàng dài bay phía sau
function scarfTail(S, g, t, len = 11, y0 = 21) {
  const { X, Y } = g;
  const f = g.fl % 4;
  const w = [[0, 1, 0], [1, 0, -1], [0, -1, 0], [-1, 0, 1]][f];
  const pts = [X - 1.5, y0 + Y, X - 1.5 - len * 0.33, y0 + 0.6 + Y + w[0], X - 1.5 - len * 0.66, y0 + 0.2 + Y + w[1], X - 1.5 - len, y0 + 1 + Y + w[2]];
  S.fill(S.M().path(pts, 2.4), t, { sh: 'edge' });
  S.fill(S.M().path([X - 1.5 - len * 0.66, y0 + 0.6 + Y + w[1], X - 2.5 - len, y0 + 3 + Y + w[2]], 1.6), darker(t), { sh: 'edge' });
}
// Áo choàng rách phía sau
function capeBack(S, g, t, o = {}) {
  const { X, Y } = g;
  const w = [0, 1, 2, 1][g.fl % 4] * (o.wave ?? 1) * 0.6;
  const b = o.bottom ?? 35.4;
  // áo choàng ôm sát lưng để bề ngang hình không vượt quá xa hitbox
  const m = S.M().poly([X - 3.8, 20.4 + Y, X + 1.4, 20.4 + Y, X - 0.4, b - 1, X - 2.4 - w * 0.3, b, X - 3.8, b - 1.6, X - 5.4 - w * 0.6, b + 0.2, X - 6.2, b - 1.8, X - 7.6 - w, b - 0.4, X - 7 - w * 0.6, 27 + Y, X - 5.4, 22 + Y]);
  if (o.pat) patFill(S, m, t, o.pat);
  else S.fill(m, t, { sh: 'v', vt: 0.25, vb: 0.75 });
  return m;
}

// ---------- Từng loài
const HUM = {
  // Sơn Tặc: khăn đỏ buộc trán, bịt mặt vải, áo gile, gậy gỗ đóng đinh
  bandit: {
    skin: '#e2a878', top: 'b', pants: 'c', boots: '#5b4636', belt: '#3a2a20', wpn: 'club', rest: 0.1,
    back(S, P, g) { knotTails(S, g, T('#c0392b'), g.hx - 5.6, g.hy - 4.4, 3.4); },
    torso(S, P, g, m) {
      const { X } = g;
      patFill(S, m, P.b, (x, y, t) => (x < X - 1.4 || x > X + 2.6 ? (x === X - 2 || x === X + 3 ? P.a.dk : P.a.md) : null));
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const hair = S.M().ell(hx - 0.6, hy - 2.4, 6.6, 4).rows(0, R(hy - 4)).poly([hx - 6.2, hy - 4, hx - 6.4, hy - 7, hx - 4, hy - 5.4, hx - 2.8, hy - 9, hx - 0.6, hy - 6, hx + 1.6, hy - 8.6, hx + 2.8, hy - 5.6, hx + 5.4, hy - 6.8, hx + 6, hy - 4]).ell(hx - 4.8, hy + 0.2, 2, 3.4);
      S.fill(hair, P.hair, { lt: 0.45 });
      S.fill(S.M().rect(hx - 7, hy - 5.4, 14, 2).and(S.M().ell(hx, hy, 6.8, 6.2)), T('#c0392b'), { sh: 'edge' });
      const mask = S.M().ell(hx + 1, hy + 3, 6, 3.4).and(hm).rows(R(hy + 1.6), 99);
      patFill(S, mask, T('#56606e'), (x, y, t) => ((x + y) % 4 === 0 ? t.dk : null));
      hEyes(S, g, { dy: -1, brow: 0 });
      S.head = [hx, hy - 9];
    },
  },
  // Hải Tặc: khăn đỏ chấm bi, bịt một mắt, áo sọc, kiếm cong
  pirate: {
    skin: '#f0c09a', top: 'b', pants: 'a', boots: '#2e2422', belt: 'c', wpn: 'cutlass', bootTop: 31, rest: 0.06,
    back(S, P, g) { knotTails(S, g, P.c, g.hx - 5.8, g.hy - 2, 3.2); },
    torso(S, P, g, m) { patFill(S, m, P.b, (x, y) => (y % 2 === 0 && y < 27 + g.Y ? P.a.md : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X + 1.4, 28.6 + Y, X + 3.4, 28.6 + Y, X + 3, 31.4 + Y, X + 1.8, 31 + Y]), P.c, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      S.fill(S.M().ell(hx - 4.6, hy + 1.2, 2, 3.4), P.hair, { lt: 0.4 });
      S.fill(headM(S, g), g.skin, { lt: 0.5 });
      const band = S.M().ell(hx - 0.3, hy - 1.6, 6.8, 5).rows(0, R(hy - 1.6));
      patFill(S, band, P.c, (x, y) => ((x * 3 + y * 5) % 7 === 0 ? T('#ffffff').md : null));
      const [ex, ey] = hEyes(S, g, { only: 1, brow: 1 });
      S.rc(ex - 1, ey, 3, 3, EYE);
      S.px(ex - 1, ey, pack(70, 60, 80));
      for (const [x, y] of [[hx - 5.4, hy - 2.4], [hx - 4, hy - 1.6], [hx - 2.6, hy - 0.8]]) S.px(x, y, EYE);
      S.rc(ex + 1, ey + 4, 3, 1, EYE);
      S.px(ex + 2, ey + 4, WHITE);
      for (const [x, y] of [[0, 5], [3, 5], [5, 4], [-1, 4]]) S.px(ex + x, ey + y, P.hair.md, 0.35);
      S.px(R(hx - 3), R(hy + 2.4), GOLD);
      S.px(R(hx - 3), R(hy + 3.4), '#ffe082');
      S.head = [hx, hy - 6.6];
    },
  },
  // Bộ Xương: đầu lâu, xương sườn, khiên gỗ, kiếm gỉ
  skeleton: {
    skin: 'a', top: 'a', pants: 'a', hand: 'a', arm: 'a', thin: true, wpn: 'sword', blade: '#a08670', grip: '#5b3d2a', guard: '#8a8f99',
    backHand(S, P, g) {
      const [x, y] = g.hb;
      S.fill(S.M().ell(x - 1, y - 1, 3.6, 4.2), T('#8a8f99'), { lt: 0.5 });
      S.fill(S.M().ell(x - 1, y - 1, 2.6, 3.2), T(WOOD), { il: 2, lt: 0.5 });
      S.fill(S.M().rect(R(x - 1.5), R(y - 1.5), 1, 1), T('#cfd6e0'), { il: 1, sh: 'flat' });
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      const cage = S.M().ell(X, 23.4 + Y, 4, 3.4);
      patFill(S, cage, P.a, (x, y, t) => (x === R(X) ? t.lt : (y - R(Y)) % 2 === 0 ? T('#3b3442').md : null));
      S.fill(S.M().line(X, 26 + Y, X, 28 + Y, 1.6), P.a, { sh: 'edge' });
      S.fill(S.M().ell(X, 28.6 + Y, 3.4, 1.4), P.a, { sh: 'edge' });
      const cloth = S.M().poly([X - 3.6, 28.6 + Y, X + 3.8, 28.6 + Y, X + 3.4, 31.6 + Y, X + 2, 30.4 + Y, X + 0.6, 32 + Y, X - 0.8, 30.4 + Y, X - 2.4, 31.8 + Y, X - 3.6, 30.4 + Y]);
      S.fill(cloth, T('#4b3b4f'), { sh: 'v', vt: 0.3, vb: 0.7 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const sk = S.M().ell(hx, hy - 0.6, 6, 5.2).rect(hx - 1, hy + 2.6, 6.4, 2.6);
      S.fill(sk, P.a, { lt: 0.5, c: [hx, hy, 6, 5.6] });
      const ex = R(hx - 0.4);
      const ey = R(hy - 1.2);
      for (const dx of [0, 4]) {
        S.rc(ex + dx, ey, 2, 3, pack(43, 33, 52));
        S.rc(ex + dx - (dx ? 0 : 1), ey + 1, 1, 1, pack(43, 33, 52));
        if (!g.bl) { S.px(ex + dx + 1, ey + 1, '#ff5252'); S.eyes.push([ex + dx + 1.5, ey + 1.5]); }
      }
      S.px(ex + 3, ey + 3, pack(43, 33, 52));
      for (let k = 0; k < 5; k += 2) S.px(R(hx) + k, R(hy + 3.6), P.a.dk);
      S.rc(R(hx), R(hy + 2.6), 6, 1, P.a.dk);
      S.px(R(hx - 3), R(hy - 4), P.a.dk); S.px(R(hx - 2), R(hy - 3), P.a.dk); S.px(R(hx - 2), R(hy - 2), P.a.dk);
      S.head = [hx, hy - 6];
    },
  },
  // Đạo Tặc Sa Mạc: khăn xếp có ngọc, mạng che mặt, quần ống túm, dao cong
  sandbandit: {
    skin: '#c98d5a', top: 'b', pants: 'a', boots: '#6d4c41', baggy: true, wpn: 'dagger', bootTop: 34, rest: 0.2,
    back(S, P, g) { knotTails(S, g, P.a, g.hx - 5.8, g.hy - 2.6, 3.6); },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, P.b, (x, y) => (Math.abs((x - X) + (y - 24 - Y)) <= 1 ? (x - X + y - 24 - Y === 1 ? P.c.dk : P.c.md) : null));
    },
    belt: 'c',
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().rect(R(X - 3), R(27 + Y), 1, 2).rect(R(X - 1), R(27 + Y), 1, 2), T(STEEL), { il: 1, sh: 'flat' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const tur = S.M().ell(hx - 0.6, hy - 3, 7, 4.4).rows(0, R(hy - 0.8)).ell(hx - 1.2, hy - 5.6, 4.6, 2.6);
      patFill(S, tur, P.a, (x, y, t) => ((x - y * 2) % 5 === 0 ? t.dk : null));
      S.fill(S.M().ell(hx + 3.2, hy - 3.4, 1.3, 1.5), P.c, { lt: 0.4 });
      S.fill(S.M().rect(R(hx + 3), R(hy - 5.6), 1, 1), T(GOLD), { sh: 'flat' });
      const veil = S.M().ell(hx + 1.4, hy + 3, 6, 3.4).and(hm).rows(R(hy + 1.2), 99).poly([hx - 3, hy + 3, hx - 5.6, hy + 7, hx - 2, hy + 5]);
      patFill(S, veil, P.c, null);
      const [ex, ey] = hEyes(S, g, { dy: -0.6, h: 2, brow: 1 });
      S.px(ex - 1, ey + 1, EYE); S.px(ex + 6, ey + 1, EYE);
      S.head = [hx, hy - 8];
    },
  },
  // Xác Ướp: băng quấn khắp người, một mắt xanh lộ ra, giơ tay về trước
  mummy: {
    skin: 'a', top: 'a', pants: 'a', boots: 'a', arm: 'a', hand: 'a', wrap: true, wpn: 'none', armsFwd: true, trail: '#a5d6a7',
    back(S, P, g) {
      const { X, Y } = g;
      const w = [0, 1, 2, 1][g.fl % 4];
      S.fill(S.M().path([X - 3, 26 + Y, X - 5.4, 27.4 + Y + w * 0.5, X - 7.6, 26.6 + Y + w], 1.4).path([X - 2, 20.6 + Y, X - 4.6, 19.6 + Y - w * 0.3, X - 7, 20.6 + Y + w * 0.4], 1.2), P.b, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g, 6, 5.6);
      patFill(S, hm, P.a, wrapPat(P.b));
      const ex = R(hx + 3.6);
      const ey = R(hy - 1.4);
      S.rc(ex - 1, ey - 1, 4, 4, pack(43, 33, 40));
      // mắt hồn xanh 2x2 sáng rực: điểm nhấn duy nhất trên đầu toàn băng
      if (!g.bl) { S.rc(ex, ey, 2, 2, P.c.hi); S.px(ex, ey, WHITE); S.px(ex + 1, ey + 1, P.c.lt); S.px(ex + 2, ey, P.c.md, 0.6); S.eyes.push([ex + 1, ey + 1]); S.glow.push([ex + 1, ey + 1, 5, P.c.col]); }
      else S.rc(ex, ey + 1, 2, 1, P.c.dk);
      S.px(R(hx - 0.2), R(hy), pack(43, 33, 40)); S.px(R(hx + 0.8), R(hy), pack(43, 33, 40));
      S.rc(R(hx + 1), R(hy + 3), 3, 1, pack(43, 33, 40));
      const w = [0, 1, 2, 1][g.fl % 4];
      S.fill(S.M().path([hx - 5, hy + 1, hx - 6.8, hy + 3 + w * 0.5, hx - 8, hy + 2.4 + w], 1.3), P.b, { sh: 'edge' });
      S.head = [hx, hy - 5.6];
    },
  },
  // Xác Ướp Nguyền: áo choàng mũ trùm rách, hai mắt lửa xanh, ấn nguyền trên ngực, đèn lồng hồn
  cursedmummy: {
    skin: 'a', top: 'a', pants: 'a', boots: 'a', arm: 'a', hand: 'a', wrap: true, wpn: 'lantern', flame: '#c6ff00', hunch: true, rest: 0.02,
    back(S, P, g) { capeBack(S, g, CLOAK, { bottom: 35.6, pat: (x, y, t) => ((x + y) % 6 === 0 ? t.dk : null) }); },
    body(S, P, g) {
      const { X, Y } = g;
      const c = T('#c6ff00');
      for (const [x, y] of [[0, 0], [1, -1], [1, 1], [2, 0], [1, 0], [1, -2], [1, 2]]) S.px(X + x, 23 + Y + y, x === 1 && y === 0 ? WHITE : c.md, 0.95);
      S.glow.push([X + 1, 23 + Y, 4, P.c.col]);
      // mũ trùm vai
      S.fill(S.M().ell(X - 0.6, 21.6 + Y, 5.4, 2.2), CLOAK, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hood = S.M().ell(hx - 1, hy - 0.8, 6.6, 6.4);
      patFill(S, hood, CLOAK, (x, y, t) => ((x * 2 + y) % 7 === 0 ? t.dk : null));
      // ấn nguyền xanh trên trán mũ trùm
      S.px(hx - 3, hy - 5, P.c.hi); S.px(hx - 4, hy - 4, P.c.md); S.px(hx - 2, hy - 4, P.c.md);
      const face = S.M().ell(hx + 1.8, hy + 1, 4.4, 4.2).and(hood);
      patFill(S, face, P.a, wrapPat(P.bD));
      S.fill(S.M().ell(hx + 1.6, hy + 0.4, 3.6, 2.2).and(face), T('#2a2228'), { il: 0, sh: 'flat' });
      const t = P.c;
      gEyes(S, g, { ...t, hi: T('#e6ff8a').md }, { dx: 0.4, dy: 0.2, glow: 6 });
      S.head = [hx - 1, hy - 7.2];
    },
  },
  // Ninja Lang Thang: nón lá rộng vành, bịt mặt, khăn đỏ dài, katana + vỏ kiếm sau lưng
  rogue: {
    skin: '#eac09a', top: 'a', pants: 'a', boots: '#1d1820', wpn: 'katana', grip: '#b71c1c', belt: 'b', trail: '#ffcdd2', rest: 0.08,
    back(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().line(X - 5.6, 29.4 + Y, X + 1.6, 19.4 + Y, 1.8), T('#2b2024'), { sh: 'edge' });
      scarfTail(S, g, P.b, 6.4, 21);
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X + 1) && y < 27 + g.Y ? P.a.lt : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().ell(X + 0.2, 21 + Y, 5, 1.8), P.b, { sh: 'edge' });
      for (const lx of [X - 1.8 + g.p.lb, X + 1.8 + g.p.lf]) S.fill(S.M().rect(R(lx - 1.5), 32, 3, 1), P.c, { il: 0, sh: 'flat' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      S.fill(S.M().ell(hx + 0.8, hy + 3, 6.2, 3.6).and(hm).rows(R(hy + 2), 99).ell(hx - 3, hy + 1, 3.4, 4.6), P.a, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 6), R(hy - 1), 13, 1).and(hm), { ...g.skin, md: g.skin.dk }, { il: 0, sh: 'flat' });
      const [ex, ey] = hEyes(S, g, { dy: 0.4, h: 2, brow: 0 });
      S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE);
      const straw = T('#cda55e');
      const hat = S.M().poly([hx - 7.8, hy - 1.4, hx - 1.2, hy - 8.6, hx + 0.8, hy - 8.6, hx + 8, hy - 1.4, hx + 7, hy - 0.4, hx - 7, hy - 0.4]);
      patFill(S, hat, straw, (x, y, t) => ((x - R(hx)) % 3 === 0 && y > hy - 7 ? t.dk : y === R(hy - 2) ? T('#7a2a24').md : null));
      S.head = [hx, hy - 9];
    },
  },
  // Ninja Băng: mũ trùm trắng gắn pha lê băng, mắt xanh, khăn xanh, kunai băng
  iceninja: {
    skin: '#f6dfd0', top: 'a', pants: 'b', boots: 'c', belt: 'c', wpn: 'kunai', blade: '#bff4ff', grip: '#01579b', trail: '#b3e5fc',
    back(S, P, g) { scarfTail(S, g, P.b, 6.6, 21.4); },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X + 0.5) ? P.b.md : null)); },
    body(S, P, g) {
      S.fill(S.M().ell(g.X + 0.2, 21 + g.Y, 4.8, 1.7), P.b, { sh: 'edge' });
      crystal(S, g.sf[0] + 1, g.sf[1] - 0.6, 0.9, 2.4, 4.4, P.ice);
      crystal(S, g.sf[0] - 0.4, g.sf[1] - 1, 0.3, 2, 3.4, P.ice);
    },
    fx(S, P, g) {
      if (g.p.atk === 2) S.glow.push([g.hf[0] + 4, g.hf[1], 6, P.b.col]);
      const f = g.fl % 4;
      for (const [x, y] of [[6, 6], [9, 2], [-8, 4], [8, 12]]) if ((x + f) % 3) S.px(g.X + x + f * 0.4, g.Y + 18 + y - f, WHITE, 0.6);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      // chóp mũ trùm vắt ra sau gáy
      S.fill(S.M().poly([hx - 3, hy - 5, hx - 7.2, hy - 1.4 + (g.fl % 2) * 0.6, hx - 5, hy + 1]), P.a, { sh: 'edge' });
      const hm = headM(S, g, 6.4, 5.8);
      S.fill(hm, P.a, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 6), R(hy - 4), 13, 2).and(hm), P.c, { il: 2, sh: 'edge' });
      // ngọc băng hình thoi trên băng đô
      const gx = R(hx + 3);
      const gy = R(hy - 4);
      S.px(gx, gy - 1, WHITE); S.px(gx - 1, gy, T('#8fe3ff').hi); S.px(gx, gy, WHITE); S.px(gx + 1, gy, T('#8fe3ff').md); S.px(gx, gy + 1, T('#8fe3ff').md);
      S.glow.push([gx + 0.5, gy + 0.5, 4, '#8fe3ff']);
      S.fill(S.M().rect(R(hx - 1), R(hy - 2.2), 8, 4).and(S.M().ell(hx + 0.6, hy, 6, 5.4)), g.skin, { il: 1, sh: 'edge' });
      S.fill(S.M().ell(hx + 1, hy + 3.6, 6, 2.6).and(hm).rows(R(hy + 2), 99), P.b, { sh: 'edge' });
      hEyes(S, g, { dy: -0.8, h: 2, col: P.c.dk, iris: P.b.hi, brow: 1, browC: P.c.md });
      S.head = [hx, hy - 9];
    },
  },
  // Ảnh Ninja: thân bóng tối viền tím, mắt khe hồng phát sáng, chân tan thành khói
  shadow: {
    top: 'a', pants: 'a', arm: 'a', hand: 'a', smoke: '#6a1b9a', rest: 0.2, wpn: 'dagger', blade: '#2b2440', grip: '#120c1c', guard: '#e040fb', trail: '#e040fb',
    back(S, P, g) {
      scarfTail(S, g, P.b, 6.4, 20.6);
      const f = g.fl % 4;
      for (let k = 0; k < 5; k++) S.px(g.X - 5 + k * 2.6, 36 - ((k * 3 + f * 2) % 6), P.b.lt, 0.5);
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X - 4) && y < 27 + g.Y ? P.b.md : null)); },
    body(S, P, g) { S.fill(S.M().ell(g.X + 0.2, 21 + g.Y, 4.8, 1.7), P.b, { sh: 'edge' }); },
    fx(S, P, g) {
      const [x, y] = g.hf;
      S.glow.push([x + Math.sin(g.wa) * 4, y - Math.cos(g.wa) * 4, 5, P.c.col]);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      patFill(S, hm, P.a, (x, y, t) => {
        const i = y * S.w + x;
        return !hm.m[i - S.w] || !hm.m[i - 1] ? P.b.md : null;
      });
      S.fill(S.M().poly([hx - 5, hy - 3, hx - 7.6, hy - 1 + (g.fl % 2), hx - 5.6, hy]), P.a, { sh: 'edge' });
      gEyes(S, g, P.c, { dy: 0, h: 1, glow: 6, white: false });
      S.head = [hx, hy - 5.6];
    },
  },
  // Quỷ Võ Sĩ: giáp lá đỏ, mũ trụ sừng chữ V có đĩa đỏ, mặt nạ quỷ nanh trắng, mắt vàng
  samurai: {
    skin: '#d9a080', top: 'a', pants: '#2a1618', boots: '#1d1418', arm: 'a', hand: '#2a1618', wpn: 'katana', len: 12.5, grip: '#b71c1c', trail: '#ffe082', rest: 0.1,
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => ((y - R(g.Y)) % 2 === 0 && y > 21 + g.Y ? P.b.md : x === R(g.X) && y > 21 ? P.c.dk : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      const sk = S.M().poly([X - 5, 27.4 + Y, X + 5.2, 27.4 + Y, X + 6, 31.6 + Y, X - 5.8, 31.6 + Y]);
      patFill(S, sk, P.a, (x, y) => (x === R(X - 2) || x === R(X + 2) ? P.a.ol : (y - R(Y)) % 2 === 1 ? P.b.md : null));
      const [sx, sy] = g.sf;
      const sode = S.M().poly([sx - 1.6, sy - 1.6, sx + 2.6, sy - 1.6, sx + 3.4, sy + 3.6, sx - 1, sy + 3.6]);
      patFill(S, sode, P.a, (x, y) => ((y - R(sy)) % 2 === 0 ? P.b.md : null));
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const gold = T(GOLD);
      S.fill(S.M().path([hx + 0.6, hy - 5, hx - 2, hy - 6.4, hx - 3.4, hy - 7.8], 1.5).path([hx + 0.6, hy - 5, hx + 3.2, hy - 6.4, hx + 4.6, hy - 7.8], 1.5), gold, { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const shk = S.M().poly([hx - 6.4, hy - 2, hx - 9, hy + 3.4, hx - 7.4, hy + 4.4, hx - 3.4, hy + 2, hx - 2, hy - 1.4]);
      patFill(S, shk, P.a, (x, y) => ((y - R(hy)) % 2 === 0 ? P.b.md : null));
      const dome = S.M().ell(hx - 0.2, hy - 1.4, 6.9, 5.8).rows(0, R(hy - 1.6));
      patFill(S, dome, P.a, (x, y) => (y === R(hy - 4) ? P.b.md : null));
      S.fill(S.M().rect(R(hx - 2), R(hy - 1.6), 10, 1), gold, { sh: 'edge' });
      S.fill(S.M().ell(hx + 0.6, hy - 6, 1.8, 1.8), gold, { lt: 0.4 });
      S.fill(S.M().ell(hx + 0.6, hy - 6, 0.9, 0.9), P.b, { il: 0, lt: 0.4 });
      const menpo = S.M().ell(hx + 1.2, hy + 3, 5.6, 3.2).and(hm).rows(R(hy + 1.2), 99);
      S.fill(menpo, P.b, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 2), R(hy - 0.6), 9, 2).and(hm), T('#24121a'), { il: 0, sh: 'flat' });
      const [ex, ey] = gEyes(S, g, P.c, { dy: 0.4, h: 1, glow: 3 });
      S.rc(ex + 1, ey + 3, 4, 1, EYE);
      S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE);
      S.px(ex + 1, ey + 4, WHITE, 0.8); S.px(ex + 4, ey + 4, WHITE, 0.8);
      S.head = [hx, hy - 9];
    },
  },
  // Tử Thần Kỵ Sĩ: giáp thép đen, mũ kín khe chữ T lửa xanh, áo choàng rách xanh, lưỡi hái
  deathknight: {
    top: '#3a3f47', pants: '#3a3f47', boots: 'a', arm: '#3a3f47', hand: 'a', wpn: 'scythe', blade: '#dfe5ee', edge: '#76ff03', pole: '#5a4650', guard: '#8a93a3', trail: '#ccff90', rest: 0.04, len: 20.2, wpnBehind: true,
    back(S, P, g) { capeBack(S, g, P.b, { pat: (x, y, t) => ((x * 3 + y) % 9 === 0 ? t.dk : null) }); },
    body(S, P, g) {
      const { X, Y } = g;
      const c = P.c;
      for (let y = 22; y <= 26; y++) S.px(X + 0.5, y + Y, y === 24 ? WHITE : c.hi, 0.95);
      S.px(X - 0.5, 24 + Y, c.md); S.px(X + 1.5, 24 + Y, c.md);
      S.glow.push([X + 0.5, 24 + Y, 4, c.col]);
      const [sx, sy] = g.sf;
      crystal(S, sx + 0.2, sy - 1.6, 0.3, 1.8, 3.4, T('#cfd6e0'));
      S.fill(S.M().ell(sx + 0.6, sy - 0.2, 3, 2.4), T('#3a3f47'), { lt: 0.45 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const steel = T('#5a626e');
      // mào thép thấp vắt ra sau (thay cho sừng nhỏ dễ nhìn thành tai)
      S.fill(S.M().poly([hx - 1, hy - 5.4, hx - 7.6, hy - 4.4, hx - 4, hy - 2.6]), T('#3a3f47'), { sh: 'edge' });
      const hm = S.M().ell(hx, hy - 0.6, 6.3, 5.8).rect(hx - 5.6, hy, 11.6, 4.8);
      S.fill(hm, steel, { lt: 0.5, c: [hx, hy, 6.4, 6] });
      S.fill(S.M().rect(R(hx - 6), R(hy - 4), 12, 1).and(hm), { ...steel, md: steel.lt }, { il: 0, sh: 'flat' });
      // khe mũ chữ T sắc nét: ngang 7px, dọc 3px, lửa xanh lõi trắng
      const tx = R(hx - 0.6);
      const ty = R(hy - 1.4);
      S.rc(tx - 1, ty - 1, 9, 3, pack(18, 12, 20));
      S.rc(R(hx + 2), ty + 1, 3, 4, pack(18, 12, 20));
      if (!g.bl) {
        S.rc(tx, ty, 7, 1, P.c.hi);
        S.rc(R(hx + 3), ty + 1, 1, 3, P.c.md);
        S.px(tx + 1, ty, WHITE); S.px(tx + 5, ty, WHITE);
      } else S.rc(tx, ty, 7, 1, P.c.dk);
      S.eyes.push([tx + 1.5, ty + 0.5], [tx + 5.5, ty + 0.5]);
      S.glow.push([hx + 2.5, hy - 1, 5, P.c.col]);
      S.head = [hx, hy - 7];
    },
  },
  // Thiên Binh: giáp vàng áo trắng, mũ có cánh và chùm lông, cánh nhỏ sau lưng, giáo tua đỏ
  celestial: {
    skin: '#f6d2b4', top: 'a', pants: '#283593', boots: 'b', belt: 'c', wpn: 'spear', pole: '#ffd600', tassel: '#e53935', rest: 0.1,
    back(S, P, g) {
      const up = [0, 0.15, 0.3, 0.15][g.fl % 4];
      featherWing(S, g.X - 2, 22.4 + g.Y, 8.5, up, T('#ffffff'), T('#ffe9a8'), 4);
      const f = g.fl % 4;
      S.fill(S.M().ell(g.X - 5 + f * 0.3, 35.6, 3.4, 1.4).ell(g.X + 5 - f * 0.3, 35.8, 3, 1.2), T('#ffffff', 170), { il: 0, lt: 0.4 });
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, P.a, (x, y) => (y < 26 + Y && Math.abs(x - X - 0.4) < 4 - (y - 21 - Y) * 0.3 ? (y === R(21 + Y) ? P.b.hi : P.b.md) : null));
    },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X - 0.6, 28.6 + Y, X + 2.6, 28.6 + Y, X + 2.2, 32.4 + Y, X - 0.2, 32.4 + Y]), T('#e53935'), { sh: 'edge' });
      S.fill(S.M().ell(g.sf[0] + 0.4, g.sf[1] - 0.2, 2.8, 2), P.b, { lt: 0.45 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      // chùm lông đỏ trên đỉnh mũ: điểm nhấn đậm trên nền trời sáng
      S.fill(S.M().path([hx, hy - 5.6, hx - 2.6, hy - 8, hx - 6, hy - 7.6, hx - 7.6, hy - 6], 2), T('#e53935'), { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const helm = S.M().ell(hx - 0.2, hy - 1.6, 6.8, 5.4).rows(0, R(hy - 1.8)).rect(hx - 6.6, hy - 2, 2.6, 5.4);
      S.fill(helm, P.b, { lt: 0.5, c: [hx, hy - 1.6, 6.8, 5.4] });
      S.fill(S.M().rect(R(hx - 1), R(hy - 2), 8, 1), T('#ffe57f'), { sh: 'edge', il: 2 });
      S.fill(S.M().ell(hx + 2.4, hy - 4.2, 1.2, 1.2), T('#e53935'), { lt: 0.4 });
      featherWing(S, hx - 5, hy - 2.6, 3.6, 0.1, T('#ffffff'), null, 3);
      hEyes(S, g, { dy: 0, brow: 1 });
      S.px(R(hx + 2), R(hy + 3.4), EYE); S.px(R(hx + 3), R(hy + 3.4), EYE);
      S.head = [hx, hy - 9];
    },
  },
  // Hư Không Kỵ Sĩ: giáp đen nứt sáng lam, mũ sừng tím, áo choàng sao, đại kiếm hư không
  voidknight: {
    top: '#262640', pants: '#262640', boots: 'a', arm: '#262640', hand: 'a', wpn: 'greatsword', blade: '#1f1f38', edge: '#00e5ff', guard: '#651fff', grip: '#120c1c', trail: '#84ffff', rest: 0.12,
    back(S, P, g) {
      const m = capeBack(S, g, P.b, { wave: 1.2, pat: (x, y, t) => (((x * 7 + y * 13) % 23 === 0) ? WHITE : (x * 5 + y * 3) % 17 === 0 ? T('#b388ff').md : null) });
      return m;
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, T('#262640'), (x, y) => ((x === R(X - 1) && y > 22 + Y && y < 25 + Y) || (y === R(25 + Y) && x >= R(X - 1) && x <= R(X + 1)) || (x === R(X + 2) && y >= 25 + Y && y < 28 + Y) ? P.c.md : null));
      S.glow.push([X + 0.5, 25 + Y, 4, P.c.col]);
    },
    body(S, P, g) {
      const [sx, sy] = g.sf;
      S.fill(S.M().ell(sx + 0.6, sy - 0.2, 3, 2.4), T('#262640'), { lt: 0.45 });
      S.fill(S.M().rect(R(sx - 1), R(sy - 0.4), 4, 1), P.c, { il: 0, sh: 'flat' });
    },
    fx(S, P, g) {
      const f = g.fl % 4;
      for (const [x, y] of [[-9, 14], [8, 10], [10, 18], [-10, 24]]) S.px(g.X + x, g.Y + y - f * 0.6, P.c.lt, 0.7);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const horn = P.b;
      S.fill(S.M().path([hx - 3, hy - 4, hx - 6.2, hy - 6, hx - 6, hy - 7.8], 2).path([hx + 2.6, hy - 4.4, hx + 4.6, hy - 6.4, hx + 3.8, hy - 7.8], 2), horn, { sh: 'edge' });
      const steel = T('#2e2e4a');
      const hm = S.M().ell(hx, hy - 0.6, 6.3, 5.8).rect(hx - 5.6, hy, 11.6, 4.6);
      S.fill(hm, steel, { lt: 0.5, c: [hx, hy, 6.4, 6] });
      S.fill(S.M().rect(R(hx - 1.4), R(hy - 1), 9, 2).and(hm), T('#05050c'), { il: 0, sh: 'flat' });
      if (!g.bl) {
        S.rc(R(hx - 0.6), R(hy - 0.6), 7, 1, P.c.hi);
        S.px(R(hx + 1), R(hy - 0.6), WHITE); S.px(R(hx + 5), R(hy - 0.6), WHITE);
      }
      S.eyes.push([hx + 1, hy - 0.4], [hx + 5, hy - 0.4]);
      S.glow.push([hx + 3, hy - 0.4, 5, P.c.col]);
      S.head = [hx, hy - 7];
    },
  },
  // Long Vệ: giáp vảy lam ngọc, vây vai, mũ đầu rồng sừng vàng, chĩa ba vàng
  dragonguard: {
    skin: '#e8b892', top: 'a', pants: 'aD', boots: '#123a33', belt: 'c', wpn: 'trident', pole: '#ffd600', rest: 0.08,
    back(S, P, g) { capeBack(S, g, P.b, { bottom: 33.4, pat: (x, y, t) => ((x + (y % 2) * 2) % 4 === 0 && y % 2 === 0 ? t.dk : null) }); },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? P.b.md : null)); },
    body(S, P, g) {
      const [sx, sy] = g.sf;
      S.fill(S.M().poly([sx - 2, sy + 1.6, sx - 1, sy - 3.4, sx + 0.8, sy - 1.4, sx + 2.4, sy - 4.2, sx + 4, sy + 1]), P.b, { sh: 'facet', fx: sx + 1 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const gold = P.c;
      S.fill(S.M().path([hx - 2.6, hy - 4, hx - 5.6, hy - 6.2, hx - 7.2, hy - 6], 1.6).path([hx - 0.6, hy - 5, hx - 3, hy - 7.4, hx - 5, hy - 7.8], 1.6), gold, { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const helm = S.M().ell(hx - 0.4, hy - 1.6, 6.8, 5.6).rows(0, R(hy - 1.6)).rect(hx - 6.8, hy - 2, 3, 5.6)
        .poly([hx - 1, hy - 2.6, hx + 7.4, hy - 3.4, hx + 8.6, hy - 1.6, hx + 6.4, hy - 0.8, hx - 1, hy - 1]);
      patFill(S, helm, P.a, (x, y) => ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? P.b.md : null));
      S.fill(S.M().poly([hx - 3, hy - 5.8, hx - 1, hy - 7.8, hx + 1.4, hy - 6.2]), P.b, { sh: 'facet', fx: hx - 0.6 });
      for (const x of [2, 4, 6]) S.px(R(hx + x), R(hy - 1), gold.hi);
      S.px(R(hx + 5), R(hy - 3.4), P.c.md);
      hEyes(S, g, { dy: 0.4, h: 2, brow: 0 });
      S.rc(R(hx + 2), R(hy + 3.4), 2, 1, EYE);
      S.head = [hx, hy - 9];
    },
  },
  // ===== BOSS =====
  // Ma Thần: sừng cừu xoắn, mắt thứ ba, áo bào dài cổ cao gai, gậy ngọc máu
  boss_god: {
    skin: '#9f86c0', top: GOD_ROBE, arm: GOD_ROBE, robe: true, wpn: 'orb', pole: '#2a2133', whead: '#6200ea', orb: '#ff1744',
    back(S, P, g) {
      const { X, Y, hx, hy } = g;
      const w = [0, 1, 2, 1][g.fl % 4];
      const cape = S.M().poly([X - 4.4, 20 + Y, X + 2, 20 + Y, X + 1, 36.6, X - 3, 35.4, X - 6.4 - w * 0.4, 36.8, X - 9, 35, X - 11.6 - w, 36.4, X - 9.6 - w * 0.5, 26 + Y]);
      S.fill(cape, P.b, { sh: 'v', vt: 0.2, vb: 0.7 });
      S.fill(S.M().poly([hx - 4, hy + 5.4, hx - 9.4, hy - 4, hx - 6.4, hy + 0.4, hx - 5.8, hy - 6.4, hx - 3.8, hy + 0.6, hx - 1.4, hy - 5, hx - 0.8, hy + 4.4]), P.b, { sh: 'facet', fx: hx - 5 });
          },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, GOD_ROBE, (x, y) => (y >= 34 || Math.abs(x - X - 0.6) < 0.6 && y > 24 + Y ? P.b.md : y === 33 ? P.c.dk : null));
      S.fill(S.M().rect(X - 5, R(26 + Y), 11, 2).and(m), T(GOLD), { il: 2, sh: 'edge' });
      S.fill(S.M().ell(X + 0.4, 27 + Y, 1.2, 1.2), P.c, { il: 1, lt: 0.4 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const horn = T('#3a2d44');
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      S.fill(S.M().ell(hx - 0.6, hy - 2.8, 6.6, 3.8).rows(0, R(hy - 3.4)).ell(hx - 4.8, hy - 0.4, 1.8, 3), T('#4a2a6a'), { lt: 0.45 });
      S.fill(S.M().path([hx - 3, hy - 3.6, hx - 4.6, hy - 8, hx - 8, hy - 9.6, hx - 10.6, hy - 8], 2.6).path([hx - 10.6, hy - 8, hx - 10.4, hy - 5.4, hx - 8.6, hy - 4.8], 1.6), horn, { sh: 'edge' });
      S.fill(S.M().path([hx + 2.6, hy - 4.4, hx + 3.6, hy - 9, hx + 6.6, hy - 11, hx + 9.4, hy - 9.6], 2.6).path([hx + 9.4, hy - 9.6, hx + 10, hy - 7], 1.6), horn, { sh: 'edge' });
      S.fill(S.M().ell(hx - 10.4, hy - 7.6, 1, 1).ell(hx + 9.8, hy - 8.6, 1, 1), P.c, { il: 0, lt: 0.4 });
      const [ex, ey] = gEyes(S, g, P.c, { dy: 0, h: 2, glow: 4 });
      // mắt thứ ba hình thoi 3px có viền tối và điểm sáng
      const tx = ex + 3;
      const ty = ey - 3;
      for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]]) S.px(tx + dx, ty + dy, EYE);
      S.px(tx, ty - 1, P.c.hi); S.px(tx - 1, ty, P.c.md); S.px(tx + 1, ty, P.c.md); S.px(tx, ty + 1, P.c.dk);
      S.px(tx, ty, WHITE);
      S.eyes.push([tx + 0.5, ty + 0.5]);
      S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE);
      S.rc(ex + 1, ey + 3, 4, 1, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE);
      S.head = [hx, hy - 11];
    },
  },
  // Pharaoh Phục Sinh: khăn nemes sọc vàng lam, rắn hổ mang trên trán, vòng cổ usekh, thân băng quấn, gậy móc
  boss_pharaoh: {
    skin: '#8d6e63', top: BANDAGE, pants: BANDAGE, boots: BANDAGE, arm: BANDAGE, hand: '#8d6e63', wrap: '#bfae82', wpn: 'crook', whead: '#ffd54f', band: '#1565c0',
    back(S, P, g) {
      const { hx, hy } = g;
      const lap = S.M().poly([hx - 6.4, hy - 2.4, hx - 8.4, hy + 7.4, hx - 3.4, hy + 7.8, hx - 2.6, hy + 1]);
      patFill(S, lap, P.a, (x, y) => (y % 2 === 0 ? P.b.md : null));
    },
    body(S, P, g) {
      const { X, Y } = g;
      const col = S.M().ell(X + 0.4, 21 + Y, 5.8, 3.4).rows(R(20.4 + Y), 99);
      patFill(S, col, P.a, (x, y) => ((y - R(Y)) % 2 === 0 ? P.b.md : null));
      const kilt = S.M().poly([X - 4.8, 27.2 + Y, X + 5, 27.2 + Y, X + 6, 31.8 + Y, X - 5.4, 31.8 + Y]);
      patFill(S, kilt, T('#fff3d6'), (x, y) => (y <= 28 + Y ? P.b.md : (x - R(X)) % 2 === 0 ? P.a.dk : null));
      S.fill(S.M().rect(R(X), R(27.2 + Y), 2, 2), P.a, { il: 1, sh: 'edge' });
    },
    hands(S, P, g) { S.fill(S.M().rect(R(g.hf[0] - 1.4), R(g.hf[1] - 2.6), 3, 1), P.a, { il: 1, sh: 'flat' }); },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g, 5.8, 5.6);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const nem = S.M().ell(hx - 0.6, hy - 1.6, 7, 5.6).rows(0, R(hy - 1.4)).rect(hx - 7, hy - 2, 4.2, 6.6);
      patFill(S, nem, P.a, (x, y) => (y % 2 === 0 ? P.b.md : null));
      S.fill(S.M().rect(R(hx - 2), R(hy - 2.4), 9, 1), T('#fff3a0'), { sh: 'flat', il: 2 });
      S.fill(S.M().path([hx + 3.4, hy - 2.6, hx + 3.6, hy - 5.4, hx + 4.8, hy - 6.4, hx + 5.6, hy - 5.6], 1.4).ell(hx + 5.4, hy - 5.8, 1.1, 0.9), P.a, { sh: 'edge' });
      S.px(R(hx + 5.6), R(hy - 6.2), '#ff1744');
      S.fill(S.M().rect(R(hx + 2.6), R(hy + 4.4), 2, 3.4), P.a, { sh: 'edge' });
      gEyes(S, g, T('#4fc3f7'), { dy: -0.6, h: 2, glow: 4 });
      S.head = [hx, hy - 7.4];
    },
  },
  // Thiên Ma: đôi cánh đen rộng đầu đỏ, vầng hào quang vàng vỡ, tóc đỏ dài, sừng nhỏ, kiếm lửa
  boss_heaven: {
    skin: '#d7a796', top: HEAVEN_ROBE, pants: HEAVEN_ROBE, boots: 'b', arm: HEAVEN_ROBE, hand: '#2a1418', belt: 'c', wpn: 'greatsword', blade: '#e64a19', edge: '#fff176', edge1: true, guard: '#ffd600', grip: '#2a1418', trail: '#ff8a65',
    back(S, P, g) {
      const { X, Y, hx, hy } = g;
      const up = [0, 0.2, 0.4, 0.2][g.fl % 4];
      const rim = T('#9c8aa8').md;
      featherWing(S, X + 1, 21 + Y, 12, up, T('#1f1a22'), T('#8e1426'), 4, 1, 0.94, rim);
      featherWing(S, X - 2, 21.4 + Y, 15, up, T('#262030'), T('#b0182e'), 5, -1, 0.94, rim);
      // hào quang vỡ: vòng mảnh 1px tách khỏi tóc, hở một khe + mảnh vỡ trôi
      const cx = hx - 0.6;
      const cy = hy - 10.4;
      const seen = new Set();
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        if (a > 0.15 && a < 0.75) continue;
        const x = R(cx + Math.cos(a) * 5);
        const y = R(cy + Math.sin(a) * 1.5);
        if (seen.has(y * 64 + x)) continue;
        seen.add(y * 64 + x);
        S.px(x, y, Math.sin(a) < 0 ? P.c.hi : P.c.md);
      }
      S.px(R(cx + 4.6), R(cy + 2.4), P.c.hi, 0.9);
      S.glow.push([cx, cy, 6, P.c.col]);
      S.fill(S.M().poly([hx - 2.4, hy - 4, hx - 8, hy + 1.6, hx - 7.6 - up * 2, hy + 7.4, hx - 5.6, hy + 5.4, hx - 4.8, hy + 8, hx - 3, hy + 3]), T(adj(P.b.col, -0.12)), { sh: 'v', vt: 0.3, vb: 0.75 });
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X - 3) || x === R(g.X + 3.6) ? P.b.md : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X + 0.4, 21.6 + Y, X + 2.4, 23.6 + Y, X + 0.4, 25.6 + Y, X - 1.6, 23.6 + Y]), P.c, { sh: 'facet', fx: X + 0.6 });
      S.fill(S.M().ell(g.sf[0] + 0.6, g.sf[1] - 0.2, 3, 2.3), P.a, { lt: 0.45 });
      crystal(S, g.sf[0] + 0.6, g.sf[1] - 1.8, 0.5, 1.6, 3, P.b);
    },
    fx(S, P, g) {
      const [x, y] = g.hf;
      const ux = Math.sin(g.wa);
      const uy = -Math.cos(g.wa);
      S.glow.push([x + ux * 6, y + uy * 6, 6, '#ff5722'], [x + ux * 12, y + uy * 12, 5, '#ffab40']);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      crystal(S, hx - 2.6, hy - 4.4, -0.45, 2, 2.6, T('#2a2026'));
      crystal(S, hx + 2.6, hy - 4.8, 0.35, 2, 2.6, T('#2a2026'));
      const hair = S.M().ell(hx - 0.8, hy - 2.4, 6.8, 4.2).rows(0, R(hy - 2.2)).poly([hx + 5.6, hy - 3, hx + 6.6, hy + 0.4, hx + 4, hy - 1.6]).ell(hx - 4.6, hy + 0.4, 2.2, 3.6);
      S.fill(hair, T('#3d1424'), { lt: 0.45 });
      // vài sợi đỏ trên tóc đen
      S.px(hx - 3, hy - 5, '#c62828'); S.px(hx, hy - 6, '#c62828'); S.px(hx - 5, hy - 2, '#c62828');
      const [ex, ey] = gEyes(S, g, P.c, { dy: 0, h: 2, glow: 4 });
      S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE);
      S.px(ex + 2, ey + 4, EYE); S.px(ex + 3, ey + 4, EYE); S.px(ex + 4, ey + 3, EYE);
      S.head = [hx, hy - 9];
    },
  },
};

// ================= BẢNG MÀU & CACHE =================
const VARIANT = {
  monkey: 'monkey', oni: 'oni', boss_oni: 'oniK',
  bee: 'bee', demonbat: 'demon', boss_bat: 'batK', bat: 'bat', crystalbat: 'cbat', flowerfairy: 'fairy', thunderbird: 'bird',
  scorpion: 'scorp',
  yeti: 'yeti', boss_yeti: 'yetiK', icegolem: 'ice', lavagolem: 'lava', rockgolem: 'rock',
  treant: 'tree', stoneguard: 'statue', coralgolem: 'coral', crystalgolem: 'crystal', boss_crystal: 'crystalK',
  fireghost: 'fire', frostghost: 'frost', cloudspirit: 'cloud',
  crab2: 'emperor', gemcrab: 'gem', abyssdemon: 'abyss', boss_slime: 'king',
  hellhound: 'hound', darkdragon: 'dragon',
  foxspirit: 'fox', boss_fox: 'fox9', icewolf: 'ice', boss_wolf: 'wolfK', bonedragon: 'bone',
  sandworm: 'worm', seaserpent: 'serpent', boss_dragon: 'dragonK',
  // Tà Thú (boss sự kiện): dùng lại thân boss có sẵn, bảng màu riêng
  ev_hacviem: 'wolfK', ev_bangphach: 'crystalK', ev_huyetnguyet: 'oniK',
};
function variantOf(def) {
  if (def.type === 'humanoid') return HUM[def.k] ? def.k : 'bandit';
  return VARIANT[def.k] || '';
}

const palCache = new Map();
function palTones(pal) {
  const key = pal.join('|');
  let P = palCache.get(key);
  if (P) return P;
  const [a, b, c] = pal;
  const lightB = rgb2hsl(...parse(b))[2];
  const lightC = rgb2hsl(...parse(c))[2];
  P = {
    a: T(a), b: T(b), c: T(c),
    aD: T(adj(a, -0.1)), aL: T(adj(a, 0.12)), bD: T(adj(b, -0.12)),
    b2: lightB > 0.45 ? T(b) : T(adj(a, 0.16)),
    ear: T('#e9a1b0'),
    horn: T(lightC >= 0.45 ? c : '#f3e2b8'), bone: T('#efe4c8'),
    hair: T(lightC < 0.3 ? c : '#2b1d24'),
    face: T(adj(b, lightB > 0.6 ? -0.08 : 0)), faceL: T(adj(b, 0.1)),
    hat: T(adj(c, -0.12)), knit: T('#f4f1ea'), carrot: T('#ff8a26'), twig: T('#6b4428'),
    tiger: T('#f3b62b'), iron: T(IRON), eyeW: T('#ffffff'), wood: T(WOOD),
    wing: T(lightC > 0.75 ? c : '#e6f4ff', 165), ice: T('#e6fbff'), sting: T(lightC < 0.35 ? c : adj(b, -0.3)),
  };
  palCache.set(key, P);
  return P;
}

const sprCache = new Map();
function getSprite(type, v, an, i, pal, bl) {
  const key = `${type}|${v}|${an}${i}${bl ? 'b' : ''}|${pal[0]}|${pal[1]}|${pal[2]}`;
  let sp = sprCache.get(key);
  if (sp) return sp;
  const D = DESIGNS[type];
  const S = new Spr(D.W, D.H);
  D.draw(S, palTones(pal), an, i, v, bl);
  sp = S.bake();
  sprCache.set(key, sp);
  return sp;
}

// Cache nhanh theo đối tượng def (tránh tạo chuỗi khóa mỗi khung hình)
const defSpr = new WeakMap();
// Hàng đợi dựng sẵn: quái mới xuất hiện được dựng nốt các khung còn lại dần dần trong ngân sách mỗi khung hình,
// tránh giật khi nó bắt đầu đi/đánh lần đầu
const warmQ = [];
let warmWin = 0;
let warmUsed = 0;
const WARM_BUDGET = 1.5;
function frameList(def) {
  const D = DESIGNS[def.type];
  if (!D) return [];
  const out = [];
  for (const i of new Set(D.idle)) out.push(['idle', i, false], ['idle', i, true]);
  for (let i = 0; i < D.walk; i++) out.push(['walk', i, false]);
  out.push(['atk', 0, false], ['atk', 1, false]);
  return out;
}
function spriteFor(def, v, an, i, bl) {
  let arr = defSpr.get(def);
  if (!arr) {
    arr = [];
    defSpr.set(def, arr);
    for (const f of frameList(def)) warmQ.push([def, v, ...f]);
  }
  const k = (an === 'idle' ? 0 : an === 'walk' ? 1 : 2) * 32 + i * 2 + (bl ? 1 : 0);
  return arr[k] || (arr[k] = getSprite(def.type, v, an, i, def.pal, bl));
}
function pumpWarm() {
  const now = performance.now();
  if (now - warmWin > 16) { warmWin = now; warmUsed = 0; }
  while (warmQ.length && warmUsed < WARM_BUDGET) {
    const [def, v, an, i, bl] = warmQ.pop();
    const t0 = performance.now();
    spriteFor(def, v, an, i, bl);
    warmUsed += performance.now() - t0;
  }
}
// Tùy chọn: dựng sẵn toàn bộ khung cho danh sách quái (ví dụ lúc vào bản đồ). Không bắt buộc gọi.
export function prewarmMonsters(defs) {
  for (const def of defs || []) {
    if (!def || !DESIGNS[def.type]) continue;
    const v = variantOf(def);
    for (const [an, i, bl] of frameList(def)) spriteFor(def, v, an, i, bl);
    monsterHeight(def);
  }
}

// ================= HIỆU ỨNG PHỤ (cache) =================
const glowCache = new Map();
function glowSprite(col) {
  let g = glowCache.get(col);
  if (g) return g;
  g = document.createElement('canvas');
  g.width = 32;
  g.height = 32;
  const x = g.getContext('2d');
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, css(col, 0.9));
  gr.addColorStop(0.35, css(col, 0.45));
  gr.addColorStop(1, css(col, 0));
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  glowCache.set(col, g);
  return g;
}
function glow(ctx, x, y, r, col, a) {
  if (a <= 0.01 || r < 1) return;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * Math.min(1, a);
  ctx.drawImage(glowSprite(col), Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  ctx.globalAlpha = ga;
}

const shadowCache = new Map();
function shadowSprite(rx, ry) {
  const key = `${rx}|${ry}`;
  let c = shadowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rx * 2;
  c.height = ry * 2;
  const g = c.getContext('2d');
  for (let y = 0; y < ry * 2; y++) {
    for (let x = 0; x < rx * 2; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        g.fillStyle = d < 0.45 ? 'rgba(10,6,20,0.34)' : 'rgba(10,6,20,0.2)';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  shadowCache.set(key, c);
  return c;
}

let crownCache = new Map();
function crownSprite(gem) {
  let c = crownCache.get(gem);
  if (c) return c;
  const S = new Spr(13, 9);
  const gold = T('#ffc928');
  S.fill(S.M().poly([1.5, 7.4, 1.5, 2.2, 4, 4.6, 6.5, 0.6, 9, 4.6, 11.5, 2.2, 11.5, 7.4]), gold, { sh: 'v', vt: 0.3, vb: 0.85 });
  S.fill(S.M().rect(2, 5, 9, 2), T('#ffb300'), { sh: 'edge', il: 2 });
  S.px(6, 5, T(gem).lt); S.px(7, 5, T(gem).md); S.px(6, 6, T(gem).md); S.px(7, 6, T(gem).dk);
  S.px(3, 5, WHITE, 0.9); S.px(9, 5, T(gem).md);
  S.px(6, 1, WHITE); S.px(2, 3, WHITE, 0.8); S.px(11, 3, WHITE, 0.8);
  c = S.bake();
  crownCache.set(gem, c);
  if (crownCache.size > 20) crownCache = new Map([[gem, c]]);
  return c;
}
const CROWN_UP = 7;

// Vòng phép elip (pixel) dưới chân boss
const ringCache = new Map();
function ringSprite(rx, ry, col) {
  const key = `${rx}|${ry}|${col}`;
  let c = ringCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rx * 2 + 2;
  c.height = ry * 2 + 2;
  const g = c.getContext('2d');
  const tick = Math.max(6, Math.round((rx + ry) * 0.9));
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const dx = (x + 0.5 - rx - 1) / rx;
      const dy = (y + 0.5 - ry - 1) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const edge = Math.abs(d - 1) * Math.min(rx, ry * 2.2);
      if (edge < 0.62) {
        g.fillStyle = css(col, 0.75);
        g.fillRect(x, y, 1, 1);
      } else if (Math.abs(d - 0.72) * Math.min(rx, ry * 2.2) < 0.5) {
        const a = Math.atan2(dy, dx);
        if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * tick) % 2 === 0) {
          g.fillStyle = css(col, 0.4);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  ringCache.set(key, c);
  return c;
}

// Boss đội vương miện; boss khác đã có sừng / mũ / quầng riêng trong sprite
const BOSS_CROWN = new Set(['boss_slime', 'boss_wolf', 'boss_fox']);
const ELEM = SP.ELEMENT_COLORS || { fire: '#ff7043', water: '#42a5f5', wind: '#7ccd5a' };
// Hào quang theo hệ; mắt sáng theo màu nhấn (nếu màu nhấn quá tối thì theo hệ)
const bossColCache = new Map();
// màu hạt phụ của hào quang khi màu hệ lạc tông với thân boss
const AURA2 = { boss_god: '#b388ff', boss_heaven: '#ff5252', ev_hacviem: '#b388ff', ev_bangphach: '#e0fbfc', ev_huyetnguyet: '#b388ff' };
function bossCol(def) {
  let c = bossColCache.get(def);
  if (c) return c;
  const el = ELEM[def.el] || def.pal[2];
  const l = rgb2hsl(...parse(def.pal[2]))[2];
  c = { aura: el, eye: l > 0.4 ? def.pal[2] : el };
  c.p2 = AURA2[def.k] || c.eye;
  bossColCache.set(def, c);
  return c;
}

// Hào quang boss — front=false: phần sau lưng; front=true: phần trước mặt; col2: màu hạt phụ
function bossAura(ctx, cx, gy, cyc, rw, rh, s, col, t, front, col2 = col) {
  const tau = Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
  if (!front) {
    glow(ctx, cx, cyc, Math.max(rw * 1.25, rh * 0.75) * (0.95 + 0.08 * pulse), col, 0.26 + 0.16 * pulse);
    glow(ctx, cx, cyc + rh * 0.1, Math.max(rw, rh) * 0.5, '#ffffff', 0.06 + 0.05 * pulse);
  }
  // vòng phép dưới chân (nửa sau vẽ trước, nửa trước vẽ sau)
  const rxu = Math.max(8, Math.round((rw * 1.05) / s));
  const ryu = Math.max(3, Math.round(rxu * 0.24));
  const ring = ringSprite(rxu, ryu, col);
  const hh = ryu + 1;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (0.55 + 0.35 * pulse);
  const rx0 = Math.round(cx - (ring.width / 2) * s);
  const ry0 = Math.round(gy - (ring.height / 2) * s);
  if (!front) ctx.drawImage(ring, 0, 0, ring.width, hh, rx0, ry0, ring.width * s, hh * s);
  else ctx.drawImage(ring, 0, hh, ring.width, ring.height - hh, rx0, ry0 + hh * s, ring.width * s, (ring.height - hh) * s);
  ctx.globalAlpha = ga;
  // tia sáng chạy quanh vòng
  for (let k = 0; k < 3; k++) {
    const a = t * 1.6 + (k / 3) * tau;
    const sn = Math.sin(a);
    if ((sn >= 0) !== front) continue;
    const px = cx + Math.cos(a) * rxu * s;
    const py = gy + sn * ryu * s;
    glow(ctx, px, py, 3 * s, col, 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
  }
  // hạt sáng xoay quanh thân
  const M = 6;
  for (let k = 0; k < M; k++) {
    const a = t * 1.5 + (k / M) * tau;
    const sn = Math.sin(a);
    if ((sn >= 0) !== front) continue;
    const wob = Math.sin(t * 2.1 + k * 1.9) * rh * 0.3;
    const px = cx + Math.cos(a) * rw;
    const py = cyc + sn * rw * 0.2 + wob;
    const pc = k % 2 ? col2 : col;
    glow(ctx, px, py, 3.4 * s, pc, 0.5);
    for (let tr = 1; tr <= 3; tr++) {
      const a2 = a - tr * 0.1;
      ctx.fillStyle = css(pc, 0.55 - tr * 0.14);
      ctx.fillRect(Math.round(cx + Math.cos(a2) * rw - s / 2), Math.round(cyc + Math.sin(a2) * rw * 0.2 + wob - s / 2), s, s);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
  }
  // tàn sáng bay lên
  if (front) {
    for (let k = 0; k < 10; k++) {
      const p = (t * 0.45 + k * 0.137 + k * k * 0.071) % 1;
      const h1 = ((k * 73) % 17) / 17 - 0.5;
      const px = Math.round(cx + h1 * rw * 2 + Math.sin(t * 2 + k) * s);
      const py = Math.round(gy - p * rh * 1.15);
      ctx.fillStyle = css(k % 3 ? col : '#ffffff', (1 - p) * 0.85);
      ctx.fillRect(px, py, k % 4 ? Math.max(1, s - 1) : s, k % 4 ? Math.max(1, s - 1) : s);
    }
  }
}

// Cuồng nộ (boss dưới 30% máu): quầng đỏ đập nhanh sau lưng + lửa đỏ bốc lên quanh thân phía trước
function rageAura(ctx, cx, gy, cyc, rw, rh, s, t, front) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  if (!front) {
    glow(ctx, cx, cyc, Math.max(rw * 1.5, rh * 0.9), '#ff1744', 0.28 + 0.24 * pulse);
    return;
  }
  for (let k = 0; k < 14; k++) {
    const p = (t * 1.1 + k * 0.173 + k * k * 0.047) % 1;
    const h1 = ((k * 53) % 19) / 19 - 0.5;
    const px = Math.round(cx + h1 * rw * 2.1 + Math.sin(t * 5 + k) * s);
    const py = Math.round(gy - 2 * s - p * rh * 1.25);
    ctx.fillStyle = k % 3 === 0 ? css('#ffd180', (1 - p) * 0.9) : css(k % 2 ? '#ff1744' : '#ff6d00', (1 - p) * 0.85);
    const sz = p < 0.4 ? s + 1 : s;
    ctx.fillRect(px, py, sz, sz * 2);
  }
}

// ================= VẼ =================
const atkStart = new Map();

export function drawMonster(ctx, x, y, def, o) {
  const t = o.t || 0;
  const s = Math.max(1, Math.round(def.scale || 1));
  const dir = o.dir || 1;
  const id = o.id || 0;
  const boss = !!def.boss;
  const accent = boss ? bossCol(def) : def.pal[2];
  // boss bị đánh liên tục: chỉ phủ trắng mờ, giữ hào quang/vương miện để không thành khối trắng
  const fx = !o.flash || boss;
  let fy = y;
  if (def.fly) fy -= 10 * s + Math.sin(t * 4 + id) * 3 * s;
  const rx0 = Math.round(x);

  // bóng
  const shw = Math.max(4, Math.round((def.w || 14) * (def.fly ? 0.32 : 0.45)));
  const sh = shadowSprite(shw, Math.max(1, Math.round(s * (def.fly ? 1 : 1.5))));
  ctx.drawImage(sh, rx0 - shw, Math.round(y - sh.height / 2));

  if (!DESIGNS[def.type]) return;
  const D = DESIGNS[def.type];
  const v = variantOf(def);
  if (warmQ.length) pumpWarm();
  // chọn khung
  const ph = t + (id % 53) * 0.37;
  let an = 'idle';
  let fi = 0;
  let bl = false;
  if (o.st === 2) {
    let el = o.at;
    if (el == null) {
      let st0 = atkStart.get(id);
      if (st0 == null || t < st0) {
        st0 = t;
        if (atkStart.size > 300) atkStart.clear();
        atkStart.set(id, t);
      }
      el = t - st0;
    }
    an = 'atk';
    fi = el < 0.13 ? 0 : 1;
  } else {
    if (atkStart.size && atkStart.has(id)) atkStart.delete(id);
    if (o.st === 1 || D.always) {
      an = 'walk';
      const f = D.always && o.st !== 1 ? D.fps[0] : D.fps[1];
      fi = o.fr != null ? o.fr % D.walk : Math.floor(ph * f) % D.walk;
    } else {
      const k = Math.floor(ph * D.fps[0]);
      fi = o.fr != null ? D.idle[o.fr % D.idle.length] : D.idle[k % D.idle.length];
      bl = o.fr == null && k % 13 === 12;
    }
  }
  const sp = spriteFor(def, v, an, fi, bl);
  const W = sp.W * s;
  const H = sp.H * s;
  const left = rx0 - (sp.W / 2) * s;
  const top = Math.round(fy) - H;
  const sx = (px) => (dir > 0 ? left + px * s : rx0 + (sp.W / 2 - px) * s);
  const visH = (sp.H - sp.top) * s;
  const cyc = Math.round(fy) - visH / 2;
  const ghost = def.type === 'ghost';
  const ga = ctx.globalAlpha;

  const aw = Math.max(def.w * 0.6, sp.bw * s * 0.42);
  const rage = boss && !!o.rage;
  if (rage) rageAura(ctx, rx0, Math.round(y), cyc, aw, visH, s, t, false);
  if (boss && fx) bossAura(ctx, rx0, Math.round(y), cyc, aw, visH, s, accent.aura, t, false, accent.p2);
  if (ghost && fx) glow(ctx, rx0, cyc, Math.max(W, H) * 0.55, def.pal[0], 0.35 + 0.1 * Math.sin(t * 3 + id));

  // thân
  // Vân Linh mờ ít hơn để mây trắng không thành xám trên nền
  const gA = v === 'cloud' ? 0.86 : 0.72;
  if (ghost) ctx.globalAlpha = ga * (o.flash ? 0.9 : gA + 0.12 * Math.sin(t * 2.6 + id));
  const img = o.flash && !boss ? whiteOf(sp) : sp.img;
  const pass = o.flash && boss ? 2 : 1;
  for (let i = 0; i < pass; i++) {
    const im = i ? whiteOf(sp) : img;
    if (i) ctx.globalAlpha = ga * 0.55;
    if (dir > 0) ctx.drawImage(im, left, top, W, H);
    else {
      ctx.save();
      ctx.translate(rx0, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, -(sp.W / 2) * s, top, W, H);
      ctx.restore();
    }
  }
  ctx.globalAlpha = ga;

  if (!fx) return;
  // pha lê / lửa phát sáng
  if (sp.glow.length) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + id);
    for (const [gx, gy, r, col] of sp.glow) glow(ctx, sx(gx), top + gy * s, r * s * (0.9 + pulse * 0.2), col, 0.26 + pulse * 0.24);
  }
  if (boss) {
    // mắt phát sáng
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    for (const [ex, ey] of sp.eyes) {
      const px = sx(ex);
      const py = top + ey * s;
      glow(ctx, px, py, 3.2 * s, accent.eye, 0.65 * pulse);
      ctx.fillStyle = css(accent.eye, 0.9);
      ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    }
    bossAura(ctx, rx0, Math.round(y), cyc, aw, visH, s, accent.aura, t, true, accent.p2);
    if (rage) rageAura(ctx, rx0, Math.round(y), cyc, aw, visH, s, t, true);
    // vương miện (boss không có sừng/mũ riêng)
    if (BOSS_CROWN.has(def.k)) {
      const cr = crownSprite(accent.eye);
      const hx = sx(sp.head[0]);
      const hy = top + sp.head[1] * s;
      ctx.drawImage(cr.img, Math.round(hx - (cr.W / 2) * s), Math.round(hy - (CROWN_UP - 1) * s + Math.sin(t * 3) * s * 0.6), cr.W * s, cr.H * s);
    }
  }
}

export function monsterHeight(def) {
  const s = Math.max(1, Math.round(def.scale || 1));
  if (!DESIGNS[def.type]) return ninjaH() * s;
  const D = DESIGNS[def.type];
  const sp = getSprite(def.type, variantOf(def), D.always ? 'walk' : 'idle', D.always ? 0 : D.idle[0], def.pal, false);
  let topRow = sp.top;
  if (def.boss && BOSS_CROWN.has(def.k)) topRow = Math.min(topRow, Math.floor(sp.head[1]) - CROWN_UP);
  return (sp.H - topRow) * s + (def.fly ? 10 * s : 0);
}
