'use strict';

// Đo tải máy chủ: npm run test:load
// Tự bật server tạm (cổng 37xx, DATA_DIR tạm, METRICS_TOKEN ngẫu nhiên), đưa N bot WebSocket (mặc định 500) rải các bãi luyện,
// đi và đánh quái, chat thỉnh thoảng; đọc /api/metrics mỗi phút trong LOAD_MIN phút (mặc định 60).
// Ngưỡng (giai đoạn ổn định, sau khi đủ bot): tick p95 ≤ 50 ms mỗi phút; mỗi lần lưu chặn vòng lặp ≤ 20 ms;
// bộ nhớ ổn định: heap trung bình 1/3 cuối ≤ 1,15 × heap trung bình 1/3 đầu (và RSS ≤ 1,2 ×); server không lỗi.
// Biến môi trường: N, LOAD_MIN, OUT (thư mục ghi load-report.json), DATA_DIR (dùng dữ liệu có sẵn).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { LightBot, sleep } = require('../lib/lightbot');
const { MAPS } = require('../../src/shared/data/maps');
const { MONSTERS } = require('../../src/shared/data/monsters');

const N = +process.env.N || 500;
const MIN = +process.env.LOAD_MIN || 60;
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'ns-load-out-'));
const PORT = 3700 + Math.floor(Math.random() * 90);
const DATA = process.env.DATA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'ns-load-'));
const TOKEN = crypto.randomBytes(12).toString('hex');
const LIM = { tickP95: 50, save: 20, heapGrow: 1.15, rssGrow: 1.2 };
const users = Array.from({ length: N }, (_, i) => `load${String(i + 1).padStart(4, '0')}`);
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

// bãi luyện có quái cấp ≤ 60, không phải làng/phó bản
const fields = Object.values(MAPS).filter((m) => !m.town && !m.instance && !m.arena && (m.spawns || []).length)
  .map((m) => ({ id: m.id, lv: Math.max(...m.spawns.map((x) => (MONSTERS[x.m] || {}).lv || 1)) }))
  .filter((m) => m.lv <= 60);

async function metrics() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/metrics`, { headers: { 'x-metrics-token': TOKEN } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`Đo tải: ${N} bot, ${MIN} phút, cổng ${PORT}, ${fields.length} bãi luyện, dữ liệu ${DATA}`);
  const srv = spawn(process.execPath, [path.join(__dirname, '..', '..', 'src', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMINS: users.join(','), REG_LIMIT: '0', METRICS_TOKEN: TOKEN, TATHU: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  srv.stdout.on('data', (d) => { log += d; });
  srv.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100 && !log.includes('đang chạy'); i++) await sleep(100);

  // vào dần theo lô 20 bot để tránh bão đăng ký (bão đăng nhập là kịch bản riêng)
  const bots = [];
  const t0 = Date.now();
  for (let i = 0; i < N; i += 20) {
    await Promise.all(users.slice(i, i + 20).map(async (u, k) => {
      const b = new LightBot(`ws://127.0.0.1:${PORT}/ws`, u, i + k);
      try {
        await b.login();
        b.cmd('/lv 60');
        const f = fields[(i + k) % fields.length];
        await b.tp(f.id);
        bots.push(b);
      } catch (e) { console.log('  bot lỗi', u, e.message); }
    }));
  }
  console.log(`  ${bots.length}/${N} bot vào game sau ${((Date.now() - t0) / 1000).toFixed(0)} giây`);
  ok(bots.length === N, `đủ ${N} bot vào game (${bots.length})`);

  let tick = 0;
  const loop = setInterval(() => {
    tick++;
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if ((i + tick) % 2) b.step();
      if ((i * 7 + tick) % 150 === 0) b.send('chat', { msg: `xin chào ${tick}`, ch: 'map' });
    }
  }, 300);

  await metrics();
  const rows = [];
  const bytes0 = bots.reduce((s, b) => s + b.bytes, 0);
  for (let m = 1; m <= MIN; m++) {
    await sleep(60000);
    const r = await metrics();
    const b = bots.reduce((s, x) => s + x.bytes, 0);
    const alive = bots.filter((x) => !x.closed).length;
    if (r) {
      r.alive = alive;
      r.kbps = +((b - (rows.length ? rows[rows.length - 1].bytes : bytes0)) / 60 / 1024 / Math.max(1, alive)).toFixed(1);
      r.bytes = b;
      rows.push(r);
      console.log(`  phút ${m}: online ${r.online}, tick p50 ${r.tick.p50} p95 ${r.tick.p95} max ${r.tick.max} ms, lưu ${r.save.win} ms, vòng lặp p99 ${r.loop.p99} ms, heap ${r.mem.heap} MB, rss ${r.mem.rss} MB, ${r.kbps} KB/s/người`);
    } else console.log(`  phút ${m}: không đọc được /api/metrics`);
  }
  clearInterval(loop);

  ok(rows.length === MIN, `đọc được số đo đủ ${MIN} phút (${rows.length})`);
  ok(rows.every((r) => r.alive === N && r.online >= N), `giữ đủ ${N} người online suốt bài đo`);
  const worstTick = Math.max(0, ...rows.map((r) => r.tick.p95));
  ok(worstTick <= LIM.tickP95, `tick p95 xấu nhất mỗi phút ${worstTick} ms (≤ ${LIM.tickP95})`);
  const saves = rows.filter((r) => r.save.win > 0);
  const worstSave = Math.max(0, ...rows.map((r) => r.save.win));
  ok(saves.length > 0 && worstSave <= LIM.save, `lưu dữ liệu chặn vòng lặp lâu nhất ${worstSave} ms (≤ ${LIM.save}, ${saves.length} phút có lưu)`);
  const third = Math.max(1, Math.floor(rows.length / 3));
  const avg = (a, k) => a.reduce((s, r) => s + r.mem[k], 0) / Math.max(1, a.length);
  const head = rows.slice(0, third);
  const tail = rows.slice(-third);
  const hg = avg(tail, 'heap') / Math.max(1, avg(head, 'heap'));
  const rg = avg(tail, 'rss') / Math.max(1, avg(head, 'rss'));
  ok(hg <= LIM.heapGrow, `bộ nhớ ổn định: heap 1/3 cuối / 1/3 đầu = ${hg.toFixed(2)} (≤ ${LIM.heapGrow})`);
  ok(rg <= LIM.rssGrow, `bộ nhớ ổn định: RSS 1/3 cuối / 1/3 đầu = ${rg.toFixed(2)} (≤ ${LIM.rssGrow})`);

  for (const b of bots) b.close();
  srv.kill('SIGTERM');
  await new Promise((r) => { srv.on('close', r); setTimeout(r, 15000); });
  const bad = log.split('\n').filter((l) => /\[ws\] Lỗi xử lý|\[db\] Lỗi|TypeError|ReferenceError/.test(l));
  ok(bad.length === 0, `server không có lỗi trong log${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
  fs.writeFileSync(path.join(OUT, 'load-report.json'), JSON.stringify({ n: N, min: MIN, lim: LIM, rows }, null, 1));
  console.log(`Báo cáo: ${path.join(OUT, 'load-report.json')}`);
  console.log(fails ? `TẢI HỎNG: ${fails} kiểm tra` : 'TẢI ĐẠT');
  if (!process.env.DATA_DIR) fs.rmSync(DATA, { recursive: true, force: true });
  process.exit(fails ? 1 : 0);
})();
