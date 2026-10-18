'use strict';

const { Router } = require('./router');
const { own } = require('./util');

// Danh sách module tính năng (src/server/modules/index.js) và các điểm móc giữa lõi và module.
// Mỗi module: { name, init?(world) → đối tượng (world.mods[name]), actions?: { t: handler(p, m) },
//   npcs?: { loại: { open(p, n), act?(p, n, a, m) } }, hooks?: { tên: fn | { order, fn } }, expose?: 'tên' }.
// handler/hook chạy với this = đối tượng của module (không có init thì là chính module).
// Nạp muộn lúc dùng lần đầu: module require lõi (core/player, core/map...) nên lõi không require module lúc nạp file.

// Móc "tĩnh": không cần thế giới, luôn chạy (kể cả Player trong thế giới giả của kiểm thử)
//   stats(t)               cộng chỉ số vào bảng tạm của Player.recalc
//   kill(p, monsterKey)    người chơi được tính một lần hạ quái (tiến độ nhiệm vụ)
//   sanitize(c)            dọn dữ liệu nhân vật lúc tải
//   selfData(p, d, now)    thêm trường vào gói 'me'
//   clientData(out)        thêm dữ liệu tĩnh vào gói 'data'
// Móc "thế giới": chỉ chạy khi có world.mods (thế giới thật)
//   join(p), leave(p) (trước khi rời bản đồ), left(p) (sau khi đã lưu vị trí),
//   beforeEnterMap(p, map) (trước khi rời bản đồ cũ), mapLeft(p, map) (đã rời bản đồ cũ, chưa vào map),
//   enterMap(p) (sau khi đã vào),
//   second(now), playerSecond(p, now), tick(now, tickN), update(dt, now), sendState(),
//   rank(), monsterKilled(owner, m), charDeleted(c)
const STATIC_HOOKS = ['stats', 'kill', 'sanitize', 'selfData', 'clientData'];
const WORLD_HOOKS = ['join', 'leave', 'left', 'beforeEnterMap', 'mapLeft', 'enterMap', 'second', 'playerSecond', 'tick', 'update', 'sendState', 'rank', 'monsterKilled', 'charDeleted'];
const KNOWN = new Set([...STATIC_HOOKS, ...WORLD_HOOKS]);

let reg = null;

function load() {
  if (reg) return reg;
  const list = require('../modules');
  const hooks = Object.create(null);
  const npcs = Object.create(null);
  const names = new Set();
  for (const mod of list) {
    if (!mod || typeof mod.name !== 'string' || !mod.name) throw new Error('Module thiếu tên');
    if (names.has(mod.name)) throw new Error(`Module trùng tên: ${mod.name}`);
    names.add(mod.name);
    for (const [k, h] of Object.entries(mod.hooks || {})) {
      if (!KNOWN.has(k)) throw new Error(`Module ${mod.name}: điểm móc lạ "${k}"`);
      const fn = typeof h === 'function' ? h : h && h.fn;
      if (typeof fn !== 'function') throw new Error(`Module ${mod.name}: điểm móc "${k}" không phải hàm`);
      (hooks[k] = hooks[k] || []).push({ mod, fn, order: (h && h.order) || 0 });
    }
    for (const [type, h] of Object.entries(mod.npcs || {})) {
      if (own(npcs, type)) throw new Error(`NPC "${type}" bị đăng ký trùng (${npcs[type].mod.name} và ${mod.name})`);
      npcs[type] = { mod, open: h.open, act: h.act };
    }
  }
  // sắp ổn định: cùng order thì giữ thứ tự trong danh sách module
  for (const k in hooks) hooks[k].sort((a, b) => a.order - b.order);
  reg = { list, hooks, npcs };
  return reg;
}

const self = (world, mod) => (world && world.mods && world.mods[mod.name]) || mod;

// Tạo đối tượng các module cho thế giới và bảng hành động (trùng tên hành động / NPC thì báo lỗi ngay khi khởi động)
function initWorld(world) {
  const { list } = load();
  world.mods = {};
  for (const mod of list) {
    if (!mod.init) continue;
    const inst = mod.init(world);
    world.mods[mod.name] = inst;
    if (mod.expose) world[mod.expose] = inst;
  }
  const router = new Router();
  for (const mod of list) for (const [t, fn] of Object.entries(mod.actions || {})) router.add(t, fn, self(world, mod), mod.name);
  return router;
}

// Móc tĩnh
function call(name, ...args) {
  const hs = load().hooks[name];
  if (hs) for (const h of hs) h.fn.apply(h.mod, args);
}

// Móc thế giới
function emit(world, name, ...args) {
  if (!world || !world.mods) return;
  const hs = load().hooks[name];
  if (hs) for (const h of hs) h.fn.apply(self(world, h.mod), args);
}

// Xử lý NPC theo loại: { open, act, self } hoặc null
function npcHandler(world, type) {
  const { npcs } = load();
  if (typeof type !== 'string' || !own(npcs, type)) return null;
  const h = npcs[type];
  return { open: h.open, act: h.act, self: self(world, h.mod) };
}

module.exports = { load, initWorld, call, emit, npcHandler };
