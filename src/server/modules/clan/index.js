'use strict';

// Gia tộc: lập (NPC Gia Tộc), mời, rời, mời ra, phong chức, góp quỹ lên cấp (+1% EXP mỗi cấp cho thành viên)
const { int, clean, own, refreshInfo } = require('../../core/util');
const { dialog } = require('../../core/npc');
const { find, invite, takeInvite } = require('../invites');

// Cấp gia tộc: góp xu → kinh nghiệm gia tộc (1 điểm / 100 xu). Mỗi cấp +5 chỗ và +1% EXP cho thành viên.
const CLAN_MAX_LEVEL = 10;
const clanNeed = (lv) => 2000 * lv * lv;
const clanCap = (cl) => 20 + (cl.level || 1) * 5;
const CLAN_COST = 50000;
const CLAN_LV = 15;
const CLAN_ELDERS = 4;
const CLAN_DONATE_MIN = 1000;
const CLAN_DONATE_MAX = 2e9;
const CLAN_FUND_MAX = 2e12;
const RANKS = ['leader', 'elder', 'member'];
const RANK_LABEL = { leader: 'tộc trưởng', elder: 'trưởng lão', member: 'thành viên' };

// Trường chữ từ máy khách đưa vào find()/so sánh: chỉ nhận chuỗi/số (đối tượng như { toString: 1 } làm String() ném lỗi)
const str = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
// Khóa thành viên = tên nhân vật chữ thường; tra bằng own() để tên như '__proto__' không chạm tới Object.prototype
const keyOf = (name) => clean(name, 16).toLowerCase();
const memberOf = (cl, name) => {
  const key = keyOf(name);
  return key && own(cl.members, key) ? cl.members[key] : null;
};

// Người kế nhiệm khi tộc trưởng rời: trưởng lão vào sớm nhất, không có thì thành viên vào sớm nhất
function heirOf(members, exceptKey) {
  const others = Object.entries(members).filter(([k]) => k !== exceptKey);
  others.sort((a, b) => (b[1].rank === 'elder') - (a[1].rank === 'elder') || a[1].joined - b[1].joined);
  return others.length ? others[0][1] : null;
}

// Dọn dữ liệu gia tộc lúc nạp (file sửa tay, bản cũ, dữ liệu hỏng): thành viên/chức/cấp/quỹ hợp lệ, đúng một tộc trưởng
function cleanClans(db) {
  const clans = db.clans && typeof db.clans === 'object' ? db.clans : {};
  const out = {};
  const num = (v, lo, hi) => Math.min(hi, Math.max(lo, int(v, lo)));
  for (const id of Object.keys(clans)) {
    const cl = clans[id];
    if (!cl || typeof cl !== 'object' || typeof cl.name !== 'string') continue;
    const members = {};
    const src = cl.members && typeof cl.members === 'object' ? cl.members : {};
    for (const k of Object.keys(src)) {
      const mm = src[k];
      if (!/^[a-z0-9_]{1,16}$/.test(k) || !mm || typeof mm !== 'object') continue;
      const name = typeof mm.name === 'string' && mm.name.toLowerCase() === k ? mm.name : k;
      members[k] = { name, rank: RANKS.includes(mm.rank) ? mm.rank : 'member', joined: int(mm.joined, 0) };
    }
    if (!Object.keys(members).length) continue;
    let lk = typeof cl.leader === 'string' ? cl.leader.toLowerCase() : '';
    if (!own(members, lk)) {
      const cur = Object.entries(members).find(([, mm]) => mm.rank === 'leader');
      lk = cur ? cur[0] : null;
      if (!lk) lk = Object.keys(members).find((k) => members[k] === heirOf(members, null));
    }
    for (const [k, mm] of Object.entries(members)) if (mm.rank === 'leader' && k !== lk) mm.rank = 'elder';
    members[lk].rank = 'leader';
    // quá số trưởng lão thì người vào muộn về thành viên
    Object.values(members).filter((mm) => mm.rank === 'elder').sort((a, b) => a.joined - b.joined)
      .slice(CLAN_ELDERS).forEach((mm) => { mm.rank = 'member'; });
    out[id] = {
      ...cl,
      leader: members[lk].name,
      notice: clean(cl.notice, 120),
      members,
      level: num(cl.level, 1, CLAN_MAX_LEVEL),
      exp: num(cl.exp, 0, 1e12),
      fund: num(cl.fund, 0, CLAN_FUND_MAX),
    };
  }
  db.clans = out;
  // nhân vật trỏ tới tộc không còn (hoặc tộc không còn mình) thì bỏ
  for (const c of Object.values(db.chars || {})) {
    if (!c || !c.clan) continue;
    const cl = own(out, String(c.clan)) ? out[String(c.clan)] : null;
    if (!cl || !own(cl.members, String(c.name || '').toLowerCase())) c.clan = null;
  }
  return out;
}

class Clan {
  constructor(world) {
    this.world = world;
    if (world.db) cleanClans(world.db);
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
      id: p.c.clan, name: cl.name, leader: cl.leader, notice: cl.notice, members, myRank: (memberOf(cl, p.name) || { rank: 'member' }).rank, max: clanCap(cl),
      level: lv, exp: cl.exp || 0, need: lv >= CLAN_MAX_LEVEL ? 0 : clanNeed(lv), bonus: lv, fund: cl.fund || 0,
    });
  }

  myClan(p) {
    const cl = p.c.clan && own(this.world.db.clans, p.c.clan) ? this.world.db.clans[p.c.clan] : null;
    if (!cl || !memberOf(cl, p.name)) {
      p.c.clan = null;
      return null;
    }
    return cl;
  }

  clanInvite(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const rank = memberOf(cl, p.name).rank;
    if (rank === 'member') return p.notice('Chỉ tộc trưởng/trưởng lão mới mời được.');
    if (Object.keys(cl.members).length >= clanCap(cl)) return p.notice('Gia tộc đã đủ thành viên.');
    const o = find(this.world, str(m.name));
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.c.clan) return p.notice(`${o.name} đã có gia tộc.`);
    invite(p, o, 'clan', { clan: cl.name });
    p.notice(`Đã mời ${o.name} vào gia tộc.`);
  }

  clanAccept(p, m) {
    const from = str(m.from);
    const o = find(this.world, from);
    if (!o || !takeInvite(p, 'clan', from)) return p.notice('Lời mời đã hết hạn.');
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
      const heir = heirOf(cl.members, key);
      if (!heir) {
        this.removeFromClan(name, id);
        delete db.clans[id];
        db.dirty = true;
        return 'dissolved';
      }
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
    const me = memberOf(cl, p.name);
    const t = memberOf(cl, m.name);
    if (!t || t === me) return;
    if (me.rank === 'member' || (me.rank === 'elder' && t.rank !== 'member')) return p.notice('Không đủ quyền.');
    this.removeFromClan(t.name, p.c.clan);
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} đã bị mời khỏi gia tộc.` });
    this.clanInfo(p);
  }

  clanPromote(p, m) {
    const cl = this.myClan(p);
    if (!cl || cl.leader !== p.name) return p.notice('Chỉ tộc trưởng mới làm được.');
    const t = memberOf(cl, m.name);
    if (!t || t.rank === 'leader') return;
    const elders = () => Object.values(cl.members).filter((mm) => mm.rank === 'elder').length;
    if (m.rank === 'leader') {
      // tộc trưởng cũ thành trưởng lão; đã đủ trưởng lão thì về thành viên
      memberOf(cl, p.name).rank = t.rank === 'elder' || elders() < CLAN_ELDERS ? 'elder' : 'member';
      t.rank = 'leader';
      cl.leader = t.name;
    } else if (t.rank === 'elder') {
      t.rank = 'member';
    } else {
      if (elders() >= CLAN_ELDERS) return p.notice(`Gia tộc đã đủ ${CLAN_ELDERS} trưởng lão.`, 'warn');
      t.rank = 'elder';
    }
    this.world.db.dirty = true;
    this.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', from: 'Hệ thống', msg: `${t.name} nay là ${RANK_LABEL[t.rank]}.` });
    this.clanInfo(p);
  }

  clanDonate(p, m) {
    const cl = this.myClan(p);
    if (!cl) return;
    const xu = int(m.xu);
    if (xu < CLAN_DONATE_MIN) return p.notice(`Góp tối thiểu ${CLAN_DONATE_MIN.toLocaleString('vi-VN')} xu.`, 'warn');
    if (xu > CLAN_DONATE_MAX) return p.notice('Số xu góp quá lớn.', 'warn');
    if (p.c.xu < xu) return p.notice('Không đủ xu.', 'warn');
    p.c.xu -= xu;
    p.markMe();
    cl.fund = Math.min(CLAN_FUND_MAX, (cl.fund || 0) + xu);
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
    if (!cl || memberOf(cl, p.name).rank === 'member') return p.notice('Chỉ tộc trưởng/trưởng lão mới sửa thông báo.');
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
        if (a === 'create') return this.clanCreate(p, str(m.text));
        if (a === 'info') return p.send('openUi', { ui: 'clan' });
      },
    },
  },
  hooks: {
    // cấp gia tộc: +1% EXP mỗi cấp
    stats(t) {
      const clans = t.p.world.db.clans;
      const cl = t.c.clan && own(clans, t.c.clan) ? clans[t.c.clan] : null;
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
  Clan, cleanClans, CLAN_ELDERS, CLAN_DONATE_MIN,
};
