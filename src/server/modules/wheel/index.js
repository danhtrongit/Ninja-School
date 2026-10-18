'use strict';

// Vòng Quay May Mắn (xu hoặc lượng)
const { WHEEL } = require('../../../shared/data/extras');
const { FASHION_DAYS } = require('../../../shared/data/items');
const { giveReward } = require('../../services/reward');

class Wheel {
  constructor(world) {
    this.world = world;
  }

  spin(p, m) {
    const now = Date.now();
    if (now - (p.lastSpin || 0) < 1200) return;
    const cur = m.cur === 'luong' ? 'luong' : 'xu';
    const cost = WHEEL.cost[cur];
    if ((cur === 'luong' ? p.c.luong : p.c.xu) < cost) return p.notice(cur === 'luong' ? 'Không đủ lượng.' : 'Không đủ xu.', 'warn');
    const key = cur === 'luong' ? 'wl' : 'w';
    const total = WHEEL.prizes.reduce((s, x) => s + x[key], 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < WHEEL.prizes.length - 1; idx++) {
      roll -= WHEEL.prizes[idx][key];
      if (roll < 0) break;
    }
    const prize = WHEEL.prizes[idx];
    const need = (prize.items || []).length + (prize.fashion ? 1 : 0);
    if (p.freeSlots() < need) return p.notice('Hành trang đã đầy!', 'warn');
    p.lastSpin = now;
    if (cur === 'luong') p.c.luong -= cost;
    else p.c.xu -= cost;
    giveReward(p, prize);
    const fd = prize.fashion ? this.world.mods.fashion.giveFashion(p, '') : null;
    p.send('spinResult', { idx, label: fd ? `${fd.name} (${FASHION_DAYS} ngày)` : prize.label });
    if (prize.luong >= 20) this.world.announce(`${p.name} quay trúng ${prize.label} ở Vòng Quay May Mắn!`, 'world');
  }
}

module.exports = {
  name: 'wheel',
  init: (world) => new Wheel(world),
  actions: { spin: Wheel.prototype.spin },
  hooks: {
    clientData(out) {
      out.wheel = { cost: WHEEL.cost, prizes: WHEEL.prizes.map((x) => ({ label: x.label, c: x.c })) };
    },
  },
  Wheel,
};
