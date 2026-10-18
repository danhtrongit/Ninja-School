'use strict';

// Kỹ năng & tiềm năng: dùng chiêu, học/nâng kỹ năng, sách nội tại, bộ phím kỹ năng, cộng/tẩy điểm tiềm năng
const { SKILL_MAX_LV, skillOf, passiveBonus } = require('../../../shared/data/skills');
const { CLASSES } = require('../../../shared/data/classes');
const { ITEMS } = require('../../../shared/data/items');
const { HOTBAR, HOTBAR_SETS } = require('../../../shared/constants');
const { int, own } = require('../../core/util');

class Skills {
  constructor(world) {
    this.world = world;
  }

  skill(p, m) {
    this.world.combat.useSkill(p, m);
  }

  // Đọc sách: học cấp 1 kỹ năng nội tại (cấp sau nâng bằng điểm kỹ năng)
  readBook(p, slot, def) {
    const sid = def.skill;
    const sk = skillOf(sid);
    if (!sk || sk.type !== 'passive') return;
    if (sk.cls !== p.c.cls) return p.notice(`Chỉ phái ${CLASSES[sk.cls].name} mới đọc được sách này.`, 'warn');
    if (p.lv < sk.req) return p.notice(`Cần đạt cấp ${sk.req}.`, 'warn');
    if ((p.c.skills[sid] || 0) > 0) return p.notice(`Đã học ${sk.name} rồi. Dùng điểm kỹ năng để nâng cấp.`);
    if (p.trade) return p.notice('Đang giao dịch.', 'warn');
    p.removeAt(slot, 1);
    p.c.skills[sid] = 1;
    p.recalc();
    p.notice(`Đã lĩnh hội kỹ năng nội tại ${sk.name}!`, 'reward');
  }

  // ---------- Tiềm năng
  addStat(p, m) {
    const k = String(m.k);
    if (!['str', 'agi', 'int', 'vit'].includes(k)) return;
    const n = Math.max(1, Math.min(p.c.potential, int(m.n, 1)));
    if (p.c.potential < n || n <= 0) return;
    p.c.potential -= n;
    p.c.stats[k] += n;
    p.recalc();
  }

  resetStats(p) {
    const cost = 20;
    if (p.c.luong < cost) return p.notice(`Tẩy điểm tiềm năng cần ${cost} lượng.`, 'warn');
    const s = p.c.stats;
    const total = s.str + s.agi + s.int + s.vit - 20;
    p.c.luong -= cost;
    p.c.stats = { str: 5, agi: 5, int: 5, vit: 5 };
    p.c.potential += total;
    p.recalc();
    p.notice('Đã tẩy điểm tiềm năng.');
  }

  // ---------- Kỹ năng
  learnSkill(p, m) {
    const sid = String(m.sid);
    const sk = skillOf(sid);
    if (!sk || sk.cls !== p.c.cls || sk.basic) return;
    const cur = p.c.skills[sid] || 0;
    if (sk.type === 'passive' && !cur) return p.notice(`Cần đọc ${ITEMS[sk.book].name} để học ${sk.name}.`, 'warn');
    if (cur >= SKILL_MAX_LV) return p.notice('Kỹ năng đã đạt cấp tối đa.');
    const need = sk.req + cur * 3;
    if (p.lv < need) return p.notice(`Cần đạt cấp ${need}.`, 'warn');
    if (p.c.skillPoints < 1) return p.notice('Không đủ điểm kỹ năng.', 'warn');
    p.c.skillPoints--;
    p.c.skills[sid] = cur + 1;
    if (sk.type === 'passive') p.recalc();
    if (cur === 0) {
      const i = p.c.hotbar.indexOf(null);
      if (i >= 0 && !p.c.hotbar.includes(sid)) p.c.hotbar[i] = sid;
      p.notice(`Đã học kỹ năng ${sk.name}!`, 'reward');
    }
    p.markMe();
  }

  // Gán kỹ năng vào ô i của bộ đang dùng (đã có ở ô khác thì hoán đổi, sid rỗng = gỡ)
  hotbar(p, m) {
    const i = int(m.i, -1);
    if (i < 0 || i >= HOTBAR) return;
    const sid = m.sid ? String(m.sid) : null;
    if (sid) {
      const sk = skillOf(sid);
      if (!sk || sk.cls !== p.c.cls || sk.basic || sk.type === 'passive' || !own(p.c.skills, sid) || !(p.c.skills[sid] > 0)) return;
    }
    const bar = p.c.hotbar;
    const j = sid ? bar.indexOf(sid) : -1;
    if (j >= 0) bar[j] = bar[i];
    bar[i] = sid;
    p.markMe();
  }

  hotbarSet(p, m) {
    const n = Number.isInteger(m.n) ? m.n : -1;
    if (n < 0 || n >= HOTBAR_SETS || n === p.c.hbi) return;
    const now = Date.now();
    if (now - (p.lastHotbarSet || 0) < 300) return;
    p.lastHotbarSet = now;
    p.c.hbi = n;
    p.markMe();
  }
}

module.exports = {
  name: 'skills',
  init: (world) => new Skills(world),
  actions: {
    skill: Skills.prototype.skill,
    learnSkill: Skills.prototype.learnSkill,
    hotbar: Skills.prototype.hotbar,
    hotbarSet: Skills.prototype.hotbarSet,
    addStat: Skills.prototype.addStat,
    resetStats: Skills.prototype.resetStats,
  },
  hooks: {
    // kỹ năng nội tại đã học
    stats(t) {
      const pb = passiveBonus(t.c.cls, t.c.skills);
      for (const k in pb) t.pas[k] = (t.pas[k] || 0) + pb[k];
    },
  },
  Skills,
};
