// Sprite quái vật (pixel art vẽ bằng code)
import { shade, drawNinja } from './sprites.js';

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
