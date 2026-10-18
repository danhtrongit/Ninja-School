// Mặt đất kiểu tile pixel, vách đá, bục nhảy.
import { clamp, mix, shd, Buf, blit, blob } from './util.js';
import { VILLAGE } from './themes.js';
import { CLOUD_D, sprRock, sprCrystal } from './flora.js';
import { sprProp } from './props.js';

// ======================= Mặt đất =======================
function speck(T, R, x0, y0, w, h, n, cols) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * w;
    const y = y0 + R() * h;
    T.r(x, y, R() < 0.5 ? 2 : 1, 1, cols[(R() * cols.length) | 0]);
  }
}
function pebbles(T, R, w, y0, y1, n, pal) {
  for (let i = 0; i < n; i++) {
    const x = R() * w;
    const y = y0 + R() * (y1 - y0);
    const pw = 2 + ((R() * 3) | 0);
    const ph = 1 + ((R() * 2) | 0);
    T.r(x, y, pw, ph, pal[1]);
    T.p(x, y, pal[0]);
    T.r(x, y + ph, pw, 1, pal[3]);
    T.p(x + pw, y + ph - 1, pal[2]);
  }
}
function strata(T, R, w, y0, y1, col, gap = 13) {
  const ph = R() * 10;
  for (let y = y0; y < y1; y += gap) for (let x = 0; x < w; x++) {
    const yy = y + Math.round(Math.sin(x * 0.04 + ph + y) * 2 + Math.sin(x * 0.13) * 0.8);
    T.p(x, yy, col);
    if ((x * 7 + y) % 5 < 3) T.p(x, yy + 1, col);
  }
}

// Đá tự nhiên kiểu Voronoi: khối đá có khe nứt, sáng ở góc trên-trái
function voronoiRock(T, R, W, y0, y1, P) {
  const cs = 13;
  const gw = Math.ceil(W / cs) + 1;
  const gh = Math.ceil((y1 - y0) / cs) + 1;
  const pts = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push([i * cs + R() * cs, y0 + j * cs + R() * cs, R()]);
  for (let y = y0; y < y1; y++) {
    const gj = Math.floor((y - y0) / cs);
    for (let x = 0; x < W; x++) {
      const gi = Math.floor(x / cs);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = null;
      for (let j = gj - 1; j <= gj + 1; j++) {
        if (j < 0 || j >= gh) continue;
        for (let i = gi - 1; i <= gi + 1; i++) {
          if (i < 0 || i >= gw) continue;
          const p = pts[j * gw + i];
          const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
          if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
        }
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      let c;
      if (edge < 1.1) c = P[3];
      else {
        const v = (best[0] - x) * 0.6 + (best[1] - y) * 0.8 + (best[2] - 0.5) * 6 + ((x + y) & 1 ? 0.8 : -0.8);
        c = edge < 2.2 && v < 0 ? P[2] : v > 3.2 ? P[0] : v > -2.5 ? P[1] : P[2];
      }
      T.p(x, y, c);
    }
  }
}

// Tối dần theo độ sâu, ranh giới hòa sắc
function depthShade(T, W, y0, y1, steps) {
  const d = T.d;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0);
    for (let x = 0; x < W; x++) {
      const lv = Math.min(steps.length - 1, Math.floor(f * steps.length + ((x + y) & 1 ? 0.18 : -0.18)));
      const k = steps[Math.max(0, lv)];
      if (k >= 1) continue;
      const i = y * T.w + x;
      const v = d[i];
      if (!(v >>> 24)) continue;
      d[i] = ((255 << 24) | ((((v >> 16) & 255) * k) << 16) | ((((v >> 8) & 255) * k) << 8) | ((v & 255) * k)) >>> 0;
    }
  }
}

export function buildGround(T, m, th, sc, R) {
  const W = m.w;
  const G = m.ground;
  const H = m.h;
  const kind = sc.ground;
  const D = [shd(th.dirt, 0.14), th.dirt, shd(th.dirt, -0.18), shd(th.dirt, -0.36)];
  const stone = ['#b8b4ae', '#948f88', '#6e6a65', '#4e4a46'];
  if (kind === 'grass' || kind === 'cobble') {
    T.r(0, G, W, H - G, D[1]);
    strata(T, R, W, G + 16, H, D[2], 14);
    speck(T, R, 0, G + 4, W, H - G - 4, W * 0.5, [D[0], D[2], D[3]]);
    pebbles(T, R, W, G + 8, H - 2, W / 14, [shd(stone[0], 0.1), stone[1], stone[2], stone[3]]);
    // đá lớn vùi trong đất
    for (let i = 0; i < W / 120; i++) {
      const spr = sprRock(10 + ((R() * 10) | 0), 6 + ((R() * 4) | 0), (R() * 5) | 0, ['#a8a29a', '#878179', '#666059', '#4a4540']);
      blit(T, spr, R() * W, G + 14 + R() * (H - G - 24));
    }
    // rễ cây
    for (let i = 0; i < W / 26; i++) {
      let x = R() * W;
      const len = 4 + R() * 12;
      for (let k = 0; k < len; k++) { x += (R() - 0.5) * 1.4; T.p(x, G + 4 + k, k < len * 0.6 ? D[3] : D[2]); }
    }
  }
  if (kind === 'grass') {
    const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.22), shd(th.top, -0.42)];
    T.r(0, G, W, 1, Gr[0]);
    T.r(0, G + 1, W, 2, Gr[1]);
    T.r(0, G + 3, W, 2, Gr[2]);
    for (let x = 0; x < W; x++) {
      // mép cỏ rủ xuống
      const drip = (Math.sin(x * 0.7) + Math.sin(x * 0.23) * 1.3 + R() * 1.2) | 0;
      for (let k = 0; k < drip; k++) T.p(x, G + 5 + k, k === drip - 1 ? Gr[3] : Gr[2]);
      if (R() < 0.08) T.p(x, G + 1, Gr[0]);
      if (R() < 0.1) T.p(x, G + 3, Gr[3]);
    }
    // chùm cỏ + hoa
    const flowers = sc.flowers || ['#ff6f91', '#ffd54f', '#ffffff', '#b388ff', '#ff8a65'];
    for (let x = 0; x < W; x++) {
      if (R() < 0.3) T.p(x, G - 1, R() < 0.5 ? Gr[1] : Gr[0]);
      if (R() < 0.05) {
        // chùm cỏ hình chữ V
        const h = 2 + ((R() * 3) | 0);
        for (let k = 0; k < h; k++) { T.p(x - 1 - (k >> 1), G - 1 - k, Gr[2]); T.p(x, G - 1 - k, Gr[1]); T.p(x + 1 + (k >> 1), G - 1 - k, Gr[0]); }
      }
      if (R() < 0.022) {
        const c = flowers[(R() * flowers.length) | 0];
        const h = 2 + ((R() * 3) | 0);
        T.r(x, G - h, 1, h, Gr[2]);
        T.p(x - 1, G - h - 1, c); T.p(x + 1, G - h - 1, c); T.p(x, G - h - 2, c); T.p(x, G - h, c);
        T.p(x, G - h - 1, '#fff6a0');
      }
    }
    // đá bước chân (tobi-ishi) kiểu vườn Nhật
    if (sc.steps) {
      let x = R() * 30;
      while (x < W) {
        const sw = 9 + ((R() * 6) | 0);
        T.r(x + 1, G, sw - 2, 1, '#e4e0d8');
        T.r(x, G + 1, sw, 2, '#b4b0a8');
        T.r(x + 1, G + 3, sw - 2, 1, '#7a766e');
        T.p(x + 2, G + 1, '#f4f2ec');
        x += sw + 10 + R() * 26;
      }
    }
    // thảm cánh hoa rụng trên cỏ
    if (sc.petals) for (let i = 0; i < W / 3; i++) {
      const x = R() * W;
      const y = G - 1 + ((R() * 4) | 0);
      T.p(x, y, R() < 0.6 ? '#ffc8dc' : '#fff0f6');
      if (R() < 0.3) T.p(x + 1, y, '#f490b4');
    }
  } else if (kind === 'cobble') {
    const v = VILLAGE[th.town] || VILLAGE.fire;
    const S = v.stone;
    // tường đá kè (đá xếp không đều)
    let y = G + 4;
    while (y < G + 30) {
      const bh = 5 + ((R() * 3) | 0);
      let x = -((R() * 8) | 0);
      while (x < W) {
        const bw = 9 + ((R() * 9) | 0);
        T.r(x + 1, y + 1, bw - 1, bh - 1, S[1]);
        T.r(x + 1, y + 1, bw - 1, 1, S[0]);
        T.r(x + 1, y + 1, 1, bh - 1, S[0]);
        T.r(x + 1, y + bh - 1, bw - 1, 1, S[2]);
        T.r(x + bw - 1, y + 1, 1, bh - 1, S[2]);
        T.r(x, y, bw, 1, S[3]);
        T.r(x, y, 1, bh, S[3]);
        if (R() < 0.25) T.p(x + 2 + R() * (bw - 4), y + 2 + R() * (bh - 3), S[2]);
        if (R() < 0.12) T.r(x + 1, y + 1, 2, 1, shd(th.top, -0.1));
        x += bw;
      }
      y += bh;
    }
    // bóng dưới chân tường
    for (let x = 0; x < W; x++) T.p(x, G + 30 + ((x * 3) % 2), D[3]);
    // phiến đá lát mặt đường
    let x = 0;
    while (x < W) {
      const sw = 14 + ((R() * 14) | 0);
      T.r(x, G, sw, 4, S[1]);
      T.r(x, G, sw, 1, shd(S[0], 0.3));
      T.r(x, G + 1, sw, 1, S[0]);
      T.r(x, G + 3, sw, 1, S[2]);
      T.r(x + sw - 1, G, 1, 4, S[3]);
      if (R() < 0.4) T.r(x + 3 + R() * (sw - 8), G + 2, 3, 1, S[2]);
      x += sw;
    }
    T.r(0, G + 4, W, 1, S[3]);
    // rêu & cỏ mọc kẽ đá
    const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.25)];
    for (let i = 0; i < W / 9; i++) {
      const gx = R() * W;
      const h = 1 + ((R() * 3) | 0);
      for (let k = 0; k < h; k++) { T.p(gx, G - 1 - k, Gr[1]); if (k < h - 1) T.p(gx + 1, G - 1 - k, Gr[2]); }
      if (R() < 0.3) T.p(gx - 1, G - 1, Gr[0]);
    }
    for (let i = 0; i < W / 30; i++) T.r(R() * W, G + 4 + R() * 24, 2 + R() * 3, 1, shd(th.top, -0.15));
  } else if (kind === 'sand') {
    const Sd = [shd(th.top, 0.35), th.top, shd(th.top, -0.12), shd(th.top, -0.25)];
    T.r(0, G, W, H - G, Sd[2]);
    T.r(0, G + 10, W, H - G - 10, shd(th.dirt, -0.05));
    for (let x = 0; x < W; x++) {
      const t = G + Math.round(Math.sin(x * 0.06) * 0.6);
      T.r(x, t, 1, 10 - (t - G), Sd[1]);
      T.p(x, t, Sd[0]);
      // gợn cát
      if (((x + Math.round(Math.sin(x * 0.1) * 3)) % 9) < 3) T.p(x, G + 3, Sd[0]);
      if (((x + 4 + Math.round(Math.sin(x * 0.08) * 3)) % 11) < 3) T.p(x, G + 6, Sd[3]);
      if (R() < 0.04) T.p(x, G - 1, Sd[1]);
    }
    strata(T, R, W, G + 18, H, shd(th.dirt, -0.18), 9);
    strata(T, R, W, G + 22, H, shd(th.dirt, 0.12), 9);
    speck(T, R, 0, G + 2, W, H - G, W * 0.6, [Sd[0], Sd[3], shd(th.dirt, -0.3)]);
    pebbles(T, R, W, G + 12, H, W / 20, ['#e8dcc8', '#c8b498', '#a08a70', '#7a6852']);
    if (m.theme === 'beach' || m.theme === 'dragon_palace') for (let i = 0; i < W / 110; i++) blit(T, sprProp(R() < 0.7 ? 'shell' : 'starfish', i % 3), R() * W, G - 4 + R() * 3);
    if (sc.paved) {
      // phiến đá cổ lát đường, bị cát vùi từng đoạn
      const P = ['#fff0c8', '#e8c890', '#c09a62', '#8a6a40'];
      let x = 0;
      while (x < W) {
        const sw = 16 + ((R() * 12) | 0);
        if (R() < 0.72) {
          const sink = (R() * 2) | 0;
          T.r(x, G + sink, sw - 1, 7 - sink, P[1]);
          T.r(x, G + sink, sw - 1, 1, P[0]);
          T.r(x, G + 6, sw - 1, 1, P[2]);
          T.r(x + sw - 1, G + sink, 1, 7 - sink, P[3]);
          if (R() < 0.35) { const gx = x + 4 + ((R() * (sw - 10)) | 0); T.r(gx, G + 3, 3, 1, P[2]); T.p(gx + 1, G + 2, P[2]); T.p(gx + 1, G + 4, P[2]); }
          if (R() < 0.3) T.line(x + 3, G + 1, x + 6, G + 5, P[2]);
          // cát phủ một góc phiến đá
          const dr = (R() * 6) | 0;
          for (let k = 0; k < dr; k++) T.p(x + k, G + sink, th.top);
        }
        x += sw;
      }
    }
  } else if (kind === 'snow') {
    T.r(0, G, W, H - G, D[1]);
    strata(T, R, W, G + 16, H, D[2], 12);
    speck(T, R, 0, G + 8, W, H - G, W * 0.5, ['#e8f2fb', D[2], D[0]]);
    pebbles(T, R, W, G + 12, H, W / 16, ['#c4ccd6', '#9aa4b2', '#76808e', '#58606c']);
    for (let x = 0; x < W; x++) {
      const bump = Math.max(0, Math.round(Math.sin(x * 0.09) * 1.4 + Math.sin(x * 0.31) * 0.8));
      const depth = 6 + Math.round(Math.sin(x * 0.17) * 1.5 + Math.sin(x * 0.05) * 1.2);
      T.r(x, G - bump, 1, depth + bump, '#f4f8fc');
      T.p(x, G - bump, '#ffffff');
      T.r(x, G + depth - 2, 1, 2, '#c8daee');
      T.p(x, G + depth, '#9ab8d8');
      if (R() < 0.15) T.p(x, G + 2 + ((R() * 3) | 0), '#dce8f4');
      // nhũ băng nhỏ
      if (R() < 0.06) { const l = 1 + ((R() * 4) | 0); for (let k = 0; k < l; k++) T.p(x, G + depth + 1 + k, k === l - 1 ? '#ffffff' : '#bfe6fa'); }
    }
  } else if (kind === 'ice') {
    voronoiRock(T, R, W, G + 6, H, ['#8cc8ea', '#64a4cc', '#4a84b0', '#2e5a84']);
    for (let i = 0; i < W / 10; i++) T.p(R() * W, G + 10 + R() * (H - G - 10), '#d8f4ff');
    for (let x = 0; x < W; x++) {
      T.r(x, G, 1, 7, '#bfe8fa');
      T.p(x, G, '#ffffff');
      T.p(x, G + 1, '#e8f8ff');
      T.r(x, G + 6, 1, 2, '#6aa8d0');
      // vệt bóng chéo
      if (((x + 0) % 23) < 2) for (let k = 0; k < 5; k++) T.p(x + k, G + 1 + k, '#ffffff');
      if (R() < 0.05) T.p(x, G - 1, '#ffffff');
    }
  } else if (kind === 'rock') {
    const P = sc.gpal;
    voronoiRock(T, R, W, G + 3, H, [P[1], P[2], P[3], P[4]]);
    for (let x = 0; x < W; x++) {
      const b = Math.round(Math.sin(x * 0.2) * 0.7 + Math.sin(x * 0.07));
      T.r(x, G - Math.max(0, b), 1, 4 + Math.max(0, b), P[1]);
      T.p(x, G - Math.max(0, b), P[0]);
      if (R() < 0.04) T.r(x, G - 2, 2, 2, P[1]);
    }
    if (m.theme === 'cave') for (let i = 0; i < W / 25; i++) { const c = R() < 0.5 ? '#b388ff' : '#4fc3f7'; const x = R() * W; const yy = G + 6 + R() * 40; T.p(x, yy, c); T.p(x + 1, yy - 1, shd(c, 0.5)); }
    if (sc.veins) for (let i = 0; i < W / 14; i++) {
      // mạch tinh thể lộ trong đá
      const c = sc.veins[(R() * sc.veins.length) | 0];
      let x = R() * W;
      let yy = G + 5 + R() * 44;
      const len = 3 + ((R() * 6) | 0);
      for (let k = 0; k < len; k++) { T.p(x, yy, k === 0 ? shd(c, 0.6) : c); x += R() < 0.5 ? 1 : 0; yy += R() < 0.6 ? 1 : 0; }
    }
  } else if (kind === 'basalt' && sc.zig) {
    // đá ma giới: khối đá vỡ + khe nứt phát sáng ngoằn ngoèo, phân nhánh, cách nhau không đều
    const P = sc.bpal;
    const K = sc.crack;
    voronoiRock(T, R, W, G + 3, H, [P[1], P[2], P[3], '#0e0c12']);
    for (let xx = 0; xx < W; xx++) {
      const b = Math.round(Math.sin(xx * 0.23) * 0.7 + Math.sin(xx * 0.061) * 1.1);
      T.r(xx, G - Math.max(0, b), 1, 4 + Math.max(0, b), P[1]);
      T.p(xx, G - Math.max(0, b), P[0]);
      T.p(xx, G + 3, P[3]);
    }
    const crack = (x, y, len, a, depth) => {
      let k = 0;
      while (k < len) {
        const seg = 2 + ((R() * 4) | 0);
        const x1 = x + Math.cos(a) * seg;
        const y1 = y + Math.sin(a) * seg;
        const f = k / len;
        T.line(x, y, x1, y1, f < 0.35 ? K[2] : f < 0.75 ? K[0] : K[1]);
        if (depth === 0 && f < 0.6) T.line(x + 1, y, x1 + 1, y1, K[1]);
        x = x1; y = y1; k += seg;
        a = clamp(a + (R() - 0.5) * 1.6, 0.35, Math.PI - 0.35);
        if (depth < 2 && R() < 0.22) crack(x, y, (len - k) * (0.4 + R() * 0.3), a + (R() < 0.5 ? -0.9 : 0.9), depth + 1);
      }
    };
    let cx = R() * 30;
    while (cx < W) {
      crack(cx, G + 2, 14 + R() * 30, Math.PI / 2 + (R() - 0.5) * 1.2, 0);
      cx += 22 + R() * 90;
    }
    // vài vết nứt ngang sâu trong đá
    for (let i = 0; i < W / 160; i++) crack(R() * W, G + 26 + R() * 30, 10 + R() * 14, R() < 0.5 ? 0.4 : Math.PI - 0.4, 1);
  } else if (kind === 'basalt') {
    const P = sc.bpal || ['#5a4444', '#3e2e2e', '#2a1e1e', '#1a1212'];
    const K = sc.crack || ['#ff6a1a', '#c83a10', '#ff8a3a'];
    T.r(0, G, W, H - G, P[2]);
    // cột đá bazan + khe nứt nóng chảy
    let x = 0;
    while (x < W) {
      const cw = 7 + ((R() * 6) | 0);
      const off = (R() * 6) | 0;
      T.r(x, G + 4 + off, cw - 1, H, P[1]);
      T.r(x, G + 4 + off, 1, H, P[0]);
      T.r(x + cw - 2, G + 4 + off, 1, H, P[3]);
      for (let yy = G + 12 + off; yy < H; yy += 10 + ((R() * 6) | 0)) T.r(x, yy, cw - 1, 1, P[3]);
      if (R() < 0.35) for (let yy = G + 5 + off; yy < H; yy++) T.p(x + cw - 1, yy, (yy + x) % 7 < 4 ? K[0] : K[1]);
      x += cw;
    }
    for (let xx = 0; xx < W; xx++) {
      T.r(xx, G, 1, 4, P[1]);
      T.p(xx, G, P[0]);
      if (R() < 0.05) T.p(xx, G + 1, K[2]);
      if (R() < 0.03) T.r(xx, G - 1, 2, 1, P[1]);
    }
  } else if (kind === 'cloud') {
    // nền thiên cung: mép mây bồng, phiến cẩm thạch viền vàng, bên dưới là biển mây
    const M = ['#ffffff', '#e2dcf2', '#b4aad8', '#7c70b0'];
    T.r(0, G, W, H - G, '#8076b4');
    const cb = new Buf(W, H - G);
    for (let i = 0; i < W / 9; i++) {
      const x = R() * W;
      const r = 6 + R() * 8;
      blob(cb, x, 30 + R() * 22 + r * 0.3, r * 1.3, r, CLOUD_D, { wob: 0.1, ph: R() * 6, dither: false });
    }
    blit(T, cb, 0, G);
    // bóng đổ dưới mép phiến đá
    T.r(0, G + 18, W, 2, '#5a5090');
    let x = 0;
    while (x < W) {
      const sw = 22 + ((R() * 10) | 0);
      T.r(x, G + 4, sw, 13, M[1]);
      T.r(x, G + 4, sw, 1, M[0]);
      T.r(x, G + 15, sw, 2, M[2]);
      T.r(x + sw - 1, G + 4, 1, 13, M[3]);
      if (R() < 0.45) T.line(x + 4, G + 7, x + 8 + ((R() * 6) | 0), G + 12, M[2]);
      x += sw;
    }
    T.r(0, G + 9, W, 1, '#f0b840');
    T.r(0, G + 10, W, 1, '#b8802a');
    for (let xx = 4; xx < W; xx += 12) { T.r(xx, G + 8, 3, 3, '#ffd870'); T.p(xx + 1, G + 9, '#fff4c0'); }
    T.r(0, G + 17, W, 1, '#4a4080');
    // mép mây phủ lên mặt đường
    for (let xx = 0; xx < W; xx++) {
      const bump = Math.max(0, Math.round(Math.sin(xx * 0.21) * 1.2 + Math.sin(xx * 0.07 + 1) * 1.4));
      T.r(xx, G - bump, 1, 4 + bump, M[0]);
      T.p(xx, G + 3, (xx * 5) % 7 < 3 ? M[2] : M[1]);
      T.p(xx, G + 4, M[3]);
      if (R() < 0.12) T.p(xx, G + 2, M[1]);
    }
  } else if (kind === 'tiles') {
    const S = ['#f0e6d2', '#d8cab0', '#b4a486', '#8a7a60'];
    T.r(0, G, W, H - G, '#8a7457');
    // nền gạch
    for (let y = G + 10; y < H; y += 6) for (let x = ((y / 6) & 1) * 7 - 7; x < W; x += 14) {
      T.r(x, y, 13, 5, '#a8916e'); T.r(x, y, 13, 1, '#bca684'); T.r(x + 13, y, 1, 6, '#6e5c44'); T.r(x, y + 5, 14, 1, '#6e5c44');
    }
    // phiến đá lát + viền trang trí
    for (let x = 0; x < W; x += 24) {
      T.r(x, G, 24, 6, S[1]); T.r(x, G, 24, 1, '#ffffff'); T.r(x, G + 1, 24, 1, S[0]); T.r(x, G + 5, 24, 1, S[2]); T.r(x + 23, G, 1, 6, S[3]);
      T.p(x + 6, G + 3, S[2]); T.p(x + 15, G + 2, S[2]);
    }
    T.r(0, G + 6, W, 3, '#b03030'); T.r(0, G + 6, W, 1, '#d84a40');
    for (let x = 2; x < W; x += 8) T.r(x, G + 7, 3, 1, '#ffd54f');
    T.r(0, G + 9, W, 1, '#5a2020');
  }
  if (kind !== 'tiles') depthShade(T, W, G + 14, H, kind === 'cloud' ? [1, 0.92, 0.84, 0.76] : [1, 0.9, 0.8, 0.7]);
}

// Vách đá hai đầu bản đồ
export function buildCliffs(T, m, th, sc, R) {
  const G = m.ground;
  const dk = m.theme === 'dark_forest' ? ['#5a4e6e', '#433a56', '#30293f', '#211c2c'] : m.theme === 'mist' ? ['#8a948e', '#6a746e', '#525a56', '#3c423f'] : null;
  const pal = dk || sc.cliff || (sc.ground === 'snow' || sc.ground === 'ice' ? ['#d4e2ee', '#a6b8cc', '#7a8ea6', '#566a82'] : sc.ground === 'sand' ? ['#f0c890', '#d0a068', '#a87a4a', '#7a5634'] : sc.ground === 'basalt' ? ['#5a4040', '#3e2c2c', '#2a1c1c', '#1a1010'] : sc.ground === 'rock' ? sc.gpal : ['#a89c8c', '#857a6c', '#62584c', '#463e36']);
  const cap = sc.cap ? sc.cap : sc.ground === 'snow' || sc.ground === 'ice' ? '#ffffff' : sc.ground === 'sand' ? th.top : sc.ground === 'basalt' || sc.ground === 'rock' || sc.ground === 'tiles' ? null : th.top;
  for (const side of [0, 1]) {
    const cw = 20;
    const Hc = 84 + R() * 30;
    for (let i = 0; i < cw + 6; i++) {
      const f = i / cw;
      const h = Math.round(Hc * Math.max(0, 1 - Math.pow(f, 1.6)) + Math.sin(i * 1.7) * 2);
      if (h <= 0) continue;
      const x = side ? m.w - 1 - i : i;
      for (let y = G - h; y < G + 2; y++) {
        const yy = y - (G - h);
        let c = pal[1];
        if (i > cw - 4 - Math.sin(y * 0.3) * 2) c = pal[2];
        if ((y + i * 2) % 11 === 0) c = pal[3];
        if (yy < 2) c = pal[0];
        T.p(x, y, c);
      }
      if (cap) { T.r(x, G - h - 1, 1, 3, cap); if (i % 3 === 0) T.p(x, G - h + 2, cap); }
    }
  }
}

// ======================= Bục nhảy =======================
function floorBelow(m, x, y) {
  let best = m.ground;
  for (const [px, py, pw] of m.platforms) if (py > y + 2 && x >= px && x <= px + pw && py < best) best = py;
  return best;
}

export function buildPlatform(T, m, th, sc, R, px, py, pw, anims) {
  const type = th.plat;
  const x0 = Math.round(px);
  const y = Math.round(py);
  const w = Math.round(pw);
  if (type === 'wood') {
    const Wd = ['#e2b276', '#b07c46', '#87592f', '#5a3a20'];
    // cột chống
    const posts = [x0 + 5, x0 + w - 8];
    if (w > 170) posts.push(x0 + Math.round(w / 2) - 1);
    for (const sx of posts) {
      const fy = floorBelow(m, sx, y);
      T.r(sx, y + 5, 3, fy - y - 5, Wd[2]);
      T.r(sx, y + 5, 1, fy - y - 5, Wd[1]);
      T.r(sx + 2, y + 5, 1, fy - y - 5, Wd[3]);
      for (let yy = y + 14; yy < fy - 4; yy += 16) T.r(sx - 1, yy, 5, 2, '#c8a878');
      // thanh giằng chéo
      const dir = sx < x0 + w / 2 ? 1 : -1;
      T.line(sx + 1, y + 16, sx + 1 + dir * 10, y + 6, Wd[3], 2);
      T.r(sx - 1, fy - 2, 5, 2, '#7a6a5a');
    }
    // mặt cầu bằng ván
    T.r(x0, y, w, 5, Wd[1]);
    T.r(x0, y, w, 1, Wd[0]);
    T.r(x0, y + 3, w, 1, Wd[2]);
    T.r(x0, y + 5, w, 2, Wd[3]);
    let x = x0;
    while (x < x0 + w) {
      const pl = 9 + ((R() * 6) | 0);
      T.r(x, y, 1, 5, Wd[3]);
      T.p(x + 2, y + 1, '#4a3424');
      if (pl > 11) T.r(x + 4, y + 2, 4, 1, Wd[2]);
      x += pl;
    }
    for (let bx = x0 + 6; bx < x0 + w - 4; bx += 24) T.r(bx, y + 7, 4, 2, Wd[3]);
    // lan can dây thừng
    const rp = [x0 + 1];
    for (let k = x0 + 36; k < x0 + w - 18; k += 36) rp.push(k);
    rp.push(x0 + w - 3);
    for (const k of rp) { T.r(k, y - 9, 2, 9, Wd[2]); T.p(k, y - 9, Wd[0]); T.r(k, y - 10, 2, 1, Wd[3]); }
    for (let i = 0; i + 1 < rp.length; i++) {
      const a = rp[i] + 1;
      const b = rp[i + 1];
      for (let xx = a; xx <= b; xx++) {
        const f = (xx - a) / (b - a);
        const yy = y - 8 + Math.round(Math.sin(f * Math.PI) * 3);
        T.p(xx, yy, (xx & 1) ? '#d8bc88' : '#a88a5a');
      }
    }
    if (m.town) for (let i = 0; i + 1 < rp.length; i++) {
      // đèn lồng nhỏ treo trên lan can làng
      const mx = Math.round((rp[i] + rp[i + 1]) / 2);
      if ((i & 1) === 0) { lanternMini(T, mx, y - 5); anims.lights.push({ x: mx, y: y - 2, r: 16, col: '#ff9a40', a: 0.35, f: 0.25 }); }
    }
  } else if (type === 'bamboo') {
    const B = ['#d6ec8e', '#9cc456', '#6e9a38', '#4a6e24'];
    for (const sx of [x0 + 4, x0 + w - 7]) {
      const fy = floorBelow(m, sx, y);
      for (let yy = y - 6; yy < fy; yy++) {
        T.p(sx, yy, B[0]); T.p(sx + 1, yy, B[1]); T.p(sx + 2, yy, B[2]);
        if ((yy - y) % 14 === 0) T.r(sx - 1, yy, 5, 1, B[3]);
      }
      T.r(sx - 1, y - 7, 5, 1, B[3]);
    }
    for (const yy of [y, y + 3]) {
      T.r(x0, yy, w, 3, B[1]);
      T.r(x0, yy, w, 1, B[0]);
      T.r(x0, yy + 2, w, 1, B[2]);
      for (let x = x0 + 8 + (yy - y) * 3; x < x0 + w; x += 17) { T.r(x, yy, 1, 3, B[3]); T.p(x + 1, yy, B[0]); }
    }
    T.r(x0, y + 6, w, 1, B[3]);
    // dây buộc
    for (const sx of [x0 + 4, x0 + w - 7]) for (let k = 0; k < 3; k++) { T.r(sx - 1, y + k * 2, 5, 1, '#d8b070'); T.p(sx + 3, y + k * 2 + 1, '#a07a40'); }
    // lá tre ở đầu bục
    for (const [lx, d] of [[x0, -1], [x0 + w, 1]]) for (let i = 0; i < 6; i++) T.p(lx + d * i, y - 1 - (i >> 1), i < 3 ? B[1] : B[0]);
  } else if (type === 'cloud') {
    // bục mây: mặt phẳng trắng, đáy bồng bềnh, viền vàng mảnh
    const cb = new Buf(w + 16, 24);
    const n = Math.max(3, Math.round(w / 14));
    for (let i = 0; i < n; i++) {
      const cx = 8 + (w * (i + 0.5)) / n + (R() - 0.5) * 4;
      const r = 5 + R() * 3 + Math.sin((i / (n - 1 || 1)) * Math.PI) * 2;
      blob(cb, cx, 6 + r * 0.25, r * 1.25, r, CLOUD_D, { wob: 0.1, ph: R() * 6, dither: false });
    }
    for (let x = 0; x < cb.w; x++) for (let y = 0; y < 3; y++) cb.d[y * cb.w + x] = 0;
    cb.outline(0.55, '#3a3070');
    blit(T, cb, x0 - 8, y - 1);
    T.r(x0 - 2, y, w + 4, 2, '#ffffff');
    T.r(x0 - 2, y + 2, w + 4, 1, '#e8e4f6');
    for (let x = x0; x < x0 + w; x += 9) T.p(x + ((R() * 4) | 0), y + 4, '#ffffff');
    T.r(x0 + 4, y + 3, w - 8, 1, '#f0c860');
    for (const ex of [x0 - 2, x0 + w + 1]) { T.p(ex, y - 1, '#ffffff'); T.p(ex, y + 1, '#d6d0ee'); }
    anims.lights.push({ x: x0 + w / 2, y: y + 4, r: Math.min(40, w / 3), col: '#fff0c0', a: 0.18, f: 0.05 });
  } else if (type === 'ice') {
    for (let x = x0; x < x0 + w; x++) {
      const bump = (Math.sin(x * 0.4) > 0.6) ? 1 : 0;
      T.r(x, y - bump, 1, 2 + bump, '#ffffff');
      T.r(x, y + 2, 1, 4, '#a8dcf2');
      T.p(x, y + 2, '#e4f6ff');
      T.p(x, y + 6, '#5d9fc4');
      if (((x - x0) % 19) < 2) for (let k = 0; k < 3; k++) T.p(x + k, y + 2 + k, '#ffffff');
    }
    // nhũ băng
    for (let x = x0 + 2; x < x0 + w - 2; x += 2 + ((R() * 4) | 0)) {
      const l = 2 + ((R() * 9) | 0);
      for (let k = 0; k < l; k++) {
        const wdt = k < l * 0.4 ? 2 : 1;
        T.r(x, y + 7 + k, wdt, 1, k === l - 1 ? '#ffffff' : k < 2 ? '#7ab8dc' : '#bfe8fa');
      }
    }
  } else {
    // bục đá theo chủ đề
    const t = m.theme;
    const P = th.platPal ? th.platPal : t === 'desert' ? ['#ffe0a8', '#e8bc7c', '#c0905a', '#8a6038'] : t === 'cave' ? ['#8a80a8', '#625a80', '#463e60', '#2e2842'] : t === 'mist' ? ['#b8beb8', '#8e968e', '#6a726a', '#4a524c'] : t === 'arena' ? ['#ffffff', '#e2d8c6', '#b8aa90', '#857660'] : ['#6e5050', '#4a3434', '#332222', '#201414'];
    if (t === 'arena') {
      for (const sx of [x0 + 8, x0 + w - 18]) {
        const fy = floorBelow(m, sx, y);
        T.r(sx, y + 8, 10, fy - y - 8, P[2]);
        for (let k = sx + 2; k < sx + 9; k += 3) T.r(k, y + 10, 1, fy - y - 14, P[3]);
        T.r(sx, y + 8, 2, fy - y - 8, P[1]);
        T.r(sx - 2, fy - 4, 14, 4, P[2]); T.r(sx - 2, fy - 4, 14, 1, P[1]);
      }
    }
    T.r(x0, y, w, 8, P[1]);
    T.r(x0, y, w, 1, P[0]);
    T.r(x0, y + 1, w, 1, mix(P[0], P[1], 0.5));
    for (let x = x0 + ((R() * 6) | 0); x < x0 + w; x += 10 + ((R() * 6) | 0)) { T.r(x, y + 2, 1, 6, P[3]); T.p(x + 1, y + 2, P[0]); }
    T.r(x0, y + 5, w, 1, P[2]);
    T.r(x0, y + 7, w, 1, P[3]);
    if (t === 'arena') { T.r(x0, y + 4, w, 1, '#b03030'); for (let x = x0 + 3; x < x0 + w; x += 6) T.p(x, y + 4, '#ffd54f'); }
    if (th.platTrim) { T.r(x0, y + 3, w, 1, th.platTrim); for (let x = x0 + 4; x < x0 + w; x += 10) { T.r(x, y + 2, 2, 3, th.platTrim); T.p(x, y + 2, shd(th.platTrim, 0.5)); } }
    // mặt dưới lởm chởm
    if (t !== 'arena') for (let x = x0 + 1; x < x0 + w - 1; x++) {
      const l = Math.max(0, Math.round(2 + Math.sin(x * 0.45 + y) * 2 + Math.sin(x * 0.13) * 2 - Math.abs((x - x0 - w / 2) / (w / 2)) * 3));
      for (let k = 0; k < l; k++) T.p(x, y + 8 + k, k === l - 1 ? P[3] : P[2]);
    }
    if (th.platEdge) {
      // viền tối + dải hoa văn khắc + rễ khô rủ: tách bục khỏi nền trời cùng tông
      const E = th.platEdge;
      T.r(x0, y - 1, w, 1, E);
      T.r(x0 - 1, y, 1, 8, E); T.r(x0 + w, y, 1, 8, E);
      for (let x = x0; x < x0 + w; x++) { let yy = y + 8; while (yy < y + 16 && T.has(x, yy)) yy++; T.p(x, yy, E); }
      for (let x = x0 + 3; x < x0 + w - 4; x += 6) { T.p(x, y + 3, P[3]); T.p(x + 1, y + 4, P[3]); T.p(x + 2, y + 3, P[3]); }
      for (let x = x0 + 6; x < x0 + w - 6; x += 14 + ((R() * 16) | 0)) {
        const l = 3 + ((R() * 8) | 0);
        for (let k = 0; k < l; k++) T.p(x + (k > 3 ? 1 : 0), y + 10 + k, k === l - 1 ? '#8a7a40' : '#4a3a22');
      }
    }
    if (t === 'mist') for (let x = x0; x < x0 + w; x++) { T.p(x, y, '#7a9a6a'); if ((x * 7) % 5 < 2) T.p(x, y + 1, '#5e7e52'); if ((x * 13) % 17 === 0) T.r(x, y + 2, 1, 3, '#5e7e52'); }
    if (t === 'lava' || t === 'hell' || th.platGlow) {
      const gc = th.platGlow || '#ff7a2a';
      for (let x = x0 + 4; x < x0 + w - 4; x += 7 + ((R() * 8) | 0)) { T.r(x, y + 3, 1, 4, gc); T.p(x + 1, y + 5, shd(gc, 0.35)); anims.lights.push({ x, y: y + 6, r: 10, col: th.platGlow || '#ff6a1a', a: 0.25, f: 0.3 }); }
    }
    if ((t === 'cave' || th.platCrys) && R() < 0.8) {
      const cc = th.platCrys ? th.platCrys[(R() * th.platCrys.length) | 0] : R() < 0.5 ? '#b388ff' : '#4fc3f7';
      const spr = sprCrystal(8 + ((R() * 5) | 0), cc, 1);
      const cx = x0 + 6 + R() * (w - 20);
      blit(T, spr, cx, y - spr.h + 3);
      anims.lights.push({ x: cx + spr.w / 2, y: y - 4, r: 24, col: th.platCrys ? cc : '#a080ff', a: 0.35, f: 0.15 });
    }
    if (t === 'desert') { T.r(x0, y - 1, w, 1, '#f8dca8'); for (let x = x0; x < x0 + w; x += 3) T.p(x, y - 2, '#f8dca8'); }
  }
  // cỏ phủ mép bục cho chủ đề cỏ
  if (type === 'wood' && !m.town && sc.ground === 'grass') for (let x = x0; x < x0 + w; x += 1) if (((x * 7) % 9) < 2) T.p(x, y - 1, shd(th.top, 0.1));
}

export function lanternMini(T, x, y, col = '#e0352b') {
  T.p(x, y - 1, '#2a1a14');
  T.r(x - 2, y, 5, 5, col);
  T.r(x - 1, y + 1, 3, 3, shd(col, 0.35));
  T.p(x, y + 2, '#ffe6a0');
  T.r(x - 2, y, 5, 1, '#2a1a14');
  T.r(x - 2, y + 5, 5, 1, '#2a1a14');
}
