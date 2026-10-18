'use strict';

// Thời trang và thú cưỡi: ô trang bị mới, tốc chạy, hạn sử dụng, chặn giao dịch đồ có hạn.
const { sleep, ok, serverLog } = require('../lib/harness');
const { Bot } = require('../lib/bot');
const { seek } = require('../lib/helpers');

// Thời trang + thú cưỡi: ô mới, tốc chạy thú cưỡi được server chấp nhận, hạn sử dụng, chặn giao dịch đồ có hạn
async function fashionTest(a) {
  console.log('7f. Thời trang & thú cưỡi');
  // phiên B cũ đã bị bot G (cùng tài khoản) đá ra ở 7e: đăng nhập lại
  const b = new Bot('B2');
  await b.connect();
  b.send('login', { u: 'bot_two', p: 'secret123' });
  await b.wait('chars');
  b.send('selectChar', { name: 'CungThu' });
  await b.wait('enterMap');
  const G = a.data;
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => G.slots.includes(s) && G.fashionSlots.includes(s) && G.slotNames[s]) && !G.gearSlots.includes('mount'),
    'dữ liệu tĩnh có 4 ô thời trang mới (tách khỏi ô chiến đấu)');
  const fashion = Object.keys(G.items).filter((id) => G.items[id].fashion);
  const mounts = fashion.filter((id) => G.items[id].slot === 'mount');
  ok(mounts.length >= 4 && mounts.every((id) => G.items[id].stats.spd > 0) && new Set(mounts.map((id) => G.items[id].grade)).size >= 3,
    `${mounts.length} thú cưỡi, đều cộng tốc chạy, nhiều độ hiếm khác nhau`);
  const { SHOPS } = require('../../src/shared/data/items');
  ok(SHOPS.potion.luong.some((id) => G.items[id] && G.items[id].fashion), 'tiệm bán thời trang bằng lượng');

  for (const bot of [a, b]) {
    if (bot.map === 'v_fire') continue;
    bot.send('chat', { ch: 'map', msg: '/tp v_fire' });
    await bot.wait('enterMap', (m) => m.map === 'v_fire');
  }
  a.send('chat', { ch: 'map', msg: '/lv 120' });
  await sleep(200);
  // dọn chỗ trong túi cho các món thời trang
  for (let i = 0; i < 8; i++) {
    const k = a.inv.inv.findIndex((it, j) => j >= 20 && it);
    if (k < 0) break;
    a.send('discard', { slot: k });
    await sleep(60);
  }
  const give = async (cmd, id) => {
    a.send('chat', { ch: 'map', msg: cmd });
    return a.wait('inv', (m) => m.inv.some((it) => it && it.id === id));
  };
  const wear = async (id) => {
    const i = a.inv.inv.findIndex((it) => it && it.id === id);
    a.send('equip', { slot: i });
    const slot = G.items[id].slot;
    return a.wait('inv', (m) => m.equip[slot] && m.equip[slot].id === id);
  };
  const strip = async (slot) => {
    a.send('unequip', { slot });
    return a.wait('inv', (m) => !m.equip[slot]);
  };

  // mặc / tháo đủ 4 ô mới; người khác thấy ngoại hình mới qua pInfo
  for (const id of ['mask_oni', 'cloak_flame', 'costume_dragon']) await give(`/item ${id}`, id);
  await give('/item mount_qilin', 'mount_qilin');
  // hiệu ứng làm chậm còn sót từ phần Tà Thú (Kinh Hồn Hống, 3 giây) làm sai mốc tốc chạy
  for (let i = 0; i < 50 && (a.me.buffs || []).some((x) => x.stat === 'spd'); i++) await sleep(100);
  const spd0 = a.me.s.spd;
  const atk0 = a.me.s.atk;
  let from = b.msgs.length;
  for (const id of ['mask_oni', 'cloak_flame', 'costume_dragon', 'mount_qilin']) await wear(id);
  await sleep(250);
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => a.inv.equip[s]), 'mặc đủ mặt nạ, áo choàng, trang phục, thú cưỡi');
  ok(a.inv.equip.costume.r === 4 && a.inv.equip.mount.r === 4 && !a.inv.equip.mask.exp, 'độ hiếm theo phẩm của món, mua/tặng qua admin thì vĩnh viễn');
  ok(a.me.s.spd === spd0 + 35 && a.me.s.mountSpd === 35 && a.me.s.atk > atk0, `thú cưỡi cộng tốc chạy vào s.spd (${spd0} -> ${a.me.s.spd}) và chỉ số thời trang được tính`);
  const pi = await seek(b, 'pInfo', (m) => m.name === 'KiemSi' && m.look && m.look.mount === 'qilin', from, 2000).catch(() => null);
  ok(!!pi && pi.m.look.mask === 'oni' && pi.m.look.cloak === 'flame' && pi.m.look.costume === 'dragon', 'người chơi khác nhận ngoại hình mặt nạ/áo choàng/trang phục/thú cưỡi');

  // tốc chạy thú cưỡi: bước 1.25 giây (dt chạm trần 1.2s nên giới hạn ổn định), dài hơn mức đi bộ nhưng trong mức cưỡi thú
  const lim = (spd) => 110 * (1 + spd / 100) * 1.6 * 1.2 + 30;
  const step = Math.round((lim(spd0) + lim(a.me.s.spd)) / 2);
  ok(lim(a.me.s.spd) - lim(spd0) > 60, `chênh lệch giới hạn bước giữa đi bộ và cưỡi thú đủ rõ (${Math.round(lim(spd0))} / ${Math.round(lim(a.me.s.spd))})`);
  const fastMoves = async (n) => {
    const f = a.msgs.length;
    for (let i = 0; i < n; i++) {
      await sleep(1250);
      a.x += (i % 2 ? -1 : 1) * step;
      a.send('move', { x: a.x, y: 300, dir: 1, st: 1 });
    }
    await sleep(150);
    return a.msgs.slice(f).filter((m) => m.t === 'pos').length;
  };
  a.x = 600;
  a.send('move', { x: a.x, y: 300, dir: 1, st: 0 });
  await sleep(300);
  a.x = 600;
  ok(await fastMoves(3) === 0, `cưỡi thú chạy nhanh (bước ${step}px): server không kéo lại`);
  await strip('mount');
  // gói 'me' (chỉ số mới) có thể tới sau gói 'inv' của cùng lần tháo
  const meOff = await a.wait('me', (m) => !m.s.mountSpd).catch(() => a.me);
  ok(meOff.s.spd === spd0 && !meOff.s.mountSpd, `tháo thú cưỡi: tốc chạy về như cũ (${meOff.s.spd} / ${spd0})`);
  // trong 2.5 giây sau khi tháo vẫn nhận tốc cũ (gói di chuyển đang bay không bị kéo lại)
  ok(await fastMoves(1) === 0, 'vừa tháo thú cưỡi: bước đang chạy dở không bị kéo lại');
  await sleep(1500);
  const pulled = await fastMoves(1);
  ok(pulled === 1, `không cưỡi thú mà đi bước dài như thế thì bị kéo lại (${pulled} lần, tốc ${a.me.s.spd})`);
  a.send('chat', { ch: 'map', msg: '/tp v_fire' });
  await a.wait('enterMap', (m) => m.map === 'v_fire');

  // khóa ô lạ từ máy khách: không làm hỏng túi đồ
  const invBefore = JSON.stringify(a.inv.inv);
  for (const slot of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) a.send('unequip', { slot });
  await sleep(250);
  ok(JSON.stringify(a.inv.inv) === invBefore && a.inv.inv.every((it) => !it || typeof it.id === 'string'), 'tháo ô "__proto__"/"constructor": bị bỏ qua');
  // cường hóa từ ô trang bị với khóa lạ cũng phải bị bỏ qua, không ném lỗi trong server
  await a.walkTo(620);
  const logAt = serverLog().length;
  for (const slot of ['__proto__', 'constructor', 'toString']) a.send('upgrade', { npc: 'v_fire_smith', src: 'eq', slot });
  await sleep(250);
  ok(!/Lỗi xử lý upgrade/.test(serverLog().slice(logAt)), 'cường hóa ô "__proto__"/"constructor": bị bỏ qua, server không lỗi');
  for (const s of ['mask', 'cloak', 'costume']) await strip(s);
  ok(['mask', 'cloak', 'costume', 'mount'].every((s) => !a.inv.equip[s]) && a.me.s.atk === atk0, 'tháo hết thời trang: chỉ số trở về như cũ');

  // đồ có hạn 7 ngày: không giao dịch được, hết hạn thì mất chỉ số và tự biến mất
  const inv7 = await give('/item mask_fox 1 0 7', 'mask_fox');
  const fox = inv7.inv.find((it) => it && it.id === 'mask_fox');
  const left = fox.exp - Date.now();
  ok(left > 6.9 * 86400000 && left <= 7 * 86400000 + 5000, 'đồ thời trang có hạn 7 ngày (trường exp)');
  await b.walkTo(Math.round(a.x) + 30);
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [a.inv.inv.findIndex((it) => it && it.id === 'mask_fox')], xu: 0 });
  ok(!!(await a.wait('notice', (m) => /hạn sử dụng không thể giao dịch/.test(m.msg)).catch(() => null)), 'đồ có hạn không đặt vào giao dịch được');
  a.send('tradeCancel');
  await sleep(200);
  // tráo đồ sau khi đặt: đặt bánh bao (không hạn), cả hai khóa, B đồng ý; A ăn bánh rồi tháo món có hạn
  // rơi đúng vào ô đã đặt -> giao dịch phải bị hủy, B không nhận được món có hạn
  await wear('mask_fox');
  // bỏ chồng bánh bao cũ để bánh mới nằm ở ô trống đầu tiên (ô mà món tháo ra sẽ rơi vào)
  for (let k; (k = a.inv.inv.findIndex((it) => it && it.id === 'food_atk')) >= 0;) {
    a.send('discard', { slot: k });
    await a.wait('inv', (m) => !m.inv[k]);
  }
  const foodInv = await give('/item food_atk 1', 'food_atk');
  const foodSlot = foodInv.inv.findIndex((it) => it && it.id === 'food_atk');
  ok(foodSlot >= 0, 'nhận bánh bao để đặt giao dịch');
  a.send('tradeReq', { name: 'CungThu' });
  await b.wait('invite', (m) => m.kind === 'trade');
  b.send('tradeAccept', { from: 'KiemSi' });
  await a.wait('trade');
  a.send('tradeSet', { slots: [foodSlot], xu: 0 });
  await b.wait('trade', (m) => m.theirs.slots.length === 1);
  a.send('tradeLock');
  b.send('tradeLock');
  await b.wait('trade', (m) => m.mine.lock && m.theirs.lock);
  b.send('tradeOk');
  await a.wait('trade', (m) => m.theirs.ok);
  a.send('useItem', { slot: foodSlot });
  await a.wait('inv', (m) => !m.inv[foodSlot]);
  a.send('unequip', { slot: 'mask' });
  const swapped = await a.wait('inv', (m) => !m.equip.mask);
  ok(swapped.inv[foodSlot] && swapped.inv[foodSlot].id === 'mask_fox', 'món có hạn tháo ra rơi vào đúng ô đã đặt giao dịch');
  const fromB = b.msgs.length;
  a.send('tradeOk');
  const endB = await seek(b, 'tradeEnd', () => true, fromB, 2000).catch(() => null);
  await sleep(150);
  ok(!!endB && !endB.m.ok && !b.inv.inv.some((it) => it && it.id === 'mask_fox') && a.inv.inv[foodSlot] && a.inv.inv[foodSlot].id === 'mask_fox',
    'tráo đồ trong ô đã đặt sau khi khóa: giao dịch bị hủy, không chuyển được món có hạn');
  const crit0 = a.me.s.crit;
  await wear('mask_fox');
  await sleep(150);
  const crit1 = a.me.s.crit;
  from = a.msgs.length;
  a.send('chat', { ch: 'map', msg: '/hethan 1' });
  const gone = await seek(a, 'notice', (m) => /Hết hạn sử dụng: Mặt Nạ Hồ Ly/.test(m.msg), from, 8000).catch(() => null);
  await sleep(250);
  ok(!!gone && !a.inv.equip.mask && !a.inv.inv.some((it) => it && it.id === 'mask_fox'), 'hết hạn: tự tháo, biến mất khỏi người và thông báo');
  ok(crit1 > crit0 && a.me.s.crit === crit0, `hết hạn: mất chỉ số thời trang (chí mạng ${crit0} -> ${crit1} -> ${a.me.s.crit})`);

  // để lại mặt nạ vĩnh viễn + một món có hạn trong túi để kiểm tra lúc tải lại từ file
  await give('/item mask_oni', 'mask_oni');
  await wear('mask_oni');
  await give('/item cloak_wind 1 0 7', 'cloak_wind');
  b.ws.close();
}

module.exports = { fashionTest };
