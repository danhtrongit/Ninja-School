// Khởi động: kết nối, đăng nhập, chọn nhân vật, vòng lặp chính
import { Net } from './net.js';
import { S, store } from './store.js';
import { UI, h } from './ui.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { iconURL } from './icons.js';
import { TitleLogo, TitleScene, drawStage, elementIconURL, CLASS_STATS } from './titleart.js';

const $ = (s) => document.querySelector(s);
const net = new Net();
const ui = new UI(net);
const input = new Input();
const game = new Game(net, ui, input);
// Truy cập từ console/công cụ kiểm thử (tools/shot.js, test giao diện)
window.ninja = { game, ui, net, S };

let screen = 'login';
let mode = 'login';
let backdrop = null;
let pendingChar = null;
let wantAutoLogin = true;
let hudReady = false;
let selectedClass = 'kiem';
let lastChars = null;
let statusTimer = 0;
const logo = new TitleLogo($('#logo-cv'));

function show(name) {
  const prev = screen;
  screen = name;
  document.body.dataset.screen = name;
  $('#screen-login').classList.toggle('hidden', name !== 'login');
  $('#screen-chars').classList.toggle('hidden', name !== 'chars');
  $('#rotate-hint').classList.toggle('ingame', name === 'game');
  input.enabled = name === 'game';
  if (name === 'login' && prev !== 'login') logo.restart();
  if (name !== 'chars') hideDelete();
  if (name !== 'game') {
    game.active = false;
    game.leaveSession();
    ui.reset();
    hudReady = false;
  }
}

// ---------- Trạng thái máy chủ (đèn xanh / vàng / đỏ)
function setStatus(st, text) {
  const el = $('#server-status');
  el.className = `srv ${st}`;
  el.querySelector('.srv-txt').textContent = text;
}

function refreshStatus() {
  fetch('/api/status').then((r) => r.json()).then((s) => {
    if (!net.open) return;
    setStatus('on', `Máy chủ hoạt động · ${s.online} người online`);
    $('#server-status').title = `${s.accounts} tài khoản · phiên bản ${s.version || ''}`;
  }).catch(() => {});
}

// ---------- Kết nối
net.on('open', () => {
  setStatus('on', 'Đã kết nối máy chủ.');
  $('#overlay-conn').classList.add('hidden');
  refreshStatus();
  clearInterval(statusTimer);
  statusTimer = setInterval(() => {
    if (screen === 'login' && net.open) refreshStatus();
  }, 15000);
});

net.on('close', () => {
  setStatus('off', 'Mất kết nối máy chủ, đang thử lại...');
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
  if (!backdrop) backdrop = new TitleScene(m, 'v_fire');
  if (m.version) $('#ver').textContent = ` · v${m.version}`;
  const user = store('ns_user');
  const token = store('ns_token');
  if (wantAutoLogin && user && token) {
    wantAutoLogin = false;
    setStatus('on', 'Đang tự đăng nhập...');
    net.send('login', { u: user, token });
  }
  if (user) $('#in-user').value = user;
});

net.on('err', (m) => {
  if (screen === 'chars') $('#chars-err').textContent = m.msg;
  else $('#login-err').textContent = m.msg;
  document.querySelectorAll('.char-card .cc-go').forEach((b) => {
    b.disabled = false;
    b.textContent = 'VÀO GAME';
  });
  if (screen === 'login') refreshStatus();
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
function setMode(next) {
  mode = next;
  document.querySelectorAll('#screen-login .tab').forEach((x) => x.classList.toggle('on', x.dataset.tab === mode));
  $('#screen-login .lg-tabs').classList.toggle('reg', mode === 'register');
  $('#fld-pass2').classList.toggle('hidden', mode !== 'register');
  $('#in-pass').setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
  $('#btn-login').textContent = mode === 'register' ? 'ĐĂNG KÝ' : 'VÀO GAME';
  $('#login-err').textContent = '';
}
document.querySelectorAll('#screen-login .tab').forEach((t) => {
  t.onclick = () => setMode(t.dataset.tab);
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
  if (!net.open) $('#login-err').textContent = 'Chưa kết nối được máy chủ, vui lòng chờ...';
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

// ---------- Ảnh động xem trước (bục + nhân vật), vẽ ở độ phân giải thấp và phóng bằng CSS
const previews = new Set();
function stageCanvas(w, hgt, cls) {
  const cv = h('canvas', { class: cls || 'stage-cv', width: w, height: hgt });
  cv.style.setProperty('--cw', w);
  cv.style.setProperty('--ch', hgt);
  return cv;
}
function addPreview(cv, o) {
  const p = { cv, ctx: cv.getContext('2d'), o, hover: false, seed: o.seed || 0 };
  previews.add(p);
  return p;
}
function clearPreviews(kind) {
  for (const p of previews) if (!kind || p.o.kind === kind) previews.delete(p);
}

// Kịch bản hoạt ảnh xoay hướng cho ô xem trước lớn
const SHOW = [['idle', 1, 1.6], ['walk', 1, 1.8], ['attack', 1, 0.45], ['attack', 1, 0.45], ['idle', -1, 1.4], ['walk', -1, 1.8], ['jump', -1, 0.6], ['idle', 1, 0.8], ['attack', 1, 0.45]];
const SHOW_T = SHOW.reduce((s, x) => s + x[2], 0);

function tickPreviews(now) {
  const T = now / 1000;
  for (const p of previews) {
    if (!p.cv.isConnected) {
      previews.delete(p);
      continue;
    }
    const o = p.o;
    const cls = S.G.classes[o.cls];
    const st = { el: cls.element, cls: o.cls, gender: o.gender, name: o.name, look: o.look, weaponType: cls.weapon, t: T + p.seed * 0.37, rx: o.rx };
    if (o.kind === 'big') {
      let q = ((T - (o.t0 || 0)) % SHOW_T + SHOW_T) % SHOW_T;
      if (o.burst != null && T - o.burst < 0.9) {
        const k = (T - o.burst) / 0.45;
        st.anim = 'attack';
        st.atkP = Math.min(0.99, k % 1);
        st.dir = o.dir || 1;
      } else {
        for (const [anim, dir, d] of SHOW) {
          if (q < d) {
            st.anim = anim;
            st.dir = dir;
            o.dir = dir;
            if (anim === 'attack') st.atkP = Math.min(0.99, q / d);
            if (anim === 'jump') st.jy = Math.round(Math.sin((q / d) * Math.PI) * 10);
            break;
          }
          q -= d;
        }
      }
    } else if (o.kind === 'card') {
      const q = (T + p.seed * 2.3) % 9;
      st.anim = p.hover ? 'walk' : q > 6.2 && q < 7 ? 'attack' : 'idle';
      if (st.anim === 'attack') st.atkP = Math.min(0.99, (q - 6.2) / 0.4 % 1);
      st.dir = p.hover ? 1 : q > 7.5 ? -1 : 1;
    } else {
      st.anim = o.on || p.hover ? 'walk' : 'idle';
      st.dir = 1;
    }
    drawStage(p.ctx, p.cv.width, p.cv.height, st);
  }
}

// ---------- Chọn / tạo nhân vật
const IC = {
  pin: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 11' shape-rendering='crispEdges'%3E%3Cpath fill='%231a0a04' d='M2 0h5v1h1v1h1v4h-1v1h-1v2h-1v1h-1v1h-1v-1h-1v-1h-1v-2h-1v-1h-1v-4h1v-1h1z'/%3E%3Cpath fill='%23ff6a4a' d='M3 1h3v1h1v4h-1v2h-1v1h-1v-1h-1v-2h-1v-4h1z'/%3E%3Cpath fill='%23ffe0d0' d='M3 3h2v2h-2z'/%3E%3C/svg%3E",
  trash: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 11' shape-rendering='crispEdges'%3E%3Cpath fill='%23fff1dc' d='M3 0h4v1h3v2h-10v-2h3zM1 4h8v6h-1v1h-6v-1h-1zM3 5v4h1v-4zM6 5v4h1v-4z'/%3E%3C/svg%3E",
};
const STAT_ROWS = [['atk', 'Tấn công'], ['def', 'Phòng thủ'], ['rng', 'Tầm đánh'], ['diff', 'Độ khó']];

function renderChars(m) {
  lastChars = m;
  $('#acc-name').textContent = S.user || store('ns_user') || '';
  const list = $('#char-list');
  list.innerHTML = '';
  clearPreviews('card');
  $('#chars-err').textContent = '';
  const last = store('ns_last');
  m.chars.forEach((c, i) => {
    const cls = S.G.classes[c.cls];
    const el = S.G.elements[cls.element];
    const cv = stageCanvas(48, 54);
    const pv = addPreview(cv, { kind: 'card', cls: c.cls, gender: c.gender, name: c.name, look: c.look || { w: 0 }, seed: i, rx: 16 });
    const go = h('button', {
      class: 'btn primary cc-go', type: 'button',
      onclick: (e) => {
        e.stopPropagation();
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Đang vào...';
        $('#chars-err').textContent = '';
        net.send('selectChar', { name: c.name });
      },
    }, 'VÀO GAME');
    const card = h('div', { class: `char-card${c.name === last ? ' last' : ''}`, style: { '--el': el.color }, onmouseenter: () => { pv.hover = true; }, onmouseleave: () => { pv.hover = false; } },
      h('div', { class: 'cc-top' }, cv,
        h('span', { class: 'cc-lv' }, h('small', null, 'Lv'), c.level),
        c.name === last ? h('span', { class: 'cc-last' }, 'Chơi gần nhất') : null,
        h('button', { class: 'btn danger cc-del', type: 'button', title: 'Xóa nhân vật', 'aria-label': `Xóa ${c.name}`, onclick: (e) => { e.stopPropagation(); askDelete(c.name); } }, h('img', { src: IC.trash, alt: '' }))),
      h('div', { class: 'cc-name' }, c.name),
      h('div', { class: 'cc-meta' }, h('img', { class: 'el-ico', src: elementIconURL(cls.element), alt: '' }), h('span', null, cls.name), h('i', null, '·'), h('span', { class: 'el-name' }, `Hệ ${el.name}`)),
      h('div', { class: 'cc-map' }, h('img', { src: IC.pin, alt: '' }), S.G.maps[c.map] ? S.G.maps[c.map].name : ''),
      go);
    list.appendChild(card);
  });
  if (m.chars.length < m.max) {
    list.appendChild(h('div', { class: 'char-card new', role: 'button', tabindex: '0', onclick: () => openCreate(), onkeydown: (e) => { if (e.key === 'Enter') openCreate(); } },
      h('div', { class: 'cc-plus' }), h('b', null, 'Tạo nhân vật'), h('span', null, `Ô trống ${m.chars.length}/${m.max}`)));
  }
  list.classList.toggle('few', m.chars.length < 2);
  $('#char-create').classList.toggle('hidden', m.chars.length > 0);
  $('.chars-box').classList.remove('creating');
  $('#chars-title').textContent = 'Chọn Nhân Vật';
  if (!m.chars.length) openCreate();
}

function openCreate() {
  $('#char-create').classList.remove('hidden');
  $('.chars-box').classList.add('creating');
  $('#chars-title').textContent = 'Tạo Nhân Vật';
  $('#chars-err').textContent = '';
  $('#btn-cancel-create').classList.toggle('hidden', !(lastChars && lastChars.chars.length));
  renderClasses();
  if (matchMedia('(pointer: fine)').matches) $('#in-cname').focus();
}

let bigPreview = null;
function previewName() {
  return $('#in-cname').value.trim() || 'Ninja';
}

function renderClasses() {
  const box = $('#class-list');
  box.innerHTML = '';
  clearPreviews('mini');
  clearPreviews('big');
  const gender = $('#in-gender').value;
  const name = previewName();
  for (const k of Object.keys(S.G.classes)) {
    const c = S.G.classes[k];
    const el = S.G.elements[c.element];
    const cv = stageCanvas(30, 38, 'mini-cv');
    const pv = addPreview(cv, { kind: 'mini', cls: k, gender, name, look: { w: 0 }, seed: k.length, rx: 11, on: k === selectedClass });
    box.appendChild(h('div', {
      class: `class-card${k === selectedClass ? ' on' : ''}`, 'data-cls': k, style: { '--el': el.color }, role: 'button', tabindex: '0',
      onclick: () => selectClass(k), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectClass(k); } },
      onmouseenter: () => { pv.hover = true; }, onmouseleave: () => { pv.hover = false; },
    }, cv,
    h('b', null, c.name),
    h('span', { class: 'el' }, h('img', { src: elementIconURL(c.element), alt: '' }), el.name),
    h('span', { class: 'wp' }, h('img', { src: iconURL({ k: c.weapon, c: '#cfd8dc' }, 0), alt: '' }), c.melee ? 'Cận chiến' : 'Đánh xa')));
  }
  const cv = $('#cc-preview');
  bigPreview = addPreview(cv, { kind: 'big', cls: selectedClass, gender, name, look: { w: 0 }, rx: 18, t0: performance.now() / 1000 });
  updateClassInfo();
  syncGender();
}

function selectClass(k) {
  selectedClass = k;
  document.querySelectorAll('#class-list .class-card').forEach((el) => el.classList.toggle('on', el.dataset.cls === k));
  for (const p of previews) {
    if (p.o.kind === 'mini') p.o.on = p.o.cls === k;
    if (p.o.kind === 'big') {
      p.o.cls = k;
      p.o.burst = performance.now() / 1000;
    }
  }
  updateClassInfo();
}

function bars(v, max = 10) {
  const segs = [];
  for (let i = 0; i < max; i++) segs.push(h('i', { class: i < v ? 'f' : '' }));
  return segs;
}

function updateClassInfo() {
  const c = S.G.classes[selectedClass];
  const el = S.G.elements[c.element];
  const st = CLASS_STATS[selectedClass] || { atk: 5, def: 5, rng: 5, diff: 5 };
  const stage = $('#char-create');
  stage.style.setProperty('--el', el.color);
  const badge = $('#cc-badge');
  badge.innerHTML = '';
  badge.append(
    h('img', { class: 'el-ico', src: elementIconURL(c.element), alt: '' }),
    h('b', null, `Phái ${c.name}`),
    h('span', { class: 'el-name' }, `Hệ ${el.name}`),
    h('span', { class: 'wp' }, h('img', { src: iconURL({ k: c.weapon, c: '#cfd8dc' }, 0), alt: '' }), c.weaponName),
  );
  const desc = $('#class-desc');
  desc.innerHTML = '';
  desc.append(h('b', { class: 'cd-name' }, c.name), h('span', { class: `cd-role ${c.melee ? 'melee' : 'ranged'}` }, c.melee ? 'Cận chiến' : 'Đánh xa'), ' ', c.desc);
  $('#class-tip').textContent = `${st.tip || ''} Khởi đầu tại ${S.G.maps[c.village].name}.`;
  const sb = $('#class-stats');
  sb.innerHTML = '';
  for (const [k, label] of STAT_ROWS) sb.appendChild(h('div', { class: `stat s-${k}` }, h('span', null, label), h('div', { class: 'segs' }, bars(st[k]))));
}

function syncGender() {
  const g = $('#in-gender').value;
  document.querySelectorAll('#gender-tg .g-btn').forEach((b) => {
    const on = b.dataset.g === g;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  $('#gender-tg').classList.toggle('f', g === 'f');
  for (const p of previews) if (p.o.kind === 'mini' || p.o.kind === 'big') p.o.gender = g;
}

document.querySelectorAll('#gender-tg .g-btn').forEach((b) => {
  b.onclick = () => {
    $('#in-gender').value = b.dataset.g;
    syncGender();
  };
});
$('#in-gender').onchange = () => syncGender();

let nameTimer = 0;
$('#in-cname').addEventListener('input', () => {
  const v = $('#in-cname').value;
  const bad = v && !/^[A-Za-z0-9_]*$/.test(v);
  const hint = $('#cname-hint');
  hint.classList.toggle('bad', !!bad);
  hint.textContent = bad ? 'Tên chỉ gồm chữ không dấu, số hoặc _' : 'Chữ, số hoặc _ · Ngoại hình (tóc, mắt, da) thay đổi theo tên';
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    const n = previewName();
    for (const p of previews) if (p.o.kind === 'mini' || p.o.kind === 'big') p.o.name = n;
  }, 180);
});
$('#in-cname').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btn-create').click();
});
$('#cc-preview').addEventListener('click', () => {
  if (bigPreview) bigPreview.o.burst = performance.now() / 1000;
});

$('#btn-cancel-create').onclick = () => {
  $('#char-create').classList.add('hidden');
  $('.chars-box').classList.remove('creating');
  $('#chars-title').textContent = 'Chọn Nhân Vật';
  $('#chars-err').textContent = '';
};
$('#btn-create').onclick = () => {
  const name = $('#in-cname').value.trim();
  $('#chars-err').textContent = '';
  net.send('createChar', { name, cls: selectedClass, gender: $('#in-gender').value });
};

// ---------- Hộp xác nhận xóa nhân vật
let delName = null;
function askDelete(name) {
  delName = name;
  $('#del-name').textContent = name;
  $('#in-del').value = '';
  $('#del-dlg').classList.remove('hidden');
  $('#in-del').focus();
}
function hideDelete() {
  delName = null;
  $('#del-dlg').classList.add('hidden');
}
$('#btn-del-no').onclick = hideDelete;
$('#btn-del-yes').onclick = () => {
  const v = $('#in-del').value.trim();
  if (delName && v) net.send('deleteChar', { name: delName, confirm: v });
  hideDelete();
};
$('#in-del').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btn-del-yes').click();
  if (e.key === 'Escape') hideDelete();
});
$('#del-dlg').addEventListener('click', (e) => {
  if (e.target.id === 'del-dlg') hideDelete();
});

// ---------- Kích thước logo theo màn hình (phóng nguyên lần cho sắc nét)
function fitLogo() {
  const cv = $('#logo-cv');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const side = vh <= 560 && vw > vh;
  const maxW = side ? Math.min(vw * 0.5, vw - 380) : vw * 0.94;
  const maxH = side ? vh * 0.6 : vh * (vh < 700 ? 0.27 : 0.31);
  // phóng nguyên lần theo điểm ảnh thiết bị để luôn sắc nét
  const k = Math.max(1, Math.min(12, Math.floor(Math.min((maxW * dpr) / cv.width, (maxH * dpr) / cv.height))));
  cv.style.width = `${(cv.width * k) / dpr}px`;
  cv.style.height = `${(cv.height * k) / dpr}px`;
}
// Tỉ lệ phóng các ô xem trước: chọn bội số nguyên theo điểm ảnh thiết bị
function fitPreviews() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const short = window.innerHeight <= 560;
  const narrow = window.innerWidth <= 560;
  // khớp với "zoom: 1.25" của khung trên màn hình lớn (screens.css)
  const z = window.innerHeight >= 900 && window.innerWidth >= 1300 ? 1.25 : 1;
  const k = (css) => Math.max(1, Math.round(css * z * dpr)) / dpr / z;
  const root = document.documentElement.style;
  root.setProperty('--k-big', k(short ? 3.5 : narrow ? 4 : 5));
  root.setProperty('--k-card', k(short || narrow ? 2.5 : 4));
  root.setProperty('--k-mini', k(short ? 1.5 : 2));
}
function onResize() {
  fitLogo();
  fitPreviews();
}
window.addEventListener('resize', onResize);
onResize();

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
    if (screen === 'login') logo.draw(now);
    else if (S.G) tickPreviews(now);
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
  backdrop.draw(game, dt);
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
