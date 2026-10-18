// Icon kỹ năng: nền theo hệ, hình tượng trưng từng chiêu, khung lục giác cho nội tại.
import { shade } from '../sprites.js';
import { OUT, TAU, rgb, Pix, FIX, tierPal } from './pix.js';
import { ITEM_MAPS } from './items.js';

// ================= ICON KỸ NĂNG (24x24) =================
// Hình minh họa được dựng từ các nét cơ bản, viền tối tự động, đặt trên nền tròn màu hệ.
const SK = 24;

function band(P, cx, cy, R, T, a0, a1, cols, skew = 1) {
  const span = a1 - a0;
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R || r < R - T - 1) return null;
    let a = Math.atan2(dy, dx);
    while (a < a0) a += TAU;
    while (a >= a0 + TAU) a -= TAU;
    if (a > a1) return null;
    const u = (a - a0) / span;
    const th = T * Math.pow(Math.sin(Math.PI * Math.pow(u, skew)), 0.8);
    if (th < 0.6) return null;
    const v = (R - r) / th;
    if (v > 1) return null;
    return cols[v < 0.25 ? 0 : v < 0.55 ? 1 : v < 0.8 ? 2 : 3];
  });
}

function sword(P, x0, y0, x1, y1, bl, opt = {}) {
  // x0,y0: chuôi (cuối) ; x1,y1: mũi
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  const hl = opt.handle || 4;
  const w = opt.w || 1;
  // lưỡi
  for (let t = hl + 1; t <= L; t += 0.5) {
    const x = x0 + ux * t;
    const y = y0 + uy * t;
    const tip = L - t < 2;
    P.set(x, y, bl[1]);
    if (!tip) {
      P.set(x + nx, y + ny, bl[0]);
      if (w > 1) P.set(x - nx, y - ny, bl[2]);
    }
  }
  P.set(x1, y1, bl[0]);
  // chắn kiếm
  const gx = x0 + ux * hl;
  const gy = y0 + uy * hl;
  const gw = opt.guard || 2.5;
  for (let t = -gw; t <= gw; t += 0.5) P.set(gx + nx * t, gy + ny * t, Math.abs(t) < 0.8 ? FIX.Y : FIX.G);
  // chuôi
  for (let t = 0; t < hl; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.h : FIX.k);
  P.set(x0 - ux * 0.6, y0 - uy * 0.6, FIX.G);
}

function shuri(P, cx, cy, R, cols, rot = 0) {
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > R) return null;
    const a = Math.atan2(dy, dx) - rot - (r / R) * 0.45;
    const la = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
    const core = R * 0.38;
    const tip = Math.max(0, 1 - Math.abs(la) / (Math.PI / 4));
    const rf = core + (R - core) * Math.pow(tip, 2.3);
    if (r > rf) return null;
    if (r < Math.max(0.9, R * 0.15)) return null;
    if (r < R * 0.28) return cols[2];
    return la < -0.08 ? cols[0] : cols[1];
  });
}

function arrow(P, x0, y0, x1, y1, head, shaft = '#a1887f', fl = '#ffffff') {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  P.line(x0, y0, x1 - ux * 2, y1 - uy * 2, shaft);
  // đầu mũi tên
  for (let t = 0; t < 3.5; t += 0.5) {
    const w = (3.5 - t) * 0.6;
    for (let s = -w; s <= w; s += 0.5) P.set(x1 - ux * (3.5 - t) + nx * s, y1 - uy * (3.5 - t) + ny * s, s < 0 ? '#ffffff' : head);
  }
  P.set(x1, y1, head);
  // lông đuôi
  for (let t = 0; t < 3; t += 0.5) {
    P.set(x0 + ux * t + nx * 1.4, y0 + uy * t + ny * 1.4, fl);
    P.set(x0 + ux * t - nx * 1.4, y0 + uy * t - ny * 1.4, fl);
  }
}

function kunaiShape(P, x0, y0, x1, y1, bl) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  // vòng
  P.fill(x0 - 3, y0 - 3, x0 + 3, y0 + 3, (x, y) => {
    const r = Math.hypot(x - x0, y - y0);
    return r < 2.2 && r > 1.1 ? '#90a4ae' : null;
  });
  for (let t = 2; t < L * 0.45; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.h : FIX.k);
  // lưỡi hình lá
  const b0 = L * 0.45;
  for (let t = b0; t <= L; t += 0.4) {
    const u = (t - b0) / (L - b0);
    const w = 2.2 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08));
    for (let s = -w; s <= w; s += 0.4) P.set(x0 + ux * t + nx * s, y0 + uy * t + ny * s, s < -w * 0.3 ? bl[0] : s < w * 0.4 ? bl[1] : bl[2]);
  }
}

function flame(P, cx, by, w, h, cols) {
  // cols: [lõi trắng, vàng, cam, đỏ]
  P.fill(cx - w, by - h - 1, cx + w, by, (x, y) => {
    const u = (by - y) / h;
    if (u < 0 || u > 1) return null;
    const sw = Math.sin(u * 5 + cx) * u * 1.2;
    const hw = w * (u < 0.3 ? Math.sqrt(u / 0.3) * 0.9 + 0.1 : Math.pow(1 - (u - 0.3) / 0.7, 1.2));
    const d = Math.abs(x - cx - sw);
    if (d > hw) return null;
    const v = d / Math.max(0.5, hw);
    if (u < 0.45 && v < 0.35) return cols[0];
    if (u < 0.65 && v < 0.6) return cols[1];
    if (v < 0.8 && u < 0.85) return cols[2];
    return cols[3];
  });
}

function drop(P, cx, cy, r, cols) {
  P.fill(cx - r - 1, cy - r * 2.4, cx + r + 1, cy + r + 1, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    let ok;
    if (dy >= 0) ok = dx * dx + dy * dy <= r * r;
    else ok = Math.abs(dx) <= r * (1 + dy / (r * 2.2));
    if (!ok) return null;
    const lit = (-dx - dy * 0.5) / r;
    return lit > 0.55 ? cols[0] : lit > 0 ? cols[1] : lit > -0.6 ? cols[2] : cols[3];
  });
}

function leafShape(P, cx, cy, len, ang, cols) {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  for (let t = -len / 2; t <= len / 2; t += 0.4) {
    const u = (t + len / 2) / len;
    const w = (len * 0.28) * Math.sin(Math.PI * u);
    for (let s = -w; s <= w; s += 0.4) P.set(cx + ux * t - uy * s, cy + uy * t + ux * s, Math.abs(s) < 0.45 ? cols[2] : s < 0 ? cols[0] : cols[1]);
  }
}

function spiral(P, cx, cy, R, turns, col, col2, w = 1, rot = 0) {
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = rot + u * turns * TAU;
    const r = 1 + u * (R - 1);
    P.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, u > 0.55 ? col : col2);
    if (w > 1 && u > 0.3) P.set(cx + Math.cos(a) * (r - 0.8), cy + Math.sin(a) * (r - 0.8) * 0.9, col2);
  }
}

function tornado(P, cx, by, h, w, cols) {
  for (let i = 0; i < h; i++) {
    const u = i / h;
    const r = 1.2 + Math.pow(u, 1.2) * w;
    const y = by - i;
    const off = Math.sin(u * 5) * 1.3 * u;
    const ph = i * 0.9;
    for (let x = -r; x <= r; x += 0.5) {
      const v = (x / r + 1) / 2;
      const stripe = Math.sin(v * 6 + ph) > 0.2;
      P.set(cx + off + x, y, stripe ? cols[0] : v < 0.5 ? cols[1] : cols[2]);
    }
  }
}

function plus(P, cx, cy, s, col, hi) {
  P.rect(cx - s, cy - 1, s * 2 + 1, 3, col);
  P.rect(cx - 1, cy - s, 3, s * 2 + 1, col);
  P.rect(cx - s + 1, cy, s * 2 - 1, 1, hi);
  P.rect(cx, cy - s + 1, 1, s * 2 - 1, hi);
}

function star4(P, cx, cy, R, col, core = '#ffffff') {
  for (let i = -R; i <= R; i++) {
    const w = Math.abs(i) < R * 0.4 ? 1 : 0;
    P.set(cx + i, cy, col);
    P.set(cx, cy + i, col);
    if (w) {
      P.set(cx + i, cy - 1, col);
      P.set(cx + i, cy + 1, col);
      P.set(cx - 1, cy + i, col);
      P.set(cx + 1, cy + i, col);
    }
  }
  P.set(cx, cy, core);
}

function ringE(P, cx, cy, rx, ry, col, a0 = 0, a1 = TAU) {
  const n = Math.max(24, Math.round((rx + ry) * 4));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    P.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, col);
  }
}

function figure(P, cx, by, col, hi) {
  P.map([
    '..hhhh..',
    '.hHHHHh.',
    '.hHwwHh.',
    'RRRRRRRR',
    '.hHHHHh.',
    '..hHHh..',
    '.hHHHHh.',
    'hHHHHHHh',
    'hHhHHhHh',
    '.hHHHHh.',
    '.hH..Hh.',
    '.hH..Hh.',
    '.hh..hh.',
  ], { h: col, H: hi, w: '#ffe0c0', R: '#e53935' }, cx - 4, by - 13);
}

function meteorShape(P, cx, cy, r, core, mid, rim, tail, dx = -1, dy = -1) {
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  for (let t = 0; t < 9; t += 0.5) {
    const w = r * (1 - t / 10);
    for (let s = -w; s <= w; s += 0.5) P.set(cx + ux * (t + r * 0.6) - uy * s, cy + uy * (t + r * 0.6) + ux * s, Math.abs(s) < w * 0.4 ? mid : tail);
  }
  P.fill(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => {
    const ddx = x - cx;
    const ddy = y - cy;
    const rr = Math.sqrt(ddx * ddx + ddy * ddy);
    if (rr > r) return null;
    return rr < r * 0.45 ? core : rr < r * 0.8 ? mid : rim;
  });
}

function shield(P, cx, cy, cols) {
  P.fill(cx - 7, cy - 8, cx + 7, cy + 8, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const hw = dy < -2 ? 6.5 : 6.5 * Math.sqrt(Math.max(0, 1 - ((dy + 2) / 9.5) ** 2));
    if (dy < -7.5 || Math.abs(dx) > hw) return null;
    if (Math.abs(dx) > hw - 1.2 || dy < -6.3) return cols[3];
    return dx < -0.5 ? cols[0] : dx < 0.6 ? cols[3] : cols[1];
  });
}

function eye(P, cx, cy, iris) {
  P.fill(cx - 8, cy - 5, cx + 8, cy + 5, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const hw = 7.5 * Math.sqrt(Math.max(0, 1 - (dy / 4.2) ** 2));
    if (Math.abs(dx) > 7.5 || Math.abs(dy) > 4.2 * (1 - (dx / 8) ** 2)) return null;
    const r = Math.hypot(dx, dy);
    if (r < 1.2) return OUT;
    if (r < 3.4) return r < 2.2 ? shade(iris, -0.3) : iris;
    return hw > 0 ? '#ffffff' : null;
  });
  P.set(cx - 1, cy - 2, '#ffffff');
}

function snowflake(P, cx, cy, R, col, hi) {
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6 - Math.PI / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    P.line(cx, cy, cx + ux * R, cy + uy * R, col);
    const bx = cx + ux * R * 0.6;
    const by = cy + uy * R * 0.6;
    for (const s of [-1, 1]) {
      const b = a + s * 0.8;
      P.line(bx, by, bx + Math.cos(b) * R * 0.35, by + Math.sin(b) * R * 0.35, hi);
    }
  }
  P.set(cx, cy, '#ffffff');
}

function waveCurl(P, cx, by, cols) {
  P.fill(cx - 10, by - 14, cx + 10, by, (x, y) => {
    const dx = x - cx;
    const dy = by - y;
    const crest = 9 + Math.sin((dx + 10) / 20 * Math.PI) * 4 - Math.max(0, dx - 3) * 0.9;
    if (dy > crest || dx < -10 || dx > 10) return null;
    const curlC = { x: cx + 3, y: by - 9 };
    const rc = Math.hypot(x - curlC.x, y - curlC.y);
    if (rc < 2.6 && x > curlC.x - 1) return null;
    if (dy > crest - 1.3) return cols[0];
    if (dy > crest - 3) return cols[1];
    return (dx + dy) % 5 < 1 ? cols[1] : dy < 3 ? cols[3] : cols[2];
  });
}

function fanShape(P, cx, cy, R, cols, a0 = -Math.PI + 0.3, a1 = -0.3) {
  P.fill(cx - R - 1, cy - R - 1, cx + R + 1, cy + 2, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    if (a < a0 || a > a1 || r > R) return null;
    const u = (a - a0) / (a1 - a0);
    const k = Math.floor(u * 8);
    const edge = Math.abs(u * 8 - k - 0.5) > 0.38;
    if (r < R * 0.3) return edge ? FIX.h : null;
    if (r > R - 1.2) return cols[2];
    if (edge) return cols[2];
    return k % 2 ? cols[0] : cols[1];
  });
  P.rect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, FIX.h);
  P.set(Math.round(cx), Math.round(cy), FIX.G);
}

function daoShape(P, x0, y0, x1, y1, bl) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  const nx = -uy;
  const ny = ux;
  const hl = 5;
  for (let t = hl; t <= L; t += 0.4) {
    const u = (t - hl) / (L - hl);
    const w = 1.4 + u * 1.6 - (u > 0.85 ? (u - 0.85) * 14 : 0);
    const curve = u * u * 2;
    for (let s = -1; s <= w; s += 0.4) {
      const c = s > w - 0.8 ? bl[0] : s < 0 ? bl[2] : bl[1];
      P.set(x0 + ux * t + nx * (s - curve), y0 + uy * t + ny * (s - curve), c);
    }
  }
  for (let t = -2.5; t <= 3; t += 0.5) P.set(x0 + ux * hl + nx * t, y0 + uy * hl + ny * t, FIX.G);
  for (let t = 0; t < hl; t += 0.5) P.set(x0 + ux * t, y0 + uy * t, Math.floor(t) % 2 ? FIX.r : FIX.R);
}

function speedLines(P, x0, x1, ys, col) {
  for (const y of ys) P.line(x0 + (y % 3), y, x1 - (y % 2) * 2, y, col);
}

function netGrid(P, cx, cy, R, col) {
  for (let i = -R; i <= R; i += 3) {
    P.line(cx + i, cy - R, cx + i + 2, cy + R, col);
    P.line(cx - R, cy + i, cx + R, cy + i - 2, col);
  }
}

// ---- nét dùng cho thần kỹ hậu kỳ (cấp 100+)
// lông vũ thon từ gốc (x0,y0) tới ngọn (x1,y1); cols: [sáng, chính, tối]
function feather(P, x0, y0, x1, y1, w, cols) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  for (let t = 0; t <= L; t += 0.4) {
    const u = t / L;
    const hw = w * Math.sin(Math.PI * (0.12 + u * 0.88));
    for (let s = -hw; s <= hw; s += 0.4) {
      const c = u > 0.8 ? cols[0] : Math.abs(s) < 0.45 ? cols[0] : s < 0 ? cols[1] : cols[2];
      P.set(x0 + ux * t - uy * s, y0 + uy * t + ux * s, c);
    }
  }
}

// cánh: chùm lông xòe từ gốc, góc a0 -> a1, lông ngắn dần
function wing(P, x, y, a0, a1, n, L0, L1, cols) {
  for (let i = n - 1; i >= 0; i--) {
    const u = i / (n - 1);
    const a = a0 + (a1 - a0) * u;
    const L = L0 + (L1 - L0) * u;
    feather(P, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 1.6, cols);
  }
}

// mây cuộn đáy phẳng (13x6) đặt theo tâm; cols: [sáng, chính, đáy]
function cloud(P, cx, cy, cols) {
  P.map([
    '....www......',
    '..wwwwww.ww..',
    '.wwwwLwwwwww.',
    'wwLLLLLwwLLww',
    'LLLLLLLLLLLLL',
    '.ddddddddddd.',
  ], { w: cols[0], L: cols[1], d: cols[2] }, cx - 6, cy - 3);
}

// phi tiêu 4 cánh 7x7 nét rõ ở cỡ nhỏ (shuri() bị rỗ khi bán kính < 5)
function star7(P, cx, cy, cols) {
  P.map([
    '...w...',
    '..wwS..',
    '..wSS..',
    'wwSoSSs',
    '..SSs..',
    '..Sss..',
    '...s...',
  ], { w: cols[0], S: cols[1], s: cols[2], o: OUT }, cx - 3, cy - 3);
}

// mảnh băng nhọn hai mặt; cols: [sáng, chính, tối]
function shard(P, x0, y0, x1, y1, w, cols) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  for (let t = 0; t <= L; t += 0.4) {
    const u = t / L;
    const hw = w * (u < 0.25 ? 0.6 + u * 1.6 : (1 - u) / 0.75);
    for (let s = -hw; s <= hw; s += 0.4) P.set(x0 + ux * t - uy * s, y0 + uy * t + ux * s, Math.abs(s) < 0.45 ? '#ffffff' : s < 0 ? cols[0] : cols[1]);
  }
  P.set(x0, y0, cols[2]);
}

// tia sét gấp khúc dày 2px, lõi sáng
function bolt(P, pts, col, hi) {
  for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, 2);
  for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], hi);
}

// đóa hoa 5 cánh nhỏ
function blossom(P, x, y, petal, core) {
  P.map(['.p.p.', 'ppppp', '.pcp.', 'ppppp', '.p.p.'], { p: petal, c: core }, x - 2, y - 2);
}

// nền tròn theo màu hệ; divine: thêm vòng viền kim cho thần kỹ (req >= 100)
function skillBg(el, ult, basic, divine) {
  const P = new Pix(SK, SK);
  const c = 11.5;
  const rim = ult ? ['#7a4a00', '#ffd54f', '#fff59d'] : basic ? ['#3a2618', '#b08850', '#e0c48a'] : ['#2a1a10', '#a07040', '#d8b078'];
  P.fill(0, 0, SK - 1, SK - 1, (x, y) => {
    const dx = x - 12;
    const dy = y - 12;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r > c + 0.3) return null;
    if (r > c - 0.7) return OUT;
    if (r > c - 1.7) return (dx + dy < 0 ? rim[2] : rim[1]);
    if (r > c - 2.5) return rim[0];
    // thần kỹ: vòng kim thứ hai tách khỏi viền vàng bằng một nét tối, đọc ra viền kép ở 24px
    if (divine && r > c - 3.5) return '#ffd54a';
    const lit = (-dx - dy) / 16;
    const t = r / (c - 2.5);
    const base = t < 0.45 ? shade(el, -0.05 + lit * 0.4) : t < 0.8 ? shade(el, -0.3 + lit * 0.3) : shade(el, -0.55);
    return base;
  });
  // tia sáng mờ trong nền
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + 0.2;
    for (let r = 3; r < 8.5; r += 0.5) P.set(12 + Math.cos(a) * r, 12 + Math.sin(a) * r, shade(el, 0.15), 0.35);
  }
  if (ult) {
    for (const [x, y] of [[12, 1], [12, 22], [1, 12], [22, 12]]) P.set(x, y, '#fff59d');
  }
  return P;
}

function elPal(el) {
  return {
    fire: ['#fffde7', '#ffeb3b', '#ff9800', '#e64a19'],
    water: ['#ffffff', '#b3e5fc', '#29b6f6', '#01579b'],
    wind: ['#ffffff', '#ccff90', '#7cb342', '#33691e'],
  }[el];
}

function elemName(elColor) {
  const [r, g, b] = rgb(elColor || '#ff7043');
  if (r > g && r > b) return 'fire';
  if (b > r && b >= g) return 'water';
  return 'wind';
}

const STEEL = ['#ffffff', '#cfd8dc', '#78909c'];

// Minh họa theo từng kỹ năng
const SKILL_ART = {
  // ---- Kiếm (Hỏa)
  k0: (P, F) => { band(F, 10, 13, 9, 3, -2.3, 0.4, ['#ffffff', '#ffffff', '#cfd8dc', '#90a4ae']); sword(P, 5, 19, 19, 5, STEEL, { w: 2 }); },
  k1: (P, F, e) => {
    flame(F, 15, 11, 4, 9, e); flame(F, 10, 15, 3, 7, e);
    sword(P, 5, 19, 19, 5, ['#fff59d', '#ffb74d', '#e64a19'], { w: 2 });
  },
  k2: (P, F, e) => {
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; flame(F, 12 + Math.cos(a) * 7, 15 + Math.sin(a) * 4, 2, 6, e); }
    sword(P, 7, 17, 17, 7, STEEL, { w: 2 });
  },
  k3: (P, F, e) => {
    speedLines(F, 3, 11, [7, 10, 13, 16], '#ffe0b2');
    band(P, 6, 12, 11, 4, -1.2, 1.2, [e[0], e[1], e[2], e[3]]);
  },
  k4: (P, F, e) => {
    flame(F, 12, 21, 9, 19, e);
    flame(F, 6, 21, 3, 9, e);
    flame(F, 18, 21, 3, 9, e);
    figure(P, 12, 21, '#bf360c', '#ff8a65');
  },
  k5: (P, F, e) => {
    flame(F, 8, 21, 3, 6, e); flame(F, 16, 21, 3, 7, e);
    meteorShape(P, 13, 12, 4.5, '#fffde7', '#ffb300', '#e64a19', '#ff7043', -1, -1);
  },
  k6: (P, F, e) => {
    for (let k = 0; k < 5; k++) flame(F, 4 + k * 4, 21, 2.5, 5 + (k % 2) * 3, e);
    meteorShape(F, 15, 9, 4, '#fffde7', '#ff5252', '#b71c1c', '#ff1744', -1, -1);
    sword(P, 6, 20, 18, 4, ['#fff59d', '#ff8a80', '#b71c1c'], { w: 2 });
  },
  // ---- Tiêu (Hỏa)
  t0: (P, F) => { speedLines(F, 2, 9, [9, 12, 15], '#ffffff'); shuri(P, 14, 12, 7, STEEL, 0.3); },
  t1: (P, F, e) => {
    flame(F, 6, 10, 2.5, 6, e); flame(F, 12, 18, 2.5, 6, e);
    speedLines(F, 2, 7, [8, 16], '#fff59d');
    shuri(P, 10, 8, 5.5, STEEL, 0.2); shuri(P, 15, 16, 5.5, STEEL, 0.6);
  },
  t2: (P, F, e) => {
    for (const [x, y] of [[6, 6], [13, 4], [18, 9]]) { F.line(x - 3, y - 4, x, y, '#ffcc80'); }
    for (let k = 0; k < 3; k++) flame(F, 6 + k * 6, 21, 2, 4, e);
    shuri(P, 7, 9, 3.5, STEEL, 0.1); shuri(P, 14, 7, 3.5, STEEL, 0.5); shuri(P, 17, 14, 3.5, STEEL, 0.9); shuri(P, 10, 15, 3.5, STEEL, 0.3);
  },
  t3: (P, F) => {
    F.disc(8, 16, 4, '#cfd8dc'); F.disc(15, 15, 5, '#b0bec5'); F.disc(12, 18, 4, '#eceff1');
    figure(P, 12, 19, '#455a64', '#78909c');
    for (let y = 6; y < 20; y += 2) P.rect(7, y, 10, 1, null);
  },
  t4: (P, F, e) => {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; F.line(12, 12, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, k % 2 ? '#ffeb3b' : '#ff7043'); }
    F.disc(12, 12, 6, '#ffb300'); F.disc(12, 12, 4, '#fff59d');
    shuri(P, 12, 12, 6, ['#ffffff', '#ff7043', '#bf360c'], 0.4);
  },
  t5: (P, F) => { netGrid(F, 12, 12, 9, '#8d2a10'); shuri(P, 12, 12, 6.5, ['#fffde7', '#ffd54f', '#b8860b'], 0.2); shuri(P, 5, 6, 2.5, STEEL); shuri(P, 19, 18, 2.5, STEEL); shuri(P, 18, 5, 2.5, STEEL); shuri(P, 6, 18, 2.5, STEEL); },
  t6: (P, F, e) => {
    for (const [x, y] of [[5, 7], [11, 4], [17, 6], [8, 13], [15, 12]]) { flame(F, x + 1, y + 3, 2, 5, e); }
    for (let k = 0; k < 5; k++) flame(F, 3 + k * 4.5, 21, 2, 5, e);
    for (const [x, y] of [[6, 9], [12, 6], [18, 9], [9, 15], [16, 15]]) shuri(P, x, y, 3, ['#ffffff', '#ffe082', '#bf360c'], x * 0.3);
  },
  // ---- Kunai (Thủy)
  n0: (P, F) => { band(F, 9, 12, 9, 3, -1.6, 0.9, ['#ffffff', '#e0f7fa', '#80deea', '#4dd0e1']); kunaiShape(P, 5, 19, 19, 5, STEEL); },
  n1: (P, F, e) => { band(F, 10, 11, 10, 4, -2.2, 0.2, e); band(F, 12, 14, 8, 3, -0.6, 1.9, e); kunaiShape(P, 6, 18, 18, 6, ['#ffffff', '#b3e5fc', '#0288d1']); },
  n2: (P, F, e) => { spiral(P, 12, 12, 9, 2.2, e[1], e[2], 2, 0); drop(P, 12, 12, 2.5, e); },
  n3: (P, F, e) => { F.disc(12, 12, 8, '#a5d6a7'); drop(P, 12, 13, 6, ['#ffffff', '#b3e5fc', '#29b6f6', '#0277bd']); plus(P, 12, 14, 3, '#43a047', '#ffffff'); },
  n4: (P, F) => {
    for (let k = 0; k < 4; k++) star4(F, 5 + k * 5, 18 - k * 4, 1, '#e1f5fe');
    kunaiShape(P, 5, 19, 19, 5, ['#ffffff', '#b3e5fc', '#4fc3f7']);
  },
  n5: (P, F, e) => { waveCurl(P, 12, 20, e); F.disc(18, 6, 2, '#e1f5fe'); },
  n6: (P, F) => { F.disc(12, 12, 9, '#b3e5fc'); snowflake(P, 12, 12, 9, '#e1f5fe', '#ffffff'); P.disc(12, 12, 2, '#80d8ff'); },
  // ---- Cung (Thủy)
  c0: (P, F) => { F.line(3, 18, 8, 13, '#ffffff'); arrow(P, 4, 20, 20, 4, '#cfd8dc'); },
  c1: (P, F, e) => { for (let k = 0; k < 8; k++) F.set(5 + k, 19 - k + Math.round(Math.sin(k) * 1.5), e[1]); drop(F, 6, 18, 2, e); arrow(P, 4, 20, 20, 4, '#29b6f6', '#a1887f', '#b3e5fc'); },
  c2: (P, F, e) => {
    ringE(F, 12, 20, 9, 2.5, e[1]);
    arrow(P, 4, 2, 7, 17, '#4fc3f7'); arrow(P, 10, 1, 13, 18, '#4fc3f7'); arrow(P, 16, 3, 19, 16, '#4fc3f7');
  },
  c3: (P, F, e) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; F.line(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, e[1]); } eye(P, 12, 12, '#29b6f6'); },
  c4: (P, F, e) => { ringE(F, 9, 12, 2, 6, e[1]); ringE(F, 15, 12, 2, 7, e[1]); arrow(P, 2, 12, 22, 12, '#e1f5fe', '#a1887f', '#ffffff'); },
  c5: (P, F, e) => {
    for (let k = 0; k < 10; k++) F.set(6 + k * 1.2 + Math.sin(k * 1.3) * 2, 3 + k * 1.3, e[1]);
    waveCurl(F, 12, 22, e);
    arrow(P, 6, 2, 15, 17, '#0288d1', '#a1887f', '#b3e5fc');
  },
  c6: (P, F, e) => { for (let y = 10; y <= 14; y++) F.line(2, y, 22, y, y === 12 ? '#ffffff' : e[1]); star4(F, 19, 12, 4, '#ffffff'); arrow(P, 3, 12, 21, 12, '#00e5ff', '#a1887f', '#e0f7fa'); },
  // ---- Đao (Phong)
  d0: (P, F) => { band(F, 10, 13, 9, 3, -2.3, 0.4, ['#ffffff', '#f1f8e9', '#c5e1a5', '#9ccc65']); daoShape(P, 5, 19, 19, 5, STEEL); },
  d1: (P, F, e) => { band(F, 11, 12, 10, 4, -2.4, 0.6, e); leafShape(F, 18, 18, 5, 0.6, ['#c5e1a5', '#7cb342', '#33691e']); daoShape(P, 5, 19, 18, 6, ['#ffffff', '#c5e1a5', '#558b2f']); },
  d2: (P, F, e) => { band(F, 12, 12, 10, 3, -3.0, 0.3, e); band(F, 12, 12, 10, 3, 0.2, 3.3, e); daoShape(P, 7, 17, 17, 7, STEEL); },
  d3: (P, F, e) => { F.disc(12, 12, 9, '#dcedc8'); shield(P, 12, 12, ['#e8f5e9', '#9ccc65', '#558b2f', '#33691e']); P.rect(11, 8, 2, 8, '#ffffff'); P.rect(9, 10, 6, 2, '#ffffff'); },
  d4: (P, F, e) => { speedLines(F, 2, 12, [6, 9, 12, 15, 18], '#ccff90'); figure(P, 15, 20, '#33691e', '#7cb342'); },
  d5: (P, F, e) => { tornado(F, 12, 21, 18, 8, ['#ffffff', '#aed581', '#558b2f']); daoShape(P, 6, 18, 18, 6, STEEL); },
  d6: (P, F, e) => {
    speedLines(F, 2, 9, [5, 9, 15, 19], '#ccff90');
    P.line(5, 5, 19, 19, '#ffffff', 2); P.line(5, 19, 19, 5, '#76ff03', 2); P.line(6, 18, 18, 6, '#ccff90');
    star4(P, 12, 12, 3, '#ffffff');
  },
  // ---- Quạt (Phong)
  q0: (P, F, e) => { band(F, 13, 12, 8, 3, -1.1, 1.1, e); fanShape(P, 9, 17, 8, ['#c5e1a5', '#7cb342', '#33691e']); },
  q1: (P, F, e) => { const W = ['#ffffff', '#f1f8e9', '#ccff90', '#7cb342']; band(P, 7, 12, 7, 3, -1.1, 1.1, W); band(P, 12, 12, 7, 3, -1.1, 1.1, W); band(P, 17, 12, 7, 3, -1.1, 1.1, W); },
  q2: (P, F, e) => { tornado(P, 12, 20, 17, 8, ['#ffffff', '#aed581', '#558b2f']); },
  q3: (P, F, e) => { F.disc(12, 12, 8, '#b9f6ca'); leafShape(P, 10, 13, 13, -0.8, ['#c8e6c9', '#66bb6a', '#1b5e20']); plus(P, 16, 16, 3, '#ffffff', '#69f0ae'); },
  q4: (P, F, e) => {
    speedLines(F, 2, 9, [9, 13, 17], '#ccff90');
    P.map(ITEM_MAPS.shoes, tierPal('#dcedc8'), 5, 3);
    P.map(['....ww', '..wwVw', '.wwVV.', 'wVVV..', '.VV...'], { w: '#ffffff', V: '#ccff90' }, 4, 5);
  },
  q5: (P, F, e) => { tornado(P, 9, 21, 17, 6, ['#ffffff', '#aed581', '#33691e']); tornado(P, 16, 21, 14, 5, ['#ffffff', '#c5e1a5', '#558b2f']); },
  q6: (P, F, e) => {
    F.disc(12, 6, 6, '#b2ff59');
    tornado(P, 12, 21, 19, 9, ['#ffffff', '#69f0ae', '#00695c']);
    P.line(16, 2, 13, 8, '#fff59d'); P.line(13, 8, 17, 9, '#fff59d'); P.line(17, 9, 14, 15, '#fff59d');
  },
  // ======== Thần kỹ hậu kỳ (cấp 100 / 130 / 160)
  // ---- Kiếm: thành lửa, cánh phượng, phượng hoàng giáng thế
  k11: (P, F, e) => {
    flame(F, 12, 15, 9, 12, e); flame(F, 6, 15, 3, 8, e); flame(F, 18, 15, 3, 8, e);
    P.map([
      'b.b.b.....b.b.b',
      'bbbbb.....bbbbb',
      'bBbBbbbbbbbBbBb',
      'bbbbbbbdbbbbbbb',
      'bBbbbbdddbbbbBb',
      'bbbbbbdddbbbbbb',
      'bbBbbbdddbbbBbb',
    ], { b: '#6d2a14', B: '#a1452a', d: '#ffb300' }, 5, 13);
    sword(P, 12, 3, 12, 15, ['#fff59d', '#ffb74d', '#e64a19'], { w: 2, guard: 3 });
  },
  k12: (P, F, e) => {
    flame(F, 15, 21, 3, 6, e); flame(F, 19, 18, 2, 5, e);
    wing(P, 9, 15, -3.05, -1.25, 5, 9, 11, ['#fff59d', '#ff6d00', '#b71c1c']);
    sword(P, 5, 20, 20, 5, STEEL, { w: 2 });
  },
  k13: (P, F, e) => {
    flame(F, 12, 22, 6, 8, e); flame(F, 7, 22, 2.5, 5, e); flame(F, 17, 22, 2.5, 5, e);
    P.map([
      'R...............R',
      'RO.............OR',
      'ROO.....rr....OOR',
      '.ROO...wYr...OOR.',
      '.RYOO.oYkY..OOYR.',
      '..RYOO.YYY.OOYR..',
      '..RRYOOYYYOOYRR..',
      '...RRYYYYYYYRR...',
      '....RRYYYYYRR....',
      '.......YYY.......',
      '......OYYYO......',
      '.....ROYYYOR.....',
      '....R.OY.YO.R....',
      '...R..O...O..R...',
      '......R...R......',
    ], { Y: '#ffd54f', O: '#ff8f00', R: '#c62828', o: '#ff6d00', w: '#fff8e1', k: OUT, r: '#ff3d00' }, 4, 4);
  },
  // ---- Tiêu: mây tiêu lửa, tam muội chân hỏa, mưa sao băng
  t11: (P, F, e) => {
    flame(F, 8, 15, 2.6, 7, e); flame(F, 16, 17, 2.6, 7, e);
    star7(P, 8, 16, STEEL); star7(P, 16, 18, STEEL);
    cloud(P, 12, 7, ['#d7ccc8', '#8d6e63', '#ff7043']);
  },
  t12: (P, F, e) => {
    ringE(F, 12, 12, 7, 7, '#fff59d'); ringE(F, 12, 12, 6, 6, '#ff6e40');
    const T = ['#ffffff', '#fff176', '#ff3d00', '#b71c1c'];
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * TAU) / 3; flame(P, 12 + Math.cos(a) * 5.5, 12 + Math.sin(a) * 5.5 + 3, 2.6, 7, T); }
    shuri(P, 12, 12, 3, STEEL, 0.3);
  },
  t13: (P, F, e) => {
    meteorShape(P, 7, 8, 1.8, '#ffffff', '#ffe082', '#ff7043', '#ffab91', 1, -1);
    meteorShape(P, 17, 19, 1.8, '#ffffff', '#ffe082', '#ff7043', '#ffab91', 1, -1);
    meteorShape(P, 10, 15, 4.8, '#fffde7', '#ffb300', '#e64a19', '#ff7043', 1, -1);
    shuri(P, 10, 15, 3.4, ['#ffffff', '#fff59d', '#bf360c'], 0.4);
  },
  // ---- Kunai: địa ngục băng, băng phách song trảm, nộ đào
  n11: (P, F, e) => {
    F.disc(12, 14, 8, '#e1f5fe');
    const I = ['#e1f5fe', '#4fc3f7', '#01579b'];
    shard(P, 12, 20, 12, 4, 3, I);
    shard(P, 9, 20, 4, 9, 2.2, I); shard(P, 15, 20, 20, 9, 2.2, I);
    shard(P, 7, 21, 3, 16, 1.6, I); shard(P, 17, 21, 21, 16, 1.6, I);
    star4(P, 12, 9, 2, '#ffffff', '#ffffff');
  },
  n12: (P, F, e) => {
    band(F, 12, 12, 10, 3, -2.6, -0.6, ['#ffffff', '#e1f5fe', '#80d8ff', '#4fc3f7']);
    band(F, 12, 12, 10, 3, 0.55, 2.55, ['#ffffff', '#e1f5fe', '#80d8ff', '#4fc3f7']);
    const B = ['#ffffff', '#b3e5fc', '#0288d1'];
    kunaiShape(P, 4, 20, 17, 7, B); kunaiShape(P, 20, 20, 7, 7, B);
    star4(P, 12, 12, 3, '#e1f5fe');
  },
  n13: (P, F, e) => {
    F.disc(12, 12, 4, '#01579b');
    const W = ['#ffffff', '#b3e5fc', '#29b6f6', '#0277bd'];
    for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3; band(P, 12 + Math.cos(a) * 3, 12 + Math.sin(a) * 3, 7, 3, a - 0.3, a + 2.2, W, 0.6); }
    P.disc(12, 12, 1.5, '#e1f5fe');
  },
  // ---- Cung: mưa tên nước, truy hồn tiễn, tên rồng nước kình thiên
  c11: (P, F, e) => {
    drop(F, 9, 19, 1.3, e); drop(F, 16, 20, 1.3, e); drop(F, 6, 13, 1, e);
    for (const [x, y] of [[13, 7], [19, 8]]) arrow(P, x, y, x - 8, y + 8, '#e1f5fe', '#a1887f', '#ffffff');
    cloud(P, 12, 7, ['#ffffff', '#90caf9', '#3f6fae']);
  },
  c12: (P, F, e) => {
    ringE(F, 16, 8, 4, 4, '#ffffff');
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) F.line(16 + dx * 5, 8 + dy * 5, 16 + dx * 6, 8 + dy * 6, '#ffffff');
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      const x = 3 + u * 6 + Math.sin(u * 8) * 1.5;
      const y = 21 - u * 6 + Math.sin(u * 8) * 1.5;
      F.rect(Math.round(x), Math.round(y), 2, 2, u > 0.6 ? '#e0f7fa' : '#4dd0e1');
    }
    arrow(P, 8, 16, 16, 8, '#00e5ff', '#e0f7fa', '#80deea');
  },
  c13: (P, F, e) => {
    for (let y = 4; y <= 18; y += 0.25) {
      const ph = y * 0.9;
      F.set(12 + Math.sin(ph) * 3.5, y, Math.cos(ph) > 0 ? '#ffffff' : '#18ffff');
      F.set(12 - Math.sin(ph) * 3.5, y, Math.cos(ph) > 0 ? '#80deea' : '#0097a7');
    }
    P.fill(3, 16, 21, 21, (x, y) => {
      const top = 18 + Math.sin(x * 0.9) * 0.8;
      if (y < top) return null;
      return y < top + 1 ? '#e0f7fa' : '#0277bd';
    });
    arrow(P, 12, 19, 12, 3, '#18ffff', '#e0f7fa', '#ffffff');
  },
  // ---- Đao: liệt địa, phong lôi, bão vạn đao
  d11: (P, F, e) => {
    F.line(3, 9, 9, 5, '#f1f8e9'); F.line(15, 4, 20, 8, '#f1f8e9');
    P.map([
      'EEEEEEcwwwcEEEEEE',
      'eeeeeecwkwceeeeee',
      'eEeeeccwkwcceeeEe',
      'eeeeecwkekwceeeee',
      'eeeecwkeeekwceeee',
      'eeeeeeeeeeeeeeeee',
    ], { E: '#a1887f', e: '#5d4037', c: '#76ff03', w: '#ccff90', k: '#1b2a10' }, 4, 15);
    band(P, 4, 5, 11, 4, -0.5, 1.25, ['#ffffff', '#ffffff', '#ccff90', '#76ff03'], 0.7);
    P.rect(5, 12, 2, 2, '#d7ccc8'); P.rect(18, 11, 2, 2, '#d7ccc8'); P.rect(16, 7, 1, 1, '#d7ccc8');
  },
  d12: (P, F, e) => {
    speedLines(F, 2, 10, [6, 10, 14, 18], '#ccff90');
    bolt(P, [[15, 2], [9, 11], [14, 11], [8, 21]], '#ffee58', '#ffffff');
    daoShape(P, 5, 19, 20, 9, ['#ffffff', '#c5e1a5', '#33691e']);
  },
  d13: (P, F, e) => {
    F.disc(12, 12, 9, '#c5e1a5'); spiral(F, 12, 12, 8, 1.6, '#ffffff', '#9ccc65', 1, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6;
      shard(P, 12 + Math.cos(a) * 2.5, 12 + Math.sin(a) * 2.5, 12 + Math.cos(a + 0.6) * 9.5, 12 + Math.sin(a + 0.6) * 9.5, 1.8, ['#ffffff', '#b0bec5', '#37474f']);
    }
    P.disc(12, 12, 2, '#76ff03');
  },
  // ---- Quạt: bách diệp phi hoa, vạn mộc trường xuân, phong vân
  q11: (P, F, e) => {
    band(F, 3, 24, 18, 3, -1.45, -0.1, ['#ffffff', '#ffffff', '#f1f8e9', '#ccff90']);
    const L = ['#f1f8e9', '#9ccc65', '#33691e'];
    leafShape(P, 7, 15, 7, -0.6, L); leafShape(P, 12, 9, 7, -0.2, L); leafShape(P, 17, 14, 6, 0.5, L);
    blossom(P, 9, 7, '#ff80ab', '#fff59d'); blossom(P, 15, 18, '#ff80ab', '#fff59d'); blossom(P, 18, 8, '#ff80ab', '#fff59d');
  },
  q12: (P, F, e) => {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; F.line(12, 9, 12 + Math.cos(a) * 10, 9 + Math.sin(a) * 10, '#ccff90'); }
    P.rect(11, 13, 3, 8, '#6d4c41'); P.rect(11, 13, 1, 8, '#a1887f'); P.set(10, 20, '#6d4c41'); P.set(14, 20, '#6d4c41');
    P.disc(12, 9, 6, '#2e7d32'); P.disc(10, 8, 4, '#43a047'); P.disc(15, 10, 3.5, '#388e3c'); P.disc(9, 7, 2, '#69f0ae');
    plus(P, 16, 15, 3, '#ffffff', '#69f0ae');
  },
  q13: (P, F, e) => {
    band(F, 12, 12, 8.6, 2, -2.4, 0.0, ['#ffffff', '#ffffff', '#ccff90', '#ccff90']);
    band(F, 12, 12, 8.6, 2, 0.74, 3.14, ['#ffffff', '#ffffff', '#ccff90', '#ccff90']);
    // thái cực: trời (sáng) và đất (tối) cuộn vào nhau
    P.fill(4, 4, 20, 20, (x, y) => {
      const dx = x - 12;
      const dy = y - 12;
      if (dx * dx + dy * dy > 6.5 * 6.5) return null;
      const top = Math.hypot(dx, dy + 3.25);
      const bot = Math.hypot(dx, dy - 3.25);
      if (top < 1.2) return '#1b5e20';
      if (bot < 1.2) return '#f1f8e9';
      const light = top < 3.25 ? true : bot < 3.25 ? false : dx < 0;
      return light ? '#f1f8e9' : '#2e7d32';
    });
  },
};

// Hình chung theo loại hiệu ứng (khi không có minh họa riêng)
function genericArt(P, F, sk, e) {
  const fx = sk.fx || {};
  switch (fx.k) {
    case 'slash': band(P, 10, 12, 9, 4, -2.3, 0.6, e); break;
    case 'proj':
      if (fx.p === 'arrow') arrow(P, 4, 20, 20, 4, e[2]);
      else if (fx.p === 'shuriken') shuri(P, 12, 12, 7, e, 0.3);
      else meteorShape(P, 13, 11, 5, e[0], e[1], e[2], e[2], -1, 0);
      break;
    case 'burst': ringE(P, 12, 12, 9, 9, e[1]); star4(P, 12, 12, 5, e[2]); break;
    case 'wave': band(P, 6, 12, 11, 4, -1.2, 1.2, e); break;
    case 'rain': for (let k = 0; k < 4; k++) P.line(5 + k * 4, 4, 8 + k * 4, 18, e[1]); break;
    case 'meteor': meteorShape(P, 13, 12, 5, e[0], e[1], e[2], e[3]); break;
    case 'whirl': tornado(P, 12, 20, 16, 8, e); break;
    case 'aura': flame(F, 12, 21, 8, 18, e); figure(P, 12, 20, '#3e2723', '#6d4c41'); break;
    case 'heal': plus(P, 12, 12, 6, '#43a047', '#ffffff'); break;
    case 'dash': speedLines(P, 3, 20, [7, 11, 15, 19], e[1]); break;
    default: star4(P, 12, 12, 6, e[1]);
  }
}

// ----- Kỹ năng nội tại: khung lục giác viền vàng đồng (kỹ năng chủ động dùng khung tròn)
const HEX_R = 11.4;
// khoảng cách lục giác đỉnh nhọn trên/dưới: bằng R đúng trên cạnh
function hexD(x, y) {
  const dx = Math.abs(x - 12);
  const dy = Math.abs(y - 12);
  return Math.max(dx / 0.866, dx * 0.577 + dy);
}

function passiveBg(el) {
  const P = new Pix(SK, SK);
  const rim = ['#4a2c0a', '#c4923a', '#ffe7a3'];
  P.fill(0, 0, SK - 1, SK - 1, (x, y) => {
    const d = hexD(x, y);
    if (d > HEX_R + 0.3) return null;
    if (d > HEX_R - 0.8) return OUT;
    if (d > HEX_R - 2) return (x - 12) + (y - 12) < 0 ? rim[2] : rim[1];
    if (d > HEX_R - 2.8) return rim[0];
    const lit = (-(x - 12) - (y - 12)) / 16;
    const t = d / (HEX_R - 2.8);
    // vân lục giác lồng nhau mờ trong nền
    if (Math.abs(d - 5.2) < 0.45) return shade(el, -0.18);
    return t < 0.5 ? shade(el, -0.22 + lit * 0.35) : shade(el, -0.48 + lit * 0.25);
  });
  // đinh tán ở 6 đỉnh
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * TAU) / 6;
    P.set(12 + Math.cos(a) * (HEX_R - 1.3), 12 + Math.sin(a) * (HEX_R - 1.3), '#fff6d0');
  }
  return P;
}

// trái tim pixel 11x10 (cols: [sáng, nhạt, chính, tối])
function heart(P, x, y, cols) {
  P.map([
    '..RRR.RRR..',
    '.RwwRRRRRR.',
    'RwwlRRRRRRd',
    'RwlRRRRRRRd',
    'RlRRRRRRRRd',
    '.RRRRRRRRd.',
    '..RRRRRRd..',
    '...RRRRd...',
    '....RRd....',
    '.....d.....',
  ], { w: cols[0], l: cols[1], R: cols[2], d: cols[3] }, x, y);
}

const HEART = ['#ffffff', '#ff8a80', '#e53935', '#8e1b1b'];
const CHAKRA = ['#ffffff', '#b3e5fc', '#29b6f6', '#01579b'];
// mũi tên tăng nhỏ ở góc: dấu hiệu "chỉ số tăng" chung cho mọi nội tại
function upMark(P, x, y, col) {
  P.map(['..w..', '.wVw.', 'wVVVw', '.VVV.', '.VVV.'], { w: '#ffffff', V: col }, x, y);
}

// Hình minh họa nội tại theo chỉ số (e: bảng màu hệ)
const PASSIVE_ART = {
  hpPct: (P, F) => { F.disc(12, 12, 8, '#ef9a9a'); heart(P, 7, 7, HEART); },
  atkPct: (P, F, e) => { flame(F, 12, 20, 5, 15, e); sword(P, 12, 21, 12, 4, ['#ffffff', '#cfd8dc', '#78909c'], { w: 2 }); },
  defPct: (P, F, e) => { F.disc(12, 12, 8, e[1]); shield(P, 12, 12, ['#ffffff', e[1], e[2], e[3]]); P.rect(11, 8, 2, 7, '#ffffff'); },
  crit: (P, F, e) => { ringE(F, 12, 12, 7.5, 7.5, e[1]); ringE(F, 12, 12, 4.5, 4.5, e[0]); star4(P, 12, 12, 7, '#ffd54f', '#ffffff'); },
  critDmg: (P, F) => {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; F.line(12, 12, 12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, k % 2 ? '#ffeb3b' : '#ff5252'); }
    F.disc(12, 12, 5, '#ff7043'); star4(P, 12, 12, 6, '#fff176', '#ffffff'); P.disc(12, 12, 1.5, '#ffffff');
  },
  dodge: (P, F, e) => { figure(F, 9, 20, e[2], e[1]); speedLines(F, 2, 8, [9, 13, 17], e[0]); figure(P, 14, 20, '#37474f', '#90a4ae'); },
  skillDmg: (P, F, e) => { F.disc(12, 12, 7, e[2]); spiral(P, 12, 12, 8, 2.3, e[0], e[1], 2, 0.4); P.disc(12, 12, 1.6, '#ffffff'); },
  resist: (P, F, e) => { ringE(F, 12, 12, 9, 9, e[0]); ringE(F, 12, 12, 8, 8, e[1]); shield(P, 12, 12, ['#ffffff', '#ffd54f', '#c49000', '#6d4815']); star4(P, 12, 11, 2, e[1], '#ffffff'); },
  mpRegen: (P, F) => { ringE(F, 12, 13, 8, 8, '#81d4fa', -2.6, 1.9); F.map(['w.', 'ww', 'w.'], { w: '#e1f5fe' }, 17, 17); drop(P, 12, 14, 4.5, CHAKRA); },
  spd: (P, F, e) => {
    speedLines(F, 2, 9, [8, 12, 16], e[0]);
    P.map(['....ww', '..wwVw', '.wwVV.', 'wVVV..', '.VV...'], { w: '#ffffff', V: e[1] }, 12, 4);
    P.map(ITEM_MAPS.shoes, tierPal(e[1]), 5, 6);
  },
};

const skillCache = new Map();
export function skillIconURL(sk, sid, elColor) {
  const key = `${sid}|${elColor}`;
  if (skillCache.has(key)) return skillCache.get(key);
  const el = elColor || '#8d6e63';
  const elN = elemName(el);
  const e = elPal(elN);
  const s = sk || {};
  const passive = s.type === 'passive';
  const divine = !passive && (s.req || 0) >= 100;
  const bg = passive ? passiveBg(el) : skillBg(el, (s.req || 0) >= 60, !!s.basic, divine);
  const F = new Pix(SK, SK); // lớp hiệu ứng (không viền)
  const P = new Pix(SK, SK); // lớp hình chính (có viền)
  const art = passive ? PASSIVE_ART[s.pas && s.pas.stat] : SKILL_ART[sid];
  if (art) art(P, F, e);
  else genericArt(P, F, s, e);
  P.outline(OUT);
  // cắt theo phần trong khung (tròn hoặc lục giác)
  // thần kỹ cắt theo đúng tâm nền và hẹp hơn để hình không đè vòng kim trong
  const inside = passive ? (x, y) => hexD(x, y) <= HEX_R - 2.6
    : divine ? (x, y) => (x - 12.5) ** 2 + (y - 12.5) ** 2 <= 8 * 8
      : (x, y) => (x - 12) ** 2 + (y - 12) ** 2 <= 9.3 * 9.3;
  const clip = (L) => {
    for (let y = 0; y < SK; y++) {
      for (let x = 0; x < SK; x++) {
        if (!inside(x + 0.5, y + 0.5)) L.d[(y * SK + x) * 4 + 3] = 0;
      }
    }
  };
  clip(F);
  clip(P);
  bg.over(F);
  bg.over(P);
  if (passive) {
    // huy hiệu mũi tên tăng đè lên góc khung, nằm ngoài vùng cắt
    const M = new Pix(SK, SK);
    upMark(M, 18, 1, '#69f0ae');
    M.outline(OUT);
    bg.over(M);
  }
  const u = bg.canvas().toDataURL();
  skillCache.set(key, u);
  return u;
}
