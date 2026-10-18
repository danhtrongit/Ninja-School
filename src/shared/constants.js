'use strict';

// Hằng số nhân vật dùng chung (server, công cụ kiểm tra dữ liệu)
const MAX_LEVEL = 120;
const INV_SIZE = 40;
const STORAGE_SIZE = 60;
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

module.exports = { MAX_LEVEL, INV_SIZE, STORAGE_SIZE, HOTBAR, HOTBAR_SETS, PERSIST_BUFFS };
