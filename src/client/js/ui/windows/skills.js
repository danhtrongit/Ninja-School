// Cửa sổ Kỹ năng (skill): học/nâng kỹ năng, gán ô phím tắt, kéo thả
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt, skillVal } from '../../core/store.js';
import { ELEMENT_COLORS } from '../../render/sprites.js';
import { iconURL } from '../../render/icons.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { elColorOfSkill, hbInfo, passiveText, skImg } from '../common.js';

const isSupport = (sk) => !!sk && (sk.type === 'buff' || sk.type === 'heal');
const isPassive = (sk) => !!sk && sk.type === 'passive';

export default {
  // ----- Kỹ năng
  renderSkills() {
    const me = S.me;
    const { n, cur, bar } = hbInfo();
    const NB = S.G.hotbar || 6;
    const elc = ELEMENT_COLORS[S.G.classes[me.cls].element];
    const all = Object.keys(S.G.skills).filter((id) => S.G.skills[id].cls === me.cls);
    const list = all.filter((id) => !isPassive(S.G.skills[id]));
    const pasList = all.filter((id) => isPassive(S.G.skills[id]));
    const basicId = list.find((id) => S.G.skills[id].basic);
    const tab = this.skTab === 'passive' && pasList.length ? 'passive' : 'active';
    if (this.skSel && !(me.skills[this.skSel] > 0)) this.skSel = null;
    if (this.skSlotSel != null && !(this.skSlotSel >= 0 && this.skSlotSel < NB)) this.skSlotSel = null;
    const sel = this.skSel;
    const slotSel = this.skSlotSel;
    const picking = !!sel || slotSel != null;

    // --- Khối trang bị kỹ năng
    const slots = [];
    for (let i = 0; i < NB; i++) {
      const sid = bar[i] || null;
      const sk = sid ? S.G.skills[sid] : null;
      const can = (sel && bar[i] !== sel) || (slotSel != null && slotSel !== i);
      const cls = ['hb-slot', sid ? 'full' : 'empty', can ? 'can' : '', slotSel === i ? 'sel' : '', sel && bar[i] === sel ? 'has' : ''].filter(Boolean).join(' ');
      const el = h('div', { class: cls, 'data-i': i, role: 'button', tabindex: 0, style: { '--el': elc },
        title: sid ? `Ô ${i + 1}: ${sk.name}` : `Ô ${i + 1}: trống`, 'aria-label': sid ? `Ô ${i + 1}: ${sk.name}` : `Ô ${i + 1}: trống`,
        onclick: () => this.onSlotClick(i) },
      sid ? skImg(sid) : null,
      h('span', { class: 'hb-no' }, String(i + 1)),
      isSupport(sk) ? h('span', { class: 'hb-aux', title: 'Auto đánh tự dùng kỹ năng này' }, ico('auto')) : null,
      sid ? h('button', { class: 'hb-x', title: 'Gỡ khỏi ô', 'aria-label': `Gỡ kỹ năng khỏi ô ${i + 1}`, onclick: (e) => {
        e.stopPropagation();
        this.skSel = null;
        this.skSlotSel = null;
        this.setSlot(i, null);
      } }, ico('close')) : null);
      if (sid) this.dragSrc(el, { sid, i });
      slots.push(el);
    }
    const basic = h('div', { class: 'hb-basic', style: { '--el': elc }, title: 'Đánh thường (J) - luôn có sẵn, không cần gán' },
      basicId ? skImg(basicId) : ico('attack', 'sk-img'), h('span', { class: 'hb-no' }, 'J'));
    let status;
    if (sel) {
      status = h('div', { class: 'hb-status on' }, h('span', null, 'Chọn ô để gán ', h('b', null, S.G.skills[sel].name)),
        h('button', { class: 'btn small', onclick: () => { this.skSel = null; this.refresh(); } }, 'Bỏ chọn'));
    } else if (slotSel != null) {
      const sid = bar[slotSel];
      status = h('div', { class: 'hb-status on' },
        h('span', null, sid ? `Ô ${slotSel + 1}: chọn kỹ năng bên dưới hoặc ô khác để đổi chỗ` : `Ô ${slotSel + 1}: chọn kỹ năng bên dưới để gán`),
        sid ? h('button', { class: 'btn small danger', onclick: () => { this.skSlotSel = null; this.setSlot(slotSel, null); } }, 'Gỡ') : null,
        h('button', { class: 'btn small', onclick: () => { this.skSlotSel = null; this.refresh(); } }, 'Bỏ chọn'));
    } else {
      status = h('div', { class: 'hb-status' }, this.touch ? 'Chạm kỹ năng đã học rồi chạm ô để gán · chạm 2 ô để đổi chỗ' : 'Bấm kỹ năng rồi bấm ô để gán · kéo thả vào ô, kéo giữa 2 ô để đổi chỗ, kéo ra ngoài để gỡ');
    }
    const hbBox = h('div', { class: `sec hb-box${picking ? ' picking' : ''}` },
      h('div', { class: 'hb-head' }, h('span', { class: 'sec-title' }, 'Trang bị kỹ năng'),
        n > 1 ? h('div', { class: 'hb-tabs' }, ...Array.from({ length: n }, (_, k) => h('button', { class: `tab${k === cur ? ' on' : ''}`, title: `Dùng bộ kỹ năng ${k + 1}`,
          onclick: () => { this.skSel = null; this.skSlotSel = null; this.switchSet(k); } }, `Bộ ${k + 1}`))) : null),
      h('div', { class: 'hb-row' }, basic, h('i', { class: 'hb-sep' }), ...slots),
      status,
      h('div', { class: 'hb-hint' }, ico('auto'), h('span', null, 'Auto đánh dùng kỹ năng từ ô 6 về ô 1; kỹ năng hỗ trợ được tự dùng khi cần.')));

    // --- Danh sách kỹ năng
    const rows = list.map((sid) => {
      const sk = S.G.skills[sid];
      const lv = me.skills[sid] || 0;
      const shown = Math.max(1, lv);
      const next = sk.req + lv * 3;
      const info = [];
      if (sk.mul) info.push(`Sát thương ${Math.round(skillVal(sk.mul, shown) * 100 * (sk.hits || 1))}%${sk.hits > 1 ? ` (${sk.hits} đòn)` : ''}`);
      if (sk.buff) info.push(`+${Math.round(skillVal(sk.buff.v, shown) * 10) / 10}${sk.buff.stat === 'spd' || sk.buff.stat.endsWith('Pct') || sk.buff.stat === 'crit' || sk.buff.stat === 'dodge' ? '%' : ''} ${{ atkPct: 'tấn công', defPct: 'phòng thủ', crit: 'chí mạng', dodge: 'né tránh', spd: 'tốc chạy' }[sk.buff.stat]} / ${sk.buff.dur / 1000}s`);
      if (sk.heal) info.push(`Hồi ${Math.round(skillVal(sk.heal, shown) * 10) / 10}% sinh lực`);
      info.push(`MP ${Math.round(skillVal(sk.mp, shown))}`, `Hồi chiêu ${sk.cd / 1000}s`);
      if (sk.range) info.push(`Tầm ${sk.range}`);
      if (sk.radius) info.push(`Bán kính ${sk.radius}`);
      const usable = !sk.basic && lv > 0;
      const at = usable ? bar.indexOf(sid) : -1;
      const icon = h('div', { class: `sk-icon${usable ? ' drag' : ''}`, style: { '--el': elColorOfSkill(sk) } }, skImg(sid), usable ? h('span', { class: 'sk-lv' }, lv) : null);
      const row = h('div', { class: `skill-row${lv || sk.basic ? '' : ' locked'}${sk.basic ? ' basic' : ''}${usable ? ' usable' : ''}${sel === sid ? ' pick' : ''}`,
        onclick: usable ? () => this.pickSkill(sid) : null },
      icon,
      h('div', { class: 'sk-info' },
        h('div', { class: 'sk-name' }, h('b', null, sk.name), sk.basic ? h('span', { class: 'tag' }, 'Cơ bản') : h('span', { class: 'muted' }, ` Lv${lv}/${S.G.skillMax}`),
          at >= 0 ? h('span', { class: 'sk-in', title: `Đang ở ô ${at + 1} của bộ ${cur + 1}` }, `Ô ${at + 1}`) : null,
          isSupport(sk) ? h('span', { class: 'tag sk-auto', title: 'Auto đánh tự dùng kỹ năng này khi cần' }, ico('auto'), sk.type === 'heal' ? 'Hồi máu' : 'Tăng cường') : null,
          !lv && !sk.basic ? h('span', { class: 'warn' }, ` · Mở ở cấp ${sk.req}`) : ''),
        h('div', { class: 'muted tiny' }, sk.desc || 'Đòn đánh cơ bản.'),
        h('div', { class: 'tiny sk-meta' }, info.join(' · '))));
      if (!sk.basic) {
        const act = h('div', { class: 'sk-act' });
        if (lv < S.G.skillMax) {
          act.appendChild(h('button', { class: 'btn small primary', disabled: me.skillPoints < 1 || me.level < next, title: `Cần cấp ${next}`,
            onclick: (e) => { e.stopPropagation(); this.net.send('learnSkill', { sid }); } }, lv ? `Nâng (cấp ${next})` : `Học (cấp ${next})`));
        }
        if (usable) {
          act.appendChild(h('button', { class: `btn small${sel === sid ? ' on' : ''}`, onclick: (e) => { e.stopPropagation(); this.pickSkill(sid); } },
            slotSel != null ? `Gán vào ô ${slotSel + 1}` : sel === sid ? 'Đang chọn' : 'Gán vào ô'));
          this.dragSrc(icon, { sid, i: null });
          this.dragSrc(row, { sid, i: null }, true);
        }
        row.appendChild(act);
      }
      return row;
    });
    const learnedPas = pasList.filter((sid) => me.skills[sid] > 0).length;
    const tabs = h('div', { class: 'tabs sk-tabs' },
      h('button', { class: `tab${tab === 'active' ? ' on' : ''}`, 'data-sktab': 'active', onclick: () => { this.skTab = 'active'; this.refresh(); } }, 'Chủ động'),
      pasList.length ? h('button', { class: `tab${tab === 'passive' ? ' on' : ''}`, 'data-sktab': 'passive', onclick: () => { this.skTab = 'passive'; this.skSel = null; this.skSlotSel = null; this.refresh(); } },
        `Nội tại ${learnedPas}/${pasList.length}`) : null,
      h('span', { class: `pts sk-pts${me.skillPoints ? ' good' : ''}` }, `Điểm kỹ năng: ${me.skillPoints}`));
    const body = tab === 'passive'
      ? [this.passiveSummary(pasList), h('div', { class: 'sk-list' }, ...pasList.map((sid) => this.passiveRow(sid)))]
      : [hbBox, h('div', { class: `sk-list${picking ? ' picking' : ''}` }, ...rows)];
    this.frameWin('Kỹ Năng', h('div', { class: 'sk-wrap' }, tabs, ...body));
  },

  // Tổng hiệu ứng các kỹ năng nội tại đã học
  passiveSummary(pasList) {
    const me = S.me;
    const learned = pasList.filter((sid) => me.skills[sid] > 0);
    return h('div', { class: 'sec pas-sum' },
      h('div', { class: 'sec-title' }, 'Hiệu ứng nội tại đang có'),
      learned.length
        ? h('div', { class: 'pas-chips' }, ...learned.map((sid) => h('span', { class: 'pas-chip' }, skImg(sid, 'sk-img'), passiveText(S.G.skills[sid], me.skills[sid]))))
        : h('div', { class: 'muted' }, 'Chưa học kỹ năng nội tại nào.'),
      h('div', { class: 'hb-hint' }, h('span', null, 'Nội tại luôn có hiệu lực, không cần gán vào ô. Đọc sách để học, nâng cấp bằng điểm kỹ năng.')));
  },

  passiveRow(sid) {
    const me = S.me;
    const sk = S.G.skills[sid];
    const lv = me.skills[sid] || 0;
    const max = S.G.skillMax;
    const next = sk.req + lv * 3;
    const book = S.G.items[sk.book];
    const bookSlot = S.inv.findIndex((it) => it && it.id === sk.book);
    let meta;
    if (!lv) meta = h('div', { class: 'tiny sk-meta' }, `Lv1: ${passiveText(sk, 1)}`);
    else {
      meta = h('div', { class: 'tiny sk-meta' }, h('span', { class: 'pas-now' }, `Hiện tại: ${passiveText(sk, lv)}`),
        lv < max ? h('span', null, ` · Lv${lv + 1}: ${passiveText(sk, lv + 1)}`) : h('span', { class: 'good' }, ' · Đã tối đa'));
    }
    const need = !lv && book ? h('div', { class: 'pas-need' },
      h('img', { src: iconURL(book.icon), alt: '' }),
      h('span', null, bookSlot >= 0 ? `Có ${book.name} trong hành trang` : `Cần ${book.name}`),
      bookSlot < 0 ? h('span', { class: 'muted' }, ` · Tiệm Thuốc ${fmt(book.priceLuong)} lượng hoặc săn boss`) : null) : null;
    const act = h('div', { class: 'sk-act' });
    if (lv && lv < max) {
      act.appendChild(h('button', { class: 'btn small primary', disabled: me.skillPoints < 1 || me.level < next, title: `Cần cấp ${next}`,
        onclick: () => this.net.send('learnSkill', { sid }) }, `Nâng (cấp ${next})`));
    } else if (!lv && bookSlot >= 0) {
      act.appendChild(h('button', { class: 'btn small primary', disabled: me.level < sk.req, title: `Cần cấp ${sk.req}`,
        onclick: () => this.net.send('useItem', { slot: bookSlot }) }, 'Đọc sách'));
    }
    return h('div', { class: `skill-row passive${lv ? '' : ' locked'}` },
      h('div', { class: 'sk-icon pas', style: { '--el': elColorOfSkill(sk) } }, skImg(sid), lv ? h('span', { class: 'sk-lv' }, lv) : null),
      h('div', { class: 'sk-info' },
        h('div', { class: 'sk-name' }, h('b', null, sk.name), h('span', { class: 'tag sk-pas' }, 'Nội tại'), h('span', { class: 'muted' }, ` Lv${lv}/${max}`),
          !lv ? h('span', { class: me.level < sk.req ? 'warn' : 'muted' }, ` · Mở ở cấp ${sk.req}`) : ''),
        h('div', { class: 'muted tiny' }, sk.desc),
        meta, need),
      act);
  },

  setSlot(i, sid) {
    sfx('click');
    this.net.send('hotbar', { i, sid: sid || null });
  },

  // Bấm một kỹ năng trong danh sách: gán ngay nếu đã chọn ô, không thì đánh dấu để chọn ô
  pickSkill(sid) {
    if (performance.now() - (this.dragEnd || 0) < 300) return;
    if (this.skSlotSel != null) {
      this.setSlot(this.skSlotSel, sid);
      this.skSlotSel = null;
      this.skSel = null;
    } else this.skSel = this.skSel === sid ? null : sid;
    this.refresh();
  },

  onSlotClick(i) {
    if (performance.now() - (this.dragEnd || 0) < 300) return;
    const bar = hbInfo().bar;
    if (this.skSel) {
      this.setSlot(i, this.skSel);
      this.skSel = null;
    } else if (this.skSlotSel != null) {
      const j = this.skSlotSel;
      this.skSlotSel = null;
      // server tự hoán đổi khi kỹ năng đã nằm ở ô khác
      if (j !== i && bar[j]) this.setSlot(i, bar[j]);
      else if (j !== i && bar[i]) this.setSlot(j, bar[i]);
    } else {
      this.skSlotSel = i;
    }
    this.refresh();
  },

  // Kéo thả bằng pointer events (chuột và cảm ứng); mouseOnly: chỉ cho chuột (dòng danh sách cần cuộn được trên cảm ứng)
  dragSrc(el, src, mouseOnly) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || (mouseOnly && e.pointerType !== 'mouse') || e.target.closest('button')) return;
      if (mouseOnly && e.target.closest('.sk-icon')) return;
      const st = { x: e.clientX, y: e.clientY, id: e.pointerId, on: false, ghost: null, over: null };
      const setOver = (o) => {
        if (st.over === o) return;
        if (st.over) st.over.classList.remove('over');
        st.over = o;
        if (o) o.classList.add('over');
      };
      const move = (ev) => {
        if (ev.pointerId !== st.id) return;
        if (!st.on) {
          if (Math.hypot(ev.clientX - st.x, ev.clientY - st.y) < 8) return;
          st.on = true;
          st.ghost = h('div', { class: 'hb-ghost', style: { '--el': ELEMENT_COLORS[S.G.classes[S.me.cls].element] } }, skImg(src.sid));
          document.body.appendChild(st.ghost);
          document.body.classList.add('sk-dragging');
          if (src.i != null) el.classList.add('drag-from');
        }
        ev.preventDefault();
        st.ghost.style.transform = `translate(${Math.round(ev.clientX)}px, ${Math.round(ev.clientY)}px)`;
        const t = document.elementFromPoint(ev.clientX, ev.clientY);
        setOver(t && t.closest('.hb-slot'));
      };
      const end = (ev) => {
        if (ev.pointerId !== st.id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (!st.on) return;
        st.ghost.remove();
        setOver(null);
        el.classList.remove('drag-from');
        document.body.classList.remove('sk-dragging');
        this.dragEnd = performance.now();
        if (ev.type === 'pointercancel' || this.winName !== 'skill') return;
        const t = document.elementFromPoint(ev.clientX, ev.clientY);
        const slot = t && t.closest('.hb-slot');
        this.skSel = null;
        this.skSlotSel = null;
        if (slot) {
          const i = +slot.dataset.i;
          if (src.i !== i) this.setSlot(i, src.sid);
        } else if (src.i != null && !(t && t.closest('.hb-box'))) this.setSlot(src.i, null);
        this.refresh();
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  },
};
