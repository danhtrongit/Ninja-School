// Đạn bay (phi tiêu, kunai, cầu nguyên tố...) và vụ nổ khi trúng.
import { shade } from '../sprites.js';
import { TAU, OUTLINE, rnd, pick, easeOut3, R0, EP, flameRamp, glowCol, drawGlow } from './util.js';
import { dotSprite, bladeSprite, shurikenFrames, iceSprite } from './sprites.js';
import { ringPx } from './shapes.js';

export const projectileMethods = {
  u_proj(e, dt) {
    const f = Math.min(1, e.t / e.life);
    const x = e.x0 + (e.x1 - e.x0) * f;
    const y = e.y0 + (e.y1 - e.y0) * f;
    if (!e.done && e.t < e.life) {
      const big = e.big || e.boom;
      if (e.p === 'fire') {
        const k = this.tick(e, dt, big ? 110 : 70);
        const rp = flameRamp(e.c, e.el);
        for (let i = 0; i < k; i++) this.flame(x + rnd(-2, 2), y + rnd(-2, 2), -e.ux * 30 + rnd(-10, 10), -e.uy * 30 - 10, rp, big ? 4 : 3, 0.35);
        if (Math.random() < dt * 14) this.smoke(x, y, pick(EP.fire.smoke), 1, 4, 0.6, 0.45);
        if (Math.random() < dt * 20) this.ember(x, y, rp[2]);
      } else if (e.p === 'water') {
        const k = this.tick(e, dt, 50);
        for (let i = 0; i < k; i++) this.drop(x, y, -e.ux * 30 + rnd(-15, 15), -e.uy * 30 - rnd(10, 40), pick(EP.water.drop));
        if (Math.random() < dt * 10) this.spawn('bubble', x, y, rnd(-8, 8), -rnd(10, 25), 0.6, '#e1f5fe', { s: 1 });
      } else if (e.p === 'ice') {
        const k = this.tick(e, dt, 45);
        for (let i = 0; i < k; i++) {
          if (i % 2) this.star(x - e.ux * 4 + rnd(-3, 3), y - e.uy * 4 + rnd(-3, 3), '#e1f5fe', 2, 0.35);
          else this.spawn('px', x - e.ux * 3, y + rnd(-2, 2), -e.ux * 20, rnd(-8, 8), 0.4, pick(EP.ice.spark), { add: true });
        }
      } else if (e.p === 'wind') {
        const k = this.tick(e, dt, 40);
        for (let i = 0; i < k; i++) this.wline(x - e.ux * 4, y + rnd(-5, 5), e.ux * 40, rnd(4, 10), i % 2 ? '#ffffff' : e.c, 0.25);
        if (Math.random() < dt * 6) this.leaf(x, y, -e.ux * 30, rnd(-20, 10));
      } else if (e.el !== 'neutral') {
        const k = this.tick(e, dt, 30);
        for (let i = 0; i < k; i++) {
          if (e.el === 'fire') this.ember(x - e.ux * 3, y - e.uy * 3, pick(EP.fire.spark), 20);
          else if (e.el === 'water' || e.el === 'ice') this.drop(x, y, -e.ux * 20, -20, pick(EP.water.drop));
          else this.spawn('px', x, y, -e.ux * 20, rnd(-6, 6), 0.35, pick(EP.wind.spark), { add: true });
        }
      }
    }
    if (e.t >= e.life && !e.done) {
      e.done = true;
      this.impact(e);
    }
  },

  impact(e) {
    const { x1: x, y1: y, el, c } = e;
    const sp = EP[el].spark;
    const n = e.boom ? 20 : e.p === 'arrow' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = rnd(30, e.boom ? 110 : 70);
      this.spawn('spark', x, y, Math.cos(a) * v - e.ux * 20, Math.sin(a) * v - 20, rnd(0.18, 0.35), i % 2 ? '#ffffff' : pick(sp), { g: 140, drag: 2.5, s: 2, add: true });
    }
    this.spawn('glow', x, y, 0, 0, 0.14, glowCol(c, el), { s: e.boom ? 14 : 6, s1: e.boom ? 22 : 9, a: 0.6, add: true });
    this.star(x, y, '#ffffff', e.boom ? 7 : 4, 0.16);
    if (el === 'water') for (let i = 0; i < 7; i++) this.drop(x, y, rnd(-50, 50), -rnd(30, 90), pick(EP.water.drop));
    else if (el === 'ice') {
      for (let i = 0; i < 6; i++) this.spawn('shard', x, y, rnd(-60, 60), -rnd(20, 70), rnd(0.3, 0.5), pick(EP.ice.spark), { g: 200 });
      this.spawn('ring', x, y, 0, 0, 0.3, '#b3e5fc', { s: 3, s1: 14, ry: 0.5, add: true });
    } else if (el === 'wind') {
      for (let i = 0; i < 4; i++) this.wline(x + rnd(-6, 6), y + rnd(-6, 6), rnd(-60, 60), rnd(5, 10), '#ffffff', 0.25);
      if (e.p === 'wind') for (let i = 0; i < 2; i++) this.leaf(x, y, rnd(-50, 50), -rnd(20, 60));
    } else if (el === 'fire' && e.p !== 'shuriken') {
      const rp = flameRamp(c, el);
      for (let i = 0; i < 5; i++) this.flame(x + rnd(-3, 3), y + rnd(-3, 3), rnd(-30, 30), -rnd(10, 40), rp, 3, 0.4);
    }
    if (e.boom) this.explode(x, y, 26, c, el === 'neutral' ? 'fire' : el, false);
  },

  // smoke (tùy chọn): bảng màu khói sáng, bay ra ngoài và lên cao để không che người ở tâm nổ
  explode(x, y, r, c, el, big, smoke) {
    this.add({ k: 'boom', x, y, r, c, el, life: big ? 0.6 : 0.45 });
    this.spawn('glow', x, y, 0, 0, 0.2, '#ffffff', { s: r * 0.4, s1: r * 0.6, a: 0.6, add: true });
    if (el === 'water' || el === 'ice') {
      for (let i = 0; i < (big ? 36 : 16); i++) this.drop(x + rnd(-6, 6), y, rnd(-70, 70), -rnd(60, 170), pick(el === 'ice' ? EP.ice.drop : EP.water.drop), y + 10);
      for (let i = 0; i < (big ? 10 : 4); i++) this.spawn('bubble', x + rnd(-r, r) * 0.5, y - rnd(0, 20), rnd(-10, 10), -rnd(15, 35), rnd(0.6, 1), '#e1f5fe', { s: Math.random() < 0.5 ? 1 : 2 });
      return;
    }
    const rp = flameRamp(c, 'fire');
    for (let i = 0; i < (big ? 30 : 14); i++) {
      const a = Math.random() * TAU;
      const v = rnd(20, big ? 110 : 70);
      this.flame(x + Math.cos(a) * 3, y + Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 30, rp, big ? 5 : 4, 0.5);
    }
    for (let i = 0; i < (big ? 20 : 8); i++) this.ember(x + rnd(-8, 8), y - rnd(0, 8), pick(EP.fire.spark), big ? 110 : 70);
    if (!smoke) {
      for (let i = 0; i < (big ? 10 : 4); i++) this.smoke(x + rnd(-r, r) * 0.4, y - rnd(0, 14), pick(EP.fire.smoke), 3, big ? 9 : 6, big ? 1.2 : 0.9, 0.6);
      return;
    }
    for (let i = 0; i < (big ? 8 : 4); i++) {
      const d = i % 2 ? 1 : -1;
      const sm = this.smoke(x + d * rnd(0.7, 1.1) * r, y - rnd(10, 24), pick(smoke), 3, big ? 8 : 6, 0.9, 0.32);
      if (sm) {
        sm.vx = d * rnd(25, 50);
        sm.vy = -rnd(25, 45);
      }
    }
  },

  d_proj(ctx, e, camX, camY) {
    if (e.done) return;
    const f = Math.min(1, e.t / e.life);
    const wx = e.x0 + (e.x1 - e.x0) * f;
    const wy = e.y0 + (e.y1 - e.y0) * f;
    const x = R0(wx - camX);
    const y = R0(wy - camY);
    const { ux, uy } = e;
    const dist = Math.hypot(e.x1 - e.x0, e.y1 - e.y0) * f;
    const big = e.big || e.boom;
    const gc = glowCol(e.c, e.el);
    switch (e.p) {
      case 'arrow': {
        const L = big ? 14 : 11;
        const tl = Math.min(dist, big ? 34 : 24);
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < tl; j += 1) {
          ctx.globalAlpha = 0.75 * (1 - j / tl);
          ctx.fillStyle = j < tl * 0.35 ? '#ffffff' : gc;
          ctx.fillRect(R0(x - ux * (L + j)), R0(y - uy * (L + j)), 1, big && j < tl * 0.6 ? 2 : 1);
        }
        drawGlow(ctx, x, y, gc, big ? 7 : 4, 0.6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const nx = -uy;
        const ny = ux;
        ctx.fillStyle = '#5d4037';
        for (let j = 2; j < L; j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = '#d7ccc8';
        for (let j = 3; j < L - 2; j += 2) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = e.el === 'neutral' ? '#b0bec5' : e.c;
        ctx.fillRect(R0(x - ux), R0(y - uy), 1, 1);
        ctx.fillRect(R0(x - ux * 2 + nx), R0(y - uy * 2 + ny), 1, 1);
        ctx.fillRect(R0(x - ux * 2 - nx), R0(y - uy * 2 - ny), 1, 1);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(R0(x - ux * 3 + nx * 1.5), R0(y - uy * 3 + ny * 1.5), 1, 1);
        ctx.fillRect(R0(x - ux * 3 - nx * 1.5), R0(y - uy * 3 - ny * 1.5), 1, 1);
        ctx.fillStyle = e.el === 'neutral' ? '#ffffff' : shade(e.c, 0.4);
        for (let j = L - 3; j < L; j++) {
          ctx.fillRect(R0(x - ux * (j + 1) + nx), R0(y - uy * (j + 1) + ny), 1, 1);
          ctx.fillRect(R0(x - ux * (j + 1) - nx), R0(y - uy * (j + 1) - ny), 1, 1);
        }
        break;
      }
      case 'kunai': {
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 6; j < 18; j++) {
          ctx.globalAlpha = 0.5 * (1 - (j - 6) / 12);
          ctx.fillStyle = gc;
          ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const nx = -uy;
        const ny = ux;
        ctx.fillStyle = '#eceff1';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#b0bec5';
        for (let j = 1; j < 4; j++) {
          ctx.fillRect(R0(x - ux * j + nx * 0.6), R0(y - uy * j + ny * 0.6), 1, 1);
          ctx.fillRect(R0(x - ux * j - nx * 0.6), R0(y - uy * j - ny * 0.6), 1, 1);
        }
        ctx.fillStyle = '#5d4037';
        for (let j = 4; j < 7; j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.fillStyle = e.c;
        ctx.fillRect(R0(x - ux * 7), R0(y - uy * 7), 1, 1);
        break;
      }
      case 'shuriken': {
        const R = big ? 5 : 4;
        const fr = shurikenFrames(e.el === 'neutral' ? '#cfd8dc' : e.c, R);
        const k = Math.floor(e.t * 48) & 7;
        const cv = fr[k];
        const h = cv.width >> 1;
        if (e.el !== 'neutral') {
          ctx.globalCompositeOperation = 'lighter';
          drawGlow(ctx, x, y, gc, R + 4, 0.55);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 0.22;
        ctx.drawImage(fr[(k + 6) & 7], R0(x - ux * 9) - h, R0(y - uy * 9) - h);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(fr[(k + 7) & 7], R0(x - ux * 4.5) - h, R0(y - uy * 4.5) - h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = e.el === 'neutral' ? '#ffffff' : gc;
        for (let j = 4; j < Math.min(dist, 16); j++) ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(cv, x - h, y - h);
        break;
      }
      case 'wind': {
        const ai = ((R0((Math.atan2(uy, ux) / TAU) * 16) % 16) + 16) % 16;
        const B = bladeSprite(e.c, big ? 8 : 6, big ? 4 : 3, ai, 1.15);
        const h = B.S >> 1;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, gc, big ? 9 : 7, 0.45);
        ctx.globalAlpha = 0.35;
        ctx.drawImage(B.cv, R0(x - ux * 6) - h, R0(y - uy * 6) - h);
        ctx.globalAlpha = 0.18;
        ctx.drawImage(B.cv, R0(x - ux * 12) - h, R0(y - uy * 12) - h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(B.cv, x - h, y - h);
        break;
      }
      case 'ice': {
        const ai = ((R0((Math.atan2(uy, ux) / TAU) * 16) % 16) + 16) % 16;
        const I = iceSprite(big ? 13 : 10, ai);
        const h = I.S >> 1;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, '#80d8ff', 8, 0.55);
        for (let j = 4; j < Math.min(dist, 22); j++) {
          ctx.globalAlpha = 0.6 * (1 - j / 22);
          ctx.fillStyle = j < 10 ? '#ffffff' : '#81d4fa';
          ctx.fillRect(R0(x - ux * j), R0(y - uy * j), 1, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(I.cv, x - h, y - h);
        break;
      }
      case 'water': {
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, '#40c4ff', big ? 9 : 7, 0.6);
        ctx.globalCompositeOperation = 'source-over';
        for (let j = 4; j >= 1; j--) {
          const r = Math.max(1, 3 - j * 0.6) | 0;
          ctx.globalAlpha = 0.7 - j * 0.12;
          ctx.drawImage(dotSprite(j > 2 ? '#29b6f6' : '#81d4fa', r), R0(x - ux * j * 3) - r, R0(y - uy * j * 3) - r);
        }
        ctx.globalAlpha = 1;
        const r = big ? 3 : 2;
        ctx.drawImage(dotSprite('#0288d1', r + 1), x - r - 1, y - r - 1);
        ctx.drawImage(dotSprite('#4fc3f7', r), x - r, y - r);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        break;
      }
      default: {
        // cầu lửa (đạn quái dùng màu riêng)
        const rp = flameRamp(e.c, e.el);
        const r = big ? 3 : 2;
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, x, y, gc, big ? 11 : 7, 0.7);
        for (let j = 5; j >= 1; j--) {
          const rr = Math.max(1, r + 1 - j * 0.6) | 0;
          ctx.globalAlpha = 0.85 - j * 0.12;
          ctx.drawImage(dotSprite(rp[Math.min(5, 1 + (j >> 1) + 1)], rr), R0(x - ux * j * 2.6) - rr, R0(y - uy * j * 2.6 + Math.sin(e.t * 40 + j) * 0.8) - rr);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(dotSprite(rp[3], r + 1), x - r - 1, y - r - 1);
        ctx.drawImage(dotSprite(rp[1], r), x - r, y - r);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  },

  d_boom(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const r = e.r * easeOut3(f);
    const water = e.el === 'water' || e.el === 'ice';
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, water ? '#40c4ff' : '#ff8a3c', e.r * (1 - f * 0.4), 0.5 * (1 - f));
    if (f < 0.35) drawGlow(ctx, x, y, '#ffffff', e.r * 0.35, 0.6 * (1 - f / 0.35));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = water ? '#0277bd' : '#bf360c';
    ringPx(ctx, x, y + 1, r + 1, r * 0.8 + 1, 2, 1);
    ctx.fillStyle = water ? '#e1f5fe' : '#ffe082';
    ringPx(ctx, x, y, r, r * 0.8, 2, 1);
    if (!water && f < 0.45) {
      const k = 1 - f / 0.45;
      const rr = Math.max(1, R0(e.r * 0.42 * k));
      ctx.globalAlpha = 1;
      ctx.drawImage(dotSprite('#e64a19', rr + 2), x - rr - 2, y - rr - 2);
      ctx.drawImage(dotSprite('#ffa726', rr + 1), x - rr - 1, y - rr - 1);
      ctx.drawImage(dotSprite('#ffe082', rr), x - rr, y - rr);
      if (rr > 3) ctx.drawImage(dotSprite('#fffde7', rr - 3), x - rr + 2, y - rr + 2);
    }
  },
};
