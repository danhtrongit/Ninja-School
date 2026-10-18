// Quái vẽ trực tiếp theo khung: ong, dơi, bọ cạp, người tuyết, sâu, rắn, tiên, chim.
import { T, EYE, WHITE } from './palette.js';
import { R, WOOD, crystal, patFill, featherWing } from './parts.js';

// ---------- Ong
export function drawBee(S, P, an, i, bl) {
  let lx = 0;
  let tilt = 0;
  if (an === 'atk') { lx = i ? 3 : -2; tilt = i ? 1 : -1; }
  const X = 15 + lx;
  const wa = [-0.25, -0.95, -1.55, -0.95][i % 4];
  const wing = (rx0, ry0, a, d) => {
    const cx = rx0 + Math.sin(a) * 4.4;
    const cy = ry0 - Math.cos(a) * 4.4;
    S.fill(S.M().ell(cx, cy, 2.6, 4.8, 1, a), P.wing, { sh: 'flat', il: d });
    S.px(cx - Math.sin(a) * 2 - 0.5, cy + Math.cos(a) * -2, WHITE, 0.5);
  };
  wing(X - 1.5, 7.5, wa - 0.4, 0);
  // ngòi
  S.fill(S.M().poly([X - 8.6, 11 + tilt, X - 12.6, 13.6 + tilt * 2, X - 8.6, 14.2 + tilt]), P.b, { sh: 'facet', fx: X - 10 });
  // bụng sọc
  const abd = S.M().ell(X - 4, 12.2 + tilt * 0.5, 5.6, 4.5, 1, tilt * 0.15);
  S.fill(abd, P.a, { lt: 0.55 });
  for (const sx of [-6.4, -3.2]) {
    const st = S.M().rect(R(X + sx), 0, 2, 20).and(abd);
    S.fill(st, P.b, { il: 0, c: [X - 4, 12.2, 5.6, 4.5], lt: 0.55 });
  }
  // chân nhỏ
  S.fill(S.M().line(X - 1, 15.4, X - 2, 17.6, 1).line(X + 2, 15.4, X + 2, 17.6, 1), P.b, { sh: 'flat' });
  // đầu-ngực
  const hx = X + 3.2;
  const hy = 10.6;
  const head = S.M().ell(hx, hy, 5.4, 5);
  S.fill(head, P.a, { lt: 0.5 });
  // râu
  S.fill(S.M().path([hx - 1, hy - 4.4, hx - 2, hy - 7.4], 1).path([hx + 2, hy - 4.6, hx + 3.6, hy - 7.6], 1), P.b, { sh: 'flat' });
  S.fill(S.M().ell(hx - 2.2, hy - 8, 1.2, 1.2).ell(hx + 3.9, hy - 8.2, 1.2, 1.2), P.b, { lt: 0.4 });
  const ex = R(hx - 0.8);
  const ey = R(hy - 1.8);
  S.eye(ex, ey, 2, 3, { blink: bl });
  S.eye(ex + 4, ey, 2, 3, { blink: bl });
  if (an === 'atk' && i === 1) S.rc(ex + 2, ey + 3, 2, 2, EYE);
  else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); }
  S.blush(ex - 2, ey + 3);
  S.blush(ex + 5, ey + 3, 2);
  wing(X + 0.5, 7.2, wa, 1);
  if (an === 'atk' && i === 1) for (const yy of [8, 11, 14]) S.rc(X - 16, yy, 3, 1, WHITE, 0.6);
  S.head = [hx, hy - 5];
}

// ---------- Dơi (cánh dang hai bên)
export function drawBat(S, P, an, i, bl, v) {
  const demon = v === 'demon';
  const crys = v === 'cbat';
  const king = v === 'batK';
  const X = 15;
  let th = [0.85, 0.25, -0.45, 0.25][i % 4];
  let mouth = 0;
  let ly = 0;
  if (an === 'atk') { th = i ? -0.2 : 1.1; mouth = 1; ly = i ? 2 : -1; }
  const by = 9.6 + ly + (th < 0 ? -1 : th > 0.5 ? 1 : 0);
  const wing = (sgn, front) => {
    const sx = X + sgn * 3.4;
    const sy = by - 0.6;
    const len = king ? 12.5 : 11;
    const u = [sgn * Math.cos(th), -Math.sin(th)];
    const p = [sgn * Math.sin(th) * 0.9, Math.cos(th)];
    const pt = (a, b) => [sx + u[0] * len * a + p[0] * b, sy + u[1] * len * a + p[1] * b];
    const pts = [pt(0, -1.6), pt(0.5, -2.6), pt(1, -0.6), pt(0.84, 2.6), pt(0.68, 1.4), pt(0.52, 3.4), pt(0.36, 2), pt(0.18, 3.8), pt(0, 3.4)].flat();
    // Dơi Pha Lê: màng cánh trong sáng màu chính, xương cánh tối
    S.fill(S.M().poly(pts), crys ? P.aL : P.b, { sh: 'edge', il: front ? 1 : 0 });
    const bone = S.M().path([...pt(0, -1), ...pt(0.5, -2), ...pt(1, -0.6)], 1);
    S.dm(bone, crys ? P.b.md : P.a.md, 1);
    S.dm(S.M().path([...pt(0.5, -2), ...pt(0.7, 1.4)], 1), king ? P.c.md : P.b.lt, king ? 0.8 : 0.55);
    if (crys) {
      // mảnh pha lê mọc dọc mép cánh
      for (const [a, b, l] of [[1, -0.6, 3.6], [0.68, 1.4, 3], [0.36, 2, 2.6]]) {
        const [cx, cy] = pt(a, b);
        crystal(S, cx, cy + 0.6, sgn * 0.9 - th * sgn * 0.6 + (1 - a) * sgn * 0.8, 2, l, P.c, front ? 1 : 0);
      }
      S.glow.push([...pt(1, -0.6), 4, P.c.col]);
    }
  };
  wing(-1, false);
  wing(1, true);
  // tai (Dơi Pha Lê: tai là hai khối pha lê)
  if (crys) {
    crystal(S, X - 2.6, by - 3, -0.35, 2.8, 5, P.c);
    crystal(S, X + 3.6, by - 3, 0.35, 2.8, 5, P.c);
  } else {
    S.fill(S.M().poly([X - 3.8, by - 2.6, X - 4.2, by - 7.6, X - 0.8, by - 4]), P.a, { sh: 'facet', fx: X - 3.6 });
    S.fill(S.M().poly([X + 1.8, by - 4, X + 5.2, by - 7.8, X + 4.8, by - 2.6]), P.a, { sh: 'facet', fx: X + 4.4 });
    S.fill(S.M().poly([X - 3.4, by - 3.4, X - 3.6, by - 6, X - 1.8, by - 4]).poly([X + 2.8, by - 4, X + 4.6, by - 6.2, X + 4.2, by - 3.4]), P.c, { il: 0, sh: 'flat' });
  }
  if (demon) {
    crystal(S, X - 1.4, by - 3.8, -0.25, 2.2, 4.2, P.horn);
    crystal(S, X + 2.4, by - 3.8, 0.25, 2.2, 4.2, P.horn);
  }
  if (king) {
    // sừng cong đen của Dơi Chúa
    const hn = T('#2b1f33');
    S.fill(S.M().path([X - 1.6, by - 3.6, X - 3, by - 7, X - 5.4, by - 8.6], 1.8), hn, { sh: 'edge' });
    S.fill(S.M().path([X + 2.6, by - 3.6, X + 4, by - 7, X + 6.4, by - 8.6], 1.8), hn, { sh: 'edge' });
  }
  // thân tròn lông xù (Dơi Pha Lê: thân mài giác như viên ngọc)
  const body = S.M().ell(X + 0.5, by, 5.2, 4.8);
  if (crys) S.fill(body, P.a, { sh: 'facet', fx: X - 0.5 });
  else S.fill(body, P.a, { lt: 0.55 });
  S.fill(S.M().ell(X + 1, by + 2.6, 3, 2).and(body), P.aL, { il: 0, sh: 'flat' });
  if (king) {
    S.fill(S.M().ell(X + 1, by + 2.8, 1.4, 1.4), P.c, { lt: 0.4 });
    S.glow.push([X + 1, by + 2.8, 4, P.c.col]);
  }
  // chân
  S.fill(S.M().line(X - 1, by + 4.4, X - 1, by + 6.2, 1).line(X + 2, by + 4.4, X + 2, by + 6.2, 1), P.b, { sh: 'flat' });
  const ex = R(X - 1);
  const ey = R(by - 2);
  S.eye(ex, ey, 2, 3, { blink: bl, iris: P.c.md });
  S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: P.c.md });
  if (mouth) { S.rc(ex + 1, ey + 3, 4, 2, EYE); S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE); }
  else { S.rc(ex + 1, ey + 3, 4, 1, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE); }
  if (king) { S.px(ex + 1, ey + 5, WHITE); S.px(ex + 4, ey + 5, WHITE); S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE); }
  else {
    S.blush(ex - 2, ey + 3);
    S.blush(ex + 6, ey + 3, 1);
  }
  S.head = [X + 0.5, by - 4.8];
}

// ---------- Bọ cạp
export function drawScorpion(S, P, an, i, bl) {
  let bob = 0; let lp = 0; let sw = 0; let open = 0.6; let strike = 0;
  if (an === 'idle') { sw = [0, 1, 1][i]; open = [0.3, 0.8, 1][i]; }
  else if (an === 'walk') { lp = i; bob = i % 2; sw = [0, 1, 0, -1][i]; open = 0.5; }
  else if (i === 0) { sw = -2; open = 1.3; }
  else { strike = 1; open = 0; }
  const X = 15;
  const Y = -bob;
  // chân
  for (let k = 0; k < 3; k++) {
    const up = an === 'walk' && (k + lp) % 2 === 0 ? 1 : 0;
    const lx = X - 4 + k * 3.4;
    S.fill(S.M().path([lx, 15 + Y, lx - 1.6, 16.4 + Y - up, lx - 2.4, 18.4 - up], 1.2), P.aD, { sh: 'flat' });
  }
  // đuôi
  const seg = strike
    ? [[X - 6, 12.4], [X - 6.4, 8.8], [X - 3.6, 5.6], [X + 0.4, 4.4], [X + 4, 5.4]]
    : [[X - 6.4, 12.6], [X - 8.4, 9.6], [X - 8 + sw * 0.5, 6.4], [X - 5.6 + sw, 4], [X - 2.4 + sw, 3.4]];
  const rr = [2.4, 2.2, 2, 1.9, 1.7];
  for (let k = 0; k < seg.length; k++) S.fill(S.M().ell(seg[k][0], seg[k][1] + Y, rr[k], rr[k] * 0.92), P.a, { lt: 0.5 });
  const [tx, ty] = seg[seg.length - 1];
  const st = strike ? [tx + 1, ty + Y - 1, tx + 4.6, ty + Y + 2.6, tx + 0.6, ty + Y + 1.6] : [tx + 0.6, ty + Y - 1.6, tx + 4, ty + Y + 0.6, tx + 0.8, ty + Y + 1.4];
  S.fill(S.M().poly(st), P.sting, { sh: 'facet', fx: tx + 1.5 });
  // thân đốt
  const body = S.M().ell(X, 14 + Y, 7.6, 3.6);
  S.fill(body, P.a, { lt: 0.55, dk: 0.22 });
  for (const sx of [-4, -1, 2]) { S.dm(S.M().rect(X + sx, R(11 + Y), 1, 6).and(body), P.a.dk, 0.7); }
  S.px(X - 5, R(11.6 + Y), P.a.hi); S.px(X - 2, R(11.2 + Y), P.a.hi); S.px(X + 1, R(11.2 + Y), P.a.hi);
  // càng
  const claw = (bx, by2, sx, sy, o, tn) => {
    S.fill(S.M().line(bx, by2, sx, sy + 1, 2), tn, { sh: 'edge' });
    const c = S.M().ell(sx + 1.2, sy, 3.4, 2.5);
    if (o > 0.05) c.poly([sx + 1, sy + 0.2, sx + 5, sy - 0.8 - 1.6 * o, sx + 5, sy + 0.8 * o], 0);
    S.fill(c, tn, { lt: 0.5 });
    S.px(sx + 0.4, sy - 1.4, tn.hi);
  };
  claw(X + 5, 14.6 + Y, X + 9.4, 16 + Y, open * 0.7, P.aD);
  // đầu
  const hx = X + 6.4;
  const hy = 13.2 + Y;
  S.fill(S.M().ell(hx, hy, 3.6, 3.2), P.a, { lt: 0.5 });
  const ex = R(hx - 0.6);
  const ey = R(hy - 2);
  S.eye(ex - 1, ey - 1, 2, 3, { blink: bl });
  S.eye(ex + 2, ey - 1, 2, 3, { blink: bl });
  S.blush(ex - 2, ey + 2, 1);
  claw(X + 7, 13 + Y, X + 11.4 + (strike ? 1 : 0), 10.8 + Y, open, P.a);
  S.head = [X + 1, 9 + Y];
}

// ---------- Bạch viên / Tuyết quái (golem lông)
export function drawYeti(S, P, an, i, bl, king) {
  let bob = 0; let lb = 0; let lf = 0; let ab = 0; let af = 0; let pose = 0;
  if (an === 'idle') bob = [0, 0, 1][i];
  else if (an === 'walk') [lb, lf, bob, ab, af] = [[2, 0, 0, -1, 1], [0, 0, 1, 0, 0], [0, 2, 0, 1, -1], [0, 0, 1, 0, 0]][i];
  else pose = i + 1;
  const X = 17;
  const Y = bob;
  const fur = (m, cx, cy, rx, ry, n, a0, len) => {
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2;
      const x0 = cx + Math.cos(a) * rx;
      const y0 = cy + Math.sin(a) * ry;
      const ta = a + 0.5;
      m.poly([x0 - Math.cos(ta) * 1.4, y0 - Math.sin(ta) * 1.4, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len, x0 + Math.cos(ta) * 1.4, y0 + Math.sin(ta) * 1.4]);
    }
    return m;
  };
  // chân
  S.fill(S.M().ell(X - 4.5, 30 - lb, 3.6, 3).rows(0, 32 - lb), P.aD, { sh: 'edge' });
  S.fill(S.M().ell(X + 4.5, 30 - lf, 3.8, 3).rows(0, 32 - lf), P.a, { sh: 'edge' });
  S.fill(S.M().rect(R(X + 2), 31 - lf, 6, 1), P.b, { il: 0, sh: 'flat' });
  // tay sau
  let bfx = X - 11 + ab; let bfy = 26 + Y;
  if (pose === 1) { bfx = X - 7; bfy = 5; }
  if (pose === 2) { bfx = X + 9; bfy = 28; }
  S.fill(fur(S.M().line(X - 7, 14 + Y, bfx, bfy, 5), (X - 7 + bfx) / 2, (14 + Y + bfy) / 2, 2.4, 4, 5, 0.3, 2.2), P.aD, { lt: 0.5 });
  S.fill(S.M().ell(bfx, bfy + 1, 2.8, 2.2), P.bD, { lt: 0.5 });
  // thân lông
  const body = fur(S.M().ell(X, 18.6 + Y, 10, 10), X, 18.6 + Y, 9.4, 9.4, 14, 0.2, 2.4);
  S.fill(body, P.a, { c: [X, 18.6 + Y, 11, 11], lt: 0.55, dk: 0.12 });
  for (const [dx, dy] of [[-5, 4], [-3, 7], [4, 8], [-6, 0], [6, 3]]) {
    S.px(X + dx, 18.6 + Y + dy, P.a.dk); S.px(X + dx + 1, 18.6 + Y + dy - 1, P.a.dk);
  }
  // mặt
  const hx = X + 2 + (pose === 2 ? 1 : 0);
  const hy = 13 + Y + (pose === 2 ? 1 : 0);
  const face = S.M().ell(hx, hy, 5.8, 4.6);
  S.fill(face, P.face, { il: 1, lt: 0.5 });
  S.fill(S.M().ell(hx + 0.6, hy + 2.4, 3.4, 1.9).and(face), P.faceL, { il: 2, sh: 'flat' });
  S.fill(S.M().ell(hx - 0.4, hy - 5, 7, 2.6).and(S.M().ell(hx, hy, 7.6, 6.2)).and(S.M().rows(0, R(hy - 3))), P.a, { il: 1, sh: 'edge' });
  const ex = R(hx - 2.6);
  const ey = R(hy - 2);
  S.eye(ex, ey, 2, 3, { blink: bl, iris: P.c.md });
  S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: P.c.md });
  if (pose) { S.rc(ex + 1, ey + 4, 4, 2, EYE); S.px(ex + 1, ey + 4, WHITE); S.px(ex + 4, ey + 4, WHITE); }
  else { S.rc(ex + 2, ey + 4, 2, 1, P.face.ol); S.px(ex + 1, ey + 5, P.face.ol); S.px(ex + 4, ey + 5, P.face.ol); S.px(ex + 2, ey + 5, P.face.ol); S.px(ex + 3, ey + 5, P.face.ol); }
  S.blush(ex - 2, ey + 3, 2);
  S.blush(ex + 6, ey + 3, 1);
  // tay trước
  let ffx = X + 11 + af; let ffy = 26 + Y;
  if (pose === 1) { ffx = X + 6; ffy = 4; }
  if (pose === 2) { ffx = X + 13; ffy = 28; }
  S.fill(fur(S.M().line(X + 7, 14 + Y, ffx, ffy, 5.2), (X + 7 + ffx) / 2, (14 + Y + ffy) / 2, 2.4, 4, 5, 0.1, 2.2), P.a, { lt: 0.5 });
  S.fill(S.M().ell(ffx, ffy + 1, 3, 2.4), P.b, { lt: 0.5 });
  for (const dx of [-1.4, 0.4, 2.2]) S.px(R(ffx + dx), R(ffy + 3), P.b.lt);
  if (king) {
    // sừng băng cong ra ngoài rồi vểnh lên, đầu nhọn trắng (không dựng chữ V như tai)
    for (const sg of [-1, 1]) {
      const bx = hx + sg * 4.6;
      const by = hy - 3;
      const p1 = [bx + sg * 3.2, by - 1.2];
      const p2 = [bx + sg * 4.6, by - 3.6];
      S.fill(S.M().line(bx, by, ...p1, 2.8).line(...p1, ...p2, 2.2), P.c, { sh: 'edge' });
      S.fill(S.M().poly([p2[0] - 1.1, p2[1] + 0.6, p2[0] + sg * 0.6, p2[1] - 2.6, p2[0] + 1.1, p2[1] + 0.4]), T('#ffffff'), { sh: 'facet', fx: p2[0] });
    }
    crystal(S, X - 8, 12 + Y, -0.9, 2.6, 5, P.c, 1);
    S.glow.push([hx, hy - 6, 6, P.c.col]);
  }
  S.head = [X + 1, king ? 5 + Y : 8 + Y];
}

// ---------- Sa trùng: thân đốt trồi lên từ ụ cát, miệng tròn răng nhọn, càng hàm
export function drawWorm(S, P, an, i, bl) {
  let sw = 0; let lean = 0; let dy = 0; let mouth = 0;
  if (an === 'idle') sw = [0, 0.8, 1.6][i];
  else if (an === 'walk') { sw = [-1.5, 0, 1.5, 0][i]; dy = [0, 1, 0, 1][i]; }
  else if (i === 0) { lean = -3; dy = -1; }
  else { lean = 5; dy = 3; mouth = 1; }
  const X = 15;
  const p0 = [X - 6, 22];
  const p1 = [X - 7 + sw, 5];
  const p2 = [X + 5 + lean, 7 + dy];
  const B = (t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    const [x, y] = B(t);
    const r = 4.4 - t * 1.1;
    S.fill(S.M().ell(x, y, r, r * 0.9), k % 2 ? P.aL : P.a, { lt: 0.5, dk: 0.15 });
  }
  const [hx, hy] = B(1);
  // càng hàm phía sau + đầu
  const op = mouth ? 1.6 : 0;
  S.fill(S.M().path([hx + 1.6, hy - 3, hx + 5.4, hy - 4 - op, hx + 7.2, hy - 1.6 - op], 1.4), P.c, { sh: 'edge' });
  S.fill(S.M().ell(hx + 1, hy, 4.6, 4.2), P.a, { lt: 0.5 });
  S.fill(S.M().ell(hx - 0.4, hy + 2.6, 3.4, 1.4).and(S.M().ell(hx + 1, hy, 4.6, 4.2)), P.b, { il: 0, sh: 'flat' });
  const mw = mouth ? 2.4 : 1.4;
  const mh = mouth ? 3.2 : 2.2;
  S.fill(S.M().ell(hx + 3.8, hy + 0.6, mw, mh), T('#4a1c1c'), { il: 1, sh: 'flat' });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    S.px(hx + 3.8 + Math.cos(a) * (mw - 0.6), hy + 0.6 + Math.sin(a) * (mh - 0.6), WHITE, 0.95);
  }
  S.fill(S.M().path([hx + 1.6, hy + 3.4, hx + 5.4, hy + 4.4 + op, hx + 7, hy + 2.2 + op], 1.4), P.c, { sh: 'edge' });
  S.eye(R(hx - 1.6), R(hy - 3), 2, 2, { blink: bl });
  S.eye(R(hx + 1.4), R(hy - 3.4), 2, 2, { blink: bl });
  // ụ cát che gốc thân
  const sand = T('#e2bf72');
  const mound = S.M().ell(X - 5.4, 23.4, 8.6, 3.4).rows(0, 22);
  S.fill(mound, sand, { sh: 'edge' });
  for (const [x, y] of [[-10, 21], [-6, 20], [-2, 21], [1, 22]]) S.px(X + x, y, sand.dk);
  if (mouth) for (const [x, y] of [[5, 18], [8, 17], [3, 16]]) S.px(X + x, y, sand.lt, 0.9);
  S.head = [hx + 1, hy - 4.2];
}

// ---------- Hải xà / Long Vương: thân rắn uốn sóng, vây lưng; king = rồng phương Đông có sừng, râu, bờm, chân
export function drawSerpent(S, P, an, i, bl, king) {
  let ph = 0; let lift = 0; let lunge = 0; let mouth = 0;
  if (an === 'idle') ph = i * 0.6;
  else if (an === 'walk') ph = (i * Math.PI) / 2;
  else if (i === 0) { lift = 3; lunge = -2; ph = 0.8; }
  else { lunge = 3; mouth = 1; ph = 1.6; lift = 1; }
  const N = 26;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const r = 1 + 2.4 * Math.sin(Math.PI * (0.05 + t * 0.7));
    const wave = Math.sin(t * Math.PI * 2.2 - ph) * 2.2 * (1 - t * 0.55);
    const rise = t > 0.68 ? ((t - 0.68) / 0.32) ** 1.4 * (7 + lift) : 0;
    // rồng vua: thân ngắn hơn để đầu to mà bề ngang vẫn gọn
    pts.push([2 + t * (king ? 16.5 : 22) + lunge * t * t, 21.6 - r - Math.max(0, wave) * 1.4 - rise, r]);
  }
  // vây lưng / bờm vàng (lớp sau)
  const fin = S.M();
  for (let k = 3; k < N - 2; k += king ? 2 : 3) {
    const [x, y, r] = pts[k];
    const hgt = king ? 2.4 : 2 + r * 0.3;
    fin.poly([x - 1.4, y - r + 0.8, x - 0.4, y - r - hgt, x + 1.3, y - r + 0.8]);
  }
  S.fill(fin, P.c, { sh: 'facet' });
  // thân
  const body = S.M();
  const spine = new Float32Array(S.w).fill(99);
  const rad = new Float32Array(S.w);
  for (const [x, y, r] of pts) {
    body.ell(x, y, r + 0.3, r);
    const c = R(x);
    if (c >= 0 && c < S.w && y < spine[c]) { spine[c] = y; rad[c] = r; }
  }
  patFill(S, body, P.a, (x, y) => {
    const sy = spine[x] < 99 ? spine[x] : null;
    if (sy == null) return null;
    if (y > sy + rad[x] * 0.3) return (x % (king ? 3 : 2) === 0 && y > sy + rad[x] * 0.5) ? P.b.dk : P.b.md;
    if (!king && (x + y * 2) % 4 === 0 && y > sy - rad[x] + 1) return P.a.dk;
    return null;
  });
  // chân (rồng)
  if (king) {
    for (const k of [8, 15]) {
      const [x, y, r] = pts[k];
      S.fill(S.M().line(x, y + r * 0.4, x + 1.6, 21.6, 1.8), P.a, { sh: 'edge' });
      S.fill(S.M().rect(R(x + 0.6), 21, 3, 1).rect(R(x + 3), 20, 1, 1), P.c, { sh: 'flat' });
    }
  }
  const [ex0, ey0] = pts[N];
  const k = king ? 1.3 : 1;
  const hx = ex0 + 2;
  const hy = ey0 - 0.4 - (king ? 0.6 : 0);
  // tai vây / sừng
  S.fill(S.M().poly([hx - 1.6 * k, hy - 1, hx - 5.4 * k, hy - 4.6, hx - 3.4 * k, hy - 1.6, hx - 5.6 * k, hy + 0.6, hx - 2 * k, hy + 1.2]), P.c, { sh: 'facet', fx: hx - 3.4 * k });
  if (king) {
    // gạc mảnh vươn ra sau đầu, tách khỏi mặt
    const ant = S.M().path([hx - 2, hy - 3.2, hx - 4.6, hy - 6, hx - 8.4, hy - 7.2], 1).path([hx - 4.8, hy - 6.2, hx - 4.8, hy - 8.6], 1)
      .path([hx - 7, hy - 6.8, hx - 7.8, hy - 8.8], 1);
    S.fill(ant, P.c, { sh: 'edge' });
  }
  // đầu + mõm
  const head = S.M().ell(hx, hy, 3.8 * k, 3.2 * k).ell(hx + 3.6 * k, hy + 0.6 * k - mouth * 0.6, 3 * k, 1.8 * k);
  S.fill(head, P.a, { c: [hx + k, hy, 5 * k, 3.4 * k], lt: 0.5 });
  if (mouth) {
    S.fill(S.M().ell(hx + 3.4 * k, hy + 3 * k, 3 * k, 1.2 * k, 1, 0.3), P.b, { sh: 'edge' });
    S.rc(R(hx + 2 * k), R(hy + 1.6 * k), R(5 * k), 1, EYE);
    S.px(R(hx + 3 * k), R(hy + 1.6 * k), WHITE); S.px(R(hx + 5 * k), R(hy + 1.6 * k), WHITE);
  } else {
    S.fill(S.M().ell(hx + 2.8 * k, hy + 2.2 * k, 3 * k, 1).and(head), P.b, { il: 0, sh: 'flat' });
  }
  // lỗ mũi ở chóp mõm: cho biết hướng mặt
  S.px(R(hx + 6 * k), R(hy), EYE);
  if (king) S.px(R(hx + 6 * k) - 1, R(hy) - 1, P.a.hi);
  const ex = R(hx - 0.4);
  const ey = R(hy - 1.6);
  if (bl) S.rc(ex, ey + 1, 2, 1, EYE);
  else { S.rc(ex, ey, 2, 2, P.c.dk); S.px(ex, ey, WHITE); S.px(ex + 1, ey + 1, P.c.hi); }
  S.px(ex - 1, ey - 1, P.a.ol); S.px(ex, ey - 1, P.a.ol); S.px(ex + 1, ey - 1, P.a.ol, 0.5);
  S.eyes.push([ex + 1, ey + 1]);
  if (king) {
    // râu dài lượn
    const w = Math.sin(ph) * 1.2;
    S.fill(S.M().path([hx + 6.4, hy + 1.6, hx + 5.6, hy + 4 + w, hx + 3.4, hy + 5.2 + w], 1).path([hx + 4.4, hy + 2.6, hx + 2.6, hy + 4.6 + w * 0.6, hx + 0.4, hy + 4.8 + w * 0.6], 1), P.c, { sh: 'flat', il: 1 });
    S.glow.push([hx - 3, hy - 6, 6, P.c.col]);
  }
  S.head = [hx, hy - (king ? 9 : 4.6)];
}

// ---------- Hoa tiên tử: cánh bướm, váy cánh hoa, mũ hoa, đũa sao
export function drawFairy(S, P, an, i, bl) {
  const X = 15;
  const f = [0, 0.4, 0.8, 0.4][i % 4];
  let lean = 0;
  let wand = 0;
  if (an === 'atk') { lean = i ? 1 : -1; wand = i + 1; }
  const skin = T('#fbe0cf');
  // cánh bướm (sau)
  const wing = T(P.b.col, 215);
  const wm = S.M().ell(X - 4 + lean, 6.6, 5 * (1 - f * 0.45), 3.6, 1, -0.7).ell(X - 3.2 + lean, 12, 3.6 * (1 - f * 0.4), 2.4, 1, 0.55);
  S.fill(wm, wing, { lt: 0.45, il: 1 });
  S.fill(S.M().ell(X - 5.6 + lean + f, 5.6, 1.4, 1.2).ell(X - 4 + lean + f * 0.6, 12.4, 1, 0.9).and(wm), P.a, { il: 0, sh: 'flat' });
  // chân
  S.fill(S.M().line(X - 1, 15.6, X - 1.6, 18, 1).line(X + 1.2, 15.6, X + 1.4, 18, 1), skin, { sh: 'flat' });
  // váy cánh hoa
  const sk = S.M().ell(X - 2 + lean, 13.4, 2, 3, 1, 0.55).ell(X + 2 + lean, 13.4, 2, 3, 1, -0.55).ell(X + lean, 14, 2.2, 3);
  S.fill(sk, P.a, { lt: 0.5 });
  S.fill(S.M().ell(X + lean, 10.8, 2.2, 2), P.a, { lt: 0.5 });
  // đầu
  const hx = X + 0.6 + lean;
  const hy = 6.4;
  S.fill(S.M().ell(hx - 2.8, hy + 0.6, 1.8, 2.6), P.c, { lt: 0.5 });
  S.fill(S.M().ell(hx, hy, 4.2, 3.8), skin, { lt: 0.5, dk: -1 });
  S.fill(S.M().ell(hx - 0.6, hy - 1.6, 4.4, 2.6).rows(0, R(hy - 1.4)), P.c, { lt: 0.5 });
  // mũ hoa
  const hat = S.M();
  for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.55; hat.ell(hx - 0.6 + Math.cos(a) * 2.2, hy - 3.6 + Math.sin(a) * 1.4, 1.4, 1.4); }
  S.fill(hat, P.a, { lt: 0.45 });
  S.fill(S.M().ell(hx - 0.6, hy - 4.2, 0.9, 0.9), T('#ffe082'), { il: 0, lt: 0.4 });
  const ex = R(hx - 0.6);
  const ey = R(hy - 1);
  S.eye(ex, ey, 2, 2, { blink: bl });
  S.eye(ex + 3, ey, 2, 2, { blink: bl });
  S.px(ex + 2, ey + 3, EYE, 0.8);
  S.blush(ex - 1, ey + 2, 1);
  S.blush(ex + 4, ey + 2, 1);
  // tay + đũa sao
  const ax = X + 3.4 + lean + (wand === 2 ? 2.4 : 0);
  const ay = wand === 1 ? 7 : 11.4;
  S.fill(S.M().line(X + 1.6 + lean, 10.6, ax, ay, 1.2), skin, { sh: 'flat' });
  const tx = ax + (wand === 2 ? 3 : 1.4);
  const ty = ay - (wand === 1 ? 3 : 2.6);
  S.fill(S.M().line(ax, ay, tx, ty, 1), T(WOOD), { sh: 'flat' });
  S.fill(S.M().poly([tx - 1.6, ty, tx, ty - 1.6, tx + 1.6, ty, tx, ty + 1.6]), T('#ffe57f'), { sh: 'facet', fx: tx });
  S.glow.push([tx, ty, wand === 2 ? 6 : 4, '#ffe57f']);
  const g = i % 4;
  for (const [x, y] of [[-8, 16], [-6, 2], [8, 15], [-9, 9]]) if ((x + g) % 3) S.px(X + x + g * 0.5, y - g * 0.5, '#fff59d', 0.8);
  if (wand === 2) for (const [x, y] of [[2, -2], [3, 1], [1, 2], [-1, -1]]) S.px(tx + x, ty + y, WHITE, 0.85);
  S.head = [hx, hy - 5.4];
}

// ---------- Lôi điểu: chim tròn, mào tia sét, cánh lông vỗ, đuôi dài
export function drawBird(S, P, an, i, bl) {
  const X = 14;
  let up = [0.9, 0.3, -0.35, 0.3][i % 4];
  let lean = 0;
  let mouth = 0;
  if (an === 'atk') { up = i ? -0.4 : 1.1; lean = i ? 2 : -1; mouth = i; }
  const bx = X + lean;
  const by = 11 + (up < 0 ? 1 : 0);
  // cánh xa
  featherWing(S, bx - 1, by - 2, 9, up, P.bD, P.a, 4, -1, 0.75);
  // đuôi
  const tail = S.M().path([bx - 5, by + 1, bx - 10, by + 2.6, bx - 13, by + 2], 1.8).path([bx - 5, by + 2, bx - 10, by + 4.6, bx - 12.4, by + 5.6], 1.6);
  S.fill(tail, P.b, { sh: 'edge' });
  S.fill(S.M().rect(R(bx - 13), R(by + 1.4), 2, 1).rect(R(bx - 12.6), R(by + 5), 2, 1), P.a, { il: 0, sh: 'flat' });
  // móng
  const claw = T('#ff9800');
  S.fill(S.M().line(bx - 1, by + 3.6, bx - 1.4, by + 6.6, 1).line(bx + 1.4, by + 3.6, bx + 1.6, by + 6.6, 1), claw, { sh: 'flat' });
  // thân
  const body = S.M().ell(bx, by, 5.6, 4.6);
  S.fill(body, P.a, { lt: 0.55 });
  S.fill(S.M().ell(bx + 1.6, by + 2, 3.2, 2.4).and(body), P.c, { il: 0, sh: 'flat' });
  // đầu + mào tia sét
  const hx = bx + 4.6;
  const hy = by - 4.4;
  const crest = S.M().poly([hx - 2.6, hy - 2, hx - 4.6, hy - 6.6, hx - 2.4, hy - 5, hx - 2.8, hy - 8.6, hx - 0.6, hy - 5.4, hx + 0.6, hy - 2.6]);
  S.fill(crest, P.a, { sh: 'facet', fx: hx - 2.4 });
  S.fill(S.M().ell(hx, hy, 3.6, 3.4), P.a, { lt: 0.5 });
  S.fill(S.M().poly([hx + 2.6, hy - 0.6, hx + 6.2, hy + 0.6 - mouth, hx + 2.8, hy + 1.2]), claw, { sh: 'edge' });
  if (mouth) S.fill(S.M().poly([hx + 2.6, hy + 1.4, hx + 5.6, hy + 3, hx + 2.6, hy + 2.6]), claw, { sh: 'edge' });
  const ex = R(hx);
  const ey = R(hy - 1.4);
  S.eye(ex, ey, 2, 2, { blink: bl, col: P.b.md });
  S.px(ex - 1, ey - 1, P.b.dk); S.px(ex, ey - 1, P.b.dk); S.px(ex + 1, ey - 1, P.b.dk, 0.6);
  // cánh gần
  featherWing(S, bx - 1.4, by - 1, 10, up, P.b, P.a, 4, -1, 0.75);
  // tia điện
  const g = i % 2;
  const bolt = [[-9, 3], [-8, 4], [-9, 5], [-8, 6]];
  for (const [x, y] of bolt) S.px(bx + x + g * 18, by + y - 10 + g * 2, WHITE, 0.85);
  S.glow.push([hx - 2.4, hy - 5, 5, P.a.col]);
  if (an === 'atk' && i === 1) {
    for (let k = 0; k < 5; k++) S.px(hx + 6 + k, hy + (k % 2 ? 2 : 0), k % 2 ? '#fff59d' : WHITE, 0.95);
    S.glow.push([hx + 8, hy + 1, 6, P.a.col]);
  }
  S.head = [hx - 1, hy - 8.6];
}
