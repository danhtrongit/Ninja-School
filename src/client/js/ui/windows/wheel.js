// Cửa sổ Vòng quay may mắn (wheel)
// Các phương thức được gộp vào UI.prototype (xem ui.js), `this` là đối tượng UI
import { S, fmt } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { h, ico } from '../dom.js';
import { moneyLine } from '../common.js';

function shadeHex(hex, f = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`;
}

export default {
  // ----- Vòng quay may mắn
  renderWheel() {
    const W = S.G.wheel;
    const cv = h('canvas', { width: 520, height: 520, class: 'wheel' });
    this.wheelCanvas = cv;
    this.wheelRot = this.wheelRot || 0;
    this.drawWheel();
    const busy = !!this.wheelAnim;
    this.frameWin('Vòng Quay May Mắn', h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-box' }, h('div', { class: 'wheel-pin' }), cv),
      h('div', { class: 'wheel-side' },
        h('div', { class: 'muted' }, 'Quay bằng lượng có tỉ lệ ra quà quý cao hơn.'),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'xu' }) }, ico('xu'), `Quay (${fmt(W.cost.xu)} xu)`),
        h('button', { class: 'btn primary', disabled: busy, onclick: () => this.net.send('spin', { cur: 'luong' }) }, ico('luong'), `Quay (${W.cost.luong} lượng)`),
        h('div', { class: 'wheel-result' }, this.wheelResult || ''))),
    moneyLine());
  },

  drawWheel() {
    const cv = this.wheelCanvas;
    if (!cv) return;
    const g = cv.getContext('2d');
    const prizes = S.G.wheel.prizes;
    const n = prizes.length;
    const seg = (Math.PI * 2) / n;
    const S2 = cv.width / 240;
    const R = 100;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(S2, 0, 0, S2, 120 * S2, 120 * S2);
    // vành gỗ sơn mài + viền vàng
    g.beginPath();
    g.arc(0, 0, 117, 0, Math.PI * 2);
    g.fillStyle = '#120804';
    g.fill();
    const rim = g.createRadialGradient(0, 0, 100, 0, 0, 116);
    rim.addColorStop(0, '#5a140a');
    rim.addColorStop(0.5, '#a3301a');
    rim.addColorStop(1, '#5a140a');
    g.beginPath();
    g.arc(0, 0, 115, 0, Math.PI * 2);
    g.fillStyle = rim;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#f0c869';
    g.stroke();
    // đèn quanh vành
    const lit = Math.floor((this.wheelAnim ? performance.now() / 90 : performance.now() / 600)) % 2;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * 108, Math.sin(a) * 108, 3, 0, Math.PI * 2);
      g.fillStyle = i % 2 === lit ? '#fff7c2' : '#b07d33';
      g.fill();
    }
    for (let i = 0; i < n; i++) {
      const a0 = this.wheelRot + i * seg - Math.PI / 2;
      const grad = g.createRadialGradient(0, 0, 10, 0, 0, R);
      grad.addColorStop(0, '#fff8e6');
      grad.addColorStop(0.35, prizes[i].c);
      grad.addColorStop(1, shadeHex(prizes[i].c, i % 2 ? 0.62 : 0.75));
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, R, a0, a0 + seg);
      g.closePath();
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = '#3a1a08';
      g.lineWidth = 1.5;
      g.stroke();
      // chữ luôn đọc xuôi: nửa trái xoay ngược 180°
      const mid = a0 + seg / 2;
      const left = Math.cos(mid) < 0;
      g.save();
      g.rotate(left ? mid + Math.PI : mid);
      // nhãn dài (vd "15.000 xu khóa") thu nhỏ chữ để không đè trục giữa
      let fs = 15;
      g.font = `${fs}px VT323, monospace`;
      while (fs > 11 && g.measureText(prizes[i].label).width > R - 30) g.font = `${--fs}px VT323, monospace`;
      g.textAlign = left ? 'left' : 'right';
      g.textBaseline = 'middle';
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(30,10,4,0.85)';
      const tx = left ? -(R - 7) : R - 7;
      g.strokeText(prizes[i].label, tx, 0);
      g.fillStyle = '#ffffff';
      g.fillText(prizes[i].label, tx, 0);
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.lineWidth = 2;
    g.strokeStyle = '#f0c869';
    g.stroke();
    // trục giữa
    const hub = g.createRadialGradient(-4, -4, 2, 0, 0, 18);
    hub.addColorStop(0, '#fff4c6');
    hub.addColorStop(0.5, '#e2ae4f');
    hub.addColorStop(1, '#7a4a12');
    g.beginPath();
    g.arc(0, 0, 17, 0, Math.PI * 2);
    g.fillStyle = hub;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#120804';
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 7, 0, Math.PI * 2);
    g.fillStyle = '#b52a18';
    g.fill();
    g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
  },

  onSpin(m) {
    const n = S.G.wheel.prizes.length;
    const seg = (Math.PI * 2) / n;
    const target = -(m.idx + 0.5) * seg;
    const base = this.wheelRot || 0;
    const final = target + Math.PI * 2 * Math.ceil((base + Math.PI * 8 - target) / (Math.PI * 2));
    const start = performance.now();
    const dur = 2600;
    this.wheelResult = '';
    if (this.winName !== 'wheel') this.open('wheel');
    else this.refresh();
    let lastSeg = -1;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.wheelRot = base + (final - base) * e;
      const sIdx = Math.floor(this.wheelRot / seg);
      if (sIdx !== lastSeg) {
        lastSeg = sIdx;
        sfx('spin');
      }
      this.drawWheel();
      if (t < 1) this.wheelAnim = requestAnimationFrame(step);
      else {
        this.wheelAnim = null;
        this.wheelRot = final % (Math.PI * 2);
        this.wheelResult = `Bạn nhận được: ${m.label}!`;
        this.toast(this.wheelResult, 'reward');
        sfx('quest');
        if (this.winName === 'wheel') this.refresh();
      }
    };
    this.wheelAnim = requestAnimationFrame(step);
  },
};
