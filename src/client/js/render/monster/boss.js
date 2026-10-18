// Lớp phủ quái: quầng sáng, bóng, vương miện, vòng chân, hào quang boss và cuồng nộ.
import * as SP from '../sprites.js';
import { parse, rgb2hsl, css, T, WHITE } from './palette.js';
import { Spr } from './spr.js';

// ================= HIỆU ỨNG PHỤ (cache) =================
const glowCache = new Map();
function glowSprite(col) {
  let g = glowCache.get(col);
  if (g) return g;
  g = document.createElement('canvas');
  g.width = 32;
  g.height = 32;
  const x = g.getContext('2d');
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, css(col, 0.9));
  gr.addColorStop(0.35, css(col, 0.45));
  gr.addColorStop(1, css(col, 0));
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  glowCache.set(col, g);
  return g;
}
export function glow(ctx, x, y, r, col, a) {
  if (a <= 0.01 || r < 1) return;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * Math.min(1, a);
  ctx.drawImage(glowSprite(col), Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  ctx.globalAlpha = ga;
}

const shadowCache = new Map();
export function shadowSprite(rx, ry) {
  const key = `${rx}|${ry}`;
  let c = shadowCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rx * 2;
  c.height = ry * 2;
  const g = c.getContext('2d');
  for (let y = 0; y < ry * 2; y++) {
    for (let x = 0; x < rx * 2; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) {
        g.fillStyle = d < 0.45 ? 'rgba(10,6,20,0.34)' : 'rgba(10,6,20,0.2)';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  shadowCache.set(key, c);
  return c;
}

let crownCache = new Map();
export function crownSprite(gem) {
  let c = crownCache.get(gem);
  if (c) return c;
  const S = new Spr(13, 9);
  const gold = T('#ffc928');
  S.fill(S.M().poly([1.5, 7.4, 1.5, 2.2, 4, 4.6, 6.5, 0.6, 9, 4.6, 11.5, 2.2, 11.5, 7.4]), gold, { sh: 'v', vt: 0.3, vb: 0.85 });
  S.fill(S.M().rect(2, 5, 9, 2), T('#ffb300'), { sh: 'edge', il: 2 });
  S.px(6, 5, T(gem).lt); S.px(7, 5, T(gem).md); S.px(6, 6, T(gem).md); S.px(7, 6, T(gem).dk);
  S.px(3, 5, WHITE, 0.9); S.px(9, 5, T(gem).md);
  S.px(6, 1, WHITE); S.px(2, 3, WHITE, 0.8); S.px(11, 3, WHITE, 0.8);
  c = S.bake();
  crownCache.set(gem, c);
  if (crownCache.size > 20) crownCache = new Map([[gem, c]]);
  return c;
}
export const CROWN_UP = 7;

// Vòng phép elip (pixel) dưới chân boss
const ringCache = new Map();
function ringSprite(rx, ry, col) {
  const key = `${rx}|${ry}|${col}`;
  let c = ringCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = rx * 2 + 2;
  c.height = ry * 2 + 2;
  const g = c.getContext('2d');
  const tick = Math.max(6, Math.round((rx + ry) * 0.9));
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const dx = (x + 0.5 - rx - 1) / rx;
      const dy = (y + 0.5 - ry - 1) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const edge = Math.abs(d - 1) * Math.min(rx, ry * 2.2);
      if (edge < 0.62) {
        g.fillStyle = css(col, 0.75);
        g.fillRect(x, y, 1, 1);
      } else if (Math.abs(d - 0.72) * Math.min(rx, ry * 2.2) < 0.5) {
        const a = Math.atan2(dy, dx);
        if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * tick) % 2 === 0) {
          g.fillStyle = css(col, 0.4);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  ringCache.set(key, c);
  return c;
}

// Boss đội vương miện; boss khác đã có sừng / mũ / quầng riêng trong sprite
export const BOSS_CROWN = new Set(['boss_slime', 'boss_wolf', 'boss_fox']);
const ELEM = SP.ELEMENT_COLORS || { fire: '#ff7043', water: '#42a5f5', wind: '#7ccd5a' };
// Hào quang theo hệ; mắt sáng theo màu nhấn (nếu màu nhấn quá tối thì theo hệ)
const bossColCache = new Map();
// màu hạt phụ của hào quang khi màu hệ lạc tông với thân boss
const AURA2 = { boss_god: '#b388ff', boss_heaven: '#ff5252', ev_hacviem: '#b388ff', ev_bangphach: '#e0fbfc', ev_huyetnguyet: '#b388ff' };
export function bossCol(def) {
  let c = bossColCache.get(def);
  if (c) return c;
  const el = ELEM[def.el] || def.pal[2];
  const l = rgb2hsl(...parse(def.pal[2]))[2];
  c = { aura: el, eye: l > 0.4 ? def.pal[2] : el };
  c.p2 = AURA2[def.k] || c.eye;
  bossColCache.set(def, c);
  return c;
}

// Hào quang boss — front=false: phần sau lưng; front=true: phần trước mặt; col2: màu hạt phụ
export function bossAura(ctx, cx, gy, cyc, rw, rh, s, col, t, front, col2 = col) {
  const tau = Math.PI * 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
  if (!front) {
    glow(ctx, cx, cyc, Math.max(rw * 1.25, rh * 0.75) * (0.95 + 0.08 * pulse), col, 0.26 + 0.16 * pulse);
    glow(ctx, cx, cyc + rh * 0.1, Math.max(rw, rh) * 0.5, '#ffffff', 0.06 + 0.05 * pulse);
  }
  // vòng phép dưới chân (nửa sau vẽ trước, nửa trước vẽ sau)
  const rxu = Math.max(8, Math.round((rw * 1.05) / s));
  const ryu = Math.max(3, Math.round(rxu * 0.24));
  const ring = ringSprite(rxu, ryu, col);
  const hh = ryu + 1;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (0.55 + 0.35 * pulse);
  const rx0 = Math.round(cx - (ring.width / 2) * s);
  const ry0 = Math.round(gy - (ring.height / 2) * s);
  if (!front) ctx.drawImage(ring, 0, 0, ring.width, hh, rx0, ry0, ring.width * s, hh * s);
  else ctx.drawImage(ring, 0, hh, ring.width, ring.height - hh, rx0, ry0 + hh * s, ring.width * s, (ring.height - hh) * s);
  ctx.globalAlpha = ga;
  // tia sáng chạy quanh vòng
  for (let k = 0; k < 3; k++) {
    const a = t * 1.6 + (k / 3) * tau;
    const sn = Math.sin(a);
    if ((sn >= 0) !== front) continue;
    const px = cx + Math.cos(a) * rxu * s;
    const py = gy + sn * ryu * s;
    glow(ctx, px, py, 3 * s, col, 0.7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
  }
  // hạt sáng xoay quanh thân
  const M = 6;
  for (let k = 0; k < M; k++) {
    const a = t * 1.5 + (k / M) * tau;
    const sn = Math.sin(a);
    if ((sn >= 0) !== front) continue;
    const wob = Math.sin(t * 2.1 + k * 1.9) * rh * 0.3;
    const px = cx + Math.cos(a) * rw;
    const py = cyc + sn * rw * 0.2 + wob;
    const pc = k % 2 ? col2 : col;
    glow(ctx, px, py, 3.4 * s, pc, 0.5);
    for (let tr = 1; tr <= 3; tr++) {
      const a2 = a - tr * 0.1;
      ctx.fillStyle = css(pc, 0.55 - tr * 0.14);
      ctx.fillRect(Math.round(cx + Math.cos(a2) * rw - s / 2), Math.round(cyc + Math.sin(a2) * rw * 0.2 + wob - s / 2), s, s);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
  }
  // tàn sáng bay lên
  if (front) {
    for (let k = 0; k < 10; k++) {
      const p = (t * 0.45 + k * 0.137 + k * k * 0.071) % 1;
      const h1 = ((k * 73) % 17) / 17 - 0.5;
      const px = Math.round(cx + h1 * rw * 2 + Math.sin(t * 2 + k) * s);
      const py = Math.round(gy - p * rh * 1.15);
      ctx.fillStyle = css(k % 3 ? col : '#ffffff', (1 - p) * 0.85);
      ctx.fillRect(px, py, k % 4 ? Math.max(1, s - 1) : s, k % 4 ? Math.max(1, s - 1) : s);
    }
  }
}

// Cuồng nộ (boss dưới 30% máu): quầng đỏ đập nhanh sau lưng + lửa đỏ bốc lên quanh thân phía trước
export function rageAura(ctx, cx, gy, cyc, rw, rh, s, t, front) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  if (!front) {
    glow(ctx, cx, cyc, Math.max(rw * 1.5, rh * 0.9), '#ff1744', 0.28 + 0.24 * pulse);
    return;
  }
  for (let k = 0; k < 14; k++) {
    const p = (t * 1.1 + k * 0.173 + k * k * 0.047) % 1;
    const h1 = ((k * 53) % 19) / 19 - 0.5;
    const px = Math.round(cx + h1 * rw * 2.1 + Math.sin(t * 5 + k) * s);
    const py = Math.round(gy - 2 * s - p * rh * 1.25);
    ctx.fillStyle = k % 3 === 0 ? css('#ffd180', (1 - p) * 0.9) : css(k % 2 ? '#ff1744' : '#ff6d00', (1 - p) * 0.85);
    const sz = p < 0.4 ? s + 1 : s;
    ctx.fillRect(px, py, sz, sz * 2);
  }
}
