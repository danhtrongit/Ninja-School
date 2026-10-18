// Bộ đệm điểm ảnh của một khung nhân vật (vẽ từng điểm, dán bản đồ ký tự) và bảng màu dựng từ trang bị.
import { TIER_METAL, C, sh, mx } from './color.js';

// ================= BỘ ĐỆM ĐIỂM ẢNH =================
export const FW = 76;
export const FH = 64;
export const OX = 36; // cột ứng với x = 0 (giữa chân)
export const OY = 56; // hàng ứng với y = 0 (ngay dưới lòng bàn chân)
export const BUF = new Int32Array(FW * FH);
export const TAG = new Uint8Array(FW * FH); // 1 = điểm ảnh vũ khí
export const TMP = new Int32Array(FW * FH);
let TAGV = 0;
// Bật/tắt đánh dấu "điểm ảnh vũ khí" cho các điểm vẽ tiếp theo (module khác không gán được biến import)
export function setTag(v) {
  TAGV = v;
}

export function clr() {
  BUF.fill(-1);
  TAG.fill(0);
}
export function px(x, y, c) {
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
export function at(x, y) {
  const gx = OX + x;
  const gy = OY + y;
  if (gx < 0 || gy < 0 || gx >= FW || gy >= FH) return -1;
  return BUF[gy * FW + gx];
}
// Dán bản đồ ký tự: '.' bỏ qua, '_' xóa điểm
export function stamp(x, y, rows, P) {
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
export function linePts(x0, y0, x1, y1) {
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
export const INK = 0x1d1424;
function metalSet(P, base, hi, mid, lo) {
  P[hi] = sh(base, 0.55);
  P[mid] = base;
  P[lo] = sh(base, -0.38);
}

export function makePalette(sp) {
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
