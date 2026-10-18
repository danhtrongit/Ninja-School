'use strict';

const { own } = require('./util');

// Bảng hành động: gói { t } của máy khách → handler(p, m) do module đăng ký.
// Bảng không có prototype và chỉ gọi khóa riêng (t = 'constructor', '__proto__'... không gọi hàm của Object).
class Router {
  constructor() {
    this.table = Object.create(null);
  }

  add(t, fn, self, owner) {
    if (typeof fn !== 'function') throw new Error(`Module ${owner}: hành động "${t}" không phải hàm`);
    if (own(this.table, t)) throw new Error(`Hành động "${t}" bị đăng ký trùng (${this.table[t].owner} và ${owner})`);
    this.table[t] = { fn, self, owner };
  }

  has(t) {
    return typeof t === 'string' && own(this.table, t);
  }

  handle(p, msg) {
    const e = this.has(msg.t) ? this.table[msg.t] : null;
    if (e) e.fn.call(e.self, p, msg);
  }
}

// { tên: Cls.prototype[tên] } cho các phương thức trùng tên hành động
function methods(Cls, ...names) {
  const out = {};
  for (const n of names) out[n] = Cls.prototype[n];
  return out;
}

module.exports = { Router, methods };
