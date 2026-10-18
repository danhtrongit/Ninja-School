// Âm thanh: tiếng tổng hợp WebAudio (luôn có) + file nhạc nền / tiếng hiệu ứng trong src/client/audio.
// Danh sách file đang có và bảng gắn (theme → nhạc, kỹ năng → tiếng) tới từ server qua S.G.audio; thiếu file thì dùng tiếng tổng hợp.
import { S } from './store.js';

let ac = null;
let master = null; // tắt/mở toàn bộ (cài đặt Âm thanh)
let sfxBus = null; // âm lượng hiệu ứng
let synthBus = null; // tiếng tổng hợp đi qua sfxBus, nhỏ hơn tiếng file
let musicBus = null; // âm lượng nhạc nền
let noiseBuf = null;

// âm lượng 0-100 trong cài đặt → 0-1
const vol = (k, d) => {
  const v = S.settings ? S.settings[k] : undefined;
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : d;
};

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.connect(master);
    synthBus = ac.createGain();
    synthBus.gain.value = 0.25;
    synthBus.connect(sfxBus);
    musicBus = ac.createGain();
    musicBus.connect(master);
    applyGains();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function applyGains() {
  if (!ac) return;
  master.gain.value = S.settings && S.settings.sound === false ? 0 : 1;
  sfxBus.gain.value = vol('sfxVol', 0.8);
  // nhạc nền nhỏ hơn tiếng hiệu ứng để không át tiếng đánh
  musicBus.gain.value = vol('musicVol', 0.6) * 0.55;
}

// Mở khóa âm thanh sau thao tác đầu tiên của người chơi (trình duyệt chặn tự phát): bật nhạc đang chờ, tải sẵn tiếng
function unlock() {
  if (!ctx()) return;
  syncMusic();
  preloadSfx();
}
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { once: true }));

// ---------- File âm thanh
const A = () => (S.G && S.G.audio) || null;
let opus = null;
function canOpus() {
  if (opus == null) {
    try {
      opus = new Audio().canPlayType('audio/ogg; codecs="opus"') !== '';
    } catch (e) {
      opus = false;
    }
  }
  return opus;
}

// Đường dẫn file của id (null nếu không có file trình duyệt phát được)
function fileURL(kind, id) {
  const a = A();
  if (!a || !id || !a.have[kind].includes(id)) return null;
  if (canOpus()) return `audio/${kind}/${id}.ogg`;
  return a.m4a && a.m4a[kind].includes(id) ? `audio/${kind}/${id}.m4a` : null;
}

const bufs = new Map(); // id → AudioBuffer | 'loading' | 'bad'
function loadSfx(id) {
  const url = fileURL('sfx', id);
  if (!url || bufs.has(id) || !ac) return;
  bufs.set(id, 'loading');
  fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((b) => new Promise((ok, bad) => ac.decodeAudioData(b, ok, bad)))
    .then((buf) => bufs.set(id, buf), () => bufs.set(id, 'bad'));
}

let preloaded = false;
function preloadSfx() {
  const a = A();
  if (preloaded || !a || !ac) return;
  preloaded = true;
  // tải lần lượt từng file nhỏ, không tranh băng thông lúc vào game
  const ids = [...a.have.sfx];
  const next = () => {
    const id = ids.shift();
    if (!id) return;
    loadSfx(id);
    setTimeout(next, 60);
  };
  next();
}

// Phát file tiếng; trả về false khi chưa có file / chưa tải xong để gọi tiếng tổng hợp thay
function playFile(id, gain = 1) {
  if (!ac || !id) return false;
  const b = bufs.get(id);
  if (!(b instanceof AudioBuffer)) {
    loadSfx(id);
    return false;
  }
  const src = ac.createBufferSource();
  src.buffer = b;
  // lệch cao độ nhẹ để đòn đánh liên tiếp không nghe như máy
  src.playbackRate.value = 0.96 + Math.random() * 0.08;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(sfxBus);
  src.start();
  return true;
}

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(synthBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(synthBus);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  swing: () => noise(0.12, 0.25, 2500),
  shoot: () => { noise(0.08, 0.2, 4000); tone(900, 0.08, 'triangle', 0.1, 400); },
  magic: () => { tone(520, 0.25, 'sine', 0.15, 500); tone(780, 0.25, 'sine', 0.1, 600, 0.05); },
  hit: () => { noise(0.07, 0.35, 900); tone(160, 0.07, 'square', 0.12, -60); },
  crit: () => { noise(0.12, 0.45, 700); tone(220, 0.12, 'square', 0.18, -120); tone(880, 0.1, 'square', 0.08, 0, 0.03); },
  hurt: () => { tone(200, 0.15, 'sawtooth', 0.15, -100); },
  coin: () => { tone(988, 0.06, 'square', 0.1); tone(1319, 0.12, 'square', 0.1, 0, 0.06); },
  pickup: () => { tone(660, 0.06, 'triangle', 0.15); tone(990, 0.08, 'triangle', 0.12, 0, 0.05); },
  level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.12, 0, i * 0.09)); },
  quest: () => { [784, 988, 1175].forEach((f, i) => tone(f, 0.14, 'triangle', 0.15, 0, i * 0.08)); },
  die: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, 0, i * 0.15)); },
  portal: () => { tone(300, 0.4, 'sine', 0.15, 900); },
  click: () => tone(1200, 0.03, 'square', 0.05),
  spin: () => tone(1400, 0.02, 'square', 0.05),
  boss: () => { [196, 185, 196, 247].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.12, 0, i * 0.2)); },
  jump: () => tone(330, 0.1, 'square', 0.06, 300),
  heal: () => { tone(660, 0.2, 'sine', 0.12, 300); tone(990, 0.2, 'sine', 0.08, 300, 0.08); },
};

const last = {};
function throttled(name) {
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return true;
  last[name] = now;
  return false;
}

function synth(name) {
  if (!SOUNDS[name] || !ctx()) return;
  try {
    SOUNDS[name]();
  } catch (e) {
    /* bỏ qua */
  }
}

// Tiếng theo tên: tên trong bảng EVENT_SFX hoặc trùng id file thì phát file, không thì tiếng tổng hợp cùng tên
export function sfx(name) {
  if (!S.settings.sound || throttled(name)) return;
  const a = A();
  const id = a ? a.EVENT_SFX[name] || name : null;
  if (ctx() && playFile(id)) return;
  synth(name);
}

// Tiếng kỹ năng: theo id kỹ năng, không có thì theo kiểu hiệu ứng fx.k
export function skillSfx(sid, k) {
  if (!S.settings.sound || throttled(`sk:${sid}`)) return;
  const a = A();
  const id = a ? a.SKILL_SFX[sid] || a.FX_SFX[k] : null;
  if (ctx() && playFile(id)) return;
  synth(k === 'slash' || k === 'dash' ? 'swing' : k === 'proj' || k === 'rain' || k === 'wave' ? 'shoot' : k === 'heal' ? 'heal' : 'magic');
}

// Tiếng chiêu boss (quake, roar, summon, beam, nova)
export function bossSfx(k) {
  if (!S.settings.sound || throttled(`boss:${k}`)) return;
  const a = A();
  if (ctx() && playFile(a && a.BOSS_SFX[k], 0.9)) return;
  synth('magic');
}

// ---------- Nhạc nền: phát bằng <audio> (đọc dần từ server) nối vào musicBus, đổi bài thì giảm dần bài cũ
let want = null;
let cur = null; // { id, el, g }
let resuming = false;

export function music(id) {
  want = id || null;
  syncMusic();
}

// Nhạc theo tình huống / bản đồ (bảng ở src/shared/data/audio.js)
export function musicFor(map, scene) {
  const a = A();
  if (!a) return null;
  if (scene && a.MUSIC_SCENE[scene]) return a.MUSIC_SCENE[scene];
  return (map && a.MUSIC_THEME[map.theme]) || a.MUSIC_DEFAULT;
}

function syncMusic() {
  // chưa mở khóa: chờ thao tác đầu tiên (unlock gọi lại)
  if (!ac || ac.state !== 'running') {
    // chờ resume một lần, không gọi lại vòng tròn nếu trình duyệt vẫn giữ trạng thái tạm dừng
    if (ac && !resuming) {
      resuming = true;
      ac.resume().then(() => {
        resuming = false;
        if (ac.state === 'running') syncMusic();
      }, () => { resuming = false; });
    }
    return;
  }
  const on = S.settings.sound !== false && vol('musicVol', 0.6) > 0;
  const id = on && fileURL('music', want) ? want : null;
  if (cur && cur.id === id) {
    if (cur.el.paused) cur.el.play().catch(() => {});
    return;
  }
  if (cur) fadeOut(cur);
  cur = null;
  if (!id) return;
  const el = new Audio(fileURL('music', id));
  el.loop = true;
  el.preload = 'auto';
  const g = ac.createGain();
  ac.createMediaElementSource(el).connect(g).connect(musicBus);
  const now = ac.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(1, now + 1.5);
  el.play().catch(() => {});
  cur = { id, el, g };
}

function fadeOut(t) {
  const now = ac.currentTime;
  t.g.gain.cancelScheduledValues(now);
  t.g.gain.setValueAtTime(t.g.gain.value, now);
  t.g.gain.linearRampToValueAtTime(0, now + 1.2);
  setTimeout(() => {
    t.el.pause();
    t.el.removeAttribute('src');
    t.el.load();
  }, 1300);
}

// Gọi sau khi đổi cài đặt âm thanh (bật/tắt, thanh âm lượng)
export function applyAudio() {
  applyGains();
  syncMusic();
}

// Đang có file âm thanh do model tạo (để ghi nguồn trong cài đặt)
export function audioInfo() {
  const a = A();
  return { music: a ? a.have.music.length : 0, sfx: a ? a.have.sfx.length : 0 };
}
