'use strict';

const { GameMap } = require('./map');
const { MAPS, GROUND } = require('../data/maps');
const { MONSTERS } = require('../data/monsters');
const { expNeed } = require('./player');

const WAVES = 5;
const TIME_LIMIT = 10 * 60 * 1000;
const DAILY_RUNS = 3;
const MIN_LV = 10;

// Quái thường có xuất hiện ngoài thế giới (dùng làm nguồn quái cho phó bản)
const FIELD_MOBS = new Set();
for (const id in MAPS) for (const s of MAPS[id].spawns) FIELD_MOBS.add(s.m);

function pickPool(level) {
  const list = [...FIELD_MOBS].filter((k) => MONSTERS[k].lv <= level + 2);
  list.sort((a, b) => Math.abs(MONSTERS[a].lv - level) - Math.abs(MONSTERS[b].lv - level));
  return list.slice(0, 3).length ? list.slice(0, 3) : ['slime'];
}

function pickBoss(level) {
  const bosses = Object.keys(MONSTERS).filter((k) => MONSTERS[k].boss);
  bosses.sort((a, b) => Math.abs(MONSTERS[a].lv - level) - Math.abs(MONSTERS[b].lv - level));
  return bosses[0];
}

class Dungeon {
  constructor(world, members) {
    this.world = world;
    this.id = world.nextDungeon++;
    this.map = new GameMap(world, MAPS.dungeon);
    this.map.id = `dungeon#${this.id}`;
    this.map.dungeon = this;
    this.level = Math.round(members.reduce((s, p) => s + p.lv, 0) / members.length);
    this.pool = pickPool(this.level);
    this.boss = pickBoss(this.level);
    this.wave = 0;
    this.state = 'start';
    this.created = Date.now();
    this.nextAt = this.created + 4000;
    this.endsAt = this.created + TIME_LIMIT;
    this.closeAt = 0;
    this.lastStatus = 0;
    this.memberNames = members.map((p) => p.name);
  }

  enter(players) {
    players.forEach((p, i) => this.world.enterMap(p, this.map, 90 + i * 14));
    this.map.broadcast('notice', { msg: `Hang Động Thử Thách (cấp ${this.level}): vượt qua ${WAVES} đợt quái trong 10 phút!`, kind: 'quest' });
  }

  spawn(key, opts = {}) {
    const def = MAPS.dungeon;
    let spawn;
    if (!opts.boss && Math.random() < 0.3) {
      const pl = def.platforms[Math.floor(Math.random() * def.platforms.length)];
      spawn = { m: key, x1: pl[0] + 8, x2: pl[0] + pl[2] - 8, y: pl[1] };
    } else {
      const cx = opts.boss ? 760 : 260 + Math.random() * (def.w - 380);
      spawn = { m: key, x1: Math.max(180, cx - 120), x2: Math.min(def.w - 60, cx + 120), y: GROUND };
    }
    const m = this.map.addMonster(key, spawn, false);
    m.noRespawn = true;
    this.map.broadcast('mSpawn', m.pub());
    return m;
  }

  spawnWave() {
    this.wave++;
    if (this.wave === WAVES) {
      this.spawn(this.boss, { boss: true });
      for (let i = 0; i < 4; i++) this.spawn(this.pool[i % this.pool.length]);
      this.map.broadcast('notice', { msg: `Đợt cuối: ${MONSTERS[this.boss].name} xuất hiện!`, kind: 'boss' });
    } else {
      const n = 6 + this.wave * 2 + Math.min(4, this.map.players.size - 1) * 2;
      for (let i = 0; i < n; i++) this.spawn(this.pool[Math.floor(Math.random() * this.pool.length)]);
      this.map.broadcast('notice', { msg: `Đợt ${this.wave}/${WAVES}`, kind: 'quest' });
    }
    this.state = 'fight';
  }

  status(now) {
    this.map.broadcast('dungeon', { wave: this.wave, waves: WAVES, left: Math.max(0, this.endsAt - now), state: this.state });
  }

  update(now) {
    if (now - this.lastStatus > 1000) {
      this.lastStatus = now;
      this.status(now);
    }
    if (this.map.players.size === 0 && now - this.created > 8000) return this.destroy();
    if (this.state === 'done') {
      if (now >= this.closeAt) this.destroy();
      return;
    }
    if (now > this.endsAt) {
      this.map.broadcast('notice', { msg: 'Hết thời gian! Thử thách thất bại.', kind: 'warn' });
      this.state = 'done';
      this.closeAt = now + 6000;
      return;
    }
    if (this.state === 'start' && now >= this.nextAt) return this.spawnWave();
    if (this.state === 'wait' && now >= this.nextAt) return this.spawnWave();
    if (this.state === 'fight') {
      let alive = false;
      for (const m of this.map.monsters.values()) if (!m.dead) alive = true;
      if (alive) return;
      for (const m of [...this.map.monsters.values()]) if (m.dead) this.map.monsters.delete(m.id);
      if (this.wave >= WAVES) return this.complete(now);
      this.state = 'wait';
      this.nextAt = now + 3500;
      this.map.broadcast('notice', { msg: `Hoàn thành đợt ${this.wave}! Đợt tiếp theo sau 3 giây...`, kind: 'reward' });
    }
  }

  complete(now) {
    this.state = 'done';
    this.closeAt = now + 20000;
    const stone = this.level < 30 ? 'stone1' : this.level < 60 ? 'stone2' : 'stone3';
    for (const p of this.map.players.values()) {
      const exp = Math.round(expNeed(p.lv) * 0.22);
      const xu = 1000 + this.level * 300;
      const got = p.gainExp(exp);
      p.gainXu(xu);
      p.addItem('chest', 1);
      p.addItem(stone, 3);
      p.notice(`Vượt qua Hang Động! +${got.toLocaleString('vi-VN')} EXP, +${xu.toLocaleString('vi-VN')} xu, Rương Báu, 3 ${stone === 'stone1' ? 'Đá Sơ' : stone === 'stone2' ? 'Đá Trung' : 'Đá Cao'}.`, 'reward');
    }
    this.map.broadcast('chat', { ch: 'sys', msg: 'Thử thách hoàn thành! Hang động sẽ đóng sau 20 giây (đi về cổng bên trái để ra ngay).' });
    this.world.announce(`Nhóm của ${this.memberNames[0]} đã vượt qua Hang Động Thử Thách cấp ${this.level}!`, 'world');
  }

  destroy() {
    for (const p of [...this.map.players.values()]) this.world.sendHome(p);
    this.world.dungeons.delete(this.id);
  }
}

module.exports = { Dungeon, DAILY_RUNS, MIN_LV, WAVES };
