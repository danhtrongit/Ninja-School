// test:visual: mở /dev/gallery?shot=1 bằng Chromium, kiểm mọi ô có hình, đủ số ô, so mã băm với mốc tests/baseline/gallery.json.
// Dùng: BASE_URL=http://localhost:3600/ ACC=<tk admin> NODE_PATH=<nơi cài playwright> npm run test:visual
// (server phải chạy với DEV_TOOLS=1 và ACC trong ADMINS). BASELINE=update ghi lại mốc (chỉ sau khi đã xem ảnh, ghi lý do vào docs/PROGRESS.md).
// OUT=<thư mục>: ảnh chụp từng mục để xem.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.env.BASE_URL || 'http://localhost:3600/').replace(/\/?$/, '/');
const ACC = process.env.ACC || 'vfvisual';
const OUT = process.env.OUT || path.join(os.tmpdir(), 'ninja-gallery');
const BASEFILE = path.join(__dirname, '..', 'baseline', 'gallery.json');
const MIN_CELLS = 2000;
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

async function login(page) {
  await page.fill('#gal-user', ACC);
  await page.fill('#gal-pass', 'matkhau1');
  await page.click('#gal-login button');
}

// tài khoản admin phải tồn tại: đăng ký qua WebSocket nếu chưa có
async function ensureAccount(page) {
  await page.evaluate(([u]) => new Promise((done) => {
    const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/ws');
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === 'data') ws.send(JSON.stringify({ t: 'register', u, p: 'matkhau1' })); if (m.t === 'auth' || m.t === 'err') { ws.close(); done(); } };
    setTimeout(done, 5000);
  }), [ACC]);
}

async function run(browser, errors) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.goto(`${BASE}dev/gallery?shot=1&t=0.4`);
  await ensureAccount(page);
  const t0 = Date.now();
  await login(page);
  await page.waitForFunction(() => window.galleryReady === true, null, { timeout: 60000 });
  const sec = (Date.now() - t0) / 1000;
  const r = await page.evaluate(() => ({ hashes: window.galleryHashes, empty: window.galleryEmpty, n: window.galleryCount }));
  return { page, sec, ...r };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-gpu'] });
  const errors = [];
  // không bật DEV_TOOLS thì /dev/gallery phải 404 (kiểm ở tests/features/devtools.js); ở đây server đã bật
  const a = await run(browser, errors);
  ok(a.sec <= 20, `dựng xong gallery trong ${a.sec.toFixed(1)} giây (≤ 20)`);
  ok(a.n >= MIN_CELLS, `có ${a.n} ô (≥ ${MIN_CELLS})`);
  ok(a.empty.length === 0, `mọi ô có điểm ảnh khác nền${a.empty.length ? ': trống ' + a.empty.slice(0, 10).join(', ') : ''}`);
  for (const s of ['char', 'tier', 'aura', 'fashion', 'mount', 'pet', 'npc', 'monster', 'fx', 'theme', 'icon', 'skill', 'ui']) {
    const n = Object.keys(a.hashes).filter((k) => k.startsWith(s + '/')).length;
    ok(n > 0, `mục ${s}: ${n} ô`);
    const el = await a.page.$(`#sec-${s}`);
    if (el) await el.screenshot({ path: path.join(OUT, `gallery-${s}.png`) }).catch(() => {});
  }
  const b = await run(browser, errors);
  const diff2 = Object.keys(a.hashes).filter((k) => a.hashes[k] !== b.hashes[k]);
  ok(diff2.length === 0, `chạy 2 lần liên tiếp: 0 ô khác (${diff2.length}${diff2.length ? ': ' + diff2.slice(0, 8).join(', ') : ''})`);

  const platform = `${process.platform}-${process.arch}`;
  let base = null;
  try { base = JSON.parse(fs.readFileSync(BASEFILE, 'utf8')); } catch (e) { /* chưa có mốc */ }
  if (process.env.BASELINE === 'update') {
    const all = base && typeof base === 'object' ? base : {};
    all[platform] = a.hashes;
    fs.mkdirSync(path.dirname(BASEFILE), { recursive: true });
    fs.writeFileSync(BASEFILE, JSON.stringify(all) + '\n');
    console.log(`  đã ghi mốc ${Object.keys(a.hashes).length} ô cho ${platform} vào ${path.relative(process.cwd(), BASEFILE)}`);
  } else if (base && base[platform]) {
    const ref = base[platform];
    const changed = Object.keys(a.hashes).filter((k) => ref[k] && ref[k] !== a.hashes[k]);
    const added = Object.keys(a.hashes).filter((k) => !ref[k]);
    const removed = Object.keys(ref).filter((k) => !a.hashes[k]);
    ok(changed.length === 0 && removed.length === 0, `so mốc ${platform}: ${changed.length} ô đổi, ${removed.length} ô mất, ${added.length} ô mới${changed.length ? ': ' + changed.slice(0, 12).join(', ') : ''}`);
    if (changed.length) fs.writeFileSync(path.join(OUT, 'changed.txt'), changed.join('\n'));
  } else ok(false, `chưa có mốc cho ${platform} trong tests/baseline/gallery.json (chạy BASELINE=update sau khi xem ảnh)`);
  const size = fs.existsSync(BASEFILE) ? fs.statSync(BASEFILE).size : 0;
  ok(size > 0 && size < 160 * 1024, `tests/baseline/gallery.json ${Math.round(size / 1024)} KB`);
  console.log(`Ảnh từng mục: ${OUT}`);
  console.log(fails ? `VISUAL HỎNG: ${fails}` : 'VISUAL ĐẠT');
  console.log(errors.join('\n') || 'OK no console errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
