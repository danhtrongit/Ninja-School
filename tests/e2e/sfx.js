// Kiểm chất lượng tiếng hiệu ứng tổng hợp: dựng từng tiếng bằng OfflineAudioContext trong Chromium rồi đo.
// Dùng: BASE_URL=http://localhost:3000/ NODE_PATH=<nơi cài playwright> node tests/e2e/sfx.js
// Ngưỡng mỗi tiếng: đỉnh ≤ -1 dBFS (không vỡ tiếng), có âm thanh (RMS ≥ -40 dBFS), năng lượng trên 8 kHz ≤ 3%
// (tiếng ồn tần cao là nguồn chính của cảm giác "rè"), tắt hẳn trước 1,6 giây, không có mẫu NaN.
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000/';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE);
  const res = await page.evaluate(async () => {
    const m = await import('./js/core/sound.js');
    const SR = 44100;
    const out = {};
    for (const id of m.SFX_IDS) {
      const a = new OfflineAudioContext(1, Math.floor(SR * 1.8), SR);
      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
      const g = a.createGain();
      g.gain.value = 0.8; // âm lượng hiệu ứng mặc định
      g.connect(comp).connect(a.destination);
      const dur = m.renderSfx(a, g, id, 0.01);
      const buf = await a.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0; let sum = 0; let nan = 0; let lastLoud = 0;
      for (let i = 0; i < d.length; i++) {
        const v = d[i];
        if (!Number.isFinite(v)) { nan++; continue; }
        const av = Math.abs(v);
        if (av > peak) peak = av;
        sum += v * v;
        if (av > 0.003) lastLoud = i;
      }
      // năng lượng trên 8 kHz: so phần còn lại sau bộ lọc thông cao bậc 2 (2 lần) với tổng
      let hp = 0; let x1 = 0; let y1 = 0; let x1b = 0; let y1b = 0;
      const rc = 1 / (2 * Math.PI * 8000); const dt = 1 / SR; const al = rc / (rc + dt);
      for (let i = 0; i < d.length; i++) {
        const y = al * (y1 + d[i] - x1); x1 = d[i]; y1 = y;
        const z = al * (y1b + y - x1b); x1b = y; y1b = z;
        hp += z * z;
      }
      const active = Math.max(1, lastLoud);
      out[id] = { dur, peakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(1), rmsDb: +(10 * Math.log10(sum / active || 1e-12)).toFixed(1), hf: +(hp / (sum || 1)).toFixed(4), tail: +(lastLoud / SR).toFixed(2), nan };
    }
    return out;
  });
  const ids = Object.keys(res);
  ok(ids.length >= 45, `có ${ids.length} tiếng tổng hợp (≥ 45)`);
  for (const id of ids) {
    const r = res[id];
    const good = r.nan === 0 && r.peakDb <= -1 && r.rmsDb >= -40 && r.hf <= 0.03 && r.tail <= 1.6;
    ok(good, `tiếng ${id}: đỉnh ${r.peakDb} dB, RMS ${r.rmsDb} dB, trên 8 kHz ${(r.hf * 100).toFixed(1)}%, kéo dài ${r.tail} s`);
  }
  console.log(fails ? `SFX HỎNG: ${fails}` : 'SFX ĐẠT');
  console.log(errors.join('\n') || 'OK no console errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
