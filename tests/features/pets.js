'use strict';

// Thú cưng: công thức và kỹ năng (thế giới giả), nuôi thú qua WebSocket thật.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { seek } = require('../lib/helpers');

// Thú cưng bằng thế giới giả (Player/GameMap thật): chỉ số theo cấp, chia EXP, kỹ năng nhặt đồ / hồi máu, thân mật
function petUnitTests() {
  console.log('0e. Thú cưng (công thức & kỹ năng, thế giới giả)');
  const I = require('../../src/shared/data/items');
  const { PET, PET_SKILLS, cleanPet } = require('../../src/shared/data/pets');
  const { Player, newChar } = require('../../src/server/core/player');
  const { GameMap } = require('../../src/server/core/map');
  const { MAPS, GROUND } = require('../../src/shared/data/maps');
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

module.exports = { petUnitTests, petTest };
