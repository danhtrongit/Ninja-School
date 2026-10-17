// Icon vật phẩm, kỹ năng và giao diện (pixel art vẽ bằng code)
import { shade } from './sprites.js';

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

// Icon kỹ năng: trả về dataURL ảnh vuông (bản tạm, sẽ được vẽ chi tiết)
const skillCache = new Map();
export function skillIconURL(sk, sid, elColor) {
  const key = `${sid}|${elColor}`;
  if (skillCache.has(key)) return skillCache.get(key);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = elColor || '#8d6e63';
  g.fillRect(1, 1, 14, 14);
  g.fillStyle = '#ffffff';
  g.fillRect(6, 3, 4, 10);
  const u = c.toDataURL();
  skillCache.set(key, u);
  return u;
}

// Icon giao diện theo tên: bag, char, skill, quest, party, friends, clan, rank, map, gift, wheel, settings,
// auto, pk, chat, talk, pick, target, xu, luong, attack, close (bản tạm)
const uiCache = new Map();
export function uiIconURL(name) {
  if (uiCache.has(name)) return uiCache.get(name);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#e8c271';
  g.fillRect(3, 3, 10, 10);
  const u = c.toDataURL();
  uiCache.set(name, u);
  return u;
}
