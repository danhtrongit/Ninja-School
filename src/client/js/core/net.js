// Kết nối WebSocket tới máy chủ
export class Net {
  constructor() {
    this.handlers = {};
    this.ws = null;
    this.open = false;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.open = true;
      this.emit('open', {});
    };
    ws.onclose = () => {
      this.open = false;
      this.emit('close', {});
    };
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch (err) {
        return;
      }
      this.emit(m.t, m);
    };
  }

  on(t, fn) {
    (this.handlers[t] = this.handlers[t] || []).push(fn);
  }

  emit(t, m) {
    for (const fn of this.handlers[t] || []) {
      try {
        fn(m);
      } catch (err) {
        console.error('Lỗi xử lý', t, err);
      }
    }
  }

  send(t, d = {}) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t, ...d }));
  }
}
