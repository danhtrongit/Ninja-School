// Đặt trang trí theo chủ đề lên bản đồ ngoài làng, cổng đá dịch chuyển.
import { shd, Buf, blit, cached } from './util.js';
import { CLOUD, sprTree, sprBush, sprRock, sprCrystal } from './flora.js';
import { statueSpr, sprProp } from './props.js';
import { pondBridgeSpr } from './ambient.js';

// ======================= Trang trí bản đồ luyện công =======================
function placeDecor(T, m, th, sc, R, A, kind, x) {
  const G = m.ground;
  const t = m.theme;
  const put = (spr, dy = 1) => { blit(T, spr, x - spr.w / 2, G - spr.h + dy, { flip: R() < 0.5 }); return spr; };
  switch (kind) {
    case 'round': return put(sprTree('round', 54 + ((R() * 26) | 0), (R() * 3) | 0, { leaf: t === 'lake' ? 'lush' : 'green' }), 2);
    case 'maple': return put(sprTree('maple', 52 + ((R() * 26) | 0), (R() * 3) | 0), 2);
    case 'sakura': return put(sprTree('sakura', 54 + ((R() * 24) | 0), (R() * 3) | 0), 2);
    case 'willow': return put(sprTree('willow', 60 + ((R() * 16) | 0), (R() * 2) | 0), 2);
    case 'pine': return put(sprTree('pine', 52 + ((R() * 30) | 0), (R() * 3) | 0, { snow: !!th.snowcap, leaf: t === 'mist' ? 'mist' : undefined }), 2);
    case 'bamboo': return put(sprTree('bamboo', 100 + ((R() * 50) | 0), (R() * 3) | 0), 2);
    case 'palm': return put(sprTree('palm', 58 + ((R() * 22) | 0), (R() * 3) | 0), 3);
    case 'deadtree': return put(sprTree('dead', 54 + ((R() * 28) | 0), (R() * 3) | 0, { bark: t === 'dark_forest' || t === 'abyss' ? 'purple' : t === 'hell' ? 'dark' : 'grey', eyes: (t === 'dark_forest' || t === 'abyss') && R() < 0.5, eyeCol: t === 'abyss' ? '#ff3a5a' : undefined }), 2);
    case 'goldtree': return put(sprTree('gold', 56 + ((R() * 24) | 0), (R() * 3) | 0), 2);
    case 'kelp': return put(sprTree('kelp', 44 + ((R() * 44) | 0), (R() * 3) | 0), 2);
    case 'cloudpuff': return put(sprBush(18 + ((R() * 14) | 0), (R() * 4) | 0, CLOUD, ['#ffe8a0', '#ffffff']), 3);
    case 'censer': {
      const spr = put(sprProp('censer', 0, t), 1);
      A.anims.push({ k: 'smoke', x: x - 1, y: G - 20 });
      A.lights.push({ x, y: G - 12, r: 22, col: '#ffc860', a: 0.4, f: 0.2 });
      return spr;
    }
    case 'lotus': {
      const spr = put(sprProp('lotus', 0, t), 1);
      A.lights.push({ x, y: G - 6, r: 18, col: '#ffe8a0', a: 0.4, f: 0.1, s: 0.6 });
      return spr;
    }
    case 'cloudpillar': {
      const spr = put(sprProp('cloudpillar', (R() * 3) | 0, t), 2);
      A.lights.push({ x, y: G - spr.h + 4, r: 14, col: '#fff2b0', a: 0.5, f: 0.1 });
      return spr;
    }
    case 'clam': {
      const spr = put(sprProp('clam', 0, t), 1);
      A.lights.push({ x, y: G - 7, r: 22, col: '#c8f4ff', a: 0.5, f: 0.15, s: 0.5 });
      return spr;
    }
    case 'jadepillar': {
      const spr = put(sprProp('jadepillar', 0, t), 1);
      A.lights.push({ x, y: G - spr.h + 2, r: 16, col: '#e0f8ff', a: 0.5, f: 0.1 });
      return spr;
    }
    case 'geode': {
      const spr = put(sprProp('geode', 0, t), 1);
      A.lights.push({ x, y: G - 5, r: 22, col: '#c080ff', a: 0.45, f: 0.15, s: 0.7 });
      return spr;
    }
    case 'eyestalk': {
      const spr = put(sprProp('eyestalk', 0, t), 1);
      A.lights.push({ x, y: G - spr.h + 8, r: 16, col: '#ff2a4a', a: 0.3, f: 0.3, s: 0.5 });
      return spr;
    }
    case 'statue': return put(statueSpr(['#f8e0b0', '#e0b880', '#b48a58', '#80603a'], (R() * 4) | 0), 1);
    case 'cactus': return put(sprTree('cactus', 22 + ((R() * 14) | 0), (R() * 3) | 0), 2);
    case 'bush': return put(sprBush(18 + ((R() * 12) | 0), (R() * 4) | 0, t === 'mist' ? 'mist' : t === 'dark_forest' ? 'dark' : t === 'bamboo' ? 'lush' : 'green', t === 'grass_fire' || t === 'grass_wind' ? ['#ff6f91', '#ffffff', '#ffd54f'] : t === 'sakura' ? ['#ffc8dc', '#ffffff', '#f490b4'] : null), 2);
    case 'flower': {
      const lf = t === 'dark_forest' ? 'dark' : t === 'mist' ? 'mist' : t === 'bamboo' ? 'lush' : 'green';
      const fl = t === 'dark_forest' ? ['#c070ff', '#60d0ff', '#ffffff'] : t === 'grass_fire' ? ['#ff6a3a', '#ffd54f', '#ffffff'] : t === 'sakura' ? ['#ff9ac0', '#ffffff', '#ffe066'] : ['#ff6f91', '#ffd54f', '#ffffff', '#b388ff'];
      return put(sprBush(12, (R() * 4) | 0, lf, fl), 2);
    }
    case 'grass':
    case 'tallgrass': {
      const Gr = [shd(th.top, 0.3), th.top, shd(th.top, -0.25)];
      for (let i = 0; i < 14; i++) { const h = 4 + ((R() * (kind === 'tallgrass' ? 10 : 5)) | 0); const gx = x + i * 2 - 14; for (let k = 0; k < h; k++) T.p(gx + Math.round((k / h) * (i % 3 - 1) * 2), G - 1 - k, k > h - 3 ? Gr[0] : i & 1 ? Gr[1] : Gr[2]); }
      return null;
    }
    case 'rock': {
      const pal = t === 'desert' || t === 'ruins' ? ['#f0c890', '#d0a068', '#a87a4a', '#7a5634'] : t === 'cave' || t === 'crystal' ? ['#8a80a8', '#625a80', '#463e60', '#2e2842'] : t === 'lava' || t === 'hell' ? ['#7a4a40', '#5a3430', '#40241f', '#2a1714'] : t === 'abyss' ? ['#6e6478', '#4c4456', '#342e3e', '#201c28'] : t === 'dragon_palace' ? ['#8ab0b8', '#6a8e9a', '#4e6e7c', '#34505e'] : ['#b8b4ae', '#948f88', '#6e6a65', '#4e4a46'];
      return put(sprRock(16 + ((R() * 12) | 0), 9 + ((R() * 6) | 0), (R() * 5) | 0, pal, { moss: t === 'mist' || t === 'bamboo' || t === 'lake' || t === 'sakura' ? '#6a9a4a' : t === 'dragon_palace' ? '#4ab090' : null, snow: !!th.snowcap }), 2);
    }
    case 'crystal':
    case 'voidcrystal':
    case 'icecrystal': {
      const col = t === 'ice' || t === 'snow' || kind === 'icecrystal' ? '#80e0ff' : th.crys ? (th.crysDecor || th.crys)[(R() * th.crys.length) | 0] : R() < 0.5 ? '#b388ff' : '#4fc3f7';
      const spr = put(sprCrystal(14 + ((R() * 14) | 0), col, (R() * 4) | 0), 2);
      A.lights.push({ x, y: G - spr.h / 2, r: 30 + spr.h / 2, col, a: 0.45, f: 0.15, s: 1.2 });
      return spr;
    }
    case 'mushroomglow': {
      const tt = t === 'crystal' ? 'cave' : t;
      const spr = put(sprProp('mushroomglow', 0, tt), 1);
      A.lights.push({ x, y: G - 6, r: 22, col: tt === 'cave' ? '#60d0ff' : '#c070ff', a: 0.5, f: 0.25, s: 0.8 });
      return spr;
    }
    case 'pumpkin': {
      const spr = put(sprProp('pumpkin', 0, t), 1);
      A.lights.push({ x, y: G - 6, r: 20, col: '#ffa030', a: 0.55, f: 0.35 });
      return spr;
    }
    case 'pondbridge': {
      // cầu cong qua hồ cá koi: sprite rộng nên giữ cách cổng/NPC xa hơn bình thường
      const spr = pondBridgeSpr();
      if (m.portals.some((p) => Math.abs(p.x - x) < 70 + spr.w / 2) || (m.npcs || []).some((n) => Math.abs(n.x - x) < 26 + spr.w / 2)) return null;
      blit(T, spr, x - spr.w / 2, G - spr.h + 3);
      return spr;
    }
    case 'stonelantern': {
      const spr = put(sprProp('stonelantern', 0, t), 1);
      A.lights.push({ x, y: G - 19, r: 24, col: '#ffc060', a: 0.45, f: 0.2 });
      return spr;
    }
    case 'torch': {
      const spr = put(sprProp('torch', 0, t), 1);
      A.anims.push({ k: 'flame', x, y: G - 28 });
      A.lights.push({ x, y: G - 30, r: 34, col: '#ff8a2a', a: 0.55, f: 0.4 });
      return spr;
    }
    case 'banner': {
      const spr = sprProp('banner', 0, t);
      blit(T, spr, x - 3, G - spr.h + 1);
      A.anims.push({ k: 'flag', x: x, y: G - spr.h + 4, col: ['#c62828', '#1565c0', '#2e7d32', '#f9a825'][(R() * 4) | 0] });
      return spr;
    }
    case 'stalag': return put(sprProp('stalag', (R() * 3) | 0, t === 'crystal' ? 'cave' : t), 1);
    case 'coral': return put(sprProp(t === 'dragon_palace' ? 'coralfan' : 'coral', (R() * 3) | 0, t), 1);
    case 'pillar': return put(sprProp('pillar', (R() * 3) | 0, t), 2);
    case 'icespike': return put(sprProp('icespike', 0, t), 1);
    default: return put(sprProp(kind, (R() * 3) | 0, t), 1);
  }
}

export function buildFieldDecor(T, m, th, sc, R, A) {
  const G = m.ground;
  const list = th.decor || ['round', 'bush', 'rock'];
  const skip = (x) => m.portals.some((p) => Math.abs(p.x - x) < 64) || (m.npcs || []).some((n) => Math.abs(n.x - x) < 26);
  let x = 60 + R() * 40;
  let k = 0;
  while (x < m.w - 50) {
    const kind = R() < 0.25 ? list[(R() * list.length) | 0] : list[k++ % list.length];
    if (!skip(x)) placeDecor(T, m, th, sc, R, A, kind, x);
    const big = ['round', 'maple', 'sakura', 'willow', 'pine', 'bamboo', 'palm', 'deadtree', 'goldtree', 'kelp', 'cloudpillar', 'jadepillar', 'statue', 'obelisk'].includes(kind);
    x += (big ? 70 : 44) + R() * 70;
  }
  for (const p of m.portals) if (p.door) {
    const g = stoneGateSpr(m.theme);
    blit(T, g, p.x - g.w / 2, G - g.h + 1);
    A.lights.push({ x: p.x, y: G - 66, r: 16, col: '#7ad8ff', a: 0.6, f: 0.2 });
  }
  // vật nhỏ rải rác sát mặt đất
  const small = { grass: 'grass', cobble: 'grass', sand: 'shell', snow: 'rock', ice: 'icespike', rock: 'stalag', basalt: 'bones', tiles: null }[sc.ground];
  if (small === 'grass') for (let i = 0; i < m.w / 70; i++) placeDecor(T, m, th, sc, R, A, R() < 0.5 ? 'grass' : 'flower', R() * m.w);
  if (t2(m.theme)) for (let i = 0; i < m.w / 160; i++) { const xx = 80 + R() * (m.w - 160); if (!skip(xx)) placeDecor(T, m, th, sc, R, A, 'bones', xx); }
}
const t2 = (t) => t === 'desert' || t === 'cave';

// Cổng đá cho cửa dịch chuyển ngoài làng
function stoneGateSpr(theme) {
  return cached(`sgate:${theme}`, () => {
    const P = theme === 'desert' ? ['#ffe0a8', '#e2b678', '#b88a54', '#8a6038'] : theme === 'ice' || theme === 'snow' ? ['#f4fcff', '#c4e2f2', '#8ebcd8', '#6090b4'] : theme === 'lava' || theme === 'hell' ? ['#7a5a5a', '#5a4040', '#402c2c', '#2a1c1c'] : ['#cfcac0', '#a8a298', '#80796f', '#5a544c'];
    const W = 72;
    const H = 76;
    const s = new Buf(W, H);
    for (const x0 of [8, W - 20]) {
      for (let y = 14; y < H; y += 7) {
        const off = ((y / 7) & 1) ? 1 : 0;
        s.r(x0 - off, y, 12 + off, 7, P[1]);
        s.r(x0 - off, y, 12 + off, 1, P[0]);
        s.r(x0 - off, y, 2, 7, P[0]);
        s.r(x0 + 10, y, 2, 7, P[2]);
        s.r(x0 - off, y + 6, 12 + off, 1, P[3]);
      }
      s.r(x0 - 3, H - 6, 18, 6, P[2]);
      s.r(x0 - 3, H - 6, 18, 1, P[1]);
    }
    // vòm + đá đỉnh
    for (let x = 4; x < W - 4; x++) {
      const f = (x - W / 2) / (W / 2 - 4);
      const y = 14 - Math.round((1 - f * f) * 6);
      s.r(x, y, 1, 9, P[1]);
      s.p(x, y, P[0]);
      s.p(x, y + 8, P[3]);
    }
    s.r(0, 4, W, 5, P[2]);
    s.r(0, 4, W, 1, P[0]);
    s.r(W / 2 - 7, 2, 14, 14, P[1]);
    s.r(W / 2 - 7, 2, 14, 1, P[0]);
    s.r(W / 2 - 3, 6, 6, 6, '#7ad8ff');
    s.r(W / 2 - 2, 7, 4, 4, '#e8fcff');
    if (theme === 'bamboo' || theme === 'mist' || theme === 'lake') for (let x = 0; x < W; x++) if ((x * 7) % 5 < 2 && s.has(x, 5)) s.p(x, 4, '#6a9a4a');
    if (theme === 'ice' || theme === 'snow') { s.r(0, 3, W, 2, '#ffffff'); for (let x = 2; x < W; x += 5) s.r(x, 9, 1, 2 + (x % 4), '#dff6ff'); }
    return s.outline(0.55);
  });
}
