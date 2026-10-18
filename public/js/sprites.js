// Đồ họa nhân vật vẽ hoàn toàn bằng code (không dùng ảnh ngoài).
// Mọi hàm vẽ nhận ctx ở độ phân giải thấp (1 đơn vị = 1 pixel nghệ thuật).
// Ninja chibi được dựng từng điểm ảnh vào bộ đệm theo tư thế (pose), tự viền tối 1px,
// rồi cache vào canvas offscreen theo khóa (kiểu, khung, hướng, trang bị, bảng màu).

export const ELEMENT_COLORS = { fire: '#ff7043', water: '#42a5f5', wind: '#7ccd5a' };
// Chiều cao nhân vật (từ lòng bàn chân tới đỉnh tóc), dùng cho nhãn tên / hitbox
export const NINJA_H = 28;

const CLASS_OUTFIT = { kiem: '#a8383c', tieu: '#b8682c', kunai: '#2e5fa3', cung: '#22808c', dao: '#3d8a40', quat: '#7d8a24' };
// 12 bậc: Gỗ, Đồng, Sắt, Bạc, Vàng, Ngọc, Huyền, Long, Thiên, Thần, Tiên, Thánh
const TIER_OUTFIT = ['#7a5a3c', '#9a5a2e', '#55606e', '#6f8094', '#b48a1c', '#1f9070', '#5e40b8', '#b02a24', '#2a80c8', '#b850b4', '#d8b23a', '#c2185b'];
const TIER_METAL = ['#a0703c', '#c9803c', '#9aa4ad', '#dfe6ec', '#f2c230', '#3fd0a0', '#8a63e8', '#e8463c', '#5cc4ff', '#ff7ef0', '#fff176', '#ff4081'];
const TIER_TRIM = ['#e8dcc0', '#f0d8b0', '#d0d8e0', '#f4f8fc', '#ffe27a', '#f2c230', '#f2c230', '#ffd54a', '#e0f6ff', '#ffe46a', '#ffffff', '#ffd6e8'];
const HAIR = ['#2a2433', '#4a2c20', '#7a4628', '#273760', '#7c2a34', '#d8d4dc', '#3c2a4a', '#5a3018'];
const IRIS = ['#3b2a6a', '#1f4f8a', '#5a3218', '#1f6a4a', '#7a2a4a', '#2a2a3a'];
const SKIN = ['#ffd6b0', '#fcd0a8', '#f6c49a'];

function parseColor(c) {
  if (c[0] === '#') {
    let s = c.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

const shadeCache = new Map();
function shade(col, f) {
  const key = `${col}|${f}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  let [r, g, b] = parseColor(col);
  if (f < 0) {
    r *= 1 + f; g *= 1 + f; b *= 1 + f;
  } else {
    r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
  }
  const out = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, out);
  return out;
}
export { shade };

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Băm trộn đều (chọn kiểu tóc, màu tóc… theo tên)
function mixHash(s) {
  let h = hash(s) ^ 0x5bd1e995;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// ---------- Màu dạng số nguyên 0xRRGGBB
const intCache = new Map();
function C(c) {
  if (typeof c === 'number') return c;
  if (!c) return 0x808080;
  let v = intCache.get(c);
  if (v === undefined) {
    const [r, g, b] = parseColor(c);
    v = (r << 16) | (g << 8) | b;
    intCache.set(c, v);
  }
  return v;
}
// Đổ bóng lệch sắc: tối ngả tím-xanh, sáng ngả vàng ấm
function sh(n, f) {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  let tr = 255;
  let tg = 250;
  let tb = 226;
  let k = f;
  if (f < 0) {
    tr = 26; tg = 14; tb = 46; k = -f;
  }
  return (((r + (tr - r) * k) | 0) << 16) | (((g + (tg - g) * k) | 0) << 8) | ((b + (tb - b) * k) | 0);
}
function mx(a, b, t) {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
  const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
  const bl = (a & 255) * (1 - t) + (b & 255) * t;
  return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}
function css(n, a = 1) {
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ================= BỘ ĐỆM ĐIỂM ẢNH =================
const FW = 76;
const FH = 64;
const OX = 36; // cột ứng với x = 0 (giữa chân)
const OY = 56; // hàng ứng với y = 0 (ngay dưới lòng bàn chân)
const BUF = new Int32Array(FW * FH);
const TAG = new Uint8Array(FW * FH); // 1 = điểm ảnh vũ khí
const TMP = new Int32Array(FW * FH);
let TAGV = 0;

function clr() {
  BUF.fill(-1);
  TAG.fill(0);
}
function px(x, y, c) {
  if (c === undefined || c === null || c < 0) return;
  const gx = OX + x;
  const gy = OY + y;
  if (gx < 0 || gy < 0 || gx >= FW || gy >= FH) return;
  const i = gy * FW + gx;
  BUF[i] = c;
  TAG[i] = TAGV;
}
function erase(x, y) {
  const gx = OX + x;
  const gy = OY + y;
  if (gx < 0 || gy < 0 || gx >= FW || gy >= FH) return;
  BUF[gy * FW + gx] = -1;
}
function at(x, y) {
  const gx = OX + x;
  const gy = OY + y;
  if (gx < 0 || gy < 0 || gx >= FW || gy >= FH) return -1;
  return BUF[gy * FW + gx];
}
// Dán bản đồ ký tự: '.' bỏ qua, '_' xóa điểm
function stamp(x, y, rows, P) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      if (ch === '_') erase(x + i, y + r);
      else px(x + i, y + r, P[ch]);
    }
  }
}
function linePts(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (let n = 0; n < 200; n++) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return pts;
}

// ================= BẢNG MÀU =================
const INK = 0x1d1424;
function metalSet(P, base, hi, mid, lo) {
  P[hi] = sh(base, 0.55);
  P[mid] = base;
  P[lo] = sh(base, -0.38);
}

function makePalette(sp) {
  const P = {};
  P.k = INK;
  P.w = 0xffffff;
  P.s = sp.skin; P.S = sh(sp.skin, -0.2); P.T = sh(sp.skin, -0.4); P.h = sh(sp.skin, 0.4);
  P.B = mx(sp.skin, 0xff6b88, 0.4);
  P.m = mx(sh(sp.skin, -0.45), 0xb03040, 0.4);
  const hc = sp.hairCol;
  P.H = hc; P.J = sh(hc, -0.3); P.G = sh(hc, -0.52); P.I = sh(hc, 0.3); P['^'] = sh(hc, 0.36);
  P.e = INK; P.i = sp.iris; P.j = sh(sp.iris, 0.5); P.d = sh(sp.iris, -0.5);
  // băng trán
  P.b = sp.bandCol; P.c = sh(sp.bandCol, -0.32);
  if (sp.ht >= 0) metalSet(P, C(TIER_METAL[sp.ht]), 'n', 'M', 'N');
  else metalSet(P, 0x9aa4ad, 'n', 'M', 'N');
  // áo
  const o = sp.outfit;
  P.o = o; P.O = sh(o, -0.26); P.D = sh(o, -0.48); P.q = sh(o, 0.22);
  P.x = sp.trim; P.u = sp.under;
  // điểm nhấn (khăn / thắt lưng)
  const a = sp.accent;
  P.a = a; P.A = sh(a, -0.3); P.z = sh(a, 0.38);
  // quần
  const p = sp.pants;
  P.p = p; P.P = sh(p, -0.28); P.Q = sh(p, 0.18);
  P.r = sp.wrap; P.R = sh(sp.wrap, -0.22);
  // giày / găng
  P.f = 0x3a3046; P.F = 0x241c2e; P.y = 0x5d5170;
  P.g = sp.glove; P.E = sh(sp.glove, -0.3);
  // vũ khí
  const wc = sp.wcol;
  if (sp.wt === 0) {
    P.W = 0xb07a48; P.V = 0x7a4e2a; P.X = 0xd8a874;
  } else {
    P.W = sh(wc, 0.18); P.V = sh(wc, -0.35); P.X = sh(wc, 0.72);
  }
  P.K = 0x3a2a3e; P.L = sp.accent; P.Y = 0xf2c230; P.U = 0xa0701a;
  P.Z = sp.maskCol;
  // phụ kiện (gỗ, giấy, trắng xám)
  P[1] = 0x8a5a34; P[2] = 0x5e3a20; P[3] = 0xb8834e;
  P[4] = 0xf4f0e6; P[5] = 0xc8c0b4; P[6] = 0x9a9088;
  P[7] = 0xe8c66a; P[8] = 0xb08a3a; P[9] = 0x7a5a24;
  if (sp.extra) Object.assign(P, sp.extra);
  return P;
}

// ================= ĐẦU =================
// Mặt nhìn nghiêng 3/4 về bên phải. Lưới 16 cột bắt đầu từ x = -8, hàng đầu y = -26.
const FACE = [
  '....ssssssss....',
  '...sssssssssss..',
  '..sssssssssssss.',
  '..sssssssssssss.',
  '..sssssssssssss.',
  '..sssssssssssss.',
  '..sssssssssssss.',
  '..Sssssssssssss.',
  '...Sssssssssss..',
  '....SSssssssS...',
  '......SSSSS.....',
];

// Kiểu tóc: lưới 17 cột từ x = -9, hàng đầu y = -28. H nền, J tối, G rất tối, I sáng
const HAIR_STYLES = {
  // Nam
  spiky: [
    '.....J..IH...H...',
    '....JHH.IHH.HHJ..',
    '...JHHI^IHHHHHHJ.',
    '..JJHHHIHHHHHHHHJ',
    '..GJ............J',
    '..GJJH.HJ.HHJ.H..',
    '..GJJJ...........',
    '..GJJJ...........',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '....G............',
  ],
  neat: [
    '......JHHHJ......',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '..GJ.............',
    '..GJJHHHJHHHHJH..',
    '..GJJJ...........',
    '..GJJJ...........',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '.................',
  ],
  topknot: [
    '.................',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '..GJ.............',
    '..GJJHH.JHHHJ.H..',
    '..GJJJ...........',
    '..GJJJ...........',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '.................',
  ],
  wild: [
    '...J....J..H.....',
    '..JHH.JHHHHHHJ...',
    '..JJHHI^IHHHHHHJ.',
    '.JJJHHHIHHHHHHHHJ',
    '.GJJ............J',
    '.GJJJJH.HJ.HHJ.H.',
    '.GGJJJ...........',
    '.GGJJJ...........',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '...G.............',
  ],
  // Nữ
  long: [
    '......JHHHJ......',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '..GJ.............',
    '..GJJHHHJHHHHHHJ.',
    '..GJJJJ........HJ',
    '..GJJJJ........HJ',
    '..GJJJ.........IJ',
    '..GJJJ.........HJ',
    '..GJJ...........J',
    '..GJ.............',
  ],
  bun: [
    '......JHHHJ......',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '..GJ.............',
    '..GJJHHHJ.HHHJ...',
    '..GJJJH........H.',
    '..GJJJ.........J.',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '.................',
  ],
  pony: [
    '......JHHHJ......',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '..GJ.............',
    '..GJJHH.JHHHHHJ..',
    '..GJJJ.........H.',
    '..GJJJ.........J.',
    '..GJJ............',
    '..GJJ............',
    '...GJ............',
    '.................',
  ],
  bob: [
    '......JHHHJ......',
    '....JHHIHHHHJ....',
    '...JHI^IHHHHHHJ..',
    '..JJHHIHHHHHHHHJ.',
    '.GJ..............',
    '.GJJJHHHHJHHHHHJ.',
    '.GJJJJJ........HJ',
    '.GJJJJJ........HJ',
    '.GJJJJ.........IJ',
    '.GGJJJ.........HJ',
    '..GGJ..........JJ',
    '.................',
  ],
};
const MALE_HAIR = ['spiky', 'neat', 'topknot', 'wild'];
const FEMALE_HAIR = ['long', 'bun', 'pony', 'bob'];

function drawEyes(P, hx, hy, mode, female) {
  if (mode === 'closed') {
    // mắt híp cười ^ ^
    px(hx - 1, hy - 21, P.e); px(hx, hy - 22, P.e); px(hx + 1, hy - 21, P.e);
    px(hx + 4, hy - 21, P.e); px(hx + 5, hy - 22, P.e); px(hx + 6, hy - 21, P.e);
    return;
  }
  if (mode === 'dead') {
    // mắt nhắm xoáy
    for (const ex of [0, 4]) {
      px(hx + ex - 1, hy - 21, P.e); px(hx + ex, hy - 21, P.e); px(hx + ex + 1, hy - 21, P.e);
      px(hx + ex, hy - 22, P.S);
    }
    return;
  }
  // mắt to: mí đậm, điểm sáng trắng trên-trái, con ngươi tối, ánh phản chiếu dưới
  for (const ex of [0, 4]) {
    px(hx + ex, hy - 22, P.e); px(hx + ex + 1, hy - 22, P.e);
    px(hx + ex, hy - 21, P.w); px(hx + ex + 1, hy - 21, P.d);
    px(hx + ex, hy - 20, P.i); px(hx + ex + 1, hy - 20, P.d);
    px(hx + ex, hy - 19, P.j); px(hx + ex + 1, hy - 19, P.i);
  }
  if (female) {
    px(hx - 1, hy - 22, P.e);
    px(hx + 6, hy - 22, P.e);
  }
}

// Lông mày vẽ đè lên mái tóc (mái che hàng y-23), cau lại khi giận
function drawBrows(P, sp, hx, hy, mode) {
  if (sp.beard || mode === 'closed' || mode === 'dead') return;
  const bc = P.G;
  if (mode === 'angry') {
    px(hx - 1, hy - 23, P.e); px(hx, hy - 23, P.e); px(hx + 1, hy - 23, bc);
    px(hx + 4, hy - 23, bc); px(hx + 5, hy - 23, P.e); px(hx + 6, hy - 23, P.e);
  } else {
    px(hx, hy - 23, bc); px(hx + 1, hy - 23, bc);
    px(hx + 4, hy - 23, bc); px(hx + 5, hy - 23, bc);
  }
}

function drawHead(P, sp, hx, hy, pose) {
  stamp(hx - 8, hy - 26, FACE, P);
  // má sáng phía trước
  px(hx + 5, hy - 24, P.h); px(hx + 6, hy - 23, P.h);
  // tai
  px(hx - 3, hy - 21, P.S); px(hx - 3, hy - 20, P.T);
  const eyes = pose.eyes || sp.eyes || 'open';
  drawEyes(P, hx, hy, eyes, sp.female);
  // má hồng + miệng
  if (eyes !== 'dead') {
    px(hx - 2, hy - 18, P.B); px(hx - 1, hy - 18, P.B); px(hx + 5, hy - 18, P.B);
  }
  if (sp.mask && !pose.noMask) {
    // khăn che mặt kéo lên mũi
    const Z = P.Z;
    const Zd = sh(Z, -0.3);
    for (let x = -2; x <= 6; x++) px(hx + x, hy - 18, x >= 4 ? sh(Z, 0.3) : x <= -2 ? Zd : Z);
    for (let x = -3; x <= 6; x++) px(hx + x, hy - 17, x <= -2 ? Zd : Z);
    for (let x = -2; x <= 4; x++) px(hx + x, hy - 16, Zd);
  } else if (eyes === 'dead') {
    px(hx + 3, hy - 17, P.m); px(hx + 4, hy - 17, P.m);
  } else {
    px(hx + 3, hy - 17, P.m);
  }
  if (sp.beard) drawBeard(P, sp, hx, hy);
  if (sp.headGear) {
    sp.headGear(P, sp, hx, hy, pose);
    drawBrows(P, sp, hx, hy, eyes);
    return;
  }
  const style = HAIR_STYLES[sp.hair] || HAIR_STYLES.spiky;
  stamp(hx - 9, hy - 28, style, P);
  drawBrows(P, sp, hx, hy, eyes);
  if (sp.hair === 'bun') {
    // búi tóc + trâm cài
    stamp(hx - 11, hy - 28, [
      '..HHH..',
      '.HIHHJ.',
      'JHHHHJ.',
      'JJHHJJ.',
      '.GJJG..',
    ], P);
    px(hx - 12, hy - 29, P.z); px(hx - 11, hy - 28, P.a); px(hx - 6, hy - 26, P.a); px(hx - 5, hy - 25, P.Y);
  }
  if (sp.hair === 'topknot') {
    // búi tóc samurai trên đỉnh, buộc dây màu hệ; chỉ nhô 2 hàng để không vượt NINJA_H (chân dung, thanh máu)
    stamp(hx - 6, hy - 29, ['.JH^J', '.GJHJ', '..aA.'], P);
  }
  if (!sp.noBand) drawBand(P, sp, hx, hy, pose);
  if (sp.fmask) drawFashionMask(P, sp, hx, hy);
}

function drawBand(P, sp, hx, hy, pose) {
  const y0 = hy - 24;
  for (let x = -7; x <= 6; x++) px(hx + x, y0, x <= -5 ? P.c : P.b);
  px(hx + 6, y0, P.c);
  if (sp.ht >= 0) {
    // miếng kim loại hộ trán (2 hàng, rộng hơn theo tier)
    const w = sp.ht >= 4 ? 6 : 5;
    const x0 = hx + 6 - w;
    for (let x = 0; x < w; x++) {
      px(x0 + x, y0 - 1, x === w - 1 ? P.M : P.n);
      px(x0 + x, y0, x === 0 ? P.M : x === w - 1 ? P.N : P.M);
    }
    // hoa văn khắc
    const mid = x0 + (w >> 1);
    px(mid, y0, P.N);
    if (sp.ht >= 6) px(mid - 1, y0, P.N);
    if (sp.ht >= 8) { px(mid, y0 - 1, 0xffffff); px(mid - 1, y0 - 1, P.M); }
  }
  // đuôi băng trán bay phía sau
  const ph = pose.flap || 0;
  const long = sp.ht >= 6 ? 1 : 0;
  const tails = pose.moving
    ? [[-8, 0], [-9, ph], [-10, 1], [-11, 1 + ph], [-12, 2 - ph]]
    : [[-8, 0], [-8, 1], [-9, 2], [-9, 3], [-10, 4 - ph]];
  const n = 4 + long;
  for (let i = 0; i < n; i++) {
    const [tx, ty] = tails[i];
    px(hx + tx, y0 + ty, i % 2 ? P.c : P.b);
    if (i > 0 && i < n - 1) px(hx + tx, y0 + ty + 1, P.c);
  }
}

function drawBeard(P, sp, hx, hy) {
  // râu bạc dài (trưởng làng) hoặc râu ngắn (thợ rèn)
  const c1 = P[4];
  const c2 = P[5];
  if (sp.beard === 'long') {
    stamp(hx - 4, hy - 19, [
      '...44444444.',
      '..444444444.',
      '..54444444..',
      '...5444445..',
      '....54444...',
      '....5444....',
      '.....544....',
      '.....54.....',
      '......5.....',
    ], { 4: c1, 5: c2 });
    // lông mày bạc
    px(hx - 1, hy - 23, c1); px(hx, hy - 23, c1); px(hx + 1, hy - 23, c1);
    px(hx + 4, hy - 23, c1); px(hx + 5, hy - 23, c1); px(hx + 6, hy - 23, c1); px(hx + 7, hy - 22, c2);
    px(hx - 2, hy - 22, c2);
  } else if (sp.beard === 'goatee') {
    stamp(hx, hy - 18, ['.4444.', '.5444.', '..44..', '..54..', '...5..'], { 4: c1, 5: c2 });
    px(hx - 1, hy - 23, c1); px(hx, hy - 23, c1); px(hx + 4, hy - 23, c1); px(hx + 5, hy - 23, c1);
  } else if (sp.beard === 'short') {
    const d = P.J;
    stamp(hx - 3, hy - 19, ['J........J', 'JJ......JJ', '.JJ.mm.JJ.', '..JJJJJJ..'], { J: d, m: P.m });
  }
}

// ================= THÂN =================
function drawTorso(P, sp, ux, by, pose) {
  const X = ux;
  const Y = by;
  const wide = sp.bulk || 0;
  for (let y = -15; y <= -11; y++) {
    for (let x = -4 - wide; x <= 4 + wide; x++) {
      let c = P.o;
      if (x <= -3 - wide) c = P.O;
      else if (x >= 4 + wide) c = P.q;
      px(X + x, Y + y, c);
    }
  }
  // cổ áo chữ V + viền vạt áo chéo
  if (!sp.noCollar) {
    px(X, Y - 15, P.x); px(X + 1, Y - 15, P.u); px(X + 2, Y - 15, P.u); px(X + 3, Y - 15, P.x);
    px(X + 1, Y - 14, P.x); px(X + 2, Y - 14, P.u); px(X + 3, Y - 14, P.x);
    px(X + 2, Y - 13, P.x); px(X + 3, Y - 12, P.x); px(X + 3, Y - 11, P.x);
    px(X - 2, Y - 14, P.O); px(X - 2, Y - 13, P.O);
  }
  const at = sp.at;
  // hoa văn theo tier áo: viền vai, gia huy trước ngực
  if (at >= 5) {
    px(X - 1, Y - 12, P.x);
    px(X - 2, Y - 13, sh(P.x, -0.25)); px(X, Y - 13, sh(P.x, -0.25));
    px(X - 1, Y - 14, sh(P.x, -0.25)); px(X - 1, Y - 13, P.q);
  }

  // thắt lưng màu hệ
  if (!sp.noBelt) {
    for (let x = -4 - wide; x <= 4 + wide; x++) {
      px(X + x, Y - 10, x <= -3 - wide ? P.A : P.a);
      px(X + x, Y - 9, x <= -3 - wide ? sh(P.A, -0.2) : P.A);
    }
    px(X + 1, Y - 10, P.z); px(X + 2, Y - 10, P.z); px(X + 2, Y - 9, P.a);
    if (at >= 7) {
      // khóa thắt lưng kim loại
      px(X + 1, Y - 10, 0xfff0b0); px(X + 2, Y - 10, P.Y); px(X + 1, Y - 9, P.Y); px(X + 2, Y - 9, P.U);
    }
  }
  // vạt áo dưới (tách ở giữa)
  if (!sp.robe) {
    for (let x = -5; x <= -1; x++) px(X + x, Y - 8, x <= -4 ? P.D : P.O);
    for (let x = 1; x <= 5; x++) px(X + x, Y - 8, x >= 4 ? P.q : P.o);
    for (let x = -5; x <= -3; x++) px(X + x, Y - 7, P.D);
    for (let x = 3; x <= 5; x++) px(X + x, Y - 7, x >= 5 ? P.o : P.O);
    if (at >= 3) {
      px(X - 5, Y - 7, P.x); px(X + 5, Y - 7, P.x); px(X - 4, Y - 7, P.x); px(X + 4, Y - 7, P.x);
    }
    if (at >= 5) { px(X + 2, Y - 8, P.x); px(X - 3, Y - 8, P.x); }
    if (at >= 6) {
      // hoa văn sóng mây dọc vạt áo
      px(X - 1, Y - 8, P.x); px(X + 4, Y - 8, sh(P.x, -0.2)); px(X - 4, Y - 7, sh(P.x, -0.3)); px(X + 3, Y - 7, P.x);
    }
  }
  if (at >= 8) {
    // nẹp cổ áo ánh kim hai bên
    px(X - 1, Y - 15, P.Y); px(X + 4, Y - 15, P.Y); px(X + 4, Y - 14, P.U);
  }
  if (at >= 9) {
    // giáp ngực ánh kim quanh gia huy
    px(X - 3, Y - 12, P.N); px(X - 3, Y - 11, P.M); px(X, Y - 11, P.M); px(X - 2, Y - 11, P.n);
    px(X - 1, Y - 13, 0xffffff);
  }
}

// Áo choàng ngắn cho trang phục bậc cao (Tiên, Thánh), bay ngược hướng chạy
function drawCape(P, sp, ux, by, p, f) {
  const fly = p.moving;
  const bot = fly ? -6 : -4;
  const ph = p.flap || 0;
  for (let y = -16; y <= bot; y++) {
    const k = y + 16;
    const xl = fly ? -5 - (k >> 1) - (k > 6 ? ph : 0) : -5 - (k >> 2) - (k > 9 ? ph : 0);
    const yy = fly && k > 6 ? y - ((k - 6) >> 1) : y;
    for (let x = xl; x <= -2; x++) {
      let c = x === xl ? P.x : x === xl + 1 ? P.D : P.O;
      if (y === bot && x > xl) c = sh(P.x, -0.25);
      px(ux + x, by + yy, c);
    }
  }
}

// Áo dài phủ chân (trưởng làng, bà thuốc, lão gia tộc)
function drawRobe(P, sp, ux, by, f) {
  const X = ux;
  for (let y = -8; y <= -1; y++) {
    const half = 5 + (y > -4 ? 1 : 0);
    for (let x = -half; x <= half; x++) {
      let c = P.o;
      if (x <= -half + 1) c = P.O;
      else if (x >= half) c = P.q;
      if (y === -1) c = P.D;
      px(X + x, y + (y < -4 ? by : 0), c);
    }
  }
  // nếp gấp
  px(X - 1, -6, P.O); px(X - 1, -5, P.O); px(X + 2, -4, P.O); px(X + 2, -3, P.O); px(X - 2, -2, P.O);
  if (sp.robeTrim) for (let x = -6; x <= 6; x++) px(X + x, -2, P.x);
  // mũi giày
  px(X + 4, -1, P.f); px(X + 5, -1, P.f); px(X + 6, -1, P.y);
  if (f) {
    px(X - 6, -1, P.O);
  }
}

function drawLeg(P, sp, hipX, dx, lift, back) {
  const footY = -1 - lift;
  const top = -8;
  const end = footY - 2;
  const n = Math.max(1, end - top);
  const wrapRows = 2;
  const greave = sp.pt >= 4;
  for (let y = top; y <= end; y++) {
    const fr = (y - top) / n;
    const x = hipX + Math.round(dx * fr);
    const wrap = y > end - wrapRows;
    let c0;
    let c1;
    let c2;
    if (wrap) {
      if (greave) {
        c0 = P.N; c1 = P.M; c2 = P.n;
      } else {
        c0 = P.R; c1 = (y & 1) ? P.r : P.R; c2 = P.r;
      }
    } else {
      c0 = P.P; c1 = back ? P.P : P.p; c2 = back ? P.p : P.Q;
    }
    if (back) {
      c0 = sh(c0, -0.18); c1 = sh(c1, -0.18); c2 = sh(c2, -0.18);
    }
    px(x, y, c0); px(x + 1, y, c1); px(x + 2, y, c2);
  }
  if (sp.pt >= 7 && !back) {
    // giáp gối
    const kx = hipX + Math.round(dx * 0.5);
    px(kx + 1, top + 2, P.M); px(kx + 2, top + 2, P.n);
  }
  // giày ninja (mũi hướng về trước)
  const sx = hipX + dx;
  const d = back ? -0.2 : 0;
  px(sx, footY - 1, sh(P.F, d)); px(sx + 1, footY - 1, sh(P.f, d)); px(sx + 2, footY - 1, sh(P.y, d));
  px(sx, footY, sh(P.F, d)); px(sx + 1, footY, sh(P.f, d)); px(sx + 2, footY, sh(P.f, d)); px(sx + 3, footY, sh(P.f, d));
  if (sp.pt >= 5) px(sx + 2, footY - 1, sh(P.M, d));
}

// Cánh tay: vai -> bàn tay, dày 2px; tay áo, cổ tay quấn băng/găng, nắm tay
function drawArm(P, sp, sx, sy, hx, hy, front) {
  const pts = linePts(sx, sy, hx, hy);
  const n = pts.length;
  const horiz = Math.abs(hx - sx) > Math.abs(hy - sy);
  const bare = sp.bareArms;
  for (let i = 0; i < n - 1; i++) {
    const [x, y] = pts[i];
    const fr = n > 1 ? i / (n - 1) : 0;
    let a;
    let b;
    if (fr < 0.5 && !bare) {
      a = front ? P.O : P.D; b = front ? P.o : P.O;
    } else if (fr < 0.62 && !bare) {
      a = front ? sh(P.x, -0.15) : sh(P.x, -0.35); b = a;
    } else if (bare && fr < 0.62) {
      a = front ? P.S : P.T; b = front ? P.s : P.S;
    } else {
      a = front ? P.E : sh(P.E, -0.25); b = front ? P.g : P.E;
      if (sp.at >= 4 && fr < 0.8) {
        a = front ? P.N : sh(P.N, -0.2); b = front ? P.M : P.N;
      }
    }
    if (horiz) {
      px(x, y, b); px(x, y + 1, a);
    } else {
      px(x, y, a); px(x + 1, y, b);
    }
  }
  // nắm tay 2x2
  const s1 = front ? P.s : P.S;
  const s2 = front ? P.S : P.T;
  px(hx, hy, s1); px(hx + 1, hy, s1); px(hx, hy + 1, s2); px(hx + 1, hy + 1, s2);
}

function drawShoulderPad(P, sp, ux, by) {
  if (sp.at < 2) return;
  const big = sp.at >= 7;
  const X = ux + 2;
  const Y = by - 15;
  px(X, Y, P.n); px(X + 1, Y, P.n); px(X + 2, Y, P.M);
  px(X, Y + 1, P.M); px(X + 1, Y + 1, P.M); px(X + 2, Y + 1, P.N);
  if (big) {
    px(X + 3, Y + 1, P.N); px(X - 1, Y, P.n); px(X + 3, Y, P.M);
    px(X, Y + 2, P.N); px(X + 1, Y + 2, P.N); px(X + 2, Y + 2, P.N);
  }
  if (sp.at >= 9) {
    // vai giáp nhiều lớp, viền trim, ánh kim
    px(X - 1, Y - 1, P.n); px(X, Y - 1, 0xffffff); px(X + 1, Y - 1, P.n); px(X + 2, Y - 1, P.M);
    px(X, Y + 3, P.x); px(X + 1, Y + 3, P.x); px(X + 2, Y + 3, P.x); px(X + 3, Y + 2, P.x);
  }
}
// Vai giáp sau (vẽ trước thân, chỉ lộ một phần)
function drawBackPad(P, sp, ux, by) {
  const X = ux - 6;
  const Y = by - 15;
  px(X, Y, P.M); px(X + 1, Y, P.n); px(X + 2, Y, P.M);
  px(X, Y + 1, P.N); px(X + 1, Y + 1, P.M); px(X + 2, Y + 1, P.N);
  px(X, Y + 2, sh(P.x, -0.3)); px(X + 1, Y + 2, sh(P.x, -0.3));
}

// ================= KHĂN QUÀNG =================
function drawScarfNeck(P, sp, ux, by) {
  const X = ux;
  const Y = by;
  for (let x = -4; x <= 4; x++) {
    px(X + x, Y - 16, x <= -3 ? P.A : P.a);
    px(X + x, Y - 15, x <= -2 ? P.A : x >= 3 ? P.z : P.a);
  }
  px(X + 1, Y - 16, P.z); px(X + 2, Y - 16, P.z);
}
function drawScarfTail(P, sp, ux, by, mode, ph) {
  const X = ux - 4;
  const Y = by - 16;
  let pts;
  if (mode === 'move') {
    pts = ph
      ? [[-1, 0], [-2, 0], [-3, 1], [-4, 1], [-5, 1], [-6, 0], [-7, 0], [-8, 1], [-9, 1]]
      : [[-1, 0], [-2, 1], [-3, 1], [-4, 1], [-5, 2], [-6, 2], [-7, 1], [-8, 1], [-9, 2]];
  } else if (mode === 'jump') {
    pts = [[-1, 0], [-2, 0], [-3, -1], [-4, -1], [-5, -1], [-6, -2], [-7, -2 + ph]];
  } else {
    pts = ph
      ? [[-1, 0], [-2, 1], [-2, 2], [-3, 3], [-3, 4], [-4, 5]]
      : [[-1, 0], [-2, 1], [-3, 2], [-3, 3], [-4, 4], [-4, 5]];
  }
  pts.forEach(([x, y], i) => {
    const c = (i >> 1) % 2 ? P.A : P.a;
    px(X + x, Y + y, c);
    px(X + x, Y + y + 1, i === pts.length - 1 ? P.A : sh(P.A, -0.15));
  });
}

// ================= VŨ KHÍ =================
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const EDGE = [[0, 1], [1, 0], [1, 0], [0, 1], [0, 1], [0, -1], [1, 0], [1, 0]];

function drawBladeW(P, hx, hy, d, len, broad, grip = 2) {
  const [dx, dy] = DIRS[d];
  const [ex, ey] = EDGE[d];
  TAGV = 1;
  for (let i = 1; i <= grip; i++) px(hx - dx * i, hy - dy * i, i % 2 ? P.K : P.L);
  px(hx - dx * (grip + 1), hy - dy * (grip + 1), P.Y);
  // chắn tay (tsuba)
  px(hx + dx, hy + dy, P.Y);
  px(hx + dx + ex, hy + dy + ey, P.U);
  px(hx + dx - ex, hy + dy - ey, P.Y);
  for (let i = 2; i < 2 + len; i++) {
    const x = hx + dx * i;
    const y = hy + dy * i;
    const tip = i === 1 + len;
    if (tip) {
      px(x, y, P.X);
      if (broad) px(x - ex, y - ey, P.W);
      continue;
    }
    px(x, y, i === 2 && !broad ? P.U : P.W);
    // lưỡi sáng, một điểm lóe gần mũi
    px(x + ex, y + ey, i === len - 1 ? 0xffffff : P.X);
    if (broad && i >= 3) px(x - ex, y - ey, i >= len - 1 ? P.W : P.V);
    if (broad === 2 && i >= len - 2) px(x - ex * 2, y - ey * 2, P.V);
  }
  TAGV = 0;
}

function drawKunai(P, hx, hy, d) {
  const [dx, dy] = DIRS[d];
  const [ex, ey] = EDGE[d];
  TAGV = 1;
  px(hx - dx, hy - dy, P.K);
  px(hx - dx * 2, hy - dy * 2, P.Y);
  px(hx - dx * 3 + ex, hy - dy * 3 + ey, P.Y); px(hx - dx * 3 - ex, hy - dy * 3 - ey, P.Y);
  px(hx - dx * 3, hy - dy * 3, -1);
  for (let i = 1; i <= 5; i++) {
    const x = hx + dx * i;
    const y = hy + dy * i;
    px(x, y, i === 5 ? P.X : P.W);
    if (i <= 3) px(x + ex, y + ey, P.X);
    if (i === 2 || i === 3) px(x - ex, y - ey, P.V);
  }
  TAGV = 0;
}

const STAR_A = ['..X..', '..WV.', 'XWkWX', '.VW..', '..V..'];
const STAR_B = ['X...X', '.XW..', '..k..', '..WV.', 'V...V'];
function drawStar(P, cx, cy, f, big) {
  TAGV = 1;
  if (big) {
    stamp(cx - 3, cy - 3, f ? ['X.....X', '.XW..V.', '..WWV..', '...k...', '..VWW..', '.V..WX.', 'V.....X'] : ['...X...', '...W...', '..WWV..', 'XWWkWWV', '..VWW..', '...V...', '...V...'], P);
  } else stamp(cx - 2, cy - 2, f ? STAR_B : STAR_A, P);
  TAGV = 0;
}

function drawBow(P, hx, hy, drawn, arrow) {
  TAGV = 1;
  // thân cung cong về phía trước
  const off = [-1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, -1];
  const top = hy - 7;
  for (let i = 0; i < off.length; i++) {
    const x = hx + 1 + off[i];
    const y = top + i;
    const end = i === 0 || i === off.length - 1;
    px(x, y, end ? P.Y : i < 7 ? P.X : P.W);
    if (!end && i > 1 && i < off.length - 2) px(x + 1, y, P.V);
  }
  // chuôi cung quấn vải màu hệ
  px(hx + 2, hy - 1, P.a); px(hx + 2, hy, P.A); px(hx + 2, hy + 1, P.a);
  // dây cung
  const sx = drawn ? hx - 4 : hx - 1;
  const strCol = 0xf0eee8;
  const pts1 = linePts(hx, top, sx, hy);
  const pts2 = linePts(sx, hy, hx, top + off.length - 1);
  for (const [x, y] of pts1) if (at(x, y) < 0) px(x, y, strCol);
  for (const [x, y] of pts2) if (at(x, y) < 0) px(x, y, strCol);
  if (arrow) {
    for (let x = sx; x <= hx + 4; x++) px(x, hy, 0xd8c8a0);
    px(hx + 5, hy, P.X); px(hx + 4, hy - 1, P.W); px(hx + 4, hy + 1, P.W);
    px(sx - 1, hy - 1, P.a); px(sx - 1, hy + 1, P.a); px(sx, hy - 1, P.z);
  }
  TAGV = 0;
}

function drawQuiver(P, ux, by) {
  const X = ux;
  const Y = by;
  const pts = [[-6, -8], [-6, -9], [-5, -10], [-5, -11], [-4, -12], [-4, -13], [-3, -14], [-3, -15]];
  for (const [x, y] of pts) {
    px(X + x, Y + y, P[2]); px(X + x + 1, Y + y, P[1]);
  }
  px(X - 6, Y - 10, P.Y); px(X - 4, Y - 14, P.Y);
  // lông đuôi tên
  px(X - 3, Y - 16, P[4]); px(X - 2, Y - 17, P.a); px(X - 2, Y - 16, P[4]); px(X - 1, Y - 17, P[4]);
  px(X - 4, Y - 17, P.a); px(X - 3, Y - 18, P[4]);
}

function drawFan(P, hx, hy, d, big) {
  TAGV = 1;
  // quạt chiến mở (tessen): d 0 = hướng trước, 6 = hướng lên, 1 = chéo xuống
  let rows;
  if (big) {
    rows = d === 6
      ? ['...XWXWX...', '.XWVWXWVWX.', 'XWXWVWVWXWX', '.WVWXWXWVW.', '..WVWXWVW..', '...VWVWV...', '....VKV....', '.....K.....']
      : ['..XX.....', '.XWWXX...', 'XWVWWWX..', 'XWXVWWWX.', 'XWVXWVWWK', 'XWXVWWWX.', 'XWVWWWX..', '.XWWXX...', '..XX.....'];
  } else {
    rows = d === 6
      ? ['..XWX..', '.XWVWX.', 'XWVWVWX', '.WVXVW.', '..VKV..', '...K...']
      : ['.XX....', 'XWWX...', 'XVWWX..', 'XWVWWK.', 'XVWWX..', 'XWWX...', '.XX....'];
  }
  const w = rows[0].length;
  const h = rows.length;
  if (d === 6) stamp(hx - (w >> 1), hy - h + 1, rows, P);
  else stamp(hx + 1, hy - (h >> 1), rows, P);
  TAGV = 0;
}

// Quạt gập cầm chéo lên phía trước, tua màu hệ dưới chuôi
function drawFanHold(P, hx, hy) {
  TAGV = 1;
  for (let i = 1; i <= 6; i++) {
    px(hx + i, hy - i, i === 6 ? P.X : i & 1 ? P.W : P.X);
    px(hx + i, hy - i + 1, i === 1 ? P.K : P.V);
  }
  px(hx + 6, hy - 5, P.W);
  TAGV = 0;
  px(hx - 1, hy + 2, P.a); px(hx - 1, hy + 3, P.A); px(hx, hy + 2, P.z);
}

function drawFanClosed(P, hx, hy) {
  TAGV = 1;
  stamp(hx - 6, hy - 4, ['XX....', 'WXX...', 'VWWX..', '.VWWXK', '..VVWK'], P);
  TAGV = 0;
}

// Vũ khí cầm tay theo tư thế. state: 'hold' | 'raise' | 'strike' | 'follow' | 'jump'
function drawWeapon(P, sp, wt, state, hx, hy) {
  switch (wt) {
    case 'sword': {
      const d = { hold: 1, raise: 4, strike: 0, follow: 1, jump: 7 }[state];
      const len = state === 'strike' ? 11 : 9;
      drawBladeW(P, hx, hy, d, len, 0, 2);
      break;
    }
    case 'blade': {
      const d = { hold: 7, raise: 5, strike: 0, follow: 1, jump: 7 }[state];
      drawBladeW(P, hx, hy, d, state === 'strike' ? 10 : 8, 2, 3);
      break;
    }
    case 'kunai': {
      const d = { hold: 2, raise: 4, strike: 0, follow: 1, jump: 2 }[state];
      drawKunai(P, hx, hy, d);
      break;
    }
    case 'shuriken':
      if (state === 'strike') drawStar(P, hx + 4, hy, 1, false);
      else if (state !== 'follow') drawStar(P, hx + 1, hy - 1, state === 'raise' ? 1 : 0, false);
      break;
    case 'bow':
      drawBow(P, hx, hy, state === 'raise', state === 'raise');
      break;
    case 'fan':
      if (state === 'raise') drawFanClosed(P, hx, hy);
      else if (state === 'strike') drawFan(P, hx, hy, 0, true);
      else if (state === 'follow') drawFan(P, hx, hy, 0, false);
      else if (state === 'jump') drawFan(P, hx, hy, 6, false);
      else drawFanHold(P, hx, hy);
      break;
    default:
  }
}

// Vũ khí đeo sau lưng (vẽ trước thân)
function drawBackGear(P, sp, ux, by) {
  if (sp.weapon === 'bow') drawQuiver(P, ux, by);
}

// ================= TƯ THẾ =================
const NFRAMES = { idle: 4, walk: 6, jump: 2, attack: 3, dead: 1 };
const WALK_F = [[2, 0], [1, 0], [0, 0], [-2, 0], [-1, 1], [0, 2]];
const WALK_B = [[-2, 0], [-1, 1], [0, 2], [2, 0], [1, 0], [0, 0]];
const WALK_BY = [0, 0, -1, 0, 0, -1];

// ride: đang cưỡi thú. Chân trước gập buông bên sườn thú (chân sau khuất sau thân thú), tay giữ như đứng yên;
// thú chạy thì khăn, áo choàng vẫn bay theo
function getPose(anim, f, sp, ride) {
  if (ride && anim !== 'attack' && anim !== 'dead') {
    const p = getPose('idle', 0, sp, false);
    p.ride = true;
    p.lf = [1, 0];
    if (anim === 'walk' || anim === 'jump') {
      p.moving = true;
      p.scarf = anim === 'jump' ? 'jump' : 'move';
      p.flap = (f >> 1) & 1;
    } else {
      p.flap = f >> 1;
    }
    return p;
  }
  const p = {
    by: 0, ux: 0, lb: [0, 0], lf: [0, 0], hb: [-5, -9], hf: [4, -9], wstate: 'hold', flap: f & 1, moving: false, scarf: 'idle', eyes: null,
  };
  const ranged = sp.weapon === 'bow' || sp.weapon === 'fan' || sp.weapon === 'shuriken';
  if (sp.weapon === 'bow') p.hf = [5, -10];
  if (sp.weapon === 'fan') p.hf = [5, -10];
  if (sp.weapon === 'shuriken') p.hf = [5, -10];
  if (sp.weapon === 'sword') p.hf = [4, -10];
  switch (anim) {
    case 'idle':
      p.by = f >= 2 ? 1 : 0;
      p.flap = f >> 1;
      break;
    case 'walk': {
      p.moving = true;
      p.scarf = 'move';
      p.flap = (f >> 1) & 1;
      p.lf = WALK_F[f];
      p.lb = WALK_B[f];
      p.by = WALK_BY[f];
      p.hf = [p.hf[0] - Math.round(WALK_F[f][0] * 0.7), p.hf[1] - (WALK_F[f][0] < 0 ? 1 : 0)];
      p.hb = [-5 - Math.round(WALK_B[f][0] * 0.7), -9 - (WALK_B[f][0] < 0 ? 1 : 0)];
      break;
    }
    case 'jump':
      // co chân: khung sau co sâu hơn, tay dang thăng bằng
      p.moving = true;
      p.scarf = 'jump';
      p.lf = f ? [2, 4] : [2, 3];
      p.lb = f ? [-2, 2] : [-1, 1];
      p.by = -1;
      p.hf = f ? [5, -12] : [5, -13];
      p.hb = f ? [-7, -13] : [-7, -12];
      p.wstate = 'jump';
      break;
    case 'attack':
      p.moving = f > 0;
      p.scarf = f > 0 ? 'move' : 'idle';
      p.lf = [2, 0];
      p.lb = [-2, 0];
      if (!ranged) {
        if (f === 0) { p.hf = [-4, -12]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; p.lf = [3, 0]; p.lb = [-3, 0]; }
        if (f === 1) { p.hf = [8, -14]; p.hb = [-7, -12]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -10]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; p.by = 1; }
      } else if (sp.weapon === 'bow') {
        p.ux = 0;
        if (f === 0) { p.hf = [8, -14]; p.hb = [3, -14]; p.wstate = 'raise'; }
        if (f >= 1) { p.hf = [8, -14]; p.hb = [-1, -13]; p.wstate = 'strike'; }
      } else if (sp.weapon === 'fan') {
        if (f === 0) { p.hf = [-5, -13]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; }
        if (f === 1) { p.hf = [8, -14]; p.hb = [-7, -12]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -11]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; }
      } else {
        if (f === 0) { p.hf = [-5, -13]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; }
        if (f === 1) { p.hf = [8, -15]; p.hb = [-7, -11]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -12]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; }
      }
      if (sp.mon) p.eyes = 'angry';
      if (ride) {
        p.ride = true;
        p.lf = [1, 0];
        p.by = 0;
      }
      break;
    case 'dead':
      p.eyes = 'dead';
      p.hf = [5, -11];
      p.hb = [-6, -11];
      break;
    default:
  }
  return p;
}

// ================= DỰNG MỘT KHUNG =================
function buildFrame(sp, P, anim, f, ride) {
  clr();
  const p = getPose(anim, f, sp, ride);
  if (sp.npc) p.wstate = 'none';
  const dead = anim === 'dead';
  const ux = p.ux;
  const by = p.by;
  const hx = ux + (sp.hunch || 0);
  const hy = by + (sp.hunch ? 1 : 0);
  // 1. áo choàng thời trang, đồ sau lưng, tóc sau, khăn
  if (sp.ck && !dead) drawCloak(P, sp, ux, by, p);
  if (!dead && !sp.npc) drawBackGear(P, sp, ux, by);
  if (sp.backLayer) sp.backLayer(P, sp, ux, by, p, f);
  drawHairBack(P, sp, hx, hy, p, f);
  if (!sp.npc && !dead && sp.at >= 10 && !sp.ck) drawCape(P, sp, ux, by, p, f);
  if (!sp.noScarf && !dead) drawScarfTail(P, sp, ux, by, p.scarf, p.flap);
  // 2. tay sau
  const bsx = ux - 4;
  const bsy = by - 14;
  if (!sp.hideBackArm) drawArm(P, sp, bsx, bsy, ux + p.hb[0], by + p.hb[1], false);
  // 3. chân
  if (sp.robe) drawRobe(P, sp, ux, by, f);
  else if (p.ride) drawLeg(P, sp, 1, p.lf[0], p.lf[1], false);
  else {
    drawLeg(P, sp, -3, p.lb[0], p.lb[1], true);
    drawLeg(P, sp, 1, p.lf[0], p.lf[1], false);
  }
  // 4. thân + khăn cổ
  if (sp.at >= 9 && !sp.npc) drawBackPad(P, sp, ux, by);
  drawTorso(P, sp, ux, by, p);
  if (sp.cs) drawCostume(P, sp, ux, by);
  if (sp.overTorso) sp.overTorso(P, sp, ux, by, p, f);
  if (!sp.noScarf) drawScarfNeck(P, sp, ux, by);
  if (sp.ck && !dead) drawCloakFront(P, sp, ux, by);
  // 5. đầu
  drawHead(P, sp, hx, hy, p);
  // 6. tay trước + vũ khí
  const fsx = ux + 3;
  const fsy = by - 14;
  const fhx = ux + p.hf[0];
  const fhy = by + p.hf[1];
  if (sp.frontProp) {
    sp.frontProp(P, sp, ux, by, p, f);
  } else {
    if (sp.weapon === 'bow' && anim === 'attack') {
      // tay kéo dây vẽ sau cung
      drawWeapon(P, sp, sp.weapon, p.wstate, fhx, fhy);
      drawArm(P, sp, fsx, fsy, fhx, fhy, true);
    } else {
      drawArm(P, sp, fsx, fsy, fhx, fhy, true);
      if (!dead && p.wstate !== 'none') drawWeapon(P, sp, sp.weapon, p.wstate, fhx, fhy);
      // nắm tay phủ lên chuôi
      if (!dead && sp.weapon && sp.weapon !== 'bow' && sp.weapon !== 'fan') {
        px(fhx, fhy, P.s); px(fhx + 1, fhy, P.s); px(fhx, fhy + 1, P.S); px(fhx + 1, fhy + 1, P.S);
      }
    }
  }
  drawShoulderPad(P, sp, ux, by);
  return dead;
}

function drawHairBack(P, sp, hx, hy, p, f) {
  const H = P.H;
  const J = P.J;
  const G = P.G;
  if (sp.headGear && !sp.hairBack) return;
  const style = sp.hairBack || sp.hair;
  if (style === 'long') {
    // tóc dài sau lưng
    const sway = p.moving ? -1 : 0;
    for (let y = -22; y <= -10; y++) {
      const k = y > -14 ? sway : 0;
      const w = y < -19 ? 4 : y < -12 ? 4 : 3;
      for (let i = 0; i < w; i++) {
        const x = hx - 8 + i + k - (y > -16 ? 1 : 0);
        px(x, hy + y, i === 0 ? G : i === w - 1 ? H : J);
      }
    }
    px(hx - 9 + sway, hy - 10, G); px(hx - 7 + sway, hy - 9, J);
  } else if (style === 'pony') {
    // đuôi ngựa buộc cao, đung đưa
    const ph = p.moving ? (f & 1) : (f >> 1);
    const pts = [[-8, -26], [-9, -25], [-10, -24], [-10, -23], [-11, -22], [-11, -21], [-11, -20], [-11, -19], [-10, -18]];
    pts.forEach(([x, y], i) => {
      let xx = x;
      let yy = y;
      if (p.moving) { xx -= Math.round(i * 0.4); yy -= Math.round(i * 0.45) - (i > 4 ? ph : 0); }
      else if (i > 4) xx += ph;
      px(hx + xx, hy + yy, G); px(hx + xx + 1, hy + yy, J); px(hx + xx + 2, hy + yy, i < 5 ? H : J);
    });
    px(hx - 7, hy - 26, P.a); px(hx - 7, hy - 25, P.A);
  } else if (style === 'wild') {
    // đuôi tóc ngắn buộc thấp
    const ph = p.moving ? 1 : 0;
    stamp(hx - 11 - ph, hy - 21 + ph, ['..JH', '.GJH', 'GJJ.', 'GJ..', 'G...'], P);
  }
}

// Xoay khung nằm (chết): đầu sang trái, mặt ngửa lên
function rotateDead() {
  TMP.set(BUF);
  BUF.fill(-1);
  TAG.fill(0);
  for (let gy = 0; gy < FH; gy++) {
    for (let gx = 0; gx < FW; gx++) {
      const c = TMP[gy * FW + gx];
      if (c < 0) continue;
      const x = gx - OX;
      const y = gy - OY;
      const nx = y + 14;
      const ny = -x - 8;
      const ngx = OX + nx;
      const ngy = OY + ny;
      if (ngx < 0 || ngy < 0 || ngx >= FW || ngy >= FH) continue;
      BUF[ngy * FW + ngx] = c;
    }
  }
  // tóc dài/đuôi ngựa có thể thòng xuống dưới mặt đất: nâng cả khung cho đáy nằm ở y = -1
  let maxY = -1;
  for (let i = BUF.length - 1; i >= 0; i--) if (BUF[i] >= 0) { maxY = (i / FW) | 0; break; }
  const lift = maxY - (OY - 1);
  if (lift > 0) {
    BUF.copyWithin(0, lift * FW);
    BUF.fill(-1, BUF.length - lift * FW);
  }
}

// ================= NƯỚNG KHUNG (viền + canvas) =================
const OUT = new Int32Array(FW * FH);
const OFL = new Uint8Array(FW * FH);
function outlineOf(c) {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return (((r * 0.26 + 14) | 0) << 16) | (((g * 0.22 + 8) | 0) << 8) | ((b * 0.26 + 22) | 0);
}

function bake(flash, wantGlow, wantAura) {
  OUT.set(BUF);
  OFL.fill(0);
  let minX = FW;
  let minY = FH;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = y * FW + x;
      let c = BUF[i];
      if (c < 0) {
        let nc = -1;
        if (x > 0 && BUF[i - 1] >= 0) nc = BUF[i - 1];
        else if (x < FW - 1 && BUF[i + 1] >= 0) nc = BUF[i + 1];
        else if (y < FH - 1 && BUF[i + FW] >= 0) nc = BUF[i + FW];
        else if (y > 0 && BUF[i - FW] >= 0) nc = BUF[i - FW];
        if (nc < 0) continue;
        c = outlineOf(nc);
        OUT[i] = c;
        OFL[i] = 1;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) { minX = OX; maxX = OX; minY = OY; maxY = OY; }
  const pad = wantAura ? 3 : wantGlow ? 2 : 0;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(FW - 1, maxX + pad); maxY = Math.min(FH - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  const wpx = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y + minY) * FW + (x + minX);
      const c = OUT[i];
      if (c < 0) continue;
      const k = (y * w + x) * 4;
      if (flash) {
        if (OFL[i]) { d[k] = 255; d[k + 1] = 214; d[k + 2] = 226; } else { d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; }
      } else {
        d[k] = (c >> 16) & 255; d[k + 1] = (c >> 8) & 255; d[k + 2] = c & 255;
      }
      d[k + 3] = 255;
      if (TAG[i] && !OFL[i]) wpx.push(x + minX - OX, y + minY - OY);
    }
  }
  g.putImageData(img, 0, 0);
  const entry = { cv, ox: OX - minX, oy: OY - minY, w, h, wpx, flip: null, glow: null, aura: null };
  if (wantGlow && wpx.length) entry.glow = haloCanvas(minX, minY, w, h, (i) => TAG[i] && BUF[i] >= 0, 2);
  if (wantAura) entry.aura = haloCanvas(minX, minY, w, h, (i) => OUT[i] >= 0, 3);
  return entry;
}

// Quầng sáng: giãn mặt nạ theo khoảng cách, alpha giảm dần (màu trắng, tô màu khi vẽ)
function haloCanvas(minX, minY, w, h, inMask, R) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = 99;
      for (let j = -R; j <= R; j++) {
        const yy = y + minY + j;
        if (yy < 0 || yy >= FH) continue;
        for (let i = -R; i <= R; i++) {
          const xx = x + minX + i;
          if (xx < 0 || xx >= FW) continue;
          if (inMask(yy * FW + xx)) {
            const dist = Math.max(Math.abs(i), Math.abs(j)) + (Math.abs(i) + Math.abs(j)) * 0.15;
            if (dist < best) best = dist;
          }
        }
      }
      if (best > R + 0.5) continue;
      const k = (y * w + x) * 4;
      d[k] = 255; d[k + 1] = 255; d[k + 2] = 255;
      d[k + 3] = Math.round(255 * Math.max(0, 1 - best / (R + 1)) * (best < 0.5 ? 0.5 : 1));
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

function tinted(src, col) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col;
  g.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

function flipCanvas(src) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return cv;
}

// ================= NPC =================
// Mỗi NPC: chỉnh spec (tóc, râu, áo choàng, đạo cụ) dùng chung bộ khung ninja
const NPCS = {
  elder(sp, pal) {
    sp.hairCol = C('#e8e4ec');
    sp.beard = 'long';
    sp.eyes = 'closed';
    sp.robe = true;
    sp.hunch = 1;
    sp.noScarf = true;
    sp.headGear = gearBaldTopknot;
    sp.trim = C(pal[1]);
    sp.robeTrim = true;
    sp.frontProp = propCane;
    sp.overTorso = gourdBelt;
  },
  potion(sp, pal) {
    sp.female = true;
    sp.accent = C(pal[2] || '#f8bbd0');
    sp.hairCol = C('#9a8fa8');
    sp.hair = 'bun';
    sp.noBand = true;
    sp.robe = true;
    sp.noScarf = true;
    sp.overTorso = apronFull;
    sp.frontProp = propPotion;
    sp.trim = 0xf4f0e6;
  },
  smith(sp, pal) {
    sp.hairCol = C('#3a2a22');
    sp.beard = 'short';
    sp.bareArms = true;
    sp.bulk = 1;
    sp.noScarf = true;
    sp.noCollar = true;
    sp.headGear = gearBandana;
    sp.overTorso = apronLeather;
    sp.frontProp = propHammer;
    sp.pants = 0x4a3e3a;
    sp.accent = C(pal[2] || '#ff8f00');
  },
  task(sp, pal) {
    sp.hairCol = C('#2a2030');
    sp.hair = 'neat';
    sp.noScarf = true;
    sp.headGear = gearCap;
    sp.overTorso = towelShoulder;
    sp.frontProp = propScroll;
    sp.trim = 0xf4f0e6;
    sp.accent = C(pal[1] || '#ffeb3b');
  },
  tele(sp, pal) {
    sp.hairCol = C('#2a2030');
    sp.hair = 'neat';
    sp.headGear = gearConical;
    sp.accent = C(pal[2] || '#bbdefb');
    sp.wrap = 0xf4f0e6;
    sp.frontProp = propLantern;
  },
  clan(sp, pal) {
    sp.hairCol = C('#b8b4c4');
    sp.beard = 'goatee';
    sp.robe = true;
    sp.robeTrim = true;
    sp.noScarf = true;
    sp.headGear = gearBaldTopknot;
    sp.trim = C(pal[1]);
    sp.backLayer = cloakBack;
    sp.overTorso = cloakFront;
    sp.frontProp = propNone;
    sp.hideBackArm = true;
  },
  storage(sp) {
    sp.hairCol = C('#4a3020');
    sp.hair = 'spiky';
    sp.bulk = 1;
    sp.noScarf = true;
    sp.headGear = gearBandana;
    sp.accent = C('#c8763a');
    sp.frontProp = propChest;
    sp.hideBackArm = true;
  },
  dungeon(sp, pal) {
    sp.hairCol = C('#2a2030');
    sp.eyes = 'angry';
    sp.bulk = 1;
    sp.headGear = gearHelmet;
    sp.overTorso = armorPlates;
    sp.frontProp = propSpear;
    sp.at = 6;
    sp.pt = 6;
    sp.ht = 2;
    sp.accent = C(pal[1]);
    sp.noScarf = true;
  },
  arena(sp, pal) {
    // võ sư đấu trường: cởi trần tay, khăn hachimaki, dây chéo ngực, đao lớn
    sp.hairCol = C('#2a2030');
    sp.hair = 'wild';
    sp.hairBack = 'wild';
    sp.headGear = gearHachimaki;
    sp.at = 5;
    sp.bulk = 1;
    sp.bareArms = true;
    sp.noScarf = true;
    sp.weapon = 'blade';
    sp.wt = 7;
    sp.wcol = C(TIER_METAL[7]);
    sp.accent = C(pal[0]);
    sp.overTorso = sashCross;
    sp.outfit = C('#3c3448');
    sp.trim = C('#e8c66a');
    sp.pants = C('#2c2638');
    sp.glove = 0x2a2030;
    sp.npcWeapon = true;
  },
  event(sp, pal) {
    // sứ giả lễ hội: áo dài đỏ thắm hoa văn kem, đai vàng thắt nơ sau lưng, tóc dài cài hoa, mặt nạ thỏ đeo sau đầu, cầm đèn ông sao
    sp.female = true;
    sp.hair = 'long';
    sp.noBand = true;
    sp.robe = true;
    sp.robeTrim = true;
    sp.noScarf = true;
    sp.trim = 0xf6e7c8;
    sp.accent = C(pal[1] || '#f2c230');
    sp.headGear = gearFestival;
    sp.overTorso = festivalObi;
    sp.frontProp = propStarLantern;
  },
};

// Tóc dài cài hoa trước trán, mặt nạ thỏ trắng buộc lệch sau đầu (đồ chơi Trung Thu)
function gearFestival(P, sp, hx, hy) {
  stamp(hx - 9, hy - 28, HAIR_STYLES.long, P);
  stamp(hx - 12, hy - 30, [
    '.WW.WW.',
    '.Wp.Wp.',
    '.Wp.Wp.',
    'wWWWWWW',
    'wkWWWkW',
    'wrWWWrW',
    '.wWkWW.',
    '..www..',
  ], { W: 0xf8f4ec, w: 0xd6ccbe, p: 0xf48fb1, k: INK, r: 0xe0505a });
  // dây buộc mặt nạ vòng qua đầu
  px(hx - 5, hy - 26, 0xc62828); px(hx - 4, hy - 27, 0xc62828);
  // hoa cài: cánh hồng, nhụy vàng
  stamp(hx + 1, hy - 30, ['.f.', 'fYf', '.f.'], { f: 0xf48fb1, Y: P.Y });
  px(hx + 3, hy - 28, 0xc2185b);
}
// Đai lưng vàng rộng, nơ thắt sau lưng, hoa văn kem rải trên áo
function festivalObi(P, sp, ux, by) {
  for (let x = -4; x <= 4; x++) {
    px(ux + x, by - 11, P.A);
    px(ux + x, by - 10, x <= -3 ? P.A : P.a);
    px(ux + x, by - 9, x <= -3 ? sh(P.A, -0.2) : P.A);
  }
  px(ux + 1, by - 10, P.z); px(ux + 2, by - 10, 0xc62828);
  stamp(ux - 8, by - 12, ['aa..', 'aAza', 'aAA.', '.A..', '.A..'], { a: P.a, A: P.A, z: P.z });
  const c = P.x;
  px(ux - 2, by - 14, c); px(ux + 3, by - 13, c); px(ux - 1, by - 12, sh(c, -0.2));
  px(ux - 3, -6, c); px(ux + 3, -6, sh(c, -0.2)); px(ux, -4, c); px(ux - 4, -3, sh(c, -0.2)); px(ux + 4, -3, c);
}
// Đèn ông sao đỏ năm cánh trên cán tre, ruột nến vàng, tua kim tuyến
function propStarLantern(P, sp, ux, by) {
  const hx = ux + 5;
  const hy = by - 11;
  for (let i = 1; i <= 9; i++) px(hx + 1 + (i >> 2), hy - i, i & 1 ? P[7] : P[8]);
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
  stamp(hx - 1, hy - 18, [
    '....R....',
    '...RrR...',
    'RRRrYrRRR',
    '.RrYzYrR.',
    '..RrYrR..',
    '..Rr.rR..',
    '.Rr...rR.',
    '.R.....R.',
  ], { R: 0xb71c1c, r: 0xe53935, Y: 0xffd54f, z: 0xfff3c0 });
  px(hx + 3, hy - 10, P.Y); px(hx + 2, hy - 9, P.U); px(hx + 4, hy - 9, P.U);
  px(hx, hy, P.s); px(hx + 1, hy, P.s);
}

function gearBaldTopknot(P, sp, hx, hy) {
  // đầu hói, tóc bạc hai bên, búi nhỏ trên đỉnh
  const H = P.H;
  const J = P.J;
  const I = P.I;
  stamp(hx - 9, hy - 28, [
    '.....JHH.........',
    '.....JIH.........',
    '....JJHJ.........',
    '..JJ.............',
    '..JHH............',
    '..JHHH...........',
    '..JJHH...........',
    '..JJH............',
    '...J.............',
  ], { H, J, I });
  // đỉnh đầu bóng
  px(hx + 1, hy - 26, P.h); px(hx + 2, hy - 26, P.h); px(hx + 2, hy - 25, P.h);
  px(hx - 4, hy - 26, P.a);
}

function gearBandana(P, sp, hx, hy) {
  const style = HAIR_STYLES.neat;
  stamp(hx - 9, hy - 28, style, P);
  const a = P.a;
  const A = P.A;
  const z = P.z;
  for (let x = -6; x <= 6; x++) {
    px(hx + x, hy - 27, x < -5 || x > 5 ? -1 : a);
    px(hx + x, hy - 26, a);
    px(hx + x, hy - 25, x === -6 ? A : a);
    px(hx + x, hy - 24, A);
  }
  px(hx - 7, hy - 25, A); px(hx - 7, hy - 24, A);
  px(hx - 1, hy - 27, z); px(hx, hy - 27, z); px(hx + 1, hy - 26, z);
  // nút buộc sau
  px(hx - 8, hy - 25, a); px(hx - 9, hy - 24, a); px(hx - 9, hy - 23, A); px(hx - 8, hy - 23, A); px(hx - 10, hy - 22, A);
}

function gearHachimaki(P, sp, hx, hy, pose) {
  stamp(hx - 9, hy - 28, HAIR_STYLES.wild, P);
  // khăn trắng buộc trán, chấm đỏ giữa, đuôi dài bay sau
  const w = P[4];
  const w2 = P[5];
  for (let x = -7; x <= 6; x++) {
    px(hx + x, hy - 25, x <= -5 ? w2 : w);
    px(hx + x, hy - 24, w2);
  }
  px(hx + 2, hy - 25, P.a); px(hx + 3, hy - 25, P.a); px(hx + 2, hy - 24, P.A); px(hx + 3, hy - 24, P.A);
  const ph = pose.flap || 0;
  px(hx - 8, hy - 25, w); px(hx - 8, hy - 24, w2);
  px(hx - 9, hy - 24 + ph, w); px(hx - 10, hy - 23 + ph, w); px(hx - 11, hy - 23, w2); px(hx - 12, hy - 22 + ph, w2);
  px(hx - 9, hy - 23, w2); px(hx - 10, hy - 22, w2); px(hx - 10, hy - 21 + ph, w2);
}

function gearCap(P, sp, hx, hy) {
  stamp(hx - 9, hy - 28, HAIR_STYLES.neat, P);
  const o = P.o;
  const O = P.O;
  const q = P.q;
  stamp(hx - 7, hy - 30, [
    '....qqqqq....',
    '..qoooooooo..',
    '.Ooooooooooq.',
    'OOOoooooooooq',
    'DDDDOOOOOOOOO',
  ], { o, O, q, D: P.D });
  px(hx, hy - 30, P.Y);
}

function gearConical(P, sp, hx, hy) {
  stamp(hx - 9, hy - 28, HAIR_STYLES.neat, P);
  // nón lá
  const s1 = P[7];
  const s2 = P[8];
  const s3 = P[9];
  stamp(hx - 10, hy - 32, [
    '.........77.........',
    '.......777777.......',
    '.....8877777777.....',
    '...888877777777777..',
    '.88888877777777777..',
    '9999988888888888888.',
  ], { 7: s1, 8: s2, 9: s3 });
  // vân nan nón
  px(hx - 4, hy - 30, s2); px(hx + 2, hy - 29, s2); px(hx - 1, hy - 28, s3); px(hx + 5, hy - 28, s2);
  // quai nón
  px(hx + 6, hy - 22, s3); px(hx + 6, hy - 21, s3); px(hx + 6, hy - 20, s3); px(hx + 6, hy - 19, s3); px(hx + 5, hy - 18, s3); px(hx + 4, hy - 17, s3);
}

function gearHelmet(P, sp, hx, hy) {
  const M = P.M;
  const N = P.N;
  const n = P.n;
  const a = P.a;
  stamp(hx - 9, hy - 31, [
    '....Y.......Y....',
    '....YY.....YY....',
    '.....YY...YY.....',
    '......YYaYY......',
    '...NNMMMMMMMMn...',
    '..NNMMMMMMMMMMn..',
    '.NNNMMMMnnnnMMMn.',
    'NNNNNNNNNNNNNNNNN',
    'NNNNN.......kkkNN',
    'NNNN.............',
    'NNN..............',
    '.NN..............',
  ], { M, N, n, a, Y: P.Y, k: INK });
}

// ---------- phụ kiện thân
function gourdBelt(P, sp, ux, by) {
  // hồ lô rượu đeo bên hông, dây đỏ
  stamp(ux - 6, by - 11, ['.r.', '.7.', '787', '.r.', '777', '7778', '.88'], { 7: P[7], 8: P[8], r: 0xc0392b });
}

function sashCross(P, sp, ux, by) {
  // dây chéo ngực màu đỏ đấu trường + đai lưng đen
  const pts = [[-4, -15], [-3, -14], [-2, -13], [-1, -12], [0, -11], [1, -11], [2, -12], [3, -13], [4, -14]];
  pts.forEach(([x, y], i) => {
    px(ux + x, by + y, i < 5 ? P.a : P.A);
    if (i < 5) px(ux + x + 1, by + y, P.A);
  });
  px(ux, by - 12, P.z);
}

function apronFull(P, sp, ux, by) {
  const c = P[4];
  const c2 = P[5];
  for (let y = -14; y <= -3; y++) {
    const yy = y < -8 ? y + by : y;
    for (let x = 0; x <= 4; x++) px(ux + x, yy, x === 0 ? c2 : c);
  }
  px(ux + 1, -3, c2); px(ux + 3, -6, c2);
  for (let x = -4; x <= 4; x++) px(ux + x, by - 10, P.a);
}
function apronLeather(P, sp, ux, by) {
  const c = 0x6d4630;
  const c2 = 0x4e301e;
  for (let y = -14; y <= -5; y++) {
    const yy = y < -8 ? y + by : y;
    for (let x = -2; x <= 5; x++) px(ux + x, yy, x <= -1 ? c2 : x === 5 ? sh(c, 0.2) : c);
  }
  px(ux + 2, by - 12, 0xb0b0b8); px(ux + 3, by - 12, 0xb0b0b8);
  px(ux - 3, by - 15, c2); px(ux + 4, by - 15, c2);
}
function towelShoulder(P, sp, ux, by) {
  const c = P[4];
  const c2 = P[5];
  for (let y = -16; y <= -10; y++) px(ux + 3, by + y, c), px(ux + 4, by + y, y & 1 ? c2 : c);
  px(ux + 2, by - 16, c); px(ux + 1, by - 16, c2);
  // tạp dề ngắn
  for (let y = -9; y <= -5; y++) for (let x = 0; x <= 4; x++) px(ux + x, y < -8 ? by + y : y, x === 0 ? c2 : c);
}
function cloakBack(P, sp, ux, by) {
  for (let y = -16; y <= -1; y++) {
    const half = y < -12 ? 6 : 7;
    for (let x = -half - 1; x <= -3; x++) px(ux + x, y < -4 ? y + by : y, x <= -half ? P.D : P.O);
  }
}
function cloakFront(P, sp, ux, by) {
  // áo choàng rộng với viền vàng, cổ cao
  for (let y = -15; y <= -1; y++) {
    const yy = y < -4 ? y + by : y;
    for (let x = -6; x <= 6; x++) {
      if (x > -3 && x < 1 && y > -14) continue;
      let c = x <= -4 ? P.O : x >= 5 ? P.q : P.o;
      if (x === 1 || x === -3) c = P.x;
      px(ux + x, yy, c);
    }
  }
  for (let x = -6; x <= 6; x++) px(ux + x, -1, P.x);
  // cổ áo cao
  for (let x = -5; x <= 5; x++) px(ux + x, by - 16, x === -5 || x === 5 ? P.x : P.D);
  px(ux - 5, by - 17, P.x); px(ux + 5, by - 17, P.x); px(ux - 6, by - 17, P.x);
  // gia huy
  px(ux + 3, by - 12, P.x); px(ux + 4, by - 11, P.x); px(ux + 3, by - 10, P.x); px(ux + 2, by - 11, P.x);
}
function armorPlates(P, sp, ux, by) {
  const M = P.M;
  const N = P.N;
  const n = P.n;
  for (let y = -15; y <= -11; y++) {
    for (let x = -4; x <= 5; x++) px(ux + x, by + y, (y & 1) ? N : x >= 3 ? n : M);
  }
  for (let x = -4; x <= 5; x++) px(ux + x, by - 14, P.a);
  // váy giáp
  for (let y = -8; y <= -6; y++) for (let x = -5; x <= 5; x++) if (x !== 0) px(ux + x, y, y === -6 ? N : x & 1 ? M : n);
  for (let x = -5; x <= 5; x++) px(ux + x, -8, P.a);
}

// ---------- đạo cụ cầm tay (vẽ cùng tay trước)
function propNone(P, sp, ux, by) {
  // hai tay giấu trong tay áo
  for (let x = 0; x <= 4; x++) px(ux + x, by - 11, x === 0 ? P.O : P.o);
  for (let x = 0; x <= 4; x++) px(ux + x, by - 10, P.O);
  px(ux + 4, by - 12, P.q); px(ux + 5, by - 11, P.x); px(ux + 5, by - 10, P.x);
}
function propCane(P, sp, ux, by) {
  const hx = ux + 6;
  const hy = by - 10;
  for (let y = hy - 2; y <= -1; y++) px(hx + 1, y, (y & 1) ? P[1] : P[2]);
  px(hx, hy - 3, P[3]); px(hx + 1, hy - 3, P[3]); px(hx + 2, hy - 3, P[1]); px(hx - 1, hy - 2, P[3]);
  px(hx + 2, hy - 2, P[2]);
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
}
function propPotion(P, sp, ux, by) {
  const hx = ux + 5;
  const hy = by - 11;
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
  // bình thuốc đỏ
  stamp(hx + 1, hy - 6, ['.2.', '.3.', 'rRr', 'rzr', 'RrR', '.R.'], { 2: P[2], 3: P[3], r: 0xe53950, R: 0xa02040, z: 0xffb0c0 });
  px(hx, hy, P.s); px(hx + 1, hy, P.s);
}
function propHammer(P, sp, ux, by) {
  // búa rèn giơ trước ngực
  const hx = ux + 5;
  const hy = by - 11;
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
  for (let i = 1; i <= 7; i++) px(hx + 1 + (i >> 1), hy - i, i & 1 ? P[1] : P[2]);
  stamp(hx + 1, hy - 12, ['.NNNNNN.', 'NnMMMMMN', 'NnMMMMMN', 'NMMMMMMN', '.NNNNNN.'], { N: 0x4a4a55, M: 0x8a8a98, n: 0xd0d0dc });
  px(hx, hy, P.s); px(hx + 1, hy, P.s); px(hx, hy + 1, P.S); px(hx + 1, hy + 1, P.S);
}
function propScroll(P, sp, ux, by) {
  const hx = ux + 5;
  const hy = by - 11;
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
  stamp(hx - 1, hy - 7, ['a..', '444', '454', '444', '454', '444', 'a..'], { 4: P[4], 5: P[6], a: 0xc0392b });
  px(hx + 2, hy - 7, 0xc0392b); px(hx + 2, hy - 1, 0xc0392b);
  px(hx, hy, P.s); px(hx + 1, hy, P.s);
}
function propLantern(P, sp, ux, by) {
  // đèn lồng đỏ xách tay
  const hx = ux + 5;
  const hy = by - 11;
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
  px(hx + 1, hy + 2, P[2]);
  stamp(hx - 1, hy + 3, ['.2222.', 'rRzzRr', 'rRzzRr', 'RrrrrR', '.2222.', '..Y...'], { 2: P[2], r: 0xe53935, R: 0xb71c1c, z: 0xffcc80, Y: P.Y });
}
function propChest(P, sp, ux, by) {
  // ôm hòm gỗ trước ngực
  const x = ux - 1;
  const y = by - 15;
  drawArm(P, sp, ux - 4, by - 14, ux + 0, by - 9, false);
  stamp(x, y, [
    '.22222222.',
    '2111111112',
    '2YYYYYYYY2',
    '2133113312',
    '2133YY3312',
    '213311331U',
    '2YYYYYYYYU',
    '.22222222.',
  ], { 1: P[1], 2: P[2], 3: P[3], Y: P.Y, U: P.U });
  drawArm(P, sp, ux + 3, by - 14, ux + 7, by - 10, true);
}
function propSpear(P, sp, ux, by) {
  const hx = ux + 5;
  const hy = by - 11;
  TAGV = 1;
  for (let y = hy - 24; y <= -1; y++) px(hx + 1, y, (y & 1) ? P[1] : P[2]);
  // mũi giáo
  stamp(hx - 1, hy - 31, ['..X..', '..X..', '.XWV.', '.XWV.', '.XWV.', '..W..', '.YYY.'], P);
  // tua đỏ
  stamp(hx - 1, hy - 24, ['.aaa.', 'aazaa', '.aAa.', '.A.A.'], P);
  TAGV = 0;
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
}

// ================= THỜI TRANG =================
// Mã hình (look.mask/cloak/costume/mount) do server gửi theo vật phẩm đang mặc (server/data/items.js FASHION).
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

// Mặt nạ: bản đồ ký tự gốc (hx - 3, hy - 26), vẽ đè lên mặt sau tóc và băng trán.
// W nền, w nền tối, R/r màu vẽ, k khe mắt, Y mắt vàng, I sừng, G viền vàng, d dây buộc
const MASKS = {
  fox: {
    pal: { W: 0xf6f2ea, w: 0xc8c0b8, R: 0xd8323c, r: 0x8e1b2a, k: 0x1d1424, d: 0xa8282e },
    rows: [
      '...r....r..',
      '..rW...rW..',
      '..WWWWWWWW.',
      '.wWRWWWRWW.',
      '.wWkkWWkkW.',
      '.wRWWWWRWWW',
      '.wWWWWWWWWW',
      '..wWWWWWWkW',
      '..wwWRRWw..',
      '...wwwWw...',
    ],
  },
  oni: {
    pal: { W: 0xf4e8d0, R: 0xc62828, r: 0x7a1414, k: 0x1d1424, Y: 0xffd54a, I: 0xf4ead8, w: 0xbfb09a, d: 0x3a2a3e },
    rows: [
      '..I......I.',
      '..Iw....Iw.',
      '..RRRRRRRR.',
      '.rRkkRRkkRR',
      '.rRYkRRYkRR',
      '.rRRRRRRRRR',
      '.rRRRRRRrRR',
      '..rkWkkWkr.',
      '..rrRRRRr..',
      '...rrrrr...',
    ],
  },
  tengu: {
    pal: { W: 0xffffff, w: 0xd8d4dc, R: 0xd32f2f, r: 0x8a1c1c, k: 0x1d1424, G: 0xf2c230, d: 0x3a2a3e },
    rows: [
      '...........',
      '...........',
      '..WWWW.WWW.',
      '.rRWWRRWWRR',
      '.rRkGRRkGRR',
      '.rRRRRRRRRRRRR',
      '.rRRRRRRRRRRRr',
      '..rRWWWWRR.',
      '..rrRWWRrr.',
      '...rrrrr...',
    ],
  },
};

function drawFashionMask(P, sp, hx, hy) {
  const m = MASKS[sp.fmask];
  stamp(hx - 3, hy - 26, m.rows, m.pal);
  // dây buộc vòng ra sau đầu
  const d = m.pal.d;
  px(hx - 4, hy - 22, d); px(hx - 5, hy - 22, d); px(hx - 6, hy - 21, d); px(hx - 7, hy - 21, sh(d, 0.25));
}

// Áo choàng: c màu chính, l lớp lót (lộ ra khi bay), t viền, pat hoa văn
const CLOAKS = {
  wind: { c: '#2e9d8f', l: '#e8f5e9', t: '#f2f6f0', pat: 'cloud' },
  night: { c: '#2c3170', l: '#8e63d8', t: '#c5cae9', pat: 'stars' },
  flame: { c: '#b3201c', l: '#ffb300', t: '#ffd54f', pat: 'flame' },
  snow: { c: '#eef3f8', l: '#90caf9', t: '#ffffff', pat: 'fur' },
};

// Bay ngược hướng chạy: đứng yên buông dài gần chạm đất, chạy thì tung ra sau và lên, nhảy thì hất lên cao
function drawCloak(P, sp, ux, by, p) {
  const k = sp.ck;
  const fly = p.moving;
  const jump = p.scarf === 'jump';
  const ph = p.flap || 0;
  const bot = jump ? -7 : fly ? -3 : -2;
  for (let y = -16; y <= bot; y++) {
    const r = y + 16;
    let xl;
    let yy = y;
    if (jump) {
      xl = -6 - Math.round(r * 0.7) - (r > 4 ? ph : 0);
      yy = y - Math.round(r * 0.6);
    } else if (fly) {
      xl = -6 - Math.round(r * 0.6) - (r > 5 ? ph : 0);
      if (r > 5) yy = y - Math.round((r - 5) * 0.3);
    } else {
      xl = -6 - Math.round(r / 3) - (r > 9 ? ph : 0);
    }
    for (let x = xl; x <= -2; x++) {
      let c = x === xl ? k.d : x === xl + 1 && (fly || jump) ? k.l : x >= -3 ? k.d : k.c;
      if (y === bot) c = x === xl ? k.d : k.t;
      else if (y === bot - 1 && x > xl) c = sh(k.c, -0.12);
      // hoa văn
      if (k.pat === 'stars' && y < bot - 1 && x > xl + 1 && x < -3 && ((x * 7 + r * 5) & 15) === 3) c = k.l;
      if (k.pat === 'cloud' && y === bot - 2 && x > xl && ((x - xl) % 4 === 1)) c = k.t;
      if (k.pat === 'cloud' && y === bot - 1 && x > xl && ((x - xl) % 4 !== 3)) c = sh(k.t, -0.12);
      if (k.pat === 'flame' && y >= bot - 2 && y < bot && x > xl && ((x - xl + (bot - y)) % 3 === 0)) c = y === bot - 1 ? k.t : k.l;
      px(ux + x, by + yy, c);
    }
    // lưỡi lửa liếm dưới mép áo
    if (k.pat === 'flame' && y === bot) {
      for (let x = xl + 1; x <= -3; x += 2) px(ux + x, by + yy + 1 + ((x + ph) & 1), (x & 2) ? k.l : k.t);
    }
  }
}

// Phần áo choàng phía trước: quai vai và khuy cài; Tuyết Hồ thêm cổ lông
function drawCloakFront(P, sp, ux, by) {
  const k = sp.ck;
  px(ux - 3, by - 16, k.c); px(ux - 2, by - 16, k.d); px(ux - 3, by - 15, k.d);
  if (k.pat === 'fur') {
    for (let x = -4; x <= 3; x++) px(ux + x, by - 16, (x & 1) ? 0xffffff : 0xdde6ee);
    px(ux - 4, by - 15, 0xdde6ee); px(ux - 5, by - 16, 0xffffff); px(ux + 4, by - 16, 0xdde6ee);
  }
  px(ux + 3, by - 15, k.t); px(ux + 4, by - 15, sh(k.t, -0.3));
}

// Trang phục: thay màu áo/quần/viền và vẽ hoa văn riêng; at/pt = mức chi tiết (vai giáp, nẹp, giáp gối)
const COSTUMES = {
  sakura: { o: '#f48fb1', p: '#9c2a5c', t: '#fff0f5', u: '#ffe4ee', w: '#fff0f5', g: '#ad1457', at: 3, pt: 2, pat: 'petal', a: '#ffffff', b: '#e91e63' },
  ocean: { o: '#1e88e5', p: '#0d3c78', t: '#e3f2fd', u: '#bbdefb', w: '#e3f2fd', g: '#0d3c78', at: 3, pt: 3, pat: 'wave', a: '#e3f2fd', b: '#64b5f6' },
  shadow: { o: '#30303e', p: '#1e1e28', t: '#8e6cc8', u: '#121218', w: '#3a3a4a', g: '#1e1e28', at: 4, pt: 4, pat: 'strap', a: '#5a4a7a', b: '#b39ddb' },
  dragon: { o: '#c0262a', p: '#4a0d10', t: '#ffd54a', u: '#ffe9a8', w: '#ffd54a', g: '#5a1010', at: 8, pt: 7, pat: 'scale', a: '#ffd54a', b: '#ff8f00', rare: true },
};

function drawCostume(P, sp, ux, by) {
  const cs = sp.cs;
  const A = C(cs.a);
  const B = C(cs.b);
  const X = ux;
  const Y = by;
  if (cs.pat === 'petal') {
    // cánh hoa anh đào rải trên áo
    for (const [x, y] of [[-3, -13], [2, -12], [-1, -10], [3, -8], [-4, -7]]) {
      px(X + x, Y + y, A); px(X + x + 1, Y + y, B); px(X + x, Y + y + 1, B);
    }
  } else if (cs.pat === 'wave') {
    // sóng nước dọc vạt áo
    for (let x = -5; x <= 5; x++) px(X + x, Y - 8 + ((x & 2) ? 1 : 0), (x & 1) ? A : B);
    px(X - 3, Y - 12, B); px(X - 2, Y - 13, A); px(X - 1, Y - 12, B);
  } else if (cs.pat === 'strap') {
    // dây đai chéo ngực của dạ hành nhân, khóa kim loại
    for (let i = 0; i < 6; i++) px(X - 3 + i, Y - 15 + i, i === 3 ? B : A);
    px(X, Y - 12, B); px(X + 1, Y - 12, 0xe0e0f0);
  } else if (cs.pat === 'scale') {
    // ngọc rồng vàng trước ngực, vảy vàng dọc vạt áo
    stamp(X - 3, Y - 14, ['.AA.', 'ABBA', 'ABBA', '.AA.'], { A, B });
    px(X - 2, Y - 13, 0xffffff);
    for (let x = -5; x <= 5; x += 2) { px(X + x, Y - 8, A); px(X + x + 1, Y - 7, B); }
  }
}

// ================= THÚ CƯỠI =================
// Gốc (0, 0) ở mặt đất dưới hông người cưỡi, quay mặt sang phải. Thú 4 chân dựng từ thân + chân + đầu theo loại.
const MOUNTS = {
  horse: { kind: 'quad', len: 13, bodyH: 8, legH: 9, head: 'horse', tail: 'hair', body: '#8a5634', belly: '#c49a6c', mane: '#3a2216', hoof: '#2a1d16', eye: '#1d1424', saddle: '#a8282e', trim: '#f2c230' },
  wolf: { kind: 'quad', len: 12, bodyH: 7, legH: 8, head: 'wolf', tail: 'bush', body: '#8e9aab', belly: '#e3e8ee', mane: '#5d6878', hoof: '#3a3f4a', eye: '#4fc3f7', saddle: '#283593', trim: '#c5cae9' },
  tiger: { kind: 'quad', len: 13, bodyH: 8, legH: 8, head: 'tiger', tail: 'long', body: '#f1ece2', belly: '#ffffff', mane: '#3a3446', hoof: '#bdb4a8', eye: '#40c4ff', saddle: '#00695c', trim: '#ffd54a', stripe: '#3a3446' },
  qilin: { kind: 'quad', len: 13, bodyH: 8, legH: 9, head: 'qilin', tail: 'flame', body: '#2e9e83', belly: '#a7e8c8', mane: '#ff7043', hoof: '#f2c230', eye: '#ffeb3b', saddle: '#7b1fa2', trim: '#ffd54a', scale: '#ffd54a', glow: '#ff9e40' },
  crane: { kind: 'bird', seat: 19, len: 12, body: '#f6f4ef', belly: '#e4e0d8', mane: '#2a2433', hoof: '#9a8a9e', eye: '#1d1424', saddle: '#1565c0', trim: '#ffd54a', crown: '#e53935', beak: '#e0b04a' },
};
// độ cao yên (pixel nghệ thuật) và độ nâng người cưỡi (hông ninja ở y = -8, lún vào yên 1px)
for (const k in MOUNTS) {
  const m = MOUNTS[k];
  if (m.kind === 'quad') m.seat = m.legH + m.bodyH + 1;
  m.lift = m.seat - 7;
}
// nhún thân theo khung chạy (4 khung)
const MOUNT_BOB = [0, -1, 0, -1];

// Đầu + cổ quay phải, gốc (L - 3, yt - 9). c thân, d tối, l sáng, m bờm, M bờm tối, e mắt, n mũi, w trắng, h sừng/vàng, s sọc
const MOUNT_HEADS = {
  horse: [
    '..M.d......',
    '.mMddl.....',
    'mMccccl....',
    'mMccecc....',
    'mMcccccl...',
    'mMccccccll.',
    'mMdcc.dcccn',
    'mMdc...ddd.',
    'mMcc.......',
    'mMccc......',
    '.Mcccc.....',
  ],
  qilin: [
    '.....h.....',
    '..m.dh.....',
    '.mmddlh....',
    'mmccccl....',
    'mMccecc....',
    'mMcccccl...',
    'mmccccccll.',
    'mMdcs.dcccn',
    'mmdc...ddd.',
    'mMcc.......',
    'mmccc......',
    '.Mcccc.....',
  ],
  wolf: [
    '...........',
    '..d..d.....',
    '..cd.cd....',
    '.ccccccl...',
    'Mcceccccl..',
    'Mccccccclll',
    'Mcccccccwwn',
    'Mmccccww...',
    '.mmcccw....',
    '.mMcccc....',
    '..mcccc....',
  ],
  tiger: [
    '...........',
    '..dc..dc...',
    '.cccccccc..',
    'scsccsccc..',
    'ccccecccww.',
    'sccccccwwwn',
    'ccscccwwww.',
    '.ccsccwww..',
    '..ccccc....',
    '..scccc....',
    '..ccccc....',
  ],
};

function mountPalette(m) {
  const b = C(m.body);
  return {
    c: b, d: sh(b, -0.3), l: sh(b, 0.35), w: C(m.belly), m: C(m.mane), M: sh(C(m.mane), -0.35),
    e: C(m.eye), n: sh(b, -0.6), h: C(m.trim), s: C(m.stripe || m.mane), k: INK,
    S: C(m.saddle), T: C(m.trim), F: C(m.hoof),
  };
}

function drawMountLeg(x, top, dx, lift, far, Q) {
  const foot = -1 - lift;
  const pts = linePts(x, top, x + dx, foot);
  const c1 = far ? Q.d : Q.c;
  const c2 = far ? sh(Q.d, -0.15) : Q.l;
  for (let i = 0; i < pts.length; i++) {
    const [lx, ly] = pts[i];
    const hoof = ly >= foot - 1;
    px(lx, ly, hoof ? (far ? sh(Q.F, -0.2) : Q.F) : c1);
    px(lx + 1, ly, hoof ? Q.F : c2);
  }
}

// Một khung thú 4 chân. anim: 'idle' | 'walk' | 'jump'
function buildQuad(m, Q, anim, f) {
  const L = m.len;
  const BH = m.bodyH;
  const bob = anim === 'walk' ? MOUNT_BOB[f] : anim === 'jump' ? -1 : 0;
  const yb = -m.legH - 1 + bob;
  const yt = yb - BH + 1;
  // dáng chân: [độ lệch bàn chân, độ nhấc]
  const G = [[2, 0], [0, 1], [-2, 0], [0, 2]];
  const leg = (front, far) => {
    if (anim === 'jump') return front ? [3, 3] : [-3, 2];
    if (anim !== 'walk') return [front ? 0 : 0, 0];
    const ph = (front !== far) ? f : (f + 2) % 4;
    return G[ph];
  };
  // chân phía xa (tối) vẽ trước
  for (const [x, front, far] of [[-L + 3, false, true], [L - 2, true, true], [-L + 1, false, false], [L - 4, true, false]]) {
    const [dx, lift] = leg(front, far);
    drawMountLeg(x, yb + 1, dx, lift, far, Q);
    // bắp đùi / vai dày hơn ở phần trên chân gần
    if (!far) for (let i = 1; i <= 3; i++) px(front ? x + 2 : x - 1, yb + i, front ? Q.c : Q.d);
  }
  // đuôi
  const sway = anim === 'walk' ? (f & 1) : anim === 'idle' ? (f & 1) : 0;
  if (m.tail === 'hair' || m.tail === 'flame') {
    const pts = [[-L - 1, yt + 1], [-L - 2, yt + 2], [-L - 3, yt + 3], [-L - 3, yt + 4 + sway], [-L - 4, yt + 5 + sway], [-L - 4, yt + 6 + sway], [-L - 3, yt + 7 + sway]];
    pts.forEach(([x, y], i) => {
      const c = m.tail === 'flame' ? (i < 2 ? Q.m : i < 5 ? C('#ffb300') : C('#fff176')) : i > 4 ? Q.M : Q.m;
      px(x, y, c); px(x + 1, y, m.tail === 'flame' ? Q.m : Q.M);
    });
  } else if (m.tail === 'bush') {
    stamp(-L - 5, yt - 1 - sway, ['..ww.', '.cccw', 'dcccc', 'dddc.', '.dd..'], Q);
  } else if (m.tail === 'long') {
    const pts = [[-L - 1, yt + 1], [-L - 2, yt], [-L - 3, yt - 1], [-L - 4, yt - 2], [-L - 4, yt - 3 - sway], [-L - 3, yt - 4 - sway]];
    pts.forEach(([x, y], i) => px(x, y, i % 2 ? Q.s : Q.c));
  }
  // thân: bo tròn hai đầu, sáng ở lưng, bụng nhạt
  for (let r = 0; r < BH; r++) {
    const inset = r === 0 || r === BH - 1 ? 2 : r === 1 || r === BH - 2 ? 1 : 0;
    for (let x = -L + inset; x <= L - inset; x++) {
      let c = Q.c;
      if (r === 0) c = Q.l;
      else if (r >= BH - 2 && x > -L + 3 && x < L - 3) c = Q.w;
      else if (x <= -L + 1 + inset) c = Q.d;
      if (m.stripe && r < BH - 2 && x > -L + inset && ((x + 40 + (r >> 1)) % 5 === 0)) c = Q.s;
      if (m.scale && r > 0 && r < BH - 2 && ((x + (r & 1) * 2) & 3) === 0) c = C(m.scale);
      px(x, yt + r, c);
    }
  }
  // đầu + cổ
  if (m.head && MOUNT_HEADS[m.head]) {
    const nod = anim === 'idle' ? (f >> 1) & 1 : anim === 'walk' ? (f & 1) : 0;
    stamp(L - 3, yt - 9 + nod, MOUNT_HEADS[m.head], Q);
  }
  // bờm lửa kỳ lân
  if (m.tail === 'flame') {
    const ph = f & 1;
    for (const [x, y] of [[L - 4, yt - 8], [L - 5, yt - 6], [L - 5, yt - 4], [L - 4, yt - 2]]) {
      px(x - ph, y, C('#ffb300')); px(x - 1 - ph, y + 1, C('#fff176'));
    }
  }
  // yên + khăn yên
  drawSaddle(Q, yt, -8, 1);
  return yt;
}

function drawSaddle(Q, yt, x0, x1) {
  for (let x = x0; x <= x1; x++) {
    px(x, yt - 1, x === x0 || x === x1 ? sh(Q.S, -0.3) : Q.S);
    px(x, yt, Q.S);
    if (x > x0 && x < x1) {
      px(x, yt + 1, sh(Q.S, -0.15));
      px(x, yt + 2, sh(Q.S, -0.15));
      px(x, yt + 3, Q.T);
    }
  }
  px(x0, yt - 2, sh(Q.S, -0.3)); px(x1, yt - 2, Q.S); px(x1 + 1, yt - 2, Q.T);
  // bàn đạp
  px(x1 - 3, yt + 4, Q.T); px(x1 - 2, yt + 5, Q.T);
}

// Hạc tiên: thân trắng, cánh xếp viền đen, cổ đen cong dài, mào đỏ, chân mảnh
function buildBird(m, Q, anim, f) {
  const bob = anim === 'walk' ? MOUNT_BOB[f] : anim === 'jump' ? -1 : 0;
  const yt = 1 - m.seat + bob;
  const LEG = Q.F;
  // chân: chạy so le, nhảy co về sau
  for (const [i, x0] of [[0, -5], [1, 1]]) {
    let dx = 0;
    let lift = 0;
    if (anim === 'walk') [dx, lift] = [[2, 0], [0, 1], [-2, 0], [0, 1]][(f + i * 2) % 4];
    if (anim === 'jump') { dx = -5 + i; lift = 5; }
    const c = i ? LEG : sh(LEG, -0.25);
    for (const [x, y] of linePts(x0, yt + 7, x0 + dx, -1 - lift)) px(x, y, c);
    px(x0 + dx + 1, -1 - lift, c); px(x0 + dx - 1, -1 - lift, c);
  }
  // đuôi lông đen
  stamp(-16, yt + 1, ['kkM...', '.kkMM.', '..kkMM', '...kM.'], { k: Q.m, M: Q.M });
  // thân hình giọt nước
  const rows = [[-9, 5], [-11, 7], [-12, 8], [-12, 8], [-11, 7], [-9, 5], [-6, 2]];
  rows.forEach(([a, b], r) => {
    for (let x = a; x <= b; x++) px(x, yt + r, r === 0 ? Q.l : r >= 5 ? Q.w : x <= a + 1 ? sh(Q.c, -0.12) : Q.c);
  });
  // cánh: xếp sát thân, chạy thì hé lên, nhảy thì dang rộng ra sau người cưỡi
  const open = anim === 'jump' ? 2 : anim === 'walk' && (f & 1) ? 1 : 0;
  if (open === 2) {
    stamp(-17, yt - 11, [
      'kk...........',
      '.kMd.........',
      '..kMdd.......',
      '...kMddc.....',
      '....kMdccc...',
      '.....kMddcc..',
      '......kMdccc.',
      '.......kdcccc',
      '........dccc.',
      '.........cc..',
    ], { k: Q.m, M: Q.M, d: sh(Q.c, -0.14), c: Q.c });
  } else {
    for (let x = -12; x <= 3; x++) {
      const y0 = yt + 2 - (x < -6 ? open : 0);
      px(x, y0, sh(Q.c, -0.1));
      px(x, y0 + 1, x < -8 ? Q.m : sh(Q.c, -0.2));
      if (x < -6) px(x, y0 + 2, x < -9 ? Q.m : Q.M);
    }
  }
  // cổ đen cong + đầu mào đỏ, mỏ vàng
  const nod = anim === 'idle' ? (f >> 1) & 1 : anim === 'walk' ? (f & 1) : 0;
  // cổ vươn ra trước để đầu hạc cách mũi mặt nạ dài (Thiên Cẩu) của người cưỡi ít nhất 1px
  const neck = [[7, yt + 1], [8, yt], [9, yt - 1], [9, yt - 2], [9, yt - 3], [9, yt - 4], [9, yt - 5], [10, yt - 6], [10, yt - 7], [11, yt - 8], [11, yt - 9], [12, yt - 10]];
  neck.forEach(([x, y], i) => {
    const d = i > 5 ? nod : 0;
    px(x, y + d, i < 2 ? Q.c : Q.m);
    px(x + 1, y + d, i < 2 ? Q.l : Q.M);
  });
  stamp(11, yt - 14 + nod, ['.rr....', 'rrrr...', 'kkekbbb', '.kkk.bb', '..k....'], { r: C(m.crown), k: Q.m, e: 0xffffff, b: C(m.beak) });
  drawSaddle(Q, yt, -8, 1);
  return yt;
}

const mountCache = new Map();
function mountEntry(type, anim, f, flash) {
  const key = `${type}|${anim}${f}${flash ? 'F' : ''}`;
  let e = mountCache.get(key);
  if (e) return e;
  const m = MOUNTS[type];
  clr();
  const Q = m.Q || (m.Q = mountPalette(m));
  if (m.kind === 'bird') buildBird(m, Q, anim, f);
  else buildQuad(m, Q, anim, f);
  e = bake(flash, false, !!m.glow && !flash);
  if (e.aura) e.aura = tinted(e.aura, m.glow);
  mountCache.set(key, e);
  return e;
}

// Độ nâng người cưỡi so với mặt đất (pixel nghệ thuật); 0 khi không cưỡi
export function mountOffset(look) {
  const k = look && look.mount;
  return k && own(MOUNTS, k) ? MOUNTS[k].lift : 0;
}

// Chiều cao từ chân tới đỉnh đầu, tính cả thú cưỡi (nhãn tên, thanh máu, bong bóng chat)
export function ninjaHeight(look) {
  return NINJA_H + mountOffset(look);
}

// ================= SPEC + CACHE =================
const specCache = new Map();
const frameCache = new Map();
const atkState = new Map();

function tierOf(v) {
  return v == null || v < 0 ? -1 : Math.min(TIER_OUTFIT.length - 1, v | 0);
}

function buildSpec(o, key) {
  const look = o.look || {};
  const npc = o.npcType && NPCS[o.npcType] ? o.npcType : null;
  const female = o.gender === 'f';
  const hh = mixHash(o.name || '');
  const mon = !!o.pal && !npc;
  const pal = o.pal;
  const at = pal ? -1 : tierOf(look.a);
  const pt = pal ? -1 : tierOf(look.p);
  const ht = tierOf(look.h);
  const wt = tierOf(look.w);
  const accent = pal ? C(pal[1]) : C(ELEMENT_COLORS[o.el] || '#ff7043');
  const outfit = pal ? C(pal[0]) : at >= 0 ? C(TIER_OUTFIT[at]) : C(CLASS_OUTFIT[o.cls] || '#6a5a7a');
  let pants;
  if (pal) pants = sh(C(pal[0]), -0.4);
  else if (pt >= 0) pants = sh(C(TIER_OUTFIT[pt]), -0.32);
  else pants = 0x3c3650;
  let trim;
  if (pal) trim = sh(C(pal[0]), 0.45);
  else if (at < 0) trim = sh(outfit, 0.42);
  else trim = C(TIER_TRIM[at]);
  const sp = {
    key,
    npc,
    mon,
    female,
    hair: female ? FEMALE_HAIR[(hh >>> 2) % 4] : MALE_HAIR[(hh >>> 2) % 4],
    hairCol: pal ? C(pal[2]) : C(HAIR[(hh >>> 5) % HAIR.length]),
    skin: pal && pal[3] ? C(pal[3]) : C(SKIN[(hh >>> 9) % SKIN.length]),
    iris: mon ? 0xd8323c : C(IRIS[(hh >>> 7) % IRIS.length]),
    outfit,
    pants,
    trim,
    under: 0x2a2638,
    accent,
    bandCol: pal ? sh(C(pal[0]), -0.45) : ht >= 6 ? sh(C(TIER_OUTFIT[ht]), -0.2) : 0x3e4a7c,
    wrap: pal ? sh(C(pal[0]), 0.3) : 0xe6e0d2,
    glove: pal ? sh(C(pal[0]), -0.55) : 0x3a3048,
    maskCol: pal ? sh(C(pal[0]), -0.3) : 0x34344e,
    at,
    pt,
    ht,
    wt,
    wcol: C(TIER_METAL[wt >= 0 ? wt : 2]),
    weapon: npc ? null : o.weaponType || null,
    mask: !o.noMask && (mon || (!female && (hh >>> 11) % 3 === 0)),
    wp: look.wp || 0,
  };
  if (mon) sp.ht = -1;
  // thời trang (chỉ người chơi): mặt nạ thay khăn che mặt, trang phục thay màu áo quần
  if (!pal && !npc) {
    if (own(MASKS, look.mask)) {
      sp.fmask = look.mask;
      sp.mask = false;
    }
    if (own(CLOAKS, look.cloak)) {
      const k = CLOAKS[look.cloak];
      const c = C(k.c);
      sp.ck = { c, d: sh(c, -0.3), l: C(k.l), t: C(k.t), pat: k.pat };
    }
    if (own(COSTUMES, look.costume)) {
      const cs = COSTUMES[look.costume];
      sp.cs = cs;
      sp.outfit = C(cs.o);
      sp.pants = C(cs.p);
      sp.trim = C(cs.t);
      sp.under = C(cs.u);
      sp.wrap = C(cs.w);
      sp.glove = C(cs.g);
      sp.at = cs.at;
      sp.pt = cs.pt;
    }
  }
  if (npc) {
    sp.mask = false;
    NPCS[npc](sp, pal || ['#666', '#ccc', '#333']);
    if (sp.npcWeapon) sp.npc = null;
  }
  sp.P = makePalette(sp);
  return sp;
}

function attackFrame(o) {
  if (o.atkP != null) return Math.max(0, Math.min(2, Math.floor(o.atkP * 3)));
  const key = `${o.name || ''}|${o.cls || ''}`;
  const now = performance.now() / 1000;
  let s = atkState.get(key);
  if (!s || now - s.last > 0.15) {
    if (atkState.size > 400) atkState.clear();
    s = { start: now, last: now };
    atkState.set(key, s);
  }
  s.last = now;
  return Math.floor((now - s.start) / 0.085) % 3;
}

function getEntry(sp, anim, f, flash, ride) {
  const key = `${sp.key}#${anim}${f}${flash ? 'F' : ''}${ride ? 'R' : ''}`;
  let e = frameCache.get(key);
  if (e) return e;
  if (frameCache.size > 2400) frameCache.clear();
  const dead = buildFrame(sp, sp.P, anim, f, ride);
  if (dead) rotateDead();
  const wb = sp.wp >= 11 ? 3 : sp.wp >= 8 ? 2 : 0;
  e = bake(flash, wb >= 2 && !flash && !dead, wb >= 3 && !flash && !dead);
  if (e.glow) e.glow = tinted(e.glow, css(sh(sp.wcol, 0.3)));
  if (e.aura) e.aura = tinted(e.aura, css(sp.wcol));
  frameCache.set(key, e);
  return e;
}

function flipped(e) {
  if (!e.flip) {
    e.flip = {
      cv: flipCanvas(e.cv), ox: e.w - e.ox, oy: e.oy,
      glow: e.glow ? flipCanvas(e.glow) : null, aura: e.aura ? flipCanvas(e.aura) : null,
    };
  }
  return e.flip;
}

function specOf(o) {
  const look = o.look || {};
  const wp = look.wp || 0;
  const wpb = wp >= 11 ? 3 : wp >= 8 ? 2 : wp >= 5 ? 1 : 0;
  const key = `${o.cls}|${o.gender}|${o.name}|${look.w}|${look.a}|${look.p}|${look.h}|${wpb}|${o.el}|${o.weaponType}|${o.pal ? o.pal.join(',') : ''}|${o.npcType || ''}|${o.noMask ? 1 : 0}|${look.mask || ''}|${look.cloak || ''}|${look.costume || ''}`;
  let sp = specCache.get(key);
  if (!sp) {
    if (specCache.size > 600) specCache.clear();
    sp = buildSpec(o, key);
    sp.wp = wp;
    specCache.set(key, sp);
  }
  return sp;
}

// ================= NINJA =================
// o: { dir, cls, gender, look:{w,a,p,h,wp,mask?,cloak?,costume?,mount?}, anim:'idle'|'walk'|'jump'|'attack'|'dead', t, name, el,
//      weaponType, pal:[áo, điểm nhấn, tóc, da], scale, flash, noMask, npcType?, atkP? (0..1), noShadow? }
// look.mount: vẽ thú cưỡi dưới chân (y vẫn là mặt đất), người cưỡi nâng lên mountOffset(look); trọng thương thì xuống thú.
export function drawNinja(ctx, x, y, o) {
  const ps = Math.max(1, Math.round(o.scale || 1));
  const dir = o.dir || 1;
  const sp = specOf(o);
  let anim = o.anim || 'idle';
  if (!NFRAMES[anim]) anim = 'idle';
  const t = (o.t || 0) + (sp.npc ? (hash(o.name || '') % 97) / 31 : 0);
  let f = 0;
  if (anim === 'idle') f = Math.floor(t * 2.6) % 4;
  else if (anim === 'walk') f = Math.floor(t * 12) % 6;
  else if (anim === 'jump') f = Math.floor(t * 8) % 2;
  else if (anim === 'attack') f = attackFrame(o);
  const flash = !!o.flash;
  const look = o.look || {};
  const mk = !sp.npc && !o.pal && anim !== 'dead' && own(MOUNTS, look.mount) ? look.mount : null;
  const e0 = getEntry(sp, anim, f, flash, !!mk);
  const e = dir < 0 ? flipped(e0) : e0;
  let X = Math.round(x);
  let Y = Math.round(y);
  // Canvas xem trước nhỏ (chọn nhân vật): đẩy xuống để không cụt đầu
  const cvs = ctx.canvas;
  if (ps > 1 && cvs && cvs.width <= 160 && cvs.height <= 200) Y = Math.max(Y, ((mk ? ninjaHeight(look) : NINJA_H) + 2) * ps);
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  // bóng dưới chân
  if (!o.noShadow) {
    // bóng elip 3 hàng, đậm ở lõi (thú cưỡi: bóng rộng theo thân thú)
    const sw = mk ? (MOUNTS[mk].len || 9) + 2 : anim === 'dead' ? 13 : anim === 'jump' ? 4 : 6;
    ctx.fillStyle = 'rgba(20,10,30,0.2)';
    ctx.fillRect(X - (sw - 2) * ps, Y - ps, (sw - 2) * 2 * ps, ps);
    ctx.fillRect(X - sw * ps, Y, sw * 2 * ps, ps);
    ctx.fillRect(X - (sw - 3) * ps, Y + ps, (sw - 3) * 2 * ps, ps);
    ctx.fillStyle = 'rgba(20,10,30,0.16)';
    ctx.fillRect(X - (sw - 3) * ps, Y, (sw - 3) * 2 * ps, ps);
  }
  if (mk) {
    // thú chạy 10 khung/giây, đứng thì thở chậm; người cưỡi nhún theo thân thú
    const ma = anim === 'walk' ? 'walk' : anim === 'jump' ? 'jump' : 'idle';
    const mf = ma === 'walk' ? Math.floor(t * 10) % 4 : ma === 'idle' ? Math.floor(t * 1.6) % 4 : 0;
    const m0 = mountEntry(mk, ma, mf, flash);
    const me = dir < 0 ? flipped(m0) : m0;
    const mx0 = X - me.ox * ps;
    const my0 = Y - me.oy * ps;
    if (me.aura) {
      ctx.globalAlpha = 0.4 + Math.sin((o.t || 0) * 4) * 0.18;
      ctx.drawImage(me.aura, mx0, my0, m0.w * ps, m0.h * ps);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(me.cv, mx0, my0, m0.w * ps, m0.h * ps);
    const bob = ma === 'walk' ? MOUNT_BOB[mf] : ma === 'jump' ? -1 : 0;
    Y -= (MOUNTS[mk].lift - bob) * ps;
    // người cưỡi ngồi lùi về sau để lộ cổ và đầu thú
    X -= 3 * dir * ps;
  }
  const dx = X - e.ox * ps;
  const dy = Y - e.oy * ps;
  const now = o.t || 0;
  // hào quang toàn thân (cường hóa >= 11)
  if (e.aura) {
    ctx.globalAlpha = 0.45 + Math.sin(now * 5) * 0.2;
    ctx.drawImage(e.aura, dx, dy, e0.w * ps, e0.h * ps);
    ctx.globalAlpha = 1;
    drawAuraSparks(ctx, X, Y, ps, now, sp.wcol);
  }
  // vũ khí phát sáng (>= 8)
  if (e.glow) {
    ctx.globalAlpha = 0.55 + Math.sin(now * 7) * 0.25;
    ctx.drawImage(e.glow, dx, dy, e0.w * ps, e0.h * ps);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(e.cv, dx, dy, e0.w * ps, e0.h * ps);
  // lấp lánh (>= 5)
  if (sp.wp >= 5 && !flash && e0.wpx.length) drawSparkle(ctx, X, Y, ps, dir, now, e0.wpx, sp);
  ctx.imageSmoothingEnabled = prevSmooth;
}

function drawSparkle(ctx, X, Y, ps, dir, t, wpx, sp) {
  const n = wpx.length >> 1;
  const count = sp.wp >= 8 ? 3 : 2;
  for (let k = 0; k < count; k++) {
    const step = Math.floor(t * 6 + k * 3.7);
    const ph = (t * 6 + k * 3.7) - step;
    const idx = (hash(`${step}`) + k * 13) % n;
    let sx = wpx[idx * 2];
    const sy = wpx[idx * 2 + 1];
    if (dir < 0) sx = -sx - 1;
    const px0 = X + sx * ps;
    const py0 = Y + sy * ps;
    const a = Math.sin(ph * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(px0, py0, ps, ps);
    if (a > 0.35) {
      ctx.fillStyle = css(sh(sp.wcol, 0.6), a * 0.9);
      ctx.fillRect(px0 - ps, py0, ps, ps);
      ctx.fillRect(px0 + ps, py0, ps, ps);
      ctx.fillRect(px0, py0 - ps, ps, ps);
      ctx.fillRect(px0, py0 + ps, ps, ps);
      if (a > 0.8) {
        ctx.fillStyle = css(sh(sp.wcol, 0.3), 0.6);
        ctx.fillRect(px0 - 2 * ps, py0, ps, ps);
        ctx.fillRect(px0 + 2 * ps, py0, ps, ps);
        ctx.fillRect(px0, py0 - 2 * ps, ps, ps);
        ctx.fillRect(px0, py0 + 2 * ps, ps, ps);
      }
    }
  }
}

function drawAuraSparks(ctx, X, Y, ps, t, col) {
  const c1 = css(sh(col, 0.5), 0.9);
  const c2 = css(col, 0.7);
  for (let i = 0; i < 6; i++) {
    const life = (t * 0.9 + i / 6) % 1;
    const sx = Math.round(Math.sin(i * 2.4 + Math.floor(t * 0.9 + i / 6) * 1.7) * 9);
    const sy = Math.round(-2 - life * 30);
    ctx.fillStyle = life < 0.5 ? c1 : c2;
    ctx.fillRect(X + sx * ps, Y + sy * ps, ps, ps * (life < 0.3 ? 2 : 1));
  }
}

// Chân dung bán thân (avatar HUD): lấp đầy canvas đích, phóng nguyên lần
export function drawPortrait(ctx, o) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const sp = specOf({ ...o, weaponType: o.weaponType || null });
  const e = getEntry(sp, 'idle', 0, false);
  // vùng cần thấy: đầu + vai (~21 pixel nghệ thuật), phóng nguyên lần cho vừa khung
  const s = Math.max(1, Math.round(Math.min(W, H) / 21));
  const viewW = W / s;
  const viewH = H / s;
  const top = -29 - Math.max(0, Math.floor((viewH - 22) / 2));
  const ox = Math.round(viewW / 2 + 1);
  const oy = -top;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (o.bg !== false) {
    const el = C(ELEMENT_COLORS[o.el] || '#ff7043');
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 1, W / 2, H * 0.45, Math.max(W, H) * 0.7);
    g.addColorStop(0, css(sh(el, -0.2), 0.55));
    g.addColorStop(1, css(sh(el, -0.8), 0.15));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(e.cv, (ox - e.ox) * s, (oy - e.oy) * s, e.w * s, e.h * s);
  ctx.imageSmoothingEnabled = prev;
}
