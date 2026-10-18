// Thiết kế hình khối từng kiểu sprite quái (DESIGNS), dựng thủ tục theo khung hình.
import { pack, adj, T, EYE, EYE2, WHITE, BLUSH } from './palette.js';
import { R, crystal, GOLD, patFill } from './parts.js';
import { drawBee, drawBat, drawScorpion, drawYeti, drawWorm, drawSerpent, drawFairy, drawBird } from './creatures.js';
import { drawHumanoid } from './humanoid.js';

// ================= THIẾT KẾ TỪNG LOÀI =================
// Toạ độ trong khung W x H, quay mặt sang phải; mặt đất = hàng H-1 (hàng viền dưới cùng).
export const DESIGNS = {
  // ---------------- SLIME: khối thạch nảy co giãn
  slime: {
    W: 24, H: 20, idle: [0, 1, 2, 1], walk: 4, fps: [4, 9],
    draw(S, P, an, i, v, bl) {
      let rx = 8.8;
      let ry = 7.6;
      let lift = 0;
      let cx = 12;
      let mouth = 0;
      if (an === 'idle') { rx = 8.8 + i * 0.4; ry = 7.6 - i * 0.4; }
      else if (an === 'walk') [rx, ry, lift] = [[10.2, 6.2, 0], [7.8, 8.6, 1], [8.2, 8, 3], [9.6, 6.8, 0]][i];
      else if (i === 0) { rx = 10.6; ry = 5.8; cx = 11; } else { rx = 10; ry = 7; cx = 13; mouth = 1; }
      const base = 18 - lift;
      const cy = base + 1 - ry * (lift ? 0.96 : 0.8);
      const body = S.M().ell(cx, cy, rx, ry).rows(0, base);
      S.fill(body, P.a, { c: [cx, cy, rx, ry], lt: 0.66, dk: 0.2 });
      // lõi thạch phía dưới
      const core = S.M().ell(cx + 1, base - 1.2, rx * 0.72, 2.2).and(body);
      S.fill(core, P.b2, { il: 0, sh: 'flat' });
      if (v === 'king') {
        // ngọc vua to lơ lửng trong lõi thạch
        const gx = cx - rx * 0.45;
        S.fill(S.M().poly([gx - 2, base - 4, gx, base - 6.6, gx + 2, base - 4, gx, base - 1.6]), P.c, { il: 1, sh: 'facet', fx: gx });
        S.px(R(gx) - 1, R(base - 5), WHITE);
        S.glow.push([gx, base - 4, 4, P.c.col]);
      }
      const top = cy - ry;
      // đốm sáng bóng thạch
      const hx = R(cx - rx * 0.6);
      const hy = R(top + ry * 0.38);
      S.rc(hx, hy, 2, 1, WHITE, 0.95);
      S.px(hx - 1 + 0, hy + 1, WHITE, 0.85);
      S.px(hx + 3, hy - 1, WHITE, 0.6);
      S.px(R(cx + rx * 0.55), R(base - 2), P.a.lt, 1);
      S.px(R(cx - rx * 0.35), R(base - 1), P.a.lt, 1);
      // mặt
      const ex = R(cx + rx * 0.02);
      const ey = R(cy - ry * 0.28);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      if (mouth) { S.rc(ex + 2, ey + 3, 2, 2, EYE); S.px(ex + 2, ey + 4, BLUSH); }
      else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); S.px(ex + 2, ey + 4, P.a.dk, 0); }
      S.blush(ex - 1, ey + 3);
      S.blush(ex + 5, ey + 3);
      S.head = [cx + 1, top];
    },
  },

  // ---------------- THỎ: nhảy lò cò, tai vẫy
  bunny: {
    W: 24, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 9],
    draw(S, P, an, i, v, bl) {
      let by = 0;
      let hx = 0;
      let hy = 0;
      let ea = -0.25;
      let eb = 0.05;
      let hind = 0;
      let paw = 0;
      let mouth = 0;
      if (an === 'idle') { ea += [0, 0.12, 0.05][i]; eb += [0, 0.1, -0.05][i]; hy = i === 2 ? 1 : 0; }
      else if (an === 'walk') {
        [by, hind, paw] = [[0, 0, 0], [2, -2, 1], [4, -3, 2], [1, 1, 0]][i];
        ea -= [0.1, 0.35, 0.5, 0.2][i];
        eb -= [0.1, 0.3, 0.45, 0.15][i];
        if (i === 0) hy = 1;
      } else if (i === 0) { hx = -1; hy = -1; ea -= 0.3; eb -= 0.3; hind = 1; }
      else { hx = 3; by = 1; ea -= 0.8; eb -= 0.75; mouth = 1; paw = 2; hind = -3; }
      const Y = 2 - by;
      // tai sau + đuôi + chân sau
      const ear1 = S.M().ell(12.2 + hx, 4.6 + Y + hy, 1.7, 4.8, 1, ea);
      S.fill(ear1, P.a, { c: [12 + hx, 6 + Y, 3, 6] });
      S.fill(S.M().ell(12.4 + hx, 5 + Y + hy, 0.7, 3.3, 1, ea), P.c, { il: 0, sh: 'flat' });
      S.fill(S.M().ell(6.5 + hind, 20.2 + Y - (by ? 1 : 0), 3.3, 1.6), P.a, { sh: 'edge' });
      S.fill(S.M().ell(4.2 + hind * 0.3, 14.6 + Y, 1.9, 1.9), P.aL, { lt: 0.4 });
      // thân
      S.fill(S.M().ell(9.6, 16.2 + Y, 6.2, 4.6), P.a, { lt: 0.55 });
      S.fill(S.M().ell(10.5, 18.4 + Y, 3.6, 2).and(S.M().ell(9.6, 16.2 + Y, 6.2, 4.6)), P.aL, { il: 0, sh: 'flat' });
      S.fill(S.M().ell(14 + paw, 20.3 + Y - (paw ? 1 : 0), 1.8, 1.3), P.a, { sh: 'edge' });
      // tai trước
      const ear2 = S.M().ell(15 + hx, 4.1 + Y + hy, 1.8, 5, 1, eb);
      S.fill(ear2, P.a, { c: [15 + hx, 6 + Y, 3, 6] });
      S.fill(S.M().ell(15.1 + hx, 4.6 + Y + hy, 0.75, 3.5, 1, eb), P.c, { il: 0, sh: 'flat' });
      // đầu
      const hcx = 14.6 + hx;
      const hcy = 10.8 + Y + hy;
      S.fill(S.M().ell(hcx, hcy, 5.8, 5), P.a, { lt: 0.5 });
      S.fill(S.M().ell(hcx + 2.6, hcy + 2.4, 2.6, 1.6).and(S.M().ell(hcx, hcy, 5.8, 5)), P.aL, { il: 0, sh: 'flat' });
      const ex = R(hcx - 0.6);
      const ey = R(hcy - 1.8);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      S.px(ex + 6, ey + 3, P.c.md);
      S.px(ex + 6, ey + 2, P.c.lt);
      if (mouth) { S.px(ex + 4, ey + 4, EYE); S.px(ex + 5, ey + 4, EYE); }
      else { S.px(ex + 5, ey + 4, P.a.ol, 0.7); S.px(ex + 4, ey + 4, P.a.dk); }
      S.blush(ex - 1, ey + 3);
      S.blush(ex + 3, ey + 3, 1);
      S.head = [hcx, hcy - 5];
    },
  },

  // ---------------- NẤM: lạch bạch, mũ có đốm
  mushroom: {
    W: 24, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw(S, P, an, i, v, bl) {
      let bob = 0;
      let cs = 0;
      let cd = 0;
      let lf = 0;
      let rf = 0;
      let crx = 10;
      let spore = 0;
      let arm = 0;
      if (an === 'idle') { cd = [0, 1, 0][i]; crx = 10 + (i === 1 ? 0.4 : 0); arm = i === 2 ? 1 : 0; }
      else if (an === 'walk') { [lf, rf, bob, cs] = [[1, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, -1], [0, 0, 1, 0]][i]; arm = i % 2; }
      else if (i === 0) { cd = 2; crx = 10.6; arm = -1; }
      else { cs = 2; bob = 1; spore = 1; crx = 9.6; arm = 2; }
      const X = 12;
      // chân
      S.fill(S.M().ell(X - 3.2, 21.6 - lf, 2.4, 1.5), P.bD, { sh: 'edge' });
      S.fill(S.M().ell(X + 3.4, 21.6 - rf, 2.4, 1.5), P.bD, { sh: 'edge' });
      S.fill(S.M().ell(X - 5.6, 17.4 - bob - arm * 0.5, 1.4, 1.9), P.b);
      // thân
      const body = S.M().ell(X + 0.2, 17.2 - bob, 5.4, 4.7);
      S.fill(body, P.b, { lt: 0.5 });
      S.fill(S.M().ell(X + 6, 17.4 - bob - arm, 1.4, 1.9), P.b);
      // phiến dưới mũ
      const ccx = X + cs * 0.5;
      const ccy = 11.4 - bob + cd;
      S.fill(S.M().ell(ccx, ccy + 0.9, crx - 1.6, 1.7), P.bD, { il: 2, sh: 'flat' });
      // mũ nấm
      const cap = S.M().ell(ccx, ccy, crx, 8.2).rows(0, R(ccy));
      S.fill(cap, P.a, { c: [ccx, ccy, crx, 8.2], lt: 0.58, dk: 0.32 });
      // vành mũ cong
      S.fill(S.M().ell(ccx, ccy + 0.2, crx - 0.2, 1.2).and(S.M().rect(0, R(ccy), 24, 2)), P.aD, { il: 0, sh: 'flat' });
      const spots = [[-4.6, -4.4, 2, 1.6], [1.6, -6.2, 2.3, 1.6], [5.8, -2.6, 1.7, 1.5], [-8, -1.2, 1.2, 1.3], [0.8, -2, 1.4, 1.1]];
      for (const [dx, dy, rx, ry] of spots) {
        S.fill(S.M().ell(ccx + dx * crx / 10, ccy + dy, rx, ry).and(cap), P.c, { il: 2, c: [ccx, ccy, crx, 8.2], lt: 0.5, dk: 0.2 });
      }
      S.px(R(ccx - 6), R(ccy - 4), WHITE, 0.8);
      S.px(R(ccx - 5), R(ccy - 5), WHITE, 0.6);
      // mặt
      const ex = X - 1;
      const ey = R(15.2 - bob);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      if (an === 'atk' && i === 1) { S.rc(ex + 2, ey + 3, 2, 2, EYE); }
      else { S.px(ex + 2, ey + 3, EYE); S.px(ex + 3, ey + 3, EYE); }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3);
      if (spore) {
        const sc = P.c.md;
        for (const [sx, sy] of [[21, 6], [22, 9], [19, 3], [23, 12], [17, 1]]) S.px(sx, sy, sc, 0.9);
        S.px(20, 5, P.a.lt, 0.8);
      }
      S.head = [ccx, ccy - 8.2];
    },
  },

  // ---------------- IMP: khỉ / quỷ chibi đầu to
  imp: {
    W: 28, H: 28, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw(S, P, an, i, v, bl) {
      const king = v === 'oniK';
      const oni = v === 'oni' || king;
      const monkey = v === 'monkey';
      const abyss = v === 'abyss';
      let lb = 0; let lf = 0; let ab = 0; let af = 0; let bob = 0; let hb = 0; let tw = 0;
      let pose = 0; // 0 thường, 1 giơ cao, 2 đập/vồ tới
      if (an === 'idle') { hb = [0, 0, 1][i]; tw = [0, 1, 1][i]; af = i === 2 ? 1 : 0; }
      else if (an === 'walk') { [lb, lf, ab, af, bob] = [[-2, 2, 2, -2, 0], [0, 0, 0, 0, 1], [2, -2, -2, 2, 0], [0, 0, 0, 0, 1]][i]; tw = [0, 1, 0, -1][i]; }
      else if (i === 0) { pose = 1; hb = -1; lf = 1; lb = -1; tw = -1; }
      else { pose = 2; hb = 1; lf = 2; lb = -2; tw = 1; }
      const X = 13;
      const Y = -bob;
      // đuôi
      if (monkey) {
        S.fill(S.M().path([X - 3.5, 21 + Y, X - 7, 20.4 + Y, X - 9, 17.4 + Y, X - 8.6 + tw, 14 + Y, X - 6.6 + tw, 13 + Y, X - 5.4 + tw, 14.6 + Y], 1.7), P.a, { sh: 'edge' });
      } else if (!oni) {
        S.fill(S.M().path([X - 3.5, 21 + Y, X - 7.5, 21 + Y, X - 9.5, 17.5 + Y + tw * 0.5], 1.4), P.a, { sh: 'edge' });
        S.fill(S.M().poly([X - 11.2, 17 + Y + tw * 0.5, X - 9.8, 13.6 + Y + tw * 0.5, X - 8.2, 16.8 + Y + tw * 0.5]), P.c, { sh: 'facet', fx: X - 9.6 });
      }
      if (abyss) {
        // cánh dơi đỏ thẫm sau lưng, xương cánh tím sáng: tách hẳn khỏi thân tím
        const w = tw * 0.8;
        const wm = S.M().poly([X - 2, 17 + Y, X - 7.6, 7.6 + Y - w, X - 12.4, 9.6 + Y - w, X - 10.2, 12 + Y, X - 11.2, 15.4 + Y, X - 8, 14.6 + Y, X - 7, 18.4 + Y, X - 3.4, 19.6 + Y]);
        S.fill(wm, T('#8e1030'), { sh: 'edge' });
        S.dm(S.M().path([X - 2.6, 17.6 + Y, X - 7.6, 8 + Y - w, X - 12, 9.8 + Y - w], 1).path([X - 7.4, 9 + Y - w, X - 9.8, 13.4 + Y], 1).and(wm), P.b.md, 1);
      }
      // chân sau + tay sau (Quỷ Vương: chân sẫm tách khỏi thân đỏ)
      const legT = king ? T(adj(P.a.col, -0.16)) : P.a;
      const legD = king ? T(adj(P.a.col, -0.24)) : P.aD;
      S.fill(S.M().line(X - 1.6, 21.5 + Y, X - 2 + lb, 25.2, 2.6), legD, { sh: 'edge' });
      S.fill(S.M().ell(X - 1.6 + lb, 25.9, 2.1, 1.2), king ? T('#3a2a2a') : oni ? P.aD : P.bD, { sh: 'edge' });
      const abx = pose === 1 ? X - 6.5 : pose === 2 ? X - 5 : X - 5.4 + ab;
      const aby = pose === 1 ? 14 + Y : pose === 2 ? 17 + Y : 21.4 + Y;
      S.fill(S.M().line(X - 2.6, 17.6 + Y, abx, aby, 2.2), P.aD, { sh: 'edge' });
      S.fill(S.M().ell(abx, aby + 0.4, 1.6, 1.5), monkey ? P.bD : P.aD);
      // thân
      const body = S.M().ell(X, 20 + Y, 4.5, 4.1);
      S.fill(body, P.a, { lt: 0.55 });
      S.fill(S.M().ell(X + 1.2, 20.8 + Y, 2.8, 2.7).and(body), oni ? P.aL : P.b, { il: 2, lt: 0.75, dk: 0 });
      if (oni) {
        const cloth = S.M().rect(X - 5, 21.6 + Y, 10, 2.6).and(S.M().ell(X, 20.6 + Y, 5.2, 4.8)).poly([X - 1, 23 + Y, X + 1.5, 26 + Y, X + 4, 23 + Y]);
        S.fill(cloth, P.tiger, { il: 1, sh: 'v', vt: 0.35, vb: 0.75 });
        for (const [sx, sy] of [[-3, 22], [-2, 23], [0, 22], [2, 23], [3, 22], [1, 24]]) S.px(X + sx, sy + Y, P.tiger.ol, 0.9);
      }
      // chân trước
      S.fill(S.M().line(X + 1.6, 22 + Y, X + 2 + lf, 25.2, 2.6), legT, { sh: 'edge' });
      S.fill(S.M().ell(X + 2.6 + lf, 25.9, 2.2, 1.2), king ? T('#4a3636') : oni ? P.a : P.b, { sh: 'edge' });
      // đầu
      const hx = X + 0.5 + (pose === 2 ? 1 : 0);
      const hy = 10.4 + Y + hb;
      if (monkey) {
        for (const [ex, er] of [[-6.9, 2.6], [7, 2.4]]) {
          S.fill(S.M().ell(hx + ex, hy + 0.8, er, er + 0.2), P.a);
          S.fill(S.M().ell(hx + ex * 1.04, hy + 1, er * 0.5, er * 0.56), P.b, { il: 0, sh: 'flat' });
        }
      }
      if (abyss) {
        // sừng ngà cong vút ra sau, chóp sẫm (không còn giống tai)
        const ivory = T('#efe2c0');
        for (const [bx, by, sg] of [[hx - 3.4, hy - 4.4, -1], [hx + 2.6, hy - 4.8, -0.6]]) {
          S.fill(S.M().line(bx, by, bx + sg * 1.6, by - 3.4, 2.6).line(bx + sg * 1.6, by - 3.4, bx + sg * 4, by - 5.2, 1.8).line(bx + sg * 4, by - 5.2, bx + sg * 5.8, by - 5, 1.2), ivory, { sh: 'edge' });
          S.px(bx + sg * 5.6, by - 5, P.a.dk);
        }
      }
      const head = S.M().ell(hx, hy, 6.9, 6.1);
      S.fill(head, P.a, { lt: 0.5, dk: 0.1 });
      if (monkey) {
        const face = S.M().ell(hx + 1.6, hy + 1.9, 4.7, 3.4).ell(hx - 0.2, hy - 0.4, 2.8, 2.8).ell(hx + 3.5, hy - 0.4, 2.8, 2.8).and(head);
        S.fill(face, P.b, { il: 2, lt: 0.42, dk: 0 });
        S.fill(S.M().poly([hx - 2.4, hy - 5.2, hx - 1.4, hy - 8, hx + 0.2, hy - 5.8, hx + 1.6, hy - 7.4, hx + 1.8, hy - 5.2]), P.a, { il: 0, sh: 'edge' });
      }
      if (oni) {
        // tóc xoăn trước trán + sừng
        if (king) {
          // sừng ngắn chĩa ngang để boss không cao quá hitbox
          crystal(S, hx - 5.2, hy - 2.6, -1.02, 3.2, 5.4, P.horn);
          crystal(S, hx + 4.6, hy - 3, 0.98, 3.2, 5.4, P.horn);
        } else {
          crystal(S, hx - 3.6, hy - 4.4, -0.42, 3.2, 5, P.horn);
          crystal(S, hx + 2.8, hy - 4.8, 0.38, 3.2, 5.2, P.horn);
        }
        const kd = king ? 0.8 : 0;
        const hair = S.M().ell(hx - 4, hy - 3.8 + kd, 2.7, 2.5).ell(hx - 0.8, hy - 5 + kd, 2.9, 2.3).ell(hx + 2.6, hy - 4.6 + kd, 2.6, 2.2)
          .ell(hx - 6.2, hy - 1, 2.1, 2.7).ell(hx - 5.6, hy + 2.2, 1.6, 1.8);
        hair.ell(hx + 1.8, hy + 1.4, 5.2, 4, 0);
        const ht = king ? T('#5c2a3e') : P.hair;
        S.fill(hair, ht, { lt: 0.45, il: 1 });
        S.dm(S.M().path([hx - 5, hy - 3 + kd, hx - 4, hy - 4.2 + kd, hx - 2.8, hy - 3.4 + kd], 1).path([hx - 1.8, hy - 4.2 + kd, hx - 0.6, hy - 5.2 + kd, hx + 0.6, hy - 4.4 + kd], 1).path([hx - 6.8, hy, hx - 6, hy - 1.2], 1), ht.dk, 1);
        if (king) {
          // sợi tóc sáng tạo khối cho bờm Quỷ Vương
          S.dm(S.M().path([hx - 4.6, hy - 4.6 + kd, hx - 3.4, hy - 5.4 + kd], 1).path([hx - 1.4, hy - 6 + kd, hx, hy - 6.4 + kd], 1).path([hx - 7, hy - 2.4, hx - 6.6, hy - 3.2], 1), ht.hi, 0.9);
        }
      }
      const ex = R(hx);
      const ey = R(hy - 1);
      S.eye(ex, ey, 2, 3, { blink: bl, iris: oni || abyss ? P.c.lt : undefined });
      S.eye(ex + 4, ey, 2, 3, { blink: bl, iris: oni || abyss ? P.c.lt : undefined });
      if (abyss) { S.px(ex - 1, ey - 1, EYE); S.px(ex + 6, ey - 1, EYE); }
      if (oni) {
        S.px(ex - 1, ey - 2, EYE); S.px(ex, ey - 1, EYE); S.px(ex + 1, ey - 1, EYE);
        S.px(ex + 6, ey - 2, EYE); S.px(ex + 5, ey - 1, EYE); S.px(ex + 4, ey - 1, EYE);
        S.rc(ex + 1, ey + 4, 4, 1, EYE);
        if (pose) S.rc(ex + 2, ey + 5, 2, 1, EYE);
        S.px(ex + 1, ey + 3, WHITE); S.px(ex + 4, ey + 3, WHITE);
      } else if (monkey) {
        S.px(ex + 2, ey + 3, P.b.dk); S.px(ex + 3, ey + 3, P.b.dk);
        if (pose) { S.rc(ex + 2, ey + 4, 2, 2, P.a.ol); }
        else { S.px(ex + 1, ey + 4, P.a.ol); S.px(ex + 2, ey + 5, P.a.ol); S.px(ex + 3, ey + 5, P.a.ol); S.px(ex + 4, ey + 4, P.a.ol); }
      } else {
        S.rc(ex + 2, ey + 4, 2, 1, EYE);
      }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3, 2);
      if (king) {
        // chuỗi hạt ngà to vắt ngang ngực, vẽ sau đầu để luôn thấy rõ
        for (let k = 0; k < 7; k++) {
          const a = 0.3 + k * 0.42;
          S.fill(S.M().ell(hx - 0.6 + Math.cos(a) * 5.4, hy + 6.4 + Math.sin(a) * 2.2, 1.35, 1.35), k === 3 ? T('#4caf50') : T('#f3e2b8'), { lt: 0.4 });
        }
      }
      // tay trước (+ chùy gai của quỷ)
      let afx = X + 5 + af;
      let afy = 21 + Y;
      if (pose === 1) { afx = X + 1; afy = 6 + Y; }
      if (pose === 2) { afx = X + 9; afy = 16 + Y; }
      if (oni) {
        let c0; let c1;
        if (pose === 1) { c0 = [afx, afy]; c1 = [afx - 9, afy - 3]; }
        else if (pose === 2) { c0 = [afx, afy]; c1 = [afx + 5, afy + 8.5]; }
        else { c0 = [afx + 0.6, afy + 1.6]; c1 = [afx + 3.8, afy - 10.5]; }
        const lx = (f) => c0[0] + (c1[0] - c0[0]) * f;
        const ly = (f) => c0[1] + (c1[1] - c0[1]) * f;
        const k = S.M().line(c0[0], c0[1], lx(0.3), ly(0.3), 1.8).line(lx(0.26), ly(0.26), lx(0.84), ly(0.84), 3.8).ell(lx(0.86), ly(0.86), 2.4, 2.4);
        S.fill(k, P.iron, { lt: 0.45 });
        for (const f of [0.45, 0.62, 0.79]) S.px(lx(f) - 1, ly(f), P.iron.hi);
        for (const f of [0.53, 0.7, 0.9]) S.px(lx(f) + 1, ly(f), P.iron.lt);
      }
      S.fill(S.M().line(X + 2.6, 17.6 + Y, afx, afy, 2.2), P.a, { sh: 'edge' });
      S.fill(S.M().ell(afx + 0.3, afy + 0.3, 1.7, 1.6), monkey ? P.b : P.a);
      if (pose === 2 && !oni) {
        for (const [sx, sy] of [[3, -4], [4, -2], [4, 0], [3, 2]]) S.px(afx + sx, afy + sy, WHITE, 0.75);
      }
      S.head = [hx + 0.2, hy - (king ? 6.4 : oni ? 9 : 6)];
    },
  },

  // ---------------- FLYER: ong / dơi, vỗ cánh
  flyer: {
    W: 30, H: 20, idle: [0, 1, 2, 3], walk: 4, fps: [12, 14], always: true,
    draw(S, P, an, i, v, bl) {
      if (v === 'bee') return drawBee(S, P, an, i, bl);
      if (v === 'fairy') return drawFairy(S, P, an, i, bl);
      if (v === 'bird') return drawBird(S, P, an, i, bl);
      return drawBat(S, P, an, i, bl, v);
    },
  },

  // ---------------- CUA / BỌ CẠP
  crab: {
    W: 32, H: 20, idle: [0, 1, 2, 1], walk: 4, fps: [3, 10],
    draw(S, P, an, i, v, bl) {
      if (v === 'scorp') return drawScorpion(S, P, an, i, bl);
      let bob = 0;
      let open = 0.6;
      let clawY = 0;
      let lp = 0;
      let lunge = 0;
      if (an === 'idle') { open = [0.3, 0.8, 1.1][i]; clawY = i === 2 ? -1 : 0; }
      else if (an === 'walk') { lp = i; bob = i % 2; open = [0.5, 0.9, 0.5, 0.2][i]; clawY = -(i % 2); }
      else if (i === 0) { open = 1.4; clawY = -3; }
      else { open = 0; clawY = 1; lunge = 2; }
      const X = 16 + lunge * 0.5;
      const Y = -bob;
      // chân (3 mỗi bên)
      for (let k = 0; k < 3; k++) {
        const up = (k + lp) % 2 === 0 && an === 'walk' ? 1 : 0;
        const ox = 3.5 + k * 1.7;
        S.fill(S.M().path([X - ox, 14 + Y, X - ox - 3, 15 + Y - up, X - ox - 3.6, 18.4 - up], 1.2), P.aD, { sh: 'edge' });
        S.fill(S.M().path([X + ox, 14 + Y, X + ox + 3, 15 + Y - (1 - up) * (an === 'walk' ? 1 : 0), X + ox + 3.6, 18.4 - (an === 'walk' ? 1 - up : 0)], 1.2), P.aD, { sh: 'edge' });
      }
      // càng sau (trái)
      const emp = v === 'emperor';
      const cl = (sx, sgn, o, cy) => {
        const k = emp && sgn > 0 ? 1.55 : 1;
        S.fill(S.M().line(X + sgn * 6.5, 12 + Y, sx, cy + 2, 2.2), P.a, { sh: 'edge' });
        const c = S.M().ell(sx + sgn * 0.6, cy, 3.4 * k, 2.7 * k);
        if (o > 0.05) c.poly([sx + sgn * 0.4, cy - 0.2, sx + sgn * 4.6 * k, cy - 0.6 - 1.6 * o * k, sx + sgn * 4.6 * k, cy + 0.6 * o], 0);
        S.fill(c, P.a, { lt: 0.5 });
        S.px(sx + sgn * 2.2 - (sgn < 0 ? 1 : 0), cy - 2, P.a.hi);
        // càng lớn của Cua Hoàng Đế: mũi càng bọc vàng
        if (k > 1) S.fill(S.M().ell(sx + sgn * 3.6, cy - 1, 1.6, 1.2).and(c), T(GOLD), { il: 1, lt: 0.4 });
      };
      cl(X - 10.5, -1, open, 8.5 + Y + clawY);
      // mai
      const body = S.M().ell(X, 12.6 + Y, 8.8, 5.2).rows(0, R(16.6 + Y));
      S.fill(body, P.a, { lt: 0.55, dk: 0.25 });
      S.fill(S.M().rect(0, R(15 + Y), 32, 3).and(body), P.b, { il: 2, sh: 'flat' });
      for (const [dx, dy] of [[-5, -2], [-2, -3], [4, -2.5], [6, 0]]) S.px(X + dx, 12.6 + Y + dy, P.a.lt);
      S.px(X - 4, 9 + Y, P.a.hi); S.px(X - 3, 9 + Y, P.a.hi);
      if (emp) {
        // vương miện gai vàng trên mai + ngọc trai lớn giữa mai của Cua Hoàng Đế
        // gai vàng dựng ở nửa sau mai (mắt cuống không che) + ngọc trai lớn
        for (const [dx, dy, h, a] of [[-8.6, 2, 4.4, -0.75], [-6.4, 0.4, 6, -0.45], [-4, -0.4, 4.6, -0.15]]) {
          const ux = Math.sin(a); const uy = -Math.cos(a);
          const bx = X + dx; const by = 10.4 + Y + dy;
          crystal(S, bx, by, a, 2.8, h, T(GOLD));
          S.px(bx + ux * h * 0.6, by + uy * h * 0.6, WHITE, 0.8);
        }
        S.fill(S.M().ell(X - 4.4, 12 + Y, 2, 1.8), T('#fff8e1'), { il: 1, lt: 0.4 });
        S.px(R(X - 5), R(11.4 + Y), WHITE);
        S.glow.push([X - 4.4, 12 + Y, 4, '#fff8e1']);
      } else if (v === 'gem') {
        // cụm ngọc to trên mai, tông đậm hơn thân để nổi khối
        // cụm ngọc sáng mọc nửa sau mai, chéo về sau để không bị mắt che
        const gem = P.b;
        crystal(S, X - 8.4, 11.4 + Y, -0.8, 2.8, 5, gem);
        crystal(S, X - 6.4, 9.8 + Y, -0.45, 3.2, 7.2, gem);
        crystal(S, X - 4, 9.4 + Y, -0.1, 2.8, 5.2, gem);
        S.px(R(X - 8), R(4.6 + Y), WHITE);
        S.glow.push([X - 7, 5 + Y, 7, P.b.col]);
      }
      // mắt cuống
      for (const sx of [-2.6, 2.6]) {
        S.fill(S.M().line(X + sx, 9.5 + Y, X + sx * 1.15, 6.4 + Y, 1.4), P.a, { sh: 'flat' });
      }
      for (const sx of [-2.6, 2.6]) {
        const ex = X + sx * 1.2;
        S.fill(S.M().ell(ex, 5 + Y, 1.9, 1.9), P.eyeW, { lt: 0.5 });
        if (bl) S.rc(R(ex - 1), R(5 + Y), 2, 1, EYE);
        else { S.rc(R(ex - 0.4), R(4.2 + Y), 1, 2, EYE); S.px(R(ex - 0.4), R(4.2 + Y), WHITE, 0.4); S.px(R(ex + 0.6), R(4.2 + Y), EYE); }
        S.eyes.push([ex + 0.2, 5 + Y]);
      }
      // miệng + má
      const my = R(12.4 + Y);
      if (an === 'atk' && i === 0) { S.rc(R(X - 1), my, 2, 2, EYE); }
      else { S.px(R(X - 1), my, EYE); S.px(R(X), my + 1, EYE); S.px(R(X + 1), my, EYE); }
      S.blush(R(X - 5), my);
      S.blush(R(X + 3), my);
      // càng trước (phải)
      cl(X + 10.5, 1, open, 8.5 + Y + clawY);
      S.head = [X, 7.4 + Y];
    },
  },

  // ---------------- GOLEM: đá nặng nề + pha lê phát sáng / người tuyết lông
  golem: {
    W: 34, H: 34, idle: [0, 1, 2, 1], walk: 4, fps: [2.5, 6],
    draw(S, P, an, i, v, bl) {
      if (v === 'yeti' || v === 'yetiK') return drawYeti(S, P, an, i, bl, v === 'yetiK');
      // mỗi loài một bóng dáng: đá khom lưng, băng góc cạnh, pha lê thẳng người, tượng vuông vức, cây thân gỗ, san hô cành nhánh
      const lava = v === 'lava';
      const ice = v === 'ice';
      const tree = v === 'tree';
      const statue = v === 'statue';
      const coral = v === 'coral';
      const kingC = v === 'crystalK';
      const cryst = v === 'crystal' || kingC;
      const rockV = !lava && !ice && !tree && !statue && !coral && !cryst;
      const noCrys = lava || tree || statue || coral;
      const useB = lava || coral;
      // Tinh Thể Vương: phần tối kéo về tím chàm thay vì lam bão hòa; Mộc Tinh: vỏ cây sáng hơn để thấy mắt
      const rock = kingC ? { ...P.a, dk: T('#4a2f96').md, ol: T('#2a1650').md } : tree ? T(adj(P.b.col, 0.16)) : useB ? P.b : P.a;
      const rockD = kingC ? { ...P.aD, dk: T('#3d2680').md, ol: T('#2a1650').md } : tree ? T(adj(P.b.col, 0.07)) : useB ? P.bD : P.aD;
      const crys = lava ? P.a : tree ? T('#e6ff7a') : P.c;
      const leaf = T(adj(P.a.col, 0.04));
      let bob = 0; let lb = 0; let lf = 0; let ab = 0; let af = 0;
      let pose = 0;
      if (an === 'idle') bob = [0, 0, 1][i];
      else if (an === 'walk') [lb, lf, bob, ab, af] = [[2, 0, 0, -1, 1], [0, 0, 1, 0, 0], [0, 2, 0, 1, -1], [0, 0, 1, 0, 0]][i];
      else pose = i + 1;
      const X = 17;
      const Y = bob;
      // tay: mỗi loài một kiểu cẳng tay / nắm tay
      const arm = (sx, sy, fx, fy, tn, front) => {
        const sg = front ? 1 : -1;
        if (tree) {
          S.fill(S.M().line(sx, sy, fx, fy, 2.6).line((sx + fx) / 2, (sy + fy) / 2, (sx + fx) / 2 + sg * 1.6, (sy + fy) / 2 - 3.4, 1.4), tn, { sh: 'edge' });
          const lm = S.M().ell(fx + sg * 0.6, fy - 0.4, 3, 2.4);
          patFill(S, lm, front ? leaf : T(adj(leaf.col, -0.07)), (x, y) => ((x * 3 + y * 5) % 7 === 0 ? leaf.dk : null));
          return;
        }
        if (coral) {
          S.fill(S.M().line(sx, sy, fx, fy, 3.2).line(fx, fy, fx + sg * 2.8, fy - 3.4, 1.6).line(fx, fy, fx - sg * 1, fy - 3.8, 1.4), tn, { sh: 'edge' });
          S.fill(S.M().ell(fx + sg * 2.8, fy - 3.6, 1.3, 1.3).ell(fx - sg * 1, fy - 4.2, 1.1, 1.1).ell(fx, fy + 0.6, 2.4, 2.1), tn, { lt: 0.45 });
          return;
        }
        if (statue) {
          S.fill(S.M().line(sx, sy, fx, fy, 5), tn, { sh: 'edge' });
          S.fill(S.M().rect(R(fx - 3), R(fy - 2.6), 6, 6), tn, { sh: 'edge', side: 1 });
          S.rc(R(fx - 3), R(fy + 0.4), 6, 1, tn.dk);
          return;
        }
        if (ice) {
          S.fill(S.M().line(sx, sy, fx, fy, 4.4), tn, { lt: 0.5 });
          S.fill(S.M().poly([fx - 3.8, fy, fx, fy - 3.8, fx + 3.8, fy, fx, fy + 3.6]), tn, { sh: 'facet', fx });
          // nhũ băng rủ dưới nắm tay
          S.fill(S.M().poly([fx - 2.6, fy + 1.6, fx - 1.6, fy + 5.6, fx - 0.6, fy + 2.4]), P.ice, { sh: 'facet' });
          return;
        }
        S.fill(S.M().line(sx, sy, fx, fy, rockV ? 6 : cryst ? 4.2 : 5), tn);
        S.fill(S.M().ell(fx, fy, rockV ? 5 : 4.4, rockV ? 4.4 : 3.9), tn, { lt: 0.5 });
        if (rockV) for (const dx of [-2, 0, 2]) S.px(R(fx + dx + sg * 0.5), R(fy + 3), tn.dk);
      };
      // chân
      if (tree) {
        for (const [x0, l, t] of [[X - 4.4, lb, rockD], [X + 4.4, lf, rock]]) {
          S.fill(S.M().ell(x0, 30.4 - l, 4, 2.6).rows(0, 32 - l).line(x0 - 2.4, 31.2 - l, x0 - 4.8, 32.4, 1.4).line(x0 + 2.4, 31.2 - l, x0 + 4.6, 32.4, 1.4), t, { sh: 'edge' });
        }
      } else if (statue) {
        S.fill(S.M().rect(R(X - 8.2), R(28 - lb), 7, 5 + lb), rockD, { sh: 'edge' });
        S.fill(S.M().rect(R(X + 1.4), R(28 - lf), 7, 5 + lf), rock, { sh: 'edge' });
      } else {
        S.fill(S.M().ell(X - 4.5, 29.4 - lb, 3.8, 3.6).rows(0, 32 - lb), rockD, { sh: 'edge' });
        S.fill(S.M().ell(X + 4.5, 29.4 - lf, 4, 3.6).rows(0, 32 - lf), rock, { sh: 'edge' });
      }
      // tay sau
      const shY = (rockV ? 16.6 : tree ? 13 : 15) + Y;
      let bfx = (tree ? X - 11.4 : rockV ? X - 12 : X - 11) + ab;
      let bfy = (tree ? 17 : rockV ? 27.4 : 25) + Y;
      if (pose === 1) { bfx = X - 8; bfy = 6; }
      if (pose === 2) { bfx = X + 9; bfy = 28; }
      arm(X - (tree ? 6 : 8), shY, bfx, bfy, rockD, false);
      // pha lê / cành sau lưng
      if (!noCrys) {
        const big = ice ? 9 : rockV ? 6.4 : kingC ? 7.6 : 10.5;
        crystal(S, X - 11, 16 + Y, -0.75, 3.6, kingC ? 5.6 : rockV ? 4.4 : 7, crys);
        crystal(S, X - 7.5, 14 + Y, -0.28, 4.2, big, crys);
        if (!rockV) crystal(S, X - 3.5, 13 + Y, 0.12, 3.4, kingC ? 5.6 : 8, crys);
        S.glow.push([X - 7, 7 + Y, 7, crys.col]);
      } else if (coral) {
        const br = S.M().path([X - 6, 15 + Y, X - 8, 9 + Y, X - 7, 4 + Y], 2.2).path([X - 8, 9 + Y, X - 11.6, 6 + Y], 1.8).path([X - 2.6, 13 + Y, X - 2.4, 6 + Y, X - 4, 2.6 + Y], 2).path([X - 2.4, 7 + Y, X + 0.6, 4 + Y], 1.6)
          .ell(X - 7, 3.6 + Y, 1.4, 1.4).ell(X - 11.8, 5.8 + Y, 1.3, 1.3).ell(X - 4.2, 2.4 + Y, 1.3, 1.3).ell(X + 0.8, 3.8 + Y, 1.2, 1.2);
        S.fill(br, P.a, { sh: 'edge' });
        for (const [x, y] of [[-7, 3.4], [-11.8, 5.6], [-4.2, 2.2], [0.8, 3.6]]) S.px(R(X + x), R(y + Y), P.a.hi);
      }
      // thân
      let body;
      if (ice) body = S.M().poly([X - 10.6, 12 + Y, X + 10.6, 12 + Y, X + 8.6, 21 + Y, X + 6.4, 28 + Y, X - 6.4, 28 + Y, X - 8.6, 21 + Y]);
      else if (statue) body = S.M().poly([X - 7.4, 10.6 + Y, X + 7.4, 10.6 + Y, X + 9.6, 13 + Y, X + 9.6, 27.6 + Y, X - 9.6, 27.6 + Y, X - 9.6, 13 + Y]);
      else if (tree) body = S.M().poly([X - 6, 7 + Y, X + 6.4, 7 + Y, X + 7.2, 23 + Y, X + 9, 28.6 + Y, X - 9, 28.6 + Y, X - 7.2, 23 + Y]);
      else if (cryst) body = S.M().ell(X, 19.4 + Y, 8.8, 8.8).ell(X + 0.5, 23 + Y, 7.8, 6);
      else if (rockV) body = S.M().ell(X, 21 + Y, 11.4, 8).ell(X + 0.5, 24.4 + Y, 10, 5.2);
      else body = S.M().ell(X, 19.4 + Y, 10.4, 8.8).ell(X + 0.5, 23 + Y, 9, 6);
      if (tree) patFill(S, body, rock, (x, y) => (x % 3 === 0 && (x * 7 + y) % 9 > 1 ? rock.dk : null));
      else if (ice) S.fill(body, rock, { sh: 'facet', fx: X - 1.5 });
      else if (statue) patFill(S, body, rock, null);
      else S.fill(body, rock, { c: [X, 19 + Y, 10.4, 9], lt: 0.55, dk: 0.16 });
      // vết nứt / mảng đá
      if (!tree && !ice && !statue) {
        const cracks = lava
          ? [[X - 6, 13, X - 3, 16.5, X - 4, 20.5, X - 1.5, 23.5], [X + 3, 12.5, X + 5.5, 16.5, X + 4, 20], [X + 6, 21.5, X + 8.5, 25], [X - 8.5, 21, X - 6, 24.5, X - 7, 27], [X - 1, 25, X + 2, 27.5]]
          : [[X - 4, 18, X - 2, 21, X - 3, 24], [X + 4, 21, X + 6, 24, X + 5, 26], [X + 1, 16, X + 3, 18]];
        for (const c of cracks) {
          const m = S.M().path(c.map((q, k) => (k % 2 ? q + Y : q)), 1).and(body);
          S.dm(m, lava ? P.a.lt : rock.dk, 1);
          if (lava) {
            S.px(c[2], c[3] + Y, P.c.hi);
            S.glow.push([c[2], c[3] + Y, 5, P.a.col]);
          }
        }
      }
      if (lava) {
        // lõi dung nham trước ngực
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 2.6, 2.3).and(body), P.a.lt, 1);
        S.dm(S.M().ell(X + 1.5, 18.6 + Y, 1.4, 1.3), P.c.hi, 1);
        S.glow.push([X + 1.5, 18.6 + Y, 9, P.c.col]);
      }
      if (ice) {
        // vân nứt băng sáng chéo ngực
        S.dm(S.M().path([X - 6, 15 + Y, X - 2, 18 + Y, X + 1, 16 + Y], 1).and(body), P.c.hi, 0.9);
        S.dm(S.M().line(X + 3, 20 + Y, X + 5, 24 + Y, 1).and(body), P.c.hi, 0.7);
      }
      if (cryst) {
        // pha lê lớn giữa ngực phát sáng
        crystal(S, X + 1, 25 + Y, 0, 3.6, 7, crys);
        S.glow.push([X + 1, 21 + Y, 6, crys.col]);
      }
      if (rockV) {
        // rêu xanh phủ vai khom
        S.fill(S.M().ell(X - 5, 14 + Y, 4.4, 1.9).ell(X + 4.6, 14.4 + Y, 3, 1.5).and(body), T('#7cb342'), { il: 0, sh: 'edge' });
      }
      if (statue) {
        // gờ vai, đai khắc + ấn vàng phát sáng trước ngực
        S.rc(R(X - 9), R(13 + Y), 19, 1, rock.lt);
        S.fill(S.M().rect(0, R(24 + Y), 34, 2).and(body), rockD, { il: 2, sh: 'edge' });
        S.fill(S.M().ell(X - 6, 12 + Y, 3, 1.3).and(body), T('#7cb342'), { il: 0, sh: 'edge' });
        const g = P.c;
        for (const [x, y] of [[0, 0], [1, 0], [2, 0], [1, -1], [1, 1], [1, 2], [0, 2], [2, 2]]) S.px(X + x, 17 + Y + y, x === 1 && y === 0 ? WHITE : g.hi, 0.95);
        S.glow.push([X + 1, 18 + Y, 6, g.col]);
      }
      if (coral) {
        for (const [x, y] of [[-6, 20], [5, 24], [-2, 25], [3, 15]]) S.fill(S.M().ell(X + x, y + Y, 1.4, 1.1), T('#fff3e0'), { il: 1, lt: 0.4 });
      }
      // đầu
      const hx = X + 2 + (pose === 2 ? 2 : 0);
      const hy = (tree ? 12.6 : rockV ? 12.4 : 9.6) + Y + (pose === 2 ? (tree ? 1 : 2) : 0);
      if (statue) S.fill(S.M().poly([hx - 4, hy - 3, hx - 2.4, hy - 8.4, hx + 0.4, hy - 6, hx + 2.6, hy - 8.6, hx + 4.4, hy - 3]), rockD, { sh: 'facet', fx: hx });
      if (ice) S.fill(S.M().poly([hx - 5.6, hy, hx - 3.6, hy - 4.6, hx + 3.6, hy - 4.6, hx + 5.8, hy, hx + 3.6, hy + 4.2, hx - 3.6, hy + 4.2]), rock, { sh: 'facet', fx: hx - 0.5 });
      else if (statue) {
        S.fill(S.M().poly([hx - 5, hy - 4.4, hx + 5, hy - 4.4, hx + 5.6, hy + 3.8, hx - 5.4, hy + 3.8]), rock, { sh: 'edge', side: 1 });
        S.rc(R(hx - 5), R(hy - 1.6), 10, 1, rock.dk);
      } else if (!tree) {
        S.fill(S.M().ell(hx, hy, rockV ? 5.4 : 5.8, rockV ? 4.4 : 4.8), rock, { lt: 0.5 });
        S.rc(R(hx - 4), R(hy - 1.6), 9, 1, rock.dk);
      }
      // mắt (Mộc Tinh: hốc tối trên thân cây + mắt vàng lục sáng)
      if (tree) for (const ex of [hx - 2, hx + 2]) S.rc(R(ex) - 1, R(hy - 1.6), 4, 3, rock.ol);
      if (bl) { S.rc(R(hx - 2), R(hy), 2, 1, crys.dk); S.rc(R(hx + 2), R(hy), 2, 1, crys.dk); S.eyes.push([hx - 1, hy + 0.5], [hx + 3, hy + 0.5]); }
      else {
        for (const ex of [hx - 2, hx + 2]) {
          S.rc(R(ex), R(hy - 0.6), 2, 2, crys.hi);
          S.px(R(ex) + 1, R(hy - 0.6) + 1, crys.lt);
          if (tree) S.px(R(ex), R(hy - 0.6), WHITE);
          S.eyes.push([ex + 1, hy + 0.4]);
        }
        if (tree) S.glow.push([hx + 1, hy, 4, crys.col]);
      }
      S.rc(R(hx), R(hy + 2.4), 3, 1, rock.ol);
      if (pose === 2) S.rc(R(hx), R(hy + 2.4), 3, 2, rock.ol);
      if (tree) {
        // tán lá dày + hoa hồng to viền tối trên ngọn
        const cn = S.M().ell(X - 3, 5.6 + Y, 5.6, 3.8).ell(X + 2.8, 4.4 + Y, 5.4, 3.8).ell(X + 7, 7 + Y, 3.4, 2.8).ell(X - 7.6, 8 + Y, 3.4, 2.6);
        patFill(S, cn, leaf, (x, y) => ((x * 3 + y * 5) % 11 === 0 ? leaf.dk : null));
        for (const [x, y] of [[-5, 3.4], [0, 2], [5, 4.6], [-1, 6.6], [-8, 7.6]]) {
          S.fill(S.M().ell(X + x, y + Y, 1.5, 1.4), P.c, { il: 1, lt: 0.4 });
          S.px(R(X + x), R(y + Y), '#ffeb3b');
        }
      } else if (coral) {
        S.fill(S.M().path([hx + 1, hy - 4, hx + 1.6, hy - 7.4, hx + 3.6, hy - 9], 1.6).path([hx + 1.4, hy - 6.4, hx - 1, hy - 8.4], 1.4).ell(hx + 3.8, hy - 9.2, 1.1, 1.1).ell(hx - 1.2, hy - 8.6, 1, 1), P.a, { sh: 'edge' });
      } else if (kingC) {
        // vương miện pha lê 5 nhánh đối xứng quanh đỉnh đầu + vành vàng
        for (const [dx, a, l] of [[-4.4, -0.62, 3.4], [4.4, 0.62, 3.4], [-2.2, -0.3, 4.8], [2.2, 0.3, 4.8], [0, 0, 6.4]]) crystal(S, hx + dx, hy - 3.4 + Math.abs(dx) * 0.18, a, 2.4, l, crys);
        S.fill(S.M().ell(hx, hy - 3.6, 5.2, 1.2), T(GOLD), { sh: 'edge', il: 1 });
        S.glow.push([hx, hy - 7, 7, crys.col]);
      } else if (v === 'crystal') {
        crystal(S, hx - 1.4, hy - 3.8, -0.25, 2.4, 4.4, crys);
      } else if (ice) {
        crystal(S, hx - 2.4, hy - 4, -0.35, 2.2, 3.4, P.ice);
        crystal(S, hx + 1.2, hy - 4.4, 0.15, 2.2, 4, P.ice);
      }
      // pha lê vai trước
      if (!noCrys) {
        crystal(S, X + 7.5, (rockV ? 15 : 13) + Y, 0.45, 3, rockV ? 4.6 : 6, crys);
        if (kingC) crystal(S, X + 4, 12 + Y, 0.1, 2.6, 5, crys);
        S.glow.push([X + 9, 9 + Y, 5, crys.col]);
      }
      // tay trước
      let ffx = (tree ? X + 11.6 : rockV ? X + 12 : X + 11) + af;
      let ffy = (tree ? 17.4 : rockV ? 27.6 : 25.5) + Y;
      if (pose === 1) { ffx = X + 6; ffy = 5; }
      if (pose === 2) { ffx = X + 13; ffy = 28.5; }
      arm(X + (tree ? 6 : 8), shY, ffx, ffy, rock, true);
      if (!tree && !coral) S.px(R(ffx - 2), R(ffy - 2), rock.hi);
      if (cryst) crystal(S, ffx + 2.4, ffy - 1.2, 0.9, 2.4, 4, crys);
      if (lava) { S.px(R(ffx + 1), R(ffy - 1), P.c.hi); S.px(R(ffx + 2), R(ffy), P.a.lt); S.px(R(ffx), R(ffy + 1), P.a.lt); S.px(R(ffx + 3), R(ffy - 2), P.a.md); S.glow.push([ffx + 1, ffy, 5, P.a.col]); }
      if (pose === 2) {
        for (const [dx, dy] of [[-3, 3], [4, 2], [-5, 1], [6, 0]]) S.px(R(ffx + dx), R(ffy + dy), '#d8ccb8', 0.8);
      }
      S.head = [hx, tree ? 1 + Y : hy - (statue ? 8.4 : coral ? 10 : kingC ? 10.6 : ice ? 4.6 : 4.8)];
    },
  },

  // ---------------- GHOST: u linh lơ lửng
  ghost: {
    W: 26, H: 28, idle: [0, 1, 2, 3], walk: 4, fps: [5, 7], always: true,
    draw(S, P, an, i, v, bl) {
      let sw = [0, 1, 0, -1][i] || 0;
      let lx = 0;
      let arm = [0, 1, 0, 1][i] || 0;
      let boo = 0;
      if (an === 'atk') { sw = i ? -1 : 1; lx = i ? 2 : -1; arm = i ? -3 : -2; boo = i; }
      const X = 13 + lx;
      // tay sau
      S.fill(S.M().ell(X - 7.4, 15.4 - arm * 0.5, 2.2, 1.6, 1, 0.4), P.a);
      const body = S.M().ell(X, 10.4, 7.6, 7.6).ell(X - 0.4, 15, 7.2, 4.8)
        .ell(X - 2.4 + sw * 0.5, 19.4, 4.8, 3.4).ell(X - 5 + sw, 22.4, 3, 2.2).ell(X - 7.3 + sw * 1.6, 24.4, 1.8, 1.4);
      S.fill(body, P.a, { c: [X, 11, 8.5, 11], lt: 0.6, dk: 0.06 });
      S.fill(S.M().ell(X - 2.5 + sw, 20.5, 3.4, 2).ell(X - 5.4 + sw, 23, 1.8, 1.2).and(body), P.b, { il: 0, sh: 'flat' });
      // ngọn lửa / gai băng trên đầu
      if (v === 'fire') {
        const f = [0, 1, 2, 1][i] || 0;
        S.fill(S.M().poly([X - 5, 6, X - 4 - f * 0.3, 0.6 + f * 0.4, X - 2, 4.4, X - 0.6, -0.2 + (2 - f) * 0.5, X + 1.4, 3.6, X + 3.4, 1 + f * 0.6, X + 5, 6]).and(S.M().rect(0, 0, 26, 7)), P.b, { il: 0, sh: 'v', vt: 0.15, vb: 0.95 });
        S.px(X - 4, 2 + f * 0.4, P.c.hi); S.px(X - 0.5, 1 + (2 - f) * 0.5, P.c.hi);
      } else if (v === 'frost') {
        for (const [dx, h] of [[-4.5, 3], [-1, 4.4], [2.5, 3.4]]) {
          S.fill(S.M().poly([X + dx - 1.4, 4.6, X + dx, 4.6 - h, X + dx + 1.4, 4.6]), P.ice, { sh: 'facet', fx: X + dx + 0.5, il: 1 });
        }
      } else if (v === 'cloud') {
        // đuôi thành mây giông (đáy xanh sẫm) + bướu mây trên đầu + tia sét vàng to
        const cl = S.M().ell(X - 5.4 + sw, 21.6, 3.2, 2.4).ell(X - 1 + sw * 0.5, 22.4, 3.6, 2.6).ell(X + 3.6, 21, 3, 2.2);
        S.fill(cl, P.a, { lt: 0.5, il: 1 });
        S.fill(S.M().rect(0, 23, 26, 3).and(cl), P.b, { il: 0, sh: 'flat' });
        S.fill(S.M().ell(X - 4, 3.6, 2.8, 2.4).ell(X + 2.6, 2.8, 3, 2.6), P.a, { lt: 0.5, il: 2 });
        const g = i % 2;
        const bx = X - 1 + g * 3;
        const bolt = S.M().poly([bx + 1, 23.4, bx + 3.4, 23.4, bx + 1.8, 25.6, bx + 3.4, 25.6, bx - 0.4, 28, bx + 0.8, 25.8, bx - 0.6, 25.8]);
        S.fill(bolt, T('#ffeb3b'), { sh: 'flat', il: 1 });
        S.px(bx + 1, 24, WHITE);
        S.glow.push([bx + 1.4, 25.6, 5, '#ffeb3b']);
        // tia sét nhỏ trên bướu mây: điểm nhấn sáng ở đầu
        S.fill(S.M().poly([X + 0.4, -0.2, X + 2, -0.2, X + 1, 1.6, X + 2.2, 1.6, X - 0.2, 3.6, X + 0.4, 1.8, X - 0.6, 1.8]), T('#ffeb3b'), { sh: 'flat', il: 1 });
      } else if (!v) {
        // khăn tam giác trắng trên trán + ma trơi xanh bay cạnh
        S.fill(S.M().poly([X - 2.6, 4.6, X - 0.4, 1.4, X + 1.8, 4.6]), T('#ffffff'), { sh: 'flat', il: 1 });
        const fy = 6 + [0, -1, -2, -1][i] + (an === 'atk' ? -1 : 0);
        S.fill(S.M().ell(X + 9.6, fy + 2, 1.6, 1.6).poly([X + 8, fy + 2, X + 9.4, fy - 2.6, X + 11.2, fy + 2]), T('#80d8ff'), { lt: 0.45, il: 1 });
        S.glow.push([X + 9.6, fy + 1, 5, '#40c4ff']);
      }
      // sáng lõi
      S.px(X - 4, 6, WHITE, 0.85); S.px(X - 5, 7, WHITE, 0.7); S.px(X - 3, 5, WHITE, 0.55);
      // mặt
      const ex = R(X - 1);
      const ey = 8;
      S.eye(ex, ey, 2, 3, { blink: bl, col: v === 'fire' ? pack(60, 18, 10) : EYE });
      S.eye(ex + 4, ey, 2, 3, { blink: bl, col: v === 'fire' ? pack(60, 18, 10) : EYE });
      if (boo) { S.rc(ex + 1, ey + 4, 3, 3, EYE); S.px(ex + 2, ey + 6, BLUSH); }
      else if (an === 'atk') { S.rc(ex + 2, ey + 4, 2, 2, EYE); }
      else { S.rc(ex + 2, ey + 4, 2, 1 + (i % 2), EYE); }
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 5, ey + 3);
      // tay trước
      S.fill(S.M().ell(X + 7.6, 15.6 + arm * 0.6, 2.4, 1.6, 1, -0.4), P.a);
      S.head = [X + 0.5, 2.8];
    },
  },

  // ---------------- BEAST: sói / chó địa ngục / rồng — chạy 4 chân
  beast: {
    W: 36, H: 24, idle: [0, 1, 2, 1], walk: 4, fps: [3, 11],
    draw(S, P, an, i, v, bl) {
      if (v === 'worm') return drawWorm(S, P, an, i, bl);
      if (v === 'serpent' || v === 'dragonK') return drawSerpent(S, P, an, i, bl, v === 'dragonK');
      const hound = v === 'hound';
      const bone = v === 'bone';
      const dragon = v === 'dragon' || bone;
      const fox9 = v === 'fox9';
      const fox = v === 'fox' || fox9;
      const icy = v === 'ice';
      const king = v === 'wolfK';
      let ph = 0;
      let run = 0;
      let bob = 0;
      let hb = 0;
      let wag = 0;
      let lunge = 0;
      let mouth = 0;
      let pose = 0;
      if (an === 'idle') { wag = [0, 0.25, 0.5][i]; hb = i === 2 ? 1 : 0; }
      else if (an === 'walk') { ph = (i * Math.PI) / 2; run = 1; bob = [0, 1, 0, 1][i]; wag = [0.4, 0.1, -0.2, 0.1][i]; }
      else if (i === 0) { pose = 1; hb = 1; bob = -1; wag = -0.3; }
      else { pose = 2; lunge = 3; mouth = 1; bob = 1; wag = 0.6; }
      const X = 16 + lunge;
      const Y = -bob;
      const leg = (hx, hy, phase, tn, front, near) => {
        let dx = run ? Math.cos(phase) * 3 : 0;
        let lift = run ? Math.max(0, Math.sin(phase)) * 2.2 : 0;
        if (pose === 1) { dx = front ? 1.5 : -1; lift = 0; }
        if (pose === 2) { dx = front ? 4.5 : -4; lift = front ? 2.5 : 0.5; }
        const px = hx + dx;
        const py = 21.3 - lift;
        if (!front && near) S.fill(S.M().ell(hx + 0.4, hy - 0.2, 3, 3.6), tn, { lt: 0.5 });
        S.fill(S.M().line(hx, hy + (front ? 0 : 1.5), px, py - 0.4, bone ? 1.8 : front ? 2.6 : 2.4), tn, { sh: 'edge' });
        S.fill(S.M().ell(px + 0.7, py + 0.4, 2, 1.2), tn, { sh: 'edge' });
      };
      // đuôi
      if (dragon) {
        S.fill(S.M().path([X - 7, 12.4 + Y, X - 11, 11.4 + Y - wag * 2, X - 14, 8.6 + Y - wag * 3], 2.6).path([X - 14, 8.6 + Y - wag * 3, X - 15, 5.6 + Y - wag * 3], 1.6), P.a, { sh: 'edge' });
        const tx = X - 15.2; const ty = 5 + Y - wag * 3;
        S.fill(S.M().poly([tx - 2, ty + 0.8, tx, ty - 2.8, tx + 2, ty + 0.8, tx, ty - 0.2]), P.b, { sh: 'facet', fx: tx + 0.5 });
      } else if (hound) {
        const f = an === 'walk' ? i % 2 : i % 2;
        const tm = S.M().poly([X - 7, 10.5 + Y, X - 11.5, 8 + Y - wag * 3, X - 15, 2.6 + Y - wag * 4 + f, X - 11.6, 6 + Y - wag * 3, X - 12.6, 1.6 + Y - wag * 2 - f, X - 9, 6 + Y - wag, X - 6, 13 + Y]);
        S.fill(tm, P.b, { sh: 'v', il: 1, vt: 0.2, vb: 0.8 });
        S.dm(S.M().poly([X - 8, 10.5 + Y, X - 11.2, 7.6 + Y - wag * 3, X - 12.4, 4 + Y - wag * 3, X - 9.4, 7.6 + Y - wag, X - 7, 12 + Y]).and(tm), P.c.md, 1);
        S.dm(S.M().poly([X - 8.4, 10.6 + Y, X - 10.2, 8.4 + Y - wag * 2, X - 8.6, 8.6 + Y - wag]).and(tm), P.c.hi, 1);
        S.glow.push([X - 11, 7 + Y, 6, P.c.col]);
      } else if (fox9) {
        // đuôi xòe quạt rộng, mỗi đuôi tách rời có viền tối và chóp trắng; đếm được ở zoom nhỏ
        const order = [0, 4, 1, 3, 2];
        for (const k of order) {
          const a = -2.25 + k * 0.55 + wag * 0.3;
          const bx = X - 6.6;
          const by = 11.6 + Y;
          const cx = bx + Math.sin(a) * 6;
          const cy = by - Math.cos(a) * 6;
          const tm = S.M().ell(cx, cy, 1.7, 5.2, 1, a);
          S.fill(tm, k % 2 ? P.aD : P.a, { lt: 0.5, il: 1 });
          S.fill(S.M().ell(bx + Math.sin(a) * 10, by - Math.cos(a) * 10, 1.7, 2.2, 1, a).and(tm), P.b, { il: 0, lt: 0.5 });
        }
        S.glow.push([X - 12, 6 + Y, 6, P.c.col]);
      } else if (fox) {
        const tail = S.M().ell(X - 11.2, 8.4 + Y - wag * 2, 4, 7, 1, -1.1 + wag);
        S.fill(tail, P.a, { lt: 0.5 });
        S.fill(S.M().ell(X - 15, 5 + Y - wag * 3.6, 3, 3.2, 1, -1.1 + wag).and(tail), P.b, { il: 0, lt: 0.5 });
        S.glow.push([X - 16, 3 + Y - wag * 3, 5, P.c.col]);
      } else {
        const tail = S.M().ell(X - 10.6, 9.6 + Y - wag * 2, 3.3, 5.8, 1, -1.05 + wag);
        S.fill(tail, P.a, { lt: 0.5 });
        S.fill(S.M().ell(X - 14, 7.2 + Y - wag * 3.6, 2.2, 2.6, 1, -1.05 + wag).and(tail), P.b2, { il: 0, sh: 'flat' });
      }
      // chân phía xa
      leg(X - 6.6, 15 + Y, ph + Math.PI + 0.6, P.aD, false, false);
      leg(X + 5.4, 15 + Y, ph + 0.6, P.aD, true, false);
      // cánh xương Cốt Long: 3 ngón xương dựng cao, màng rách tối mờ
      if (bone) {
        const wf = an === 'walk' ? [0, 1, 2, 1][i] : pose ? 2 : i === 1 ? 1 : 0;
        const wy = [0, 1.2, 2.6][wf];
        const sx = X - 1; const sy = 8.6 + Y;
        const tips = [[X - 3.6, 0.6 + wy * 0.5], [X - 9.6, 0.8 + wy], [X - 14.4, 5.4 + wy]];
        const mem = S.M().poly([sx, sy, ...tips[0], X - 6.4, 4.2 + wy, ...tips[1], X - 11.2, 5.8 + wy, ...tips[2], X - 10.4, 9.4 + Y, X - 6, 9.6 + Y]);
        S.fill(mem, T('#8fa3ad', 210), { sh: 'v', vt: 0.25, vb: 0.75, il: 0 });
        const fb = S.M();
        for (const [tx, ty] of tips) fb.line(sx, sy, tx, ty, 2);
        S.fill(fb, P.bone, { sh: 'flat' });
        for (const [tx, ty] of tips) S.px(tx, ty, WHITE);
      } else if (dragon) {
        const wf = an === 'walk' ? [0, 1, 2, 1][i] : pose ? 2 : i === 1 ? 1 : 0;
        const wy = [-1, 1.5, 4][wf];
        const wm = S.M().poly([X - 3, 9 + Y, X - 6, 1 + Y + wy, X - 11, -0.4 + Y + wy * 1.4, X - 9.6, 3.4 + Y + wy, X - 7.4, 3.6 + Y + wy * 0.8, X - 6.6, 6 + Y + wy * 0.5, X - 4.6, 6.4 + Y + wy * 0.3, X + 1, 10 + Y]);
        S.fill(wm, P.b, { sh: 'edge', il: 1 });
        S.dm(S.M().path([X - 3, 9 + Y, X - 6, 1.4 + Y + wy, X - 10.4, 0.2 + Y + wy * 1.4], 1), P.b.dk, 1);
      }
      // thân
      const body = S.M().ell(X - 1.4, 12.8 + Y, 9, 5).ell(X + 4, 12.4 + Y, 5.2, 4.8);
      S.fill(body, P.a, { c: [X - 1, 12.4 + Y, 9.4, 5.4], lt: 0.58, dk: 0.12 });
      S.fill(S.M().ell(X, 17.6 + Y, 8, 2.6).and(body), dragon ? P.b : P.b2, { il: 0, sh: 'flat' });
      if (bone) {
        for (let k = 0; k < 4; k++) S.fill(S.M().rect(R(X - 6 + k * 2.6), R(10.4 + Y), 1, 6).and(body), T('#2c2a36'), { il: 0, sh: 'flat' });
      }
      if (icy) {
        for (const [dx, a, l] of [[-6, -0.5, 3.6], [-3, -0.2, 5], [0.4, 0.15, 4.2], [3.4, 0.4, 3]]) crystal(S, X + dx, 9 + Y, a, 2.2, l, P.ice);
        S.glow.push([X - 1, 5 + Y, 6, P.b.col]);
      }
      if (dragon && !bone) {
        for (let k = 0; k < 4; k++) {
          const sx = X - 7 + k * 3.4;
          S.fill(S.M().poly([sx - 1.4, 8.4 + Y, sx + 0.2, 5 + Y + (k === 0 ? 1 : 0), sx + 1.4, 8.4 + Y]), P.b, { sh: 'facet', fx: sx + 0.5 });
        }
        for (const sx of [-4, -1, 2, 5]) S.px(X + sx, 17 + Y, P.b.lt);
      }
      // chân phía gần
      leg(X - 5.4, 15.4 + Y, ph + Math.PI, P.a, false, true);
      leg(X + 6.6, 15.4 + Y, ph, P.a, true, true);
      // bờm / ngực
      if (hound) {
        const mf = i % 2;
        const mane = S.M().poly([X + 1.6, 15 + Y, X + 0.6, 8.6 + Y, X + 1.4, 3.6 + Y + mf, X + 4, 7 + Y, X + 5.4, 2 + Y + (1 - mf), X + 7, 6.4 + Y, X + 9.4, 3.8 + Y + mf, X + 9.6, 14.6 + Y]);
        S.fill(mane, P.b, { sh: 'v', il: 1, vt: 0.2, vb: 0.8 });
        S.dm(S.M().poly([X + 2.6, 14 + Y, X + 2.4, 8 + Y, X + 4, 9.4 + Y, X + 5.6, 5.6 + Y + (1 - mf), X + 7, 9.4 + Y, X + 8.4, 7.4 + Y, X + 8.4, 14 + Y]).and(mane), P.c.md, 1);
        S.dm(S.M().poly([X + 4, 13 + Y, X + 4.6, 10 + Y, X + 5.6, 8.6 + Y, X + 6.6, 11 + Y, X + 7, 13 + Y]).and(mane), P.c.hi, 1);
        S.glow.push([X + 5, 8 + Y, 7, P.c.col]);
      } else if (!dragon) {
        const ruff = king
          ? S.M().ell(X + 6.6, 12.4 + Y, 5, 5.6).poly([X + 2.4, 14 + Y, X + 3.4, 19.4 + Y, X + 5.4, 16.6 + Y, X + 7, 20 + Y, X + 8.6, 16.6 + Y, X + 10.4, 19 + Y, X + 11, 14 + Y])
          : S.M().ell(X + 7.4, 13.6 + Y, 3.8, 4.2).poly([X + 4.6, 16 + Y, X + 5.6, 19 + Y, X + 7, 16.6 + Y, X + 8.4, 18.6 + Y, X + 9.6, 16 + Y]);
        S.fill(ruff, P.b2, { il: 2, lt: 0.5 });
        if (king) {
          // vòng cổ sắt gai
          S.fill(S.M().ell(X + 7.6, 13.6 + Y, 3.6, 1.3, 1, 1.25), P.iron, { lt: 0.45 });
          for (const [dx, dy] of [[-1.2, -1.6], [0, 1.2], [1.2, 3.8]]) crystal(S, X + 7.6 + dx, 13.6 + Y + dy, -1.4, 1.4, 2.2, T('#d7dbe3'));
        }
      }
      // đầu
      const hx = X + 10.2 + (pose === 2 ? 1 : 0) + (bone ? 0.6 : 0);
      const hy = 8.4 + Y + hb - (bone ? 2.2 : 0);
      // cổ xương dài nâng đầu sọ
      if (bone) S.fill(S.M().path([X + 5, 11 + Y, X + 7.4, 8.6 + Y, hx - 1.6, hy + 1.4], 2.6), P.a, { sh: 'edge' });
      if (dragon) {
        S.fill(S.M().path([hx - 1.6, hy - 3.4, hx - 4.4, hy - 5.8, hx - 7.6, hy - 6.2], 1.8), P.bone, { sh: 'edge' });
        S.fill(S.M().path([hx + 0.8, hy - 4, hx - 1.4, hy - 7, hx - 4.2, hy - 8.4], 1.8), P.bone, { sh: 'edge' });
      } else {
        S.fill(S.M().poly([hx - 4.2, hy - 0.6, hx - 3.4, hy - 8, hx - 0.4, hy - 3.2]), P.aD, { sh: 'facet', fx: hx - 3.2 });
      }
      // rồng: sọ nhỏ dẹt, mõm dài nhọn (khác hẳn đầu tròn của sói)
      const head = dragon ? S.M().ell(hx, hy + 0.4, 4.4, 3.8) : S.M().ell(hx, hy, 5.4, 4.8);
      S.fill(head, P.a, { lt: 0.5 });
      // mõm
      const sny = hy + 1.8;
      const snout = dragon ? S.M().ell(hx + 4.8, sny, 4.6, mouth ? 1.4 : 1.9).poly([hx + 7.6, sny - 1.4, hx + 10, sny - 0.2, hx + 7.6, sny + 1.2]) : S.M().ell(hx + 4.6, sny, 3.3, mouth ? 1.5 : 2.1);
      S.fill(snout, dragon ? P.a : P.b2, { il: 2, lt: 0.5 });
      if (mouth) {
        S.fill(S.M().ell(hx + 3.8, sny + 3, 2.8, 1.2, 1, 0.35), dragon ? P.a : P.b2, { il: 1, sh: 'edge' });
        S.rc(R(hx + 2.6), R(sny + 1.4), 5, 1, EYE);
        S.px(R(hx + 6.4), R(sny + 1.4), WHITE); S.px(R(hx + 4), R(sny + 1.4), WHITE);
      } else {
        S.rc(R(hx + 3.4), R(sny + 1.4), 3, 1, P.a.ol);
      }
      S.rc(R(hx + 7), R(sny - 1.2), 2, 2, EYE);
      S.px(R(hx + 7), R(sny - 1.2), pack(120, 110, 140));
      if (!dragon) {
        S.fill(S.M().poly([hx - 1.2, hy - 3.2, hx + 0.8, hy - 8.8, hx + 3, hy - 2.6]), P.a, { sh: 'facet', fx: hx + 0.8 });
        S.fill(S.M().poly([hx - 0.2, hy - 3.4, hx + 0.9, hy - 6.8, hx + 1.9, hy - 3.2]), hound ? P.c : fox ? P.b : P.ear, { il: 0, sh: 'flat' });
        if (fox) S.fill(S.M().poly([hx + 0.2, hy - 7, hx + 0.8, hy - 8.8, hx + 1.6, hy - 6.8]), T('#3a2418'), { il: 0, sh: 'flat' });
      }
      // mắt
      const ex = R(hx + 0.4);
      const ey = R(hy - 2);
      const ec = hound || dragon ? P.c.dk : EYE;
      if (bl) { S.rc(ex, ey + 2, 2, 1, EYE); S.eyes.push([ex + 1, ey + 1.5]); }
      else {
        S.eye(ex, ey, 2, 3, { col: ec, iris: hound || dragon ? P.c.hi : EYE2 });
        S.px(ex - 1, ey - 1, P.a.ol); S.px(ex, ey - 1, P.a.ol, 0.5);
      }
      if (fox) {
        S.px(ex + 2, ey + 1, P.c.md); S.px(ex + 3, ey + 2, P.c.md); S.px(ex - 1, ey + 3, P.c.md, 0.8);
        S.px(R(hx - 1.6), R(hy - 3.4), P.c.md); S.px(R(hx - 1.6), R(hy - 2.4), P.c.lt);
      } else if (king) {
        S.px(ex - 1, ey - 1, P.c.md); S.px(ex, ey, P.c.md); S.px(ex + 1, ey + 1, P.c.md); S.px(ex + 2, ey + 2, P.c.md);
      } else if (!bone) S.blush(ex + 2, ey + 3, 2);
      if (icy && !pose) for (const [dx, dy] of [[9, 0], [10, -1], [11, 0], [12, -1]]) S.px(R(hx + dx), R(sny + dy), WHITE, 0.45);
      if (bone) {
        // hốc mắt sọ tối quanh đốm lửa hồn + hàm răng
        S.px(ex - 1, ey, P.a.ol); S.px(ex + 2, ey, P.a.ol); S.px(ex - 1, ey + 2, P.a.ol, 0.6);
        if (!mouth) for (let k = 0; k < 5; k += 2) S.px(R(hx + 4 + k), R(sny + 1.4), WHITE);
        S.glow.push([ex + 1, ey + 1, 4, P.c.col]);
      }
      S.head = [hx - 0.5, hy - 4.8];
    },
  },

  // ---------------- NGƯỜI: mỗi loài một bộ trang phục riêng (xem HUM)
  humanoid: {
    W: 40, H: 38, idle: [0, 1, 2, 1], walk: 4, fps: [3, 8],
    draw: (S, P, an, i, v, bl) => drawHumanoid(S, P, an, i, v, bl),
  },

  // ---------------- NGƯỜI TUYẾT: khăn quàng + mũ len
  snowman: {
    W: 28, H: 30, idle: [0, 1, 2, 1], walk: 4, fps: [3, 7],
    draw(S, P, an, i, v, bl) {
      let sq = 0; let b1 = 0; let b2 = 0; let aw = 0; let fl = 0; let pose = 0;
      if (an === 'idle') { b2 = [0, 0, 1][i]; aw = [0, 1, 2][i]; fl = i; }
      else if (an === 'walk') { [sq, b1, b2] = [[1, 1, 1], [0, 0, 0], [0, -1, -1], [0, 0, 0]][i]; aw = [0, 2, 3, 1][i]; fl = i; }
      else pose = i + 1;
      const X = 14;
      const twig = P.twig;
      const hx = X + 0.5;
      const hy = 10.4 + b2;
      // tay sau
      const bax = X - 10.4; const bay = 14 + aw * 0.5;
      S.fill(S.M().line(X - 5, 19 + b1, bax, bay, 1.2).line(bax + 1.6, bay + 1.2, bax - 0.6, bay - 1.8, 1).line(bax + 1, bay + 0.6, bax - 1.8, bay + 0.8, 1), twig, { sh: 'flat' });
      // khăn bay phía sau
      const sf = [0, 1, 2, 1][fl % 4];
      const sy = 15.4 + b1 * 0.5 + b2 * 0.5;
      S.fill(S.M().poly([X - 3.4, sy - 0.6, X - 7.6 - sf * 0.5, sy + 3.6 + sf * 0.3, X - 9.4 - sf * 0.7, sy + 6.6, X - 6.2, sy + 6.8, X - 5.2, sy + 3.6, X - 1.6, sy + 1.2]), P.c, { sh: 'edge' });
      for (let k = 0; k < 3; k++) S.px(R(X - 9.2 - sf * 0.7) + k, R(sy + 7.4), P.c.md);
      // thân dưới
      const bot = S.M().ell(X, 25 + sq * 0.5, 8.2 + sq * 0.7, 5 - sq * 0.4).rows(0, 28);
      S.fill(bot, P.a, { c: [X, 24.6, 8.2, 5.4], lt: 0.5, dk: 0.2 });
      // thân giữa
      const mid = S.M().ell(X, 19.8 + b1, 6.6, 4.5);
      S.fill(mid, P.a, { lt: 0.5, dk: 0.2 });
      for (const by of [18.5, 21.5]) S.rc(X + 1, R(by + b1), 2, 1, EYE);
      S.px(X + 1, R(18.5 + b1) - 1, WHITE, 0.5);
      // đầu
      S.fill(S.M().ell(hx, hy, 6, 5.2), P.a, { lt: 0.5, dk: 0.2 });
      // khăn quàng
      const sc = S.M().ell(hx - 0.3, sy, 6.4, 1.9);
      S.fill(sc, P.c, { sh: 'v', vt: 0.4, vb: 0.75 });
      for (const sx of [-4, -1, 2, 5]) S.px(R(hx + sx), R(sy), P.c.lt);
      // mũ len + quả bông
      const hat = S.M().ell(hx, hy - 3.8, 5.8, 4.8).rows(0, R(hy - 5.4));
      S.fill(hat, P.hat, { c: [hx, hy - 3.8, 5.8, 4.8], lt: 0.5 });
      for (const sx of [-3, 0, 3]) S.px(R(hx + sx), R(hy - 7), P.hat.dk);
      S.fill(S.M().rect(R(hx - 6), R(hy - 5.4), 12, 2), P.knit, { sh: 'v', vt: 0.5, vb: 0.5 });
      for (let k = 1; k < 12; k += 2) S.px(R(hx - 6) + k, R(hy - 4.4), P.knit.dk);
      S.fill(S.M().ell(hx - 2.8 - sf * 0.3, hy - 8.6 + (fl % 2) * 0.3, 2.1, 1.9), P.knit, { lt: 0.4 });
      // mặt
      const ex = R(hx - 0.4);
      const ey = R(hy - 2.4);
      S.eye(ex, ey, 2, 3, { blink: bl });
      S.eye(ex + 4, ey, 2, 3, { blink: bl });
      S.blush(ex - 2, ey + 3);
      S.blush(ex + 6, ey + 3, 1);
      // mũi cà rốt
      S.fill(S.M().poly([hx + 2.4, hy + 0.4, hx + 7.6, hy + 1.6, hx + 2.4, hy + 2.6]), P.carrot, { sh: 'edge' });
      S.px(R(hx + 4.4), R(hy + 1), P.carrot.dk);
      // miệng than
      if (pose) { S.rc(ex + 1, R(hy + 3), 3, 2, EYE); }
      else { S.px(ex, R(hy + 3), EYE); S.px(ex + 1, R(hy + 3.6), EYE); S.px(ex + 2, R(hy + 3.6), EYE); S.px(ex + 3, R(hy + 3), EYE); }
      // tay trước + quả cầu tuyết
      let fax = X + 10.4; let fay = 14 - aw * 0.5;
      if (pose === 1) { fax = X + 4; fay = 4.6; }
      if (pose === 2) { fax = X + 12; fay = 16.6; }
      S.fill(S.M().line(X + 5, 19 + b1, fax, fay, 1.2).line(fax - 1.4, fay + 1.4, fax + 1.6, fay - 0.4, 1).line(fax - 0.6, fay + 0.4, fax + 0.4, fay - 2, 1), twig, { sh: 'flat' });
      if (pose) {
        const bx = pose === 1 ? fax - 1.4 : fax + 1.4;
        const by = pose === 1 ? fay - 1.8 : fay - 1.6;
        S.fill(S.M().ell(bx, by, 2.2, 2.2), P.a, { lt: 0.5 });
      }
      S.head = [hx, hy - 8];
    },
  },
};
