'use strict';

// Smoke test máy chủ thật (không cần quyền admin): đăng ký, vào game, nhận nhiệm vụ, mua đồ, cường hóa, chat, đánh quái, lên cấp.
// Dùng: PROD_URL=https://ninja.iqx.vn npm run test:prod   (SMOKE_USER=<tk> SMOKE_PASS=<mk> tùy chọn)
// Mỗi lần chạy xóa nhân vật cũ của tài khoản thử rồi tạo nhân vật mới (phái Kiếm, làng Hỏa Vân), cuối cùng xóa nhân vật để không để lại dữ liệu.
// Kiểm thêm /api/status: commit phải trùng EXPECT_COMMIT (mặc định: git rev-parse main nếu chạy trong repo).
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const { LightBot, sleep } = require('../lib/lightbot');

const BASE = (process.env.PROD_URL || 'https://ninja.iqx.vn').replace(/\/$/, '');
const WS = BASE.replace(/^http/, 'ws') + '/ws';
const USER = process.env.SMOKE_USER || 'smokeprod';
const PASS = process.env.SMOKE_PASS || 'smoke-prod-1';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; return c; };

function getJson(url) {
  return new Promise((resolve) => {
    (url.startsWith('https') ? https : http).get(url, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

class ProdBot extends LightBot {
  onMsg(m) {
    if (m.t === 'data') this.G = m;
    if (m.t === 'enterMap') this.me = m.me;
    if (m.t === 'me') this.me = m;
    if (m.t === 'inv') this.inv = m;
    if (m.t === 'notice') (this.notices = this.notices || []).push(m.msg);
    super.onMsg(m);
  }

  async walkTo(x) {
    while (Math.abs(this.x - x) > 4) {
      const step = Math.sign(x - this.x) * Math.min(14, Math.abs(x - this.x));
      this.x += step;
      this.send('move', { x: this.x, y: this.y, dir: Math.sign(step), st: 1 });
      await sleep(90);
    }
    this.send('move', { x: this.x, y: this.y, dir: 1, st: 0 });
    await sleep(150);
  }

  npcX(id) { return this.G.maps[this.map].npcs.find((n) => n.id === id).x; }
  count(id) { return ((this.inv && this.inv.inv) || []).reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0); }
}

(async () => {
  console.log(`Smoke test production: ${BASE}`);
  const st = await getJson(`${BASE}/api/status`);
  let want = process.env.EXPECT_COMMIT || '';
  if (!want) try { want = execSync('git rev-parse main', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* ngoài repo */ }
  ok(!!st && st.ok === true, `/api/status trả ok (${st ? st.version : 'không đọc được'})`);
  if (want) ok(!!st && st.commit === want, `/api/status.commit trùng commit main (${want.slice(0, 7)})`);

  const b = new ProdBot(WS, USER, 0);
  await b.connect();
  // đăng ký; tài khoản thử đã có từ lần trước thì đăng nhập
  let chars = b.next('chars');
  b.send('register', { u: USER, p: PASS });
  let c = await Promise.race([chars, b.next('err').then((e) => ({ err: e && e.msg }))]);
  const registered = !!(c && c.chars);
  if (!registered) {
    ok(c && /đã tồn tại/.test(c.err || ''), `đăng ký: máy chủ nhận gói register (${c && c.err})`);
    chars = b.next('chars');
    b.send('login', { u: USER, p: PASS });
    c = await chars;
  } else ok(true, 'đăng ký tài khoản mới');
  if (!ok(!!(c && c.chars), 'đăng nhập, nhận danh sách nhân vật')) return finish(b);
  for (const ch of c.chars) {
    const nm = ch.name || ch;
    const again = b.next('chars');
    b.send('deleteChar', { name: nm, confirm: nm });
    c = await again;
  }
  const name = 'smk' + Date.now().toString(36).slice(-6);
  const made = b.next('chars');
  b.send('createChar', { name, cls: 'kiem', gender: 'm' });
  c = await made;
  ok(!!c && c.chars.some((x) => (x.name || x) === name), `tạo nhân vật ${name}`);
  const enter = b.next('enterMap');
  b.send('selectChar', { name });
  const em = await enter;
  if (!ok(!!em && b.map === 'v_fire' && b.me && b.me.level === 1, `vào game ở ${b.map}, cấp ${b.me && b.me.level}`)) return finish(b);

  // nhiệm vụ: Trưởng Làng giao + hoàn thành nhiệm vụ 1, nhận nhiệm vụ 2
  await b.walkTo(b.npcX('v_fire_elder'));
  const dlgP = b.next('dialog');
  b.send('npc', { id: 'v_fire_elder' });
  const dlg = await dlgP;
  ok(!!dlg && dlg.opts.some((o) => o.a === 'accept'), 'nói chuyện Trưởng Làng: có nút nhận nhiệm vụ');
  let nt = b.next('notice', (m) => /Hoàn thành|Đã nhận/.test(m.msg));
  b.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
  await nt;
  await sleep(300);
  nt = b.next('notice', (m) => /Đã nhận/.test(m.msg));
  b.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
  const got = await nt;
  ok(!!got && b.me.quest && b.me.quest.i >= 1, `nhận nhiệm vụ (${got ? got.msg : 'không có thông báo'})`);

  // mua 5 bình HP
  await b.walkTo(b.npcX('v_fire_potion'));
  const hp0 = b.count('hp1');
  const shopP = b.next('shop');
  b.send('npc', { id: 'v_fire_potion' });
  ok(!!(await shopP), 'mở Tiệm Thuốc');
  const bought = b.next('notice', (m) => /Đã mua/.test(m.msg));
  b.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5 });
  await bought;
  await sleep(300);
  ok(b.count('hp1') === hp0 + 5, `mua đồ: 5 bình HP (${hp0} → ${b.count('hp1')})`);

  // cường hóa vũ khí +1 (mua 1 Đá Cường Hóa Sơ ở Lò Rèn)
  await b.walkTo(b.npcX('v_fire_smith'));
  const bs = b.next('notice', (m) => /Đã mua/.test(m.msg));
  b.send('buy', { npc: 'v_fire_smith', id: 'stone1', qty: 1 });
  await bs;
  await sleep(200);
  const upP = b.next('upgradeResult');
  b.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot: 'weapon' });
  const up = await upP;
  ok(!!up && up.ok && up.plus === 1, `cường hóa vũ khí lên +${up ? up.plus : '?'}`);

  // chat kênh bản đồ: máy chủ phát lại tin
  const msg = `smoke ${Date.now() % 100000}`;
  const chatP = b.next('chat', (m) => m.msg === msg);
  b.send('chat', { ch: 'map', msg });
  ok(!!(await chatP), 'chat kênh bản đồ: nhận lại tin vừa gửi');

  // ra Đồi Hỏa Diệm đánh quái tới khi lên cấp
  const pi = b.G.maps.v_fire.portals.findIndex((p) => p.to === 'fire_field');
  await b.walkTo(b.G.maps.v_fire.portals[pi].x + 10);
  const fe = b.next('enterMap', (m) => m.map === 'fire_field');
  b.send('portal', { i: pi });
  ok(!!(await fe), 'qua cổng ra Đồi Hỏa Diệm');
  let kills = 0;
  const t0 = Date.now();
  b.on = true;
  const dieWatch = (m) => { if (m.t === 'mDie') kills++; };
  const orig = b.onMsg.bind(b);
  b.onMsg = (m) => { dieWatch(m); orig(m); };
  while (b.me.level < 2 && Date.now() - t0 < 180000 && !b.closed) {
    if (b.me.dead) { const r = b.next('enterMap'); b.send('revive', {}); await r; break; }
    if (b.me.hp < b.me.s.maxHp * 0.4) { const s = b.inv.inv.findIndex((it) => it && it.id === 'hp1'); if (s >= 0) b.send('useItem', { slot: s }); }
    const mobs = [...b.mobs.values()].filter((m) => !(m.hp <= 0) && Math.abs(m.y - b.y) < 30).sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x));
    const tg = mobs[0];
    if (!tg) { await sleep(500); continue; }
    if (Math.abs(tg.x - b.x) > 40) await b.walkTo(Math.round(tg.x - 30 * Math.sign(tg.x - b.x)));
    b.send('skill', { sid: 'k0', tid: `m${tg.id}`, dir: Math.sign(tg.x - b.x) || 1 });
    await sleep(450);
  }
  ok(kills > 0, `đánh quái: hạ ${kills} con`);
  ok(b.me.level >= 2, `lên cấp: cấp ${b.me.level} sau ${Math.round((Date.now() - t0) / 1000)} giây`);
  return finish(b, name);
})().catch((e) => { console.log('  ✘ Lỗi:', e.message); fails++; done(); });

async function finish(b, name) {
  if (name) {
    // xóa nhân vật thử: thoát về sảnh bằng kết nối mới (nhân vật đang online bị máy chủ cho rời game)
    const d = new ProdBot(WS, USER, 0);
    await d.connect();
    const ch = d.next('chars');
    d.send('login', { u: USER, p: PASS });
    if (await ch) {
      const del = d.next('chars');
      d.send('deleteChar', { name, confirm: name });
      const r = await del;
      ok(!!r && !r.chars.some((x) => (x.name || x) === name), 'dọn dẹp: xóa nhân vật thử');
    }
    d.close();
  }
  b.close();
  done();
}

function done() {
  console.log(fails ? `PRODUCTION HỎNG: ${fails}` : 'PRODUCTION ĐẠT');
  setTimeout(() => process.exit(fails ? 1 : 0), 200);
}
