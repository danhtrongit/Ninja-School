// Icon vật phẩm: vũ khí, giáp, mũ, thức ăn, bánh trung thu, thuốc, ngọc, nhẫn, dây chuyền, xu.
import { shade } from '../sprites.js';
import { TAU, FIX, tierPal } from './pix.js';

// ================= ICON VẬT PHẨM (16x16) =================
export const ITEM_MAPS = {
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

export function drawHat(P, col) {
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

export function drawFood(P, col) {
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

// Bánh trung thu: mặt bánh vàng nâu viền gợn sóng, vòng hoa văn nổi và bông hoa giữa, thành bánh sẫm phía dưới
export function drawMooncake(P, col) {
  const pal = tierPal(col);
  const cx = 8;
  const top = 7;
  const rx = 6.8;
  const ry = 4.6;
  const shape = (x, y, cy) => {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    const a = Math.atan2(dy, dx);
    return dx * dx + dy * dy <= 1 - 0.13 * Math.max(0, Math.cos(a * 9));
  };
  // thành bánh: tối hai bên, sáng giữa
  P.fill(0, 2, 15, 15, (x, y) => {
    if (!shape(x, y, top + 3) || shape(x, y, top)) return null;
    return x < 4 || x > 12 ? pal[1] : pal[2];
  });
  // mặt bánh
  P.fill(0, 1, 15, 13, (x, y) => {
    if (!shape(x, y, top)) return null;
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - top) / ry;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.48 && d < 0.66) return pal[2];
    const lit = (-dx - dy * 1.2) / 1.4;
    return lit > 0.5 ? pal[5] : lit > -0.15 ? pal[4] : pal[3];
  });
  // bông hoa nổi giữa mặt bánh
  P.map(['.2.', '242', '.2.'], pal, 7, 6);
  P.set(4, 4, '#fff8e0');
  P.set(5, 4, pal[5]);
}

export function drawPaw(P, col) {
  const pal = tierPal(col);
  const pad = (cx, cy, rx, ry) => P.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const r = dx * dx + dy * dy;
    if (r > 1) return null;
    const lit = -dx - dy;
    return lit > 0.7 ? pal[5] : lit > -0.2 ? pal[4] : pal[3];
  });
  pad(3.2, 6.8, 1.6, 2.1);
  pad(6.2, 3.3, 1.6, 2.1);
  pad(9.8, 3.3, 1.6, 2.1);
  pad(12.8, 6.8, 1.6, 2.1);
  pad(8, 11.2, 4, 2.9);
  P.set(6, 10, '#ffffff');
}

export function drawShurikenBig(P, col) {
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

export function drawFan(P, col) {
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

export function drawAmulet(P, col) {
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

export function drawPotion(P, col, s) {
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

export function drawGem(P, col) {
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

// Ngọc khảm: hình theo loại (s = '<loại><cấp>', ví dụ 'hoa3'), mặt cắt nhiều giác sáng từ trên-trái.
// inside(u, v): u, v chuẩn hóa về [-1, 1] quanh tâm ô.
const GEM_SHAPES = {
  // Hỏa: giọt lửa nhọn đỉnh
  hoa: (u, v) => (v >= 0.2 ? (u / 0.78) ** 2 + ((v - 0.2) / 0.8) ** 2 <= 1 : Math.abs(u) <= 0.78 * ((v + 1) / 1.2) ** 0.8),
  // Thủy: viên tròn hơi dẹt
  thuy: (u, v) => (u / 0.86) ** 2 + (v / 0.8) ** 2 <= 1,
  // Thổ: giác bát giác vuông vức
  tho: (u, v) => Math.abs(u) <= 0.78 && Math.abs(v) <= 0.78 && Math.abs(u) + Math.abs(v) <= 1.3,
  // Phong: lá xéo hai đầu nhọn
  phong: (u, v) => {
    const a = (u + v) * 0.7071;
    const b = (v - u) * 0.7071;
    return Math.abs(a) <= 1.08 && Math.abs(b) <= 0.5 * (1 - (a / 1.08) ** 2);
  },
  // Lôi: hình thoi cao
  loi: (u, v) => Math.abs(u) / 0.72 + Math.abs(v) <= 1,
  // Huyết: trái tim
  huyet: (u, v) => {
    const x = u * 1.22;
    const y = -(v * 1.18) + 0.28;
    const q = x * x + y * y - 1;
    return q * q * q - x * x * y * y * y <= 0;
  },
};
export function drawGemIcon(P, col, s) {
  const m = /^([a-z]+)(\d+)$/.exec(s || '') || [];
  const inside = GEM_SHAPES[m[1]] || GEM_SHAPES.thuy;
  const lv = +m[2] || 1;
  const pal = tierPal(col);
  const R = 6.6;
  const cx = 7.5;
  const cy = 7.6;
  P.fill(0, 0, 15, 15, (x, y) => {
    const u = (x - cx) / R;
    const v = (y - cy) / R;
    if (!inside(u, v)) return null;
    // mặt bàn (giữa): phẳng, sáng; mép mặt bàn phía trên-trái sáng nhất
    if (inside(u / 0.46, v / 0.46)) return u + v < -0.18 ? pal[5] : pal[4];
    // các giác quanh mặt bàn: chia 8 múi, mỗi múi một độ sáng theo hướng ánh sáng trên-trái
    const sec = Math.floor(((Math.atan2(v, u) + Math.PI) / TAU) * 8);
    const a = ((sec + 0.5) / 8) * TAU - Math.PI;
    const lit = -(Math.cos(a) + Math.sin(a)) * 0.7071;
    // gờ mặt bàn: sáng phía đón ánh sáng, tối phía khuất (cắt rõ giác)
    if (inside(u / 0.62, v / 0.62)) return lit > 0 ? pal[5] : pal[2];
    return lit > 0.6 ? pal[5] : lit > 0.15 ? pal[4] : lit > -0.3 ? pal[3] : lit > -0.75 ? pal[2] : pal[1];
  });
  // ánh sáng: chấm trắng trên-trái
  for (let y = 0; y < 16; y++) {
    let hit = false;
    for (let x = 0; x < 16 && !hit; x++) {
      if (P.alpha(x, y) > 40 && P.alpha(x + 1, y + 1) > 40 && P.alpha(x + 1, y) > 40) {
        P.set(x + 1, y + 1, '#ffffff');
        if (y < 12) P.set(x + 2, y + 1, '#ffffff', 0.7);
        hit = true;
      }
    }
    if (hit) break;
  }
  if (m[1] === 'loi') {
    // tia sét nhỏ trong lòng ngọc
    P.set(8, 5, '#ffffff');
    P.set(7, 6, '#ffffff');
    P.set(7, 7, pal[5]);
    P.set(8, 7, '#ffffff');
    P.set(8, 8, '#ffffff');
    P.set(7, 9, pal[5]);
  }
  // cấp cao: điểm sáng lóe ở mép phải (sao 4 cánh), cấp 10 thêm chấm vàng
  if (lv >= 4) P.set(10, 9, '#ffffff');
  if (lv >= 7) P.set(5, 11, pal[5]);
}
// Quầng sáng của ngọc theo cấp (vẽ sau viền): cấp 4-6 nhạt, 7-9 rõ, 10 vàng kim + sao lấp lánh
export function gemGlow(P, icon) {
  const lv = +(/\d+$/.exec(icon.s || '') || [1])[0];
  if (lv < 4) return;
  const c = lv >= 10 ? '#ffe082' : icon.c;
  P.halo(c, lv >= 7 ? 0.6 : 0.35, lv >= 7 ? 2 : 1);
  const star = (x, y, core) => {
    P.set(x, y, core);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.set(x + dx, y + dy, c, 0.85);
  };
  star(13, 2, '#ffffff');
  if (lv >= 7) star(2, 13, '#ffffff');
  if (lv >= 10) star(13, 13, '#fff59d');
}

export function drawRing(P, col) {
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

export function drawNecklace(P, col) {
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

export function drawCoin(P, big) {
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
