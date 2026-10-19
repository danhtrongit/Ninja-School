// Hiệu ứng kỹ năng, hạt, số sát thương (pixel art phát sáng, cache sprite offscreen)
import { shade } from './sprites.js';
import { TAU, MAX_PARTS, MAX_TEXTS, rnd, pick, easeOut3, R0, mkCanvas, elemOf, EP, glowCol } from './fx/util.js';
import { plusColor } from './fx/shapes.js';
import { particleMethods } from './fx/particles.js';
import { skillMethods } from './fx/skills.js';
import { projectileMethods } from './fx/projectiles.js';
import { bossMethods } from './fx/boss.js';
import { gearMethods } from './fx/gear.js';
import { textMethods } from './fx/text.js';

// ================= LỚP FX =================
export class FX {
  constructor() {
    this.list = [];
    this.parts = [];
    this.texts = [];
    this.time = 0;
    this.mctx = mkCanvas(4, 4).getContext('2d');
    this.fontOK = false;
    // Rung màn hình: cường độ (pixel nghệ thuật), giảm dần trong update
    this.shake = 0;
    // hệ số rung do game đặt (0 = tắt rung theo tùy chọn người chơi)
    this.shakeScale = 1;
    this.shakeOff = { x: 0, y: 0 };
    this.frame = 0;
    this.groundFrame = -1;
    // khung nhìn của lần vẽ trước, để giảm rung theo khoảng cách
    this.viewX = 0;
    this.viewY = 0;
    this.viewW = 0;
    this.viewH = 0;
  }

  addShake(v) {
    const s = (+v || 0) * (this.shakeScale >= 0 ? this.shakeScale : 1);
    if (s > 0) this.shake = Math.min(12, Math.max(this.shake, s));
  }

  // Rung tại vị trí thế giới: đủ mạnh khi trong khung nhìn, nhỏ dần ra ngoài, tắt khi xa hơn nửa màn hình
  shakeAt(x, y, v) {
    const W = this.viewW;
    if (!W) return this.addShake(v);
    const dx = Math.max(0, Math.abs(x - (this.viewX + W / 2)) - W / 2);
    const dy = Math.max(0, Math.abs(y - (this.viewY + this.viewH / 2)) - this.viewH / 2);
    const k = 1 - Math.max(dx / (W * 0.5), dy / Math.max(1, this.viewH * 0.5));
    if (k > 0) this.addShake(v * k);
  }

  // Độ lệch camera nguyên pixel cho khung hiện tại (đối tượng dùng lại, không cấp phát)
  shakeXY() {
    const o = this.shakeOff;
    const s = this.shake;
    if (s < 0.3) {
      o.x = 0;
      o.y = 0;
    } else {
      o.x = R0(Math.sin(this.time * 91) * s);
      o.y = R0(Math.cos(this.time * 73) * s * 0.6);
    }
    return o;
  }

  add(e) {
    e.t = 0;
    this.list.push(e);
    return e;
  }

  // ---- hạt
  spawn(k, x, y, vx, vy, life, c, o) {
    if (this.parts.length >= MAX_PARTS) return null;
    const p = { k, x, y, vx, vy, life, c, t: 0, g: 0, drag: 0, s: 1, s1: 1, a: 1, add: false, floor: 1e9, ph: Math.random() * TAU };
    if (o) Object.assign(p, o);
    if (o && o.s1 === undefined) p.s1 = p.s;
    this.parts.push(p);
    return p;
  }

  flame(x, y, vx, vy, rp, s = 3, life = 0.45) {
    return this.spawn('flame', x, y, vx, vy, life * rnd(0.7, 1.2), rp, { s, g: -40, drag: 2.2, add: true });
  }

  ember(x, y, c, up = 40) {
    return this.spawn('ember', x, y, rnd(-25, 25), -rnd(up * 0.4, up), rnd(0.5, 1.1), c, { g: -10, drag: 1.2, add: true });
  }

  smoke(x, y, c, s = 2, s1 = 5, life = 0.8, a = 0.55) {
    return this.spawn('smoke', x, y, rnd(-8, 8), -rnd(8, 22), life * rnd(0.8, 1.2), c, { s, s1, a, drag: 1.5 });
  }

  drop(x, y, vx, vy, c, floor) {
    return this.spawn('drop', x, y, vx, vy, rnd(0.45, 0.85), c, { g: 260, floor: floor === undefined ? 1e9 : floor });
  }

  leaf(x, y, vx, vy, c) {
    return this.spawn('leaf', x, y, vx, vy, rnd(0.6, 1.1), c || pick(EP.wind.leaf), { g: 25, drag: 1.6 });
  }

  wline(x, y, vx, len, c, life = 0.3) {
    return this.spawn('wline', x, y, vx, 0, life, c, { s: len, drag: 3, add: true });
  }

  star(x, y, c, s = 3, life = 0.4, vy = 0) {
    return this.spawn('star', x, y, rnd(-6, 6), vy, life, c, { s, add: true });
  }

  sparks(x, y, color, n = 8, speed = 60) {
    const c = color || '#ffffff';
    const el = elemOf(c);
    const sp = EP[el].spark;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.5 + Math.random() * 0.9);
      this.spawn('spark', x, y, Math.cos(a) * v, Math.sin(a) * v - 25, 0.22 + Math.random() * 0.28, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? c : pick(sp), { g: 150, drag: 2.2, s: Math.random() < 0.5 ? 3 : 2, add: true });
    }
    this.spawn('glow', x, y, 0, 0, 0.12, glowCol(c, el), { s: 4 + Math.min(10, n * 0.5), s1: 2, a: 0.55, add: true });
    if (n >= 10) this.star(x, y, '#ffffff', 6, 0.18);
  }

  text(x, y, str, color, big) {
    const s = String(str);
    const t = { x: x + (Math.random() * 10 - 5), y, s, c: color || '#ffffff', t: 0, big: !!big, cv: null, cs: 0 };
    t.miss = s === 'Né';
    t.crit = !!big && /\d!$/.test(s);
    t.banner = !!big && !t.crit;
    t.life = t.banner ? 1.6 : t.crit ? 1.25 : 1.1;
    t.side = Math.random() < 0.5 ? -1 : 1;
    this.texts.push(t);
    if (this.texts.length > MAX_TEXTS) this.texts.shift();
  }

  // ================= CÁC LOẠI HIỆU ỨNG =================
  slash(x, y, dir, c, big) {
    this.add({ k: 'slash', x, y, dir: dir || 1, c: c || '#ffffff', big: !!big, life: big ? 0.26 : 0.2, el: elemOf(c) });
  }

  proj(x0, y0, x1, y1, p, c, opts = {}) {
    const col = c || '#ffffff';
    const ang = Math.atan2(y1 - y0, x1 - x0);
    this.add({
      k: 'proj', x0, y0, x1, y1, p: p || 'fire', c: col, life: opts.life || 0.22, delay: opts.delay || 0, boom: opts.boom, big: opts.big,
      el: elemOf(col, p), ang, ux: Math.cos(ang), uy: Math.sin(ang), dir: x1 >= x0 ? 1 : -1, acc: 0,
    });
  }

  burst(x, y, r, c, big) {
    const col = c || '#ffffff';
    const el = elemOf(col);
    const e = this.add({ k: 'burst', x, y, r: Math.max(16, r), c: col, big: !!big, life: big ? 0.6 : 0.48, el, acc: 0 });
    if (el === 'ice') {
      const n = big ? 20 : 13;
      e.spikes = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd(-0.2, 0.2);
        const d = rnd(0.35, 0.95);
        e.spikes.push({ a, d, h: rnd(7, big ? 17 : 13), w: rnd(1.5, 2.6) });
      }
      e.spikes.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    }
    const R = e.r;
    this.spawn('glow', x, y - 10, 0, 0, 0.18, '#ffffff', { s: 10, s1: 16, a: 0.5, add: true });
    const n = big ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = R * rnd(0.9, 1.9);
      this.spawn('spark', x, y - 8, Math.cos(a) * v, Math.sin(a) * v * 0.5 - 30, rnd(0.25, 0.5), i % 2 ? '#ffffff' : pick(EP[el].spark), { g: 120, drag: 2.5, s: 3, add: true });
    }
  }

  wave(x, y, dir, range, c, p) {
    const col = c || '#ffffff';
    this.add({ k: 'wave', x, y, dir: dir || 1, range: range || 150, c: col, p, life: p === 'arrow' ? 0.5 : 0.48, el: elemOf(col), acc: 0, lastRing: 0 });
  }

  rain(x, y, r, p, c, big) {
    const col = c || '#ffffff';
    const n = big ? 18 : 10;
    this.add({ k: 'mark', x, y, r: Math.max(20, r), c: col, el: elemOf(col, p), life: big ? 1.05 : 0.8 });
    for (let i = 0; i < n; i++) {
      const tx = x + (Math.random() * 2 - 1) * r * 0.9;
      const ty = y - 3 + Math.random() * 6;
      const h = rnd(110, 140);
      this.proj(tx - h * 0.28, ty - h, tx, ty, p || 'shuriken', col, { life: rnd(0.26, 0.34), delay: i * (big ? 0.035 : 0.045), big: p === 'fire' && i % 3 === 0 });
    }
  }

  meteor(x, y, r, c) {
    const col = c || '#ff5722';
    let el = elemOf(col);
    if (el !== 'water' && el !== 'ice') el = 'fire';
    this.add({ k: 'meteor', x, y, r: Math.max(30, r), c: col, el, life: 1.3, hit: 0.32, big: r >= 150, acc: 0 });
  }

  whirl(x, y, r, c, big) {
    const col = c || '#9ccc65';
    const el = elemOf(col);
    const deb = [];
    const n = big ? 16 : 11;
    for (let i = 0; i < n; i++) {
      deb.push({ a: Math.random() * TAU, h: Math.random(), w: rnd(6, 11), vh: rnd(0.5, 1.1), kind: i % 3 === 0 ? 'rock' : 'leaf', c: i % 3 === 0 ? pick(['#8d6e63', '#6d4c41', '#a1887f']) : pick(EP.wind.leaf) });
    }
    this.add({ k: 'whirl', x, y, r: Math.max(30, r), c: col, big: !!big, el, life: big ? 0.9 : 0.75, deb, acc: 0 });
  }

  aura(get, c) {
    const col = c || '#ffd54f';
    this.add({ k: 'aura', get, c: col, el: elemOf(col), life: 1.25, acc: 0 });
  }

  heal(get, c) {
    const col = c || '#69f0ae';
    this.add({ k: 'heal', get, c: col, el: elemOf(col), life: 1.35, acc: 0 });
  }

  dash(x0, x1, y, dir, c) {
    const col = c || '#aed581';
    const lines = [];
    for (let i = 0; i < 12; i++) lines.push({ y: rnd(-26, -2), u: Math.random(), len: rnd(10, 36), c: i % 3 ? '#ffffff' : col });
    this.add({ k: 'dash', x0, x1, y, dir: dir || 1, c: col, el: elemOf(col), life: 0.55, lines, acc: 0 });
    for (let i = 0; i < 8; i++) this.smoke(x0 + rnd(-6, 6), y - rnd(0, 4), pick(['#d7ccc8', '#bcaaa4', '#efebe9']), 2, 5, 0.6, 0.6);
    this.slash(x1, y, dir || 1, col, true);
  }

  levelUp(get) {
    this.add({ k: 'level', get, life: 1.5, acc: 0, burst: false });
  }

  // ---- Cảnh báo chiêu boss trên mặt đất. kind: 'circle' | 'line' (radius = chiều dài, dấu = hướng) | 'pillar'
  // width (tùy chọn, chỉ cho 'line'): bề dày dải trên mặt đất theo pixel, mặc định 14
  telegraph(x, y, radius, dur, color, kind, width) {
    const d = Math.max(0.2, Math.min(6, +dur || 1));
    const k = kind === 'line' || kind === 'pillar' ? kind : 'circle';
    const r = +radius || 60;
    const e = { k: 'tele', ground: true, x, y, kind: k, dur: d, life: d + 0.16, c: color || '#ff5252', acc: 0 };
    if (k === 'line') {
      e.dir = r < 0 ? -1 : 1;
      e.len = Math.max(16, Math.abs(r));
      e.h = Math.max(3, Math.min(40, R0((+width || 14) / 2)));
    } else e.r = Math.max(12, Math.abs(r));
    return this.add(e);
  }

  // ---- Chiêu boss tung ra. kind: 'quake' | 'roar' | 'summon' | 'beam' | 'nova'
  bossSkill(x, y, kind, color, scale) {
    const sc = Math.max(0.5, Math.min(3, +scale || 1));
    switch (kind) {
      case 'quake': return this.bsQuake(x, y, color || '#ff7043', sc);
      case 'roar': return this.bsRoar(x, y, color || '#ffe0b2', sc);
      case 'summon': return this.bsSummon(x, y, color || '#c77dff', sc);
      case 'beam': return this.bsBeam(x, y, color || '#80d8ff', sc);
      default: return this.bsNova(x, y, color || '#ff8a3c', sc);
    }
  }

  // ---- Cường hóa: ok = thành công/thất bại, plus = cấp + sau khi cường hóa (đổi màu theo mốc)
  enhance(x, y, ok, plus) {
    const p = Math.max(0, +plus || 0);
    const c = plusColor(p);
    if (ok) {
      this.add({ k: 'enh', x, y, ok: true, c, plus: p, life: 1.1, acc: 0 });
      this.spawn('glow', x, y - 14, 0, 0, 0.2, '#ffffff', { s: 8, s1: 18, a: 0.35, add: true });
      const n = p >= 9 ? 16 : 12;
      for (let i = 0; i < n; i++) {
        const st = this.star(x, y - 14, i % 2 ? c : '#ffffff', 4, 0.6);
        if (st) {
          st.vx = Math.cos((i / n) * TAU) * 70;
          st.vy = Math.sin((i / n) * TAU) * 45 - 15;
          st.drag = 2.6;
        }
      }
      if (p >= 13) this.addShake(2);
    } else {
      this.add({ k: 'enh', x, y, ok: false, c: '#90a4ae', plus: p, life: 0.85, acc: 0 });
      this.spawn('glow', x, y - 12, 0, 0, 0.18, '#ff5252', { s: 8, s1: 14, a: 0.4, add: true });
      // khói thấp sát đất và dạt hai bên để dấu X ở giữa vẫn rõ
      for (let i = 0; i < 8; i++) {
        const d = i % 2 ? 1 : -1;
        const sm = this.smoke(x + d * rnd(6, 14), y - rnd(0, 5), pick(['#78909c', '#607d8b', '#546e7a']), 2, 6, 0.8, 0.5);
        if (sm) {
          sm.vx = d * rnd(15, 35);
          sm.vy = -rnd(4, 12);
        }
      }
      for (let i = 0; i < 6; i++) {
        const d = i % 2 ? 1 : -1;
        this.rock(x + d * rnd(4, 9), y - rnd(4, 10), d * rnd(30, 70), -rnd(40, 100), pick(['#90a4ae', '#78909c', '#b0bec5']), y + rnd(-2, 3), 3);
      }
      this.addShake(1.5);
    }
  }

  // ---- Bụi chân thú cưỡi: gọi khoảng 8 lần/giây khi thú đang chạy (dir = hướng chạy)
  mountDust(x, y, dir) {
    const d = dir < 0 ? -1 : 1;
    const n = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const sm = this.smoke(x - d * rnd(2, 8), y - rnd(0, 2), pick(['#d7ccc8', '#bcaaa4', '#a1887f']), 2, rnd(4, 6) | 0, 0.5, 0.7);
      if (sm) {
        sm.vx = -d * rnd(15, 40);
        sm.vy = -rnd(6, 16);
      }
    }
    if (Math.random() < 0.4) this.spawn('px', x - d * 4, y - 1, -d * rnd(20, 50), -rnd(30, 60), 0.4, pick(['#8d6e63', '#6d4c41']), { g: 260, floor: y, a: 1 });
  }

  // ---- Lấp lánh khi khảm ngọc vào trang bị
  gemSocket(x, y, color) {
    const c = color || '#5ab4ff';
    this.add({ k: 'gem', x, y, c, lite: shade(c, 0.5), dark: shade(c, -0.55), life: 0.75, acc: 0, popped: false });
  }

  // ---- Lấp lánh thời trang (ngoại trang mới): xoắn ánh sáng quanh thân + sao lấp lánh
  costumeSparkle(x, y, color) {
    const c = color || '#f48fb1';
    this.add({ k: 'cost', x, y, c, lite: shade(c, 0.5), mid: shade(c, -0.15), dark: shade(c, -0.5), life: 1.1, acc: 0, popped: false });
  }

  // ================= CẬP NHẬT =================
  update(dt) {
    if (dt > 0.1) dt = 0.1;
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * (4 + this.shake * 5));
    for (const e of this.list) {
      if (e.delay > 0) {
        e.delay -= dt;
        continue;
      }
      e.t += dt;
      const fn = this[`u_${e.k}`];
      if (fn) fn.call(this, e, dt);
    }
    let n = 0;
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const e = L[i];
      if (e.t < e.life || e.delay > 0) L[n++] = e;
    }
    L.length = n;

    const P = this.parts;
    n = 0;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.k === 'leaf') p.x += Math.sin(p.t * 7 + p.ph) * 14 * dt;
      if (p.y > p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.5;
      }
      P[n++] = p;
    }
    P.length = n;
    for (const t of this.texts) t.t += dt;
    n = 0;
    for (let i = 0; i < this.texts.length; i++) if (this.texts[i].t < this.texts[i].life) this.texts[n++] = this.texts[i];
    this.texts.length = n;
  }

  // ================= VẼ (canvas phân giải thấp) =================
  draw(ctx, camX, camY) {
    this.cw = ctx.viewW || ctx.canvas.width;
    this.ch = ctx.viewH || ctx.canvas.height;
    this.viewX = camX;
    this.viewY = camY;
    this.viewW = this.cw;
    this.viewH = this.ch;
    // nếu game đã gọi drawGround trong khung này thì không vẽ lại hiệu ứng mặt đất
    const skipGround = this.groundFrame === this.frame;
    this.frame++;
    ctx.save();
    for (const e of this.list) {
      if (e.delay > 0 || (skipGround && e.ground)) continue;
      const fn = this[`d_${e.k}`];
      if (fn) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        fn.call(this, ctx, e, camX, camY);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.drawParts(ctx, camX, camY, false);
    ctx.globalCompositeOperation = 'lighter';
    this.drawParts(ctx, camX, camY, true);
    // lượt trên cùng: ký hiệu cần đọc được (dấu "!", dấu X thất bại) không bị khói/hạt che
    for (const e of this.list) {
      if (e.delay > 0) continue;
      const fn = this[`o_${e.k}`];
      if (fn) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        fn.call(this, ctx, e, camX, camY);
      }
    }
    ctx.restore();
  }

  // Tùy chọn: vẽ hiệu ứng nằm trên mặt đất (cảnh báo boss, vết nứt, vòng triệu hồi) TRƯỚC khi vẽ quái/người.
  // Gọi cùng tham số với draw(); nếu không gọi thì draw() tự vẽ chúng.
  drawGround(ctx, camX, camY) {
    this.cw = ctx.viewW || ctx.canvas.width;
    this.ch = ctx.viewH || ctx.canvas.height;
    this.groundFrame = this.frame;
    ctx.save();
    for (const e of this.list) {
      if (e.delay > 0 || !e.ground) continue;
      const fn = this[`d_${e.k}`];
      if (!fn) continue;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      fn.call(this, ctx, e, camX, camY);
    }
    ctx.restore();
  }

  drawTexts(ctx, toScreen, scale) {
    if (!this.fontOK && this.texts.length) this.fontOK = !document.fonts || document.fonts.check('16px VT323');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (const t of this.texts) {
      if (!t.cv || t.cs !== scale || (t.nofont && this.fontOK)) this.renderText(t, scale);
      const T = t.t;
      let dx = 0;
      let dy;
      let sc = 1;
      let a = 1;
      if (t.miss) {
        dx = easeOut3(Math.min(1, T / 0.6)) * 9 * t.side;
        dy = -18 * easeOut3(Math.min(1, T / 0.7));
        sc = T < 0.08 ? 1.25 - (T / 0.08) * 0.25 : 1;
        a = T > 0.6 ? Math.max(0, 1 - (T - 0.6) / 0.5) : 1;
      } else if (t.crit) {
        sc = T < 0.07 ? 0.5 + (T / 0.07) * 1.2 : T < 0.2 ? 1.7 - ((T - 0.07) / 0.13) * 0.55 : 1.15;
        dy = -12 * easeOut3(Math.min(1, T / 0.22)) - Math.max(0, T - 0.45) * 26;
        dx = T < 0.22 ? Math.sin(T * 95) * 1.2 * (1 - T / 0.22) : 0;
        a = T > 0.85 ? Math.max(0, 1 - (T - 0.85) / 0.4) : 1;
      } else if (t.banner) {
        sc = T < 0.1 ? 0.6 + (T / 0.1) * 0.6 : T < 0.2 ? 1.2 - ((T - 0.1) / 0.1) * 0.2 : 1;
        dy = -22 * easeOut3(Math.min(1, T / 1.2));
        a = T > 1.2 ? Math.max(0, 1 - (T - 1.2) / 0.4) : 1;
      } else {
        sc = T < 0.07 ? 1.45 - (T / 0.07) * 0.45 : 1;
        dy = -26 * easeOut3(Math.min(1, T / 0.85));
        a = T > 0.72 ? Math.max(0, 1 - (T - 0.72) / 0.38) : 1;
      }
      const [sx, sy] = toScreen(t.x + dx, t.y + dy);
      const w = t.cv.width * sc / 1.15;
      const h = t.cv.height * sc / 1.15;
      ctx.globalAlpha = a;
      ctx.drawImage(t.cv, Math.round(sx - w / 2), Math.round(sy - h / 2), Math.round(w), Math.round(h));
    }
    ctx.restore();
  }
}

// Gắn các nhóm method ở fx/*.js vào FX, không liệt kê được (enumerable: false) như method khai báo trong class
function mixin(cls, ...groups) {
  for (const g of groups) for (const k of Object.keys(g)) Object.defineProperty(cls.prototype, k, { value: g[k], writable: true, configurable: true });
}
mixin(FX, particleMethods, skillMethods, projectileMethods, bossMethods, gearMethods, textMethods);
