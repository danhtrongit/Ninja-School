'use strict';

// Qua cổng sang bãi luyện công, đánh quái, nhận EXP, nhặt xu, tiến độ nhiệm vụ diệt quái.
const { sleep, ok } = require('../lib/harness');

async function combatTest(ctx) {
  const { a } = ctx;
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
    if (!a.monsters.has(target.id)) {
      kills++;
      // đi tới chỗ quái chết để tự nhặt xu/đồ rơi (server nhặt trong bán kính 18px)
      await a.walkTo(Math.round(target.x));
      await sleep(200);
    }
  }
  ok(kills >= 3, `tiêu diệt ${kills} Slime`);
  // AI quái: Slime bị đánh thì phản đòn (gói hit có a = 'm<id>' trúng nhân vật của bot)
  const me = `p${a.me.id}`;
  const mHits = a.msgs.filter((m) => m.t === 'hit' && /^m\d+$/.test(m.a) && m.list.some(([id, dmg]) => id === me && dmg >= 0));
  ok(mHits.length > 0, `bot nhận đòn quái (${mHits.length} gói hit từ quái trúng nhân vật)`);
  ok(a.msgs.some((m) => m.t === 'expGain' && m.n > 0), 'nhận kinh nghiệm khi giết quái');
  ok(a.me.level > lv0 || a.me.exp > 0, `kinh nghiệm tăng (cấp ${a.me.level}, exp ${a.me.exp})`);
  ok(a.msgs.some((m) => m.t === 'loot' && m.k === 'xu'), 'tự nhặt xu rơi ra');
  ok(a.me.quest.prog > 0, `tiến độ nhiệm vụ diệt Slime: ${a.me.quest.prog}/8`);
}

module.exports = { combatTest };
