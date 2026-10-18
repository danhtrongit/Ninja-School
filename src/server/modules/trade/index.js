'use strict';

// Giao dịch giữa hai người chơi đứng gần nhau: đặt đồ + xu, khóa, xác nhận
const { int } = require('../../core/util');
const { find, invite, takeInvite } = require('../invites');

class Trade {
  constructor(world) {
    this.world = world;
  }

  tradeReq(p, m) {
    const o = find(this.world, m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.map !== p.map || Math.abs(o.x - p.x) > 250) return p.notice('Phải đứng gần nhau để giao dịch.');
    if (p.match || o.match) return p.notice('Không thể giao dịch trên lôi đài.');
    if (p.trade || o.trade) return p.notice('Một bên đang giao dịch.');
    if (p.lv < 5 || o.lv < 5) return p.notice('Cần cấp 5 để giao dịch.');
    invite(p, o, 'trade');
    p.notice(`Đã gửi lời mời giao dịch tới ${o.name}.`);
  }

  tradeAccept(p, m) {
    const o = find(this.world, m.from);
    if (!o || !takeInvite(p, 'trade', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (o.map !== p.map || Math.abs(o.x - p.x) > 250) return p.notice('Phải đứng gần nhau để giao dịch.');
    // lời mời gửi trước khi vào trận vẫn còn hạn: kiểm tra lại lúc nhận
    if (p.match || o.match) return p.notice('Không thể giao dịch trên lôi đài.');
    if (p.trade || o.trade) return;
    p.trade = { other: o.id, slots: [], items: [], xu: 0, lock: false, ok: false };
    o.trade = { other: p.id, slots: [], items: [], xu: 0, lock: false, ok: false };
    this.tradeUpdate(p);
  }

  tradeView(p) {
    return { slots: p.trade.slots, items: p.trade.slots.map((s) => p.c.inv[s]), xu: p.trade.xu, lock: p.trade.lock, ok: p.trade.ok };
  }

  tradeUpdate(p) {
    const o = this.world.players.get(p.trade.other);
    if (!o || !o.trade) return this.cancelTrade(p, 'Giao dịch bị hủy.');
    p.send('trade', { with: o.name, mine: this.tradeView(p), theirs: this.tradeView(o) });
    o.send('trade', { with: p.name, mine: this.tradeView(o), theirs: this.tradeView(p) });
  }

  tradeSet(p, m) {
    if (!p.trade || p.trade.lock) return;
    const all = [...new Set((Array.isArray(m.slots) ? m.slots : []).map((s) => int(s, -1)))]
      .filter((s) => s >= 0 && s < p.c.inv.length && p.c.inv[s]);
    // vật phẩm có hạn dùng (thời trang từ rương/vòng quay) không được giao dịch
    const slots = all.filter((s) => !p.c.inv[s].exp).slice(0, 10);
    if (slots.length < all.length) p.notice('Vật phẩm có hạn sử dụng không thể giao dịch.', 'warn');
    p.trade.slots = slots;
    // giữ đúng món + số lượng lúc đặt để tradeOk phát hiện bị tráo (dùng/tháo đồ vào ô đã đặt)
    // (kèm ngọc khảm: món đổi ngọc sau khi đặt cũng coi như bị tráo)
    p.trade.items = slots.map((s) => ({ it: p.c.inv[s], q: p.c.inv[s].q, g: JSON.stringify(p.c.inv[s].gems || null) }));
    p.trade.xu = Math.max(0, Math.min(p.c.xu, int(m.xu, 0)));
    this.tradeUpdate(p);
  }

  tradeLock(p) {
    if (!p.trade) return;
    p.trade.lock = true;
    this.tradeUpdate(p);
  }

  tradeOk(p) {
    if (!p.trade || !p.trade.lock) return;
    const o = this.world.players.get(p.trade.other);
    if (!o || !o.trade || !o.trade.lock) return;
    p.trade.ok = true;
    if (!o.trade.ok) return this.tradeUpdate(p);
    // Thực hiện
    const same = (pl) => pl.trade.slots.every((s, k) => {
      const snap = (pl.trade.items || [])[k];
      const it = pl.c.inv[s];
      return snap && it && it === snap.it && it.q === snap.q && !it.exp && JSON.stringify(it.gems || null) === snap.g;
    });
    if (!same(p) || !same(o)) return this.cancelTrade(p, 'Vật phẩm đã thay đổi, giao dịch bị hủy.');
    const take = (pl) => pl.trade.slots.map((s) => pl.c.inv[s]);
    const a = take(p);
    const b = take(o);
    if (p.c.xu < p.trade.xu || o.c.xu < o.trade.xu) return this.cancelTrade(p, 'Không đủ xu.');
    const freeA = p.freeSlots() + a.length;
    const freeB = o.freeSlots() + b.length;
    if (freeA < b.length || freeB < a.length) return this.cancelTrade(p, 'Hành trang không đủ chỗ.');
    for (const s of p.trade.slots) p.c.inv[s] = null;
    for (const s of o.trade.slots) o.c.inv[s] = null;
    for (const it of b) p.c.inv[p.c.inv.indexOf(null)] = it;
    for (const it of a) o.c.inv[o.c.inv.indexOf(null)] = it;
    p.c.xu += o.trade.xu - p.trade.xu;
    o.c.xu += p.trade.xu - o.trade.xu;
    for (const pl of [p, o]) {
      pl.trade = null;
      pl.markInv();
      pl.markMe();
      pl.onInventoryChanged();
      pl.send('tradeEnd', { ok: true });
      pl.notice('Giao dịch thành công!', 'reward');
    }
    this.world.db.dirty = true;
  }

  tradeCancel(p) {
    this.cancelTrade(p, 'Đã hủy giao dịch.');
  }

  cancelTrade(p, msg) {
    const t = p.trade;
    if (!t) return;
    p.trade = null;
    p.send('tradeEnd', { ok: false });
    if (msg) p.notice(msg);
    const o = this.world.players.get(t.other);
    if (o && o.trade && o.trade.other === p.id) {
      o.trade = null;
      o.send('tradeEnd', { ok: false });
      o.notice('Giao dịch đã bị hủy.');
    }
  }
}

module.exports = {
  name: 'trade',
  init: (world) => new Trade(world),
  actions: {
    tradeReq: Trade.prototype.tradeReq,
    tradeAccept: Trade.prototype.tradeAccept,
    tradeSet: Trade.prototype.tradeSet,
    tradeLock: Trade.prototype.tradeLock,
    tradeOk: Trade.prototype.tradeOk,
    tradeCancel: Trade.prototype.tradeCancel,
  },
  hooks: {
    leave: {
      order: 2,
      fn(p) { if (p.trade) this.cancelTrade(p, 'Đối phương đã thoát game.'); },
    },
    mapLeft: {
      order: 2,
      fn(p) { if (p.trade) this.cancelTrade(p, 'Giao dịch bị hủy.'); },
    },
  },
  Trade,
};
