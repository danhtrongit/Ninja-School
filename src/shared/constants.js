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
// Dùng nhiều một lần (rương, đồ ăn, bí kíp): tối đa max món, buff cộng dồn không quá buffCap ms
const USE_MANY = { max: 50, buffCap: 24 * 3600 * 1000 };

module.exports = { MAX_LEVEL, INV_SIZE, INV_EXPAND, invSize, STORAGE_SIZE, HOTBAR, HOTBAR_SETS, PERSIST_BUFFS, POTION_CD, USE_MANY };
