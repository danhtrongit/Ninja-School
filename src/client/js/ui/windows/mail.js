// Cửa sổ Hộp thư (mail) và ô nhập mã quà tặng
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { uiIconURL } from '../../render/icons.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { itemIcon } from '../common.js';

export default {
  // ----- Mã quà tặng (dùng ở Cài đặt và Hộp thư)
  codeBox() {
    const inp = h('input', {
      class: 'in code-in', maxlength: 24, placeholder: 'Nhập mã quà tặng', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
      'aria-label': 'Mã quà tặng', value: this.codeDraft || '',
    });
    const send = () => {
      const v = inp.value.trim();
      if (!v) return inp.focus();
      sfx('click');
      this.net.send('giftcode', { code: v });
    };
    inp.addEventListener('input', () => { this.codeDraft = inp.value; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    const r = this.codeRes;
    return h('div', { class: 'code-box' },
      h('div', { class: 'code-row' }, ico('gift'), inp, h('button', { class: 'btn primary', onclick: send }, 'Nhận quà')),
      r ? h('div', { class: `code-msg ${r.ok ? 'ok' : 'bad'}` }, r.msg) : null);
  },

  // ----- Hộp thư
  renderMail() {
    const data = this.mailData;
    if (!data) return this.frameWin('Hộp Thư', h('div', { class: 'muted' }, 'Đang tải thư...'));
    const list = data.list || [];
    const now = Date.now() + (S.skew || 0);
    const gift = (m) => !m.got && (m.xu > 0 || m.xuk > 0 || m.luong > 0 || m.items.length > 0);
    if (!list.some((m) => m.id === this.mailSel)) this.mailSel = list.length ? list[0].id : null;
    const sel = list.find((m) => m.id === this.mailSel) || null;
    // mở thư chưa đọc: báo server, đánh dấu ngay ở máy khách
    if (sel && !sel.read) {
      sel.read = true;
      this.net.send('mailRead', { id: sel.id });
    }
    const when = (t) => {
      const d = new Date(t + 7 * 3600000);
      const p2 = (x) => String(x).padStart(2, '0');
      return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
    };
    const items = list.map((m) => h('button', {
      class: `mail-item${m.id === this.mailSel ? ' sel' : ''}${m.read ? '' : ' unread'}${gift(m) ? ' has-gift' : ''}`,
      onclick: () => { sfx('click'); this.mailSel = m.id; this.refresh(); },
    },
    h('span', { class: 'mi-ico' }, ico(gift(m) ? 'gift' : 'mail')),
    h('span', { class: 'mi-main' }, h('b', null, m.title), h('small', null, `${m.from} · ${when(m.at)}`)),
    gift(m) ? h('span', { class: 'mi-badge' }, 'Quà') : null));
    let detail;
    if (!sel) {
      detail = h('div', { class: 'mail-empty' }, h('img', { src: uiIconURL('mail'), alt: '' }), h('p', null, 'Hộp thư trống.'),
        h('p', { class: 'muted tiny' }, 'Quà của Ban Quản Trị, quà giftcode và phần thưởng sự kiện khi hành trang đầy sẽ được gửi tới đây.'));
    } else {
      const att = [];
      if (sel.xu > 0) att.push(h('div', { class: 'mail-coin' }, h('img', { src: uiIconURL('xu'), alt: '' }), h('span', null, fmt(sel.xu)), h('small', null, 'xu')));
      if (sel.xuk > 0) att.push(h('div', { class: 'mail-coin' }, h('img', { src: uiIconURL('xuk'), alt: '' }), h('span', null, fmt(sel.xuk)), h('small', null, 'xu khóa')));
      if (sel.luong > 0) att.push(h('div', { class: 'mail-coin' }, h('img', { src: uiIconURL('luong'), alt: '' }), h('span', null, fmt(sel.luong)), h('small', null, 'lượng')));
      for (const it of sel.items) att.push(itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) }));
      const days = Math.max(0, Math.ceil(((data.keep || 30) * 86400000 - (now - sel.at)) / 86400000));
      const g = gift(sel);
      detail = h('div', { class: 'mail-detail' },
        h('div', { class: 'md-title' }, sel.title),
        h('div', { class: 'md-meta' }, h('span', null, 'Từ: ', h('b', null, sel.from)), h('span', null, when(sel.at)), h('span', { class: days <= 3 ? 'warn' : '' }, `tự xóa sau ${days} ngày`)),
        h('div', { class: 'md-body' }, sel.body || '(Không có nội dung)'),
        att.length ? h('div', { class: 'md-att' }, h('div', { class: 'sub-title' }, sel.got ? 'Quà đính kèm (đã nhận)' : 'Quà đính kèm'),
          h('div', { class: `md-att-grid${sel.got ? ' got' : ''}` }, ...att)) : null,
        h('div', { class: 'row md-btns' },
          g ? h('button', { class: 'btn primary', onclick: () => { sfx('click'); this.net.send('mailClaim', { id: sel.id }); } }, ico('gift'), 'Nhận quà')
            : att.length ? h('span', { class: 'md-stamp' }, 'Đã nhận') : null,
          h('button', { class: 'btn danger', disabled: g, title: g ? 'Nhận quà trước khi xóa' : 'Xóa thư', onclick: () => { sfx('click'); this.net.send('mailDel', { id: sel.id }); } }, 'Xóa')));
    }
    const unread = list.filter((m) => !m.read).length;
    const gifts = list.filter(gift).length;
    this.frameWin('Hộp Thư', h('div', { class: 'mail-wrap' },
      this.codeBox(),
      h('div', { class: 'mail-cols' },
        h('div', { class: 'mail-list' }, ...(items.length ? items : [h('div', { class: 'muted mail-none' }, 'Chưa có thư nào.')])),
        detail)),
    h('div', { class: 'row mail-foot' },
      h('span', { class: 'muted' }, `${list.length}/${data.max || 30} thư`, unread ? h('b', { class: 'gold' }, ` · ${unread} chưa đọc`) : null),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn', disabled: !list.some((m) => m.read && !gift(m)), onclick: () => { sfx('click'); this.net.send('mailDelRead'); } }, 'Xóa thư đã đọc'),
      h('button', { class: 'btn primary', disabled: !gifts, onclick: () => { sfx('click'); this.net.send('mailClaimAll'); } }, ico('gift'), gifts ? `Nhận tất cả (${gifts})` : 'Nhận tất cả')));
  },
};
