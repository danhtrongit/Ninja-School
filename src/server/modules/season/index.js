'use strict';

// Sự kiện theo mùa (SEASONS trong extras.js): quái rơi vật phẩm sự kiện, NPC Lễ Hội đổi quà theo bảng
const { SEASONS } = require('../../../shared/data/extras');
const { ITEMS, makeItem } = require('../../../shared/data/items');
const { vnTime, rewardItems, rewardLabel } = require('../mail');
const { nearNpc, dialog } = require('../../core/npc');
const { bind } = require('../../../shared/bound');

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

const LIST = SEASONS.map((s) => ({
  ...s, start: vnTime(s.from), end: vnTime(s.until, true),
  // tra dòng đổi quà bằng Map: id do máy khách gửi không chạm Object.prototype
  rows: new Map(s.exchange.map((e) => [e.id, e])),
}));

const seasonAt = (now) => LIST.find((s) => s.start <= now && now < s.end) || null;

// Gói dữ liệu tĩnh cho máy khách: mọi mùa trong cấu hình. Mùa nào đang chạy do server báo qua gói 'season'
function seasonClient() {
  return LIST.map((s) => ({
    id: s.id, name: s.name, desc: s.desc, token: s.token, start: s.start, end: s.end,
    exchange: s.exchange.map((e) => ({ id: e.id, cost: e.cost, limit: e.limit || 0, reward: e.reward, label: rewardLabel({ ...e.reward, xuk: e.reward.xu, xu: 0 }) })),
  }));
}

class Season {
  constructor(world) {
    this.world = world;
    // admin ép bật một mùa (id) hoặc tắt hẳn ('off'); null = theo lịch trong extras.js
    this.force = world.config && world.config.season === false ? 'off' : null;
    this.lastId = undefined;
  }

  cur(now = Date.now()) {
    if (this.force === 'off') return null;
    if (this.force) return LIST.find((s) => s.id === this.force) || null;
    return seasonAt(now);
  }

  // Gói 'season' gửi máy khách: mùa đang chạy (id) hoặc null
  info() {
    const s = this.cur();
    return { id: s ? s.id : null };
  }

  // Mỗi giây: mùa bắt đầu / kết thúc thì báo mọi người đang online (hiện / ẩn biểu ngữ)
  tick() {
    const s = this.cur();
    const id = s ? s.id : null;
    if (id === this.lastId) return;
    const first = this.lastId === undefined;
    this.lastId = id;
    if (first) return;
    this.world.broadcastAll('season', { id });
    if (s) this.world.announce(`Sự kiện ${s.name} bắt đầu! Săn quái nhặt ${ITEMS[s.token].name} rồi đổi quà ở Sứ Giả Lễ Hội trong làng.`, 'world');
    else this.world.announce('Mùa lễ hội đã khép lại. Hẹn gặp lại ở mùa hội sau!', 'world');
  }

  // Lệnh admin /sukien [id|tat|auto]
  setForce(arg) {
    const a = String(arg || '').toLowerCase();
    if (a === 'auto' || a === '') this.force = null;
    else if (a === 'tat' || a === 'off') this.force = 'off';
    else if (LIST.some((s) => s.id === a)) this.force = a;
    else return `Mùa lễ hội: ${LIST.map((s) => s.id).join(', ')} | tat | auto`;
    this.tick();
    const s = this.cur();
    return s ? `Lễ hội đang chạy: ${s.name}${this.force ? ' (ép bật)' : ''}.` : `Không có lễ hội nào${this.force === 'off' ? ' (ép tắt)' : ''}.`;
  }

  // Số lần đổi đã dùng trong mùa s (đổi mùa thì đếm lại)
  counts(c, s) {
    if (!c.season || c.season.id !== s.id) c.season = { id: s.id, ex: Object.create(null) };
    return c.season.ex;
  }

  // Quái bị hạ (không tính quái con, boss Tà Thú tính riêng): rơi vật phẩm sự kiện ra đất, thuộc về người hạ
  onKill(owner, m) {
    const s = this.cur();
    if (!s || !owner || !m.map) return;
    const dr = s.drop;
    let q = 0;
    if (m.boss) q = randInt(dr.boss[0], dr.boss[1]);
    else if (m.def.lv >= owner.lv - dr.lvGap && Math.random() < dr.rate) q = 1;
    if (q) m.map.dropItem(makeItem(s.token, q), 0, m.x + (Math.random() < 0.5 ? -8 : 8), m.onPlatform ? m.y : m.spawn.y, owner.name);
  }

  // Thưởng thêm cho người có hạng ở boss Tà Thú
  eventBonus() {
    const s = this.cur();
    return s && s.drop.event ? [s.token, randInt(s.drop.event[0], s.drop.event[1])] : null;
  }

  // Đổi quà ở NPC Lễ Hội: { npc, id, n } (n lần liền, 1-50)
  exchange(p, m, npc) {
    const now = Date.now();
    if (now - (p.lastSeasonEx || 0) < 200) return;
    p.lastSeasonEx = now;
    const s = this.cur(now);
    const res = (ok, msg) => p.send('seasonResult', { ok, msg, season: p.c.season });
    if (!s) return res(false, 'Lễ hội đã kết thúc.');
    if (!npc) return res(false, 'Hãy tới gần Sứ Giả Lễ Hội.');
    const id = typeof m.id === 'string' ? m.id : '';
    const row = s.rows.get(id);
    if (!row) return;
    if (p.trade) return res(false, 'Đang giao dịch.');
    const cnt = this.counts(p.c, s);
    const used = cnt[row.id] || 0;
    let n = Math.max(1, Math.min(50, int(m.n, 1)));
    if (row.limit) n = Math.min(n, row.limit - used);
    if (n <= 0) return res(false, 'Ngươi đã đổi hết lượt món quà này trong mùa lễ hội.');
    const tok = ITEMS[s.token].name;
    if (p.countItem(s.token) < row.cost * n) return res(false, `Không đủ ${tok}: cần ${row.cost * n}, đang có ${p.countItem(s.token)}.`);
    const r = row.reward;
    const items = rewardItems({ items: (r.items || []).map(([iid, q]) => [iid, q * n]), days: r.days });
    items.forEach(bind);
    // ô bánh trao hết cả chồng được tính là chỗ trống cho quà
    if (!p.canAddItems(items, [[s.token, row.cost * n]])) return res(false, 'Hành trang không đủ chỗ trống.');
    p.removeItem(s.token, row.cost * n);
    if (r.xu) p.gainXuk(r.xu * n);
    if (r.luong) p.c.luong += r.luong * n;
    for (const it of items) if (!p.addItemObj(it)) p.stashItem(it);
    cnt[row.id] = used + n;
    p.markMe();
    p.markInv();
    if (this.world.db) this.world.db.touch(p.name, true);
    const got = rewardLabel({ xuk: (r.xu || 0) * n, luong: (r.luong || 0) * n }, items);
    p.notice(`Đổi ${row.cost * n} ${tok} lấy ${got}.`, 'reward');
    return res(true, `Đã đổi: ${got}`);
  }
}

// Sứ Giả Lễ Hội: có mùa lễ hội thì mở cửa sổ đổi quà, hết mùa chỉ chào hỏi
function eventDialog(se, p, n) {
  const s = se.cur();
  if (!s) return dialog(p, n, 'Lễ hội đã khép lại rồi. Khi trăng lên mùa hội mới, ta sẽ lại mang quà về làng!');
  const left = Math.max(1, Math.ceil((s.end - Date.now()) / 86400000));
  const tok = ITEMS[s.token].name;
  return dialog(p, n, `【${s.name}】\n${s.desc}\n\nNgươi đang có ${p.countItem(s.token)} ${tok}. Lễ hội còn ${left} ngày.`, [
    { a: 'shop', label: 'Đổi quà lễ hội' },
  ]);
}

module.exports = {
  name: 'season',
  expose: 'season',
  init: (world) => new Season(world),
  actions: {
    seasonEx(p, m) { this.exchange(p, m, nearNpc(p, m.npc, 'event')); },
  },
  npcs: {
    event: {
      open(p, n) { eventDialog(this, p, n); },
      act(p, n, a) { if (a === 'shop' && this.cur()) return p.send('openUi', { ui: 'event', npc: n.id }); },
    },
  },
  hooks: {
    // số lần đổi quà sự kiện của mùa đang lưu
    sanitize: {
      order: 2,
      fn(c) {
        const ss = c.season && typeof c.season === 'object' ? c.season : {};
        const ex = Object.create(null);
        if (ss.ex && typeof ss.ex === 'object') for (const k of Object.keys(ss.ex)) if (Number.isFinite(ss.ex[k]) && ss.ex[k] > 0) ex[k] = Math.floor(ss.ex[k]);
        c.season = { id: typeof ss.id === 'string' ? ss.id.slice(0, 40) : '', ex };
      },
    },
    selfData: { order: 2, fn(p, d) { d.season = p.c.season; } },
    clientData(out) {
      out.seasons = seasonClient();
    },
    join(p) {
      const ss = this.cur();
      p.send('season', this.info());
      if (ss) p.send('chat', { ch: 'sys', msg: `Sự kiện ${ss.name} đang diễn ra! Săn quái nhặt ${ITEMS[ss.token] ? ITEMS[ss.token].name : ss.token} rồi đổi quà ở Sứ Giả Lễ Hội trong làng.` });
    },
    second: { order: 2, fn() { this.tick(); } },
    // vật phẩm sự kiện theo mùa (boss Tà Thú thưởng riêng theo hạng trong module events)
    monsterKilled(owner, m) {
      if (!m.event) this.onKill(owner, m);
    },
  },
  Season, seasonAt, seasonClient, SEASON_LIST: LIST,
};
