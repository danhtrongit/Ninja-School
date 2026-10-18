'use strict';

// Cửa hàng NPC (Tiệm Thuốc, Lò Rèn): danh sách hàng, mua, bán
const { ITEMS, SHOPS, GEAR_SLOTS, sellPrice } = require('../../../shared/data/items');
const { int } = require('../../core/util');
const { nearNpc } = require('../../core/npc');

class Shop {
  constructor(world) {
    this.world = world;
  }

  shopList(p, type) {
    const sh = SHOPS[type];
    const list = sh.items.map((id) => ({ id, price: ITEMS[id].price, cur: 'xu' }));
    // hàng riêng của phái (sách nội tại) chỉ bày cho đúng phái
    for (const id of sh.luong || []) if (!ITEMS[id].cls || ITEMS[id].cls === p.c.cls) list.push({ id, price: ITEMS[id].priceLuong, cur: 'luong' });
    for (const t of sh.equipTiers || []) {
      for (const s of GEAR_SLOTS) {
        const id = s === 'weapon' ? `w_${p.c.cls}_${t}` : `${s}_${t}`;
        list.push({ id, price: ITEMS[id].price, cur: 'xu' });
      }
    }
    return list;
  }

  openShop(p, n, type) {
    p.send('shop', { npc: n.id, title: SHOPS[type].name, items: this.shopList(p, type) });
  }

  buy(p, m) {
    const n = nearNpc(p, m.npc);
    if (!n || (n.type !== 'potion' && n.type !== 'smith')) return;
    const list = this.shopList(p, n.type);
    const e = list.find((x) => x.id === m.id);
    if (!e) return;
    const def = ITEMS[e.id];
    // sách nội tại chỉ đọc được 1 lần: mỗi lần mua 1 cuốn
    const qty = def.stack && def.type !== 'book' ? Math.max(1, Math.min(999, int(m.qty, 1))) : 1;
    const cost = e.price * qty;
    const luong = e.cur === 'luong';
    // nb: người chơi chọn không dùng xu khóa (hàng mua về không bị khóa)
    const nb = m.nb === true || m.nb === 1;
    if (luong ? p.c.luong < cost : (nb ? p.c.xu : p.xuAll()) < cost) return p.notice(luong ? 'Không đủ lượng.' : 'Không đủ xu.', 'warn');
    // mua bằng lượng, hoặc lần mua có dùng xu khóa: hàng bị khóa
    const bound = luong || (!nb && (p.c.xuk || 0) > 0 && cost > 0);
    if (!p.canAdd(e.id, qty, bound ? 1 : 0)) return p.notice('Hành trang đã đầy!', 'warn');
    if (luong) p.c.luong -= cost;
    else p.payXu(cost, nb);
    p.addItem(e.id, qty, 0, 0, bound ? 1 : 0);
    p.markMe();
    p.notice(`Đã mua ${def.name}${qty > 1 ? ` x${qty}` : ''}${bound ? ' (khóa)' : ''}.`);
  }

  sell(p, m) {
    const n = nearNpc(p, m.npc);
    if (!n || (n.type !== 'potion' && n.type !== 'smith')) return;
    if (p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const qty = Math.max(1, Math.min(it.q, int(m.qty, it.q)));
    const price = sellPrice(it) * qty;
    const wasBound = !!it.b;
    p.removeAt(slot, qty);
    if (wasBound) p.gainXuk(price);
    else p.gainXu(price);
    p.notice(`Đã bán ${ITEMS[it.id].name}${qty > 1 ? ` x${qty}` : ''} được ${price} ${wasBound ? 'xu khóa' : 'xu'}.`);
  }
}

module.exports = {
  name: 'shop',
  init: (world) => new Shop(world),
  actions: { buy: Shop.prototype.buy, sell: Shop.prototype.sell },
  npcs: {
    potion: { open(p, n) { this.openShop(p, n, 'potion'); } },
  },
  Shop,
};
