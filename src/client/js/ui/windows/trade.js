// Cửa sổ Giao dịch (trade)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { fmt } from '../../core/store.js';
import { h, ico } from '../dom.js';
import { itemIcon } from '../common.js';

export default {
  // ----- Giao dịch
  renderTrade() {
    const t = this.trade;
    if (!t) return this.close(true);
    const mine = t.mine;
    const theirs = t.theirs;
    const offer = (side) => h('div', { class: 'trade-items' }, ...side.items.filter(Boolean).map((it) => itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) })),
      ...Array.from({ length: Math.max(0, 5 - side.items.length) }, () => h('div', { class: 'slot empty' })));
    const state = (side) => [side.lock ? h('span', { class: 'badge lock' }, 'Đã khóa') : null, side.ok ? h('span', { class: 'badge ok' }, 'Đồng ý') : null];
    const xuIn = h('input', { type: 'number', min: 0, value: this.tradeXu || 0, class: 'in short', disabled: mine.lock });
    const pushSet = () => this.net.send('tradeSet', { slots: [...this.tradeSel], xu: +xuIn.value || 0 });
    // giữ số đang gõ: cửa sổ dựng lại mỗi khi bên kia đổi đồ, không được xóa mất số xu đang nhập
    xuIn.oninput = () => { this.tradeXu = +xuIn.value || 0; };
    xuIn.onchange = () => { this.tradeXu = +xuIn.value || 0; pushSet(); };
    const inv = this.invGrid((it, i) => {
      if (mine.lock) return;
      if (this.tradeSel.has(i)) this.tradeSel.delete(i);
      else if (this.tradeSel.size < 10) this.tradeSel.add(i);
      pushSet();
    }, this.tradeSel, (it) => !!(it.b || it.exp));
    this.frameWin(`Giao dịch với ${t.with}`, h('div', { class: 'trade-wrap' },
      h('div', { class: `trade-col${mine.lock ? ' locked' : ''}` }, h('div', { class: 'sub-title' }, 'Bạn đưa ', ...state(mine)), offer(mine), h('div', { class: 'row xu' }, ico('xu'), 'Xu: ', xuIn)),
      h('div', { class: `trade-col${theirs.lock ? ' locked' : ''}` }, h('div', { class: 'sub-title' }, `${t.with} đưa `, ...state(theirs)), offer(theirs), h('div', { class: 'row xu' }, ico('xu'), `Xu: ${fmt(theirs.xu)}`)),
      h('div', { class: 'trade-inv' }, h('div', { class: 'muted tiny' }, 'Bấm vật phẩm để thêm/bỏ. Vật phẩm khóa (ổ khóa) và có hạn không giao dịch được; xu khóa không đưa vào giao dịch.'), inv)),
    h('div', { class: 'row' },
      h('button', { class: 'btn', disabled: mine.lock, onclick: () => this.net.send('tradeLock') }, 'Khóa'),
      h('button', { class: 'btn primary', disabled: !mine.lock || !theirs.lock || mine.ok, onclick: () => this.net.send('tradeOk') }, 'Đồng ý'),
      h('button', { class: 'btn danger', onclick: () => this.net.send('tradeCancel') }, 'Hủy')));
  },
};
