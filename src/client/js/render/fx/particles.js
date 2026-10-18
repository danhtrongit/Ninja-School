// Cập nhật và vẽ hạt (particle) của FX.
import { shade } from '../sprites.js';
import { TAU, easeOut, easeOut3, R0, drawGlow } from './util.js';
import { dotSprite, plusSprite } from './sprites.js';
import { LEAF_SHAPES, ringPx, rockSprite, twinkleSprite } from './shapes.js';

export const particleMethods = {
  // phát hạt theo nhịp (rate hạt/giây)
  tick(e, dt, rate) {
    e.acc = (e.acc || 0) + dt * rate;
    const k = Math.floor(e.acc);
    e.acc -= k;
    return k;
  },

  drawParts(ctx, camX, camY, add) {
    const W = this.cw + 20;
    const H = this.ch + 20;
    for (const p of this.parts) {
      if ((p.k === 'glow' || p.k === 'ring' || p.k === 'vring') !== add) continue;
      const x = R0(p.x - camX);
      const y = R0(p.y - camY);
      if (x < -60 || y < -60 || x > W + 40 || y > H + 40) continue;
      const f = p.t / p.life;
      const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
      switch (p.k) {
        case 'px': {
          const s = Math.max(1, R0(p.s + (p.s1 - p.s) * f));
          ctx.globalAlpha = p.a * fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
          break;
        }
        case 'spark': {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const ux = p.vx / sp;
          const uy = p.vy / sp;
          const len = Math.max(1, R0(p.s * Math.min(1, sp / 60)));
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          for (let j = 1; j <= len; j++) ctx.fillRect(R0(p.x - ux * j - camX), R0(p.y - uy * j - camY), 1, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'flame': {
          const rp = p.c;
          const idx = Math.min(rp.length - 1, 1 + Math.floor(f * (rp.length - 1.5)));
          const s = Math.max(1, R0(p.s * (1 - f * 0.75)));
          ctx.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1;
          ctx.fillStyle = rp[idx];
          ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
          break;
        }
        case 'ember': {
          ctx.globalAlpha = (Math.sin(p.t * 34 + p.ph) > -0.4 ? 1 : 0.35) * fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'smoke': {
          const r = Math.max(1, R0(p.s + (p.s1 - p.s) * easeOut(f)));
          ctx.globalAlpha = p.a * (1 - f) * (f < 0.1 ? f / 0.1 : 1);
          ctx.drawImage(dotSprite(p.c, r), x - r, y - r);
          break;
        }
        case 'drop': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, 1, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'bubble': {
          const r = p.s;
          ctx.globalAlpha = 0.9 * fade;
          ctx.fillStyle = p.c;
          const bx = x + R0(Math.sin(p.t * 9 + p.ph) * 1.5);
          if (r <= 1) {
            ctx.fillRect(bx - 1, y, 1, 1);
            ctx.fillRect(bx + 1, y, 1, 1);
            ctx.fillRect(bx, y - 1, 1, 1);
            ctx.fillRect(bx, y + 1, 1, 1);
          } else {
            ctx.fillRect(bx - 1, y - 2, 3, 1);
            ctx.fillRect(bx - 1, y + 2, 3, 1);
            ctx.fillRect(bx - 2, y - 1, 1, 3);
            ctx.fillRect(bx + 2, y - 1, 1, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bx - 1, y - 1, 1, 1);
          }
          break;
        }
        case 'leaf': {
          const sh = LEAF_SHAPES[Math.floor(p.t * 12 + p.ph * 3) & 3];
          ctx.globalAlpha = fade;
          const dark = shade(p.c, -0.35);
          for (const [dx, dy, k] of sh) {
            ctx.fillStyle = k === 1 ? p.c : k === 2 ? dark : shade(p.c, 0.3);
            ctx.fillRect(x + dx - 1, y + dy, 1, 1);
          }
          break;
        }
        case 'wline': {
          const len = Math.max(1, R0(p.s * (1 - f * 0.5)));
          const d = p.vx >= 0 ? 1 : -1;
          ctx.globalAlpha = 0.85 * (1 - f);
          ctx.fillStyle = p.c;
          ctx.fillRect(d > 0 ? x - len : x, y, len, 1);
          ctx.globalAlpha = 1 - f;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(d > 0 ? x - 1 : x, y, 2, 1);
          break;
        }
        case 'shard': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          if (Math.floor(p.t * 16 + p.ph) & 1) ctx.fillRect(x - 1, y, 3, 1);
          else ctx.fillRect(x, y - 1, 1, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'star': {
          const tw = Math.sin(f * Math.PI);
          const L = Math.max(0, R0(p.s * tw));
          ctx.globalAlpha = Math.min(1, tw * 1.4);
          ctx.fillStyle = p.c;
          if (L > 0) {
            ctx.fillRect(x - L, y, L * 2 + 1, 1);
            ctx.fillRect(x, y - L, 1, L * 2 + 1);
          }
          if (L > 2) {
            ctx.fillRect(x - 1, y - 1, 3, 3);
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'plus': {
          const cv = plusSprite(p.c, p.big);
          ctx.globalAlpha = fade;
          ctx.drawImage(cv, x - (cv.width >> 1), y - (cv.height >> 1));
          break;
        }
        case 'twk': {
          // nhỏ -> to -> nhỏ theo 3 cỡ sprite
          const tw = Math.sin(f * Math.PI);
          const cv = twinkleSprite(p.c, tw > 0.75 ? 3 : tw > 0.35 ? 2 : 1);
          ctx.globalAlpha = 1;
          ctx.drawImage(cv, x - (cv.width >> 1), y - (cv.height >> 1));
          break;
        }
        case 'rock': {
          const cv = rockSprite(p.c, p.s);
          ctx.globalAlpha = fade;
          ctx.drawImage(cv, x - (cv.width >> 1), y - (cv.height >> 1));
          break;
        }
        case 'debris': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.c;
          ctx.fillRect(x, y, p.s, p.s);
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'glow': {
          const r = p.s + (p.s1 - p.s) * f;
          drawGlow(ctx, x, y, p.c, r, p.a * (1 - f));
          break;
        }
        case 'ring': {
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          ctx.globalAlpha = (1 - f) * (p.a || 1);
          ctx.fillStyle = p.c;
          const w = p.w || 2;
          ringPx(ctx, x, y, r, r * (p.ry || 0.4), w, w > 2 ? 2 : 1);
          break;
        }
        case 'vring': {
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          ctx.globalAlpha = 1 - f;
          ctx.fillStyle = p.c;
          ringPx(ctx, x, y, r * 0.32, r, 1, 1);
          break;
        }
        case 'dring': {
          // vòng sóng mặt đất vẽ thường (bụi đất, màu nguyên tố): mép dưới tối, thân màu, mép trên sáng
          const r = p.s + (p.s1 - p.s) * easeOut3(f);
          const ry = r * (p.ry || 0.3);
          const w = p.w || 2;
          const a = (1 - f) * (p.a || 1);
          ctx.globalAlpha = 0.7 * a;
          ctx.fillStyle = shade(p.c, -0.35);
          ringPx(ctx, x, y + 1, r, ry, w, 1);
          ctx.globalAlpha = 0.9 * a;
          ctx.fillStyle = p.c;
          ringPx(ctx, x, y, r, ry, w, w > 2 ? 2 : 1);
          ctx.fillStyle = shade(p.c, 0.35);
          ringPx(ctx, x, y - 1, r - 1, ry - 0.5, 1, 1, Math.PI + 0.3, TAU - 0.3);
          break;
        }
        default:
      }
    }
    ctx.globalAlpha = 1;
  },
};
