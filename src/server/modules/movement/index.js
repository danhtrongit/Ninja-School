'use strict';

// Di chuyển (kiểm tra tốc chạy, độ cao nhảy), qua cổng, nhặt đồ, đo ping, NPC dịch chuyển giữa các làng
const { MAPS, GROUND, VILLAGES } = require('../../../shared/data/maps');
const { int } = require('../../core/util');
const { dialog } = require('../../core/npc');

// Vật lý nhảy của máy khách (khớp JUMP/JUMP2/GRAV trong src/client/js/game/game.js): server tự kiểm độ cao,
// không tin y do máy khách gửi (lơ lửng trên không sẽ né được chiêu boss đánh mặt đất)
const JUMP = 378;
const JUMP2 = 330;
const GRAV = 1000;
// nhảy đôi từ bục cao nhất chạm đất sau ~1.7s; cộng thêm phần trễ mạng
const AIR_MAX = 2.4;
// gói tin đến sớm/muộn so với lúc máy khách thật sự nhảy
const AIR_SLACK = 0.3;

// Độ cao cao nhất (px, so với chỗ cất nhảy) có thể đạt sau t giây: nhảy rồi nhảy đôi đúng lúc tối ưu
function jumpReach(t) {
  if (t <= 0) return 0;
  const t1 = Math.max(0, Math.min(t, (JUMP - JUMP2) / (2 * GRAV) + t / 2));
  const t2 = t - t1;
  return JUMP * t1 - (GRAV / 2) * t1 * t1 + JUMP2 * t2 - (GRAV / 2) * t2 * t2;
}
// Cao nhất trong khoảng [t - AIR_SLACK, t + AIR_SLACK] (hàm chỉ có một đỉnh nên lấy mẫu là đủ)
function jumpReachNear(t) {
  let best = -Infinity;
  for (let k = -3; k <= 3; k++) best = Math.max(best, jumpReach(Math.max(0, t + (k * AIR_SLACK) / 3)));
  return best;
}
// Chân đang đứng trên mặt đất hoặc một bục (máy khách hạ chân đúng bằng y của bục)
function onSurface(def, x, y) {
  if (y >= GROUND - 1) return true;
  for (const [px, py, pw] of def.platforms || []) if (x >= px - 6 && x <= px + pw + 6 && Math.abs(y - py) <= 1.5) return true;
  return false;
}
// Bục gần nhất ngay dưới chân (không có thì mặt đất)
function surfaceBelow(def, x, y) {
  let best = GROUND;
  for (const [px, py, pw] of def.platforms || []) if (x >= px - 2 && x <= px + pw + 2 && py >= y - 1 && py < best) best = py;
  return best;
}

class Movement {
  constructor(world) {
    this.world = world;
  }

  move(p, m) {
    if (p.dead || !p.map) return;
    const x = +m.x;
    const y = +m.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Date.now();
    const dt = Math.min(1.2, (now - p.lastMoveAt) / 1000);
    p.lastMoveAt = now;
    const def = p.map.def;
    const nx = Math.max(4, Math.min(def.w - 4, x));
    let ny = Math.max(0, Math.min(GROUND, y));
    // tốc chạy gồm cả thú cưỡi (p.s.spd); vừa tháo thú cưỡi thì vẫn nhận tốc cũ thêm 2.5 giây
    const maxD = 110 * (1 + p.moveSpd(now) / 100) * 1.6 * dt + 30;
    if (now > p.moveGrace && Math.abs(nx - p.x) > maxD) {
      p.send('pos', { x: Math.round(p.x), y: Math.round(p.y) });
      return;
    }
    let fix = false;
    if (!onSurface(def, nx, ny)) {
      if (!p.airAt || now <= p.moveGrace) {
        // vừa rời chỗ đứng (hoặc vừa được server đặt lại vị trí): tính cú nhảy từ chỗ đứng cuối
        if (now <= p.moveGrace) p.baseY = ny;
        p.airAt = now;
      }
      const t = (now - p.airAt) / 1000;
      const lim = p.baseY - jumpReachNear(t) - 16;
      if (ny < lim || t > AIR_MAX) {
        const floor = surfaceBelow(def, nx, ny);
        ny = t > AIR_MAX ? floor : Math.min(floor, lim);
        fix = true;
      }
    }
    if (onSurface(def, nx, ny)) {
      p.airAt = 0;
      p.baseY = ny;
    }
    p.x = nx;
    p.y = ny;
    if (fix) p.send('pos', { x: Math.round(nx), y: Math.round(ny) });
    p.dir = m.dir === -1 ? -1 : 1;
    p.st = int(m.st) & 7;
  }

  portal(p, m) {
    if (p.dead || !p.map) return;
    const pt = p.map.def.portals[int(m.i, -1)];
    if (!pt) return;
    if (Math.abs(p.x - pt.x) > 60) return;
    if (pt.to === '@home') return this.world.sendHome(p);
    const dest = MAPS[pt.to];
    if (dest && dest.pvp && p.lv < 10) {
      p.notice('Cần đạt cấp 10 để vào Đấu Trường.', 'warn');
      return;
    }
    this.world.changeMap(p, pt.to, pt.tx);
  }

  pickup(p, m) {
    if (p.dead || !p.map) return;
    const map = p.map;
    let g = map.ground.get(int(m.id));
    if (!g) {
      let bd = 70;
      for (const o of map.ground.values()) {
        const d = Math.abs(o.x - p.x);
        if (d < bd && Math.abs(o.y - p.y) < 60) {
          bd = d;
          g = o;
        }
      }
    }
    if (g && Math.abs(g.x - p.x) < 80 && Math.abs(g.y - p.y) < 70) map.tryPickup(p, g, Date.now(), true);
  }

  ping(p, m) {
    p.send('pong', { ts: m.ts });
  }

  // ---------- NPC dịch chuyển
  teleDialog(p, n) {
    const cost = p.lv < 20 ? 0 : 300;
    const opts = VILLAGES.filter((v) => v !== p.map.id).map((v) => ({ a: `go:${v}`, label: `${MAPS[v].name}${cost ? ` (${cost} xu)` : ' (miễn phí)'}` }));
    dialog(p, n, 'Ngươi muốn đi đâu? Ninja dưới cấp 20 được đi miễn phí.', opts);
  }

  teleport(p, dest) {
    if (!VILLAGES.includes(dest) || dest === p.map.id) return;
    const cost = p.lv < 20 ? 0 : 300;
    if (p.c.xu < cost) return p.notice('Không đủ xu.', 'warn');
    p.c.xu -= cost;
    p.markMe();
    this.world.changeMap(p, dest, MAPS[dest].spawnX);
  }
}

module.exports = {
  name: 'movement',
  init: (world) => new Movement(world),
  actions: {
    move: Movement.prototype.move,
    portal: Movement.prototype.portal,
    pickup: Movement.prototype.pickup,
    ping: Movement.prototype.ping,
  },
  npcs: {
    tele: {
      open(p, n) { this.teleDialog(p, n); },
      act(p, n, a) { if (a.startsWith('go:')) this.teleport(p, a.slice(3)); },
    },
  },
  Movement, jumpReach, onSurface,
};
