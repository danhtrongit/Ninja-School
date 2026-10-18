'use strict';

const { MAPS, GROUND } = require('../data/maps');
const { CLASSES } = require('../data/classes');
const { GameMap } = require('./map');
const { Player, expNeed } = require('./player');
const { Combat } = require('./combat');
const { Social } = require('./social');
const { Actions } = require('./actions');
const { Dungeon } = require('./dungeon');
const { BeastEvent } = require('./event');
const { Mailer, mailSummary } = require('./mail');
const { Season } = require('./season');
const { Arena } = require('./arena');
const { PET } = require('../data/pets');
const { ITEMS } = require('../data/items');
const ITEM_NAME = (id) => (ITEMS[id] ? ITEMS[id].name : id);

const TICK = 50;
// Giờ Vàng: nhân đôi EXP toàn máy chủ (giờ Việt Nam)
const GOLDEN_HOURS = [[12, 13], [20, 22]];
const vnHour = () => new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();

class World {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.nextPid = 1;
    this.nextMid = 1;
    this.nextGid = 1;
    this.maps = {};
    this.players = new Map();
    this.byName = new Map();
    this.combat = new Combat(this);
    this.social = new Social(this);
    this.actions = new Actions(this);
    this.rankCache = { level: [], clan: [], at: 0 };
    this.dungeons = new Map();
    this.nextDungeon = 1;
    this.event = new BeastEvent(this);
    this.mail = new Mailer(this);
    this.season = new Season(this);
    this.arena = new Arena(this);
    for (const id in MAPS) if (!MAPS[id].instance) this.maps[id] = new GameMap(this, MAPS[id]);
    this.tickN = 0;
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), TICK);
    this.saveTimer = setInterval(() => this.saveAll(), 30000);
    this.golden = this.isGoldenHour();
    this.computeRank();
  }

  isGoldenHour() {
    if (this.config.golden === false) return false;
    const h = vnHour();
    return GOLDEN_HOURS.some(([a, b]) => h >= a && h < b);
  }

  expEvent() {
    return this.golden ? 2 : 1;
  }

  stop() {
    clearInterval(this.timer);
    clearInterval(this.saveTimer);
    this.saveAll();
  }

  // ---------- Vòng lặp chính
  tick() {
    const now = Date.now();
    const dt = Math.min(0.2, (now - this.last) / 1000);
    this.last = now;
    this.tickN++;
    for (const id in this.maps) this.maps[id].update(dt, now);
    for (const d of [...this.dungeons.values()]) {
      d.map.update(dt, now);
      d.update(now);
    }
    for (const m of this.arena.matches.values()) m.map.update(dt, now);
    this.arena.update(now);
    if (this.tickN % 2 === 0) {
      for (const id in this.maps) this.maps[id].sendState();
      for (const d of this.dungeons.values()) d.map.sendState();
      for (const m of this.arena.matches.values()) m.map.sendState();
    }
    if (this.tickN % 20 === 0) this.secondTick(now);
    // kỹ năng tự động của thú cưng (nhặt đồ, hồi máu)
    if (this.tickN % 5 === 0) for (const p of this.players.values()) p.petTick(now);
    if (this.tickN % 1200 === 0) this.computeRank();
    for (const p of this.players.values()) this.flush(p);
  }

  secondTick(now) {
    const golden = this.isGoldenHour();
    if (golden !== this.golden) {
      this.golden = golden;
      this.announce(golden ? 'GIỜ VÀNG bắt đầu: nhân đôi kinh nghiệm toàn máy chủ!' : 'Giờ Vàng đã kết thúc.', 'world');
    }
    this.event.tick(now);
    this.season.tick();
    this.arena.tick(now);
    for (const p of this.players.values()) {
      p.c.playtime += 1;
      if (p.c.pending.length && p.c.playtime % 3 === 0) p.deliverPending();
      // Hết hạn buff
      let changed = false;
      for (const k in p.buffs) {
        if (p.buffs[k].until <= now) {
          delete p.buffs[k];
          changed = true;
        }
      }
      for (const k in p.c.buffs) {
        if (p.c.buffs[k] <= now) {
          delete p.c.buffs[k];
          changed = true;
          p.notice(k === 'exp2' ? 'Hiệu lực nhân đôi kinh nghiệm đã hết.' : 'Hiệu lực món ăn đã hết.');
        }
      }
      if (changed) p.recalc();
      // thời trang có hạn: kiểm tra mỗi 5 giây
      if (p.c.playtime % 5 === 0) p.checkExpiry(now);
      // Hồi phục tự nhiên
      // lôi đài: không hồi máu tự nhiên (nội tại hồi chakra vẫn tính)
      if (!p.dead && p.map) {
        const town = p.map.def.town;
        const arena = !!p.map.def.arena;
        const idle = now - p.lastCombat > 6000;
        if (!arena && ((idle && p.c.playtime % 3 === 0) || town)) {
          const rate = town ? 0.05 : 0.02;
          if (p.c.hp < p.s.maxHp || p.c.mp < p.s.maxMp) p.heal(p.s.maxHp * rate, p.s.maxMp * rate * 1.5);
        }
        // Nội tại hồi chakra: mỗi giây, kể cả khi đang đánh
        if (p.s.mpRegen > 0 && p.c.mp < p.s.maxMp) {
          // cộng dồn phần lẻ để 2.6/giây không bị làm tròn thành 3
          p.mpAcc = (p.mpAcc || 0) + p.s.mpRegen;
          const n = Math.floor(p.mpAcc);
          p.mpAcc -= n;
          if (n) p.heal(0, n);
        }
      }
      // thú cưng đang mang theo đói dần
      if (p.c.playtime % PET.loveDecay === 0) p.petDecay();
      // Giảm điểm hiếu chiến mỗi 10 phút
      if (p.c.pk > 0 && p.c.playtime % 600 === 0) {
        p.c.pk--;
        p.markMe();
      }
    }
  }

  flush(p) {
    if (p.dirtyMe) {
      p.dirtyMe = false;
      p.send('me', p.selfData());
    }
    if (p.dirtyInv) {
      p.dirtyInv = false;
      p.send('inv', p.invData());
    }
    if (p.dirtyPet) {
      p.dirtyPet = false;
      p.send('pet', p.petData());
    }
  }

  // ---------- Vào / rời game
  join(conn, c) {
    const old = this.byName.get(c.name.toLowerCase());
    if (old) this.leave(old, 'Nhân vật đăng nhập từ nơi khác.');
    const p = new Player(this, conn, c);
    c.lastLogin = Date.now();
    if (c.hp <= 0) c.hp = Math.round(p.s.maxHp * 0.5);
    if (c.hp > p.s.maxHp) c.hp = p.s.maxHp;
    if (c.mp > p.s.maxMp) c.mp = p.s.maxMp;
    if (c.clan && !this.db.clans[c.clan]) c.clan = null;
    this.players.set(p.id, p);
    this.byName.set(c.name.toLowerCase(), p);
    this.enterMap(p, c.map, c.x, c.y);
    p.send('inv', p.invData());
    p.send('chat', { ch: 'sys', msg: `Chào mừng ${c.name} đến với thế giới Ninja! Hiện có ${this.players.size} người đang online.` });
    if (c.clan) this.social.clanBroadcast(c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${c.name} đã online.` }, p);
    if (this.config.motd) p.send('chat', { ch: 'sys', msg: this.config.motd });
    p.send('chat', { ch: 'sys', msg: this.golden ? 'Đang trong GIỜ VÀNG: nhân đôi kinh nghiệm!' : 'Giờ Vàng nhân đôi EXP: 12h-13h và 20h-22h hằng ngày.' });
    const ev = this.event.info();
    p.send('event', ev);
    if (ev.on) p.send('chat', { ch: 'sys', msg: `${ev.title}: ${ev.name} đang ở ${ev.mapName}, còn ${Math.ceil(ev.left / 60000)} phút!` });
    const ss = this.season.cur();
    p.send('season', this.season.info());
    if (ss) p.send('chat', { ch: 'sys', msg: `Sự kiện ${ss.name} đang diễn ra! Săn quái nhặt ${ITEM_NAME(ss.token)} rồi đổi quà ở Sứ Giả Lễ Hội trong làng.` });
    const mb = mailSummary(c.mail);
    if (mb.n || mb.g) p.notice(mb.g ? `Bạn có ${mb.g} thư chứa quà chưa nhận. Mở Hộp Thư (nút phong thư trên menu) để nhận.` : `Bạn có ${mb.n} thư chưa đọc.`, mb.g ? 'reward' : 'info');
    if (p.expiredNames.length) p.notice(`Hết hạn sử dụng: ${p.expiredNames.join(', ')}.`, 'warn');
    this.social.onJoin(p);
    this.arena.onJoin(p);
    return p;
  }

  leave(p, reason) {
    if (!this.players.has(p.id)) return;
    this.social.onLeave(p);
    if (p.map) {
      this.persistPos(p);
      p.map.remove(p);
    }
    this.arena.onLeave(p);
    if (p.dead) {
      p.c.hp = 1;
      p.c.map = CLASSES[p.c.cls].village;
      p.c.x = MAPS[p.c.map].spawnX;
      p.c.y = GROUND;
    }
    this.db.putChar(p.c);
    this.players.delete(p.id);
    if (this.byName.get(p.name.toLowerCase()) === p) this.byName.delete(p.name.toLowerCase());
    if (reason) p.send('kicked', { msg: reason });
    p.conn.player = null;
  }

  persistPos(p) {
    if (!p.map) return;
    if (p.map.def.instance) {
      // lôi đài: lưu chỗ đứng trước trận (server tắt giữa trận thì vào lại đúng chỗ cũ)
      const b = p.arenaBack;
      p.c.map = b && this.maps[b.map] ? b.map : CLASSES[p.c.cls].village;
      p.c.x = b && b.x != null ? b.x : MAPS[p.c.map].spawnX;
      p.c.y = GROUND;
      return;
    }
    p.c.map = p.map.id;
    p.c.x = Math.round(p.x);
    p.c.y = Math.round(p.y);
  }

  sendHome(p) {
    const v = CLASSES[p.c.cls].village;
    this.enterMap(p, v, MAPS[v].spawnX, GROUND);
  }

  startDungeon(players) {
    const d = new Dungeon(this, players);
    this.dungeons.set(d.id, d);
    d.enter(players);
    return d;
  }

  enterMap(p, mapId, x, y) {
    const map = typeof mapId === 'object' ? mapId : this.maps[mapId] || this.maps[CLASSES[p.c.cls].village];
    this.arena.onEnterMap(p, map);
    if (p.map) p.map.remove(p);
    p.x = Math.max(20, Math.min(map.def.w - 20, x == null ? map.def.spawnX : x));
    p.y = y == null ? GROUND : Math.max(0, Math.min(GROUND, y));
    p.c.map = map.def.instance ? p.c.map : map.id;
    p.moveGrace = Date.now() + 1500;
    p.lastMoveAt = Date.now();
    p.airAt = 0;
    p.baseY = p.y;
    if (p.duel) this.social.cancelDuel(p, 'Rời bản đồ, trận thách đấu bị hủy.');
    if (p.trade) this.social.cancelTrade(p, 'Giao dịch bị hủy.');
    if (map.def.town && p.pkMode) p.pkMode = false;
    map.add(p);
    p.checkQuestState();
    const snap = map.snapshot();
    p.send('enterMap', { map: map.def.id, x: Math.round(p.x), y: Math.round(p.y), me: p.selfData(), ...snap });
    this.social.sendParty(p);
  }

  changeMap(p, mapId, x) {
    if (!this.maps[mapId]) return;
    this.enterMap(p, mapId, x, GROUND);
  }

  // ---------- Tiện ích
  broadcastAll(t, d) {
    const msg = JSON.stringify({ t, ...d });
    for (const p of this.players.values()) p.conn.sendRaw(msg);
  }

  announce(msg, kind) {
    this.broadcastAll('notice', { msg, kind: kind || 'world' });
    this.broadcastAll('chat', { ch: 'sys', msg });
  }

  onLevelUp(p) {
    if (p.map) p.map.broadcast('levelUp', { id: p.id, lv: p.lv });
    p.notice(`Chúc mừng! Bạn đã đạt cấp ${p.lv}. Nhận 5 điểm tiềm năng và 1 điểm kỹ năng.`, 'level');
    if (p.lv % 10 === 0) this.announce(`${p.name} đã đạt cấp ${p.lv}!`, 'world');
  }

  clanView(id, charName) {
    const cl = this.db.clans[id];
    if (!cl) return null;
    const me = charName ? cl.members[charName.toLowerCase()] : null;
    return { id, name: cl.name, leader: cl.leader, rank: me ? me.rank : 'member', count: Object.keys(cl.members).length, notice: cl.notice || '' };
  }

  computeRank() {
    const all = Object.values(this.db.chars);
    for (const p of this.players.values()) {
      const i = all.findIndex((c) => c.name === p.c.name);
      if (i >= 0) all[i] = p.c;
    }
    const total = (c) => {
      let t = 0;
      for (let l = 1; l < c.level; l++) t += expNeed(l);
      return t + c.exp;
    };
    const level = all
      .map((c) => ({ name: c.name, cls: c.cls, level: c.level, exp: total(c), clan: c.clan && this.db.clans[c.clan] ? this.db.clans[c.clan].name : '' }))
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 30);
    const clans = Object.entries(this.db.clans).map(([id, cl]) => {
      const names = Object.keys(cl.members);
      const lv = names.reduce((s, n) => {
        const c = this.byName.get(n) ? this.byName.get(n).c : this.db.getChar(n);
        return s + (c ? c.level : 0);
      }, 0);
      return { name: cl.name, leader: cl.leader, members: names.length, power: lv };
    }).sort((a, b) => b.power - a.power).slice(0, 20);
    const pk = all.filter((c) => (c.kills || 0) > 0).map((c) => ({ name: c.name, cls: c.cls, level: c.level, kills: c.kills })).sort((a, b) => b.kills - a.kills).slice(0, 20);
    this.rankCache = { level, clan: clans, kills: pk, arena: [], at: Date.now() };
    this.arena.computeRank();
  }

  saveAll() {
    for (const p of this.players.values()) {
      this.persistPos(p);
      this.db.putChar(p.c);
    }
    this.db.save();
  }

  handle(p, msg) {
    this.actions.handle(p, msg);
  }
}

module.exports = { World };
