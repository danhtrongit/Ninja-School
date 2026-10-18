'use strict';

// Chat các kênh (bản đồ, thế giới, nhóm, gia tộc, mật) và lệnh gõ bằng '/'
const { clean } = require('../../core/util');
const { find } = require('../invites');
const { testMode } = require('../admin');

class Chat {
  constructor(world) {
    this.world = world;
  }

  chat(p, m) {
    const now = Date.now();
    const text = clean(m.msg, 140);
    if (!text) return;
    if (text[0] === '/') return this.command(p, text);
    if (now - p.lastChat < 800) return p.notice('Bạn chat quá nhanh.', 'warn');
    p.lastChat = now;
    const ch = String(m.ch || 'map');
    const base = { from: p.name, id: p.id, cls: p.c.cls, msg: text };
    switch (ch) {
      case 'world':
        if (p.lv < 5) return p.notice('Cần cấp 5 để chat thế giới.', 'warn');
        if (now - p.lastWorldChat < 8000) return p.notice('Kênh thế giới: chờ 8 giây giữa các tin.', 'warn');
        p.lastWorldChat = now;
        return this.world.broadcastAll('chat', { ch: 'world', ...base });
      case 'party':
        if (!p.party) return p.notice('Bạn chưa có nhóm.');
        return this.world.mods.party.partyBroadcast(p.party, 'chat', { ch: 'party', ...base });
      case 'clan':
        if (!p.c.clan) return p.notice('Bạn chưa có gia tộc.');
        return this.world.mods.clan.clanBroadcast(p.c.clan, 'chat', { ch: 'clan', ...base });
      case 'pm': {
        const o = find(this.world, m.to);
        if (!o) return p.notice('Người chơi không online.');
        o.send('chat', { ch: 'pm', ...base, to: o.name });
        return p.send('chat', { ch: 'pm', ...base, to: o.name });
      }
      default:
        if (p.map) p.map.broadcast('chat', { ch: 'map', ...base });
    }
  }

  command(p, text) {
    const [cmd, ...args] = text.slice(1).split(/\s+/);
    const isAdmin = this.world.config.admins.includes(p.conn.account.toLowerCase());
    const sys = (msg) => p.send('chat', { ch: 'sys', msg });
    const mods = this.world.mods;
    switch (cmd.toLowerCase()) {
      case 'help':
        sys('Lệnh: /w <tên> <tin> (mật), /p <tin> (nhóm), /g <tin> (gia tộc), /a <tin> (thế giới), /online, /moi <tên> (mời nhóm), /gd <tên> (giao dịch), /td <tên> (thách đấu), /xem <tên>');
        if (isAdmin) sys('Admin: /item <id> [sl] [hiếm] [ngày], /xu <n>, /luong <n>, /tp <map>, /boss, /event tathu [boss] [map] | /event stop, /all <tin>, /kick <tên>');
        if (isAdmin && testMode()) sys('Kiểm thử: /lv <n>, /hethan [giây], /plus <n> (cường hóa vũ khí), /thu <cấp> [thân mật] (thú cưng), /xuk <n>, /bosshp <%>, /chet, /tieunhi done|reset');
        if (isAdmin) sys('Admin: /mail <tên|all> <xu> <lượng> [vật phẩm] [sl] [ngày] (gửi thư quà), /code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ=24] [lượt] (tạo giftcode tạm), /code (danh sách), /code xoa <MÃ>, /sukien [mã mùa|tat|auto] (ép bật/tắt lễ hội), /arena [reward|elo <điểm>] (lôi đài: trao thưởng tuần ngay, đặt điểm)');
        return;
      case 'w': return this.chat(p, { ch: 'pm', to: args[0], msg: args.slice(1).join(' ') });
      case 'p': return this.chat(p, { ch: 'party', msg: args.join(' ') });
      case 'g': return this.chat(p, { ch: 'clan', msg: args.join(' ') });
      case 'a': return this.chat(p, { ch: 'world', msg: args.join(' ') });
      case 'online': return sys(`Đang online: ${this.world.players.size} người. ${[...this.world.players.values()].slice(0, 30).map((o) => `${o.name}(${o.lv})`).join(', ')}`);
      case 'moi': return mods.party.partyInvite(p, { name: args[0] });
      case 'gd': return mods.trade.tradeReq(p, { name: args[0] });
      case 'td': return mods.pk.duelReq(p, { name: args[0] });
      case 'xem': return mods.rank.inspect(p, { name: args[0] });
      default:
    }
    if (!isAdmin) return sys('Lệnh không tồn tại. Gõ /help');
    return mods.admin.command(p, cmd, args, sys);
  }
}

module.exports = {
  name: 'chat',
  init: (world) => new Chat(world),
  actions: { chat: Chat.prototype.chat },
  Chat,
};
