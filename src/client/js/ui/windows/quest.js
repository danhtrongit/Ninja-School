// Cửa sổ Nhiệm vụ (quest)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { vnDay, miniBar } from '../common.js';

export default {
  // ----- Nhiệm vụ
  renderQuest() {
    const q = S.me.quest;
    const d = S.me.daily;
    const parts = [];
    const goBtn = (fn) => h('button', { class: 'btn small primary qc-go', onclick: () => { sfx('click'); this.travelVia(fn); } }, ico('path'), 'Tự tìm đường');
    if (q && !q.done) {
      let state;
      let bar = null;
      if (q.st === 0) state = S.me.level >= q.req ? 'Chưa nhận - hãy gặp Trưởng Làng.' : `Cần đạt cấp ${q.req} để nhận.`;
      else if (q.st === 2 || q.prog >= q.n) state = 'Đã hoàn thành - về gặp Trưởng Làng nhận thưởng.';
      else {
        state = 'Đang thực hiện';
        bar = miniBar(q.prog, q.n);
      }
      const locked = q.st === 0 && S.me.level < q.req;
      parts.push(h('div', { class: 'sec quest-card main' }, h('div', { class: 'qc-top' }, h('div', { class: 'qc-tag' }, `Chính tuyến ${q.i + 1}/${S.G.quests.length}`), locked ? null : goBtn('travelQuest')),
        h('div', { class: 'qc-name' }, q.name), h('div', null, q.desc), bar, h('div', { class: 'good' }, state)));
    } else parts.push(h('div', { class: 'sec quest-card main' }, h('div', { class: 'qc-name' }, 'Đã hoàn thành toàn bộ nhiệm vụ chính!')));
    const done = d && d.day === vnDay() ? d.done : 0;
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      parts.push(h('div', { class: 'sec quest-card daily' }, h('div', { class: 'qc-top' }, h('div', { class: 'qc-tag' }, `Hằng ngày ${done}/20`), goBtn('travelDaily')),
        h('div', { class: 'qc-name' }, `Tiêu diệt ${d.task.n} ${mn.name} (Lv${mn.lv})`), miniBar(d.task.prog, d.task.n, 'blue')));
    } else {
      parts.push(h('div', { class: 'sec quest-card daily' }, h('div', { class: 'qc-top' }, h('div', { class: 'qc-tag' }, `Hằng ngày ${done}/20`), goBtn('travelDaily')),
        h('div', null, 'Gặp Tiểu Nhị ở làng để nhận nhiệm vụ diệt quái hằng ngày. Mỗi 5 nhiệm vụ được thêm Rương Báu.')));
    }
    parts.push(h('div', { class: 'sec tip' }, h('b', null, 'Mẹo: '), 'Boss thế giới xuất hiện định kỳ ở Rừng Trúc, Hang Dơi, Thung Lũng Sương, Đỉnh Băng Giá, Hang Quỷ và Cổng Địa Ngục. Hạ boss nhận lượng và trang bị quý!'));
    this.frameWin('Nhiệm Vụ', h('div', null, ...parts));
  },
};
