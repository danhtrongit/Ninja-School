'use strict';

const { CLASSES, BASE_STATS, ELEMENTS } = require('../data/classes');
const { SKILLS, basicSkill, classSkills } = require('../data/skills');
const { ITEMS, makeItem, itemStats, SLOTS } = require('../data/items');
const { MAPS, GROUND } = require('../data/maps');
const { MAIN_QUESTS } = require('../data/quests');

const INV_SIZE = 40;
const STORAGE_SIZE = 60;
const MAX_LEVEL = 120;
const HOTBAR = 6;
// Buff lưu lâu dài (giữ khi thoát game): khóa → [chỉ số, giá trị, tên]
const PERSIST_BUFFS = {
  exp2: ['exp', 100, 'Nhân đôi EXP'],
  food_atk: ['atkPct', 10, 'Bánh Bao Sức Mạnh'],
  food_def: ['defPct', 10, 'Trà Thiết Bích'],
  food_hp: ['hpPct', 10, 'Canh Nhân Sâm'],
};
const expNeed = (lv) => Math.floor(20 * lv * lv + 80 * lv);

function newChar(name, cls, gender) {
  const cd = CLASSES[cls];
  const basic = basicSkill(cls);
  const first = classSkills(cls).find((id) => !SKILLS[id].basic && SKILLS[id].req === 1);
  const inv = new Array(INV_SIZE).fill(null);
  inv[0] = makeItem('hp1', 10);
  inv[1] = makeItem('mp1', 10);
  inv[2] = makeItem('scroll_home', 2);
  return {
    name, cls, gender: gender === 'f' ? 'f' : 'm',
    level: 1, exp: 0, xu: 1000, luong: 10,
    hp: 1e9, mp: 1e9,
    stats: { str: 5, agi: 5, int: 5, vit: 5 }, potential: 0, skillPoints: 0,
    skills: { [basic]: 1, [first]: 1 },
    hotbar: [first, null, null, null, null, null],
    inv, equip: { weapon: makeItem(`w_${cls}_0`) },
    map: cd.village, x: MAPS[cd.village].spawnX, y: GROUND,
    quest: { i: 0, st: 0, prog: 0 },
    daily: { day: '', done: 0, task: null },
    clan: null, pk: 0, kills: 0, deaths: 0,
    created: Date.now(), lastLogin: Date.now(), playtime: 0,
    buffs: {},
    settings: {},
  };
}

class Player {
  constructor(world, conn, c) {
    this.world = world;
    this.conn = conn;
    this.c = c;
    this.id = world.nextPid++;
    this.map = null;
    this.x = c.x;
    this.y = c.y;
    this.dir = 1;
    this.st = 0;
    this.dead = false;
    this.cool = {};
    this.buffs = {};
    this.lastCombat = 0;
    this.lastMoveAt = Date.now();
    this.moveGrace = 0;
    this.lastSkillAt = 0;
    this.party = null;
    this.trade = null;
    this.duel = null;
    this.pkMode = false;
    this.invites = {};
    this.lastChat = 0;
    this.lastWorldChat = 0;
    this.lastFullNotice = 0;
    this.dirtyMe = false;
    this.dirtyInv = false;
    this.sanitize();
    this.recalc();
  }

  get name() { return this.c.name; }
  get lv() { return this.c.level; }
  get el() { return CLASSES[this.c.cls].element; }

  send(t, d) { this.conn.send(t, d); }
  notice(msg, kind) { this.send('notice', { msg, kind: kind || 'info' }); }
  markMe() { this.dirtyMe = true; }
  markInv() { this.dirtyInv = true; }

  sanitize() {
    const c = this.c;
    if (!Array.isArray(c.inv)) c.inv = [];
    while (c.inv.length < INV_SIZE) c.inv.push(null);
    c.inv = c.inv.slice(0, INV_SIZE).map((it) => (it && ITEMS[it.id] ? it : null));
    c.equip = c.equip || {};
    for (const s of Object.keys(c.equip)) if (!c.equip[s] || !ITEMS[c.equip[s].id]) delete c.equip[s];
    c.skills = c.skills || {};
    c.hotbar = Array.isArray(c.hotbar) ? c.hotbar.slice(0, HOTBAR) : [];
    while (c.hotbar.length < HOTBAR) c.hotbar.push(null);
    if (c.level > MAX_LEVEL) c.level = MAX_LEVEL;
    c.quest = c.quest || { i: 0, st: 0, prog: 0 };
    c.daily = c.daily || { day: '', done: 0, task: null };
    c.buffs = c.buffs || {};
    c.settings = c.settings || {};
    c.storage = Array.isArray(c.storage) ? c.storage.map((it) => (it && ITEMS[it.id] ? it : null)) : [];
    while (c.storage.length < STORAGE_SIZE) c.storage.push(null);
    c.friends = Array.isArray(c.friends) ? c.friends : [];
    c.checkin = c.checkin || { day: '', streak: 0 };
    c.dungeon = c.dungeon || { day: '', runs: 0 };
    if (!MAPS[c.map] || MAPS[c.map].pvp || MAPS[c.map].instance) {
      c.map = CLASSES[c.cls].village;
      c.x = MAPS[c.map].spawnX;
      c.y = GROUND;
    }
  }

  recalc() {
    const c = this.c;
    const cd = CLASSES[c.cls];
    const b = cd.melee ? BASE_STATS.melee : BASE_STATS.ranged;
    const eq = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0, dodge: 0, spd: 0, str: 0, agi: 0, int: 0, vit: 0, skillDmg: 0, hit: 0, expPct: 0, hpPct: 0 };
    for (const slot of SLOTS) {
      const it = c.equip[slot];
      if (!it) continue;
      const st = itemStats(it);
      for (const k in st) eq[k] = (eq[k] || 0) + st[k];
    }
    const str = c.stats.str + eq.str;
    const agi = c.stats.agi + eq.agi;
    const int = c.stats.int + eq.int;
    const vit = c.stats.vit + eq.vit;
    const lv = c.level - 1;
    const buf = { atkPct: 0, defPct: 0, crit: 0, dodge: 0, spd: 0, hpPct: 0 };
    for (const k in this.buffs) buf[this.buffs[k].stat] = (buf[this.buffs[k].stat] || 0) + this.buffs[k].v;
    const now = Date.now();
    for (const k in PERSIST_BUFFS) {
      const [stat, v] = PERSIST_BUFFS[k];
      if ((c.buffs[k] || 0) > now && stat !== 'exp') buf[stat] = (buf[stat] || 0) + v;
    }
    const s = {
      maxHp: Math.round((b.hp + b.hpLv * lv + vit * 12 + eq.hp) * (1 + (buf.hpPct + eq.hpPct) / 100)),
      maxMp: Math.round(b.mp + b.mpLv * lv + int * 6 + eq.mp),
      atk: Math.round((b.atk + b.atkLv * lv + str * 2 + agi * 0.5 + eq.atk) * (1 + buf.atkPct / 100)),
      def: Math.round((b.def + b.defLv * lv + vit * 0.6 + eq.def) * (1 + buf.defPct / 100)),
      crit: Math.min(60, Math.round((b.crit + agi * 0.15 + eq.crit + buf.crit) * 10) / 10),
      dodge: Math.min(45, Math.round((b.dodge + agi * 0.12 + eq.dodge + buf.dodge) * 10) / 10),
      hit: Math.round(agi + eq.hit),
      spd: Math.min(60, Math.round(eq.spd + buf.spd)),
      skillDmg: Math.round((int * 0.6 + eq.skillDmg) * 10) / 10,
      expMul: Math.round(((c.buffs.exp2 || 0) > now ? 2 : 1) * (1 + eq.expPct / 100) * 100) / 100,
      str, agi, int, vit,
    };
    this.s = s;
    if (c.hp > s.maxHp) c.hp = s.maxHp;
    if (c.mp > s.maxMp) c.mp = s.maxMp;
    if (c.hp < 0) c.hp = 0;
    this.markMe();
  }

  look() {
    const e = this.c.equip;
    const t = (s) => (e[s] ? ITEMS[e[s].id].tier : -1);
    return {
      w: t('weapon'), a: t('armor'), p: t('pants'), h: t('hat'), wp: e.weapon ? e.weapon.p || 0 : 0,
      pet: e.pet && ITEMS[e.pet.id] ? ITEMS[e.pet.id].sprite : null,
    };
  }

  clanTag() {
    const cl = this.c.clan && this.world.db.clans[this.c.clan];
    return cl ? cl.name : null;
  }

  info() {
    return {
      id: this.id, name: this.c.name, cls: this.c.cls, g: this.c.gender, lv: this.c.level,
      x: Math.round(this.x), y: Math.round(this.y), dir: this.dir, hp: this.c.hp, mhp: this.s.maxHp,
      look: this.look(), clan: this.clanTag(), pk: this.c.pk, pkMode: this.pkMode, dead: this.dead,
      party: this.party ? this.party.id : 0,
    };
  }

  questView() {
    const q = this.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def) return { done: true };
    let prog = q.prog;
    if (def.kind === 'collect') prog = Math.min(def.n, this.countItem(def.item));
    if (def.kind === 'level') prog = Math.min(def.n, this.c.level);
    if (def.kind === 'upgrade') prog = Math.min(def.n, this.maxPlus());
    if (def.kind === 'visit' || def.kind === 'talk') prog = q.st === 2 ? 1 : 0;
    return { i: q.i, name: def.name, desc: def.desc, req: def.req, kind: def.kind, n: def.n || 1, prog, st: q.st, m: def.m, item: def.item, map: def.map };
  }

  maxPlus() {
    let best = 0;
    for (const s of SLOTS) if (this.c.equip[s]) best = Math.max(best, this.c.equip[s].p || 0);
    return best;
  }

  // Kiểm tra các nhiệm vụ tự hoàn thành theo trạng thái (cấp, cường hóa, bản đồ)
  checkQuestState() {
    const q = this.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || q.st !== 1) return;
    let done = false;
    if (def.kind === 'level') done = this.c.level >= def.n;
    if (def.kind === 'upgrade') done = this.maxPlus() >= def.n;
    if (def.kind === 'visit') done = !!this.map && this.map.def.id === def.map;
    if (def.kind === 'collect') done = this.countItem(def.item) >= def.n;
    if (done) {
      q.st = 2;
      this.notice(`Nhiệm vụ "${def.name}" đã hoàn thành! Hãy về gặp Trưởng Làng.`, 'quest');
      this.markMe();
    }
  }

  onDungeonClear() {
    const q = this.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || def.kind !== 'dungeon' || q.st !== 1) return;
    q.prog = Math.min(def.n, q.prog + 1);
    if (q.prog >= def.n) {
      q.st = 2;
      this.notice(`Nhiệm vụ "${def.name}" đã hoàn thành! Hãy về gặp Trưởng Làng.`, 'quest');
    }
    this.markMe();
  }

  selfData() {
    const c = this.c;
    const now = Date.now();
    const buffs = [];
    for (const k in this.buffs) buffs.push({ k, stat: this.buffs[k].stat, until: this.buffs[k].until, name: this.buffs[k].name });
    for (const k in PERSIST_BUFFS) {
      if ((c.buffs[k] || 0) > now) buffs.push({ k, stat: PERSIST_BUFFS[k][0], until: c.buffs[k], name: PERSIST_BUFFS[k][2] });
    }
    return {
      id: this.id, name: c.name, cls: c.cls, gender: c.gender, level: c.level, exp: c.exp, need: expNeed(c.level),
      xu: c.xu, luong: c.luong, hp: c.hp, mp: c.mp, s: this.s, stats: c.stats, potential: c.potential,
      skillPoints: c.skillPoints, skills: c.skills, hotbar: c.hotbar, quest: this.questView(), daily: c.daily,
      clan: c.clan ? this.world.clanView(c.clan, c.name) : null, pk: c.pk, pkMode: this.pkMode, buffs, dead: this.dead,
      kills: c.kills, look: this.look(), now, checkin: c.checkin, dungeon: c.dungeon,
    };
  }

  invData() { return { inv: this.c.inv, equip: this.c.equip }; }

  // ---------- Túi đồ
  freeSlots() { return this.c.inv.filter((x) => !x).length; }

  countItem(id) {
    let n = 0;
    for (const it of this.c.inv) if (it && it.id === id) n += it.q;
    return n;
  }

  canAdd(id, qty) {
    const def = ITEMS[id];
    if (!def) return false;
    if (def.stack) {
      let room = 0;
      for (const it of this.c.inv) {
        if (!it) room += def.stack;
        else if (it.id === id) room += def.stack - it.q;
        if (room >= qty) return true;
      }
      return room >= qty;
    }
    return this.freeSlots() >= qty;
  }

  addItem(id, qty = 1, rarity = 0) {
    const def = ITEMS[id];
    if (!def) return false;
    if (!this.canAdd(id, qty)) return false;
    if (def.stack) {
      let left = qty;
      for (const it of this.c.inv) {
        if (left <= 0) break;
        if (it && it.id === id && it.q < def.stack) {
          const n = Math.min(left, def.stack - it.q);
          it.q += n;
          left -= n;
        }
      }
      for (let i = 0; i < this.c.inv.length && left > 0; i++) {
        if (!this.c.inv[i]) {
          const n = Math.min(left, def.stack);
          this.c.inv[i] = makeItem(id, n);
          left -= n;
        }
      }
    } else {
      for (let k = 0; k < qty; k++) {
        const i = this.c.inv.indexOf(null);
        this.c.inv[i] = makeItem(id, 1, rarity);
      }
    }
    this.markInv();
    this.onInventoryChanged();
    return true;
  }

  addItemObj(it) {
    const def = ITEMS[it.id];
    if (!def) return false;
    if (def.stack) return this.addItem(it.id, it.q);
    const i = this.c.inv.indexOf(null);
    if (i < 0) return false;
    this.c.inv[i] = it;
    this.markInv();
    this.onInventoryChanged();
    return true;
  }

  removeItem(id, qty) {
    if (this.countItem(id) < qty) return false;
    let left = qty;
    for (let i = 0; i < this.c.inv.length && left > 0; i++) {
      const it = this.c.inv[i];
      if (it && it.id === id) {
        const n = Math.min(left, it.q);
        it.q -= n;
        left -= n;
        if (it.q <= 0) this.c.inv[i] = null;
      }
    }
    this.markInv();
    this.onInventoryChanged();
    return true;
  }

  removeAt(slot, qty = 1) {
    const it = this.c.inv[slot];
    if (!it) return null;
    if (it.q <= qty) {
      this.c.inv[slot] = null;
    } else {
      it.q -= qty;
    }
    this.markInv();
    this.onInventoryChanged();
    return it;
  }

  onInventoryChanged() {
    const def = MAIN_QUESTS[this.c.quest.i];
    if (def && def.kind === 'collect' && this.c.quest.st >= 1) {
      this.c.quest.st = this.countItem(def.item) >= def.n ? 2 : 1;
      this.markMe();
    }
  }

  // ---------- Kinh nghiệm & tiền
  gainExp(n) {
    const c = this.c;
    if (c.level >= MAX_LEVEL || n <= 0) return 0;
    n = Math.max(1, Math.round(n * this.s.expMul));
    c.exp += n;
    let up = 0;
    while (c.level < MAX_LEVEL && c.exp >= expNeed(c.level)) {
      c.exp -= expNeed(c.level);
      c.level++;
      c.potential += 5;
      c.skillPoints += 1;
      up++;
    }
    if (c.level >= MAX_LEVEL) c.exp = 0;
    if (up) {
      this.recalc();
      c.hp = this.s.maxHp;
      c.mp = this.s.maxMp;
      this.checkLevelQuest();
      this.world.onLevelUp(this);
    }
    this.markMe();
    return n;
  }

  checkLevelQuest() {
    this.checkQuestState();
  }

  gainXu(n) {
    this.c.xu = Math.min(2e9, this.c.xu + Math.round(n));
    this.markMe();
  }

  heal(hp, mp) {
    const c = this.c;
    if (hp) c.hp = Math.min(this.s.maxHp, c.hp + Math.round(hp));
    if (mp) c.mp = Math.min(this.s.maxMp, c.mp + Math.round(mp));
    this.markMe();
  }

  addBuff(key, name, stat, v, dur) {
    this.buffs[key] = { stat, v, until: Date.now() + dur, name };
    this.recalc();
  }

  onKill(monsterKey) {
    const q = this.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (def && def.kind === 'kill' && q.st === 1 && def.m === monsterKey) {
      q.prog = Math.min(def.n, q.prog + 1);
      if (q.prog >= def.n) {
        q.st = 2;
        this.notice(`Nhiệm vụ "${def.name}" đã hoàn thành! Hãy về gặp Trưởng Làng.`, 'quest');
      }
      this.markMe();
    }
    const t = this.c.daily.task;
    if (t && t.m === monsterKey && t.prog < t.n) {
      t.prog++;
      if (t.prog >= t.n) this.notice('Nhiệm vụ hằng ngày đã hoàn thành! Hãy gặp Tiểu Nhị để nhận thưởng.', 'quest');
      this.markMe();
    }
  }
}

module.exports = { Player, newChar, expNeed, INV_SIZE, STORAGE_SIZE, MAX_LEVEL, HOTBAR, PERSIST_BUFFS, ELEMENTS };
