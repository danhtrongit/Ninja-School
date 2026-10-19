// Atlas ảnh ×3 (DESIGN_RULES mục 11): art/<nhóm>/<id>.png + .json, lưới đều mỗi hàng một hoạt ảnh.
// Chỉ tải atlas có trong danh mục máy chủ gửi (S.G.art) nên không có yêu cầu 404; chưa tải xong thì người gọi vẽ hình code.
export const ART = 3;
export const ATLAS_ANIMS = ['idle', 'walk', 'atk', 'hit', 'die'];

const BASE = new URL('../../../art/', import.meta.url);
const atlases = new Map();

// Bắt đầu tải (một lần) atlas '<nhóm>/<id>' nếu có trong danh mục { khóa: { v: băm, h } };
// trả bản ghi { st: 'load'|'ok'|'none', img, meta, ready: Promise<bản ghi | null> }
export function loadAtlas(index, key) {
  let a = atlases.get(key);
  if (a) return a;
  const e = index && Object.prototype.hasOwnProperty.call(index, key) ? index[key] : null;
  const v = e && e.v;
  a = { st: v ? 'load' : 'none', img: null, white: null, meta: null, ready: null };
  atlases.set(key, a);
  if (!v) { a.ready = Promise.resolve(null); return a; }
  a.ready = fetch(new URL(`${key}.json?v=${v}`, BASE))
    .then((r) => (r.ok ? r.json() : null))
    .then((meta) => new Promise((done) => {
      if (!meta || !meta.anims || !meta.fw || !meta.fh) { a.st = 'none'; done(null); return; }
      const img = new Image();
      img.onload = () => { a.img = img; a.meta = meta; a.st = 'ok'; done(a); };
      img.onerror = () => { a.st = 'none'; done(null); };
      img.src = new URL(`${key}.png?v=${v}`, BASE).href;
    }))
    .catch(() => { a.st = 'none'; return null; });
  return a;
}

// Atlas đã sẵn sàng để vẽ (đã tải xong), không có thì null
export function atlasOf(key) {
  const a = atlases.get(key);
  return a && a.st === 'ok' ? a : null;
}

// Số khung đang hiện của hoạt ảnh sau el giây (dur = thời lượng cả hoạt ảnh)
export function atlasFrame(an, el) {
  const f = Math.floor((Math.max(0, el) / an.dur) * an.n);
  return an.loop === false ? Math.min(an.n - 1, f) : f % an.n;
}

// Bản bóng trắng (nháy khi trúng đòn) dựng một lần cho cả atlas
function whiteOf(a) {
  if (a.white) return a.white;
  const cv = document.createElement('canvas');
  cv.width = a.img.width;
  cv.height = a.img.height;
  const g = cv.getContext('2d');
  g.drawImage(a.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, cv.width, cv.height);
  a.white = cv;
  return cv;
}

// Vẽ khung f của hoạt ảnh an tại gốc giữa chân (x, y) theo đơn vị thế giới; ảnh nguồn quay mặt sang trái
export function drawAtlas(ctx, a, x, y, dir, an, f, white) {
  const { fw, fh, foot } = a.meta;
  const img = white ? whiteOf(a) : a.img;
  const w = fw / ART;
  const h = fh / ART;
  const top = y - foot / ART;
  const sy = an.row * fh;
  if (dir < 0) ctx.drawImage(img, f * fw, sy, fw, fh, x - w / 2, top, w, h);
  else {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, f * fw, sy, fw, fh, -w / 2, top, w, h);
    ctx.restore();
  }
}
