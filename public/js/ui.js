// Giao diện người dùng (DOM): HUD, cửa sổ, hội thoại, chat
import { S, fmt, skillVal, itemStats, itemName, rarityColor, saveSettings } from './store.js';
import { iconURL, drawPortrait, ELEMENT_COLORS } from './sprites.js';
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

function itemIcon(it, opts = {}) {
  const def = S.G.items[it.id];
  const el = h('div', { class: `slot r${it.r || 0}${opts.sel ? ' sel' : ''}`, title: itemName(it) },
    h('img', { src: iconURL(def.icon, it.r), alt: '' }));
  if (it.q > 1) el.appendChild(h('span', { class: 'qty' }, it.q > 999 ? '999+' : it.q));
  if (it.p) el.appendChild(h('span', { class: 'plus' }, `+${it.p}`));
  if (def.lv > S.me.level || (def.cls && def.cls !== S.me.cls)) el.classList.add('locked');
  if (opts.onclick) el.addEventListener('click', opts.onclick);
  return el;
}

function skillGlyph(sid) {
  const sk = S.G.skills[sid];
  const words = sk.name.split(' ');
  return words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join('') : sk.name.slice(0, 2);
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
      S.clanInfo = m;
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
    // Thanh kỹ năng
    const sk = $('#hud-skills');
    sk.innerHTML = '';
    this.skillBtns = [];
    const basic = h('button', { class: 'sbtn basic', 'data-act': 'attack' }, h('b', null, '⚔'), h('i', { class: 'cd' }), h('small', null, 'J'));
    sk.appendChild(basic);
    for (let i = 0; i < 5; i++) {
      const b = h('button', { class: 'sbtn', 'data-act': `s${i + 1}` }, h('b'), h('i', { class: 'cd' }), h('small', null, String(i + 1)));
      this.skillBtns.push(b);
      sk.appendChild(b);
    }
    this.basicBtn = basic;
    this.potBtns = {
      hp: h('button', { class: 'sbtn pot', 'data-act': 'hp' }, h('img'), h('span', { class: 'qty' }), h('small', null, 'Q')),
      mp: h('button', { class: 'sbtn pot', 'data-act': 'mp' }, h('img'), h('span', { class: 'qty' }), h('small', null, 'E')),
    };
    this.potBtns.hp.style.gridArea = '1 / 5';
    this.potBtns.mp.style.gridArea = '2 / 5';
    sk.appendChild(this.potBtns.hp);
    sk.appendChild(this.potBtns.mp);
    sk.appendChild(h('button', { class: 'sbtn act', 'data-act': 'talk', title: 'Nói chuyện / vào cửa / nhặt đồ (X)', style: { gridArea: '2 / 4' } }, h('b', null, '💬'), h('small', null, 'X')));
    game.input.bindTouch(sk);
    game.input.bindTouch($('#hud-dpad'));

    // Menu
    const menu = $('#hud-menu');
    menu.innerHTML = '';
    const items = [
      ['inv', '🎒', 'Túi đồ (B)'], ['char', '👤', 'Nhân vật (C)'], ['skill', '📜', 'Kỹ năng (V)'], ['quest', '❗', 'Nhiệm vụ (N)'],
      ['party', '👥', 'Nhóm (P)'], ['friends', '💞', 'Bạn bè (O)'], ['clan', '🏯', 'Gia tộc (G)'], ['rank', '🏆', 'Xếp hạng (R)'], ['map', '🗺', 'Bản đồ (M)'],
      ['gift', '🎁', 'Điểm danh hằng ngày'], ['wheel', '🎡', 'Vòng quay may mắn'], ['settings', '⚙', 'Cài đặt'],
    ];
    for (const [k, icon, title] of items) {
      const b = h('button', { class: 'mbtn', title, onclick: () => { sfx('click'); this.toggle(k); } }, icon);
      if (k === 'gift') this.giftBtn = b;
      menu.appendChild(b);
    }
    this.autoBtn = h('button', { class: 'mbtn wide', title: 'Tự động đánh (F)', onclick: () => game.toggleAuto() }, 'AUTO');
    this.pkBtn = h('button', { class: 'mbtn wide', title: 'Chế độ PK', onclick: () => this.net.send('pk', { on: !S.me.pkMode }) }, 'PK');
    menu.appendChild(this.autoBtn);
    menu.appendChild(this.pkBtn);

    // Chat
    const tabs = $('#chat-tabs');
    tabs.innerHTML = '';
    for (const [k, label] of [['all', 'Tất cả'], ['world', 'T.giới'], ['map', 'B.đồ'], ['party', 'Nhóm'], ['clan', 'G.tộc'], ['pm', 'Mật']]) {
      tabs.appendChild(h('button', { class: `ctab${k === this.chatTab ? ' on' : ''}`, onclick: (e) => {
        this.chatTab = k;
        tabs.querySelectorAll('.ctab').forEach((b) => b.classList.remove('on'));
        e.target.classList.add('on');
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
    $('#chat-toggle').onclick = () => $('#hud-chat').classList.toggle('collapsed');
    if (this.touch) $('#hud-chat').classList.add('collapsed');
    $('#hud-quest').onclick = () => this.toggle('quest');
    this.updateStatus();
    this.updatePotions();
  }

  setChatCh(ch) {
    this.chatCh = ch;
    $('#chat-ch').value = ch;
    $('#chat-input').placeholder = ch === 'pm' ? `Nhắn cho ${this.pmTo || '...'} (hoặc /w tên tin)` : 'Nhập tin nhắn...';
  }

  focusChat() {
    $('#hud-chat').classList.remove('collapsed');
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
  }

  renderChat() {
    const log = $('#chat-log');
    if (!log) return;
    const list = this.chat.filter((m) => this.chatTab === 'all' || m.ch === this.chatTab || m.ch === 'sys');
    log.innerHTML = '';
    for (const m of list.slice(-60)) {
      const line = h('div', { class: `cl ch-${m.ch}` });
      line.appendChild(h('span', { class: 'cch' }, `[${CH_NAMES[m.ch] || m.ch}]`));
      if (m.from) {
        const who = m.ch === 'pm' ? (m.from === S.me.name ? `→${m.to}` : m.from) : m.from;
        line.appendChild(h('span', { class: 'cfrom', onclick: () => {
          const name = m.ch === 'pm' && m.from === S.me.name ? m.to : m.from;
          if (name && name !== S.me.name && name !== 'Hệ thống') {
            this.pmTo = name;
            this.setChatCh('pm');
            this.focusChat();
          }
        } }, ` ${who}: `));
      } else line.appendChild(document.createTextNode(' '));
      line.appendChild(document.createTextNode(m.msg));
      log.appendChild(line);
    }
    log.scrollTop = log.scrollHeight;
  }

  updateStatus() {
    const me = S.me;
    if (!me || !$('#hud') || $('#hud').classList.contains('hidden')) return;
    $('#st-name').textContent = me.name;
    $('#st-lv').textContent = `Lv${me.level}`;
    $('#st-cls').textContent = `${S.G.classes[me.cls].name} · ${S.G.elements[S.G.classes[me.cls].element].name}`;
    const bar = (sel, v, max, text) => {
      const el = $(sel);
      el.querySelector('i').style.width = `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`;
      el.querySelector('span').textContent = text;
    };
    bar('#bar-hp', me.hp, me.s.maxHp, `${fmt(me.hp)}/${fmt(me.s.maxHp)}`);
    bar('#bar-mp', me.mp, me.s.maxMp, `${fmt(me.mp)}/${fmt(me.s.maxMp)}`);
    bar('#bar-exp', me.exp, me.need, me.level >= 100 ? 'MAX' : `${((me.exp / me.need) * 100).toFixed(2)}%`);
    $('#st-xu').textContent = fmt(me.xu);
    $('#st-luong').textContent = fmt(me.luong);
    const av = $('#avatar').getContext('2d');
    drawPortrait(av, { cls: me.cls, gender: me.gender, look: me.look, name: me.name, el: S.G.classes[me.cls].element, weaponType: null });
    // Kỹ năng trên thanh
    me.hotbar.forEach((sid, i) => {
      const b = this.skillBtns && this.skillBtns[i];
      if (!b) return;
      b.dataset.sid = sid || '';
      b.querySelector('b').textContent = sid ? skillGlyph(sid) : '';
      b.title = sid ? `${S.G.skills[sid].name} Lv${me.skills[sid] || 0}` : 'Trống - mở Kỹ năng (V) để gán';
      b.style.setProperty('--el', ELEMENT_COLORS[S.G.classes[me.cls].element]);
      b.classList.toggle('empty', !sid);
    });
    if (this.pkBtn) this.pkBtn.classList.toggle('on', !!me.pkMode);
    if (this.giftBtn) {
      const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
      this.giftBtn.classList.toggle('gift', !me.checkin || me.checkin.day !== today);
    }
    // Buff
    const bf = $('#hud-buffs');
    bf.innerHTML = '';
    for (const b of me.buffs) bf.appendChild(h('div', { class: 'buff', 'data-until': b.until - me.now + Date.now(), title: b.name }, b.name.slice(0, 2), h('small')));
    if (me.pk > 0) bf.appendChild(h('div', { class: 'buff pk', title: `Điểm hiếu chiến: ${me.pk}` }, `☠${me.pk}`));
    this.updateQuestTracker();
    if (this.deathShown && !me.dead) this.hideDeath();
  }

  updateQuestTracker() {
    const q = S.me.quest;
    const d = S.me.daily;
    const box = $('#hud-quest');
    box.innerHTML = '';
    if (q && !q.done) {
      let state = '';
      if (q.st === 0) state = S.me.level >= q.req ? 'Gặp Trưởng Làng nhận' : `Cần cấp ${q.req}`;
      else if (q.st === 2 || q.prog >= q.n) state = 'Hoàn thành - về gặp Trưởng Làng';
      else state = `${q.prog}/${q.n}`;
      box.appendChild(h('div', { class: 'qt' }, h('b', null, `★ ${q.name}`), h('div', null, state)));
    }
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      box.appendChild(h('div', { class: 'qt daily' }, h('b', null, '◆ Hằng ngày'), h('div', null, `${mn.name} ${d.task.prog}/${d.task.n}`)));
    }
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
      b.querySelector('.qty').textContent = n;
      b.classList.toggle('empty', !n);
    }
  }

  setAuto(on) {
    this.autoBtn.classList.toggle('on', on);
    this.toast(on ? 'Bật tự động đánh' : 'Tắt tự động đánh');
  }

  onEnterMap(map) {
    $('#map-name').textContent = map.name;
    $('#map-info').textContent = map.town ? 'Khu an toàn' : map.pvp ? 'Khu PK tự do' : map.instance ? 'Phó bản' : map.lv ? `Quái cấp ${map.lv[0]}-${map.lv[1]}` : '';
    sfx('portal');
    this.closeDialog();
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
      if (t.kind === 'm') {
        const d = e.def;
        $('#tg-name').textContent = `${d.name}${d.boss ? ' (BOSS)' : ''}`;
        $('#tg-lv').textContent = `Lv${d.lv}${d.el ? ` · ${S.G.elements[d.el].name}` : ''}`;
        $('#tg-name').style.color = d.boss ? '#ff8a80' : this.game.mobColor(d.lv);
      } else {
        $('#tg-name').textContent = e.info.name;
        $('#tg-lv').textContent = `Lv${e.info.lv} · ${S.G.classes[e.info.cls].name}`;
        $('#tg-name').style.color = '#ffffff';
      }
      box.classList.toggle('boss', t.kind === 'm' && e.def.boss);
    }
    const hp = Math.max(0, e.hp);
    const max = e.mhp || 1;
    $('#tg-bar i').style.width = `${(hp / max) * 100}%`;
    $('#tg-bar span').textContent = `${fmt(hp)}/${fmt(max)}`;
  }

  // gọi mỗi khung hình
  frame() {
    const now = performance.now();
    if (now - this.lastFrame < 80 || !S.me || !this.game) return;
    this.lastFrame = now;
    const g = this.game;
    const upd = (b, sid) => {
      const cd = b.querySelector('.cd');
      if (!sid) {
        cd.style.height = '0';
        return;
      }
      const sk = S.G.skills[sid];
      const left = (g.cool[sid] || 0) - now;
      cd.style.height = left > 0 ? `${Math.min(100, (left / sk.cd) * 100)}%` : '0';
      const lv = S.me.skills[sid] || 0;
      b.classList.toggle('nomp', S.me.mp < Math.round(skillVal(sk.mp, lv)));
    };
    upd(this.basicBtn, g.basicSkill());
    this.skillBtns.forEach((b, i) => upd(b, S.me.hotbar[i]));
    document.querySelectorAll('#hud-buffs .buff[data-until]').forEach((el) => {
      const left = Math.max(0, Math.ceil((+el.dataset.until - Date.now()) / 1000));
      el.querySelector('small').textContent = left > 60 ? `${Math.ceil(left / 60)}p` : `${left}s`;
    });
    if (now - (this.lastMini || 0) > 200) {
      this.lastMini = now;
      this.drawMinimap();
      $('#map-ping').textContent = S.ping ? `${S.ping}ms` : '';
    }
  }

  drawMinimap() {
    const g = this.game;
    if (!g || !g.map) return;
    const cv = $('#minimap');
    const ctx = cv.getContext('2d');
    const map = g.map;
    const W = cv.width;
    const H = cv.height;
    const sx = W / map.w;
    const sy = H / map.h;
    ctx.fillStyle = 'rgba(10,8,20,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6d5c48';
    ctx.fillRect(0, map.ground * sy, W, H - map.ground * sy);
    ctx.fillStyle = '#a1887f';
    for (const [x, y, w] of map.platforms) ctx.fillRect(x * sx, y * sy, Math.max(2, w * sx), 2);
    ctx.fillStyle = '#4fc3f7';
    for (const p of map.portals) ctx.fillRect(p.x * sx - 1, (map.ground - 20) * sy, 3, 20 * sy);
    ctx.fillStyle = '#ffd54f';
    for (const n of map.npcs) ctx.fillRect(n.x * sx - 1, (map.ground - 8) * sy, 2, 4);
    for (const m of g.monsters.values()) {
      ctx.fillStyle = m.def.boss ? '#ff1744' : '#e57373';
      const s = m.def.boss ? 4 : 2;
      ctx.fillRect(m.x * sx - s / 2, (m.y - 4) * sy - s / 2, s, s);
    }
    for (const p of g.players.values()) {
      ctx.fillStyle = p.info.party && p.info.party === S.party.id ? '#69f0ae' : '#ffffff';
      ctx.fillRect(p.x * sx - 1, (p.y - 6) * sy - 1, 2, 3);
    }
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(g.me.x * sx - 2, (g.me.y - 8) * sy - 1, 4, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(g.camX * sx + 0.5, Math.max(0, g.camY) * sy + 0.5, g.W * sx, Math.min(H, g.H * sy) - 1);
  }

  renderPartyHud() {
    const box = $('#hud-party');
    box.innerHTML = '';
    for (const m of S.party.members) {
      if (m.id === S.me.id) continue;
      box.appendChild(h('div', { class: 'pm' }, h('div', { class: 'pmn' }, `${m.leader ? '★' : ''}${m.name} Lv${m.lv}`),
        h('div', { class: 'bar hp tiny' }, h('i', { style: { width: `${(m.hp / Math.max(1, m.mhp)) * 100}%` } })), h('div', { class: 'pmm' }, m.map)));
    }
  }

  // ---------------- Thông báo
  toast(msg, kind = 'info') {
    const box = $('#toasts');
    const el = h('div', { class: `toast k-${kind}` }, msg);
    box.appendChild(el);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), kind === 'map' ? 1800 : 3200);
    setTimeout(() => el.remove(), kind === 'map' ? 2300 : 3800);
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
    this.refresh();
  }

  close(silent) {
    if (this.win) this.win.remove();
    if (this.winName === 'trade' && this.trade && !silent) this.net.send('tradeCancel');
    if (this.wheelAnim) cancelAnimationFrame(this.wheelAnim);
    this.wheelAnim = null;
    this.win = null;
    this.winName = null;
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
    win.appendChild(h('div', { class: 'win-head' }, h('span', null, title), h('button', { class: 'x', onclick: () => this.close() }, '✕')));
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
  equipGrid(equip, clickable) {
    const grid = h('div', { class: 'equip-grid' });
    for (const s of S.G.slots) {
      const it = equip[s];
      const cell = h('div', { class: 'eq-cell' }, h('label', null, S.G.slotNames[s]));
      if (it) cell.appendChild(itemIcon(it, { onclick: clickable ? () => this.showItem(it, { from: 'eq', slot: s }) : () => this.showItem(it, { from: 'view' }) }));
      else cell.appendChild(h('div', { class: 'slot empty' }));
      grid.appendChild(cell);
    }
    return grid;
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
    const free = S.inv.filter((x) => !x).length;
    this.frameWin('Hành Trang', h('div', { class: 'inv-wrap' },
      this.equipGrid(S.equip, true),
      h('div', null,
        h('div', { class: 'row between' }, h('span', null, `Ô trống: ${free}/${S.inv.length}`), h('button', { class: 'btn small', onclick: () => this.net.send('sortInv') }, 'Sắp xếp')),
        this.invGrid((it, i) => this.showItem(it, { from: 'inv', slot: i })))),
    h('div', { class: 'money' }, `💰 ${fmt(S.me.xu)} xu   💎 ${fmt(S.me.luong)} lượng`));
  }

  itemDetail(it, extra) {
    const def = S.G.items[it.id];
    const box = h('div', { class: 'item-detail' });
    box.appendChild(h('div', { class: 'id-head' }, h('div', { class: `slot big r${it.r || 0}` }, h('img', { src: iconURL(def.icon, it.r) })),
      h('div', null, h('div', { class: 'id-name', style: { color: rarityColor(it) } }, itemName(it)),
        h('div', { class: 'muted' }, def.type === 'equip' ? `${S.G.slotNames[def.slot]} · ${S.G.rarity[it.r || 0].name}` : def.desc || ''))));
    if (def.lv > 1) box.appendChild(h('div', { class: def.lv > S.me.level ? 'bad' : '' }, `Yêu cầu cấp: ${def.lv}`));
    if (def.cls) box.appendChild(h('div', { class: def.cls !== S.me.cls ? 'bad' : '' }, `Phái: ${S.G.classes[def.cls].name}`));
    if (def.type === 'equip') {
      const st = itemStats({ id: it.id, p: it.p });
      for (const k in st) box.appendChild(h('div', { class: 'stat' }, `${S.G.statLabels[k]}: +${st[k]}`));
      for (const [k, v] of it.o || []) box.appendChild(h('div', { class: 'stat opt', style: { color: rarityColor(it) } }, `✦ ${S.G.statLabels[k]} +${v}`));
      if (def.desc) box.appendChild(h('div', { class: 'muted' }, def.desc));
    }
    if (it.q > 1) box.appendChild(h('div', { class: 'muted' }, `Số lượng: ${it.q}`));
    if (extra) box.appendChild(extra);
    return box;
  }

  showItem(it, ctx) {
    this.hideItem();
    const def = S.G.items[it.id];
    const btns = h('div', { class: 'row wrap' });
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
      const qty = h('input', { type: 'number', min: 1, max: it.q, value: it.q, class: 'qty-in' });
      if (it.q > 1) btns.appendChild(qty);
      btns.appendChild(h('button', { class: 'btn primary', onclick: () => {
        this.net.send('sell', { npc: this.shop.npc, slot: ctx.slot, qty: +qty.value || 1 });
        this.hideItem();
      } }, `Bán (${fmt(price)} xu/cái)`));
    }
    add('Đóng', () => {});
    const pop = h('div', { class: 'item-pop' }, this.itemDetail(it, def.type !== 'equip' && ctx.from === 'inv' && def.sell ? null : null), btns);
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
    const statRow = (k) => h('div', { class: 'stat-row' },
      h('span', { class: 'sn' }, S.G.statNames[k]), h('b', null, `${me.stats[k]}${s[k] !== me.stats[k] ? ` (+${s[k] - me.stats[k]})` : ''}`),
      h('button', { class: 'btn small', disabled: me.potential < 1, onclick: () => this.net.send('addStat', { k, n: 1 }) }, '+1'),
      h('button', { class: 'btn small', disabled: me.potential < 10, onclick: () => this.net.send('addStat', { k, n: 10 }) }, '+10'));
    const desc = {
      str: '+2 tấn công mỗi điểm', agi: '+chí mạng, né tránh, chính xác', int: '+6 chakra, +0.6% sát thương kỹ năng', vit: '+12 sinh lực, +0.6 phòng thủ',
    };
    const derived = [
      ['Sinh lực', fmt(s.maxHp)], ['Chakra', fmt(s.maxMp)], ['Tấn công', fmt(s.atk)], ['Phòng thủ', fmt(s.def)],
      ['Chí mạng', `${s.crit}%`], ['Né tránh', `${s.dodge}%`], ['Chính xác', s.hit], ['Tốc chạy', `+${s.spd}%`],
      ['ST kỹ năng', `+${s.skillDmg}%`], ['Kinh nghiệm', `x${s.expMul}`],
    ];
    this.frameWin('Nhân Vật', h('div', { class: 'char-wrap' },
      h('div', { class: 'char-head' }, h('div', { class: 'big-name' }, me.name),
        h('div', null, `Cấp ${me.level} · Phái ${cls.name} · Hệ ${S.G.elements[cls.element].name}`),
        h('div', { class: 'muted' }, `EXP: ${fmt(me.exp)}/${fmt(me.need)} · Đã diệt ${fmt(me.kills)} quái${me.clan ? ` · Gia tộc ${me.clan.name}` : ''}`)),
      h('div', { class: 'sec' }, h('div', { class: 'row between' }, h('b', null, 'Điểm tiềm năng'), h('span', { class: me.potential ? 'good' : '' }, `Còn ${me.potential} điểm`)),
        ...['str', 'agi', 'int', 'vit'].map((k) => h('div', null, statRow(k), h('div', { class: 'muted tiny' }, desc[k])))),
      h('div', { class: 'sec grid2' }, ...derived.map(([a, b]) => h('div', { class: 'kv' }, h('span', null, a), h('b', null, b))))),
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
      const row = h('div', { class: `skill-row${lv ? '' : ' locked'}` },
        h('div', { class: 'sk-icon', style: { '--el': ELEMENT_COLORS[S.G.classes[me.cls].element] } }, sk.basic ? '⚔' : skillGlyph(sid)),
        h('div', { class: 'sk-info' },
          h('div', null, h('b', null, sk.name), ` ${sk.basic ? '' : `Lv${lv}/${S.G.skillMax}`}`, !lv ? h('span', { class: 'muted' }, ` · Mở ở cấp ${sk.req}`) : ''),
          h('div', { class: 'muted tiny' }, sk.desc || 'Đòn đánh cơ bản.'),
          h('div', { class: 'tiny' }, info.join(' · '))));
      if (!sk.basic) {
        const act = h('div', { class: 'sk-act' });
        if (lv < S.G.skillMax) {
          act.appendChild(h('button', { class: 'btn small primary', disabled: me.skillPoints < 1 || me.level < next, title: `Cần cấp ${next}`,
            onclick: () => this.net.send('learnSkill', { sid }) }, lv ? `Nâng (cấp ${next})` : `Học (cấp ${next})`));
        }
        if (lv) {
          const slots = h('div', { class: 'row' });
          for (let i = 0; i < 5; i++) {
            slots.appendChild(h('button', { class: `btn tiny-btn${me.hotbar[i] === sid ? ' on' : ''}`, onclick: () => this.net.send('hotbar', { i, sid: me.hotbar[i] === sid ? null : sid }) }, String(i + 1)));
          }
          act.appendChild(slots);
        }
        row.appendChild(act);
      }
      return row;
    });
    this.frameWin('Kỹ Năng', h('div', null, h('div', { class: 'row between' }, h('span', null, 'Bấm số 1-5 để gán vào thanh kỹ năng'), h('b', { class: me.skillPoints ? 'good' : '' }, `Điểm kỹ năng: ${me.skillPoints}`)), ...rows));
  }

  // ----- Nhiệm vụ
  renderQuest() {
    const q = S.me.quest;
    const d = S.me.daily;
    const parts = [];
    if (q && !q.done) {
      let state;
      if (q.st === 0) state = S.me.level >= q.req ? 'Chưa nhận - hãy gặp Trưởng Làng.' : `Cần đạt cấp ${q.req} để nhận.`;
      else if (q.st === 2 || q.prog >= q.n) state = 'Đã hoàn thành - về gặp Trưởng Làng nhận thưởng.';
      else state = `Tiến độ: ${q.prog}/${q.n}`;
      parts.push(h('div', { class: 'sec' }, h('b', null, `Nhiệm vụ chính ${q.i + 1}/${S.G.quests.length}: ${q.name}`), h('div', null, q.desc), h('div', { class: 'good' }, state)));
    } else parts.push(h('div', { class: 'sec' }, 'Đã hoàn thành toàn bộ nhiệm vụ chính!'));
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const done = d && d.day === today ? d.done : 0;
    if (d && d.task) {
      const mn = S.G.monsters[d.task.m];
      parts.push(h('div', { class: 'sec' }, h('b', null, `Nhiệm vụ hằng ngày (${done}/20)`), h('div', null, `Tiêu diệt ${d.task.n} ${mn.name} (Lv${mn.lv})`), h('div', { class: 'good' }, `Tiến độ: ${d.task.prog}/${d.task.n}`)));
    } else parts.push(h('div', { class: 'sec' }, h('b', null, `Nhiệm vụ hằng ngày (${done}/20)`), h('div', null, 'Gặp Tiểu Nhị ở làng để nhận nhiệm vụ diệt quái hằng ngày. Mỗi 5 nhiệm vụ được thêm Rương Báu.')));
    parts.push(h('div', { class: 'sec muted' }, 'Mẹo: Boss thế giới xuất hiện định kỳ ở Rừng Trúc, Hang Dơi, Thung Lũng Sương, Đỉnh Băng Giá, Hang Quỷ và Cổng Địa Ngục. Hạ boss nhận lượng và trang bị quý!'));
    this.frameWin('Nhiệm Vụ', h('div', null, ...parts));
  }

  // ----- Nhóm
  renderParty() {
    const p = S.party;
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const amLeader = p.members.some((m) => m.leader && m.id === S.me.id);
    const rows = p.members.map((m) => h('div', { class: 'list-row' },
      h('span', null, `${m.leader ? '★ ' : ''}${m.name}`), h('span', { class: 'muted' }, `Lv${m.lv} ${S.G.classes[m.cls].name} · ${m.map}`),
      h('div', { class: 'bar hp tiny', style: { width: '80px' } }, h('i', { style: { width: `${(m.hp / Math.max(1, m.mhp)) * 100}%` } })),
      amLeader && m.id !== S.me.id ? h('button', { class: 'btn small danger', onclick: () => this.net.send('partyKick', { name: m.name }) }, 'Mời ra') : null));
    this.frameWin('Nhóm', h('div', null,
      p.members.length ? h('div', null, ...rows) : h('div', { class: 'muted' }, 'Bạn chưa có nhóm. Mời người chơi khác để lập nhóm (tối đa 6 người). Cả nhóm chia sẻ kinh nghiệm và được thưởng thêm 12% mỗi thành viên.'),
      h('div', { class: 'row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('partyInvite', { name: inName.value }) }, 'Mời'))),
    p.members.length ? h('button', { class: 'btn danger', onclick: () => this.net.send('partyLeave') }, 'Rời nhóm') : null);
  }

  // ----- Gia tộc
  renderClan() {
    const c = S.clanInfo;
    if (!c) {
      this.frameWin('Gia Tộc', h('div', null, h('p', null, 'Bạn chưa có gia tộc.'), h('p', { class: 'muted' }, 'Gặp Lão Gia Tộc ở bất kỳ làng nào để lập gia tộc (cần cấp 15 và 50.000 xu), hoặc nhờ tộc trưởng mời bạn.')));
      return;
    }
    const canManage = c.myRank !== 'member';
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const notice = h('textarea', { class: 'in', rows: 2, maxlength: 120 }, c.notice);
    const rows = c.members.map((m) => h('div', { class: 'list-row' },
      h('span', { class: m.online ? 'good' : 'muted' }, `${m.online ? '●' : '○'} ${m.name}`),
      h('span', { class: 'muted' }, `${RANK_NAMES[m.rank]} · Lv${m.lv} ${m.cls ? S.G.classes[m.cls].name : ''}`),
      c.myRank === 'leader' && m.rank !== 'leader' ? h('button', { class: 'btn small', onclick: () => this.net.send('clanPromote', { name: m.name }) }, m.rank === 'elder' ? 'Giáng' : 'Thăng') : null,
      c.myRank === 'leader' && m.rank !== 'leader' ? h('button', { class: 'btn small', onclick: () => confirm(`Nhường chức tộc trưởng cho ${m.name}?`) && this.net.send('clanPromote', { name: m.name, rank: 'leader' }) }, 'Nhường') : null,
      canManage && m.rank !== 'leader' && m.name !== S.me.name ? h('button', { class: 'btn small danger', onclick: () => confirm(`Mời ${m.name} rời gia tộc?`) && this.net.send('clanKick', { name: m.name }) }, 'Đuổi') : null));
    this.frameWin(`Gia Tộc ${c.name}`, h('div', null,
      h('div', { class: 'sec' }, h('div', null, `Tộc trưởng: ${c.leader} · Thành viên: ${c.members.length}/${c.max}`),
        canManage ? h('div', null, notice, h('button', { class: 'btn small', onclick: () => this.net.send('clanNotice', { text: notice.value }) }, 'Lưu thông báo')) : h('div', { class: 'notice' }, c.notice)),
      h('div', { class: 'sec' }, ...rows),
      canManage ? h('div', { class: 'row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('clanInvite', { name: inName.value }) }, 'Mời vào')) : null,
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
      body = h('div', null, ...list.map((r, i) => {
        if (this.rankTab === 'clan') return h('div', { class: 'list-row' }, h('b', null, `#${i + 1}`), h('span', null, r.name), h('span', { class: 'muted' }, `Tộc trưởng ${r.leader} · ${r.members} người · Lực chiến ${r.power}`));
        if (this.rankTab === 'kills') return h('div', { class: 'list-row' }, h('b', null, `#${i + 1}`), h('span', null, r.name), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name} · ${fmt(r.kills)} quái`));
        return h('div', { class: `list-row${r.name === S.me.name ? ' me' : ''}` }, h('b', null, `#${i + 1}`), h('span', null, r.name), h('span', { class: 'muted' }, `Lv${r.level} ${S.G.classes[r.cls].name}${r.clan ? ` [${r.clan}]` : ''}`));
      }));
      if (!list.length) body = h('div', { class: 'muted' }, 'Chưa có dữ liệu.');
    }
    this.frameWin('Bảng Xếp Hạng', h('div', null, tabs, body), h('span', { class: 'muted tiny' }, 'Cập nhật mỗi phút'));
  }

  // ----- Bản đồ thế giới
  renderWorldMap() {
    const maps = Object.values(S.G.maps).filter((m) => !m.instance);
    const cur = this.game.map.id;
    const order = ['fire_field', 'v_fire', 'arena', 'bamboo', 'v_water', 'water_lake', 'coast', 'bat_cave', 'v_wind', 'wind_hill', 'wasteland', 'misty_valley', 'snow_mountain', 'ice_peak', 'demon_forest', 'demon_cave', 'hell_gate'];
    maps.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    this.frameWin('Bản Đồ Thế Giới', h('div', { class: 'world-map' }, ...maps.map((m) => h('div', { class: `wm${m.id === cur ? ' cur' : ''}${m.town ? ' town' : ''}` },
      h('b', null, m.name), h('span', { class: 'muted' }, m.town ? 'Làng' : m.pvp ? 'PK tự do' : m.lv ? `Lv ${m.lv[0]}-${m.lv[1]}` : ''),
      h('span', { class: 'tiny muted' }, `→ ${m.portals.map((p) => S.G.maps[p.to].name).join(', ')}`)))),
    h('span', { class: 'muted tiny' }, 'Phu Xe ở mỗi làng giúp đi nhanh giữa 3 làng.'));
  }

  // ----- Cài đặt
  renderSettings() {
    const st = S.settings;
    const num = (k, label, min, max) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'number', min, max, value: st[k], class: 'in short', onchange: (e) => { st[k] = Math.max(min, Math.min(max, +e.target.value)); saveSettings(); } }));
    const chk = (k, label) => h('label', { class: 'set-row' }, h('span', null, label),
      h('input', { type: 'checkbox', checked: st[k], onchange: (e) => { st[k] = e.target.checked; saveSettings(); } }));
    this.frameWin('Cài Đặt', h('div', null,
      h('div', { class: 'sec' }, h('b', null, 'Tự động đánh'), num('autoHp', 'Tự uống HP khi dưới (%)', 0, 95), num('autoMp', 'Tự uống MP khi dưới (%)', 0, 95), num('autoRange', 'Phạm vi tìm quái', 100, 2000), chk('autoPick', 'Tự nhặt đồ')),
      h('div', { class: 'sec' }, chk('names', 'Hiện tên người chơi'), chk('sound', 'Âm thanh')),
      h('div', { class: 'sec help' }, h('b', null, 'Điều khiển'),
        h('div', null, 'A/D hoặc ←/→: di chuyển · W/↑/Space: nhảy (nhấn 2 lần để nhảy đôi) · S+Space: xuống bục'),
        h('div', null, 'J: đánh thường · 1-5: kỹ năng · Q/E: bình HP/MP · Z: nhặt đồ · X: nói chuyện/vào cửa · Tab: đổi mục tiêu'),
        h('div', null, 'F: tự động đánh · B: túi đồ · C: nhân vật · V: kỹ năng · N: nhiệm vụ · P: nhóm · G: gia tộc · R: xếp hạng · M: bản đồ · Enter: chat'),
        h('div', null, 'Bấm vào NPC để nói chuyện, bấm vào người chơi để mời nhóm/giao dịch/thách đấu.'))),
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
        return h('div', { class: 'shop-row' },
          itemIcon({ id: e.id, q: 1 }, { onclick: () => this.showItem({ id: e.id, q: 1 }, { from: 'view' }) }),
          h('div', { class: 'sh-info' }, h('div', { class: def.lv > S.me.level ? 'bad' : '' }, def.name, def.lv > 1 ? h('span', { class: 'muted' }, ` Lv${def.lv}`) : ''),
            h('div', { class: e.cur === 'luong' ? 'luong' : 'xu' }, `${fmt(e.price)} ${e.cur === 'luong' ? 'lượng' : 'xu'}`)),
          def.stack ? qty : null,
          h('button', { class: 'btn small primary', onclick: () => this.net.send('buy', { npc: sh.npc, id: e.id, qty: def.stack ? +qty.value || 1 : 1 }) }, 'Mua'));
      }));
    }
    this.frameWin(sh.title, h('div', null, tabs, body), h('div', { class: 'money' }, `💰 ${fmt(S.me.xu)} xu   💎 ${fmt(S.me.luong)} lượng`));
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
    let panel = h('div', { class: 'muted' }, 'Chọn trang bị cần cường hóa (đang mặc hoặc trong túi).');
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
        const useCharm = h('input', { type: 'checkbox', checked: !!this.useCharm && charms > 0, disabled: plus < 4 || charms < 1, onchange: (e) => { this.useCharm = e.target.checked; } });
        panel = h('div', null, this.itemDetail(it),
          h('div', { class: `upg-box ${this.upgradeFlash || ''}` },
            h('div', null, h('b', null, `+${plus} → +${plus + 1}`), `  Tỉ lệ thành công: `, h('b', { class: 'good' }, `${U.rate[plus]}%`)),
            h('div', { class: have >= need ? '' : 'bad' }, `${S.G.items[stone].name}: ${have}/${need}`),
            h('div', { class: S.me.xu >= cost ? '' : 'bad' }, `Phí: ${fmt(cost)} xu`),
            plus >= 4 ? h('div', { class: 'warn' }, 'Thất bại sẽ bị giảm 1 cấp (trừ khi dùng Bùa Bảo Hộ).') : h('div', { class: 'muted' }, 'Thất bại không mất cấp.'),
            h('label', { class: 'set-row' }, h('span', null, `Dùng Bùa Bảo Hộ (có ${charms})`), useCharm),
            h('button', { class: 'btn primary big', disabled: have < need || S.me.xu < cost, onclick: () => this.net.send('upgrade', { npc: this.upgradeNpc, src: sel.src, slot: sel.slot, charm: useCharm.checked }) }, 'CƯỜNG HÓA')));
      }
    }
    this.frameWin('Cường Hóa Trang Bị', h('div', { class: 'upg-wrap' }, grid, panel), h('div', { class: 'muted tiny' }, `Mỗi cấp cường hóa +${Math.round(U.bonus * 100)}% chỉ số gốc. Đá cường hóa rơi từ quái hoặc mua ở Lò Rèn.`));
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
      h('div', null, h('b', null, `Kho đồ ${used}/${st.items.length} (bấm để lấy ra)`), grid),
      h('div', null, h('b', null, 'Hành trang (bấm để cất vào kho)'), this.invGrid((it, i) => { sfx('click'); this.net.send('storePut', { npc: st.npc, slot: i }); }))),
    h('span', { class: 'muted tiny' }, 'Kho đồ dùng chung giữa mọi làng, miễn phí.'));
  }

  // ----- Bạn bè
  renderFriends() {
    const list = this.friends || [];
    const inName = h('input', { placeholder: 'Tên người chơi', class: 'in' });
    const rows = list.map((f) => h('div', { class: 'list-row' },
      h('span', { class: f.online ? 'good' : 'muted' }, `${f.online ? '●' : '○'} ${f.name}`),
      h('span', { class: 'muted' }, `Lv${f.lv} ${S.G.classes[f.cls] ? S.G.classes[f.cls].name : ''}${f.map ? ` · ${f.map}` : ''}`),
      f.online ? h('button', { class: 'btn small', onclick: () => { this.pmTo = f.name; this.setChatCh('pm'); this.close(); this.focusChat(); } }, 'Nhắn') : null,
      f.online ? h('button', { class: 'btn small', onclick: () => this.net.send('partyInvite', { name: f.name }) }, 'Mời nhóm') : null,
      h('button', { class: 'btn small danger', onclick: () => confirm(`Xóa ${f.name} khỏi danh sách bạn bè?`) && this.net.send('friendDel', { name: f.name }) }, 'Xóa')));
    this.frameWin(`Bạn Bè (${list.length}/50)`, h('div', null,
      list.length ? h('div', null, ...rows) : h('div', { class: 'muted' }, 'Chưa có bạn bè. Bấm vào người chơi khác → "Kết bạn", hoặc nhập tên bên dưới.'),
      h('div', { class: 'row' }, inName, h('button', { class: 'btn primary', onclick: () => inName.value && this.net.send('friendAdd', { name: inName.value }) }, 'Kết bạn'))));
  }

  // ----- Điểm danh
  renderGift() {
    const ck = S.me.checkin || { day: '', streak: 0 };
    const day = (off) => new Date(Date.now() + 7 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);
    const claimed = ck.day === day(0);
    const nextStreak = claimed ? ck.streak : ck.day === day(-1) ? ck.streak + 1 : 1;
    const cur = (nextStreak - 1) % 7;
    const label = (r) => {
      const parts = [];
      if (r.xu) parts.push(`${fmt(Math.round(r.xu * (1 + S.me.level / 20)))} xu`);
      if (r.luong) parts.push(`${r.luong} lượng`);
      for (const [id, q] of r.items || []) parts.push(`${S.G.items[id].name}${q > 1 ? ` x${q}` : ''}`);
      return parts;
    };
    const cells = S.G.checkin.map((r, i) => h('div', { class: `gift-day${i < cur || (claimed && i === cur) ? ' got' : ''}${i === cur ? ' cur' : ''}` },
      h('b', null, `Ngày ${i + 1}`), ...label(r).map((t) => h('div', { class: 'tiny' }, t))));
    this.frameWin('Điểm Danh Hằng Ngày', h('div', null,
      h('div', { class: 'muted' }, `Đăng nhập liên tục để nhận quà lớn hơn. Chuỗi hiện tại: ${claimed ? ck.streak : Math.max(0, nextStreak - 1)} ngày.`),
      h('div', { class: 'gift-grid' }, ...cells)),
    h('button', { class: 'btn primary', disabled: claimed, onclick: () => this.net.send('checkin') }, claimed ? 'Đã điểm danh hôm nay' : 'Điểm danh nhận quà'));
  }

  // ----- Vòng quay may mắn
  renderWheel() {
    const W = S.G.wheel;
    const cv = h('canvas', { width: 240, height: 240, class: 'wheel' });
    this.wheelCanvas = cv;
    this.wheelRot = this.wheelRot || 0;
    this.drawWheel();
    const busy = !!this.wheelAnim;
    this.frameWin('Vòng Quay May Mắn', h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-box' }, h('div', { class: 'wheel-pin' }, '▼'), cv),
      h('div', { class: 'wheel-side' },
        h('div', { class: 'muted' }, 'Quay bằng lượng có tỉ lệ ra quà quý cao hơn.'),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'xu' }) }, `Quay (${fmt(W.cost.xu)} xu)`),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'luong' }) }, `Quay (${W.cost.luong} lượng)`),
        h('div', { class: 'wheel-result' }, this.wheelResult || ''))),
    h('div', { class: 'money' }, `💰 ${fmt(S.me.xu)} xu   💎 ${fmt(S.me.luong)} lượng`));
  }

  drawWheel() {
    const cv = this.wheelCanvas;
    if (!cv) return;
    const g = cv.getContext('2d');
    const prizes = S.G.wheel.prizes;
    const n = prizes.length;
    const seg = (Math.PI * 2) / n;
    const R = 112;
    g.clearRect(0, 0, 240, 240);
    g.save();
    g.translate(120, 120);
    for (let i = 0; i < n; i++) {
      const a0 = this.wheelRot + i * seg - Math.PI / 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, a0, a0 + seg);
      g.closePath();
      g.fillStyle = i % 2 ? prizes[i].c : shadeHex(prizes[i].c);
      g.fill();
      g.strokeStyle = '#2b1d14';
      g.lineWidth = 2;
      g.stroke();
      g.save();
      g.rotate(a0 + seg / 2);
      g.fillStyle = '#1a1020';
      g.font = '16px VT323, monospace';
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      g.fillText(prizes[i].label, R - 8, 0);
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, 16, 0, Math.PI * 2);
    g.fillStyle = '#e8c271';
    g.fill();
    g.strokeStyle = '#2b1d14';
    g.stroke();
    g.restore();
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
      h('div', { class: 'trade-col' }, h('b', null, `Bạn đưa ${mine.lock ? '🔒' : ''}${mine.ok ? ' ✔' : ''}`), offer(mine), h('div', { class: 'row' }, 'Xu: ', xuIn)),
      h('div', { class: 'trade-col' }, h('b', null, `${t.with} đưa ${theirs.lock ? '🔒' : ''}${theirs.ok ? ' ✔' : ''}`), offer(theirs), h('div', null, `Xu: ${fmt(theirs.xu)}`)),
      h('div', { class: 'trade-inv' }, h('div', { class: 'muted tiny' }, 'Bấm vào vật phẩm trong túi để thêm/bỏ khỏi giao dịch'), inv)),
    h('div', { class: 'row' },
      h('button', { class: 'btn', disabled: mine.lock, onclick: () => this.net.send('tradeLock') }, 'Khóa'),
      h('button', { class: 'btn primary', disabled: !mine.lock || !theirs.lock || mine.ok, onclick: () => this.net.send('tradeOk') }, 'Đồng ý'),
      h('button', { class: 'btn danger', onclick: () => this.net.send('tradeCancel') }, 'Hủy')));
  }

  renderInspect() {
    const d = this.inspectData;
    if (!d) return;
    this.frameWin(`Thông tin ${d.name}`, h('div', null,
      h('div', null, `Cấp ${d.lv} · Phái ${S.G.classes[d.cls].name}${d.clan ? ` · Gia tộc ${d.clan}` : ''}${d.pk ? ` · Hiếu chiến ${d.pk}` : ''}`),
      h('div', { class: 'sec grid2' }, ...[['Sinh lực', d.s.maxHp], ['Chakra', d.s.maxMp], ['Tấn công', d.s.atk], ['Phòng thủ', d.s.def], ['Chí mạng', `${d.s.crit}%`], ['Né tránh', `${d.s.dodge}%`]]
        .map(([a, b]) => h('div', { class: 'kv' }, h('span', null, a), h('b', null, fmt(b) === 'NaN' ? b : typeof b === 'number' ? fmt(b) : b)))),
      this.equipGrid(d.equip, false)));
  }

  // ---------------- Hội thoại NPC
  showDialog(m) {
    this.closeDialog();
    const box = h('div', { class: 'dialog' });
    box.appendChild(h('div', { class: 'dlg-head' }, h('b', null, m.name), h('span', { class: 'muted' }, ` · ${m.title}`), h('button', { class: 'x', onclick: () => this.closeDialog() }, '✕')));
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
  }

  closeDialog() {
    if (this.dialogEl) this.dialogEl.remove();
    this.dialogEl = null;
  }

  // ---------------- Lời mời
  showInvite(m) {
    const text = {
      party: `${m.from} mời bạn vào nhóm.`, trade: `${m.from} muốn giao dịch với bạn.`, duel: `${m.from} thách đấu bạn!`, clan: `${m.from} mời bạn vào gia tộc ${m.clan}.`,
      friend: `${m.from} muốn kết bạn với bạn.`,
    }[m.kind];
    const accept = { party: 'partyAccept', trade: 'tradeAccept', duel: 'duelAccept', clan: 'clanAccept', friend: 'friendAccept' }[m.kind];
    sfx('quest');
    const el = h('div', { class: 'invite' }, h('div', null, text), h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { this.net.send(accept, { from: m.from }); el.remove(); } }, 'Đồng ý'),
      h('button', { class: 'btn', onclick: () => { this.net.send('decline', { kind: m.kind, from: m.from }); el.remove(); } }, 'Từ chối')));
    $('#invites').appendChild(el);
    setTimeout(() => el.remove(), 30000);
  }

  // ---------------- Menu người chơi
  playerMenu(info, x, y) {
    this.hideMenu();
    const send = (t, d) => { this.net.send(t, d); this.hideMenu(); };
    const menu = h('div', { class: 'pmenu', style: { left: `${Math.min(x, window.innerWidth - 190)}px`, top: `${Math.min(y, window.innerHeight - 260)}px` } },
      h('div', { class: 'pm-head' }, `${info.name} · Lv${info.lv} ${S.G.classes[info.cls].name}`),
      h('button', { onclick: () => send('inspect', { name: info.name }) }, 'Xem thông tin'),
      h('button', { onclick: () => send('partyInvite', { name: info.name }) }, 'Mời vào nhóm'),
      h('button', { onclick: () => send('friendAdd', { name: info.name }) }, 'Kết bạn'),
      h('button', { onclick: () => send('tradeReq', { name: info.name }) }, 'Giao dịch'),
      h('button', { onclick: () => send('duelReq', { name: info.name }) }, 'Thách đấu'),
      h('button', { onclick: () => { this.pmTo = info.name; this.setChatCh('pm'); this.focusChat(); this.hideMenu(); } }, 'Nhắn tin'),
      S.me.clan && S.me.clan.rank !== 'member' ? h('button', { onclick: () => send('clanInvite', { name: info.name }) }, 'Mời vào gia tộc') : null,
      h('button', { onclick: () => this.hideMenu() }, 'Đóng'));
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
      h('h2', null, 'Bạn đã bị trọng thương!'),
      h('div', null, m.by ? `Bị hạ bởi ${m.by}.` : ''), m.lost ? h('div', { class: 'bad' }, `Mất ${fmt(m.lost)} kinh nghiệm.`) : null,
      h('div', { class: 'row' },
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

function shadeHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.82;
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`;
}
