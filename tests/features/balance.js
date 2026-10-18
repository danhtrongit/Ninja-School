'use strict';

// Cân bằng boss / Tà Thú / quái thường / hồi chiêu bình thuốc: công thức (không cần server) và gói dữ liệu.
const { ok } = require('../lib/harness');
const { fakeDb } = require('../lib/helpers');

// Công thức và dải cân bằng, đo bằng Player/Combat thật (không cần server)
function balanceUnitTests() {
  console.log('0g. Cân bằng boss / Tà Thú / bình thuốc (công thức)');
  const { MONSTERS, baseStats, eventHpMul } = require('../../src/shared/data/monsters');
  const { POTION_CD } = require('../../src/shared/constants');
  // 1. Công quái thường = 8 + 6L + 0.12L²
  const atkOk = ['slime', 'wolf', 'oni', 'dragonguard']
    .every((id) => MONSTERS[id].atk === Math.round(8 + 6 * MONSTERS[id].lv + 0.12 * MONSTERS[id].lv * MONSTERS[id].lv));
  ok(atkOk, 'công quái thường = 8 + 6L + 0.12L² (slime, wolf, oni, dragonguard)');
  // 2. Hệ số boss thường
  const y = MONSTERS.boss_yeti;
  const sy = baseStats(62);
  ok(y.hp === Math.round(sy.hp * 150) && y.atk === Math.round(sy.atk * 1.5) && y.def === Math.round(sy.def * 1.6) && y.exp === Math.round(sy.exp * 60),
    'boss thường: HP ×150, công ×1.5, thủ ×1.6, EXP ×60');
  // 3. Tà Thú dữ liệu tĩnh theo mức 1 người
  const b = MONSTERS.ev_bangphach;
  const sb = baseStats(60);
  ok(b.hp === Math.round(sb.hp * eventHpMul(1)) && b.exp === Math.round(sb.exp * 150) && b.baseHp === sb.hp,
    'Tà Thú: HP theo eventHpMul(1), EXP ×150, baseHp giữ máu quái thường');
  // 4. eventHpMul kẹp số người và chịu đầu vào rác
  ok(eventHpMul(1) === 420 && eventHpMul(10) === 1500 && eventHpMul(20) === 2700 && eventHpMul(99) === 2700
    && eventHpMul(0) === 420 && eventHpMul('abc') === 420 && eventHpMul(-5) === 420, 'eventHpMul: 420-2700, kẹp 1-20, chịu đầu vào rác');
  // 5. eligibleCount: lọc cấp và loại người trong phó bản
  const { eligibleCount } = require('../../src/server/modules/events');
  const list = [{ c: {}, map: { def: {} }, lv: 60 }, { c: {}, map: { def: {} }, lv: 49 }, { c: {}, map: null, lv: 80 }, { c: {}, map: { def: { instance: true } }, lv: 90 }, null];
  ok(eligibleCount(list, 60) === 1, 'eligibleCount: chỉ tính người đủ cấp và đang ở bản đồ thường');
  // 6. Hệ số chiêu boss trong dải theo loại
  const MUL_RANGE = { quake: [1.3, 1.8], beam: [1.4, 2.0], nova: [2.0, 2.6], roar: [0.5, 0.7], summon: [0, 0] };
  const badMul = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    if (!m.boss) continue;
    for (const sk of m.skills || []) {
      const mr = MUL_RANGE[sk.k];
      if (mr && !(sk.mul >= mr[0] && sk.mul <= mr[1])) badMul.push(`${id}:${sk.name} ×${sk.mul}`);
    }
  }
  ok(badMul.length === 0, `mọi chiêu boss trong dải hệ số theo loại (${badMul.join(', ') || 'đạt'})`);
  // 7. Mốc cân bằng đo bằng Player/Combat thật (tools/balance.js)
  const { mobRows, bossRows } = require('../../tools/balance');
  const badMob = mobRows().filter((r) => !(r.hitK >= 0.015 && r.hitK <= 0.07) || !(r.hitsToKill >= 2 && r.hitsToKill <= 8.5));
  ok(badMob.length === 0, `quái thường: đòn 1,5-7% HP, chết sau 2-8,5 đòn thường (${badMob.map((r) => r.id).join(', ') || 'đạt'})`);
  const rows = bossRows();
  const badBoss = rows.filter((r) => !r.event && (!(r.hitK >= 0.04 && r.hitK <= 0.18) || !(r.soloMin >= 2 && r.soloMin <= 6)));
  ok(badBoss.length === 0, `boss thường: đòn 4-18% HP, solo 2-6 phút (${badBoss.map((r) => r.id).join(', ') || 'đạt'})`);
  const badSkill = rows.filter((r) => r.skillC > 0.47);
  ok(badSkill.length === 0, `mọi boss: chiêu mạnh nhất ≤ 47% HP Cung (${badSkill.map((r) => r.id).join(', ') || 'đạt'})`);
  const badEv = rows.filter((r) => r.event && !(r.eventMin[1] <= 15 && r.eventMin[10] >= 2));
  ok(badEv.length === 0, `Tà Thú: 1 người ≤ 15 phút, 10 người ≥ 2 phút (${badEv.map((r) => r.id).join(', ') || 'đạt'})`);
  // 8. Hồi chiêu bình thuốc (Player + Inventory thật, thế giới giả)
  {
    const { Player, newChar } = require('../../src/server/core/player');
    const { Inventory } = require('../../src/server/modules/inventory');
    const { makeItem } = require('../../src/shared/data/items');
    const world = { nextPid: 1, db: fakeDb(), announce() {}, clanView() { return null; }, social: { handle() {} } };
    const inv = new Inventory(world);
    const p = new Player(world, { send() {} }, newChar('balpot', 'kiem', 'm'));
    p.recalc();
    p.c.inv[0] = makeItem('hp1', 10);
    p.c.inv[1] = makeItem('mp1', 10);
    p.c.hp = 10;
    inv.useItem(p, { slot: 0 });
    const hp1 = p.c.hp;
    const n1 = p.c.inv[0].q;
    inv.useItem(p, { slot: 0 });
    const hp2 = p.c.hp;
    const n2 = p.c.inv[0].q;
    const cd = p.cool.pot_hp - Date.now();
    p.cool.pot_hp = Date.now() - 1;
    p.c.hp = 10;
    inv.useItem(p, { slot: 0 });
    ok(hp1 === 110 && n1 === 9 && hp2 === 110 && n2 === 9, 'bình HP: hồi đúng, lần uống ngay sau bị hồi chiêu chặn');
    ok(p.c.hp === 110 && p.c.inv[0].q === 8 && cd >= POTION_CD.hp - 50 && cd <= POTION_CD.hp,
      `bình HP: hết hồi chiêu uống được, đặt hồi chiêu ${POTION_CD.hp}ms (${cd}ms)`);
    p.c.mp = 0;
    inv.useItem(p, { slot: 1 });
    ok(p.c.mp === 60 && p.c.inv[1].q === 9, 'bình MP dùng khóa hồi chiêu riêng, uống ngay sau bình HP vẫn được');
    const cdm = p.cool.pot_mp - Date.now();
    p.c.mp = 0;
    inv.useItem(p, { slot: 1 });
    ok(p.c.mp === 0 && p.c.inv[1].q === 9 && cdm >= POTION_CD.mp - 50 && cdm <= POTION_CD.mp,
      `bình MP: hồi chiêu riêng ${POTION_CD.mp}ms (${cdm}ms), uống lại ngay bị chặn`);
    // uống sớm trong dung sai 200ms: phần sớm bị trừ vào lượt sau
    const t0 = Date.now();
    p.cool.pot_hp = t0 + 150;
    p.c.hp = 10;
    inv.useItem(p, { slot: 0 });
    const cdh = p.cool.pot_hp - t0;
    ok(p.c.hp === 110 && cdh >= POTION_CD.hp + 150 && cdh <= POTION_CD.hp + 200,
      `bình HP uống sớm trong dung sai: hồi chiêu tính tiếp từ mốc cũ (${cdh}ms)`);
  }
}

// Gói dữ liệu tĩnh gửi máy khách (dùng bot admin sau endgameTest)
async function balanceBotTest(ctx) {
  const { a } = ctx;
  console.log('7k. Cân bằng: gói dữ liệu hồi chiêu bình');
  ok(!!a.data.potCd && a.data.potCd.hp === 4000 && a.data.potCd.mp === 1500, 'gói data có potCd { hp: 4000, mp: 1500 }');
}

module.exports = { balanceUnitTests, balanceBotTest };
