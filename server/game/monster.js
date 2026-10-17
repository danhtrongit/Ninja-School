'use strict';

const { MONSTERS } = require('../data/monsters');
const { GROUND } = require('../data/maps');

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

class Monster {
  constructor(map, key, spawn, startDead) {
    this.map = map;
    this.id = map.world.nextMid++;
    this.k = key;
    this.def = MONSTERS[key];
    this.spawn = spawn;
    this.onPlatform = spawn.y !== GROUND;
    this.boss = !!this.def.boss;
    this.reset();
    if (startDead) {
      this.dead = true;
      this.respawnAt = Date.now() + (this.boss ? 45000 : 1000);
    }
  }

  reset() {
    const d = this.def;
    this.maxHp = d.hp;
    this.hp = d.hp;
    this.x = rand(this.spawn.x1, this.spawn.x2);
    this.y = this.spawn.y;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.st = 0;
    this.stUntil = 0;
    this.dead = false;
    this.target = 0;
    this.dmgBy = new Map();
    this.nextAttack = 0;
    this.wanderAt = 0;
    this.dest = this.x;
    this.slowUntil = 0;
    this.aggroCheck = 0;
    this.leashOut = 0;
  }

  pub() {
    return { id: this.id, k: this.k, x: Math.round(this.x), y: Math.round(this.y), dir: this.dir, hp: this.hp, mhp: this.maxHp };
  }

  bounds() {
    if (this.onPlatform) return [this.spawn.x1, this.spawn.x2];
    const pad = this.boss ? 120 : 70;
    return [Math.max(40, this.spawn.x1 - pad), Math.min(this.map.def.w - 40, this.spawn.x2 + pad)];
  }

  respawn() {
    this.reset();
    this.map.broadcast('mSpawn', this.pub());
    if (this.boss) this.map.world.announce(`Boss ${this.def.name} (cấp ${this.def.lv}) đã xuất hiện tại ${this.map.def.name}!`, 'boss');
  }

  aggroOn(p) {
    if (!this.target) this.target = p.id;
  }

  update(dt, now) {
    if (this.dead) {
      if (now >= this.respawnAt) this.respawn();
      return;
    }
    const d = this.def;
    const players = this.map.players;
    let t = this.target ? players.get(this.target) : null;
    if (t && (t.dead || Math.abs(t.x - this.x) > 500)) {
      t = null;
      this.target = 0;
    }
    if (!t && d.aggro && now >= this.aggroCheck) {
      this.aggroCheck = now + 400;
      let best = null;
      let bd = 120;
      const [lo, hi] = this.bounds();
      for (const p of players.values()) {
        if (p.dead || p.x < lo - 60 || p.x > hi + 60) continue;
        const dx = Math.abs(p.x - this.x);
        if (dx < bd && Math.abs(p.y - this.y) < 50 + d.h * 0.5) {
          bd = dx;
          best = p;
        }
      }
      if (best) {
        t = best;
        this.target = best.id;
      }
    }
    const speed = d.speed * (now < this.slowUntil ? 0.45 : 1);
    if (now > this.stUntil && this.st === 2) this.st = 0;
    const [lo, hi] = this.bounds();

    if (t) {
      const dx = t.x - this.x;
      const adx = Math.abs(dx);
      const dy = Math.abs((t.y - 11) - (this.y - d.h / 2));
      this.dir = dx >= 0 ? 1 : -1;
      const range = d.atkRange + d.w * 0.5 + 4;
      if (adx > range) {
        const nx = this.x + Math.sign(dx) * speed * 1.35 * dt;
        if (nx < lo || nx > hi) {
          this.x = clamp(nx, lo, hi);
          if (this.st !== 2) this.st = 0;
          if (!this.leashOut) this.leashOut = now;
          if (now - this.leashOut > 3500) {
            this.target = 0;
            this.leashOut = 0;
            if (!this.boss) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
          }
        } else {
          this.leashOut = 0;
          this.x = nx;
          if (this.st !== 2) this.st = 1;
        }
      } else if (dy < (d.ranged ? 100 : 44) + d.h * 0.5 * (this.boss ? 1 : 0.6)) {
        this.leashOut = 0;
        if (this.st !== 2) this.st = 0;
        if (now >= this.nextAttack) {
          this.nextAttack = now + d.atkCd * (now < this.slowUntil ? 1.4 : 1);
          this.st = 2;
          this.stUntil = now + 350;
          this.map.world.combat.monsterAttack(this, t);
        }
      } else if (this.st !== 2) {
        this.st = 0;
      }
    } else {
      if (now >= this.wanderAt) {
        this.wanderAt = now + 1500 + Math.random() * 3000;
        this.dest = Math.random() < 0.35 ? this.x : rand(this.spawn.x1, this.spawn.x2);
      }
      const dx = this.dest - this.x;
      if (Math.abs(dx) > 2) {
        this.dir = dx > 0 ? 1 : -1;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 0.5 * dt);
        this.st = 1;
      } else if (this.st !== 2) {
        this.st = 0;
      }
      if (this.hp < this.maxHp && !this.boss) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02 * dt);
    }
    this.x = clamp(this.x, lo, hi);
  }
}

module.exports = { Monster };
