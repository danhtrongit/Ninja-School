// Đồ họa nhân vật vẽ hoàn toàn bằng code (không dùng ảnh ngoài).
// Mọi hàm vẽ nhận ctx ở độ phân giải thấp (1 đơn vị = 1 pixel nghệ thuật).
// Ninja chibi được dựng từng điểm ảnh vào bộ đệm theo tư thế (pose), tự viền tối 1px,
// rồi cache vào canvas offscreen theo khóa (kiểu, khung, hướng, trang bị, bảng màu).
import { ELEMENT_COLORS, NINJA_H, CLASS_OUTFIT, TIER_OUTFIT, TIER_METAL, TIER_TRIM, HAIR, IRIS, SKIN, shade, hash, mixHash, C, sh, css } from './sprites/color.js';
import { makePalette } from './sprites/pixbuf.js';
import { MALE_HAIR, FEMALE_HAIR } from './sprites/body.js';
import { NFRAMES, buildFrame, rotateDead, bake, tinted, flipCanvas } from './sprites/frame.js';
import { NPCS } from './sprites/npc.js';
import { own, MASKS, CLOAKS, COSTUMES } from './sprites/fashion.js';
import { MOUNTS, MOUNT_BOB, mountEntry, ninjaHeight } from './sprites/mount.js';
export { ELEMENT_COLORS, NINJA_H } from './sprites/color.js';
export { mountOffset, ninjaHeight } from './sprites/mount.js';

export { shade };

// ================= SPEC + CACHE =================
const specCache = new Map();
const frameCache = new Map();
const atkState = new Map();

function tierOf(v) {
  return v == null || v < 0 ? -1 : Math.min(TIER_OUTFIT.length - 1, v | 0);
}

function buildSpec(o, key) {
  const look = o.look || {};
  const npc = o.npcType && NPCS[o.npcType] ? o.npcType : null;
  const female = o.gender === 'f';
  const hh = mixHash(o.name || '');
  const mon = !!o.pal && !npc;
  const pal = o.pal;
  const at = pal ? -1 : tierOf(look.a);
  const pt = pal ? -1 : tierOf(look.p);
  const ht = tierOf(look.h);
  const wt = tierOf(look.w);
  const accent = pal ? C(pal[1]) : C(ELEMENT_COLORS[o.el] || '#ff7043');
  const outfit = pal ? C(pal[0]) : at >= 0 ? C(TIER_OUTFIT[at]) : C(CLASS_OUTFIT[o.cls] || '#6a5a7a');
  let pants;
  if (pal) pants = sh(C(pal[0]), -0.4);
  else if (pt >= 0) pants = sh(C(TIER_OUTFIT[pt]), -0.32);
  else pants = 0x3c3650;
  let trim;
  if (pal) trim = sh(C(pal[0]), 0.45);
  else if (at < 0) trim = sh(outfit, 0.42);
  else trim = C(TIER_TRIM[at]);
  const sp = {
    key,
    npc,
    mon,
    female,
    hair: female ? FEMALE_HAIR[(hh >>> 2) % 4] : MALE_HAIR[(hh >>> 2) % 4],
    hairCol: pal ? C(pal[2]) : C(HAIR[(hh >>> 5) % HAIR.length]),
    skin: pal && pal[3] ? C(pal[3]) : C(SKIN[(hh >>> 9) % SKIN.length]),
    iris: mon ? 0xd8323c : C(IRIS[(hh >>> 7) % IRIS.length]),
    outfit,
    pants,
    trim,
    under: 0x2a2638,
    accent,
    bandCol: pal ? sh(C(pal[0]), -0.45) : ht >= 6 ? sh(C(TIER_OUTFIT[ht]), -0.2) : 0x3e4a7c,
    wrap: pal ? sh(C(pal[0]), 0.3) : 0xe6e0d2,
    glove: pal ? sh(C(pal[0]), -0.55) : 0x3a3048,
    maskCol: pal ? sh(C(pal[0]), -0.3) : 0x34344e,
    at,
    pt,
    ht,
    wt,
    wcol: C(TIER_METAL[wt >= 0 ? wt : 2]),
    weapon: npc ? null : o.weaponType || null,
    mask: !o.noMask && (mon || (!female && (hh >>> 11) % 3 === 0)),
    wp: look.wp || 0,
  };
  if (mon) sp.ht = -1;
  // thời trang (chỉ người chơi): mặt nạ thay khăn che mặt, trang phục thay màu áo quần
  if (!pal && !npc) {
    if (own(MASKS, look.mask)) {
      sp.fmask = look.mask;
      sp.mask = false;
    }
    if (own(CLOAKS, look.cloak)) {
      const k = CLOAKS[look.cloak];
      const c = C(k.c);
      sp.ck = { c, d: sh(c, -0.3), l: C(k.l), t: C(k.t), pat: k.pat };
    }
    if (own(COSTUMES, look.costume)) {
      const cs = COSTUMES[look.costume];
      sp.cs = cs;
      sp.outfit = C(cs.o);
      sp.pants = C(cs.p);
      sp.trim = C(cs.t);
      sp.under = C(cs.u);
      sp.wrap = C(cs.w);
      sp.glove = C(cs.g);
      sp.at = cs.at;
      sp.pt = cs.pt;
    }
  }
  if (npc) {
    sp.mask = false;
    NPCS[npc](sp, pal || ['#666', '#ccc', '#333']);
    if (sp.npcWeapon) sp.npc = null;
  }
  sp.P = makePalette(sp);
  return sp;
}

function attackFrame(o) {
  if (o.atkP != null) return Math.max(0, Math.min(2, Math.floor(o.atkP * 3)));
  const key = `${o.name || ''}|${o.cls || ''}`;
  const now = performance.now() / 1000;
  let s = atkState.get(key);
  if (!s || now - s.last > 0.15) {
    if (atkState.size > 400) atkState.clear();
    s = { start: now, last: now };
    atkState.set(key, s);
  }
  s.last = now;
  return Math.floor((now - s.start) / 0.085) % 3;
}

function getEntry(sp, anim, f, flash, ride) {
  const key = `${sp.key}#${anim}${f}${flash ? 'F' : ''}${ride ? 'R' : ''}`;
  let e = frameCache.get(key);
  if (e) return e;
  if (frameCache.size > 2400) frameCache.clear();
  const dead = buildFrame(sp, sp.P, anim, f, ride);
  if (dead) rotateDead();
  const wb = sp.wp >= 11 ? 3 : sp.wp >= 8 ? 2 : 0;
  e = bake(flash, wb >= 2 && !flash && !dead, wb >= 3 && !flash && !dead);
  if (e.glow) e.glow = tinted(e.glow, css(sh(sp.wcol, 0.3)));
  if (e.aura) e.aura = tinted(e.aura, css(sp.wcol));
  frameCache.set(key, e);
  return e;
}

function flipped(e) {
  if (!e.flip) {
    e.flip = {
      cv: flipCanvas(e.cv), ox: e.w - e.ox, oy: e.oy,
      glow: e.glow ? flipCanvas(e.glow) : null, aura: e.aura ? flipCanvas(e.aura) : null,
    };
  }
  return e.flip;
}

function specOf(o) {
  const look = o.look || {};
  const wp = look.wp || 0;
  const wpb = wp >= 11 ? 3 : wp >= 8 ? 2 : wp >= 5 ? 1 : 0;
  const key = `${o.cls}|${o.gender}|${o.name}|${look.w}|${look.a}|${look.p}|${look.h}|${wpb}|${o.el}|${o.weaponType}|${o.pal ? o.pal.join(',') : ''}|${o.npcType || ''}|${o.noMask ? 1 : 0}|${look.mask || ''}|${look.cloak || ''}|${look.costume || ''}`;
  let sp = specCache.get(key);
  if (!sp) {
    if (specCache.size > 600) specCache.clear();
    sp = buildSpec(o, key);
    sp.wp = wp;
    specCache.set(key, sp);
  }
  return sp;
}

// ================= NINJA =================
// o: { dir, cls, gender, look:{w,a,p,h,wp,mask?,cloak?,costume?,mount?}, anim:'idle'|'walk'|'jump'|'attack'|'dead', t, name, el,
//      weaponType, pal:[áo, điểm nhấn, tóc, da], scale, flash, noMask, npcType?, atkP? (0..1), noShadow? }
// look.mount: vẽ thú cưỡi dưới chân (y vẫn là mặt đất), người cưỡi nâng lên mountOffset(look); trọng thương thì xuống thú.
export function drawNinja(ctx, x, y, o) {
  const ps = Math.max(1, Math.round(o.scale || 1));
  const dir = o.dir || 1;
  const sp = specOf(o);
  let anim = o.anim || 'idle';
  if (!NFRAMES[anim]) anim = 'idle';
  const t = (o.t || 0) + (sp.npc ? (hash(o.name || '') % 97) / 31 : 0);
  let f = 0;
  if (anim === 'idle') f = Math.floor(t * 2.6) % 4;
  else if (anim === 'walk') f = Math.floor(t * 12) % 6;
  else if (anim === 'jump') f = Math.floor(t * 8) % 2;
  else if (anim === 'attack') f = attackFrame(o);
  const flash = !!o.flash;
  const look = o.look || {};
  const mk = !sp.npc && !o.pal && anim !== 'dead' && own(MOUNTS, look.mount) ? look.mount : null;
  const e0 = getEntry(sp, anim, f, flash, !!mk);
  const e = dir < 0 ? flipped(e0) : e0;
  // lớp thế giới ×3 (ctx.art = 3): làm tròn theo pixel nghệ thuật
  const q = ctx.art || 1;
  let X = Math.round(x * q) / q;
  let Y = Math.round(y * q) / q;
  // Canvas xem trước nhỏ (chọn nhân vật): đẩy xuống để không cụt đầu
  const cvs = ctx.canvas;
  if (ps > 1 && cvs && cvs.width <= 160 && cvs.height <= 200) Y = Math.max(Y, ((mk ? ninjaHeight(look) : NINJA_H) + 2) * ps);
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  // bóng dưới chân
  if (!o.noShadow) {
    // bóng elip 3 hàng, đậm ở lõi (thú cưỡi: bóng rộng theo thân thú)
    const sw = mk ? (MOUNTS[mk].len || 9) + 2 : anim === 'dead' ? 13 : anim === 'jump' ? 4 : 6;
    ctx.fillStyle = 'rgba(20,10,30,0.2)';
    ctx.fillRect(X - (sw - 2) * ps, Y - ps, (sw - 2) * 2 * ps, ps);
    ctx.fillRect(X - sw * ps, Y, sw * 2 * ps, ps);
    ctx.fillRect(X - (sw - 3) * ps, Y + ps, (sw - 3) * 2 * ps, ps);
    ctx.fillStyle = 'rgba(20,10,30,0.16)';
    ctx.fillRect(X - (sw - 3) * ps, Y, (sw - 3) * 2 * ps, ps);
  }
  if (mk) {
    // thú chạy 10 khung/giây, đứng thì thở chậm; người cưỡi nhún theo thân thú
    const ma = anim === 'walk' ? 'walk' : anim === 'jump' ? 'jump' : 'idle';
    const mf = ma === 'walk' ? Math.floor(t * 10) % 4 : ma === 'idle' ? Math.floor(t * 1.6) % 4 : 0;
    const m0 = mountEntry(mk, ma, mf, flash);
    const me = dir < 0 ? flipped(m0) : m0;
    const mx0 = X - me.ox * ps;
    const my0 = Y - me.oy * ps;
    if (me.aura) {
      ctx.globalAlpha = 0.4 + Math.sin((o.t || 0) * 4) * 0.18;
      ctx.drawImage(me.aura, mx0, my0, m0.w * ps, m0.h * ps);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(me.cv, mx0, my0, m0.w * ps, m0.h * ps);
    const bob = ma === 'walk' ? MOUNT_BOB[mf] : ma === 'jump' ? -1 : 0;
    Y -= (MOUNTS[mk].lift - bob) * ps;
    // người cưỡi ngồi lùi về sau để lộ cổ và đầu thú
    X -= 3 * dir * ps;
  }
  const dx = X - e.ox * ps;
  const dy = Y - e.oy * ps;
  const now = o.t || 0;
  // hào quang toàn thân (cường hóa >= 11)
  if (e.aura) {
    ctx.globalAlpha = 0.45 + Math.sin(now * 5) * 0.2;
    ctx.drawImage(e.aura, dx, dy, e0.w * ps, e0.h * ps);
    ctx.globalAlpha = 1;
    drawAuraSparks(ctx, X, Y, ps, now, sp.wcol);
  }
  // vũ khí phát sáng (>= 8)
  if (e.glow) {
    ctx.globalAlpha = 0.55 + Math.sin(now * 7) * 0.25;
    ctx.drawImage(e.glow, dx, dy, e0.w * ps, e0.h * ps);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(e.cv, dx, dy, e0.w * ps, e0.h * ps);
  // lấp lánh (>= 5)
  if (sp.wp >= 5 && !flash && e0.wpx.length) drawSparkle(ctx, X, Y, ps, dir, now, e0.wpx, sp);
  ctx.imageSmoothingEnabled = prevSmooth;
}

function drawSparkle(ctx, X, Y, ps, dir, t, wpx, sp) {
  const n = wpx.length >> 1;
  const count = sp.wp >= 8 ? 3 : 2;
  for (let k = 0; k < count; k++) {
    const step = Math.floor(t * 6 + k * 3.7);
    const ph = (t * 6 + k * 3.7) - step;
    const idx = (hash(`${step}`) + k * 13) % n;
    let sx = wpx[idx * 2];
    const sy = wpx[idx * 2 + 1];
    if (dir < 0) sx = -sx - 1;
    const px0 = X + sx * ps;
    const py0 = Y + sy * ps;
    const a = Math.sin(ph * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(px0, py0, ps, ps);
    if (a > 0.35) {
      ctx.fillStyle = css(sh(sp.wcol, 0.6), a * 0.9);
      ctx.fillRect(px0 - ps, py0, ps, ps);
      ctx.fillRect(px0 + ps, py0, ps, ps);
      ctx.fillRect(px0, py0 - ps, ps, ps);
      ctx.fillRect(px0, py0 + ps, ps, ps);
      if (a > 0.8) {
        ctx.fillStyle = css(sh(sp.wcol, 0.3), 0.6);
        ctx.fillRect(px0 - 2 * ps, py0, ps, ps);
        ctx.fillRect(px0 + 2 * ps, py0, ps, ps);
        ctx.fillRect(px0, py0 - 2 * ps, ps, ps);
        ctx.fillRect(px0, py0 + 2 * ps, ps, ps);
      }
    }
  }
}

function drawAuraSparks(ctx, X, Y, ps, t, col) {
  const c1 = css(sh(col, 0.5), 0.9);
  const c2 = css(col, 0.7);
  for (let i = 0; i < 6; i++) {
    const life = (t * 0.9 + i / 6) % 1;
    const sx = Math.round(Math.sin(i * 2.4 + Math.floor(t * 0.9 + i / 6) * 1.7) * 9);
    const sy = Math.round(-2 - life * 30);
    ctx.fillStyle = life < 0.5 ? c1 : c2;
    ctx.fillRect(X + sx * ps, Y + sy * ps, ps, ps * (life < 0.3 ? 2 : 1));
  }
}

// Chân dung bán thân (avatar HUD): lấp đầy canvas đích, phóng nguyên lần
export function drawPortrait(ctx, o) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const sp = specOf({ ...o, weaponType: o.weaponType || null });
  const e = getEntry(sp, 'idle', 0, false);
  // vùng cần thấy: đầu + vai (~21 pixel nghệ thuật), phóng nguyên lần cho vừa khung
  const s = Math.max(1, Math.round(Math.min(W, H) / 21));
  const viewW = W / s;
  const viewH = H / s;
  const top = -29 - Math.max(0, Math.floor((viewH - 22) / 2));
  const ox = Math.round(viewW / 2 + 1);
  const oy = -top;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (o.bg !== false) {
    const el = C(ELEMENT_COLORS[o.el] || '#ff7043');
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 1, W / 2, H * 0.45, Math.max(W, H) * 0.7);
    g.addColorStop(0, css(sh(el, -0.2), 0.55));
    g.addColorStop(1, css(sh(el, -0.8), 0.15));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(e.cv, (ox - e.ox) * s, (oy - e.oy) * s, e.w * s, e.h * s);
  ctx.imageSmoothingEnabled = prev;
}
