// Sự kiện Tà Thú: biểu ngữ HUD và cửa sổ kết quả (evresult)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { $, h, ico } from '../dom.js';

export default {
  // ---------------- Sự kiện Tà Thú
  // Biểu ngữ giữa đáy màn hình: thời gian còn lại + bản đồ, bấm để tự tìm đường tới Tà Thú.
  // Khi sự kiện vừa kết thúc bằng chiến thắng, biểu ngữ đổi thành nút xem bảng sát thương trong 2 phút.
  setEvent(ev) {
    const box = $('#hud-event');
    if (!box) return;
    this.evInfo = ev;
    // bản đồ thế giới đang mở: cập nhật dấu Tà Thú theo sự kiện mới
    if (this.winName === 'map') this.refresh();
    box.innerHTML = '';
    const res = !ev && this.evResult && performance.now() - this.evResult.at < 120000 ? this.evResult : null;
    if (!ev && !res) {
      box.classList.add('hidden');
      document.body.classList.remove('ev-on');
      return;
    }
    if (ev) {
      this.evTime = h('b', { class: 'ev-time' }, this.evLeftText(ev));
      box.append(
        h('span', { class: 'ev-ico' }, ico('beast')),
        h('span', { class: 'ev-main' },
          h('span', { class: 'ev-top' }, h('span', { class: 'ev-title' }, ev.title), this.evTime),
          h('span', { class: 'ev-sub' }, this.evBossName(ev.name), h('span', { class: 'ev-map' }, ev.mapName))),
        h('span', { class: 'ev-go' }, ico('path')));
      box.title = `${ev.name} (cấp ${ev.lv}) đang ở ${ev.mapName} - bấm để tự tìm đường`;
      box.classList.remove('done');
    } else {
      this.evTime = null;
      box.append(
        h('span', { class: 'ev-ico' }, ico('rank')),
        h('span', { class: 'ev-main' },
          h('span', { class: 'ev-top' }, h('span', { class: 'ev-title' }, res.data.title)),
          h('span', { class: 'ev-sub' }, h('span', { class: 'ev-boss' }, 'Xem bảng sát thương'))));
      box.title = 'Xem kết quả sự kiện';
      box.classList.add('done');
    }
    box.onclick = (e) => {
      e.stopPropagation();
      sfx('click');
      if (this.evInfo) this.goEvent(this.evInfo);
      else if (this.evResult) this.open('evresult');
    };
    box.classList.remove('hidden');
    document.body.classList.add('ev-on');
  },

  // Tên boss trên biểu ngữ: hậu tố " Tà Thú" trùng tiêu đề nên điện thoại ẩn đi để tên chính không bị cắt
  evBossName(name) {
    const m = /^(.+?)( Tà Thú)$/.exec(name || '');
    return h('span', { class: 'ev-boss' }, m ? m[1] : name || '', m ? h('span', { class: 'ev-sfx' }, m[2]) : null);
  },

  evLeftText(ev) {
    const s = Math.max(0, Math.ceil((ev.until - performance.now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },

  // Đã ở gần Tà Thú thì chọn nó làm mục tiêu, chưa thì tự tìm đường tới chỗ nó xuất hiện
  goEvent(ev) {
    const g = this.game;
    if (!g || !g.map) return;
    const mo = g.monsters.get(ev.id);
    if (g.map.id === ev.map && mo && Math.abs(mo.x - g.me.x) < 160) {
      g.setTarget({ kind: 'm', id: ev.id });
      return;
    }
    this.travelVia('travelTo', { map: ev.map, x: mo ? Math.round(mo.x) : ev.x, label: ev.name });
  },

  showEventResult(m) {
    this.evResult = { data: m, at: performance.now() };
    if (!this.evInfo) this.setEvent(null);
    // chỉ tự mở cho người đang ở bản đồ của boss (người đã đi nơi khác có thể đang đánh quái);
    // không chen ngang khi đang giao dịch/cường hóa/mua bán
    const here = !m.map || S.mapId === m.map;
    if (here && (!this.winName || this.winName === 'evresult' || this.winName === 'map' || this.winName === 'quest')) this.open('evresult');
    else this.toast('Tà Thú đã bị hạ! Bấm biểu ngữ dưới màn hình để xem bảng sát thương.', 'reward');
  },

  renderEvResult() {
    const r = this.evResult && this.evResult.data;
    if (!r) return this.close();
    const mm = Math.floor(r.took / 60);
    const ss = String(r.took % 60).padStart(2, '0');
    const head = h('div', { class: 'evr-head' },
      h('span', { class: 'evr-ico' }, ico('beast')),
      h('div', null,
        h('div', { class: 'evr-boss' }, r.name),
        h('div', { class: 'muted' }, `Bị hạ tại ${r.mapName} sau ${mm}:${ss} · ${r.count} người tham gia`)));
    const me = r.me;
    const mine = me
      ? h('div', { class: `evr-me${me.rank <= 3 ? ` top${me.rank}` : ''}` },
        h('div', { class: 'evr-me-rank' }, h('small', null, 'Hạng'), h('b', null, `#${me.rank}`)),
        h('div', { class: 'evr-me-info' },
          h('div', null, h('b', null, fmt(me.dmg)), ' sát thương · ', h('b', null, `${me.pct}%`), ' máu Tà Thú'),
          h('div', { class: 'evr-reward' }, me.reward || 'Chưa đạt 1% máu để nhận thưởng')))
      : h('div', { class: 'evr-me none' }, 'Bạn không tham gia trận này.');
    const best = r.top.length ? r.top[0].dmg || 1 : 1;
    const rows = r.top.map((x) => h('div', { class: `evr-row${me && x.rank === me.rank ? ' mine' : ''}` },
      h('span', { class: `evr-rank r${Math.min(4, x.rank)}` }, x.rank),
      h('span', { class: 'evr-name' }, x.name),
      h('span', { class: 'evr-dmg' }, h('i', { style: { width: `${Math.max(2, (x.dmg / best) * 100)}%` } }), h('span', null, `${fmt(x.dmg)} · ${x.pct}%`)),
      h('span', { class: 'evr-rw' }, x.reward || '-')));
    const tiers = h('div', { class: 'evr-tiers muted tiny' }, 'Thưởng: hạng 1 sách nội tại + 30 lượng · hạng 2-3 lượng + đá cường hóa · top 10 rương báu · mọi người gây từ 1% máu nhận lượng và xu.');
    this.frameWin(r.title, h('div', { class: 'evr' }, head, mine, h('div', { class: 'sec-title' }, 'Bảng sát thương'), h('div', { class: 'evr-list' }, rows), tiers),
      h('button', { class: 'btn primary', onclick: () => this.close() }, 'Đóng'));
  },
};
