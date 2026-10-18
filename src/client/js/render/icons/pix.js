// Nền vẽ icon: lưới điểm ảnh Pix (tô, viền, quầng), màu và bảng màu theo bậc trang bị.
import { shade } from '../sprites.js';

export const OUT = '#1d1424';
export const TAU = Math.PI * 2;
export const RARITY_COL = ['', '#5ab4ff', '#ffd23c', '#c77dff', '#ff8a3c'];

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const rgbCache = new Map();
export function rgb(col) {
  let v = rgbCache.get(col);
  if (v) return v;
  if (col[0] === '#') {
    let s = col.slice(1);
    if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
    const n = parseInt(s, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const m = col.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    v = m.slice(0, 3).map(Number);
  }
  rgbCache.set(col, v);
  return v;
}

// ================= BỘ ĐỆM ĐIỂM ẢNH =================
export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, col, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
    const [r, g, b] = rgb(col);
    const i = (y * this.w + x) * 4;
    const d = this.d;
    if (a >= 1 || d[i + 3] === 0) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.round(Math.min(1, a) * 255);
    } else {
      d[i] = d[i] + (r - d[i]) * a;
      d[i + 1] = d[i + 1] + (g - d[i + 1]) * a;
      d[i + 2] = d[i + 2] + (b - d[i + 2]) * a;
      d[i + 3] = Math.max(d[i + 3], a * 255);
    }
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }

  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
  }

  map(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c) this.set(ox + x, oy + y, c);
      }
    });
  }

  line(x0, y0, x1, y1, col, w = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (w <= 1) this.set(x, y, col);
      else this.rect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w, col);
    }
  }

  // tô theo hàm (x,y) => màu|null, trong hộp
  fill(x0, y0, x1, y1, fn) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const c = fn(x + 0.5, y + 0.5, x, y);
        if (c) this.set(x, y, c);
      }
    }
  }

  disc(cx, cy, r, col) {
    this.fill(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? col : null));
  }

  // viền tối quanh các điểm có màu (4 hướng)
  outline(col = OUT, diag = false) {
    const { w, h } = this;
    const src = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) src[i] = this.d[i * 4 + 3] > 40 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        const n = (x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x]);
        const dg = diag && ((x > 0 && y > 0 && src[(y - 1) * w + x - 1]) || (x < w - 1 && y > 0 && src[(y - 1) * w + x + 1]) || (x > 0 && y < h - 1 && src[(y + 1) * w + x - 1]) || (x < w - 1 && y < h - 1 && src[(y + 1) * w + x + 1]));
        if (n || dg) this.set(x, y, col);
      }
    }
  }

  // quầng sáng mềm quanh hình (cho độ hiếm)
  halo(col, a = 0.6, reach = 2) {
    const { w, h } = this;
    const src = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) src[i] = this.d[i * 4 + 3] > 40 ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        let best = 9;
        for (let dy = -reach; dy <= reach; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h || !src[yy * w + xx]) continue;
            best = Math.min(best, Math.abs(dx) + Math.abs(dy));
          }
        }
        if (best <= reach) this.set(x, y, col, a * (best === 1 ? 1 : 0.45));
      }
    }
  }

  // vẽ đè lớp khác lên
  over(o, ox = 0, oy = 0) {
    for (let y = 0; y < o.h; y++) {
      for (let x = 0; x < o.w; x++) {
        const i = (y * o.w + x) * 4;
        const a = o.d[i + 3];
        if (!a) continue;
        const X = x + ox;
        const Y = y + oy;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
        const j = (Y * this.w + X) * 4;
        const fa = a / 255;
        const d = this.d;
        d[j] = d[j] + (o.d[i] - d[j]) * fa;
        d[j + 1] = d[j + 1] + (o.d[i + 1] - d[j + 1]) * fa;
        d[j + 2] = d[j + 2] + (o.d[i + 2] - d[j + 2]) * fa;
        d[j + 3] = Math.max(d[j + 3], a);
      }
    }
  }

  canvas() {
    const c = mkCanvas(this.w, this.h);
    const g = c.getContext('2d');
    const img = g.createImageData(this.w, this.h);
    img.data.set(this.d);
    g.putImageData(img, 0, 0);
    return c;
  }
}

// bảng màu cố định
export const FIX = {
  o: OUT, w: '#ffffff', h: '#4e342e', j: '#8d6e63', k: '#c8a27a', g: '#9a6a12', G: '#f2c230', Y: '#fff3a0',
  r: '#8e1b1b', R: '#e53935', q: '#ff8a80', s: '#455a64', S: '#90a4ae', T: '#eceff1', p: '#b89a6a', P: '#f6ecd2',
  n: '#ddc89a', b: '#1d2c4d', B: '#34507f', c: '#5c7cb0', e: '#2e7d32', E: '#66bb6a', u: '#5f8aa3', v: '#9fc9de',
  V: '#e3f6ff', x: '#3e2723', z: '#ffcc80', K: '#2b1d16',
};

export function tierPal(col) {
  return Object.assign({}, FIX, { 1: shade(col, -0.58), 2: shade(col, -0.32), 3: col, 4: shade(col, 0.32), 5: shade(col, 0.65) });
}
