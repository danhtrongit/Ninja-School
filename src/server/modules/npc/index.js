'use strict';

// Nói chuyện với NPC: tìm NPC đứng gần rồi chuyển cho module đăng ký loại NPC đó (npcs: { loại: { open, act } })
const { nearNpc } = require('../../core/npc');
const { npcHandler } = require('../../core/modules');

class Npc {
  constructor(world) {
    this.world = world;
  }

  npc(p, m) {
    const n = nearNpc(p, m.id);
    if (!n) return;
    const h = npcHandler(this.world, n.type);
    if (h && h.open) h.open.call(h.self, p, n);
  }

  npcAct(p, m) {
    const n = nearNpc(p, m.id);
    if (!n) return;
    const a = String(m.a || '');
    const h = npcHandler(this.world, n.type);
    if (h && h.act) h.act.call(h.self, p, n, a, m);
  }
}

module.exports = {
  name: 'npc',
  init: (world) => new Npc(world),
  actions: { npc: Npc.prototype.npc, npcAct: Npc.prototype.npcAct },
  Npc,
};
