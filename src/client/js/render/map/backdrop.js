// Các lớp nền parallax: núi, đồi, hàng cây, hang, tàn tích, khán đài, mây, nhà xa, mái nhà.
import { rng, mix, shd, u32, ramp, Buf, blit, blob, cached, TAU, wrapd, periodic, fades, fadeIdx } from './util.js';
import { sprTree, sprCrystal } from './flora.js';
import { colSpr, statueSpr, sprProp } from './props.js';
import { halo } from './sky.js';

// ======================= Lớp parallax (dải ảnh lặp) =======================
export function bMount(b, o, R) {
  const W = b.w;
  const H = b.h;
  const n = o.n || 6;
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const st = o.steep || 1;
    peaks.push({ x: ((i + 0.15 + R() * 0.7) * W) / n, h: o.hmin + R() * (o.hmax - o.hmin), sl: (0.55 + R() * 0.5) * st, sr: (0.55 + R() * 0.5) * st, dv: (R() - 0.5) * 0.6, g: [-0.5 - R() * 0.5, -0.15 + R() * 0.3, 0.45 + R() * 0.5].slice(0, 2 + ((R() * 2) | 0)) });
  }
  if (o.volcano) Object.assign(peaks[1], { h: o.hmax, vol: true, sl: 0.8, sr: 0.75 });
  const jag = periodic(W, R, [[9, 2.2], [23, 1.1], [57, 0.6]]);
  const top = new Float32Array(W);
  const own = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    let best = -1e9;
    for (let k = 0; k < n; k++) {
      const p = peaks[k];
      const dx = wrapd(x - p.x, W);
      let hh = p.h - (dx < 0 ? -dx * p.sl : dx * p.sr);
      if (p.vol) hh = Math.min(hh, p.h - 7);
      if (hh > best) { best = hh; own[x] = k; }
    }
    top[x] = H - 1 - Math.max(o.minH || 6, best + jag[x] * (o.jag || 1));
  }
  const base = o.base || o.shd;
  const L = fades(o.lit, base);
  const D = fades(o.shd, base);
  const S = fades(o.snow || o.lit, base);
  const SS = fades(o.snowS || o.shd, base);
  const LD = fades(mix(o.lit, o.shd, 0.6), base);
  const DL = fades(mix(o.shd, o.lit, 0.22), base);
  const fadeH = o.fade || Math.round(H * 0.45);
  for (let x = 0; x < W; x++) {
    const p = peaks[own[x]];
    const dx = wrapd(x - p.x, W);
    const ty = Math.max(0, Math.ceil(top[x]));
    for (let y = ty; y < H; y++) {
      const fromPeak = y - (H - 1 - p.h);
      const div = fromPeak * p.dv + Math.sin(y * 0.6 + p.x) * 1.3 + Math.sin(y * 0.23) * 2;
      const lit = dx < div;
      // khe núi tỏa xuống từ đỉnh
      let crease = false;
      if (fromPeak > 6 && fromPeak < p.h * 0.85) for (const g of p.g) if (Math.abs(dx - fromPeak * g + Math.sin(fromPeak * 0.22 + g * 9) * 2) < 0.55 + fromPeak * 0.006) crease = true;
      const fi = fadeIdx(x, y, H, fadeH);
      const snowD = o.snow && p.h > (o.snowLine || 70) ? (p.h - (o.snowLine || 70)) * 0.55 + Math.sin(x * 0.9) * 2 + Math.sin(x * 0.31) * 2.5 : -1;
      let c;
      if (fromPeak < snowD) c = lit ? (crease ? SS[fi] : S[fi]) : crease ? S[Math.min(2, fi + 1)] : SS[fi];
      else c = lit ? (crease ? LD[fi] : L[fi]) : crease ? DL[fi] : D[fi];
      if (y === ty && o.rim) c = lit ? o.rim : fromPeak < snowD ? S[0] : mix(o.shd, o.rim, 0.25);
      b.p(x, y, c);
    }
  }
  if (o.volcano) {
    const p = peaks[1];
    const cy = H - 1 - (p.h - 7) + 1;
    for (let i = -6; i <= 6; i++) { b.p(p.x + i, cy - 1, i % 3 ? '#ff8a3c' : '#ffd36a'); b.p(p.x + i, cy, '#c8401e'); }
    halo(b, p.x, cy - 2, 14, '#ff8a4a', 0.4);
    const sm = o.smoke || ['#e6c8c8', '#c8a0aa', '#a07a8a', '#80607a'];
    for (let i = 0; i < 7; i++) blob(b, p.x + i * 5 + R() * 3, cy - 8 - i * 6, 5 + i * 1.3, 4 + i, sm, { wob: 0.15, ph: R() * 6 });
  }
}

export function bHills(b, o, R) {
  const W = b.w;
  const H = b.h;
  const prof = periodic(W, R, [[2, o.amp], [3, o.amp * 0.6], [5, o.amp * 0.35], [9, o.amp * 0.15]]);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = Math.round(H - 1 - (o.base + prof[x]));
  const B = fades(o.col, o.dark);
  const Lt = fades(o.lit, o.dark);
  const fadeH = Math.round(H * 0.6);
  for (let x = 0; x < W; x++) {
    const sl = top[(x + 2) % W] - top[(x + W - 2) % W];
    for (let y = Math.max(0, top[x]); y < H; y++) {
      const d = y - top[x];
      const fi = fadeIdx(x, y, H, fadeH);
      let c = sl < 0 && d < 6 + ((x * 3) % 3) ? Lt[fi] : B[fi];
      if (d === 0) c = o.rim || Lt[0];
      if (o.terrace && d > 2 && (y + Math.round(Math.sin(x * 0.045) * 2)) % 6 === 0) c = Lt[Math.min(2, fi)];
      if (o.terrace && d > 2 && (y + Math.round(Math.sin(x * 0.045) * 2)) % 6 === 1) c = mix(B[fi], o.dark, 0.3);
      b.p(x, y, c);
    }
  }
  // bụi cây trên sườn
  const tp = o.trees;
  if (tp) {
    const cnt = o.treeN || 60;
    for (let i = 0; i < cnt; i++) {
      const x = R() * W;
      const yy = top[Math.floor(x) % W] + (i % 3 === 0 ? 2 + R() * (H * 0.35) : 1);
      const r = 2.5 + R() * (o.treeR || 4);
      if (o.treeKind === 'pine') {
        for (let k = 0; k < r * 2.4; k++) { const hw = Math.round((k / (r * 2.4)) * r * 0.8); b.r(x - hw, yy - r * 2.4 + k, hw * 2 + 1, 1, k < r ? tp[1] : tp[2]); if (o.snowy && k % 3 === 0) b.r(x - hw, yy - r * 2.4 + k, hw + 1, 1, '#f4f8fb'); }
      } else blob(b, x, yy - r * 0.7, r, r * 0.85, tp, { wob: 0.15, ph: i });
    }
  }
  if (o.feat) for (const f of o.feat) {
    const x = Math.floor(R() * W);
    const spr = featSpr(f, o.featCol || '#6a3a4a');
    let y = H;
    for (let i = 0; i < spr.w; i++) y = Math.min(y, top[(x + i) % W]);
    blit(b, spr, x, y - spr.h + 4, { haze: o.dark, amt: o.featHaze || 0.35 });
  }
}

export function bTreeRow(b, o, R) {
  const W = b.w;
  const H = b.h;
  const gh = o.gh || 8;
  const prof = periodic(W, R, [[6, 1.5], [17, 0.8]]);
  const G = fades(o.ground, o.dark || shd(o.ground, -0.4));
  for (let x = 0; x < W; x++) {
    const t = Math.round(H - gh + prof[x]);
    for (let y = t; y < H; y++) b.p(x, y, y === t ? shd(o.ground, 0.18) : G[Math.min(2, ((y - t) / 3) | 0)]);
  }
  if (o.extra) o.extra(b, R, H - gh);
  const rows = o.rows || [[o.gap || 40, o.hmin, o.hmax, o.amt + 0.18], [o.gap || 40, o.hmin, o.hmax, o.amt]];
  rows.forEach(([gap, hmin, hmax, amt], ri) => {
    if (ri === 1 && o.houses) {
      let hx0 = R() * 40;
      while (hx0 < W) {
        const spr = backHouseSpr(o.houses[0], o.houses[1], (R() * 5) | 0);
        blit(b, spr, hx0, H - gh + 3 - spr.h, { haze: o.haze, amt: amt + 0.06, flip: R() < 0.5 });
        hx0 += spr.w + 30 + R() * 60;
      }
    }
    let x = R() * gap;
    while (x < W) {
      const kind = o.kinds[(R() * o.kinds.length) | 0];
      const h = Math.round(hmin + R() * (hmax - hmin));
      const spr = sprTree(kind, h, (R() * 4) | 0, { leaf: o.leaf, snow: o.snow, bark: o.bark, noOutline: o.noOutline, eyes: o.eyes, eyeCol: o.eyeCol });
      blit(b, spr, x - spr.w / 2, H - gh + 3 - spr.h, { haze: o.haze, amt, flip: R() < 0.5 });
      x += gap * (0.6 + R() * 0.8);
    }
  });
  if (o.front) o.front(b, R, H - gh);
}

export function bMesa(b, o, R) {
  const W = b.w;
  const H = b.h;
  const top = new Float32Array(W).fill(H);
  const mesas = [];
  for (let i = 0; i < (o.n || 5); i++) mesas.push({ x: ((i + R() * 0.6) * W) / (o.n || 5), hw: 20 + R() * 45, h: o.hmin + R() * (o.hmax - o.hmin) });
  const jag = periodic(W, R, [[31, 1], [71, 0.6]]);
  for (let x = 0; x < W; x++) {
    for (const m of mesas) {
      const dx = Math.abs(wrapd(x - m.x, W));
      let h = dx < m.hw ? m.h : m.h - (dx - m.hw) * 2.6;
      if (dx > m.hw + 6) h = Math.min(h, m.h * 0.35 - (dx - m.hw - 6) * 0.45);
      top[x] = Math.min(top[x], H - 1 - Math.max(4, h + jag[x]));
    }
  }
  const L = fades(o.lit, o.base);
  const D = fades(o.shd, o.base);
  const St = fades(o.band, o.base);
  for (let x = 0; x < W; x++) {
    let m0 = mesas[0];
    let bd = 1e9;
    for (const m of mesas) { const d = Math.abs(wrapd(x - m.x, W)); if (d < bd) { bd = d; m0 = m; } }
    const dx = wrapd(x - m0.x, W);
    for (let y = Math.max(0, Math.ceil(top[x])); y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.5);
      const lit = dx < -m0.hw * 0.55 + Math.sin(y * 0.5) * 2 || (y - top[x] < 2);
      let c = lit ? L[fi] : D[fi];
      if ((y + Math.round(jag[x] * 0.5)) % 9 < 2) c = lit ? St[fi] : mix(St[fi], D[fi], 0.5);
      if (y === Math.ceil(top[x])) c = o.rim;
      b.p(x, y, c);
    }
  }
}

export function bDunes(b, o, R) {
  const W = b.w;
  const H = b.h;
  const ph = [R() * TAU, R() * TAU, R() * TAU];
  const hf = (x) => o.base + o.amp * (1 - Math.pow(Math.abs(Math.sin((x / W) * Math.PI * 3 + ph[0])), 0.7)) + o.amp * 0.5 * (1 - Math.abs(Math.sin((x / W) * Math.PI * 7 + ph[1]))) + Math.sin((x / W) * TAU * 2 + ph[2]) * 4;
  const L = fades(o.lit, o.base2 || o.shd);
  const D = fades(o.shd, o.base2 || o.shd);
  for (let x = 0; x < W; x++) {
    const h = hf(x);
    const lit = hf(x + 1) > h;
    const ty = Math.round(H - 1 - h);
    for (let y = Math.max(0, ty); y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.55);
      let c = lit ? L[fi] : D[fi];
      if (lit && (y - ty) % 5 === 2 && ((x >> 2) & 1)) c = mix(L[fi], o.rim, 0.4);
      if (y === ty) c = o.rim;
      b.p(x, y, c);
    }
  }
  if (o.cacti) for (let i = 0; i < o.cacti; i++) {
    const x = R() * W;
    const spr = sprTree('cactus', 12 + ((R() * 10) | 0), i % 3);
    blit(b, spr, x, H - 1 - hf(x) - spr.h + 4, { haze: o.base2 || o.shd, amt: o.amt || 0.4 });
  }
}

export function bKarst(b, o, R) {
  const W = b.w;
  const H = b.h;
  const tw = [];
  for (let i = 0; i < (o.n || 9); i++) tw.push({ x: R() * W, w: 16 + R() * 22, h: o.hmin + R() * (o.hmax - o.hmin), k: R() * 9, lg: 8 + ((R() * 6) | 0) });
  tw.sort((a, b2) => a.h - b2.h);
  const top = new Float32Array(W).fill(H - 1 - (o.floor || 6));
  const own = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) {
    tw.forEach((t, k) => {
      const f = Math.abs(wrapd(x - t.x, W)) / t.w;
      if (f >= 1) return;
      const h = t.h * Math.pow(1 - Math.pow(f, 1.6), 0.55) + Math.sin(x * 0.9 + t.k) * 1.2 + Math.sin(x * 0.31 + t.k) * 2;
      const y = H - 1 - h;
      if (y < top[x]) { top[x] = y; own[x] = k; }
    });
  }
  const L = fades(o.lit, o.base);
  const M = fades(mix(o.lit, o.shd, 0.5), o.base);
  const D = fades(o.shd, o.base);
  const V = fades(o.tree, o.base);
  for (let x = 0; x < W; x++) {
    const t = own[x] >= 0 ? tw[own[x]] : null;
    const dx = t ? wrapd(x - t.x, W) : 0;
    const ty = Math.max(0, Math.ceil(top[x]));
    for (let y = ty; y < H; y++) {
      const fi = fadeIdx(x, y, H, H * 0.75);
      const u = t ? dx / t.w : 0;
      let c = !t ? M[fi] : u < -0.4 + Math.sin(y * 0.3 + t.k) * 0.1 ? L[fi] : u < 0.3 + Math.sin(y * 0.21 + x) * 0.06 ? M[fi] : D[fi];
      // gờ đá ngang + bụi cây bám vách
      if (t && (y - ty) > 3 && (y + Math.round(t.k)) % t.lg === 0) c = D[fi];
      if (t && (y - ty) > 3 && (y + Math.round(t.k)) % t.lg === t.lg - 1 && Math.sin(x * 0.5 + y) > -0.2) c = V[fi];
      if (y === ty || y === ty + 1) c = V[Math.min(2, fi)];
      b.p(x, y, c);
    }
  }
  // cây thông nhỏ trên đỉnh
  for (const t of tw) for (let i = 0; i < 4; i++) {
    const x = t.x + (i - 1.5) * t.w * 0.28;
    const y = top[Math.floor(((x % W) + W) % W)];
    const h = 3 + R() * 5;
    for (let k = 0; k < h; k++) { const hw = Math.round((k / h) * h * 0.4); b.r(x - hw, y - h + k + 1, hw * 2 + 1, 1, o.tree); }
  }
}

export function bCave(b, o, R) {
  const W = b.w;
  const H = b.h;
  const pal = o.pal; // [lit, mid, dark, base]
  // cột đá nối trần - đất
  for (let i = 0; i < (o.cols || 5); i++) {
    const cx0 = R() * W;
    const cw = 8 + R() * 16;
    const ph = R() * TAU;
    // vary: mỗi cột một dáng (thắt eo khác nhau, nghiêng, gãy giữa) để không lặp lại
    const kind = o.vary ? i % 3 : 0;
    const pinch = o.vary ? 0.3 + R() * 0.5 : 0.55;
    const lean = o.vary ? (R() - 0.5) * 36 : 0;
    const wob = o.vary ? 1 + R() * 3 : 2;
    const fr = o.vary ? 0.07 + R() * 0.16 : 0.15;
    const gap = kind === 2 ? [H * (0.3 + R() * 0.15), H * (0.55 + R() * 0.15)] : null;
    for (let y = 0; y < H; y++) {
      const f = y / H;
      if (gap && y > gap[0] && y < gap[1]) continue;
      const cx = cx0 + lean * (f - 0.5);
      let w = cw * (pinch + (1 - pinch) * Math.abs(Math.cos(f * Math.PI))) + Math.sin(y * fr + ph) * wob;
      if (kind === 1) w *= 0.75 + 0.5 * f;
      if (gap) w *= Math.min(1, Math.min(Math.abs(y - gap[0]), Math.abs(y - gap[1])) / 22);
      if (w < 0.5) continue;
      for (let x = Math.floor(cx - w); x <= cx + w; x++) {
        const u = (x - (cx - w)) / (2 * w);
        const fi = fadeIdx(x, y, H, H * 0.25);
        let c = u < 0.22 ? pal[0] : u < 0.7 ? pal[1] : pal[2];
        if (fi === 2) c = mix(c, pal[3], 0.5);
        if ((y + Math.round(u * 7)) % 13 === 0 && u > 0.2) c = pal[2];
        b.p(x, y, c);
      }
    }
  }
  // măng đá dưới, nhũ đá trên
  for (let i = 0; i < (o.spikes || 26); i++) {
    const x = R() * W;
    const w = 4 + R() * 10;
    const h = o.minS + R() * (o.maxS - o.minS);
    const up = i % 2 === 0;
    const y0 = up ? H : 0;
    const dir = up ? -1 : 1;
    for (let k = 0; k < h; k++) {
      const hw = w * (1 - k / h);
      for (let xx = Math.floor(x - hw); xx <= x + hw; xx++) {
        const u = (xx - (x - hw)) / (2 * hw + 0.01);
        b.p(xx, y0 + dir * (k + 1), u < 0.3 ? pal[0] : u < 0.72 ? pal[1] : pal[2]);
      }
    }
  }
  // tinh thể / dòng dung nham trong vách
  if (o.crystal) for (let i = 0; i < (o.crysN || 10); i++) {
    const col = Array.isArray(o.crystal) ? o.crystal[i % o.crystal.length] : o.crystal;
    const spr = sprCrystal(8 + ((R() * (o.crysH || 8)) | 0), col, i % 4);
    const cx = R() * W;
    const cy = H - spr.h - R() * 8;
    halo(b, cx + spr.w / 2, cy + spr.h * 0.6, 18 + spr.h * 0.4, col, 0.35);
    blit(b, spr, cx, cy, { haze: pal[3], amt: o.camt || 0.25 });
  }
  if (o.lavafall) for (let i = 0; i < 3; i++) {
    const x = R() * W;
    const y0 = 10 + R() * 30;
    for (let y = y0; y < H; y++) {
      const w = 3 + Math.sin(y * 0.2) * 0.8 + (y - y0) * 0.02;
      for (let xx = -w; xx <= w; xx++) b.p(x + xx, y, Math.abs(xx) < w * 0.35 ? '#ffe08a' : Math.abs(xx) < w * 0.7 ? '#ff9a3c' : '#d8461e');
    }
    for (let k = 0; k < 10; k++) blob(b, x + (R() - 0.5) * 20, H - 2, 4 + R() * 4, 2.5, ['#ffe08a', '#ff9a3c', '#d8461e', '#8a2412'], { cut: H });
  }
}

export function bRuins(b, o, R) {
  const W = b.w;
  const H = b.h;
  const S = o.col;
  const rim = o.rim;
  for (let i = 0; i < (o.n || 6); i++) {
    const x = Math.floor(R() * W);
    const w = 10 + Math.floor(R() * 18);
    const h = o.hmin + Math.floor(R() * (o.hmax - o.hmin));
    b.r(x, H - h, w, h, S);
    b.r(x, H - h, 1, h, rim);
    // răng cưa / đỉnh gãy
    for (let k = 0; k < w; k += 4) b.r(x + k, H - h - 3, 2, 3, S);
    if (R() < 0.5) b.poly([[x - 2, H - h], [x + w / 2, H - h - 14 - R() * 10], [x + w + 2, H - h]], S);
    for (let k = 0; k < h / 14; k++) { b.r(x + w / 2 - 1, H - h + 8 + k * 14, 2, 4, o.win); }
    // sừng quỷ
    if (o.horns && R() < 0.5) { b.line(x, H - h, x - 5, H - h - 12, S, 2); b.line(x + w, H - h, x + w + 5, H - h - 12, S, 2); }
  }
  // cổng vòm lớn
  if (o.gate) {
    const gx = Math.floor(R() * W);
    const gw = 70;
    const gh = o.hmax + 10;
    b.r(gx, H - gh, 16, gh, S); b.r(gx + gw - 16, H - gh, 16, gh, S); b.r(gx - 6, H - gh - 10, gw + 12, 14, S);
    b.r(gx, H - gh, 1, gh, rim); b.r(gx - 6, H - gh - 10, gw + 12, 1, rim);
    b.line(gx - 6, H - gh - 10, gx - 16, H - gh - 30, S, 3); b.line(gx + gw + 6, H - gh - 10, gx + gw + 16, H - gh - 30, S, 3);
    b.ell(gx + gw / 2, H - gh + 2, 8, 6, S); b.p(gx + gw / 2 - 3, H - gh + 1, o.win); b.p(gx + gw / 2 + 3, H - gh + 1, o.win);
    for (let y = H - gh + 14; y < H; y++) for (let xx = gx + 16; xx < gx + gw - 16; xx++) b.a(xx, y, o.gateCol || '#ff5a2a', 0.18 + 0.25 * ((y - (H - gh)) / gh));
  }
}

export function bStands(b, o, R) {
  const W = b.w;
  const H = b.h;
  const st = ['#e8d2a8', '#cdb084', '#a88a62', '#7a6448'];
  const crowd = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#ffffff', '#3949ab'];
  const skin = ['#f2c6a0', '#e0a878', '#c88a5a'];
  b.r(0, 8, W, H - 8, st[2]);
  // mái che, cột cờ
  for (let x = 0; x < W; x += 64) {
    b.r(x + 2, 0, 2, 12, '#5d4037');
    const c = crowd[(x / 64) % 4 | 0];
    b.poly([[x + 4, 1], [x + 14, 3], [x + 4, 6]], c);
  }
  b.r(0, 8, W, 3, st[0]); b.r(0, 11, W, 1, st[3]);
  // các tầng ghế + khán giả
  for (let tier = 0; tier < 4; tier++) {
    const y = 13 + tier * 9;
    b.r(0, y + 6, W, 2, st[1]); b.r(0, y + 8, W, 1, st[3]);
    for (let x = 1; x < W; x += 3) {
      if (R() < 0.12) continue;
      const bob = R() < 0.3 ? -1 : 0;
      b.p(x, y + 2 + bob, skin[(R() * 3) | 0]);
      b.r(x, y + 3 + bob, 2, 3 - bob, crowd[(R() * crowd.length) | 0]);
    }
  }
  // tường vòm
  const wy = 13 + 4 * 9;
  b.r(0, wy, W, H - wy, st[1]);
  b.r(0, wy, W, 2, st[0]);
  for (let x = 6; x < W; x += 22) {
    b.r(x, wy + 6, 12, H - wy - 6, st[3]);
    b.ell(x + 6, wy + 6, 6, 4, st[3]);
    b.r(x + 1, wy + 7, 2, H - wy - 7, '#5a4632');
    b.r(x - 4, wy + 2, 2, H - wy, st[0]);
    // băng rôn
    if ((x / 22) % 3 < 1) { b.r(x + 2, wy + 3, 8, 12, crowd[((x / 22) | 0) % 3]); b.r(x + 4, wy + 6, 4, 4, '#ffd54f'); }
  }
}

export function bCeiling(b, o, R) {
  const W = b.w;
  const H = b.h;
  const pal = o.pal;
  const band = periodic(W, R, [[5, 3], [13, 2], [29, 1]]);
  for (let x = 0; x < W; x++) {
    const bh = Math.round(12 + band[x]);
    for (let y = 0; y < bh; y++) b.p(x, y, y > bh - 2 ? pal[2] : (x * 7 + y * 3) % 17 === 0 ? pal[0] : pal[1]);
  }
  for (let i = 0; i < (o.n || 40); i++) {
    const x = R() * W;
    const w = 2 + R() * 6;
    const len = 6 + Math.pow(R(), 1.6) * (H - 18);
    const y0 = 10 + band[Math.floor(x) % W];
    for (let k = 0; k < len; k++) {
      const hw = w * Math.pow(1 - k / len, 0.8);
      for (let xx = Math.floor(x - hw); xx <= x + hw; xx++) {
        const u = (xx - (x - hw)) / (2 * hw + 0.01);
        b.p(xx, y0 + k, u < 0.3 ? pal[0] : u < 0.75 ? pal[1] : pal[2]);
      }
    }
    if (o.drip) b.p(x, y0 + len + 1, o.drip);
  }
  // tinh thể mọc ngược từ trần (lật dọc sprite)
  if (o.crys) for (let i = 0; i < 16; i++) {
    const col = o.crys[i % o.crys.length];
    const spr = sprCrystal(10 + ((R() * 14) | 0), col, i % 4);
    const x0 = Math.floor(R() * W);
    const y0 = Math.round(8 + band[x0 % W]);
    halo(b, x0 + spr.w / 2, y0 + spr.h * 0.5, 14 + spr.h * 0.5, col, 0.3);
    for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
      const v = spr.d[(spr.h - 1 - y) * spr.w + x];
      const k = b.ix(x0 + x, y0 + y);
      if (v >>> 24 === 255 && k >= 0) b.d[k] = v;
    }
  }
}

// Một dải mây cuồn cuộn (đỉnh ở yBase ± amp), lấp kín bên dưới, nhạt dần về màu sương
export function puffRow(b, R, yBase, amp, n, rmin, rmax, pal, haze) {
  const W = b.w;
  const H = b.h;
  const c = new Buf(W, H, true);
  const prof = periodic(W, R, [[3, amp * 0.5], [7, amp * 0.3], [13, amp * 0.2]]);
  for (let i = 0; i < n; i++) {
    const x = ((i + R() * 0.8) * W) / n;
    const r = rmin + R() * (rmax - rmin);
    blob(c, x, yBase - prof[Math.floor(x) % W] + r * 0.35, r * 1.3, r, pal, { wob: 0.1, lobes: 5, ph: R() * 6, dither: false });
  }
  const F = fades(pal[2], haze || pal[3]);
  for (let x = 0; x < W; x++) {
    let on = -1;
    for (let y = 0; y < H; y++) {
      const i = y * W + x;
      if (c.d[i] >>> 24) { if (on < 0) on = y; continue; }
      if (on >= 0) c.d[i] = u32(F[Math.min(2, (((y - on) / 10) + ((x + y) & 1 ? 0.15 : -0.15)) | 0)]);
    }
  }
  blit(b, c, 0, 0);
}

export function bCloudBank(b, o, R) {
  const H = b.h;
  // công trình vẽ trước để mây phủ chân
  if (o.feat) for (const f of o.feat) {
    const spr = featSpr(f, o.featCol);
    blit(b, spr, Math.floor(R() * b.w), H - o.base - spr.h + 8 - Math.floor(R() * o.amp * 0.6), { haze: o.haze, amt: o.featHaze != null ? o.featHaze : 0.3 });
  }
  puffRow(b, R, H - o.base, o.amp, o.n || 30, o.rmin, o.rmax, o.pal, o.haze);
  if (o.front) puffRow(b, R, H - o.front, o.amp * 0.5, o.n || 30, o.rmin * 0.7, o.rmax * 0.7, o.pal, o.haze);
}

// Hàng cột: cổng đền trên mây (mái vàng) hoặc phế tích (cột gãy, tượng, đoạn cột đổ)
export function bColonnade(b, o, R) {
  const W = b.w;
  const H = b.h;
  const gh = o.gh || 8;
  const P = o.pal;
  const gy = H - gh;
  if (o.ground) {
    const prof = periodic(W, R, [[6, 1.5], [17, 0.8]]);
    const G = fades(o.ground, o.dark || shd(o.ground, -0.4));
    for (let x = 0; x < W; x++) {
      const t = Math.round(gy + prof[x]);
      for (let y = t; y < H; y++) b.p(x, y, y === t ? shd(o.ground, 0.18) : G[Math.min(2, ((y - t) / 3) | 0)]);
    }
  }
  let x = R() * 30;
  while (x < W - 10) {
    const k = 2 + ((R() * 3) | 0);
    const gap = 16 + ((R() * 6) | 0);
    const h = Math.round(o.hmin + R() * (o.hmax - o.hmin));
    const broken = R() < (o.broken || 0);
    const gw = (k - 1) * gap + 14;
    const g = new Buf(gw + 24, h + 30);
    const bx = 12;
    const by = g.h - 1;
    for (let i = 0; i < k; i++) {
      const ch = broken && R() < 0.75 ? Math.round(h * (0.3 + R() * 0.6)) : h;
      blit(g, colSpr(ch, P, o.trim, broken, (R() * 3) | 0), bx + i * gap, by - ch - 1);
    }
    if (!broken) {
      const ly = by - h - 5;
      g.r(bx - 3, ly, gw + 6, 4, P[1]); g.r(bx - 3, ly, gw + 6, 1, P[0]); g.r(bx - 3, ly + 3, gw + 6, 1, P[2]);
      if (o.trim) g.r(bx - 3, ly + 2, gw + 6, 1, o.trim);
      if (o.roof) roofDraw(g, bx + gw / 2, ly - 1, gw / 2 + 10, 9, o.roof, Math.max(4, gw / 2 - 8));
    }
    blit(b, g, x - bx, gy + 3 - g.h, { haze: o.haze, amt: o.amt });
    let nx = x + gw;
    if (o.statue && R() < 0.6) {
      const st = statueSpr(P, (R() * 4) | 0);
      blit(b, st, nx + 10, gy + 3 - st.h, { haze: o.haze, amt: o.amt, flip: R() < 0.5 });
      nx += 34;
    }
    if (broken && o.fallen && R() < 0.7) {
      const f = sprProp('fallen', 0, 'ruins');
      blit(b, f, nx + 6, gy + 3 - f.h, { haze: o.haze, amt: o.amt, flip: R() < 0.5 });
      nx += 46;
    }
    x = nx + (o.space || 30) + R() * 50;
  }
  if (o.cloud) puffRow(b, R, gy + 4, 3, 26, 5, 9, o.cloud, o.cloudHaze);
}

// ---------- Công trình nhỏ trên đồi xa (tháp chùa, lâu đài, nhà)
function featSpr(kind, roof) {
  return cached(`f:${kind}:${roof}`, () => {
    let s;
    const wall = '#efe2c8';
    const wd = '#5a3a2a';
    if (kind === 'pagoda') {
      s = new Buf(26, 44);
      for (let i = 0; i < 4; i++) {
        const y = 40 - i * 9;
        const w = 22 - i * 4;
        s.r(13 - w / 2 + 3, y - 5, w - 6, 5, wall);
        s.r(13 - w / 2 + 3, y - 5, w - 6, 1, wd);
        s.poly([[13 - w / 2 - 1, y - 4], [13 - w / 2 + 3, y - 8], [13 + w / 2 - 3, y - 8], [13 + w / 2 + 1, y - 4]], roof);
        s.r(13 - w / 2 - 1, y - 5, 1, 1, roof); s.r(13 + w / 2, y - 5, 1, 1, roof);
      }
      s.r(12, 2, 2, 8, '#d4a020'); s.p(13, 1, '#ffd54f');
    } else if (kind === 'castle') {
      s = new Buf(40, 40);
      s.poly([[2, 40], [6, 26], [34, 26], [38, 40]], '#8a8478');
      s.r(8, 18, 24, 8, wall); s.poly([[4, 19], [10, 13], [30, 13], [36, 19]], roof);
      s.r(12, 8, 16, 6, wall); s.poly([[9, 9], [14, 4], [26, 4], [31, 9]], roof);
      s.r(19, 1, 2, 3, '#d4a020');
      for (let x = 11; x < 30; x += 5) s.r(x, 21, 2, 2, wd);
    } else if (kind === 'house') {
      s = new Buf(22, 16);
      s.r(3, 8, 16, 8, wall); s.poly([[0, 9], [5, 3], [17, 3], [22, 9]], roof); s.r(9, 11, 4, 5, wd);
    } else if (kind === 'torii') {
      s = new Buf(20, 18);
      s.r(4, 4, 2, 14, '#c62828'); s.r(14, 4, 2, 14, '#c62828'); s.r(1, 2, 18, 2, '#1a1a1a'); s.r(2, 4, 16, 1, '#c62828'); s.r(3, 7, 14, 1, '#c62828');
    } else if (kind === 'windmill') {
      s = new Buf(24, 34);
      s.poly([[8, 34], [10, 12], [14, 12], [16, 34]], wall); s.poly([[8, 13], [12, 8], [16, 13]], roof);
      s.line(12, 12, 2, 2, wd); s.line(12, 12, 22, 22, wd); s.line(12, 12, 22, 2, wd); s.line(12, 12, 2, 22, wd);
    } else if (kind === 'skytemple') {
      // điện trên mây: thềm trắng, hàng cột, mái vàng hai tầng
      s = new Buf(64, 58);
      s.r(4, 50, 56, 8, '#f4f0ff'); s.r(4, 50, 56, 1, '#ffffff'); s.r(8, 46, 48, 4, '#e8e4f6');
      for (let x = 12; x < 54; x += 7) { s.r(x, 28, 3, 18, '#ffffff'); s.r(x + 2, 28, 1, 18, '#cfc8e8'); }
      s.r(10, 26, 44, 3, '#c8382a');
      roofDraw(s, 32, 25, 30, 9, roof, 16);
      s.r(18, 12, 28, 6, '#fff6e0'); s.r(20, 13, 24, 4, '#ffe08a');
      roofDraw(s, 32, 11, 20, 7, roof, 8);
      s.r(31, 0, 2, 4, '#ffe066');
    } else if (kind === 'seapalace') {
      // long cung dưới biển: cổng vòm, mái ngọc bích, cột đỏ
      s = new Buf(72, 64);
      s.r(2, 56, 68, 8, '#8a9aa8'); s.r(2, 56, 68, 1, '#b8c8d0');
      s.r(8, 34, 56, 22, '#e8eef0');
      for (let x = 10; x < 62; x += 8) { s.r(x, 34, 3, 22, '#c8382a'); s.r(x, 34, 1, 22, '#e8584a'); }
      s.ell(36, 50, 8, 10, '#1a3a4a'); s.r(28, 50, 16, 6, '#1a3a4a');
      roofDraw(s, 36, 33, 34, 10, roof, 18);
      s.r(20, 16, 32, 8, '#e8eef0'); for (let x = 22; x < 50; x += 6) s.r(x, 17, 3, 6, '#ffd890');
      roofDraw(s, 36, 15, 22, 8, roof, 10);
      s.r(35, 0, 2, 5, '#e8b030'); s.ell(36, 1, 2, 2, '#f4fbff');
    } else if (kind === 'ziggurat') {
      s = new Buf(60, 40);
      for (let i = 0; i < 5; i++) { const w = 58 - i * 11; const y = 40 - (i + 1) * 7; s.r(30 - w / 2, y, w, 7, '#e0b880'); s.r(30 - w / 2, y, w, 1, '#f8e0b0'); s.r(30 + w / 2 - 2, y, 2, 7, '#b48a58'); }
      s.r(27, 0, 6, 6, '#c8a070'); s.r(28, 2, 2, 3, '#5a3a20');
      for (let y = 8; y < 40; y++) s.r(28, y, 4, 1, y % 2 ? '#c8a070' : '#e0b880');
    } else if (kind === 'spire') {
      // tháp gai ma giới
      s = new Buf(30, 64);
      s.poly([[6, 64], [12, 14], [15, 0], [18, 14], [24, 64]], '#1e0c28');
      s.poly([[2, 64], [6, 36], [9, 30], [10, 64]], '#1e0c28'); s.poly([[20, 64], [22, 40], [26, 32], [28, 64]], '#1e0c28');
      s.line(15, 2, 13, 60, '#4a2a5a');
      for (const y of [24, 36, 48]) { s.r(14, y, 2, 2, roof); }
    } else s = new Buf(2, 2);
    return s;
  });
}

export function bProps(b, o, R) {
  const W = b.w;
  const H = b.h;
  const gh = o.gh || 8;
  const prof = periodic(W, R, [[7, 1.5], [19, 0.8]]);
  for (let x = 0; x < W; x++) {
    const t = Math.round(H - gh + prof[x]);
    for (let y = t; y < H; y++) b.p(x, y, y === t ? o.rim : y - t < 3 ? o.ground : shd(o.ground, -0.25));
  }
  let x = R() * 30;
  while (x < W) {
    const spr = o.items[(R() * o.items.length) | 0](R);
    if (spr.glowCol) halo(b, x, H - gh - spr.h * 0.4, 14 + spr.h * 0.6, spr.glowCol, 0.4);
    blit(b, spr, x - spr.w / 2, H - gh + 3 - spr.h, { haze: o.haze, amt: o.amt, flip: R() < 0.5 });
    x += (o.gap || 40) * (0.5 + R());
  }
}

export function bWall(b, o, R) {
  const W = b.w;
  const H = b.h;
  const st = ['#e2cfa8', '#c4ab82', '#a08660', '#6e5a40'];
  const wy = H - 26;
  b.r(0, wy, W, 26, st[1]);
  for (let y = wy + 3; y < H; y += 6) for (let x = ((y / 6) & 1) * 8; x < W; x += 16) { b.r(x, y, 15, 5, st[(x + y) % 3 === 0 ? 0 : 1]); b.r(x + 15, y, 1, 5, st[3]); b.r(x, y + 5, 16, 1, st[2]); }
  b.r(0, wy - 3, W, 4, st[0]); b.r(0, wy, W, 1, st[3]);
  const cols = ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a'];
  for (let x = 30; x < W; x += 96) {
    const c = cols[(x / 96) % 4 | 0];
    b.r(x, wy, 14, 20, c); b.r(x, wy, 14, 2, shd(c, 0.3)); b.r(x + 4, wy + 6, 6, 6, '#ffd54f'); b.r(x + 6, wy + 8, 2, 2, c);
    b.poly([[x, wy + 20], [x + 7, wy + 16], [x + 14, wy + 20]], st[1]);
  }
  for (let x = 78; x < W; x += 96) { b.r(x, wy - 12, 3, 12, '#5d4037'); b.r(x - 1, wy - 14, 5, 3, '#4a4a52'); }
}

// Nhà xa phía sau (cho lớp gần ở làng)
function backHouseSpr(roof, wall, seed) {
  return cached(`bh:${roof}:${seed}`, () => {
    const R = rng(seed);
    const w = 40 + ((R() * 24) | 0);
    const wh = 16 + ((R() * 6) | 0);
    const rh = 10 + ((R() * 4) | 0);
    const tall = R() < 0.35;
    const s = new Buf(w + 12, wh + rh + (tall ? 16 : 0) + 6);
    const by = s.h - 1;
    const x0 = 6;
    s.r(x0, by - wh, w, wh, wall);
    for (let x = x0; x < x0 + w; x += 10) s.r(x, by - wh, 1, wh, '#6a4a3a');
    for (let x = x0 + 4; x < x0 + w - 6; x += 10) { s.r(x, by - wh + 4, 5, 6, '#ffd890'); s.r(x + 2, by - wh + 4, 1, 6, '#c8a070'); }
    roofDraw(s, x0 + w / 2, by - wh, w / 2 + 6, rh, roof, w / 2 - 6);
    if (tall) {
      const tw = w * 0.5;
      s.r(x0 + w / 2 - tw / 2, by - wh - rh - 8, tw, 9, wall);
      roofDraw(s, x0 + w / 2, by - wh - rh - 7, tw / 2 + 5, 8, roof, tw / 2 - 5);
    }
    return s;
  });
}

// Mái ngói cong kiểu Nhật: (cx, chân mái y, nửa rộng mép mái, cao, màu, nửa rộng nóc)
export function roofDraw(s, cx, eaveY, hwE, rh, col, hwT) {
  const C = ramp(col);
  const top = eaveY - rh;
  for (let i = 0; i <= rh; i++) {
    const f = i / rh;
    const hw = hwT + (hwE - hwT) * Math.pow(f, 1.9);
    const y = top + i;
    const x0 = Math.round(cx - hw);
    const x1 = Math.round(cx + hw);
    // hàng ngói: cứ 3 dòng một gờ
    const course = i % 3;
    s.r(x0, y, x1 - x0, 1, course === 0 ? C[0] : course === 1 ? C[1] : C[2]);
    if (course !== 0) for (let x = x0 + 1; x < x1; x += 3) s.p(x, y, course === 1 ? C[2] : C[3]);
    s.p(x0, y, C[3]);
    s.p(x1 - 1, y, C[3]);
  }
  // mép mái cong vểnh ở hai đầu + đầu ngói tròn
  const ex0 = Math.round(cx - hwE);
  const ex1 = Math.round(cx + hwE);
  s.r(ex0, eaveY + 1, ex1 - ex0, 2, C[3]);
  for (let x = ex0 + 2; x < ex1 - 2; x += 3) s.p(x, eaveY + 1, C[0]);
  s.r(ex0 - 2, eaveY - 1, 3, 2, C[3]); s.p(ex0 - 3, eaveY - 2, C[3]); s.p(ex0 - 3, eaveY - 3, C[1]);
  s.r(ex1 - 1, eaveY - 1, 3, 2, C[3]); s.p(ex1 + 2, eaveY - 2, C[3]); s.p(ex1 + 2, eaveY - 3, C[1]);
  // nóc mái + trang trí hai đầu
  const tx0 = Math.round(cx - hwT - 2);
  const tx1 = Math.round(cx + hwT + 2);
  s.r(tx0, top - 2, tx1 - tx0, 3, C[3]);
  s.r(tx0, top - 2, tx1 - tx0, 1, shd(C[3], 0.25));
  s.r(tx0 - 1, top - 4, 2, 4, C[3]); s.p(tx0 - 2, top - 5, C[3]);
  s.r(tx1 - 1, top - 4, 2, 4, C[3]); s.p(tx1 + 1, top - 5, C[3]);
}
