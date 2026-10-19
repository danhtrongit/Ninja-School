// Quái hình người: tư thế, vũ khí, trang phục riêng từng loài (HUM).
import { pack, adj, T, EYE, WHITE } from './palette.js';
import { R, IRON, WOOD, crystal, SKIN, STEEL, GOLD, BANDAGE, DARKWOOD, CLOAK, HEAVEN_ROBE, darker, patFill, wrapPat, featherWing } from './parts.js';

// ================= NGƯỜI (HUMANOID) =================
// Khung 40x38, thân giữa khung (X=20), đế chân ở hàng 36. Dáng chibi đầu to như ninja nhưng mỗi loài
// có trang phục, mũ, mặt và vũ khí riêng. Hoa văn trên áo/mũ tô thẳng vào lớp (không dùng chi tiết nổi)
// để tay hay vũ khí vẽ sau che đúng thứ tự.

// Dáng theo khung: lb/lf lệch bàn chân sau/trước, bob nhún thân, sw đung đưa tay, atk 1 lấy đà / 2 ra đòn
function humPose(an, i) {
  const p = { lb: 0, lf: 0, bob: 0, sw: 0, atk: 0, lean: 0, fl: i };
  if (an === 'idle') { p.bob = [0, 0, 1][i]; p.sw = [0, 0.6, 0][i]; }
  else if (an === 'walk') [p.lb, p.lf, p.bob, p.sw] = [[-2.5, 2.5, 0, 1.6], [0, 0, 1, 0], [2.5, -2.5, 0, -1.6], [0, 0, 1, 0]][i];
  else { p.atk = i + 1; p.lean = i ? 1 : -1; p.lf = i ? 2.5 : 0.5; p.lb = i ? -2.5 : -0.5; p.fl = i * 2 + 1; }
  return p;
}

const WSTYLE = { spear: 'thrust', trident: 'thrust', orb: 'staff', crook: 'staff', lantern: 'staff', none: 'none' };

// Vũ khí ở tay trước: (x, y) nắm tay, a góc lưỡi (0 = dựng đứng, dương = ngả về trước)
function humWeapon(S, P, C, x, y, a, g) {
  const k = C.wpn;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  const at = (f, o = 0) => [x + ux * f + nx * o, y + uy * f + ny * o];
  const line = (f0, f1, th, o0 = 0, o1 = o0) => S.M().line(...at(f0, o0), ...at(f1, o1), th);
  const poly = (pts) => S.M().poly(pts.flat());
  const steel = C.blade ? T(C.blade) : T(STEEL);
  const grip = T(C.grip || '#3b2a33');
  const guard = T(C.guard || GOLD);
  // lưỡi có sống sáng: lớp sáng mảnh nằm trong lưỡi, không viền
  const blade = (m, t, f0, f1, o) => {
    S.fill(m, t, { sh: 'flat' });
    S.fill(line(f0, f1, 1, o).and(m), { ...t, md: t.hi }, { il: 0, sh: 'flat' });
  };
  if (k === 'club') {
    S.fill(line(-2.5, 3, 1.6), T(WOOD), { sh: 'flat' });
    const m = line(2.5, 8, 3.4).ell(...at(8.4), 2.1, 2.1);
    S.fill(m, T(WOOD), { lt: 0.5 });
    const iron = T(IRON);
    S.fill(S.M().rect(...at(5, -1.8).map(R), 1, 1).rect(...at(7.4, 1.4).map(R), 1, 1).rect(...at(9.4, -1).map(R), 1, 1), { ...iron, md: iron.hi }, { il: 0, sh: 'flat' });
  } else if (k === 'katana' || k === 'sword') {
    const len = C.len || (k === 'katana' ? 12.5 : 9.5);
    S.fill(line(-3, 1, 1.6), grip, { sh: 'flat' });
    S.fill(line(1, 1, 1.4, -1.8, 1.8), guard, { sh: 'flat' });
    blade(line(1.8, len, k === 'katana' ? 1.8 : 2.2), steel, 2.2, len - 1.2, -0.4);
  } else if (k === 'cutlass') {
    S.fill(line(-2.2, 1, 1.5), grip, { sh: 'flat' });
    S.fill(S.M().ell(...at(0.4, 1), 1.5, 1.9, 1, a), guard, { lt: 0.5 });
    const m = S.M().path([...at(1.4, 0), ...at(5, -0.5), ...at(8.2, 0.1), ...at(10, 1.6)], 2.4);
    blade(m, steel, 2, 8.5, -0.7);
  } else if (k === 'dagger' || k === 'kunai') {
    if (k === 'kunai') {
      S.fill(S.M().ell(...at(-2.8), 1.4, 1.4).ell(...at(-2.8), 0.5, 0.5, 0), grip, { sh: 'flat' });
      S.fill(line(-1.8, 0.8, 1.3), grip, { sh: 'flat' });
      blade(poly([at(0.6, -1.4), at(6.2, 0), at(0.6, 1.4)]), steel, 1, 5, -0.2);
    } else {
      S.fill(line(-1.6, 0.8, 1.4), grip, { sh: 'flat' });
      S.fill(line(0.9, 0.9, 1.2, -1.4, 1.4), guard, { sh: 'flat' });
      blade(S.M().path([...at(1.4, 0), ...at(4, -0.2), ...at(6, 1)], 2), steel, 1.6, 4.6, -0.5);
    }
  } else if (k === 'spear' || k === 'trident') {
    const pole = T(C.pole || WOOD);
    S.fill(line(-7, 12, 1.5), pole, { sh: 'flat' });
    if (k === 'spear') {
      blade(poly([at(11.6, -1.5), at(17, 0), at(11.6, 1.5)]), steel, 12, 16, -0.4);
      S.fill(S.M().ell(...at(10.6, 1), 1.1, 1.8, 1, a).line(...at(10.6, 1), ...at(8.6, 2.2), 1.2), T(C.tassel || '#e53935'), { lt: 0.5 });
    } else {
      const m = S.M().path([...at(11.6, -2.3), ...at(11, 0), ...at(11.6, 2.3)], 1.5)
        .line(...at(11, 0), ...at(16.4, 0), 1.4).line(...at(11.6, -2.3), ...at(14.8, -2.3), 1.3).line(...at(11.6, 2.3), ...at(14.8, 2.3), 1.3)
        .poly([...at(16, -0.9), ...at(17.6, 0), ...at(16, 0.9)]).poly([...at(14.4, -3), ...at(15.8, -2.3), ...at(14.4, -1.6)]).poly([...at(14.4, 1.6), ...at(15.8, 2.3), ...at(14.4, 3)]);
      S.fill(m, T(C.whead || GOLD), { sh: 'flat' });
      S.fill(line(11.4, 16.4, 1, -0.4).and(m), { ...T(C.whead || GOLD), md: T(C.whead || GOLD).hi }, { il: 0, sh: 'flat' });
    }
  } else if (k === 'greatsword') {
    S.fill(line(-3.2, 1, 1.8), grip, { sh: 'flat' });
    S.fill(line(1, 1, 1.8, -3, 3), guard, { sh: 'flat' });
    const m = line(1.6, 12.6, 3.2).poly([...at(12.2, -1.6), ...at(15, 0), ...at(12.2, 1.6)]);
    S.fill(m, steel, { sh: 'flat' });
    const e = C.edge ? T(C.edge) : steel;
    S.fill(line(2, 13.6, 1, -1.2).and(m), { ...e, md: e.hi }, { il: 0, sh: 'flat' });
    if (C.edge1) S.fill(line(2, 13.6, 1, 1.2).and(m), { ...steel, md: steel.dk }, { il: 0, sh: 'flat' });
    else S.fill(line(2, 13.6, 1, 1.2).and(m), { ...e, md: e.md }, { il: 0, sh: 'flat' });
    if (C.edge) S.glow.push([...at(8), 6, C.edge]);
  } else if (k === 'crook') {
    const gold = T(C.whead || GOLD);
    const band = T(C.band || '#1565c0');
    S.fill(line(-7, 10, 1.7), gold, { sh: 'flat' });
    for (const f of [-5, -1.5, 2, 5.5]) S.fill(line(f, f + 0.9, 1.7), band, { il: 0, sh: 'flat' });
    S.fill(S.M().path([...at(9.6, 0), ...at(12, 0.3), ...at(13.4, 1.8), ...at(13, 3.6), ...at(11.6, 4)], 1.7), gold, { sh: 'flat' });
    S.fill(S.M().ell(...at(9.6, 0), 1.3, 1.3), band, { lt: 0.4 });
  } else if (k === 'lantern') {
    S.fill(S.M().line(...at(-7), ...at(10), 1.4).path([...at(10), ...at(11, 1.2), ...at(10.6, 2.8)], 1.2), T(DARKWOOD), { sh: 'flat' });
    const [lx, ly] = at(10.6, 2.8);
    const fr = T('#3b3530');
    S.fill(S.M().rect(R(lx - 1.5), R(ly + 1), 4, 5), fr, { sh: 'flat' });
    const fl = T(C.flame || '#7cb342');
    S.fill(S.M().rect(R(lx - 0.5), R(ly + 2), 2, 3), { ...fl, md: fl.hi }, { il: 0, sh: 'flat' });
    S.glow.push([R(lx) + 0.5, R(ly) + 3.5, 6, fl.col]);
  }
}

export function drawHumanoid(S, P, an, i, v, bl) {
  const C = HUM[v] || HUM.bandit;
  const p = humPose(an, i);
  const style = WSTYLE[C.wpn] || 'swing';
  const X = 20 + p.lean;
  const Y = p.bob;
  const tn = (k, d) => (k == null ? d : typeof k !== 'string' ? k : k[0] === '#' ? T(k) : P[k]);
  const skin = tn(C.skin, T(SKIN));
  const top = tn(C.top, P.a);
  const pants = tn(C.pants, P.aD);
  const boots = tn(C.boots, T('#3a2a2a'));
  const armT = tn(C.arm, top);
  const hand = tn(C.hand, skin);
  const wrapP = C.wrap ? wrapPat(C.wrap === true ? P.b : tn(C.wrap)) : null;
  const g = { X, Y, p, an, i, bl, fl: p.fl, C, skin, top, pants, boots, P };
  g.hx = X + 0.8 + (C.hunch ? 1.4 : 0) + (p.atk === 2 ? 0.6 : 0);
  g.hy = 14.6 + Y + (C.hunch ? 1 : 0);
  g.sb = [X - 3.4, 22.6 + Y];
  g.sf = [X + 3.2, 22.6 + Y];
  // vị trí tay theo dáng
  let hb = [X - 5.2 + p.sw * 0.6, 28.4 + Y];
  let hf = [X + 5.4 - p.sw * 0.6, 28 + Y];
  let wa = C.rest ?? (style === 'thrust' ? 0.3 : style === 'staff' ? 0.4 : 0.35);
  if (style === 'none' && C.armsFwd && !p.atk) { hf = [X + 9.2, 23.4 + Y + p.sw * 0.4]; hb = [X + 7.6, 24.6 + Y - p.sw * 0.4]; }
  if (p.atk === 1) {
    if (style === 'thrust') { hf = [X - 0.6, 25 + Y]; hb = [X - 5.2, 25.4 + Y]; wa = 1.62; }
    else if (style === 'staff') { hf = [X + 6, 19.6 + Y]; hb = [X - 5.6, 26 + Y]; wa = -0.15; }
    else if (style === 'none') { hf = [X + 4, 16.6 + Y]; hb = [X + 1.6, 17.6 + Y]; }
    else { hf = [X - 1.6, 17.4 + Y]; hb = [X - 6, 25.6 + Y]; wa = -1.1; }
  } else if (p.atk === 2) {
    if (style === 'thrust') { hf = [X + 7.6, 24.6 + Y]; hb = [X + 2.6, 25 + Y]; wa = 1.57; }
    else if (style === 'staff') { hf = [X + 8.2, 23.4 + Y]; hb = [X - 5.6, 25.4 + Y]; wa = 0.95; }
    else if (style === 'none') { hf = [X + 10.6, 24.6 + Y]; hb = [X + 9, 26.6 + Y]; }
    else { hf = [X + 7.6, 25.4 + Y]; hb = [X - 6.4, 23.4 + Y]; wa = 1.95; }
  }
  g.hb = hb; g.hf = hf; g.wa = wa;
  const fillP = (m, t, o) => (wrapP ? patFill(S, m, t, wrapP, o) : S.fill(m, t, o || { sh: 'edge' }));

  // lớp sau: áo choàng, cánh, khăn bay...
  if (C.back) C.back(S, P, g);
  // tay sau
  const armTh = C.thin ? 1.6 : 2.4;
  fillP(S.M().line(...g.sb, ...hb, armTh), darker(armT), { sh: 'edge' });
  S.fill(S.M().ell(hb[0], hb[1] + 0.2, C.thin ? 1.2 : 1.5, C.thin ? 1.2 : 1.5), darker(hand), { lt: 0.5 });
  if (C.backHand) C.backHand(S, P, g);
  // chân
  const leg = (x0, dx, front) => {
    const fx = x0 + dx;
    const hip = 28.4 + Y;
    const pt = front ? pants : darker(pants);
    const bt = front ? boots : darker(boots);
    if (C.thin) {
      S.fill(S.M().line(x0, hip, fx, 35.2, 1.8), pt, { sh: 'edge' });
      S.fill(S.M().rect(R(fx - 1), 35, 4, 2), pt, { sh: 'edge' });
      return;
    }
    fillP(S.M().line(x0, hip, fx, C.smoke ? 33 : 33.6, C.baggy ? 4.2 : 3), pt, { sh: 'edge' });
    if (C.smoke) {
      S.fill(S.M().ell(fx + 0.4, 34.6, 2.6, 1.6), T(C.smoke, 190), { il: 0, lt: 0.5 });
      return;
    }
    const bt0 = C.bootTop ?? 33;
    fillP(S.M().rect(R(fx - 1.5), bt0, 3, 37 - bt0).rect(R(fx - 1.5), 35, 5, 2), bt, { sh: 'edge' });
  };
  if (!C.robe) {
    leg(X - 1.8, p.lb, false);
    leg(X + 1.8, p.lf, true);
  }
  // thân
  let torso;
  if (C.robe) {
    const sw = p.atk ? -p.lean : p.sw * 0.8;
    torso = S.M().poly([X - 4.2, 20.6 + Y, X + 4.2, 20.6 + Y, X + 7.4 + sw, 36.8, X - 7.6 + sw, 36.8]).ell(X, 21.6 + Y, 4.2, 1.6);
  } else {
    torso = S.M().poly([X - 4, 20.6 + Y, X + 4, 20.6 + Y, X + 4.8, 29.6 + Y, X - 4.7, 29.6 + Y]).ell(X, 21.6 + Y, 4.2, 1.6);
  }
  g.torso = torso;
  if (C.torso) C.torso(S, P, g, torso);
  else if (wrapP) patFill(S, torso, top, wrapP);
  else S.fill(torso, top, { c: [X - 0.5, 24 + Y, 5.4, 6], lt: 0.55, dk: 0.1 });
  if (C.belt) S.fill(S.M().rect(X - 5, R(27.4 + Y), 11, 2).and(torso), tn(C.belt), { il: 2, sh: 'edge' });
  if (C.body) C.body(S, P, g);
  // tay trước + vũ khí; lúc lấy đà vũ khí giơ sau đầu nên vẽ trước đầu
  const frontArm = () => {
    fillP(S.M().line(...g.sf, ...hf, armTh), armT, { sh: 'edge' });
    if (C.wpn && C.wpn !== 'none') humWeapon(S, P, C, hf[0], hf[1], wa, g);
    S.fill(S.M().ell(hf[0], hf[1] + 0.2, C.thin ? 1.2 : 1.6, C.thin ? 1.2 : 1.6), hand, { lt: 0.5 });
    if (C.hands) C.hands(S, P, g);
  };
  const early = p.atk === 1 && style !== 'thrust';
  if (early) frontArm();
  // đầu
  C.head(S, P, g);
  if (!early) frontArm();
  if (C.fx) C.fx(S, P, g);
  // vệt chém
  if (p.atk === 2 && style === 'swing') {
    // vệt chém liền nét 2px: đậm dần về cuối cung, mép ngoài trắng
    const tc = C.trail || '#ffffff';
    const seen = new Set();
    for (let a = 0.5; a <= 2.35; a += 0.04) {
      const f = (a - 0.5) / 1.85;
      for (const [r, col, al] of [[13.6, WHITE, 0.4 + f * 0.55], [12.6, tc, 0.3 + f * 0.6], [11.6, tc, f * 0.45]]) {
        const x = R(g.sf[0] + Math.sin(a) * r);
        const y = R(g.sf[1] - Math.cos(a) * r);
        const key = y * 64 + x;
        if (al < 0.08 || seen.has(key)) continue;
        seen.add(key);
        S.px(x, y, col, Math.min(0.95, al));
      }
    }
  }
  if (p.atk === 2 && style === 'none') {
    for (const dy of [-3, 0, 3]) for (let k = 0; k < 4; k++) S.px(hf[0] + 3 + k, hf[1] + dy - 2 + k, C.trail || '#ffffff', 0.35 + k * 0.15);
  }
  if (!S.head[1]) S.head = [g.hx, g.hy - 6];
}

// ---------- Mảnh dùng chung cho đầu
const headM = (S, g, rx = 6.2, ry = 5.6, dy = 0) => S.M().ell(g.hx, g.hy + dy, rx, ry);
// Mắt to dễ thương + chân mày giận (quái cấp cao)
function hEyes(S, g, o = {}) {
  const ex = R(g.hx - 0.2 + (o.dx || 0));
  const ey = R(g.hy - 1 + (o.dy || 0));
  const h = o.h || 3;
  if (o.only !== 1) S.eye(ex, ey, 2, h, { blink: g.bl, col: o.col, iris: o.iris });
  if (o.only !== 0) S.eye(ex + 4, ey, 2, h, { blink: g.bl, col: o.col, iris: o.iris });
  if (o.brow) {
    const bc = o.browC ?? EYE;
    if (o.only !== 1) { S.px(ex - 1, ey - 2, bc); S.px(ex, ey - 2, bc); S.px(ex + 1, ey - 1, bc); }
    if (o.only !== 0) { S.px(ex + 6, ey - 2, bc); S.px(ex + 5, ey - 2, bc); S.px(ex + 4, ey - 1, bc); }
  }
  return [ex, ey];
}
// Mắt phát sáng (khe sáng) — dùng cho mũ giáp, bóng tối
function gEyes(S, g, t, o = {}) {
  const ex = R(g.hx - 0.2 + (o.dx || 0));
  const ey = R(g.hy - 1 + (o.dy || 0));
  const h = o.h || 2;
  for (const dx of o.one ? [4] : [0, 4]) {
    if (g.bl) { S.rc(ex + dx, ey + h - 1, 2, 1, t.dk); }
    else {
      S.rc(ex + dx, ey, 2, h, t.hi);
      S.px(ex + dx + 1, ey + h - 1, t.lt);
      if (o.white !== false) S.px(ex + dx, ey, WHITE);
    }
    S.eyes.push([ex + dx + 1, ey + h / 2]);
  }
  if (o.glow) S.glow.push([ex + (o.one ? 5 : 3), ey + 1, o.glow, t.col]);
  return [ex, ey];
}
// Hai vạt khăn buộc bay sau gáy
function knotTails(S, g, t, kx, ky, len = 5) {
  const w = [0, 0.8, 1.6, 0.8][g.fl % 4];
  S.fill(S.M().path([kx, ky, kx - len * 0.5, ky + 0.6 + w, kx - len, ky + w * 0.4], 1.6).path([kx, ky + 0.6, kx - len * 0.4, ky + 2.2 + w * 0.6, kx - len * 0.8, ky + 2.6 + w], 1.4), t, { sh: 'edge' });
}
// Khăn quàng dài bay phía sau
function scarfTail(S, g, t, len = 11, y0 = 21) {
  const { X, Y } = g;
  const f = g.fl % 4;
  const w = [[0, 1, 0], [1, 0, -1], [0, -1, 0], [-1, 0, 1]][f];
  const pts = [X - 1.5, y0 + Y, X - 1.5 - len * 0.33, y0 + 0.6 + Y + w[0], X - 1.5 - len * 0.66, y0 + 0.2 + Y + w[1], X - 1.5 - len, y0 + 1 + Y + w[2]];
  S.fill(S.M().path(pts, 2.4), t, { sh: 'edge' });
  S.fill(S.M().path([X - 1.5 - len * 0.66, y0 + 0.6 + Y + w[1], X - 2.5 - len, y0 + 3 + Y + w[2]], 1.6), darker(t), { sh: 'edge' });
}
// Áo choàng rách phía sau
function capeBack(S, g, t, o = {}) {
  const { X, Y } = g;
  const w = [0, 1, 2, 1][g.fl % 4] * (o.wave ?? 1) * 0.6;
  const b = o.bottom ?? 35.4;
  // áo choàng ôm sát lưng để bề ngang hình không vượt quá xa hitbox
  const m = S.M().poly([X - 3.8, 20.4 + Y, X + 1.4, 20.4 + Y, X - 0.4, b - 1, X - 2.4 - w * 0.3, b, X - 3.8, b - 1.6, X - 5.4 - w * 0.6, b + 0.2, X - 6.2, b - 1.8, X - 7.6 - w, b - 0.4, X - 7 - w * 0.6, 27 + Y, X - 5.4, 22 + Y]);
  if (o.pat) patFill(S, m, t, o.pat);
  else S.fill(m, t, { sh: 'v', vt: 0.25, vb: 0.75 });
  return m;
}

// ---------- Từng loài
export const HUM = {
  // Sơn Tặc: khăn đỏ buộc trán, bịt mặt vải, áo gile, gậy gỗ đóng đinh
  bandit: {
    skin: '#e2a878', top: 'b', pants: 'c', boots: '#5b4636', belt: '#3a2a20', wpn: 'club', rest: 0.1,
    back(S, P, g) { knotTails(S, g, T('#c0392b'), g.hx - 5.6, g.hy - 4.4, 3.4); },
    torso(S, P, g, m) {
      const { X } = g;
      patFill(S, m, P.b, (x, y, t) => (x < X - 1.4 || x > X + 2.6 ? (x === X - 2 || x === X + 3 ? P.a.dk : P.a.md) : null));
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const hair = S.M().ell(hx - 0.6, hy - 2.4, 6.6, 4).rows(0, R(hy - 4)).poly([hx - 6.2, hy - 4, hx - 6.4, hy - 7, hx - 4, hy - 5.4, hx - 2.8, hy - 9, hx - 0.6, hy - 6, hx + 1.6, hy - 8.6, hx + 2.8, hy - 5.6, hx + 5.4, hy - 6.8, hx + 6, hy - 4]).ell(hx - 4.8, hy + 0.2, 2, 3.4);
      S.fill(hair, P.hair, { lt: 0.45 });
      S.fill(S.M().rect(hx - 7, hy - 5.4, 14, 2).and(S.M().ell(hx, hy, 6.8, 6.2)), T('#c0392b'), { sh: 'edge' });
      const mask = S.M().ell(hx + 1, hy + 3, 6, 3.4).and(hm).rows(R(hy + 1.6), 99);
      patFill(S, mask, T('#56606e'), (x, y, t) => ((x + y) % 4 === 0 ? t.dk : null));
      hEyes(S, g, { dy: -1, brow: 0 });
      S.head = [hx, hy - 9];
    },
  },
  // Hải Tặc: khăn đỏ chấm bi, bịt một mắt, áo sọc, kiếm cong
  pirate: {
    skin: '#f0c09a', top: 'b', pants: 'a', boots: '#2e2422', belt: 'c', wpn: 'cutlass', bootTop: 31, rest: 0.06,
    back(S, P, g) { knotTails(S, g, P.c, g.hx - 5.8, g.hy - 2, 3.2); },
    torso(S, P, g, m) { patFill(S, m, P.b, (x, y) => (y % 2 === 0 && y < 27 + g.Y ? P.a.md : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X + 1.4, 28.6 + Y, X + 3.4, 28.6 + Y, X + 3, 31.4 + Y, X + 1.8, 31 + Y]), P.c, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      S.fill(S.M().ell(hx - 4.6, hy + 1.2, 2, 3.4), P.hair, { lt: 0.4 });
      S.fill(headM(S, g), g.skin, { lt: 0.5 });
      const band = S.M().ell(hx - 0.3, hy - 1.6, 6.8, 5).rows(0, R(hy - 1.6));
      patFill(S, band, P.c, (x, y) => ((x * 3 + y * 5) % 7 === 0 ? T('#ffffff').md : null));
      const [ex, ey] = hEyes(S, g, { only: 1, brow: 1 });
      S.rc(ex - 1, ey, 3, 3, EYE);
      S.px(ex - 1, ey, pack(70, 60, 80));
      for (const [x, y] of [[hx - 5.4, hy - 2.4], [hx - 4, hy - 1.6], [hx - 2.6, hy - 0.8]]) S.px(x, y, EYE);
      S.rc(ex + 1, ey + 4, 3, 1, EYE);
      S.px(ex + 2, ey + 4, WHITE);
      for (const [x, y] of [[0, 5], [3, 5], [5, 4], [-1, 4]]) S.px(ex + x, ey + y, P.hair.md, 0.35);
      S.px(R(hx - 3), R(hy + 2.4), GOLD);
      S.px(R(hx - 3), R(hy + 3.4), '#ffe082');
      S.head = [hx, hy - 6.6];
    },
  },
  // Bộ Xương: đầu lâu, xương sườn, khiên gỗ, kiếm gỉ
  skeleton: {
    skin: 'a', top: 'a', pants: 'a', hand: 'a', arm: 'a', thin: true, wpn: 'sword', blade: '#a08670', grip: '#5b3d2a', guard: '#8a8f99',
    backHand(S, P, g) {
      const [x, y] = g.hb;
      S.fill(S.M().ell(x - 1, y - 1, 3.6, 4.2), T('#8a8f99'), { lt: 0.5 });
      S.fill(S.M().ell(x - 1, y - 1, 2.6, 3.2), T(WOOD), { il: 2, lt: 0.5 });
      S.fill(S.M().rect(R(x - 1.5), R(y - 1.5), 1, 1), T('#cfd6e0'), { il: 1, sh: 'flat' });
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      const cage = S.M().ell(X, 23.4 + Y, 4, 3.4);
      patFill(S, cage, P.a, (x, y, t) => (x === R(X) ? t.lt : (y - R(Y)) % 2 === 0 ? T('#3b3442').md : null));
      S.fill(S.M().line(X, 26 + Y, X, 28 + Y, 1.6), P.a, { sh: 'edge' });
      S.fill(S.M().ell(X, 28.6 + Y, 3.4, 1.4), P.a, { sh: 'edge' });
      const cloth = S.M().poly([X - 3.6, 28.6 + Y, X + 3.8, 28.6 + Y, X + 3.4, 31.6 + Y, X + 2, 30.4 + Y, X + 0.6, 32 + Y, X - 0.8, 30.4 + Y, X - 2.4, 31.8 + Y, X - 3.6, 30.4 + Y]);
      S.fill(cloth, T('#4b3b4f'), { sh: 'v', vt: 0.3, vb: 0.7 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const sk = S.M().ell(hx, hy - 0.6, 6, 5.2).rect(hx - 1, hy + 2.6, 6.4, 2.6);
      S.fill(sk, P.a, { lt: 0.5, c: [hx, hy, 6, 5.6] });
      const ex = R(hx - 0.4);
      const ey = R(hy - 1.2);
      for (const dx of [0, 4]) {
        S.rc(ex + dx, ey, 2, 3, pack(43, 33, 52));
        S.rc(ex + dx - (dx ? 0 : 1), ey + 1, 1, 1, pack(43, 33, 52));
        if (!g.bl) { S.px(ex + dx + 1, ey + 1, '#ff5252'); S.eyes.push([ex + dx + 1.5, ey + 1.5]); }
      }
      S.px(ex + 3, ey + 3, pack(43, 33, 52));
      for (let k = 0; k < 5; k += 2) S.px(R(hx) + k, R(hy + 3.6), P.a.dk);
      S.rc(R(hx), R(hy + 2.6), 6, 1, P.a.dk);
      S.px(R(hx - 3), R(hy - 4), P.a.dk); S.px(R(hx - 2), R(hy - 3), P.a.dk); S.px(R(hx - 2), R(hy - 2), P.a.dk);
      S.head = [hx, hy - 6];
    },
  },
  // Đạo Tặc Sa Mạc: khăn xếp có ngọc, mạng che mặt, quần ống túm, dao cong
  sandbandit: {
    skin: '#c98d5a', top: 'b', pants: 'a', boots: '#6d4c41', baggy: true, wpn: 'dagger', bootTop: 34, rest: 0.2,
    back(S, P, g) { knotTails(S, g, P.a, g.hx - 5.8, g.hy - 2.6, 3.6); },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, P.b, (x, y) => (Math.abs((x - X) + (y - 24 - Y)) <= 1 ? (x - X + y - 24 - Y === 1 ? P.c.dk : P.c.md) : null));
    },
    belt: 'c',
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().rect(R(X - 3), R(27 + Y), 1, 2).rect(R(X - 1), R(27 + Y), 1, 2), T(STEEL), { il: 1, sh: 'flat' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const tur = S.M().ell(hx - 0.6, hy - 3, 7, 4.4).rows(0, R(hy - 0.8)).ell(hx - 1.2, hy - 5.6, 4.6, 2.6);
      patFill(S, tur, P.a, (x, y, t) => ((x - y * 2) % 5 === 0 ? t.dk : null));
      S.fill(S.M().ell(hx + 3.2, hy - 3.4, 1.3, 1.5), P.c, { lt: 0.4 });
      S.fill(S.M().rect(R(hx + 3), R(hy - 5.6), 1, 1), T(GOLD), { sh: 'flat' });
      const veil = S.M().ell(hx + 1.4, hy + 3, 6, 3.4).and(hm).rows(R(hy + 1.2), 99).poly([hx - 3, hy + 3, hx - 5.6, hy + 7, hx - 2, hy + 5]);
      patFill(S, veil, P.c, null);
      const [ex, ey] = hEyes(S, g, { dy: -0.6, h: 2, brow: 1 });
      S.px(ex - 1, ey + 1, EYE); S.px(ex + 6, ey + 1, EYE);
      S.head = [hx, hy - 8];
    },
  },
  // Xác Ướp: băng quấn khắp người, một mắt xanh lộ ra, giơ tay về trước
  mummy: {
    skin: 'a', top: 'a', pants: 'a', boots: 'a', arm: 'a', hand: 'a', wrap: true, wpn: 'none', armsFwd: true, trail: '#a5d6a7',
    back(S, P, g) {
      const { X, Y } = g;
      const w = [0, 1, 2, 1][g.fl % 4];
      S.fill(S.M().path([X - 3, 26 + Y, X - 5.4, 27.4 + Y + w * 0.5, X - 7.6, 26.6 + Y + w], 1.4).path([X - 2, 20.6 + Y, X - 4.6, 19.6 + Y - w * 0.3, X - 7, 20.6 + Y + w * 0.4], 1.2), P.b, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g, 6, 5.6);
      patFill(S, hm, P.a, wrapPat(P.b));
      const ex = R(hx + 3.6);
      const ey = R(hy - 1.4);
      S.rc(ex - 1, ey - 1, 4, 4, pack(43, 33, 40));
      // mắt hồn xanh 2x2 sáng rực: điểm nhấn duy nhất trên đầu toàn băng
      if (!g.bl) { S.rc(ex, ey, 2, 2, P.c.hi); S.px(ex, ey, WHITE); S.px(ex + 1, ey + 1, P.c.lt); S.px(ex + 2, ey, P.c.md, 0.6); S.eyes.push([ex + 1, ey + 1]); S.glow.push([ex + 1, ey + 1, 5, P.c.col]); }
      else S.rc(ex, ey + 1, 2, 1, P.c.dk);
      S.px(R(hx - 0.2), R(hy), pack(43, 33, 40)); S.px(R(hx + 0.8), R(hy), pack(43, 33, 40));
      S.rc(R(hx + 1), R(hy + 3), 3, 1, pack(43, 33, 40));
      const w = [0, 1, 2, 1][g.fl % 4];
      S.fill(S.M().path([hx - 5, hy + 1, hx - 6.8, hy + 3 + w * 0.5, hx - 8, hy + 2.4 + w], 1.3), P.b, { sh: 'edge' });
      S.head = [hx, hy - 5.6];
    },
  },
  // Xác Ướp Nguyền: áo choàng mũ trùm rách, hai mắt lửa xanh, ấn nguyền trên ngực, đèn lồng hồn
  cursedmummy: {
    skin: 'a', top: 'a', pants: 'a', boots: 'a', arm: 'a', hand: 'a', wrap: true, wpn: 'lantern', flame: '#c6ff00', hunch: true, rest: 0.02,
    back(S, P, g) { capeBack(S, g, CLOAK, { bottom: 35.6, pat: (x, y, t) => ((x + y) % 6 === 0 ? t.dk : null) }); },
    body(S, P, g) {
      const { X, Y } = g;
      const c = T('#c6ff00');
      for (const [x, y] of [[0, 0], [1, -1], [1, 1], [2, 0], [1, 0], [1, -2], [1, 2]]) S.px(X + x, 23 + Y + y, x === 1 && y === 0 ? WHITE : c.md, 0.95);
      S.glow.push([X + 1, 23 + Y, 4, P.c.col]);
      // mũ trùm vai
      S.fill(S.M().ell(X - 0.6, 21.6 + Y, 5.4, 2.2), CLOAK, { sh: 'edge' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hood = S.M().ell(hx - 1, hy - 0.8, 6.6, 6.4);
      patFill(S, hood, CLOAK, (x, y, t) => ((x * 2 + y) % 7 === 0 ? t.dk : null));
      // ấn nguyền xanh trên trán mũ trùm
      S.px(hx - 3, hy - 5, P.c.hi); S.px(hx - 4, hy - 4, P.c.md); S.px(hx - 2, hy - 4, P.c.md);
      const face = S.M().ell(hx + 1.8, hy + 1, 4.4, 4.2).and(hood);
      patFill(S, face, P.a, wrapPat(P.bD));
      S.fill(S.M().ell(hx + 1.6, hy + 0.4, 3.6, 2.2).and(face), T('#2a2228'), { il: 0, sh: 'flat' });
      const t = P.c;
      gEyes(S, g, { ...t, hi: T('#e6ff8a').md }, { dx: 0.4, dy: 0.2, glow: 6 });
      S.head = [hx - 1, hy - 7.2];
    },
  },
  // Ninja Lang Thang: nón lá rộng vành, bịt mặt, khăn đỏ dài, katana + vỏ kiếm sau lưng
  rogue: {
    skin: '#eac09a', top: 'a', pants: 'a', boots: '#1d1820', wpn: 'katana', grip: '#b71c1c', belt: 'b', trail: '#ffcdd2', rest: 0.08,
    back(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().line(X - 5.6, 29.4 + Y, X + 1.6, 19.4 + Y, 1.8), T('#2b2024'), { sh: 'edge' });
      scarfTail(S, g, P.b, 6.4, 21);
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X + 1) && y < 27 + g.Y ? P.a.lt : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().ell(X + 0.2, 21 + Y, 5, 1.8), P.b, { sh: 'edge' });
      for (const lx of [X - 1.8 + g.p.lb, X + 1.8 + g.p.lf]) S.fill(S.M().rect(R(lx - 1.5), 32, 3, 1), P.c, { il: 0, sh: 'flat' });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      S.fill(S.M().ell(hx + 0.8, hy + 3, 6.2, 3.6).and(hm).rows(R(hy + 2), 99).ell(hx - 3, hy + 1, 3.4, 4.6), P.a, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 6), R(hy - 1), 13, 1).and(hm), { ...g.skin, md: g.skin.dk }, { il: 0, sh: 'flat' });
      const [ex, ey] = hEyes(S, g, { dy: 0.4, h: 2, brow: 0 });
      S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE);
      const straw = T('#cda55e');
      const hat = S.M().poly([hx - 7.8, hy - 1.4, hx - 1.2, hy - 8.6, hx + 0.8, hy - 8.6, hx + 8, hy - 1.4, hx + 7, hy - 0.4, hx - 7, hy - 0.4]);
      patFill(S, hat, straw, (x, y, t) => ((x - R(hx)) % 3 === 0 && y > hy - 7 ? t.dk : y === R(hy - 2) ? T('#7a2a24').md : null));
      S.head = [hx, hy - 9];
    },
  },
  // Ninja Băng: mũ trùm trắng gắn pha lê băng, mắt xanh, khăn xanh, kunai băng
  iceninja: {
    skin: '#f6dfd0', top: 'a', pants: 'b', boots: 'c', belt: 'c', wpn: 'kunai', blade: '#bff4ff', grip: '#01579b', trail: '#b3e5fc',
    back(S, P, g) { scarfTail(S, g, P.b, 6.6, 21.4); },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X + 0.5) ? P.b.md : null)); },
    body(S, P, g) {
      S.fill(S.M().ell(g.X + 0.2, 21 + g.Y, 4.8, 1.7), P.b, { sh: 'edge' });
      crystal(S, g.sf[0] + 1, g.sf[1] - 0.6, 0.9, 2.4, 4.4, P.ice);
      crystal(S, g.sf[0] - 0.4, g.sf[1] - 1, 0.3, 2, 3.4, P.ice);
    },
    fx(S, P, g) {
      if (g.p.atk === 2) S.glow.push([g.hf[0] + 4, g.hf[1], 6, P.b.col]);
      const f = g.fl % 4;
      for (const [x, y] of [[6, 6], [9, 2], [-8, 4], [8, 12]]) if ((x + f) % 3) S.px(g.X + x + f * 0.4, g.Y + 18 + y - f, WHITE, 0.6);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      // chóp mũ trùm vắt ra sau gáy
      S.fill(S.M().poly([hx - 3, hy - 5, hx - 7.2, hy - 1.4 + (g.fl % 2) * 0.6, hx - 5, hy + 1]), P.a, { sh: 'edge' });
      const hm = headM(S, g, 6.4, 5.8);
      S.fill(hm, P.a, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 6), R(hy - 4), 13, 2).and(hm), P.c, { il: 2, sh: 'edge' });
      // ngọc băng hình thoi trên băng đô
      const gx = R(hx + 3);
      const gy = R(hy - 4);
      S.px(gx, gy - 1, WHITE); S.px(gx - 1, gy, T('#8fe3ff').hi); S.px(gx, gy, WHITE); S.px(gx + 1, gy, T('#8fe3ff').md); S.px(gx, gy + 1, T('#8fe3ff').md);
      S.glow.push([gx + 0.5, gy + 0.5, 4, '#8fe3ff']);
      S.fill(S.M().rect(R(hx - 1), R(hy - 2.2), 8, 4).and(S.M().ell(hx + 0.6, hy, 6, 5.4)), g.skin, { il: 1, sh: 'edge' });
      S.fill(S.M().ell(hx + 1, hy + 3.6, 6, 2.6).and(hm).rows(R(hy + 2), 99), P.b, { sh: 'edge' });
      hEyes(S, g, { dy: -0.8, h: 2, col: P.c.dk, iris: P.b.hi, brow: 1, browC: P.c.md });
      S.head = [hx, hy - 9];
    },
  },
  // Ảnh Ninja: thân bóng tối viền tím, mắt khe hồng phát sáng, chân tan thành khói
  shadow: {
    top: 'a', pants: 'a', arm: 'a', hand: 'a', smoke: '#6a1b9a', rest: 0.2, wpn: 'dagger', blade: '#2b2440', grip: '#120c1c', guard: '#e040fb', trail: '#e040fb',
    back(S, P, g) {
      scarfTail(S, g, P.b, 6.4, 20.6);
      const f = g.fl % 4;
      for (let k = 0; k < 5; k++) S.px(g.X - 5 + k * 2.6, 36 - ((k * 3 + f * 2) % 6), P.b.lt, 0.5);
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X - 4) && y < 27 + g.Y ? P.b.md : null)); },
    body(S, P, g) { S.fill(S.M().ell(g.X + 0.2, 21 + g.Y, 4.8, 1.7), P.b, { sh: 'edge' }); },
    fx(S, P, g) {
      const [x, y] = g.hf;
      S.glow.push([x + Math.sin(g.wa) * 4, y - Math.cos(g.wa) * 4, 5, P.c.col]);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      patFill(S, hm, P.a, (x, y, t) => {
        const i = y * S.w + x;
        return !hm.m[i - S.w] || !hm.m[i - 1] ? P.b.md : null;
      });
      S.fill(S.M().poly([hx - 5, hy - 3, hx - 7.6, hy - 1 + (g.fl % 2), hx - 5.6, hy]), P.a, { sh: 'edge' });
      gEyes(S, g, P.c, { dy: 0, h: 1, glow: 6, white: false });
      S.head = [hx, hy - 5.6];
    },
  },
  // Quỷ Võ Sĩ: giáp lá đỏ, mũ trụ sừng chữ V có đĩa đỏ, mặt nạ quỷ nanh trắng, mắt vàng
  samurai: {
    skin: '#d9a080', top: 'a', pants: '#2a1618', boots: '#1d1418', arm: 'a', hand: '#2a1618', wpn: 'katana', len: 12.5, grip: '#b71c1c', trail: '#ffe082', rest: 0.1,
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => ((y - R(g.Y)) % 2 === 0 && y > 21 + g.Y ? P.b.md : x === R(g.X) && y > 21 ? P.c.dk : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      const sk = S.M().poly([X - 5, 27.4 + Y, X + 5.2, 27.4 + Y, X + 6, 31.6 + Y, X - 5.8, 31.6 + Y]);
      patFill(S, sk, P.a, (x, y) => (x === R(X - 2) || x === R(X + 2) ? P.a.ol : (y - R(Y)) % 2 === 1 ? P.b.md : null));
      const [sx, sy] = g.sf;
      const sode = S.M().poly([sx - 1.6, sy - 1.6, sx + 2.6, sy - 1.6, sx + 3.4, sy + 3.6, sx - 1, sy + 3.6]);
      patFill(S, sode, P.a, (x, y) => ((y - R(sy)) % 2 === 0 ? P.b.md : null));
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const gold = T(GOLD);
      S.fill(S.M().path([hx + 0.6, hy - 5, hx - 2, hy - 6.4, hx - 3.4, hy - 7.8], 1.5).path([hx + 0.6, hy - 5, hx + 3.2, hy - 6.4, hx + 4.6, hy - 7.8], 1.5), gold, { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const shk = S.M().poly([hx - 6.4, hy - 2, hx - 9, hy + 3.4, hx - 7.4, hy + 4.4, hx - 3.4, hy + 2, hx - 2, hy - 1.4]);
      patFill(S, shk, P.a, (x, y) => ((y - R(hy)) % 2 === 0 ? P.b.md : null));
      const dome = S.M().ell(hx - 0.2, hy - 1.4, 6.9, 5.8).rows(0, R(hy - 1.6));
      patFill(S, dome, P.a, (x, y) => (y === R(hy - 4) ? P.b.md : null));
      S.fill(S.M().rect(R(hx - 2), R(hy - 1.6), 10, 1), gold, { sh: 'edge' });
      S.fill(S.M().ell(hx + 0.6, hy - 6, 1.8, 1.8), gold, { lt: 0.4 });
      S.fill(S.M().ell(hx + 0.6, hy - 6, 0.9, 0.9), P.b, { il: 0, lt: 0.4 });
      const menpo = S.M().ell(hx + 1.2, hy + 3, 5.6, 3.2).and(hm).rows(R(hy + 1.2), 99);
      S.fill(menpo, P.b, { lt: 0.5 });
      S.fill(S.M().rect(R(hx - 2), R(hy - 0.6), 9, 2).and(hm), T('#24121a'), { il: 0, sh: 'flat' });
      const [ex, ey] = gEyes(S, g, P.c, { dy: 0.4, h: 1, glow: 3 });
      S.rc(ex + 1, ey + 3, 4, 1, EYE);
      S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE);
      S.px(ex + 1, ey + 4, WHITE, 0.8); S.px(ex + 4, ey + 4, WHITE, 0.8);
      S.head = [hx, hy - 9];
    },
  },
  // Thiên Binh: giáp vàng áo trắng, mũ có cánh và chùm lông, cánh nhỏ sau lưng, giáo tua đỏ
  celestial: {
    skin: '#f6d2b4', top: 'a', pants: '#283593', boots: 'b', belt: 'c', wpn: 'spear', pole: '#ffd600', tassel: '#e53935', rest: 0.1,
    back(S, P, g) {
      const up = [0, 0.15, 0.3, 0.15][g.fl % 4];
      featherWing(S, g.X - 2, 22.4 + g.Y, 8.5, up, T('#ffffff'), T('#ffe9a8'), 4);
      const f = g.fl % 4;
      S.fill(S.M().ell(g.X - 5 + f * 0.3, 35.6, 3.4, 1.4).ell(g.X + 5 - f * 0.3, 35.8, 3, 1.2), T('#ffffff', 170), { il: 0, lt: 0.4 });
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, P.a, (x, y) => (y < 26 + Y && Math.abs(x - X - 0.4) < 4 - (y - 21 - Y) * 0.3 ? (y === R(21 + Y) ? P.b.hi : P.b.md) : null));
    },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X - 0.6, 28.6 + Y, X + 2.6, 28.6 + Y, X + 2.2, 32.4 + Y, X - 0.2, 32.4 + Y]), T('#e53935'), { sh: 'edge' });
      S.fill(S.M().ell(g.sf[0] + 0.4, g.sf[1] - 0.2, 2.8, 2), P.b, { lt: 0.45 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      // chùm lông đỏ trên đỉnh mũ: điểm nhấn đậm trên nền trời sáng
      S.fill(S.M().path([hx, hy - 5.6, hx - 2.6, hy - 8, hx - 6, hy - 7.6, hx - 7.6, hy - 6], 2), T('#e53935'), { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const helm = S.M().ell(hx - 0.2, hy - 1.6, 6.8, 5.4).rows(0, R(hy - 1.8)).rect(hx - 6.6, hy - 2, 2.6, 5.4);
      S.fill(helm, P.b, { lt: 0.5, c: [hx, hy - 1.6, 6.8, 5.4] });
      S.fill(S.M().rect(R(hx - 1), R(hy - 2), 8, 1), T('#ffe57f'), { sh: 'edge', il: 2 });
      S.fill(S.M().ell(hx + 2.4, hy - 4.2, 1.2, 1.2), T('#e53935'), { lt: 0.4 });
      featherWing(S, hx - 5, hy - 2.6, 3.6, 0.1, T('#ffffff'), null, 3);
      hEyes(S, g, { dy: 0, brow: 1 });
      S.px(R(hx + 2), R(hy + 3.4), EYE); S.px(R(hx + 3), R(hy + 3.4), EYE);
      S.head = [hx, hy - 9];
    },
  },
  // Hư Không Kỵ Sĩ: giáp đen nứt sáng lam, mũ sừng tím, áo choàng sao, đại kiếm hư không
  voidknight: {
    top: '#262640', pants: '#262640', boots: 'a', arm: '#262640', hand: 'a', wpn: 'greatsword', blade: '#1f1f38', edge: '#00e5ff', guard: '#651fff', grip: '#120c1c', trail: '#84ffff', rest: 0.12,
    back(S, P, g) {
      const m = capeBack(S, g, P.b, { wave: 1.2, pat: (x, y, t) => (((x * 7 + y * 13) % 23 === 0) ? WHITE : (x * 5 + y * 3) % 17 === 0 ? T('#b388ff').md : null) });
      return m;
    },
    torso(S, P, g, m) {
      const { X, Y } = g;
      patFill(S, m, T('#262640'), (x, y) => ((x === R(X - 1) && y > 22 + Y && y < 25 + Y) || (y === R(25 + Y) && x >= R(X - 1) && x <= R(X + 1)) || (x === R(X + 2) && y >= 25 + Y && y < 28 + Y) ? P.c.md : null));
      S.glow.push([X + 0.5, 25 + Y, 4, P.c.col]);
    },
    body(S, P, g) {
      const [sx, sy] = g.sf;
      S.fill(S.M().ell(sx + 0.6, sy - 0.2, 3, 2.4), T('#262640'), { lt: 0.45 });
      S.fill(S.M().rect(R(sx - 1), R(sy - 0.4), 4, 1), P.c, { il: 0, sh: 'flat' });
    },
    fx(S, P, g) {
      const f = g.fl % 4;
      for (const [x, y] of [[-9, 14], [8, 10], [10, 18], [-10, 24]]) S.px(g.X + x, g.Y + y - f * 0.6, P.c.lt, 0.7);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const horn = P.b;
      S.fill(S.M().path([hx - 3, hy - 4, hx - 6.2, hy - 6, hx - 6, hy - 7.8], 2).path([hx + 2.6, hy - 4.4, hx + 4.6, hy - 6.4, hx + 3.8, hy - 7.8], 2), horn, { sh: 'edge' });
      const steel = T('#2e2e4a');
      const hm = S.M().ell(hx, hy - 0.6, 6.3, 5.8).rect(hx - 5.6, hy, 11.6, 4.6);
      S.fill(hm, steel, { lt: 0.5, c: [hx, hy, 6.4, 6] });
      S.fill(S.M().rect(R(hx - 1.4), R(hy - 1), 9, 2).and(hm), T('#05050c'), { il: 0, sh: 'flat' });
      if (!g.bl) {
        S.rc(R(hx - 0.6), R(hy - 0.6), 7, 1, P.c.hi);
        S.px(R(hx + 1), R(hy - 0.6), WHITE); S.px(R(hx + 5), R(hy - 0.6), WHITE);
      }
      S.eyes.push([hx + 1, hy - 0.4], [hx + 5, hy - 0.4]);
      S.glow.push([hx + 3, hy - 0.4, 5, P.c.col]);
      S.head = [hx, hy - 7];
    },
  },
  // Long Vệ: giáp vảy lam ngọc, vây vai, mũ đầu rồng sừng vàng, chĩa ba vàng
  dragonguard: {
    skin: '#e8b892', top: 'a', pants: 'aD', boots: '#123a33', belt: 'c', wpn: 'trident', pole: '#ffd600', rest: 0.08,
    back(S, P, g) { capeBack(S, g, P.b, { bottom: 33.4, pat: (x, y, t) => ((x + (y % 2) * 2) % 4 === 0 && y % 2 === 0 ? t.dk : null) }); },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? P.b.md : null)); },
    body(S, P, g) {
      const [sx, sy] = g.sf;
      S.fill(S.M().poly([sx - 2, sy + 1.6, sx - 1, sy - 3.4, sx + 0.8, sy - 1.4, sx + 2.4, sy - 4.2, sx + 4, sy + 1]), P.b, { sh: 'facet', fx: sx + 1 });
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const gold = P.c;
      S.fill(S.M().path([hx - 2.6, hy - 4, hx - 5.6, hy - 6.2, hx - 7.2, hy - 6], 1.6).path([hx - 0.6, hy - 5, hx - 3, hy - 7.4, hx - 5, hy - 7.8], 1.6), gold, { sh: 'edge' });
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const helm = S.M().ell(hx - 0.4, hy - 1.6, 6.8, 5.6).rows(0, R(hy - 1.6)).rect(hx - 6.8, hy - 2, 3, 5.6)
        .poly([hx - 1, hy - 2.6, hx + 7.4, hy - 3.4, hx + 8.6, hy - 1.6, hx + 6.4, hy - 0.8, hx - 1, hy - 1]);
      patFill(S, helm, P.a, (x, y) => ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? P.b.md : null));
      S.fill(S.M().poly([hx - 3, hy - 5.8, hx - 1, hy - 7.8, hx + 1.4, hy - 6.2]), P.b, { sh: 'facet', fx: hx - 0.6 });
      for (const x of [2, 4, 6]) S.px(R(hx + x), R(hy - 1), gold.hi);
      S.px(R(hx + 5), R(hy - 3.4), P.c.md);
      hEyes(S, g, { dy: 0.4, h: 2, brow: 0 });
      S.rc(R(hx + 2), R(hy + 3.4), 2, 1, EYE);
      S.head = [hx, hy - 9];
    },
  },
  // ===== BOSS =====
  // Pharaoh Phục Sinh: khăn nemes sọc vàng lam, rắn hổ mang trên trán, vòng cổ usekh, thân băng quấn, gậy móc
  boss_pharaoh: {
    skin: '#8d6e63', top: BANDAGE, pants: BANDAGE, boots: BANDAGE, arm: BANDAGE, hand: '#8d6e63', wrap: '#bfae82', wpn: 'crook', whead: '#ffd54f', band: '#1565c0',
    back(S, P, g) {
      const { hx, hy } = g;
      const lap = S.M().poly([hx - 6.4, hy - 2.4, hx - 8.4, hy + 7.4, hx - 3.4, hy + 7.8, hx - 2.6, hy + 1]);
      patFill(S, lap, P.a, (x, y) => (y % 2 === 0 ? P.b.md : null));
    },
    body(S, P, g) {
      const { X, Y } = g;
      const col = S.M().ell(X + 0.4, 21 + Y, 5.8, 3.4).rows(R(20.4 + Y), 99);
      patFill(S, col, P.a, (x, y) => ((y - R(Y)) % 2 === 0 ? P.b.md : null));
      const kilt = S.M().poly([X - 4.8, 27.2 + Y, X + 5, 27.2 + Y, X + 6, 31.8 + Y, X - 5.4, 31.8 + Y]);
      patFill(S, kilt, T('#fff3d6'), (x, y) => (y <= 28 + Y ? P.b.md : (x - R(X)) % 2 === 0 ? P.a.dk : null));
      S.fill(S.M().rect(R(X), R(27.2 + Y), 2, 2), P.a, { il: 1, sh: 'edge' });
    },
    hands(S, P, g) { S.fill(S.M().rect(R(g.hf[0] - 1.4), R(g.hf[1] - 2.6), 3, 1), P.a, { il: 1, sh: 'flat' }); },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g, 5.8, 5.6);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      const nem = S.M().ell(hx - 0.6, hy - 1.6, 7, 5.6).rows(0, R(hy - 1.4)).rect(hx - 7, hy - 2, 4.2, 6.6);
      patFill(S, nem, P.a, (x, y) => (y % 2 === 0 ? P.b.md : null));
      S.fill(S.M().rect(R(hx - 2), R(hy - 2.4), 9, 1), T('#fff3a0'), { sh: 'flat', il: 2 });
      S.fill(S.M().path([hx + 3.4, hy - 2.6, hx + 3.6, hy - 5.4, hx + 4.8, hy - 6.4, hx + 5.6, hy - 5.6], 1.4).ell(hx + 5.4, hy - 5.8, 1.1, 0.9), P.a, { sh: 'edge' });
      S.px(R(hx + 5.6), R(hy - 6.2), '#ff1744');
      S.fill(S.M().rect(R(hx + 2.6), R(hy + 4.4), 2, 3.4), P.a, { sh: 'edge' });
      gEyes(S, g, T('#4fc3f7'), { dy: -0.6, h: 2, glow: 4 });
      S.head = [hx, hy - 7.4];
    },
  },
  // Thiên Ma: đôi cánh đen rộng đầu đỏ, vầng hào quang vàng vỡ, tóc đỏ dài, sừng nhỏ, kiếm lửa
  boss_heaven: {
    skin: '#d7a796', top: HEAVEN_ROBE, pants: HEAVEN_ROBE, boots: 'b', arm: HEAVEN_ROBE, hand: '#2a1418', belt: 'c', wpn: 'greatsword', blade: '#e64a19', edge: '#fff176', edge1: true, guard: '#ffd600', grip: '#2a1418', trail: '#ff8a65',
    back(S, P, g) {
      const { X, Y, hx, hy } = g;
      const up = [0, 0.2, 0.4, 0.2][g.fl % 4];
      const rim = T('#9c8aa8').md;
      featherWing(S, X + 1, 21 + Y, 12, up, T('#1f1a22'), T('#8e1426'), 4, 1, 0.94, rim);
      featherWing(S, X - 2, 21.4 + Y, 15, up, T('#262030'), T('#b0182e'), 5, -1, 0.94, rim);
      // hào quang vỡ: vòng mảnh 1px tách khỏi tóc, hở một khe + mảnh vỡ trôi
      const cx = hx - 0.6;
      const cy = hy - 10.4;
      const seen = new Set();
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        if (a > 0.15 && a < 0.75) continue;
        const x = R(cx + Math.cos(a) * 5);
        const y = R(cy + Math.sin(a) * 1.5);
        if (seen.has(y * 64 + x)) continue;
        seen.add(y * 64 + x);
        S.px(x, y, Math.sin(a) < 0 ? P.c.hi : P.c.md);
      }
      S.px(R(cx + 4.6), R(cy + 2.4), P.c.hi, 0.9);
      S.glow.push([cx, cy, 6, P.c.col]);
      S.fill(S.M().poly([hx - 2.4, hy - 4, hx - 8, hy + 1.6, hx - 7.6 - up * 2, hy + 7.4, hx - 5.6, hy + 5.4, hx - 4.8, hy + 8, hx - 3, hy + 3]), T(adj(P.b.col, -0.12)), { sh: 'v', vt: 0.3, vb: 0.75 });
    },
    torso(S, P, g, m) { patFill(S, m, P.a, (x, y) => (x === R(g.X - 3) || x === R(g.X + 3.6) ? P.b.md : null)); },
    body(S, P, g) {
      const { X, Y } = g;
      S.fill(S.M().poly([X + 0.4, 21.6 + Y, X + 2.4, 23.6 + Y, X + 0.4, 25.6 + Y, X - 1.6, 23.6 + Y]), P.c, { sh: 'facet', fx: X + 0.6 });
      S.fill(S.M().ell(g.sf[0] + 0.6, g.sf[1] - 0.2, 3, 2.3), P.a, { lt: 0.45 });
      crystal(S, g.sf[0] + 0.6, g.sf[1] - 1.8, 0.5, 1.6, 3, P.b);
    },
    fx(S, P, g) {
      const [x, y] = g.hf;
      const ux = Math.sin(g.wa);
      const uy = -Math.cos(g.wa);
      S.glow.push([x + ux * 6, y + uy * 6, 6, '#ff5722'], [x + ux * 12, y + uy * 12, 5, '#ffab40']);
    },
    head(S, P, g) {
      const { hx, hy } = g;
      const hm = headM(S, g);
      S.fill(hm, g.skin, { lt: 0.5, dk: -1 });
      crystal(S, hx - 2.6, hy - 4.4, -0.45, 2, 2.6, T('#2a2026'));
      crystal(S, hx + 2.6, hy - 4.8, 0.35, 2, 2.6, T('#2a2026'));
      const hair = S.M().ell(hx - 0.8, hy - 2.4, 6.8, 4.2).rows(0, R(hy - 2.2)).poly([hx + 5.6, hy - 3, hx + 6.6, hy + 0.4, hx + 4, hy - 1.6]).ell(hx - 4.6, hy + 0.4, 2.2, 3.6);
      S.fill(hair, T('#3d1424'), { lt: 0.45 });
      // vài sợi đỏ trên tóc đen
      S.px(hx - 3, hy - 5, '#c62828'); S.px(hx, hy - 6, '#c62828'); S.px(hx - 5, hy - 2, '#c62828');
      const [ex, ey] = gEyes(S, g, P.c, { dy: 0, h: 2, glow: 4 });
      S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE);
      S.px(ex + 2, ey + 4, EYE); S.px(ex + 3, ey + 4, EYE); S.px(ex + 4, ey + 3, EYE);
      S.head = [hx, hy - 9];
    },
  },
};
