'use strict';

// Hang Động Thử Thách (phó bản theo nhóm): NPC, lượt vào mỗi ngày, các đợt quái + boss
const { GameMap } = require('../../core/map');
const { MAPS, GROUND } = require('../../../shared/data/maps');
const { MONSTERS } = require('../../../shared/data/monsters');
const { expNeed, vnDay } = require('../../../shared/formulas');
const { dialog } = require('../../core/npc');

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
  const bosses = Object.keys(MONSTERS).filter((k) => MONSTERS[k].boss && !MONSTERS[k].event);
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
    const stone = this.level < 30 ? 'stone1' : this.level < 60 ? 'stone2' : this.level < 90 ? 'stone3' : 'stone4';
    for (const p of this.map.players.values()) {
      const exp = Math.round(expNeed(p.lv) * 0.22);
      const xu = 1000 + this.level * 300;
      const got = p.gainExp(exp);
      p.gainXu(xu);
      p.addItem('chest', 1);
      p.addItem(stone, 3);
      p.onDungeonClear();
      p.notice(`Vượt qua Hang Động! +${got.toLocaleString('vi-VN')} EXP, +${xu.toLocaleString('vi-VN')} xu, Rương Báu, 3 ${stone === 'stone1' ? 'Đá Sơ' : stone === 'stone2' ? 'Đá Trung' : stone === 'stone3' ? 'Đá Cao' : 'Đá Thần'}.`, 'reward');
    }
    this.map.broadcast('chat', { ch: 'sys', msg: 'Thử thách hoàn thành! Hang động sẽ đóng sau 20 giây (đi về cổng bên trái để ra ngay).' });
    this.world.announce(`Nhóm của ${this.memberNames[0]} đã vượt qua Hang Động Thử Thách cấp ${this.level}!`, 'world');
  }

  destroy() {
    for (const p of [...this.map.players.values()]) this.world.sendHome(p);
    this.world.dungeons.delete(this.id);
  }
}

// Danh sách phó bản đang mở nằm ở world.dungeons (Dungeon tự xóa mình khi đóng)
class Dungeons {
  constructor(world) {
    this.world = world;
    world.dungeons = new Map();
    world.nextDungeon = 1;
  }

  dungeonDay(c) {
    const today = vnDay();
    if (!c.dungeon || c.dungeon.day !== today) c.dungeon = { day: today, runs: 0 };
    return c.dungeon;
  }

  dungeonDialog(p, n) {
    const left = DAILY_RUNS - this.dungeonDay(p.c).runs;
    const text = `Hang Động Thử Thách: ${WAVES} đợt quái và 1 boss trong 10 phút. Quái mạnh theo cấp trung bình của nhóm.\n`
      + `Yêu cầu cấp ${MIN_LV}. Lượt còn lại hôm nay: ${left}/${DAILY_RUNS}.\nTrưởng nhóm sẽ đưa các thành viên đứng gần vào cùng.\n`
      + 'Phần thưởng: nhiều EXP, xu, Rương Báu và đá cường hóa.';
    const opts = left > 0 && p.lv >= MIN_LV ? [{ a: 'enter', label: p.party ? 'Vào hang cùng nhóm' : 'Vào hang' }] : [];
    dialog(p, n, text, opts);
  }

  enterDungeon(p) {
    if (p.lv < MIN_LV) return p.notice(`Cần đạt cấp ${MIN_LV}.`, 'warn');
    if (p.party && p.party.leader !== p.id) return p.notice('Chỉ trưởng nhóm mới mở được hang động.', 'warn');
    if (this.dungeonDay(p.c).runs >= DAILY_RUNS) return p.notice('Hôm nay bạn đã hết lượt vào hang.', 'warn');
    let members = [p];
    if (p.party) {
      members = [];
      for (const id of p.party.members) {
        const o = this.world.players.get(id);
        if (!o || o.map !== p.map || o.dead || Math.abs(o.x - p.x) > 300) continue;
        if (o.lv < MIN_LV || this.dungeonDay(o.c).runs >= DAILY_RUNS) {
          o.notice('Bạn không đủ điều kiện vào hang (cấp hoặc hết lượt).', 'warn');
          continue;
        }
        members.push(o);
      }
    }
    for (const o of members) {
      this.dungeonDay(o.c).runs++;
      o.markMe();
      if (o.trade) this.world.mods.trade.cancelTrade(o, 'Giao dịch bị hủy.');
    }
    this.start(members);
  }

  start(players) {
    const d = new Dungeon(this.world, players);
    this.world.dungeons.set(d.id, d);
    d.enter(players);
    return d;
  }
}

module.exports = {
  name: 'dungeon',
  init: (world) => new Dungeons(world),
  npcs: {
    dungeon: {
      open(p, n) { this.dungeonDialog(p, n); },
      act(p, n, a) { if (a === 'enter') this.enterDungeon(p); },
    },
  },
  hooks: {
    update(dt, now) {
      for (const d of [...this.world.dungeons.values()]) {
        d.map.update(dt, now);
        d.update(now);
      }
    },
    sendState() {
      for (const d of this.world.dungeons.values()) d.map.sendState();
    },
  },
  Dungeon, Dungeons, DAILY_RUNS, MIN_LV, WAVES,
};
