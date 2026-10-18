'use strict';

// Phần vận hành của npm test (lưu trữ an toàn, chống sập, đăng nhập dồn, sao lưu): mỗi phần tự bật máy chủ riêng
// (cổng 4310-4339, DATA_DIR tạm) nên tests/smoke.js chạy file này song song với bộ bot chính rồi in kết quả ở cuối.
// Chạy riêng: node tests/ops.js
const { ok, fail, failCount } = require('./lib/harness');
const { loginBurstTest } = require('./features/account');
const { storageUnitTests, storageProcTests, crashGuardTests } = require('./features/storage');
const { backupUnitTests, backupRestoreTest, backupRestartTest, backupLagTest } = require('./features/backup');

async function main() {
  try {
    await storageUnitTests();
    await backupUnitTests();
    await storageProcTests();
    await crashGuardTests();
    await loginBurstTest();
    await backupRestoreTest();
    await backupRestartTest();
    await backupLagTest();
  } catch (e) {
    fail();
    console.error('  ✘ Lỗi:', e.message);
  }
  ok(true, 'phần vận hành chạy xong');
  process.exit(failCount() ? 1 : 0);
}

main();
