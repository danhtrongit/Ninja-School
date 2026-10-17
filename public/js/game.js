// Vòng lặp game phía client: vật lý, đồng bộ mạng, chiến đấu, vẽ
import { S, skillVal } from './store.js';
import { drawNinja, ELEMENT_COLORS, NINJA_H } from './sprites.js';
import { drawMonster, monsterHeight } from './monsterart.js';
import { iconCanvas } from './icons.js';
import { MapRenderer } from './maprender.js';
import { FX } from './fx.js';
import { sfx } from './sound.js';

const GRAV = 1000;
const JUMP = 378;
const JUMP2 = 330;
const SPEED = 110;
const PH = NINJA_H;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Game {
  constructor(net, ui, input) {
    this.net = net;
    this.ui = ui;
    this.input = input;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.lo = document.createElement('canvas');
    this.lctx = this.lo.getContext('2d');
    this.fx = new FX();
    this.players = new Map();
    this.monsters = new Map();
    this.items = new Map();
    this.dying = [];
    this.bubbles = new Map();
    this.me = null;
    this.map = null;
    this.renderer = null;
    this.target = null;
    this.cool = {};
    this.chase = null;
    this.walkTo = null;
    this.auto = false;
    this.autoBlack = new Map();
    this.autoStuck = { id: null, since: 0 };
    this.camX = 0;
    this.camY = 0;
    this.t = 0;
    this.active = false;
    this.lastSendAt = 0;
    this.lastSent = '';
    this.lastCast = 0;
    this.lastPortal = 0;
    this.lastPotion = { hp: 0, mp: 0 };
    this.duelWith = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    this.bind();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.zoom = Math.max(1, Math.min(Math.round(this.canvas.height / 235), Math.floor(this.canvas.width / 300)));
    while (this.canvas.width / this.zoom > 760) this.zoom++;
    this.W = Math.ceil(this.canvas.width / this.zoom);
    this.H = Math.ceil(this.canvas.height / this.zoom);
    this.lo.width = this.W;
    this.lo.height = this.H;
    this.lctx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------------- Mạng
  bind() {
    const n = this.net;
    n.on('enterMap', (m) => this.enterMap(m));
    n.on('state', (m) => this.onState(m));
    n.on('pJoin', (m) => {
      if (S.me && m.id !== S.me.id) this.addPlayer(m);
    });
    n.on('pLeave', (m) => {
      this.players.delete(m.id);
      if (this.target && this.target.kind === 'p' && this.target.id === m.id) this.target = null;
    });
    n.on('pInfo', (m) => {
      const p = this.players.get(m.id);
      if (p) {
        p.info = m;
        p.dead = m.dead;
      }
    });
    n.on('mSpawn', (m) => this.addMonster(m));
    n.on('mDie', (m) => {
      const mo = this.monsters.get(m.id);
      if (mo) {
        this.dying.push({ ...mo, dieT: 0 });
        this.fx.sparks(mo.x, mo.y - mo.def.h / 2, mo.def.pal[0], 14, 70);
      }
      this.monsters.delete(m.id);
      if (this.target && this.target.kind === 'm' && this.target.id === m.id) this.target = null;
      this.ui.updateTarget(null);
    });
    n.on('gAdd', (m) => this.items.set(m.id, { ...m, born: this.t }));
    n.on('gDel', (m) => this.items.delete(m.id));
    n.on('hit', (m) => this.onHit(m));
    n.on('fx', (m) => this.onFx(m));
    n.on('heal', (m) => {
      for (const [tid, amt] of m.list) {
        const e = this.entity(tid);
        if (e && amt) this.fx.text(e.x, e.y - 28, `+${amt}`, '#69f0ae');
      }
    });
    n.on('levelUp', (m) => {
      const getter = () => this.entity(`p${m.id}`);
      this.fx.levelUp(getter);
      if (S.me && m.id === S.me.id) sfx('level');
      const e = getter();
      if (e) this.fx.text(e.x, e.y - 34, 'LÊN CẤP!', '#ffd54f', true);
    });
    n.on('expGain', (m) => {
      if (m.n > 0) this.fx.text(m.x, m.y - 6, `+${m.n} EXP`, '#b3e5fc');
    });
    n.on('loot', (m) => {
      if (!this.me) return;
      sfx(m.k === 'xu' ? 'coin' : 'pickup');
      if (m.k === 'xu') this.fx.text(this.me.x, this.me.y - 30, `+${m.q} xu`, '#ffd54f');
      else {
        const def = S.G.items[m.k];
        this.fx.text(this.me.x, this.me.y - 30, `${def.name}${m.q > 1 ? ` x${m.q}` : ''}`, S.G.rarity[m.r || 0].color);
      }
    });
    n.on('pos', (m) => {
      if (this.me) {
        this.me.x = m.x;
        this.me.y = m.y;
        this.me.vy = 0;
      }
    });
    n.on('dead', () => {
      sfx('die');
      this.chase = null;
      this.walkTo = null;
    });
    n.on('chat', (m) => {
      if (m.ch === 'map' && m.id) this.bubbles.set(m.id, { msg: m.msg, until: this.t + 5 });
    });
    n.on('duel', (m) => {
      this.duelWith = m.with || 0;
    });
  }

  enterMap(m) {
    this.map = S.G.maps[m.map];
    this.renderer = new MapRenderer(this.map);
    S.me = m.me;
    this.players.clear();
    this.monsters.clear();
    this.items.clear();
    this.dying = [];
    this.bubbles.clear();
    for (const p of m.players) if (p.id !== m.me.id) this.addPlayer(p);
    for (const mo of m.monsters) this.addMonster(mo);
    for (const it of m.items) this.items.set(it.id, { ...it, born: -10 });
    this.me = { x: m.x, y: m.y, vx: 0, vy: 0, dir: this.me ? this.me.dir : 1, onGround: true, jumps: 0, st: 0, attackT: 0, dropT: 0 };
    this.target = null;
    this.chase = null;
    this.walkTo = null;
    this.duelWith = 0;
    this.camX = clamp(this.me.x - this.W / 2, 0, Math.max(0, this.map.w - this.W));
    this.camY = this.camTargetY();
    this.active = true;
    this.lastPortal = performance.now();
    this.ui.onEnterMap(this.map);
  }

  addPlayer(p) {
    const old = this.players.get(p.id);
    this.players.set(p.id, {
      id: p.id, info: p, x: old ? old.x : p.x, y: old ? old.y : p.y, tx: p.x, ty: p.y, dir: p.dir, st: 0,
      hp: p.hp, mhp: p.mhp, dead: p.dead, pk: p.pkMode, flash: 0,
    });
  }

  addMonster(m) {
    const def = S.G.monsters[m.k];
    this.monsters.set(m.id, { id: m.id, k: m.k, def, x: m.x, y: m.y, tx: m.x, ty: m.y, dir: m.dir, st: 0, hp: m.hp, mhp: m.mhp, flash: 0, h: monsterHeight(def) });
  }

  onState(m) {
    for (const [id, x, y, dir, st, hp, mhp, flags] of m.p) {
      if (S.me && id === S.me.id) continue;
      const p = this.players.get(id);
      if (!p) continue;
      p.tx = x;
      p.ty = y;
      p.dir = dir;
      p.st = st;
      p.hp = hp;
      p.mhp = mhp;
      p.dead = !!(flags & 1);
      p.pk = !!(flags & 2);
    }
    for (const [id, x, y, dir, st, hp] of m.m) {
      const mo = this.monsters.get(id);
      if (!mo) continue;
      mo.tx = x;
      mo.ty = y;
      mo.dir = dir;
      mo.st = st;
      mo.hp = hp;
    }
  }

  entity(tid) {
    if (!tid) return null;
    const id = +tid.slice(1);
    if (tid[0] === 'm') return this.monsters.get(id) || null;
    if (S.me && id === S.me.id) return this.me;
    return this.players.get(id) || null;
  }

  centerY(tid, e) {
    if (tid[0] === 'm') return e.y - e.def.h / 2 - (e.def.fly ? 10 : 0);
    return e.y - 11;
  }

  onHit(m) {
    const meTid = S.me ? `p${S.me.id}` : '';
    const att = this.entity(m.a);
    for (const [tid, dmg, crit, miss] of m.list) {
      const e = this.entity(tid);
      if (!e) continue;
      const cy = this.centerY(tid, e);
      if (m.a[0] === 'm' && att) {
        if (m.ranged) this.fx.proj(att.x, att.y - att.def.h / 2, e.x, cy, 'fire', att.def.pal[2], { life: 0.25 });
        else this.fx.sparks(e.x, cy, '#ff8a80', 5, 40);
      }
      if (miss) {
        this.fx.text(e.x, cy - 14, 'Né', '#b0bec5');
        continue;
      }
      if (m.a === meTid) sfx(crit ? 'crit' : 'hit');
      else if (tid === meTid) sfx('hurt');
      e.flash = this.t + 0.12;
      let col = '#ffffff';
      if (tid === meTid) col = '#ff5252';
      else if (m.a === meTid) col = crit ? '#ffeb3b' : '#ffffff';
      else col = '#ffcc80';
      this.fx.text(e.x, cy - 14, crit ? `${dmg}!` : `${dmg}`, col, crit);
      if (tid[0] === 'm') e.hp = Math.max(0, e.hp - dmg);
      this.fx.sparks(e.x, cy, crit ? '#ffeb3b' : '#ffffff', crit ? 10 : 4, 50);
      if (tid === meTid && m.a[0] === 'm' && !this.getTarget()) this.target = { kind: 'm', id: +m.a.slice(1) };
    }
  }

  onFx(m) {
    const sk = S.G.skills[m.sid];
    if (!sk) return;
    const a = this.entity(`p${m.a}`);
    if (!a) return;
    const f = sk.fx;
    const dir = m.dir || 1;
    if (S.me && m.a !== S.me.id) {
      a.attackUntil = this.t + 0.25;
      a.dir = dir;
    }
    if (S.me && m.a === S.me.id) {
      if (f.k === 'slash' || f.k === 'dash') sfx('swing');
      else if (f.k === 'proj' || f.k === 'rain' || f.k === 'wave') sfx('shoot');
      else if (f.k === 'heal') sfx('heal');
      else sfx('magic');
    }
    const te = m.tid ? this.entity(m.tid) : null;
    const tx = te ? te.x : m.tx;
    const ty = te ? this.centerY(m.tid, te) : m.ty - 11;
    const tFeet = te ? te.y : m.ty;
    const ay = a.y - 12;
    switch (f.k) {
      case 'slash': this.fx.slash(a.x, a.y, dir, f.c, f.big); break;
      case 'proj':
        for (let i = 0; i < (f.n || 1); i++) this.fx.proj(a.x + dir * 6, ay, tx, ty, f.p, f.c, { delay: i * 0.09, boom: f.boom, big: f.big });
        break;
      case 'burst':
        if (sk.center === 'target') this.fx.burst(tx, tFeet, sk.radius, f.c, f.big);
        else this.fx.burst(a.x, a.y, sk.radius, f.c, f.big);
        break;
      case 'wave': this.fx.wave(a.x, a.y, dir, sk.range, f.c, f.p); break;
      case 'rain': this.fx.rain(tx, tFeet, sk.radius, f.p, f.c, f.big); break;
      case 'meteor': this.fx.meteor(tx, tFeet, sk.radius, f.c); break;
      case 'whirl':
        if (sk.center === 'target') this.fx.whirl(tx, tFeet, sk.radius, f.c, f.big);
        else this.fx.whirl(a.x, a.y, sk.radius, f.c, f.big);
        break;
      case 'aura': this.fx.aura(() => this.entity(`p${m.a}`), f.c); break;
      case 'heal': this.fx.heal(() => this.entity(`p${m.a}`), f.c); break;
      case 'dash': this.fx.dash(m.tx - dir * sk.range, m.tx, m.ty, dir, f.c); break;
      default:
    }
  }

  send(t, d) {
    this.net.send(t, d);
  }

  sendMove(force) {
    const me = this.me;
    if (!me) return;
    const now = performance.now();
    const key = `${Math.round(me.x)},${Math.round(me.y)},${me.dir},${me.st}`;
    if (!force && (key === this.lastSent || now - this.lastSendAt < 66)) return;
    this.lastSent = key;
    this.lastSendAt = now;
    this.net.send('move', { x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, st: me.st });
  }

  // ---------------- Mục tiêu
  getTarget() {
    const t = this.target;
    if (!t) return null;
    const e = t.kind === 'm' ? this.monsters.get(t.id) : this.players.get(t.id);
    if (!e || e.dead) return null;
    return { kind: t.kind, id: t.id, e };
  }

  setTarget(t) {
    this.target = t ? { kind: t.kind, id: t.id } : null;
  }

  canPvp(p) {
    const me = S.me;
    if (!me || !p || p.dead || this.map.town) return false;
    if (this.duelWith && p.id === this.duelWith) return true;
    if (p.info.party && p.info.party === S.party.id) return false;
    if (this.map.pvp) return true;
    if (me.clan && p.info.clan && me.clan.name === p.info.clan) return false;
    return me.pkMode && me.level >= 10 && p.info.lv >= 10;
  }

  isEnemy(t) {
    return t && (t.kind === 'm' || this.canPvp(t.e));
  }

  inRange(t, range, margin = 4) {
    const me = this.me;
    const e = t.e;
    const w = t.kind === 'm' ? e.def.w : 12;
    const h = t.kind === 'm' ? e.def.h : PH;
    const dx = Math.abs(e.x - me.x) - w / 2;
    const dy = Math.abs((e.y - h / 2) - (me.y - PH / 2));
    const dyTol = (range > 90 ? 110 : 46) + h / 2;
    return dx <= range + 8 - margin && dy <= dyTol - margin;
  }

  autoTarget(range, quiet, forAuto) {
    const me = this.me;
    let best = null;
    let bd = 1e9;
    const now = this.t;
    for (const m of this.monsters.values()) {
      if (forAuto) {
        const bl = this.autoBlack.get(m.id);
        if (bl && bl > now) continue;
        if (m.def.lv > S.me.level + 8 && !m.def.boss) continue;
      }
      const dx = Math.abs(m.x - me.x);
      const dy = Math.abs(m.y - me.y);
      if (dx > range || dy > 140) continue;
      const facing = (m.x - me.x) * me.dir >= 0 ? 0 : 25;
      const d = dx + dy * 1.5 + facing;
      if (d < bd) {
        bd = d;
        best = { kind: 'm', id: m.id, e: m };
      }
    }
    if (!forAuto) {
      for (const p of this.players.values()) {
        if (!this.canPvp(p)) continue;
        const dx = Math.abs(p.x - me.x);
        if (dx > range || Math.abs(p.y - me.y) > 140) continue;
        const d = dx + Math.abs(p.y - me.y) * 1.5 - 10;
        if (d < bd) {
          bd = d;
          best = { kind: 'p', id: p.id, e: p };
        }
      }
    }
    return best;
  }

  cycleTarget() {
    const me = this.me;
    const list = [...this.monsters.values()]
      .filter((m) => Math.abs(m.x - me.x) < 300 && Math.abs(m.y - me.y) < 150)
      .sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x));
    if (!list.length) return;
    const cur = this.target && this.target.kind === 'm' ? list.findIndex((m) => m.id === this.target.id) : -1;
    const next = list[(cur + 1) % list.length];
    this.target = { kind: 'm', id: next.id };
  }

  // ---------------- Kỹ năng
  skillReady(sid) {
    const sk = S.G.skills[sid];
    const lv = S.me.skills[sid];
    if (!sk || !lv) return false;
    return (this.cool[sid] || 0) <= performance.now() && S.me.mp >= Math.round(skillVal(sk.mp, lv));
  }

  useSkill(sid, auto) {
    const me = S.me;
    if (!sid || !me || me.dead || !this.me) return false;
    const sk = S.G.skills[sid];
    const lv = me.skills[sid];
    if (!sk || !lv) return false;
    const now = performance.now();
    if ((this.cool[sid] || 0) > now) return false;
    if (now - this.lastCast < 200) return false;
    const mp = Math.round(skillVal(sk.mp, lv));
    if (me.mp < mp) {
      if (!auto) this.ui.toast('Không đủ chakra!');
      return false;
    }
    const needsTarget = sk.type === 'single' || (sk.type === 'aoe' && sk.center === 'target');
    let t = this.getTarget();
    if (t && !this.isEnemy(t)) t = null;
    if (!t) t = this.autoTarget(needsTarget ? sk.range + 220 : 200, auto);
    if (needsTarget) {
      if (!t) {
        if (!auto) this.ui.toast('Không có mục tiêu gần đây');
        return false;
      }
      this.setTarget(t);
      if (!this.inRange(t, sk.range)) {
        this.chase = { sid, kind: t.kind, id: t.id, since: this.t };
        return false;
      }
    }
    if (t && sk.type !== 'buff' && sk.type !== 'heal') this.me.dir = t.e.x >= this.me.x ? 1 : -1;
    this.chase = null;
    this.sendMove(true);
    this.net.send('skill', { sid, tid: t ? `${t.kind}${t.id}` : null, dir: this.me.dir });
    this.cool[sid] = now + sk.cd;
    this.lastCast = now;
    this.me.attackT = 0.25;
    return true;
  }

  basicSkill() {
    return Object.keys(S.G.skills).find((id) => S.G.skills[id].cls === S.me.cls && S.G.skills[id].basic);
  }

  usePotion(kind, auto) {
    const now = performance.now();
    if (now - this.lastPotion[kind] < 600) return;
    // ưu tiên bình nhỏ nhất đủ dùng
    const need = kind === 'hp' ? S.me.s.maxHp - S.me.hp : S.me.s.maxMp - S.me.mp;
    if (need <= 0) return;
    let best = -1;
    let bestScore = 1e12;
    S.inv.forEach((it, i) => {
      if (!it) return;
      const def = S.G.items[it.id];
      if (def.type !== 'potion' || !def.effect[kind] || def.lv > S.me.level) return;
      const v = def.effect[kind];
      const score = v >= need ? v - need : (need - v) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best < 0) {
      if (!auto) this.ui.toast(kind === 'hp' ? 'Hết bình sinh lực!' : 'Hết bình chakra!');
      return;
    }
    this.lastPotion[kind] = now;
    this.net.send('useItem', { slot: best });
  }

  // ---------------- Tương tác
  nearDoor() {
    return this.map.portals.findIndex((p) => p.door && Math.abs(p.x - this.me.x) < 22);
  }

  interact() {
    if (!this.me || S.me.dead) return;
    const d = this.nearDoor();
    if (d >= 0) return this.usePortal(d);
    let best = null;
    let bd = 90;
    for (const n of this.map.npcs) {
      const dx = Math.abs(n.x - this.me.x);
      if (dx < bd) {
        bd = dx;
        best = n;
      }
    }
    if (best) return this.net.send('npc', { id: best.id });
    this.net.send('pickup', {});
  }

  usePortal(i) {
    const now = performance.now();
    if (now - this.lastPortal < 800) return;
    this.lastPortal = now;
    this.sendMove(true);
    this.net.send('portal', { i });
  }

  jump() {
    const me = this.me;
    if (!me || S.me.dead) return;
    if (this.input.has('down') && me.onGround && me.y < this.map.ground - 1) {
      me.dropT = 0.22;
      me.y += 1;
      me.onGround = false;
      return;
    }
    if (me.onGround) {
      me.vy = -JUMP;
      me.jumps = 1;
      me.onGround = false;
    } else if (me.jumps < 2) {
      me.vy = -JUMP2;
      me.jumps = 2;
      this.fx.sparks(me.x, me.y, '#ffffff', 6, 30);
    }
  }

  onPointer(e) {
    if (!this.active || !this.me) return;
    const wx = (e.clientX * this.dpr) / this.zoom + this.camX;
    const wy = (e.clientY * this.dpr) / this.zoom + this.camY;
    // NPC
    const G = this.map.ground;
    for (const n of this.map.npcs) {
      if (Math.abs(wx - n.x) < 10 && wy > G - 30 && wy < G + 4) {
        if (Math.abs(n.x - this.me.x) < 110) this.net.send('npc', { id: n.id });
        else this.walkTo = { x: n.x, npc: n.id };
        return;
      }
    }
    // Quái
    for (const m of this.monsters.values()) {
      const top = m.y - m.h - 4;
      if (Math.abs(wx - m.x) < m.def.w / 2 + 6 && wy > top && wy < m.y + 4) {
        this.target = { kind: 'm', id: m.id };
        return;
      }
    }
    // Người chơi
    for (const p of this.players.values()) {
      if (Math.abs(wx - p.x) < 9 && wy > p.y - NINJA_H - 4 && wy < p.y + 3) {
        this.target = { kind: 'p', id: p.id };
        this.ui.playerMenu(p.info, e.clientX, e.clientY);
        return;
      }
    }
    // Vật phẩm
    for (const it of this.items.values()) {
      if (Math.abs(wx - it.x) < 10 && Math.abs(wy - (it.y - 6)) < 12) {
        if (Math.abs(it.x - this.me.x) < 70) this.net.send('pickup', { id: it.id });
        else this.walkTo = { x: it.x };
        return;
      }
    }
    // Cửa
    for (let i = 0; i < this.map.portals.length; i++) {
      const p = this.map.portals[i];
      if (p.door && Math.abs(wx - p.x) < 20 && wy > G - 50 && wy < G + 4) {
        if (Math.abs(p.x - this.me.x) < 22) this.usePortal(i);
        else this.walkTo = { x: p.x, door: i };
        return;
      }
    }
  }

  handleInput() {
    for (const a of this.input.take()) {
      if (a.startsWith('w_')) {
        this.ui.toggle(a.slice(2));
        continue;
      }
      switch (a) {
        case 'jump': {
          const d = this.nearDoor();
          if (d >= 0 && this.me.onGround) this.usePortal(d);
          else this.jump();
          break;
        }
        case 'attack': this.useSkill(this.basicSkill()); break;
        case 's1': case 's2': case 's3': case 's4': case 's5':
          this.useSkill(S.me.hotbar[+a[1] - 1]);
          break;
        case 'hp': this.usePotion('hp'); break;
        case 'mp': this.usePotion('mp'); break;
        case 'pick': this.net.send('pickup', {}); break;
        case 'talk': this.interact(); break;
        case 'target': this.cycleTarget(); break;
        case 'auto': this.toggleAuto(); break;
        case 'chat': this.ui.focusChat(); break;
        case 'esc': this.ui.closeAll(); break;
        default:
      }
    }
  }

  toggleAuto(v) {
    this.auto = v === undefined ? !this.auto : v;
    this.autoBlack.clear();
    this.ui.setAuto(this.auto);
    if (!this.auto) {
      this.chase = null;
      this.walkTo = null;
    }
  }

  // ---------------- Cập nhật
  update(dt) {
    this.t += dt;
    if (!this.active || !this.me || !S.me) return;
    this.handleInput();
    const me = this.me;
    const dead = S.me.dead;
    let dirX = 0;
    if (!dead) {
      if (this.input.has('left')) dirX -= 1;
      if (this.input.has('right')) dirX += 1;
    }
    let intent = 0;
    this.wantJump = false;
    if (dirX) {
      this.chase = null;
      this.walkTo = null;
    } else if (!dead) {
      intent = this.updateIntent();
    }
    const move = dirX || intent;
    const speed = SPEED * (1 + (S.me.s.spd || 0) / 100);
    me.vx = dead ? 0 : move * speed;
    if (move) me.dir = move > 0 ? 1 : -1;
    if (this.wantJump) this.jump();

    const G = this.map.ground;
    const oldY = me.y;
    me.vy = Math.min(600, me.vy + GRAV * dt);
    me.x = clamp(me.x + me.vx * dt, 4, this.map.w - 4);
    me.y += me.vy * dt;
    me.onGround = false;
    if (me.vy >= 0) {
      if (me.y >= G) {
        me.y = G;
        me.vy = 0;
        me.onGround = true;
      } else if (me.dropT <= 0) {
        for (const [px, py, pw] of this.map.platforms) {
          if (me.x >= px - 2 && me.x <= px + pw + 2 && oldY <= py + 0.5 && me.y >= py) {
            me.y = py;
            me.vy = 0;
            me.onGround = true;
            break;
          }
        }
      }
    }
    if (me.onGround) me.jumps = 0;
    me.dropT -= dt;
    me.attackT -= dt;
    me.st = me.attackT > 0 ? 3 : !me.onGround ? 2 : move ? 1 : 0;

    // Cổng ở mép bản đồ
    if (!dead && performance.now() - this.lastPortal > 1200) {
      this.map.portals.forEach((p, i) => {
        if (!p.door && Math.abs(me.x - p.x) < 12) this.usePortal(i);
      });
    }
    if (!dead) this.sendMove(false);

    // Nội suy thực thể khác
    const k = Math.min(1, dt * 10);
    for (const p of this.players.values()) {
      if (Math.abs(p.tx - p.x) > 120) p.x = p.tx;
      if (Math.abs(p.ty - p.y) > 120) p.y = p.ty;
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    }
    for (const m of this.monsters.values()) {
      if (Math.abs(m.tx - m.x) > 150) m.x = m.tx;
      m.x += (m.tx - m.x) * k;
      m.y += (m.ty - m.y) * k;
    }
    for (const d of this.dying) d.dieT += dt;
    this.dying = this.dying.filter((d) => d.dieT < 0.5);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.ui.updateTarget(this.getTarget());
  }

  // Di chuyển tự động: đuổi theo mục tiêu, đi tới NPC, auto đánh
  updateIntent() {
    const me = this.me;
    const manualRecently = performance.now() - this.input.lastManual < 1500;
    if (this.walkTo) {
      const dx = this.walkTo.x - me.x;
      if (Math.abs(dx) < 14) {
        if (this.walkTo.npc) this.net.send('npc', { id: this.walkTo.npc });
        if (this.walkTo.door != null) this.usePortal(this.walkTo.door);
        else if (!this.walkTo.npc) this.net.send('pickup', {});
        this.walkTo = null;
        return 0;
      }
      return Math.sign(dx);
    }
    if (this.auto && !manualRecently) this.updateAuto();
    if (this.chase) {
      const t = this.chase.kind === 'm' ? this.monsters.get(this.chase.id) : this.players.get(this.chase.id);
      if (!t || t.dead || this.t - this.chase.since > 8) {
        if (t && this.auto) this.autoBlack.set(t.id, this.t + 15);
        this.chase = null;
        return 0;
      }
      const tt = { kind: this.chase.kind, id: this.chase.id, e: t };
      const sk = S.G.skills[this.chase.sid];
      if (this.inRange(tt, sk.range)) {
        this.useSkill(this.chase.sid, true);
        this.chase = null;
        return 0;
      }
      return this.approach(t, sk.range);
    }
    return 0;
  }

  approach(t, range) {
    const me = this.me;
    const dx = t.x - me.x;
    const dy = t.y - me.y;
    if (dy < -30 && Math.abs(dx) < 70) {
      if (me.onGround) this.wantJump = true;
      else if (me.jumps === 1 && me.vy > -60 && t.y < me.y - 10) this.wantJump = true;
    } else if (dy > 30 && me.onGround && me.y < this.map.ground - 1 && Math.abs(dx) < 80) {
      me.dropT = 0.22;
      me.y += 1;
    }
    if (Math.abs(dx) <= Math.max(6, range * 0.6)) return 0;
    return Math.sign(dx);
  }

  updateAuto() {
    const me = S.me;
    const set = S.settings;
    if (me.hp < (me.s.maxHp * set.autoHp) / 100) this.usePotion('hp', true);
    if (me.mp < (me.s.maxMp * set.autoMp) / 100) this.usePotion('mp', true);
    if (this.chase) return;
    // nhặt đồ của mình
    if (set.autoPick && S.inv.some((x) => !x)) {
      let best = null;
      let bd = 170;
      for (const it of this.items.values()) {
        const dx = Math.abs(it.x - this.me.x);
        if (dx < bd && Math.abs(it.y - this.me.y) < 80 && this.t - it.born < 14) {
          bd = dx;
          best = it;
        }
      }
      if (best && bd > 12) {
        this.walkTo = { x: best.x };
        return;
      }
    }
    // buff
    for (const sid of me.hotbar) {
      if (!sid) continue;
      const sk = S.G.skills[sid];
      if ((sk.type === 'buff' || (sk.type === 'heal' && me.hp < me.s.maxHp * 0.6)) && this.skillReady(sid) && !me.buffs.some((b) => b.k === sid)) {
        if (this.useSkill(sid, true)) return;
      }
    }
    let t = this.getTarget();
    if (!t || t.kind !== 'm') {
      t = this.autoTarget(set.autoRange, true, true);
      if (t) this.setTarget(t);
    }
    if (!t) return;
    // kỹ năng mạnh trước
    const order = me.hotbar.filter(Boolean).slice().reverse();
    for (const sid of order) {
      const sk = S.G.skills[sid];
      if (!this.skillReady(sid) || sk.type === 'buff' || sk.type === 'heal') continue;
      if (sk.type === 'aoe' && sk.center === 'self' && !this.inRange(t, sk.radius * 0.8)) continue;
      if ((sk.type === 'line' || sk.type === 'dash') && !this.inRange(t, sk.range * 0.8)) continue;
      if (this.useSkill(sid, true)) return;
    }
    const basic = this.basicSkill();
    if (!this.useSkill(basic, true) && !this.chase) {
      const sk = S.G.skills[basic];
      if (!this.inRange(t, sk.range)) this.chase = { sid: basic, kind: 'm', id: t.id, since: this.t };
    }
  }

  camTargetY() {
    const H = this.H;
    const mh = this.map.h;
    if (H >= mh) return mh - H;
    return clamp(this.me.y - H * 0.68, 0, mh - H);
  }

  updateCamera(dt) {
    const W = this.W;
    const tx = this.map.w <= W ? (this.map.w - W) / 2 : clamp(this.me.x - W / 2 + this.me.dir * 20, 0, this.map.w - W);
    const ty = this.camTargetY();
    const k = Math.min(1, dt * 6);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
  }

  // ---------------- Vẽ
  render() {
    if (!this.active || !this.map) return;
    const c = this.lctx;
    const W = this.W;
    const H = this.H;
    const camX = Math.round(this.camX);
    const camY = Math.round(this.camY);
    const R = this.renderer;
    const G = this.map.ground;
    const t = this.t;
    R.drawBackground(c, camX, camY, W, H, t);
    R.drawTerrain(c, camX, camY, W, H);
    R.drawPortals(c, camX, camY, t);

    // NPC
    for (const n of this.map.npcs) {
      const nt = S.G.npcTypes[n.type];
      if (n.x < camX - 30 || n.x > camX + W + 30) continue;
      drawNinja(c, n.x - camX, G - camY, {
        dir: this.me.x < n.x ? -1 : 1, anim: 'idle', t, pal: [nt.look[0], nt.look[2], nt.look[1]], noMask: true, name: n.name, npcType: n.type,
        weaponType: null, look: { h: n.type === 'elder' ? 4 : -1 },
      });
    }
    // Vật phẩm dưới đất
    for (const it of this.items.values()) {
      const icon = it.k === 'xu' ? { k: 'xu', c: '#ffd54f' } : S.G.items[it.k].icon;
      const img = iconCanvas(icon, it.r);
      const age = t - it.born;
      const bounce = age < 0.4 ? -Math.sin((age / 0.4) * Math.PI) * 10 : Math.sin(t * 3 + it.id) > 0.9 ? -1 : 0;
      c.drawImage(img, Math.round(it.x - 6 - camX), Math.round(it.y - 12 - camY + bounce));
      if (it.r >= 2 && Math.floor(t * 4 + it.id) % 4 === 0) {
        c.fillStyle = S.G.rarity[it.r].color;
        c.fillRect(Math.round(it.x - camX), Math.round(it.y - 16 - camY), 1, 1);
      }
    }
    // Quái
    const target = this.getTarget();
    const mons = [...this.monsters.values()].sort((a, b) => a.y - b.y);
    for (const m of mons) {
      if (m.x < camX - 60 || m.x > camX + W + 60) continue;
      drawMonster(c, m.x - camX, m.y - camY, m.def, { t, dir: m.dir, st: m.st, id: m.id, flash: m.flash > t });
      const showBar = m.hp < m.mhp || (target && target.kind === 'm' && target.id === m.id);
      if (showBar && !m.def.boss) {
        const bw = Math.max(14, Math.min(30, m.def.w));
        const bx = Math.round(m.x - bw / 2 - camX);
        const by = Math.round(m.y - m.h - 5 - camY);
        c.fillStyle = '#1a1020';
        c.fillRect(bx - 1, by - 1, bw + 2, 4);
        c.fillStyle = '#e53935';
        c.fillRect(bx, by, Math.max(0, Math.round((bw * m.hp) / m.mhp)), 2);
      }
    }
    for (const d of this.dying) {
      c.globalAlpha = 1 - d.dieT / 0.5;
      drawMonster(c, d.x - camX, d.y - camY + d.dieT * 10, d.def, { t, dir: d.dir, st: 0, id: d.id, flash: true });
      c.globalAlpha = 1;
    }
    // Người chơi khác
    for (const p of this.players.values()) {
      if (p.x < camX - 40 || p.x > camX + W + 40) continue;
      const anim = p.dead ? 'dead' : p.attackUntil > t || p.st === 3 ? 'attack' : p.st === 2 ? 'jump' : p.st === 1 ? 'walk' : 'idle';
      drawNinja(c, p.x - camX, p.y - camY, {
        dir: p.dir, cls: p.info.cls, gender: p.info.g, look: p.info.look, anim, t: t + p.id, name: p.info.name,
        el: S.G.classes[p.info.cls].element, weaponType: S.G.classes[p.info.cls].weapon, flash: p.flash > t,
      });
    }
    // Bản thân
    const me = this.me;
    const meAnim = S.me.dead ? 'dead' : me.st === 3 ? 'attack' : me.st === 2 ? 'jump' : me.st === 1 ? 'walk' : 'idle';
    drawNinja(c, me.x - camX, me.y - camY, {
      dir: me.dir, cls: S.me.cls, gender: S.me.gender, look: S.me.look, anim: meAnim, t, name: S.me.name,
      el: S.G.classes[S.me.cls].element, weaponType: S.G.classes[S.me.cls].weapon, flash: me.flash > t,
    });
    // Mũi tên mục tiêu
    if (target) {
      const e = target.e;
      const top = target.kind === 'm' ? e.y - e.h - (e.def.fly ? 0 : 0) : e.y - NINJA_H - 4;
      const ay = Math.round(top - 9 - camY + Math.sin(t * 6) * 1.5);
      const ax = Math.round(e.x - camX);
      c.fillStyle = target.kind === 'p' ? '#ff5252' : '#ffeb3b';
      c.fillRect(ax - 3, ay, 7, 1);
      c.fillRect(ax - 2, ay + 1, 5, 1);
      c.fillRect(ax - 1, ay + 2, 3, 1);
      c.fillRect(ax, ay + 3, 1, 1);
    }
    this.fx.draw(c, camX, camY);
    R.drawParticles(c, camX, camY, W, H, 1 / 60);
    R.drawForeground(c, camX, camY, W, H, t);

    // Phóng to lên màn hình
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lo, 0, 0, W, H, 0, 0, W * this.zoom, H * this.zoom);
    this.renderOverlay(camX, camY);
  }

  toScreen(x, y) {
    return [Math.round((x - this.camX) * this.zoom), Math.round((y - this.camY) * this.zoom)];
  }

  label(ctx, text, x, y, color, size, stroke = '#120a18') {
    ctx.font = `${size}px VT323, monospace`;
    ctx.lineWidth = Math.max(2, size / 5);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  renderOverlay() {
    const ctx = this.ctx;
    const z = this.zoom;
    const size = Math.max(Math.round(15 * this.dpr), Math.round(z * 5));
    const camX = this.camX;
    const W = this.W;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const G = this.map.ground;
    const showNames = S.settings.names;
    // NPC
    for (const n of this.map.npcs) {
      if (n.x < camX - 40 || n.x > camX + W + 40) continue;
      const [sx, sy] = this.toScreen(n.x, G - NINJA_H - 5);
      this.label(ctx, n.name, sx, sy, '#ffe082', size);
      this.label(ctx, S.G.npcTypes[n.type].title, sx, sy - size, '#b3e5fc', Math.round(size * 0.85));
      const mark = this.npcMark(n);
      if (mark) this.label(ctx, mark, sx, sy - size * 2 + Math.sin(this.t * 5) * 3, mark === '!' ? '#ffeb3b' : '#cfd8dc', Math.round(size * 1.6));
    }
    // Quái: tên khi được chọn/boss
    const target = this.getTarget();
    for (const m of this.monsters.values()) {
      const sel = target && target.kind === 'm' && target.id === m.id;
      if (!sel && !m.def.boss) continue;
      const [sx, sy] = this.toScreen(m.x, m.y - m.h - 7);
      this.label(ctx, `${m.def.name} Lv${m.def.lv}`, sx, sy, m.def.boss ? '#ff8a80' : this.mobColor(m.def.lv), size);
    }
    // Người chơi
    const drawName = (x, y, info, isMe, pk) => {
      const [sx, sy] = this.toScreen(x, y - NINJA_H - 3);
      let col = '#ffffff';
      if (isMe) col = '#fff59d';
      else if (info.party && info.party === S.party.id) col = '#69f0ae';
      if (pk || (info.pk || 0) > 0) col = '#ff5252';
      this.label(ctx, `${info.name}`, sx, sy, col, size);
      let line = sy - size;
      if (info.clan) {
        this.label(ctx, `[${info.clan}]`, sx, line, '#ce93d8', Math.round(size * 0.85));
        line -= size * 0.85;
      }
      return line;
    };
    for (const p of this.players.values()) {
      if (p.x < camX - 40 || p.x > camX + W + 40) continue;
      let line = showNames ? drawName(p.x, p.y, p.info, false, p.pk) : this.toScreen(p.x, p.y - NINJA_H - 3)[1];
      if (p.hp < p.mhp && !p.dead) {
        const [bx, by] = this.toScreen(p.x - 8, p.y - NINJA_H - 2);
        ctx.fillStyle = '#1a1020';
        ctx.fillRect(bx - 1, by - 1, 16 * z + 2, Math.max(3, z) + 2);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(bx, by, Math.round((16 * z * p.hp) / Math.max(1, p.mhp)), Math.max(3, z));
      }
      this.bubble(ctx, p.id, p.x, line, size);
    }
    const meInfo = { name: S.me.name, clan: S.me.clan ? S.me.clan.name : null, pk: S.me.pk };
    const line = drawName(this.me.x, this.me.y, meInfo, true, S.me.pkMode);
    this.bubble(ctx, S.me.id, this.me.x, line, size);
    this.fx.drawTexts(ctx, (x, y) => this.toScreen(x, y), Math.max(1, z / 3));
  }

  bubble(ctx, id, x, lineY, size) {
    const b = this.bubbles.get(id);
    if (!b) return;
    if (b.until < this.t) {
      this.bubbles.delete(id);
      return;
    }
    const sx = this.toScreen(x, 0)[0];
    ctx.font = `${size}px VT323, monospace`;
    const text = b.msg.length > 40 ? `${b.msg.slice(0, 40)}…` : b.msg;
    const w = ctx.measureText(text).width + size;
    const h = size * 1.3;
    const y = lineY - h - 6;
    ctx.fillStyle = 'rgba(255,253,240,0.95)';
    ctx.fillRect(sx - w / 2, y, w, h);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(sx - w / 2, y + h, w, 2);
    ctx.fillRect(sx - 3, y + h, 6, 5);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3e2723';
    ctx.fillText(text, sx, y + h / 2);
    ctx.textBaseline = 'bottom';
  }

  mobColor(lv) {
    const d = lv - S.me.level;
    if (d >= 6) return '#ff5252';
    if (d >= 3) return '#ffab40';
    if (d >= -3) return '#ffffff';
    if (d >= -8) return '#81c784';
    return '#9e9e9e';
  }

  npcMark(n) {
    const me = S.me;
    if (n.type === 'elder') {
      const q = me.quest;
      if (!q || q.done) return '';
      if (q.st === 2 || (q.st === 1 && q.prog >= q.n)) return '!';
      if (q.st === 0 && me.level >= q.req) return '!';
      if (q.st === 1) return '?';
    }
    if (n.type === 'task') {
      const d = me.daily;
      const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
      if (!d || d.day !== today) return '!';
      if (d.task && d.task.prog >= d.task.n) return '!';
      if (!d.task && d.done < 20) return '!';
    }
    return '';
  }

  elementColor(cls) {
    return ELEMENT_COLORS[S.G.classes[cls].element];
  }
}
