// Cửa sổ Bản đồ thế giới (map)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S } from '../../core/store.js';
import { buildWorldMap } from '../worldmap.js';
import { questDest, dailyDest, mapsWithMob } from '../../game/pathfind.js';
import { h } from '../dom.js';

export default {
  // ----- Bản đồ thế giới
  renderWorldMap() {
    const el = buildWorldMap({
      cur: this.game.map.id,
      questMaps: this.questMaps(),
      partyMaps: this.partyMaps(),
      eventMaps: S.event ? [{ map: S.event.map, name: S.event.name, title: S.event.title, lv: S.event.lv }] : [],
      onGo: (id) => {
        const m = S.G.maps[id];
        this.travelVia('travelTo', { map: id, label: m ? m.name : id });
      },
    });
    this.frameWin('Bản Đồ Thế Giới', el, h('span', { class: 'muted tiny' }, 'Chọn bản đồ để tự tìm đường · Phu Xe ở mỗi làng giúp đi nhanh giữa 3 làng.'));
  },

  // Bản đồ có mục tiêu nhiệm vụ chính và hằng ngày
  questMaps() {
    const maps = S.G.maps;
    const out = new Set();
    const add = (dest, mob) => {
      if (dest && dest.map) out.add(dest.map);
      const m = (dest && dest.mob) || mob;
      if (m) for (const id of mapsWithMob(maps, m) || []) out.add(id);
    };
    const q = S.me.quest;
    if (q && !q.done && !(q.st === 0 && S.me.level < q.req)) add(questDest(S, q));
    const d = S.me.daily;
    if (d && d.task && d.task.prog < d.task.n) add(dailyDest(S, d), d.task.m);
    return [...out].filter((id) => maps[id] && !maps[id].instance);
  },

  // Vị trí đồng đội theo gói 'party' gần nhất
  partyMaps() {
    return (S.party.members || []).filter((m) => m.id !== S.me.id && m.mapId).map((m) => ({ name: m.name, mapId: m.mapId }));
  },
};
