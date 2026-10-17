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
  const def = { autoHp: 40, autoMp: 25, names: true, autoPick: true, autoRange: 600, chatTab: 'all', sound: true };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem('ns_settings') || '{}') };
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

export function skillVal(arr, lv) {
  if (!arr) return 0;
  return arr[0] + arr[1] * Math.max(0, lv - 1);
}

export function itemStats(it) {
  const def = S.G.items[it.id];
  const out = {};
  if (!def || !def.stats) return out;
  const mul = 1 + S.G.upgrade.bonus * (it.p || 0);
  for (const k in def.stats) {
    const v = def.stats[k] * mul;
    out[k] = k === 'crit' || k === 'dodge' || k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v);
  }
  for (const [k, v] of it.o || []) out[k] = (out[k] || 0) + v;
  return out;
}

export function itemName(it) {
  const def = S.G.items[it.id];
  if (!def) return '???';
  return `${def.name}${it.p ? ` +${it.p}` : ''}`;
}

export function rarityColor(it) {
  return S.G.rarity[it.r || 0].color;
}
