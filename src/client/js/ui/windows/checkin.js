// Cửa sổ Điểm danh hằng ngày (gift)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { iconURL, uiIconURL } from '../../render/icons.js';
import { h } from '../dom.js';
import { vnDay } from '../common.js';

export default {
  // ----- Điểm danh
  renderGift() {
    const ck = S.me.checkin || { day: '', streak: 0 };
    const claimed = ck.day === vnDay(0);
    const nextStreak = claimed ? ck.streak : ck.day === vnDay(-1) ? ck.streak + 1 : 1;
    const cur = (nextStreak - 1) % 7;
    const label = (r) => {
      const parts = [];
      if (r.xu) parts.push(`${fmt(Math.round(r.xu * (1 + S.me.level / 20)))} xu`);
      if (r.luong) parts.push(`${r.luong} lượng`);
      for (const [id, q] of r.items || []) parts.push(`${S.G.items[id].name}${q > 1 ? ` x${q}` : ''}`);
      return parts;
    };
    const bigIcon = (r, i) => {
      if (r.items && r.items.length) return h('img', { src: iconURL(S.G.items[r.items[r.items.length - 1][0]].icon, i === 6 ? 4 : 0), alt: '' });
      if (r.luong) return h('img', { src: uiIconURL('luong'), alt: '', class: 'ui' });
      return h('img', { src: uiIconURL('xu'), alt: '', class: 'ui' });
    };
    const cells = S.G.checkin.map((r, i) => {
      const got = i < cur || (claimed && i === cur);
      return h('div', { class: `gift-day${got ? ' got' : ''}${i === cur && !claimed ? ' cur' : ''}${i === 6 ? ' big' : ''}` },
        h('div', { class: 'gd-head' }, `Ngày ${i + 1}`), h('div', { class: 'gd-icon' }, bigIcon(r, i)),
        ...label(r).map((t) => h('div', { class: 'tiny' }, t)), got ? h('div', { class: 'stamp' }, 'Đã nhận') : null);
    });
    this.frameWin('Điểm Danh Hằng Ngày', h('div', null,
      h('div', { class: 'muted' }, 'Đăng nhập liên tục để nhận quà lớn hơn. Chuỗi hiện tại: ', h('b', { class: 'gold' }, `${claimed ? ck.streak : Math.max(0, nextStreak - 1)} ngày`)),
      h('div', { class: 'gift-grid' }, ...cells)),
    h('button', { class: 'btn primary', disabled: claimed, onclick: () => this.net.send('checkin') }, claimed ? 'Đã điểm danh hôm nay' : 'Điểm danh nhận quà'));
  },
};
