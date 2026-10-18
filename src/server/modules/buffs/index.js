'use strict';

// Buff: buff tạm trong trận (p.buffs, mất khi thoát) và buff lưu lâu dài (c.buffs: đồ ăn, Bí Kíp Nhân Đôi)
const { PERSIST_BUFFS } = require('../../../shared/constants');

module.exports = {
  name: 'buffs',
  hooks: {
    stats(t) {
      const { p, c, buf, now } = t;
      for (const k in p.buffs) buf[p.buffs[k].stat] = (buf[p.buffs[k].stat] || 0) + p.buffs[k].v;
      for (const k in PERSIST_BUFFS) {
        const [stat, v] = PERSIST_BUFFS[k];
        if ((c.buffs[k] || 0) > now && stat !== 'exp') buf[stat] = (buf[stat] || 0) + v;
      }
      if ((c.buffs.exp2 || 0) > now) t.expMul *= 2;
    },
    // Hết hạn buff
    playerSecond: {
      order: 1,
      fn(p, now) {
        let changed = false;
        for (const k in p.buffs) {
          if (p.buffs[k].until <= now) {
            delete p.buffs[k];
            changed = true;
          }
        }
        for (const k in p.c.buffs) {
          if (p.c.buffs[k] <= now) {
            delete p.c.buffs[k];
            changed = true;
            p.notice(k === 'exp2' ? 'Hiệu lực nhân đôi kinh nghiệm đã hết.' : 'Hiệu lực món ăn đã hết.');
          }
        }
        if (changed) p.recalc();
      },
    },
  },
};
