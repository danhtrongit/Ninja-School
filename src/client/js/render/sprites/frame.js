// Tư thế theo khung hoạt ảnh, dựng khung vào bộ đệm, xoay khi gục, viền tối, nướng ra canvas, quầng, nhuộm, lật.
import { FW, FH, OX, OY, BUF, TAG, TMP, clr, px, stamp } from './pixbuf.js';
import { drawHead, drawTorso, drawCape, drawRobe, drawLeg, drawArm, drawShoulderPad, drawBackPad, drawScarfNeck, drawScarfTail } from './body.js';
import { drawWeapon, drawBackGear } from './weapons.js';
import { drawCloak, drawCloakFront, drawCostume } from './fashion.js';

// ================= TƯ THẾ =================
export const NFRAMES = { idle: 4, walk: 6, jump: 2, attack: 3, dead: 1 };
const WALK_F = [[2, 0], [1, 0], [0, 0], [-2, 0], [-1, 1], [0, 2]];
const WALK_B = [[-2, 0], [-1, 1], [0, 2], [2, 0], [1, 0], [0, 0]];
const WALK_BY = [0, 0, -1, 0, 0, -1];

// ride: đang cưỡi thú. Chân trước gập buông bên sườn thú (chân sau khuất sau thân thú), tay giữ như đứng yên;
// thú chạy thì khăn, áo choàng vẫn bay theo
function getPose(anim, f, sp, ride) {
  if (ride && anim !== 'attack' && anim !== 'dead') {
    const p = getPose('idle', 0, sp, false);
    p.ride = true;
    p.lf = [1, 0];
    if (anim === 'walk' || anim === 'jump') {
      p.moving = true;
      p.scarf = anim === 'jump' ? 'jump' : 'move';
      p.flap = (f >> 1) & 1;
    } else {
      p.flap = f >> 1;
    }
    return p;
  }
  const p = {
    by: 0, ux: 0, lb: [0, 0], lf: [0, 0], hb: [-5, -9], hf: [4, -9], wstate: 'hold', flap: f & 1, moving: false, scarf: 'idle', eyes: null,
  };
  const ranged = sp.weapon === 'bow' || sp.weapon === 'fan' || sp.weapon === 'shuriken';
  if (sp.weapon === 'bow') p.hf = [5, -10];
  if (sp.weapon === 'fan') p.hf = [5, -10];
  if (sp.weapon === 'shuriken') p.hf = [5, -10];
  if (sp.weapon === 'sword') p.hf = [4, -10];
  switch (anim) {
    case 'idle':
      p.by = f >= 2 ? 1 : 0;
      p.flap = f >> 1;
      break;
    case 'walk': {
      p.moving = true;
      p.scarf = 'move';
      p.flap = (f >> 1) & 1;
      p.lf = WALK_F[f];
      p.lb = WALK_B[f];
      p.by = WALK_BY[f];
      p.hf = [p.hf[0] - Math.round(WALK_F[f][0] * 0.7), p.hf[1] - (WALK_F[f][0] < 0 ? 1 : 0)];
      p.hb = [-5 - Math.round(WALK_B[f][0] * 0.7), -9 - (WALK_B[f][0] < 0 ? 1 : 0)];
      break;
    }
    case 'jump':
      // co chân: khung sau co sâu hơn, tay dang thăng bằng
      p.moving = true;
      p.scarf = 'jump';
      p.lf = f ? [2, 4] : [2, 3];
      p.lb = f ? [-2, 2] : [-1, 1];
      p.by = -1;
      p.hf = f ? [5, -12] : [5, -13];
      p.hb = f ? [-7, -13] : [-7, -12];
      p.wstate = 'jump';
      break;
    case 'attack':
      p.moving = f > 0;
      p.scarf = f > 0 ? 'move' : 'idle';
      p.lf = [2, 0];
      p.lb = [-2, 0];
      if (!ranged) {
        if (f === 0) { p.hf = [-4, -12]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; p.lf = [3, 0]; p.lb = [-3, 0]; }
        if (f === 1) { p.hf = [8, -14]; p.hb = [-7, -12]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -10]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; p.by = 1; }
      } else if (sp.weapon === 'bow') {
        p.ux = 0;
        if (f === 0) { p.hf = [8, -14]; p.hb = [3, -14]; p.wstate = 'raise'; }
        if (f >= 1) { p.hf = [8, -14]; p.hb = [-1, -13]; p.wstate = 'strike'; }
      } else if (sp.weapon === 'fan') {
        if (f === 0) { p.hf = [-5, -13]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; }
        if (f === 1) { p.hf = [8, -14]; p.hb = [-7, -12]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -11]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; }
      } else {
        if (f === 0) { p.hf = [-5, -13]; p.hb = [-6, -10]; p.wstate = 'raise'; p.ux = -1; }
        if (f === 1) { p.hf = [8, -15]; p.hb = [-7, -11]; p.wstate = 'strike'; p.ux = 1; }
        if (f === 2) { p.hf = [7, -12]; p.hb = [-6, -10]; p.wstate = 'follow'; p.ux = 1; }
      }
      if (sp.mon) p.eyes = 'angry';
      if (ride) {
        p.ride = true;
        p.lf = [1, 0];
        p.by = 0;
      }
      break;
    case 'dead':
      p.eyes = 'dead';
      p.hf = [5, -11];
      p.hb = [-6, -11];
      break;
    default:
  }
  return p;
}

// ================= DỰNG MỘT KHUNG =================
export function buildFrame(sp, P, anim, f, ride) {
  clr();
  const p = getPose(anim, f, sp, ride);
  if (sp.npc) p.wstate = 'none';
  const dead = anim === 'dead';
  const ux = p.ux;
  const by = p.by;
  const hx = ux + (sp.hunch || 0);
  const hy = by + (sp.hunch ? 1 : 0);
  // 1. áo choàng thời trang, đồ sau lưng, tóc sau, khăn
  if (sp.ck && !dead) drawCloak(P, sp, ux, by, p);
  if (!dead && !sp.npc) drawBackGear(P, sp, ux, by);
  if (sp.backLayer) sp.backLayer(P, sp, ux, by, p, f);
  drawHairBack(P, sp, hx, hy, p, f);
  if (!sp.npc && !dead && sp.at >= 10 && !sp.ck) drawCape(P, sp, ux, by, p, f);
  if (!sp.noScarf && !dead) drawScarfTail(P, sp, ux, by, p.scarf, p.flap);
  // 2. tay sau
  const bsx = ux - 4;
  const bsy = by - 14;
  if (!sp.hideBackArm) drawArm(P, sp, bsx, bsy, ux + p.hb[0], by + p.hb[1], false);
  // 3. chân
  if (sp.robe) drawRobe(P, sp, ux, by, f);
  else if (p.ride) drawLeg(P, sp, 1, p.lf[0], p.lf[1], false);
  else {
    drawLeg(P, sp, -3, p.lb[0], p.lb[1], true);
    drawLeg(P, sp, 1, p.lf[0], p.lf[1], false);
  }
  // 4. thân + khăn cổ
  if (sp.at >= 9 && !sp.npc) drawBackPad(P, sp, ux, by);
  drawTorso(P, sp, ux, by, p);
  if (sp.cs) drawCostume(P, sp, ux, by);
  if (sp.overTorso) sp.overTorso(P, sp, ux, by, p, f);
  if (!sp.noScarf) drawScarfNeck(P, sp, ux, by);
  if (sp.ck && !dead) drawCloakFront(P, sp, ux, by);
  // 5. đầu
  drawHead(P, sp, hx, hy, p);
  // 6. tay trước + vũ khí
  const fsx = ux + 3;
  const fsy = by - 14;
  const fhx = ux + p.hf[0];
  const fhy = by + p.hf[1];
  if (sp.frontProp) {
    sp.frontProp(P, sp, ux, by, p, f);
  } else {
    if (sp.weapon === 'bow' && anim === 'attack') {
      // tay kéo dây vẽ sau cung
      drawWeapon(P, sp, sp.weapon, p.wstate, fhx, fhy);
      drawArm(P, sp, fsx, fsy, fhx, fhy, true);
    } else {
      drawArm(P, sp, fsx, fsy, fhx, fhy, true);
      if (!dead && p.wstate !== 'none') drawWeapon(P, sp, sp.weapon, p.wstate, fhx, fhy);
      // nắm tay phủ lên chuôi
      if (!dead && sp.weapon && sp.weapon !== 'bow' && sp.weapon !== 'fan') {
        px(fhx, fhy, P.s); px(fhx + 1, fhy, P.s); px(fhx, fhy + 1, P.S); px(fhx + 1, fhy + 1, P.S);
      }
    }
  }
  drawShoulderPad(P, sp, ux, by);
  return dead;
}

function drawHairBack(P, sp, hx, hy, p, f) {
  const H = P.H;
  const J = P.J;
  const G = P.G;
  if (sp.headGear && !sp.hairBack) return;
  const style = sp.hairBack || sp.hair;
  if (style === 'long') {
    // tóc dài sau lưng
    const sway = p.moving ? -1 : 0;
    for (let y = -22; y <= -10; y++) {
      const k = y > -14 ? sway : 0;
      const w = y < -19 ? 4 : y < -12 ? 4 : 3;
      for (let i = 0; i < w; i++) {
        const x = hx - 8 + i + k - (y > -16 ? 1 : 0);
        px(x, hy + y, i === 0 ? G : i === w - 1 ? H : J);
      }
    }
    px(hx - 9 + sway, hy - 10, G); px(hx - 7 + sway, hy - 9, J);
  } else if (style === 'pony') {
    // đuôi ngựa buộc cao, đung đưa
    const ph = p.moving ? (f & 1) : (f >> 1);
    const pts = [[-8, -26], [-9, -25], [-10, -24], [-10, -23], [-11, -22], [-11, -21], [-11, -20], [-11, -19], [-10, -18]];
    pts.forEach(([x, y], i) => {
      let xx = x;
      let yy = y;
      if (p.moving) { xx -= Math.round(i * 0.4); yy -= Math.round(i * 0.45) - (i > 4 ? ph : 0); }
      else if (i > 4) xx += ph;
      px(hx + xx, hy + yy, G); px(hx + xx + 1, hy + yy, J); px(hx + xx + 2, hy + yy, i < 5 ? H : J);
    });
    px(hx - 7, hy - 26, P.a); px(hx - 7, hy - 25, P.A);
  } else if (style === 'wild') {
    // đuôi tóc ngắn buộc thấp
    const ph = p.moving ? 1 : 0;
    stamp(hx - 11 - ph, hy - 21 + ph, ['..JH', '.GJH', 'GJJ.', 'GJ..', 'G...'], P);
  }
}

// Xoay khung nằm (chết): đầu sang trái, mặt ngửa lên
export function rotateDead() {
  TMP.set(BUF);
  BUF.fill(-1);
  TAG.fill(0);
  for (let gy = 0; gy < FH; gy++) {
    for (let gx = 0; gx < FW; gx++) {
      const c = TMP[gy * FW + gx];
      if (c < 0) continue;
      const x = gx - OX;
      const y = gy - OY;
      const nx = y + 14;
      const ny = -x - 8;
      const ngx = OX + nx;
      const ngy = OY + ny;
      if (ngx < 0 || ngy < 0 || ngx >= FW || ngy >= FH) continue;
      BUF[ngy * FW + ngx] = c;
    }
  }
  // tóc dài/đuôi ngựa có thể thòng xuống dưới mặt đất: nâng cả khung cho đáy nằm ở y = -1
  let maxY = -1;
  for (let i = BUF.length - 1; i >= 0; i--) if (BUF[i] >= 0) { maxY = (i / FW) | 0; break; }
  const lift = maxY - (OY - 1);
  if (lift > 0) {
    BUF.copyWithin(0, lift * FW);
    BUF.fill(-1, BUF.length - lift * FW);
  }
}

// ================= NƯỚNG KHUNG (viền + canvas) =================
const OUT = new Int32Array(FW * FH);
const OFL = new Uint8Array(FW * FH);
function outlineOf(c) {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return (((r * 0.26 + 14) | 0) << 16) | (((g * 0.22 + 8) | 0) << 8) | ((b * 0.26 + 22) | 0);
}

export function bake(flash, wantGlow, wantAura) {
  OUT.set(BUF);
  OFL.fill(0);
  let minX = FW;
  let minY = FH;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const i = y * FW + x;
      let c = BUF[i];
      if (c < 0) {
        let nc = -1;
        if (x > 0 && BUF[i - 1] >= 0) nc = BUF[i - 1];
        else if (x < FW - 1 && BUF[i + 1] >= 0) nc = BUF[i + 1];
        else if (y < FH - 1 && BUF[i + FW] >= 0) nc = BUF[i + FW];
        else if (y > 0 && BUF[i - FW] >= 0) nc = BUF[i - FW];
        if (nc < 0) continue;
        c = outlineOf(nc);
        OUT[i] = c;
        OFL[i] = 1;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) { minX = OX; maxX = OX; minY = OY; maxY = OY; }
  const pad = wantAura ? 3 : wantGlow ? 2 : 0;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(FW - 1, maxX + pad); maxY = Math.min(FH - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  const wpx = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y + minY) * FW + (x + minX);
      const c = OUT[i];
      if (c < 0) continue;
      const k = (y * w + x) * 4;
      if (flash) {
        if (OFL[i]) { d[k] = 255; d[k + 1] = 214; d[k + 2] = 226; } else { d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; }
      } else {
        d[k] = (c >> 16) & 255; d[k + 1] = (c >> 8) & 255; d[k + 2] = c & 255;
      }
      d[k + 3] = 255;
      if (TAG[i] && !OFL[i]) wpx.push(x + minX - OX, y + minY - OY);
    }
  }
  g.putImageData(img, 0, 0);
  const entry = { cv, ox: OX - minX, oy: OY - minY, w, h, wpx, flip: null, glow: null, aura: null };
  if (wantGlow && wpx.length) entry.glow = haloCanvas(minX, minY, w, h, (i) => TAG[i] && BUF[i] >= 0, 2);
  if (wantAura) entry.aura = haloCanvas(minX, minY, w, h, (i) => OUT[i] >= 0, 3);
  return entry;
}

// Quầng sáng: giãn mặt nạ theo khoảng cách, alpha giảm dần (màu trắng, tô màu khi vẽ)
function haloCanvas(minX, minY, w, h, inMask, R) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = 99;
      for (let j = -R; j <= R; j++) {
        const yy = y + minY + j;
        if (yy < 0 || yy >= FH) continue;
        for (let i = -R; i <= R; i++) {
          const xx = x + minX + i;
          if (xx < 0 || xx >= FW) continue;
          if (inMask(yy * FW + xx)) {
            const dist = Math.max(Math.abs(i), Math.abs(j)) + (Math.abs(i) + Math.abs(j)) * 0.15;
            if (dist < best) best = dist;
          }
        }
      }
      if (best > R + 0.5) continue;
      const k = (y * w + x) * 4;
      d[k] = 255; d[k + 1] = 255; d[k + 2] = 255;
      d[k + 3] = Math.round(255 * Math.max(0, 1 - best / (R + 1)) * (best < 0.5 ? 0.5 : 1));
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

export function tinted(src, col) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col;
  g.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

export function flipCanvas(src) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return cv;
}
