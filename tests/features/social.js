'use strict';

// Nhiều người chơi: dịch chuyển, nhóm, chat nhóm/bản đồ, giao dịch.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');

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
  ctx.b = b;
}

module.exports = { socialTest };
