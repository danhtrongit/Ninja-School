// Icon vật phẩm, kỹ năng và giao diện (pixel art vẽ bằng code, cache theo khóa)
import { shade } from './sprites.js';
import { OUT, RARITY_COL, mkCanvas, Pix, FIX, tierPal } from './icons/pix.js';
import { ITEM_MAPS, drawHat, drawFood, drawMooncake, drawShurikenBig, drawFan, drawAmulet, drawPotion, drawGem, drawGemIcon, gemGlow, drawRing, drawNecklace, drawCoin } from './icons/items.js';
import { drawPetIcon, drawPetFood, drawMaskIcon, drawCloakIcon, drawCostumeIcon, drawMountIcon } from './icons/fashion.js';
export { skillIconURL } from './icons/skills.js';
export { uiIconURL } from './icons/ui.js';

// size (tùy chọn): kích thước thu nhỏ, ví dụ 12 khi vẽ trên mặt đất
export function iconCanvas(icon, rarity, size) {
  if (size && size !== 16) return smallIcon(icon, rarity, size);
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}`;
  let c = iconCache.get(key);
  if (c) return c;
  const P = new Pix(16, 16);
  const col = icon.c || '#9e9e9e';
  const m = ITEM_MAPS[icon.k];
  switch (icon.k) {
    case 'shuriken': drawShurikenBig(P, col); break;
    case 'fan': drawFan(P, col); break;
    case 'amulet': drawAmulet(P, col); break;
    case 'potion': drawPotion(P, col, icon.s); break;
    case 'stone': drawGem(P, col); break;
    case 'ring': drawRing(P, col); break;
    case 'necklace': drawNecklace(P, col); break;
    case 'xu': drawCoin(P, true); break;
    case 'hat': drawHat(P, col); break;
    case 'food': drawFood(P, col); break;
    case 'pet': drawPetIcon(P, col, icon.s); break;
    case 'petfood': drawPetFood(P, col, icon.s); break;
    case 'mask': drawMaskIcon(P, icon.s); break;
    case 'cloak': drawCloakIcon(P, col, icon.s); break;
    case 'costume': drawCostumeIcon(P, col, icon.s); break;
    case 'mount': drawMountIcon(P, col, icon.s); break;
    case 'gem': drawGemIcon(P, col, icon.s); break;
    case 'mooncake': drawMooncake(P, col); break;
    default:
      if (m) P.map(m, tierPal(col));
      else {
        P.rect(3, 3, 10, 10, col);
        P.rect(3, 3, 10, 2, shade(col, 0.4));
      }
  }
  if (icon.k === 'chest') {
    P.map(['..GG..', '.GYYG.', '.GxxG.', '..GG..'], FIX, 7 - 2, 6);
  }
  // sách nội tại: huy hiệu mũi tên ngọc ở góc, khớp khung icon kỹ năng nội tại (phân biệt với bí kíp thường)
  if (icon.k === 'book' && icon.s === 'pas') {
    P.map(['.ooooo.', 'oeEwEeo', 'oEwwwEo', 'owwwwwo', 'oEEwEEo', 'oeEwEeo', '.ooooo.'], FIX, 9, 9);
  }
  P.outline(OUT);
  if (icon.k === 'gem') gemGlow(P, icon);
  if (rarity) {
    const rc = RARITY_COL[rarity];
    P.halo(rc, 0.35 + rarity * 0.12, rarity >= 3 ? 2 : 1);
    if (rarity >= 2) {
      const sp = rarity >= 3 ? '#ffffff' : rc;
      P.set(14, 1, sp);
      P.set(13, 1, rc, 0.8);
      P.set(15, 1, rc, 0.8);
      P.set(14, 0, rc, 0.8);
      P.set(14, 2, rc, 0.8);
    }
    if (rarity >= 4) {
      P.set(1, 14, '#ffffff');
      P.set(0, 14, rc, 0.8);
      P.set(2, 14, rc, 0.8);
      P.set(1, 13, rc, 0.8);
      P.set(1, 15, rc, 0.8);
    }
  }
  c = P.canvas();
  iconCache.set(key, c);
  return c;
}
const iconCache = new Map();

// Thu nhỏ có lọc (giữ mép sắc bằng ngưỡng alpha) cho vật phẩm rơi trên đất
const smallCache = new Map();
function smallIcon(icon, rarity, size) {
  const key = `${icon.k}|${icon.c}|${icon.s || 0}|${rarity || 0}|${size}`;
  let c = smallCache.get(key);
  if (c) return c;
  const base = iconCanvas(icon, rarity);
  c = mkCanvas(size, size);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(base, 0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 3] = d[i + 3] < 110 ? 0 : 255;
  }
  g.putImageData(img, 0, 0);
  smallCache.set(key, c);
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
