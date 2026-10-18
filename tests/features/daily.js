'use strict';

// Điểm danh, vòng quay, thủ kho, kết bạn, phó bản Hang Động.
const { sleep, ok } = require('../lib/harness');

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

module.exports = { dailyTest };
