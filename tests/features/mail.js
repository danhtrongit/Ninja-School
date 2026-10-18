'use strict';

// Hộp thư, giftcode, lễ hội theo mùa: thế giới giả và qua WebSocket thật.
const { sleep, ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');
const { Bot } = require('../lib/bot');

// Hộp thư, giftcode, sự kiện theo mùa bằng thế giới giả (Player/Mailer/Season thật)
function mailUnitTests() {
  console.log('0f. Hộp thư, giftcode, lễ hội (thế giới giả)');
  const { Mailer, cleanMailbox, mailSummary, normCode, CODES } = require('../../src/server/modules/mail');
  const { Season, SEASON_LIST } = require('../../src/server/modules/season');
  const { BeastEvent } = require('../../src/server/modules/events');
  const { Player, newChar } = require('../../src/server/core/player');
  const { makeItem, ITEMS } = require('../../src/shared/data/items');
  const { MAIL, SEASONS } = require('../../src/shared/data/extras');
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
  const db = fakeDb({ meta: {}, chars: { vangmat: off }, getChar: (n) => (Object.prototype.hasOwnProperty.call(db.chars, n) ? db.chars[n] : null) });
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
  ok(ml.max === 30 && m1.xuk === 1234 && m1.luong === 3 && m1.items[0].id === 'stone3' && m1.items[0].q === 5 && !m1.read, 'người offline nhận được thư: xu khóa, lượng, vật phẩm đính kèm');
  const free = b2.inv.inv.filter((x) => !x).length;
  b2.send('chat', { ch: 'map', msg: `/item w_kunai_1 ${free}` });
  await b2.wait('inv', (m) => m.inv.every(Boolean));
  const xu0 = b2.me.xu;
  const xuk0 = b2.me.xuk || 0;
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
  ok(ml.list[0].got && b2.me.xuk === xuk0 + 1234 && b2.me.xu === xu0 && b2.inv.inv.some((it) => it && it.id === 'stone3' && it.q === 5) && b2.me.mail.g === 0,
    'dọn 1 ô: nhận đủ 1.234 xu khóa, 3 lượng, 5 đá; hết chấm đỏ quà');

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
  ok(!!gm && gm.xuk === 1000 && gm.luong === 2 && gm.items[0].id === 'hp2' && gm.items[0].q === 30, 'thư giftcode có đủ quà');
  for (const it of b2.inv.inv.filter((x) => x && x.id === 'w_kunai_1').slice(0, 2)) {
    b2.send('discard', { slot: b2.inv.inv.indexOf(it) });
    await sleep(80);
  }
  await sleep(250);
  const xu1 = b2.me.xu;
  const xuk1 = b2.me.xuk || 0;
  const l1 = b2.me.luong;
  b2.send('mailClaimAll');
  await b2.wait('notice', (m) => /Đã nhận quà từ 1 thư/.test(m.msg));
  await sleep(200);
  ok(b2.me.xuk === xuk1 + 1000 && b2.me.luong === l1 + 2 && b2.inv.inv.some((it) => it && it.id === 'hp2'), 'nhận tất cả: lấy quà mọi thư còn quà');
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
  const xka = a.me.xuk || 0;
  a.send('seasonEx', { npc: 'v_fire_event', id: 'xu', n: 2 });
  let sr = await a.wait('seasonResult');
  await sleep(150);
  ok(sr.ok && a.me.xuk === xka + 12000 && cakes(a) === c0 - 10, 'đổi 2 lần 5 bánh lấy 6.000 xu khóa');
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

module.exports = { mailUnitTests, mailTest };
