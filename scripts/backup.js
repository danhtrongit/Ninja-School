'use strict';

// Tạo bản sao lưu DATA_DIR (chạy được khi máy chủ đang chạy: chỉ đọc file, không cần khóa).
//   node scripts/backup.js --tag predeploy       bản "trước triển khai" vào backups/pre/ (giữ 10 bản)
//   node scripts/backup.js --tier daily          ép tạo một bản ở tầng hourly|daily|weekly
//   node scripts/backup.js --tick                chạy một lượt lịch như máy chủ (tầng nào đến hạn thì tạo)
//   thêm --data <thư mục> (mặc định DATA_DIR hoặc ./data), --stats in JSON { file, ms, lagMax } (trễ vòng lặp lớn nhất)
// Mã thoát: 0 thành công, 1 lỗi, 2 sai tham số.
const path = require('path');
const { monitorEventLoopDelay } = require('perf_hooks');
const { Backup, SCHEDULED } = require('../src/server/services/backup');

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const flag = (k) => argv.includes(k);
const dataDir = path.resolve(opt('--data') || process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

async function main() {
  const tag = opt('--tag');
  const tier = opt('--tier');
  if (!tag && !tier && !flag('--tick')) {
    console.error('Dùng: node scripts/backup.js --tag <nhãn> | --tier hourly|daily|weekly | --tick [--data <thư mục>] [--stats]');
    return 2;
  }
  if (tier && !SCHEDULED.includes(tier)) {
    console.error(`Tầng không hợp lệ: ${tier}`);
    return 2;
  }
  const loop = monitorEventLoopDelay({ resolution: 1 });
  loop.enable();
  const t0 = Date.now();
  const bk = new Backup(dataDir, { pushCmd: flag('--push') ? undefined : '' });
  let files;
  if (tag) files = [await bk.pre(tag)];
  else if (tier) files = [await bk.create(tier, bk.now())];
  else files = await bk.tick();
  loop.disable();
  const ms = Date.now() - t0;
  for (const f of files) console.log(`Đã tạo ${path.relative(bk.dir, f)}`);
  if (!files.length) console.log('Không có tầng nào đến hạn.');
  if (flag('--stats')) console.log(JSON.stringify({ file: files[0] || null, ms, lagMax: +(loop.max / 1e6).toFixed(2) }));
  return 0;
}

main().then((code) => process.exit(code), (e) => {
  console.error(`Sao lưu thất bại: ${e.message}`);
  process.exit(1);
});
