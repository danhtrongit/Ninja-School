// Các bộ phận cơ thể ninja: mặt, tóc, mắt, đầu, băng trán, râu, thân, áo choàng, chân, tay, khăn.
import { sh } from './color.js';
import { px, stamp, linePts } from './pixbuf.js';
import { drawFashionMask } from './fashion.js';

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
export const HAIR_STYLES = {
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
export const MALE_HAIR = ['spiky', 'neat', 'topknot', 'wild'];
export const FEMALE_HAIR = ['long', 'bun', 'pony', 'bob'];

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

export function drawHead(P, sp, hx, hy, pose) {
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
    if (sp.ht >= 12) px(mid + 1, y0 - 1, 0xffffff);
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
export function drawTorso(P, sp, ux, by, pose) {
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
  if (at >= 12) {
    // giáp vai kim loại hai bên (bậc áo cao)
    px(X - 5, Y - 14, P.M); px(X - 6, Y - 13, P.N); px(X + 5, Y - 14, P.M); px(X + 6, Y - 13, P.n);
  }
  if (at >= 16) {
    // điểm sáng gia huy + viền vạt áo dài thêm 1 hàng (áo dài không có vạt tách thì bỏ)
    px(X - 1, Y - 12, 0xffffff);
    if (!sp.robe) { px(X - 5, Y - 6, P.x); px(X + 5, Y - 6, P.x); }
  }
}

// Áo choàng ngắn cho trang phục bậc cao (Tiên, Thánh), bay ngược hướng chạy
export function drawCape(P, sp, ux, by, p, f) {
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
export function drawRobe(P, sp, ux, by, f) {
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

export function drawLeg(P, sp, hipX, dx, lift, back) {
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
export function drawArm(P, sp, sx, sy, hx, hy, front) {
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

export function drawShoulderPad(P, sp, ux, by) {
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
export function drawBackPad(P, sp, ux, by) {
  const X = ux - 6;
  const Y = by - 15;
  px(X, Y, P.M); px(X + 1, Y, P.n); px(X + 2, Y, P.M);
  px(X, Y + 1, P.N); px(X + 1, Y + 1, P.M); px(X + 2, Y + 1, P.N);
  px(X, Y + 2, sh(P.x, -0.3)); px(X + 1, Y + 2, sh(P.x, -0.3));
}

// ================= KHĂN QUÀNG =================
export function drawScarfNeck(P, sp, ux, by) {
  const X = ux;
  const Y = by;
  for (let x = -4; x <= 4; x++) {
    px(X + x, Y - 16, x <= -3 ? P.A : P.a);
    px(X + x, Y - 15, x <= -2 ? P.A : x >= 3 ? P.z : P.a);
  }
  px(X + 1, Y - 16, P.z); px(X + 2, Y - 16, P.z);
}
export function drawScarfTail(P, sp, ux, by, mode, ph) {
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
