// Cửa sổ Thủ kho (storage)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { sfx } from '../../core/sound.js';
import { h } from '../dom.js';
import { itemIcon } from '../common.js';

export default {
  // ----- Thủ kho
  renderStorage() {
    const st = this.storage;
    if (!st) return;
    const grid = h('div', { class: 'inv-grid' }, ...st.items.map((it, i) => (it
      ? itemIcon(it, { onclick: () => { sfx('click'); this.net.send('storeTake', { npc: st.npc, slot: i }); } })
      : h('div', { class: 'slot empty' }))));
    const used = st.items.filter(Boolean).length;
    this.frameWin('Thủ Kho', h('div', { class: 'store-wrap' },
      h('div', { class: 'sec' }, h('div', { class: 'sub-title' }, `Kho đồ ${used}/${st.items.length}`), h('div', { class: 'muted tiny' }, 'Bấm để lấy ra'), grid),
      h('div', { class: 'sec' }, h('div', { class: 'sub-title' }, 'Hành trang'), h('div', { class: 'muted tiny' }, 'Bấm để cất vào kho'), this.invGrid((it, i) => { sfx('click'); this.net.send('storePut', { npc: st.npc, slot: i }); }))),
    h('span', { class: 'muted tiny' }, 'Kho đồ dùng chung giữa mọi làng, miễn phí.'));
  },
};
