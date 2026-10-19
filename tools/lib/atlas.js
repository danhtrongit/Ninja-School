'use strict';

// Kiểm atlas ảnh ×3 (DESIGN_RULES mục 11): src/client/art/<nhóm>/<id>.png + .json
// checkAtlas(pngBuf, meta, { maxColors, maxBytes }) → danh sách lỗi (rỗng = hợp lệ)
const { decodePng } = require('./png');

const OUTLINE = [0x1d, 0x14, 0x24];
// số khung mỗi hoạt ảnh của quái/boss [ít nhất, nhiều nhất]
const MONSTER_ANIMS = { idle: [8, 8], walk: [8, 8], atk: [10, 14], hit: [6, 6], die: [16, 18] };

// Hàng trên cùng có pixel đặc trong ô (cx, cy) cỡ fw × fh; ô trống trả -1
function topRow(img, cx, cy, fw, fh) {
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) if (img.data[((cy + y) * img.w + cx + x) * 4 + 3]) return y;
  }
  return -1;
}

function bottomRow(img, cx, cy, fw, fh) {
  for (let y = fh - 1; y >= 0; y--) {
    for (let x = 0; x < fw; x++) if (img.data[((cy + y) * img.w + cx + x) * 4 + 3]) return y;
  }
  return -1;
}

function checkAtlas(png, meta, opts = {}) {
  const errs = [];
  const maxColors = opts.maxColors || 40;
  const spec = opts.anims || MONSTER_ANIMS;
  if (opts.maxBytes && png.length > opts.maxBytes) errs.push(`PNG ${(png.length / 1024).toFixed(1)}KB > trần ${(opts.maxBytes / 1024).toFixed(1)}KB`);
  for (const k of ['fw', 'fh', 'foot', 'h', 'anims']) if (meta[k] == null) errs.push(`JSON thiếu khóa ${k}`);
  if (errs.length) return errs;
  const { fw, fh, foot, h, anims } = meta;
  if (![fw, fh, foot, h].every((v) => Number.isInteger(v) && v > 0)) return errs.concat('fw, fh, foot, h phải là số nguyên dương');
  if (fw % 2) errs.push(`fw = ${fw} phải chẵn (gốc giữa chân rơi đúng pixel)`);
  if (foot > fh) errs.push(`foot = ${foot} vượt fh = ${fh}`);
  if (h % 3) errs.push(`h = ${h} phải chia hết cho 3 (monsterHeight = h / 3 đơn vị thế giới)`);
  let img;
  try {
    img = decodePng(png);
  } catch (e) {
    return errs.concat(`PNG không đọc được: ${e.message}`);
  }
  const rows = new Set();
  for (const [name, [lo, hi]] of Object.entries(spec)) {
    const an = anims[name];
    if (!an) { errs.push(`thiếu hoạt ảnh ${name}`); continue; }
    if (!Number.isInteger(an.row) || an.row < 0 || (an.row + 1) * fh > img.h) errs.push(`${name}: hàng ${an.row} nằm ngoài ảnh`);
    if (rows.has(an.row)) errs.push(`${name}: trùng hàng ${an.row}`);
    rows.add(an.row);
    if (!Number.isInteger(an.n) || an.n < lo || an.n > hi) errs.push(`${name}: ${an.n} khung, cần ${lo === hi ? lo : `${lo}-${hi}`}`);
    if (!(an.dur > 0)) errs.push(`${name}: dur phải > 0 (giây cho cả hoạt ảnh)`);
    if (typeof an.loop !== 'boolean') errs.push(`${name}: thiếu loop`);
    if (an.n * fw > img.w) errs.push(`${name}: ${an.n} khung × ${fw} rộng hơn ảnh ${img.w}`);
    if (an.pts && an.pts.length !== an.n) errs.push(`${name}: pts có ${an.pts.length} phần tử, cần ${an.n}`);
    if (name === 'atk' && !(Number.isInteger(an.hitF) && an.hitF >= 1 && an.hitF < an.n - 1)) errs.push('atk: thiếu khung ra đòn hitF (1..n-2)');
    if (errs.length) continue;
    for (let i = 0; i < an.n; i++) {
      const b = bottomRow(img, i * fw, an.row * fh, fw, fh);
      if (b < 0) errs.push(`${name}: khung ${i} trống`);
      else if (b >= foot && name !== 'die') errs.push(`${name}: khung ${i} có pixel dưới chân (hàng ${b} ≥ foot ${foot})`);
    }
  }
  if (errs.length) return errs;
  const vis = foot - topRow(img, 0, anims.idle.row * fh, fw, fh);
  if (vis !== h) errs.push(`chiều cao hình đứng (khung idle 0) ${vis} ≠ h = ${h}`);
  // màu, alpha nhị phân, viền ngoài
  const colors = new Set();
  let semi = 0;
  let badEdge = 0;
  const D = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < img.w && y < img.h && D[(y * img.w + x) * 4 + 3] > 0;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const o = (y * img.w + x) * 4;
      const a = D[o + 3];
      if (!a) continue;
      if (a !== 255) semi++;
      colors.add((D[o] << 16) | (D[o + 1] << 8) | D[o + 2]);
      // pixel sát nền trong suốt hoặc mép ô là viền ngoài
      const lx = x % fw;
      const ly = y % fh;
      const edge = !lx || !ly || lx === fw - 1 || ly === fh - 1 || !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      if (edge && (D[o] !== OUTLINE[0] || D[o + 1] !== OUTLINE[1] || D[o + 2] !== OUTLINE[2])) badEdge++;
    }
  }
  if (semi) errs.push(`${semi} pixel bán trong suốt (alpha phải 0 hoặc 255)`);
  if (colors.size > maxColors) errs.push(`${colors.size} màu > trần ${maxColors}`);
  if (badEdge) errs.push(`${badEdge} pixel viền ngoài không phải #1d1424`);
  return errs;
}

module.exports = { checkAtlas, MONSTER_ANIMS, OUTLINE };
