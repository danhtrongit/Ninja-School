// Giao diện người dùng (DOM): HUD, cửa sổ, hội thoại, chat
import { S, fmt, skillVal, itemStats, itemName, rarityColor, saveSettings, gemDef, gemHoles, gemText, gemParts, gemColor, myPet, activeSeason, countInv } from './store.js';
import { drawPortrait, drawNinja, ELEMENT_COLORS, mountOffset } from './sprites.js';
import { iconURL, skillIconURL, uiIconURL } from './icons.js';
import { drawPet, petFlies } from './petart.js';
import { sfx } from './sound.js';
import { buildWorldMap } from './worldmap.js';
import { questDest, dailyDest, mapsWithMob } from './pathfind.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const sk in v) {
          if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]);
          else el.style[sk] = v[sk];
        }
      }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

const RANK_NAMES = { leader: 'Tộc trưởng', elder: 'Trưởng lão', member: 'Thành viên' };
const CH_NAMES = { world: 'Thế giới', map: 'Bản đồ', party: 'Nhóm', clan: 'Gia tộc', pm: 'Mật', sys: 'Hệ thống' };
const SLOT_ICON = {
  weapon: 'sword', hat: 'hat', armor: 'armor', gloves: 'gloves', pants: 'pants', shoes: 'shoes', necklace: 'necklace', ring: 'ring', amulet: 'amulet',
  pet: 'pet', mask: 'mask', cloak: 'cloak', costume: 'costume', mount: 'mount',
};
// Vị trí ô trang bị quanh hình nhân vật: [cột, hàng]. Tab Trang bị: 9 ô chiến đấu; tab Thời trang: 4 ô thời trang + thú cưng
const DOLL_POS = { hat: [1, 1], armor: [1, 2], gloves: [1, 3], pants: [1, 4], weapon: [3, 1], necklace: [3, 2], ring: [3, 3], amulet: [3, 4], shoes: [2, 4] };
const STYLE_POS = { mask: [1, 1], cloak: [1, 2], costume: [1, 3], mount: [3, 1], pet: [3, 2] };
const STYLE_SLOTS = ['mask', 'cloak', 'costume', 'mount', 'pet'];
// Ô chiến đấu (server cũ chưa gửi gearSlots thì suy ra)
const gearSlots = () => S.G.gearSlots || S.G.slots.filter((x) => !STYLE_SLOTS.includes(x));

// Thời gian còn lại của vật phẩm có hạn (theo giờ server): '7n' / '5g' / '<1g' (làm tròn lên); đầy đủ: 'còn 6 ngày 4 giờ'
function expLeft(it, long) {
  const ms = it.exp - (Date.now() + (S.skew || 0));
  if (ms <= 0) return long ? 'đã hết hạn' : 'hết';
  const d = Math.floor(ms / 86400000);
  const hr = Math.floor((ms % 86400000) / 3600000);
  const mi = Math.max(1, Math.floor((ms % 3600000) / 60000));
  if (long) return d ? `còn ${d} ngày ${hr} giờ` : hr ? `còn ${hr} giờ ${mi} phút` : `còn ${mi} phút`;
  // huy hiệu ngắn làm tròn lên: món vừa nhận 7 ngày hiện '7n' chứ không phải '6n'
  return d ? `${Math.ceil(ms / 86400000)}n` : hr ? `${Math.ceil(ms / 3600000)}g` : '<1g';
}
const vnDay = (off = 0) => new Date(Date.now() + 7 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);

// Icon giao diện (ảnh pixel)
const ico = (name, cls) => h('img', { class: `ico${cls ? ` ${cls}` : ''}`, src: uiIconURL(name), alt: '', draggable: 'false' });

function elColorOfSkill(sk) {
  const c = S.G.classes[sk.cls];
  return ELEMENT_COLORS[c ? c.element : 'fire'] || '#8d6e63';
}

// Bộ kỹ năng: an toàn khi server chưa gửi hotbars/hbi (coi như 1 bộ)
function hbInfo() {
  const me = S.me;
  const sets = Array.isArray(me.hotbars) && me.hotbars.length ? me.hotbars : [me.hotbar || []];
  const n = Math.max(1, Math.min(sets.length, S.G.hotbarSets || sets.length));
  const cur = Math.max(0, Math.min(n - 1, me.hbi | 0));
  return { n, cur, bar: me.hotbar || sets[cur] || [] };
}

const isSupport = (sk) => !!sk && (sk.type === 'buff' || sk.type === 'heal');
const isPassive = (sk) => !!sk && sk.type === 'passive';

// Mô tả hiệu ứng nội tại ở cấp lv, ví dụ "+4.8% sinh lực" (kháng hệ khắc ghi rõ hệ bị kháng)
function passiveText(sk, lv) {
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

function skImg(sid, cls = 'sk-img') {
  const sk = S.G.skills[sid];
  return h('img', { class: cls, src: skillIconURL(sk, sid, elColorOfSkill(sk)), alt: '', draggable: 'false' });
}

function moneyLine() {
  return h('div', { class: 'money' },
    h('span', { class: 'xu' }, ico('xu'), h('b', null, fmt(S.me.xu)), ' xu'),
    h('span', { class: 'luong' }, ico('luong'), h('b', null, fmt(S.me.luong)), ' lượng'));
}

function miniBar(v, max, cls = '') {
  const p = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return h('div', { class: `pbar ${cls}` }, h('i', { style: { width: `${p}%` } }), h('span', null, `${fmt(v)}/${fmt(max)}`));
}

function itemIcon(it, opts = {}) {
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

function emptySlot(slotKey) {
  const el = h('div', { class: 'slot empty' });
  if (slotKey && SLOT_ICON[slotKey]) el.appendChild(h('img', { class: 'ghost', src: iconURL({ k: SLOT_ICON[slotKey], c: '#7a6450' }), alt: '' }));
  return el;
}

export class UI {
  constructor(net) {
    this.net = net;
    this.game = null;
    this.win = null;
    this.winName = null;
    this.chat = [];
    this.chatTab = 'all';
    this.chatCh = 'map';
    this.pmTo = '';
    this.shop = null;
    this.trade = null;
    this.tradeSel = new Set();
    this.lastFrame = 0;
    this.lastCd = 0;
    this.touch = matchMedia('(pointer: coarse)').matches;
    if (this.touch) document.body.classList.add('touch');
    this.bindNet();
  }

  // ---------------- Mạng
  bindNet() {
    const n = this.net;
    n.on('me', (m) => {
      const lvUp = S.me && m.level > S.me.level;
      S.me = m;
      // độ lệch đồng hồ server (tính thời hạn thời trang)
      if (m.now) S.skew = m.now - Date.now();
      this.updateStatus();
      if (lvUp || ['char', 'skill', 'quest', 'gift', 'wheel', 'shop'].includes(this.winName)) this.refresh();
      // thành tích lôi đài đổi (sau trận) khi đang mở tab Lôi đài
      const ak = m.arena ? `${m.arena.elo}|${m.arena.win}|${m.arena.lose}|${m.arena.draw}|${m.arena.wn}` : '';
      if (ak !== this.arenaKey && this.arenaKey && this.winName === 'rank' && this.rankTab === 'arena') this.net.send('rank');
      this.arenaKey = ak;
      // có thư mới khi đang mở hộp thư: tải lại danh sách
      const mn = m.mail ? m.mail.n : 0;
      if (this.winName === 'mail' && mn > (this.mailUnread || 0)) this.net.send('mailList');
      this.mailUnread = mn;
    });
    n.on('mail', (m) => {
      this.mailData = m;
      if (this.winName === 'mail') this.refresh();
    });
    n.on('codeResult', (m) => {
      this.codeRes = { ok: !!m.ok, msg: String(m.msg || '') };
      // kết quả đã hiện ngay dưới ô nhập mã thì không cần thông báo nổi
      if (this.winName !== 'mail' && this.winName !== 'settings') this.toast(this.codeRes.msg, m.ok ? 'reward' : 'warn');
      if (m.ok) {
        this.codeDraft = '';
        sfx('quest');
        if (m.mail && this.winName === 'mail') this.net.send('mailList');
      }
      if (this.winName === 'mail' || this.winName === 'settings') this.refresh();
    });
    n.on('season', (m) => {
      S.seasonId = typeof m.id === 'string' ? m.id : null;
      if (S.me) this.updateQuestTracker();
      if (this.winName === 'event') this.refresh();
    });
    n.on('seasonResult', (m) => {
      if (m.season && S.me) S.me.season = m.season;
      if (!m.ok) this.toast(m.msg, 'warn');
      else this.evFlash = Date.now();
      if (this.winName === 'event') this.refresh();
    });
    n.on('inv', (m) => {
      S.inv = m.inv;
      S.equip = m.equip;
      this.updatePotions();
      this.syncItemPop();
      // tab Nội tại hiện nút "Đọc sách" theo sách trong hành trang
      if (this.winName === 'pet') this.petSync();
      else if (['inv', 'char', 'upgrade', 'shop', 'trade', 'event'].includes(this.winName) || (this.winName === 'skill' && this.skTab === 'passive')) this.refresh();
      // số bánh sự kiện trên biểu ngữ
      if (S.me) this.updateQuestTracker();
    });
    // cấp/EXP/thân mật của thú đang mang (gói nhỏ, đến sau mỗi lần diệt quái hoặc cho ăn)
    n.on('pet', (m) => {
      const it = S.equip && S.equip.pet;
      if (it && it.id === m.id) Object.assign(it, { plv: m.plv, pexp: m.pexp, love: m.love });
      if (this.winName === 'pet') this.petSync();
    });
    n.on('notice', (m) => {
      this.toast(m.msg, m.kind);
      if (m.kind === 'reward' || m.kind === 'quest') sfx('quest');
      if (m.kind === 'boss') sfx('boss');
    });
    n.on('storage', (m) => {
      this.storage = m;
      this.closeDialog();
      if (this.winName !== 'storage') this.open('storage');
      else this.refresh();
    });
    n.on('friends', (m) => {
      this.friends = m.list;
      if (this.winName === 'friends') this.refresh();
    });
    n.on('spinResult', (m) => this.onSpin(m));
    n.on('dungeon', (m) => {
      this.dungeonState = m;
      const s = Math.ceil(m.left / 1000);
      const el = $('#map-info');
      if (el) el.textContent = m.state === 'done' ? 'Thử thách kết thúc' : `Đợt ${m.wave}/${m.waves} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    });
    n.on('chat', (m) => this.addChat(m));
    n.on('dialog', (m) => this.showDialog(m));
    n.on('shop', (m) => {
      this.shop = m;
      this.shopTab = this.shopTab || 'buy';
      this.closeDialog();
      this.open('shop');
    });
    n.on('openUi', (m) => {
      if (m.ui === 'upgrade') {
        this.upgradeNpc = m.npc;
        this.upgradeSel = null;
        this.smTab = ['gem', 'merge'].includes(m.tab) ? m.tab : 'upg';
        this.gemPick = null;
        this.holeSel = null;
        this.gemPop = null;
        this.gemFlash = null;
        this.open('upgrade');
      }
      if (m.ui === 'clan') {
        this.net.send('clanInfo');
        this.open('clan');
      }
      if (m.ui === 'event') {
        this.eventNpc = m.npc;
        this.open('event');
      }
      if (m.ui === 'rank') {
        this.rankTab = m.tab === 'arena' ? 'arena' : this.rankTab;
        this.open('rank');
      }
      this.closeDialog();
    });
    n.on('upgradeResult', (m) => {
      this.toast(m.ok ? `Cường hóa thành công! ${m.name} +${m.plus}` : `Cường hóa thất bại! ${m.name} còn +${m.plus}`, m.ok ? 'reward' : 'warn');
      this.upgradeFlash = m.ok ? 'ok' : 'fail';
      this.refresh();
    });
    n.on('gemResult', (m) => {
      const msg = m.act === 'put' ? `Khảm ${m.name} vào ${m.item} thành công!`
        : m.act === 'take' ? `Đã gỡ ${m.name} khỏi ${m.item} (-${fmt(m.cost)} xu).`
          : m.ok ? `Ghép ngọc thành công! Nhận ${m.name}.` : `Ghép ngọc thất bại! Mất 1 viên ${m.name}.`;
      // chỉ giữ thông báo khảm/gỡ/ghép mới nhất: khảm liên tiếp không xếp chồng che nút thao tác trong cửa sổ
      if (this.gemToast) this.gemToast.remove();
      this.gemToast = this.toast(msg, m.ok ? 'reward' : 'warn');
      if (m.act === 'put') {
        this.gemPick = null;
        this.gemPop = m.hole;
      }
      if (m.act === 'take') this.holeSel = null;
      if (m.act === 'merge') {
        this.gemFlash = m.ok ? 'ok' : 'fail';
        this.mergeNext = m.ok ? m.id : null;
      }
      if (this.winName === 'upgrade') this.refresh();
      // hiệu ứng nảy/nháy chỉ chạy một lần (gói inv đến sau sẽ vẽ lại cửa sổ)
      clearTimeout(this.gemFxT);
      this.gemFxT = setTimeout(() => { this.gemPop = null; this.gemFlash = null; }, 120);
    });
    n.on('party', (m) => {
      S.party = { id: m.id || 0, members: m.members || [] };
      this.renderPartyHud();
      if (this.winName === 'party') this.refresh();
      const sig = S.party.members.map((x) => `${x.name}@${x.mapId || ''}`).join();
      if (this.winName === 'map' && sig !== this.partySig) this.refresh();
      this.partySig = sig;
    });
    n.on('trade', (m) => {
      this.trade = m;
      if (this.winName !== 'trade') {
        this.tradeSel = new Set(m.mine.slots);
        this.tradeXu = m.mine.xu;
        this.open('trade');
      } else this.refresh();
    });
    n.on('tradeEnd', () => {
      this.trade = null;
      if (this.winName === 'trade') this.close();
    });
    n.on('clan', (m) => {
      S.clanInfo = m && m.members ? m : null;
      if (this.winName === 'clan') this.refresh();
    });
    n.on('invite', (m) => this.showInvite(m));
    n.on('rank', (m) => {
      this.rankData = m;
      if (this.winName === 'rank') this.refresh();
    });
    n.on('inspect', (m) => {
      this.inspectData = m;
      this.open('inspect');
    });
    n.on('dead', (m) => this.showDeath(m));
    n.on('revived', () => this.hideDeath());
    n.on('pong', (m) => {
      S.ping = Math.round(performance.now() - m.ts);
    });
  }

  // ---------------- HUD
  initHud(game) {
    this.game = game;
    const hud = $('#hud');
    hud.classList.remove('hidden');
    hud.querySelectorAll('img[data-ui]').forEach((img) => { img.src = uiIconURL(img.dataset.ui); img.draggable = false; });
    // Thanh kỹ năng (cụm nút tròn kiểu di động)
    const sk = $('#hud-skills');
    sk.innerHTML = '';
    this.skillBtns = [];
    const sbtn = (cls, act, title, img, key) => h('button', { class: `sbtn ${cls}`, 'data-act': act, title },
      img, h('i', { class: 'cd' }), h('em', { class: 'cdt' }), key ? h('small', null, key) : null);
    const basic = sbtn('basic', 'attack', 'Đánh thường (J)', ico('attack', 'sk-img'), 'J');
    sk.appendChild(basic);
    for (let i = 0; i < (S.G.hotbar || 5); i++) {
      const b = sbtn('skill', `s${i + 1}`, '', h('img', { class: 'sk-img', alt: '', draggable: 'false' }), String(i + 1));
      this.skillBtns.push(b);
      sk.appendChild(b);
    }
    this.basicBtn = basic;
    // Nhấn giữ nút kỹ năng mở bảng gán kỹ năng, chọn sẵn ô đó (lần chạm đầu vẫn ra chiêu như thường)
    this.skillBtns.forEach((b, i) => this.bindLongPress(b, () => {
      this.open('skill');
      this.skSlotSel = i;
      this.refresh();
    }));
    this.hbSets = h('div', { class: 'hb-sets' });
    sk.appendChild(this.hbSets);
    this.potBtns = {
      hp: h('button', { class: 'sbtn pot hp', 'data-act': 'hp', title: 'Bình sinh lực (Q)' }, h('img', { alt: '', draggable: 'false' }), h('span', { class: 'qty' }), h('small', null, 'Q')),
      mp: h('button', { class: 'sbtn pot mp', 'data-act': 'mp', title: 'Bình chakra (E)' }, h('img', { alt: '', draggable: 'false' }), h('span', { class: 'qty' }), h('small', null, 'E')),
    };
    sk.appendChild(this.potBtns.hp);
    sk.appendChild(this.potBtns.mp);
    sk.appendChild(h('button', { class: 'sbtn act', 'data-act': 'talk', title: 'Nói chuyện / vào cửa / nhặt đồ (X)' }, ico('talk', 'sk-img'), h('small', null, 'X')));
    game.input.bindTouch(sk);
    game.input.bindTouch($('#hud-dpad'));

    // Menu
    const menu = $('#hud-menu');
    menu.innerHTML = '';
    const items = [
      ['inv', 'bag', 'Túi đồ', 'B'], ['char', 'char', 'Nhân vật', 'C'], ['pet', 'pet', 'Thú cưng', 'K'], ['skill', 'skill', 'Kỹ năng', 'V'], ['quest', 'quest', 'Nhiệm vụ', 'N'],
      ['party', 'party', 'Nhóm', 'P'], ['friends', 'friends', 'Bạn bè', 'O'], ['clan', 'clan', 'Gia tộc', 'G'], ['rank', 'rank', 'Xếp hạng', 'R'], ['map', 'map', 'Bản đồ', 'M'],
      ['mail', 'mail', 'Hộp thư', 'L'], ['gift', 'gift', 'Điểm danh hằng ngày', ''], ['wheel', 'wheel', 'Vòng quay may mắn', ''], ['settings', 'settings', 'Cài đặt', ''],
    ];
    this.menuBtns = {};
    for (const [k, icon, title, key] of items) {
      const tip = key ? `${title} (${key})` : title;
      const b = h('button', { class: `mbtn m-${k}`, 'data-tip': tip, 'aria-label': tip, onclick: () => { sfx('click'); this.toggle(k); } }, ico(icon), key ? h('small', null, key) : null);
      if (k === 'gift') this.giftBtn = b;
      this.menuBtns[k] = b;
      menu.appendChild(b);
    }
    this.autoBtn = h('button', { class: 'mbtn wide auto', 'data-tip': 'Tự động đánh (F)', 'aria-label': 'Tự động đánh (F)', onclick: () => game.toggleAuto() }, ico('auto'), h('span', null, 'AUTO'));
    this.pkBtn = h('button', { class: 'mbtn pk', 'data-tip': 'Chế độ PK', 'aria-label': 'Chế độ PK', onclick: () => this.net.send('pk', { on: !S.me.pkMode }) }, ico('pk'), h('span', null, 'PK'));
    // Điện thoại: nút AUTO đặt cạnh cụm kỹ năng cho dễ bấm
    (this.touch ? sk : menu).appendChild(this.autoBtn);
    menu.appendChild(this.pkBtn);

    // Chat
    const tabs = $('#chat-tabs');
    tabs.innerHTML = '';
    for (const [k, label] of [['all', 'Tất cả'], ['world', 'T.giới'], ['map', 'B.đồ'], ['party', 'Nhóm'], ['clan', 'G.tộc'], ['pm', 'Mật']]) {
      tabs.appendChild(h('button', { class: `ctab c-${k}${k === this.chatTab ? ' on' : ''}`, onclick: (e) => {
        this.chatTab = k;
        tabs.querySelectorAll('.ctab').forEach((b) => b.classList.remove('on'));
        e.currentTarget.classList.add('on');
        if (k !== 'all' && k !== 'pm') this.setChatCh(k);
        this.renderChat();
      } }, label));
    }
    const sel = $('#chat-ch');
    sel.onchange = () => this.setChatCh(sel.value);
    const input = $('#chat-input');
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.sendChat();
        input.blur();
      }
      e.stopPropagation();
    };
    $('#chat-send').onclick = () => this.sendChat();
    $('#chat-toggle').onclick = () => {
      $('#hud-chat').classList.toggle('collapsed');
      $('#hud-chat').classList.remove('unread');
    };
    if (this.touch) $('#hud-chat').classList.add('collapsed');
    this.setChatCh(this.chatCh);
    this.questKey = null;
    this.tgState = '';
    this.avatarKey = null;
    this.updateStatus();
    this.updatePotions();
  }

  setChatCh(ch) {
    this.chatCh = ch;
    $('#chat-ch').value = ch;
    $('#chat-ch').dataset.ch = ch;
    $('#chat-input').placeholder = ch === 'pm' ? `Nhắn cho ${this.pmTo || '...'} (hoặc /w tên tin)` : 'Nhập tin nhắn...';
  }

  focusChat() {
    $('#hud-chat').classList.remove('collapsed', 'unread');
    $('#chat-input').focus();
  }

  sendChat() {
    const input = $('#chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    if (this.chatCh === 'pm' && msg[0] !== '/') this.net.send('chat', { ch: 'pm', to: this.pmTo, msg });
    else this.net.send('chat', { ch: this.chatCh, msg });
    input.value = '';
  }

  addChat(m) {
    this.chat.push(m);
    if (this.chat.length > 150) this.chat.shift();
    if (m.ch === 'pm' && m.from !== S.me.name) this.pmTo = m.from;
    this.renderChat();
    const hc = $('#hud-chat');
    if (hc && hc.classList.contains('collapsed') && m.ch !== 'sys') hc.classList.add('unread');
  }

  renderChat() {
    const log = $('#chat-log');
    if (!log) return;
    const list = this.chat.filter((m) => this.chatTab === 'all' || m.ch === this.chatTab || m.ch === 'sys');
    log.innerHTML = '';
    for (const m of list.slice(-60)) {
      const line = h('div', { class: `cl ch-${m.ch}` });
      line.appendChild(h('span', { class: 'cch' }, CH_NAMES[m.ch] || m.ch));
      if (m.from) {
        const who = m.ch === 'pm' ? (m.from === S.me.name ? `→${m.to}` : m.from) : m.from;
        line.appendChild(h('span', { class: 'cfrom', onclick: () => {
          const name = m.ch === 'pm' && m.from === S.me.name ? m.to : m.from;
          if (name && name !== S.me.name && name !== 'Hệ thống') {
            this.pmTo = name;
            this.setChatCh('pm');
            this.focusChat();
          }
        } }, `${who}:`));
      }
      line.appendChild(h('span', { class: 'cmsg' }, ` ${m.msg}`));
      log.appendChild(line);
    }
    log.scrollTop = log.scrollHeight;
  }

  updateStatus() {
    const me = S.me;
    if (!me || !$('#hud') || $('#hud').classList.contains('hidden')) return;
    const cls = S.G.classes[me.cls];
    const elc = ELEMENT_COLORS[cls.element];
    $('#st-name').textContent = me.name;
    $('#st-lv').textContent = me.level;
    $('#st-cls').textContent = `${cls.name} · ${S.G.elements[cls.element].name}`;
    $('#st-cls').style.color = elc;
    const bar = (sel, v, max, text) => {
      const el = $(sel);
      const w = `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`;
      el.querySelector('i').style.width = w;
      const lag = el.querySelector('b');
      if (lag) lag.style.width = w;
      el.querySelector('span').textContent = text;
      return el;
    };
    bar('#bar-hp', me.hp, me.s.maxHp, `${fmt(me.hp)}/${fmt(me.s.maxHp)}`).classList.toggle('low', me.hp < me.s.maxHp * 0.25);
    bar('#bar-mp', me.mp, me.s.maxMp, `${fmt(me.mp)}/${fmt(me.s.maxMp)}`);
    bar('#bar-exp', me.exp, me.need, me.level >= (S.G.maxLevel || 100) ? 'MAX' : `${((me.exp / me.need) * 100).toFixed(2)}%`);
    $('#st-xu').textContent = fmt(me.xu);
    $('#st-luong').textContent = fmt(me.luong);
    const avKey = `${me.cls}|${me.gender}|${JSON.stringify(me.look || {})}|${me.name}`;
    if (avKey !== this.avatarKey) {
      this.avatarKey = avKey;
      const av = $('#avatar').getContext('2d');
      drawPortrait(av, { cls: me.cls, gender: me.gender, look: me.look, name: me.name, el: cls.element, weaponType: null });
    }
    // Kỹ năng trên thanh
    me.hotbar.forEach((sid, i) => {
      const b = this.skillBtns && this.skillBtns[i];
      if (!b) return;
      if (b.dataset.sid !== (sid || '')) {
        b.dataset.sid = sid || '';
        const img = b.querySelector('.sk-img');
        if (sid) img.src = skillIconURL(S.G.skills[sid], sid, elc);
        else img.removeAttribute('src');
      }
      b.title = sid ? `${S.G.skills[sid].name} Lv${me.skills[sid] || 0} (${i + 1}) · nhấn giữ để đổi` : 'Trống - nhấn giữ hoặc mở Kỹ năng (V) để gán';
      b.style.setProperty('--el', elc);
      b.classList.toggle('empty', !sid);
    });
    if (this.basicBtn) this.basicBtn.style.setProperty('--el', elc);
    this.updateHbSets();
    if (this.pkBtn) this.pkBtn.classList.toggle('on', !!me.pkMode);
    if (this.giftBtn) this.giftBtn.classList.toggle('gift', !me.checkin || me.checkin.day !== vnDay());
    if (this.menuBtns) {
      this.menuBtns.char.classList.toggle('dot', me.potential > 0);
      this.menuBtns.skill.classList.toggle('dot', me.skillPoints > 0);
      // thư chưa đọc hoặc còn quà chưa nhận
      if (this.menuBtns.mail) this.menuBtns.mail.classList.toggle('dot', !!me.mail && (me.mail.n > 0 || me.mail.g > 0));
    }
    // Buff
    const bf = $('#hud-buffs');
    bf.innerHTML = '';
    for (const b of me.buffs) {
      const sk = S.G.skills[b.k];
      let img = null;
      // hiệu ứng xấu do chiêu boss (bs_*): icon riêng, viền đỏ
      const bad = b.k.startsWith('bs_');
      if (sk) img = h('img', { src: skillIconURL(sk, b.k, elColorOfSkill(sk)), alt: '' });
      else if (S.G.items[b.k]) img = h('img', { src: iconURL(S.G.items[b.k].icon), alt: '' });
      else if (bad) img = h('img', { src: uiIconURL('slow'), alt: '' });
      bf.appendChild(h('div', { class: `buff${bad ? ' debuff' : ''}`, 'data-until': b.until - me.now + Date.now(), title: bad ? `${b.name}: giảm tốc chạy` : b.name }, img || h('b', null, b.name.slice(0, 2)), h('small')));
    }
    if (me.pk > 0) bf.appendChild(h('div', { class: 'buff pk', title: `Điểm hiếu chiến: ${me.pk}` }, h('img', { src: uiIconURL('pk'), alt: '' }), h('small', null, me.pk)));
    this.updateQuestTracker();
    if (this.deathShown && !me.dead) this.hideDeath();
  }

  updateQuestTracker() {
    const q = S.me.quest;
    const d = S.me.daily;
    const box = $('#hud-quest');
    // chỉ dựng lại khi nội dung đổi: gói 'me' đến liên tục, dựng lại giữa lúc bấm sẽ nuốt mất cú bấm
    const ss = activeSeason();
    const tok = ss ? countInv(ss.token) : 0;
    const left = ss ? Math.max(1, Math.ceil((ss.end - Date.now() - (S.skew || 0)) / 86400000)) : 0;
    const key = JSON.stringify([q, d && d.task, S.me.level, ss && ss.id, tok, left]);
    if (key === this.questKey && box.childElementCount) return;
    this.questKey = key;
    box.innerHTML = '';
    const rows = [];
    const go = (fn) => (e) => {
      e.stopPropagation();
      sfx('click');
      this.travelVia(fn);
    };
    const goBtn = (fn) => h('button', { class: 'qt-go', title: 'Tự tìm đường', 'aria-label': 'Tự tìm đường', onclick: go(fn) }, ico('path'));
    if (q && !q.done) {
      let state = '';
      let bar = null;
      let done = false;
      const locked = q.st === 0 && S.me.level < q.req;
      if (q.st === 0) state = locked ? `Cần cấp ${q.req}` : 'Gặp Trưởng Làng nhận';
      else if (q.st === 2 || q.prog >= q.n) {
        state = 'Hoàn thành - về gặp Trưởng Làng';
        done = true;
      } else {
        state = q.desc || `Tiến độ ${q.prog}/${q.n}`;
        bar = miniBar(q.prog, q.n);
      }
      rows.push(h('div', { class: `qt main${done ? ' done' : ''}${locked ? ' locked' : ''}`, title: locked ? null : 'Bấm để tự tìm đường', onclick: locked ? null : go('travelQuest') },
        h('div', { class: 'qt-top' }, h('b', null, q.name), locked ? null : goBtn('travelQuest')),
        h('div', { class: `qs${bar ? ' one' : ''}` }, state), bar));
    }
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      const done = d.task.prog >= d.task.n;
      rows.push(h('div', { class: `qt daily${done ? ' done' : ''}`, title: 'Bấm để tự tìm đường', onclick: go('travelDaily') },
        h('div', { class: 'qt-top' }, h('b', null, 'Hằng ngày'), goBtn('travelDaily')),
        h('div', { class: 'qs one' }, done ? 'Xong - gặp Tiểu Nhị' : `Diệt ${mn ? mn.name : d.task.m}`),
        done ? null : miniBar(d.task.prog, d.task.n, 'blue')));
    }
    if (rows.length) box.appendChild(h('div', { class: 'qt-head', title: 'Mở cửa sổ nhiệm vụ (N)', onclick: () => { sfx('click'); this.toggle('quest'); } }, ico('quest'), h('span', null, 'Nhiệm vụ')));
    rows.forEach((r) => box.appendChild(r));
    // biểu ngữ sự kiện theo mùa: bấm để xem bảng đổi quà
    if (ss) {
      const td = S.G.items[ss.token];
      box.appendChild(h('div', { class: 'qt-season', title: `${ss.name}: bấm để xem quà đổi`, onclick: (e) => {
        e.stopPropagation();
        sfx('click');
        this.eventNpc = null;
        this.toggle('event');
      } },
      h('img', { class: 'qts-ico', src: uiIconURL('festival'), alt: '' }),
      h('div', { class: 'qts-main' }, h('b', null, ss.name),
        h('div', { class: 'qts-sub' }, h('img', { src: iconURL(td.icon), alt: '' }), h('span', null, `${fmt(tok)}`), h('i', null, `· còn ${left} ngày`)))));
    }
  }

  // Gọi hàm tìm đường của game (agent khác viết), đóng cửa sổ nhiệm vụ/bản đồ khi đã lên đường
  travelVia(fn, arg) {
    const g = this.game;
    if (!g || typeof g[fn] !== 'function') {
      this.toast('Chưa thể tự tìm đường lúc này', 'warn');
      return false;
    }
    const ok = g[fn](arg) !== false;
    if (ok && (this.winName === 'quest' || this.winName === 'map')) this.close();
    return ok;
  }

  // Khối "Đang tới" dưới khung mục tiêu; info = { label, mapName, left } hoặc null
  setTravel(info) {
    const box = $('#hud-travel');
    if (!box) return;
    document.body.classList.toggle('travel-on', !!info);
    box.innerHTML = '';
    if (!info) {
      box.classList.add('hidden');
      return;
    }
    const left = Math.max(0, info.left | 0);
    const label = info.label && info.label !== info.mapName ? info.label : '';
    box.append(
      h('span', { class: 'tv-ico' }, ico('path')),
      h('div', { class: 'tv-main' },
        h('div', { class: 'tv-dest' }, 'Đang tới: ', h('b', null, info.mapName || '...')),
        h('div', { class: 'tv-sub' }, label ? h('span', { class: 'tv-label' }, label) : null,
          h('span', { class: 'tv-left' }, left > 0 ? `còn ${left} bản đồ` : 'đã tới bản đồ đích'))),
      h('button', { class: 'btn small danger tv-x', title: 'Hủy tìm đường (Esc)', onclick: (e) => {
        e.stopPropagation();
        sfx('click');
        if (this.game && this.game.cancelTravel) this.game.cancelTravel();
        else this.setTravel(null);
      } }, 'Hủy'));
    box.classList.remove('hidden');
  }

  // Nút đổi bộ kỹ năng cạnh cụm kỹ năng
  updateHbSets() {
    const box = this.hbSets;
    if (!box) return;
    const { n, cur } = hbInfo();
    const key = `${n}|${cur}`;
    if (box.dataset.k === key) return;
    box.dataset.k = key;
    box.innerHTML = '';
    box.classList.toggle('hidden', n <= 1);
    box.appendChild(h('span', { class: 'hbs-lab' }, 'Bộ'));
    for (let k = 0; k < n; k++) {
      box.appendChild(h('button', { class: `hbs${k === cur ? ' on' : ''}`, title: k === cur ? `Đang dùng bộ ${k + 1} - bấm để sang bộ ${((k + 1) % n) + 1}` : `Đổi sang bộ kỹ năng ${k + 1}`,
        'aria-label': `Bộ kỹ năng ${k + 1}`, onclick: (e) => {
          e.stopPropagation();
          this.switchSet(k === cur ? (cur + 1) % n : k);
        } }, String(k + 1)));
    }
  }

  switchSet(n) {
    if (n === hbInfo().cur) return;
    sfx('click');
    this.net.send('hotbarSet', { n });
  }

  bindLongPress(el, fn, ms = 500) {
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      timer = 0;
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      stop();
      timer = setTimeout(() => {
        timer = 0;
        fn();
      }, ms);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, stop);
  }

  updatePotions() {
    if (!this.potBtns) return;
    for (const kind of ['hp', 'mp']) {
      let n = 0;
      let icon = null;
      for (const it of S.inv) {
        if (!it) continue;
        const def = S.G.items[it.id];
        if (def.type === 'potion' && def.effect[kind]) {
          n += it.q;
          if (!icon || def.lv <= S.me.level) icon = def.icon;
        }
      }
      const b = this.potBtns[kind];
      b.querySelector('img').src = iconURL(icon || { k: 'potion', c: kind === 'hp' ? '#e53935' : '#1e88e5', s: 1 });
      b.querySelector('.qty').textContent = n > 999 ? '999+' : n;
      b.classList.toggle('empty', !n);
    }
  }

  setAuto(on) {
    this.autoBtn.classList.toggle('on', on);
    this.toast(on ? 'Bật tự động đánh' : 'Tắt tự động đánh', on ? 'auto' : 'info');
  }

  onEnterMap(map) {
    $('#map-name').textContent = map.name;
    $('#map-info').textContent = map.town ? 'Khu an toàn' : map.pvp ? 'Khu PK tự do' : map.arena ? 'Lôi đài xếp hạng' : map.instance ? 'Phó bản' : map.lv ? `Quái cấp ${map.lv[0]}-${map.lv[1]}` : '';
    const hm = $('#hud-map');
    hm.classList.toggle('town', !!map.town);
    hm.classList.toggle('pvp', !!map.pvp || !!map.arena);
    sfx('portal');
    this.closeDialog();
    this.mmStatic = null;
    this.drawMinimap(true);
    this.toast(map.name, 'map');
    if (this.winName === 'shop' || this.winName === 'upgrade') this.close();
  }

  updateTarget(t) {
    const box = $('#hud-target');
    // lớp trên body để khối tìm đường và thông báo né khung mục tiêu
    const tg = !t ? '' : t.kind === 'm' && t.e.def.boss ? 'boss' : 'on';
    if (tg !== this.tgState) {
      this.tgState = tg;
      document.body.classList.toggle('tg-on', !!tg);
      document.body.classList.toggle('tg-boss', tg === 'boss');
    }
    if (!t) {
      if (!box.classList.contains('hidden')) box.classList.add('hidden');
      this.lastTargetKey = null;
      return;
    }
    box.classList.remove('hidden');
    const e = t.e;
    const key = `${t.kind}${t.id}`;
    if (this.lastTargetKey !== key) {
      this.lastTargetKey = key;
      const el = $('#tg-el');
      if (t.kind === 'm') {
        const d = e.def;
        $('#tg-name').textContent = d.name;
        $('#tg-lv').textContent = `Lv${d.lv}`;
        el.textContent = d.el ? S.G.elements[d.el].name : '';
        el.style.color = d.el ? ELEMENT_COLORS[d.el] : '';
        $('#tg-name').style.color = d.boss ? '#ffd27a' : this.game.mobColor(d.lv);
      } else {
        const c = S.G.classes[e.info.cls];
        $('#tg-name').textContent = e.info.name;
        $('#tg-lv').textContent = `Lv${e.info.lv}`;
        el.textContent = c.name;
        el.style.color = ELEMENT_COLORS[c.element];
        $('#tg-name').style.color = '#ffffff';
      }
      box.classList.toggle('boss', t.kind === 'm' && !!e.def.boss);
      box.classList.toggle('player', t.kind === 'p');
    }
    const hp = Math.max(0, e.hp);
    const max = e.mhp || 1;
    const w = `${(hp / max) * 100}%`;
    $('#tg-bar i').style.width = w;
    $('#tg-bar b').style.width = w;
    $('#tg-bar span').textContent = `${fmt(hp)}/${fmt(max)}`;
    // boss: cờ cuồng nộ và thanh niệm chiêu (tên chiêu + thời gian còn lại trước khi tung)
    const rage = t.kind === 'm' && !!e.rage;
    if (box.classList.contains('rage') !== rage) box.classList.toggle('rage', rage);
    const cast = t.kind === 'm' && e.cast && this.game ? e.cast : null;
    const cb = $('#tg-cast');
    if (cb) {
      const f = cast ? Math.min(1, (this.game.t - cast.t0) / cast.dur) : 1;
      const on = !!cast && f < 1;
      if (cb.classList.contains('hidden') === on) cb.classList.toggle('hidden', !on);
      if (on) {
        cb.querySelector('i').style.width = `${f * 100}%`;
        const txt = `Đang niệm: ${cast.name}`;
        const sp = cb.querySelector('span');
        if (sp.textContent !== txt) sp.textContent = txt;
      }
    }
  }

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
  }

  // Tên boss trên biểu ngữ: hậu tố " Tà Thú" trùng tiêu đề nên điện thoại ẩn đi để tên chính không bị cắt
  evBossName(name) {
    const m = /^(.+?)( Tà Thú)$/.exec(name || '');
    return h('span', { class: 'ev-boss' }, m ? m[1] : name || '', m ? h('span', { class: 'ev-sfx' }, m[2]) : null);
  }

  evLeftText(ev) {
    const s = Math.max(0, Math.ceil((ev.until - performance.now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

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
  }

  showEventResult(m) {
    this.evResult = { data: m, at: performance.now() };
    if (!this.evInfo) this.setEvent(null);
    // chỉ tự mở cho người đang ở bản đồ của boss (người đã đi nơi khác có thể đang đánh quái);
    // không chen ngang khi đang giao dịch/cường hóa/mua bán
    const here = !m.map || S.mapId === m.map;
    if (here && (!this.winName || this.winName === 'evresult' || this.winName === 'map' || this.winName === 'quest')) this.open('evresult');
    else this.toast('Tà Thú đã bị hạ! Bấm biểu ngữ dưới màn hình để xem bảng sát thương.', 'reward');
  }

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
  }

  // ---------------- Lôi đài
  // Viên HUD giữa đáy: đang chờ ghép (thời gian chờ, nút hủy) hoặc đang đấu (đối thủ, đồng hồ, nút rời trận).
  // Đếm ngược 5 giây hiện số lớn giữa màn hình, không chặn thao tác.
  setArena(a) {
    const box = $('#hud-arena');
    const cd = $('#arena-cd');
    this.arenaInfo = a;
    this.arenaQuit = 0;
    // cảnh báo "Bấm lần nữa để rời" chỉ đúng khi nút Rời còn đó
    if (this.arenaQuitToast) {
      this.arenaQuitToast.remove();
      this.arenaQuitToast = null;
    }
    if (this.winName === 'rank' && this.rankTab === 'arena') this.refresh();
    if (!box) return;
    box.innerHTML = '';
    this.arenaEls = null;
    document.body.classList.toggle('ar-on', !!a);
    document.body.classList.toggle('ar-fight', !!a && a.st !== 'queue');
    if (!a) {
      box.classList.add('hidden');
      if (cd) {
        cd.classList.add('hidden');
        cd.textContent = '';
      }
      document.body.classList.remove('ar-go');
      return;
    }
    // vào trận: dọn thông báo cũ để số đếm ngược không bị che
    if (a.st === 'prep') $('#toasts').replaceChildren();
    const time = h('b', { class: 'ar-time' }, '');
    if (a.st === 'queue') {
      this.arenaEls = { time, n: h('span', { class: 'ar-n' }, '') };
      box.append(
        h('span', { class: 'ar-ico' }, ico('arena')),
        h('span', { class: 'ar-main' },
          h('span', { class: 'ar-top' }, h('span', { class: 'ar-title' }, 'Lôi đài'), time),
          h('span', { class: 'ar-sub' }, h('span', { class: 'ar-wait' }, 'Đang chờ', h('span', { class: 'ar-wx' }, ' ghép trận')), this.arenaEls.n)),
        h('button', { class: 'btn small ar-btn', title: 'Hủy đăng ký lôi đài', onclick: (e) => { e.stopPropagation(); sfx('click'); this.net.send('arenaCancel'); } }, 'Hủy'));
      box.className = 'queue';
    } else {
      const o = a.opp || { name: '?', lv: 0, elo: 0 };
      const quit = h('button', { class: 'btn small danger ar-btn', title: 'Rời trận (tính thua)' }, 'Rời');
      quit.onclick = (e) => {
        e.stopPropagation();
        sfx('click');
        // bấm 2 lần trong 3 giây mới rời, tránh bấm nhầm mất trận
        if (performance.now() - this.arenaQuit < 3000) {
          if (this.arenaQuitToast) this.arenaQuitToast.remove();
          this.arenaQuitToast = null;
          this.net.send('arenaLeave');
          return;
        }
        this.arenaQuit = performance.now();
        quit.textContent = 'Chắc?';
        quit.classList.add('ask');
        this.arenaQuitToast = this.toast('Rời trận sẽ tính thua. Bấm lần nữa để rời.', 'warn');
        setTimeout(() => {
          if (quit.isConnected) {
            quit.textContent = 'Rời';
            quit.classList.remove('ask');
          }
        }, 3000);
      };
      this.arenaEls = { time };
      const cls = S.G.classes[o.cls];
      box.append(
        h('span', { class: 'ar-ico' }, ico('arena')),
        h('span', { class: 'ar-main' },
          h('span', { class: 'ar-top' }, h('span', { class: 'ar-title' }, a.rated === false ? 'Giao hữu' : 'Lôi đài'), time),
          h('span', { class: 'ar-sub' }, h('span', { class: 'ar-vs' }, 'VS'), h('span', { class: 'ar-opp' }, o.name),
            h('span', { class: 'ar-oinfo' }, `Lv${o.lv}${cls ? ` ${cls.name}` : ''} · ${fmt(o.elo)}`))),
        a.st === 'end' ? null : quit);
      box.className = a.st;
    }
    this.arenaTick(performance.now());
  }

  arenaTick(now) {
    const a = this.arenaInfo;
    const els = this.arenaEls;
    if (!a || !els) return;
    const since = now - a.at;
    const mmss = (ms) => {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    let txt = '';
    if (a.st === 'queue') txt = mmss((a.wait || 0) + since);
    else if (a.st === 'prep') txt = 'Chuẩn bị';
    else if (a.st === 'fight') txt = mmss((a.left || 0) - since);
    else txt = 'Kết thúc';
    if (els.time.textContent !== txt) els.time.textContent = txt;
    els.time.classList.toggle('ending', a.st === 'fight' && (a.left || 0) - since < 30000);
    if (els.n) {
      const n = a.n > 1 ? `· ${a.n} người chờ` : '';
      if (els.n.textContent !== n) els.n.textContent = n;
    }
    // số đếm ngược lớn: 5..1 lúc chuẩn bị, "ĐẤU!" trong 1 giây đầu trận
    const cd = $('#arena-cd');
    if (!cd) return;
    let big = '';
    if (a.st === 'prep') big = String(Math.max(1, Math.ceil(((a.left || 0) - since) / 1000)));
    else if (a.st === 'fight' && since < 1000) big = 'ĐẤU!';
    if (cd.textContent !== big) {
      cd.textContent = big;
      cd.classList.toggle('go', big === 'ĐẤU!');
      document.body.classList.toggle('ar-go', big === 'ĐẤU!');
      cd.classList.toggle('hidden', !big);
      if (big) {
        // chạy lại hiệu ứng phóng to mỗi số
        cd.classList.remove('pop');
        void cd.offsetWidth;
        cd.classList.add('pop');
        sfx(big === 'ĐẤU!' ? 'boss' : 'spin');
      }
    }
  }

  showArenaResult(m) {
    this.arenaRes = m;
    sfx(m.res === 'win' ? 'quest' : m.res === 'lose' ? 'die' : 'coin');
    // không chen ngang giao dịch/cường hóa (trận có thể kết thúc khi đối thủ rời lúc mình đang ở chỗ khác)
    if (!this.winName || ['rank', 'arenares', 'map', 'quest', 'char'].includes(this.winName)) this.open('arenares');
    const lab = m.nc ? 'Trận không tính' : { win: 'Thắng', lose: 'Thua', draw: 'Hòa' }[m.res] || '';
    this.toast(`Lôi đài: ${lab}${m.rated ? ` (${m.d >= 0 ? '+' : ''}${m.d} điểm)` : ''}`, m.res === 'win' && !m.nc ? 'reward' : 'info');
  }

  renderArenaRes() {
    const r = this.arenaRes;
    if (!r) return this.close();
    const A = S.G.arena || {};
    const res = ['win', 'lose', 'draw'].includes(r.res) ? r.res : 'draw';
    const big = { win: 'THẮNG', lose: 'THUA', draw: 'HÒA' }[res];
    const why = {
      ko: res === 'win' ? 'Hạ gục đối thủ' : 'Bị hạ gục',
      time: res === 'draw' ? 'Hết giờ, sinh lực hai bên bằng nhau' : `Hết giờ · sinh lực còn ${r.hp}% so với ${r.ohp}%`,
      leave: res === 'win' ? 'Đối thủ rời trận' : 'Bạn đã rời trận',
      dc: res === 'win' ? 'Đối thủ mất kết nối' : 'Mất kết nối',
    }[r.reason] || '';
    const cls = r.opp && S.G.classes[r.opp.cls];
    const d = r.d || 0;
    const head = h('div', { class: `arr-head r-${res}` },
      h('span', { class: 'arr-badge' }, ico('arena')),
      h('div', { class: 'arr-main' },
        h('div', { class: 'arr-big' }, big),
        h('div', { class: 'muted' }, `Đối thủ ${r.opp ? r.opp.name : '?'}${r.opp ? ` · Lv${r.opp.lv}${cls ? ` ${cls.name}` : ''}` : ''}`),
        h('div', { class: 'arr-why' }, why)));
    const elo = r.nc
      ? h('div', { class: 'arr-elo muted' }, 'Trận không tính: chưa bên nào ra đòn, điểm và số trận không đổi.')
      : r.rated
      ? h('div', { class: 'arr-elo' },
        h('span', { class: 'muted' }, 'Điểm lôi đài'),
        h('b', { class: 'arr-from' }, fmt(r.before)), h('span', { class: 'arr-arrow' }, '→'), h('b', null, fmt(r.elo)),
        h('span', { class: `arr-d ${d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'}` }, `${d > 0 ? '+' : ''}${d}`))
      : h('div', { class: 'arr-elo muted' }, `Trận giao hữu: hai bạn đã đấu ${A.pairDaily || 3} trận tính điểm hôm nay, điểm không đổi.`);
    const gains = [];
    if (r.xu) gains.push(h('span', { class: 'arr-gain' }, ico('xu'), `+${fmt(r.xu)} xu`));
    if (r.fame) gains.push(h('span', { class: 'arr-gain' }, ico('rank'), `+${r.fame} danh vọng`));
    const reward = gains.length ? h('div', { class: 'arr-rw' }, ...gains)
      : h('div', { class: 'arr-rw muted' }, r.lock ? `Bỏ trận: chờ ${Math.round(r.lock / 1000)} giây mới đăng ký lại được.` : r.quit ? 'Rời trận: không có thưởng.' : r.rated ? `Đã đủ ${A.daily || 20} trận có thưởng hôm nay.` : 'Không có thưởng.');
    const streak = res === 'win' && r.streak >= 2 ? h('div', { class: 'arr-streak' }, `Chuỗi ${r.streak} trận thắng!`) : null;
    const again = h('button', { class: 'btn primary', onclick: () => { sfx('click'); this.net.send('arenaJoin'); this.close(); } }, 'Đấu trận mới');
    this.frameWin('Kết Quả Lôi Đài', h('div', { class: 'arr' }, head, elo, reward, streak),
      h('div', { class: 'arr-foot' },
        h('button', { class: 'btn', onclick: () => { this.rankTab = 'arena'; this.open('rank'); } }, 'Bảng xếp hạng'),
        S.arena && S.arena.st === 'queue' ? h('span', { class: 'muted' }, 'Đang chờ trận mới...') : again,
        h('button', { class: 'btn', onclick: () => this.close() }, 'Đóng')));
  }

  // gọi mỗi khung hình
  frame() {
    const now = performance.now();
    if (!S.me || !this.game) return;
    const g = this.game;
    // Hồi chiêu: cập nhật ~30 lần/giây cho vòng quét mượt
    if (now - this.lastCd >= 33) {
      this.lastCd = now;
      const upd = (b, sid, basic) => {
        const cd = b._cd || (b._cd = b.querySelector('.cd'));
        const ct = b._ct || (b._ct = b.querySelector('.cdt'));
        let p = 0;
        let txt = '';
        if (sid) {
          const sk = S.G.skills[sid];
          const left = (g.cool[sid] || 0) - now;
          if (left > 0) {
            p = Math.min(1, left / sk.cd);
            if (!basic && sk.cd >= 1200) txt = left >= 1000 ? String(Math.ceil(left / 1000)) : (left / 1000).toFixed(1);
          }
          const lv = S.me.skills[sid] || 0;
          const nomp = S.me.mp < Math.round(skillVal(sk.mp, lv));
          if (b._nomp !== nomp) {
            b._nomp = nomp;
            b.classList.toggle('nomp', nomp);
          }
        }
        const pr = Math.round(p * 200) / 200;
        if (b._p !== pr) {
          b._p = pr;
          cd.style.setProperty('--p', pr);
          b.classList.toggle('cool', pr > 0);
          if (pr === 0 && b._wasCool && !basic) {
            b.classList.remove('rdy');
            void b.offsetWidth;
            b.classList.add('rdy');
          }
          b._wasCool = pr > 0;
        }
        if (ct.textContent !== txt) ct.textContent = txt;
      };
      upd(this.basicBtn, g.basicSkill(), true);
      this.skillBtns.forEach((b, i) => upd(b, S.me.hotbar[i], false));
    }
    if (now - this.lastFrame < 80) return;
    this.lastFrame = now;
    if (this.arenaInfo) this.arenaTick(now);
    if (this.evInfo && this.evTime) {
      const txt = this.evLeftText(this.evInfo);
      if (this.evTime.textContent !== txt) this.evTime.textContent = txt;
      this.evTime.classList.toggle('ending', this.evInfo.until - now < 120000);
    } else if (!this.evInfo && this.evResult && now - this.evResult.at > 120000 && document.body.classList.contains('ev-on')) {
      this.setEvent(null);
    }
    document.querySelectorAll('#hud-buffs .buff[data-until]').forEach((el) => {
      const left = Math.max(0, Math.ceil((+el.dataset.until - Date.now()) / 1000));
      el.querySelector('small').textContent = left > 60 ? `${Math.ceil(left / 60)}p` : `${left}s`;
      el.classList.toggle('ending', left <= 5);
    });
    if (this.dollCv && this.winName === 'inv' && this.dollCv.isConnected) this.drawDoll(now / 1000);
    if (this.petCv && this.winName === 'pet' && this.petCv.isConnected) this.drawPetFig(now / 1000);
    if (now - (this.lastMini || 0) > 200) {
      this.lastMini = now;
      // đã rời xa Sứ Giả Lễ Hội khi cửa sổ còn mở: chuyển sang chế độ xem từ xa (nút đổi tắt, có Tìm đường)
      if (this.winName === 'event' && this.eventNpc && !this.eventNear()) {
        this.eventNpc = null;
        this.refresh();
      }
      this.drawMinimap();
      const pe = $('#map-ping');
      pe.textContent = S.ping ? `${S.ping}ms` : '';
      pe.className = S.ping > 250 ? 'bad' : S.ping > 120 ? 'warn' : 'good';
    }
  }

  // Bản đồ nhỏ: lớp tĩnh (địa hình) vẽ một lần, lớp động mỗi 200ms
  drawMinimap() {
    const g = this.game;
    if (!g || !g.map) return;
    const cv = $('#minimap');
    const ctx = cv.getContext('2d');
    const map = g.map;
    const W = cv.width;
    const H = cv.height;
    let y0 = map.ground - 190;
    for (const p of map.platforms) y0 = Math.min(y0, p[1] - 24);
    y0 = Math.max(0, y0);
    const sx = W / map.w;
    const sy = H / (map.h - y0);
    const Y = (y) => Math.round((y - y0) * sy);
    if (!this.mmStatic || this.mmStatic.id !== map.id || this.mmStatic.cv.width !== W) {
      const sc = document.createElement('canvas');
      sc.width = W;
      sc.height = H;
      const c = sc.getContext('2d');
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, map.town ? '#1d3048' : map.pvp ? '#3a1414' : '#1c2a3a');
      sky.addColorStop(1, map.town ? '#2c3a4a' : map.pvp ? '#2a1a20' : '#283428');
      c.fillStyle = sky;
      c.fillRect(0, 0, W, H);
      const gy = Y(map.ground);
      c.fillStyle = '#4a3322';
      c.fillRect(0, gy, W, H - gy);
      c.fillStyle = '#6b4a30';
      c.fillRect(0, gy + 2, W, 1);
      c.fillStyle = map.pvp ? '#a1887f' : '#7cb342';
      c.fillRect(0, gy, W, 2);
      for (const [x, y, w] of map.platforms) {
        c.fillStyle = '#1a0e08';
        c.fillRect(Math.round(x * sx), Y(y) + 1, Math.max(3, Math.round(w * sx)), 2);
        c.fillStyle = '#d7b07a';
        c.fillRect(Math.round(x * sx), Y(y), Math.max(3, Math.round(w * sx)), 1);
      }
      for (const p of map.portals) {
        const px = Math.round(p.x * sx);
        c.fillStyle = 'rgba(79,195,247,0.35)';
        c.fillRect(px - 2, gy - 9, 5, 9);
        c.fillStyle = '#81d4fa';
        c.fillRect(px - 1, gy - 8, 3, 8);
      }
      for (const n of map.npcs) {
        const nx = Math.round(n.x * sx);
        c.fillStyle = '#1a0e08';
        c.fillRect(nx - 2, gy - 5, 4, 4);
        c.fillStyle = '#ffd54f';
        c.fillRect(nx - 1, gy - 4, 2, 2);
      }
      this.mmStatic = { id: map.id, cv: sc };
    }
    ctx.drawImage(this.mmStatic.cv, 0, 0);
    const dot = (x, y, s, col) => {
      const px = Math.round(x * sx - s / 2);
      const py = Y(y) - s;
      ctx.fillStyle = '#120804';
      ctx.fillRect(px - 1, py - 1, s + 2, s + 2);
      ctx.fillStyle = col;
      ctx.fillRect(px, py, s, s);
    };
    const blink = Math.floor(performance.now() / 300) % 2;
    for (const m of g.monsters.values()) {
      if (m.def.boss) dot(m.x, m.y - 2, 4, blink ? '#ff1744' : '#ff80ab');
      else dot(m.x, m.y - 2, 2, '#ef5350');
    }
    for (const p of g.players.values()) dot(p.x, p.y - 2, 2, p.info.party && p.info.party === S.party.id ? '#69f0ae' : '#ffffff');
    dot(g.me.x, g.me.y - 2, 3, '#ffeb3b');
    ctx.strokeStyle = 'rgba(255,240,200,0.55)';
    ctx.lineWidth = 1;
    const vy = Math.max(0, Y(Math.max(y0, g.camY)));
    ctx.strokeRect(Math.round(g.camX * sx) + 0.5, vy + 0.5, Math.round(g.W * sx) - 1, Math.min(H - vy, Math.round(g.H * sy)) - 1);
  }

  renderPartyHud() {
    const box = $('#hud-party');
    box.innerHTML = '';
    for (const m of S.party.members) {
      if (m.id === S.me.id) continue;
      const cls = S.G.classes[m.cls];
      box.appendChild(h('div', { class: 'pm', title: m.map },
        h('div', { class: 'pmn' }, m.leader ? h('span', { class: 'crown' }, '★') : null, h('span', { class: 'pmname' }, m.name), h('span', { class: 'pml' }, `Lv${m.lv}`)),
        h('div', { class: 'bar hp tiny' }, h('i', { style: { width: `${(m.hp / Math.max(1, m.mhp)) * 100}%` } })),
        h('div', { class: 'pmm' }, cls ? h('span', { style: { color: ELEMENT_COLORS[cls.element] } }, cls.name) : null, ` · ${m.map}`)));
    }
  }

  // ---------------- Thông báo
  toast(msg, kind = 'info') {
    const box = $('#toasts');
    // gộp thông báo trùng liên tiếp thay vì xếp chồng
    const last = box.lastElementChild;
    if (last && !last.classList.contains('out') && last.textContent === msg) last.remove();
    const el = h('div', { class: `toast k-${kind}` }, h('span', null, msg));
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    const long = kind === 'map' || kind === 'level';
    setTimeout(() => el.classList.add('out'), long ? 2200 : 3200);
    setTimeout(() => el.remove(), long ? 2800 : 3800);
    return el;
  }

  // ---------------- Cửa sổ
  toggle(name) {
    if (this.winName === name) return this.close();
    this.open(name);
  }

  open(name) {
    this.close(true);
    this.winName = name;
    if (name === 'rank') this.net.send('rank');
    if (name === 'clan') this.net.send('clanInfo');
    if (name === 'friends') this.net.send('friendList');
    if (name === 'mail') this.net.send('mailList');
    const win = h('div', { class: `win win-${name}` });
    this.win = win;
    $('#windows').appendChild(win);
    document.body.classList.add('win-open');
    document.body.classList.toggle('evr-open', name === 'evresult');
    if (this.menuBtns) for (const k in this.menuBtns) this.menuBtns[k].classList.toggle('open', k === name);
    this.refresh();
  }

  close(silent) {
    if (this.win) this.win.remove();
    if (this.winName === 'trade' && this.trade && !silent) this.net.send('tradeCancel');
    if (this.wheelAnim) cancelAnimationFrame(this.wheelAnim);
    this.wheelAnim = null;
    this.win = null;
    this.winName = null;
    this.dollCv = null;
    this.petCv = null;
    this.skSel = null;
    this.skSlotSel = null;
    document.body.classList.remove('win-open', 'evr-open');
    if (this.menuBtns) for (const k in this.menuBtns) this.menuBtns[k].classList.remove('open');
    this.hideItem();
  }

  closeAll() {
    this.close();
    this.closeDialog();
    this.hideMenu();
  }

  frameWin(title, body, footer) {
    const win = this.win;
    win.innerHTML = '';
    win.appendChild(h('div', { class: 'win-head' }, h('div', { class: 'win-title' }, h('span', null, title)),
      h('button', { class: 'x', title: 'Đóng (Esc)', 'aria-label': 'Đóng', onclick: () => this.close() }, ico('close'))));
    win.appendChild(h('div', { class: 'win-body' }, body));
    if (footer) win.appendChild(h('div', { class: 'win-foot' }, footer));
  }

  refresh() {
    if (!this.win || !S.me) return;
    const scroll = this.win.querySelector('.win-body') ? this.win.querySelector('.win-body').scrollTop : 0;
    const fn = {
      inv: this.renderInv, char: this.renderChar, skill: this.renderSkills, quest: this.renderQuest, party: this.renderParty,
      clan: this.renderClan, rank: this.renderRank, map: this.renderWorldMap, settings: this.renderSettings, shop: this.renderShop,
      upgrade: this.renderUpgrade, trade: this.renderTrade, inspect: this.renderInspect,
      storage: this.renderStorage, friends: this.renderFriends, gift: this.renderGift, wheel: this.renderWheel,
      evresult: this.renderEvResult, pet: this.renderPet, mail: this.renderMail, event: this.renderEvent, arenares: this.renderArenaRes,
    }[this.winName];
    if (fn) fn.call(this);
    const b = this.win.querySelector('.win-body');
    if (b) b.scrollTop = scroll;
  }

  // ----- Túi đồ
  // Tab ô trang bị: 'gear' (chiến đấu) / 'style' (thời trang + thú cưng)
  eqTabs() {
    const tab = this.eqTab === 'style' ? 'style' : 'gear';
    const btn = (k, label) => h('button', { class: `tab${tab === k ? ' on' : ''}`, 'data-eqtab': k, onclick: () => { this.eqTab = k; this.refresh(); } }, label);
    return h('div', { class: 'tabs eq-tabs' }, btn('gear', 'Trang bị'), btn('style', 'Thời trang'));
  }

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
  }

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
  }

  invGrid(onclick, mark) {
    const grid = h('div', { class: 'inv-grid' });
    S.inv.forEach((it, i) => {
      if (!it) return grid.appendChild(h('div', { class: 'slot empty' }));
      grid.appendChild(itemIcon(it, { sel: mark && mark.has(i), onclick: () => onclick(it, i) }));
    });
    return grid;
  }

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
  }

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
  }

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
  }

  // Một dòng tóm tắt: "Ngọc khảm 2/3: +0.6% chí mạng, +0.3% hút máu"
  gemShort(it, holes) {
    const gs = (Array.isArray(it.gems) ? it.gems : []).map(gemDef).filter(Boolean);
    return h('div', { class: 'id-gems short' }, h('span', { class: 'idg-title' }, `Ngọc khảm ${gs.length}/${holes}`),
      gs.length ? h('b', null, `: ${gs.map(gemText).join(', ')}`) : h('span', { class: 'muted' }, ' · khảm ở tab Khảm ngọc'));
  }

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
  }

  hideItem() {
    if (this.itemPop) this.itemPop.remove();
    this.itemPop = null;
    this.itemPopRef = null;
  }

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
  }

  sellPrice(it) {
    const def = S.G.items[it.id];
    let base = def.price || (def.priceLuong ? 50 : 1);
    if (def.type === 'equip') base = base * (1 + (it.r || 0) * 0.5) * (1 + (it.p || 0) * 0.3);
    // khớp sellPrice của server: ngọc đang khảm bán kèm
    let gems = 0;
    for (const id of it.gems || []) if (gemDef(id)) gems += Math.floor(gemDef(id).price * 0.25);
    return Math.max(1, Math.floor(base * 0.25)) + gems;
  }

  // ----- Nhân vật
  renderChar() {
    const me = S.me;
    const s = me.s;
    const cls = S.G.classes[me.cls];
    const el = S.G.elements[cls.element];
    const statRow = (k) => h('div', { class: 'stat-row' },
      h('span', { class: 'sn' }, S.G.statNames[k]), h('b', null, me.stats[k], s[k] !== me.stats[k] ? h('em', null, ` +${s[k] - me.stats[k]}`) : null),
      h('button', { class: 'btn small', disabled: me.potential < 1, onclick: () => this.net.send('addStat', { k, n: 1 }) }, '+1'),
      h('button', { class: 'btn small', disabled: me.potential < 10, onclick: () => this.net.send('addStat', { k, n: 10 }) }, '+10'));
    const desc = {
      str: '+2 tấn công mỗi điểm', agi: '+chí mạng, né tránh, chính xác', int: '+6 chakra, +0.6% sát thương kỹ năng', vit: '+12 sinh lực, +0.6 phòng thủ',
    };
    const derived = [
      ['Sinh lực', fmt(s.maxHp), 'hp'], ['Chakra', fmt(s.maxMp), 'mp'], ['Tấn công', fmt(s.atk), 'atk'], ['Phòng thủ', fmt(s.def), 'def'],
      ['Chí mạng', `${s.crit}%`], ['Né tránh', `${s.dodge}%`], ['Chính xác', s.hit], ['Tốc chạy', `+${s.spd}%`],
      ['ST kỹ năng', `+${s.skillDmg}%`], ['Kinh nghiệm', `x${s.expMul}`],
    ];
    // chỉ số từ kỹ năng nội tại (server cũ không gửi thì bỏ qua)
    if (s.critDmg != null) derived.push(['ST chí mạng', `${s.critDmg}%`]);
    if (s.resist) {
      const foe = Object.keys(S.G.elements).find((k) => S.G.elements[k].beats === cls.element);
      derived.push([`Kháng ${foe ? S.G.elements[foe].name : 'hệ khắc'}`, `${s.resist}%`]);
    }
    if (s.mpRegen) derived.push(['Chakra/giây', `+${s.mpRegen}`, 'mp']);
    if (s.lifesteal) derived.push(['Hút máu', `${s.lifesteal}%`, 'hp']);
    // phần tốc chạy đến từ thú cưỡi (đã gồm trong Tốc chạy)
    if (s.mountSpd) derived.push(['Thú cưỡi', `+${s.mountSpd}% tốc`]);
    const por = h('canvas', { width: 72, height: 72 });
    drawPortrait(por.getContext('2d'), { cls: me.cls, gender: me.gender, look: me.look, name: me.name, el: cls.element, weaponType: null });
    this.frameWin('Nhân Vật', h('div', { class: 'char-wrap' },
      h('div', { class: 'char-head' },
        h('div', { class: 'por-ring' }, por, h('span', { class: 'lv-badge' }, me.level)),
        h('div', { class: 'ch-info' },
          h('div', { class: 'big-name' }, me.name),
          h('div', { class: 'tags' }, h('span', { class: 'tag' }, `Phái ${cls.name}`), h('span', { class: 'tag', style: { color: ELEMENT_COLORS[cls.element] } }, `Hệ ${el.name}`),
            me.clan ? h('span', { class: 'tag clan' }, `Gia tộc ${me.clan.name}`) : null),
          h('div', { class: 'pbar exp' }, h('i', { style: { width: `${Math.min(100, (me.exp / Math.max(1, me.need)) * 100)}%` } }), h('span', null, me.level >= (S.G.maxLevel || 100) ? 'MAX' : `EXP ${fmt(me.exp)}/${fmt(me.need)}`)),
          h('div', { class: 'muted tiny' }, `Đã diệt ${fmt(me.kills)} quái`))),
      // ngoại trang: 4 ô thời trang + thú cưng, bấm để xem / tháo
      h('div', { class: 'char-style' }, h('span', { class: 'cs-title' }, 'Ngoại trang'),
        ...STYLE_SLOTS.map((k) => {
          const it = S.equip[k];
          return h('div', { class: 'cs-cell', title: S.G.slotNames[k] },
            it ? itemIcon(it, { onclick: () => this.showItem(it, { from: 'eq', slot: k }) }) : emptySlot(k),
            h('label', null, S.G.slotNames[k]));
        })),
      h('div', { class: 'char-cols' },
        h('div', { class: 'sec' }, h('div', { class: 'sec-title row between' }, h('span', null, 'Điểm tiềm năng'), h('span', { class: `pts${me.potential ? ' good' : ''}` }, `Còn ${me.potential}`)),
          ...['str', 'agi', 'int', 'vit'].map((k) => h('div', { class: 'stat-block' }, statRow(k), h('div', { class: 'muted tiny' }, desc[k])))),
        h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Chỉ số chiến đấu'),
          h('div', { class: 'grid2' }, ...derived.map(([a, b, c]) => h('div', { class: `kv${c ? ` k-${c}` : ''}` }, h('span', null, a), h('b', null, b))))))),
    h('div', { class: 'row between char-foot' },
      h('button', { class: 'btn small pet-open', onclick: () => this.open('pet') }, ico('pet'), ' Thú cưng'),
      h('button', { class: 'btn small', onclick: () => {
        if (confirm('Tẩy toàn bộ điểm tiềm năng với giá 20 lượng?')) this.net.send('resetStats');
      } }, 'Tẩy điểm (20 lượng)')));
  }

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
  }

  // Mô tả kỹ năng thú ở cấp lv (short: chỉ con số, dùng cho dòng "cấp sau")
  petSkillText(k, lv, short) {
    const sk = S.G.pet.skills[k];
    const pct = k === 'heal' ? `${sk.pct[lv].toLocaleString('vi-VN')}%` : '';
    if (k === 'pick') return short ? `tầm nhặt ${sk.r[lv]}` : `Tự nhặt vật phẩm rơi quanh chủ (tầm nhặt ${sk.r[lv]}), mỗi ${(sk.every / 1000).toLocaleString('vi-VN')} giây.`;
    if (k === 'heal') return short ? `hồi ${pct} sinh lực` : `Khi chủ dưới ${sk.below}% sinh lực: hồi ${pct} sinh lực tối đa mỗi ${sk.every / 1000} giây.`;
    return '';
  }

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
  }

  // Những gì đổi thì phải dựng lại cả cửa sổ (cấp, dỗi, no, số thức ăn, thú trong túi)
  petSig() {
    const mp = myPet();
    const foods = S.inv.map((x) => (x && (S.G.items[x.id].type === 'petfood' || S.G.items[x.id].slot === 'pet') ? `${x.id}:${x.q}:${x.plv || 0}` : '')).join();
    if (!mp) return `-|${foods}`;
    const v = this.petView(mp.it);
    return `${mp.it.id}|${v.lv}|${v.lazy}|${v.full}|${foods}`;
  }

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
  }

  feedPet(slot) {
    this.petHappy = performance.now();
    this.net.send('useItem', { slot });
  }

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
  }

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
      const slot = S.inv.findIndex((x) => x && x.id === id);
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
  }

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
  }

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
  }

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
  }

  setSlot(i, sid) {
    sfx('click');
    this.net.send('hotbar', { i, sid: sid || null });
  }

  // Bấm một kỹ năng trong danh sách: gán ngay nếu đã chọn ô, không thì đánh dấu để chọn ô
  pickSkill(sid) {
    if (performance.now() - (this.dragEnd || 0) < 300) return;
    if (this.skSlotSel != null) {
      this.setSlot(this.skSlotSel, sid);
      this.skSlotSel = null;
      this.skSel = null;
    } else this.skSel = this.skSel === sid ? null : sid;
    this.refresh();
  }

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
  }

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
  }

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
  }

  // ----- Nhóm
  renderParty() {
    const p = S.party;
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const amLeader = p.members.some((m) => m.leader && m.id === S.me.id);
    const rows = p.members.map((m) => {
      const cls = S.G.classes[m.cls];
      return h('div', { class: `list-row member${m.id === S.me.id ? ' me' : ''}` },
        h('span', { class: 'lr-badge', style: { '--c': ELEMENT_COLORS[cls.element] } }, m.leader ? '★' : m.lv),
        h('span', { class: 'lr-main' }, h('b', null, m.name), h('span', { class: 'muted' }, ` Lv${m.lv} ${cls.name} · ${m.map}`)),
        h('div', { class: 'bar hp tiny', style: { width: '90px' } }, h('i', { style: { width: `${(m.hp / Math.max(1, m.mhp)) * 100}%` } })),
        amLeader && m.id !== S.me.id ? h('button', { class: 'btn small danger', onclick: () => this.net.send('partyKick', { name: m.name }) }, 'Mời ra') : null);
    });
    this.frameWin('Nhóm', h('div', null,
      p.members.length ? h('div', { class: 'list' }, ...rows) : h('div', { class: 'empty-note' }, ico('party'), h('div', null, 'Bạn chưa có nhóm. Mời người chơi khác để lập nhóm (tối đa 6 người). Cả nhóm chia sẻ kinh nghiệm và được thưởng thêm 12% mỗi thành viên.')),
      h('div', { class: 'row add-row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('partyInvite', { name: inName.value }) }, 'Mời'))),
    p.members.length ? h('button', { class: 'btn danger', onclick: () => this.net.send('partyLeave') }, 'Rời nhóm') : null);
  }

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
      c.myRank === 'leader' && m.rank !== 'leader' ? h('button', { class: 'btn small', onclick: () => confirm(`Nhường chức tộc trưởng cho ${m.name}?`) && this.net.send('clanPromote', { name: m.name, rank: 'leader' }) }, 'Nhường') : null,
      canManage && m.rank !== 'leader' && m.name !== S.me.name ? h('button', { class: 'btn small danger', onclick: () => confirm(`Mời ${m.name} rời gia tộc?`) && this.net.send('clanKick', { name: m.name }) }, 'Đuổi') : null));
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
    h('button', { class: 'btn danger', onclick: () => confirm('Rời khỏi gia tộc?') && this.net.send('clanLeave') }, 'Rời gia tộc'));
  }

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
  }

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
  }

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
  }

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
  }

  // Vị trí đồng đội theo gói 'party' gần nhất
  partyMaps() {
    return (S.party.members || []).filter((m) => m.id !== S.me.id && m.mapId).map((m) => ({ name: m.name, mapId: m.mapId }));
  }

  // ----- Cài đặt
  renderSettings() {
    const st = S.settings;
    const num = (k, label, min, max) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'number', min, max, value: st[k], class: 'in short', onchange: (e) => { st[k] = Math.max(min, Math.min(max, +e.target.value)); saveSettings(); } }));
    const chk = (k, label) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'checkbox', class: 'switch', checked: st[k], onchange: (e) => { st[k] = e.target.checked; saveSettings(); } }));
    const key = (k, d) => h('div', { class: 'key-row' }, h('kbd', null, k), h('span', null, d));
    // áp dụng ngay vào game (lớp ngày/đêm, rung màn hình) rồi lưu
    const apply = () => { saveSettings(); if (this.game && this.game.applySettings) this.game.applySettings(); };
    const seg = (k, label, opts) => h('div', { class: 'set-row' }, h('span', null, label),
      h('div', { class: 'set-seg', role: 'radiogroup', 'aria-label': label }, ...opts.map(([v, txt]) => h('button', {
        class: `btn small${st[k] === v ? ' primary' : ''}`, role: 'radio', 'aria-checked': String(st[k] === v),
        onclick: () => { st[k] = v; apply(); this.refresh(); },
      }, txt))));
    const lit = seg('daynight', 'Ngày/đêm', [[0, 'Tắt'], [0.5, 'Nhẹ'], [1, 'Đầy đủ']]);
    const shake = chk('shake', 'Rung màn hình');
    shake.querySelector('input').addEventListener('change', apply);
    this.frameWin('Cài Đặt', h('div', { class: 'set-wrap' },
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Tự động đánh'), num('autoHp', 'Tự uống HP khi dưới (%)', 0, 95), num('autoMp', 'Tự uống MP khi dưới (%)', 0, 95), num('autoRange', 'Phạm vi tìm quái', 100, 2000), chk('autoPick', 'Tự nhặt đồ')),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Hiển thị & âm thanh'), chk('names', 'Hiện tên người chơi'), chk('sound', 'Âm thanh'), lit, shake,
        h('div', { class: 'muted tiny' }, 'Trời sáng tối theo giờ Việt Nam. Màn hình rung khi trúng đòn boss hoặc hạ boss.')),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Mã quà tặng'), this.codeBox(),
        h('div', { class: 'muted tiny' }, `Mỗi mã dùng 1 lần cho mỗi tài khoản. Hành trang đầy thì quà được gửi vào Hộp Thư${this.touch ? '' : ' (L)'}.`)),
      h('div', { class: 'sec help' }, h('div', { class: 'sec-title' }, 'Điều khiển'),
        key('A / D', 'Di chuyển (hoặc ← →)'), key('W / Space', 'Nhảy, nhấn 2 lần để nhảy đôi · S+Space: xuống bục'),
        key('J', 'Đánh thường'), key('1 - 6', 'Kỹ năng (nhấn giữ nút kỹ năng để đổi)'), key('T', 'Tự tìm đường tới nhiệm vụ'), key('Q / E', 'Bình HP / MP'), key('Z / X', 'Nhặt đồ / nói chuyện, vào cửa'), key('Tab', 'Đổi mục tiêu'), key('F', 'Tự động đánh'),
        key('B C V N', 'Túi đồ · Nhân vật · Kỹ năng · Nhiệm vụ'), key('P O G R M', 'Nhóm · Bạn bè · Gia tộc · Xếp hạng · Bản đồ'), key('K L', 'Thú cưng · Hộp thư'), key('Enter', 'Chat'), key('Esc', 'Đóng cửa sổ · hủy tìm đường'),
        h('div', { class: 'muted tiny' }, 'Bấm vào NPC để nói chuyện, bấm vào người chơi để mời nhóm/giao dịch/thách đấu.'))),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => this.onChangeChar && this.onChangeChar() }, 'Đổi nhân vật'), h('button', { class: 'btn danger', onclick: () => this.onLogout && this.onLogout() }, 'Đăng xuất')));
  }

  // ----- Cửa hàng
  renderShop() {
    const sh = this.shop;
    // hàng thời trang (lượng) tách tab riêng cho danh sách gọn
    const isFashion = (e) => !!S.G.items[e.id].fashion;
    // thú cưng và thức ăn thú: tab riêng
    const isPet = (e) => S.G.items[e.id].slot === 'pet' || S.G.items[e.id].type === 'petfood';
    const hasFashion = sh.items.some(isFashion);
    const hasPet = sh.items.some(isPet);
    if ((this.shopTab === 'fashion' && !hasFashion) || (this.shopTab === 'pet' && !hasPet)) this.shopTab = 'buy';
    const tab = (k, label) => h('button', { class: `tab${this.shopTab === k ? ' on' : ''}`, 'data-shtab': k, onclick: () => { this.shopTab = k; this.refresh(); } }, label);
    const tabs = h('div', { class: 'tabs' }, tab('buy', 'Mua'), hasPet ? tab('pet', 'Thú cưng') : null, hasFashion ? tab('fashion', 'Thời trang') : null, tab('sell', 'Bán'));
    let body;
    if (this.shopTab === 'sell') {
      body = h('div', null, h('div', { class: 'muted' }, 'Chọn vật phẩm trong hành trang để bán.'), this.invGrid((it, i) => this.showItem(it, { from: 'sell', slot: i })));
    } else {
      const kind = (e) => (isFashion(e) ? 'fashion' : isPet(e) ? 'pet' : 'buy');
      const list = sh.items.filter((e) => kind(e) === this.shopTab);
      body = h('div', { class: 'shop-list' }, ...list.map((e) => {
        const def = S.G.items[e.id];
        // sách nội tại chỉ đọc 1 lần nên không cho chọn số lượng (server cũng chỉ bán 1 cuốn mỗi lần)
        const multi = def.stack && def.type !== 'book';
        const qty = h('input', { type: 'number', min: 1, max: 999, value: def.type === 'potion' ? 10 : 1, class: 'in short' });
        const luong = e.cur === 'luong';
        // dấu cách không ngắt trước từ cuối: "Cấp 1" không bị tách, số cấp không đứng riêng một dòng
        return h('div', { class: 'shop-row' },
          itemIcon({ id: e.id, q: 1, r: def.grade || 0 }, { onclick: () => this.showItem({ id: e.id, q: 1, r: def.grade || 0 }, { from: 'view' }) }),
          h('div', { class: 'sh-info' }, h('div', { class: def.lv > S.me.level ? 'bad' : 'sh-name' }, def.name.replace(/ (?=\S+$)/, '\u00a0'), def.lv > 1 ? h('span', { class: 'muted' }, ` Lv${def.lv}`) : ''),
            h('div', { class: `price ${luong ? 'luong' : 'xu'}` }, ico(luong ? 'luong' : 'xu'), h('b', null, fmt(e.price)), luong ? ' lượng' : ' xu')),
          multi ? qty : null,
          h('button', { class: 'btn small primary', onclick: () => this.net.send('buy', { npc: sh.npc, id: e.id, qty: multi ? +qty.value || 1 : 1 }) }, 'Mua'));
      }));
    }
    this.frameWin(sh.title, h('div', null, tabs, body), moneyLine());
  }

  // ----- Thợ Rèn: Cường hóa / Khảm ngọc / Ghép ngọc (tab [data-smtab])
  smithTabs(tab) {
    const btn = (k, label) => h('button', {
      class: `tab${tab === k ? ' on' : ''}`, 'data-smtab': k,
      onclick: () => { this.smTab = k; this.upgradeFlash = null; this.gemFlash = null; this.gemPop = null; this.refresh(); },
    }, label);
    return h('div', { class: 'tabs sm-tabs' }, btn('upg', 'Cường hóa'), btn('gem', 'Khảm ngọc'), btn('merge', 'Ghép ngọc'));
  }

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
  }

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
  }

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
  }

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
  }

  // ----- Thủ kho
  renderStorage() {
    const st = this.storage;
    if (!st) return;
    const grid = h('div', { class: 'inv-grid' }, ...st.items.map((it, i) => (it
      ? itemIcon(it, { onclick: () => { sfx('click'); this.net.send('storeTake', { npc: st.npc, slot: i }); } })
      : h('div', { class: 'slot empty' }))));
    const used = st.items.filter(Boolean).length;
    this.frameWin('Thủ Kho', h('div', { class: 'store-wrap' },
      h('div', { class: 'sec' }, h('div', { class: 'sub-title' }, `Kho đồ ${used}/${st.items.length}`), h('div', { class: 'muted tiny' }, 'Bấm để lấy ra'), grid),
      h('div', { class: 'sec' }, h('div', { class: 'sub-title' }, 'Hành trang'), h('div', { class: 'muted tiny' }, 'Bấm để cất vào kho'), this.invGrid((it, i) => { sfx('click'); this.net.send('storePut', { npc: st.npc, slot: i }); }))),
    h('span', { class: 'muted tiny' }, 'Kho đồ dùng chung giữa mọi làng, miễn phí.'));
  }

  // ----- Bạn bè
  renderFriends() {
    const list = this.friends || [];
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const rows = list.map((f) => h('div', { class: 'list-row' },
      h('span', { class: `dot-on${f.online ? ' on' : ''}` }),
      h('span', { class: 'lr-main' }, h('b', { class: f.online ? '' : 'muted' }, f.name), h('span', { class: 'muted' }, ` Lv${f.lv} ${S.G.classes[f.cls] ? S.G.classes[f.cls].name : ''}${f.map ? ` · ${f.map}` : ''}`)),
      f.online ? h('button', { class: 'btn small', onclick: () => { this.pmTo = f.name; this.setChatCh('pm'); this.close(); this.focusChat(); } }, 'Nhắn') : null,
      f.online ? h('button', { class: 'btn small', onclick: () => this.net.send('partyInvite', { name: f.name }) }, 'Mời nhóm') : null,
      h('button', { class: 'btn small danger', onclick: () => confirm(`Xóa ${f.name} khỏi danh sách bạn bè?`) && this.net.send('friendDel', { name: f.name }) }, 'Xóa')));
    this.frameWin(`Bạn Bè (${list.length}/50)`, h('div', null,
      list.length ? h('div', { class: 'list' }, ...rows) : h('div', { class: 'empty-note' }, ico('friends'), h('div', null, 'Chưa có bạn bè. Bấm vào người chơi khác → "Kết bạn", hoặc nhập tên bên dưới.')),
      h('div', { class: 'row add-row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('friendAdd', { name: inName.value }) }, 'Kết bạn'))));
  }

  // ----- Điểm danh
  renderGift() {
    const ck = S.me.checkin || { day: '', streak: 0 };
    const claimed = ck.day === vnDay(0);
    const nextStreak = claimed ? ck.streak : ck.day === vnDay(-1) ? ck.streak + 1 : 1;
    const cur = (nextStreak - 1) % 7;
    const label = (r) => {
      const parts = [];
      if (r.xu) parts.push(`${fmt(Math.round(r.xu * (1 + S.me.level / 20)))} xu`);
      if (r.luong) parts.push(`${r.luong} lượng`);
      for (const [id, q] of r.items || []) parts.push(`${S.G.items[id].name}${q > 1 ? ` x${q}` : ''}`);
      return parts;
    };
    const bigIcon = (r, i) => {
      if (r.items && r.items.length) return h('img', { src: iconURL(S.G.items[r.items[r.items.length - 1][0]].icon, i === 6 ? 4 : 0), alt: '' });
      if (r.luong) return h('img', { src: uiIconURL('luong'), alt: '', class: 'ui' });
      return h('img', { src: uiIconURL('xu'), alt: '', class: 'ui' });
    };
    const cells = S.G.checkin.map((r, i) => {
      const got = i < cur || (claimed && i === cur);
      return h('div', { class: `gift-day${got ? ' got' : ''}${i === cur && !claimed ? ' cur' : ''}${i === 6 ? ' big' : ''}` },
        h('div', { class: 'gd-head' }, `Ngày ${i + 1}`), h('div', { class: 'gd-icon' }, bigIcon(r, i)),
        ...label(r).map((t) => h('div', { class: 'tiny' }, t)), got ? h('div', { class: 'stamp' }, 'Đã nhận') : null);
    });
    this.frameWin('Điểm Danh Hằng Ngày', h('div', null,
      h('div', { class: 'muted' }, 'Đăng nhập liên tục để nhận quà lớn hơn. Chuỗi hiện tại: ', h('b', { class: 'gold' }, `${claimed ? ck.streak : Math.max(0, nextStreak - 1)} ngày`)),
      h('div', { class: 'gift-grid' }, ...cells)),
    h('button', { class: 'btn primary', disabled: claimed, onclick: () => this.net.send('checkin') }, claimed ? 'Đã điểm danh hôm nay' : 'Điểm danh nhận quà'));
  }

  // ----- Mã quà tặng (dùng ở Cài đặt và Hộp thư)
  codeBox() {
    const inp = h('input', {
      class: 'in code-in', maxlength: 24, placeholder: 'Nhập mã quà tặng', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
      'aria-label': 'Mã quà tặng', value: this.codeDraft || '',
    });
    const send = () => {
      const v = inp.value.trim();
      if (!v) return inp.focus();
      sfx('click');
      this.net.send('giftcode', { code: v });
    };
    inp.addEventListener('input', () => { this.codeDraft = inp.value; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    const r = this.codeRes;
    return h('div', { class: 'code-box' },
      h('div', { class: 'code-row' }, ico('gift'), inp, h('button', { class: 'btn primary', onclick: send }, 'Nhận quà')),
      r ? h('div', { class: `code-msg ${r.ok ? 'ok' : 'bad'}` }, r.msg) : null);
  }

  // ----- Hộp thư
  renderMail() {
    const data = this.mailData;
    if (!data) return this.frameWin('Hộp Thư', h('div', { class: 'muted' }, 'Đang tải thư...'));
    const list = data.list || [];
    const now = Date.now() + (S.skew || 0);
    const gift = (m) => !m.got && (m.xu > 0 || m.luong > 0 || m.items.length > 0);
    if (!list.some((m) => m.id === this.mailSel)) this.mailSel = list.length ? list[0].id : null;
    const sel = list.find((m) => m.id === this.mailSel) || null;
    // mở thư chưa đọc: báo server, đánh dấu ngay ở máy khách
    if (sel && !sel.read) {
      sel.read = true;
      this.net.send('mailRead', { id: sel.id });
    }
    const when = (t) => {
      const d = new Date(t + 7 * 3600000);
      const p2 = (x) => String(x).padStart(2, '0');
      return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
    };
    const items = list.map((m) => h('button', {
      class: `mail-item${m.id === this.mailSel ? ' sel' : ''}${m.read ? '' : ' unread'}${gift(m) ? ' has-gift' : ''}`,
      onclick: () => { sfx('click'); this.mailSel = m.id; this.refresh(); },
    },
    h('span', { class: 'mi-ico' }, ico(gift(m) ? 'gift' : 'mail')),
    h('span', { class: 'mi-main' }, h('b', null, m.title), h('small', null, `${m.from} · ${when(m.at)}`)),
    gift(m) ? h('span', { class: 'mi-badge' }, 'Quà') : null));
    let detail;
    if (!sel) {
      detail = h('div', { class: 'mail-empty' }, h('img', { src: uiIconURL('mail'), alt: '' }), h('p', null, 'Hộp thư trống.'),
        h('p', { class: 'muted tiny' }, 'Quà của Ban Quản Trị, quà giftcode và phần thưởng sự kiện khi hành trang đầy sẽ được gửi tới đây.'));
    } else {
      const att = [];
      if (sel.xu > 0) att.push(h('div', { class: 'mail-coin' }, h('img', { src: uiIconURL('xu'), alt: '' }), h('span', null, fmt(sel.xu)), h('small', null, 'xu')));
      if (sel.luong > 0) att.push(h('div', { class: 'mail-coin' }, h('img', { src: uiIconURL('luong'), alt: '' }), h('span', null, fmt(sel.luong)), h('small', null, 'lượng')));
      for (const it of sel.items) att.push(itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) }));
      const days = Math.max(0, Math.ceil(((data.keep || 30) * 86400000 - (now - sel.at)) / 86400000));
      const g = gift(sel);
      detail = h('div', { class: 'mail-detail' },
        h('div', { class: 'md-title' }, sel.title),
        h('div', { class: 'md-meta' }, h('span', null, 'Từ: ', h('b', null, sel.from)), h('span', null, when(sel.at)), h('span', { class: days <= 3 ? 'warn' : '' }, `tự xóa sau ${days} ngày`)),
        h('div', { class: 'md-body' }, sel.body || '(Không có nội dung)'),
        att.length ? h('div', { class: 'md-att' }, h('div', { class: 'sub-title' }, sel.got ? 'Quà đính kèm (đã nhận)' : 'Quà đính kèm'),
          h('div', { class: `md-att-grid${sel.got ? ' got' : ''}` }, ...att)) : null,
        h('div', { class: 'row md-btns' },
          g ? h('button', { class: 'btn primary', onclick: () => { sfx('click'); this.net.send('mailClaim', { id: sel.id }); } }, ico('gift'), 'Nhận quà')
            : att.length ? h('span', { class: 'md-stamp' }, 'Đã nhận') : null,
          h('button', { class: 'btn danger', disabled: g, title: g ? 'Nhận quà trước khi xóa' : 'Xóa thư', onclick: () => { sfx('click'); this.net.send('mailDel', { id: sel.id }); } }, 'Xóa')));
    }
    const unread = list.filter((m) => !m.read).length;
    const gifts = list.filter(gift).length;
    this.frameWin('Hộp Thư', h('div', { class: 'mail-wrap' },
      this.codeBox(),
      h('div', { class: 'mail-cols' },
        h('div', { class: 'mail-list' }, ...(items.length ? items : [h('div', { class: 'muted mail-none' }, 'Chưa có thư nào.')])),
        detail)),
    h('div', { class: 'row mail-foot' },
      h('span', { class: 'muted' }, `${list.length}/${data.max || 30} thư`, unread ? h('b', { class: 'gold' }, ` · ${unread} chưa đọc`) : null),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn', disabled: !list.some((m) => m.read && !gift(m)), onclick: () => { sfx('click'); this.net.send('mailDelRead'); } }, 'Xóa thư đã đọc'),
      h('button', { class: 'btn primary', disabled: !gifts, onclick: () => { sfx('click'); this.net.send('mailClaimAll'); } }, ico('gift'), gifts ? `Nhận tất cả (${gifts})` : 'Nhận tất cả')));
  }

  // Còn đứng gần Sứ Giả Lễ Hội đã mở cửa sổ (server nhận trong 130, lấy hẹp hơn vì vị trí máy khách đi trước)
  eventNear() {
    const g = this.game;
    const n = g && g.map && g.me ? g.map.npcs.find((o) => o.id === this.eventNpc) : null;
    return !!n && Math.abs(n.x - g.me.x) <= 120;
  }

  // ----- Sự kiện theo mùa: bảng đổi quà ở Sứ Giả Lễ Hội
  renderEvent() {
    const ss = activeSeason();
    if (!ss) {
      return this.frameWin('Lễ Hội', h('div', { class: 'empty-note' }, ico('festival'),
        h('div', null, h('p', null, 'Hiện không có lễ hội nào.'), h('p', { class: 'muted' }, 'Khi mùa lễ hội tới, Sứ Giả Lễ Hội ở mỗi làng sẽ mở quầy đổi quà.'))));
    }
    const td = S.G.items[ss.token];
    const have = countInv(ss.token);
    const used = S.me.season && S.me.season.id === ss.id ? S.me.season.ex || {} : {};
    const near = !!this.eventNpc;
    const vn = (t) => {
      const d = new Date(t + 7 * 3600000);
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    const left = Math.max(1, Math.ceil((ss.end - Date.now() - (S.skew || 0)) / 86400000));
    const tokImg = () => h('img', { class: 'ev-tok', src: iconURL(td.icon), alt: '' });
    const cards = ss.exchange.map((e) => {
      const r = e.reward;
      const n = used[e.id] || 0;
      const out = e.limit && n >= e.limit;
      const can = !out && have >= e.cost;
      let pic;
      if (r.items && r.items.length) {
        const [id, q] = r.items[r.items.length - 1];
        const it = { id, q, r: S.G.items[id].grade || 0 };
        pic = itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) });
      } else pic = h('div', { class: 'slot ev-money' }, h('img', { src: uiIconURL(r.luong ? 'luong' : 'xu'), alt: '' }));
      const ex = (k) => { sfx('click'); this.net.send('seasonEx', { npc: this.eventNpc, id: e.id, n: k }); };
      const many = !e.limit && have >= e.cost * 10;
      return h('div', { class: `ev-card${can ? ' can' : ''}${out ? ' out' : ''}` },
        pic,
        h('div', { class: 'ev-info' },
          h('div', { class: 'ev-name' }, e.label),
          h('div', { class: 'ev-cost' }, tokImg(), h('b', { class: have >= e.cost ? '' : 'bad' }, `${e.cost}`),
            h('span', { class: 'muted' }, e.limit ? ` · còn ${Math.max(0, e.limit - n)}/${e.limit} lượt` : ' · không giới hạn'),
            r.days ? h('span', { class: 'muted' }, ` · hạn ${r.days} ngày`) : null)),
        h('div', { class: 'ev-btns' },
          h('button', { class: 'btn primary small', disabled: !near || !can, onclick: () => ex(1) }, out ? 'Hết lượt' : 'Đổi'),
          many && near ? h('button', { class: 'btn small', onclick: () => ex(10) }, 'x10') : null));
    });
    const hero = h('div', { class: 'ev-hero' },
      h('div', { class: 'ev-moon' }, h('img', { src: uiIconURL('festival'), alt: '' })),
      h('div', { class: 'ev-hmain' },
        h('div', { class: 'evs-title' }, ss.name),
        h('div', { class: 'ev-date' }, `${vn(ss.start)} - ${vn(ss.end - 1)} · còn ${left} ngày`),
        h('div', { class: 'ev-desc' }, ss.desc)),
      h('div', { class: 'ev-have', title: td.name }, h('img', { src: iconURL(td.icon), alt: '' }), h('b', null, fmt(have)), h('small', null, td.name)));
    const foot = near ? h('span', { class: 'muted tiny' }, `Quái thường rơi ${td.name} khi cấp quái không thấp hơn cấp ngươi quá 10; boss rơi nhiều hơn.`)
      : h('div', { class: 'row ev-foot' }, h('span', { class: 'muted' }, 'Gặp Sứ Giả Lễ Hội ở làng để đổi quà.'),
        h('button', { class: 'btn small', onclick: () => { sfx('click'); this.travelVia('travelTo', { npcType: 'event', label: 'Sứ Giả Lễ Hội' }) && this.close(); } }, ico('path'), 'Tìm đường'));
    this.frameWin('Lễ Hội', h('div', { class: 'ev-wrap' }, hero, h('div', { class: 'ev-grid' }, ...cards)), foot);
  }

  // ----- Vòng quay may mắn
  renderWheel() {
    const W = S.G.wheel;
    const cv = h('canvas', { width: 520, height: 520, class: 'wheel' });
    this.wheelCanvas = cv;
    this.wheelRot = this.wheelRot || 0;
    this.drawWheel();
    const busy = !!this.wheelAnim;
    this.frameWin('Vòng Quay May Mắn', h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-box' }, h('div', { class: 'wheel-pin' }), cv),
      h('div', { class: 'wheel-side' },
        h('div', { class: 'muted' }, 'Quay bằng lượng có tỉ lệ ra quà quý cao hơn.'),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'xu' }) }, ico('xu'), `Quay (${fmt(W.cost.xu)} xu)`),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'luong' }) }, ico('luong'), `Quay (${W.cost.luong} lượng)`),
        h('div', { class: 'wheel-result' }, this.wheelResult || ''))),
    moneyLine());
  }

  drawWheel() {
    const cv = this.wheelCanvas;
    if (!cv) return;
    const g = cv.getContext('2d');
    const prizes = S.G.wheel.prizes;
    const n = prizes.length;
    const seg = (Math.PI * 2) / n;
    const S2 = cv.width / 240;
    const R = 100;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(S2, 0, 0, S2, 120 * S2, 120 * S2);
    // vành gỗ sơn mài + viền vàng
    g.beginPath();
    g.arc(0, 0, 117, 0, Math.PI * 2);
    g.fillStyle = '#120804';
    g.fill();
    const rim = g.createRadialGradient(0, 0, 100, 0, 0, 116);
    rim.addColorStop(0, '#5a140a');
    rim.addColorStop(0.5, '#a3301a');
    rim.addColorStop(1, '#5a140a');
    g.beginPath();
    g.arc(0, 0, 115, 0, Math.PI * 2);
    g.fillStyle = rim;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#f0c869';
    g.stroke();
    // đèn quanh vành
    const lit = Math.floor((this.wheelAnim ? performance.now() / 90 : performance.now() / 600)) % 2;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * 108, Math.sin(a) * 108, 3, 0, Math.PI * 2);
      g.fillStyle = i % 2 === lit ? '#fff7c2' : '#b07d33';
      g.fill();
    }
    for (let i = 0; i < n; i++) {
      const a0 = this.wheelRot + i * seg - Math.PI / 2;
      const grad = g.createRadialGradient(0, 0, 10, 0, 0, R);
      grad.addColorStop(0, '#fff8e6');
      grad.addColorStop(0.35, prizes[i].c);
      grad.addColorStop(1, shadeHex(prizes[i].c, i % 2 ? 0.62 : 0.75));
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, a0, a0 + seg);
      g.closePath();
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = '#3a1a08';
      g.lineWidth = 1.5;
      g.stroke();
      // chữ luôn đọc xuôi: nửa trái xoay ngược 180°
      const mid = a0 + seg / 2;
      const left = Math.cos(mid) < 0;
      g.save();
      g.rotate(left ? mid + Math.PI : mid);
      g.font = '15px VT323, monospace';
      g.textAlign = left ? 'left' : 'right';
      g.textBaseline = 'middle';
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(30,10,4,0.85)';
      const tx = left ? -(R - 7) : R - 7;
      g.strokeText(prizes[i].label, tx, 0);
      g.fillStyle = '#ffffff';
      g.fillText(prizes[i].label, tx, 0);
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.lineWidth = 2;
    g.strokeStyle = '#f0c869';
    g.stroke();
    // trục giữa
    const hub = g.createRadialGradient(-4, -4, 2, 0, 0, 18);
    hub.addColorStop(0, '#fff4c6');
    hub.addColorStop(0.5, '#e2ae4f');
    hub.addColorStop(1, '#7a4a12');
    g.beginPath();
    g.arc(0, 0, 17, 0, Math.PI * 2);
    g.fillStyle = hub;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#120804';
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 7, 0, Math.PI * 2);
    g.fillStyle = '#b52a18';
    g.fill();
    g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  onSpin(m) {
    const n = S.G.wheel.prizes.length;
    const seg = (Math.PI * 2) / n;
    const target = -(m.idx + 0.5) * seg;
    const base = this.wheelRot || 0;
    const final = target + Math.PI * 2 * Math.ceil((base + Math.PI * 8 - target) / (Math.PI * 2));
    const start = performance.now();
    const dur = 2600;
    this.wheelResult = '';
    if (this.winName !== 'wheel') this.open('wheel');
    else this.refresh();
    let lastSeg = -1;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.wheelRot = base + (final - base) * e;
      const sIdx = Math.floor(this.wheelRot / seg);
      if (sIdx !== lastSeg) {
        lastSeg = sIdx;
        sfx('spin');
      }
      this.drawWheel();
      if (t < 1) this.wheelAnim = requestAnimationFrame(step);
      else {
        this.wheelAnim = null;
        this.wheelRot = final % (Math.PI * 2);
        this.wheelResult = `Bạn nhận được: ${m.label}!`;
        this.toast(this.wheelResult, 'reward');
        sfx('quest');
        if (this.winName === 'wheel') this.refresh();
      }
    };
    this.wheelAnim = requestAnimationFrame(step);
  }

  // ----- Giao dịch
  renderTrade() {
    const t = this.trade;
    if (!t) return this.close(true);
    const mine = t.mine;
    const theirs = t.theirs;
    const offer = (side) => h('div', { class: 'trade-items' }, ...side.items.filter(Boolean).map((it) => itemIcon(it, { onclick: () => this.showItem(it, { from: 'view' }) })),
      ...Array.from({ length: Math.max(0, 5 - side.items.length) }, () => h('div', { class: 'slot empty' })));
    const state = (side) => [side.lock ? h('span', { class: 'badge lock' }, 'Đã khóa') : null, side.ok ? h('span', { class: 'badge ok' }, 'Đồng ý') : null];
    const xuIn = h('input', { type: 'number', min: 0, value: this.tradeXu || 0, class: 'in short', disabled: mine.lock });
    const pushSet = () => this.net.send('tradeSet', { slots: [...this.tradeSel], xu: +xuIn.value || 0 });
    // giữ số đang gõ: cửa sổ dựng lại mỗi khi bên kia đổi đồ, không được xóa mất số xu đang nhập
    xuIn.oninput = () => { this.tradeXu = +xuIn.value || 0; };
    xuIn.onchange = () => { this.tradeXu = +xuIn.value || 0; pushSet(); };
    const inv = this.invGrid((it, i) => {
      if (mine.lock) return;
      if (this.tradeSel.has(i)) this.tradeSel.delete(i);
      else if (this.tradeSel.size < 10) this.tradeSel.add(i);
      pushSet();
    }, this.tradeSel);
    this.frameWin(`Giao dịch với ${t.with}`, h('div', { class: 'trade-wrap' },
      h('div', { class: `trade-col${mine.lock ? ' locked' : ''}` }, h('div', { class: 'sub-title' }, 'Bạn đưa ', ...state(mine)), offer(mine), h('div', { class: 'row xu' }, ico('xu'), 'Xu: ', xuIn)),
      h('div', { class: `trade-col${theirs.lock ? ' locked' : ''}` }, h('div', { class: 'sub-title' }, `${t.with} đưa `, ...state(theirs)), offer(theirs), h('div', { class: 'row xu' }, ico('xu'), `Xu: ${fmt(theirs.xu)}`)),
      h('div', { class: 'trade-inv' }, h('div', { class: 'muted tiny' }, 'Bấm vào vật phẩm trong túi để thêm/bỏ khỏi giao dịch'), inv)),
    h('div', { class: 'row' },
      h('button', { class: 'btn', disabled: mine.lock, onclick: () => this.net.send('tradeLock') }, 'Khóa'),
      h('button', { class: 'btn primary', disabled: !mine.lock || !theirs.lock || mine.ok, onclick: () => this.net.send('tradeOk') }, 'Đồng ý'),
      h('button', { class: 'btn danger', onclick: () => this.net.send('tradeCancel') }, 'Hủy')));
  }

  renderInspect() {
    const d = this.inspectData;
    if (!d) return;
    const cls = S.G.classes[d.cls];
    this.frameWin(`Thông tin ${d.name}`, h('div', { class: 'inspect-wrap' },
      h('div', { class: 'tags' }, h('span', { class: 'tag' }, `Cấp ${d.lv}`), h('span', { class: 'tag', style: { color: ELEMENT_COLORS[cls.element] } }, `Phái ${cls.name}`),
        d.clan ? h('span', { class: 'tag clan' }, `Gia tộc ${d.clan}`) : null, d.pk ? h('span', { class: 'tag bad' }, `Hiếu chiến ${d.pk}`) : null),
      h('div', { class: 'inspect-cols' },
        h('div', null, this.eqTabs(), this.equipGrid(d.equip, false, { silhouette: true, cls: d.cls, name: d.name, el: cls.element, weaponType: cls.weapon })),
        h('div', { class: 'sec grid2' }, ...[['Sinh lực', d.s.maxHp], ['Chakra', d.s.maxMp], ['Tấn công', d.s.atk], ['Phòng thủ', d.s.def], ['Chí mạng', `${d.s.crit}%`], ['Né tránh', `${d.s.dodge}%`]]
          .map(([a, b]) => h('div', { class: 'kv' }, h('span', null, a), h('b', null, typeof b === 'number' ? fmt(b) : b)))))));
  }

  // ---------------- Hội thoại NPC
  showDialog(m) {
    this.closeDialog();
    const npc = this.game && this.game.map ? this.game.map.npcs.find((n) => n.id === m.npc) : null;
    const por = h('canvas', { width: 84, height: 84 });
    if (npc && S.G.npcTypes[npc.type]) {
      const nt = S.G.npcTypes[npc.type];
      drawPortrait(por.getContext('2d'), {
        pal: [nt.look[0], nt.look[2], nt.look[1]], noMask: true, name: npc.name, npcType: npc.type, weaponType: null,
        look: { h: npc.type === 'elder' ? 4 : -1 }, bg: false,
      });
    }
    const box = h('div', { class: 'dialog' });
    box.appendChild(h('div', { class: 'dlg-por' }, por));
    box.appendChild(h('div', { class: 'dlg-head' }, h('span', { class: 'dlg-name' }, m.name), h('span', { class: 'dlg-title' }, m.title),
      h('button', { class: 'x', title: 'Đóng', 'aria-label': 'Đóng', onclick: () => this.closeDialog() }, ico('close'))));
    box.appendChild(h('div', { class: 'dlg-text' }, m.text));
    const opts = h('div', { class: 'dlg-opts' });
    for (const o of m.opts) {
      if (o.input) {
        const inp = h('input', { class: 'in', placeholder: o.input, maxlength: 12 });
        opts.appendChild(inp);
        opts.appendChild(h('button', { class: 'btn primary', onclick: () => this.net.send('npcAct', { id: m.npc, a: o.a, text: inp.value }) }, o.label));
      } else {
        opts.appendChild(h('button', { class: 'btn primary', onclick: () => this.net.send('npcAct', { id: m.npc, a: o.a }) }, o.label));
      }
    }
    opts.appendChild(h('button', { class: 'btn', onclick: () => this.closeDialog() }, 'Đóng'));
    box.appendChild(opts);
    $('#dialogs').appendChild(box);
    this.dialogEl = box;
    document.body.classList.add('dlg-open');
  }

  closeDialog() {
    if (this.dialogEl) this.dialogEl.remove();
    this.dialogEl = null;
    document.body.classList.remove('dlg-open');
  }

  // ---------------- Lời mời
  showInvite(m) {
    const text = {
      party: `${m.from} mời bạn vào nhóm.`, trade: `${m.from} muốn giao dịch với bạn.`, duel: `${m.from} thách đấu bạn!`, clan: `${m.from} mời bạn vào gia tộc ${m.clan}.`,
      friend: `${m.from} muốn kết bạn với bạn.`,
    }[m.kind];
    const title = { party: 'Lời mời nhóm', trade: 'Giao dịch', duel: 'Thách đấu', clan: 'Lời mời gia tộc', friend: 'Kết bạn' }[m.kind] || 'Lời mời';
    const icon = { party: 'party', trade: 'xu', duel: 'pk', clan: 'clan', friend: 'friends' }[m.kind] || 'party';
    const accept = { party: 'partyAccept', trade: 'tradeAccept', duel: 'duelAccept', clan: 'clanAccept', friend: 'friendAccept' }[m.kind];
    sfx('quest');
    const el = h('div', { class: `invite k-${m.kind}` }, h('div', { class: 'inv-icon' }, ico(icon)),
      h('div', { class: 'inv-body' }, h('div', { class: 'inv-title' }, title), h('div', null, text), h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { this.net.send(accept, { from: m.from }); el.remove(); } }, 'Đồng ý'),
        h('button', { class: 'btn', onclick: () => { this.net.send('decline', { kind: m.kind, from: m.from }); el.remove(); } }, 'Từ chối'))),
      h('i', { class: 'inv-timer' }));
    $('#invites').appendChild(el);
    setTimeout(() => el.remove(), 30000);
  }

  // ---------------- Menu người chơi
  playerMenu(info, x, y) {
    this.hideMenu();
    const send = (t, d) => { this.net.send(t, d); this.hideMenu(); };
    const cls = S.G.classes[info.cls];
    const it = (icon, label, fn) => h('button', { onclick: fn }, ico(icon), h('span', null, label));
    const menu = h('div', { class: 'pmenu', style: { left: `${Math.max(4, Math.min(x, window.innerWidth - 200))}px`, top: `${Math.max(4, Math.min(y, window.innerHeight - 290))}px` } },
      h('div', { class: 'pm-head' }, h('b', null, info.name), h('span', null, ` Lv${info.lv} `), h('span', { style: { color: ELEMENT_COLORS[cls.element] } }, cls.name)),
      it('char', 'Xem thông tin', () => send('inspect', { name: info.name })),
      it('party', 'Mời vào nhóm', () => send('partyInvite', { name: info.name })),
      it('friends', 'Kết bạn', () => send('friendAdd', { name: info.name })),
      it('xu', 'Giao dịch', () => send('tradeReq', { name: info.name })),
      it('pk', 'Thách đấu', () => send('duelReq', { name: info.name })),
      it('chat', 'Nhắn tin', () => { this.pmTo = info.name; this.setChatCh('pm'); this.focusChat(); this.hideMenu(); }),
      S.me.clan && S.me.clan.rank !== 'member' ? it('clan', 'Mời vào gia tộc', () => send('clanInvite', { name: info.name })) : null,
      it('close', 'Đóng', () => this.hideMenu()));
    document.body.appendChild(menu);
    this.menuEl = menu;
  }

  hideMenu() {
    if (this.menuEl) this.menuEl.remove();
    this.menuEl = null;
  }

  // ---------------- Trọng thương
  showDeath(m) {
    this.hideDeath();
    this.deathShown = true;
    const cards = S.inv.reduce((n, x) => n + (x && x.id === 'revive_card' ? x.q : 0), 0);
    const el = h('div', { class: 'death' }, h('div', { class: 'death-box' },
      h('div', { class: 'death-title' }, 'Trọng Thương'),
      h('div', { class: 'death-sub' }, m.by ? `Bạn đã bị ${m.by} hạ gục.` : 'Bạn đã bị trọng thương!'), m.lost ? h('div', { class: 'bad' }, `Mất ${fmt(m.lost)} kinh nghiệm.`) : null,
      h('div', { class: 'row death-btns' },
        h('button', { class: 'btn primary', onclick: () => this.net.send('revive', { mode: 'town' }) }, 'Về làng'),
        h('button', { class: 'btn', onclick: () => this.net.send('revive', { mode: 'here' }) }, cards ? `Hồi sinh tại chỗ (thẻ: ${cards})` : 'Hồi sinh tại chỗ (1 lượng)'))));
    document.body.appendChild(el);
    this.deathEl = el;
  }

  hideDeath() {
    this.deathShown = false;
    if (this.deathEl) this.deathEl.remove();
    this.deathEl = null;
  }

  reset() {
    this.closeAll();
    this.hideDeath();
    $('#hud').classList.add('hidden');
    this.chat = [];
    this.renderChat();
    S.party = { id: 0, members: [] };
    this.renderPartyHud();
    S.event = null;
    this.evResult = null;
    this.setEvent(null);
    // dữ liệu riêng của nhân vật trước: không để lộ sang nhân vật sau (gói season/mail mới sẽ tới khi vào game)
    S.seasonId = null;
    this.mailData = null;
    this.mailSel = null;
    this.mailUnread = 0;
    this.codeRes = null;
    this.codeDraft = '';
    this.eventNpc = null;
    S.arena = null;
    this.arenaRes = null;
    this.setArena(null);
  }
}

function shadeHex(hex, f = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`;
}
