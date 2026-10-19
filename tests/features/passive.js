'use strict';

// Kỹ năng nội tại: công thức (không cần server), học bằng sách, chặn đọc sách, hồi chakra, mua/bán sách.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { fakeDb } = require('../lib/helpers');

// Công thức nội tại kiểm thử trực tiếp (không cần server): cộng dồn chỉ số, kháng hệ khắc, sát thương chí mạng
function passiveUnitTests() {
  console.log('0. Công thức kỹ năng nội tại');
  const { passiveBonus } = require('../../src/shared/data/skills');
  const { Combat } = require('../../src/server/core/combat');
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
    const { MONSTERS } = require('../../src/shared/data/monsters');
    const drops = cb.rollDrops({ def: MONSTERS.boss_god, boss: true }).filter((x) => x.it).map((x) => x.it.id);
    ok(drops.includes('book_k9') && drops.includes('book_q9'), 'boss rơi sách nội tại qua rollDrops');
  } finally {
    Math.random = rnd;
  }
  statCapUnitTests();
  bookUnitTests();
}

// Trần chỉ số của Player.recalc: cộng mọi nguồn thật (dòng trang bị, ngọc, thú cưỡi, nội tại tối đa, buff kỹ năng, đồ ăn)
// rồi thêm một móc stats thổi phồng eq/buf/pas/mountSpd: chí mạng 60, né 45, kháng 50, tốc 100, hút máu GEM.lifestealCap
function statCapUnitTests() {
  const { Player, newChar } = require('../../src/server/core/player');
  const { makeItem } = require('../../src/shared/data/items');
  const { GEM } = require('../../src/shared/data/items/gems');
  const { SKILLS, SKILL_MAX_LV } = require('../../src/shared/data/skills');
  const modules = require('../../src/server/core/modules');
  const world = { nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; }, social: { handle() {} } };
  const p = new Player(world, { send() {} }, newChar('capunit', 'kunai', 'm'));
  const c = p.c;
  c.level = 120;
  for (const [id, sk] of Object.entries(SKILLS)) if (sk.cls === 'kunai' && sk.type === 'passive') c.skills[id] = SKILL_MAX_LV;
  c.equip.weapon = { ...makeItem('w_kunai_11'), o: [['crit', 500], ['dodge', 500], ['spd', 500], ['lifesteal', 500]], gems: ['gem_huyet_10', null, null] };
  c.equip.mount = makeItem('mount_qilin');
  for (const stat of ['crit', 'dodge', 'spd']) p.buffs[`x_${stat}`] = { stat, v: 500, until: Date.now() + 60000, name: stat };
  c.buffs.food_atk = Date.now() + 60000;
  p.recalc();
  const real = { ...p.s };
  ok(real.crit === 60 && real.dodge === 45 && real.spd === 60 + real.mountSpd && real.mountSpd === 35 && real.lifesteal === GEM.lifestealCap && real.resist > 0 && real.resist <= 50,
    `trần chỉ số với nguồn thật: chí mạng ${real.crit}, né ${real.dodge}, tốc ${real.spd} (60 + thú cưỡi ${real.mountSpd}), hút máu ${real.lifesteal}, kháng ${real.resist}`);
  const list = modules.load().hooks.stats;
  const extra = {
    mod: { name: 'capunit' },
    fn(t) {
      for (const k of ['crit', 'dodge', 'spd', 'lifesteal']) t.eq[k] += 1000;
      for (const k of ['crit', 'dodge', 'spd']) t.buf[k] += 1000;
      for (const k of ['crit', 'dodge', 'spd', 'resist']) t.pas[k] = (t.pas[k] || 0) + 1000;
      t.mountSpd += 1000;
    },
  };
  list.push(extra);
  try {
    p.recalc();
  } finally {
    list.splice(list.indexOf(extra), 1);
  }
  const s = p.s;
  ok(s.crit === 60 && s.dodge === 45 && s.resist === 50 && s.spd === 100 && s.lifesteal === GEM.lifestealCap,
    `trần chỉ số không vượt khi cộng mọi nguồn: chí mạng 60, né 45, kháng 50, tốc chạy 100, hút máu ${GEM.lifestealCap} (GEM.lifestealCap)`);
  p.recalc();
  ok(p.s.crit === real.crit && p.s.resist === real.resist, 'gỡ móc thử: chỉ số về như trước');
}

// Sách nội tại: giá 30/60/100 lượng theo cấp 15/35/50, Tiệm Thuốc bán đủ, mỗi cuốn có boss rơi (books(req, ch))
function bookUnitTests() {
  const { SKILLS } = require('../../src/shared/data/skills');
  const { ITEMS, SHOPS } = require('../../src/shared/data/items');
  const { MONSTERS } = require('../../src/shared/data/monsters');
  const PRICE = { 15: 30, 35: 60, 50: 100 };
  const pas = Object.values(SKILLS).filter((sk) => sk.type === 'passive');
  const bad = pas.filter((sk) => !PRICE[sk.req] || !ITEMS[sk.book] || ITEMS[sk.book].priceLuong !== PRICE[sk.req]);
  const seen = new Set(pas.map((sk) => ITEMS[sk.book] && ITEMS[sk.book].priceLuong));
  ok(pas.length >= 18 && !bad.length && [30, 60, 100].every((v) => seen.has(v)),
    `sách nội tại giá 30/60/100 lượng theo cấp yêu cầu 15/35/50 (${pas.length} cuốn${bad.length ? `, sai: ${bad.map((sk) => sk.book).join(',')}` : ''})`);
  const shop = SHOPS.potion.luong;
  ok(SHOPS.potion.name === 'Tiệm Thuốc' && pas.every((sk) => shop.includes(sk.book)), 'Tiệm Thuốc bán mọi sách nội tại bằng lượng');
  const dropped = new Set();
  for (const m of Object.values(MONSTERS)) if (m.boss) for (const [id] of m.drops || []) dropped.add(id);
  const noDrop = pas.filter((sk) => !dropped.has(sk.book)).map((sk) => sk.book);
  ok(!noDrop.length, `mọi sách nội tại có boss rơi (books(req, ch) trong BOSS_DROPS)${noDrop.length ? `: thiếu ${noDrop.join(',')}` : ''}`);
}

// Đọc sách học nội tại, nâng cấp bằng điểm kỹ năng, mua sách bằng lượng, lập gia tộc (dùng nhân vật cấp 120)
async function passiveBookTest(ctx) {
  const { a } = ctx;
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
}

// Chặn đọc sách khi chưa đủ cấp / đang giao dịch, hồi chakra khi giao chiến, bán và mua sách, sắp xếp hành trang
async function passiveRulesTest(ctx) {
  const { a, b } = ctx;
  const bookAt = (id) => a.inv.inv.findIndex((it) => it && it.id === id);
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
}

module.exports = { passiveUnitTests, passiveBookTest, passiveRulesTest };
