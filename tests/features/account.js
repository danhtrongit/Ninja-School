'use strict';

// Đăng ký tài khoản, dữ liệu tĩnh gói "data", tạo và chọn nhân vật.
const { ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');

async function accountTest(ctx) {
  console.log('1. Đăng ký & tạo nhân vật');
  const a = new Bot('A');
  global.botA = a;
  await a.connect();
  a.send('register', { u: 'botadmin', p: 'secret123' });
  const auth = await a.wait('auth');
  ok(auth.ok && auth.token, 'đăng ký thành công, nhận token');
  const gm = a.data.maps;
  ok(a.data.hotbarSets === 3, 'dữ liệu tĩnh có hotbarSets = 3');
  ok(gm.fire_field.mobs.includes('slime') && gm.bamboo.mobs.join() === 'monkey,bee,bandit' && gm.v_fire.mobs.length === 0,
    'maps[x].mobs liệt kê quái thường của bản đồ, sắp theo cấp');
  ok(gm.bamboo.bosses.some((x) => x.m === 'boss_slime' && x.x === 900) && gm.fire_field.bosses.length === 0
    && Object.values(gm).every((m) => m.mobs.every((id) => !a.data.monsters[id].boss)), 'maps[x].bosses có boss + tọa độ, mobs không chứa boss');
  const NEW_THEMES = { heaven: 'heaven', dragon_palace: 'dragon_palace', abyss: 'abyss', sakura_garden: 'sakura', ancient_ruins: 'ruins', crystal_cave: 'crystal' };
  ok(Object.entries(NEW_THEMES).every(([id, th]) => gm[id] && gm[id].theme === th), 'bản đồ hậu kỳ và nhánh phụ dùng theme riêng (heaven, dragon_palace, abyss, sakura, ruins, crystal)');
  ok(a.data.monsters.mushroom.drops.some((d) => d[0] === 'nam_doc') && Array.isArray(a.data.monsters.boss_dragon.drops),
    'monsters[x].drops gửi client (tìm đường cho nhiệm vụ thu thập)');
  await a.wait('chars');
  a.send('createChar', { name: 'KiemSi', cls: 'kiem', gender: 'm' });
  const chars = await a.wait('chars');
  ok(chars.chars.length === 1 && chars.chars[0].cls === 'kiem', 'tạo nhân vật phái Kiếm');
  a.send('createChar', { name: 'KiemSi', cls: 'tieu' });
  const dup = await a.wait('err');
  ok(/tồn tại/.test(dup.msg), 'không cho trùng tên nhân vật');
  a.send('selectChar', { name: 'KiemSi' });
  await a.wait('enterMap');
  ok(a.map === 'v_fire' && a.me.level === 1, 'vào Làng Hỏa Vân, cấp 1');
  ctx.a = a;
  ctx.auth = auth;
}

// 50 lần đăng nhập mật khẩu đồng thời (máy chủ riêng cổng 4320, NS_DEBUG_LAG=1): băm mật khẩu chạy ngoài luồng chính
async function loginBurstTest() {
  console.log('12. 50 lần đăng nhập mật khẩu đồng thời');
  const { LightBot } = require('../lib/lightbot');
  const { serve, tmpDir, cleanup } = require('./storage');
  const N = 50;
  const port = 4320;
  const s = serve(tmpDir('ns-burst-'), port, { NS_DEBUG_LAG: '1' });
  const bots = [];
  try {
    await s.ready();
    const url = `ws://localhost:${port}/ws`;
    const once = async (i, t, d) => {
      const b = new LightBot(url, `burst${String(i).padStart(2, '0')}`, i);
      bots.push(b);
      await b.connect();
      const got = Promise.race([b.next('auth'), b.next('err').then((m) => ({ err: m.msg }))]);
      b.send(t, d(b));
      const r = await got;
      b.close();
      return r;
    };
    const reg = await Promise.all(Array.from({ length: N }, (_, i) => once(i, 'register', (b) => ({ u: b.user, p: 'secret123' }))));
    await new Promise((r) => setTimeout(r, 1200));
    const from = s.log.length;
    const t0 = Date.now();
    const res = await Promise.all(Array.from({ length: N }, (_, i) => once(i, 'login', (b) => ({ u: b.user, p: 'secret123' }))));
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 1200));
    const lags = [...s.log.slice(from).matchAll(/\[lag\] tick trễ tối đa ([\d.]+) ms/g)].map((m) => +m[1]);
    const worst = lags.length ? Math.max(...lags) : -1;
    ok(reg.every((r) => r && r.ok) && res.every((r) => r && r.ok && r.token), `50 tài khoản đăng ký rồi đăng nhập mật khẩu đồng thời đều thành công (${ms} ms)`);
    ok(lags.length >= 1 && worst >= 0 && worst <= 50, `50 lần đăng nhập mật khẩu đồng thời không làm tick nào trễ > 50 ms (NS_DEBUG_LAG=1, tối đa ${worst} ms)`);
  } finally {
    for (const b of bots) b.close();
    await s.stop();
    cleanup();
  }
}

module.exports = { accountTest, loginBurstTest };
