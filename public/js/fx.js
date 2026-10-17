// Hiệu ứng kỹ năng, hạt, số sát thương
import { shade } from './sprites.js';

export class FX {
  constructor() {
    this.list = [];
    this.parts = [];
    this.texts = [];
  }

  add(e) {
    e.t = 0;
    this.list.push(e);
  }

  sparks(x, y, color, n = 8, speed = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.3 + Math.random() * 0.3, t: 0, c: Math.random() < 0.3 ? '#ffffff' : color, g: 160 });
    }
  }

  text(x, y, str, color, big) {
    this.texts.push({ x: x + (Math.random() * 10 - 5), y, s: str, c: color, t: 0, big: !!big });
  }

  // ---- các loại hiệu ứng
  slash(x, y, dir, c, big) { this.add({ k: 'slash', x, y, dir, c, big, life: 0.2 }); }
  proj(x0, y0, x1, y1, p, c, opts = {}) { this.add({ k: 'proj', x0, y0, x1, y1, p, c, life: opts.life || 0.22, delay: opts.delay || 0, boom: opts.boom, big: opts.big }); }
  burst(x, y, r, c, big) { this.add({ k: 'burst', x, y, r, c, big, life: 0.45 }); this.sparks(x, y, c, big ? 24 : 14, r * 1.2); }
  wave(x, y, dir, range, c, p) { this.add({ k: 'wave', x, y, dir, range, c, p, life: 0.35 }); }
  rain(x, y, r, p, c, big) {
    const n = big ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const tx = x + (Math.random() * 2 - 1) * r;
      this.proj(tx - 30, y - 120, tx, y - 4, p || 'shuriken', c, { life: 0.3, delay: i * 0.04 });
    }
  }
  meteor(x, y, r, c) { this.add({ k: 'meteor', x, y, r, c, life: 0.6 }); }
  whirl(x, y, r, c, big) { this.add({ k: 'whirl', x, y, r, c, big, life: 0.7 }); }
  aura(get, c) { this.add({ k: 'aura', get, c, life: 0.9 }); }
  heal(get, c) { this.add({ k: 'heal', get, c: c || '#69f0ae', life: 0.9 }); }
  dash(x0, x1, y, dir, c) { this.add({ k: 'dash', x0, x1, y, dir, c, life: 0.35 }); }
  levelUp(get) { this.add({ k: 'level', get, life: 1.4 }); }

  update(dt) {
    for (const e of this.list) {
      if (e.delay > 0) {
        e.delay -= dt;
        continue;
      }
      e.t += dt;
      if (e.k === 'proj' && e.t >= e.life && !e.done) {
        e.done = true;
        this.sparks(e.x1, e.y1, e.c, e.boom ? 22 : 6, e.boom ? 90 : 50);
        if (e.boom) this.add({ k: 'burst', x: e.x1, y: e.y1, r: 26, c: e.c, life: 0.35 });
      }
      if (e.k === 'meteor' && e.t >= e.life * 0.5 && !e.done) {
        e.done = true;
        this.burst(e.x, e.y, e.r, e.c, true);
      }
    }
    this.list = this.list.filter((e) => e.t < e.life || e.delay > 0);
    for (const p of this.parts) {
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < 1.1);
  }

  // Vẽ trên canvas độ phân giải thấp
  draw(ctx, camX, camY) {
    const P = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x - camX), Math.round(y - camY), w, h);
    };
    for (const e of this.list) {
      if (e.delay > 0) continue;
      const f = e.t / e.life;
      switch (e.k) {
        case 'slash': {
          const r = e.big ? 20 : 14;
          const n = e.big ? 18 : 12;
          for (let i = 0; i < n; i++) {
            const a = -1.2 + (i / n) * 2.4 * Math.min(1, f * 2.2);
            const px = e.x + e.dir * (6 + Math.cos(a) * r);
            const py = e.y - 12 + Math.sin(a) * r;
            P(px, py, 2, 2, i % 3 ? e.c : '#ffffff');
          }
          break;
        }
        case 'proj': {
          const ff = Math.min(1, f);
          const x = e.x0 + (e.x1 - e.x0) * ff;
          const y = e.y0 + (e.y1 - e.y0) * ff;
          if (e.done) break;
          const dir = e.x1 >= e.x0 ? 1 : -1;
          if (e.p === 'arrow') {
            P(x - dir * 6, y, 7, 1, '#d7ccc8');
            P(x + (dir > 0 ? 0 : -1), y - 1, 2, 3, e.c);
            P(x - dir * 7, y - 1, 1, 3, '#ffffff');
          } else if (e.p === 'shuriken') {
            const s = Math.floor(e.t * 30) % 2;
            if (s) { P(x - 2, y, 5, 1, e.c); P(x, y - 2, 1, 5, e.c); }
            else { P(x - 2, y - 2, 1, 1, e.c); P(x + 2, y - 2, 1, 1, e.c); P(x - 2, y + 2, 1, 1, e.c); P(x + 2, y + 2, 1, 1, e.c); P(x - 1, y - 1, 3, 3, e.c); }
          } else if (e.p === 'wind') {
            P(x - 3, y - 3, 2, 2, e.c); P(x - 1, y - 1, 3, 2, e.c); P(x + 1, y + 1, 3, 2, shade(e.c, 0.3)); P(x - 3, y + 3, 2, 2, e.c);
          } else if (e.p === 'ice') {
            P(x - 3, y - 1, 7, 3, e.c); P(x - 1, y - 2, 3, 5, '#ffffff');
          } else {
            const s = e.big || e.boom ? 4 : 3;
            P(x - s / 2, y - s / 2, s, s, e.c);
            P(x - 1, y - 1, 2, 2, '#ffffff');
            for (let i = 1; i < 4; i++) P(x - dir * i * 3, y + (i % 2), 2, 2, shade(e.c, -0.2 * i));
          }
          break;
        }
        case 'burst': {
          const r = e.r * (0.3 + f * 0.7);
          const n = Math.max(16, Math.floor(r * 0.8));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            P(e.x + Math.cos(a) * r, e.y - 10 + Math.sin(a) * r * 0.45, 2, 2, i % 4 ? e.c : '#ffffff');
          }
          if (f < 0.5) {
            ctx.globalAlpha = 0.25 * (1 - f * 2);
            ctx.fillStyle = e.c;
            ctx.fillRect(Math.round(e.x - r - camX), Math.round(e.y - 10 - r * 0.45 - camY), Math.round(r * 2), Math.round(r * 0.9));
            ctx.globalAlpha = 1;
          }
          break;
        }
        case 'wave': {
          const x = e.x + e.dir * e.range * f;
          for (let i = -8; i <= 8; i++) {
            const bend = Math.abs(i) * 0.4;
            P(x - e.dir * bend, e.y - 12 + i, 2, 1, Math.abs(i) < 3 ? '#ffffff' : e.c);
            P(x - e.dir * (bend + 3), e.y - 12 + i, 2, 1, shade(e.c, -0.25));
          }
          break;
        }
        case 'meteor': {
          if (f < 0.5) {
            const ff = f / 0.5;
            const x = e.x - 60 + 60 * ff;
            const y = e.y - 140 + 130 * ff;
            P(x - 6, y - 6, 12, 12, e.c);
            P(x - 4, y - 8, 8, 16, e.c);
            P(x - 3, y - 3, 6, 6, '#ffffff');
            for (let i = 1; i < 6; i++) P(x - i * 5, y - i * 10, 6 - i, 6 - i, shade(e.c, 0.3));
          }
          break;
        }
        case 'whirl': {
          const h = e.big ? 60 : 40;
          for (let i = 0; i < 40; i++) {
            const yy = (i / 40) * h;
            const rr = 4 + (yy / h) * e.r * 0.45;
            const a = e.t * 14 + i * 0.6;
            P(e.x + Math.cos(a) * rr, e.y - yy, 2, 2, i % 3 ? e.c : '#ffffff');
          }
          break;
        }
        case 'aura':
        case 'heal': {
          const o = e.get();
          if (!o) break;
          for (let i = 0; i < 10; i++) {
            const a = i * 0.63 + e.t * 3;
            const yy = ((e.t * 40 + i * 7) % 30);
            const xx = o.x + Math.cos(a) * 9;
            if (e.k === 'heal') {
              P(xx - 1, o.y - yy - 1, 3, 1, e.c);
              P(xx, o.y - yy - 2, 1, 3, e.c);
            } else {
              P(xx, o.y - yy, 1, 2, i % 2 ? e.c : '#ffffff');
            }
          }
          break;
        }
        case 'dash': {
          for (let i = 0; i < 5; i++) {
            const x = e.x0 + (e.x1 - e.x0) * (i / 5);
            ctx.globalAlpha = (1 - f) * (0.15 + i * 0.12);
            P(x - 4, e.y - 20, 8, 20, e.c);
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'level': {
          const o = e.get();
          if (!o) break;
          ctx.globalAlpha = Math.max(0, 1 - f);
          ctx.fillStyle = '#fff59d';
          ctx.fillRect(Math.round(o.x - 6 - camX), Math.round(o.y - 80 - camY), 12, 80);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(o.x - 2 - camX), Math.round(o.y - 80 - camY), 4, 80);
          ctx.globalAlpha = 1;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const r = 6 + f * 30;
            P(o.x + Math.cos(a) * r, o.y - 6 + Math.sin(a) * r * 0.3, 2, 2, '#ffd54f');
          }
          break;
        }
        default:
      }
    }
    for (const p of this.parts) {
      P(p.x, p.y, 1, 1, p.c);
    }
  }

  // Vẽ chữ trên lớp phân giải cao
  drawTexts(ctx, toScreen, scale) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const [sx, sy] = toScreen(t.x, t.y - t.t * 26);
      const size = Math.round((t.big ? 22 : 16) * scale * (t.t < 0.12 ? 1.3 : 1));
      ctx.font = `bold ${size}px VT323, monospace`;
      ctx.globalAlpha = t.t > 0.7 ? Math.max(0, 1 - (t.t - 0.7) / 0.4) : 1;
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.strokeStyle = '#1a1020';
      ctx.strokeText(t.s, sx, sy);
      ctx.fillStyle = t.c;
      ctx.fillText(t.s, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
