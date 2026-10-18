'use strict';

// Sự kiện Tà Thú Xuất Thế: boss sự kiện xuất hiện theo lịch ở một bãi luyện công,
// cả máy chủ cùng đánh, thưởng theo bảng xếp hạng sát thương.
const { MAPS, GROUND } = require('../data/maps');
const { MONSTERS } = require('../data/monsters');
const { SKILLS } = require('../data/skills');
const { ITEMS, makeItem } = require('../data/items');
const { TATHU } = require('../data/extras');

const HOUR = 3600 * 1000;
const vnDate = (now) => new Date(now + 7 * HOUR);
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Thời điểm (ms) của lượt sự kiện kế tiếp sau now theo lịch giờ Việt Nam
function nextTathuAt(now) {
  const d = vnDate(now);
  let t = now - ((d.getUTCMinutes() * 60 + d.getUTCSeconds()) * 1000 + d.getUTCMilliseconds());
  for (let i = 0; i < 48; i++, t += HOUR) {
    const at = t + TATHU.minute * 60000;
    if (vnDate(t).getUTCHours() % TATHU.every === 0 && at > now) return at;
  }
  return now + TATHU.every * HOUR;
}

// Bãi luyện công hợp với cấp boss: trung bình cấp quái chênh không quá mapLv
function eventMaps(key) {
  const lv = MONSTERS[key].lv;
  return Object.values(MAPS).filter((m) => {
    if (m.town || m.pvp || m.instance || !m.spawns.length) return false;
    const lvs = m.spawns.map((s) => MONSTERS[s.m].lv);
    return Math.abs((Math.min(...lvs) + Math.max(...lvs)) / 2 - lv) <= TATHU.mapLv;
  }).map((m) => m.id);
}

// Mốc thưởng theo hạng (rank tính từ 1); null nếu không đủ % máu tối thiểu
function rewardTier(rank, pct) {
  if (pct < TATHU.minPct) return null;
  return TATHU.rewards.find((r) => r.to === 0 || rank <= r.to) || null;
}

const stoneOf = (lv) => (lv < 30 ? 'stone1' : lv < 60 ? 'stone2' : lv < 90 ? 'stone3' : 'stone4');
// Sách nội tại đúng phái, cấp yêu cầu theo cấp boss
function bookOf(cls, lv) {
  const req = lv < 45 ? 15 : lv < 80 ? 35 : 50;
  const sid = Object.keys(SKILLS).find((id) => SKILLS[id].cls === cls && SKILLS[id].type === 'passive' && SKILLS[id].req === req);
  return sid ? SKILLS[sid].book : null;
}

class BeastEvent {
  constructor(world) {
    this.world = world;
    this.cur = null;
    this.slot = '';
    this.warned = '';
  }

  enabled() {
    return this.world.config.tathu !== false;
  }

  info() {
    const c = this.cur;
    if (!c) return { k: 'tathu', on: false, title: TATHU.name, next: this.enabled() ? Math.max(0, nextTathuAt(Date.now()) - Date.now()) : 0 };
    const d = MONSTERS[c.key];
    return {
      k: 'tathu', on: true, title: TATHU.name, boss: c.key, name: d.name, lv: d.lv, id: c.m.id,
      map: c.map.id, mapName: c.map.def.name, x: Math.round(c.m.x), left: Math.max(0, c.until - Date.now()),
    };
  }

  // Gọi mỗi giây từ world.secondTick
  tick(now) {
    const c = this.cur;
    if (c && (now >= c.until || !c.map.monsters.has(c.m.id))) this.end(now >= c.until ? 'timeout' : 'gone');
    if (!this.enabled()) return;
    const d = vnDate(now);
    const h = d.getUTCHours();
    const mi = d.getUTCMinutes();
    const key = `${d.toISOString().slice(0, 10)}-${h}`;
    if (h % TATHU.every === 0 && mi === TATHU.minute && this.slot !== key) {
      this.slot = key;
      if (!this.cur) this.start();
    }
    // báo trước vài phút (lượt kế tiếp có thể rơi vào giờ sau)
    const soon = nextTathuAt(now) - now;
    const warnKey = String(nextTathuAt(now));
    if (soon <= TATHU.warn * 60000 && soon > (TATHU.warn - 1) * 60000 && this.warned !== warnKey && !this.cur) {
      this.warned = warnKey;
      this.world.announce(`${TATHU.name}: Tà Thú sẽ xuất hiện sau ${TATHU.warn} phút!`, 'boss');
    }
  }

  // Gọi boss sự kiện ra; key/mapId để trống thì chọn ngẫu nhiên. Trả về lỗi dạng chuỗi hoặc null.
  start(key, mapId) {
    if (this.cur) return 'Sự kiện đang diễn ra.';
    const bosses = TATHU.bosses.filter((k) => MONSTERS[k]);
    if (key && !bosses.includes(key)) return `Boss sự kiện: ${bosses.join(', ')}`;
    key = key || pick(bosses);
    const maps = eventMaps(key).filter((id) => this.world.maps[id]);
    if (mapId && !maps.includes(mapId)) return `Bản đồ hợp với ${key}: ${maps.join(', ')}`;
    mapId = mapId || pick(maps);
    if (!mapId) return 'Không có bản đồ phù hợp.';
    const map = this.world.maps[mapId];
    const x = this.pickX(map.def);
    const m = map.addMonster(key, { m: key, x1: x - 160, x2: x + 160, y: GROUND }, false);
    m.noRespawn = true;
    m.event = true;
    m.x = x;
    map.broadcast('mSpawn', m.pub());
    const now = Date.now();
    this.cur = { key, m, map, start: now, until: now + TATHU.dur };
    const d = MONSTERS[key];
    this.world.announce(`${TATHU.name}: ${d.name} (cấp ${d.lv}) đã xuất hiện tại ${map.def.name}! Hạ nó trong ${Math.round(TATHU.dur / 60000)} phút để nhận thưởng theo sát thương.`, 'boss');
    this.world.broadcastAll('event', this.info());
    return null;
  }

  // Chỗ đứng: giữa bản đồ, tránh xa cổng và boss cố định
  pickX(def) {
    const avoid = [...def.portals.map((p) => p.x), ...(def.boss || []).map((b) => b.x)];
    let best = def.w / 2;
    let bd = -1;
    for (let i = 0; i < 24; i++) {
      const x = Math.round(def.w * (0.28 + Math.random() * 0.44));
      const d = Math.min(...avoid.map((a) => Math.abs(a - x)), 1e9);
      if (d > bd) {
        bd = d;
        best = x;
      }
      if (d > 220) break;
    }
    return best;
  }

  // Kết thúc: hết giờ thì boss rời đi (kèm quái con), bị hạ thì onKill đã xử lý
  end(reason) {
    const c = this.cur;
    if (!c) return;
    this.cur = null;
    const d = MONSTERS[c.key];
    if (reason === 'timeout' && !c.m.dead) {
      const combat = this.world.combat;
      for (const o of [...c.map.monsters.values()]) if (o.master === c.m.id && !o.dead) combat.removeMonster(o);
      combat.removeMonster(c.m);
      this.world.announce(`${TATHU.name}: ${d.name} đã rời khỏi ${c.map.def.name}. Hẹn lần sau!`, 'world');
    }
    this.world.broadcastAll('event', this.info());
  }

  // Boss sự kiện bị hạ: xếp hạng sát thương, trao thưởng, gửi bảng kết quả
  onKill(m, owner) {
    const c = this.cur && this.cur.m === m ? this.cur : null;
    const d = m.def;
    const map = m.map;
    const ranking = [...m.dmgBy.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const total = ranking.reduce((s, [, v]) => s + v, 0) || 1;
    const rows = [];
    ranking.forEach(([name, dmg], i) => {
      const rank = i + 1;
      const pct = Math.round((dmg / m.maxHp) * 1000) / 10;
      const pl = this.world.byName.get(name.toLowerCase());
      const row = { rank, name, dmg: Math.round(dmg), pct, cls: pl ? pl.c.cls : null, reward: [] };
      rows.push(row);
      if (!pl) return;
      const raw = d.exp * (0.15 + dmg / total) * this.world.expEvent();
      const exp = pl.gainExp(raw);
      pl.petKillExp(raw);
      if (exp) row.reward.push(`${fmt(exp)} EXP`);
      const tier = rewardTier(rank, pct);
      if (tier) {
        if (tier.luong) {
          pl.c.luong += tier.luong;
          row.reward.push(`${tier.luong} lượng`);
        }
        if (tier.xu) {
          pl.gainXu(tier.xu * d.lv);
          row.reward.push(`${fmt(tier.xu * d.lv)} xu`);
        }
        const items = [...(tier.items || [])];
        if (tier.stone) items.push([stoneOf(d.lv), tier.stone]);
        if (tier.book) {
          const bk = bookOf(pl.c.cls, d.lv);
          if (bk) items.push([bk, tier.book]);
        }
        const tok = this.world.season ? this.world.season.eventBonus() : null;
        if (tok) items.push(tok);
        for (const [id, q] of items) this.give(pl, id, q, row);
      }
      pl.markMe();
      pl.onKill(m.k);
    });
    const took = c ? Math.round((Date.now() - c.start) / 1000) : 0;
    const top = rows.slice(0, 10).map(({ rank, name, dmg, pct, cls, reward }) => ({ rank, name, dmg, pct, cls, reward: reward.join(', ') }));
    const base = { title: TATHU.name, boss: m.k, name: d.name, map: map.id, mapName: map.def.name, took, count: rows.length, maxHp: m.maxHp, top };
    // gửi cho người tham gia (dù đã rời bản đồ) và người đang ở bản đồ
    const sent = new Set();
    const send = (pl, row) => {
      if (!pl || sent.has(pl)) return;
      sent.add(pl);
      pl.send('eventResult', { ...base, me: row ? { rank: row.rank, dmg: row.dmg, pct: row.pct, reward: row.reward.join(', ') } : null });
    };
    for (const row of rows) send(this.world.byName.get(row.name.toLowerCase()), row);
    for (const pl of map.players.values()) send(pl, null);
    const names = rows.slice(0, 3).map((r) => r.name).join(', ');
    this.world.announce(`${TATHU.name}: ${owner.name} đã kết liễu ${d.name} tại ${map.def.name}! Dẫn đầu sát thương: ${names}.`, 'boss');
    if (c) {
      this.cur = null;
      this.world.broadcastAll('event', this.info());
    }
  }

  give(pl, id, q, row) {
    if (!ITEMS[id]) return;
    const label = `${q > 1 ? `${q} ` : ''}${ITEMS[id].name}`;
    if (pl.addItem(id, q)) {
      row.reward.push(label);
      return;
    }
    // hành trang đầy: gửi vào hộp thư; hộp thư đầy quà thì gửi thủ kho (kho đầy thì giữ hộ, tự trả khi hành trang có chỗ).
    // Không thả ra đất vì quá thời gian giữ đồ người khác nhặt được
    const its = ITEMS[id].stack ? [makeItem(id, q)] : Array.from({ length: q }, () => makeItem(id, 1));
    row.reward.push(label);
    pl.markMe();
    const mail = this.world.mail;
    if (mail && mail.sendItems(pl.c, { from: TATHU.name, title: `Quà ${TATHU.name}`, body: `Phần thưởng hạng ${row.rank} khi hạ boss ${TATHU.name}. Hành trang đầy nên quà được gửi qua thư.` }, its)) {
      pl.notice(`Hành trang đầy: ${label} đã được gửi vào hộp thư.`, 'warn');
      return;
    }
    let to = 'storage';
    for (const it of its) if (pl.stashItem(it) === 'pending') to = 'pending';
    pl.notice(to === 'storage' ? `Hành trang đầy: ${label} đã được gửi vào thủ kho.` : `Hành trang và thủ kho đều đầy: ${label} sẽ tự vào hành trang khi có chỗ trống.`, 'warn');
  }
}

module.exports = { BeastEvent, nextTathuAt, eventMaps, rewardTier, bookOf };
