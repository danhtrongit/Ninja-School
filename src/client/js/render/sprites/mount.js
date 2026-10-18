// Thú cưỡi: bảng màu, dáng bốn chân và chim, độ nâng người cưỡi.
import { NINJA_H, C, sh } from './color.js';
import { clr, px, stamp, linePts, INK } from './pixbuf.js';
import { bake, tinted } from './frame.js';
import { own } from './fashion.js';

// ================= THÚ CƯỠI =================
// Gốc (0, 0) ở mặt đất dưới hông người cưỡi, quay mặt sang phải. Thú 4 chân dựng từ thân + chân + đầu theo loại.
export const MOUNTS = {
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
export const MOUNT_BOB = [0, -1, 0, -1];

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
export function mountEntry(type, anim, f, flash) {
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
