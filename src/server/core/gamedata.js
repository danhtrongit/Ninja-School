'use strict';

// Gói 'data': toàn bộ dữ liệu tĩnh gửi máy khách ngay khi kết nối (máy khách đọc qua S.G, không chép dữ liệu game)
const { CLASSES, ELEMENTS, STAT_NAMES } = require('../../shared/data/classes');
const { SKILLS, SKILL_MAX_LV, PASSIVE_STATS } = require('../../shared/data/skills');
const { ITEMS, SLOTS, GEAR_SLOTS, FASHION_SLOTS, SLOT_NAMES, RARITY, TIER_COLORS, STAT_LABELS } = require('../../shared/data/items');
const { MONSTERS } = require('../../shared/data/monsters');
const { clientMaps, NPC_TYPES, GROUND } = require('../../shared/data/maps');
const { MAIN_QUESTS } = require('../../shared/data/quests');
const { MAX_LEVEL, HOTBAR, HOTBAR_SETS } = require('../../shared/constants');
const { expNeed } = require('../../shared/formulas');
const hooks = require('./modules');

// Chuỗi JSON dựng sẵn một lần; các module thêm phần riêng qua móc 'clientData' (cường hóa, ngọc, thú cưng, lễ hội...)
// extra: phần do máy chủ HTTP dựng (art: danh mục atlas ảnh ×3)
function buildGameData(version, extra = {}) {
  const out = {
    t: 'data', version,
    classes: CLASSES, elements: ELEMENTS, statNames: STAT_NAMES, skills: SKILLS, skillMax: SKILL_MAX_LV, passiveStats: PASSIVE_STATS,
    items: ITEMS, slots: SLOTS, gearSlots: GEAR_SLOTS, fashionSlots: FASHION_SLOTS, slotNames: SLOT_NAMES, rarity: RARITY, tierColors: TIER_COLORS, statLabels: STAT_LABELS,
    monsters: Object.fromEntries(Object.entries(MONSTERS).map(([k, m]) => [k, { name: m.name, lv: m.lv, type: m.type, pal: m.pal, el: m.el, boss: !!m.boss, event: !!m.event, scale: m.scale, w: m.w, h: m.h, fly: m.fly, ranged: m.ranged, aggro: m.aggro, drops: m.drops || [] }])),
    maps: clientMaps(), npcTypes: NPC_TYPES, ground: GROUND,
    quests: MAIN_QUESTS.map((q) => ({ name: q.name, req: q.req })),
    expTable: Array.from({ length: MAX_LEVEL + 1 }, (_, i) => (i ? expNeed(i) : 0)),
    maxLevel: MAX_LEVEL, hotbar: HOTBAR, hotbarSets: HOTBAR_SETS,
    art: {},
    ...extra,
  };
  hooks.call('clientData', out);
  return JSON.stringify(out);
}

module.exports = { buildGameData };
