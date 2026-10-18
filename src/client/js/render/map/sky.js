// Bầu trời: dải màu, mặt trời/trăng, cầu vồng, mây, cực quang.
import { rng, mix, shd, u32, Buf, blob, cached, TAU } from './util.js';

// ---------- Bầu trời
export function buildSky(sc, seed) {
  const W = 256;
  const H = sc.skyH || 300;
  const b = new Buf(W, H);
  const st = sc.sky;
  const n = st.length - 1;
  for (let y = 0; y < H; y++) {
    const f = (y / (H - 1)) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const t = f - i;
    // 4 dải con mỗi đoạn + dither ở ranh giới
    const q = t * 4;
    const qi = Math.floor(q);
    const qt = q - qi;
    for (let x = 0; x < W; x++) {
      const bayer = [[0, 0.5], [0.75, 0.25]][y & 1][x & 1];
      const lvl = Math.min(4, qi + (qt > bayer * 0.9 + 0.05 ? 1 : 0));
      b.d[y * W + x] = u32(mixQ(st[i], st[i + 1], lvl));
    }
  }
  if (sc.stars) {
    const R = rng(seed + 5);
    for (let i = 0; i < sc.stars; i++) {
      const x = (R() * W) | 0;
      const y = (Math.pow(R(), 1.4) * H * 0.7) | 0;
      const big = R() < 0.12;
      b.a(x, y, '#ffffff', 0.4 + R() * 0.6);
      if (big) { b.a(x - 1, y, '#ffffff', 0.35); b.a(x + 1, y, '#ffffff', 0.35); b.a(x, y - 1, '#ffffff', 0.35); b.a(x, y + 1, '#ffffff', 0.35); }
    }
  }
  return b.canvas;
}
const _mq = new Map();
function mixQ(a, b, l) {
  const k = a + b + l;
  let v = _mq.get(k);
  if (!v) { v = mix(a, b, l / 4); _mq.set(k, v); }
  return v;
}

export function sunSpr(o) {
  return cached(`sun:${o.k}:${o.r}:${o.col}:${o.glow}`, () => {
    const r = o.r;
    const G = r * 3;
    const s = new Buf(G * 2 + 2, G * 2 + 2);
    const c = G + 1;
    // quầng sáng phân bậc
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const al = d < r * 1.6 ? 0.42 : d < r * 2.3 ? 0.24 : d < G ? 0.1 : 0;
      if (al) s.a(x, y, o.glow, al);
    }
    if (o.k === 'eclipse') {
      // nhật thực: đĩa tối, vành sáng
      s.ell(c, c, r + 1.5, r + 1.5, shd(o.glow, 0.5));
      s.ell(c, c, r + 0.5, r + 0.5, o.glow);
      s.ell(c + 1, c, r - 0.5, r - 0.5, '#12061a');
      s.ell(c - r * 0.25, c - r * 0.3, r * 0.25, r * 0.2, '#22102e');
    } else if (o.k === 'moon' || o.k === 'redmoon') {
      blob(s, c, c, r, r, o.k === 'redmoon' ? ['#ffb08a', '#ff6a3a', '#d8401e', '#a82a14'] : ['#ffffff', '#f4ecd8', '#d8cfb8', '#c0b49a'], { dither: true });
      const cr = o.k === 'redmoon' ? '#b83014' : '#cfc4a8';
      s.ell(c - r * 0.3, c - r * 0.1, r * 0.22, r * 0.2, cr); s.ell(c + r * 0.35, c + r * 0.35, r * 0.15, r * 0.14, cr); s.ell(c + r * 0.1, c - r * 0.5, r * 0.1, r * 0.1, cr);
    } else {
      s.ell(c, c, r, r, o.col);
      s.ell(c - r * 0.2, c - r * 0.2, r * 0.65, r * 0.65, shd(o.col, 0.5));
    }
    return s;
  });
}

// Cầu vồng mờ (vẽ sẵn): cung 7 dải màu, nhạt dần ở hai chân
export function rainbowSpr(r) {
  return cached(`rainbow:${r}`, () => {
    const cols = ['#ff7a7a', '#ffb060', '#fff080', '#90f090', '#80c8ff', '#9a90ff', '#d090ff'];
    const bw = 2;
    const R2 = r + cols.length * bw;
    const s = new Buf(R2 * 2 + 2, R2 + 2);
    const cx = R2 + 1;
    const cy = R2 + 1;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const k = Math.floor((R2 - d) / bw);
      if (k < 0 || k >= cols.length) continue;
      const foot = Math.min(1, (cy - y) / (R2 * 0.55));
      s.a(x, y, cols[k], 0.34 * foot * ((x + y) & 1 ? 1 : 0.8));
    }
    return s;
  }).canvas;
}

export function cloudSpr(pal, seed, w) {
  return cached(`cl:${pal.join()}:${seed}:${w}`, () => {
    const R = rng(seed + 31);
    const h = Math.round(w * 0.42);
    const s = new Buf(w + 4, h + 4);
    const base = h + 1;
    const n = 4 + ((w / 14) | 0);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const x = 2 + w * (0.12 + 0.76 * f);
      const r = w * (0.12 + 0.16 * Math.sin(f * Math.PI)) * (0.8 + R() * 0.4);
      blob(s, x, base - r * 0.7, r * 1.15, r, pal, { cut: base, wob: 0.1, ph: R() * 6, dither: false });
    }
    // đáy phẳng sáng/tối
    s.r(4, base, w - 4, 1, pal[2]);
    return s;
  });
}

export function auroraCanvas(seed) {
  return cached(`aurora:${seed}`, () => {
    const W = 512;
    const H = 80;
    const b = new Buf(W, H, true);
    const R = rng(seed);
    const p = [R() * TAU, R() * TAU, R() * TAU];
    for (let x = 0; x < W; x++) {
      const inten = (Math.sin((x / W) * TAU * 3 + p[0]) + Math.sin((x / W) * TAU * 7 + p[1]) * 0.6 + 1.6) / 3.2;
      const top = 14 + Math.sin((x / W) * TAU * 2 + p[2]) * 9 + Math.sin((x / W) * TAU * 9) * 3;
      const L = 26 + inten * 26;
      for (let y = Math.floor(top); y < Math.min(H, top + L); y++) {
        const f = (y - top) / L;
        const al = inten * Math.pow(1 - f, 1.4) * 0.55 * ((x % 3 === 0) ? 1.25 : 1);
        b.a(x, y, f < 0.12 ? '#ff9ad8' : f < 0.35 ? '#7affd0' : '#3ad8a0', al);
      }
    }
    return b;
  }).canvas;
}

// quầng sáng vẽ sẵn vào lớp nền
export function halo(b, cx, cy, r, col, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d < 1) b.a(x, y, col, a * (1 - d) * (1 - d) * (1 - d));
  }
}
