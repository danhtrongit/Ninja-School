'use strict';

// Bạn bè: kết bạn (qua lời mời), xóa, danh sách, báo online/offline
const { find, invite, takeInvite } = require('../invites');

class Friends {
  constructor(world) {
    this.world = world;
  }

  friendAdd(p, m) {
    const o = find(this.world, m.name);
    if (!o || o === p) return p.notice('Người chơi không online.');
    if (p.c.friends.some((n) => n.toLowerCase() === o.name.toLowerCase())) return p.notice(`${o.name} đã là bạn bè.`);
    if (p.c.friends.length >= 50) return p.notice('Danh sách bạn bè đã đầy (50).');
    invite(p, o, 'friend');
    p.notice(`Đã gửi lời mời kết bạn tới ${o.name}.`);
  }

  friendAccept(p, m) {
    const o = find(this.world, m.from);
    if (!o || !takeInvite(p, 'friend', m.from)) return p.notice('Lời mời đã hết hạn.');
    for (const [a, b] of [[p, o], [o, p]]) {
      if (!a.c.friends.some((n) => n.toLowerCase() === b.name.toLowerCase()) && a.c.friends.length < 50) a.c.friends.push(b.name);
      a.notice(`${b.name} và bạn đã trở thành bạn bè!`, 'reward');
      this.friendList(a);
    }
    this.world.db.touch(p.name);
    this.world.db.touch(o.name);
  }

  friendDel(p, m) {
    const name = String(m.name || '').toLowerCase();
    p.c.friends = p.c.friends.filter((n) => n.toLowerCase() !== name);
    const o = find(this.world, name);
    const c = o ? o.c : this.world.db.getChar(name);
    if (c) c.friends = (c.friends || []).filter((n) => n.toLowerCase() !== p.name.toLowerCase());
    if (o) this.friendList(o);
    this.world.db.touch(p.name);
    if (c) this.world.db.touch(c.name);
    this.friendList(p);
  }

  friendList(p) {
    const list = p.c.friends.map((name) => {
      const o = find(this.world, name);
      if (o) return { name: o.name, lv: o.lv, cls: o.c.cls, map: o.map ? o.map.def.name : '', online: true };
      const c = this.world.db.getChar(name);
      return c ? { name: c.name, lv: c.level, cls: c.cls, map: '', online: false } : null;
    }).filter(Boolean).sort((a, b) => b.online - a.online || b.lv - a.lv);
    p.send('friends', { list });
  }
}

module.exports = {
  name: 'friends',
  init: (world) => new Friends(world),
  actions: {
    friendAdd: Friends.prototype.friendAdd,
    friendAccept: Friends.prototype.friendAccept,
    friendDel: Friends.prototype.friendDel,
    friendList: Friends.prototype.friendList,
  },
  hooks: {
    join: {
      order: 1,
      fn(p) {
        for (const name of p.c.friends) {
          const o = find(this.world, name);
          if (o) o.send('chat', { ch: 'sys', msg: `Bạn bè ${p.name} đã online.` });
        }
      },
    },
    leave: {
      order: 1,
      fn(p) {
        for (const name of p.c.friends) {
          const o = find(this.world, name);
          if (o) o.send('chat', { ch: 'sys', msg: `Bạn bè ${p.name} đã offline.` });
        }
      },
    },
  },
  Friends,
};
