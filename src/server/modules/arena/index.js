'use strict';

// Lôi đài xếp hạng 1 đấu 1: hàng chờ, ghép cặp theo Elo, phòng đấu riêng (bản sao bản đồ 'loidai'),
// tính điểm Elo (tổng 2 bên không đổi), thưởng mỗi trận và thưởng tuần theo hạng (gửi qua hộp thư).
const { GameMap } = require('../../core/map');
const { MAPS, GROUND } = require('../../../shared/data/maps');
const { CLASSES } = require('../../../shared/data/classes');
const { ARENA } = require('../../../shared/data/extras');
const { rewardItems, rewardLabel } = require('../mail');
const { dialog } = require('../../core/npc');

const DAY = 86400000;
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
const vnDay = (now = Date.now()) => new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
// Tuần tính từ thứ Hai 00:00 giờ Việt Nam: mã tuần = ngày thứ Hai đầu tuần
function weekId(now = Date.now()) {
  const d = new Date(now + 7 * 3600 * 1000);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY).toISOString().slice(0, 10);
}

// Dữ liệu lôi đài trên nhân vật (dọn khi tải: số âm, kiểu lạ, dữ liệu sửa tay)
function cleanArena(a) {
  const o = a && typeof a === 'object' ? a : {};
  const str = (v) => (typeof v === 'string' ? v.slice(0, 10) : '');
  return {
    elo: num(o.elo, 0, 99999, ARENA.elo), win: num(o.win, 0, 1e7, 0), lose: num(o.lose, 0, 1e7, 0), draw: num(o.draw, 0, 1e7, 0),
    fame: num(o.fame, 0, 1e9, 0), streak: num(o.streak, 0, 1e6, 0), best: num(o.best, 0, 1e6, 0),
    // số trận có thưởng trong ngày; số trận và số trận thắng trong tuần; tuần đã nhận thưởng
    day: str(o.day), dn: num(o.dn, 0, 1e6, 0), wk: str(o.wk), wn: num(o.wn, 0, 1e6, 0), ww: num(o.ww, 0, 1e6, 0), paid: str(o.paid),
  };
}

// Phần lôi đài trong gói 'me'
function arenaView(a, now = Date.now()) {
  const wk = weekId(now);
  return {
    elo: a.elo, win: a.win, lose: a.lose, draw: a.draw, fame: a.fame, streak: a.streak, best: a.best,
    wn: a.wk === wk ? a.wn : 0, ww: a.wk === wk ? a.ww : 0, dn: a.day === vnDay(now) ? a.dn : 0,
  };
}

// Điểm Elo bên a nhận (bên b mất đúng chừng ấy): sa = 1 thắng, 0.5 hòa
function eloDelta(ea, eb, sa) {
  const exp = 1 / (1 + 10 ** ((eb - ea) / 400));
  let d = Math.round(ARENA.k * (sa - exp));
  if (sa === 1) d = Math.max(1, d);
  // không bên nào xuống dưới 0 (tổng vẫn giữ nguyên)
  return Math.max(-ea, Math.min(eb, d));
}

// Thưởng tuần theo hạng (1 = cao nhất); null nếu ngoài bảng
const weeklyTier = (rank) => ARENA.weekly.find((r) => rank <= r.to) || null;

// Dữ liệu tĩnh gửi máy khách
function arenaClient() {
  return {
    minLv: ARENA.minLv, elo: ARENA.elo, countdown: ARENA.countdown, dur: ARENA.dur, daily: ARENA.daily, pairDaily: ARENA.pairDaily,
    weeklyMin: ARENA.weeklyMin, weeklyWin: ARENA.weeklyWin, dodgeLock: ARENA.dodgeLock, win: ARENA.win, lose: ARENA.lose, draw: ARENA.draw,
    weekly: ARENA.weekly.map((r, i) => ({ from: i ? ARENA.weekly[i - 1].to + 1 : 1, to: r.to, label: rewardLabel(r) })),
  };
}

class Arena {
  constructor(world) {
    this.world = world;
    // hàng chờ: tên (chữ thường) → { p, at }
    this.queue = new Map();
    this.matches = new Map();
    this.nextId = 1;
    // số trận đã tính điểm của từng cặp trong ngày: 'a|b' → { day, n }. Lưu trong db.meta để khởi động lại
    // máy chủ không làm mới giới hạn; không có db (kiểm thử) thì giữ trong bộ nhớ
    this.pairsMem = Object.create(null);
    this.pairsDay = '';
    // bỏ trận khi chưa ai ra đòn: tên → hết hạn cấm đăng ký
    this.locks = new Map();
    // kết quả trận bị xử thua khi mất kết nối: tên → { at, res }, gửi lại khi vào game
    this.missed = new Map();
    // thứ tự toàn bộ người có Elo (để biết hạng của mình ngoài top 30)
    this.order = [];
    this.lastQueueInfo = 0;
  }

  data(p) {
    if (!p.c.arena || typeof p.c.arena !== 'object') p.c.arena = cleanArena(null);
    return p.c.arena;
  }

  oppInfo(o) {
    return { id: o.id, name: o.name, cls: o.c.cls, lv: o.lv, elo: this.data(o).elo };
  }

  inQueue(p) {
    const q = this.queue.get(p.name.toLowerCase());
    return !!q && q.p === p;
  }

  // ---------- Hàng chờ
  join(p) {
    // trận vừa xong (đang chờ về) thì vẫn đăng ký trước được, về tới nơi mới được ghép
    if (p.match && p.match.state !== 'end') return p.notice('Bạn đang thi đấu lôi đài.', 'warn');
    if (this.inQueue(p)) return this.sendQueue(p);
    if (p.lv < ARENA.minLv) return p.notice(`Cần đạt cấp ${ARENA.minLv} để thi đấu lôi đài.`, 'warn');
    if (p.dead) return p.notice('Đang trọng thương, chưa thể đăng ký.', 'warn');
    if (p.map && p.map.def.instance && !p.map.def.arena) return p.notice('Không thể đăng ký khi đang ở phó bản.', 'warn');
    const lock = (this.locks.get(p.name.toLowerCase()) || 0) - Date.now();
    if (lock <= 0) this.locks.delete(p.name.toLowerCase());
    else return p.notice(`Vừa bỏ trận, chờ ${Math.ceil(lock / 1000)} giây nữa mới đăng ký lại được.`, 'warn');
    this.queue.set(p.name.toLowerCase(), { p, at: Date.now() });
    this.data(p);
    p.notice('Đã đăng ký lôi đài. Đang tìm đối thủ...', 'info');
    this.sendQueue(p);
    this.matchmake(Date.now());
  }

  sendQueue(p) {
    const q = this.queue.get(p.name.toLowerCase());
    if (!q) return;
    p.send('arena', { st: 'queue', wait: Date.now() - q.at, n: this.queue.size });
  }

  // Hết trận: còn trong hàng chờ (đăng ký trước khi về) thì báo trạng thái chờ, không thì trạng thái rảnh
  sendIdle(p) {
    if (this.inQueue(p)) this.sendQueue(p);
    else p.send('arena', { st: 'idle' });
  }

  // Trạng thái hiện tại (vào game, hoặc máy khách gửi lệnh không khớp trạng thái server): máy khách đồng bộ lại
  sendState(p) {
    const m = p.match;
    if (!m) return this.sendIdle(p);
    const o = m.a === p ? m.b : m.a;
    const now = Date.now();
    const left = m.state === 'prep' ? m.startAt - now : m.state === 'fight' ? m.endAt - now : 0;
    p.send('arena', { st: m.state, left: Math.max(0, left), opp: this.oppInfo(o), elo: this.data(p).elo, rated: m.rated });
  }

  // Vào game: đồng bộ trạng thái (máy khách tự kết nối lại có thể còn giữ trạng thái cũ), báo kết quả trận bị xử thua lúc mất kết nối
  onJoin(p) {
    this.sendState(p);
    const key = p.name.toLowerCase();
    const ms = this.missed.get(key);
    this.missed.delete(key);
    if (ms && Date.now() - ms.at < 30 * 60000) p.send('arenaResult', ms.res);
  }

  cancel(p, msg) {
    if (!this.inQueue(p)) {
      // không còn trong hàng chờ (máy khách hiện sai): gửi lại trạng thái thật để nút Hủy không bị treo
      if (msg) this.sendState(p);
      return false;
    }
    this.queue.delete(p.name.toLowerCase());
    p.send('arena', { st: 'idle' });
    if (msg) p.notice(msg, 'info');
    return true;
  }

  // Biên điểm chấp nhận được sau khi chờ wait ms
  window(wait) {
    const m = ARENA.match;
    return Math.min(m.max, m.base + Math.floor(wait / m.growEvery) * m.grow);
  }

  // Người trong hàng chờ có vào trận ngay được không (chưa được thì giữ chỗ, lượt sau xét lại)
  ready(p) {
    return this.world.players.has(p.id) && !p.dead && !p.match && !!p.map && !p.map.def.instance;
  }

  pairKey(a, b) {
    return [a.name.toLowerCase(), b.name.toLowerCase()].sort().join('|');
  }

  pairTable() {
    const meta = this.world.db && this.world.db.meta;
    if (!meta) return this.pairsMem;
    if (!meta.arenaPairs || typeof meta.arenaPairs !== 'object' || Array.isArray(meta.arenaPairs)) meta.arenaPairs = {};
    return meta.arenaPairs;
  }

  pairCount(a, b) {
    const t = this.pairTable();
    const k = this.pairKey(a, b);
    const e = Object.prototype.hasOwnProperty.call(t, k) ? t[k] : null;
    return e && e.day === vnDay() ? num(e.n, 0, 1e6, 0) : 0;
  }

  // Ghi thêm 1 trận tính điểm cho cặp; sang ngày mới thì dọn số của ngày cũ
  pairAdd(a, b, now) {
    const t = this.pairTable();
    const day = vnDay(now);
    if (this.pairsDay !== day) {
      this.pairsDay = day;
      for (const k of Object.keys(t)) if (!t[k] || t[k].day !== day) delete t[k];
    }
    const k = this.pairKey(a, b);
    t[k] = { day, n: this.pairCount(a, b) + 1 };
  }

  // Ghép cặp: người chờ lâu nhất trước, chọn đối thủ có Elo gần nhất trong biên (biên rộng hơn của 2 người).
  // Cặp đã đấu đủ số trận tính điểm hôm nay chỉ được ghép khi không còn ai khác
  matchmake(now) {
    for (const [k, q] of this.queue) if (!this.world.players.has(q.p.id) || this.world.byName.get(k) !== q.p) this.queue.delete(k);
    const list = [...this.queue.values()].filter((q) => this.ready(q.p)).sort((a, b) => a.at - b.at);
    const used = new Set();
    for (const a of list) {
      if (used.has(a)) continue;
      const ea = this.data(a.p).elo;
      let best = null;
      let bs = Infinity;
      for (const b of list) {
        if (b === a || used.has(b)) continue;
        const diff = Math.abs(ea - this.data(b.p).elo);
        if (diff > Math.max(this.window(now - a.at), this.window(now - b.at))) continue;
        const score = diff + (this.pairCount(a.p, b.p) >= ARENA.pairDaily ? 1e6 : 0);
        if (score < bs) {
          bs = score;
          best = b;
        }
      }
      if (!best) continue;
      used.add(a);
      used.add(best);
      this.start(a.p, best.p);
    }
  }

  // ---------- Trận đấu
  start(a, b) {
    const now = Date.now();
    for (const p of [a, b]) {
      this.queue.delete(p.name.toLowerCase());
      if (p.trade) this.world.mods.trade.cancelTrade(p, 'Giao dịch bị hủy vì vào lôi đài.');
    }
    const id = this.nextId++;
    const map = new GameMap(this.world, MAPS.loidai);
    map.id = `loidai#${id}`;
    const rated = this.pairCount(a, b) < ARENA.pairDaily;
    const m = { id, map, a, b, names: [a.name, b.name], state: 'prep', created: now, startAt: now + ARENA.countdown, endAt: 0, closeAt: 0, rated };
    map.match = m;
    this.matches.set(id, m);
    const def = MAPS.loidai;
    // hai bên cách nhau 90px quanh giữa sàn (máy khách canh camera vào giữa hai người): điện thoại 667px
    // vẫn thấy cả hai giữa D-pad và cụm kỹ năng, không ai bị che dưới nút
    const mid = Math.round(def.w / 2);
    [[a, mid - 45, 1], [b, mid + 45, -1]].forEach(([p, x, dir]) => {
      // chỗ cũ để trả về sau trận; đang đứng ở phó bản thì về làng
      const home = p.map && !p.map.def.instance ? { map: p.map.id, x: Math.round(p.x) } : { map: CLASSES[p.c.cls].village, x: null };
      p.arenaBack = { ...home, hp: p.c.hp, mp: p.c.mp };
      p.match = m;
      // vào trận: bỏ buff tạm của kỹ năng, hồi chiêu làm mới, sinh lực/chakra hồi đầy
      p.buffs = {};
      p.cool = {};
      p.recalc();
      p.c.hp = p.s.maxHp;
      p.c.mp = p.s.maxMp;
      p.dir = dir;
      this.world.enterMap(p, map, x, GROUND);
      p.markMe();
    });
    for (const [p, o] of [[a, b], [b, a]]) {
      p.send('arena', { st: 'prep', left: ARENA.countdown, opp: this.oppInfo(o), elo: this.data(p).elo, rated });
    }
    // đếm ngược hiện to giữa màn hình phía client, ở đây chỉ ghi vào khung chat
    map.broadcast('chat', { ch: 'sys', msg: `Lôi đài: ${a.name} đấu với ${b.name}! Trận đấu bắt đầu sau ${Math.round(ARENA.countdown / 1000)} giây.` });
    if (!rated) map.broadcast('chat', { ch: 'sys', msg: `Hai bên đã đấu ${ARENA.pairDaily} trận tính điểm hôm nay: trận này là giao hữu, không đổi điểm và không có thưởng.` });
    return m;
  }

  // Gọi mỗi tick (50ms): bắt đầu trận, hết giờ, đóng phòng
  update(now) {
    for (const m of [...this.matches.values()]) {
      if (m.state === 'prep' && now >= m.startAt) {
        m.state = 'fight';
        m.endAt = now + ARENA.dur;
        // sinh lực tối đa lúc vào đấu: hết giờ chia theo mức này, tháo đồ cộng sinh lực phút cuối không đẩy được % lên
        m.maxHp = new Map([[m.a, m.a.s.maxHp], [m.b, m.b.s.maxHp]]);
        for (const [p, o] of [[m.a, m.b], [m.b, m.a]]) if (p.match === m) p.send('arena', { st: 'fight', left: ARENA.dur, opp: this.oppInfo(o), rated: m.rated });
      } else if (m.state === 'fight' && now >= m.endAt) {
        this.timeUp(m);
      } else if (m.state === 'end' && now >= m.closeAt) {
        this.close(m);
      }
    }
  }

  // % sinh lực trong trận: chia cho mức lớn hơn giữa sinh lực tối đa lúc vào đấu và hiện tại
  hpPct(m, p) {
    const base = (m.maxHp && m.maxHp.get(p)) || 0;
    return Math.max(0, p.c.hp) / Math.max(1, base, p.s.maxHp);
  }

  // Hết giờ: so % sinh lực, bằng nhau thì hòa
  timeUp(m) {
    const ra = this.hpPct(m, m.a);
    const rb = this.hpPct(m, m.b);
    if (Math.abs(ra - rb) < 1e-9) return this.finish(m, m.a, m.b, 'time', true);
    return ra > rb ? this.finish(m, m.a, m.b, 'time') : this.finish(m, m.b, m.a, 'time');
  }

  // Bị hạ trong trận (combat.damagePlayer gọi thay cho killPlayer)
  ko(loser) {
    const m = loser.match;
    if (!m || m.state !== 'fight') return;
    loser.c.hp = 1;
    loser.st = 0;
    loser.markMe();
    this.finish(m, m.a === loser ? m.b : m.a, loser, 'ko');
  }

  // Rời trận (nút Rời trận, đổi bản đồ, mất kết nối): thua
  forfeit(p, reason) {
    const m = p.match;
    if (!m || m.state === 'end') return;
    this.finish(m, m.a === p ? m.b : m.a, p, reason);
  }

  leave(p) {
    if (!p.match) return;
    if (p.match.state === 'end') {
      // trận đã xong: về luôn, không chờ đóng phòng
      this.sendBack(p);
      return;
    }
    this.forfeit(p, 'leave');
    this.sendBack(p);
  }

  finish(m, winner, loser, reason, draw = false) {
    if (m.state === 'end') return;
    const now = Date.now();
    m.state = 'end';
    m.closeAt = now + ARENA.close;
    const quit = reason === 'leave' || reason === 'dc';
    // chưa bên nào ra đòn mà đã bỏ trận hoặc hòa: trận không tính (không điểm, không thưởng, không tính vào số trận tuần);
    // người bỏ bị cấm đăng ký một lúc. Chặn nuôi điểm bằng nhân vật phụ đứng yên / bỏ ngay lúc đếm ngược
    const nc = !m.hit && (quit || draw);
    if (nc && quit) this.locks.set(loser.name.toLowerCase(), now + ARENA.dodgeLock);
    const rated = m.rated && !nc;
    const wa = this.data(winner);
    const la = this.data(loser);
    const e0 = { w: wa.elo, l: la.elo };
    let d = 0;
    if (rated) {
      d = eloDelta(wa.elo, la.elo, draw ? 0.5 : 1);
      wa.elo += d;
      la.elo -= d;
      this.pairAdd(winner, loser, now);
    }
    const res = [
      [winner, loser, draw ? 'draw' : 'win', d, e0.w],
      [loser, winner, draw ? 'draw' : 'lose', -d, e0.l],
    ];
    for (const [p, o, r, dd, before] of res) {
      const a = this.data(p);
      const wk = weekId(now);
      if (a.wk !== wk) {
        a.wk = wk;
        a.wn = 0;
        a.ww = 0;
      }
      if (a.day !== vnDay(now)) {
        a.day = vnDay(now);
        a.dn = 0;
      }
      let xu = 0;
      let fame = 0;
      if (rated) {
        if (r === 'win') {
          a.win++;
          a.ww++;
          a.streak++;
          a.best = Math.max(a.best, a.streak);
        } else if (r === 'lose') {
          a.lose++;
          a.streak = 0;
        } else {
          a.draw++;
        }
        a.wn++;
        // bên bỏ cuộc không có thưởng trận
        if (!(r === 'lose' && quit) && a.dn < ARENA.daily) {
          const rw = ARENA[r];
          a.dn++;
          xu = rw.xu;
          fame = rw.fame;
          a.fame += fame;
          p.gainXu(xu);
        }
      }
      p.markMe();
      p.arenaLast = {
        res: r, reason, rated, nc, opp: { name: o.name, cls: o.c.cls, lv: o.lv }, elo: a.elo, before, d: dd, xu, fame,
        hp: Math.round(this.hpPct(m, p) * 100), ohp: Math.round(this.hpPct(m, o) * 100),
        streak: a.streak, quit: quit && r === 'lose', lock: nc && quit && p === loser ? ARENA.dodgeLock : 0,
      };
      p.send('arenaResult', p.arenaLast);
      if (p.match === m) p.send('arena', { st: 'end' });
    }
    if (this.world.db) this.world.db.dirty = true;
    const how = draw ? `hòa ${loser.name}` : reason === 'ko' ? `hạ gục ${loser.name}` : reason === 'time' ? `thắng ${loser.name} khi hết giờ` : `thắng ${loser.name} (đối thủ bỏ cuộc)`;
    const msg = nc ? `Lôi đài: trận ${winner.name} - ${loser.name} không tính vì chưa bên nào ra đòn.` : `Lôi đài: ${winner.name} ${how}${rated ? ` (${d >= 0 ? '+' : ''}${d} điểm)` : ''}.`;
    m.map.broadcast('chat', { ch: 'sys', msg });
    if (rated && !draw && this.data(winner).streak >= 5 && this.data(winner).streak % 5 === 0) {
      this.world.announce(`${winner.name} đã thắng ${this.data(winner).streak} trận lôi đài liên tiếp!`, 'world');
    }
    this.computeRank();
  }

  // Tách khỏi trận: bỏ buff tạm, trả lại sinh lực/chakra trước trận (trận đấu không làm mất máu thật). Trả về chỗ cũ
  detach(p) {
    const b = p.arenaBack;
    p.match = null;
    p.arenaBack = null;
    p.buffs = {};
    p.recalc();
    if (b) {
      p.c.hp = Math.max(1, Math.min(p.s.maxHp, b.hp));
      p.c.mp = Math.max(0, Math.min(p.s.maxMp, b.mp));
    }
    p.markMe();
    return b && this.world.maps[b.map] ? b : { map: CLASSES[p.c.cls].village, x: null };
  }

  // Đưa người chơi về chỗ đứng trước trận
  sendBack(p) {
    const dest = this.detach(p);
    this.sendIdle(p);
    if (!this.world.players.has(p.id)) return;
    this.world.enterMap(p, dest.map, dest.x == null ? MAPS[dest.map].spawnX : dest.x, GROUND);
  }

  close(m) {
    for (const p of [m.a, m.b]) if (p.match === m) this.sendBack(p);
    for (const p of [...m.map.players.values()]) this.world.sendHome(p);
    this.matches.delete(m.id);
  }

  // Mất kết nối / thoát game (world.leave, sau khi đã rời bản đồ): khỏi hàng chờ; đang đấu thì xử thua, lưu về chỗ cũ
  onLeave(p) {
    this.queue.delete(p.name.toLowerCase());
    if (!p.match) return;
    if (p.match.state !== 'end') {
      p.arenaLast = null;
      this.forfeit(p, 'dc');
      if (p.arenaLast) this.missed.set(p.name.toLowerCase(), { at: Date.now(), res: p.arenaLast });
      if (this.missed.size > 2000) this.missed.delete(this.missed.keys().next().value);
    }
    const dest = this.detach(p);
    p.c.map = dest.map;
    p.c.x = dest.x == null ? MAPS[dest.map].spawnX : dest.x;
    p.c.y = GROUND;
  }

  // Đổi bản đồ (world.enterMap): rời phòng đấu là thua; vào phó bản thì rời hàng chờ
  onEnterMap(p, map) {
    if (p.match && map !== p.match.map) {
      this.forfeit(p, 'leave');
      this.detach(p);
      this.sendIdle(p);
    }
    if (map.def.instance && !map.def.arena && this.cancel(p)) p.notice('Đã rời hàng chờ lôi đài vì vào phó bản.', 'warn');
  }

  // Gọi mỗi giây: ghép cặp, báo số người chờ, sang tuần mới thì trao thưởng tuần trước
  tick(now) {
    if (this.queue.size) {
      this.matchmake(now);
      if (now - this.lastQueueInfo >= 5000) {
        this.lastQueueInfo = now;
        for (const q of this.queue.values()) this.sendQueue(q.p);
      }
    }
    const db = this.world.db;
    if (!db || !db.meta) return;
    const wk = weekId(now);
    if (db.meta.arenaWeek !== wk) {
      if (db.meta.arenaWeek) this.payWeek(db.meta.arenaWeek);
      db.meta.arenaWeek = wk;
      db.dirty = true;
    }
  }

  // ---------- Xếp hạng
  allChars() {
    const db = this.world.db;
    const map = new Map();
    for (const c of Object.values((db && db.chars) || {})) map.set(c.name.toLowerCase(), c);
    for (const p of this.world.players.values()) map.set(p.name.toLowerCase(), p.c);
    return [...map.values()];
  }

  computeRank() {
    const rows = this.allChars().filter((c) => c.arena && c.arena.win + c.arena.lose + c.arena.draw > 0)
      .map((c) => ({ name: c.name, cls: c.cls, level: c.level, elo: c.arena.elo, win: c.arena.win, lose: c.arena.lose, draw: c.arena.draw }))
      .sort((a, b) => b.elo - a.elo || b.win - a.win || a.name.localeCompare(b.name));
    this.order = rows.map((r) => r.name.toLowerCase());
    if (this.world.rankCache) this.world.rankCache.arena = rows.slice(0, 30);
    return rows;
  }

  myRank(p) {
    const i = this.order.indexOf(p.name.toLowerCase());
    return { ...arenaView(this.data(p)), rank: i >= 0 ? i + 1 : 0, queue: this.inQueue(p) };
  }

  // Thưởng tuần: xếp theo Elo những người đánh đủ số trận trong tuần week, gửi quà qua hộp thư (mỗi tuần 1 lần)
  payWeek(week) {
    const list = this.allChars().filter((c) => c.arena && c.arena.wk === week && c.arena.wn >= ARENA.weeklyMin
      && c.arena.ww >= ARENA.weeklyWin && c.arena.elo >= ARENA.elo)
      .sort((a, b) => b.arena.elo - a.arena.elo || b.arena.ww - a.arena.ww || a.name.localeCompare(b.name));
    let n = 0;
    list.forEach((c, i) => {
      const rank = i + 1;
      const tier = weeklyTier(rank);
      if (!tier || c.arena.paid === week) return;
      c.arena.paid = week;
      n++;
      const items = rewardItems(tier);
      const base = {
        from: 'Võ Sư Thiết Quyền', title: `Thưởng lôi đài tuần (hạng ${rank})`,
        body: `Tuần ${week.split('-').reverse().join('/')}: ngươi xếp hạng ${rank} lôi đài với ${fmt(c.arena.elo)} điểm (${c.arena.wn} trận, thắng ${c.arena.ww}). Đây là phần thưởng của ngươi!`,
        xu: tier.xu || 0, luong: tier.luong || 0,
      };
      if (this.world.mail && this.world.mail.sendItems(c, base, items)) return;
      // hộp thư đầy quà: cộng thẳng tiền, đồ chờ trả dần khi hành trang có chỗ
      const p = this.world.byName ? this.world.byName.get(c.name.toLowerCase()) : null;
      if (p && p.c === c) {
        if (tier.xu) p.gainXu(tier.xu);
        if (tier.luong) p.c.luong += tier.luong;
        for (const it of items) p.stashItem(it);
        p.markMe();
        p.notice(`Hộp thư đầy: thưởng lôi đài tuần (${rewardLabel(tier)}) đã được cộng thẳng / gửi thủ kho.`, 'reward');
      } else {
        c.xu = Math.min(2e9, (c.xu || 0) + (tier.xu || 0));
        c.luong = (c.luong || 0) + (tier.luong || 0);
        if (!Array.isArray(c.pending)) c.pending = [];
        c.pending.push(...items);
      }
    });
    if (this.world.db) this.world.db.dirty = true;
    if (n && list.length) this.world.announce(`Lôi đài tuần đã tổng kết! Hạng nhất: ${list[0].name} (${fmt(list[0].arena.elo)} điểm). Phần thưởng đã được gửi qua hộp thư.`, 'world');
    return n;
  }

  // Lệnh admin /arena [reward | elo <n> | huy]
  admin(p, args, sys) {
    const sub = String(args[0] || '').toLowerCase();
    if (sub === 'reward') {
      const wk = weekId();
      const n = this.payWeek(wk);
      return sys(`Đã trao thưởng lôi đài tuần ${wk} cho ${n} người (cần từ ${ARENA.weeklyMin} trận, thắng từ ${ARENA.weeklyWin} trận trong tuần và điểm từ ${fmt(ARENA.elo)}; ai đã nhận tuần này thì bỏ qua).`);
    }
    if (sub === 'elo') {
      const a = this.data(p);
      a.elo = num(+args[1], 0, 99999, a.elo);
      p.markMe();
      this.computeRank();
      return sys(`Điểm lôi đài: ${a.elo}`);
    }
    const busy = [...this.matches.values()].filter((m) => m.state !== 'end').length;
    return sys(`Lôi đài: ${this.queue.size} người chờ, ${busy} trận đang đấu. Lệnh: /arena reward (trao thưởng tuần ngay), /arena elo <điểm>`);
  }
}

// Võ Sư Lôi Đài: thành tích, đăng ký / hủy hàng chờ, xem bảng xếp hạng
function arenaDialog(A, p, n) {
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
  dialog(p, n, p.lv < ARENA.minLv ? `${text}\nNgươi cần đạt cấp ${ARENA.minLv} mới được lên lôi đài.` : text, opts);
}

module.exports = {
  name: 'arena',
  expose: 'arena',
  init: (world) => new Arena(world),
  actions: {
    arenaJoin(p) { this.join(p); },
    arenaCancel(p) { this.cancel(p, 'Đã hủy đăng ký lôi đài.'); },
    arenaLeave(p) { if (p.match) this.leave(p); else this.sendState(p); },
  },
  npcs: {
    arena: {
      open(p, n) { arenaDialog(this, p, n); },
      act(p, n, a) {
        if (a === 'join') this.join(p);
        else if (a === 'cancel') this.cancel(p, 'Đã hủy đăng ký lôi đài.');
        else if (a === 'rank') return p.send('openUi', { ui: 'rank', tab: 'arena' });
        if (!p.match) arenaDialog(this, p, n);
      },
    },
  },
  hooks: {
    sanitize: { order: 3, fn(c) { c.arena = cleanArena(c.arena); } },
    selfData: { order: 3, fn(p, d, now) { d.arena = arenaView(p.c.arena, now); } },
    clientData(out) {
      out.arena = arenaClient();
    },
    join: { order: 2, fn(p) { this.onJoin(p); } },
    left(p) { this.onLeave(p); },
    beforeEnterMap: { order: 1, fn(p, map) { this.onEnterMap(p, map); } },
    second: { order: 3, fn(now) { this.tick(now); } },
    update(dt, now) {
      for (const m of this.matches.values()) m.map.update(dt, now);
      this.update(now);
    },
    sendState() {
      for (const m of this.matches.values()) m.map.sendState();
    },
    rank() {
      this.computeRank();
    },
  },
  Arena, cleanArena, arenaView, arenaClient, eloDelta, weekId, weeklyTier,
};
