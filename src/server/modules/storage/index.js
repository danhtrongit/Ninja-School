'use strict';

// Thủ kho: cất / lấy vật phẩm
const { ITEMS } = require('../../../shared/data/items');
const { int } = require('../../core/util');
const { nearNpc } = require('../../core/npc');

class Storage {
  constructor(world) {
    this.world = world;
  }

  storePut(p, m) {
    if (!nearNpc(p, m.npc, 'storage') || p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    const st = p.c.storage;
    if (def.stack) {
      for (const s of st) {
        if (it.q <= 0) break;
        if (s && s.id === it.id && s.q < def.stack) {
          const n = Math.min(def.stack - s.q, it.q);
          s.q += n;
          it.q -= n;
        }
      }
    }
    if (it.q > 0) {
      const i = st.indexOf(null);
      if (i < 0) {
        p.markInv();
        p.send('storage', { npc: m.npc, items: st });
        return p.notice('Kho đã đầy!', 'warn');
      }
      st[i] = it;
    }
    p.c.inv[slot] = null;
    p.markInv();
    p.onInventoryChanged();
    p.send('storage', { npc: m.npc, items: st });
  }

  storeTake(p, m) {
    if (!nearNpc(p, m.npc, 'storage') || p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.storage[slot];
    if (!it) return;
    if (!p.addItemObj(it)) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.storage[slot] = null;
    p.send('storage', { npc: m.npc, items: p.c.storage });
  }
}

module.exports = {
  name: 'storage',
  init: (world) => new Storage(world),
  actions: { storePut: Storage.prototype.storePut, storeTake: Storage.prototype.storeTake },
  npcs: {
    storage: { open(p, n) { p.send('storage', { npc: n.id, items: p.c.storage }); } },
  },
  Storage,
};
