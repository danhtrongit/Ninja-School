'use strict';

const { skillVal, skillOf } = require('../../shared/data/skills');
const { ELEMENTS, CLASSES } = require('../../shared/data/classes');
const { MONSTERS } = require('../../shared/data/monsters');
const { makeItem, GEAR_SLOTS, TIERS, GEM, randomGem } = require('../../shared/data/items');
const { expNeed } = require('../../shared/formulas');
const hooks = require('./modules');

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

const PLAYER_H = 22;
const PVP_SCALE = 0.45;
const MIN_PK_LEVEL = 10;

function elementMul(a, b) {
  if (!a || !b) return 1;
  if (ELEMENTS[a].beats === b) return 1.15;
  if (ELEMENTS[b].beats === a) return 0.9;
  return 1;
}

function rollRarity(boss) {
  const r = Math.random() * 100;
  if (boss) return r < 25 ? 2 : r < 80 ? 3 : 4;
  return r < 60 ? 0 : r < 88 ? 1 : r < 98 ? 2 : 3;
}

function randomEquipId(tier) {
  const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  if (slot === 'weapon') {
    const classes = Object.keys(CLASSES);
    return `w_${classes[Math.floor(Math.random() * classes.length)]}_${tier}`;
  }
  return `${slot}_${tier}`;
}

// Người chơi p (tọa độ chân) có nằm trong vùng chiêu boss c không. Vùng chốt lúc bắt đầu niệm,
// p là vị trí lúc tung chiêu, nên chạy ra khỏi vùng trong lúc niệm là né được. Nửa bề rộng người chơi = 6.
function inBossZone(c, p) {
  const sk = c.sk;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  if (sk.shape === 'line') {
    // khớp dải cảnh báo client vẽ: từ boss dài r theo hướng, dày w (lệch dọc ≤ w/2 + 2 viền)
    const along = dx * c.dir;
    return along >= -6 && along <= sk.r + 6 && Math.abs(dy) <= (sk.w || 16) / 2 + 2;
  }
  // cột sáng giáng từ trời: trúng cả cột, chỉ né được bằng cách chạy ngang
  if (sk.shape === 'pillar') return (c.pts || [[c.x, c.y]]).some(([x]) => Math.abs(p.x - x) <= sk.r + 6);
  if (Math.abs(dx) > sk.r + 6) return false;
  // chấn động mặt đất: nhảy lên hoặc đứng trên bục là né được
  return Math.abs(dy) <= (sk.ground ? 20 : Math.max(40, sk.r * 0.6));
}

class Combat {
  constructor(world) {
    this.world = world;
  }

  // ---------- Tính sát thương
  calc(att, tgt, mul, isSkill) {
    if (tgt.dodge && Math.random() * 100 < Math.max(0, tgt.dodge - (att.hit || 0) * 0.04)) return { dmg: 0, miss: true };
    let dmg = att.atk * mul * (1 + (isSkill ? (att.skillDmg || 0) / 100 : 0));
    dmg -= tgt.def * 0.6;
    dmg = Math.max(dmg, att.atk * mul * 0.12, 1);
    dmg *= rand(0.9, 1.1) * elementMul(att.el, tgt.el);
    // kháng hệ khắc: chỉ giảm đòn đến từ hệ khắc hệ của mục tiêu
    if (tgt.resist && ELEMENTS[att.el] && ELEMENTS[att.el].beats === tgt.el) dmg *= 1 - Math.min(50, tgt.resist) / 100;
    const crit = Math.random() * 100 < (att.crit || 0);
    if (crit) dmg *= (att.critDmg || 160) / 100;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  playerAtt(p) {
    return { atk: p.s.atk, crit: p.s.crit, critDmg: p.s.critDmg, hit: p.s.hit, skillDmg: p.s.skillDmg, el: p.el };
  }

  // ---------- Mục tiêu
  resolve(map, tid) {
    if (typeof tid !== 'string' || tid.length < 2) return null;
    const id = parseInt(tid.slice(1), 10);
    if (tid[0] === 'm') {
      const m = map.monsters.get(id);
      return m && !m.dead ? { kind: 'm', e: m } : null;
    }
    if (tid[0] === 'p') {
      const p = map.players.get(id);
      return p && !p.dead ? { kind: 'p', e: p } : null;
    }
    return null;
  }

  canPvp(a, b) {
    if (a === b || a.dead || b.dead || a.map !== b.map) return false;
    const map = a.map.def;
    // lôi đài: chỉ đánh được đối thủ cùng trận, sau hiệu lệnh bắt đầu
    if (map.arena) return !!a.match && a.match === b.match && a.match.state === 'fight';
    if (map.town) return false;
    if (a.duel === b.id && b.duel === a.id) return true;
    if (map.pvp) return !(a.party && a.party === b.party);
    if (a.party && a.party === b.party) return false;
    if (a.c.clan && a.c.clan === b.c.clan) return false;
    return a.pkMode && a.lv >= MIN_PK_LEVEL && b.lv >= MIN_PK_LEVEL;
  }

  inRange(p, t, range) {
    const e = t.e;
    const w = t.kind === 'm' ? e.def.w : 12;
    const h = t.kind === 'm' ? e.def.h : PLAYER_H;
    const dx = Math.abs(e.x - p.x) - w / 2;
    const dy = Math.abs((e.y - h / 2) - (p.y - PLAYER_H / 2));
    const dyTol = (range > 90 ? 110 : 46) + h / 2;
    return dx <= range + 8 && dy <= dyTol;
  }

  enemiesIn(p, test, max) {
    const out = [];
    const map = p.map;
    for (const m of map.monsters.values()) {
      if (m.dead) continue;
      if (test(m.x, m.y - m.def.h / 2, m.def.w)) out.push({ kind: 'm', e: m });
      if (out.length >= max) return out;
    }
    for (const o of map.players.values()) {
      if (!this.canPvp(p, o)) continue;
      if (test(o.x, o.y - PLAYER_H / 2, 12)) out.push({ kind: 'p', e: o });
      if (out.length >= max) return out;
    }
    return out;
  }

  // ---------- Dùng kỹ năng
  useSkill(p, msg) {
    const sid = String(msg.sid || '');
    const sk = skillOf(sid);
    if (!sk || sk.cls !== p.c.cls || sk.type === 'passive' || p.dead || !p.map) return;
    const lv = p.c.skills[sid];
    if (!lv) return;
    const now = Date.now();
    // lôi đài: chưa tới hiệu lệnh (hoặc trận đã xong) thì không ra chiêu, kể cả buff
    if (p.map.def.arena && (!p.match || p.match.state !== 'fight')) return;
    if ((p.cool[sid] || 0) > now + 60) return;
    if (now - p.lastSkillAt < 180) return;
    const mpCost = Math.round(skillVal(sk.mp, lv));
    if (p.c.mp < mpCost) {
      p.notice('Không đủ chakra!', 'warn');
      return;
    }
    const map = p.map;
    let target = msg.tid ? this.resolve(map, msg.tid) : null;
    if (target && target.kind === 'p' && !this.canPvp(p, target.e)) target = null;
    const cy = p.y - PLAYER_H / 2;
    const dir = msg.dir === -1 ? -1 : 1;
    p.dir = dir;
    let victims = [];
    let fxTarget = null;
    const mul = skillVal(sk.mul, lv);

    switch (sk.type) {
      case 'single': {
        if (!target || !this.inRange(p, target, sk.range)) return;
        victims = [target];
        fxTarget = target;
        break;
      }
      case 'aoe': {
        let cx = p.x;
        let ccy = cy;
        if (sk.center === 'target') {
          if (!target || !this.inRange(p, target, sk.range)) return;
          cx = target.e.x;
          ccy = target.kind === 'm' ? target.e.y - target.e.def.h / 2 : target.e.y - PLAYER_H / 2;
          fxTarget = target;
        }
        const r = sk.radius;
        victims = this.enemiesIn(p, (x, y, w) => {
          const dx = Math.max(0, Math.abs(x - cx) - w / 2);
          const dy = (y - ccy) * 1.4;
          return dx * dx + dy * dy <= r * r;
        }, 10);
        break;
      }
      case 'line': {
        victims = this.enemiesIn(p, (x, y, w) => {
          const dx = (x - p.x) * dir;
          return dx >= -w / 2 && dx - w / 2 <= sk.range && Math.abs(y - cy) < 34;
        }, 10);
        break;
      }
      case 'dash': {
        const map0 = map.def;
        const x0 = p.x;
        const x1 = Math.max(20, Math.min(map0.w - 20, p.x + dir * sk.range));
        victims = this.enemiesIn(p, (x, y, w) => {
          const lo = Math.min(x0, x1) - w / 2 - 10;
          const hi = Math.max(x0, x1) + w / 2 + 10;
          return x >= lo && x <= hi && Math.abs(y - cy) < 36;
        }, 10);
        p.x = x1;
        p.moveGrace = now + 600;
        p.send('pos', { x: Math.round(p.x), y: Math.round(p.y) });
        break;
      }
      case 'buff': {
        const b = sk.buff;
        const v = Math.round(skillVal(b.v, lv) * 10) / 10;
        const targets = [p];
        if (sk.party && p.party) {
          for (const id of p.party.members) {
            const o = map.players.get(id);
            if (o && o !== p && !o.dead && Math.abs(o.x - p.x) < 250) targets.push(o);
          }
        }
        for (const o of targets) {
          o.addBuff(sid, sk.name, b.stat, v, b.dur);
          if (o !== p) o.notice(`${p.name} tăng cường ${sk.name} cho bạn.`);
        }
        break;
      }
      case 'heal': {
        const pct = skillVal(sk.heal, lv) / 100;
        const targets = [p];
        if (p.party) {
          for (const id of p.party.members) {
            const o = map.players.get(id);
            if (o && o !== p && !o.dead && Math.abs(o.x - p.x) < sk.radius) targets.push(o);
          }
        }
        const healList = [];
        for (const o of targets) {
          const amt = Math.round(o.s.maxHp * pct);
          o.heal(amt, 0);
          healList.push([`p${o.id}`, amt]);
        }
        map.broadcast('heal', { list: healList });
        break;
      }
      default:
        return;
    }

    p.c.mp -= mpCost;
    p.cool[sid] = now + sk.cd;
    p.lastSkillAt = now;
    p.st = 3;
    p.markMe();
    map.broadcast('fx', {
      a: p.id, sid, dir,
      tid: fxTarget ? `${fxTarget.kind}${fxTarget.e.id}` : null,
      tx: fxTarget ? Math.round(fxTarget.e.x) : Math.round(p.x), ty: fxTarget ? Math.round(fxTarget.e.y) : Math.round(p.y),
    });
    if (victims.length) {
      p.lastCombat = now;
      const hits = sk.hits || 1;
      const list = [];
      const att = this.playerAtt(p);
      const isSkill = !sk.basic;
      let dealt = 0;
      for (const v of victims) {
        for (let h = 0; h < hits; h++) {
          if (v.kind === 'm') {
            if (v.e.dead) break;
            const r = this.calc(att, { def: v.e.def.def, dodge: 0, el: v.e.def.el }, mul, isSkill);
            list.push([`m${v.e.id}`, r.dmg, r.crit ? 1 : 0, 0]);
            if (sk.slow) v.e.slowUntil = now + sk.slow;
            dealt += Math.min(r.dmg, Math.max(0, v.e.hp));
            this.damageMonster(v.e, p, r.dmg);
          } else {
            // đòn trước đã kết thúc trận (lôi đài hạ gục, thách đấu phân thắng bại): các đòn sau không đánh tiếp
            if (v.e.dead || !this.canPvp(p, v.e)) break;
            const o = v.e;
            const r = this.calc(att, this.playerTgt(o), mul * PVP_SCALE, isSkill);
            list.push([`p${o.id}`, r.dmg, r.crit ? 1 : 0, r.miss ? 1 : 0]);
            if (!r.miss) {
              dealt += Math.min(r.dmg, Math.max(0, o.c.hp));
              this.damagePlayer(o, r.dmg, { player: p });
            }
          }
        }
      }
      if (list.length) map.broadcast('hit', { a: `p${p.id}`, list, sid });
      this.lifeSteal(p, dealt);
    }
  }

  // Ngọc Huyết Hồn: hồi % sát thương thực gây ra (không tính phần dư của đòn kết liễu)
  lifeSteal(p, dealt) {
    const ls = p.s.lifesteal || 0;
    if (ls <= 0 || dealt <= 0 || p.dead || p.c.hp >= p.s.maxHp) return 0;
    const amt = Math.min(Math.round((dealt * ls) / 100), p.s.maxHp - p.c.hp);
    if (amt <= 0) return 0;
    p.heal(amt, 0);
    // Gộp lượng hút máu, hiện số mỗi ~0.6s để không rối chữ giữa các con số sát thương
    p.lsAcc = (p.lsAcc || 0) + amt;
    const now = Date.now();
    if (p.map && now - (p.lsShownAt || 0) >= 600) {
      p.map.broadcast('heal', { list: [[`p${p.id}`, p.lsAcc]], ls: 1 });
      p.lsAcc = 0;
      p.lsShownAt = now;
    }
    return amt;
  }

  // ---------- Quái
  damageMonster(m, p, dmg) {
    if (m.dead) return;
    // ghi nhận sát thương thực (không tính phần dư của đòn kết liễu) để chia thưởng theo % máu
    const real = Math.min(dmg, Math.max(0, m.hp));
    m.hp -= dmg;
    m.dmgBy.set(p.name, (m.dmgBy.get(p.name) || 0) + real);
    m.aggroOn(p);
    if (m.target !== p.id && Math.random() < 0.15) m.target = p.id;
    if (m.hp <= 0) this.killMonster(m, p);
    else if (m.boss && m.checkRage) m.checkRage();
  }

  // ---------- Chiêu boss: hết thời gian niệm thì tính sát thương theo vùng đã báo trước
  bossSkillHit(m, c) {
    const map = m.map;
    const d = m.def;
    const sk = c.sk;
    const now = Date.now();
    const hit = m.castPub(c);
    if (sk.k === 'summon') hit.pts = this.summonMinions(m, sk);
    map.broadcast('bossHit', hit);
    if (!sk.mul || map.def.town) return;
    const att = { atk: d.atk, crit: 10, hit: d.lv * 2, el: d.el };
    const ex = sk.extra || {};
    const list = [];
    for (const p of map.players.values()) {
      if (p.dead || !inBossZone(c, p)) continue;
      const r = this.calc(att, this.playerTgt(p), sk.mul, false);
      list.push([`p${p.id}`, r.dmg, r.crit ? 1 : 0, r.miss ? 1 : 0]);
      p.lastCombat = now;
      if (r.miss) continue;
      this.damagePlayer(p, r.dmg, { monster: m });
      if (ex.slow && !p.dead) {
        p.addBuff('bs_slow', sk.name, 'spd', -ex.slow, ex.dur);
        p.notice(`Bị ${sk.name} làm chậm!`, 'warn');
      }
    }
    if (list.length) map.broadcast('hit', { a: `m${m.id}`, list, bs: 1 });
  }

  // Gọi quái con quanh boss; trả về vị trí từng con (để client vẽ vòng triệu hồi)
  summonMinions(m, sk) {
    const map = m.map;
    const { m: key, n } = sk.extra;
    const pts = [];
    if (!MONSTERS[key]) return pts;
    const room = Math.max(0, n * 2 - m.minions());
    for (let i = 0; i < Math.min(n, room); i++) {
      const cx = Math.max(60, Math.min(map.def.w - 60, m.x + (i - (n - 1) / 2) * 46 + m.dir * 30));
      const o = map.addMonster(key, { m: key, x1: cx - 6, x2: cx + 6, y: m.y }, false);
      o.noRespawn = true;
      o.master = m.id;
      o.target = m.target;
      map.broadcast('mSpawn', o.pub());
      pts.push([Math.round(o.x), Math.round(o.y)]);
    }
    return pts;
  }

  // Xóa hẳn quái khỏi bản đồ (quái con khi boss chết, boss sự kiện hết giờ)
  removeMonster(o) {
    o.dead = true;
    o.cast = null;
    o.map.monsters.delete(o.id);
    o.map.broadcast('mGone', { id: o.id });
  }

  // Chỉ số phòng thủ của người chơi khi bị đánh (dùng chung cho PvP và quái đánh người)
  playerTgt(o) {
    return { def: o.s.def, dodge: o.s.dodge, el: o.el, resist: o.s.resist };
  }

  monsterAttack(m, p) {
    const d = m.def;
    const now = Date.now();
    const targets = [p];
    if (m.boss && d.aoe) {
      for (const o of m.map.players.values()) {
        if (o !== p && !o.dead && Math.abs(o.x - m.x) < d.aoe + d.w / 2 && Math.abs(o.y - m.y) < 80) targets.push(o);
      }
    }
    const list = [];
    for (const t of targets) {
      const r = this.calc({ atk: d.atk, crit: m.boss ? 10 : 3, hit: d.lv, el: d.el }, this.playerTgt(t), 1, false);
      list.push([`p${t.id}`, r.dmg, r.crit ? 1 : 0, r.miss ? 1 : 0]);
      t.lastCombat = now;
      if (!r.miss) this.damagePlayer(t, r.dmg, { monster: m });
    }
    m.map.broadcast('hit', { a: `m${m.id}`, list, ranged: d.ranged ? 1 : 0 });
  }

  killMonster(m, killer) {
    const now = Date.now();
    const d = m.def;
    const map = m.map;
    m.dead = true;
    m.hp = 0;
    m.target = 0;
    m.respawnAt = now + d.respawn * (m.boss ? 1 : 0.8 + Math.random() * 0.4);
    map.broadcast('mDie', { id: m.id });

    if (m.boss) {
      m.cast = null;
      for (const o of [...map.monsters.values()]) if (o.master === m.id && !o.dead) this.removeMonster(o);
    }

    let owner = killer;
    if (m.boss) {
      let best = null;
      let bd = -1;
      for (const [name, dmg] of m.dmgBy) {
        const pl = this.world.byName.get(name.toLowerCase());
        if (pl && pl.map === map && dmg > bd) {
          bd = dmg;
          best = pl;
        }
      }
      if (best) owner = best;
    }

    if (m.event && this.world.event) {
      // boss sự kiện: thưởng theo bảng xếp hạng sát thương (modules/events)
      this.world.event.onKill(m, owner);
    } else if (m.boss) {
      // Chia EXP theo % sát thương, thưởng lượng cho top 3
      const total = [...m.dmgBy.values()].reduce((a, b) => a + b, 0) || 1;
      const ranking = [...m.dmgBy.entries()].sort((a, b) => b[1] - a[1]);
      ranking.forEach(([name, dmg], idx) => {
        const pl = this.world.byName.get(name.toLowerCase());
        if (!pl || pl.map !== map) return;
        const share = dmg / total;
        const raw = Math.round(d.exp * (0.15 + share));
        const got = pl.gainExp(raw);
        pl.petKillExp(raw);
        let luong = idx === 0 ? 20 : idx === 1 ? 10 : idx === 2 ? 5 : share > 0.02 ? 1 : 0;
        if (m.noRespawn) luong = idx === 0 ? 3 : 1;
        if (luong) {
          pl.c.luong += luong;
          pl.markMe();
        }
        pl.notice(`Tham gia diệt ${d.name}: +${got} EXP${luong ? `, +${luong} lượng` : ''}`, 'reward');
        pl.onKill(m.k);
      });
      if (!m.noRespawn) this.world.announce(`${owner.name} đã tiêu diệt boss ${d.name} tại ${map.def.name}!`, 'boss');
    } else {
      this.shareExp(owner, m);
    }
    owner.c.kills++;

    // quái con chỉ cho EXP (không rơi đồ, tránh gọi ra để cày); quái không hồi sinh ngoài phó bản thì xóa luôn
    if (m.master || m.event) map.monsters.delete(m.id);
    if (m.master) return;

    // Rơi đồ
    const drops = this.rollDrops(m);
    const n = drops.length;
    drops.forEach((dr, i) => {
      const x = m.x + (i - (n - 1) / 2) * 12;
      map.dropItem(dr.it || null, dr.xu || 0, x, m.onPlatform ? m.y : m.spawn.y, owner.name);
    });
    // vật phẩm sự kiện theo mùa (module season)
    hooks.emit(this.world, 'monsterKilled', owner, m);
  }

  shareExp(owner, m) {
    const d = m.def;
    const map = m.map;
    const mods = (plv) => {
      const diff = plv - d.lv;
      if (diff > 10) return 0.1;
      if (diff > 5) return 0.5;
      if (diff < -10) return 1.3;
      return 1;
    };
    let members = [owner];
    if (owner.party) {
      members = [...owner.party.members].map((id) => map.players.get(id)).filter((o) => o && !o.dead);
      if (!members.includes(owner)) members.push(owner);
    }
    const bonus = (1 + 0.12 * (members.length - 1)) * this.world.expEvent();
    const each = (d.exp * bonus) / members.length;
    for (const o of members) {
      const raw = each * mods(o.lv) * (o === owner ? 1.1 : 1);
      const got = o.gainExp(raw);
      o.petKillExp(raw);
      o.send('expGain', { n: got, x: Math.round(m.x), y: Math.round(m.y - d.h) });
      o.onKill(m.k);
    }
  }

  rollDrops(m) {
    const d = m.def;
    const lv = d.lv;
    const out = [];
    const boss = m.boss;
    out.push({ xu: randInt(lv * 2 + 3, lv * 5 + 8) * (boss ? 40 : 1) });
    for (const [id, ch] of d.drops || []) if (Math.random() < ch) out.push({ it: makeItem(id, 1) });
    const tier = Math.min(TIERS - 1, Math.floor(lv / 10));
    const eqCount = boss ? 4 : Math.random() < 0.045 ? 1 : 0;
    for (let i = 0; i < eqCount; i++) {
      const id = randomEquipId(tier);
      out.push({ it: makeItem(id, 1, rollRarity(boss)) });
    }
    const stone = lv < 30 ? 'stone1' : lv < 60 ? 'stone2' : lv < 90 ? 'stone3' : 'stone4';
    if (boss) out.push({ it: makeItem(stone, randInt(3, 6)) });
    else if (Math.random() < 0.035) out.push({ it: makeItem(stone, 1) });
    if (Math.random() < 0.06) {
      const pt = lv < 10 ? 1 : lv < 30 ? 2 : lv < 60 ? 3 : 4;
      out.push({ it: makeItem(Math.random() < 0.6 ? `hp${pt}` : `mp${pt}`, randInt(1, 3)) });
    }
    // ngọc khảm: quái thường hiếm khi rơi (cấp 1, quái từ cấp 40 có thể ra cấp 2); boss luôn rơi 1 viên cấp 2-5 theo cấp boss
    if (boss) out.push({ it: makeItem(randomGem(Math.min(5, 2 + Math.floor(lv / 35))), 1) });
    else if (Math.random() < GEM.dropRate) out.push({ it: makeItem(randomGem(lv >= 40 && Math.random() < 0.25 ? 2 : 1), 1) });
    if (boss) out.push({ it: makeItem('chest', 2) });
    else if (Math.random() < 0.004) out.push({ it: makeItem('chest', 1) });
    return out;
  }

  // ---------- Người chơi bị đánh
  damagePlayer(p, dmg, src) {
    if (p.dead) return;
    const m = p.match;
    if (m) {
      // lôi đài: ngoài lúc đấu không mất máu; đánh trúng đánh dấu trận đã giao đấu (trận bỏ ngang khi chưa ai ra đòn thì không tính)
      if (m.state !== 'fight') return;
      if (src.player && src.player.match === m) m.hit = true;
    }
    p.c.hp -= dmg;
    p.lastCombat = Date.now();
    p.markMe();
    if (p.c.hp > 0) return;
    const a = src.player;
    // lôi đài: bị hạ là thua trận, không trọng thương / mất EXP
    if (a && p.match && a.match === p.match && this.world.arena) {
      this.world.arena.ko(p);
      return;
    }
    if (a && a.duel === p.id && p.duel === a.id) {
      p.c.hp = 1;
      this.world.mods.pk.endDuel(a, p);
      return;
    }
    this.killPlayer(p, src);
  }

  killPlayer(p, src) {
    p.c.hp = 0;
    p.dead = true;
    p.st = 0;
    p.c.deaths = (p.c.deaths || 0) + 1;
    const c = p.c;
    let lost = 0;
    const killerP = src.player;
    const map = p.map;
    if (!(map && map.def.pvp)) {
      const pct = c.pk > 0 ? 0.05 : killerP ? 0.01 : 0.02;
      if (c.level >= 5) {
        lost = Math.min(c.exp, Math.round(expNeed(c.level) * pct));
        c.exp -= lost;
      }
    }
    if (killerP) {
      if (!map.def.pvp && !p.pkMode && c.pk <= 0) {
        killerP.c.pk = Math.min(99, killerP.c.pk + 1);
        killerP.notice(`Bạn đã sát hại ${p.name}. Điểm hiếu chiến: ${killerP.c.pk}`, 'warn');
        killerP.markMe();
      }
      if (map) map.broadcast('chat', { ch: 'sys', msg: `${killerP.name} đã hạ gục ${p.name}!` });
    }
    for (const m of map ? map.monsters.values() : []) if (m.target === p.id) m.target = 0;
    p.send('dead', { lost, by: killerP ? killerP.name : src.monster ? src.monster.def.name : '' });
    p.markMe();
  }
}

module.exports = { Combat, MIN_PK_LEVEL, inBossZone };
