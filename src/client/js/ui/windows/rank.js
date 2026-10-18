// Cửa sổ Xếp hạng (rank), gồm tab Lôi đài
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';

export default {
  // ----- Xếp hạng
  renderRank() {
    const d = this.rankData;
    this.rankTab = this.rankTab || 'level';
    const tabs = h('div', { class: 'tabs rank-tabs' }, ...[['level', 'Cấp độ'], ['clan', 'Gia tộc'], ['kills', 'Diệt quái'], ['arena', 'Lôi đài']].map(([k, l]) =>
      h('button', { class: `tab${this.rankTab === k ? ' on' : ''}`, 'data-rktab': k, onclick: () => { this.rankTab = k; this.refresh(); } }, l)));
    let body = h('div', { class: 'muted' }, 'Đang tải...');
    if (this.rankTab === 'arena') body = this.arenaRankBody(d);
    else if (d) {
      const list = d[this.rankTab] || [];
      const no = (i) => h('span', { class: `rank-no n${i < 3 ? i + 1 : 0}` }, i + 1);
      body = h('div', { class: 'list rank-list' }, ...list.map((r, i) => {
        if (this.rankTab === 'clan') return h('div', { class: 'list-row' }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Tộc trưởng ${r.leader} · ${r.members} người · Lực chiến ${r.power}`));
        if (this.rankTab === 'kills') return h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name} · `, h('b', { class: 'gold' }, fmt(r.kills)), ' quái'));
        return h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name}${r.clan ? ` [${r.clan}]` : ''}`));
      }));
      if (!list.length) body = h('div', { class: 'muted' }, 'Chưa có dữ liệu.');
    }
    this.frameWin('Bảng Xếp Hạng', h('div', null, tabs, body), h('span', { class: 'muted tiny' }, this.rankTab === 'arena' ? 'Xếp theo điểm lôi đài · cập nhật sau mỗi trận' : 'Cập nhật mỗi phút'));
  },

  // Tab Lôi đài: thành tích của mình + nút đăng ký/hủy, top 30 theo Elo, thưởng tuần
  arenaRankBody(d) {
    const A = S.G.arena;
    if (!A) return h('div', { class: 'muted' }, 'Máy chủ chưa mở lôi đài.');
    const me = S.me.arena || { elo: A.elo, win: 0, lose: 0, draw: 0, fame: 0, wn: 0 };
    const rk = d && d.arenaMe ? d.arenaMe.rank : 0;
    const st = S.arena ? S.arena.st : 'idle';
    const low = S.me.level < A.minLv;
    let btn;
    if (st === 'queue') btn = h('button', { class: 'btn ar-join', onclick: () => { sfx('click'); this.net.send('arenaCancel'); } }, 'Hủy đăng ký');
    else if (st !== 'idle') btn = h('button', { class: 'btn ar-join', disabled: true }, 'Đang thi đấu');
    else btn = h('button', { class: 'btn primary ar-join', disabled: low, onclick: () => { sfx('click'); this.net.send('arenaJoin'); } }, low ? `Cần cấp ${A.minLv}` : 'Đăng ký thi đấu');
    const wn = Math.min(me.wn || 0, A.weeklyMin);
    const ww = A.weeklyWin || 0;
    const okWeek = wn >= A.weeklyMin && (me.ww || 0) >= ww && me.elo >= A.elo;
    let weekTxt = `Tuần này ${wn}/${A.weeklyMin} trận`;
    if (ww) weekTxt += `, thắng ${Math.min(me.ww || 0, ww)}/${ww}`;
    if (okWeek) weekTxt += ' · đủ điều kiện thưởng tuần';
    else if (wn >= A.weeklyMin && (me.ww || 0) >= ww) weekTxt += ` · cần từ ${fmt(A.elo)} điểm`;
    const card = h('div', { class: 'ar-card' },
      h('span', { class: 'ar-badge' }, ico('arena')),
      h('div', { class: 'ar-stat' },
        h('div', { class: 'ar-pts' }, h('b', null, fmt(me.elo)), h('span', null, ' điểm'), h('span', { class: `ar-rk${rk ? '' : ' none'}` }, rk ? `Hạng ${rk}` : 'Chưa xếp hạng')),
        h('div', { class: 'ar-line' }, h('span', { class: 'good' }, `${me.win} thắng`), ' · ', h('span', { class: 'bad' }, `${me.lose} thua`), me.draw ? ` · ${me.draw} hòa` : '',
          ' · ', h('span', { class: 'gold' }, `${fmt(me.fame)} danh vọng`)),
        h('div', { class: 'ar-week' }, h('span', { class: 'ar-wbar' }, h('i', { style: { width: `${(wn / A.weeklyMin) * 100}%` } })),
          h('span', { class: okWeek ? 'good' : 'muted' }, weekTxt))),
      btn);
    const rows = d && d.arena ? d.arena : null;
    const no = (i) => h('span', { class: `rank-no n${i < 3 ? i + 1 : 0}` }, i + 1);
    let list = h('div', { class: 'muted' }, 'Đang tải...');
    if (rows && rows.length) {
      list = h('div', { class: 'list rank-list ar-list' }, ...rows.map((r, i) => h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, no(i),
        h('span', { class: 'lr-main' }, h('b', null, r.name), h('span', { class: 'muted' }, ` Lv${r.level} ${S.G.classes[r.cls] ? S.G.classes[r.cls].name : ''}`)),
        h('span', { class: 'ar-wl' }, h('span', { class: 'good' }, `${r.win}T`), ' ', h('span', { class: 'bad' }, `${r.lose}B`)),
        h('span', { class: 'ar-elo' }, fmt(r.elo)))));
    } else if (rows) list = h('div', { class: 'empty-note' }, ico('arena'), 'Chưa ai lên lôi đài. Hãy là người đầu tiên!');
    const tiers = A.weekly.map((w) => `hạng ${w.from === w.to ? w.from : `${w.from}-${w.to}`}: ${w.label}`).join(' · ');
    return h('div', { class: 'ar-tab' }, card,
      h('div', { class: 'tip ar-rules' }, `1 đấu 1, trận ${Math.round(A.dur / 60000)} phút. Vào trận hồi đầy sinh lực, chakra; không dùng bình thuốc. Hết giờ bên còn nhiều % sinh lực hơn thắng. Rời trận hay mất kết nối đều tính thua (bỏ khi chưa ai ra đòn thì trận không tính). Thắng +${fmt(A.win.xu)} xu, ${A.win.fame} danh vọng; thua +${fmt(A.lose.xu)} xu, ${A.lose.fame} danh vọng (tối đa ${A.daily} trận có thưởng mỗi ngày).`),
      list,
      h('div', { class: 'tip ar-tiers' }, h('b', null, 'Thưởng tuần'), ` (0 giờ thứ Hai, gửi qua hộp thư, cần ${A.weeklyMin} trận${A.weeklyWin ? `, thắng từ ${A.weeklyWin} trận` : ''} trong tuần và từ ${fmt(A.elo)} điểm): ${tiers}.`));
  },
};
