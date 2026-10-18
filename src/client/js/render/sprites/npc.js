// NPC: trang phục, mũ, đồ cầm tay theo loại NPC.
import { TIER_METAL, C, sh } from './color.js';
import { setTag, px, stamp, INK } from './pixbuf.js';
import { HAIR_STYLES, drawArm } from './body.js';

// ================= NPC =================
// Mỗi NPC: chỉnh spec (tóc, râu, áo choàng, đạo cụ) dùng chung bộ khung ninja
export const NPCS = {
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
  setTag(1);
  for (let y = hy - 24; y <= -1; y++) px(hx + 1, y, (y & 1) ? P[1] : P[2]);
  // mũi giáo
  stamp(hx - 1, hy - 31, ['..X..', '..X..', '.XWV.', '.XWV.', '.XWV.', '..W..', '.YYY.'], P);
  // tua đỏ
  stamp(hx - 1, hy - 24, ['.aaa.', 'aazaa', '.aAa.', '.A.A.'], P);
  setTag(0);
  drawArm(P, sp, ux + 3, by - 14, hx, hy, true);
}
