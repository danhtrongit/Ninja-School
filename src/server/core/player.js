'use strict';

const { CLASSES, BASE_STATS, ELEMENTS } = require('../../shared/data/classes');
const { SKILLS, PASSIVE_STATS, basicSkill, classSkills, skillOf } = require('../../shared/data/skills');
const { ITEMS, GEM, makeItem, cleanGems, cleanPet, SLOTS } = require('../../shared/data/items');
const { PET, PET_SKILLS } = require('../../shared/data/pets');
const { MAPS, GROUND } = require('../../shared/data/maps');
const { MAIN_QUESTS } = require('../../shared/data/quests');
const { INV_SIZE, STORAGE_SIZE, MAX_LEVEL, HOTBAR, HOTBAR_SETS, PERSIST_BUFFS } = require('../../shared/constants');
const { expNeed } = require('../../shared/formulas');
const hooks = require('./modules');

const SLOT_SET = new Set(SLOTS);
const expired = (it, now) => !!it && it.exp > 0 && it.exp <= now;

// Bộ kỹ năng: lưu c.hotbars (HOTBAR_SETS bộ) + c.hbi; c.hotbar là thuộc tính ảo trỏ vào bộ đang dùng
// (không đếm khi JSON.stringify nên file lưu không bị trùng và không thể lệch khi tải lại).
function initHotbars(c) {
  const own = Object.getOwnPropertyDescriptor(c, 'hotbar');
  // Dữ liệu cũ (chỉ có c.hotbar thật) hoặc do bản server cũ ghi sau cùng: coi là bộ đang dùng
  const legacy = own && 'value' in own && Array.isArray(own.value) ? own.value : null;
  delete c.hotbar;
  const sets = Array.isArray(c.hotbars) ? c.hotbars : [];
  c.hbi = Number.isInteger(c.hbi) && c.hbi >= 0 && c.hbi < HOTBAR_SETS ? c.hbi : 0;
  if (legacy) sets[Array.isArray(c.hotbars) ? c.hbi : 0] = legacy;
  const skills = c.skills || {};
  const valid = (sid) => {
    const sk = skillOf(sid);
    return !!sk && sk.cls === c.cls && !sk.basic && sk.type !== 'passive' && Object.prototype.hasOwnProperty.call(skills, sid) && skills[sid] > 0;
  };
  c.hotbars = Array.from({ length: HOTBAR_SETS }, (_, i) => {
    const src = Array.isArray(sets[i]) ? sets[i] : [];
    const bar = [];
    for (let j = 0; j < HOTBAR; j++) {
      const sid = src[j];
      bar.push(valid(sid) && !bar.includes(sid) ? sid : null);
    }
    return bar;
  });
  Object.defineProperty(c, 'hotbar', {
    configurable: true,
    enumerable: false,
    get() { return this.hotbars[this.hbi]; },
    set(v) {
      const bar = Array.isArray(v) ? v.slice(0, HOTBAR) : [];
      while (bar.length < HOTBAR) bar.push(null);
      this.hotbars[this.hbi] = bar;
    },
  });
  return c;
}

function newChar(name, cls, gender) {
  const cd = CLASSES[cls];
  const basic = basicSkill(cls);
  const first = classSkills(cls).find((id) => !SKILLS[id].basic && SKILLS[id].req === 1);
  const inv = new Array(INV_SIZE).fill(null);
  inv[0] = makeItem('hp1', 10);
  inv[1] = makeItem('mp1', 10);
  inv[2] = makeItem('scroll_home', 2);
  return initHotbars({
    name, cls, gender: gender === 'f' ? 'f' : 'm',
    level: 1, exp: 0, xu: 1000, luong: 10,
    hp: 1e9, mp: 1e9,
    stats: { str: 5, agi: 5, int: 5, vit: 5 }, potential: 0, skillPoints: 0,
    skills: { [basic]: 1, [first]: 1 },
    hotbars: [[first, null, null, null, null, null]], hbi: 0,
    inv, equip: { weapon: makeItem(`w_${cls}_0`) },
    map: cd.village, x: MAPS[cd.village].spawnX, y: GROUND,
    quest: { i: 0, st: 0, prog: 0 },
    daily: { day: '', done: 0, task: null },
    clan: null, pk: 0, kills: 0, deaths: 0,
    created: Date.now(), lastLogin: Date.now(), playtime: 0,
    buffs: {},
    settings: {},
  });
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
    // lúc rời chỗ đứng và độ cao chỗ đứng cuối (để kiểm tra cú nhảy)
    this.airAt = 0;
    this.baseY = this.y;
    this.lastSkillAt = 0;
    this.party = null;
    this.trade = null;
    this.duel = null;
    // lôi đài: trận đang đấu, chỗ đứng + sinh lực/chakra trước trận (trả lại khi ra)
    this.match = null;
    this.arenaBack = null;
    this.pkMode = false;
    this.invites = {};
    this.lastChat = 0;
    this.lastWorldChat = 0;
    this.lastFullNotice = 0;
    this.dirtyMe = false;
    this.dirtyInv = false;
    // cấp/EXP/thân mật thú đổi (gửi gói 'pet' nhỏ thay vì cả hành trang mỗi lần diệt quái)
    this.dirtyPet = false;
    // mốc thời gian lần dùng kỹ năng thú gần nhất
    this.petCool = {};
    this.lastFeed = 0;
    // tốc chạy vừa giảm (tháo thú cưỡi, hết buff): server vẫn chấp nhận tốc cũ thêm chút thời gian cho máy khách kịp nhận
    this.spdHold = 0;
    this.spdHoldUntil = 0;
    // tên vật phẩm hết hạn bị gỡ lúc tải nhân vật (báo khi vào game)
    this.expiredNames = [];
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
  markPet() { this.dirtyPet = true; }

  sanitize() {
    const c = this.c;
    if (!Array.isArray(c.inv)) c.inv = [];
    while (c.inv.length < INV_SIZE) c.inv.push(null);
    c.inv = c.inv.slice(0, INV_SIZE).map((it) => (it && ITEMS[it.id] ? it : null));
    c.equip = c.equip && typeof c.equip === 'object' ? c.equip : {};
    for (const s of Object.keys(c.equip)) if (!SLOT_SET.has(s) || !c.equip[s] || !ITEMS[c.equip[s].id]) delete c.equip[s];
    c.skills = c.skills || {};
    initHotbars(c);
    if (c.level > MAX_LEVEL) c.level = MAX_LEVEL;
    c.quest = c.quest || { i: 0, st: 0, prog: 0 };
    c.daily = c.daily || { day: '', done: 0, task: null };
    c.buffs = c.buffs || {};
    c.settings = c.settings || {};
    c.storage = Array.isArray(c.storage) ? c.storage.map((it) => (it && ITEMS[it.id] ? it : null)) : [];
    while (c.storage.length < STORAGE_SIZE) c.storage.push(null);
    c.pending = Array.isArray(c.pending) ? c.pending.filter((it) => it && ITEMS[it.id] && it.q > 0) : [];
    c.friends = Array.isArray(c.friends) ? c.friends : [];
    c.checkin = c.checkin || { day: '', streak: 0 };
    c.dungeon = c.dungeon || { day: '', runs: 0 };
    // dữ liệu riêng của từng module (hộp thư, lễ hội, lôi đài...)
    hooks.call('sanitize', c);
    // ngọc khảm trên từng món: bỏ id lạ / quá số lỗ (dữ liệu cũ hoặc bị sửa tay)
    for (const it of [...Object.values(c.equip), ...c.inv, ...c.storage, ...c.pending]) {
      cleanGems(it);
      // thú cưng: cấp/EXP/thân mật hợp lệ (thú từ bản cũ chưa có cấp thì bắt đầu cấp 1)
      if (it && ITEMS[it.id].slot === 'pet') cleanPet(it);
    }
    this.expiredNames = this.purgeExpired(Date.now());
    if (!MAPS[c.map] || MAPS[c.map].pvp || MAPS[c.map].instance) {
      c.map = CLASSES[c.cls].village;
      c.x = MAPS[c.map].spawnX;
      c.y = GROUND;
    }
  }

  // Chỉ số tính từ cấp, điểm tiềm năng và phần cộng của các module qua móc 'stats'
  // (trang bị/ngọc/thú cưng/thời trang, buff, kỹ năng nội tại, gia tộc). Bảng t:
  //   eq: cộng từ trang bị, mountSpd: tốc chạy thú cưỡi (đã trừ khỏi eq.spd), buf: buff, pas: nội tại,
  //   expPct: % EXP ngoài trang bị, expMul: hệ số nhân EXP
  recalc() {
    const c = this.c;
    const cd = CLASSES[c.cls];
    const b = cd.melee ? BASE_STATS.melee : BASE_STATS.ranged;
    const pas = {};
    for (const k of Object.keys(PASSIVE_STATS)) pas[k] = 0;
    const t = {
      p: this, c, now: Date.now(),
      eq: { atk: 0, def: 0, hp: 0, mp: 0, crit: 0, dodge: 0, spd: 0, str: 0, agi: 0, int: 0, vit: 0, skillDmg: 0, hit: 0, expPct: 0, hpPct: 0, lifesteal: 0 },
      mountSpd: 0,
      buf: { atkPct: 0, defPct: 0, crit: 0, dodge: 0, spd: 0, hpPct: 0 },
      pas, expPct: 0, expMul: 1,
    };
    hooks.call('stats', t);
    const { eq, buf, mountSpd } = t;
    const str = c.stats.str + eq.str;
    const agi = c.stats.agi + eq.agi;
    const int = c.stats.int + eq.int;
    const vit = c.stats.vit + eq.vit;
    const lv = c.level - 1;
    const s = {
      maxHp: Math.round((b.hp + b.hpLv * lv + vit * 12 + eq.hp) * (1 + (buf.hpPct + eq.hpPct + pas.hpPct) / 100)),
      maxMp: Math.round(b.mp + b.mpLv * lv + int * 6 + eq.mp),
      atk: Math.round((b.atk + b.atkLv * lv + str * 2 + agi * 0.5 + eq.atk) * (1 + (buf.atkPct + pas.atkPct) / 100)),
      def: Math.round((b.def + b.defLv * lv + vit * 0.6 + eq.def) * (1 + (buf.defPct + pas.defPct) / 100)),
      crit: Math.min(60, Math.round((b.crit + agi * 0.15 + eq.crit + buf.crit + pas.crit) * 10) / 10),
      dodge: Math.min(45, Math.round((b.dodge + agi * 0.12 + eq.dodge + buf.dodge + pas.dodge) * 10) / 10),
      hit: Math.round(agi + eq.hit),
      spd: Math.min(100, Math.round((Math.min(60, eq.spd + buf.spd + pas.spd) + mountSpd) * 10) / 10),
      mountSpd,
      skillDmg: Math.round((int * 0.6 + eq.skillDmg + pas.skillDmg) * 10) / 10,
      // % sát thương khi chí mạng (gốc 160%), % giảm sát thương nhận từ hệ khắc mình, chakra hồi mỗi giây
      critDmg: Math.round(160 + pas.critDmg),
      resist: Math.min(50, pas.resist),
      mpRegen: Math.round(pas.mpRegen * 10) / 10,
      // % sát thương gây ra hồi thành sinh lực (ngọc Huyết Hồn)
      lifesteal: Math.min(GEM.lifestealCap, Math.round(eq.lifesteal * 10) / 10),
      expMul: Math.round(t.expMul * (1 + (eq.expPct + t.expPct) / 100) * 100) / 100,
      str, agi, int, vit,
    };
    if (this.s && s.spd < this.s.spd) {
      this.spdHold = Math.max(this.s.spd, Date.now() < this.spdHoldUntil ? this.spdHold : 0);
      this.spdHoldUntil = Date.now() + 2500;
    }
    this.s = s;
    if (c.hp > s.maxHp) c.hp = s.maxHp;
    if (c.mp > s.maxMp) c.mp = s.maxMp;
    if (c.hp < 0) c.hp = 0;
    this.markMe();
  }

  // Tốc chạy server dùng để kiểm tra gói move (giữ tốc cũ một lúc sau khi tốc giảm)
  moveSpd(now) {
    return now < this.spdHoldUntil ? Math.max(this.s.spd, this.spdHold) : this.s.spd;
  }

  look() {
    return lookOf(this.c);
  }

  // Gỡ vật phẩm hết hạn khỏi ô trang bị, hành trang, thủ kho và đồ giữ hộ. Trả về tên các món đã gỡ.
  purgeExpired(now) {
    const c = this.c;
    const names = [];
    const gone = (it) => {
      if (!expired(it, now)) return false;
      names.push(ITEMS[it.id].name);
      return true;
    };
    for (const s of Object.keys(c.equip)) if (gone(c.equip[s])) delete c.equip[s];
    c.inv = c.inv.map((it) => (gone(it) ? null : it));
    c.storage = (c.storage || []).map((it) => (gone(it) ? null : it));
    c.pending = (c.pending || []).filter((it) => !gone(it));
    return names;
  }

  // Gọi định kỳ: món thời trang hết hạn thì mất chỉ số và tự tháo (biến mất), người xung quanh thấy ngoại hình mới
  checkExpiry(now) {
    const before = SLOTS.map((s) => this.c.equip[s] || null);
    const names = this.purgeExpired(now);
    if (!names.length) return;
    if (SLOTS.some((s, i) => before[i] !== (this.c.equip[s] || null))) {
      this.recalc();
      if (this.map) this.map.broadcast('pInfo', this.info());
    }
    this.markInv();
    this.markMe();
    this.notice(`Hết hạn sử dụng: ${names.join(', ')}.`, 'warn');
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
    const d = {
      id: this.id, name: c.name, cls: c.cls, gender: c.gender, level: c.level, exp: c.exp, need: expNeed(c.level),
      xu: c.xu, luong: c.luong, hp: c.hp, mp: c.mp, s: this.s, stats: c.stats, potential: c.potential,
      skillPoints: c.skillPoints, skills: c.skills, hotbar: c.hotbar, hotbars: c.hotbars, hbi: c.hbi, quest: this.questView(), daily: c.daily,
      clan: c.clan ? this.world.clanView(c.clan, c.name) : null, pk: c.pk, pkMode: this.pkMode, buffs, dead: this.dead,
      kills: c.kills, look: this.look(), now, checkin: c.checkin, dungeon: c.dungeon,
    };
    // hộp thư, lễ hội, lôi đài...
    hooks.call('selfData', this, d, now);
    return d;
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

  // Hành trang chứa nổi cả danh sách món (thử cộng dồn trên bản sao số lượng, không đổi túi thật).
  // minus: [[id, sl]] sẽ bị trừ trước (vd vật phẩm đem đổi), ô trống ra được tính là chỗ trống
  canAddItems(list, minus) {
    const slots = this.c.inv.map((it) => (it ? { id: it.id, q: it.q } : null));
    for (const [mid, mq] of minus || []) {
      let left = mq;
      for (let i = 0; i < slots.length && left > 0; i++) {
        const s = slots[i];
        if (!s || s.id !== mid) continue;
        const n = Math.min(left, s.q);
        s.q -= n;
        left -= n;
        if (s.q <= 0) slots[i] = null;
      }
    }
    for (const it of list) {
      const def = ITEMS[it.id];
      if (!def) return false;
      let left = def.stack ? it.q : 1;
      if (def.stack) {
        for (const s of slots) {
          if (left <= 0) break;
          if (s && s.id === it.id && s.q < def.stack) {
            const n = Math.min(left, def.stack - s.q);
            s.q += n;
            left -= n;
          }
        }
      }
      while (left > 0) {
        const i = slots.indexOf(null);
        if (i < 0) return false;
        const n = def.stack ? Math.min(left, def.stack) : 1;
        slots[i] = { id: it.id, q: n };
        left -= n;
      }
    }
    return true;
  }

  // days > 0: vật phẩm có hạn dùng (chỉ áp cho trang bị/thời trang, không cộng dồn)
  addItem(id, qty = 1, rarity = 0, days = 0) {
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
        this.c.inv[i] = makeItem(id, 1, rarity, days);
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

  // Đồ thưởng không vào được hành trang: gửi thủ kho; kho cũng đầy thì giữ lại, trả dần khi hành trang có chỗ.
  // Không thả ra đất vì quá thời gian giữ đồ người khác nhặt được. Trả về 'storage' hoặc 'pending'.
  stashItem(it) {
    const def = ITEMS[it.id];
    const st = this.c.storage;
    if (def.stack) {
      for (const s of st) {
        if (it.q <= 0) break;
        if (s && s.id === it.id && s.q < def.stack) {
          const n = Math.min(def.stack - s.q, it.q);
          s.q += n;
          it.q -= n;
        }
      }
    }
    if (it.q <= 0) return 'storage';
    const i = st.indexOf(null);
    if (i >= 0) {
      st[i] = it;
      return 'storage';
    }
    this.c.pending.push(it);
    return 'pending';
  }

  // Trả đồ đang giữ hộ (gọi mỗi giây khi còn đồ chờ)
  deliverPending() {
    const got = [];
    while (this.c.pending.length && this.addItemObj(this.c.pending[0])) {
      const it = this.c.pending.shift();
      got.push(`${ITEMS[it.id].name}${it.q > 1 ? ` x${it.q}` : ''}`);
    }
    if (got.length) {
      this.markMe();
      this.notice(`Nhận đồ thưởng đang giữ: ${got.join(', ')}`, 'reward');
    }
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

  // ---------- Thú cưng
  get pet() {
    const it = this.c.equip.pet;
    return it && ITEMS[it.id] && ITEMS[it.id].slot === 'pet' ? it : null;
  }

  petData() {
    const it = this.pet;
    return it ? { id: it.id, plv: it.plv, pexp: it.pexp, love: it.love } : { id: null };
  }

  // Thú nhận phần EXP khi chủ diệt quái (raw: EXP gốc của chủ, chưa nhân hệ số của chủ)
  petKillExp(raw) {
    const it = this.pet;
    if (!it || raw <= 0) return 0;
    return this.petAddExp(Math.max(1, Math.round(raw * PET.share * (1 + it.love / 100))));
  }

  // Cộng EXP cho thú đang mang theo; lên cấp thì tính lại chỉ số chủ, báo cả bản đồ. Trả về EXP đã nhận
  petAddExp(n) {
    const it = this.pet;
    if (!it || n <= 0 || it.plv >= PET.maxLv) return 0;
    it.pexp += Math.round(n);
    let up = 0;
    while (it.plv < PET.maxLv && it.pexp >= PET.need(it.plv)) {
      it.pexp -= PET.need(it.plv);
      it.plv++;
      up++;
    }
    if (it.plv >= PET.maxLv) it.pexp = 0;
    this.markPet();
    if (up) {
      this.recalc();
      this.markInv();
      const name = ITEMS[it.id].name;
      this.notice(`${name} đã đạt cấp ${it.plv}${it.plv >= PET.maxLv ? ' (tối đa)' : ''}! Chỉ số thú cưng tăng.`, 'level');
      if (this.map) {
        this.map.broadcast('pInfo', this.info());
        this.map.broadcast('petAct', { id: this.id, k: 'lv', lv: it.plv });
      }
    }
    return Math.round(n);
  }

  // Kỹ năng tự động của thú (gọi ~4 lần/giây). Thân mật thấp thì thú dỗi, không làm gì
  petTick(now) {
    const it = this.pet;
    if (!it || this.dead || !this.map || it.love < PET.loveLazy) return;
    const skills = ITEMS[it.id].petSkills || [];
    const map = this.map;
    if (skills.includes('pick') && now - (this.petCool.pick || 0) >= PET_SKILLS.pick.every) {
      const r = PET_SKILLS.pick.r(it.plv);
      let best = null;
      let bd = Infinity;
      for (const g of map.ground.values()) {
        const d = Math.abs(g.x - this.x);
        if (d > r || d >= bd || Math.abs(g.y - this.y) > 70 || !map.canPick(this, g, now)) continue;
        // hành trang không chứa nổi thì bỏ qua, để thú còn nhặt xu / món khác thay vì kẹt mãi một món
        if (!g.xu && !this.canAdd(g.it.id, g.it.q)) continue;
        bd = d;
        best = g;
      }
      if (best) {
        const x = Math.round(best.x);
        const y = Math.round(best.y);
        if (map.tryPickup(this, best, now, false)) {
          this.petCool.pick = now;
          map.broadcast('petAct', { id: this.id, k: 'pick', x, y });
        }
      }
    }
    const hs = PET_SKILLS.heal;
    // lôi đài không hồi máu (kể cả thú cưng)
    if (skills.includes('heal') && !map.def.arena && now - (this.petCool.heal || 0) >= hs.every && this.c.hp < (this.s.maxHp * hs.below) / 100) {
      this.petCool.heal = now;
      const amt = Math.min(this.s.maxHp - this.c.hp, Math.round((this.s.maxHp * hs.pct(it.plv)) / 100));
      if (amt > 0) {
        this.heal(amt, 0);
        map.broadcast('petAct', { id: this.id, k: 'heal', n: amt });
      }
    }
  }

  // Mỗi PET.loveDecay giây chơi khi đang mang thú: thân mật giảm 1
  petDecay() {
    const it = this.pet;
    if (!it || it.love <= 0) return;
    it.love--;
    this.markPet();
    if (it.love === PET.loveLazy - 1) this.notice(`${ITEMS[it.id].name} đói và dỗi, không chịu làm việc nữa. Hãy cho thú ăn!`, 'warn');
  }

  // Được tính một lần hạ quái (tiến độ nhiệm vụ chính, hằng ngày...)
  onKill(monsterKey) {
    hooks.call('kill', this, monsterKey);
  }
}

// Ngoại hình gửi cho người khác: bậc trang bị + mã hình thời trang (chỉ có khi đang mặc)
function lookOf(c, now = Date.now()) {
  const e = c.equip || {};
  // món đã hết hạn lúc offline chưa bị dọn (chỉ dọn khi vào game) nên bỏ qua ở đây
  const def = (s) => (e[s] && ITEMS[e[s].id] && !(e[s].exp && e[s].exp <= now) ? ITEMS[e[s].id] : null);
  const t = (s) => (def(s) ? def(s).tier : -1);
  const out = {
    w: t('weapon'), a: t('armor'), p: t('pants'), h: t('hat'), wp: e.weapon ? e.weapon.p || 0 : 0,
    pet: def('pet') ? def('pet').look : null,
  };
  // cấp thú (thú cấp cao có hào quang riêng)
  if (out.pet) out.pl = Math.max(1, e.pet.plv | 0);
  for (const s of ['mask', 'cloak', 'costume', 'mount']) if (def(s) && def(s).look) out[s] = def(s).look;
  return out;
}

module.exports = { Player, newChar, lookOf, expNeed, INV_SIZE, STORAGE_SIZE, MAX_LEVEL, HOTBAR, HOTBAR_SETS, PERSIST_BUFFS, ELEMENTS };
