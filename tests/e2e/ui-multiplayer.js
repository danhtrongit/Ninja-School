// Kiểm thử giao diện 2 người chơi thật (2 trình duyệt): menu người chơi, lời mời, giao dịch, nhóm, thách đấu,
// hiệu ứng cường hóa vũ khí và font VT323. Cần server có ADMINS=duoalpha,duobravo.
// Dùng: BASE_URL=http://localhost:3000 OUT=/tmp/duo NODE_PATH=$(npm root -g) npm run test:ui
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000/';
const OUT = process.env.OUT || '/tmp/duo';
const wait = (p, ms) => p.waitForTimeout(ms);
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? '  ✔' : '  ✘'} ${m}`);
  if (!c) fails++;
};

async function enter(browser, account, cls, gender) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(BASE);
  await wait(page, 1200);
  await page.click('[data-tab=register]');
  await page.fill('#in-user', account);
  await page.fill('#in-pass', 'matkhau1');
  await page.fill('#in-pass2', 'matkhau1');
  await page.click('#btn-login');
  await wait(page, 900);
  if ((await page.textContent('#login-err')).trim()) {
    await page.click('[data-tab=login]');
    await page.fill('#in-user', account);
    await page.fill('#in-pass', 'matkhau1');
    await page.click('#btn-login');
    await wait(page, 900);
  }
  if (await page.isVisible('#char-create')) {
    await page.fill('#in-cname', `${account.slice(0, 5)}${cls}`);
    await page.selectOption('#in-gender', gender);
    await page.click(`.class-card:nth-child(${cls + 1})`);
    await page.click('#btn-create');
    await wait(page, 700);
  }
  await page.click('.char-card .btn.primary');
  await wait(page, 1500);
  return page;
}

async function chat(page, msg) {
  await page.evaluate((m) => { document.querySelector('#hud-chat').classList.remove('collapsed'); document.querySelector('#chat-input').value = m; }, msg);
  await page.focus('#chat-input');
  await page.keyboard.press('Enter');
  await wait(page, 450);
}

// Bấm chuột vào nhân vật của người chơi khác trên canvas (tọa độ màn hình tính từ trạng thái game)
async function clickPlayer(page, name) {
  const pos = await page.evaluate((n) => {
    const { game } = window.ninja;
    const p = [...game.players.values()].find((o) => o.info.name === n);
    if (!p) return null;
    const [sx, sy] = game.toScreen(p.x, p.y - 12);
    return { x: sx / game.dpr, y: sy / game.dpr };
  }, name);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await wait(page, 400);
  return true;
}

(async () => {
  const browser = await chromium.launch();
  const a = await enter(browser, 'duoalpha', 0, 'm');
  const b = await enter(browser, 'duobravo', 3, 'f');
  const nameA = await a.evaluate(() => window.ninja.S.me.name);
  const nameB = await b.evaluate(() => window.ninja.S.me.name);
  for (const p of [a, b]) {
    await chat(p, '/lv 20');
    await chat(p, '/tp v_fire');
  }
  await wait(a, 1200);

  console.log('Font');
  const font = await a.evaluate(async () => { await document.fonts.ready; return document.fonts.check('20px VT323') && [...document.fonts].some((f) => f.family.includes('VT323') && f.status === 'loaded'); });
  ok(font, 'font VT323 (lưu kèm game) đã tải');

  console.log('Menu người chơi & giao dịch');
  ok(await clickPlayer(a, nameB), `A bấm vào ${nameB} trên bản đồ`);
  ok(await a.isVisible('.pmenu'), 'hiện menu người chơi');
  await a.screenshot({ path: `${OUT}-1-menu.png` });
  await a.click('.pmenu button:has-text("Giao dịch")');
  await wait(b, 600);
  ok(await b.isVisible('.invite'), 'B nhận lời mời giao dịch');
  await b.screenshot({ path: `${OUT}-2-invite.png` });
  await b.click('.invite .btn.primary');
  await wait(a, 700);
  ok(await a.isVisible('.win-trade') && await b.isVisible('.win-trade'), 'cửa sổ giao dịch mở ở cả 2 bên');
  await a.click('.win-trade .inv-grid .slot:not(.empty)');
  await a.fill('.win-trade input[type=number]', '300');
  await a.dispatchEvent('.win-trade input[type=number]', 'change');
  await wait(a, 500);
  await b.screenshot({ path: `${OUT}-3-trade.png` });
  const xuB0 = await b.evaluate(() => window.ninja.S.me.xu);
  for (const p of [a, b]) {
    await p.click('.win-trade .win-foot .btn:has-text("Khóa")');
    await wait(p, 300);
  }
  // A đưa đồ + xu, B không đặt gì: nút xác nhận của A cảnh báo, của B giữ chữ thường
  const okText = (p) => p.textContent('.win-trade [data-act=trade-ok]').then((s) => (s || '').trim());
  const okA = await okText(a);
  const okB = await okText(b);
  ok(okA === 'Xác nhận (bạn không nhận gì)' && okB === 'Xác nhận', `bên kia không đặt gì → nút đổi thành "${okA}" (B: "${okB}")`);
  await a.screenshot({ path: `${OUT}-3b-trade-warn.png` });
  for (const p of [a, b]) {
    await p.click('.win-trade [data-act=trade-ok]');
    await wait(p, 400);
  }
  await wait(b, 600);
  const xuB1 = await b.evaluate(() => window.ninja.S.me.xu);
  ok(xuB1 === xuB0 + 300 && !(await b.isVisible('.win-trade')), `giao dịch thành công qua giao diện (B nhận +300 xu: ${xuB0} → ${xuB1})`);

  console.log('Nhóm');
  await clickPlayer(a, nameB);
  await a.click('.pmenu button:has-text("Mời vào nhóm")');
  await wait(b, 600);
  await b.click('.invite .btn.primary');
  await wait(a, 800);
  const party = await a.evaluate(() => window.ninja.S.party.members.length);
  ok(party === 2, 'lập nhóm 2 người qua menu + lời mời');
  await a.screenshot({ path: `${OUT}-4-party.png` });

  console.log('Thách đấu');
  for (const p of [a, b]) await chat(p, '/tp fire_field');
  await wait(a, 1200);
  await chat(a, `/td ${nameB}`);
  await wait(b, 600);
  ok(await b.isVisible('.invite'), 'B nhận lời thách đấu');
  await b.click('.invite .btn.primary');
  await wait(a, 600);
  const duel = await a.evaluate(() => window.ninja.game.duelWith);
  ok(!!duel, 'bắt đầu thách đấu');
  for (let i = 0; i < 6; i++) {
    await a.evaluate((id) => { window.ninja.game.target = { kind: 'p', id }; }, duel);
    await a.keyboard.press('KeyJ');
    await wait(a, 550);
  }
  await a.screenshot({ path: `${OUT}-5-duel.png` });
  const hitB = await b.evaluate(() => window.ninja.S.me.hp < window.ninja.S.me.s.maxHp);
  ok(hitB, 'đòn đánh trong thách đấu gây sát thương cho B');

  console.log('Cường hóa vũ khí');
  await chat(a, '/tp v_fire');
  for (const lv of [5, 8, 11]) {
    await chat(a, `/plus ${lv}`);
    await wait(a, 700);
    const box = await a.evaluate(() => {
      const { game } = window.ninja;
      const [sx, sy] = game.toScreen(game.me.x, game.me.y);
      return { x: sx / game.dpr, y: sy / game.dpr, z: game.zoom / game.dpr };
    });
    await a.screenshot({ path: `${OUT}-6-plus${lv}.png`, clip: { x: Math.max(0, box.x - 30 * box.z), y: Math.max(0, box.y - 40 * box.z), width: 60 * box.z, height: 46 * box.z } });
  }
  const look = await a.evaluate(() => window.ninja.S.me.look.wp);
  ok(look === 11, 'nhân vật hiển thị vũ khí +11');

  const errs = [...a.errors, ...b.errors];
  ok(!errs.length, `không có lỗi console${errs.length ? `: ${errs.join(' | ')}` : ''}`);
  await browser.close();
  console.log(fails ? `\nTHẤT BẠI: ${fails}` : '\nTẤT CẢ KIỂM TRA GIAO DIỆN 2 NGƯỜI CHƠI ĐỀU ĐẠT');
  process.exit(fails ? 1 : 0);
})();
