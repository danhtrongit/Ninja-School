'use strict';

// Hằng số nhân vật dùng chung (server, công cụ kiểm tra dữ liệu)
const MAX_LEVEL = 120;
const INV_SIZE = 40;
const STORAGE_SIZE = 60;
// Mở rộng hành trang bằng lượng: lần thứ i thêm `step` ô với giá cost[i], tối đa INV_SIZE + step × cost.length ô
const INV_EXPAND = { step: 10, cost: [50, 100, 150, 200, 300, 400] };
// số ô mỗi bộ kỹ năng và số bộ
const HOTBAR = 6;
const HOTBAR_SETS = 3;
// Buff lưu lâu dài (giữ khi thoát game): khóa → [chỉ số, giá trị, tên]
const PERSIST_BUFFS = {
  exp2: ['exp', 100, 'Nhân đôi EXP'],
  food_atk: ['atkPct', 10, 'Bánh Bao Sức Mạnh'],
  food_def: ['defPct', 10, 'Trà Thiết Bích'],
  food_hp: ['hpPct', 10, 'Canh Nhân Sâm'],
};

// Số ô hành trang của nhân vật theo số lần đã mở rộng (c.invExt)
function invSize(c) {
  const n = Number.isInteger(c && c.invExt) ? Math.max(0, Math.min(c.invExt, INV_EXPAND.cost.length)) : 0;
  return INV_SIZE + n * INV_EXPAND.step;
}

// Hồi chiêu bình thuốc (ms), chung mọi cỡ bình. Ngắn quá thì uống liên tục, sát thương boss mất ý nghĩa
const POTION_CD = { hp: 4000, mp: 1500 };
// Trần xu thường mang theo: nhận xu từ người chơi khác mà vượt trần thì từ chối (không cắt mất tiền)
const XU_MAX = 2e9;
// Dùng nhiều một lần (rương, đồ ăn, bí kíp): tối đa max món, buff cộng dồn không quá buffCap ms
const USE_MANY = { max: 50, buffCap: 24 * 3600 * 1000 };

// Hồi sinh tại chỗ: bảo hộ guard ms (dùng kỹ năng là hết), giá lượng leo thang theo số lần trong cửa sổ win ms
const REVIVE = { guard: 3000, win: 600000, cost: [1, 2, 3] };
// Đang được bảo hộ sau hồi sinh: còn hạn và chưa ra chiêu nào kể từ lúc hồi sinh (lastSkillAt đổi = đã ra chiêu)
function reviveGuarded(p, now) {
  const g = p.guard;
  return !!g && now < g.until && p.lastSkillAt === g.skill;
}
// Giá lượng lần hồi sinh tại chỗ kế tiếp theo các mốc đã hồi sinh (log) còn trong cửa sổ
function reviveLuong(log, now) {
  const n = (log || []).filter((t) => now - t < REVIVE.win).length;
  return REVIVE.cost[Math.min(n, REVIVE.cost.length - 1)];
}

module.exports = { MAX_LEVEL, INV_SIZE, INV_EXPAND, invSize, STORAGE_SIZE, HOTBAR, HOTBAR_SETS, PERSIST_BUFFS, POTION_CD, USE_MANY, XU_MAX, REVIVE, reviveGuarded, reviveLuong };
