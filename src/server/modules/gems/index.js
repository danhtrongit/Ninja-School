'use strict';

// Khảm ngọc (Thợ Rèn). Mỗi món chỉ khảm 1 viên mỗi loại; ngọc đi theo món khi giao dịch, cất kho, bán.
const { ITEMS, GEM, GEM_TYPES, GEAR_SLOTS, TIERS, gemId, gemHoles, gemDef } = require('../../../shared/data/items');
const { int, own } = require('../../core/util');
const { nearNpc } = require('../../core/npc');
const { smithFx } = require('../smith');

class Gems {
  constructor(world) {
    this.world = world;
  }

  // Món đồ: src 'eq' + tên ô đang mặc, hoặc src 'inv' + chỉ số ô hành trang
  gemTarget(p, m) {
    if (m.src === 'eq') {
      const s = String(m.slot);
      if (!GEAR_SLOTS.includes(s) || !own(p.c.equip, s)) return null;
      return p.c.equip[s] ? { it: p.c.equip[s], eq: true } : null;
    }
    const i = int(m.slot, -1);
    const it = i >= 0 && i < p.c.inv.length ? p.c.inv[i] : null;
    return it ? { it, eq: false } : null;
  }

  // Kiểm tra chung: đứng gần Thợ Rèn, không giao dịch, món có lỗ khảm, chỉ số lỗ hợp lệ. Trả về { it, eq, def, gems, hole }
  gemCheck(p, m) {
    if (p.dead || p.trade || !nearNpc(p, m.npc, 'smith')) return null;
    const tg = this.gemTarget(p, m);
    if (!tg) return null;
    const def = ITEMS[tg.it.id];
    const holes = gemHoles(def);
    if (!holes) {
      p.notice('Vật phẩm này không có lỗ khảm.', 'warn');
      return null;
    }
    const hole = int(m.hole, -1);
    if (hole < 0 || hole >= holes) {
      p.notice('Lỗ khảm không hợp lệ.', 'warn');
      return null;
    }
    const gems = Array.from({ length: holes }, (_, k) => (Array.isArray(tg.it.gems) && gemDef(tg.it.gems[k]) ? tg.it.gems[k] : null));
    return { ...tg, def, gems, hole };
  }

  gemDone(p, g, res) {
    if (res.gems.some(Boolean)) res.it.gems = res.gems;
    else delete res.it.gems;
    if (res.eq) p.recalc();
    p.markInv();
    p.markMe();
    this.world.db.dirty = true;
    p.send('gemResult', { ...g, item: res.def.name });
  }

  gemPut(p, m) {
    const res = this.gemCheck(p, m);
    if (!res) return;
    const gi = int(m.gem, -1);
    const g = gi >= 0 && gi < p.c.inv.length ? p.c.inv[gi] : null;
    const gd = g ? gemDef(g.id) : null;
    if (!gd) return p.notice('Hãy chọn một viên ngọc trong hành trang.', 'warn');
    if (res.gems[res.hole]) return p.notice('Lỗ này đã có ngọc. Hãy gỡ ra trước.', 'warn');
    const t = GEM_TYPES[gd.gem];
    if (res.gems.some((id) => id && gemDef(id).gem === gd.gem)) return p.notice(`Món này đã khảm ${t.name}. Mỗi món chỉ khảm 1 viên mỗi loại.`, 'warn');
    res.gems[res.hole] = g.id;
    p.removeAt(gi, 1);
    this.gemDone(p, { act: 'put', ok: true, id: g.id, name: gd.name, hole: res.hole }, res);
    smithFx(p, { k: 'gem', ok: true, c: t.c });
  }

  gemTake(p, m) {
    const res = this.gemCheck(p, m);
    if (!res) return;
    const id = res.gems[res.hole];
    if (!id) return p.notice('Lỗ này đang trống.', 'warn');
    const gd = gemDef(id);
    const cost = GEM.takeCost(gd.glv);
    if (p.c.xu < cost) return p.notice(`Gỡ ngọc cần ${cost.toLocaleString('vi-VN')} xu.`, 'warn');
    if (!p.canAdd(id, 1)) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.xu -= cost;
    res.gems[res.hole] = null;
    p.addItem(id, 1);
    this.gemDone(p, { act: 'take', ok: true, id, name: gd.name, hole: res.hole, cost }, res);
  }

  // Ghép 3 viên cùng loại cùng cấp thành 1 viên cấp trên (tỉ lệ giảm dần); thất bại mất 1 viên, trả lại 2
  gemMerge(p, m) {
    if (p.dead || p.trade || !nearNpc(p, m.npc, 'smith')) return;
    const now = Date.now();
    if (now - (p.lastGemMerge || 0) < 250) return;
    const id = String(m.id || '');
    const gd = gemDef(id);
    if (!gd) return p.notice('Hãy chọn ngọc cần ghép.', 'warn');
    if (gd.glv >= GEM.max) return p.notice('Ngọc đã đạt cấp cao nhất.', 'warn');
    if (p.countItem(id) < 3) return p.notice(`Cần 3 viên ${gd.name}.`, 'warn');
    const cost = GEM.mergeCost(gd.glv);
    if (p.c.xu < cost) return p.notice(`Ghép ngọc cần ${cost.toLocaleString('vi-VN')} xu.`, 'warn');
    const next = gemId(gd.gem, gd.glv + 1);
    // Xét chỗ trống sau khi đã bỏ 3 viên (cả chồng 3 viên được ghép thì ô đó trống ra); không đủ thì trả lại nguyên
    p.removeItem(id, 3);
    if (!p.canAdd(next, 1)) {
      p.addItem(id, 3);
      return p.notice('Hành trang đã đầy!', 'warn');
    }
    p.lastGemMerge = now;
    p.c.xu -= cost;
    const ok = Math.random() * 100 < GEM.rate[gd.glv - 1];
    if (ok) p.addItem(next, 1);
    else p.addItem(id, 2);
    const t = GEM_TYPES[gd.gem];
    p.markMe();
    p.send('gemResult', { act: 'merge', ok, id: ok ? next : id, from: id, name: ok ? ITEMS[next].name : gd.name, cost });
    smithFx(p, ok ? { k: 'gem', ok: true, c: t.c } : { k: 'enh', ok: false, plus: 0 });
    if (ok && gd.glv + 1 >= 8) this.world.announce(`${p.name} đã ghép thành công ${ITEMS[next].name}!`, 'world');
  }
}

module.exports = {
  name: 'gems',
  init: (world) => new Gems(world),
  actions: { gemPut: Gems.prototype.gemPut, gemTake: Gems.prototype.gemTake, gemMerge: Gems.prototype.gemMerge },
  hooks: {
    // Ngọc khảm: bảng tra sẵn (máy khách không cần công thức)
    clientData(out) {
      out.gems = {
        max: GEM.max, types: GEM_TYPES, rate: GEM.rate, lifestealCap: GEM.lifestealCap,
        mergeCost: Array.from({ length: GEM.max + 1 }, (_, lv) => (lv ? GEM.mergeCost(lv) : 0)),
        takeCost: Array.from({ length: GEM.max + 1 }, (_, lv) => (lv ? GEM.takeCost(lv) : 0)),
        holes: Array.from({ length: TIERS }, (_, t) => GEM.holes(t)),
      };
    },
  },
  Gems,
};
