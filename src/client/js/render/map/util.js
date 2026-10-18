// Tiện ích vẽ bản đồ: số ngẫu nhiên có hạt giống, màu, bộ đệm điểm ảnh Buf, cache sprite và quầng sáng.

export const C0 = 120; // camY điển hình: mặt đất nằm ở khoảng 3/4 màn hình

export function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) | 0;
  return h;
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const hash1 = (n) => {
  let x = Math.imul(n | 0, 0x27d4eb2d) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
};

// ---------------- Màu
const _rgb = new Map();
export function rgbOf(c) {
  let v = _rgb.get(c);
  if (v) return v;
  let s = c.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgb.set(c, v);
  return v;
}
export function hx(r, g, b) {
  return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
}
export function mix(a, b, f) {
  const A = rgbOf(a);
  const B = rgbOf(b);
  return hx(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
}
export const shd = (c, f) => (f < 0 ? mix(c, '#000000', -f) : mix(c, '#ffffff', f));
export function rgba(c, a) {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
}
const _u = new Map();
export function u32(c) {
  let v = _u.get(c);
  if (v === undefined) {
    const [r, g, b] = rgbOf(c);
    v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    _u.set(c, v);
  }
  return v;
}
// bảng 4 tông từ 1 màu gốc: sáng, gốc, tối, rất tối
export const ramp = (c, k = 1) => [shd(c, 0.28 * k), c, shd(c, -0.26 * k), shd(c, -0.48 * k)];

// ---------------- Bộ đệm điểm ảnh (vẽ sẵn nhanh bằng Uint32Array)
export class Buf {
  constructor(w, h, wrap = false) {
    this.w = Math.max(1, w | 0);
    this.h = Math.max(1, h | 0);
    this.wrap = wrap;
    this.img = new ImageData(this.w, this.h);
    this.d = new Uint32Array(this.img.data.buffer);
  }
  ix(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (y < 0 || y >= this.h) return -1;
    if (this.wrap) x = ((x % this.w) + this.w) % this.w;
    else if (x < 0 || x >= this.w) return -1;
    return y * this.w + x;
  }
  p(x, y, c) {
    const i = this.ix(x, y);
    if (i >= 0) this.d[i] = u32(c);
  }
  has(x, y) {
    const i = this.ix(x, y);
    return i >= 0 && this.d[i] >>> 24 > 0;
  }
  r(x, y, w, h, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.floor(w);
    h = Math.floor(h);
    const y0 = Math.max(0, y);
    const y1 = Math.min(this.h, y + h);
    if (y1 <= y0 || w <= 0) return;
    const v = u32(c);
    const W = this.w;
    if (this.wrap) {
      if (w >= W) { x = 0; w = W; }
      x = ((x % W) + W) % W;
      const e = x + w;
      for (let yy = y0; yy < y1; yy++) {
        const o = yy * W;
        if (e <= W) this.d.fill(v, o + x, o + e);
        else { this.d.fill(v, o + x, o + W); this.d.fill(v, o, o + e - W); }
      }
    } else {
      const x0 = Math.max(0, x);
      const x1 = Math.min(W, x + w);
      if (x1 <= x0) return;
      for (let yy = y0; yy < y1; yy++) this.d.fill(v, yy * W + x0, yy * W + x1);
    }
  }
  // pha màu có alpha
  a(x, y, c, al) {
    const i = this.ix(x, y);
    if (i < 0 || al <= 0) return;
    const [r, g, b] = rgbOf(c);
    const o = this.d[i];
    const oa = o >>> 24;
    if (oa === 0) {
      this.d[i] = ((Math.round(clamp(al, 0, 1) * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0;
      return;
    }
    const or = o & 255;
    const og = (o >> 8) & 255;
    const ob = (o >> 16) & 255;
    const na = Math.max(oa, Math.round(al * 255));
    this.d[i] = ((na << 24) | (Math.round(ob + (b - ob) * al) << 16) | (Math.round(og + (g - og) * al) << 8) | Math.round(or + (r - or) * al)) >>> 0;
  }
  ar(x, y, w, h, c, al) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.a(x + i, y + j, c, al);
  }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      if (th <= 1) this.p(x0, y0, c);
      else this.r(x0 - (th >> 1), y0 - (th >> 1), th, th, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.round(cx - hw);
      const x1 = Math.round(cx + hw);
      if (x1 > x0) this.r(x0, y, x1 - x0, 1, c);
    }
  }
  poly(pts, c) {
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]);
        const xb = Math.round(xs[i + 1]);
        if (xb > xa) this.r(xa, y, xb - xa, 1, c);
      }
    }
  }
  // viền tối chọn lọc: lấy màu điểm lân cận rồi làm tối
  outline(k = 0.62, tint = '#1c1024') {
    const { w, h, d } = this;
    const out = new Uint32Array(d);
    const T = rgbOf(tint);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (d[i] >>> 24) continue;
        let n = 0;
        if (x > 0 && d[i - 1] >>> 24 === 255) n = d[i - 1];
        else if (x < w - 1 && d[i + 1] >>> 24 === 255) n = d[i + 1];
        else if (y > 0 && d[i - w] >>> 24 === 255) n = d[i - w];
        else if (y < h - 1 && d[i + w] >>> 24 === 255) n = d[i + w];
        if (!n) continue;
        const r = (n & 255) * (1 - k) + T[0] * k;
        const g = ((n >> 8) & 255) * (1 - k) + T[1] * k;
        const b = ((n >> 16) & 255) * (1 - k) + T[2] * k;
        out[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
      }
    }
    this.d.set(out);
    return this;
  }
  get canvas() {
    if (!this._cv) {
      const cv = document.createElement('canvas');
      cv.width = this.w;
      cv.height = this.h;
      cv.getContext('2d').putImageData(this.img, 0, 0);
      this._cv = cv;
    }
    return this._cv;
  }
}

// Dán sprite vào bộ đệm (có thể lật, pha sương mù)
export function blit(dst, src, x, y, o) {
  x = Math.round(x);
  y = Math.round(y);
  const sw = src.w;
  const sh = src.h;
  const sd = src.d;
  const dw = dst.w;
  const dh = dst.h;
  const dd = dst.d;
  const flip = o && o.flip;
  const hz = o && o.haze ? rgbOf(o.haze) : null;
  const ha = (o && o.amt) || 0;
  const sil = o && o.sil ? rgbOf(o.sil) : null;
  for (let j = 0; j < sh; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= dh) continue;
    for (let i = 0; i < sw; i++) {
      const v = sd[j * sw + (flip ? sw - 1 - i : i)];
      const a = v >>> 24;
      if (!a) continue;
      let xx = x + i;
      if (dst.wrap) xx = ((xx % dw) + dw) % dw;
      else if (xx < 0 || xx >= dw) continue;
      let r = v & 255;
      let g = (v >> 8) & 255;
      let b = (v >> 16) & 255;
      if (sil) { r = sil[0]; g = sil[1]; b = sil[2]; }
      if (hz) { r += (hz[0] - r) * ha; g += (hz[1] - g) * ha; b += (hz[2] - b) * ha; }
      const k = yy * dw + xx;
      if (a === 255) dd[k] = ((255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
      else {
        const f = a / 255;
        const o2 = dd[k];
        const oa = o2 >>> 24;
        const or = o2 & 255;
        const og = (o2 >> 8) & 255;
        const ob = (o2 >> 16) & 255;
        dd[k] = ((Math.max(a, oa) << 24) | ((ob + (b - ob) * f) << 16) | ((og + (g - og) * f) << 8) | (or + (r - or) * f)) >>> 0;
      }
    }
  }
}

// Khối tròn đổ bóng 4 tông (ánh sáng từ trên-trái), có gợn mép và hòa sắc (dither)
export function blob(b, cx, cy, rx, ry, pal, o = {}) {
  const lx = -0.62;
  const ly = -0.78;
  const wob = o.wob || 0;
  const lobes = o.lobes || 7;
  const ph = o.ph || 0;
  const cut = o.cut != null ? o.cut : 1e9;
  const sh = o.sh || 0;
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    if (y > cut) break;
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (wob) d /= 1 + wob * Math.sin(Math.atan2(dy, dx) * lobes + ph);
      if (d > 1) continue;
      let v = dx * lx + dy * ly + sh;
      if (d > 0.78) v += v > 0 ? 0.18 : -0.2;
      if (o.dither !== false) v += (x + y) & 1 ? 0.08 : -0.08;
      b.p(x, y, v > 0.5 ? pal[0] : v > -0.08 ? pal[1] : v > -0.62 ? pal[2] : pal[3] || pal[2]);
    }
  }
}

// Bộ đệm sprite dùng chung (khóa -> Buf)
const SPR = new Map();
export function cached(key, fn) {
  let s = SPR.get(key);
  if (!s) {
    s = fn();
    SPR.set(key, s);
  }
  return s;
}

// Ảnh phát sáng mềm cho ánh sáng (vẽ cộng màu)
const GLOW = new Map();
export function glow(col, r) {
  const key = col + r;
  let g = GLOW.get(key);
  if (!g) {
    g = document.createElement('canvas');
    g.width = g.height = r * 2;
    const c = g.getContext('2d');
    const gr = c.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(col, 1));
    gr.addColorStop(0.35, rgba(col, 0.45));
    gr.addColorStop(1, rgba(col, 0));
    c.fillStyle = gr;
    c.fillRect(0, 0, r * 2, r * 2);
    GLOW.set(key, g);
  }
  return g;
}
// Lỗ sáng (dùng với destination-out trên lớp tối)
export function hole(r) {
  return glow('#ffffff', r);
}

// Chữ pixel nhỏ cho biển hiệu: mảng chuỗi + bảng màu
export function pix(b, x, y, rows, pal) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch !== '.' && pal[ch]) b.p(x + i, y + j, pal[ch]);
    }
  }
}

// ---------------- Dải tuần hoàn cho lớp parallax (dải ảnh lặp)
export const TAU = Math.PI * 2;
export const wrapd = (d, W) => ((((d + W / 2) % W) + W) % W) - W / 2;
export function periodic(W, R, terms) {
  const out = new Float32Array(W);
  const ph = terms.map(() => R() * TAU);
  for (let x = 0; x < W; x++) {
    let v = 0;
    for (let k = 0; k < terms.length; k++) v += Math.sin((x / W) * TAU * terms[k][0] + ph[k]) * terms[k][1];
    out[x] = v;
  }
  return out;
}
// 3 mức mờ dần về màu sương ở chân lớp
export const fades = (c, base) => [c, mix(c, base, 0.3), mix(c, base, 0.6)];
export function fadeIdx(x, y, H, fadeH) {
  const f = (y - (H - fadeH)) / fadeH + ((x + y) & 1 ? 0.1 : -0.1);
  return f < 0.33 ? 0 : f < 0.7 ? 1 : 2;
}
