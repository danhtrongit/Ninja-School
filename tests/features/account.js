'use strict';

// Đăng ký tài khoản, dữ liệu tĩnh gói "data", tạo và chọn nhân vật.
const { ok, sleep } = require('../lib/harness');
const { Bot } = require('../lib/bot');

async function accountTest(ctx) {
  console.log('1. Đăng ký & tạo nhân vật');
  const a = new Bot('A');
  global.botA = a;
  await a.connect();
  a.send('register', { u: 'botadmin', p: 'secret123' });
  const auth = await a.wait('auth');
  ok(auth.ok && auth.token, 'đăng ký thành công, nhận token');
  const gm = a.data.maps;
  ok(a.data.hotbarSets === 3, 'dữ liệu tĩnh có hotbarSets = 3');
  ok(gm.fire_field.mobs.includes('slime') && gm.bamboo.mobs.join() === 'monkey,bee,bandit' && gm.v_fire.mobs.length === 0,
    'maps[x].mobs liệt kê quái thường của bản đồ, sắp theo cấp');
  ok(gm.bamboo.bosses.some((x) => x.m === 'boss_slime' && x.x === 900) && gm.fire_field.bosses.length === 0
    && Object.values(gm).every((m) => m.mobs.every((id) => !a.data.monsters[id].boss)), 'maps[x].bosses có boss + tọa độ, mobs không chứa boss');
  const NEW_THEMES = { heaven: 'heaven', dragon_palace: 'dragon_palace', abyss: 'abyss', sakura_garden: 'sakura', ancient_ruins: 'ruins', crystal_cave: 'crystal' };
  ok(Object.entries(NEW_THEMES).every(([id, th]) => gm[id] && gm[id].theme === th), 'bản đồ hậu kỳ và nhánh phụ dùng theme riêng (heaven, dragon_palace, abyss, sakura, ruins, crystal)');
  ok(a.data.monsters.mushroom.drops.some((d) => d[0] === 'nam_doc') && Array.isArray(a.data.monsters.boss_dragon.drops),
    'monsters[x].drops gửi client (tìm đường cho nhiệm vụ thu thập)');
  await a.wait('chars');
  a.send('createChar', { name: 'KiemSi', cls: 'kiem', gender: 'm' });
  const chars = await a.wait('chars');
  ok(chars.chars.length === 1 && chars.chars[0].cls === 'kiem', 'tạo nhân vật phái Kiếm');
  a.send('createChar', { name: 'KiemSi', cls: 'tieu' });
  const dup = await a.wait('err');
  ok(/tồn tại/.test(dup.msg), 'không cho trùng tên nhân vật');
  a.send('selectChar', { name: 'KiemSi' });
  await a.wait('enterMap');
  ok(a.map === 'v_fire' && a.me.level === 1, 'vào Làng Hỏa Vân, cấp 1');
  ctx.a = a;
  ctx.auth = auth;
}

// 50 lần đăng nhập mật khẩu đồng thời (máy chủ riêng cổng 4320, NS_DEBUG_LAG=1): băm mật khẩu chạy ngoài luồng chính
async function loginBurstTest() {
  console.log('12. 50 lần đăng nhập mật khẩu đồng thời');
  const { LightBot } = require('../lib/lightbot');
  const { serve, tmpDir, cleanup } = require('./storage');
  const N = 50;
  const port = 4320;
  const s = serve(tmpDir('ns-burst-'), port, { NS_DEBUG_LAG: '1' });
  const bots = [];
  try {
    await s.ready();
    const url = `ws://localhost:${port}/ws`;
    const once = async (i, t, d) => {
      const b = new LightBot(url, `burst${String(i).padStart(2, '0')}`, i);
      bots.push(b);
      await b.connect();
      const got = Promise.race([b.next('auth'), b.next('err').then((m) => ({ err: m.msg }))]);
      b.send(t, d(b));
      const r = await got;
      b.close();
      return r;
    };
    const reg = await Promise.all(Array.from({ length: N }, (_, i) => once(i, 'register', (b) => ({ u: b.user, p: 'secret123' }))));
    await new Promise((r) => setTimeout(r, 1200));
    const from = s.log.length;
    const t0 = Date.now();
    const res = await Promise.all(Array.from({ length: N }, (_, i) => once(i, 'login', (b) => ({ u: b.user, p: 'secret123' }))));
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 1200));
    const lags = [...s.log.slice(from).matchAll(/\[lag\] tick trễ tối đa ([\d.]+) ms/g)].map((m) => +m[1]);
    const worst = lags.length ? Math.max(...lags) : -1;
    ok(reg.every((r) => r && r.ok) && res.every((r) => r && r.ok && r.token), `50 tài khoản đăng ký rồi đăng nhập mật khẩu đồng thời đều thành công (${ms} ms)`);
    ok(lags.length >= 1 && worst >= 0 && worst <= 50, `50 lần đăng nhập mật khẩu đồng thời không làm tick nào trễ > 50 ms (NS_DEBUG_LAG=1, tối đa ${worst} ms)`);
  } finally {
    for (const b of bots) b.close();
    await s.stop();
    cleanup();
  }
}

// Bảo mật tài khoản + giới hạn nhân vật (máy chủ riêng cổng 4323-4324, DATA_DIR tạm):
// IP theo X-Forwarded-For (phần tử cuối, chỉ khi tin proxy), giới hạn đăng ký/giờ/IP, khóa 1 phút sau 8 lần sai,
// token 30 ngày tối đa 6, tối đa 3 nhân vật, xóa sai tên bị từ chối, móc charDeleted (rời gia tộc)
async function accountSecurityTest() {
  console.log('12b. Bảo mật tài khoản, giới hạn nhân vật (máy chủ riêng)');
  const fs = require('fs');
  const path = require('path');
  const { serve, tmpDir, cleanup } = require('./storage');
  const P1 = 4323;
  const P2 = 4324;
  const dir = tmpDir('ns-acc-');
  const s1 = serve(dir, P1, { REG_LIMIT: '2', ADMINS: 'delclan' });
  const s2 = serve(tmpDir('ns-acc2-'), P2, { REG_LIMIT: '1', TRUST_PROXY: '0' });
  const bots = [];
  // kết nối mới, IP giả qua X-Forwarded-For (kết nối từ 127.0.0.1 = proxy nội bộ)
  const conn = async (port, xff) => {
    const b = new Bot('acc', port);
    bots.push(b);
    await b.connect(xff ? { 'x-forwarded-for': xff } : undefined);
    return b;
  };
  // trả lời đầu tiên thuộc các loại ts sau lần gửi: không để lại bộ chờ treo như Bot.wait
  const answer = async (b, ts, ms = 6000) => {
    const from = b.msgs.length;
    for (let t = 0; t < ms; t += 20) {
      const m = b.msgs.slice(from).find((x) => ts.includes(x.t));
      if (m) return m;
      await sleep(20);
    }
    return null;
  };
  const ask = (b, t, d, ts = ['auth', 'err']) => { const r = answer(b, ts); b.send(t, d); return r; };
  try {
    await Promise.all([s1.ready(), s2.ready()]);
    // (1) đăng ký: tối đa REG_LIMIT = 2 tài khoản/giờ/IP; IP = phần tử cuối X-Forwarded-For
    const r1 = await ask(await conn(P1, '6.6.6.6, 10.1.1.1'), 'register', { u: 'regaaa1', p: 'secret123' });
    const r2 = await ask(await conn(P1, '6.6.6.6, 10.1.1.1'), 'register', { u: 'regaaa2', p: 'secret123' });
    const r3 = await ask(await conn(P1, '7.7.7.7, 10.1.1.1'), 'register', { u: 'regaaa3', p: 'secret123' });
    const r4 = await ask(await conn(P1, '6.6.6.6, 10.1.1.2'), 'register', { u: 'regaaa4', p: 'secret123' });
    ok(r1 && r1.t === 'auth' && r2 && r2.t === 'auth' && r3 && r3.t === 'err' && /quá nhiều tài khoản/.test(r3.msg),
      `quá REG_LIMIT tài khoản/giờ/IP → từ chối đăng ký (REG_LIMIT=2: lần 3 "${r3 && r3.msg}")`);
    ok(r4 && r4.t === 'auth',
      'sau proxy (TRUST_PROXY tự động, kết nối từ mạng nội bộ): IP = phần tử cuối X-Forwarded-For, đổi phần tử đầu không lách được giới hạn, đổi phần tử cuối là IP khác');

    // (2) 8 lần sai mật khẩu cùng IP → khóa 1 phút (đúng mật khẩu cũng bị từ chối), IP khác vẫn vào được
    const lk = await conn(P1, '10.2.2.2');
    const wrong = [];
    for (let i = 0; i < 8; i++) wrong.push(await ask(lk, 'login', { u: 'regaaa1', p: `sai${i}xxxx` }));
    const lockAt = Date.now();
    const locked = await ask(lk, 'login', { u: 'regaaa1', p: 'secret123' });
    const other = await ask(await conn(P1, '10.2.2.3'), 'login', { u: 'regaaa1', p: 'secret123' });
    ok(wrong.every((m) => m && m.t === 'err' && /Sai tài khoản/.test(m.msg)) && locked && locked.t === 'err' && /sai quá nhiều lần/.test(locked.msg) && other && other.t === 'auth',
      '8 lần sai mật khẩu cùng IP → bị khóa: lần 9 đúng mật khẩu vẫn bị từ chối, IP khác vẫn đăng nhập được');

    // (3) token: 30 ngày, tối đa 6 (đăng ký + 7 lần đăng nhập → token cũ nhất mất hiệu lực)
    const tTok = Date.now();
    const toks = [r4.token];
    for (let i = 0; i < 7; i++) {
      const a = await ask(await conn(P1, '10.4.4.4'), 'login', { u: 'regaaa4', p: 'secret123' });
      toks.push(a && a.token);
    }
    const oldT = await ask(await conn(P1, '10.4.4.4'), 'login', { u: 'regaaa4', token: toks[0] });
    const newT = await ask(await conn(P1, '10.4.4.4'), 'login', { u: 'regaaa4', token: toks[7] });
    ok(toks.every(Boolean) && oldT && oldT.t === 'err' && /hết hạn/.test(oldT.msg) && newT && newT.t === 'auth' && newT.token === toks[7],
      'tối đa 6 token: đăng ký + 7 lần đăng nhập → token cũ nhất hết hiệu lực, token mới nhất đăng nhập được');

    // (4) tối đa 3 nhân vật, xóa sai tên bị từ chối, không xóa được nhân vật của tài khoản khác
    const ch = await conn(P1, '10.5.5.5');
    await ask(ch, 'register', { u: 'charsacc', p: 'secret123' });
    const made = [];
    for (const n of ['ChaMot', 'ChaHai', 'ChaBa', 'ChaBon']) made.push(await ask(ch, 'createChar', { name: n, cls: 'kiem', gender: 'm' }, ['chars', 'err']));
    ok(made.slice(0, 3).every((m) => m && m.t === 'chars') && made[2].chars.length === 3 && made[3] && made[3].t === 'err' && /Tối đa 3 nhân vật/.test(made[3].msg),
      `nhân vật thứ 4 cùng tài khoản bị từ chối ("${made[3] && made[3].msg}")`);
    const bad = await ask(ch, 'deleteChar', { name: 'ChaMot', confirm: 'ChaHai' }, ['chars', 'err']);
    const oc = await conn(P1, '10.5.5.6');
    await ask(oc, 'register', { u: 'otheracc', p: 'secret123' });
    await ask(oc, 'createChar', { name: 'NguoiKhac', cls: 'cung', gender: 'f' }, ['chars', 'err']);
    ch.send('deleteChar', { name: 'NguoiKhac', confirm: 'NguoiKhac' });
    await sleep(300);
    const mine = await ask(ch, 'selectChar', { name: 'NguoiKhac' }, ['enterMap', 'err']);
    const still = await ask(await conn(P1, '10.5.5.6'), 'login', { u: 'otheracc', p: 'secret123' }, ['chars']);
    ok(bad && bad.t === 'err' && /Nhập đúng tên/.test(bad.msg) && mine && mine.t === 'err' && still && still.chars.some((c) => c.name === 'NguoiKhac'),
      'xóa sai tên bị từ chối (nhập xác nhận khác tên), không xóa được nhân vật của tài khoản khác');

    // (4b) gateway: tối đa 80 gói/giây/kết nối, gói > 16 KB bị đóng kết nối
    await ask(ch, 'selectChar', { name: 'ChaHai' }, ['enterMap']);
    await sleep(1100);
    const p0 = ch.msgs.length;
    for (let i = 0; i < 200; i++) ch.send('ping', { ts: i });
    await sleep(800);
    const pongs = ch.msgs.slice(p0).filter((m) => m.t === 'pong').length;
    await sleep(400);
    const big = await ask(ch, 'ping', { ts: 'lon', pad: 'x'.repeat(15 * 1024) }, ['pong']);
    const closed = new Promise((r) => ch.ws.once('close', (code) => r(code)));
    ch.ws.send(JSON.stringify({ t: 'ping', ts: 'qua', pad: 'x'.repeat(17 * 1024) }));
    const code = await Promise.race([closed, sleep(3000).then(() => 'mở')]);
    ok(pongs === 80 && big && big.ts === 'lon' && code === 1009,
      `gateway: 200 gói trong 1 giây chỉ xử lý 80 (${pongs} pong); gói 15 KB vẫn nhận, gói > 16 KB đóng kết nối (mã ${code})`);

    // (5) móc charDeleted: tộc trưởng một mình bị xóa → gia tộc không còn tên nhân vật đó
    const dc = new Bot('DelClan', P1);
    bots.push(dc);
    await dc.connect({ 'x-forwarded-for': '10.6.6.6' });
    await ask(dc, 'register', { u: 'delclan', p: 'secret123' });
    await ask(dc, 'createChar', { name: 'TocXoa', cls: 'kiem', gender: 'm' }, ['chars']);
    dc.send('selectChar', { name: 'TocXoa' });
    await dc.wait('enterMap', null, 6000);
    for (const c of ['/lv 30', '/xu 200000']) {
      dc.send('chat', { ch: 'map', msg: c });
      await sleep(200);
    }
    if (dc.map !== 'v_fire') {
      dc.send('chat', { ch: 'map', msg: '/tp v_fire' });
      await dc.wait('enterMap', (m) => m.map === 'v_fire', 6000);
    }
    await dc.walkTo(1180);
    dc.send('npc', { id: 'v_fire_clan' });
    await dc.wait('dialog', null, 6000);
    dc.send('npcAct', { id: 'v_fire_clan', a: 'create', text: 'XoaToc' });
    const inClan = await dc.wait('me', (m) => !!m.clan, 6000).catch(() => null);
    dc.ws.close();
    await sleep(300);
    const dl = await conn(P1, '10.6.6.6');
    await ask(dl, 'login', { u: 'delclan', p: 'secret123' }, ['chars']);
    const after = await ask(dl, 'deleteChar', { name: 'TocXoa', confirm: 'TocXoa' }, ['chars', 'err']);

    // (6) TRUST_PROXY=0: bỏ qua X-Forwarded-For (IP = địa chỉ socket): đổi X-Forwarded-For không né được khóa
    const t1 = await ask(await conn(P2, '10.9.9.1'), 'register', { u: 'trustno1', p: 'secret123' });
    const t2 = await ask(await conn(P2, '10.9.9.2'), 'register', { u: 'trustno2', p: 'secret123' });
    const tl = await conn(P2, '10.8.8.1');
    for (let i = 0; i < 8; i++) await ask(tl, 'login', { u: 'trustno1', p: `sai${i}xxxx` });
    const tl2 = await ask(await conn(P2, '10.8.8.2'), 'login', { u: 'trustno1', p: 'secret123' });
    ok(t1 && t1.t === 'auth' && t2 && t2.t === 'auth' && tl2 && tl2.t === 'err' && /sai quá nhiều lần/.test(tl2.msg),
      'TRUST_PROXY=0: bỏ qua X-Forwarded-For, IP = địa chỉ socket (đổi X-Forwarded-For không né được khóa đăng nhập; loopback không bị REG_LIMIT)');

    // (2) tiếp: hết 1 phút thì đăng nhập lại được
    await sleep(Math.max(0, lockAt + 61000 - Date.now()));
    const unlock = await ask(await conn(P1, '10.2.2.2'), 'login', { u: 'regaaa1', p: 'secret123' });
    ok(unlock && unlock.t === 'auth', '8 lần sai mật khẩu cùng IP → bị khóa 1 phút: sau 60 giây cùng IP đăng nhập lại được');

    for (const b of bots) try { b.ws.close(); } catch (e) { /* đã đóng */ }
    await s1.stop();
    // trên đĩa: token hết hạn sau 30 ngày, không quá 6; gia tộc không còn nhân vật đã xóa
    const accs = JSON.parse(fs.readFileSync(path.join(dir, 'accounts.json'), 'utf8'));
    const exp = Object.values(accs.regaaa4.tokens);
    const day30 = 30 * 24 * 3600 * 1000;
    ok(exp.length === 6 && exp.every((t) => t >= tTok - 60000 + day30 && t <= Date.now() + day30),
      `token 30 ngày: accounts.json giữ ${exp.length} token, mỗi token hết hạn sau 30 ngày`);
    const clans = JSON.parse(fs.readFileSync(path.join(dir, 'clans.json'), 'utf8'));
    const left = Object.entries(clans).filter(([k, c]) => k !== '_gen' && c && c.members && c.members.tocxoa);
    ok(inClan && after && after.t === 'chars' && !after.chars.length && !left.length && !fs.existsSync(path.join(dir, 'chars', 'tocxoa.json')),
      'móc charDeleted chạy khi xóa: tộc trưởng bị xóa thì rời gia tộc (clans.json không còn tên), file nhân vật bị xóa');
  } finally {
    for (const b of bots) try { b.ws.close(); } catch (e) { /* đã đóng */ }
    await s1.stop();
    await s2.stop();
    cleanup();
  }
}

// Bảng hành động (core/router.js): trùng tên → lỗi lúc khởi động; tên thuộc prototype của Object không gọi handler nào
async function routerTests() {
  console.log('12c. Bảng hành động (Router)');
  const fs = require('fs');
  const path = require('path');
  const { Router } = require('../../src/server/core/router');
  const { serve, tmpDir, cleanup } = require('./storage');
  const r = new Router();
  const calls = [];
  r.add('move', (p, m) => calls.push(m.t), null, 'movement');
  const err = (f) => { try { f(); } catch (e) { return e.message; } return ''; };
  const dup = err(() => r.add('move', () => {}, null, 'khac'));
  const nf = err(() => r.add('nhay', 'khong-phai-ham', null, 'khac'));
  const evil = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf', 'move ', 'MOVE', ''];
  const thrown = evil.map((t) => err(() => r.handle({}, { t }))).filter(Boolean);
  r.handle({}, { t: 'move' });
  ok(/bị đăng ký trùng \(movement và khac\)/.test(dup) && /không phải hàm/.test(nf) && !thrown.length && calls.join() === 'move',
    "Router: trùng tên hành động / handler không phải hàm → ném lỗi; gói t='constructor' / '__proto__' / 'toString' không gọi handler nào");
  // máy chủ thật nạp thêm một module trùng tên hành động 'move' → dừng ngay lúc khởi động (log lỗi dạng JSON nên dấu " có \\)
  const dir = tmpDir('ns-router-');
  const pre = path.join(dir, 'dup.js');
  fs.writeFileSync(pre, `require(${JSON.stringify(path.join(__dirname, '..', '..', 'src', 'server', 'modules'))}).push({ name: 'dupmod', actions: { move() {} } });\n`);
  const s = serve(dir, 4325, { NODE_OPTIONS: `--require ${pre}` });
  const code = await s.exitWithin(10000);
  ok(code !== 'timeout' && code !== 0 && /Hành động \\?"move\\?" bị đăng ký trùng \(movement và dupmod\)/.test(s.log) && !/đang chạy/.test(s.log),
    `máy chủ nạp hai module trùng tên hành động → dừng ngay lúc khởi động (mã ${code})`);
  await s.stop();
  cleanup();
}

module.exports = { accountTest, loginBurstTest, accountSecurityTest, routerTests };
