'use strict';

// PK & thách đấu: bật/tắt chế độ PK, điểm hiếu chiến giảm dần, thách đấu 1-1, hồi sinh khi trọng thương
const { CLASSES } = require('../../../shared/data/classes');
const { MAPS } = require('../../../shared/data/maps');
const { REVIVE, reviveLuong } = require('../../../shared/constants');
const { refreshInfo } = require('../../core/util');
const { find, invite, takeInvite } = require('../invites');

class Pk {
  constructor(world) {
    this.world = world;
  }

  pk(p, m) {
    const on = !!m.on;
    if (on && p.lv < 10) return p.notice('Cần đạt cấp 10 để bật chế độ PK.', 'warn');
    if (on && p.map && p.map.def.town) return p.notice('Không thể bật PK trong làng.', 'warn');
    p.pkMode = on;
    p.markMe();
    refreshInfo(p);
    p.notice(on ? 'Đã BẬT chế độ PK - có thể tấn công người chơi khác (ngoài làng).' : 'Đã TẮT chế độ PK.', on ? 'warn' : 'info');
  }

  // Hồi sinh: 'here' tại chỗ (1 Thẻ Hồi Sinh hoặc lượng leo thang 1/2/3 trong 10 phút, bảo hộ 3 giây), mọi mode khác là về làng
  revive(p, m) {
    if (!p.dead) return;
    const now = Date.now();
    if (m && m.mode === 'here') {
      const log = (p.reviveLog || []).filter((t) => now - t < REVIVE.win);
      if (p.countItem('revive_card') > 0) p.removeItem('revive_card', 1);
      else {
        const cost = reviveLuong(log, now);
        if (p.c.luong < cost) return p.notice(`Cần ${cost} lượng hoặc Thẻ Hồi Sinh.`, 'warn');
        p.c.luong -= cost;
      }
      // chỉ ở RAM: thoát game là đếm lại từ đầu (GDD 05 B5)
      log.push(now);
      p.reviveLog = log.slice(-REVIVE.cost.length);
      p.dead = false;
      p.airAt = 0;
      p.baseY = p.y;
      p.c.hp = Math.round(p.s.maxHp * 0.6);
      p.c.mp = Math.max(p.c.mp, Math.round(p.s.maxMp * 0.3));
      // lôi đài không có chết thật nên không cần bảo hộ; ra chiêu là hết bảo hộ (so lastSkillAt)
      p.guard = p.match ? null : { until: now + REVIVE.guard, skill: p.lastSkillAt };
      p.markMe();
      p.send('revived', { guard: p.guard ? REVIVE.guard : 0 });
      refreshInfo(p);
      return;
    }
    p.dead = false;
    p.guard = null;
    p.c.hp = p.s.maxHp;
    p.c.mp = p.s.maxMp;
    p.send('revived', {});
    // bản đồ có điểm hồi sinh rv (làng gần nhất) thì về đó, không thì về làng phái
    const rv = p.map && p.map.def.rv;
    this.world.changeMap(p, rv && MAPS[rv] && MAPS[rv].town ? rv : CLASSES[p.c.cls].village, null);
    p.markMe();
    refreshInfo(p);
  }

  // ---------- Thách đấu
  duelReq(p, m) {
    const o = find(this.world, m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (!p.map || o.map !== p.map) return p.notice('Phải ở cùng bản đồ.');
    if (p.map.def.town) return p.notice('Không thể thách đấu trong làng.');
    if (p.map.def.arena) return p.notice('Đang ở lôi đài.');
    if (p.duel || o.duel) return p.notice('Một bên đang thách đấu.');
    invite(p, o, 'duel');
    p.notice(`Đã gửi lời thách đấu tới ${o.name}.`);
  }

  duelAccept(p, m) {
    const o = find(this.world, m.from);
    if (!o || !takeInvite(p, 'duel', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (o.map !== p.map || p.map.def.town || p.map.def.arena || p.match || o.match || o.dead || p.dead) return p.notice('Không thể bắt đầu thách đấu.');
    p.duel = o.id;
    o.duel = p.id;
    for (const [a, b] of [[p, o], [o, p]]) {
      a.send('duel', { with: b.id, name: b.name });
      a.notice(`Bắt đầu thách đấu với ${b.name}!`, 'warn');
    }
  }

  // Gọi từ combat khi một bên bị hạ trong trận thách đấu
  endDuel(winner, loser) {
    winner.duel = null;
    loser.duel = null;
    for (const pl of [winner, loser]) pl.send('duel', { with: 0 });
    if (winner.map) winner.map.broadcast('chat', { ch: 'sys', msg: `${winner.name} đã chiến thắng ${loser.name} trong trận thách đấu!` });
  }

  cancelDuel(p, msg) {
    const o = this.world.players.get(p.duel);
    p.duel = null;
    p.send('duel', { with: 0 });
    if (o && o.duel === p.id) {
      o.duel = null;
      o.send('duel', { with: 0 });
      if (msg) o.notice(msg);
    }
  }
}

module.exports = {
  name: 'pk',
  init: (world) => new Pk(world),
  actions: {
    pk: Pk.prototype.pk,
    revive: Pk.prototype.revive,
    duelReq: Pk.prototype.duelReq,
    duelAccept: Pk.prototype.duelAccept,
  },
  hooks: {
    leave: {
      order: 3,
      fn(p) { if (p.duel) this.cancelDuel(p, 'Đối phương đã thoát game.'); },
    },
    mapLeft: {
      order: 1,
      fn(p) {
        p.guard = null;
        if (p.duel) this.cancelDuel(p, 'Rời bản đồ, trận thách đấu bị hủy.');
      },
    },
    // Giảm điểm hiếu chiến mỗi 10 phút
    playerSecond: {
      order: 4,
      fn(p) {
        if (p.c.pk > 0 && p.c.playtime % 600 === 0) {
          p.c.pk--;
          p.markMe();
        }
      },
    },
  },
  Pk,
};
