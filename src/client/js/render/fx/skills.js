// Hiệu ứng kỹ năng người chơi: chém, nổ vòng, sóng, mưa, thiên thạch, lốc, hào quang, hồi máu, lướt, lên cấp.
import { shade } from '../sprites.js';
import { TAU, rnd, pick, clamp01, easeOut, easeOut3, R0, EP, ramp, flameRamp, glowCol, drawGlow } from './util.js';
import { beamSprite, SLASH_A0, SLASH_A1, slashFrames, bladeSprite, meteorSprite, silhouette } from './sprites.js';
import { ringPx, linePx, bodyBeam } from './shapes.js';

export const skillMethods = {
  u_slash(e, dt) {
    const f = e.t / e.life;
    if (f > 0.55) return;
    const R = e.big ? 21 : 15;
    const head = SLASH_A0 + (SLASH_A1 - SLASH_A0) * easeOut3(clamp01(f / 0.45));
    const cx = e.x + e.dir * 3;
    const cy = e.y - 13;
    const hx = cx + e.dir * Math.cos(head) * R * 0.85;
    const hy = cy + Math.sin(head) * R * 0.85;
    const tx = -Math.sin(head) * e.dir;
    const ty = Math.cos(head);
    const k = this.tick(e, dt, e.big ? 70 : 35);
    const rp = ramp(e.c);
    for (let i = 0; i < k; i++) {
      const v = rnd(40, 90);
      this.spawn('spark', hx, hy, tx * v + rnd(-15, 15), ty * v + rnd(-15, 15), rnd(0.15, 0.3), i % 2 ? '#ffffff' : rp[1], { g: 60, drag: 3, s: 2, add: true });
      if (!e.big) continue;
      if (e.el === 'fire') {
        this.flame(hx + rnd(-2, 2), hy + rnd(-2, 2), tx * 30, ty * 30 - 10, flameRamp(e.c, 'fire'), 3, 0.35);
        if (Math.random() < 0.5) this.ember(hx, hy, pick(EP.fire.spark));
      } else if (e.el === 'water' || e.el === 'ice') {
        this.drop(hx, hy, tx * rnd(40, 80), ty * 50 - 30, pick(EP.water.drop), e.y);
        if (e.el === 'ice' && Math.random() < 0.4) this.star(hx, hy, '#e1f5fe', 3, 0.35);
      } else if (e.el === 'wind') {
        if (Math.random() < 0.35) this.leaf(hx, hy, tx * 70, ty * 40 - 20);
        this.wline(hx, hy + rnd(-4, 4), tx * 120, rnd(4, 9), '#f1f8e9', 0.22);
      }
    }
  },

  u_burst(e, dt) {
    const f = e.t / e.life;
    const R = e.r;
    const rx = R * (0.25 + 0.75 * easeOut3(clamp01(f / 0.7)));
    const ry = rx * 0.36;
    if (f > 0.85) return;
    const rate = (e.big ? 150 : 90) * (0.4 + R / 140);
    const k = this.tick(e, dt, rate);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = e.x + Math.cos(a) * rx;
      const py = e.y + Math.sin(a) * ry;
      if (e.el === 'fire') {
        this.flame(px, py - 2, Math.cos(a) * 15, -rnd(30, 60), flameRamp(e.c, 'fire'), e.big ? 4 : 3, 0.5);
        if (i % 3 === 0) this.ember(px, py - 4, pick(EP.fire.spark), 70);
        if (f > 0.4 && i % 5 === 0) this.smoke(px, py - 6, pick(EP.fire.smoke), 2, 6, 0.8, 0.4);
      } else if (e.el === 'water') {
        this.drop(px, py - 4, Math.cos(a) * rnd(20, 60), -rnd(60, 140), pick(EP.water.drop), py + 2);
        if (i % 4 === 0) this.spawn('bubble', px, py - rnd(0, 20), rnd(-8, 8), -rnd(15, 35), rnd(0.5, 0.9), '#e1f5fe', { s: Math.random() < 0.6 ? 1 : 2 });
      } else if (e.el === 'ice') {
        if (i % 2) this.star(px, py - rnd(0, 18), pick(['#ffffff', '#e1f5fe']), 3, 0.45, -10);
        else this.spawn('px', px, py - rnd(0, 10), rnd(-10, 10), -rnd(10, 30), rnd(0.5, 0.9), '#ffffff', { add: true });
      } else if (e.el === 'wind') {
        const tx = -Math.sin(a);
        if (i % 3 === 0) this.leaf(px, py - rnd(2, 16), tx * rnd(60, 120) + Math.cos(a) * 30, -rnd(20, 60));
        else this.wline(px, py - rnd(2, 20), tx * rnd(80, 140), rnd(5, 12), i % 2 ? '#ffffff' : e.c, 0.25);
      } else {
        this.spawn('spark', px, py - 4, Math.cos(a) * 40, -rnd(20, 60), 0.3, i % 2 ? '#ffffff' : e.c, { g: 100, s: 2, add: true });
      }
    }
    if (e.el === 'ice' && f > 0.72 && !e.shattered) {
      e.shattered = true;
      for (const s of e.spikes) {
        const px = e.x + Math.cos(s.a) * R * s.d;
        const py = e.y + Math.sin(s.a) * R * s.d * 0.36;
        for (let i = 0; i < 3; i++) this.spawn('shard', px, py - rnd(2, s.h), rnd(-50, 50), -rnd(30, 90), rnd(0.35, 0.6), pick(EP.ice.spark), { g: 260, floor: py });
      }
    }
  },

  u_wave(e, dt) {
    const f = e.t / e.life;
    if (f > 0.8) return;
    const u = f / 0.8;
    const hx = e.x + e.dir * e.range * u;
    const hy = e.y - 12;
    const k = this.tick(e, dt, e.p === 'arrow' ? 60 : 80);
    for (let i = 0; i < k; i++) {
      if (e.p === 'arrow') {
        this.spawn('px', hx - e.dir * rnd(4, 20), hy + rnd(-3, 3), -e.dir * rnd(5, 20), rnd(-10, 10), rnd(0.25, 0.5), i % 2 ? '#ffffff' : e.c, { add: true });
      } else if (e.el === 'fire') {
        this.flame(hx - e.dir * 4, hy + rnd(-12, 12), -e.dir * 40, -rnd(5, 25), flameRamp(e.c, 'fire'), 3, 0.35);
        if (i % 3 === 0) this.ember(hx, hy + rnd(-12, 12), pick(EP.fire.spark));
      } else if (e.el === 'water' || e.el === 'ice') {
        this.drop(hx - e.dir * 3, hy + rnd(-12, 12), -e.dir * rnd(20, 60), -rnd(20, 60), pick(EP.water.drop), e.y);
      } else if (e.el === 'wind') {
        this.wline(hx - e.dir * 6, hy + rnd(-12, 12), e.dir * 60, rnd(6, 14), '#ffffff', 0.25);
        if (i % 4 === 0) this.leaf(hx, hy + rnd(-10, 10), -e.dir * 40, -rnd(10, 40));
      } else {
        this.spawn('spark', hx, hy + rnd(-10, 10), -e.dir * 50, rnd(-20, 20), 0.3, '#ffffff', { s: 2, drag: 3, add: true });
      }
    }
    if (e.p === 'arrow' && Math.abs(hx - e.x) - e.lastRing > 30) {
      e.lastRing += 30;
      this.spawn('vring', hx - e.dir * 4, hy, 0, 0, 0.35, e.c, { s: 5, s1: 13, add: true });
    }
    if (e.p !== 'arrow' && Math.random() < dt * 30) this.smoke(hx, e.y - 1, pick(['#d7ccc8', '#bcaaa4']), 1, 4, 0.5, 0.45);
  },

  u_mark() {},

  u_meteor(e, dt) {
    const fall = clamp01(e.t / e.hit);
    const big = e.big;
    if (e.t < e.hit) {
      const ff = Math.pow(fall, 1.35);
      const x = e.x - 70 + 70 * ff;
      const y = e.y - 165 + 155 * ff;
      const k = this.tick(e, dt, big ? 180 : 130);
      if (e.el === 'water' || e.el === 'ice') {
        for (let i = 0; i < k; i++) {
          if (i % 2) this.drop(x + rnd(-4, 4), y + rnd(-4, 4), rnd(-30, 30) - 20, -rnd(20, 60), pick(EP.water.drop));
          else this.spawn('px', x + rnd(-5, 5), y + rnd(-5, 5), rnd(-10, 10), rnd(-20, 0), rnd(0.25, 0.5), pick(['#ffffff', '#b3e5fc', e.c]), { add: true, s: 2, s1: 1 });
        }
        if (Math.random() < dt * 25) this.spawn('bubble', x, y, rnd(-15, 15), rnd(-15, 15), 0.6, '#e1f5fe', { s: 2 });
      } else {
        const rp = flameRamp(e.c, 'fire');
        for (let i = 0; i < k; i++) this.flame(x + rnd(-4, 4), y + rnd(-4, 4), rnd(-25, 15) - 25, -rnd(30, 70), rp, big ? 5 : 4, 0.45);
        if (Math.random() < dt * 45) this.smoke(x - 4, y - 6, pick(EP.fire.smoke), 3, 8, 1, 0.55);
        if (Math.random() < dt * 40) this.ember(x, y, pick(EP.fire.spark), 30);
      }
    } else if (!e.done) {
      e.done = true;
      const r = e.r;
      this.spawn('glow', e.x, e.y - 14, 0, 0, 0.22, '#ffffff', { s: 16, s1: 30, a: 0.7, add: true });
      this.spawn('ring', e.x, e.y, 0, 0, 0.5, '#ffffff', { s: 8, s1: r, ry: 0.36, add: true, w: 3 });
      this.spawn('ring', e.x, e.y, 0, 0, 0.7, glowCol(e.c, e.el), { s: 4, s1: r * 0.8, ry: 0.36, add: true, w: 2 });
      this.burst(e.x, e.y, r, e.c, true);
      this.explode(e.x, e.y - 6, 30, e.c, e.el === 'fire' ? 'fire' : 'water', true);
      if (e.el === 'fire') {
        for (let i = 0; i < (big ? 18 : 12); i++) {
          this.spawn('debris', e.x + rnd(-8, 8), e.y - rnd(2, 10), rnd(-90, 90), -rnd(60, 170), rnd(0.7, 1.1), pick(['#4e342e', '#6d4c41', '#3e2723']), { g: 380, floor: e.y + rnd(-4, 6), s: Math.random() < 0.5 ? 2 : 1 });
        }
      }
    }
  },

  u_whirl(e, dt) {
    const f = e.t / e.life;
    if (f > 0.85) return;
    const k = this.tick(e, dt, e.big ? 70 : 45);
    const W = Math.min(e.big ? 36 : 26, e.r * 0.34);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      if (i % 3 === 0) {
        const sm = this.smoke(e.x + Math.cos(a) * 6, e.y - 1, pick(['#d7ccc8', '#c5e1a5', '#bcaaa4']), 2, 6, 0.6, 0.5);
        if (sm) sm.vx = Math.cos(a) * 50;
      } else if (i % 3 === 1) {
        const h = rnd(4, e.big ? 60 : 42);
        const rr = 4 + (h / 60) * W;
        this.wline(e.x + Math.cos(a) * rr, e.y - h, (Math.sin(a) > 0 ? 1 : -1) * rnd(60, 120), rnd(4, 10), Math.random() < 0.5 ? '#ffffff' : e.c, 0.2);
      } else if (Math.random() < 0.5) this.leaf(e.x + rnd(-W, W), e.y - rnd(10, 50), rnd(-100, 100), -rnd(20, 70));
    }
  },

  u_aura(e, dt) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    if (f > 0.8) return;
    const k = this.tick(e, dt, 45);
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = o.x + Math.cos(a) * rnd(5, 11);
      const py = o.y - rnd(0, 6);
      if (e.el === 'fire') {
        this.flame(px, py, rnd(-5, 5), -rnd(30, 55), flameRamp(e.c, 'fire'), 3, 0.6);
        if (i % 2) this.ember(px, py - rnd(0, 20), pick(EP.fire.spark), 50);
      } else if (e.el === 'water') {
        this.spawn('bubble', px, py - rnd(0, 16), rnd(-5, 5), -rnd(20, 40), rnd(0.6, 0.9), '#e1f5fe', { s: Math.random() < 0.6 ? 1 : 2 });
      } else if (e.el === 'ice') {
        this.star(px, py - rnd(0, 26), pick(['#ffffff', '#b3e5fc']), 3, 0.5, -20);
      } else if (e.el === 'wind') {
        if (i % 2) this.leaf(px, py - rnd(0, 20), Math.cos(a) * 30, -rnd(30, 60));
        else this.spawn('px', px, py, 0, -rnd(40, 70), rnd(0.4, 0.7), pick(['#ffffff', e.c, '#ccff90']), { add: true });
      } else {
        if (i % 2) this.smoke(px, py - rnd(0, 18), pick(['#cfd8dc', '#b0bec5', '#eceff1']), 2, 6, 0.7, 0.5);
        else this.star(px, py - rnd(0, 26), '#ffffff', 3, 0.45, -15);
      }
      if (i % 4 === 0) this.spawn('px', o.x + rnd(-12, 12), o.y - rnd(0, 30), 0, -rnd(25, 50), rnd(0.4, 0.7), '#ffffff', { add: true });
    }
  },

  u_heal(e, dt) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    if (f > 0.72) return;
    const k = this.tick(e, dt, 26);
    for (let i = 0; i < k; i++) {
      this.spawn('plus', o.x + rnd(-13, 13), o.y - rnd(0, 26), rnd(-4, 4), -rnd(18, 30), rnd(0.6, 0.85), e.c, { big: Math.random() < 0.4 });
      if (i % 2) this.star(o.x + rnd(-14, 14), o.y - rnd(2, 30), pick(['#ffffff', shade(e.c, 0.5)]), 3, 0.45, -12);
      if (e.el === 'wind' && Math.random() < 0.3) this.leaf(o.x + rnd(-10, 10), o.y - rnd(0, 10), rnd(-20, 20), -rnd(30, 50), pick(['#a5d6a7', '#c5e1a5', '#81c784']));
    }
  },

  u_dash(e, dt) {
    const f = e.t / e.life;
    if (f > 0.5) return;
    const k = this.tick(e, dt, 60);
    for (let i = 0; i < k; i++) {
      const x = e.x0 + (e.x1 - e.x0) * Math.random();
      if (e.el === 'wind' && i % 2) this.leaf(x, e.y - rnd(4, 24), e.dir * rnd(40, 100), -rnd(10, 40));
      else this.spawn('spark', x, e.y - rnd(4, 24), e.dir * rnd(60, 120), rnd(-20, 20), 0.25, i % 2 ? '#ffffff' : e.c, { s: 3, drag: 3, add: true });
    }
  },

  u_level(e, dt) {
    const o = e.get();
    if (!o) return;
    if (!e.burst) {
      e.burst = true;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const st = this.star(o.x, o.y - 14, i % 2 ? '#fff59d' : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos(a) * 70;
          st.vy = Math.sin(a) * 50 - 20;
          st.drag = 2.5;
        }
      }
    }
    if (e.t > e.life * 0.75) return;
    const k = this.tick(e, dt, 60);
    for (let i = 0; i < k; i++) {
      // hạt bay hai bên thân, không phủ lên mặt nhân vật
      const sd = Math.random() < 0.5 ? -1 : 1;
      if (i % 2) this.spawn('ember', o.x + sd * rnd(6, 15), o.y - rnd(0, 6), rnd(-6, 6), -rnd(50, 110), rnd(0.6, 1.1), pick(['#fff59d', '#ffd54f', '#ffffff']), { add: true, drag: 0.6 });
      else this.star(o.x + sd * rnd(11, 20), o.y - rnd(0, 50), pick(['#fff59d', '#ffffff', '#ffe082']), rnd(2, 4) | 0, 0.5, -20);
      // hạt vàng vuông bay lên theo mép cột sáng
      if (i % 3 === 0) this.spawn('px', o.x + sd * rnd(7, 12), o.y - rnd(0, 10), rnd(-4, 4), -rnd(60, 120), rnd(0.6, 1), pick(['#ffd54f', '#ffca28', '#fff59d']), { s: 2, s1: 1, add: true });
    }
  },

  d_slash(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const S = slashFrames(e.c, e.big);
    const fr = S.frames[Math.min(S.frames.length - 1, Math.floor(f * S.frames.length))];
    const cx = R0(e.x + e.dir * 3 - camX);
    const cy = R0(e.y - 13 - camY);
    const blit = (ox, oy) => {
      if (e.dir > 0) ctx.drawImage(fr, cx - S.cx + ox, cy - S.cy + oy);
      else {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(fr, -S.cx + ox, -S.cy + oy);
        ctx.restore();
      }
    };
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, cx + e.dir * S.R * 0.5, cy - 2, glowCol(e.c, e.el), S.R * 0.95, (e.big ? 0.42 : 0.24) * (1 - f), 1.15, 0.8);
    ctx.globalAlpha = (e.big ? 0.4 : 0.22) * (1 - f);
    blit(-1, 0);
    blit(1, 0);
    blit(0, -1);
    blit(0, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = f > 0.75 ? (1 - f) / 0.25 : 1;
    blit(0, 0);
  },

  d_burst(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const R = e.r;
    const rx = R * (0.25 + 0.75 * easeOut3(clamp01(f / 0.7)));
    const ry = rx * 0.36;
    const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
    const rp = ramp(e.c);
    const gc = glowCol(e.c, e.el);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 1, gc, rx * 1.05, 0.3 * fade, 0.38);
    if (f < 0.25) drawGlow(ctx, x, y - 12, '#ffffff', 14 * (1 - f / 0.25) + 4, 0.5 * (1 - f / 0.25));
    if (e.el === 'water') this.waterWall(ctx, e, x, y, rx, ry, f, fade, true);
    else if (e.el === 'fire') this.fireWall(ctx, e, x, y, rx, ry, f, fade, true);
    this.shockRing(ctx, x, y, rx, ry, rp, fade, e.big);
    const r2 = R * 0.7 * easeOut(clamp01((f - 0.1) / 0.6));
    if (r2 > 4) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = rp[2];
      ringPx(ctx, x, y, r2, r2 * 0.36, 2, 1);
    }
    if (e.el === 'water') {
      this.waterWall(ctx, e, x, y, rx, ry, f, fade, false);
      if (!e.big) this.spinArcs(ctx, e, x, y - 7, rx * 0.62, fade, ['#ffffff', '#b3e5fc', '#29b6f6', '#01579b']);
    } else if (e.el === 'fire') this.fireWall(ctx, e, x, y, rx, ry, f, fade, false);
    else if (e.el === 'ice') this.iceSpikes(ctx, e, x, y, rx, f, fade);
    else if (e.el === 'wind') this.spinArcs(ctx, e, x, y - 8, rx * 0.8, fade, ['#ffffff', rp[1], rp[3], rp[5]]);
  },

  shockRing(ctx, x, y, rx, ry, rp, fade, big) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = rp[4];
    ringPx(ctx, x, y + 1, rx + 1, ry + 0.5, 2, 1);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, big ? 2 : 1);
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y - 1, rx - 1, ry - 0.5, 1, 1, 0.2, Math.PI - 0.2);
  },

  fireWall(ctx, e, x, y, rx, ry, f, fade, back) {
    const n = Math.max(14, Math.min(56, R0(rx * 0.5)));
    const rp = flameRamp(e.c, 'fire');
    const hmax = (e.big ? 28 : 21) * Math.sin(Math.PI * clamp01(f / 0.85));
    if (hmax < 1) return;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + i * 0.21;
      const s = Math.sin(a);
      if (back ? s >= 0 : s < 0) continue;
      const px = R0(x + Math.cos(a) * rx);
      const py = R0(y + s * ry);
      const fl = 0.6 + 0.4 * Math.sin(this.time * 21 + i * 2.7);
      const h = Math.max(3, R0(hmax * fl * (0.75 + 0.25 * Math.sin(i * 1.7))));
      ctx.globalAlpha = (back ? 0.65 : 0.95) * fade;
      for (let j = 0; j < h; j++) {
        const u = j / h;
        const wo = R0(6 * Math.pow(1 - u, 0.8)) + 1;
        const sw = R0(Math.sin(this.time * 15 + i + j * 0.35) * u * 1.6);
        ctx.fillStyle = u > 0.7 ? rp[4] : rp[3];
        ctx.fillRect(px - (wo >> 1) + sw, py - j, wo, 1);
        const wi = wo - 2;
        if (wi > 0) {
          ctx.fillStyle = u < 0.3 ? rp[1] : rp[2];
          ctx.fillRect(px - (wi >> 1) + sw, py - j, wi, 1);
          if (u < 0.25 && wi > 1) {
            ctx.fillStyle = rp[0];
            ctx.fillRect(px + sw, py - j, 1, 1);
          }
        }
      }
    }
  },

  waterWall(ctx, e, x, y, rx, ry, f, fade, back) {
    const hmax = (e.big ? 24 : 12) * Math.sin(Math.PI * clamp01(f / 0.8));
    if (hmax < 1) return;
    ctx.globalCompositeOperation = 'source-over';
    const lim = Math.floor(rx);
    for (let dx = -lim; dx <= lim; dx += 2) {
      const c = dx / rx;
      const sn = Math.sqrt(Math.max(0, 1 - c * c));
      const py = R0(y + (back ? -sn : sn) * ry);
      const wv = 0.6 + 0.4 * Math.sin(dx * 0.21 + e.t * 14 + (back ? 1.7 : 0));
      const h = Math.max(1, R0(hmax * wv * (0.5 + 0.5 * sn)));
      const px = x + dx;
      ctx.globalAlpha = (back ? 0.45 : 0.75) * fade;
      ctx.fillStyle = '#0277bd';
      ctx.fillRect(px, py - h, 2, h);
      ctx.fillStyle = '#29b6f6';
      ctx.fillRect(px, py - h, 2, Math.max(1, R0(h * 0.72)));
      ctx.fillStyle = '#81d4fa';
      ctx.fillRect(px, py - h, 2, Math.max(1, R0(h * 0.38)));
      ctx.globalAlpha = (back ? 0.55 : 0.95) * fade;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py - h - 1, 2, 2);
    }
  },

  iceSpikes(ctx, e, x, y, rx, f, fade) {
    ctx.globalCompositeOperation = 'source-over';
    if (!e.shattered) {
      for (const s of e.spikes) {
        const grow = easeOut3(clamp01((rx / e.r - s.d * 0.9) * 5));
        if (grow <= 0) continue;
        const px = R0(x + Math.cos(s.a) * e.r * s.d);
        const py = R0(y + Math.sin(s.a) * e.r * s.d * 0.36);
        const h = Math.max(1, R0(s.h * grow));
        const w = s.w;
        ctx.globalAlpha = 0.95 * fade;
        for (let j = 0; j < h; j++) {
          const u = j / h;
          const hw = Math.max(0, R0(w * (1 - u)));
          ctx.fillStyle = '#0d2a4a';
          ctx.fillRect(px - hw - 1, py - j, hw * 2 + 3, 1);
          ctx.fillStyle = '#4fc3f7';
          ctx.fillRect(px - hw, py - j, hw * 2 + 1, 1);
          ctx.fillStyle = '#e1f5fe';
          ctx.fillRect(px - hw, py - j, hw + 1, 1);
          if (u < 0.85) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px - hw, py - j, 1, 1);
          }
        }
        ctx.fillStyle = '#0d2a4a';
        ctx.fillRect(px, py - h, 1, 1);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 6, '#80d8ff', e.r * 0.5, 0.3 * fade, 0.5);
  },

  spinArcs(ctx, e, x, y, rr, fade, cols) {
    ctx.globalCompositeOperation = 'source-over';
    for (let b = 0; b < 3; b++) {
      const a0 = e.t * 14 + (b * TAU) / 3;
      const n = 32;
      for (let j = 0; j < n; j++) {
        const a = a0 - j * 0.07;
        const u = j / n;
        const sn = Math.sin(a);
        ctx.globalAlpha = fade * (1 - u * 0.7) * (sn > 0 ? 1 : 0.55);
        const th = u < 0.25 ? 4 : u < 0.6 ? 3 : 2;
        const px = R0(x + Math.cos(a) * rr);
        const py = R0(y + sn * rr * 0.36);
        ctx.fillStyle = cols[3];
        ctx.fillRect(px - 1, py - th + 1, 3, th + 1);
        ctx.fillStyle = u < 0.15 ? cols[0] : u < 0.5 ? cols[1] : cols[2];
        ctx.fillRect(px - 1, py - th, 3, th);
      }
    }
  },

  d_wave(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const u = Math.min(1, f / 0.8);
    const fade = f > 0.8 ? (1 - f) / 0.2 : 1;
    const hx = e.x + e.dir * e.range * u;
    const x = R0(hx - camX);
    const y = R0(e.y - 12 - camY);
    const gc = glowCol(e.c, e.el);
    if (e.p === 'arrow') {
      const big = e.range > 260;
      const len = Math.min(Math.abs(hx - e.x), big ? 140 : 100);
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < len; j += 2) {
        const v = 1 - j / len;
        ctx.globalAlpha = fade * v * 0.8;
        ctx.fillStyle = v > 0.7 ? '#ffffff' : gc;
        const th = v > 0.5 ? (big ? 3 : 2) : 1;
        ctx.fillRect(R0(x - e.dir * (j + 8)) - (e.dir < 0 ? 1 : 0), y - (th >> 1), 2, th);
      }
      drawGlow(ctx, x, y, gc, big ? 14 : 10, 0.65 * fade);
      drawGlow(ctx, x, y, '#ffffff', 5, 0.8 * fade);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = shade(gc, -0.35);
      const cl = Math.min(len, 60);
      ctx.fillRect(e.dir > 0 ? x - cl - 8 : x + 8, y + 1, cl, 1);
      ctx.globalAlpha = fade;
      const L = big ? 18 : 15;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.dir > 0 ? x - L : x, y, L, 1);
      ctx.fillStyle = gc;
      ctx.fillRect(e.dir > 0 ? x - L : x, y + 1, L, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - e.dir * 2, y - 2, 1, 5);
      ctx.fillRect(x - e.dir * 3, y - 3, 1, 1);
      ctx.fillRect(x - e.dir * 3, y + 3, 1, 1);
      ctx.fillRect(x + e.dir, y, 1, 1);
      ctx.fillStyle = gc;
      ctx.fillRect(x - e.dir * L, y - 2, 1, 2);
      ctx.fillRect(x - e.dir * (L - 2), y - 2, 1, 2);
      ctx.fillRect(x - e.dir * L, y + 2, 1, 2);
      ctx.fillRect(x - e.dir * (L - 2), y + 2, 1, 2);
      return;
    }
    // kiếm khí: lưỡi trăng khuyết lớn bay ngang
    const B = bladeSprite(e.c, 18, 7, e.dir > 0 ? 0 : 8, 1.25);
    const h = B.S >> 1;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x + e.dir * 8, y, gc, 18, 0.5 * fade, 1.2, 0.7);
    for (let k = 3; k >= 1; k--) {
      ctx.globalAlpha = fade * (0.42 - k * 0.1);
      ctx.drawImage(B.cv, R0(x - e.dir * k * 9) - h, y - h);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.drawImage(B.cv, x - h, y - h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * fade;
    ctx.drawImage(B.cv, x - h, y - h);
  },

  d_mark(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const env = f < 0.15 ? f / 0.15 : f > 0.7 ? (1 - f) / 0.3 : 1;
    const rx = e.r * (0.85 + 0.15 * env);
    const ry = rx * 0.34;
    const gc = glowCol(e.c, e.el);
    const rp = ramp(gc);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, gc, rx, 0.22 * env, 0.34);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.7 * env;
    ctx.fillStyle = rp[4];
    ringPx(ctx, x, y + 1, rx, ry, 2, 1);
    ctx.globalAlpha = 0.9 * env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, 1);
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y, rx - 1, ry - 0.5, 1, 1, 0.3, Math.PI - 0.3);
    const rot = e.t * 3;
    for (let k = 0; k < 8; k++) {
      const a0 = rot + (k * TAU) / 8;
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, rx * 0.7, ry * 0.7, 1, 1, a0, a0 + 0.35);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, rx * 0.7, ry * 0.7, 1, 1, a0, a0 + 0.35);
    }
  },

  d_meteor(ctx, e, camX, camY) {
    const fall = clamp01(e.t / e.hit);
    const gx = R0(e.x - camX);
    const gy = R0(e.y - camY);
    const water = e.el !== 'fire';
    const gc = water ? '#40c4ff' : '#ff6d00';
    const big = e.big;
    if (e.t < e.hit) {
      ctx.globalCompositeOperation = 'lighter';
      const pr = e.r * (0.55 - fall * 0.15);
      ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(e.t * 30));
      ctx.fillStyle = water ? '#80d8ff' : '#ff8a65';
      ringPx(ctx, gx, gy, pr, pr * 0.34, 2, 1);
      drawGlow(ctx, gx, gy, gc, pr, 0.25 * fall, 0.34);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 * fall;
      const sr = 4 + fall * 14;
      ctx.fillStyle = '#000000';
      ctx.fillRect(R0(gx - sr), gy - 1, R0(sr * 2), 3);
      ctx.fillRect(R0(gx - sr * 0.7), gy - 2, R0(sr * 1.4), 5);
      const ff = Math.pow(fall, 1.35);
      const x = R0(e.x - 70 + 70 * ff - camX);
      const y = R0(e.y - 165 + 155 * ff - camY);
      const ux = 70 / 170;
      const uy = 155 / 170;
      const tl = big ? 50 : 40;
      ctx.globalCompositeOperation = water ? 'source-over' : 'lighter';
      for (let j = 0; j < tl; j++) {
        const v = 1 - j / tl;
        const w = Math.max(1, R0((big ? 9 : 7) * v));
        const wob = water ? Math.sin(j * 0.45 - e.t * 30) * 3 * v : 0;
        ctx.globalAlpha = (water ? 0.55 : 0.6) * v;
        ctx.fillStyle = v > 0.8 ? '#ffffff' : v > 0.5 ? (water ? '#81d4fa' : '#ffca28') : water ? '#0288d1' : gc;
        ctx.fillRect(R0(x - ux * j - w / 2 + wob), R0(y - uy * j - w / 2), w, w);
      }
      if (water) {
        for (let j = 0; j < tl; j++) {
          const v = 1 - j / tl;
          ctx.globalAlpha = 0.9 * v;
          ctx.fillStyle = j % 3 ? '#e1f5fe' : '#ffffff';
          ctx.fillRect(R0(x - ux * j + Math.sin(j * 0.45 - e.t * 30 + Math.PI) * 5 * v), R0(y - uy * j), 1, 1);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, x, y, gc, big ? 18 : 14, 0.6);
      drawGlow(ctx, x, y, '#ffffff', 6, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const M = meteorSprite(e.c, water ? 'water' : 'fire', big ? 6 : 5);
      const h = M.S >> 1;
      ctx.drawImage(M.cv, x - h, y - h);
    } else {
      const f = (e.t - e.hit) / (e.life - e.hit);
      ctx.globalCompositeOperation = 'lighter';
      const bh = (big ? 120 : 95) * (0.6 + 0.4 * easeOut(clamp01(f * 4)));
      const bw = R0((big ? 34 : 26) * (1 - f * 0.6));
      ctx.globalAlpha = 0.75 * (1 - f) * (1 - f);
      ctx.drawImage(beamSprite(gc, 34, 120), gx - (bw >> 1), R0(gy - bh), bw, R0(bh));
      drawGlow(ctx, gx, gy - 4, gc, e.r * 0.7, 0.4 * (1 - f), 0.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 * (1 - f);
      ctx.fillStyle = water ? '#01579b' : '#1a0d08';
      const cr = 16 + (big ? 6 : 0);
      ctx.fillRect(gx - cr, gy - 1, cr * 2, 3);
      ctx.fillRect(R0(gx - cr * 0.6), gy - 2, R0(cr * 1.2), 5);
    }
  },

  d_whirl(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const env = f < 0.15 ? easeOut(f / 0.15) : f > 0.75 ? (1 - f) / 0.25 : 1;
    const x0 = e.x - camX;
    const y0 = R0(e.y - camY);
    const H = (e.big ? 78 : 58) * (0.55 + 0.45 * env);
    const W = Math.min(e.big ? 34 : 24, e.r * 0.34) * (0.4 + 0.6 * env);
    const rp = ramp(e.c);
    const sway = (p) => Math.sin(p * 3.2 + e.t * 5) * 4 * p;
    const rad = (p) => 2 + Math.pow(p, 1.25) * W;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x0, y0 - 2, glowCol(e.c, e.el), W + 10, 0.35 * env, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    const step = 3;
    const layers = Math.max(4, Math.floor(H / step));
    for (let i = 0; i <= layers; i++) {
      const p = i / layers;
      const r = rad(p);
      ctx.globalAlpha = 0.3 * env;
      ctx.fillStyle = rp[2];
      ctx.fillRect(R0(x0 + sway(p) - r), R0(y0 - p * H), R0(r * 2), step);
      ctx.globalAlpha = 0.55 * env;
      ctx.fillStyle = rp[5];
      ctx.fillRect(R0(x0 + sway(p) - r - 1), R0(y0 - p * H), 1, step);
      ctx.fillRect(R0(x0 + sway(p) + r), R0(y0 - p * H), 1, step);
    }
    this.whirlDebris(ctx, e, x0, y0, H, rad, sway, env, false);
    for (let i = 0; i <= layers; i++) {
      const p = i / layers;
      const r = rad(p);
      const cx = x0 + sway(p);
      const cy = y0 - p * H;
      const rot = e.t * 15 + p * 6 + i * 1.3;
      const n = Math.max(6, R0(r * 1.7));
      for (let j = 0; j < n; j++) {
        const u = j / n;
        const a = rot - u * Math.PI * 1.05;
        const sn = Math.sin(a);
        const front = sn > 0;
        const px = R0(cx + Math.cos(a) * r);
        const py = R0(cy + sn * r * 0.3);
        if (front) {
          ctx.globalAlpha = env * (1 - u * 0.5);
          ctx.fillStyle = u < 0.12 ? '#ffffff' : u < 0.35 ? rp[1] : u < 0.7 ? rp[2] : rp[3];
          ctx.fillRect(px, py - 1, 2, 2);
          if (u > 0.5) {
            ctx.fillStyle = rp[4];
            ctx.fillRect(px, py + 1, 2, 1);
          }
        } else {
          ctx.globalAlpha = env * 0.5 * (1 - u * 0.5);
          ctx.fillStyle = rp[4];
          ctx.fillRect(px, py, 2, 1);
        }
      }
    }
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x0 + sway(1), y0 - H, rad(1), rad(1) * 0.3, 1, 1, e.t * 12, e.t * 12 + 2.4);
    ctx.fillStyle = rp[1];
    ringPx(ctx, x0 + sway(1), y0 - H, rad(1), rad(1) * 0.3, 1, 1, e.t * 12 + 2.4, e.t * 12 + 5);
    this.whirlDebris(ctx, e, x0, y0, H, rad, sway, env, true);
  },

  whirlDebris(ctx, e, x0, y0, H, rad, sway, env, front) {
    ctx.globalCompositeOperation = 'source-over';
    for (const d of e.deb) {
      const p = (d.h + e.t * d.vh) % 1;
      const a = d.a + e.t * d.w;
      const sn = Math.sin(a);
      if (front !== sn > 0) continue;
      const rr = rad(p) + 3;
      const px = R0(x0 + sway(p) + Math.cos(a) * rr);
      const py = R0(y0 - p * H + sn * rr * 0.3);
      ctx.globalAlpha = env * (front ? 1 : 0.55);
      ctx.fillStyle = d.c;
      if (d.kind === 'rock') {
        ctx.fillRect(px, py, 2, 2);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(px + 1, py + 1, 1, 1);
      } else {
        ctx.fillRect(px, py, 2, 1);
        ctx.fillStyle = shade(d.c, -0.35);
        ctx.fillRect(px + (Math.floor(e.t * 10 + d.a) & 1), py + 1, 1, 1);
      }
    }
  },

  d_aura(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.12 ? f / 0.12 : f > 0.65 ? (1 - f) / 0.35 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    const gc = glowCol(e.c, e.el);
    ctx.globalCompositeOperation = 'lighter';
    const bw = R0(18 + 6 * Math.sin(e.t * 10));
    ctx.globalAlpha = 0.45 * env;
    ctx.drawImage(beamSprite(gc, 24, 72, false), x - (bw >> 1), y - 70, bw, 72);
    drawGlow(ctx, x, y - 12, gc, 16, 0.35 * env);
    for (let k = 0; k < 3; k++) {
      const p = (e.t * 1.4 + k / 3) % 1;
      const r = 5 + p * 20;
      ctx.globalAlpha = env * (1 - p) * 0.9;
      ctx.fillStyle = k === 0 ? '#ffffff' : gc;
      ringPx(ctx, x, y, r, r * 0.3, 1, 1);
    }
    // vòng phù văn
    ctx.globalCompositeOperation = 'source-over';
    const rp = ramp(gc);
    const rot = e.t * 4;
    ctx.globalAlpha = 0.85 * env;
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, 13, 4, 1, 1, rot + (k * TAU) / 6, rot + (k * TAU) / 6 + 0.5);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, 13, 4, 1, 1, rot + (k * TAU) / 6, rot + (k * TAU) / 6 + 0.5);
    }
    // lưỡi hào quang hai bên thân
    const T = this.time;
    for (let k = 0; k < 8; k++) {
      const side = k < 4 ? -1 : 1;
      const dx = side * (7 + (k % 4) * 2);
      const h = R0((20 - (k % 4) * 4) * env * (0.65 + 0.35 * Math.sin(T * 17 + k * 2.1)));
      for (let j = 0; j < h; j++) {
        const u = j / Math.max(1, h);
        ctx.globalAlpha = 0.75 * env * (1 - u * 0.6);
        ctx.fillStyle = u > 0.75 ? rp[1] : u > 0.35 ? rp[2] : rp[3];
        const sw = R0(Math.sin(T * 9 + k + j * 0.3) * u * 1.5);
        ctx.fillRect(x + dx + sw, y - 2 - j, u > 0.6 ? 1 : 2, 1);
      }
    }
  },

  d_heal(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.12 ? f / 0.12 : f > 0.65 ? (1 - f) / 0.35 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * env;
    ctx.drawImage(beamSprite(e.c, 20, 60, false), x - 10, y - 58);
    drawGlow(ctx, x, y - 1, e.c, 20, 0.45 * env, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    const r = 15 + 3 * easeOut(clamp01(f * 3));
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = shade(e.c, -0.55);
    ringPx(ctx, x, y + 1, r, r * 0.32, 2, 1);
    ctx.globalAlpha = 0.95 * env;
    ctx.fillStyle = e.c;
    ringPx(ctx, x, y, r, r * 0.32, 2, 1);
    ctx.fillStyle = '#ffffff';
    const rot = -e.t * 3;
    for (let k = 0; k < 4; k++) ringPx(ctx, x, y, r * 0.66, r * 0.66 * 0.32, 1, 1, rot + (k * TAU) / 4, rot + (k * TAU) / 4 + 0.9);
    for (let k = 0; k < 6; k++) {
      const a = e.t * 2 + (k * TAU) / 6;
      const px = R0(x + Math.cos(a) * r);
      const py = R0(y + Math.sin(a) * r * 0.32);
      ctx.fillRect(px - 1, py, 3, 1);
      ctx.fillRect(px, py - 1, 1, 3);
    }
  },

  d_dash(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const fade = 1 - f;
    const y = R0(e.y - camY);
    const sil = silhouette(glowCol(e.c, e.el));
    ctx.globalCompositeOperation = 'source-over';
    for (let k = 1; k <= 5; k++) {
      const u = k / 6;
      const px = R0(e.x0 + (e.x1 - e.x0) * u - camX);
      ctx.globalAlpha = fade * (0.18 + u * 0.45);
      if (e.dir > 0) ctx.drawImage(sil, px - 8, y - sil.height);
      else {
        ctx.save();
        ctx.translate(px, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sil, -8, y - sil.height);
        ctx.restore();
      }
    }
    const xa = Math.min(e.x0, e.x1) - camX;
    const span = Math.abs(e.x1 - e.x0);
    for (const l of e.lines) {
      const px = R0(xa + l.u * span + e.dir * f * 20);
      ctx.globalAlpha = 0.85 * fade;
      const len = R0(l.len * (1 - f * 0.5));
      ctx.fillStyle = shade(e.c, -0.45);
      ctx.fillRect(e.dir > 0 ? px - len : px, y + R0(l.y) + 1, len, 1);
      ctx.fillStyle = l.c;
      ctx.fillRect(e.dir > 0 ? px - len : px, y + R0(l.y), len, 1);
    }
    for (let k = 0; k < 3; k++) {
      const t0 = 0.04 + k * 0.05;
      const lt = (e.t - t0) / 0.3;
      if (lt <= 0 || lt >= 1) continue;
      const cx = R0(e.x0 + (e.x1 - e.x0) * (0.3 + k * 0.3) - camX);
      const cy = y - 13;
      const g = easeOut3(clamp01(lt * 3)) * 9;
      ctx.globalAlpha = 1 - lt;
      ctx.fillStyle = shade(e.c, -0.45);
      linePx(ctx, cx - g + 1, cy - g, cx + g + 1, cy + g);
      linePx(ctx, cx - g + 1, cy + g, cx + g + 1, cy - g);
      ctx.fillStyle = '#ffffff';
      linePx(ctx, cx - g, cy - g, cx + g, cy + g);
      ctx.fillStyle = e.c;
      linePx(ctx, cx - g, cy + g, cx + g, cy - g);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
    }
  },

  d_level(ctx, e, camX, camY) {
    const o = e.get();
    if (!o) return;
    const f = e.t / e.life;
    const env = f < 0.08 ? f / 0.08 : f > 0.55 ? (1 - f) / 0.45 : 1;
    const x = R0(o.x - camX);
    const y = R0(o.y - camY);
    const cy = y - 14;
    // cột sáng vàng + lõi trắng
    ctx.globalCompositeOperation = 'lighter';
    const bw = R0(28 * (0.7 + 0.3 * env) + Math.sin(e.t * 18) * 2);
    bodyBeam(ctx, beamSprite('#ffd54f', 32, 130), x, y, bw, 0.65 * env, 0.4);
    bodyBeam(ctx, beamSprite('#ffffff', 10, 130), x, y, 8, 0.55 * env, 0.15);
    drawGlow(ctx, x, cy, '#ffe082', 20, 0.16 * env);
    drawGlow(ctx, x, y, '#ffd54f', 30, 0.3 * env, 0.32);
    for (let k = 0; k < 2; k++) {
      const p = (e.t * 1.1 + k / 2) % 1;
      const r = 8 + p * 34;
      ctx.globalAlpha = env * (1 - p);
      ctx.fillStyle = k === 0 ? '#ffffff' : '#ffd54f';
      ringPx(ctx, x, y, r, r * 0.3, 2, 1);
    }
    // vòng phù văn dưới chân + vòng phù văn bay lên quanh thân
    const grow = easeOut3(clamp01(e.t / 0.3));
    this.runeRing(ctx, x, y, 24 * grow, 8 * grow, e.t * 2.2, 8, '#ffd54f', env, true);
    const up = easeOut(clamp01(e.t / 1.1));
    this.runeRing(ctx, x, R0(y - 4 - up * 34), 15, 5, -e.t * 3.4, 6, '#fff59d', env * (1 - up * 0.5), false);
  },
};
