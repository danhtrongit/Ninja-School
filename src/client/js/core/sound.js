// Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh)
import { S } from './store.js';

let ac = null;
let master = null;
let noiseBuf = null;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.25;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// Mở khóa âm thanh sau thao tác đầu tiên của người chơi
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => ctx(), { once: true }));

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
  o.connect(g).connect(master);
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
  src.connect(f).connect(g).connect(master);
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
export function sfx(name) {
  if (!S.settings.sound || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return;
  last[name] = now;
  try {
    SOUNDS[name]();
  } catch (e) {
    /* bỏ qua */
  }
}
