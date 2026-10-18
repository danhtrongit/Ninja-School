'use strict';

// Công cụ phát triển: /dev/gallery chỉ mở khi DEV_TOOLS=1, gói devGallery chỉ trả ok cho admin; /api/status có commit; /api/metrics cần token
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { ok, sleep, PORT } = require('../lib/harness');

function get(port, p, headers) {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port, path: p, headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', () => resolve({ status: 0, body: '' }));
  });
}

// Đăng ký (hoặc đăng nhập) rồi hỏi devGallery; trả ok của máy chủ
function askGallery(port, u, pass = 'matkhau1') {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const done = (v) => { ws.close(); resolve(v); };
    const timer = setTimeout(() => done(null), 6000);
    let tried = false;
    ws.on('message', (raw) => {
      const m = JSON.parse(raw);
      if (m.t === 'data') ws.send(JSON.stringify({ t: 'register', u, p: pass }));
      if (m.t === 'err' && !tried) { tried = true; ws.send(JSON.stringify({ t: 'login', u, p: pass })); }
      if (m.t === 'auth') ws.send(JSON.stringify({ t: 'devGallery' }));
      if (m.t === 'devGallery') { clearTimeout(timer); done(m.ok); }
    });
    ws.on('error', () => done(null));
  });
}

async function devtoolsTest() {
  console.log('Công cụ phát triển: /dev/gallery, devGallery, /api/status, /api/metrics');
  // server chung của bộ test không bật DEV_TOOLS
  const off = await get(PORT, '/dev/gallery');
  ok(off.status === 404, `không đặt DEV_TOOLS → GET /dev/gallery 404 (${off.status})`);
  ok((await get(PORT, '/dev/gallery.html')).status === 404, 'không đặt DEV_TOOLS → mọi đường dẫn /dev/ đều 404');
  ok((await askGallery(PORT, 'devadm')) === false, 'không đặt DEV_TOOLS → devGallery từ admin vẫn ok: false');
  const st = JSON.parse((await get(PORT, '/api/status')).body || '{}');
  ok(st.ok === true && /^[0-9a-f]{40}$/.test(st.commit || '') && st.version.endsWith(`+${st.commit.slice(0, 7)}`), `/api/status có commit và version kèm mã commit (${st.version})`);
  ok((await get(PORT, '/api/metrics')).status === 404, '/api/metrics không có METRICS_TOKEN → 404');

  // server riêng có DEV_TOOLS=1, METRICS_TOKEN, GIT_SHA
  const port = PORT + 100;
  const sha = 'abcdef1234567890abcdef1234567890abcdef12';
  const os = require('os');
  const fs = require('fs');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-dev-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', '..', 'src', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: data, NS_TEST: '1', ADMINS: 'devadmin', DEV_TOOLS: '1', METRICS_TOKEN: 'tk123', GIT_SHA: sha, TATHU: '0', SEASON: '0' }, stdio: 'ignore',
  });
  try {
    for (let i = 0; i < 50 && (await get(port, '/api/status')).status !== 200; i++) await sleep(100);
    const on = await get(port, '/dev/gallery');
    ok(on.status === 200 && on.body.includes('id="gal-grid"') && on.body.includes('type="importmap"') && /\/js\/dev\/gallery\.js\?v=[0-9a-f]{8}/.test(on.body), 'đặt DEV_TOOLS → GET /dev/gallery 200, có import map và ?v= cho module');
    ok((await askGallery(port, 'thuongdan')) === false, 'devGallery từ tài khoản thường → ok: false');
    ok((await askGallery(port, 'devadmin')) === true, 'devGallery từ admin → ok: true');
    const st2 = JSON.parse((await get(port, '/api/status')).body || '{}');
    ok(st2.commit === sha && st2.version.endsWith('+abcdef1'), 'GIT_SHA đặt → /api/status.commit và version theo GIT_SHA');
    ok((await get(port, '/api/metrics')).status === 404, '/api/metrics sai token → 404');
    const mt = await get(port, '/api/metrics', { 'x-metrics-token': 'tk123' });
    const j = JSON.parse(mt.body || '{}');
    ok(mt.status === 200 && j.tick && Number.isFinite(j.tick.p95) && j.mem && j.mem.rss > 0 && j.save && j.loop, '/api/metrics đúng token → tick, save, loop, mem');
  } finally {
    srv.kill('SIGTERM');
    await sleep(300);
    fs.rmSync(data, { recursive: true, force: true });
  }
}

module.exports = { devtoolsTest };
