'use strict';

// Nhiệm vụ chính, hội thoại NPC, mua đồ ở tiệm, mặc trang bị.
const { sleep, ok } = require('../lib/harness');

async function questTest(ctx) {
  const { a } = ctx;
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
  const t0 = a.me.xu + (a.me.xuk || 0);
  a.send('buy', { npc: 'v_fire_potion', id: 'hp1', qty: 5 });
  await a.wait('notice', (m) => /Đã mua/.test(m.msg));
  await sleep(100);
  ok(a.me.xu + (a.me.xuk || 0) === t0 - 100, 'mua 5 bình HP trừ đúng 100 (xu khóa trước, thiếu mới trừ xu)');

  const hatSlot = a.inv.inv.findIndex((it) => it && it.id === 'hat_0');
  a.send('equip', { slot: hatSlot });
  await a.wait('inv');
  ok(a.inv.equip.hat && a.inv.equip.hat.id === 'hat_0', 'trang bị Nón Gỗ');
}

module.exports = { questTest };
