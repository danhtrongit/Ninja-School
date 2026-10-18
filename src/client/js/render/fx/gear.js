// Hiệu ứng trang bị: cường hóa, khảm ngọc, thời trang.
import { TAU, rnd, pick, clamp01, easeOut, easeOut3, R0, EP, ramp, drawGlow } from './util.js';
import { beamSprite } from './sprites.js';
import { ringPx, linePx, bodyBeam, SPRITE_OUTLINE } from './shapes.js';

export const gearMethods = {
  u_enh(e, dt) {
    const f = e.t / e.life;
    if (!e.ok || f > 0.6) return;
    const k = this.tick(e, dt, e.plus >= 9 ? 55 : 38);
    const lite = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      if (i % 2) this.spawn('px', e.x + sd * rnd(6, 12), e.y - rnd(0, 8), rnd(-4, 4), -rnd(50, 100), rnd(0.5, 0.8), pick([e.c, lite, '#ffffff']), { s: 2, s1: 1, add: true });
      else this.star(e.x + sd * rnd(10, 17), e.y - rnd(2, 34), pick([lite, '#ffffff']), 3, 0.45, -15);
      if (e.plus >= 13 && i % 3 === 0) this.ember(e.x + sd * rnd(5, 10), e.y - rnd(0, 6), pick(EP.fire.spark), 80);
    }
  },

  u_gem(e) {
    if (e.popped || e.t < 0.28) return;
    e.popped = true;
    const cy = e.y;
    this.spawn('glow', e.x, cy, 0, 0, 0.22, e.c, { s: 6, s1: 14, a: 0.7, add: true });
    this.star(e.x, cy, '#ffffff', 7, 0.35);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      this.spawn('spark', e.x, cy, Math.cos(a) * 60, Math.sin(a) * 60 - 10, rnd(0.25, 0.4), i % 2 ? '#ffffff' : e.lite, { g: 60, drag: 3, s: 2, add: true });
    }
  },

  u_cost(e, dt) {
    if (!e.popped && e.t > e.life * 0.62) {
      // dải xoắn chạm đỉnh đầu: tung sao ra xung quanh
      e.popped = true;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        this.spawn('twk', e.x, e.y - 36, Math.cos(a) * 55, Math.sin(a) * 40 - 10, rnd(0.45, 0.6), i % 2 ? e.c : e.lite, { drag: 3 });
      }
    }
    if (e.t > e.life * 0.8) return;
    const k = this.tick(e, dt, 26);
    for (let i = 0; i < k; i++) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      this.spawn('twk', e.x + sd * rnd(8, 18), e.y - rnd(2, 36), 0, -rnd(4, 12), rnd(0.4, 0.6), pick([e.c, e.lite, e.mid]));
    }
  },

  // ================= CƯỜNG HÓA / KHẢM NGỌC / THỜI TRANG =================
  d_enh(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    if (e.ok) {
      const env = f < 0.1 ? f / 0.1 : f > 0.55 ? (1 - f) / 0.45 : 1;
      ctx.globalCompositeOperation = 'lighter';
      const bw = Math.max(2, R0(18 * env + Math.sin(e.t * 20) * 2));
      bodyBeam(ctx, beamSprite(e.c, 24, 80), x, y, bw, 0.6 * env, 0.4);
      bodyBeam(ctx, beamSprite('#ffffff', 8, 80), x, y, 6, 0.5 * env, 0.15);
      drawGlow(ctx, x, y - 14, e.c, 16, 0.16 * env);
      const p = (e.t * 1.6) % 1;
      ctx.globalAlpha = env * (1 - p);
      ctx.fillStyle = '#ffffff';
      ringPx(ctx, x, y, 6 + p * 24, (6 + p * 24) * 0.3, 2, 1);
      const grow = easeOut3(clamp01(e.t / 0.25));
      this.runeRing(ctx, x, y, 17 * grow, 6 * grow, e.t * 3, 6, e.c, env, true);
      return;
    }
    // thất bại: vòng phù văn vỡ thành mảnh rơi xuống
    const a = 1 - f;
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 6; k++) {
      const a0 = (k * TAU) / 6 + 0.2;
      const out = 1 + f * 0.6;
      const dy = R0(f * f * 14);
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = '#37474f';
      ringPx(ctx, x, y + 1 + dy, 16 * out, 5.5 * out, 2, 1, a0, a0 + 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = k % 2 ? '#90a4ae' : '#b0bec5';
      ringPx(ctx, x, y + dy, 16 * out, 5.5 * out, 2, 1, a0, a0 + 0.7);
    }
  },

  // Lượt vẽ trên cùng: dấu X đỏ khi cường hóa thất bại (không bị khói/đá che)
  o_enh(ctx, e, camX, camY) {
    if (e.ok) return;
    const f = e.t / e.life;
    if (f > 0.5) return;
    const x = R0(e.x - camX);
    const cy = R0(e.y - camY) - 16;
    // bật to rồi thu về, mờ dần ở nửa sau
    const g = R0(f < 0.08 ? 4 + f * 50 : 7);
    ctx.globalAlpha = f < 0.3 ? 1 : 1 - (f - 0.3) / 0.2;
    ctx.fillStyle = SPRITE_OUTLINE;
    for (let o = -1; o <= 1; o += 2) {
      linePx(ctx, x - g + o, cy - g, x + g + o, cy + g, 2);
      linePx(ctx, x - g + o, cy + g, x + g + o, cy - g, 2);
      linePx(ctx, x - g, cy - g + o, x + g, cy + g + o, 2);
      linePx(ctx, x - g, cy + g + o, x + g, cy - g + o, 2);
    }
    ctx.fillStyle = '#ff5252';
    linePx(ctx, x - g, cy - g, x + g, cy + g, 2);
    linePx(ctx, x - g, cy + g, x + g, cy - g, 2);
    ctx.fillStyle = '#ffab91';
    linePx(ctx, x - g, cy - g, x - 1, cy - 1, 1);
    linePx(ctx, x + 1, cy - 1, x + g, cy - g, 1);
  },

  d_gem(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    if (e.t < 0.28) {
      // 4 tia hội tụ vào ô khảm
      const p = e.t / 0.28;
      const r = 18 * (1 - easeOut(p)) + 1;
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const a = (k * TAU) / 4 + p * 2.2;
        const px = R0(x + Math.cos(a) * r);
        const py = R0(y + Math.sin(a) * r);
        ctx.globalAlpha = 0.5 + p * 0.5;
        ctx.fillStyle = e.lite;
        ctx.fillRect(px - 2, py, 5, 1);
        ctx.fillRect(px, py - 2, 1, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 1, 1);
      }
      drawGlow(ctx, x, y, e.c, 4 + p * 6, 0.5 * p);
      return;
    }
    // hình thoi nở ra sau khi khảm
    const q = (e.t - 0.28) / (e.life - 0.28);
    const r = 3 + easeOut3(q) * 14;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * (1 - q);
    ctx.fillStyle = e.dark;
    linePx(ctx, x - r, y + 1, x, y - r + 1);
    linePx(ctx, x, y - r + 1, x + r, y + 1);
    linePx(ctx, x + r, y + 1, x, y + r + 1);
    linePx(ctx, x, y + r + 1, x - r, y + 1);
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = q < 0.3 ? '#ffffff' : e.lite;
    linePx(ctx, x - r, y, x, y - r);
    linePx(ctx, x, y - r, x + r, y);
    linePx(ctx, x + r, y, x, y + r);
    linePx(ctx, x, y + r, x - r, y);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, e.c, 10 * (1 - q) + 2, 0.5 * (1 - q));
  },

  d_cost(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = e.x - camX;
    const y = e.y - camY;
    const env = f > 0.7 ? (1 - f) / 0.3 : 1;
    const head = easeOut(clamp01(f / 0.7)) * 1.25;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, R0(x), R0(y - 16), e.c, 18, 0.3 * env);
    ctx.globalCompositeOperation = 'source-over';
    // hai dải xoắn bay lên quanh thân: vẽ viền tối trước rồi tới màu để dải nổi trên mọi nền
    const N = 18;
    for (let pass = 0; pass < 2; pass++) {
      for (let s = 0; s < 2; s++) {
        for (let j = N - 1; j >= 0; j--) {
          const h = head - j * 0.03;
          if (h < 0 || h > 1) continue;
          const a = e.t * 6 + h * 8 + s * Math.PI;
          const sn = Math.sin(a);
          const front = sn > 0;
          const px = R0(x + Math.cos(a) * 14);
          const py = R0(y - 2 - h * 34 + sn * 3);
          const sz = j < 2 ? 3 : j < 9 ? 2 : 1;
          const fade = env * (1 - j / N);
          if (pass === 0) {
            if (!front) continue;
            ctx.globalAlpha = 0.85 * fade;
            ctx.fillStyle = SPRITE_OUTLINE;
            ctx.fillRect(px - 1, py - 1, sz + 2, sz + 2);
          } else {
            ctx.globalAlpha = fade * (front ? 1 : 0.5);
            ctx.fillStyle = j < 2 ? '#ffffff' : j < 6 ? e.lite : j < 12 ? e.c : e.mid;
            ctx.fillRect(px, py, sz, sz);
          }
        }
      }
    }
  },
};
