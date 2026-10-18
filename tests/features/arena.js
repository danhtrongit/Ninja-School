'use strict';

// Lôi đài xếp hạng: Elo, mã tuần, ghép cặp (không cần server) và trận đấu thật qua WebSocket.
const { sleep, ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');
const { Bot } = require('../lib/bot');

// Lôi đài: Elo tổng không đổi, mã tuần theo giờ Việt Nam, dọn dữ liệu hỏng, ghép cặp theo biên điểm nới dần
function arenaUnitTests() {
  console.log('0g. Lôi đài (Elo, tuần, ghép cặp)');
  const { Arena, eloDelta, weekId, cleanArena, weeklyTier } = require('../../src/server/modules/arena');
  const { ARENA } = require('../../src/shared/data/extras');
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
  const w2 = { players, byName: world.byName, db: fakeDb({ meta: {} }) };
  const D1 = new Arena(w2);
  D1.pairAdd(ea, eb, Date.now());
  D1.pairAdd(eb, ea, Date.now());
  ok(w2.db.meta.arenaPairs['ee|ff'].n === 2 && new Arena(w2).pairCount(ea, eb) === 2 && new Arena(world).pairCount(ea, eb) === 0, 'số trận mỗi cặp trong ngày lưu ở db.meta');
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
  // dồn tiềm năng vào nhanh nhẹn: chính xác ≥ né tránh của B × 25 → đòn không bao giờ trượt (trượt ngẫu nhiên làm
  // đòn 1 của Song Tiêu không hạ gục, phần kiểm "đòn 2 không đánh tiếp" bên dưới mất ý nghĩa)
  x.send('addStat', { k: 'agi', n: 500 });
  const sure = await x.wait('me', (m) => m.s && m.s.hit * 0.04 >= y.me.s.dodge).catch(() => null);
  ok(!!sure, `A dồn 500 điểm nhanh nhẹn: chính xác ${sure && sure.s.hit} đủ xóa né tránh ${y.me.s.dodge}% của B`);
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

module.exports = { arenaUnitTests, arenaTest };
