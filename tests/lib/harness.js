'use strict';

// Hạ tầng kiểm thử dùng chung: cổng + thư mục dữ liệu tạm, đếm kiểm tra, khởi động server tạm.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-test-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) failures++;
};
// lỗi ngoài ok() (ngoại lệ trong một phần kiểm thử) vẫn tính là một kiểm tra hỏng
const fail = () => { failures++; };
const failCount = () => failures;

// log gộp stdout/stderr của mọi lần khởi động server tạm
let log = '';
const serverLog = () => log;
async function startServer() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', '..', 'src', 'server', 'index.js')], {
    env: { ...process.env, PORT, DATA_DIR: DATA, ADMINS: 'botadmin,bot_two,lodai_a,lodai_b,khoa_a,khoa_b,devadm', TATHU: '0', SEASON: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const start = log.length;
  srv.stdout.on('data', (d) => { log += d; });
  srv.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50 && !log.slice(start).includes('đang chạy'); i++) await sleep(100);
  return srv;
}

module.exports = { PORT, DATA, sleep, ok, fail, failCount, serverLog, startServer };
