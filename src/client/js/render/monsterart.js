// Sprite quái vật — pixel art tự thiết kế, dựng thủ tục bằng code:
// hình khối (ellipse/đa giác/đường) -> tô 3 tông theo ánh sáng -> viền tối tự động -> chi tiết (mắt, má hồng...).
// Mỗi khung hình được dựng 1 lần rồi cache vào canvas offscreen theo (kiểu, biến thể, khung, bảng màu); nháy trắng cache riêng.
import * as SP from './sprites.js';
import { css } from './monster/palette.js';
import { whiteOf } from './monster/spr.js';
import { DESIGNS } from './monster/designs.js';
import { variantOf } from './monster/variants.js';
import { getSprite, defSpr } from './monster/cache.js';
import { glow, shadowSprite, crownSprite, CROWN_UP, BOSS_CROWN, bossCol, bossAura, rageAura } from './monster/boss.js';
import { ART, loadAtlas, atlasOf, atlasFrame, drawAtlas } from './monster/atlas.js';

// Chiều cao ninja (sprites.js có thể export NINJA_H)
const ninjaH = () => (typeof SP.NINJA_H === 'number' ? SP.NINJA_H : 22);
// Hàng đợi dựng sẵn: quái mới xuất hiện được dựng nốt các khung còn lại dần dần trong ngân sách mỗi khung hình,
// tránh giật khi nó bắt đầu đi/đánh lần đầu
const warmQ = [];
let warmWin = 0;
let warmUsed = 0;
const WARM_BUDGET = 1.5;
function frameList(def) {
  const D = DESIGNS[def.type];
  if (!D) return [];
  const out = [];
  for (const i of new Set(D.idle)) out.push(['idle', i, false], ['idle', i, true]);
  for (let i = 0; i < D.walk; i++) out.push(['walk', i, false]);
  out.push(['atk', 0, false], ['atk', 1, false]);
  return out;
}
function spriteFor(def, v, an, i, bl) {
  let arr = defSpr.get(def);
  if (!arr) {
    arr = [];
    defSpr.set(def, arr);
    for (const f of frameList(def)) warmQ.push([def, v, ...f]);
  }
  const k = (an === 'idle' ? 0 : an === 'walk' ? 1 : 2) * 32 + i * 2 + (bl ? 1 : 0);
  return arr[k] || (arr[k] = getSprite(def.type, v, an, i, def.pal, bl));
}
function pumpWarm() {
  const now = performance.now();
  if (now - warmWin > 16) { warmWin = now; warmUsed = 0; }
  while (warmQ.length && warmUsed < WARM_BUDGET) {
    const [def, v, an, i, bl] = warmQ.pop();
    const t0 = performance.now();
    spriteFor(def, v, an, i, bl);
    warmUsed += performance.now() - t0;
  }
}
// Khóa atlas ×3 của quái: boss ở art/boss/, quái thường ở art/monster/
const atlasKey = (def) => `${def.boss ? 'boss' : 'monster'}/${def.k}`;

// danh mục atlas ×3 gần nhất (S.G.art): monsterHeight lấy chiều cao ảnh ngay cả khi atlas chưa tải xong
let artIdx = null;

// Tùy chọn: dựng sẵn toàn bộ khung cho danh sách quái (ví dụ lúc vào bản đồ). Không bắt buộc gọi.
// art: danh mục atlas ×3 (S.G.art) → bắt đầu tải atlas của các loài có ảnh; chưa tải xong thì vẫn vẽ hình code
export function prewarmMonsters(defs, art) {
  if (art) artIdx = art;
  for (const def of defs || []) {
    if (!def) continue;
    if (art && def.k) loadAtlas(art, atlasKey(def));
    if (!DESIGNS[def.type]) continue;
    const v = variantOf(def);
    for (const [an, i, bl] of frameList(def)) spriteFor(def, v, an, i, bl);
    monsterHeight(def);
  }
}

// ================= VẼ =================
const atkStart = new Map();
const hitStart = new Map();
const DIE_CODE = 0.5;
// mờ dần sau khi hoạt ảnh chết của atlas đã chạy xong
const DIE_FADE = 0.4;

// Thời gian (giây) thực thể quái nằm trong danh sách đang chết trước khi biến mất
export function monsterDieTime(def) {
  const a = def && def.k ? atlasOf(atlasKey(def)) : null;
  return a && a.meta.anims.die ? a.meta.anims.die.dur + DIE_FADE : DIE_CODE;
}

// Khung atlas theo trạng thái: chết (o.die giây), trúng đòn, ra đòn, đi, đứng
function drawMonsterAtlas(ctx, a, x, y, o, id, t) {
  const A = a.meta.anims;
  const ga = ctx.globalAlpha;
  let an = A.idle;
  let el = t + (id % 53) * 0.37;
  if (o.die != null) {
    an = A.die;
    el = o.die;
    if (o.die > an.dur) ctx.globalAlpha = ga * Math.max(0, 1 - (o.die - an.dur) / DIE_FADE);
  } else if (o.flash && A.hit) {
    let h0 = hitStart.get(id);
    if (h0 == null || t - h0 > A.hit.dur) {
      h0 = t;
      if (hitStart.size > 300) hitStart.clear();
      hitStart.set(id, t);
    }
    an = A.hit;
    el = t - h0;
  } else if (o.st === 2) {
    let st0 = atkStart.get(id);
    if (st0 == null || t < st0) {
      st0 = t;
      if (atkStart.size > 300) atkStart.clear();
      atkStart.set(id, t);
    }
    an = A.atk;
    el = o.at != null ? o.at : t - st0;
  } else if (o.st === 1) an = A.walk;
  if (o.st !== 2 && atkStart.size && atkStart.has(id)) atkStart.delete(id);
  const f = atlasFrame(an, el);
  drawAtlas(ctx, a, x, y, o.dir || 1, an, f, false);
  if (o.flash && o.die == null) {
    ctx.globalAlpha = ga * 0.6;
    drawAtlas(ctx, a, x, y, o.dir || 1, an, f, true);
  }
  ctx.globalAlpha = ga;
}

export function drawMonster(ctx, x, y, def, o) {
  // lớp thế giới ×3 (ctx.art = 3): gốc làm tròn theo pixel nghệ thuật, canvas thường làm tròn theo đơn vị thế giới
  const q = ctx.art || 1;
  const snap = (v) => Math.round(v * q) / q;
  const atlas = def.k ? atlasOf(atlasKey(def)) : null;
  // quái chưa có atlas đang chết: mờ dần + chìm xuống trong 0.5 giây, phủ trắng
  if (o.die != null && !atlas) {
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * Math.max(0, 1 - o.die / DIE_CODE);
    drawMonster(ctx, x, y + o.die * 10, def, { t: o.t, dir: o.dir, st: 0, id: o.id, flash: true });
    ctx.globalAlpha = ga;
    return;
  }
  const t = o.t || 0;
  const s = Math.max(1, Math.round(def.scale || 1));
  const dir = o.dir || 1;
  const id = o.id || 0;
  const boss = !!def.boss;
  const accent = boss ? bossCol(def) : def.pal[2];
  // boss bị đánh liên tục: chỉ phủ trắng mờ, giữ hào quang/vương miện để không thành khối trắng
  const fx = !o.flash || boss;
  let fy = y;
  if (def.fly) fy -= 10 * s + Math.sin(t * 4 + id) * 3 * s;
  const rx0 = snap(x);

  // bóng
  const shw = Math.max(4, Math.round((def.w || 14) * (def.fly ? 0.32 : 0.45)));
  const sh = shadowSprite(shw, Math.max(1, Math.round(s * (def.fly ? 1 : 1.5))));
  ctx.drawImage(sh, rx0 - shw, snap(y - sh.height / 2));

  if (atlas) {
    // hào quang, cuồng nộ vẽ lúc chạy quanh hình atlas (không nướng vào ảnh)
    const visH = atlas.meta.h / ART;
    const cyc = snap(fy) - visH / 2;
    const aw = Math.max(def.w * 0.6, visH * 0.3);
    const rage = boss && !!o.rage;
    if (rage) rageAura(ctx, rx0, snap(y), cyc, aw, visH, s, t, false);
    if (boss && fx) bossAura(ctx, rx0, snap(y), cyc, aw, visH, s, accent.aura, t, false, accent.p2);
    drawMonsterAtlas(ctx, atlas, rx0, snap(fy), o, id, t);
    if (boss) {
      bossAura(ctx, rx0, snap(y), cyc, aw, visH, s, accent.aura, t, true, accent.p2);
      if (rage) rageAura(ctx, rx0, snap(y), cyc, aw, visH, s, t, true);
    }
    return;
  }
  if (!DESIGNS[def.type]) return;
  const D = DESIGNS[def.type];
  const v = variantOf(def);
  if (warmQ.length) pumpWarm();
  // chọn khung
  const ph = t + (id % 53) * 0.37;
  let an = 'idle';
  let fi = 0;
  let bl = false;
  if (o.st === 2) {
    let el = o.at;
    if (el == null) {
      let st0 = atkStart.get(id);
      if (st0 == null || t < st0) {
        st0 = t;
        if (atkStart.size > 300) atkStart.clear();
        atkStart.set(id, t);
      }
      el = t - st0;
    }
    an = 'atk';
    fi = el < 0.13 ? 0 : 1;
  } else {
    if (atkStart.size && atkStart.has(id)) atkStart.delete(id);
    if (o.st === 1 || D.always) {
      an = 'walk';
      const f = D.always && o.st !== 1 ? D.fps[0] : D.fps[1];
      fi = o.fr != null ? o.fr % D.walk : Math.floor(ph * f) % D.walk;
    } else {
      const k = Math.floor(ph * D.fps[0]);
      fi = o.fr != null ? D.idle[o.fr % D.idle.length] : D.idle[k % D.idle.length];
      bl = o.fr == null && k % 13 === 12;
    }
  }
  const sp = spriteFor(def, v, an, fi, bl);
  const W = sp.W * s;
  const H = sp.H * s;
  const left = rx0 - (sp.W / 2) * s;
  const top = snap(fy) - H;
  const sx = (px) => (dir > 0 ? left + px * s : rx0 + (sp.W / 2 - px) * s);
  const visH = (sp.H - sp.top) * s;
  const cyc = snap(fy) - visH / 2;
  const ghost = def.type === 'ghost';
  const ga = ctx.globalAlpha;

  const aw = Math.max(def.w * 0.6, sp.bw * s * 0.42);
  const rage = boss && !!o.rage;
  if (rage) rageAura(ctx, rx0, snap(y), cyc, aw, visH, s, t, false);
  if (boss && fx) bossAura(ctx, rx0, snap(y), cyc, aw, visH, s, accent.aura, t, false, accent.p2);
  if (ghost && fx) glow(ctx, rx0, cyc, Math.max(W, H) * 0.55, def.pal[0], 0.35 + 0.1 * Math.sin(t * 3 + id));

  // thân
  // Vân Linh mờ ít hơn để mây trắng không thành xám trên nền
  const gA = v === 'cloud' ? 0.86 : 0.72;
  if (ghost) ctx.globalAlpha = ga * (o.flash ? 0.9 : gA + 0.12 * Math.sin(t * 2.6 + id));
  const img = o.flash && !boss ? whiteOf(sp) : sp.img;
  const pass = o.flash && boss ? 2 : 1;
  for (let i = 0; i < pass; i++) {
    const im = i ? whiteOf(sp) : img;
    if (i) ctx.globalAlpha = ga * 0.55;
    if (dir > 0) ctx.drawImage(im, left, top, W, H);
    else {
      ctx.save();
      ctx.translate(rx0, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, -(sp.W / 2) * s, top, W, H);
      ctx.restore();
    }
  }
  ctx.globalAlpha = ga;

  if (!fx) return;
  // pha lê / lửa phát sáng
  if (sp.glow.length) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + id);
    for (const [gx, gy, r, col] of sp.glow) glow(ctx, sx(gx), top + gy * s, r * s * (0.9 + pulse * 0.2), col, 0.26 + pulse * 0.24);
  }
  if (boss) {
    // mắt phát sáng
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    for (const [ex, ey] of sp.eyes) {
      const px = sx(ex);
      const py = top + ey * s;
      glow(ctx, px, py, 3.2 * s, accent.eye, 0.65 * pulse);
      ctx.fillStyle = css(accent.eye, 0.9);
      ctx.fillRect(snap(px - s / 2), snap(py - s / 2), s, s);
    }
    bossAura(ctx, rx0, snap(y), cyc, aw, visH, s, accent.aura, t, true, accent.p2);
    if (rage) rageAura(ctx, rx0, snap(y), cyc, aw, visH, s, t, true);
    // vương miện (boss không có sừng/mũ riêng)
    if (BOSS_CROWN.has(def.k)) {
      const cr = crownSprite(accent.eye);
      const hx = sx(sp.head[0]);
      const hy = top + sp.head[1] * s;
      ctx.drawImage(cr.img, snap(hx - (cr.W / 2) * s), snap(hy - (CROWN_UP - 1) * s + Math.sin(t * 3) * s * 0.6), cr.W * s, cr.H * s);
    }
  }
}

export function monsterHeight(def) {
  const s = Math.max(1, Math.round(def.scale || 1));
  const e = artIdx && def.k ? artIdx[atlasKey(def)] : null;
  if (e && e.h) return e.h / ART + (def.fly ? 10 * s : 0);
  if (!DESIGNS[def.type]) return ninjaH() * s;
  const D = DESIGNS[def.type];
  const sp = getSprite(def.type, variantOf(def), D.always ? 'walk' : 'idle', D.always ? 0 : D.idle[0], def.pal, false);
  let topRow = sp.top;
  if (def.boss && BOSS_CROWN.has(def.k)) topRow = Math.min(topRow, Math.floor(sp.head[1]) - CROWN_UP);
  return (sp.H - topRow) * s + (def.fly ? 10 * s : 0);
}

// Tải atlas ×3 của loài (trang thư viện hình): Promise { img, meta } hoặc null khi loài chưa có ảnh
export function loadMonsterAtlas(art, def) {
  if (art) artIdx = art;
  return loadAtlas(art, atlasKey(def)).ready;
}
