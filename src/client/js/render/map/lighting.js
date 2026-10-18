// Giờ Việt Nam, ngày/đêm và tùy chọn ánh sáng.
import { clamp, hx } from './util.js';

// Giờ thực Việt Nam (UTC+7) dạng số thực 0-24
export function vnHour(now = Date.now()) {
  return (((now / 3600000 + 7) % 24) + 24) % 24;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (h, c, w) => { const d = Math.abs(h - c) / w; return d >= 1 ? 0 : (1 - d * d) * (1 - d * d); };
// Pha trong ngày: night (đêm), dusk (hoàng hôn), dawn (bình minh), mỗi giá trị 0-1
export function dayPhase(h) {
  return { night: h < 12 ? 1 - smooth(4.6, 6.4, h) : smooth(18.2, 19.6, h), dusk: bump(h, 17.9, 1.5), dawn: bump(h, 5.8, 1.2) };
}
export const NIGHT_RGB = [80, 98, 172];
export const DUSK_RGB = [255, 168, 116];
export const DAWN_RGB = [255, 188, 212];
// Phần bóng tối còn đè lên nhân vật/quái khi game gọi drawNight trước thực thể (để quái vẫn đọc rõ ban đêm)
export const ENT_DARK = 0.4;
// Chỉ gọi drawLighting (không có drawNight): giảm độ tối toàn khung cho thực thể khỏi chìm
export const SINGLE_DARK = 0.78;
const _mulCol = new Map();
export function mulColor(r, g, b) {
  r = clamp(r | 0, 0, 255); g = clamp(g | 0, 0, 255); b = clamp(b | 0, 0, 255);
  const k = ((r >> 1) << 16) | ((g >> 1) << 8) | (b >> 1);
  let v = _mulCol.get(k);
  if (!v) { v = hx((r >> 1) * 2, (g >> 1) * 2, (b >> 1) * 2); _mulCol.set(k, v); }
  return v;
}
// Vệt sáng đục (nền đen, tâm trắng) dùng với 'lighten': chồng nhiều đèn chỉ lấy đèn sáng nhất, không cộng dồn thành mảng trắng
const LSPR = new Map();
export function lightSpr(r) {
  let g = LSPR.get(r);
  if (!g) {
    g = document.createElement('canvas');
    g.width = g.height = r * 2;
    const c = g.getContext('2d');
    c.fillStyle = '#000000';
    c.fillRect(0, 0, r * 2, r * 2);
    const gr = c.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, r * 2, r * 2);
    LSPR.set(r, g);
  }
  return g;
}
// Mức lớp ngày/đêm người chơi chọn: 1 = đủ, 0 = tắt (lưu theo trình duyệt)
const LIGHT_KEY = 'ninja.daynight';
export let lightPref = 1;
try {
  const v = localStorage.getItem(LIGHT_KEY);
  if (v != null && v !== '') lightPref = clamp(Number(v) || 0, 0, 1);
} catch (e) { /* trình duyệt chặn lưu trữ: giữ mặc định */ }
export function setLighting(k) {
  lightPref = clamp(Number(k) || 0, 0, 1);
  try { localStorage.setItem(LIGHT_KEY, String(lightPref)); } catch (e) { /* không lưu được thì chỉ áp dụng phiên này */ }
}
export function getLighting() {
  return lightPref;
}
