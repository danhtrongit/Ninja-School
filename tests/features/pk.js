'use strict';

// Hồi sinh: về làng và tại chỗ đều hồi máu, đều báo máy khách vẽ lại thanh máu (gói 'me')
const { ok } = require('../lib/harness');
const pkMod = require('../../src/server/modules/pk');
const { CLASSES } = require('../../src/shared/data/classes');

function fakePlayer(over) {
  const sent = [];
  return {
    sent, dead: true, x: 300, y: 300, dirtyMe: false, map: null,
    c: { cls: Object.keys(CLASSES)[0], hp: 0, mp: 5, luong: 3 },
    s: { maxHp: 900, maxMp: 400 },
    send(t, d) { sent.push({ t, ...d }); },
    markMe() { this.dirtyMe = true; },
    notice(msg) { sent.push({ t: 'notice', msg }); },
    countItem() { return 0; },
    removeItem() {},
    ...over,
  };
}

function pkUnitTests() {
  console.log('Hồi sinh (kiểm tra đơn vị): về làng hồi đầy máu và gửi lại chỉ số');
  const moves = [];
  const world = { changeMap(p, map) { moves.push(map); p.dirtyMe = false; } };
  const pk = pkMod.init(world);

  const p = fakePlayer();
  pk.revive(p, {});
  ok(!p.dead && p.c.hp === 900 && p.c.mp === 400, 'hồi sinh về làng: hết trọng thương, đầy sinh lực và chakra');
  ok(moves[0] === CLASSES[p.c.cls].village, 'hồi sinh về làng: đưa về làng của môn phái');
  ok(p.dirtyMe, 'hồi sinh về làng: đánh dấu gửi lại gói me sau khi đổi bản đồ (thanh máu cập nhật)');

  const q = fakePlayer();
  pk.revive(q, { mode: 'here' });
  ok(!q.dead && q.c.hp === 540 && q.c.luong === 2 && q.dirtyMe && moves.length === 1, 'hồi sinh tại chỗ: 60% sinh lực, trừ 1 lượng, gửi lại gói me');

  const r = fakePlayer({ dead: false, c: { cls: q.c.cls, hp: 10, mp: 0, luong: 0 } });
  pk.revive(r, {});
  ok(r.c.hp === 10 && moves.length === 1, 'chưa trọng thương thì gói revive bị bỏ qua');
}

module.exports = { pkUnitTests };
