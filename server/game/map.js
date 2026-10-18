'use strict';

const { Monster } = require('./monster');
const { ITEMS } = require('../data/items');
const { GROUND } = require('../data/maps');

const ITEM_LIFE = 60000;
const OWNER_TIME = 15000;

class GameMap {
  constructor(world, def) {
    this.world = world;
    this.def = def;
    this.id = def.id;
    this.players = new Map();
    this.monsters = new Map();
    this.ground = new Map();
    for (const sp of def.spawns) this.addMonster(sp.m, sp, false);
    for (const b of def.boss || []) this.addMonster(b.m, { m: b.m, x1: b.x - 280, x2: b.x + 280, y: GROUND }, true);
  }

  addMonster(key, spawn, startDead) {
    const m = new Monster(this, key, spawn, startDead);
    this.monsters.set(m.id, m);
    return m;
  }

  add(p) {
    this.players.set(p.id, p);
    p.map = this;
    this.broadcast('pJoin', p.info(), p);
  }

  remove(p) {
    this.players.delete(p.id);
    const empty = this.players.size === 0;
    for (const m of this.monsters.values()) {
      if (m.target === p.id) m.target = 0;
      // bản đồ trống thì quái không chạy update: bỏ chiêu đang niệm, kẻo người vào sau trúng chiêu cũ không báo trước
      if (empty && m.cast) {
        m.cast = null;
        m.st = 0;
      }
    }
    this.broadcast('pLeave', { id: p.id }, p);
    if (p.map === this) p.map = null;
  }

  snapshot() {
    return {
      players: [...this.players.values()].map((p) => p.info()),
      monsters: [...this.monsters.values()].filter((m) => !m.dead).map((m) => m.pub()),
      items: [...this.ground.values()].map((g) => this.groundPub(g)),
    };
  }

  broadcast(t, d, except) {
    const msg = JSON.stringify({ t, ...d });
    for (const p of this.players.values()) if (p !== except) p.conn.sendRaw(msg);
  }

  groundPub(g) {
    return { id: g.id, k: g.xu ? 'xu' : g.it.id, q: g.xu || g.it.q, r: g.it ? g.it.r || 0 : 0, x: Math.round(g.x), y: Math.round(g.y) };
  }

  dropItem(it, xu, x, y, owner) {
    const g = {
      id: this.world.nextGid++, it, xu, x: Math.max(20, Math.min(this.def.w - 20, x)), y,
      owner, ownerUntil: Date.now() + OWNER_TIME, expire: Date.now() + ITEM_LIFE,
    };
    this.ground.set(g.id, g);
    this.broadcast('gAdd', this.groundPub(g));
    return g;
  }

  canPick(p, g, now) {
    if (!g.owner || now > g.ownerUntil || g.owner === p.name) return true;
    if (p.party) {
      for (const id of p.party.members) {
        const o = this.world.players.get(id);
        if (o && o.name === g.owner) return true;
      }
    }
    return false;
  }

  tryPickup(p, g, now, manual) {
    if (!this.canPick(p, g, now)) {
      if (manual) p.notice('Vật phẩm này thuộc về người khác.');
      return false;
    }
    if (g.xu) {
      p.gainXu(g.xu);
      p.send('loot', { k: 'xu', q: g.xu });
    } else {
      if (!p.addItemObj(g.it)) {
        if (manual || now - p.lastFullNotice > 5000) {
          p.lastFullNotice = now;
          p.notice('Hành trang đã đầy!', 'warn');
        }
        return false;
      }
      p.send('loot', { k: g.it.id, q: g.it.q, r: g.it.r || 0 });
    }
    this.ground.delete(g.id);
    this.broadcast('gDel', { id: g.id, by: p.id });
    return true;
  }

  update(dt, now) {
    if (this.players.size === 0) {
      // Bản đồ trống: chỉ xử lý hồi sinh quái/boss để tiết kiệm CPU
      for (const m of this.monsters.values()) if (m.dead && !m.noRespawn && now >= m.respawnAt) m.respawn();
      for (const g of this.ground.values()) if (now > g.expire) this.ground.delete(g.id);
      return;
    }
    for (const m of this.monsters.values()) m.update(dt, now);
    for (const g of this.ground.values()) {
      if (now > g.expire) {
        this.ground.delete(g.id);
        this.broadcast('gDel', { id: g.id });
        continue;
      }
      for (const p of this.players.values()) {
        if (p.dead) continue;
        if (Math.abs(p.x - g.x) < 18 && Math.abs(p.y - g.y) < 30) {
          if (this.tryPickup(p, g, now, false)) break;
        }
      }
    }
  }

  sendState() {
    if (this.players.size === 0) return;
    const ps = [];
    for (const p of this.players.values()) {
      ps.push([p.id, Math.round(p.x), Math.round(p.y), p.dir, p.st, Math.round(p.c.hp), p.s.maxHp, (p.dead ? 1 : 0) | (p.pkMode ? 2 : 0)]);
    }
    const ms = [];
    for (const m of this.monsters.values()) {
      if (m.dead) continue;
      ms.push([m.id, Math.round(m.x), Math.round(m.y), m.dir, m.st, Math.ceil(m.hp)]);
    }
    const msg = JSON.stringify({ t: 'state', p: ps, m: ms });
    for (const p of this.players.values()) p.conn.sendRaw(msg);
  }

  findNpc(id) {
    return this.def.npcs.find((n) => n.id === id);
  }
}

module.exports = { GameMap, ITEMS };
