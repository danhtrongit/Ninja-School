'use strict';

// Lệnh quản trị (tài khoản trong ADMINS): /lv /item /plus /tp /xu /boss /mail /code /sukien /arena...
const { ITEMS, UPGRADE } = require('../../../shared/data/items');
const { MAPS } = require('../../../shared/data/maps');
const { MONSTERS } = require('../../../shared/data/monsters');
const { PET } = require('../../../shared/data/pets');
const { MAIL } = require('../../../shared/data/extras');
const { MAX_LEVEL } = require('../../../shared/constants');
const { int, own, refreshInfo } = require('../../core/util');
const { rewardItems, rewardLabel, normCode } = require('../mail');
const { find } = require('../invites');

class Admin {
  constructor(world) {
    this.world = world;
  }

  // Phần thưởng từ tham số lệnh admin: <xu> <lượng> [vật phẩm] [sl] [ngày]. Trả về chuỗi lỗi hoặc { xu, luong, items, days }
  adminReward(args) {
    const r = { xu: Math.max(0, Math.min(2e9, int(args[0], 0))), luong: Math.max(0, Math.min(1e6, int(args[1], 0))), items: [], days: 0 };
    const id = args[2];
    if (id && id !== '-') {
      if (!own(ITEMS, id)) return `Không có vật phẩm "${String(id).slice(0, 24)}".`;
      const def = ITEMS[id];
      const q = Math.max(1, Math.min(def.stack ? def.stack * MAIL.maxItems : MAIL.maxItems, int(args[3], 1)));
      r.items.push([id, q]);
      r.days = Math.max(0, Math.min(3650, int(args[4], 0)));
    }
    if (!r.xu && !r.luong && !r.items.length) return 'Phần thưởng trống.';
    return r;
  }

  // /mail <tên|all> <xu> <lượng> [vật phẩm] [sl] [ngày]: gửi thư quà (người offline nhận khi vào game)
  adminMail(p, args, sys) {
    const who = String(args[0] || '');
    if (!who) return sys('Cú pháp: /mail <tên|all> <xu> <lượng> [vật phẩm] [sl] [ngày]');
    const r = this.adminReward(args.slice(1));
    if (typeof r === 'string') return sys(r);
    const M = this.world.mail;
    const base = { from: 'Ban Quản Trị', title: 'Quà từ Ban Quản Trị', body: 'Cảm ơn ngươi đã đồng hành cùng làng Ninja. Hãy nhận quà đính kèm nhé!', xu: r.xu, luong: r.luong };
    const items = rewardItems(r);
    const label = rewardLabel(r, items);
    if (who.toLowerCase() === 'all') {
      let ok = 0;
      let full = 0;
      for (const c of Object.values(this.world.db.chars)) {
        // mỗi người một bản sao món đồ (không dùng chung đối tượng)
        if (M.sendItems(c, base, items.map((it) => JSON.parse(JSON.stringify(it))))) ok++;
        else full++;
      }
      return sys(`Đã gửi thư (${label}) tới ${ok} nhân vật${full ? `, ${full} hộp thư đầy` : ''}.`);
    }
    const c = M.charOf(who);
    if (!c) return sys(`Không tìm thấy nhân vật "${who.slice(0, 16)}".`);
    if (!M.sendItems(c, base, items)) return sys(`Hộp thư của ${c.name} đã đầy quà chưa nhận.`);
    return sys(`Đã gửi thư (${label}) tới ${c.name}${this.world.byName.has(c.name.toLowerCase()) ? '' : ' (đang offline)'}.`);
  }

  // /code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ] [lượt]: giftcode tạm thời; /code: danh sách; /code xoa <MÃ>
  adminCode(p, args, sys) {
    const M = this.world.mail;
    const now = Date.now();
    if (!args[0]) {
      const mc = M.adminCodes();
      const list = Object.keys(mc).map((k) => `${k} (${rewardLabel(mc[k].reward)}; còn ${Math.ceil((mc[k].until - now) / 3600000)} giờ; đã dùng ${mc[k].used || 0}${mc[k].max ? `/${mc[k].max}` : ''})`);
      return sys(list.length ? `Giftcode tạm: ${list.join(' | ')}` : 'Chưa có giftcode tạm. Cú pháp: /code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ=24] [lượt]');
    }
    if (args[0].toLowerCase() === 'xoa') {
      const code = normCode(args[1]);
      return sys(M.delCode(code) ? `Đã xóa giftcode ${code}.` : 'Không có giftcode tạm này.');
    }
    const code = normCode(args[0]);
    const r = this.adminReward(args.slice(1, 5));
    if (typeof r === 'string') return sys(r);
    const hours = Math.max(1, Math.min(24 * 90, int(args[5], 24)));
    const max = Math.max(0, Math.min(1e6, int(args[6], 0)));
    const def = { reward: { xu: r.xu, luong: r.luong, items: r.items }, until: now + hours * 3600000, max, used: 0, by: p.name, note: 'Quà Ban Quản Trị' };
    const e = M.addCode(code, def);
    if (e) return sys(e);
    return sys(`Đã tạo giftcode ${code}: ${rewardLabel(def.reward)}; hết hạn sau ${hours} giờ${max ? `, tối đa ${max} lượt` : ''}.`);
  }

  // Lệnh admin (chat đã kiểm tra quyền)
  command(p, cmd, args, sys) {
    const n = int(args[0], 0);
    switch (cmd.toLowerCase()) {
      case 'lv': {
        const target = Math.max(1, Math.min(MAX_LEVEL, n));
        const diff = target - p.c.level;
        p.c.level = target;
        p.c.exp = 0;
        if (diff > 0) {
          p.c.potential += diff * 5;
          p.c.skillPoints += diff;
        }
        p.recalc();
        p.c.hp = p.s.maxHp;
        p.c.mp = p.s.maxMp;
        p.checkLevelQuest();
        refreshInfo(p);
        return sys(`Cấp hiện tại: ${p.lv}`);
      }
      case 'item':
        if (!own(ITEMS, args[0] || '')) return sys('Không có vật phẩm này.');
        // /item <mã> [số lượng] [độ hiếm] [số ngày hạn dùng]
        p.addItem(args[0], Math.max(1, int(args[1], 1)), int(args[2], 0), Math.max(0, Math.min(3650, int(args[3], 0))));
        return sys('Đã thêm vật phẩm.');
      case 'hethan': {
        // kiểm thử: mọi món có hạn trên người hết hạn sau n giây (mặc định 2)
        const at = Date.now() + Math.max(0, Math.min(3600, int(args[0], 2))) * 1000;
        let k = 0;
        for (const it of [...Object.values(p.c.equip), ...p.c.inv]) if (it && it.exp) { it.exp = at; k++; }
        p.markInv();
        return sys(`${k} vật phẩm sẽ hết hạn sau ${Math.round((at - Date.now()) / 1000)} giây.`);
      }
      case 'plus': {
        const w = p.c.equip.weapon;
        if (!w) return sys('Chưa trang bị vũ khí.');
        w.p = Math.max(0, Math.min(UPGRADE.max, n));
        p.recalc();
        p.markInv();
        refreshInfo(p);
        return sys(`Vũ khí +${w.p}`);
      }
      case 'thu': {
        // kiểm thử thú cưng: /thu <cấp> [thân mật]
        const it = p.pet;
        if (!it) return sys('Chưa mang thú cưng.');
        it.plv = Math.max(1, Math.min(PET.maxLv, n || 1));
        it.pexp = 0;
        if (args[1] != null) it.love = Math.max(0, Math.min(PET.loveMax, int(args[1], it.love)));
        p.recalc();
        p.markInv();
        refreshInfo(p);
        return sys(`Thú cưng cấp ${it.plv}, thân mật ${it.love}.`);
      }
      case 'mail': return this.adminMail(p, args, sys);
      case 'sukien': return sys(this.world.season.setForce(args[0]));
      case 'arena': return this.world.arena.admin(p, args, sys);
      case 'code': return this.adminCode(p, args, sys);
      case 'xu': p.gainXu(n); return sys(`+${n} xu`);
      case 'luong': p.c.luong += n; p.markMe(); return sys(`+${n} lượng`);
      case 'tp':
        if (!own(MAPS, args[0] || '') || MAPS[args[0]].instance) return sys(`Bản đồ: ${Object.keys(MAPS).join(', ')}`);
        return this.world.changeMap(p, args[0], null);
      case 'boss':
        for (const map of Object.values(this.world.maps)) for (const m of map.monsters.values()) if (m.boss && m.dead) m.respawnAt = 0;
        return sys('Đã gọi boss.');
      case 'bosshp': {
        // kiểm thử: đặt máu boss trên bản đồ hiện tại còn n% (dưới 30% thì vào cuồng nộ)
        if (!p.map) return;
        const pct = Math.max(1, Math.min(100, n || 100));
        let k = 0;
        for (const m of p.map.monsters.values()) {
          if (!m.boss || m.dead) continue;
          m.hp = Math.max(1, Math.round((m.maxHp * pct) / 100));
          m.checkRage();
          k++;
        }
        return sys(`Đặt máu ${k} boss còn ${pct}%.`);
      }
      case 'event': {
        const ev = this.world.event;
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'stop') {
          if (!ev.cur) return sys('Không có sự kiện nào đang diễn ra.');
          ev.end('timeout');
          return sys('Đã kết thúc sự kiện.');
        }
        if (sub !== 'tathu') return sys('Dùng: /event tathu [boss] [bản đồ] hoặc /event stop');
        const e = ev.start(args[1] || null, args[2] || null);
        return sys(e || 'Đã gọi Tà Thú.');
      }
      case 'all': return this.world.announce(args.join(' '), 'world');
      case 'kick': {
        const o = find(this.world, args[0]);
        if (o) o.conn.close('Bạn đã bị quản trị viên mời ra.');
        return;
      }
      case 'mobs': return sys(Object.keys(MONSTERS).join(', '));
      default: return sys('Lệnh không tồn tại.');
    }
  }
}

module.exports = {
  name: 'admin',
  init: (world) => new Admin(world),
  Admin,
};
