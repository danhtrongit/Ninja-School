'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lưu trữ JSON đơn giản: nạp toàn bộ vào RAM, ghi định kỳ (ghi file tạm rồi đổi tên để không hỏng dữ liệu).
class DB {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.accounts = this._load('accounts.json', {});
    this.chars = this._load('characters.json', {});
    this.clans = this._load('clans.json', {});
    this.meta = this._load('meta.json', { nextClanId: 1 });
    this.dirty = false;
  }

  _file(name) { return path.join(this.dir, name); }

  _load(name, def) {
    try {
      return JSON.parse(fs.readFileSync(this._file(name), 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') console.error(`[db] Không đọc được ${name}:`, e.message);
      return def;
    }
  }

  _write(name, data) {
    const f = this._file(name);
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, f);
  }

  // Sao lưu xoay vòng (giữ 12 bản gần nhất) để phòng file dữ liệu hỏng
  backup() {
    try {
      const dir = path.join(this.dir, 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
      for (const name of ['accounts.json', 'characters.json', 'clans.json', 'meta.json']) {
        const src = this._file(name);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, `${stamp}-${name}`));
      }
      const files = fs.readdirSync(dir).sort();
      const stamps = [...new Set(files.map((f) => f.split('-')[0]))];
      for (const old of stamps.slice(0, Math.max(0, stamps.length - 12))) {
        for (const f of files) if (f.startsWith(`${old}-`)) fs.unlinkSync(path.join(dir, f));
      }
    } catch (e) {
      console.error('[db] Lỗi sao lưu:', e.message);
    }
  }

  save() {
    try {
      this._write('accounts.json', this.accounts);
      this._write('characters.json', this.chars);
      this._write('clans.json', this.clans);
      this._write('meta.json', this.meta);
      this.dirty = false;
    } catch (e) {
      console.error('[db] Lỗi ghi dữ liệu:', e.message);
    }
  }

  static hash(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  createAccount(username, password) {
    const key = username.toLowerCase();
    if (this.accounts[key]) return null;
    const salt = crypto.randomBytes(16).toString('hex');
    this.accounts[key] = { username, salt, hash: DB.hash(password, salt), created: Date.now(), chars: [], tokens: {} };
    this.dirty = true;
    return this.accounts[key];
  }

  checkPassword(username, password) {
    const acc = this.accounts[username.toLowerCase()];
    if (!acc) return null;
    const h = DB.hash(password, acc.salt);
    if (!crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(acc.hash, 'hex'))) return null;
    return acc;
  }

  issueToken(acc) {
    const token = crypto.randomBytes(24).toString('hex');
    acc.tokens = acc.tokens || {};
    const now = Date.now();
    for (const k in acc.tokens) if (acc.tokens[k] < now) delete acc.tokens[k];
    const keys = Object.keys(acc.tokens);
    if (keys.length > 5) delete acc.tokens[keys[0]];
    acc.tokens[token] = now + 30 * 24 * 3600 * 1000;
    this.dirty = true;
    return token;
  }

  checkToken(username, token) {
    const acc = this.accounts[String(username).toLowerCase()];
    if (!acc || !acc.tokens || typeof token !== 'string') return null;
    const exp = acc.tokens[token];
    if (!exp || exp < Date.now()) return null;
    return acc;
  }

  // tên do người chơi/admin gõ: chỉ lấy khóa riêng của bảng ('__proto__', 'constructor' không trỏ vào Object.prototype)
  getChar(name) {
    const k = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.chars, k) ? this.chars[k] : null;
  }

  putChar(c) {
    this.chars[c.name.toLowerCase()] = c;
    this.dirty = true;
  }

  deleteChar(name) {
    delete this.chars[name.toLowerCase()];
    this.dirty = true;
  }

  newClanId() {
    const id = this.meta.nextClanId++;
    this.dirty = true;
    return String(id);
  }
}

module.exports = { DB };
