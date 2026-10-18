'use strict';

// Mô hình cân bằng: dựng "người chơi trung bình" bằng Player thật (thế giới giả) rồi đo quái/boss/Tà Thú.
// Chạy: node tools/balance.js (in bảng markdown). tools/check-data.js và tests/features/balance.js dùng lại các hàm.
const { Player, newChar } = require('../src/server/core/player');
const { Combat } = require('../src/server/core/combat');
const { ITEMS, makeItem, GEAR_SLOTS, GEM } = require('../src/shared/data/items');
const { MONSTERS, baseStats, eventHpMul } = require('../src/shared/data/monsters');
const { SKILLS, classSkills, skillVal } = require('../src/shared/data/skills');

// Hồ sơ người chơi trung bình theo cấp L (DESIGN_RULES mục 9, dòng "Mốc cân bằng")
const tierOf = (L) => Math.min(11, Math.floor(L / 10));
const plusOf = (L) => Math.min(10, Math.round(2 + L / 15));
const gemLvOf = (L) => Math.max(1, Math.min(5, 1 + Math.floor(L / 25)));
const skLv = (L, req) => (L < req ? 0 : Math.min(15, Math.floor((L - req) / 3) + 1));
const GEM_PLAN = {
  weapon: ['hoa', 'loi', 'huyet'], gloves: ['hoa', 'loi', 'tho'], ring: ['hoa', 'loi', 'thuy'],
  hat: ['thuy', 'tho', 'hoa'], armor: ['thuy', 'tho', 'hoa'], pants: ['thuy', 'tho', 'hoa'],
  shoes: ['tho', 'phong', 'thuy'], necklace: ['thuy', 'huyet', 'hoa'], amulet: ['thuy', 'tho', 'huyet'],
};
const fashionOf = (L) => (L >= 40 ? ['mask_oni', 'cloak_flame', 'costume_shadow', 'mount_wolf']
  : L >= 20 ? ['mask_fox', 'cloak_night', 'costume_sakura', 'mount_wolf'] : ['mask_fox', 'cloak_wind', 'costume_sakura', 'mount_horse']);
const petOf = (L) => (L >= 70 ? 'pet_ghost' : L >= 50 ? 'pet_fox' : L >= 30 ? 'pet_bat' : 'pet_bunny');

const world = { nextPid: 1, db: { dirty: false, clans: {} }, announce() {}, clanView() { return null; }, social: { handle() {} } };

// profile 'avg': đủ ngọc + thời trang + nội tại + thú; 'low': chỉ trang bị, cường hóa thấp hơn 3 cấp
function makePlayer(cls, L, profile = 'avg') {
  const full = profile === 'avg';
  const c = newChar(`bal${cls}${L}`, cls, 'm');
  c.level = L;
  const pot = 5 * (L - 1);
  c.stats = { str: 5 + Math.round(pot * 0.5), agi: 5 + Math.round(pot * 0.2), int: 5, vit: 5 + Math.round(pot * 0.3) };
  const t = tierOf(L);
  const plus = full ? plusOf(L) : Math.max(0, plusOf(L) - 3);
  c.equip = {};
  for (const s of GEAR_SLOTS) {
    const it = makeItem(s === 'weapon' ? `w_${cls}_${t}` : `${s}_${t}`, 1, 0);
    it.p = plus;
    if (full) it.gems = GEM_PLAN[s].slice(0, GEM.holes(t)).map((k) => `gem_${k}_${gemLvOf(L)}`);
    c.equip[s] = it;
  }
  if (full) {
    for (const id of fashionOf(L)) c.equip[ITEMS[id].slot] = makeItem(id, 1);
    const pet = makeItem(petOf(L), 1);
    pet.plv = Math.max(1, Math.min(50, Math.round(L * 0.4)));
    c.equip.pet = pet;
    for (const id of classSkills(cls)) if (SKILLS[id].type === 'passive' && skLv(L, SKILLS[id].req)) c.skills[id] = skLv(L, SKILLS[id].req);
  }
  const p = new Player(world, { send() {} }, c);
  p.recalc();
  return p;
}

const cb = new Combat(world);
// Sát thương kỳ vọng 1 đòn: calc với Math.random = 0.5 (dao động ×1, không chí mạng, không né) rồi nhân kỳ vọng chí mạng
function expHit(att, tgt, mul, isSkill) {
  const rnd = Math.random;
  try {
    Math.random = () => 0.5;
    const base = cb.calc({ ...att, crit: 0 }, { ...tgt, dodge: 0 }, mul, isSkill).dmg;
    const cr = Math.min(1, (att.crit || 0) / 100);
    return base * (1 - cr + (cr * (att.critDmg || 160)) / 100);
  } finally {
    Math.random = rnd;
  }
}
const playerAtt = (p) => ({ atk: p.s.atk, crit: p.s.crit, critDmg: p.s.critDmg, hit: p.s.hit, skillDmg: p.s.skillDmg, el: null });
const playerTgt = (p) => ({ def: p.s.def, dodge: 0, el: null, resist: 0 });
const monAtt = (m) => ({ atk: m.atk, crit: m.boss ? 10 : 3, critDmg: 160, hit: m.lv, el: null });

// DPS lý thuyết 1 mục tiêu: chiêu gây sát thương xả theo hồi chiêu (mỗi lần khóa 180ms), đòn thường lấp chỗ trống
function dps(p, m) {
  const L = p.c.level;
  const att = playerAtt(p);
  const tgt = { def: m.def, dodge: 0, el: null };
  let sum = 0;
  let lock = 0;
  let basic = null;
  for (const id of classSkills(p.c.cls)) {
    const sk = SKILLS[id];
    if (sk.basic) { basic = sk; continue; }
    if (!sk.mul || L < sk.req) continue;
    sum += (expHit(att, tgt, skillVal(sk.mul, skLv(L, sk.req)), true) * (sk.hits || 1)) / (sk.cd / 1000);
    lock += 0.18 / (sk.cd / 1000);
  }
  return sum + (expHit(att, tgt, basic.mul[0], false) / (basic.cd / 1000)) * Math.max(0, 1 - lock);
}

// Hiệu suất thực tế khi đánh boss (di chuyển, né chiêu): 60% DPS lý thuyết
const UPTIME = 0.6;
const LVS = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

function curve() {
  return LVS.map((L) => {
    const k = makePlayer('kiem', L);
    const k0 = makePlayer('kiem', L, 'low');
    const c = makePlayer('cung', L);
    const mob = { def: Math.round(L * 1.5) };
    return { L, kHp: k.s.maxHp, kAtk: k.s.atk, kDef: k.s.def, crit: k.s.crit, critDmg: k.s.critDmg, cHp: c.s.maxHp, ls: k.s.lifesteal,
      lowHp: k0.s.maxHp, lowAtk: k0.s.atk, dps: dps(k, mob), lowDps: dps(k0, mob) };
  });
}

// Quái thường cấp ≥ 10 so với Kiếm/Cung trung bình cùng cấp
function mobRows() {
  const out = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    // quái hang động cấp bậc (cave) có hệ số độ khó riêng, không đo theo dải quái thường
    if (m.boss || m.lv < 10 || m.cave) continue;
    const k = makePlayer('kiem', m.lv);
    const c = makePlayer('cung', m.lv);
    out.push({ id, lv: m.lv, hitK: expHit(monAtt(m), playerTgt(k), 1, false) / k.s.maxHp, hitC: expHit(monAtt(m), playerTgt(c), 1, false) / c.s.maxHp,
      hitsToKill: m.hp / expHit(playerAtt(k), { def: m.def }, 1, false) });
  }
  return out;
}

// Boss và Tà Thú so với người cùng cấp (boss trên cấp 120 thì đo người cấp 120)
function bossRows() {
  const out = [];
  for (const [id, m] of Object.entries(MONSTERS)) {
    // boss hang động (cave) và boss gia tộc (clan) đánh theo nhóm, có dải riêng ở đặc tả của chúng
    if (!m.boss || m.cave || m.clan) continue;
    const L = Math.min(120, m.lv);
    const k = makePlayer('kiem', L);
    const c = makePlayer('cung', L);
    const top = m.skills.reduce((s, x) => (x.mul > s.mul ? x : s), { mul: 0 });
    const d = ((dps(k, m) + dps(c, m)) / 2) * UPTIME;
    const row = { id, name: m.name, lv: m.lv, event: m.event, hp: m.hp, atk: m.atk,
      hitK: expHit(monAtt(m), playerTgt(k), 1, false) / k.s.maxHp,
      skill: top.name, skillMul: top.mul, skillC: expHit(monAtt(m), playerTgt(c), top.mul, false) / c.s.maxHp,
      soloMin: m.hp / d / 60 };
    if (m.event) {
      row.eventMin = {};
      for (const n of [1, 3, 5, 10, 20]) row.eventMin[n] = (baseStats(m.lv).hp * eventHpMul(n)) / d / n / 60;
    }
    out.push(row);
  }
  return out;
}

module.exports = { makePlayer, expHit, dps, curve, mobRows, bossRows, UPTIME, LVS };

if (require.main === module) {
  const f = (n) => Math.round(n).toLocaleString('vi-VN');
  const pc = (x) => `${(x * 100).toFixed(1)}%`;
  console.log('## Người chơi trung bình (Kiếm), đủ hệ thống so với chỉ trang bị\n');
  console.log('| Cấp | HP | Công | Thủ | Chí mạng | ST CM | Hút máu | HP chỉ TB | Công chỉ TB | DPS | DPS chỉ TB |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of curve()) console.log(`| ${r.L} | ${f(r.kHp)} | ${f(r.kAtk)} | ${f(r.kDef)} | ${r.crit} | ${r.critDmg} | ${r.ls} | ${f(r.lowHp)} | ${f(r.lowAtk)} | ${f(r.dps)} | ${f(r.lowDps)} |`);
  console.log('\n## Quái thường\n');
  console.log('| Quái | Cấp | Đòn/HP Kiếm | Đòn/HP Cung | Đòn thường Kiếm để hạ |');
  console.log('|---|---|---|---|---|');
  for (const r of mobRows()) console.log(`| ${r.id} | ${r.lv} | ${pc(r.hitK)} | ${pc(r.hitC)} | ${r.hitsToKill.toFixed(1)} |`);
  console.log('\n## Boss\n');
  console.log('| Boss | Cấp | HP | Công | Đòn thường/HP Kiếm | Chiêu mạnh nhất/HP Cung | Solo thực tế (phút) | Tà Thú 1/3/10 người (phút) |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of bossRows()) {
    const ev = r.eventMin ? [1, 3, 10].map((n) => r.eventMin[n].toFixed(1)).join(' / ') : '-';
    console.log(`| ${r.name} | ${r.lv} | ${f(r.hp)} | ${f(r.atk)} | ${pc(r.hitK)} | ${r.skill} ×${r.skillMul}: ${pc(r.skillC)} | ${r.soloMin.toFixed(1)} | ${ev} |`);
  }
}
