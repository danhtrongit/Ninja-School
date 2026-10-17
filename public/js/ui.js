// Giao diện người dùng (DOM): HUD, cửa sổ, hội thoại, chat
import { S, fmt, skillVal, itemStats, itemName, rarityColor, saveSettings } from './store.js';
import { drawPortrait, drawNinja, ELEMENT_COLORS } from './sprites.js';
import { iconURL, skillIconURL, uiIconURL } from './icons.js';
import { sfx } from './sound.js';

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
const SLOT_ICON = { weapon: 'sword', hat: 'hat', armor: 'armor', gloves: 'gloves', pants: 'pants', shoes: 'shoes', necklace: 'necklace', ring: 'ring', amulet: 'amulet' };
// Vị trí ô trang bị quanh hình nhân vật: [cột, hàng]
const DOLL_POS = { hat: [1, 1], armor: [1, 2], gloves: [1, 3], pants: [1, 4], weapon: [3, 1], necklace: [3, 2], ring: [3, 3], amulet: [3, 4], shoes: [2, 4] };
const vnDay = (off = 0) => new Date(Date.now() + 7 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);

// Icon giao diện (ảnh pixel)
const ico = (name, cls) => h('img', { class: `ico${cls ? ` ${cls}` : ''}`, src: uiIconURL(name), alt: '', draggable: 'false' });

function elColorOfSkill(sk) {
  const c = S.G.classes[sk.cls];
  return ELEMENT_COLORS[c ? c.element : 'fire'] || '#8d6e63';
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
  if (it.p) el.appendChild(h('span', { class: 'plus' }, `+${it.p}`));
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
      this.updateStatus();
      if (lvUp || ['char', 'skill', 'quest', 'gift', 'wheel', 'shop'].includes(this.winName)) this.refresh();
    });
    n.on('inv', (m) => {
      S.inv = m.inv;
      S.equip = m.equip;
      this.updatePotions();
      if (['inv', 'upgrade', 'shop', 'trade'].includes(this.winName)) this.refresh();
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
        this.open('upgrade');
      }
      if (m.ui === 'clan') {
        this.net.send('clanInfo');
        this.open('clan');
      }
      this.closeDialog();
    });
    n.on('upgradeResult', (m) => {
      this.toast(m.ok ? `Cường hóa thành công! ${m.name} +${m.plus}` : `Cường hóa thất bại! ${m.name} còn +${m.plus}`, m.ok ? 'reward' : 'warn');
      this.upgradeFlash = m.ok ? 'ok' : 'fail';
      this.refresh();
    });
    n.on('party', (m) => {
      S.party = { id: m.id || 0, members: m.members || [] };
      this.renderPartyHud();
      if (this.winName === 'party') this.refresh();
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
      ['inv', 'bag', 'Túi đồ', 'B'], ['char', 'char', 'Nhân vật', 'C'], ['skill', 'skill', 'Kỹ năng', 'V'], ['quest', 'quest', 'Nhiệm vụ', 'N'],
      ['party', 'party', 'Nhóm', 'P'], ['friends', 'friends', 'Bạn bè', 'O'], ['clan', 'clan', 'Gia tộc', 'G'], ['rank', 'rank', 'Xếp hạng', 'R'], ['map', 'map', 'Bản đồ', 'M'],
      ['gift', 'gift', 'Điểm danh hằng ngày', ''], ['wheel', 'wheel', 'Vòng quay may mắn', ''], ['settings', 'settings', 'Cài đặt', ''],
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
    $('#hud-quest').onclick = () => this.toggle('quest');
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
      b.title = sid ? `${S.G.skills[sid].name} Lv${me.skills[sid] || 0} (${i + 1})` : 'Trống - mở Kỹ năng (V) để gán';
      b.style.setProperty('--el', elc);
      b.classList.toggle('empty', !sid);
    });
    if (this.basicBtn) this.basicBtn.style.setProperty('--el', elc);
    if (this.pkBtn) this.pkBtn.classList.toggle('on', !!me.pkMode);
    if (this.giftBtn) this.giftBtn.classList.toggle('gift', !me.checkin || me.checkin.day !== vnDay());
    if (this.menuBtns) {
      this.menuBtns.char.classList.toggle('dot', me.potential > 0);
      this.menuBtns.skill.classList.toggle('dot', me.skillPoints > 0);
    }
    // Buff
    const bf = $('#hud-buffs');
    bf.innerHTML = '';
    for (const b of me.buffs) {
      const sk = S.G.skills[b.k];
      let img = null;
      if (sk) img = h('img', { src: skillIconURL(sk, b.k, elColorOfSkill(sk)), alt: '' });
      else if (S.G.items[b.k]) img = h('img', { src: iconURL(S.G.items[b.k].icon), alt: '' });
      bf.appendChild(h('div', { class: 'buff', 'data-until': b.until - me.now + Date.now(), title: b.name }, img || h('b', null, b.name.slice(0, 2)), h('small')));
    }
    if (me.pk > 0) bf.appendChild(h('div', { class: 'buff pk', title: `Điểm hiếu chiến: ${me.pk}` }, h('img', { src: uiIconURL('pk'), alt: '' }), h('small', null, me.pk)));
    this.updateQuestTracker();
    if (this.deathShown && !me.dead) this.hideDeath();
  }

  updateQuestTracker() {
    const q = S.me.quest;
    const d = S.me.daily;
    const box = $('#hud-quest');
    box.innerHTML = '';
    const rows = [];
    if (q && !q.done) {
      let state = '';
      let bar = null;
      let done = false;
      if (q.st === 0) state = S.me.level >= q.req ? 'Gặp Trưởng Làng nhận' : `Cần cấp ${q.req}`;
      else if (q.st === 2 || q.prog >= q.n) {
        state = 'Hoàn thành - về gặp Trưởng Làng';
        done = true;
      } else {
        state = q.desc || `Tiến độ ${q.prog}/${q.n}`;
        bar = miniBar(q.prog, q.n);
      }
      rows.push(h('div', { class: `qt main${done ? ' done' : ''}` }, h('b', null, q.name), h('div', { class: `qs${bar ? ' one' : ''}` }, state), bar));
    }
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      const done = d.task.prog >= d.task.n;
      rows.push(h('div', { class: `qt daily${done ? ' done' : ''}` }, h('b', null, 'Hằng ngày'), h('div', { class: 'qs one' }, done ? 'Xong - gặp Tiểu Nhị' : `Diệt ${mn.name}`),
        done ? null : miniBar(d.task.prog, d.task.n, 'blue')));
    }
    if (!rows.length) return;
    box.appendChild(h('div', { class: 'qt-head' }, ico('quest'), h('span', null, 'Nhiệm vụ')));
    rows.forEach((r) => box.appendChild(r));
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
    $('#map-info').textContent = map.town ? 'Khu an toàn' : map.pvp ? 'Khu PK tự do' : map.instance ? 'Phó bản' : map.lv ? `Quái cấp ${map.lv[0]}-${map.lv[1]}` : '';
    const hm = $('#hud-map');
    hm.classList.toggle('town', !!map.town);
    hm.classList.toggle('pvp', !!map.pvp);
    sfx('portal');
    this.closeDialog();
    this.mmStatic = null;
    this.drawMinimap(true);
    this.toast(map.name, 'map');
    if (this.winName === 'shop' || this.winName === 'upgrade') this.close();
  }

  updateTarget(t) {
    const box = $('#hud-target');
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
    document.querySelectorAll('#hud-buffs .buff[data-until]').forEach((el) => {
      const left = Math.max(0, Math.ceil((+el.dataset.until - Date.now()) / 1000));
      el.querySelector('small').textContent = left > 60 ? `${Math.ceil(left / 60)}p` : `${left}s`;
      el.classList.toggle('ending', left <= 5);
    });
    if (this.dollCv && this.winName === 'inv' && this.dollCv.isConnected) this.drawDoll(now / 1000);
    if (now - (this.lastMini || 0) > 200) {
      this.lastMini = now;
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
    const win = h('div', { class: `win win-${name}` });
    this.win = win;
    $('#windows').appendChild(win);
    document.body.classList.add('win-open');
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
    document.body.classList.remove('win-open');
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
    }[this.winName];
    if (fn) fn.call(this);
    const b = this.win.querySelector('.win-body');
    if (b) b.scrollTop = scroll;
  }

  // ----- Túi đồ
  // Ô trang bị xếp quanh hình nhân vật (fig: tùy chọn vẽ nhân vật)
  equipGrid(equip, clickable, fig) {
    const grid = h('div', { class: 'doll' });
    const used = new Set();
    for (const s of S.G.slots) {
      const it = equip[s];
      const pos = DOLL_POS[s];
      const cell = h('div', { class: 'eq-cell', style: pos && !used.has(pos.join()) ? { gridColumn: pos[0], gridRow: pos[1] } : null },
        h('label', null, S.G.slotNames[s]));
      if (pos) used.add(pos.join());
      if (it) cell.insertBefore(itemIcon(it, { onclick: clickable ? () => this.showItem(it, { from: 'eq', slot: s }) : () => this.showItem(it, { from: 'view' }) }), cell.firstChild);
      else cell.insertBefore(emptySlot(s), cell.firstChild);
      grid.appendChild(cell);
    }
    const cv = h('canvas', { width: 96, height: 120 });
    grid.appendChild(h('div', { class: 'doll-fig' }, cv));
    if (fig && fig.silhouette) {
      // không có dữ liệu ngoại hình: vẽ bóng nhân vật theo phái
      const ctx = cv.getContext('2d');
      drawNinja(ctx, cv.width / 2, cv.height - 9, { ...fig, dir: 1, anim: 'idle', t: 0, scale: 3, noShadow: true });
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(26,14,8,0.82)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (fig) {
      this.dollCv = cv;
      this.dollFig = fig;
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
    const look = o.live && S.me ? S.me.look : o.look;
    drawNinja(ctx, cv.width / 2, cv.height - 9, { ...o, look, dir: 1, anim: 'idle', t, scale: 3 });
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
      h('div', { class: 'inv-left' }, h('div', { class: 'sub-title' }, 'Trang bị'), this.equipGrid(S.equip, true, fig)),
      h('div', { class: 'inv-right' },
        h('div', { class: 'row between inv-top' }, h('span', { class: 'sub-title' }, `Hành trang ${S.inv.length - free}/${S.inv.length}`), h('button', { class: 'btn small', onclick: () => this.net.send('sortInv') }, 'Sắp xếp')),
        this.invGrid((it, i) => this.showItem(it, { from: 'inv', slot: i })))),
    moneyLine());
  }

  itemDetail(it, extra) {
    const def = S.G.items[it.id];
    const box = h('div', { class: 'item-detail' });
    box.appendChild(h('div', { class: 'id-head' }, h('div', { class: `slot big r${it.r || 0}` }, h('img', { src: iconURL(def.icon, it.r) })),
      h('div', null, h('div', { class: 'id-name', style: { color: rarityColor(it) } }, itemName(it)),
        h('div', { class: 'muted' }, def.type === 'equip' ? `${S.G.slotNames[def.slot]} · ${S.G.rarity[it.r || 0].name}` : def.desc || ''))));
    const req = [];
    if (def.lv > 1) req.push(h('span', { class: def.lv > S.me.level ? 'bad' : '' }, `Yêu cầu cấp ${def.lv}`));
    if (def.cls) req.push(h('span', { class: def.cls !== S.me.cls ? 'bad' : '' }, `Phái ${S.G.classes[def.cls].name}`));
    if (req.length) box.appendChild(h('div', { class: 'id-req' }, ...req));
    if (def.type === 'equip') {
      const st = itemStats({ id: it.id, p: it.p });
      const stats = h('div', { class: 'id-stats' });
      for (const k in st) stats.appendChild(h('div', { class: 'stat' }, `${S.G.statLabels[k]}: `, h('b', null, `+${st[k]}`)));
      for (const [k, v] of it.o || []) stats.appendChild(h('div', { class: 'stat opt', style: { color: rarityColor(it) } }, `✦ ${S.G.statLabels[k]} +${v}`));
      box.appendChild(stats);
      if (def.desc) box.appendChild(h('div', { class: 'muted' }, def.desc));
    }
    if (it.q > 1) box.appendChild(h('div', { class: 'muted' }, `Số lượng: ${it.q}`));
    if (extra) box.appendChild(extra);
    return box;
  }

  showItem(it, ctx) {
    this.hideItem();
    const def = S.G.items[it.id];
    const btns = h('div', { class: 'row wrap pop-btns' });
    const add = (label, fn, cls) => btns.appendChild(h('button', { class: `btn ${cls || ''}`, onclick: () => { fn(); this.hideItem(); } }, label));
    if (ctx.from === 'inv') {
      if (def.type === 'equip') add('Trang bị', () => this.net.send('equip', { slot: ctx.slot }), 'primary');
      else if (['potion', 'scroll', 'chest'].includes(def.type)) add('Sử dụng', () => this.net.send('useItem', { slot: ctx.slot }), 'primary');
      add('Hủy', () => {
        if (confirm(`Hủy ${itemName(it)}? Không thể khôi phục.`)) this.net.send('discard', { slot: ctx.slot });
      }, 'danger');
    }
    if (ctx.from === 'eq') add('Tháo ra', () => this.net.send('unequip', { slot: ctx.slot }), 'primary');
    if (ctx.from === 'sell') {
      const price = this.sellPrice(it);
      const qty = h('input', { type: 'number', min: 1, max: it.q, value: it.q, class: 'in qty-in' });
      if (it.q > 1) btns.appendChild(qty);
      btns.appendChild(h('button', { class: 'btn primary', onclick: () => {
        this.net.send('sell', { npc: this.shop.npc, slot: ctx.slot, qty: +qty.value || 1 });
        this.hideItem();
      } }, `Bán (${fmt(price)} xu/cái)`));
    }
    add('Đóng', () => {});
    const pop = h('div', { class: `item-pop r${it.r || 0}` }, this.itemDetail(it), btns);
    pop.addEventListener('click', (e) => e.stopPropagation());
    $('#windows').appendChild(pop);
    this.itemPop = pop;
  }

  hideItem() {
    if (this.itemPop) this.itemPop.remove();
    this.itemPop = null;
  }

  sellPrice(it) {
    const def = S.G.items[it.id];
    let base = def.price || (def.priceLuong ? 50 : 1);
    if (def.type === 'equip') base = base * (1 + (it.r || 0) * 0.5) * (1 + (it.p || 0) * 0.3);
    return Math.max(1, Math.floor(base * 0.25));
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
      h('div', { class: 'char-cols' },
        h('div', { class: 'sec' }, h('div', { class: 'sec-title row between' }, h('span', null, 'Điểm tiềm năng'), h('span', { class: `pts${me.potential ? ' good' : ''}` }, `Còn ${me.potential}`)),
          ...['str', 'agi', 'int', 'vit'].map((k) => h('div', { class: 'stat-block' }, statRow(k), h('div', { class: 'muted tiny' }, desc[k])))),
        h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Chỉ số chiến đấu'),
          h('div', { class: 'grid2' }, ...derived.map(([a, b, c]) => h('div', { class: `kv${c ? ` k-${c}` : ''}` }, h('span', null, a), h('b', null, b))))))),
    h('button', { class: 'btn small', onclick: () => {
      if (confirm('Tẩy toàn bộ điểm tiềm năng với giá 20 lượng?')) this.net.send('resetStats');
    } }, 'Tẩy điểm (20 lượng)'));
  }

  // ----- Kỹ năng
  renderSkills() {
    const me = S.me;
    const list = Object.keys(S.G.skills).filter((id) => S.G.skills[id].cls === me.cls);
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
      const row = h('div', { class: `skill-row${lv || sk.basic ? '' : ' locked'}${sk.basic ? ' basic' : ''}` },
        h('div', { class: 'sk-icon', style: { '--el': elColorOfSkill(sk) } }, skImg(sid), !sk.basic && lv ? h('span', { class: 'sk-lv' }, lv) : null),
        h('div', { class: 'sk-info' },
          h('div', { class: 'sk-name' }, h('b', null, sk.name), sk.basic ? h('span', { class: 'tag' }, 'Cơ bản') : h('span', { class: 'muted' }, ` Lv${lv}/${S.G.skillMax}`), !lv && !sk.basic ? h('span', { class: 'warn' }, ` · Mở ở cấp ${sk.req}`) : ''),
          h('div', { class: 'muted tiny' }, sk.desc || 'Đòn đánh cơ bản.'),
          h('div', { class: 'tiny sk-meta' }, info.join(' · '))));
      if (!sk.basic) {
        const act = h('div', { class: 'sk-act' });
        if (lv < S.G.skillMax) {
          act.appendChild(h('button', { class: 'btn small primary', disabled: me.skillPoints < 1 || me.level < next, title: `Cần cấp ${next}`,
            onclick: () => this.net.send('learnSkill', { sid }) }, lv ? `Nâng (cấp ${next})` : `Học (cấp ${next})`));
        }
        if (lv) {
          const slots = h('div', { class: 'hk-slots' });
          for (let i = 0; i < (S.G.hotbar || 5); i++) {
            slots.appendChild(h('button', { class: `hk${me.hotbar[i] === sid ? ' on' : ''}`, title: `Gán vào ô ${i + 1}`, onclick: () => this.net.send('hotbar', { i, sid: me.hotbar[i] === sid ? null : sid }) }, String(i + 1)));
          }
          act.appendChild(slots);
        }
        row.appendChild(act);
      }
      return row;
    });
    this.frameWin('Kỹ Năng', h('div', null, h('div', { class: 'row between sk-top' }, h('span', { class: 'muted' }, 'Bấm số 1-6 để gán vào thanh kỹ năng'), h('span', { class: `pts${me.skillPoints ? ' good' : ''}` }, `Điểm kỹ năng: ${me.skillPoints}`)), ...rows));
  }

  // ----- Nhiệm vụ
  renderQuest() {
    const q = S.me.quest;
    const d = S.me.daily;
    const parts = [];
    if (q && !q.done) {
      let state;
      let bar = null;
      if (q.st === 0) state = S.me.level >= q.req ? 'Chưa nhận - hãy gặp Trưởng Làng.' : `Cần đạt cấp ${q.req} để nhận.`;
      else if (q.st === 2 || q.prog >= q.n) state = 'Đã hoàn thành - về gặp Trưởng Làng nhận thưởng.';
      else {
        state = 'Đang thực hiện';
        bar = miniBar(q.prog, q.n);
      }
      parts.push(h('div', { class: 'sec quest-card main' }, h('div', { class: 'qc-tag' }, `Chính tuyến ${q.i + 1}/${S.G.quests.length}`), h('div', { class: 'qc-name' }, q.name), h('div', null, q.desc), bar, h('div', { class: 'good' }, state)));
    } else parts.push(h('div', { class: 'sec quest-card main' }, h('div', { class: 'qc-name' }, 'Đã hoàn thành toàn bộ nhiệm vụ chính!')));
    const done = d && d.day === vnDay() ? d.done : 0;
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      parts.push(h('div', { class: 'sec quest-card daily' }, h('div', { class: 'qc-tag' }, `Hằng ngày ${done}/20`), h('div', { class: 'qc-name' }, `Tiêu diệt ${d.task.n} ${mn.name} (Lv${mn.lv})`), miniBar(d.task.prog, d.task.n, 'blue')));
    } else parts.push(h('div', { class: 'sec quest-card daily' }, h('div', { class: 'qc-tag' }, `Hằng ngày ${done}/20`), h('div', null, 'Gặp Tiểu Nhị ở làng để nhận nhiệm vụ diệt quái hằng ngày. Mỗi 5 nhiệm vụ được thêm Rương Báu.')));
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
    const tabs = h('div', { class: 'tabs' }, ...[['level', 'Cấp độ'], ['clan', 'Gia tộc'], ['kills', 'Diệt quái']].map(([k, l]) =>
      h('button', { class: `tab${this.rankTab === k ? ' on' : ''}`, onclick: () => { this.rankTab = k; this.refresh(); } }, l)));
    let body = h('div', { class: 'muted' }, 'Đang tải...');
    if (d) {
      const list = d[this.rankTab] || [];
      const no = (i) => h('span', { class: `rank-no n${i < 3 ? i + 1 : 0}` }, i + 1);
      body = h('div', { class: 'list rank-list' }, ...list.map((r, i) => {
        if (this.rankTab === 'clan') return h('div', { class: 'list-row' }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Tộc trưởng ${r.leader} · ${r.members} người · Lực chiến ${r.power}`));
        if (this.rankTab === 'kills') return h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name} · `, h('b', { class: 'gold' }, fmt(r.kills)), ' quái'));
        return h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, no(i), h('span', { class: 'lr-main' }, h('b', null, r.name)), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name}${r.clan ? ` [${r.clan}]` : ''}`));
      }));
      if (!list.length) body = h('div', { class: 'muted' }, 'Chưa có dữ liệu.');
    }
    this.frameWin('Bảng Xếp Hạng', h('div', null, tabs, body), h('span', { class: 'muted tiny' }, 'Cập nhật mỗi phút'));
  }

  // ----- Bản đồ thế giới
  renderWorldMap() {
    const maps = Object.values(S.G.maps).filter((m) => !m.instance);
    const cur = this.game.map.id;
    const order = ['fire_field', 'v_fire', 'arena', 'bamboo', 'sakura_garden', 'v_water', 'water_lake', 'coast', 'bat_cave', 'v_wind', 'wind_hill', 'wasteland', 'ancient_ruins', 'misty_valley',
      'snow_mountain', 'ice_peak', 'crystal_cave', 'demon_forest', 'demon_cave', 'hell_gate', 'heaven', 'abyss', 'dragon_palace'];
    maps.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    this.frameWin('Bản Đồ Thế Giới', h('div', { class: 'world-map' }, ...maps.map((m) => {
      const kind = m.town ? 'town' : m.pvp ? 'pvp' : 'field';
      return h('div', { class: `wm ${kind}${m.id === cur ? ' cur' : ''}` },
        h('div', { class: 'wm-top' }, h('b', null, m.name), m.id === cur ? h('span', { class: 'here' }, 'Bạn ở đây') : null),
        h('span', { class: 'wm-kind' }, m.town ? 'Làng' : m.pvp ? 'PK tự do' : m.lv ? `Quái Lv ${m.lv[0]}-${m.lv[1]}` : ''),
        h('span', { class: 'tiny muted' }, `→ ${m.portals.map((p) => S.G.maps[p.to].name).join(', ')}`));
    })),
    h('span', { class: 'muted tiny' }, 'Phu Xe ở mỗi làng giúp đi nhanh giữa 3 làng.'));
  }

  // ----- Cài đặt
  renderSettings() {
    const st = S.settings;
    const num = (k, label, min, max) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'number', min, max, value: st[k], class: 'in short', onchange: (e) => { st[k] = Math.max(min, Math.min(max, +e.target.value)); saveSettings(); } }));
    const chk = (k, label) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'checkbox', class: 'switch', checked: st[k], onchange: (e) => { st[k] = e.target.checked; saveSettings(); } }));
    const key = (k, d) => h('div', { class: 'key-row' }, h('kbd', null, k), h('span', null, d));
    this.frameWin('Cài Đặt', h('div', { class: 'set-wrap' },
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Tự động đánh'), num('autoHp', 'Tự uống HP khi dưới (%)', 0, 95), num('autoMp', 'Tự uống MP khi dưới (%)', 0, 95), num('autoRange', 'Phạm vi tìm quái', 100, 2000), chk('autoPick', 'Tự nhặt đồ')),
      h('div', { class: 'sec' }, h('div', { class: 'sec-title' }, 'Hiển thị & âm thanh'), chk('names', 'Hiện tên người chơi'), chk('sound', 'Âm thanh')),
      h('div', { class: 'sec help' }, h('div', { class: 'sec-title' }, 'Điều khiển'),
        key('A / D', 'Di chuyển (hoặc ← →)'), key('W / Space', 'Nhảy, nhấn 2 lần để nhảy đôi · S+Space: xuống bục'),
        key('J', 'Đánh thường'), key('1 - 5', 'Kỹ năng'), key('Q / E', 'Bình HP / MP'), key('Z / X', 'Nhặt đồ / nói chuyện, vào cửa'), key('Tab', 'Đổi mục tiêu'), key('F', 'Tự động đánh'),
        key('B C V N', 'Túi đồ · Nhân vật · Kỹ năng · Nhiệm vụ'), key('P O G R M', 'Nhóm · Bạn bè · Gia tộc · Xếp hạng · Bản đồ'), key('Enter', 'Chat'),
        h('div', { class: 'muted tiny' }, 'Bấm vào NPC để nói chuyện, bấm vào người chơi để mời nhóm/giao dịch/thách đấu.'))),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => this.onChangeChar && this.onChangeChar() }, 'Đổi nhân vật'), h('button', { class: 'btn danger', onclick: () => this.onLogout && this.onLogout() }, 'Đăng xuất')));
  }

  // ----- Cửa hàng
  renderShop() {
    const sh = this.shop;
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: `tab${this.shopTab === 'buy' ? ' on' : ''}`, onclick: () => { this.shopTab = 'buy'; this.refresh(); } }, 'Mua'),
      h('button', { class: `tab${this.shopTab === 'sell' ? ' on' : ''}`, onclick: () => { this.shopTab = 'sell'; this.refresh(); } }, 'Bán'));
    let body;
    if (this.shopTab === 'sell') {
      body = h('div', null, h('div', { class: 'muted' }, 'Chọn vật phẩm trong hành trang để bán.'), this.invGrid((it, i) => this.showItem(it, { from: 'sell', slot: i })));
    } else {
      body = h('div', { class: 'shop-list' }, ...sh.items.map((e) => {
        const def = S.G.items[e.id];
        const qty = h('input', { type: 'number', min: 1, max: 999, value: def.stack ? (def.type === 'potion' ? 10 : 1) : 1, class: 'in short' });
        const luong = e.cur === 'luong';
        return h('div', { class: 'shop-row' },
          itemIcon({ id: e.id, q: 1 }, { onclick: () => this.showItem({ id: e.id, q: 1 }, { from: 'view' }) }),
          h('div', { class: 'sh-info' }, h('div', { class: def.lv > S.me.level ? 'bad' : 'sh-name' }, def.name, def.lv > 1 ? h('span', { class: 'muted' }, ` Lv${def.lv}`) : ''),
            h('div', { class: `price ${luong ? 'luong' : 'xu'}` }, ico(luong ? 'luong' : 'xu'), h('b', null, fmt(e.price)), luong ? ' lượng' : ' xu')),
          def.stack ? qty : null,
          h('button', { class: 'btn small primary', onclick: () => this.net.send('buy', { npc: sh.npc, id: e.id, qty: def.stack ? +qty.value || 1 : 1 }) }, 'Mua'));
      }));
    }
    this.frameWin(sh.title, h('div', null, tabs, body), moneyLine());
  }

  // ----- Cường hóa
  renderUpgrade() {
    const U = S.G.upgrade;
    const list = [];
    for (const s of S.G.slots) if (S.equip[s]) list.push({ it: S.equip[s], src: 'eq', slot: s });
    S.inv.forEach((it, i) => {
      if (it && S.G.items[it.id].type === 'equip') list.push({ it, src: 'inv', slot: i });
    });
    const sel = this.upgradeSel ? list.find((x) => x.src === this.upgradeSel.src && String(x.slot) === String(this.upgradeSel.slot)) : null;
    const grid = h('div', { class: 'inv-grid' }, ...list.map((x) => itemIcon(x.it, { sel: sel && sel.it === x.it, onclick: () => { this.upgradeSel = { src: x.src, slot: x.slot }; this.upgradeFlash = null; this.refresh(); } })));
    let panel = h('div', { class: 'empty-note' }, ico('settings'), h('div', null, 'Chọn trang bị cần cường hóa (đang mặc hoặc trong túi).'));
    if (sel) {
      const it = sel.it;
      const def = S.G.items[it.id];
      const plus = it.p || 0;
      if (plus >= U.max) panel = h('div', null, this.itemDetail(it), h('div', { class: 'good' }, 'Đã đạt cấp tối đa!'));
      else {
        const stone = U.stone[plus];
        const need = U.stoneQty[plus];
        const have = S.inv.reduce((n, x) => n + (x && x.id === stone ? x.q : 0), 0);
        const cost = U.cost[def.tier][plus];
        const charms = S.inv.reduce((n, x) => n + (x && x.id === 'charm' ? x.q : 0), 0);
        const useCharm = h('input', { type: 'checkbox', class: 'switch', checked: !!this.useCharm && charms > 0, disabled: plus < 4 || charms < 1, onchange: (e) => { this.useCharm = e.target.checked; } });
        panel = h('div', null, this.itemDetail(it),
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
    this.frameWin('Cường Hóa Trang Bị', h('div', { class: 'upg-wrap' }, h('div', null, h('div', { class: 'sub-title' }, 'Trang bị'), grid), panel), h('div', { class: 'muted tiny' }, `Mỗi cấp cường hóa +${Math.round(U.bonus * 100)}% chỉ số gốc. Đá cường hóa rơi từ quái hoặc mua ở Lò Rèn.`));
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
        this.equipGrid(d.equip, false, { silhouette: true, cls: d.cls, name: d.name, el: cls.element, weaponType: cls.weapon }),
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
  }
}

function shadeHex(hex, f = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`;
}
