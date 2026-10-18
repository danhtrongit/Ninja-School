'use strict';

// Sập giữa nhóm ghi giao dịch (ADR-10-1, mục 3.2 của docs/gdd/10-ky-thuat-van-hanh.md):
// máy chủ riêng (cổng 4321-4322, DATA_DIR tạm) bật NS_CRASH_AFTER=commit-rec-1 → giao dịch thật giữa hai bot,
// tiến trình tự SIGKILL ngay sau khi ghi xong bản ghi thứ nhất của commit; khởi động lại phải phát lại nhật ký
// để hai nhân vật khớp nhau (tổng xu + vật phẩm hai bên trước = sau, giao dịch có hiệu lực trọn vẹn).
// Chạy riêng: node tests/load/crash.js (tests/ops.js gọi crashTradeTest trong npm test)
const fs = require('fs');
const path = require('path');
const { ok, sleep } = require('../lib/harness');
const { LightBot } = require('../lib/lightbot');
const { serve, tmpDir, cleanup } = require('../features/storage');

const PORT = 4321;

// đọc nhân vật trên đĩa (bố cục chars/<khóa>.json), bỏ _gen của đĩa
function readChar(dir, name) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, 'chars', `${encodeURIComponent(name.toLowerCase())}.json`), 'utf8'));
  delete c._gen;
  return c;
}

const items = (c, id) => c.inv.reduce((n, it) => n + (it && it.id === id ? it.q : 0), 0);

async function bot(user, i) {
  const b = new LightBot(`ws://localhost:${PORT}/ws`, user, i);
  const orig = b.onMsg;
  b.notes = [];
  b.onMsg = function onMsg(m) {
    if (m.t === 'inv') this.inv = m.inv;
    if (m.t === 'me' && m.xu != null) this.xu = m.xu;
    if (m.t === 'notice') this.notes.push(m.msg);
    return orig.call(this, m);
  };
  await b.login('secret123');
  return b;
}

async function crashTradeTest() {
  console.log('11b. Sập giữa nhóm ghi giao dịch (máy chủ riêng)');
  try {
    const dir = tmpDir('ns-crash-');
    // tạo tài khoản + nhân vật trước (tạo nhân vật cũng là một nhóm ghi), rồi bật lại với NS_CRASH_AFTER
    const s0 = serve(dir, PORT);
    await s0.ready();
    for (const [u, i] of [['crasha', 0], ['crashb', 6]]) (await bot(u, i)).close();
    await s0.stop();
    const s1 = serve(dir, PORT, { ADMINS: 'crasha,crashb', NS_CRASH_AFTER: 'commit-rec-1' });
    ok(await s1.ready(), 'máy chủ NS_CRASH_AFTER=commit-rec-1 khởi động');
    const a = await bot('crasha', 0);
    const b = await bot('crashb', 6);
    const A = 'crashax';
    const B = 'crashbx';
    for (const x of [a, b]) x.cmd('/lv 10');
    a.cmd('/xu 5000');
    const got = a.next('inv', (m) => m.inv.some((it) => it && it.id === 'hp1' && !it.b && it.q >= 7));
    a.cmd('/item hp1 7');
    await got;
    await sleep(300);
    // trạng thái trước: ghi hết xuống đĩa (SIGUSR2 = lưu ngay) rồi đọc lại từ đĩa
    s1.proc.kill('SIGUSR2');
    await sleep(400);
    const a0 = readChar(dir, A);
    const b0 = readChar(dir, B);
    const xu0 = a0.xu + b0.xu;
    const hp0 = items(a0, 'hp1') + items(b0, 'hp1');
    const slot = a.inv.findIndex((it) => it && it.id === 'hp1' && !it.b);
    const give = a.inv[slot].q;

    a.send('tradeReq', { name: B });
    const inv = await b.next('invite', (m) => m.kind === 'trade');
    b.send('tradeAccept', { from: A });
    await a.next('trade');
    a.send('tradeSet', { slots: [slot], xu: 1200 });
    await b.next('trade', (m) => m.theirs.xu === 1200);
    a.send('tradeLock');
    b.send('tradeLock');
    await b.next('trade', (m) => m.mine.lock && m.theirs.lock);
    a.send('tradeOk');
    b.send('tradeOk');
    const code = await s1.exitWithin(8000);
    a.close();
    b.close();
    const jdir = path.join(dir, 'journal');
    const left = fs.existsSync(jdir) ? fs.readdirSync(jdir).filter((x) => x.endsWith('.json')) : [];
    ok(inv && code === null && s1.proc.signalCode === 'SIGKILL' && left.length === 1,
      `giao dịch chốt → tiến trình bị SIGKILL ngay sau bản ghi thứ nhất của commit, còn nhật ký ${left.join(',') || '(không có)'}`);

    // giữa chừng trên đĩa: một bên đã ghi, một bên chưa (đúng ca nhân bản / mất đồ nếu không có nhật ký)
    const am = readChar(dir, A);
    const bm = readChar(dir, B);
    const midXu = am.xu + bm.xu;
    const midHp = items(am, 'hp1') + items(bm, 'hp1');
    ok(midXu !== xu0 || midHp !== hp0, `trên đĩa lúc sập hai bên lệch nhau (xu ${midXu} ≠ ${xu0} hoặc hp1 ${midHp} ≠ ${hp0}): cần phát lại nhật ký`);

    const s2 = serve(dir, PORT + 1);
    const up = await s2.ready();
    await s2.stop();
    const a1 = readChar(dir, A);
    const b1 = readChar(dir, B);
    const xu1 = a1.xu + b1.xu;
    const hp1 = items(a1, 'hp1') + items(b1, 'hp1');
    ok(up && /phát lại nhật ký \d+\.json \(trade\): 1 bản ghi/.test(s2.log) && !fs.readdirSync(jdir).some((x) => x.endsWith('.json')),
      'khởi động lại: phát lại nhật ký giao dịch (1 bản ghi còn thiếu), xóa nhật ký');
    ok(xu1 === xu0 && hp1 === hp0 && a1.xu === a0.xu - 1200 && b1.xu === b0.xu + 1200 && items(b1, 'hp1') === items(b0, 'hp1') + give,
      `NS_CRASH_AFTER=commit-rec-1 → khởi động lại, tổng vật phẩm + xu hai bên trước = sau (xu ${xu0} = ${xu1}, hp1 ${hp0} = ${hp1}), giao dịch có hiệu lực trọn vẹn`);
  } finally {
    cleanup();
  }
}

module.exports = { crashTradeTest, readChar };

if (require.main === module) {
  const { failCount } = require('../lib/harness');
  crashTradeTest().then(() => process.exit(failCount() ? 1 : 0), (e) => { console.error(e); process.exit(1); });
}
