// Cửa sổ Gia tộc (clan)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { h, ico } from '../dom.js';

const RANK_NAMES = { leader: 'Tộc trưởng', elder: 'Trưởng lão', member: 'Thành viên' };

export default {
  // ----- Gia tộc
  renderClan() {
    const c = S.clanInfo;
    if (!c || !c.members) {
      this.frameWin('Gia Tộc', h('div', { class: 'empty-note' }, ico('clan'), h('div', null, h('p', null, 'Bạn chưa có gia tộc.'), h('p', { class: 'muted' }, 'Gặp Lão Gia Tộc ở bất kỳ làng nào để lập gia tộc (cần cấp 15 và 50.000 xu), hoặc nhờ tộc trưởng mời bạn.'))));
      return;
    }
    const canManage = c.myRank !== 'member';
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const notice = h('textarea', { class: 'in', rows: 2, maxlength: 120 }, c.notice);
    const rows = c.members.map((m) => h('div', { class: `list-row${m.name === S.me.name ? ' me' : ''}` },
      h('span', { class: `dot-on${m.online ? ' on' : ''}` }),
      h('span', { class: 'lr-main' }, h('b', { class: m.online ? '' : 'muted' }, m.name), h('span', { class: `rank-tag r-${m.rank}` }, RANK_NAMES[m.rank]), h('span', { class: 'muted' }, ` Lv${m.lv} ${m.cls ? S.G.classes[m.cls].name : ''}`)),
      c.myRank === 'leader' && m.rank !== 'leader' ? h('button', { class: 'btn small', onclick: () => this.net.send('clanPromote', { name: m.name }) }, m.rank === 'elder' ? 'Giáng' : 'Thăng') : null,
      c.myRank === 'leader' && m.rank !== 'leader' ? h('button', { class: 'btn small', onclick: async () => (await this.ask({ title: 'Nhường chức', text: `Nhường chức tộc trưởng cho ${m.name}? Bạn sẽ trở thành thành viên thường.`, ok: 'Nhường', danger: true })) && this.net.send('clanPromote', { name: m.name, rank: 'leader' }) }, 'Nhường') : null,
      canManage && m.rank !== 'leader' && m.name !== S.me.name ? h('button', { class: 'btn small danger', onclick: async () => (await this.ask({ title: 'Đuổi khỏi gia tộc', text: `Mời ${m.name} rời gia tộc?`, ok: 'Đuổi', danger: true })) && this.net.send('clanKick', { name: m.name }) }, 'Đuổi') : null));
    this.frameWin(`Gia Tộc ${c.name}`, h('div', null,
      h('div', { class: 'sec clan-head' }, h('div', { class: 'clan-crest' }, ico('clan')), h('div', { class: 'grow' }, h('div', null, 'Tộc trưởng: ', h('b', { class: 'gold' }, c.leader), ` · Thành viên: ${c.members.length}/${c.max}`),
        h('div', null, h('b', { class: 'gold' }, `Cấp ${c.level || 1}`), c.need ? ` · Kinh nghiệm ${fmt(c.exp)}/${fmt(c.need)}` : ' · Cấp tối đa', ` · Thành viên +${c.bonus || 1}% EXP · Quỹ ${fmt(c.fund || 0)} xu`),
        h('div', { class: 'pbar exp' }, h('i', { style: { width: `${c.need ? Math.min(100, (c.exp / c.need) * 100) : 100}%` } })),
        canManage ? h('div', { class: 'row' }, notice, h('button', { class: 'btn small', onclick: () => this.net.send('clanNotice', { text: notice.value }) }, 'Lưu')) : h('div', { class: 'notice' }, c.notice))),
      h('div', { class: 'list' }, ...rows),
      canManage ? h('div', { class: 'row add-row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('clanInvite', { name: inName.value }) }, 'Mời vào')) : null,
      (() => {
        const xuIn = h('input', { type: 'number', min: 1000, step: 1000, value: 10000, class: 'in short' });
        return h('div', { class: 'row add-row' }, h('span', null, 'Góp quỹ (100 xu = 1 EXP gia tộc):'), xuIn,
          h('button', { class: 'btn primary', onclick: () => this.net.send('clanDonate', { xu: +xuIn.value || 0 }) }, 'Góp'));
      })(),
      h('div', { class: 'muted tiny' }, 'Chat gia tộc: chọn kênh "Gia tộc" hoặc gõ /g tin nhắn')),
    h('button', { class: 'btn danger', onclick: async () => (await this.ask({ title: 'Rời gia tộc', text: 'Rời khỏi gia tộc?', ok: 'Rời', danger: true })) && this.net.send('clanLeave') }, 'Rời gia tộc'));
  },
};
