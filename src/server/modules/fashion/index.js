'use strict';

// Thời trang có hạn dùng: phát ngẫu nhiên (rương, vòng quay), tự gỡ khi hết hạn
const { ITEMS, FASHION_DAYS, rollFashion } = require('../../../shared/data/items');

class Fashion {
  constructor(world) {
    this.world = world;
  }

  // Thời trang ngẫu nhiên hạn FASHION_DAYS ngày (rương, vòng quay); món hiếm nhất báo toàn máy chủ.
  // from rỗng: không báo riêng (vòng quay hiện kết quả sau khi quay xong)
  giveFashion(p, from) {
    const id = rollFashion();
    const def = ITEMS[id];
    if (!p.addItem(id, 1, 0, FASHION_DAYS)) return null;
    if (from) p.notice(`${from} nhận ${def.name} (${FASHION_DAYS} ngày)!`, 'reward');
    if (def.grade >= 4) this.world.announce(`${p.name} nhận được ${def.name} (${FASHION_DAYS} ngày)!`, 'world');
    return def;
  }
}

module.exports = {
  name: 'fashion',
  init: (world) => new Fashion(world),
  hooks: {
    // vật phẩm hết hạn bị gỡ lúc tải nhân vật
    join: {
      order: 1,
      fn(p) {
        if (p.expiredNames.length) p.notice(`Hết hạn sử dụng: ${p.expiredNames.join(', ')}.`, 'warn');
      },
    },
    // thời trang có hạn: kiểm tra mỗi 5 giây
    playerSecond: {
      order: 2,
      fn(p, now) {
        if (p.c.playtime % 5 === 0) p.checkExpiry(now);
      },
    },
  },
  Fashion,
};
