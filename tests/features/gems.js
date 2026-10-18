'use strict';

// Ngọc khảm: công thức, ghép ngọc, hút máu (không cần server) và khảm/ghép qua WebSocket thật.
const { sleep, ok, serverLog } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { seek, fakeDb } = require('../lib/helpers');

// Ngọc khảm: chỉ số, dọn dữ liệu hỏng, giá bán, rơi đồ, hút máu (không cần server)
function gemUnitTests() {
  console.log('0d. Ngọc khảm (công thức)');
  const I = require('../../src/shared/data/items');
  const { Combat } = require('../../src/server/core/combat');
  const { MONSTERS } = require('../../src/shared/data/monsters');
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
  const { Player, newChar } = require('../../src/server/core/player');
  const { Gems: Actions } = require('../../src/server/modules/gems');
  const { Combat } = require('../../src/server/core/combat');
  const I = require('../../src/shared/data/items');
  const sent = [];
  const world = { nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; }, social: { handle() {} } };
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
    ok(I.GEM.lifestealCap === 10, 'trần hút máu chung là 10%');
    const r3 = swing({ ...mon(1e6), boss: true });
    ok(r3.dmg > 0 && r3.healed === Math.round((r3.dmg * ls * I.GEM.lifestealBoss) / 100), 'đánh boss: hút máu chỉ tính 50%');
  } finally {
    Math.random = rnd;
  }
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
  a.send('npcAct', { id: npc, a: 'upgrade' });
  const ou2 = await a.wait('openUi');
  a.send('npcAct', { id: npc, a: 'sellui' });
  const sh2 = await a.wait('shop');
  ok(ou2.ui === 'upgrade' && !ou2.tab && ou2.npc === npc && sh2.items.length > 0, 'Thợ Rèn: mục Cường hóa mở cửa sổ cường hóa, mục Bán vật phẩm mở cửa hàng');
  // (bot có thể đã nhặt ngọc rơi ngẫu nhiên ở các phần trước: so theo số lượng trước/sau)
  const t0 = a.me.xu + (a.me.xuk || 0);
  const h1 = cnt('gem_hoa_1');
  const h2 = cnt('gem_hoa_2');
  a.send('buy', { npc, id: 'gem_hoa_1', qty: 4 });
  await a.wait('inv', (m) => m.inv.reduce((n, it) => n + (it && it.id === 'gem_hoa_1' ? it.q : 0), 0) === h1 + 4);
  await a.wait('me', (m) => m.xu + (m.xuk || 0) === t0 - 6000).catch(() => null);
  ok(a.me.xu + (a.me.xuk || 0) === t0 - 6000 && cnt('gem_hoa_1') === h1 + 4, 'mua 4 Hỏa Tâm Ngọc Cấp 1 trừ đúng 6.000 (xu khóa trước)');

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
  const logAt = serverLog().length;
  const eqBefore = JSON.stringify(a.inv.equip);
  for (const slot of ['__proto__', 'constructor', 'pet', 'mask']) a.send('gemPut', { npc, src: 'eq', slot, hole: 0, gem: at('gem_hoa_1') });
  a.send('gemTake', { npc, src: 'eq', slot: '__proto__', hole: 0 });
  a.send('gemMerge', { npc, id: '__proto__' });
  ok(!!(await note(/chọn ngọc cần ghép/)), 'ghép ngọc với id "__proto__": bị từ chối');
  a.send('gemMerge', { npc, id: 'hp1' });
  ok(!!(await note(/chọn ngọc cần ghép/)), 'ghép vật phẩm không phải ngọc: bị từ chối');
  await sleep(150);
  ok(JSON.stringify(a.inv.equip) === eqBefore && cnt('gem_hoa_1') === h1 + 4 && !/Lỗi xử lý gem/.test(serverLog().slice(logAt)),
    'ô "__proto__"/thú cưng/thời trang: không khảm được, server không lỗi');
  a.send('gemTake', { npc, src: 'eq', slot: 'weapon', hole: 2 });
  ok(!!(await note(/đang trống/)), 'gỡ ở lỗ trống: bị từ chối');

  // ghép: 3 viên cấp 1 -> 1 viên cấp 2 (tỉ lệ 100%), trừ xu
  a.send('gemMerge', { npc, id: 'gem_huyet_9' });
  ok(!!(await note(/Cần 3 viên/)), 'chưa đủ 3 viên: không ghép được');
  a.send('gemMerge', { npc, id: 'gem_tho_10' });
  ok(!!(await note(/cấp cao nhất/)), 'ngọc cấp 10: không ghép tiếp được');
  const t1 = a.me.xu + (a.me.xuk || 0);
  a.send('gemMerge', { npc, id: 'gem_hoa_1' });
  const mr = await result('merge');
  await a.wait('inv', (m) => m.inv.reduce((n, it) => n + (it && it.id === 'gem_hoa_2' ? it.q : 0), 0) === h2 + 1).catch(() => null);
  await sleep(120);
  ok(!!mr && mr.ok && mr.id === 'gem_hoa_2' && cnt('gem_hoa_1') === h1 + 1 && cnt('gem_hoa_2') === h2 + 1 && a.me.xu + (a.me.xuk || 0) === t1 - 1000,
    'ghép 3 Hỏa Tâm Ngọc Cấp 1 thành 1 viên Cấp 2, trừ 1.000 (xu khóa trước)');

  // gỡ ngọc: tốn xu, ngọc về hành trang, chỉ số trở lại
  const t2 = a.me.xu + (a.me.xuk || 0);
  a.send('gemTake', { npc, src: 'eq', slot: 'weapon', hole: 0 });
  const tr = await result('take');
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'gem_loi_2')).catch(() => null);
  await sleep(150);
  ok(!!tr && tr.cost === 1100 && a.me.xu + (a.me.xuk || 0) === t2 - 1100 && at('gem_loi_2') >= 0 && !a.inv.equip.weapon.gems, 'gỡ Lôi Quang Ngọc Cấp 2: trừ 1.100 (xu khóa trước), ngọc về hành trang');
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
  const I = require('../../src/shared/data/items');
  await give('/item hat_4 1', 'hat_4');
  await give('/item gem_thuy_2 1', 'gem_thuy_2');
  a.send('gemPut', { npc, src: 'inv', slot: at('hat_4'), hole: 0, gem: at('gem_thuy_2') });
  await result('put');
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'hat_4' && it.gems));
  const hat = a.inv.inv[at('hat_4')];
  const price = I.sellPrice(hat);
  ok(price === I.sellPrice({ ...hat, gems: undefined }) + Math.floor(I.ITEMS.gem_thuy_2.price * 0.25), `giá bán nón có ngọc gồm giá ngọc (${price} xu)`);
  const t3 = a.me.xu + (a.me.xuk || 0);
  a.send('sell', { npc, slot: at('hat_4'), qty: 1 });
  ok(!!(await note(new RegExp(`Đã bán Nón Vàng được ${price} xu`))), 'bán nón có ngọc: thông báo đúng giá');
  await Promise.all([a.wait('me', (m) => m.xu + (m.xuk || 0) === t3 + price), a.wait('inv', (m) => !m.inv.some((it) => it && it.id === 'hat_4'))]).catch(() => null);
  ok(a.me.xu + (a.me.xuk || 0) === t3 + price && at('hat_4') < 0, 'bán món có ngọc: cộng đúng tiền, món (kèm ngọc) rời hành trang');
  b.ws.close();
}

module.exports = { gemUnitTests, gemTest };
