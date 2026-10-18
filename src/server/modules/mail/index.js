'use strict';

// Hộp thư hệ thống và giftcode. Thư nằm trong dữ liệu nhân vật (c.mail) nên người chơi offline vẫn nhận được,
// lần vào game sau sẽ thấy. Đính kèm là món đồ đầy đủ (giữ độ hiếm, hạn dùng, ngọc, cấp thú).
const { ITEMS, makeItem, cleanGems, cleanPet } = require('../../../shared/data/items');
const { MAIL, GIFTCODES, CODE_LIMIT } = require('../../../shared/data/extras');

const DAY = 86400000;
const XU_MAX = 2e9;
const LUONG_MAX = 1e6;
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);
// giữ xuống dòng trong nội dung thư, bỏ ký tự điều khiển khác và dấu < >
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, '').trim().slice(0, n);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
// ngày 'YYYY-MM-DD' theo giờ Việt Nam → mốc ms (end: hết ngày đó)
const vnTime = (d, end) => {
  const t = Date.parse(`${d}T00:00:00+07:00`);
  return Number.isFinite(t) ? t + (end ? DAY : 0) : NaN;
};
const CODE_RE = /^[A-Z0-9]{4,20}$/;
// mã do người chơi gõ: bỏ khoảng trắng, gạch nối; không phân biệt hoa thường
const normCode = (raw) => String(raw == null ? '' : raw).toUpperCase().replace(/[\s-]/g, '').slice(0, 32);

// Mã tĩnh trong extras.js: tra bằng Map (khóa từ máy khách không chạm Object.prototype)
const CODES = new Map(Object.entries(GIFTCODES).map(([k, v]) => [k.toUpperCase(), {
  ...v, start: v.from ? vnTime(v.from) : 0, end: v.until ? vnTime(v.until, true) : Infinity,
}]));

// Phần thưởng { xu, luong, items: [[id, sl]], days } → danh sách món (chồng quá giới hạn thì tách; days chỉ áp cho trang bị)
function rewardItems(r) {
  const out = [];
  for (const [id, q] of (r && r.items) || []) {
    const def = own(ITEMS, id) ? ITEMS[id] : null;
    if (!def) continue;
    let left = Math.max(1, q | 0);
    if (def.stack) {
      while (left > 0) {
        const n = Math.min(left, def.stack);
        out.push(makeItem(id, n));
        left -= n;
      }
    } else {
      for (let i = 0; i < left; i++) out.push(makeItem(id, 1, 0, r.days || 0));
    }
  }
  return out;
}

const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
// "Bình Sinh Lực Vừa x10, Rương Báu" (gộp các chồng cùng loại)
function itemsLabel(items) {
  const sum = new Map();
  for (const it of items) sum.set(it.id, (sum.get(it.id) || 0) + (it.q || 1));
  return [...sum].map(([id, q]) => `${ITEMS[id].name}${q > 1 ? ` x${q}` : ''}`).join(', ');
}
function rewardLabel(r, items) {
  const parts = [];
  if (r.xu) parts.push(`${fmt(r.xu)} xu`);
  if (r.luong) parts.push(`${fmt(r.luong)} lượng`);
  const its = items || rewardItems(r);
  if (its.length) parts.push(itemsLabel(its));
  return parts.join(', ');
}

const hasGift = (m) => !m.got && (m.xu > 0 || m.luong > 0 || m.items.length > 0);

// Dọn hộp thư lúc tải nhân vật / trước khi gửi: bỏ thư hỏng, thư quá hạn giữ, món lạ hoặc hết hạn dùng
function cleanMailbox(list, now = Date.now()) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const m of list) {
    if (!m || typeof m !== 'object' || !(m.at > now - MAIL.keepDays * DAY)) continue;
    const items = (Array.isArray(m.items) ? m.items : [])
      .filter((it) => it && typeof it === 'object' && typeof it.id === 'string' && own(ITEMS, it.id) && !(it.exp && it.exp <= now))
      .slice(0, MAIL.maxItems)
      .map((it) => {
        it.q = Math.max(1, int(it.q, 1));
        cleanGems(it);
        if (ITEMS[it.id].slot === 'pet') cleanPet(it);
        return it;
      });
    out.push({
      id: Math.max(1, int(m.id, 1)), at: +m.at, from: clean(m.from, 24) || 'Hệ thống', title: clean(m.title, MAIL.titleLen) || 'Thư',
      body: clean(m.body, MAIL.bodyLen), xu: Math.max(0, Math.min(XU_MAX, int(m.xu))), luong: Math.max(0, Math.min(LUONG_MAX, int(m.luong))),
      items, read: !!m.read, got: !!m.got,
    });
  }
  return out.slice(-MAIL.max);
}

// Số thư chưa đọc / còn quà chưa nhận (gửi trong gói 'me' để hiện chấm đỏ trên nút Thư)
function mailSummary(list) {
  let n = 0;
  let g = 0;
  for (const m of list || []) {
    if (!m.read) n++;
    if (hasGift(m)) g++;
  }
  return { n, g };
}

class Mailer {
  constructor(world) {
    this.world = world;
    // số lần nhập sai giftcode theo tài khoản / IP: khóa → { n, t }
    this.fails = new Map();
  }

  online(c) {
    const p = this.world.byName && c && c.name ? this.world.byName.get(c.name.toLowerCase()) : null;
    return p && p.c === c ? p : null;
  }

  // Dữ liệu nhân vật theo tên (đang online thì lấy bản đang chơi)
  charOf(name) {
    const key = String(name || '').toLowerCase();
    const p = this.world.byName ? this.world.byName.get(key) : null;
    if (p) return p.c;
    return this.world.db ? this.world.db.getChar(key) : null;
  }

  // Số thư còn bỏ thêm được (thư không còn quà sẽ bị đẩy ra khi hộp đầy)
  room(c) {
    c.mail = cleanMailbox(c.mail);
    return MAIL.max - c.mail.filter(hasGift).length;
  }

  // Bỏ một thư vào hộp thư của nhân vật c (online hoặc offline). Hộp đầy thì bỏ thư cũ nhất đã đọc và không còn quà;
  // toàn thư còn quà thì trả về false (người gọi tự xử lý, không làm mất quà)
  deliver(c, m) {
    if (!c) return false;
    // dọn cả hộp thư của người offline (thư quá hạn giữ)
    c.mail = cleanMailbox(c.mail);
    const box = c.mail;
    while (box.length >= MAIL.max) {
      let i = box.findIndex((x) => x.read && !hasGift(x));
      if (i < 0) i = box.findIndex((x) => !hasGift(x));
      if (i < 0) return false;
      box.splice(i, 1);
    }
    c.mailSeq = Math.max(int(c.mailSeq), ...box.map((x) => x.id)) + 1;
    const mail = {
      id: c.mailSeq, at: Date.now(), from: clean(m.from, 24) || 'Hệ thống', title: clean(m.title, MAIL.titleLen) || 'Thư',
      body: clean(m.body, MAIL.bodyLen), xu: Math.max(0, Math.min(XU_MAX, int(m.xu))), luong: Math.max(0, Math.min(LUONG_MAX, int(m.luong))),
      items: (m.items || []).filter((it) => it && own(ITEMS, it.id)).slice(0, MAIL.maxItems), read: false, got: false,
    };
    box.push(mail);
    if (this.world.db) this.world.db.dirty = true;
    const p = this.online(c);
    if (p) {
      p.markMe();
      p.notice(`Bạn có thư mới: ${mail.title}`, hasGift(mail) ? 'reward' : 'info');
    }
    return true;
  }

  // Gửi thư kèm nhiều món: tách thành nhiều thư (mỗi thư tối đa MAIL.maxItems món). Không đủ chỗ cho tất cả thì không gửi gì
  sendItems(c, base, items) {
    if (!c) return false;
    const chunks = [];
    for (let i = 0; i < items.length; i += MAIL.maxItems) chunks.push(items.slice(i, i + MAIL.maxItems));
    if (!chunks.length) chunks.push([]);
    if (this.room(c) < chunks.length) return false;
    chunks.forEach((its, k) => this.deliver(c, {
      ...base, items: its, xu: k ? 0 : base.xu, luong: k ? 0 : base.luong,
      title: chunks.length > 1 ? `${clean(base.title, MAIL.titleLen - 6)} (${k + 1}/${chunks.length})` : base.title,
    }));
    return true;
  }

  // ---------- Thao tác của người chơi
  list(p) {
    p.c.mail = cleanMailbox(p.c.mail);
    p.send('mail', { list: p.c.mail.slice().reverse(), max: MAIL.max, keep: MAIL.keepDays });
    p.markMe();
  }

  find(p, m) {
    const id = int(m && m.id, -1);
    return (p.c.mail || []).find((x) => x.id === id) || null;
  }

  read(p, m) {
    const x = this.find(p, m);
    if (!x || x.read) return;
    x.read = true;
    p.markMe();
    if (this.world.db) this.world.db.dirty = true;
  }

  // Nhận quà đính kèm của một thư. Trả về 'ok' | 'full' | 'busy' | null (không có quà)
  claimOne(p, x, quiet) {
    if (!x || !hasGift(x)) return null;
    if (p.trade) {
      if (!quiet) p.notice('Đang giao dịch.', 'warn');
      return 'busy';
    }
    const now = Date.now();
    const items = x.items.filter((it) => own(ITEMS, it.id) && !(it.exp && it.exp <= now));
    if (!p.canAddItems(items)) {
      if (!quiet) p.notice('Hành trang không đủ chỗ trống để nhận quà. Hãy dọn bớt rồi nhận lại.', 'warn');
      return 'full';
    }
    if (x.xu) p.gainXu(x.xu);
    if (x.luong) p.c.luong += x.luong;
    for (const it of items) p.addItemObj(it);
    x.got = true;
    x.read = true;
    p.markMe();
    p.markInv();
    if (this.world.db) this.world.db.dirty = true;
    if (!quiet) p.notice(`Đã nhận quà: ${rewardLabel({ xu: x.xu, luong: x.luong }, items) || 'thư trống'}.`, 'reward');
    return 'ok';
  }

  claim(p, m) {
    const now = Date.now();
    if (now - (p.lastMailAct || 0) < 150) return;
    p.lastMailAct = now;
    const x = this.find(p, m);
    if (!x) return;
    if (this.claimOne(p, x, false)) this.list(p);
  }

  // Nhận lần lượt từ thư cũ nhất; dừng ở thư đầu tiên hành trang không chứa nổi
  claimAll(p) {
    const now = Date.now();
    if (now - (p.lastMailAct || 0) < 300) return;
    p.lastMailAct = now;
    let n = 0;
    let stop = null;
    for (const x of (p.c.mail || []).slice()) {
      const r = this.claimOne(p, x, true);
      if (r === 'ok') n++;
      else if (r) {
        stop = r;
        break;
      }
    }
    if (stop === 'busy') p.notice('Đang giao dịch.', 'warn');
    else if (stop === 'full') p.notice(n ? `Đã nhận quà từ ${n} thư. Hành trang đầy, còn thư chưa nhận.` : 'Hành trang không đủ chỗ trống để nhận quà.', 'warn');
    else p.notice(n ? `Đã nhận quà từ ${n} thư.` : 'Không còn quà nào để nhận.', n ? 'reward' : 'info');
    this.list(p);
  }

  del(p, m) {
    const x = this.find(p, m);
    if (!x) return;
    if (hasGift(x)) return p.notice('Hãy nhận quà đính kèm trước khi xóa thư.', 'warn');
    p.c.mail.splice(p.c.mail.indexOf(x), 1);
    if (this.world.db) this.world.db.dirty = true;
    this.list(p);
  }

  // Xóa mọi thư đã đọc và không còn quà
  delRead(p) {
    const before = (p.c.mail || []).length;
    p.c.mail = (p.c.mail || []).filter((x) => !x.read || hasGift(x));
    const n = before - p.c.mail.length;
    if (n && this.world.db) this.world.db.dirty = true;
    p.notice(n ? `Đã xóa ${n} thư đã đọc.` : 'Không có thư đã đọc nào để xóa.');
    this.list(p);
  }

  // ---------- Giftcode
  // Mã admin tạo bằng /code (lưu trong meta.json, hết hạn thì bị dọn)
  adminCodes() {
    const db = this.world.db;
    if (!db) return {};
    if (!db.meta.codes || typeof db.meta.codes !== 'object') db.meta.codes = {};
    const now = Date.now();
    for (const k of Object.keys(db.meta.codes)) {
      if (!(db.meta.codes[k].until > now)) {
        delete db.meta.codes[k];
        db.dirty = true;
      }
    }
    return db.meta.codes;
  }

  codeDef(code) {
    if (CODES.has(code)) return CODES.get(code);
    const mc = this.adminCodes();
    if (!own(mc, code)) return null;
    const d = mc[code];
    return { src: d, start: 0, end: d.until, lv: 1, reward: d.reward, max: d.max || 0, used: d.used || 0, note: d.note };
  }

  // Tạo mã tạm thời (admin). Trả về chuỗi lỗi hoặc null
  addCode(code, def) {
    if (!CODE_RE.test(code)) return 'Mã gồm 4-20 chữ in hoa hoặc số.';
    if (CODES.has(code)) return 'Trùng mã cố định trong extras.js.';
    const mc = this.adminCodes();
    mc[code] = def;
    this.world.db.dirty = true;
    return null;
  }

  delCode(code) {
    const mc = this.adminCodes();
    if (!own(mc, code)) return false;
    delete mc[code];
    this.world.db.dirty = true;
    return true;
  }

  // Số giây còn bị khóa nhập mã (0 = được thử)
  codeWait(keys, now) {
    let wait = 0;
    for (const [k, lim] of keys) {
      const f = this.fails.get(k);
      if (f && now - f.t < CODE_LIMIT.window && f.n >= lim) wait = Math.max(wait, Math.ceil((f.t + CODE_LIMIT.window - now) / 1000));
    }
    return wait;
  }

  // Ghi một lần nhập sai; trả về số lần còn được thử của tài khoản
  codeFail(keys, now) {
    if (this.fails.size > 5000) for (const [k, f] of this.fails) if (now - f.t >= CODE_LIMIT.window) this.fails.delete(k);
    let left = Infinity;
    for (const [k, lim] of keys) {
      let f = this.fails.get(k);
      if (!f || now - f.t >= CODE_LIMIT.window) f = { n: 0, t: now };
      f.n++;
      this.fails.set(k, f);
      left = Math.min(left, lim - f.n);
    }
    return Math.max(0, left);
  }

  // Mã đã dùng lưu theo tài khoản (accounts.json): xóa nhân vật rồi tạo lại cùng tên không nhập lại được
  accountCodes(p) {
    const db = this.world.db;
    const key = p.conn && p.conn.account ? String(p.conn.account).toLowerCase() : '';
    const acc = key && db && db.accounts && own(db.accounts, key) ? db.accounts[key] : null;
    if (!acc) return null;
    if (!Array.isArray(acc.codes)) acc.codes = [];
    return acc.codes;
  }

  redeem(p, m) {
    const now = Date.now();
    if (now - (p.lastCode || 0) < 400) return;
    p.lastCode = now;
    const res = (ok, msg, extra) => p.send('codeResult', { ok, msg, ...extra });
    const acc = p.conn && p.conn.account ? String(p.conn.account).toLowerCase() : p.name.toLowerCase();
    const keys = [[`a:${acc}`, CODE_LIMIT.fails], [`i:${(p.conn && p.conn.ip) || ''}`, CODE_LIMIT.ipFails]];
    const wait = this.codeWait(keys, now);
    if (wait) return res(false, `Nhập sai quá nhiều lần. Thử lại sau ${wait} giây.`, { wait });
    const code = normCode(m && m.code);
    if (!code) return res(false, 'Hãy nhập mã quà tặng.');
    const def = CODE_RE.test(code) ? this.codeDef(code) : null;
    if (!def) {
      const left = this.codeFail(keys, now);
      return res(false, left ? `Mã quà tặng không đúng. Còn ${left} lần thử trong phút này.` : 'Mã quà tặng không đúng. Tạm khóa nhập mã 1 phút.');
    }
    if (def.start > now) return res(false, 'Mã quà tặng chưa tới ngày sử dụng.');
    if (def.end <= now) return res(false, 'Mã quà tặng đã hết hạn.');
    if (p.lv < (def.lv || 1)) return res(false, `Cần đạt cấp ${def.lv} để dùng mã này.`);
    const accCodes = this.accountCodes(p);
    if (p.c.codes.includes(code)) return res(false, 'Ngươi đã dùng mã này rồi.');
    if (accCodes && accCodes.includes(code)) return res(false, 'Tài khoản này đã dùng mã này rồi (mỗi tài khoản một lần).');
    if (def.max && def.used >= def.max) return res(false, 'Mã quà tặng đã hết lượt sử dụng.');
    if (p.trade) return res(false, 'Đang giao dịch.');
    const r = def.reward || {};
    const items = rewardItems(r);
    const label = rewardLabel(r, items);
    let mailed = false;
    if (p.canAddItems(items)) {
      if (r.xu) p.gainXu(r.xu);
      if (r.luong) p.c.luong += r.luong;
      for (const it of items) p.addItemObj(it);
      p.markMe();
    } else {
      // hành trang không đủ chỗ: quà vào hộp thư
      const base = { from: 'Quà tặng', title: `Giftcode ${code}`, body: `Quà từ mã ${code}${def.note ? ` (${def.note})` : ''}. Hành trang không đủ chỗ nên quà được gửi qua thư.`, xu: r.xu, luong: r.luong };
      if (!this.sendItems(p.c, base, items)) return res(false, 'Hành trang và hộp thư đều đầy. Hãy dọn bớt rồi nhập lại.');
      mailed = true;
    }
    p.c.codes.push(code);
    if (p.c.codes.length > 300) p.c.codes.splice(0, p.c.codes.length - 300);
    if (accCodes) {
      accCodes.push(code);
      if (accCodes.length > 300) accCodes.splice(0, accCodes.length - 300);
    }
    if (def.src) def.src.used = (def.src.used || 0) + 1;
    if (this.world.db) this.world.db.dirty = true;
    return res(true, mailed ? `Nhập mã thành công! Hành trang đầy nên quà (${label}) đã được gửi vào hộp thư.` : `Nhập mã thành công! Nhận: ${label}.`, { code, mail: mailed });
  }
}

module.exports = {
  name: 'mail',
  expose: 'mail',
  init: (world) => new Mailer(world),
  actions: {
    mailList(p) { this.list(p); },
    mailRead(p, m) { this.read(p, m); },
    mailClaim(p, m) { this.claim(p, m); },
    mailClaimAll(p) { this.claimAll(p); },
    mailDel(p, m) { this.del(p, m); },
    mailDelRead(p) { this.delRead(p); },
    giftcode(p, m) { this.redeem(p, m); },
  },
  hooks: {
    // hộp thư (thư quá hạn giữ tự xóa), mã quà đã dùng
    sanitize: {
      order: 1,
      fn(c) {
        c.mail = cleanMailbox(c.mail);
        c.mailSeq = Math.max(Number.isFinite(c.mailSeq) ? Math.floor(c.mailSeq) : 0, ...c.mail.map((m) => m.id));
        c.codes = Array.isArray(c.codes) ? c.codes.filter((x) => typeof x === 'string' && x.length <= 20).slice(-300) : [];
      },
    },
    selfData: { order: 1, fn(p, d) { d.mail = mailSummary(p.c.mail); } },
    clientData(out) {
      out.mail = { max: MAIL.max, keep: MAIL.keepDays };
    },
    join(p) {
      const mb = mailSummary(p.c.mail);
      if (mb.n || mb.g) p.notice(mb.g ? `Bạn có ${mb.g} thư chứa quà chưa nhận. Mở Hộp Thư (nút phong thư trên menu) để nhận.` : `Bạn có ${mb.n} thư chưa đọc.`, mb.g ? 'reward' : 'info');
    },
  },
  Mailer, cleanMailbox, mailSummary, rewardItems, rewardLabel, hasGift, normCode, vnTime, CODES, CODE_RE,
};
