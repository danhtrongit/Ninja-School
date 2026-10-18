'use strict';

// Lưu dữ liệu: đăng nhập lại giữ nguyên nhân vật, khởi động lại server từ file JSON.
const { sleep, ok, fail, startServer, DATA } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { readChars, writeChars } = require('../lib/helpers');

// Đăng nhập lại bằng token sau khi đã chơi qua mọi phần: trang bị, thú, buff, kỹ năng, ngọc còn nguyên
async function saveTest(ctx) {
  const { a, b, auth } = ctx;
  console.log('8. Lưu dữ liệu');
  a.ws.close();
  await sleep(300);
  const c = new Bot('C');
  await c.connect();
  c.send('login', { u: 'botadmin', token: auth.token });
  const ch2 = await c.wait('chars');
  ok(ch2.chars[0].level === 120, 'đăng nhập lại bằng token, dữ liệu được giữ');
  c.send('selectChar', { name: 'KiemSi' });
  await Promise.all([c.wait('enterMap'), c.wait('inv')]);
  ok(c.inv.equip.weapon.id === 'w_kiem_11' && c.inv.equip.pet && c.inv.equip.pet.id === 'pet_bunny', 'trang bị & thú cưng vẫn còn sau khi đăng nhập lại');
  ok(c.inv.equip.pet.plv === 12 && c.inv.equip.pet.love === 70 && c.me.look.pl === 12, 'cấp và thân mật của thú được lưu trên món đồ qua đăng nhập lại');
  ok(c.me.buffs.some((b) => b.k === 'food_atk'), 'buff đồ ăn được giữ qua đăng nhập lại');
  ok(c.me.hbi === 1 && c.me.hotbars[1].join() === a.me.hotbars[1].join(), 'bộ kỹ năng đang dùng được giữ qua đăng nhập lại');
  ok(c.me.skills.k7 === 2 && c.me.skills.k9 === 1 && c.me.s.critDmg === 170, 'kỹ năng nội tại và chỉ số được giữ qua đăng nhập lại');
  ok(c.inv.equip.weapon.gems && c.inv.equip.weapon.gems[0] === 'gem_loi_2' && c.me.s.crit === a.me.s.crit, 'ngọc khảm trên vũ khí và chỉ số được giữ qua đăng nhập lại');
  c.ws.close();
  b.ws.close();
}

// Khởi động lại server từ file JSON: bộ kỹ năng lưu đúng, nhân vật cũ (chỉ có hotbar) được chuyển đổi
async function reloadTest() {
  console.log('9. Tải lại từ file: bộ kỹ năng & dữ liệu cũ');
  const { SKILLS } = require('../../src/shared/data/skills');
  const chars = readChars(DATA);
  const k = chars.kiemsi;
  ok(k && k.hotbars.length === 3 && k.hbi === 1 && !('hotbar' in k), 'file lưu hotbars + hbi, không lưu trùng hotbar');
  const kBar = k ? k.hotbars[1].join() : '';
  // Giả lập nhân vật tạo từ bản cũ: chỉ có hotbar, kèm sid rác
  const cu = chars.cungthu;
  delete cu.hotbars;
  delete cu.hbi;
  cu.hotbar = ['c1', '__proto__', 'constructor', 'k1', null, 'c1'];
  // dữ liệu bản cũ chưa có ô thời trang + ô lạ, và đồ thời trang đã quá hạn khi server tắt
  ok(k && k.equip.mask && k.equip.mask.id === 'mask_oni' && k.inv.some((it) => it && it.id === 'cloak_wind' && it.exp), 'file lưu ô thời trang và hạn sử dụng');
  for (const s of ['mask', 'cloak', 'costume', 'mount']) delete cu.equip[s];
  cu.equip.wings = { id: 'w_cung_0', q: 1, p: 0, r: 0, o: [] };
  // ngọc khảm hỏng trong file: id lạ, trùng loại, thừa lỗ
  if (k && k.equip.weapon) k.equip.weapon.gems = ['gem_loi_2', '__proto__', 'gem_loi_5', 'gem_hoa_1', 'gem_thuy_1'];
  if (k && k.equip.pet) k.equip.pet.gems = ['gem_hoa_1'];
  if (k && k.inv.some((it) => it && it.id === 'cloak_wind')) {
    // rương mở ở các phần trước có thể cho thêm Áo Choàng Gió: cho mọi chiếc hết hạn
    for (const it of k.inv) if (it && it.id === 'cloak_wind') it.exp = Date.now() - 1000;
    k.equip.costume = { id: 'costume_sakura', q: 1, p: 0, r: 2, o: [], exp: Date.now() - 1000 };
  }
  // tích hợp: thư nhận lúc offline kèm thú cưng đã nuôi và vũ khí đã khảm ngọc, cùng thú cưỡi đang cưỡi
  if (k) {
    k.mail = (k.mail || []).concat([{ id: 9001, at: Date.now() - 60000, from: 'Ban Quản Trị', title: 'Quà tích hợp', body: 'thử', xu: 10, luong: 1, read: false, got: false,
      items: [{ id: 'pet_fox', q: 1, p: 0, r: 2, o: [], plv: 7, pexp: 50, love: 66 }, { id: 'w_kiem_0', q: 1, p: 3, r: 1, o: [], gems: ['gem_hoa_2'] }] }]);
    if (!k.equip.mount) k.equip.mount = { id: 'mount_wolf', q: 1, p: 0, r: 2, o: [] };
  }
  writeChars(DATA, chars);
  const srv = await startServer();
  try {
    const d = new Bot('D');
    await d.connect();
    d.send('login', { u: 'bot_two', p: 'secret123' });
    await d.wait('chars');
    d.send('selectChar', { name: 'CungThu' });
    await d.wait('enterMap');
    ok(d.me.hbi === 0 && d.me.hotbars.length === 3 && d.me.hotbar.join() === 'c1,,,,,' && d.me.hotbars[1].every((x) => x === null)
      && d.me.hotbars[2].every((x) => x === null), 'nhân vật cũ: bộ 0 = thanh cũ (đã lọc sid rác), bộ 1-2 trống');
    await d.wait('inv');
    ok(d.inv && !d.inv.equip.mask && !d.inv.equip.mount && !('wings' in d.inv.equip) && d.me.look && !d.me.look.mount && d.me.s.spd >= 0,
      'nhân vật cũ chưa có ô thời trang: tải bình thường (ô trống), ô lạ bị bỏ');
    d.ws.close();
    const e = new Bot('E');
    await e.connect();
    e.send('login', { u: 'botadmin', p: 'secret123' });
    const ec = await e.wait('chars');
    const ks = ec.chars.find((c) => c.name === 'KiemSi');
    ok(ks && ks.look.mask === 'oni' && !ks.look.costume, 'màn chọn nhân vật: không vẽ món thời trang đã hết hạn lúc offline');
    e.send('selectChar', { name: 'KiemSi' });
    await e.wait('enterMap');
    await e.wait('inv');
    ok(e.inv.equip.mask && e.inv.equip.mask.id === 'mask_oni' && e.me.look.mask === 'oni', 'mặt nạ vĩnh viễn giữ nguyên sau khởi động lại');
    const left = [e.inv.equip.costume, ...e.inv.inv.filter((it) => it && it.id === 'cloak_wind')].filter(Boolean);
    ok(!left.length, `đồ thời trang quá hạn lúc server tắt: bị xóa khi tải lại${left.length ? ` (còn: ${JSON.stringify(left).slice(0, 200)}, giờ ${Date.now()})` : ''}`);
    ok(!!(await e.wait('notice', (m) => /Hết hạn sử dụng: .*Áo Choàng Phong Vân/.test(m.msg) && /Y Phục Anh Đào/.test(m.msg)).catch(() => null)), 'vào game nhận thông báo các món đã hết hạn');
    ok(e.me.hbi === 1 && e.me.hotbar.join() === kBar && e.me.hotbars[1].join() === kBar, 'bộ kỹ năng giữ nguyên sau khi khởi động lại server');
    ok(JSON.stringify(e.inv.equip.weapon.gems) === '["gem_loi_2",null,null]' && !('gems' in e.inv.equip.pet),
      `ngọc khảm hỏng trong file được dọn khi tải (${JSON.stringify(e.inv.equip.weapon.gems)})`);
    // tích hợp: các hệ thống mới cùng qua một lần khởi động lại (nội tại, thú cưng, thú cưỡi, hộp thư, lôi đài)
    const pasK = Object.keys(k.skills || {}).filter((sid) => SKILLS[sid] && SKILLS[sid].type === 'passive');
    ok(pasK.length > 0 && pasK.every((sid) => e.me.skills[sid] === k.skills[sid]), `kỹ năng nội tại giữ cấp sau khởi động lại (${pasK.map((s) => `${s}:${k.skills[s]}`).join(', ')})`);
    const kp = k.equip.pet;
    const ep = e.inv.equip.pet;
    ok(kp && ep && ep.id === kp.id && (ep.plv || 1) === (kp.plv || 1) && (ep.pexp || 0) === (kp.pexp || 0) && ep.love === kp.love && e.me.look.pet,
      `thú cưng giữ cấp/EXP/thân mật và vẫn đi theo (${ep && `${ep.id} cấp ${ep.plv || 1}, thân mật ${ep.love}`})`);
    ok(e.inv.equip.mount && e.inv.equip.mount.id === k.equip.mount.id && !!e.me.look.mount && e.me.s.mountSpd > 0, `thú cưỡi giữ nguyên sau khởi động lại (+${e.me.s.mountSpd}% tốc chạy)`);
    e.send('mailList');
    const ml = await e.wait('mail');
    const gm = ml.list.find((x) => x.title === 'Quà tích hợp');
    ok(ml.list.length === k.mail.length && gm && !gm.read, `hộp thư giữ đủ ${ml.list.length} thư sau khởi động lại`);
    const [mPet, mW] = gm ? gm.items : [];
    ok(mPet && mPet.plv === 7 && mPet.love === 66 && mW && mW.p === 3 && JSON.stringify(mW.gems) === '["gem_hoa_2"]',
      'đồ đính kèm thư giữ cấp/thân mật thú cưng, cấp cường hóa và ngọc khảm');
    if (gm) {
      e.send('mailClaim', { id: gm.id });
      await e.wait('inv', (m) => m.inv.some((it) => it && it.id === 'pet_fox'));
      const ip = e.inv.inv.find((it) => it && it.id === 'pet_fox');
      const iw = e.inv.inv.find((it) => it && it.id === 'w_kiem_0' && it.p === 3);
      ok(ip && ip.plv === 7 && ip.love === 66 && iw && JSON.stringify(iw.gems) === '["gem_hoa_2"]', 'nhận quà thư: thú cưng và vũ khí khảm ngọc vào hành trang nguyên vẹn');
    }
    if (k.arena) ok(e.me.arena && e.me.arena.elo === k.arena.elo && e.me.arena.win === k.arena.win, `điểm lôi đài giữ nguyên (${e.me.arena && e.me.arena.elo})`);
    e.ws.close();
  } catch (err) {
    fail();
    console.error('  ✘ Lỗi:', err.message);
  }
  srv.kill('SIGTERM');
  await sleep(400);
}

module.exports = { saveTest, reloadTest };
