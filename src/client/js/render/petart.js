// Thú cưng đi theo nhân vật: pixel art tự vẽ bằng code, cỡ ~12-14px.
// Mỗi khung dựng 1 lần (hình khối tô 4 tông theo ánh sáng trên-trái -> chi tiết -> viền tối) rồi cache canvas offscreen,
// cache riêng bản lật trái. Gốc tọa độ: giữa chân (thú bay tự nâng lên cao, bóng vẫn ở mặt đất).
const OUT = '#1d1424';
const W = 20;
const H = 18;
// khung nội dung (không gồm viền) nằm trong x 3..16, y 3..16 để icon 16x16 chứa trọn
const AX = 10;

const rgbCache = new Map();
function rgb(col) {
  let v = rgbCache.get(col);
  if (v) return v;
  const h = col.slice(1);
  const n = parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h, 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(col, v);
  return v;
}

class Buf {
  constructor() {
    this.d = new Array(W * H).fill(null);
  }

  set(x, y, c) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
    this.d[y * W + x] = c;
  }

  get(x, y) {
    return x < 0 || y < 0 || x >= W || y >= H ? null : this.d[y * W + x];
  }

  // Elip tô 4 tông: sáng ở trên-trái, tối ở dưới-phải. o.tone(nx, ny) trả về bảng màu khác cho một vùng (bụng...)
  ell(cx, cy, rx, ry, P, o = {}) {
    const a = o.rot || 0;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const px = x + 0.5 - cx;
        const py = y + 0.5 - cy;
        const nx = (px * ca + py * sa) / rx;
        const ny = (-px * sa + py * ca) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const sx = px / Math.max(rx, ry);
        const sy = py / Math.max(rx, ry);
        const l = -(sx * 0.6 + sy * 0.85) + (1 - r2) * 0.3;
        const T = (o.tone && o.tone(nx, ny)) || P;
        this.set(x, y, l > 0.62 && !o.noHi ? T.hi : l > 0.12 ? T.lt : l > -0.42 ? T.md : T.dk);
      }
    }
  }

  // Đa giác lồi/lõm tô một màu (cánh dơi)
  poly(pts, c) {
    let x0 = W;
    let x1 = 0;
    let y0 = H;
    let y1 = 0;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i];
          const [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
      }
    }
  }

  line(x0, y0, x1, y1, c) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  // Viền tối 1px quanh hình (4 hướng)
  outline(col = OUT) {
    const src = this.d.map((c) => !!c);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (src[y * W + x]) continue;
        if ((x > 0 && src[y * W + x - 1]) || (x < W - 1 && src[y * W + x + 1]) || (y > 0 && src[(y - 1) * W + x]) || (y < H - 1 && src[(y + 1) * W + x])) this.d[y * W + x] = col;
      }
    }
  }

  rgba() {
    const out = new Uint8ClampedArray(W * H * 4);
    this.d.forEach((c, i) => {
      if (!c) return;
      const [r, g, b] = rgb(c);
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    });
    return out;
  }
}

const pal = (hi, lt, md, dk) => ({ hi, lt, md, dk });
const EYE = '#1d1424';
const WHITE = '#ffffff';
const BLUSH = '#ff8fb1';

// ---------- Từng loài. f: khung 0-3, mv: đang di chuyển. Vẽ quay mặt sang phải.
const SLIME = pal('#e6fff4', '#8ff0c4', '#43cf96', '#22936f');
const LEAF = pal('#d9ffb0', '#a5e86a', '#69c23f', '#3f8a2a');
function drawSlime(b, f, mv) {
  const [rx, ry] = mv ? [[6.4, 3.8], [5.6, 4.8], [5.2, 5.3], [5.9, 4.4]][f] : [[6, 4.5], [6.2, 4.3], [6, 4.5], [5.8, 4.7]][f];
  const cx = 10;
  const cy = 17 - ry;
  b.ell(cx, cy, rx, ry, SLIME);
  // chồi lá trên đỉnh, lắc theo khung
  const top = Math.floor(cy - ry);
  const sw = [0, 1, 0, -1][f];
  b.set(cx - 1, top - 1, LEAF.dk);
  b.set(cx - 1 + (sw > 0 ? 1 : 0), top - 2, LEAF.md);
  b.set(cx - 3 + sw, top - 3, LEAF.lt);
  b.set(cx - 2 + sw, top - 3, LEAF.md);
  b.set(cx - 2 + sw, top - 2, LEAF.md);
  b.set(cx + sw, top - 3, LEAF.md);
  b.set(cx + 1 + sw, top - 3, LEAF.lt);
  b.set(cx + sw, top - 2, LEAF.dk);
  // mặt
  const ey = Math.round(cy - 0.5);
  const ex = Math.round(cx + 0.5);
  b.set(ex, ey, EYE); b.set(ex, ey + 1, EYE);
  b.set(ex + 3, ey, EYE); b.set(ex + 3, ey + 1, EYE);
  b.set(ex + 1, ey + 2, '#1b6b52'); b.set(ex + 2, ey + 2, '#1b6b52');
  b.set(ex - 1, ey + 2, BLUSH); b.set(ex + 4, ey + 2, BLUSH);
  // bóng sáng thạch
  b.set(cx - 4, cy - 1, WHITE); b.set(cx - 3, cy - 2, WHITE);
}

const JADE_W = pal('#ffffff', '#fbf8ff', '#e4def0', '#b2a7cc');
const EAR_IN = '#ffb3c7';
function drawBunny(b, f, mv) {
  // nhảy: thân co/duỗi theo khung, tai ngả ra sau khi bật lên
  const st = mv ? [[4.4, 3.4, 0], [5, 3, -1], [5, 3, -1], [4.6, 3.3, 0]][f] : [[4.6, 3.3, 0], [4.6, 3.3, 0], [4.7, 3.2, 0], [4.6, 3.3, 0]][f];
  const [rx, ry, lean] = st;
  const cy = 17 - ry;
  // đuôi bông
  b.ell(4.6, cy - 0.8, 1.6, 1.5, JADE_W);
  b.ell(8.6, cy, rx, ry, JADE_W);
  const hx = 12.2;
  const hy = cy - 3.4;
  // tai (tai sau tối hơn), ngoáy tai ở khung 2 khi đứng yên
  const twitch = !mv && f === 2 ? 1 : 0;
  b.ell(hx - 1.4 + lean, hy - 4.2, 1.1, 3, pal(JADE_W.lt, JADE_W.md, JADE_W.md, JADE_W.dk), { rot: -0.25 + lean * 0.3, noHi: true });
  b.ell(hx + 0.6 + lean + twitch * 0.4, hy - 4.4 + twitch * 0.5, 1.2, 3.1, JADE_W, { rot: -0.1 + lean * 0.3 + twitch * 0.35 });
  b.line(hx + 0.6 + lean, hy - 6, hx + 0.6 + lean + twitch * 0.5, hy - 3.6, EAR_IN);
  b.ell(hx, hy, 3.3, 2.9, JADE_W);
  // mắt, mũi, má
  b.set(hx + 1.2, hy - 0.6, EYE); b.set(hx + 1.2, hy + 0.4, EYE);
  b.set(hx + 3, hy + 0.5, '#ff6f91');
  b.set(hx + 2, hy + 1.4, BLUSH);
  // dây ngọc bích trên cổ
  b.set(hx - 1.5, hy + 2.4, '#3fd0a0'); b.set(hx - 0.5, hy + 2.6, '#9ff5d6');
  // chân trước
  b.set(hx - 0.2, 16, JADE_W.md); b.set(hx + 0.8, 16, JADE_W.lt);
}

const BAT = pal('#d9c6ff', '#a98bec', '#7d5bd0', '#4f3596');
const MEMB = pal('#b79cf0', '#8a6ad8', '#5f43a8', '#3e2a78');
const BAT_FACE = pal('#f3eaff', '#d8c8f8', '#bba5ee', '#9a82d6');
function drawBat(b, f) {
  const cx = 10;
  const cy = 9.6;
  // cánh: lên / ngang / xuống / ngang
  const tips = [[[17, 3.6], [15.2, 9.2]], [[18, 8], [15, 11.4]], [[16.6, 13.4], [13.6, 13.2]], [[18, 8.6], [15, 11.6]]][f];
  for (const s of [1, -1]) {
    const [[tx, ty], [lx, ly]] = tips;
    const X = (x) => cx + (x - cx) * s;
    b.poly([[X(12.2), cy - 1.6], [X(tx), ty], [X(tx - 1.2), ty + 2.2], [X((tx + lx) / 2), (ty + ly) / 2 + 1.3], [X(lx), ly], [X(12.2), cy + 1.8]],
      (x, y) => (y < (ty + ly) / 2 - 1 ? MEMB.lt : y > ly - 1 ? MEMB.dk : MEMB.md));
    b.line(X(12.4), cy - 1.2, X(tx - 0.2), ty + 0.2, BAT.lt);
  }
  b.ell(cx, cy, 3.4, 3.3, BAT);
  // tai nhọn
  b.set(cx - 2, cy - 3.6, BAT.md); b.set(cx - 2, cy - 4.6, BAT.lt); b.set(cx - 1, cy - 3.6, BAT.md);
  b.set(cx + 2, cy - 3.6, BAT.md); b.set(cx + 2, cy - 4.6, BAT.lt); b.set(cx + 1, cy - 3.6, BAT.md);
  b.ell(cx + 0.8, cy + 0.6, 2.2, 1.7, BAT_FACE, { noHi: true });
  b.set(cx, cy - 0.2, EYE); b.set(cx + 2, cy - 0.2, EYE);
  b.set(cx + 1, cy + 1.4, '#7a2e4a');
  b.set(cx + 1, cy + 2.2, WHITE);
  // chân
  b.set(cx - 1, cy + 3.4, BAT.dk); b.set(cx + 1, cy + 3.4, BAT.dk);
}

const FOX = pal('#ffe0b8', '#ffad5c', '#f0833a', '#b0521f');
const CREAM = pal('#ffffff', '#fff6e8', '#f6e2c6', '#d8b98f');
const FOX_DARK = '#5a2a14';
function drawFox(b, f, mv) {
  const by = 13.4 + (mv ? [0, -0.6, 0, -0.6][f] : 0);
  // đuôi bông to, chóp trắng; vẫy theo khung
  const sw = mv ? [0.15, -0.1, 0.15, -0.1][f] : [0, 0.12, 0.2, 0.12][f];
  b.ell(4.8, by - 2.4, 2.2, 3.6, FOX, {
    rot: -0.55 + sw,
    tone: (nx, ny) => (ny < -0.45 ? CREAM : null),
  });
  // chân: chạy thì so le
  const legs = mv ? [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1]][f] : [0, 0, 0, 0];
  [6, 7.5, 10.4, 11.8].forEach((x, i) => {
    const up = legs[i];
    b.set(x, 15 - up, FOX.dk);
    b.set(x, 16 - up, i < 2 ? FOX.dk : FOX_DARK);
  });
  b.ell(8.8, by, 4.2, 2.6, FOX, { tone: (nx, ny) => (ny > 0.45 && nx > 0.1 ? CREAM : null) });
  const hx = 12.6;
  const hy = by - 3;
  // tai
  b.poly([[hx - 2.4, hy - 1.2], [hx - 1.6, hy - 4.6], [hx - 0.2, hy - 1.8]], FOX.md);
  b.poly([[hx + 0.2, hy - 1.8], [hx + 1.4, hy - 4.8], [hx + 2.4, hy - 1.2]], FOX.lt);
  b.set(hx - 1.5, hy - 2.6, FOX_DARK); b.set(hx + 1.4, hy - 3, '#7a2e1a');
  b.ell(hx, hy, 3, 2.6, FOX);
  // mõm trắng + mũi
  b.ell(hx + 2.2, hy + 1, 1.7, 1.2, CREAM, { noHi: true });
  b.set(hx + 3.7, hy + 0.3, EYE);
  b.set(hx + 1, hy - 0.6, EYE); b.set(hx + 1, hy + 0.3, EYE);
  b.set(hx - 0.2, hy + 1.2, BLUSH);
}

const GHOST = pal('#ffffff', '#ecf9ff', '#bfe6ff', '#7cb0dc');
const WISP = '#7fd8ff';
function drawGhost(b, f) {
  // đuôi khói lượn về phía sau
  const w = [0, 0.7, 0, -0.7][f];
  b.ell(4.2, 14.6 + w, 1.2, 1, GHOST);
  b.ell(5.6, 14.2 + w * 0.6, 1.7, 1.4, GHOST);
  b.ell(7.4, 13 + w * 0.3, 2.4, 2.2, GHOST);
  b.ell(10, 9.2, 4.4, 4.3, GHOST);
  // ngọn lửa hồn nhỏ ở chóp đuôi
  b.set(3, 15 + w, WISP); b.set(3, 14 + w, '#d6f4ff');
  // mặt
  b.set(10, 8, EYE); b.set(10, 9, EYE);
  b.set(13, 8, EYE); b.set(13, 9, EYE);
  b.set(11, 11, '#5a6fa0'); b.set(12, 11, '#5a6fa0');
  b.set(9, 10, BLUSH); b.set(14, 10, BLUSH);
  b.set(7, 6, WHITE); b.set(8, 5, WHITE);
}

const DRAGON = pal('#d6fff1', '#7fe8c8', '#33b893', '#1c7363');
const BELLY = pal('#fff6d6', '#ffe6a8', '#f0c86e', '#c4953e');
const GOLD = '#ffd54a';
const GOLD2 = '#c99a1a';
const MANE = '#ff7043';
function drawDragon(b, f) {
  const ph = (f * Math.PI) / 2;
  // thân rắn uốn sóng: chuỗi đốt nhỏ dần về đuôi (vẽ từ đuôi lên để đốt trước đè đốt sau)
  const seg = [];
  for (let i = 0; i < 6; i++) seg.push([11 - i * 1.55, 11 + Math.sin(ph + i * 1.15) * 1.4 + i * 0.35, 2.5 - i * 0.3]);
  // vây đuôi
  const [tx, ty] = seg[5];
  b.set(tx - 1.6, ty - 1, MANE); b.set(tx - 2.2, ty - 0.2, GOLD); b.set(tx - 1.6, ty + 0.8, MANE);
  for (let i = 5; i >= 0; i--) {
    const [x, y, r] = seg[i];
    b.ell(x, y, r, r * 0.95, DRAGON, { tone: (nx, ny) => (ny > 0.38 ? BELLY : null) });
    if (i % 2 === 0) b.set(x, y - r - 0.2, MANE);
  }
  // móng vuốt
  b.set(seg[0][0] + 0.5, seg[0][1] + 2.6, GOLD2); b.set(seg[2][0], seg[2][1] + 2.2, GOLD2);
  const hx = 13;
  const hy = 7.6 + Math.sin(ph) * 0.5;
  // bờm + sừng vàng
  b.set(hx - 2.8, hy - 0.6, MANE); b.set(hx - 3.2, hy + 0.6, MANE); b.set(hx - 2.4, hy - 1.6, '#ffab76');
  b.set(hx - 1, hy - 2.8, GOLD); b.set(hx - 1.6, hy - 3.8, GOLD); b.set(hx - 2.4, hy - 4.2, GOLD2);
  b.set(hx + 0.8, hy - 2.8, GOLD); b.set(hx + 0.6, hy - 3.8, GOLD); b.set(hx + 1.4, hy - 4.4, GOLD2);
  b.ell(hx, hy, 3, 2.6, DRAGON);
  b.ell(hx + 2.4, hy + 0.9, 1.6, 1.2, DRAGON, { tone: (nx, ny) => (ny > 0.2 ? BELLY : null) });
  b.set(hx + 1, hy - 0.6, EYE); b.set(hx + 1, hy + 0.3, '#ffe9a0');
  b.set(hx + 3.6, hy + 0.2, '#145a4e');
  // râu rồng
  b.set(hx + 3, hy + 2.4, GOLD); b.set(hx + 2, hy + 3, GOLD);
}

// mã hình (look.pet) -> cách vẽ. fly: lơ lửng (độ cao so với mặt đất), glow: quầng sáng riêng của loài
export const PET_ART = {
  slime: { draw: drawSlime, fps: [3, 10] },
  bunny: { draw: drawBunny, fps: [3, 10], hop: [0, -2, -3, -1] },
  bat: { draw: drawBat, fps: [12, 16], fly: 14, bob: 8 },
  fox: { draw: drawFox, fps: [3, 12] },
  ghost: { draw: drawGhost, fps: [4, 6], fly: 12, bob: 2.6, glow: '#9fe2ff' },
  dragon: { draw: drawDragon, fps: [5, 8], fly: 15, bob: 2.2 },
};
export const PET_KINDS = Object.keys(PET_ART);
const own = (k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(PET_ART, k);

export const petFlies = (kind) => own(kind) && !!PET_ART[kind].fly;
// Chiều cao đỉnh đầu thú so với mặt đất (đặt chữ/hiệu ứng phía trên)
export const petHeight = (kind) => (own(kind) ? 15 + (PET_ART[kind].fly || 0) : 15);

function build(kind, f, mv) {
  const b = new Buf();
  PET_ART[kind].draw(b, f, mv);
  return b;
}

// Điểm ảnh khung đứng yên (chưa viền) để icons.js vẽ icon cùng hình với thú ngoài thế giới
export function petPixels(kind) {
  if (!own(kind)) return null;
  return { w: W, h: H, data: build(kind, 0, false).rgba() };
}

const cache = new Map();
function frameCanvas(kind, f, mv, dir) {
  const key = `${kind}|${f}|${mv ? 1 : 0}|${dir}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (dir < 0) {
    g.translate(W, 0);
    g.scale(-1, 1);
    g.drawImage(frameCanvas(kind, f, mv, 1), 0, 0);
  } else {
    const b = build(kind, f, mv);
    b.outline();
    g.putImageData(new ImageData(b.rgba(), W, H), 0, 0);
  }
  cache.set(key, c);
  return c;
}

// Quầng sáng mềm (cache theo màu + bán kính). strong: quầng theo cấp, đậm ở vành ngoài thân để không bị thân thú che hết
const glowCache = new Map();
function glowSprite(col, r, strong = false) {
  const key = `${col}|${r}|${strong ? 1 : 0}`;
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const [R, G, B] = rgb(col);
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  const stops = strong ? [[0, 0.6], [0.5, 0.45], [0.75, 0.2], [1, 0]] : [[0, 0.55], [0.5, 0.2], [1, 0]];
  for (const [at, a] of stops) gr.addColorStop(at, `rgba(${R},${G},${B},${a})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(key, c);
  return c;
}

// Viền sáng 1px ôm sát hình thú (cấp 35+), ngoài lớp viền tối của khung
const rimCache = new Map();
function rimCanvas(kind, f, mv, dir, col) {
  const key = `${kind}|${f}|${mv ? 1 : 0}|${dir}|${col}`;
  let c = rimCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = W + 2;
  c.height = H + 2;
  const g = c.getContext('2d');
  const fc = frameCanvas(kind, f, mv, dir);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(fc, dx, dy);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col;
  g.fillRect(0, 0, W + 2, H + 2);
  rimCache.set(key, c);
  return c;
}

const shadowCache = new Map();
function shadowSprite(w) {
  let c = shadowCache.get(w);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w;
  c.height = 3;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,10,30,0.32)';
  g.fillRect(1, 0, w - 2, 3);
  g.fillRect(0, 1, w, 1);
  shadowCache.set(w, c);
  return c;
}

// Cấp thú: 20+ lấp lánh, 35+ quầng sáng, 50 quầng vàng
const tierOf = (lv) => (lv >= 50 ? 3 : lv >= 35 ? 2 : lv >= 20 ? 1 : 0);
const TIER_GLOW = ['', '', '#8fe3ff', '#ffe082'];
const TIER_STAR = ['', '#d6f4ff', '#bdf0ff', '#fff3a0'];

function star(ctx, x, y, c, big, s = 1) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, s, s);
  if (big) {
    ctx.fillRect(x - s, y, 3 * s, s);
    ctx.fillRect(x, y - s, s, 3 * s);
  }
}

const HEART = ['.x.x.', 'xxxxx', '.xxx.', '..x..'];
function heart(ctx, x, y, a, s) {
  ctx.globalAlpha = a;
  for (let r = 0; r < HEART.length; r++) {
    for (let k = 0; k < 5; k++) {
      if (HEART[r][k] !== 'x') continue;
      ctx.fillStyle = r === 1 && k === 1 ? '#ffd1dc' : '#ff5c8a';
      ctx.fillRect(x + (k - 2) * s, y + r * s, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

// Vẽ thú cưng. x, y: điểm mặt đất dưới chân thú. o: { t, dir, moving, lv, scale, happy (0..1: tim bay lên khi được cho ăn),
// noShadow, still (không nhấp nhô, dùng cho khung xem trước), shadowDY (bóng nằm thấp hơn y bao nhiêu: thú bay theo chủ đang nhảy) }
export function drawPet(ctx, x, y, kind, o = {}) {
  if (!own(kind)) return;
  const A = PET_ART[kind];
  const s = Math.max(1, Math.round(o.scale || 1));
  const t = o.t || 0;
  const mv = !!o.moving;
  const f = Math.floor(t * A.fps[mv ? 1 : 0]) % 4;
  const dir = o.dir < 0 ? -1 : 1;
  let lift = 0;
  if (o.still) lift = 0;
  else if (A.fly) lift = A.fly + Math.round(Math.sin(t * (A.bob > 4 ? 4 : 2.4)) * Math.min(2, A.bob));
  else if (mv && A.hop) lift = -A.hop[f];
  else if (mv && kind === 'slime') lift = [0, 1, 2, 1][f];
  // lớp thế giới ×3 (ctx.art = 3): làm tròn theo pixel nghệ thuật
  const q = ctx.art || 1;
  const X = Math.round(x * q) / q;
  const Y = Math.round(y * q) / q;
  const tier = tierOf(o.lv || 1);
  if (!o.noShadow) {
    const sw = A.fly ? 8 : kind === 'slime' ? 12 : 10;
    const sh = shadowSprite(sw);
    const sy = Y + Math.max(0, Math.round(o.shadowDY || 0));
    ctx.drawImage(sh, 0, 0, sw, 3, X - (sw * s) / 2, sy - 2 * s, sw * s, 3 * s);
  }
  const top = Y - (H + lift) * s;
  const cy = top + 10 * s;
  const glow = tier >= 2 ? TIER_GLOW[tier] : A.glow;
  const pulse = 0.75 + Math.sin(t * 3) * 0.2;
  if (glow) {
    const r = tier >= 2 ? 18 : 12;
    const gs = glowSprite(glow, r, tier >= 2);
    ctx.globalAlpha = pulse;
    ctx.drawImage(gs, X - r * s, cy - r * s, r * 2 * s, r * 2 * s);
    ctx.globalAlpha = 1;
  }
  if (tier >= 2) {
    ctx.globalAlpha = 0.45 + pulse * 0.5;
    ctx.drawImage(rimCanvas(kind, f, mv, dir, TIER_GLOW[tier]), X - (AX + 1) * s, top - s, (W + 2) * s, (H + 2) * s);
    ctx.globalAlpha = 1;
  }
  const fc = frameCanvas(kind, f, mv, dir);
  ctx.drawImage(fc, 0, 0, W, H, X - AX * s, top, W * s, H * s);
  if (tier >= 1) {
    // vài ngôi sao nhỏ nhấp nháy quanh thú (khung xem trước lớn: nhân tọa độ và cỡ theo tỉ lệ)
    for (let i = 0; i < tier; i++) {
      const ph = t * 1.4 + i * 0.37;
      const k = ph % 1;
      if (k > 0.45) continue;
      const n = Math.floor(ph) * 7 + i * 13;
      star(ctx, X + (((n * 37) % 15) - 7) * s, cy + (((n * 23) % 11) - 10) * s, TIER_STAR[tier], k > 0.12 && k < 0.3, s);
    }
  }
  if (o.happy > 0 && o.happy < 1) {
    // tim bay lên khi được cho ăn
    const p = o.happy;
    heart(ctx, X - 3 * s, Math.round(top + (2 - p * 9) * s), 1 - p * 0.8, s);
    if (p > 0.2) heart(ctx, X + 4 * s, Math.round(top + (4 - (p - 0.2) * 9) * s), 1 - p * 0.8, s);
  }
}
