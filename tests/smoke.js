'use strict';

// Kiểm thử tự động (npm test): kiểm công thức không cần server, rồi khởi động server tạm và điều khiển
// các bot qua WebSocket. Các phần chạy nối tiếp và dùng chung trạng thái (bot, nhân vật) phần trước để lại,
// nên giữ đúng thứ tự dưới đây. Mỗi tính năng một file trong features/, hạ tầng trong lib/.
const fs = require('fs');
const { DATA, sleep, ok, fail, failCount, serverLog, startServer } = require('./lib/harness');
const { passiveUnitTests, passiveBookTest, passiveRulesTest } = require('./features/passive');
const { bossUnitTests, bossCleanupUnitTests, bossEventTest } = require('./features/boss');
const { pkUnitTests, pkBotTest } = require('./features/pk');
const { repoUnitTests } = require('./features/repo');
const { clanUnitTests, clanTest } = require('./features/clan');
const { gemUnitTests, gemTest } = require('./features/gems');
const { petUnitTests, petTest } = require('./features/pets');
const { mailUnitTests, mailTest } = require('./features/mail');
const { arenaUnitTests, arenaTest } = require('./features/arena');
const { accountTest } = require('./features/account');
const { questTest } = require('./features/quest');
const { combatTest } = require('./features/combat');
const { skillsTest, resetStatsTest } = require('./features/skills');
const { socialTest, socialMoreTest, tradeUnitTests } = require('./features/social');
const { dailyTest, dailyTaskTest, dailyTaskUnitTests } = require('./features/daily');
const { endgameTest } = require('./features/endgame');
const { bagUnitTests, bagTest, useManyTest } = require('./features/inventory');
const { audioUnitTests, audioHttpTest } = require('./features/audio');
const { airTest, pickupTest } = require('./features/movement');
const { fashionTest } = require('./features/fashion');
const { saveTest, reloadTest } = require('./features/persistence');
const { unit: boundUnit, bot: boundBot } = require('./features/bound');
const { balanceUnitTests, balanceBotTest } = require('./features/balance');
const { devtoolsTest } = require('./features/devtools');
const { adminTest } = require('./features/admin');

// Kiểm thử không cần server (thế giới giả hoặc gọi thẳng công thức)
function unitTests() {
  passiveUnitTests();
  bossUnitTests();
  bossCleanupUnitTests();
  gemUnitTests();
  petUnitTests();
  mailUnitTests();
  arenaUnitTests();
  bagUnitTests();
  audioUnitTests();
  boundUnit(ok);
  balanceUnitTests();
  pkUnitTests();
  repoUnitTests();
  tradeUnitTests();
  dailyTaskUnitTests();
  clanUnitTests();
}

async function main() {
  unitTests();
  const srv = await startServer();

  // trạng thái dùng chung giữa các phần: ctx.a = bot admin (KiemSi), ctx.b = bot CungThu, ctx.auth = gói đăng nhập của A
  const ctx = {};
  try {
    await accountTest(ctx);
    await questTest(ctx);
    await combatTest(ctx);
    await skillsTest(ctx);
    await socialTest(ctx);
    await dailyTest(ctx);
    await dailyTaskTest();
    await endgameTest(ctx);
    await passiveBookTest(ctx);
    await passiveRulesTest(ctx);

    await airTest(ctx.a);
    await bossEventTest(ctx.a);
    await fashionTest(ctx.a);
    await gemTest(ctx.a);
    await petTest(ctx.a);
    await mailTest(ctx.a, ctx.b);
    await arenaTest();
    await bagTest(ctx.a);
    await useManyTest(ctx.a);
    await audioHttpTest();
    await devtoolsTest();
    await adminTest();

    await boundBot();
    // 3 nhân vật mới trên tài khoản admin đã đóng (lodai_a, lodai_b, khoa_a): gia tộc → PK → tiềm năng → nhặt đồ → xã hội
    const trio = await clanTest();
    await pkBotTest(trio);
    await resetStatsTest(trio.b);
    await pickupTest(trio);
    await socialMoreTest(trio);
    await balanceBotTest(ctx);
    await saveTest(ctx);
  } catch (e) {
    fail();
    console.error('  ✘ Lỗi:', e.message);
    if (process.env.DEBUG) for (const bot of [global.botA].filter(Boolean)) console.log(bot.msgs.filter((m) => !['state'].includes(m.t)).slice(-8).map((m) => JSON.stringify(m).slice(0, 160)).join('\n'));
  }
  srv.kill('SIGTERM');
  await sleep(400);
  const files = fs.readdirSync(DATA);
  ok(files.includes('characters.json'), 'ghi file dữ liệu khi tắt server');
  if (files.includes('characters.json')) await reloadTest();
  if (/Error|Lỗi xử lý/.test(serverLog())) {
    console.log(serverLog());
    ok(false, 'server không có lỗi trong log');
  }
  fs.rmSync(DATA, { recursive: true, force: true });
  const failures = failCount();
  console.log(failures ? `\nTHẤT BẠI: ${failures} kiểm tra lỗi` : '\nTẤT CẢ KIỂM TRA ĐỀU ĐẠT');
  process.exit(failures ? 1 : 0);
}

main();
