// Khởi động: kết nối, đăng nhập, chọn nhân vật, vòng lặp chính
import { Net } from './net.js';
import { S, store } from './store.js';
import { UI, h } from './ui.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { drawNinja } from './sprites.js';
import { MapRenderer } from './maprender.js';

const $ = (s) => document.querySelector(s);
const net = new Net();
const ui = new UI(net);
const input = new Input();
const game = new Game(net, ui, input);

let screen = 'login';
let mode = 'login';
let backdrop = null;
let backdropX = 0;
let pendingChar = null;
let wantAutoLogin = true;
let hudReady = false;
let selectedClass = 'kiem';

function show(name) {
  screen = name;
  $('#screen-login').classList.toggle('hidden', name !== 'login');
  $('#screen-chars').classList.toggle('hidden', name !== 'chars');
  $('#rotate-hint').classList.toggle('ingame', name === 'game');
  input.enabled = name === 'game';
  if (name !== 'game') {
    game.active = false;
    ui.reset();
    hudReady = false;
  }
}

// ---------- Kết nối
net.on('open', () => {
  $('#server-status').textContent = 'Đã kết nối máy chủ.';
  $('#overlay-conn').classList.add('hidden');
  fetch('/api/status').then((r) => r.json()).then((s) => {
    $('#server-status').textContent = `Máy chủ hoạt động · ${s.online} người online · ${s.accounts} tài khoản`;
  }).catch(() => {});
});

net.on('close', () => {
  $('#server-status').textContent = 'Mất kết nối máy chủ, đang thử lại...';
  if (screen === 'game') {
    $('#overlay-conn').classList.remove('hidden');
    pendingChar = S.me ? S.me.name : pendingChar;
  }
  wantAutoLogin = true;
  setTimeout(() => net.connect(), 2000);
});

net.on('data', (m) => {
  S.G = m;
  for (const k in m.monsters) m.monsters[k].k = k;
  if (!backdrop) backdrop = new MapRenderer(m.maps.v_fire);
  const user = store('ns_user');
  const token = store('ns_token');
  if (wantAutoLogin && user && token) {
    wantAutoLogin = false;
    net.send('login', { u: user, token });
  }
  if (user) $('#in-user').value = user;
});

net.on('err', (m) => {
  if (screen === 'chars') $('#chars-err').textContent = m.msg;
  else $('#login-err').textContent = m.msg;
  if (m.msg === 'Phiên đăng nhập hết hạn.') {
    store('ns_token', null);
    pendingChar = null;
    $('#overlay-conn').classList.add('hidden');
    show('login');
  }
});

net.on('auth', (m) => {
  S.user = m.user;
  store('ns_user', m.user);
  store('ns_token', m.token);
  $('#login-err').textContent = '';
});

net.on('chars', (m) => {
  if (pendingChar && m.chars.some((c) => c.name === pendingChar)) {
    net.send('selectChar', { name: pendingChar });
    pendingChar = null;
    return;
  }
  pendingChar = null;
  renderChars(m);
  show('chars');
});

net.on('enterMap', () => {
  $('#overlay-conn').classList.add('hidden');
  if (screen !== 'game') {
    show('game');
    store('ns_last', S.me.name);
  }
  if (!hudReady) {
    hudReady = true;
    ui.initHud(game);
  }
});

net.on('kicked', (m) => {
  pendingChar = null;
  wantAutoLogin = false;
  ui.toast(m.msg, 'warn');
  $('#login-err').textContent = m.msg;
  show('login');
});

// ---------- Màn hình đăng nhập
document.querySelectorAll('#screen-login .tab').forEach((t) => {
  t.onclick = () => {
    mode = t.dataset.tab;
    document.querySelectorAll('#screen-login .tab').forEach((x) => x.classList.toggle('on', x === t));
    $('#in-pass2').classList.toggle('hidden', mode !== 'register');
    $('#btn-login').textContent = mode === 'register' ? 'ĐĂNG KÝ' : 'VÀO GAME';
    $('#login-err').textContent = '';
  };
});

$('#login-form').onsubmit = (e) => {
  e.preventDefault();
  const u = $('#in-user').value.trim();
  const p = $('#in-pass').value;
  if (!u || !p) {
    $('#login-err').textContent = 'Nhập tài khoản và mật khẩu.';
    return;
  }
  if (mode === 'register') {
    if (p !== $('#in-pass2').value) {
      $('#login-err').textContent = 'Mật khẩu nhập lại không khớp.';
      return;
    }
    net.send('register', { u, p });
  } else net.send('login', { u, p });
};

$('#btn-logout').onclick = () => logout();
function logout() {
  store('ns_token', null);
  pendingChar = null;
  wantAutoLogin = false;
  if (net.ws) net.ws.close();
  show('login');
}
ui.onLogout = logout;
ui.onChangeChar = () => net.send('logoutChar');

// ---------- Chọn / tạo nhân vật
function previewCanvas(c, w = 24, hgt = 32, scale = 3) {
  const cv = document.createElement('canvas');
  cv.width = w * scale;
  cv.height = hgt * scale;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const cls = S.G.classes[c.cls];
  const draw = (t) => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawNinja(ctx, cv.width / 2, cv.height - 4 * scale, {
      dir: 1, cls: c.cls, gender: c.gender, look: c.look || { w: 0 }, anim: 'idle', t, name: c.name || 'x', el: cls.element, weaponType: cls.weapon, scale,
    });
  };
  draw(0);
  return cv;
}

function renderChars(m) {
  const list = $('#char-list');
  list.innerHTML = '';
  $('#chars-err').textContent = '';
  for (const c of m.chars) {
    const card = h('div', { class: 'char-card' }, previewCanvas(c),
      h('b', null, c.name), h('span', { class: 'muted' }, `Lv${c.level} · ${S.G.classes[c.cls].name}`), h('span', { class: 'tiny muted' }, S.G.maps[c.map] ? S.G.maps[c.map].name : ''),
      h('button', { class: 'btn primary', onclick: () => net.send('selectChar', { name: c.name }) }, 'Vào game'),
      h('button', { class: 'btn small danger', onclick: () => {
        const v = prompt(`Nhập "${c.name}" để xác nhận XÓA nhân vật vĩnh viễn:`);
        if (v) net.send('deleteChar', { name: c.name, confirm: v });
      } }, 'Xóa'));
    list.appendChild(card);
  }
  if (m.chars.length < m.max) {
    list.appendChild(h('div', { class: 'char-card new', onclick: () => openCreate() }, '+ Tạo mới'));
  }
  $('#char-create').classList.toggle('hidden', m.chars.length > 0);
  if (!m.chars.length) openCreate();
}

function openCreate() {
  $('#char-create').classList.remove('hidden');
  renderClasses();
  $('#in-cname').focus();
}

function renderClasses() {
  const box = $('#class-list');
  box.innerHTML = '';
  const gender = $('#in-gender').value;
  for (const k of Object.keys(S.G.classes)) {
    const c = S.G.classes[k];
    const el = S.G.elements[c.element];
    box.appendChild(h('div', { class: `class-card${k === selectedClass ? ' on' : ''}`, onclick: () => { selectedClass = k; renderClasses(); } },
      previewCanvas({ cls: k, gender, name: 'preview' }, 18, 24, 3), h('b', null, c.name), h('span', { class: 'el', style: { color: el.color } }, `Hệ ${el.name}`)));
  }
  const c = S.G.classes[selectedClass];
  $('#class-desc').textContent = `${c.name}: ${c.desc} Khởi đầu tại ${S.G.maps[c.village].name}.`;
}

$('#in-gender').onchange = () => renderClasses();
$('#btn-cancel-create').onclick = () => $('#char-create').classList.add('hidden');
$('#btn-create').onclick = () => {
  const name = $('#in-cname').value.trim();
  net.send('createChar', { name, cls: selectedClass, gender: $('#in-gender').value });
};

// ---------- Vòng lặp
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (screen === 'game') {
    game.update(dt);
    game.render();
    ui.frame();
  } else {
    drawBackdrop(dt);
  }
  requestAnimationFrame(loop);
}

function drawBackdrop(dt) {
  const ctx = game.ctx;
  const cv = game.canvas;
  if (!backdrop) {
    ctx.fillStyle = '#1a1226';
    ctx.fillRect(0, 0, cv.width, cv.height);
    return;
  }
  const W = game.W;
  const H = game.H;
  const c = game.lctx;
  backdropX += dt * 14;
  const span = Math.max(1, backdrop.map.w - W);
  const camX = Math.round(span / 2 + Math.sin(backdropX / 120) * span / 2);
  const camY = Math.max(0, Math.min(backdrop.map.h - H, backdrop.map.ground - H * 0.72));
  const t = backdropX / 14;
  backdrop.drawBackground(c, camX, camY, W, H, t);
  backdrop.drawTerrain(c, camX, camY, W, H);
  // vài ninja đi dạo
  for (let i = 0; i < 5; i++) {
    const cls = ['kiem', 'cung', 'quat', 'tieu', 'dao'][i];
    const x = ((i * 290 + t * 20 * (i % 2 ? 1 : -1)) % backdrop.map.w + backdrop.map.w) % backdrop.map.w;
    drawNinja(c, x - camX, backdrop.map.ground - camY, {
      dir: i % 2 ? 1 : -1, cls, gender: i % 3 ? 'm' : 'f', look: { w: i }, anim: 'walk', t: t + i, name: cls, el: S.G.classes[cls].element, weaponType: S.G.classes[cls].weapon,
    });
  }
  backdrop.drawParticles(c, camX, camY, W, H, dt);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(game.lo, 0, 0, W, H, 0, 0, W * game.zoom, H * game.zoom);
  ctx.fillStyle = 'rgba(10,6,18,0.35)';
  ctx.fillRect(0, 0, cv.width, cv.height);
}

setInterval(() => {
  if (screen === 'game') net.send('ping', { ts: performance.now() });
}, 5000);

document.addEventListener('click', (e) => {
  if (ui.itemPop && !ui.itemPop.contains(e.target) && !e.target.closest('.slot')) ui.hideItem();
  if (ui.menuEl && !ui.menuEl.contains(e.target) && e.target.id !== 'game') ui.hideMenu();
});

show('login');
net.connect();
requestAnimationFrame(loop);
