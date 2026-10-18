'use strict';

// Bảng vật phẩm: mỗi loại một file, dựng theo đúng thứ tự cũ (thứ tự khóa ITEMS không đổi)
const base = require('./base');
const equipment = require('./equipment');
const consumables = require('./consumables');
const pets = require('./pets');
const fashion = require('./fashion');
const books = require('./books');
const gems = require('./gems');
const { buildShops } = require('./shops');
const { PET, cleanPet } = require('../pets');

equipment.build();
consumables.build();
pets.build();
fashion.build();
consumables.buildMisc();
books.build();
gems.build();
consumables.buildQuest();
const SHOPS = buildShops();

const { ITEMS, SLOTS, GEAR_SLOTS, FASHION_SLOTS, TIERS, SLOT_NAMES, RARITY, TIER_NAMES, TIER_LV, TIER_COLORS, STAT_LABELS } = base;
const { BOOKS } = books;
const { GEM, GEM_TYPES, GEM_KINDS, gemId, gemHoles, gemDef, randomGem, cleanGems } = gems;
const { FASHION, FASHION_DAYS, rollFashion } = fashion;
const { UPGRADE, makeItem, itemStats, sellPrice, rollOptions } = equipment;

module.exports = {
  ITEMS, SHOPS, BOOKS, GEM, GEM_TYPES, GEM_KINDS, SLOTS, GEAR_SLOTS, FASHION_SLOTS, FASHION, FASHION_DAYS, TIERS, SLOT_NAMES, RARITY, TIER_NAMES, TIER_LV, TIER_COLORS, STAT_LABELS, UPGRADE,
  makeItem, itemStats, sellPrice, rollOptions, rollFashion, gemId, gemHoles, gemDef, randomGem, cleanGems, cleanPet, PET,
};
