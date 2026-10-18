'use strict';

// Thú cưng: cho ăn, kỹ năng tự động (nhặt đồ, hồi máu), thân mật giảm dần. Cấp/EXP thú xử lý trong Player
const { ITEMS } = require('../../../shared/data/items');
const { PET, petClientInfo } = require('../../../shared/data/pets');

class Pets {
  constructor(world) {
    this.world = world;
  }

  // Cho thú cưng đang mang theo ăn: +EXP thú, +thân mật. Thú đã tối đa cả cấp lẫn thân mật thì không cho ăn
  feedPet(p, slot, def, now) {
    const it = p.pet;
    if (!it) return p.notice('Hãy mang thú cưng theo trước khi cho ăn.', 'warn');
    if (now - p.lastFeed < PET.feedCd) return;
    const e = def.effect || {};
    const maxLv = it.plv >= PET.maxLv;
    if (maxLv && it.love >= PET.loveMax) return p.notice(`${ITEMS[it.id].name} đã no nê, cấp và thân mật đều tối đa.`);
    p.lastFeed = now;
    // thức ăn khóa (mua bằng xu khóa) làm thú khóa theo, để xu khóa không thành giá trị giao dịch được
    const fb = !!(p.c.inv[slot] && p.c.inv[slot].b) && !it.b;
    if (fb) it.b = 1;
    p.removeAt(slot, 1);
    const love0 = it.love;
    it.love = Math.min(PET.loveMax, it.love + (e.love || 0));
    const got = maxLv ? 0 : p.petAddExp(e.petExp || 0);
    p.markPet();
    this.world.db.dirty = true;
    if (p.map) p.map.broadcast('petAct', { id: p.id, k: 'feed' });
    const parts = [];
    if (got) parts.push(`+${got.toLocaleString('vi-VN')} EXP`);
    if (it.love > love0) parts.push(`+${it.love - love0} thân mật`);
    if (fb) parts.push('thú cưng đã bị khóa');
    p.notice(`${ITEMS[it.id].name} ăn ${def.name}: ${parts.join(', ') || 'đã no'}.`, 'reward');
  }
}

module.exports = {
  name: 'pets',
  init: (world) => new Pets(world),
  hooks: {
    clientData(out) {
      out.pet = petClientInfo();
    },
    // kỹ năng tự động của thú cưng (nhặt đồ, hồi máu)
    tick(now, tickN) {
      if (tickN % 5 === 0) for (const p of this.world.players.values()) p.petTick(now);
    },
    // thú cưng đang mang theo đói dần
    playerSecond: {
      order: 3,
      fn(p) {
        if (p.c.playtime % PET.loveDecay === 0) p.petDecay();
      },
    },
  },
  Pets,
};
