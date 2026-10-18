'use strict';

// Lưu trữ an toàn (ops-db-safe-load) và chống sập (ops-crash-guard).
// Phần đơn vị chạy DB trên thư mục tạm; phần tiến trình bật máy chủ riêng (cổng 4310-4319, DATA_DIR tạm,
// log riêng: các phần này cố ý gây lỗi nên không dùng máy chủ chung của harness).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const { ok, sleep } = require('../lib/harness');
const { LightBot } = require('../lib/lightbot');
const { DB } = require('../../src/server/services/db');

const ROOT = path.join(__dirname, '..', '..');
const SERVER = path.join(ROOT, 'src', 'server', 'index.js');
const dirs = [];
const tmpDir = (p = 'ns-store-') => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); dirs.push(d); return d; };
const cleanup = () => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); };
const files = (dir) => fs.readdirSync(dir).sort();
const writeJson = (dir, name, v) => fs.writeFileSync(path.join(dir, name), typeof v === 'string' ? v : JSON.stringify(v));

// Bật máy chủ; trả { proc, log, code, exit, ready(ms), exitWithin(ms), stop() }
function serve(dataDir, port, env = {}) {
  const proc = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, TATHU: '0', SEASON: '0', NS_TEST: '1', BACKUP: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const s = { proc, log: '', code: undefined };
  proc.stdout.on('data', (d) => { s.log += d; });
  proc.stderr.on('data', (d) => { s.log += d; });
  s.exit = new Promise((resolve) => proc.on('exit', (code) => { s.code = code; resolve(code); }));
  s.ready = async (ms = 10000) => {
    for (let t = 0; t < ms; t += 50) {
      if (s.log.includes('đang chạy')) return true;
      if (s.code !== undefined) return false;
      await sleep(50);
    }
    return false;
  };
  s.exitWithin = (ms) => Promise.race([s.exit, sleep(ms).then(() => 'timeout')]);
  s.stop = async () => {
    if (s.code !== undefined) return;
    proc.kill('SIGTERM');
    if ((await s.exitWithin(5000)) === 'timeout') proc.kill('SIGKILL');
    await s.exit;
  };
  return s;
}

function getJson(port, p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let b = '';
      res.on('data', (d) => { b += d; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// chạy script node, trả { code, out }
function node(args, env = {}) {
  return new Promise((resolve) => {
    const ch = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    ch.stdout.on('data', (d) => { out += d; });
    ch.stderr.on('data', (d) => { out += d; });
    ch.on('close', (code) => resolve({ code, out }));
  });
}

// bot: đăng ký/đăng nhập, tạo nhân vật nếu chưa có, vào game
async function player(port, user) {
  const b = new LightBot(`ws://localhost:${port}/ws`, user, 0);
  await b.login('secret123');
  return b;
}

// ---------- Đơn vị: nạp an toàn, ghi bền, đếm lỗi lưu, khóa
async function storageUnitTests() {
  console.log('0i. Lưu trữ an toàn (đơn vị)');
  const quiet = console.error;
  console.error = () => {};
  try {
    // (a) JSON hỏng: không chạy rỗng, giữ file hỏng
    const a = tmpDir();
    writeJson(a, 'accounts.json', { u1: { username: 'u1', chars: ['K1'] } });
    writeJson(a, 'characters.json', '{"a":');
    let err = null;
    try { new DB(a); } catch (e) { err = e; }
    const corrupt = files(a).find((n) => n.startsWith('characters.json.corrupt-'));
    ok(err && err.code === 'EDBLOAD' && corrupt && fs.readFileSync(path.join(a, corrupt), 'utf8') === '{"a":' && !files(a).includes('characters.json'),
      'DB: characters.json hỏng → lỗi nạp, file gốc giữ nguyên dưới tên .corrupt-*, không tạo characters.json rỗng');
    err = null;
    try { new DB(a); } catch (e) { err = e; }
    ok(err && err.code === 'EDBLOAD' && !files(a).includes('characters.json'), 'DB: khởi động lại sau khi file hỏng đã đổi tên vẫn không chạy rỗng');
    const fe = new DB(a, { forceEmpty: true });
    ok(Object.keys(fe.chars).length === 0 && fe.accounts.u1, 'DB: forceEmpty → chạy được, chỉ phần hỏng rỗng');
    const z = tmpDir();
    writeJson(z, 'accounts.json', '');
    err = null;
    try { new DB(z); } catch (e) { err = e; }
    ok(err && err.code === 'EDBLOAD' && /0 byte/.test(err.message), 'DB: file 0 byte (mất điện) cũng là lỗi nạp');

    // (b) .tmp hợp lệ: nạp và đưa về làm file chính
    const b = tmpDir();
    writeJson(b, 'characters.json', '{"a":');
    writeJson(b, 'characters.json.tmp', { kiemsi: { name: 'KiemSi', level: 7 } });
    const db = new DB(b);
    ok(db.chars.kiemsi && db.chars.kiemsi.level === 7 && files(b).includes('characters.json') && !files(b).includes('characters.json.tmp'),
      'DB: file gốc hỏng + characters.json.tmp hợp lệ → nạp từ .tmp và đưa về file chính');
    const c = tmpDir();
    writeJson(c, 'characters.json.tmp', { cung: { name: 'Cung', level: 3 } });
    ok(new DB(c).chars.cung.level === 3, 'DB: thiếu file gốc + .tmp hợp lệ → nạp từ .tmp');

    // ghi bền: .tmp + fsync + rename, không để lại .tmp
    const fsync = fs.fsyncSync;
    let syncs = 0;
    fs.fsyncSync = (fd) => { syncs++; return fsync(fd); };
    const renames = [];
    const rename = fs.renameSync;
    fs.renameSync = (x, y) => { renames.push(path.basename(x)); return rename(x, y); };
    db.chars.kiemsi.level = 8;
    const saved = db.save();
    fs.fsyncSync = fsync;
    fs.renameSync = rename;
    ok(saved && syncs >= 5 && renames.includes('characters.json.tmp') && !files(b).some((n) => n.endsWith('.tmp'))
      && JSON.parse(fs.readFileSync(path.join(b, 'characters.json'), 'utf8')).kiemsi.level === 8,
    `DB: ghi .tmp + fsync (${syncs} lần: 4 file + thư mục) + rename, không để lại .tmp`);

    // lỗi ghi: đếm liên tiếp, file cũ còn nguyên, ghi được thì về 0
    const seen = [];
    db.onSaveError = (e, n) => seen.push(n);
    db._failLeft = 2;
    db.chars.kiemsi.level = 9;
    const r1 = db.save();
    const r2 = db.save();
    const mid = db.saveErrors;
    const kept = JSON.parse(fs.readFileSync(path.join(b, 'characters.json'), 'utf8')).kiemsi.level;
    const r3 = db.save();
    ok(!r1 && !r2 && mid === 2 && seen.join() === '1,2' && kept === 8 && r3 && db.saveErrors === 0 && !files(b).some((n) => n.endsWith('.tmp')),
      'DB: lỗi ghi đếm saveErrors liên tiếp, file cũ còn nguyên, ghi được lại → saveErrors 0');

    // khóa: pid đã chết → lấy lại được
    const l = tmpDir();
    const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout;
    writeJson(l, 'server.lock', { pid: +dead, host: os.hostname(), at: Date.now() });
    const ldb = new DB(l, { lock: true });
    const lk = JSON.parse(fs.readFileSync(path.join(l, 'server.lock'), 'utf8'));
    ldb.unlock();
    ok(lk.pid === process.pid && !files(l).includes('server.lock'), 'khóa DATA_DIR của tiến trình đã chết được lấy lại, tắt thì xóa khóa');

    // băm bất đồng bộ cùng kết quả với băm cũ (mật khẩu cũ vẫn đăng nhập được)
    const salt = 'abcdef0123456789';
    ok(await DB.hashAsync('secret123', salt) === DB.hash('secret123', salt), 'băm mật khẩu bất đồng bộ trùng kết quả scryptSync cũ');
    const acc = await db.createAccountAsync('Nguoi_A', 'matkhau1');
    ok(acc && await db.checkPasswordAsync('nguoi_a', 'matkhau1') === acc && await db.checkPasswordAsync('nguoi_a', 'sai_mk') === null && db.checkPassword('Nguoi_A', 'matkhau1') === acc,
      'tài khoản tạo bằng băm bất đồng bộ đăng nhập được cả hai đường, sai mật khẩu bị từ chối');
  } finally {
    console.error = quiet;
    cleanup();
  }
}

// ---------- Tiến trình: mã thoát, khóa, báo lỗi lưu
async function storageProcTests() {
  console.log('10. Lưu trữ an toàn (máy chủ riêng)');
  try {
    // (a) characters.json hỏng → thoát mã 2
    const a = tmpDir();
    writeJson(a, 'accounts.json', {});
    writeJson(a, 'characters.json', '{"a":');
    const s1 = serve(a, 4310);
    const c1 = await s1.exitWithin(10000);
    ok(c1 === 2 && files(a).some((n) => n.startsWith('characters.json.corrupt-')) && !files(a).includes('characters.json') && /restore\.js --list/.test(s1.log),
      'characters.json = \'{"a":\' → khởi động thoát mã 2, file gốc còn dưới tên .corrupt-*, không có characters.json rỗng mới');

    // (b) .tmp hợp lệ → khởi động được với dữ liệu trong .tmp; FORCE_EMPTY=1 → khởi động được
    const b = tmpDir();
    writeJson(b, 'characters.json', '{"a":');
    writeJson(b, 'characters.json.tmp', { tmpchar: { name: 'TmpChar', level: 11 } });
    const s2 = serve(b, 4311);
    const up2 = await s2.ready();
    await s2.stop();
    const after = JSON.parse(fs.readFileSync(path.join(b, 'characters.json'), 'utf8'));
    ok(up2 && after.tmpchar && after.tmpchar.level === 11, 'có characters.json.tmp hợp lệ → khởi động thành công với dữ liệu trong .tmp');
    const s3 = serve(a, 4312, { FORCE_EMPTY: '1' });
    const up3 = await s3.ready();
    await s3.stop();
    ok(up3 && s3.code === 0, 'FORCE_EMPTY=1 → khởi động được khi file hỏng');

    // (d) hai tiến trình cùng DATA_DIR
    const d = tmpDir();
    const s4 = serve(d, 4313);
    await s4.ready();
    const s5 = serve(d, 4314);
    const c5 = await s5.exitWithin(10000);
    const st4 = await getJson(4313, '/api/status');
    ok(c5 === 3 && st4.ok && /đang được tiến trình/.test(s5.log), 'hai tiến trình cùng DATA_DIR → tiến trình thứ hai thoát mã 3, tiến trình đầu vẫn chạy');
    await s4.stop();
    ok(!files(d).includes('server.lock'), 'tắt sạch thì xóa server.lock');

    // (e) giả lỗi ghi 3 lần
    const e = tmpDir();
    const s6 = serve(e, 4315, { ADMINS: 'stadmin', NS_TEST_SAVE_FAIL: '3' });
    await s6.ready();
    const adm = await player(4315, 'stadmin');
    const usr = new LightBot('ws://localhost:4315/ws', 'stuser', 1);
    await usr.connect();
    let chars = usr.next('chars');
    usr.send('register', { u: 'stuser', p: 'secret123' });
    await chars;
    chars = usr.next('chars');
    usr.send('createChar', { name: 'StUser', cls: 'cung', gender: 'f' });
    await chars;
    const notices = [];
    adm.onMsg = ((orig) => function onMsg(m) { if (m.t === 'notice') notices.push(m); return orig.call(this, m); })(adm.onMsg);
    let st = null;
    for (let i = 0; i < 3; i++) {
      s6.proc.kill('SIGUSR2');
      for (let k = 0; k < 40; k++) {
        await sleep(50);
        st = await getJson(4315, '/api/status');
        if (st.saveErrors === i + 1) break;
      }
    }
    await sleep(100);
    const blocked = usr.next('err');
    usr.send('selectChar', { name: 'StUser' });
    const be = await blocked;
    ok(st.saveErrors === 3 && st.ok === false, `giả writeSync ném lỗi 3 lần → /api/status có saveErrors: 3, ok: false`);
    ok(notices.length >= 3 && notices.every((n) => n.kind === 'warn' && /Lưu dữ liệu thất bại/.test(n.msg)), 'lỗi lưu: admin online nhận notice cảnh báo');
    ok(be && /sự cố lưu dữ liệu/.test(be.msg), 'lỗi lưu ≥ 3 lần: selectChar bị từ chối');
    s6.proc.kill('SIGUSR2');
    for (let k = 0; k < 40 && st.saveErrors !== 0; k++) { await sleep(50); st = await getJson(4315, '/api/status'); }
    const enter = usr.next('enterMap');
    usr.send('selectChar', { name: 'StUser' });
    const en = await enter;
    ok(st.saveErrors === 0 && st.ok === true && en, 'lần ghi sau thành công → saveErrors: 0, ok: true, vào game lại được');
    ok(/\[ALERT\] lưu thất bại/.test(s6.log), 'lỗi lưu in [ALERT] ra log');
    adm.close();
    usr.close();
    await s6.stop();
  } finally {
    cleanup();
  }
}

// ---------- Chống sập: lỗi móc bị cô lập, lỗi chết người lưu khẩn cấp rồi thoát mã 1
async function crashGuardTests() {
  console.log('11. Chống sập (máy chủ riêng)');
  try {
    const a = tmpDir();
    const s1 = serve(a, 4316, { NS_TEST_THROW: 'second' });
    await s1.ready();
    await sleep(4200);
    const st = await getJson(4316, '/api/status');
    const alive = s1.code === undefined;
    ok(alive && st.ok && /\[hook\] Lỗi móc "second" của module testthrow/.test(s1.log),
      'NS_TEST_THROW=second → server vẫn chạy, log có tên module lỗi (testthrow)');
    const lines = (s1.log.match(/\[hook\] Lỗi móc "second"/g) || []).length;
    ok(lines <= 3, `lỗi móc lặp lại mỗi giây chỉ ghi log tối đa 3 lần/phút (${lines})`);
    await s1.stop();

    const b = tmpDir();
    const s2 = serve(b, 4317, { NS_TEST_THROW: 'fatal', ADMINS: 'fatadm' });
    await s2.ready();
    const bot = await player(4317, 'fatadm');
    const lv = bot.next('me', (m) => m.level === 25);
    bot.cmd('/lv 25');
    const me = await lv;
    bot.send('testFatal');
    const code = await s2.exitWithin(8000);
    bot.close();
    ok(me && code === 1 && /"lvl":"fatal"/.test(s2.log) && /lưu khẩn cấp xong/.test(s2.log), 'NS_TEST_THROW=fatal → tiến trình thoát mã 1 sau khi lưu khẩn cấp');
    const s3 = serve(b, 4318);
    const up = await s3.ready();
    const again = new LightBot('ws://localhost:4318/ws', 'fatadm', 0);
    await again.connect();
    const ch = again.next('chars');
    again.send('login', { u: 'fatadm', p: 'secret123' });
    const list = await ch;
    again.close();
    await s3.stop();
    ok(up && list && list.chars[0] && list.chars[0].level === 25, 'NS_TEST_THROW=fatal: cấp vừa đổi bằng /lv còn sau khi khởi động lại');

    const c = tmpDir();
    const s4 = serve(c, 4319, { NS_TEST_THROW: 'reject', ADMINS: 'rejadm' });
    await s4.ready();
    const rb = await player(4319, 'rejadm');
    rb.send('testFatal');
    const rc = await s4.exitWithin(8000);
    rb.close();
    ok(rc === 1 && /"kind":"unhandledRejection"/.test(s4.log), 'promise bị từ chối không bắt (unhandledRejection) → lưu khẩn cấp, thoát mã 1');
  } finally {
    cleanup();
  }
}

module.exports = { storageUnitTests, storageProcTests, crashGuardTests, serve, getJson, node, tmpDir, cleanup };
