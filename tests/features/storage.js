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
const { isDeepStrictEqual } = require('util');
const { DB } = require('../../src/server/services/db');
const { lateChar } = require('../lib/chars');

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

    // (b) .tmp hợp lệ: nạp, rồi tách sang chars/ (bố cục 2); file cũ giữ lại dưới tên characters.migrated-*
    const b = tmpDir();
    writeJson(b, 'characters.json', '{"a":');
    writeJson(b, 'characters.json.tmp', { kiemsi: { name: 'KiemSi', level: 7 } });
    const db = new DB(b);
    ok(db.chars.kiemsi && db.chars.kiemsi.level === 7 && files(path.join(b, 'chars')).join() === 'kiemsi.json' && !files(b).includes('characters.json.tmp'),
      'DB: file gốc hỏng + characters.json.tmp hợp lệ → nạp từ .tmp rồi tách sang chars/');
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
    db.touch('KiemSi');
    const saved = db.save();
    fs.fsyncSync = fsync;
    fs.renameSync = rename;
    const onDisk = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'chars', 'kiemsi.json'), 'utf8')).level;
    ok(saved && syncs >= 5 && renames.includes('kiemsi.json.tmp') && !files(path.join(b, 'chars')).some((n) => n.includes('.tmp')) && onDisk(b) === 8,
      `DB: ghi .tmp + fsync (${syncs} lần: 3 bảng + nhân vật + thư mục) + rename, không để lại .tmp`);

    // lỗi ghi: đếm liên tiếp, file cũ còn nguyên, ghi được thì về 0
    const seen = [];
    db.onSaveError = (e, n) => seen.push(n);
    db._failLeft = 2;
    db.chars.kiemsi.level = 9;
    db.touch('kiemsi');
    const r1 = db.save();
    const r2 = db.save();
    const mid = db.saveErrors;
    const kept = onDisk(b);
    const r3 = db.save();
    ok(!r1 && !r2 && mid === 2 && seen.join() === '1,2' && kept === 8 && r3 && db.saveErrors === 0 && onDisk(b) === 9 && !files(b).some((n) => n.endsWith('.tmp')),
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

// ---------- Lưu theo nhân vật (ops-persist-shard, ADR-10-1): tách bố cục, ngân sách mỗi tick, nhịp 30 giây, xả 500 nhân vật
const charFile = (dir, key) => path.join(dir, 'chars', `${encodeURIComponent(key)}.json`);
const onDiskChar = (dir, key) => {
  const c = JSON.parse(fs.readFileSync(charFile(dir, key), 'utf8'));
  delete c._gen;
  return c;
};
// chờ mọi lần ghi bất đồng bộ xong
async function settle(db) {
  for (let i = 0; i < 400 && db.inflight.size; i++) await sleep(10);
}
// dựng DATA_DIR bố cục mới với n nhân vật hậu kỳ
function seedLate(dir, n) {
  const db = new DB(dir);
  for (let i = 0; i < n; i++) {
    const c = lateChar(`Hk${i}`, i);
    db.chars[c.name.toLowerCase()] = c;
    db.touch(c.name);
  }
  db.flushAllSync();
  return db;
}

async function storageShardTests() {
  console.log('0k. Lưu theo nhân vật (đơn vị)');
  const quiet = console.error;
  const qlog = console.log;
  try {
    // (d) tách characters.json (bố cục 1) → chars/<khóa>.json
    const m = tmpDir();
    const legacy = {};
    for (let i = 0; i < 40; i++) {
      const c = lateChar(i % 7 ? `Ninja${i}` : `Kiếm Sĩ ${i}`, i);
      legacy[c.name.toLowerCase()] = c;
    }
    const raw = JSON.stringify(legacy);
    writeJson(m, 'characters.json', raw);
    writeJson(m, 'accounts.json', { u1: { username: 'u1', chars: ['Ninja1'] } });
    console.log = () => {};
    const mdb = new DB(m);
    console.log = qlog;
    const want = JSON.parse(raw);
    const list = files(path.join(m, 'chars'));
    const diff = Object.keys(want).filter((k) => !isDeepStrictEqual(onDiskChar(m, k), want[k]) || !isDeepStrictEqual(mdb.chars[k], want[k]));
    const kept = files(m).find((n) => /^characters\.migrated-.*\.json$/.test(n));
    ok(list.length === Object.keys(want).length && list.every((n) => n.endsWith('.json')) && !diff.length && kept && fs.readFileSync(path.join(m, kept), 'utf8') === raw && !files(m).includes('characters.json'),
      `tách dữ liệu một file cũ: số file chars/ = số khóa characters.json (${list.length}), từng nhân vật giống hệt (trừ _gen), file cũ giữ dưới tên characters.migrated-*${diff.length ? ` (lệch: ${diff.slice(0, 3).join(', ')})` : ''}`);
    const again = new DB(m);
    ok(again.meta.layout === 2 && isDeepStrictEqual(JSON.parse(JSON.stringify(again.chars)), want) && again.accounts.u1,
      'khởi động lại sau khi tách: nạp từ chars/ (meta.layout = 2), dữ liệu không đổi');

    // ngân sách: mỗi tick tối đa 20 bản ghi hoặc 8 ms phần đồng bộ, cũ nhất ghi trước
    const t = tmpDir();
    const tdb = seedLate(t, 300);
    const keys = Object.keys(tdb.chars);
    for (const k of keys) tdb.touch(k, true);
    const timed = () => {
      const t0 = process.hrtime.bigint();
      const n = tdb.flushTick(Date.now());
      return { n, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
    };
    const r1 = timed();
    const first = [...tdb.inflight.keys()];
    await settle(tdb);
    const n1 = r1.n;
    ok(n1 > 0 && n1 <= 20 && tdb.dirtyMap.size === 300 - n1 && isDeepStrictEqual(first, keys.slice(0, n1)),
      `flushTick: một tick ghi ${n1} bản ghi (≤ 20), bản ghi bẩn cũ nhất ghi trước`);
    // ngân sách thời gian: sau 8 ms không bắt đầu bản ghi mới → mỗi tick ≤ 8 ms + thời gian một bản ghi
    const ticks = [r1];
    while (tdb.dirtyMap.size && ticks.length < 100) {
      ticks.push(timed());
      await settle(tdb);
    }
    const over = ticks.filter((x) => x.n > 20 || x.ms > 8 + x.ms / x.n + 1);
    const worst = ticks.reduce((w, x) => (x.ms > w.ms ? x : w), ticks[0]);
    ok(!tdb.dirtyMap.size && ticks.length >= 15 && !over.length,
      `300 bản ghi khẩn xả qua ${ticks.length} tick, mỗi tick ≤ 20 bản ghi và ≤ 8 ms + 1 bản ghi (chậm nhất ${worst.ms.toFixed(2)} ms / ${worst.n} bản ghi)`);

    // nhịp 30 giây: nhân vật vừa ghi không ghi lại trước 30 giây trừ khi khẩn
    const k0 = keys[0];
    tdb.chars[k0].xu = 4242;
    tdb.touch(k0);
    const now = Date.now();
    const skip = tdb.flushTick(now);
    const later = tdb.flushTick(now + 30001);
    await settle(tdb);
    const wrote = onDiskChar(t, k0).xu === 4242;
    tdb.chars[k0].xu = 4343;
    tdb.touch(k0, true);
    const urg = tdb.flushTick(Date.now());
    await settle(tdb);
    ok(skip === 0 && later === 1 && wrote && urg === 1 && onDiskChar(t, k0).xu === 4343,
      'nhân vật vừa ghi: bẩn thường chờ đủ 30 giây mới ghi lại, bẩn khẩn (thư có quà, thoát game) ghi ngay tick sau');
    const tb = '#accounts';
    tdb.touch(tb, true);
    tdb.flushTick(Date.now());
    await settle(tdb);
    tdb.accounts.u9 = { username: 'u9', chars: [] };
    tdb.touch(tb);
    const tSkip = tdb.flushTick(Date.now());
    const tLater = tdb.flushTick(Date.now() + 5001);
    await settle(tdb);
    ok(tSkip === 0 && tLater === 1 && JSON.parse(fs.readFileSync(path.join(t, 'accounts.json'), 'utf8')).u9,
      'bảng tài khoản/gia tộc/meta: nhịp 5 giây');

    // ghi bất đồng bộ dở dang lúc tắt: flushAllSync ghi lại bản ghi đang bay, không mất
    tdb.chars[k0].xu = 5151;
    tdb.touch(k0, true);
    tdb.flushTick(Date.now());
    const flying = tdb.inflight.has(k0);
    tdb.flushAllSync();
    const sync = onDiskChar(t, k0).xu;
    await settle(tdb);
    ok(flying && sync === 5151 && onDiskChar(t, k0).xu === 5151 && !files(path.join(t, 'chars')).some((n) => n.endsWith('tmp')),
      'tắt máy khi đang ghi bất đồng bộ: flushAllSync ghi lại đồng bộ, lần ghi cũ không đè, không để lại file tạm');

    // (b) 500 nhân vật hậu kỳ cùng bẩn (lần ghi trước đã quá 30 giây: nạp lại từ đĩa), xả theo nhịp tick 50 ms
    const b = tmpDir();
    seedLate(b, 500);
    const bdb = new DB(b);
    for (const k of Object.keys(bdb.chars)) {
      bdb.chars[k].xu += 7;
      bdb.touch(k);
    }
    const b0 = Date.now();
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        bdb.flushTick(Date.now());
        if (!bdb.dirtyMap.size && !bdb.inflight.size) {
          clearInterval(iv);
          resolve();
        }
      }, 50);
    });
    const bms = Date.now() - b0;
    const stale = Object.keys(bdb.chars).filter((k) => onDiskChar(b, k).xu !== bdb.chars[k].xu);
    ok(bms <= 3000 && !stale.length, `500 nhân vật hậu kỳ cùng bẩn xả hết trong ≤ 3 giây (${(bms / 1000).toFixed(2)} s), đĩa khớp RAM${stale.length ? ` (lệch ${stale.length})` : ''}`);

    // nhóm ghi: không chặn vòng lặp, ghi xong thì không còn nhật ký; lỗi đĩa → false, giữ nhóm để thử lại / tắt máy ghi thay
    const [x1, x2] = Object.keys(bdb.chars);
    bdb.chars[x1].xu -= 300;
    bdb.chars[x2].xu += 300;
    const c0 = process.hrtime.bigint();
    const job = bdb.commit([x1, x2], 'trade');
    const cms = Number(process.hrtime.bigint() - c0) / 1e6;
    const busy = bdb.pending.has(x1) && bdb.pending.has(x2) && bdb.journals.size === 1;
    const cok = await job;
    const jleft = fs.existsSync(path.join(b, 'journal')) ? files(path.join(b, 'journal')).length : 0;
    ok(cok === true && busy && cms < 5 && !jleft && !bdb.pending.size && onDiskChar(b, x1).xu === bdb.chars[x1].xu && onDiskChar(b, x2).xu === bdb.chars[x2].xu,
      `commit giao dịch: phần đồng bộ ${cms.toFixed(2)} ms (chụp bản ghi), ghi nhật ký → hai bản ghi → xóa nhật ký không chặn vòng lặp`);
    console.error = () => {};
    bdb._failLeft = 1;
    bdb.chars[x1].xu -= 1;
    bdb.chars[x2].xu += 1;
    const cr = await bdb.commit([x1, x2], 'trade');
    const held = bdb.journals.size === 1 && bdb.pending.has(x1) && bdb.saveErrors === 1;
    const fl = bdb.flushAllSync();
    ok(cr === false && held && fl && !bdb.journals.size && !bdb.pending.size && onDiskChar(b, x1).xu === bdb.chars[x1].xu && onDiskChar(b, x2).xu === bdb.chars[x2].xu && !files(path.join(b, 'journal')).length,
      'commit lỗi ghi: trả false, giữ nhóm (hai bản ghi không bị ghi lẻ); flushAllSync ghi nhật ký rồi cả hai bản ghi, xóa nhật ký');
    console.error = quiet;

    // (e) không còn cờ bẩn toàn cục
    const hits = [];
    const walk = (d) => {
      for (const x of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, x.name);
        if (x.isDirectory()) walk(f);
        else if (x.name.endsWith('.js') && /db\.dirty\s*=\s*true/.test(fs.readFileSync(f, 'utf8'))) hits.push(path.relative(ROOT, f));
      }
    };
    walk(path.join(ROOT, 'src', 'server'));
    ok(!hits.length, `grep -rn "db.dirty = true" src/server không còn kết quả${hits.length ? ` (còn: ${hits.join(', ')})` : ''}`);
  } finally {
    console.error = quiet;
    console.log = qlog;
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
    const after = onDiskChar(b, 'tmpchar');
    ok(up2 && after.level === 11, 'có characters.json.tmp hợp lệ → khởi động thành công với dữ liệu trong .tmp');
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

module.exports = { storageUnitTests, storageShardTests, storageProcTests, crashGuardTests, serve, getJson, node, tmpDir, cleanup };
