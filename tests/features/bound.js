'use strict';

// Xu khóa & vật phẩm khóa: kiểm thử đơn vị (thế giới giả) + bot WebSocket
module.exports = { unit, bot };

const { ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');
const { Bot } = require('../lib/bot');

// Bộ ca kiểm thử đơn vị dùng Player/module thật với bản đồ giả (không cần server)
function unit(okFn) {
  console.log('0h. Xu khóa & vật phẩm khóa (thế giới giả)');
  const { Player, newChar } = require('../../src/server/core/player');
  const { makeItem, ITEMS, sellPrice } = require('../../src/shared/data/items');
  const { bind, cleanBound, cleanXuk, canTransfer, XUK_MAX } = require('../../src/shared/bound');
  const { Inventory } = require('../../src/server/modules/inventory');
  const { Storage } = require('../../src/server/modules/storage');
  const { Shop } = require('../../src/server/modules/shop');
  const { Trade } = require('../../src/server/modules/trade');
  const { Gems } = require('../../src/server/modules/gems');
  const { Mailer, hasGift, cleanMailbox } = require('../../src/server/modules/mail');
  const { giveReward } = require('../../src/server/services/reward');
  const ok2 = okFn || ok;

  const sent = [];
  const world = {
    nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; },
    players: new Map(), mods: {}, byName: new Map(),
  };
  const mk = (npcType) => {
    const p = new Player(world, { send: (t, d) => sent.push([t, d]) }, newChar('bunit', 'kiem', 'm'));
    p.map = { findNpc: () => ({ id: 'n', type: npcType || 'potion', x: p.x }), broadcast() {}, def: {} };
    return p;
  };
  const clearInv = (p) => { for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = null; };
  const boundStack = (p, id) => p.c.inv.some((it) => it && it.id === id && it.b === 1);
  const lastNote = () => (sent.filter((x) => x[0] === 'notice').pop() || [])[1] || {};

  // 1. canTransfer
  ok2(canTransfer({ id: 'hp1', q: 1 }) === true && canTransfer({ id: 'hp1', q: 1, b: 1 }) === false
    && canTransfer({ id: 'hp1', q: 1, exp: 1 }) === false && canTransfer(null) === false,
  'canTransfer: đồ thường được chuyển, đồ khóa/có hạn thì không');

  // 2. cleanBound / cleanXuk
  const b1 = cleanBound({ id: 'hp1', b: 'x' });
  const b2 = cleanBound({ id: 'hp1', b: 0 });
  ok2(b1.b === 1 && b2 && !('b' in b2) && cleanXuk('abc') === 0 && cleanXuk(-5) === 0 && cleanXuk(3e9) === 2e9,
    'cleanBound/cleanXuk: cờ khóa chỉ giữ b = 1, xu khóa kẹp 0..2 tỉ');

  // 3. Sanitize qua new Player
  const sc = newChar('bunit', 'kiem', 'm');
  sc.xuk = '12';
  sc.inv[3] = { id: 'hp1', q: 2, b: 'yes' };
  sc.storage = [{ id: 'hp1', q: 1, b: 0 }];
  sc.mail = [{ at: Date.now(), items: [{ id: 'hp1', q: 1, b: true }] }];
  const sp = new Player(world, { send() {} }, sc);
  ok2(sp.c.xuk === 12 && sp.c.inv[3].b === 1 && !('b' in sp.c.storage[0]) && sp.c.mail[0].items[0].b === 1
    && newChar('bunit2', 'kiem', 'm').xuk === 0,
  'sanitize: dọn xuk và cờ khóa trên túi/kho/thư, nhân vật cũ thiếu xuk nhận 0');

  // 4. Gộp chồng theo trạng thái khóa
  let p = mk();
  p.addItem('hp1', 5, 0, 0, 1);
  p.addItem('hp1', 3);
  p.addItemObj({ id: 'hp1', q: 2, b: 1 });
  const normal = p.c.inv.find((it) => it && it.id === 'hp1' && !it.b);
  const bound = p.c.inv.find((it) => it && it.id === 'hp1' && it.b);
  ok2(!!normal && normal.q === 13 && !!bound && bound.q === 7 && p.countItem('hp1') === 20,
    'chồng khóa không gộp vào chồng thường: hp1 thường 13, khóa 7, tổng 20');

  // 5. canAdd với túi đầy
  p = mk();
  for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = makeItem('hp1', 1);
  ok2(p.canAdd('hp1', 1, 0) === true && p.canAdd('hp1', 1, 1) === false,
    'canAdd: túi đầy chồng thường thì thêm được vào chồng thường, không có chỗ cho chồng khóa');

  // 6. canAddItems với món khóa
  ok2(p.canAddItems([{ id: 'hp1', q: 1, b: 1 }]) === false, 'canAddItems: không xếp được món khóa khi chỉ có chồng thường');

  // 7. removeItemB ưu tiên chồng khóa
  p = mk();
  p.addItem('hp1', 5, 0, 0, 1);
  const nb = p.removeItemB('hp1', 6);
  ok2(nb === 5 && p.countItem('hp1') === 9 && !boundStack(p, 'hp1'),
    'removeItemB: trừ chồng khóa trước (5), phần còn lại lấy từ chồng thường');
  const before = p.countItem('hp1');
  ok2(p.removeItemB('hp1', 999) === -1 && p.countItem('hp1') === before, 'removeItemB: thiếu hàng thì không trừ gì');

  // 8. payXu trừ xu khóa trước
  p = mk();
  p.c.xu = 1000;
  p.c.xuk = 300;
  ok2(p.payXu(500) === 300 && p.c.xuk === 0 && p.c.xu === 800, 'payXu: trừ hết xu khóa trước, thiếu mới trừ xu');
  ok2(p.payXu(5000) === -1 && p.c.xu === 800 && p.c.xuk === 0, 'payXu: không đủ thì trả -1, không trừ gì');
  ok2(p.payXu(100, true) === 0 && p.c.xu === 700 && p.c.xuk === 0, 'payXu noBound: chỉ trừ xu thường');
  p.c.xuk = 50;
  ok2(p.payXu(10) === 10 && p.c.xuk === 40 && p.c.xu === 700, 'payXu: dùng xu khóa còn lại');

  // 9. Trần xu khóa
  p = mk();
  p.gainXuk(3e9);
  ok2(p.c.xuk === XUK_MAX, 'gainXuk: chặn trần 2 tỉ');

  // 10. sortInv giữ 2 chồng khóa/thường riêng
  p = mk();
  clearInv(p);
  p.c.inv[1] = makeItem('hp1', 3);
  p.c.inv[20] = bind(makeItem('hp1', 4));
  new Inventory(world).sortInv(p);
  const stacks = p.c.inv.filter((it) => it && it.id === 'hp1');
  const ni = p.c.inv.findIndex((it) => it && it.id === 'hp1' && !it.b);
  const bi = p.c.inv.findIndex((it) => it && it.id === 'hp1' && it.b);
  ok2(stacks.length === 2 && p.countItem('hp1') === 7 && ni >= 0 && bi > ni,
    'sortInv: chồng thường đứng trước chồng khóa, không gộp chung');

  // 11. Kho: chồng khóa không gộp chồng thường
  p = mk('storage');
  p.c.storage[0] = makeItem('hp1', 5);
  p.c.inv[5] = bind(makeItem('hp1', 2));
  new Storage(world).storePut(p, { npc: 'n', slot: 5 });
  const stHp = p.c.storage.filter((it) => it && it.id === 'hp1');
  ok2(stHp.length === 2 && stHp.some((x) => x.b === 1 && x.q === 2) && stHp.some((x) => !x.b && x.q === 5),
    'storePut: kho giữ riêng chồng hp1 khóa (q2) và thường (q5)');

  // 12. Cửa hàng: mua/bán theo xu khóa
  const S = new Shop(world);
  p = mk('potion');
  p.c.xuk = 50;
  const xuStart = p.c.xu;
  S.buy(p, { npc: 'n', id: 'hp1', qty: 5 });
  ok2(p.c.xuk === 0 && p.c.xu === xuStart - 50 && boundStack(p, 'hp1'),
    'mua bằng xu có dùng xu khóa: hàng bị khóa, trừ 50 xu khóa + 50 xu');
  const xuAfter1 = p.c.xu;
  S.buy(p, { npc: 'n', id: 'hp1', qty: 5 });
  const bStacks = p.c.inv.filter((it) => it && it.id === 'hp1' && it.b).length;
  ok2(p.c.xu === xuAfter1 - 100 && bStacks === 1 && p.countItem('hp1') === 20,
    'hết xu khóa: lần mua sau vào chồng thường (không sinh chồng khóa mới)');
  p.c.xuk = 500;
  S.buy(p, { npc: 'n', id: 'hp1', qty: 5, nb: true });
  ok2(p.c.xu === xuAfter1 - 200 && p.c.xuk === 500,
    'bật "Không dùng xu khóa": chỉ trừ xu thường, giữ nguyên xu khóa');
  const luong0 = p.c.luong;
  S.buy(p, { npc: 'n', id: 'charm', qty: 1 });
  const charm = p.c.inv.find((it) => it && it.id === 'charm');
  ok2(p.c.luong === luong0 - 2 && !!charm && charm.b === 1, 'mua bằng lượng: trừ lượng, vật phẩm bị khóa');
  const sellSlot = p.c.inv.findIndex((it) => it && it.id === 'hp1' && it.b);
  const xkBefore = p.c.xuk;
  const xuBefore = p.c.xu;
  S.sell(p, { npc: 'n', slot: sellSlot, qty: 5 });
  ok2(p.c.xuk === xkBefore + 5 * sellPrice({ id: 'hp1' }) && p.c.xu === xuBefore,
    'bán đồ khóa cho NPC: nhận xu khóa, không cộng xu thường');
  p.c.xu = 0;
  p.c.xuk = 0;
  const snap = JSON.stringify(p.c.inv);
  S.buy(p, { npc: 'n', id: 'hp1', qty: 5 });
  ok2(/Không đủ xu/.test(lastNote().msg || '') && JSON.stringify(p.c.inv) === snap,
    'hết cả xu lẫn xu khóa: báo không đủ xu, túi không đổi');

  // 13. Giao dịch chặn đồ khóa, kiểm lại lúc chốt
  const T = new Trade(world);
  const tp = mk('potion');
  const to = mk('potion');
  world.players.set(tp.id, tp);
  world.players.set(to.id, to);
  tp.trade = { other: to.id, slots: [], items: [], xu: 0, lock: false, ok: false };
  to.trade = { other: tp.id, slots: [], items: [], xu: 0, lock: false, ok: false };
  const kSlot = 4;
  const nSlot = 5;
  tp.c.inv[kSlot] = bind(makeItem('hp1', 1));
  tp.c.inv[nSlot] = makeItem('mp1', 1);
  sent.length = 0;
  T.tradeSet(tp, { slots: [kSlot, nSlot], xu: 999999 });
  const warn = sent.map((x) => x[1] && x[1].msg).join(' ');
  ok2(tp.trade.slots.length === 1 && tp.trade.slots[0] === nSlot && /khóa/.test(warn) && tp.trade.xu === tp.c.xu,
    'tradeSet: bỏ ô khóa, giữ ô thường, tiền giao dịch chỉ là xu thường');
  tp.c.inv[nSlot].b = 1;
  T.tradeLock(tp);
  T.tradeLock(to);
  T.tradeOk(tp);
  sent.length = 0;
  T.tradeOk(to);
  const cancelled = sent.some((x) => x[0] === 'notice' && /thay đổi/.test((x[1] || {}).msg || ''));
  ok2(!tp.trade && cancelled && tp.c.inv[nSlot] && tp.c.inv[nSlot].id === 'mp1',
    'tradeOk: phát hiện ô bị khóa lúc chốt, hủy giao dịch, đồ không đổi chủ');

  // 14. Ngọc: khảm/gỡ/ghép lan cờ khóa
  const G = new Gems(world);
  const rnd0 = Math.random;
  try {
    p = mk('smith');
    p.c.xu = 1e7;
    clearInv(p);
    p.c.inv[0] = bind(makeItem('gem_hoa_1', 1));
    G.gemPut(p, { npc: 'n', src: 'eq', slot: 'weapon', hole: 0, gem: 0 });
    ok2(p.c.equip.weapon.b === 1, 'gemPut: khảm ngọc khóa vào đồ thường làm đồ bị khóa');
    G.gemTake(p, { npc: 'n', src: 'eq', slot: 'weapon', hole: 0 });
    ok2(p.c.inv.some((it) => it && it.id === 'gem_hoa_1' && it.b === 1),
      'gemTake: gỡ ngọc từ đồ khóa thì ngọc gỡ ra cũng khóa');

    p = mk('smith');
    p.c.xu = 1e7;
    clearInv(p);
    p.c.inv[0] = bind(makeItem('gem_thuy_1', 1));
    p.c.inv[1] = makeItem('gem_thuy_1', 2);
    Math.random = () => 0;
    p.lastGemMerge = 0;
    G.gemMerge(p, { npc: 'n', id: 'gem_thuy_1' });
    ok2(p.c.inv.some((it) => it && it.id === 'gem_thuy_2' && it.b === 1),
      'gemMerge: ghép có ít nhất 1 viên khóa thì viên mới bị khóa');

    p = mk('smith');
    p.c.xu = 1e7;
    clearInv(p);
    p.c.inv[0] = makeItem('gem_hoa_1', 3);
    Math.random = () => 0;
    p.lastGemMerge = 0;
    G.gemMerge(p, { npc: 'n', id: 'gem_hoa_1' });
    const m2 = p.c.inv.find((it) => it && it.id === 'gem_hoa_2');
    ok2(!!m2 && !m2.b, 'gemMerge: ghép toàn viên thường thì viên mới không khóa');
  } finally {
    Math.random = rnd0;
  }

  // 15. Rương khóa: xu khóa và món mở ra đều khóa
  const inv = new Inventory(world);
  world.mods.fashion = { giveFashion() {} };
  p = mk();
  clearInv(p);
  p.c.inv[0] = bind(makeItem('chest', 1));
  const xuo = p.c.xu;
  const xko = p.c.xuk;
  Math.random = () => 0.1;
  try {
    inv.useItem(p, { slot: 0 });
    ok2(p.c.xuk === xko + 720 && p.c.xu === xuo, 'rương khóa nhánh xu: nhận xu khóa, không đổi xu thường');
    p.c.inv[0] = bind(makeItem('chest', 1));
    Math.random = () => 0.4;
    inv.useItem(p, { slot: 0 });
    ok2(boundStack(p, 'stone1'), 'rương khóa nhánh đá: đá mở ra bị khóa');
  } finally {
    Math.random = rnd0;
  }

  // 16. giveReward theo cờ bound
  p = mk();
  clearInv(p);
  giveReward(p, { xu: 100, items: [['hp1', 2]] }, { bound: true });
  ok2(p.c.xuk === 100 && p.c.xu === 1000 && p.c.inv.some((it) => it && it.id === 'hp1' && it.b === 1 && it.q === 2),
    'giveReward bound: xu thành xu khóa, vật phẩm bị khóa');
  const p2 = mk();
  clearInv(p2);
  giveReward(p2, { xu: 100, items: [['hp1', 2]] });
  ok2(p2.c.xu === 1100 && p2.c.xuk === 0 && p2.c.inv.some((it) => it && it.id === 'hp1' && !it.b),
    'giveReward thường: xu và vật phẩm không khóa');

  // 17. Thư: trường xuk và dọn cờ
  p = mk();
  clearInv(p);
  const M = new Mailer(world);
  M.deliver(p.c, { title: 't', xuk: 77, items: [bind(makeItem('hp1', 1))] });
  const mail = p.c.mail[p.c.mail.length - 1];
  ok2(!!mail && hasGift(mail) && mail.xuk === 77 && mail.items[0].b === 1, 'thư có xu khóa được coi là còn quà và giữ cờ khóa');
  M.claim(p, { id: mail.id });
  ok2(p.c.xuk === 77 && p.c.inv.some((it) => it && it.id === 'hp1' && it.b === 1),
    'nhận thư: cộng xu khóa, món khóa vào túi');
  ok2(cleanMailbox([{ at: Date.now(), xuk: 'abc', items: [] }])[0].xuk === 0, 'cleanMailbox: xuk sai kiểu thành 0');

  // 18. canAddItems(minus) trừ theo đúng thứ tự removeItem (chồng khóa trước), như đổi quà lễ hội
  const eqId = Object.keys(ITEMS).find((id) => ITEMS[id].type === 'equip' && !ITEMS[id].fashion && ITEMS[id].slot !== 'pet');
  const fullWith = (p0, a, b) => {
    for (let i = 0; i < p0.c.inv.length; i++) p0.c.inv[i] = makeItem('hp2', 1);
    p0.c.inv[0] = a;
    p0.c.inv[1] = b;
  };
  p = mk();
  fullWith(p, makeItem('hp1', 5), bind(makeItem('hp1', 50)));
  const pred1 = p.canAddItems([makeItem(eqId, 1)], [['hp1', 5]]);
  p.removeItem('hp1', 5);
  ok2(pred1 === false && p.freeSlots() === 0 && p.c.inv[0].q === 5 && p.c.inv[1].q === 45,
    'canAddItems minus: chồng khóa bị trừ trước nên không trống ô, báo không đủ chỗ (khớp removeItem)');
  p = mk();
  fullWith(p, makeItem('hp1', 50), bind(makeItem('hp1', 5)));
  const pred2 = p.canAddItems([makeItem(eqId, 1)], [['hp1', 5]]);
  p.removeItem('hp1', 5);
  ok2(pred2 === true && p.addItemObj(makeItem(eqId, 1)) === true,
    'canAddItems minus: chồng khóa trừ hết thì ô trống ra, món thưởng vào được thật');

  // 19. Ghép ngọc trả lại đúng số viên khóa (thất bại / túi đầy)
  try {
    p = mk('smith');
    p.c.xu = 1e7;
    clearInv(p);
    p.c.inv[0] = makeItem('gem_hoa_2', 2);
    p.c.inv[1] = bind(makeItem('gem_hoa_2', 1));
    // cấp 1 ghép chắc chắn thành công, dùng cấp 2 (90%) để ép thất bại
    Math.random = () => 0.999;
    p.lastGemMerge = 0;
    G.gemMerge(p, { npc: 'n', id: 'gem_hoa_2' });
    const gq = (b) => p.c.inv.reduce((n, it) => n + (it && it.id === 'gem_hoa_2' && !!it.b === b ? it.q : 0), 0);
    ok2(gq(true) === 1 && gq(false) === 1 && !p.c.inv.some((it) => it && it.id === 'gem_hoa_3'),
      'gemMerge thất bại: trả 1 viên khóa + 1 viên thường (mất 1 viên thường)');

    p = mk('smith');
    p.c.xu = 1e7;
    for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = makeItem('hp2', 1);
    p.c.inv[0] = bind(makeItem('gem_thuy_1', 4));
    p.c.inv[1] = makeItem('gem_thuy_1', 2);
    const xu0 = p.c.xu;
    Math.random = () => 0;
    p.lastGemMerge = 0;
    G.gemMerge(p, { npc: 'n', id: 'gem_thuy_1' });
    const tq = (b) => p.c.inv.reduce((n, it) => n + (it && it.id === 'gem_thuy_1' && !!it.b === b ? it.q : 0), 0);
    ok2(tq(true) === 4 && tq(false) === 2 && p.c.xu === xu0 && !p.c.inv.some((it) => it && it.id === 'gem_thuy_2'),
      'gemMerge túi đầy: trả lại nguyên 4 viên khóa + 2 viên thường, không trừ xu');
  } finally {
    Math.random = rnd0;
  }

  // 20. Thức ăn khóa làm thú cưng khóa theo
  const { Pets } = require('../../src/server/modules/pets');
  const foodId = Object.keys(ITEMS).find((id) => ITEMS[id].type === 'petfood');
  const PT = new Pets(world);
  p = mk();
  clearInv(p);
  p.c.equip.pet = makeItem('pet_slime', 1);
  p.c.inv[0] = makeItem(foodId, 1);
  PT.feedPet(p, 0, ITEMS[foodId], Date.now());
  ok2(!p.c.equip.pet.b, 'cho thú ăn thức ăn thường: thú không khóa');
  p.c.inv[0] = bind(makeItem(foodId, 1));
  p.lastFeed = 0;
  PT.feedPet(p, 0, ITEMS[foodId], Date.now());
  ok2(p.c.equip.pet.b === 1 && !p.c.inv[0], 'cho thú ăn thức ăn khóa: thú bị khóa');

  // 21. Rương thưởng hằng ngày khóa: túi đầy thì gửi thủ kho, không mất
  const { Quest } = require('../../src/server/modules/quest');
  const Q = new Quest(world);
  // thưởng EXP có thể lên cấp: thế giới giả không có xử lý lên cấp
  if (!world.onLevelUp) world.onLevelUp = () => {};
  p = mk();
  for (let i = 0; i < p.c.inv.length; i++) p.c.inv[i] = makeItem('hp2', 1);
  p.c.inv[0] = makeItem('chest', 1);
  const d = Q.ensureDaily(p);
  d.done = 4;
  d.task = { m: Object.keys(require('../../src/shared/data/monsters').MONSTERS)[0], n: 1, prog: 1 };
  Q.finishDaily(p);
  ok2(p.c.storage.some((it) => it && it.id === 'chest' && it.b === 1) && p.c.inv[0].q === 1 && !p.c.inv[0].b,
    'nhiệm vụ hằng ngày lần 5, túi đầy: rương khóa vào thủ kho, chồng rương thường giữ nguyên');
}

// Hai bot thật: đăng ký, mua/bán ở Tiệm Thuốc, giao dịch chặn đồ khóa, giftcode
async function bot() {
  console.log('7z. Xu khóa & vật phẩm khóa');
  const ok3 = ok;
  const say = (b, msg, re) => {
    b.send('chat', { ch: 'map', msg });
    return b.wait('chat', (m) => m.ch === 'sys' && re.test(m.msg));
  };
  const login = async (u, name, create) => {
    const b = new Bot(name);
    await b.connect();
    b.send(create ? 'register' : 'login', { u, p: 'secret123' });
    await b.wait('auth').catch(() => null);
    await b.wait('chars');
    if (create) {
      b.send('createChar', { name, cls: 'kiem', gender: 'm' });
      await b.wait('chars', (m) => m.chars.some((c) => c.name === name));
    }
    b.send('selectChar', { name });
    await Promise.all([b.wait('enterMap'), b.wait('inv')]);
    return b;
  };
  const a = await login('khoa_a', 'KhoaA', true);
  const b = await login('khoa_b', 'KhoaB', true);

  await say(a, '/lv 10', /Cấp hiện tại/);
  await a.wait('me', (m) => m.level === 10);
  await say(b, '/lv 10', /Cấp hiện tại/);
  await b.wait('me', (m) => m.level === 10);

  // A thêm xu khóa: không đổi xu thường
  const xuA0 = a.me.xu;
  ok3(!!(await say(a, '/xuk 5000', /xu khóa/)), 'admin /xuk: báo cộng xu khóa');
  await a.wait('me', (m) => m.xuk === 5000);
  ok3(a.me.xuk === 5000 && a.me.xu === xuA0, 'xu khóa tách khỏi xu thường (xu giữ nguyên)');

  // Mua ở Tiệm Thuốc bằng xu khóa
  await a.walkTo(470);
  a.send('npc', { id: 'v_fire_potion' });
  await a.wait('shop');
  const xuA1 = a.me.xu;
  a.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5 });
  await a.wait('notice', (m) => /Đã mua/.test(m.msg));
  // gói me và inv tới riêng: chờ cả hai trước khi kiểm
  await Promise.all([a.wait('me', (m) => m.xuk === 4900), a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'hp1' && it.b === 1))]).catch(() => null);
  ok3(a.me.xuk === 4900 && a.me.xu === xuA1 && a.inv.inv.some((it) => it && it.id === 'hp1' && it.b === 1)
    && a.inv.inv.some((it) => it && it.id === 'hp1' && !it.b),
  'mua 5 bình HP: trừ 100 xu khóa, hàng về bị khóa, chồng thường vẫn riêng');

  const hpQ = (b) => a.inv.inv.reduce((n, it) => n + (it && it.id === 'hp1' && !!it.b === b ? it.q : 0), 0);
  const hpB0 = hpQ(true);
  const hpN0 = hpQ(false);
  a.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5, nb: true });
  await a.wait('notice', (m) => /Đã mua/.test(m.msg));
  await Promise.all([a.wait('me', (m) => m.xu === xuA1 - 100),
    a.wait('inv', (m) => m.inv.reduce((n, it) => n + (it && it.id === 'hp1' && !it.b ? it.q : 0), 0) === hpN0 + 5)]).catch(() => null);
  ok3(a.me.xu === xuA1 - 100 && a.me.xuk === 4900 && hpQ(true) === hpB0 && hpQ(false) === hpN0 + 5,
    'bật "không dùng xu khóa": trừ xu thường, hàng vào chồng thường (+5), chồng khóa giữ nguyên, xu khóa giữ nguyên');

  // Bán 1 bình từ chồng khóa: nhận xu khóa
  const bSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp1' && it.b === 1);
  a.send('sell', { npc: 'v_fire_potion', slot: bSlot, qty: 1 });
  ok3(!!(await a.wait('notice', (m) => /xu khóa/.test(m.msg))), 'bán đồ khóa: thông báo nhận xu khóa');
  await a.wait('me', (m) => m.xuk === 4905);
  ok3(a.me.xuk === 4905, 'bán 1 bình khóa: cộng 5 xu khóa');

  // Đồ khóa không đặt vào giao dịch được
  a.send('chat', { ch: 'map', msg: '/item hat_0 1 0 0 k' });
  await a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'hat_0' && it.b === 1));
  const hatSlot = a.inv.inv.findIndex((it) => it && it.id === 'hat_0' && it.b === 1);
  ok3(hatSlot >= 0, 'admin /item ... k: tạo được đồ khóa');
  await b.walkTo(470);
  a.send('tradeReq', { name: 'KhoaB' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KhoaA' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [hatSlot], xu: 999999 });
  const warn = await a.wait('notice', (m) => /khóa/.test(m.msg));
  const tv = await a.wait('trade', (m) => m.mine.slots.length === 0);
  ok3(!!warn && tv.mine.slots.length === 0 && tv.mine.xu <= a.me.xu,
    'không đặt được đồ khóa vào giao dịch; tiền giao dịch chỉ tính xu thường');
  a.send('tradeCancel');
  await a.wait('tradeEnd');

  // Giftcode trao xu khóa + đồ khóa
  ok3(!!(await say(a, '/code KHOATEST 1000 0 hp2 3 1', /Đã tạo giftcode/)), 'admin tạo giftcode');
  const xk2 = a.me.xuk;
  a.send('giftcode', { code: 'KHOATEST' });
  const cr = await a.wait('codeResult');
  ok3(cr.ok && /xu khóa/.test(cr.msg), 'giftcode: quà mô tả bằng xu khóa');
  await Promise.all([a.wait('me', (m) => m.xuk === xk2 + 1000), a.wait('inv', (m) => m.inv.some((it) => it && it.id === 'hp2' && it.b === 1))]).catch(() => null);
  ok3(a.me.xuk === xk2 + 1000 && a.inv.inv.some((it) => it && it.id === 'hp2' && it.b === 1),
    'giftcode: cộng xu khóa và vật phẩm bị khóa');

  a.ws.close();
  b.ws.close();
}
