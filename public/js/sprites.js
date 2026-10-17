// Đồ họa pixel vẽ hoàn toàn bằng code (không dùng ảnh ngoài).
// Mọi hàm vẽ nhận ctx ở độ phân giải thấp (1 đơn vị = 1 pixel nghệ thuật).

export const ELEMENT_COLORS = { fire: '#ff7043', water: '#42a5f5', wind: '#7ccd5a' };
const CLASS_OUTFIT = { kiem: '#8b2f2f', tieu: '#a0522d', kunai: '#2f5f8b', cung: '#2d6e7e', dao: '#3d6b35', quat: '#5e7d2f' };
const TIER_OUTFIT = ['#6b5137', '#8a5530', '#4f5b66', '#6f7d8c', '#a68219', '#1f8a6a', '#5a3fb0', '#a3271f', '#2b7fbf', '#b54fb0'];
const TIER_METAL = ['#a0703c', '#d08c48', '#b9c2ca', '#eef3f7', '#ffd54a', '#5cf0c0', '#a98bff', '#ff6a5c', '#7fd6ff', '#ff9cf5'];
const HAIR = ['#232323', '#3b2416', '#5a3a22', '#1f2a44', '#6b2b2b', '#d9d9d9'];

function parseColor(c) {
  if (c[0] === '#') {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

const shadeCache = new Map();
function shade(col, f) {
  const key = `${col}|${f}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  let [r, g, b] = parseColor(col);
  if (f < 0) {
    r *= 1 + f; g *= 1 + f; b *= 1 + f;
  } else {
    r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
  }
  const out = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, out);
  return out;
}
export { shade };

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Bộ vẽ pixel có lật theo hướng
function painter(ctx, ox, oy, dir, ps = 1) {
  return (dx, dy, w, h, c) => {
    ctx.fillStyle = c;
    const x = dir > 0 ? dx : -dx - w;
    ctx.fillRect(Math.round(ox + x * ps), Math.round(oy + dy * ps), w * ps, h * ps);
  };
}

// ================= NINJA =================
// o: { dir, cls, gender, look:{w,a,p,h,wp}, anim:'idle'|'walk'|'jump'|'attack'|'dead', t, name, pal:[outfit, accent, extra], scale, flash, weaponType }
export function drawNinja(ctx, x, y, o) {
  const ps = o.scale || 1;
  const dir = o.dir || 1;
  const P = painter(ctx, x, y, dir, ps);
  const t = o.t || 0;
  const look = o.look || {};
  const anim = o.anim || 'idle';
  const accent = o.pal ? o.pal[1] : ELEMENT_COLORS[o.el] || '#ff7043';
  let outfit = o.pal ? o.pal[0] : look.a >= 0 ? TIER_OUTFIT[look.a] : CLASS_OUTFIT[o.cls] || '#555';
  let pants = o.pal ? shade(o.pal[0], -0.35) : look.p >= 0 ? shade(TIER_OUTFIT[look.p], -0.3) : '#3a3340';
  const skin = o.pal && o.pal[3] ? o.pal[3] : '#f1c27d';
  const skinD = shade(skin, -0.18);
  const hair = o.pal ? o.pal[2] : HAIR[hash(o.name || '') % HAIR.length];
  const female = o.gender === 'f';
  if (o.flash) {
    outfit = '#ffffff';
    pants = '#ffffff';
  }
  const outfitD = shade(outfit, -0.3);

  if (anim === 'dead') {
    // Nằm gục
    P(-9, -4, 18, 4, outfitD);
    P(-9, -4, 5, 4, skin);
    P(-10, -5, 4, 2, hair);
    P(3, -3, 6, 2, pants);
    return;
  }

  // Bóng
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(Math.round(x - 5 * ps), Math.round(y), 10 * ps, ps);

  const walk = anim === 'walk' ? Math.floor(t * 10) % 4 : -1;
  const bob = walk === 1 || walk === 3 ? -1 : 0;
  const breathe = anim === 'idle' && Math.floor(t * 2) % 2 === 0 ? 0 : 0;
  const by = bob + breathe;

  // Chân
  const shoe = '#2a2230';
  if (anim === 'jump') {
    P(-3, -7, 2, 4, pants); P(-4, -4, 2, 2, shoe);
    P(1, -7, 2, 5, pants); P(2, -3, 3, 1, shoe);
  } else {
    let fa = 0;
    let fb = 0;
    if (walk === 0) { fa = 2; fb = -2; }
    if (walk === 2) { fa = -2; fb = 2; }
    P(-3 + fb, -7, 2, 6, shade(pants, -0.15)); P(-3 + fb, -1, 3, 1, shoe);
    P(1 + fa, -7, 2, 6, pants); P(1 + fa, -1, 3, 1, shoe);
  }

  // Thân
  P(-3, -14 + by, 7, 7, outfit);
  P(-3, -14 + by, 1, 7, outfitD);
  P(-3, -9 + by, 7, 1, accent); // thắt lưng
  P(0, -13 + by, 1, 3, outfitD); // vạt áo
  // Khăn quàng bay phía sau
  const flap = Math.floor(t * 6) % 2;
  P(-4, -14 + by, 2, 1, accent);
  P(-6, -14 + by + flap, 2, 1, accent);
  if (anim === 'walk' || anim === 'jump') P(-8, -13 + by + flap, 2, 1, accent);

  // Tay sau
  P(-4, -13 + by, 1, 5, outfitD); P(-4, -8 + by, 1, 1, skinD);

  // Đầu
  P(-3, -20 + by, 7, 6, skin);
  P(-3, -21 + by, 7, 2, hair);
  P(-4, -20 + by, 2, 4, hair);
  if (female) {
    P(-6, -19 + by, 2, 5, hair); // tóc đuôi ngựa
    P(-7, -16 + by + flap, 2, 2, hair);
  }
  // Băng trán + miếng hộ trán
  P(-3, -19 + by, 7, 1, accent);
  P(-5, -19 + by + flap, 2, 1, accent);
  P(-6, -18 + by, 1, 1, accent);
  if (look.h >= 0) P(1, -19 + by, 3, 1, TIER_METAL[look.h]);
  // Mắt
  P(1, -17 + by, 1, 1, '#1b1b2a');
  P(3, -17 + by, 1, 1, '#1b1b2a');
  // Khăn che mặt (nam)
  if (!female && !o.noMask) P(0, -15 + by, 4, 1, shade(outfit, -0.45));

  // Tay trước + vũ khí
  const wt = o.weaponType;
  const metal = look.w >= 0 ? TIER_METAL[look.w] : '#b9c2ca';
  const attacking = anim === 'attack';
  if (attacking) {
    P(3, -12 + by, 5, 2, outfit);
    P(8, -12 + by, 1, 2, skin);
  } else {
    P(3, -13 + by, 2, 5, outfit);
    P(3, -8 + by, 2, 1, skin);
  }
  drawWeapon(P, wt, metal, attacking, by, t, look.wp || 0);
  if ((look.wp || 0) >= 6 && !o.flash) {
    const k = Math.floor(t * 8) % 6;
    P(attacking ? 9 + k : 5, attacking ? -14 + by : -10 - k + by, 1, 1, k % 2 ? '#ffffff' : metal);
  }
}

function drawWeapon(P, wt, c, atk, by, t, plus) {
  const dark = shade(c, -0.35);
  const grip = '#5d4037';
  switch (wt) {
    case 'sword':
      if (atk) {
        P(9, -12 + by, 1, 2, grip); P(10, -13 + by, 1, 4, '#ffd54f');
        P(11, -12 + by, 9, 1, c); P(11, -11 + by, 8, 1, dark);
      } else {
        // đeo sau lưng
        for (let i = 0; i < 9; i++) P(-3 - i * 0.5 | 0, -13 - i + by, 1, 1, i < 2 ? grip : c);
        P(-2, -12 + by, 2, 1, '#ffd54f');
      }
      break;
    case 'blade':
      if (atk) {
        P(9, -12 + by, 1, 2, grip); P(10, -13 + by, 1, 4, '#ffd54f');
        P(11, -13 + by, 8, 2, c); P(19, -12 + by, 1, 1, c); P(11, -11 + by, 7, 1, dark);
      } else {
        for (let i = 0; i < 8; i++) P(-3 - i * 0.5 | 0, -13 - i + by, 2, 1, i < 2 ? grip : c);
      }
      break;
    case 'kunai':
      if (atk) { P(9, -12 + by, 1, 1, grip); P(10, -12 + by, 4, 1, c); P(10, -11 + by, 2, 1, dark); }
      else { P(4, -8 + by, 1, 1, grip); P(4, -7 + by, 1, 3, c); }
      break;
    case 'shuriken':
      if (!atk) { P(5, -9 + by, 3, 1, c); P(6, -10 + by, 1, 3, c); P(6, -9 + by, 1, 1, dark); }
      break;
    case 'bow':
      if (atk) {
        P(9, -18 + by, 1, 2, c); P(10, -16 + by, 1, 8, c); P(9, -8 + by, 1, 2, c);
        P(8, -17 + by, 1, 10, '#eeeeee');
      } else {
        P(5, -17 + by, 1, 2, c); P(6, -15 + by, 1, 8, c); P(5, -7 + by, 1, 2, c);
        P(4, -16 + by, 1, 9, '#e0e0e0');
      }
      break;
    case 'fan':
      if (atk) { P(9, -16 + by, 5, 1, c); P(9, -15 + by, 6, 2, c); P(9, -13 + by, 5, 1, dark); P(9, -12 + by, 1, 1, grip); }
      else { P(5, -11 + by, 4, 1, c); P(5, -10 + by, 4, 2, dark); P(5, -8 + by, 1, 1, grip); }
      break;
    default:
  }
}

// Đầu nhân vật (avatar HUD)
export function drawPortrait(ctx, o) {
  ctx.clearRect(0, 0, 16, 16);
  drawNinja(ctx, 8, 30, { ...o, anim: 'idle', t: 0, dir: 1 });
}

// ================= QUÁI =================
// Bảng ký tự: . trong suốt, 1/2/3 = màu bảng, k = viền tối, w = trắng, e = mắt
const ART = {
  slime: [[
    '....kkkkkk....',
    '..kk111111kk..',
    '.k11ww111111k.',
    '.k1w11111111k.',
    'k111111111111k',
    'k1111e111e111k',
    'k1111e111e111k',
    'k211111111112k',
    '.k2222222222k.',
    '..kkkkkkkkkk..',
  ]],
  bunny: [[
    '.......k.k...',
    '......k3k3k..',
    '......k3k3k..',
    '......k1k1k..',
    '...kkkk111k..',
    '..k11111111k.',
    '.k1111111e1k.',
    '.k111111111k3',
    'k21111111111k',
    'k2211111111k.',
    '.k22111111k..',
    '..kk1kk1kk...',
  ], [
    '.......k.k...',
    '......k3k3k..',
    '......k3k3k..',
    '......k1k1k..',
    '...kkkk111k..',
    '..k11111111k.',
    '.k1111111e1k.',
    '.k111111111k3',
    'k21111111111k',
    'k2211111111k.',
    '.k22111111k..',
    '.kk1k...k1kk.',
  ]],
  mushroom: [[
    '....kkkkkk....',
    '..kk111w11kk..',
    '.k1ww111111wk.',
    'k111111w11111k',
    'k1w1111111ww1k',
    'kkkkkkkkkkkkkk',
    '...k222222k...',
    '...k2e22e2k...',
    '...k222222k...',
    '...k222222k...',
    '...k2kkk22k...',
    '...kk...kkk...',
  ]],
  imp: [[
    '..k......k...',
    '..k3k..k3k...',
    '...k1111k....',
    '..k111111k...',
    '..k1w1w11k...',
    '..k1e1e11k...',
    '..k111111k...',
    '...k2222k....',
    '..k211112k...',
    '.k21111112k..',
    '.k1k1111k1k..',
    '...k1111k..kk',
    '...k1kk1k.k1.',
    '...kk..kk.k..',
  ], [
    '..k......k...',
    '..k3k..k3k...',
    '...k1111k....',
    '..k111111k...',
    '..k1w1w11k...',
    '..k1e1e11k...',
    '..k111111k...',
    '...k2222k....',
    '..k211112k...',
    '.k21111112k..',
    '.k1k1111k1k..',
    '...k1111k.kk.',
    '..k1k..k1kk1.',
    '..kk....kk...',
  ]],
  flyer: [[
    'kk..............kk',
    'k2k....kkkk....k2k',
    'k22k..k1111k..k22k',
    '.k22kk111111kk22k.',
    '.k22211w11w11222k.',
    '..k2211e11e1122k..',
    '...kk11111111kk...',
    '.....k133331k.....',
    '......k1111k......',
    '.......kkkk.......',
  ], [
    '..................',
    '.......kkkk.......',
    '......k1111k......',
    '..kkkk111111kkkk..',
    '.k22211w11w11222k.',
    'k22221e11e112222k',
    'k2kk.k111111k.kk2k',
    'kk...k133331k...kk',
    '......k1111k......',
    '.......kkkk.......',
  ]],
  crab: [[
    '.kk..............kk.',
    'k33k............k33k',
    'k3k3k..........k3k3k',
    '.kk1k...k..k...k1kk.',
    '...k1k.kek.kekk1k...',
    '....kk111kk111kk....',
    '...k111111111111k...',
    '..k11111111111111k..',
    '..k12222222222221k..',
    '...kk2kk2kk2kk2kk...',
    '...k.k..k..k..k.k...',
  ], [
    '.kk..............kk.',
    'k33k............k33k',
    'k333k..........k333k',
    '.kk1k...k..k...k1kk.',
    '...k1k.kek.kekk1k...',
    '....kk111kk111kk....',
    '...k111111111111k...',
    '..k11111111111111k..',
    '..k12222222222221k..',
    '..k.kk2kk2kk2kk2kk..',
    '..k..k..k..k..k..k..',
  ]],
  golem: [[
    '.....kkkkkkkkk.....',
    '....k111111111k....',
    '....k1kk111kk1k....',
    '....k1k3k1k3k1k....',
    '....k111111111k....',
    '....k12222222k1....',
    '..kkkk1111111kkkk..',
    '.k1111k11111k1111k.',
    'k111111k111k111111k',
    'k1121111111111211k.',
    'k112k111111111k211k',
    'k11k1112222111k11k.',
    'kkkk11112221111kkkk',
    '...k11111111111k...',
    '...k1112kkk2111k...',
    '...k111k...k111k...',
    '...k111k...k111k...',
    '..k2222k...k2222k..',
    '..kkkkkk...kkkkkk..',
  ]],
  ghost: [[
    '....kkkkkkk.....',
    '...k1111111k....',
    '..k111111111k...',
    '.k11w1111w111k..',
    '.k1ee1111ee11k..',
    '.k11111111111k..',
    '.k11113331111k..',
    '.k11111111111kk.',
    '.k111111111111k.',
    '.k2111111111111k',
    '.k22111111111kk.',
    '.k2221111111k...',
    '..k2k2k2k2k2k...',
    '...k.k.k.k.k....',
  ]],
  beast: [[
    '...................kk...',
    '..................k11k..',
    '.................k1111k.',
    'kk........kkkkkkk1w1e1k.',
    'k1k.....kk11111111111133',
    '.k1kkkkk111111111111kkk.',
    '..k111111111111111111k..',
    '..k211111111111111112k..',
    '..k222211111111111222k..',
    '...k22k2222222222k22k...',
    '...k1kk..........kk1k...',
    '...k1k............k1k...',
    '..kk1k...........kk1k...',
    '..kkk............kkk....',
  ], [
    '...................kk...',
    '..................k11k..',
    '.................k1111k.',
    '..........kkkkkkk1w1e1k.',
    'kk......kk11111111111133',
    'k1kkkkkk111111111111kkk.',
    '.kk111111111111111111k..',
    '..k211111111111111112k..',
    '..k222211111111111222k..',
    '...k22k2222222222k22k...',
    '....kk1k........k1kk....',
    '.....k1k........k1k.....',
    '....kk1k.......kk1k.....',
    '....kkk........kkk......',
  ]],
  snowman: [[
    '.....kkkkkk.....',
    '....k222222k....',
    '...kkkkkkkkkk...',
    '....k111111k....',
    '...k11e11e11k...',
    '...k1111133k....',
    '...k11111111k...',
    '....kk3333kk....',
    '..kk11111111kk..',
    '.k1111k111111k..',
    'k111111111111k.k',
    'k1111k1111111kk.',
    'k11111111111k1k.',
    '.k1111k11111k...',
    'k11111111111111k',
    'k1111111111111k.',
    'k11111111111111k',
    '.k222222222222k.',
    '..kkkkkkkkkkkk..',
  ]],
};

const artCache = new Map();
function artCanvas(type, frame, pal, flash) {
  const key = `${type}|${frame}|${pal.join(',')}|${flash ? 1 : 0}`;
  let c = artCache.get(key);
  if (c) return c;
  const frames = ART[type];
  const rows = frames[frame % frames.length];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const map = {
    1: pal[0], 2: pal[1], 3: pal[2], k: shade(pal[0], -0.75), w: '#ffffff', e: '#111111',
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      g.fillStyle = flash ? (ch === 'k' ? '#ffffff' : '#ffffff') : map[ch] || '#f0f';
      g.fillRect(x, y, 1, 1);
    }
  }
  artCache.set(key, c);
  return c;
}

export function drawMonster(ctx, x, y, def, o) {
  const t = o.t || 0;
  const s = Math.max(1, Math.round(def.scale || 1));
  const dir = o.dir || 1;
  let fy = y;
  if (def.fly) fy -= 10 * s + Math.sin(t * 4 + (o.id || 0)) * 3 * s;
  // bóng
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const sw = Math.round((def.w || 14) * 0.7);
  ctx.fillRect(Math.round(x - sw / 2), Math.round(y), sw, Math.max(1, s));

  if (def.type === 'humanoid') {
    drawNinja(ctx, x, fy, {
      dir, anim: o.st === 1 ? 'walk' : o.st === 2 ? 'attack' : 'idle', t, scale: s, flash: o.flash,
      pal: [def.pal[0], def.pal[2], def.pal[1], def.k === 'skeleton' || def.k === 'mummy' ? def.pal[1] : null],
      weaponType: def.ranged ? 'shuriken' : 'blade', look: { w: Math.min(9, Math.floor(def.lv / 10)) }, name: def.name,
    });
    return;
  }
  const frames = ART[def.type] || ART.slime;
  const moving = o.st === 1 || def.fly;
  const frame = frames.length > 1 && moving ? Math.floor(t * (def.fly ? 8 : 6)) % frames.length : 0;
  const img = artCanvas(def.type, frame, def.pal, o.flash);
  const w = img.width * s;
  let h = img.height * s;
  let squash = 0;
  if (def.type === 'slime') squash = Math.round((Math.sin(t * 6 + (o.id || 0)) * 0.5 + 0.5) * s);
  if (o.st === 2) squash = -s;
  h -= squash;
  ctx.save();
  ctx.translate(Math.round(x), 0);
  if (dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, Math.round(-w / 2), Math.round(fy - h), w, h);
  ctx.restore();
  if (def.boss) {
    // vương miện
    const cx = Math.round(x);
    const top = Math.round(fy - h - 4 * s);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(cx - 3 * s, top + 2 * s, 7 * s, 2 * s);
    ctx.fillRect(cx - 3 * s, top, s, 2 * s);
    ctx.fillRect(cx, top, s, 2 * s);
    ctx.fillRect(cx + 3 * s, top, s, 2 * s);
  }
}

export function monsterHeight(def) {
  const s = Math.max(1, Math.round(def.scale || 1));
  if (def.type === 'humanoid') return 22 * s;
  const frames = ART[def.type] || ART.slime;
  return frames[0].length * s + (def.fly ? 10 * s : 0);
}

// ================= ICON VẬT PHẨM (12x12) =================
const iconCache = new Map();

export function iconCanvas(icon, rarity) {
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}`;
  let c = iconCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const g = c.getContext('2d');
  const P = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  const col = icon.c;
  const d = shade(col, -0.4);
  const l = shade(col, 0.45);
  const o = '#1a1424';
  switch (icon.k) {
    case 'sword':
      for (let i = 0; i < 7; i++) { P(4 + i, 7 - i, 1, 1, l); P(5 + i, 7 - i, 1, 1, col); }
      P(2, 7, 4, 1, '#ffd54f'); P(3, 6, 1, 3, '#ffd54f'); P(1, 9, 2, 2, '#6d4c41'); P(2, 8, 1, 1, '#6d4c41');
      break;
    case 'blade':
      for (let i = 0; i < 6; i++) { P(4 + i, 6 - i, 2, 2, col); P(4 + i, 7 - i, 1, 1, d); }
      P(10, 1, 1, 1, l); P(2, 7, 4, 1, '#ffd54f'); P(1, 8, 2, 3, '#6d4c41');
      break;
    case 'kunai':
      P(5, 1, 2, 1, l); P(4, 2, 4, 4, col); P(5, 6, 2, 1, d); P(5, 7, 2, 3, '#5d4037'); P(4, 10, 4, 2, o); P(5, 10, 2, 1, col);
      break;
    case 'shuriken':
      P(5, 1, 2, 10, col); P(1, 5, 10, 2, col); P(3, 3, 6, 6, d); P(5, 5, 2, 2, o); P(2, 2, 2, 2, col); P(8, 8, 2, 2, col); P(8, 2, 2, 2, col); P(2, 8, 2, 2, col);
      break;
    case 'bow':
      P(3, 1, 2, 1, col); P(5, 2, 1, 1, col); P(6, 3, 1, 6, col); P(5, 9, 1, 1, col); P(3, 10, 2, 1, col); P(3, 2, 1, 8, '#eeeeee'); P(2, 5, 8, 1, '#8d6e63'); P(9, 4, 2, 3, l);
      break;
    case 'fan':
      P(2, 2, 8, 1, col); P(1, 3, 10, 2, col); P(2, 5, 8, 2, d); P(3, 7, 6, 1, d); P(4, 8, 4, 1, '#5d4037'); P(5, 9, 2, 2, '#5d4037');
      for (let i = 0; i < 4; i++) P(2 + i * 2, 3, 1, 3, l);
      break;
    case 'hat':
      P(2, 3, 8, 2, col); P(1, 5, 10, 1, d); P(2, 6, 8, 3, col); P(4, 6, 4, 1, l); P(1, 9, 10, 1, d);
      break;
    case 'armor':
      P(2, 2, 3, 2, col); P(7, 2, 3, 2, col); P(1, 4, 10, 6, col); P(5, 2, 2, 3, o); P(3, 5, 6, 1, l); P(1, 9, 10, 1, d); P(5, 6, 2, 3, d);
      break;
    case 'gloves':
      P(2, 3, 6, 6, col); P(8, 4, 2, 3, col); P(2, 9, 6, 2, d); P(3, 4, 1, 3, l); P(5, 4, 1, 3, l);
      break;
    case 'pants':
      P(2, 1, 8, 3, col); P(2, 4, 3, 7, col); P(7, 4, 3, 7, col); P(2, 2, 8, 1, d); P(3, 5, 1, 5, l);
      break;
    case 'shoes':
      P(2, 3, 3, 5, col); P(2, 8, 8, 2, col); P(5, 7, 4, 1, l); P(1, 10, 10, 1, d);
      break;
    case 'necklace':
      P(2, 1, 1, 4, d); P(9, 1, 1, 4, d); P(3, 5, 1, 2, d); P(8, 5, 1, 2, d); P(4, 7, 4, 1, d); P(4, 8, 4, 3, col); P(5, 8, 1, 1, l);
      break;
    case 'ring':
      P(3, 4, 6, 1, d); P(2, 5, 1, 4, d); P(9, 5, 1, 4, d); P(3, 9, 6, 1, d); P(4, 1, 4, 3, col); P(5, 1, 1, 1, l);
      break;
    case 'amulet':
      P(4, 1, 4, 1, d); P(3, 2, 6, 1, col); P(2, 3, 8, 6, col); P(3, 9, 6, 1, col); P(4, 10, 4, 1, d); P(4, 4, 2, 2, l); P(5, 6, 2, 2, d);
      break;
    case 'potion': {
      const s = icon.s || 1;
      P(5, 1, 2, 2, '#8d6e63'); P(4, 3, 4, 1, '#cfd8dc'); P(3, 4, 6, 7, '#cfd8dc');
      P(4, 11 - (2 + s * 1.5 | 0), 4, (2 + s * 1.5) | 0, col); P(4, 5, 1, 2, '#ffffff');
      break;
    }
    case 'scroll':
      P(2, 2, 8, 8, '#f5e6c4'); P(1, 1, 10, 2, col); P(1, 9, 10, 2, col); P(3, 4, 6, 1, '#8d6e63'); P(3, 6, 5, 1, '#8d6e63');
      break;
    case 'book':
      P(2, 1, 8, 10, col); P(3, 2, 6, 8, d); P(4, 4, 4, 1, '#ffd54f'); P(4, 6, 3, 1, '#ffd54f'); P(2, 1, 1, 10, l);
      break;
    case 'stone':
      P(4, 1, 4, 1, l); P(3, 2, 6, 2, col); P(2, 4, 8, 4, col); P(3, 8, 6, 2, d); P(4, 10, 4, 1, d); P(4, 3, 2, 2, '#ffffff');
      break;
    case 'charm':
      P(3, 1, 6, 10, col); P(4, 2, 4, 8, '#ffffff'); P(5, 3, 2, 1, '#e53935'); P(4, 5, 4, 1, '#e53935'); P(5, 7, 2, 2, '#e53935');
      break;
    case 'chest':
      P(1, 3, 10, 3, d); P(1, 6, 10, 5, col); P(1, 6, 10, 1, '#5d4037'); P(5, 5, 2, 3, '#ffeb3b'); P(2, 4, 8, 1, l);
      break;
    case 'card':
      P(2, 1, 8, 10, col); P(3, 2, 6, 8, '#fff3e0'); P(5, 3, 2, 6, col); P(4, 4, 4, 2, col);
      break;
    case 'material':
      P(3, 3, 6, 6, col); P(2, 4, 8, 4, col); P(4, 4, 2, 2, l); P(3, 8, 6, 1, d);
      break;
    case 'xu':
      P(3, 2, 6, 1, '#b8860b'); P(2, 3, 8, 6, '#ffd54f'); P(3, 9, 6, 1, '#b8860b'); P(5, 4, 2, 4, '#b8860b'); P(3, 3, 2, 1, '#fff59d');
      break;
    default:
      P(2, 2, 8, 8, col);
  }
  // viền theo độ hiếm
  if (rarity) {
    const rc = ['', '#5ab4ff', '#ffd23c', '#c77dff', '#ff8a3c'][rarity];
    g.fillStyle = rc;
    g.fillRect(0, 0, 2, 1); g.fillRect(0, 0, 1, 2); g.fillRect(10, 11, 2, 1); g.fillRect(11, 10, 1, 2);
  }
  iconCache.set(key, c);
  return c;
}

const urlCache = new Map();
export function iconURL(icon, rarity) {
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}`;
  let u = urlCache.get(key);
  if (!u) {
    u = iconCanvas(icon, rarity).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}
