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
