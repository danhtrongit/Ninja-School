'use strict';

// Kiểm thử tự động: khởi động server tạm, điều khiển 2 bot qua WebSocket.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-test-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`);
  if (!cond) failures++;
};

class Bot {
  constructor(name) {
    this.name = name;
    this.msgs = [];
    this.waiters = [];
    this.state = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${PORT}/ws`);
      this.ws.on('message', (raw) => {
        const m = JSON.parse(raw);
        this.msgs.push(m);
        if (m.t === 'me') this.me = m;
        if (m.t === 'enterMap') {
          this.me = m.me;
          this.map = m.map;
          this.x = m.x;
          this.y = m.y;
          this.monsters = new Map(m.monsters.map((x) => [x.id, x]));
        }
        if (m.t === 'inv') this.inv = m;
        if (m.t === 'state' && this.monsters) for (const [id, x, y, , , hp] of m.m) if (this.monsters.has(id)) Object.assign(this.monsters.get(id), { x, y, hp });
        if (m.t === 'mSpawn' && this.monsters) this.monsters.set(m.id, m);
        if (m.t === 'mDie' && this.monsters) this.monsters.delete(m.id);
        if (m.t === 'pos') { this.x = m.x; this.y = m.y; }
        if (m.t === 'data') resolve();
        for (const w of this.waiters.slice()) {
          if (w.t === m.t && (!w.pred || w.pred(m))) {
            this.waiters.splice(this.waiters.indexOf(w), 1);
            clearTimeout(w.timer);
            w.resolve(m);
          }
        }
      });
      this.ws.on('error', reject);
    });
  }

  send(t, d = {}) { this.ws.send(JSON.stringify({ t, ...d })); }

  wait(t, pred, ms = 4000) {
    return new Promise((resolve, reject) => {
      const w = { t, pred, resolve };
      w.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        reject(new Error(`${this.name}: hết thời gian chờ "${t}"`));
      }, ms);
      this.waiters.push(w);
    });
  }

  async walkTo(x) {
    while (Math.abs(this.x - x) > 4) {
      const step = Math.sign(x - this.x) * Math.min(14, Math.abs(x - this.x));
      this.x += step;
      this.send('move', { x: this.x, y: this.y, dir: Math.sign(step), st: 1 });
      await sleep(90);
    }
  }
}

async function main() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT, DATA_DIR: DATA, ADMINS: 'botadmin,bot_two' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  srv.stdout.on('data', (d) => { log += d; });
  srv.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50 && !log.includes('đang chạy'); i++) await sleep(100);

  try {
    console.log('1. Đăng ký & tạo nhân vật');
    const a = new Bot('A');
    await a.connect();
    a.send('register', { u: 'botadmin', p: 'secret123' });
    const auth = await a.wait('auth');
    ok(auth.ok && auth.token, 'đăng ký thành công, nhận token');
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

    console.log('2. Nhiệm vụ & NPC');
    await a.walkTo(330);
    a.send('npc', { id: 'v_fire_elder' });
    const dlg = await a.wait('dialog');
    ok(dlg.opts.some((o) => o.a === 'accept'), 'Trưởng Làng giao nhiệm vụ');
    a.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
    await a.wait('notice', (m) => /Hoàn thành/.test(m.msg));
    await sleep(120);
    ok(a.me.quest.i === 1, 'hoàn thành nhiệm vụ "Nhập Môn", chuyển sang nhiệm vụ 2');
    ok(a.inv.inv.some((it) => it && it.id === 'hat_0'), 'nhận thưởng Nón Gỗ');
    a.send('npcAct', { id: 'v_fire_elder', a: 'accept' });
    await a.wait('notice', (m) => /Đã nhận/.test(m.msg));

    await a.walkTo(470);
    a.send('npc', { id: 'v_fire_potion' });
    const shop = await a.wait('shop');
    ok(shop.items.some((x) => x.id === 'hp1'), 'mở tiệm thuốc');
    const xu0 = a.me.xu;
    a.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5 });
    await a.wait('notice', (m) => /Đã mua/.test(m.msg));
    await sleep(100);
    ok(a.me.xu === xu0 - 100, 'mua 5 bình HP trừ đúng 100 xu');

    const hatSlot = a.inv.inv.findIndex((it) => it && it.id === 'hat_0');
    a.send('equip', { slot: hatSlot });
    await a.wait('inv');
    ok(a.inv.equip.hat && a.inv.equip.hat.id === 'hat_0', 'trang bị Nón Gỗ');

    console.log('3. Qua cổng & chiến đấu');
    await a.walkTo(20);
    a.send('portal', { i: 0 });
    await a.wait('enterMap');
    ok(a.map === 'fire_field', 'qua cổng sang Đồi Hỏa Diệm');
    const lv0 = a.me.level;
    let kills = 0;
    for (let round = 0; round < 12 && kills < 8; round++) {
      const slimes = [...a.monsters.values()].filter((m) => m.k === 'slime');
      if (!slimes.length) break;
      slimes.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x));
      const target = slimes[0];
      if (target.y !== 300) {
        a.monsters.delete(target.id);
        continue;
      }
      await a.walkTo(target.x - 20);
      for (let i = 0; i < 20 && a.monsters.has(target.id); i++) {
        a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
        a.send('skill', { sid: i % 6 === 0 ? 'k1' : 'k0', tid: `m${target.id}`, dir: 1 });
        await sleep(520);
      }
      if (!a.monsters.has(target.id)) kills++;
    }
    ok(kills >= 3, `tiêu diệt ${kills} Slime`);
    ok(a.msgs.some((m) => m.t === 'expGain' && m.n > 0), 'nhận kinh nghiệm khi giết quái');
    ok(a.me.level > lv0 || a.me.exp > 0, `kinh nghiệm tăng (cấp ${a.me.level}, exp ${a.me.exp})`);
    ok(a.msgs.some((m) => m.t === 'loot' && m.k === 'xu'), 'tự nhặt xu rơi ra');
    ok(a.me.quest.prog > 0, `tiến độ nhiệm vụ diệt Slime: ${a.me.quest.prog}/8`);

    console.log('4. Lệnh admin, kỹ năng, cường hóa');
    a.send('chat', { ch: 'map', msg: '/lv 25' });
    await a.wait('chat', (m) => /Cấp hiện tại/.test(m.msg));
    await sleep(120);
    ok(a.me.level === 25 && a.me.potential === 120, 'lên cấp 25, có 120 điểm tiềm năng');
    a.send('addStat', { k: 'str', n: 10 });
    await sleep(120);
    ok(a.me.stats.str === 15, 'cộng 10 điểm sức mạnh');
    a.send('learnSkill', { sid: 'k2' });
    await sleep(120);
    ok(a.me.skills.k2 === 1 && a.me.hotbar.includes('k2'), 'học Liệt Hỏa Hoàn và gán vào thanh kỹ năng');
    a.send('chat', { ch: 'map', msg: '/item stone1 10' });
    a.send('chat', { ch: 'map', msg: '/xu 100000' });
    const homeSlot = a.inv.inv.findIndex((it) => it && it.id === 'scroll_home');
    a.send('useItem', { slot: homeSlot });
    await a.wait('enterMap');
    ok(a.map === 'v_fire', 'dùng Cuộn Về Làng');
    await a.walkTo(620);
    a.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot: 'weapon' });
    const up = await a.wait('upgradeResult');
    ok(up.ok && up.plus === 1, 'cường hóa vũ khí lên +1');

    console.log('5. Nhiều người chơi: nhóm, chat, giao dịch');
    const b = new Bot('B');
    await b.connect();
    b.send('register', { u: 'bot_two', p: 'secret123' });
    await b.wait('chars');
    b.send('createChar', { name: 'CungThu', cls: 'cung', gender: 'f' });
    await b.wait('chars');
    b.send('selectChar', { name: 'CungThu' });
    await b.wait('enterMap');
    ok(b.map === 'v_water', 'người chơi B vào Làng Thủy Nguyệt');
    await b.walkTo(1030);
    b.send('npc', { id: 'v_water_tele' });
    await b.wait('dialog');
    b.send('npcAct', { id: 'v_water_tele', a: 'go:v_fire' });
    await b.wait('enterMap');
    ok(b.map === 'v_fire', 'B dịch chuyển miễn phí sang Làng Hỏa Vân');
    const joined = await a.wait('pJoin', (m) => m.name === 'CungThu').catch(() => null);
    ok(!!joined || a.msgs.some((m) => m.t === 'pJoin' && m.name === 'CungThu'), 'A thấy B xuất hiện');
    a.send('partyInvite', { name: 'CungThu' });
    await b.wait('invite', (m) => m.kind === 'party');
    b.send('partyAccept', { from: 'KiemSi' });
    const party = await a.wait('party', (m) => m.members && m.members.length === 2);
    ok(party.members.length === 2, 'lập nhóm 2 người');
    a.send('chat', { ch: 'party', msg: 'xin chao' });
    const pc = await b.wait('chat', (m) => m.ch === 'party' && m.msg === 'xin chao');
    ok(!!pc, 'chat nhóm');
    await sleep(900);
    a.send('chat', { ch: 'map', msg: 'hello map' });
    ok(!!(await b.wait('chat', (m) => m.ch === 'map' && m.msg === 'hello map')), 'chat bản đồ');

    b.send('chat', { ch: 'map', msg: '/lv 6' });
    await sleep(150);
    await b.walkTo(620);
    a.send('tradeReq', { name: 'CungThu' });
    await b.wait('invite', (m) => m.kind === 'trade');
    b.send('tradeAccept', { from: 'KiemSi' });
    await a.wait('trade');
    const potSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp1');
    a.send('tradeSet', { slots: [potSlot], xu: 500 });
    await b.wait('trade', (m) => m.theirs.xu === 500);
    a.send('tradeLock');
    b.send('tradeLock');
    await sleep(120);
    a.send('tradeOk');
    b.send('tradeOk');
    await b.wait('tradeEnd');
    await sleep(150);
    ok(b.me.xu === 1500 && b.inv.inv.some((it) => it && it.id === 'hp1' && it.q >= 15), 'giao dịch xu + vật phẩm thành công');

    console.log('6. Lưu dữ liệu');
    a.ws.close();
    await sleep(300);
    const c = new Bot('C');
    await c.connect();
    c.send('login', { u: 'botadmin', token: auth.token });
    const ch2 = await c.wait('chars');
    ok(ch2.chars[0].level === 25, 'đăng nhập lại bằng token, dữ liệu được giữ');
    c.send('selectChar', { name: 'KiemSi' });
    await Promise.all([c.wait('enterMap'), c.wait('inv')]);
    ok(c.inv.equip.weapon.p === 1, 'vũ khí +1 vẫn còn sau khi đăng nhập lại');
    c.ws.close();
    b.ws.close();
  } catch (e) {
    failures++;
    console.error('  ✘ Lỗi:', e.message);
  }
  srv.kill('SIGTERM');
  await sleep(400);
  const files = fs.readdirSync(DATA);
  ok(files.includes('characters.json'), 'ghi file dữ liệu khi tắt server');
  if (/Error|Lỗi xử lý/.test(log)) {
    console.log(log);
    ok(false, 'server không có lỗi trong log');
  }
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(failures ? `\nTHẤT BẠI: ${failures} kiểm tra lỗi` : '\nTẤT CẢ KIỂM TRA ĐỀU ĐẠT');
  process.exit(failures ? 1 : 0);
}

main();
