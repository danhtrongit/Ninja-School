// Bộ dựng sprite quái: Mask (hình khối) và Spr (tô tông, viền tối, chi tiết), bản nháy trắng.
import { pack, T, mixPx, EYE, EYE2, WHITE, BLUSH, LIGHT } from './palette.js';

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

export class Spr {
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

export function whiteOf(sp) {
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
