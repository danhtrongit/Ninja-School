'use strict';

// Quà điểm danh 7 ngày (lặp lại)
const CHECKIN = [
  { xu: 2000, items: [['hp2', 5]] },
  { xu: 3000, items: [['stone1', 3]] },
  { luong: 2, items: [['mp2', 5]] },
  { xu: 5000, items: [['chest', 1]] },
  { luong: 3, items: [['stone1', 5]] },
  { xu: 8000, items: [['exp2', 1]] },
  { luong: 10, items: [['chest', 2], ['charm', 1]] },
];

// Vòng quay may mắn: w = trọng số khi quay bằng xu, wl = trọng số khi quay bằng lượng.
// fashion: thưởng một món thời trang/thú cưỡi ngẫu nhiên hạn 7 ngày (rollFashion trong items.js)
const WHEEL = {
  cost: { xu: 10000, luong: 2 },
  prizes: [
    { label: '3.000 xu', xu: 3000, w: 28, wl: 6, c: '#ffd54f' },
    { label: '10 bình HP', items: [['hp2', 10]], w: 16, wl: 10, c: '#ef5350' },
    { label: '3 đá Sơ', items: [['stone1', 3]], w: 16, wl: 12, c: '#90caf9' },
    { label: '15.000 xu', xu: 15000, w: 10, wl: 14, c: '#ffb300' },
    { label: 'Bí kíp x2', items: [['exp2', 1]], w: 9, wl: 14, c: '#ab47bc' },
    { label: '1 đá Trung', items: [['stone2', 1]], w: 8, wl: 14, c: '#ce93d8' },
    { label: 'Rương báu', items: [['chest', 1]], w: 7, wl: 14, c: '#ff8f00' },
    { label: '3 lượng', luong: 3, w: 4, wl: 10, c: '#80deea' },
    { label: 'Bùa bảo hộ', items: [['charm', 1]], w: 2, wl: 5, c: '#fff176' },
    { label: 'Thời trang', fashion: true, w: 1, wl: 5, c: '#f48fb1' },
    { label: '20 lượng', luong: 20, w: 0.3, wl: 1, c: '#00e5ff' },
  ],
};

// Sự kiện Tà Thú Xuất Thế: mỗi 2 giờ (giờ chẵn, giờ Việt Nam) vào phút 30, báo trước 5 phút, tồn tại 20 phút.
// Boss chọn ngẫu nhiên trong bosses, hiện ở một bãi luyện công có quái cấp gần cấp boss (chênh tối đa mapLv).
// Thưởng theo hạng sát thương: to = hạng cuối của mốc (0 = mọi người còn lại đạt tối thiểu minPct % máu boss).
// xu nhân với cấp boss; book = sách nội tại đúng phái theo cấp boss; stone = số đá cường hóa theo cấp boss.
const TATHU = {
  name: 'Tà Thú Xuất Thế',
  every: 2, minute: 30, warn: 5, dur: 20 * 60 * 1000, minPct: 1, mapLv: 10,
  bosses: ['ev_hacviem', 'ev_bangphach', 'ev_huyetnguyet'],
  rewards: [
    { to: 1, luong: 30, xu: 1000, items: [['chest', 3]], book: 1 },
    { to: 2, luong: 20, xu: 700, items: [['chest', 2]], stone: 5 },
    { to: 3, luong: 15, xu: 500, items: [['chest', 2]], stone: 3 },
    { to: 10, luong: 5, xu: 300, items: [['chest', 1]] },
    { to: 0, luong: 1, xu: 100 },
  ],
};

// Hộp thư: mỗi nhân vật giữ tối đa max thư, thư quá keepDays ngày tự xóa (kể cả còn quà), mỗi thư tối đa maxItems món đính kèm.
// Hộp đầy thì bỏ thư cũ nhất đã đọc và không còn quà; toàn thư còn quà thì không nhận thêm (Tà Thú chuyển sang thủ kho).
const MAIL = { max: 30, keepDays: 30, maxItems: 6, titleLen: 40, bodyLen: 300 };

// Giftcode: MÃ (chữ in hoa và số, 4-20 ký tự) → phần thưởng. Mỗi tài khoản dùng mỗi mã 1 lần
// (ghi ở accounts.json nên xóa nhân vật tạo lại không nhập lại được; lượt /code tối đa cũng tính theo tài khoản).
// from/until: ngày theo giờ Việt Nam 'YYYY-MM-DD' (until tính hết ngày đó); lv: cấp tối thiểu.
// Hành trang không đủ chỗ thì quà được gửi vào hộp thư. Admin tạo thêm mã tạm thời bằng /code (lưu ở meta.json).
const GIFTCODES = {
  NINJAMOI: { note: 'Quà tân thủ', lv: 1, until: '2027-12-31', reward: { xu: 20000, luong: 10, items: [['hp2', 20], ['mp2', 20], ['scroll_home', 5]] } },
  TRANGRAM: { note: 'Quà Lễ Hội Trăng Rằm', lv: 5, from: '2026-09-25', until: '2026-11-08', reward: { luong: 15, items: [['banh_trungthu', 10], ['exp2', 2]] } },
  LANGLA: { note: 'Quà tri ân', lv: 10, until: '2027-06-30', reward: { xu: 50000, items: [['stone1', 10], ['chest', 2], ['charm', 1]] } },
};
// Chống dò mã: mỗi tài khoản nhập sai tối đa fails lần trong window ms (mỗi IP tối đa ipFails), quá thì khóa tới hết khoảng đó.
// ipFails để rộng vì nhiều người chung IP (NAT nhà mạng, quán net); chặn chính là theo tài khoản + giới hạn đăng ký mỗi IP.
const CODE_LIMIT = { fails: 5, ipFails: 30, window: 60000 };

// Sự kiện theo mùa (ngày theo giờ Việt Nam, until tính hết ngày). Đang diễn ra thì quái rơi vật phẩm sự kiện (token):
// quái thường tỉ lệ drop.rate nếu cấp quái không thấp hơn cấp người hạ quá drop.lvGap, boss rơi drop.boss, Tà Thú rơi drop.event.
// NPC Lễ Hội (loại 'event') ở mỗi làng đổi token lấy quà theo exchange: cost token mỗi lần, limit = số lần mỗi nhân vật
// trong cả mùa (0 = không giới hạn), days > 0 = vật phẩm có hạn dùng. Chỉ một mùa diễn ra tại một thời điểm.
const SEASONS = [
  {
    id: 'trangram2026', name: 'Lễ Hội Trăng Rằm', from: '2026-09-25', until: '2026-11-08', token: 'banh_trungthu',
    desc: 'Trăng rằm tròn vành vạnh, ba làng treo đèn kết hoa. Săn quái nhặt Bánh Trung Thu rồi mang tới Sứ Giả Lễ Hội ở làng để đổi quà!',
    drop: { rate: 0.05, lvGap: 10, boss: [3, 6], event: [8, 12] },
    exchange: [
      { id: 'xu', cost: 5, reward: { xu: 6000 } },
      { id: 'potion', cost: 8, reward: { items: [['hp3', 10], ['mp3', 10]] } },
      { id: 'exp2', cost: 15, reward: { items: [['exp2', 1]] } },
      { id: 'stone', cost: 20, reward: { items: [['stone2', 2]] } },
      { id: 'chest', cost: 25, reward: { items: [['chest', 1]] } },
      { id: 'luong', cost: 40, limit: 10, reward: { luong: 5 } },
      { id: 'gem', cost: 60, limit: 5, reward: { items: [['gem_huyet_2', 1]] } },
      { id: 'ocean', cost: 150, limit: 1, reward: { items: [['costume_ocean', 1]], days: 15 } },
      { id: 'crane', cost: 300, limit: 1, reward: { items: [['mount_crane', 1]], days: 15 } },
    ],
  },
];

// Lôi đài xếp hạng (1 đấu 1, src/server/modules/arena.js). Điểm Elo lưu trên nhân vật (c.arena), bắt đầu từ elo.
// Ghép cặp: điểm chênh không quá base, cứ mỗi growEvery ms chờ nới thêm grow, tối đa max (lấy biên rộng hơn của 2 người).
// Trận: đếm ngược countdown, đánh dur; vào trận hồi đầy sinh lực/chakra, không dùng vật phẩm (bình thuốc, cuộn, đồ ăn),
// không hồi máu tự nhiên. Hết giờ so % sinh lực, bằng nhau thì hòa. Rời trận / mất kết nối = thua.
// Elo: hệ số k, tổng điểm 2 bên không đổi (bên thua không xuống dưới 0 nên phần trừ không vượt quá điểm bên thua).
// Mỗi cặp chỉ tính điểm + thưởng pairDaily trận mỗi ngày (chống dàn xếp); mỗi người nhận thưởng trận tối đa daily trận mỗi ngày.
// Thưởng tuần (thứ Hai 00:00 giờ Việt Nam, gửi qua hộp thư): xếp theo Elo những người đánh từ weeklyMin trận trong tuần;
// to = hạng cuối của mốc.
const ARENA = {
  minLv: 20, elo: 1000, k: 32,
  match: { base: 100, grow: 50, growEvery: 10000, max: 1000 },
  countdown: 5000, dur: 3 * 60 * 1000, close: 4000,
  pairDaily: 3, daily: 20,
  win: { xu: 3000, fame: 10 }, lose: { xu: 1000, fame: 3 }, draw: { xu: 2000, fame: 5 },
  // thưởng tuần: đủ weeklyMin trận, thắng ít nhất weeklyWin trận và điểm không dưới mức khởi đầu
  // (chặn nuôi nhân vật phụ chỉ đánh cho đủ trận để lọt top khi ít người chơi)
  weeklyMin: 3, weeklyWin: 1,
  // bỏ trận khi chưa ai ra đòn: trận không tính, người bỏ phải chờ chừng này mới đăng ký lại được
  dodgeLock: 60000,
  weekly: [
    { to: 1, luong: 100, xu: 200000, items: [['chest', 3]] },
    { to: 3, luong: 60, xu: 120000, items: [['chest', 2]] },
    { to: 10, luong: 30, xu: 60000, items: [['chest', 1]] },
    { to: 50, luong: 10, xu: 20000 },
  ],
};

module.exports = { CHECKIN, WHEEL, TATHU, MAIL, GIFTCODES, CODE_LIMIT, SEASONS, ARENA };
