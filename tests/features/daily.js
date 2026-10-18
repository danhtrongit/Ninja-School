'use strict';

// Điểm danh, vòng quay, thủ kho, kết bạn, phó bản Hang Động.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { DAILY } = require('../../src/shared/data/quests');

async function dailyTest(ctx) {
  const { a, b } = ctx;
  console.log('6. Điểm danh, vòng quay, thủ kho, bạn bè, hang động');
  a.send('checkin');
  ok(!!(await a.wait('notice', (m) => /Điểm danh ngày 1/.test(m.msg))), 'điểm danh ngày 1 nhận quà');
  a.send('checkin');
  ok(!!(await a.wait('notice', (m) => /đã điểm danh/.test(m.msg))), 'không cho điểm danh 2 lần/ngày');
  a.send('spin', { cur: 'xu' });
  const sp = await a.wait('spinResult');
  ok(sp.idx >= 0 && !!sp.label, `vòng quay trả thưởng: ${sp.label}`);
  await a.walkTo(1320);
  a.send('npc', { id: 'v_fire_storage' });
  await a.wait('storage');
  const sSlot = a.inv.inv.findIndex((it) => it && it.id === 'hp2');
  a.send('storePut', { npc: 'v_fire_storage', slot: sSlot });
  const st1 = await a.wait('storage');
  await sleep(120);
  ok(st1.items.some((it) => it && it.id === 'hp2') && !a.inv.inv[sSlot], 'cất bình HP vào kho');
  const kSlot = st1.items.findIndex((it) => it && it.id === 'hp2');
  a.send('storeTake', { npc: 'v_fire_storage', slot: kSlot });
  const st2 = await a.wait('storage');
  ok(!st2.items[kSlot], 'lấy lại từ kho');
  a.send('friendAdd', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'friend');
  b.send('friendAccept', { from: 'KiemSi' });
  const fl = await a.wait('friends');
  ok(fl.list.length === 1 && fl.list[0].name === 'CungThu' && fl.list[0].online, 'kết bạn thành công');
  await a.walkTo(190);
  a.send('npc', { id: 'v_fire_dungeon' });
  const dd = await a.wait('dialog');
  ok(dd.opts.some((o) => o.a === 'enter'), 'Hộ Pháp cho vào Hang Động');
  a.send('npcAct', { id: 'v_fire_dungeon', a: 'enter' });
  await a.wait('enterMap');
  ok(a.map === 'dungeon', 'vào phó bản Hang Động (B cấp thấp bị loại)');
  ok(!!(await b.wait('party', (m) => m.members.some((x) => x.name === 'KiemSi' && x.mapId === 'dungeon')).catch(() => null)),
    'đồng đội nhận cập nhật nhóm khi thành viên đổi bản đồ');
  const wave = await a.wait('dungeon', (m) => m.wave === 1, 7000);
  ok(wave.waves === 5 && a.monsters.size > 0, `đợt 1 xuất hiện ${a.monsters.size} quái`);
  await a.walkTo(20);
  a.send('portal', { i: 0 });
  await a.wait('enterMap');
  ok(a.map === 'v_fire', 'rời hang động về làng');
  a.send('npc', { id: 'v_fire_dungeon' });
  await a.walkTo(190);
  a.send('npc', { id: 'v_fire_dungeon' });
  const dd2 = await a.wait('dialog');
  ok(/còn lại hôm nay: 2\/3/.test(dd2.text), 'trừ 1 lượt vào hang');
}

// Công thức thưởng Tiểu Nhị (không cần server)
function dailyTaskUnitTests() {
  console.log('0q. Nhiệm vụ hằng ngày Tiểu Nhị (công thức)');
  ok(DAILY.reward(120).exp === 46560 && DAILY.reward(120).luong === 1 && DAILY.max === 20,
    `DAILY.reward(120).exp === 46560 (${DAILY.reward(120).exp}), 1 lượng/lượt, 20 lượt/ngày`);
}

// Tiểu Nhị qua bot thật (tài khoản riêng tieunhiqa trong ADMINS để dùng /lv, /tieunhi)
async function dailyTaskTest() {
  console.log('6b. Nhiệm vụ hằng ngày Tiểu Nhị (bot)');
  const t = new Bot('TN');
  await t.connect();
  t.send('register', { u: 'tieunhiqa', p: 'secret123' });
  await t.wait('chars');
  t.send('createChar', { name: 'TieuNhiQA', cls: 'kiem', gender: 'm' });
  await t.wait('chars');
  t.send('selectChar', { name: 'TieuNhiQA' });
  await t.wait('enterMap');
  const LV = 80;
  t.send('chat', { ch: 'map', msg: `/lv ${LV}` });
  await t.wait('me', (m) => m.level === LV);
  const NPC = `${t.map}_task`;
  await t.walkTo(880);
  const act = async (a) => {
    t.send('npcAct', { id: NPC, a });
    return t.wait('dialog');
  };
  const chests = () => t.inv.inv.reduce((n, it) => n + (it && it.id === 'chest' ? it.q : 0), 0);
  const cmd = async (msg) => {
    t.send('chat', { ch: 'map', msg });
    await t.wait('chat', (m) => m.ch === 'sys');
  };

  await act('accept');
  const me1 = await t.wait('me', (m) => m.daily && m.daily.task);
  ok(me1.daily.task.n === DAILY.count(LV) && me1.daily.task.prog === 0, `nhận việc → me.daily.task.n === DAILY.count(${LV}) (${me1.daily.task.n})`);

  const exp0 = t.me.exp;
  const luong0 = t.me.luong;
  await act('finish');
  await sleep(400);
  ok(t.me.exp === exp0 && t.me.luong === luong0 && t.me.daily.done === 0 && !!t.me.daily.task, 'npcAct finish khi chưa đủ tiến độ không cộng gì');

  await cmd('/tieunhi done');
  await t.wait('me', (m) => m.daily.task && m.daily.task.prog === m.daily.task.n);
  const rw = DAILY.reward(LV);
  // gửi finish 2 lần liền: chỉ lần đầu được thưởng
  t.send('npcAct', { id: NPC, a: 'finish' });
  t.send('npcAct', { id: NPC, a: 'finish' });
  await t.wait('me', (m) => m.daily.done >= 1);
  await sleep(500);
  ok(t.me.exp === exp0 + rw.exp && t.me.level === LV && t.me.luong === luong0 + 1,
    `/tieunhi done rồi finish → +${rw.exp} EXP (DAILY.reward(${LV}).exp) và +1 lượng`);
  ok(t.me.daily.done === 1 && t.me.luong === luong0 + 1, 'gửi finish 2 lần liền chỉ cộng một lần (done = 1, +1 lượng)');

  // lượt 2-4, rồi lượt 5 thêm Rương Báu
  for (let i = 2; i <= 5; i++) {
    if (i === 5) await sleep(300);
    const c0 = chests();
    await act('accept');
    await cmd('/tieunhi done');
    t.send('npcAct', { id: NPC, a: 'finish' });
    await t.wait('me', (m) => m.daily.done === i);
    if (i === 5) {
      await t.wait('inv', (m) => m.inv.some((it) => it && it.id === 'chest')).catch(() => null);
      await sleep(200);
      ok(chests() === c0 + 1, `lượt thứ 5 thêm 1 Rương Báu vào túi (${c0} → ${chests()})`);
    }
  }
  for (let i = 6; i <= DAILY.max; i++) {
    await act('accept');
    await cmd('/tieunhi done');
    t.send('npcAct', { id: NPC, a: 'finish' });
    await t.wait('me', (m) => m.daily.done === i);
  }
  const luong20 = t.me.luong;
  const d21 = await act('accept');
  await sleep(400);
  ok(t.me.daily.done === DAILY.max && !t.me.daily.task && /đã hoàn thành 20/.test(d21.text) && t.me.luong === luong20,
    'lượt 21 bị từ chối ("đã hoàn thành 20"), không nhận thêm việc');
  t.ws.close();
}

module.exports = { dailyTest, dailyTaskTest, dailyTaskUnitTests };
