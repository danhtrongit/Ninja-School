'use strict';

// Số đo vận hành cho /api/metrics: thời gian mỗi tick, thời gian lưu chặn vòng lặp, trễ vòng lặp, bộ nhớ.
// Trễ vòng lặp và save.win tính từ lần đọc trước (người đọc nên đọc đều, vd mỗi 5-60 giây).
// Bật khi đặt METRICS_TOKEN (gọi kèm header x-metrics-token hoặc ?token=); không đặt thì đường dẫn trả 404.
const { monitorEventLoopDelay } = require('perf_hooks');

const WINDOW = 1200; // 60 giây ở 20 tick/giây

class Metrics {
  constructor() {
    this.ticks = new Float64Array(WINDOW);
    this.tickN = 0;
    this.saves = [];
    this.saveMax = 0;
    this.saveWin = 0;
    this.start = Date.now();
    this.loop = monitorEventLoopDelay({ resolution: 1 });
    this.loop.enable();
    // heapUsed tại một thời điểm lẫn cả rác chờ GC (răng cưa 20-75 MB); đáy heap trong cửa sổ ≈ phần còn giữ thật, rò rỉ làm đáy tăng
    this.heapLo = Infinity;
    this.memTimer = setInterval(() => { this.heapLo = Math.min(this.heapLo, process.memoryUsage().heapUsed); }, 1000);
    this.memTimer.unref();
  }

  // Bọc obj[k] để đo thời gian chạy đồng bộ (ms) và gọi rec(ms)
  wrap(obj, k, rec) {
    const f = obj[k].bind(obj);
    obj[k] = (...a) => {
      const t0 = process.hrtime.bigint();
      let r;
      try { r = f(...a); return r; } finally { rec(Number(process.hrtime.bigint() - t0) / 1e6, r); }
    };
  }

  watch(world, db) {
    this.world = world;
    this.wrap(world, 'tick', (ms) => { this.ticks[this.tickN++ % WINDOW] = ms; });
    const save = (ms, r) => {
      // flushTick không có gì để ghi (trả 0) thì không tính
      if (r === 0) return;
      this.saves.push(ms);
      if (this.saves.length > 200) this.saves.shift();
      this.saveMax = Math.max(this.saveMax, ms);
      this.saveWin = Math.max(this.saveWin, ms);
    };
    // lưu theo nhân vật: đo phần chặn vòng lặp của mỗi lượt xả (stringify + mở ghi), nhóm ghi và lần xả đồng bộ
    for (const k of ['flushTick', 'commit', 'flushAllSync']) if (typeof db[k] === 'function') this.wrap(db, k, save);
  }

  snapshot() {
    const n = Math.min(this.tickN, WINDOW);
    const t = Array.from(this.ticks.subarray(0, n)).sort((a, b) => a - b);
    const q = (p) => (n ? +t[Math.min(n - 1, Math.floor(n * p))].toFixed(2) : 0);
    const mem = process.memoryUsage();
    const loop = { p50: +(this.loop.percentile(50) / 1e6).toFixed(2), p99: +(this.loop.percentile(99) / 1e6).toFixed(2), max: +(this.loop.max / 1e6).toFixed(2) };
    this.loop.reset();
    const saveWin = this.saveWin;
    this.saveWin = 0;
    const heapLo = Math.min(this.heapLo, mem.heapUsed);
    this.heapLo = Infinity;
    return {
      up: Math.round((Date.now() - this.start) / 1000),
      online: this.world ? this.world.players.size : 0,
      tick: { n: this.tickN, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: n ? +t[n - 1].toFixed(2) : 0 },
      save: { n: this.saves.length, last: this.saves.length ? +this.saves[this.saves.length - 1].toFixed(2) : 0, max: +this.saveMax.toFixed(2), win: +saveWin.toFixed(2) },
      loop,
      mem: { rss: Math.round(mem.rss / 1048576), heap: Math.round(mem.heapUsed / 1048576), heapLo: Math.round(heapLo / 1048576) },
    };
  }

  // Xử lý HTTP; trả true nếu đã trả lời
  handle(req, res, url, token) {
    if (url.pathname !== '/api/metrics') return false;
    const got = req.headers['x-metrics-token'] || url.searchParams.get('token');
    if (!token || got !== token) {
      res.writeHead(404);
      res.end();
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(this.snapshot()));
    return true;
  }
}

module.exports = { Metrics };
