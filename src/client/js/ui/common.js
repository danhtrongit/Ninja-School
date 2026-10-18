// Hằng số và hàm dựng phần tử dùng chung giữa HUD và các cửa sổ (ô vật phẩm, ô kỹ năng, thanh, tiền)
import { S, fmt, skillVal, itemName, gemDef, gemHoles, gemColor } from '../core/store.js';
import { ELEMENT_COLORS } from '../render/sprites.js';
import { iconURL, skillIconURL } from '../render/icons.js';
import { h, ico } from './dom.js';

const SLOT_ICON = {
  weapon: 'sword', hat: 'hat', armor: 'armor', gloves: 'gloves', pants: 'pants', shoes: 'shoes', necklace: 'necklace', ring: 'ring', amulet: 'amulet',
  pet: 'pet', mask: 'mask', cloak: 'cloak', costume: 'costume', mount: 'mount',
};

export const STYLE_SLOTS = ['mask', 'cloak', 'costume', 'mount', 'pet'];
// Ô chiến đấu (server cũ chưa gửi gearSlots thì suy ra)
export const gearSlots = () => S.G.gearSlots || S.G.slots.filter((x) => !STYLE_SLOTS.includes(x));

// Thời gian còn lại của vật phẩm có hạn (theo giờ server): '7n' / '5g' / '<1g' (làm tròn lên); đầy đủ: 'còn 6 ngày 4 giờ'
export function expLeft(it, long) {
  const ms = it.exp - (Date.now() + (S.skew || 0));
  if (ms <= 0) return long ? 'đã hết hạn' : 'hết';
  const d = Math.floor(ms / 86400000);
  const hr = Math.floor((ms % 86400000) / 3600000);
  const mi = Math.max(1, Math.floor((ms % 3600000) / 60000));
  if (long) return d ? `còn ${d} ngày ${hr} giờ` : hr ? `còn ${hr} giờ ${mi} phút` : `còn ${mi} phút`;
  // huy hiệu ngắn làm tròn lên: món vừa nhận 7 ngày hiện '7n' chứ không phải '6n'
  return d ? `${Math.ceil(ms / 86400000)}n` : hr ? `${Math.ceil(ms / 3600000)}g` : '<1g';
}
export const vnDay = (off = 0) => new Date(Date.now() + 7 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);

export function elColorOfSkill(sk) {
  const c = S.G.classes[sk.cls];
  return ELEMENT_COLORS[c ? c.element : 'fire'] || '#8d6e63';
}

// Bộ kỹ năng: an toàn khi server chưa gửi hotbars/hbi (coi như 1 bộ)
export function hbInfo() {
  const me = S.me;
  const sets = Array.isArray(me.hotbars) && me.hotbars.length ? me.hotbars : [me.hotbar || []];
  const n = Math.max(1, Math.min(sets.length, S.G.hotbarSets || sets.length));
  const cur = Math.max(0, Math.min(n - 1, me.hbi | 0));
  return { n, cur, bar: me.hotbar || sets[cur] || [] };
}

// Mô tả hiệu ứng nội tại ở cấp lv, ví dụ "+4.8% sinh lực" (kháng hệ khắc ghi rõ hệ bị kháng)
export function passiveText(sk, lv) {
  const st = sk.pas.stat;
  const [label, suf] = (S.G.passiveStats && S.G.passiveStats[st]) || [st, ''];
  const v = Math.round(skillVal(sk.pas.v, lv) * 10) / 10;
  if (st === 'resist') {
    const mine = S.G.classes[sk.cls].element;
    const foe = Object.keys(S.G.elements).find((k) => S.G.elements[k].beats === mine);
    return `-${v}% sát thương từ hệ ${foe ? S.G.elements[foe].name : 'khắc'}`;
  }
  return `+${v}${suf} ${label}`;
}

export function skImg(sid, cls = 'sk-img') {
  const sk = S.G.skills[sid];
  return h('img', { class: cls, src: skillIconURL(sk, sid, elColorOfSkill(sk)), alt: '', draggable: 'false' });
}

export function moneyLine() {
  return h('div', { class: 'money' },
    h('span', { class: 'xu' }, ico('xu'), h('b', null, fmt(S.me.xu)), ' xu'),
    h('span', { class: 'luong' }, ico('luong'), h('b', null, fmt(S.me.luong)), ' lượng'));
}

export function miniBar(v, max, cls = '') {
  const p = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return h('div', { class: `pbar ${cls}` }, h('i', { style: { width: `${p}%` } }), h('span', null, `${fmt(v)}/${fmt(max)}`));
}

export function itemIcon(it, opts = {}) {
  const def = S.G.items[it.id];
  const el = h('div', { class: `slot r${it.r || 0}${opts.sel ? ' sel' : ''}`, title: itemName(it) },
    h('img', { src: iconURL(def.icon, it.r), alt: '', draggable: 'false' }));
  if (it.q > 1) el.appendChild(h('span', { class: 'qty' }, it.q > 999 ? '999+' : it.q));
  if (it.exp) el.appendChild(h('span', { class: 'exp' }, expLeft(it)));
  if (it.p) el.appendChild(h('span', { class: 'plus' }, `+${it.p}`));
  // ngọc: số cấp ở góc trên trái; trang bị đã khảm: dãy lỗ tròn góc dưới phải (lỗ có ngọc tô màu ngọc)
  if (def.type === 'gem') el.appendChild(h('span', { class: 'glv' }, def.glv));
  if (Array.isArray(it.gems) && it.gems.some(Boolean)) {
    el.appendChild(h('span', { class: 'gdots' }, ...Array.from({ length: gemHoles(def) }, (_, k) => {
      const g = gemDef(it.gems[k]);
      return h('i', g ? { style: { '--gc': gemColor(g) } } : { class: 'e' });
    })));
  }
  if (def.lv > S.me.level || (def.cls && def.cls !== S.me.cls)) el.classList.add('locked');
  if (opts.onclick) el.addEventListener('click', opts.onclick);
  return el;
}

export function emptySlot(slotKey) {
  const el = h('div', { class: 'slot empty' });
  if (slotKey && SLOT_ICON[slotKey]) el.appendChild(h('img', { class: 'ghost', src: iconURL({ k: SLOT_ICON[slotKey], c: '#7a6450' }), alt: '' }));
  return el;
}
