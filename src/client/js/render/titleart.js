// Đồ họa màn hình mở đầu (tự vẽ bằng code): logo pixel "NINJA SCHOOL", nền làng động lúc hoàng hôn,
// bục xem trước nhân vật có hiệu ứng hệ, icon hệ. Mọi thứ dựng ở độ phân giải thấp rồi phóng nguyên lần.
import { drawNinja } from './sprites.js';
import { MapRenderer } from './maprender.js';

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixCache = new Map();
const mix = (a, b, f) => {
  const key = `${a}${b}${f}`;
  let out = mixCache.get(key);
  if (out) return out;
  const A = hex(a);
  const B = hex(b);
  out = `#${A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join('')}`;
  mixCache.set(key, out);
  return out;
};
const hash1 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ================= MẶT NẠ ĐIỂM ẢNH =================
class Mask {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.a = new Uint8Array(w * h);
  }

  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.a[y * this.w + x] : 0;
  }

  set(x, y, v = 1) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = v;
  }

  rect(x, y, w, h, v = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v);
  }
}

// Bỏ góc ngoài 1px cho chữ tròn trịa
function roundCorners(m) {
  const cut = [];
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.get(x, y)) continue;
      const v = !m.get(x, y - 1) || !m.get(x, y + 1);
      const h = !m.get(x - 1, y) || !m.get(x + 1, y);
      if (v && h) cut.push(x, y);
    }
  }
  for (let i = 0; i < cut.length; i += 2) m.set(cut[i], cut[i + 1], 0);
}

// Phông chữ khối tự thiết kế: chữ lớn (cao 20, nét 4) cho "NINJA", chữ nhỏ (cao 13, nét 3) cho "SCHOOL"
const BIG_H = 20;
const BIG = {
  N: { w: 16, r: [[0, 0, 4, 20], [12, 0, 4, 20]], diag: 4, cut: [[0, 0], [15, 0], [0, 19], [15, 19], [4, 0], [11, 19]] },
  I: { w: 5, r: [[0, 0, 5, 20]], cut: [[0, 0], [4, 0], [0, 19], [4, 19]] },
  J: { w: 15, r: [[5, 0, 10, 4], [10, 4, 5, 13], [1, 16, 14, 3], [2, 19, 12, 1], [0, 11, 5, 7]], round: true },
  A: { w: 16, r: [[4, 0, 8, 1], [2, 1, 12, 1], [1, 2, 14, 1], [0, 3, 16, 1], [0, 4, 4, 16], [12, 4, 4, 16], [4, 10, 8, 4]], round: true },
};
const SMALL_H = 13;
const SMALL = {
  S: { w: 10, r: [[0, 0, 10, 3], [0, 3, 3, 2], [0, 5, 10, 3], [7, 8, 3, 2], [0, 10, 10, 3]], round: true },
  C: { w: 10, r: [[0, 0, 10, 3], [0, 3, 3, 7], [0, 10, 10, 3]], round: true },
  H: { w: 10, r: [[0, 0, 3, 13], [7, 0, 3, 13], [3, 5, 4, 3]], round: true },
  O: { w: 10, r: [[0, 0, 10, 3], [0, 10, 10, 3], [0, 3, 3, 7], [7, 3, 3, 7]], round: true },
  L: { w: 9, r: [[0, 0, 3, 13], [3, 10, 6, 3]], round: true },
};

function glyph(def, H) {
  const m = new Mask(def.w, H);
  for (const r of def.r) m.rect(...r);
  if (def.diag) for (let y = 0; y < H; y++) m.rect(Math.round((y * (def.w - def.diag)) / (H - 1)), y, def.diag, 1);
  if (def.round) roundCorners(m);
  if (def.cut) for (const [x, y] of def.cut) m.set(x, y, 0);
  return m;
}

function word(text, font, H, gap, shear) {
  const gs = [...text].map((ch) => glyph(font[ch], H));
  const slant = shear ? Math.floor((H - 1) / shear) : 0;
  const W = gs.reduce((s, g) => s + g.w + gap, -gap) + slant;
  const m = new Mask(W, H);
  let x = 0;
  for (const g of gs) {
    for (let y = 0; y < H; y++) {
      const off = shear ? Math.floor((H - 1 - y) / shear) : 0;
      for (let i = 0; i < g.w; i++) if (g.get(i, y)) m.set(x + i + off, y);
    }
    x += g.w + gap;
  }
  return m;
}

// Giãn mặt nạ 1px (8 hướng) → trả về các điểm mới
function grow(U, W, H) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (U[i]) continue;
      let hit = 0;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < W && U[yy * W + xx]) { hit = 1; break; }
        }
      }
      out[i] = hit;
    }
  }
  return out;
}

function paint(cv, W, H, colorAt) {
  const g = cv.getContext('2d');
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = colorAt(x, y, y * W + x);
      if (!c) continue;
      const [r, gg, b] = hex(c);
      const k = (y * W + x) * 4;
      d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

// Phi tiêu 4 cánh xoay (cache theo góc)
const SHUR_N = 32;
const shurCache = [];
function shuriken(step) {
  const k = ((step % SHUR_N) + SHUR_N) % SHUR_N;
  if (shurCache[k]) return shurCache[k];
  const S = 21;
  const c = S / 2;
  const th = (k / SHUR_N) * (Math.PI / 2);
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = th + (i * Math.PI) / 2;
    pts.push([c + Math.cos(a) * 9.4, c + Math.sin(a) * 9.4]);
    const b = a + Math.PI / 4 + 0.22;
    pts.push([c + Math.cos(b) * 3.3, c + Math.sin(b) * 3.3]);
  }
  const inside = (px, py) => {
    let o = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) o = !o;
    }
    return o;
  };
  const F = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inside(x + 0.5, y + 0.5)) F[y * S + x] = 1;
  const O = grow(F, S, S);
  const cv = mk(S, S);
  paint(cv, S, S, (x, y, i) => {
    if (O[i]) return '#1a1418';
    if (!F[i]) return null;
    const dx = x + 0.5 - c;
    const dy = y + 0.5 - c;
    const r = Math.hypot(dx, dy);
    if (r < 1.3) return null;
    if (r < 2.4) return '#2c2a34';
    if (r < 3.2) return '#c9a24a';
    // mặt sáng/tối theo phía của cánh
    let a = Math.atan2(dy, dx) - th;
    a = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    const lit = a < Math.PI / 4;
    if (r > 7.6) return lit ? '#ffffff' : '#aab4c4';
    return lit ? '#dfe6ef' : '#7d889c';
  });
  shurCache[k] = cv;
  return cv;
}

// Dựng logo: lớp sau (băng rôn SCHOOL) + lớp trước (chữ NINJA nổi khối)
export function buildLogo() {
  const n = word('NINJA', BIG, BIG_H, 3, 5);
  const s = word('SCHOOL', SMALL, SMALL_H, 2, 0);
  const bw = s.w + 18;
  const bh = 19;
  const W = Math.max(n.w + 10, bw + 24) + 26;
  const fx = Math.round((W - n.w) / 2) - 2;
  const fy = 5;
  const by = fy + BIG_H + 1;
  const bx = Math.round((W - bw) / 2);
  const H = by + bh + 8;

  // ----- lớp trước: NINJA
  const F = new Uint8Array(W * H);
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) if (n.get(x, y)) F[(fy + y) * W + fx + x] = 1;
  const E = new Uint8Array(W * H);
  for (let d = 1; d <= 3; d++) {
    for (let y = 0; y < H - d; y++) {
      for (let x = 0; x < W; x++) {
        const xx = x + (d === 3 ? 1 : 0);
        const q = (y + d) * W + xx;
        if (xx < W && F[y * W + x] && !F[q] && !E[q]) E[q] = d;
      }
    }
  }
  const U = new Uint8Array(W * H);
  for (let i = 0; i < U.length; i++) U[i] = F[i] || E[i] ? 1 : 0;
  const O1 = grow(U, W, H);
  for (let i = 0; i < U.length; i++) U[i] |= O1[i];
  const O2 = grow(U, W, H);
  for (let i = 0; i < U.length; i++) U[i] |= O2[i];
  const O3 = grow(U, W, H);
  const FILL = ['#fffbe8', '#fffbe8', '#fff1a6', '#fff1a6', '#ffe36a', '#ffe36a', '#ffd84a', '#ffcf3e', '#ffc435', '#ffb82c',
    '#ffac26', '#ffa022', '#ff9420', '#ff891d', '#fb7c1b', '#f47019', '#ec6418', '#e35817', '#d84c16', '#cc4214'];
  const front = mk(W, H);
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? F[y * W + x] : 0);
  paint(front, W, H, (x, y, i) => {
    if (F[i]) {
      const ry = Math.max(0, Math.min(19, y - fy));
      let c = FILL[ry];
      if (!at(x, y - 1)) c = '#ffffff';
      else if (!at(x, y + 1)) c = '#b83a10';
      else if (!at(x - 1, y)) c = mix(c, '#ffffff', 0.45);
      else if (!at(x + 1, y)) c = mix(c, '#7a1a06', 0.18);
      return c;
    }
    if (E[i]) return E[i] === 1 ? '#c8461a' : E[i] === 2 ? '#9a2c0e' : '#6a1608';
    if (O1[i]) return '#220803';
    if (O2[i]) {
      const ry = y - fy;
      return ry < 6 ? '#fff6d2' : ry < 13 ? '#ffe08e' : ry < 20 ? '#f4b850' : '#d88a30';
    }
    if (O3[i]) return '#1a0602';
    return null;
  });
  // mặt nạ phần tô (cho vệt sáng quét qua) + điểm lấp lánh
  const fillMask = mk(W, H);
  paint(fillMask, W, H, (x, y, i) => (F[i] ? '#ffffff' : null));
  const sparks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (F[y * W + x] && (!at(x, y - 1) || !at(x - 1, y)) && (x + y) % 3 === 0) sparks.push(x, y);

  // ----- lớp sau: băng rôn sơn mài đỏ + chữ SCHOOL
  const B = new Uint8Array(W * H); // 1 thân, 2 đuôi, 3 nếp gấp, 4 đinh vàng
  const setB = (x, y, v) => {
    if (x >= 0 && y >= 0 && x < W && y < H && (!B[y * W + x] || v === 1 || v === 4)) B[y * W + x] = v;
  };
  const th = bh - 4;
  const ty0 = by + 6;
  for (let j = 0; j < th; j++) {
    const notch = Math.max(0, Math.round(4 - Math.abs(j - (th - 1) / 2) * (8 / th)));
    for (let x = bx - 11 + notch; x < bx + 4; x++) setB(x, ty0 + j, 2);
    for (let x = bx + bw - 4; x < bx + bw + 11 - notch; x++) setB(x, ty0 + j, 2);
  }
  for (let j = 0; j < 4; j++) {
    for (let x = bx; x < bx + 4 - j; x++) setB(x, by + bh + j - 4 + 4, 3);
    for (let x = bx + bw - 4 + j; x < bx + bw; x++) setB(x, by + bh + j - 4 + 4, 3);
  }
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) setB(x, y, 1);
  const studs = [[bx + 5, by + 9], [bx + bw - 6, by + 9]];
  for (const [sx, sy] of studs) {
    setB(sx, sy - 1, 4); setB(sx - 1, sy, 4); setB(sx, sy, 4); setB(sx + 1, sy, 4); setB(sx, sy + 1, 4);
  }
  const T = new Uint8Array(W * H);
  const tx = bx + Math.round((bw - s.w) / 2);
  const ty = by + 3;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.get(x, y)) T[(ty + y) * W + tx + x] = 1;
  const T1 = grow(T, W, H);
  const BU = new Uint8Array(W * H);
  for (let i = 0; i < BU.length; i++) BU[i] = B[i] ? 1 : 0;
  const BO = grow(BU, W, H);
  const BODY = (j) => (j === 0 ? '#7a160c' : j === 1 ? '#f2c260' : j === 2 ? '#ec5a36' : j < bh - 6 ? '#cc3520' : j < bh - 3 ? '#ac2618' : j === bh - 3 ? '#8a1c12' : j === bh - 2 ? '#d9a040' : '#5e0e08');
  const back = mk(W, H);
  paint(back, W, H, (x, y, i) => {
    if (T[i]) {
      const ry = y - ty;
      if (!T[i - W]) return '#ffffff';
      return ry < 5 ? '#fff6e0' : ry < 9 ? '#ffe7b0' : '#f6c770';
    }
    if (T1[i]) return '#2a0603';
    if (y > 0 && T1[i - W] && !T1[i] && B[i] === 1) return '#7a1209';
    if (B[i] === 4) return x === studs[0][0] || x === studs[1][0] ? (y < by + 9 ? '#fff2b0' : '#e0a040') : '#c88a30';
    if (B[i] === 1) {
      let c = BODY(y - by);
      if (y - by > 2 && y - by < bh - 3 && (x === bx || x === bx + bw - 1)) c = '#7a160c';
      return c;
    }
    if (B[i] === 2) return y - ty0 < 3 ? '#a82618' : y - ty0 < th - 3 ? '#8c1c12' : '#64100a';
    if (B[i] === 3) return '#3e0805';
    if (BO[i]) return '#1a0602';
    return null;
  });
  return {
    w: W, h: H, front, back, fillMask, sparks,
    shur: [fx + n.w - 1, fy - 1],
    shur2: [bx - 8, by + bh - 1],
  };
}

const easeOut = (x) => 1 - (1 - x) ** 3;

export class TitleLogo {
  constructor(cv) {
    this.cv = cv;
    this.L = buildLogo();
    cv.width = this.L.w;
    cv.height = this.L.h;
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.shine = mk(this.L.w, this.L.h);
    this.sctx = this.shine.getContext('2d');
    this.t0 = null;
  }

  restart() {
    this.t0 = null;
  }

  draw(now) {
    if (this.t0 == null) this.t0 = now;
    const t = (now - this.t0) / 1000;
    const L = this.L;
    const c = this.ctx;
    c.clearRect(0, 0, L.w, L.h);
    c.drawImage(L.back, 0, 0);
    // phi tiêu bay vào rồi xoay đều
    const k = Math.min(1, t / 0.9);
    const e = easeOut(k);
    const spin = t < 0.9 ? t * 70 : 63 + (t - 0.9) * 9;
    const sx = Math.round(L.shur[0] + (1 - e) * 140);
    const sy = Math.round(L.shur[1] - (1 - e) * 26);
    c.drawImage(shuriken(Math.floor(spin)), sx - 10, sy - 10);
    c.drawImage(L.front, 0, 0);
    const s2 = shuriken(Math.floor(-t * 7));
    if (t > 0.5) c.drawImage(s2, L.shur2[0] - 10 - Math.round((1 - easeOut(Math.min(1, (t - 0.5) / 0.8))) * 160), L.shur2[1] - 10);
    // vệt sáng quét chéo qua chữ
    const per = 4.2;
    const p = ((t + 3.1) % per) / 0.9;
    if (p < 1) {
      const g = this.sctx;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, L.w, L.h);
      const x0 = -24 + p * (L.w + 48);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.moveTo(x0, 0); g.lineTo(x0 + 7, 0); g.lineTo(x0 - 7, L.h); g.lineTo(x0 - 14, L.h); g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.moveTo(x0 + 10, 0); g.lineTo(x0 + 12, 0); g.lineTo(x0 - 2, L.h); g.lineTo(x0 - 4, L.h); g.closePath();
      g.fill();
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(L.fillMask, 0, 0);
      g.globalCompositeOperation = 'source-over';
      c.drawImage(this.shine, 0, 0);
    }
    // lấp lánh hình sao 4 cánh
    const n = L.sparks.length >> 1;
    if (n) {
      for (let i = 0; i < 4; i++) {
        const q = t * 0.9 + i * 0.27;
        const cyc = Math.floor(q);
        const ph = q - cyc;
        const idx = Math.floor(hash1(cyc * 4 + i) * n);
        const x = L.sparks[idx * 2];
        const y = L.sparks[idx * 2 + 1];
        const a = Math.sin(ph * Math.PI);
        if (a < 0.15) continue;
        c.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        c.fillRect(x, y, 1, 1);
        if (a > 0.45) {
          c.fillStyle = `rgba(255,248,200,${(a * 0.85).toFixed(2)})`;
          c.fillRect(x - 1, y, 3, 1);
          c.fillRect(x, y - 1, 1, 3);
        }
        if (a > 0.85) {
          c.fillStyle = 'rgba(255,240,170,0.55)';
          c.fillRect(x - 2, y, 1, 1); c.fillRect(x + 2, y, 1, 1);
          c.fillRect(x, y - 2, 1, 1); c.fillRect(x, y + 2, 1, 1);
        }
      }
    }
  }
}

// ================= ICON HỆ (13x13) =================
const iconUrlCache = new Map();
export function elementIconURL(el) {
  if (iconUrlCache.has(el)) return iconUrlCache.get(el);
  const S = 13;
  const F = new Uint8Array(S * S);
  const col = new Array(S * S).fill(null);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let c = null;
      if (el === 'fire') {
        const body = (px - 6.5) ** 2 + (py - 8.2) ** 2 <= 4.2 ** 2;
        const tip = py > 1 && py < 8.5 && Math.abs(px - 6.5 + (8.5 - py) * 0.18) <= (py - 1) * 0.58;
        const lick = py > 3 && py < 8 && Math.abs(px - 10 + (8 - py) * 0.1) <= (py - 3) * 0.35;
        if (body || tip || lick) {
          const core = (px - 6.5) ** 2 + (py - 9.2) ** 2;
          c = core <= 2.3 ** 2 ? '#fff4b8' : core <= 3.6 ** 2 || py > 6 ? '#ffb238' : '#ff5a2a';
          if (core > 3.6 ** 2 && py <= 6 && Math.abs(px - 6.5) < 1.2) c = '#ff8a30';
        }
      } else if (el === 'water') {
        const body = (px - 6.5) ** 2 + (py - 8.3) ** 2 <= 4.1 ** 2;
        const tip = py > 1 && py < 8.3 && Math.abs(px - 6.5) <= (py - 1) * 0.56;
        if (body || tip) {
          c = '#3d9cf0';
          if (px > 7.5 && py > 7) c = '#2172c8';
          if ((px - 5) ** 2 + (py - 8) ** 2 <= 1.4 ** 2) c = '#ffffff';
          else if ((px - 5.2) ** 2 + (py - 8.6) ** 2 <= 2.6 ** 2) c = '#9fd4ff';
        }
      } else {
        const u = ((px - 6.5) + (py - 6.5)) / Math.SQRT2;
        const v = ((px - 6.5) - (py - 6.5)) / Math.SQRT2;
        if ((u / 6.4) ** 2 + (v / 3.3) ** 2 <= 1 && u > -6) {
          c = v < -1 ? '#a8e070' : '#5cb85a';
          if (v > 1.2) c = '#3e8f40';
          if (Math.abs(v) < 0.55 && u > -5) c = '#e8ffd0';
        }
        if (!c && x <= 2 && y >= 10 && Math.abs(x - (12 - y)) <= 0) c = '#5a3a1a';
      }
      if (c) {
        F[y * S + x] = 1;
        col[y * S + x] = c;
      }
    }
  }
  const O = grow(F, S, S);
  const cv = mk(S, S);
  const dark = el === 'fire' ? '#4a1006' : el === 'water' ? '#0c2a5a' : '#173a14';
  paint(cv, S, S, (x, y, i) => (F[i] ? col[i] : O[i] ? dark : null));
  const url = cv.toDataURL();
  iconUrlCache.set(el, url);
  return url;
}

// ================= BỤC XEM TRƯỚC NHÂN VẬT =================
const ELC = { fire: '#ff7043', water: '#42a5f5', wind: '#66bb6a' };
const pedCache = new Map();
function pedestal(el, rx) {
  const key = `${el}|${rx}`;
  if (pedCache.has(key)) return pedCache.get(key);
  const ry = Math.max(3, Math.round(rx * 0.3));
  const thick = 4;
  const W = rx * 2 + 5;
  const H = ry * 2 + thick + 5;
  const cx = W / 2;
  const cy = ry + 2.5;
  const top = new Uint8Array(W * H);
  const side = new Uint8Array(W * H);
  const inTop = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inTop(x, y)) top[y * W + x] = 1;
      else for (let k = 1; k <= thick; k++) if (inTop(x, y - k)) { side[y * W + x] = 1; break; }
    }
  }
  const U = new Uint8Array(W * H);
  for (let i = 0; i < U.length; i++) U[i] = top[i] | side[i];
  const O = grow(U, W, H);
  const ec = ELC[el] || '#ff7043';
  const cv = mk(W, H);
  paint(cv, W, H, (x, y, i) => {
    if (top[i]) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d > 0.8) return y + 0.5 < cy ? '#d8c8b0' : '#9c8a78';
      if (d > 0.5 && d <= 0.66) return mix(ec, '#ffffff', 0.35);
      if (d > 0.42 && d <= 0.5) return mix(ec, '#000000', 0.25);
      return d < 0.12 ? '#b8a690' : '#a89682';
    }
    if (side[i]) {
      const r = y - cy;
      let c = r < ry + 2 ? '#76645a' : '#54443c';
      if (Math.round(x - cx) % 6 === 0) c = '#3e322c';
      return c;
    }
    if (O[i]) return '#1a1210';
    return null;
  });
  const out = { cv, w: W, h: H, cy: Math.round(cy) };
  pedCache.set(key, out);
  return out;
}

const glowCache = new Map();
function glow(col, r) {
  const key = `${col}|${r}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = mk(r * 2, r * 2);
  const g = c.getContext('2d');
  // vòng sáng nấc thang (pixel), không mượt
  const [R, G, B] = hex(col);
  for (let y = 0; y < r * 2; y++) {
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d >= 1) continue;
      const a = d < 0.35 ? 0.5 : d < 0.6 ? 0.32 : d < 0.82 ? 0.18 : 0.08;
      g.fillStyle = `rgba(${R},${G},${B},${a})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  glowCache.set(key, c);
  return c;
}

// Vẽ bục + nhân vật + hiệu ứng hệ vào canvas độ phân giải thấp.
// o: { el, cls, gender, name, look, anim, dir, t, atkP, jy (độ cao nhảy), rx (bán kính bục) }
export function drawStage(ctx, W, H, o) {
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const t = o.t || 0;
  const el = o.el || 'fire';
  const ec = ELC[el];
  const rx = o.rx || Math.round(W * 0.36);
  const ped = pedestal(el, rx);
  const cx = Math.round(W / 2);
  const baseY = H - ped.h + ped.cy;
  // hào quang sau lưng
  const gr = Math.round(Math.min(W, H) * 0.42);
  ctx.globalAlpha = 0.55 + Math.sin(t * 2.2) * 0.15;
  ctx.drawImage(glow(ec, gr), cx - gr, baseY - 15 - gr);
  ctx.globalAlpha = 1;
  ctx.drawImage(ped.cv, cx - Math.floor(ped.w / 2), H - ped.h);
  // ánh sáng vòng phép trên bục
  const pulse = (Math.sin(t * 3) + 1) / 2;
  ctx.fillStyle = mix(ec, '#ffffff', 0.6);
  ctx.globalAlpha = 0.35 + pulse * 0.4;
  for (let i = 0; i < 6; i++) {
    const a = t * 0.8 + (i * Math.PI) / 3;
    ctx.fillRect(Math.round(cx + Math.cos(a) * rx * 0.76), Math.round(baseY + Math.sin(a) * rx * 0.3 * 0.76), 1, 1);
  }
  ctx.globalAlpha = 1;
  const parts = particles(el, t, cx, baseY, rx, H);
  for (const p of parts) if (p.back) dot(ctx, p);
  drawNinja(ctx, cx, baseY - (o.jy || 0), {
    dir: o.dir || 1, cls: o.cls, gender: o.gender, look: o.look || { w: 0 }, anim: o.anim || 'idle', t, atkP: o.atkP,
    name: o.name || 'ninja', el, weaponType: o.weaponType, noShadow: false,
  });
  for (const p of parts) if (!p.back) dot(ctx, p);
}

function dot(ctx, p) {
  ctx.globalAlpha = p.a;
  ctx.fillStyle = p.c;
  if (p.ring) {
    ctx.fillRect(p.x, p.y - 1, 1, 1); ctx.fillRect(p.x - 1, p.y, 1, 1); ctx.fillRect(p.x + 1, p.y, 1, 1); ctx.fillRect(p.x, p.y + 1, 1, 1);
  } else ctx.fillRect(p.x, p.y, p.w || 1, p.h || 1);
  ctx.globalAlpha = 1;
}

const partBuf = [];
function particles(el, t, cx, baseY, rx, H) {
  partBuf.length = 0;
  if (el === 'fire') {
    for (let i = 0; i < 9; i++) {
      const life = (t * 0.55 + i / 9) % 1;
      const x = Math.round(cx + (hash1(i + 3) - 0.5) * rx * 1.7 + Math.sin(t * 2 + i) * 2);
      const y = Math.round(baseY - 1 - life * (H * 0.75));
      partBuf.push({ x, y, c: life < 0.35 ? '#fff0a0' : life < 0.7 ? '#ffab40' : '#ff5a2a', a: 1 - life * 0.9, back: i % 3 === 0, w: 1, h: life < 0.3 ? 2 : 1 });
    }
  } else if (el === 'water') {
    for (let i = 0; i < 8; i++) {
      const life = (t * 0.38 + i / 8) % 1;
      const x = Math.round(cx + (hash1(i + 9) - 0.5) * rx * 1.8 + Math.sin(t * 3 + i * 2) * 1.5);
      const y = Math.round(baseY - 2 - life * (H * 0.7));
      partBuf.push({ x, y, c: i % 2 ? '#d6f0ff' : '#7cc4ff', a: 1 - life * 0.8, back: i % 3 === 0, ring: i % 2 === 0 });
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const a = t * 1.6 + (i * Math.PI * 2) / 7;
      const s = Math.sin(a);
      const x = Math.round(cx + Math.cos(a) * rx * 0.95);
      const y = Math.round(baseY - 5 - (i % 4) * 6 + s * 3);
      const flip = Math.sin(t * 6 + i) > 0;
      partBuf.push({ x, y, c: i % 2 ? '#b8ec80' : '#6cc04a', a: 0.95, back: s < 0, w: flip ? 2 : 1, h: flip ? 1 : 2 });
    }
  }
  return partBuf;
}

// Cành hoa anh đào treo ở góc trên (khung tranh cho màn hình mở đầu)
let branchSpr = null;
function branch() {
  if (branchSpr) return branchSpr;
  const W = 150;
  const H = 74;
  const M = new Uint8Array(W * H); // 1 vỏ cây, 2 vỏ sáng, 3-6 hoa (bóng, nền, sáng, nhụy)
  const put = (x, y, v, over) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (over || !M[i]) M[i] = v;
  };
  const stroke = (pts, w0, w1) => {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d <= len; d += 0.5) {
        const f = (run + d) / total;
        const r = (w0 + (w1 - w0) * f) / 2;
        const cx = x0 + ((x1 - x0) * d) / len;
        const cy = y0 + ((y1 - y0) * d) / len;
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.3) put(cx + xx, cy + yy, yy < -r + 1.2 ? 2 : 1, true);
      }
      run += len;
    }
  };
  stroke([[-4, 4], [22, 10], [48, 9], [74, 18], [104, 20], [128, 30], [146, 34]], 7, 2);
  stroke([[40, 9], [52, 1], [60, -2]], 3, 1);
  stroke([[70, 16], [78, 30], [84, 38]], 3, 1);
  stroke([[100, 20], [112, 12], [120, 9]], 2.5, 1);
  stroke([[18, 9], [24, 22], [22, 32]], 3, 1);
  stroke([[124, 28], [130, 40]], 2, 1);
  const R = (i) => hash1(i * 3.71 + 0.5);
  const clusters = [[12, 14, 7], [30, 6, 6], [56, 2, 6], [50, 14, 7], [80, 30, 8], [76, 14, 5], [96, 24, 6], [116, 10, 6], [122, 28, 6], [24, 28, 6], [140, 36, 5], [86, 40, 5], [64, 22, 4], [6, 4, 5], [134, 26, 4]];
  clusters.forEach(([cx, cy, r], ci) => {
    const n = 4 + Math.floor(R(ci) * 4);
    for (let k = 0; k < n; k++) {
      const a = R(ci * 9 + k) * Math.PI * 2;
      const d = R(ci * 7 + k + 3) * r;
      const bx = cx + Math.cos(a) * d;
      const by = cy + Math.sin(a) * d * 0.8;
      const br = 2.2 + R(ci * 5 + k) * 1.8;
      for (let yy = -br; yy <= br; yy++) {
        for (let xx = -br; xx <= br; xx++) {
          const q = xx * xx + yy * yy;
          if (q > br * br) continue;
          const lit = xx + yy < -br * 0.5;
          const dark = xx + yy > br * 0.7;
          put(bx + xx, by + yy, dark ? 3 : lit ? 5 : 4, true);
        }
      }
    }
    // nhụy hoa
    for (let k = 0; k < 3; k++) put(cx + (R(ci + k * 11) - 0.5) * r * 1.4, cy + (R(ci + k * 13) - 0.5) * r, 6, true);
  });
  const U = new Uint8Array(W * H);
  for (let i = 0; i < U.length; i++) U[i] = M[i] ? 1 : 0;
  const O = grow(U, W, H);
  const cv = mk(W, H);
  const COL = [null, '#3e2430', '#6a4048', '#d8709c', '#f6a8c8', '#ffe0ec', '#ff5a8a'];
  paint(cv, W, H, (x, y, i) => (M[i] ? COL[M[i]] : O[i] ? (M[i - 1] >= 3 || M[i + 1] >= 3 || (y > 0 && M[i - W] >= 3) || M[i + W] >= 3 ? '#8a3058' : '#1e1018') : null));
  const fl = mk(W, H);
  const g = fl.getContext('2d');
  g.translate(W, 0);
  g.scale(-1, 1);
  g.drawImage(cv, 0, 0);
  branchSpr = { cv, fl, w: W, h: H };
  return branchSpr;
}

// ================= NỀN LÀNG ĐỘNG (màn đăng nhập / chọn nhân vật) =================
const NAMES = ['Haru', 'Kenji', 'MaiAnh', 'Rin', 'Sora', 'Yuki', 'Taro', 'HanaKo', 'Ryu', 'Kaito', 'Aki', 'Sakuya', 'Minh', 'Long'];
const CLS = ['kiem', 'tieu', 'kunai', 'cung', 'dao', 'quat'];

export class TitleScene {
  constructor(G, mapId = 'v_fire') {
    this.G = G;
    const map = G.maps[mapId] || Object.values(G.maps)[0];
    this.map = map;
    this.r = new MapRenderer(map);
    this.t = 0;
    this.actors = [];
    this.petals = [];
    this.grade = null;
    const R = (i) => hash1(i * 7.13);
    const ground = map.ground;
    for (let i = 0; i < 11; i++) {
      const cls = CLS[i % 6];
      const tier = Math.floor(R(i) * 10);
      this.actors.push({
        kind: 'walk', x: 60 + R(i + 40) * (map.w - 120), y: ground, base: ground, minX: 40, maxX: map.w - 40,
        dir: R(i + 5) < 0.5 ? -1 : 1, cls, gender: R(i + 11) < 0.45 ? 'f' : 'm', name: NAMES[i % NAMES.length],
        look: { w: tier, a: Math.max(-1, tier - 1), p: Math.max(-1, tier - 2), h: tier > 3 ? tier - 3 : -1, wp: i === 3 ? 11 : i === 7 ? 8 : tier > 6 ? 5 : 0 },
        speed: 34 + R(i + 77) * 22, st: 'walk', timer: 1 + R(i + 3) * 4, vy: 0, jy: 0, at: R(i) * 9, atk: 0,
      });
    }
    // ninja đứng trên các bục nhảy
    map.platforms.forEach(([px, py, pw], j) => {
      const i = 20 + j;
      const cls = CLS[(j * 2 + 1) % 6];
      this.actors.push({
        kind: 'walk', x: px + pw / 2, y: py, base: py, minX: px + 8, maxX: px + pw - 8, dir: j % 2 ? 1 : -1, cls, gender: j % 2 ? 'f' : 'm',
        name: NAMES[(i + 3) % NAMES.length], look: { w: 6 + j, a: 5 + j, p: 5, h: 4, wp: j === 2 ? 11 : 6 }, speed: 22, st: 'idle', timer: 2 + j, vy: 0, jy: 0, at: j * 3, atk: 0,
      });
    });
    // cặp đấu tập
    const sx = 760;
    this.spar = [
      { x: sx, dir: 1, cls: 'kiem', gender: 'm', name: 'Hayate', look: { w: 7, a: 6, p: 6, h: 5, wp: 8 } },
      { x: sx + 30, dir: -1, cls: 'dao', gender: 'f', name: 'Kaede', look: { w: 7, a: 7, p: 6, h: 5, wp: 8 } },
    ];
  }

  update(dt) {
    this.t += dt;
    for (const a of this.actors) {
      a.at += dt;
      a.timer -= dt;
      if (a.st === 'walk') {
        a.x += a.dir * a.speed * dt;
        a.wt = (a.wt || 0) + (dt * a.speed) / 70;
        if (a.x < a.minX) { a.x = a.minX; a.dir = 1; }
        if (a.x > a.maxX) { a.x = a.maxX; a.dir = -1; }
      }
      if (a.jy > 0 || a.vy !== 0) {
        a.vy -= 620 * dt;
        a.jy += a.vy * dt;
        if (a.jy <= 0) { a.jy = 0; a.vy = 0; }
      }
      if (a.st === 'atk') a.atk += dt / 0.4;
      if (a.timer <= 0) {
        const r = Math.random();
        if (a.st === 'atk' || r < 0.5) { a.st = 'walk'; a.timer = 1.5 + Math.random() * 4; if (Math.random() < 0.3) a.dir = -a.dir; }
        else if (r < 0.75) { a.st = 'idle'; a.timer = 1 + Math.random() * 2.5; }
        else if (r < 0.88 && a.jy === 0) { a.st = 'walk'; a.vy = 190 + Math.random() * 40; a.jy = 0.01; a.timer = 1.2; }
        else { a.st = 'atk'; a.atk = 0; a.timer = 0.4 * (1 + Math.floor(Math.random() * 2)); }
      }
    }
    // hoa anh đào rơi gần ống kính
    while (this.petals.length < 34) {
      this.petals.push({ x: Math.random() * 640, y: Math.random() * 300 - 300, z: Math.random(), s: Math.random() * 10, v: Math.random() });
    }
  }

  draw(game, dt) {
    this.update(dt);
    const c = game.lctx;
    const W = game.W;
    const H = game.H;
    const m = this.map;
    const R = this.r;
    const t = this.t;
    const span = Math.max(1, m.w - W);
    const camX = Math.round(span / 2 + Math.sin(t * 0.055 - 0.6) * span * 0.48);
    const camY = Math.round(Math.max(0, Math.min(m.h - H, m.ground - H * 0.74)));
    R.drawBackground(c, camX, camY, W, H, t);
    R.drawTerrain(c, camX, camY, W, H);
    if (R.drawPortals) R.drawPortals(c, camX, camY, t);
    const G = this.G;
    for (const n of m.npcs || []) {
      if (n.x < camX - 30 || n.x > camX + W + 30) continue;
      const nt = G.npcTypes[n.type];
      if (!nt) continue;
      drawNinja(c, n.x - camX, m.ground - camY, {
        dir: n.x < camX + W / 2 ? 1 : -1, anim: 'idle', t, pal: [nt.look[0], nt.look[2], nt.look[1]], noMask: true, name: n.name, npcType: n.type,
        weaponType: null, look: { h: n.type === 'elder' ? 4 : -1 },
      });
    }
    // cặp đấu tập: luân phiên chém, bên trúng đòn nháy sáng
    const cyc = t % 1.8;
    const sp = this.spar;
    if (sp[0].x > camX - 60 && sp[0].x < camX + W + 60) {
      for (let k = 0; k < 2; k++) {
        const s = sp[k];
        const at0 = k === 0 ? 0 : 0.9;
        const atkP = (cyc - at0) / 0.42;
        const hitBy = k === 0 ? (cyc - 0.9) / 0.42 : cyc / 0.42;
        const cls = G.classes[s.cls];
        drawNinja(c, s.x - camX, m.ground - camY, {
          dir: s.dir, cls: s.cls, gender: s.gender, look: s.look, name: s.name, el: cls.element, weaponType: cls.weapon, t,
          anim: atkP >= 0 && atkP < 1 ? 'attack' : 'idle', atkP: Math.max(0, Math.min(0.99, atkP)), flash: hitBy > 0.55 && hitBy < 0.8,
        });
      }
      for (const off of [0, 0.9]) {
        const q = (cyc - off) / 0.42;
        if (q > 0.5 && q < 0.85) {
          const hx = Math.round(sp[0].x + 15 - camX + (off ? -4 : 4));
          const hy = m.ground - camY - 14;
          const a = 1 - (q - 0.5) / 0.35;
          c.fillStyle = `rgba(255,250,210,${a.toFixed(2)})`;
          c.fillRect(hx - 3, hy, 7, 1); c.fillRect(hx, hy - 3, 1, 7);
          c.fillStyle = `rgba(255,190,80,${(a * 0.8).toFixed(2)})`;
          c.fillRect(hx - 2, hy - 2, 1, 1); c.fillRect(hx + 2, hy - 2, 1, 1); c.fillRect(hx - 2, hy + 2, 1, 1); c.fillRect(hx + 2, hy + 2, 1, 1);
        }
      }
    }
    for (const a of this.actors) {
      if (a.x < camX - 40 || a.x > camX + W + 40) continue;
      const cls = G.classes[a.cls];
      let anim = a.st === 'atk' ? 'attack' : a.st === 'walk' ? 'walk' : 'idle';
      if (a.jy > 0) anim = 'jump';
      drawNinja(c, a.x - camX, a.base - camY - Math.round(a.jy), {
        dir: a.dir, cls: a.cls, gender: a.gender, look: a.look, name: a.name, el: cls.element, weaponType: cls.weapon,
        anim, t: anim === 'walk' ? a.wt : a.at, atkP: a.st === 'atk' ? a.atk % 1 : undefined, noShadow: a.jy > 0,
      });
    }
    R.drawParticles(c, camX, camY, W, H, dt);
    if (R.drawForeground) R.drawForeground(c, camX, camY, W, H, t);
    this.drawGrade(c, W, H, t);
    this.drawPetals(c, W, H, dt, t);
    // cành anh đào khung hai góc trên, khẽ đung đưa theo bậc 1px
    const b = branch();
    const sw = Math.round(Math.sin(t * 0.9));
    const top = Math.round(Math.min(0, H * 0.02 - 6));
    c.drawImage(b.cv, -6, top + sw);
    c.drawImage(b.fl, W - b.w + 6, top - 6 - sw);
    const ctx = game.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(game.lo, 0, 0, W, H, 0, 0, W * game.zoom, H * game.zoom);
  }

  // Ánh hoàng hôn: phủ ấm phía trên, quầng mặt trời, tối dần phía dưới
  drawGrade(c, W, H, t) {
    if (!this.grade || this.grade.width !== W || this.grade.height !== H) {
      const g = mk(W, H);
      const x = g.getContext('2d');
      const lg = x.createLinearGradient(0, 0, 0, H);
      lg.addColorStop(0, 'rgba(255,120,70,0.30)');
      lg.addColorStop(0.35, 'rgba(255,140,110,0.12)');
      lg.addColorStop(0.62, 'rgba(120,40,90,0.0)');
      lg.addColorStop(1, 'rgba(24,8,30,0.50)');
      x.fillStyle = lg;
      x.fillRect(0, 0, W, H);
      this.grade = g;
      const s = mk(W, H);
      const y = s.getContext('2d');
      const rg = y.createRadialGradient(W * 0.8, H * 0.16, 2, W * 0.8, H * 0.16, H * 0.75);
      rg.addColorStop(0, 'rgba(255,214,140,0.55)');
      rg.addColorStop(0.3, 'rgba(255,150,90,0.22)');
      rg.addColorStop(1, 'rgba(255,120,80,0)');
      y.fillStyle = rg;
      y.fillRect(0, 0, W, H);
      this.sun = s;
    }
    c.drawImage(this.grade, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.6 + Math.sin(t * 0.7) * 0.12;
    c.drawImage(this.sun, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  drawPetals(c, W, H, dt, t) {
    for (const p of this.petals) {
      const sp = 0.6 + p.z * 0.9;
      p.y += (10 + p.v * 12) * sp * dt;
      p.x -= ((14 + p.v * 16) * sp + Math.sin(t * 1.7 + p.s) * 10) * dt;
      if (p.y > H + 6 || p.x < -8) {
        p.y = -6 - Math.random() * 40;
        p.x = Math.random() * (W + 120);
      }
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const ph = Math.sin(t * (3 + p.v * 3) + p.s * 7);
      const big = p.z > 0.7;
      const c1 = p.z > 0.4 ? '#ffd8e8' : '#f4a6c4';
      const c2 = p.z > 0.4 ? '#f07aa6' : '#c86088';
      c.fillStyle = c2;
      if (big) {
        if (ph > 0.3) { c.fillRect(x, y, 3, 2); c.fillStyle = c1; c.fillRect(x, y, 2, 1); }
        else if (ph < -0.3) { c.fillRect(x, y, 2, 3); c.fillStyle = c1; c.fillRect(x, y, 1, 2); }
        else { c.fillRect(x, y + 1, 3, 1); c.fillStyle = c1; c.fillRect(x + 1, y, 1, 1); }
      } else if (ph > 0) { c.fillRect(x, y, 2, 1); c.fillStyle = c1; c.fillRect(x, y, 1, 1); }
      else { c.fillRect(x, y, 1, 2); c.fillStyle = c1; c.fillRect(x, y, 1, 1); }
    }
  }
}

// Chỉ số tham khảo theo phái (thang 10) — cận chiến khỏe, đánh xa tầm dài
export const CLASS_STATS = {
  kiem: { atk: 9, def: 6, rng: 2, diff: 3, tip: 'Chém lan diện rộng, dễ làm quen.' },
  tieu: { atk: 8, def: 4, rng: 7, diff: 6, tip: 'Ra đòn nhanh, cần giữ khoảng cách.' },
  kunai: { atk: 7, def: 7, rng: 3, diff: 5, tip: 'Bền bỉ nhờ tự hồi máu.' },
  cung: { atk: 8, def: 3, rng: 10, diff: 7, tip: 'Tầm xa nhất, chí mạng cao nhưng mỏng manh.' },
  dao: { atk: 6, def: 9, rng: 2, diff: 4, tip: 'Trâu bò, lướt chém xuyên đội hình.' },
  quat: { atk: 6, def: 5, rng: 7, diff: 8, tip: 'Hỗ trợ hồi máu, khống chế diện rộng.' },
};
