// Vũ khí cầm tay theo phái: kiếm, kunai, phi tiêu, cung, quạt; đồ đeo sau lưng.
import { setTag, px, at, stamp, linePts } from './pixbuf.js';

// ================= VŨ KHÍ =================
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const EDGE = [[0, 1], [1, 0], [1, 0], [0, 1], [0, 1], [0, -1], [1, 0], [1, 0]];

function drawBladeW(P, hx, hy, d, len, broad, grip = 2) {
  const [dx, dy] = DIRS[d];
  const [ex, ey] = EDGE[d];
  setTag(1);
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
  setTag(0);
}

function drawKunai(P, hx, hy, d) {
  const [dx, dy] = DIRS[d];
  const [ex, ey] = EDGE[d];
  setTag(1);
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
  setTag(0);
}

const STAR_A = ['..X..', '..WV.', 'XWkWX', '.VW..', '..V..'];
const STAR_B = ['X...X', '.XW..', '..k..', '..WV.', 'V...V'];
function drawStar(P, cx, cy, f, big) {
  setTag(1);
  if (big) {
    stamp(cx - 3, cy - 3, f ? ['X.....X', '.XW..V.', '..WWV..', '...k...', '..VWW..', '.V..WX.', 'V.....X'] : ['...X...', '...W...', '..WWV..', 'XWWkWWV', '..VWW..', '...V...', '...V...'], P);
  } else stamp(cx - 2, cy - 2, f ? STAR_B : STAR_A, P);
  setTag(0);
}

function drawBow(P, hx, hy, drawn, arrow) {
  setTag(1);
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
  setTag(0);
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
  setTag(1);
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
  setTag(0);
}

// Quạt gập cầm chéo lên phía trước, tua màu hệ dưới chuôi
function drawFanHold(P, hx, hy) {
  setTag(1);
  for (let i = 1; i <= 6; i++) {
    px(hx + i, hy - i, i === 6 ? P.X : i & 1 ? P.W : P.X);
    px(hx + i, hy - i + 1, i === 1 ? P.K : P.V);
  }
  px(hx + 6, hy - 5, P.W);
  setTag(0);
  px(hx - 1, hy + 2, P.a); px(hx - 1, hy + 3, P.A); px(hx, hy + 2, P.z);
}

function drawFanClosed(P, hx, hy) {
  setTag(1);
  stamp(hx - 6, hy - 4, ['XX....', 'WXX...', 'VWWX..', '.VWWXK', '..VVWK'], P);
  setTag(0);
}

// Vũ khí cầm tay theo tư thế. state: 'hold' | 'raise' | 'strike' | 'follow' | 'jump'
export function drawWeapon(P, sp, wt, state, hx, hy) {
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
export function drawBackGear(P, sp, ux, by) {
  if (sp.weapon === 'bow') drawQuiver(P, ux, by);
}
