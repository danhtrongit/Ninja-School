// Hình pixel phụ trợ: vòng, đường, chùm tia, bùa chú, chữ nổ, đá, lấp lánh.
import { shade } from '../sprites.js';
import { TAU, R0, mkCanvas, rgb } from './util.js';
import { outlineImg } from './sprites.js';

// Lá cây xoay 4 khung
export const LEAF_SHAPES = [
  [[0, 0, 0], [1, 0, 1], [2, 0, 2], [1, -1, 1]],
  [[0, 0, 0], [1, 1, 1], [2, 2, 2], [1, 0, 1]],
  [[0, 0, 0], [0, 1, 1], [0, 2, 2], [1, 1, 1]],
  [[0, 0, 0], [1, -1, 1], [2, -2, 2], [2, -1, 1]],
];

// ================= TIỆN ÍCH VẼ =================
export function ringPx(ctx, cx, cy, rx, ry, w, h, a0 = 0, a1 = TAU, step = 1.6) {
  // vòng kín: tô theo hàng giữa elip ngoài và elip trong -> liền nét, không chồng alpha ở bán kính lớn
  if (a1 - a0 >= TAU - 1e-3 && rx >= 3) {
    ringRows(ctx, R0(cx), R0(cy), rx, ry, w, h);
    return;
  }
  const n = Math.max(10, Math.min(2000, R0(((rx + ry) * Math.PI * ((a1 - a0) / TAU)) / step)));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    ctx.fillRect(R0(cx + Math.cos(a) * rx - w / 2), R0(cy + Math.sin(a) * ry - h / 2), w, h);
  }
}

export function linePx(ctx, x0, y0, x1, y1, w = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) ctx.fillRect(R0(x0 + (dx * i) / n), R0(y0 + (dy * i) / n), w, w);
}

// Cột sáng cao H (sprite cùng chiều cao, không co giãn dọc); đoạn 40px cuối (vùng thân nhân vật) mờ hơn
// để vẫn đọc được nhân vật bên trong cột
export function bodyBeam(ctx, img, x, yFoot, bw, a, bodyA) {
  const H = img.height;
  const top = yFoot + 2 - H;
  const cut = H - 42;
  const dx = x - (bw >> 1);
  ctx.globalAlpha = a;
  ctx.drawImage(img, 0, 0, img.width, cut, dx, top, bw, cut);
  ctx.globalAlpha = a * bodyA;
  ctx.drawImage(img, 0, cut, img.width, 42, dx, top + cut, bw, 42);
}

// Viền elip dày w (ngang) x h (dọc), mỗi hàng tối đa 2 fillRect
function ringRows(ctx, cx, cy, rx, ry, w, h) {
  const ox = rx + w / 2;
  const oy = Math.max(0.5, ry + h / 2);
  const ix = rx - w / 2;
  const iy = ry - h / 2;
  const n = Math.ceil(oy);
  for (let dy = -n; dy <= n; dy++) {
    const v = dy / oy;
    if (v * v >= 1) continue;
    const ho = R0(ox * Math.sqrt(1 - v * v));
    const u = iy > 0.5 ? dy / iy : 2;
    const hi = u * u < 1 ? R0(ix * Math.sqrt(1 - u * u)) : -1;
    if (hi < 0 || ho - hi < 1) ctx.fillRect(cx - ho, cy + dy, ho * 2 + 1, 1);
    else {
      ctx.fillRect(cx - ho, cy + dy, ho - hi, 1);
      ctx.fillRect(cx + hi + 1, cy + dy, ho - hi, 1);
    }
  }
}

// Elip đặc tô theo từng hàng (1 fillRect/hàng, không chồng alpha)
export function fillEllipse(ctx, cx, cy, rx, ry) {
  if (rx < 0.5 || ry < 0.5) return;
  const n = Math.ceil(ry);
  for (let dy = -n; dy <= n; dy++) {
    const v = dy / (ry + 0.5);
    if (v * v >= 1) continue;
    const hw = R0(rx * Math.sqrt(1 - v * v));
    ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

export const SPRITE_OUTLINE = '#1d1424';

// Chữ phù văn 5x5 tự thiết kế (lên cấp, cường hóa, triệu hồi)
const RUNES = [
  ['#####', '..#..', '.###.', '..#..', '.#.#.'],
  ['#####', '....#', '.##.#', '.#..#', '.####'],
  ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  ['#.#.#', '#.#.#', '#####', '..#..', '..#..'],
  ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'],
  ['###..', '..#..', '..###', '..#..', '###..'],
  ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  ['..#..', '.###.', '#.#.#', '..#..', '#####'],
];
const runeCache = new Map();
export function runeSprite(c, i) {
  const key = `${c}|${i}`;
  let cv = runeCache.get(key);
  if (cv) return cv;
  const m = RUNES[i % RUNES.length];
  cv = mkCanvas(7, 7);
  const g = cv.getContext('2d');
  const img = g.createImageData(7, 7);
  const lit = rgb(shade(c, 0.55));
  const mid = rgb(c);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (m[y][x] !== '#') continue;
      // ánh sáng trên-trái: điểm có ô trống phía trên hoặc bên trái sáng hơn
      const edge = y === 0 || x === 0 || m[y - 1][x] !== '#' || m[y][x - 1] !== '#';
      const col = edge ? lit : mid;
      const k = ((y + 1) * 7 + x + 1) * 4;
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  }
  outlineImg(img, 7, 7, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  runeCache.set(key, cv);
  return cv;
}

// Dấu "!" cảnh báo chiêu boss
const bangCache = new Map();
export function bangSprite(c) {
  let cv = bangCache.get(c);
  if (cv) return cv;
  const m = ['LMM', 'LMM', 'LMD', 'LMD', 'MMD', '...', 'LMD', 'MDD'];
  const pal = { L: shade(c, 0.6), M: c, D: shade(c, -0.3) };
  cv = mkCanvas(5, 10);
  const g = cv.getContext('2d');
  const img = g.createImageData(5, 10);
  m.forEach((row, y) => {
    for (let x = 0; x < 3; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = rgb(pal[ch]);
      const k = ((y + 1) * 5 + x + 1) * 4;
      img.data[k] = col[0];
      img.data[k + 1] = col[1];
      img.data[k + 2] = col[2];
      img.data[k + 3] = 255;
    }
  });
  outlineImg(img, 5, 10, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  bangCache.set(c, cv);
  return cv;
}

// Mảnh đá vỡ (viền tối, sáng trên-trái), 2 cỡ
const ROCK_SHAPES = {
  3: ['.ooo.', 'oLLMo', 'oLMDo', 'oMDDo', '.ooo.'],
  4: ['.oooo.', 'oLLLMo', 'oLMMDo', 'oMMDDo', '.oDDDo', '..ooo.'],
};
const rockCache = new Map();
export function rockSprite(c, s) {
  const key = `${c}|${s}`;
  let cv = rockCache.get(key);
  if (cv) return cv;
  const m = ROCK_SHAPES[s] || ROCK_SHAPES[3];
  const pal = { o: SPRITE_OUTLINE, L: shade(c, 0.35), M: c, D: shade(c, -0.3) };
  cv = mkCanvas(m[0].length, m.length);
  const g = cv.getContext('2d');
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      g.fillStyle = pal[row[x]];
      g.fillRect(x, y, 1, 1);
    }
  });
  rockCache.set(key, cv);
  return cv;
}

// Sao lấp lánh 4 cánh có viền tối (thời trang), n = độ dài cánh 1..3
const twkCache = new Map();
export function twinkleSprite(c, n) {
  const key = `${c}|${n}`;
  let cv = twkCache.get(key);
  if (cv) return cv;
  const S = n * 2 + 3;
  const m = n + 1;
  cv = mkCanvas(S, S);
  const g = cv.getContext('2d');
  const img = g.createImageData(S, S);
  const put = (x, y, col) => {
    const k = (y * S + x) * 4;
    img.data[k] = col[0];
    img.data[k + 1] = col[1];
    img.data[k + 2] = col[2];
    img.data[k + 3] = 255;
  };
  const mid = rgb(c);
  const lit = rgb(shade(c, 0.5));
  for (let i = 1; i <= n; i++) {
    // cánh trên và trái sáng hơn (ánh sáng trên-trái)
    put(m, m - i, i === 1 ? lit : mid);
    put(m - i, m, i === 1 ? lit : mid);
    put(m, m + i, mid);
    put(m + i, m, mid);
  }
  if (n >= 3) {
    put(m - 1, m - 1, lit);
    put(m + 1, m + 1, mid);
  }
  put(m, m, [255, 255, 255]);
  outlineImg(img, S, S, SPRITE_OUTLINE);
  g.putImageData(img, 0, 0);
  twkCache.set(key, cv);
  return cv;
}

// Màu cường hóa theo mốc +, khớp bảng độ hiếm
export function plusColor(plus) {
  if (plus >= 13) return '#ff8a3c';
  if (plus >= 9) return '#c77dff';
  if (plus >= 5) return '#ffd23c';
  return '#5ab4ff';
}
