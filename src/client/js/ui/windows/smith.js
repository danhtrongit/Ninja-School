// Cửa sổ Thợ Rèn (upgrade): Cường hóa / Khảm ngọc / Ghép ngọc
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt, itemName, rarityColor, gemDef, gemHoles, gemText, gemParts, gemColor } from '../../core/store.js';
import { iconURL } from '../../render/icons.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { gearSlots, itemIcon } from '../common.js';

export default {
  // ----- Thợ Rèn: Cường hóa / Khảm ngọc / Ghép ngọc (tab [data-smtab])
  smithTabs(tab) {
    const btn = (k, label) => h('button', {
      class: `tab${tab === k ? ' on' : ''}`, 'data-smtab': k,
      onclick: () => { this.smTab = k; this.upgradeFlash = null; this.gemFlash = null; this.gemPop = null; this.refresh(); },
    }, label);
    return h('div', { class: 'tabs sm-tabs' }, btn('upg', 'Cường hóa'), btn('gem', 'Khảm ngọc'), btn('merge', 'Ghép ngọc'));
  },

  renderUpgrade() {
    const tab = ['gem', 'merge'].includes(this.smTab) && S.G.gems ? this.smTab : 'upg';
    if (tab === 'gem') return this.renderGemPut();
    if (tab === 'merge') return this.renderGemMerge();
    const U = S.G.upgrade;
    const list = [];
    // thú cưng, thời trang không cường hóa được: không bày ra
    for (const s of S.G.slots) if (S.equip[s] && !S.G.items[S.equip[s].id].noUpgrade) list.push({ it: S.equip[s], src: 'eq', slot: s });
    S.inv.forEach((it, i) => {
      if (it && S.G.items[it.id].type === 'equip' && !S.G.items[it.id].noUpgrade) list.push({ it, src: 'inv', slot: i });
    });
    const sel = this.upgradeSel ? list.find((x) => x.src === this.upgradeSel.src && String(x.slot) === String(this.upgradeSel.slot)) : null;
    const grid = h('div', { class: 'inv-grid' }, ...list.map((x) => itemIcon(x.it, { sel: sel && sel.it === x.it, onclick: () => { this.upgradeSel = { src: x.src, slot: x.slot }; this.upgradeFlash = null; this.refresh(); } })));
    let panel = h('div', { class: 'empty-note' }, ico('settings'), h('div', null, 'Chọn trang bị cần cường hóa (đang mặc hoặc trong túi).'));
    // chi tiết món nằm cột trái dưới danh sách, cột phải chỉ có hộp cường hóa để nút CƯỜNG HÓA luôn trong khung nhìn
    let detail = null;
    if (sel) {
      const it = sel.it;
      const def = S.G.items[it.id];
      const plus = it.p || 0;
      detail = this.itemDetail(it, null, { gems: 'short' });
      if (plus >= U.max) panel = h('div', { class: 'upg-box' }, h('div', { class: 'upg-plus' }, h('span', { class: 'next' }, `+${plus}`)), h('div', { class: 'good' }, 'Đã đạt cấp tối đa!'));
      else {
        const stone = U.stone[plus];
        const need = U.stoneQty[plus];
        const have = S.inv.reduce((n, x) => n + (x && x.id === stone ? x.q : 0), 0);
        const cost = U.cost[def.tier][plus];
        const charms = S.inv.reduce((n, x) => n + (x && x.id === 'charm' ? x.q : 0), 0);
        const useCharm = h('input', { type: 'checkbox', class: 'switch', checked: !!this.useCharm && charms > 0, disabled: plus < 4 || charms < 1, onchange: (e) => { this.useCharm = e.target.checked; } });
        panel = h('div', null,
          h('div', { class: `upg-box ${this.upgradeFlash || ''}` },
            h('div', { class: 'upg-plus' }, h('span', null, `+${plus}`), h('i', null, '→'), h('span', { class: 'next' }, `+${plus + 1}`)),
            h('div', { class: 'rate' }, h('span', null, 'Tỉ lệ thành công'), h('div', { class: 'pbar rate-bar' }, h('i', { style: { width: `${U.rate[plus]}%` } }), h('span', null, `${U.rate[plus]}%`))),
            h('div', { class: `req ${have >= need ? 'good' : 'bad'}` }, h('img', { src: iconURL(S.G.items[stone].icon), alt: '' }), `${S.G.items[stone].name}: ${have}/${need}`),
            h('div', { class: `req ${S.me.xu >= cost ? '' : 'bad'}` }, ico('xu'), `Phí: ${fmt(cost)} xu`),
            plus >= 4 ? h('div', { class: 'warn' }, 'Thất bại sẽ bị giảm 1 cấp (trừ khi dùng Bùa Bảo Hộ).') : h('div', { class: 'muted' }, 'Thất bại không mất cấp.'),
            h('label', { class: 'set-row' }, h('span', null, `Dùng Bùa Bảo Hộ (có ${charms})`), useCharm),
            h('button', { class: 'btn primary big', disabled: have < need || S.me.xu < cost, onclick: () => this.net.send('upgrade', { npc: this.upgradeNpc, src: sel.src, slot: sel.slot, charm: useCharm.checked }) }, 'CƯỜNG HÓA')));
      }
    }
    this.frameWin('Thợ Rèn', h('div', null, this.smithTabs('upg'), h('div', { class: 'upg-wrap' }, h('div', null, h('div', { class: 'sub-title' }, 'Trang bị'), grid, detail), panel)),
      h('div', { class: 'muted tiny sm-note' }, `Mỗi cấp cường hóa +${Math.round(U.bonus * 100)}% chỉ số gốc. Đá cường hóa rơi từ quái hoặc mua ở Lò Rèn.`));
  },

  // Ô ngọc trong hành trang (chọn bằng bấm, kéo thả vào lỗ khảm trên máy tính)
  gemBagIcon(it, i, onpick) {
    const el = itemIcon(it, { sel: this.gemPick === i, onclick: () => onpick(i) });
    if (!this.touch) {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        this.dragGem = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      });
      el.addEventListener('dragend', () => { this.dragGem = null; });
    }
    return el;
  },

  // ----- Khảm ngọc: chọn trang bị → bấm (hoặc kéo) ngọc vào lỗ tròn; bấm lỗ có ngọc để gỡ
  renderGemPut() {
    const G = S.G.gems;
    const list = [];
    for (const s of gearSlots()) if (S.equip[s] && gemHoles(S.G.items[S.equip[s].id])) list.push({ it: S.equip[s], src: 'eq', slot: s });
    S.inv.forEach((it, i) => {
      if (it && gemHoles(S.G.items[it.id])) list.push({ it, src: 'inv', slot: i });
    });
    let sel = this.gemSel ? list.find((x) => x.src === this.gemSel.src && String(x.slot) === String(this.gemSel.slot)) : null;
    if (!sel && list.length) {
      sel = list[0];
      this.gemSel = { src: sel.src, slot: sel.slot };
    }
    const bag = [];
    S.inv.forEach((it, i) => { if (it && gemDef(it.id)) bag.push([it, i]); });
    if (this.gemPick != null && !(S.inv[this.gemPick] && gemDef(S.inv[this.gemPick].id))) this.gemPick = null;
    const pickDef = this.gemPick != null ? gemDef(S.inv[this.gemPick].id) : null;
    const pick = (i) => {
      this.gemPick = this.gemPick === i ? null : i;
      this.holeSel = null;
      sfx('click');
      this.refresh();
    };

    const grid = h('div', { class: 'inv-grid' }, ...list.map((x) => {
      const el = itemIcon(x.it, { sel: sel && sel.it === x.it, onclick: () => { this.gemSel = { src: x.src, slot: x.slot }; this.holeSel = null; this.gemPop = null; this.refresh(); } });
      if (x.src === 'eq') el.appendChild(h('span', { class: 'worn', title: 'Đang mặc' }, 'E'));
      return el;
    }));
    const bagGrid = bag.length
      ? h('div', { class: 'inv-grid gem-bag' }, ...bag.map(([it, i]) => this.gemBagIcon(it, i, pick)))
      : h('div', { class: 'empty-note small' }, h('img', { class: 'ico', src: iconURL({ k: 'gem', c: '#5ab4ff', s: 'thuy1' }), alt: '' }),
        h('div', null, 'Chưa có ngọc. Mua ngọc cấp 1 ở Lò Rèn, hoặc săn quái và boss.'));

    let panel = h('div', { class: 'empty-note' }, ico('settings'), h('div', null, 'Chưa có trang bị nào có lỗ khảm.'));
    if (sel) {
      const it = sel.it;
      const def = S.G.items[it.id];
      const holes = gemHoles(def);
      const gs = Array.from({ length: holes }, (_, k) => gemDef((it.gems || [])[k]));
      const send = (t, extra) => this.net.send(t, { npc: this.upgradeNpc, src: sel.src, slot: sel.slot, ...extra });
      // cùng điều kiện với server (gemPut): lỗ trống, chưa có viên cùng loại
      const why = (g) => (gs.some((x) => x && x.gem === g.gem) ? `Món này đã có ${G.types[g.gem].name}` : '');
      const putAt = (k, i) => {
        const g = gemDef(S.inv[i] && S.inv[i].id);
        if (!g) return;
        if (why(g)) return this.toast(`${why(g)}. Mỗi món chỉ khảm 1 viên mỗi loại.`, 'warn');
        send('gemPut', { hole: k, gem: i });
      };
      const blocked = pickDef ? why(pickDef) : '';
      const holeEls = gs.map((g, k) => {
        if (g) {
          return h('button', {
            class: `gem-hole full${this.holeSel === k ? ' sel' : ''}${this.gemPop === k ? ' pop' : ''}`, style: { '--gc': gemColor(g) },
            title: `${g.name}: ${gemText(g)}`, 'aria-label': g.name,
            onclick: () => { this.holeSel = this.holeSel === k ? null : k; this.gemPick = null; this.gemPop = null; sfx('click'); this.refresh(); },
          }, h('img', { src: iconURL(g.icon), alt: '', draggable: 'false' }), h('span', { class: 'glv' }, g.glv));
        }
        const ready = pickDef && !blocked;
        return h('button', {
          class: `gem-hole empty${ready ? ' ready' : ''}`, title: 'Lỗ trống', 'aria-label': 'Lỗ trống',
          onclick: () => (this.gemPick != null ? putAt(k, this.gemPick) : this.toast('Chọn một viên ngọc trong hành trang bên dưới.', 'info')),
          ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('over'); },
          ondragleave: (e) => e.currentTarget.classList.remove('over'),
          ondrop: (e) => {
            e.preventDefault();
            const i = this.dragGem != null ? this.dragGem : +e.dataTransfer.getData('text/plain');
            if (Number.isInteger(i)) putAt(k, i);
          },
        }, h('i', { class: 'gh-plus' }));
      });
      // số và nhãn mỗi phần không ngắt dòng: khung hẹp chỉ xuống dòng giữa "+2.400" và "sinh lực"
      const caps = gs.map((g, k) => h('div', { class: 'gh-cap' }, g
        ? h('span', { style: { color: gemColor(g) } }, ...gemParts(g).flatMap((t, j) => [j ? ' ' : null, h('span', { class: 'nw' }, t)]))
        : h('span', { class: 'muted' }, `Lỗ ${k + 1}`)));
      // tổng chỉ số từ ngọc
      const sum = {};
      for (const g of gs) if (g) sum[g.gem] = gemText(g);
      const hs = this.holeSel != null ? gs[this.holeSel] : null;
      let act;
      if (hs) {
        const cost = G.takeCost[hs.glv];
        act = h('div', { class: 'gem-act' }, h('div', null, 'Gỡ ', h('b', { style: { color: gemColor(hs) } }, hs.name), ' về hành trang'),
          h('div', { class: `req ${S.me.xu >= cost ? '' : 'bad'}` }, ico('xu'), `Phí gỡ: ${fmt(cost)} xu`),
          h('button', { class: 'btn danger big', disabled: S.me.xu < cost, onclick: () => send('gemTake', { hole: this.holeSel }) }, 'GỠ NGỌC'));
      } else if (pickDef) {
        const free = gs.findIndex((g) => !g);
        act = h('div', { class: 'gem-act' }, h('div', null, 'Đã chọn ', h('b', { style: { color: gemColor(pickDef) } }, pickDef.name), ` (${gemText(pickDef)})`),
          blocked ? h('div', { class: 'bad tiny' }, `${blocked}. Mỗi món chỉ khảm 1 viên mỗi loại.`)
            : free < 0 ? h('div', { class: 'bad tiny' }, 'Không còn lỗ trống. Gỡ bớt ngọc trước.')
              : h('div', { class: 'muted tiny' }, this.touch ? 'Chạm vào lỗ trống để khảm.' : 'Bấm hoặc kéo ngọc vào lỗ trống để khảm.'),
          h('button', { class: 'btn primary big', disabled: !!blocked || free < 0, onclick: () => putAt(free, this.gemPick) }, 'KHẢM NGỌC'));
      } else {
        act = h('div', { class: 'gem-act muted' }, gs.some(Boolean) ? 'Chọn ngọc bên dưới để khảm, hoặc bấm vào viên đã khảm để gỡ.' : 'Chọn ngọc bên dưới rồi bấm vào lỗ trống để khảm.');
      }
      panel = h('div', { class: 'gem-panel' },
        h('div', { class: `gem-board h${holes}` },
          h('div', { class: 'gb-item' }, h('div', { class: `slot big r${it.r || 0}` }, h('img', { src: iconURL(def.icon, it.r), alt: '' }), it.p ? h('span', { class: 'plus' }, `+${it.p}`) : null),
            h('div', { class: 'gb-name', style: { color: rarityColor(it) } }, itemName(it)),
            h('div', { class: 'tiny muted' }, `${sel.src === 'eq' ? 'Đang mặc · ' : ''}${holes} lỗ khảm`)),
          h('div', { class: 'gb-holes' }, ...holeEls.map((el, k) => h('div', { class: 'gh-wrap' }, el, caps[k])))),
        Object.keys(sum).length ? h('div', { class: 'gem-sum' }, 'Ngọc cộng: ', ...Object.values(sum).map((t, k) => h('b', null, `${k ? ', ' : ''}${t}`))) : null,
        act);
    }
    this.frameWin('Thợ Rèn', h('div', null, this.smithTabs('gem'),
      h('div', { class: 'upg-wrap gem-wrap' },
        h('div', null, h('div', { class: 'sub-title' }, 'Trang bị có lỗ khảm'), grid,
          h('div', { class: 'sub-title gb-sub' }, 'Ngọc trong hành trang'), bagGrid),
        panel)),
    h('div', { class: 'muted tiny sm-note' }, `Lỗ khảm theo bậc: Gỗ-Sắt ${G.holes[0]}, Bạc-Huyền ${G.holes[3]}, Long trở lên ${G.holes[G.holes.length - 1]}. Mỗi món chỉ khảm 1 viên mỗi loại. Ngọc đi theo món khi giao dịch, cất kho.`));
  },

  // ----- Ghép ngọc: 3 viên cùng loại cùng cấp → 1 viên cấp trên
  renderGemMerge() {
    const G = S.G.gems;
    const count = new Map();
    for (const it of S.inv) if (it && gemDef(it.id)) count.set(it.id, (count.get(it.id) || 0) + it.q);
    const kinds = Object.keys(G.types);
    const ids = [...count.keys()].sort((a, b) => {
      const da = S.G.items[a];
      const db = S.G.items[b];
      return kinds.indexOf(da.gem) - kinds.indexOf(db.gem) || da.glv - db.glv;
    });
    // vừa ghép xong: viên cũ hết thì chuyển sang viên mới nhận
    if (this.mergeSel && !count.has(this.mergeSel) && this.mergeNext && count.has(this.mergeNext)) this.mergeSel = this.mergeNext;
    if (!count.has(this.mergeSel)) this.mergeSel = ids.find((id) => count.get(id) >= 3 && S.G.items[id].glv < G.max) || ids[0] || null;
    const grid = ids.length
      ? h('div', { class: 'inv-grid' }, ...ids.map((id) => {
        const el = itemIcon({ id, q: count.get(id) }, { sel: this.mergeSel === id, onclick: () => { this.mergeSel = id; this.gemFlash = null; sfx('click'); this.refresh(); } });
        if (count.get(id) >= 3 && S.G.items[id].glv < G.max) el.classList.add('can-merge');
        return el;
      }))
      : h('div', { class: 'empty-note small' }, h('img', { class: 'ico', src: iconURL({ k: 'gem', c: '#5ab4ff', s: 'thuy1' }), alt: '' }), h('div', null, 'Chưa có ngọc trong hành trang.'));
    let panel = h('div', { class: 'empty-note' }, ico('settings'), h('div', null, 'Chọn loại ngọc cần ghép.'));
    const g = this.mergeSel ? gemDef(this.mergeSel) : null;
    if (g) {
      const have = count.get(this.mergeSel) || 0;
      if (g.glv >= G.max) panel = h('div', null, this.itemDetail({ id: this.mergeSel, q: have }), h('div', { class: 'good' }, 'Ngọc đã đạt cấp cao nhất!'));
      else {
        const next = S.G.items[`gem_${g.gem}_${g.glv + 1}`];
        const cost = G.mergeCost[g.glv];
        const rate = G.rate[g.glv - 1];
        const c = gemColor(g);
        panel = h('div', { class: 'gem-panel' },
          h('div', { class: `merge-box ${this.gemFlash || ''}`, style: { '--gc': c } },
            h('div', { class: 'merge-row' },
              h('div', { class: 'merge-in' }, ...[0, 1, 2].map((k) => h('div', { class: `gem-hole full small${k < have ? '' : ' miss'}` }, h('img', { src: iconURL(g.icon), alt: '' })))),
              h('i', { class: 'merge-arrow' }, '→'),
              h('div', { class: 'gem-hole full out', style: { '--gc': gemColor(next) } }, h('img', { src: iconURL(next.icon), alt: '' }), h('span', { class: 'glv' }, next.glv))),
            h('div', { class: 'merge-names' }, h('span', { style: { color: c } }, `${G.types[g.gem].name}: Cấp ${g.glv} ×3`), h('span', null, ' → '), h('b', { style: { color: gemColor(next) } }, `Cấp ${next.glv}`)),
            h('div', { class: 'merge-stat' }, `${gemText(g)} → `, h('b', null, gemText(next))),
            h('div', { class: 'rate' }, h('span', null, 'Tỉ lệ thành công'), h('div', { class: 'pbar rate-bar' }, h('i', { style: { width: `${rate}%` } }), h('span', null, `${rate}%`))),
            h('div', { class: 'merge-reqs' },
              h('div', { class: `req ${have >= 3 ? 'good' : 'bad'}` }, h('img', { src: iconURL(g.icon), alt: '' }), have >= 3 ? `Có ${have} viên (cần 3)` : `Có ${have}/3 viên`),
              h('div', { class: `req ${S.me.xu >= cost ? '' : 'bad'}` }, ico('xu'), `Phí: ${fmt(cost)} xu`)),
            rate < 100 ? h('div', { class: 'warn tiny' }, 'Thất bại mất 1 viên, 2 viên còn lại trả về hành trang.') : h('div', { class: 'muted tiny' }, 'Ghép cấp này luôn thành công.'),
            h('button', { class: 'btn primary big', disabled: have < 3 || S.me.xu < cost, onclick: () => this.net.send('gemMerge', { npc: this.upgradeNpc, id: this.mergeSel }) }, 'GHÉP NGỌC')));
      }
    }
    this.frameWin('Thợ Rèn', h('div', null, this.smithTabs('merge'),
      h('div', { class: 'upg-wrap gem-wrap' }, h('div', null, h('div', { class: 'sub-title' }, 'Ngọc trong hành trang'), grid), panel)),
    h('div', { class: 'muted tiny sm-note' }, `Ghép 3 viên cùng loại, cùng cấp thành 1 viên cấp trên (tối đa cấp ${G.max}). Cấp càng cao tỉ lệ càng thấp.`));
  },
};
