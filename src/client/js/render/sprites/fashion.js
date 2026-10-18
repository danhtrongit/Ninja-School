// Thời trang: mặt nạ, áo choàng, trang phục (mã hình do server gửi theo vật phẩm đang mặc).
import { C, sh } from './color.js';
import { px, stamp } from './pixbuf.js';

// ================= THỜI TRANG =================
// Mã hình (look.mask/cloak/costume/mount) do server gửi theo vật phẩm đang mặc (src/shared/data/items.js FASHION).
export const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

// Mặt nạ: bản đồ ký tự gốc (hx - 3, hy - 26), vẽ đè lên mặt sau tóc và băng trán.
// W nền, w nền tối, R/r màu vẽ, k khe mắt, Y mắt vàng, I sừng, G viền vàng, d dây buộc
export const MASKS = {
  fox: {
    pal: { W: 0xf6f2ea, w: 0xc8c0b8, R: 0xd8323c, r: 0x8e1b2a, k: 0x1d1424, d: 0xa8282e },
    rows: [
      '...r....r..',
      '..rW...rW..',
      '..WWWWWWWW.',
      '.wWRWWWRWW.',
      '.wWkkWWkkW.',
      '.wRWWWWRWWW',
      '.wWWWWWWWWW',
      '..wWWWWWWkW',
      '..wwWRRWw..',
      '...wwwWw...',
    ],
  },
  oni: {
    pal: { W: 0xf4e8d0, R: 0xc62828, r: 0x7a1414, k: 0x1d1424, Y: 0xffd54a, I: 0xf4ead8, w: 0xbfb09a, d: 0x3a2a3e },
    rows: [
      '..I......I.',
      '..Iw....Iw.',
      '..RRRRRRRR.',
      '.rRkkRRkkRR',
      '.rRYkRRYkRR',
      '.rRRRRRRRRR',
      '.rRRRRRRrRR',
      '..rkWkkWkr.',
      '..rrRRRRr..',
      '...rrrrr...',
    ],
  },
  tengu: {
    pal: { W: 0xffffff, w: 0xd8d4dc, R: 0xd32f2f, r: 0x8a1c1c, k: 0x1d1424, G: 0xf2c230, d: 0x3a2a3e },
    rows: [
      '...........',
      '...........',
      '..WWWW.WWW.',
      '.rRWWRRWWRR',
      '.rRkGRRkGRR',
      '.rRRRRRRRRRRRR',
      '.rRRRRRRRRRRRr',
      '..rRWWWWRR.',
      '..rrRWWRrr.',
      '...rrrrr...',
    ],
  },
};

export function drawFashionMask(P, sp, hx, hy) {
  const m = MASKS[sp.fmask];
  stamp(hx - 3, hy - 26, m.rows, m.pal);
  // dây buộc vòng ra sau đầu
  const d = m.pal.d;
  px(hx - 4, hy - 22, d); px(hx - 5, hy - 22, d); px(hx - 6, hy - 21, d); px(hx - 7, hy - 21, sh(d, 0.25));
}

// Áo choàng: c màu chính, l lớp lót (lộ ra khi bay), t viền, pat hoa văn
export const CLOAKS = {
  wind: { c: '#2e9d8f', l: '#e8f5e9', t: '#f2f6f0', pat: 'cloud' },
  night: { c: '#2c3170', l: '#8e63d8', t: '#c5cae9', pat: 'stars' },
  flame: { c: '#b3201c', l: '#ffb300', t: '#ffd54f', pat: 'flame' },
  snow: { c: '#eef3f8', l: '#90caf9', t: '#ffffff', pat: 'fur' },
};

// Bay ngược hướng chạy: đứng yên buông dài gần chạm đất, chạy thì tung ra sau và lên, nhảy thì hất lên cao
export function drawCloak(P, sp, ux, by, p) {
  const k = sp.ck;
  const fly = p.moving;
  const jump = p.scarf === 'jump';
  const ph = p.flap || 0;
  const bot = jump ? -7 : fly ? -3 : -2;
  for (let y = -16; y <= bot; y++) {
    const r = y + 16;
    let xl;
    let yy = y;
    if (jump) {
      xl = -6 - Math.round(r * 0.7) - (r > 4 ? ph : 0);
      yy = y - Math.round(r * 0.6);
    } else if (fly) {
      xl = -6 - Math.round(r * 0.6) - (r > 5 ? ph : 0);
      if (r > 5) yy = y - Math.round((r - 5) * 0.3);
    } else {
      xl = -6 - Math.round(r / 3) - (r > 9 ? ph : 0);
    }
    for (let x = xl; x <= -2; x++) {
      let c = x === xl ? k.d : x === xl + 1 && (fly || jump) ? k.l : x >= -3 ? k.d : k.c;
      if (y === bot) c = x === xl ? k.d : k.t;
      else if (y === bot - 1 && x > xl) c = sh(k.c, -0.12);
      // hoa văn
      if (k.pat === 'stars' && y < bot - 1 && x > xl + 1 && x < -3 && ((x * 7 + r * 5) & 15) === 3) c = k.l;
      if (k.pat === 'cloud' && y === bot - 2 && x > xl && ((x - xl) % 4 === 1)) c = k.t;
      if (k.pat === 'cloud' && y === bot - 1 && x > xl && ((x - xl) % 4 !== 3)) c = sh(k.t, -0.12);
      if (k.pat === 'flame' && y >= bot - 2 && y < bot && x > xl && ((x - xl + (bot - y)) % 3 === 0)) c = y === bot - 1 ? k.t : k.l;
      px(ux + x, by + yy, c);
    }
    // lưỡi lửa liếm dưới mép áo
    if (k.pat === 'flame' && y === bot) {
      for (let x = xl + 1; x <= -3; x += 2) px(ux + x, by + yy + 1 + ((x + ph) & 1), (x & 2) ? k.l : k.t);
    }
  }
}

// Phần áo choàng phía trước: quai vai và khuy cài; Tuyết Hồ thêm cổ lông
export function drawCloakFront(P, sp, ux, by) {
  const k = sp.ck;
  px(ux - 3, by - 16, k.c); px(ux - 2, by - 16, k.d); px(ux - 3, by - 15, k.d);
  if (k.pat === 'fur') {
    for (let x = -4; x <= 3; x++) px(ux + x, by - 16, (x & 1) ? 0xffffff : 0xdde6ee);
    px(ux - 4, by - 15, 0xdde6ee); px(ux - 5, by - 16, 0xffffff); px(ux + 4, by - 16, 0xdde6ee);
  }
  px(ux + 3, by - 15, k.t); px(ux + 4, by - 15, sh(k.t, -0.3));
}

// Trang phục: thay màu áo/quần/viền và vẽ hoa văn riêng; at/pt = mức chi tiết (vai giáp, nẹp, giáp gối)
export const COSTUMES = {
  sakura: { o: '#f48fb1', p: '#9c2a5c', t: '#fff0f5', u: '#ffe4ee', w: '#fff0f5', g: '#ad1457', at: 3, pt: 2, pat: 'petal', a: '#ffffff', b: '#e91e63' },
  ocean: { o: '#1e88e5', p: '#0d3c78', t: '#e3f2fd', u: '#bbdefb', w: '#e3f2fd', g: '#0d3c78', at: 3, pt: 3, pat: 'wave', a: '#e3f2fd', b: '#64b5f6' },
  shadow: { o: '#30303e', p: '#1e1e28', t: '#8e6cc8', u: '#121218', w: '#3a3a4a', g: '#1e1e28', at: 4, pt: 4, pat: 'strap', a: '#5a4a7a', b: '#b39ddb' },
  dragon: { o: '#c0262a', p: '#4a0d10', t: '#ffd54a', u: '#ffe9a8', w: '#ffd54a', g: '#5a1010', at: 8, pt: 7, pat: 'scale', a: '#ffd54a', b: '#ff8f00', rare: true },
};

export function drawCostume(P, sp, ux, by) {
  const cs = sp.cs;
  const A = C(cs.a);
  const B = C(cs.b);
  const X = ux;
  const Y = by;
  if (cs.pat === 'petal') {
    // cánh hoa anh đào rải trên áo
    for (const [x, y] of [[-3, -13], [2, -12], [-1, -10], [3, -8], [-4, -7]]) {
      px(X + x, Y + y, A); px(X + x + 1, Y + y, B); px(X + x, Y + y + 1, B);
    }
  } else if (cs.pat === 'wave') {
    // sóng nước dọc vạt áo
    for (let x = -5; x <= 5; x++) px(X + x, Y - 8 + ((x & 2) ? 1 : 0), (x & 1) ? A : B);
    px(X - 3, Y - 12, B); px(X - 2, Y - 13, A); px(X - 1, Y - 12, B);
  } else if (cs.pat === 'strap') {
    // dây đai chéo ngực của dạ hành nhân, khóa kim loại
    for (let i = 0; i < 6; i++) px(X - 3 + i, Y - 15 + i, i === 3 ? B : A);
    px(X, Y - 12, B); px(X + 1, Y - 12, 0xe0e0f0);
  } else if (cs.pat === 'scale') {
    // ngọc rồng vàng trước ngực, vảy vàng dọc vạt áo
    stamp(X - 3, Y - 14, ['.AA.', 'ABBA', 'ABBA', '.AA.'], { A, B });
    px(X - 2, Y - 13, 0xffffff);
    for (let x = -5; x <= 5; x += 2) { px(X + x, Y - 8, A); px(X + x + 1, Y - 7, B); }
  }
}
