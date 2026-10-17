'use strict';

const { ITEMS, makeItem } = require('../data/items');
const { MAPS } = require('../data/maps');
const { MONSTERS } = require('../data/monsters');
const { MAX_LEVEL } = require('./player');

const PARTY_MAX = 6;
// Cấp gia tộc: góp xu → kinh nghiệm gia tộc (1 điểm / 100 xu). Mỗi cấp +5 chỗ và +1% EXP cho thành viên.
const CLAN_MAX_LEVEL = 10;
const clanNeed = (lv) => 2000 * lv * lv;
const clanCap = (cl) => 20 + (cl.level || 1) * 5;
const CLAN_COST = 50000;
const CLAN_LV = 15;
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

class Social {
  constructor(world) {
    this.world = world;
    this.nextParty = 1;
    this.h = {
      chat: this.chat,
      partyInvite: this.partyInvite, partyAccept: this.partyAccept, partyLeave: this.partyLeave, partyKick: this.partyKick,
      tradeReq: this.tradeReq, tradeAccept: this.tradeAccept, tradeSet: this.tradeSet, tradeLock: this.tradeLock,
      tradeOk: this.tradeOk, tradeCancel: (p) => this.cancelTrade(p, 'Đã hủy giao dịch.'),
      duelReq: this.duelReq, duelAccept: this.duelAccept,
      clanInvite: this.clanInvite, clanAccept: this.clanAccept, clanLeave: this.clanLeave, clanKick: this.clanKick,
      clanInfo: this.clanInfo, clanNotice: this.clanNotice, clanPromote: this.clanPromote, clanDonate: this.clanDonate,
      decline: this.decline,
      friendAdd: this.friendAdd, friendAccept: this.friendAccept, friendDel: this.friendDel, friendList: this.friendList,
    };
  }

  handle(p, msg) {
    const fn = this.h[msg.t];
    if (fn) fn.call(this, p, msg);
  }

  find(name) {
    return this.world.byName.get(String(name || '').toLowerCase()) || null;
  }

  invite(from, to, kind, extra) {
    to.invites[`${kind}:${from.name.toLowerCase()}`] = Date.now() + 30000;
    to.send('invite', { kind, from: from.name, ...extra });
  }

  takeInvite(p, kind, from) {
    const key = `${kind}:${String(from).toLowerCase()}`;
    const exp = p.invites[key];
    delete p.invites[key];
    return exp && exp > Date.now();
  }

  decline(p, m) {
    const o = this.find(m.from);
    delete p.invites[`${m.kind}:${String(m.from).toLowerCase()}`];
    if (o) o.notice(`${p.name} đã từ chối lời mời.`);
  }

  onJoin(p) {
    for (const name of p.c.friends) {
      const o = this.find(name);
      if (o) o.send('chat', { ch: 'sys', msg: `Bạn bè ${p.name} đã online.` });
    }
  }

  onLeave(p) {
    for (const name of p.c.friends) {
      const o = this.find(name);
      if (o) o.send('chat', { ch: 'sys', msg: `Bạn bè ${p.name} đã offline.` });
    }
    if (p.trade) this.cancelTrade(p, 'Đối phương đã thoát game.');
    if (p.duel) this.cancelDuel(p, 'Đối phương đã thoát game.');
    if (p.party) this.leaveParty(p);
    if (p.c.clan) this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã offline.` }, p);
  }

  // ---------- Chat
  chat(p, m) {
    const now = Date.now();
    const text = clean(m.msg, 140);
    if (!text) return;
    if (text[0] === '/') return this.command(p, text);
    if (now - p.lastChat < 800) return p.notice('Bạn chat quá nhanh.', 'warn');
    p.lastChat = now;
    const ch = String(m.ch || 'map');
    const base = { from: p.name, id: p.id, cls: p.c.cls, msg: text };
    switch (ch) {
      case 'world':
        if (p.lv < 5) return p.notice('Cần cấp 5 để chat thế giới.', 'warn');
        if (now - p.lastWorldChat < 8000) return p.notice('Kênh thế giới: chờ 8 giây giữa các tin.', 'warn');
        p.lastWorldChat = now;
        return this.world.broadcastAll('chat', { ch: 'world', ...base });
      case 'party':
        if (!p.party) return p.notice('Bạn chưa có nhóm.');
        return this.partyBroadcast(p.party, 'chat', { ch: 'party', ...base });
      case 'clan':
        if (!p.c.clan) return p.notice('Bạn chưa có gia tộc.');
        return this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', ...base });
      case 'pm': {
        const o = this.find(m.to);
        if (!o) return p.notice('Người chơi không online.');
        o.send('chat', { ch: 'pm', ...base, to: o.name });
        return p.send('chat', { ch: 'pm', ...base, to: o.name });
      }
      default:
        if (p.map) p.map.broadcast('chat', { ch: 'map', ...base });
    }
  }

  command(p, text) {
    const [cmd, ...args] = text.slice(1).split(/\s+/);
    const isAdmin = this.world.config.admins.includes(p.conn.account.toLowerCase());
    const sys = (msg) => p.send('chat', { ch: 'sys', msg });
    switch (cmd.toLowerCase()) {
      case 'help':
        sys('Lệnh: /w <tên> <tin> (mật), /p <tin> (nhóm), /g <tin> (gia tộc), /a <tin> (thế giới), /online, /moi <tên> (mời nhóm), /gd <tên> (giao dịch), /td <tên> (thách đấu), /xem <tên>');
        if (isAdmin) sys('Admin: /lv <n>, /item <id> [sl], /xu <n>, /luong <n>, /tp <map>, /boss, /all <tin>, /kick <tên>');
        return;
      case 'w': return this.chat(p, { ch: 'pm', to: args[0], msg: args.slice(1).join(' ') });
      case 'p': return this.chat(p, { ch: 'party', msg: args.join(' ') });
      case 'g': return this.chat(p, { ch: 'clan', msg: args.join(' ') });
      case 'a': return this.chat(p, { ch: 'world', msg: args.join(' ') });
      case 'online': return sys(`Đang online: ${this.world.players.size} người. ${[...this.world.players.values()].slice(0, 30).map((o) => `${o.name}(${o.lv})`).join(', ')}`);
      case 'moi': return this.partyInvite(p, { name: args[0] });
      case 'gd': return this.tradeReq(p, { name: args[0] });
      case 'td': return this.duelReq(p, { name: args[0] });
      case 'xem': return this.world.actions.inspect(p, { name: args[0] });
      default:
    }
    if (!isAdmin) return sys('Lệnh không tồn tại. Gõ /help');
    const n = int(args[0], 0);
    switch (cmd.toLowerCase()) {
      case 'lv': {
        const target = Math.max(1, Math.min(MAX_LEVEL, n));
        const diff = target - p.c.level;
        p.c.level = target;
        p.c.exp = 0;
        if (diff > 0) {
          p.c.potential += diff * 5;
          p.c.skillPoints += diff;
        }
        p.recalc();
        p.c.hp = p.s.maxHp;
        p.c.mp = p.s.maxMp;
        p.checkLevelQuest();
        this.world.actions.refreshInfo(p);
        return sys(`Cấp hiện tại: ${p.lv}`);
      }
      case 'item':
        if (!ITEMS[args[0]]) return sys('Không có vật phẩm này.');
        p.addItem(args[0], Math.max(1, int(args[1], 1)), int(args[2], 0));
        return sys('Đã thêm vật phẩm.');
      case 'xu': p.gainXu(n); return sys(`+${n} xu`);
      case 'luong': p.c.luong += n; p.markMe(); return sys(`+${n} lượng`);
      case 'tp':
        if (!MAPS[args[0]]) return sys(`Bản đồ: ${Object.keys(MAPS).join(', ')}`);
        return this.world.changeMap(p, args[0], null);
      case 'boss':
        for (const map of Object.values(this.world.maps)) for (const m of map.monsters.values()) if (m.boss && m.dead) m.respawnAt = 0;
        return sys('Đã gọi boss.');
      case 'all': return this.world.announce(args.join(' '), 'world');
      case 'kick': {
        const o = this.find(args[0]);
        if (o) o.conn.close('Bạn đã bị quản trị viên mời ra.');
        return;
      }
      case 'mobs': return sys(Object.keys(MONSTERS).join(', '));
      default: return sys('Lệnh không tồn tại.');
    }
  }

  // ---------- Bạn bè
  friendAdd(p, m) {
    const o = this.find(m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (p.c.friends.some((n) => n.toLowerCase() === o.name.toLowerCase())) return p.notice(`${o.name} đã là bạn bè.`);
    if (p.c.friends.length >= 50) return p.notice('Danh sách bạn bè đã đầy (50).');
    this.invite(p, o, 'friend');
    p.notice(`Đã gửi lời mời kết bạn tới ${o.name}.`);
  }

  friendAccept(p, m) {
    const o = this.find(m.from);
    if (!o || !this.takeInvite(p, 'friend', m.from)) return p.notice('Lời mời đã hết hạn.');
    for (const [a, b] of [[p, o], [o, p]]) {
      if (!a.c.friends.some((n) => n.toLowerCase() === b.name.toLowerCase()) && a.c.friends.length < 50) a.c.friends.push(b.name);
      a.notice(`${b.name} và bạn đã trở thành bạn bè!`, 'reward');
      this.friendList(a);
    }
    this.world.db.dirty = true;
  }

  friendDel(p, m) {
    const name = String(m.name || '').toLowerCase();
    p.c.friends = p.c.friends.filter((n) => n.toLowerCase() !== name);
    const o = this.find(name);
    const c = o ? o.c : this.world.db.getChar(name);
    if (c) c.friends = (c.friends || []).filter((n) => n.toLowerCase() !== p.name.toLowerCase());
    if (o) this.friendList(o);
    this.world.db.dirty = true;
    this.friendList(p);
  }

  friendList(p) {
    const list = p.c.friends.map((name) => {
      const o = this.find(name);
      if (o) return { name: o.name, lv: o.lv, cls: o.c.cls, map: o.map ? o.map.def.name : '', online: true };
      const c = this.world.db.getChar(name);
      return c ? { name: c.name, lv: c.level, cls: c.cls, map: '', online: false } : null;
    }).filter(Boolean).sort((a, b) => b.online - a.online || b.lv - a.lv);
    p.send('friends', { list });
  }

  // ---------- Nhóm
  partyMembers(party) {
    return [...party.members].map((id) => this.world.players.get(id)).filter(Boolean);
  }

  partyBroadcast(party, t, d) {
    for (const o of this.partyMembers(party)) o.send(t, d);
  }

  sendParty(p) {
    if (!p.party) return p.send('party', { members: [] });
    this.partyUpdate(p.party);
  }

  partyUpdate(party) {
    const members = this.partyMembers(party).map((o) => ({
      id: o.id, name: o.name, cls: o.c.cls, lv: o.lv, hp: o.c.hp, mhp: o.s.maxHp, map: o.map ? o.map.def.name : '', leader: party.leader === o.id,
    }));
    this.partyBroadcast(party, 'party', { id: party.id, members });
  }

  partyInvite(p, m) {
    const o = this.find(m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.party) return p.notice(`${o.name} đã có nhóm.`);
    if (p.party && p.party.leader !== p.id) return p.notice('Chỉ trưởng nhóm mới mời được.');
    if (p.party && p.party.members.size >= PARTY_MAX) return p.notice('Nhóm đã đủ người.');
    this.invite(p, o, 'party');
    p.notice(`Đã gửi lời mời vào nhóm tới ${o.name}.`);
  }

  partyAccept(p, m) {
    const o = this.find(m.from);
    if (!o || !this.takeInvite(p, 'party', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (p.party) return p.notice('Bạn đã có nhóm.');
    if (!o.party) {
      o.party = { id: this.nextParty++, leader: o.id, members: new Set([o.id]) };
      this.world.actions.refreshInfo(o);
    }
    if (o.party.members.size >= PARTY_MAX) return p.notice('Nhóm đã đủ người.');
    o.party.members.add(p.id);
    p.party = o.party;
    this.world.actions.refreshInfo(p);
    this.partyBroadcast(p.party, 'chat', { ch: 'party', from: 'Hệ thống', msg: `${p.name} đã vào nhóm.` });
    this.partyUpdate(p.party);
  }

  leaveParty(p) {
    const party = p.party;
    if (!party) return;
    party.members.delete(p.id);
    p.party = null;
    p.send('party', { members: [] });
    this.world.actions.refreshInfo(p);
    this.partyBroadcast(party, 'chat', { ch: 'party', from: 'Hệ thống', msg: `${p.name} đã rời nhóm.` });
    if (party.members.size <= 1) {
      for (const o of this.partyMembers(party)) {
        o.party = null;
        o.send('party', { members: [] });
        this.world.actions.refreshInfo(o);
      }
      return;
    }
    if (party.leader === p.id) party.leader = [...party.members][0];
    this.partyUpdate(party);
  }

  partyLeave(p) {
    this.leaveParty(p);
  }

  partyKick(p, m) {
    if (!p.party || p.party.leader !== p.id) return;
    const o = this.find(m.name);
    if (!o || o.party !== p.party || o === p) return;
    this.leaveParty(o);
    o.notice('Bạn đã bị mời ra khỏi nhóm.');
  }

  // ---------- Giao dịch
  tradeReq(p, m) {
    const o = this.find(m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.map !== p.map || Math.abs(o.x - p.x) > 250) return p.notice('Phải đứng gần nhau để giao dịch.');
    if (p.trade || o.trade) return p.notice('Một bên đang giao dịch.');
    if (p.lv < 5 || o.lv < 5) return p.notice('Cần cấp 5 để giao dịch.');
    this.invite(p, o, 'trade');
    p.notice(`Đã gửi lời mời giao dịch tới ${o.name}.`);
  }

  tradeAccept(p, m) {
    const o = this.find(m.from);
    if (!o || !this.takeInvite(p, 'trade', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (o.map !== p.map || Math.abs(o.x - p.x) > 250) return p.notice('Phải đứng gần nhau để giao dịch.');
    if (p.trade || o.trade) return;
    p.trade = { other: o.id, slots: [], xu: 0, lock: false, ok: false };
    o.trade = { other: p.id, slots: [], xu: 0, lock: false, ok: false };
    this.tradeUpdate(p);
  }

  tradeView(p) {
    return { slots: p.trade.slots, items: p.trade.slots.map((s) => p.c.inv[s]), xu: p.trade.xu, lock: p.trade.lock, ok: p.trade.ok };
  }

  tradeUpdate(p) {
    const o = this.world.players.get(p.trade.other);
    if (!o || !o.trade) return this.cancelTrade(p, 'Giao dịch bị hủy.');
    p.send('trade', { with: o.name, mine: this.tradeView(p), theirs: this.tradeView(o) });
    o.send('trade', { with: p.name, mine: this.tradeView(o), theirs: this.tradeView(p) });
  }

  tradeSet(p, m) {
    if (!p.trade || p.trade.lock) return;
    const slots = [...new Set((Array.isArray(m.slots) ? m.slots : []).map((s) => int(s, -1)))]
      .filter((s) => s >= 0 && s < p.c.inv.length && p.c.inv[s]).slice(0, 10);
    p.trade.slots = slots;
    p.trade.xu = Math.max(0, Math.min(p.c.xu, int(m.xu, 0)));
    this.tradeUpdate(p);
  }

  tradeLock(p) {
    if (!p.trade) return;
    p.trade.lock = true;
    this.tradeUpdate(p);
  }

  tradeOk(p) {
    if (!p.trade || !p.trade.lock) return;
    const o = this.world.players.get(p.trade.other);
    if (!o || !o.trade || !o.trade.lock) return;
    p.trade.ok = true;
    if (!o.trade.ok) return this.tradeUpdate(p);
    // Thực hiện
    const take = (pl) => pl.trade.slots.map((s) => pl.c.inv[s]).filter(Boolean);
    const a = take(p);
    const b = take(o);
    if (a.length !== p.trade.slots.length || b.length !== o.trade.slots.length) return this.cancelTrade(p, 'Vật phẩm đã thay đổi, giao dịch bị hủy.');
    if (p.c.xu < p.trade.xu || o.c.xu < o.trade.xu) return this.cancelTrade(p, 'Không đủ xu.');
    const freeA = p.freeSlots() + a.length;
    const freeB = o.freeSlots() + b.length;
    if (freeA < b.length || freeB < a.length) return this.cancelTrade(p, 'Hành trang không đủ chỗ.');
    for (const s of p.trade.slots) p.c.inv[s] = null;
    for (const s of o.trade.slots) o.c.inv[s] = null;
    for (const it of b) p.c.inv[p.c.inv.indexOf(null)] = it;
    for (const it of a) o.c.inv[o.c.inv.indexOf(null)] = it;
    p.c.xu += o.trade.xu - p.trade.xu;
    o.c.xu += p.trade.xu - o.trade.xu;
    for (const pl of [p, o]) {
      pl.trade = null;
      pl.markInv();
      pl.markMe();
      pl.onInventoryChanged();
      pl.send('tradeEnd', { ok: true });
      pl.notice('Giao dịch thành công!', 'reward');
    }
    this.world.db.dirty = true;
  }

  cancelTrade(p, msg) {
    const t = p.trade;
    if (!t) return;
    p.trade = null;
    p.send('tradeEnd', { ok: false });
    if (msg) p.notice(msg);
    const o = this.world.players.get(t.other);
    if (o && o.trade && o.trade.other === p.id) {
      o.trade = null;
      o.send('tradeEnd', { ok: false });
      o.notice('Giao dịch đã bị hủy.');
    }
  }

  // ---------- Thách đấu
  duelReq(p, m) {
    const o = this.find(m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (!p.map || o.map !== p.map) return p.notice('Phải ở cùng bản đồ.');
    if (p.map.def.town) return p.notice('Không thể thách đấu trong làng.');
    if (p.duel || o.duel) return p.notice('Một bên đang thách đấu.');
    this.invite(p, o, 'duel');
    p.notice(`Đã gửi lời thách đấu tới ${o.name}.`);
  }

  duelAccept(p, m) {
    const o = this.find(m.from);
    if (!o || !this.takeInvite(p, 'duel', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (o.map !== p.map || p.map.def.town || o.dead || p.dead) return p.notice('Không thể bắt đầu thách đấu.');
    p.duel = o.id;
    o.duel = p.id;
    for (const [a, b] of [[p, o], [o, p]]) {
      a.send('duel', { with: b.id, name: b.name });
      a.notice(`Bắt đầu thách đấu với ${b.name}!`, 'warn');
    }
  }

  endDuel(winner, loser) {
    winner.duel = null;
    loser.duel = null;
    for (const pl of [winner, loser]) pl.send('duel', { with: 0 });
    if (winner.map) winner.map.broadcast('chat', { ch: 'sys', msg: `${winner.name} đã chiến thắng ${loser.name} trong trận thách đấu!` });
  }

  cancelDuel(p, msg) {
    const o = this.world.players.get(p.duel);
    p.duel = null;
    p.send('duel', { with: 0 });
    if (o && o.duel === p.id) {
      o.duel = null;
      o.send('duel', { with: 0 });
      if (msg) o.notice(msg);
    }
  }

  // ---------- Gia tộc
  clanBroadcast(clanId, t, d, except) {
    const cl = this.world.db.clans[clanId];
    if (!cl) return;
    for (const key of Object.keys(cl.members)) {
      const o = this.world.byName.get(key);
      if (o && o !== except) o.send(t, d);
    }
  }

  clanCreate(p, name) {
    name = clean(name, 12);
    if (p.c.clan) return p.notice('Bạn đã có gia tộc.');
    if (!/^[A-Za-z0-9]{3,12}$/.test(name)) return p.notice('Tên gia tộc 3-12 ký tự chữ hoặc số, không dấu.', 'warn');
    if (p.lv < CLAN_LV) return p.notice(`Cần cấp ${CLAN_LV} để lập gia tộc.`, 'warn');
    if (p.c.xu < CLAN_COST) return p.notice(`Cần ${CLAN_COST.toLocaleString('vi-VN')} xu.`, 'warn');
    const db = this.world.db;
    if (Object.values(db.clans).some((c) => c.name.toLowerCase() === name.toLowerCase())) return p.notice('Tên gia tộc đã tồn tại.', 'warn');
    p.c.xu -= CLAN_COST;
    const id = db.newClanId();
    db.clans[id] = { name, leader: p.name, created: Date.now(), notice: 'Chào mừng đến với gia tộc!', members: { [p.name.toLowerCase()]: { name: p.name, rank: 'leader', joined: Date.now() } } };
    db.dirty = true;
    p.c.clan = id;
    p.markMe();
    this.world.actions.refreshInfo(p);
    this.world.announce(`${p.name} đã thành lập gia tộc ${name}!`, 'world');
    this.clanInfo(p);
  }

  clanInfo(p) {
    const cl = p.c.clan && this.world.db.clans[p.c.clan];
    if (!cl) return p.send('clan', null);
    const members = Object.entries(cl.members).map(([key, mm]) => {
      const o = this.world.byName.get(key);
      const c = o ? o.c : this.world.db.getChar(key);
      return { name: mm.name, rank: mm.rank, lv: c ? c.level : 0, cls: c ? c.cls : '', online: !!o };
    }).sort((a, b) => b.online - a.online || b.lv - a.lv);
    const lv = cl.level || 1;
    p.send('clan', {
      id: p.c.clan, name: cl.name, leader: cl.leader, notice: cl.notice, members, myRank: cl.members[p.name.toLowerCase()].rank, max: clanCap(cl),
      level: lv, exp: cl.exp || 0, need: lv >= CLAN_MAX_LEVEL ? 0 : clanNeed(lv), bonus: lv, fund: cl.fund || 0,
    });
  }

  myClan(p) {
    const cl = p.c.clan && this.world.db.clans[p.c.clan];
    if (!cl || !cl.members[p.name.toLowerCase()]) {
      p.c.clan = null;
      return null;
    }
    return cl;
  }

  clanInvite(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const rank = cl.members[p.name.toLowerCase()].rank;
    if (rank === 'member') return p.notice('Chỉ tộc trưởng/trưởng lão mới mời được.');
    if (Object.keys(cl.members).length >= clanCap(cl)) return p.notice('Gia tộc đã đủ thành viên.');
    const o = this.find(m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.c.clan) return p.notice(`${o.name} đã có gia tộc.`);
    this.invite(p, o, 'clan', { clan: cl.name });
    p.notice(`Đã mời ${o.name} vào gia tộc.`);
  }

  clanAccept(p, m) {
    const o = this.find(m.from);
    if (!o || !this.takeInvite(p, 'clan', m.from)) return p.notice('Lời mời đã hết hạn.');
    const cl = this.myClan(o);
    if (!cl || p.c.clan) return;
    if (Object.keys(cl.members).length >= clanCap(cl)) return p.notice('Gia tộc đã đủ thành viên.');
    cl.members[p.name.toLowerCase()] = { name: p.name, rank: 'member', joined: Date.now() };
    p.c.clan = o.c.clan;
    this.world.db.dirty = true;
    p.markMe();
    this.world.actions.refreshInfo(p);
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã gia nhập gia tộc!` });
    this.clanInfo(p);
  }

  removeFromClan(name, clanId) {
    const db = this.world.db;
    const cl = db.clans[clanId];
    if (!cl) return;
    delete cl.members[name.toLowerCase()];
    const o = this.world.byName.get(name.toLowerCase());
    const c = o ? o.c : db.getChar(name);
    if (c) c.clan = null;
    if (o) {
      o.markMe();
      this.world.actions.refreshInfo(o);
      o.send('clan', null);
    }
    db.dirty = true;
  }

  // Rời gia tộc (dùng cả khi xóa nhân vật): tộc trưởng rời thì nhường chức, còn 1 người thì giải tán
  leaveClan(name, id) {
    const db = this.world.db;
    const cl = db.clans[id];
    if (!cl) return null;
    const key = name.toLowerCase();
    if (cl.leader.toLowerCase() === key) {
      const others = Object.entries(cl.members).filter(([k]) => k !== key);
      if (!others.length) {
        this.removeFromClan(name, id);
        delete db.clans[id];
        db.dirty = true;
        return 'dissolved';
      }
      others.sort((a, b) => (b[1].rank === 'elder') - (a[1].rank === 'elder') || a[1].joined - b[1].joined);
      const [, heir] = others[0];
      heir.rank = 'leader';
      cl.leader = heir.name;
      this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${heir.name} trở thành tộc trưởng mới.` });
    }
    this.removeFromClan(name, id);
    this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${name} đã rời gia tộc.` });
    return 'left';
  }

  clanLeave(p) {
    if (!this.myClan(p)) return;
    const r = this.leaveClan(p.name, p.c.clan);
    p.notice(r === 'dissolved' ? 'Gia tộc đã giải tán.' : 'Bạn đã rời gia tộc.');
  }

  clanKick(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const me = cl.members[p.name.toLowerCase()];
    const key = String(m.name || '').toLowerCase();
    const t = cl.members[key];
    if (!t || key === p.name.toLowerCase()) return;
    if (me.rank === 'member' || (me.rank === 'elder' && t.rank !== 'member')) return p.notice('Không đủ quyền.');
    this.removeFromClan(t.name, p.c.clan);
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} đã bị mời khỏi gia tộc.` });
    this.clanInfo(p);
  }

  clanPromote(p, m) {
    const cl = this.myClan(p);
    if (!cl || cl.leader !== p.name) return p.notice('Chỉ tộc trưởng mới làm được.');
    const t = cl.members[String(m.name || '').toLowerCase()];
    if (!t || t.rank === 'leader') return;
    if (m.rank === 'leader') {
      cl.members[p.name.toLowerCase()].rank = 'elder';
      t.rank = 'leader';
      cl.leader = t.name;
    } else {
      t.rank = t.rank === 'elder' ? 'member' : 'elder';
    }
    this.world.db.dirty = true;
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} nay là ${{ leader: 'tộc trưởng', elder: 'trưởng lão', member: 'thành viên' }[t.rank]}.` });
    this.clanInfo(p);
  }

  clanDonate(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const xu = Math.floor(+m.xu || 0);
    if (xu < 1000) return p.notice('Góp tối thiểu 1.000 xu.', 'warn');
    if (p.c.xu < xu) return p.notice('Không đủ xu.', 'warn');
    p.c.xu -= xu;
    p.markMe();
    cl.fund = (cl.fund || 0) + xu;
    cl.exp = (cl.exp || 0) + Math.floor(xu / 100);
    cl.level = cl.level || 1;
    const id = p.c.clan;
    let up = false;
    while (cl.level < CLAN_MAX_LEVEL && cl.exp >= clanNeed(cl.level)) {
      cl.exp -= clanNeed(cl.level);
      cl.level++;
      up = true;
    }
    this.world.db.dirty = true;
    this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã góp ${xu.toLocaleString('vi-VN')} xu vào quỹ gia tộc.` });
    if (up) {
      this.world.announce(`Gia tộc ${cl.name} đã đạt cấp ${cl.level}!`, 'world');
      for (const key of Object.keys(cl.members)) {
        const o = this.world.byName.get(key);
        if (o) o.recalc();
      }
    }
    this.clanInfo(p);
  }

  clanNotice(p, m) {
    const cl = this.myClan(p);
    if (!cl || cl.members[p.name.toLowerCase()].rank === 'member') return;
    cl.notice = clean(m.text, 120);
    this.world.db.dirty = true;
    this.clanInfo(p);
  }
}

module.exports = { Social, makeItem };
