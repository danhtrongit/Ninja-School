// Sprite cây cối, bụi, đá, pha lê trang trí bản đồ.
import { rng, shd, Buf, blob, cached, TAU } from './util.js';

// ======================= Sprite thiên nhiên =======================
const LEAF = {
  green: ['#b4e070', '#78b84a', '#4a8c36', '#2d5e2c'],
  lush: ['#9fd862', '#5fa842', '#3a7c34', '#245228'],
  sakura: ['#ffe6f0', '#fbb4cf', '#ec88ae', '#bd5f8a'],
  maple: ['#ffd56a', '#f6943a', '#d65a2c', '#963624'],
  willow: ['#cfe887', '#93c454', '#629a42', '#3b6a34'],
  pine: ['#5fae6a', '#3a8a52', '#26683f', '#17482e'],
  snowpine: ['#5c9c86', '#3b7a68', '#285c52', '#1a3e3c'],
  mist: ['#9db3a4', '#7c9786', '#5e7a6a', '#44594e'],
  dark: ['#7a6a9a', '#56497a', '#3a3058', '#251e3c'],
  palm: ['#9ad65a', '#5eaa3e', '#3c8034', '#28582a'],
  bamboo: ['#bfe27a', '#86c04c', '#5a9238', '#3a6628'],
  gold: ['#fff4b4', '#ffd25e', '#e0a032', '#a8701e'],
  jade: ['#d4ffe8', '#7ee0b8', '#3eae8c', '#1f6e62'],
  kelp: ['#a8e070', '#62b058', '#3a8050', '#24543c'],
};
// mây: sáng, gốc, bóng, bóng sâu
export const CLOUD = ['#ffffff', '#f2eefc', '#d6d0ee', '#b0aad4'];
// mây tông trung/tối cho lớp gần và mép đất thiên cung (tách quái trắng khỏi nền)
export const CLOUD_D = ['#f4f0ff', '#cdc4ea', '#9e94cc', '#6e64a4'];
const BARK = {
  brown: ['#a8764e', '#7a5034', '#523422'],
  dark: ['#7a5450', '#56383a', '#382228'],
  grey: ['#a09a92', '#77706a', '#524c48'],
  purple: ['#6e5878', '#4c3a58', '#30243c'],
  palm: ['#c8a476', '#9c7a52', '#6e5236'],
  pale: ['#c9b9a6', '#9c8a78', '#6e5e52'],
};

function canopy(s, R, cx, cy, r, n, pal, o = {}) {
  // khối nền tối tạo chiều sâu giữa các chùm lá
  blob(s, cx, cy + r * 0.1, r, r * 0.86, [pal[1], pal[2], pal[3], pal[3]], { wob: 0.12, lobes: 6, ph: R() * 6 });
  const cl = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.95 + R() * 1.1) + (i % 2 ? 0.4 : -0.4);
    const d = r * (0.25 + R() * 0.45);
    cl.push([cx + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.8, r * (0.36 + R() * 0.24)]);
  }
  cl.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr] of cl) blob(s, x, y, rr, rr * 0.85, pal, { wob: 0.16, lobes: 5 + ((R() * 4) | 0), ph: R() * 6 });
  // vài đốm sáng
  for (let i = 0; i < n; i++) {
    const x = cx - r * 0.5 + R() * r * 0.6;
    const y = cy - r * 0.6 + R() * r * 0.5;
    if (s.has(x, y)) s.p(x, y, o.spark || shd(pal[0], 0.35));
  }
}

function trunk(s, cx, base, h, tw, bark, lean = 0) {
  for (let y = 0; y < h; y++) {
    const yy = base - y;
    const fl = y < 3 ? 3 - y : 0;
    const x0 = Math.round(cx - tw / 2 - fl + lean * (y / h));
    const ww = tw + fl * 2;
    s.r(x0, yy, ww, 1, bark[1]);
    s.p(x0, yy, bark[0]);
    if (ww > 3) s.p(x0 + 1, yy, bark[0]);
    s.r(x0 + ww - Math.max(1, ww >> 2), yy, Math.max(1, ww >> 2), 1, bark[2]);
    if ((y * 7) % 11 === 0 && ww > 3) s.p(x0 + 2, yy, bark[2]);
  }
}

export function sprTree(kind, h, seed, o = {}) {
  const key = `t:${kind}:${h}:${seed}:${o.leaf || ''}:${o.snow ? 1 : 0}:${o.bark || ''}:${o.eyes ? o.eyeCol || 1 : 0}:${o.noOutline ? 1 : 0}`;
  return cached(key, () => {
    const R = rng(seed * 977 + h);
    let s;
    if (kind === 'pine') s = pineSpr(R, h, o);
    else if (kind === 'bamboo') s = bambooSpr(R, h, o);
    else if (kind === 'palm') s = palmSpr(R, h);
    else if (kind === 'dead') s = deadSpr(R, h, o);
    else if (kind === 'cactus') s = cactusSpr(R, h);
    else if (kind === 'willow') s = willowSpr(R, h);
    else if (kind === 'kelp') s = kelpSpr(R, h);
    else {
      const W = Math.round(h * 1.05) + 8;
      s = new Buf(W, h + 4);
      const cx = W / 2;
      const base = h + 2;
      const leaf = LEAF[o.leaf || (kind === 'sakura' ? 'sakura' : kind === 'maple' ? 'maple' : kind === 'gold' ? 'gold' : kind === 'jade' ? 'jade' : 'green')];
      const bark = kind === 'sakura' ? BARK.dark : kind === 'gold' || kind === 'jade' ? BARK.pale : BARK.brown;
      const th = Math.round(h * 0.45);
      trunk(s, cx, base, th + 6, Math.max(3, Math.round(h / 11)), bark, kind === 'sakura' ? (R() - 0.5) * 6 : 0);
      const top = base - th;
      s.line(cx, top + 6, cx - h * 0.24, top - h * 0.08, bark[1], 2);
      s.line(cx, top + 3, cx + h * 0.22, top - h * 0.14, bark[1], 2);
      const r = h * 0.33;
      canopy(s, R, cx, top - r * 0.5, r, kind === 'sakura' ? 9 : 7, leaf);
      if (kind === 'sakura') {
        // cành lộ ra và cánh hoa rơi
        s.line(cx - r * 0.2, top - r * 0.2, cx - r * 0.7, top - r * 0.5, bark[2]);
        for (let i = 0; i < 10; i++) {
          const px = cx - r * 1.1 + R() * r * 2.2;
          const py = top + R() * th * 0.9;
          if (!s.has(px, py)) s.p(px, py, R() < 0.5 ? leaf[1] : leaf[0]);
        }
      }
    }
    if (!o.noOutline) s.outline();
    return s;
  });
}

function pineSpr(R, h, o) {
  const W = Math.round(h * 0.62) + 6;
  const s = new Buf(W, h + 4);
  const cx = W / 2;
  const base = h + 2;
  const pal = LEAF[o.leaf || (o.snow ? 'snowpine' : 'pine')];
  trunk(s, cx, base, Math.round(h * 0.2), Math.max(2, Math.round(h / 16)), BARK.brown);
  const tiers = h > 50 ? 5 : 4;
  const top = base - h + 2;
  const bot = base - Math.round(h * 0.14);
  for (let t = 0; t < tiers; t++) {
    const f0 = t / tiers;
    const ty0 = top + (bot - top) * f0 * 0.9;
    const ty1 = top + (bot - top) * ((t + 1) / tiers) + 3;
    const hwMax = (W / 2 - 2) * (0.38 + 0.62 * ((t + 1) / tiers));
    for (let y = Math.floor(ty0); y <= ty1; y++) {
      const f = (y - ty0) / (ty1 - ty0);
      const hw = Math.max(0.8, hwMax * Math.pow(f, 0.85));
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const fx = (x + 0.5 - cx) / hw;
        // mép dưới tầng rủ xuống ở đầu cành
        if (y > ty1 - 2 && Math.abs(fx) < 0.6 && ((x + t) & 3) !== 0) continue;
        let v = -fx * 0.7 - f * 0.25 + ((x + y) & 1 ? 0.08 : -0.08);
        if (Math.abs(fx) > 0.88) v -= 0.25;
        s.p(x, y, v > 0.35 ? pal[0] : v > -0.1 ? pal[1] : v > -0.5 ? pal[2] : pal[3]);
      }
      if (o.snow && f < 0.45) {
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          if (y === Math.floor(ty0) + ((x * 3) & 1) || (f < 0.25 && ((x * 7 + y) % 5 !== 0))) s.p(x, y, x < cx + hw * 0.3 ? '#ffffff' : '#cfe3f2');
        }
      }
    }
    if (o.snow) {
      // tuyết đọng mép tầng
      const ey = Math.floor(ty1) - 1;
      for (let x = Math.floor(cx - hwMax + 1); x < cx + hwMax - 1; x++) if (((x * 5 + t) % 4) < 2) s.p(x, ey, x < cx ? '#ffffff' : '#d8e8f6');
    }
  }
  if (o.snow) { s.p(cx - 1, top - 1, '#ffffff'); s.p(cx, top - 1, '#ffffff'); }
  return s;
}

function bambooSpr(R, h, o) {
  const W = 34;
  const s = new Buf(W, h + 4);
  const base = h + 2;
  const pal = LEAF[o.leaf || 'bamboo'];
  const stalks = 3 + ((R() * 2) | 0);
  for (let k = 0; k < stalks; k++) {
    const bx = 8 + k * 5 + ((R() * 3) | 0);
    const sh = h * (0.7 + R() * 0.3);
    const lean = (R() - 0.5) * 6;
    const nodeGap = 9 + ((R() * 5) | 0);
    for (let y = 0; y < sh; y++) {
      const x = Math.round(bx + lean * (y / sh));
      const yy = base - y;
      const node = y % nodeGap === 0 && y > 0;
      s.p(x, yy, node ? pal[0] : pal[0]);
      s.p(x + 1, yy, node ? pal[3] : pal[1]);
      s.p(x + 2, yy, node ? pal[3] : pal[2]);
      if (node) { s.p(x - 1, yy, pal[3]); s.p(x + 3, yy, pal[3]); }
      // lá ở phần trên
      if (node && y > sh * 0.35 && R() < 0.8) {
        const dir = R() < 0.5 ? -1 : 1;
        const len = 5 + ((R() * 5) | 0);
        for (let i = 1; i <= len; i++) {
          const lxp = x + 1 + dir * i;
          const lyp = yy - 1 + Math.round(i * 0.45);
          s.p(lxp, lyp, i < len / 2 ? pal[1] : pal[0]);
          if (i > 1 && i < len - 1) s.p(lxp, lyp + 1, pal[2]);
        }
      }
    }
  }
  return s;
}

function palmSpr(R, h) {
  const W = Math.round(h * 0.9) + 10;
  const s = new Buf(W, h + 6);
  const base = h + 4;
  const bark = BARK.palm;
  const curve = (R() < 0.5 ? -1 : 1) * (5 + R() * 5);
  let tx = 0;
  let ty = 0;
  for (let y = 0; y < h * 0.85; y++) {
    const f = y / (h * 0.85);
    const x = Math.round(W / 2 + Math.sin(f * 1.6) * curve);
    const yy = base - y;
    const ring = y % 4 === 0;
    s.p(x - 1, yy, ring ? bark[2] : bark[0]);
    s.p(x, yy, ring ? bark[2] : bark[1]);
    s.p(x + 1, yy, bark[2]);
    if (y < 3) { s.p(x - 2, yy, bark[1]); s.p(x + 2, yy, bark[2]); }
    tx = x;
    ty = yy;
  }
  const pal = LEAF.palm;
  const fr = [[-1, -0.35], [1, -0.35], [-0.85, 0.2], [0.85, 0.25], [-0.45, -0.85], [0.4, -0.9], [0.15, 0.5]];
  for (const [dx, dy] of fr) {
    const len = h * 0.42 * (0.8 + R() * 0.3);
    let px = tx;
    let py = ty;
    for (let i = 0; i < len; i++) {
      const f = i / len;
      const nx = tx + dx * i;
      const ny = ty + dy * i + f * f * len * 0.55;
      s.p(nx, ny, pal[2]);
      // lá chét
      if (i > 2 && i % 2 === 0) {
        s.p(nx, ny + 1, pal[1]);
        s.p(nx, ny + 2, f < 0.6 ? pal[0] : pal[1]);
        s.p(nx, ny - 1, pal[1]);
        if (f < 0.75) s.p(nx, ny + 3, pal[2]);
      }
      px = nx; py = ny;
    }
    void px; void py;
  }
  // dừa
  s.ell(tx - 1, ty + 2, 1.6, 1.6, '#7a5232');
  s.ell(tx + 2, ty + 3, 1.6, 1.6, '#6a4428');
  s.p(tx - 2, ty + 1, '#a8784a');
  return s;
}

function deadSpr(R, h, o) {
  const W = Math.round(h * 0.95) + 8;
  const s = new Buf(W, h + 4);
  const bark = BARK[o.bark || 'grey'];
  const base = h + 2;
  const branch = (x, y, ang, len, th, depth) => {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const steps = Math.ceil(len);
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const bx = x + (x2 - x) * f + Math.sin(f * 5 + depth) * 0.8;
      const by = y + (y2 - y) * f;
      const t = Math.max(1, Math.round(th * (1 - f * 0.5)));
      s.r(bx - (t >> 1), by, t, 1, bark[1]);
      s.p(bx - (t >> 1), by, bark[0]);
      if (t > 2) s.p(bx - (t >> 1) + t - 1, by, bark[2]);
    }
    if (depth <= 0 || len < 4) return;
    const n = depth > 2 ? 2 : 1 + ((R() * 2) | 0);
    for (let i = 0; i < n; i++) branch(x2, y2, ang + (R() - 0.5) * 1.6 + (i ? 0.5 : -0.5), len * (0.55 + R() * 0.2), Math.max(1, th * 0.6), depth - 1);
  };
  const th = Math.max(3, Math.round(h / 9));
  branch(W / 2, base, -Math.PI / 2 + (R() - 0.5) * 0.2, h * 0.42, th, 4);
  // rễ
  s.r(W / 2 - th, base - 1, th * 2 + 2, 2, bark[1]);
  s.p(W / 2 - th - 1, base, bark[2]);
  s.p(W / 2 + th + 2, base, bark[2]);
  if (o.eyes) {
    // hốc cây có đôi mắt phát sáng (rừng ma)
    s.r(W / 2 - 2, base - h * 0.3, 4, 3, '#140c1c');
    s.p(W / 2 - 1, base - h * 0.3 + 1, o.eyeCol || '#ffe066');
    s.p(W / 2 + 1, base - h * 0.3 + 1, o.eyeCol || '#ffe066');
  }
  return s;
}

function cactusSpr(R, h) {
  const W = 26;
  const s = new Buf(W, h + 4);
  const base = h + 2;
  const pal = ['#9ccc65', '#689f38', '#4a7a2a', '#33561e'];
  const col = (x, y0, y1, w) => {
    for (let y = y0; y < y1; y++) for (let i = 0; i < w; i++) {
      const f = i / (w - 1);
      s.p(x + i, y, f < 0.25 ? pal[0] : f < 0.65 ? pal[1] : pal[2]);
    }
    // đầu tròn
    s.r(x + 1, y0 - 1, w - 2, 1, pal[1]);
    s.p(x + 1, y0 - 1, pal[0]);
  };
  const cx = 11;
  col(cx, base - h + 2, base + 1, 5);
  const a1 = base - h * (0.45 + R() * 0.15);
  col(cx - 6, a1 - 9, a1, 4);
  s.r(cx - 6, a1 - 1, 7, 3, pal[1]);
  s.r(cx - 6, a1 + 1, 7, 1, pal[2]);
  const a2 = base - h * (0.3 + R() * 0.15);
  col(cx + 7, a2 - 11, a2, 4);
  s.r(cx + 4, a2 - 1, 6, 3, pal[1]);
  s.r(cx + 4, a2 + 1, 6, 1, pal[2]);
  for (let y = base - h + 4; y < base; y += 3) { s.p(cx + 2, y, pal[3]); s.p(cx - 1, y + 1, '#e8f5c8'); }
  if (R() < 0.6) { s.p(cx + 2, base - h, '#ff6f91'); s.p(cx + 1, base - h + 1, '#ff9eb5'); s.p(cx + 3, base - h + 1, '#ff9eb5'); }
  return s;
}

function willowSpr(R, h) {
  const W = Math.round(h * 0.95) + 8;
  const s = new Buf(W, h + 4);
  const cx = W / 2;
  const base = h + 2;
  const pal = LEAF.willow;
  trunk(s, cx, base, Math.round(h * 0.6), Math.max(3, Math.round(h / 11)), BARK.brown, 2);
  const top = base - h * 0.62;
  canopy(s, R, cx, top - h * 0.1, h * 0.3, 6, pal);
  for (let x = Math.round(cx - h * 0.42); x < cx + h * 0.42; x += 2) {
    const len = h * (0.25 + R() * 0.35) * (1 - Math.abs(x - cx) / (h * 0.6));
    const y0 = top - h * 0.05 + Math.abs(x - cx) * 0.25;
    for (let y = 0; y < len; y++) s.p(x + Math.round(Math.sin(y * 0.3 + x) * 0.6), y0 + y, y > len - 3 ? pal[0] : (x & 2) ? pal[1] : pal[2]);
  }
  return s;
}

// Rong biển: vài dải lá lượn sóng có túi khí
function kelpSpr(R, h) {
  const W = 26;
  const s = new Buf(W, h + 4);
  const base = h + 2;
  const pal = LEAF.kelp;
  const n = 3 + ((R() * 2) | 0);
  for (let k = 0; k < n; k++) {
    const bx = 6 + k * 4 + R() * 3;
    const sh = h * (0.55 + R() * 0.45);
    const ph = R() * TAU;
    for (let y = 0; y < sh; y++) {
      const x = Math.round(bx + Math.sin(y * 0.11 + ph) * 3 * (y / sh + 0.2));
      const yy = base - y;
      const w = y > sh - 4 ? 1 : 2;
      s.p(x, yy, pal[1]);
      if (w > 1) s.p(x + 1, yy, pal[2]);
      // lá dẹt mọc so le
      if (y % 7 === 3 && y < sh - 4) {
        const d = (y / 7) & 1 ? 1 : -1;
        for (let i = 1; i <= 4; i++) { s.p(x + (d > 0 ? 1 : 0) + d * i, yy - (i >> 1), i < 3 ? pal[1] : pal[0]); s.p(x + (d > 0 ? 1 : 0) + d * i, yy - (i >> 1) + 1, pal[2]); }
        s.p(x + d * 2 + (d > 0 ? 1 : 0), yy + 1, '#d8c860');
      }
    }
    s.p(Math.round(bx + Math.sin(sh * 0.11 + ph) * 3 * 1.2), base - sh, pal[0]);
  }
  return s;
}

export function sprBush(w, seed, leaf = 'green', flowers = null) {
  return cached(`b:${w}:${seed}:${leaf}:${flowers}`, () => {
    const R = rng(seed);
    const h = Math.round(w * 0.6);
    const s = new Buf(w + 6, h + 4);
    const pal = LEAF[leaf] || leaf;
    const n = 3 + ((w / 8) | 0);
    for (let i = 0; i < n; i++) {
      const x = 3 + w * (0.15 + 0.7 * (i / (n - 1 || 1)));
      const r = w * (0.2 + R() * 0.12);
      blob(s, x, h + 2 - r * 0.8, r, r * 0.85, pal, { cut: h + 2, wob: 0.15, ph: R() * 6 });
    }
    if (flowers) for (let i = 0; i < w / 3; i++) {
      const x = 4 + R() * (w - 2);
      const y = 2 + R() * (h - 2);
      if (s.has(x, y)) s.p(x, y, flowers[i % flowers.length]);
    }
    return s.outline();
  });
}

export function sprRock(w, h, seed, pal, o = {}) {
  return cached(`r:${w}:${h}:${seed}:${pal.join()}:${o.moss || ''}:${o.snow ? 1 : 0}`, () => {
    const R = rng(seed);
    const s = new Buf(w + 4, h + 4);
    blob(s, w / 2 + 2, h + 2, w / 2, h, pal, { cut: h + 1, wob: 0.08, lobes: 5, ph: R() * 6 });
    if (R() < 0.8) blob(s, w * (0.25 + R() * 0.5) + 2, h + 2, w * 0.28, h * 0.6, pal, { cut: h + 1, sh: 0.1 });
    // vết nứt
    let cx = w * (0.3 + R() * 0.4) + 2;
    for (let y = h * 0.35; y < h; y++) { cx += (R() - 0.5) * 1.6; if (s.has(cx, y)) s.p(cx, y, pal[3]); }
    if (o.moss || o.snow) {
      const mc = o.snow ? ['#ffffff', '#dbe9f5'] : [shd(o.moss, 0.2), o.moss];
      for (let x = 0; x < w + 4; x++) {
        let top = -1;
        for (let y = 0; y < h + 4; y++) if (s.has(x, y)) { top = y; break; }
        if (top < 0) continue;
        const d = o.snow ? 2 + ((x * 7) % 3 === 0 ? 1 : 0) : (x * 5) % 3;
        for (let y = top; y < top + d; y++) s.p(x, y, x < w * 0.6 ? mc[0] : mc[1]);
      }
    }
    return s.outline();
  });
}

export function sprCrystal(h, col, seed) {
  return cached(`c:${h}:${col}:${seed}`, () => {
    const R = rng(seed);
    const W = Math.round(h * 1.1) + 6;
    const s = new Buf(W, h + 4);
    const base = h + 2;
    const L = shd(col, 0.45);
    const M = col;
    const D = shd(col, -0.35);
    const n = 3 + ((R() * 2) | 0);
    const list = [];
    for (let i = 0; i < n; i++) list.push([W / 2 + (i - (n - 1) / 2) * h * 0.24 + (R() - 0.5) * 3, h * (i === ((n / 2) | 0) ? 1 : 0.45 + R() * 0.35), (R() - 0.5) * 0.7]);
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, hh, lean] of list) {
      const w = Math.max(3, Math.round(hh * 0.3));
      const tipx = x + lean * hh * 0.5;
      const ty = base - hh;
      const shoulder = ty + w * 0.9;
      // mặt trái sáng, mặt phải tối
      s.poly([[x - w / 2, base], [x - w / 2 + lean * hh * 0.4, shoulder], [tipx, ty], [tipx, base]], M);
      s.poly([[tipx, ty], [x + w / 2 + lean * hh * 0.4, shoulder], [x + w / 2, base], [tipx, base]], D);
      s.line(x - w / 2 + 1 + lean * hh * 0.35, shoulder + 1, x - w / 2 + 1, base - 1, L);
      s.line(tipx, ty + 1, tipx, base - 2, shd(col, 0.2));
      s.p(tipx, ty, '#ffffff');
    }
    s.r(W / 2 - h * 0.45, base, h * 0.9, 2, '#3a3346');
    s.outline(0.5);
    s.glowCol = col;
    return s;
  });
}
