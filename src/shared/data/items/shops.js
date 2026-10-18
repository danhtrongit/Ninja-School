'use strict';

const { GEM_KINDS, gemId } = require('./gems');
const { FASHION_SHOP } = require('./fashion');
const { BOOKS } = require('./books');
const { PET_SHOP, PET_FOOD_XU, PET_FOOD_LUONG } = require('./pets');

// Hàng bán tại NPC (gọi sau khi đã dựng xong ITEMS: danh sách sách lấy từ bảng kỹ năng)
function buildShops() {
  return {
    potion: {
      name: 'Tiệm Thuốc',
      items: ['hp1', 'hp2', 'hp3', 'hp4', 'mp1', 'mp2', 'mp3', 'mp4', 'scroll_home', 'food_atk', 'food_def', 'food_hp', ...PET_FOOD_XU],
      luong: ['exp2', 'charm', 'revive_card', ...PET_SHOP, ...PET_FOOD_LUONG, ...FASHION_SHOP, ...BOOKS],
    },
    smith: {
      name: 'Lò Rèn',
      items: ['stone1', ...GEM_KINDS.map((k) => gemId(k, 1))],
      equipTiers: [0, 1, 2, 3],
    },
  };
}

module.exports = { buildShops };
