// Chụp màn hình game để kiểm tra giao diện (cần Playwright + Chromium).
// Dùng: BASE_URL=http://localhost:3000 NODE_PATH=$(npm root -g) node tools/shot.js '<json>'
// json: { account:'art1', out:'/path/prefix', mobile:false, cmds:['/lv 30','/tp bamboo'], keys:[['KeyD',1500],'KeyF'], wait:1500,
//         shots:[{name:'a', after:0, key:'KeyB', click:'.selector', x:900, hour:22}], screen:'game'|'login'|'chars'|'create', cls:0-5, gender:'f', hour:0-23,
//         dpr:3, equip:['hat_10', ...], vit:true, then:['/tp hell_gate'] }
// equip: sau cmds, tạo (/item) rồi mặc từng món ('w_*' = vũ khí đúng phái, ví dụ 'w_*_10'); vit: dồn điểm tiềm năng vào thể lực (chụp bãi quái cấp cao không bị hạ gục); then: lệnh chạy sau equip/vit
// shots[].x: tự đi tới tọa độ x trên bản đồ hiện tại trước khi chụp (gục thì hồi sinh tại chỗ); shots[].hour: ép giờ riêng cho ảnh đó
// Tài khoản phải được khai báo trong biến ADMINS của server nếu muốn dùng lệnh admin (/lv, /tp, /item...).
// Mật khẩu mặc định 'matkhau1'; tên tài khoản 4-16 ký tự.
const { chromium } = require('playwright');
const o = JSON.parse(process.argv[2] || '{}');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(o.mobile ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: o.dpr || 2, hasTouch: true, isMobile: true } : { viewport: { width: o.w || 1280, height: o.h || 720 }, deviceScaleFactor: o.dpr || 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:3000/');
  await page.waitForTimeout(1200);
  if (o.screen === 'login') { await page.screenshot({ path: `${o.out}-login.png` }); console.log(errors.join('\n') || 'OK no console errors'); return browser.close(); }
  const acc = o.account || 'art1';
  await page.click('[data-tab=register]').catch(() => {});
  await page.fill('#in-user', acc); await page.fill('#in-pass', 'matkhau1'); await page.fill('#in-pass2', 'matkhau1').catch(() => {});
  await page.click('#btn-login'); await page.waitForTimeout(900);
  if ((await page.textContent('#login-err')).trim()) {
    await page.click('[data-tab=login]'); await page.fill('#in-user', acc); await page.fill('#in-pass', 'matkhau1');
    await page.click('#btn-login'); await page.waitForTimeout(900);
  }
  if (await page.isVisible('#char-create')) {
    await page.fill('#in-cname', (o.charName || acc + 'x').slice(0, 12));
    if (o.gender) await page.selectOption('#in-gender', o.gender);
    if (o.cls != null) await page.click(`.class-card:nth-child(${o.cls + 1})`);
    if (o.screen === 'create') { await page.waitForTimeout(400); await page.screenshot({ path: `${o.out}-create.png` }); }
    await page.click('#btn-create'); await page.waitForTimeout(700);
  }
  if (o.screen === 'chars') { await page.screenshot({ path: `${o.out}-chars.png` }); console.log(errors.join('\n') || 'OK no console errors'); return browser.close(); }
  await page.click('.char-card .btn.primary'); await page.waitForTimeout(1500);
  // ép giờ lớp ngày/đêm (null = giờ thực Việt Nam)
  if (o.hour != null) await page.evaluate((hr) => { window.ninja.game.forceHour = hr; }, o.hour);
  const cmd = async (c) => {
    await page.evaluate((m) => { const hc = document.querySelector('#hud-chat'); if (hc) hc.classList.remove('collapsed'); document.querySelector('#chat-input').value = m; }, c);
    await page.focus('#chat-input'); await page.keyboard.press('Enter'); await page.waitForTimeout(450);
  };
  for (const c of o.cmds || []) await cmd(c);
  for (const raw of o.equip || []) {
    const id = raw.replace('*', await page.evaluate(() => window.ninja.S.me.cls));
    if (await page.evaluate((i) => Object.values(window.ninja.S.equip).some((e) => e && e.id === i), id)) continue;
    await cmd(`/item ${id}`);
    await page.waitForFunction((i) => window.ninja.S.inv.some((it) => it && it.id === i), id, { timeout: 3000 }).catch(() => errors.push('equip: không nhận được ' + id));
    await page.evaluate((i) => window.ninja.net.send('equip', { slot: window.ninja.S.inv.findIndex((it) => it && it.id === i) }), id);
    await page.waitForTimeout(150);
  }
  if (o.vit) { await page.evaluate(() => window.ninja.net.send('addStat', { k: 'vit', n: 9999 })); await page.waitForTimeout(300); }
  for (const c of o.then || []) await cmd(c);
  // gõ lệnh xong: thu khung chat lại như người chơi điện thoại (khung chat mở che giữa màn hình)
  if ((o.cmds || []).length || (o.then || []).length) await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); if (window.ninja && window.ninja.ui.touch) document.querySelector('#hud-chat').classList.add('collapsed'); });
  await page.waitForTimeout(o.wait || 1200);
  for (const k of o.keys || []) {
    if (Array.isArray(k)) { await page.keyboard.down(k[0]); await page.waitForTimeout(k[1]); await page.keyboard.up(k[0]); }
    else { await page.keyboard.press(k); await page.waitForTimeout(250); }
  }
  for (const s of o.shots || [{ name: 'game' }]) {
    if (s.x != null) {
      const revive = () => page.evaluate(() => { if (window.ninja.S.me.dead) window.ninja.net.send('revive', { mode: 'here' }); });
      await revive();
      await page.waitForTimeout(300);
      await page.evaluate((x) => window.ninja.game.travelTo({ map: window.ninja.game.map.id, x }), s.x);
      await page.waitForFunction((x) => Math.abs(window.ninja.game.me.x - x) < 40 || window.ninja.S.me.dead, s.x, { timeout: 15000 }).catch(() => {});
      if (await page.evaluate(() => window.ninja.S.me.dead)) {
        await revive();
        await page.waitForFunction(() => !window.ninja.S.me.dead, null, { timeout: 3000 }).catch(() => {});
      }
      await page.waitForTimeout(500);
    }
    if (s.hour != null) { await page.evaluate((hr) => { window.ninja.game.forceHour = hr; }, s.hour); await page.waitForTimeout(350); }
    if (s.after) await page.waitForTimeout(s.after);
    if (s.key) { await page.keyboard.press(s.key); await page.waitForTimeout(350); }
    if (s.click) { await page.click(s.click).catch((e) => errors.push('click ' + s.click + ' ' + e.message)); await page.waitForTimeout(350); }
    await page.screenshot({ path: `${o.out}-${s.name}.png` });
    if (s.key && s.toggleBack) { await page.keyboard.press(s.key); await page.waitForTimeout(200); }
  }
  console.log(errors.join('\n') || 'OK no console errors');
  await browser.close();
})();
