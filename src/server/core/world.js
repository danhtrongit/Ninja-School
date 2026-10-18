'use strict';

const { MAPS, GROUND } = require('../../shared/data/maps');
const { CLASSES } = require('../../shared/data/classes');
const { expNeed } = require('../../shared/formulas');
const { GameMap } = require('./map');
const { Player } = require('./player');
const { Combat } = require('./combat');
const hooks = require('./modules');

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
    this.rankCache = { level: [], clan: [], at: 0 };
    // module tính năng (world.mods[tên]) và bảng hành động; trùng tên hành động thì báo lỗi ngay khi khởi động
    this.router = hooks.initWorld(this);
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

  // tắt máy: chép vị trí người còn online rồi xả hết hàng đợi lưu bằng ghi đồng bộ
  stop() {
    clearInterval(this.timer);
    clearInterval(this.saveTimer);
    this.saveAll();
    this.db.flushAllSync();
  }

  // ---------- Vòng lặp chính
  tick() {
    const now = Date.now();
    const dt = Math.min(0.2, (now - this.last) / 1000);
    this.last = now;
    this.tickN++;
    for (const id in this.maps) this.maps[id].update(dt, now);
    // bản đồ riêng của module (phó bản, phòng lôi đài)
    this.emit('update', dt, now);
    if (this.tickN % 2 === 0) {
      for (const id in this.maps) this.maps[id].sendState();
      this.emit('sendState');
    }
    if (this.tickN % 20 === 0) this.secondTick(now);
    this.emit('tick', now, this.tickN);
    // lưu theo nhân vật: ghi phần bẩn, tối đa 8 ms / 20 bản ghi mỗi tick
    if (this.db.flushTick) this.db.flushTick(now);
    if (this.tickN % 1200 === 0) this.computeRank();
    for (const p of this.players.values()) this.flush(p);
  }

  secondTick(now) {
    const golden = this.isGoldenHour();
    if (golden !== this.golden) {
      this.golden = golden;
      this.announce(golden ? 'GIỜ VÀNG bắt đầu: nhân đôi kinh nghiệm toàn máy chủ!' : 'Giờ Vàng đã kết thúc.', 'world');
    }
    this.emit('second', now);
    for (const p of this.players.values()) {
      p.c.playtime += 1;
      if (p.c.pending.length && p.c.playtime % 3 === 0) p.deliverPending();
      // hết hạn buff, thời trang, thú đói, giảm điểm hiếu chiến...
      this.emit('playerSecond', p, now);
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
    if (this.config.motd) p.send('chat', { ch: 'sys', msg: this.config.motd });
    p.send('chat', { ch: 'sys', msg: this.golden ? 'Đang trong GIỜ VÀNG: nhân đôi kinh nghiệm!' : 'Giờ Vàng nhân đôi EXP: 12h-13h và 20h-22h hằng ngày.' });
    // gia tộc, sự kiện, lễ hội, hộp thư, bạn bè, lôi đài...
    this.emit('join', p);
    return p;
  }

  leave(p, reason) {
    if (!this.players.has(p.id)) return;
    this.emit('leave', p);
    if (p.map) {
      this.persistPos(p);
      p.map.remove(p);
    }
    this.emit('left', p);
    if (p.dead) {
      p.c.hp = 1;
      p.c.map = CLASSES[p.c.cls].village;
      p.c.x = MAPS[p.c.map].spawnX;
      p.c.y = GROUND;
    }
    this.db.putChar(p.c, true);
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

  enterMap(p, mapId, x, y) {
    const map = typeof mapId === 'object' ? mapId : this.maps[mapId] || this.maps[CLASSES[p.c.cls].village];
    this.emit('beforeEnterMap', p, map);
    if (p.map) p.map.remove(p);
    p.x = Math.max(20, Math.min(map.def.w - 20, x == null ? map.def.spawnX : x));
    p.y = y == null ? GROUND : Math.max(0, Math.min(GROUND, y));
    p.c.map = map.def.instance ? p.c.map : map.id;
    p.moveGrace = Date.now() + 1500;
    p.lastMoveAt = Date.now();
    p.airAt = 0;
    p.baseY = p.y;
    // hủy thách đấu, giao dịch
    this.emit('mapLeft', p, map);
    if (map.def.town && p.pkMode) p.pkMode = false;
    map.add(p);
    p.checkQuestState();
    const snap = map.snapshot();
    p.send('enterMap', { map: map.def.id, x: Math.round(p.x), y: Math.round(p.y), me: p.selfData(), ...snap });
    this.emit('enterMap', p);
  }

  changeMap(p, mapId, x) {
    if (!this.maps[mapId]) return;
    this.enterMap(p, mapId, x, GROUND);
  }

  // ---------- Tiện ích
  // Gọi điểm móc của các module (core/modules.js)
  emit(name, ...args) {
    hooks.emit(this, name, ...args);
  }

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
    this.emit('rank');
  }

  // 30 giây một lần: chép vị trí và đánh dấu bẩn người online; ghi xuống đĩa do db.flushTick() trong tick
  saveAll() {
    for (const p of this.players.values()) {
      this.persistPos(p);
      this.db.putChar(p.c);
    }
  }

  handle(p, msg) {
    this.router.handle(p, msg);
  }
}

module.exports = { World };
