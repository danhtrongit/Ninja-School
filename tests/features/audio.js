'use strict';

// Âm thanh: danh sách file gửi máy khách, phục vụ file âm thanh theo Range (Safari cần 206 để phát <audio>)
const fs = require('fs');
const path = require('path');
const http = require('http');
const { ok, PORT } = require('../lib/harness');
const audio = require('../../src/server/modules/audio');

function audioUnitTests() {
  console.log('Âm thanh (kiểm tra đơn vị): danh sách file, bảng gắn');
  const out = {};
  audio.hooks.clientData(out);
  const a = out.audio;
  ok(a && Array.isArray(a.have.music) && Array.isArray(a.have.sfx) && Array.isArray(a.m4a.sfx), 'clientData gửi danh sách file nhạc/tiếng đang có');
  ok(a.MUSIC_THEME.village_fire && a.SKILL_SFX.k0 && a.BOSS_SFX.quake && a.EVENT_SFX.hit, 'clientData gửi bảng gắn theme/kỹ năng/boss/sự kiện → file');
  ok(a.have.sfx.every((id) => /^[a-z0-9_]+$/.test(id)), 'id file âm thanh chỉ gồm a-z, 0-9, _');
}

function get(p, headers) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

async function audioHttpTest() {
  console.log('Âm thanh: phục vụ file theo Range');
  const dir = path.join(__dirname, '../../src/client/audio/music');
  const file = path.join(dir, 'zz_range_test.ogg');
  const made = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true });
  const data = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
  fs.writeFileSync(file, data);
  try {
    const full = await get('/audio/music/zz_range_test.ogg');
    ok(full.status === 200 && full.body.length === 1000 && full.headers['accept-ranges'] === 'bytes' && full.headers['content-type'] === 'audio/ogg', 'tải cả file âm thanh: 200, có Accept-Ranges, đúng kiểu');
    const part = await get('/audio/music/zz_range_test.ogg', { Range: 'bytes=10-19' });
    ok(part.status === 206 && part.body.equals(data.subarray(10, 20)) && part.headers['content-range'] === 'bytes 10-19/1000', 'Range bytes=10-19: 206 đúng 10 byte');
    const tail = await get('/audio/music/zz_range_test.ogg', { Range: 'bytes=-5' });
    ok(tail.status === 206 && tail.body.equals(data.subarray(995)), 'Range bytes=-5: 5 byte cuối');
    const open = await get('/audio/music/zz_range_test.ogg', { Range: 'bytes=990-' });
    ok(open.status === 206 && open.body.length === 10, 'Range bytes=990-: tới hết file');
    const bad = await get('/audio/music/zz_range_test.ogg', { Range: 'bytes=5000-' });
    ok(bad.status === 416, 'Range ngoài file: 416');
  } finally {
    fs.rmSync(file, { force: true });
    if (made) fs.rmSync(path.join(__dirname, '../../src/client/audio'), { recursive: true, force: true });
  }
}

module.exports = { audioUnitTests, audioHttpTest };
