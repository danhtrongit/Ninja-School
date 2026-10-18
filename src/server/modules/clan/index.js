'use strict';

// Gia tộc: lập (NPC Gia Tộc), mời, rời, mời ra, phong chức, góp quỹ lên cấp (+1% EXP mỗi cấp cho thành viên)
const { clean, refreshInfo } = require('../../core/util');
const { dialog } = require('../../core/npc');
const { find, invite, takeInvite } = require('../invites');

// Cấp gia tộc: góp xu → kinh nghiệm gia tộc (1 điểm / 100 xu). Mỗi cấp +5 chỗ và +1% EXP cho thành viên.
const CLAN_MAX_LEVEL = 10;
const clanNeed = (lv) => 2000 * lv * lv;
const clanCap = (cl) => 20 + (cl.level || 1) * 5;
const CLAN_COST = 50000;
const CLAN_LV = 15;

class Clan {
  constructor(world) {
    this.world = world;
  }

  clanBroadcast(clanId, t, d, except) {
    const cl = this.world.db.clans[clanId];
    if (!cl) return;
    for (const key of Object.keys(cl.members)) {
      const o = this.world.byName.get(key);
      if (o && o !== except) o.send(t, d);
    }
  }

  clanDialog(p, n) {
    if (p.c.clan) return dialog(p, n, 'Gia tộc của ngươi đang phát triển thế nào rồi?', [{ a: 'info', label: 'Quản lý gia tộc' }]);
    dialog(p, n, 'Lập gia tộc cần cấp 15 và 50.000 xu. Tên gia tộc 3-12 ký tự (chữ, số).', [{ a: 'create', label: 'Lập gia tộc', input: 'Nhập tên gia tộc' }]);
  }

  clanCreate(p, name) {
    name = clean(name, 12);
    if (p.c.clan) return p.notice('Bạn đã có gia tộc.');
    if (!/^[A-Za-z0-9]{3,12}$/.test(name)) return p.notice('Tên gia tộc 3-12 ký tự chữ hoặc số, không dấu.', 'warn');
    if (p.lv < CLAN_LV) return p.notice(`Cần cấp ${CLAN_LV} để lập gia tộc.`, 'warn');
    if (p.c.xu < CLAN_COST) return p.notice(`Cần ${CLAN_COST.toLocaleString('vi-VN')} xu.`, 'warn');
    const db = this.world.db;
    if (Object.values(db.clans).some((c) => c.name.toLowerCase() === name.toLowerCase())) return p.notice('Tên gia tộc đã tồn tại.', 'warn');
    p.c.xu -= CLAN_COST;
    const id = db.newClanId();
    db.clans[id] = { name, leader: p.name, created: Date.now(), notice: 'Chào mừng đến với gia tộc!', members: { [p.name.toLowerCase()]: { name: p.name, rank: 'leader', joined: Date.now() } } };
    db.dirty = true;
    p.c.clan = id;
    p.markMe();
    refreshInfo(p);
    this.world.announce(`${p.name} đã thành lập gia tộc ${name}!`, 'world');
    this.clanInfo(p);
  }

  clanInfo(p) {
    const cl = p.c.clan && this.world.db.clans[p.c.clan];
    if (!cl) return p.send('clan', null);
    const members = Object.entries(cl.members).map(([key, mm]) => {
      const o = this.world.byName.get(key);
      const c = o ? o.c : this.world.db.getChar(key);
      return { name: mm.name, rank: mm.rank, lv: c ? c.level : 0, cls: c ? c.cls : '', online: !!o };
    }).sort((a, b) => b.online - a.online || b.lv - a.lv);
    const lv = cl.level || 1;
    p.send('clan', {
      id: p.c.clan, name: cl.name, leader: cl.leader, notice: cl.notice, members, myRank: cl.members[p.name.toLowerCase()].rank, max: clanCap(cl),
      level: lv, exp: cl.exp || 0, need: lv >= CLAN_MAX_LEVEL ? 0 : clanNeed(lv), bonus: lv, fund: cl.fund || 0,
    });
  }

  myClan(p) {
    const cl = p.c.clan && this.world.db.clans[p.c.clan];
    if (!cl || !cl.members[p.name.toLowerCase()]) {
      p.c.clan = null;
      return null;
    }
    return cl;
  }

  clanInvite(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const rank = cl.members[p.name.toLowerCase()].rank;
    if (rank === 'member') return p.notice('Chỉ tộc trưởng/trưởng lão mới mời được.');
    if (Object.keys(cl.members).length >= clanCap(cl)) return p.notice('Gia tộc đã đủ thành viên.');
    const o = find(this.world, m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.c.clan) return p.notice(`${o.name} đã có gia tộc.`);
    invite(p, o, 'clan', { clan: cl.name });
    p.notice(`Đã mời ${o.name} vào gia tộc.`);
  }

  clanAccept(p, m) {
    const o = find(this.world, m.from);
    if (!o || !takeInvite(p, 'clan', m.from)) return p.notice('Lời mời đã hết hạn.');
    const cl = this.myClan(o);
    if (!cl || p.c.clan) return;
    if (Object.keys(cl.members).length >= clanCap(cl)) return p.notice('Gia tộc đã đủ thành viên.');
    cl.members[p.name.toLowerCase()] = { name: p.name, rank: 'member', joined: Date.now() };
    p.c.clan = o.c.clan;
    this.world.db.dirty = true;
    p.markMe();
    refreshInfo(p);
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã gia nhập gia tộc!` });
    this.clanInfo(p);
  }

  removeFromClan(name, clanId) {
    const db = this.world.db;
    const cl = db.clans[clanId];
    if (!cl) return;
    delete cl.members[name.toLowerCase()];
    const o = this.world.byName.get(name.toLowerCase());
    const c = o ? o.c : db.getChar(name);
    if (c) c.clan = null;
    if (o) {
      o.markMe();
      refreshInfo(o);
      o.send('clan', null);
    }
    db.dirty = true;
  }

  // Rời gia tộc (dùng cả khi xóa nhân vật): tộc trưởng rời thì nhường chức, còn 1 người thì giải tán
  leaveClan(name, id) {
    const db = this.world.db;
    const cl = db.clans[id];
    if (!cl) return null;
    const key = name.toLowerCase();
    if (cl.leader.toLowerCase() === key) {
      const others = Object.entries(cl.members).filter(([k]) => k !== key);
      if (!others.length) {
        this.removeFromClan(name, id);
        delete db.clans[id];
        db.dirty = true;
        return 'dissolved';
      }
      others.sort((a, b) => (b[1].rank === 'elder') - (a[1].rank === 'elder') || a[1].joined - b[1].joined);
      const [, heir] = others[0];
      heir.rank = 'leader';
      cl.leader = heir.name;
      this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${heir.name} trở thành tộc trưởng mới.` });
    }
    this.removeFromClan(name, id);
    this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${name} đã rời gia tộc.` });
    return 'left';
  }

  clanLeave(p) {
    if (!this.myClan(p)) return;
    const r = this.leaveClan(p.name, p.c.clan);
    p.notice(r === 'dissolved' ? 'Gia tộc đã giải tán.' : 'Bạn đã rời gia tộc.');
  }

  clanKick(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const me = cl.members[p.name.toLowerCase()];
    const key = String(m.name || '').toLowerCase();
    const t = cl.members[key];
    if (!t || key === p.name.toLowerCase()) return;
    if (me.rank === 'member' || (me.rank === 'elder' && t.rank !== 'member')) return p.notice('Không đủ quyền.');
    this.removeFromClan(t.name, p.c.clan);
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} đã bị mời khỏi gia tộc.` });
    this.clanInfo(p);
  }

  clanPromote(p, m) {
    const cl = this.myClan(p);
    if (!cl || cl.leader !== p.name) return p.notice('Chỉ tộc trưởng mới làm được.');
    const t = cl.members[String(m.name || '').toLowerCase()];
    if (!t || t.rank === 'leader') return;
    if (m.rank === 'leader') {
      cl.members[p.name.toLowerCase()].rank = 'elder';
      t.rank = 'leader';
      cl.leader = t.name;
    } else {
      t.rank = t.rank === 'elder' ? 'member' : 'elder';
    }
    this.world.db.dirty = true;
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} nay là ${{ leader: 'tộc trưởng', elder: 'trưởng lão', member: 'thành viên' }[t.rank]}.` });
    this.clanInfo(p);
  }

  clanDonate(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const xu = Math.floor(+m.xu || 0);
    if (xu < 1000) return p.notice('Góp tối thiểu 1.000 xu.', 'warn');
    if (p.c.xu < xu) return p.notice('Không đủ xu.', 'warn');
    p.c.xu -= xu;
    p.markMe();
    cl.fund = (cl.fund || 0) + xu;
    cl.exp = (cl.exp || 0) + Math.floor(xu / 100);
    cl.level = cl.level || 1;
    const id = p.c.clan;
    let up = false;
    while (cl.level < CLAN_MAX_LEVEL && cl.exp >= clanNeed(cl.level)) {
      cl.exp -= clanNeed(cl.level);
      cl.level++;
      up = true;
    }
    this.world.db.dirty = true;
    this.clanBroadcast(id, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã góp ${xu.toLocaleString('vi-VN')} xu vào quỹ gia tộc.` });
    if (up) {
      this.world.announce(`Gia tộc ${cl.name} đã đạt cấp ${cl.level}!`, 'world');
      for (const key of Object.keys(cl.members)) {
        const o = this.world.byName.get(key);
        if (o) o.recalc();
      }
    }
    this.clanInfo(p);
  }

  clanNotice(p, m) {
    const cl = this.myClan(p);
    if (!cl || cl.members[p.name.toLowerCase()].rank === 'member') return;
    cl.notice = clean(m.text, 120);
    this.world.db.dirty = true;
    this.clanInfo(p);
  }
}

module.exports = {
  name: 'clan',
  init: (world) => new Clan(world),
  actions: {
    clanInvite: Clan.prototype.clanInvite,
    clanAccept: Clan.prototype.clanAccept,
    clanLeave: Clan.prototype.clanLeave,
    clanKick: Clan.prototype.clanKick,
    clanInfo: Clan.prototype.clanInfo,
    clanNotice: Clan.prototype.clanNotice,
    clanPromote: Clan.prototype.clanPromote,
    clanDonate: Clan.prototype.clanDonate,
  },
  npcs: {
    clan: {
      open(p, n) { this.clanDialog(p, n); },
      act(p, n, a, m) {
        if (a === 'create') return this.clanCreate(p, String(m.text || ''));
        if (a === 'info') return p.send('openUi', { ui: 'clan' });
      },
    },
  },
  hooks: {
    // cấp gia tộc: +1% EXP mỗi cấp
    stats(t) {
      const cl = t.c.clan && t.p.world.db.clans[t.c.clan];
      t.expPct += cl ? cl.level || 1 : 0;
    },
    join(p) {
      if (p.c.clan) this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã online.` }, p);
    },
    leave: {
      order: 5,
      fn(p) {
        if (p.c.clan) this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${p.name} đã offline.` }, p);
      },
    },
    // xóa nhân vật: rời gia tộc (tộc trưởng thì nhường chức)
    charDeleted(c) {
      if (c && c.clan && this.world.db.clans[c.clan]) this.leaveClan(c.name, c.clan);
    },
  },
  Clan,
};
