'use strict';

const { SKILL_MAX_LV, skillOf } = require('../data/skills');
const { CLASSES } = require('../data/classes');
const { ITEMS, SHOPS, UPGRADE, GEM, GEM_TYPES, GEAR_SLOTS, SLOTS, TIERS, FASHION_DAYS, sellPrice, makeItem, rollFashion, gemId, gemHoles, gemDef } = require('../data/items');
const { HOTBAR, HOTBAR_SETS } = require('./player');
const { MAPS, GROUND, VILLAGES, NPC_TYPES } = require('../data/maps');
const { MONSTERS } = require('../data/monsters');
const { MAIN_QUESTS, DAILY } = require('../data/quests');
const { CHECKIN, WHEEL } = require('../data/extras');
const { DAILY_RUNS, MIN_LV, WAVES } = require('./dungeon');
const { PET } = require('../data/pets');
const { ARENA } = require('../data/extras');

const NPC_RANGE = 130;
const vnDay = (offset = 0) => new Date(Date.now() + 7 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);

// Vật lý nhảy của máy khách (khớp JUMP/JUMP2/GRAV trong public/js/game.js): server tự kiểm độ cao,
// không tin y do máy khách gửi (lơ lửng trên không sẽ né được chiêu boss đánh mặt đất)
const JUMP = 378;
const JUMP2 = 330;
const GRAV = 1000;
// nhảy đôi từ bục cao nhất chạm đất sau ~1.7s; cộng thêm phần trễ mạng
const AIR_MAX = 2.4;
// gói tin đến sớm/muộn so với lúc máy khách thật sự nhảy
const AIR_SLACK = 0.3;

// Độ cao cao nhất (px, so với chỗ cất nhảy) có thể đạt sau t giây: nhảy rồi nhảy đôi đúng lúc tối ưu
function jumpReach(t) {
  if (t <= 0) return 0;
  const t1 = Math.max(0, Math.min(t, (JUMP - JUMP2) / (2 * GRAV) + t / 2));
  const t2 = t - t1;
  return JUMP * t1 - (GRAV / 2) * t1 * t1 + JUMP2 * t2 - (GRAV / 2) * t2 * t2;
}
// Cao nhất trong khoảng [t - AIR_SLACK, t + AIR_SLACK] (hàm chỉ có một đỉnh nên lấy mẫu là đủ)
function jumpReachNear(t) {
  let best = -Infinity;
  for (let k = -3; k <= 3; k++) best = Math.max(best, jumpReach(Math.max(0, t + (k * AIR_SLACK) / 3)));
  return best;
}
// Chân đang đứng trên mặt đất hoặc một bục (máy khách hạ chân đúng bằng y của bục)
function onSurface(def, x, y) {
  if (y >= GROUND - 1) return true;
  for (const [px, py, pw] of def.platforms || []) if (x >= px - 6 && x <= px + pw + 6 && Math.abs(y - py) <= 1.5) return true;
  return false;
}
// Bục gần nhất ngay dưới chân (không có thì mặt đất)
function surfaceBelow(def, x, y) {
  let best = GROUND;
  for (const [px, py, pw] of def.platforms || []) if (x >= px - 2 && x <= px + pw + 2 && py >= y - 1 && py < best) best = py;
  return best;
}

// Bản đồ nơi mỗi loại quái xuất hiện (để chỉ dẫn nhiệm vụ)
const MONSTER_MAP = {};
for (const id in MAPS) {
  for (const s of MAPS[id].spawns) if (!MONSTER_MAP[s.m]) MONSTER_MAP[s.m] = MAPS[id].name;
  for (const b of MAPS[id].boss || []) MONSTER_MAP[b.m] = MAPS[id].name;
}

class Actions {
  constructor(world) {
    this.world = world;
    this.h = {
      move: this.move, portal: this.portal, skill: this.skill, pickup: this.pickup,
      useItem: this.useItem, equip: this.equip, unequip: this.unequip, discard: this.discard, sortInv: this.sortInv,
      npc: this.npc, npcAct: this.npcAct, buy: this.buy, sell: this.sell, upgrade: this.upgrade,
      addStat: this.addStat, resetStats: this.resetStats, learnSkill: this.learnSkill, hotbar: this.hotbar, hotbarSet: this.hotbarSet,
      revive: this.revive, pk: this.pk, rank: this.rank, ping: this.ping, inspect: this.inspect,
      storePut: this.storePut, storeTake: this.storeTake, checkin: this.checkin, spin: this.spin,
      gemPut: this.gemPut, gemTake: this.gemTake, gemMerge: this.gemMerge,
      mailList: (p) => this.world.mail.list(p), mailRead: (p, m) => this.world.mail.read(p, m), mailClaim: (p, m) => this.world.mail.claim(p, m),
      mailClaimAll: (p) => this.world.mail.claimAll(p), mailDel: (p, m) => this.world.mail.del(p, m), mailDelRead: (p) => this.world.mail.delRead(p),
      giftcode: (p, m) => this.world.mail.redeem(p, m),
      seasonEx: (p, m) => this.world.season.exchange(p, m, this.nearNpc(p, m.npc, 'event')),
      arenaJoin: (p) => this.world.arena.join(p),
      arenaCancel: (p) => this.world.arena.cancel(p, 'Đã hủy đăng ký lôi đài.'),
      arenaLeave: (p) => (p.match ? this.world.arena.leave(p) : this.world.arena.sendState(p)),
    };
  }

  handle(p, msg) {
    // Chỉ nhận khóa riêng của bảng (msg.t = 'constructor', '__proto__'... không gọi hàm của Object)
    const fn = typeof msg.t === 'string' && Object.prototype.hasOwnProperty.call(this.h, msg.t) ? this.h[msg.t] : null;
    if (fn) return fn.call(this, p, msg);
    return this.world.social.handle(p, msg);
  }

  refreshInfo(p) {
    if (p.map) p.map.broadcast('pInfo', p.info());
  }

  // ---------- Di chuyển
  move(p, m) {
    if (p.dead || !p.map) return;
    const x = +m.x;
    const y = +m.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    const dt = Math.min(1.2, (now - p.lastMoveAt) / 1000);
    p.lastMoveAt = now;
    const def = p.map.def;
    const nx = Math.max(4, Math.min(def.w - 4, x));
    let ny = Math.max(0, Math.min(GROUND, y));
    // tốc chạy gồm cả thú cưỡi (p.s.spd); vừa tháo thú cưỡi thì vẫn nhận tốc cũ thêm 2.5 giây
    const maxD = 110 * (1 + p.moveSpd(now) / 100) * 1.6 * dt + 30;
    if (now > p.moveGrace && Math.abs(nx - p.x) > maxD) {
      p.send('pos', { x: Math.round(p.x), y: Math.round(p.y) });
      return;
    }
    let fix = false;
    if (!onSurface(def, nx, ny)) {
      if (!p.airAt || now <= p.moveGrace) {
        // vừa rời chỗ đứng (hoặc vừa được server đặt lại vị trí): tính cú nhảy từ chỗ đứng cuối
        if (now <= p.moveGrace) p.baseY = ny;
        p.airAt = now;
      }
      const t = (now - p.airAt) / 1000;
      const lim = p.baseY - jumpReachNear(t) - 16;
      if (ny < lim || t > AIR_MAX) {
        const floor = surfaceBelow(def, nx, ny);
        ny = t > AIR_MAX ? floor : Math.min(floor, lim);
        fix = true;
      }
    }
    if (onSurface(def, nx, ny)) {
      p.airAt = 0;
      p.baseY = ny;
    }
    p.x = nx;
    p.y = ny;
    if (fix) p.send('pos', { x: Math.round(nx), y: Math.round(ny) });
    p.dir = m.dir === -1 ? -1 : 1;
    p.st = int(m.st) & 7;
  }

  portal(p, m) {
    if (p.dead || !p.map) return;
    const pt = p.map.def.portals[int(m.i, -1)];
    if (!pt) return;
    if (Math.abs(p.x - pt.x) > 60) return;
    if (pt.to === '@home') return this.world.sendHome(p);
    const dest = MAPS[pt.to];
    if (dest && dest.pvp && p.lv < 10) {
      p.notice('Cần đạt cấp 10 để vào Đấu Trường.', 'warn');
      return;
    }
    this.world.changeMap(p, pt.to, pt.tx);
  }

  skill(p, m) {
    this.world.combat.useSkill(p, m);
  }

  pickup(p, m) {
    if (p.dead || !p.map) return;
    const map = p.map;
    let g = map.ground.get(int(m.id));
    if (!g) {
      let bd = 70;
      for (const o of map.ground.values()) {
        const d = Math.abs(o.x - p.x);
        if (d < bd && Math.abs(o.y - p.y) < 60) {
          bd = d;
          g = o;
        }
      }
    }
    if (g && Math.abs(g.x - p.x) < 80 && Math.abs(g.y - p.y) < 70) map.tryPickup(p, g, Date.now(), true);
  }

  // ---------- Vật phẩm
  useItem(p, m) {
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    const now = Date.now();
    if (def.type === 'equip') return this.equip(p, m);
    if (p.dead) return;
    if (p.map && p.map.def.arena) return p.notice('Lôi đài không cho dùng vật phẩm (bình thuốc, cuộn, đồ ăn).', 'warn');
    if (def.type === 'book') return this.readBook(p, slot, def);
    if (def.lv > p.lv) return p.notice(`Cần đạt cấp ${def.lv}.`, 'warn');
    const e = def.effect || {};
    if (def.type === 'potion') {
      const key = e.hp ? 'pot_hp' : 'pot_mp';
      if ((p.cool[key] || 0) > now) return;
      if (e.hp && p.c.hp >= p.s.maxHp) return p.notice('Sinh lực đã đầy.');
      if (e.mp && p.c.mp >= p.s.maxMp) return p.notice('Chakra đã đầy.');
      p.cool[key] = now + 500;
      p.heal(e.hp || 0, e.mp || 0);
      p.removeAt(slot, 1);
      if (p.map) p.map.broadcast('heal', { list: e.hp ? [[`p${p.id}`, e.hp]] : [], pot: p.id });
      return;
    }
    if (def.type === 'scroll') {
      if (e.home) {
        p.removeAt(slot, 1);
        this.world.changeMap(p, CLASSES[p.c.cls].village, null);
        return;
      }
      if (e.buff === 'exp2') {
        p.c.buffs.exp2 = Math.max(now, p.c.buffs.exp2 || 0) + e.dur;
        p.removeAt(slot, 1);
        p.recalc();
        p.notice('Kinh nghiệm nhận được tăng gấp đôi trong 30 phút!', 'reward');
        return;
      }
    }
    if (def.type === 'petfood') return this.feedPet(p, slot, def, now);
    if (def.type === 'food') {
      p.c.buffs[e.buff] = Math.max(now, p.c.buffs[e.buff] || 0) + e.dur;
      p.removeAt(slot, 1);
      p.recalc();
      p.notice(`${def.name}: ${def.desc}`, 'reward');
      return;
    }
    if (def.type === 'chest') {
      if (p.freeSlots() < 1) return p.notice('Hành trang đã đầy!', 'warn');
      p.removeAt(slot, 1);
      this.openChest(p);
    }
  }

  // Cho thú cưng đang mang theo ăn: +EXP thú, +thân mật. Thú đã tối đa cả cấp lẫn thân mật thì không cho ăn
  feedPet(p, slot, def, now) {
    const it = p.pet;
    if (!it) return p.notice('Hãy mang thú cưng theo trước khi cho ăn.', 'warn');
    if (now - p.lastFeed < PET.feedCd) return;
    const e = def.effect || {};
    const maxLv = it.plv >= PET.maxLv;
    if (maxLv && it.love >= PET.loveMax) return p.notice(`${ITEMS[it.id].name} đã no nê, cấp và thân mật đều tối đa.`);
    p.lastFeed = now;
    p.removeAt(slot, 1);
    const love0 = it.love;
    it.love = Math.min(PET.loveMax, it.love + (e.love || 0));
    const got = maxLv ? 0 : p.petAddExp(e.petExp || 0);
    p.markPet();
    this.world.db.dirty = true;
    if (p.map) p.map.broadcast('petAct', { id: p.id, k: 'feed' });
    const parts = [];
    if (got) parts.push(`+${got.toLocaleString('vi-VN')} EXP`);
    if (it.love > love0) parts.push(`+${it.love - love0} thân mật`);
    p.notice(`${ITEMS[it.id].name} ăn ${def.name}: ${parts.join(', ') || 'đã no'}.`, 'reward');
  }

  // Đọc sách: học cấp 1 kỹ năng nội tại (cấp sau nâng bằng điểm kỹ năng)
  readBook(p, slot, def) {
    const sid = def.skill;
    const sk = skillOf(sid);
    if (!sk || sk.type !== 'passive') return;
    if (sk.cls !== p.c.cls) return p.notice(`Chỉ phái ${CLASSES[sk.cls].name} mới đọc được sách này.`, 'warn');
    if (p.lv < sk.req) return p.notice(`Cần đạt cấp ${sk.req}.`, 'warn');
    if ((p.c.skills[sid] || 0) > 0) return p.notice(`Đã học ${sk.name} rồi. Dùng điểm kỹ năng để nâng cấp.`);
    if (p.trade) return p.notice('Đang giao dịch.', 'warn');
    p.removeAt(slot, 1);
    p.c.skills[sid] = 1;
    p.recalc();
    p.notice(`Đã lĩnh hội kỹ năng nội tại ${sk.name}!`, 'reward');
  }

  openChest(p) {
    const lv = p.lv;
    const r = Math.random();
    const tier = Math.min(TIERS - 1, Math.floor(lv / 10));
    if (r < 0.3) {
      const xu = 500 + lv * 200 + Math.floor(Math.random() * lv * 200);
      p.gainXu(xu);
      p.notice(`Mở rương nhận ${xu} xu!`, 'reward');
    } else if (r < 0.5) {
      const st = lv < 30 ? 'stone1' : lv < 60 ? 'stone2' : lv < 90 ? 'stone3' : 'stone4';
      const q = 2 + Math.floor(Math.random() * 4);
      p.addItem(st, q);
      p.notice(`Mở rương nhận ${q} ${ITEMS[st].name}!`, 'reward');
    } else if (r < 0.75) {
      const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
      const id = slot === 'weapon' ? `w_${p.c.cls}_${tier}` : `${slot}_${tier}`;
      const rar = Math.random() < 0.1 ? 3 : Math.random() < 0.4 ? 2 : 1;
      p.addItem(id, 1, rar);
      p.notice(`Mở rương nhận ${ITEMS[id].name}!`, 'reward');
    } else if (r < 0.88) {
      p.addItem('exp2', 1);
      p.notice('Mở rương nhận Bí Kíp Nhân Đôi!', 'reward');
    } else if (r < 0.93) {
      this.giveFashion(p, 'Mở rương');
    } else {
      const l = 2 + Math.floor(Math.random() * 8);
      p.c.luong += l;
      p.markMe();
      p.notice(`Mở rương nhận ${l} lượng!`, 'reward');
    }
  }

  // Thời trang ngẫu nhiên hạn FASHION_DAYS ngày (rương, vòng quay); món hiếm nhất báo toàn máy chủ.
  // from rỗng: không báo riêng (vòng quay hiện kết quả sau khi quay xong)
  giveFashion(p, from) {
    const id = rollFashion();
    const def = ITEMS[id];
    if (!p.addItem(id, 1, 0, FASHION_DAYS)) return null;
    if (from) p.notice(`${from} nhận ${def.name} (${FASHION_DAYS} ngày)!`, 'reward');
    if (def.grade >= 4) this.world.announce(`${p.name} nhận được ${def.name} (${FASHION_DAYS} ngày)!`, 'world');
    return def;
  }

  equip(p, m) {
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    if (def.type !== 'equip') return;
    if (it.exp && it.exp <= Date.now()) return p.notice('Vật phẩm đã hết hạn sử dụng.', 'warn');
    if (def.lv > p.lv) return p.notice(`Cần đạt cấp ${def.lv} để sử dụng.`, 'warn');
    if (def.cls && def.cls !== p.c.cls) return p.notice(`Chỉ phái ${CLASSES[def.cls].name} mới dùng được.`, 'warn');
    if (p.trade) return p.notice('Đang giao dịch.', 'warn');
    const old = p.c.equip[def.slot] || null;
    p.c.equip[def.slot] = it;
    p.c.inv[slot] = old;
    p.recalc();
    p.markInv();
    this.refreshInfo(p);
  }

  unequip(p, m) {
    const s = String(m.slot);
    // chỉ nhận tên ô có thật (tránh '__proto__', 'constructor' trỏ vào Object.prototype)
    if (!SLOTS.includes(s) || !Object.prototype.hasOwnProperty.call(p.c.equip, s)) return;
    const it = p.c.equip[s];
    if (!it) return;
    const i = p.c.inv.indexOf(null);
    if (i < 0) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.inv[i] = it;
    delete p.c.equip[s];
    p.recalc();
    p.markInv();
    this.refreshInfo(p);
  }

  discard(p, m) {
    if (p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    p.c.inv[slot] = null;
    p.markInv();
    p.onInventoryChanged();
    p.notice(`Đã hủy ${ITEMS[it.id].name}.`);
  }

  sortInv(p) {
    if (p.trade) return;
    const order = { equip: 0, potion: 1, food: 2, petfood: 3, scroll: 4, book: 5, stone: 6, gem: 7, chest: 8, event: 9, misc: 10, quest: 11 };
    // loại chưa có trong bảng xếp cuối (tránh NaN làm phép so sánh không nhất quán)
    const rank = (t) => (Object.prototype.hasOwnProperty.call(order, t) ? order[t] : 99);
    const items = p.c.inv.filter(Boolean);
    // gộp các chồng
    const merged = [];
    for (const it of items) {
      const def = ITEMS[it.id];
      if (def.stack) {
        const ex = merged.find((x) => x.id === it.id && x.q < def.stack);
        if (ex) {
          const n = Math.min(def.stack - ex.q, it.q);
          ex.q += n;
          it.q -= n;
          if (it.q <= 0) continue;
        }
      }
      merged.push(it);
    }
    merged.sort((a, b) => {
      const da = ITEMS[a.id];
      const db = ITEMS[b.id];
      return (rank(da.type) - rank(db.type)) || (da.slot || '').localeCompare(db.slot || '') || (db.tier || 0) - (da.tier || 0) || a.id.localeCompare(b.id);
    });
    p.c.inv = p.c.inv.map((_, i) => merged[i] || null);
    p.markInv();
  }

  // ---------- NPC
  nearNpc(p, id, type) {
    if (!p.map || p.dead) return null;
    const n = p.map.findNpc(String(id));
    if (!n || (type && n.type !== type)) return null;
    if (Math.abs(n.x - p.x) > NPC_RANGE) return null;
    return n;
  }

  dialog(p, n, text, opts) {
    p.send('dialog', { npc: n.id, name: n.name, title: NPC_TYPES[n.type].title, text, opts: opts || [] });
  }

  npc(p, m) {
    const n = this.nearNpc(p, m.id);
    if (!n) return;
    switch (n.type) {
      case 'elder': return this.elderDialog(p, n);
      case 'potion': return this.openShop(p, n, 'potion');
      case 'smith':
        return this.dialog(p, n, 'Ta có thể rèn vũ khí, trang bị, cường hóa và khảm ngọc cho chúng. Ngươi cần gì?', [
          { a: 'shop', label: 'Mua trang bị' }, { a: 'upgrade', label: 'Cường hóa trang bị' }, { a: 'gem', label: 'Khảm & ghép ngọc' }, { a: 'sellui', label: 'Bán vật phẩm' },
        ]);
      case 'task': return this.taskDialog(p, n);
      case 'tele': return this.teleDialog(p, n);
      case 'clan': return this.clanDialog(p, n);
      case 'storage': return p.send('storage', { npc: n.id, items: p.c.storage });
      case 'dungeon': return this.dungeonDialog(p, n);
      case 'event': return this.eventDialog(p, n);
      case 'arena': return this.arenaDialog(p, n);
      default:
    }
  }

  // Võ Sư Lôi Đài: thành tích, đăng ký / hủy hàng chờ, xem bảng xếp hạng
  arenaDialog(p, n) {
    const A = this.world.arena;
    const me = A.myRank(p);
    const fmtN = (v) => v.toLocaleString('vi-VN');
    const text = `Lôi đài xếp hạng: 1 đấu 1, trận ${Math.round(ARENA.dur / 60000)} phút. Vào trận sinh lực, chakra hồi đầy; không được dùng bình thuốc. `
      + `Hạ đối thủ là thắng, hết giờ thì bên còn nhiều % sinh lực hơn thắng. Bỏ trận hay mất kết nối đều tính thua; bỏ khi chưa ai ra đòn thì trận không tính.\n`
      + `Điểm của ngươi: ${fmtN(me.elo)}${me.rank ? ` (hạng ${me.rank})` : ''} · ${me.win} thắng, ${me.lose} thua${me.draw ? `, ${me.draw} hòa` : ''} · ${fmtN(me.fame)} danh vọng.\n`
      + `Tuần này: ${me.wn} trận, thắng ${me.ww} (thưởng tuần qua hộp thư cần ${ARENA.weeklyMin} trận, thắng từ ${ARENA.weeklyWin} trận và điểm từ ${fmtN(ARENA.elo)}).`;
    const opts = [];
    if (me.queue) opts.push({ a: 'cancel', label: 'Hủy đăng ký' });
    else if (p.lv >= ARENA.minLv) opts.push({ a: 'join', label: 'Đăng ký thi đấu' });
    opts.push({ a: 'rank', label: 'Bảng xếp hạng' });
    this.dialog(p, n, p.lv < ARENA.minLv ? `${text}\nNgươi cần đạt cấp ${ARENA.minLv} mới được lên lôi đài.` : text, opts);
  }

  // Sứ Giả Lễ Hội: có mùa lễ hội thì mở cửa sổ đổi quà, hết mùa chỉ chào hỏi
  eventDialog(p, n) {
    const s = this.world.season.cur();
    if (!s) return this.dialog(p, n, 'Lễ hội đã khép lại rồi. Khi trăng lên mùa hội mới, ta sẽ lại mang quà về làng!');
    const left = Math.max(1, Math.ceil((s.end - Date.now()) / 86400000));
    const tok = ITEMS[s.token].name;
    return this.dialog(p, n, `【${s.name}】\n${s.desc}\n\nNgươi đang có ${p.countItem(s.token)} ${tok}. Lễ hội còn ${left} ngày.`, [
      { a: 'shop', label: 'Đổi quà lễ hội' },
    ]);
  }

  npcAct(p, m) {
    const n = this.nearNpc(p, m.id);
    if (!n) return;
    const a = String(m.a || '');
    switch (n.type) {
      case 'elder':
        if (a === 'accept') this.acceptMain(p);
        else if (a === 'finish') this.finishMain(p);
        return this.elderDialog(p, n);
      case 'smith':
        if (a === 'shop') return this.openShop(p, n, 'smith');
        if (a === 'upgrade') return p.send('openUi', { ui: 'upgrade', npc: n.id });
        if (a === 'gem') return p.send('openUi', { ui: 'upgrade', npc: n.id, tab: 'gem' });
        if (a === 'sellui') return this.openShop(p, n, 'smith');
        return;
      case 'task':
        if (a === 'accept') this.acceptDaily(p);
        else if (a === 'finish') this.finishDaily(p);
        else if (a === 'cancel') {
          p.c.daily.task = null;
          p.markMe();
        }
        return this.taskDialog(p, n);
      case 'tele':
        if (a.startsWith('go:')) this.teleport(p, a.slice(3));
        return;
      case 'clan':
        if (a === 'create') return this.world.social.clanCreate(p, String(m.text || ''));
        if (a === 'info') return p.send('openUi', { ui: 'clan' });
        return;
      case 'dungeon':
        if (a === 'enter') this.enterDungeon(p);
        return;
      case 'event':
        if (a === 'shop' && this.world.season.cur()) return p.send('openUi', { ui: 'event', npc: n.id });
        return;
      case 'arena':
        if (a === 'join') this.world.arena.join(p);
        else if (a === 'cancel') this.world.arena.cancel(p, 'Đã hủy đăng ký lôi đài.');
        else if (a === 'rank') return p.send('openUi', { ui: 'rank', tab: 'arena' });
        if (!p.match) this.arenaDialog(p, n);
        return;
      default:
    }
  }

  elderDialog(p, n) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def) return this.dialog(p, n, 'Ngươi đã hoàn thành mọi thử thách của ta. Ngươi chính là Ninja huyền thoại!');
    if (q.st === 0) {
      if (p.lv < def.req) return this.dialog(p, n, `Nhiệm vụ tiếp theo: "${def.name}". Hãy luyện tập đến cấp ${def.req} rồi quay lại gặp ta.`);
      return this.dialog(p, n, `【${def.name}】\n${def.desc}\n\nPhần thưởng: ${this.rewardText(p, def.reward)}`, [{ a: 'accept', label: 'Nhận nhiệm vụ' }]);
    }
    const v = p.questView();
    if (q.st === 2 || v.prog >= v.n) {
      return this.dialog(p, n, `Làm tốt lắm! Ngươi đã hoàn thành "${def.name}".`, [{ a: 'finish', label: 'Nhận thưởng' }]);
    }
    return this.dialog(p, n, `【${def.name}】\n${def.desc}\nTiến độ: ${v.prog}/${v.n}${def.m && MONSTER_MAP[def.m] ? `\nĐịa điểm: ${MONSTER_MAP[def.m]}` : ''}${def.map && MAPS[def.map] ? `\nĐịa điểm: ${MAPS[def.map].name}` : ''}`);
  }

  rewardText(p, r) {
    const parts = [];
    if (r.exp) parts.push(`${r.exp.toLocaleString('vi-VN')} EXP`);
    if (r.xu) parts.push(`${r.xu.toLocaleString('vi-VN')} xu`);
    if (r.luong) parts.push(`${r.luong} lượng`);
    for (const [id, q] of r.items || []) {
      const rid = this.rewardId(p, id);
      parts.push(`${ITEMS[rid].name}${q > 1 ? ` x${q}` : ''}`);
    }
    return parts.join(', ');
  }

  rewardId(p, id) {
    return id[0] === 'W' ? `w_${p.c.cls}_${id.slice(1)}` : id;
  }

  acceptMain(p) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || q.st !== 0 || p.lv < def.req) return;
    q.st = 1;
    q.prog = 0;
    if (def.kind === 'talk') q.st = 2;
    if (def.kind === 'collect' && p.countItem(def.item) >= def.n) q.st = 2;
    if (def.kind === 'level' && p.lv >= def.n) q.st = 2;
    if (def.kind === 'upgrade' && p.maxPlus() >= def.n) q.st = 2;
    if (def.kind === 'visit' && p.map && p.map.def.id === def.map) q.st = 2;
    p.markMe();
    if (q.st === 2) return this.finishMain(p);
    p.notice(`Đã nhận nhiệm vụ: ${def.name}`, 'quest');
  }

  finishMain(p) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || q.st < 1) return;
    const v = p.questView();
    if (v.prog < v.n && q.st !== 2) return;
    if (def.kind === 'collect' && p.countItem(def.item) < def.n) return;
    if (def.kind === 'upgrade' && p.maxPlus() < def.n) return;
    const r = def.reward;
    const items = (r.items || []).map(([id, n]) => [this.rewardId(p, id), n]);
    const need = items.reduce((s, [id, n]) => s + (ITEMS[id].stack ? 1 : n), 0);
    if (p.freeSlots() < need) return p.notice(`Cần ${need} ô trống trong hành trang.`, 'warn');
    if (def.kind === 'collect') p.removeItem(def.item, def.n);
    for (const [id, n] of items) p.addItem(id, n, ITEMS[id].type === 'equip' ? 1 : 0);
    q.i++;
    q.st = 0;
    q.prog = 0;
    if (r.xu) p.gainXu(r.xu);
    if (r.luong) p.c.luong += r.luong;
    if (r.exp) p.gainExp(r.exp / p.s.expMul);
    p.markMe();
    p.notice(`Hoàn thành "${def.name}"! Nhận: ${this.rewardText(p, r)}`, 'reward');
  }

  ensureDaily(p) {
    const today = vnDay();
    if (p.c.daily.day !== today) p.c.daily = { day: today, done: 0, task: null };
    return p.c.daily;
  }

  taskDialog(p, n) {
    const d = this.ensureDaily(p);
    const t = d.task;
    if (t) {
      if (t.prog >= t.n) return this.dialog(p, n, `Ngươi đã diệt đủ ${t.n} ${MONSTERS[t.m].name}. Giỏi lắm!`, [{ a: 'finish', label: 'Nhận thưởng' }]);
      return this.dialog(p, n, `Nhiệm vụ: tiêu diệt ${t.n} ${MONSTERS[t.m].name} tại ${MONSTER_MAP[t.m]}.\nTiến độ: ${t.prog}/${t.n}`, [{ a: 'cancel', label: 'Hủy nhiệm vụ' }]);
    }
    if (d.done >= DAILY.max) return this.dialog(p, n, `Hôm nay ngươi đã hoàn thành ${DAILY.max} nhiệm vụ. Ngày mai hãy quay lại!`);
    const rw = DAILY.reward(p.lv);
    return this.dialog(p, n, `Ta có nhiệm vụ diệt quái hằng ngày cho ngươi (${d.done}/${DAILY.max}).\nThưởng: ${rw.exp.toLocaleString('vi-VN')} EXP, ${rw.xu} xu, ${rw.luong} lượng.`, [{ a: 'accept', label: 'Nhận nhiệm vụ' }]);
  }

  acceptDaily(p) {
    const d = this.ensureDaily(p);
    if (d.task || d.done >= DAILY.max) return;
    const lv = p.lv;
    let cands = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss && MONSTER_MAP[k] && MONSTERS[k].lv >= lv - 5 && MONSTERS[k].lv <= lv + 2);
    if (!cands.length) {
      const below = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss && MONSTER_MAP[k] && MONSTERS[k].lv <= lv + 2);
      below.sort((a, b) => MONSTERS[b].lv - MONSTERS[a].lv);
      cands = below.slice(0, 2);
    }
    const m = cands[Math.floor(Math.random() * cands.length)];
    d.task = { m, n: DAILY.count(lv), prog: 0 };
    p.markMe();
    p.notice(`Nhận nhiệm vụ: diệt ${d.task.n} ${MONSTERS[m].name} (${MONSTER_MAP[m]}).`, 'quest');
  }

  finishDaily(p) {
    const d = this.ensureDaily(p);
    if (!d.task || d.task.prog < d.task.n) return;
    const rw = DAILY.reward(p.lv);
    d.task = null;
    d.done++;
    p.gainXu(rw.xu);
    p.c.luong += rw.luong;
    const got = p.gainExp(rw.exp);
    if (d.done % 5 === 0) p.addItem('chest', 1);
    p.markMe();
    p.notice(`Hoàn thành nhiệm vụ hằng ngày: +${got} EXP, +${rw.xu} xu, +${rw.luong} lượng${d.done % 5 === 0 ? ', +1 Rương Báu' : ''}.`, 'reward');
  }

  teleDialog(p, n) {
    const cost = p.lv < 20 ? 0 : 300;
    const opts = VILLAGES.filter((v) => v !== p.map.id).map((v) => ({ a: `go:${v}`, label: `${MAPS[v].name}${cost ? ` (${cost} xu)` : ' (miễn phí)'}` }));
    this.dialog(p, n, 'Ngươi muốn đi đâu? Ninja dưới cấp 20 được đi miễn phí.', opts);
  }

  teleport(p, dest) {
    if (!VILLAGES.includes(dest) || dest === p.map.id) return;
    const cost = p.lv < 20 ? 0 : 300;
    if (p.c.xu < cost) return p.notice('Không đủ xu.', 'warn');
    p.c.xu -= cost;
    p.markMe();
    this.world.changeMap(p, dest, MAPS[dest].spawnX);
  }

  clanDialog(p, n) {
    if (p.c.clan) return this.dialog(p, n, 'Gia tộc của ngươi đang phát triển thế nào rồi?', [{ a: 'info', label: 'Quản lý gia tộc' }]);
    this.dialog(p, n, 'Lập gia tộc cần cấp 15 và 50.000 xu. Tên gia tộc 3-12 ký tự (chữ, số).', [{ a: 'create', label: 'Lập gia tộc', input: 'Nhập tên gia tộc' }]);
  }

  // ---------- Hang động thử thách
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
    this.dialog(p, n, text, opts);
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
      if (o.trade) this.world.social.cancelTrade(o, 'Giao dịch bị hủy.');
    }
    this.world.startDungeon(members);
  }

  // ---------- Thủ kho
  storePut(p, m) {
    if (!this.nearNpc(p, m.npc, 'storage') || p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const def = ITEMS[it.id];
    const st = p.c.storage;
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
    if (it.q > 0) {
      const i = st.indexOf(null);
      if (i < 0) {
        p.markInv();
        p.send('storage', { npc: m.npc, items: st });
        return p.notice('Kho đã đầy!', 'warn');
      }
      st[i] = it;
    }
    p.c.inv[slot] = null;
    p.markInv();
    p.onInventoryChanged();
    p.send('storage', { npc: m.npc, items: st });
  }

  storeTake(p, m) {
    if (!this.nearNpc(p, m.npc, 'storage') || p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.storage[slot];
    if (!it) return;
    if (!p.addItemObj(it)) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.storage[slot] = null;
    p.send('storage', { npc: m.npc, items: p.c.storage });
  }

  // ---------- Điểm danh & vòng quay
  giveReward(p, r) {
    const items = r.items || [];
    const need = items.reduce((s, [id, q]) => s + (ITEMS[id].stack ? 1 : q), 0);
    if (p.freeSlots() < need) {
      p.notice(`Cần ${need} ô trống trong hành trang.`, 'warn');
      return false;
    }
    if (r.xu) p.gainXu(r.xu);
    if (r.luong) p.c.luong += r.luong;
    for (const [id, q] of items) p.addItem(id, q, 0, r.days || 0);
    p.markMe();
    return true;
  }

  rewardLabel(r) {
    const parts = [];
    if (r.xu) parts.push(`${r.xu.toLocaleString('vi-VN')} xu`);
    if (r.luong) parts.push(`${r.luong} lượng`);
    for (const [id, q] of r.items || []) parts.push(`${ITEMS[id].name}${q > 1 ? ` x${q}` : ''}`);
    return parts.join(', ');
  }

  checkin(p) {
    const ck = p.c.checkin;
    const today = vnDay();
    if (ck.day === today) return p.notice('Hôm nay bạn đã điểm danh rồi.');
    const streak = ck.day === vnDay(-1) ? ck.streak + 1 : 1;
    const base = CHECKIN[(streak - 1) % CHECKIN.length];
    const r = { ...base, xu: base.xu ? Math.round(base.xu * (1 + p.lv / 20)) : 0 };
    if (!this.giveReward(p, r)) return;
    ck.day = today;
    ck.streak = streak;
    p.markMe();
    p.notice(`Điểm danh ngày ${((streak - 1) % 7) + 1}: ${this.rewardLabel(r)}`, 'reward');
  }

  spin(p, m) {
    const now = Date.now();
    if (now - (p.lastSpin || 0) < 1200) return;
    const cur = m.cur === 'luong' ? 'luong' : 'xu';
    const cost = WHEEL.cost[cur];
    if ((cur === 'luong' ? p.c.luong : p.c.xu) < cost) return p.notice(cur === 'luong' ? 'Không đủ lượng.' : 'Không đủ xu.', 'warn');
    const key = cur === 'luong' ? 'wl' : 'w';
    const total = WHEEL.prizes.reduce((s, x) => s + x[key], 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < WHEEL.prizes.length - 1; idx++) {
      roll -= WHEEL.prizes[idx][key];
      if (roll < 0) break;
    }
    const prize = WHEEL.prizes[idx];
    const need = (prize.items || []).length + (prize.fashion ? 1 : 0);
    if (p.freeSlots() < need) return p.notice('Hành trang đã đầy!', 'warn');
    p.lastSpin = now;
    if (cur === 'luong') p.c.luong -= cost;
    else p.c.xu -= cost;
    this.giveReward(p, prize);
    const fd = prize.fashion ? this.giveFashion(p, '') : null;
    p.send('spinResult', { idx, label: fd ? `${fd.name} (${FASHION_DAYS} ngày)` : prize.label });
    if (prize.luong >= 20) this.world.announce(`${p.name} quay trúng ${prize.label} ở Vòng Quay May Mắn!`, 'world');
  }

  // ---------- Cửa hàng
  shopList(p, type) {
    const sh = SHOPS[type];
    const list = sh.items.map((id) => ({ id, price: ITEMS[id].price, cur: 'xu' }));
    // hàng riêng của phái (sách nội tại) chỉ bày cho đúng phái
    for (const id of sh.luong || []) if (!ITEMS[id].cls || ITEMS[id].cls === p.c.cls) list.push({ id, price: ITEMS[id].priceLuong, cur: 'luong' });
    for (const t of sh.equipTiers || []) {
      for (const s of GEAR_SLOTS) {
        const id = s === 'weapon' ? `w_${p.c.cls}_${t}` : `${s}_${t}`;
        list.push({ id, price: ITEMS[id].price, cur: 'xu' });
      }
    }
    return list;
  }

  openShop(p, n, type) {
    p.send('shop', { npc: n.id, title: SHOPS[type].name, items: this.shopList(p, type) });
  }

  buy(p, m) {
    const n = this.nearNpc(p, m.npc);
    if (!n || (n.type !== 'potion' && n.type !== 'smith')) return;
    const list = this.shopList(p, n.type);
    const e = list.find((x) => x.id === m.id);
    if (!e) return;
    const def = ITEMS[e.id];
    // sách nội tại chỉ đọc được 1 lần: mỗi lần mua 1 cuốn
    const qty = def.stack && def.type !== 'book' ? Math.max(1, Math.min(999, int(m.qty, 1))) : 1;
    const cost = e.price * qty;
    const bal = e.cur === 'luong' ? p.c.luong : p.c.xu;
    if (bal < cost) return p.notice(e.cur === 'luong' ? 'Không đủ lượng.' : 'Không đủ xu.', 'warn');
    if (!p.canAdd(e.id, qty)) return p.notice('Hành trang đã đầy!', 'warn');
    if (e.cur === 'luong') p.c.luong -= cost;
    else p.c.xu -= cost;
    p.addItem(e.id, qty, 0);
    p.markMe();
    p.notice(`Đã mua ${def.name}${qty > 1 ? ` x${qty}` : ''}.`);
  }

  sell(p, m) {
    const n = this.nearNpc(p, m.npc);
    if (!n || (n.type !== 'potion' && n.type !== 'smith')) return;
    if (p.trade) return;
    const slot = int(m.slot, -1);
    const it = p.c.inv[slot];
    if (!it) return;
    const qty = Math.max(1, Math.min(it.q, int(m.qty, it.q)));
    const price = sellPrice(it) * qty;
    p.removeAt(slot, qty);
    p.gainXu(price);
    p.notice(`Đã bán ${ITEMS[it.id].name}${qty > 1 ? ` x${qty}` : ''} được ${price} xu.`);
  }

  upgrade(p, m) {
    const n = this.nearNpc(p, m.npc, 'smith');
    if (!n || p.trade) return;
    const fromEq = m.src === 'eq';
    const es = String(m.slot);
    // khóa từ client: chặn '__proto__'/'constructor' như ở unequip
    if (fromEq && (!SLOTS.includes(es) || !Object.prototype.hasOwnProperty.call(p.c.equip, es))) return;
    const it = fromEq ? p.c.equip[es] : p.c.inv[int(m.slot, -1)];
    if (!it) return;
    const def = ITEMS[it.id];
    if (!def || def.type !== 'equip') return;
    if (def.noUpgrade) return p.notice('Vật phẩm này không thể cường hóa.', 'warn');
    const plus = it.p || 0;
    if (plus >= UPGRADE.max) return p.notice('Trang bị đã đạt cấp cường hóa tối đa.', 'warn');
    const stone = UPGRADE.stone(plus);
    const sq = UPGRADE.stoneQty(plus);
    const cost = UPGRADE.cost(plus, def.tier);
    if (p.countItem(stone) < sq) return p.notice(`Cần ${sq} ${ITEMS[stone].name}.`, 'warn');
    if (p.c.xu < cost) return p.notice(`Cần ${cost} xu.`, 'warn');
    const useCharm = !!m.charm && plus >= 4;
    if (useCharm && p.countItem('charm') < 1) return p.notice('Không có Bùa Bảo Hộ.', 'warn');
    p.removeItem(stone, sq);
    if (useCharm) p.removeItem('charm', 1);
    p.c.xu -= cost;
    const ok = Math.random() * 100 < UPGRADE.rate[plus];
    if (ok) {
      it.p = plus + 1;
      if (it.p >= 10) this.world.announce(`${p.name} đã cường hóa thành công ${def.name} +${it.p}!`, 'world');
    } else if (plus >= 4 && !useCharm) {
      it.p = plus - 1;
    }
    if (fromEq) {
      p.recalc();
      this.refreshInfo(p);
      p.checkQuestState();
    }
    p.markInv();
    p.markMe();
    p.send('upgradeResult', { ok, plus: it.p || 0, name: def.name });
    this.smithFx(p, { k: 'enh', ok, plus: it.p || 0 });
  }

  // Hiệu ứng rèn/khảm hiện trên nhân vật cho cả bản đồ cùng thấy
  smithFx(p, d) {
    if (p.map) p.map.broadcast('smithFx', { id: p.id, ...d });
  }

  // ---------- Khảm ngọc (Thợ Rèn). Mỗi món chỉ khảm 1 viên mỗi loại; ngọc đi theo món khi giao dịch, cất kho, bán.
  // Món đồ: src 'eq' + tên ô đang mặc, hoặc src 'inv' + chỉ số ô hành trang
  gemTarget(p, m) {
    if (m.src === 'eq') {
      const s = String(m.slot);
      if (!GEAR_SLOTS.includes(s) || !Object.prototype.hasOwnProperty.call(p.c.equip, s)) return null;
      return p.c.equip[s] ? { it: p.c.equip[s], eq: true } : null;
    }
    const i = int(m.slot, -1);
    const it = i >= 0 && i < p.c.inv.length ? p.c.inv[i] : null;
    return it ? { it, eq: false } : null;
  }

  // Kiểm tra chung: đứng gần Thợ Rèn, không giao dịch, món có lỗ khảm, chỉ số lỗ hợp lệ. Trả về { it, eq, def, gems, hole }
  gemCheck(p, m) {
    if (p.dead || p.trade || !this.nearNpc(p, m.npc, 'smith')) return null;
    const tg = this.gemTarget(p, m);
    if (!tg) return null;
    const def = ITEMS[tg.it.id];
    const holes = gemHoles(def);
    if (!holes) {
      p.notice('Vật phẩm này không có lỗ khảm.', 'warn');
      return null;
    }
    const hole = int(m.hole, -1);
    if (hole < 0 || hole >= holes) {
      p.notice('Lỗ khảm không hợp lệ.', 'warn');
      return null;
    }
    const gems = Array.from({ length: holes }, (_, k) => (Array.isArray(tg.it.gems) && gemDef(tg.it.gems[k]) ? tg.it.gems[k] : null));
    return { ...tg, def, gems, hole };
  }

  gemDone(p, g, res) {
    if (res.gems.some(Boolean)) res.it.gems = res.gems;
    else delete res.it.gems;
    if (res.eq) p.recalc();
    p.markInv();
    p.markMe();
    this.world.db.dirty = true;
    p.send('gemResult', { ...g, item: res.def.name });
  }

  gemPut(p, m) {
    const res = this.gemCheck(p, m);
    if (!res) return;
    const gi = int(m.gem, -1);
    const g = gi >= 0 && gi < p.c.inv.length ? p.c.inv[gi] : null;
    const gd = g ? gemDef(g.id) : null;
    if (!gd) return p.notice('Hãy chọn một viên ngọc trong hành trang.', 'warn');
    if (res.gems[res.hole]) return p.notice('Lỗ này đã có ngọc. Hãy gỡ ra trước.', 'warn');
    const t = GEM_TYPES[gd.gem];
    if (res.gems.some((id) => id && gemDef(id).gem === gd.gem)) return p.notice(`Món này đã khảm ${t.name}. Mỗi món chỉ khảm 1 viên mỗi loại.`, 'warn');
    res.gems[res.hole] = g.id;
    p.removeAt(gi, 1);
    this.gemDone(p, { act: 'put', ok: true, id: g.id, name: gd.name, hole: res.hole }, res);
    this.smithFx(p, { k: 'gem', ok: true, c: t.c });
  }

  gemTake(p, m) {
    const res = this.gemCheck(p, m);
    if (!res) return;
    const id = res.gems[res.hole];
    if (!id) return p.notice('Lỗ này đang trống.', 'warn');
    const gd = gemDef(id);
    const cost = GEM.takeCost(gd.glv);
    if (p.c.xu < cost) return p.notice(`Gỡ ngọc cần ${cost.toLocaleString('vi-VN')} xu.`, 'warn');
    if (!p.canAdd(id, 1)) return p.notice('Hành trang đã đầy!', 'warn');
    p.c.xu -= cost;
    res.gems[res.hole] = null;
    p.addItem(id, 1);
    this.gemDone(p, { act: 'take', ok: true, id, name: gd.name, hole: res.hole, cost }, res);
  }

  // Ghép 3 viên cùng loại cùng cấp thành 1 viên cấp trên (tỉ lệ giảm dần); thất bại mất 1 viên, trả lại 2
  gemMerge(p, m) {
    if (p.dead || p.trade || !this.nearNpc(p, m.npc, 'smith')) return;
    const now = Date.now();
    if (now - (p.lastGemMerge || 0) < 250) return;
    const id = String(m.id || '');
    const gd = gemDef(id);
    if (!gd) return p.notice('Hãy chọn ngọc cần ghép.', 'warn');
    if (gd.glv >= GEM.max) return p.notice('Ngọc đã đạt cấp cao nhất.', 'warn');
    if (p.countItem(id) < 3) return p.notice(`Cần 3 viên ${gd.name}.`, 'warn');
    const cost = GEM.mergeCost(gd.glv);
    if (p.c.xu < cost) return p.notice(`Ghép ngọc cần ${cost.toLocaleString('vi-VN')} xu.`, 'warn');
    const next = gemId(gd.gem, gd.glv + 1);
    // Xét chỗ trống sau khi đã bỏ 3 viên (cả chồng 3 viên được ghép thì ô đó trống ra); không đủ thì trả lại nguyên
    p.removeItem(id, 3);
    if (!p.canAdd(next, 1)) {
      p.addItem(id, 3);
      return p.notice('Hành trang đã đầy!', 'warn');
    }
    p.lastGemMerge = now;
    p.c.xu -= cost;
    const ok = Math.random() * 100 < GEM.rate[gd.glv - 1];
    if (ok) p.addItem(next, 1);
    else p.addItem(id, 2);
    const t = GEM_TYPES[gd.gem];
    p.markMe();
    p.send('gemResult', { act: 'merge', ok, id: ok ? next : id, from: id, name: ok ? ITEMS[next].name : gd.name, cost });
    this.smithFx(p, ok ? { k: 'gem', ok: true, c: t.c } : { k: 'enh', ok: false, plus: 0 });
    if (ok && gd.glv + 1 >= 8) this.world.announce(`${p.name} đã ghép thành công ${ITEMS[next].name}!`, 'world');
  }

  // ---------- Tiềm năng & kỹ năng
  addStat(p, m) {
    const k = String(m.k);
    if (!['str', 'agi', 'int', 'vit'].includes(k)) return;
    const n = Math.max(1, Math.min(p.c.potential, int(m.n, 1)));
    if (p.c.potential < n || n <= 0) return;
    p.c.potential -= n;
    p.c.stats[k] += n;
    p.recalc();
  }

  resetStats(p) {
    const cost = 20;
    if (p.c.luong < cost) return p.notice(`Tẩy điểm tiềm năng cần ${cost} lượng.`, 'warn');
    const s = p.c.stats;
    const total = s.str + s.agi + s.int + s.vit - 20;
    p.c.luong -= cost;
    p.c.stats = { str: 5, agi: 5, int: 5, vit: 5 };
    p.c.potential += total;
    p.recalc();
    p.notice('Đã tẩy điểm tiềm năng.');
  }

  learnSkill(p, m) {
    const sid = String(m.sid);
    const sk = skillOf(sid);
    if (!sk || sk.cls !== p.c.cls || sk.basic) return;
    const cur = p.c.skills[sid] || 0;
    if (sk.type === 'passive' && !cur) return p.notice(`Cần đọc ${ITEMS[sk.book].name} để học ${sk.name}.`, 'warn');
    if (cur >= SKILL_MAX_LV) return p.notice('Kỹ năng đã đạt cấp tối đa.');
    const need = sk.req + cur * 3;
    if (p.lv < need) return p.notice(`Cần đạt cấp ${need}.`, 'warn');
    if (p.c.skillPoints < 1) return p.notice('Không đủ điểm kỹ năng.', 'warn');
    p.c.skillPoints--;
    p.c.skills[sid] = cur + 1;
    if (sk.type === 'passive') p.recalc();
    if (cur === 0) {
      const i = p.c.hotbar.indexOf(null);
      if (i >= 0 && !p.c.hotbar.includes(sid)) p.c.hotbar[i] = sid;
      p.notice(`Đã học kỹ năng ${sk.name}!`, 'reward');
    }
    p.markMe();
  }

  // Gán kỹ năng vào ô i của bộ đang dùng (đã có ở ô khác thì hoán đổi, sid rỗng = gỡ)
  hotbar(p, m) {
    const i = int(m.i, -1);
    if (i < 0 || i >= HOTBAR) return;
    const sid = m.sid ? String(m.sid) : null;
    if (sid) {
      const sk = skillOf(sid);
      if (!sk || sk.cls !== p.c.cls || sk.basic || sk.type === 'passive' || !Object.prototype.hasOwnProperty.call(p.c.skills, sid) || !(p.c.skills[sid] > 0)) return;
    }
    const bar = p.c.hotbar;
    const j = sid ? bar.indexOf(sid) : -1;
    if (j >= 0) bar[j] = bar[i];
    bar[i] = sid;
    p.markMe();
  }

  hotbarSet(p, m) {
    const n = Number.isInteger(m.n) ? m.n : -1;
    if (n < 0 || n >= HOTBAR_SETS || n === p.c.hbi) return;
    const now = Date.now();
    if (now - (p.lastHotbarSet || 0) < 300) return;
    p.lastHotbarSet = now;
    p.c.hbi = n;
    p.markMe();
  }

  // ---------- Hồi sinh, PK, xếp hạng
  revive(p, m) {
    if (!p.dead) return;
    if (m.mode === 'here') {
      if (p.countItem('revive_card') > 0) p.removeItem('revive_card', 1);
      else if (p.c.luong >= 1) p.c.luong -= 1;
      else return p.notice('Cần 1 lượng hoặc Thẻ Hồi Sinh.', 'warn');
      p.dead = false;
      p.airAt = 0;
      p.baseY = p.y;
      p.c.hp = Math.round(p.s.maxHp * 0.6);
      p.c.mp = Math.max(p.c.mp, Math.round(p.s.maxMp * 0.3));
      p.markMe();
      p.send('revived', {});
      this.refreshInfo(p);
      return;
    }
    p.dead = false;
    p.c.hp = p.s.maxHp;
    p.c.mp = p.s.maxMp;
    p.send('revived', {});
    this.world.changeMap(p, CLASSES[p.c.cls].village, null);
  }

  pk(p, m) {
    const on = !!m.on;
    if (on && p.lv < 10) return p.notice('Cần đạt cấp 10 để bật chế độ PK.', 'warn');
    if (on && p.map && p.map.def.town) return p.notice('Không thể bật PK trong làng.', 'warn');
    p.pkMode = on;
    p.markMe();
    this.refreshInfo(p);
    p.notice(on ? 'Đã BẬT chế độ PK - có thể tấn công người chơi khác (ngoài làng).' : 'Đã TẮT chế độ PK.', on ? 'warn' : 'info');
  }

  rank(p) {
    p.send('rank', { ...this.world.rankCache, arenaMe: this.world.arena.myRank(p) });
  }

  ping(p, m) {
    p.send('pong', { ts: m.ts });
  }

  inspect(p, m) {
    const o = this.world.byName.get(String(m.name || '').toLowerCase());
    if (!o) return p.notice('Người chơi không online.');
    p.send('inspect', { name: o.name, cls: o.c.cls, lv: o.lv, equip: o.c.equip, s: o.s, clan: o.clanTag(), pk: o.c.pk });
  }
}

module.exports = { Actions, MONSTER_MAP, makeItem };
