'use strict';

// Gia tộc: kiểm tra đơn vị (chèn prototype, dọn dữ liệu lúc nạp, giới hạn trưởng lão, góp quỹ) và
// 3 bot thật (NPC lập tộc, mời, từ chối, nhận, thông báo, thăng chức, nhường trưởng tộc, đuổi, rời, giải tán, quyền sai).
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const clanMod = require('../../src/server/modules/clan');

const { cleanClans } = clanMod;

// Thế giới giả đủ cho module gia tộc (db + byName + announce)
function fakeWorld(clans, chars = {}) {
  const db = {
    clans, chars, dirty: false, meta: { nextClanId: 50 },
    getChar(n) { const k = String(n).toLowerCase(); return Object.prototype.hasOwnProperty.call(this.chars, k) ? this.chars[k] : null; },
    newClanId() { return String(this.meta.nextClanId++); },
  };
  const world = { db, byName: new Map(), announce() {} };
  return world;
}

function fakePlayer(world, name, clan, xu = 0) {
  const sent = [];
  const p = {
    name, sent, invites: {}, c: { name, clan, xu, level: 30, cls: 'kiem' }, lv: 30,
    send(t, d) { sent.push(d && typeof d === 'object' ? { t, ...d } : { t, d }); },
    notice(msg) { sent.push({ t: 'notice', msg }); },
    markMe() {}, recalc() {},
  };
  world.byName.set(name.toLowerCase(), p);
  world.db.chars[name.toLowerCase()] = p.c;
  return p;
}

const mem = (name, rank, joined) => ({ name, rank, joined });
const lastNotice = (p) => [...p.sent].reverse().find((m) => m.t === 'notice');
const protoClean = () => ({}).rank === undefined && !Object.prototype.hasOwnProperty.call(Object.prototype, 'rank');

// Gia tộc mẫu: Lead (tộc trưởng), Elda (trưởng lão), Memb (thành viên) + các thành viên thêm
function sampleClan(extra = []) {
  const members = { lead: mem('Lead', 'leader', 1), elda: mem('Elda', 'elder', 2), memb: mem('Memb', 'member', 3) };
  extra.forEach((n, i) => { members[n.toLowerCase()] = mem(n, 'member', 10 + i); });
  const world = fakeWorld({ 1: { name: 'Mau', leader: 'Lead', created: 1, notice: 'x', members, level: 1, exp: 0, fund: 0 } });
  const clan = clanMod.init(world);
  const ps = {};
  for (const n of ['Lead', 'Elda', 'Memb', ...extra]) ps[n] = fakePlayer(world, n, '1', 100000);
  return { world, clan, ps, cl: () => world.db.clans[1] };
}

function clanUnitTests() {
  console.log('0k. Gia tộc (kiểm tra đơn vị): chèn prototype, dọn dữ liệu, giới hạn trưởng lão, góp quỹ');
  const A = clanMod.actions;
  try {
    // C1: tên '__proto__' / 'constructor' không chạm tới Object.prototype
    let s = sampleClan();
    A.clanPromote.call(s.clan, s.ps.Lead, { name: '__proto__', rank: 'leader' });
    ok(protoClean() && s.cl().leader === 'Lead' && s.cl().members.lead.rank === 'leader',
      "clanPromote { name: '__proto__', rank: 'leader' }: ({}).rank vẫn undefined, tộc trưởng giữ nguyên");
    A.clanKick.call(s.clan, s.ps.Lead, { name: 'constructor' });
    A.clanKick.call(s.clan, s.ps.Elda, { name: '__proto__' });
    ok(protoClean() && s.cl().leader === 'Lead' && Object.keys(s.cl().members).length === 3,
      "clanKick { name: 'constructor' } / '__proto__': không đuổi ai, ({}).rank vẫn undefined, tộc trưởng giữ nguyên");

    // tương đương kịch bản proto-clan: dội mọi gói clan* rác từ mọi chức rồi kiểm Object.prototype
    s = sampleClan(['Out']);
    const before = Object.getOwnPropertyNames(Object.prototype).sort().join();
    const junkNames = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf', '__defineGetter__', '', null, 42, { a: 1 }, { toString: 1 }, ['lead']];
    const ranks = ['leader', 'elder', 'member', '__proto__', undefined];
    const outsider = fakePlayer(s.world, 'Ngoai', null, 1e6);
    s.cl().members.out = undefined;
    delete s.cl().members.out;
    s.ps.Out.c.clan = null;
    for (const who of ['Elda', 'Memb', 'Lead']) {
      const p = s.ps[who];
      for (const name of junkNames) {
        for (const rank of ranks) A.clanPromote.call(s.clan, p, { name, rank });
        A.clanKick.call(s.clan, p, { name });
        A.clanInvite.call(s.clan, p, { name });
        A.clanAccept.call(s.clan, p, { from: name });
        A.clanAccept.call(s.clan, outsider, { from: name });
      }
      for (const xu of ['__proto__', -1e9, NaN, '1e400', { valueOf: 5000 }, { toString: 1 }, 999]) A.clanDonate.call(s.clan, p, { xu });
      for (const text of [{ toString: 1 }, '__proto__', null]) A.clanNotice.call(s.clan, p, { text });
      A.clanInfo.call(s.clan, p, {});
    }
    const after = Object.getOwnPropertyNames(Object.prototype).sort().join();
    ok(protoClean() && before === after && s.cl().leader === 'Lead' && Object.keys(s.cl().members).length === 3 && s.cl().fund === 0,
      'dội gói clan* rác (tên/chức/xu lạ) từ cả 3 chức: Object.prototype không có rank, gia tộc nguyên vẹn, quỹ không đổi');

    // C2: dọn dữ liệu lúc nạp
    const raw = JSON.parse(`{
      "7": { "name": "Hong", "leader": "Gone", "created": 1, "notice": 5, "level": 99, "exp": "abc", "fund": -5,
        "members": { "elda": { "name": "Elda", "rank": "elder", "joined": 20 }, "memb": { "name": "Memb", "rank": "member", "joined": 10 },
          "boss1": { "name": "Boss1", "rank": "boss", "joined": 5 }, "__proto__": { "name": "x", "rank": "leader" }, "Upper": { "name": "Upper", "rank": "member" },
          "nul": null } },
      "8": { "name": "Rong", "leader": "Ai", "members": {} },
      "9": { "name": "Doi", "leader": "Memo", "level": 0, "exp": 1.7, "fund": 1e15,
        "members": { "memo": { "name": "Memo", "rank": "member", "joined": 3 }, "e1": { "name": "E1", "rank": "elder", "joined": 1 },
          "e2": { "name": "E2", "rank": "elder", "joined": 2 }, "e3": { "name": "E3", "rank": "elder", "joined": 4 },
          "e4": { "name": "E4", "rank": "elder", "joined": 5 }, "e5": { "name": "E5", "rank": "elder", "joined": 6 }, "e6": { "name": "E6", "rank": "leader", "joined": 7 } } }
    }`);
    const chars = { elda: { name: 'Elda', clan: '7' }, gone: { name: 'Gone', clan: '7' }, lost: { name: 'Lost', clan: '8' }, none: { name: 'None', clan: '404' } };
    const db = { clans: raw, chars };
    cleanClans(db);
    const h = db.clans[7];
    ok(h && h.leader === 'Elda' && h.members.elda.rank === 'leader' && Object.values(h.members).filter((m) => m.rank === 'leader').length === 1,
      'cleanClans: tộc trưởng không còn trong members thì chọn lại (trưởng lão vào sớm nhất)');
    ok(h.members.boss1.rank === 'member', "cleanClans: chức lạ 'boss' về member");
    ok(h.fund === 0 && h.level === 10 && h.exp === 0 && typeof h.notice === 'string', 'cleanClans: quỹ -5 về 0, cấp 99 kẹp về 10, EXP lạ về 0');
    ok(!Object.prototype.hasOwnProperty.call(h.members, '__proto__') && !h.members.Upper && !h.members.nul && Object.keys(h.members).length === 3 && protoClean(),
      'cleanClans: bỏ khóa thành viên lạ (__proto__, chữ hoa, null)');
    ok(!db.clans[8] && chars.lost.clan === null && chars.none.clan === null && chars.gone.clan === null && chars.elda.clan === '7',
      'cleanClans: bỏ tộc không còn ai; nhân vật trỏ tộc không còn mình thì c.clan = null');
    const d9 = db.clans[9];
    const el9 = Object.values(d9.members).filter((m) => m.rank === 'elder');
    ok(d9.leader === 'Memo' && d9.members.memo.rank === 'leader' && el9.length === 4 && d9.members.e6.rank === 'member' && d9.members.e5.rank === 'member'
      && d9.level === 1 && d9.exp === 1 && d9.fund === 2e12, 'cleanClans: đúng một tộc trưởng, tối đa 4 trưởng lão, cấp/EXP/quỹ kẹp trong giới hạn');

    // C3: góp quỹ tối thiểu
    s = sampleClan();
    const xu0 = s.ps.Memb.c.xu;
    A.clanDonate.call(s.clan, s.ps.Memb, { xu: 999 });
    ok(s.ps.Memb.c.xu === xu0 && (s.cl().fund || 0) === 0 && /Góp tối thiểu 1\.000 xu/.test(lastNotice(s.ps.Memb).msg), 'clanDonate 999 xu bị từ chối, xu không đổi');
    A.clanDonate.call(s.clan, s.ps.Memb, { xu: '3e9' });
    A.clanDonate.call(s.clan, s.ps.Memb, { xu: 'abc' });
    ok(s.ps.Memb.c.xu === xu0 && (s.cl().fund || 0) === 0, 'clanDonate xu lạ / quá 2 tỷ bị từ chối');
    A.clanDonate.call(s.clan, s.ps.Memb, { xu: '2500.9' });
    ok(s.ps.Memb.c.xu === xu0 - 2500 && s.cl().fund === 2500 && s.cl().exp === 25, 'clanDonate 2500 xu: trừ xu, quỹ +2500, EXP tộc +25');

    // C4: tối đa 4 trưởng lão
    s = sampleClan(['M1', 'M2', 'M3', 'M4', 'M5']);
    for (const n of ['M1', 'M2', 'M3']) A.clanPromote.call(s.clan, s.ps.Lead, { name: n });
    const elders = () => Object.values(s.cl().members).filter((m) => m.rank === 'elder').length;
    ok(elders() === 4, 'thăng đủ 4 trưởng lão');
    A.clanPromote.call(s.clan, s.ps.Lead, { name: 'M4' });
    ok(s.cl().members.m4.rank === 'member' && elders() === 4 && lastNotice(s.ps.Lead).msg === 'Gia tộc đã đủ 4 trưởng lão.',
      "thăng trưởng lão thứ 5 bị từ chối: 'Gia tộc đã đủ 4 trưởng lão.'");
    A.clanPromote.call(s.clan, s.ps.Lead, { name: 'M5', rank: 'leader' });
    ok(s.cl().leader === 'M5' && s.cl().members.m5.rank === 'leader' && s.cl().members.lead.rank === 'member' && elders() === 4,
      'nhường trưởng tộc khi đã đủ trưởng lão: tộc trưởng cũ về thành viên, vẫn 4 trưởng lão');
    A.clanPromote.call(s.clan, s.ps.M5, { name: 'M1' });
    A.clanPromote.call(s.clan, s.ps.M5, { name: 'M4' });
    ok(s.cl().members.m1.rank === 'member' && s.cl().members.m4.rank === 'elder' && elders() === 4, 'giáng 1 trưởng lão thì thăng được người khác');
  } finally {
    // lỡ bị chèn thì gỡ để các phần sau không hỏng dây chuyền
    delete Object.prototype.rank;
  }
}

// ---------- 3 bot thật
async function login(u, name) {
  const bot = new Bot(name);
  await bot.connect();
  bot.send('login', { u, p: 'secret123' });
  await bot.wait('chars');
  bot.send('createChar', { name, cls: 'kiem', gender: 'm' });
  await bot.wait('chars', (m) => m.chars.some((x) => x.name === name));
  bot.send('selectChar', { name });
  await Promise.all([bot.wait('enterMap'), bot.wait('inv')]);
  return bot;
}

const cmd = async (bot, msg, re) => {
  bot.send('chat', { ch: 'map', msg });
  await bot.wait('chat', (m) => m.ch === 'sys' && re.test(m.msg));
};
const notice = (bot, re, ms = 3000) => bot.wait('notice', (m) => re.test(m.msg), ms).then(() => true).catch(() => false);

// Tạo nhân vật mới trên 3 tài khoản admin đã đóng ở các phần trước (lôi đài, xu khóa) rồi chạy kịch bản gia tộc.
// Trả về { a, b, c } (tộc trưởng, trưởng lão, thành viên) cho các phần sau (PK, nhóm, giao dịch) dùng tiếp.
async function clanTest() {
  console.log('7m. Gia tộc (3 người chơi): lập, mời, nhận, chức, nhường, đuổi, rời, giải tán');
  const a = await login('lodai_a', 'TocTruong');
  const b = await login('lodai_b', 'TocLao');
  const c = await login('khoa_a', 'TocVien');
  // chỉ tộc trưởng cần đứng gần NPC; gói clan* không cần đứng gần ai
  if (a.map !== 'v_fire') {
    a.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await a.wait('enterMap', (m) => m.map === 'v_fire');
  }
  await a.walkTo(1180);
  // NPC Lão Gia Tộc: hộp thoại lập tộc, điều kiện cấp / xu / tên
  a.send('npc', { id: 'v_fire_clan' });
  const dlg = await a.wait('dialog');
  ok(dlg.opts.some((o) => o.a === 'create' && o.input), 'NPC Lão Gia Tộc mở hộp thoại lập gia tộc (có ô nhập tên)');
  a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'TocMoc' });
  ok(await notice(a, /Cần cấp 15/), 'lập tộc khi chưa đủ cấp 15 bị từ chối');
  await cmd(a, '/lv 30', /Cấp hiện tại/);
  a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'TocMoc' });
  ok(await notice(a, /Cần 50\.000 xu/), 'lập tộc khi thiếu 50.000 xu bị từ chối');
  await cmd(a, '/xu 200000', /xu/);
  await sleep(100);
  a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'ab' });
  ok(await notice(a, /3-12 ký tự/), 'tên gia tộc sai định dạng bị từ chối');
  a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'ninjatest' });
  ok(await notice(a, /đã tồn tại/), 'tên trùng gia tộc khác (không phân biệt hoa thường) bị từ chối');
  const xu0 = a.me.xu;
  a.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'TocMoc' });
  const cl0 = await a.wait('clan', (m) => m && m.name === 'TocMoc');
  await sleep(100);
  ok(cl0.myRank === 'leader' && cl0.leader === 'TocTruong' && cl0.members.length === 1 && a.me.xu === xu0 - 50000,
    'lập gia tộc TocMoc qua NPC: làm tộc trưởng, trừ 50.000 xu');
  a.send('npc', { id: 'v_fire_clan' });
  const dlg2 = await a.wait('dialog');
  a.send('npcAct', { id: 'v_fire_clan', a: 'info' });
  const ui = await a.wait('openUi');
  ok(dlg2.opts.some((o) => o.a === 'info') && ui.ui === 'clan', 'đã có gia tộc: NPC chuyển sang Quản lý gia tộc, mở cửa sổ gia tộc');

  // mời / từ chối / nhận
  a.send('clanInvite', { name: 'TocLao' });
  const inv1 = await b.wait('invite', (m) => m.kind === 'clan');
  ok(inv1.from === 'TocTruong' && inv1.clan === 'TocMoc', 'clanInvite: TocLao nhận lời mời vào gia tộc TocMoc');
  b.send('decline', { kind: 'clan', from: 'TocTruong' });
  ok(await notice(a, /TocLao đã từ chối lời mời/), 'decline: người mời được báo bị từ chối');
  b.send('clanAccept', { from: 'TocTruong' });
  ok(await notice(b, /hết hạn/), 'clanAccept sau khi đã từ chối: lời mời không còn');
  a.send('clanInvite', { name: 'TocLao' });
  await b.wait('invite', (m) => m.kind === 'clan');
  b.send('clanAccept', { from: 'TocTruong' });
  const clB = await b.wait('clan', (m) => m && m.name === 'TocMoc');
  ok(clB.myRank === 'member' && clB.members.length === 2 && !!(await a.wait('chat', (m) => m.ch === 'clan' && /TocLao đã gia nhập/.test(m.msg))),
    'clanAccept: TocLao vào tộc làm thành viên, cả tộc nhận tin');
  a.send('clanInvite', { name: 'TocVien' });
  await c.wait('invite', (m) => m.kind === 'clan');
  c.send('clanAccept', { from: 'TocTruong' });
  const clC = await c.wait('clan', (m) => m && m.name === 'TocMoc');
  ok(clC.members.length === 3, 'TocVien vào tộc: 3 thành viên');
  a.send('clanInvite', { name: 'TocLao' });
  ok(await notice(a, /đã có gia tộc/), 'mời người đã có gia tộc bị từ chối');

  // quyền sai: thành viên thường
  b.send('clanInvite', { name: 'TocVien' });
  ok(await notice(b, /Chỉ tộc trưởng\/trưởng lão mới mời được/), 'thành viên thường mời người bị từ chối');
  b.send('clanKick', { name: 'TocVien' });
  ok(await notice(b, /Không đủ quyền/), 'thành viên thường đuổi người bị từ chối');
  b.send('clanPromote', { name: 'TocVien' });
  ok(await notice(b, /Chỉ tộc trưởng mới làm được/), 'thành viên thường phong chức bị từ chối');
  b.send('clanNotice', { text: 'tieu tu' });
  ok(await notice(b, /mới sửa thông báo/), 'thành viên thường sửa thông báo tộc bị từ chối');

  // thông báo + xem thông tin
  a.send('clanNotice', { text: 'Hop toc luc 20h <b>' });
  const n1 = await a.wait('clan', (m) => m && /^Hop toc/.test(m.notice));
  ok(n1.notice === 'Hop toc luc 20h b', `clanNotice: tộc trưởng sửa thông báo (lọc ký tự <>: "${n1.notice}")`);
  c.send('clanInfo');
  const info = await c.wait('clan', (m) => m && m.name === 'TocMoc');
  ok(info.notice === 'Hop toc luc 20h b' && info.myRank === 'member' && info.members.some((x) => x.name === 'TocTruong' && x.online) && info.level === 1,
    'clanInfo: thành viên xem thông báo, danh sách (trạng thái online), cấp tộc');

  // thăng chức: trưởng lão
  a.send('clanPromote', { name: 'TocLao' });
  const pr = await a.wait('clan', (m) => m && m.members.some((x) => x.name === 'TocLao' && x.rank === 'elder'));
  ok(!!pr && !!(await b.wait('chat', (m) => m.ch === 'clan' && /TocLao nay là trưởng lão/.test(m.msg))), 'clanPromote: TocLao lên trưởng lão, cả tộc nhận tin');
  b.send('clanNotice', { text: 'Truong lao noi' });
  ok((await b.wait('clan', (m) => m && m.notice === 'Truong lao noi')).myRank === 'elder', 'trưởng lão sửa được thông báo tộc');
  b.send('clanKick', { name: 'TocTruong' });
  ok(await notice(b, /Không đủ quyền/), 'trưởng lão đuổi tộc trưởng bị từ chối');
  b.send('clanPromote', { name: 'TocVien' });
  ok(await notice(b, /Chỉ tộc trưởng mới làm được/), 'trưởng lão phong chức bị từ chối');

  // góp quỹ
  b.send('clanDonate', { xu: 999 });
  ok(await notice(b, /Góp tối thiểu 1\.000 xu/), 'clanDonate 999 xu bị từ chối');
  b.send('clanDonate', { xu: 1e9 });
  ok(await notice(b, /Không đủ xu/), 'góp quá số xu đang có bị từ chối');
  a.send('clanDonate', { xu: 1000 });
  const don = await a.wait('clan', (m) => m && m.fund === 1000);
  ok(don.exp === 10, 'clanDonate 1.000 xu: quỹ 1.000, EXP tộc +10');

  // gói rác từ bot thật: không làm hỏng gia tộc, server không lỗi
  for (const name of ['__proto__', 'constructor', 'prototype', 'toString']) {
    a.send('clanPromote', { name, rank: 'leader' });
    a.send('clanKick', { name });
    a.send('clanInvite', { name });
    c.send('clanAccept', { from: name });
  }
  a.send('clanInfo');
  const still = await a.wait('clan', (m) => m && m.name === 'TocMoc');
  ok(still.leader === 'TocTruong' && still.myRank === 'leader' && still.members.length === 3, 'gói clan* tên __proto__/constructor từ bot thật: gia tộc nguyên vẹn');

  // nhường trưởng tộc
  a.send('clanPromote', { name: 'TocLao', rank: 'leader' });
  const ta = await a.wait('clan', (m) => m && m.leader === 'TocLao');
  b.send('clanInfo');
  const tr = await b.wait('clan', (m) => m && m.leader === 'TocLao');
  ok(ta.myRank === 'elder' && tr.myRank === 'leader' && tr.members.some((x) => x.name === 'TocTruong' && x.rank === 'elder'), 'nhường trưởng tộc: TocLao làm tộc trưởng, TocTruong về trưởng lão');
  a.send('clanPromote', { name: 'TocVien' });
  ok(await notice(a, /Chỉ tộc trưởng mới làm được/), 'tộc trưởng cũ hết quyền phong chức');

  // đuổi: trưởng lão đuổi thành viên thường
  a.send('clanKick', { name: 'tocvien' });
  ok(!!(await c.wait('clan', (m) => !m.name, 3000).catch(() => null)),
    'clanKick: trưởng lão đuổi thành viên thường, người bị đuổi nhận gói clan rỗng');
  const k1 = await a.wait('clan', (m) => m && m.members.length === 2);
  ok(!k1.members.some((x) => x.name === 'TocVien'), 'sau khi đuổi gia tộc còn 2 người');

  // rời: tộc trưởng rời thì trưởng lão lên thay
  b.send('clanLeave');
  ok(await notice(b, /Bạn đã rời gia tộc/), 'clanLeave: tộc trưởng TocLao rời gia tộc');
  ok(!!(await a.wait('chat', (m) => m.ch === 'clan' && /TocTruong trở thành tộc trưởng mới/.test(m.msg))), 'tộc trưởng rời: trưởng lão TocTruong lên thay');
  a.send('clanInfo');
  const solo = await a.wait('clan', (m) => m && m.name === 'TocMoc');
  ok(solo.leader === 'TocTruong' && solo.myRank === 'leader' && solo.members.length === 1, 'gia tộc còn 1 người do TocTruong làm tộc trưởng');

  // giải tán: người cuối cùng rời
  a.send('clanLeave');
  ok(await notice(a, /Gia tộc đã giải tán/), 'người cuối cùng rời: gia tộc giải tán');
  a.send('clanInfo');
  ok(!!(await a.wait('clan', (m) => !m.name)), 'sau khi giải tán: clanInfo trả gói clan rỗng');
  await sleep(150);
  ok(a.me.clan == null && b.me.clan == null && c.me.clan == null, 'gói me của cả 3 người không còn gia tộc');
  return { a, b, c };
}

module.exports = { clanUnitTests, clanTest };
