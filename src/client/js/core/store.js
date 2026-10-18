// Trạng thái dùng chung giữa game và giao diện
export const S = {
  G: null,
  me: null,
  inv: [],
  equip: {},
  party: { id: 0, members: [] },
  clan: null,
  user: null,
  ping: 0,
  settings: loadSettings(),
};

function loadSettings() {
  // daynight: mức lớp ngày/đêm 0 (tắt) / 0.5 (nhẹ) / 1 (đầy đủ); shake: rung màn hình
  const def = { autoHp: 40, autoMp: 25, names: true, autoPick: true, autoRange: 600, chatTab: 'all', sound: true, musicVol: 60, sfxVol: 80, daynight: 1, shake: true };
  try {
    const st = { ...def, ...JSON.parse(localStorage.getItem('ns_settings') || '{}') };
    if (![0, 0.5, 1].includes(st.daynight)) st.daynight = def.daynight;
    st.shake = st.shake !== false;
    return st;
  } catch (e) {
    return def;
  }
}

export function saveSettings() {
  try {
    localStorage.setItem('ns_settings', JSON.stringify(S.settings));
  } catch (e) {
    /* bỏ qua */
  }
}

export function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    if (val === null) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch (e) {
    return null;
  }
  return null;
}

export const fmt = (n) => Math.floor(n || 0).toLocaleString('vi-VN');

// Tổng xu trả được cho phí NPC (server trừ xu khóa trước)
export const xuAll = () => (S.me ? (S.me.xu || 0) + (S.me.xuk || 0) : 0);

export function skillVal(arr, lv) {
  if (!arr) return 0;
  return arr[0] + arr[1] * Math.max(0, lv - 1);
}

export function itemStats(it) {
  const def = S.G.items[it.id];
  const out = {};
  if (!def || !def.stats) return out;
  const mul = 1 + S.G.upgrade.bonus * (it.p || 0);
  // thú cưng: chỉ số tăng theo cấp thú (khớp petMul của server)
  const pet = def.slot === 'pet' && S.G.pet;
  for (const k in def.stats) {
    const v = def.stats[k] * (pet ? petMul(k, it.plv || 1) : mul);
    out[k] = k === 'crit' || k === 'dodge' || k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v);
  }
  for (const [k, v] of it.o || []) out[k] = (out[k] || 0) + v;
  for (const id of it.gems || []) {
    const g = gemDef(id);
    if (!g) continue;
    const t = S.G.gems.types[g.gem];
    out[t.stat] = Math.round(((out[t.stat] || 0) + t.v[g.glv - 1]) * 10) / 10;
  }
  return out;
}

// ---- Thú cưng (bảng tra trong S.G.pet)
export function petMul(k, lv) {
  const P = S.G.pet;
  return 1 + (P.pct.includes(k) ? P.growthPct : P.growth) * (Math.max(1, lv | 0) - 1);
}

// Thú đang mang theo: { it, def } hoặc null
export function myPet() {
  const it = S.equip && S.equip.pet;
  const def = it && S.G.items[it.id];
  return def && def.slot === 'pet' ? { it, def } : null;
}

// ---- Ngọc khảm (bảng tra trong S.G.gems)
export function gemDef(id) {
  const d = id && S.G && S.G.items[id];
  return d && d.type === 'gem' && S.G.gems ? d : null;
}

// Số lỗ khảm của loại trang bị (thú cưng, thời trang: 0)
export function gemHoles(def) {
  if (!def || def.type !== 'equip' || def.noUpgrade || !S.G.gems) return 0;
  if (S.G.gearSlots && !S.G.gearSlots.includes(def.slot)) return 0;
  return S.G.gems.holes[def.tier || 0] || 0;
}

// ["+2.400", "sinh lực"]: tách số và nhãn để giao diện hẹp ngắt dòng giữa hai phần, không ngắt giữa từ
export function gemParts(g) {
  const t = S.G.gems.types[g.gem];
  const v = t.v[g.glv - 1];
  return [`+${t.unit === '%' ? v : fmt(v)}${t.unit}`, t.label];
}

// "+0.9% chí mạng", "+2.400 sinh lực"
export const gemText = (g) => gemParts(g).join(' ');

export const gemColor = (g) => S.G.gems.types[g.gem].c;

export function itemName(it) {
  const def = S.G.items[it.id];
  if (!def) return '???';
  return `${def.name}${it.p ? ` +${it.p}` : ''}`;
}

export function rarityColor(it) {
  return S.G.rarity[it.r || 0].color;
}

// Sự kiện theo mùa đang diễn ra (server báo id qua gói 'season'), không có thì null
export function activeSeason() {
  if (!S.seasonId) return null;
  return ((S.G && S.G.seasons) || []).find((s) => s.id === S.seasonId) || null;
}

// Số lượng một vật phẩm trong hành trang
export function countInv(id) {
  let n = 0;
  for (const it of S.inv || []) if (it && it.id === id) n += it.q;
  return n;
}
