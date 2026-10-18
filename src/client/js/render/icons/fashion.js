// Icon thú cưng, thức ăn thú cưng, thời trang (mặt nạ, áo choàng, trang phục) và thú cưỡi.
import { shade } from '../sprites.js';
import { petPixels } from '../petart.js';
import { OUT, FIX, tierPal } from './pix.js';
import { drawPaw } from './items.js';

// Thú cưng: dùng đúng hình khung đứng yên của thú ngoài thế giới (petart.js), căn giữa ô 16x16.
// Thú rộng hơn 14px thì cắt bớt phía đuôi (bên trái). Không có hình thì vẽ dấu chân
export function drawPetIcon(P, col, kind) {
  const px = kind ? petPixels(kind) : null;
  if (!px) return drawPaw(P, col);
  const { w, h, data } = px;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!data[(y * w + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return drawPaw(P, col);
  if (x1 - x0 > 13) x0 = x1 - 13;
  if (y1 - y0 > 13) y0 = y1 - 13;
  const ox = 1 + Math.floor((14 - (x1 - x0 + 1)) / 2) - x0;
  const oy = 1 + Math.ceil((14 - (y1 - y0 + 1)) / 2) - y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      if (!data[i + 3]) continue;
      const j = ((y + oy) * 16 + (x + ox)) * 4;
      P.d[j] = data[i];
      P.d[j + 1] = data[i + 1];
      P.d[j + 2] = data[i + 2];
      P.d[j + 3] = 255;
    }
  }
}

// Thức ăn thú (icon.s → cách vẽ): bánh gạo in dấu chân / cá khô / linh đan
const PETFOOD_ICONS = {
  grain: (P, pal) => {
    // bánh gạo: đĩa tròn vàng nướng, viền sậm, dấu chân thú ở giữa
    P.fill(1, 2, 15, 15, (x, y) => {
      const dx = (x - 8) / 6.6;
      const dy = (y - 8.8) / 5.6;
      const r = dx * dx + dy * dy;
      if (r > 1) return null;
      if (r > 0.72) return dy > -0.2 ? pal[2] : pal[3];
      const lit = -dx - dy + (1 - r) * 0.3;
      return lit > 0.9 ? pal[5] : lit > 0 ? pal[4] : pal[3];
    });
    P.map(['.1.1.', '1...1', '.111.', '.111.'], pal, 6, 7);
    P.set(4, 6, '#ffffff');
  },
  fish: (P, pal) => {
    P.map([
      '.......44.......',
      '......4554......',
      '.2...455555444..',
      '.22.3555w55544..',
      '.233355555o5543.',
      '.23333333333343.',
      '.22.2333333332..',
      '.2...22222222...',
      '......2...2.....',
    ], pal, 0, 4);
    P.line(10, 7, 10, 10, pal[2]);
    for (const [x, y] of [[5, 9], [7, 9], [6, 8], [8, 8]]) P.set(x, y, pal[4]);
  },
  pill: (P, pal) => {
    // linh đan: viên tròn đỏ, đai mây vàng, chấm sáng + sao lấp lánh
    P.fill(2, 3, 14, 15, (x, y) => {
      const dx = (x - 8) / 5.4;
      const dy = (y - 9) / 5.4;
      const r = dx * dx + dy * dy;
      if (r > 1) return null;
      const lit = -dx - dy * 1.2 + (1 - r) * 0.4;
      return lit > 1 ? pal[5] : lit > 0.25 ? pal[4] : lit > -0.6 ? pal[3] : pal[2];
    });
    P.map(['GGG.....', 'gYGGG.GG', '..ggGYGg', '......g.'], FIX, 4, 9);
    P.set(5, 5, '#ffffff'); P.set(6, 5, '#ffffff'); P.set(5, 6, '#ffffff');
    P.map(['.Y.', 'YwY', '.Y.'], FIX, 12, 1);
  },
};
export function drawPetFood(P, col, kind) {
  (PETFOOD_ICONS[kind] || PETFOOD_ICONS.grain)(P, tierPal(col));
}

// ---- Thời trang: mặt nạ (icon.s = kiểu), áo choàng, trang phục, thú cưỡi
const MASK_ICONS = {
  fox: {
    pal: { W: '#f6f2ea', g: '#b8b0a8', R: '#d8323c', r: '#8e1b2a', k: OUT },
    rows: [
      '................',
      '..gR.......Rg...',
      '..gWR.....RWg...',
      '..gWWWWWWWWWg...',
      '.gWWRWWWWWRWWg..',
      '.gWkkRWWWRkkWg..',
      '.gWWWWWWWWWWWg..',
      '.gRWWWWWWWWWRg..',
      '..gRWWWWWWWRg...',
      '...gWWWWWWWg....',
      '....gWWkWWg.....',
      '.....gWRWg......',
      '......ggg.......',
    ],
  },
  oni: {
    pal: { R: '#d32f2f', r: '#7a1414', q: '#ff6f60', k: OUT, Y: '#ffd54a', I: '#f4ead8', i: '#bfb09a', W: '#ffffff' },
    rows: [
      '..I.........I...',
      '..Ii.......iI...',
      '...IrRRRRRrI....',
      '..rqqRRRRRRRr...',
      '.rqkkRRRRRkkRr..',
      '.rqYkRRRRRYkRr..',
      '.rqRRRRRRRRRRr..',
      '.rRRRRRrRRRRRr..',
      '.rRRRRrrrRRRRr..',
      '..rkWkkkkkWkr...',
      '..rRWRRRRRWRr...',
      '...rRRRRRRRr....',
      '....rrrrrrr.....',
    ],
  },
  tengu: {
    pal: { R: '#d32f2f', r: '#7a1414', q: '#ff6f60', k: OUT, G: '#f2c230', W: '#ffffff', w: '#d8d4dc' },
    rows: [
      '................',
      '....WWWWW.......',
      '...rqqRRRRr.....',
      '..rWWWRWWWRr....',
      '..rqkGRRkGRr....',
      '..rqRRRRRRRRRRr.',
      '..rqRRRRRRRRRRRr',
      '..rRRRRRRRRRRrr.',
      '..rRRWWWWWRr....',
      '..rRRwWWWwRr....',
      '...rRRWWWRr.....',
      '....rrrrrr......',
    ],
  },
};

export function drawMaskIcon(P, s) {
  const m = MASK_ICONS[s] || MASK_ICONS.fox;
  P.map(m.rows, m.pal, 0, 1);
}

// Áo choàng nhìn từ sau: cổ áo, khuy vàng, vạt xòe gợn sóng; hoa văn theo kiểu
export function drawCloakIcon(P, col, s) {
  const pal = tierPal(col);
  P.fill(0, 2, 15, 14, (x, y) => {
    const t = (y - 2) / 12;
    const hw = 3.2 + t * 4.4;
    const dx = x - 8;
    if (Math.abs(dx) > hw) return null;
    const wave = y > 12.6 + Math.sin(x * 1.3) * 0.8;
    if (wave) return null;
    const u = (dx / hw + 1) / 2;
    let c = u < 0.18 ? pal[2] : u < 0.5 ? pal[3] : u < 0.82 ? pal[4] : pal[3];
    if (Math.abs(dx) < 0.6 && y > 4) c = pal[2];
    if (y > 11.5) c = pal[2];
    return c;
  });
  // cổ áo + khuy
  P.rect(5, 2, 6, 1, pal[5]);
  P.rect(4, 3, 8, 1, pal[4]);
  P.set(7, 3, FIX.G);
  P.set(8, 3, FIX.Y);
  if (s === 'night') [[5, 6], [10, 8], [7, 10], [4, 10], [11, 5]].forEach(([x, y]) => P.set(x, y, '#b39ddb'));
  if (s === 'wind') {
    P.line(3, 11, 6, 11, '#f2f6f0');
    P.line(9, 11, 12, 11, '#f2f6f0');
    P.set(5, 10, '#f2f6f0');
    P.set(11, 10, '#f2f6f0');
  }
  if (s === 'flame') {
    for (let x = 2; x <= 13; x += 2) {
      P.set(x, 12, '#ffb300');
      P.set(x, 11, '#ffd54f');
      P.set(x + 1, 12, '#ff7043');
    }
  }
  if (s === 'snow') {
    // cổ lông trắng
    P.rect(3, 2, 10, 2, '#ffffff');
    P.set(4, 4, '#dde6ee');
    P.set(11, 4, '#dde6ee');
    P.set(7, 4, '#90caf9');
    P.set(8, 4, '#90caf9');
  }
}

// Trang phục: áo kimono tay rộng, cổ chéo, đai lưng, hoa văn theo kiểu
const COSTUME_ICON = { sakura: ['#ffffff', '#e91e63'], ocean: ['#e3f2fd', '#64b5f6'], shadow: ['#b39ddb', '#5a4a7a'], dragon: ['#ffd54a', '#ff8f00'] };
export function drawCostumeIcon(P, col, s) {
  const pal = tierPal(col);
  const [a, b] = COSTUME_ICON[s] || ['#ffffff', '#cccccc'];
  // tay áo rộng
  P.fill(1, 3, 14, 7, (x, y) => ((x < 5 || x > 11) && y < 7.5 + (x < 3 || x > 13 ? 0 : 1) ? (x < 3 || x > 13 ? pal[2] : pal[3]) : null));
  // thân áo
  P.fill(4, 2, 12, 14, (x, y) => (x >= 4.5 && x <= 11.5 && y >= 2 && y <= 14 ? (x < 6 ? pal[2] : x > 10 ? pal[3] : pal[4]) : null));
  // cổ chéo
  P.line(5, 2, 8, 6, pal[5]);
  P.line(11, 2, 8, 6, pal[5]);
  P.line(6, 2, 8, 5, '#ffffff');
  // đai lưng
  P.rect(5, 8, 7, 2, b);
  P.rect(7, 8, 2, 2, a);
  // hoa văn
  if (s === 'sakura') [[2, 4], [13, 5], [6, 11], [10, 12]].forEach(([x, y]) => { P.set(x, y, a); P.set(x + 1, y, b); });
  if (s === 'ocean') for (let x = 5; x <= 11; x++) P.set(x, 12 + (x & 1), a);
  if (s === 'shadow') P.line(5, 3, 11, 9, b);
  if (s === 'dragon') {
    P.rect(6, 4, 2, 2, a);
    for (let x = 5; x <= 11; x += 2) P.set(x, 12, a);
    P.set(1, 7, a);
    P.set(14, 7, a);
  }
}

// Thú cưỡi: đầu nhìn nghiêng (kỳ lân: sừng + bờm lửa; hổ: mặt chính diện; hạc: cổ đen mào đỏ)
const MOUNT_ICONS = {
  horse: [
    '................',
    '.......ll.......',
    '......mlc.......',
    '.....mmccl......',
    '....mmcccccl....',
    '...mmccwkcccl...',
    '...mmccccccccl..',
    '..mmmcccccccccc.',
    '..mmcccddd.ccnc.',
    '.mmmccc....dddd.',
    '.mmcccc.........',
    '.mmccccc........',
    'mmmcccccc.......',
    'mmccccccc.......',
    '.ddddddd........',
  ],
  qilin: [
    '.........h......',
    '.......llh......',
    '......flc.......',
    '.....fFccl......',
    '....fFcscccl....',
    '...fFccwkcccl...',
    '...fFccccccccl..',
    '..fFfcccscccccc.',
    '..fFccsddd.ccnc.',
    '.fFfccc....dddd.',
    '.fFcscc.........',
    '.fFccccs........',
    'fFfcccscc.......',
    'fFcscccsc.......',
    '.hhhhhhh........',
  ],
  wolf: [
    '................',
    '....d...d.......',
    '....cd.cdd......',
    '...ccccccc......',
    '..cccccccccl....',
    '..ccwkcccccll...',
    '.Mcccccccccclll.',
    '.Mccccccccwwwwn.',
    '.MMcccccwwwww...',
    '.MMccccww.......',
    '..MMcccw........',
    '..MMMccc........',
    '..MMMcccc.......',
    '...MMcccc.......',
    '....ddddd.......',
  ],
  tiger: [
    '................',
    '...dd.....dd....',
    '..dccd...dccd...',
    '..ccsccsccsccc..',
    '.ccccssccssccc..',
    '.cswkccccwkcsc..',
    '.scccccccccccs..',
    '.ccccwwnnwwcccc.',
    '.sccwwwwwwwwccs.',
    '..ccwwwkkwwwcc..',
    '..sccwwwwwwccs..',
    '...ccccwwcccc...',
    '....sccccccs....',
    '.....dddddd.....',
  ],
  crane: [
    '................',
    '........rr......',
    '.......rrrr.....',
    '.......kwkkbbbb.',
    '........kk..bb..',
    '........kk......',
    '.......kk.......',
    '.......kk.......',
    '........kk......',
    '...cccccckk.....',
    '.cccccccccc.....',
    'kkcccccccccc....',
    'kkkMMcccccc.....',
    '.kkkMMMccc......',
    '...kk...........',
  ],
};
const MOUNT_ICON_PAL = {
  horse: { m: '#3a2216', n: '#2a1a12' },
  qilin: { f: '#ffb300', F: '#ff5722', s: '#ffd54a', h: '#ffd54a', n: '#14503f' },
  wolf: { M: '#5d6878', w: '#e3e8ee', n: '#2a2433', k: '#4fc3f7' },
  tiger: { s: '#3a3446', w: '#ffffff', n: '#f48fb1', k: '#1d1424' },
  crane: { r: '#e53935', b: '#e0b04a', M: '#9e9e9e', k: '#2a2433', w: '#ffffff' },
};
export function drawMountIcon(P, col, s) {
  const key = MOUNT_ICONS[s] ? s : 'horse';
  const pal = Object.assign({ c: col, d: shade(col, -0.35), l: shade(col, 0.35), w: '#ffffff', k: OUT }, MOUNT_ICON_PAL[key]);
  P.map(MOUNT_ICONS[key], pal, 0, 1);
}
