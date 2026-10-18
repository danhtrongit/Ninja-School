// Biến thể hình theo loài quái và bảng màu tông theo def.pal.
import { parse, rgb2hsl, adj, T } from './palette.js';
import { IRON, WOOD } from './parts.js';
import { HUM } from './humanoid.js';

// ================= BẢNG MÀU & CACHE =================
const VARIANT = {
  monkey: 'monkey', oni: 'oni', boss_oni: 'oniK',
  bee: 'bee', demonbat: 'demon', boss_bat: 'batK', bat: 'bat', crystalbat: 'cbat', flowerfairy: 'fairy', thunderbird: 'bird',
  scorpion: 'scorp',
  yeti: 'yeti', boss_yeti: 'yetiK', icegolem: 'ice', lavagolem: 'lava', rockgolem: 'rock',
  treant: 'tree', stoneguard: 'statue', coralgolem: 'coral', crystalgolem: 'crystal', boss_crystal: 'crystalK',
  fireghost: 'fire', frostghost: 'frost', cloudspirit: 'cloud',
  crab2: 'emperor', gemcrab: 'gem', abyssdemon: 'abyss', boss_slime: 'king',
  hellhound: 'hound', darkdragon: 'dragon',
  foxspirit: 'fox', boss_fox: 'fox9', icewolf: 'ice', boss_wolf: 'wolfK', bonedragon: 'bone',
  sandworm: 'worm', seaserpent: 'serpent', boss_dragon: 'dragonK',
  // Tà Thú (boss sự kiện): dùng lại thân boss có sẵn, bảng màu riêng
  ev_hacviem: 'wolfK', ev_bangphach: 'crystalK', ev_huyetnguyet: 'oniK',
};
export function variantOf(def) {
  if (def.type === 'humanoid') return HUM[def.k] ? def.k : 'bandit';
  return VARIANT[def.k] || '';
}

const palCache = new Map();
export function palTones(pal) {
  const key = pal.join('|');
  let P = palCache.get(key);
  if (P) return P;
  const [a, b, c] = pal;
  const lightB = rgb2hsl(...parse(b))[2];
  const lightC = rgb2hsl(...parse(c))[2];
  P = {
    a: T(a), b: T(b), c: T(c),
    aD: T(adj(a, -0.1)), aL: T(adj(a, 0.12)), bD: T(adj(b, -0.12)),
    b2: lightB > 0.45 ? T(b) : T(adj(a, 0.16)),
    ear: T('#e9a1b0'),
    horn: T(lightC >= 0.45 ? c : '#f3e2b8'), bone: T('#efe4c8'),
    hair: T(lightC < 0.3 ? c : '#2b1d24'),
    face: T(adj(b, lightB > 0.6 ? -0.08 : 0)), faceL: T(adj(b, 0.1)),
    hat: T(adj(c, -0.12)), knit: T('#f4f1ea'), carrot: T('#ff8a26'), twig: T('#6b4428'),
    tiger: T('#f3b62b'), iron: T(IRON), eyeW: T('#ffffff'), wood: T(WOOD),
    wing: T(lightC > 0.75 ? c : '#e6f4ff', 165), ice: T('#e6fbff'), sting: T(lightC < 0.35 ? c : adj(b, -0.3)),
  };
  palCache.set(key, P);
  return P;
}
