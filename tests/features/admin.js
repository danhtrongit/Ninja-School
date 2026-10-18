'use strict';

// Khóa quyền quản trị (ops-admin-guard): server riêng KHÔNG có NS_TEST như production.
// Tên trong ADMINS chưa có tài khoản thì không đăng ký được; lệnh kiểm thử tắt, lệnh vận hành vẫn chạy; mỗi lệnh admin ghi log.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { ok, sleep, serverLog } = require('../lib/harness');
const { TEST_CMDS } = require('../../src/server/modules/admin');

const SERVER = path.join(__dirname, '..', '..', 'src', 'server', 'index.js');

function status(port) {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: '/api/status' }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
}

// Bot WebSocket tối giản cho cổng tùy ý (tests/lib/bot.js gắn cứng cổng của server chung)
function client(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const c = { ws, msgs: [], waiters: [], from: 0 };
    c.send = (t, d = {}) => { c.from = c.msgs.length; ws.send(JSON.stringify({ t, ...d })); };
    c.wait = (t, pred, ms = 4000) => {
      for (let i = c.from; i < c.msgs.length; i++) {
        const m = c.msgs[i];
        if (m.t === t && (!pred || pred(m))) { c.from = i + 1; return Promise.resolve(m); }
      }
      return new Promise((res, rej) => {
        const w = { t, pred, res };
        w.timer = setTimeout(() => { c.waiters.splice(c.waiters.indexOf(w), 1); rej(new Error(`admin: hết thời gian chờ "${t}"`)); }, ms);
        c.waiters.push(w);
      });
    };
    ws.on('message', (raw) => {
      const m = JSON.parse(raw);
      c.msgs.push(m);
      if (m.t === 'me') c.me = m;
      if (m.t === 'enterMap') c.me = m.me;
      for (const w of c.waiters.slice()) {
        if (w.t === m.t && (!w.pred || w.pred(m))) {
          c.waiters.splice(c.waiters.indexOf(w), 1);
          clearTimeout(w.timer);
          c.from = c.msgs.length;
          w.res(m);
          break;
        }
      }
      if (m.t === 'data') resolve(c);
    });
    ws.on('error', reject);
  });
}

async function startSrv(port, data, env) {
  const base = { ...process.env };
  delete base.NS_TEST;
  delete base.ADMIN_DEV;
  const srv = spawn(process.execPath, [SERVER], {
    env: { ...base, PORT: String(port), DATA_DIR: data, TATHU: '0', SEASON: '0', REG_LIMIT: '0', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.log = '';
  srv.stdout.on('data', (d) => { srv.log += d; });
  srv.stderr.on('data', (d) => { srv.log += d; });
  for (let i = 0; i < 60 && (await status(port)) !== 200; i++) await sleep(100);
  return srv;
}

async function stopSrv(srv) {
  srv.kill('SIGTERM');
  for (let i = 0; i < 30 && srv.exitCode === null && srv.signalCode === null; i++) await sleep(100);
}

// gõ lệnh chat, trả về dòng hệ thống đầu tiên phản hồi
async function cmd(c, msg) {
  c.send('chat', { ch: 'map', msg });
  const r = await c.wait('chat', (m) => m.ch === 'sys').catch(() => null);
  return r ? r.msg : '';
}

async function enterGame(c, u, name, register) {
  c.send(register ? 'register' : 'login', { u, p: 'matkhau1' });
  await c.wait('auth');
  const chars = await c.wait('chars');
  if (!chars.chars.length) {
    c.send('createChar', { name, cls: 'kiem', gender: 'm' });
    await c.wait('chars');
  }
  c.send('selectChar', { name });
  await c.wait('enterMap');
  // bỏ qua lời chào hệ thống lúc vào game để cmd() chỉ đọc phản hồi của lệnh
  await sleep(500);
  c.from = c.msgs.length;
}

async function adminTest() {
  console.log('Khóa quyền quản trị: chặn đăng ký tên admin, tắt lệnh kiểm thử ngoài NS_TEST, log lệnh admin');
  // server chung (NS_TEST=1): lệnh admin của các phần trước đã ghi log
  ok(/\[ADMIN\] bot_two \/lv 6/.test(serverLog()), 'server kiểm thử: lệnh admin ghi log "[ADMIN] bot_two /lv 6"');

  const port = 4400 + Math.floor(Math.random() * 90);
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-admin-'));
  let srv = null;
  try {
    // tạo sẵn tài khoản admin hợp lệ (như admin tự tạo lúc server còn trống), rồi chạy như production
    srv = await startSrv(port, data, { NS_TEST: '1', ADMINS: 'adminqa' });
    let c = await client(port);
    await enterGame(c, 'adminqa', 'QuanTri', true);
    c.ws.close();
    await stopSrv(srv);

    srv = await startSrv(port, data, { ADMINS: 'chuaco,adminqa' });
    const r = await client(port);
    r.send('register', { u: 'chuaco', p: 'matkhau1' });
    const e = await r.wait('err').catch(() => null);
    await sleep(150);
    ok(!!e && e.msg === 'Tên tài khoản không hợp lệ.' && !r.msgs.some((m) => m.t === 'auth') && /\[ALERT\][^\n]*chuaco/.test(srv.log),
      `ADMINS=chuaco + register { u: 'chuaco' } → bị từ chối (${e && e.msg}), log có [ALERT]`);
    r.send('login', { u: 'chuaco', p: 'matkhau1' });
    const e2 = await r.wait('err').catch(() => null);
    ok(!!e2 && !r.msgs.some((m) => m.t === 'auth'), 'tài khoản "chuaco" không được tạo (đăng nhập thất bại)');
    r.ws.close();

    c = await client(port);
    await enterGame(c, 'adminqa', 'QuanTri', false);
    const lv0 = c.me.level;
    const lv = await cmd(c, '/lv 50');
    await sleep(300);
    ok(lv === 'Lệnh không tồn tại.' && c.me.level === lv0, `không có NS_TEST: "/lv 50" trả "${lv}", cấp giữ ${c.me.level}`);
    const leaked = [];
    for (const k of TEST_CMDS) {
      const a = await cmd(c, `/${k} 1`);
      if (a !== 'Lệnh không tồn tại.') leaked.push(`/${k}: ${a}`);
    }
    ok(!leaked.length && ['lv', 'hethan', 'plus', 'thu', 'bosshp'].every((k) => TEST_CMDS.has(k)), `không có NS_TEST: mọi lệnh kiểm thử (${[...TEST_CMDS].map((k) => `/${k}`).join(' ')}) đều tắt${leaked.length ? ` (lọt: ${leaked.join('; ')})` : ''}`);
    const mail = await cmd(c, '/mail QuanTri 100 0');
    ok(/^Đã gửi thư/.test(mail), `không có NS_TEST: /mail vẫn chạy ("${mail}")`);
    const code = await cmd(c, '/code');
    const sk = await cmd(c, '/sukien auto');
    ok(/giftcode/i.test(code) && !!sk && sk !== 'Lệnh không tồn tại.', `lệnh vận hành /code, /sukien vẫn chạy ("${code.slice(0, 40)}", "${sk.slice(0, 40)}")`);
    const ops = [];
    for (const k of ['xu 10', 'luong 1', 'item hp1 1', 'tp v_fire']) {
      const a = await cmd(c, `/${k}`);
      if (!a || a === 'Lệnh không tồn tại.') ops.push(`/${k}`);
    }
    ok(!ops.length, `không có NS_TEST: lệnh vận hành /xu /luong /item /tp vẫn chạy (GDD 10 mục 9.4)${ops.length ? ` (bị tắt: ${ops.join(' ')})` : ''}`);
    await sleep(200);
    ok(/\[ADMIN\] adminqa \/lv 50\n/.test(srv.log) && /\[ADMIN\] adminqa \/mail QuanTri 100 0\n/.test(srv.log) && /\[ADMIN\] adminqa \/code\n/.test(srv.log),
      'mỗi lệnh admin in một dòng "[ADMIN] <tài khoản> /<lệnh> <tham số>" ra log (kể cả lệnh bị tắt)');
    c.ws.close();

    const u = await client(port);
    await enterGame(u, 'thuongqa', 'ThuongDan', true);
    const nu = await cmd(u, '/mail ThuongDan 1 0');
    await sleep(150);
    ok(/Lệnh không tồn tại/.test(nu) && !/\[ADMIN\] thuongqa/.test(srv.log), 'tài khoản thường gõ lệnh admin → không tồn tại, không ghi log [ADMIN]');
    u.ws.close();
  } finally {
    if (srv) await stopSrv(srv);
    fs.rmSync(data, { recursive: true, force: true });
  }
}

module.exports = { adminTest };
