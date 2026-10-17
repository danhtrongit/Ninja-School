// Bàn phím + nút cảm ứng
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', Digit1: 's1', Digit2: 's2', Digit3: 's3', Digit4: 's4', Digit5: 's5', Digit6: 's6',
  KeyQ: 'hp', KeyE: 'mp', KeyZ: 'pick', KeyX: 'talk', Tab: 'target',
  KeyB: 'w_inv', KeyI: 'w_inv', KeyC: 'w_char', KeyV: 'w_skill', KeyN: 'w_quest', KeyP: 'w_party', KeyG: 'w_clan',
  KeyR: 'w_rank', KeyF: 'auto', KeyM: 'w_map', KeyO: 'w_friends', Enter: 'chat', Escape: 'esc',
};

export class Input {
  constructor() {
    this.held = new Set();
    this.queue = [];
    this.enabled = true;
    this.lastManual = 0;
    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target)) {
        if (e.code === 'Escape') e.target.blur();
        return;
      }
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.enabled && a !== 'esc') return;
      if (!e.repeat) this.queue.push(a);
      this.held.add(a);
      if (a === 'left' || a === 'right' || a === 'jump') this.lastManual = performance.now();
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    });
    window.addEventListener('blur', () => this.held.clear());
  }

  // Gắn nút cảm ứng: phần tử có data-act
  bindTouch(root) {
    root.querySelectorAll('[data-act]').forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      const a = el.dataset.act;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('down');
        this.queue.push(a);
        this.held.add(a);
        if (a === 'left' || a === 'right' || a === 'jump') this.lastManual = performance.now();
        if (el.setPointerCapture && e.pointerId != null) el.setPointerCapture(e.pointerId);
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('down');
        this.held.delete(a);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  take() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  has(a) {
    return this.held.has(a);
  }
}

function isTyping(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
