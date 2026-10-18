'use strict';

// Chiêu boss báo trước và sự kiện Tà Thú: công thức, dọn dẹp (thế giới giả) và trận đánh thật.
const { sleep, ok } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { seek, dash, revive, safeX } = require('../lib/helpers');

// Vùng chiêu boss, lịch và chia thưởng sự kiện Tà Thú (không cần server)
function bossUnitTests() {
  console.log('0b. Chiêu boss & sự kiện Tà Thú (công thức)');
  const { inBossZone } = require('../../src/server/core/combat');
  const { MONSTERS } = require('../../src/shared/data/monsters');
  const { TATHU } = require('../../src/shared/data/extras');
  const { BeastEvent, nextTathuAt, eventMaps, rewardTier } = require('../../src/server/modules/events');
  const circle = { sk: { shape: 'circle', r: 100, ground: true }, x: 500, y: 300, dir: 1 };
  ok(inBossZone(circle, { x: 590, y: 300 }) && !inBossZone(circle, { x: 620, y: 300 }) && !inBossZone(circle, { x: 520, y: 240 }),
    'địa chấn: trúng người trong bán kính, chạy ra ngoài hoặc nhảy lên thì né');
  const line = { sk: { shape: 'line', r: 200, w: 16 }, x: 500, y: 300, dir: -1 };
  ok(inBossZone(line, { x: 320, y: 300 }) && !inBossZone(line, { x: 560, y: 300 }) && !inBossZone(line, { x: 250, y: 300 }),
    'chiêu dải: chỉ trúng phía trước theo hướng niệm, đứng sau lưng boss là an toàn');
  // dải vẽ dày w (lệch dọc ±w/2, viền 1px): chân trong dải thì trúng, nhảy qua khỏi dải thì né
  ok(inBossZone(line, { x: 400, y: 292 }) && !inBossZone(line, { x: 400, y: 288 }) && !inBossZone(line, { x: 510, y: 300 }),
    'chiêu dải: vùng sát thương khớp dải cảnh báo (dày w, bắt đầu từ boss)');
  const pil = { sk: { shape: 'pillar', r: 24 }, x: 400, y: 300, pts: [[400, 300], [700, 238]] };
  ok(inBossZone(pil, { x: 700, y: 200 }) && inBossZone(pil, { x: 420, y: 300 }) && !inBossZone(pil, { x: 550, y: 300 }), 'cột sáng: trúng cả cột, né bằng cách chạy ngang');
  const bosses = Object.keys(MONSTERS).filter((k) => MONSTERS[k].boss);
  ok(bosses.every((k) => MONSTERS[k].skills.length >= 2 && MONSTERS[k].skills.length <= 3), 'mọi boss có 2-3 chiêu riêng');
  ok(TATHU.bosses.every((k) => MONSTERS[k] && MONSTERS[k].event && eventMaps(k).length > 0), 'mỗi Tà Thú có bãi luyện công phù hợp cấp');
  // 10:00 giờ VN → 10:30; 10:31 → 12:30
  const vn = (t) => new Date(t + 7 * 3600000).toISOString().slice(11, 16);
  ok(vn(nextTathuAt(Date.UTC(2026, 0, 1, 3, 0))) === '10:30' && vn(nextTathuAt(Date.UTC(2026, 0, 1, 3, 31))) === '12:30', 'lịch Tà Thú: phút 30 mỗi 2 giờ (giờ VN)');
  ok(rewardTier(1, 40).to === 1 && rewardTier(7, 3).to === 10 && rewardTier(25, 1.2).to === 0 && rewardTier(2, 0.4) === null, 'mốc thưởng: top 1-3, top 10, còn lại cần >= 1% máu');
  // Chia thưởng bằng thế giới giả: 12 người, A dẫn đầu, Z chỉ 0.5% máu
  const mk = (name, cls) => ({
    name, c: { cls, luong: 0 }, xu: 0, items: [], exp: 0, got: null,
    gainExp(n) { this.exp += Math.round(n); return Math.round(n); }, gainXu(n) { this.xu += n; },
    addItem(id, q) { this.items.push([id, q]); return true; }, markMe() {}, onKill() {}, notice() {}, petKillExp() {},
    send(t, d) { if (t === 'eventResult') this.got = d; },
  });
  const players = [mk('A', 'kiem'), mk('B', 'tieu'), mk('C', 'kunai'), ...Array.from({ length: 8 }, (_, i) => mk(`P${i}`, 'kiem')), mk('Z', 'cung')];
  const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const sent = [];
  const world = { config: { tathu: false }, byName, expEvent: () => 1, announce: (msg) => sent.push(msg), broadcastAll() {} };
  const ev = new BeastEvent(world);
  const def = MONSTERS.ev_hacviem;
  const dmg = [40, 20, 10, 4, 4, 3, 3, 3, 2, 2, 2, 0.5].map((pct) => pct * def.hp / 100);
  const m = { k: 'ev_hacviem', def, maxHp: def.hp, dmgBy: new Map(players.map((p, i) => [p.name, dmg[i]])), map: { def: { name: 'Hoang Mạc Cát' }, players: new Map() } };
  ev.onKill(m, players[0]);
  const [A, B, C] = players;
  const P7 = players[10];
  const Z = players[11];
  ok(A.c.luong === 30 && A.items.some(([id]) => id === 'book_k7') && A.items.some(([id, q]) => id === 'chest' && q === 3) && A.xu === 1000 * def.lv,
    'hạng 1: 30 lượng, 3 rương, sách nội tại đúng phái, xu theo cấp boss');
  ok(B.c.luong === 20 && B.items.some(([id, q]) => id === 'stone2' && q === 5) && C.c.luong === 15, 'hạng 2-3: lượng + đá cường hóa');
  ok(players[9].c.luong === 5 && P7.c.luong === 1 && Z.c.luong === 0 && Z.exp > 0, 'top 10 được 5 lượng, hạng 11 (>= 1%) 1 lượng, dưới 1% chỉ có EXP');
  ok(A.got && A.got.me.rank === 1 && A.got.top.length === 10 && A.got.top[0].name === 'A' && Z.got.me.rank === 12 && /lượng/.test(A.got.me.reward),
    'bảng kết quả gửi từng người: top 10 + hạng của mình');
  ok(sent.some((msg) => /A đã kết liễu Hắc Viêm Tà Thú/.test(msg)), 'thông báo toàn máy chủ khi Tà Thú bị hạ');
}

// Dọn dẹp boss bằng thế giới giả (GameMap/Combat/BeastEvent thật): quái con, hết giờ, bản đồ trống, túi đầy
function bossCleanupUnitTests() {
  console.log('0c. Dọn dẹp boss & thưởng khi túi đầy (thế giới giả)');
  const { GameMap } = require('../../src/server/core/map');
  const { Combat } = require('../../src/server/core/combat');
  const { BeastEvent, eventMaps } = require('../../src/server/modules/events');
  const { Player } = require('../../src/server/core/player');
  const { MAPS, GROUND } = require('../../src/shared/data/maps');
  const { makeItem } = require('../../src/shared/data/items');
  const out = [];
  const world = {
    nextMid: 1, nextGid: 1, config: { tathu: false }, byName: new Map(), maps: {}, expEvent: () => 1,
    announce() {}, broadcastAll(t, d) { out.push({ t, ...d }); },
  };
  world.combat = new Combat(world);
  world.event = new BeastEvent(world);
  const mapId = eventMaps('ev_bangphach')[0];
  const map = new GameMap(world, MAPS[mapId]);
  world.maps[mapId] = map;
  // người chơi giả đã gục: chỉ ghi lại gói tin, không bị đánh
  const pl = { id: 1, name: 'Tester', x: 0, y: GROUND, dead: true, c: { kills: 0 }, conn: { sendRaw: (raw) => out.push(JSON.parse(raw)) }, send() {} };
  map.players.set(pl.id, pl);
  const summonOnce = () => {
    world.event.start('ev_bangphach', mapId);
    const boss = world.event.cur.m;
    const sk = boss.def.skills.find((x) => x.k === 'summon');
    world.combat.bossSkillHit(boss, { sk, x: boss.x, y: boss.y, dir: 1 });
    const kids = [...map.monsters.values()].filter((o) => o.master === boss.id);
    return { boss, kids };
  };
  let from = out.length;
  let { boss, kids } = summonOnce();
  ok(kids.length === 2 && kids.every((o) => o.noRespawn && out.slice(from).some((m) => m.t === 'mSpawn' && m.id === o.id)), 'chiêu triệu hồi: quái con có chủ (master), không hồi sinh, có gói mSpawn');
  from = out.length;
  world.event.end('timeout');
  const gone = (o) => out.slice(from).some((m) => m.t === 'mGone' && m.id === o.id) && !map.monsters.has(o.id);
  ok(gone(boss) && kids.every(gone) && out.slice(from).some((m) => m.t === 'event' && m.on === false) && !world.event.cur,
    'Tà Thú hết giờ (/event stop): xóa boss lẫn quái con (mGone), báo sự kiện kết thúc');
  ({ boss, kids } = summonOnce());
  from = out.length;
  world.combat.killMonster(boss, pl);
  ok(kids.every(gone) && !map.monsters.has(boss.id) && !world.event.cur, 'Tà Thú bị hạ: quái con biến mất theo (mGone), boss không ở lại bản đồ');

  // Bản đồ trống giữa lúc boss niệm: bỏ chiêu, người vào sau không trúng chiêu cũ
  ({ boss } = summonOnce());
  const live = { ...pl, id: 2, name: 'Live', dead: false, x: boss.x + 20 };
  map.players.delete(pl.id);
  map.players.set(live.id, live);
  boss.startCast(boss.def.skills.findIndex((x) => x.k === 'quake'), live, Date.now());
  ok(!!boss.cast, 'boss bắt đầu niệm khi có người đứng gần');
  map.remove(live);
  ok(!boss.cast && boss.st !== 2, 'bản đồ không còn ai: chiêu đang niệm bị hủy');
  live.dead = true;
  map.players.set(live.id, live);
  from = out.length;
  boss.update(0.05, Date.now() + 5000);
  ok(!out.slice(from).some((m) => m.t === 'bossHit') && !boss.pub().cast, 'vào lại bản đồ: không có bossHit của chiêu cũ, gói quái không còn cast');
  world.event.end('timeout');

  // Túi đầy: thưởng gửi thủ kho, kho đầy thì giữ hộ rồi tự trả, không bao giờ thả ra đất
  let dropped = 0;
  const notes = [];
  const fp = {
    c: { storage: new Array(4).fill(null), pending: [] }, map: { dropItem() { dropped++; } },
    addItem: () => false, addItemObj: () => false, markMe() {}, notice: (msg) => notes.push(msg),
    stashItem: Player.prototype.stashItem, deliverPending: Player.prototype.deliverPending,
  };
  const row = { reward: [] };
  world.event.give(fp, 'chest', 3, row);
  ok(dropped === 0 && fp.c.storage[0] && fp.c.storage[0].id === 'chest' && fp.c.storage[0].q === 3 && row.reward[0] === '3 Rương Báu' && /thủ kho/.test(notes[0]),
    'túi đầy: rương thưởng vào thủ kho, không rơi ra đất');
  for (let i = 1; i < 4; i++) fp.c.storage[i] = makeItem('w_kunai_1', 1);
  world.event.give(fp, 'stone2', 5, row);
  ok(dropped === 0 && fp.c.pending.length === 1 && fp.c.pending[0].q === 5, 'túi và kho đều đầy: đồ thưởng được giữ hộ');
  const got = [];
  fp.addItemObj = (it) => { got.push(it); return true; };
  fp.deliverPending();
  ok(fp.c.pending.length === 0 && got.length === 1 && got[0].id === 'stone2' && /Nhận đồ thưởng/.test(notes[notes.length - 1]), 'hành trang có chỗ: tự trả đồ đang giữ hộ');
}

async function bossEventTest(a) {
  console.log('7e. Chiêu boss báo trước & sự kiện Tà Thú');
  // Bot thứ hai đứng xa boss trên cùng bản đồ
  const g = new Bot('G');
  await g.connect();
  g.send('login', { u: 'bot_two', p: 'secret123' });
  await g.wait('chars');
  g.send('selectChar', { name: 'KunaiNin' });
  await g.wait('enterMap');
  const evOff = await g.wait('event');
  ok(evOff.k === 'tathu' && evOff.on === false, 'vào game nhận trạng thái sự kiện Tà Thú (chưa diễn ra)');

  let from = g.msgs.length;
  a.send('chat', { ch: 'map', msg: '/event tathu ev_hacviem wasteland' });
  const ann = await seek(g, 'notice', (m) => /Tà Thú Xuất Thế: Hắc Viêm Tà Thú .*Hoang Mạc Cát/.test(m.msg), from);
  ok(ann.m.kind === 'boss', '/event tathu: thông báo toàn máy chủ kèm tên bản đồ');
  const ev = (await seek(g, 'event', (m) => m.on, from)).m;
  ok(ev.map === 'wasteland' && ev.boss === 'ev_hacviem' && ev.left > 19 * 60000 && ev.left <= 20 * 60000, 'gói event: boss, bản đồ, còn 20 phút');
  a.send('chat', { ch: 'map', msg: '/event tathu' });
  ok(!!(await a.wait('chat', (m) => /đang diễn ra/.test(m.msg))), 'không gọi chồng hai Tà Thú');

  a.send('chat', { ch: 'map', msg: '/tp wasteland' });
  await a.wait('enterMap', (m) => m.map === 'wasteland');
  // cấp cao, đầy máu để chịu được chiêu boss và đòn thường trong cả trận
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  g.send('chat', { ch: 'map', msg: '/lv 120' });
  g.send('chat', { ch: 'map', msg: '/tp wasteland' });
  await g.wait('enterMap', (m) => m.map === 'wasteland');
  const boss = [...a.monsters.values()].find((m) => m.k === 'ev_hacviem');
  ok(!!boss && boss.id === ev.id, 'Tà Thú có mặt trên bản đồ sự kiện');
  if (!boss) return g.ws.close();
  const { MONSTERS, eventHpMul } = require('../../src/shared/data/monsters');
  const muls = Array.from({ length: 20 }, (_, i) => Math.round(MONSTERS.ev_hacviem.baseHp * eventHpMul(i + 1)));
  ok(muls.includes(boss.mhp), `HP Tà Thú theo số người online đủ cấp (${boss.mhp})`);
  // G đứng xa boss hơn tầm chiêu cột nhắm người thứ hai (360 px, startCast) và tầm phát hiện; A đứng bên phải boss để chiêu dải hướng ra xa G
  const W = require('../../src/shared/data/maps').MAPS.wasteland.w;
  const gx = boss.x - 450 >= 40 ? boss.x - 450 : Math.min(W - 40, boss.x + 450);
  await dash(g, Math.round(gx));
  const gHp = g.me.hp;

  // Lần niệm 1: đứng yên trong vùng → bị trúng; G ở xa không mất máu.
  // Boss và quái quanh đó đủ sức hạ A trong lúc chờ (boss mất mục tiêu thì không niệm): gục thì hồi sinh, hồi đầy máu rồi chờ lần niệm sau
  let c1 = null;
  let h1 = null;
  let hit1 = null;
  let waited = 0;
  let gWait = g.msgs.length;
  for (let k = 0; k < 4; k++) {
    await revive(a);
    a.send('chat', { ch: 'map', msg: '/lv 120' });
    // G đứng giữa quái thường suốt vòng chờ: gục thì hồi lại tại chỗ, chỉ xét sát thương từ lần niệm cuối
    if (await revive(g)) await dash(g, Math.round(gx));
    gWait = g.msgs.length;
    const bm = a.monsters.get(boss.id);
    if (bm && Math.abs(a.x - (bm.x + 30)) > 20) await dash(a, Math.round(bm.x + 30));
    a.send('move', { x: a.x, y: 300, dir: -1, st: 0 });
    from = a.msgs.length;
    c1 = await seek(a, 'bossCast', (m) => m.id === boss.id, from, 9000).catch(() => null);
    if (!c1) continue;
    const t1 = Date.now();
    h1 = await seek(a, 'bossHit', (m) => m.id === boss.id, c1.i, 4000);
    waited = Date.now() - t1;
    hit1 = await seek(a, 'hit', (m) => m.bs && m.a === `m${boss.id}`, h1.i, 800).catch(() => null);
    // gục trước khi chiêu nổ thì không tính, chờ lần niệm sau
    if (!a.msgs.slice(c1.i, h1.i).some((m) => m.t === 'dead')) break;
  }
  if (!c1) throw new Error('A: hết thời gian chờ "bossCast" lần 1');
  ok(c1.m.dur >= 900 && waited >= c1.m.dur - 150 && h1.m.k === c1.m.k, `bossCast (${c1.m.name}, ${c1.m.shape}, ${c1.m.dur}ms) đến trước bossHit sau thời gian niệm`);
  ok(!!hit1 && hit1.m.list.some(([tid]) => tid === `p${a.me.id}`), 'đứng trong vùng thì trúng chiêu boss');
  ok(!hit1 || !hit1.m.list.some(([tid]) => tid === `p${g.me.id}`), 'người đứng ngoài vùng không bị tính sát thương');
  await sleep(150);
  // quái thường quanh G có thể đánh G, nên chỉ cộng sát thương đến từ boss
  const fromBoss = g.msgs.filter((m) => m.t === 'hit' && m.a === `m${boss.id}`).flatMap((m) => m.list).filter(([tid, , , miss]) => tid === `p${g.me.id}` && !miss);
  const bHits = g.msgs.filter((m) => m.t === 'hit' && m.a === `m${boss.id}` && m.list.some(([tid, , , miss]) => tid === `p${g.me.id}` && !miss));
  // G phải còn sống lúc chiêu nổ (chết vì quái thường trước đó thì phép thử không có nghĩa)
  const gTail = g.msgs.slice(gWait);
  const gBoom = gTail.findIndex((m) => m.t === 'bossHit' && m.id === boss.id);
  const gDead = gTail.findIndex((m) => m.t === 'dead');
  ok(gHp > 0 && gBoom >= 0 && (gDead < 0 || gDead > gBoom) && fromBoss.length === 0, `người đứng ngoài vùng không mất máu vì boss${fromBoss.length ? ` (G x=${g.x}, boss x=${a.monsters.get(boss.id) && a.monsters.get(boss.id).x}, ${bHits.map((m) => (m.bs ? 'chiêu ' + m.bs : 'đánh thường')).join(', ')})` : ''}`);

  // Lần niệm 2: chạy ra khỏi vùng trong lúc niệm → né được
  from = a.msgs.length;
  // quái thường quanh boss có thể hạ A trong lúc chờ: hồi đầy máu, gục thì hồi sinh tại chỗ rồi chờ tiếp
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  let c2 = null;
  for (let k = 0; k < 6 && !c2; k++) {
    await revive(a);
    if (k) a.send('chat', { ch: 'map', msg: '/lv 120' });
    // hồi sinh có thể đưa A ra xa: quay lại cạnh boss, đứng cùng mặt đất và đánh một đòn để boss nhận A làm mục tiêu
    const bm = a.monsters.get(boss.id);
    if (bm && Math.abs(a.x - (bm.x + 30)) > 20) await dash(a, Math.round(bm.x + 30));
    a.send('move', { x: a.x, y: 300, dir: -1, st: 0 });
    a.send('skill', { sid: 'k0', tid: `m${boss.id}`, dir: -1 });
    c2 = await seek(a, 'bossCast', (m) => m.id === boss.id, from, 6000).catch(() => null);
  }
  if (!c2) throw new Error('A: hết thời gian chờ "bossCast" lần 2');
  await dash(a, safeX(c2.m, a.x));
  const h2 = await seek(a, 'bossHit', (m) => m.id === boss.id, c2.i, 4000);
  await sleep(200);
  const hit2 = a.msgs.slice(h2.i).find((m) => m.t === 'hit' && m.bs && m.a === `m${boss.id}`);
  ok(!hit2 || !hit2.list.some(([tid]) => tid === `p${a.me.id}`), `chạy ra khỏi vùng ${c2.m.shape} trong lúc niệm thì né được ${c2.m.name}`);

  // Cuồng nộ khi máu dưới 30% (admin /bosshp để rút ngắn trận đánh)
  from = a.msgs.length;
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  a.send('chat', { ch: 'map', msg: '/bosshp 2' });
  const rage = await seek(a, 'mRage', (m) => m.id === boss.id, from, 3000).catch(() => null);
  ok(!!rage && !!(await seek(a, 'notice', (m) => /nổi cuồng nộ/.test(m.msg), from, 1000).catch(() => null)), 'máu dưới 30%: Tà Thú nổi cuồng nộ (gói mRage + thông báo)');
  // Hạ Tà Thú: G góp vài đòn trước, A kết liễu
  // G đánh tới khi có ít nhất một đòn gây sát thương (boss có thể đi lại, đòn có thể trượt)
  const gHit = (i) => g.msgs.slice(i).some((m) => m.t === 'hit' && m.a === `p${g.me.id}` && m.list.some(([tid, dmg, , miss]) => tid === `m${boss.id}` && dmg > 0 && !miss));
  const gFrom = g.msgs.length;
  for (let i = 0; i < 24 && !gHit(gFrom) && a.monsters.has(boss.id); i++) {
    await revive(g);
    const bm = g.monsters.get(boss.id);
    if (bm && Math.abs(g.x - (bm.x - 34)) > 20) await dash(g, Math.round(bm.x - 34));
    g.send('move', { x: g.x, y: 300, dir: 1, st: 0 });
    g.send('skill', { sid: 'n0', tid: `m${boss.id}`, dir: 1 });
    await sleep(460);
  }
  ok(gHit(gFrom), 'người thứ hai gây được sát thương lên Tà Thú');
  await revive(a);
  let luong0 = a.me.luong;
  for (let i = 0; i < 200 && a.monsters.has(boss.id); i++) {
    // hồi sinh tại chỗ tốn 1 lượng: trừ ra khỏi mốc so sánh
    if (a.me.dead) luong0 -= await revive(a);
    const bx = a.monsters.get(boss.id).x;
    if (Math.abs(a.x - (bx + 30)) > 20) await dash(a, Math.round(bx + 30));
    a.send('move', { x: a.x, y: 300, dir: -1, st: 0 });
    a.send('skill', { sid: ['k6', 'k5', 'k1', 'k0'][i % 4], tid: `m${boss.id}`, dir: -1 });
    await sleep(220);
  }
  const res = await seek(a, 'eventResult', null, from, 5000).catch(() => null);
  ok(!!res, 'Tà Thú bị hạ: gửi bảng kết quả sát thương');
  if (res) {
    const r = res.m;
    ok(r.me && r.me.rank === 1 && r.top[0].name === 'KiemSi' && r.top.every((x, i) => !i || r.top[i - 1].dmg >= x.dmg), 'xếp hạng theo sát thương, người gây nhiều nhất hạng 1');
    await sleep(200);
    ok(a.me.luong === luong0 + 30 && /30 lượng/.test(r.me.reward) && /Sách/.test(r.me.reward), `hạng 1 nhận 30 lượng và sách nội tại (${r.me.reward})`);
    const gr = await seek(g, 'eventResult', null, 0, 2000).catch(() => null);
    ok(!!gr && gr.m.me && gr.m.me.rank === 2, 'người góp sát thương cũng nhận bảng kết quả với hạng của mình');
  }
  const off = await seek(a, 'event', (m) => m.on === false, from, 2000).catch(() => null);
  ok(!!off, 'sự kiện kết thúc sau khi Tà Thú bị hạ');
  g.ws.close();
}

module.exports = { bossUnitTests, bossCleanupUnitTests, bossEventTest };
