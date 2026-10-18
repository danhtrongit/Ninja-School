// Tìm đường giữa các bản đồ (đồ thị cổng) và xác định đích của nhiệm vụ. Module thuần, không đụng DOM.

const HOP = 1e6;

const usable = (maps, id) => !!(maps[id] && !maps[id].instance);

// Dijkstra theo (số bản đồ, quãng đường đi bộ); trạng thái = (bản đồ, x vừa vào) vì quãng đi bộ phụ thuộc cổng vào
function search(maps, from, x0, to) {
  if (!usable(maps, from)) return null;
  const start = { map: from, x: x0 != null ? x0 : maps[from].spawnX || 0, cost: 0, prev: null, step: null };
  const seen = new Map();
  const open = [start];
  const best = {};
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].cost < open[bi].cost) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    const key = `${cur.map}@${cur.x}`;
    if (seen.has(key)) continue;
    seen.set(key, cur);
    if (!best[cur.map]) best[cur.map] = cur;
    if (to && cur.map === to) break;
    const ps = maps[cur.map].portals || [];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p || p.to === '@home' || !usable(maps, p.to)) continue;
      if (seen.has(`${p.to}@${p.tx}`)) continue;
      open.push({
        map: p.to, x: p.tx, cost: cur.cost + HOP + Math.abs(p.x - cur.x), prev: cur,
        step: { map: cur.map, portal: i, x: p.x, to: p.to },
      });
    }
  }
  return best;
}

function unwind(node) {
  const steps = [];
  for (let n = node; n && n.step; n = n.prev) steps.push(n.step);
  return steps.reverse();
}

// x (tùy chọn): vị trí đang đứng ở bản đồ xuất phát để so quãng đi bộ chính xác hơn
export function findRoute(maps, from, to, x) {
  if (!maps || !maps[from] || !maps[to]) return null;
  if (from === to) return [];
  if (!usable(maps, to)) return null;
  const best = search(maps, from, x, to);
  if (!best || !best[to]) return null;
  return unwind(best[to]);
}

export function routeMaps(maps, from, to, x) {
  const r = findRoute(maps, from, to, x);
  if (!r) return null;
  return [from, ...r.map((s) => s.to)];
}

export function mapsWithMob(maps, mobId) {
  const out = [];
  for (const id in maps) {
    const m = maps[id];
    if (m.instance) continue;
    if ((m.mobs || []).includes(mobId) || (m.bosses || []).some((b) => b.m === mobId)) out.push(id);
  }
  return out;
}

// Danh sách id quái (kể cả boss) có rơi vật phẩm này
export function mobsDropping(monsters, itemId) {
  const out = [];
  for (const k in monsters) {
    const drops = monsters[k].drops || [];
    if (drops.some((d) => (Array.isArray(d) ? d[0] : d && d.id) === itemId)) out.push(k);
  }
  return out;
}

export function mapsWithDrop(maps, monsters, itemId) {
  const set = new Set();
  for (const k of mobsDropping(monsters, itemId)) for (const id of mapsWithMob(maps, k)) set.add(id);
  return [...set];
}

export function nearestMap(maps, from, ids, x) {
  if (!maps || !maps[from] || !ids || !ids.length) return null;
  if (ids.includes(from)) return { id: from, route: [] };
  const best = search(maps, from, x, null);
  if (!best) return null;
  let pick = null;
  for (const id of ids) {
    const n = best[id];
    if (n && (!pick || n.cost < pick.cost)) pick = n;
  }
  return pick ? { id: pick.map, route: unwind(pick) } : null;
}

// Bản đồ có NPC loại này (làng)
export function mapsWithNpc(maps, type) {
  const out = [];
  for (const id in maps) {
    const m = maps[id];
    if (!m.instance && (m.npcs || []).some((n) => n.type === type)) out.push(id);
  }
  return out;
}

function npcDest(S, from, type, label) {
  const d = { npcType: type, label };
  const near = from ? nearestMap(S.G.maps, from, mapsWithNpc(S.G.maps, type)) : null;
  if (near) d.map = near.id;
  return d;
}

function mobName(S, k) {
  const m = S.G.monsters[k];
  return m ? m.name : k;
}

function huntDest(S, from, mob, label) {
  const maps = S.G.maps;
  const ids = mapsWithMob(maps, mob);
  if (!ids.length) return null;
  const near = from ? nearestMap(maps, from, ids) : null;
  const map = near ? near.id : ids[0];
  const d = { map, mob, label: label || `Săn ${mobName(S, mob)}` };
  const b = (maps[map].bosses || []).find((o) => o.m === mob);
  if (b) d.x = b.x;
  return d;
}

// Bãi luyện công hợp cấp: bản đồ có cấp quái chứa cấp người chơi, không có thì bản đồ có cấp gần nhất
function levelDest(S, from) {
  const maps = S.G.maps;
  const lv = S.me ? S.me.level : 1;
  const fields = Object.keys(maps).filter((id) => {
    const m = maps[id];
    return !m.town && !m.pvp && !m.instance && m.lv && (m.mobs || []).length;
  });
  if (!fields.length) return null;
  let ids = fields.filter((id) => maps[id].lv[0] <= lv && lv <= maps[id].lv[1]);
  if (!ids.length) {
    const gap = (id) => (lv < maps[id].lv[0] ? maps[id].lv[0] - lv : lv - maps[id].lv[1]) + (lv < maps[id].lv[0] ? 2 : 0);
    const g = Math.min(...fields.map(gap));
    ids = fields.filter((id) => gap(id) === g);
  }
  const near = from ? nearestMap(maps, from, ids) : null;
  const map = near ? near.id : ids[0];
  // quái mạnh nhất không vượt quá cấp người chơi quá 2
  const mobs = maps[map].mobs || [];
  let mob = mobs[0];
  for (const k of mobs) if (S.G.monsters[k] && S.G.monsters[k].lv <= lv + 2) mob = k;
  return { map, mob, label: `Luyện công ở ${maps[map].name}` };
}

// Dữ liệu tĩnh chưa có bảng rơi đồ: đoán quái/bản đồ theo tên xuất hiện trong mô tả nhiệm vụ
function collectGuess(S, q, from) {
  const desc = q.desc || '';
  const item = S.G.items && S.G.items[q.item];
  const label = item ? `Thu thập ${item.name}` : null;
  let mob = null;
  for (const k in S.G.monsters) {
    const m = S.G.monsters[k];
    if (m.boss || !desc.includes(m.name) || !mapsWithMob(S.G.maps, k).length) continue;
    if (!mob || m.name.length > S.G.monsters[mob].name.length) mob = k;
  }
  if (mob) return huntDest(S, from, mob, label);
  let map = null;
  for (const id in S.G.maps) {
    const m = S.G.maps[id];
    if (m.instance || m.town || !desc.includes(m.name)) continue;
    if (!map || m.name.length > S.G.maps[map].name.length) map = id;
  }
  return map ? { map, auto: true, label: label || S.G.maps[map].name } : null;
}

export function questDest(S, q, from = S.mapId) {
  if (!S || !S.G || !q || q.done) return null;
  const st = q.st || 0;
  const n = q.n || 1;
  if (st === 0) {
    if (S.me && q.req && S.me.level < q.req) return levelDest(S, from);
    return npcDest(S, from, 'elder', 'Nhận nhiệm vụ');
  }
  if (st === 2 || (q.prog || 0) >= n) return npcDest(S, from, 'elder', 'Trả nhiệm vụ');
  switch (q.kind) {
    case 'talk': return npcDest(S, from, 'elder', 'Gặp Trưởng Làng');
    case 'kill': return q.m ? huntDest(S, from, q.m) : null;
    case 'collect': {
      const mobs = mobsDropping(S.G.monsters, q.item).filter((k) => mapsWithMob(S.G.maps, k).length);
      if (!mobs.length) return collectGuess(S, q, from);
      // ưu tiên bản đồ gần nhất, rồi quái cấp thấp hơn
      const maps = S.G.maps;
      const near = from ? nearestMap(maps, from, mapsWithDrop(maps, S.G.monsters, q.item)) : null;
      const mapId = near ? near.id : mapsWithMob(maps, mobs[0])[0];
      const here = mobs.filter((k) => mapsWithMob(maps, k).includes(mapId));
      here.sort((a, b) => (S.G.monsters[a].lv || 0) - (S.G.monsters[b].lv || 0));
      const item = S.G.items && S.G.items[q.item];
      const d = huntDest(S, mapId, here[0], item ? `Thu thập ${item.name}` : null);
      if (d) d.map = mapId;
      return d;
    }
    case 'visit': return q.map && S.G.maps[q.map] ? { map: q.map, label: S.G.maps[q.map].name } : null;
    case 'upgrade': return npcDest(S, from, 'smith', 'Gặp Thợ Rèn');
    case 'dungeon': return npcDest(S, from, 'dungeon', 'Gặp Hộ Pháp');
    case 'level': return levelDest(S, from);
    default: return null;
  }
}

export function dailyDest(S, d, from = S.mapId) {
  if (!S || !S.G || !d) return null;
  // sang ngày mới (giờ Việt Nam) thì nhiệm vụ cũ hết hạn, phải nhận lại
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (d.day !== today) return npcDest(S, from, 'task', 'Nhận nhiệm vụ hằng ngày');
  const t = d.task;
  if (!t) return (d.done || 0) < 20 ? npcDest(S, from, 'task', 'Nhận nhiệm vụ hằng ngày') : null;
  if ((t.prog || 0) >= (t.n || 1)) return npcDest(S, from, 'task', 'Trả nhiệm vụ hằng ngày');
  return huntDest(S, from, t.m);
}

// ---------------- Đồ thị nhảy trong một bản đồ: mặt 0 = mặt đất, mặt i+1 = bục i
// phys = { JUMP, JUMP2, GRAV }; trả về { surf, edges } dùng cho navPlan/surfaceAt/surfaceBelow
export function buildNav(map, phys) {
  const g = phys.GRAV;
  const h1 = (phys.JUMP * phys.JUMP) / (2 * g) - 5;
  const h2 = h1 + (phys.JUMP2 * phys.JUMP2) / (2 * g) - 4;
  const surf = [{ y: map.ground, x1: 0, x2: map.w }];
  for (const [px, py, pw] of map.platforms || []) surf.push({ y: py, x1: px, x2: px + pw });
  const covers = (s, x) => x >= s.x1 - 2 && x <= s.x2 + 2;
  // mặt đầu tiên chạm phải khi rơi từ độ cao y tại x
  const landing = (x, y) => {
    let best = 0;
    for (let i = 1; i < surf.length; i++) {
      const s = surf[i];
      if (s.y > y && s.y < surf[best].y && covers(s, x)) best = i;
    }
    return best;
  };
  const edges = surf.map(() => []);
  const runs = (from, x1, x2, kind, test) => {
    let start = null;
    for (let x = x1; x <= x2 + 0.01; x += 6) {
      const ok = test(x);
      if (ok && start === null) start = x;
      if ((!ok || x + 6 > x2 + 0.01) && start !== null) {
        const end = ok ? x : x - 6;
        if (end >= start) edges[from].push({ to: kind.to, kind: kind.k, x1: start, x2: end });
        start = null;
      }
    }
  };
  for (let a = 0; a < surf.length; a++) {
    const A = surf[a];
    for (let b = 1; b < surf.length; b++) {
      const B = surf[b];
      const H = A.y - B.y;
      if (b === a || H <= 0 || H > h2) continue;
      const k = H <= h1 ? 1 : 2;
      // được cất cánh lệch ra ngoài mép bục một đoạn: khi bay sẽ lái vào trong bục
      const side = k === 1 ? 18 : 34;
      const lo = Math.max(A.x1 + 3, B.x1 + 8 - side);
      const hi = Math.min(A.x2 - 3, B.x2 - 8 + side);
      if (lo > hi) continue;
      const apex = A.y - (k === 1 ? h1 : h2);
      const bl = B.x1 + 8;
      const bh = B.x2 - 8;
      runs(a, lo, hi, { to: b, k }, (x) => landing(x < bl ? bl : x > bh ? bh : x, apex) === b);
    }
    // thả xuống từ bục: rơi tới mặt gần nhất bên dưới
    if (a > 0) {
      const segs = {};
      for (let x = A.x1 + 4; x <= A.x2 - 4; x += 6) {
        const l = landing(x, A.y);
        if (!segs[l]) segs[l] = [];
        segs[l].push(x);
      }
      for (const l in segs) runs(a, segs[l][0], segs[l][segs[l].length - 1], { to: +l, k: 0 }, (x) => landing(x, A.y) === +l);
    }
  }
  return { surf, edges, landing, covers };
}

// Mặt đang đứng (chân chạm), -1 nếu không xác định
export function surfaceAt(nav, x, y) {
  const s = nav.surf;
  if (y >= s[0].y - 1) return 0;
  for (let i = 1; i < s.length; i++) if (Math.abs(s[i].y - y) < 2 && nav.covers(s[i], x)) return i;
  return -1;
}

// Mặt ngay dưới một điểm (mục tiêu đang bay/nhảy thì lấy mặt bên dưới)
export function surfaceBelow(nav, x, y) {
  return nav.landing(x, y - 4);
}

const EDGE_COST = [24, 40, 70];

// Cạnh đầu tiên trên đường ngắn nhất từ mặt a (đứng ở x) tới mặt b; null nếu không tới được
export function navPlan(nav, a, x, b) {
  if (a === b || a < 0 || b < 0) return null;
  const n = nav.surf.length;
  const cost = new Array(n).fill(Infinity);
  const px = new Array(n).fill(0);
  const first = new Array(n).fill(null);
  const done = new Array(n).fill(false);
  cost[a] = 0;
  px[a] = x;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && cost[i] < Infinity && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || u === b) break;
    done[u] = true;
    for (const e of nav.edges[u]) {
      const kx = px[u] < e.x1 ? e.x1 : px[u] > e.x2 ? e.x2 : px[u];
      const c = cost[u] + Math.abs(kx - px[u]) + EDGE_COST[e.kind];
      if (c < cost[e.to]) {
        cost[e.to] = c;
        px[e.to] = kx;
        first[e.to] = u === a ? e : first[u];
      }
    }
  }
  return first[b];
}
