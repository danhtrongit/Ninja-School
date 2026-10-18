'use strict';

// Bảng xếp hạng (tính sẵn trong world.computeRank) và xem thông tin người chơi khác
class Rank {
  constructor(world) {
    this.world = world;
  }

  rank(p) {
    p.send('rank', { ...this.world.rankCache, arenaMe: this.world.arena.myRank(p) });
  }

  inspect(p, m) {
    const o = this.world.byName.get(String(m.name || '').toLowerCase());
    if (!o) return p.notice('Người chơi không online.');
    p.send('inspect', { name: o.name, cls: o.c.cls, lv: o.lv, equip: o.c.equip, s: o.s, clan: o.clanTag(), pk: o.c.pk });
  }
}

module.exports = {
  name: 'rank',
  init: (world) => new Rank(world),
  actions: { rank: Rank.prototype.rank, inspect: Rank.prototype.inspect },
  Rank,
};
