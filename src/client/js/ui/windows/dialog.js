// Lớp phủ: hội thoại NPC, lời mời, menu người chơi, màn hình tử trận
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { drawPortrait, ELEMENT_COLORS } from '../../render/sprites.js';
import { sfx } from '../../core/sound.js';
import { $, h, ico } from '../dom.js';

export default {
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
  },

  closeDialog() {
    if (this.dialogEl) this.dialogEl.remove();
    this.dialogEl = null;
    document.body.classList.remove('dlg-open');
  },

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
  },

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
  },

  hideMenu() {
    if (this.menuEl) this.menuEl.remove();
    this.menuEl = null;
  },

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
  },

  hideDeath() {
    this.deathShown = false;
    if (this.deathEl) this.deathEl.remove();
    this.deathEl = null;
  },
};
