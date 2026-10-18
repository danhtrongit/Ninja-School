// Cửa sổ Bạn bè (friends)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S } from '../../core/store.js';
import { h, ico } from '../dom.js';

export default {
  // ----- Bạn bè
  renderFriends() {
    const list = this.friends || [];
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const rows = list.map((f) => h('div', { class: 'list-row' },
      h('span', { class: `dot-on${f.online ? ' on' : ''}` }),
      h('span', { class: 'lr-main' }, h('b', { class: f.online ? '' : 'muted' }, f.name), h('span', { class: 'muted' }, ` Lv${f.lv} ${S.G.classes[f.cls] ? S.G.classes[f.cls].name : ''}${f.map ? ` · ${f.map}` : ''}`)),
      f.online ? h('button', { class: 'btn small', onclick: () => { this.pmTo = f.name; this.setChatCh('pm'); this.close(); this.focusChat(); } }, 'Nhắn') : null,
      f.online ? h('button', { class: 'btn small', onclick: () => this.net.send('partyInvite', { name: f.name }) }, 'Mời nhóm') : null,
      h('button', { class: 'btn small danger', onclick: async () => (await this.ask({ title: 'Xóa bạn bè', text: `Xóa ${f.name} khỏi danh sách bạn bè?`, ok: 'Xóa', danger: true })) && this.net.send('friendDel', { name: f.name }) }, 'Xóa')));
    this.frameWin(`Bạn Bè (${list.length}/50)`, h('div', null,
      list.length ? h('div', { class: 'list' }, ...rows) : h('div', { class: 'empty-note' }, ico('friends'), h('div', null, 'Chưa có bạn bè. Bấm vào người chơi khác → "Kết bạn", hoặc nhập tên bên dưới.')),
      h('div', { class: 'row add-row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('friendAdd', { name: inName.value }) }, 'Kết bạn'))));
  },
};
