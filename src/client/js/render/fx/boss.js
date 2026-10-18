// Hiệu ứng chiêu boss: vùng cảnh báo, động đất, gầm, triệu hồi, tia, bùng nổ.
import { shade } from '../sprites.js';
import { TAU, rnd, pick, clamp01, easeOut, easeOut3, R0, elemOf, EP, ramp, flameRamp, glowCol, drawGlow } from './util.js';
import { beamSprite } from './sprites.js';
import { ringPx, linePx, fillEllipse, SPRITE_OUTLINE, runeSprite, bangSprite } from './shapes.js';

export const bossMethods = {
  // Rung của chiêu boss: tăng chậm theo cỡ boss, giảm theo khoảng cách tới khung nhìn
  bossShake(x, y, base, sc) {
    this.shakeAt(x, y, base * Math.min(1.4, 0.7 + 0.3 * sc));
  },

  rock(x, y, vx, vy, c, floor, s) {
    return this.spawn('rock', x, y, vx, vy, rnd(0.7, 1.1), c, { g: 420, floor, s: s || (Math.random() < 0.5 ? 3 : 4) });
  },

  bsQuake(x, y, c, sc) {
    const R = 90 * sc;
    const g = Math.min(sc, 2);
    const cracks = [];
    for (const side of [-1, 1]) {
      for (let m = 0; m < 3; m++) {
        const reach = R * (m === 2 ? rnd(0.35, 0.55) : rnd(0.75, 1));
        const tilt = (m - 1) * rnd(0.12, 0.22);
        const pts = [0, 0];
        let px = 0;
        let py = 0;
        while (Math.abs(px) < reach) {
          px += side * rnd(5, 10);
          py = Math.max(-R * 0.22, Math.min(R * 0.22, py + tilt * 7 + rnd(-1.6, 1.6)));
          pts.push(px, py);
        }
        cracks.push(pts);
      }
    }
    this.add({ k: 'quake', ground: true, x, y, c, sc, R, cracks, life: 0.95, acc: 0 });
    // vòng bụi đất (màu đất, không cộng sáng) để khác hẳn vòng trắng của nova
    const RR = Math.min(150, R);
    this.spawn('dring', x, y, 0, 0, 0.55, '#a1887f', { s: 6, s1: RR * 0.95, ry: 0.3, w: 3 });
    this.spawn('dring', x, y, 0, 0, 0.7, '#8d6e63', { s: 4, s1: RR * 0.68, ry: 0.3, w: 2 });
    this.spawn('glow', x, y - 4, 0, 0, 0.25, c, { s: 10 * g, s1: 20 * g, a: 0.4, add: true });
    const rocks = ['#8d6e63', '#6d4c41', '#a1887f', '#795548'];
    for (let i = 0; i < R0(16 * g); i++) {
      const a = rnd(-1, 1);
      this.rock(x + a * R * 0.6, y - rnd(0, 3), a * rnd(40, 120), -rnd(90, 210), pick(rocks), y + rnd(-3, 4));
    }
    for (let i = 0; i < R0(10 * g); i++) {
      const sm = this.smoke(x + rnd(-R, R) * 0.7, y - rnd(0, 4), pick(['#bcaaa4', '#a1887f', '#d7ccc8']), 3, 8, 0.9, 0.6);
      if (sm) sm.vx = (sm.x - x) * 0.9;
    }
    this.bossShake(x, y, 6, sc);
  },

  bsRoar(x, y, c, sc) {
    const hy = y - 26 * sc;
    const g = Math.min(sc, 2);
    this.add({ k: 'roar', x, y, hy, c, sc, R: 95 * sc, life: 0.8, acc: 0 });
    this.spawn('glow', x, hy, 0, 0, 0.2, '#ffffff', { s: 8 * g, s1: 16 * g, a: 0.45, add: true });
    for (let i = 0; i < R0(8 * g); i++) {
      const sm = this.smoke(x + rnd(-10, 10) * sc, y - 1, pick(['#d7ccc8', '#bcaaa4']), 2, 6, 0.6, 0.5);
      if (sm) sm.vx = (i % 2 ? 1 : -1) * rnd(50, 110);
    }
    this.bossShake(x, y, 3, sc);
  },

  bsSummon(x, y, c, sc) {
    const g = Math.min(sc, 2);
    this.add({ k: 'summon', ground: true, x, y, c, sc, R: 34 * sc, life: 1.25, acc: 0, popped: false, dark: shade(c, -0.6), lite: shade(c, 0.5) });
    this.spawn('glow', x, y - 2, 0, 0, 0.3, c, { s: 10 * g, s1: 30 * g, a: 0.35, add: true });
  },

  bsBeam(x, y, c, sc) {
    const g = Math.min(sc, 2);
    this.add({ k: 'beam', x, y, c, sc, life: 0.85, acc: 0 });
    const gc = glowCol(c, elemOf(c));
    const brp = ramp(gc);
    this.spawn('glow', x, y - 8, 0, 0, 0.25, '#ffffff', { s: 12 * g, s1: 22 * g, a: 0.6, add: true });
    // vòng sóng theo màu nguyên tố của tia (không phải vòng trắng)
    this.spawn('dring', x, y, 0, 0, 0.45, brp[2], { s: 6, s1: 46 * g, ry: 0.32, w: 2 });
    this.spawn('dring', x, y, 0, 0, 0.6, brp[3], { s: 4, s1: 32 * g, ry: 0.32, w: 2 });
    const sp = EP[elemOf(c)].spark;
    for (let i = 0; i < R0(22 * g); i++) {
      const a = rnd(-Math.PI, 0);
      const v = rnd(50, 150);
      this.spawn('spark', x + rnd(-4, 4), y - 2, Math.cos(a) * v, Math.sin(a) * v, rnd(0.25, 0.5), i % 2 ? '#ffffff' : pick(sp), { g: 160, drag: 2, s: 3, add: true, floor: y });
    }
    this.bossShake(x, y, 4, sc);
  },

  bsNova(x, y, c, sc) {
    const el = elemOf(c);
    // cỡ hình ảnh tối đa 2: sc lớn chỉ mở rộng vòng mặt đất, không phủ trắng màn hình
    const g = Math.min(sc, 2);
    const cy = y - 12 * g;
    // vòng mặt đất tối đa 160px: lớn hơn thì elip cao quá khung nhìn 150px
    const R = Math.min(160, 100 * sc);
    this.add({ k: 'nova', x, y, cy, c, el, sc, g, R, life: 0.8, acc: 0 });
    this.spawn('glow', x, cy, 0, 0, 0.22, '#ffffff', { s: 16 * g, s1: Math.min(60, 36 * g), a: 0.75 - 0.15 * (g - 1), add: true });
    this.spawn('ring', x, y, 0, 0, 0.55, '#ffffff', { s: 10, s1: R, ry: 0.34, add: true, w: 3 });
    this.spawn('ring', x, y, 0, 0, 0.75, glowCol(c, el), { s: 6, s1: R * 0.85, ry: 0.34, add: true, w: 2 });
    const sp = EP[el].spark;
    for (let i = 0; i < R0(30 * g); i++) {
      const a = Math.random() * TAU;
      const v = rnd(80, 200) * Math.min(1.6, sc);
      this.spawn('spark', x, cy, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 20, rnd(0.3, 0.6), i % 3 ? pick(sp) : '#ffffff', { g: 110, drag: 2.2, s: 3, add: true });
    }
    // khói sáng ấm, mỏng, bay ra ngoài và lên trên thay cho khói đen của nổ thường
    if (el === 'fire' || el === 'water' || el === 'ice') this.explode(x, cy, 40 * g, c, el === 'fire' ? 'fire' : 'water', true, ['#ffccbc', '#ffe0b2', '#d7ccc8']);
    else for (let i = 0; i < 12; i++) {
      const st = this.star(x, cy, i % 2 ? '#ffffff' : c, 5, 0.5);
      if (st) {
        st.vx = Math.cos((i / 12) * TAU) * 120;
        st.vy = Math.sin((i / 12) * TAU) * 70;
        st.drag = 2.5;
      }
    }
    this.bossShake(x, y, 7, sc);
  },

  u_tele(e, dt) {
    if (e.t > e.dur) return;
    const f = e.t / e.dur;
    const k = this.tick(e, dt, e.kind === 'line' ? 10 + e.len * 0.08 : 8 + e.r * 0.12);
    const lit = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      if (e.kind === 'line') {
        const px = e.x + e.dir * Math.random() * e.len * f;
        this.spawn('px', px, e.y + rnd(-e.h, e.h), 0, -rnd(15, 35), rnd(0.3, 0.55), i % 2 ? '#ffffff' : lit, { add: true });
      } else if (e.kind === 'pillar' && i % 2) {
        this.spawn('px', e.x + rnd(-e.r, e.r) * 0.6, e.y - rnd(60, 150), 0, rnd(120, 220), rnd(0.3, 0.5), i % 4 === 1 ? '#ffffff' : lit, { add: true, s: 1, s1: 1 });
      } else {
        const a = Math.random() * TAU;
        this.spawn('px', e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r * 0.34, 0, -rnd(15, 35), rnd(0.3, 0.55), i % 2 ? '#ffffff' : lit, { add: true });
      }
    }
  },

  u_quake(e, dt) {
    const f = e.t / e.life;
    if (f > 0.45) return;
    const k = this.tick(e, dt, 26 * e.sc);
    for (let i = 0; i < k; i++) {
      const pts = pick(e.cracks);
      const j = (Math.random() * (pts.length >> 1)) << 1;
      const px = e.x + pts[j];
      const py = e.y + pts[j + 1];
      if (i % 2) this.spawn('ember', px, py, rnd(-10, 10), -rnd(30, 70), rnd(0.4, 0.8), pick(EP.fire.spark), { add: true, drag: 1 });
      else this.smoke(px, py - 1, pick(['#bcaaa4', '#a1887f']), 1, 4, 0.6, 0.45);
    }
  },

  u_roar(e, dt) {
    const f = e.t / e.life;
    if (f > 0.6) return;
    const k = this.tick(e, dt, 50 * e.sc);
    for (let i = 0; i < k; i++) {
      const d = i % 2 ? 1 : -1;
      this.wline(e.x + d * rnd(8, 20) * e.sc, e.hy + rnd(-20, 20) * e.sc, d * rnd(160, 260), rnd(6, 14), i % 3 ? '#ffffff' : e.c, 0.3);
    }
  },

  u_summon(e, dt) {
    const f = e.t / e.life;
    const R = e.R;
    if (f < 0.75) {
      const k = this.tick(e, dt, 50 * e.sc);
      for (let i = 0; i < k; i++) {
        const a = Math.random() * TAU;
        const rr = R * rnd(0.3, 1);
        this.spawn('px', e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr * 0.34, 0, -rnd(30, 80), rnd(0.5, 0.9), i % 3 ? e.lite : '#ffffff', { add: true, s: 2, s1: 1 });
      }
    }
    if (!e.popped && e.t >= 0.5) {
      e.popped = true;
      const g = Math.min(2, e.sc);
      this.spawn('glow', e.x, e.y - 18 * e.sc, 0, 0, 0.3, '#ffffff', { s: 10 * g, s1: 22 * g, a: 0.6, add: true });
      this.spawn('vring', e.x, e.y - 18 * e.sc, 0, 0, 0.4, e.c, { s: 6, s1: 30 * e.sc });
      for (let i = 0; i < 14; i++) {
        const st = this.star(e.x, e.y - 18 * e.sc, i % 2 ? e.lite : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos((i / 14) * TAU) * 80;
          st.vy = Math.sin((i / 14) * TAU) * 60 - 20;
          st.drag = 2.4;
        }
      }
      for (let i = 0; i < 8; i++) this.smoke(e.x + rnd(-R, R) * 0.6, e.y - rnd(0, 6), pick([e.dark, '#3a2a48', '#4a3858']), 3, 8, 1, 0.42);
      this.bossShake(e.x, e.y, 2.5, e.sc);
    }
  },

  u_beam(e, dt) {
    const f = e.t / e.life;
    if (f > 0.6) return;
    const w = 10 * e.sc;
    const k = this.tick(e, dt, 60 * e.sc);
    const lit = ramp(e.c)[1];
    for (let i = 0; i < k; i++) {
      if (i % 3 === 2) this.spawn('spark', e.x + rnd(-w, w), e.y - 2, rnd(-60, 60), -rnd(40, 110), rnd(0.25, 0.45), i % 2 ? '#ffffff' : lit, { g: 160, drag: 2, s: 2, add: true, floor: e.y });
      else this.spawn('px', e.x + rnd(-w, w), e.y - rnd(80, 200), 0, rnd(260, 380), rnd(0.25, 0.4), i % 2 ? '#ffffff' : lit, { add: true, s: 1, s1: 1 });
    }
  },

  u_nova(e, dt) {
    const f = e.t / e.life;
    if (f > 0.5) return;
    const k = this.tick(e, dt, 40 * e.sc);
    const rx = e.R * easeOut3(clamp01(f / 0.6));
    for (let i = 0; i < k; i++) {
      const a = Math.random() * TAU;
      const px = e.x + Math.cos(a) * rx;
      const py = e.y + Math.sin(a) * rx * 0.34;
      if (e.el === 'fire') this.flame(px, py - 2, Math.cos(a) * 20, -rnd(30, 60), flameRamp(e.c, 'fire'), 3, 0.45);
      else if (e.el === 'water' || e.el === 'ice') this.drop(px, py - 2, Math.cos(a) * 40, -rnd(50, 120), pick(EP[e.el].drop), py + 2);
      else if (e.el === 'wind') this.leaf(px, py - 4, Math.cos(a) * 80, -rnd(20, 60));
      else this.spawn('spark', px, py - 3, Math.cos(a) * 40, -rnd(20, 60), 0.3, i % 2 ? '#ffffff' : e.c, { g: 100, s: 2, add: true });
    }
  },

  // Vòng phù văn (elip dẹt), chữ phía sau mờ hơn để tạo chiều sâu
  runeRing(ctx, x, y, rx, ry, rot, n, c, a, line) {
    if (a <= 0.01 || rx < 2) return;
    const rp = ramp(c);
    ctx.globalCompositeOperation = 'source-over';
    if (line) {
      ctx.globalAlpha = 0.7 * a;
      ctx.fillStyle = rp[4];
      ringPx(ctx, x, y + 1, rx, ry, 2, 1);
      ctx.globalAlpha = 0.9 * a;
      ctx.fillStyle = rp[2];
      ringPx(ctx, x, y, rx, ry, 2, 1);
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, rx * 0.72, ry * 0.72, 1, 1);
    }
    for (let k = 0; k < n; k++) {
      const ang = rot + (k * TAU) / n;
      const sn = Math.sin(ang);
      const gx = R0(x + Math.cos(ang) * rx);
      const gy = R0(y + sn * ry);
      if (sn > 0) {
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(ctx, gx, gy, c, 6, 0.35 * a);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = a * (sn > 0 ? 1 : 0.45);
      ctx.drawImage(runeSprite(c, k), gx - 3, gy - 3);
    }
  },

  // ================= CẢNH BÁO & CHIÊU BOSS =================
  d_tele(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const rp = ramp(e.c);
    // sau thời gian cảnh báo: chớp trắng rồi tắt
    if (e.t > e.dur) {
      const q = 1 - (e.t - e.dur) / (e.life - e.dur);
      ctx.globalAlpha = 0.55 * q;
      ctx.fillStyle = '#ffffff';
      if (e.kind === 'line') {
        const x0 = e.dir > 0 ? x : x - e.len;
        ctx.fillRect(x0, y - e.h, R0(e.len), e.h * 2 + 1);
      } else fillEllipse(ctx, x, y, e.r, Math.max(4, e.r * 0.34));
      return;
    }
    const f = e.t / e.dur;
    const env = clamp01(e.t / 0.12);
    // nhịp đập 3Hz -> 9Hz (pha = tích phân tần số), đổi độ sáng mượt chứ không bật/tắt
    const pulse = 0.5 + 0.5 * Math.sin(TAU * (3 * e.t + (3 * e.t * e.t) / e.dur));
    const hot = env * pulse * (0.35 + 0.55 * f);
    if (e.kind === 'line') {
      const L = R0(e.len);
      const H = e.h;
      const x0 = e.dir > 0 ? x : x - L;
      ctx.globalCompositeOperation = 'lighter';
      if (H <= 15) drawGlow(ctx, x0 + (L >> 1), y, e.c, H * 2, 0.2 * env * (0.6 + 0.4 * f), 1, L / (H * 4));
      ctx.globalCompositeOperation = 'source-over';
      // viền tối ngoài cùng để đọc được trên mọi nền
      ctx.globalAlpha = 0.8 * env;
      ctx.fillStyle = SPRITE_OUTLINE;
      ctx.fillRect(x0 - 1, y - H - 1, L + 2, 1);
      ctx.fillRect(x0 - 1, y + H + 1, L + 2, 1);
      ctx.fillRect(x0 - 1, y - H, 1, H * 2 + 1);
      ctx.fillRect(x0 + L, y - H, 1, H * 2 + 1);
      ctx.globalAlpha = 0.34 * env;
      ctx.fillStyle = rp[4];
      ctx.fillRect(x0, y - H, L, H * 2 + 1);
      const fl = R0(L * f);
      ctx.globalAlpha = 0.58 * env;
      ctx.fillStyle = rp[3];
      ctx.fillRect(e.dir > 0 ? x : x - fl, y - H, fl, H * 2 + 1);
      ctx.globalAlpha = 0.95 * env;
      ctx.fillStyle = rp[1];
      ctx.fillRect(x + e.dir * fl - (e.dir > 0 ? 1 : 0), y - H, 1, H * 2 + 1);
      // viền màu + lớp trắng đập theo nhịp
      ctx.globalAlpha = env;
      ctx.fillStyle = rp[2];
      ctx.fillRect(x0, y - H, L, 1);
      ctx.fillRect(x0, y + H, L, 1);
      ctx.fillRect(x0, y - H, 1, H * 2 + 1);
      ctx.fillRect(x0 + L - 1, y - H, 1, H * 2 + 1);
      ctx.globalAlpha = hot;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0, y - H, L, 1);
      ctx.fillRect(x0, y + H, L, 1);
      // mũi tên ">" chạy theo hướng đánh, cao theo bề dày dải
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.75 * env;
      const ah = Math.max(2, Math.min(H - 2, 6));
      const gap = 10 + ah * 2;
      const off = (e.t * 46) % gap;
      for (let s = off; s < L - ah - 1; s += gap) {
        const cx = R0(e.dir > 0 ? x0 + s : x0 + L - s);
        for (let j = -ah; j <= ah; j++) ctx.fillRect(cx - e.dir * Math.abs(j), y + j, 2, 1);
      }
      return;
    }
    const rx = e.r;
    const ry = Math.max(4, rx * 0.34);
    if (e.kind === 'pillar') {
      // cột báo trước chỗ trụ giáng xuống: lớp màu thường + lớp sáng, hai mép tối
      const bw = Math.max(6, R0(rx * 1.4));
      const top = y - 170;
      ctx.globalAlpha = (0.3 + 0.35 * f) * env;
      ctx.drawImage(beamSprite(rp[3], 24, 120, false), x - (bw >> 1), top, bw, 172);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.1 + 0.22 * f) * env * (0.75 + 0.25 * pulse);
      ctx.drawImage(beamSprite(e.c, 24, 120, false), x - (bw >> 1), top, bw, 172);
      ctx.globalCompositeOperation = 'source-over';
      const ex = [x - (bw >> 1) - 1, x + (bw >> 1)];
      for (let s = 0; s < 5; s++) {
        const a = (1 - s / 5) * env;
        ctx.globalAlpha = 0.55 * a;
        ctx.fillStyle = SPRITE_OUTLINE;
        ctx.fillRect(ex[0], y - 20 * (s + 1), 1, 20);
        ctx.fillRect(ex[1], y - 20 * (s + 1), 1, 20);
        ctx.globalAlpha = 0.8 * a;
        ctx.fillStyle = rp[2];
        ctx.fillRect(ex[0] + 1, y - 20 * (s + 1), 1, 20);
        ctx.fillRect(ex[1] - 1, y - 20 * (s + 1), 1, 20);
      }
    }
    if (rx <= 60) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, x, y, e.c, rx, 0.18 * env * (0.6 + 0.4 * f), 0.34);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 0.34 * env;
    ctx.fillStyle = rp[4];
    fillEllipse(ctx, x, y, rx, ry);
    const fr = rx * f;
    if (fr > 1) {
      ctx.globalAlpha = 0.55 * env;
      ctx.fillStyle = rp[3];
      fillEllipse(ctx, x, y, fr, fr * (ry / rx));
      ctx.globalAlpha = 0.95 * env;
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, y, fr, fr * (ry / rx), 1, 1);
    }
    // viền tối ngoài cùng + bóng dưới
    ctx.globalAlpha = 0.8 * env;
    ctx.fillStyle = SPRITE_OUTLINE;
    ringPx(ctx, x, y, rx + 2, ry + 1, 1, 1);
    ctx.fillStyle = rp[5];
    ringPx(ctx, x, y + 1, rx, ry, 2, 1);
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, rx, ry, 2, 1);
    ctx.globalAlpha = hot;
    ctx.fillStyle = '#ffffff';
    ringPx(ctx, x, y, rx, ry, 2, 1);
    // vạch đứt quay chậm bên ngoài
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = rp[3];
    const rot = e.t * 1.5;
    const seg = Math.min(0.28, 14 / rx);
    for (let k = 0; k < 10; k++) {
      const a0 = rot + (k * TAU) / 10;
      ringPx(ctx, x, y, rx + 5, ry + 2.5, 2, 1, a0, a0 + seg);
    }
  },

  // Lượt vẽ trên cùng (sau hạt): dấu "!" luôn hiện, chỉ nảy nhanh dần
  o_tele(ctx, e, camX, camY) {
    if (e.t > e.dur) return;
    const f = e.t / e.dur;
    const bx = e.kind === 'line' ? e.x + e.dir * 8 : e.x;
    const x = R0(bx - camX);
    const y = R0(e.y - camY);
    const hop = R0(Math.abs(Math.sin(e.t * (6 + 8 * f))) * (2 + 2 * f));
    // cam đỏ để không nhầm với dấu "!" vàng nhiệm vụ trên đầu NPC
    const bg = bangSprite('#ff6d3a');
    ctx.globalAlpha = clamp01(e.t / 0.12);
    ctx.drawImage(bg, x - 2, y - 13 - hop);
  },

  d_quake(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = e.x - camX;
    const y = e.y - camY;
    const rv = easeOut3(clamp01(e.t / 0.22));
    const fade = f > 0.6 ? (1 - f) / 0.4 : 1;
    const glowA = (f < 0.5 ? 1 : (1 - f) / 0.5) * (0.75 + 0.25 * Math.sin(e.t * 40));
    const rp = flameRamp(e.c, 'fire');
    // hố lún tối ở tâm
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = SPRITE_OUTLINE;
    fillEllipse(ctx, R0(x), R0(y), 14 * e.sc, 3 * e.sc);
    for (const pts of e.cracks) {
      const n = pts.length >> 1;
      const lim = (n - 1) * rv;
      for (let i = 0; i < n - 1 && i < lim; i++) {
        const u = Math.min(1, lim - i);
        const ax = x + pts[i * 2];
        const ay = y + pts[i * 2 + 1];
        const bx = ax + (pts[i * 2 + 2] - pts[i * 2]) * u;
        const by = ay + (pts[i * 2 + 3] - pts[i * 2 + 1]) * u;
        const thick = i < n * 0.5 ? 2 : 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = SPRITE_OUTLINE;
        linePx(ctx, ax, ay, bx, by, thick + 1);
        if (i < n * 0.7) {
          // lõi dung nham trong khe nứt
          ctx.globalAlpha = glowA;
          ctx.fillStyle = i < n * 0.3 ? rp[1] : rp[2];
          linePx(ctx, ax, ay, bx, by, 1);
        }
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, R0(x), R0(y), e.c, Math.min(44, e.R * 0.6), 0.3 * glowA, 0.3);
  },

  d_roar(ctx, e, camX, camY) {
    const x = R0(e.x - camX);
    const hy = R0(e.hy - camY);
    const rp = ramp(e.c);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, hy, e.c, 14 * Math.min(2, e.sc), 0.4 * (1 - e.t / e.life));
    // cung sóng không cắm xuống đất: chiều cao cung (0.64*ry) < khoảng đầu-chân
    const ryMax = (e.y - e.hy) / 0.66;
    // sóng âm hai bên dạng "((( )))"
    for (let k = 0; k < 4; k++) {
      const lt = (e.t - k * 0.09) / 0.5;
      if (lt <= 0 || lt >= 1) continue;
      const r = 8 + easeOut(lt) * e.R;
      const ry = Math.min(r * 0.75, ryMax);
      const a = 1 - lt;
      for (const side of [0, Math.PI]) {
        ctx.globalCompositeOperation = 'source-over';
        const th = lt < 0.5 ? 3 : 2;
        ctx.globalAlpha = 0.75 * a;
        ctx.fillStyle = rp[4];
        ringPx(ctx, x + 1, hy + 1, r, ry, th, th, side - 0.7, side + 0.7);
        ctx.globalAlpha = a;
        ctx.fillStyle = k % 2 ? rp[3] : '#ffffff';
        ringPx(ctx, x, hy, r, ry, th, th, side - 0.7, side + 0.7);
        ctx.fillStyle = k % 2 ? '#ffffff' : rp[2];
        ringPx(ctx, x, hy, r - th, ry - th, 1, 1, side - 0.45, side + 0.45);
      }
    }
  },

  d_summon(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const env = f > 0.72 ? (1 - f) / 0.28 : 1;
    const grow = easeOut3(clamp01(e.t / 0.25));
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const R = e.R * (0.3 + 0.7 * grow);
    const ry = R * 0.34;
    const rp = ramp(e.c);
    // cột triệu hồi: lớp màu thường để giữ sắc tím trên nền sáng, thêm lớp sáng cộng
    const bw = R0(R * 1.3);
    const pul = 0.7 + 0.3 * Math.sin(e.t * 16);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.42 * env;
    ctx.drawImage(beamSprite(rp[4], 24, 100, false), x - (bw >> 1), y - 96, bw, 98);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y, e.c, Math.min(60, R * 1.1), 0.3 * env, 0.34);
    ctx.globalAlpha = 0.22 * env * pul;
    ctx.drawImage(beamSprite(e.c, 24, 100, false), x - (bw >> 1), y - 96, bw, 98);
    ctx.globalCompositeOperation = 'source-over';
    // nền vòng tối + viền ngoài #1d1424
    ctx.globalAlpha = 0.35 * env;
    ctx.fillStyle = e.dark;
    fillEllipse(ctx, x, y, R, ry);
    ctx.globalAlpha = 0.75 * env;
    ctx.fillStyle = SPRITE_OUTLINE;
    ringPx(ctx, x, y, R + 2, ry + 1, 1, 1);
    ctx.globalAlpha = 0.85 * env;
    ctx.fillStyle = rp[5];
    ringPx(ctx, x, y + 1, R, ry, 2, 1);
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, R, ry, 2, 1);
    ctx.fillStyle = rp[1];
    ringPx(ctx, x, y, R * 0.74, ry * 0.74, 1, 1);
    ctx.fillStyle = rp[2];
    ringPx(ctx, x, y, R * 0.4, ry * 0.4, 1, 1);
    // vạch tỏa tròn quay giữa hai vòng trong (đọc rõ ở góc nhìn dẹt, khác ngôi sao)
    const rot = e.t * 1.8;
    for (let k = 0; k < 12; k++) {
      const a = rot + (k * TAU) / 12;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const long = k % 3 === 0;
      const r0 = long ? 0.42 : 0.5;
      const r1 = long ? 0.98 : 0.72;
      ctx.globalAlpha = env * (s > 0 ? 1 : 0.55);
      ctx.fillStyle = long ? '#ffffff' : rp[1];
      linePx(ctx, x + c * R * r0, y + s * ry * r0, x + c * R * r1, y + s * ry * r1);
    }
    // tâm: hình thoi sáng nhấp nháy nhẹ
    ctx.globalAlpha = env;
    ctx.fillStyle = rp[4];
    ctx.fillRect(x - 3, y, 7, 1);
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = pul > 0.85 ? '#ffffff' : rp[1];
    ctx.fillRect(x - 2, y - 1, 5, 1);
    ctx.fillRect(x, y - 2, 1, 3);
    this.runeRing(ctx, x, y, R + 7, ry + 2.5, -e.t * 1.2, 8, e.c, env * grow, false);
  },

  d_beam(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const gc = glowCol(e.c, elemOf(e.c));
    const top = -20;
    const H = Math.max(10, y - top);
    // nở nhanh rồi thu nhỏ dần
    const wk = f < 0.08 ? f / 0.08 : 1 - (f - 0.08) * 0.95;
    const bw = Math.max(2, R0(26 * e.sc * wk + Math.sin(e.t * 50) * 2));
    const a = f > 0.5 ? (1 - f) / 0.5 : 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = SPRITE_OUTLINE;
    fillEllipse(ctx, x, y, 16 * e.sc, 4 * e.sc);
    const brp = ramp(gc);
    // lớp màu phủ thường để tia không bị trắng xóa trên nền sáng
    ctx.globalAlpha = 0.55 * a;
    ctx.drawImage(beamSprite(brp[3], 34, 120, false), x - (bw >> 1), top, bw, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 * a;
    ctx.drawImage(beamSprite(gc, 34, 120), x - (bw >> 1), top, bw, H);
    const cw = Math.max(2, R0(bw * 0.38));
    ctx.globalAlpha = 0.9 * a;
    ctx.drawImage(beamSprite('#ffffff', 10, 120), x - (cw >> 1), top, cw, H);
    // mép tia nhấp nháy
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.8 * a * (Math.sin(e.t * 60) > 0 ? 1 : 0.6);
    ctx.fillStyle = brp[4];
    ctx.fillRect(x - (bw >> 1) - 1, top, 1, H);
    ctx.fillRect(x + (bw >> 1), top, 1, H);
    ctx.fillStyle = brp[2];
    ctx.fillRect(x - (bw >> 1), top, 1, H);
    ctx.fillRect(x + (bw >> 1) - 1, top, 1, H);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, x, y - 4, gc, Math.min(44, 22 * e.sc), 0.55 * a, 0.5);
    drawGlow(ctx, x, y - 2, '#ffffff', Math.min(16, 8 * e.sc), 0.6 * a, 0.6);
  },

  d_nova(ctx, e, camX, camY) {
    const f = e.t / e.life;
    const x = R0(e.x - camX);
    const y = R0(e.y - camY);
    const cy = R0(e.cy - camY);
    const fade = f > 0.55 ? (1 - f) / 0.45 : 1;
    const rp = ramp(glowCol(e.c, e.el));
    const rx = e.R * easeOut3(clamp01(f / 0.6));
    ctx.globalCompositeOperation = 'lighter';
    // quầng sáng giới hạn ở cỡ sprite lớn nhất, không kéo giãn thành bậc thang
    drawGlow(ctx, x, y, rp[2], Math.min(60, rx), 0.3 * fade, 0.34);
    if (f < 0.3) drawGlow(ctx, x, cy, '#ffffff', 22 * e.g * (1 - f / 0.3) + 6, (0.7 - 0.15 * (e.g - 1)) * (1 - f / 0.3));
    this.shockRing(ctx, x, y, rx, rx * 0.34, rp, fade, true);
    // vòng cầu nổ trên không (giới hạn để không tràn khỏi màn hình)
    const rs = Math.min(62 * e.g, 50 + 15 * e.g) * easeOut3(clamp01(f / 0.45));
    if (rs > 3 && f < 0.7) {
      const a = 1 - f / 0.7;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.6 * a;
      ctx.fillStyle = rp[5];
      ringPx(ctx, x + 1, cy + 1, rs, rs * 0.8, 2, 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = rp[1];
      ringPx(ctx, x, cy, rs, rs * 0.8, 2, 2);
      // tia tỏa ra
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 12; k++) {
        const an = (k * TAU) / 12 + 0.13;
        const c = Math.cos(an);
        const s = Math.sin(an) * 0.8;
        linePx(ctx, x + c * rs * 0.55, cy + s * rs * 0.55, x + c * rs * 0.85, cy + s * rs * 0.85);
      }
    }
  },
};
