'use strict';

const { ITEMS, add, GEAR_SLOTS } = require('./base');

// Ngọc khảm: 6 loại × 10 cấp, id gem_<loại>_<cấp>, cộng dồn trong túi như đá cường hóa.
// Ghép 3 viên cấp N (cùng loại) thành 1 viên cấp N+1 ở Thợ Rèn. unit '%' = chỉ số phần trăm (giữ 1 chữ số lẻ).
const GEM_MAX = 10;
const GEM_TYPES = {
  hoa: { name: 'Hỏa Tâm Ngọc', stat: 'atk', label: 'tấn công', unit: '', c: '#ff5a1f', v: [12, 28, 50, 80, 120, 170, 230, 300, 380, 470] },
  thuy: { name: 'Thủy Linh Ngọc', stat: 'hp', label: 'sinh lực', unit: '', c: '#3fa9f5', v: [60, 140, 250, 400, 600, 850, 1150, 1500, 1900, 2400] },
  tho: { name: 'Thổ Giáp Ngọc', stat: 'def', label: 'phòng thủ', unit: '', c: '#e0952a', v: [8, 18, 32, 50, 75, 105, 140, 180, 225, 280] },
  phong: { name: 'Phong Ảnh Ngọc', stat: 'dodge', label: 'né tránh', unit: '%', c: '#5fd36a', v: [0.4, 0.6, 0.9, 1.2, 1.6, 2, 2.5, 3, 3.5, 4] },
  loi: { name: 'Lôi Quang Ngọc', stat: 'crit', label: 'chí mạng', unit: '%', c: '#9b7bff', v: [0.4, 0.6, 0.9, 1.2, 1.6, 2, 2.5, 3, 3.5, 4] },
  huyet: { name: 'Huyết Hồn Ngọc', stat: 'lifesteal', label: 'hút máu', unit: '%', c: '#e8304f', v: [0.3, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.4, 2.8, 3.2] },
};
const GEM_KINDS = Object.keys(GEM_TYPES);
const GEM = {
  max: GEM_MAX,
  // tỉ lệ ghép thành công theo cấp đang ghép (1→2 … 9→10); thất bại mất 1 viên, trả lại 2
  rate: [100, 90, 80, 70, 60, 50, 40, 32, 25],
  mergeCost: (lv) => 1000 * lv * lv,
  takeCost: (lv) => 300 + 200 * lv * lv,
  // số lỗ khảm theo bậc trang bị: Gỗ-Sắt 1, Bạc-Huyền 2, Long trở lên 3
  holes: (tier) => (tier <= 2 ? 1 : tier <= 6 ? 2 : 3),
  // trần tổng % hút máu (của đòn gây ra)
  lifestealCap: 15,
  // quái thường rơi ngọc
  dropRate: 0.012,
  price: (lv) => 1500 * Math.pow(3, lv - 1),
};
const gemId = (k, lv) => `gem_${k}_${lv}`;
const fmtGem = (t, v) => `+${t.unit === '%' ? v : v.toLocaleString('vi-VN')}${t.unit} ${t.label}`;

function build() {
  for (const k of GEM_KINDS) {
    const t = GEM_TYPES[k];
    for (let lv = 1; lv <= GEM_MAX; lv++) {
      add(gemId(k, lv), {
        name: `${t.name} Cấp ${lv}`, type: 'gem', gem: k, glv: lv, lv: 1, price: GEM.price(lv), stack: 999,
        icon: { k: 'gem', c: t.c, s: `${k}${lv}` },
        desc: `Khảm vào trang bị tại Thợ Rèn: ${fmtGem(t, t.v[lv - 1])}.${lv < GEM_MAX ? ` Ghép 3 viên thành ${t.name} Cấp ${lv + 1}.` : ' Cấp cao nhất.'}`,
      });
    }
  }
}

// Số lỗ khảm của một loại trang bị (thú cưng, thời trang không có lỗ)
function gemHoles(def) {
  return def && def.type === 'equip' && !def.noUpgrade && GEAR_SLOTS.includes(def.slot) ? GEM.holes(def.tier || 0) : 0;
}
// Ngọc ngẫu nhiên cấp lv (rơi đồ)
function randomGem(lv) {
  return gemId(GEM_KINDS[Math.floor(Math.random() * GEM_KINDS.length)], Math.max(1, Math.min(GEM_MAX, lv | 0)));
}
const gemDef = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id) && ITEMS[id].type === 'gem' ? ITEMS[id] : null);
// Dọn mảng ngọc của một món (dữ liệu cũ/hỏng): bỏ id lạ, cắt theo số lỗ, bỏ loại trùng
function cleanGems(it) {
  if (!it || it.gems === undefined) return it;
  const n = gemHoles(ITEMS[it.id]);
  const seen = new Set();
  const g = (Array.isArray(it.gems) ? it.gems : []).slice(0, n).map((id) => {
    const d = gemDef(id);
    if (!d || seen.has(d.gem)) return null;
    seen.add(d.gem);
    return id;
  });
  if (g.some(Boolean)) it.gems = g;
  else delete it.gems;
  return it;
}

module.exports = { build, GEM, GEM_TYPES, GEM_KINDS, gemId, gemHoles, randomGem, gemDef, cleanGems };
