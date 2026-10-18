'use strict';

// Sao lưu theo tầng (ops-backup): xoay vòng với đồng hồ giả, tar thật + scripts/restore.js, 20 lần khởi động lại,
// trễ vòng lặp khi sao lưu 5.000 nhân vật. Máy chủ riêng ở cổng 4330-4339, DATA_DIR tạm.
const fs = require('fs');
const path = require('path');
const { ok, sleep } = require('../lib/harness');
const { serve, node, tmpDir, cleanup } = require('./storage');
const { DB } = require('../../src/server/services/db');
const { Backup, period, fileName, listArchive } = require('../../src/server/services/backup');
const { newChar } = require('../../src/server/core/player');
const { ITEMS, makeItem } = require('../../src/shared/data/items');

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const VN = 7 * HOUR;
const OFF = { hourly: 5 * MIN, daily: 3 * HOUR + 5 * MIN, weekly: 3 * HOUR + 10 * MIN };
// thời điểm đầu chu kỳ p của tầng (ngược với period())
const periodStart = (tier, p) => (tier === 'hourly' ? p * HOUR : p * DAY) - VN + OFF[tier];
const consecutive = (ps, step) => ps.every((p, i) => i === 0 || p - ps[i - 1] === step);

// dữ liệu nhỏ hợp lệ (2 tài khoản, 2 nhân vật) ghi qua DB như máy chủ
function seedData(dir) {
  const db = new DB(dir);
  for (const [u, n, cls] of [['bk_one', 'BkOne', 'kiem'], ['bk_two', 'BkTwo', 'cung']]) {
    const acc = db.createAccount(u, 'secret123');
    const c = newChar(n, cls, 'm');
    c.level = 33;
    db.putChar(c);
    acc.chars.push(n);
  }
  db.save();
  return db;
}

// ---------- Đơn vị: lịch + xoay vòng bằng đồng hồ giả (bản chụp giả, không gọi tar)
async function backupUnitTests() {
  console.log('0j. Sao lưu theo tầng (đồng hồ giả)');
  try {
    const dir = tmpDir('ns-bk-');
    const T0 = Date.UTC(2026, 0, 5, 0, 0); // thứ Hai 07:00 giờ Việt Nam
    let now = T0;
    const bk = new Backup(dir, { now: () => now, snapshot: async (dest) => fs.writeFileSync(dest, 'x'), pushCmd: '', log() {} });
    const count = () => ({ h: bk.list('hourly'), d: bk.list('daily'), w: bk.list('weekly') });
    const weeks = new Set();
    for (; now < T0 + 60 * DAY; now += 30 * MIN) {
      weeks.add(period('weekly', now));
      await bk.tick();
    }
    let c = count();
    const hp = c.h.map((x) => period('hourly', x.t));
    const dp = c.d.map((x) => period('daily', x.t));
    ok(c.h.length === 48 && consecutive(hp, 1) && hp[47] === period('hourly', now - 30 * MIN), 'xoay vòng giả lập 60 ngày: đúng 48 bản giờ, liên tiếp tới giờ hiện tại');
    ok(c.d.length === 30 && consecutive(dp, 1), 'xoay vòng giả lập 60 ngày: đúng 30 bản ngày liên tiếp');
    ok(c.w.length === Math.min(12, weeks.size) && c.w.every((x) => new Date(x.t + VN).getUTCDay() === 1), `xoay vòng 60 ngày: giữ đủ ${weeks.size} bản tuần (chưa tới 12), bản tuần tạo thứ Hai`);
    for (; now < T0 + 120 * DAY; now += HOUR) await bk.tick();
    c = count();
    const wp = c.w.map((x) => period('weekly', x.t));
    ok(c.h.length === 48 && c.d.length === 30 && c.w.length === 12 && consecutive(wp, 7),
      'xoay vòng giả lập tiếp tới 120 ngày: đúng 48 bản giờ / 30 bản ngày / 12 bản tuần');
    // lượt lịch đầu tiên sau 03:05 (bước giả lập 1 giờ nên muộn nhất 04:05)
    ok(c.d.every((x) => { const h = new Date(x.t + VN); const m = h.getUTCHours() * 60 + h.getUTCMinutes(); return m >= 185 && m < 245; }), 'bản ngày tạo ở lượt lịch đầu tiên sau 03:05 giờ Việt Nam');
    // khởi động lại 20 lần liên tiếp trong cùng giờ (mỗi lần một Backup mới): không thêm bản, không xóa bản
    now += 20 * MIN;
    await bk.tick();
    const before = JSON.stringify(count());
    for (let i = 0; i < 20; i++) {
      now += MIN;
      const again = new Backup(dir, { now: () => now, snapshot: async (dest) => fs.writeFileSync(dest, 'x'), pushCmd: '' });
      await again.tick();
    }
    ok(JSON.stringify(count()) === before, '20 lần khởi động lại trong cùng chu kỳ (đồng hồ giả): không thêm, không xóa bản nào');
    for (let i = 0; i < 12; i++) await bk.pre(`v1.${i}`);
    const once = await bk.pre('v1.11', { once: true });
    ok(bk.list('pre').length === 10 && once === null && bk.list('pre').every((x) => /^v1\.(\d+)$/.test(x.tag)), 'bản trước triển khai giữ 10 bản gần nhất, cùng nhãn (once) thì không tạo lại');
    let bad = null;
    try { await bk.pre('../x'); } catch (e) { bad = e; }
    ok(bad, 'nhãn sao lưu lạ (../x) bị từ chối');
  } finally {
    cleanup();
  }
}

// ---------- tar thật + restore.js
async function backupRestoreTest() {
  console.log('13. Sao lưu tar + scripts/restore.js');
  try {
    const dir = tmpDir('ns-bk-');
    const out = tmpDir('ns-bk-push-');
    seedData(dir);
    fs.writeFileSync(path.join(dir, 'characters.json.corrupt-20260101-000000'), '{"a":');
    fs.writeFileSync(path.join(dir, 'clans.json.tmp'), '{');
    const bk = new Backup(dir, { pushCmd: `cp "$BACKUP_FILE" "${out}/pushed.tgz"`, log() {} });
    const made = await bk.tick();
    const tiers = made.map((f) => path.basename(path.dirname(f))).sort().join();
    const entries = await listArchive(made[0]);
    ok(tiers === 'daily,hourly,weekly' && fs.statSync(made[0]).ino === fs.statSync(made[1]).ino, 'lượt đầu tạo bản giờ/ngày/tuần từ một bản chụp (liên kết cứng)');
    ok(entries.includes('characters.json') && entries.includes('accounts.json') && !entries.some((n) => /corrupt|\.tmp|lock|backups/.test(n)),
      'bản sao lưu gồm file dữ liệu, bỏ backups/, khóa, .tmp, .corrupt-*');
    const last = JSON.parse(fs.readFileSync(path.join(dir, 'backups', 'last.json'), 'utf8'));
    ok(last.ok && last.bytes > 0, 'ghi backups/last.json sau khi tạo và kiểm bản');
    for (let i = 0; i < 40 && !fs.existsSync(path.join(out, 'pushed.tgz')); i++) await sleep(50);
    ok(fs.existsSync(path.join(out, 'pushed.tgz')) && fs.existsSync(path.join(dir, 'backups', 'offsite.json')), 'BACKUP_PUSH_CMD đẩy bản ngày ra ngoài, ghi offsite.json');
    ok((await bk.tick()).length === 0, 'cùng chu kỳ thì lượt sau không tạo thêm bản');

    const rel = path.relative(path.join(dir, 'backups'), made[0]);
    const chk = await node(['scripts/restore.js', '--check', rel, '--data', dir]);
    ok(chk.code === 0 && /HỢP LỆ/.test(chk.out) && /2 nhân vật/.test(chk.out), 'node scripts/restore.js --check trên bản vừa tạo trả mã 0');
    const buf = fs.readFileSync(made[0]);
    const cut = path.join(out, 'cut.tgz');
    fs.writeFileSync(cut, buf.subarray(0, Math.floor(buf.length / 2)));
    const chk2 = await node(['scripts/restore.js', '--check', cut, '--data', dir]);
    ok(chk2.code !== 0 && /HỎNG/.test(chk2.out), `restore.js --check trên bản bị cắt cụt trả mã ≠ 0 (${chk2.code})`);
    const lst = await node(['scripts/restore.js', '--list', '--data', dir]);
    ok(lst.code === 0 && /hourly \(1\)/.test(lst.out) && /daily\//.test(lst.out), 'restore.js --list liệt kê bản theo tầng');

    // --apply: máy chủ đang chạy → từ chối; tắt rồi → phục hồi, giữ dữ liệu cũ
    const s = serve(dir, 4330);
    await s.ready();
    const ap = await node(['scripts/restore.js', '--apply', rel, '--data', dir]);
    await s.stop();
    ok(ap.code === 3 && /Từ chối/.test(ap.out) && fs.existsSync(path.join(dir, 'characters.json')), '--apply khi server đang chạy bị từ chối (mã 3), dữ liệu không bị đụng');
    const chars = JSON.parse(fs.readFileSync(path.join(dir, 'characters.json'), 'utf8'));
    chars.bkone.level = 99;
    fs.writeFileSync(path.join(dir, 'characters.json'), JSON.stringify(chars));
    const ap2 = await node(['scripts/restore.js', '--apply', rel, '--data', dir]);
    const back = JSON.parse(fs.readFileSync(path.join(dir, 'characters.json'), 'utf8'));
    const keep = fs.readdirSync(dir).find((n) => n.startsWith('before-restore-'));
    ok(ap2.code === 0 && back.bkone.level === 33 && keep && JSON.parse(fs.readFileSync(path.join(dir, keep, 'characters.json'), 'utf8')).bkone.level === 99 && !fs.existsSync(path.join(dir, 'server.lock')),
      '--apply khi server tắt: phục hồi bản, dữ liệu cũ dời vào before-restore-*');
    const one = await node(['scripts/restore.js', '--char', 'BkTwo', '--from', rel, '--data', dir]);
    ok(one.code === 0 && fs.readdirSync(path.join(dir, 'restore')).some((n) => n.startsWith('BkTwo-')), 'restore.js --char lấy một nhân vật ra DATA_DIR/restore/');
    const pre = await node(['scripts/backup.js', '--tag', 'predeploy', '--data', dir]);
    ok(pre.code === 0 && fs.readdirSync(path.join(dir, 'backups', 'pre')).some((n) => n.endsWith('-predeploy.tgz')), 'node scripts/backup.js --tag predeploy tạo bản trước triển khai');
  } finally {
    cleanup();
  }
}

// ---------- 20 lần khởi động lại máy chủ thật: còn bản ngày hôm trước, đủ bản giờ
async function backupRestartTest() {
  console.log('14. Sao lưu qua 20 lần khởi động lại');
  try {
    const dir = tmpDir('ns-bk-');
    seedData(dir);
    const now = Date.now();
    const seed = (tier, ps) => {
      const d = path.join(dir, 'backups', tier);
      fs.mkdirSync(d, { recursive: true });
      for (const p of ps) fs.writeFileSync(path.join(d, fileName(periodStart(tier, p))), 'cu');
    };
    const ch = period('hourly', now);
    const cd = period('daily', now);
    const cw = period('weekly', now);
    seed('hourly', Array.from({ length: 48 }, (_, i) => ch - 48 + i));
    seed('daily', Array.from({ length: 30 }, (_, i) => cd - 30 + i));
    seed('weekly', Array.from({ length: 12 }, (_, i) => cw - 7 * (12 - i)));
    const bk = new Backup(dir);
    let made = 0;
    let firstOk = false;
    for (let i = 0; i < 20; i++) {
      const s = serve(dir, 4331, { BACKUP: '1', BACKUP_DELAY_MS: '0' });
      const up = await s.ready();
      if (i === 0) {
        for (let k = 0; k < 100 && (s.log.match(/\[backup\] đã tạo/g) || []).length < 3; k++) await sleep(50);
        firstOk = up;
      } else {
        await sleep(150);
      }
      await s.stop();
      made += (s.log.match(/\[backup\] đã tạo/g) || []).length;
    }
    const h = bk.list('hourly');
    const d = bk.list('daily');
    const w = bk.list('weekly');
    const dp = d.map((x) => period('daily', x.t));
    ok(firstOk && h.length === 48 && period('hourly', h[47].t) >= ch && d.length === 30 && w.length === 12,
      `20 lần khởi động lại liên tiếp: đủ 48 bản giờ (mới nhất là giờ hiện tại), 30 bản ngày, 12 bản tuần (tạo ${made} bản)`);
    ok(dp.includes(cd - 1) && made <= 6, '20 lần khởi động lại liên tiếp vẫn còn bản ngày hôm trước, không sinh bản mỗi lần khởi động');
  } finally {
    cleanup();
  }
}

// ---------- 5.000 nhân vật trộn: sao lưu không chặn vòng lặp
async function backupLagTest() {
  console.log('15. Sao lưu 5.000 nhân vật (trễ vòng lặp)');
  try {
    const dir = tmpDir('ns-bk-');
    const gear = Object.keys(ITEMS).filter((id) => ITEMS[id].slot && ITEMS[id].slot !== 'pet');
    const accounts = {};
    const chars = {};
    const CLS = ['kiem', 'tieu', 'kunai', 'cung', 'dao', 'quat'];
    for (let i = 0; i < 5000; i++) {
      const name = `Seed${i}`;
      const c = newChar(name, CLS[i % 6], i % 2 ? 'f' : 'm');
      // trộn (≈ 5,8 KB/nhân vật như số đo GDD): đa số nhân vật mới, 1/5 hậu kỳ đầy túi + kho, đồ có dòng chỉ số và ngọc
      c.level = 1 + ((i * 37) % 120);
      if (i % 5 === 0) {
        const it = (k) => ({ ...makeItem(gear[(i + k) % gear.length], 1), p: k % 16, r: k % 4, o: [['atk', 120 + k], ['hp', 900], ['crit', 12], ['def', 80], ['spd', 5]], gems: ['gem_hoa_3', 'gem_loi_2', null] });
        c.invExt = 80;
        c.inv = Array.from({ length: 120 }, (_, k) => it(k));
        c.storage = Array.from({ length: 60 }, (_, k) => it(k + 7));
      }
      chars[name.toLowerCase()] = c;
      accounts[`seed${i}`] = { username: `seed${i}`, salt: 'x', hash: 'y', created: 0, chars: [name], tokens: {} };
    }
    fs.writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify(accounts));
    fs.writeFileSync(path.join(dir, 'characters.json'), JSON.stringify(chars));
    fs.writeFileSync(path.join(dir, 'clans.json'), '{}');
    fs.writeFileSync(path.join(dir, 'meta.json'), '{"nextClanId":1}');
    const mb = (fs.statSync(path.join(dir, 'characters.json')).size / 1048576).toFixed(1);
    const r = await node(['scripts/backup.js', '--tag', 'perf', '--data', dir, '--stats']);
    const line = r.out.trim().split('\n').pop();
    let st = {};
    try { st = JSON.parse(line); } catch (e) { /* in ra bên dưới */ }
    ok(r.code === 0 && st.file && st.lagMax <= 20, `tạo bản sao lưu 5.000 nhân vật trộn (${mb} MB) không làm trễ vòng lặp > 20 ms (tối đa ${st.lagMax} ms, ${st.ms} ms)`);
  } finally {
    cleanup();
  }
}

module.exports = { backupUnitTests, backupRestoreTest, backupRestartTest, backupLagTest };
