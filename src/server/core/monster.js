'use strict';

const { MONSTERS, RAGE } = require('../../shared/data/monsters');
const { GROUND } = require('../../shared/data/maps');

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
    // chiêu boss: đang niệm (cast), hồi chiêu từng chiêu (skCd), khoảng nghỉ giữa hai chiêu (nextSkill)
    this.cast = null;
    this.skCd = [];
    this.nextSkill = 0;
    this.engaged = false;
    this.rage = false;
  }

  pub() {
    const o = { id: this.id, k: this.k, x: Math.round(this.x), y: Math.round(this.y), dir: this.dir, hp: this.hp, mhp: this.maxHp };
    if (this.rage) o.rage = 1;
    // người vào bản đồ giữa lúc boss đang niệm vẫn thấy vùng cảnh báo
    if (this.cast) o.cast = { ...this.castPub(this.cast), dur: Math.max(0, this.cast.at - Date.now()) };
    return o;
  }

  castPub(c) {
    const sk = c.sk;
    const o = { id: this.id, k: sk.k, name: sk.name, shape: sk.shape, x: Math.round(c.x), y: Math.round(c.y), r: sk.r, dir: c.dir };
    if (c.pts) o.pts = c.pts.map((p) => [Math.round(p[0]), Math.round(p[1])]);
    if (sk.w) o.w = sk.w;
    return o;
  }

  // Số quái con còn sống do boss này gọi ra
  minions() {
    let n = 0;
    for (const o of this.map.monsters.values()) if (o.master === this.id && !o.dead) n++;
    return n;
  }

  // Chọn một chiêu dùng được với mục tiêu t (đủ tầm, hết hồi chiêu); null nếu không có
  pickSkill(t, now) {
    const list = this.def.skills || [];
    const ok = [];
    const adx = Math.abs(t.x - this.x);
    list.forEach((sk, i) => {
      if ((this.skCd[i] || 0) > now) return;
      if (sk.k === 'summon') {
        if (this.minions() >= sk.extra.n * 2) return;
      } else if (sk.shape === 'pillar') {
        if (adx > 320) return;
      } else if (sk.shape === 'line') {
        if (adx > sk.r || Math.abs(t.y - this.y) > 40) return;
      } else if (adx > sk.r * 0.9) return;
      ok.push(i);
    });
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : -1;
  }

  // Bắt đầu niệm chiêu: chốt vị trí vùng đánh ngay lúc này, sát thương tính sau windup
  startCast(i, t, now) {
    const sk = this.def.skills[i];
    const dir = t.x >= this.x ? 1 : -1;
    const windup = Math.round(sk.windup * (this.rage ? RAGE.windup : 1));
    const c = { sk, i, x: this.x, y: this.y, dir, at: now + windup };
    if (sk.shape === 'pillar') {
      // cột đầu nhắm mục tiêu, các cột sau nhắm người chơi gần nhất khác (thiếu thì rải quanh mục tiêu)
      const near = [...this.map.players.values()].filter((p) => !p.dead && p !== t && Math.abs(p.x - this.x) < 360)
        .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x));
      const pts = [[t.x, t.y]];
      for (let k = 1; k < sk.extra.n; k++) {
        const p = near[k - 1];
        pts.push(p ? [p.x, p.y] : [t.x + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 70, t.y]);
      }
      const w = this.map.def.w;
      for (const p of pts) p[0] = clamp(p[0], 20, w - 20);
      c.pts = pts;
      c.x = pts[0][0];
      c.y = pts[0][1];
    }
    this.cast = c;
    this.dir = dir;
    this.st = 2;
    this.stUntil = c.at;
    this.skCd[i] = now + sk.cd * (this.rage ? RAGE.cd : 1);
    this.nextSkill = c.at + (this.rage ? 900 : 1600);
    this.nextAttack = Math.max(this.nextAttack, c.at + 500);
    this.map.broadcast('bossCast', { ...this.castPub(c), dur: windup });
  }

  // Máu dưới ngưỡng: vào trạng thái cuồng nộ (chỉ một lần mỗi lượt sống)
  checkRage() {
    if (this.rage || !this.boss || this.hp > this.maxHp * RAGE.hp) return;
    this.rage = true;
    this.map.broadcast('mRage', { id: this.id, on: 1 });
    this.map.broadcast('notice', { msg: `${this.def.name} nổi cuồng nộ!`, kind: 'boss' });
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
      if (!this.noRespawn && now >= this.respawnAt) this.respawn();
      return;
    }
    const d = this.def;
    const players = this.map.players;
    // đang niệm chiêu: đứng yên giữ tư thế, hết windup thì tung chiêu
    if (this.cast) {
      if (now < this.cast.at) return;
      const c = this.cast;
      this.cast = null;
      this.st = 0;
      this.map.world.combat.bossSkillHit(this, c);
      return;
    }
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
    const speed = d.speed * (now < this.slowUntil ? 0.45 : 1) * (this.rage ? RAGE.speed : 1);
    // vừa phát hiện mục tiêu: chờ một nhịp rồi mới ra chiêu đầu
    if (!t) this.engaged = false;
    else if (!this.engaged) {
      this.engaged = true;
      this.nextSkill = Math.max(this.nextSkill, now + 2200);
    }
    if (t && d.skills && d.skills.length && now >= this.nextSkill && !this.map.def.town) {
      const i = this.pickSkill(t, now);
      if (i >= 0) return this.startCast(i, t, now);
    }
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
          this.nextAttack = now + d.atkCd * (now < this.slowUntil ? 1.4 : 1) * (this.rage ? RAGE.atkCd : 1);
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
