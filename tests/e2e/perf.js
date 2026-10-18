// Đo hiệu năng (DESIGN_RULES mục 10): bản đồ đông quái + auto + nhiều hiệu ứng + ban đêm + thú cưỡi/thú nuôi
// + 30 người chơi khác (bot WebSocket) đánh quái cùng bản đồ. Cần Playwright + Chromium.
// Dùng: BASE_URL=http://localhost:3000 ACC=<tk admin> BOTS=<30 tk admin, cách bằng dấu phẩy> MOBILE=1 MAPS=heaven,abyss OUT=/tmp/perf NODE_PATH=$(npm root -g) npm run test:perf
// Ngưỡng mỗi bản đồ: trung bình ≥ 58 khung/giây, CPU mỗi khung trung bình ≤ 5 ms, p95 ≤ 8 ms, thấy đủ 30 người chơi khác.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { LightBot } = require('../lib/lightbot');
const BASE = process.env.BASE_URL || 'http://localhost:3000/';
const MOBILE = process.env.MOBILE === '1';
const ACC = process.env.ACC || 'fin3';
const MAPS = (process.env.MAPS || 'heaven,dragon_palace,abyss,crystal_cave').split(',');
const OUT = (process.env.OUT || path.join(os.tmpdir(), 'ninja-e2e', 'perf')) + '-' + (MOBILE ? 'm' : 'd');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const BOTS = (process.env.BOTS || Array.from({ length: 30 }, (_, i) => `vfbot${String(i + 1).padStart(2, '0')}`).join(',')).split(',').filter(Boolean);
const WS = BASE.replace(/^http/, 'ws').replace(/\/?$/, '/ws');
const LIM = { fps: 58, cpuAvg: 5, cpuP95: 8, players: 30 };
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(MOBILE ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const ev = (fn, a) => page.evaluate(fn, a);
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  await page.click('[data-tab=register]').catch(() => {});
  await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1'); await page.fill('#in-pass2', 'matkhau1').catch(() => {});
  await page.click('#btn-login'); await page.waitForTimeout(900);
  if ((await page.textContent('#login-err')).trim()) {
    await page.click('[data-tab=login]'); await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1');
    await page.click('#btn-login'); await page.waitForTimeout(900);
  }
  if (await page.isVisible('#char-create')) {
    await page.fill('#in-cname', ACC + 'x'); await page.click('.class-card:nth-child(3)');
    await page.click('#btn-create'); await page.waitForTimeout(700);
  }
  await page.click('.char-card .btn.primary'); await page.waitForTimeout(1500);
  const cmd = async (c) => {
    await ev((m) => { const hc = document.querySelector('#hud-chat'); if (hc) hc.classList.remove('collapsed'); document.querySelector('#chat-input').value = m; }, c);
    await page.focus('#chat-input'); await page.keyboard.press('Enter'); await page.waitForTimeout(350);
    await ev(() => { document.activeElement && document.activeElement.blur(); if (window.ninja.ui.touch) document.querySelector('#hud-chat').classList.add('collapsed'); });
  };
  await cmd('/lv 120');
  for (const id of ['mount_qilin', 'cloak_flame', 'mask_oni', 'costume_dragon', 'pet_dragon']) {
    await cmd(`/item ${id}`);
    await ev((id) => { const i = window.ninja.S.inv.findIndex((x) => x && x.id === id); if (i >= 0) window.ninja.net.send('equip', { slot: i }); }, id);
    await page.waitForTimeout(250);
  }
  await cmd('/item hp4 200');
  // đo thời gian CPU mỗi khung (update + render + ui.frame) và khoảng cách giữa các khung
  await ev(() => {
    const g = window.ninja.game;
    const ui = window.ninja.ui;
    const P = window.__perf = { cpu: [], gap: [], last: 0 };
    const wrap = (o, k) => {
      const f = o[k].bind(o);
      o[k] = (...a) => { const t0 = performance.now(); const r = f(...a); P.acc = (P.acc || 0) + performance.now() - t0; return r; };
    };
    wrap(g, 'update'); wrap(g, 'render'); wrap(ui, 'frame');
    const tick = (now) => {
      if (P.on) {
        if (P.last) P.gap.push(now - P.last);
        P.cpu.push(P.acc || 0);
      }
      P.acc = 0;
      P.last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // 30 người chơi khác: đăng nhập, lên cấp, theo người đo sang từng bản đồ và đánh quái
  const bots = [];
  await Promise.all(BOTS.map(async (u, i) => {
    const b = new LightBot(WS, u, i);
    try { await b.login(); b.cmd('/lv 60'); bots.push(b); } catch (e) { console.log('  bot lỗi', u, e.message); }
  }));
  let botTimer = null;
  const results = {};
  for (const mapId of MAPS) {
    clearInterval(botTimer);
    await cmd(`/tp ${mapId}`);
    await Promise.all(bots.map((b) => b.tp(mapId)));
    botTimer = setInterval(() => { for (const b of bots) b.step(); }, 300);
    await page.waitForTimeout(1500);
    await cmd('/boss');
    await ev(() => { window.ninja.game.forceHour = 21; window.ninja.game.toggleAuto(true); });
    // dồn thêm hiệu ứng: nổ, lốc, thiên thạch, sét quanh nhân vật mỗi 120ms
    await ev(() => {
      const g = window.ninja.game;
      window.__spam = setInterval(() => {
        const x = g.me.x + (Math.random() - 0.5) * 500;
        const y = g.me.y - 20;
        const ks = ['burst', 'whirl', 'meteor', 'wave', 'sparks', 'aura', 'heal', 'dash'];
        const k = ks[Math.floor(Math.random() * ks.length)];
        try {
          if (k === 'burst') g.fx.burst(x, y, 60, '#ff7a3a', true);
          else if (k === 'whirl') g.fx.whirl(x, y, 60, '#7ad7ff', true);
          else if (k === 'meteor') g.fx.meteor(x, y, 50, '#ff5a2a');
          else if (k === 'wave') g.fx.wave(x, y, 1, 260, '#c0f');
          else if (k === 'aura') g.fx.aura(() => ({ x, y }), '#ffd84a');
          else if (k === 'heal') g.fx.heal(() => ({ x, y }), '#7f7');
          else if (k === 'dash') g.fx.dash(x - 60, x + 60, y, 1, '#9ff');
          else g.fx.sparks(x, y, '#fff', 14);
        } catch (e) { /* chữ ký khác: bỏ qua */ }
      }, 120);
    });
    await page.waitForTimeout(1500);
    await ev(() => { const P = window.__perf; P.cpu = []; P.gap = []; P.on = true; });
    await page.waitForTimeout(8000);
    const r = await ev(() => {
      const P = window.__perf;
      P.on = false;
      clearInterval(window.__spam);
      const g = window.ninja.game;
      const s = (a) => [...a].sort((x, y) => x - y);
      const pct = (a, q) => { const b = s(a); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : 0; };
      const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
      return {
        frames: P.gap.length, fps: +(1000 / avg(P.gap)).toFixed(1), gapP95: +pct(P.gap, 0.95).toFixed(1),
        cpuAvg: +avg(P.cpu).toFixed(2), cpuP95: +pct(P.cpu, 0.95).toFixed(2), cpuMax: +Math.max(...P.cpu).toFixed(1),
        mobs: g.monsters.size, players: g.players ? g.players.size : 0, fxN: g.fx.parts ? g.fx.parts.length : undefined,
        auto: g.auto, dead: window.ninja.S.me.dead,
      };
    });
    results[mapId] = r;
    console.log(mapId, JSON.stringify(r));
    ok(r.fps >= LIM.fps, `${mapId} ${MOBILE ? 'điện thoại' : 'máy tính'}: ${r.fps} khung/giây (≥ ${LIM.fps})`);
    ok(r.cpuAvg <= LIM.cpuAvg, `${mapId}: CPU mỗi khung trung bình ${r.cpuAvg} ms (≤ ${LIM.cpuAvg})`);
    ok(r.cpuP95 <= LIM.cpuP95, `${mapId}: CPU mỗi khung p95 ${r.cpuP95} ms (≤ ${LIM.cpuP95})`);
    ok(r.players >= LIM.players, `${mapId}: thấy ${r.players} người chơi khác (≥ ${LIM.players})`);
    await page.screenshot({ path: `${OUT}-${mapId}.png` });
    await ev(() => { window.ninja.game.toggleAuto(false); if (window.ninja.S.me.dead) window.ninja.net.send('revive', {}); });
    await page.waitForTimeout(500);
  }
  clearInterval(botTimer);
  for (const b of bots) b.close();
  console.log(fails ? `PERF HỎNG: ${fails} kiểm tra` : 'PERF ĐẠT');
  console.log(errors.join('\n') || 'OK no console errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
