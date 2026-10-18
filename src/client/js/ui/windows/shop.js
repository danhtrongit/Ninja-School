// Cửa sổ Cửa hàng NPC (shop)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { h, ico } from '../dom.js';
import { moneyLine, itemIcon } from '../common.js';

export default {
  // ----- Cửa hàng
  renderShop() {
    const sh = this.shop;
    // hàng thời trang (lượng) tách tab riêng cho danh sách gọn
    const isFashion = (e) => !!S.G.items[e.id].fashion;
    // thú cưng và thức ăn thú: tab riêng
    const isPet = (e) => S.G.items[e.id].slot === 'pet' || S.G.items[e.id].type === 'petfood';
    const hasFashion = sh.items.some(isFashion);
    const hasPet = sh.items.some(isPet);
    if ((this.shopTab === 'fashion' && !hasFashion) || (this.shopTab === 'pet' && !hasPet)) this.shopTab = 'buy';
    const tab = (k, label) => h('button', { class: `tab${this.shopTab === k ? ' on' : ''}`, 'data-shtab': k, onclick: () => { this.shopTab = k; this.refresh(); } }, label);
    const tabs = h('div', { class: 'tabs' }, tab('buy', 'Mua'), hasPet ? tab('pet', 'Thú cưng') : null, hasFashion ? tab('fashion', 'Thời trang') : null, tab('sell', 'Bán'));
    let body;
    if (this.shopTab === 'sell') {
      body = h('div', null, h('div', { class: 'muted' }, 'Chọn vật phẩm trong hành trang để bán.'), this.invGrid((it, i) => this.showItem(it, { from: 'sell', slot: i })));
    } else {
      const kind = (e) => (isFashion(e) ? 'fashion' : isPet(e) ? 'pet' : 'buy');
      const list = sh.items.filter((e) => kind(e) === this.shopTab);
      body = h('div', { class: 'shop-list' }, ...list.map((e) => {
        const def = S.G.items[e.id];
        // sách nội tại chỉ đọc 1 lần nên không cho chọn số lượng (server cũng chỉ bán 1 cuốn mỗi lần)
        const multi = def.stack && def.type !== 'book';
        const qty = h('input', { type: 'number', min: 1, max: 999, value: def.type === 'potion' ? 10 : 1, class: 'in short' });
        const luong = e.cur === 'luong';
        // dấu cách không ngắt trước từ cuối: "Cấp 1" không bị tách, số cấp không đứng riêng một dòng
        return h('div', { class: 'shop-row' },
          itemIcon({ id: e.id, q: 1, r: def.grade || 0 }, { onclick: () => this.showItem({ id: e.id, q: 1, r: def.grade || 0 }, { from: 'view' }) }),
          h('div', { class: 'sh-info' }, h('div', { class: def.lv > S.me.level ? 'bad' : 'sh-name' }, def.name.replace(/ (?=\S+$)/, '\u00a0'), def.lv > 1 ? h('span', { class: 'muted' }, ` Lv${def.lv}`) : ''),
            h('div', { class: `price ${luong ? 'luong' : 'xu'}` }, ico(luong ? 'luong' : 'xu'), h('b', null, fmt(e.price)), luong ? ' lượng' : ' xu')),
          multi ? qty : null,
          h('button', { class: 'btn small primary', onclick: () => this.net.send('buy', { npc: sh.npc, id: e.id, qty: multi ? +qty.value || 1 : 1 }) }, 'Mua'));
      }));
    }
    this.frameWin(sh.title, h('div', null, tabs, body), moneyLine());
  },
};
