// Vẽ bản đồ: bầu trời + parallax 4 lớp, mặt đất kiểu tile pixel, bục nhảy, làng Nhật, trang trí theo chủ đề,
// cổng dịch chuyển, hạt bay và ánh sáng không khí.
// Mọi phần tĩnh được vẽ sẵn (prerender) vào canvas offscreen; mỗi khung hình chỉ drawImage + một ít hạt động.

const THEMES = {
  village_fire: { sky: ['#f7b267', '#fde2c4'], far: '#b5657a', mid: '#c97b63', top: '#6aa84f', dirt: '#7a4b2a', plat: 'wood', roof: '#c0392b', part: 'petal', town: 'fire' },
  village_water: { sky: ['#7fb8f0', '#e0f4ff'], far: '#6b8fc4', mid: '#7fb1cf', top: '#5cb85c', dirt: '#6b4f3a', plat: 'wood', roof: '#2e6da4', part: 'sparkle', town: 'water', water: '#4aa3df' },
  village_wind: { sky: ['#9fdcc0', '#eef8d9'], far: '#6c9f78', mid: '#88b884', top: '#7cc36b', dirt: '#6f5236', plat: 'wood', roof: '#4e8a3a', part: 'leaf', town: 'wind' },
  grass_fire: { sky: ['#ffcf8f', '#fff1d6'], far: '#c88d6e', mid: '#9fbf6a', top: '#86b84e', dirt: '#82522f', plat: 'wood', part: 'maple', decor: ['maple', 'bush', 'flower', 'rock', 'maple', 'flower', 'round', 'grass'] },
  lake: { sky: ['#87c5f5', '#e8f6ff'], far: '#7aa6d6', mid: '#6db38a', top: '#64bb5a', dirt: '#6b4f3a', plat: 'wood', water: '#4aa3df', part: 'sparkle', decor: ['round', 'reed', 'flower', 'bush', 'rock', 'reed', 'willow', 'flower'] },
  grass_wind: { sky: ['#a6e3c9', '#f1fbe8'], far: '#7fb08e', mid: '#9ccc7a', top: '#82c66a', dirt: '#73563a', plat: 'wood', part: 'leaf', decor: ['round', 'bush', 'flower', 'grass', 'round', 'tallgrass', 'rock', 'flower'] },
  bamboo: { sky: ['#b9e4b5', '#effbe6'], far: '#88b98a', mid: '#6ea56b', top: '#5c9e4b', dirt: '#5d4632', plat: 'bamboo', part: 'leaf', decor: ['bamboo', 'bamboo', 'bush', 'bamboo', 'rock', 'stonelantern', 'bamboo', 'grass'] },
  beach: { sky: ['#6ec6ff', '#e3f7ff'], far: '#9ad0ec', mid: '#3d9bd6', top: '#f2dc9b', dirt: '#d8bb72', plat: 'wood', water: '#2f8fd1', part: null, decor: ['palm', 'shell', 'rock', 'palm', 'coral', 'starfish', 'barrel'] },
  cave: { sky: ['#15121f', '#2b2340'], far: '#231d33', mid: '#2e2644', top: '#5a5170', dirt: '#3a3349', plat: 'stone', ceiling: true, dark: 0.42, part: 'dust', decor: ['crystal', 'rock', 'stalag', 'crystal', 'bones', 'mushroomglow', 'stalag'] },
  desert: { sky: ['#f8c46b', '#fde9b8'], far: '#e3a65c', mid: '#e9b872', top: '#f0cd85', dirt: '#c99a55', plat: 'stone', part: 'sand', decor: ['cactus', 'rock', 'bones', 'cactus', 'pillar', 'skull', 'cactus'] },
  mist: { sky: ['#8fa3b8', '#d3dde6'], far: '#7d8fa3', mid: '#677a8c', top: '#5d7a5a', dirt: '#4a3d33', plat: 'stone', mist: true, part: 'mist', decor: ['deadtree', 'rock', 'grave', 'pine', 'bush', 'stonelantern', 'deadtree'] },
  snow: { sky: ['#b8d3ec', '#f2f7fc'], far: '#c9d9ea', mid: '#9fb7cf', top: '#f4f8fb', dirt: '#8aa3b8', plat: 'ice', snowcap: true, part: 'snow', decor: ['pine', 'pine', 'rock', 'snowman', 'pine', 'icecrystal'] },
  ice: { sky: ['#9ed8f0', '#e8fbff'], far: '#b6e3f5', mid: '#7cc4e4', top: '#d4f3ff', dirt: '#5d8fb0', plat: 'ice', snowcap: true, part: 'snow', decor: ['icespike', 'pine', 'icespike', 'crystal', 'rock'] },
  dark_forest: { sky: ['#24162f', '#4a2f4f'], far: '#3a2546', mid: '#2f2340', top: '#4a5a46', dirt: '#2a2020', plat: 'wood', dark: 0.34, part: 'firefly', decor: ['deadtree', 'mushroomglow', 'grave', 'deadtree', 'bush', 'pumpkin', 'skull'] },
  lava: { sky: ['#2a0808', '#6e1e0c'], far: '#4a1410', mid: '#5c1a10', top: '#4a3434', dirt: '#2e2020', plat: 'stone', ceiling: true, lava: true, dark: 0.32, part: 'ember', decor: ['rock', 'stalag', 'bones', 'pillar', 'torch', 'rock'] },
  hell: { sky: ['#160303', '#4a0b0b'], far: '#2e0606', mid: '#3b0909', top: '#3a1a1a', dirt: '#1f0e0e', plat: 'stone', lava: true, dark: 0.2, part: 'ember', decor: ['bones', 'pillar', 'deadtree', 'skull', 'torch', 'spikes'] },
  arena: { sky: ['#7fb8f0', '#e6f3ff'], far: '#8aa0b8', mid: '#a58a6c', top: '#b9a58a', dirt: '#8a7457', plat: 'stone', part: null, decor: ['banner', 'torch', 'rack', 'banner', 'torch'] },
};

const C0 = 120; // camY điển hình: mặt đất nằm ở khoảng 3/4 màn hình

function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) | 0;
  return h;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash1 = (n) => {
  let x = Math.imul(n | 0, 0x27d4eb2d) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
};

// ---------------- Màu
const _rgb = new Map();
function rgbOf(c) {
  let v = _rgb.get(c);
  if (v) return v;
  let s = c.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgb.set(c, v);
  return v;
}
function hx(r, g, b) {
  return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
}
function mix(a, b, f) {
  const A = rgbOf(a);
  const B = rgbOf(b);
  return hx(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
}
const shd = (c, f) => (f < 0 ? mix(c, '#000000', -f) : mix(c, '#ffffff', f));
function rgba(c, a) {
  const [r, g, b] = rgbOf(c);
  return `rgba(${r},${g},${b},${a})`;
}
const _u = new Map();
function u32(c) {
  let v = _u.get(c);
  if (v === undefined) {
    const [r, g, b] = rgbOf(c);
    v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    _u.set(c, v);
  }
  return v;
}
// bảng 4 tông từ 1 màu gốc: sáng, gốc, tối, rất tối
const ramp = (c, k = 1) => [shd(c, 0.28 * k), c, shd(c, -0.26 * k), shd(c, -0.48 * k)];

// ---------------- Bộ đệm điểm ảnh (vẽ sẵn nhanh bằng Uint32Array)
class Buf {
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
function blit(dst, src, x, y, o) {
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
function blob(b, cx, cy, rx, ry, pal, o = {}) {
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
function cached(key, fn) {
  let s = SPR.get(key);
  if (!s) {
    s = fn();
    SPR.set(key, s);
  }
  return s;
}

// Ảnh phát sáng mềm cho ánh sáng (vẽ cộng màu)
const GLOW = new Map();
function glow(col, r) {
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
function hole(r) {
  return glow('#ffffff', r);
}

// Chữ pixel nhỏ cho biển hiệu: mảng chuỗi + bảng màu
function pix(b, x, y, rows, pal) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch !== '.' && pal[ch]) b.p(x + i, y + j, pal[ch]);
    }
  }
}

// ======================= Sprite thiên nhiên =======================
const LEAF = {
  green: ['#b4e070', '#78b84a', '#4a8c36', '#2d5e2c'],
  lush: ['#9fd862', '#5fa842', '#3a7c34', '#245228'],
  sakura: ['#ffe6f0', '#fbb4cf', '#ec88ae', '#bd5f8a'],
  maple: ['#ffd56a', '#f6943a', '#d65a2c', '#963624'],
  willow: ['#cfe887', '#93c454', '#629a42', '#3b6a34'],
  pine: ['#5fae6a', '#3a8a52', '#26683f', '#17482e'],
  snowpine: ['#5c9c86', '#3b7a68', '#285c52', '#1a3e3c'],
  mist: ['#9db3a4', '#7c9786', '#5e7a6a', '#44594e'],
  dark: ['#7a6a9a', '#56497a', '#3a3058', '#251e3c'],
  palm: ['#9ad65a', '#5eaa3e', '#3c8034', '#28582a'],
  bamboo: ['#bfe27a', '#86c04c', '#5a9238', '#3a6628'],
};
const BARK = {
  brown: ['#a8764e', '#7a5034', '#523422'],
  dark: ['#7a5450', '#56383a', '#382228'],
  grey: ['#a09a92', '#77706a', '#524c48'],
  purple: ['#6e5878', '#4c3a58', '#30243c'],
  palm: ['#c8a476', '#9c7a52', '#6e5236'],
  pale: ['#c9b9a6', '#9c8a78', '#6e5e52'],
};

function canopy(s, R, cx, cy, r, n, pal, o = {}) {
  // khối nền tối tạo chiều sâu giữa các chùm lá
  blob(s, cx, cy + r * 0.1, r, r * 0.86, [pal[1], pal[2], pal[3], pal[3]], { wob: 0.12, lobes: 6, ph: R() * 6 });
  const cl = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.95 + R() * 1.1) + (i % 2 ? 0.4 : -0.4);
    const d = r * (0.25 + R() * 0.45);
    cl.push([cx + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.8, r * (0.36 + R() * 0.24)]);
  }
  cl.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr] of cl) blob(s, x, y, rr, rr * 0.85, pal, { wob: 0.16, lobes: 5 + ((R() * 4) | 0), ph: R() * 6 });
  // vài đốm sáng
  for (let i = 0; i < n; i++) {
    const x = cx - r * 0.5 + R() * r * 0.6;
    const y = cy - r * 0.6 + R() * r * 0.5;
    if (s.has(x, y)) s.p(x, y, o.spark || shd(pal[0], 0.35));
  }
}

function trunk(s, cx, base, h, tw, bark, lean = 0) {
  for (let y = 0; y < h; y++) {
    const yy = base - y;
    const fl = y < 3 ? 3 - y : 0;
    const x0 = Math.round(cx - tw / 2 - fl + lean * (y / h));
    const ww = tw + fl * 2;
    s.r(x0, yy, ww, 1, bark[1]);
    s.p(x0, yy, bark[0]);
    if (ww > 3) s.p(x0 + 1, yy, bark[0]);
    s.r(x0 + ww - Math.max(1, ww >> 2), yy, Math.max(1, ww >> 2), 1, bark[2]);
    if ((y * 7) % 11 === 0 && ww > 3) s.p(x0 + 2, yy, bark[2]);
  }
}

function sprTree(kind, h, seed, o = {}) {
  const key = `t:${kind}:${h}:${seed}:${o.leaf || ''}:${o.snow ? 1 : 0}`;
  return cached(key, () => {
    const R = rng(seed * 977 + h);
    let s;
    if (kind === 'pine') s = pineSpr(R, h, o);
    else if (kind === 'bamboo') s = bambooSpr(R, h, o);
    else if (kind === 'palm') s = palmSpr(R, h);
    else if (kind === 'dead') s = deadSpr(R, h, o);
    else if (kind === 'cactus') s = cactusSpr(R, h);
    else if (kind === 'willow') s = willowSpr(R, h);
    else {
      const W = Math.round(h * 1.05) + 8;
      s = new Buf(W, h + 4);
      const cx = W / 2;
      const base = h + 2;
      const leaf = LEAF[o.leaf || (kind === 'sakura' ? 'sakura' : kind === 'maple' ? 'maple' : 'green')];
      const bark = kind === 'sakura' ? BARK.dark : BARK.brown;
      const th = Math.round(h * 0.45);
      trunk(s, cx, base, th + 6, Math.max(3, Math.round(h / 11)), bark, kind === 'sakura' ? (R() - 0.5) * 6 : 0);
      const top = base - th;
      s.line(cx, top + 6, cx - h * 0.24, top - h * 0.08, bark[1], 2);
      s.line(cx, top + 3, cx + h * 0.22, top - h * 0.14, bark[1], 2);
      const r = h * 0.33;
      canopy(s, R, cx, top - r * 0.5, r, kind === 'sakura' ? 9 : 7, leaf);
      if (kind === 'sakura') {
        // cành lộ ra và cánh hoa rơi
        s.line(cx - r * 0.2, top - r * 0.2, cx - r * 0.7, top - r * 0.5, bark[2]);
        for (let i = 0; i < 10; i++) {
          const px = cx - r * 1.1 + R() * r * 2.2;
          const py = top + R() * th * 0.9;
          if (!s.has(px, py)) s.p(px, py, R() < 0.5 ? leaf[1] : leaf[0]);
        }
      }
    }
    if (!o.noOutline) s.outline();
    return s;
  });
}

function pineSpr(R, h, o) {
  const W = Math.round(h * 0.62) + 6;
  const s = new Buf(W, h + 4);
  const cx = W / 2;
  const base = h + 2;
  const pal = LEAF[o.leaf || (o.snow ? 'snowpine' : 'pine')];
  trunk(s, cx, base, Math.round(h * 0.2), Math.max(2, Math.round(h / 16)), BARK.brown);
  const tiers = h > 50 ? 5 : 4;
  const top = base - h + 2;
  const bot = base - Math.round(h * 0.14);
  for (let t = 0; t < tiers; t++) {
    const f0 = t / tiers;
    const ty0 = top + (bot - top) * f0 * 0.9;
    const ty1 = top + (bot - top) * ((t + 1) / tiers) + 3;
    const hwMax = (W / 2 - 2) * (0.38 + 0.62 * ((t + 1) / tiers));
    for (let y = Math.floor(ty0); y <= ty1; y++) {
      const f = (y - ty0) / (ty1 - ty0);
      const hw = Math.max(0.8, hwMax * Math.pow(f, 0.85));
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const fx = (x + 0.5 - cx) / hw;
        // mép dưới tầng rủ xuống ở đầu cành
        if (y > ty1 - 2 && Math.abs(fx) < 0.6 && ((x + t) & 3) !== 0) continue;
        let v = -fx * 0.7 - f * 0.25 + ((x + y) & 1 ? 0.08 : -0.08);
        if (Math.abs(fx) > 0.88) v -= 0.25;
        s.p(x, y, v > 0.35 ? pal[0] : v > -0.1 ? pal[1] : v > -0.5 ? pal[2] : pal[3]);
      }
      if (o.snow && f < 0.45) {
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          if (y === Math.floor(ty0) + ((x * 3) & 1) || (f < 0.25 && ((x * 7 + y) % 5 !== 0))) s.p(x, y, x < cx + hw * 0.3 ? '#ffffff' : '#cfe3f2');
        }
      }
    }
    if (o.snow) {
      // tuyết đọng mép tầng
      const ey = Math.floor(ty1) - 1;
      for (let x = Math.floor(cx - hwMax + 1); x < cx + hwMax - 1; x++) if (((x * 5 + t) % 4) < 2) s.p(x, ey, x < cx ? '#ffffff' : '#d8e8f6');
    }
  }
  if (o.snow) { s.p(cx - 1, top - 1, '#ffffff'); s.p(cx, top - 1, '#ffffff'); }
  return s;
}

function bambooSpr(R, h, o) {
  const W = 34;
  const s = new Buf(W, h + 4);
  const base = h + 2;
  const pal = LEAF[o.leaf || 'bamboo'];
  const stalks = 3 + ((R() * 2) | 0);
  for (let k = 0; k < stalks; k++) {
    const bx = 8 + k * 5 + ((R() * 3) | 0);
    const sh = h * (0.7 + R() * 0.3);
    const lean = (R() - 0.5) * 6;
    const nodeGap = 9 + ((R() * 5) | 0);
    for (let y = 0; y < sh; y++) {
      const x = Math.round(bx + lean * (y / sh));
      const yy = base - y;
      const node = y % nodeGap === 0 && y > 0;
      s.p(x, yy, node ? pal[0] : pal[0]);
      s.p(x + 1, yy, node ? pal[3] : pal[1]);
      s.p(x + 2, yy, node ? pal[3] : pal[2]);
      if (node) { s.p(x - 1, yy, pal[3]); s.p(x + 3, yy, pal[3]); }
      // lá ở phần trên
      if (node && y > sh * 0.35 && R() < 0.8) {
        const dir = R() < 0.5 ? -1 : 1;
        const len = 5 + ((R() * 5) | 0);
        for (let i = 1; i <= len; i++) {
          const lxp = x + 1 + dir * i;
          const lyp = yy - 1 + Math.round(i * 0.45);
          s.p(lxp, lyp, i < len / 2 ? pal[1] : pal[0]);
          if (i > 1 && i < len - 1) s.p(lxp, lyp + 1, pal[2]);
        }
      }
    }
  }
  return s;
}

function palmSpr(R, h) {
  const W = Math.round(h * 0.9) + 10;
  const s = new Buf(W, h + 6);
  const base = h + 4;
  const bark = BARK.palm;
  const curve = (R() < 0.5 ? -1 : 1) * (5 + R() * 5);
  let tx = 0;
  let ty = 0;
  for (let y = 0; y < h * 0.85; y++) {
    const f = y / (h * 0.85);
    const x = Math.round(W / 2 + Math.sin(f * 1.6) * curve);
    const yy = base - y;
    const ring = y % 4 === 0;
    s.p(x - 1, yy, ring ? bark[2] : bark[0]);
    s.p(x, yy, ring ? bark[2] : bark[1]);
    s.p(x + 1, yy, bark[2]);
    if (y < 3) { s.p(x - 2, yy, bark[1]); s.p(x + 2, yy, bark[2]); }
    tx = x;
    ty = yy;
  }
  const pal = LEAF.palm;
  const fr = [[-1, -0.35], [1, -0.35], [-0.85, 0.2], [0.85, 0.25], [-0.45, -0.85], [0.4, -0.9], [0.15, 0.5]];
  for (const [dx, dy] of fr) {
    const len = h * 0.42 * (0.8 + R() * 0.3);
    let px = tx;
    let py = ty;
    for (let i = 0; i < len; i++) {
      const f = i / len;
      const nx = tx + dx * i;
      const ny = ty + dy * i + f * f * len * 0.55;
      s.p(nx, ny, pal[2]);
      // lá chét
      if (i > 2 && i % 2 === 0) {
        s.p(nx, ny + 1, pal[1]);
        s.p(nx, ny + 2, f < 0.6 ? pal[0] : pal[1]);
        s.p(nx, ny - 1, pal[1]);
        if (f < 0.75) s.p(nx, ny + 3, pal[2]);
      }
      px = nx; py = ny;
    }
    void px; void py;
  }
  // dừa
  s.ell(tx - 1, ty + 2, 1.6, 1.6, '#7a5232');
  s.ell(tx + 2, ty + 3, 1.6, 1.6, '#6a4428');
  s.p(tx - 2, ty + 1, '#a8784a');
  return s;
}

function deadSpr(R, h, o) {
  const W = Math.round(h * 0.95) + 8;
  const s = new Buf(W, h + 4);
  const bark = BARK[o.bark || 'grey'];
  const base = h + 2;
  const branch = (x, y, ang, len, th, depth) => {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const steps = Math.ceil(len);
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const bx = x + (x2 - x) * f + Math.sin(f * 5 + depth) * 0.8;
      const by = y + (y2 - y) * f;
      const t = Math.max(1, Math.round(th * (1 - f * 0.5)));
      s.r(bx - (t >> 1), by, t, 1, bark[1]);
      s.p(bx - (t >> 1), by, bark[0]);
      if (t > 2) s.p(bx - (t >> 1) + t - 1, by, bark[2]);
    }
    if (depth <= 0 || len < 4) return;
    const n = depth > 2 ? 2 : 1 + ((R() * 2) | 0);
    for (let i = 0; i < n; i++) branch(x2, y2, ang + (R() - 0.5) * 1.6 + (i ? 0.5 : -0.5), len * (0.55 + R() * 0.2), Math.max(1, th * 0.6), depth - 1);
  };
  const th = Math.max(3, Math.round(h / 9));
  branch(W / 2, base, -Math.PI / 2 + (R() - 0.5) * 0.2, h * 0.42, th, 4);
  // rễ
  s.r(W / 2 - th, base - 1, th * 2 + 2, 2, bark[1]);
  s.p(W / 2 - th - 1, base, bark[2]);
  s.p(W / 2 + th + 2, base, bark[2]);
  if (o.eyes) {
    // hốc cây có đôi mắt phát sáng (rừng ma)
    s.r(W / 2 - 2, base - h * 0.3, 4, 3, '#140c1c');
    s.p(W / 2 - 1, base - h * 0.3 + 1, '#ffe066');
    s.p(W / 2 + 1, base - h * 0.3 + 1, '#ffe066');
  }
  return s;
}

function cactusSpr(R, h) {
  const W = 26;
  const s = new Buf(W, h + 4);
  const base = h + 2;
  const pal = ['#9ccc65', '#689f38', '#4a7a2a', '#33561e'];
  const col = (x, y0, y1, w) => {
    for (let y = y0; y < y1; y++) for (let i = 0; i < w; i++) {
      const f = i / (w - 1);
      s.p(x + i, y, f < 0.25 ? pal[0] : f < 0.65 ? pal[1] : pal[2]);
    }
    // đầu tròn
    s.r(x + 1, y0 - 1, w - 2, 1, pal[1]);
    s.p(x + 1, y0 - 1, pal[0]);
  };
  const cx = 11;
  col(cx, base - h + 2, base + 1, 5);
  const a1 = base - h * (0.45 + R() * 0.15);
  col(cx - 6, a1 - 9, a1, 4);
  s.r(cx - 6, a1 - 1, 7, 3, pal[1]);
  s.r(cx - 6, a1 + 1, 7, 1, pal[2]);
  const a2 = base - h * (0.3 + R() * 0.15);
  col(cx + 7, a2 - 11, a2, 4);
  s.r(cx + 4, a2 - 1, 6, 3, pal[1]);
  s.r(cx + 4, a2 + 1, 6, 1, pal[2]);
  for (let y = base - h + 4; y < base; y += 3) { s.p(cx + 2, y, pal[3]); s.p(cx - 1, y + 1, '#e8f5c8'); }
  if (R() < 0.6) { s.p(cx + 2, base - h, '#ff6f91'); s.p(cx + 1, base - h + 1, '#ff9eb5'); s.p(cx + 3, base - h + 1, '#ff9eb5'); }
  return s;
}

function willowSpr(R, h) {
  const W = Math.round(h * 0.95) + 8;
  const s = new Buf(W, h + 4);
  const cx = W / 2;
  const base = h + 2;
  const pal = LEAF.willow;
  trunk(s, cx, base, Math.round(h * 0.6), Math.max(3, Math.round(h / 11)), BARK.brown, 2);
  const top = base - h * 0.62;
  canopy(s, R, cx, top - h * 0.1, h * 0.3, 6, pal);
  for (let x = Math.round(cx - h * 0.42); x < cx + h * 0.42; x += 2) {
    const len = h * (0.25 + R() * 0.35) * (1 - Math.abs(x - cx) / (h * 0.6));
    const y0 = top - h * 0.05 + Math.abs(x - cx) * 0.25;
    for (let y = 0; y < len; y++) s.p(x + Math.round(Math.sin(y * 0.3 + x) * 0.6), y0 + y, y > len - 3 ? pal[0] : (x & 2) ? pal[1] : pal[2]);
  }
  return s;
}

function sprBush(w, seed, leaf = 'green', flowers = null) {
  return cached(`b:${w}:${seed}:${leaf}:${flowers}`, () => {
    const R = rng(seed);
    const h = Math.round(w * 0.6);
    const s = new Buf(w + 6, h + 4);
    const pal = LEAF[leaf] || leaf;
    const n = 3 + ((w / 8) | 0);
    for (let i = 0; i < n; i++) {
      const x = 3 + w * (0.15 + 0.7 * (i / (n - 1 || 1)));
      const r = w * (0.2 + R() * 0.12);
      blob(s, x, h + 2 - r * 0.8, r, r * 0.85, pal, { cut: h + 2, wob: 0.15, ph: R() * 6 });
    }
    if (flowers) for (let i = 0; i < w / 3; i++) {
      const x = 4 + R() * (w - 2);
      const y = 2 + R() * (h - 2);
      if (s.has(x, y)) s.p(x, y, flowers[i % flowers.length]);
    }
    return s.outline();
  });
}

function sprRock(w, h, seed, pal, o = {}) {
  return cached(`r:${w}:${h}:${seed}:${pal.join()}:${o.moss || ''}:${o.snow ? 1 : 0}`, () => {
    const R = rng(seed);
    const s = new Buf(w + 4, h + 4);
    blob(s, w / 2 + 2, h + 2, w / 2, h, pal, { cut: h + 1, wob: 0.08, lobes: 5, ph: R() * 6 });
    if (R() < 0.8) blob(s, w * (0.25 + R() * 0.5) + 2, h + 2, w * 0.28, h * 0.6, pal, { cut: h + 1, sh: 0.1 });
    // vết nứt
    let cx = w * (0.3 + R() * 0.4) + 2;
    for (let y = h * 0.35; y < h; y++) { cx += (R() - 0.5) * 1.6; if (s.has(cx, y)) s.p(cx, y, pal[3]); }
    if (o.moss || o.snow) {
      const mc = o.snow ? ['#ffffff', '#dbe9f5'] : [shd(o.moss, 0.2), o.moss];
      for (let x = 0; x < w + 4; x++) {
        let top = -1;
        for (let y = 0; y < h + 4; y++) if (s.has(x, y)) { top = y; break; }
        if (top < 0) continue;
        const d = o.snow ? 2 + ((x * 7) % 3 === 0 ? 1 : 0) : (x * 5) % 3;
        for (let y = top; y < top + d; y++) s.p(x, y, x < w * 0.6 ? mc[0] : mc[1]);
      }
    }
    return s.outline();
  });
}

function sprCrystal(h, col, seed) {
  return cached(`c:${h}:${col}:${seed}`, () => {
    const R = rng(seed);
    const W = Math.round(h * 1.1) + 6;
    const s = new Buf(W, h + 4);
    const base = h + 2;
    const L = shd(col, 0.45);
    const M = col;
    const D = shd(col, -0.35);
    const n = 3 + ((R() * 2) | 0);
    const list = [];
    for (let i = 0; i < n; i++) list.push([W / 2 + (i - (n - 1) / 2) * h * 0.24 + (R() - 0.5) * 3, h * (i === ((n / 2) | 0) ? 1 : 0.45 + R() * 0.35), (R() - 0.5) * 0.7]);
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, hh, lean] of list) {
      const w = Math.max(3, Math.round(hh * 0.3));
      const tipx = x + lean * hh * 0.5;
      const ty = base - hh;
      const shoulder = ty + w * 0.9;
      // mặt trái sáng, mặt phải tối
      s.poly([[x - w / 2, base], [x - w / 2 + lean * hh * 0.4, shoulder], [tipx, ty], [tipx, base]], M);
      s.poly([[tipx, ty], [x + w / 2 + lean * hh * 0.4, shoulder], [x + w / 2, base], [tipx, base]], D);
      s.line(x - w / 2 + 1 + lean * hh * 0.35, shoulder + 1, x - w / 2 + 1, base - 1, L);
      s.line(tipx, ty + 1, tipx, base - 2, shd(col, 0.2));
      s.p(tipx, ty, '#ffffff');
    }
    s.r(W / 2 - h * 0.45, base, h * 0.9, 2, '#3a3346');
    s.outline(0.5);
    s.glowCol = col;
    return s;
  });
}

// --------- Đồ vật nhỏ (dùng chung cho nhiều chủ đề)
function sprProp(kind, seed, th) {
  return cached(`p:${kind}:${seed}:${th}`, () => {
    const R = rng(seed);
    let s;
    switch (kind) {
      case 'stonelantern': {
        s = new Buf(16, 30);
        const g = ['#c9c4bc', '#a39d94', '#7c766e', '#58534d'];
        s.r(4, 26, 8, 3, g[2]); s.r(5, 25, 6, 1, g[1]);
        s.r(6, 16, 4, 9, g[1]); s.r(6, 16, 1, 9, g[0]); s.r(9, 16, 1, 9, g[2]);
        s.r(3, 14, 10, 2, g[1]); s.r(3, 14, 10, 1, g[0]);
        s.r(4, 8, 8, 6, g[2]); s.r(6, 9, 4, 4, '#ffd27a'); s.r(7, 10, 2, 2, '#fff2c0');
        s.r(4, 8, 1, 6, g[1]);
        s.poly([[1, 8], [8, 3], [15, 8]], g[1]); s.r(1, 7, 14, 2, g[2]); s.r(2, 6, 6, 1, g[0]);
        s.r(7, 1, 2, 3, g[1]);
        break;
      }
      case 'lanternpost': {
        s = new Buf(14, 42);
        s.r(6, 8, 2, 34, '#4a2e22'); s.r(6, 8, 1, 34, '#6e4630');
        s.r(2, 6, 10, 2, '#3a2418');
        s.r(3, 10, 8, 2, '#2a1a14');
        lanternDraw(s, 7, 12, 1);
        break;
      }
      case 'barrel': {
        s = new Buf(14, 16);
        const w = ['#c08a52', '#9a6a3e', '#74502e'];
        s.ell(7, 8, 6, 7.5, w[1]); s.r(2, 3, 2, 10, w[0]); s.r(10, 3, 2, 10, w[2]);
        s.r(1, 4, 12, 1, '#5a5a62'); s.r(1, 11, 12, 1, '#5a5a62'); s.r(3, 1, 8, 1, w[2]);
        break;
      }
      case 'crate': {
        s = new Buf(14, 13);
        s.r(1, 1, 12, 11, '#b08450'); s.r(1, 1, 12, 1, '#d0a46c'); s.r(1, 11, 12, 1, '#7a5430');
        s.line(2, 2, 11, 10, '#8a6038'); s.r(1, 1, 1, 11, '#8a6038'); s.r(12, 1, 1, 11, '#8a6038');
        break;
      }
      case 'fence': {
        s = new Buf(40, 14);
        const w = th === 'bamboo' ? ['#c8d87a', '#98b04e', '#6a8434'] : ['#b08a62', '#8a6644', '#5e432c'];
        for (let i = 0; i < 6; i++) { const x = 2 + i * 7; s.r(x, 2, 3, 12, w[1]); s.r(x, 2, 1, 12, w[0]); s.p(x + 1, 1, w[1]); s.r(x + 2, 3, 1, 11, w[2]); }
        s.r(0, 5, 40, 2, w[1]); s.r(0, 5, 40, 1, w[0]); s.r(0, 10, 40, 2, w[1]); s.r(0, 11, 40, 1, w[2]);
        if (th === 'bamboo') for (let i = 0; i < 6; i++) { s.p(3 + i * 7, 6, '#7a5a3a'); s.p(3 + i * 7, 11, '#7a5a3a'); }
        break;
      }
      case 'well': {
        s = new Buf(34, 40);
        const g = ['#bdb7ae', '#958f86', '#6e6962'];
        s.r(5, 26, 24, 13, g[1]);
        for (let y = 27; y < 39; y += 4) for (let x = 5 + ((y >> 2) & 1) * 3; x < 29; x += 6) { s.r(x, y, 5, 3, g[0]); s.p(x + 4, y + 2, g[2]); }
        s.r(4, 24, 26, 3, '#7a5a3a'); s.r(4, 24, 26, 1, '#a07a50');
        s.r(6, 8, 2, 17, '#5a3a26'); s.r(26, 8, 2, 17, '#5a3a26');
        s.poly([[1, 9], [17, 1], [33, 9], [30, 10], [4, 10]], th === 'water' ? '#3a6fb8' : th === 'wind' ? '#4a9a52' : '#c8452e');
        s.r(2, 9, 30, 2, '#2a1a18');
        s.r(7, 12, 20, 1, '#6e4a30'); s.line(17, 12, 17, 18, '#8a7a6a'); s.r(15, 18, 5, 4, '#8a5a34');
        break;
      }
      case 'cart': {
        s = new Buf(44, 30);
        s.r(4, 12, 30, 9, '#a8784a'); s.r(4, 12, 30, 2, '#c8985e'); s.r(4, 20, 30, 1, '#6e4a2e');
        s.r(4, 6, 2, 7, '#7a5232'); s.r(32, 6, 2, 7, '#7a5232'); s.r(3, 5, 32, 2, '#c84a32');
        s.line(34, 18, 43, 22, '#6e4a2e');
        s.ell(14, 23, 6.5, 6.5, '#4a3020'); s.ell(14, 23, 4.5, 4.5, '#a8784a'); s.ell(14, 23, 1.5, 1.5, '#4a3020');
        for (let a = 0; a < 6; a++) s.line(14, 23, 14 + Math.cos(a) * 4.5, 23 + Math.sin(a) * 4.5, '#6e4a2e');
        // hàng hóa
        s.r(8, 8, 8, 5, '#d8c090'); s.r(18, 9, 10, 4, '#7aa04a'); s.r(8, 8, 8, 1, '#f0dcb0');
        break;
      }
      case 'boat': {
        s = new Buf(50, 20);
        s.poly([[0, 8], [49, 8], [42, 17], [7, 17]], '#9a6a3e');
        s.r(1, 8, 48, 2, '#c08a52'); s.r(8, 15, 34, 2, '#6e4a2e');
        s.r(24, 0, 2, 9, '#6e4a2e'); s.poly([[26, 1], [36, 6], [26, 7]], '#f0e8d8');
        break;
      }
      case 'board': {
        s = new Buf(30, 34);
        s.r(3, 8, 2, 26, '#5a3a26'); s.r(25, 8, 2, 26, '#5a3a26');
        s.r(2, 8, 26, 18, '#8a6040'); s.r(3, 9, 24, 16, '#b08454');
        s.poly([[0, 8], [15, 2], [30, 8]], '#4a3a30'); s.r(0, 7, 30, 2, '#2a1e18');
        s.r(5, 11, 7, 8, '#f6eedc'); s.r(14, 12, 6, 6, '#fff8e8'); s.r(21, 11, 5, 9, '#f0e4c8');
        s.r(6, 13, 5, 1, '#9a8a7a'); s.r(6, 15, 4, 1, '#9a8a7a'); s.r(15, 14, 4, 1, '#c0392b'); s.r(22, 13, 3, 1, '#9a8a7a');
        s.p(8, 11, '#c0392b'); s.p(16, 12, '#c0392b'); s.p(23, 11, '#c0392b');
        break;
      }
      case 'anvil': {
        s = new Buf(16, 12);
        s.r(4, 8, 8, 4, '#5a3a26'); s.r(2, 2, 12, 3, '#5c5e66'); s.r(2, 2, 12, 1, '#8a8c96'); s.r(0, 2, 3, 2, '#5c5e66'); s.r(5, 5, 6, 3, '#45474e');
        break;
      }
      case 'pots': {
        s = new Buf(20, 12);
        s.ell(5, 7, 4.5, 4.5, '#a0583a'); s.ell(5, 6, 2.5, 2, '#c87a52'); s.r(3, 2, 5, 1, '#7a3e28');
        s.ell(14, 8, 4, 3.5, '#4a6e8a'); s.ell(13, 7, 2, 1.5, '#7a9ab8');
        s.r(12, 2, 3, 3, '#6aa04a'); s.p(11, 1, '#8ac860'); s.p(15, 1, '#8ac860');
        break;
      }
      case 'bench': {
        s = new Buf(30, 10);
        s.r(0, 3, 30, 3, '#b0303a'); s.r(0, 3, 30, 1, '#d04a50'); s.r(2, 6, 2, 4, '#5a3a26'); s.r(26, 6, 2, 4, '#5a3a26');
        s.r(-1, 0, 32, 3, '#e8d8b8');
        s.r(10, 1, 3, 2, '#ffffff'); s.r(18, 1, 3, 2, '#ffffff');
        break;
      }
      case 'shell': {
        s = new Buf(16, 6);
        s.ell(4, 4, 3, 2.5, '#ffccbc'); s.r(2, 3, 1, 2, '#e8a090'); s.r(5, 3, 1, 2, '#e8a090');
        s.ell(12, 5, 2, 1.5, '#fff3e0');
        break;
      }
      case 'starfish': {
        s = new Buf(10, 8);
        const c = '#ff8a65';
        s.r(4, 1, 2, 6, c); s.r(1, 3, 8, 2, c); s.p(2, 6, c); s.p(7, 6, c); s.p(4, 2, '#ffccbc');
        break;
      }
      case 'coral': {
        s = new Buf(20, 18);
        const c = R() < 0.5 ? ['#ff8a80', '#ff5252', '#c62828'] : ['#ffab91', '#ff7043', '#d84315'];
        s.line(10, 17, 10, 4, c[1], 2); s.line(10, 12, 4, 6, c[1], 2); s.line(10, 10, 16, 3, c[1], 2); s.line(5, 7, 3, 2, c[0]); s.line(15, 4, 17, 1, c[0]);
        s.r(4, 15, 12, 3, '#8a8f98'); s.r(5, 14, 10, 1, '#a3a8b0');
        break;
      }
      case 'reed': {
        s = new Buf(16, 28);
        for (let i = 0; i < 5; i++) {
          const x = 2 + i * 3;
          const h = 16 + ((R() * 10) | 0);
          s.line(x, 27, x + (i - 2) * 0.8, 27 - h, i & 1 ? '#7a9a3a' : '#5e7e2c');
          if (i % 2 === 0) { s.r(x - 1 + (i - 2) * 0.8, 27 - h - 3, 2, 5, '#8d6e53'); s.p(x + (i - 2) * 0.8, 27 - h - 3, '#a8886a'); }
        }
        break;
      }
      case 'bones': {
        s = new Buf(20, 8);
        s.r(2, 5, 10, 2, '#eeeae0'); s.r(1, 4, 2, 2, '#ffffff'); s.r(1, 6, 2, 2, '#d8d2c4'); s.r(11, 4, 2, 2, '#ffffff'); s.r(11, 6, 2, 2, '#d8d2c4');
        s.ell(16, 4, 3.2, 3, '#e8e2d4'); s.r(15, 3, 1, 2, '#2a2020'); s.r(17, 3, 1, 2, '#2a2020'); s.r(14, 6, 5, 2, '#d0c8b8');
        break;
      }
      case 'skull': {
        s = new Buf(12, 11);
        s.ell(6, 5, 5, 4.6, '#ece6d8'); s.ell(4.5, 3.5, 2, 1.5, '#ffffff'); s.r(3, 8, 6, 3, '#d4ccbc');
        s.r(3, 5, 2, 2, '#2a1a1a'); s.r(7, 5, 2, 2, '#2a1a1a'); s.p(6, 7, '#2a1a1a'); s.p(4, 10, '#8a8274'); s.p(7, 10, '#8a8274');
        break;
      }
      case 'grave': {
        s = new Buf(16, 20);
        const g = ['#b4b8bc', '#8e9296', '#6a6e72'];
        s.r(3, 5, 10, 14, g[1]); s.ell(8, 5, 5, 4, g[1]); s.r(3, 5, 2, 14, g[0]); s.r(11, 5, 2, 14, g[2]);
        s.r(7, 7, 2, 7, g[2]); s.r(5, 9, 6, 2, g[2]);
        s.r(1, 18, 14, 2, '#5d7050'); s.p(2, 17, '#7a9a5a'); s.p(13, 17, '#7a9a5a');
        break;
      }
      case 'mushroomglow': {
        s = new Buf(18, 14);
        const cap = th === 'cave' ? ['#b3f0ff', '#4fc3f7', '#1e88c8'] : ['#f0b8ff', '#ba68c8', '#7b3a9e'];
        s.r(4, 7, 2, 7, '#e6dcf0'); s.ell(5, 6, 4.5, 3, cap[1]); s.ell(4, 5, 2, 1.2, cap[0]); s.p(3, 7, cap[2]); s.p(7, 6, cap[0]);
        s.r(12, 9, 2, 5, '#e6dcf0'); s.ell(13, 8.5, 3.5, 2.2, cap[1]); s.p(12, 7, cap[0]);
        s.r(8, 12, 1, 2, '#e6dcf0'); s.ell(8.5, 11.5, 2, 1.2, cap[1]);
        break;
      }
      case 'pumpkin': {
        s = new Buf(16, 13);
        s.ell(8, 8, 7, 5, '#e8742a'); s.ell(5, 8, 2, 4.5, '#f59a3a'); s.ell(11, 8, 2, 4.5, '#c85a1e');
        s.r(7, 1, 2, 3, '#4a6a2a');
        s.r(5, 6, 2, 2, '#ffe066'); s.r(10, 6, 2, 2, '#ffe066'); s.r(6, 10, 5, 1, '#ffe066');
        break;
      }
      case 'snowman': {
        s = new Buf(18, 24);
        s.ell(9, 17, 7, 6.5, '#ffffff'); s.ell(9, 8, 5, 4.6, '#ffffff');
        s.ell(11, 19, 4, 3, '#dbe9f5'); s.ell(10.5, 9.5, 2.5, 2, '#dbe9f5');
        s.r(5, 1, 8, 2, '#3a3a4a'); s.r(6, -2, 6, 3, '#3a3a4a');
        s.p(7, 7, '#212121'); s.p(10, 7, '#212121'); s.r(9, 9, 3, 1, '#ff7043');
        s.r(4, 12, 10, 2, '#e53935'); s.r(12, 13, 2, 4, '#c62828');
        s.line(2, 12, 0, 9, '#6d4c41'); s.line(16, 12, 17, 8, '#6d4c41');
        break;
      }
      case 'icespike': {
        s = new Buf(26, 34);
        for (const [x, h, w] of [[6, 18, 5], [13, 32, 7], [20, 22, 5]]) {
          s.poly([[x - w / 2, 33], [x, 33 - h], [x + w / 2, 33]], '#a8dcf4');
          s.poly([[x, 33 - h], [x + w / 2, 33], [x, 33]], '#6fb4dc');
          s.line(x - 1, 33 - h * 0.7, x - w / 2 + 1, 32, '#ffffff');
        }
        break;
      }
      case 'stalag': {
        const pal = th === 'lava' ? ['#6a4440', '#4a3030', '#332020'] : ['#7a6e90', '#5a5070', '#3e3652'];
        s = new Buf(22, 30);
        for (const [x, h, w] of [[11, 28, 9], [5, 14, 6], [17, 18, 6]]) {
          s.poly([[x - w / 2, 30], [x - 0.5, 30 - h], [x + 0.5, 30 - h], [x + w / 2, 30]], pal[1]);
          s.poly([[x, 30 - h], [x + w / 2, 30], [x + 1, 30]], pal[2]);
          s.line(x - 1, 30 - h + 3, x - w / 2 + 1, 29, pal[0]);
          for (let y = 30 - h + 4; y < 29; y += 5) s.p(x, y, pal[2]);
        }
        break;
      }
      case 'pillar': {
        const pal = th === 'desert' ? ['#f0d8a8', '#d8b67c', '#b08a54', '#8a6a40'] : th === 'hell' || th === 'lava' ? ['#7a5a5a', '#5a4040', '#402c2c', '#2a1c1c'] : ['#d8d8d8', '#b4b4b4', '#8a8a8a', '#666666'];
        const h = 34 + ((R() * 22) | 0);
        s = new Buf(20, h + 4);
        const top = 4;
        s.r(3, top + 4, 14, h - 6, pal[1]);
        for (let x = 4; x < 16; x += 3) s.r(x, top + 5, 1, h - 8, pal[2]);
        s.r(3, top + 4, 2, h - 6, pal[0]); s.r(15, top + 4, 2, h - 6, pal[3]);
        s.r(1, h - 1, 18, 4, pal[2]); s.r(1, h - 1, 18, 1, pal[1]);
        // đỉnh gãy
        s.r(1, top + 1, 18, 3, pal[1]); s.r(1, top + 1, 18, 1, pal[0]);
        s.poly([[3, top + 1], [7, top - 3], [11, top], [14, top - 2], [17, top + 1]], pal[1]);
        s.r(4, top + 14, 3, 2, pal[3]); s.r(12, top + 22, 3, 3, pal[3]);
        if (th === 'hell' || th === 'lava') { s.r(6, top + 18, 1, 6, '#ff7a2a'); s.r(13, top + 9, 1, 4, '#ff9a3a'); }
        if (th === 'desert') { s.r(1, h, 18, 2, '#e8c07a'); }
        break;
      }
      case 'torch': {
        s = new Buf(10, 30);
        s.r(4, 8, 2, 22, '#5a3a26'); s.r(4, 8, 1, 22, '#7a5232');
        s.r(2, 6, 6, 3, '#4a4a52'); s.r(2, 6, 6, 1, '#7a7a86'); s.r(3, 4, 4, 2, '#3a3a40');
        break;
      }
      case 'banner': {
        s = new Buf(20, 64);
        s.r(2, 2, 2, 62, '#5d4037'); s.r(2, 2, 1, 62, '#8d6e63'); s.ell(3, 2, 2, 2, '#ffd54f');
        s.r(0, 62, 6, 2, '#4a3020');
        break;
      }
      case 'rack': {
        s = new Buf(24, 26);
        s.r(2, 4, 2, 22, '#6e4a30'); s.r(20, 4, 2, 22, '#6e4a30'); s.r(1, 6, 22, 2, '#8a6040'); s.r(1, 16, 22, 2, '#8a6040');
        s.line(6, 2, 6, 24, '#c0c4cc'); s.r(5, 13, 3, 1, '#7a5232');
        s.line(11, 3, 11, 24, '#8a6040'); s.poly([[9, 3], [11, -1], [13, 3]], '#c0c4cc');
        s.line(17, 4, 17, 24, '#8a6040'); s.r(15, 3, 5, 2, '#9aa0aa');
        break;
      }
      case 'spikes': {
        s = new Buf(24, 14);
        for (let i = 0; i < 5; i++) { const x = 2 + i * 5; const h = 7 + ((i * 7) % 6); s.poly([[x - 2, 14], [x, 14 - h], [x + 2, 14]], '#4a3a3a'); s.line(x, 14 - h, x - 1, 13, '#7a6060'); s.p(x, 14 - h, '#c84a2a'); }
        break;
      }
      case 'icecrystal': {
        return sprCrystal(16 + seed % 8, '#9fe4ff', seed);
      }
      default:
        s = new Buf(2, 2);
    }
    return s.outline();
  });
}

// đèn lồng giấy đỏ (dùng trong sprite)
function lanternDraw(s, cx, y, sc = 1, col = '#e0352b') {
  const w = 7 * sc;
  const h = 9 * sc;
  s.r(cx - 1, y - 1, 2, 2, '#2a1a14');
  s.r(cx - w / 2 + 1, y + 1, w - 2, 1, '#2a1a14');
  s.ell(cx, y + 2 + h / 2, w / 2 + 0.5, h / 2, col);
  s.ell(cx - 0.5, y + 2 + h / 2, w / 2 - 1.5, h / 2 - 1, shd(col, 0.25));
  s.r(cx - 1, y + 3, 2, h - 2, '#ffd27a');
  for (let k = 1; k < 4; k++) s.r(cx - w / 2 + 1, y + 2 + (h * k) / 4, w - 2, 1, shd(col, -0.25));
  s.r(cx - w / 2 + 1, y + 2 + h, w - 2, 1, '#2a1a14');
  s.r(cx, y + 3 + h, 1, 2, '#e8b04a');
}

// ======================= Lớp parallax (dải ảnh lặp) =======================
const TAU = Math.PI * 2;
const wrapd = (d, W) => ((((d + W / 2) % W) + W) % W) - W / 2;
function periodic(W, R, terms) {
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
const fades = (c, base) => [c, mix(c, base, 0.3), mix(c, base, 0.6)];
function fadeIdx(x, y, H, fadeH) {
  const f = (y - (H - fadeH)) / fadeH + ((x + y) & 1 ? 0.1 : -0.1);
  return f < 0.33 ? 0 : f < 0.7 ? 1 : 2;
}

function bMount(b, o, R) {
  const W = b.w;
  const H = b.h;
  const n = o.n || 6;
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const st = o.steep || 1;
    peaks.push({ x: ((i + 0.15 + R() * 0.7) * W) / n, h: o.hmin + R() * (o.hmax - o.hmin), sl: (0.55 + R() * 0.5) * st, sr: (0.55 + R() * 0.5) * st, dv: (R() - 0.5) * 0.6, g: [-0.5 - R() * 0.5, -0.15 + R() * 0.3, 0.45 + R() * 0.5].slice(0, 2 + ((R() * 2) | 0)) });
  }
  if (o.volcano) Object.assign(peaks[1], { h: o.hmax, vol: true, sl: 0.8, sr: 0.75 });
  const jag = periodic(W, R, [[9, 2.2], [23, 1.1], [57, 0.6]]);
  const top = new Float32Array(W);
  const own = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    let best = -1e9;
    for (let k = 0; k < n; k++) {
      const p = peaks[k];
      const dx = wrapd(x - p.x, W);
      let hh = p.h - (dx < 0 ? -dx * p.sl : dx * p.sr);
      if (p.vol) hh = Math.min(hh, p.h - 7);
      if (hh > best) { best = hh; own[x] = k; }
    }
    top[x] = H - 1 - Math.max(o.minH || 6, best + jag[x] * (o.jag || 1));
  }
  const base = o.base || o.shd;
  const L = fades(o.lit, base);
  const D = fades(o.shd, base);
  const S = fades(o.snow || o.lit, base);
  const SS = fades(o.snowS || o.shd, base);
  const LD = fades(mix(o.lit, o.shd, 0.6), base);
  const DL = fades(mix(o.shd, o.lit, 0.22), base);
  const fadeH = o.fade || Math.round(H * 0.45);
  for (let x = 0; x < W; x++) {
    const p = peaks[own[x]];
    const dx = wrapd(x - p.x, W);
    const ty = Math.max(0, Math.ceil(top[x]));
    for (let y = ty; y < H; y++) {
      const fromPeak = y - (H - 1 - p.h);
      const div = fromPeak * p.dv + Math.sin(y * 0.6 + p.x) * 1.3 + Math.sin(y * 0.23) * 2;
      const lit = dx < div;
      // khe núi tỏa xuống từ đỉnh
      let crease = false;
      if (fromPeak > 6 && fromPeak < p.h * 0.85) for (const g of p.g) if (Math.abs(dx - fromPeak * g + Math.sin(fromPeak * 0.22 + g * 9) * 2) < 0.55 + fromPeak * 0.006) crease = true;
      const fi = fadeIdx(x, y, H, fadeH);
      const snowD = o.snow && p.h > (o.snowLine || 70) ? (p.h - (o.snowLine || 70)) * 0.55 + Math.sin(x * 0.9) * 2 + Math.sin(x * 0.31) * 2.5 : -1;
      let c;
      if (fromPeak < snowD) c = lit ? (crease ? SS[fi] : S[fi]) : crease ? S[Math.min(2, fi + 1)] : SS[fi];
      else c = lit ? (crease ? LD[fi] : L[fi]) : crease ? DL[fi] : D[fi];
      if (y === ty && o.rim) c = lit ? o.rim : fromPeak < snowD ? S[0] : mix(o.shd, o.rim, 0.25);
      b.p(x, y, c);
    }
  }
  if (o.volcano) {
    const p = peaks[1];
    const cy = H - 1 - (p.h - 7) + 1;
    for (let i = -6; i <= 6; i++) { b.p(p.x + i, cy - 1, i % 3 ? '#ff8a3c' : '#ffd36a'); b.p(p.x + i, cy, '#c8401e'); }
    halo(b, p.x, cy - 2, 14, '#ff8a4a', 0.4);
    const sm = o.smoke || ['#e6c8c8', '#c8a0aa', '#a07a8a', '#80607a'];
    for (let i = 0; i < 7; i++) blob(b, p.x + i * 5 + R() * 3, cy - 8 - i * 6, 5 + i * 1.3, 4 + i, sm, { wob: 0.15, ph: R() * 6 });
  }
}

function bHills(b, o, R) {
  const W = b.w;
  const H = b.h;
  const prof = periodic(W, R, [[2, o.amp], [3, o.amp * 0.6], [5, o.amp * 0.35], [9, o.amp * 0.15]]);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = Math.round(H - 1 - (o.base + prof[x]));
  const B = fades(o.col, o.dark);
  const Lt = fades(o.lit, o.dark);
  const fadeH = Math.round(H * 0.6);
  for (let x = 0; x < W; x++) {
    const sl = top[(x + 2) % W] - top[(x + W - 2) % W];
    for (let y = Math.max(0, top[x]); y < H; y++) {
      const d = y - top[x];
      const fi = fadeIdx(x, y, H, fadeH);
      let c = sl < 0 && d < 6 + ((x * 3) % 3) ? Lt[fi] : B[fi];
      if (d === 0) c = o.rim || Lt[0];
      if (o.terrace && d > 2 && (y + Math.round(Math.sin(x * 0.045) * 2)) % 6 === 0) c = Lt[Math.min(2, fi)];
      if (o.terrace && d > 2 && (y + Math.round(Math.sin(x * 0.045) * 2)) % 6 === 1) c = mix(B[fi], o.dark, 0.3);
      b.p(x, y, c);
    }
  }
  // bụi cây trên sườn
  const tp = o.trees;
  if (tp) {
    const cnt = o.treeN || 60;
    for (let i = 0; i < cnt; i++) {
      const x = R() * W;
      const yy = top[Math.floor(x) % W] + (i % 3 === 0 ? 2 + R() * (H * 0.35) : 1);
      const r = 2.5 + R() * (o.treeR || 4);
      if (o.treeKind === 'pine') {
        for (let k = 0; k < r * 2.4; k++) { const hw = Math.round((k / (r * 2.4)) * r * 0.8); b.r(x - hw, yy - r * 2.4 + k, hw * 2 + 1, 1, k < r ? tp[1] : tp[2]); if (o.snowy && k % 3 === 0) b.r(x - hw, yy - r * 2.4 + k, hw + 1, 1, '#f4f8fb'); }
      } else blob(b, x, yy - r * 0.7, r, r * 0.85, tp, { wob: 0.15, ph: i });
    }
  }
  if (o.feat) for (const f of o.feat) {
    const x = Math.floor(R() * W);
    const spr = featSpr(f, o.featCol || '#6a3a4a');
    let y = H;
    for (let i = 0; i < spr.w; i++) y = Math.min(y, top[(x + i) % W]);
    blit(b, spr, x, y - spr.h + 4, { haze: o.dark, amt: o.featHaze || 0.35 });
  }
}

function bTreeRow(b, o, R) {
  const W = b.w;
  const H = b.h;
  const gh = o.gh || 8;
  const prof = periodic(W, R, [[6, 1.5], [17, 0.8]]);
  const G = fades(o.ground, o.dark || shd(o.ground, -0.4));
  for (let x = 0; x < W; x++) {
    const t = Math.round(H - gh + prof[x]);
    for (let y = t; y < H; y++) b.p(x, y, y === t ? shd(o.ground, 0.18) : G[Math.min(2, ((y - t) / 3) | 0)]);
  }
  if (o.extra) o.extra(b, R, H - gh);
  const rows = o.rows || [[o.gap || 40, o.hmin, o.hmax, o.amt + 0.18], [o.gap || 40, o.hmin, o.hmax, o.amt]];
  rows.forEach(([gap, hmin, hmax, amt], ri) => {
    if (ri === 1 && o.houses) {
      let hx0 = R() * 40;
      while (hx0 < W) {
        const spr = backHouseSpr(o.houses[0], o.houses[1], (R() * 5) | 0);
        blit(b, spr, hx0, H - gh + 3 - spr.h, { haze: o.haze, amt: amt + 0.06, flip: R() < 0.5 });
        hx0 += spr.w + 30 + R() * 60;
      }
    }
    let x = R() * gap;
    while (x < W) {
      const kind = o.kinds[(R() * o.kinds.length) | 0];
      const h = Math.round(hmin + R() * (hmax - hmin));
      const spr = sprTree(kind, h, (R() * 4) | 0, { leaf: o.leaf, snow: o.snow, bark: o.bark, noOutline: o.noOutline, eyes: o.eyes });
      blit(b, spr, x - spr.w / 2, H - gh + 3 - spr.h, { haze: o.haze, amt, flip: R() < 0.5 });
      x += gap * (0.6 + R() * 0.8);
    }
  });
}

function bMesa(b, o, R) {
  const W = b.w;
  const H = b.h;
  const top = new Float32Array(W).fill(H);
  const mesas = [];
  for (let i = 0; i < (o.n || 5); i++) mesas.push({ x: ((i + R() * 0.6) * W) / (o.n || 5), hw: 20 + R() * 45, h: o.hmin + R() * (o.hmax - o.hmin) });
  const jag = periodic(W, R, [[31, 1], [71, 0.6]]);
  for (let x = 0; x < W; x++) {
    for (const m of mesas) {
      const dx = Math.abs(wrapd(x - m.x, W));
      let h = dx < m.hw ? m.h : m.h - (dx - m.hw) * 2.6;
      if (dx > m.hw + 6) h = Math.min(h, m.h * 0.35 - (dx - m.hw - 6) * 0.45);
      top[x] = Math.min(top[x], H - 1 - Math.max(4, h + jag[x]));
    }
  }
  const L = fades(o.lit, o.base);
  const D = fades(o.shd, o.base);
  const St = fades(o.band, o.base);
  for (let x = 0; x < W; x++) {
    let m0 = mesas[0];
    let bd = 1e9;
    for (const m of mesas) { const d = Math.abs(wrapd(x - m.x, W)); if (d < bd) { bd = d; m0 = m; } }
    const dx = wrapd(x - m0.x, W);
    for (let y = Math.max(0, Math.ceil(top[x])); y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.5);
      const lit = dx < -m0.hw * 0.55 + Math.sin(y * 0.5) * 2 || (y - top[x] < 2);
      let c = lit ? L[fi] : D[fi];
      if ((y + Math.round(jag[x] * 0.5)) % 9 < 2) c = lit ? St[fi] : mix(St[fi], D[fi], 0.5);
      if (y === Math.ceil(top[x])) c = o.rim;
      b.p(x, y, c);
    }
  }
}

function bDunes(b, o, R) {
  const W = b.w;
  const H = b.h;
  const ph = [R() * TAU, R() * TAU, R() * TAU];
  const hf = (x) => o.base + o.amp * (1 - Math.pow(Math.abs(Math.sin((x / W) * Math.PI * 3 + ph[0])), 0.7)) + o.amp * 0.5 * (1 - Math.abs(Math.sin((x / W) * Math.PI * 7 + ph[1]))) + Math.sin((x / W) * TAU * 2 + ph[2]) * 4;
  const L = fades(o.lit, o.base2 || o.shd);
  const D = fades(o.shd, o.base2 || o.shd);
  for (let x = 0; x < W; x++) {
    const h = hf(x);
    const lit = hf(x + 1) > h;
    const ty = Math.round(H - 1 - h);
    for (let y = Math.max(0, ty); y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.55);
      let c = lit ? L[fi] : D[fi];
      if (lit && (y - ty) % 5 === 2 && ((x >> 2) & 1)) c = mix(L[fi], o.rim, 0.4);
      if (y === ty) c = o.rim;
      b.p(x, y, c);
    }
  }
  if (o.cacti) for (let i = 0; i < o.cacti; i++) {
    const x = R() * W;
    const spr = sprTree('cactus', 12 + ((R() * 10) | 0), i % 3);
    blit(b, spr, x, H - 1 - hf(x) - spr.h + 4, { haze: o.base2 || o.shd, amt: o.amt || 0.4 });
  }
}

function bKarst(b, o, R) {
  const W = b.w;
  const H = b.h;
  const tw = [];
  for (let i = 0; i < (o.n || 9); i++) tw.push({ x: R() * W, w: 16 + R() * 22, h: o.hmin + R() * (o.hmax - o.hmin), k: R() * 9, lg: 8 + ((R() * 6) | 0) });
  tw.sort((a, b2) => a.h - b2.h);
  const top = new Float32Array(W).fill(H - 1 - (o.floor || 6));
  const own = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) {
    tw.forEach((t, k) => {
      const f = Math.abs(wrapd(x - t.x, W)) / t.w;
      if (f >= 1) return;
      const h = t.h * Math.pow(1 - Math.pow(f, 1.6), 0.55) + Math.sin(x * 0.9 + t.k) * 1.2 + Math.sin(x * 0.31 + t.k) * 2;
      const y = H - 1 - h;
      if (y < top[x]) { top[x] = y; own[x] = k; }
    });
  }
  const L = fades(o.lit, o.base);
  const M = fades(mix(o.lit, o.shd, 0.5), o.base);
  const D = fades(o.shd, o.base);
  const V = fades(o.tree, o.base);
  for (let x = 0; x < W; x++) {
    const t = own[x] >= 0 ? tw[own[x]] : null;
    const dx = t ? wrapd(x - t.x, W) : 0;
    const ty = Math.max(0, Math.ceil(top[x]));
    for (let y = ty; y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.75);
      const u = t ? dx / t.w : 0;
      let c = !t ? M[fi] : u < -0.4 + Math.sin(y * 0.3 + t.k) * 0.1 ? L[fi] : u < 0.3 + Math.sin(y * 0.21 + x) * 0.06 ? M[fi] : D[fi];
      // gờ đá ngang + bụi cây bám vách
      if (t && (y - ty) > 3 && (y + Math.round(t.k)) % t.lg === 0) c = D[fi];
      if (t && (y - ty) > 3 && (y + Math.round(t.k)) % t.lg === t.lg - 1 && Math.sin(x * 0.5 + y) > -0.2) c = V[fi];
      if (y === ty || y === ty + 1) c = V[Math.min(2, fi)];
      b.p(x, y, c);
    }
  }
  // cây thông nhỏ trên đỉnh
  for (const t of tw) for (let i = 0; i < 4; i++) {
    const x = t.x + (i - 1.5) * t.w * 0.28;
    const y = top[Math.floor(((x % W) + W) % W)];
    const h = 3 + R() * 5;
    for (let k = 0; k < h; k++) { const hw = Math.round((k / h) * h * 0.4); b.r(x - hw, y - h + k + 1, hw * 2 + 1, 1, o.tree); }
  }
}

function bCave(b, o, R) {
  const W = b.w;
  const H = b.h;
  const pal = o.pal; // [lit, mid, dark, base]
  // cột đá nối trần - đất
  for (let i = 0; i < (o.cols || 5); i++) {
    const cx = R() * W;
    const cw = 8 + R() * 16;
    const ph = R() * TAU;
    for (let y = 0; y < H; y++) {
      const f = y / H;
      const w = cw * (0.55 + 0.45 * Math.abs(Math.cos(f * Math.PI))) + Math.sin(y * 0.15 + ph) * 2;
      for (let x = Math.floor(cx - w); x <= cx + w; x++) {
        const u = (x - (cx - w)) / (2 * w);
        const fi = fadeIdx(x, y, H, H * 0.25);
        let c = u < 0.22 ? pal[0] : u < 0.7 ? pal[1] : pal[2];
        if (fi === 2) c = mix(c, pal[3], 0.5);
        if ((y + Math.round(u * 7)) % 13 === 0 && u > 0.2) c = pal[2];
        b.p(x, y, c);
      }
    }
  }
  // măng đá dưới, nhũ đá trên
  for (let i = 0; i < (o.spikes || 26); i++) {
    const x = R() * W;
    const w = 4 + R() * 10;
    const h = o.minS + R() * (o.maxS - o.minS);
    const up = i % 2 === 0;
    const y0 = up ? H : 0;
    const dir = up ? -1 : 1;
    for (let k = 0; k < h; k++) {
      const hw = w * (1 - k / h);
      for (let xx = Math.floor(x - hw); xx <= x + hw; xx++) {
        const u = (xx - (x - hw)) / (2 * hw + 0.01);
        b.p(xx, y0 + dir * (k + 1), u < 0.3 ? pal[0] : u < 0.72 ? pal[1] : pal[2]);
      }
    }
  }
  // tinh thể / dòng dung nham trong vách
  if (o.crystal) for (let i = 0; i < 10; i++) {
    const spr = sprCrystal(8 + ((R() * 8) | 0), o.crystal, i % 4);
    const cx = R() * W;
    const cy = H - spr.h - R() * 8;
    halo(b, cx + spr.w / 2, cy + spr.h * 0.6, 18, o.crystal, 0.35);
    blit(b, spr, cx, cy, { haze: pal[3], amt: o.camt || 0.25 });
  }
  if (o.lavafall) for (let i = 0; i < 3; i++) {
    const x = R() * W;
    const y0 = 10 + R() * 30;
    for (let y = y0; y < H; y++) {
      const w = 3 + Math.sin(y * 0.2) * 0.8 + (y - y0) * 0.02;
      for (let xx = -w; xx <= w; xx++) b.p(x + xx, y, Math.abs(xx) < w * 0.35 ? '#ffe08a' : Math.abs(xx) < w * 0.7 ? '#ff9a3c' : '#d8461e');
    }
    for (let k = 0; k < 10; k++) blob(b, x + (R() - 0.5) * 20, H - 2, 4 + R() * 4, 2.5, ['#ffe08a', '#ff9a3c', '#d8461e', '#8a2412'], { cut: H });
  }
}

function bRuins(b, o, R) {
  const W = b.w;
  const H = b.h;
  const S = o.col;
  const rim = o.rim;
  for (let i = 0; i < (o.n || 6); i++) {
    const x = Math.floor(R() * W);
    const w = 10 + Math.floor(R() * 18);
    const h = o.hmin + Math.floor(R() * (o.hmax - o.hmin));
    b.r(x, H - h, w, h, S);
    b.r(x, H - h, 1, h, rim);
    // răng cưa / đỉnh gãy
    for (let k = 0; k < w; k += 4) b.r(x + k, H - h - 3, 2, 3, S);
    if (R() < 0.5) b.poly([[x - 2, H - h], [x + w / 2, H - h - 14 - R() * 10], [x + w + 2, H - h]], S);
    for (let k = 0; k < h / 14; k++) { b.r(x + w / 2 - 1, H - h + 8 + k * 14, 2, 4, o.win); }
    // sừng quỷ
    if (o.horns && R() < 0.5) { b.line(x, H - h, x - 5, H - h - 12, S, 2); b.line(x + w, H - h, x + w + 5, H - h - 12, S, 2); }
  }
  // cổng vòm lớn
  if (o.gate) {
    const gx = Math.floor(R() * W);
    const gw = 70;
    const gh = o.hmax + 10;
    b.r(gx, H - gh, 16, gh, S); b.r(gx + gw - 16, H - gh, 16, gh, S); b.r(gx - 6, H - gh - 10, gw + 12, 14, S);
    b.r(gx, H - gh, 1, gh, rim); b.r(gx - 6, H - gh - 10, gw + 12, 1, rim);
    b.line(gx - 6, H - gh - 10, gx - 16, H - gh - 30, S, 3); b.line(gx + gw + 6, H - gh - 10, gx + gw + 16, H - gh - 30, S, 3);
    b.ell(gx + gw / 2, H - gh + 2, 8, 6, S); b.p(gx + gw / 2 - 3, H - gh + 1, o.win); b.p(gx + gw / 2 + 3, H - gh + 1, o.win);
    for (let y = H - gh + 14; y < H; y++) for (let xx = gx + 16; xx < gx + gw - 16; xx++) b.a(xx, y, '#ff5a2a', 0.18 + 0.25 * ((y - (H - gh)) / gh));
  }
}

function bStands(b, o, R) {
  const W = b.w;
  const H = b.h;
  const st = ['#e8d2a8', '#cdb084', '#a88a62', '#7a6448'];
  const crowd = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#ffffff', '#3949ab'];
  const skin = ['#f2c6a0', '#e0a878', '#c88a5a'];
  b.r(0, 8, W, H - 8, st[2]);
  // mái che, cột cờ
  for (let x = 0; x < W; x += 64) {
    b.r(x + 2, 0, 2, 12, '#5d4037');
    const c = crowd[(x / 64) % 4 | 0];
    b.poly([[x + 4, 1], [x + 14, 3], [x + 4, 6]], c);
  }
  b.r(0, 8, W, 3, st[0]); b.r(0, 11, W, 1, st[3]);
  // các tầng ghế + khán giả
  for (let tier = 0; tier < 4; tier++) {
    const y = 13 + tier * 9;
    b.r(0, y + 6, W, 2, st[1]); b.r(0, y + 8, W, 1, st[3]);
    for (let x = 1; x < W; x += 3) {
      if (R() < 0.12) continue;
      const bob = R() < 0.3 ? -1 : 0;
      b.p(x, y + 2 + bob, skin[(R() * 3) | 0]);
      b.r(x, y + 3 + bob, 2, 3 - bob, crowd[(R() * crowd.length) | 0]);
    }
  }
  // tường vòm
  const wy = 13 + 4 * 9;
  b.r(0, wy, W, H - wy, st[1]);
  b.r(0, wy, W, 2, st[0]);
  for (let x = 6; x < W; x += 22) {
    b.r(x, wy + 6, 12, H - wy - 6, st[3]);
    b.ell(x + 6, wy + 6, 6, 4, st[3]);
    b.r(x + 1, wy + 7, 2, H - wy - 7, '#5a4632');
    b.r(x - 4, wy + 2, 2, H - wy, st[0]);
    // băng rôn
    if ((x / 22) % 3 < 1) { b.r(x + 2, wy + 3, 8, 12, crowd[((x / 22) | 0) % 3]); b.r(x + 4, wy + 6, 4, 4, '#ffd54f'); }
  }
}

function bCeiling(b, o, R) {
  const W = b.w;
  const H = b.h;
  const pal = o.pal;
  const band = periodic(W, R, [[5, 3], [13, 2], [29, 1]]);
  for (let x = 0; x < W; x++) {
    const bh = Math.round(12 + band[x]);
    for (let y = 0; y < bh; y++) b.p(x, y, y > bh - 2 ? pal[2] : (x * 7 + y * 3) % 17 === 0 ? pal[0] : pal[1]);
  }
  for (let i = 0; i < (o.n || 40); i++) {
    const x = R() * W;
    const w = 2 + R() * 6;
    const len = 6 + Math.pow(R(), 1.6) * (H - 18);
    const y0 = 10 + band[Math.floor(x) % W];
    for (let k = 0; k < len; k++) {
      const hw = w * Math.pow(1 - k / len, 0.8);
      for (let xx = Math.floor(x - hw); xx <= x + hw; xx++) {
        const u = (xx - (x - hw)) / (2 * hw + 0.01);
        b.p(xx, y0 + k, u < 0.3 ? pal[0] : u < 0.75 ? pal[1] : pal[2]);
      }
    }
    if (o.drip) b.p(x, y0 + len + 1, o.drip);
  }
}

// ---------- Công trình nhỏ trên đồi xa (tháp chùa, lâu đài, nhà)
function featSpr(kind, roof) {
  return cached(`f:${kind}:${roof}`, () => {
    let s;
    const wall = '#efe2c8';
    const wd = '#5a3a2a';
    if (kind === 'pagoda') {
      s = new Buf(26, 44);
      for (let i = 0; i < 4; i++) {
        const y = 40 - i * 9;
        const w = 22 - i * 4;
        s.r(13 - w / 2 + 3, y - 5, w - 6, 5, wall);
        s.r(13 - w / 2 + 3, y - 5, w - 6, 1, wd);
        s.poly([[13 - w / 2 - 1, y - 4], [13 - w / 2 + 3, y - 8], [13 + w / 2 - 3, y - 8], [13 + w / 2 + 1, y - 4]], roof);
        s.r(13 - w / 2 - 1, y - 5, 1, 1, roof); s.r(13 + w / 2, y - 5, 1, 1, roof);
      }
      s.r(12, 2, 2, 8, '#d4a020'); s.p(13, 1, '#ffd54f');
    } else if (kind === 'castle') {
      s = new Buf(40, 40);
      s.poly([[2, 40], [6, 26], [34, 26], [38, 40]], '#8a8478');
      s.r(8, 18, 24, 8, wall); s.poly([[4, 19], [10, 13], [30, 13], [36, 19]], roof);
      s.r(12, 8, 16, 6, wall); s.poly([[9, 9], [14, 4], [26, 4], [31, 9]], roof);
      s.r(19, 1, 2, 3, '#d4a020');
      for (let x = 11; x < 30; x += 5) s.r(x, 21, 2, 2, wd);
    } else if (kind === 'house') {
      s = new Buf(22, 16);
      s.r(3, 8, 16, 8, wall); s.poly([[0, 9], [5, 3], [17, 3], [22, 9]], roof); s.r(9, 11, 4, 5, wd);
    } else if (kind === 'torii') {
      s = new Buf(20, 18);
      s.r(4, 4, 2, 14, '#c62828'); s.r(14, 4, 2, 14, '#c62828'); s.r(1, 2, 18, 2, '#1a1a1a'); s.r(2, 4, 16, 1, '#c62828'); s.r(3, 7, 14, 1, '#c62828');
    } else if (kind === 'windmill') {
      s = new Buf(24, 34);
      s.poly([[8, 34], [10, 12], [14, 12], [16, 34]], wall); s.poly([[8, 13], [12, 8], [16, 13]], roof);
      s.line(12, 12, 2, 2, wd); s.line(12, 12, 22, 22, wd); s.line(12, 12, 22, 2, wd); s.line(12, 12, 2, 22, wd);
    } else s = new Buf(2, 2);
    return s;
  });
}

// ---------- Bầu trời
function buildSky(sc, seed) {
  const W = 256;
  const H = sc.skyH || 300;
  const b = new Buf(W, H);
  const st = sc.sky;
  const n = st.length - 1;
  for (let y = 0; y < H; y++) {
    const f = (y / (H - 1)) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const t = f - i;
    // 4 dải con mỗi đoạn + dither ở ranh giới
    const q = t * 4;
    const qi = Math.floor(q);
    const qt = q - qi;
    for (let x = 0; x < W; x++) {
      const bayer = [[0, 0.5], [0.75, 0.25]][y & 1][x & 1];
      const lvl = Math.min(4, qi + (qt > bayer * 0.9 + 0.05 ? 1 : 0));
      b.d[y * W + x] = u32(mixQ(st[i], st[i + 1], lvl));
    }
  }
  if (sc.stars) {
    const R = rng(seed + 5);
    for (let i = 0; i < sc.stars; i++) {
      const x = (R() * W) | 0;
      const y = (Math.pow(R(), 1.4) * H * 0.7) | 0;
      const big = R() < 0.12;
      b.a(x, y, '#ffffff', 0.4 + R() * 0.6);
      if (big) { b.a(x - 1, y, '#ffffff', 0.35); b.a(x + 1, y, '#ffffff', 0.35); b.a(x, y - 1, '#ffffff', 0.35); b.a(x, y + 1, '#ffffff', 0.35); }
    }
  }
  return b.canvas;
}
const _mq = new Map();
function mixQ(a, b, l) {
  const k = a + b + l;
  let v = _mq.get(k);
  if (!v) { v = mix(a, b, l / 4); _mq.set(k, v); }
  return v;
}

function sunSpr(o) {
  return cached(`sun:${o.k}:${o.r}:${o.col}:${o.glow}`, () => {
    const r = o.r;
    const G = r * 3;
    const s = new Buf(G * 2 + 2, G * 2 + 2);
    const c = G + 1;
    // quầng sáng phân bậc
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const al = d < r * 1.6 ? 0.42 : d < r * 2.3 ? 0.24 : d < G ? 0.1 : 0;
      if (al) s.a(x, y, o.glow, al);
    }
    if (o.k === 'moon' || o.k === 'redmoon') {
      blob(s, c, c, r, r, o.k === 'redmoon' ? ['#ffb08a', '#ff6a3a', '#d8401e', '#a82a14'] : ['#ffffff', '#f4ecd8', '#d8cfb8', '#c0b49a'], { dither: true });
      const cr = o.k === 'redmoon' ? '#b83014' : '#cfc4a8';
      s.ell(c - r * 0.3, c - r * 0.1, r * 0.22, r * 0.2, cr); s.ell(c + r * 0.35, c + r * 0.35, r * 0.15, r * 0.14, cr); s.ell(c + r * 0.1, c - r * 0.5, r * 0.1, r * 0.1, cr);
    } else {
      s.ell(c, c, r, r, o.col);
      s.ell(c - r * 0.2, c - r * 0.2, r * 0.65, r * 0.65, shd(o.col, 0.5));
    }
    return s;
  });
}

function cloudSpr(pal, seed, w) {
  return cached(`cl:${pal.join()}:${seed}:${w}`, () => {
    const R = rng(seed + 31);
    const h = Math.round(w * 0.42);
    const s = new Buf(w + 4, h + 4);
    const base = h + 1;
    const n = 4 + ((w / 14) | 0);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const x = 2 + w * (0.12 + 0.76 * f);
      const r = w * (0.12 + 0.16 * Math.sin(f * Math.PI)) * (0.8 + R() * 0.4);
      blob(s, x, base - r * 0.7, r * 1.15, r, pal, { cut: base, wob: 0.1, ph: R() * 6, dither: false });
    }
    // đáy phẳng sáng/tối
    s.r(4, base, w - 4, 1, pal[2]);
    return s;
  });
}

function auroraCanvas(seed) {
  return cached(`aurora:${seed}`, () => {
    const W = 512;
    const H = 80;
    const b = new Buf(W, H, true);
    const R = rng(seed);
    const p = [R() * TAU, R() * TAU, R() * TAU];
    for (let x = 0; x < W; x++) {
      const inten = (Math.sin((x / W) * TAU * 3 + p[0]) + Math.sin((x / W) * TAU * 7 + p[1]) * 0.6 + 1.6) / 3.2;
      const top = 14 + Math.sin((x / W) * TAU * 2 + p[2]) * 9 + Math.sin((x / W) * TAU * 9) * 3;
      const L = 26 + inten * 26;
      for (let y = Math.floor(top); y < Math.min(H, top + L); y++) {
        const f = (y - top) / L;
        const al = inten * Math.pow(1 - f, 1.4) * 0.55 * ((x % 3 === 0) ? 1.25 : 1);
        b.a(x, y, f < 0.12 ? '#ff9ad8' : f < 0.35 ? '#7affd0' : '#3ad8a0', al);
      }
    }
    return b;
  }).canvas;
}

// quầng sáng vẽ sẵn vào lớp nền
function halo(b, cx, cy, r, col, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1) b.a(x, y, col, Math.round(a * (1 - d) * (1 - d) * 8) / 8);
  }
}

function bProps(b, o, R) {
  const W = b.w;
  const H = b.h;
  const gh = o.gh || 8;
  const prof = periodic(W, R, [[7, 1.5], [19, 0.8]]);
  for (let x = 0; x < W; x++) {
    const t = Math.round(H - gh + prof[x]);
    for (let y = t; y < H; y++) b.p(x, y, y === t ? o.rim : y - t < 3 ? o.ground : shd(o.ground, -0.25));
  }
  let x = R() * 30;
  while (x < W) {
    const spr = o.items[(R() * o.items.length) | 0](R);
    if (spr.glowCol) halo(b, x, H - gh - spr.h * 0.4, 14 + spr.h * 0.6, spr.glowCol, 0.4);
    blit(b, spr, x - spr.w / 2, H - gh + 3 - spr.h, { haze: o.haze, amt: o.amt, flip: R() < 0.5 });
    x += (o.gap || 40) * (0.5 + R());
  }
}

function bWall(b, o, R) {
  const W = b.w;
  const H = b.h;
  const st = ['#e2cfa8', '#c4ab82', '#a08660', '#6e5a40'];
  const wy = H - 26;
  b.r(0, wy, W, 26, st[1]);
  for (let y = wy + 3; y < H; y += 6) for (let x = ((y / 6) & 1) * 8; x < W; x += 16) { b.r(x, y, 15, 5, st[(x + y) % 3 === 0 ? 0 : 1]); b.r(x + 15, y, 1, 5, st[3]); b.r(x, y + 5, 16, 1, st[2]); }
  b.r(0, wy - 3, W, 4, st[0]); b.r(0, wy, W, 1, st[3]);
  const cols = ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a'];
  for (let x = 30; x < W; x += 96) {
    const c = cols[(x / 96) % 4 | 0];
    b.r(x, wy, 14, 20, c); b.r(x, wy, 14, 2, shd(c, 0.3)); b.r(x + 4, wy + 6, 6, 6, '#ffd54f'); b.r(x + 6, wy + 8, 2, 2, c);
    b.poly([[x, wy + 20], [x + 7, wy + 16], [x + 14, wy + 20]], st[1]);
  }
  for (let x = 78; x < W; x += 96) { b.r(x, wy - 12, 3, 12, '#5d4037'); b.r(x - 1, wy - 14, 5, 3, '#4a4a52'); }
}

// Nhà xa phía sau (cho lớp gần ở làng)
function backHouseSpr(roof, wall, seed) {
  return cached(`bh:${roof}:${seed}`, () => {
    const R = rng(seed);
    const w = 40 + ((R() * 24) | 0);
    const wh = 16 + ((R() * 6) | 0);
    const rh = 10 + ((R() * 4) | 0);
    const tall = R() < 0.35;
    const s = new Buf(w + 12, wh + rh + (tall ? 16 : 0) + 6);
    const by = s.h - 1;
    const x0 = 6;
    s.r(x0, by - wh, w, wh, wall);
    for (let x = x0; x < x0 + w; x += 10) s.r(x, by - wh, 1, wh, '#6a4a3a');
    for (let x = x0 + 4; x < x0 + w - 6; x += 10) { s.r(x, by - wh + 4, 5, 6, '#ffd890'); s.r(x + 2, by - wh + 4, 1, 6, '#c8a070'); }
    roofDraw(s, x0 + w / 2, by - wh, w / 2 + 6, rh, roof, w / 2 - 6);
    if (tall) {
      const tw = w * 0.5;
      s.r(x0 + w / 2 - tw / 2, by - wh - rh - 8, tw, 9, wall);
      roofDraw(s, x0 + w / 2, by - wh - rh - 7, tw / 2 + 5, 8, roof, tw / 2 - 5);
    }
    return s;
  });
}

// Mái ngói cong kiểu Nhật: (cx, chân mái y, nửa rộng mép mái, cao, màu, nửa rộng nóc)
function roofDraw(s, cx, eaveY, hwE, rh, col, hwT) {
  const C = ramp(col);
  const top = eaveY - rh;
  for (let i = 0; i <= rh; i++) {
    const f = i / rh;
    const hw = hwT + (hwE - hwT) * Math.pow(f, 1.9);
    const y = top + i;
    const x0 = Math.round(cx - hw);
    const x1 = Math.round(cx + hw);
    // hàng ngói: cứ 3 dòng một gờ
    const course = i % 3;
    s.r(x0, y, x1 - x0, 1, course === 0 ? C[0] : course === 1 ? C[1] : C[2]);
    if (course !== 0) for (let x = x0 + 1; x < x1; x += 3) s.p(x, y, course === 1 ? C[2] : C[3]);
    s.p(x0, y, C[3]);
    s.p(x1 - 1, y, C[3]);
  }
  // mép mái cong vểnh ở hai đầu + đầu ngói tròn
  const ex0 = Math.round(cx - hwE);
  const ex1 = Math.round(cx + hwE);
  s.r(ex0, eaveY + 1, ex1 - ex0, 2, C[3]);
  for (let x = ex0 + 2; x < ex1 - 2; x += 3) s.p(x, eaveY + 1, C[0]);
  s.r(ex0 - 2, eaveY - 1, 3, 2, C[3]); s.p(ex0 - 3, eaveY - 2, C[3]); s.p(ex0 - 3, eaveY - 3, C[1]);
  s.r(ex1 - 1, eaveY - 1, 3, 2, C[3]); s.p(ex1 + 2, eaveY - 2, C[3]); s.p(ex1 + 2, eaveY - 3, C[1]);
  // nóc mái + trang trí hai đầu
  const tx0 = Math.round(cx - hwT - 2);
  const tx1 = Math.round(cx + hwT + 2);
  s.r(tx0, top - 2, tx1 - tx0, 3, C[3]);
  s.r(tx0, top - 2, tx1 - tx0, 1, shd(C[3], 0.25));
  s.r(tx0 - 1, top - 4, 2, 4, C[3]); s.p(tx0 - 2, top - 5, C[3]);
  s.r(tx1 - 1, top - 4, 2, 4, C[3]); s.p(tx1 + 1, top - 5, C[3]);
}

// ======================= Cấu hình cảnh cho từng chủ đề =======================
const SCENES = {
  village_fire: {
    sky: ['#3a2c66', '#6e3a78', '#b8507a', '#e8745e', '#f8a466', '#ffd79e'], stars: 30, skyH: 200,
    sun: { k: 'sun', x: 0.66, y: 112, r: 12, col: '#fff2cc', glow: '#ffb070' },
    clouds: { pal: ['#ffd8b4', '#f2a088', '#c26c86', '#8a4a78'], n: 7, y: [14, 92] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 26, n: 6, hmin: 55, hmax: 116, lit: '#c47888', shd: '#8e567c', rim: '#f6b4a0', base: '#e8907c', snow: '#ffe2d2', snowS: '#d8a6bc', snowLine: 84, volcano: true },
      { t: 'hills', h: 120, fx: 0.2, fy: 0.25, off: 10, base: 54, amp: 14, col: '#9a4e6a', lit: '#b8687a', dark: '#d88a84', trees: ['#e09ab0', '#b86a8c', '#8e4a72', '#6e3a60'], treeN: 70, feat: ['pagoda', 'castle', 'house', 'house', 'torii'], featCol: '#8e2a28' },
      { t: 'trees', h: 120, fx: 0.42, fy: 0.5, off: 20, gh: 14, ground: '#7a4a58', dark: '#5a3448', kinds: ['sakura', 'sakura', 'maple'], hmin: 54, hmax: 84, haze: '#d88a8a', amt: 0.5, gap: 58, houses: ['#b8402e', '#efdcc0'] },
    ],
    ground: 'cobble', light: { top: ['#ff8040', 0.13], bot: ['#4a1e4a', 0.1], vig: 0.28 }, portal: '#ffb060',
  },
  village_water: {
    sky: ['#2c6cc0', '#4a8ed8', '#82bcee', '#c2e2fa', '#ecf8ff'],
    sun: { k: 'sun', x: 0.22, y: 34, r: 9, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.12, off: 46, n: 6, hmin: 50, hmax: 108, lit: '#94b4de', shd: '#6a8cc4', rim: '#e0ecff', base: '#b6d0ea', snow: '#f6faff', snowS: '#c6d6f0', snowLine: 66 },
      { t: 'hills', h: 70, fx: 0.18, fy: 0.12, off: 46, base: 12, amp: 9, col: '#4e8a6a', lit: '#6ca87a', dark: '#90bcb4', trees: ['#6aaa72', '#4a8a5a', '#346a48', '#26503a'], treeN: 110, feat: ['pagoda', 'house', 'house', 'castle', 'house'], featCol: '#2e5a9a' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 9, ground: '#4e8a4e', dark: '#3a6a3e', kinds: ['willow', 'round', 'pine'], hmin: 44, hmax: 70, haze: '#a0c8d8', amt: 0.42, gap: 110, rows: [[110, 44, 70, 0.42]] },
    ],
    water: { hz: 46, top: '#9ad0f4', col: '#4a9ad8', deep: '#2e6eb0', refl: [0, 1], fy: 0.12 },
    ground: 'cobble', light: { top: ['#ffffff', 0.05], rays: 0.05, vig: 0.2 }, portal: '#7ad8ff',
  },
  village_wind: {
    sky: ['#3a9ec8', '#62bcd6', '#9ed8d4', '#d4f0dc', '#f4fbe4'],
    sun: { k: 'sun', x: 0.8, y: 40, r: 9, col: '#fffcea', glow: '#fff6c8' },
    clouds: { pal: ['#ffffff', '#f0faf4', '#c8e4dc', '#9ac4c0'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 24, n: 6, hmin: 50, hmax: 104, lit: '#82bca0', shd: '#5a947e', rim: '#d8f6e2', base: '#acdac4' },
      { t: 'hills', h: 120, fx: 0.2, fy: 0.25, off: 8, base: 50, amp: 15, col: '#6aa858', lit: '#8cc66c', dark: '#b0dcb4', terrace: true, trees: ['#8cc86a', '#5e9e4a', '#447a3c', '#2e5a30'], treeN: 50, feat: ['windmill', 'house', 'pagoda', 'house', 'windmill'], featCol: '#3a7a3a' },
      { t: 'trees', h: 140, fx: 0.42, fy: 0.5, off: 18, gh: 14, ground: '#5a9a4a', dark: '#3e7838', kinds: ['bamboo', 'bamboo', 'round'], hmin: 66, hmax: 116, haze: '#bce2c4', amt: 0.45, gap: 34, houses: ['#3f8a4a', '#f0ead0'] },
    ],
    ground: 'cobble', light: { top: ['#fff8c0', 0.05], rays: 0.05, vig: 0.2 }, portal: '#8aff9a',
  },
  grass_fire: {
    sky: ['#4a7ed4', '#7aa6dc', '#d6c6aa', '#ffd494', '#fff0cc'],
    sun: { k: 'sun', x: 0.76, y: 64, r: 11, col: '#fff6d8', glow: '#ffd890' },
    clouds: { pal: ['#fff6e8', '#ffe0c0', '#e8b498', '#b88a80'], n: 6, y: [12, 80] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 22, n: 6, hmin: 50, hmax: 112, lit: '#c8907a', shd: '#9c6870', rim: '#ffd4b4', base: '#e8b89c', volcano: true },
      { t: 'hills', h: 90, fx: 0.2, fy: 0.25, off: 8, base: 26, amp: 13, col: '#a4a858', lit: '#c6c472', dark: '#e8d6a2', trees: ['#ffb050', '#e07a34', '#b85428', '#8a3a20'], treeN: 70, feat: ['torii', 'house', 'house'], featCol: '#9a3a2a' },
      { t: 'trees', h: 104, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#8aa048', dark: '#6a7e3a', kinds: ['maple', 'maple', 'round'], hmin: 44, hmax: 72, haze: '#f0d4a4', amt: 0.42, gap: 52 },
    ],
    ground: 'grass', light: { top: ['#ffb060', 0.08], vig: 0.2 }, portal: '#ffcf6a',
  },
  lake: {
    sky: ['#3e88dc', '#72aeec', '#b0d8f6', '#e6f6ff'],
    sun: { k: 'sun', x: 0.28, y: 32, r: 9, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [10, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.12, off: 42, n: 6, hmin: 52, hmax: 116, lit: '#8aa8d8', shd: '#6a84bc', rim: '#e0ecff', base: '#b4cce8', snow: '#f6faff', snowS: '#c8d6ee', snowLine: 74 },
      { t: 'hills', h: 60, fx: 0.18, fy: 0.12, off: 42, base: 10, amp: 8, col: '#4a8a5a', lit: '#6aaa6a', dark: '#8cbcaa', trees: ['#6ab46a', '#4a9058', '#346e48', '#26523a'], treeN: 150, treeR: 5 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#5aa04a', dark: '#3e7a3a', kinds: ['round', 'willow'], hmin: 44, hmax: 70, haze: '#a8d0e0', amt: 0.4, gap: 150, rows: [[150, 44, 70, 0.4]] },
    ],
    water: { hz: 42, top: '#a4d6f6', col: '#58a8e0', deep: '#3a86c8', refl: [0, 1], fy: 0.12 },
    ground: 'grass', light: { vig: 0.18 }, portal: '#7ad8ff',
  },
  grass_wind: {
    sky: ['#46aae0', '#78c6e6', '#b8e6e0', '#eefaea'],
    sun: { k: 'sun', x: 0.7, y: 36, r: 9, col: '#fffcea', glow: '#fff6c8' },
    clouds: { pal: ['#ffffff', '#f0faf4', '#c8e4dc', '#9ac4c0'], n: 8, y: [8, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 22, n: 7, hmin: 46, hmax: 100, lit: '#8cc4b2', shd: '#64a092', rim: '#e0fff0', base: '#b4decf' },
      { t: 'hills', h: 92, fx: 0.2, fy: 0.25, off: 8, base: 24, amp: 16, col: '#76b656', lit: '#98d070', dark: '#c0e6b8', trees: ['#8cc86a', '#5e9e4a', '#447a3c', '#2e5a30'], treeN: 60, feat: ['windmill', 'windmill', 'house'], featCol: '#3a7a3a' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#6aaa4a', dark: '#4a8a3a', kinds: ['round', 'round', 'pine'], hmin: 40, hmax: 70, haze: '#c8ecc8', amt: 0.42, gap: 60 },
    ],
    ground: 'grass', light: { vig: 0.16 }, portal: '#8aff9a',
  },
  bamboo: {
    sky: ['#86c69e', '#acdab0', '#d6eec6', '#f0fae0'],
    clouds: { pal: ['#ffffff', '#f0faf0', '#d0e8d0', '#b0d0b0'], n: 4, y: [10, 50] },
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 14, n: 7, hmin: 50, hmax: 104, lit: '#b2d2b0', shd: '#98bc9e', rim: '#e8f8e0', base: '#d0e8c8' },
      { t: 'trees', h: 140, fx: 0.22, fy: 0.28, off: 6, gh: 8, ground: '#8ab070', dark: '#7aa064', kinds: ['bamboo'], hmin: 80, hmax: 125, haze: '#d4ecca', amt: 0.72, gap: 18, noOutline: true, rows: [[18, 80, 125, 0.72]] },
      { t: 'trees', h: 160, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#5e8a46', dark: '#46703a', kinds: ['bamboo'], hmin: 100, hmax: 150, haze: '#b4d8aa', amt: 0.42, gap: 40, rows: [[40, 100, 150, 0.42]] },
    ],
    ground: 'grass', light: { top: ['#f0ffc0', 0.06], rays: 0.07, vig: 0.24 }, portal: '#c8ff8a',
  },
  beach: {
    sky: ['#2286de', '#4aa8ec', '#88ccf6', '#c8ecff', '#eef9ff'],
    sun: { k: 'sun', x: 0.6, y: 30, r: 10, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 7, y: [8, 70] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 90, fx: 0.05, fy: 0.1, off: 52, n: 5, hmin: 12, hmax: 46, steep: 1.3, lit: '#7ab88a', shd: '#5a9a7a', rim: '#d0f0d8', base: '#a8d0d8', fade: 20 },
      { t: 'mount', h: 60, fx: 0.12, fy: 0.1, off: 52, n: 3, hmin: 6, hmax: 26, steep: 2.2, lit: '#8a9a8a', shd: '#6a7a72', rim: '#c8d8d0', base: '#88b8c8', fade: 12, minH: -10 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 14, ground: '#f0d898', dark: '#e0c080', kinds: ['palm'], hmin: 44, hmax: 66, haze: '#c8e8f0', amt: 0.3, gap: 130, rows: [[130, 44, 66, 0.3]] },
    ],
    water: { hz: 52, top: '#8ad8f4', col: '#2a98d8', deep: '#1a78c0', refl: [0, 1], fy: 0.1, foam: true },
    ground: 'sand', light: { top: ['#ffffff', 0.04], vig: 0.16 }, portal: '#7ae8ff',
  },
  cave: {
    sky: ['#100c1c', '#1a1530', '#262042', '#362c56'], birds: 'bat',
    layers: [
      { t: 'cave', h: 250, fx: 0.15, fy: 0.2, off: 0, pal: ['#4e4470', '#3c345a', '#2e2848', '#241e3a'], cols: 6, spikes: 22, minS: 20, maxS: 70, crystal: '#9a7aff', camt: 0.35 },
      { t: 'cave', h: 210, fx: 0.32, fy: 0.4, off: 0, pal: ['#62568a', '#4a4270', '#383256', '#2a2442'], cols: 4, spikes: 30, minS: 15, maxS: 60, crystal: '#b388ff', camt: 0.15 },
      { t: 'props', h: 60, fx: 0.55, fy: 0.62, off: 0, gh: 8, ground: '#2e2840', rim: '#4a4064', haze: '#241e34', amt: 0.35, gap: 50, items: [(R) => sprCrystal(14 + ((R() * 12) | 0), R() < 0.5 ? '#b388ff' : '#4fc3f7', (R() * 4) | 0), (R) => sprProp('stalag', (R() * 3) | 0, 'cave'), (R) => sprRock(20, 10, (R() * 3) | 0, ['#6a6082', '#4c4466', '#3a3450', '#2a2440'])] },
    ],
    ceil: { h: 80, fx: 0.6, fy: 0.7, pal: ['#4c4266', '#342c48', '#221c30'], drip: '#8ab0ff', n: 46 },
    ground: 'rock', gpal: ['#6a6082', '#4e4666', '#3a3450', '#2a2440', '#1e1a2e'],
    light: { dark: 0.36, darkCol: '#08040e', top: ['#5a3a9a', 0.1], vig: 0.32 }, portal: '#b388ff',
  },
  desert: {
    sky: ['#3488d6', '#6eaee0', '#c4d6c0', '#f6d89c', '#fcecc8'],
    sun: { k: 'sun', x: 0.5, y: 26, r: 13, col: '#ffffff', glow: '#fff0a0' },
    clouds: { pal: ['#ffffff', '#fff6e0', '#f0d8b0', '#d0b088'], n: 3, y: [10, 50] }, birds: 'bird',
    layers: [
      { t: 'mesa', h: 120, fx: 0.06, fy: 0.1, off: 16, n: 5, hmin: 40, hmax: 82, lit: '#e09460', shd: '#b86c4c', band: '#c87a50', base: '#f0c898', rim: '#ffd8a8' },
      { t: 'dunes', h: 70, fx: 0.2, fy: 0.25, off: 8, base: 14, amp: 18, lit: '#f2c474', shd: '#d29a5a', rim: '#ffe4a8', base2: '#f8dcaa', cacti: 6, amt: 0.4 },
      { t: 'dunes', h: 62, fx: 0.42, fy: 0.5, off: 0, base: 10, amp: 14, lit: '#eab264', shd: '#c2824a', rim: '#f8d292', base2: '#e0b070', cacti: 5, amt: 0.2 },
    ],
    ground: 'sand', light: { top: ['#ffb050', 0.08], vig: 0.2 }, portal: '#ffd86a',
  },
  mist: {
    sky: ['#64788e', '#8698ae', '#acbac9', '#d0dae3'],
    sun: { k: 'sun', x: 0.3, y: 46, r: 9, col: '#f4f4ee', glow: '#dde4ea' },
    clouds: { pal: ['#e8eef2', '#d0dae2', '#b4c2ce', '#9aaabb'], n: 5, y: [10, 70] },
    layers: [
      { t: 'karst', h: 170, fx: 0.06, fy: 0.1, off: 18, n: 12, hmin: 60, hmax: 140, lit: '#a4b2c2', shd: '#8496aa', base: '#c4ced8', rim: '#aebccc', tree: '#7e9294' },
      { t: 'karst', h: 140, fx: 0.2, fy: 0.25, off: 6, n: 9, hmin: 40, hmax: 110, lit: '#8a9a94', shd: '#5e706c', base: '#a6b6bc', rim: '#8ea49a', tree: '#4e6e56' },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 8, ground: '#4a6450', dark: '#3a5040', kinds: ['pine', 'dead'], leaf: 'mist', bark: 'grey', hmin: 44, hmax: 76, haze: '#a8b8c0', amt: 0.5, gap: 56 },
    ],
    fog: true, ground: 'grass', light: { top: ['#d8e0e8', 0.08], vig: 0.26 }, portal: '#cfe8ff',
  },
  snow: {
    sky: ['#7aa4d4', '#9cbce0', '#c4d8ee', '#e8f0f8'],
    sun: { k: 'sun', x: 0.7, y: 40, r: 9, col: '#ffffff', glow: '#f0f6ff' },
    clouds: { pal: ['#ffffff', '#eef2f8', '#cfd8e6', '#aab8cc'], n: 6, y: [8, 70] },
    layers: [
      { t: 'mount', h: 150, fx: 0.06, fy: 0.1, off: 20, n: 6, hmin: 56, hmax: 120, lit: '#eef4fa', shd: '#a8bcd8', rim: '#ffffff', base: '#d0dcec', snow: '#ffffff', snowS: '#c4d4ea', snowLine: 30 },
      { t: 'hills', h: 92, fx: 0.2, fy: 0.25, off: 8, base: 24, amp: 14, col: '#d0deec', lit: '#f2f6fb', dark: '#dce6f2', trees: ['#6a9a8e', '#4a7a70', '#33605a', '#24484a'], treeKind: 'pine', snowy: true, treeN: 110, treeR: 4 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#eef4fa', dark: '#c8d8ea', kinds: ['pine'], snow: true, hmin: 46, hmax: 80, haze: '#d6e2ee', amt: 0.45, gap: 40 },
    ],
    ground: 'snow', light: { top: ['#e8f4ff', 0.06], vig: 0.2 }, portal: '#9ae4ff',
  },
  ice: {
    sky: ['#0c2e52', '#1a5a86', '#3e96bc', '#8cd2e8', '#d4f4fc'], stars: 50, aurora: true,
    sun: { k: 'moon', x: 0.2, y: 30, r: 8, glow: '#c8f0ff' },
    clouds: { pal: ['#e8f8ff', '#c8e8f6', '#9ccce6', '#78aed0'], n: 4, y: [30, 80] },
    layers: [
      { t: 'mount', h: 160, fx: 0.06, fy: 0.1, off: 20, n: 9, hmin: 50, hmax: 130, steep: 1.8, lit: '#c8ecf8', shd: '#7ab8dc', rim: '#ffffff', base: '#a8dcf0', snow: '#ffffff', snowS: '#b4dcf0', snowLine: 46 },
      { t: 'mount', h: 90, fx: 0.2, fy: 0.25, off: 6, n: 14, hmin: 20, hmax: 70, steep: 3.2, lit: '#9adcf4', shd: '#58a2cc', rim: '#eafcff', base: '#8ad0ea', snow: '#f4fcff', snowS: '#c4e6f6', snowLine: 50 },
      { t: 'trees', h: 100, fx: 0.42, fy: 0.5, off: 0, gh: 10, ground: '#d4f3ff', dark: '#a8d8ee', kinds: ['pine'], snow: true, hmin: 40, hmax: 76, haze: '#b8e4f4', amt: 0.42, gap: 56 },
    ],
    ground: 'ice', light: { top: ['#a0f0ff', 0.06], vig: 0.22 }, portal: '#9ae4ff',
  },
  dark_forest: {
    sky: ['#0c0716', '#1c1230', '#36204a', '#5a3060'], stars: 140,
    sun: { k: 'moon', x: 0.72, y: 36, r: 13, glow: '#c8b8ff' },
    clouds: { pal: ['#6a5888', '#4a3c68', '#33284c', '#221a36'], n: 4, y: [20, 80] }, birds: 'bat',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 20, n: 8, hmin: 40, hmax: 104, steep: 1.5, lit: '#4e3866', shd: '#3a2850', rim: '#9a80c0', base: '#4a3058' },
      { t: 'trees', h: 120, fx: 0.22, fy: 0.28, off: 6, gh: 8, ground: '#2e2240', dark: '#2a1e3a', kinds: ['dead'], bark: 'purple', hmin: 54, hmax: 96, haze: '#3a2a52', amt: 0.55, gap: 34, noOutline: true, rows: [[34, 54, 96, 0.55]] },
      { t: 'trees', h: 120, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#221a30', dark: '#1a1424', kinds: ['dead', 'round', 'dead'], leaf: 'dark', bark: 'purple', eyes: true, hmin: 50, hmax: 90, haze: '#2a1e3a', amt: 0.42, gap: 48, rows: [[48, 50, 90, 0.42]] },
    ],
    ground: 'grass', light: { dark: 0.34, darkCol: '#0a0614', top: ['#6a40a0', 0.08], vig: 0.35 }, portal: '#c88aff',
  },
  lava: {
    sky: ['#0c0303', '#1c0606', '#360c08', '#561408'], birds: 'bat',
    layers: [
      { t: 'cave', h: 250, fx: 0.15, fy: 0.2, off: 0, pal: ['#4a1c16', '#3a1410', '#2a0e0c', '#200a08'], cols: 5, spikes: 20, minS: 20, maxS: 70, lavafall: true },
      { t: 'cave', h: 210, fx: 0.32, fy: 0.4, off: 0, pal: ['#62302a', '#4a221c', '#331612', '#24100c'], cols: 3, spikes: 30, minS: 15, maxS: 60 },
      { t: 'props', h: 60, fx: 0.55, fy: 0.62, off: 0, gh: 8, ground: '#2a1410', rim: '#8a3a1a', haze: '#2a0e0c', amt: 0.3, gap: 44, items: [(R) => sprProp('stalag', (R() * 3) | 0, 'lava'), (R) => sprRock(22, 11, (R() * 3) | 0, ['#7a4a40', '#5a3430', '#40241f', '#2a1714'])] },
    ],
    ceil: { h: 80, fx: 0.6, fy: 0.7, pal: ['#5a2a22', '#3e1c18', '#28100e'], drip: '#ff8a3a', n: 40 },
    ground: 'basalt', light: { dark: 0.3, darkCol: '#160404', bot: ['#ff4a10', 0.16], vig: 0.35 }, portal: '#ff9a4a',
  },
  hell: {
    sky: ['#0a0102', '#280507', '#560c0a', '#9a2612', '#de5a26'],
    sun: { k: 'redmoon', x: 0.32, y: 40, r: 16, glow: '#ff4a2a' },
    clouds: { pal: ['#8a3028', '#621c1e', '#441218', '#2c0a10'], n: 6, y: [10, 80] }, birds: 'bat',
    layers: [
      { t: 'mount', h: 160, fx: 0.06, fy: 0.1, off: 16, n: 13, hmin: 40, hmax: 128, steep: 3, lit: '#3e1416', shd: '#2a0a0e', rim: '#ff6a3a', base: '#7a1e14', fade: 50 },
      { t: 'ruins', h: 130, fx: 0.22, fy: 0.28, off: 6, n: 8, hmin: 30, hmax: 90, col: '#1e0808', rim: '#c84a2a', win: '#ff9a3a', gate: true, horns: true },
      { t: 'trees', h: 110, fx: 0.45, fy: 0.55, off: 0, gh: 10, ground: '#1a0808', dark: '#120404', kinds: ['dead'], bark: 'dark', hmin: 50, hmax: 90, haze: '#3a0c0c', amt: 0.35, gap: 70 },
    ],
    ground: 'basalt', light: { top: ['#ff2a10', 0.1], bot: ['#ff5a10', 0.16], dark: 0.18, darkCol: '#1a0202', vig: 0.4 }, portal: '#ff5a3a',
  },
  arena: {
    sky: ['#3a8ae0', '#6aacec', '#a8d0f4', '#e0f0ff'],
    sun: { k: 'sun', x: 0.75, y: 32, r: 10, col: '#fffbe8', glow: '#fff4c0' },
    clouds: { pal: ['#ffffff', '#eef6ff', '#c6daf0', '#98b6d8'], n: 6, y: [8, 60] }, birds: 'bird',
    layers: [
      { t: 'mount', h: 140, fx: 0.06, fy: 0.1, off: 30, n: 6, hmin: 50, hmax: 110, lit: '#9ab0c8', shd: '#7a90b0', rim: '#e0ecff', base: '#c0d4ea', snow: '#ffffff', snowS: '#d0dcee', snowLine: 80 },
      { t: 'stands', h: 92, fx: 0.3, fy: 0.35, off: 4 },
      { t: 'wall', h: 50, fx: 0.55, fy: 0.62, off: 0 },
    ],
    ground: 'tiles', light: { top: ['#fff4d0', 0.05], vig: 0.2 }, portal: '#ffd86a',
  },
};

// ======================= Mặt đất =======================
const VILLAGE = {
  fire: { roof: '#cf4630', wall: '#f3e2c4', wood: '#5e3424', stone: ['#efdcbc', '#d2bc96', '#a8906c', '#7a6650'], tree: 'sakura', glow: '#ffb050' },
  water: { roof: '#3a6fb8', wall: '#eef0ee', wood: '#463634', stone: ['#dfe4ea', '#bcc4cf', '#929cab', '#68717f'], tree: 'willow', glow: '#ffd890' },
  wind: { roof: '#4a9a52', wall: '#f2ead0', wood: '#5a4228', stone: ['#dcdcc0', '#b8bc9c', '#8e9478', '#666c56'], tree: 'bamboo', glow: '#fff0a0' },
};

function speck(T, R, x0, y0, w, h, n, cols) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * w;
    const y = y0 + R() * h;
    T.r(x, y, R() < 0.5 ? 2 : 1, 1, cols[(R() * cols.length) | 0]);
  }
}
function pebbles(T, R, w, y0, y1, n, pal) {
  for (let i = 0; i < n; i++) {
    const x = R() * w;
    const y = y0 + R() * (y1 - y0);
    const pw = 2 + ((R() * 3) | 0);
    const ph = 1 + ((R() * 2) | 0);
    T.r(x, y, pw, ph, pal[1]);
    T.p(x, y, pal[0]);
    T.r(x, y + ph, pw, 1, pal[3]);
    T.p(x + pw, y + ph - 1, pal[2]);
  }
}
function strata(T, R, w, y0, y1, col, gap = 13) {
  const ph = R() * 10;
  for (let y = y0; y < y1; y += gap) for (let x = 0; x < w; x++) {
    const yy = y + Math.round(Math.sin(x * 0.04 + ph + y) * 2 + Math.sin(x * 0.13) * 0.8);
    T.p(x, yy, col);
    if ((x * 7 + y) % 5 < 3) T.p(x, yy + 1, col);
  }
}

// Đá tự nhiên kiểu Voronoi: khối đá có khe nứt, sáng ở góc trên-trái
function voronoiRock(T, R, W, y0, y1, P) {
  const cs = 13;
  const gw = Math.ceil(W / cs) + 1;
  const gh = Math.ceil((y1 - y0) / cs) + 1;
  const pts = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push([i * cs + R() * cs, y0 + j * cs + R() * cs, R()]);
  for (let y = y0; y < y1; y++) {
    const gj = Math.floor((y - y0) / cs);
    for (let x = 0; x < W; x++) {
      const gi = Math.floor(x / cs);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = null;
      for (let j = gj - 1; j <= gj + 1; j++) {
        if (j < 0 || j >= gh) continue;
        for (let i = gi - 1; i <= gi + 1; i++) {
          if (i < 0 || i >= gw) continue;
          const p = pts[j * gw + i];
          const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
          if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      let c;
      if (edge < 1.1) c = P[3];
      else {
        const v = (best[0] - x) * 0.6 + (best[1] - y) * 0.8 + (best[2] - 0.5) * 6 + ((x + y) & 1 ? 0.8 : -0.8);
        c = edge < 2.2 && v < 0 ? P[2] : v > 3.2 ? P[0] : v > -2.5 ? P[1] : P[2];
      }
      T.p(x, y, c);
    }
  }
}

// Tối dần theo độ sâu, ranh giới hòa sắc
function depthShade(T, W, y0, y1, steps) {
  const d = T.d;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0);
    for (let x = 0; x < W; x++) {
      const lv = Math.min(steps.length - 1, Math.floor(f * steps.length + ((x + y) & 1 ? 0.18 : -0.18)));
      const k = steps[Math.max(0, lv)];
      if (k >= 1) continue;
      const i = y * T.w + x;
      const v = d[i];
      if (!(v >>> 24)) continue;
      d[i] = ((255 << 24) | ((((v >> 16) & 255) * k) << 16) | ((((v >> 8) & 255) * k) << 8) | ((v & 255) * k)) >>> 0;
    }
  }
}

function buildGround(T, m, th, sc, R) {
  const W = m.w;
  const G = m.ground;
  const H = m.h;
  const kind = sc.ground;
  const D = [shd(th.dirt, 0.14), th.dirt, shd(th.dirt, -0.18), shd(th.dirt, -0.36)];
  const stone = ['#b8b4ae', '#948f88', '#6e6a65', '#4e4a46'];
  if (kind === 'grass' || kind === 'cobble') {
    T.r(0, G, W, H - G, D[1]);
    strata(T, R, W, G + 16, H, D[2], 14);
    speck(T, R, 0, G + 4, W, H - G - 4, W * 0.5, [D[0], D[2], D[3]]);
    pebbles(T, R, W, G + 8, H - 2, W / 14, [shd(stone[0], 0.1), stone[1], stone[2], stone[3]]);
    // đá lớn vùi trong đất
    for (let i = 0; i < W / 120; i++) {
      const spr = sprRock(10 + ((R() * 10) | 0), 6 + ((R() * 4) | 0), (R() * 5) | 0, ['#a8a29a', '#878179', '#666059', '#4a4540']);
      blit(T, spr, R() * W, G + 14 + R() * (H - G - 24));
    }
    // rễ cây
    for (let i = 0; i < W / 26; i++) {
      let x = R() * W;
      const len = 4 + R() * 12;
      for (let k = 0; k < len; k++) { x += (R() - 0.5) * 1.4; T.p(x, G + 4 + k, k < len * 0.6 ? D[3] : D[2]); }
    }
  }
  if (kind === 'grass') {
    const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.22), shd(th.top, -0.42)];
    T.r(0, G, W, 1, Gr[0]);
    T.r(0, G + 1, W, 2, Gr[1]);
    T.r(0, G + 3, W, 2, Gr[2]);
    for (let x = 0; x < W; x++) {
      // mép cỏ rủ xuống
      const drip = (Math.sin(x * 0.7) + Math.sin(x * 0.23) * 1.3 + R() * 1.2) | 0;
      for (let k = 0; k < drip; k++) T.p(x, G + 5 + k, k === drip - 1 ? Gr[3] : Gr[2]);
      if (R() < 0.08) T.p(x, G + 1, Gr[0]);
      if (R() < 0.1) T.p(x, G + 3, Gr[3]);
    }
    // chùm cỏ + hoa
    const flowers = sc.flowers || ['#ff6f91', '#ffd54f', '#ffffff', '#b388ff', '#ff8a65'];
    for (let x = 0; x < W; x++) {
      if (R() < 0.3) T.p(x, G - 1, R() < 0.5 ? Gr[1] : Gr[0]);
      if (R() < 0.05) {
        // chùm cỏ hình chữ V
        const h = 2 + ((R() * 3) | 0);
        for (let k = 0; k < h; k++) { T.p(x - 1 - (k >> 1), G - 1 - k, Gr[2]); T.p(x, G - 1 - k, Gr[1]); T.p(x + 1 + (k >> 1), G - 1 - k, Gr[0]); }
      }
      if (R() < 0.022) {
        const c = flowers[(R() * flowers.length) | 0];
        const h = 2 + ((R() * 3) | 0);
        T.r(x, G - h, 1, h, Gr[2]);
        T.p(x - 1, G - h - 1, c); T.p(x + 1, G - h - 1, c); T.p(x, G - h - 2, c); T.p(x, G - h, c);
        T.p(x, G - h - 1, '#fff6a0');
      }
    }
  } else if (kind === 'cobble') {
    const v = VILLAGE[th.town] || VILLAGE.fire;
    const S = v.stone;
    // tường đá kè (đá xếp không đều)
    let y = G + 4;
    while (y < G + 30) {
      const bh = 5 + ((R() * 3) | 0);
      let x = -((R() * 8) | 0);
      while (x < W) {
        const bw = 9 + ((R() * 9) | 0);
        T.r(x + 1, y + 1, bw - 1, bh - 1, S[1]);
        T.r(x + 1, y + 1, bw - 1, 1, S[0]);
        T.r(x + 1, y + 1, 1, bh - 1, S[0]);
        T.r(x + 1, y + bh - 1, bw - 1, 1, S[2]);
        T.r(x + bw - 1, y + 1, 1, bh - 1, S[2]);
        T.r(x, y, bw, 1, S[3]);
        T.r(x, y, 1, bh, S[3]);
        if (R() < 0.25) T.p(x + 2 + R() * (bw - 4), y + 2 + R() * (bh - 3), S[2]);
        if (R() < 0.12) T.r(x + 1, y + 1, 2, 1, shd(th.top, -0.1));
        x += bw;
      }
      y += bh;
    }
    // bóng dưới chân tường
    for (let x = 0; x < W; x++) T.p(x, G + 30 + ((x * 3) % 2), D[3]);
    // phiến đá lát mặt đường
    let x = 0;
    while (x < W) {
      const sw = 14 + ((R() * 14) | 0);
      T.r(x, G, sw, 4, S[1]);
      T.r(x, G, sw, 1, shd(S[0], 0.3));
      T.r(x, G + 1, sw, 1, S[0]);
      T.r(x, G + 3, sw, 1, S[2]);
      T.r(x + sw - 1, G, 1, 4, S[3]);
      if (R() < 0.4) T.r(x + 3 + R() * (sw - 8), G + 2, 3, 1, S[2]);
      x += sw;
    }
    T.r(0, G + 4, W, 1, S[3]);
    // rêu & cỏ mọc kẽ đá
    const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.25)];
    for (let i = 0; i < W / 9; i++) {
      const gx = R() * W;
      const h = 1 + ((R() * 3) | 0);
      for (let k = 0; k < h; k++) { T.p(gx, G - 1 - k, Gr[1]); if (k < h - 1) T.p(gx + 1, G - 1 - k, Gr[2]); }
      if (R() < 0.3) T.p(gx - 1, G - 1, Gr[0]);
    }
    for (let i = 0; i < W / 30; i++) T.r(R() * W, G + 4 + R() * 24, 2 + R() * 3, 1, shd(th.top, -0.15));
  } else if (kind === 'sand') {
    const Sd = [shd(th.top, 0.35), th.top, shd(th.top, -0.12), shd(th.top, -0.25)];
    T.r(0, G, W, H - G, Sd[2]);
    T.r(0, G + 10, W, H - G - 10, shd(th.dirt, -0.05));
    for (let x = 0; x < W; x++) {
      const t = G + Math.round(Math.sin(x * 0.06) * 0.6);
      T.r(x, t, 1, 10 - (t - G), Sd[1]);
      T.p(x, t, Sd[0]);
      // gợn cát
      if (((x + Math.round(Math.sin(x * 0.1) * 3)) % 9) < 3) T.p(x, G + 3, Sd[0]);
      if (((x + 4 + Math.round(Math.sin(x * 0.08) * 3)) % 11) < 3) T.p(x, G + 6, Sd[3]);
      if (R() < 0.04) T.p(x, G - 1, Sd[1]);
    }
    strata(T, R, W, G + 18, H, shd(th.dirt, -0.18), 9);
    strata(T, R, W, G + 22, H, shd(th.dirt, 0.12), 9);
    speck(T, R, 0, G + 2, W, H - G, W * 0.6, [Sd[0], Sd[3], shd(th.dirt, -0.3)]);
    pebbles(T, R, W, G + 12, H, W / 20, ['#e8dcc8', '#c8b498', '#a08a70', '#7a6852']);
    if (m.theme === 'beach') for (let i = 0; i < W / 110; i++) blit(T, sprProp(R() < 0.7 ? 'shell' : 'starfish', i % 3), R() * W, G - 4 + R() * 3);
  } else if (kind === 'snow') {
    T.r(0, G, W, H - G, D[1]);
    strata(T, R, W, G + 16, H, D[2], 12);
    speck(T, R, 0, G + 8, W, H - G, W * 0.5, ['#e8f2fb', D[2], D[0]]);
    pebbles(T, R, W, G + 12, H, W / 16, ['#c4ccd6', '#9aa4b2', '#76808e', '#58606c']);
    for (let x = 0; x < W; x++) {
      const bump = Math.max(0, Math.round(Math.sin(x * 0.09) * 1.4 + Math.sin(x * 0.31) * 0.8));
      const depth = 6 + Math.round(Math.sin(x * 0.17) * 1.5 + Math.sin(x * 0.05) * 1.2);
      T.r(x, G - bump, 1, depth + bump, '#f4f8fc');
      T.p(x, G - bump, '#ffffff');
      T.r(x, G + depth - 2, 1, 2, '#c8daee');
      T.p(x, G + depth, '#9ab8d8');
      if (R() < 0.15) T.p(x, G + 2 + ((R() * 3) | 0), '#dce8f4');
      // nhũ băng nhỏ
      if (R() < 0.06) { const l = 1 + ((R() * 4) | 0); for (let k = 0; k < l; k++) T.p(x, G + depth + 1 + k, k === l - 1 ? '#ffffff' : '#bfe6fa'); }
    }
  } else if (kind === 'ice') {
    T.r(0, G, W, H - G, '#4a7fa6');
    strata(T, R, W, G + 14, H, '#3c6a8e', 10);
    // khối băng sâu có vết nứt
    for (let i = 0; i < W / 18; i++) {
      let x = R() * W;
      let y = G + 8 + R() * 40;
      for (let k = 0; k < 10; k++) { T.p(x, y, '#8ac4e4'); x += R() < 0.5 ? 1 : -1; y += 1; }
    }
    for (let i = 0; i < W / 10; i++) T.p(R() * W, G + 10 + R() * (H - G - 10), '#a8dcf4');
    for (let x = 0; x < W; x++) {
      T.r(x, G, 1, 7, '#bfe8fa');
      T.p(x, G, '#ffffff');
      T.p(x, G + 1, '#e8f8ff');
      T.r(x, G + 6, 1, 2, '#6aa8d0');
      // vệt bóng chéo
      if (((x + 0) % 23) < 2) for (let k = 0; k < 5; k++) T.p(x + k, G + 1 + k, '#ffffff');
      if (R() < 0.05) T.p(x, G - 1, '#ffffff');
    }
  } else if (kind === 'rock') {
    const P = sc.gpal;
    voronoiRock(T, R, W, G + 3, H, [P[1], P[2], P[3], P[4]]);
    for (let x = 0; x < W; x++) {
      const b = Math.round(Math.sin(x * 0.2) * 0.7 + Math.sin(x * 0.07));
      T.r(x, G - Math.max(0, b), 1, 4 + Math.max(0, b), P[1]);
      T.p(x, G - Math.max(0, b), P[0]);
      if (R() < 0.04) T.r(x, G - 2, 2, 2, P[1]);
    }
    if (m.theme === 'cave') for (let i = 0; i < W / 25; i++) { const c = R() < 0.5 ? '#b388ff' : '#4fc3f7'; const x = R() * W; const yy = G + 6 + R() * 40; T.p(x, yy, c); T.p(x + 1, yy - 1, shd(c, 0.5)); }
  } else if (kind === 'basalt') {
    const P = ['#5a4444', '#3e2e2e', '#2a1e1e', '#1a1212'];
    T.r(0, G, W, H - G, P[2]);
    // cột đá bazan + khe nứt nóng chảy
    let x = 0;
    while (x < W) {
      const cw = 7 + ((R() * 6) | 0);
      const off = (R() * 6) | 0;
      T.r(x, G + 4 + off, cw - 1, H, P[1]);
      T.r(x, G + 4 + off, 1, H, P[0]);
      T.r(x + cw - 2, G + 4 + off, 1, H, P[3]);
      for (let yy = G + 12 + off; yy < H; yy += 10 + ((R() * 6) | 0)) T.r(x, yy, cw - 1, 1, P[3]);
      if (R() < 0.35) for (let yy = G + 5 + off; yy < H; yy++) T.p(x + cw - 1, yy, (yy + x) % 7 < 4 ? '#ff6a1a' : '#c83a10');
      x += cw;
    }
    for (let xx = 0; xx < W; xx++) {
      T.r(xx, G, 1, 4, P[1]);
      T.p(xx, G, P[0]);
      if (R() < 0.05) T.p(xx, G + 1, '#ff8a3a');
      if (R() < 0.03) T.r(xx, G - 1, 2, 1, P[1]);
    }
  } else if (kind === 'tiles') {
    const S = ['#f0e6d2', '#d8cab0', '#b4a486', '#8a7a60'];
    T.r(0, G, W, H - G, '#8a7457');
    // nền gạch
    for (let y = G + 10; y < H; y += 6) for (let x = ((y / 6) & 1) * 7 - 7; x < W; x += 14) {
      T.r(x, y, 13, 5, '#a8916e'); T.r(x, y, 13, 1, '#bca684'); T.r(x + 13, y, 1, 6, '#6e5c44'); T.r(x, y + 5, 14, 1, '#6e5c44');
    }
    // phiến đá lát + viền trang trí
    for (let x = 0; x < W; x += 24) {
      T.r(x, G, 24, 6, S[1]); T.r(x, G, 24, 1, '#ffffff'); T.r(x, G + 1, 24, 1, S[0]); T.r(x, G + 5, 24, 1, S[2]); T.r(x + 23, G, 1, 6, S[3]);
      T.p(x + 6, G + 3, S[2]); T.p(x + 15, G + 2, S[2]);
    }
    T.r(0, G + 6, W, 3, '#b03030'); T.r(0, G + 6, W, 1, '#d84a40');
    for (let x = 2; x < W; x += 8) T.r(x, G + 7, 3, 1, '#ffd54f');
    T.r(0, G + 9, W, 1, '#5a2020');
  }
  if (kind !== 'tiles') depthShade(T, W, G + 14, H, [1, 0.9, 0.8, 0.7]);
}

// Vách đá hai đầu bản đồ
function buildCliffs(T, m, th, sc, R) {
  const G = m.ground;
  const dk = m.theme === 'dark_forest' ? ['#5a4e6e', '#433a56', '#30293f', '#211c2c'] : m.theme === 'mist' ? ['#8a948e', '#6a746e', '#525a56', '#3c423f'] : null;
  const pal = dk || sc.cliff || (sc.ground === 'snow' || sc.ground === 'ice' ? ['#d4e2ee', '#a6b8cc', '#7a8ea6', '#566a82'] : sc.ground === 'sand' ? ['#f0c890', '#d0a068', '#a87a4a', '#7a5634'] : sc.ground === 'basalt' ? ['#5a4040', '#3e2c2c', '#2a1c1c', '#1a1010'] : sc.ground === 'rock' ? sc.gpal : ['#a89c8c', '#857a6c', '#62584c', '#463e36']);
  const cap = sc.ground === 'snow' || sc.ground === 'ice' ? '#ffffff' : sc.ground === 'sand' ? th.top : sc.ground === 'basalt' || sc.ground === 'rock' || sc.ground === 'tiles' ? null : th.top;
  for (const side of [0, 1]) {
    const cw = 20;
    const Hc = 84 + R() * 30;
    for (let i = 0; i < cw + 6; i++) {
      const f = i / cw;
      const h = Math.round(Hc * Math.max(0, 1 - Math.pow(f, 1.6)) + Math.sin(i * 1.7) * 2);
      if (h <= 0) continue;
      const x = side ? m.w - 1 - i : i;
      for (let y = G - h; y < G + 2; y++) {
        const yy = y - (G - h);
        let c = pal[1];
        if (i > cw - 4 - Math.sin(y * 0.3) * 2) c = pal[2];
        if ((y + i * 2) % 11 === 0) c = pal[3];
        if (yy < 2) c = pal[0];
        T.p(x, y, c);
      }
      if (cap) { T.r(x, G - h - 1, 1, 3, cap); if (i % 3 === 0) T.p(x, G - h + 2, cap); }
    }
  }
}

// ======================= Bục nhảy =======================
function floorBelow(m, x, y) {
  let best = m.ground;
  for (const [px, py, pw] of m.platforms) if (py > y + 2 && x >= px && x <= px + pw && py < best) best = py;
  return best;
}

function buildPlatform(T, m, th, sc, R, px, py, pw, anims) {
  const type = th.plat;
  const x0 = Math.round(px);
  const y = Math.round(py);
  const w = Math.round(pw);
  if (type === 'wood') {
    const Wd = ['#e2b276', '#b07c46', '#87592f', '#5a3a20'];
    // cột chống
    const posts = [x0 + 5, x0 + w - 8];
    if (w > 170) posts.push(x0 + Math.round(w / 2) - 1);
    for (const sx of posts) {
      const fy = floorBelow(m, sx, y);
      T.r(sx, y + 5, 3, fy - y - 5, Wd[2]);
      T.r(sx, y + 5, 1, fy - y - 5, Wd[1]);
      T.r(sx + 2, y + 5, 1, fy - y - 5, Wd[3]);
      for (let yy = y + 14; yy < fy - 4; yy += 16) T.r(sx - 1, yy, 5, 2, '#c8a878');
      // thanh giằng chéo
      const dir = sx < x0 + w / 2 ? 1 : -1;
      T.line(sx + 1, y + 16, sx + 1 + dir * 10, y + 6, Wd[3], 2);
      T.r(sx - 1, fy - 2, 5, 2, '#7a6a5a');
    }
    // mặt cầu bằng ván
    T.r(x0, y, w, 5, Wd[1]);
    T.r(x0, y, w, 1, Wd[0]);
    T.r(x0, y + 3, w, 1, Wd[2]);
    T.r(x0, y + 5, w, 2, Wd[3]);
    let x = x0;
    while (x < x0 + w) {
      const pl = 9 + ((R() * 6) | 0);
      T.r(x, y, 1, 5, Wd[3]);
      T.p(x + 2, y + 1, '#4a3424');
      if (pl > 11) T.r(x + 4, y + 2, 4, 1, Wd[2]);
      x += pl;
    }
    for (let bx = x0 + 6; bx < x0 + w - 4; bx += 24) T.r(bx, y + 7, 4, 2, Wd[3]);
    // lan can dây thừng
    const rp = [x0 + 1];
    for (let k = x0 + 36; k < x0 + w - 18; k += 36) rp.push(k);
    rp.push(x0 + w - 3);
    for (const k of rp) { T.r(k, y - 9, 2, 9, Wd[2]); T.p(k, y - 9, Wd[0]); T.r(k, y - 10, 2, 1, Wd[3]); }
    for (let i = 0; i + 1 < rp.length; i++) {
      const a = rp[i] + 1;
      const b = rp[i + 1];
      for (let xx = a; xx <= b; xx++) {
        const f = (xx - a) / (b - a);
        const yy = y - 8 + Math.round(Math.sin(f * Math.PI) * 3);
        T.p(xx, yy, (xx & 1) ? '#d8bc88' : '#a88a5a');
      }
    }
    if (m.town) for (let i = 0; i + 1 < rp.length; i++) {
      // đèn lồng nhỏ treo trên lan can làng
      const mx = Math.round((rp[i] + rp[i + 1]) / 2);
      if ((i & 1) === 0) { lanternMini(T, mx, y - 5); anims.lights.push({ x: mx, y: y - 2, r: 16, col: '#ff9a40', a: 0.35, f: 0.25 }); }
    }
  } else if (type === 'bamboo') {
    const B = ['#d6ec8e', '#9cc456', '#6e9a38', '#4a6e24'];
    for (const sx of [x0 + 4, x0 + w - 7]) {
      const fy = floorBelow(m, sx, y);
      for (let yy = y - 6; yy < fy; yy++) {
        T.p(sx, yy, B[0]); T.p(sx + 1, yy, B[1]); T.p(sx + 2, yy, B[2]);
        if ((yy - y) % 14 === 0) T.r(sx - 1, yy, 5, 1, B[3]);
      }
      T.r(sx - 1, y - 7, 5, 1, B[3]);
    }
    for (const yy of [y, y + 3]) {
      T.r(x0, yy, w, 3, B[1]);
      T.r(x0, yy, w, 1, B[0]);
      T.r(x0, yy + 2, w, 1, B[2]);
      for (let x = x0 + 8 + (yy - y) * 3; x < x0 + w; x += 17) { T.r(x, yy, 1, 3, B[3]); T.p(x + 1, yy, B[0]); }
    }
    T.r(x0, y + 6, w, 1, B[3]);
    // dây buộc
    for (const sx of [x0 + 4, x0 + w - 7]) for (let k = 0; k < 3; k++) { T.r(sx - 1, y + k * 2, 5, 1, '#d8b070'); T.p(sx + 3, y + k * 2 + 1, '#a07a40'); }
    // lá tre ở đầu bục
    for (const [lx, d] of [[x0, -1], [x0 + w, 1]]) for (let i = 0; i < 6; i++) T.p(lx + d * i, y - 1 - (i >> 1), i < 3 ? B[1] : B[0]);
  } else if (type === 'ice') {
    for (let x = x0; x < x0 + w; x++) {
      const bump = (Math.sin(x * 0.4) > 0.6) ? 1 : 0;
      T.r(x, y - bump, 1, 2 + bump, '#ffffff');
      T.r(x, y + 2, 1, 4, '#a8dcf2');
      T.p(x, y + 2, '#e4f6ff');
      T.p(x, y + 6, '#5d9fc4');
      if (((x - x0) % 19) < 2) for (let k = 0; k < 3; k++) T.p(x + k, y + 2 + k, '#ffffff');
    }
    // nhũ băng
    for (let x = x0 + 2; x < x0 + w - 2; x += 2 + ((R() * 4) | 0)) {
      const l = 2 + ((R() * 9) | 0);
      for (let k = 0; k < l; k++) {
        const wdt = k < l * 0.4 ? 2 : 1;
        T.r(x, y + 7 + k, wdt, 1, k === l - 1 ? '#ffffff' : k < 2 ? '#7ab8dc' : '#bfe8fa');
      }
    }
  } else {
    // bục đá theo chủ đề
    const t = m.theme;
    const P = t === 'desert' ? ['#ffe0a8', '#e8bc7c', '#c0905a', '#8a6038'] : t === 'cave' ? ['#8a80a8', '#625a80', '#463e60', '#2e2842'] : t === 'mist' ? ['#b8beb8', '#8e968e', '#6a726a', '#4a524c'] : t === 'arena' ? ['#ffffff', '#e2d8c6', '#b8aa90', '#857660'] : ['#6e5050', '#4a3434', '#332222', '#201414'];
    if (t === 'arena') {
      for (const sx of [x0 + 8, x0 + w - 18]) {
        const fy = floorBelow(m, sx, y);
        T.r(sx, y + 8, 10, fy - y - 8, P[2]);
        for (let k = sx + 2; k < sx + 9; k += 3) T.r(k, y + 10, 1, fy - y - 14, P[3]);
        T.r(sx, y + 8, 2, fy - y - 8, P[1]);
        T.r(sx - 2, fy - 4, 14, 4, P[2]); T.r(sx - 2, fy - 4, 14, 1, P[1]);
      }
    }
    T.r(x0, y, w, 8, P[1]);
    T.r(x0, y, w, 1, P[0]);
    T.r(x0, y + 1, w, 1, mix(P[0], P[1], 0.5));
    for (let x = x0 + ((R() * 6) | 0); x < x0 + w; x += 10 + ((R() * 6) | 0)) { T.r(x, y + 2, 1, 6, P[3]); T.p(x + 1, y + 2, P[0]); }
    T.r(x0, y + 5, w, 1, P[2]);
    T.r(x0, y + 7, w, 1, P[3]);
    if (t === 'arena') { T.r(x0, y + 4, w, 1, '#b03030'); for (let x = x0 + 3; x < x0 + w; x += 6) T.p(x, y + 4, '#ffd54f'); }
    // mặt dưới lởm chởm
    if (t !== 'arena') for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const l = Math.max(0, Math.round(2 + Math.sin(x * 0.45 + y) * 2 + Math.sin(x * 0.13) * 2 - Math.abs((x - x0 - w / 2) / (w / 2)) * 3));
      for (let k = 0; k < l; k++) T.p(x, y + 8 + k, k === l - 1 ? P[3] : P[2]);
    }
    if (t === 'mist') for (let x = x0; x < x0 + w; x++) { T.p(x, y, '#7a9a6a'); if ((x * 7) % 5 < 2) T.p(x, y + 1, '#5e7e52'); if ((x * 13) % 17 === 0) T.r(x, y + 2, 1, 3, '#5e7e52'); }
    if (t === 'lava' || t === 'hell') for (let x = x0 + 4; x < x0 + w - 4; x += 7 + ((R() * 8) | 0)) { T.r(x, y + 3, 1, 4, '#ff7a2a'); T.p(x + 1, y + 5, '#ffb04a'); anims.lights.push({ x, y: y + 6, r: 10, col: '#ff6a1a', a: 0.25, f: 0.3 }); }
    if (t === 'cave' && R() < 0.8) { const spr = sprCrystal(8 + ((R() * 5) | 0), R() < 0.5 ? '#b388ff' : '#4fc3f7', 1); const cx = x0 + 6 + R() * (w - 20); blit(T, spr, cx, y - spr.h + 3); anims.lights.push({ x: cx + spr.w / 2, y: y - 4, r: 24, col: '#a080ff', a: 0.35, f: 0.15 }); }
    if (t === 'desert') { T.r(x0, y - 1, w, 1, '#f8dca8'); for (let x = x0; x < x0 + w; x += 3) T.p(x, y - 2, '#f8dca8'); }
  }
  // cỏ phủ mép bục cho chủ đề cỏ
  if (type === 'wood' && !m.town && sc.ground === 'grass') for (let x = x0; x < x0 + w; x += 1) if (((x * 7) % 9) < 2) T.p(x, y - 1, shd(th.top, 0.1));
}

function lanternMini(T, x, y, col = '#e0352b') {
  T.p(x, y - 1, '#2a1a14');
  T.r(x - 2, y, 5, 5, col);
  T.r(x - 1, y + 1, 3, 3, shd(col, 0.35));
  T.p(x, y + 2, '#ffe6a0');
  T.r(x - 2, y, 5, 1, '#2a1a14');
  T.r(x - 2, y + 5, 5, 1, '#2a1a14');
}

// ======================= Làng Nhật Bản =======================
const SHOP = {
  elder: { w: 124, wh: 40, noren: '#283593', icon: 'scroll', tiers: 2 },
  potion: { w: 98, wh: 34, noren: '#c2185b', icon: 'gourd' },
  smith: { w: 100, wh: 34, noren: '#37474f', icon: 'hammer', chimney: true, forge: true },
  task: { w: 94, wh: 32, noren: '#2e7d32', icon: 'note' },
  tele: { w: 94, wh: 32, noren: '#1565c0', icon: 'wheel' },
  clan: { w: 104, wh: 36, noren: '#6a1b9a', icon: 'crest', tiers: 2 },
  storage: { w: 100, wh: 36, noren: '#6d4c41', icon: 'box', kura: true },
  arena: { w: 96, wh: 34, noren: '#b71c1c', icon: 'sword' },
  dungeon: { shrine: true, icon: 'skull' },
};
const ICONS = {
  scroll: ['.yyyyy.', 'y.....y', '.wwwww.', '.wkkkw.', '.wwwww.', '.wkkw..', '.yyyyy.'],
  gourd: ['...k...', '..www..', '...r...', '..rrr..', '.rrrrr.', '.rrwrr.', '..rrr..'],
  hammer: ['.kkkkk.', '.kwwwk.', '.kkkkk.', '...b...', '...b...', '...b...', '...b...'],
  note: ['..yyy..', '..yyy..', '..yyy..', '..yyy..', '.......', '..yyy..', '..yyy..'],
  wheel: ['..yyy..', '.y.y.y.', 'y..y..y', 'yyyyyyy', 'y..y..y', '.y.y.y.', '..yyy..'],
  crest: ['...y...', '..yyy..', '.yy.yy.', 'yy.r.yy', '.yy.yy.', '..yyy..', '...y...'],
  box: ['yyyyyyy', 'ybbbbby', 'yyyyyyy', 'yb.y.by', 'yb.y.by', 'ybbbbby', 'yyyyyyy'],
  sword: ['......w', '.....w.', '....w..', '.y.w...', '..y....', '.b.y...', 'b......'],
  skull: ['.wwwww.', 'wwwwwww', 'wkwwwkw', 'wwwwwww', '.wwkww.', '.w.w.w.', '.......'],
};
const ICON_PAL = { y: '#ffd54f', w: '#fff8e8', k: '#2a1a14', r: '#e53935', b: '#a0703a' };

function shopSpr(type, vk) {
  return cached(`shop:${type}:${vk}`, () => {
    const v = VILLAGE[vk] || VILLAGE.fire;
    const o = SHOP[type] || SHOP.task;
    if (o.shrine) return shrineSpr(v);
    const w = o.w;
    const wh = o.wh;
    const rh = 17;
    const extraH = o.tiers === 2 ? 28 : o.chimney ? 8 : 0;
    const W = w + 36;
    const H = wh + rh + extraH + 16;
    const s = new Buf(W, H);
    const cx = Math.floor(W / 2);
    const base = H - 1;
    const wood = ramp(v.wood);
    const lights = [];
    const anims = [];
    const L = cx - w / 2;
    // móng đá + hiên gỗ
    s.r(L - 3, base - 3, w + 6, 4, '#8a857c');
    s.r(L - 3, base - 3, w + 6, 1, '#b8b2a8');
    for (let x = L; x < L + w; x += 9) s.r(x, base - 2, 1, 3, '#5e5a54');
    s.r(L - 5, base - 6, w + 10, 3, wood[1]);
    s.r(L - 5, base - 6, w + 10, 1, wood[0]);
    s.r(L - 5, base - 4, w + 10, 1, wood[2]);
    const wy = base - 6 - wh;
    s.r(L, wy, w, wh, v.wall);
    for (let y = wy + 4; y < base - 6; y += 7) for (let x = L + ((y * 3) % 5); x < L + w; x += 13) s.p(x, y, shd(v.wall, -0.05));
    // tường dưới
    const lowH = 10;
    const ly = base - 6 - lowH;
    if (o.kura) {
      s.r(L, ly, w, lowH, '#3e3e48');
      for (let x = L - lowH; x < L + w; x += 5) for (let k = 0; k < lowH; k++) { s.p(x + k, ly + k, '#d8d8d8'); s.p(x + lowH - k, ly + k, '#a8a8b0'); }
      s.r(L, ly, w, 1, '#222228');
    } else {
      s.r(L, ly, w, lowH, wood[1]);
      for (let x = L + 1; x < L + w; x += 3) s.r(x, ly + 1, 1, lowH - 1, wood[2]);
      s.r(L, ly, w, 1, wood[0]);
    }
    // cột gỗ + xà ngang
    const nP = 5;
    for (let i = 0; i < nP; i++) {
      const x = Math.round(L + ((w - 3) * i) / (nP - 1));
      s.r(x, wy, 3, wh, wood[2]);
      s.r(x, wy, 1, wh, wood[1]);
    }
    s.r(L, wy, w, 3, wood[2]);
    s.r(L, wy + 2, w, 1, wood[3]);
    s.r(L, ly - 2, w, 2, wood[2]);
    // cửa vào
    const dw = 28;
    const dh = wh - 14;
    const dx0 = cx - dw / 2;
    const dy0 = base - 6 - dh;
    s.r(dx0, dy0, dw, dh, '#3a2418');
    s.r(dx0 + 1, dy0 + dh - 8, dw - 2, 8, '#6e4222');
    s.r(dx0 + 1, dy0 + dh - 3, dw - 2, 3, '#a8662e');
    if (o.forge) {
      s.r(dx0 + 3, dy0 + dh - 12, 12, 12, '#55504c');
      s.r(dx0 + 3, dy0 + dh - 12, 12, 1, '#7a7470');
      s.r(dx0 + 5, dy0 + dh - 9, 8, 5, '#ff7a1a');
      s.r(dx0 + 6, dy0 + dh - 8, 6, 2, '#ffe08a');
      lights.push({ x: dx0 + 9 - cx, y: dy0 + dh - 8 - base, r: 40, col: '#ff6a1a', a: 0.55, f: 0.35 });
      s.r(dx0 + 18, dy0 + dh - 6, 8, 2, '#6a6c74');
    } else {
      // kệ hàng bên trong
      s.r(dx0 + 3, dy0 + 6, dw - 6, 1, '#7a5232');
      const goods = type === 'potion' ? ['#e53935', '#1e88e5', '#43a047', '#fdd835'] : ['#c8a060', '#a07040', '#d8c090'];
      for (let x = dx0 + 4; x < dx0 + dw - 4; x += 3) s.r(x, dy0 + 4, 2, 2, goods[((x - dx0) / 3) % goods.length | 0]);
      lights.push({ x: 0, y: dy0 + dh / 2 - base, r: 30, col: v.glow, a: 0.32, f: 0.1 });
    }
    s.r(dx0 - 2, dy0 - 2, dw + 4, 2, wood[3]);
    s.r(dx0 - 2, dy0, 2, dh, wood[3]);
    s.r(dx0 + dw, dy0, 2, dh, wood[3]);
    // rèm noren 4 mảnh
    const nc = ramp(o.noren);
    for (let k = 0; k < 4; k++) {
      const px = dx0 + k * 7;
      const len = 12 + (k & 1);
      s.r(px, dy0, 6, len, nc[1]);
      s.r(px, dy0, 1, len, nc[0]);
      s.r(px + 5, dy0, 1, len, nc[2]);
      s.r(px, dy0 + len - 1, 6, 1, nc[2]);
    }
    s.r(dx0 - 1, dy0, dw + 2, 1, nc[3]);
    s.ell(cx, dy0 + 6.5, 3.6, 3.6, '#f6efe0');
    s.ell(cx, dy0 + 6.5, 1.8, 1.8, nc[1]);
    // cửa sổ shoji sáng ấm
    for (const side of [-1, 1]) {
      const sw = Math.min(18, Math.round((w - dw) / 2 - 12));
      const sh = Math.min(13, wh - 18);
      const sx = side < 0 ? L + 7 : L + w - 7 - sw;
      const sy = wy + 6;
      s.r(sx - 1, sy - 1, sw + 2, sh + 2, wood[3]);
      s.r(sx, sy, sw, sh, '#ffe7ac');
      s.r(sx, sy, sw, 2, '#fff6d6');
      for (let x = sx + 3; x < sx + sw; x += 4) s.r(x, sy, 1, sh, '#c49a62');
      for (let y = sy + 3; y < sy + sh; y += 4) s.r(sx, y, sw, 1, '#c49a62');
      lights.push({ x: sx + sw / 2 - cx, y: sy + sh / 2 - base, r: 24, col: v.glow, a: 0.3, f: 0.06 });
    }
    // biển hiệu sơn mài với biểu tượng
    s.r(cx - 9, wy + 3, 19, 11, '#c8a040');
    s.r(cx - 8, wy + 4, 17, 9, '#2a1210');
    pix(s, cx - 3, wy + 5, ICONS[o.icon], ICON_PAL);
    // mái chính
    const eaveY = wy - 1;
    roofDraw(s, cx, eaveY, w / 2 + 13, rh, v.roof, w / 2 - 16);
    if (o.tiers === 2) {
      const w2 = Math.round(w * 0.58);
      const wy2 = eaveY - rh - 11;
      s.r(cx - w2 / 2, wy2, w2, 12, v.wall);
      s.r(cx - w2 / 2 + 3, wy2 + 3, w2 - 6, 6, '#ffe7ac');
      for (let x = cx - w2 / 2 + 6; x < cx + w2 / 2 - 3; x += 4) s.r(x, wy2 + 3, 1, 6, '#c49a62');
      s.r(cx - w2 / 2, wy2, 2, 12, wood[2]);
      s.r(cx + w2 / 2 - 2, wy2, 2, 12, wood[2]);
      roofDraw(s, cx, wy2 - 1, w2 / 2 + 11, 13, v.roof, w2 / 2 - 12);
      const ry = wy2 - 1 - 13 - 3;
      s.r(cx - w2 / 2 + 8, ry - 3, 3, 3, '#ffd54f');
      s.r(cx + w2 / 2 - 11, ry - 3, 3, 3, '#ffd54f');
      lights.push({ x: 0, y: wy2 + 6 - base, r: 26, col: v.glow, a: 0.25, f: 0.06 });
    }
    if (o.chimney) {
      const chx = cx + w / 2 - 24;
      const cy0 = eaveY - rh - 8;
      s.r(chx, cy0, 7, 14, '#7a726a');
      s.r(chx, cy0, 2, 14, '#9a928a');
      s.r(chx - 1, cy0 - 2, 9, 3, '#5a544e');
      anims.push({ k: 'smoke', x: chx + 3 - cx, y: cy0 - 3 - base });
    }
    // đèn lồng treo hai góc mái
    for (const side of [-1, 1]) {
      const lx = cx + side * (w / 2 + 3);
      lanternDraw(s, lx, eaveY + 3, 1);
      lights.push({ x: lx - cx, y: eaveY + 10 - base, r: 30, col: '#ff8a3a', a: 0.5, f: 0.3 });
    }
    s.outline(0.55);
    return { s, lights, anims, w, eave: eaveY - base };
  });
}

function shrineSpr(v) {
  const W = 96;
  const H = 66;
  const s = new Buf(W, H);
  const cx = W / 2;
  const base = H - 1;
  const g = ['#b8b0a4', '#958c80', '#706860', '#4e4842'];
  blob(s, cx, base + 6, 44, 58, g, { cut: base, wob: 0.06, lobes: 5, ph: 1 });
  blob(s, cx - 26, base + 2, 18, 24, g, { cut: base, wob: 0.1, ph: 2 });
  blob(s, cx + 28, base + 2, 16, 20, g, { cut: base, wob: 0.1, ph: 3 });
  // rêu
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (s.has(x, y) && !s.has(x, y - 2) && (x * 7) % 5 < 3) s.p(x, y, '#6a9a4a');
  // miệng hang
  s.ell(cx, base, 17, 30, '#1a1018');
  s.ell(cx, base + 2, 13, 24, '#0c060c');
  for (let i = 0; i < 6; i++) s.p(cx - 6 + i * 2, base - 4 - (i & 1) * 2, '#ff5252');
  // dây shimenawa + giấy shide
  for (let x = cx - 20; x <= cx + 20; x++) { const y = base - 30 + Math.round(Math.sin(((x - cx + 20) / 40) * Math.PI) * 4); s.p(x, y, '#e8d098'); s.p(x, y + 1, (x & 1) ? '#c8a868' : '#e8d098'); }
  for (const k of [-12, 0, 12]) { const y = base - 26 + (k ? 1 : 3); s.r(cx + k, y, 2, 2, '#ffffff'); s.r(cx + k - 1, y + 2, 2, 2, '#ffffff'); s.r(cx + k, y + 4, 2, 2, '#ffffff'); }
  // biển gỗ
  s.r(cx + 22, base - 22, 2, 22, '#5a3a26');
  s.r(cx + 17, base - 26, 12, 10, '#2a1210');
  s.r(cx + 17, base - 26, 12, 1, '#c8a040');
  pix(s, cx + 20, base - 24, ICONS.skull.slice(0, 6), ICON_PAL);
  s.outline(0.55);
  return { s, lights: [{ x: 0, y: -16, r: 26, col: '#ff3a3a', a: 0.3, f: 0.2 }], anims: [{ k: 'flame', x: -22, y: -26 }, { k: 'flame', x: 22, y: -30, skip: true }], w: 70, eave: -40 };
}

function toriiSpr(col = '#d8342a', big = true) {
  return cached(`torii:${col}:${big}`, () => {
    const W = big ? 76 : 52;
    const H = big ? 78 : 56;
    const s = new Buf(W, H);
    const C = ramp(col);
    const cx = W / 2;
    const pw = big ? 5 : 4;
    const px = big ? 24 : 17;
    for (const side of [-1, 1]) {
      const x = Math.round(cx + side * px - pw / 2);
      s.r(x, 12, pw, H - 12, C[1]);
      s.r(x, 12, 1, H - 12, C[0]);
      s.r(x + pw - 1, 12, 1, H - 12, C[2]);
      s.r(x - 1, H - 6, pw + 2, 6, '#2a2020');
      s.r(x - 1, H - 6, pw + 2, 1, '#4a3a3a');
    }
    // kasagi cong vểnh
    for (let x = 0; x < W; x++) {
      const f = Math.abs(x - cx) / (W / 2);
      const up = Math.round(Math.pow(f, 3) * 5);
      s.r(x, 4 - up, 1, 3, '#2a1a1a');
      s.r(x, 7 - up, 1, 3, C[1]);
      s.p(x, 7 - up, C[0]);
      s.p(x, 9 - up, C[2]);
    }
    // nuki
    s.r(4, 20, W - 8, 4, C[1]);
    s.r(4, 20, W - 8, 1, C[0]);
    s.r(4, 23, W - 8, 1, C[2]);
    // biển gakuzuka
    s.r(cx - 5, 9, 10, 11, '#2a1a1a');
    s.r(cx - 4, 10, 8, 9, '#3a2a20');
    s.r(cx - 2, 12, 4, 1, '#ffd54f');
    s.r(cx - 1, 14, 2, 3, '#ffd54f');
    // dây thừng shimenawa
    if (big) {
      for (let x = cx - px + 3; x < cx + px - 2; x++) { const y = 27 + Math.round(Math.sin(((x - cx + px) / (2 * px)) * Math.PI) * 3); s.p(x, y, '#e8d098'); s.p(x, y + 1, (x & 1) ? '#c8a868' : '#e8d098'); }
      for (const k of [-10, 0, 10]) { s.r(cx + k, 31 + (k ? 0 : 2), 2, 2, '#ffffff'); s.r(cx + k - 1, 33 + (k ? 0 : 2), 2, 2, '#ffffff'); }
    }
    return s.outline(0.6);
  });
}

function buildVillage(T, m, th, sc, R, A) {
  const vk = th.town;
  const v = VILLAGE[vk];
  const G = m.ground;
  const npcs = (m.npcs || []).slice().sort((a, b) => a.x - b.x);
  const door = m.portals.find((p) => p.door);
  const houses = npcs.map((n) => ({ n, sp: shopSpr(n.type, vk) }));
  // cây lớn phía sau giữa các nhà
  const backTrees = [];
  for (let i = 0; i + 1 < houses.length; i++) {
    const a = houses[i];
    const b = houses[i + 1];
    const mid = (a.n.x + b.n.x) / 2;
    if (door && Math.abs(mid - door.x) < 60) { backTrees.push(door.x - 64, door.x + 64); continue; }
    backTrees.push(mid + (R() - 0.5) * 10);
  }
  if (houses.length) backTrees.push(houses[0].n.x - 80, houses[houses.length - 1].n.x + 76);
  for (const x of backTrees) {
    if (x < 70 || x > m.w - 70) continue;
    const kind = v.tree;
    const h = kind === 'bamboo' ? 110 + ((R() * 30) | 0) : 72 + ((R() * 14) | 0);
    const spr = sprTree(kind, h, (R() * 3) | 0);
    blit(T, spr, x - spr.w / 2, G - spr.h + 2);
  }
  // cổng torii (cửa dịch chuyển) + đèn đá hai bên
  if (door) {
    for (const d of [-44, 44]) { const sp = sprProp('stonelantern', 0, vk); blit(T, sp, door.x + d - 8, G - sp.h + 1); A.lights.push({ x: door.x + d, y: G - 19, r: 22, col: '#ffc060', a: 0.45, f: 0.2 }); }
    const tg = toriiSpr(vk === 'water' ? '#c83a3a' : vk === 'wind' ? '#d8462a' : '#e0402a');
    blit(T, tg, door.x - tg.w / 2, G - tg.h + 1);
  }
  // nhà / cửa hàng
  for (const { n, sp } of houses) {
    blit(T, sp.s, n.x - sp.s.w / 2, G - sp.s.h + 1);
    for (const l of sp.lights) A.lights.push({ ...l, x: n.x + l.x, y: G + l.y });
    for (const a of sp.anims) if (!a.skip) A.anims.push({ ...a, x: n.x + a.x, y: G + a.y });
  }
  // dây đèn lồng lễ hội giữa các mái nhà gần nhau
  for (let i = 0; i + 1 < houses.length; i++) {
    const a = houses[i];
    const b = houses[i + 1];
    if (b.n.x - a.n.x > 175) continue;
    const x1 = a.n.x + a.sp.w / 2 + 6;
    const x2 = b.n.x - b.sp.w / 2 - 6;
    const y1 = G + a.sp.eave + 2;
    const y2 = G + b.sp.eave + 2;
    if (x2 - x1 < 12) continue;
    let k = 0;
    for (let x = x1; x <= x2; x++) {
      const f = (x - x1) / (x2 - x1);
      const y = Math.round(y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * 7);
      T.p(x, y, '#3a2a20');
      if ((x - x1) % 9 === 4 && x < x2 - 2) {
        const c = k++ % 3 === 1 ? '#f0f0e8' : '#e0352b';
        lanternMini(T, x, y + 1, c);
        A.lights.push({ x, y: y + 4, r: 14, col: c === '#e0352b' ? '#ff7a3a' : '#fff0c0', a: 0.4, f: 0.3 });
      }
    }
  }
  // đồ vật phía trước theo loại nhà
  for (const { n, sp } of houses) {
    const x = n.x;
    const put = (kind, dx, seed = 0) => { const p = sprProp(kind, seed, vk); blit(T, p, x + dx - p.w / 2, G - p.h + 1); return p; };
    if (n.type === 'smith') { put('anvil', -sp.w / 2 + 10); put('barrel', sp.w / 2 - 6); }
    else if (n.type === 'potion') { put('pots', -sp.w / 2 + 12); put('pots', sp.w / 2 - 12, 1); }
    else if (n.type === 'storage') { put('barrel', -sp.w / 2 + 4); put('crate', -sp.w / 2 + 16); put('crate', sp.w / 2 - 8); }
    else if (n.type === 'task') put('board', sp.w / 2 + 2);
    else if (n.type === 'tele') put(vk === 'water' ? 'boat' : 'cart', -sp.w / 2 - 6);
    else if (n.type === 'elder') { put('bench', -sp.w / 2 + 18); put('bench', sp.w / 2 - 18); }
    else if (n.type === 'clan') for (const d of [-sp.w / 2 - 4, sp.w / 2 + 4]) { const p = put('banner', d); A.anims.push({ k: 'nobori', x: x + d - p.w / 2 + 4, y: G - p.h + 4, col: '#6a1b9a' }); }
    else if (n.type === 'dungeon') {
      for (const d of [-40, 40]) { put('torch', d); A.anims.push({ k: 'flame', x: x + d, y: G - 28 }); A.lights.push({ x: x + d, y: G - 30, r: 30, col: '#ff8a2a', a: 0.55, f: 0.4 }); }
    }
  }
  // giếng / hàng rào / đèn ở vùng trống hai đầu
  const first = houses.length ? houses[0].n.x - houses[0].sp.w / 2 : m.w / 2;
  const last = houses.length ? houses[houses.length - 1].n.x + houses[houses.length - 1].sp.w / 2 : m.w / 2;
  if (first > 120) { const p = sprProp('well', 0, vk); blit(T, p, first - 30 - p.w / 2, G - p.h + 1); }
  if (m.w - last > 110) {
    const p = sprProp('fence', 0, vk === 'wind' ? 'bamboo' : 'wood');
    blit(T, p, last + 10, G - p.h + 1);
    const lp = sprProp('lanternpost', 0, vk);
    blit(T, lp, last + 56 - lp.w / 2, G - lp.h + 1);
    A.lights.push({ x: last + 56, y: G - 24, r: 28, col: '#ff8a3a', a: 0.5, f: 0.3 });
  }
  // cờ cá chép (làng Phong) / hoa ven đường
  if (vk === 'wind') for (const x of [first - 70, last + 90]) if (x > 90 && x < m.w - 90) { T.r(x, G - 70, 2, 70, '#8a6a4a'); T.r(x, G - 70, 1, 70, '#b08a62'); T.r(x - 2, G - 72, 6, 2, '#ffd54f'); A.anims.push({ k: 'koi', x: x + 2, y: G - 66 }); }
  for (let i = 0; i < m.w / 50; i++) {
    const x = R() * m.w;
    if (m.portals.some((p) => Math.abs(p.x - x) < 40)) continue;
    const fl = sprBush(10 + ((R() * 6) | 0), i % 4, vk === 'fire' ? 'green' : vk === 'water' ? 'lush' : 'willow', vk === 'fire' ? ['#ff8ab0', '#ffffff'] : vk === 'water' ? ['#8ab4ff', '#ffffff'] : ['#ffe066', '#ffffff']);
    blit(T, fl, x - fl.w / 2, G - fl.h + 2);
  }
}

// ======================= Trang trí bản đồ luyện công =======================
function placeDecor(T, m, th, sc, R, A, kind, x) {
  const G = m.ground;
  const t = m.theme;
  const put = (spr, dy = 1) => { blit(T, spr, x - spr.w / 2, G - spr.h + dy, { flip: R() < 0.5 }); return spr; };
  switch (kind) {
    case 'round': return put(sprTree('round', 54 + ((R() * 26) | 0), (R() * 3) | 0, { leaf: t === 'lake' ? 'lush' : 'green' }), 2);
    case 'maple': return put(sprTree('maple', 52 + ((R() * 26) | 0), (R() * 3) | 0), 2);
    case 'willow': return put(sprTree('willow', 60 + ((R() * 16) | 0), (R() * 2) | 0), 2);
    case 'pine': return put(sprTree('pine', 52 + ((R() * 30) | 0), (R() * 3) | 0, { snow: !!th.snowcap, leaf: t === 'mist' ? 'mist' : undefined }), 2);
    case 'bamboo': return put(sprTree('bamboo', 100 + ((R() * 50) | 0), (R() * 3) | 0), 2);
    case 'palm': return put(sprTree('palm', 58 + ((R() * 22) | 0), (R() * 3) | 0), 3);
    case 'deadtree': return put(sprTree('dead', 54 + ((R() * 28) | 0), (R() * 3) | 0, { bark: t === 'dark_forest' ? 'purple' : t === 'hell' ? 'dark' : 'grey', eyes: t === 'dark_forest' && R() < 0.5 }), 2);
    case 'cactus': return put(sprTree('cactus', 22 + ((R() * 14) | 0), (R() * 3) | 0), 2);
    case 'bush': return put(sprBush(18 + ((R() * 12) | 0), (R() * 4) | 0, t === 'mist' ? 'mist' : t === 'dark_forest' ? 'dark' : t === 'bamboo' ? 'lush' : 'green', t === 'grass_fire' || t === 'grass_wind' ? ['#ff6f91', '#ffffff', '#ffd54f'] : null), 2);
    case 'flower': {
      const lf = t === 'dark_forest' ? 'dark' : t === 'mist' ? 'mist' : t === 'bamboo' ? 'lush' : 'green';
      const fl = t === 'dark_forest' ? ['#c070ff', '#60d0ff', '#ffffff'] : t === 'grass_fire' ? ['#ff6a3a', '#ffd54f', '#ffffff'] : ['#ff6f91', '#ffd54f', '#ffffff', '#b388ff'];
      return put(sprBush(12, (R() * 4) | 0, lf, fl), 2);
    }
    case 'grass':
    case 'tallgrass': {
      const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.25)];
      for (let i = 0; i < 14; i++) { const h = 4 + ((R() * (kind === 'tallgrass' ? 10 : 5)) | 0); const gx = x + i * 2 - 14; for (let k = 0; k < h; k++) T.p(gx + Math.round((k / h) * (i % 3 - 1) * 2), G - 1 - k, k > h - 3 ? Gr[0] : i & 1 ? Gr[1] : Gr[2]); }
      return null;
    }
    case 'rock': {
      const pal = t === 'desert' ? ['#f0c890', '#d0a068', '#a87a4a', '#7a5634'] : t === 'cave' ? ['#8a80a8', '#625a80', '#463e60', '#2e2842'] : t === 'lava' || t === 'hell' ? ['#7a4a40', '#5a3430', '#40241f', '#2a1714'] : ['#b8b4ae', '#948f88', '#6e6a65', '#4e4a46'];
      return put(sprRock(16 + ((R() * 12) | 0), 9 + ((R() * 6) | 0), (R() * 5) | 0, pal, { moss: t === 'mist' || t === 'bamboo' || t === 'lake' ? '#6a9a4a' : null, snow: !!th.snowcap }), 2);
    }
    case 'crystal':
    case 'icecrystal': {
      const col = t === 'ice' || t === 'snow' || kind === 'icecrystal' ? '#80e0ff' : R() < 0.5 ? '#b388ff' : '#4fc3f7';
      const spr = put(sprCrystal(14 + ((R() * 14) | 0), col, (R() * 4) | 0), 2);
      A.lights.push({ x, y: G - spr.h / 2, r: 30 + spr.h / 2, col, a: 0.45, f: 0.15, s: 1.2 });
      return spr;
    }
    case 'mushroomglow': {
      const spr = put(sprProp('mushroomglow', 0, t), 1);
      A.lights.push({ x, y: G - 6, r: 22, col: t === 'cave' ? '#60d0ff' : '#c070ff', a: 0.5, f: 0.25, s: 0.8 });
      return spr;
    }
    case 'pumpkin': {
      const spr = put(sprProp('pumpkin', 0, t), 1);
      A.lights.push({ x, y: G - 6, r: 20, col: '#ffa030', a: 0.55, f: 0.35 });
      return spr;
    }
    case 'stonelantern': {
      const spr = put(sprProp('stonelantern', 0, t), 1);
      A.lights.push({ x, y: G - 19, r: 24, col: '#ffc060', a: 0.45, f: 0.2 });
      return spr;
    }
    case 'torch': {
      const spr = put(sprProp('torch', 0, t), 1);
      A.anims.push({ k: 'flame', x, y: G - 28 });
      A.lights.push({ x, y: G - 30, r: 34, col: '#ff8a2a', a: 0.55, f: 0.4 });
      return spr;
    }
    case 'banner': {
      const spr = sprProp('banner', 0, t);
      blit(T, spr, x - 3, G - spr.h + 1);
      A.anims.push({ k: 'flag', x: x, y: G - spr.h + 4, col: ['#c62828', '#1565c0', '#2e7d32', '#f9a825'][(R() * 4) | 0] });
      return spr;
    }
    case 'stalag': return put(sprProp('stalag', (R() * 3) | 0, t), 1);
    case 'pillar': return put(sprProp('pillar', (R() * 3) | 0, t), 2);
    case 'icespike': return put(sprProp('icespike', 0, t), 1);
    default: return put(sprProp(kind, (R() * 3) | 0, t), 1);
  }
}

function buildFieldDecor(T, m, th, sc, R, A) {
  const G = m.ground;
  const list = th.decor || ['round', 'bush', 'rock'];
  const skip = (x) => m.portals.some((p) => Math.abs(p.x - x) < 64) || (m.npcs || []).some((n) => Math.abs(n.x - x) < 26);
  let x = 60 + R() * 40;
  let k = 0;
  while (x < m.w - 50) {
    const kind = R() < 0.25 ? list[(R() * list.length) | 0] : list[k++ % list.length];
    if (!skip(x)) placeDecor(T, m, th, sc, R, A, kind, x);
    const big = ['round', 'maple', 'willow', 'pine', 'bamboo', 'palm', 'deadtree'].includes(kind);
    x += (big ? 70 : 44) + R() * 70;
  }
  for (const p of m.portals) if (p.door) {
    const g = stoneGateSpr(m.theme);
    blit(T, g, p.x - g.w / 2, G - g.h + 1);
    A.lights.push({ x: p.x, y: G - 66, r: 16, col: '#7ad8ff', a: 0.6, f: 0.2 });
  }
  // vật nhỏ rải rác sát mặt đất
  const small = { grass: 'grass', cobble: 'grass', sand: 'shell', snow: 'rock', ice: 'icespike', rock: 'stalag', basalt: 'bones', tiles: null }[sc.ground];
  if (small === 'grass') for (let i = 0; i < m.w / 70; i++) placeDecor(T, m, th, sc, R, A, R() < 0.5 ? 'grass' : 'flower', R() * m.w);
  if (t2(m.theme)) for (let i = 0; i < m.w / 160; i++) { const xx = 80 + R() * (m.w - 160); if (!skip(xx)) placeDecor(T, m, th, sc, R, A, 'bones', xx); }
}
const t2 = (t) => t === 'desert' || t === 'cave';

// Cổng đá cho cửa dịch chuyển ngoài làng
function stoneGateSpr(theme) {
  return cached(`sgate:${theme}`, () => {
    const P = theme === 'desert' ? ['#ffe0a8', '#e2b678', '#b88a54', '#8a6038'] : theme === 'ice' || theme === 'snow' ? ['#f4fcff', '#c4e2f2', '#8ebcd8', '#6090b4'] : theme === 'lava' || theme === 'hell' ? ['#7a5a5a', '#5a4040', '#402c2c', '#2a1c1c'] : ['#cfcac0', '#a8a298', '#80796f', '#5a544c'];
    const W = 72;
    const H = 76;
    const s = new Buf(W, H);
    for (const x0 of [8, W - 20]) {
      for (let y = 14; y < H; y += 7) {
        const off = ((y / 7) & 1) ? 1 : 0;
        s.r(x0 - off, y, 12 + off, 7, P[1]);
        s.r(x0 - off, y, 12 + off, 1, P[0]);
        s.r(x0 - off, y, 2, 7, P[0]);
        s.r(x0 + 10, y, 2, 7, P[2]);
        s.r(x0 - off, y + 6, 12 + off, 1, P[3]);
      }
      s.r(x0 - 3, H - 6, 18, 6, P[2]);
      s.r(x0 - 3, H - 6, 18, 1, P[1]);
    }
    // vòm + đá đỉnh
    for (let x = 4; x < W - 4; x++) {
      const f = (x - W / 2) / (W / 2 - 4);
      const y = 14 - Math.round((1 - f * f) * 6);
      s.r(x, y, 1, 9, P[1]);
      s.p(x, y, P[0]);
      s.p(x, y + 8, P[3]);
    }
    s.r(0, 4, W, 5, P[2]);
    s.r(0, 4, W, 1, P[0]);
    s.r(W / 2 - 7, 2, 14, 14, P[1]);
    s.r(W / 2 - 7, 2, 14, 1, P[0]);
    s.r(W / 2 - 3, 6, 6, 6, '#7ad8ff');
    s.r(W / 2 - 2, 7, 4, 4, '#e8fcff');
    if (theme === 'bamboo' || theme === 'mist' || theme === 'lake') for (let x = 0; x < W; x++) if ((x * 7) % 5 < 2 && s.has(x, 5)) s.p(x, 4, '#6a9a4a');
    if (theme === 'ice' || theme === 'snow') { s.r(0, 3, W, 2, '#ffffff'); for (let x = 2; x < W; x += 5) s.r(x, 9, 1, 2 + (x % 4), '#dff6ff'); }
    return s.outline(0.55);
  });
}

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
function getLayers(theme, sc) {
  let L = LAYER_CACHE.get(theme);
  if (L) return L;
  const seed = seedOf(theme);
  L = sc.layers.map((spec, i) => {
    const R = rng(seed + i * 101);
    const b = new Buf(spec.w || LW, spec.h, true);
    const fn = { mount: bMount, hills: bHills, trees: bTreeRow, mesa: bMesa, dunes: bDunes, karst: bKarst, cave: bCave, ruins: bRuins, stands: bStands, props: bProps, wall: bWall }[spec.t];
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

function vGrad(col, a0, a1, n = 64) {
  return cached(`vg:${col}:${a0}:${a1}`, () => {
    const b = new Buf(1, n);
    for (let y = 0; y < n; y++) b.a(0, y, col, a0 + (a1 - a0) * (y / (n - 1)));
    return b;
  }).canvas;
}
function pillarSpr(col) {
  return cached(`pil:${col}`, () => {
    const b = new Buf(30, 110);
    for (let y = 0; y < 110; y++) for (let x = 0; x < 30; x++) {
      const dx = (x - 14.5) / 11;
      const fy = y / 110;
      const al = Math.exp(-dx * dx * 2.2) * Math.pow(fy, 1.3) * 0.9;
      if (al > 0.02) b.a(x, y, Math.abs(dx) < 0.25 ? '#ffffff' : col, Math.round(al * 6) / 6);
    }
    return b;
  }).canvas;
}
function padSpr(col) {
  return cached(`pad:${col}`, () => {
    const s = new Buf(40, 9);
    s.ell(20, 5, 19, 4, '#5e5a64');
    s.ell(20, 4, 18, 3.4, '#8e8a96');
    s.ell(20, 4, 14, 2.4, '#a8a4b0');
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      s.p(20 + Math.cos(a) * 15.5, 4 + Math.sin(a) * 2.6, k % 2 ? col : '#ffffff');
    }
    s.ell(20, 4, 6, 1.2, col);
    return s.outline(0.5);
  });
}
function signSpr(dir) {
  return cached(`sign:${dir}`, () => {
    const s = new Buf(24, 30);
    s.r(11, 8, 2, 22, '#6d4c41');
    s.r(11, 8, 1, 22, '#8d6e63');
    s.r(2, 4, 20, 10, '#b08a5a');
    s.r(2, 4, 20, 1, '#d8b07a');
    s.r(2, 13, 20, 1, '#7a5a3a');
    const c = '#4e342e';
    if (dir < 0) { s.r(6, 8, 12, 2, c); s.r(7, 7, 1, 4, c); s.r(6, 8, 1, 2, c); s.r(8, 6, 1, 6, c); }
    else { s.r(6, 8, 12, 2, c); s.r(16, 7, 1, 4, c); s.r(15, 6, 1, 6, c); }
    return s.outline(0.5);
  }).canvas;
}
function fogSpr() {
  return cached('fog', () => {
    const b = new Buf(512, 56, true);
    const R = rng(77);
    for (let i = 0; i < 26; i++) {
      const cx = R() * 512;
      const cy = 20 + R() * 20;
      const rx = 30 + R() * 50;
      const ry = 8 + R() * 10;
      for (let y = Math.floor(cy - ry); y < cy + ry; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1) b.a(x, y, '#eef2f6', (1 - d) * 0.22);
      }
    }
    return b;
  }).canvas;
}
function raysSpr() {
  return cached('rays', () => {
    const cv = document.createElement('canvas');
    cv.width = 320;
    cv.height = 260;
    const c = cv.getContext('2d');
    const R = rng(5);
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 80 + R() * 30;
      const w = 14 + R() * 26;
      const g = c.createLinearGradient(0, 0, 0, 260);
      g.addColorStop(0, 'rgba(255,250,220,0.9)');
      g.addColorStop(1, 'rgba(255,250,220,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + w, 0);
      c.lineTo(x + w - 70, 260);
      c.lineTo(x - 70 - w * 0.5, 260);
      c.fill();
    }
    return { canvas: cv };
  }).canvas;
}

export class MapRenderer {
  constructor(map) {
    this.map = map;
    this.th = THEMES[map.theme] || THEMES.grass_fire;
    this.sc = SCENES[map.theme] || SCENES.grass_fire;
    this.seed = seedOf(map.id);
    this.lights = [];
    this.anims = [];
    this.particles = [];
    this.t = 0;
    this._pc = null;
    this.sky = cached(`sky:${map.theme}`, () => ({ canvas: buildSky(this.sc, seedOf(map.theme)) })).canvas;
    this.skyH = this.sky.height;
    this.layers = getLayers(map.theme, this.sc);
    this.terrain = this.buildTerrain();
    for (const l of this.lights) l.r = Math.max(8, Math.round(l.r / 4) * 4);
    const R = rng(this.seed + 17);
    const cl = this.sc.clouds;
    this.clouds = [];
    if (cl) for (let i = 0; i < cl.n; i++) {
      const w = 34 + ((R() * 40) | 0);
      this.clouds.push({ cv: cloudSpr(cl.pal, i % 4, w - (w % 8)).canvas, x: R() * 900, y: cl.y[0] + R() * (cl.y[1] - cl.y[0]), sp: 1.5 + R() * 3, z: 0.03 + R() * 0.05 });
    }
    this.clouds.sort((a, b) => a.z - b.z);
    this.birds = [];
    if (this.sc.birds) for (let i = 0; i < 4; i++) this.birds.push({ x: R() * 800, y: 30 + R() * 60, sp: (this.sc.birds === 'bat' ? 14 : 9) + R() * 8, ph: R() * 6, d: R() < 0.5 ? 1 : -1 });
    this.lightK = this.th.dark ? 1 : this.sc.light && this.sc.light.top && this.map.theme === 'village_fire' ? 0.9 : 0.65;
  }

  buildTerrain() {
    const m = this.map;
    const T = new Buf(m.w, m.h);
    const R = rng(this.seed + 3);
    const A = { lights: this.lights, anims: this.anims };
    if (m.town) buildVillage(T, m, this.th, this.sc, R, A);
    else buildFieldDecor(T, m, this.th, this.sc, R, A);
    buildGround(T, m, this.th, this.sc, R);
    buildCliffs(T, m, this.th, this.sc, R);
    for (const [px, py, pw] of m.platforms) buildPlatform(T, m, this.th, this.sc, R, px, py, pw, A);
    return T.canvas;
  }

  layerBottom(l, camY) {
    return Math.round(this.map.ground - C0 + 4 - l.off - (camY - C0) * l.fy);
  }

  // Bầu trời + 3 lớp parallax + mặt nước (gọi mỗi khung hình)
  drawBackground(ctx, camX, camY, W, H, t) {
    this.t = t;
    const sc = this.sc;
    const G = this.map.ground;
    const gs = G - camY;
    const dy = camY - C0;
    // trời
    const sy = Math.round(gs - this.skyH + 20 - dy * 0.12);
    const st = sc.sky;
    if (sy > 0) { ctx.fillStyle = st[0]; ctx.fillRect(0, 0, W, sy); }
    for (let x = 0; x < W; x += 256) ctx.drawImage(this.sky, x, sy);
    if (sy + this.skyH < H) { ctx.fillStyle = st[st.length - 1]; ctx.fillRect(0, sy + this.skyH, W, H - sy - this.skyH); }
    if (sc.stars) {
      for (let i = 0; i < 12; i++) {
        const x = (hash1(i * 7 + 1) * W) | 0;
        const y = (hash1(i * 13 + 5) * 90 + sy * 0.3) | 0;
        if (Math.sin(t * (1.5 + hash1(i) * 2) + i * 3) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
    }
    if (sc.aurora) {
      const a = auroraCanvas(3);
      ctx.globalAlpha = 0.75 + Math.sin(t * 0.6) * 0.2;
      const ox = (((camX * 0.03 + t * 3) % 512) + 512) % 512;
      for (let x = -ox; x < W; x += 512) ctx.drawImage(a, Math.round(x), Math.round(8 - dy * 0.1));
      ctx.globalAlpha = 1;
    }
    if (sc.sun) {
      const sp = sunSpr(sc.sun).canvas;
      ctx.drawImage(sp, Math.round(W * sc.sun.x - camX * 0.01 - sp.width / 2), Math.round(sc.sun.y - dy * 0.1 - sp.height / 2));
    }
    // mây trôi
    for (const c of this.clouds) {
      const span = W + c.cv.width * 2 + 40;
      const x = ((((c.x + t * c.sp - camX * c.z) % span) + span) % span) - c.cv.width - 20;
      ctx.drawImage(c.cv, Math.round(x), Math.round(c.y - dy * (0.1 + c.z)));
    }
    const L = this.layers;
    const wt = sc.water;
    const lastRefl = wt ? Math.max(...wt.refl) : -1;
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      const by = this.layerBottom(l, camY);
      const ox = (((Math.round(camX * l.fx) % l.w) + l.w) % l.w);
      for (let x = -ox; x < W; x += l.w) ctx.drawImage(l.cv, x, by - l.h);
      if (by < gs && l.fill) { ctx.fillStyle = l.fill; ctx.fillRect(0, by, W, gs - by + 1); }
      if (i === 0) this.drawBirds(ctx, camX, dy, W, t);
      if (i === lastRefl) this.drawWater(ctx, camX, camY, W, t, by, gs);
      if (i === 1 && sc.fog) this.drawFog(ctx, camX, dy, W, t, by - 30, 0.8);
    }
    if (L.ceil) {
      const c = L.ceil;
      const cy = Math.round(-16 - dy * c.fy);
      if (cy > 0) { ctx.fillStyle = c.fill; ctx.fillRect(0, 0, W, cy); }
      const ox = (((Math.round(camX * c.fx) % c.w) + c.w) % c.w);
      for (let x = -ox; x < W; x += c.w) ctx.drawImage(c.cv, x, cy);
    }
  }

  drawBirds(ctx, camX, dy, W, t) {
    const bat = this.sc.birds === 'bat';
    ctx.fillStyle = bat ? '#120a18' : 'rgba(60,50,70,0.75)';
    for (const b of this.birds) {
      const span = W + 120;
      const x = Math.round(((((b.x + t * b.sp * b.d - camX * 0.12) % span) + span) % span) - 60);
      const y = Math.round(b.y - dy * 0.15 + Math.sin(t * 0.8 + b.ph) * 6);
      const up = Math.sin(t * (bat ? 18 : 9) + b.ph) > 0;
      ctx.fillRect(x, y, 1, 1);
      if (up) { ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x + 1, y - 1, 2, 1); if (bat) { ctx.fillRect(x - 3, y - 2, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1); } }
      else { ctx.fillRect(x - 2, y + 1, 2, 1); ctx.fillRect(x + 1, y + 1, 2, 1); }
    }
  }

  drawWater(ctx, camX, camY, W, t, hy, gs) {
    const wt = this.sc.water;
    if (gs <= hy) return;
    const h = gs - hy;
    ctx.fillStyle = wt.col;
    ctx.fillRect(0, hy, W, h + 1);
    ctx.fillStyle = wt.deep;
    ctx.fillRect(0, hy + Math.round(h * 0.55), W, h);
    for (const i of wt.refl) {
      const l = this.layers[i];
      const ox = (((Math.round(camX * l.fx) % l.w) + l.w) % l.w);
      const rh = Math.min(h, l.refl.height);
      if (rh > 0) for (let x = -ox; x < W; x += l.w) ctx.drawImage(l.refl, 0, 0, l.w, rh, x, hy, l.w, rh);
    }
    ctx.fillStyle = wt.top;
    ctx.fillRect(0, hy, W, 1);
    // gợn sóng lấp lánh
    for (let k = 0; k < 46; k++) {
      const f = Math.pow(hash1(k * 3 + 1), 1.3);
      const yy = Math.round(hy + 2 + f * (h - 3));
      const len = 2 + Math.round(f * 7);
      const sp = 3 + hash1(k) * 6;
      const span = W + 30;
      const x = ((((hash1(k * 5 + 2) * 900 + t * sp - camX * (0.15 + f * 0.6)) % span) + span) % span) - 15;
      const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 2 + k));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.fillRect(Math.round(x), yy, len, 1);
    }
    if (wt.foam) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let x = 0; x < W; x += 2) {
        const yy = gs - 3 + Math.round(Math.sin((x + camX) * 0.08 + t * 2) * 1.2 + Math.sin(t * 1.3) * 1);
        ctx.fillRect(x, yy, 2, 1);
      }
    }
  }

  drawFog(ctx, camX, dy, W, t, y, a) {
    const f = fogSpr();
    ctx.globalAlpha = a;
    const ox = ((((camX * 0.35 + t * 4) % 512) + 512) % 512);
    for (let x = -ox; x < W; x += 512) ctx.drawImage(f, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  drawTerrain(ctx, camX, camY, W, H) {
    const t = this.t;
    const ix = Math.floor(camX);
    const iy = Math.floor(camY);
    const sx = Math.max(0, ix);
    const sy = Math.max(0, iy);
    const sw = Math.min(this.terrain.width - sx, W + 1);
    const sh = Math.min(this.terrain.height - sy, H + 1);
    if (sw > 0 && sh > 0) ctx.drawImage(this.terrain, sx, sy, sw, sh, sx - ix, sy - iy, sw, sh);
    const below = this.map.h - camY;
    if (below < H) {
      ctx.fillStyle = shd(this.th.dirt, -0.45);
      ctx.fillRect(0, Math.floor(below), W, H - below + 1);
    }
    // vật động: khói, lửa đuốc, cờ
    for (const a of this.anims) {
      const x = a.x - camX;
      const y = a.y - camY;
      if (x < -40 || x > W + 40 || y < -80 || y > H + 20) continue;
      this.drawAnim(ctx, a, Math.round(x), Math.round(y), t);
    }
    if (this.th.lava) this.drawLava(ctx, camX, camY, W, H, t);
    // quầng sáng (cộng màu)
    ctx.globalCompositeOperation = 'lighter';
    const K = this.lightK;
    for (const l of this.lights) {
      const x = l.x - camX;
      const y = l.y - camY;
      if (x < -l.r || x > W + l.r || y < -l.r || y > H + l.r) continue;
      const fl = 1 + (l.f || 0) * (Math.sin(t * 7.3 * (l.s || 1) + l.x) * 0.6 + Math.sin(t * 13.7 + l.x * 0.7) * 0.4);
      ctx.globalAlpha = clamp(l.a * fl * K, 0, 1);
      ctx.drawImage(glow(l.col, l.r), Math.round(x - l.r), Math.round(y - l.r));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawAnim(ctx, a, x, y, t) {
    const ph = a.x * 0.37;
    if (a.k === 'flame') {
      const h = 6 + Math.round(Math.sin(t * 13 + ph) * 1.5 + Math.sin(t * 7 + ph) * 1);
      const sw = Math.round(Math.sin(t * 9 + ph));
      ctx.fillStyle = '#e8401a';
      ctx.fillRect(x - 2, y - 2, 5, 3);
      ctx.fillRect(x - 1 + sw, y - h, 3, h - 1);
      ctx.fillStyle = '#ff9a2a';
      ctx.fillRect(x - 1, y - 3, 3, 3);
      ctx.fillRect(x + sw, y - h + 2, 2, h - 4);
      ctx.fillStyle = '#fff2a0';
      ctx.fillRect(x, y - 3, 1, 2);
      ctx.fillRect(x + sw, y - h + 1, 1, 1);
    } else if (a.k === 'smoke') {
      for (let k = 0; k < 6; k++) {
        const age = (t * 0.45 + k / 6) % 1;
        const px = x + Math.sin(age * 5 + k) * 2 + age * 12;
        const py = y - age * 34;
        const s = 2 + Math.round(age * 6);
        ctx.fillStyle = `rgba(${200 - age * 40 | 0},${196 - age * 40 | 0},${204 - age * 30 | 0},${((1 - age) * 0.55).toFixed(2)})`;
        ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
        ctx.fillRect(Math.round(px - s / 2 - 1), Math.round(py - s / 2 + 1), s + 2, s - 2);
      }
    } else if (a.k === 'flag' || a.k === 'nobori') {
      const fw = a.k === 'flag' ? 14 : 8;
      const fh = a.k === 'flag' ? 20 : 38;
      const C = ramp(a.col);
      for (let i = 0; i < fw; i++) {
        const o = Math.sin(t * 4 - i * 0.55 + ph) * (i / fw) * 2.2;
        const d = Math.cos(t * 4 - i * 0.55 + ph);
        ctx.fillStyle = d > 0.4 ? C[0] : d < -0.4 ? C[2] : C[1];
        ctx.fillRect(x + 1 + i, Math.round(y + o), 1, fh - (a.k === 'flag' && i > fw - 4 ? (i - fw + 4) * 2 : 0));
        if (i > 3 && i < fw - 4) { ctx.fillStyle = '#ffd54f'; ctx.fillRect(x + 1 + i, Math.round(y + o + (a.k === 'flag' ? 7 : 4)), 1, a.k === 'flag' ? 5 : 3); }
      }
      if (a.k === 'nobori') { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4, Math.round(y + 12 + k * 6 + Math.sin(t * 4 - 2.2 + ph) * 1.1), 2, 3); }
    } else if (a.k === 'koi') {
      const fish = [['#2a2a3a', '#4a4a6a', 24], ['#e0352b', '#ff8a7a', 20], ['#2e6ad8', '#8ab4ff', 16]];
      fish.forEach(([c1, c2, len], j) => {
        const fy = y + 2 + j * 11;
        for (let i = 0; i < len; i++) {
          const o = Math.round(Math.sin(t * 5 - i * 0.35 + j) * (i / len) * 3);
          const thk = i < 3 ? 6 : i > len - 4 ? 3 + (len - i) % 2 : 5;
          ctx.fillStyle = (i % 4 < 2) ? c1 : c2;
          ctx.fillRect(x + i, fy + o - (thk >> 1), 1, thk);
          if (i === 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + i, fy + o - 1, 1, 1); }
        }
      });
    }
  }

  drawLava(ctx, camX, camY, W, H, t) {
    const top = this.map.h - 12 - camY;
    if (top > H + 4) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.1;
    ctx.drawImage(vGrad('#ff5a10', 0, 0.55), 0, Math.round(top - 34), W, 36);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (let x = 0; x < W; x += 2) {
      const wx = x + camX;
      const y = Math.round(top + Math.sin(wx * 0.08 + t * 2) * 1.5 + Math.sin(wx * 0.21 - t * 3) * 1);
      ctx.fillStyle = '#d8401a';
      ctx.fillRect(x, y + 3, 2, H - y);
      ctx.fillStyle = '#ff8a2a';
      ctx.fillRect(x, y + 1, 2, 3);
      ctx.fillStyle = (Math.floor(wx / 2 + t * 6) % 9) < 3 ? '#fff0a0' : '#ffc04a';
      ctx.fillRect(x, y, 2, 1);
    }
    // bọt sủi
    for (let k = 0; k < 8; k++) {
      const age = (t * 0.7 + hash1(k) * 3) % 1;
      const bx = Math.round(((hash1(k * 11) * 1600 - camX) % (W + 20) + W + 20) % (W + 20) - 10);
      const by = Math.round(top - age * 2);
      if (age < 0.8) {
        const r = 1 + Math.round(age * 2);
        ctx.fillStyle = '#ff9a2a';
        ctx.fillRect(bx - r, by - r, r * 2, r);
        ctx.fillStyle = '#ffe08a';
        ctx.fillRect(bx - r + 1, by - r, 1, 1);
      } else {
        const k = Math.round((age - 0.8) * 25);
        ctx.fillStyle = '#ffd060';
        ctx.fillRect(bx - 2 - k, by - 2 - k, 1, 1);
        ctx.fillRect(bx + 2 + k, by - 3 - k, 1, 1);
        ctx.fillRect(bx, by - 4 - k, 1, 1);
      }
    }
  }

  drawPortals(ctx, camX, camY, t) {
    const G = this.map.ground;
    const col = this.sc.portal || '#ffe08a';
    for (const p of this.map.portals) {
      const x = Math.round(p.x - camX);
      const y = Math.round(G - camY);
      if (x < -80 || x > 2000) continue;
      if (p.door) {
        const cy = this.map.town ? y - 30 : y - 34;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.15;
        ctx.drawImage(glow(col, 28), x - 28, cy - 28);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // vòng xoáy năng lượng
        for (let arm = 0; arm < 3; arm++) {
          for (let i = 0; i < 22; i++) {
            const f = i / 22;
            const ang = -t * 3.2 + arm * 2.094 + f * 5.2;
            const px = Math.round(x + Math.cos(ang) * 17 * f);
            const py = Math.round(cy + Math.sin(ang) * 25 * f);
            ctx.fillStyle = f < 0.35 ? '#ffffff' : f < 0.7 ? mix('#ffffff', col, 0.4) : col;
            ctx.fillRect(px, py, f > 0.5 ? 2 : 1, f > 0.5 ? 2 : 1);
          }
        }
        ctx.fillStyle = rgba(col, 0.9);
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * TAU + t * 1.5;
          ctx.fillRect(Math.round(x + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 26), 1, 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, cy - 1, 2, 2);
        for (let k = 0; k < 6; k++) {
          const age = (t * 0.8 + k / 6) % 1;
          ctx.fillStyle = rgba(k & 1 ? '#ffffff' : col, (1 - age).toFixed(2));
          ctx.fillRect(Math.round(x - 14 + hash1(k) * 28), Math.round(y - 4 - age * 56), 1, 2);
        }
      } else {
        ctx.drawImage(padSpr(col).canvas, x - 20, y - 6);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75 + Math.sin(t * 2.5) * 0.15;
        ctx.drawImage(pillarSpr(col), x - 15, y - 108);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow(col, 24), x - 24, y - 20);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // hai dải xoắn ốc năng lượng
        for (let s2 = 0; s2 < 2; s2++) for (let k = 0; k < 26; k++) {
          const a = t * 3 + k * 0.45 + s2 * Math.PI;
          const hgt = k * 3.4;
          const front = Math.sin(a) > 0;
          const fade = 1 - k / 26;
          ctx.fillStyle = front ? rgba(k < 6 ? '#ffffff' : col, (0.95 * fade + 0.05).toFixed(2)) : rgba(col, (0.35 * fade).toFixed(2));
          ctx.fillRect(Math.round(x + Math.cos(a) * (9 - k * 0.12)), Math.round(y - 4 - hgt), front ? 2 : 1, front ? 2 : 1);
        }
        // hạt sáng bay lên
        for (let k = 0; k < 9; k++) {
          const age = ((t * 0.55 + hash1(k * 3) ) % 1);
          const px = x + Math.sin(k * 2.3 + t * 2) * 7 * (1 - age * 0.5);
          ctx.fillStyle = rgba(k % 3 ? col : '#ffffff', (1 - age).toFixed(2));
          ctx.fillRect(Math.round(px), Math.round(y - 4 - age * 80), 1, k % 3 ? 2 : 1);
        }
        const dir = p.x < this.map.w / 2 ? -1 : 1;
        ctx.drawImage(signSpr(dir), x - dir * 30 - 12, y - 29);
      }
    }
  }

  // Hạt bay theo chủ đề (lá, tuyết, tàn lửa...)
  drawParticles(ctx, camX, camY, W, H, dt) {
    const kind = this.th.part;
    if (!kind) return;
    const ps = this.particles;
    const want = kind === 'mist' ? 10 : kind === 'firefly' ? 26 : kind === 'sparkle' ? 18 : kind === 'sand' ? 30 : 46;
    while (ps.length < want) ps.push({ x: Math.random() * W, y: Math.random() * H, v: Math.random(), s: Math.random(), z: 0.5 + Math.random() * 0.7 });
    // dịch theo camera để có chiều sâu
    if (this._pc) {
      const dx = camX - this._pc[0];
      const dy = camY - this._pc[1];
      if (Math.abs(dx) < 60 && Math.abs(dy) < 60) for (const p of ps) { p.x -= dx * p.z; p.y -= dy * p.z; }
    }
    this._pc = [camX, camY];
    const now = performance.now() / 1000;
    for (const p of ps) {
      if (kind === 'snow') { p.y += (10 + p.v * 14) * p.z * dt; p.x += Math.sin(p.y * 0.05 + p.s * 6) * 8 * dt - 3 * dt; }
      else if (kind === 'ember') { p.y -= (10 + p.v * 22) * dt; p.x += Math.sin(p.y * 0.07 + p.s * 5) * 10 * dt; }
      else if (kind === 'petal' || kind === 'leaf' || kind === 'maple') { p.y += (9 + p.v * 10) * dt; p.x -= (8 + p.v * 14) * dt + Math.sin(now * 2 + p.s * 9) * 6 * dt; }
      else if (kind === 'firefly') { p.x += Math.sin(now * 0.7 + p.s * 50) * 9 * dt; p.y += Math.cos(now * 0.6 + p.v * 50) * 7 * dt; }
      else if (kind === 'dust') { p.y += 3 * dt; p.x += Math.sin(now + p.s * 9) * 2 * dt; }
      else if (kind === 'mist') { p.x += (4 + p.v * 6) * dt; const gs = this.map.ground - camY; if (p.y > gs - 6 || p.y < gs - 90) p.y = gs - 8 - p.v * 80; }
      else if (kind === 'sand') { p.x += (60 + p.v * 60) * dt; p.y += Math.sin(now * 3 + p.s * 9) * 4 * dt; }
      else if (kind === 'sparkle') { p.y -= (2 + p.v * 4) * dt; p.x += Math.sin(now * 0.8 + p.s * 20) * 4 * dt; }
      if (p.y > H + 6) { p.y = -4; p.x = Math.random() * W; }
      if (p.y < -6) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -60) p.x = W + 4;
      if (p.x > W + 60) p.x = -4;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const spin = Math.sin(now * (3 + p.v * 4) + p.s * 20);
      switch (kind) {
        case 'snow':
          ctx.fillStyle = p.z > 0.95 ? '#ffffff' : 'rgba(255,255,255,0.7)';
          if (p.z > 1.0) { ctx.fillRect(x, y, 2, 2); ctx.fillStyle = 'rgba(190,220,255,0.8)'; ctx.fillRect(x, y + 2, 2, 1); }
          else ctx.fillRect(x, y, 1, 1);
          break;
        case 'ember': {
          const hot = Math.sin(now * 9 + p.s * 30) > 0;
          ctx.fillStyle = 'rgba(255,120,30,0.35)';
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.fillStyle = hot ? '#ffe08a' : p.v > 0.5 ? '#ffab40' : '#ff6d00';
          ctx.fillRect(x, y, 1, p.z > 1 ? 2 : 1);
          break;
        }
        case 'petal':
        case 'maple':
        case 'leaf': {
          const c = kind === 'petal' ? ['#ffd6e6', '#f48fb1'] : kind === 'maple' ? (p.s > 0.5 ? ['#ffb04a', '#e8602a'] : ['#ff7a4a', '#c8401e']) : ['#b4e070', '#6aa83a'];
          ctx.fillStyle = c[1];
          if (spin > 0.3) ctx.fillRect(x, y, 2, 1);
          else if (spin < -0.3) ctx.fillRect(x, y, 1, 2);
          else ctx.fillRect(x, y, 2, 2);
          ctx.fillStyle = c[0];
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'firefly': {
          const on = Math.sin(now * 2 + p.s * 40);
          if (on > -0.2) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, on + 0.4) * 0.6;
            ctx.drawImage(glow('#d8ff6a', 8), x - 8, y - 8);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#f4ffb0';
            ctx.fillRect(x, y, 1, 1);
          }
          break;
        }
        case 'dust':
          ctx.fillStyle = 'rgba(200,190,240,0.45)';
          ctx.fillRect(x, y, 1, 1);
          break;
        case 'mist':
          ctx.globalAlpha = 0.22 + p.v * 0.15;
          ctx.drawImage(glow('#eef2f6', 32), x - 60, y - 16, 120, 32);
          ctx.globalAlpha = 1;
          break;
        case 'sand':
          ctx.fillStyle = 'rgba(240,210,150,0.55)';
          ctx.fillRect(x, y, 2 + ((p.v * 4) | 0), 1);
          break;
        case 'sparkle': {
          const a = Math.max(0, Math.sin(now * 1.5 + p.s * 30));
          ctx.fillStyle = `rgba(255,255,240,${(a * 0.9).toFixed(2)})`;
          ctx.fillRect(x, y, 1, 1);
          if (a > 0.8) { ctx.fillStyle = `rgba(255,255,240,${(a * 0.4).toFixed(2)})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          break;
        }
        default:
      }
    }
  }

  // Lớp phủ không khí: tia nắng, sương, ám màu, bóng tối quanh nguồn sáng, viền tối
  drawForeground(ctx, camX, camY, W, H, t) {
    const L = this.sc.light || {};
    const dy = camY - C0;
    if (L.rays) {
      const rc = raysSpr();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = L.rays * (0.75 + Math.sin(t * 0.4) * 0.25);
      const ox = ((((camX * 0.25) % 320) + 320) % 320);
      for (let x = -ox; x < W; x += 320) ctx.drawImage(rc, Math.round(x), Math.round(-20 - dy * 0.3), 320, H + 40);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.sc.fog) this.drawFog(ctx, camX * 2.2, dy, W, t * 1.6, this.map.ground - camY - 40, 0.55);
    if (L.top) ctx.drawImage(vGrad(L.top[0], L.top[1], 0), 0, 0, W, Math.round(H * 0.65));
    if (L.bot) ctx.drawImage(vGrad(L.bot[0], 0, L.bot[1]), 0, Math.round(H * 0.4), W, Math.ceil(H * 0.6));
    if (L.dark) {
      if (!this.mask || this.mask.width !== W || this.mask.height !== H) {
        this.mask = document.createElement('canvas');
        this.mask.width = W;
        this.mask.height = H;
      }
      const m = this.mask.getContext('2d');
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, W, H);
      m.fillStyle = rgba(L.darkCol || '#000000', L.dark);
      m.fillRect(0, 0, W, H);
      m.globalCompositeOperation = 'destination-out';
      m.globalAlpha = 0.85;
      m.drawImage(hole(96), Math.round(W / 2 - 96), Math.round(H * 0.62 - 96));
      for (const l of this.lights) {
        const x = l.x - camX;
        const y = l.y - camY;
        const r = l.r * 2;
        if (x < -r || x > W + r || y < -r || y > H + r) continue;
        m.globalAlpha = Math.min(1, l.a * 1.6);
        m.drawImage(hole(r), Math.round(x - r), Math.round(y - r));
      }
      if (this.th.lava) { m.globalAlpha = 0.7; m.drawImage(vGrad('#ffffff', 0, 1), 0, Math.round(this.map.h - camY - 40), W, 40); }
      m.globalAlpha = 1;
      m.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.mask, 0, 0);
    }
    if (L.vig) {
      if (!this.vig || this.vig.width !== W || this.vig.height !== H) {
        const v = document.createElement('canvas');
        v.width = W;
        v.height = H;
        const c = v.getContext('2d');
        const g = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(10,4,20,0)');
        g.addColorStop(1, 'rgba(10,4,20,1)');
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        this.vig = v;
      }
      ctx.globalAlpha = L.vig;
      ctx.drawImage(this.vig, 0, 0);
      ctx.globalAlpha = 1;
    }
  }
}

export { THEMES };
