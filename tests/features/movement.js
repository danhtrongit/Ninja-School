'use strict';

// Di chuyển: server tự kiểm tra độ cao theo vật lý nhảy.
const { sleep, ok } = require('../lib/harness');

// Server tự kiểm độ cao theo vật lý nhảy: cú nhảy thật không bị sửa, lơ lửng trên không bị kéo xuống
async function airTest(a) {
  console.log('7d. Server kiểm tra độ cao (không tin y máy khách gửi)');
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');
  // giữa hai bục của làng, bên dưới không có bục; chờ hết thời gian ân hạn sau khi đổi bản đồ
  await a.walkTo(560);
  await sleep(500);
  const X = 560;
  let from = a.msgs.length;
  // mô phỏng đúng vật lý máy khách: nhảy, nhảy đôi ở đỉnh, gửi mỗi 4 khung, khung chạm đất gửi ngay; nhảy liền 3 lần
  for (let hop = 0; hop < 3; hop++) {
    let y = 300;
    let vy = -378;
    let jumps = 1;
    for (let f = 1; ; f++) {
      vy = Math.min(600, vy + 1000 / 60);
      y += vy / 60;
      if (jumps === 1 && vy >= 0) {
        vy = -330;
        jumps = 2;
      }
      if (y >= 300) break;
      if (f % 4 === 0) {
        a.send('move', { x: X, y: Math.round(y), dir: 1, st: 2 });
        await sleep(66);
      }
    }
    a.send('move', { x: X, y: 300, dir: 1, st: 0 });
    await sleep(16);
  }
  await sleep(150);
  ok(!a.msgs.slice(from).some((m) => m.t === 'pos'), 'nhảy đôi liên tục đúng vật lý: server không sửa vị trí');
  from = a.msgs.length;
  for (let i = 0; i < 30; i++) {
    a.send('move', { x: X, y: 200, dir: 1, st: 2 });
    await sleep(100);
  }
  await sleep(150);
  const fixes = a.msgs.slice(from).filter((m) => m.t === 'pos');
  ok(fixes.some((m) => m.y > 200 && m.y < 300) && fixes.some((m) => m.y === 300), `lơ lửng cao 100px: server hạ độ cao rồi kéo về mặt đất (${fixes.length} lần sửa)`);
  a.send('move', { x: X, y: 300, dir: 1, st: 0 });
  await sleep(100);
}

module.exports = { airTest };
