// Cửa sổ Xem thông tin người chơi khác (inspect)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { ELEMENT_COLORS } from '../../render/sprites.js';
import { h } from '../dom.js';

export default {
  renderInspect() {
    const d = this.inspectData;
    if (!d) return;
    const cls = S.G.classes[d.cls];
    this.frameWin(`Thông tin ${d.name}`, h('div', { class: 'inspect-wrap' },
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, `Cấp ${d.lv}`), h('span', { class: 'tag', style: { color: ELEMENT_COLORS[cls.element] } }, `Phái ${cls.name}`),
        d.clan ? h('span', { class: 'tag clan' }, `Gia tộc ${d.clan}`) : null, d.pk ? h('span', { class: 'tag bad' }, `Hiếu chiến ${d.pk}`) : null),
      h('div', { class: 'inspect-cols' },
        h('div', null, this.eqTabs(), this.equipGrid(d.equip, false, { silhouette: true, cls: d.cls, name: d.name, el: cls.element, weaponType: cls.weapon })),
        h('div', { class: 'sec grid2' }, ...[['Sinh lực', d.s.maxHp], ['Chakra', d.s.maxMp], ['Tấn công', d.s.atk], ['Phòng thủ', d.s.def], ['Chí mạng', `${d.s.crit}%`], ['Né tránh', `${d.s.dodge}%`]]
          .map(([a, b]) => h('div', { class: 'kv' }, h('span', null, a), h('b', null, typeof b === 'number' ? fmt(b) : b)))))));
  },
};
