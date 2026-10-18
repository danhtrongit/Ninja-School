'use strict';

// Kiểm thử tự động: khởi động server tạm, điều khiển 2 bot qua WebSocket.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-test-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) failures++;
};

class Bot {
  constructor(name) {
    this.name = name;
    this.msgs = [];
    this.waiters = [];
    this.used = new Set();
    this.sendIdx = 0;
    this.state = {};
  }

  connect(headers) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${PORT}/ws`, headers ? { headers } : undefined);
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        this.msgs.push(m);
        const idx = this.msgs.length - 1;
        if (m.t === 'me') this.me = m;
        if (m.t === 'enterMap') {
          this.me = m.me;
          this.map = m.map;
          this.x = m.x;
          this.y = m.y;
          this.monsters = new Map(m.monsters.map((x) => [x.id, x]));
        }
        if (m.t === 'inv') this.inv = m;
        if (m.t === 'state' && this.monsters) for (const [id, x, y, , , hp] of m.m) if (this.monsters.has(id)) Object.assign(this.monsters.get(id), { x, y, hp });
        if (m.t === 'mSpawn' && this.monsters) this.monsters.set(m.id, m);
        if (m.t === 'mDie' && this.monsters) this.monsters.delete(m.id);
        if (m.t === 'pos') { this.x = m.x; this.y = m.y; }
        if (m.t === 'data') {
          this.data = m;
          resolve();
        }
        for (const w of this.waiters.slice()) {
          if (!this.used.has(idx) && w.t === m.t && (!w.pred || w.pred(m))) {
            this.used.add(idx);
            this.waiters.splice(this.waiters.indexOf(w), 1);
            clearTimeout(w.timer);
            w.resolve(m);
          }
        }
      });
      this.ws.on('error', reject);
    });
  }

  send(t, d = {}) {
    this.sendIdx = this.msgs.length;
    this.ws.send(JSON.stringify({ t, ...d }));
  }

  // Chờ tin nhắn loại t đến sau lần gửi gần nhất (kể cả tin đã đến trước khi gọi wait)
  wait(t, pred, ms = 4000) {
    for (let i = this.sendIdx; i < this.msgs.length; i++) {
      const m = this.msgs[i];
      if (!this.used.has(i) && m.t === t && (!pred || pred(m))) {
        this.used.add(i);
        return Promise.resolve(m);
      }
    }
    return new Promise((resolve, reject) => {
      const w = { t, pred, resolve };
      w.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        reject(new Error(`${this.name}: hết thời gian chờ "${t}"`));
      }, ms);
      this.waiters.push(w);
    });
  }

  async walkTo(x) {
    while (Math.abs(this.x - x) > 4) {
      const step = Math.sign(x - this.x) * Math.min(14, Math.abs(x - this.x));
      this.x += step;
      this.send('move', { x: this.x, y: this.y, dir: Math.sign(step), st: 1 });
      await sleep(90);
    }
  }
}

let log = '';
async function startServer() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT, DATA_DIR: DATA, ADMINS: 'botadmin,bot_two,lodai_a,lodai_b', TATHU: '0', SEASON: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const start = log.length;
  srv.stdout.on('data', (d) => { log += d; });
  srv.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50 && !log.slice(start).includes('đang chạy'); i++) await sleep(100);
  return srv;
}

// Công thức nội tại kiểm thử trực tiếp (không cần server): cộng dồn chỉ số, kháng hệ khắc, sát thương chí mạng
function unitTests() {
  console.log('0. Công thức kỹ năng nội tại');
  const { passiveBonus } = require('../server/data/skills');
  const { Combat } = require('../server/game/combat');
  const pb = passiveBonus('kunai', JSON.parse('{"n7":3,"n9":15,"k7":15,"__proto__":9,"constructor":9}'));
  ok(pb.mpRegen === 3.2 && pb.resist === 29 && pb.hpPct === 0 && pb.defPct === 0, 'passiveBonus: chỉ tính nội tại đúng phái, bỏ khóa rác');
  const cb = new Combat({});
  const rnd = Math.random;
  try {
    Math.random = () => 0.5;
    const hit = (att, tgt) => cb.calc({ atk: 1000, ...att }, { def: 0, ...tgt }, 1, false).dmg;
    ok(hit({ el: 'water' }, { el: 'fire' }) === 1150 && hit({ el: 'water' }, { el: 'fire', resist: 20 }) === 920,
      'kháng hệ khắc giảm 20% đòn từ hệ Thủy lên hệ Hỏa');
    ok(hit({ el: 'wind' }, { el: 'fire', resist: 20 }) === 900, 'kháng hệ khắc không giảm đòn từ hệ khác');
    Math.random = () => 0;
    ok(hit({ crit: 10 }, {}) === 1440 && hit({ crit: 10, critDmg: 170 }, {}) === 1530, 'sát thương chí mạng dùng critDmg (mặc định 160%)');
    // Đường đánh thật: quái hệ Thủy đánh người hệ Hỏa (monsterAttack → playerTgt → calc), PvP dùng chung playerTgt
    Math.random = () => 0.5;
    const taken = (resist) => {
      const got = [];
      const fake = Object.create(cb);
      fake.damagePlayer = (t, dmg) => got.push(dmg);
      const m = { id: 1, boss: false, x: 0, y: 0, def: { atk: 1000, lv: 1, el: 'water', w: 20 }, map: { broadcast() {} } };
      fake.monsterAttack(m, { id: 2, el: 'fire', dead: false, s: { def: 0, dodge: 0, resist } });
      return got[0];
    };
    ok(taken(0) === 1150 && taken(20) === 920, 'quái hệ khắc đánh người: kháng hệ nội tại giảm sát thương (monsterAttack)');
    ok(cb.playerTgt({ el: 'fire', s: { def: 7, dodge: 3, resist: 15 } }).resist === 15, 'PvP: playerTgt mang kháng hệ của nạn nhân');
    // Boss rơi sách nội tại qua rollDrops (Math.random = 0: mọi tỉ lệ đều trúng)
    Math.random = () => 0;
    const { MONSTERS } = require('../server/data/monsters');
    const drops = cb.rollDrops({ def: MONSTERS.boss_god, boss: true }).filter((x) => x.it).map((x) => x.it.id);
    ok(drops.includes('book_k9') && drops.includes('book_q9'), 'boss rơi sách nội tại qua rollDrops');
  } finally {
    Math.random = rnd;
  }
  bossUnitTests();
  bossCleanupUnitTests();
  gemUnitTests();
  petUnitTests();
  mailUnitTests();
  arenaUnitTests();
}

// Lôi đài: Elo tổng không đổi, mã tuần theo giờ Việt Nam, dọn dữ liệu hỏng, ghép cặp theo biên điểm nới dần
function arenaUnitTests() {
  console.log('0g. Lôi đài (Elo, tuần, ghép cặp)');
  const { Arena, eloDelta, weekId, cleanArena, weeklyTier } = require('../server/game/arena');
  const { ARENA } = require('../server/data/extras');
  ok(eloDelta(1000, 1000, 1) === 16 && eloDelta(1000, 1000, 0.5) === 0 && eloDelta(1400, 1000, 1) >= 1 && eloDelta(1000, 1400, 1) > 16,
    'Elo: cùng điểm thắng +16, hòa 0, cao thắng thấp vẫn ít nhất +1, thấp thắng cao được nhiều hơn');
  ok(eloDelta(0, 10, 1) === 10 && eloDelta(5, 20, 0) === -5, 'Elo: bên thua không xuống dưới 0 (phần trừ = phần cộng, tổng không đổi)');
  // thứ Hai 00:00 giờ VN = Chủ Nhật 17:00 UTC
  const mon = Date.parse('2026-10-18T17:00:00Z');
  ok(weekId(mon) === '2026-10-19' && weekId(mon - 1000) === '2026-10-12' && weekId(mon + 6 * 86400000 + 3600000) === '2026-10-19', 'mã tuần đổi đúng lúc 0 giờ thứ Hai (giờ Việt Nam)');
  const bad = cleanArena(JSON.parse('{"elo":"__proto__","win":-5,"fame":1e20,"wk":{"x":1},"paid":7}'));
  ok(bad.elo === ARENA.elo && bad.win === 0 && bad.fame === 1e9 && bad.wk === '' && bad.paid === '', 'dữ liệu lôi đài hỏng trên nhân vật được chuẩn hóa');
  ok(weeklyTier(1).luong === 100 && weeklyTier(3).luong === 60 && weeklyTier(50).luong === 10 && weeklyTier(51) === null, 'mốc thưởng tuần theo hạng');
  const players = new Map();
  const world = { players, byName: new Map(), db: null };
  const A = new Arena(world);
  const fake = (id, name, elo) => {
    const p = { id, name, lv: 30, dead: false, map: { def: {} }, c: { arena: cleanArena({ elo }) }, send() {}, notice() {} };
    players.set(id, p);
    world.byName.set(name.toLowerCase(), p);
    return p;
  };
  const pa = fake(1, 'Aa', 1000);
  const pb = fake(2, 'Bb', 1300);
  const pc = fake(3, 'Cc', 1080);
  const pairs = [];
  A.start = (a, b) => { pairs.push([a.name, b.name].sort().join('-')); A.queue.delete(a.name.toLowerCase()); A.queue.delete(b.name.toLowerCase()); };
  const now = Date.now();
  for (const [p, wait] of [[pa, 0], [pb, 0], [pc, 0]]) A.queue.set(p.name.toLowerCase(), { p, at: now - wait });
  A.matchmake(now);
  ok(pairs.join() === 'Aa-Cc' && A.queue.has('bb'), 'ghép cặp: chọn người điểm gần nhất trong biên, người chênh nhiều tiếp tục chờ');
  ok(A.window(0) === 100 && A.window(25000) === 200 && A.window(1e9) === ARENA.match.max, 'biên điểm nới thêm theo thời gian chờ, có trần');
  const pd = fake(4, 'Dd', 1650);
  A.queue.set('dd', { p: pd, at: now });
  A.matchmake(now);
  ok(pairs.length === 1, 'chênh 350 điểm, mới chờ: chưa ghép');
  A.queue.get('bb').at = now - 60000;
  A.matchmake(now);
  ok(pairs[1] === 'Bb-Dd', 'chờ lâu: biên nới rộng, ghép được đối thủ chênh nhiều điểm');

  // hết giờ: % sinh lực chia theo sinh lực tối đa lúc vào đấu, tháo đồ cộng sinh lực phút cuối không kéo % lên
  const B = new Arena(world);
  const fin = [];
  B.finish = (m, w, l, reason, draw) => fin.push([w.name, l.name, reason, !!draw]);
  const ua = { name: 'Ua', c: { hp: 1394 }, s: { maxHp: 1502 } };
  const ub = { name: 'Ub', c: { hp: 1420 }, s: { maxHp: 1502 } };
  const mt = { a: ua, b: ub, maxHp: new Map([[ua, 1502], [ub, 1502]]) };
  ua.s.maxHp = 1242;
  ua.c.hp = 1242;
  B.timeUp(mt);
  ok(fin[0] && fin[0][0] === 'Ub' && fin[0][2] === 'time' && Math.round(B.hpPct(mt, ua) * 100) === 83, `hết giờ: tháo giáp phút cuối vẫn tính ${Math.round(B.hpPct(mt, ua) * 100)}% (theo sinh lực lúc vào đấu), thua bên còn 95%`);

  // trận bỏ ngang khi chưa ai ra đòn: không tính điểm, không thưởng, người bỏ bị khóa đăng ký
  const sent = [];
  const mk = (id, name) => {
    const p = fake(id, name, 1000);
    Object.assign(p.c, { name, cls: 'kiem', level: 30, hp: 100 });
    p.s = { maxHp: 100 };
    p.gainXu = (n) => { p.xu = (p.xu || 0) + n; };
    p.markMe = () => {};
    p.send = (t, d) => sent.push([name, t, d]);
    return p;
  };
  const ea = mk(5, 'Ee');
  const eb = mk(6, 'Ff');
  const room = () => ({ a: ea, b: eb, state: 'fight', rated: true, map: { broadcast() {} }, maxHp: new Map([[ea, 100], [eb, 100]]) });
  const C = new Arena(world);
  C.finish(room(), ea, eb, 'leave');
  const rf = sent.find((x) => x[0] === 'Ff' && x[1] === 'arenaResult')[2];
  ok(rf.nc && !rf.rated && ea.c.arena.elo === 1000 && ea.c.arena.win === 0 && ea.c.arena.wn === 0 && !ea.xu && rf.lock > 0 && C.locks.has('ff'),
    'bỏ trận khi chưa ai ra đòn: trận không tính (không điểm, không thưởng, không tính trận tuần), người bỏ bị khóa đăng ký');
  const r2 = room();
  r2.hit = true;
  C.finish(r2, ea, eb, 'leave');
  ok(ea.c.arena.elo === 1016 && ea.c.arena.win === 1 && ea.xu === ARENA.win.xu && eb.c.arena.lose === 1, 'đã giao đấu rồi mới bỏ: tính thua bình thường');

  // số trận tính điểm của từng cặp lưu trong db.meta (khởi động lại máy chủ không làm mới giới hạn)
  const w2 = { players, byName: world.byName, db: { meta: {} } };
  const D1 = new Arena(w2);
  D1.pairAdd(ea, eb, Date.now());
  D1.pairAdd(eb, ea, Date.now());
  ok(w2.db.meta.arenaPairs['ee|ff'].n === 2 && new Arena(w2).pairCount(ea, eb) === 2 && new Arena(world).pairCount(ea, eb) === 0, 'số trận mỗi cặp trong ngày lưu ở db.meta');
}

// Ngọc khảm: chỉ số, dọn dữ liệu hỏng, giá bán, rơi đồ, hút máu (không cần server)
// Thú cưng bằng thế giới giả (Player/GameMap thật): chỉ số theo cấp, chia EXP, kỹ năng nhặt đồ / hồi máu, thân mật
function petUnitTests() {
  console.log('0e. Thú cưng (công thức & kỹ năng, thế giới giả)');
  const I = require('../server/data/items');
  const { PET, PET_SKILLS, cleanPet } = require('../server/data/pets');
  const { Player, newChar } = require('../server/game/player');
  const { GameMap } = require('../server/game/map');
  const { MAPS, GROUND } = require('../server/data/maps');
  const d1 = I.itemStats(I.makeItem('pet_dragon'));
  const d50 = I.itemStats({ id: 'pet_dragon', plv: 50 });
  ok(d1.atk === 220 && d50.atk === Math.round(220 * (1 + PET.growth * 49)) && d50.expPct === Math.round(25 * (1 + PET.growthPct * 49)) && d50.crit === 6.9,
    `chỉ số thú tăng theo cấp: Rồng Con cấp 50 công ${d50.atk}, EXP +${d50.expPct}%, chí mạng ${d50.crit}%`);
  const mk = I.makeItem('pet_bat');
  ok(mk.plv === 1 && mk.pexp === 0 && mk.love === PET.loveStart && !I.gemHoles(I.ITEMS.pet_bat), 'thú mới: cấp 1, EXP 0, thân mật mặc định, không có lỗ khảm');
  const bad = cleanPet(JSON.parse('{"id":"pet_bat","plv":"__proto__","pexp":1e12,"love":-5}'));
  ok(bad.plv === 1 && bad.pexp === PET.need(1) - 1 && bad.love === 0 && cleanPet({ id: 'pet_bat', plv: 99, pexp: 7 }).plv === PET.maxLv,
    'dữ liệu thú hỏng (cấp lạ, EXP quá lớn, thân mật âm) được chuẩn hóa');
  const out = [];
  const world = { nextPid: 1, nextMid: 1, nextGid: 1, db: { clans: {} }, players: new Map(), onLevelUp() {}, config: { admins: [] } };
  const conn = { send: (t, d) => out.push({ t, ...d }), sendRaw: (raw) => out.push(JSON.parse(raw)) };
  const c = newChar('PetTest', 'kiem', 'm');
  c.level = 60;
  c.map = 'fire_field';
  c.equip.pet = { id: 'pet_slime', q: 1, p: 0, r: 0, o: [] };
  const p = new Player(world, conn, c);
  ok(c.equip.pet.plv === 1 && c.equip.pet.love === PET.loveStart && p.look().pet === 'slime' && p.look().pl === 1, 'thú từ bản cũ (chưa có cấp) tải thành cấp 1; look có mã hình + cấp thú');
  const map = new GameMap(world, MAPS.fire_field);
  world.players.set(p.id, p);
  map.add(p);
  p.x = 600;
  p.y = GROUND;
  const hp0 = p.s.maxHp;
  let from = out.length;
  // EXP gốc 1000, thân mật 50: 1000 × 10% × 1.5 = 150 → lên cấp 2 (cần 100), dư 50
  p.petKillExp(1000);
  ok(c.equip.pet.plv === 2 && c.equip.pet.pexp === 50, `thú nhận ${Math.round(1000 * PET.share * 1.5)} EXP từ 1000 EXP diệt quái, lên cấp 2 dư ${c.equip.pet.pexp}`);
  ok(p.s.maxHp > hp0 && out.slice(from).some((m) => m.t === 'petAct' && m.k === 'lv' && m.lv === 2) && out.slice(from).some((m) => m.t === 'pInfo' && m.look.pl === 2),
    'thú lên cấp: chỉ số chủ tăng, báo cả bản đồ (petAct lv + pInfo có cấp thú mới)');
  // Hồi Xuân (Slime Con): chủ dưới 70% máu thì hồi % sinh lực tối đa, có hồi chiêu
  c.hp = Math.round(p.s.maxHp * 0.3);
  const hpLow = c.hp;
  const now = Date.now();
  from = out.length;
  p.petTick(now);
  const heal = Math.round((p.s.maxHp * PET_SKILLS.heal.pct(2)) / 100);
  ok(c.hp === hpLow + heal && out.slice(from).some((m) => m.t === 'petAct' && m.k === 'heal' && m.n === heal), `kỹ năng Hồi Xuân: hồi ${heal} sinh lực khi chủ dưới 70%`);
  p.petTick(now + 1000);
  ok(c.hp === hpLow + heal, 'Hồi Xuân có hồi chiêu 4 giây');
  map.def = { ...MAPS.fire_field, arena: true };
  p.petTick(now + 4500);
  ok(c.hp === hpLow + heal, 'lôi đài: thú cưng không hồi máu cho chủ');
  map.def = MAPS.fire_field;
  c.equip.pet.love = PET.loveLazy - 1;
  p.petTick(now + 5000);
  ok(c.hp === hpLow + heal, 'thân mật dưới mức dỗi: thú không dùng kỹ năng');
  c.equip.pet.love = PET.loveLazy;
  p.petDecay();
  ok(c.equip.pet.love === PET.loveLazy - 1 && out.some((m) => m.t === 'notice' && /dỗi/.test(m.msg)), 'thân mật giảm dần, chạm mức dỗi thì báo cho chủ');
  // Tha Đồ (Thỏ Ngọc): nhặt món trong bán kính, bỏ qua món ở xa hoặc thuộc người khác
  c.equip.pet = I.makeItem('pet_bunny');
  p.recalc();
  const r = PET_SKILLS.pick.r(1);
  const near = map.dropItem(I.makeItem('hp1', 2), 0, p.x + r - 4, GROUND, p.name);
  const far = map.dropItem(I.makeItem('mp1', 1), 0, p.x + r + 30, GROUND, p.name);
  const other = map.dropItem(I.makeItem('stone1', 1), 0, p.x - 20, GROUND, 'NguoiKhac');
  from = out.length;
  p.petTick(now + 10000);
  ok(!map.ground.has(near.id) && p.countItem('hp1') >= 12 && out.slice(from).some((m) => m.t === 'petAct' && m.k === 'pick' && m.x === Math.round(near.x)),
    'kỹ năng Tha Đồ: thú nhặt món trong bán kính, báo petAct có vị trí món');
  p.petTick(now + 12000);
  ok(map.ground.has(far.id) && map.ground.has(other.id), 'Tha Đồ bỏ qua món ngoài bán kính và món đang thuộc người khác');
  // Túi đầy: bỏ qua món không vào được túi để còn nhặt xu ở xa hơn (không kẹt mãi một món)
  const inv0 = c.inv.slice();
  for (let i = 0; i < c.inv.length; i++) c.inv[i] = I.makeItem('w_kiem_0');
  const gear = map.dropItem(I.makeItem('armor_1', 1), 0, p.x + 10, GROUND, p.name);
  const coin = map.dropItem(null, 500, p.x + 40, GROUND, p.name);
  const xu0 = c.xu;
  from = out.length;
  for (let k = 0; k < 3; k++) p.petTick(now + 20000 + k * 1600);
  ok(!map.ground.has(coin.id) && c.xu === xu0 + 500 && map.ground.has(gear.id) && !out.slice(from).some((m) => m.t === 'notice' && /đầy/.test(m.msg)),
    'Tha Đồ khi túi đầy: bỏ qua trang bị gần, vẫn nhặt xu ở xa hơn, không báo "Hành trang đã đầy"');
  c.inv.splice(0, c.inv.length, ...inv0);
  // Cấp tối đa: không nhận thêm EXP
  c.equip.pet.plv = PET.maxLv;
  c.equip.pet.pexp = 0;
  ok(p.petKillExp(1e6) === 0 && c.equip.pet.pexp === 0, 'thú cấp tối đa không nhận thêm EXP');
}

function gemUnitTests() {
  console.log('0d. Ngọc khảm (công thức)');
  const I = require('../server/data/items');
  const { Combat } = require('../server/game/combat');
  const { MONSTERS } = require('../server/data/monsters');
  ok(I.gemHoles(I.ITEMS.w_kiem_0) === 1 && I.gemHoles(I.ITEMS.armor_4) === 2 && I.gemHoles(I.ITEMS.ring_7) === 3 && I.gemHoles(I.ITEMS.w_kiem_11) === 3,
    'số lỗ khảm theo bậc: Gỗ-Sắt 1, Bạc-Huyền 2, Long trở lên 3');
  ok(I.gemHoles(I.ITEMS.pet_bat) === 0 && I.gemHoles(I.ITEMS.mask_oni) === 0 && I.gemHoles(I.ITEMS.gem_hoa_1) === 0, 'thú cưng, thời trang, ngọc không có lỗ khảm');
  const st = I.itemStats({ id: 'w_kiem_0', p: 0, gems: ['gem_hoa_2', 'gem_phong_3', 'gem_huyet_1'] });
  ok(st.atk === 8 + 28 && st.dodge === 0.9 && st.lifesteal === 0.3, `itemStats cộng chỉ số ngọc (công ${st.atk}, né ${st.dodge}, hút máu ${st.lifesteal})`);
  const st2 = I.itemStats({ id: 'w_kiem_0', p: 5, gems: ['gem_hoa_2'] });
  ok(st2.atk === Math.round(8 * 1.4) + 28, 'ngọc không nhân theo cấp cường hóa');
  const c1 = I.cleanGems({ id: 'w_kiem_0', gems: ['gem_hoa_1', 'gem_thuy_1'] });
  const c2 = I.cleanGems({ id: 'pet_bat', gems: ['gem_hoa_1'] });
  const c3 = I.cleanGems({ id: 'w_kiem_7', gems: ['__proto__', 'gem_hoa_1', 'gem_hoa_2', 'gem_thuy_1'] });
  const c4 = I.cleanGems({ id: 'w_kiem_7', gems: 'constructor' });
  ok(c1.gems.join() === 'gem_hoa_1' && !('gems' in c2) && JSON.stringify(c3.gems) === '[null,"gem_hoa_1",null]' && !('gems' in c4),
    'cleanGems: cắt theo số lỗ, bỏ id lạ/loại trùng, món không có lỗ thì bỏ ngọc');
  const base = I.sellPrice({ id: 'w_kiem_0', r: 0, p: 0 });
  ok(I.sellPrice({ id: 'w_kiem_0', r: 0, p: 0, gems: ['gem_hoa_2'] }) === base + Math.floor(I.ITEMS.gem_hoa_2.price * 0.25), 'giá bán trang bị cộng giá ngọc đang khảm');
  const cb = new Combat({});
  const rnd = Math.random;
  try {
    Math.random = () => 0;
    const bossGems = cb.rollDrops({ def: MONSTERS.boss_dragon, boss: true }).filter((x) => x.it && I.ITEMS[x.it.id].type === 'gem');
    const mobGems = cb.rollDrops({ def: MONSTERS.slime, boss: false }).filter((x) => x.it && I.ITEMS[x.it.id].type === 'gem');
    ok(bossGems.length === 1 && I.ITEMS[bossGems[0].it.id].glv === 5 && mobGems.length === 1 && I.ITEMS[mobGems[0].it.id].glv === 1,
      'boss rơi 1 viên ngọc cấp cao (Long Vương cấp 5), quái thường rơi ngọc cấp 1');
    Math.random = () => 0.99;
    ok(!cb.rollDrops({ def: MONSTERS.slime, boss: false }).some((x) => x.it && I.ITEMS[x.it.id].type === 'gem'), 'quái thường không phải lúc nào cũng rơi ngọc');
  } finally {
    Math.random = rnd;
  }
  const pl = { dead: false, s: { lifesteal: 2, maxHp: 1000 }, c: { hp: 500 }, heal(v) { this.c.hp = Math.min(this.s.maxHp, this.c.hp + v); } };
  ok(cb.lifeSteal(pl, 1000) === 20 && pl.c.hp === 520, 'hút máu hồi 2% sát thương gây ra');
  pl.s.lifesteal = 0;
  ok(cb.lifeSteal(pl, 1000) === 0 && pl.c.hp === 520, 'không có ngọc Huyết Hồn thì không hút máu');
  gemActionUnitTests();
}

// Ghép ngọc (túi đầy, nhánh thất bại) và hút máu qua đường useSkill thật, dùng Player/Actions thật với bản đồ giả
function gemActionUnitTests() {
  const { Player, newChar } = require('../server/game/player');
  const { Actions } = require('../server/game/actions');
  const { Combat } = require('../server/game/combat');
  const I = require('../server/data/items');
  const sent = [];
  const world = { nextPid: 1, db: { dirty: false }, announce() {}, clanView() { return null; }, social: { handle() {} } };
  const mk = () => {
    const p = new Player(world, { send: (t, d) => sent.push([t, d]) }, newChar('gemunit', 'kiem', 'm'));
    p.map = { findNpc: () => ({ id: 'n', type: 'smith', x: p.x }), broadcast: (t, d) => sent.push([t, d]) };
    p.c.xu = 1e7;
    return p;
  };
  const A = new Actions(world);
  const lastNote = () => (sent.filter((x) => x[0] === 'notice').pop() || [])[1];
  const cnt = (p, id) => p.countItem(id);
  const rnd = Math.random;
  try {
    // túi đầy, 3 viên đem ghép là cả một chồng: bỏ 3 viên trống ra đúng ô cho viên mới
    let p = mk();
    for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = I.makeItem('hp1', 1);
    p.c.inv[5] = I.makeItem('gem_hoa_1', 3);
    Math.random = () => 0;
    sent.length = 0;
    A.gemMerge(p, { npc: 'n', id: 'gem_hoa_1' });
    ok(cnt(p, 'gem_hoa_1') === 0 && cnt(p, 'gem_hoa_2') === 1 && p.c.xu === 1e7 - 1000 && !lastNote(),
      'túi đầy, ghép đúng cả chồng 3 viên: vẫn ghép được (viên mới vào ô vừa trống)');
    // túi đầy, chồng 5 viên: bỏ 3 vẫn còn 2 nên không có chỗ cho viên cấp 2 → từ chối, không mất gì
    p = mk();
    for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = I.makeItem('hp1', 1);
    p.c.inv[5] = I.makeItem('gem_hoa_1', 5);
    sent.length = 0;
    A.gemMerge(p, { npc: 'n', id: 'gem_hoa_1' });
    ok(cnt(p, 'gem_hoa_1') === 5 && cnt(p, 'gem_hoa_2') === 0 && p.c.xu === 1e7 && /đầy/.test((lastNote() || {}).msg || ''),
      'túi đầy, chồng còn dư sau khi ghép: báo hành trang đầy, giữ nguyên ngọc và xu');
    // nhánh thất bại: mất 1 viên, trả 2, trừ xu đúng 1 lần
    p = mk();
    p.c.inv[5] = I.makeItem('gem_thuy_2', 3);
    Math.random = () => 0.999;
    sent.length = 0;
    A.gemMerge(p, { npc: 'n', id: 'gem_thuy_2' });
    const res = (sent.find((x) => x[0] === 'gemResult') || [])[1];
    const fx = (sent.find((x) => x[0] === 'smithFx') || [])[1];
    ok(cnt(p, 'gem_thuy_2') === 2 && cnt(p, 'gem_thuy_3') === 0 && p.c.xu === 1e7 - 1000 * 2 * 2 && res && res.ok === false && fx && fx.k === 'enh' && fx.ok === false,
      'ghép thất bại: còn đúng 2 viên, không có viên cấp 3, trừ 4.000 xu một lần, gửi kết quả thất bại');

    // hút máu qua useSkill: tính trên sát thương thực, cắt phần dư của đòn kết liễu, hiện số hồi máu
    Math.random = () => 0.5;
    p = mk();
    p.c.equip.weapon.gems = ['gem_huyet_10'];
    p.recalc();
    const ls = p.s.lifesteal;
    p.s.atk = 5000;
    p.s.maxHp = 1e6;
    const mon = (hp) => ({ id: 1, dead: false, x: p.x + 20, y: p.y, hp, def: { w: 20, h: 20, def: 0, el: null }, dmgBy: new Map(), aggroOn() {}, target: 0 });
    const cb = Object.create(new Combat(world));
    cb.killMonster = (m) => { m.dead = true; };
    const swing = (m) => {
      p.map.monsters = new Map([[1, m]]);
      p.map.players = new Map([[p.id, p]]);
      p.map.def = { town: false };
      p.cool = {};
      p.lastSkillAt = 0;
      p.lsShownAt = 0;
      p.c.hp = 100;
      sent.length = 0;
      cb.useSkill(p, { sid: 'k0', tid: 'm1', dir: 1 });
      const hit = (sent.find((x) => x[0] === 'hit') || [])[1];
      const heal = (sent.find((x) => x[0] === 'heal') || [])[1];
      return { dmg: hit ? hit.list[0][1] : 0, healed: p.c.hp - 100, heal };
    };
    const r1 = swing(mon(1e6));
    ok(ls === 3.2 && r1.dmg > 0 && r1.healed === Math.round((r1.dmg * ls) / 100) && r1.heal && r1.heal.ls === 1 && r1.heal.list[0][1] === r1.healed,
      `hút máu qua useSkill: hồi ${r1.healed} = 3.2% của ${r1.dmg} sát thương, gửi gói heal`);
    const r2 = swing(mon(100));
    ok(r2.dmg > 100 && r2.healed === Math.round((100 * ls) / 100), `đòn kết liễu: chỉ hút trên máu còn lại của quái (hồi ${r2.healed})`);
  } finally {
    Math.random = rnd;
  }
}

// Vùng chiêu boss, lịch và chia thưởng sự kiện Tà Thú (không cần server)
function bossUnitTests() {
  console.log('0b. Chiêu boss & sự kiện Tà Thú (công thức)');
  const { inBossZone } = require('../server/game/combat');
  const { MONSTERS } = require('../server/data/monsters');
  const { TATHU } = require('../server/data/extras');
  const { BeastEvent, nextTathuAt, eventMaps, rewardTier } = require('../server/game/event');
  const circle = { sk: { shape: 'circle', r: 100, ground: true }, x: 500, y: 300, dir: 1 };
  ok(inBossZone(circle, { x: 590, y: 300 }) && !inBossZone(circle, { x: 620, y: 300 }) && !inBossZone(circle, { x: 520, y: 240 }),
    'địa chấn: trúng người trong bán kính, chạy ra ngoài hoặc nhảy lên thì né');
  const line = { sk: { shape: 'line', r: 200, w: 16 }, x: 500, y: 300, dir: -1 };
  ok(inBossZone(line, { x: 320, y: 300 }) && !inBossZone(line, { x: 560, y: 300 }) && !inBossZone(line, { x: 250, y: 300 }),
    'chiêu dải: chỉ trúng phía trước theo hướng niệm, đứng sau lưng boss là an toàn');
  // dải vẽ dày w (lệch dọc ±w/2, viền 1px): chân trong dải thì trúng, nhảy qua khỏi dải thì né
  ok(inBossZone(line, { x: 400, y: 292 }) && !inBossZone(line, { x: 400, y: 288 }) && !inBossZone(line, { x: 510, y: 300 }),
    'chiêu dải: vùng sát thương khớp dải cảnh báo (dày w, bắt đầu từ boss)');
  const pil = { sk: { shape: 'pillar', r: 24 }, x: 400, y: 300, pts: [[400, 300], [700, 238]] };
  ok(inBossZone(pil, { x: 700, y: 200 }) && inBossZone(pil, { x: 420, y: 300 }) && !inBossZone(pil, { x: 550, y: 300 }), 'cột sáng: trúng cả cột, né bằng cách chạy ngang');
  const bosses = Object.keys(MONSTERS).filter((k) => MONSTERS[k].boss);
  ok(bosses.every((k) => MONSTERS[k].skills.length >= 2 && MONSTERS[k].skills.length <= 3), 'mọi boss có 2-3 chiêu riêng');
  ok(TATHU.bosses.every((k) => MONSTERS[k] && MONSTERS[k].event && eventMaps(k).length > 0), 'mỗi Tà Thú có bãi luyện công phù hợp cấp');
  // 10:00 giờ VN → 10:30; 10:31 → 12:30
  const vn = (t) => new Date(t + 7 * 3600000).toISOString().slice(11, 16);
  ok(vn(nextTathuAt(Date.UTC(2026, 0, 1, 3, 0))) === '10:30' && vn(nextTathuAt(Date.UTC(2026, 0, 1, 3, 31))) === '12:30', 'lịch Tà Thú: phút 30 mỗi 2 giờ (giờ VN)');
  ok(rewardTier(1, 40).to === 1 && rewardTier(7, 3).to === 10 && rewardTier(25, 1.2).to === 0 && rewardTier(2, 0.4) === null, 'mốc thưởng: top 1-3, top 10, còn lại cần >= 1% máu');
  // Chia thưởng bằng thế giới giả: 12 người, A dẫn đầu, Z chỉ 0.5% máu
  const mk = (name, cls) => ({
    name, c: { cls, luong: 0 }, xu: 0, items: [], exp: 0, got: null,
    gainExp(n) { this.exp += Math.round(n); return Math.round(n); }, gainXu(n) { this.xu += n; },
    addItem(id, q) { this.items.push([id, q]); return true; }, markMe() {}, onKill() {}, notice() {}, petKillExp() {},
    send(t, d) { if (t === 'eventResult') this.got = d; },
  });
  const players = [mk('A', 'kiem'), mk('B', 'tieu'), mk('C', 'kunai'), ...Array.from({ length: 8 }, (_, i) => mk(`P${i}`, 'kiem')), mk('Z', 'cung')];
  const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const sent = [];
  const world = { config: { tathu: false }, byName, expEvent: () => 1, announce: (msg) => sent.push(msg), broadcastAll() {} };
  const ev = new BeastEvent(world);
  const def = MONSTERS.ev_hacviem;
  const dmg = [40, 20, 10, 4, 4, 3, 3, 3, 2, 2, 2, 0.5].map((pct) => pct * def.hp / 100);
  const m = { k: 'ev_hacviem', def, maxHp: def.hp, dmgBy: new Map(players.map((p, i) => [p.name, dmg[i]])), map: { def: { name: 'Hoang Mạc Cát' }, players: new Map() } };
  ev.onKill(m, players[0]);
  const [A, B, C] = players;
  const P7 = players[10];
  const Z = players[11];
  ok(A.c.luong === 30 && A.items.some(([id]) => id === 'book_k7') && A.items.some(([id, q]) => id === 'chest' && q === 3) && A.xu === 1000 * def.lv,
    'hạng 1: 30 lượng, 3 rương, sách nội tại đúng phái, xu theo cấp boss');
  ok(B.c.luong === 20 && B.items.some(([id, q]) => id === 'stone2' && q === 5) && C.c.luong === 15, 'hạng 2-3: lượng + đá cường hóa');
  ok(players[9].c.luong === 5 && P7.c.luong === 1 && Z.c.luong === 0 && Z.exp > 0, 'top 10 được 5 lượng, hạng 11 (>= 1%) 1 lượng, dưới 1% chỉ có EXP');
  ok(A.got && A.got.me.rank === 1 && A.got.top.length === 10 && A.got.top[0].name === 'A' && Z.got.me.rank === 12 && /lượng/.test(A.got.me.reward),
    'bảng kết quả gửi từng người: top 10 + hạng của mình');
  ok(sent.some((msg) => /A đã kết liễu Hắc Viêm Tà Thú/.test(msg)), 'thông báo toàn máy chủ khi Tà Thú bị hạ');
}

// Dọn dẹp boss bằng thế giới giả (GameMap/Combat/BeastEvent thật): quái con, hết giờ, bản đồ trống, túi đầy
function bossCleanupUnitTests() {
  console.log('0c. Dọn dẹp boss & thưởng khi túi đầy (thế giới giả)');
  const { GameMap } = require('../server/game/map');
  const { Combat } = require('../server/game/combat');
  const { BeastEvent, eventMaps } = require('../server/game/event');
  const { Player } = require('../server/game/player');
  const { MAPS, GROUND } = require('../server/data/maps');
  const { makeItem } = require('../server/data/items');
  const out = [];
  const world = {
    nextMid: 1, nextGid: 1, config: { tathu: false }, byName: new Map(), maps: {}, expEvent: () => 1,
    announce() {}, broadcastAll(t, d) { out.push({ t, ...d }); },
  };
  world.combat = new Combat(world);
  world.event = new BeastEvent(world);
  const mapId = eventMaps('ev_bangphach')[0];
  const map = new GameMap(world, MAPS[mapId]);
  world.maps[mapId] = map;
  // người chơi giả đã gục: chỉ ghi lại gói tin, không bị đánh
  const pl = { id: 1, name: 'Tester', x: 0, y: GROUND, dead: true, c: { kills: 0 }, conn: { sendRaw: (raw) => out.push(JSON.parse(raw)) }, send() {} };
  map.players.set(pl.id, pl);
  const summonOnce = () => {
    world.event.start('ev_bangphach', mapId);
    const boss = world.event.cur.m;
    const sk = boss.def.skills.find((x) => x.k === 'summon');
    world.combat.bossSkillHit(boss, { sk, x: boss.x, y: boss.y, dir: 1 });
    const kids = [...map.monsters.values()].filter((o) => o.master === boss.id);
    return { boss, kids };
  };
  let from = out.length;
  let { boss, kids } = summonOnce();
  ok(kids.length === 2 && kids.every((o) => o.noRespawn && out.slice(from).some((m) => m.t === 'mSpawn' && m.id === o.id)), 'chiêu triệu hồi: quái con có chủ (master), không hồi sinh, có gói mSpawn');
  from = out.length;
  world.event.end('timeout');
  const gone = (o) => out.slice(from).some((m) => m.t === 'mGone' && m.id === o.id) && !map.monsters.has(o.id);
  ok(gone(boss) && kids.every(gone) && out.slice(from).some((m) => m.t === 'event' && m.on === false) && !world.event.cur,
    'Tà Thú hết giờ (/event stop): xóa boss lẫn quái con (mGone), báo sự kiện kết thúc');
  ({ boss, kids } = summonOnce());
  from = out.length;
  world.combat.killMonster(boss, pl);
  ok(kids.every(gone) && !map.monsters.has(boss.id) && !world.event.cur, 'Tà Thú bị hạ: quái con biến mất theo (mGone), boss không ở lại bản đồ');

  // Bản đồ trống giữa lúc boss niệm: bỏ chiêu, người vào sau không trúng chiêu cũ
  ({ boss } = summonOnce());
  const live = { ...pl, id: 2, name: 'Live', dead: false, x: boss.x + 20 };
  map.players.delete(pl.id);
  map.players.set(live.id, live);
  boss.startCast(boss.def.skills.findIndex((x) => x.k === 'quake'), live, Date.now());
  ok(!!boss.cast, 'boss bắt đầu niệm khi có người đứng gần');
  map.remove(live);
  ok(!boss.cast && boss.st !== 2, 'bản đồ không còn ai: chiêu đang niệm bị hủy');
  live.dead = true;
  map.players.set(live.id, live);
  from = out.length;
  boss.update(0.05, Date.now() + 5000);
  ok(!out.slice(from).some((m) => m.t === 'bossHit') && !boss.pub().cast, 'vào lại bản đồ: không có bossHit của chiêu cũ, gói quái không còn cast');
  world.event.end('timeout');

  // Túi đầy: thưởng gửi thủ kho, kho đầy thì giữ hộ rồi tự trả, không bao giờ thả ra đất
  let dropped = 0;
  const notes = [];
  const fp = {
    c: { storage: new Array(4).fill(null), pending: [] }, map: { dropItem() { dropped++; } },
    addItem: () => false, addItemObj: () => false, markMe() {}, notice: (msg) => notes.push(msg),
    stashItem: Player.prototype.stashItem, deliverPending: Player.prototype.deliverPending,
  };
  const row = { reward: [] };
  world.event.give(fp, 'chest', 3, row);
  ok(dropped === 0 && fp.c.storage[0] && fp.c.storage[0].id === 'chest' && fp.c.storage[0].q === 3 && row.reward[0] === '3 Rương Báu' && /thủ kho/.test(notes[0]),
    'túi đầy: rương thưởng vào thủ kho, không rơi ra đất');
  for (let i = 1; i < 4; i++) fp.c.storage[i] = makeItem('w_kunai_1', 1);
  world.event.give(fp, 'stone2', 5, row);
  ok(dropped === 0 && fp.c.pending.length === 1 && fp.c.pending[0].q === 5, 'túi và kho đều đầy: đồ thưởng được giữ hộ');
  const got = [];
  fp.addItemObj = (it) => { got.push(it); return true; };
  fp.deliverPending();
  ok(fp.c.pending.length === 0 && got.length === 1 && got[0].id === 'stone2' && /Nhận đồ thưởng/.test(notes[notes.length - 1]), 'hành trang có chỗ: tự trả đồ đang giữ hộ');
}

// Hộp thư, giftcode, sự kiện theo mùa bằng thế giới giả (Player/Mailer/Season thật)
function mailUnitTests() {
  console.log('0f. Hộp thư, giftcode, lễ hội (thế giới giả)');
  const { Mailer, cleanMailbox, mailSummary, normCode, CODES } = require('../server/game/mail');
  const { Season, SEASON_LIST } = require('../server/game/season');
  const { BeastEvent } = require('../server/game/event');
  const { Player, newChar } = require('../server/game/player');
  const { makeItem, ITEMS } = require('../server/data/items');
  const { MAIL, SEASONS } = require('../server/data/extras');
  const DAY = 86400000;
  const now = Date.now();
  const box = cleanMailbox([
    { id: 1, at: now - 31 * DAY, title: 'cũ', items: [] },
    { id: 2, at: now - DAY, title: 'a'.repeat(99), body: '<b>x</b>\ny', xu: -5, luong: 1e12, items: [{ id: '__proto__', q: 1 }, { id: 'hp1', q: '3' }, { id: 'mask_fox', q: 1, r: 2, o: [], exp: now - 1000 }] },
    null, 'rác',
  ]);
  ok(box.length === 1 && box[0].id === 2 && box[0].title.length === MAIL.titleLen && box[0].body === 'bx/b\ny' && box[0].xu === 0 && box[0].luong === 1e6
    && box[0].items.length === 1 && box[0].items[0].id === 'hp1' && box[0].items[0].q === 3,
  'dọn hộp thư: bỏ thư quá 30 ngày, thư hỏng, món lạ/hết hạn; cắt tiêu đề, bỏ dấu < >, chặn số âm/quá lớn');
  const many = cleanMailbox(Array.from({ length: 40 }, (_, i) => ({ id: i + 1, at: now - 1000 + i, items: [] })));
  ok(many.length === MAIL.max && many[0].id === 11, `hộp thư giữ tối đa ${MAIL.max} thư mới nhất`);
  ok(normCode(' ninja-moi ') === 'NINJAMOI' && CODES.has('NINJAMOI') && !CODES.has('__proto__'), 'mã quà: bỏ khoảng trắng/gạch nối, không phân biệt hoa thường; tra bằng Map');

  // gửi cho nhân vật offline (chỉ có dữ liệu trong db)
  const off = newChar('VangMat', 'kiem', 'm');
  delete off.mail;
  const db = { dirty: false, meta: {}, chars: { vangmat: off }, getChar: (n) => (Object.prototype.hasOwnProperty.call(db.chars, n) ? db.chars[n] : null) };
  const world = { nextPid: 1, db, byName: new Map(), config: { admins: [] }, announce() {}, broadcastAll() {}, clanView: () => null };
  const M = new Mailer(world);
  world.mail = M;
  ok(M.charOf('VANGMAT') === off && M.charOf('__proto__') === null, 'tìm nhân vật offline theo tên (không phân biệt hoa thường, không trỏ vào Object.prototype)');
  ok(M.sendItems(off, { title: 'Quà', xu: 100 }, [makeItem('hp1', 5)]) && off.mail.length === 1 && off.mail[0].id === 1 && db.dirty && mailSummary(off.mail).g === 1,
    'gửi thư cho người offline: lưu vào dữ liệu nhân vật, đánh dấu cần ghi file');
  const eight = Array.from({ length: 8 }, () => makeItem('w_kunai_1', 1));
  ok(M.sendItems(off, { title: 'Nhiều món' }, eight) && off.mail.length === 3 && off.mail[1].items.length === MAIL.maxItems && /\(2\/2\)$/.test(off.mail[2].title),
    `nhiều món hơn ${MAIL.maxItems}: tách thành nhiều thư (1/2), (2/2)`);
  off.mail = [];
  for (let i = 0; i < MAIL.max; i++) M.deliver(off, { title: `T${i}`, xu: 1 });
  ok(!M.deliver(off, { title: 'Thừa', xu: 1 }) && off.mail.length === MAIL.max, 'hộp thư đầy thư còn quà: không nhận thêm (không làm mất quà cũ)');
  off.mail[5].got = true;
  off.mail[5].read = true;
  ok(M.deliver(off, { title: 'Mới' }) && off.mail.length === MAIL.max && !off.mail.some((x) => x.title === 'T5') && off.mail[MAIL.max - 1].title === 'Mới',
    'hộp thư đầy: bỏ thư cũ đã đọc, không còn quà để nhận thư mới');

  // Player thật: nhận quà kiểm tra chỗ trống (cộng dồn), mã quà một lần, mã hết hạn
  const out = [];
  const c = newChar('NhanThu', 'kiem', 'm');
  const p = new Player(world, { account: 'nhanthu', ip: '1.2.3.4', send: (t, d) => out.push({ t, ...d }) }, c);
  world.byName.set('nhanthu', p);
  const free = c.inv.filter((x) => !x).length;
  for (let i = 0; i < free; i++) c.inv[c.inv.indexOf(null)] = makeItem('w_kunai_1', 1);
  const hpSlot = c.inv.findIndex((it) => it && it.id === 'hp1');
  ok(p.canAddItems([{ id: 'hp1', q: ITEMS.hp1.stack - c.inv[hpSlot].q }]) && !p.canAddItems([{ id: 'hp1', q: ITEMS.hp1.stack }]) && !p.canAddItems([makeItem('stone1', 1)])
    && p.canAddItems([makeItem('stone1', 1)], [['hp1', c.inv[hpSlot].q]]), 'canAddItems: tính cộng dồn chồng có sẵn, ô trả ra khi trừ vật phẩm đem đổi');
  M.deliver(c, { title: 'Quà đá', xu: 50, items: [makeItem('stone1', 3)] });
  const mid = c.mail[c.mail.length - 1].id;
  // danh sách thư được dọn lại mỗi lần gửi cho máy khách: luôn tra lại theo id
  const mailOf = () => c.mail.find((x) => x.id === mid);
  const xu0 = c.xu;
  M.claim(p, { id: mid });
  ok(!mailOf().got && c.xu === xu0 && out.some((m) => m.t === 'notice' && /không đủ chỗ/.test(m.msg)), 'túi đầy: từ chối nhận quà, thư giữ nguyên');
  c.inv[c.inv.length - 1] = null;
  p.lastMailAct = 0;
  M.claim(p, { id: mid });
  ok(mailOf().got && c.xu === xu0 + 50 && p.countItem('stone1') === 3 && mailSummary(c.mail).g === 0, 'dọn 1 ô: nhận đủ xu + vật phẩm, thư đánh dấu đã nhận');
  M.claim(p, { id: mid });
  ok(c.xu === xu0 + 50 && p.countItem('stone1') === 3, 'nhận lại thư đã nhận: không được thêm lần nữa');
  M.del(p, { id: mid });
  ok(!mailOf(), 'xóa thư đã nhận quà');
  // giftcode tĩnh: hết hạn / chưa tới ngày (giả lập đồng hồ)
  const realNow = Date.now;
  try {
    Date.now = () => CODES.get('NINJAMOI').end + 1000;
    M.redeem(p, { code: 'ninjamoi' });
    ok(/hết hạn/.test(out[out.length - 1].msg) && !c.codes.includes('NINJAMOI'), 'mã quá ngày until: báo hết hạn, không tính là đã dùng');
  } finally {
    Date.now = realNow;
  }

  // Tà Thú: túi đầy thì quà vào hộp thư; hộp thư đầy quà thì vào thủ kho
  const ev = new BeastEvent(world);
  const row = { rank: 2, reward: [] };
  const box0 = c.mail.length;
  ev.give(p, 'chest', 2, row);
  const tm = c.mail[c.mail.length - 1];
  ok(c.mail.length === box0 + 1 && tm.items[0].id === 'chest' && tm.items[0].q === 2 && out.some((m) => m.t === 'notice' && /hộp thư/.test(m.msg)) && !c.storage.some(Boolean),
    'Tà Thú, túi đầy: rương thưởng gửi vào hộp thư');
  while (c.mail.length < MAIL.max) M.deliver(c, { title: 'lấp', xu: 1 });
  ev.give(p, 'stone2', 4, row);
  ok(c.storage.some((it) => it && it.id === 'stone2' && it.q === 4), 'Tà Thú, túi đầy và hộp thư đầy quà: chuyển sang thủ kho');

  // Lễ hội: rơi bánh theo cấp quái, boss rơi nhiều, tắt lễ hội thì không rơi
  const S0 = SEASON_LIST[0];
  const se = new Season(world);
  se.force = S0.id;
  const drops = [];
  const mk = (lv, boss) => ({ def: { lv }, boss, x: 100, y: 300, spawn: { y: 300 }, map: { dropItem: (it, xu, x, y, owner) => drops.push({ it, owner }) } });
  const owner = { lv: 40, name: 'Thợ' };
  const rnd = Math.random;
  try {
    Math.random = () => 0;
    se.onKill(owner, mk(35, false));
    se.onKill(owner, mk(40 - S0.drop.lvGap - 1, false));
    se.onKill(owner, mk(50, true));
    se.force = 'off';
    se.onKill(owner, mk(45, false));
  } finally {
    Math.random = rnd;
  }
  ok(drops.length === 2 && drops[0].it.id === S0.token && drops[0].it.q === 1 && drops[0].owner === 'Thợ' && drops[1].it.q === S0.drop.boss[0],
    `lễ hội: quái thường rơi 1 ${ITEMS[S0.token].name}, quái thấp hơn ${S0.drop.lvGap} cấp không rơi, boss rơi ${S0.drop.boss.join('-')}, tắt lễ hội thì không rơi`);
  ok(SEASONS.every((x) => ITEMS[x.token]) && se.setForce('xyz').includes(S0.id) && /tắt/.test(se.setForce('tat')) && se.cur() === null && se.setForce('auto') && se.force === null,
    'lệnh /sukien: ép bật / ép tắt / theo lịch, mã mùa sai thì liệt kê mã hợp lệ');
  ok(new Season({ config: { season: false } }).cur() === null, 'SEASON=0: tắt lịch lễ hội ngay từ đầu (kiểm thử không phụ thuộc ngày chạy)');
}

// Server tự kiểm độ cao theo vật lý nhảy: cú nhảy thật không bị sửa, lơ lửng trên không bị kéo xuống
async function airTest(a) {
  console.log('7d. Server kiểm tra độ cao (không tin y máy khách gửi)');
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');
  // giữa hai bục của làng, bên dưới không có bục; chờ hết thời gian ân hạn sau khi đổi bản đồ
  await a.walkTo(560);
  await sleep(500);
  const X = 560;
  let from = a.msgs.length;
  // mô phỏng đúng vật lý máy khách: nhảy, nhảy đôi ở đỉnh, gửi mỗi 4 khung, khung chạm đất gửi ngay; nhảy liền 3 lần
  for (let hop = 0; hop < 3; hop++) {
    let y = 300;
    let vy = -378;
    let jumps = 1;
    for (let f = 1; ; f++) {
      vy = Math.min(600, vy + 1000 / 60);
      y += vy / 60;
      if (jumps === 1 && vy >= 0) {
        vy = -330;
        jumps = 2;
      }
      if (y >= 300) break;
      if (f % 4 === 0) {
        a.send('move', { x: X, y: Math.round(y), dir: 1, st: 2 });
        await sleep(66);
      }
    }
    a.send('move', { x: X, y: 300, dir: 1, st: 0 });
    await sleep(16);
  }
  await sleep(150);
  ok(!a.msgs.slice(from).some((m) => m.t === 'pos'), 'nhảy đôi liên tục đúng vật lý: server không sửa vị trí');
  from = a.msgs.length;
  for (let i = 0; i < 30; i++) {
    a.send('move', { x: X, y: 200, dir: 1, st: 2 });
    await sleep(100);
  }
  await sleep(150);
  const fixes = a.msgs.slice(from).filter((m) => m.t === 'pos');
  ok(fixes.some((m) => m.y > 200 && m.y < 300) && fixes.some((m) => m.y === 300), `lơ lửng cao 100px: server hạ độ cao rồi kéo về mặt đất (${fixes.length} lần sửa)`);
  a.send('move', { x: X, y: 300, dir: 1, st: 0 });
  await sleep(100);
}

async function main() {
  unitTests();
  const srv = await startServer();

  try {
    console.log('1. Đăng ký & tạo nhân vật');
    const a = new Bot('A');
    global.botA = a;
    await a.connect();
    a.send('register', { u: 'botadmin', p: 'secret123' });
    const auth = await a.wait('auth');
    ok(auth.ok && auth.token, 'đăng ký thành công, nhận token');
    const gm = a.data.maps;
    ok(a.data.hotbarSets === 3, 'dữ liệu tĩnh có hotbarSets = 3');
    ok(gm.fire_field.mobs.includes('slime') && gm.bamboo.mobs.join() === 'monkey,bee,bandit' && gm.v_fire.mobs.length === 0,
      'maps[x].mobs liệt kê quái thường của bản đồ, sắp theo cấp');
    ok(gm.bamboo.bosses.some((x) => x.m === 'boss_slime' && x.x === 900) && gm.fire_field.bosses.length === 0
      && Object.values(gm).every((m) => m.mobs.every((id) => !a.data.monsters[id].boss)), 'maps[x].bosses có boss + tọa độ, mobs không chứa boss');
    const NEW_THEMES = { heaven: 'heaven', dragon_palace: 'dragon_palace', abyss: 'abyss', sakura_garden: 'sakura', ancient_ruins: 'ruins', crystal_cave: 'crystal' };
    ok(Object.entries(NEW_THEMES).every(([id, th]) => gm[id] && gm[id].theme === th), 'bản đồ hậu kỳ và nhánh phụ dùng theme riêng (heaven, dragon_palace, abyss, sakura, ruins, crystal)');
    ok(a.data.monsters.mushroom.drops.some((d) => d[0] === 'nam_doc') && Array.isArray(a.data.monsters.boss_dragon.drops),
      'monsters[x].drops gửi client (tìm đường cho nhiệm vụ thu thập)');
    await a.wait('chars');
    a.send('createChar', { name: 'KiemSi', cls: 'kiem', gender: 'm' });
    const chars = await a.wait('chars');
    ok(chars.chars.length === 1 && chars.chars[0].cls === 'kiem', 'tạo nhân vật phái Kiếm');
    a.send('createChar', { name: 'KiemSi', cls: 'tieu' });
    const dup = await a.wait('err');
    ok(/tồn tại/.test(dup.msg), 'không cho trùng tên nhân vật');
    a.send('selectChar', { name: 'KiemSi' });
    await a.wait('enterMap');
    ok(a.map === 'v_fire' && a.me.level === 1, 'vào Làng Hỏa Vân, cấp 1');

    console.log('2. Nhiệm vụ & NPC');
    await a.walkTo(330);
    a.send('npc', { id: 'v_fire_elder' });
    const dlg = await a.wait('dialog');
    ok(dlg.opts.some((o) => o.a === 'accept'), 'Trưởng Làng giao nhiệm vụ');
    a.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
    await a.wait('notice', (m) => /Hoàn thành/.test(m.msg));
    await sleep(120);
    ok(a.me.quest.i === 1, 'hoàn thành nhiệm vụ "Nhập Môn", chuyển sang nhiệm vụ 2');
    ok(a.inv.inv.some((it) => it && it.id === 'hat_0'), 'nhận thưởng Nón Gỗ');
    a.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
    await a.wait('notice', (m) => /Đã nhận/.test(m.msg));

    await a.walkTo(470);
    a.send('npc', { id: 'v_fire_potion' });
    const shop = await a.wait('shop');
    ok(shop.items.some((x) => x.id === 'hp1'), 'mở tiệm thuốc');
    const xu0 = a.me.xu;
    a.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5 });
    await a.wait('notice', (m) => /Đã mua/.test(m.msg));
    await sleep(100);
    ok(a.me.xu === xu0 - 100, 'mua 5 bình HP trừ đúng 100 xu');

    const hatSlot = a.inv.inv.findIndex((it) => it && it.id === 'hat_0');
    a.send('equip', { slot: hatSlot });
    await a.wait('inv');
    ok(a.inv.equip.hat && a.inv.equip.hat.id === 'hat_0', 'trang bị Nón Gỗ');

    console.log('3. Qua cổng & chiến đấu');
    await a.walkTo(20);
    a.send('portal', { i: 0 });
    await a.wait('enterMap');
    ok(a.map === 'fire_field', 'qua cổng sang Đồi Hỏa Diệm');
    const lv0 = a.me.level;
    let kills = 0;
    for (let round = 0; round < 12 && kills < 8; round++) {
      const slimes = [...a.monsters.values()].filter((m) => m.k === 'slime');
      if (!slimes.length) break;
      slimes.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x));
      const target = slimes[0];
      if (target.y !== 300) {
        a.monsters.delete(target.id);
        continue;
      }
      await a.walkTo(target.x - 20);
      for (let i = 0; i < 20 && a.monsters.has(target.id); i++) {
        a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
        a.send('skill', { sid: i % 6 === 0 ? 'k1' : 'k0', tid: `m${target.id}`, dir: 1 });
        await sleep(520);
      }
      if (!a.monsters.has(target.id)) {
        kills++;
        // đi tới chỗ quái chết để tự nhặt xu/đồ rơi (server nhặt trong bán kính 18px)
        await a.walkTo(Math.round(target.x));
        await sleep(200);
      }
    }
    ok(kills >= 3, `tiêu diệt ${kills} Slime`);
    ok(a.msgs.some((m) => m.t === 'expGain' && m.n > 0), 'nhận kinh nghiệm khi giết quái');
    ok(a.me.level > lv0 || a.me.exp > 0, `kinh nghiệm tăng (cấp ${a.me.level}, exp ${a.me.exp})`);
    ok(a.msgs.some((m) => m.t === 'loot' && m.k === 'xu'), 'tự nhặt xu rơi ra');
    ok(a.me.quest.prog > 0, `tiến độ nhiệm vụ diệt Slime: ${a.me.quest.prog}/8`);

    console.log('4. Lệnh admin, kỹ năng, cường hóa');
    a.send('chat', { ch: 'map', msg: '/lv 25' });
    await a.wait('chat', (m) => /Cấp hiện tại/.test(m.msg));
    await sleep(120);
    ok(a.me.level === 25 && a.me.potential === 120, 'lên cấp 25, có 120 điểm tiềm năng');
    a.send('addStat', { k: 'str', n: 10 });
    await sleep(120);
    ok(a.me.stats.str === 15, 'cộng 10 điểm sức mạnh');
    a.send('learnSkill', { sid: 'k2' });
    await sleep(120);
    ok(a.me.skills.k2 === 1 && a.me.hotbar.includes('k2'), 'học Liệt Hỏa Hoàn và gán vào thanh kỹ năng');
    ok(a.me.hotbars.length === 3 && a.me.hbi === 0 && a.me.hotbars.every((hb) => hb.length === 6)
      && a.me.hotbar.join() === a.me.hotbars[0].join() && a.me.hotbars[1].every((x) => x === null), 'có 3 bộ kỹ năng, bộ 0 đang dùng');
    const hb0 = a.me.hotbar.join();
    // sid độc hại / không hợp lệ: khóa của Object.prototype, phái khác, đòn thường, chưa học, ô ngoài phạm vi
    for (const [i, sid] of [[5, '__proto__'], [4, 'constructor'], [3, 'hasOwnProperty'], [2, 'c1'], [1, 'k0'], [5, 'k3'], [9, 'k1'], [-1, 'k1']]) a.send('hotbar', { i, sid });
    a.send('hotbarSet', { n: 7 });
    a.send('hotbarSet', { n: '2' });
    a.send('constructor', {});
    a.send('__proto__', {});
    a.send('hotbarSet', { n: 1 });
    a.send('hotbarSet', { n: 2 });
    await a.wait('me', (m) => m.hbi === 1);
    await sleep(150);
    ok(a.me.hbi === 1 && a.me.hotbars[0].join() === hb0, 'bỏ qua sid độc hại/không hợp lệ, đổi sang bộ 1 (chặn đổi liên tục)');
    ok(a.me.hotbar.every((x) => x === null), 'bộ 1 ban đầu trống');
    a.send('hotbar', { i: 0, sid: 'k2' });
    a.send('hotbar', { i: 1, sid: 'k1' });
    await a.wait('me', (m) => m.hotbar[1] === 'k1');
    ok(a.me.hotbars[1][0] === 'k2' && a.me.hotbar[0] === 'k2' && a.me.hotbars[0].join() === hb0, 'gán kỹ năng ghi vào đúng bộ đang dùng');
    a.send('hotbar', { i: 1, sid: 'k2' });
    await a.wait('me', (m) => m.hotbar[1] === 'k2');
    ok(a.me.hotbar[0] === 'k1', 'gán kỹ năng đã có trong bộ thì hoán đổi ô');
    await sleep(320);
    a.send('hotbarSet', { n: 0 });
    await a.wait('me', (m) => m.hbi === 0);
    ok(a.me.hotbar.join() === hb0, 'quay về bộ 0 giữ nguyên thanh cũ');
    await sleep(320);
    a.send('hotbarSet', { n: 1 });
    await a.wait('me', (m) => m.hbi === 1);
    a.send('chat', { ch: 'map', msg: '/item stone1 10' });
    a.send('chat', { ch: 'map', msg: '/xu 100000' });
    const homeSlot = a.inv.inv.findIndex((it) => it && it.id === 'scroll_home');
    a.send('useItem', { slot: homeSlot });
    await a.wait('enterMap');
    ok(a.map === 'v_fire', 'dùng Cuộn Về Làng');
    await a.walkTo(620);
    a.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot: 'weapon' });
    const up = await a.wait('upgradeResult');
    ok(up.ok && up.plus === 1, 'cường hóa vũ khí lên +1');

    console.log('5. Nhiều người chơi: nhóm, chat, giao dịch');
    const b = new Bot('B');
    await b.connect();
    b.send('register', { u: 'bot_two', p: 'secret123' });
    await b.wait('chars');
    b.send('createChar', { name: 'CungThu', cls: 'cung', gender: 'f' });
    await b.wait('chars');
    b.send('selectChar', { name: 'CungThu' });
    await b.wait('enterMap');
    ok(b.map === 'v_water', 'người chơi B vào Làng Thủy Nguyệt');
    await b.walkTo(1030);
    b.send('npc', { id: 'v_water_tele' });
    await b.wait('dialog');
    b.send('npcAct', { id: 'v_water_tele', a: 'go:v_fire' });
    await b.wait('enterMap');
    ok(b.map === 'v_fire', 'B dịch chuyển miễn phí sang Làng Hỏa Vân');
    const joined = await a.wait('pJoin', (m) => m.name === 'CungThu').catch(() => null);
    ok(!!joined || a.msgs.some((m) => m.t === 'pJoin' && m.name === 'CungThu'), 'A thấy B xuất hiện');
    a.send('partyInvite', { name: 'CungThu' });
    await b.wait('invite', (m) => m.kind === 'party');
    b.send('partyAccept', { from: 'KiemSi' });
    const party = await a.wait('party', (m) => m.members && m.members.length === 2);
    ok(party.members.length === 2, 'lập nhóm 2 người');
    ok(party.members.every((x) => x.mapId === 'v_fire' && x.map === 'Làng Hỏa Vân'), 'gói nhóm có mapId của từng thành viên');
    a.send('chat', { ch: 'party', msg: 'xin chao' });
    const pc = await b.wait('chat', (m) => m.ch === 'party' && m.msg === 'xin chao');
    ok(!!pc, 'chat nhóm');
    await sleep(900);
    a.send('chat', { ch: 'map', msg: 'hello map' });
    ok(!!(await b.wait('chat', (m) => m.ch === 'map' && m.msg === 'hello map')), 'chat bản đồ');

    b.send('chat', { ch: 'map', msg: '/lv 6' });
    await sleep(150);
    await b.walkTo(620);
    a.send('tradeReq', { name: 'CungThu' });
    await b.wait('invite', (m) => m.kind === 'trade');
    b.send('tradeAccept', { from: 'KiemSi' });
    await a.wait('trade');
    const potSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp1');
    a.send('tradeSet', { slots: [potSlot], xu: 500 });
    await b.wait('trade', (m) => m.theirs.xu === 500);
    a.send('tradeLock');
    b.send('tradeLock');
    await sleep(120);
    a.send('tradeOk');
    b.send('tradeOk');
    await b.wait('tradeEnd');
    await sleep(150);
    ok(b.me.xu === 1500 && b.inv.inv.some((it) => it && it.id === 'hp1' && it.q >= 15), 'giao dịch xu + vật phẩm thành công');

    console.log('6. Điểm danh, vòng quay, thủ kho, bạn bè, hang động');
    a.send('checkin');
    ok(!!(await a.wait('notice', (m) => /Điểm danh ngày 1/.test(m.msg))), 'điểm danh ngày 1 nhận quà');
    a.send('checkin');
    ok(!!(await a.wait('notice', (m) => /đã điểm danh/.test(m.msg))), 'không cho điểm danh 2 lần/ngày');
    a.send('spin', { cur: 'xu' });
    const sp = await a.wait('spinResult');
    ok(sp.idx >= 0 && !!sp.label, `vòng quay trả thưởng: ${sp.label}`);
    await a.walkTo(1320);
    a.send('npc', { id: 'v_fire_storage' });
    await a.wait('storage');
    const sSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp2');
    a.send('storePut', { npc: 'v_fire_storage', slot: sSlot });
    const st1 = await a.wait('storage');
    await sleep(120);
    ok(st1.items.some((it) => it && it.id === 'hp2') && !a.inv.inv[sSlot], 'cất bình HP vào kho');
    const kSlot = st1.items.findIndex((it) => it && it.id === 'hp2');
    a.send('storeTake', { npc: 'v_fire_storage', slot: kSlot });
    const st2 = await a.wait('storage');
    ok(!st2.items[kSlot], 'lấy lại từ kho');
    a.send('friendAdd', { name: 'CungThu' });
    await b.wait('invite', (m) => m.kind === 'friend');
    b.send('friendAccept', { from: 'KiemSi' });
    const fl = await a.wait('friends');
    ok(fl.list.length === 1 && fl.list[0].name === 'CungThu' && fl.list[0].online, 'kết bạn thành công');
    await a.walkTo(190);
    a.send('npc', { id: 'v_fire_dungeon' });
    const dd = await a.wait('dialog');
    ok(dd.opts.some((o) => o.a === 'enter'), 'Hộ Pháp cho vào Hang Động');
    a.send('npcAct', { id: 'v_fire_dungeon', a: 'enter' });
    await a.wait('enterMap');
    ok(a.map === 'dungeon', 'vào phó bản Hang Động (B cấp thấp bị loại)');
    ok(!!(await b.wait('party', (m) => m.members.some((x) => x.name === 'KiemSi' && x.mapId === 'dungeon')).catch(() => null)),
      'đồng đội nhận cập nhật nhóm khi thành viên đổi bản đồ');
    const wave = await a.wait('dungeon', (m) => m.wave === 1, 7000);
    ok(wave.waves === 5 && a.monsters.size > 0, `đợt 1 xuất hiện ${a.monsters.size} quái`);
    await a.walkTo(20);
    a.send('portal', { i: 0 });
    await a.wait('enterMap');
    ok(a.map === 'v_fire', 'rời hang động về làng');
    a.send('npc', { id: 'v_fire_dungeon' });
    await a.walkTo(190);
    a.send('npc', { id: 'v_fire_dungeon' });
    const dd2 = await a.wait('dialog');
    ok(/còn lại hôm nay: 2\/3/.test(dd2.text), 'trừ 1 lượt vào hang');

    console.log('7. Nội dung hậu kỳ: cấp 120, tuyệt kỹ, thú cưng, đồ ăn, bản đồ mới');
    a.send('chat', { ch: 'map', msg: '/lv 120' });
    await a.wait('chat', (m) => /Cấp hiện tại: 120/.test(m.msg));
    await sleep(120);
    ok(a.me.level === 120, 'đạt cấp tối đa 120');
    a.send('learnSkill', { sid: 'k6' });
    await sleep(150);
    ok(a.me.skills.k6 === 1, 'học tuyệt kỹ cấp 60 Hỏa Long Thần Kiếm');
    ok(a.me.hbi === 1 && a.me.hotbar.includes('k6') && !a.me.hotbars[0].includes('k6'), 'kỹ năng mới tự gán vào bộ đang dùng');
    a.send('chat', { ch: 'map', msg: '/item pet_bunny 1' });
    a.send('chat', { ch: 'map', msg: '/item food_atk 1' });
    a.send('chat', { ch: 'map', msg: '/item w_kiem_11 1' });
    await sleep(250);
    const atk0 = a.me.s.atk;
    a.send('useItem', { slot: a.inv.inv.findIndex((it) => it && it.id === 'food_atk') });
    await sleep(150);
    ok(a.me.s.atk > atk0 && a.me.buffs.some((b) => b.k === 'food_atk'), 'đồ ăn tăng % tấn công');
    a.send('equip', { slot: a.inv.inv.findIndex((it) => it && it.id === 'pet_bunny') });
    await sleep(150);
    ok(a.inv.equip.pet && a.me.s.expMul >= 1.08 && a.me.look.pet === 'bunny', 'trang bị thú cưng tăng EXP');
    a.send('equip', { slot: a.inv.inv.findIndex((it) => it && it.id === 'w_kiem_11') });
    await sleep(150);
    ok(a.inv.equip.weapon.id === 'w_kiem_11', 'mặc vũ khí bậc Thánh cấp 110');
    a.send('chat', { ch: 'map', msg: '/plus 11' });
    ok(!!(await a.wait('chat', (m) => /Vũ khí \+11/.test(m.msg))), 'lệnh admin /plus đặt cấp cường hóa vũ khí');

    console.log('7b. Kỹ năng nội tại & sách kỹ năng');
    const D = a.data;
    ok(D.skills.k7.type === 'passive' && D.skills.k7.book === 'book_k7' && D.items.book_k7.type === 'book' && D.items.book_k7.skill === 'k7'
      && D.passiveStats.hpPct, 'dữ liệu tĩnh có kỹ năng nội tại, sách và nhãn chỉ số');
    ok(D.monsters.boss_god.drops.some(([id]) => id === 'book_k9') && D.monsters.boss_slime.drops.some(([id]) => id === 'book_c7'), 'boss rơi sách nội tại');
    a.send('chat', { ch: 'map', msg: '/item book_k7 2' });
    a.send('chat', { ch: 'map', msg: '/item book_c7 1' });
    await sleep(250);
    const bookAt = (id) => a.inv.inv.findIndex((it) => it && it.id === id);
    const hp0 = a.me.s.maxHp;
    a.send('learnSkill', { sid: 'k7' });
    ok(!!(await a.wait('notice', (m) => /Cần đọc Sách Luyện Thể Quyết/.test(m.msg))) && !a.me.skills.k7, 'chưa đọc sách thì không học nội tại bằng điểm kỹ năng');
    a.send('useItem', { slot: bookAt('book_c7') });
    ok(!!(await a.wait('notice', (m) => /Chỉ phái Cung/.test(m.msg))) && bookAt('book_c7') >= 0 && !a.me.skills.c7, 'không đọc được sách phái khác (sách còn nguyên)');
    a.send('useItem', { slot: bookAt('book_k7') });
    await a.wait('notice', (m) => /lĩnh hội kỹ năng nội tại Luyện Thể Quyết/.test(m.msg));
    await a.wait('me', (m) => m.skills.k7 === 1);
    await sleep(100);
    ok(a.inv.inv[bookAt('book_k7')].q === 1, 'đọc sách học Luyện Thể Quyết cấp 1, tiêu hao 1 cuốn');
    ok(Math.abs(a.me.s.maxHp - Math.round(hp0 * 1.04)) <= 1, `nội tại +4% sinh lực tối đa (${hp0} → ${a.me.s.maxHp})`);
    a.send('useItem', { slot: bookAt('book_k7') });
    ok(!!(await a.wait('notice', (m) => /Đã học Luyện Thể Quyết/.test(m.msg))) && bookAt('book_k7') >= 0, 'đọc lại sách đã học: báo đã học, không mất sách');
    const sp0 = a.me.skillPoints;
    a.send('learnSkill', { sid: 'k7' });
    await a.wait('me', (m) => m.skills.k7 === 2);
    ok(a.me.skillPoints === sp0 - 1 && Math.abs(a.me.s.maxHp - Math.round(hp0 * 1.048)) <= 1, 'nâng nội tại bằng điểm kỹ năng: cấp 2, +4.8% sinh lực');
    const bars = JSON.stringify(a.me.hotbars);
    const mp0 = a.me.mp;
    a.send('hotbar', { i: 2, sid: 'k7' });
    a.send('skill', { sid: 'k7', dir: 1 });
    await sleep(300);
    ok(JSON.stringify(a.me.hotbars) === bars && !a.me.hotbars.some((hb) => hb.includes('k7')), 'không gán được nội tại vào thanh kỹ năng');
    ok(!a.msgs.slice(a.sendIdx).some((m) => m.t === 'fx' && m.sid === 'k7') && a.me.mp === mp0, 'không dùng được nội tại bằng lệnh skill');
    await a.walkTo(470);
    a.send('npc', { id: 'v_fire_potion' });
    const shopB = await a.wait('shop');
    ok(shopB.items.some((x) => x.id === 'book_k9' && x.cur === 'luong' && x.price === 100) && !shopB.items.some((x) => x.id === 'book_c7'),
      'Tiệm Thuốc bán sách nội tại của đúng phái bằng lượng');
    a.send('chat', { ch: 'map', msg: '/luong 200' });
    await sleep(150);
    const l0 = a.me.luong;
    a.send('buy', { npc: 'v_fire_potion', id: 'book_c9', qty: 1 });
    a.send('buy', { npc: 'v_fire_potion', id: 'book_k9', qty: 1 });
    await a.wait('notice', (m) => /Đã mua Sách Bạo Viêm Kiếm Ý/.test(m.msg));
    await sleep(150);
    ok(a.me.luong === l0 - 100 && bookAt('book_c9') < 0, 'mua sách trừ 100 lượng, sách phái khác không mua được');
    const cd0 = a.me.s.critDmg;
    a.send('useItem', { slot: bookAt('book_k9') });
    await a.wait('me', (m) => m.skills.k9 === 1);
    ok(cd0 === 160 && a.me.s.critDmg === 170, 'Bạo Viêm Kiếm Ý: sát thương chí mạng 160% → 170%');

    a.send('chat', { ch: 'map', msg: '/tp dragon_palace' });
    await a.wait('enterMap');
    ok(a.map === 'dragon_palace' && [...a.monsters.values()].some((m) => m.k === 'seaserpent'), 'Long Cung có quái cấp 114-120');

    a.send('chat', { ch: 'map', msg: '/xu 600000' });
    a.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await a.wait('enterMap');
    await a.walkTo(1180);
    a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'NinjaTest' });
    const cl0 = await a.wait('clan');
    ok(cl0 && cl0.name === 'NinjaTest' && cl0.level === 1, 'lập gia tộc cấp 1');
    const mul0 = a.me.s.expMul;
    a.send('clanDonate', { xu: 500000 });
    const cl1 = await a.wait('clan');
    await sleep(150);
    ok(cl1.level === 2 && cl1.max === 30 && a.me.s.expMul > mul0, 'góp quỹ: gia tộc lên cấp 2, tăng chỗ và % EXP');

    console.log('7c. Nội tại: chặn đọc sách, hồi chakra, bán/mua sách');
    b.ws.close();
    await sleep(300);
    const f = new Bot('F');
    await f.connect();
    f.send('login', { u: 'bot_two', p: 'secret123' });
    await f.wait('chars');
    f.send('createChar', { name: 'KunaiNin', cls: 'kunai', gender: 'm' });
    await f.wait('chars', (m) => m.chars.some((x) => x.name === 'KunaiNin'));
    f.send('selectChar', { name: 'KunaiNin' });
    await Promise.all([f.wait('enterMap'), f.wait('inv')]);
    const fBook = () => f.inv.inv.findIndex((it) => it && it.id === 'book_n7');
    f.send('chat', { ch: 'map', msg: '/item book_n7 1' });
    await f.wait('inv', (m) => m.inv.some((it) => it && it.id === 'book_n7'));
    f.send('useItem', { slot: fBook() });
    ok(!!(await f.wait('notice', (m) => /Cần đạt cấp 15/.test(m.msg))) && fBook() >= 0 && !f.me.skills.n7, 'chưa đủ cấp thì không đọc được sách (sách còn nguyên)');
    f.send('chat', { ch: 'map', msg: '/lv 15' });
    await f.wait('me', (m) => m.level === 15);
    f.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await f.wait('enterMap');
    await f.walkTo(a.x);
    f.send('tradeReq', { name: 'KiemSi' });
    await a.wait('invite', (m) => m.kind === 'trade' && m.from === 'KunaiNin');
    a.send('tradeAccept', { from: 'KunaiNin' });
    await f.wait('trade');
    f.send('useItem', { slot: fBook() });
    ok(!!(await f.wait('notice', (m) => /Đang giao dịch/.test(m.msg))) && fBook() >= 0 && !f.me.skills.n7, 'đang giao dịch thì không đọc được sách (sách còn nguyên)');
    f.send('tradeCancel');
    await f.wait('tradeEnd');
    f.send('useItem', { slot: fBook() });
    await Promise.all([f.wait('me', (m) => m.skills.n7 === 1), f.wait('inv', (m) => !m.inv.some((it) => it && it.id === 'book_n7'))]);
    ok(f.me.s.mpRegen === 2 && fBook() < 0, `đọc Thủy Nguyên Quyết: hồi ${f.me.s.mpRegen} chakra/giây, tiêu hao sách`);
    // Đánh trúng quái để đang giao chiến (tắt hồi phục tự nhiên 6 giây), chỉ còn nội tại hồi chakra
    f.send('chat', { ch: 'map', msg: '/tp fire_field' });
    await f.wait('enterMap');
    let mpHit = null;
    for (let i = 0; i < 8 && mpHit == null; i++) {
      const tg = [...f.monsters.values()].filter((m) => m.y === 300).sort((p, q) => Math.abs(p.x - f.x) - Math.abs(q.x - f.x))[0];
      if (!tg) break;
      await f.walkTo(tg.x - 20);
      f.send('move', { x: f.x, y: 300, dir: 1, st: 0 });
      f.send('skill', { sid: 'n1', tid: `m${tg.id}`, dir: 1 });
      const hit = await f.wait('hit', (m) => m.a === `p${f.me.id}`, 600).catch(() => null);
      if (hit) mpHit = (await f.wait('me', (m) => m.mp < m.s.maxMp)).mp;
      else await sleep(2600);
    }
    await sleep(2300);
    const gain = mpHit == null ? -1 : f.me.mp - mpHit;
    ok(gain >= 4 && gain <= 6, `nội tại hồi chakra mỗi giây khi đang giao chiến (+${gain} sau ~2.3 giây)`);
    f.ws.close();

    await a.walkTo(470);
    a.send('npc', { id: 'v_fire_potion' });
    await a.wait('shop');
    const xuS = a.me.xu;
    a.send('sell', { npc: 'v_fire_potion', slot: bookAt('book_k7'), qty: 1 });
    ok(!!(await a.wait('notice', (m) => /Đã bán Sách Luyện Thể Quyết được 750 xu/.test(m.msg))), 'bán sách cấp 15 được 750 xu (cấp yêu cầu · 50)');
    await sleep(150);
    ok(a.me.xu === xuS + 750 && bookAt('book_k7') < 0, 'xu cộng đúng, sách đã bán khỏi hành trang');
    const lS = a.me.luong;
    a.send('buy', { npc: 'v_fire_potion', id: 'book_k8', qty: 10 });
    await a.wait('notice', (m) => /Đã mua Sách Liệt Hỏa Tâm Pháp/.test(m.msg));
    await sleep(150);
    ok(a.me.luong === lS - 60 && a.inv.inv[bookAt('book_k8')].q === 1, 'mua sách luôn chỉ 1 cuốn dù gửi số lượng 10');
    a.send('chat', { ch: 'map', msg: '/item hp1 3' });
    a.send('chat', { ch: 'map', msg: '/item w_kunai_1 1' });
    a.send('chat', { ch: 'map', msg: '/item food_atk 1' });
    await sleep(250);
    a.send('sortInv');
    await a.wait('inv');
    const order = a.inv.inv.filter(Boolean).map((it) => a.data.items[it.id].type);
    const rankT = ['equip', 'potion', 'food', 'petfood', 'scroll', 'book', 'stone', 'gem', 'chest', 'event', 'misc', 'quest'];
    ok(order.every((t, i) => !i || rankT.indexOf(order[i - 1]) <= rankT.indexOf(t)) && order.includes('book') && order[0] === 'equip',
      `sắp xếp hành trang theo loại, sách đứng sau trang bị (${[...new Set(order)].join(',')})`);

    await airTest(a);
    await bossEventTest(a);
    await fashionTest(a);
    await gemTest(a);
    await petTest(a);
    await mailTest(a, b);
    await arenaTest();

    console.log('8. Lưu dữ liệu');
    a.ws.close();
    await sleep(300);
    const c = new Bot('C');
    await c.connect();
    c.send('login', { u: 'botadmin', token: auth.token });
    const ch2 = await c.wait('chars');
    ok(ch2.chars[0].level === 120, 'đăng nhập lại bằng token, dữ liệu được giữ');
    c.send('selectChar', { name: 'KiemSi' });
    await Promise.all([c.wait('enterMap'), c.wait('inv')]);
    ok(c.inv.equip.weapon.id === 'w_kiem_11' && c.inv.equip.pet && c.inv.equip.pet.id === 'pet_bunny', 'trang bị & thú cưng vẫn còn sau khi đăng nhập lại');
    ok(c.inv.equip.pet.plv === 12 && c.inv.equip.pet.love === 70 && c.me.look.pl === 12, 'cấp và thân mật của thú được lưu trên món đồ qua đăng nhập lại');
    ok(c.me.buffs.some((b) => b.k === 'food_atk'), 'buff đồ ăn được giữ qua đăng nhập lại');
    ok(c.me.hbi === 1 && c.me.hotbars[1].join() === a.me.hotbars[1].join(), 'bộ kỹ năng đang dùng được giữ qua đăng nhập lại');
    ok(c.me.skills.k7 === 2 && c.me.skills.k9 === 1 && c.me.s.critDmg === 170, 'kỹ năng nội tại và chỉ số được giữ qua đăng nhập lại');
    ok(c.inv.equip.weapon.gems && c.inv.equip.weapon.gems[0] === 'gem_loi_2' && c.me.s.crit === a.me.s.crit, 'ngọc khảm trên vũ khí và chỉ số được giữ qua đăng nhập lại');
    c.ws.close();
    b.ws.close();
  } catch (e) {
    failures++;
    console.error('  ✘ Lỗi:', e.message);
    if (process.env.DEBUG) for (const bot of [global.botA].filter(Boolean)) console.log(bot.msgs.filter((m) => !['state'].includes(m.t)).slice(-8).map((m) => JSON.stringify(m).slice(0, 160)).join('\n'));
  }
  srv.kill('SIGTERM');
  await sleep(400);
  const files = fs.readdirSync(DATA);
  ok(files.includes('characters.json'), 'ghi file dữ liệu khi tắt server');
  if (files.includes('characters.json')) await reloadTest();
  if (/Error|Lỗi xử lý/.test(log)) {
    console.log(log);
    ok(false, 'server không có lỗi trong log');
  }
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(failures ? `\nTHẤT BẠI: ${failures} kiểm tra lỗi` : '\nTẤT CẢ KIỂM TRA ĐỀU ĐẠT');
  process.exit(failures ? 1 : 0);
}

// Hộp thư (gửi người offline, túi đầy), giftcode (1 lần, chống dò mã), đổi quà lễ hội qua WebSocket thật
async function mailTest(a, b) {
  console.log('7i. Hộp thư, giftcode, lễ hội');
  const say = (bot, msg, re) => {
    bot.send('chat', { ch: 'map', msg });
    return bot.wait('chat', (m) => m.ch === 'sys' && re.test(m.msg));
  };
  const cakes = (bot) => bot.inv.inv.filter((it) => it && it.id === 'banh_trungthu').reduce((n, it) => n + it.q, 0);
  b.ws.close();
  await sleep(300);
  const s1 = await say(a, '/mail CungThu 1234 3 stone3 5', /Đã gửi thư|Không tìm thấy/);
  ok(/đang offline/.test(s1.msg) && /Đá Cường Hóa/.test(s1.msg), 'admin /mail gửi quà cho người đang offline');
  ok(!!(await say(a, '/mail KhongCo 10 0', /Không tìm thấy/)), '/mail: báo không tìm thấy nhân vật');
  ok(!!(await say(a, '/mail CungThu 10 0 __proto__ 1', /Không có vật phẩm/)), '/mail: từ chối mã vật phẩm lạ');
  const b2 = new Bot('B2');
  await b2.connect();
  b2.send('login', { u: 'bot_two', p: 'secret123' });
  await b2.wait('chars');
  b2.send('selectChar', { name: 'CungThu' });
  await Promise.all([b2.wait('enterMap'), b2.wait('inv')]);
  const hint = await b2.wait('notice', (m) => /thư chứa quà/.test(m.msg)).catch(() => null);
  await sleep(150);
  ok(!!hint && b2.me.mail && b2.me.mail.g === 1, 'vào game: báo có thư quà chưa nhận, gói me có số thư (chấm đỏ nút Thư)');
  b2.send('mailList');
  let ml = await b2.wait('mail');
  const m1 = ml.list[0];
  ok(ml.max === 30 && m1.xu === 1234 && m1.luong === 3 && m1.items[0].id === 'stone3' && m1.items[0].q === 5 && !m1.read, 'người offline nhận được thư: xu, lượng, vật phẩm đính kèm');
  const free = b2.inv.inv.filter((x) => !x).length;
  b2.send('chat', { ch: 'map', msg: `/item w_kunai_1 ${free}` });
  await b2.wait('inv', (m) => m.inv.every(Boolean));
  const xu0 = b2.me.xu;
  b2.send('mailClaim', { id: m1.id });
  ok(!!(await b2.wait('notice', (m) => /không đủ chỗ/.test(m.msg))), 'hành trang đầy: từ chối nhận quà');
  ml = await b2.wait('mail');
  ok(ml.list[0].got === false && b2.me.xu === xu0, 'thư vẫn giữ quà, không cộng xu');
  b2.send('mailDel', { id: m1.id });
  ok(!!(await b2.wait('notice', (m) => /trước khi xóa/.test(m.msg))), 'không cho xóa thư còn quà');
  b2.send('discard', { slot: b2.inv.inv.findIndex((it) => it.id === 'w_kunai_1') });
  await b2.wait('inv', (m) => !m.inv.every(Boolean));
  await sleep(200);
  b2.send('mailClaim', { id: m1.id });
  await b2.wait('notice', (m) => /Đã nhận quà/.test(m.msg));
  ml = await b2.wait('mail');
  await sleep(150);
  ok(ml.list[0].got && b2.me.xu === xu0 + 1234 && b2.inv.inv.some((it) => it && it.id === 'stone3' && it.q === 5) && b2.me.mail.g === 0,
    'dọn 1 ô: nhận đủ 1.234 xu, 3 lượng, 5 đá; hết chấm đỏ quà');

  // Giftcode: admin tạo mã tạm, mỗi nhân vật 1 lần, túi đầy thì quà vào hộp thư
  ok(!!(await say(a, '/code QUATEST1 1000 2 hp2 30 1', /Đã tạo giftcode QUATEST1/)), 'admin /code tạo giftcode tạm thời');
  b2.send('giftcode', { code: ' qua-test1 ' });
  const g1 = await b2.wait('codeResult');
  ok(g1.ok && g1.mail && /hộp thư/.test(g1.msg), 'nhập mã (chữ thường, có gạch nối) thành công; hành trang đầy nên quà vào hộp thư');
  await sleep(450);
  b2.send('giftcode', { code: 'QUATEST1' });
  ok(/đã dùng/.test((await b2.wait('codeResult')).msg), 'mỗi nhân vật chỉ dùng mỗi mã 1 lần');
  ok(!!(await say(a, '/code QUATEST2 100 0', /Đã tạo giftcode QUATEST2/)), 'tạo thêm mã thứ hai');
  let last = null;
  for (let i = 0; i < 5; i++) {
    await sleep(450);
    b2.send('giftcode', { code: `SAIMA${i}X` });
    last = await b2.wait('codeResult');
  }
  ok(!last.ok && /Tạm khóa/.test(last.msg), 'nhập sai 5 lần trong 1 phút: tạm khóa nhập mã');
  await sleep(450);
  b2.send('giftcode', { code: 'QUATEST2' });
  const g2 = await b2.wait('codeResult');
  ok(!g2.ok && g2.wait > 0 && /quá nhiều lần/.test(g2.msg), 'đang bị khóa: mã đúng cũng bị từ chối (chống dò mã)');
  ok(!!(await say(a, '/code', /QUATEST1 .*đã dùng 1/)) && !!(await say(a, '/code xoa QUATEST1', /Đã xóa giftcode QUATEST1/)), '/code liệt kê (số lượt đã dùng) và xóa mã tạm');
  b2.send('mailList');
  ml = await b2.wait('mail');
  const gm = ml.list.find((m) => /QUATEST1/.test(m.title));
  ok(!!gm && gm.xu === 1000 && gm.luong === 2 && gm.items[0].id === 'hp2' && gm.items[0].q === 30, 'thư giftcode có đủ quà');
  for (const it of b2.inv.inv.filter((x) => x && x.id === 'w_kunai_1').slice(0, 2)) {
    b2.send('discard', { slot: b2.inv.inv.indexOf(it) });
    await sleep(80);
  }
  await sleep(250);
  const xu1 = b2.me.xu;
  const l1 = b2.me.luong;
  b2.send('mailClaimAll');
  await b2.wait('notice', (m) => /Đã nhận quà từ 1 thư/.test(m.msg));
  await sleep(200);
  ok(b2.me.xu === xu1 + 1000 && b2.me.luong === l1 + 2 && b2.inv.inv.some((it) => it && it.id === 'hp2'), 'nhận tất cả: lấy quà mọi thư còn quà');
  b2.send('mailDelRead');
  ml = await b2.wait('mail');
  ok(ml.list.length === 0 && b2.me.mail.n === 0, 'xóa thư đã đọc: hộp thư trống');
  b2.ws.close();

  // Giftcode tính theo tài khoản: xóa nhân vật rồi tạo lại cùng tên không nhập lại được
  const b3 = new Bot('B3');
  await b3.connect();
  b3.send('register', { u: 'bot_code', p: 'secret123' });
  await b3.wait('chars');
  const mkChar = async () => {
    b3.send('createChar', { name: 'MaQua', cls: 'kiem', gender: 'm' });
    await b3.wait('chars', (m) => m.chars.some((c) => c.name === 'MaQua'));
    b3.send('selectChar', { name: 'MaQua' });
    await b3.wait('enterMap');
  };
  await mkChar();
  b3.send('giftcode', { code: 'NINJAMOI' });
  ok((await b3.wait('codeResult')).ok, 'nhân vật mới nhập mã NINJAMOI');
  b3.send('logoutChar');
  ok(!!(await b3.wait('chars').catch(() => null)), 'Đổi nhân vật khi đang trong game: về màn chọn nhân vật');
  b3.send('deleteChar', { name: 'MaQua', confirm: 'MaQua' });
  await b3.wait('chars', (m) => !m.chars.length);
  await mkChar();
  await sleep(450);
  b3.send('giftcode', { code: 'NINJAMOI' });
  const g3 = await b3.wait('codeResult');
  ok(!g3.ok && /Tài khoản này đã dùng/.test(g3.msg), 'xóa nhân vật rồi tạo lại cùng tên: mã tài khoản đã dùng vẫn bị chặn');
  b3.ws.close();

  // IP sau proxy: lấy phần tử cuối X-Forwarded-For (phần đầu máy khách tự ghi), giới hạn tạo tài khoản mỗi IP mỗi giờ
  const reg = async (xff, u) => {
    const bt = new Bot('R');
    await bt.connect({ 'X-Forwarded-For': xff });
    bt.send('register', { u, p: 'secret123' });
    const r = await Promise.race([bt.wait('chars').then(() => true).catch(() => null), bt.wait('err').then((m) => m.msg).catch(() => null)]);
    bt.ws.close();
    return r;
  };
  let regOk = 0;
  for (let i = 0; i < 10; i++) if ((await reg(`1.1.1.${i}, 7.7.7.7`, `regip_${i}`)) === true) regOk++;
  const r11 = await reg('2.2.2.2, 7.7.7.7', 'regip_x');
  ok(regOk === 10 && /quá nhiều tài khoản/.test(r11), 'cùng IP (phần tử cuối X-Forwarded-For) tạo quá 10 tài khoản/giờ: từ chối; đổi phần đầu không lách được');
  ok((await reg('7.7.7.7, 8.8.8.8', 'regip_y')) === true, 'IP khác vẫn tạo được tài khoản');

  // Lễ hội: ép bật mùa (không phụ thuộc ngày chạy kiểm thử), đổi quà ở Sứ Giả Lễ Hội
  const sid = a.data.seasons[0].id;
  ok(Array.isArray(a.data.seasons) && a.data.seasons[0].exchange.length > 0 && a.data.mail.max === 30, 'gói dữ liệu có bảng sự kiện theo mùa và giới hạn hộp thư');
  ok(!!(await say(a, `/sukien ${sid}`, /Lễ hội đang chạy/)), 'admin /sukien ép bật lễ hội');
  ok(!!(await a.wait('season', (m) => m.id === sid).catch(() => null)) || a.msgs.some((m) => m.t === 'season' && m.id === sid), 'báo mọi người lễ hội bắt đầu (gói season)');
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap');
  a.send('chat', { ch: 'map', msg: '/item banh_trungthu 600' });
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'banh_trungthu'));
  await a.walkTo(1420);
  a.send('npc', { id: 'v_fire_event' });
  const ed = await a.wait('dialog');
  ok(/Trăng Rằm/.test(ed.text) && ed.opts.some((o) => o.a === 'shop'), 'Sứ Giả Lễ Hội: lời chào mùa hội + nút đổi quà');
  a.send('npcAct', { id: 'v_fire_event', a: 'shop' });
  ok(!!(await a.wait('openUi', (m) => m.ui === 'event')), 'mở cửa sổ đổi quà lễ hội');
  const c0 = cakes(a);
  const xa = a.me.xu;
  a.send('seasonEx', { npc: 'v_fire_event', id: 'xu', n: 2 });
  let sr = await a.wait('seasonResult');
  await sleep(150);
  ok(sr.ok && a.me.xu === xa + 12000 && cakes(a) === c0 - 10, 'đổi 2 lần 5 bánh lấy 6.000 xu');
  const la = a.me.luong;
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: 'luong', n: 50 });
  sr = await a.wait('seasonResult');
  await sleep(150);
  ok(sr.ok && a.me.luong === la + 50 && sr.season.ex.luong === 10 && cakes(a) === c0 - 410, 'món có giới hạn: xin 50 lần chỉ đổi đủ 10 lượt');
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: 'luong' });
  ok(/hết lượt/.test((await a.wait('seasonResult')).msg), 'hết lượt đổi trong mùa: từ chối');
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: 'crane' });
  ok(/Không đủ/.test((await a.wait('seasonResult')).msg) && cakes(a) === c0 - 410, 'thiếu bánh: từ chối, không trừ bánh');
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: '__proto__' });
  a.send('seasonEx', { npc: 'v_fire_event', id: 'constructor', n: 'abc' });
  ok(!(await a.wait('seasonResult', null, 600).catch(() => null)), 'mã quà lạ (__proto__, constructor): bỏ qua');
  await a.walkTo(900);
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: 'xu' });
  ok(/tới gần/.test((await a.wait('seasonResult')).msg), 'đứng xa Sứ Giả Lễ Hội: không đổi được');
  ok(!!(await say(a, '/sukien tat', /Không có lễ hội/)), 'admin /sukien tat: tắt lễ hội');
  ok(!!(await a.wait('season', (m) => m.id === null).catch(() => null)) || a.msgs.some((m) => m.t === 'season' && m.id === null), 'báo mọi người lễ hội kết thúc (ẩn biểu ngữ)');
  await a.walkTo(1420);
  await sleep(250);
  a.send('seasonEx', { npc: 'v_fire_event', id: 'xu' });
  ok(/kết thúc/.test((await a.wait('seasonResult')).msg), 'hết mùa: không đổi quà được nữa');
  a.send('npc', { id: 'v_fire_event' });
  ok(/khép lại/.test((await a.wait('dialog')).text), 'hết mùa: Sứ Giả Lễ Hội chỉ chào hỏi');
  ok(!(await say(a, '/sukien xyz', /Mùa lễ hội:/)).msg.includes('__proto__'), '/sukien mã sai: liệt kê mã mùa hợp lệ');
}

// Lôi đài xếp hạng qua WebSocket thật: hàng chờ, ghép cặp, phòng riêng, đếm ngược, thắng bằng hạ gục,
// Elo tổng không đổi, rời trận / mất kết nối = thua, giới hạn trận tính điểm mỗi cặp, thưởng tuần qua hộp thư
async function arenaTest() {
  console.log('7j. Lôi đài xếp hạng');
  const say = (bot, msg, re) => {
    bot.send('chat', { ch: 'map', msg });
    return bot.wait('chat', (m) => m.ch === 'sys' && re.test(m.msg));
  };
  const login = async (u, name, create, cls = 'kiem') => {
    const bot = new Bot(name);
    await bot.connect();
    bot.send(create ? 'register' : 'login', { u, p: 'secret123' });
    await bot.wait('auth');
    await bot.wait('chars');
    if (create) {
      bot.send('createChar', { name, cls, gender: 'm' });
      await bot.wait('chars');
    }
    bot.send('selectChar', { name });
    await Promise.all([bot.wait('enterMap'), bot.wait('inv')]);
    return bot;
  };
  // A phái Tiêu: Song Tiêu đánh 2 đòn (kiểm tra đòn thứ hai sau khi đã hạ gục không đánh tiếp)
  let x = await login('lodai_a', 'LoiDaiA', true, 'tieu');
  const y = await login('lodai_b', 'LoiDaiB', true);
  const D = x.data;
  ok(D.arena && D.arena.minLv === 20 && D.maps.loidai && D.maps.loidai.arena && D.maps.loidai.instance && D.maps.loidai.portals.length === 0
    && D.maps.arena.npcs.some((n) => n.type === 'arena'), 'dữ liệu tĩnh: cấu hình lôi đài, bản đồ phòng đấu riêng, Võ Sư ở Đấu Trường');
  ok(x.me.arena && x.me.arena.elo === 1000 && x.me.arena.win === 0, 'nhân vật mới có 1.000 điểm lôi đài');
  y.send('arenaJoin');
  ok(!!(await y.wait('notice', (m) => /Cần đạt cấp 20/.test(m.msg)).catch(() => null)), 'dưới cấp 20: không đăng ký được');
  await say(x, '/lv 120', /Cấp hiện tại/);
  // A cầm Phi Tiêu bậc cao nhất +16: một đòn là hạ gục B, nên đòn thứ hai của Song Tiêu phải bị chặn
  await say(x, '/item w_tieu_11 1 3', /Đã thêm vật phẩm/);
  const wInv = await x.wait('inv');
  x.send('useItem', { slot: wInv.inv.findIndex((it) => it && it.id === 'w_tieu_11') });
  await x.wait('inv');
  await say(x, '/plus 16', /Vũ khí \+/);
  await say(y, '/lv 20', /Cấp hiện tại/);
  await y.wait('me', (m) => m.level === 20);
  x.send('chat', { ch: 'map', msg: '/tp arena' });
  await x.wait('enterMap', (m) => m.map === 'arena');
  x.send('npc', { id: 'arena_master' });
  const dlg = await x.wait('dialog');
  ok(dlg.opts.some((o) => o.a === 'join') && /1\.000/.test(dlg.text), 'Võ Sư Lôi Đài: xem điểm, có nút đăng ký');
  x.send('npcAct', { id: 'arena_master', a: 'join' });
  const q = await x.wait('arena', (m) => m.st === 'queue');
  ok(q.n === 1, 'đăng ký qua NPC: vào hàng chờ');
  const yHp0 = y.me.hp;
  y.send('arenaJoin');
  const [px, py] = await Promise.all([x.wait('arena', (m) => m.st === 'prep', 4000), y.wait('arena', (m) => m.st === 'prep', 4000)]);
  await Promise.all([x.wait('enterMap', (m) => m.map === 'loidai'), y.wait('enterMap', (m) => m.map === 'loidai')]);
  ok(px.opp.name === 'LoiDaiB' && py.opp.name === 'LoiDaiA' && px.rated && px.left === 5000, 'ghép cặp ngay (cùng điểm), đếm ngược 5 giây');
  ok(x.me.hp === x.me.s.maxHp && x.me.mp === x.me.s.maxMp && y.me.hp === y.me.s.maxHp, 'vào phòng đấu: sinh lực, chakra hồi đầy');
  const yId = px.opp.id;
  // đếm ngược: chưa đánh được, không dùng bình thuốc
  await x.walkTo(y.x - 26);
  let from = x.msgs.length;
  x.send('skill', { sid: 't0', tid: `p${yId}`, dir: 1 });
  await sleep(300);
  ok(!x.msgs.slice(from).some((m) => m.t === 'hit' || m.t === 'fx'), 'đang đếm ngược: không ra chiêu được');
  y.send('useItem', { slot: y.inv.inv.findIndex((it) => it && it.id === 'hp1') });
  ok(!!(await y.wait('notice', (m) => /không cho dùng vật phẩm/.test(m.msg)).catch(() => null)), 'lôi đài không cho dùng bình thuốc');
  await x.wait('arena', (m) => m.st === 'fight', 7000);
  const yFrom = y.msgs.length;
  const xFrom = x.msgs.length;
  // Song Tiêu (2 đòn) ngay từ đầu: đòn 1 đã hạ gục thì đòn 2 không được đánh tiếp
  let rx = null;
  for (let i = 0; i < 40 && !rx; i++) {
    x.send('move', { x: x.x, y: 300, dir: 1, st: 0 });
    x.send('skill', { sid: i === 0 ? 't1' : 't0', tid: `p${yId}`, dir: 1 });
    rx = await x.wait('arenaResult', null, 600).catch(() => null);
  }
  const ry = await y.wait('arenaResult').catch(() => null);
  // gói 'me' gửi ở tick sau: chờ một chút rồi mới đọc sinh lực sau đòn kết liễu
  await sleep(200);
  const koHit = x.msgs.slice(xFrom).filter((m) => m.t === 'hit' && m.a === `p${py.opp.id}`).pop();
  const useT1 = !!koHit && koHit.sid === 't1' && !koHit.list[0][3];
  const yHps = y.msgs.slice(yFrom).filter((m) => m.t === 'me' && typeof m.hp === 'number').map((m) => m.hp);
  ok(useT1 && yHps.length && Math.min(...yHps) === 1, `bị hạ gục bằng chiêu 2 đòn: sinh lực dừng ở 1, đòn sau không đánh tiếp (thấp nhất ${Math.min(...yHps)})`);
  ok(rx && ry && rx.res === 'win' && ry.res === 'lose' && rx.reason === 'ko', `hạ gục đối thủ: thắng trận (${rx && rx.reason})`);
  ok(rx && ry && rx.d > 0 && rx.d === -ry.d && rx.elo + ry.elo === 2000 && rx.elo === 1000 + rx.d, `Elo: +${rx && rx.d} / ${ry && ry.d}, tổng điểm 2 bên không đổi`);
  ok(rx && ry && rx.xu === 3000 && rx.fame === 10 && ry.xu === 1000 && ry.fame === 3, 'thưởng trận: thắng 3.000 xu + 10 danh vọng, thua 1.000 xu + 3 danh vọng');
  await Promise.all([x.wait('enterMap', (m) => m.map === 'arena', 7000), y.wait('enterMap', (m) => m.map === 'v_fire', 7000)]);
  await sleep(150);
  ok(y.me.hp === Math.min(yHp0, y.me.s.maxHp) && y.me.arena.lose === 1 && x.me.arena.win === 1 && x.me.arena.fame === 10, `hết trận: về chỗ cũ, sinh lực trở lại như trước trận (${y.me.hp}/${yHp0}), thành tích lưu trên nhân vật (${y.me.arena.lose} thua, ${x.me.arena.win} thắng)`);

  // lời mời giao dịch / thách đấu gửi trước trận: vào phòng đấu rồi thì không nhận được nữa
  y.send('chat', { ch: 'map', msg: '/tp arena' });
  await y.wait('enterMap', (m) => m.map === 'arena');
  x.send('tradeReq', { name: 'LoiDaiB' });
  await y.wait('invite', (m) => m.kind === 'trade');
  x.send('duelReq', { name: 'LoiDaiB' });
  await y.wait('invite', (m) => m.kind === 'duel');
  // rời trận khi đã giao đấu = thua, người rời không có thưởng
  x.send('arenaJoin');
  await x.wait('arena', (m) => m.st === 'queue');
  y.send('arenaJoin');
  await Promise.all([x.wait('arena', (m) => m.st === 'prep'), y.wait('arena', (m) => m.st === 'prep')]);
  await y.wait('enterMap', (m) => m.map === 'loidai');
  y.send('tradeAccept', { from: 'LoiDaiA' });
  ok(!!(await y.wait('notice', (m) => /Không thể giao dịch trên lôi đài/.test(m.msg)).catch(() => null)), 'lời mời giao dịch gửi trước trận: không nhận được trong phòng đấu');
  y.send('duelAccept', { from: 'LoiDaiA' });
  ok(!!(await y.wait('notice', (m) => /Không thể bắt đầu thách đấu/.test(m.msg)).catch(() => null)) && !y.msgs.some((m) => m.t === 'trade' || (m.t === 'duel' && m.with)),
    'lời thách đấu gửi trước trận: không nhận được trong phòng đấu');
  // y (Kiếm) chém trúng x một đòn rồi mới rời: trận có giao đấu nên tính thua
  const hitOnce = async (bot, oid) => {
    await bot.wait('arena', (m) => m.st === 'fight', 7000);
    for (let i = 0; i < 30; i++) {
      bot.send('move', { x: bot.x, y: 300, dir: -1, st: 0 });
      bot.send('skill', { sid: 'k0', tid: `p${oid}`, dir: -1 });
      if (await bot.wait('hit', (m) => m.list.some((e) => e[0] === `p${oid}` && !e[3]), 500).catch(() => null)) return true;
    }
    return false;
  };
  await y.walkTo(x.x + 30);
  ok(await hitOnce(y, py.opp.id), 'trận 2: B đánh trúng A');
  y.send('arenaLeave');
  const [rx2, ry2] = await Promise.all([x.wait('arenaResult'), y.wait('arenaResult')]);
  ok(ry2.res === 'lose' && ry2.reason === 'leave' && ry2.quit && ry2.xu === 0 && rx2.res === 'win' && rx2.rated && !rx2.nc && rx2.elo + ry2.elo === 2000, 'rời trận: tính thua, không có thưởng; tổng Elo vẫn 2.000');
  ok(!!(await y.wait('enterMap', (m) => m.map === 'arena').catch(() => null)), 'người rời trận về ngay chỗ cũ');
  await x.wait('enterMap', (m) => m.map === 'arena', 7000);
  y.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await y.wait('enterMap', (m) => m.map === 'v_fire');

  // mất kết nối giữa trận = thua; vào lại game không kẹt trong phòng đấu (chỗ cũ là Đấu Trường, khu PK nên về làng như thường lệ)
  x.send('arenaJoin');
  await x.wait('arena', (m) => m.st === 'queue');
  y.send('arenaJoin');
  const [, p3y] = await Promise.all([x.wait('arena', (m) => m.st === 'prep'), y.wait('arena', (m) => m.st === 'prep')]);
  await Promise.all([x.wait('enterMap', (m) => m.map === 'loidai'), y.wait('enterMap', (m) => m.map === 'loidai')]);
  await y.walkTo(x.x + 30);
  ok(await hitOnce(y, p3y.opp.id), 'trận 3: B đánh trúng A');
  x.ws.close();
  const ry3 = await y.wait('arenaResult');
  ok(ry3.res === 'win' && ry3.reason === 'dc' && ry3.rated, 'đối thủ mất kết nối: mình thắng');
  await y.wait('enterMap', (m) => m.map === 'v_fire', 7000);
  x = await login('lodai_a', 'LoiDaiA', false);
  // vào lại game: server gửi trạng thái lôi đài (máy khách tự kết nối lại bỏ trạng thái cũ) và kết quả trận bị xử thua
  const [xs, xr] = await Promise.all([x.wait('arena').catch(() => null), x.wait('arenaResult').catch(() => null)]);
  ok(xs && xs.st === 'idle' && xr && xr.res === 'lose' && xr.reason === 'dc', 'vào lại game: nhận trạng thái rảnh và kết quả trận bị xử thua lúc mất kết nối');
  ok(x.map === 'v_fire' && x.me.arena.lose === 1 && x.me.arena.win === 2 && x.me.arena.elo + y.me.arena.elo === 2000,
    `vào lại game: về làng (${x.map}), không kẹt trong phòng đấu; trận mất kết nối tính thua (${x.me.arena.win}-${x.me.arena.lose}), tổng Elo ${x.me.arena.elo} + ${y.me.arena.elo}`);

  // cặp đã đấu đủ 3 trận tính điểm hôm nay: trận sau là giao hữu (không đổi điểm)
  x.send('arenaJoin');
  await x.wait('arena', (m) => m.st === 'queue');
  y.send('arenaJoin');
  const [p4] = await Promise.all([x.wait('arena', (m) => m.st === 'prep'), y.wait('arena', (m) => m.st === 'prep')]);
  await x.wait('enterMap', (m) => m.map === 'loidai');
  const e4 = x.me.arena.elo;
  x.send('arenaLeave');
  const r4 = await x.wait('arenaResult');
  ok(p4.rated === false && r4.rated === false && r4.elo === e4 && r4.d === 0, 'cặp đã đấu 3 trận tính điểm hôm nay: trận thứ 4 là giao hữu, không đổi điểm');
  ok(r4.nc && r4.lock > 0, 'bỏ trận khi chưa ai ra đòn: trận không tính, người bỏ bị khóa đăng ký');
  await x.wait('enterMap', (m) => m.map === 'v_fire', 7000);
  x.send('arenaJoin');
  ok(!!(await x.wait('notice', (m) => /Vừa bỏ trận/.test(m.msg)).catch(() => null)), 'vừa bỏ trận: chưa đăng ký lại được');
  await y.wait('enterMap', (m) => m.map === 'v_fire', 7000);

  // hủy hàng chờ
  y.send('arenaJoin');
  await y.wait('arena', (m) => m.st === 'queue');
  y.send('arenaCancel');
  ok(!!(await y.wait('arena', (m) => m.st === 'idle').catch(() => null)), 'hủy đăng ký: rời hàng chờ');
  y.send('arenaCancel');
  ok(!!(await y.wait('arena', (m) => m.st === 'idle').catch(() => null)), 'bấm Hủy khi không còn trong hàng chờ: server gửi lại trạng thái rảnh');

  // bảng xếp hạng lôi đài
  y.send('rank');
  const rk = await y.wait('rank');
  const names = (rk.arena || []).map((r) => r.name);
  ok(names.includes('LoiDaiA') && names.includes('LoiDaiB') && rk.arenaMe && rk.arenaMe.rank >= 1 && rk.arenaMe.elo === y.me.arena.elo,
    `bảng xếp hạng có tab lôi đài, hạng của mình: ${rk.arenaMe && rk.arenaMe.rank}`);
  // tránh nhiễu: không còn trận nào khác đang chạy
  ok(!!(await say(x, '/arena', /0 người chờ, 0 trận/).catch(() => null)), 'admin /arena: hàng chờ và phòng đấu đã dọn sạch');

  // thưởng tuần: admin kích hoạt thử, gửi qua hộp thư, mỗi tuần một lần
  // B đủ 3 trận, thắng 1 nhưng điểm dưới mức khởi đầu: chưa có thưởng; nâng điểm lên thì nhận
  const rw0 = await say(x, '/arena reward', /Đã trao thưởng lôi đài tuần/);
  ok(y.me.arena.elo < 1000 && /cho 1 người/.test(rw0.msg), `thưởng tuần: chỉ A (điểm ${x.me.arena.elo}); B điểm ${y.me.arena.elo} dưới mức khởi đầu chưa nhận`);
  await say(y, '/arena elo 1000', /Điểm lôi đài: 1000/);
  const rw = await say(x, '/arena reward', /Đã trao thưởng lôi đài tuần/);
  ok(/cho 1 người/.test(rw.msg), 'admin /arena reward: B đủ điều kiện thì nhận, A không nhận trùng');
  y.send('mailList');
  const ml = await y.wait('mail');
  const wm = ml.list.find((m) => /Thưởng lôi đài tuần/.test(m.title));
  ok(wm && wm.luong >= 60 && wm.items.some((it) => it.id === 'chest'), `thưởng tuần qua hộp thư (${wm && wm.title}: ${wm && wm.luong} lượng)`);
  ok(/cho 0 người/.test((await say(x, '/arena reward', /Đã trao thưởng lôi đài tuần/)).msg), 'trao thưởng tuần lần 2: không nhận trùng');
  x.ws.close();
  y.ws.close();
  await sleep(200);
}

// Thú cưng qua WebSocket thật: cửa hàng, nhận EXP khi diệt quái, Tha Đồ, cho ăn lên cấp, chỉ số tăng, look có thú
async function petTest(a) {
  console.log('7h. Thú cưng: cấp, EXP, cho ăn, kỹ năng tự động');
  const D = a.data;
  ok(D.pet && D.pet.maxLv === 50 && D.pet.need[1] === 100 && D.pet.skills.pick.r[1] === 62 && D.items.pf_grain.type === 'petfood' && D.items.pet_bunny.look === 'bunny',
    'dữ liệu tĩnh có bảng thú cưng (cấp, EXP, kỹ năng) và thức ăn thú');
  const cnt = (id) => a.inv.inv.reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0);
  const at = (id) => a.inv.inv.findIndex((it) => it && it.id === id);
  const pet = () => a.inv.equip.pet;
  // (thú đã nhận ít EXP từ các phần kiểm thử trước nên cấp có thể > 1)
  ok(pet() && pet().id === 'pet_bunny' && pet().plv >= 1 && pet().love >= 49 && pet().love <= 50 && a.me.look.pet === 'bunny' && a.me.look.pl === pet().plv,
    `thú mang theo có cấp (${pet() && pet().plv}) và thân mật mặc định 50; look gửi mã hình thú + cấp thú`);
  if (a.map !== 'v_fire') {
    a.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await a.wait('enterMap', (m) => m.map === 'v_fire');
  }
  await a.walkTo(470);
  a.send('npc', { id: 'v_fire_potion' });
  const shop = await a.wait('shop');
  ok(['pf_grain', 'pf_fish'].every((id) => shop.items.some((x) => x.id === id && x.cur === 'xu')) && shop.items.some((x) => x.id === 'pf_pill' && x.cur === 'luong'),
    'Tiệm Thuốc bán thức ăn thú (bánh gạo, cá khô bằng xu; linh đan bằng lượng)');
  a.send('chat', { ch: 'map', msg: '/xu 100000' });
  await a.wait('chat', (m) => /xu/.test(m.msg));
  await sleep(150);
  const xu0 = a.me.xu;
  a.send('buy', { npc: 'v_fire_potion', id: 'pf_fish', qty: 3 });
  await a.wait('notice', (m) => /Đã mua/.test(m.msg));
  await sleep(120);
  ok(cnt('pf_fish') === 3 && a.me.xu === xu0 - 3 * D.items.pf_fish.price, 'mua 3 Cá Khô Ngân Lân trừ đúng xu');

  // Diệt quái: thú nhận EXP (gói 'pet'), Tha Đồ nhặt món rơi gần
  a.send('chat', { ch: 'map', msg: '/tp fire_field' });
  await a.wait('enterMap', (m) => m.map === 'fire_field');
  const hunt = async (gap) => {
    for (let round = 0; round < 8; round++) {
      const mobs = [...a.monsters.values()].filter((m) => m.y === 300).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x));
      const tg = mobs[0];
      if (!tg) return null;
      await a.walkTo(Math.max(30, Math.round(tg.x - gap)));
      for (let i = 0; i < 8 && a.monsters.has(tg.id); i++) {
        a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
        a.send('skill', { sid: 'k0', tid: `m${tg.id}`, dir: 1 });
        await sleep(400);
      }
      if (!a.monsters.has(tg.id)) return tg;
    }
    return null;
  };
  let from = a.msgs.length;
  const pexp0 = pet().pexp;
  const killed = await hunt(26);
  const pm = killed ? await seek(a, 'pet', (m) => m.id === 'pet_bunny' && m.pexp > pexp0, from, 3000).catch(() => null) : null;
  ok(!!pm, `diệt quái: thú nhận một phần EXP (gói pet, EXP thú ${pm ? pm.m.pexp : '?'})`);
  const pick = killed ? await seek(a, 'petAct', (m) => m.id === a.me.id && m.k === 'pick', from, 4000).catch(() => null) : null;
  ok(!!pick && a.msgs.slice(from).some((m) => m.t === 'loot'), 'Thỏ Ngọc tự nhặt đồ rơi gần chủ (petAct pick + loot)');
  // thân mật thấp: thú dỗi, không nhặt
  a.send('chat', { ch: 'map', msg: '/thu 1 10' });
  await a.wait('chat', (m) => /thân mật 10/.test(m.msg));
  from = a.msgs.length;
  await hunt(40);
  await sleep(2200);
  ok(!a.msgs.slice(from).some((m) => m.t === 'petAct' && m.id === a.me.id && m.k === 'pick'), 'thân mật dưới 20: thú dỗi, không dùng Tha Đồ');
  a.send('chat', { ch: 'map', msg: '/thu 1 50' });
  await a.wait('chat', (m) => /thân mật 50/.test(m.msg));
  await sleep(150);

  // Cho ăn: +2500 EXP → từ cấp 1 lên cấp 6, +6 thân mật, chỉ số chủ tăng
  const hp0 = a.me.s.maxHp;
  const crit0 = a.me.s.crit;
  from = a.msgs.length;
  a.send('useItem', { slot: at('pf_fish') });
  const fed = await a.wait('pet', (m) => m.plv > 1);
  await sleep(200);
  ok(fed.plv === 6 && fed.love === 56 && cnt('pf_fish') === 2, `cho ăn Cá Khô: thú lên cấp ${fed.plv}, thân mật ${fed.love}`);
  ok(a.me.s.maxHp > hp0 && a.me.s.crit >= crit0 && a.me.look.pl === 6, `thú lên cấp tăng chỉ số chủ (sinh lực ${hp0} → ${a.me.s.maxHp}), look có cấp thú mới`);
  ok(a.msgs.slice(from).some((m) => m.t === 'petAct' && m.k === 'feed') && a.msgs.slice(from).some((m) => m.t === 'petAct' && m.k === 'lv' && m.lv === 6)
    && a.msgs.slice(from).some((m) => m.t === 'pInfo' && m.id === a.me.id && m.look.pl === 6) && a.msgs.slice(from).some((m) => m.t === 'notice' && /đạt cấp 6/.test(m.msg)),
  'cho ăn và lên cấp báo cả bản đồ (petAct feed/lv, pInfo), chủ nhận thông báo');
  // không mang thú thì không cho ăn được, thức ăn không mất
  a.send('unequip', { slot: 'pet' });
  await a.wait('inv', (m) => !m.equip.pet);
  a.send('useItem', { slot: at('pf_fish') });
  await a.wait('notice', (m) => /mang thú cưng/.test(m.msg));
  ok(cnt('pf_fish') === 2, 'chưa mang thú: không cho ăn, thức ăn còn nguyên');
  a.send('equip', { slot: at('pet_bunny') });
  await a.wait('inv', (m) => m.equip.pet && m.equip.pet.id === 'pet_bunny');
  ok(pet().plv === 6 && pet().love === 56, 'tháo ra mang lại: thú giữ nguyên cấp và thân mật');
  // cấp tối đa + thân mật đầy: từ chối cho ăn
  a.send('chat', { ch: 'map', msg: '/thu 50 100' });
  await a.wait('chat', (m) => /cấp 50/.test(m.msg));
  a.send('useItem', { slot: at('pf_fish') });
  await a.wait('notice', (m) => /no nê/.test(m.msg));
  ok(cnt('pf_fish') === 2, 'thú cấp tối đa, thân mật đầy: không ăn thêm');
  a.send('useItem', { slot: '__proto__' });
  a.send('chat', { ch: 'map', msg: '/thu 12 70' });
  await a.wait('chat', (m) => /cấp 12, thân mật 70/.test(m.msg));
  await sleep(150);
  ok(pet().plv === 12 && pet().love === 70, 'lệnh admin /thu đặt cấp và thân mật thú');

  // cấp/EXP/thân mật nằm trên món đồ: phải giữ nguyên khi cất kho rồi lấy ra, và khi giao dịch qua lại
  const same = (it) => !!it && it.id === 'pet_bunny' && it.plv === 12 && it.pexp === 0 && it.love === 70;
  const petAt = (bot) => bot.inv.inv.findIndex(same);
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');
  a.send('unequip', { slot: 'pet' });
  await a.wait('inv', (m) => !m.equip.pet);
  await a.walkTo(1320);
  a.send('npc', { id: 'v_fire_storage' });
  await a.wait('storage');
  a.send('storePut', { npc: 'v_fire_storage', slot: petAt(a) });
  const sp = await a.wait('storage', (m) => m.items.some((it) => it && it.id === 'pet_bunny'));
  a.send('storeTake', { npc: 'v_fire_storage', slot: sp.items.findIndex((it) => it && it.id === 'pet_bunny') });
  await a.wait('storage', (m) => !m.items.some((it) => it && it.id === 'pet_bunny'));
  await sleep(150);
  ok(same(sp.items.find((it) => it && it.id === 'pet_bunny')) && petAt(a) >= 0, 'cất thú vào kho rồi lấy ra: giữ nguyên cấp 12, EXP và thân mật 70');
  const b = new Bot('B4');
  await b.connect();
  b.send('login', { u: 'bot_two', p: 'secret123' });
  await b.wait('chars');
  b.send('selectChar', { name: 'CungThu' });
  await Promise.all([b.wait('enterMap'), b.wait('inv')]);
  if (b.map !== 'v_fire') {
    b.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await b.wait('enterMap', (m) => m.map === 'v_fire');
  }
  await b.walkTo(Math.round(a.x) - 30);
  const trade = async (from, to, slot) => {
    from.send('tradeReq', { name: to.me.name });
    await to.wait('invite', (m) => m.kind === 'trade');
    to.send('tradeAccept', { from: from.me.name });
    await from.wait('trade');
    from.send('tradeSet', { slots: [slot], xu: 0 });
    await to.wait('trade', (m) => m.theirs.slots.length === 1);
    from.send('tradeLock');
    to.send('tradeLock');
    await to.wait('trade', (m) => m.mine.lock && m.theirs.lock);
    from.send('tradeOk');
    to.send('tradeOk');
    await to.wait('tradeEnd');
    await to.wait('inv', (m) => m.inv.some(same)).catch(() => null);
    // gói inv của bên gửi có thể tới sau bên nhận
    if (petAt(from) >= 0) await from.wait('inv', (m) => !m.inv.some(same)).catch(() => null);
  };
  await trade(a, b, petAt(a));
  ok(petAt(b) >= 0 && petAt(a) < 0, 'giao dịch thú sang người khác: bên nhận có thú cấp 12, thân mật 70');
  await trade(b, a, petAt(b));
  b.ws.close();
  a.send('equip', { slot: petAt(a) });
  await a.wait('inv', (m) => same(m.equip.pet)).catch(() => null);
  ok(same(pet()), 'nhận lại qua giao dịch và mang theo: thú vẫn cấp 12, thân mật 70');
}

// Đợi tin loại t (thỏa pred) xuất hiện trong bot.msgs từ vị trí from (không phụ thuộc lần gửi gần nhất)
async function seek(bot, t, pred, from, ms = 6000) {
  const t0 = Date.now();
  for (;;) {
    for (let i = from; i < bot.msgs.length; i++) {
      const m = bot.msgs[i];
      if (m.t === t && (!pred || pred(m))) return { m, i };
    }
    if (Date.now() - t0 > ms) throw new Error(`${bot.name}: hết thời gian chờ "${t}"`);
    await sleep(25);
  }
}

// Đi nhanh (bước nhỏ hơn ngưỡng kiểm tra tốc độ của server) để kịp né chiêu
async function dash(bot, x) {
  while (Math.abs(bot.x - x) > 2) {
    const step = Math.sign(x - bot.x) * Math.min(26, Math.abs(x - bot.x));
    bot.x += step;
    bot.send('move', { x: bot.x, y: 300, dir: Math.sign(step), st: 1 });
    await sleep(65);
  }
}

// Bot đã gục thì hồi sinh tại chỗ (tốn 1 lượng); trả về số lượng đã tiêu
async function revive(bot) {
  if (!bot.me.dead) return 0;
  const l0 = bot.me.luong;
  bot.send('revive', { mode: 'here' });
  await bot.wait('revived', null, 2000).catch(() => null);
  await sleep(120);
  return Math.max(0, l0 - bot.me.luong);
}

// Chỗ an toàn gần nhất ngoài vùng chiêu c (vị trí chốt lúc niệm)
function safeX(c, x) {
  if (c.shape === 'line') return c.x - c.dir * 40;
  if (c.shape === 'pillar') return Math.max(...c.pts.map((p) => Math.abs(p[0] - x))) < 200 ? x + 90 : x;
  const side = x >= c.x ? 1 : -1;
  return c.x + side * (c.r + 30);
}

async function bossEventTest(a) {
  console.log('7e. Chiêu boss báo trước & sự kiện Tà Thú');
  // Bot thứ hai đứng xa boss trên cùng bản đồ
  const g = new Bot('G');
  await g.connect();
  g.send('login', { u: 'bot_two', p: 'secret123' });
  await g.wait('chars');
  g.send('selectChar', { name: 'KunaiNin' });
  await g.wait('enterMap');
  const evOff = await g.wait('event');
  ok(evOff.k === 'tathu' && evOff.on === false, 'vào game nhận trạng thái sự kiện Tà Thú (chưa diễn ra)');

  let from = g.msgs.length;
  a.send('chat', { ch: 'map', msg: '/event tathu ev_hacviem wasteland' });
  const ann = await seek(g, 'notice', (m) => /Tà Thú Xuất Thế: Hắc Viêm Tà Thú .*Hoang Mạc Cát/.test(m.msg), from);
  ok(ann.m.kind === 'boss', '/event tathu: thông báo toàn máy chủ kèm tên bản đồ');
  const ev = (await seek(g, 'event', (m) => m.on, from)).m;
  ok(ev.map === 'wasteland' && ev.boss === 'ev_hacviem' && ev.left > 19 * 60000 && ev.left <= 20 * 60000, 'gói event: boss, bản đồ, còn 20 phút');
  a.send('chat', { ch: 'map', msg: '/event tathu' });
  ok(!!(await a.wait('chat', (m) => /đang diễn ra/.test(m.msg))), 'không gọi chồng hai Tà Thú');

  a.send('chat', { ch: 'map', msg: '/tp wasteland' });
  await a.wait('enterMap', (m) => m.map === 'wasteland');
  // cấp cao, đầy máu để chịu được chiêu boss và đòn thường trong cả trận
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  g.send('chat', { ch: 'map', msg: '/lv 120' });
  g.send('chat', { ch: 'map', msg: '/tp wasteland' });
  await g.wait('enterMap', (m) => m.map === 'wasteland');
  const boss = [...a.monsters.values()].find((m) => m.k === 'ev_hacviem');
  ok(!!boss && boss.id === ev.id, 'Tà Thú có mặt trên bản đồ sự kiện');
  if (!boss) return g.ws.close();
  // G đứng ở mép trái (boss xuất hiện ở khoảng giữa bản đồ); A đứng bên phải boss để chiêu dải hướng ra xa G
  await dash(g, 120);
  const gHp = g.me.hp;
  await dash(a, boss.x + 30);
  a.send('move', { x: a.x, y: 300, dir: -1, st: 0 });

  // Lần niệm 1: đứng yên trong vùng → bị trúng; G ở xa không mất máu
  from = a.msgs.length;
  const c1 = await seek(a, 'bossCast', (m) => m.id === boss.id, from, 9000);
  const t1 = Date.now();
  const h1 = await seek(a, 'bossHit', (m) => m.id === boss.id, c1.i, 4000);
  const waited = Date.now() - t1;
  ok(c1.m.dur >= 900 && waited >= c1.m.dur - 150 && h1.m.k === c1.m.k, `bossCast (${c1.m.name}, ${c1.m.shape}, ${c1.m.dur}ms) đến trước bossHit sau thời gian niệm`);
  const hit1 = await seek(a, 'hit', (m) => m.bs && m.a === `m${boss.id}`, h1.i, 800).catch(() => null);
  ok(!!hit1 && hit1.m.list.some(([tid]) => tid === `p${a.me.id}`), 'đứng trong vùng thì trúng chiêu boss');
  ok(!hit1 || !hit1.m.list.some(([tid]) => tid === `p${g.me.id}`), 'người đứng ngoài vùng không bị tính sát thương');
  await sleep(150);
  // quái thường quanh G có thể đánh G, nên chỉ cộng sát thương đến từ boss
  const fromBoss = g.msgs.filter((m) => m.t === 'hit' && m.a === `m${boss.id}`).flatMap((m) => m.list).filter(([tid, , , miss]) => tid === `p${g.me.id}` && !miss);
  ok(gHp > 0 && !g.me.dead && fromBoss.length === 0, 'người đứng ngoài vùng không mất máu vì boss');

  // Lần niệm 2: chạy ra khỏi vùng trong lúc niệm → né được
  from = a.msgs.length;
  // quái thường quanh boss có thể hạ A trong lúc chờ: hồi đầy máu, gục thì hồi sinh tại chỗ rồi chờ tiếp
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  let c2 = null;
  for (let k = 0; k < 4 && !c2; k++) {
    await revive(a);
    c2 = await seek(a, 'bossCast', (m) => m.id === boss.id, from, 6000).catch(() => null);
  }
  if (!c2) throw new Error('A: hết thời gian chờ "bossCast" lần 2');
  await dash(a, safeX(c2.m, a.x));
  const h2 = await seek(a, 'bossHit', (m) => m.id === boss.id, c2.i, 4000);
  await sleep(200);
  const hit2 = a.msgs.slice(h2.i).find((m) => m.t === 'hit' && m.bs && m.a === `m${boss.id}`);
  ok(!hit2 || !hit2.list.some(([tid]) => tid === `p${a.me.id}`), `chạy ra khỏi vùng ${c2.m.shape} trong lúc niệm thì né được ${c2.m.name}`);

  // Cuồng nộ khi máu dưới 30% (admin /bosshp để rút ngắn trận đánh)
  from = a.msgs.length;
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  a.send('chat', { ch: 'map', msg: '/bosshp 2' });
  const rage = await seek(a, 'mRage', (m) => m.id === boss.id, from, 3000).catch(() => null);
  ok(!!rage && !!(await seek(a, 'notice', (m) => /nổi cuồng nộ/.test(m.msg), from, 1000).catch(() => null)), 'máu dưới 30%: Tà Thú nổi cuồng nộ (gói mRage + thông báo)');
  // Hạ Tà Thú: G góp vài đòn trước, A kết liễu
  // G đánh tới khi có ít nhất một đòn gây sát thương (boss có thể đi lại, đòn có thể trượt)
  const gHit = (i) => g.msgs.slice(i).some((m) => m.t === 'hit' && m.a === `p${g.me.id}` && m.list.some(([tid, dmg, , miss]) => tid === `m${boss.id}` && dmg > 0 && !miss));
  const gFrom = g.msgs.length;
  for (let i = 0; i < 24 && !gHit(gFrom) && a.monsters.has(boss.id); i++) {
    await revive(g);
    const bm = g.monsters.get(boss.id);
    if (bm && Math.abs(g.x - (bm.x - 34)) > 20) await dash(g, Math.round(bm.x - 34));
    g.send('move', { x: g.x, y: 300, dir: 1, st: 0 });
    g.send('skill', { sid: 'n0', tid: `m${boss.id}`, dir: 1 });
    await sleep(460);
  }
  ok(gHit(gFrom), 'người thứ hai gây được sát thương lên Tà Thú');
  await revive(a);
  let luong0 = a.me.luong;
  for (let i = 0; i < 200 && a.monsters.has(boss.id); i++) {
    // hồi sinh tại chỗ tốn 1 lượng: trừ ra khỏi mốc so sánh
    if (a.me.dead) luong0 -= await revive(a);
    const bx = a.monsters.get(boss.id).x;
    if (Math.abs(a.x - (bx + 30)) > 20) await dash(a, Math.round(bx + 30));
    a.send('move', { x: a.x, y: 300, dir: -1, st: 0 });
    a.send('skill', { sid: ['k6', 'k5', 'k1', 'k0'][i % 4], tid: `m${boss.id}`, dir: -1 });
    await sleep(220);
  }
  const res = await seek(a, 'eventResult', null, from, 5000).catch(() => null);
  ok(!!res, 'Tà Thú bị hạ: gửi bảng kết quả sát thương');
  if (res) {
    const r = res.m;
    ok(r.me && r.me.rank === 1 && r.top[0].name === 'KiemSi' && r.top.every((x, i) => !i || r.top[i - 1].dmg >= x.dmg), 'xếp hạng theo sát thương, người gây nhiều nhất hạng 1');
    await sleep(200);
    ok(a.me.luong === luong0 + 30 && /30 lượng/.test(r.me.reward) && /Sách/.test(r.me.reward), `hạng 1 nhận 30 lượng và sách nội tại (${r.me.reward})`);
    const gr = await seek(g, 'eventResult', null, 0, 2000).catch(() => null);
    ok(!!gr && gr.m.me && gr.m.me.rank === 2, 'người góp sát thương cũng nhận bảng kết quả với hạng của mình');
  }
  const off = await seek(a, 'event', (m) => m.on === false, from, 2000).catch(() => null);
  ok(!!off, 'sự kiện kết thúc sau khi Tà Thú bị hạ');
  g.ws.close();
}

// Thời trang + thú cưỡi: ô mới, tốc chạy thú cưỡi được server chấp nhận, hạn sử dụng, chặn giao dịch đồ có hạn
async function fashionTest(a) {
  console.log('7f. Thời trang & thú cưỡi');
  // phiên B cũ đã bị bot G (cùng tài khoản) đá ra ở 7e: đăng nhập lại
  const b = new Bot('B2');
  await b.connect();
  b.send('login', { u: 'bot_two', p: 'secret123' });
  await b.wait('chars');
  b.send('selectChar', { name: 'CungThu' });
  await b.wait('enterMap');
  const G = a.data;
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => G.slots.includes(s) && G.fashionSlots.includes(s) && G.slotNames[s]) && !G.gearSlots.includes('mount'),
    'dữ liệu tĩnh có 4 ô thời trang mới (tách khỏi ô chiến đấu)');
  const fashion = Object.keys(G.items).filter((id) => G.items[id].fashion);
  const mounts = fashion.filter((id) => G.items[id].slot === 'mount');
  ok(mounts.length >= 4 && mounts.every((id) => G.items[id].stats.spd > 0) && new Set(mounts.map((id) => G.items[id].grade)).size >= 3,
    `${mounts.length} thú cưỡi, đều cộng tốc chạy, nhiều độ hiếm khác nhau`);
  const { SHOPS } = require('../server/data/items');
  ok(SHOPS.potion.luong.some((id) => G.items[id] && G.items[id].fashion), 'tiệm bán thời trang bằng lượng');

  for (const bot of [a, b]) {
    if (bot.map === 'v_fire') continue;
    bot.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await bot.wait('enterMap', (m) => m.map === 'v_fire');
  }
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  await sleep(200);
  // dọn chỗ trong túi cho các món thời trang
  for (let i = 0; i < 8; i++) {
    const k = a.inv.inv.findIndex((it, j) => j >= 20 && it);
    if (k < 0) break;
    a.send('discard', { slot: k });
    await sleep(60);
  }
  const give = async (cmd, id) => {
    a.send('chat', { ch: 'map', msg: cmd });
    return a.wait('inv', (m) => m.inv.some((it) => it && it.id === id));
  };
  const wear = async (id) => {
    const i = a.inv.inv.findIndex((it) => it && it.id === id);
    a.send('equip', { slot: i });
    const slot = G.items[id].slot;
    return a.wait('inv', (m) => m.equip[slot] && m.equip[slot].id === id);
  };
  const strip = async (slot) => {
    a.send('unequip', { slot });
    return a.wait('inv', (m) => !m.equip[slot]);
  };

  // mặc / tháo đủ 4 ô mới; người khác thấy ngoại hình mới qua pInfo
  for (const id of ['mask_oni', 'cloak_flame', 'costume_dragon']) await give(`/item ${id}`, id);
  await give('/item mount_qilin', 'mount_qilin');
  // hiệu ứng làm chậm còn sót từ phần Tà Thú (Kinh Hồn Hống, 3 giây) làm sai mốc tốc chạy
  for (let i = 0; i < 50 && (a.me.buffs || []).some((x) => x.stat === 'spd'); i++) await sleep(100);
  const spd0 = a.me.s.spd;
  const atk0 = a.me.s.atk;
  let from = b.msgs.length;
  for (const id of ['mask_oni', 'cloak_flame', 'costume_dragon', 'mount_qilin']) await wear(id);
  await sleep(250);
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => a.inv.equip[s]), 'mặc đủ mặt nạ, áo choàng, trang phục, thú cưỡi');
  ok(a.inv.equip.costume.r === 4 && a.inv.equip.mount.r === 4 && !a.inv.equip.mask.exp, 'độ hiếm theo phẩm của món, mua/tặng qua admin thì vĩnh viễn');
  ok(a.me.s.spd === spd0 + 35 && a.me.s.mountSpd === 35 && a.me.s.atk > atk0, `thú cưỡi cộng tốc chạy vào s.spd (${spd0} -> ${a.me.s.spd}) và chỉ số thời trang được tính`);
  const pi = await seek(b, 'pInfo', (m) => m.name === 'KiemSi' && m.look && m.look.mount === 'qilin', from, 2000).catch(() => null);
  ok(!!pi && pi.m.look.mask === 'oni' && pi.m.look.cloak === 'flame' && pi.m.look.costume === 'dragon', 'người chơi khác nhận ngoại hình mặt nạ/áo choàng/trang phục/thú cưỡi');

  // tốc chạy thú cưỡi: bước 1.25 giây (dt chạm trần 1.2s nên giới hạn ổn định), dài hơn mức đi bộ nhưng trong mức cưỡi thú
  const lim = (spd) => 110 * (1 + spd / 100) * 1.6 * 1.2 + 30;
  const step = Math.round((lim(spd0) + lim(a.me.s.spd)) / 2);
  ok(lim(a.me.s.spd) - lim(spd0) > 60, `chênh lệch giới hạn bước giữa đi bộ và cưỡi thú đủ rõ (${Math.round(lim(spd0))} / ${Math.round(lim(a.me.s.spd))})`);
  const fastMoves = async (n) => {
    const f = a.msgs.length;
    for (let i = 0; i < n; i++) {
      await sleep(1250);
      a.x += (i % 2 ? -1 : 1) * step;
      a.send('move', { x: a.x, y: 300, dir: 1, st: 1 });
    }
    await sleep(150);
    return a.msgs.slice(f).filter((m) => m.t === 'pos').length;
  };
  a.x = 600;
  a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
  await sleep(300);
  a.x = 600;
  ok(await fastMoves(3) === 0, `cưỡi thú chạy nhanh (bước ${step}px): server không kéo lại`);
  await strip('mount');
  // gói 'me' (chỉ số mới) có thể tới sau gói 'inv' của cùng lần tháo
  const meOff = await a.wait('me', (m) => !m.s.mountSpd).catch(() => a.me);
  ok(meOff.s.spd === spd0 && !meOff.s.mountSpd, `tháo thú cưỡi: tốc chạy về như cũ (${meOff.s.spd} / ${spd0})`);
  // trong 2.5 giây sau khi tháo vẫn nhận tốc cũ (gói di chuyển đang bay không bị kéo lại)
  ok(await fastMoves(1) === 0, 'vừa tháo thú cưỡi: bước đang chạy dở không bị kéo lại');
  await sleep(1500);
  const pulled = await fastMoves(1);
  ok(pulled === 1, `không cưỡi thú mà đi bước dài như thế thì bị kéo lại (${pulled} lần, tốc ${a.me.s.spd})`);
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');

  // khóa ô lạ từ máy khách: không làm hỏng túi đồ
  const invBefore = JSON.stringify(a.inv.inv);
  for (const slot of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) a.send('unequip', { slot });
  await sleep(250);
  ok(JSON.stringify(a.inv.inv) === invBefore && a.inv.inv.every((it) => !it || typeof it.id === 'string'), 'tháo ô "__proto__"/"constructor": bị bỏ qua');
  // cường hóa từ ô trang bị với khóa lạ cũng phải bị bỏ qua, không ném lỗi trong server
  await a.walkTo(620);
  const logAt = log.length;
  for (const slot of ['__proto__', 'constructor', 'toString']) a.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot });
  await sleep(250);
  ok(!/Lỗi xử lý upgrade/.test(log.slice(logAt)), 'cường hóa ô "__proto__"/"constructor": bị bỏ qua, server không lỗi');
  for (const s of ['mask', 'cloak', 'costume']) await strip(s);
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => !a.inv.equip[s]) && a.me.s.atk === atk0, 'tháo hết thời trang: chỉ số trở về như cũ');

  // đồ có hạn 7 ngày: không giao dịch được, hết hạn thì mất chỉ số và tự biến mất
  const inv7 = await give('/item mask_fox 1 0 7', 'mask_fox');
  const fox = inv7.inv.find((it) => it && it.id === 'mask_fox');
  const left = fox.exp - Date.now();
  ok(left > 6.9 * 86400000 && left <= 7 * 86400000 + 5000, 'đồ thời trang có hạn 7 ngày (trường exp)');
  await b.walkTo(Math.round(a.x) + 30);
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [a.inv.inv.findIndex((it) => it && it.id === 'mask_fox')], xu: 0 });
  ok(!!(await a.wait('notice', (m) => /hạn sử dụng không thể giao dịch/.test(m.msg)).catch(() => null)), 'đồ có hạn không đặt vào giao dịch được');
  a.send('tradeCancel');
  await sleep(200);
  // tráo đồ sau khi đặt: đặt bánh bao (không hạn), cả hai khóa, B đồng ý; A ăn bánh rồi tháo món có hạn
  // rơi đúng vào ô đã đặt -> giao dịch phải bị hủy, B không nhận được món có hạn
  await wear('mask_fox');
  // bỏ chồng bánh bao cũ để bánh mới nằm ở ô trống đầu tiên (ô mà món tháo ra sẽ rơi vào)
  for (let k; (k = a.inv.inv.findIndex((it) => it && it.id === 'food_atk')) >= 0;) {
    a.send('discard', { slot: k });
    await a.wait('inv', (m) => !m.inv[k]);
  }
  const foodInv = await give('/item food_atk 1', 'food_atk');
  const foodSlot = foodInv.inv.findIndex((it) => it && it.id === 'food_atk');
  ok(foodSlot >= 0, 'nhận bánh bao để đặt giao dịch');
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [foodSlot], xu: 0 });
  await b.wait('trade', (m) => m.theirs.slots.length === 1);
  a.send('tradeLock');
  b.send('tradeLock');
  await b.wait('trade', (m) => m.mine.lock && m.theirs.lock);
  b.send('tradeOk');
  await a.wait('trade', (m) => m.theirs.ok);
  a.send('useItem', { slot: foodSlot });
  await a.wait('inv', (m) => !m.inv[foodSlot]);
  a.send('unequip', { slot: 'mask' });
  const swapped = await a.wait('inv', (m) => !m.equip.mask);
  ok(swapped.inv[foodSlot] && swapped.inv[foodSlot].id === 'mask_fox', 'món có hạn tháo ra rơi vào đúng ô đã đặt giao dịch');
  const fromB = b.msgs.length;
  a.send('tradeOk');
  const endB = await seek(b, 'tradeEnd', () => true, fromB, 2000).catch(() => null);
  await sleep(150);
  ok(!!endB && !endB.m.ok && !b.inv.inv.some((it) => it && it.id === 'mask_fox') && a.inv.inv[foodSlot] && a.inv.inv[foodSlot].id === 'mask_fox',
    'tráo đồ trong ô đã đặt sau khi khóa: giao dịch bị hủy, không chuyển được món có hạn');
  const crit0 = a.me.s.crit;
  await wear('mask_fox');
  await sleep(150);
  const crit1 = a.me.s.crit;
  from = a.msgs.length;
  a.send('chat', { ch: 'map', msg: '/hethan 1' });
  const gone = await seek(a, 'notice', (m) => /Hết hạn sử dụng: Mặt Nạ Hồ Ly/.test(m.msg), from, 8000).catch(() => null);
  await sleep(250);
  ok(!!gone && !a.inv.equip.mask && !a.inv.inv.some((it) => it && it.id === 'mask_fox'), 'hết hạn: tự tháo, biến mất khỏi người và thông báo');
  ok(crit1 > crit0 && a.me.s.crit === crit0, `hết hạn: mất chỉ số thời trang (chí mạng ${crit0} -> ${crit1} -> ${a.me.s.crit})`);

  // để lại mặt nạ vĩnh viễn + một món có hạn trong túi để kiểm tra lúc tải lại từ file
  await give('/item mask_oni', 'mask_oni');
  await wear('mask_oni');
  await give('/item cloak_wind 1 0 7', 'cloak_wind');
  b.ws.close();
}

async function gemTest(a) {
  console.log('7g. Khảm ngọc & ghép ngọc');
  const G = a.data;
  ok(G.gems && Object.keys(G.gems.types).length === 6 && G.gems.holes.length === G.tierColors.length && G.items.gem_huyet_10 && G.statLabels.lifesteal,
    'dữ liệu tĩnh có bảng ngọc (6 loại, 10 cấp, số lỗ theo bậc)');
  const b = new Bot('B3');
  await b.connect();
  b.send('login', { u: 'bot_two', p: 'secret123' });
  await b.wait('chars');
  b.send('selectChar', { name: 'CungThu' });
  await Promise.all([b.wait('enterMap'), b.wait('inv')]);
  if (b.map !== 'v_fire') {
    b.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await b.wait('enterMap', (m) => m.map === 'v_fire');
  }
  if (a.map !== 'v_fire') {
    a.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await a.wait('enterMap', (m) => m.map === 'v_fire');
  }
  // dọn chỗ trong túi
  for (let i = 0; i < 12; i++) {
    const k = a.inv.inv.findIndex((it, j) => j >= 16 && it);
    if (k < 0) break;
    a.send('discard', { slot: k });
    await a.wait('inv', (m) => !m.inv[k]);
  }
  const at = (id, bot = a) => bot.inv.inv.findIndex((it) => it && it.id === id);
  const cnt = (id, bot = a) => bot.inv.inv.reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0);
  const give = async (cmd, id, n = 1) => {
    const want = cnt(id) + n;
    a.send('chat', { ch: 'map', msg: cmd });
    return a.wait('inv', (m) => m.inv.reduce((s, it) => s + (it && it.id === id ? it.q : 0), 0) >= want);
  };
  const npc = 'v_fire_smith';
  const note = (re) => a.wait('notice', (m) => re.test(m.msg), 2000).catch(() => null);
  const result = (act) => a.wait('gemResult', (m) => m.act === act, 2000).catch(() => null);

  // đứng xa Thợ Rèn: bị bỏ qua
  await a.walkTo(1000);
  await give('/item gem_loi_2 1', 'gem_loi_2');
  const w0 = JSON.stringify(a.inv.equip.weapon);
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 0, gem: at('gem_loi_2') });
  await sleep(300);
  ok(JSON.stringify(a.inv.equip.weapon) === w0 && at('gem_loi_2') >= 0, 'khảm ngọc khi đứng xa Thợ Rèn: bị bỏ qua');
  await a.walkTo(620);

  // Lò Rèn bán ngọc cấp 1
  a.send('npcAct', { id: npc, a: 'shop' });
  const shop = await a.wait('shop');
  ok(['hoa', 'thuy', 'tho', 'phong', 'loi', 'huyet'].every((k) => shop.items.some((x) => x.id === `gem_${k}_1` && x.cur === 'xu' && x.price === 1500)), 'Lò Rèn bán ngọc cấp 1 cả 6 loại (1.500 xu)');
  a.send('npcAct', { id: npc, a: 'gem' });
  const ou = await a.wait('openUi');
  ok(ou.ui === 'upgrade' && ou.tab === 'gem', 'Thợ Rèn mở thẳng tab Khảm ngọc');
  // (bot có thể đã nhặt ngọc rơi ngẫu nhiên ở các phần trước: so theo số lượng trước/sau)
  const xu0 = a.me.xu;
  const h1 = cnt('gem_hoa_1');
  const h2 = cnt('gem_hoa_2');
  a.send('buy', { npc, id: 'gem_hoa_1', qty: 4 });
  await a.wait('inv', (m) => m.inv.reduce((n, it) => n + (it && it.id === 'gem_hoa_1' ? it.q : 0), 0) === h1 + 4);
  await a.wait('me', (m) => m.xu === xu0 - 6000).catch(() => null);
  ok(a.me.xu === xu0 - 6000 && cnt('gem_hoa_1') === h1 + 4, 'mua 4 Hỏa Tâm Ngọc Cấp 1 trừ đúng 6.000 xu');

  // khảm vào vũ khí đang mặc: chỉ số cộng đúng
  const crit0 = a.me.s.crit;
  const l2 = cnt('gem_loi_2');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 0, gem: at('gem_loi_2') });
  const r1 = await result('put');
  await a.wait('me', (m) => m.s.crit !== crit0).catch(() => null);
  await sleep(100);
  ok(!!r1 && r1.ok && a.inv.equip.weapon.gems[0] === 'gem_loi_2' && a.inv.equip.weapon.gems.length === 3 && cnt('gem_loi_2') === l2 - 1,
    'khảm Lôi Quang Ngọc Cấp 2 vào lỗ 1 của vũ khí, ngọc rời hành trang');
  ok(Math.abs(a.me.s.crit - (crit0 + 0.6)) < 0.05, `chí mạng cộng đúng +0.6% (${crit0} → ${a.me.s.crit})`);
  ok(!!(await seek(b, 'smithFx', (m) => m.k === 'gem' && m.id === a.me.id, 0, 1500).catch(() => null)), 'người chơi khác thấy hiệu ứng khảm ngọc');

  // các trường hợp bị từ chối
  await give('/item gem_loi_1 1', 'gem_loi_1');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 1, gem: at('gem_loi_1') });
  ok(!!(await note(/chỉ khảm 1 viên mỗi loại/)), 'không khảm 2 viên cùng loại vào 1 món');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 0, gem: at('gem_hoa_1') });
  ok(!!(await note(/đã có ngọc/)), 'lỗ đã có ngọc: phải gỡ trước');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 3, gem: at('gem_hoa_1') });
  ok(!!(await note(/Lỗ khảm không hợp lệ/)), 'lỗ ngoài số lỗ của món: bị từ chối');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 1, gem: at('hp1') >= 0 ? at('hp1') : at('scroll_home') });
  ok(!!(await note(/chọn một viên ngọc/)), 'ô ngọc trỏ vào vật phẩm không phải ngọc: bị từ chối');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 1, gem: 999 });
  ok(!!(await note(/chọn một viên ngọc/)), 'ô ngọc không tồn tại: bị từ chối');
  const logAt = log.length;
  const eqBefore = JSON.stringify(a.inv.equip);
  for (const slot of ['__proto__', 'constructor', 'pet', 'mask']) a.send('gemPut', { npc, src: 'eq', slot, hole: 0, gem: at('gem_hoa_1') });
  a.send('gemTake', { npc, src: 'eq', slot: '__proto__', hole: 0 });
  a.send('gemMerge', { npc, id: '__proto__' });
  ok(!!(await note(/chọn ngọc cần ghép/)), 'ghép ngọc với id "__proto__": bị từ chối');
  a.send('gemMerge', { npc, id: 'hp1' });
  ok(!!(await note(/chọn ngọc cần ghép/)), 'ghép vật phẩm không phải ngọc: bị từ chối');
  await sleep(150);
  ok(JSON.stringify(a.inv.equip) === eqBefore && cnt('gem_hoa_1') === h1 + 4 && !/Lỗi xử lý gem/.test(log.slice(logAt)),
    'ô "__proto__"/thú cưng/thời trang: không khảm được, server không lỗi');
  a.send('gemTake', { npc, src: 'eq', slot: 'weapon', hole: 2 });
  ok(!!(await note(/đang trống/)), 'gỡ ở lỗ trống: bị từ chối');

  // ghép: 3 viên cấp 1 -> 1 viên cấp 2 (tỉ lệ 100%), trừ xu
  a.send('gemMerge', { npc, id: 'gem_huyet_9' });
  ok(!!(await note(/Cần 3 viên/)), 'chưa đủ 3 viên: không ghép được');
  a.send('gemMerge', { npc, id: 'gem_tho_10' });
  ok(!!(await note(/cấp cao nhất/)), 'ngọc cấp 10: không ghép tiếp được');
  const xu1 = a.me.xu;
  a.send('gemMerge', { npc, id: 'gem_hoa_1' });
  const mr = await result('merge');
  await a.wait('inv', (m) => m.inv.reduce((n, it) => n + (it && it.id === 'gem_hoa_2' ? it.q : 0), 0) === h2 + 1).catch(() => null);
  await sleep(120);
  ok(!!mr && mr.ok && mr.id === 'gem_hoa_2' && cnt('gem_hoa_1') === h1 + 1 && cnt('gem_hoa_2') === h2 + 1 && a.me.xu === xu1 - 1000,
    'ghép 3 Hỏa Tâm Ngọc Cấp 1 thành 1 viên Cấp 2, trừ 1.000 xu');

  // gỡ ngọc: tốn xu, ngọc về hành trang, chỉ số trở lại
  const xu2 = a.me.xu;
  a.send('gemTake', { npc, src: 'eq', slot: 'weapon', hole: 0 });
  const tr = await result('take');
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'gem_loi_2')).catch(() => null);
  await sleep(150);
  ok(!!tr && tr.cost === 1100 && a.me.xu === xu2 - 1100 && at('gem_loi_2') >= 0 && !a.inv.equip.weapon.gems, 'gỡ Lôi Quang Ngọc Cấp 2: trừ 1.100 xu, ngọc về hành trang');
  ok(Math.abs(a.me.s.crit - crit0) < 0.05, `gỡ ngọc: chí mạng trở về ${crit0}`);
  // khảm lại để kiểm tra lưu dữ liệu ở phần 8; thêm Huyết Hồn để có hút máu
  await give('/item gem_huyet_1 1', 'gem_huyet_1');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 0, gem: at('gem_loi_2') });
  await result('put');
  a.send('gemPut', { npc, src: 'eq', slot: 'weapon', hole: 2, gem: at('gem_huyet_1') });
  await result('put');
  await Promise.all([a.wait('me', (m) => m.s.lifesteal === 0.3), a.wait('inv', (m) => m.equip.weapon.gems && m.equip.weapon.gems[2] === 'gem_huyet_1')]).catch(() => null);
  ok(a.me.s.lifesteal === 0.3 && JSON.stringify(a.inv.equip.weapon.gems) === '["gem_loi_2",null,"gem_huyet_1"]', 'khảm Huyết Hồn Ngọc: hút máu 0.3%');

  // món trong hành trang có ngọc: giao dịch (ngọc đi theo món), đang giao dịch thì không khảm được
  await give('/item w_cung_7 1', 'w_cung_7');
  await give('/item gem_tho_3 1', 'gem_tho_3');
  await give('/item gem_phong_1 1', 'gem_phong_1');
  const bow = () => at('w_cung_7');
  a.send('gemPut', { npc, src: 'inv', slot: bow(), hole: 1, gem: at('gem_tho_3') });
  await result('put');
  a.send('gemPut', { npc, src: 'inv', slot: bow(), hole: 0, gem: at('gem_phong_1') });
  await result('put');
  await sleep(150);
  ok(JSON.stringify(a.inv.inv[bow()].gems) === '["gem_phong_1","gem_tho_3",null]', 'khảm 2 viên vào cung trong hành trang (src inv)');
  await b.walkTo(Math.round(a.x) + 30);
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [bow()], xu: 0 });
  const tv = await b.wait('trade', (m) => m.theirs.slots.length === 1);
  ok(JSON.stringify(tv.theirs.items[0].gems) === '["gem_phong_1","gem_tho_3",null]', 'bên kia thấy ngọc khảm trên món đặt giao dịch');
  await give('/item gem_hoa_1 1', 'gem_hoa_1');
  a.send('gemPut', { npc, src: 'inv', slot: bow(), hole: 2, gem: at('gem_hoa_1') });
  await sleep(300);
  ok(!a.msgs.slice(a.sendIdx).some((m) => m.t === 'gemResult') && a.inv.inv[bow()].gems[2] === null, 'đang giao dịch: không khảm được');
  a.send('tradeLock');
  b.send('tradeLock');
  await b.wait('trade', (m) => m.mine.lock && m.theirs.lock);
  a.send('tradeOk');
  b.send('tradeOk');
  await b.wait('tradeEnd');
  await b.wait('inv', (m) => m.inv.some((it) => it && it.id === 'w_cung_7')).catch(() => null);
  await sleep(150);
  const got = b.inv.inv.find((it) => it && it.id === 'w_cung_7');
  ok(!!got && JSON.stringify(got.gems) === '["gem_phong_1","gem_tho_3",null]' && bow() < 0, 'giao dịch thành công: ngọc khảm đi theo món sang người nhận');

  // bán món có ngọc: giá cộng giá ngọc
  const I = require('../server/data/items');
  await give('/item hat_4 1', 'hat_4');
  await give('/item gem_thuy_2 1', 'gem_thuy_2');
  a.send('gemPut', { npc, src: 'inv', slot: at('hat_4'), hole: 0, gem: at('gem_thuy_2') });
  await result('put');
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'hat_4' && it.gems));
  const hat = a.inv.inv[at('hat_4')];
  const price = I.sellPrice(hat);
  ok(price === I.sellPrice({ ...hat, gems: undefined }) + Math.floor(I.ITEMS.gem_thuy_2.price * 0.25), `giá bán nón có ngọc gồm giá ngọc (${price} xu)`);
  const xu3 = a.me.xu;
  a.send('sell', { npc, slot: at('hat_4'), qty: 1 });
  ok(!!(await note(new RegExp(`Đã bán Nón Vàng được ${price} xu`))), 'bán nón có ngọc: thông báo đúng giá');
  await Promise.all([a.wait('me', (m) => m.xu === xu3 + price), a.wait('inv', (m) => !m.inv.some((it) => it && it.id === 'hat_4'))]).catch(() => null);
  ok(a.me.xu === xu3 + price && at('hat_4') < 0, 'bán món có ngọc: cộng đúng xu, món (kèm ngọc) rời hành trang');
  b.ws.close();
}

// Khởi động lại server từ file JSON: bộ kỹ năng lưu đúng, nhân vật cũ (chỉ có hotbar) được chuyển đổi
async function reloadTest() {
  console.log('9. Tải lại từ file: bộ kỹ năng & dữ liệu cũ');
  const { SKILLS } = require('../server/data/skills');
  const file = path.join(DATA, 'characters.json');
  const chars = JSON.parse(fs.readFileSync(file, 'utf8'));
  const k = chars.kiemsi;
  ok(k && k.hotbars.length === 3 && k.hbi === 1 && !('hotbar' in k), 'file lưu hotbars + hbi, không lưu trùng hotbar');
  const kBar = k ? k.hotbars[1].join() : '';
  // Giả lập nhân vật tạo từ bản cũ: chỉ có hotbar, kèm sid rác
  const cu = chars.cungthu;
  delete cu.hotbars;
  delete cu.hbi;
  cu.hotbar = ['c1', '__proto__', 'constructor', 'k1', null, 'c1'];
  // dữ liệu bản cũ chưa có ô thời trang + ô lạ, và đồ thời trang đã quá hạn khi server tắt
  ok(k && k.equip.mask && k.equip.mask.id === 'mask_oni' && k.inv.some((it) => it && it.id === 'cloak_wind' && it.exp), 'file lưu ô thời trang và hạn sử dụng');
  for (const s of ['mask', 'cloak', 'costume', 'mount']) delete cu.equip[s];
  cu.equip.wings = { id: 'w_cung_0', q: 1, p: 0, r: 0, o: [] };
  // ngọc khảm hỏng trong file: id lạ, trùng loại, thừa lỗ
  if (k && k.equip.weapon) k.equip.weapon.gems = ['gem_loi_2', '__proto__', 'gem_loi_5', 'gem_hoa_1', 'gem_thuy_1'];
  if (k && k.equip.pet) k.equip.pet.gems = ['gem_hoa_1'];
  if (k && k.inv.some((it) => it && it.id === 'cloak_wind')) {
    k.inv.find((it) => it && it.id === 'cloak_wind').exp = Date.now() - 1000;
    k.equip.costume = { id: 'costume_sakura', q: 1, p: 0, r: 2, o: [], exp: Date.now() - 1000 };
  }
  // tích hợp: thư nhận lúc offline kèm thú cưng đã nuôi và vũ khí đã khảm ngọc, cùng thú cưỡi đang cưỡi
  if (k) {
    k.mail = (k.mail || []).concat([{ id: 9001, at: Date.now() - 60000, from: 'Ban Quản Trị', title: 'Quà tích hợp', body: 'thử', xu: 10, luong: 1, read: false, got: false,
      items: [{ id: 'pet_fox', q: 1, p: 0, r: 2, o: [], plv: 7, pexp: 50, love: 66 }, { id: 'w_kiem_0', q: 1, p: 3, r: 1, o: [], gems: ['gem_hoa_2'] }] }]);
    if (!k.equip.mount) k.equip.mount = { id: 'mount_wolf', q: 1, p: 0, r: 2, o: [] };
  }
  fs.writeFileSync(file, JSON.stringify(chars));
  const srv = await startServer();
  try {
    const d = new Bot('D');
    await d.connect();
    d.send('login', { u: 'bot_two', p: 'secret123' });
    await d.wait('chars');
    d.send('selectChar', { name: 'CungThu' });
    await d.wait('enterMap');
    ok(d.me.hbi === 0 && d.me.hotbars.length === 3 && d.me.hotbar.join() === 'c1,,,,,' && d.me.hotbars[1].every((x) => x === null)
      && d.me.hotbars[2].every((x) => x === null), 'nhân vật cũ: bộ 0 = thanh cũ (đã lọc sid rác), bộ 1-2 trống');
    await d.wait('inv');
    ok(d.inv && !d.inv.equip.mask && !d.inv.equip.mount && !('wings' in d.inv.equip) && d.me.look && !d.me.look.mount && d.me.s.spd >= 0,
      'nhân vật cũ chưa có ô thời trang: tải bình thường (ô trống), ô lạ bị bỏ');
    d.ws.close();
    const e = new Bot('E');
    await e.connect();
    e.send('login', { u: 'botadmin', p: 'secret123' });
    const ec = await e.wait('chars');
    const ks = ec.chars.find((c) => c.name === 'KiemSi');
    ok(ks && ks.look.mask === 'oni' && !ks.look.costume, 'màn chọn nhân vật: không vẽ món thời trang đã hết hạn lúc offline');
    e.send('selectChar', { name: 'KiemSi' });
    await e.wait('enterMap');
    await e.wait('inv');
    ok(e.inv.equip.mask && e.inv.equip.mask.id === 'mask_oni' && e.me.look.mask === 'oni', 'mặt nạ vĩnh viễn giữ nguyên sau khởi động lại');
    ok(!e.inv.equip.costume && !e.inv.inv.some((it) => it && it.id === 'cloak_wind'), 'đồ thời trang quá hạn lúc server tắt: bị xóa khi tải lại');
    ok(!!(await e.wait('notice', (m) => /Hết hạn sử dụng: .*Áo Choàng Phong Vân/.test(m.msg) && /Y Phục Anh Đào/.test(m.msg)).catch(() => null)), 'vào game nhận thông báo các món đã hết hạn');
    ok(e.me.hbi === 1 && e.me.hotbar.join() === kBar && e.me.hotbars[1].join() === kBar, 'bộ kỹ năng giữ nguyên sau khi khởi động lại server');
    ok(JSON.stringify(e.inv.equip.weapon.gems) === '["gem_loi_2",null,null]' && !('gems' in e.inv.equip.pet),
      `ngọc khảm hỏng trong file được dọn khi tải (${JSON.stringify(e.inv.equip.weapon.gems)})`);
    // tích hợp: các hệ thống mới cùng qua một lần khởi động lại (nội tại, thú cưng, thú cưỡi, hộp thư, lôi đài)
    const pasK = Object.keys(k.skills || {}).filter((sid) => SKILLS[sid] && SKILLS[sid].type === 'passive');
    ok(pasK.length > 0 && pasK.every((sid) => e.me.skills[sid] === k.skills[sid]), `kỹ năng nội tại giữ cấp sau khởi động lại (${pasK.map((s) => `${s}:${k.skills[s]}`).join(', ')})`);
    const kp = k.equip.pet;
    const ep = e.inv.equip.pet;
    ok(kp && ep && ep.id === kp.id && (ep.plv || 1) === (kp.plv || 1) && (ep.pexp || 0) === (kp.pexp || 0) && ep.love === kp.love && e.me.look.pet,
      `thú cưng giữ cấp/EXP/thân mật và vẫn đi theo (${ep && `${ep.id} cấp ${ep.plv || 1}, thân mật ${ep.love}`})`);
    ok(e.inv.equip.mount && e.inv.equip.mount.id === k.equip.mount.id && !!e.me.look.mount && e.me.s.mountSpd > 0, `thú cưỡi giữ nguyên sau khởi động lại (+${e.me.s.mountSpd}% tốc chạy)`);
    e.send('mailList');
    const ml = await e.wait('mail');
    const gm = ml.list.find((x) => x.title === 'Quà tích hợp');
    ok(ml.list.length === k.mail.length && gm && !gm.read, `hộp thư giữ đủ ${ml.list.length} thư sau khởi động lại`);
    const [mPet, mW] = gm ? gm.items : [];
    ok(mPet && mPet.plv === 7 && mPet.love === 66 && mW && mW.p === 3 && JSON.stringify(mW.gems) === '["gem_hoa_2"]',
      'đồ đính kèm thư giữ cấp/thân mật thú cưng, cấp cường hóa và ngọc khảm');
    if (gm) {
      e.send('mailClaim', { id: gm.id });
      await e.wait('inv', (m) => m.inv.some((it) => it && it.id === 'pet_fox'));
      const ip = e.inv.inv.find((it) => it && it.id === 'pet_fox');
      const iw = e.inv.inv.find((it) => it && it.id === 'w_kiem_0' && it.p === 3);
      ok(ip && ip.plv === 7 && ip.love === 66 && iw && JSON.stringify(iw.gems) === '["gem_hoa_2"]', 'nhận quà thư: thú cưng và vũ khí khảm ngọc vào hành trang nguyên vẹn');
    }
    if (k.arena) ok(e.me.arena && e.me.arena.elo === k.arena.elo && e.me.arena.win === k.arena.win, `điểm lôi đài giữ nguyên (${e.me.arena && e.me.arena.elo})`);
    e.ws.close();
  } catch (err) {
    failures++;
    console.error('  ✘ Lỗi:', err.message);
  }
  srv.kill('SIGTERM');
  await sleep(400);
}

main();
