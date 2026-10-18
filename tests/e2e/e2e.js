// Kiểm thử tích hợp end-to-end: tìm đường, bản đồ thế giới, bộ kỹ năng + hệ thống mới (mục 7). Cần Playwright + Chromium.
// Dùng: BASE_URL=http://localhost:3000 ACC=<tk admin> MOBILE=1 OUT=/tmp/e2e NODE_PATH=$(npm root -g) npm run test:e2e
// ACC phải nằm trong biến ADMINS của server (dùng /lv, /tp, /item, /event). OUT: tiền tố đường dẫn ảnh chụp.
// ONLY=new: chỉ chạy mục 7, ONLY=auto: chỉ chạy mục 8. DBG=1: in trạng thái lúc chờ boss. Không chạy song song 2 lượt trên cùng server (lệnh /event là toàn server).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000/';
const MOBILE = process.env.MOBILE === '1';
const ACC = process.env.ACC || 'integ1';
const OUT = (process.env.OUT || path.join(os.tmpdir(), 'ninja-e2e', 'integ')) + '-' + (MOBILE ? 'm' : 'd');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? '  ✔ ' : '  ✘ ') + msg); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(MOBILE ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = (n) => page.screenshot({ path: `${OUT}-${n}.png` });
  const waitFor = async (fn, ms, a) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await ev(fn, a).catch(() => false)) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  const tap = async (sel) => (MOBILE ? page.tap(sel) : page.click(sel));
  const cmd = async (c) => {
    await ev((m) => { const hc = document.querySelector('#hud-chat'); if (hc) hc.classList.remove('collapsed'); document.querySelector('#chat-input').value = m; }, c);
    await page.focus('#chat-input'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    await ev(() => { document.activeElement && document.activeElement.blur(); if (window.ninja.ui.touch) document.querySelector('#hud-chat').classList.add('collapsed'); });
  };
  const login = async () => {
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    if (await ev(() => !!(window.ninja && window.ninja.game && window.ninja.game.active))) return;
    if (await page.isVisible('#screen-login')) {
      await page.click('[data-tab=register]').catch(() => {});
      await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1'); await page.fill('#in-pass2', 'matkhau1').catch(() => {});
      await page.click('#btn-login'); await page.waitForTimeout(900);
      if ((await page.textContent('#login-err')).trim()) {
        await page.click('[data-tab=login]'); await page.fill('#in-user', ACC); await page.fill('#in-pass', 'matkhau1');
        await page.click('#btn-login'); await page.waitForTimeout(900);
      }
    }
    if (await page.isVisible('#char-create')) {
      await page.fill('#in-cname', ACC + 'x');
      await page.click('.class-card:nth-child(1)');
      await page.click('#btn-create'); await page.waitForTimeout(700);
    }
    if (await page.isVisible('.char-card .btn.primary')) await page.click('.char-card .btn.primary');
    await waitFor(() => window.ninja && window.ninja.game && window.ninja.game.active && window.ninja.S.me, 8000);
    await page.waitForTimeout(800);
  };
  const mapId = () => ev(() => window.ninja.game.map.id);
  const travelOn = () => ev(() => !!window.ninja.game.travel && !document.querySelector('#hud-travel').classList.contains('hidden'));
  // bấm vào một bản đồ trên tranh bản đồ thế giới
  const clickWorld = async (id) => {
    const pt = await ev(async (id) => {
      const { WORLD_LAYOUT } = await import('/js/ui/worldmap.js');
      const cv = document.querySelector('.wmap-cv');
      const view = document.querySelector('.wmap-view');
      const p = WORLD_LAYOUT[id];
      const W = 280; const H = 160;
      const r0 = cv.getBoundingClientRect();
      const sx = (p.x / W) * r0.width; const sy = ((p.y - 4) / H) * r0.height;
      view.scrollLeft = Math.max(0, sx - view.clientWidth / 2);
      view.scrollTop = Math.max(0, sy - view.clientHeight / 2);
      const r = cv.getBoundingClientRect();
      return { x: r.left + sx, y: r.top + sy };
    }, id);
    if (MOBILE) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
  };
  const openWin = async (name, key) => {
    if (MOBILE) await ev((n) => window.ninja.ui.open(n), name);
    else await page.keyboard.press(key);
    await page.waitForTimeout(500);
  };

  // ---- 7. Hệ thống mới, đi qua nhanh: ngày/đêm, nội tại, thời trang + thú cưỡi, thú nuôi, khảm/ghép ngọc,
  //         thư + giftcode, lễ hội, Tà Thú + boss niệm chiêu, lôi đài. Chạy riêng: ONLY=new
  const S_ = (fn, a) => ev(fn, a);
  const closeWin = () => ev(() => window.ninja.ui.closeAll());
  const freshWin = async (name, key) => { await closeWin(); await page.waitForTimeout(150); await openWin(name, key); };
  const invIdx = (id) => ev((id) => window.ninja.S.inv.findIndex((it) => it && it.id === id), id);
  const tapLoc = async (loc) => (MOBILE ? loc.tap({ timeout: 3000 }) : loc.click({ timeout: 3000 }));
  // mở hành trang, bấm món id rồi bấm nút có chữ label trong khung chi tiết
  const useInv = async (id, label) => {
    await freshWin('inv', 'KeyB');
    await ev(() => { window.ninja.ui.eqTab = 'gear'; window.ninja.ui.refresh(); });
    const i = await invIdx(id);
    if (i < 0) return false;
    await tapLoc(page.locator(`.win-inv .inv-grid > :nth-child(${i + 1})`));
    await page.waitForTimeout(250);
    const b = page.locator('.item-pop .pop-btns button', { hasText: label }).first();
    if (!(await b.count())) return false;
    await tapLoc(b);
    await page.waitForTimeout(500);
    return true;
  };
  const walkNpc = async (dest) => {
    await closeWin();
    await ev((d) => window.ninja.game.travelTo(d), dest);
    return waitFor(() => !!document.querySelector('#dialogs .dialog'), 30000);
  };
  const dlgBtn = async (txt) => {
    const b = page.locator('#dialogs .dialog button', { hasText: txt }).first();
    if (!(await b.count())) return false;
    await tapLoc(b);
    await page.waitForTimeout(500);
    return true;
  };
  const newSystems = async () => {
    console.log('  -- hệ thống mới');
    if ((await S_(() => window.ninja.S.me.level)) < 50) await cmd('/lv 50');
    await cmd('/tp v_fire');
    await page.waitForTimeout(1000);
    const name = await S_(() => window.ninja.S.me.name);

    // ngày / đêm
    await S_(() => { window.ninja.game.forceHour = 22; });
    await page.waitForTimeout(400);
    await shot('n-night');
    await S_(() => { window.ninja.game.forceHour = null; });

    // nội tại: đọc sách (cấp 1) rồi nâng bằng điểm kỹ năng ở tab Nội tại
    const pas = await S_(() => {
      const G = window.ninja.S.G;
      const c = window.ninja.S.me.cls;
      return Object.keys(G.skills).find((k) => G.skills[k].cls === c && G.skills[k].type === 'passive' && G.skills[k].req === 15);
    });
    const book = await S_((s) => window.ninja.S.G.skills[s].book, pas);
    if (!(await S_((s) => window.ninja.S.me.skills[s] > 0, pas))) {
      await cmd(`/item ${book}`);
      ok(await useInv(book, 'Đọc sách'), `hành trang: bấm "Đọc sách" ${book}`);
      ok(await waitFor((s) => window.ninja.S.me.skills[s] === 1, 3000, pas), `học nội tại ${pas} cấp 1`);
    }
    await freshWin('skill', 'KeyV');
    await tap('[data-sktab=passive]');
    await page.waitForTimeout(300);
    const pl0 = await S_((s) => window.ninja.S.me.skills[s], pas);
    const upBtn = page.locator('.skill-row.passive .sk-act .btn.primary:not([disabled])').first();
    if (await upBtn.count()) await tapLoc(upBtn);
    ok(await waitFor((a) => window.ninja.S.me.skills[a[0]] > a[1], 3000, [pas, pl0]), `nâng nội tại ${pas} bằng điểm kỹ năng (${pl0} → ${await S_((s) => window.ninja.S.me.skills[s], pas)})`);
    ok(await S_((s) => !window.ninja.S.me.hotbar.includes(s), pas), 'nội tại không nằm trên thanh kỹ năng');
    await shot('n-passive');

    // thời trang + thú cưỡi
    for (const id of ['mount_horse', 'mask_fox', 'cloak_wind']) {
      if (await S_((id) => Object.values(window.ninja.S.equip).some((e) => e && e.id === id), id)) continue;
      await cmd(`/item ${id}`);
      ok(await useInv(id, 'Trang bị'), `mặc ${id}`);
    }
    ok(await waitFor(() => !!window.ninja.S.equip.mount && !!window.ninja.S.me.look.mount, 3000), 'cưỡi thú: ô thú cưỡi có đồ, ngoại hình có thú cưỡi');
    ok(await S_(() => !!window.ninja.S.equip.mask && !!window.ninja.S.equip.cloak), 'ô mặt nạ + áo choàng có đồ');
    await freshWin('inv', 'KeyB');
    await tap('[data-eqtab=style]');
    await page.waitForTimeout(400);
    ok(await page.isVisible('.doll.style'), 'tab Thời trang trong hành trang');
    await shot('n-inv-style');
    await freshWin('char', 'KeyC');
    await page.waitForTimeout(400);
    await shot('n-char');

    // thú nuôi đi theo + cho ăn
    if (!(await S_(() => !!window.ninja.S.equip.pet))) {
      await cmd('/item pet_fox');
      ok(await useInv('pet_fox', 'Trang bị'), 'mang thú nuôi Hồ Ly Con');
    }
    ok(await waitFor(() => !!window.ninja.S.equip.pet && !!window.ninja.game.me.pet, 4000), 'thú nuôi đi theo chủ trên bản đồ');
    await cmd('/item pf_fish 3');
    await freshWin('pet', 'KeyK');
    ok(await page.isVisible('.pet-wrap'), 'mở cửa sổ Thú Cưng');
    const pe0 = await S_(() => { const p = window.ninja.S.equip.pet; return (p.plv || 1) * 1e9 + (p.pexp || 0) + (p.love || 0) * 1e6; });
    const feedB = page.locator('.pet-food .btn.primary:not([disabled])').first();
    if (await feedB.count()) await tapLoc(feedB);
    ok(await waitFor((v) => { const p = window.ninja.S.equip.pet; return (p.plv || 1) * 1e9 + (p.pexp || 0) + (p.love || 0) * 1e6 > v; }, 3000, pe0), 'cho thú ăn: EXP/thân mật tăng');
    await shot('n-pet');
    await closeWin();
    await page.waitForTimeout(300);
    await shot('n-pet-follow');

    // khảm ngọc ở Thợ Rèn
    if (!(await S_(() => window.ninja.S.equip.weapon))) ok(false, 'không có vũ khí để khảm ngọc');
    await cmd('/item gem_hoa_1 4');
    ok(await walkNpc({ npc: 'v_fire_smith' }), 'tới Thợ Rèn');
    ok(await dlgBtn('Khảm'), 'chọn "Khảm & ghép ngọc"');
    ok(await waitFor(() => window.ninja.ui.winName === 'upgrade' && !!document.querySelector('.gem-panel'), 3000), 'mở tab Khảm ngọc');
    const wHas = () => S_(() => (window.ninja.S.equip.weapon.gems || []).includes('gem_hoa_1'));
    if (!(await wHas())) {
      await S_(() => { window.ninja.ui.gemSel = { src: 'eq', slot: 'weapon' }; window.ninja.ui.refresh(); });
      await tapLoc(page.locator('.gem-bag > *').first());
      await page.waitForTimeout(250);
      await tapLoc(page.locator('.gem-hole.empty.ready').first());
      ok(await waitFor(() => (window.ninja.S.equip.weapon.gems || []).includes('gem_hoa_1'), 3000), 'khảm Hỏa Tâm Ngọc vào vũ khí');
    }
    await page.waitForTimeout(300);
    await shot('n-gem');
    await tap('[data-smtab=merge]');
    await page.waitForTimeout(300);
    await S_(() => { window.ninja.ui.mergeSel = 'gem_hoa_1'; window.ninja.ui.refresh(); });
    const g2 = await S_(() => window.ninja.S.inv.filter((x) => x && x.id === 'gem_hoa_2').reduce((s, x) => s + x.q, 0));
    const mb = page.locator('.gem-panel .btn.primary.big:not([disabled])').first();
    if (await mb.count()) await tapLoc(mb);
    ok(await waitFor((n) => window.ninja.S.inv.filter((x) => x && x.id === 'gem_hoa_2').reduce((s, x) => s + x.q, 0) > n, 3000, g2), 'ghép 3 ngọc cấp 1 → cấp 2');
    await shot('n-merge');

    // thư + giftcode
    await cmd(`/mail ${name} 500 2 hp1 3`);
    await freshWin('mail', 'KeyL');
    ok(await waitFor(() => !!document.querySelector('.mail-item.has-gift'), 4000), 'hộp thư có thư quà');
    await shot('n-mail');
    // thư hệ thống trao xu khóa: tính tổng xu + xu khóa
    const xu0 = await S_(() => (window.ninja.S.me.xu || 0) + (window.ninja.S.me.xuk || 0));
    await tapLoc(page.locator('.mail-foot .btn.primary').first());
    ok(await waitFor((x) => (window.ninja.S.me.xu || 0) + (window.ninja.S.me.xuk || 0) >= x + 500, 3000, xu0), 'nhận tất cả quà trong thư (+500 xu)');
    await page.fill('.code-in', 'MASAIKHONGCO');
    await tapLoc(page.locator('.code-row .btn.primary'));
    ok(await waitFor(() => !!document.querySelector('.code-msg.bad'), 3000), 'giftcode sai báo lỗi');

    // lễ hội theo mùa
    const season = await S_(() => !!document.querySelector('.qt-season'));
    if (season) {
      await cmd('/item banh_trungthu 10');
      ok(await walkNpc({ npcType: 'event' }), 'tới Sứ Giả Lễ Hội');
      ok(await dlgBtn('Đổi quà'), 'chọn "Đổi quà lễ hội"');
      ok(await waitFor(() => window.ninja.ui.winName === 'event', 3000), 'mở cửa sổ Lễ Hội');
      const tk0 = await S_(() => window.ninja.S.inv.filter((x) => x && x.id === 'banh_trungthu').reduce((s, x) => s + x.q, 0));
      await tapLoc(page.locator('.ev-card.can .btn.primary').first());
      ok(await waitFor((n) => window.ninja.S.inv.filter((x) => x && x.id === 'banh_trungthu').reduce((s, x) => s + x.q, 0) < n, 3000, tk0), 'đổi quà lễ hội trừ vật phẩm sự kiện');
      await shot('n-event');
    } else console.log('    (không có mùa lễ hội, bỏ qua)');

    // Tà Thú: gọi sự kiện, biểu ngữ HUD, tới bãi, boss niệm chiêu
    await closeWin();
    await cmd('/event stop');
    // Tà Thú cấp thấp nhất, ghim bãi quái yếu nhất (wasteland) để nhân vật thử (cấp 50) sống tới lúc boss niệm chiêu
    await cmd('/event tathu ev_hacviem wasteland');
    ok(await waitFor(() => !!window.ninja.S.event && !document.querySelector('#hud-event').classList.contains('hidden'), 4000), 'biểu ngữ Tà Thú hiện trên HUD');
    await shot('n-tathu-banner');
    const evMap = await S_(() => window.ninja.S.event.map);
    // boss chờ 2,2s mới ra chiêu đầu, đòn thường của Tà Thú đủ hạ nhân vật cấp 50 trước đó:
    // /lv lên ít nhất 80 (kèm hồi đầy sinh lực) để sống tới lúc niệm chiêu
    // Tà Thú sau cân bằng đánh mạnh: lên 120 và dồn tiềm năng vào thể lực để nhân vật thử chịu được tới chiêu đầu
    await cmd('/lv 120');
    await ev(() => { const n = window.ninja.S.me.potential || 0; if (n > 0) window.ninja.net.send('addStat', { k: 'vit', n }); });
    await page.waitForTimeout(300);
    await cmd('/lv 120');
    await cmd(`/tp ${evMap}`);
    await page.waitForTimeout(1200);
    const bx = await S_(() => { const m = [...window.ninja.game.monsters.values()].find((o) => o.def && o.def.boss && !o.dead); return m ? Math.round(m.x) : null; });
    ok(bx != null, `Tà Thú có trên bản đồ ${evMap}`);
    if (bx != null) {
      // ghi nhận gói bossCast ngay khi tới (nhân vật thử yếu có thể gục sau chiêu đầu)
      await ev(() => {
        const g = window.ninja.game;
        window.__casts = 0;
        if (!g.__wrapCast) {
          const f = g.onBossCast.bind(g);
          g.onBossCast = (m) => { window.__casts++; window.__shotCast = performance.now(); return f(m); };
          g.__wrapCast = true;
        }
      });
      await ev((x) => window.ninja.game.travelTo({ map: window.ninja.game.map.id, x }), bx);
      // đánh boss cho chắc boss nhận mục tiêu (bãi có tầng, boss có thể đứng khác độ cao)
      await waitFor(() => !window.ninja.game.travel, 20000);
      await ev(() => {
        const g = window.ninja.game;
        const m = [...g.monsters.values()].find((o) => o.def && o.def.boss && !o.dead);
        if (m) g.setTarget({ kind: 'm', id: m.id, e: m });
        g.toggleAuto(true);
      });
      let cast = false;
      for (let k = 0; k < 40 && !cast; k++) {
        cast = await ev(() => window.__casts > 0);
        // Tà Thú sau cân bằng có thể hạ nhân vật thử trước chiêu đầu: hồi sinh, hồi đầy rồi quay lại cạnh boss
        if (!cast && (await ev(() => window.ninja.S.me.dead))) {
          await ev(() => window.ninja.net.send('revive', {}));
          await waitFor(() => !window.ninja.S.me.dead, 5000);
          await cmd(`/lv ${await S_(() => window.ninja.S.me.level)}`);
          if ((await S_(() => window.ninja.game.map.id)) !== evMap) { await cmd(`/tp ${evMap}`); await page.waitForTimeout(1200); }
          const bx2 = await S_(() => { const m = [...window.ninja.game.monsters.values()].find((o) => o.def && o.def.boss && !o.dead); return m ? Math.round(m.x) : null; });
          if (bx2 != null) await ev((x) => { const g = window.ninja.game; g.travelTo({ map: g.map.id, x }); }, bx2);
          await waitFor(() => !window.ninja.game.travel, 20000);
          await ev(() => { const g = window.ninja.game; const m = [...g.monsters.values()].find((o) => o.def && o.def.boss && !o.dead); if (m) g.setTarget({ kind: 'm', id: m.id, e: m }); g.toggleAuto(true); });
        }
        if (process.env.DBG) console.log('    dbg', await ev(() => { const g = window.ninja.game; const m = [...g.monsters.values()].find((o) => o.def && o.def.boss); return JSON.stringify({ hp: window.ninja.S.me.hp, me: [Math.round(g.me.x), Math.round(g.me.y)], tr: !!g.travel, auto: g.auto, boss: m && [Math.round(m.x), Math.round(m.y), m.hp, m.st] }); }));
        if (!cast) await page.waitForTimeout(1000);
      }
      if (!cast) console.log('    trạng thái:', await ev(() => { const g = window.ninja.game; const m = [...g.monsters.values()].find((o) => o.def && o.def.boss); return JSON.stringify({ me: [Math.round(g.me.x), Math.round(g.me.y)], dead: window.ninja.S.me.dead, boss: m && [Math.round(m.x), Math.round(m.y), m.hp] }); }));
      ok(cast, 'boss niệm chiêu (bossCast)');
      await ev(() => window.ninja.game.toggleAuto(false));
      await page.waitForTimeout(250);
      await shot('n-boss-cast');
    }
    await cmd('/event stop');
    await ev(() => { window.ninja.game.cancelTravel(); if (window.ninja.S.me.dead) window.ninja.net.send('revive', {}); });
    // đợi hồi sinh xong, khung Trọng Thương đóng để không che nút ở bước sau
    await waitFor(() => !window.ninja.S.me.dead && !document.querySelector('.death'), 5000);
    await page.waitForTimeout(600);
    // gói enterMap thay cả S.me mà không kèm gói 'me' (như hồi sinh về làng): thanh máu phải vẽ lại theo số mới
    await ev(() => { const { S, ui } = window.ninja; S.me = { ...S.me, hp: 1 }; ui.updateStatus(); });
    await cmd('/tp v_fire');
    await page.waitForTimeout(800);
    const hb = await ev(() => { const me = window.ninja.S.me; return { w: parseFloat(document.querySelector('#bar-hp i').style.width), want: Math.min(100, (me.hp / me.s.maxHp) * 100), hp: me.hp, txt: document.querySelector('#bar-hp span').textContent }; });
    ok(hb.hp > 1 && Math.abs(hb.w - hb.want) < 0.5 && !hb.txt.startsWith('1/'), `đổi bản đồ: thanh máu vẽ lại theo gói enterMap (${hb.txt})`);

    // lôi đài: tab Lôi đài trong Xếp hạng, đăng ký rồi hủy trên HUD
    await freshWin('rank', 'KeyR');
    await tap('[data-rktab=arena]');
    await page.waitForTimeout(500);
    await shot('n-arena-rank');
    await tapLoc(page.locator('.ar-join').first());
    ok(await waitFor(() => !document.querySelector('#hud-arena').classList.contains('hidden'), 3000), 'đăng ký lôi đài: khung chờ ghép trận hiện');
    await closeWin();
    await page.waitForTimeout(300);
    await shot('n-arena-queue');
    await tapLoc(page.locator('#hud-arena .ar-btn'));
    ok(await waitFor(() => document.querySelector('#hud-arena').classList.contains('hidden'), 3000), 'hủy đăng ký lôi đài');

    // bản đồ thế giới với vùng mới
    await freshWin('map', 'KeyM');
    await page.waitForTimeout(500);
    await shot('n-worldmap');
    await closeWin();
  };

  // ---- 8. Tự động nâng cao (tự hồi sinh về làng rồi quay lại bãi, hồi sinh bằng thẻ) và Dùng nhiều trong hành trang
  const autoPlus = async () => {
    const S = (fn, a) => ev(fn, a);
    await closeWin();
    await cmd('/tp fire_field');
    await page.waitForTimeout(1000);
    await S(() => Object.assign(window.ninja.S.settings, { autoRevive: 'town', autoReviveDelay: 1, autoBack: true }));
    await S(() => window.ninja.game.toggleAuto(true));
    await page.waitForTimeout(600);
    await cmd('/chet');
    ok(await waitFor(() => window.ninja.S.me.dead, 3000), '/chet: nhân vật gục khi đang tự động đánh');
    const vil = await S(() => window.ninja.S.G.classes[window.ninja.S.me.cls].village);
    ok(await waitFor((v) => window.ninja.game.map.id === v && !window.ninja.S.me.dead && !document.querySelector('.death'), 8000, vil), 'tự hồi sinh về làng sau thời gian chờ, khung Trọng Thương đóng');
    ok(await waitFor(() => !!window.ninja.game.travel, 4000), 'về làng xong tự tìm đường quay lại bãi cũ');
    await shot('auto-back');
    ok(await waitFor(() => window.ninja.game.map.id === 'fire_field' && !window.ninja.game.travel && window.ninja.game.auto, 90000), 'tới lại bãi cũ, tự động đánh vẫn bật');
    await cmd('/item revive_card 1');
    await S(() => { window.ninja.S.settings.autoRevive = 'card'; });
    await cmd('/chet');
    ok(await waitFor(() => window.ninja.S.me.dead, 3000), '/chet lần 2');
    ok(await waitFor(() => !window.ninja.S.me.dead, 6000) && (await mapId()) === 'fire_field' && (await S(() => !window.ninja.S.inv.some((it) => it && it.id === 'revive_card'))), 'chế độ Thẻ: hồi sinh tại chỗ bằng Thẻ Hồi Sinh, không về làng');
    await S(() => { window.ninja.game.toggleAuto(false); window.ninja.S.settings.autoRevive = 'off'; });
    // cửa sổ Cài đặt có mục Tự động nâng cao
    await closeWin();
    await S(() => window.ninja.ui.open('settings'));
    await page.waitForTimeout(400);
    ok(await S(() => !!document.querySelector('[data-sec="auto-plus"]') && document.querySelectorAll('[data-sec="auto-plus"] .set-seg .btn').length === 4), 'Cài đặt: mục Tự động nâng cao có 4 chế độ hồi sinh');
    await S(() => { const el = document.querySelector('[data-sec="auto-plus"]'); el.scrollIntoView(); });
    await shot('auto-settings');
    // Dùng nhiều: 6 rương, chọn ×5
    await cmd('/item chest 6');
    const c0 = await S(() => window.ninja.S.inv.reduce((n, it) => n + (it && it.id === 'chest' ? it.q : 0), 0));
    ok(await useInv('chest', 'Dùng nhiều'), 'hành trang: rương có nút Dùng nhiều');
    ok(await waitFor(() => !!document.querySelector('[data-act=use-n]'), 2000), 'hộp Dùng nhiều có ô số lượng');
    await shot('use-many');
    await tapLoc(page.locator('.use-n-quick button[data-n="5"]'));
    await tapLoc(page.locator('[data-act=ask-ok]'));
    ok(await waitFor((c) => window.ninja.S.inv.reduce((n, it) => n + (it && it.id === 'chest' ? it.q : 0), 0) === c - 5, 3000, c0), `Dùng nhiều ×5: mở đúng 5 rương (còn ${c0 - 5})`);
    await closeWin();
  };

  await login();
  console.log(`Đăng nhập ${ACC} (${MOBILE ? 'mobile' : 'desktop'}) ở ${await mapId()}, cấp ${await ev(() => window.ninja.S.me.level)}`);
  await shot('hud');
  if (process.env.ONLY === 'auto') {
    await autoPlus();
    console.log(fails ? `${fails} KIỂM TRA HỎNG` : 'E2E ĐẠT');
    console.log(errors.join('\n') || 'OK no console errors');
    return browser.close();
  }
  if (process.env.ONLY === 'new') {
    await newSystems();
    console.log(fails ? `${fails} KIỂM TRA HỎNG` : 'E2E ĐẠT');
    console.log(errors.join('\n') || 'OK no console errors');
    return browser.close();
  }

  // ---- 1. Nhiệm vụ chính: bấm dòng nhiệm vụ trên #hud-quest
  const q0 = await ev(() => window.ninja.S.me.quest);
  if (q0.i <= 1) {
    if (q0.i === 0) {
      await tap('#hud-quest .qt.main');
      await page.waitForTimeout(150);
      const on = await ev(() => !!window.ninja.game.travel || !!document.querySelector('#dialogs .dialog'));
      ok(on, 'bấm dòng nhiệm vụ: bắt đầu tìm đường tới Trưởng Làng (hoặc đã tới ngay)');
      await shot('quest-travel');
      ok(await waitFor(() => !!document.querySelector('#dialogs .dialog'), 20000), 'tới Trưởng Làng, mở hội thoại');
      await shot('elder-dialog');
      for (let k = 0; k < 4; k++) {
        const b = await page.$('#dialogs .dialog button.btn.primary');
        if (!b) break;
        const tx = await b.textContent();
        if (!/Nhận|Trả|Hoàn/.test(tx)) break;
        await b.click(); await page.waitForTimeout(600);
      }
      await ev(() => window.ninja.ui.closeAll && window.ninja.ui.closeAll());
      await page.keyboard.press('Escape').catch(() => {});
    }
    // nhiệm vụ diệt Slime (cần nhận ở Trưởng Làng rồi đi tới Đồi Hỏa Diệm)
    for (let k = 0; k < 2; k++) {
      const q = await ev(() => window.ninja.S.me.quest);
      if (q.st !== 0) break;
      await tap('#hud-quest .qt.main');
      await waitFor(() => !!document.querySelector('#dialogs .dialog'), 20000);
      const b = await page.$('#dialogs .dialog button.btn.primary');
      if (b) { await b.click(); await page.waitForTimeout(600); }
      await page.keyboard.press('Escape').catch(() => {});
      await ev(() => window.ninja.ui.closeAll && window.ninja.ui.closeAll());
    }
    const q1 = await ev(() => window.ninja.S.me.quest);
    ok(q1.i === 1 && q1.st === 1, `nhận nhiệm vụ diệt Slime (i=${q1.i}, st=${q1.st})`);
    await page.waitForTimeout(400);
    await tap('#hud-quest .qt.main');
    await page.waitForTimeout(300);
    ok(await travelOn(), 'bấm dòng nhiệm vụ: game.travel khác null và #hud-travel hiện');
    await shot('travel-field');
    ok(await waitFor(() => window.ninja.S.G.maps[window.ninja.game.map.id].mobs.includes('slime'), 40000), 'tự đi sang bản đồ kề có Slime gần nhất');
    ok(await waitFor(() => window.ninja.game.auto && window.ninja.game.hunt && window.ninja.game.hunt.mob === 'slime', 30000), 'tới nơi: bật auto, săn ưu tiên Slime');
    const p0 = await ev(() => window.ninja.S.me.quest.prog);
    ok(await waitFor((p0) => window.ninja.S.me.quest.prog > p0 || window.ninja.S.me.quest.st === 2, 40000, p0), 'auto đánh hạ Slime, tiến độ nhiệm vụ tăng');
    await shot('auto-hunt');
  } else {
    // lượt chạy lại (mobile): chỉ kiểm tra bấm dòng nhiệm vụ thì bắt đầu tìm đường
    await tap('#hud-quest .qt.main');
    await page.waitForTimeout(300);
    ok(await ev(() => !!window.ninja.game.travel || !!document.querySelector('#dialogs .dialog') || window.ninja.game.auto), 'bấm dòng nhiệm vụ: bắt đầu tìm đường');
    await shot('quest-travel');
    await page.waitForTimeout(1500);
    await ev(() => window.ninja.game.cancelTravel());
  }

  // ---- 2. Bản đồ thế giới: đi xa hơn (3 bản đồ)
  await ev(() => window.ninja.game.toggleAuto(false));
  if ((await ev(() => window.ninja.S.me.level)) < 30) await cmd('/lv 30');
  // lộ trình xa đi ngang Rừng Trúc (Vua Slime + quái chủ động): nhân vật thử mặc đủ bộ đồ cấp 30 như người chơi thật,
  // không thì nhân vật trần có khi bị hạ giữa đường và bài kiểm tìm đường hỏng vì lý do khác
  const weapon = await ev(() => `w_${window.ninja.S.me.cls}_3`);
  for (const id of [weapon, 'hat_3', 'armor_3', 'gloves_3', 'pants_3', 'shoes_3', 'necklace_3', 'ring_3', 'amulet_3']) {
    if (await ev((id) => Object.values(window.ninja.S.equip).some((e) => e && e.id === id), id)) continue;
    await cmd(`/item ${id}`);
    await waitFor((id) => window.ninja.S.inv.some((it) => it && it.id === id), 3000, id);
    await ev((id) => window.ninja.net.send('equip', { slot: window.ninja.S.inv.findIndex((it) => it && it.id === id) }), id);
    await waitFor((id) => Object.values(window.ninja.S.equip).some((e) => e && e.id === id), 3000, id);
  }
  await cmd('/lv 30');
  const far =MOBILE ? (await mapId() === 'v_water' ? 'v_fire' : 'v_water') : 'v_water';
  if (MOBILE) await tap('.mbtn.m-map').catch(async () => openWin('map', 'KeyM'));
  else await page.keyboard.press('KeyM');
  await page.waitForTimeout(700);
  ok(await page.isVisible('.wmap-cv'), 'mở bản đồ thế giới');
  await shot('worldmap');
  await clickWorld(far);
  const infoName = await page.textContent('.wmi-name').catch(() => '');
  const farName = await ev((id) => window.ninja.S.G.maps[id].name, far);
  ok(infoName.includes(farName), `chọn ${farName} trên bản đồ: khung thông tin hiện đúng`);
  await shot('worldmap-sel');
  await tap('.wmi-go');
  await page.waitForTimeout(400);
  ok(await travelOn(), 'bấm "Đi tới": bắt đầu tìm đường, #hud-travel hiện');
  ok(!(await page.isVisible('.wmap-cv')), 'cửa sổ bản đồ tự đóng');
  await shot('travel-far');
  const route = await ev(() => window.ninja.game.travel && window.ninja.game.travel.route.map((s) => s.to));
  console.log('    lộ trình:', JSON.stringify(route));
  const t0 = Date.now();
  const arrived = await waitFor((id) => window.ninja.game.map.id === id && !window.ninja.game.travel, 180000, far);
  ok(arrived, `tới bản đồ xa ${farName} sau ${Math.round((Date.now() - t0) / 1000)}s (hiện ở ${await mapId()})`);
  await shot('arrived');

  // ---- 3. Đi tới rồi hủy (phím A trên desktop, nút Hủy trên mobile)
  // đứng giữa làng để chuyến đi chưa kịp qua cổng khi hủy
  await cmd(`/tp ${await mapId()}`);
  await page.waitForTimeout(800);
  if (MOBILE) await tap('.mbtn.m-map').catch(async () => openWin('map', 'KeyM'));
  else await page.keyboard.press('KeyM');
  await page.waitForTimeout(600);
  await clickWorld(await mapId() === 'v_fire' ? 'v_water' : 'v_fire');
  await tap('.wmi-go');
  await page.waitForTimeout(800);
  ok(await travelOn(), 'tìm đường tới làng khác (2 bản đồ)');
  if (MOBILE) await tap('#hud-travel .tv-x');
  else { await page.keyboard.down('KeyA'); await page.waitForTimeout(150); await page.keyboard.up('KeyA'); }
  await page.waitForTimeout(300);
  ok(await ev(() => !window.ninja.game.travel && document.querySelector('#hud-travel').classList.contains('hidden')), MOBILE ? 'nút Hủy hủy tìm đường' : 'phím A hủy tìm đường, ẩn #hud-travel');
  await shot('cancel');

  // ---- 4. Bộ kỹ năng
  if (await mapId() !== far) { await cmd(`/tp ${far}`); await page.waitForTimeout(800); }
  await openWin('skill', 'KeyV');
  for (let k = 0; k < 4; k++) {
    const sel = '.skill-row:not(.usable) .sk-act .btn.primary:not([disabled])';
    if (!(await page.$(sel))) break;
    await page.locator(sel).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
  }
  const learned = await ev(() => Object.keys(window.ninja.S.me.skills).filter((s) => !window.ninja.S.G.skills[s].basic && window.ninja.S.G.skills[s].type !== 'passive' && window.ninja.S.me.skills[s] > 0));
  ok(learned.length >= 3, `học kỹ năng: ${learned.join(',')}`);
  if (await ev(() => window.ninja.S.me.hbi !== 0)) {
    await tap('.hb-tabs .tab:nth-child(1)');
    await waitFor(() => window.ninja.S.me.hbi === 0, 3000);
    await page.waitForTimeout(400);
  }
  const sA = learned[1];
  const sB = learned[2];
  // chọn kỹ năng (bấm dòng) rồi bấm ô 2
  await tap(`.skill-row.usable:nth-child(${await ev((s) => [...document.querySelectorAll('.sk-list .skill-row')].findIndex((r) => r.textContent.includes(window.ninja.S.G.skills[s].name)) + 1, sA)}) .sk-act .btn:not(.primary)`);
  await page.waitForTimeout(250);
  await shot('skill-pick');
  await tap('.hb-slot[data-i="5"]');
  ok(await waitFor((s) => window.ninja.S.me.hotbar[5] === s && !window.ninja.S.me.hotbar.slice(0, 5).includes(s), 3000, sA), `bộ 1: gán ${sA} vào ô 6 bằng chọn-rồi-bấm-ô (server hoán đổi)`);
  await page.waitForTimeout(400);
  // đổi sang bộ 2
  await tap('.hb-tabs .tab:nth-child(2)');
  ok(await waitFor(() => window.ninja.S.me.hbi === 1, 3000), 'đổi sang bộ 2');
  await page.waitForTimeout(400);
  await tap('.hb-slot[data-i="0"]');
  await page.waitForTimeout(250);
  await tap(`.skill-row.usable:nth-child(${await ev((s) => [...document.querySelectorAll('.sk-list .skill-row')].findIndex((r) => r.textContent.includes(window.ninja.S.G.skills[s].name)) + 1, sB)}) .sk-act .btn:not(.primary)`);
  ok(await waitFor((s) => window.ninja.S.me.hotbar[0] === s && window.ninja.S.me.hotbars[1][0] === s, 3000, sB), `bộ 2: gán ${sB} vào ô 1 (chọn ô rồi chọn kỹ năng)`);
  await page.waitForTimeout(300);
  await shot('skill-set2');
  const hudSkill = await ev(() => window.ninja.ui.skillBtns[0].title);
  const nameB = await ev((s) => window.ninja.S.G.skills[s].name, sB);
  ok(hudSkill.includes(nameB), `HUD ô 1 hiển thị kỹ năng của bộ 2 (${hudSkill})`);
  // đổi lại bộ 1
  await tap('.hb-tabs .tab:nth-child(1)');
  ok(await waitFor((s) => window.ninja.S.me.hbi === 0 && window.ninja.S.me.hotbar[5] === s, 3000, sA), 'đổi lại bộ 1: thanh kỹ năng là bộ 1');
  await page.waitForTimeout(300);
  const before = await ev(() => JSON.stringify({ hb: window.ninja.S.me.hotbars, i: window.ninja.S.me.hbi }));
  await shot('skill-set1');
  if (MOBILE) await ev(() => window.ninja.ui.close()); else await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // nút đổi bộ trên HUD (desktop: viên 1 2 3; cảm ứng: nút tròn chạm để sang bộ kế)
  const hbSel = MOBILE ? '.hb-sets .hbs.on' : '.hb-sets .hbs:nth-child(3)';
  await tap(hbSel);
  ok(await waitFor(() => window.ninja.S.me.hbi === 1, 3000), 'nút đổi bộ trên HUD sang bộ 2');
  await page.waitForTimeout(400);
  await shot('hud-set2');
  for (let k = 0; k < 3 && (await ev(() => window.ninja.S.me.hbi)) !== 0; k++) {
    await tap(MOBILE ? '.hb-sets .hbs.on' : '.hb-sets .hbs:nth-child(2)');
    await page.waitForTimeout(500);
  }
  ok(await waitFor(() => window.ninja.S.me.hbi === 0, 3000), 'đổi lại bộ 1 bằng HUD');

  // ---- 5. Tải lại trang, đăng nhập lại
  await page.reload();
  await page.waitForTimeout(800);
  await login();
  const after = await ev(() => JSON.stringify({ hb: window.ninja.S.me.hotbars, i: window.ninja.S.me.hbi }));
  ok(after === before, `tải lại trang: bộ kỹ năng giữ nguyên ${after}`);

  // ---- 6. Auto đánh vẫn chạy (bãi quái gần nhất)
  await cmd('/tp fire_field');
  await page.waitForTimeout(1200);
  const k0 = await ev(() => window.ninja.S.me.kills || 0);
  await ev(() => window.ninja.game.toggleAuto(true));
  const exp0 = await ev(() => window.ninja.S.me.exp + window.ninja.S.me.level * 1e9);
  ok(await waitFor((e0) => window.ninja.S.me.exp + window.ninja.S.me.level * 1e9 > e0, 25000, exp0), 'auto đánh hạ quái (EXP tăng)');
  await shot('auto');
  await ev(() => window.ninja.game.toggleAuto(false));
  void k0;

  await autoPlus();
  await newSystems();

  console.log(fails ? `${fails} KIỂM TRA HỎNG` : 'E2E ĐẠT');
  console.log(errors.join('\n') || 'OK no console errors');
  await browser.close();
  process.exitCode = fails || errors.length ? 1 : 0;
})();
