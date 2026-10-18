'use strict';

const { expNeed } = require('../formulas');

// Thú cưng: cấp 1-50, EXP, độ thân mật, kỹ năng tự động. Chỉ số lưu trên chính món đồ:
// it.plv (cấp), it.pexp (EXP trong cấp hiện tại), it.love (thân mật 0-100). Thiếu trường = giá trị mặc định.
const PET = {
  maxLv: 50,
  // EXP thú cần để lên cấp lv + 1 (cùng công thức với nhân vật)
  need: expNeed,
  // phần EXP chủ nhận được khi diệt quái chia cho thú; nhân thêm (1 + thân mật/100), thân mật 100 = 20%
  share: 0.1,
  loveMax: 100,
  loveStart: 50,
  // dưới mức này thú dỗi, không dùng kỹ năng (cho ăn để dỗ)
  loveLazy: 20,
  // mang theo mỗi 10 phút chơi thì thân mật giảm 1
  loveDecay: 600,
  // mỗi cấp: chỉ số cộng thẳng +3% chỉ số gốc, chỉ số phần trăm +1.5%
  growth: 0.03,
  growthPct: 0.015,
  feedCd: 250,
};
// Chỉ số phần trăm của thú (tăng chậm hơn theo cấp)
const PET_PCT = ['expPct', 'crit', 'dodge', 'skillDmg', 'hpPct', 'spd', 'lifesteal'];

// Kỹ năng tự động (server tự chạy khi thú đi theo và thân mật >= loveLazy)
const PET_SKILLS = {
  pick: {
    name: 'Tha Đồ', every: 1500,
    // bán kính nhặt quanh chủ (px)
    r: (lv) => 60 + 2 * lv,
  },
  heal: {
    name: 'Hồi Xuân', every: 4000,
    // chỉ hồi khi chủ dưới below% sinh lực; % sinh lực tối đa mỗi lần
    below: 70,
    pct: (lv) => Math.round((1 + 0.06 * (lv - 1)) * 100) / 100,
  },
};

// Thú cưng: [mã, tên, cấp yêu cầu, chỉ số cấp 1, giá lượng (0 = chỉ rơi từ boss), mã hình (petart.js), kỹ năng]
const PETS = [
  ['pet_slime', 'Slime Con', 1, { expPct: 5, hp: 100 }, 20, 'slime', ['heal']],
  ['pet_bunny', 'Thỏ Ngọc', 10, { expPct: 8, crit: 2, hp: 200 }, 40, 'bunny', ['pick']],
  ['pet_bat', 'Dơi Nhỏ', 30, { expPct: 10, atk: 40, dodge: 2 }, 70, 'bat', ['pick']],
  ['pet_fox', 'Hồ Ly Con', 50, { expPct: 15, atk: 90, crit: 3 }, 120, 'fox', ['heal']],
  ['pet_ghost', 'Linh Hồn Nhỏ', 70, { expPct: 18, mp: 400, skillDmg: 6 }, 160, 'ghost', ['heal']],
  ['pet_dragon', 'Rồng Con', 100, { expPct: 25, atk: 220, hp: 1200, crit: 4 }, 0, 'dragon', ['pick', 'heal']],
];

// Thức ăn thú: [mã, tên, EXP thú, thân mật, giá xu, giá lượng, hình icon, màu]
const PET_FOOD = [
  ['pf_grain', 'Bánh Gạo Linh Thú', 300, 3, 600, 0, 'grain', '#f3d27a'],
  ['pf_fish', 'Cá Khô Ngân Lân', 2500, 6, 4000, 0, 'fish', '#9fc3d9'],
  ['pf_pill', 'Linh Thú Đan', 15000, 15, 0, 5, 'pill', '#e5484d'],
];

const clampInt = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.floor(+v))) : d);

// Chuẩn hóa trường thú trên món đồ (dữ liệu cũ thiếu trường, hoặc bị sửa tay)
function cleanPet(it) {
  if (!it) return it;
  it.plv = clampInt(it.plv, 1, PET.maxLv, 1);
  it.pexp = it.plv >= PET.maxLv ? 0 : clampInt(it.pexp, 0, PET.need(it.plv) - 1, 0);
  it.love = clampInt(it.love, 0, PET.loveMax, PET.loveStart);
  return it;
}

// Hệ số chỉ số theo cấp thú
function petMul(k, lv) {
  return 1 + (PET_PCT.includes(k) ? PET.growthPct : PET.growth) * (Math.max(1, lv | 0) - 1);
}

// Bảng tra gửi máy khách (không gửi hàm)
function petClientInfo() {
  const lvs = Array.from({ length: PET.maxLv + 1 }, (_, i) => i);
  return {
    maxLv: PET.maxLv, share: PET.share, loveMax: PET.loveMax, loveLazy: PET.loveLazy, loveDecay: PET.loveDecay,
    growth: PET.growth, growthPct: PET.growthPct, pct: PET_PCT,
    need: lvs.map((l) => (l ? PET.need(l) : 0)),
    skills: {
      pick: { name: PET_SKILLS.pick.name, every: PET_SKILLS.pick.every, r: lvs.map((l) => (l ? PET_SKILLS.pick.r(l) : 0)) },
      heal: { name: PET_SKILLS.heal.name, every: PET_SKILLS.heal.every, below: PET_SKILLS.heal.below, pct: lvs.map((l) => (l ? PET_SKILLS.heal.pct(l) : 0)) },
    },
  };
}

module.exports = { PET, PET_PCT, PET_SKILLS, PETS, PET_FOOD, cleanPet, petMul, petClientInfo };
