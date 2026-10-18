'use strict';

// Đo lưu theo nhân vật (ops-persist-shard, ADR-10-1): node tests/load/persist-bench.js
// Dựng DATA_DIR tạm bố cục chars/ với N nhân vật hậu kỳ (mặc định 5.000, ~28 KB/nhân vật), nạp bằng services/db.js,
// rồi chạy vòng lặp giống máy chủ (tick 50 ms → db.flushTick) trong SEC giây với ONLINE người online (mặc định 200):
// mỗi tick đổi dữ liệu người online, 30 giây một lần đánh dấu bẩn cả nhóm (như world.saveAll), mỗi tick vài bẩn khẩn
// (nhận quà thư, thoát game), mỗi giây một giao dịch (db.commit hai bản ghi), giây thứ 10 gửi thư cho 1.000 người offline.
// RSS nền = RSS đỉnh của WARM giây chạy cùng nhịp đổi dữ liệu nhưng tắt lưu (rác của lối chơi không tính cho việc lưu).
// Ngưỡng: trễ vòng lặp p99 ≤ 10 ms, lượt chặn lớn nhất ≤ 25 ms, RSS đỉnh khi lưu ≤ RSS nền + 30 MB, hàng đợi xả hết.
// Biến môi trường: N, ONLINE, SEC, WARM.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { monitorEventLoopDelay } = require('perf_hooks');

// cần global.gc để đo RSS nền sau khi dọn rác: tự chạy lại với --expose-gc
if (typeof global.gc !== 'function') {
  const r = spawnSync(process.execPath, ['--expose-gc', __filename], { stdio: 'inherit', env: process.env });
  process.exit(r.status == null ? 1 : r.status);
}

const { DB } = require('../../src/server/services/db');
const { lateChar } = require('../lib/chars');

const N = +process.env.N || 5000;
const ONLINE = +process.env.ONLINE || 200;
const SEC = +process.env.SEC || 40;
const WARM = +process.env.WARM || 15;
const LIM = { p99: 10, block: 25, rss: 30 };
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mb = (b) => (b / 1048576).toFixed(1);

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-persist-'));
  try {
    // dữ liệu mẫu: ghi thẳng file (nhanh), đúng bố cục services/db.js
    fs.mkdirSync(path.join(dir, 'chars'));
    const accounts = {};
    let bytes = 0;
    for (let i = 0; i < N; i++) {
      const c = lateChar(`Hk${i}`, i);
      const s = JSON.stringify(c);
      bytes += s.length;
      fs.writeFileSync(path.join(dir, 'chars', `hk${i}.json`), s);
      accounts[`hk${i}`] = { username: `hk${i}`, salt: 'x', hash: 'y', created: 0, chars: [c.name], tokens: {} };
    }
    fs.writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify(accounts));
    fs.writeFileSync(path.join(dir, 'clans.json'), '{}');
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ nextClanId: 1, layout: 2 }));
    console.log(`Đo lưu: ${N} nhân vật hậu kỳ (${mb(bytes)} MB, ${(bytes / N / 1024).toFixed(1)} KB/nhân vật), ${ONLINE} online, ${SEC} giây, ${dir}`);

    const t0 = Date.now();
    const db = new DB(dir);
    const loadMs = Date.now() - t0;
    const keys = Object.keys(db.chars);
    ok(keys.length === N, `nạp ${keys.length} nhân vật từ chars/ trong ${(loadMs / 1000).toFixed(1)} s`);
    const online = keys.slice(0, ONLINE);
    const offline = keys.slice(ONLINE);
    for (let i = 0; i < 3; i++) { global.gc(); await sleep(100); }

    // vòng lặp giống máy chủ; save = false: chỉ đổi dữ liệu (đo RSS nền)
    let tick = 0;
    let commits = 0;
    let commitMax = 0;
    let flushMax = 0;
    let written = 0;
    const play = (sec, save) => new Promise((resolve) => {
      let peak = 0;
      let n = 0;
      const end = Date.now() + sec * 1000;
      const iv = setInterval(() => {
        const now = Date.now();
        n++;
        for (const k of online) {
          const c = db.chars[k];
          c.xu += 1;
          c.exp = (c.exp || 0) + 3;
        }
        if (save) {
          tick++;
          // 30 giây một lần: đánh dấu bẩn cả nhóm online (world.saveAll)
          if (tick % 600 === 1) for (const k of online) db.touch(k);
          // bẩn khẩn: nhận quà thư, thoát game
          for (let j = 0; j < 2; j++) db.touch(online[(tick * 7 + j * 13) % ONLINE], true);
          // mỗi giây một giao dịch: nhóm ghi hai bản ghi
          if (tick % 20 === 0) {
            const a = online[(tick / 20) % ONLINE];
            const b = online[(tick / 20 + 1) % ONLINE];
            db.chars[a].xu -= 100;
            db.chars[b].xu += 100;
            const c0 = process.hrtime.bigint();
            db.commit([a, b], 'trade');
            commitMax = Math.max(commitMax, Number(process.hrtime.bigint() - c0) / 1e6);
            commits++;
          }
          // giây thứ 10: thư gửi cho 1.000 người offline
          if (tick === 200) for (const k of offline.slice(0, 1000)) db.touch(k, true);
          const f0 = process.hrtime.bigint();
          written += db.flushTick(now);
          flushMax = Math.max(flushMax, Number(process.hrtime.bigint() - f0) / 1e6);
        }
        peak = Math.max(peak, process.memoryUsage().rss);
        if (now >= end) {
          clearInterval(iv);
          resolve(peak);
        }
      }, 50);
    });
    const h0 = monitorEventLoopDelay({ resolution: 1 });
    h0.enable();
    const base = await play(WARM, false);
    h0.disable();
    const h = monitorEventLoopDelay({ resolution: 1 });
    h.enable();
    const peak = await play(SEC, true);
    h.disable();
    // xả nốt như lúc tắt máy
    await db.commitQ;
    for (let i = 0; i < 200 && db.inflight.size; i++) await sleep(10);
    const left = db.dirtyMap.size;
    // tắt máy: world.saveAll đánh dấu người online rồi ghi đồng bộ
    for (const k of online) db.touch(k);
    db.flushAllSync();
    const p99 = h.percentile(99) / 1e6;
    const max = h.max / 1e6;
    console.log(`  ${tick} tick, ${written} lần ghi bất đồng bộ, ${commits} nhóm ghi (chậm nhất ${commitMax.toFixed(1)} ms), flushTick chậm nhất ${flushMax.toFixed(1)} ms, còn ${left} bản ghi bẩn lúc dừng`);
    console.log(`  trễ vòng lặp p50 ${(h.percentile(50) / 1e6).toFixed(1)} ms, p99 ${p99.toFixed(1)} ms, lớn nhất ${max.toFixed(1)} ms (lúc không lưu: p99 ${(h0.percentile(99) / 1e6).toFixed(1)} ms, lớn nhất ${(h0.max / 1e6).toFixed(1)} ms); RSS nền (đỉnh ${WARM} giây không lưu) ${mb(base)} MB, đỉnh khi lưu ${mb(peak)} MB`);
    ok(p99 <= LIM.p99, `persist-bench bố cục mới: ${N} nhân vật hậu kỳ, ${ONLINE} online → trễ vòng lặp p99 ≤ ${LIM.p99} ms (${p99.toFixed(1)} ms)`);
    ok(max <= LIM.block, `persist-bench: lượt chặn lớn nhất ≤ ${LIM.block} ms (${max.toFixed(1)} ms, ${os.cpus()[0].model})`);
    ok(peak - base <= LIM.rss * 1048576, `persist-bench: RSS đỉnh khi lưu ≤ RSS nền + ${LIM.rss} MB (+${mb(peak - base)} MB)`);
    // 1.000 thư khẩn + nhóm online phải xả kịp trong thời gian đo
    ok(written >= 1000 + ONLINE && left <= ONLINE, `persist-bench: hàng đợi lưu theo kịp (${written} lần ghi, còn ${left} bẩn lúc dừng)`);
    const disk = JSON.parse(fs.readFileSync(path.join(dir, 'chars', `${online[0]}.json`), 'utf8'));
    const jl = fs.existsSync(path.join(dir, 'journal')) ? fs.readdirSync(path.join(dir, 'journal')).length : 0;
    ok(disk.xu === db.chars[online[0]].xu && !jl, `persist-bench: sau khi xả, đĩa khớp RAM, không còn nhật ký nhóm ghi`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(fails ? `\nPERSIST-BENCH HỎNG: ${fails} mục` : '\nPERSIST-BENCH ĐẠT');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
