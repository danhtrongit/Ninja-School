'use strict';

// Thợ Rèn: hội thoại (mua đồ, cường hóa, khảm ngọc, bán) và cường hóa trang bị
const { ITEMS, UPGRADE, SLOTS, TIERS } = require('../../../shared/data/items');
const { int, own, refreshInfo } = require('../../core/util');
const { nearNpc, dialog } = require('../../core/npc');

// Hiệu ứng rèn/khảm hiện trên nhân vật cho cả bản đồ cùng thấy
function smithFx(p, d) {
  if (p.map) p.map.broadcast('smithFx', { id: p.id, ...d });
}

class Smith {
  constructor(world) {
    this.world = world;
  }

  upgrade(p, m) {
    const n = nearNpc(p, m.npc, 'smith');
    if (!n || p.trade) return;
    const fromEq = m.src === 'eq';
    const es = String(m.slot);
    // khóa từ client: chặn '__proto__'/'constructor' như ở unequip
    if (fromEq && (!SLOTS.includes(es) || !own(p.c.equip, es))) return;
    const it = fromEq ? p.c.equip[es] : p.c.inv[int(m.slot, -1)];
    if (!it) return;
    const def = ITEMS[it.id];
    if (!def || def.type !== 'equip') return;
    if (def.noUpgrade) return p.notice('Vật phẩm này không thể cường hóa.', 'warn');
    const plus = it.p || 0;
    if (plus >= UPGRADE.max) return p.notice('Trang bị đã đạt cấp cường hóa tối đa.', 'warn');
    const stone = UPGRADE.stone(plus);
    const sq = UPGRADE.stoneQty(plus);
    const cost = UPGRADE.cost(plus, def.tier);
    if (p.countItem(stone) < sq) return p.notice(`Cần ${sq} ${ITEMS[stone].name}.`, 'warn');
    if (p.c.xu < cost) return p.notice(`Cần ${cost} xu.`, 'warn');
    const useCharm = !!m.charm && plus >= 4;
    if (useCharm && p.countItem('charm') < 1) return p.notice('Không có Bùa Bảo Hộ.', 'warn');
    p.removeItem(stone, sq);
    if (useCharm) p.removeItem('charm', 1);
    p.c.xu -= cost;
    const ok = Math.random() * 100 < UPGRADE.rate[plus];
    if (ok) {
      it.p = plus + 1;
      if (it.p >= 10) this.world.announce(`${p.name} đã cường hóa thành công ${def.name} +${it.p}!`, 'world');
    } else if (plus >= 4 && !useCharm) {
      it.p = plus - 1;
    }
    if (fromEq) {
      p.recalc();
      refreshInfo(p);
      p.checkQuestState();
    }
    p.markInv();
    p.markMe();
    p.send('upgradeResult', { ok, plus: it.p || 0, name: def.name });
    smithFx(p, { k: 'enh', ok, plus: it.p || 0 });
  }
}

module.exports = {
  name: 'smith',
  init: (world) => new Smith(world),
  actions: { upgrade: Smith.prototype.upgrade },
  npcs: {
    smith: {
      open(p, n) {
        dialog(p, n, 'Ta có thể rèn vũ khí, trang bị, cường hóa và khảm ngọc cho chúng. Ngươi cần gì?', [
          { a: 'shop', label: 'Mua trang bị' }, { a: 'upgrade', label: 'Cường hóa trang bị' }, { a: 'gem', label: 'Khảm & ghép ngọc' }, { a: 'sellui', label: 'Bán vật phẩm' },
        ]);
      },
      act(p, n, a) {
        if (a === 'shop') return this.world.mods.shop.openShop(p, n, 'smith');
        if (a === 'upgrade') return p.send('openUi', { ui: 'upgrade', npc: n.id });
        if (a === 'gem') return p.send('openUi', { ui: 'upgrade', npc: n.id, tab: 'gem' });
        if (a === 'sellui') return this.world.mods.shop.openShop(p, n, 'smith');
      },
    },
  },
  hooks: {
    // bảng tra cường hóa sẵn cho máy khách
    clientData(out) {
      out.upgrade = {
        max: UPGRADE.max, rate: UPGRADE.rate,
        stone: Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.stone(i)),
        stoneQty: Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.stoneQty(i)),
        cost: Array.from({ length: TIERS }, (_, t) => Array.from({ length: UPGRADE.max }, (_, i) => UPGRADE.cost(i, t))),
        bonus: UPGRADE.bonus,
      };
    },
  },
  Smith, smithFx,
};
