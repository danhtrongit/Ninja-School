// Kiểm định giao diện theo cảnh, ở nhiều cỡ màn: mỗi cảnh là một hàm trong SCENES nhận (page, vp, ok, shot).
// Dùng: BASE_URL=http://localhost:3600/ ACC=<tk admin> NODE_PATH=<nơi cài playwright> node tests/e2e/ui-audit.js
// SCENES=ask,ask-danger: chỉ chạy các cảnh này. OUT=<thư mục>: ảnh chụp từng cảnh × cỡ màn. In 'UI-AUDIT ĐẠT' khi mọi kiểm tra đạt.
// Thêm cảnh mới (ui-mobile-pass, ui-tutorial, ui-item-compare, ui-hud-banners...): thêm một khóa vào SCENES, không viết khung riêng.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.env.BASE_URL || 'http://localhost:3600/').replace(/\/?$/, '/');
const ACC = process.env.ACC || 'vfaudit';
const OUT = process.env.OUT || path.join(os.tmpdir(), 'ninja-ui-audit');
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720, touch: false },
  { name: '844x390', width: 844, height: 390, touch: true },
  { name: '740x360', width: 740, height: 360, touch: true },
  { name: '667x375', width: 667, height: 375, touch: true },
];
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; return c; };

async function login(page) {
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  if (await page.evaluate(() => !!(window.ninja && window.ninja.game && window.ninja.game.active))) return;
  await page.click('[data-tab=register]').catch(() => {});
  await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1'); await page.fill('#in-pass2', 'matkhau1').catch(() => {});
  await page.click('#btn-login'); await page.waitForTimeout(900);
  if ((await page.textContent('#login-err')).trim()) {
    await page.click('[data-tab=login]'); await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1');
    await page.click('#btn-login'); await page.waitForTimeout(900);
  }
  if (await page.isVisible('#char-create')) {
    await page.fill('#in-cname', ACC.slice(0, 10) + 'x');
    await page.click('.class-card:nth-child(1)');
    await page.click('#btn-create'); await page.waitForTimeout(700);
  }
  if (await page.isVisible('.char-card .btn.primary')) await page.click('.char-card .btn.primary');
  await page.waitForFunction(() => window.ninja && window.ninja.game && window.ninja.game.active && window.ninja.S.me, null, { timeout: 10000 });
  await page.waitForTimeout(600);
}

// mở ask() (không chờ kết quả), trả về khi hộp đã hiện; kết quả lưu ở window.__ask
const openAsk = (page, opts) => page.evaluate((o) => {
  window.__ask = 'chờ';
  window.ninja.ui.ask(o).then((v) => { window.__ask = v; });
}, opts).then(() => page.waitForSelector('.ask-box'));
const askResult = (page) => page.waitForFunction(() => window.__ask !== 'chờ', null, { timeout: 2000 }).then(() => page.evaluate(() => window.__ask)).catch(() => 'chưa đóng');

const SCENES = {
  // màn chọn nhân vật (Đổi nhân vật trong Cài đặt): thẻ nằm gọn trong khung nhìn, nút vào game đủ lớn để chạm, vào lại được
  async chars(page, vp, shot) {
    await page.evaluate(() => window.ninja.ui.onChangeChar());
    await page.waitForSelector('#screen-chars:not(.hidden) .char-card', { timeout: 6000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#screen-chars .char-card')].map((c) => c.getBoundingClientRect());
      // chiều cao bố cục (thẻ còn hoạt ảnh hiện ra phóng nhỏ nên getBoundingClientRect thấp hơn chút)
      const play = [...document.querySelectorAll('.char-card .btn.primary')].map((b) => b.offsetHeight);
      return { n: cards.length, fits: cards.every((b) => b.left >= 0 && b.right <= innerWidth + 0.5 && b.top >= 0), play, W: innerWidth,
        hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    await shot('chars');
    ok(r.n >= 1 && r.fits && !r.hscroll, `chars ${vp.name}: màn #screen-chars hiện ${r.n} thẻ nhân vật nằm gọn chiều ngang, không cuộn ngang`);
    if (vp.touch) ok(r.play.length >= 1 && r.play.every((x) => x >= 44), `chars ${vp.name}: nút vào game cao ≥ 44px (${r.play.join(', ')})`);
    await page.click('.char-card .btn.primary');
    const back = await page.waitForFunction(() => window.ninja.game.active && window.ninja.S.me && document.querySelector('#screen-chars').classList.contains('hidden'), null, { timeout: 10000 }).then(() => true, () => false);
    await page.waitForTimeout(600);
    ok(back, `chars ${vp.name}: chọn nhân vật vào lại game`);
  },
  // hộp xác nhận vừa khung nhìn, nút đủ lớn để chạm
  async ask(page, vp, shot) {
    await openAsk(page, { title: 'Hủy vật phẩm', danger: true, ok: 'Hủy', text: ['Hủy Kiếm Gỗ +3 ×1? Không thể khôi phục.', 'Ngọc đang khảm cũng mất theo. Dòng chữ dài để thử xuống dòng trong hộp xác nhận trên màn nhỏ.'] });
    // chờ hết hoạt ảnh mở hộp (winIn phóng to dần) rồi mới đo
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const b = document.querySelector('.ask-box').getBoundingClientRect();
      const btns = [...document.querySelectorAll('.ask-btns button')].map((x) => x.getBoundingClientRect().height);
      const z = getComputedStyle(document.querySelector('.ask-back')).zIndex;
      return { l: b.left, t: b.top, r: b.right, b: b.bottom, W: innerWidth, H: innerHeight, btns, z };
    });
    await shot('ask');
    ok(r.l >= 0 && r.t >= 0 && r.r <= r.W && r.b <= r.H, `ask ${vp.name}: hộp nằm gọn trong khung nhìn (${Math.round(r.l)},${Math.round(r.t)}–${Math.round(r.r)},${Math.round(r.b)})`);
    if (vp.touch) ok(r.btns.length === 2 && r.btns.every((x) => x >= 44), `ask ${vp.name}: nút cao ≥ 44px (${r.btns.map(Math.round).join(', ')})`);
    ok(r.z === '90', `ask ${vp.name}: lớp z-index 90 (${r.z})`);
    await page.keyboard.press('Escape');
    await askResult(page);
  },
  // phím và chạm: Enter ở hộp nguy hiểm là hủy, Esc / chạm nền là hủy, Tab không thoát khỏi hộp
  async 'ask-danger'(page, vp) {
    if (vp.name !== '1280x720' && vp.name !== '844x390') return;
    await openAsk(page, { title: 'Hủy', danger: true, text: 'Hủy món này?' });
    await page.keyboard.press('Enter');
    ok((await askResult(page)) === false, `ask-danger ${vp.name}: ask({ danger: true }) + Enter → false`);
    await openAsk(page, { title: 'Xác nhận', text: 'Đồng ý?' });
    await page.keyboard.press('Enter');
    ok((await askResult(page)) === true, `ask-danger ${vp.name}: ask({}) + Enter → true`);
    await openAsk(page, { title: 'Xác nhận', text: 'Đồng ý?' });
    await page.keyboard.press('Escape');
    ok((await askResult(page)) === false, `ask-danger ${vp.name}: Esc → false`);
    await openAsk(page, { title: 'Xác nhận', text: 'Đồng ý?' });
    if (vp.touch) await page.touchscreen.tap(4, 4); else await page.mouse.click(4, 4);
    ok((await askResult(page)) === false, `ask-danger ${vp.name}: chạm nền → false`);
    await openAsk(page, { title: 'Xác nhận', text: 'Đồng ý?' });
    let inside = true;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      inside = inside && (await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.ask-box')));
    }
    ok(inside, `ask-danger ${vp.name}: Tab / Shift+Tab không thoát khỏi hộp`);
    await page.keyboard.press('Escape');
    await askResult(page);
  },
  // túi mở rộng tới 100 ô: chia 3 trang, nút trang đủ lớn trên điện thoại
  async 'bag-pages'(page, vp, shot) {
    await page.evaluate(() => window.ninja.net.send('chat', { ch: 'map', msg: '/luong 2000' }));
    await page.waitForTimeout(400);
    for (let i = 0; i < 6 && (await page.evaluate(() => window.ninja.S.inv.length)) < 100; i++) {
      await page.evaluate(() => window.ninja.net.send('invExpand'));
      await page.waitForTimeout(300);
    }
    const n = await page.evaluate(() => window.ninja.S.inv.length);
    ok(n === 100, `bag-pages ${vp.name}: túi mở rộng đủ 100 ô (${n})`);
    await page.evaluate(() => { const ui = window.ninja.ui; ui.closeAll(); ui.invPage = 2; ui.open('inv'); });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const body = document.querySelector('.win-inv .win-body');
      return { pages: [...document.querySelectorAll('[data-invpage]')].length, pager: [...document.querySelectorAll('.inv-pager .btn')].map((b) => b.getBoundingClientRect().height),
        label: (document.querySelector('[data-act=inv-pg]') || {}).textContent, slots: document.querySelectorAll('.win-inv .inv-grid > *').length,
        // nút chuyển trang (dưới lưới hoặc trên hàng tiêu đề) phải nằm trọn trong phần nhìn thấy của thân cửa sổ, không cần cuộn
        fits: [...document.querySelectorAll('[data-invpage], .inv-pager .btn')].every((b) => { const a = b.getBoundingClientRect(); const c = body.getBoundingClientRect(); return a.top >= c.top && a.bottom <= c.bottom; }) };
    });
    await shot('bag-pages');
    ok(r.slots === 40 && r.fits, `bag-pages ${vp.name}: trang 40 ô, nút chuyển trang nằm trọn trong cửa sổ (không cần cuộn)`);
    if (!vp.touch) ok(r.pages === 3, `bag-pages ${vp.name}: 3 nút trang dưới lưới (${r.pages})`);
    else {
      ok(r.pager.length === 2 && r.pager.every((x) => x >= 44) && r.label === '3/3', `bag-pages ${vp.name}: bộ chuyển trang ◀ 3/3 ▶ trên hàng tiêu đề, nút cao ≥ 44px (${r.pager.map(Math.round).join(', ')})`);
      await page.click('[data-act=inv-next]');
      await page.waitForTimeout(200);
      ok((await page.textContent('[data-act=inv-pg]')) === '1/3', `bag-pages ${vp.name}: bấm ▶ ở trang cuối quay về trang 1`);
    }
    await page.evaluate(() => { window.ninja.ui.invPage = 0; window.ninja.ui.closeAll(); });
  },
  // hủy nhanh: chế độ chọn, chọn 2 món, hỏi bằng ask() rồi hủy đúng 2 món
  async 'bag-pick'(page, vp, shot) {
    await page.evaluate(() => { window.ninja.net.send('chat', { ch: 'map', msg: '/item food_atk 1' }); window.ninja.net.send('chat', { ch: 'map', msg: '/item food_def 1' }); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const ui = window.ninja.ui; ui.closeAll(); ui.invPage = 0; ui.open('inv'); });
    await page.waitForTimeout(300);
    await page.click('[data-act=pick-start]');
    const idx = await page.evaluate(() => ['food_atk', 'food_def'].map((id) => window.ninja.S.inv.findIndex((it) => it && it.id === id)));
    for (const i of idx) await page.click(`.win-inv .inv-grid > :nth-child(${i + 1})`);
    await page.waitForTimeout(200);
    await shot('bag-pick');
    const lbl = await page.textContent('[data-act=pick-discard]');
    ok(/Hủy 2 món/.test(lbl), `bag-pick ${vp.name}: chế độ chọn đếm đúng 2 món (${lbl.trim()})`);
    await page.click('[data-act=pick-discard]');
    await page.waitForSelector('.ask-box.danger');
    await page.click('[data-act=ask-ok]');
    await page.waitForTimeout(500);
    const left = await page.evaluate(() => window.ninja.S.inv.filter((it) => it && (it.id === 'food_atk' || it.id === 'food_def')).length);
    ok(left === 0, `bag-pick ${vp.name}: hỏi bằng ask() rồi hủy đúng 2 món đã chọn`);
    await page.evaluate(() => { window.ninja.ui.invPick = null; window.ninja.ui.closeAll(); });
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = (process.env.SCENES || '').split(',').filter(Boolean);
  const scenes = Object.keys(SCENES).filter((k) => !only.length || only.includes(k));
  const browser = await chromium.launch();
  const errors = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp.touch
      ? { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
      : { viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${vp.name}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${vp.name}: PAGEERROR ${e.message}`));
    await login(page);
    console.log(`Cỡ màn ${vp.name}`);
    for (const s of scenes) {
      const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}-${vp.name}.png`) });
      try { await SCENES[s](page, vp, shot); } catch (e) { ok(false, `${s} ${vp.name}: lỗi ${e.message.split('\n')[0]}`); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`Ảnh: ${OUT}`);
  ok(!errors.length, `không có lỗi console/pageerror ở ${VIEWPORTS.length} cỡ màn (cảnh: ${scenes.join(', ')})`);
  console.log(fails ? `UI-AUDIT HỎNG: ${fails}` : 'UI-AUDIT ĐẠT');
  console.log(errors.join('\n') || 'OK no console errors');
  process.exit(fails || errors.length ? 1 : 0);
})();
