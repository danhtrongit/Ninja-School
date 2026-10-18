'use strict';

// EXP cần để lên cấp lv + 1 (nhân vật và thú cưng dùng chung)
const expNeed = (lv) => Math.floor(20 * lv * lv + 80 * lv);

// Ngày theo giờ Việt Nam 'YYYY-MM-DD' (offset: số ngày lệch, -1 = hôm qua)
const vnDay = (offset = 0) => new Date(Date.now() + 7 * 3600 * 1000 + offset * 86400000).toISOString().slice(0, 10);

module.exports = { expNeed, vnDay };
