// Cửa sổ Nhóm (party)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S } from '../../core/store.js';
import { ELEMENT_COLORS } from '../../render/sprites.js';
import { h, ico } from '../dom.js';

export default {
  // ----- Nhóm
  renderParty() {
    const p = S.party;
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const amLeader = p.members.some((m) => m.leader && m.id === S.me.id);
    const rows = p.members.map((m) => {
      const cls = S.G.classes[m.cls];
      return h('div', { class: `list-row member${m.id === S.me.id ? ' me' : ''}` },
        h('span', { class: 'lr-badge', style: { '--c': ELEMENT_COLORS[cls.element] } }, m.leader ? '★' : m.lv),
        h('span', { class: 'lr-main' }, h('b', null, m.name), h('span', { class: 'muted' }, ` Lv${m.lv} ${cls.name} · ${m.map}`)),
        h('div', { class: 'bar hp tiny', style: { width: '90px' } }, h('i', { style: { width: `${(m.hp / Math.max(1, m.mhp)) * 100}%` } })),
        amLeader && m.id !== S.me.id ? h('button', { class: 'btn small danger', onclick: () => this.net.send('partyKick', { name: m.name }) }, 'Mời ra') : null);
    });
    this.frameWin('Nhóm', h('div', null,
      p.members.length ? h('div', { class: 'list' }, ...rows) : h('div', { class: 'empty-note' }, ico('party'), h('div', null, 'Bạn chưa có nhóm. Mời người chơi khác để lập nhóm (tối đa 6 người). Cả nhóm chia sẻ kinh nghiệm và được thưởng thêm 12% mỗi thành viên.')),
      h('div', { class: 'row add-row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('partyInvite', { name: inName.value }) }, 'Mời'))),
    p.members.length ? h('button', { class: 'btn danger', onclick: () => this.net.send('partyLeave') }, 'Rời nhóm') : null);
  },
};
