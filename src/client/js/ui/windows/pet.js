// Cửa sổ Thú cưng (pet)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt, itemStats, rarityColor, myPet } from '../../core/store.js';
import { drawPet, petFlies } from '../../render/petart.js';
import { h, ico } from '../dom.js';
import { itemIcon } from '../common.js';

export default {
  // ----- Thú cưng
  // Dòng cấp thú, EXP, thân mật, kỹ năng trong chi tiết vật phẩm
  petLines(it, def) {
    const P = S.G.pet;
    const lv = it.plv || 1;
    const sk = (def.petSkills || []).map((k) => P.skills[k] && P.skills[k].name).filter(Boolean);
    const rows = [h('div', { class: 'stat' }, 'Cấp thú: ', h('b', null, `${lv}/${P.maxLv}`))];
    if (it.plv && lv < P.maxLv) rows.push(h('div', { class: 'stat' }, 'EXP thú: ', h('b', null, `${fmt(it.pexp || 0)}/${fmt(P.need[lv])}`)));
    if (it.love != null) rows.push(h('div', { class: 'stat' }, 'Thân mật: ', h('b', { class: 'pet-love-t' }, `${it.love}/${P.loveMax}`)));
    if (sk.length) rows.push(h('div', { class: 'stat' }, 'Kỹ năng: ', h('b', null, sk.join(', '))));
    return h('div', { class: 'id-stats id-pet' }, ...rows);
  },

  // Mô tả kỹ năng thú ở cấp lv (short: chỉ con số, dùng cho dòng "cấp sau")
  petSkillText(k, lv, short) {
    const sk = S.G.pet.skills[k];
    const pct = k === 'heal' ? `${sk.pct[lv].toLocaleString('vi-VN')}%` : '';
    if (k === 'pick') return short ? `tầm nhặt ${sk.r[lv]}` : `Tự nhặt vật phẩm rơi quanh chủ (tầm nhặt ${sk.r[lv]}), mỗi ${(sk.every / 1000).toLocaleString('vi-VN')} giây.`;
    if (k === 'heal') return short ? `hồi ${pct} sinh lực` : `Khi chủ dưới ${sk.below}% sinh lực: hồi ${pct} sinh lực tối đa mỗi ${sk.every / 1000} giây.`;
    return '';
  },

  // Số liệu hay đổi của thú đang mang (EXP, thân mật, tâm trạng): dùng chung cho dựng cửa sổ và cập nhật tại chỗ
  petView(it) {
    const P = S.G.pet;
    const lv = it.plv || 1;
    const max = lv >= P.maxLv;
    const love = it.love == null ? 50 : it.love;
    const lazy = love < P.loveLazy;
    return {
      lv, max, love, lazy, full: max && love >= P.loveMax,
      mood: love >= 80 ? ['good', 'Rất quấn chủ'] : love >= 50 ? ['good', 'Vui vẻ'] : !lazy ? ['warn', 'Hơi đói'] : ['bad', 'Đói và dỗi: không dùng kỹ năng'],
      share: `Nhận ${Math.round(P.share * (1 + love / 100) * 100)}% EXP diệt quái`,
      expW: `${max ? 100 : Math.min(100, ((it.pexp || 0) / P.need[lv]) * 100)}%`,
      expT: max ? 'Cấp tối đa' : `EXP ${fmt(it.pexp || 0)}/${fmt(P.need[lv])}`,
    };
  },

  // Những gì đổi thì phải dựng lại cả cửa sổ (cấp, dỗi, no, số thức ăn, thú trong túi)
  petSig() {
    const mp = myPet();
    const foods = S.inv.map((x) => (x && (S.G.items[x.id].type === 'petfood' || S.G.items[x.id].slot === 'pet') ? `${x.id}:${x.q}:${x.plv || 0}` : '')).join();
    if (!mp) return `-|${foods}`;
    const v = this.petView(mp.it);
    return `${mp.it.id}|${v.lv}|${v.lazy}|${v.full}|${foods}`;
  },

  // Gói pet/inv đến liên tục khi đánh quái: chỉ sửa thanh EXP, thân mật, tâm trạng tại chỗ để không dựng lại DOM
  // (dựng lại giữa lúc bấm làm mất cú bấm "Cho ăn", ngắt cuộn quán tính trên điện thoại)
  petSync() {
    const el = this.petEls;
    const mp = myPet();
    if (!el || !mp || !el.expI.isConnected || this.petSig() !== el.sig) return this.refresh();
    const v = this.petView(mp.it);
    el.expI.style.width = v.expW;
    el.expT.textContent = v.expT;
    el.loveI.style.width = `${v.love}%`;
    el.loveT.textContent = `Thân mật ${v.love}/${S.G.pet.loveMax}`;
    el.mood.className = `tiny ${v.mood[0]}`;
    el.mood.textContent = v.mood[1];
    el.share.textContent = v.share;
  },

  async feedPet(slot) {
    const fd = S.inv[slot];
    const mp = myPet();
    if (fd && fd.b && mp && !mp.it.b && !(await this.ask({ title: 'Thức ăn khóa', icon: 'lock', ok: 'Vẫn cho ăn',
      text: `${S.G.items[fd.id].name} đang khóa. Cho ăn thì ${mp.def.name} cũng bị khóa (không giao dịch được). Tiếp tục?` }))) return;
    this.petHappy = performance.now();
    this.net.send('useItem', { slot });
  },

  drawPetFig(t) {
    const cv = this.petCv;
    const o = this.petFig;
    if (!cv || !o) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    const hp = this.petHappy ? (performance.now() - this.petHappy) / 1200 : 1;
    // thú bay: nhấp nhô nhẹ phía trên bóng
    const lift = petFlies(o.kind) ? 4 + Math.round(Math.sin(t * 2.4)) * 2 : 0;
    drawPet(ctx, cv.width / 2, cv.height - 6 - lift, o.kind, { t, dir: 1, lv: o.lv, scale: 5, still: true, noShadow: true, happy: hp < 1 ? hp : 0 });
  },

  renderPet() {
    const P = S.G.pet;
    const mp = myPet();
    this.petEls = null;
    if (!P) return this.frameWin('Thú Cưng', h('div', { class: 'muted' }, 'Máy chủ chưa hỗ trợ thú cưng.'));
    if (!mp) {
      // chưa mang thú: liệt kê thú trong hành trang để mang theo
      const bag = S.inv.map((it, i) => [it, i]).filter(([it]) => it && S.G.items[it.id].slot === 'pet');
      this.petCv = null;
      return this.frameWin('Thú Cưng', h('div', { class: 'pet-empty' },
        h('div', { class: 'pet-none' }, ico('pet'), h('span', null, 'Bạn chưa mang thú cưng theo.')),
        bag.length ? h('div', { class: 'pet-bag' }, ...bag.map(([it, i]) => {
          const def = S.G.items[it.id];
          return h('div', { class: 'pet-bag-row' }, itemIcon(it, { onclick: () => this.showItem(it, { from: 'inv', slot: i }) }),
            h('div', { class: 'grow' }, h('div', { style: { color: rarityColor(it) } }, def.name), h('div', { class: 'tiny muted' }, `Cấp thú ${it.plv || 1} · yêu cầu nhân vật cấp ${def.lv}`)),
            h('button', { class: 'btn small primary', disabled: def.lv > S.me.level, onclick: () => this.net.send('equip', { slot: i }) }, def.lv > S.me.level ? `Cần cấp ${def.lv}` : 'Mang theo'));
        })) : h('div', { class: 'muted' }, 'Thú cưng bán ở Tiệm Thuốc (lượng). Rồng Con chỉ rơi từ Long Vương.')),
      h('span', { class: 'muted tiny' }, 'Thú cưng nhận một phần EXP khi bạn diệt quái, chỉ số tăng theo cấp thú.'));
    }
    const { it, def } = mp;
    const v = this.petView(it);
    const { lv, max, love, lazy, full } = v;
    const cv = h('canvas', { width: 120, height: 104 });
    this.petCv = cv;
    this.petFig = { kind: def.look, lv };
    // chỉ số hiện tại -> cấp sau
    const cur = itemStats({ id: it.id, plv: lv });
    const nxt = max ? null : itemStats({ id: it.id, plv: lv + 1 });
    const stats = Object.keys(cur).map((k) => h('div', { class: 'kv' }, h('span', null, S.G.statLabels[k]),
      h('b', null, `+${cur[k]}`, nxt && nxt[k] !== cur[k] ? h('em', null, ` → ${nxt[k]}`) : null)));
    const skills = (def.petSkills || []).filter((k) => P.skills[k]).map((k) => h('div', { class: `pet-skill${lazy ? ' off' : ''}` },
      h('div', { class: 'row between' }, h('b', null, P.skills[k].name), h('span', { class: `tag ${lazy ? 'bad' : 'sk-auto'}` }, lazy ? 'Đang dỗi' : 'Tự động')),
      h('div', { class: 'tiny' }, this.petSkillText(k, lv)),
      max ? null : h('div', { class: 'tiny muted' }, `Cấp ${lv + 1}: ${this.petSkillText(k, lv + 1, true)}`)));
    const foods = Object.keys(S.G.items).filter((id) => S.G.items[id].type === 'petfood')
      .sort((a, b) => S.G.items[a].effect.petExp - S.G.items[b].effect.petExp);
    const feed = foods.map((id) => {
      const fd = S.G.items[id];
      const n = S.inv.reduce((s2, x) => s2 + (x && x.id === id ? x.q : 0), 0);
      // ưu tiên thức ăn cùng trạng thái khóa với thú để không khóa thú ngoài ý muốn
      const same = S.inv.findIndex((x) => x && x.id === id && !!x.b === !!it.b);
      const slot = same >= 0 ? same : S.inv.findIndex((x) => x && x.id === id);
      return h('div', { class: 'pet-food' }, itemIcon({ id, q: n || 1 }, { onclick: () => this.showItem({ id, q: n || 1 }, { from: 'view' }) }),
        h('div', { class: 'pf-txt' }, h('div', { class: 'pf-name' }, fd.name),
          h('div', { class: 'tiny muted' }, `+${fmt(fd.effect.petExp)} EXP · +${fd.effect.love} thân mật`)),
        h('button', { class: 'btn small primary', disabled: !n || full, onclick: () => this.feedPet(slot) }, full ? 'Đã no' : n ? 'Cho ăn' : 'Chưa có'));
    });
    const el = this.petEls = {
      expI: h('i', { style: { width: v.expW } }), expT: h('span', null, v.expT),
      loveI: h('i', { style: { width: `${love}%` } }), loveT: h('span', null, `Thân mật ${love}/${P.loveMax}`),
      mood: h('div', { class: `tiny ${v.mood[0]}` }, v.mood[1]), share: h('span', { class: 'tag' }, v.share),
    };
    this.frameWin('Thú Cưng', h('div', { class: 'pet-wrap' },
      h('div', { class: 'pet-head' },
        h('div', { class: 'pet-stage' }, cv, h('span', { class: 'lv-badge' }, lv)),
        h('div', { class: 'pet-info' },
          h('div', { class: 'big-name', style: { color: rarityColor(it) } }, def.name),
          h('div', { class: 'tags' }, h('span', { class: 'tag' }, `Cấp ${lv}/${P.maxLv}`), el.share),
          h('div', { class: 'pbar exp' }, el.expI, el.expT),
          h('div', { class: 'pbar love' }, el.loveI, el.loveT),
          el.mood)),
      h('div', { class: 'pet-cols' },
        h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, max ? 'Chỉ số' : 'Chỉ số (cấp sau)'), h('div', { class: 'grid2 pet-stats' }, ...stats)),
        h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Kỹ năng tự động'), ...skills)),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title row between' }, h('span', null, 'Cho ăn'),
        h('span', { class: `tiny ${full ? 'good' : 'muted'}` }, full ? 'Thú đã đạt cấp và thân mật tối đa' : 'Mua ở Tiệm Thuốc')),
        h('div', { class: 'pet-foods' }, ...feed))),
    h('div', { class: 'row between pet-foot' }, h('span', { class: 'muted tiny' }, `Thân mật giảm dần khi mang theo; dưới ${P.loveLazy} thú dỗi, không dùng kỹ năng.`),
      h('button', { class: 'btn small', onclick: () => this.net.send('unequip', { slot: 'pet' }) }, 'Cất thú')));
    el.sig = this.petSig();
    this.drawPetFig(performance.now() / 1000);
  },
};
