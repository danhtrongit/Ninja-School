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

// ---------- Phần thêm (dev-test-coverage): 3 nhân vật của phần gia tộc
const tp = async (bot, map) => {
  if (bot.map === map) return;
  bot.send('chat', { ch: 'map', msg: `/tp ${map}` });
  await bot.wait('enterMap', (m) => m.map === map);
};
const notice = (bot, re, ms = 3000) => bot.wait('notice', (m) => re.test(m.msg), ms).then(() => true).catch(() => false);
const partyOf = (bot, pred) => bot.wait('party', pred);
const joinParty = async (lead, bot) => {
  lead.send('partyInvite', { name: bot.name });
  await bot.wait('invite', (m) => m.kind === 'party');
  bot.send('partyAccept', { from: lead.name });
  await bot.wait('party', (m) => m.members.some((x) => x.name === bot.name));
};

// Rời nhóm / mời ra (chuyển trưởng nhóm, giải tán), bạn bè (danh sách, xóa), xem người chơi, đọc thư,
// ngắt kết nối giữa giao dịch (không mất xu/đồ). Bot đặt tên theo nhân vật: a = TocTruong, b = TocLao, c = TocVien.
async function socialMoreTest({ a, b, c }) {
  console.log('7q. Rời nhóm, mời ra, bạn bè, xem người chơi, đọc thư, ngắt kết nối khi giao dịch');
  await joinParty(a, b);
  await joinParty(a, c);
  const p3 = await partyOf(a, (m) => m.members.length === 3);
  ok(p3.members.find((x) => x.leader).name === 'TocTruong', 'lập nhóm 3 người, TocTruong làm trưởng nhóm');
  const fromC = c.msgs.length;
  b.send('partyKick', { name: 'TocVien' });
  await sleep(300);
  ok(!c.msgs.slice(fromC).some((m) => m.t === 'party' && !m.members.length), 'partyKick của thành viên thường bị bỏ qua');
  a.send('partyKick', { name: 'TocVien' });
  const kicked = await c.wait('party', (m) => !m.members.length);
  ok(!!kicked && await notice(c, /mời ra khỏi nhóm/), 'partyKick: trưởng nhóm mời TocVien ra, TocVien nhận gói nhóm rỗng + thông báo');
  ok((await partyOf(a, (m) => m.members.length === 2)).members.every((x) => x.name !== 'TocVien'), 'nhóm còn 2 người sau khi mời ra');
  await joinParty(a, c);
  a.send('partyLeave');
  ok(!!(await a.wait('party', (m) => !m.members.length)), 'partyLeave: trưởng nhóm rời nhận gói nhóm rỗng');
  const p2 = await partyOf(b, (m) => m.members.length === 2 && !m.members.some((x) => x.name === 'TocTruong'));
  ok(p2.members.find((x) => x.leader).name === 'TocLao', 'trưởng nhóm rời: thành viên vào sớm nhất (TocLao) làm trưởng nhóm');
  b.send('partyLeave');
  ok(!!(await c.wait('party', (m) => !m.members.length)), 'nhóm còn 1 người thì giải tán (TocVien nhận gói nhóm rỗng)');

  // bạn bè: danh sách, xóa (xóa cả hai phía)
  a.send('friendAdd', { name: 'TocLao' });
  await b.wait('invite', (m) => m.kind === 'friend');
  b.send('friendAccept', { from: 'TocTruong' });
  await a.wait('friends', (m) => m.list.length === 1);
  a.send('friendList');
  const fl = await a.wait('friends');
  ok(fl.list.length === 1 && fl.list[0].name === 'TocLao' && fl.list[0].online && fl.list[0].lv === b.me.level, 'friendList: danh sách bạn có TocLao (online, cấp)');
  a.send('friendDel', { name: 'toclao' });
  const fd = await a.wait('friends', (m) => m.list.length === 0);
  const fb = await b.wait('friends', (m) => !m.list.some((x) => x.name === 'TocTruong'));
  ok(!!fd && !!fb, 'friendDel: xóa bạn ở cả hai phía');

  // xem người chơi
  c.send('inspect', { name: 'toctruong' });
  const ins = await c.wait('inspect');
  ok(ins.name === 'TocTruong' && ins.lv === a.me.level && ins.cls === 'kiem' && ins.equip && ins.s && ins.s.maxHp > 0, 'inspect: xem cấp, môn phái, trang bị, chỉ số của người khác');
  c.send('inspect', { name: 'KhongAiCa' });
  ok(await notice(c, /không online/), 'inspect người không online: báo lỗi');

  // đọc thư
  const nb = c.me.mail ? c.me.mail.n : 0;
  a.send('chat', { ch: 'map', msg: '/mail TocVien 100 0' });
  await a.wait('chat', (m) => /Đã gửi thư/.test(m.msg));
  await c.wait('me', (m) => m.mail && m.mail.n === nb + 1);
  const n0 = nb + 1;
  c.send('mailList');
  const ml = await c.wait('mail');
  const unread = ml.list.find((x) => !x.read);
  c.send('mailRead', { id: unread.id });
  await c.wait('me', (m) => m.mail.n === n0 - 1);
  c.send('mailList');
  ok((await c.wait('mail')).list.find((x) => x.id === unread.id).read === true, `mailRead: thư đánh dấu đã đọc, số thư chưa đọc ${n0} → ${n0 - 1}`);

  // ngắt kết nối giữa giao dịch: không bên nào mất xu/đồ
  await tp(a, 'fire_field');
  await tp(c, 'fire_field');
  c.send('chat', { ch: 'map', msg: '/lv 10' });
  await c.wait('chat', (m) => /Cấp hiện tại/.test(m.msg));
  await c.walkTo(a.x + 40);
  await sleep(200);
  const slot = a.inv.inv.findIndex((it) => it && !it.b && !it.exp);
  const item = slot >= 0 ? { ...a.inv.inv[slot] } : null;
  const ax = a.me.xu;
  const cx = c.me.xu;
  const cnt = (bot, id) => bot.inv.inv.reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0);
  const aq = item ? cnt(a, item.id) : 0;
  const cq = item ? cnt(c, item.id) : 0;
  a.send('tradeReq', { name: 'TocVien' });
  await c.wait('invite', (m) => m.kind === 'trade');
  c.send('tradeAccept', { from: 'TocTruong' });
  await a.wait('trade');
  a.send('tradeSet', { slots: slot >= 0 ? [slot] : [], xu: 500 });
  await c.wait('trade', (m) => m.theirs.xu === 500);
  a.send('tradeLock');
  c.send('tradeLock');
  await a.wait('trade', (m) => m.mine.lock && m.theirs.lock);
  a.send('tradeOk');
  await sleep(100);
  c.ws.close();
  const end = await a.wait('tradeEnd');
  await sleep(200);
  ok(end.ok === false && await notice(a, /Giao dịch đã bị hủy/), 'ngắt kết nối giữa giao dịch (đã khóa, một bên đã đồng ý): giao dịch bị hủy');
  ok(a.me.xu === ax && (!item || cnt(a, item.id) === aq), `bên còn lại giữ nguyên xu (${ax}) và vật phẩm đã đặt`);
  const c2 = new Bot('TocVien');
  await c2.connect();
  c2.send('login', { u: 'khoa_a', p: 'secret123' });
  await c2.wait('chars');
  c2.send('selectChar', { name: 'TocVien' });
  await Promise.all([c2.wait('enterMap'), c2.wait('inv')]);
  ok(c2.me.xu === cx && (!item || cnt(c2, item.id) === cq), 'người ngắt kết nối vào lại: xu không đổi, không nhận đồ của giao dịch dở');
  for (const bot of [a, b, c2]) bot.ws.close();
  await sleep(300);
}

module.exports = { socialTest, socialMoreTest };
