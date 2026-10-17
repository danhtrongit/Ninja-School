// Icon vật phẩm, kỹ năng và giao diện (pixel art vẽ bằng code, cache theo khóa)
import { shade } from './sprites.js';

const OUT = '#1d1424';
const TAU = Math.PI * 2;
const RARITY_COL = ['', '#5ab4ff', '#ffd23c', '#c77dff', '#ff8a3c'];

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const rgbCache = new Map();
function rgb(col) {
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

function lum(col) {
  const [r, g, b] = rgb(col);
  return (r * 0.3 + g * 0.59 + b * 0.11) / 255;
}

// ================= BỘ ĐỆM ĐIỂM ẢNH =================
class Pix {
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
const FIX = {
  o: OUT, w: '#ffffff', h: '#4e342e', j: '#8d6e63', k: '#c8a27a', g: '#9a6a12', G: '#f2c230', Y: '#fff3a0',
  r: '#8e1b1b', R: '#e53935', q: '#ff8a80', s: '#455a64', S: '#90a4ae', T: '#eceff1', p: '#b89a6a', P: '#f6ecd2',
  n: '#ddc89a', b: '#1d2c4d', B: '#34507f', c: '#5c7cb0', e: '#2e7d32', E: '#66bb6a', u: '#5f8aa3', v: '#9fc9de',
  V: '#e3f6ff', x: '#3e2723', z: '#ffcc80', K: '#2b1d16',
};

function tierPal(col) {
  return Object.assign({}, FIX, { 1: shade(col, -0.58), 2: shade(col, -0.32), 3: col, 4: shade(col, 0.32), 5: shade(col, 0.65) });
}

// ================= ICON VẬT PHẨM (16x16) =================
const ITEM_MAPS = {
  sword: [
    '................',
    '.............54.',
    '............542.',
    '...........542..',
    '..........542...',
    '.........542....',
    '........542.....',
    '...gG..542......',
    '....gGY42.......',
    '.....gGG........',
    '....hkgGG.......',
    '...hkh..gG......',
    '..hkh...........',
    '.gkh............',
    '.gg.............',
    '................',
  ],
  blade: [
    '................',
    '............45..',
    '...........5432.',
    '..........54332.',
    '.........54332..',
    '........54322...',
    '.......5432.....',
    '......5432......',
    '....gGY42.......',
    '....gGGg........',
    '...rRgg.........',
    '..rRr...........',
    '.rRr............',
    '.gYg............',
    '..g.............',
    '................',
  ],
  kunai: [
    '................',
    '.............5..',
    '............543.',
    '...........5432.',
    '..........54432.',
    '..........5432..',
    '.........532....',
    '........ss2.....',
    '.......hkh......',
    '......hkh.......',
    '.....hkh........',
    '....SSS.........',
    '...S...S........',
    '...S...S........',
    '....SSS.........',
    '................',
  ],
  bow: [
    '................',
    '......45T.......',
    '.....43.T.......',
    '....43..T.......',
    '...43...T.......',
    '...4....T.......',
    '..43....T...S...',
    '.whj....T...ST..',
    '.wkkkkkkkkkkSTT.',
    '.whj....T...ST..',
    '..32....T...S...',
    '...3....T.......',
    '...32...T.......',
    '....32..T.......',
    '.....32.T.......',
    '......32T.......',
  ],
  armor: [
    '................',
    '....354..453....',
    '..3345wbbw5433..',
    '.334444ww444433.',
    '.3344444w444433.',
    '.2234444w444322.',
    '.11.3444w4443.11',
    '....3444w4443...',
    '....3444w4443...',
    '...bBBBBGBBBBb..',
    '....3444w4443...',
    '....3444w4443...',
    '....3344w4433...',
    '....2222.2222...',
    '................',
    '................',
  ],
  gloves: [
    '................',
    '.....4545.......',
    '....454545......',
    '....4545453.....',
    '....4444443.....',
    '.33.4444443.....',
    '.3443444443.....',
    '.3444444432.....',
    '..344444432.....',
    '...3444432......',
    '...rRRRRRr......',
    '...2SSTSS2......',
    '...3444443......',
    '...2222222......',
    '................',
    '................',
  ],
  pants: [
    '................',
    '...1111111111...',
    '...2GG2222222...',
    '...3444444443...',
    '...3444434443...',
    '...3444323443...',
    '...344432.3443..',
    '..3444432.34443.',
    '..344443..34443.',
    '..344443..34443.',
    '..234442..24432.',
    '..rRRRr...rRRRr.',
    '..2333....23332.',
    '..1111....11111.',
    '................',
    '................',
  ],
  shoes: [
    '................',
    '................',
    '....rRRRr.......',
    '....3455........',
    '....3445........',
    '....3445........',
    '....34452.......',
    '....3444532.....',
    '...344444542....',
    '..34444444442...',
    '..344444444442..',
    '..2333333333332.',
    '..KhhhhhhhhhhhK.',
    '................',
    '................',
    '................',
  ],
  scroll: [
    '................',
    '.jkhhhhhhhhhhkj.',
    '.hjjjjjjjjjjjjh.',
    '..3PPPPPPPPPP3..',
    '..3PxxxPPPRRP3..',
    '..3PPPPPPPRRP3..',
    '..3PxxxxPPPPP3..',
    '..3PPPPPPPPPP3..',
    '..3PxxxPPxxPP3..',
    '..3PPPPPPPPPP3..',
    '..3PxxxxxPPPP3..',
    '..3nnnnnnnnnn3..',
    '.hjjjjjjjjjjjjh.',
    '.jkhhhhhhhhhhkj.',
    '................',
    '................',
  ],
  book: [
    '................',
    '...1222222222...',
    '..13444444444P..',
    '..134G4444G44P..',
    '..1344444444 3P.',
    '..1344YGGY444P..',
    '..134GG55GG44P..',
    '..134G5ww5G44P..',
    '..134GG55GG44P..',
    '..1344YGGY444P..',
    '..1344444444 3P.',
    '..134G4444G44P..',
    '..13333333333P..',
    '...1PPPPPPPPPn..',
    '................',
    '................',
  ],
  charm: [
    '................',
    '....3333333.....',
    '....3555553.....',
    '....35RRR53.....',
    '....3R555R3.....',
    '....35RRR53.....',
    '....3555553.....',
    '....355R553.....',
    '....3RRRRR3.....',
    '....355R553.....',
    '....35R5R53.....',
    '....3R555R3.....',
    '....3555553.....',
    '....2222222.....',
    '................',
    '................',
  ],
  chest: [
    '................',
    '................',
    '...xhhhhhhhhx...',
    '..xhjjjjjjjjhx..',
    '..h3jjjjjjjj3h..',
    '.xh3kkkkkkkk3hx.',
    '.x5333333333354.',
    '.xhjjj3GG3jjjhx.',
    '.xhjjj3gg3jjjhx.',
    '.xhkkk3GG3kkkhx.',
    '.xhjjjj33jjjjhx.',
    '.x3jjjjjjjjjj3x.',
    '.x2hhhhhhhhhh2x.',
    '..xxxxxxxxxxxx..',
    '................',
    '................',
  ],
  card: [
    '................',
    '...3333333333...',
    '...3PPPPPPPP3...',
    '...3P5PPPP5P3...',
    '...3PPPPPPPP3...',
    '...3PP33.33P3...',
    '...3P3553553P3..',
    '...3P3555553P...',
    '...3PP35553PP...',
    '...3PPP353PPP...',
    '...3PPPP3PPPP...',
    '...3PPPPPPPPP...',
    '...3P5PPPP5P3...',
    '...3333333333...',
    '................',
    '................',
  ],
  material: [
    '................',
    '................',
    '.........5......',
    '.......4545.....',
    '......445543....',
    '....5.444533....',
    '...454433332....',
    '..44544433322...',
    '..4544433322....',
    '.344443333222...',
    '.3443333322 2....',
    '..2333222211....',
    '...22211111.....',
    '................',
    '................',
    '................',
  ],
};

function drawHat(P, col) {
  const pal = tierPal(col);
  // nón lá: hình nón, sọc nan, quai đỏ
  P.fill(0, 0, 15, 15, (x, y) => {
    const dy = y - 2;
    if (dy < 0 || y > 10.5) return null;
    const hw = 0.6 + dy * 0.82;
    const dx = x - 8;
    if (Math.abs(dx) > hw) return null;
    const u = (dx / hw + 1) / 2;
    const stripe = Math.floor(dx * 0.9 + dy * 0.5 + 20) % 3 === 0;
    let c = u < 0.25 ? pal[5] : u < 0.55 ? pal[4] : u < 0.8 ? pal[3] : pal[2];
    if (stripe && u > 0.2) c = u < 0.55 ? pal[3] : pal[2];
    return c;
  });
  P.rect(1, 10, 14, 1, FIX.R);
  P.rect(1, 10, 4, 1, FIX.q);
  P.rect(13, 10, 2, 1, FIX.r);
  P.rect(2, 11, 12, 1, pal[1]);
  P.set(8, 1, FIX.G);
  P.set(8, 2, FIX.Y);
  P.line(4, 12, 6, 14, FIX.R);
  P.line(12, 12, 10, 14, FIX.r);
  P.set(7, 14, FIX.G);
  P.set(8, 14, FIX.G);
}

function drawFood(P, col) {
  const pal = tierPal(col);
  // khói nóng
  P.map([
    '.w..w..',
    'w..w..w',
    '.w..w.w',
    '..w..w.',
  ], { w: '#f5f5f5' }, 4, 0);
  // món ăn
  P.fill(0, 3, 15, 8, (x, y) => {
    const dx = x - 8;
    const dy = y - 8.5;
    if ((dx / 6.4) ** 2 + (dy / 4) ** 2 > 1 || y > 8.5) return null;
    const lit = (-dx - dy * 1.5) / 7;
    return lit > 0.55 ? pal[5] : lit > 0.1 ? pal[4] : lit > -0.4 ? pal[3] : pal[2];
  });
  P.set(6, 5, '#ffffff');
  // bát sứ
  P.map([
    'TTTTTTTTTTTTTT',
    'STTBBTTBBTTBBS',
    '.STTTTTTTTTTS.',
    '..SSTTTTTTSS..',
    '...SSSSSSSS...',
    '....ssssss....',
  ], FIX, 1, 8);
  P.set(2, 9, '#ffffff');
}

function drawPaw(P, col) {
  const pal = tierPal(col);
  const pad = (cx, cy, rx, ry) => P.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const r = dx * dx + dy * dy;
    if (r > 1) return null;
    const lit = -dx - dy;
    return lit > 0.7 ? pal[5] : lit > -0.2 ? pal[4] : pal[3];
  });
  pad(3.5, 7, 1.9, 2.3);
  pad(6.4, 3.9, 1.9, 2.4);
  pad(9.6, 3.9, 1.9, 2.4);
  pad(12.5, 7, 1.9, 2.3);
  pad(8, 11, 4.6, 3.4);
  P.set(6, 9, '#ffffff');
}

function drawShurikenBig(P, col) {
  const pal = tierPal(col);
  const cx = 7.5;
  const cy = 7.5;
  const R = 7;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R) return null;
    const a = Math.atan2(dy, dx) - Math.PI / 4 - (r / R) * 0.45;
    const la = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
    const core = R * 0.36;
    const tip = Math.max(0, 1 - Math.abs(la) / (Math.PI / 4));
    const rf = core + (R - core) * Math.pow(tip, 2.3);
    if (r > rf) return null;
    if (r < 1.2) return null;
    if (r < 2.1) return pal[2];
    if (la < -0.1) return r > rf - 1.1 ? pal[5] : pal[4];
    return r > rf - 1 ? pal[2] : pal[3];
  });
}

function drawFan(P, col) {
  const pal = tierPal(col);
  const cx = 7.5;
  const cy = 12.5;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    if (a > -0.25 || a < -Math.PI + 0.25 || r > 11.6) return null;
    const u = (a + Math.PI - 0.25) / (Math.PI - 0.5);
    const k = Math.floor(u * 9);
    const edge = Math.abs(u * 9 - k - 0.5) > 0.36;
    if (r < 3.4) return r < 2 ? null : edge ? FIX.h : null;
    if (r > 10.4) return pal[2];
    if (edge) return pal[2];
    if (r > 9.3) return k % 2 ? pal[5] : pal[4];
    return k % 2 ? pal[4] : pal[3];
  });
  P.rect(6, 12, 4, 2, FIX.h);
  P.set(7, 12, FIX.G);
  P.set(8, 12, FIX.Y);
  P.set(7, 14, FIX.R);
  P.set(8, 14, FIX.r);
}

function drawAmulet(P, col) {
  const pal = tierPal(col);
  P.set(7, 0, FIX.G);
  P.set(8, 0, FIX.G);
  P.set(6, 1, FIX.g);
  P.set(9, 1, FIX.g);
  const cx = 7.5;
  const cy = 6.5;
  P.fill(1, 1, 14, 12, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 5.4 || r < 1.6) return null;
    const lit = (-dx - dy) / 5;
    if (r < 2.5) return pal[2];
    if (r > 4.6) return lit > 0 ? pal[3] : pal[2];
    return lit > 0.45 ? pal[5] : lit > -0.2 ? pal[4] : pal[3];
  });
  P.set(5, 3, '#ffffff');
  P.rect(7, 12, 2, 1, FIX.G);
  P.rect(6, 13, 4, 1, FIX.R);
  P.rect(6, 14, 1, 1, FIX.r);
  P.rect(8, 14, 2, 1, FIX.R);
  P.set(7, 14, FIX.R);
}

function drawPotion(P, col, s) {
  const lc = shade(col, 0.45);
  const dc = shade(col, -0.35);
  const glass = '#cfe8f3';
  const gl2 = '#9fc4d6';
  const S = s || 1;
  const rb = [0, 3.6, 4.4, 5.2, 6][S];
  const cy = 15 - rb - 1.2;
  const neckW = S >= 3 ? 4 : 2;
  const neckTop = Math.round(cy - rb - 3);
  // thân bình
  const level = cy - rb * (S === 4 ? 0.55 : 0.35);
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - 7.5;
    const dy = y - cy;
    const inBody = S === 3 ? Math.abs(dx) <= rb - 0.6 && dy >= -rb + 1 && dy <= rb - 0.4 && !(Math.abs(dx) > rb - 2 && dy > rb - 1.6) : dx * dx + dy * dy <= rb * rb;
    if (!inBody) return null;
    if (y < level) return dx < -rb * 0.4 ? '#ffffff' : glass;
    const lit = -dx / rb;
    return lit > 0.45 ? lc : lit > -0.35 ? col : dc;
  });
  // mặt nước
  for (let x = 0; x < 16; x++) {
    const yy = Math.ceil(level);
    if (P.alpha(x, yy) > 0 && P.alpha(x, yy - 1) > 0) P.set(x, yy, shade(col, 0.6));
  }
  // cổ bình
  const nx = 8 - neckW / 2;
  P.rect(nx, neckTop + 2, neckW, Math.round(cy - rb) - neckTop - 1, glass);
  P.set(nx, neckTop + 2, '#ffffff');
  // nút bần
  P.rect(nx, neckTop, neckW, 2, '#a1774f');
  P.rect(nx, neckTop, neckW, 1, '#c8a27a');
  if (S >= 2) P.rect(nx - 1, neckTop + 2, neckW + 2, 1, S === 4 ? FIX.G : gl2);
  if (S === 4) {
    P.set(nx - 1, neckTop + 2, FIX.g);
    P.set(nx + neckW, neckTop + 2, FIX.g);
    P.set(12, 3, '#ffffff');
    P.set(11, 3, '#fff59d');
    P.set(13, 3, '#fff59d');
    P.set(12, 2, '#fff59d');
    P.set(12, 4, '#fff59d');
  }
  // bóng sáng thủy tinh
  P.set(Math.round(7.5 - rb * 0.55), Math.round(cy - rb * 0.1), '#ffffff');
  P.set(Math.round(7.5 - rb * 0.55), Math.round(cy + rb * 0.2), '#ffffff');
  P.set(Math.round(7.5 + rb * 0.45), Math.round(cy + rb * 0.45), shade(col, 0.2));
}

function drawGem(P, col) {
  const pal = tierPal(col);
  // vương miện (y2..5) + đai (y6) + đáy nhọn (y7..13)
  const rows = [
    [2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 2, 13], [6, 2, 13],
    [7, 3, 12], [8, 4, 11], [9, 5, 10], [10, 5, 10], [11, 6, 9], [12, 7, 8],
  ];
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      let c;
      if (y <= 5) c = u < 0.25 ? pal[5] : u < 0.55 ? pal[4] : u < 0.8 ? pal[3] : pal[2];
      else if (y === 6) c = pal[4];
      else c = u < 0.3 ? pal[4] : u < 0.5 ? pal[3] : u < 0.75 ? pal[2] : pal[1];
      P.set(x, y, c);
    }
  }
  P.rect(6, 3, 2, 1, '#ffffff');
  P.set(5, 4, '#ffffff');
  P.line(6, 7, 7, 11, pal[5]);
  P.set(12, 2, '#ffffff');
  P.set(11, 2, pal[5]);
  P.set(12, 1, pal[5]);
  P.set(13, 2, pal[5]);
}

function drawRing(P, col) {
  const pal = tierPal(col);
  const cx = 7.5;
  const cy = 9.2;
  P.fill(0, 4, 15, 15, (x, y) => {
    const dx = (x - cx) / 5.2;
    const dy = (y - cy) / 4.6;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 1 || r < 0.62) return null;
    const lit = -(x - cx) / 5 - (y - cy) / 6;
    return lit > 0.35 ? pal[5] : lit > -0.1 ? pal[4] : lit > -0.5 ? pal[3] : pal[2];
  });
  // ổ gắn đá
  P.rect(5, 4, 6, 2, FIX.g);
  P.rect(6, 4, 4, 1, FIX.G);
  // viên đá
  const gem = [['.RRRR.', 'RqwqRr', 'RqqRRr', '.rRrr.'], 5, 1];
  P.map(gem[0], { R: '#e53935', r: '#8e1b1b', q: '#ff8a80', w: '#ffffff' }, gem[1], gem[2]);
}

function drawNecklace(P, col) {
  const pal = tierPal(col);
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    const x = 7.5 - Math.cos(a) * 6.2;
    const y = 1 + Math.sin(a) * 6;
    P.set(x, y, i % 2 ? FIX.Y : FIX.G);
    if (i % 2 === 0) P.set(x, y + 1, FIX.g);
  }
  P.map([
    '..gGg..',
    '.43334.',
    '4455543',
    '345w543',
    '3455432',
    '.34432.',
    '..322..',
    '...2...',
  ], pal, 5, 7);
}

function drawCoin(P, big) {
  const cx = 7.5;
  const cy = 7.5;
  const R = big ? 7 : 6.2;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R) return null;
    if (Math.abs(dx) < 1.6 && Math.abs(dy) < 1.6) return null;
    if (Math.abs(dx) < 2.6 && Math.abs(dy) < 2.6) return '#b8860b';
    const lit = (-dx - dy) / R;
    if (r > R - 1.2) return lit > 0 ? '#ffe082' : '#c9901a';
    return lit > 0.5 ? '#fff6c2' : lit > -0.1 ? '#ffd54f' : '#f2b01e';
  });
  P.set(4, 4, '#ffffff');
}

export function iconCanvas(icon, rarity) {
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}`;
  let c = iconCache.get(key);
  if (c) return c;
  const P = new Pix(16, 16);
  const col = icon.c || '#9e9e9e';
  const m = ITEM_MAPS[icon.k];
  switch (icon.k) {
    case 'shuriken': drawShurikenBig(P, col); break;
    case 'fan': drawFan(P, col); break;
    case 'amulet': drawAmulet(P, col); break;
    case 'potion': drawPotion(P, col, icon.s); break;
    case 'stone': drawGem(P, col); break;
    case 'ring': drawRing(P, col); break;
    case 'necklace': drawNecklace(P, col); break;
    case 'xu': drawCoin(P, true); break;
    case 'hat': drawHat(P, col); break;
    case 'food': drawFood(P, col); break;
    case 'pet': drawPaw(P, col); break;
    default:
      if (m) P.map(m, tierPal(col));
      else {
        P.rect(3, 3, 10, 10, col);
        P.rect(3, 3, 10, 2, shade(col, 0.4));
      }
  }
  if (icon.k === 'chest') {
    P.map(['..GG..', '.GYYG.', '.GxxG.', '..GG..'], FIX, 7 - 2, 6);
  }
  P.outline(OUT);
  if (rarity) {
    const rc = RARITY_COL[rarity];
    P.halo(rc, 0.35 + rarity * 0.12, rarity >= 3 ? 2 : 1);
    if (rarity >= 2) {
      const sp = rarity >= 3 ? '#ffffff' : rc;
      P.set(14, 1, sp);
      P.set(13, 1, rc, 0.8);
      P.set(15, 1, rc, 0.8);
      P.set(14, 0, rc, 0.8);
      P.set(14, 2, rc, 0.8);
    }
    if (rarity >= 4) {
      P.set(1, 14, '#ffffff');
      P.set(0, 14, rc, 0.8);
      P.set(2, 14, rc, 0.8);
      P.set(1, 13, rc, 0.8);
      P.set(1, 15, rc, 0.8);
    }
  }
  c = P.canvas();
  iconCache.set(key, c);
  return c;
}
const iconCache = new Map();

const urlCache = new Map();
export function iconURL(icon, rarity) {
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}`;
  let u = urlCache.get(key);
  if (!u) {
    u = iconCanvas(icon, rarity).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

// ================= ICON KỸ NĂNG (24x24) =================
// Hình minh họa được dựng từ các nét cơ bản, viền tối tự động, đặt trên nền tròn màu hệ.
const SK = 24;

function band(P, cx, cy, R, T, a0, a1, cols, skew = 1) {
  const span = a1 - a0;
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R || r < R - T - 1) return null;
    let a = Math.atan2(dy, dx);
    while (a < a0) a += TAU;
    while (a >= a0 + TAU) a -= TAU;
    if (a > a1) return null;
    const u = (a - a0) / span;
    const th = T * Math.pow(Math.sin(Math.PI * Math.pow(u, skew)), 0.8);
    if (th < 0.6) return null;
    const v = (R - r) / th;
    if (v > 1) return null;
    return cols[v < 0.25 ? 0 : v < 0.55 ? 1 : v < 0.8 ? 2 : 3];
  });
}

function sword(P, x0, y0, x1, y1, bl, opt = {}) {
  // x0,y0: chuôi (cuối) ; x1,y1: mũi
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  const hl = opt.handle || 4;
  const w = opt.w || 1;
  // lưỡi
  for (let t = hl + 1; t <= L; t += 0.5) {
    const x = x0 + ux * t;
    const y = y0 + uy * t;
    const tip = L - t < 2;
    P.set(x, y, bl[1]);
    if (!tip) {
      P.set(x + nx, y + ny, bl[0]);
      if (w > 1) P.set(x - nx, y - ny, bl[2]);
    }
  }
  P.set(x1, y1, bl[0]);
  // chắn kiếm
  const gx = x0 + ux * hl;
  const gy = y0 + uy * hl;
  const gw = opt.guard || 2.5;
  for (let t = -gw; t <= gw; t += 0.5) P.set(gx + nx * t, gy + ny * t, Math.abs(t) < 0.8 ? FIX.Y : FIX.G);
  // chuôi
  for (let t = 0; t < hl; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.h : FIX.k);
  P.set(x0 - ux * 0.6, y0 - uy * 0.6, FIX.G);
}

function shuri(P, cx, cy, R, cols, rot = 0) {
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R) return null;
    const a = Math.atan2(dy, dx) - rot - (r / R) * 0.45;
    const la = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
    const core = R * 0.38;
    const tip = Math.max(0, 1 - Math.abs(la) / (Math.PI / 4));
    const rf = core + (R - core) * Math.pow(tip, 2.3);
    if (r > rf) return null;
    if (r < Math.max(0.9, R * 0.15)) return null;
    if (r < R * 0.28) return cols[2];
    return la < -0.08 ? cols[0] : cols[1];
  });
}

function arrow(P, x0, y0, x1, y1, head, shaft = '#a1887f', fl = '#ffffff') {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  P.line(x0, y0, x1 - ux * 2, y1 - uy * 2, shaft);
  // đầu mũi tên
  for (let t = 0; t < 3.5; t += 0.5) {
    const w = (3.5 - t) * 0.6;
    for (let s = -w; s <= w; s += 0.5) P.set(x1 - ux * (3.5 - t) + nx * s, y1 - uy * (3.5 - t) + ny * s, s < 0 ? '#ffffff' : head);
  }
  P.set(x1, y1, head);
  // lông đuôi
  for (let t = 0; t < 3; t += 0.5) {
    P.set(x0 + ux * t + nx * 1.4, y0 + uy * t + ny * 1.4, fl);
    P.set(x0 + ux * t - nx * 1.4, y0 + uy * t - ny * 1.4, fl);
  }
}

function kunaiShape(P, x0, y0, x1, y1, bl) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  // vòng
  P.fill(x0 - 3, y0 - 3, x0 + 3, y0 + 3, (x, y) => {
    const r = Math.hypot(x - x0, y - y0);
    return r < 2.2 && r > 1.1 ? '#90a4ae' : null;
  });
  for (let t = 2; t < L * 0.45; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.h : FIX.k);
  // lưỡi hình lá
  const b0 = L * 0.45;
  for (let t = b0; t <= L; t += 0.4) {
    const u = (t - b0) / (L - b0);
    const w = 2.2 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08));
    for (let s = -w; s <= w; s += 0.4) P.set(x0 + ux * t + nx * s, y0 + uy * t + ny * s, s < -w * 0.3 ? bl[0] : s < w * 0.4 ? bl[1] : bl[2]);
  }
}

function flame(P, cx, by, w, h, cols) {
  // cols: [lõi trắng, vàng, cam, đỏ]
  P.fill(cx - w, by - h - 1, cx + w, by, (x, y) => {
    const u = (by - y) / h;
    if (u < 0 || u > 1) return null;
    const sw = Math.sin(u * 5 + cx) * u * 1.2;
    const hw = w * (u < 0.3 ? Math.sqrt(u / 0.3) * 0.9 + 0.1 : Math.pow(1 - (u - 0.3) / 0.7, 1.2));
    const d = Math.abs(x - cx - sw);
    if (d > hw) return null;
    const v = d / Math.max(0.5, hw);
    if (u < 0.45 && v < 0.35) return cols[0];
    if (u < 0.65 && v < 0.6) return cols[1];
    if (v < 0.8 && u < 0.85) return cols[2];
    return cols[3];
  });
}

function drop(P, cx, cy, r, cols) {
  P.fill(cx - r - 1, cy - r * 2.4, cx + r + 1, cy + r + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    let ok;
    if (dy >= 0) ok = dx * dx + dy * dy <= r * r;
    else ok = Math.abs(dx) <= r * (1 + dy / (r * 2.2));
    if (!ok) return null;
    const lit = (-dx - dy * 0.5) / r;
    return lit > 0.55 ? cols[0] : lit > 0 ? cols[1] : lit > -0.6 ? cols[2] : cols[3];
  });
}

function leafShape(P, cx, cy, len, ang, cols) {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  for (let t = -len / 2; t <= len / 2; t += 0.4) {
    const u = (t + len / 2) / len;
    const w = (len * 0.28) * Math.sin(Math.PI * u);
    for (let s = -w; s <= w; s += 0.4) P.set(cx + ux * t - uy * s, cy + uy * t + ux * s, Math.abs(s) < 0.45 ? cols[2] : s < 0 ? cols[0] : cols[1]);
  }
}

function spiral(P, cx, cy, R, turns, col, col2, w = 1, rot = 0) {
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = rot + u * turns * TAU;
    const r = 1 + u * (R - 1);
    P.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, u > 0.55 ? col : col2);
    if (w > 1 && u > 0.3) P.set(cx + Math.cos(a) * (r - 0.8), cy + Math.sin(a) * (r - 0.8) * 0.9, col2);
  }
}

function tornado(P, cx, by, h, w, cols) {
  for (let i = 0; i < h; i++) {
    const u = i / h;
    const r = 1.2 + Math.pow(u, 1.2) * w;
    const y = by - i;
    const off = Math.sin(u * 5) * 1.3 * u;
    const ph = i * 0.9;
    for (let x = -r; x <= r; x += 0.5) {
      const v = (x / r + 1) / 2;
      const stripe = Math.sin(v * 6 + ph) > 0.2;
      P.set(cx + off + x, y, stripe ? cols[0] : v < 0.5 ? cols[1] : cols[2]);
    }
  }
}

function plus(P, cx, cy, s, col, hi) {
  P.rect(cx - s, cy - 1, s * 2 + 1, 3, col);
  P.rect(cx - 1, cy - s, 3, s * 2 + 1, col);
  P.rect(cx - s + 1, cy, s * 2 - 1, 1, hi);
  P.rect(cx, cy - s + 1, 1, s * 2 - 1, hi);
}

function star4(P, cx, cy, R, col, core = '#ffffff') {
  for (let i = -R; i <= R; i++) {
    const w = Math.abs(i) < R * 0.4 ? 1 : 0;
    P.set(cx + i, cy, col);
    P.set(cx, cy + i, col);
    if (w) {
      P.set(cx + i, cy - 1, col);
      P.set(cx + i, cy + 1, col);
      P.set(cx - 1, cy + i, col);
      P.set(cx + 1, cy + i, col);
    }
  }
  P.set(cx, cy, core);
}

function ringE(P, cx, cy, rx, ry, col, a0 = 0, a1 = TAU) {
  const n = Math.max(24, Math.round((rx + ry) * 4));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    P.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, col);
  }
}

function figure(P, cx, by, col, hi) {
  P.map([
    '..hhhh..',
    '.hHHHHh.',
    '.hHwwHh.',
    'RRRRRRRR',
    '.hHHHHh.',
    '..hHHh..',
    '.hHHHHh.',
    'hHHHHHHh',
    'hHhHHhHh',
    '.hHHHHh.',
    '.hH..Hh.',
    '.hH..Hh.',
    '.hh..hh.',
  ], { h: col, H: hi, w: '#ffe0c0', R: '#e53935' }, cx - 4, by - 13);
}

function meteorShape(P, cx, cy, r, core, mid, rim, tail, dx = -1, dy = -1) {
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  for (let t = 0; t < 9; t += 0.5) {
    const w = r * (1 - t / 10);
    for (let s = -w; s <= w; s += 0.5) P.set(cx + ux * (t + r * 0.6) - uy * s, cy + uy * (t + r * 0.6) + ux * s, Math.abs(s) < w * 0.4 ? mid : tail);
  }
  P.fill(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => {
    const ddx = x - cx;
    const ddy = y - cy;
    const rr = Math.sqrt(ddx * ddx + ddy * ddy);
    if (rr > r) return null;
    return rr < r * 0.45 ? core : rr < r * 0.8 ? mid : rim;
  });
}

function shield(P, cx, cy, cols) {
  P.fill(cx - 7, cy - 8, cx + 7, cy + 8, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const hw = dy < -2 ? 6.5 : 6.5 * Math.sqrt(Math.max(0, 1 - ((dy + 2) / 9.5) ** 2));
    if (dy < -7.5 || Math.abs(dx) > hw) return null;
    if (Math.abs(dx) > hw - 1.2 || dy < -6.3) return cols[3];
    return dx < -0.5 ? cols[0] : dx < 0.6 ? cols[3] : cols[1];
  });
}

function eye(P, cx, cy, iris) {
  P.fill(cx - 8, cy - 5, cx + 8, cy + 5, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const hw = 7.5 * Math.sqrt(Math.max(0, 1 - (dy / 4.2) ** 2));
    if (Math.abs(dx) > 7.5 || Math.abs(dy) > 4.2 * (1 - (dx / 8) ** 2)) return null;
    const r = Math.hypot(dx, dy);
    if (r < 1.2) return OUT;
    if (r < 3.4) return r < 2.2 ? shade(iris, -0.3) : iris;
    return hw > 0 ? '#ffffff' : null;
  });
  P.set(cx - 1, cy - 2, '#ffffff');
}

function snowflake(P, cx, cy, R, col, hi) {
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6 - Math.PI / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    P.line(cx, cy, cx + ux * R, cy + uy * R, col);
    const bx = cx + ux * R * 0.6;
    const by = cy + uy * R * 0.6;
    for (const s of [-1, 1]) {
      const b = a + s * 0.8;
      P.line(bx, by, bx + Math.cos(b) * R * 0.35, by + Math.sin(b) * R * 0.35, hi);
    }
  }
  P.set(cx, cy, '#ffffff');
}

function waveCurl(P, cx, by, cols) {
  P.fill(cx - 10, by - 14, cx + 10, by, (x, y) => {
    const dx = x - cx;
    const dy = by - y;
    const crest = 9 + Math.sin((dx + 10) / 20 * Math.PI) * 4 - Math.max(0, dx - 3) * 0.9;
    if (dy > crest || dx < -10 || dx > 10) return null;
    const curlC = { x: cx + 3, y: by - 9 };
    const rc = Math.hypot(x - curlC.x, y - curlC.y);
    if (rc < 2.6 && x > curlC.x - 1) return null;
    if (dy > crest - 1.3) return cols[0];
    if (dy > crest - 3) return cols[1];
    return (dx + dy) % 5 < 1 ? cols[1] : dy < 3 ? cols[3] : cols[2];
  });
}

function fanShape(P, cx, cy, R, cols, a0 = -Math.PI + 0.3, a1 = -0.3) {
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + 2, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    if (a < a0 || a > a1 || r > R) return null;
    const u = (a - a0) / (a1 - a0);
    const k = Math.floor(u * 8);
    const edge = Math.abs(u * 8 - k - 0.5) > 0.38;
    if (r < R * 0.3) return edge ? FIX.h : null;
    if (r > R - 1.2) return cols[2];
    if (edge) return cols[2];
    return k % 2 ? cols[0] : cols[1];
  });
  P.rect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, FIX.h);
  P.set(Math.round(cx), Math.round(cy), FIX.G);
}

function daoShape(P, x0, y0, x1, y1, bl) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  const hl = 5;
  for (let t = hl; t <= L; t += 0.4) {
    const u = (t - hl) / (L - hl);
    const w = 1.4 + u * 1.6 - (u > 0.85 ? (u - 0.85) * 14 : 0);
    const curve = u * u * 2;
    for (let s = -1; s <= w; s += 0.4) {
      const c = s > w - 0.8 ? bl[0] : s < 0 ? bl[2] : bl[1];
      P.set(x0 + ux * t + nx * (s - curve), y0 + uy * t + ny * (s - curve), c);
    }
  }
  for (let t = -2.5; t <= 3; t += 0.5) P.set(x0 + ux * hl + nx * t, y0 + uy * hl + ny * t, FIX.G);
  for (let t = 0; t < hl; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.r : FIX.R);
}

function speedLines(P, x0, x1, ys, col) {
  for (const y of ys) P.line(x0 + (y % 3), y, x1 - (y % 2) * 2, y, col);
}

function bootWing(P, cx, cy, col) {
  P.map([
    '.....w.w.',
    '....wVwVw',
    '.33.VwVw.',
    '.34.wVw..',
    '.343Vw...',
    '.3443....',
    '.344443..',
    '.3444443.',
    '.hhhhhhh.',
  ], { 3: shade(col, -0.2), 4: col, h: FIX.h, w: '#ffffff', V: '#c5e1a5' }, cx - 4, cy - 4);
}

function netGrid(P, cx, cy, R, col) {
  for (let i = -R; i <= R; i += 3) {
    P.line(cx + i, cy - R, cx + i + 2, cy + R, col);
    P.line(cx - R, cy + i, cx + R, cy + i - 2, col);
  }
}

// nền tròn theo màu hệ
function skillBg(el, ult, basic) {
  const P = new Pix(SK, SK);
  const c = 11.5;
  const rim = ult ? ['#7a4a00', '#ffd54f', '#fff59d'] : basic ? ['#3a2618', '#b08850', '#e0c48a'] : ['#2a1a10', '#a07040', '#d8b078'];
  P.fill(0, 0, SK - 1, SK - 1, (x, y) => {
    const dx = x - 12;
    const dy = y - 12;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > c + 0.3) return null;
    if (r > c - 0.7) return OUT;
    if (r > c - 1.7) return (dx + dy < 0 ? rim[2] : rim[1]);
    if (r > c - 2.5) return rim[0];
    const lit = (-dx - dy) / 16;
    const t = r / (c - 2.5);
    const base = t < 0.45 ? shade(el, -0.05 + lit * 0.4) : t < 0.8 ? shade(el, -0.3 + lit * 0.3) : shade(el, -0.55);
    return base;
  });
  // tia sáng mờ trong nền
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + 0.2;
    for (let r = 3; r < 8.5; r += 0.5) P.set(12 + Math.cos(a) * r, 12 + Math.sin(a) * r, shade(el, 0.15), 0.35);
  }
  if (ult) {
    for (const [x, y] of [[12, 1], [12, 22], [1, 12], [22, 12]]) P.set(x, y, '#fff59d');
  }
  return P;
}

function elPal(el) {
  return {
    fire: ['#fffde7', '#ffeb3b', '#ff9800', '#e64a19'],
    water: ['#ffffff', '#b3e5fc', '#29b6f6', '#01579b'],
    wind: ['#ffffff', '#ccff90', '#7cb342', '#33691e'],
  }[el];
}

function elemName(elColor) {
  const [r, g, b] = rgb(elColor || '#ff7043');
  if (r > g && r > b) return 'fire';
  if (b > r && b >= g) return 'water';
  return 'wind';
}

const STEEL = ['#ffffff', '#cfd8dc', '#78909c'];

// Minh họa theo từng kỹ năng
const SKILL_ART = {
  // ---- Kiếm (Hỏa)
  k0: (P, F) => { band(F, 10, 13, 9, 3, -2.3, 0.4, ['#ffffff', '#ffffff', '#cfd8dc', '#90a4ae']); sword(P, 5, 19, 19, 5, STEEL, { w: 2 }); },
  k1: (P, F, e) => {
    flame(F, 15, 11, 4, 9, e); flame(F, 10, 15, 3, 7, e);
    sword(P, 5, 19, 19, 5, ['#fff59d', '#ffb74d', '#e64a19'], { w: 2 });
  },
  k2: (P, F, e) => {
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; flame(F, 12 + Math.cos(a) * 7, 15 + Math.sin(a) * 4, 2, 6, e); }
    sword(P, 7, 17, 17, 7, STEEL, { w: 2 });
  },
  k3: (P, F, e) => {
    speedLines(F, 3, 11, [7, 10, 13, 16], '#ffe0b2');
    band(P, 6, 12, 11, 4, -1.2, 1.2, [e[0], e[1], e[2], e[3]]);
  },
  k4: (P, F, e) => {
    flame(F, 12, 21, 9, 19, e);
    flame(F, 6, 21, 3, 9, e);
    flame(F, 18, 21, 3, 9, e);
    figure(P, 12, 21, '#bf360c', '#ff8a65');
  },
  k5: (P, F, e) => {
    flame(F, 8, 21, 3, 6, e); flame(F, 16, 21, 3, 7, e);
    meteorShape(P, 13, 12, 4.5, '#fffde7', '#ffb300', '#e64a19', '#ff7043', -1, -1);
  },
  k6: (P, F, e) => {
    for (let k = 0; k < 5; k++) flame(F, 4 + k * 4, 21, 2.5, 5 + (k % 2) * 3, e);
    meteorShape(F, 15, 9, 4, '#fffde7', '#ff5252', '#b71c1c', '#ff1744', -1, -1);
    sword(P, 6, 20, 18, 4, ['#fff59d', '#ff8a80', '#b71c1c'], { w: 2 });
  },
  // ---- Tiêu (Hỏa)
  t0: (P, F) => { speedLines(F, 2, 9, [9, 12, 15], '#ffffff'); shuri(P, 14, 12, 7, STEEL, 0.3); },
  t1: (P, F, e) => {
    flame(F, 6, 10, 2.5, 6, e); flame(F, 12, 18, 2.5, 6, e);
    speedLines(F, 2, 7, [8, 16], '#fff59d');
    shuri(P, 10, 8, 5.5, STEEL, 0.2); shuri(P, 15, 16, 5.5, STEEL, 0.6);
  },
  t2: (P, F, e) => {
    for (const [x, y] of [[6, 6], [13, 4], [18, 9]]) { F.line(x - 3, y - 4, x, y, '#ffcc80'); }
    for (let k = 0; k < 3; k++) flame(F, 6 + k * 6, 21, 2, 4, e);
    shuri(P, 7, 9, 3.5, STEEL, 0.1); shuri(P, 14, 7, 3.5, STEEL, 0.5); shuri(P, 17, 14, 3.5, STEEL, 0.9); shuri(P, 10, 15, 3.5, STEEL, 0.3);
  },
  t3: (P, F) => {
    F.disc(8, 16, 4, '#cfd8dc'); F.disc(15, 15, 5, '#b0bec5'); F.disc(12, 18, 4, '#eceff1');
    figure(P, 12, 19, '#455a64', '#78909c');
    for (let y = 6; y < 20; y += 2) P.rect(7, y, 10, 1, null);
  },
  t4: (P, F, e) => {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; F.line(12, 12, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, k % 2 ? '#ffeb3b' : '#ff7043'); }
    F.disc(12, 12, 6, '#ffb300'); F.disc(12, 12, 4, '#fff59d');
    shuri(P, 12, 12, 6, ['#ffffff', '#ff7043', '#bf360c'], 0.4);
  },
  t5: (P, F) => { netGrid(F, 12, 12, 9, '#8d2a10'); shuri(P, 12, 12, 6.5, ['#fffde7', '#ffd54f', '#b8860b'], 0.2); shuri(P, 5, 6, 2.5, STEEL); shuri(P, 19, 18, 2.5, STEEL); shuri(P, 18, 5, 2.5, STEEL); shuri(P, 6, 18, 2.5, STEEL); },
  t6: (P, F, e) => {
    for (const [x, y] of [[5, 7], [11, 4], [17, 6], [8, 13], [15, 12]]) { flame(F, x + 1, y + 3, 2, 5, e); }
    for (let k = 0; k < 5; k++) flame(F, 3 + k * 4.5, 21, 2, 5, e);
    for (const [x, y] of [[6, 9], [12, 6], [18, 9], [9, 15], [16, 15]]) shuri(P, x, y, 3, ['#ffffff', '#ffe082', '#bf360c'], x * 0.3);
  },
  // ---- Kunai (Thủy)
  n0: (P, F) => { band(F, 9, 12, 9, 3, -1.6, 0.9, ['#ffffff', '#e0f7fa', '#80deea', '#4dd0e1']); kunaiShape(P, 5, 19, 19, 5, STEEL); },
  n1: (P, F, e) => { band(F, 10, 11, 10, 4, -2.2, 0.2, e); band(F, 12, 14, 8, 3, -0.6, 1.9, e); kunaiShape(P, 6, 18, 18, 6, ['#ffffff', '#b3e5fc', '#0288d1']); },
  n2: (P, F, e) => { spiral(P, 12, 12, 9, 2.2, e[1], e[2], 2, 0); drop(P, 12, 12, 2.5, e); },
  n3: (P, F, e) => { F.disc(12, 12, 8, '#a5d6a7'); drop(P, 12, 13, 6, ['#ffffff', '#b3e5fc', '#29b6f6', '#0277bd']); plus(P, 12, 14, 3, '#43a047', '#ffffff'); },
  n4: (P, F) => {
    for (let k = 0; k < 4; k++) star4(F, 5 + k * 5, 18 - k * 4, 1, '#e1f5fe');
    kunaiShape(P, 5, 19, 19, 5, ['#ffffff', '#b3e5fc', '#4fc3f7']);
  },
  n5: (P, F, e) => { waveCurl(P, 12, 20, e); F.disc(18, 6, 2, '#e1f5fe'); },
  n6: (P, F) => { F.disc(12, 12, 9, '#b3e5fc'); snowflake(P, 12, 12, 9, '#e1f5fe', '#ffffff'); P.disc(12, 12, 2, '#80d8ff'); },
  // ---- Cung (Thủy)
  c0: (P, F) => { F.line(3, 18, 8, 13, '#ffffff'); arrow(P, 4, 20, 20, 4, '#cfd8dc'); },
  c1: (P, F, e) => { for (let k = 0; k < 8; k++) F.set(5 + k, 19 - k + Math.round(Math.sin(k) * 1.5), e[1]); drop(F, 6, 18, 2, e); arrow(P, 4, 20, 20, 4, '#29b6f6', '#a1887f', '#b3e5fc'); },
  c2: (P, F, e) => {
    ringE(F, 12, 20, 9, 2.5, e[1]);
    arrow(P, 4, 2, 7, 17, '#4fc3f7'); arrow(P, 10, 1, 13, 18, '#4fc3f7'); arrow(P, 16, 3, 19, 16, '#4fc3f7');
  },
  c3: (P, F, e) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; F.line(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, e[1]); } eye(P, 12, 12, '#29b6f6'); },
  c4: (P, F, e) => { ringE(F, 9, 12, 2, 6, e[1]); ringE(F, 15, 12, 2, 7, e[1]); arrow(P, 2, 12, 22, 12, '#e1f5fe', '#a1887f', '#ffffff'); },
  c5: (P, F, e) => {
    for (let k = 0; k < 10; k++) F.set(6 + k * 1.2 + Math.sin(k * 1.3) * 2, 3 + k * 1.3, e[1]);
    waveCurl(F, 12, 22, e);
    arrow(P, 6, 2, 15, 17, '#0288d1', '#a1887f', '#b3e5fc');
  },
  c6: (P, F, e) => { for (let y = 10; y <= 14; y++) F.line(2, y, 22, y, y === 12 ? '#ffffff' : e[1]); star4(F, 19, 12, 4, '#ffffff'); arrow(P, 3, 12, 21, 12, '#00e5ff', '#a1887f', '#e0f7fa'); },
  // ---- Đao (Phong)
  d0: (P, F) => { band(F, 10, 13, 9, 3, -2.3, 0.4, ['#ffffff', '#f1f8e9', '#c5e1a5', '#9ccc65']); daoShape(P, 5, 19, 19, 5, STEEL); },
  d1: (P, F, e) => { band(F, 11, 12, 10, 4, -2.4, 0.6, e); leafShape(F, 18, 18, 5, 0.6, ['#c5e1a5', '#7cb342', '#33691e']); daoShape(P, 5, 19, 18, 6, ['#ffffff', '#c5e1a5', '#558b2f']); },
  d2: (P, F, e) => { band(F, 12, 12, 10, 3, -3.0, 0.3, e); band(F, 12, 12, 10, 3, 0.2, 3.3, e); daoShape(P, 7, 17, 17, 7, STEEL); },
  d3: (P, F, e) => { F.disc(12, 12, 9, '#dcedc8'); shield(P, 12, 12, ['#e8f5e9', '#9ccc65', '#558b2f', '#33691e']); P.rect(11, 8, 2, 8, '#ffffff'); P.rect(9, 10, 6, 2, '#ffffff'); },
  d4: (P, F, e) => { speedLines(F, 2, 12, [6, 9, 12, 15, 18], '#ccff90'); figure(P, 15, 20, '#33691e', '#7cb342'); },
  d5: (P, F, e) => { tornado(F, 12, 21, 18, 8, ['#ffffff', '#aed581', '#558b2f']); daoShape(P, 6, 18, 18, 6, STEEL); },
  d6: (P, F, e) => {
    speedLines(F, 2, 9, [5, 9, 15, 19], '#ccff90');
    P.line(5, 5, 19, 19, '#ffffff', 2); P.line(5, 19, 19, 5, '#76ff03', 2); P.line(6, 18, 18, 6, '#ccff90');
    star4(P, 12, 12, 3, '#ffffff');
  },
  // ---- Quạt (Phong)
  q0: (P, F, e) => { band(F, 13, 12, 8, 3, -1.1, 1.1, e); fanShape(P, 9, 17, 8, ['#c5e1a5', '#7cb342', '#33691e']); },
  q1: (P, F, e) => { const W = ['#ffffff', '#f1f8e9', '#ccff90', '#7cb342']; band(P, 7, 12, 7, 3, -1.1, 1.1, W); band(P, 12, 12, 7, 3, -1.1, 1.1, W); band(P, 17, 12, 7, 3, -1.1, 1.1, W); },
  q2: (P, F, e) => { tornado(P, 12, 20, 17, 8, ['#ffffff', '#aed581', '#558b2f']); },
  q3: (P, F, e) => { F.disc(12, 12, 8, '#b9f6ca'); leafShape(P, 10, 13, 13, -0.8, ['#c8e6c9', '#66bb6a', '#1b5e20']); plus(P, 16, 16, 3, '#ffffff', '#69f0ae'); },
  q4: (P, F, e) => {
    speedLines(F, 2, 9, [9, 13, 17], '#ccff90');
    P.map(ITEM_MAPS.shoes, tierPal('#dcedc8'), 5, 3);
    P.map(['....ww', '..wwVw', '.wwVV.', 'wVVV..', '.VV...'], { w: '#ffffff', V: '#ccff90' }, 4, 5);
  },
  q5: (P, F, e) => { tornado(P, 9, 21, 17, 6, ['#ffffff', '#aed581', '#33691e']); tornado(P, 16, 21, 14, 5, ['#ffffff', '#c5e1a5', '#558b2f']); },
  q6: (P, F, e) => {
    F.disc(12, 6, 6, '#b2ff59');
    tornado(P, 12, 21, 19, 9, ['#ffffff', '#69f0ae', '#00695c']);
    P.line(16, 2, 13, 8, '#fff59d'); P.line(13, 8, 17, 9, '#fff59d'); P.line(17, 9, 14, 15, '#fff59d');
  },
};

// Hình chung theo loại hiệu ứng (khi không có minh họa riêng)
function genericArt(P, F, sk, e) {
  const fx = sk.fx || {};
  switch (fx.k) {
    case 'slash': band(P, 10, 12, 9, 4, -2.3, 0.6, e); break;
    case 'proj':
      if (fx.p === 'arrow') arrow(P, 4, 20, 20, 4, e[2]);
      else if (fx.p === 'shuriken') shuri(P, 12, 12, 7, e, 0.3);
      else meteorShape(P, 13, 11, 5, e[0], e[1], e[2], e[2], -1, 0);
      break;
    case 'burst': ringE(P, 12, 12, 9, 9, e[1]); star4(P, 12, 12, 5, e[2]); break;
    case 'wave': band(P, 6, 12, 11, 4, -1.2, 1.2, e); break;
    case 'rain': for (let k = 0; k < 4; k++) P.line(5 + k * 4, 4, 8 + k * 4, 18, e[1]); break;
    case 'meteor': meteorShape(P, 13, 12, 5, e[0], e[1], e[2], e[3]); break;
    case 'whirl': tornado(P, 12, 20, 16, 8, e); break;
    case 'aura': flame(F, 12, 21, 8, 18, e); figure(P, 12, 20, '#3e2723', '#6d4c41'); break;
    case 'heal': plus(P, 12, 12, 6, '#43a047', '#ffffff'); break;
    case 'dash': speedLines(P, 3, 20, [7, 11, 15, 19], e[1]); break;
    default: star4(P, 12, 12, 6, e[1]);
  }
}

const skillCache = new Map();
export function skillIconURL(sk, sid, elColor) {
  const key = `${sid}|${elColor}`;
  if (skillCache.has(key)) return skillCache.get(key);
  const el = elColor || '#8d6e63';
  const elN = elemName(el);
  const e = elPal(elN);
  const s = sk || {};
  const bg = skillBg(el, (s.req || 0) >= 60, !!s.basic);
  const F = new Pix(SK, SK); // lớp hiệu ứng (không viền)
  const P = new Pix(SK, SK); // lớp hình chính (có viền)
  const art = SKILL_ART[sid];
  if (art) art(P, F, e);
  else genericArt(P, F, s, e);
  P.outline(OUT);
  // cắt theo vòng tròn bên trong khung
  const clip = (L) => {
    for (let y = 0; y < SK; y++) {
      for (let x = 0; x < SK; x++) {
        if ((x + 0.5 - 12) ** 2 + (y + 0.5 - 12) ** 2 > 9.3 * 9.3) L.d[(y * SK + x) * 4 + 3] = 0;
      }
    }
  };
  clip(F);
  clip(P);
  bg.over(F);
  bg.over(P);
  const u = bg.canvas().toDataURL();
  skillCache.set(key, u);
  return u;
}

// ================= ICON GIAO DIỆN (16x16) =================
const UI_PAL = Object.assign({}, FIX, {
  1: '#5d3a1a', 2: '#8d5a2b', 3: '#c08040', 4: '#e8b26a', 5: '#ffe0a0', // da/gỗ
  a: '#7a1b1b', A: '#c62828', d: '#ff5252', // đỏ
  m: '#0d47a1', M: '#1e88e5', N: '#64b5f6', // xanh dương
  l: '#1b5e20', L: '#43a047', i: '#a5d6a7', // xanh lá
  f: '#ffe0c0', F: '#e8b48a', // da người
  t: '#6a1b9a', U: '#ab47bc', // tím
});

const UI_MAPS = {
  bag: [
    '................',
    '......GgG.......',
    '.....g...g......',
    '....2GGGGG2.....',
    '...23444443 2...',
    '..2344544443 2..',
    '.234455444443 2.',
    '.234454444443 2.',
    '.234444YY44432..',
    '.23444YGGY4432..',
    '.234444YY44432..',
    '.233444444433 2.',
    '..2233333332 2..',
    '...222222222....',
    '................',
    '................',
  ],
  char: [
    '................',
    '.....111111.....',
    '....1222222 1....',
    '...122222222 1...',
    '...AAAAAAAAAAd..',
    '...1ffffffff1Ad.',
    '...1fKfffKff1.d.',
    '...1ffffffff1...',
    '....1ffaaff1....',
    '.....111111.....',
    '...MMMM..MMMM...',
    '..MNMMMwwMMMNM..',
    '.MNMMMMwwMMMMNM.',
    '.MNMMMMMMMMMMNM.',
    '................',
    '................',
  ],
  skill: [
    '................',
    '..........12....',
    '.........1342...',
    '........134 42..',
    '.......1PPP442..',
    '......1PPPPP 2...',
    '.....1PxPPP1....',
    '....1PPPxP1.....',
    '...1PxPPP1......',
    '..AAPPPx1.......',
    '.AdA PP1........',
    '.AAA 11.........',
    '..A.............',
    '................',
    '................',
    '................',
  ],
  quest: [
    '................',
    '.1222222222221..',
    '.2PPPPPPPPPPP2..',
    '..PPPPPAAPPPP...',
    '..PPPPAddAPPP...',
    '..PxxxAddAPPP...',
    '..PPPPAddAPPP...',
    '..PxxxPAAPPPP...',
    '..PPPPPPPPPPP...',
    '..PxxxPPAAPPP...',
    '..PPPPPAddAPP...',
    '..PPPPPPAAPPP...',
    '.2PPPPPPPPPPP2..',
    '.1222222222221..',
    '................',
    '................',
  ],
  party: [
    '................',
    '..........111...',
    '.........1fff1..',
    '....111..1fKf1..',
    '...1fff1.1fff1..',
    '...1fKf1..111...',
    '...1fff1.1LLL1..',
    '....111.1LiLLL1.',
    '...1MMM11LLLLL1.',
    '..1MNMMM1LLLLL1.',
    '..1MNMMMM1LLLL1.',
    '..1MMMMMM1.....',
    '..1MMMMMM1......',
    '...111111.......',
    '................',
    '................',
  ],
  friends: [
    '................',
    '................',
    '...aaa...aaa....',
    '..aAddA.aAAAa...',
    '.aAdwdAaAAAAAa..',
    '.aAddAAAAAAAAa..',
    '.aAAAAAAAAAAAa..',
    '.aAAAAAAAAAAAa..',
    '..aAAAAAAAAAa...',
    '...aAAAAAAAa....',
    '....aAAAAAa.....',
    '.....aAAAa......',
    '......aAa.......',
    '.......a........',
    '................',
    '................',
  ],
  clan: [
    '................',
    '.GY.............',
    '.gG.aaaaaaaaa...',
    '.12.AAAAAAAAAa..',
    '.12.AdAAGGAAAa..',
    '.12.AAAGYYGAAa..',
    '.12.AAAGYYGAAa..',
    '.12.AAAAGGAAAa..',
    '.12.AAAAAAAAa...',
    '.12.AAAAAAAAAa..',
    '.12.aaaaaaaaaa..',
    '.12.............',
    '.12.............',
    '.12.............',
    'g111g...........',
    '................',
  ],
  rank: [
    '................',
    '..GGGGGGGGGGG...',
    '.gGYYYGGGGGGgg..',
    'gggYYGGGGGGGg.g.',
    'g.gYGGGGGGGGg.g.',
    'g.gYGGGGGGGGg.g.',
    '.gggGGGGGGGgg g.',
    '...gGGGGGGGg....',
    '....gGGGGGg.....',
    '.....ggGgg......',
    '......gGg.......',
    '......gGg.......',
    '....11111 11....',
    '....1AAdAA1.....',
    '...111111111....',
    '................',
  ],
  map: [
    '................',
    '..PPPPnPPPPnPP..',
    '.pPPPnnPPPnnPPp.',
    '.pPLLnPPPPnPPPp.',
    '.pPLLLPP.PnP.Pp.',
    '.pPPLnP.PPn.PPp.',
    '.pPPPnPPPPnPPAd.',
    '.pP.PnPPPPnPAdA.',
    '.pPP.nPPMMnPdAP.',
    '.pPPPnPMMMnPPPp.',
    '.pPPPnPPMMnPPPp.',
    '.pPPnnPPPnnPPPp.',
    '..ppppnppppnpp..',
    '................',
    '................',
    '................',
  ],
  gift: [
    '................',
    '...AA....AA.....',
    '..AddA..AddA....',
    '..AAdAAAAdAA....',
    '....AAAAAA......',
    '.GGGGGAAGGGGGG..',
    '.GYYYYAAYYYYYG..',
    '.gGGGGAAGGGGGg..',
    '..MMMMAAMMMMM...',
    '..MNNMAAMMMMM...',
    '..MNMMAAMMMMM...',
    '..MMMMAAMMMMM...',
    '..MMMMAAMMMMM...',
    '..mmmmaammmmm...',
    '................',
    '................',
  ],
  wheel: [
    '.......dA.......',
    '.......AA.......',
    '.....11a111.....',
    '...11GAAAMM11...',
    '..1GGGAAAMMMM1..',
    '..1GGGGAMMMMM1..',
    '.1LLLGGAMMMLLL1.',
    '.1LLLLLYYLLLLL1.',
    '.1MMMLLYYLLAAA1.',
    '.1MMMMGLGAAAAA1.',
    '..1MMMGGGAAAA1..',
    '..1MMGGGGGAAA1..',
    '...11GGGGGG11...',
    '.....111111.....',
    '......1jj1......',
    '.....1jjjj1.....',
  ],
  settings: [
    '................',
    '......TT........',
    '...T..TSS..T....',
    '..TTSTTSSTSST...',
    '...TSSSSSSSS....',
    '..TSSSs..sSSS...',
    'TTTSSs....sSSTT.',
    'TSSSS......SSSS.',
    '.SSSSs....sSSss.',
    '..SSSSs..sSSSs..',
    '...SSSSSSSSSs...',
    '..TSSsSSSSsSSs..',
    '..Ss..SSs..ss...',
    '......Sss.......',
    '................',
    '................',
  ],
  auto: [
    '................',
    '.....LLLLLL.....',
    '...LLiiiiiLLL...',
    '..LiL......iLi..',
    '..Li.....T..LLL.',
    '.Li.....TS..LiL.',
    '.Li....TS...iL..',
    '.L....TS.....L..',
    '..L..TS......iL.',
    '.LiL.GG.....iL..',
    '.LLL.hG....iL...',
    '..LiL....iiLL...',
    '...LLLiiiiLL....',
    '.....LLLLLL.....',
    '................',
    '................',
  ],
  pk: [
    '................',
    '....TTTTTTT.....',
    '...TTTTTTTTT....',
    '..TTTTTTTTTTS...',
    '..TTTTTTTTTTS...',
    '..TKKKTTTKKKS...',
    '..TKdKTTTKdKS...',
    '..TKKKTSTKKKS...',
    '...TTTTKTTTS....',
    '....TSTSTST.....',
    '....TTTTTTS.....',
    '.TT..SSSSS..TT..',
    '..TTT.....TTT...',
    '.....TTTTT......',
    '..TTT.....TTT...',
    '.TT.........TT..',
  ],
  chat: [
    '................',
    '..TTTTTTTTTTT...',
    '.TTTTTTTTTTTTT..',
    '.TTsssssssssTT..',
    '.TTTTTTTTTTTTT..',
    '.TTsssssssTTTT..',
    '.TTTTTTTTTTTTT..',
    '.TTssssssssTTT..',
    '.TTTTTTTTTTTTT..',
    '..TTTTTTTTTTT...',
    '...TTT..........',
    '...TT...........',
    '...T............',
    '................',
    '................',
    '................',
  ],
  talk: [
    '................',
    '..YYYYYYYYYYY...',
    '.YYGGGGGGGGGYY..',
    '.YGGGGGGGGGGGY..',
    '.YGGGGGGGGGGGY..',
    '.YGhhGGhhGGhhG..',
    '.YGhhGGhhGGhhG..',
    '.YGGGGGGGGGGGY..',
    '.YGGGGGGGGGGGg..',
    '..gGGGGGGGGGg...',
    '.....gGGg.......',
    '......gGg.......',
    '.......gg.......',
    '................',
    '................',
    '................',
  ],
  pick: [
    '................',
    '......ff........',
    '.....fFFf.ff....',
    '.....fFFffFFf...',
    '..ff.fFFfFFFf...',
    '.fFFffFFfFFFff..',
    '.fFFfFFFfFFfFFf.',
    '..fFFFFFFFFfFFf.',
    '..fFFFFFFFFFFFf.',
    '...fFFFFFFFFFf..',
    '...fFFFFFFFFFf..',
    '....fFFFFFFFf...',
    '....AAAAAAAA....',
    '....AdddddAA....',
    '................',
    '................',
  ],
  target: [
    '................',
    '.......A........',
    '.....AAAAA......',
    '....AwwwwwA.....',
    '...AwAAAAAwA....',
    '..AwAwwwwwAwA...',
    '..AwAwAAAwAwA...',
    '.AAwAwAdAwAwAA..',
    '..AwAwAAAwAwA...',
    '..AwAwwwwwAwA...',
    '...AwAAAAAwA....',
    '....AwwwwwA.....',
    '.....AAAAA......',
    '.......A........',
    '................',
    '................',
  ],
  attack: [
    '................',
    '.............TT.',
    '............TST.',
    '...........TSs..',
    '..........TSs...',
    '.........TSs....',
    '........TSs.....',
    '.......TSs......',
    '..g...TSs.......',
    '..Gg.TSs........',
    '...GGSs.........',
    '...hGGg.........',
    '..hkhgGG........',
    '.hkh...g........',
    '.Gh.............',
    '................',
  ],
  close: [
    '................',
    '................',
    '..aaa.....aaa...',
    '..adAa...aAAa...',
    '...adAa.aAAa....',
    '....adAaAAa.....',
    '.....adAAa......',
    '......aAAa......',
    '.....aAAAAa.....',
    '....aAAa.aAAa...',
    '...aAAa...aAAa..',
    '..aAAa.....aAAa.',
    '..aaa.......aaa.',
    '................',
    '................',
    '................',
  ],
};

function drawLuong(P) {
  // viên ngọc xanh (lượng)
  const rows = [[2, 5, 10], [3, 3, 12], [4, 2, 13], [5, 1, 14], [6, 2, 13], [7, 3, 12], [8, 4, 11], [9, 5, 10], [10, 6, 9], [11, 7, 8]];
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      let c;
      if (y <= 4) c = u < 0.3 ? '#e1f5fe' : u < 0.6 ? '#81d4fa' : '#29b6f6';
      else if (y === 5) c = '#b3e5fc';
      else c = u < 0.3 ? '#4fc3f7' : u < 0.6 ? '#0288d1' : '#01579b';
      P.set(x, y + 1, c);
    }
  }
  P.rect(5, 4, 2, 1, '#ffffff');
  P.set(4, 5, '#ffffff');
  P.line(5, 8, 7, 11, '#b3e5fc');
  P.set(13, 2, '#ffffff');
  P.set(12, 2, '#b3e5fc');
  P.set(14, 2, '#b3e5fc');
  P.set(13, 1, '#b3e5fc');
  P.set(13, 3, '#b3e5fc');
}

function drawSettings(P) {
  const cx = 7.5;
  const cy = 7.5;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    const tooth = Math.cos(a * 8) > 0.15;
    const R = tooth ? 7 : 5.4;
    if (r > R || r < 2.2) return null;
    const lit = (-dx - dy) / 8;
    if (r < 3.4) return '#546e7a';
    return lit > 0.25 ? '#eceff1' : lit > -0.25 ? '#b0bec5' : '#78909c';
  });
}

function drawWheel(P) {
  const cx = 7.5;
  const cy = 8;
  const cols = ['#e53935', '#ffd54f', '#43a047', '#1e88e5', '#ab47bc', '#ff9800'];
  P.fill(0, 1, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 6.8) return null;
    if (r > 5.8) return r > 6.3 ? '#9a6a12' : '#f2c230';
    if (r < 1.4) return '#fff3a0';
    const a = Math.atan2(dy, dx) + Math.PI;
    const k = Math.floor((a / TAU) * 6) % 6;
    return cols[k];
  });
  P.map(['.ww.', '.Rr.', '..r.'], { w: '#ffffff', R: '#e53935', r: '#8e1b1b' }, 6, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    P.set(cx + Math.cos(a) * 6.3, cy + Math.sin(a) * 6.3, '#fff3a0');
  }
}

function drawAuto(P) {
  // vòng mũi tên xoay + kiếm
  const cx = 7.5;
  const cy = 7.5;
  P.fill(0, 0, 15, 15, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > 7 || r < 5) return null;
    const a = Math.atan2(dy, dx);
    if ((a > -0.35 && a < 0.25) || (a > Math.PI - 0.35 || a < -Math.PI + 0.25)) return null;
    return r > 6.2 ? '#2e7d32' : '#69f0ae';
  });
  P.map(['ww.', 'wLw', '.L.'], { w: '#69f0ae', L: '#2e7d32' }, 12, 7);
  P.map(['.L.', 'wLw', '.ww'], { w: '#69f0ae', L: '#2e7d32' }, 1, 6);
  P.line(5, 10, 10, 5, '#eceff1');
  P.line(6, 10, 11, 5, '#90a4ae');
  P.set(10, 4, '#ffffff');
  P.line(4, 9, 6, 11, '#f2c230');
  P.set(4, 11, '#8d6e63');
  P.set(3, 12, '#5d4037');
}

const uiCache = new Map();
export function uiIconURL(name) {
  if (uiCache.has(name)) return uiCache.get(name);
  const P = new Pix(16, 16);
  switch (name) {
    case 'xu': drawCoin(P, true); break;
    case 'luong': drawLuong(P); break;
    case 'settings': drawSettings(P); break;
    case 'wheel': drawWheel(P); break;
    case 'auto': drawAuto(P); break;
    default: {
      const m = UI_MAPS[name];
      if (m) P.map(m, UI_PAL);
      else {
        P.rect(4, 4, 8, 8, '#e8c271');
        P.rect(4, 4, 8, 2, '#fff3a0');
      }
    }
  }
  P.outline(OUT);
  const u = P.canvas().toDataURL();
  uiCache.set(name, u);
  return u;
}
