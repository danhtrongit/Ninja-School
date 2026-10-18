// Sprite không khí: sương, tia nắng, sao đêm, ánh nước, cầu ao, hoa anh đào, cá koi.
import { rng, clamp, rgbOf, shd, Buf, blit, cached, TAU } from './util.js';
import { sprProp } from './props.js';

export function vGrad(col, a0, a1, n = 64) {
  return cached(`vg:${col}:${a0}:${a1}`, () => {
    const b = new Buf(1, n);
    for (let y = 0; y < n; y++) b.a(0, y, col, a0 + (a1 - a0) * (y / (n - 1)));
    return b;
  }).canvas;
}
export function pillarSpr(col) {
  return cached(`pil:${col}`, () => {
    const b = new Buf(30, 110);
    for (let y = 0; y < 110; y++) for (let x = 0; x < 30; x++) {
      const dx = (x - 14.5) / 11;
      const fy = y / 110;
      const al = Math.exp(-dx * dx * 2.2) * Math.pow(fy, 1.3) * 0.9;
      if (al > 0.02) b.a(x, y, Math.abs(dx) < 0.25 ? '#ffffff' : col, Math.round(al * 6) / 6);
    }
    return b;
  }).canvas;
}
export function padSpr(col) {
  return cached(`pad:${col}`, () => {
    const s = new Buf(40, 9);
    s.ell(20, 5, 19, 4, '#5e5a64');
    s.ell(20, 4, 18, 3.4, '#8e8a96');
    s.ell(20, 4, 14, 2.4, '#a8a4b0');
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      s.p(20 + Math.cos(a) * 15.5, 4 + Math.sin(a) * 2.6, k % 2 ? col : '#ffffff');
    }
    s.ell(20, 4, 6, 1.2, col);
    return s.outline(0.5);
  });
}
export function signSpr(dir) {
  return cached(`sign:${dir}`, () => {
    const s = new Buf(24, 30);
    s.r(11, 8, 2, 22, '#6d4c41');
    s.r(11, 8, 1, 22, '#8d6e63');
    s.r(2, 4, 20, 10, '#b08a5a');
    s.r(2, 4, 20, 1, '#d8b07a');
    s.r(2, 13, 20, 1, '#7a5a3a');
    const c = '#4e342e';
    if (dir < 0) { s.r(6, 8, 12, 2, c); s.r(7, 7, 1, 4, c); s.r(6, 8, 1, 2, c); s.r(8, 6, 1, 6, c); }
    else { s.r(6, 8, 12, 2, c); s.r(16, 7, 1, 4, c); s.r(15, 6, 1, 6, c); }
    return s.outline(0.5);
  }).canvas;
}
export function fogSpr() {
  return cached('fog', () => {
    const b = new Buf(512, 56, true);
    const R = rng(77);
    for (let i = 0; i < 26; i++) {
      const cx = R() * 512;
      const cy = 20 + R() * 20;
      const rx = 30 + R() * 50;
      const ry = 8 + R() * 10;
      for (let y = Math.floor(cy - ry); y < cy + ry; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1) b.a(x, y, '#eef2f6', (1 - d) * 0.22);
      }
    }
    return b;
  }).canvas;
}
export function raysSpr(col = '#fffadc') {
  return cached(`rays:${col}`, () => {
    const rc = rgbOf(col).join(',');
    const cv = document.createElement('canvas');
    cv.width = 320;
    cv.height = 260;
    const c = cv.getContext('2d');
    const R = rng(5);
    for (let i = 0; i < 4; i++) {
      const x = 30 + i * 80 + R() * 30;
      const w = 14 + R() * 26;
      const g = c.createLinearGradient(0, 0, 0, 260);
      g.addColorStop(0, `rgba(${rc},0.9)`);
      g.addColorStop(1, `rgba(${rc},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + w, 0);
      c.lineTo(x + w - 70, 260);
      c.lineTo(x - 70 - w * 0.5, 260);
      c.fill();
    }
    return { canvas: cv };
  }).canvas;
}

// Sao đêm vẽ sẵn (dải lặp ngang, nền trong suốt)
export function nightStars() {
  return cached('nstars', () => {
    const b = new Buf(512, 150, true);
    const R = rng(91);
    for (let i = 0; i < 130; i++) {
      const x = (R() * 512) | 0;
      const y = (Math.pow(R(), 1.3) * 150) | 0;
      b.a(x, y, R() < 0.2 ? '#ffe8c0' : '#ffffff', 0.5 + R() * 0.5);
      if (R() < 0.1) { b.a(x - 1, y, '#ffffff', 0.4); b.a(x + 1, y, '#ffffff', 0.4); b.a(x, y - 1, '#ffffff', 0.4); b.a(x, y + 1, '#ffffff', 0.4); }
    }
    return b;
  }).canvas;
}
// Vân sáng mặt nước nhìn từ dưới lên (long cung)
export function causticSpr() {
  return cached('caustic', () => {
    const b = new Buf(256, 30, true);
    for (let k = 0; k < 3; k++) {
      const ph = k * 2.1;
      for (let x = 0; x < 256; x++) {
        const y = Math.round(8 + k * 6 + Math.sin((x / 256) * TAU * (3 + k) + ph) * 3 + Math.sin((x / 256) * TAU * 11 + ph * 2) * 1.5);
        b.a(x, y, '#e8ffff', 0.55 - k * 0.12);
        if ((x + k) % 3 === 0) b.a(x, y + 1, '#bff6ff', 0.3);
      }
    }
    return b;
  }).canvas;
}

// Cầu cong đỏ (taikobashi) bắc qua hồ cá koi viền đá
export function pondBridgeSpr() {
  return cached('pondbridge', () => {
    const s = new Buf(66, 28);
    // hồ: viền đá, nước, cá koi, lá súng
    s.ell(33, 24, 31, 4, '#7a766e');
    s.ell(33, 23.5, 30, 3.5, '#b4b0a8');
    s.ell(33, 24, 27, 2.6, '#2e7aa8');
    s.r(14, 23, 10, 1, '#7ac8ec'); s.r(40, 25, 8, 1, '#7ac8ec');
    s.r(19, 25, 3, 1, '#ff7a30'); s.p(22, 25, '#ffffff'); s.r(44, 23, 3, 1, '#ffffff'); s.p(47, 23, '#ff7a30');
    s.r(10, 24, 3, 1, '#5aa04a'); s.p(11, 23, '#7ac85a'); s.r(52, 24, 3, 1, '#5aa04a'); s.p(53, 23, '#ffb0c8');
    for (let x = 4; x < 62; x += 5) s.p(x, 21 + ((x * 3) % 2), '#d8d4cc');
    // cầu cong: mặt cầu, dầm dưới, lan can, trụ đầu có nắp vàng
    const yAt = (x) => 21 - Math.sin(Math.PI * clamp((x - 6) / 54, 0, 1)) * 12;
    for (let x = 6; x <= 60; x++) {
      const y = Math.round(yAt(x));
      s.r(x, y, 1, 3, '#c8302a'); s.p(x, y, '#ec6a4a'); s.p(x, y + 3, '#6e1a14');
      s.p(x, y - 5, '#c8302a'); s.p(x, y - 6, '#ec6a4a');
    }
    for (let x = 8; x <= 58; x += 10) {
      const y = Math.round(yAt(x));
      s.r(x, y - 6, 1, 6, '#a8261e');
      if (x === 8 || x === 58) { s.r(x - 1, y - 8, 3, 2, '#ffd54f'); s.p(x, y - 9, '#fff2a0'); }
    }
    s.r(6, 21, 2, 6, '#8a2a1e'); s.r(58, 21, 2, 6, '#8a2a1e');
    return s.outline();
  });
}

// Lớp gần vườn anh đào: suối nhỏ có cầu cong đỏ và đèn đá (vẽ trước hàng cây)
export function sakuraStream(b, R, gy) {
  const W = b.w;
  for (let k = 0; k < 2; k++) {
    const x0 = Math.floor((k * W) / 2 + 60 + R() * (W / 2 - 200));
    const ww = 90 + Math.floor(R() * 40);
    for (let x = x0; x < x0 + ww; x++) {
      const e = Math.min(x - x0, x0 + ww - x);
      const d = Math.min(4, e >> 2);
      for (let y = 0; y <= d; y++) b.p(x, gy + 1 + y, y === 0 ? '#9ad4ee' : y < 2 ? '#5aa6d4' : '#3a86b8');
    }
    const br = pondBridgeSpr();
    blit(b, br, x0 + ww / 2 - br.w / 2, gy + 4 - br.h, { haze: '#e8c8d8', amt: 0.22 });
  }
  for (let i = 0; i < 4; i++) {
    const sp = sprProp('stonelantern', 0, 'sakura');
    blit(b, sp, R() * W, gy + 3 - sp.h, { haze: '#e8c8d8', amt: 0.24 });
  }
}

// Cờ cá chép (đen, đỏ, xanh): miệng tròn, mắt, vảy, đuôi chẻ, viền tối
export const KOI = [['#2a2a3e', '#6a6a8e', 26], ['#d8302a', '#ff9a7a', 22], ['#2e6ad8', '#9ac0ff', 18]];
export function koiSpr(c1, c2, L) {
  return cached(`koi:${c1}:${L}`, () => {
    const s = new Buf(L, 9);
    const O = '#1d1424';
    for (let i = 0; i < L; i++) {
      const k = i - (L - 4);
      if (k >= 0) {
        // đuôi chẻ hai thùy
        const t0 = Math.max(0, 1 - (k >> 1));
        for (let y = t0; y <= 3; y++) s.p(i, y, y === t0 || (k === 3 && y > t0) ? O : y === 3 && k > 0 ? O : c1);
        for (let y = 5; y <= 8 - t0; y++) s.p(i, y, y === 8 - t0 || (k === 3 && y < 8 - t0) ? O : y === 5 && k > 0 ? O : c2);
        if (k === 0) s.p(i, 4, c1);
        continue;
      }
      const top = i < 2 ? 0 : i === L - 5 ? 2 : 1;
      const bot = 8 - top;
      for (let y = top; y <= bot; y++) {
        let c = y >= bot - 2 ? c2 : c1;
        if (i > 6 && y > top + 1 && y < bot - 2 && (i + (y & 1) * 2) % 4 === 0) c = c2;
        if (i < 2) c = i === 0 && y > top && y < bot ? '#f4f0e8' : '#c8c0b0';
        s.p(i, y, y === top || y === bot ? O : c);
      }
    }
    s.p(0, 4, '#3a2a30');
    s.r(4, 2, 2, 2, '#ffffff'); s.p(5, 3, '#101018'); s.p(3, 2, O); s.p(3, 3, O);
    s.r(6, 6, 2, 1, shd(c2, 0.3));
    return s;
  }).canvas;
}

// Cá nhỏ bơi xa ở long cung: 10x5, 2 khung vẫy đuôi, d = hướng bơi
export function fishSpr(d, fr) {
  return cached(`fish:${d}:${fr}`, () => {
    const s = new Buf(10, 5);
    const rows = fr
      ? ['.....ooo..', 'o..oobbbo.', 'tooobbbbeo', 'o..olllllo', '.....ooo..']
      : ['.....ooo..', '...oobbbo.', 'ttoobbbbeo', '...olllllo', '.....ooo..'];
    const pal = { o: '#163c56', b: '#4e98b4', l: '#b8e6ee', e: '#0a1622', t: '#2a6a88' };
    for (let j = 0; j < 5; j++) for (let i = 0; i < 10; i++) {
      const c = pal[rows[j][d > 0 ? i : 9 - i]];
      if (c) s.p(i, j, c);
    }
    return s;
  }).canvas;
}
