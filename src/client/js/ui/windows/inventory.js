// Cửa sổ Túi đồ (inv): ô trang bị quanh nhân vật, lưới túi, khung chi tiết vật phẩm
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt, itemStats, itemName, rarityColor, gemDef, gemHoles, gemText, gemColor } from '../../core/store.js';
import { drawNinja, mountOffset } from '../../render/sprites.js';
import { iconURL } from '../../render/icons.js';
import { $, h } from '../dom.js';
import { STYLE_SLOTS, gearSlots, expLeft, elColorOfSkill, passiveText, skImg, moneyLine, itemIcon, emptySlot } from '../common.js';

// Vị trí ô trang bị quanh hình nhân vật: [cột, hàng]. Tab Trang bị: 9 ô chiến đấu; tab Thời trang: 4 ô thời trang + thú cưng
const DOLL_POS = { hat: [1, 1], armor: [1, 2], gloves: [1, 3], pants: [1, 4], weapon: [3, 1], necklace: [3, 2], ring: [3, 3], amulet: [3, 4], shoes: [2, 4] };
const STYLE_POS = { mask: [1, 1], cloak: [1, 2], costume: [1, 3], mount: [3, 1], pet: [3, 2] };

export default {
  // ----- Túi đồ
  // Tab ô trang bị: 'gear' (chiến đấu) / 'style' (thời trang + thú cưng)
  eqTabs() {
    const tab = this.eqTab === 'style' ? 'style' : 'gear';
    const btn = (k, label) => h('button', { class: `tab${tab === k ? ' on' : ''}`, 'data-eqtab': k, onclick: () => { this.eqTab = k; this.refresh(); } }, label);
    return h('div', { class: 'tabs eq-tabs' }, btn('gear', 'Trang bị'), btn('style', 'Thời trang'));
  },

  // Ô trang bị xếp quanh hình nhân vật (fig: tùy chọn vẽ nhân vật)
  equipGrid(equip, clickable, fig) {
    const style = this.eqTab === 'style';
    const grid = h('div', { class: `doll${style ? ' style' : ''}` });
    const pos = style ? STYLE_POS : DOLL_POS;
    for (const s of style ? STYLE_SLOTS : gearSlots()) {
      const it = equip[s];
      const ps = pos[s];
      const cell = h('div', { class: 'eq-cell', style: ps ? { gridColumn: ps[0], gridRow: ps[1] } : null },
        h('label', null, S.G.slotNames[s]));
      if (it) cell.insertBefore(itemIcon(it, { onclick: clickable ? () => this.showItem(it, { from: 'eq', slot: s }) : () => this.showItem(it, { from: 'view' }) }), cell.firstChild);
      else cell.insertBefore(emptySlot(s), cell.firstChild);
      grid.appendChild(cell);
    }
    if (style) {
      // tốc chạy cộng thêm từ thú cưỡi (ngoài trần 60% của trang bị)
      const m = equip.mount && S.G.items[equip.mount.id];
      const spd = m && m.stats ? m.stats.spd || 0 : 0;
      grid.appendChild(h('div', { class: 'doll-note' }, spd ? h('span', null, 'Cưỡi thú: ', h('b', null, `+${spd}% tốc chạy`)) : h('span', { class: 'muted' }, 'Thời trang và thú cưỡi bán ở Tiệm Thuốc (lượng)')));
    }
    const cv = h('canvas', { width: 96, height: 120 });
    grid.appendChild(h('div', { class: 'doll-fig' }, cv));
    if (fig && fig.silhouette) {
      // không có dữ liệu ngoại hình: vẽ bóng nhân vật theo phái (tab thời trang: kèm bóng thú cưỡi đang mặc)
      const ctx = cv.getContext('2d');
      const look = style && equip.mount && S.G.items[equip.mount.id] ? { w: 0, mount: S.G.items[equip.mount.id].look } : fig.look;
      const sc = mountOffset(look) ? 2 : 3;
      drawNinja(ctx, cv.width / 2 + (sc === 2 ? 4 : 0), cv.height - 9, { ...fig, look, dir: 1, anim: 'idle', t: 0, scale: sc, noShadow: true });
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(26,14,8,0.82)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (fig) {
      this.dollCv = cv;
      this.dollFig = { ...fig, style };
      this.drawDoll(performance.now() / 1000);
    }
    return grid;
  },

  drawDoll(t) {
    const cv = this.dollCv;
    const o = this.dollFig;
    if (!cv || !o) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    // nhân vật của mình: luôn lấy ngoại hình mới nhất (vừa mặc/tháo đồ)
    let look = o.live && S.me ? S.me.look : o.look;
    // tab Trang bị: không vẽ thú cưỡi (khung nhỏ); tab Thời trang: cưỡi thú thì thu nhỏ còn 2 lần
    if (!o.style && look && look.mount) look = { ...look, mount: null };
    const sc = mountOffset(look) ? 2 : 3;
    drawNinja(ctx, cv.width / 2 + (sc === 2 ? 4 : 0), cv.height - 9, { ...o, look, dir: 1, anim: 'idle', t, scale: sc });
  },

  invGrid(onclick, mark) {
    const grid = h('div', { class: 'inv-grid' });
    S.inv.forEach((it, i) => {
      if (!it) return grid.appendChild(h('div', { class: 'slot empty' }));
      grid.appendChild(itemIcon(it, { sel: mark && mark.has(i), onclick: () => onclick(it, i) }));
    });
    return grid;
  },

  renderInv() {
    const me = S.me;
    const free = S.inv.filter((x) => !x).length;
    const cls = S.G.classes[me.cls];
    const fig = { cls: me.cls, gender: me.gender, look: me.look, name: me.name, el: cls.element, weaponType: cls.weapon, live: true };
    this.frameWin('Hành Trang', h('div', { class: 'inv-wrap' },
      h('div', { class: 'inv-left' }, this.eqTabs(), this.equipGrid(S.equip, true, fig)),
      h('div', { class: 'inv-right' },
        h('div', { class: 'row between inv-top' }, h('span', { class: 'sub-title' }, `Hành trang ${S.inv.length - free}/${S.inv.length}`), h('button', { class: 'btn small', onclick: () => this.net.send('sortInv') }, 'Sắp xếp')),
        this.invGrid((it, i) => this.showItem(it, { from: 'inv', slot: i })))),
    moneyLine());
  },

  // opt.gems === 'short': ngọc khảm gói trong một dòng (tab Cường hóa chật chỗ, chi tiết xem ở tab Khảm ngọc)
  itemDetail(it, extra, opt = {}) {
    const def = S.G.items[it.id];
    const box = h('div', { class: 'item-detail' });
    box.appendChild(h('div', { class: 'id-head' }, h('div', { class: `slot big r${it.r || 0}` }, h('img', { src: iconURL(def.icon, it.r) })),
      h('div', null, h('div', { class: 'id-name', style: { color: gemDef(it.id) ? gemColor(def) : rarityColor(it) } }, itemName(it)),
        h('div', { class: 'muted' }, def.type === 'equip' ? `${def.fashion ? 'Thời trang · ' : ''}${S.G.slotNames[def.slot]} · ${S.G.rarity[it.r || 0].name}` : def.desc || ''))));
    const req = [];
    if (def.lv > 1) req.push(h('span', { class: def.lv > S.me.level ? 'bad' : '' }, def.type === 'book' ? `Yêu cầu nhân vật cấp ${def.lv}` : `Yêu cầu cấp ${def.lv}`));
    if (def.cls) req.push(h('span', { class: def.cls !== S.me.cls ? 'bad' : '' }, `Phái ${S.G.classes[def.cls].name}`));
    if (req.length) box.appendChild(h('div', { class: 'id-req' }, ...req));
    if (def.type === 'equip') {
      const st = itemStats({ id: it.id, p: it.p, plv: it.plv });
      const stats = h('div', { class: 'id-stats' });
      for (const k in st) stats.appendChild(h('div', { class: 'stat' }, `${S.G.statLabels[k]}: `, h('b', null, `+${st[k]}`)));
      for (const [k, v] of it.o || []) stats.appendChild(h('div', { class: 'stat opt', style: { color: rarityColor(it) } }, `✦ ${S.G.statLabels[k]} +${v}`));
      box.appendChild(stats);
      const holes = gemHoles(def);
      if (holes) box.appendChild(opt.gems === 'short' ? this.gemShort(it, holes) : this.gemLines(it, holes));
      if (def.slot === 'pet' && S.G.pet) box.appendChild(this.petLines(it, def));
      if (def.desc) box.appendChild(h('div', { class: 'muted' }, def.desc));
      if (it.exp) box.appendChild(h('div', { class: `id-exp${it.exp - (Date.now() + (S.skew || 0)) < 86400000 ? ' soon' : ''}` }, `Hạn sử dụng: ${expLeft(it, true)}`));
      // món đã sở hữu (có it.p) mà không có hạn; ô xem trước ở cửa hàng không có p nên không ghi
      else if (def.fashion && it.p != null) box.appendChild(h('div', { class: 'id-exp forever' }, 'Hạn sử dụng: vĩnh viễn'));
    }
    if (def.type === 'book' && S.G.skills[def.skill]) {
      const sk = S.G.skills[def.skill];
      const lv = S.me.skills[def.skill] || 0;
      const st = def.cls !== S.me.cls ? ['bad', `Chỉ phái ${S.G.classes[def.cls].name} đọc được`]
        : lv ? ['good', `Đã học (Lv${lv}) · nâng cấp bằng điểm kỹ năng`] : ['warn', 'Chưa học · đọc để học cấp 1'];
      box.appendChild(h('div', { class: 'id-stats id-book' },
        h('div', { class: 'row' }, h('div', { class: 'sk-icon pas', style: { '--el': elColorOfSkill(sk) } }, skImg(def.skill)),
          h('div', null, h('div', null, 'Học kỹ năng nội tại ', h('b', null, sk.name)),
            h('div', { class: 'tiny sk-meta' }, `Lv1: ${passiveText(sk, 1)}`),
            h('div', { class: 'tiny sk-meta' }, `Lv${S.G.skillMax} (tối đa): ${passiveText(sk, S.G.skillMax)}`))),
        h('div', { class: `tiny ${st[0]}` }, st[1])));
    }
    if (def.type === 'gem' && S.G.gems) {
      const G = S.G.gems;
      const next = def.glv < G.max ? S.G.items[`gem_${def.gem}_${def.glv + 1}`] : null;
      box.appendChild(h('div', { class: 'id-stats id-gem' },
        h('div', { class: 'stat' }, 'Khảm vào trang bị: ', h('b', null, gemText(def))),
        next ? h('div', { class: 'tiny muted' }, `Ghép 3 viên → ${next.name} (${gemText(next)}) · tỉ lệ ${G.rate[def.glv - 1]}%, phí ${fmt(G.mergeCost[def.glv])} xu`)
          : h('div', { class: 'tiny good' }, 'Cấp cao nhất'),
        h('div', { class: 'tiny muted' }, `Gỡ khỏi trang bị: ${fmt(G.takeCost[def.glv])} xu`)));
    }
    if (it.q > 1) box.appendChild(h('div', { class: 'muted' }, `Số lượng: ${it.q}`));
    if (extra) box.appendChild(extra);
    return box;
  },

  // Danh sách lỗ khảm của một món (chi tiết vật phẩm, giao dịch, xem người khác)
  gemLines(it, holes) {
    const gs = Array.isArray(it.gems) ? it.gems : [];
    const n = gs.filter((id) => gemDef(id)).length;
    return h('div', { class: 'id-gems' },
      h('div', { class: 'idg-title' }, h('span', null, 'Ngọc khảm'), h('span', { class: 'muted' }, `${n}/${holes} lỗ`)),
      ...Array.from({ length: holes }, (_, k) => {
        const g = gemDef(gs[k]);
        if (!g) return h('div', { class: 'idg-row empty' }, h('i', { class: 'idg-hole' }), h('span', { class: 'muted' }, 'Lỗ trống'));
        return h('div', { class: 'idg-row', style: { '--gc': gemColor(g) } }, h('i', { class: 'idg-hole full' }, h('img', { src: iconURL(g.icon), alt: '' })),
          h('span', { class: 'idg-name' }, g.name), h('b', null, gemText(g)));
      }));
  },

  // Một dòng tóm tắt: "Ngọc khảm 2/3: +0.6% chí mạng, +0.3% hút máu"
  gemShort(it, holes) {
    const gs = (Array.isArray(it.gems) ? it.gems : []).map(gemDef).filter(Boolean);
    return h('div', { class: 'id-gems short' }, h('span', { class: 'idg-title' }, `Ngọc khảm ${gs.length}/${holes}`),
      gs.length ? h('b', null, `: ${gs.map(gemText).join(', ')}`) : h('span', { class: 'muted' }, ' · khảm ở tab Khảm ngọc'));
  },

  showItem(it, ctx) {
    this.hideItem();
    const def = S.G.items[it.id];
    const btns = h('div', { class: 'row wrap pop-btns' });
    const add = (label, fn, cls) => btns.appendChild(h('button', { class: `btn ${cls || ''}`, onclick: () => { fn(); this.hideItem(); } }, label));
    if (ctx.from === 'inv') {
      if (def.type === 'equip') add('Trang bị', () => this.net.send('equip', { slot: ctx.slot }), 'primary');
      else if (def.type === 'book') {
        // cùng điều kiện với server (readBook): không đọc được thì nút tắt kèm lý do
        const why = def.cls !== S.me.cls ? 'Khác phái' : (S.me.skills[def.skill] || 0) > 0 ? 'Đã học' : S.me.level < def.lv ? `Cần cấp ${def.lv}` : '';
        if (why) btns.appendChild(h('button', { class: 'btn', disabled: true }, why));
        else add('Đọc sách', () => this.net.send('useItem', { slot: ctx.slot }), 'primary');
      }
      else if (['potion', 'scroll', 'chest', 'food'].includes(def.type)) add('Sử dụng', () => this.net.send('useItem', { slot: ctx.slot }), 'primary');
      else if (def.type === 'petfood') add('Cho thú ăn', () => this.feedPet(ctx.slot), 'primary');
      const socketed = Array.isArray(it.gems) && it.gems.some(Boolean);
      add('Hủy', () => {
        if (confirm(`Hủy ${itemName(it)}${socketed ? ' (cả ngọc đang khảm)' : ''}? Không thể khôi phục.`)) this.net.send('discard', { slot: ctx.slot });
      }, 'danger');
    }
    if (ctx.from === 'eq' && ctx.slot === 'pet') add('Chăm sóc', () => this.open('pet'), 'primary');
    if (ctx.from === 'eq') add('Tháo ra', () => this.net.send('unequip', { slot: ctx.slot }), ctx.slot === 'pet' ? '' : 'primary');
    if (ctx.from === 'sell') {
      const price = this.sellPrice(it);
      const qty = h('input', { type: 'number', min: 1, max: it.q, value: it.q, class: 'in qty-in' });
      if (it.q > 1) btns.appendChild(qty);
      if (Array.isArray(it.gems) && it.gems.some(Boolean)) btns.appendChild(h('div', { class: 'tiny warn sell-gem' }, 'Ngọc đang khảm sẽ bán kèm (đã cộng vào giá).'));
      const gemN = (it.gems || []).filter((id) => gemDef(id)).length;
      btns.appendChild(h('button', { class: 'btn primary', onclick: () => {
        // ngọc khảm có thể đáng giá hơn cả món đồ: hỏi lại, gợi ý gỡ ra trước
        if (gemN && !confirm(`Bán ${itemName(it)} kèm ${gemN} viên ngọc đang khảm? Ngọc sẽ mất, chỉ nhận thêm 25% giá ngọc. Có thể gỡ ngọc ở Thợ Rèn trước khi bán.`)) return;
        this.net.send('sell', { npc: this.shop.npc, slot: ctx.slot, qty: +qty.value || 1 });
        this.hideItem();
      } }, `Bán (${fmt(price)} xu/cái)`));
    }
    add('Đóng', () => {});
    const pop = h('div', { class: `item-pop r${it.r || 0}` }, this.itemDetail(it), btns);
    pop.addEventListener('click', (e) => e.stopPropagation());
    $('#windows').appendChild(pop);
    this.itemPop = pop;
    this.itemPopRef = { it, ctx };
  },

  hideItem() {
    if (this.itemPop) this.itemPop.remove();
    this.itemPop = null;
    this.itemPopRef = null;
  },

  // Món đang xem đã rời ô của nó (hết hạn, bị dùng/tháo) thì đóng chi tiết để không còn nút cho món không tồn tại
  syncItemPop() {
    const r = this.itemPopRef;
    if (!this.itemPop || !r) return;
    const { it, ctx } = r;
    let cur;
    if (ctx.from === 'eq') cur = S.equip ? S.equip[ctx.slot] : null;
    else if (ctx.from === 'inv' || ctx.from === 'sell') cur = S.inv ? S.inv[ctx.slot] : null;
    else return;
    if (!cur || cur.id !== it.id || (cur.exp || 0) !== (it.exp || 0)) this.hideItem();
  },

  sellPrice(it) {
    const def = S.G.items[it.id];
    let base = def.price || (def.priceLuong ? 50 : 1);
    if (def.type === 'equip') base = base * (1 + (it.r || 0) * 0.5) * (1 + (it.p || 0) * 0.3);
    // khớp sellPrice của server: ngọc đang khảm bán kèm
    let gems = 0;
    for (const id of it.gems || []) if (gemDef(id)) gems += Math.floor(gemDef(id).price * 0.25);
    return Math.max(1, Math.floor(base * 0.25)) + gems;
  },
};
