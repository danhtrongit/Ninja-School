// Dựng ảnh chữ số sát thương / thông báo nổi (cache theo nội dung).
import { shade } from '../sprites.js';
import { mkCanvas } from './util.js';

export const textMethods = {
  // ================= CHỮ (canvas phân giải cao) =================
  renderText(t, scale) {
    const base = t.banner ? 30 : t.crit ? 31 : t.miss ? 21 : 23;
    const size = Math.round(base * scale * 1.15);
    const font = `bold ${size}px VT323, monospace`;
    const m = this.mctx;
    m.font = font;
    const tw = m.measureText(t.s).width;
    const pad = Math.ceil(size * 0.35);
    const w = Math.ceil(tw + pad * 2);
    const h = Math.ceil(size + pad * 2);
    const cv = mkCanvas(w, h);
    const g = cv.getContext('2d');
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const cx = w / 2;
    const cy = h / 2 + size * 0.04;
    let top;
    let mid;
    let bot;
    if (t.crit) {
      top = '#fffde7';
      mid = t.c;
      bot = '#ff6d00';
    } else {
      top = shade(t.c, 0.7);
      mid = t.c;
      bot = shade(t.c, -0.28);
    }
    if (t.crit || t.banner) {
      g.shadowColor = t.crit ? 'rgba(255,90,0,0.95)' : 'rgba(255,200,40,0.9)';
      g.shadowBlur = size * 0.35;
    }
    g.lineWidth = Math.max(3, size * 0.24);
    g.strokeStyle = '#1a1020';
    g.strokeText(t.s, cx, cy);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
    g.lineWidth = Math.max(1.5, size * 0.1);
    g.strokeStyle = t.crit ? '#7a1f00' : shade(t.c, -0.6);
    g.strokeText(t.s, cx, cy);
    const gr = g.createLinearGradient(0, cy - size * 0.38, 0, cy + size * 0.38);
    gr.addColorStop(0, top);
    gr.addColorStop(0.45, mid);
    gr.addColorStop(1, bot);
    g.fillStyle = gr;
    g.fillText(t.s, cx, cy);
    t.cv = cv;
    t.cs = scale;
    t.nofont = !this.fontOK;
  },
};
