// Vật liệu và chi tiết dùng chung giữa các kiểu quái: sắt, gỗ, vàng, pha lê, hoa văn, cánh lông.
import { adj, T } from './palette.js';

// ================= VẬT LIỆU CHUNG =================
export const R = Math.round;
export const IRON = '#5b5668';
export const WOOD = '#7a5233';

// Tinh thể lục giác nghiêng: mặt trái sáng, sống giữa rất sáng, mặt phải tối
export function crystal(S, bx, by, ang, w, len, tn, il = 1) {
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

// ================= MÀU & HOA VĂN CỦA QUÁI HÌNH NGƯỜI =================
export const SKIN = '#f2c39b';
export const STEEL = '#c3cbd8';
export const GOLD = '#ffc928';
export const BANDAGE = '#e8dcb5';
export const DARKWOOD = '#4a3328';
// áo choàng tím than cho Xác Ướp Nguyền (tách khỏi băng quấn sáng và lửa xanh)
export const CLOAK = T('#4a3552');
// áo Thiên Ma / Ma Thần: sáng hơn màu pal gần đen để vẫn thấy khối
export const HEAVEN_ROBE = '#3a2e44';
export const GOD_ROBE = T('#34205a');

// Tông tối hơn của một bộ tông (cho chân/tay phía sau)
export const darker = (t, d = 0.09) => T(adj(t.col, -d));

// Tô mảng với bóng viền gối (trên/trái sáng, dưới/phải tối) và hoa văn f(x, y) -> màu hoặc null
export function patFill(S, m, t, f, o = {}) {
  const w = S.w;
  const h = S.h;
  const mm = m.m;
  return S.fill(m, t, {
    il: o.il,
    sh: 'fn',
    fn: (x, y, tt) => {
      const r = f ? f(x, y, tt) : null;
      if (r != null) return r;
      const i = y * w + x;
      const up = y > 0 && mm[i - w];
      const dn = y < h - 1 && mm[i + w];
      const lf = x > 0 && mm[i - 1];
      const rt = x < w - 1 && mm[i + 1];
      return !up || (!lf && !o.noL) ? tt.lt : !dn || (!rt && !o.noR) ? tt.dk : tt.md;
    },
  });
}
// Băng quấn chéo (xác ướp)
export const wrapPat = (tn, k = 3) => (x, y) => {
  const r = (y + (x >> 2)) % k;
  return r === 0 ? tn.dk : null;
};

// Cánh lông vũ xòe về phía sau (sgn=-1) hoặc phía trước (sgn=1); up: độ vỗ
export function featherWing(S, x, y, span, up, tn, tip, n, sgn = -1, tf = 0.8, rim = null) {
  const m = S.M();
  const tips = S.M();
  for (let k = 0; k < n; k++) {
    const a = sgn * (0.9 + k * 0.34) - sgn * up;
    const len = span * (1 - k * 0.11);
    const ex = x + Math.sin(a) * len;
    const ey = y - Math.cos(a) * len;
    m.line(x, y, ex, ey, 3 - k * 0.25);
    tips.line(x + Math.sin(a) * len * tf, y - Math.cos(a) * len * tf, ex, ey, 2.6 - k * 0.25);
  }
  S.fill(m, tn, { lt: 0.45 });
  if (tip) S.fill(tips.and(m), tip, { il: 0, lt: 0.45 });
  // viền sáng mép trên để cánh tối vẫn nổi trên nền tối
  if (rim) {
    const w = S.w;
    const rm = S.M();
    for (let i = w; i < m.m.length; i++) if (m.m[i] && !m.m[i - w] && !tips.m[i]) rm.m[i] = 1;
    S.dm(rm, rim, 1);
  }
}
