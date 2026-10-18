// Sprite đồ vật trang trí (cột, tượng, đèn lồng, sprProp...).
import { rng, shd, u32, ramp, Buf, blit, blob, cached } from './util.js';
import { CLOUD, sprCrystal } from './flora.js';

// Tô sáng mép trên-trái, tối mép dưới-phải cho khối đã tô một màu (ánh sáng trên-trái)
function edgeShade(s, L, D) {
  const { w, h, d } = s;
  const out = new Uint32Array(d);
  const lu = u32(L);
  const du = u32(D);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!(d[i] >>> 24)) continue;
    if (x === 0 || y === 0 || !(d[i - 1] >>> 24) || !(d[i - w] >>> 24)) out[i] = lu;
    else if (x === w - 1 || y === h - 1 || !(d[i + 1] >>> 24) || !(d[i + w] >>> 24)) out[i] = du;
  }
  d.set(out);
  return s;
}

// Cột đá có rãnh (đền mây, phế tích); broken = đỉnh gãy lởm chởm
export function colSpr(h, P, trim, broken, seed) {
  return cached(`col:${h}:${P.join()}:${trim}:${broken ? 1 : 0}:${seed}`, () => {
    const R = rng(seed * 31 + h);
    const s = new Buf(14, h + 2);
    const base = h + 1;
    const top = 5;
    // thân cột: từng cột điểm ảnh để đỉnh gãy không đều
    for (let x = 3; x <= 10; x++) {
      const y0 = broken ? top + 1 + ((R() * 6) | 0) : top + 2;
      const c = x < 5 ? P[0] : x === 6 || x === 9 ? P[2] : x === 10 ? P[3] : P[1];
      s.r(x, y0, 1, base - 5 - y0, c);
      if (broken) s.p(x, y0, x < 7 ? P[0] : P[1]);
    }
    for (let y = top + 6; y < base - 6; y += 9 + ((R() * 5) | 0)) s.p(4 + ((R() * 6) | 0), y, P[3]);
    if (!broken) {
      s.r(1, top, 12, 2, P[1]); s.r(1, top, 12, 1, P[0]);
      s.r(0, top - 3, 14, 3, P[1]); s.r(0, top - 3, 14, 1, P[0]); s.r(0, top - 1, 14, 1, P[2]);
      if (trim) { s.r(1, top + 1, 12, 1, trim); s.r(0, top - 2, 14, 1, trim); s.p(0, top - 2, shd(trim, 0.4)); }
    }
    s.r(1, base - 5, 12, 2, P[1]); s.r(1, base - 5, 12, 1, P[0]);
    s.r(0, base - 3, 14, 3, P[2]); s.r(0, base - 3, 14, 1, P[1]);
    if (trim) s.r(1, base - 4, 12, 1, trim);
    return s.outline(0.55);
  });
}

// Tượng thần hộ vệ cổ (tự thiết kế): bệ vuông, áo choàng, mũ cao, tay khoanh
export function statueSpr(P, seed) {
  return cached(`statue:${P.join()}:${seed}`, () => {
    const s = new Buf(24, 42);
    const cx = 12;
    s.r(2, 33, 20, 9, P[1]);
    s.poly([[cx - 5, 14], [cx + 5, 14], [cx + 8, 33], [cx - 8, 33]], P[1]);
    s.ell(cx, 10, 4.5, 5, P[1]);
    s.r(cx - 3, 0, 6, 6, P[1]);
    s.r(cx - 4, 0, 8, 2, P[1]);
    s.r(cx - 7, 15, 3, 9, P[1]); s.r(cx + 4, 15, 3, 9, P[1]);
    edgeShade(s, P[0], P[2]);
    // nếp áo + tay khoanh + mặt
    s.r(cx - 6, 21, 12, 2, P[2]); s.r(cx - 6, 21, 12, 1, P[0]);
    s.r(cx - 1, 24, 1, 9, P[2]); s.r(cx + 3, 25, 1, 8, P[2]);
    s.p(cx - 2, 9, P[3]); s.p(cx + 1, 9, P[3]); s.r(cx - 1, 12, 2, 1, P[2]);
    s.r(cx - 4, 5, 8, 1, P[2]);
    s.r(3, 34, 18, 1, P[0]); s.r(2, 38, 20, 1, P[2]);
    for (let x = 5; x < 20; x += 4) s.p(x, 36, P[3]);
    // vết nứt + mẻ vai
    s.line(cx + 2, 15, cx + 5, 22, P[3]);
    if (seed & 1) { s.d.fill(0, 14 * 24 + cx + 4, 14 * 24 + cx + 8); s.d.fill(0, 15 * 24 + cx + 5, 15 * 24 + cx + 8); s.p(cx + 4, 15, P[2]); }
    return s.outline(0.6);
  });
}

// --------- Đồ vật nhỏ (dùng chung cho nhiều chủ đề)
// Màu theo làng/chủ đề cho đồ vật có vải sơn
const PROP_TINT = { fire: '#d8402a', water: '#2e6ad0', wind: '#3e9a48', sakura: '#d8405a', wood: '#c84a32', bamboo: '#3e9a48' };
export function sprProp(kind, seed, th) {
  return cached(`p:${kind}:${seed}:${th}`, () => {
    const R = rng(seed);
    let s;
    switch (kind) {
      case 'stonelantern': {
        s = new Buf(16, 30);
        const g = ['#c9c4bc', '#a39d94', '#7c766e', '#58534d'];
        s.r(4, 26, 8, 3, g[2]); s.r(5, 25, 6, 1, g[1]);
        s.r(6, 16, 4, 9, g[1]); s.r(6, 16, 1, 9, g[0]); s.r(9, 16, 1, 9, g[2]);
        s.r(3, 14, 10, 2, g[1]); s.r(3, 14, 10, 1, g[0]);
        s.r(4, 8, 8, 6, g[2]); s.r(6, 9, 4, 4, '#ffd27a'); s.r(7, 10, 2, 2, '#fff2c0');
        s.r(4, 8, 1, 6, g[1]);
        s.poly([[1, 8], [8, 3], [15, 8]], g[1]); s.r(1, 7, 14, 2, g[2]); s.r(2, 6, 6, 1, g[0]);
        s.r(7, 1, 2, 3, g[1]);
        break;
      }
      case 'lanternpost': {
        s = new Buf(14, 42);
        s.r(6, 8, 2, 34, '#4a2e22'); s.r(6, 8, 1, 34, '#6e4630');
        s.r(2, 6, 10, 2, '#3a2418');
        s.r(3, 10, 8, 2, '#2a1a14');
        lanternDraw(s, 7, 12, 1);
        break;
      }
      case 'barrel': {
        s = new Buf(14, 16);
        const w = ['#c08a52', '#9a6a3e', '#74502e'];
        s.ell(7, 8, 6, 7.5, w[1]); s.r(2, 3, 2, 10, w[0]); s.r(10, 3, 2, 10, w[2]);
        s.r(1, 4, 12, 1, '#5a5a62'); s.r(1, 11, 12, 1, '#5a5a62'); s.r(3, 1, 8, 1, w[2]);
        break;
      }
      case 'crate': {
        s = new Buf(14, 13);
        s.r(1, 1, 12, 11, '#b08450'); s.r(1, 1, 12, 1, '#d0a46c'); s.r(1, 11, 12, 1, '#7a5430');
        s.line(2, 2, 11, 10, '#8a6038'); s.r(1, 1, 1, 11, '#8a6038'); s.r(12, 1, 1, 11, '#8a6038');
        break;
      }
      case 'fence': {
        s = new Buf(40, 14);
        const w = th === 'bamboo' ? ['#c8d87a', '#98b04e', '#6a8434'] : ['#b08a62', '#8a6644', '#5e432c'];
        for (let i = 0; i < 6; i++) { const x = 2 + i * 7; s.r(x, 2, 3, 12, w[1]); s.r(x, 2, 1, 12, w[0]); s.p(x + 1, 1, w[1]); s.r(x + 2, 3, 1, 11, w[2]); }
        s.r(0, 5, 40, 2, w[1]); s.r(0, 5, 40, 1, w[0]); s.r(0, 10, 40, 2, w[1]); s.r(0, 11, 40, 1, w[2]);
        if (th === 'bamboo') for (let i = 0; i < 6; i++) { s.p(3 + i * 7, 6, '#7a5a3a'); s.p(3 + i * 7, 11, '#7a5a3a'); }
        break;
      }
      case 'well': {
        s = new Buf(34, 40);
        const g = ['#bdb7ae', '#958f86', '#6e6962'];
        s.r(5, 26, 24, 13, g[1]);
        for (let y = 27; y < 39; y += 4) for (let x = 5 + ((y >> 2) & 1) * 3; x < 29; x += 6) { s.r(x, y, 5, 3, g[0]); s.p(x + 4, y + 2, g[2]); }
        s.r(4, 24, 26, 3, '#7a5a3a'); s.r(4, 24, 26, 1, '#a07a50');
        s.r(6, 8, 2, 17, '#5a3a26'); s.r(26, 8, 2, 17, '#5a3a26');
        s.poly([[1, 9], [17, 1], [33, 9], [30, 10], [4, 10]], th === 'water' ? '#3a6fb8' : th === 'wind' ? '#4a9a52' : '#c8452e');
        s.r(2, 9, 30, 2, '#2a1a18');
        s.r(7, 12, 20, 1, '#6e4a30'); s.line(17, 12, 17, 18, '#8a7a6a'); s.r(15, 18, 5, 4, '#8a5a34');
        break;
      }
      case 'cart': {
        s = new Buf(44, 30);
        s.r(4, 12, 30, 9, '#a8784a'); s.r(4, 12, 30, 2, '#c8985e'); s.r(4, 20, 30, 1, '#6e4a2e');
        s.r(4, 6, 2, 7, '#7a5232'); s.r(32, 6, 2, 7, '#7a5232'); s.r(3, 5, 32, 2, '#c84a32');
        s.line(34, 18, 43, 22, '#6e4a2e');
        s.ell(14, 23, 6.5, 6.5, '#4a3020'); s.ell(14, 23, 4.5, 4.5, '#a8784a'); s.ell(14, 23, 1.5, 1.5, '#4a3020');
        for (let a = 0; a < 6; a++) s.line(14, 23, 14 + Math.cos(a) * 4.5, 23 + Math.sin(a) * 4.5, '#6e4a2e');
        // hàng hóa
        s.r(8, 8, 8, 5, '#d8c090'); s.r(18, 9, 10, 4, '#7aa04a'); s.r(8, 8, 8, 1, '#f0dcb0');
        break;
      }
      case 'boat': {
        s = new Buf(50, 20);
        s.poly([[0, 8], [49, 8], [42, 17], [7, 17]], '#9a6a3e');
        s.r(1, 8, 48, 2, '#c08a52'); s.r(8, 15, 34, 2, '#6e4a2e');
        s.r(24, 0, 2, 9, '#6e4a2e'); s.poly([[26, 1], [36, 6], [26, 7]], '#f0e8d8');
        break;
      }
      case 'board': {
        s = new Buf(30, 34);
        s.r(3, 8, 2, 26, '#5a3a26'); s.r(25, 8, 2, 26, '#5a3a26');
        s.r(2, 8, 26, 18, '#8a6040'); s.r(3, 9, 24, 16, '#b08454');
        s.poly([[0, 8], [15, 2], [30, 8]], '#4a3a30'); s.r(0, 7, 30, 2, '#2a1e18');
        s.r(5, 11, 7, 8, '#f6eedc'); s.r(14, 12, 6, 6, '#fff8e8'); s.r(21, 11, 5, 9, '#f0e4c8');
        s.r(6, 13, 5, 1, '#9a8a7a'); s.r(6, 15, 4, 1, '#9a8a7a'); s.r(15, 14, 4, 1, '#c0392b'); s.r(22, 13, 3, 1, '#9a8a7a');
        s.p(8, 11, '#c0392b'); s.p(16, 12, '#c0392b'); s.p(23, 11, '#c0392b');
        break;
      }
      case 'anvil': {
        s = new Buf(16, 12);
        s.r(4, 8, 8, 4, '#5a3a26'); s.r(2, 2, 12, 3, '#5c5e66'); s.r(2, 2, 12, 1, '#8a8c96'); s.r(0, 2, 3, 2, '#5c5e66'); s.r(5, 5, 6, 3, '#45474e');
        break;
      }
      case 'pots': {
        s = new Buf(20, 12);
        s.ell(5, 7, 4.5, 4.5, '#a0583a'); s.ell(5, 6, 2.5, 2, '#c87a52'); s.r(3, 2, 5, 1, '#7a3e28');
        s.ell(14, 8, 4, 3.5, '#4a6e8a'); s.ell(13, 7, 2, 1.5, '#7a9ab8');
        s.r(12, 2, 3, 3, '#6aa04a'); s.p(11, 1, '#8ac860'); s.p(15, 1, '#8ac860');
        break;
      }
      case 'bench': {
        s = new Buf(30, 10);
        s.r(0, 3, 30, 3, '#b0303a'); s.r(0, 3, 30, 1, '#d04a50'); s.r(2, 6, 2, 4, '#5a3a26'); s.r(26, 6, 2, 4, '#5a3a26');
        s.r(-1, 0, 32, 3, '#e8d8b8');
        s.r(10, 1, 3, 2, '#ffffff'); s.r(18, 1, 3, 2, '#ffffff');
        break;
      }
      case 'shell': {
        s = new Buf(16, 6);
        s.ell(4, 4, 3, 2.5, '#ffccbc'); s.r(2, 3, 1, 2, '#e8a090'); s.r(5, 3, 1, 2, '#e8a090');
        s.ell(12, 5, 2, 1.5, '#fff3e0');
        break;
      }
      case 'starfish': {
        s = new Buf(10, 8);
        const c = '#ff8a65';
        s.r(4, 1, 2, 6, c); s.r(1, 3, 8, 2, c); s.p(2, 6, c); s.p(7, 6, c); s.p(4, 2, '#ffccbc');
        break;
      }
      case 'coral': {
        s = new Buf(20, 18);
        const c = R() < 0.5 ? ['#ff8a80', '#ff5252', '#c62828'] : ['#ffab91', '#ff7043', '#d84315'];
        s.line(10, 17, 10, 4, c[1], 2); s.line(10, 12, 4, 6, c[1], 2); s.line(10, 10, 16, 3, c[1], 2); s.line(5, 7, 3, 2, c[0]); s.line(15, 4, 17, 1, c[0]);
        s.r(4, 15, 12, 3, '#8a8f98'); s.r(5, 14, 10, 1, '#a3a8b0');
        break;
      }
      case 'reed': {
        s = new Buf(16, 28);
        for (let i = 0; i < 5; i++) {
          const x = 2 + i * 3;
          const h = 16 + ((R() * 10) | 0);
          s.line(x, 27, x + (i - 2) * 0.8, 27 - h, i & 1 ? '#7a9a3a' : '#5e7e2c');
          if (i % 2 === 0) { s.r(x - 1 + (i - 2) * 0.8, 27 - h - 3, 2, 5, '#8d6e53'); s.p(x + (i - 2) * 0.8, 27 - h - 3, '#a8886a'); }
        }
        break;
      }
      case 'bones': {
        s = new Buf(20, 8);
        s.r(2, 5, 10, 2, '#eeeae0'); s.r(1, 4, 2, 2, '#ffffff'); s.r(1, 6, 2, 2, '#d8d2c4'); s.r(11, 4, 2, 2, '#ffffff'); s.r(11, 6, 2, 2, '#d8d2c4');
        s.ell(16, 4, 3.2, 3, '#e8e2d4'); s.r(15, 3, 1, 2, '#2a2020'); s.r(17, 3, 1, 2, '#2a2020'); s.r(14, 6, 5, 2, '#d0c8b8');
        break;
      }
      case 'skull': {
        s = new Buf(12, 11);
        s.ell(6, 5, 5, 4.6, '#ece6d8'); s.ell(4.5, 3.5, 2, 1.5, '#ffffff'); s.r(3, 8, 6, 3, '#d4ccbc');
        s.r(3, 5, 2, 2, '#2a1a1a'); s.r(7, 5, 2, 2, '#2a1a1a'); s.p(6, 7, '#2a1a1a'); s.p(4, 10, '#8a8274'); s.p(7, 10, '#8a8274');
        break;
      }
      case 'grave': {
        s = new Buf(16, 20);
        const g = ['#b4b8bc', '#8e9296', '#6a6e72'];
        s.r(3, 5, 10, 14, g[1]); s.ell(8, 5, 5, 4, g[1]); s.r(3, 5, 2, 14, g[0]); s.r(11, 5, 2, 14, g[2]);
        s.r(7, 7, 2, 7, g[2]); s.r(5, 9, 6, 2, g[2]);
        s.r(1, 18, 14, 2, '#5d7050'); s.p(2, 17, '#7a9a5a'); s.p(13, 17, '#7a9a5a');
        break;
      }
      case 'mushroomglow': {
        s = new Buf(18, 14);
        const cap = th === 'cave' ? ['#b3f0ff', '#4fc3f7', '#1e88c8'] : ['#f0b8ff', '#ba68c8', '#7b3a9e'];
        s.r(4, 7, 2, 7, '#e6dcf0'); s.ell(5, 6, 4.5, 3, cap[1]); s.ell(4, 5, 2, 1.2, cap[0]); s.p(3, 7, cap[2]); s.p(7, 6, cap[0]);
        s.r(12, 9, 2, 5, '#e6dcf0'); s.ell(13, 8.5, 3.5, 2.2, cap[1]); s.p(12, 7, cap[0]);
        s.r(8, 12, 1, 2, '#e6dcf0'); s.ell(8.5, 11.5, 2, 1.2, cap[1]);
        break;
      }
      case 'pumpkin': {
        s = new Buf(16, 13);
        s.ell(8, 8, 7, 5, '#e8742a'); s.ell(5, 8, 2, 4.5, '#f59a3a'); s.ell(11, 8, 2, 4.5, '#c85a1e');
        s.r(7, 1, 2, 3, '#4a6a2a');
        s.r(5, 6, 2, 2, '#ffe066'); s.r(10, 6, 2, 2, '#ffe066'); s.r(6, 10, 5, 1, '#ffe066');
        break;
      }
      case 'snowman': {
        s = new Buf(18, 24);
        s.ell(9, 17, 7, 6.5, '#ffffff'); s.ell(9, 8, 5, 4.6, '#ffffff');
        s.ell(11, 19, 4, 3, '#dbe9f5'); s.ell(10.5, 9.5, 2.5, 2, '#dbe9f5');
        s.r(5, 1, 8, 2, '#3a3a4a'); s.r(6, -2, 6, 3, '#3a3a4a');
        s.p(7, 7, '#212121'); s.p(10, 7, '#212121'); s.r(9, 9, 3, 1, '#ff7043');
        s.r(4, 12, 10, 2, '#e53935'); s.r(12, 13, 2, 4, '#c62828');
        s.line(2, 12, 0, 9, '#6d4c41'); s.line(16, 12, 17, 8, '#6d4c41');
        break;
      }
      case 'icespike': {
        s = new Buf(26, 34);
        for (const [x, h, w] of [[6, 18, 5], [13, 32, 7], [20, 22, 5]]) {
          s.poly([[x - w / 2, 33], [x, 33 - h], [x + w / 2, 33]], '#a8dcf4');
          s.poly([[x, 33 - h], [x + w / 2, 33], [x, 33]], '#6fb4dc');
          s.line(x - 1, 33 - h * 0.7, x - w / 2 + 1, 32, '#ffffff');
        }
        break;
      }
      case 'stalag': {
        const pal = th === 'lava' ? ['#6a4440', '#4a3030', '#332020'] : ['#7a6e90', '#5a5070', '#3e3652'];
        s = new Buf(22, 30);
        for (const [x, h, w] of [[11, 28, 9], [5, 14, 6], [17, 18, 6]]) {
          s.poly([[x - w / 2, 30], [x - 0.5, 30 - h], [x + 0.5, 30 - h], [x + w / 2, 30]], pal[1]);
          s.poly([[x, 30 - h], [x + w / 2, 30], [x + 1, 30]], pal[2]);
          s.line(x - 1, 30 - h + 3, x - w / 2 + 1, 29, pal[0]);
          for (let y = 30 - h + 4; y < 29; y += 5) s.p(x, y, pal[2]);
        }
        break;
      }
      case 'pillar': {
        const pal = th === 'desert' || th === 'ruins' ? ['#f0d8a8', '#d8b67c', '#b08a54', '#8a6a40'] : th === 'hell' || th === 'lava' ? ['#7a5a5a', '#5a4040', '#402c2c', '#2a1c1c'] : th === 'abyss' ? ['#6a4a7a', '#4c3460', '#342246', '#22162e'] : ['#d8d8d8', '#b4b4b4', '#8a8a8a', '#666666'];
        const h = 34 + ((R() * 22) | 0);
        s = new Buf(20, h + 4);
        const top = 4;
        s.r(3, top + 4, 14, h - 6, pal[1]);
        for (let x = 4; x < 16; x += 3) s.r(x, top + 5, 1, h - 8, pal[2]);
        s.r(3, top + 4, 2, h - 6, pal[0]); s.r(15, top + 4, 2, h - 6, pal[3]);
        s.r(1, h - 1, 18, 4, pal[2]); s.r(1, h - 1, 18, 1, pal[1]);
        // đỉnh gãy
        s.r(1, top + 1, 18, 3, pal[1]); s.r(1, top + 1, 18, 1, pal[0]);
        s.poly([[3, top + 1], [7, top - 3], [11, top], [14, top - 2], [17, top + 1]], pal[1]);
        s.r(4, top + 14, 3, 2, pal[3]); s.r(12, top + 22, 3, 3, pal[3]);
        if (th === 'hell' || th === 'lava') { s.r(6, top + 18, 1, 6, '#ff7a2a'); s.r(13, top + 9, 1, 4, '#ff9a3a'); }
        if (th === 'abyss') { s.r(6, top + 18, 1, 6, '#d040ff'); s.r(13, top + 9, 1, 4, '#ff6ad8'); }
        if (th === 'desert' || th === 'ruins') { s.r(1, h, 18, 2, '#e8c07a'); }
        break;
      }
      case 'torch': {
        s = new Buf(10, 30);
        s.r(4, 8, 2, 22, '#5a3a26'); s.r(4, 8, 1, 22, '#7a5232');
        s.r(2, 6, 6, 3, '#4a4a52'); s.r(2, 6, 6, 1, '#7a7a86'); s.r(3, 4, 4, 2, '#3a3a40');
        break;
      }
      case 'banner': {
        s = new Buf(20, 64);
        s.r(2, 2, 2, 62, '#5d4037'); s.r(2, 2, 1, 62, '#8d6e63'); s.ell(3, 2, 2, 2, '#ffd54f');
        s.r(0, 62, 6, 2, '#4a3020');
        break;
      }
      case 'rack': {
        s = new Buf(24, 26);
        s.r(2, 4, 2, 22, '#6e4a30'); s.r(20, 4, 2, 22, '#6e4a30'); s.r(1, 6, 22, 2, '#8a6040'); s.r(1, 16, 22, 2, '#8a6040');
        s.line(6, 2, 6, 24, '#c0c4cc'); s.r(5, 13, 3, 1, '#7a5232');
        s.line(11, 3, 11, 24, '#8a6040'); s.poly([[9, 3], [11, -1], [13, 3]], '#c0c4cc');
        s.line(17, 4, 17, 24, '#8a6040'); s.r(15, 3, 5, 2, '#9aa0aa');
        break;
      }
      case 'spikes': {
        s = new Buf(24, 14);
        const sp = th === 'abyss' ? ['#3a2448', '#6a4a80', '#e050ff'] : ['#4a3a3a', '#7a6060', '#c84a2a'];
        for (let i = 0; i < 5; i++) { const x = 2 + i * 5; const h = 7 + ((i * 7) % 6); s.poly([[x - 2, 14], [x, 14 - h], [x + 2, 14]], sp[0]); s.line(x, 14 - h, x - 1, 13, sp[1]); s.p(x, 14 - h, sp[2]); }
        break;
      }
      // ---- làng
      case 'potplant': {
        // cây cảnh dáng thông trong chậu men
        s = new Buf(20, 22);
        const pot = th === 'water' ? ['#7aa8e0', '#3a6aaa', '#244a80'] : th === 'wind' ? ['#9ad0a0', '#4a8a5a', '#2e6040'] : ['#e09060', '#a8502e', '#74321c'];
        s.poly([[3, 16], [17, 16], [15, 21], [5, 21]], pot[1]); s.r(2, 15, 16, 2, pot[0]); s.r(2, 16, 16, 1, pot[2]);
        s.r(5, 20, 10, 1, pot[2]); s.r(4, 17, 2, 3, pot[0]);
        s.line(10, 15, 8, 11, '#6a4428', 2); s.line(8, 11, 12, 6, '#6a4428', 2); s.line(9, 10, 4, 8, '#6a4428');
        const lf = ['#9ad06a', '#5a9a46', '#3a7036', '#264e28'];
        blob(s, 5, 7, 4, 2.6, lf); blob(s, 13, 5, 5, 3, lf); blob(s, 10, 2.6, 3, 2, lf);
        break;
      }
      case 'flowerpot': {
        s = new Buf(16, 16);
        const fl = th === 'water' ? ['#8ab4ff', '#5a7ae8', '#ffffff'] : th === 'wind' ? ['#ffe066', '#ffb020', '#ffffff'] : ['#ff7a8a', '#e83a4a', '#ffd8a0'];
        s.poly([[3, 10], [13, 10], [12, 15], [4, 15]], '#b0603a'); s.r(2, 9, 12, 2, '#d08050'); s.r(2, 10, 12, 1, '#7a3a22'); s.r(4, 11, 1, 3, '#d08050');
        blob(s, 8, 6, 6, 4, ['#8ac860', '#5a9a46', '#3a7036', '#264e28'], { cut: 9 });
        for (let i = 0; i < 9; i++) { const x = 3 + ((i * 5) % 11); const y = 2 + ((i * 3) % 6); s.p(x, y, fl[i % 3 === 2 ? 1 : 0]); if (i % 3 === 0) s.p(x + 1, y, fl[2]); }
        break;
      }
      case 'rickshaw': {
        // xe kéo tay: bánh lớn, ghế sơn mài, mui vải, càng kéo chạm đất
        s = new Buf(42, 30);
        const c = ramp(PROP_TINT[th] || '#c84a32');
        s.line(26, 17, 41, 27, '#6e4a2e', 2); s.r(39, 27, 3, 2, '#4a3020');
        s.r(8, 12, 20, 8, c[1]); s.r(8, 12, 20, 1, c[0]); s.r(8, 19, 20, 1, c[2]); s.r(26, 12, 2, 8, c[2]);
        s.r(10, 9, 14, 3, '#f0e4c8'); s.r(10, 9, 14, 1, '#ffffff');
        s.poly([[7, 12], [9, 3], [15, 0], [21, 1], [19, 4], [13, 5], [11, 12]], c[2]);
        s.line(9, 4, 15, 1, c[1]); s.r(8, 11, 4, 1, c[3]);
        for (let y = 12; y < 30; y++) for (let x = 5; x < 24; x++) {
          const d = Math.hypot(x + 0.5 - 14, y + 0.5 - 21);
          if (d <= 8.5 && d > 6.4) s.p(x, y, d > 7.6 ? '#3a2416' : x + y < 33 ? '#a07040' : '#6e4a2e');
        }
        for (let a = 0; a < 8; a++) s.line(14, 21, 14 + Math.cos(a * 0.785) * 7, 21 + Math.sin(a * 0.785) * 7, '#8a6038');
        s.ell(14, 21, 1.6, 1.6, '#c8a060');
        break;
      }
      case 'taiko': {
        // trống taiko nhìn chéo 3/4: thân gỗ hình thùng trên giá chữ X, mặt da có dấu tam ba đỏ
        s = new Buf(30, 28);
        s.line(6, 27, 21, 15, '#4a2e1e', 2); s.line(25, 27, 10, 15, '#5a3a26', 2);
        s.r(4, 26, 5, 2, '#3a2418'); s.r(22, 26, 5, 2, '#3a2418');
        const WD = ['#e07a52', '#b8482c', '#8a3020', '#5e1e16'];
        for (let x = 10; x <= 26; x++) {
          const f = (x - 10) / 16;
          const hh = Math.round(8 + Math.sin(f * Math.PI) * 2);
          for (let y = 12 - hh; y <= 12 + hh; y++) {
            const v = (y - (12 - hh)) / (hh * 2);
            s.p(x, y, v < 0.18 ? WD[0] : v < 0.62 ? WD[1] : v < 0.86 ? WD[2] : WD[3]);
          }
          if ((x - 10) % 5 === 4) for (let y = 13 - hh; y < 12 + hh; y++) s.p(x, y, WD[2]);
          // hàng đinh tán đồng ở mép trống
          if (x === 12 || x === 25) for (let y = 13 - hh; y < 12 + hh; y += 2) s.p(x, y, '#ffd54f');
        }
        s.ell(10, 12, 6.5, 10.5, '#3a1a12');
        s.ell(10, 12, 5.5, 9.5, '#efdcb4');
        s.ell(9, 10, 3.5, 6.5, '#fff6e0');
        // tam ba: ba dấu phẩy đỏ cùng màu xoáy quanh tâm
        for (let k = 0; k < 3; k++) {
          const a = k * 2.094 + 0.4;
          const hx = 10 + Math.cos(a) * 2.6 * 0.6;
          const hy = 12 + Math.sin(a) * 2.6;
          s.r(Math.round(hx) - 1, Math.round(hy) - 1, 2, 2, '#c8302a');
          for (let j = 1; j <= 3; j++) {
            const a2 = a + j * 0.5;
            s.p(10 + Math.cos(a2) * (2.6 + j * 0.7) * 0.6, 12 + Math.sin(a2) * (2.6 + j * 0.7), '#c8302a');
          }
        }
        s.p(10, 12, '#8a1e1a');
        // dùi trống gác trên thân
        s.line(17, 1, 23, 5, '#c8a070'); s.line(20, 0, 26, 4, '#b08a58');
        break;
      }
      case 'parasol': {
        // ô giấy lớn che ghế ngồi (kiểu quán trà ngoài trời)
        s = new Buf(36, 36);
        const c = ramp(PROP_TINT[th] || '#d8402a');
        s.r(17, 8, 2, 28, '#5a3a26');
        s.r(3, 27, 30, 3, '#b0303a'); s.r(3, 27, 30, 1, '#e05a5a'); s.r(5, 30, 2, 6, '#5a3a26'); s.r(29, 30, 2, 6, '#5a3a26');
        for (let x = 1; x < 35; x++) {
          const f = Math.abs(x - 17.5) / 17;
          const y0 = Math.round(2 + f * f * 9);
          const y1 = Math.round(8 + f * 4);
          for (let y = y0; y <= y1; y++) s.p(x, y, y === y0 ? c[0] : (x - 1) % 6 === 0 ? c[2] : x < 17 ? c[1] : shd(c[1], -0.1));
        }
        for (let x = 2; x < 34; x += 6) s.p(x, Math.round(9 + (Math.abs(x - 17.5) / 17) * 4), '#f0e4c8');
        s.r(17, 0, 2, 2, '#2a1a14');
        break;
      }
      case 'koipole': {
        s = new Buf(8, 74);
        s.r(3, 3, 2, 67, '#8a6a4a'); s.r(3, 3, 1, 67, '#b08a62');
        // bánh xe gió + quả cầu vàng trên đỉnh
        s.r(1, 3, 6, 1, '#e8e0d0'); s.r(3, 1, 2, 5, '#e8e0d0'); s.ell(4, 2, 1.5, 1.5, '#ffd54f'); s.p(3, 1, '#fff4c0');
        // chân đá
        s.r(1, 69, 6, 5, '#9a958c'); s.r(1, 69, 6, 1, '#c8c2b6'); s.r(6, 70, 1, 4, '#6a665e');
        break;
      }
      // ---- thiên cung
      case 'cloudpillar': {
        s = new Buf(24, 60);
        const col = colSpr(50, ['#ffffff', '#e8e6f4', '#bcb8d8', '#8a86b0'], '#f0b840', false, seed);
        blit(s, col, 5, 4);
        blob(s, 12, 55, 11, 5, CLOUD, { cut: 59, dither: false });
        blob(s, 6, 57, 6, 3, CLOUD, { cut: 59, dither: false });
        s.ell(12, 3, 3, 3, '#fff2b0'); s.p(11, 2, '#ffffff');
        return s;
      }
      case 'censer': {
        // lư hương đồng ba chân
        s = new Buf(20, 20);
        const b = ['#f4c870', '#c8903a', '#8a5a24', '#5a3a18'];
        s.r(4, 16, 2, 4, b[2]); s.r(14, 16, 2, 4, b[2]); s.r(9, 17, 2, 3, b[3]);
        s.ell(10, 12, 8, 5, b[1]); s.r(2, 8, 16, 2, b[1]);
        s.r(1, 6, 3, 4, b[2]); s.r(16, 6, 3, 4, b[2]);
        edgeShade(s, b[0], b[2]);
        s.r(4, 11, 12, 1, b[3]); for (let x = 5; x < 16; x += 3) s.p(x, 13, '#ffe8a0');
        s.ell(10, 7, 6, 2, b[2]); s.ell(10, 5, 4, 2.5, b[1]); s.r(9, 1, 2, 3, b[0]);
        break;
      }
      case 'lotus': {
        s = new Buf(18, 12);
        s.ell(9, 9.5, 8.5, 2.5, '#6ab07a'); s.ell(8, 9, 6, 1.5, '#8ad09a');
        const p = ['#ffffff', '#ffc4dc', '#ec7aa8', '#c04a80'];
        // cánh sen nhọn: ngoài hồng đậm, trong trắng
        for (const [x, l] of [[3, 3], [15, 3], [6, 5], [12, 5], [9, 7]]) {
          s.poly([[x - 2, 9], [x, 9 - l - 1], [x + 2, 9]], x === 9 ? p[1] : p[2]);
          s.line(x, 9 - l, x - 1, 8, p[0]);
          s.p(x, 9 - l - 1, p[3]);
        }
        s.r(8, 7, 3, 2, '#ffe066'); s.p(8, 7, '#fff8c0');
        break;
      }
      // ---- long cung
      case 'coralfan': {
        s = new Buf(30, 30);
        const c = [['#ffb0c8', '#f06a9a', '#b83a6a'], ['#ffc890', '#ff8a4a', '#c8582a'], ['#e0b0ff', '#b070e8', '#7a40b0']][seed % 3];
        const br = (x, y, a, len, d) => {
          const x2 = x + Math.cos(a) * len;
          const y2 = y + Math.sin(a) * len;
          s.line(x, y, x2, y2, d > 1 ? c[2] : c[1], d > 2 ? 2 : 1);
          if (d <= 0) { s.p(x2, y2, c[0]); s.p(x2 + 1, y2, c[0]); return; }
          br(x2, y2, a - 0.45, len * 0.75, d - 1);
          br(x2, y2, a + 0.4, len * 0.7, d - 1);
        };
        br(15, 26, -Math.PI / 2, 8, 3);
        s.ell(15, 27, 7, 3, '#8a8f98'); s.ell(14, 26.5, 5, 1.5, '#aab0b8');
        break;
      }
      case 'clam': {
        // sò khổng lồ mở miệng, ngọc trai phát sáng
        s = new Buf(24, 18);
        const sh = ['#c8b4f0', '#9a80d8', '#6a54a8', '#463478'];
        for (let x = 1; x < 23; x++) {
          const f = (x - 12) / 11;
          const top = Math.round(4 + f * f * 6 - ((x & 3) === 0 ? 1 : 0));
          for (let y = top; y < 9; y++) s.p(x, y, y === top ? sh[0] : x % 4 === 0 ? sh[2] : sh[1]);
          const bot = Math.round(17 - f * f * 3 + ((x & 3) === 2 ? 1 : 0));
          for (let y = 12; y < bot; y++) s.p(x, y, y === 12 ? sh[0] : x % 4 === 0 ? sh[3] : sh[2]);
        }
        s.r(3, 9, 18, 3, '#4ac8b8'); s.r(3, 9, 18, 1, '#8af0e0');
        s.ell(12, 10, 2.6, 2.6, '#f4f8ff'); s.p(11, 9, '#ffffff'); s.p(13, 11, '#c8d8e8');
        break;
      }
      case 'jadepillar': {
        s = new Buf(18, 56);
        const J = ['#c8f8e0', '#6ac8a4', '#3a9476', '#22604c'];
        s.r(4, 8, 10, 44, J[1]);
        edgeShade(s, J[0], J[2]);
        for (let y = 12; y < 50; y += 6) s.r(9, y, 1, 3, J[3]);
        for (const y of [8, 22, 38]) { s.r(3, y, 12, 2, '#e8b030'); s.r(3, y, 12, 1, '#fff0a0'); }
        s.r(1, 50, 16, 6, '#c8a060'); s.r(1, 50, 16, 1, '#f0d090'); s.r(1, 55, 16, 1, '#7a5a30');
        s.r(2, 4, 14, 4, '#c8302a'); s.r(2, 4, 14, 1, '#f0604a'); s.r(1, 3, 16, 1, '#e8b030');
        s.ell(9, 1.5, 2.5, 2.5, '#f4fbff'); s.p(8, 0, '#ffffff');
        break;
      }
      // ---- phế tích
      case 'obelisk': {
        s = new Buf(16, 48);
        const P = ['#f8e0b0', '#e0b880', '#b48a58', '#80603a'];
        s.poly([[3, 47], [5, 8], [11, 8], [13, 47]], P[1]); s.poly([[5, 8], [8, 1], [11, 8]], P[1]);
        edgeShade(s, P[0], P[2]);
        s.poly([[6, 7], [8, 2], [8, 7]], '#ffe8a0');
        for (let y = 12; y < 42; y += 5) { s.r(7, y, 2, 1, P[3]); s.p(7 + ((y >> 2) & 1), y + 2, P[3]); }
        s.r(1, 44, 14, 4, P[2]); s.r(1, 44, 14, 1, P[1]);
        break;
      }
      case 'fallen': {
        // đoạn cột đổ nằm ngang, đầu vỡ bên trái
        s = new Buf(42, 14);
        const P = ['#f8e0b0', '#e0b880', '#b48a58', '#80603a'];
        for (let x = 0; x < 34; x++) {
          const x0 = x + (x < 4 ? ((x * 7) % 3) : 0);
          for (let y = 3; y < 13; y++) s.p(x0, y, y < 5 ? P[0] : y === 7 || y === 10 ? P[2] : y > 11 ? P[3] : P[1]);
        }
        s.ell(35, 8, 4, 5, P[2]); s.ell(35, 8, 3, 4, P[1]); s.ell(35, 8, 1.5, 2, P[2]);
        s.r(0, 13, 42, 1, '#e8c07a');
        break;
      }
      case 'rubble': {
        s = new Buf(24, 12);
        const P = th === 'abyss' ? ['#6a4a7a', '#48305a', '#30203e', '#1e1428'] : ['#f8e0b0', '#e0b880', '#b48a58', '#80603a'];
        for (const [x, y, w, h] of [[1, 6, 9, 6], [9, 7, 8, 5], [16, 8, 7, 4], [5, 2, 7, 5], [12, 4, 5, 4]]) { s.r(x, y, w, h, P[1]); s.r(x, y, w, 1, P[0]); s.r(x, y, 1, h, P[0]); s.r(x + w - 1, y + 1, 1, h - 1, P[2]); s.r(x + 1, y + h - 1, w - 1, 1, P[2]); }
        break;
      }
      case 'urn': {
        s = new Buf(14, 16);
        s.ell(7, 10, 5.5, 5.5, '#b8683a'); s.r(5, 2, 4, 4, '#b8683a'); s.r(4, 1, 6, 2, '#b8683a');
        s.r(1, 6, 2, 4, '#9a5230'); s.r(11, 6, 2, 4, '#9a5230');
        edgeShade(s, '#e09a60', '#7a3e20');
        s.r(3, 9, 8, 1, '#2a1a14'); for (let x = 3; x < 11; x += 2) s.p(x, 10, '#f0d090');
        if (seed & 1) { s.d.fill(0, 1 * 14 + 4, 1 * 14 + 7); s.d.fill(0, 2 * 14 + 5, 2 * 14 + 7); }
        break;
      }
      // ---- hang pha lê / ma giới
      case 'geode': {
        s = new Buf(24, 16);
        const g = ['#8a80a0', '#6a6082', '#4c4466', '#34304a'];
        blob(s, 12, 16, 11, 12, g, { cut: 15, wob: 0.08, ph: 2 });
        s.ell(12, 12, 7, 5, '#2a1a40');
        const cc = ['#e0a0ff', '#a060f0', '#7ae8ff'];
        for (let i = 0; i < 6; i++) { const x = 7 + i * 2; const h = 2 + ((i * 5) % 4); s.poly([[x - 1, 15], [x, 15 - h - 1], [x + 1.5, 15]], cc[i % 3]); s.p(x, 15 - h, '#ffffff'); }
        break;
      }
      case 'thorn': {
        s = new Buf(28, 24);
        const v = ['#6a3a7a', '#4a2458', '#2e1638'];
        const vine = (x0, a, len, k) => {
          let x = x0;
          let y = 23;
          for (let i = 0; i < len; i++) {
            x += Math.cos(a + Math.sin(i * 0.25 + k) * 0.7);
            y += Math.sin(a + Math.sin(i * 0.25 + k) * 0.7);
            s.p(x, y, v[1]); s.p(x + 1, y, v[2]);
            if (i % 4 === 2) { s.p(x - 1, y - 1, v[0]); s.p(x - 2, y - 2, '#c8a0d8'); }
          }
          s.r(x - 1, y - 1, 2, 2, '#ff3a6a'); s.p(x - 1, y - 1, '#ffb0c8');
        };
        vine(6, -1.9, 18, 1); vine(13, -1.5, 22, 2); vine(20, -1.2, 16, 3); vine(10, -2.4, 12, 4);
        break;
      }
      case 'eyestalk': {
        // cuống thịt cong, gốc tỏa rễ, đầu là nhãn cầu có mí che nửa trên
        s = new Buf(18, 36);
        for (let y = 9; y < 36; y++) {
          const f = (y - 9) / 27;
          const x = Math.round(8 + Math.sin(y * 0.22 + 0.6) * 2.5 * (1 - f * 0.6));
          const tw = 2 + Math.round(f * 3);
          s.r(x - (tw >> 1), y, tw, 1, '#5a2a48');
          s.p(x - (tw >> 1), y, '#8a4a6a');
          if (tw > 2) s.p(x + tw - 1 - (tw >> 1), y, '#3a1830');
          if (y % 5 === 0) s.r(x - (tw >> 1), y, tw, 1, '#47203a');
        }
        s.line(8, 35, 2, 33, '#4a2240'); s.line(9, 35, 15, 32, '#4a2240'); s.line(8, 34, 4, 35, '#5a2a48');
        s.ell(8.5, 7, 6, 6, '#3a1830');
        s.ell(8.5, 7.5, 5, 4.6, '#ead2c0');
        s.ell(8.5, 9, 4.4, 2.6, '#c89c8c');
        s.ell(9, 7.5, 2.6, 2.6, '#d81e36');
        s.ell(9, 7.5, 1.7, 1.7, '#ff4a5a');
        s.r(9, 6, 1, 4, '#12060c');
        s.p(7, 6, '#ffffff');
        s.line(4, 9, 6, 8, '#c0403a'); s.line(13, 8, 11, 9, '#c0403a');
        // mí thịt trên
        for (let x = 3; x <= 14; x++) { const yy = Math.round(4 - Math.sin(((x - 3) / 11) * Math.PI) * 2.2); s.r(x, yy, 1, 7 - yy - 2, '#6a3456'); s.p(x, 7 - 2, '#2a0e20'); s.p(x, yy, '#9a5a7a'); }
        break;
      }
      case 'icecrystal': {
        return sprCrystal(16 + seed % 8, '#9fe4ff', seed);
      }
      default:
        s = new Buf(2, 2);
    }
    return s.outline();
  });
}

// đèn lồng giấy đỏ (dùng trong sprite)
export function lanternDraw(s, cx, y, sc = 1, col = '#e0352b') {
  const w = 7 * sc;
  const h = 9 * sc;
  s.r(cx - 1, y - 1, 2, 2, '#2a1a14');
  s.r(cx - w / 2 + 1, y + 1, w - 2, 1, '#2a1a14');
  s.ell(cx, y + 2 + h / 2, w / 2 + 0.5, h / 2, col);
  s.ell(cx - 0.5, y + 2 + h / 2, w / 2 - 1.5, h / 2 - 1, shd(col, 0.25));
  s.r(cx - 1, y + 3, 2, h - 2, '#ffd27a');
  for (let k = 1; k < 4; k++) s.r(cx - w / 2 + 1, y + 2 + (h * k) / 4, w - 2, 1, shd(col, -0.25));
  s.r(cx - w / 2 + 1, y + 2 + h, w - 2, 1, '#2a1a14');
  s.r(cx, y + 3 + h, 1, 2, '#e8b04a');
}
