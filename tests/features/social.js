'use strict';

// Nhiều người chơi: dịch chuyển, nhóm, chat nhóm/bản đồ, giao dịch.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');

// Giao dịch trên thế giới giả (Player + module trade thật): trần xu, vị trí lúc chốt, cờ chiến trường
function tradeUnitTests() {
  console.log('0t. Giao dịch (thế giới giả): trần xu, vị trí lúc chốt, chiến trường');
  const { Player, newChar } = require('../../src/server/core/player');
  const { Trade } = require('../../src/server/modules/trade');
  const { invite } = require('../../src/server/modules/invites');
  const { makeItem } = require('../../src/shared/data/items');
  const { XU_MAX } = require('../../src/shared/constants');
  const sent = [];
  const world = { nextPid: 1, db: { dirty: false }, players: new Map(), byName: new Map(), mods: {} };
  const map = { id: 'v_fire', broadcast() {}, def: {} };
  const mk = (name) => {
    const p = new Player(world, { send: (t, d) => sent.push([name, t, d]) }, newChar(name, 'kiem', 'm'));
    p.c.level = 10;
    p.map = map;
    p.x = 500;
    world.players.set(p.id, p);
    world.byName.set(name.toLowerCase(), p);
    return p;
  };
  const T = new Trade(world);
  const A = mk('TradeA');
  const B = mk('TradeB');
  const open = () => {
    for (const p of [A, B]) p.trade = { other: (p === A ? B : A).id, slots: [], items: [], xu: 0, lock: false, ok: false };
  };
  // một lượt đầy đủ: đặt xu (+ món), khóa, hai bên xác nhận; trả về gói tradeEnd cuối của A
  const run = (xa, xb, slotsA = []) => {
    open();
    sent.length = 0;
    T.tradeSet(A, { slots: slotsA, xu: xa });
    T.tradeSet(B, { slots: [], xu: xb });
    T.tradeLock(A);
    T.tradeLock(B);
    T.tradeOk(A);
    T.tradeOk(B);
    const end = sent.filter((x) => x[0] === 'TradeA' && x[1] === 'tradeEnd').pop();
    return end ? end[2] : null;
  };

  // 1. trần xu: A 2 tỉ, B đưa 1 tỉ
  A.c.xu = 2e9;
  B.c.xu = 1e9;
  const r1 = run(0, 1e9);
  const note = sent.filter((x) => x[1] === 'notice').map((x) => x[2].msg).join(' | ');
  ok(XU_MAX === 2e9 && r1 && r1.ok === false && A.c.xu === 2e9 && B.c.xu === 1e9 && !A.trade && !B.trade && /giới hạn xu/.test(note),
    `trần xu: A 2.000.000.000 xu, B đặt 1.000.000.000 → giao dịch hủy, A vẫn ${A.c.xu}, B vẫn ${B.c.xu}`);

  // 2. tương đương gddwork/lab/soc/trade-cap.js: quét mọi tổ hợp xu mang theo × xu đặt, không bên nào vượt trần
  const vals = [0, 1, 5e6, 1e9, 1.5e9, XU_MAX - 1, XU_MAX];
  let combos = 0;
  let bad = [];
  let passed = 0;
  for (const ha of vals) for (const hb of vals) for (const oa of vals) for (const ob of vals) {
    if (oa > ha || ob > hb) continue;
    combos++;
    A.c.xu = ha;
    B.c.xu = hb;
    const r = run(oa, ob);
    const over = A.c.xu > XU_MAX || B.c.xu > XU_MAX;
    const kept = r && !r.ok && A.c.xu === ha && B.c.xu === hb;
    const moved = r && r.ok && A.c.xu === ha - oa + ob && B.c.xu === hb - ob + oa;
    const shouldPass = ha - oa + ob <= XU_MAX && hb - ob + oa <= XU_MAX;
    if (over || !(shouldPass ? moved : kept)) bad.push(`${ha}/${hb}/${oa}/${ob} → ${A.c.xu}/${B.c.xu}`);
    if (moved) passed++;
  }
  ok(!bad.length && combos > 100 && passed > 0,
    `trade-cap: ${combos} tổ hợp xu, không bên nào vượt trần 2e9, hợp lệ thì chuyển đúng (${passed}), vượt thì giữ nguyên${bad.length ? ` (lỗi: ${bad.slice(0, 3).join('; ')})` : ''}`);

  // 3. vị trí lúc chốt: khóa xong B đi xa 400 px → hủy, đồ không đổi chủ
  A.c.xu = 1000;
  B.c.xu = 1000;
  for (let i = 0; i < A.c.inv.length; i++) A.c.inv[i] = null;
  A.c.inv[0] = makeItem('hp1', 3);
  const pot = A.c.inv[0];
  open();
  T.tradeSet(A, { slots: [0], xu: 100 });
  T.tradeLock(A);
  T.tradeLock(B);
  B.x = A.x + 400;
  sent.length = 0;
  T.tradeOk(A);
  T.tradeOk(B);
  const endA = sent.find((x) => x[0] === 'TradeA' && x[1] === 'tradeEnd');
  ok(endA && endA[2].ok === false && A.c.inv[0] === pot && !B.c.inv.includes(pot) && A.c.xu === 1000 && B.c.xu === 1000,
    'vị trí lúc chốt: B đi xa 400 px sau khi khóa → tradeEnd ok: false, đồ và xu không đổi chủ');
  B.x = A.x;
  A.dead = true;
  open();
  T.tradeLock(A);
  T.tradeLock(B);
  T.tradeOk(A);
  T.tradeOk(B);
  ok(!A.trade && !B.trade && A.c.inv[0] === pot, 'một bên gục trước khi chốt → giao dịch hủy');
  A.dead = false;

  // 4. cờ chiến trường (p.bf) / chiến gia tộc (p.cw): không mời, không nhận lời
  const blocked = [];
  for (const flag of ['bf', 'cw']) for (const who of ['A', 'B']) {
    const P = who === 'A' ? A : B;
    A.trade = null;
    B.trade = null;
    A.invites = {};
    B.invites = {};
    P[flag] = 1;
    sent.length = 0;
    T.tradeReq(A, { name: 'TradeB' });
    const reqBlocked = !sent.some((x) => x[0] === 'TradeB' && x[1] === 'invite') && !Object.keys(B.invites).length;
    // lời mời gửi trước khi vào chiến trường: lúc nhận phải kiểm lại
    P[flag] = 0;
    invite(A, B, 'trade');
    P[flag] = 1;
    T.tradeAccept(B, { from: 'TradeA' });
    const accBlocked = !A.trade && !B.trade;
    P[flag] = 0;
    if (!(reqBlocked && accBlocked)) blocked.push(`${flag}@${who}`);
  }
  A.invites = {};
  B.invites = {};
  T.tradeReq(A, { name: 'TradeB' });
  T.tradeAccept(B, { from: 'TradeA' });
  ok(!blocked.length && !!A.trade && !!B.trade, `tradeReq/tradeAccept từ chối khi một bên có p.bf hoặc p.cw (cả 2 phía); không cờ thì mở được${blocked.length ? ` (lọt: ${blocked.join(', ')})` : ''}`);
  T.cancelTrade(A);
}

async function socialTest(ctx) {
  const { a } = ctx;
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
  const potSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp1' && !it.b);
  a.send('tradeSet', { slots: [potSlot], xu: 500 });
  await b.wait('trade', (m) => m.theirs.xu === 500);
  a.send('tradeLock');
  b.send('tradeLock');
  await sleep(120);
  a.send('tradeOk');
  b.send('tradeOk');
  await b.wait('tradeEnd');
  await sleep(150);
  ok(b.me.xu === 1500 && b.inv.inv.reduce((n, it) => n + (it && it.id === 'hp1' ? it.q : 0), 0) >= 15, 'giao dịch xu + vật phẩm thành công');

  // khóa xong B đi xa 400 px, hai bên xác nhận → hủy, đồ không đổi chủ
  const countHp = (bot) => bot.inv.inv.reduce((n, it) => n + (it && it.id === 'hp1' ? it.q : 0), 0);
  await sleep(1100);
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  const hpA0 = countHp(a);
  const hpB0 = countHp(b);
  const xuA0 = a.me.xu;
  const xuB0 = b.me.xu;
  const slot2 = a.inv.inv.findIndex((it) => it && it.id === 'hp1' && !it.b);
  a.send('tradeSet', { slots: [slot2], xu: 200 });
  await b.wait('trade', (m) => m.theirs.xu === 200);
  a.send('tradeLock');
  b.send('tradeLock');
  await b.wait('trade', (m) => m.mine.lock && m.theirs.lock);
  const ax = a.x;
  await b.walkTo(ax + 400 > 1600 ? ax - 400 : ax + 400);
  ok(Math.abs(b.x - a.x) >= 390, `B đi xa ${Math.round(Math.abs(b.x - a.x))} px sau khi hai bên khóa`);
  a.send('tradeOk');
  b.send('tradeOk');
  const endA = await a.wait('tradeEnd');
  const endB = await b.wait('tradeEnd');
  await sleep(300);
  ok(endA.ok === false && endB.ok === false && countHp(a) === hpA0 && countHp(b) === hpB0 && a.me.xu === xuA0 && b.me.xu === xuB0,
    'bot: B đi xa 400 px rồi hai bên xác nhận → tradeEnd { ok: false }, đồ và xu không đổi chủ');
  await b.walkTo(620);
  ctx.b = b;
}

module.exports = { socialTest, tradeUnitTests };
