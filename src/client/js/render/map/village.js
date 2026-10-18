// Làng Nhật: cửa hàng, đền, cổng torii, đồ trang trí thêm của làng.
import { shd, ramp, Buf, blit, blob, cached, pix } from './util.js';
import { VILLAGE } from './themes.js';
import { sprTree, sprBush } from './flora.js';
import { sprProp, lanternDraw } from './props.js';
import { roofDraw } from './backdrop.js';
import { lanternMini } from './terrain.js';

// ======================= Làng Nhật Bản =======================
const SHOP = {
  elder: { w: 124, wh: 40, noren: '#283593', icon: 'scroll', tiers: 2 },
  potion: { w: 98, wh: 34, noren: '#c2185b', icon: 'gourd' },
  smith: { w: 100, wh: 34, noren: '#37474f', icon: 'hammer', chimney: true, forge: true },
  task: { w: 94, wh: 32, noren: '#2e7d32', icon: 'note' },
  tele: { w: 94, wh: 32, noren: '#1565c0', icon: 'wheel' },
  clan: { w: 104, wh: 36, noren: '#6a1b9a', icon: 'crest', tiers: 2 },
  storage: { w: 100, wh: 36, noren: '#6d4c41', icon: 'box', kura: true },
  arena: { w: 96, wh: 34, noren: '#b71c1c', icon: 'sword' },
  dungeon: { shrine: true, icon: 'skull' },
  // quầy Sứ Giả Lễ Hội: rèm đỏ thắm, biển trăng rằm
  event: { w: 100, wh: 34, noren: '#c62828', icon: 'moon' },
};
const ICONS = {
  scroll: ['.yyyyy.', 'y.....y', '.wwwww.', '.wkkkw.', '.wwwww.', '.wkkw..', '.yyyyy.'],
  gourd: ['...k...', '..www..', '...r...', '..rrr..', '.rrrrr.', '.rrwrr.', '..rrr..'],
  hammer: ['.kkkkk.', '.kwwwk.', '.kkkkk.', '...b...', '...b...', '...b...', '...b...'],
  note: ['..yyy..', '..yyy..', '..yyy..', '..yyy..', '.......', '..yyy..', '..yyy..'],
  wheel: ['..yyy..', '.y.y.y.', 'y..y..y', 'yyyyyyy', 'y..y..y', '.y.y.y.', '..yyy..'],
  crest: ['...y...', '..yyy..', '.yy.yy.', 'yy.r.yy', '.yy.yy.', '..yyy..', '...y...'],
  box: ['yyyyyyy', 'ybbbbby', 'yyyyyyy', 'yb.y.by', 'yb.y.by', 'ybbbbby', 'yyyyyyy'],
  sword: ['......w', '.....w.', '....w..', '.y.w...', '..y....', '.b.y...', 'b......'],
  skull: ['.wwwww.', 'wwwwwww', 'wkwwwkw', 'wwwwwww', '.wwkww.', '.w.w.w.', '.......'],
  moon: ['..yyy..', '.yywyy.', 'yywyyyy', 'yyyyyby', 'yyyybby', '.yybby.', '..yyy..'],
};
const ICON_PAL = { y: '#ffd54f', w: '#fff8e8', k: '#2a1a14', r: '#e53935', b: '#a0703a' };

function shopSpr(type, vk) {
  return cached(`shop:${type}:${vk}`, () => {
    const v = VILLAGE[vk] || VILLAGE.fire;
    const o = SHOP[type] || SHOP.task;
    if (o.shrine) return shrineSpr(v);
    const w = o.w;
    const wh = o.wh;
    const rh = 17;
    const extraH = o.tiers === 2 ? 28 : o.chimney ? 8 : 0;
    const W = w + 36;
    const H = wh + rh + extraH + 16;
    const s = new Buf(W, H);
    const cx = Math.floor(W / 2);
    const base = H - 1;
    const wood = ramp(v.wood);
    const lights = [];
    const anims = [];
    const L = cx - w / 2;
    // móng đá + hiên gỗ
    s.r(L - 3, base - 3, w + 6, 4, '#8a857c');
    s.r(L - 3, base - 3, w + 6, 1, '#b8b2a8');
    for (let x = L; x < L + w; x += 9) s.r(x, base - 2, 1, 3, '#5e5a54');
    s.r(L - 5, base - 6, w + 10, 3, wood[1]);
    s.r(L - 5, base - 6, w + 10, 1, wood[0]);
    s.r(L - 5, base - 4, w + 10, 1, wood[2]);
    const wy = base - 6 - wh;
    s.r(L, wy, w, wh, v.wall);
    for (let y = wy + 4; y < base - 6; y += 7) for (let x = L + ((y * 3) % 5); x < L + w; x += 13) s.p(x, y, shd(v.wall, -0.05));
    // tường dưới
    const lowH = 10;
    const ly = base - 6 - lowH;
    if (o.kura) {
      s.r(L, ly, w, lowH, '#3e3e48');
      for (let x = L - lowH; x < L + w; x += 5) for (let k = 0; k < lowH; k++) { s.p(x + k, ly + k, '#d8d8d8'); s.p(x + lowH - k, ly + k, '#a8a8b0'); }
      s.r(L, ly, w, 1, '#222228');
    } else {
      s.r(L, ly, w, lowH, wood[1]);
      for (let x = L + 1; x < L + w; x += 3) s.r(x, ly + 1, 1, lowH - 1, wood[2]);
      s.r(L, ly, w, 1, wood[0]);
    }
    // cột gỗ + xà ngang
    const nP = 5;
    for (let i = 0; i < nP; i++) {
      const x = Math.round(L + ((w - 3) * i) / (nP - 1));
      s.r(x, wy, 3, wh, wood[2]);
      s.r(x, wy, 1, wh, wood[1]);
    }
    s.r(L, wy, w, 3, wood[2]);
    s.r(L, wy + 2, w, 1, wood[3]);
    s.r(L, ly - 2, w, 2, wood[2]);
    // cửa vào
    const dw = 28;
    const dh = wh - 14;
    const dx0 = cx - dw / 2;
    const dy0 = base - 6 - dh;
    s.r(dx0, dy0, dw, dh, '#3a2418');
    s.r(dx0 + 1, dy0 + dh - 8, dw - 2, 8, '#6e4222');
    s.r(dx0 + 1, dy0 + dh - 3, dw - 2, 3, '#a8662e');
    if (o.forge) {
      s.r(dx0 + 3, dy0 + dh - 12, 12, 12, '#55504c');
      s.r(dx0 + 3, dy0 + dh - 12, 12, 1, '#7a7470');
      s.r(dx0 + 5, dy0 + dh - 9, 8, 5, '#ff7a1a');
      s.r(dx0 + 6, dy0 + dh - 8, 6, 2, '#ffe08a');
      lights.push({ x: dx0 + 9 - cx, y: dy0 + dh - 8 - base, r: 40, col: '#ff6a1a', a: 0.55, f: 0.35 });
      s.r(dx0 + 18, dy0 + dh - 6, 8, 2, '#6a6c74');
    } else {
      // kệ hàng bên trong
      s.r(dx0 + 3, dy0 + 6, dw - 6, 1, '#7a5232');
      const goods = type === 'potion' ? ['#e53935', '#1e88e5', '#43a047', '#fdd835'] : ['#c8a060', '#a07040', '#d8c090'];
      for (let x = dx0 + 4; x < dx0 + dw - 4; x += 3) s.r(x, dy0 + 4, 2, 2, goods[((x - dx0) / 3) % goods.length | 0]);
      lights.push({ x: 0, y: dy0 + dh / 2 - base, r: 30, col: v.glow, a: 0.32, f: 0.1 });
    }
    s.r(dx0 - 2, dy0 - 2, dw + 4, 2, wood[3]);
    s.r(dx0 - 2, dy0, 2, dh, wood[3]);
    s.r(dx0 + dw, dy0, 2, dh, wood[3]);
    // rèm noren 4 mảnh
    const nc = ramp(o.noren);
    for (let k = 0; k < 4; k++) {
      const px = dx0 + k * 7;
      const len = 12 + (k & 1);
      s.r(px, dy0, 6, len, nc[1]);
      s.r(px, dy0, 1, len, nc[0]);
      s.r(px + 5, dy0, 1, len, nc[2]);
      s.r(px, dy0 + len - 1, 6, 1, nc[2]);
    }
    s.r(dx0 - 1, dy0, dw + 2, 1, nc[3]);
    s.ell(cx, dy0 + 6.5, 3.6, 3.6, '#f6efe0');
    s.ell(cx, dy0 + 6.5, 1.8, 1.8, nc[1]);
    // cửa sổ shoji sáng ấm
    for (const side of [-1, 1]) {
      const sw = Math.min(18, Math.round((w - dw) / 2 - 12));
      const sh = Math.min(13, wh - 18);
      const sx = side < 0 ? L + 7 : L + w - 7 - sw;
      const sy = wy + 6;
      s.r(sx - 1, sy - 1, sw + 2, sh + 2, wood[3]);
      s.r(sx, sy, sw, sh, '#ffe7ac');
      s.r(sx, sy, sw, 2, '#fff6d6');
      for (let x = sx + 3; x < sx + sw; x += 4) s.r(x, sy, 1, sh, '#c49a62');
      for (let y = sy + 3; y < sy + sh; y += 4) s.r(sx, y, sw, 1, '#c49a62');
      lights.push({ x: sx + sw / 2 - cx, y: sy + sh / 2 - base, r: 24, col: v.glow, a: 0.3, f: 0.06 });
    }
    // biển hiệu sơn mài với biểu tượng
    s.r(cx - 9, wy + 3, 19, 11, '#c8a040');
    s.r(cx - 8, wy + 4, 17, 9, '#2a1210');
    pix(s, cx - 3, wy + 5, ICONS[o.icon], ICON_PAL);
    // mái chính
    const eaveY = wy - 1;
    roofDraw(s, cx, eaveY, w / 2 + 13, rh, v.roof, w / 2 - 16);
    if (o.tiers === 2) {
      const w2 = Math.round(w * 0.58);
      const wy2 = eaveY - rh - 11;
      s.r(cx - w2 / 2, wy2, w2, 12, v.wall);
      s.r(cx - w2 / 2 + 3, wy2 + 3, w2 - 6, 6, '#ffe7ac');
      for (let x = cx - w2 / 2 + 6; x < cx + w2 / 2 - 3; x += 4) s.r(x, wy2 + 3, 1, 6, '#c49a62');
      s.r(cx - w2 / 2, wy2, 2, 12, wood[2]);
      s.r(cx + w2 / 2 - 2, wy2, 2, 12, wood[2]);
      roofDraw(s, cx, wy2 - 1, w2 / 2 + 11, 13, v.roof, w2 / 2 - 12);
      const ry = wy2 - 1 - 13 - 3;
      s.r(cx - w2 / 2 + 8, ry - 3, 3, 3, '#ffd54f');
      s.r(cx + w2 / 2 - 11, ry - 3, 3, 3, '#ffd54f');
      lights.push({ x: 0, y: wy2 + 6 - base, r: 26, col: v.glow, a: 0.25, f: 0.06 });
    }
    if (o.chimney) {
      const chx = cx + w / 2 - 24;
      const cy0 = eaveY - rh - 8;
      s.r(chx, cy0, 7, 14, '#7a726a');
      s.r(chx, cy0, 2, 14, '#9a928a');
      s.r(chx - 1, cy0 - 2, 9, 3, '#5a544e');
      anims.push({ k: 'smoke', x: chx + 3 - cx, y: cy0 - 3 - base });
    }
    // đèn lồng treo hai góc mái
    for (const side of [-1, 1]) {
      const lx = cx + side * (w / 2 + 3);
      lanternDraw(s, lx, eaveY + 3, 1);
      lights.push({ x: lx - cx, y: eaveY + 10 - base, r: 30, col: '#ff8a3a', a: 0.5, f: 0.3 });
    }
    s.outline(0.55);
    return { s, lights, anims, w, eave: eaveY - base };
  });
}

function shrineSpr(v) {
  const W = 96;
  const H = 66;
  const s = new Buf(W, H);
  const cx = W / 2;
  const base = H - 1;
  const g = ['#b8b0a4', '#958c80', '#706860', '#4e4842'];
  blob(s, cx, base + 6, 44, 58, g, { cut: base, wob: 0.06, lobes: 5, ph: 1 });
  blob(s, cx - 26, base + 2, 18, 24, g, { cut: base, wob: 0.1, ph: 2 });
  blob(s, cx + 28, base + 2, 16, 20, g, { cut: base, wob: 0.1, ph: 3 });
  // rêu
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (s.has(x, y) && !s.has(x, y - 2) && (x * 7) % 5 < 3) s.p(x, y, '#6a9a4a');
  // miệng hang
  s.ell(cx, base, 17, 30, '#1a1018');
  s.ell(cx, base + 2, 13, 24, '#0c060c');
  for (let i = 0; i < 6; i++) s.p(cx - 6 + i * 2, base - 4 - (i & 1) * 2, '#ff5252');
  // dây shimenawa + giấy shide
  for (let x = cx - 20; x <= cx + 20; x++) { const y = base - 30 + Math.round(Math.sin(((x - cx + 20) / 40) * Math.PI) * 4); s.p(x, y, '#e8d098'); s.p(x, y + 1, (x & 1) ? '#c8a868' : '#e8d098'); }
  for (const k of [-12, 0, 12]) { const y = base - 26 + (k ? 1 : 3); s.r(cx + k, y, 2, 2, '#ffffff'); s.r(cx + k - 1, y + 2, 2, 2, '#ffffff'); s.r(cx + k, y + 4, 2, 2, '#ffffff'); }
  // biển gỗ
  s.r(cx + 22, base - 22, 2, 22, '#5a3a26');
  s.r(cx + 17, base - 26, 12, 10, '#2a1210');
  s.r(cx + 17, base - 26, 12, 1, '#c8a040');
  pix(s, cx + 20, base - 24, ICONS.skull.slice(0, 6), ICON_PAL);
  s.outline(0.55);
  return { s, lights: [{ x: 0, y: -16, r: 26, col: '#ff3a3a', a: 0.3, f: 0.2 }], anims: [{ k: 'flame', x: -22, y: -26 }, { k: 'flame', x: 22, y: -30, skip: true }], w: 70, eave: -40 };
}

function toriiSpr(col = '#d8342a', big = true) {
  return cached(`torii:${col}:${big}`, () => {
    const W = big ? 76 : 52;
    const H = big ? 78 : 56;
    const s = new Buf(W, H);
    const C = ramp(col);
    const cx = W / 2;
    const pw = big ? 5 : 4;
    const px = big ? 24 : 17;
    for (const side of [-1, 1]) {
      const x = Math.round(cx + side * px - pw / 2);
      s.r(x, 12, pw, H - 12, C[1]);
      s.r(x, 12, 1, H - 12, C[0]);
      s.r(x + pw - 1, 12, 1, H - 12, C[2]);
      s.r(x - 1, H - 6, pw + 2, 6, '#2a2020');
      s.r(x - 1, H - 6, pw + 2, 1, '#4a3a3a');
    }
    // kasagi cong vểnh
    for (let x = 0; x < W; x++) {
      const f = Math.abs(x - cx) / (W / 2);
      const up = Math.round(Math.pow(f, 3) * 5);
      s.r(x, 4 - up, 1, 3, '#2a1a1a');
      s.r(x, 7 - up, 1, 3, C[1]);
      s.p(x, 7 - up, C[0]);
      s.p(x, 9 - up, C[2]);
    }
    // nuki
    s.r(4, 20, W - 8, 4, C[1]);
    s.r(4, 20, W - 8, 1, C[0]);
    s.r(4, 23, W - 8, 1, C[2]);
    // biển gakuzuka
    s.r(cx - 5, 9, 10, 11, '#2a1a1a');
    s.r(cx - 4, 10, 8, 9, '#3a2a20');
    s.r(cx - 2, 12, 4, 1, '#ffd54f');
    s.r(cx - 1, 14, 2, 3, '#ffd54f');
    // dây thừng shimenawa
    if (big) {
      for (let x = cx - px + 3; x < cx + px - 2; x++) { const y = 27 + Math.round(Math.sin(((x - cx + px) / (2 * px)) * Math.PI) * 3); s.p(x, y, '#e8d098'); s.p(x, y + 1, (x & 1) ? '#c8a868' : '#e8d098'); }
      for (const k of [-10, 0, 10]) { s.r(cx + k, 31 + (k ? 0 : 2), 2, 2, '#ffffff'); s.r(cx + k - 1, 33 + (k ? 0 : 2), 2, 2, '#ffffff'); }
    }
    return s.outline(0.6);
  });
}

export function buildVillage(T, m, th, sc, R, A) {
  const vk = th.town;
  const v = VILLAGE[vk];
  const G = m.ground;
  const npcs = (m.npcs || []).slice().sort((a, b) => a.x - b.x);
  const door = m.portals.find((p) => p.door);
  const houses = npcs.map((n) => ({ n, sp: shopSpr(n.type, vk) }));
  // cây lớn phía sau giữa các nhà
  const backTrees = [];
  for (let i = 0; i + 1 < houses.length; i++) {
    const a = houses[i];
    const b = houses[i + 1];
    const mid = (a.n.x + b.n.x) / 2;
    if (door && Math.abs(mid - door.x) < 60) { backTrees.push(door.x - 64, door.x + 64); continue; }
    backTrees.push(mid + (R() - 0.5) * 10);
  }
  if (houses.length) backTrees.push(houses[0].n.x - 80, houses[houses.length - 1].n.x + 76);
  for (const x of backTrees) {
    if (x < 70 || x > m.w - 70) continue;
    const kind = v.tree;
    const h = kind === 'bamboo' ? 110 + ((R() * 30) | 0) : 72 + ((R() * 14) | 0);
    const spr = sprTree(kind, h, (R() * 3) | 0);
    blit(T, spr, x - spr.w / 2, G - spr.h + 2);
  }
  // cổng torii (cửa dịch chuyển) + đèn đá hai bên
  if (door) {
    for (const d of [-44, 44]) { const sp = sprProp('stonelantern', 0, vk); blit(T, sp, door.x + d - 8, G - sp.h + 1); A.lights.push({ x: door.x + d, y: G - 19, r: 22, col: '#ffc060', a: 0.45, f: 0.2 }); }
    const tg = toriiSpr(vk === 'water' ? '#c83a3a' : vk === 'wind' ? '#d8462a' : '#e0402a');
    blit(T, tg, door.x - tg.w / 2, G - tg.h + 1);
  }
  // nhà / cửa hàng
  for (const { n, sp } of houses) {
    blit(T, sp.s, n.x - sp.s.w / 2, G - sp.s.h + 1);
    for (const l of sp.lights) A.lights.push({ ...l, x: n.x + l.x, y: G + l.y });
    for (const a of sp.anims) if (!a.skip) A.anims.push({ ...a, x: n.x + a.x, y: G + a.y });
  }
  // dây đèn lồng lễ hội (xen kẽ dây cờ đuôi nheo) giữa các mái nhà gần nhau
  const PEN = vk === 'water' ? ['#2e6ad0', '#ffffff', '#8ad0ff'] : vk === 'wind' ? ['#3e9a48', '#ffd54f', '#ffffff'] : ['#e0352b', '#ffd54f', '#ffffff'];
  for (let i = 0; i + 1 < houses.length; i++) {
    const a = houses[i];
    const b = houses[i + 1];
    if (b.n.x - a.n.x > 175) continue;
    const x1 = a.n.x + a.sp.w / 2 + 6;
    const x2 = b.n.x - b.sp.w / 2 - 6;
    const y1 = G + a.sp.eave + 2;
    const y2 = G + b.sp.eave + 2;
    if (x2 - x1 < 12) continue;
    let k = 0;
    const pen = (i & 1) === 1;
    for (let x = x1; x <= x2; x++) {
      const f = (x - x1) / (x2 - x1);
      const y = Math.round(y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * 7);
      T.p(x, y, '#3a2a20');
      if (pen) {
        if ((x - x1) % 5 === 2 && x < x2 - 2) {
          const c = PEN[k++ % 3];
          T.r(x - 1, y + 1, 3, 1, c); T.r(x - 1, y + 2, 2, 1, c); T.p(x, y + 3, c);
          T.p(x - 1, y + 1, shd(c, 0.3)); T.p(x + 1, y + 1, shd(c, -0.3));
        }
      } else if ((x - x1) % 9 === 4 && x < x2 - 2) {
        const c = k++ % 3 === 1 ? '#f0f0e8' : '#e0352b';
        lanternMini(T, x, y + 1, c);
        A.lights.push({ x, y: y + 4, r: 14, col: c === '#e0352b' ? '#ff7a3a' : '#fff0c0', a: 0.4, f: 0.3 });
      }
    }
  }
  // khoảng đã chiếm trên mặt đất (để đặt thêm đồ trang trí không chồng lấn)
  const occ = houses.map(({ n, sp }) => [n.x - sp.w / 2, n.x + sp.w / 2]);
  if (door) occ.push([door.x - 52, door.x + 52]);
  // đồ vật phía trước theo loại nhà
  for (const { n, sp } of houses) {
    const x = n.x;
    const put = (kind, dx, seed = 0) => { const p = sprProp(kind, seed, vk); blit(T, p, x + dx - p.w / 2, G - p.h + 1); occ.push([x + dx - p.w / 2, x + dx + p.w / 2]); return p; };
    if (n.type === 'smith') { put('anvil', -sp.w / 2 + 10); put('barrel', sp.w / 2 - 6); }
    else if (n.type === 'potion') { put('pots', -sp.w / 2 + 12); put('pots', sp.w / 2 - 12, 1); }
    else if (n.type === 'storage') { put('barrel', -sp.w / 2 + 4); put('crate', -sp.w / 2 + 16); put('crate', sp.w / 2 - 8); }
    else if (n.type === 'task') put('board', sp.w / 2 + 2);
    else if (n.type === 'tele') put(vk === 'water' ? 'boat' : 'cart', -sp.w / 2 - 6);
    else if (n.type === 'elder') { put('bench', -sp.w / 2 + 18); put('bench', sp.w / 2 - 18); }
    else if (n.type === 'clan') for (const d of [-sp.w / 2 - 4, sp.w / 2 + 4]) { const p = put('banner', d); A.anims.push({ k: 'nobori', x: x + d - p.w / 2 + 4, y: G - p.h + 4, col: '#6a1b9a' }); }
    else if (n.type === 'event') for (const d of [-sp.w / 2 - 4, sp.w / 2 + 4]) { put('lanternpost', d); A.lights.push({ x: x + d, y: G - 24, r: 28, col: '#ff8a3a', a: 0.5, f: 0.3 }); }
    else if (n.type === 'dungeon') {
      for (const d of [-40, 40]) { put('torch', d); A.anims.push({ k: 'flame', x: x + d, y: G - 28 }); A.lights.push({ x: x + d, y: G - 30, r: 30, col: '#ff8a2a', a: 0.55, f: 0.4 }); }
    }
  }
  // giếng, xe kéo, trống, ô giấy, chậu cây, cột đèn, cờ cá chép: lấp các khoảng trống còn lại
  villageExtras(T, m, vk, R, A, occ, backTrees);
  // hoa ven đường
  for (let i = 0; i < m.w / 50; i++) {
    const x = R() * m.w;
    if (m.portals.some((p) => Math.abs(p.x - x) < 40)) continue;
    const fl = sprBush(10 + ((R() * 6) | 0), i % 4, vk === 'fire' ? 'green' : vk === 'water' ? 'lush' : 'willow', vk === 'fire' ? ['#ff8ab0', '#ffffff'] : vk === 'water' ? ['#8ab4ff', '#ffffff'] : ['#ffe066', '#ffffff']);
    blit(T, fl, x - fl.w / 2, G - fl.h + 2);
  }
}

// Đồ trang trí thêm cho làng theo thứ tự ưu tiên; mỗi món đặt vào khoảng trống vừa nhất
const VILLAGE_EXTRAS = {
  fire: ['rickshaw', 'taiko', 'well', 'potplant', 'flowerpot', 'lanternpost', 'potplant', 'flowerpot'],
  water: ['parasol', 'well', 'rickshaw', 'potplant', 'flowerpot', 'lanternpost', 'potplant', 'flowerpot'],
  wind: ['koipole', 'parasol', 'well', 'rickshaw', 'potplant', 'flowerpot', 'lanternpost', 'potplant'],
};
// phần chiếm chỗ [trái, phải] tính từ tâm khi khác bề rộng sprite (cờ cá chép bay sang phải)
const EXTRA_SPAN = { koipole: [-3, 27] };
function villageExtras(T, m, vk, R, A, occ, backs = []) {
  const G = m.ground;
  // luật DESIGN_RULES: cách NPC >= 26px, cách cổng >= 70px
  const bad = (a, b) => a < 8 || b > m.w - 8
    || occ.some(([o0, o1]) => a < o1 + 3 && b > o0 - 3)
    || m.portals.some((p) => a < p.x + 70 && b > p.x - 70)
    || (m.npcs || []).some((n) => a < n.x + 26 && b > n.x - 26);
  const free = [];
  let s0 = -1;
  for (let x = 0; x <= m.w; x++) {
    const ok = x < m.w && !bad(x, x + 1);
    if (ok && s0 < 0) s0 = x;
    else if (!ok && s0 >= 0) { free.push([s0, x]); s0 = -1; }
  }
  for (const kind of VILLAGE_EXTRAS[vk] || VILLAGE_EXTRAS.fire) {
    const p = sprProp(kind, 0, vk);
    const sp = EXTRA_SPAN[kind] || [-Math.ceil(p.w / 2), Math.ceil(p.w / 2)];
    const need = sp[1] - sp[0];
    let bi = -1;
    let x = 0;
    if (kind === 'koipole') {
      // cột cờ cao: chọn chỗ xa cây phía sau nhất để cá chép không lẫn vào tán tre
      let best = -1;
      for (let i = 0; i < free.length; i++) {
        const [a, b] = free[i];
        for (let xx = a - sp[0]; xx <= b - sp[1]; xx += 2) {
          const d = backs.reduce((mn, bx) => Math.min(mn, Math.abs(bx - (xx + 12))), 999);
          if (d > best) { best = d; bi = i; x = xx; }
        }
      }
    } else {
      for (let i = 0; i < free.length; i++) if (free[i][1] - free[i][0] >= need && (bi < 0 || free[i][1] - free[i][0] < free[bi][1] - free[bi][0])) bi = i;
      if (bi >= 0) x = Math.round((free[bi][0] + free[bi][1]) / 2 - (sp[0] + sp[1]) / 2);
    }
    if (bi < 0) continue;
    const [a, b] = free[bi];
    free.splice(bi, 1, [a, x + sp[0] - 4], [x + sp[1] + 4, b]);
    blit(T, p, kind === 'koipole' ? x - 3 : x - p.w / 2, G - p.h + 1);
    if (kind === 'lanternpost') A.lights.push({ x, y: G - 24, r: 28, col: '#ff8a3a', a: 0.5, f: 0.3 });
    if (kind === 'koipole') A.anims.push({ k: 'koi', x: x + 1, y: G - 66 });
  }
}
