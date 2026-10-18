// Âm thanh: tiếng hiệu ứng tổng hợp bằng WebAudio (công thức từng tiếng ở bảng RECIPES, không dùng file)
// + nhạc nền từ file trong src/client/audio/music. Bảng gắn (theme → nhạc, kỹ năng → tiếng) tới từ server qua S.G.audio.
import { S } from './store.js';

let ac = null;
let master = null; // tắt/mở toàn bộ (cài đặt Âm thanh)
let sfxBus = null; // âm lượng hiệu ứng → bộ nén → master
let musicBus = null; // âm lượng nhạc nền
let noiseBuf = null;

// âm lượng 0-100 trong cài đặt → 0-1
const vol = (k, d) => {
  const v = S.settings ? S.settings[k] : undefined;
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : d;
};

// Tiếng ồn hồng (giảm dần năng lượng ở tần cao): dịu tai hơn tiếng ồn trắng
function pinkNoise(a, sec) {
  const b = a.createBuffer(1, Math.floor(a.sampleRate * sec), a.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let seed = 12345;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = seed / 0x3fffffff - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return b;
}

// Dựng chuỗi đầu ra tiếng hiệu ứng trên một AudioContext bất kỳ (cả OfflineAudioContext khi kiểm thử)
function buildSfxChain(a, dest) {
  const bus = a.createGain();
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  bus.connect(comp).connect(dest);
  return bus;
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.connect(ac.destination);
    sfxBus = buildSfxChain(ac, master);
    musicBus = ac.createGain();
    musicBus.connect(master);
    applyGains();
    noiseBuf = pinkNoise(ac, 1.5);
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

// Mở khóa âm thanh sau thao tác đầu tiên của người chơi (trình duyệt chặn tự phát): bật nhạc đang chờ
function unlock() {
  if (!ctx()) return;
  syncMusic();
}
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { once: true }));

// ---------- File nhạc
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

// ---------- Bộ tổng hợp tiếng hiệu ứng
// Mỗi lời gọi nhận V = { a, out, t, nb, p } (context, nút đích, thời điểm bắt đầu, bộ đệm ồn, hệ số cao độ)

// Bao âm: lên nhanh (at) rồi tắt dần theo hàm mũ tới hết dur; không bao giờ bật/tắt đột ngột (tránh tiếng tách)
function env(g, t, at, dur, v) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + at);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(at + 0.01, dur));
}

// Dao động: f → f2 trong dur; lp: lọc thông thấp để bớt chói (mặc định 4 lần tần số, tối đa 6 kHz)
function tone(V, { f, f2, type = 'triangle', dur = 0.15, v = 0.1, at = 0.006, d = 0, lp }) {
  const { a } = V;
  const t = V.t + d;
  const o = a.createOscillator();
  o.type = type;
  const p = V.p || 1;
  o.frequency.setValueAtTime(f * p, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * p), t + dur);
  const flt = a.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = Math.min(6000, lp || Math.max(f, f2 || 0) * p * 4);
  const g = a.createGain();
  env(g, t, at, dur, v);
  o.connect(flt).connect(g).connect(V.out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Tiếng ồn hồng qua bộ lọc (kind: bandpass|lowpass|highpass), tần số lọc trượt f → f2
function hiss(V, { f, f2, kind = 'bandpass', q = 1, dur = 0.15, v = 0.2, at = 0.008, d = 0 }) {
  const { a } = V;
  const t = V.t + d;
  const src = a.createBufferSource();
  src.buffer = V.nb;
  const flt = a.createBiquadFilter();
  flt.type = kind;
  flt.Q.value = q;
  const p = V.p || 1;
  flt.frequency.setValueAtTime(f * p, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(30, f2 * p), t + dur);
  // cắt phần trên 7 kHz: tiếng ồn ở dải này là nguồn chính của cảm giác "rè"
  const top = a.createBiquadFilter();
  top.type = 'lowpass';
  top.frequency.value = 7000;
  const g = a.createGain();
  env(g, t, at, dur, v);
  src.connect(flt).connect(top).connect(g).connect(V.out);
  src.start(t, (t * 7.3) % 0.8);
  src.stop(t + dur + 0.05);
}

const notes = (V, fs, o) => fs.forEach((f, i) => tone(V, { ...o, f, d: (o.d || 0) + i * (o.gap || 0.08) }));
const boom = (V, d = 0, v = 0.4, len = 0.45) => {
  tone(V, { f: 110, f2: 42, type: 'sine', dur: len, v, at: 0.004, d });
  hiss(V, { kind: 'lowpass', f: 900, f2: 120, dur: len * 0.9, v: v * 0.9, at: 0.004, d });
};
const swish = (V, f, f2, dur, v, d = 0, q = 1.4) => hiss(V, { f, f2, q, dur, v, at: Math.min(0.03, dur / 4), d });

// Thời lượng (giây) dùng để giới hạn số tiếng chồng nhau
const RECIPES = {
  slash_basic: [0.16, (V) => { swish(V, 2600, 900, 0.14, 0.42); tone(V, { f: 260, f2: 170, dur: 0.07, v: 0.08 }); }],
  slash_fire: [0.32, (V) => { swish(V, 2400, 800, 0.14, 0.38); hiss(V, { kind: 'lowpass', f: 700, f2: 220, dur: 0.28, v: 0.3, at: 0.02, d: 0.03 }); tone(V, { f: 150, f2: 90, type: 'sine', dur: 0.22, v: 0.12, d: 0.03 }); }],
  fire_burst: [0.5, (V) => { boom(V, 0, 0.42, 0.45); hiss(V, { kind: 'bandpass', f: 1600, f2: 500, q: 0.8, dur: 0.3, v: 0.12, d: 0.02 }); }],
  sword_wave: [0.36, (V) => { swish(V, 1900, 600, 0.32, 0.36, 0, 2); tone(V, { f: 620, f2: 310, type: 'sine', dur: 0.3, v: 0.06 }); }],
  buff: [0.55, (V) => { notes(V, [523, 659, 784], { type: 'sine', dur: 0.32, v: 0.09, gap: 0.06 }); tone(V, { f: 1047, type: 'sine', dur: 0.4, v: 0.05, d: 0.16 }); }],
  meteor: [0.9, (V) => { hiss(V, { kind: 'bandpass', f: 2200, f2: 400, q: 0.9, dur: 0.4, v: 0.22, at: 0.2 }); boom(V, 0.36, 0.48, 0.5); }],
  shuriken: [0.1, (V) => { swish(V, 4200, 2600, 0.08, 0.24, 0, 3); tone(V, { f: 1700, f2: 2300, type: 'sine', dur: 0.06, v: 0.035 }); }],
  shuriken_rain: [0.32, (V) => { for (let i = 0; i < 4; i++) { swish(V, 4000 - i * 250, 2400, 0.08, 0.2, i * 0.055, 3); } }],
  explosive_shuriken: [0.45, (V) => { swish(V, 4200, 2600, 0.08, 0.24, 0, 3); boom(V, 0.12, 0.34, 0.32); }],
  kunai_stab: [0.1, (V) => { swish(V, 3200, 1700, 0.06, 0.3, 0, 2); tone(V, { f: 190, f2: 120, type: 'sine', dur: 0.07, v: 0.16 }); }],
  water_slash: [0.28, (V) => { swish(V, 1500, 650, 0.2, 0.32); tone(V, { f: 700, f2: 1050, type: 'sine', dur: 0.12, v: 0.05, d: 0.06 }); }],
  water_vortex: [0.6, (V) => { hiss(V, { f: 400, f2: 1300, q: 3, dur: 0.5, v: 0.26, at: 0.12 }); [620, 880, 740, 1040].forEach((f, i) => tone(V, { f, f2: f * 1.4, type: 'sine', dur: 0.07, v: 0.04, d: 0.08 + i * 0.09 })); }],
  heal: [0.6, (V) => { notes(V, [659, 880, 1175], { type: 'sine', dur: 0.38, v: 0.08, gap: 0.07 }); tone(V, { f: 1760, type: 'sine', dur: 0.3, v: 0.025, d: 0.2 }); }],
  ice_shard: [0.24, (V) => { tone(V, { f: 2093, type: 'triangle', dur: 0.16, v: 0.06 }); tone(V, { f: 2637, type: 'triangle', dur: 0.14, v: 0.045, d: 0.03 }); hiss(V, { kind: 'highpass', f: 3500, dur: 0.06, v: 0.1 }); }],
  tsunami: [0.95, (V) => { hiss(V, { f: 300, f2: 1000, q: 0.8, dur: 0.85, v: 0.36, at: 0.25 }); tone(V, { f: 70, f2: 50, type: 'sine', dur: 0.7, v: 0.16, at: 0.1 }); }],
  arrow: [0.16, (V) => { swish(V, 2900, 1500, 0.09, 0.24, 0, 4); tone(V, { f: 230, f2: 150, type: 'sine', dur: 0.05, v: 0.11, d: 0.08 }); }],
  arrow_rain: [0.45, (V) => { for (let i = 0; i < 5; i++) { swish(V, 3000 - i * 200, 1500, 0.08, 0.17, i * 0.05, 4); tone(V, { f: 220, f2: 150, type: 'sine', dur: 0.04, v: 0.06, d: i * 0.05 + 0.08 }); } }],
  pierce_arrow: [0.3, (V) => { swish(V, 4000, 1200, 0.25, 0.32, 0, 5); tone(V, { f: 1200, f2: 420, type: 'sine', dur: 0.2, v: 0.05 }); }],
  blade_wind: [0.32, (V) => { swish(V, 3000, 1200, 0.18, 0.3, 0, 2); swish(V, 2600, 1000, 0.16, 0.22, 0.08, 2); }],
  whirlwind: [0.62, (V) => { hiss(V, { f: 700, f2: 1700, q: 3, dur: 0.3, v: 0.24, at: 0.08 }); hiss(V, { f: 1700, f2: 700, q: 3, dur: 0.3, v: 0.22, at: 0.05, d: 0.28 }); }],
  dash: [0.22, (V) => { swish(V, 1100, 3000, 0.18, 0.3, 0, 1.5); }],
  wind_blade: [0.2, (V) => { swish(V, 2200, 3800, 0.15, 0.26, 0, 6); tone(V, { f: 1500, f2: 900, type: 'sine', dur: 0.12, v: 0.04 }); }],
  tornado: [0.85, (V) => { hiss(V, { f: 500, f2: 1400, q: 4, dur: 0.7, v: 0.26, at: 0.2 }); hiss(V, { f: 800, f2: 2000, q: 4, dur: 0.6, v: 0.16, at: 0.2, d: 0.1 }); }],
  hit: [0.09, (V) => { tone(V, { f: 180, f2: 90, type: 'sine', dur: 0.09, v: 0.34, at: 0.003 }); hiss(V, { kind: 'lowpass', f: 1800, f2: 500, dur: 0.05, v: 0.16, at: 0.003 }); }],
  crit: [0.18, (V) => { tone(V, { f: 160, f2: 70, type: 'sine', dur: 0.14, v: 0.42, at: 0.003 }); hiss(V, { kind: 'lowpass', f: 2600, f2: 500, dur: 0.09, v: 0.24, at: 0.003 }); tone(V, { f: 1319, type: 'triangle', dur: 0.12, v: 0.05, d: 0.02 }); }],
  hurt: [0.16, (V) => { tone(V, { f: 300, f2: 160, type: 'triangle', dur: 0.14, v: 0.14 }); hiss(V, { kind: 'lowpass', f: 900, dur: 0.07, v: 0.12, at: 0.003 }); }],
  coin: [0.22, (V) => { tone(V, { f: 1568, type: 'triangle', dur: 0.07, v: 0.07 }); tone(V, { f: 2093, type: 'triangle', dur: 0.16, v: 0.07, d: 0.06 }); }],
  pickup: [0.16, (V) => { tone(V, { f: 784, type: 'triangle', dur: 0.06, v: 0.08 }); tone(V, { f: 1175, type: 'triangle', dur: 0.1, v: 0.08, d: 0.05 }); }],
  levelup: [0.75, (V) => { notes(V, [523, 659, 784, 1047], { type: 'triangle', dur: 0.18, v: 0.08, gap: 0.08 }); notes(V, [1047, 1319], { type: 'sine', dur: 0.4, v: 0.05, gap: 0, d: 0.32 }); }],
  quest: [0.4, (V) => notes(V, [784, 988, 1175], { type: 'triangle', dur: 0.15, v: 0.08, gap: 0.08 })],
  portal: [0.5, (V) => { tone(V, { f: 300, f2: 900, type: 'sine', dur: 0.45, v: 0.08, at: 0.05 }); hiss(V, { f: 800, f2: 2400, q: 4, dur: 0.45, v: 0.08, at: 0.08 }); }],
  ui_click: [0.03, (V) => tone(V, { f: 950, type: 'sine', dur: 0.03, v: 0.06, at: 0.002 })],
  spin: [0.02, (V) => tone(V, { f: 1400, type: 'sine', dur: 0.02, v: 0.03, at: 0.002 })],
  ui_open: [0.1, (V) => tone(V, { f: 560, f2: 840, type: 'sine', dur: 0.09, v: 0.06 })],
  jump: [0.1, (V) => tone(V, { f: 330, f2: 560, type: 'sine', dur: 0.1, v: 0.05 })],
  boss_warn: [1.0, (V) => notes(V, [196, 185, 196, 247], { type: 'sawtooth', dur: 0.26, v: 0.08, gap: 0.2, lp: 900 })],
  boss_quake: [1.0, (V) => { hiss(V, { kind: 'lowpass', f: 260, f2: 60, dur: 0.95, v: 0.5, at: 0.02 }); tone(V, { f: 55, f2: 34, type: 'sine', dur: 0.9, v: 0.34, at: 0.02 }); }],
  boss_roar: [0.9, (V) => { tone(V, { f: 160, f2: 90, type: 'sawtooth', dur: 0.8, v: 0.12, at: 0.08, lp: 600 }); hiss(V, { f: 420, q: 1, dur: 0.8, v: 0.22, at: 0.1 }); }],
  boss_summon: [0.7, (V) => { tone(V, { f: 220, f2: 440, type: 'sine', dur: 0.6, v: 0.07, at: 0.05 }); tone(V, { f: 330, f2: 660, type: 'sine', dur: 0.5, v: 0.05, at: 0.05, d: 0.1 }); hiss(V, { f: 1500, q: 6, dur: 0.6, v: 0.06, at: 0.1 }); }],
  boss_beam: [0.8, (V) => { tone(V, { f: 880, f2: 840, type: 'sawtooth', dur: 0.7, v: 0.05, at: 0.06, lp: 1800 }); tone(V, { f: 1760, type: 'sine', dur: 0.7, v: 0.035, at: 0.06 }); }],
  boss_nova: [0.75, (V) => { hiss(V, { kind: 'lowpass', f: 2600, f2: 200, dur: 0.7, v: 0.4, at: 0.005 }); tone(V, { f: 120, f2: 40, type: 'sine', dur: 0.6, v: 0.3, at: 0.005 }); }],
  defeat: [0.85, (V) => notes(V, [392, 330, 262, 196], { type: 'triangle', dur: 0.24, v: 0.09, gap: 0.15 })],
  victory: [0.9, (V) => { notes(V, [523, 659, 784, 1047], { type: 'triangle', dur: 0.16, v: 0.08, gap: 0.09 }); notes(V, [784, 1047, 1319], { type: 'sine', dur: 0.5, v: 0.04, gap: 0, d: 0.38 }); }],
  arena_start: [1.2, (V) => { tone(V, { f: 220, type: 'sine', dur: 1.2, v: 0.15, at: 0.004 }); tone(V, { f: 331, type: 'sine', dur: 1.0, v: 0.07, at: 0.004 }); tone(V, { f: 607, type: 'sine', dur: 0.6, v: 0.03, at: 0.004 }); hiss(V, { kind: 'lowpass', f: 1500, dur: 0.1, v: 0.1, at: 0.003 }); }],
  mail: [0.25, (V) => notes(V, [880, 1175], { type: 'sine', dur: 0.14, v: 0.07, gap: 0.1 })],
  gem: [0.3, (V) => notes(V, [1319, 1760, 2349], { type: 'sine', dur: 0.14, v: 0.05, gap: 0.05 })],
  enhance_ok: [0.6, (V) => { hiss(V, { f: 3500, q: 8, dur: 0.12, v: 0.18, at: 0.002 }); tone(V, { f: 1760, type: 'triangle', dur: 0.3, v: 0.04, at: 0.002 }); notes(V, [659, 880, 1319], { type: 'sine', dur: 0.25, v: 0.07, gap: 0.07, d: 0.1 }); }],
  enhance_fail: [0.45, (V) => { hiss(V, { f: 3500, q: 8, dur: 0.12, v: 0.18, at: 0.002 }); tone(V, { f: 330, f2: 196, type: 'triangle', dur: 0.32, v: 0.1, d: 0.1 }); }],
  magic: [0.35, (V) => { tone(V, { f: 520, f2: 1000, type: 'sine', dur: 0.25, v: 0.07 }); tone(V, { f: 780, f2: 1400, type: 'sine', dur: 0.25, v: 0.05, d: 0.05 }); }],
};
// Bù độ lớn (dB) theo từng tiếng, đo bằng tests/e2e/sfx.js: đòn đánh ~-28 dB RMS, boss/nổ ~-25, nhạc hiệu ~-31, giao diện ~-36
const LEVEL = {
  slash_basic: 5.6, slash_fire: -1.3, fire_burst: -3.3, sword_wave: 6.2, buff: -3.8, meteor: -4.0, shuriken: 12.1, shuriken_rain: 10.8,
  explosive_shuriken: -2.9, kunai_stab: 3.9, water_slash: 6.3, water_vortex: 7.6, heal: -3.1, ice_shard: 8.9, tsunami: -2.6, arrow: 3.9,
  arrow_rain: 5.5, pierce_arrow: 8.7, blade_wind: 8.3, whirlwind: 11.0, dash: 10.7, wind_blade: 12.1, tornado: 9.1, hit: -1.0, crit: -2.8, hurt: 5.9,
  coin: 3.5, pickup: 3.6, levelup: -0.3, quest: 0.9, portal: -0.6, ui_click: 7.2, spin: 13.5, ui_open: 3.7, jump: 4.8, boss_warn: 9.0,
  boss_quake: -5.1, boss_roar: 3.5, boss_summon: 4.7, boss_beam: 9.2, boss_nova: -2.3, defeat: -0.2, victory: 0.7, arena_start: -5.3, mail: 1.9,
  gem: 2.3, enhance_ok: -1.5, enhance_fail: 0.1, magic: 2.4,
};
// tên cũ vẫn gọi trong mã
const ALIAS = { swing: 'slash_basic', shoot: 'arrow', level: 'levelup', click: 'ui_click', open: 'ui_open', boss: 'boss_warn', die: 'defeat' };
export const SFX_IDS = Object.keys(RECIPES);

// Phát công thức id lên context a, nút out, lúc t; trả thời lượng (giây) hoặc 0 nếu không có công thức
export function renderSfx(a, out, id, t, nb, p = 1) {
  const key = ALIAS[id] || id;
  const r = RECIPES[key];
  if (!r) return 0;
  const g = a.createGain();
  g.gain.value = 10 ** ((LEVEL[key] || 0) / 20);
  g.connect(out);
  r[1]({ a, out: g, t, nb: nb || pinkNoise(a, 1.5), p });
  return r[0];
}

// Giới hạn chồng tiếng: tối đa 8 tiếng cùng lúc (tiếng giao diện luôn được phát), cùng một tiếng cách nhau ≥ 70 ms
const UI = new Set(['ui_click', 'ui_open', 'spin', 'coin', 'pickup', 'levelup', 'quest', 'mail', 'defeat', 'victory', 'arena_start', 'enhance_ok', 'enhance_fail', 'gem']);
const ends = [];
const last = {};
function play(id, gain = 1) {
  const a = ctx();
  if (!a) return;
  const key = ALIAS[id] || id;
  const r = RECIPES[key];
  if (!r) return;
  const now = performance.now();
  if (now - (last[key] || 0) < 70) return;
  for (let i = ends.length - 1; i >= 0; i--) if (ends[i] < now) ends.splice(i, 1);
  if (ends.length >= 8 && !UI.has(key)) return;
  last[key] = now;
  ends.push(now + r[0] * 1000);
  const g = a.createGain();
  g.gain.value = gain;
  g.connect(sfxBus);
  // lệch cao độ nhẹ để đòn đánh liên tiếp không nghe như máy (tiếng giao diện giữ nguyên)
  const p = UI.has(key) ? 1 : 0.95 + Math.random() * 0.1;
  try {
    renderSfx(a, g, key, a.currentTime + 0.005, noiseBuf, p);
  } catch (e) { /* trình duyệt cũ thiếu nút lọc: im lặng */ }
  setTimeout(() => g.disconnect(), r[0] * 1000 + 300);
}

// Tiếng theo tên (bảng EVENT_SFX đổi tên sự kiện → id tiếng)
export function sfx(name) {
  if (!S.settings.sound) return;
  const a = A();
  play((a && a.EVENT_SFX[name]) || name);
}

// Tiếng kỹ năng: theo id kỹ năng, không có thì theo kiểu hiệu ứng fx.k
export function skillSfx(sid, k) {
  if (!S.settings.sound) return;
  const a = A();
  play((a && (a.SKILL_SFX[sid] || a.FX_SFX[k])) || 'magic');
}

// Tiếng chiêu boss (quake, roar, summon, beam, nova)
export function bossSfx(k) {
  if (!S.settings.sound) return;
  const a = A();
  play((a && a.BOSS_SFX[k]) || 'boss_warn', 0.9);
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

// Số file nhạc đang có và số tiếng hiệu ứng tổng hợp (sfx: 0 = không có tiếng nào từ file cần ghi nguồn)
export function audioInfo() {
  const a = A();
  return { music: a ? a.have.music.length : 0, sfx: 0, synth: SFX_IDS.length };
}
