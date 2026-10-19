'use strict';

// Atlas ảnh ×3 (DESIGN_RULES mục 11): bộ kiểm atlas với ảnh hỏng mẫu, danh mục gửi máy khách, lưu đệm theo ?v=
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ok, PORT } = require('../lib/harness');
const { encodePng, decodePng } = require('../../tools/lib/png');
const { checkAtlas, MONSTER_ANIMS, OUTLINE } = require('../../tools/lib/atlas');
const { artIndex } = require('../../src/server/services/http');

const CLIENT = path.join(__dirname, '../../src/client');
const ANIMS = Object.keys(MONSTER_ANIMS);
const FW = 8;
const FH = 10;
const FOOT = 9;

// Atlas mẫu hợp lệ: mỗi khung một khối 4×6 (viền #1d1424, ruột đỏ) đứng sát đường chân → h = 6
function sample() {
  const n = Object.fromEntries(ANIMS.map((k) => [k, MONSTER_ANIMS[k][0]]));
  const cols = Math.max(...Object.values(n));
  const w = FW * cols;
  const hh = FH * ANIMS.length;
  const px = Buffer.alloc(w * hh * 4);
  const set = (x, y, c) => { const o = (y * w + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3] == null ? 255 : c[3]; };
  ANIMS.forEach((k, r) => {
    for (let f = 0; f < n[k]; f++) {
      for (let y = 3; y < FOOT; y++) {
        for (let x = 2; x < 6; x++) set(f * FW + x, r * FH + y, x === 2 || x === 5 || y === 3 || y === FOOT - 1 ? OUTLINE : [200, 40, 40]);
      }
    }
  });
  const meta = { fw: FW, fh: FH, foot: FOOT, h: 6, anims: {} };
  ANIMS.forEach((k, r) => { meta.anims[k] = { row: r, n: n[k], dur: 1, loop: k === 'idle' || k === 'walk' }; });
  meta.anims.atk.hitF = 4;
  return { w, hh, px, meta, set };
}

const errsOf = (s, opts) => checkAtlas(encodePng(s.w, s.hh, s.px), s.meta, opts);
const has = (errs, re) => errs.some((e) => re.test(e));

function artUnitTests() {
  console.log('Atlas ×3 (kiểm tra đơn vị): bộ kiểm atlas, danh mục ảnh');
  const good = sample();
  const png = encodePng(good.w, good.hh, good.px);
  const back = decodePng(png);
  ok(back.w === good.w && back.h === good.hh && Buffer.compare(Buffer.from(back.data), good.px) === 0, 'encodePng → decodePng giữ nguyên điểm ảnh');
  const e0 = errsOf(good);
  ok(e0.length === 0, `atlas mẫu hợp lệ không có lỗi${e0.length ? ': ' + e0.join('; ') : ''}`);

  const bad = (label, mutate, re, opts) => {
    const s = sample();
    mutate(s);
    const es = errsOf(s, opts);
    ok(has(es, re), `atlas hỏng (${label}) bị bắt: ${es.find((e) => re.test(e)) || es.join('; ') || 'không có lỗi'}`);
  };
  bad('thiếu khóa foot', (s) => { delete s.meta.foot; }, /thiếu khóa foot/);
  bad('thiếu hoạt ảnh die', (s) => { delete s.meta.anims.die; }, /thiếu hoạt ảnh die/);
  bad('walk 6 khung', (s) => { s.meta.anims.walk.n = 6; }, /walk: 6 khung, cần 8/);
  bad('atk không có hitF', (s) => { delete s.meta.anims.atk.hitF; }, /hitF/);
  bad('fw lẻ', (s) => { s.meta.fw = 7; }, /fw = 7 phải chẵn/);
  bad('h không chia hết cho 3', (s) => { s.meta.h = 7; }, /chia hết cho 3/);
  bad('h lệch hình đứng', (s) => { s.meta.h = 9; }, /khung idle 0\) 6 ≠ h = 9/);
  bad('khung trống', (s) => { for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) s.set(FW + x, FH + y, [0, 0, 0, 0]); }, /walk: khung 1 trống/);
  bad('pixel dưới đường chân', (s) => { s.set(3, FOOT, OUTLINE); }, /idle: khung 0 có pixel dưới chân/);
  bad('pixel bán trong suốt', (s) => { s.set(3, 5, [200, 40, 40, 128]); }, /bán trong suốt/);
  bad('viền ngoài sai màu', (s) => { s.set(2, 5, [0, 0, 0]); }, /viền ngoài không phải #1d1424/);
  bad('quá trần màu', (s) => { for (let i = 0; i < 4; i++) s.set(3 + (i % 2), 4 + (i >> 1), [10 * i, 100, 100]); }, /màu > trần 3/, { maxColors: 3 });
  bad('PNG quá cỡ', () => {}, /KB > trần 0.1KB/, { maxBytes: 100 });

  const idx = artIndex(CLIENT);
  const keys = Object.keys(idx).sort();
  ok(['boss/boss_god', 'monster/darkdragon', 'monster/deathknight', 'monster/hellhound'].every((k) => keys.includes(k)), `danh mục atlas có đủ 4 loài Cổng Địa Ngục (${keys.join(', ')})`);
  ok(keys.every((k) => /^[0-9a-f]{12}$/.test(idx[k].v) && idx[k].h > 0 && idx[k].h % 3 === 0), 'mỗi mục danh mục có v (băm png+json) và h chia hết cho 3');
  const meta = JSON.parse(fs.readFileSync(path.join(CLIENT, 'art/monster/hellhound.json'), 'utf8'));
  ok(idx['monster/hellhound'].h === meta.h, `chiều cao trong danh mục = h của atlas (${meta.h} → monsterHeight ${meta.h / 3})`);
  // loài đã có atlas ×3 không còn hình code riêng (biến thể VARIANT, bộ HUM): chỉ còn thân chung lúc atlas chưa tải
  const mon = path.join(CLIENT, 'js/render/monster');
  const variants = fs.readFileSync(path.join(mon, 'variants.js'), 'utf8');
  const hum = fs.readFileSync(path.join(mon, 'humanoid.js'), 'utf8');
  const left = keys.map((k) => k.split('/')[1]).filter((id) => new RegExp(`^\\s+(${id}:|.*\\b${id}: ')`, 'm').test(variants) || new RegExp(`^  ${id}: \\{`, 'm').test(hum));
  ok(!left.length, `hình code riêng của ${keys.length} loài có atlas đã bị xóa khỏi VARIANT và HUM${left.length ? ': còn ' + left.join(', ') : ''}`);
}

function get(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function artHttpTest(a) {
  console.log('Atlas ×3: gói data mang danh mục, phục vụ ảnh theo ?v=');
  const idx = artIndex(CLIENT);
  const e = a.data && a.data.art && a.data.art['monster/hellhound'];
  ok(e && e.v === idx['monster/hellhound'].v && e.h === idx['monster/hellhound'].h, 'gói data có art["monster/hellhound"] = { v, h } khớp danh mục máy chủ');
  const v = idx['monster/hellhound'].v;
  const r1 = await get(`/art/monster/hellhound.png?v=${v}`);
  ok(r1.status === 200 && /immutable/.test(r1.headers['cache-control'] || '') && r1.body.length === fs.statSync(path.join(CLIENT, 'art/monster/hellhound.png')).size, 'atlas xin đúng ?v= → 200, lưu đệm vĩnh viễn');
  const r2 = await get('/art/monster/hellhound.json?v=000000000000');
  ok(r2.status === 200 && r2.headers['cache-control'] === 'no-cache', 'atlas xin sai ?v= → no-cache (không giữ bản cũ)');
}

module.exports = { artUnitTests, artHttpTest };
