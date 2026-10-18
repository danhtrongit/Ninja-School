'use strict';

// Điểm danh hằng ngày: chuỗi ngày liên tiếp, quà theo vòng 7 ngày
const { CHECKIN } = require('../../../shared/data/extras');
const { vnDay } = require('../../../shared/formulas');
const { giveReward, rewardLabel } = require('../../services/reward');

class Checkin {
  constructor(world) {
    this.world = world;
  }

  checkin(p) {
    const ck = p.c.checkin;
    const today = vnDay();
    if (ck.day === today) return p.notice('Hôm nay bạn đã điểm danh rồi.');
    const streak = ck.day === vnDay(-1) ? ck.streak + 1 : 1;
    const base = CHECKIN[(streak - 1) % CHECKIN.length];
    const r = { ...base, xu: base.xu ? Math.round(base.xu * (1 + p.lv / 20)) : 0 };
    if (!giveReward(p, r, { bound: true })) return;
    ck.day = today;
    ck.streak = streak;
    p.markMe();
    p.notice(`Điểm danh ngày ${((streak - 1) % 7) + 1}: ${rewardLabel(r, true)}`, 'reward');
  }
}

module.exports = {
  name: 'checkin',
  init: (world) => new Checkin(world),
  actions: { checkin: Checkin.prototype.checkin },
  hooks: {
    clientData(out) {
      out.checkin = CHECKIN;
    },
  },
  Checkin,
};
