// Vẽ bản đồ: bầu trời + parallax 4 lớp, mặt đất kiểu tile pixel, bục nhảy, làng Nhật, trang trí theo chủ đề,
// cổng dịch chuyển, hạt bay và ánh sáng không khí.
// Mọi phần tĩnh được vẽ sẵn (prerender) vào canvas offscreen; mỗi khung hình chỉ drawImage + một ít hạt động.
import { C0, rng, seedOf, clamp, hash1, mix, shd, rgba, ramp, Buf, cached, glow, hole, TAU } from './map/util.js';
import { THEMES, SCENES, MAP_VARIANTS } from './map/themes.js';
import { buildSky, sunSpr, rainbowSpr, cloudSpr, auroraCanvas } from './map/sky.js';
import { buildGround, buildCliffs, buildPlatform } from './map/terrain.js';
import { buildVillage } from './map/village.js';
import { buildFieldDecor } from './map/decor.js';
import { getLayers } from './map/layers.js';
import { vGrad, pillarSpr, padSpr, signSpr, fogSpr, raysSpr, nightStars, causticSpr, KOI, koiSpr, fishSpr } from './map/ambient.js';
import { vnHour, dayPhase, NIGHT_RGB, DUSK_RGB, DAWN_RGB, ENT_DARK, SINGLE_DARK, mulColor, lightSpr, lightPref } from './map/lighting.js';
export { vnHour, dayPhase, setLighting, getLighting } from './map/lighting.js';

export class MapRenderer {
  constructor(map) {
    this.map = map;
    this.th = THEMES[map.theme] || THEMES.grass_fire;
    this.sc = SCENES[map.theme] || SCENES.grass_fire;
    const v0 = MAP_VARIANTS[map.id];
    const v = v0 && (!v0.from || v0.from === map.theme) ? v0 : null;
    if (v) {
      const sw = (k) => v.swap[k] || k;
      this.th = { ...this.th, part: v.part || this.th.part, decor: (this.th.decor || []).map(sw) };
      this.sc = { ...this.sc, layers: this.sc.layers.map((l) => (l.kinds ? { ...l, kinds: l.kinds.map(sw) } : l)) };
    }
    // trạm dùng theme bãi nhưng vẽ nhà theo hệ (townStyle) như làng
    if (map.town && !this.th.town && map.townStyle) this.th = { ...this.th, town: map.townStyle };
    this.seed = seedOf(map.id);
    this.lights = [];
    this.anims = [];
    this.particles = [];
    this.t = 0;
    this._pc = null;
    this.sky = cached(`sky:${map.theme}`, () => ({ canvas: buildSky(this.sc, seedOf(map.theme)) })).canvas;
    this.skyH = this.sky.height;
    this.layers = getLayers(v ? `${map.theme}:${map.id}` : map.theme, this.sc);
    this.terrain = this.buildTerrain();
    for (const l of this.lights) l.r = Math.max(8, Math.round(l.r / 4) * 4);
    const R = rng(this.seed + 17);
    const cl = this.sc.clouds;
    this.clouds = [];
    if (cl) for (let i = 0; i < cl.n; i++) {
      const w = 34 + ((R() * 40) | 0);
      this.clouds.push({ cv: cloudSpr(cl.pal, i % 4, w - (w % 8)).canvas, x: R() * 900, y: cl.y[0] + R() * (cl.y[1] - cl.y[0]), sp: 1.5 + R() * 3, z: 0.03 + R() * 0.05 });
    }
    this.clouds.sort((a, b) => a.z - b.z);
    this.birds = [];
    if (this.sc.birds) for (let i = 0; i < 4; i++) this.birds.push({ x: R() * 800, y: 30 + R() * 60, sp: (this.sc.birds === 'bat' ? 14 : 9) + R() * 8, ph: R() * 6, d: R() < 0.5 ? 1 : -1 });
    this.lightK = this.th.dark ? 1 : this.sc.light && this.sc.light.top && this.map.theme === 'village_fire' ? 0.9 : 0.65;
    // mức ảnh hưởng ngày/đêm: dưới lòng đất gần như không đổi
    this.dayK = this.th.dayK != null ? this.th.dayK : this.th.ceiling ? 0.2 : this.th.dark ? 0.5 : 1;
    this.nightK = 0;
    this.frame = 0;
    this._lit = false;
    this.fx = null;
    this.fy = null;
  }

  // Pha ngày/đêm của khung hiện tại (tính một lần mỗi khung, dùng chung cho nền và lớp phủ)
  _phase(hour) {
    const P = this._P || (this._P = { f: -1, h: undefined });
    if (P.f === this.frame && P.h === hour) return P;
    const h = hour == null ? vnHour() : ((hour % 24) + 24) % 24;
    const ph = dayPhase(h);
    const k = this.dayK * lightPref;
    const n = ph.night * k;
    const soft = 1 - ph.night * 0.5;
    const du = ph.dusk * k * 0.6 * soft;
    const da = ph.dawn * k * 0.55 * soft;
    let r = 255 + (NIGHT_RGB[0] - 255) * n;
    let g = 255 + (NIGHT_RGB[1] - 255) * n;
    let b = 255 + (NIGHT_RGB[2] - 255) * n;
    r += (DUSK_RGB[0] - r) * du; g += (DUSK_RGB[1] - g) * du; b += (DUSK_RGB[2] - b) * du;
    r += (DAWN_RGB[0] - r) * da; g += (DAWN_RGB[1] - g) * da; b += (DAWN_RGB[2] - b) * da;
    P.n = n; P.du = du; P.da = da; P.r = r; P.g = g; P.b = b;
    P.nightK = ph.night * Math.min(1, this.dayK * 1.25) * lightPref;
    P.f = this.frame;
    P.h = hour;
    return P;
  }

  // Màu nhân (multiply) giữ lại phần tối s (0-1) của màu đêm
  _tint(P, s) {
    return mulColor(255 - (255 - P.r) * s, 255 - (255 - P.g) * s, 255 - (255 - P.b) * s);
  }

  _canvas(key, W, H) {
    let c = this[key];
    if (!c || c.width !== W || c.height !== H) {
      c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      this[key] = c;
    }
    return c;
  }

  // Một vòng qua nguồn sáng: vệt sáng vào bản đồ sáng m ('lighten') và/hoặc quầng màu vào g
  _lightPass(m, g, camX, camY, W, H, n) {
    const t = this.t;
    const ka = Math.min(1, n * 1.4);
    if (m && this.fx != null) {
      // quầng sáng nhẹ quanh người chơi (tọa độ do game truyền vào)
      m.globalAlpha = 0.55 * ka;
      const x = Math.round(this.fx - camX);
      const y = Math.round(this.fy - camY);
      m.drawImage(lightSpr(48), x - 48, y - 48);
    }
    const mo = this._moonS;
    if (mo) {
      if (m) { m.globalAlpha = ka * mo[2]; m.drawImage(lightSpr(26), mo[0] - 26, mo[1] - 26); }
      if (g) { g.globalAlpha = 0.75 * mo[2]; g.drawImage(glow('#b8ccff', 34), mo[0] - 34, mo[1] - 34); }
    }
    for (const l of this.lights) {
      if (l.a * n < 0.02) continue;
      const x = l.x - camX;
      const y = l.y - camY;
      const rr = l.r * 2;
      if (x < -rr || x > W + rr || y < -rr || y > H + rr) continue;
      if (m) {
        m.globalAlpha = Math.min(0.92, l.a * 1.8) * ka;
        m.drawImage(lightSpr(rr), Math.round(x - rr), Math.round(y - rr));
      }
      if (g && x > -l.r && x < W + l.r && y > -l.r && y < H + l.r) {
        const fl = 1 + (l.f || 0) * Math.sin(t * 7.3 * (l.s || 1) + l.x) * 0.5;
        g.globalAlpha = clamp(l.a * fl * 1.3, 0, 1);
        g.drawImage(glow(l.col, l.r), Math.round(x - l.r), Math.round(y - l.r));
      }
    }
    if (m) m.globalAlpha = 1;
    if (g) g.globalAlpha = 1;
  }

  // Bản đồ sáng: nền màu c, các nguồn sáng 'lighten' lên (lấy max, không cộng dồn)
  _lightMap(c, camX, camY, W, H, n, withGlow) {
    const cv = this._canvas('nmask', W, H);
    const m = cv.getContext('2d');
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
    m.fillStyle = c;
    m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'lighten';
    const g = withGlow ? this._glowCtx(W, H) : null;
    this._lightPass(m, g, camX, camY, W, H, n);
    m.globalCompositeOperation = 'source-over';
    return cv;
  }

  _glowCtx(W, H) {
    const g = this._canvas('ncv', W, H).getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    return g;
  }

  // Quầng màu đèn: gộp sẵn rồi phủ 'screen' với alpha giới hạn nên không bao giờ cháy trắng
  _drawGlow(ctx, n) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.7, n * 0.8);
    ctx.drawImage(this.ncv, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  buildTerrain() {
    const m = this.map;
    const T = new Buf(m.w, m.h);
    const R = rng(this.seed + 3);
    const A = { lights: this.lights, anims: this.anims };
    if (m.town && this.th.town) buildVillage(T, m, this.th, this.sc, R, A);
    else buildFieldDecor(T, m, this.th, this.sc, R, A);
    buildGround(T, m, this.th, this.sc, R);
    buildCliffs(T, m, this.th, this.sc, R);
    for (const [px, py, pw] of m.platforms) buildPlatform(T, m, this.th, this.sc, R, px, py, pw, A);
    return T.canvas;
  }

  layerBottom(l, camY) {
    return Math.round(this.map.ground - C0 + 4 - l.off - (camY - C0) * l.fy);
  }

  // Bầu trời + 3 lớp parallax + mặt nước (gọi mỗi khung hình)
  drawBackground(ctx, camX, camY, W, H, t) {
    this.t = t;
    this.frame = (this.frame + 1) | 0;
    // tính pha ngay đầu khung (giờ lấy theo lần gọi lớp sáng trước) để sao/trăng không trễ 1 khung
    if (this._lit) this.nightK = this._phase(this._hour).nightK;
    const sc = this.sc;
    const G = this.map.ground;
    const gs = G - camY;
    const dy = camY - C0;
    // trời
    const sy = Math.round(gs - this.skyH + 20 - dy * 0.12);
    const st = sc.sky;
    if (sy > 0) { ctx.fillStyle = st[0]; ctx.fillRect(0, 0, W, sy); }
    for (let x = 0; x < W; x += 256) ctx.drawImage(this.sky, x, sy);
    if (sy + this.skyH < H) { ctx.fillStyle = st[st.length - 1]; ctx.fillRect(0, sy + this.skyH, W, H - sy - this.skyH); }
    if (sc.stars) {
      for (let i = 0; i < 12; i++) {
        const x = (hash1(i * 7 + 1) * W) | 0;
        const y = (hash1(i * 13 + 5) * 90 + sy * 0.3) | 0;
        if (Math.sin(t * (1.5 + hash1(i) * 2) + i * 3) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
    }
    if (sc.aurora) {
      const a = auroraCanvas(3);
      ctx.globalAlpha = 0.75 + Math.sin(t * 0.6) * 0.2;
      const ox = (((camX * 0.03 + t * 3) % 512) + 512) % 512;
      for (let x = -ox; x < W; x += 512) ctx.drawImage(a, Math.round(x), Math.round(8 - dy * 0.1));
      ctx.globalAlpha = 1;
    }
    const nk = this.nightK;
    const open = !this.th.ceiling;
    if (nk > 0.02 && open) {
      ctx.globalAlpha = Math.min(1, nk * 1.2);
      const ns = nightStars();
      const ox = ((((camX * 0.02) % 512) + 512) % 512);
      for (let x = -ox; x < W; x += 512) ctx.drawImage(ns, Math.round(x), Math.round(sy * 0.3 - dy * 0.05));
      ctx.globalAlpha = 1;
    }
    if (sc.rainbow) {
      const rb = rainbowSpr(sc.rainbow.r);
      ctx.globalAlpha = 1 - nk;
      ctx.drawImage(rb, Math.round(W * sc.rainbow.x - camX * 0.012 - rb.width / 2), Math.round(sc.rainbow.y - dy * 0.1 - rb.height));
      ctx.globalAlpha = 1;
    }
    if (sc.sun) {
      const daySun = sc.sun.k === 'sun';
      if (!daySun || nk < 0.98) {
        const sp = sunSpr(sc.sun).canvas;
        if (daySun) ctx.globalAlpha = 1 - nk;
        ctx.drawImage(sp, Math.round(W * sc.sun.x - camX * 0.01 - sp.width / 2), Math.round(sc.sun.y + (daySun ? nk * 40 : 0) - dy * 0.1 - sp.height / 2));
        ctx.globalAlpha = 1;
      }
    }
    if (nk > 0.02 && open && (!sc.sun || sc.sun.k === 'sun')) {
      // trăng lên khi trời tối
      const mp = sunSpr({ k: 'moon', r: 9, glow: '#c8d8ff' }).canvas;
      ctx.globalAlpha = nk;
      const mx = Math.round(W * (sc.sun ? 1 - sc.sun.x : 0.3) - camX * 0.01);
      const my = Math.round(40 + (1 - nk) * 30 - dy * 0.1);
      ctx.drawImage(mp, mx - (mp.width >> 1), my - (mp.height >> 1));
      ctx.globalAlpha = 1;
      // trăng là nguồn sáng: lớp đêm chừa lại đĩa trăng và thêm quầng
      this._moonS = [mx, my, nk];
    } else this._moonS = null;
    if (sc.surface) {
      // mặt nước gợn sáng phía trên (nhìn từ đáy biển)
      const cs = causticSpr();
      const yy = Math.round(Math.max(sy, 0) - 4 - dy * 0.05);
      ctx.globalCompositeOperation = 'lighter';
      for (const [sp2, a] of [[7, 0.55], [-5, 0.4]]) {
        ctx.globalAlpha = a;
        const ox = ((((camX * 0.05 + t * sp2) % 256) + 256) % 256);
        for (let x = -ox; x < W; x += 256) ctx.drawImage(cs, Math.round(x), yy + (sp2 < 0 ? 5 : 0));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (sc.eyes) this.drawSkyEyes(ctx, camX, dy, W, t, sc.eyes);
    // mây trôi
    for (const c of this.clouds) {
      const span = W + c.cv.width * 2 + 40;
      const x = ((((c.x + t * c.sp - camX * c.z) % span) + span) % span) - c.cv.width - 20;
      ctx.drawImage(c.cv, Math.round(x), Math.round(c.y - dy * (0.1 + c.z)));
    }
    const L = this.layers;
    const wt = sc.water;
    const lastRefl = wt ? Math.max(...wt.refl) : -1;
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      const by = this.layerBottom(l, camY);
      const ox = (((Math.round(camX * l.fx) % l.w) + l.w) % l.w);
      for (let x = -ox; x < W; x += l.w) ctx.drawImage(l.cv, x, by - l.h);
      if (by < gs && l.fill) { ctx.fillStyle = l.fill; ctx.fillRect(0, by, W, gs - by + 1); }
      if (i === 0) this.drawBirds(ctx, camX, dy, W, t);
      if (i === lastRefl) this.drawWater(ctx, camX, camY, W, t, by, gs);
      if (i === 1 && sc.fog) this.drawFog(ctx, camX, dy, W, t, by - 30, 0.8);
    }
    if (L.ceil) {
      const c = L.ceil;
      const cy = Math.round(-16 - dy * c.fy);
      if (cy > 0) { ctx.fillStyle = c.fill; ctx.fillRect(0, 0, W, cy); }
      const ox = (((Math.round(camX * c.fx) % c.w) + c.w) % c.w);
      for (let x = -ox; x < W; x += c.w) ctx.drawImage(c.cv, x, cy);
    }
  }

  // Những cặp mắt đỏ chớp chớp giữa trời ma giới
  drawSkyEyes(ctx, camX, dy, W, t, n) {
    const span = W + 200;
    for (let i = 0; i < n; i++) {
      const x = Math.round(((((hash1(i * 17 + 3) * 1400 - camX * 0.03) % span) + span) % span) - 100);
      const y = Math.round(26 + hash1(i * 29 + 7) * 80 - dy * 0.1);
      const blink = Math.sin(t * 0.6 + i * 2.3);
      if (blink < -0.92) continue;
      const big = hash1(i * 5) > 0.6 ? 1 : 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 + Math.sin(t * 1.3 + i) * 0.15;
      ctx.drawImage(glow('#ff2a4a', 12), x - 8, y - 12);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const look = Math.round(Math.sin(t * 0.4 + i * 1.7));
      const half = blink < -0.8 ? 1 : 0;
      for (const ex of [x - 4 - big, x + 2 + big]) {
        ctx.fillStyle = '#ff3a4a';
        ctx.fillRect(ex, y + half, 3 + big, 2 - half);
        ctx.fillStyle = '#ffd0d8';
        ctx.fillRect(ex, y + half, 1, 1);
        ctx.fillStyle = '#1a0408';
        ctx.fillRect(ex + 1 + (look > 0 ? 1 : 0), y + half, 1, 2 - half);
      }
    }
  }

  drawBirds(ctx, camX, dy, W, t) {
    const bat = this.sc.birds === 'bat';
    if (this.sc.birds === 'fish') {
      // đàn cá nhỏ bơi xa (sprite có thân, đuôi, mắt)
      ctx.globalAlpha = 0.85;
      for (const b of this.birds) for (let k = 0; k < 3; k++) {
        const span = W + 120;
        const x = Math.round(((((b.x + k * 13 + t * b.sp * 0.6 * b.d - camX * 0.12) % span) + span) % span) - 60);
        const y = Math.round(b.y + 20 + (k % 2) * 6 + k * 2 - dy * 0.15 + Math.sin(t * 0.9 + b.ph + k) * 4);
        const fr = Math.sin(t * 8 + b.ph + k) > 0 ? 1 : 0;
        ctx.drawImage(fishSpr(b.d > 0 ? 1 : -1, fr), x - 5, y - 2);
      }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = bat ? '#120a18' : this.sc.birdCol || 'rgba(60,50,70,0.75)';
    for (const b of this.birds) {
      const span = W + 120;
      const x = Math.round(((((b.x + t * b.sp * b.d - camX * 0.12) % span) + span) % span) - 60);
      const y = Math.round(b.y - dy * 0.15 + Math.sin(t * 0.8 + b.ph) * 6);
      const up = Math.sin(t * (bat ? 18 : 9) + b.ph) > 0;
      ctx.fillRect(x, y, 1, 1);
      if (up) { ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x + 1, y - 1, 2, 1); if (bat) { ctx.fillRect(x - 3, y - 2, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1); } }
      else { ctx.fillRect(x - 2, y + 1, 2, 1); ctx.fillRect(x + 1, y + 1, 2, 1); }
    }
  }

  drawWater(ctx, camX, camY, W, t, hy, gs) {
    const wt = this.sc.water;
    if (gs <= hy) return;
    const h = gs - hy;
    ctx.fillStyle = wt.col;
    ctx.fillRect(0, hy, W, h + 1);
    ctx.fillStyle = wt.deep;
    ctx.fillRect(0, hy + Math.round(h * 0.55), W, h);
    for (const i of wt.refl) {
      const l = this.layers[i];
      const ox = (((Math.round(camX * l.fx) % l.w) + l.w) % l.w);
      const rh = Math.min(h, l.refl.height);
      if (rh > 0) for (let x = -ox; x < W; x += l.w) ctx.drawImage(l.refl, 0, 0, l.w, rh, x, hy, l.w, rh);
    }
    ctx.fillStyle = wt.top;
    ctx.fillRect(0, hy, W, 1);
    // gợn sóng lấp lánh
    for (let k = 0; k < 46; k++) {
      const f = Math.pow(hash1(k * 3 + 1), 1.3);
      const yy = Math.round(hy + 2 + f * (h - 3));
      const len = 2 + Math.round(f * 7);
      const sp = 3 + hash1(k) * 6;
      const span = W + 30;
      const x = ((((hash1(k * 5 + 2) * 900 + t * sp - camX * (0.15 + f * 0.6)) % span) + span) % span) - 15;
      const a = 0.25 + 0.55 * Math.max(0, Math.sin(t * 2 + k));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.fillRect(Math.round(x), yy, len, 1);
    }
    if (wt.foam) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let x = 0; x < W; x += 2) {
        const yy = gs - 3 + Math.round(Math.sin((x + camX) * 0.08 + t * 2) * 1.2 + Math.sin(t * 1.3) * 1);
        ctx.fillRect(x, yy, 2, 1);
      }
    }
  }

  drawFog(ctx, camX, dy, W, t, y, a) {
    const f = fogSpr();
    ctx.globalAlpha = a;
    const ox = ((((camX * 0.35 + t * 4) % 512) + 512) % 512);
    for (let x = -ox; x < W; x += 512) ctx.drawImage(f, Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  drawTerrain(ctx, camX, camY, W, H) {
    const t = this.t;
    const ix = Math.floor(camX);
    const iy = Math.floor(camY);
    const sx = Math.max(0, ix);
    const sy = Math.max(0, iy);
    const sw = Math.min(this.terrain.width - sx, W + 1);
    const sh = Math.min(this.terrain.height - sy, H + 1);
    if (sw > 0 && sh > 0) ctx.drawImage(this.terrain, sx, sy, sw, sh, sx - ix, sy - iy, sw, sh);
    const below = this.map.h - camY;
    if (below < H) {
      ctx.fillStyle = shd(this.th.dirt, -0.45);
      ctx.fillRect(0, Math.floor(below), W, H - below + 1);
    }
    // vật động: khói, lửa đuốc, cờ
    for (const a of this.anims) {
      const x = a.x - camX;
      const y = a.y - camY;
      if (x < -40 || x > W + 40 || y < -80 || y > H + 20) continue;
      this.drawAnim(ctx, a, Math.round(x), Math.round(y), t);
    }
    if (this.th.lava) this.drawLava(ctx, camX, camY, W, H, t);
    // quầng sáng (cộng màu)
    ctx.globalCompositeOperation = 'lighter';
    const K = this.lightK;
    for (const l of this.lights) {
      const x = l.x - camX;
      const y = l.y - camY;
      if (x < -l.r || x > W + l.r || y < -l.r || y > H + l.r) continue;
      const fl = 1 + (l.f || 0) * (Math.sin(t * 7.3 * (l.s || 1) + l.x) * 0.6 + Math.sin(t * 13.7 + l.x * 0.7) * 0.4);
      ctx.globalAlpha = clamp(l.a * fl * K, 0, 1);
      ctx.drawImage(glow(l.col, l.r), Math.round(x - l.r), Math.round(y - l.r));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawAnim(ctx, a, x, y, t) {
    const ph = a.x * 0.37;
    if (a.k === 'flame') {
      const h = 6 + Math.round(Math.sin(t * 13 + ph) * 1.5 + Math.sin(t * 7 + ph) * 1);
      const sw = Math.round(Math.sin(t * 9 + ph));
      ctx.fillStyle = '#e8401a';
      ctx.fillRect(x - 2, y - 2, 5, 3);
      ctx.fillRect(x - 1 + sw, y - h, 3, h - 1);
      ctx.fillStyle = '#ff9a2a';
      ctx.fillRect(x - 1, y - 3, 3, 3);
      ctx.fillRect(x + sw, y - h + 2, 2, h - 4);
      ctx.fillStyle = '#fff2a0';
      ctx.fillRect(x, y - 3, 1, 2);
      ctx.fillRect(x + sw, y - h + 1, 1, 1);
    } else if (a.k === 'smoke') {
      for (let k = 0; k < 6; k++) {
        const age = (t * 0.45 + k / 6) % 1;
        const px = x + Math.sin(age * 5 + k) * 2 + age * 12;
        const py = y - age * 34;
        const s = 2 + Math.round(age * 6);
        ctx.fillStyle = `rgba(${200 - age * 40 | 0},${196 - age * 40 | 0},${204 - age * 30 | 0},${((1 - age) * 0.55).toFixed(2)})`;
        ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
        ctx.fillRect(Math.round(px - s / 2 - 1), Math.round(py - s / 2 + 1), s + 2, s - 2);
      }
    } else if (a.k === 'flag' || a.k === 'nobori') {
      const fw = a.k === 'flag' ? 14 : 8;
      const fh = a.k === 'flag' ? 20 : 38;
      const C = ramp(a.col);
      for (let i = 0; i < fw; i++) {
        const o = Math.sin(t * 4 - i * 0.55 + ph) * (i / fw) * 2.2;
        const d = Math.cos(t * 4 - i * 0.55 + ph);
        ctx.fillStyle = d > 0.4 ? C[0] : d < -0.4 ? C[2] : C[1];
        ctx.fillRect(x + 1 + i, Math.round(y + o), 1, fh - (a.k === 'flag' && i > fw - 4 ? (i - fw + 4) * 2 : 0));
        if (i > 3 && i < fw - 4) { ctx.fillStyle = '#ffd54f'; ctx.fillRect(x + 1 + i, Math.round(y + o + (a.k === 'flag' ? 7 : 4)), 1, a.k === 'flag' ? 5 : 3); }
      }
      if (a.k === 'nobori') { ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 4, Math.round(y + 12 + k * 6 + Math.sin(t * 4 - 2.2 + ph) * 1.1), 2, 3); }
    } else if (a.k === 'koi') {
      // cờ cá chép: sprite vẽ sẵn, uốn sóng bằng cách lệch từng cột 1px
      KOI.forEach(([c1, c2, len], j) => {
        const sp = koiSpr(c1, c2, len);
        const fy = y + 2 + j * 11;
        for (let i = 0; i < len; i++) {
          const o = Math.round(Math.sin(t * 5 - i * 0.35 + j) * (i / len) * 3);
          ctx.drawImage(sp, i, 0, 1, 9, x + i, fy + o - 4, 1, 9);
        }
      });
    }
  }

  drawLava(ctx, camX, camY, W, H, t) {
    const top = this.map.h - 12 - camY;
    if (top > H + 4) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.1;
    ctx.drawImage(vGrad('#ff5a10', 0, 0.55), 0, Math.round(top - 34), W, 36);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (let x = 0; x < W; x += 2) {
      const wx = x + camX;
      const y = Math.round(top + Math.sin(wx * 0.08 + t * 2) * 1.5 + Math.sin(wx * 0.21 - t * 3) * 1);
      ctx.fillStyle = '#d8401a';
      ctx.fillRect(x, y + 3, 2, H - y);
      ctx.fillStyle = '#ff8a2a';
      ctx.fillRect(x, y + 1, 2, 3);
      ctx.fillStyle = (Math.floor(wx / 2 + t * 6) % 9) < 3 ? '#fff0a0' : '#ffc04a';
      ctx.fillRect(x, y, 2, 1);
    }
    // bọt sủi
    for (let k = 0; k < 8; k++) {
      const age = (t * 0.7 + hash1(k) * 3) % 1;
      const bx = Math.round(((hash1(k * 11) * 1600 - camX) % (W + 20) + W + 20) % (W + 20) - 10);
      const by = Math.round(top - age * 2);
      if (age < 0.8) {
        const r = 1 + Math.round(age * 2);
        ctx.fillStyle = '#ff9a2a';
        ctx.fillRect(bx - r, by - r, r * 2, r);
        ctx.fillStyle = '#ffe08a';
        ctx.fillRect(bx - r + 1, by - r, 1, 1);
      } else {
        const k = Math.round((age - 0.8) * 25);
        ctx.fillStyle = '#ffd060';
        ctx.fillRect(bx - 2 - k, by - 2 - k, 1, 1);
        ctx.fillRect(bx + 2 + k, by - 3 - k, 1, 1);
        ctx.fillRect(bx, by - 4 - k, 1, 1);
      }
    }
  }

  drawPortals(ctx, camX, camY, t) {
    const G = this.map.ground;
    const col = this.sc.portal || '#ffe08a';
    for (const p of this.map.portals) {
      const x = Math.round(p.x - camX);
      const y = Math.round(G - camY);
      if (x < -80 || x > ctx.canvas.width + 80) continue;
      if (p.door) {
        const cy = this.map.town ? y - 30 : y - 34;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.15;
        ctx.drawImage(glow(col, 28), x - 28, cy - 28);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // vòng xoáy năng lượng
        for (let arm = 0; arm < 3; arm++) {
          for (let i = 0; i < 22; i++) {
            const f = i / 22;
            const ang = -t * 3.2 + arm * 2.094 + f * 5.2;
            const px = Math.round(x + Math.cos(ang) * 17 * f);
            const py = Math.round(cy + Math.sin(ang) * 25 * f);
            ctx.fillStyle = f < 0.35 ? '#ffffff' : f < 0.7 ? mix('#ffffff', col, 0.4) : col;
            ctx.fillRect(px, py, f > 0.5 ? 2 : 1, f > 0.5 ? 2 : 1);
          }
        }
        ctx.fillStyle = rgba(col, 0.9);
        for (let k = 0; k < 28; k++) {
          const a = (k / 28) * TAU + t * 1.5;
          ctx.fillRect(Math.round(x + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 26), 1, 1);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, cy - 1, 2, 2);
        for (let k = 0; k < 6; k++) {
          const age = (t * 0.8 + k / 6) % 1;
          ctx.fillStyle = rgba(k & 1 ? '#ffffff' : col, (1 - age).toFixed(2));
          ctx.fillRect(Math.round(x - 14 + hash1(k) * 28), Math.round(y - 4 - age * 56), 1, 2);
        }
      } else {
        ctx.drawImage(padSpr(col).canvas, x - 20, y - 6);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75 + Math.sin(t * 2.5) * 0.15;
        ctx.drawImage(pillarSpr(col), x - 15, y - 108);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow(col, 24), x - 24, y - 20);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // hai dải xoắn ốc năng lượng
        for (let s2 = 0; s2 < 2; s2++) for (let k = 0; k < 26; k++) {
          const a = t * 3 + k * 0.45 + s2 * Math.PI;
          const hgt = k * 3.4;
          const front = Math.sin(a) > 0;
          const fade = 1 - k / 26;
          ctx.fillStyle = front ? rgba(k < 6 ? '#ffffff' : col, (0.95 * fade + 0.05).toFixed(2)) : rgba(col, (0.35 * fade).toFixed(2));
          ctx.fillRect(Math.round(x + Math.cos(a) * (9 - k * 0.12)), Math.round(y - 4 - hgt), front ? 2 : 1, front ? 2 : 1);
        }
        // hạt sáng bay lên
        for (let k = 0; k < 9; k++) {
          const age = ((t * 0.55 + hash1(k * 3) ) % 1);
          const px = x + Math.sin(k * 2.3 + t * 2) * 7 * (1 - age * 0.5);
          ctx.fillStyle = rgba(k % 3 ? col : '#ffffff', (1 - age).toFixed(2));
          ctx.fillRect(Math.round(px), Math.round(y - 4 - age * 80), 1, k % 3 ? 2 : 1);
        }
        const dir = p.x < this.map.w / 2 ? -1 : 1;
        ctx.drawImage(signSpr(dir), x - dir * 30 - 12, y - 29);
      }
    }
  }

  // Hạt bay theo chủ đề (lá, tuyết, tàn lửa...)
  drawParticles(ctx, camX, camY, W, H, dt) {
    const kind = this.th.part;
    if (!kind) return;
    const ps = this.particles;
    const want = kind === 'mist' ? 10 : kind === 'firefly' ? 26 : kind === 'sparkle' ? 18 : kind === 'sand' ? 30 : kind === 'mote' ? 24 : kind === 'feather' || kind === 'bubble' ? 30 : 46;
    while (ps.length < want) ps.push({ x: Math.random() * W, y: Math.random() * H, v: Math.random(), s: Math.random(), z: 0.5 + Math.random() * 0.7 });
    // dịch theo camera để có chiều sâu
    if (this._pc) {
      const dx = camX - this._pc[0];
      const dy = camY - this._pc[1];
      if (Math.abs(dx) < 60 && Math.abs(dy) < 60) for (const p of ps) { p.x -= dx * p.z; p.y -= dy * p.z; }
    }
    this._pc = [camX, camY];
    const now = performance.now() / 1000;
    for (const p of ps) {
      if (kind === 'snow') { p.y += (10 + p.v * 14) * p.z * dt; p.x += Math.sin(p.y * 0.05 + p.s * 6) * 8 * dt - 3 * dt; }
      else if (kind === 'ember') { p.y -= (10 + p.v * 22) * dt; p.x += Math.sin(p.y * 0.07 + p.s * 5) * 10 * dt; }
      else if (kind === 'petal' || kind === 'leaf' || kind === 'maple') { p.y += (9 + p.v * 10) * dt; p.x -= (8 + p.v * 14) * dt + Math.sin(now * 2 + p.s * 9) * 6 * dt; }
      else if (kind === 'firefly') { p.x += Math.sin(now * 0.7 + p.s * 50) * 9 * dt; p.y += Math.cos(now * 0.6 + p.v * 50) * 7 * dt; }
      else if (kind === 'dust') { p.y += 3 * dt; p.x += Math.sin(now + p.s * 9) * 2 * dt; }
      else if (kind === 'mist') { p.x += (4 + p.v * 6) * dt; const gs = this.map.ground - camY; if (p.y > gs - 6 || p.y < gs - 90) p.y = gs - 8 - p.v * 80; }
      else if (kind === 'sand') { p.x += (60 + p.v * 60) * dt; p.y += Math.sin(now * 3 + p.s * 9) * 4 * dt; }
      else if (kind === 'sparkle') { p.y -= (2 + p.v * 4) * dt; p.x += Math.sin(now * 0.8 + p.s * 20) * 4 * dt; }
      else if (kind === 'feather') { p.y += (4 + p.v * 6) * dt; p.x += Math.sin(now * 1.2 + p.s * 9) * 10 * dt - 2 * dt; }
      else if (kind === 'bubble') { p.y -= (8 + p.v * 16) * p.z * dt; p.x += Math.sin(now * 2.4 + p.s * 9) * 7 * dt; }
      else if (kind === 'mote') { p.y -= (2 + p.v * 5) * dt; p.x += Math.sin(now * 0.6 + p.s * 30) * 5 * dt; }
      else if (kind === 'void') { p.y -= (6 + p.v * 14) * dt; p.x += Math.sin(p.y * 0.05 + p.s * 5) * 8 * dt; }
      if (p.y > H + 6) { p.y = -4; p.x = Math.random() * W; }
      if (p.y < -6) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -60) p.x = W + 4;
      if (p.x > W + 60) p.x = -4;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const spin = Math.sin(now * (3 + p.v * 4) + p.s * 20);
      switch (kind) {
        case 'snow':
          ctx.fillStyle = p.z > 0.95 ? '#ffffff' : 'rgba(255,255,255,0.7)';
          if (p.z > 1.0) { ctx.fillRect(x, y, 2, 2); ctx.fillStyle = 'rgba(190,220,255,0.8)'; ctx.fillRect(x, y + 2, 2, 1); }
          else ctx.fillRect(x, y, 1, 1);
          break;
        case 'ember': {
          const hot = Math.sin(now * 9 + p.s * 30) > 0;
          ctx.fillStyle = 'rgba(255,120,30,0.35)';
          ctx.fillRect(x - 1, y - 1, 3, 3);
          ctx.fillStyle = hot ? '#ffe08a' : p.v > 0.5 ? '#ffab40' : '#ff6d00';
          ctx.fillRect(x, y, 1, p.z > 1 ? 2 : 1);
          break;
        }
        case 'petal':
        case 'maple':
        case 'leaf': {
          const c = kind === 'petal' ? ['#ffd6e6', '#f48fb1'] : kind === 'maple' ? (p.s > 0.5 ? ['#ffb04a', '#e8602a'] : ['#ff7a4a', '#c8401e']) : ['#b4e070', '#6aa83a'];
          ctx.fillStyle = c[1];
          if (spin > 0.3) ctx.fillRect(x, y, 2, 1);
          else if (spin < -0.3) ctx.fillRect(x, y, 1, 2);
          else ctx.fillRect(x, y, 2, 2);
          ctx.fillStyle = c[0];
          ctx.fillRect(x, y, 1, 1);
          break;
        }
        case 'firefly': {
          const on = Math.sin(now * 2 + p.s * 40);
          if (on > -0.2) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, on + 0.4) * 0.6;
            ctx.drawImage(glow('#d8ff6a', 8), x - 8, y - 8);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#f4ffb0';
            ctx.fillRect(x, y, 1, 1);
          }
          break;
        }
        case 'dust':
          ctx.fillStyle = 'rgba(200,190,240,0.45)';
          ctx.fillRect(x, y, 1, 1);
          break;
        case 'mist':
          ctx.globalAlpha = 0.22 + p.v * 0.15;
          ctx.drawImage(glow('#eef2f6', 32), x - 60, y - 16, 120, 32);
          ctx.globalAlpha = 1;
          break;
        case 'sand':
          ctx.fillStyle = 'rgba(240,210,150,0.55)';
          ctx.fillRect(x, y, 2 + ((p.v * 4) | 0), 1);
          break;
        case 'sparkle': {
          const a = Math.max(0, Math.sin(now * 1.5 + p.s * 30));
          ctx.fillStyle = `rgba(255,255,240,${(a * 0.9).toFixed(2)})`;
          ctx.fillRect(x, y, 1, 1);
          if (a > 0.8) { ctx.fillStyle = `rgba(255,255,240,${(a * 0.4).toFixed(2)})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          break;
        }
        case 'feather': {
          if (p.s < 0.6) {
            // lông vũ trắng chao lượn
            ctx.fillStyle = '#ffffff';
            if (spin > 0) { ctx.fillRect(x, y, 3, 1); ctx.fillStyle = '#d6d0ee'; ctx.fillRect(x + 1, y + 1, 2, 1); }
            else { ctx.fillRect(x, y, 1, 3); ctx.fillStyle = '#d6d0ee'; ctx.fillRect(x + 1, y + 1, 1, 2); }
          } else {
            const a = Math.max(0, Math.sin(now * 2 + p.s * 40));
            ctx.fillStyle = a > 0.7 ? '#fff8d0' : '#ffd860';
            ctx.fillRect(x, y, 1, 1);
            if (a > 0.85) { ctx.fillStyle = 'rgba(255,230,140,0.6)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
          }
          break;
        }
        case 'bubble':
          if (p.z > 0.95) {
            ctx.fillStyle = 'rgba(210,250,255,0.75)';
            ctx.fillRect(x, y - 1, 2, 1); ctx.fillRect(x - 1, y, 1, 2); ctx.fillRect(x + 2, y, 1, 2); ctx.fillRect(x, y + 2, 2, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, 1, 1);
          } else { ctx.fillStyle = 'rgba(210,250,255,0.6)'; ctx.fillRect(x, y, 1, 1); }
          break;
        case 'mote':
        case 'void': {
          const cs = kind === 'void' ? ['#d040ff', '#ffb0ff'] : this.th.crys || ['#c07aff', '#5ad8ff'];
          const c = cs[(p.s * cs.length) | 0] || cs[0];
          const on = Math.sin(now * 1.6 + p.s * 40);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (0.35 + Math.max(0, on) * 0.4) * (kind === 'void' ? 0.7 : 1);
          ctx.drawImage(glow(c, 6), x - 6, y - 6);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = on > 0.3 ? '#ffffff' : c;
          ctx.fillRect(x, y, 1, kind === 'void' && p.z > 1 ? 2 : 1);
          break;
        }
        default:
      }
    }
  }

  // Lớp phủ không khí: tia nắng, sương, ám màu, bóng tối quanh nguồn sáng, viền tối
  drawForeground(ctx, camX, camY, W, H, t) {
    const L = this.sc.light || {};
    const dy = camY - C0;
    if (L.rays && this.nightK < 0.95) {
      const rc = raysSpr(L.raysCol);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = L.rays * (0.75 + Math.sin(t * 0.4) * 0.25) * (1 - this.nightK);
      const ox = ((((camX * 0.25) % 320) + 320) % 320);
      for (let x = -ox; x < W; x += 320) ctx.drawImage(rc, Math.round(x), Math.round(-20 - dy * 0.3), 320, H + 40);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.sc.fog) this.drawFog(ctx, camX * 2.2, dy, W, t * 1.6, this.map.ground - camY - 40, (this.sc.fogA || 0.55) * (1 - this.nightK * 0.6));
    if (L.top) ctx.drawImage(vGrad(L.top[0], L.top[1], 0), 0, 0, W, Math.round(H * 0.65));
    if (L.bot) ctx.drawImage(vGrad(L.bot[0], 0, L.bot[1]), 0, Math.round(H * 0.4), W, Math.ceil(H * 0.6));
    if (L.dark) {
      if (!this.mask || this.mask.width !== W || this.mask.height !== H) {
        this.mask = document.createElement('canvas');
        this.mask.width = W;
        this.mask.height = H;
      }
      const m = this.mask.getContext('2d');
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, W, H);
      m.fillStyle = rgba(L.darkCol || '#000000', L.dark);
      m.fillRect(0, 0, W, H);
      m.globalCompositeOperation = 'destination-out';
      m.globalAlpha = 0.85;
      // vùng nhìn quanh người chơi nếu game đã truyền tọa độ (drawNight/drawLighting), không thì giữa màn hình
      const fx = this.fx != null ? this.fx - camX : W / 2;
      const fy = this.fy != null ? this.fy - camY : H * 0.62;
      m.drawImage(hole(96), Math.round(fx - 96), Math.round(fy - 96));
      for (const l of this.lights) {
        const x = l.x - camX;
        const y = l.y - camY;
        const r = l.r * 2;
        if (x < -r || x > W + r || y < -r || y > H + r) continue;
        m.globalAlpha = Math.min(1, l.a * 1.6);
        m.drawImage(hole(r), Math.round(x - r), Math.round(y - r));
      }
      if (this.th.lava) { m.globalAlpha = 0.7; m.drawImage(vGrad('#ffffff', 0, 1), 0, Math.round(this.map.h - camY - 40), W, 40); }
      m.globalAlpha = 1;
      m.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.mask, 0, 0);
    }
    if (L.vig) {
      if (!this.vig || this.vig.width !== W || this.vig.height !== H) {
        const v = document.createElement('canvas');
        v.width = W;
        v.height = H;
        const c = v.getContext('2d');
        const g = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(10,4,20,0)');
        g.addColorStop(1, 'rgba(10,4,20,1)');
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);
        this.vig = v;
      }
      ctx.globalAlpha = L.vig;
      ctx.drawImage(this.vig, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  // ---- Ngày/đêm theo giờ Việt Nam (UTC+7). hour: số thực 0-24 (bỏ trống = giờ thực).
  // px, py: tọa độ THẾ GIỚI của người chơi (tùy chọn) để có quầng sáng quanh nhân vật.
  // Cách nối đề xuất trong game.js:
  //   sau R.drawPortals(...)    -> R.drawNight(c, camX, camY, W, H, undefined, me.x, me.y - 20)
  //   sau R.drawForeground(...) -> R.drawLighting(c, camX, camY, W, H)
  // drawNight làm tối nền + địa hình (có lỗ sáng ở đèn); drawLighting chỉ ám nhẹ lên thực thể rồi thêm quầng đèn.
  // Chỉ gọi drawLighting cũng được: khi đó cả khung tối vừa phải (không tách lớp).

  // Lớp tối cho nền/địa hình. Gọi SAU drawPortals, TRƯỚC khi vẽ NPC/quái/người chơi.
  drawNight(ctx, camX, camY, W, H, hour, px, py) {
    this._lit = true;
    this._hour = hour;
    if (px != null && py != null) { this.fx = px; this.fy = py; }
    const P = this._phase(hour);
    if (P.n < 0.03) return;
    // nền = màu đêm chia cho phần sẽ phủ lên thực thể, để tổng hai lớp đúng bằng màu đêm
    const e = (c) => 255 - (255 - c) * ENT_DARK;
    const col = mulColor((255 * P.r) / e(P.r), (255 * P.g) / e(P.g), (255 * P.b) / e(P.b));
    const cv = this._lightMap(col, camX, camY, W, H, P.n, false);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(cv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    this._nb = this.frame;
  }

  // Lớp phủ cuối: ám màu hoàng hôn/bình minh/đêm + quầng đèn. Gọi SAU drawForeground (và drawParticles),
  // TRƯỚC khi vẽ chữ/khung giao diện. Chỉ dùng ảnh vẽ sẵn, không tạo gradient mỗi khung.
  drawLighting(ctx, camX, camY, W, H, hour, px, py) {
    this._lit = true;
    this._hour = hour;
    if (px != null && py != null) { this.fx = px; this.fy = py; }
    const P = this._phase(hour);
    const { n, du, da } = P;
    if (n < 0.01 && du < 0.01 && da < 0.01) return;
    // ráng chiều / ráng sáng trên nền trời (cộng màu)
    if (du > 0.01 || da > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      if (du > 0.01) { ctx.globalAlpha = du; ctx.drawImage(vGrad('#ff6a2a', 0.3, 0), 0, 0, W, Math.round(H * 0.7)); }
      if (da > 0.01) { ctx.globalAlpha = da; ctx.drawImage(vGrad('#ff8ac0', 0.26, 0), 0, 0, W, Math.round(H * 0.7)); }
      ctx.globalAlpha = 1;
    }
    const split = this._nb === this.frame && n >= 0.03;
    const glowOn = n >= 0.05;
    if (split || n < 0.03) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this._tint(P, split ? ENT_DARK : 1);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      if (glowOn) {
        this._lightPass(null, this._glowCtx(W, H), camX, camY, W, H, n);
        this._drawGlow(ctx, n);
      }
      return;
    }
    // một lớp duy nhất: bản đồ sáng + quầng màu trong cùng một vòng lặp đèn
    const cv = this._lightMap(this._tint(P, SINGLE_DARK), camX, camY, W, H, n, glowOn);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(cv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    if (glowOn) this._drawGlow(ctx, n);
  }
}

export { THEMES };
