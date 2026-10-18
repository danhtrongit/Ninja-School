// Cache khung hình quái theo (kiểu, biến thể, khung, bảng màu).
import { Spr } from './spr.js';
import { DESIGNS } from './designs.js';
import { palTones } from './variants.js';

const sprCache = new Map();
export function getSprite(type, v, an, i, pal, bl) {
  const key = `${type}|${v}|${an}${i}${bl ? 'b' : ''}|${pal[0]}|${pal[1]}|${pal[2]}`;
  let sp = sprCache.get(key);
  if (sp) return sp;
  const D = DESIGNS[type];
  const S = new Spr(D.W, D.H);
  D.draw(S, palTones(pal), an, i, v, bl);
  sp = S.bake();
  sprCache.set(key, sp);
  return sp;
}

// Cache nhanh theo đối tượng def (tránh tạo chuỗi khóa mỗi khung hình)
export const defSpr = new WeakMap();
