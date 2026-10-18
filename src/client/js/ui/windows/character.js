// Cửa sổ Nhân vật (char): chỉ số, tiềm năng
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { drawPortrait, ELEMENT_COLORS } from '../../render/sprites.js';
import { h, ico } from '../dom.js';
import { STYLE_SLOTS, itemIcon, emptySlot } from '../common.js';

export default {
  // ----- Nhân vật
  renderChar() {
    const me = S.me;
    const s = me.s;
    const cls = S.G.classes[me.cls];
    const el = S.G.elements[cls.element];
    const statRow = (k) => h('div', { class: 'stat-row' },
      h('span', { class: 'sn' }, S.G.statNames[k]), h('b', null, me.stats[k], s[k] !== me.stats[k] ? h('em', null, ` +${s[k] - me.stats[k]}`) : null),
      h('button', { class: 'btn small', disabled: me.potential < 1, onclick: () => this.net.send('addStat', { k, n: 1 }) }, '+1'),
      h('button', { class: 'btn small', disabled: me.potential < 10, onclick: () => this.net.send('addStat', { k, n: 10 }) }, '+10'));
    const desc = {
      str: '+2 tấn công mỗi điểm', agi: '+chí mạng, né tránh, chính xác', int: '+6 chakra, +0.6% sát thương kỹ năng', vit: '+12 sinh lực, +0.6 phòng thủ',
    };
    const derived = [
      ['Sinh lực', fmt(s.maxHp), 'hp'], ['Chakra', fmt(s.maxMp), 'mp'], ['Tấn công', fmt(s.atk), 'atk'], ['Phòng thủ', fmt(s.def), 'def'],
      ['Chí mạng', `${s.crit}%`], ['Né tránh', `${s.dodge}%`], ['Chính xác', s.hit], ['Tốc chạy', `+${s.spd}%`],
      ['ST kỹ năng', `+${s.skillDmg}%`], ['Kinh nghiệm', `x${s.expMul}`],
    ];
    // chỉ số từ kỹ năng nội tại (server cũ không gửi thì bỏ qua)
    if (s.critDmg != null) derived.push(['ST chí mạng', `${s.critDmg}%`]);
    if (s.resist) {
      const foe = Object.keys(S.G.elements).find((k) => S.G.elements[k].beats === cls.element);
      derived.push([`Kháng ${foe ? S.G.elements[foe].name : 'hệ khắc'}`, `${s.resist}%`]);
    }
    if (s.mpRegen) derived.push(['Chakra/giây', `+${s.mpRegen}`, 'mp']);
    if (s.lifesteal) derived.push(['Hút máu', `${s.lifesteal}%`, 'hp']);
    // phần tốc chạy đến từ thú cưỡi (đã gồm trong Tốc chạy)
    if (s.mountSpd) derived.push(['Thú cưỡi', `+${s.mountSpd}% tốc`]);
    const por = h('canvas', { width: 72, height: 72 });
    drawPortrait(por.getContext('2d'), { cls: me.cls, gender: me.gender, look: me.look, name: me.name, el: cls.element, weaponType: null });
    this.frameWin('Nhân Vật', h('div', { class: 'char-wrap' },
      h('div', { class: 'char-head' },
        h('div', { class: 'por-ring' }, por, h('span', { class: 'lv-badge' }, me.level)),
        h('div', { class: 'ch-info' },
          h('div', { class: 'big-name' }, me.name),
          h('div', { class: 'tags' }, h('span', { class: 'tag' }, `Phái ${cls.name}`), h('span', { class: 'tag', style: { color: ELEMENT_COLORS[cls.element] } }, `Hệ ${el.name}`),
            me.clan ? h('span', { class: 'tag clan' }, `Gia tộc ${me.clan.name}`) : null),
          h('div', { class: 'pbar exp' }, h('i', { style: { width: `${Math.min(100, (me.exp / Math.max(1, me.need)) * 100)}%` } }), h('span', null, me.level >= (S.G.maxLevel || 100) ? 'MAX' : `EXP ${fmt(me.exp)}/${fmt(me.need)}`)),
          h('div', { class: 'muted tiny' }, `Đã diệt ${fmt(me.kills)} quái`))),
      // ngoại trang: 4 ô thời trang + thú cưng, bấm để xem / tháo
      h('div', { class: 'char-style' }, h('span', { class: 'cs-title' }, 'Ngoại trang'),
        ...STYLE_SLOTS.map((k) => {
          const it = S.equip[k];
          return h('div', { class: 'cs-cell', title: S.G.slotNames[k] },
            it ? itemIcon(it, { onclick: () => this.showItem(it, { from: 'eq', slot: k }) }) : emptySlot(k),
            h('label', null, S.G.slotNames[k]));
        })),
      h('div', { class: 'char-cols' },
        h('div', { class: 'sec' }, h('div', { class: 'sec-title row between' }, h('span', null, 'Điểm tiềm năng'), h('span', { class: `pts${me.potential ? ' good' : ''}` }, `Còn ${me.potential}`)),
          ...['str', 'agi', 'int', 'vit'].map((k) => h('div', { class: 'stat-block' }, statRow(k), h('div', { class: 'muted tiny' }, desc[k])))),
        h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Chỉ số chiến đấu'),
          h('div', { class: 'grid2' }, ...derived.map(([a, b, c]) => h('div', { class: `kv${c ? ` k-${c}` : ''}` }, h('span', null, a), h('b', null, b))))))),
    h('div', { class: 'row between char-foot' },
      h('button', { class: 'btn small pet-open', onclick: () => this.open('pet') }, ico('pet'), ' Thú cưng'),
      h('button', { class: 'btn small', onclick: () => {
        this.ask({ title: 'Tẩy tiềm năng', text: 'Tẩy toàn bộ điểm tiềm năng với giá 20 lượng?', ok: 'Tẩy điểm', icon: 'luong' }).then((y) => y && this.net.send('resetStats'));
      } }, 'Tẩy điểm (20 lượng)')));
  },
};
