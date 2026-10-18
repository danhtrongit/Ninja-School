// Giao diện người dùng (DOM): HUD, khung cửa sổ, chat, thông báo.
// Nội dung từng cửa sổ nằm ở windows/<tên>.js, được gộp vào UI.prototype ở cuối file.
import { S, fmt, skillVal, activeSeason, countInv } from '../core/store.js';
import { drawPortrait, ELEMENT_COLORS } from '../render/sprites.js';
import { iconURL, skillIconURL, uiIconURL } from '../render/icons.js';
import { sfx } from '../core/sound.js';
import { $, h, ico } from './dom.js';
import { vnDay, elColorOfSkill, hbInfo, miniBar } from './common.js';
import eventWin from './windows/event.js';
import arenaWin from './windows/arena.js';
import inventoryWin from './windows/inventory.js';
import characterWin from './windows/character.js';
import petWin from './windows/pet.js';
import skillsWin from './windows/skills.js';
import questWin from './windows/quest.js';
import partyWin from './windows/party.js';
import clanWin from './windows/clan.js';
import rankWin from './windows/rank.js';
import mapWin from './windows/map.js';
import settingsWin from './windows/settings.js';
import shopWin from './windows/shop.js';
import smithWin from './windows/smith.js';
import storageWin from './windows/storage.js';
import friendsWin from './windows/friends.js';
import checkinWin from './windows/checkin.js';
import mailWin from './windows/mail.js';
import seasonWin from './windows/season.js';
import wheelWin from './windows/wheel.js';
import tradeWin from './windows/trade.js';
import inspectWin from './windows/inspect.js';
import dialogWin from './windows/dialog.js';

export { h };

const CH_NAMES = { world: 'Thế giới', map: 'Bản đồ', party: 'Nhóm', clan: 'Gia tộc', pm: 'Mật', sys: 'Hệ thống' };

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

// Gộp phương thức của các cửa sổ vào UI (giữ `this.renderInv()`... như cũ)
Object.assign(UI.prototype,
  eventWin, arenaWin, inventoryWin, characterWin, petWin, skillsWin, questWin, partyWin, clanWin, rankWin, mapWin, settingsWin, shopWin, smithWin, storageWin, friendsWin, checkinWin, mailWin, seasonWin, wheelWin, tradeWin, inspectWin, dialogWin);
