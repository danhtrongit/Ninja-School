'use strict';

// Lời mời giữa người chơi (nhóm, giao dịch, thách đấu, gia tộc, kết bạn): hạn 30 giây, từ chối
function find(world, name) {
  return world.byName.get(String(name || '').toLowerCase()) || null;
}

function invite(from, to, kind, extra) {
  to.invites[`${kind}:${from.name.toLowerCase()}`] = Date.now() + 30000;
  to.send('invite', { kind, from: from.name, ...extra });
}

// Lấy (và xóa) lời mời kind của from gửi p: còn hạn thì true
function takeInvite(p, kind, from) {
  const key = `${kind}:${String(from).toLowerCase()}`;
  const exp = p.invites[key];
  delete p.invites[key];
  return exp && exp > Date.now();
}

class Invites {
  constructor(world) {
    this.world = world;
  }

  decline(p, m) {
    const o = find(this.world, m.from);
    delete p.invites[`${m.kind}:${String(m.from).toLowerCase()}`];
    if (o) o.notice(`${p.name} đã từ chối lời mời.`);
  }
}

module.exports = {
  name: 'invites',
  init: (world) => new Invites(world),
  actions: { decline: Invites.prototype.decline },
  Invites, find, invite, takeInvite,
};
