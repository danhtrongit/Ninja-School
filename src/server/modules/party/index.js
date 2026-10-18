'use strict';

// Nhóm (tối đa 6 người): mời, vào, rời, mời ra, cập nhật thành viên
const { refreshInfo } = require('../../core/util');
const { find, invite, takeInvite } = require('../invites');

const PARTY_MAX = 6;

class Party {
  constructor(world) {
    this.world = world;
    this.nextParty = 1;
  }

  partyMembers(party) {
    return [...party.members].map((id) => this.world.players.get(id)).filter(Boolean);
  }

  partyBroadcast(party, t, d) {
    for (const o of this.partyMembers(party)) o.send(t, d);
  }

  sendParty(p) {
    if (!p.party) return p.send('party', { members: [] });
    this.partyUpdate(p.party);
  }

  partyUpdate(party) {
    const members = this.partyMembers(party).map((o) => ({
      id: o.id, name: o.name, cls: o.c.cls, lv: o.lv, hp: o.c.hp, mhp: o.s.maxHp, map: o.map ? o.map.def.name : '', mapId: o.map ? o.map.def.id : '', leader: party.leader === o.id,
    }));
    this.partyBroadcast(party, 'party', { id: party.id, members });
  }

  partyInvite(p, m) {
    const o = find(this.world, m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (o.party) return p.notice(`${o.name} đã có nhóm.`);
    if (p.party && p.party.leader !== p.id) return p.notice('Chỉ trưởng nhóm mới mời được.');
    if (p.party && p.party.members.size >= PARTY_MAX) return p.notice('Nhóm đã đủ người.');
    invite(p, o, 'party');
    p.notice(`Đã gửi lời mời vào nhóm tới ${o.name}.`);
  }

  partyAccept(p, m) {
    const o = find(this.world, m.from);
    if (!o || !takeInvite(p, 'party', m.from)) return p.notice('Lời mời đã hết hạn.');
    if (p.party) return p.notice('Bạn đã có nhóm.');
    if (!o.party) {
      o.party = { id: this.nextParty++, leader: o.id, members: new Set([o.id]) };
      refreshInfo(o);
    }
    if (o.party.members.size >= PARTY_MAX) return p.notice('Nhóm đã đủ người.');
    o.party.members.add(p.id);
    p.party = o.party;
    refreshInfo(p);
    this.partyBroadcast(p.party, 'chat', { ch: 'party', from: 'Hệ thống', msg: `${p.name} đã vào nhóm.` });
    this.partyUpdate(p.party);
  }

  leaveParty(p) {
    const party = p.party;
    if (!party) return;
    party.members.delete(p.id);
    p.party = null;
    p.send('party', { members: [] });
    refreshInfo(p);
    this.partyBroadcast(party, 'chat', { ch: 'party', from: 'Hệ thống', msg: `${p.name} đã rời nhóm.` });
    if (party.members.size <= 1) {
      for (const o of this.partyMembers(party)) {
        o.party = null;
        o.send('party', { members: [] });
        refreshInfo(o);
      }
      return;
    }
    if (party.leader === p.id) party.leader = [...party.members][0];
    this.partyUpdate(party);
  }

  partyLeave(p) {
    this.leaveParty(p);
  }

  partyKick(p, m) {
    if (!p.party || p.party.leader !== p.id) return;
    const o = find(this.world, m.name);
    if (!o || o.party !== p.party || o === p) return;
    this.leaveParty(o);
    o.notice('Bạn đã bị mời ra khỏi nhóm.');
  }
}

module.exports = {
  name: 'party',
  init: (world) => new Party(world),
  actions: {
    partyInvite: Party.prototype.partyInvite,
    partyAccept: Party.prototype.partyAccept,
    partyLeave: Party.prototype.partyLeave,
    partyKick: Party.prototype.partyKick,
  },
  hooks: {
    leave: {
      order: 4,
      fn(p) { if (p.party) this.leaveParty(p); },
    },
    enterMap(p) {
      this.sendParty(p);
    },
  },
  Party, PARTY_MAX,
};
