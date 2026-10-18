// Cửa sổ Lễ hội theo mùa (event): bảng đổi quà ở Sứ Giả Lễ Hội
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt, activeSeason, countInv } from '../../core/store.js';
import { iconURL, uiIconURL } from '../../render/icons.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { itemIcon } from '../common.js';

export default {
  // Còn đứng gần Sứ Giả Lễ Hội đã mở cửa sổ (server nhận trong 130, lấy hẹp hơn vì vị trí máy khách đi trước)
  eventNear() {
    const g = this.game;
    const n = g && g.map && g.me ? g.map.npcs.find((o) => o.id === this.eventNpc) : null;
    return !!n && Math.abs(n.x - g.me.x) <= 120;
  },

  // ----- Sự kiện theo mùa: bảng đổi quà ở Sứ Giả Lễ Hội
  renderEvent() {
    const ss = activeSeason();
    if (!ss) {
      return this.frameWin('Lễ Hội', h('div', { class: 'empty-note' }, ico('festival'),
        h('div', null, h('p', null, 'Hiện không có lễ hội nào.'), h('p', { class: 'muted' }, 'Khi mùa lễ hội tới, Sứ Giả Lễ Hội ở mỗi làng sẽ mở quầy đổi quà.'))));
    }
    const td = S.G.items[ss.token];
    const have = countInv(ss.token);
    const used = S.me.season && S.me.season.id === ss.id ? S.me.season.ex || {} : {};
    const near = !!this.eventNpc;
    const vn = (t) => {
      const d = new Date(t + 7 * 3600000);
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    const left = Math.max(1, Math.ceil((ss.end - Date.now() - (S.skew || 0)) / 86400000));
    const tokImg = () => h('img', { class: 'ev-tok', src: iconURL(td.icon), alt: '' });
    const cards = ss.exchange.map((e) => {
      const r = e.reward;
      const n = used[e.id] || 0;
      const out = e.limit && n >= e.limit;
      const can = !out && have >= e.cost;
      let pic;
      if (r.items && r.items.length) {
        const [id, q] = r.items[r.items.length - 1];
        const it = { id, q, r: S.G.items[id].grade || 0 };
        pic = itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) });
      } else pic = h('div', { class: 'slot ev-money' }, h('img', { src: uiIconURL(r.luong ? 'luong' : 'xu'), alt: '' }));
      const ex = (k) => { sfx('click'); this.net.send('seasonEx', { npc: this.eventNpc, id: e.id, n: k }); };
      const many = !e.limit && have >= e.cost * 10;
      return h('div', { class: `ev-card${can ? ' can' : ''}${out ? ' out' : ''}` },
        pic,
        h('div', { class: 'ev-info' },
          h('div', { class: 'ev-name' }, e.label),
          h('div', { class: 'ev-cost' }, tokImg(), h('b', { class: have >= e.cost ? '' : 'bad' }, `${e.cost}`),
            h('span', { class: 'muted' }, e.limit ? ` · còn ${Math.max(0, e.limit - n)}/${e.limit} lượt` : ' · không giới hạn'),
            r.days ? h('span', { class: 'muted' }, ` · hạn ${r.days} ngày`) : null)),
        h('div', { class: 'ev-btns' },
          h('button', { class: 'btn primary small', disabled: !near || !can, onclick: () => ex(1) }, out ? 'Hết lượt' : 'Đổi'),
          many && near ? h('button', { class: 'btn small', onclick: () => ex(10) }, 'x10') : null));
    });
    const hero = h('div', { class: 'ev-hero' },
      h('div', { class: 'ev-moon' }, h('img', { src: uiIconURL('festival'), alt: '' })),
      h('div', { class: 'ev-hmain' },
        h('div', { class: 'evs-title' }, ss.name),
        h('div', { class: 'ev-date' }, `${vn(ss.start)} - ${vn(ss.end - 1)} · còn ${left} ngày`),
        h('div', { class: 'ev-desc' }, ss.desc)),
      h('div', { class: 'ev-have', title: td.name }, h('img', { src: iconURL(td.icon), alt: '' }), h('b', null, fmt(have)), h('small', null, td.name)));
    const foot = near ? h('span', { class: 'muted tiny' }, `Quái thường rơi ${td.name} khi cấp quái không thấp hơn cấp ngươi quá 10; boss rơi nhiều hơn.`)
      : h('div', { class: 'row ev-foot' }, h('span', { class: 'muted' }, 'Gặp Sứ Giả Lễ Hội ở làng để đổi quà.'),
        h('button', { class: 'btn small', onclick: () => { sfx('click'); this.travelVia('travelTo', { npcType: 'event', label: 'Sứ Giả Lễ Hội' }) && this.close(); } }, ico('path'), 'Tìm đường'));
    this.frameWin('Lễ Hội', h('div', { class: 'ev-wrap' }, hero, h('div', { class: 'ev-grid' }, ...cards)), foot);
  },
};
