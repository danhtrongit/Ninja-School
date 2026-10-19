// Trang /dev/gallery (chỉ admin, máy chủ bật DEV_TOOLS=1): xem mọi hình vẽ bằng code ở mọi trạng thái cạnh nhau.
// ?shot=1: đóng băng thời gian theo ?t=, Math.random thay bằng mulberry32(1) (chỉ trong trang này), dựng mọi mục,
// đặt window.galleryHashes = { "<mục>/<khóa>": băm FNV-1a 32 bit của ImageData } và window.galleryReady = true.
// ?section=<mục>: chỉ dựng một mục (dùng cho tools/shot.js).
import { drawNinja, drawPortrait } from '../render/sprites.js';
import { drawMonster, prewarmMonsters, loadMonsterAtlas } from '../render/monsterart.js';
import { MapRenderer, THEMES, setLighting } from '../render/maprender.js';
import { FX } from '../render/fx.js';
import { iconCanvas, skillIconURL, uiIconURL } from '../render/icons.js';
import { drawPet, PET_KINDS } from '../render/petart.js';
import { SFX_IDS, renderSfx } from '../core/sound.js';
import { h } from '../ui/dom.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.get('shot') === '1';
const ONLY = Q.get('section');
let T0 = Number.isFinite(+Q.get('t')) ? +Q.get('t') : 0;
let SCALE = Math.max(1, Math.min(5, +Q.get('scale') || 2));

if (SHOT) {
  // mulberry32(1): mọi lần chạy cho cùng chuỗi số ngẫu nhiên
  let a = 1;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const $ = (s) => document.querySelector(s);
let G = null;

// ---------- Kết nối: nhận gói data, đăng nhập admin, xin quyền devGallery
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
const wait = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.t === 'data') {
    // như main.js: quái mang id của mình (biến thể hình, bộ HUM, atlas ×3 tra theo id)
    for (const k in m.monsters) m.monsters[k].k = k;
    G = m;
  }
  const f = wait.get(m.t);
  if (f) { wait.delete(m.t); f(m); }
  if (m.t === 'err') $('#gal-err').textContent = m.msg;
};
const next = (t) => new Promise((r) => wait.set(t, r));

$('#gal-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#gal-err').textContent = '';
  const auth = next('auth');
  ws.send(JSON.stringify({ t: 'login', u: $('#gal-user').value, p: $('#gal-pass').value }));
  await auth;
  const r = next('devGallery');
  ws.send(JSON.stringify({ t: 'devGallery' }));
  const ok = (await r).ok;
  if (!ok) { $('#gal-err').textContent = 'Tài khoản không có quyền xem thư viện hình.'; return; }
  $('#gal-login').classList.add('hidden');
  start();
});

// ---------- Ô vẽ
const CLS = ['kiem', 'tieu', 'kunai', 'cung', 'dao', 'quat'];
const ANIMS = [['idle', 4, 2.6], ['walk', 6, 12], ['jump', 2, 8], ['attack', 3, 0], ['dead', 1, 1]];
const EL_COL = { fire: '#ff7043', water: '#42a5f5', wind: '#66bb6a' };

function ninjaOpts(cls, gender, extra = {}) {
  const c = G.classes[cls];
  return { cls, gender, dir: 1, name: `gal_${cls}_${gender}`, el: c.element, weaponType: c.weapon, look: { w: 3, a: 3, p: 3, h: 3, wp: 0 }, ...extra };
}

// Mỗi mục: [id, tên, () => [{ key, w, h, zoom?, draw(ctx, t) | img: Promise<url> }] (hoặc Promise của danh sách)]
function sections() {
  const out = [];
  out.push(['char', 'Nhân vật', () => {
    const cells = [];
    for (const cls of CLS) for (const g of ['m', 'f']) for (const dir of [1, -1]) {
      for (const [anim, n, fps] of ANIMS) for (let f = 0; f < n; f++) {
        cells.push({ key: `${cls}-${g}-${dir > 0 ? 'r' : 'l'}-${anim}${f}`, w: 40, h: 44, draw: (c, t) => drawNinja(c, 20, 40, ninjaOpts(cls, g, { dir, anim, t: anim === 'attack' ? t : t + (fps ? f / fps + 0.01 : 0), atkP: anim === 'attack' ? (f + 0.5) / n : undefined })) });
      }
    }
    for (const cls of CLS) for (const g of ['m', 'f']) cells.push({ key: `${cls}-${g}-portrait`, w: 42, h: 42, draw: (c) => drawPortrait(c, ninjaOpts(cls, g)) });
    return cells;
  }]);
  out.push(['tier', 'Bậc trang bị', () => {
    const cells = [];
    for (let tier = 0; tier < 20; tier++) for (const cls of CLS) for (const anim of ['idle', 'walk', 'attack']) {
      cells.push({ key: `${tier}-${cls}-${anim}`, w: 40, h: 44, draw: (c, t) => drawNinja(c, 20, 40, ninjaOpts(cls, 'm', { anim, t: t + 0.05, atkP: 0.5, look: { w: tier, a: tier, p: tier, h: tier, wp: 0 } })) });
    }
    return cells;
  }]);
  out.push(['aura', 'Hào quang cường hóa', () => {
    const cells = [];
    for (const wp of [0, 5, 8, 11, 13, 15, 16]) for (const cls of ['kiem', 'kunai', 'quat']) for (const tier of [5, 12]) {
      cells.push({ key: `wp${wp}-${cls}-t${tier}`, w: 48, h: 52, draw: (c, t) => drawNinja(c, 24, 46, ninjaOpts(cls, 'm', { t: t + 0.3, look: { w: tier, a: tier, p: tier, h: tier, wp } })) });
    }
    return cells;
  }]);
  out.push(['fashion', 'Thời trang, thú cưỡi', () => {
    const cells = [];
    for (const [id, it] of Object.entries(G.items)) {
      if (!it.fashion || !it.look) continue;
      for (const anim of ['idle', 'walk']) for (const g of ['m', 'f']) {
        cells.push({ key: `${id}-${anim}-${g}`, w: 56, h: 60, draw: (c, t) => drawNinja(c, 28, 54, ninjaOpts('dao', g, { anim, t: t + 0.1, look: { w: 6, a: 6, p: 6, h: 6, wp: 0, [it.slot]: it.look } })) });
      }
    }
    return cells;
  }]);
  out.push(['mount', 'Cưỡi thú', () => {
    const cells = [];
    for (const [id, it] of Object.entries(G.items)) {
      if (it.slot !== 'mount' || !it.look) continue;
      for (const cls of CLS) for (const anim of ['idle', 'walk', 'jump']) for (const dir of [1, -1]) {
        cells.push({ key: `${id}-${cls}-${anim}-${dir > 0 ? 'r' : 'l'}`, w: 60, h: 64, draw: (c, t) => drawNinja(c, 30, 58, ninjaOpts(cls, 'm', { dir, anim, t: t + 0.1, look: { w: 8, a: 8, p: 8, h: 8, wp: 0, mount: it.look } })) });
      }
    }
    return cells;
  }]);
  out.push(['pet', 'Thú cưng', () => {
    const cells = [];
    for (const kind of PET_KINDS) for (const moving of [false, true]) for (const dir of [1, -1]) {
      cells.push({ key: `${kind}-${moving ? 'run' : 'idle'}-${dir > 0 ? 'r' : 'l'}`, w: 36, h: 36, draw: (c, t) => drawPet(c, 18, 30, kind, { t: t + 0.2, dir, moving, lv: 5, still: SHOT && !moving }) });
    }
    return cells;
  }]);
  out.push(['npc', 'NPC', () => Object.entries(G.npcTypes).flatMap(([type, nt]) => [1, -1].map((dir) => ({
    key: `${type}-${dir > 0 ? 'r' : 'l'}`, w: 40, h: 44,
    draw: (c, t) => drawNinja(c, 20, 40, { dir, anim: 'idle', t, pal: [nt.look[0], nt.look[2], nt.look[1]], noMask: true, name: `npc_${type}`, npcType: type, weaponType: null, look: { h: type === 'elder' ? 4 : -1 } }),
  })))]);
  out.push(['monster', 'Quái', () => {
    const defs = Object.entries(G.monsters);
    prewarmMonsters(defs.map(([, d]) => d));
    const cells = [];
    for (const [id, def] of defs) {
      const s = Math.max(1, Math.round(def.scale || 1));
      const w = Math.min(160, Math.max(36, (def.w || 16) * s + 16));
      const hh = Math.min(160, Math.max(36, (def.h || 16) * s + (def.fly ? 30 : 12)));
      const states = [['st0', { st: 0 }], ['st1', { st: 1 }], ['st2', { st: 2 }], ['hurt', { st: 0, flash: true }], ['left', { st: 1, dir: -1 }]];
      if (def.boss) states.push(['rage', { st: 2, rage: true }]);
      for (const [k, o] of states) cells.push({ key: `${id}-${k}`, w, h: hh, draw: (c, t) => drawMonster(c, w / 2, hh - 4, def, { t: t + 0.15, dir: 1, id: 7, ...o }) });
    }
    return cells;
  }]);
  // atlas ảnh ×3 (DESIGN_RULES mục 11): mọi khung của mọi hoạt ảnh, đúng pixel nghệ thuật (zoom 1)
  out.push(['atlas', 'Atlas ×3', async () => {
    const cells = [];
    for (const key of Object.keys(G.art || {}).sort()) {
      const def = G.monsters[key.split('/')[1]];
      const a = def ? await loadMonsterAtlas(G.art, def) : null;
      if (!a) { cells.push({ key, w: 16, h: 16, draw: () => {} }); continue; }
      const { fw, fh, anims } = a.meta;
      for (const [an, A] of Object.entries(anims)) {
        for (let f = 0; f < A.n; f++) {
          cells.push({ key: `${key}-${an}${f}`, w: fw, h: fh, zoom: 1, draw: (c) => c.drawImage(a.img, f * fw, A.row * fh, fw, fh, 0, 0, fw, fh) });
        }
      }
    }
    return cells;
  }]);
  out.push(['fx', 'Hiệu ứng', () => {
    const cells = [];
    const kinds = {
      slash: (f, c) => f.slash(60, 50, 1, c, true),
      proj: (f, c) => f.proj(10, 45, 110, 45, 0.6, c),
      burst: (f, c) => f.burst(60, 50, 34, c, true),
      wave: (f, c) => f.wave(20, 50, 1, 90, c, 0.5),
      rain: (f, c) => f.rain(60, 60, 40, 0.5, c, true),
      meteor: (f, c) => f.meteor(60, 60, 30, c),
      whirl: (f, c) => f.whirl(60, 55, 30, c, true),
      aura: (f, c) => f.aura(() => ({ x: 60, y: 60 }), c),
      heal: (f, c) => f.heal(() => ({ x: 60, y: 60 }), c),
      dash: (f, c) => f.dash(25, 95, 60, 1, c),
      sparks: (f, c) => f.sparks(60, 45, c, 16),
      levelUp: (f) => f.levelUp(() => ({ x: 60, y: 62 })),
      enhance: (f) => f.enhance(60, 55, true, 12),
      gemSocket: (f, c) => f.gemSocket(60, 45, c),
      bossQuake: (f, c) => f.bossSkill(60, 60, 'quake', c, 1),
      bossRoar: (f, c) => f.bossSkill(60, 60, 'roar', c, 1),
      bossSummon: (f, c) => f.bossSkill(60, 60, 'summon', c, 1),
      bossBeam: (f, c) => f.bossSkill(60, 60, 'beam', c, 1),
      bossNova: (f, c) => f.bossSkill(60, 60, 'nova', c, 1),
      telegraphCircle: (f, c) => f.telegraph(60, 60, 40, 1.5, c, 'circle'),
      telegraphLine: (f, c) => f.telegraph(10, 60, 100, 1.5, c, 'line'),
      telegraphPillar: (f, c) => f.telegraph(60, 60, 20, 1.5, c, 'pillar'),
    };
    for (const [k, fn] of Object.entries(kinds)) for (const [el, col] of Object.entries(EL_COL)) for (const at of [0.05, 0.18, 0.35]) {
      cells.push({
        key: `${k}-${el}-${at}`, w: 120, h: 72,
        draw: (c) => {
          const f = new FX();
          fn(f, col);
          for (let i = 0; i < Math.round(at * 60); i++) f.update(1 / 60);
          f.drawGround(c, 0, 0);
          f.draw(c, 0, 0);
        },
      });
    }
    return cells;
  }]);
  out.push(['theme', 'Theme bản đồ', () => {
    const cells = [];
    const base = Object.values(G.maps).find((m) => !m.town && !m.instance) || Object.values(G.maps)[0];
    for (const theme of Object.keys(THEMES)) {
      const real = Object.values(G.maps).find((m) => m.theme === theme);
      const map = real || { ...base, id: `gal_${theme}`, theme };
      for (const hour of [12, 22]) {
        cells.push({
          key: `${theme}-${hour}h`, w: 320, h: 120,
          draw: (c, t) => {
            setLighting(1);
            const R = new MapRenderer(map);
            const camX = Math.min(Math.max(0, map.w - 320), 160);
            const camY = map.ground - 96;
            R.drawBackground(c, camX, camY, 320, 120, t);
            R.drawTerrain(c, camX, camY, 320, 120);
            R.drawPortals(c, camX, camY, t);
            R.drawNight(c, camX, camY, 320, 120, hour, camX + 160, map.ground - 20);
            R.drawForeground(c, camX, camY, 320, 120, t);
            R.drawLighting(c, camX, camY, 320, 120, hour, camX + 160, map.ground - 20);
          },
        });
      }
    }
    return cells;
  }]);
  out.push(['icon', 'Icon vật phẩm', () => Object.entries(G.items).map(([id, it]) => ({ key: id, w: 24, h: 24, draw: (c) => c.drawImage(iconCanvas(it.icon, it.grade || 0, 24), 0, 0) }))]);
  out.push(['skill', 'Icon kỹ năng', () => Object.entries(G.skills).map(([sid, sk]) => ({ key: sid, w: 24, h: 24, img: skillIconURL(sk, sid, EL_COL[G.classes[sk.cls] && G.classes[sk.cls].element]) }))]);
  out.push(['ui', 'Icon giao diện', () => ['bag', 'char', 'skill', 'quest', 'party', 'friends', 'clan', 'rank', 'map', 'mail', 'festival', 'gift', 'wheel', 'settings', 'auto', 'pk', 'arena', 'chat', 'talk', 'pick', 'target', 'attack', 'close', 'beast', 'slow', 'path', 'xu', 'luong', 'pet', 'lock', 'xuk']
    .map((n) => ({ key: n, w: 16, h: 16, img: uiIconURL(n) }))]);
  return out;
}

// FNV-1a 32 bit của điểm ảnh
function fnv(data) {
  let x = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) { x ^= data[i]; x = Math.imul(x, 0x01000193); }
  return (x >>> 0).toString(16).padStart(8, '0');
}
const loadImg = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = url; });

let built = [];
async function renderCell(cell, cv) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.imageSmoothingEnabled = false;
  if (cell.img) { const im = await loadImg(cell.img); if (im) c.drawImage(im, 0, 0, cell.w, cell.h); } else cell.draw(c, T0);
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let any = false;
  for (let i = 3; i < d.length; i += 4) if (d[i]) { any = true; break; }
  return { hash: fnv(d), any };
}

async function renderAll() {
  const hashes = {};
  const empty = [];
  for (const b of built) {
    const r = await renderCell(b.cell, b.cv);
    hashes[b.id] = r.hash;
    b.el.classList.toggle('bad', !r.any);
    if (!r.any) empty.push(b.id);
  }
  window.galleryHashes = hashes;
  window.galleryEmpty = empty;
  window.galleryCount = built.length;
}

function applyScale() {
  for (const b of built) { const z = b.cell.zoom || SCALE; b.cv.style.width = `${b.cell.w * z}px`; b.cv.style.height = `${b.cell.h * z}px`; }
}

function buildNav(secs) {
  const nav = $('#gal-nav');
  nav.classList.remove('hidden');
  const filter = h('input', { class: 'in', placeholder: 'Lọc tên ô', oninput: (e) => { const q = e.target.value.toLowerCase(); for (const b of built) b.el.classList.toggle('hidden', !!q && !b.id.toLowerCase().includes(q)); } });
  const time = h('input', { id: 'gal-time', type: 'range', min: 0, max: 4, step: 0.05, value: T0, onchange: (e) => { T0 = +e.target.value; renderAll(); } });
  const scale = h('input', { type: 'range', min: 1, max: 5, step: 1, value: SCALE, oninput: (e) => { SCALE = +e.target.value; applyScale(); } });
  const bgs = [['', 'Nền tối'], ['bg-light', 'Nền sáng'], ['bg-night', 'Ban đêm']].map(([k, label]) => h('button', { class: 'btn', type: 'button', onclick: () => { document.body.classList.remove('bg-light', 'bg-night'); if (k) document.body.classList.add(k); } }, label));
  nav.append(
    ...secs.map(([id, name]) => h('button', { class: 'btn', type: 'button', onclick: () => document.getElementById(`sec-${id}`).scrollIntoView() }, name)),
    h('button', { class: 'btn', type: 'button', onclick: () => document.getElementById('sec-sound').scrollIntoView() }, 'Âm thanh'),
    filter, h('label', null, 'Thời gian', time), h('label', null, 'Tỉ lệ', scale), ...bgs,
  );
}

// Âm thanh: nút nghe từng tiếng tổng hợp và từng bản nhạc
let actx = null;
function playSfx(id) {
  actx = actx || new AudioContext();
  const comp = actx.createDynamicsCompressor();
  comp.connect(actx.destination);
  renderSfx(actx, comp, id, actx.currentTime + 0.02);
}
function soundSection() {
  const music = (G.audio && G.audio.have && G.audio.have.music) || [];
  let cur = null;
  return h('section', { class: 'gal-sec', id: 'sec-sound' },
    h('h2', null, `Âm thanh (${SFX_IDS.length} tiếng tổng hợp, ${music.length} nhạc nền)`),
    h('div', { class: 'gal-snd' }, ...SFX_IDS.map((id) => h('button', { class: 'btn', type: 'button', onclick: () => playSfx(id) }, id))),
    h('div', { class: 'gal-snd' }, ...music.map((id) => h('button', { class: 'btn', type: 'button', onclick: () => { if (cur) cur.pause(); cur = new Audio(`/audio/music/${id}.ogg`); cur.play().catch(() => {}); } }, `nhạc ${id}`))));
}

async function start() {
  const secs = sections().filter(([id]) => !ONLY || id === ONLY);
  const grid = $('#gal-grid');
  built = [];
  for (const [id, name, make] of secs) {
    const cells = await make();
    const box = h('div', { class: 'gal-cells' });
    for (const cell of cells) {
      const cv = h('canvas', { width: cell.w, height: cell.h });
      const el = h('div', { class: 'gal-cell', 'data-cell': `${id}/${cell.key}` }, cv, SHOT ? null : h('span', { title: cell.key }, cell.key));
      box.append(el);
      built.push({ id: `${id}/${cell.key}`, cell, cv, el });
    }
    grid.append(h('section', { class: 'gal-sec', id: `sec-${id}` }, h('h2', null, `${name} (${cells.length})`), box));
  }
  if (!SHOT && !ONLY) grid.append(soundSection());
  buildNav(secs);
  applyScale();
  await document.fonts.ready;
  await renderAll();
  window.galleryReady = true;
}
