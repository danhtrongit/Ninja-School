'use strict';

// Hành trang & trang bị: dùng vật phẩm, mặc/tháo, hủy, sắp xếp, mở rương. Cộng chỉ số trang bị vào Player.recalc
const { CLASSES } = require('../../../shared/data/classes');
const { ITEMS, SLOTS, GEAR_SLOTS, TIERS, itemStats } = require('../../../shared/data/items');
const { INV_SIZE, INV_EXPAND, invSize } = require('../../../shared/constants');
const { int, own, refreshInfo } = require('../../core/util');

class Inventory {
  constructor(world) {
    this.world = world;
  }

  useItem(p, m) {
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    const now = Date.now();
    if (def.type === 'equip') return this.equip(p, m);
    if (p.dead) return;
    if (p.map && p.map.def.arena) return p.notice('Lôi đài không cho dùng vật phẩm (bình thuốc, cuộn, đồ ăn).', 'warn');
    if (def.type === 'book') return this.world.mods.skills.readBook(p, slot, def);
    if (def.lv > p.lv) return p.notice(`Cần đạt cấp ${def.lv}.`, 'warn');
    const e = def.effect || {};
    if (def.type === 'potion') {
      const key = e.hp ? 'pot_hp' : 'pot_mp';
      if ((p.cool[key] || 0) > now) return;
      if (e.hp && p.c.hp >= p.s.maxHp) return p.notice('Sinh lực đã đầy.');
      if (e.mp && p.c.mp >= p.s.maxMp) return p.notice('Chakra đã đầy.');
      p.cool[key] = now + 500;
      p.heal(e.hp || 0, e.mp || 0);
      p.removeAt(slot, 1);
      if (p.map) p.map.broadcast('heal', { list: e.hp ? [[`p${p.id}`, e.hp]] : [], pot: p.id });
      return;
    }
    if (def.type === 'scroll') {
      if (e.home) {
        p.removeAt(slot, 1);
        this.world.changeMap(p, CLASSES[p.c.cls].village, null);
        return;
      }
      if (e.buff === 'exp2') {
        p.c.buffs.exp2 = Math.max(now, p.c.buffs.exp2 || 0) + e.dur;
        p.removeAt(slot, 1);
        p.recalc();
        p.notice('Kinh nghiệm nhận được tăng gấp đôi trong 30 phút!', 'reward');
        return;
      }
    }
    if (def.type === 'petfood') return this.world.mods.pets.feedPet(p, slot, def, now);
    if (def.type === 'food') {
      p.c.buffs[e.buff] = Math.max(now, p.c.buffs[e.buff] || 0) + e.dur;
      p.removeAt(slot, 1);
      p.recalc();
      p.notice(`${def.name}: ${def.desc}`, 'reward');
      return;
    }
    if (def.type === 'chest') {
      if (p.freeSlots() < 1) return p.notice('Hành trang đã đầy!', 'warn');
      p.removeAt(slot, 1);
      this.openChest(p);
    }
  }

  openChest(p) {
    const lv = p.lv;
    const r = Math.random();
    const tier = Math.min(TIERS - 1, Math.floor(lv / 10));
    if (r < 0.3) {
      const xu = 500 + lv * 200 + Math.floor(Math.random() * lv * 200);
      p.gainXu(xu);
      p.notice(`Mở rương nhận ${xu} xu!`, 'reward');
    } else if (r < 0.5) {
      const st = lv < 30 ? 'stone1' : lv < 60 ? 'stone2' : lv < 90 ? 'stone3' : 'stone4';
      const q = 2 + Math.floor(Math.random() * 4);
      p.addItem(st, q);
      p.notice(`Mở rương nhận ${q} ${ITEMS[st].name}!`, 'reward');
    } else if (r < 0.75) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      const id = slot === 'weapon' ? `w_${p.c.cls}_${tier}` : `${slot}_${tier}`;
      const rar = Math.random() < 0.1 ? 3 : Math.random() < 0.4 ? 2 : 1;
      p.addItem(id, 1, rar);
      p.notice(`Mở rương nhận ${ITEMS[id].name}!`, 'reward');
    } else if (r < 0.88) {
      p.addItem('exp2', 1);
      p.notice('Mở rương nhận Bí Kíp Nhân Đôi!', 'reward');
    } else if (r < 0.93) {
      this.world.mods.fashion.giveFashion(p, 'Mở rương');
    } else {
      const l = 2 + Math.floor(Math.random() * 8);
      p.c.luong += l;
      p.markMe();
      p.notice(`Mở rương nhận ${l} lượng!`, 'reward');
    }
  }

  equip(p, m) {
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    if (def.type !== 'equip') return;
    if (it.exp && it.exp <= Date.now()) return p.notice('Vật phẩm đã hết hạn sử dụng.', 'warn');
    if (def.lv > p.lv) return p.notice(`Cần đạt cấp ${def.lv} để sử dụng.`, 'warn');
    if (def.cls && def.cls !== p.c.cls) return p.notice(`Chỉ phái ${CLASSES[def.cls].name} mới dùng được.`, 'warn');
    if (p.trade) return p.notice('Đang giao dịch.', 'warn');
    const old = p.c.equip[def.slot] || null;
    p.c.equip[def.slot] = it;
    p.c.inv[slot] = old;
    p.recalc();
    p.markInv();
    refreshInfo(p);
  }

  unequip(p, m) {
    const s = String(m.slot);
    // chỉ nhận tên ô có thật (tránh '__proto__', 'constructor' trỏ vào Object.prototype)
    if (!SLOTS.includes(s) || !own(p.c.equip, s)) return;
    const it = p.c.equip[s];
    if (!it) return;
    const i = p.c.inv.indexOf(null);
    if (i < 0) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.inv[i] = it;
    delete p.c.equip[s];
    p.recalc();
    p.markInv();
    refreshInfo(p);
  }

  discard(p, m) {
    if (p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    p.c.inv[slot] = null;
    p.markInv();
    p.onInventoryChanged();
    p.notice(`Đã hủy ${ITEMS[it.id].name}.`);
  }

  // Hủy nhanh nhiều món: m.items = [[ô, id], ...]; id phải khớp món đang ở ô (túi có thể vừa đổi chỗ)
  discardMany(p, m) {
    if (p.trade || !Array.isArray(m.items)) return;
    const seen = new Set();
    const names = [];
    for (const e of m.items.slice(0, p.c.inv.length)) {
      if (!Array.isArray(e)) continue;
      const slot = int(e[0], -1);
      const it = p.c.inv[slot];
      if (!it || seen.has(slot) || it.id !== String(e[1])) continue;
      seen.add(slot);
      p.c.inv[slot] = null;
      names.push(ITEMS[it.id].name);
    }
    if (!names.length) return p.notice('Không có món nào để hủy (túi vừa thay đổi?).', 'warn');
    p.markInv();
    p.onInventoryChanged();
    p.notice(names.length === 1 ? `Đã hủy ${names[0]}.` : `Đã hủy ${names.length} món.`);
  }

  invExpand(p) {
    if (p.trade) return;
    const n = p.c.invExt || 0;
    const cost = INV_EXPAND.cost[n];
    if (cost == null) return p.notice('Hành trang đã mở rộng tối đa.', 'warn');
    if (p.c.luong < cost) return p.notice(`Mở rộng hành trang cần ${cost} lượng.`, 'warn');
    p.c.luong -= cost;
    p.c.invExt = n + 1;
    while (p.c.inv.length < invSize(p.c)) p.c.inv.push(null);
    p.markInv();
    p.markMe();
    p.notice(`Hành trang mở rộng thành ${p.c.inv.length} ô.`);
  }

  sortInv(p) {
    if (p.trade) return;
    const order = { equip: 0, potion: 1, food: 2, petfood: 3, scroll: 4, book: 5, stone: 6, gem: 7, chest: 8, event: 9, misc: 10, quest: 11 };
    // loại chưa có trong bảng xếp cuối (tránh NaN làm phép so sánh không nhất quán)
    const rank = (t) => (own(order, t) ? order[t] : 99);
    const items = p.c.inv.filter(Boolean);
    // gộp các chồng
    const merged = [];
    for (const it of items) {
      const def = ITEMS[it.id];
      if (def.stack) {
        const ex = merged.find((x) => x.id === it.id && x.q < def.stack);
        if (ex) {
          const n = Math.min(def.stack - ex.q, it.q);
          ex.q += n;
          it.q -= n;
          if (it.q <= 0) continue;
        }
      }
      merged.push(it);
    }
    merged.sort((a, b) => {
      const da = ITEMS[a.id];
      const db = ITEMS[b.id];
      return (rank(da.type) - rank(db.type)) || (da.slot || '').localeCompare(db.slot || '') || (db.tier || 0) - (da.tier || 0) || a.id.localeCompare(b.id);
    });
    p.c.inv = p.c.inv.map((_, i) => merged[i] || null);
    p.markInv();
  }
}

module.exports = {
  name: 'inventory',
  init: (world) => new Inventory(world),
  actions: {
    useItem: Inventory.prototype.useItem,
    equip: Inventory.prototype.equip,
    unequip: Inventory.prototype.unequip,
    discard: Inventory.prototype.discard,
    discardMany: Inventory.prototype.discardMany,
    invExpand: Inventory.prototype.invExpand,
    sortInv: Inventory.prototype.sortInv,
  },
  hooks: {
    clientData(out) {
      out.invExpand = { base: INV_SIZE, ...INV_EXPAND };
    },
    // chỉ số trang bị đang mặc (gồm ngọc khảm, thú cưng theo cấp, thời trang)
    stats(t) {
      const { c, eq } = t;
      for (const slot of SLOTS) {
        const it = c.equip[slot];
        if (!it) continue;
        const st = itemStats(it);
        for (const k in st) eq[k] = (eq[k] || 0) + st[k];
      }
      // tốc chạy của thú cưỡi cộng riêng, ngoài trần 60% của trang bị + buff + nội tại
      t.mountSpd = c.equip.mount ? itemStats(c.equip.mount).spd || 0 : 0;
      eq.spd -= t.mountSpd;
    },
  },
  Inventory,
};
