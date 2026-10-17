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
    for (let i = 0; i < n; i++) if (out[i] >>> 24) { top = Math.floor(i / w); break; }
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.putImageData(new ImageData(new Uint8ClampedArray(out.buffer), w, h), 0, 0);
    return { img: cv, white: null, data: out, W: w, H: h, top, eyes: this.eyes, glow: this.glow, head: this.head };
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
      // chân sau + tay sau
      S.fill(S.M().line(X - 1.6, 21.5 + Y, X - 2 + lb, 25.2, 2.6), P.aD, { sh: 'edge' });
      S.fill(S.M().ell(X - 1.6 + lb, 25.9, 2.1, 1.2), oni ? P.aD : P.bD, { sh: 'edge' });
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
      S.fill(S.M().line(X + 1.6, 22 + Y, X + 2 + lf, 25.2, 2.6), P.a, { sh: 'edge' });
      S.fill(S.M().ell(X + 2.6 + lf, 25.9, 2.2, 1.2), oni ? P.a : P.b, { sh: 'edge' });
      // đầu
      const hx = X + 0.5 + (pose === 2 ? 1 : 0);
      const hy = 10.4 + Y + hb;
      if (monkey) {
        for (const [ex, er] of [[-6.9, 2.6], [7, 2.4]]) {
          S.fill(S.M().ell(hx + ex, hy + 0.8, er, er + 0.2), P.a);
          S.fill(S.M().ell(hx + ex * 1.04, hy + 1, er * 0.5, er * 0.56), P.b, { il: 0, sh: 'flat' });
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
          crystal(S, hx - 5.4, hy - 3.2, -0.85, 3.2, 6.4, P.horn);
          crystal(S, hx + 4.6, hy - 3.8, 0.8, 3.2, 6.4, P.horn);
        } else {
          crystal(S, hx - 3.6, hy - 4.4, -0.42, 3.2, 5, P.horn);
          crystal(S, hx + 2.8, hy - 4.8, 0.38, 3.2, 5.2, P.horn);
        }
        const hair = S.M().ell(hx - 4, hy - 3.8, 2.7, 2.5).ell(hx - 0.8, hy - 5, 2.9, 2.3).ell(hx + 2.6, hy - 4.6, 2.6, 2.2)
          .ell(hx - 6.2, hy - 1, 2.1, 2.7).ell(hx - 5.6, hy + 2.2, 1.6, 1.8);
        hair.ell(hx + 1.8, hy + 1.4, 5.2, 4, 0);
        S.fill(hair, P.hair, { lt: 0.45, il: 1 });
        S.dm(S.M().path([hx - 5, hy - 3, hx - 4, hy - 4.2, hx - 2.8, hy - 3.4], 1).path([hx - 1.8, hy - 4.2, hx - 0.6, hy - 5.2, hx + 0.6, hy - 4.4], 1).path([hx - 6.8, hy, hx - 6, hy - 1.2], 1), P.hair.dk, 1);
      }
      const ex = R(hx);
      const ey = R(hy - 1);
      S.eye(ex, ey, 2, 3, { blink: bl, iris: oni ? P.c.lt : undefined });
      S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: oni ? P.c.lt : undefined });
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
      return drawBat(S, P, an, i, bl, v === 'demon');
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
      const cl = (sx, sgn, o, cy) => {
        S.fill(S.M().line(X + sgn * 6.5, 12 + Y, sx, cy + 2, 2.2), P.a, { sh: 'edge' });
        const c = S.M().ell(sx + sgn * 0.6, cy, 3.4, 2.7);
        if (o > 0.05) c.poly([sx + sgn * 0.4, cy - 0.2, sx + sgn * 4.6, cy - 0.6 - 1.6 * o, sx + sgn * 4.6, cy + 0.6 * o], 0);
        S.fill(c, P.a, { lt: 0.5 });
        S.px(sx + sgn * 2.2 - (sgn < 0 ? 1 : 0), cy - 2, P.a.hi);
      };
      cl(X - 10.5, -1, open, 8.5 + Y + clawY);
      // mai
      const body = S.M().ell(X, 12.6 + Y, 8.8, 5.2).rows(0, R(16.6 + Y));
      S.fill(body, P.a, { lt: 0.55, dk: 0.25 });
      S.fill(S.M().rect(0, R(15 + Y), 32, 3).and(body), P.b, { il: 2, sh: 'flat' });
      for (const [dx, dy] of [[-5, -2], [-2, -3], [4, -2.5], [6, 0]]) S.px(X + dx, 12.6 + Y + dy, P.a.lt);
      S.px(X - 4, 9 + Y, P.a.hi); S.px(X - 3, 9 + Y, P.a.hi);
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
      if (v === 'yeti') return drawYeti(S, P, an, i, bl);
      const lava = v === 'lava';
      const ice = v === 'ice';
      const rock = lava ? P.b : P.a;
      const rockD = lava ? P.bD : P.aD;
      const crys = lava ? P.a : P.c;
      let bob = 0; let lb = 0; let lf = 0; let ab = 0; let af = 0;
      let pose = 0;
      if (an === 'idle') bob = [0, 0, 1][i];
      else if (an === 'walk') [lb, lf, bob, ab, af] = [[2, 0, 0, -1, 1], [0, 0, 1, 0, 0], [0, 2, 0, 1, -1], [0, 0, 1, 0, 0]][i];
      else pose = i + 1;
      const X = 17;
      const Y = bob;
      // chân
      S.fill(S.M().ell(X - 4.5, 29.4 - lb, 3.8, 3.6).rows(0, 32 - lb), rockD, { sh: 'edge' });
      S.fill(S.M().ell(X + 4.5, 29.4 - lf, 4, 3.6).rows(0, 32 - lf), rock, { sh: 'edge' });
      // tay sau
      let bfx = X - 11 + ab; let bfy = 25 + Y;
      if (pose === 1) { bfx = X - 8; bfy = 6; }
      if (pose === 2) { bfx = X + 9; bfy = 28; }
      S.fill(S.M().line(X - 8, 15 + Y, bfx, bfy, 5), rockD);
      S.fill(S.M().ell(bfx, bfy, 4.2, 3.8), rockD, { lt: 0.5 });
      // pha lê sau lưng
      if (!lava) {
        crystal(S, X - 11, 16 + Y, -0.75, 3.6, 7, crys);
        crystal(S, X - 7.5, 14 + Y, -0.28, 4.2, 10.5, crys);
        crystal(S, X - 3.5, 13 + Y, 0.12, 3.4, 8, crys);
        S.glow.push([X - 7, 7 + Y, 7, crys.col]);
      }
      // thân đá
      const body = S.M().ell(X, 19.4 + Y, 10.4, 8.8).ell(X + 0.5, 23 + Y, 9, 6);
      S.fill(body, rock, { c: [X, 19 + Y, 10.4, 9], lt: 0.55, dk: 0.16 });
      // vết nứt / mảng đá
      const cracks = lava
        ? [[X - 6, 13, X - 3, 16.5, X - 4, 20.5, X - 1.5, 23.5], [X + 3, 12.5, X + 5.5, 16.5, X + 4, 20], [X + 6, 21.5, X + 8.5, 25], [X - 8.5, 21, X - 6, 24.5, X - 7, 27], [X - 1, 25, X + 2, 27.5]]
        : [[X - 4, 17, X - 2, 20, X - 3, 23], [X + 4, 21, X + 6, 24, X + 5, 26], [X + 1, 15, X + 3, 17]];
      for (const c of cracks) {
        const m = S.M().path(c.map((q, k) => (k % 2 ? q + Y : q)), 1).and(body);
        S.dm(m, lava ? P.a.lt : rock.dk, 1);
        if (lava) {
          S.px(c[2], c[3] + Y, P.c.hi);
          S.glow.push([c[2], c[3] + Y, 5, P.a.col]);
        }
      }
      if (lava) {
        // lõi dung nham trước ngực
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 2.6, 2.3).and(body), P.a.lt, 1);
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 1.4, 1.3), P.c.hi, 1);
        S.glow.push([X + 1.5, 18.6 + Y, 9, P.c.col]);
      }
      if (ice) {
        S.dm(S.M().line(X - 6, 15 + Y, X - 2, 13 + Y, 1).and(body), P.c.hi, 0.9);
        S.dm(S.M().line(X - 7, 19 + Y, X - 5, 18 + Y, 1).and(body), P.c.hi, 0.8);
      }
      // đầu
      const hx = X + 2 + (pose === 2 ? 2 : 0);
      const hy = 9.6 + Y + (pose === 2 ? 2 : 0);
      S.fill(S.M().ell(hx, hy, 5.8, 4.8), rock, { lt: 0.5 });
      S.rc(R(hx - 4), R(hy - 1.6), 9, 1, rock.dk);
      if (bl) { S.rc(R(hx - 2), R(hy), 2, 1, crys.dk); S.rc(R(hx + 2), R(hy), 2, 1, crys.dk); S.eyes.push([hx - 1, hy + 0.5], [hx + 3, hy + 0.5]); }
      else {
        for (const ex of [hx - 2, hx + 2]) {
          S.rc(R(ex), R(hy - 0.6), 2, 2, crys.hi);
          S.px(R(ex) + 1, R(hy - 0.6) + 1, crys.lt);
          S.eyes.push([ex + 1, hy + 0.4]);
        }
      }
      S.rc(R(hx), R(hy + 2.4), 3, 1, rock.ol);
      if (pose === 2) S.rc(R(hx), R(hy + 2.4), 3, 2, rock.ol);
      // pha lê vai trước
      if (!lava) {
        crystal(S, X + 7.5, 13 + Y, 0.45, 3, 6, crys);
        S.glow.push([X + 9, 9 + Y, 5, crys.col]);
      }
      // tay trước
      let ffx = X + 11 + af; let ffy = 25.5 + Y;
      if (pose === 1) { ffx = X + 6; ffy = 5; }
      if (pose === 2) { ffx = X + 13; ffy = 28.5; }
      S.fill(S.M().line(X + 8, 15 + Y, ffx, ffy, 5.2), rock, { sh: 'edge' });
      S.fill(S.M().ell(ffx, ffy, 4.6, 4.1), rock, { lt: 0.5 });
      S.px(R(ffx - 2), R(ffy - 2), rock.hi);
      if (lava) { S.px(R(ffx + 1), R(ffy - 1), P.c.hi); S.px(R(ffx + 2), R(ffy), P.a.lt); S.px(R(ffx), R(ffy + 1), P.a.lt); S.px(R(ffx + 3), R(ffy - 2), P.a.md); S.glow.push([ffx + 1, ffy, 5, P.a.col]); }
      if (pose === 2) {
        for (const [dx, dy] of [[-3, 3], [4, 2], [-5, 1], [6, 0]]) S.px(R(ffx + dx), R(ffy + dy), '#d8ccb8', 0.8);
      }
      S.head = [hx, hy - 4.8];
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
      const hound = v === 'hound';
      const dragon = v === 'dragon';
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
        S.fill(S.M().line(hx, hy + (front ? 0 : 1.5), px, py - 0.4, front ? 2.6 : 2.4), tn, { sh: 'edge' });
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
      } else {
        const tail = S.M().ell(X - 10.6, 9.6 + Y - wag * 2, 3.3, 5.8, 1, -1.05 + wag);
        S.fill(tail, P.a, { lt: 0.5 });
        S.fill(S.M().ell(X - 14, 7.2 + Y - wag * 3.6, 2.2, 2.6, 1, -1.05 + wag).and(tail), P.b2, { il: 0, sh: 'flat' });
      }
      // chân phía xa
      leg(X - 6.6, 15 + Y, ph + Math.PI + 0.6, P.aD, false, false);
      leg(X + 5.4, 15 + Y, ph + 0.6, P.aD, true, false);
      // cánh rồng (sau)
      if (dragon) {
        const wf = an === 'walk' ? [0, 1, 2, 1][i] : pose ? 2 : i === 1 ? 1 : 0;
        const wy = [-1, 1.5, 4][wf];
        S.fill(S.M().poly([X - 3, 9 + Y, X - 6, 1 + Y + wy, X - 11, -0.4 + Y + wy * 1.4, X - 9.6, 3.4 + Y + wy, X - 7.4, 3.6 + Y + wy * 0.8, X - 6.6, 6 + Y + wy * 0.5, X - 4.6, 6.4 + Y + wy * 0.3, X + 1, 10 + Y]), P.b, { sh: 'edge', il: 1 });
        S.dm(S.M().path([X - 3, 9 + Y, X - 6, 1.4 + Y + wy, X - 10.4, 0.2 + Y + wy * 1.4], 1), P.b.dk, 1);
      }
      // thân
      const body = S.M().ell(X - 1.4, 12.8 + Y, 9, 5).ell(X + 4, 12.4 + Y, 5.2, 4.8);
      S.fill(body, P.a, { c: [X - 1, 12.4 + Y, 9.4, 5.4], lt: 0.58, dk: 0.12 });
      S.fill(S.M().ell(X, 17.6 + Y, 8, 2.6).and(body), dragon ? P.b : P.b2, { il: 0, sh: 'flat' });
      if (dragon) {
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
        const ruff = S.M().ell(X + 7.4, 13.6 + Y, 3.8, 4.2).poly([X + 4.6, 16 + Y, X + 5.6, 19 + Y, X + 7, 16.6 + Y, X + 8.4, 18.6 + Y, X + 9.6, 16 + Y]);
        S.fill(ruff, P.b2, { il: 2, lt: 0.5 });
      }
      // đầu
      const hx = X + 10.2 + (pose === 2 ? 1 : 0);
      const hy = 8.4 + Y + hb;
      if (dragon) {
        S.fill(S.M().path([hx - 1.6, hy - 3.4, hx - 4.4, hy - 5.8, hx - 7.6, hy - 6.2], 1.8), P.bone, { sh: 'edge' });
        S.fill(S.M().path([hx + 0.8, hy - 4, hx - 1.4, hy - 7, hx - 4.2, hy - 8.4], 1.8), P.bone, { sh: 'edge' });
      } else {
        S.fill(S.M().poly([hx - 4.2, hy - 0.6, hx - 3.4, hy - 8, hx - 0.4, hy - 3.2]), P.aD, { sh: 'facet', fx: hx - 3.2 });
      }
      const head = S.M().ell(hx, hy, 5.4, 4.8);
      S.fill(head, P.a, { lt: 0.5 });
      // mõm
      const sny = hy + 1.8;
      const snout = S.M().ell(hx + 4.6, sny, dragon ? 4 : 3.3, mouth ? 1.5 : 2.1);
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
        S.fill(S.M().poly([hx - 0.2, hy - 3.4, hx + 0.9, hy - 6.8, hx + 1.9, hy - 3.2]), hound ? P.c : P.ear, { il: 0, sh: 'flat' });
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
      S.blush(ex + 2, ey + 3, 2);
      S.head = [hx - 0.5, hy - 4.8];
    },
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
function drawBat(S, P, an, i, bl, demon) {
  const X = 15;
  let th = [0.85, 0.25, -0.45, 0.25][i % 4];
  let mouth = 0;
  let ly = 0;
  if (an === 'atk') { th = i ? -0.2 : 1.1; mouth = 1; ly = i ? 2 : -1; }
  const by = 9.6 + ly + (th < 0 ? -1 : th > 0.5 ? 1 : 0);
  const wing = (sgn, front) => {
    const sx = X + sgn * 3.4;
    const sy = by - 0.6;
    const len = 11;
    const u = [sgn * Math.cos(th), -Math.sin(th)];
    const p = [sgn * Math.sin(th) * 0.9, Math.cos(th)];
    const pt = (a, b) => [sx + u[0] * len * a + p[0] * b, sy + u[1] * len * a + p[1] * b];
    const pts = [pt(0, -1.6), pt(0.5, -2.6), pt(1, -0.6), pt(0.84, 2.6), pt(0.68, 1.4), pt(0.52, 3.4), pt(0.36, 2), pt(0.18, 3.8), pt(0, 3.4)].flat();
    S.fill(S.M().poly(pts), P.b, { sh: 'edge', il: front ? 1 : 0 });
    const bone = S.M().path([...pt(0, -1), ...pt(0.5, -2), ...pt(1, -0.6)], 1);
    S.dm(bone, P.a.md, 1);
    S.dm(S.M().path([...pt(0.5, -2), ...pt(0.7, 1.4)], 1), P.b.lt, 0.55);
  };
  wing(-1, false);
  wing(1, true);
  // tai
  S.fill(S.M().poly([X - 3.8, by - 2.6, X - 4.2, by - 7.6, X - 0.8, by - 4]), P.a, { sh: 'facet', fx: X - 3.6 });
  S.fill(S.M().poly([X + 1.8, by - 4, X + 5.2, by - 7.8, X + 4.8, by - 2.6]), P.a, { sh: 'facet', fx: X + 4.4 });
  S.fill(S.M().poly([X - 3.4, by - 3.4, X - 3.6, by - 6, X - 1.8, by - 4]).poly([X + 2.8, by - 4, X + 4.6, by - 6.2, X + 4.2, by - 3.4]), P.c, { il: 0, sh: 'flat' });
  if (demon) {
    crystal(S, X - 1.4, by - 3.8, -0.25, 2.2, 4.2, P.horn);
    crystal(S, X + 2.4, by - 3.8, 0.25, 2.2, 4.2, P.horn);
  }
  // thân tròn lông xù
  const body = S.M().ell(X + 0.5, by, 5.2, 4.8);
  S.fill(body, P.a, { lt: 0.55 });
  S.fill(S.M().ell(X + 1, by + 2.6, 3, 2).and(body), P.aL, { il: 0, sh: 'flat' });
  // chân
  S.fill(S.M().line(X - 1, by + 4.4, X - 1, by + 6.2, 1).line(X + 2, by + 4.4, X + 2, by + 6.2, 1), P.b, { sh: 'flat' });
  const ex = R(X - 1);
  const ey = R(by - 2);
  S.eye(ex, ey, 2, 3, { blink: bl, iris: P.c.md });
  S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: P.c.md });
  if (mouth) { S.rc(ex + 1, ey + 3, 4, 2, EYE); S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE); }
  else { S.rc(ex + 1, ey + 3, 4, 1, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE); }
  S.blush(ex - 2, ey + 3);
  S.blush(ex + 6, ey + 3, 1);
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
function drawYeti(S, P, an, i, bl) {
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
  S.head = [X + 1, 8 + Y];
}

// ================= BẢNG MÀU & CACHE =================
const VARIANT = {
  monkey: 'monkey', oni: 'oni', boss_oni: 'oniK',
  bee: 'bee', demonbat: 'demon', boss_bat: 'bat', bat: 'bat',
  scorpion: 'scorp',
  yeti: 'yeti', boss_yeti: 'yeti', icegolem: 'ice', lavagolem: 'lava', rockgolem: 'rock',
  fireghost: 'fire', frostghost: 'frost',
  hellhound: 'hound', darkdragon: 'dragon',
};
function variantOf(def) {
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
function spriteFor(def, v, an, i, bl) {
  let arr = defSpr.get(def);
  if (!arr) {
    arr = [];
    defSpr.set(def, arr);
  }
  const k = (an === 'idle' ? 0 : an === 'walk' ? 1 : 2) * 32 + i * 2 + (bl ? 1 : 0);
  return arr[k] || (arr[k] = getSprite(def.type, v, an, i, def.pal, bl));
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

// Hào quang boss — front=false: phần sau lưng; front=true: phần trước mặt
function bossAura(ctx, cx, gy, cyc, rw, rh, s, col, t, front) {
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
    glow(ctx, px, py, 3.4 * s, col, 0.5);
    for (let tr = 1; tr <= 3; tr++) {
      const a2 = a - tr * 0.1;
      ctx.fillStyle = css(col, 0.55 - tr * 0.14);
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

// ================= VẼ =================
const atkStart = new Map();

export function drawMonster(ctx, x, y, def, o) {
  const t = o.t || 0;
  const s = Math.max(1, Math.round(def.scale || 1));
  const dir = o.dir || 1;
  const id = o.id || 0;
  const boss = !!def.boss;
  const accent = def.pal[2];
  // boss bị đánh liên tục: chỉ phủ trắng mờ, giữ hào quang/vương miện để không thành khối trắng
  const fx = !o.flash || boss;
  let fy = y;
  if (def.fly) fy -= 10 * s + Math.sin(t * 4 + id) * 3 * s;
  const rx0 = Math.round(x);

  // bóng
  const shw = Math.max(4, Math.round((def.w || 14) * (def.fly ? 0.32 : 0.45)));
  const sh = shadowSprite(shw, Math.max(1, Math.round(s * (def.fly ? 1 : 1.5))));
  ctx.drawImage(sh, rx0 - shw, Math.round(y - sh.height / 2));

  if (def.type === 'humanoid' || !DESIGNS[def.type]) {
    const hh = ninjaH() * s;
    if (boss && fx) bossAura(ctx, rx0, Math.round(y), fy - hh / 2, Math.max(def.w, 12 * s) * 0.8, hh, s, accent, t, false);
    SP.drawNinja(ctx, x, fy, {
      noShadow: true, dir, anim: o.st === 1 ? 'walk' : o.st === 2 ? 'attack' : 'idle', t, scale: s, flash: o.flash,
      pal: [def.pal[0], def.pal[2], def.pal[1], def.k === 'skeleton' || def.k === 'mummy' ? def.pal[1] : null],
      weaponType: def.ranged ? 'shuriken' : 'blade', look: { w: Math.min(9, Math.floor(def.lv / 10)) }, name: def.name,
    });
    if (boss && fx) {
      bossAura(ctx, rx0, Math.round(y), fy - hh / 2, Math.max(def.w, 12 * s) * 0.8, hh, s, accent, t, true);
      const cr = crownSprite(accent);
      ctx.drawImage(cr.img, Math.round(x - (cr.W / 2) * s), Math.round(fy - hh - (CROWN_UP - 2) * s + Math.sin(t * 3) * s * 0.6), cr.W * s, cr.H * s);
    }
    return;
  }

  const D = DESIGNS[def.type];
  const v = variantOf(def);
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

  if (boss && fx) bossAura(ctx, rx0, Math.round(y), cyc, Math.max(def.w * 0.6, W * 0.42), visH, s, accent, t, false);
  if (ghost && fx) glow(ctx, rx0, cyc, Math.max(W, H) * 0.55, def.pal[0], 0.35 + 0.1 * Math.sin(t * 3 + id));

  // thân
  if (ghost) ctx.globalAlpha = ga * (o.flash ? 0.9 : 0.72 + 0.12 * Math.sin(t * 2.6 + id));
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
      glow(ctx, px, py, 3.2 * s, accent, 0.65 * pulse);
      ctx.fillStyle = css(accent, 0.9);
      ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    }
    bossAura(ctx, rx0, Math.round(y), cyc, Math.max(def.w * 0.6, W * 0.42), visH, s, accent, t, true);
    // vương miện
    const cr = crownSprite(accent);
    const hx = sx(sp.head[0]);
    const hy = top + sp.head[1] * s;
    ctx.drawImage(cr.img, Math.round(hx - (cr.W / 2) * s), Math.round(hy - (CROWN_UP - 1) * s + Math.sin(t * 3) * s * 0.6), cr.W * s, cr.H * s);
  }
}

export function monsterHeight(def) {
  const s = Math.max(1, Math.round(def.scale || 1));
  if (def.type === 'humanoid' || !DESIGNS[def.type]) return ninjaH() * s + (def.boss ? (CROWN_UP - 2) * s : 0);
  const D = DESIGNS[def.type];
  const sp = getSprite(def.type, variantOf(def), D.always ? 'walk' : 'idle', D.always ? 0 : D.idle[0], def.pal, false);
  let topRow = sp.top;
  if (def.boss) topRow = Math.min(topRow, Math.floor(sp.head[1]) - CROWN_UP);
  return (sp.H - topRow) * s + (def.fly ? 10 * s : 0);
}
