// Vòng lặp game phía client: vật lý, đồng bộ mạng, chiến đấu, vẽ
import { S, skillVal, activeSeason, countInv } from '../core/store.js';
import { drawNinja, ELEMENT_COLORS, NINJA_H, mountOffset } from '../render/sprites.js';
import { drawMonster, monsterHeight, prewarmMonsters } from '../render/monsterart.js';
import { drawPet, PET_ART, petHeight, petFlies } from '../render/petart.js';
import { iconCanvas } from '../render/icons.js';
import { MapRenderer, setLighting } from '../render/maprender.js';
import { FX } from '../render/fx.js';
import { sfx, skillSfx, bossSfx, music, musicFor } from '../core/sound.js';
import { findRoute, nearestMap, mapsWithNpc, questDest, dailyDest, buildNav, surfaceAt, surfaceBelow, navPlan } from './pathfind.js';

const GRAV = 1000;
const JUMP = 378;
const JUMP2 = 330;
const SPEED = 110;
const PH = NINJA_H;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Cộng độ rung s vào v; vượt khỏi [lo, hi] thì rung về phía ngược lại
const shakeIn = (v, s, lo, hi) => {
  if (!s) return v;
  const a = v + s;
  return a < lo || a > hi ? clamp(v - s, lo, Math.max(lo, hi)) : a;
};

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
    // giờ ép cho lớp ngày/đêm (công cụ kiểm thử); null = giờ thực Việt Nam
    this.forceHour = null;
    // độ lệch rung màn hình của khung đang vẽ (nhãn tên trên lớp phân giải cao rung theo)
    this.shakeDX = 0;
    this.shakeDY = 0;
    this.applySettings();
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
    this.travel = null;
    this.hunt = null;
    this.meId = 0;
    this.dt = 1 / 60;
    this.nav = null;
    this.navJump = null;
    this.navCache = { key: '', t: -1, e: null };
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
    // hiệu ứng hẹn giờ (chuỗi nổ dọc chiêu dải của boss), xóa khi đổi bản đồ
    this.timers = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    this.bind();
  }

  // Áp dụng cài đặt hiển thị (ngày/đêm, rung màn hình) từ S.settings
  applySettings() {
    const st = S.settings;
    setLighting(st.daynight);
    this.fx.shakeScale = st.shake === false ? 0 : 1;
    if (!this.fx.shakeScale) this.fx.shake = 0;
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
        this.checkCostume(p, m.look);
      }
    });
    n.on('mSpawn', (m) => this.addMonster(m));
    n.on('mDie', (m) => {
      const mo = this.monsters.get(m.id);
      if (mo) {
        this.dying.push({ ...mo, dieT: 0 });
        this.fx.sparks(mo.x, mo.y - mo.def.h / 2, mo.def.pal[0], 14, 70);
        if (mo.def.boss) this.fx.shakeAt(mo.x, mo.y, 6);
      }
      this.monsters.delete(m.id);
      if (this.target && this.target.kind === 'm' && this.target.id === m.id) this.target = null;
      this.ui.updateTarget(null);
    });
    // quái biến mất không qua cái chết (quái con khi boss ngã, Tà Thú hết giờ)
    n.on('mGone', (m) => {
      const mo = this.monsters.get(m.id);
      if (mo) {
        this.fx.sparks(mo.x, mo.y - mo.def.h / 2, '#b39ddb', 10, 50);
        for (let i = 0; i < 6; i++) this.fx.smoke(mo.x + (i - 2.5) * 4, mo.y - 2, i % 2 ? '#5e4a6e' : '#8a7a9a', 3, 7, 0.9, 0.5);
      }
      this.monsters.delete(m.id);
      if (this.target && this.target.kind === 'm' && this.target.id === m.id) this.target = null;
    });
    n.on('bossCast', (m) => this.onBossCast(m));
    n.on('bossHit', (m) => this.onBossHit(m));
    n.on('mRage', (m) => {
      const mo = this.monsters.get(m.id);
      if (!mo) return;
      mo.rage = !!m.on;
      if (mo.rage) {
        this.fx.bossSkill(mo.x, mo.y, 'roar', '#ff1744', Math.max(1, mo.def.scale || 1) * 0.6);
        this.fx.text(mo.x, mo.y - mo.h - 18, 'CUỒNG NỘ!', '#ff5252', true);
      }
    });
    n.on('event', (m) => {
      // thời gian còn lại tính theo đồng hồ máy khách để không lệch giờ với server
      S.event = m.on ? { ...m, until: performance.now() + (m.left || 0) } : null;
      if (this.ui.setEvent) this.ui.setEvent(S.event);
    });
    n.on('eventResult', (m) => {
      if (this.ui.showEventResult) this.ui.showEventResult(m);
    });
    n.on('gAdd', (m) => this.items.set(m.id, { ...m, born: this.t }));
    n.on('gDel', (m) => this.items.delete(m.id));
    n.on('hit', (m) => this.onHit(m));
    n.on('fx', (m) => this.onFx(m));
    n.on('heal', (m) => {
      for (const [tid, amt] of m.list) {
        const e = this.entity(tid);
        // hút máu (ngọc Huyết Hồn) hiện màu đỏ máu nhạt, khác số sát thương đỏ tươi
        if (e && amt) this.fx.text(e.x, e.y - this.headH(e) - 2, `+${amt}`, m.ls ? '#ff8aa0' : '#69f0ae');
      }
      // uống bình từ cửa sổ hành trang cũng bắt đầu hồi chiêu trên nút bình (khớp mốc server)
      if (m.pot && S.me && m.pot === S.me.id && (m.pk === 'hp' || m.pk === 'mp')) this.lastPotion[m.pk] = performance.now();
    });
    n.on('levelUp', (m) => {
      const getter = () => this.entity(`p${m.id}`);
      this.fx.levelUp(getter);
      if (S.me && m.id === S.me.id) sfx('level');
      const e = getter();
      if (e) this.fx.text(e.x, e.y - this.headH(e) - 16, 'LÊN CẤP!', '#ffd54f', true);
    });
    // Thợ Rèn: cường hóa (cột sáng / dấu X) và khảm, ghép ngọc (lấp lánh màu ngọc) hiện trên người chơi
    n.on('smithFx', (m) => {
      const e = this.entity(`p${m.id}`);
      if (!e) return;
      const y = e.y - this.lift(e);
      if (m.k === 'gem') this.fx.gemSocket(e.x, y - 14, m.c);
      else this.fx.enhance(e.x, y, !!m.ok, m.plus);
    });
    n.on('petAct', (m) => this.onPetAct(m));
    n.on('expGain', (m) => {
      if (m.n > 0) this.fx.text(m.x, m.y - 6, `+${m.n} EXP`, '#b3e5fc');
    });
    n.on('loot', (m) => {
      if (!this.me) return;
      sfx(m.k === 'xu' ? 'coin' : 'pickup');
      // nhặt liên tiếp thì xếp chữ lệch lên trên, không đè nhau và không đè tên nhân vật
      const ls = this.lootStack && this.t - this.lootStack.t < 0.45 ? this.lootStack.n + 1 : 0;
      this.lootStack = { t: this.t, n: ls % 4 };
      const ly = this.me.y - this.headH(this.me) - 14 - (ls % 4) * 7;
      if (m.k === 'xu') this.fx.text(this.me.x, ly, `+${m.q} xu`, '#ffd54f');
      else {
        const def = S.G.items[m.k];
        this.fx.text(this.me.x, ly, `${def.name}${m.q > 1 ? ` x${m.q}` : ''}`, S.G.rarity[m.r || 0].color);
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
      this.cancelTravel();
      this.planRevive();
    });
    n.on('chat', (m) => {
      if (m.ch === 'map' && m.id) this.bubbles.set(m.id, { msg: m.msg, until: this.t + 5 });
    });
    n.on('duel', (m) => {
      this.duelWith = m.with || 0;
    });
    // lôi đài: trạng thái hàng chờ / trận (idle, queue, prep, fight, end) và kết quả trận
    n.on('arena', (m) => this.onArena(m));
    n.on('arenaResult', (m) => {
      if (m.res === 'win') sfx('victory');
      else if (m.res === 'lose') sfx('defeat');
      if (this.ui.showArenaResult) this.ui.showArenaResult(m);
    });
  }

  onArena(m) {
    const st = ['queue', 'prep', 'fight', 'end'].includes(m.st) ? m.st : 'idle';
    const prev = S.arena;
    if (st === 'fight' && (!prev || prev.st !== 'fight')) sfx('arena_start');
    S.arena = st === 'idle' ? null : { ...m, st, opp: m.opp || (prev && prev.opp) || null, at: performance.now() };
    if (st === 'prep') {
      // server làm mới hồi chiêu khi vào trận
      this.cool = {};
      this.chase = null;
      this.walkTo = null;
      this.cancelTravel();
    }
    if (st === 'fight' && m.opp && this.players.has(m.opp.id)) this.setTarget({ kind: 'p', id: m.opp.id });
    if (st === 'end' || st === 'idle') this.chase = null;
    if (this.ui.setArena) this.ui.setArena(S.arena);
  }

  // Đối thủ lôi đài đang đấu (chỉ người này được tự động nhắm / đuổi theo trong trận)
  isArenaOpp(p) {
    const a = S.arena;
    return !!(a && a.st === 'fight' && a.opp && p && p.id === a.opp.id && this.map && this.map.arena);
  }

  // Được tự đuổi theo người chơi: chỉ đối thủ lôi đài hoặc đối thủ thách đấu
  canChase(p) {
    return this.isArenaOpp(p) || (!!this.duelWith && !!p && p.id === this.duelWith);
  }

  // Nhạc nền theo tình huống: lôi đài > Tà Thú cùng bản đồ > boss trong tầm nhìn > phó bản > lễ hội ở làng > theme bản đồ
  updateMusic() {
    const map = this.map;
    if (!map || !this.me) return;
    let scene = null;
    if (map.arena || (S.arena && (S.arena.st === 'prep' || S.arena.st === 'fight'))) scene = 'arena';
    else if (S.event && S.event.on && S.event.map === S.mapId) scene = 'tathu';
    else if ([...this.monsters.values()].some((mo) => mo.def.boss && Math.abs(mo.x - this.me.x) < this.W * 0.75)) scene = 'boss';
    else if (map.instance) scene = 'dungeon';
    else if (/^village_/.test(map.theme) && activeSeason()) scene = 'festival';
    music(musicFor(map, scene));
  }

  enterMap(m) {
    // nhân vật khác (đổi tài khoản/nhân vật) không được thừa hưởng lộ trình của nhân vật cũ
    if (m.me.id !== this.meId) this.leaveSession();
    this.meId = m.me.id;
    this.map = S.G.maps[m.map];
    this.renderer = new MapRenderer(this.map);
    S.me = m.me;
    this.players.clear();
    this.monsters.clear();
    this.items.clear();
    this.dying = [];
    this.timers = [];
    this.bubbles.clear();
    // đặt this.me trước khi thêm quái: boss đang niệm dở gọi onBossCast cần vị trí mình
    this.me = { x: m.x, y: m.y, vx: 0, vy: 0, dir: this.me ? this.me.dir : 1, onGround: true, jumps: 0, st: 0, attackT: 0, dropT: 0 };
    for (const p of m.players) if (p.id !== m.me.id) this.addPlayer(p);
    for (const mo of m.monsters) this.addMonster(mo);
    for (const it of m.items) this.items.set(it.id, { ...it, born: -10 });
    this.target = null;
    this.chase = null;
    this.walkTo = null;
    this.duelWith = 0;
    this.camX = clamp(this.me.x - this.W / 2, 0, Math.max(0, this.map.w - this.W));
    this.camY = this.camTargetY();
    this.active = true;
    this.lastPortal = performance.now();
    S.mapId = m.map;
    this.nav = buildNav(this.map, { JUMP, JUMP2, GRAV });
    this.navJump = null;
    this.navCache.key = '';
    if (this.hunt && this.hunt.map !== m.map) this.hunt = null;
    if (this.autoBack && !m.me.dead && m.map !== this.autoBack.map) this.backAt = this.t + 1;
    this.ui.onEnterMap(this.map);
    this.updateMusic();
    this.prewarm();
    this.resumeTravel();
  }

  // Dựng sẵn khung hình quái/boss của bản đồ để lần đầu chúng xuất hiện không bị giật
  prewarm() {
    const defs = [];
    const seen = new Set();
    const add = (k) => {
      const d = S.G.monsters[k];
      if (d && !seen.has(k)) { seen.add(k); defs.push(d); }
    };
    for (const k of this.map.mobs || []) add(k);
    for (const b of this.map.bosses || []) add(b.m);
    for (const m of this.monsters.values()) add(m.k);
    prewarmMonsters(defs);
  }

  // Rời màn hình game (đăng xuất, đổi nhân vật, mất phiên): bỏ mọi việc tự động đang làm dở
  leaveSession() {
    this.travel = null;
    this.hunt = null;
    this.navJump = null;
    this.walkTo = null;
    this.chase = null;
    this.meId = 0;
    this.notifyTravel();
    // trạng thái lôi đài thuộc phiên cũ (tự kết nối lại sau khi mất mạng): server gửi lại trạng thái thật khi vào game
    if (S.arena) {
      S.arena = null;
      if (this.ui.setArena) this.ui.setArena(null);
    }
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
    this.monsters.set(m.id, { id: m.id, k: m.k, def, x: m.x, y: m.y, tx: m.x, ty: m.y, dir: m.dir, st: 0, hp: m.hp, mhp: m.mhp, flash: 0, h: monsterHeight(def), rage: !!m.rage, cast: null });
    // boss đang niệm dở lúc mình vào bản đồ: vẫn hiện vùng cảnh báo phần thời gian còn lại
    if (m.cast && m.cast.dur > 150) this.onBossCast(m.cast);
  }

  // ---------------- Chiêu boss
  later(sec, fn) {
    this.timers.push({ at: this.t + sec, fn });
  }

  // Bắt đầu niệm: vẽ vùng cảnh báo đúng hình vùng server sẽ tính sát thương
  onBossCast(m) {
    const mo = this.monsters.get(m.id);
    const dur = Math.max(0.2, (+m.dur || 0) / 1000);
    const col = m.k === 'summon' ? '#c77dff' : '#ff5252';
    if (m.shape === 'line') this.fx.telegraph(m.x, m.y, (m.dir < 0 ? -1 : 1) * m.r, dur, col, 'line', +m.w || 16);
    else if (m.shape === 'pillar') for (const [px, py] of m.pts || [[m.x, m.y]]) this.fx.telegraph(px, py, m.r, dur, col, 'pillar');
    else this.fx.telegraph(m.x, m.y, m.r, dur, col, 'circle');
    if (!mo) return;
    mo.cast = { name: m.name || '', t0: this.t, dur };
    if (m.dir) mo.dir = m.dir;
    this.fx.text(mo.x, mo.y - mo.h - 18, m.name || '', '#ff8a80', true);
    if (this.me && Math.abs(mo.x - this.me.x) < this.W) bossSfx(m.k);
  }

  // Tung chiêu: hiệu ứng tại vùng đã chốt (rung màn hình do fx.bossSkill tự gọi shakeAt theo khoảng cách)
  onBossHit(m) {
    const mo = this.monsters.get(m.id);
    if (mo) mo.cast = null;
    const el = mo && mo.def.el ? ELEMENT_COLORS[mo.def.el] : undefined;
    const col = m.k === 'beam' || m.k === 'nova' ? el : undefined;
    if (m.shape === 'line') {
      // chuỗi nổ chạy dọc dải theo hướng đánh
      const n = Math.max(2, Math.round(m.r / 50));
      const dir = m.dir < 0 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const x = m.x + dir * ((i + 0.7) * m.r) / n;
        this.later(i * 0.055, () => this.fx.bossSkill(x, m.y, m.k, col, m.k === 'beam' ? 0.8 : 0.55));
      }
    } else if (m.shape === 'pillar') {
      for (const [px, py] of m.pts || [[m.x, m.y]]) this.fx.bossSkill(px, py, m.k, col, (m.r * 2) / 26);
    } else if (m.k === 'summon') {
      const pts = m.pts && m.pts.length ? m.pts : [[m.x, m.y]];
      for (const [px, py] of pts) this.fx.bossSkill(px, py, 'summon', col, 0.9);
    } else {
      this.fx.bossSkill(m.x, m.y, m.k, col, m.r / (m.k === 'quake' ? 90 : m.k === 'roar' ? 95 : 100));
    }
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
    return e.y - this.lift(e) - Math.round(NINJA_H / 2);
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
      // chữ trên người chơi bắt đầu phía trên nhãn tên để không đè tên
      const ty = tid[0] === 'p' ? e.y - this.headH(e) - 12 : cy - 14;
      if (miss) {
        this.fx.text(e.x, ty, 'Né', '#b0bec5');
        continue;
      }
      if (m.a === meTid) sfx(crit ? 'crit' : 'hit');
      else if (tid === meTid) sfx('hurt');
      e.flash = this.t + 0.12;
      let col = '#ffffff';
      if (tid === meTid) col = '#ff5252';
      else if (m.a === meTid) col = crit ? '#ffeb3b' : '#ffffff';
      else col = '#ffcc80';
      this.fx.text(e.x, ty, crit ? `${dmg}!` : `${dmg}`, col, crit);
      if (tid[0] === 'm') e.hp = Math.max(0, e.hp - dmg);
      // boss đánh trúng mình: rung nhẹ, mạnh hơn khi chí mạng
      if (tid === meTid && att && att.def && att.def.boss) this.fx.addShake(crit ? 3 : 1.5);
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
    if (S.me && m.a === S.me.id) skillSfx(m.sid, f.k);
    const te = m.tid ? this.entity(m.tid) : null;
    const tx = te ? te.x : m.tx;
    const ty = te ? this.centerY(m.tid, te) : m.ty - 11;
    const tFeet = te ? te.y : m.ty;
    // chém/phóng phát ra từ thân người cưỡi (nâng theo thú cưỡi); vòng mặt đất (burst/wave/whirl/aura/heal) giữ ở chân thú
    const seat = a.y - this.lift(a);
    const ay = seat - 12;
    switch (f.k) {
      case 'slash': this.fx.slash(a.x, seat, dir, f.c, f.big); break;
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
    if (!me || !p || p.dead) return false;
    if (this.map.arena) return this.isArenaOpp(p);
    if (this.map.town) return false;
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
    if (forAuto && this.hunt) {
      const h = this.huntTarget();
      if (h) return h;
    }
    let best = null;
    let bd = 1e9;
    const now = this.t;
    for (const m of this.monsters.values()) {
      if (forAuto) {
        const bl = this.autoBlack.get(m.id);
        if (bl && bl > now) continue;
        if (m.def.lv > S.me.level + 8 && !m.def.boss) continue;
        if (m.def.boss && !S.settings.autoBoss) continue;
        if (S.settings.autoLock && this.autoMob && m.k !== this.autoMob) continue;
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
    for (const p of this.players.values()) {
      if (!this.canPvp(p)) continue;
      // tự động (auto đánh, chiêu tự chọn mục tiêu) không nhắm người chơi khác, trừ đối thủ lôi đài
      if ((forAuto || quiet) && !this.isArenaOpp(p)) continue;
      const dx = Math.abs(p.x - me.x);
      if (dx > range || Math.abs(p.y - me.y) > 140) continue;
      const d = dx + Math.abs(p.y - me.y) * 1.5 - 10;
      if (d < bd) {
        bd = d;
        best = { kind: 'p', id: p.id, e: p };
      }
    }
    return best;
  }

  // Nhiệm vụ đã đủ hoặc đổi mục tiêu thì thôi săn, auto quay về tầm đánh thường
  checkHunt() {
    const h = this.hunt;
    if (!h || this.t - h.chk < 1) return;
    h.chk = this.t;
    const from = this.map.id;
    const d = h.src === 'daily' ? dailyDest(S, S.me.daily, from) : h.src === 'quest' ? questDest(S, S.me.quest, from) : null;
    if (!d || d.mob !== h.mob) this.hunt = null;
  }

  // Quái đang săn theo nhiệm vụ: tìm khắp bản đồ để không đứng yên khi quái ở xa
  huntTarget() {
    const me = this.me;
    const now = this.t;
    let best = null;
    let bd = 1e9;
    for (const m of this.monsters.values()) {
      if (m.k !== this.hunt.mob) continue;
      const bl = this.autoBlack.get(m.id);
      if (bl && bl > now) continue;
      const d = Math.abs(m.x - me.x) + Math.abs(m.y - me.y) * 1.5;
      if (d < bd) {
        bd = d;
        best = { kind: 'm', id: m.id, e: m };
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
    if (!sk || !lv || sk.type === 'passive') return false;
    const now = performance.now();
    if ((this.cool[sid] || 0) > now) return false;
    if (now - this.lastCast < 200) return false;
    // lôi đài: chỉ ra chiêu sau hiệu lệnh bắt đầu
    if (this.map && this.map.arena && !(S.arena && S.arena.st === 'fight')) {
      if (!auto) this.ui.toast(S.arena && S.arena.st === 'prep' ? 'Chờ hiệu lệnh bắt đầu!' : 'Trận đấu đã kết thúc.');
      return false;
    }
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
        // không tự tìm đường tới người chơi khác (ngoài trận lôi đài / thách đấu)
        if (t.kind === 'p' && !this.canChase(t.e)) {
          if (!auto) this.ui.toast('Mục tiêu ở quá xa');
          return false;
        }
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
    if (this.map && this.map.arena) {
      if (!auto) this.ui.toast('Lôi đài không cho dùng bình thuốc');
      return;
    }
    // server bỏ qua bình khi đã gục: không bắt đầu vòng hồi chiêu giả trên nút
    if (!S.me || S.me.dead) return;
    const now = performance.now();
    const cd = (S.G.potCd && S.G.potCd[kind]) || 600;
    if (now - this.lastPotion[kind] < cd) return;
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
    // Cộng độ lệch rung của khung vừa vẽ để chạm đúng chỗ hình đang hiện
    const wx = (e.clientX * this.dpr) / this.zoom + this.camX + this.shakeDX;
    const wy = (e.clientY * this.dpr) / this.zoom + this.camY + this.shakeDY;
    // NPC
    const G = this.map.ground;
    for (const n of this.map.npcs) {
      if (Math.abs(wx - n.x) < 10 && wy > G - 30 && wy < G + 4) {
        this.cancelTravel();
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
      if (Math.abs(wx - p.x) < (this.lift(p) ? 14 : 9) && wy > p.y - this.headH(p) - 4 && wy < p.y + 3) {
        this.target = { kind: 'p', id: p.id };
        this.ui.playerMenu(p.info, e.clientX, e.clientY);
        return;
      }
    }
    // Vật phẩm
    for (const it of this.items.values()) {
      if (Math.abs(wx - it.x) < 10 && Math.abs(wy - (it.y - 6)) < 12) {
        this.cancelTravel();
        if (Math.abs(it.x - this.me.x) < 70 && Math.abs(it.y - this.me.y) < 50) this.net.send('pickup', { id: it.id });
        else this.walkTo = { x: it.x, y: it.y, item: it.id, since: this.t };
        return;
      }
    }
    // Cửa
    for (let i = 0; i < this.map.portals.length; i++) {
      const p = this.map.portals[i];
      if (p.door && Math.abs(wx - p.x) < 20 && wy > G - 50 && wy < G + 4) {
        this.cancelTravel();
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
          this.cancelTravel();
          const d = this.nearDoor();
          if (d >= 0 && this.me.onGround) this.usePortal(d);
          else this.jump();
          break;
        }
        case 'attack': this.useSkill(this.basicSkill()); break;
        case 's1': case 's2': case 's3': case 's4': case 's5': case 's6':
          this.useSkill(S.me.hotbar[+a[1] - 1]);
          break;
        case 'hp': this.usePotion('hp'); break;
        case 'mp': this.usePotion('mp'); break;
        case 'pick': this.net.send('pickup', {}); break;
        case 'talk': this.interact(); break;
        case 'target': this.cycleTarget(); break;
        case 'auto': this.toggleAuto(); break;
        case 'chat': this.ui.focusChat(); break;
        case 'esc':
          this.cancelTravel();
          this.ui.closeAll();
          break;
        case 'travel': this.travelQuest(); break;
        case 'left': case 'right': this.cancelTravel(); break;
        default:
      }
    }
  }

  toggleAuto(v) {
    this.auto = v === undefined ? !this.auto : v;
    this.autoBlack.clear();
    this.autoMob = null;
    this.ui.setAuto(this.auto);
    if (!this.auto) {
      this.chase = null;
      this.walkTo = null;
      this.hunt = null;
      this.reviveAt = 0;
      this.autoBack = null;
      this.backAt = 0;
    }
  }

  // Tự hồi sinh (Cài đặt → Tự động nâng cao): chỉ khi đang auto, không ở lôi đài; nhớ chỗ cũ để quay lại sau khi về làng
  planRevive() {
    const set = S.settings;
    this.reviveAt = 0;
    this.autoBack = null;
    if (!this.auto || set.autoRevive === 'off' || !this.map || this.map.arena) return;
    this.reviveAt = this.t + set.autoReviveDelay;
    if (set.autoBack && !this.map.instance && !this.map.town) {
      const h = this.hunt;
      this.autoBack = { map: this.map.id, x: Math.round(this.me.x), mob: h ? h.mob : null, src: h ? h.src : null };
    }
    this.ui.toast(`Tự hồi sinh sau ${set.autoReviveDelay} giây`, 'info');
  }

  autoRevive() {
    this.reviveAt = 0;
    const mode = S.settings.autoRevive;
    const cards = countInv('revive_card');
    const here = (mode === 'card' && cards > 0) || (mode === 'luong' && (cards > 0 || S.me.luong >= 1));
    if (here) this.autoBack = null;
    this.net.send('revive', { mode: here ? 'here' : 'town' });
  }

  // Tự ăn đồ ăn tăng sức khi hiệu ứng đã hết: mỗi lần một món, 3 giây kiểm một lần
  autoEat() {
    this.foodT = this.t + 3;
    const has = new Set(S.me.buffs.map((b) => b.k));
    const i = S.inv.findIndex((it) => {
      const d = it && S.G.items[it.id];
      return !!d && d.type === 'food' && d.lv <= S.me.level && !has.has(d.effect.buff);
    });
    if (i >= 0) this.net.send('useItem', { slot: i });
  }

  // Về làng xong: tìm đường lại chỗ cũ, tới nơi thì bật auto (và săn tiếp quái nhiệm vụ nếu đang săn)
  autoReturn() {
    const b = this.autoBack;
    this.backAt = 0;
    this.autoBack = null;
    if (!b || !this.auto || S.me.dead || this.map.id === b.map) return;
    const dest = { map: b.map, x: b.x, auto: true, label: `Quay lại ${S.G.maps[b.map].name}` };
    if (b.mob) Object.assign(dest, { mob: b.mob, src: b.src });
    if (this.travelTo(dest)) this.ui.toast(dest.label, 'info');
  }

  // ---------------- Tìm đường tự động giữa các bản đồ
  routeTo(mapId) {
    if (!this.map || !S.G) return null;
    return findRoute(S.G.maps, this.map.id, mapId, this.me ? Math.round(this.me.x) : undefined);
  }

  // Bản đồ đích của dest: map ghi sẵn, hoặc bản đồ chứa NPC cụ thể, hoặc làng gần nhất có NPC loại đó
  resolveDest(dest) {
    const maps = S.G.maps;
    if (dest.map && maps[dest.map]) return dest.map;
    if (dest.npc) {
      for (const id in maps) if (!maps[id].instance && (maps[id].npcs || []).some((n) => n.id === dest.npc)) return id;
    }
    if (dest.npcType) {
      const near = nearestMap(maps, this.map.id, mapsWithNpc(maps, dest.npcType), Math.round(this.me.x));
      if (near) return near.id;
    }
    return null;
  }

  travelTo(dest) {
    if (!dest || !this.map || !this.me || !S.me || !S.G) return false;
    if (S.me.dead) {
      this.ui.toast('Đang trọng thương, không thể di chuyển', 'warn');
      return false;
    }
    const mapId = this.resolveDest(dest);
    if (!mapId) {
      this.ui.toast('Không tìm thấy nơi cần đến', 'warn');
      return false;
    }
    const name = S.G.maps[mapId].name;
    // server từ chối vào khu PK dưới cấp 10: báo ngay thay vì đi tới cửa rồi bị chặn
    if (S.G.maps[mapId].pvp && S.me.level < 10) {
      this.ui.toast(`Cần đạt cấp 10 để vào ${name}`, 'warn');
      return false;
    }
    const route = this.routeTo(mapId);
    if (!route) {
      this.ui.toast(`Không tìm được đường tới ${name}`, 'warn');
      return false;
    }
    this.walkTo = null;
    this.chase = null;
    this.hunt = null;
    this.travel = { dest, map: mapId, route, label: dest.label || name, since: this.t, best: 1e9, bestT: this.t, jumpT: 0, retries: 0, tries: 0 };
    this.notifyTravel();
    return true;
  }

  cancelTravel(msg) {
    if (!this.travel) return;
    this.travel = null;
    this.navJump = null;
    this.notifyTravel();
    if (msg) this.ui.toast(msg, 'warn');
  }

  travelQuest() {
    if (!S.me) return false;
    const dest = questDest(S, S.me.quest, this.map ? this.map.id : undefined);
    if (!dest) {
      this.ui.toast('Không có mục tiêu nhiệm vụ để tìm đường', 'info');
      return false;
    }
    dest.src = 'quest';
    return this.travelTo(dest);
  }

  travelDaily() {
    if (!S.me) return false;
    const dest = dailyDest(S, S.me.daily, this.map ? this.map.id : undefined);
    if (!dest) {
      this.ui.toast('Đã xong nhiệm vụ hằng ngày hôm nay', 'info');
      return false;
    }
    dest.src = 'daily';
    return this.travelTo(dest);
  }

  notifyTravel() {
    if (!this.ui.setTravel) return;
    const tr = this.travel;
    this.ui.setTravel(tr ? { label: tr.label, mapName: S.G.maps[tr.map].name, left: tr.route.length } : null);
  }

  resetTravelProgress() {
    const tr = this.travel;
    tr.best = 1e9;
    tr.bestT = this.t;
    tr.tries = 0;
  }

  // Vào bản đồ mới: tính lại lộ trình từ chỗ đang đứng (phòng khi bị đưa lệch khỏi lộ trình)
  resumeTravel() {
    const tr = this.travel;
    if (!tr) return;
    const route = this.routeTo(tr.map);
    if (!route) {
      this.cancelTravel('Không tìm được đường, đã hủy tìm đường');
      return;
    }
    tr.route = route;
    this.resetTravelProgress();
    this.notifyTravel();
  }

  finishTravel(arrived) {
    const tr = this.travel;
    this.travel = null;
    this.navJump = null;
    this.notifyTravel();
    if (arrived) this.ui.toast(`Đã tới nơi: ${tr.label}`, 'quest');
  }

  updateTravel() {
    const tr = this.travel;
    const me = this.me;
    const G = this.map.ground;
    const set = S.settings;
    // vẫn tự uống thuốc khi đi qua vùng quái chủ động tấn công
    if (S.me.hp < (S.me.s.maxHp * set.autoHp) / 100) this.usePotion('hp', true);
    let goal;
    let stop = 4;
    if (tr.route.length) {
      const st = tr.route[0];
      if (st.map !== this.map.id) {
        this.resumeTravel();
        return 0;
      }
      const p = this.map.portals[st.portal];
      goal = p.x;
      if (p.door) {
        if (Math.abs(p.x - me.x) < 16 && me.onGround && me.y >= G - 1) {
          if (performance.now() - this.lastPortal > 900) {
            tr.tries++;
            if (tr.tries > 4) {
              this.cancelTravel(`Không vào được ${S.G.maps[st.to].name}`);
              return 0;
            }
            this.usePortal(st.portal);
          }
          return 0;
        }
      } else {
        // cổng mép: cứ đi vào, game.update tự kích hoạt khi chạm
        stop = 0;
      }
    } else {
      const d = tr.dest;
      if (d.npc || d.npcType) {
        const n = this.map.npcs.find((o) => (d.npc ? o.id === d.npc : o.type === d.npcType));
        if (!n) {
          this.finishTravel(true);
          return 0;
        }
        goal = n.x;
        if (Math.abs(n.x - me.x) < 36 && me.onGround) {
          this.net.send('npc', { id: n.id });
          this.finishTravel(false);
          return 0;
        }
      } else if (d.x != null && Math.abs(d.x - me.x) > 12) {
        goal = d.x;
      } else {
        this.finishTravel(true);
        if (d.mob) {
          this.hunt = { mob: d.mob, map: this.map.id, x: d.x, src: d.src, chk: this.t };
          this.target = null;
        }
        if ((d.mob || d.auto) && !this.auto) this.toggleAuto(true);
        return 0;
      }
    }
    // kẹt: không lại gần được thì nhảy thử, quá lâu thì tính lại đường rồi hủy
    const dist = Math.abs(goal - me.x);
    if (dist < tr.best - 3) {
      tr.best = dist;
      tr.bestT = this.t;
    } else if (this.t - tr.bestT > 2.5 && me.onGround && this.t - tr.jumpT > 1.2) {
      tr.jumpT = this.t;
      this.wantJump = true;
    }
    if (this.t - tr.bestT > 9) {
      tr.retries++;
      if (tr.retries > 2) {
        this.cancelTravel('Bị kẹt, đã hủy tìm đường');
        return 0;
      }
      this.resumeTravel();
      return 0;
    }
    return this.navTo(goal, G, stop);
  }

  // ---------------- Cập nhật
  update(dt) {
    this.t += dt;
    this.dt = dt;
    if (!this.active || !this.me || !S.me) return;
    if (this.t >= (this.musicT || 0)) {
      this.musicT = this.t + 1;
      this.updateMusic();
    }
    this.handleInput();
    const me = this.me;
    const dead = S.me.dead;
    if (dead && this.reviveAt && this.t >= this.reviveAt) this.autoRevive();
    if (!dead && this.backAt && this.t >= this.backAt) this.autoReturn();
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
      this.cancelTravel();
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
    const wasGround = me.onGround;
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
    if (me.onGround) {
      me.jumps = 0;
      this.navJump = null;
    }
    me.dropT -= dt;
    me.attackT -= dt;
    me.st = me.attackT > 0 ? 3 : !me.onGround ? 2 : move ? 1 : 0;

    // Cổng ở mép bản đồ
    if (!dead && performance.now() - this.lastPortal > 1200) {
      this.map.portals.forEach((p, i) => {
        if (!p.door && Math.abs(me.x - p.x) < 12) this.usePortal(i);
      });
    }
    // khung chạm đất luôn gửi ngay: server tính thời gian ở trên không từ lần đứng cuối
    if (!dead) this.sendMove(me.onGround && !wasGround);

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
    if (this.timers.length) {
      const due = this.timers.filter((tm) => tm.at <= this.t);
      if (due.length) {
        this.timers = this.timers.filter((tm) => tm.at > this.t);
        for (const tm of due) tm.fn();
      }
    }
    this.updateFashionFx(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.ui.updateTarget(this.getTarget());
  }

  // Di chuyển tự động: đuổi theo mục tiêu, đi tới NPC, auto đánh
  updateIntent() {
    const me = this.me;
    const manualRecently = performance.now() - this.input.lastManual < 1500;
    if (this.travel && !this.walkTo) return this.updateTravel();
    if (this.walkTo) {
      const w = this.walkTo;
      const dx = w.x - me.x;
      if ((w.since != null && this.t - w.since > 10) || (w.item != null && !this.items.has(w.item))) {
        const it = w.item != null ? this.items.get(w.item) : null;
        if (it) it.tryUntil = this.t + 6;
        this.walkTo = null;
        return 0;
      }
      // vật phẩm trên bục khác tầng: tìm đường nhảy lên/xuống trước
      if (w.y != null && Math.abs(w.y - me.y) > 30) return this.navTo(w.x, w.y, 4);
      if (Math.abs(dx) < 14) {
        if (this.walkTo.npc) this.net.send('npc', { id: this.walkTo.npc });
        if (this.walkTo.door != null) this.usePortal(this.walkTo.door);
        else if (!this.walkTo.npc && !this.walkTo.wait) {
          const it = this.walkTo.item != null ? this.items.get(this.walkTo.item) : null;
          // nhặt không được (của người khác, túi đầy) thì tạm bỏ qua để auto không kẹt gửi nhặt liên tục
          if (it) it.tryUntil = this.t + 3;
          this.net.send('pickup', it ? { id: it.id } : {});
        }
        this.walkTo = null;
        return 0;
      }
      return Math.sign(dx);
    }
    if (this.auto && !manualRecently) this.updateAuto();
    if (this.chase) {
      const t = this.chase.kind === 'm' ? this.monsters.get(this.chase.id) : this.players.get(this.chase.id);
      // người chơi chỉ được đuổi khi còn là đối thủ lôi đài / thách đấu
      if (t && this.chase.kind === 'p' && !this.canChase(t)) {
        this.chase = null;
        return 0;
      }
      if (!t || t.dead || this.t - this.chase.since > 8) {
        if (t && this.auto && this.chase.kind === 'm') this.autoBlack.set(t.id, this.t + 15);
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
    const stop = Math.max(6, range * 0.6);
    // lệch tầng quá tầm đánh dọc thì đi theo đồ thị bục
    if (Math.abs(t.y - me.y) > (range > 90 ? 100 : 36)) return this.navTo(t.x, t.y, stop);
    if (Math.abs(dx) <= stop) return 0;
    return Math.sign(dx);
  }

  // Đi tới điểm (tx, ty) qua các bục: chọn điểm cất cánh theo đồ thị nhảy rồi nhảy/thả xuống
  navTo(tx, ty, stop = 6) {
    const me = this.me;
    const dx = tx - me.x;
    const flat = () => (Math.abs(dx) <= stop ? 0 : Math.sign(dx));
    if (!this.nav) return flat();
    if (!me.onGround) {
      const j = this.navJump;
      if (!j) return flat();
      if (j.kind === 2 && me.jumps === 1 && me.vy > -60) this.wantJump = true;
      // giữ hướng về phía bục đích để không trượt khỏi mép
      const s = this.nav.surf[j.to];
      const lo = s.x1 + 6;
      const hi = s.x2 - 6;
      if (me.x < lo) return 1;
      if (me.x > hi) return -1;
      return 0;
    }
    const a = surfaceAt(this.nav, me.x, me.y);
    const b = surfaceBelow(this.nav, tx, ty);
    if (a < 0 || a === b) return flat();
    const key = `${a}>${b}`;
    let e = this.navCache.e;
    if (this.navCache.key !== key || this.t - this.navCache.t > 0.4) {
      e = navPlan(this.nav, a, me.x, b);
      this.navCache.key = key;
      this.navCache.t = this.t;
      this.navCache.e = e;
    }
    if (!e) return flat();
    const kx = me.x < e.x1 ? e.x1 : me.x > e.x2 ? e.x2 : me.x;
    const gap = Math.abs(kx - me.x);
    if (gap > 1.5) {
      // cạnh hẹp hơn một bước (FPS thấp, chạy nhanh): đặt thẳng vào điểm cất cánh để khỏi bước qua lại mãi
      const step = SPEED * (1 + (S.me.s.spd || 0) / 100) * this.dt;
      if (gap > step) return Math.sign(kx - me.x);
      me.x = kx;
    }
    if (e.kind === 0) {
      me.dropT = 0.22;
      me.y += 1;
      me.onGround = false;
    } else {
      this.wantJump = true;
      this.navJump = { kind: e.kind, to: e.to };
    }
    this.navCache.key = '';
    return 0;
  }

  updateAuto() {
    const me = S.me;
    const set = S.settings;
    if (!this.map.arena) {
      if (me.hp < (me.s.maxHp * set.autoHp) / 100) this.usePotion('hp', true);
      if (me.mp < (me.s.maxMp * set.autoMp) / 100) this.usePotion('mp', true);
    }
    this.checkHunt();
    if (set.autoFood && !this.map.arena && this.t >= (this.foodT || 0)) this.autoEat();
    if (this.chase) return;
    // nhặt đồ của mình
    if (set.autoPick && S.inv.some((x) => !x)) {
      let best = null;
      let bd = 170;
      for (const it of this.items.values()) {
        if (it.tryUntil > this.t) continue;
        const dy = Math.abs(it.y - this.me.y);
        // khác tầng thì tính thêm quãng leo; server chỉ cho nhặt khi lệch cao dưới 60 nên phải tới đúng tầng
        const dx = Math.abs(it.x - this.me.x) + (dy < 50 ? 0 : dy);
        if (dx < bd && dy < 140 && this.t - it.born < 14) {
          bd = dx;
          best = it;
        }
      }
      if (best && (bd > 12 || Math.abs(best.y - this.me.y) >= 50)) {
        this.walkTo = { x: best.x, y: best.y, item: best.id, since: this.t };
        return;
      }
    }
    // buff
    for (const sid of me.hotbar) {
      if (!sid || set.autoSkip.includes(sid)) continue;
      const sk = S.G.skills[sid];
      if ((sk.type === 'buff' || (sk.type === 'heal' && me.hp < me.s.maxHp * 0.6)) && this.skillReady(sid) && !me.buffs.some((b) => b.k === sid)) {
        if (this.useSkill(sid, true)) return;
      }
    }
    let t = this.getTarget();
    // auto chỉ đánh quái (trừ loại bị tắt trong Cài đặt: boss, khác loại đang khóa), hoặc đối thủ lôi đài khi đang trong trận
    const okT = (x) => !!x && (x.kind === 'm' ? (set.autoBoss || !x.e.def.boss) && !(set.autoLock && this.autoMob && x.e.k !== this.autoMob) : this.isArenaOpp(x.e));
    if (!okT(t) || (this.hunt && t.kind === 'm' && t.e.k !== this.hunt.mob)) {
      const nt = this.autoTarget(set.autoRange, true, true);
      // mục tiêu là người chơi thì bỏ (auto không tự đánh người); đang đánh quái khác thì chỉ đổi khi thấy quái cần săn
      if (!okT(t)) t = nt;
      else if (nt && nt.kind === 'm' && nt.e.k === this.hunt.mob) t = nt;
      if (t) this.setTarget(t);
    }
    // "Chỉ đánh loại quái đầu tiên": nhớ loại quái của mục tiêu đầu
    if (set.autoLock && t && t.kind === 'm' && !this.autoMob) this.autoMob = t.e.k;
    if (!t) {
      // boss chưa hồi sinh: đứng chờ ở chỗ boss xuất hiện
      const hx = this.hunt && this.hunt.x;
      if (hx != null && Math.abs(hx - this.me.x) > 60) this.walkTo = { x: hx, wait: true };
      return;
    }
    // kỹ năng mạnh trước
    const order = me.hotbar.filter(Boolean).slice().reverse();
    for (const sid of order) {
      const sk = S.G.skills[sid];
      if (!this.skillReady(sid) || sk.type === 'buff' || sk.type === 'heal' || set.autoSkip.includes(sid)) continue;
      if (sk.type === 'aoe' && sk.center === 'self' && !this.inRange(t, sk.radius * 0.8)) continue;
      if ((sk.type === 'line' || sk.type === 'dash') && !this.inRange(t, sk.range * 0.8)) continue;
      if (this.useSkill(sid, true)) return;
    }
    const basic = this.basicSkill();
    if (!this.useSkill(basic, true) && !this.chase) {
      const sk = S.G.skills[basic];
      if (!this.inRange(t, sk.range)) this.chase = { sid: basic, kind: t.kind, id: t.id, since: this.t };
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
    let cx = this.me.x + this.me.dir * 20;
    // lôi đài: canh giữa hai đấu thủ để đối thủ không nằm dưới cụm nút HUD (mình vẫn luôn trong khung, cách mép 60)
    const ao = this.map.arena && S.arena && S.arena.opp ? this.players.get(S.arena.opp.id) : null;
    if (ao) cx = clamp((this.me.x + ao.x) / 2, this.me.x - W / 2 + 60, this.me.x + W / 2 - 60);
    const tx = this.map.w <= W ? (this.map.w - W) / 2 : clamp(cx - W / 2, 0, this.map.w - W);
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
    const R = this.renderer;
    const G = this.map.ground;
    const t = this.t;
    const me = this.me;
    // rung màn hình: lệch camera nguyên pixel; chạm mép bản đồ thì rung ngược lại để không lộ khoảng trống
    const sh = this.fx.shakeXY();
    const bx = Math.round(this.camX);
    const by = Math.round(this.camY);
    const camX = this.map.w > W ? shakeIn(bx, sh.x, 0, this.map.w - W) : bx + sh.x;
    const camY = shakeIn(by, sh.y, -1e9, this.map.h - H);
    this.shakeDX = camX - bx;
    this.shakeDY = camY - by;
    const hour = this.forceHour == null ? undefined : this.forceHour;
    R.drawBackground(c, camX, camY, W, H, t);
    R.drawTerrain(c, camX, camY, W, H);
    R.drawPortals(c, camX, camY, t);
    // đêm làm tối nền + địa hình (lỗ sáng ở đèn và quanh nhân vật), thực thể vẽ sau chỉ bị ám nhẹ
    R.drawNight(c, camX, camY, W, H, hour, me.x, me.y - 20);
    // hiệu ứng nằm trên mặt đất (cảnh báo boss, vết nứt) dưới chân quái/người
    this.fx.drawGround(c, camX, camY);

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
      c.drawImage(img.width === 12 ? img : iconCanvas(icon, it.r, 12), Math.round(it.x - 6 - camX), Math.round(it.y - 12 - camY + bounce));
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
      drawMonster(c, m.x - camX, m.y - camY, m.def, { t, dir: m.dir, st: m.st, id: m.id, flash: m.flash > t, rage: m.rage });
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
    // Thú cưng đi theo chủ
    for (const p of this.players.values()) this.drawPet(c, p, p.info.look, camX, camY, t);
    this.drawPet(c, this.me, S.me.look, camX, camY, t);
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
    const meAnim = S.me.dead ? 'dead' : me.st === 3 ? 'attack' : me.st === 2 ? 'jump' : me.st === 1 ? 'walk' : 'idle';
    drawNinja(c, me.x - camX, me.y - camY, {
      dir: me.dir, cls: S.me.cls, gender: S.me.gender, look: S.me.look, anim: meAnim, t, name: S.me.name,
      el: S.G.classes[S.me.cls].element, weaponType: S.G.classes[S.me.cls].weapon, flash: me.flash > t,
    });
    // Mũi tên mục tiêu: đặt trên nhãn tên (nhãn vẽ ở lớp phân giải cao) để không đè chữ và thanh máu
    if (target) {
      const e = target.e;
      const lh = Math.ceil(this.labelSize() / this.zoom);
      const top = target.kind === 'm' ? e.y - e.h - (e.def.boss ? 3 : 7) - lh : e.y - this.nameLift(e) - 3 - lh * (e.info && e.info.clan ? 1.85 : 1);
      const ay = Math.round(top - 6 - camY + Math.sin(t * 6) * 1.5);
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
    R.drawLighting(c, camX, camY, W, H, hour, me.x, me.y - 20);

    // Phóng to lên màn hình
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lo, 0, 0, W, H, 0, 0, W * this.zoom, H * this.zoom);
    this.renderOverlay(camX, camY);
  }

  // Thú cưng bay/chạy theo sau lưng chủ (petart.js). Trạng thái thú lưu trên thực thể chủ: owner.pet = { kind, x, y, dir, act }
  drawPet(c, owner, look, camX, camY, t) {
    const kind = look && look.pet;
    const dead = owner === this.me ? S.me && S.me.dead : owner.dead;
    if (!kind || !Object.prototype.hasOwnProperty.call(PET_ART, kind) || dead) {
      owner.pet = null;
      return;
    }
    const dir = owner.dir || 1;
    const fly = petFlies(kind);
    // cưỡi thú: thú cưng đi xa hơn để không chui dưới bụng thú cưỡi
    const tx = owner.x - dir * (look.mount ? 28 : 18);
    // thú đi bộ bám mặt sàn chủ đứng lần cuối (không bay theo khi chủ nhảy); sàn không kéo tới chỗ thú thì rơi xuống sàn dưới
    const grounded = owner === this.me ? this.me.onGround : owner.st !== 2 && this.floorBelow(owner.x, owner.y) - owner.y < 1.5;
    if (grounded || owner.petFloor == null) owner.petFloor = grounded ? owner.y : this.floorBelow(owner.x, owner.y);
    const ty = fly ? owner.y : this.floorBelow(tx, owner.petFloor);
    let p = owner.pet;
    if (!p || p.kind !== kind || Math.abs(p.x - tx) > 220 || Math.abs(p.y - ty) > 160) p = owner.pet = { kind, x: tx, y: ty, dir, act: null };
    const dt = Math.min(0.05, this.dt || 1 / 60);
    const a = p.act;
    const age = a ? t - a.t0 : 0;
    let gx = tx;
    let gy = ty;
    // Tha Đồ: lao tới chỗ món đồ rồi quay về
    const dashing = a && a.k === 'pick' && age < 0.3;
    if (dashing) {
      gx = a.x;
      gy = a.y;
    }
    if (a && age > (a.k === 'feed' ? 1.3 : 0.7)) p.act = null;
    const k = 1 - Math.exp(-dt * (dashing ? 16 : 6));
    const ox = p.x;
    p.x += (gx - p.x) * k;
    p.y += (gy - p.y) * (fly ? k * 0.8 : 1 - Math.exp(-dt * 14));
    const vx = (p.x - ox) / dt;
    const moving = Math.abs(vx) > 8;
    if (moving) p.dir = vx > 0 ? 1 : -1;
    else if (Math.abs(p.x - tx) < 4) p.dir = dir;
    if (p.x < camX - 40 || p.x > camX + this.W + 40) return;
    drawPet(c, p.x - camX, p.y - camY, kind, {
      t: t + (owner === this.me ? 0 : owner.id * 0.37), dir: p.dir, moving, lv: look.pl || 1, shadowDY: this.floorBelow(p.x, p.y) - p.y,
      happy: a && a.k === 'feed' ? Math.min(1, age / 1.2) : 0,
    });
  }

  // Mặt đỡ cao nhất (đất hoặc sàn gỗ) nằm ngay dưới điểm (x, y)
  floorBelow(x, y) {
    let f = this.map.ground;
    for (const [px, py, pw] of this.map.platforms) if (x >= px - 2 && x <= px + pw + 2 && py >= y - 1 && py < f) f = py;
    return f;
  }

  // Thú cưng của người chơi id làm gì đó (server gửi 'petAct'): nhặt đồ, hồi máu, được cho ăn, lên cấp
  onPetAct(m) {
    const e = this.entity(`p${m.id}`);
    if (!e) return;
    const pet = e.pet;
    const px = pet ? pet.x : e.x;
    const py = pet ? pet.y - petHeight(pet.kind) + 4 : e.y - 10;
    if (m.k === 'pick') {
      if (pet) pet.act = { k: 'pick', x: m.x, y: m.y, t0: this.t };
      this.fx.sparks(m.x, m.y - 3, '#ffe082', 5, 30);
    } else if (m.k === 'heal') {
      this.fx.sparks(px, py, '#69f0ae', 7, 34);
      if (m.n) this.fx.text(e.x, e.y - this.headH(e) - 2, `+${m.n}`, '#69f0ae');
    } else if (m.k === 'feed') {
      if (pet) pet.act = { k: 'feed', t0: this.t };
    } else if (m.k === 'lv') {
      this.fx.sparks(px, py, '#ffd54f', 14, 50);
      this.fx.text(px, py - 6, `Thú cưng Lv${m.lv}!`, '#ffd54f');
      if (S.me && m.id === S.me.id) sfx('level');
    }
  }

  toScreen(x, y) {
    return [Math.round((x - this.camX - this.shakeDX) * this.zoom), Math.round((y - this.camY - this.shakeDY) * this.zoom)];
  }

  label(ctx, text, x, y, color, size, stroke = '#120a18') {
    ctx.font = `${size}px VT323, monospace`;
    ctx.lineWidth = Math.max(2, size / 5);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  labelSize() {
    return Math.max(Math.round(15 * this.dpr), Math.round(this.zoom * 5));
  }

  // Độ cao đỉnh đầu so với chân: nằm xuống khi trọng thương thì nhãn hạ thấp theo; cưỡi thú thì nâng theo thú
  nameLift(e) {
    const dead = e === this.me ? S.me && S.me.dead : e.dead;
    return dead ? 12 : this.headH(e);
  }

  // Ngoại hình của thực thể người chơi (mình hoặc người khác)
  lookOf(e) {
    if (e === this.me) return S.me ? S.me.look : null;
    return e && e.info ? e.info.look : null;
  }

  // Độ nâng do thú cưỡi (0 khi không cưỡi hoặc đang trọng thương)
  lift(e) {
    const dead = e === this.me ? S.me && S.me.dead : e.dead;
    return dead ? 0 : mountOffset(this.lookOf(e));
  }

  headH(e) {
    return NINJA_H + this.lift(e);
  }

  // Độ hiếm của món thời trang theo ô + mã hình (tra từ dữ liệu vật phẩm)
  fashionGrade(slot, look) {
    if (!look) return 0;
    if (!this.fGrade) {
      this.fGrade = new Map();
      for (const id in S.G.items) {
        const d = S.G.items[id];
        if (d.fashion) this.fGrade.set(`${d.slot}:${d.look}`, d.grade || 0);
      }
    }
    return this.fGrade.get(`${slot}:${look}`) || 0;
  }

  // Vừa khoác trang phục hiếm (Sử thi trở lên): xoắn ánh sáng quanh thân
  checkCostume(e, look) {
    const cs = (look && look.costume) || '';
    if (e.lastCs === undefined) {
      e.lastCs = cs;
      return;
    }
    if (cs === e.lastCs) return;
    e.lastCs = cs;
    if (cs && this.fashionGrade('costume', cs) >= 3) this.fx.costumeSparkle(e.x, e.y - this.lift(e), S.G.rarity[this.fashionGrade('costume', cs)].color);
  }

  // Bụi tung sau vó thú cưỡi khi chạy trên mặt đất; trang phục Huyền thoại thỉnh thoảng lấp lánh
  updateFashionFx(dt) {
    const each = (e, look, walking) => {
      if (!look) return;
      if (look.mount && walking) {
        e.dustT = (e.dustT || 0) - dt;
        if (e.dustT <= 0) {
          e.dustT = 0.09;
          this.fx.mountDust(e.x - (e.dir || 1) * 12, e.y, e.dir || 1);
        }
      }
      if (look.costume && this.fashionGrade('costume', look.costume) >= 4) {
        e.csT = (e.csT == null ? 2 + Math.random() * 4 : e.csT) - dt;
        if (e.csT <= 0) {
          e.csT = 7 + Math.random() * 3;
          if (Math.abs(e.x - this.me.x) < this.W) this.fx.costumeSparkle(e.x, e.y - this.lift(e), S.G.rarity[4].color);
        }
      }
    };
    const me = this.me;
    if (S.me && !S.me.dead) {
      this.checkCostume(me, S.me.look);
      each(me, S.me.look, me.onGround && me.st === 1);
    }
    for (const p of this.players.values()) if (!p.dead) each(p, p.info.look, p.st === 1);
  }

  renderOverlay() {
    const ctx = this.ctx;
    const z = this.zoom;
    const size = this.labelSize();
    const camX = this.camX;
    const W = this.W;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const G = this.map.ground;
    const showNames = S.settings.names;
    // NPC
    for (const n of this.map.npcs) {
      if (n.x < camX - 40 || n.x > camX + W + 40) continue;
      let [sx, sy] = this.toScreen(n.x, G - NINJA_H - 5);
      // người chơi đứng sát NPC: đẩy nhãn NPC lên trên tên (và bong bóng chat) của người chơi để không đè chữ
      if (showNames && Math.abs(this.me.y - G) < 6) {
        ctx.font = `${size}px VT323, monospace`;
        const wn = Math.max(ctx.measureText(n.name).width, ctx.measureText(S.G.npcTypes[n.type].title).width);
        const wp = ctx.measureText(S.me.name).width;
        const px = this.toScreen(this.me.x, 0)[0];
        if (Math.abs(px - sx) < (wn + wp) / 2 + 4) {
          // đặt trên tên người chơi (cưỡi thú thì tên người chơi cao hơn tên NPC)
          sy = Math.min(sy - size - 2, this.toScreen(0, this.me.y - this.nameLift(this.me) - 3)[1] - size - 2);
          const b = this.bubbles.get(S.me.id);
          if (b && b.until >= this.t) sy -= Math.round(size * 1.35) + 10;
        }
      }
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
      const [sx, sy] = this.toScreen(m.x, m.y - m.h - (m.def.boss ? 3 : 7));
      this.label(ctx, `${m.def.name} Lv${m.def.lv}`, sx, sy, m.def.boss ? '#ff8a80' : this.mobColor(m.def.lv), size);
    }
    // Người chơi
    const drawName = (x, y, info, isMe, pk, lift) => {
      const [sx, sy] = this.toScreen(x, y - lift - 3);
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
      const lift = this.nameLift(p);
      let line = showNames ? drawName(p.x, p.y, p.info, false, p.pk || this.isArenaOpp(p), lift) : this.toScreen(p.x, p.y - lift - 3)[1];
      if (p.hp < p.mhp && !p.dead) {
        const [bx, by] = this.toScreen(p.x - 8, p.y - lift - 2);
        ctx.fillStyle = '#1a1020';
        ctx.fillRect(bx - 1, by - 1, 16 * z + 2, Math.max(3, z) + 2);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(bx, by, Math.round((16 * z * p.hp) / Math.max(1, p.mhp)), Math.max(3, z));
      }
      this.bubble(ctx, p.id, p.x, line, size);
    }
    const meInfo = { name: S.me.name, clan: S.me.clan ? S.me.clan.name : null, pk: S.me.pk };
    const line = drawName(this.me.x, this.me.y, meInfo, true, S.me.pkMode, this.nameLift(this.me));
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
    const w = Math.round(ctx.measureText(text).width + size);
    const h = Math.round(size * 1.35);
    const x0 = Math.round(sx - w / 2);
    const y = Math.round(lineY - h - 8);
    const r = Math.max(3, Math.round(size / 4));
    const tw = Math.max(4, Math.round(size / 4));
    // bong bóng giấy bo góc, viền tối và đuôi nhọn chỉ xuống nhân vật
    ctx.beginPath();
    ctx.moveTo(x0 + r, y);
    ctx.lineTo(x0 + w - r, y);
    ctx.quadraticCurveTo(x0 + w, y, x0 + w, y + r);
    ctx.lineTo(x0 + w, y + h - r);
    ctx.quadraticCurveTo(x0 + w, y + h, x0 + w - r, y + h);
    ctx.lineTo(sx + tw, y + h);
    ctx.lineTo(sx, y + h + tw + 2);
    ctx.lineTo(sx - tw, y + h);
    ctx.lineTo(x0 + r, y + h);
    ctx.quadraticCurveTo(x0, y + h, x0, y + h - r);
    ctx.lineTo(x0, y + r);
    ctx.quadraticCurveTo(x0, y, x0 + r, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,248,228,0.96)';
    ctx.fill();
    ctx.lineWidth = Math.max(2, Math.round(size / 9));
    ctx.strokeStyle = '#1d1424';
    ctx.stroke();
    ctx.fillStyle = 'rgba(176,125,51,0.28)';
    ctx.fillRect(x0 + r, y + h - Math.max(2, ctx.lineWidth) - 1, w - r * 2, Math.max(2, ctx.lineWidth));
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2416';
    ctx.fillText(text, sx, y + h / 2 + 1);
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
    if (n.type === 'event') {
      // đang mùa lễ hội và đủ bánh đổi món rẻ nhất
      const s = activeSeason();
      if (s && countInv(s.token) >= Math.min(...s.exchange.map((e) => e.cost))) return '!';
    }
    return '';
  }

  elementColor(cls) {
    return ELEMENT_COLORS[S.G.classes[cls].element];
  }
}
