'use strict';

// Nhiệm vụ chính (Trưởng Làng) và nhiệm vụ diệt quái hằng ngày (Tiểu Nhị)
const { ITEMS, makeItem } = require('../../../shared/data/items');
const { bind } = require('../../../shared/bound');
const { MAPS } = require('../../../shared/data/maps');
const { MONSTERS } = require('../../../shared/data/monsters');
const { MAIN_QUESTS, DAILY } = require('../../../shared/data/quests');
const { vnDay } = require('../../../shared/formulas');
const { dialog } = require('../../core/npc');

// Bản đồ nơi mỗi loại quái xuất hiện (để chỉ dẫn nhiệm vụ)
const MONSTER_MAP = {};
for (const id in MAPS) {
  for (const s of MAPS[id].spawns) if (!MONSTER_MAP[s.m]) MONSTER_MAP[s.m] = MAPS[id].name;
  for (const b of MAPS[id].boss || []) MONSTER_MAP[b.m] = MAPS[id].name;
}

class Quest {
  constructor(world) {
    this.world = world;
  }

  // ---------- Nhiệm vụ chính
  elderDialog(p, n) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def) return dialog(p, n, 'Ngươi đã hoàn thành mọi thử thách của ta. Ngươi chính là Ninja huyền thoại!');
    if (q.st === 0) {
      if (p.lv < def.req) return dialog(p, n, `Nhiệm vụ tiếp theo: "${def.name}". Hãy luyện tập đến cấp ${def.req} rồi quay lại gặp ta.`);
      return dialog(p, n, `【${def.name}】\n${def.desc}\n\nPhần thưởng: ${this.rewardText(p, def.reward)}`, [{ a: 'accept', label: 'Nhận nhiệm vụ' }]);
    }
    const v = p.questView();
    if (q.st === 2 || v.prog >= v.n) {
      return dialog(p, n, `Làm tốt lắm! Ngươi đã hoàn thành "${def.name}".`, [{ a: 'finish', label: 'Nhận thưởng' }]);
    }
    return dialog(p, n, `【${def.name}】\n${def.desc}\nTiến độ: ${v.prog}/${v.n}${def.m && MONSTER_MAP[def.m] ? `\nĐịa điểm: ${MONSTER_MAP[def.m]}` : ''}${def.map && MAPS[def.map] ? `\nĐịa điểm: ${MAPS[def.map].name}` : ''}`);
  }

  rewardText(p, r) {
    const parts = [];
    if (r.exp) parts.push(`${r.exp.toLocaleString('vi-VN')} EXP`);
    if (r.xu) parts.push(`${r.xu.toLocaleString('vi-VN')} xu khóa`);
    if (r.luong) parts.push(`${r.luong} lượng`);
    for (const [id, q] of r.items || []) {
      const rid = this.rewardId(p, id);
      parts.push(`${ITEMS[rid].name}${q > 1 ? ` x${q}` : ''}`);
    }
    return parts.join(', ');
  }

  // 'W<bậc>' = vũ khí đúng phái của người nhận
  rewardId(p, id) {
    return id[0] === 'W' ? `w_${p.c.cls}_${id.slice(1)}` : id;
  }

  acceptMain(p) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || q.st !== 0 || p.lv < def.req) return;
    q.st = 1;
    q.prog = 0;
    if (def.kind === 'talk') q.st = 2;
    if (def.kind === 'collect' && p.countItem(def.item) >= def.n) q.st = 2;
    if (def.kind === 'level' && p.lv >= def.n) q.st = 2;
    if (def.kind === 'upgrade' && p.maxPlus() >= def.n) q.st = 2;
    if (def.kind === 'visit' && p.map && p.map.def.id === def.map) q.st = 2;
    p.markMe();
    if (q.st === 2) return this.finishMain(p);
    p.notice(`Đã nhận nhiệm vụ: ${def.name}`, 'quest');
  }

  finishMain(p) {
    const q = p.c.quest;
    const def = MAIN_QUESTS[q.i];
    if (!def || q.st < 1) return;
    const v = p.questView();
    if (v.prog < v.n && q.st !== 2) return;
    if (def.kind === 'collect' && p.countItem(def.item) < def.n) return;
    if (def.kind === 'upgrade' && p.maxPlus() < def.n) return;
    const r = def.reward;
    const items = (r.items || []).map(([id, n]) => [this.rewardId(p, id), n]);
    const need = items.reduce((s, [id, n]) => s + (ITEMS[id].stack ? 1 : n), 0);
    if (p.freeSlots() < need) return p.notice(`Cần ${need} ô trống trong hành trang.`, 'warn');
    if (def.kind === 'collect') p.removeItem(def.item, def.n);
    for (const [id, n] of items) p.addItem(id, n, ITEMS[id].type === 'equip' ? 1 : 0, 0, 1);
    q.i++;
    q.st = 0;
    q.prog = 0;
    if (r.xu) p.gainXuk(r.xu);
    if (r.luong) p.c.luong += r.luong;
    if (r.exp) p.gainExp(r.exp / p.s.expMul);
    p.markMe();
    p.notice(`Hoàn thành "${def.name}"! Nhận: ${this.rewardText(p, r)}`, 'reward');
  }

  // ---------- Nhiệm vụ hằng ngày
  ensureDaily(p) {
    const today = vnDay();
    if (p.c.daily.day !== today) p.c.daily = { day: today, done: 0, task: null };
    return p.c.daily;
  }

  taskDialog(p, n) {
    const d = this.ensureDaily(p);
    const t = d.task;
    if (t) {
      if (t.prog >= t.n) return dialog(p, n, `Ngươi đã diệt đủ ${t.n} ${MONSTERS[t.m].name}. Giỏi lắm!`, [{ a: 'finish', label: 'Nhận thưởng' }]);
      return dialog(p, n, `Nhiệm vụ: tiêu diệt ${t.n} ${MONSTERS[t.m].name} tại ${MONSTER_MAP[t.m]}.\nTiến độ: ${t.prog}/${t.n}`, [{ a: 'cancel', label: 'Hủy nhiệm vụ' }]);
    }
    if (d.done >= DAILY.max) return dialog(p, n, `Hôm nay ngươi đã hoàn thành ${DAILY.max} nhiệm vụ. Ngày mai hãy quay lại!`);
    const rw = DAILY.reward(p.lv);
    return dialog(p, n, `Ta có nhiệm vụ diệt quái hằng ngày cho ngươi (${d.done}/${DAILY.max}).\nThưởng: ${rw.exp.toLocaleString('vi-VN')} EXP, ${rw.xu} xu khóa, ${rw.luong} lượng.`, [{ a: 'accept', label: 'Nhận nhiệm vụ' }]);
  }

  acceptDaily(p) {
    const d = this.ensureDaily(p);
    if (d.task || d.done >= DAILY.max) return;
    const lv = p.lv;
    let cands = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss && MONSTER_MAP[k] && MONSTERS[k].lv >= lv - 5 && MONSTERS[k].lv <= lv + 2);
    if (!cands.length) {
      const below = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss && MONSTER_MAP[k] && MONSTERS[k].lv <= lv + 2);
      below.sort((a, b) => MONSTERS[b].lv - MONSTERS[a].lv);
      cands = below.slice(0, 2);
    }
    const m = cands[Math.floor(Math.random() * cands.length)];
    d.task = { m, n: DAILY.count(lv), prog: 0 };
    p.markMe();
    p.notice(`Nhận nhiệm vụ: diệt ${d.task.n} ${MONSTERS[m].name} (${MONSTER_MAP[m]}).`, 'quest');
  }

  finishDaily(p) {
    const d = this.ensureDaily(p);
    if (!d.task || d.task.prog < d.task.n) return;
    const rw = DAILY.reward(p.lv);
    d.task = null;
    d.done++;
    p.gainXuk(rw.xu);
    p.c.luong += rw.luong;
    const got = p.gainExp(rw.exp);
    // rương khóa chỉ gộp với chồng khóa: túi đầy thì gửi thủ kho, không để mất
    if (d.done % 5 === 0 && !p.addItem('chest', 1, 0, 0, 1)) p.stashItem(bind(makeItem('chest', 1)));
    p.markMe();
    p.notice(`Hoàn thành nhiệm vụ hằng ngày: +${got} EXP, +${rw.xu} xu khóa, +${rw.luong} lượng${d.done % 5 === 0 ? ', +1 Rương Báu' : ''}.`, 'reward');
  }
}

module.exports = {
  name: 'quest',
  init: (world) => new Quest(world),
  npcs: {
    elder: {
      open(p, n) { this.elderDialog(p, n); },
      act(p, n, a) {
        if (a === 'accept') this.acceptMain(p);
        else if (a === 'finish') this.finishMain(p);
        return this.elderDialog(p, n);
      },
    },
    task: {
      open(p, n) { this.taskDialog(p, n); },
      act(p, n, a) {
        if (a === 'accept') this.acceptDaily(p);
        else if (a === 'finish') this.finishDaily(p);
        else if (a === 'cancel') {
          p.c.daily.task = null;
          p.markMe();
        }
        return this.taskDialog(p, n);
      },
    },
  },
  hooks: {
    // tiến độ nhiệm vụ diệt quái (chính + hằng ngày)
    kill(p, monsterKey) {
      const q = p.c.quest;
      const def = MAIN_QUESTS[q.i];
      if (def && def.kind === 'kill' && q.st === 1 && def.m === monsterKey) {
        q.prog = Math.min(def.n, q.prog + 1);
        if (q.prog >= def.n) {
          q.st = 2;
          p.notice(`Nhiệm vụ "${def.name}" đã hoàn thành! Hãy về gặp Trưởng Làng.`, 'quest');
        }
        p.markMe();
      }
      const t = p.c.daily.task;
      if (t && t.m === monsterKey && t.prog < t.n) {
        t.prog++;
        if (t.prog >= t.n) p.notice('Nhiệm vụ hằng ngày đã hoàn thành! Hãy gặp Tiểu Nhị để nhận thưởng.', 'quest');
        p.markMe();
      }
    },
  },
  Quest, MONSTER_MAP,
};
