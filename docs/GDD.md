# Thiết kế game (GDD) — Ninja School Pixel Online

| Mục | Nội dung |
|---|---|
| Phiên bản | 1.0 của GDD (bản ghép đầu tiên, gộp 17 file mục, sổ tính năng và lộ trình) |
| Ngày | 2026-10-18 |
| Phạm vi | bản 1.0 của game: cấp 1-199, 9 giai đoạn phát triển (GĐ0-GĐ8) |
| Tài liệu đi kèm | [ROADMAP.md](ROADMAP.md) (lộ trình), [features.json](features.json) (sổ tính năng, 213 dòng, khớp 1-1 với lộ trình) |
| Quy tắc ưu tiên | `CLAUDE.md` và `DESIGN_RULES.md` thắng mọi mục GDD, trừ chỗ có ADR ghi rõ là đổi quy tắc |
| Nguồn ngoài repo | đường dẫn `specs/*.md` (đặc tả đợt 3), `content/*.md` (kế hoạch nội dung cấp 120-199) và `gddwork/` (số đo, script nháp) trỏ tới bản đặc tả nằm ở thư mục nháp của phiên ghép, **không** có trong repo; phần cần dùng đã tóm vào các mục 04-08 và vào `acceptance` của sổ. Lô nào cần bản đầy đủ thì người điều phối đính kèm khi giao việc |

Mọi tên trong game là tên tự đặt. Các game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ loại cơ chế.

---

## 1. Tóm tắt một trang

### Tầm nhìn

Ninja School Pixel Online là một thế giới ninja pixel chibi, mở ra chỉ bằng một đường link trên máy tính hay điện thoại. Người chơi chọn một trong 6 phái thuộc 3 hệ khắc chế nhau (Hỏa → Phong → Thủy → Hỏa), lớn lên từ ngôi làng mái ngói đèn lồng tới Thái Cực Thần Cảnh ở cấp 199: nhảy bục, né vùng đánh đỏ của boss, rèn vũ khí, kết bạn, lập gia tộc, so tài lôi đài và cùng cả máy chủ đón lễ hội Việt. Game giữ hồn của dòng nhập vai ninja trên điện thoại đời đầu nhưng sửa những điều từng làm người chơi bỏ cuộc: phải cài đặt, máy yếu giật, người nạp tiền đè người chơi chăm, đồ mất vì lỗi, cày mãi một việc. Đồ họa vẽ bằng code, máy chủ quyết định mọi kết quả, mọi màn hình chơi được bằng ngón cái. Chi tiết: [01 Tầm nhìn](gdd/01-tam-nhin.md).

Vòng lặp chính: luyện cấp và làm nhiệm vụ → nhặt đồ, rèn, khảm ngọc → hạ boss, vượt hang → so tài lôi đài, chiến trường, chiến gia tộc → khoe ngoại hình, thú cưỡi, thú cưng, danh hiệu → lễ hội theo mùa kéo người quay lại.

### Trụ cột

Mỗi tính năng phục vụ ít nhất một trụ cột và không chống trụ cột nào (trường `pillars` trong sổ). Khi xung đột: **P5 > P2 > P3 > P4 > P1**; ràng buộc bản quyền và kiến trúc của `CLAUDE.md` đứng trên mọi trụ cột.

| Trụ cột | Tên | Ý chính |
|---|---|---|
| P1 | Hồn ninja Việt | nhìn, nghe, đọc như một game ninja pixel của người Việt: chibi viền tối, làng mái ngói, chữ Việt có dấu, lễ hội Việt, giờ Việt Nam; tên tự đặt |
| P2 | Chạm là chơi | vào chơi trong vài giây ở mọi máy, một tay vẫn chơi được, phiên 10 phút có ý nghĩa, mất mạng không mất gì |
| P3 | Đi cảnh có tay nghề | thắng thua đến từ cách chơi: đọc đòn boss, né bằng di chuyển, khắc hệ, phối kỹ năng, nhảy bục |
| P4 | Giang hồ có bạn | lý do gặp nhau (boss chung, hang nhóm, gia tộc, chợ), cách giúp nhau, sân so tài có luật |
| P5 | Công bằng và đường dài | máy chủ có thẩm quyền, kinh tế có nguồn có hút, người không nạp chăm chỉ vẫn đứng được ở đỉnh, đồ không mất vì lỗi |

### Sàn bản 1.0 (không được cắt) và số liệu hiện tại → mục tiêu

Số hiện tại đếm từ `src/shared/data/` trên cây làm việc ngày 2026-10-18 (`npm run check` đạt: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng). Sàn kiểm bằng `npm run verify -- --floor` (`dev-verify` (T0.06)).

| Sàn | Hiện tại | Mục tiêu 1.0 | Tính năng đáp ứng |
|---|---|---|---|
| Cấp tối đa 199 | 120 | 199 | `core-levelcap-199` (T2.01) |
| ≥ 80 bản đồ | 25 (23 không phải phó bản) | 92 theo kế hoạch | `world-upper` (T2.09), 8 vùng T2.08, T2.10 đến T2.16, `world-lower-fill` (T2.18) |
| ≥ 120 nhiệm vụ chính | 51 | 124 (130 nếu duyệt ADR-08-1) | `quest-main-199` (T2.17) |
| ≥ 20 thú cưỡi | 5 | 22 | `pet-beasts` (T5.03) |
| ≥ 25 thú cưng | 6 | 25 | `pet-beasts` (T5.03) |
| 7 lễ hội | 1 (Trăng Rằm, khung `evt-season-core`) | 7 dịp: Tết, Valentine, 30-4, Hè, Trung Thu, Halloween, Noel | `evt-season-plus` (T6.01), T6.03 đến T6.09 |
| ≥ 10 đặc sắc mức M/S | 10 đạt `acceptance` trên cây làm việc (9/10 chưa có trên `main` 8fac3bb, sàn chỉ tính chính thức khi T0.02 xong) | 26 trong sổ | mục 5 dưới đây |

| Hạng mục khác | Hiện tại | Mục tiêu 1.0 |
|---|---|---|
| Quái và boss | 65 loại | thêm 141 loại ở Hạ Giới (57 quái + 3 boss) và Thượng Giới (72 quái + 9 boss), cộng thêm 18 boss Hung Tinh, 3 Tà Thú cấp cao, 2 boss gia tộc và boss lễ hội (mục 05-pve, 07, 09) |
| Kỹ năng | 60 | thêm 30 kỹ năng hậu kỳ (ADR-05a-1) |
| Vật phẩm | 306 | theo đặc tả vùng, bậc trang bị 12-19, thú, thời trang, lễ hội |
| Theme bản đồ | 23 có dùng, 3 mới đã vẽ chưa dùng | 26 (ADR-07-3) |
| Nhạc / tiếng hiệu ứng | 25 / 45 file đã tạo, chưa gộp | thêm 15 bài, 44 tiếng (`snd-content-199`) |
| Sổ tính năng | 53 `done` trên 213 (kiểm trên cây làm việc) | 106 Must + 78 Should `done` và đã gộp `main` |

### Trạng thái thực tế ngày 2026-10-18

- `main` (HEAD `8fac3bb`) còn thiếu: commit `5a50602` (đợt 1, 2A, 2B: lôi đài, hộp thư, lễ hội, ngọc, thú cưng, thời trang, bản đồ thế giới, nội tại, Tà Thú; 43 file, nằm trên nhánh `checkpoint/truoc-tai-cau-truc`), tái cấu trúc sang `src/`, túi đồ, âm thanh. Bản đang chạy ở ninja.iqx.vn dựng từ nhánh mốc `checkpoint/am-thanh`, không phải từ `main`. Vì vậy `core-restructure` (T0.01) và `ops-commit-restructure` (T0.02) vẫn `todo`; kế hoạch commit 4 nhóm ở [ROADMAP lô 0-A](ROADMAP.md#giai-đoạn-0-ổn-định).
- Git index của thư mục làm việc có 221 file: tái cấu trúc + túi đồ + âm thanh (mốc `a4b4a0a`) **trộn** với việc GĐ1/GĐ2: màu nhân vật bậc 12-19, icon 18 kỹ năng cao cấp và vòng thần kỹ, 3 theme mới + 39 biến thể bản đồ + kiểu nhà trạm (nhánh `nf/f2`, `nf/f3`, `nf/w1`, mốc `d8161c2`), xu khóa và cân bằng (nhánh `dot3/bound`, `dot3/balance`). Thư mục `src/client/audio/` (25 nhạc nền + 45 tiếng hiệu ứng, `CREDITS.md`) có trong thư mục làm việc nhưng chưa theo dõi git.
- Đang làm: đợt 3 lô 1, `eco-bound` (T1.01) và `cmb-balance` (T1.03) + `dev-balance-tool` (T1.02). Mỗi nhánh có 2 commit (`655143d` + `52e230e`, `ab90718` + `9c6b3c7`), đã sửa sau rà soát và đã đưa vào index; còn chạy `npm test` trên cây gộp, chụp ảnh cổng 3621/3622, rà soát cuối.
- Định nghĩa `done` ([01 mục 5.2](gdd/01-tam-nhin.md#52-định-nghĩa-xong-áp-dụng-mọi-mức)): đạt đủ `acceptance` trên **cây làm việc hiện tại**. Việc đưa mã lên `main` theo dõi riêng bằng T0.01/T0.02; id nào có tiêu chí "đã commit lên `main`" (mở rộng túi, hủy nhanh, hộp `ask()`: `ui-bag-expand`, `ui-bag-bulkdrop`, `ui-ask-dialog`) giữ `todo` tới khi T0.02 xong; `snd-audio-files` còn thiếu nén nhạc ≤ 520 KB/bài và đo tải 10 phút đầu. 53 id `done` được kiểm trên thư mục làm việc ngày 18-10-2026 và kiểm lại sau T0.02.

### Lộ trình tóm tắt

9 giai đoạn từ 2026-10-19 tới 2027-07-18, có **ĐIỂM DỪNG 1** (2026-11-23, duyệt đồ họa nhân vật sau GĐ1) và **ĐIỂM DỪNG 2** (2027-01-11, duyệt bản đồ mới sau GĐ2). Lễ hội có đường khẩn riêng vì chạy theo ngày thật: Đêm Đông lên máy chủ trước 2026-12-05, Hội Xuân trước 2027-01-21, Tình Nhân trước 2027-02-07, Đất Tổ trước 2027-04-03. Chi tiết: [ROADMAP.md](ROADMAP.md).

---

## 2. Mục lục

| # | Mục | File | Nội dung chính |
|---|---|---|---|
| 1 | Tầm nhìn | [01-tam-nhin.md](gdd/01-tam-nhin.md) | tầm nhìn, điểm bán, người chơi mục tiêu, trụ cột P1-P5, MoSCoW, quy ước id, ADR-01-1 |
| 2 | Hiện trạng | [02-hien-trang.md](gdd/02-hien-trang.md) | kiểm kê mã và dữ liệu, nhánh chưa gộp, số đo hiệu năng, lỗi đang có |
| 3 | Đối chiếu tham khảo | [03-doi-chieu.md](gdd/03-doi-chieu.md) | đối chiếu theo loại cơ chế với game tham khảo, khoảng trống cần lấp |
| 4 | Tính năng đặc sắc | [04-dac-sac.md](gdd/04-dac-sac.md) | đặc tả các tính năng đặc sắc mới, ADR-04-1 đến ADR-04-3 |
| 5 | Hệ thống | 6 file dưới đây | đặc tả từng hệ thống |
| 5.1 | Chiến đấu | [05-he-thong-chien-dau.md](gdd/05-he-thong-chien-dau.md) | kỹ năng, trạng thái, quái tinh anh, hồi sinh, lực chiến, kinh mạch |
| 5.2 | Trang bị, rèn, túi, tiền khóa, cửa hàng | [05-he-thong-trang-bi.md](gdd/05-he-thong-trang-bi.md) | bậc 12-19, Thợ Rèn mở rộng, rèn đúc, xu khóa, kho, Rương Gia Bảo |
| 5.3 | Xã hội và PvP | [05-he-thong-xa-hoi-pvp.md](gdd/05-he-thong-xa-hoi-pvp.md) | chat an toàn, danh hiệu, nhóm, chợ, gia tộc, lôi đài, chiến trường |
| 5.4 | PvE và nội dung lặp lại | [05-he-thong-pve.md](gdd/05-he-thong-pve.md) | hang, Ấn Đài, Việc Làng, boss bản đồ, kênh bản đồ, lịch sự kiện |
| 5.5 | Thú cưỡi, thú cưng, ngoại hình | [05-he-thong-thu-ngoai-hinh.md](gdd/05-he-thong-thu-ngoai-hinh.md) | 22 thú cưỡi, 25 thú cưng, tủ ngoại hình, nhuộm, đổi tên |
| 5.6 | Giao diện và trải nghiệm | [05-he-thong-giao-dien.md](gdd/05-he-thong-giao-dien.md) | hướng dẫn tân thủ, nhắc sự kiện, cài đặt, trợ năng, bố cục điện thoại |
| 6 | Cân bằng 1-199 | [06-can-bang.md](gdd/06-can-bang.md) | đường EXP, hồ sơ người chơi trung bình, boss, PvP, kinh tế xu/lượng, công cụ mô phỏng |
| 7 | Thế giới | [07-the-gioi.md](gdd/07-the-gioi.md) | 92 bản đồ, 8 vùng Thượng Giới, trạm, tranh bản đồ thế giới, bí địa |
| 8 | Cốt truyện và nhiệm vụ | [08-cot-truyen.md](gdd/08-cot-truyen.md), phụ lục [08-phu-luc-nhiem-vu.md](gdd/08-phu-luc-nhiem-vu.md) | chuỗi chính 124 nhiệm vụ, kỳ duyên, Lệnh Truy Nã, bảng đổi tên NPC, thoại |
| 9 | Mỹ thuật và âm thanh | [09-my-thuat-am-thanh.md](gdd/09-my-thuat-am-thanh.md) | màu bậc, hào quang, quái hậu kỳ, gallery, mốc băm ảnh, nhạc và tiếng |
| 10 | Kỹ thuật và vận hành | [10-ky-thuat-van-hanh.md](gdd/10-ky-thuat-van-hanh.md) | lưu theo nhân vật, sao lưu, chống gian lận, triển khai, giám sát, trang GM |
| 11 | Kiếm tiền | [11-kiem-tien.md](gdd/11-kiem-tien.md) | mô hình lượng, trần chênh lệch G, sổ cái, cổng nạp ngoài 1.0 |
| 12 | Lộ trình và sổ tính năng | [ROADMAP.md](ROADMAP.md), [features.json](features.json) | 9 giai đoạn, lô, điểm dừng, rủi ro; 213 tính năng có tiêu chí chấp nhận |

---

## 3. Quyết định kiến trúc (ADR)

Mọi đề xuất phá quy tắc của `CLAUDE.md`, `DESIGN_RULES.md` hay đặc tả đã duyệt đều có ADR trong file mục sở hữu (bối cảnh, quyết định, phương án khác, chi phí, hệ quả). Khi ghép, các ADR trùng số đã đổi: `ADR-05-1`, `ADR-05-2` của mục chiến đấu thành `ADR-05a-x`; `ADR-05-1` đến `ADR-05-4` của mục trang bị thành `ADR-05b-x`; các bản nháp `ADR-R-1` đến `ADR-R-6` của bản rà rủi ro đã chốt thành `ADR-10-1`, `ADR-10-3`, `ADR-10-4`, `ADR-05d-1`, `ADR-01-1`.

| ADR | Tiêu đề | Trạng thái | Tính năng đi kèm (mã) |
|---|---|---|---|
| [ADR-01-1](gdd/01-tam-nhin.md#adr-01-1--cho-phép-file-âm-thanh-tự-tạo-trong-client) | Cho phép file âm thanh tự tạo trong client | Đề xuất; phần chi phí được ADR-09-1 thay | `snd-audio-files` (T7.01) |
| [ADR-04-1](gdd/04-dac-sac.md#adr-04-1-ô-ấn-kỹ-trên-cụm-kỹ-năng) | Ô Ấn Kỹ trên cụm kỹ năng | Đề xuất, chờ chủ dự án duyệt | `sig-thanhan` (T5.05) |
| [ADR-04-2](gdd/04-dac-sac.md#adr-04-2-người-xem-trận-là-nhân-vật-ẩn-trong-phòng-đấu) | Người xem trận là nhân vật ẩn trong phòng đấu | Đề xuất, chờ chủ dự án duyệt | `pvp-arena-3v3` (T6.14) |
| [ADR-04-3](gdd/04-dac-sac.md#adr-04-3-tiến-độ-khi-không-online-có-trần) | Tiến độ khi không online có trần | Đề xuất, chờ chủ dự án duyệt | `sig-bequan` (T5.14) |
| [ADR-05a-1](gdd/05-he-thong-chien-dau.md#adr-05a-1--kỹ-năng-hậu-kỳ-bước-cấp-2-và-thêm-kỹ-năng-mỗi-phái) | Kỹ năng hậu kỳ: bước cấp 2 và thêm kỹ năng mỗi phái | Đề xuất | `cmb-skills-199` (T1.07) |
| [ADR-05a-2](gdd/05-he-thong-chien-dau.md#adr-05a-2--kinh-mạch-khi-cấp-tối-đa-lên-199) | Kinh Mạch khi cấp tối đa lên 199 | Đề xuất, sau T2.01 | `sig-meridian` (T5.01) |
| [ADR-05b-1](gdd/05-he-thong-trang-bi.md#adr-05b-1--phân-bổ-lại-thao-tác-thợ-rèn-so-với-specscraftingmd) | Phân bổ lại thao tác Thợ Rèn so với `specs/crafting.md` | Đề xuất | `gear-smith-plus` (T3.02) |
| [ADR-05b-2](gdd/05-he-thong-trang-bi.md#adr-05b-2--rương-gia-bảo-lưu-ở-bản-ghi-tài-khoản) | Rương Gia Bảo lưu ở bản ghi tài khoản | Đề xuất, chỉ làm sau T0.10 | `gear-storage-plus` (T3.20) |
| [ADR-05b-3](gdd/05-he-thong-trang-bi.md#adr-05b-3--chỉ-số-mới-pvpres-kháng-sát-thương-người-chơi) | Chỉ số mới `pvpRes` (kháng sát thương người chơi) | Đề xuất | `gear-fame` (T4.07) |
| [ADR-05b-4](gdd/05-he-thong-trang-bi.md#adr-05b-4--đá-hoàn-lại-luôn-khóa) | Đá hoàn lại luôn khóa | Đề xuất, bổ sung `specs/bound.md` | `eco-bound` (T1.01) |
| [ADR-05c-1](gdd/05-he-thong-xa-hoi-pvp.md#adr-05c-1--lượng-là-tiền-tệ-trên-chợ-ký-gửi) | Lượng là tiền tệ trên Chợ Ký Gửi | Đề xuất, chờ chủ dự án duyệt | `eco-market` (T3.01) |
| [ADR-05c-2](gdd/05-he-thong-xa-hoi-pvp.md#adr-05c-2--lưu-ngữ-cảnh-chat-kèm-báo-cáo-vi-phạm) | Lưu ngữ cảnh chat kèm báo cáo vi phạm | Đề xuất, chờ chủ dự án duyệt | `soc-chat-safety` (T4.11) |
| [ADR-05c-3](gdd/05-he-thong-xa-hoi-pvp.md#adr-05c-3--exp-nhóm-chỉ-chia-trong-tầm-900-px) | EXP nhóm chỉ chia trong tầm 900 px | Đề xuất, chờ chủ dự án duyệt | `soc-party-plus` (T4.13) |
| [ADR-05d-1](gdd/05-he-thong-pve.md#adr-05d-1--kênh-bản-đồ-cho-bãi-luyện-công) | Kênh bản đồ cho bãi luyện công | Đề xuất, chờ chủ dự án duyệt | `world-channels` (T5.11) |
| [ADR-05e-1](gdd/05-he-thong-thu-ngoai-hinh.md#adr-05e-1--thú-cưỡi-dùng-mức-chặn-chỉ-số-theo-cấp-tách-khỏi-mức-chặn-thời-trang) | Thú cưỡi dùng mức chặn chỉ số theo cấp, tách khỏi mức chặn thời trang | Đề xuất, chờ chủ dự án duyệt | `pet-beasts` (T5.03) |
| [ADR-05e-2](gdd/05-he-thong-thu-ngoai-hinh.md#adr-05e-2--tủ-ngoại-hình-kiểu-hiển-thị-có-thể-khác-món-đang-mặc-3-ô-thời-trang) | Tủ ngoại hình: kiểu hiển thị có thể khác món đang mặc (3 ô thời trang) | Đề xuất, chờ chủ dự án duyệt | `pet-wardrobe` (T6.17) |
| [ADR-05e-3](gdd/05-he-thong-thu-ngoai-hinh.md#adr-05e-3--cho-phép-đổi-tên-nhân-vật-dù-tên-là-khóa-dữ-liệu) | Cho phép đổi tên nhân vật dù tên là khóa dữ liệu | Đề xuất; 1.0 không bán Thẻ Cải Danh | `char-rename` (T8.06) |
| [ADR-05f-1](gdd/05-he-thong-giao-dien.md#adr-05f-1--nhắc-sự-kiện-ngoài-game-bằng-thông-báo-đẩy-của-trình-duyệt-từ-chối-ở-10) | Nhắc sự kiện ngoài game bằng thông báo đẩy của trình duyệt | Đề xuất từ chối ở 1.0 (chỉ nhắc trong game) | `ui-notify-center` (T7.06) |
| [ADR-05f-2](gdd/05-he-thong-giao-dien.md#adr-05f-2--cho-phép-phóng-chữ-115-và-130-trong-cửa-sổ) | Cho phép phóng chữ 115% và 130% trong cửa sổ | Đề xuất, chờ chủ dự án duyệt | `ui-a11y` (T7.05) |
| [ADR-05f-3](gdd/05-he-thong-giao-dien.md#adr-05f-3--cho-phép-người-chơi-dời-và-đổi-cỡ-d-pad-cụm-kỹ-năng) | Cho phép người chơi dời và đổi cỡ D-pad, cụm kỹ năng | Đề xuất, chờ chủ dự án duyệt | `ui-settings-sync` (T7.07) |
| [ADR-06-1](gdd/06-can-bang.md#adr-06-1--hệ-số-pvp-nhân-sau-khi-trừ-thủ-kèm-hệ-số-phái) | Hệ số PvP nhân sau khi trừ thủ, kèm hệ số phái | Đề xuất, chờ chủ dự án duyệt | `cmb-pvp-balance` (T4.08) |
| [ADR-06-2](gdd/06-can-bang.md#adr-06-2--thưởng-exp-việc-ngày-không-nhân-expscalebí-kíp-trần-hệ-số-exp-quái-3) | Thưởng EXP việc ngày không nhân `expScale`/Bí Kíp, trần hệ số EXP quái ×3 | Đề xuất, **cần người điều phối duyệt** (đi ngược `content/PLAN.md`) | `cmb-balance-upper` (T3.10) |
| [ADR-06-3](gdd/06-can-bang.md#adr-06-3--trần-60-lượngngày-từ-hoạt-động-lặp-lại-phần-vượt-đổi-xu-khóa) | Trần 60 lượng/ngày từ hoạt động lặp lại, phần vượt đổi xu khóa | Đề xuất, chờ chủ dự án duyệt | `mon-spend-cap` (T3.23) |
| [ADR-07-1](gdd/07-the-gioi.md#adr-07-1--trạm-outpost-và-điểm-về-theo-home) | Trạm `outpost()` và điểm về theo `home` | Đề xuất, chờ chủ dự án duyệt | `world-home` (T2.05) |
| [ADR-07-2](gdd/07-the-gioi.md#adr-07-2--tọa-độ-bản-đồ-thế-giới-nằm-trong-dữ-liệu-wm) | Tọa độ bản đồ thế giới nằm trong dữ liệu (`wm`) | Đề xuất, chờ chủ dự án duyệt | `world-layout` (T2.20) |
| [ADR-07-3](gdd/07-the-gioi.md#adr-07-3--thêm-3-theme-mới) | Thêm 3 theme mới | Đề xuất; phần vẽ đã làm, chưa gộp, chưa bản đồ nào dùng | `art-themes-new` (T2.07) |
| [ADR-07-4](gdd/07-the-gioi.md#adr-07-4--cửa-ẩn-bí-địa-ngoài-luật-vùng-tìm-đường-có-lọc) | Cửa ẩn, bí địa ngoài luật vùng, tìm đường có lọc | Đề xuất, chờ chủ dự án duyệt | `world-hidden` (T5.16) |
| [ADR-08-1](gdd/08-cot-truyen.md#adr-08-1--chèn-nhiệm-vụ-hạ-giới-vào-giữa-chuỗi-chính-lấp-khoảng-trống-84-95) | Chèn nhiệm vụ Hạ Giới vào giữa chuỗi chính (lấp khoảng trống 84-95) | Đề xuất, chờ chủ dự án duyệt | `quest-main-gap` (T2.19) |
| [ADR-09-1](gdd/09-my-thuat-am-thanh.md#adr-09-1--âm-thanh-từ-file-do-model-tạo-chi-tiết-thực-thi-giấy-phép-ngân-sách-nhạc-tổng-hợp-là-dự-phòng-bắt-buộc) | Âm thanh từ file do model tạo: chi tiết thực thi, giấy phép, ngân sách; nhạc tổng hợp là dự phòng bắt buộc | Đề xuất; thay phần "Chi phí" của ADR-01-1 | `snd-audio-files` (T7.01) |
| [ADR-09-2](gdd/09-my-thuat-am-thanh.md#adr-09-2--mốc-hồi-quy-đồ-họa-lưu-bằng-mã-băm-không-commit-ảnh) | Mốc hồi quy đồ họa lưu bằng mã băm, không commit ảnh | Đề xuất | `dev-baseline-shots` (T1.12) |
| [ADR-10-1](gdd/10-ky-thuat-van-hanh.md#adr-10-1--lưu-theo-nhân-vật-ghi-phần-bẩn-nhật-ký-nhóm-ghi-chốt-adr-r-1) | Lưu theo nhân vật, ghi phần bẩn, nhật ký nhóm ghi (chốt `ADR-R-1`) | Chấp nhận, GĐ0 | `ops-persist-shard` (T0.10) |
| [ADR-10-2](gdd/10-ky-thuat-van-hanh.md#adr-10-2--sqlite-tích-hợp-của-node-không-làm-ở-10-có-điều-kiện-kích-hoạt) | SQLite tích hợp của Node: không làm ở 1.0, có điều kiện kích hoạt | Từ chối cho 1.0, xem lại khi chạm điều kiện | không có tính năng |
| [ADR-10-3](gdd/10-ky-thuat-van-hanh.md#adr-10-3--gói-dữ-liệu-tĩnh-qua-http-có-băm-phiên-bản-chốt-adr-r-4) | Gói dữ liệu tĩnh qua HTTP có băm phiên bản (chốt `ADR-R-4`) | Chấp nhận, GĐ7 | `ops-data-http` (T7.09) |
| [ADR-10-4](gdd/10-ky-thuat-van-hanh.md#adr-10-4--trang-quản-trị-gm-riêng-có-api-http-ghi-dữ-liệu-chốt-adr-r-5) | Trang quản trị GM riêng có API HTTP ghi dữ liệu (chốt `ADR-R-5`) | Chấp nhận, GĐ8 | `ops-gm-panel` (T8.05) |
| [ADR-10-5](gdd/10-ky-thuat-van-hanh.md#adr-10-5--nâng-node-lên-24-lts) | Nâng Node lên 24 LTS | Chấp nhận | `ops-deploy` (T8.02) |
| [ADR-10-6](gdd/10-ky-thuat-van-hanh.md#adr-10-6--thư-mục-scripts-cho-công-cụ-vận-hành) | Thư mục `scripts/` cho công cụ vận hành | Chấp nhận | `dev-verify` (T0.06) |
| [ADR-11-1](gdd/11-kiem-tien.md#adr-11-1--cổng-nạp-qua-nhà-cung-cấp-thanh-toán-ngoài) | Cổng nạp qua nhà cung cấp thanh toán ngoài | Đề xuất; chỉ bật khi pháp chế xác nhận bằng văn bản | `mon-topup` (T8.07) |
| [ADR-11-2](gdd/11-kiem-tien.md#adr-11-2--lượng-là-một-loại-chợ-bằng-lượng-giữ-lại-kèm-3-rào) | Lượng là một loại; chợ bằng lượng giữ lại kèm 3 rào | Đề xuất, chờ chủ dự án duyệt | `eco-market` (T3.01) |

Tổng 38 ADR: 5 chấp nhận, 1 từ chối, còn lại là đề xuất.

---

## 4. MoSCoW tổng

Định nghĩa mức và quy tắc ở [01 mục 5](gdd/01-tam-nhin.md#5-moscow-áp-dụng-cho-dự-án): sàn luôn là Must; mỗi giai đoạn Must ≤ 60%, Must + Should ≤ 80% công (tính theo cỡ S = 1, M = 2, L = 4); Must không phụ thuộc Should/Could; `done` xét trên cây làm việc, id có tiêu chí "đã commit lên `main`" giữ `todo` tới khi T0.02 xong.

| Mức | Số tính năng | Đã xong | Còn lại |
|---|---|---|---|
| Must | 106 | 43 | 63 |
| Should | 78 | 10 | 68 |
| Could | 25 | 0 | 25 |
| Won't | 4 | 0 | 4 |
| **Tổng** | **213** | **53** | **160** |

Không có tính năng nào ở trạng thái `blocked`.

### Theo giai đoạn

| GĐ | Tên | Số | M | S | C | W | Đã xong | M % công | M+S % công |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Ổn định | 21 | 19 | 2 | 0 | 0 | 6 | 95% | 100% |
| 1 | Chiến đấu và đồ họa nhân vật | 34 | 26 | 7 | 1 | 0 | 19 | 74% | 97% |
| 2 | Thế giới 121-199 và nhiệm vụ | 30 | 22 | 8 | 0 | 0 | 4 | 69% | 100% |
| 3 | Trang bị, rèn và kinh tế | 30 | 15 | 12 | 3 | 0 | 7 | 50% | 93% |
| 4 | Xã hội, gia tộc và PvP | 23 | 6 | 15 | 2 | 0 | 8 | 21% | 93% |
| 5 | Tính năng đặc sắc | 25 | 3 | 15 | 7 | 0 | 4 | 11% | 69% |
| 6 | Sự kiện và lễ hội | 25 | 9 | 9 | 7 | 0 | 3 | 36% | 75% |
| 7 | Âm thanh và hoàn thiện | 15 | 3 | 8 | 2 | 2 | 2 | 17% | 60% |
| 8 | Tải và vận hành | 10 | 3 | 2 | 3 | 2 | 0 | 25% | 50% |

GĐ0, GĐ1, GĐ2 vượt ngân sách vì gần như toàn việc sàn, chống mất dữ liệu và đợt 3 lô 1 đang chạy; không được hạ (quy tắc 1, 4). Cách bù ghi ở [ROADMAP mục "Tổng quan giai đoạn"](ROADMAP.md#tổng-quan-giai-đoạn).

### Theo file mục sở hữu

| File | Số | M | S | C | W | Đã xong |
|---|---|---|---|---|---|---|
| [02-hien-trang.md](gdd/02-hien-trang.md) | 1 | 0 | 0 | 1 | 0 | 0 |
| [04-dac-sac.md](gdd/04-dac-sac.md) | 19 | 0 | 10 | 9 | 0 | 0 |
| [05-he-thong-chien-dau.md](gdd/05-he-thong-chien-dau.md) | 17 | 10 | 7 | 0 | 0 | 9 |
| [05-he-thong-giao-dien.md](gdd/05-he-thong-giao-dien.md) | 15 | 7 | 4 | 2 | 2 | 5 |
| [05-he-thong-pve.md](gdd/05-he-thong-pve.md) | 28 | 14 | 13 | 1 | 0 | 6 |
| [05-he-thong-thu-ngoai-hinh.md](gdd/05-he-thong-thu-ngoai-hinh.md) | 9 | 3 | 2 | 4 | 0 | 3 |
| [05-he-thong-trang-bi.md](gdd/05-he-thong-trang-bi.md) | 23 | 10 | 11 | 2 | 0 | 7 |
| [05-he-thong-xa-hoi-pvp.md](gdd/05-he-thong-xa-hoi-pvp.md) | 19 | 7 | 10 | 2 | 0 | 8 |
| [06-can-bang.md](gdd/06-can-bang.md) | 7 | 6 | 1 | 0 | 0 | 0 |
| [07-the-gioi.md](gdd/07-the-gioi.md) | 16 | 14 | 1 | 1 | 0 | 3 |
| [08-cot-truyen.md](gdd/08-cot-truyen.md) | 6 | 2 | 4 | 0 | 0 | 1 |
| [09-my-thuat-am-thanh.md](gdd/09-my-thuat-am-thanh.md) | 18 | 9 | 9 | 0 | 0 | 5 |
| [10-ky-thuat-van-hanh.md](gdd/10-ky-thuat-van-hanh.md) | 28 | 22 | 5 | 0 | 1 | 6 |
| [11-kiem-tien.md](gdd/11-kiem-tien.md) | 7 | 2 | 1 | 3 | 1 | 0 |

---

## 5. Tính năng đặc sắc mức Must/Should

Sàn yêu cầu ≥ 10. Sổ có **26** tính năng đặc sắc (`signature: true`) mức Must/Should: **10 đã xong** (đạt `acceptance` trên cây làm việc nên sàn đạt trên cây làm việc; 9/10 chưa có trên `main` 8fac3bb, chỉ `pve-dungeon` có, nên sàn tính chính thức khi T0.02 xong) và 16 trong kế hoạch. Thêm 9 tính năng đặc sắc mức Could không tính vào sàn. Đặc tả các tính năng mới ở [04-dac-sac.md](gdd/04-dac-sac.md).

### Đã xong

| Mã | id | Tên | Mức | GĐ | Trạng thái | Trụ cột |
|---|---|---|---|---|---|---|
| T1.26 | `cmb-passive` | Kỹ năng nội tại học bằng sách, 10 chỉ số nội tại | Should | 1 | done | P3, P5 |
| T2.30 | `world-worldmap` | Bản đồ thế giới và tự tìm đường liên bản đồ | Must | 2 | done | P2 |
| T3.27 | `gear-gems` | Ngọc khảm 6 loại × 10 cấp, ghép 3 → 1 | Should | 3 | done | P5 |
| T4.16 | `pvp-arena` | Lôi đài xếp hạng 1-1 Elo, thưởng tuần | Should | 4 | done | P3, P4 |
| T4.21 | `soc-mail` | Hộp thư 30 thư + giftcode theo tài khoản | Must | 4 | done | P5 |
| T5.22 | `pet-fashion` | Thời trang 3 ô (mặt nạ, áo choàng, y phục) có chỉ số, bản có hạn 7 ngày | Should | 5 | done | P1 |
| T5.24 | `pet-pets` | Thú cưng có cấp, thân mật, thức ăn, kỹ năng nhặt đồ/hồi máu | Must | 5 | done | P1, P4 |
| T5.25 | `pve-dungeon` | Hang Động Thử Thách: phó bản nhóm 5 đợt, 3 lượt/ngày | Should | 5 | done | P3, P4 |
| T6.24 | `evt-season-core` | Khung lễ hội theo mùa: SEASONS, rơi token, Sứ Giả đổi quà, /sukien | Must | 6 | done | P1, P4 |
| T6.25 | `pve-tathu` | Tà Thú Xuất Thế mỗi 2 giờ (giờ chẵn :30, 20 phút, thưởng theo hạng) | Should | 6 | done | P4, P3 |

### Trong kế hoạch 1.0

| Mã | id | Tên | Mức | GĐ | Trạng thái | Trụ cột |
|---|---|---|---|---|---|---|
| T1.05 | `cmb-clone` | Phân Thân: kỹ năng cấp 70 mỗi phái | Should | 1 | todo | P3 |
| T4.02 | `clan-war` | Gia tộc mở rộng (nhiệm vụ, cửa hàng cống hiến, trận pháp, Tộc Địa) + chiến gia tộc (theo specs/clanwar.md + chỉnh W1-W5) | Should | 4 | todo | P4 |
| T4.03 | `pvp-battlefield` | Chiến Trường Long Phượng (theo specs/battlefield.md + chỉnh B1-B4) | Should | 4 | todo | P3, P4 |
| T5.01 | `sig-meridian` | Kinh Mạch: tu luyện hậu kỳ cộng chỉ số | Should | 5 | todo | P5 |
| T5.02 | `pet-mountup` | Thú cưỡi nuôi và tiến hóa, thú cưng tiến hóa hình thái, pháp bảo sau lưng | Should | 5 | todo | P1, P4 |
| T5.05 | `sig-thanhan` | Thanh Ấn: tích Ấn khí theo đòn trúng/chịu đòn/né hiểm, Ấn Kỹ riêng mỗi phái có cut-in | Should | 5 | todo | P3, P1 |
| T5.06 | `sig-hopkich` | Hợp Kích: đòn phối hợp khi đồng đội khác hệ ra chiêu trúng cùng quái trong 3 giây, Tam Tài Quy Nguyên đủ 3 hệ | Should | 5 | todo | P3, P4 |
| T5.07 | `sig-thuctinh` | Thức Tỉnh cấp 100 và 150: vượt Tâm Ma Cảnh, chọn 1 trong 2 nhánh đổi cách chơi phái | Should | 5 | todo | P3, P5 |
| T5.08 | `pve-thapvotan` | Tháp Vô Tận: leo 150 tầng một mình, thủ lĩnh mỗi 10 tầng, BXH tuần 3 dải cấp | Should | 5 | todo | P3, P2 |
| T5.12 | `sig-sonhangia` | Sổ Nhẫn Giả: sưu tầm quái, boss, vật phẩm, thú, thời trang; hạng sổ có trần chỉ số; hiệu ứng tên | Should | 5 | todo | P4, P5 |
| T5.13 | `soc-nhanduyen` | Nhân Duyên: thân thiết, sư đồ, kết nghĩa, kết duyên có kỹ năng đôi | Should | 5 | todo | P4 |
| T5.14 | `sig-bequan` | Bế Quan: EXP khi không online có trần 10 giờ, ủy thác lượt hằng ngày bỏ lỡ hôm qua | Should | 5 | todo | P2, P5 |
| T6.10 | `pve-worldboss` | Hung Tinh Giáng Thế: 5 khung/ngày, 9 dải cấp, 18 boss wb_*, máu theo người online | Should | 6 | todo | P4, P3 |
| T6.13 | `evt-village-defense` | Thủ Hộ Làng: phòng thủ Linh Thạch qua 5 đợt lúc 12:00 và 21:00 | Should | 6 | todo | P4 |
| T6.14 | `pvp-arena-3v3` | Lôi Đài Tam Hùng 3 đấu 3 có Elo riêng, khung giờ cố định, xem trận trực tiếp | Should | 6 | todo | P3, P4 |
| T6.15 | `sig-nhangialenh` | Nhẫn Giả Lệnh: kỳ 28 ngày 40 bậc, nhánh miễn phí đồ khóa, Kim Lệnh 300 lượng chỉ ngoại hình | Should | 6 | todo | P4, P5 |

---

## 6. Câu hỏi mở tổng hợp

Gom 186 câu hỏi mở của 17 file mục thành 117 câu (gộp các câu trùng ý). Mỗi câu có phương án mặc định: mọi lô làm theo mặc định cho tới khi chủ dự án chốt khác. Khi hai mục trả lời khác nhau, phương án của mục sở hữu tính năng thắng và đã ghi trong cột mặc định. Ký hiệu nguồn: số là file mục (01-11), CĐ chiến đấu, TB trang bị, XH xã hội-PvP, PvE, TN thú-ngoại hình, GD giao diện, PL phụ lục nhiệm vụ.

### K. Cần chủ dự án quyết trước khi mở giai đoạn kế

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| K1 | Chấp nhận các điều chỉnh khi ghép sổ tính năng (dời `eco-bound` GĐ3 → GĐ1, `cmb-balance-upper` GĐ2 → GĐ3, `quest-dailies` GĐ2 → GĐ3, `pvp-arena-3v3` và `sig-thoitiet` GĐ5 → GĐ6; nâng `dev-sim-tools`, `world-worldmap`, `dev-gallery` lên Must; bản vá ADR-06-2 sang T3.10; 20 bậc trang bị về T2.01; gỡ 4 vòng phụ thuộc; thứ tự lô lệch `specs/PLAN.md` và `content/PLAN.md` ở 3 điểm (a), (b), (c))? | Chấp nhận như [ROADMAP mục "Điều chỉnh khi ghép"](ROADMAP.md#điều-chỉnh-khi-ghép-sổ-tính-năng); lý do ghi ở `notes` từng tính năng và từng điểm (a), (b), (c) đã kiểm không chung dòng sửa theo bảng file lõi của `specs/PLAN.md` mục 4 | [ROADMAP: Điều chỉnh khi ghép](ROADMAP.md#điều-chỉnh-khi-ghép-sổ-tính-năng) |
| K2 | Duyệt ADR-06-2 (thưởng EXP việc ngày không nhân `expScale`/Bí Kíp, trần hệ số EXP quái ×3)? | Duyệt; bản vá 4 dòng đi trong `cmb-balance-upper` (T3.10), áp sau lô `dailies` (T3.04) và F1 (T2.01) đúng như 06 Q9; hai lô đó vẫn làm đúng `PLAN.md`; nếu không duyệt thì giữ phương án A và nới tiêu chí `sim-exp` | [06 Q9](gdd/06-can-bang.md#13-câu-hỏi-mở), [PL F4](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |
| K3 | Duyệt ADR-08-1 (chèn `hg_q1`-`hg_q6` lấp khoảng 84-95)? | Duyệt, phát hành sau khi F1 chạy thật một bản; bảng B không tính vào sàn 120 (sàn đã đạt bằng 124 dòng bảng A) | [08 2](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [PL F2](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |
| K4 | Âm thanh: đưa file vào git dù kho đã 47 MB (`.ogg` + `.m4a`), vượt ngân sách ADR-09-1 (≤ 21 MB nhạc + 2 MB tiếng)? | Có, giữ trong git ở `src/client/audio/` kèm `CREDITS.md`; nén nhạc Opus 40-48 kbps trước khi commit hoặc ngay lô 7-A, tải lười theo bản đồ, nhạc tổng hợp làm dự phòng | [02 Q2](gdd/02-hien-trang.md#10-câu-hỏi-mở), [09 Q2](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| K5 | Index của thư mục làm việc đang trộn đợt 1-2B, tái cấu trúc, túi đồ, âm thanh với việc GĐ1/GĐ2: commit thế nào? | Dựng `main` từ chuỗi commit có sẵn, không commit thẳng từ index: (0) cherry-pick `5a50602` → (1) tái cấu trúc thuần (cây `920700a`, viết lại thông điệp "tạm: ảnh chụp") → (2) túi đồ → (3) âm thanh kèm `src/client/audio/` và `CREDITS.md`, `README.md` sửa câu âm thanh trong nhóm này. Nhánh `nf/f2`, `nf/f3`, `nf/w1`, `dot3/bound`, `dot3/balance` giữ riêng, rebase lên `main` mới và gộp đúng lượt ở GĐ1/GĐ2; trước khi đẩy so `git diff` để không mất việc | [02 Q1](gdd/02-hien-trang.md#10-câu-hỏi-mở), [02 Q8](gdd/02-hien-trang.md#10-câu-hỏi-mở) |
| K6 | Mùa `giangsinh2026` mở 12/12/2026 trong khi GĐ6 xếp tháng 4-5/2027: có kịp không? | Đường khẩn tối thiểu lên máy chủ trước 05/12/2026 (file mùa, token, icon, Sứ Giả mặc đồ mùa, thời trang) trên khung `evt-season-core`; việc lễ hội và boss lễ bật khi T6.01, T6.12 vào | [PvE Q4](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| K7 | Ca kiểm thử chập chờn "Thỏ Ngọc tự nhặt đồ rơi gần chủ" có chặn gộp không? | Không chặn đợt 3 lô 1, nhưng T0.15 phải làm ổn định và `npm test` đạt 10/10 lần liên tiếp trước khi GĐ0 ra | [ROADMAP: Rủi ro](ROADMAP.md#rủi-ro) |
| K8 | Tên game chính thức khi phát hành? | Giữ "Ninja School Pixel Online" tới khi chủ dự án chốt thương hiệu; kiểm trùng nhãn hiệu trước khi mở máy chủ chính thức (GĐ8) | [01 Q8](gdd/01-tam-nhin.md#9-câu-hỏi-mở) |
| K9 | Các ADR còn trạng thái "Đề xuất" (bảng mục 3) duyệt lúc nào? | Mặc định chấp nhận khi lô của tính năng đi kèm bắt đầu, trừ ADR-06-2 và ADR-08-1 (K2, K3) cần duyệt rõ; từ chối thì mục sở hữu dùng "Phương án khác" đã ghi trong ADR | [01 mục 8](gdd/01-tam-nhin.md#8-quyết-định-kiến-trúc-adr) |

### A. Phát hành, kỹ thuật, vận hành

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| A1 | Có nạp tiền thật (mua lượng) ở bản 1.0? | Không; `PAY_PROVIDER=off`; `mon-topup` mức C, bật chỉ khi pháp chế xác nhận bằng văn bản và ADR-11-1 được duyệt | [01 Q1](gdd/01-tam-nhin.md#9-câu-hỏi-mở), [11 1](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| A2 | Khi bật nạp: nhà cung cấp đầu tiên và tỉ giá? | Ví điện tử + chuyển khoản QR qua trung gian (phí 1-3%), thẻ cào để sau; 100 đ = 1 lượng | [11 2](gdd/11-kiem-tien.md#12-câu-hỏi-mở), [11 3](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| A3 | Mục tiêu tải của bản 1.0? | 300 người online trên một tiến trình Node; 500 chỉ là kịch bản sức chịu để báo cáo | [01 Q2](gdd/01-tam-nhin.md#9-câu-hỏi-mở), [10 Q13](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A4 | Giới hạn bộ nhớ container production? | 768 MB, ghi `mem_limit: 768m` vào mẫu docker compose khi làm `ops-deploy` | [02 Q4](gdd/02-hien-trang.md#10-câu-hỏi-mở), [10 Q1](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A5 | Hệ số chậm của VPS so với máy đo và tỉ lệ online trên tổng nhân vật? | VPS chậm ×2; online 5-10% tổng nhân vật; đo lại ở `ops-load-test` và qua `/api/metrics` sau 1 tháng | [10 Q2](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở), [10 Q3](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A6 | Sao lưu ngoài máy để đâu, ai giữ khóa? | Kho đối tượng giá rẻ qua `rclone crypt`, khóa do chủ dự án giữ ngoài VPS, giữ 30 bản ngày + 12 bản tháng | [10 Q4](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A7 | Kéo image GHCR theo SHA có cần gói công khai? | Giữ gói riêng, VPS đăng nhập bằng token chỉ đọc; gặp khó thì đặt công khai | [10 Q5](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A8 | Đổi định danh nhân vật sang `uid` trước 1.0? | Không; giữ khóa theo tên + móc `charRenamed`, xét sau 1.0 bằng ADR riêng | [10 Q6](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A9 | Lệnh kiểm thử (`/lv`, `/plus`, `/bosshp`) có dùng ở production? | Không; tắt ở production (`ops-admin-guard`), hỗ trợ qua trang GM có lý do và nhật ký | [10 Q7](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A10 | Giới hạn giftcode theo IP có làm khó người chơi chung mạng? | Chỉ áp cho mã có lượng, 3 lần/IP/ngày; GM tạo được mã không giới hạn IP cho sự kiện cộng đồng | [10 Q8](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A11 | Kênh cảnh báo `ALERT_WEBHOOK` gửi về đâu? | Nhóm chat của chủ dự án nhận webhook JSON; chưa có thì dùng kiểm tra từ xa + báo admin online | [10 Q9](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A12 | Sàn "7 lễ hội" đếm theo khóa nào? | Khóa tùy chọn `fest` trong `SEASONS` (7 dịp), `check-data` kiểm, `npm run verify -- --floor` đếm số dịp khác nhau | [10 Q10](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A13 | `ops-anticheat-move` kéo về GĐ1 có vượt ngân sách? | Không đáng kể (cỡ S); vượt thì làm đầu GĐ4 trước phần còn lại của `ops-anticheat` | [10 Q11](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A14 | Khung giờ triển khai thường? | Ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện; bản vá khẩn ngoài khung | [10 Q12](gdd/10-ky-thuat-van-hanh.md#18-câu-hỏi-mở) |
| A15 | Chạy kiểm thử trình duyệt (`test:e2e`, `test:ui`, `test:perf`) trên bản stage trước khi commit? | Có, sau khi agent đang sửa lỗi cuối báo xong; chạy ở cổng riêng (ví dụ 3640) với `DATA_DIR` riêng, kết quả ghi vào báo cáo commit | [02 Q3](gdd/02-hien-trang.md#10-câu-hỏi-mở) |
| A16 | Có tách `game/game.js` trước đợt 3? | Không; tách sau lô 4 ở `core-gameloop-split` (GĐ7) | [02 Q5](gdd/02-hien-trang.md#10-câu-hỏi-mở) |
| A17 | Màn dọc điện thoại và đa ngôn ngữ? | Không ở 1.0 (`ui-portrait`, `ui-i18n` mức W); giữ màn ngang + `#rotate-hint`, chữ hiển thị gom về dữ liệu/cửa sổ để tách sau | [01 Q5](gdd/01-tam-nhin.md#9-câu-hỏi-mở), [01 Q6](gdd/01-tam-nhin.md#9-câu-hỏi-mở) |
| A18 | Đặc sắc dùng tiền tố `sig-` hay tiền tố khu vực? | Tiền tố khu vực + `signature: true`; `sig-` chỉ cho hệ thống không thuộc khu vực nào | [01 Q7](gdd/01-tam-nhin.md#9-câu-hỏi-mở) |

### B. Cân bằng và tiến độ

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| B1 | Thời lượng 1 → 199 có quá dài, có dốc `EXP_HI.div` 2000 → 1000? | Giữ đường EXP gốc và `EXP_HI.div = 2000`; sau 2 tuần số liệu thật, trung vị đạt 199 dưới 10 ngày lịch thì hạ 1000 (một hằng số, người chơi giữ % thanh EXP) | [01 Q3](gdd/01-tam-nhin.md#9-câu-hỏi-mở), [06 Q1](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B2 | Hệ số EXP nhiệm vụ diệt boss vùng `<prefix>_q7` là 1,0 hay 0,6? | 1,0 cho tới khi `tools/sim-exp.js --check` (T3.21) có đủ nguồn; báo TB 120 → 199 dưới 20 giờ hoặc luyện quái dưới 20% ở dải ≥ 120 thì hạ 8 nhiệm vụ về 0,6 và sinh lại bảng A phụ lục | [06 Q10](gdd/06-can-bang.md#13-câu-hỏi-mở), [08 1](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [PL F1](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |
| B3 | Tiểu Nhị (20 việc) + Việc Làng (10 việc) có làm lên cấp quá nhanh? | Giữ song song; đo bằng `dev-balance-tool` sau khi T3.04 vào, nếu 1 → 199 dưới 70 giờ thì giảm hệ số EXP Việc Làng trước, không giảm số lượt | [PvE Q1](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| B4 | `PVP.k` 0,06 hay 0,08; hệ số phái PvP áp ở đâu? | 0,06 (trận trung vị 15-21 giây), chỉnh sau mùa lôi đài đầu; hệ số phái áp cho mọi sát thương người lên người | [06 Q2](gdd/06-can-bang.md#13-câu-hỏi-mở), [06 Q7](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B5 | Trần ngọc hồ sơ trung bình trên 120 là 8 hay 7? | Giữ 8, thêm dải "chỉ trang bị"; đo lại khi T3.10 xong | [06 Q3](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B6 | Chí mạng vượt trần 60% có đổi thành sát thương chí mạng? | Không ở 1.0; hiển thị "(đã trần)", xem lại khi làm `cmb-power-score` | [06 Q4](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B7 | Lực chiến: hiện con số tổng và tính hồi máu phái Quạt? | Không tính hồi máu (chênh đo được ≤ 10,5%); so sánh đồ dùng từng chỉ số, chỉ thêm dòng tổng khi công thức lực chiến của 06 được duyệt | [CĐ Q8](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở), [GD Q4](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| B8 | Bù người đã bán Đá Thần giá cũ khi giảm giá bán NPC? | Không bù, báo trước 3 ngày trong bản tin | [06 Q5](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B9 | Trần 60 lượng/ngày có tính thưởng lễ hội? | Có với thưởng lặp lại hằng ngày; không với quà một lần của mùa | [06 Q6](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B10 | Bùa Bảo Hộ dùng từ +7 hay +10 khi tính chi phí? | Từ +7 trong mô hình kinh tế; hai cách lệch dưới 15% tổng chi phí +13 | [06 Q8](gdd/06-can-bang.md#13-câu-hỏi-mở) |
| B11 | Bước nhảy giá trị ngọc ở cấp thấp (G 1,65 ở cấp 30)? | Chuyển cho T1.03; mục kiếm tiền chỉ chặn lượng mua ngọc trên mức trung bình (L2) | [11 7](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |

### C. Chiến đấu

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| C1 | Loại nhân vật admin khỏi 3 bảng xếp hạng mới? | Có, loại khỏi `power`, `pvp`, `pet` | [CĐ Q1](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C2 | Giá hồi sinh tại chỗ 1/2/3 lượng trong 10 phút có quá gắt? | Giữ, Thẻ Hồi Sinh luôn 1 thẻ; xem lại sau 2 tuần số liệu | [CĐ Q2](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C3 | Bảo vệ tân thủ chênh 20 cấp áp ở bản đồ PvP? | Không; chỉ bản đồ thường ở chế độ PK | [CĐ Q3](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C4 | Quái tinh anh 2% mỗi 30 giây, chờ 5 phút? | Giữ, tối đa 1 con mỗi bản đồ, chỉnh qua `ELITE` | [CĐ Q4](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C5 | Tầng kinh mạch thứ hai sau 80 tầng? | Không ở 1.0; Chân khí dư vẫn tích tới `qiMax` | [CĐ Q5](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C6 | Hiệu ứng trạng thái, chế độ PK, tự đánh khi đổi bản đồ hoặc thoát? | Trạng thái xóa khi đổi bản đồ/chết/thoát; chế độ PK không lưu; tự đánh chỉ chạy ở máy khách | [CĐ Q6](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở), [CĐ Q7](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở), [CĐ Q9](gdd/05-he-thong-chien-dau.md#8-câu-hỏi-mở) |
| C7 | Phân thân dùng trong chiến trường, chiến gia tộc? | Triệu hồi được mọi nơi trừ làng và lôi đài; không gây sát thương lên người | [03 Q10](gdd/03-doi-chieu.md#8-câu-hỏi-mở) |
| C8 | Ấn Kỹ dùng phím 7 + nút riêng hay thay ô kỹ năng 6? | Phím 7 + nút 48px riêng (ADR-04-1) | [04 1](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| C9 | Hợp Kích có tính trong PvP ở 1.0? | Chỉ PvE | [04 2](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| C10 | Thức Tỉnh: phí đổi nhánh và giới hạn thử Tâm Ma Cảnh? | 200.000 xu × tầng, hồi 7 ngày, lần đầu trong 24 giờ miễn phí; Tâm Ma Cảnh thua không mất EXP, thử lại không giới hạn (chờ 30 giây) | [04 3](gdd/04-dac-sac.md#16-câu-hỏi-mở), [04 13](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| C11 | Khựng đòn khi tự đánh; quái thường có khung lấy đà? | Không khựng đòn thường không chí mạng (chí mạng 45 ms, trần 150 ms/giây); quái thường không lấy đà ở 1.0 | [09 Q5](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở), [09 Q9](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |

### D. Trang bị và kinh tế

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| D1 | "Tách cường hóa" là giữ món hay phá món? | Làm cả hai: tách cường hóa giữ món, hoàn 50% đá danh nghĩa (khóa) ở `gear-smith-plus`; Rã đồ phá món lấy Tinh Thiết + 30% đá ở `gear-crafting` (mục trang bị là chủ, thắng phương án của 03) | [03 Q1](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [TB Q1](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [TB Q2](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D2 | Chuyển cường hóa giữa hai món: khác phái, khác ô? | Cho khác phái cùng ô `weapon`, bậc món nhận ≥ món nguồn; không cho khác ô | [03 Q2](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [TB Q3](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D3 | Rèn đúc có ra Huyền thoại; ghép đá có giới hạn ngày? | Không ra Huyền thoại (40/35/20/5 tới Sử thi); ghép đá không giới hạn, theo dõi xu hút ở `ops-audit-log` | [TB Q4](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [TB Q5](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D4 | Lượng có trần; mua lại món vừa bán có giữ qua đăng xuất? | Lượng trần 2 tỉ như xu; mua lại chỉ trong phiên, 10 món gần nhất | [TB Q6](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [TB Q7](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D5 | Rương Gia Bảo nhận đồ khóa, xu khóa? | Không; chỉ món `canTransfer` và xu thường | [TB Q8](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D6 | Trang sức Vinh Danh có lỗ ngọc, cường hóa, ô riêng? | Không lỗ ngọc, không cường hóa, không ô riêng (ADR-05b-3, dùng 3 ô trang sức) | [TB Q9](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [TB Q10](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D7 | Thưởng bộ 9 món, cường hóa +17 đến +20, đục thêm lỗ ngọc? | Không ở 1.0 cả ba; xét lại sau 1.0 | [TB Q11](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [TB Q13](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở), [03 Q7](gdd/03-doi-chieu.md#8-câu-hỏi-mở) |
| D8 | Rương Báu cũ chuyển sang bảng `LOOT`? | Có khi `eco-loot-tables` vào, giữ nguyên tỉ lệ | [TB Q12](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D9 | Kho mở rộng bán bằng xu? | Bằng lượng 30/60/100/150; có thể bỏ (mức C) nếu `eco-economy-model` thấy hút quá nhiều | [TB Q14](gdd/05-he-thong-trang-bi.md#16-câu-hỏi-mở) |
| D10 | Bảng xếp hạng tài phú; cược xu trong thách đấu? | Không cả hai; thay bằng bảng lực chiến, PK, thú cưng | [03 Q8](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [03 Q9](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [XH Q14](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| D11 | Hạn mức Tu Luyện, trần G, quà nhiệm vụ để giữ G khởi đầu? | 350 lượng/tuần/nhân vật; G ổn định 1,15, khởi đầu 1,40; nhiệm vụ chính tặng bộ thời trang Tốt + Thỏ Ngọc (đồ khóa, cấp 10-20) | [11 4](gdd/11-kiem-tien.md#12-câu-hỏi-mở), [11 5](gdd/11-kiem-tien.md#12-câu-hỏi-mở), [11 6](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| D12 | Món mua trên chợ bằng lượng có khóa? | Có (ADR-11-2 rào R1) | [11 8](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| D13 | Thẻ Nguyệt Bổng và Gói Khai Môn (khi bật nạp)? | 30.000 đ, 300 lượng ngay + 20/ngày, tích tối đa 7 ngày; Gói Khai Môn hiện khi nhân vật cao nhất dưới cấp 60, không đếm ngược | [11 9](gdd/11-kiem-tien.md#12-câu-hỏi-mở), [11 12](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| D14 | Bán đổi tên nhân vật, đổi phái bằng lượng ở 1.0? Giá Gương Hóa Dung, Thẻ Cải Danh? | Không bán đổi tên/đổi phái ở 1.0 (`char-rename` mức C, GĐ8); Gương Hóa Dung 30 lượng; nếu `char-rename` làm thì Thẻ Cải Danh 100 lượng (mục kiếm tiền thắng về thời điểm, mục ngoại hình giữ giá) | [11 10](gdd/11-kiem-tien.md#12-câu-hỏi-mở), [TN 7](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| D15 | Lượng đã phát trước khi có sổ cái có thu hồi? | Không; kẹp trần 1e9, đếm từ ngày gộp | [11 11](gdd/11-kiem-tien.md#12-câu-hỏi-mở) |
| D16 | Kim Lệnh giá bao nhiêu, mua tới ngày nào của kỳ? | 300 lượng, chỉ mua trong 21 ngày đầu | [04 8](gdd/04-dac-sac.md#16-câu-hỏi-mở) |

### E. Xã hội và PvP

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| E1 | Ngân sách GĐ4 có đủ cho 8 việc mới của mục xã hội? | Giữ `soc-chat-safety`, `soc-titles`, `clan-war`, `pvp-battlefield`, `pvp-arena-bracket` ở GĐ4; vượt thì `soc-party-plus` lùi GĐ5, `soc-inspect` và `pvp-freezone` sang 1.1 | [XH Q1](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E2 | Tên gia tộc có dấu và khoảng trắng? | Có ở `clan-core`: chữ Việt, số, 1 khoảng trắng giữa từ, 3-14 ký tự, kiểm trùng theo dạng bỏ dấu | [XH Q2](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E3 | Elo lôi đài tách theo khung cấp; có mùa giải? | Một Elo chung; không mùa giải ở 1.0 (thưởng tuần đã tạo nhịp), mùa 8 tuần để 1.1 | [XH Q3](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở), [XH Q4](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E4 | Danh sách từ cấm và tự cấm chat theo báo cáo? | Chủ dự án duyệt `BAD_WORDS` (≥ 80 mục) trước GĐ4, không cho tắt lọc ở kênh công khai; tự cấm 30 phút khi 3 tài khoản + 3 IP khác nhau cấp ≥ 20 báo cáo | [XH Q5](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở), [XH Q6](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E5 | Luật Luân phiên có áp cho rương thưởng boss; chênh cấp trong nhóm? | Không áp cho rương theo sát thương; thành viên thấp hơn quái > 20 cấp nhận ×0,5 thay ×1,3 (số chốt do `dev-balance-tool`) | [XH Q7](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở), [XH Q8](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E6 | Người chơi có thấy ai đã chặn mình? | Không; trả cùng câu như người offline | [XH Q9](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E7 | Khu PK tự do: giữ Đấu Trường, có rơi đồ cho tên đỏ? | Giữ làm bãi PK không thưởng, luật vào `pvp-freezone`; không rơi đồ, phạt bằng mất EXP, tên đỏ, Huyết Bảng | [02 Q7](gdd/02-hien-trang.md#10-câu-hỏi-mở), [03 Q6](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [XH Q10](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E8 | Giờ Huyết Chiến? | Hằng ngày 22:00-22:25, dời 22:05 nếu lịch cuối tuần có hoạt động đêm | [XH Q11](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E9 | Chợ Ký Gửi có trạm ở Thượng Giới; thư giữa người chơi? | Không cả hai ở 1.0 (thư kèm đồ là đường rửa xu khóa) | [XH Q12](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở), [XH Q13](gdd/05-he-thong-xa-hoi-pvp.md#5-câu-hỏi-mở) |
| E10 | Khung cấp chiến trường sau khi mở 199; danh vọng chung hay riêng? | Thêm khung 121-159 và 160-199 (5 khung, ≤ 40 người/phòng); danh vọng dùng chung `c.arena.fame` | [03 Q4](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [03 Q5](gdd/03-doi-chieu.md#8-câu-hỏi-mở) |
| E11 | Lôi Đài Tam Hùng: khung giờ và người xem? | 18:00-19:00, 21:45-23:00 hằng ngày + 15:00-17:00 cuối tuần; ai cũng xem được trừ người trong trận, không trễ hình | [04 7](gdd/04-dac-sac.md#16-câu-hỏi-mở), [04 11](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| E12 | Nhân Duyên: kết duyên mọi giới tính, cấm sư đồ cùng IP? | Có mọi giới tính, chữ "bạn đời"; cấm cùng tài khoản và cùng IP | [04 5](gdd/04-dac-sac.md#16-câu-hỏi-mở), [04 12](gdd/04-dac-sac.md#16-câu-hỏi-mở) |

### F. Thế giới, PvE, sự kiện, cốt truyện

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| F1 | Boss khi bãi luyện chia kênh: mỗi kênh một bản sao hay một boss? | Một boss ở kênh 1, kênh 1 khi có boss nâng trần 80, biểu ngữ + nút đổi kênh (ADR-05d-1, mục PvE là chủ, thắng phương án của 03) | [03 Q3](gdd/03-doi-chieu.md#8-câu-hỏi-mở), [PvE Q3](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F2 | Trần lượng boss bản đồ 60/ngày; trần lượng mỗi lượt Thủ Hộ Làng? | Giữ 60 cả hai, đo trung vị và phân vị 90 sau 2 tuần, chỉnh trong dữ liệu | [PvE Q2](gdd/05-he-thong-pve.md#12-câu-hỏi-mở), [04 9](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| F3 | Yêu Quái Lễ Hội thay lượt Tà Thú hay thêm lượt? | Thay 2 lượt 12:30 và 22:30 | [PvE Q5](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F4 | Rút ngắn Trăng Rằm 2026 để chạy Đêm Hội Hóa Trang 2026? | Không; Hóa Trang bắt đầu từ 2027 | [PvE Q6](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F5 | Ngày âm lịch của quà chính lễ nhập thế nào? | Ghi ngày dương lịch cụ thể ở `gift.on` từng file mùa, `check-data` kiểm nằm trong mùa | [PvE Q7](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F6 | Valentine và 30-4 có thành mùa riêng? | Có: Mùa Hoa Tình Nhân và Lễ Hội Đất Tổ (gộp Giỗ Tổ, 30-4, 1-5), một mùa tại một thời điểm | [01 Q4](gdd/01-tam-nhin.md#9-câu-hỏi-mở) |
| F7 | Ấn Đài: số lượt/ngày, cho đánh một mình? | 1 lượt/ngày, tăng lên 2 bằng `TRIAL_RULES.daily` nếu chậm; cho đánh một mình (máu ×0,8), cân theo nhóm 3 | [PvE Q8](gdd/05-he-thong-pve.md#12-câu-hỏi-mở), [PvE Q9](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F8 | Ai giữ `dailies.js`; phím mở Việc Làng? | Một người làm Việc Làng + Thủ Hộ Làng trong cùng lô; phím Y (H dành cho Chiến Trường) | [PvE Q10](gdd/05-he-thong-pve.md#12-câu-hỏi-mở), [PvE Q11](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F9 | Lịch điểm danh tháng có làm người giữ chuỗi dài thiệt? | Không bù riêng; tổng lượng tháng ≤ 70, không thấp hơn vòng cũ (khoảng 64) | [PvE Q12](gdd/05-he-thong-pve.md#12-câu-hỏi-mở) |
| F10 | Tháp Vô Tận chia bảng xếp hạng; Bế Quan; Sổ Nhẫn Giả? | Tháp 3 dải cấp (30-79, 80-139, 140-199); Bế Quan 5% EXP/phút cày, trần 10 giờ, gấp rưỡi bằng xu; Sổ hạng 10 trần sinh lực +3%, công +2%, thủ +2%, EXP +3% | [04 4](gdd/04-dac-sac.md#16-câu-hỏi-mở), [04 6](gdd/04-dac-sac.md#16-câu-hỏi-mở), [04 10](gdd/04-dac-sac.md#16-câu-hỏi-mở) |
| F11 | Đổi tên NPC phiên âm, chữ "Slime", boss "Pharaoh Phục Sinh"? | Đổi ở `quest-npc-rename` (GĐ7) theo bảng 5.6 của mục 08, giữ mọi id và khóa hình `slime`; bảng A phụ lục sinh lại sau khi đổi (thống nhất các nguồn, 07 Q4 không đổi trong lô `world-towns`) | [02 Q6](gdd/02-hien-trang.md#10-câu-hỏi-mở), [07 Q4](gdd/07-the-gioi.md#15-câu-hỏi-mở), [08 4](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [08 5](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [TN 1](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở), [PL F3](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |
| F12 | Tên gọi bí cảnh vùng D1 so với Bí Cảnh Phù Chú? | Giao diện gọi "Bí cảnh vùng", roguelite giữ "Bí Cảnh Phù Chú", id không đổi | [07 Q1](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F13 | Điểm về của `hell_gate`, `gd_vancot`, `gd_huyetho`; hồi sinh ở Thượng Giới? | Đổi `home` sang `gd_vanmon` trong lô `world-lower-fill`; chết ở Thượng Giới về trạm `home` của vùng | [07 Q2](gdd/07-the-gioi.md#15-câu-hỏi-mở), [07 Q3](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F14 | Trạm có đủ dịch vụ như làng? | Không; 5-6 NPC `tele, potion, smith, storage, task` (+ `elder` ở trạm Hạ Giới) | [07 Q5](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F15 | Biến thể cho `th_langdai`; nhạc riêng cho 3 theme mới và từng vùng? | Thêm 1 dòng `MAP_VARIANTS` trong lô `art-themes-new`; nhạc tạm `field_mist`, `field_heaven`, `field_bamboo`, bản riêng ở `snd-content-199`; không nhạc riêng từng vùng ở 1.0 | [07 Q6](gdd/07-the-gioi.md#15-câu-hỏi-mở), [07 Q7](gdd/07-the-gioi.md#15-câu-hỏi-mở), [09 Q7](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| F16 | Nhịp phát hành vùng PH-0 đến PH-4? | 2 tuần một đợt, đợt sau mở khi đợt trước 7 ngày không lỗi chặn | [07 Q8](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F17 | Bí địa: bao nhiêu, có giấu khỏi gói `data`? | 4 bí địa + 2 lối tắt; không giấu (thưởng nhỏ và khóa) | [07 Q9](gdd/07-the-gioi.md#15-câu-hỏi-mở), [07 Q10](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F18 | Phí Phu Xe Thượng Giới; Đấu Trường có chia khu? | 5.000 xu mỗi lần, đi bộ miễn phí; Đấu Trường không chia khu, trên 60 người thì từ chối vào | [07 Q11](gdd/07-the-gioi.md#15-câu-hỏi-mở), [07 Q12](gdd/07-the-gioi.md#15-câu-hỏi-mở) |
| F19 | "40 chuỗi" kỳ duyên là gì; nhiệm vụ phụ Hạ Giới? | 40 kỳ duyên = 8 chuỗi × 5; không có nhiệm vụ phụ Hạ Giới ở 1.0 | [08 3](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [08 9](gdd/08-cot-truyen.md#12-câu-hỏi-mở) |
| F20 | Lời giao/trả cho 124 nhiệm vụ viết ngay? | Không; đợt đầu 46 cặp ở phụ lục E, còn lại dùng câu chung, thêm dần | [08 7](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [PL F5](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |
| F21 | Cảnh mở đầu, hồi ký, danh hiệu chương, lệnh `/nhiemvu`? | Ghi nhớ "đã xem" ở máy; hồi ký có mục "Mở đầu"; danh hiệu chương thuộc `soc-titles`; `/nhiemvu <id>` chỉ cho ADMINS | [08 6](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [08 8](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [08 10](gdd/08-cot-truyen.md#12-câu-hỏi-mở), [08 11](gdd/08-cot-truyen.md#12-câu-hỏi-mở) |
| F22 | Bảng D (Lệnh Truy Nã, Tiểu Nhị) là số chốt? | Số mẫu tính từ công thức; sinh lại khi ADR-06-2 được duyệt | [PL F4](gdd/08-phu-luc-nhiem-vu.md#f-câu-hỏi-mở) |

### G. Ngoại hình, thú, mỹ thuật, âm thanh

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| G1 | Thú cưng khai `grade` tay; Kỳ Lân có bản vĩnh viễn; thú cưỡi có hạn nuôi được? | Suy `grade` theo luật; không bản vĩnh viễn ở 1.0; thú có hạn không nuôi | [TN 2](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở), [TN 3](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở), [TN 4](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G2 | Tủ ngoại hình theo nhân vật hay tài khoản; bộ thời trang có chỉ số? | Theo nhân vật (`c.wardrobe`); bộ thời trang thuần hình | [TN 5](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở), [TN 6](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G3 | Thuốc nhuộm 3 màu đặc biệt chỉ bán lượng? | Thêm vào bảng đổi quà Tết, Trung Thu, Halloween giá 40 token, 2 lượt/mùa | [TN 8](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G4 | Kỹ năng `fortune` cộng xu thường hay xu khóa? | Xu thường; hạ `ch` qua dữ liệu nếu nguồn xu vượt mô hình | [TN 9](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G5 | Đổi giới tính bằng Gương Hóa Dung; tên cũ trong thư sau khi đổi tên? | Không đổi giới tính ở 1.0; thư giữ `from` cũ | [TN 10](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở), [TN 11](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G6 | Hiệu ứng ngoại hình người khác trên điện thoại? | "Chỉ của tôi" trên `body.touch`, "Tất cả" trên máy tính | [TN 12](gdd/05-he-thong-thu-ngoai-hinh.md#5-câu-hỏi-mở) |
| G7 | Kim loại bậc 17 Thái Cực? | Đổi sang `#fff4d6`, `TIER_COLORS` theo cùng giá trị | [09 Q1](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| G8 | Hào quang theo vũ khí hay theo bộ? | Cả hai: thân theo vũ khí, viền áo và đốm theo bộ (cấp thấp nhất 5 ô áo giáp) | [09 Q6](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| G9 | Giữ bản `.m4a`; giấy phép tiếng của model tạo tiếng? | Giữ `.m4a` tới khi ≥ 98% phiên phát được Opus trong 4 tuần; đăng ký giấy phép cộng đồng miễn phí ở GĐ8, không được thì tạo lại tiếng bằng model Apache-2.0 | [09 Q3](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở), [09 Q4](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| G10 | `/dev/gallery` ở máy chủ thật; mã băm mốc lập trên máy nào? | Chỉ khi `DEV_TOOLS=1` và đăng nhập admin; mốc chuẩn trên Linux CI | [09 Q8](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở), [09 Q12](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |
| G11 | Bộ đệm khung nhân vật; nguồn nhạc; tiếng kỹ năng người khác? | LRU 1.500 mục; Cài đặt có "Tự động / Tổng hợp", mặc định Tự động; tiếng người khác trong khung nhìn, gain 0,35, tối đa 12 tiếng | [09 Q10](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở), [09 Q11](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở), [09 Q13](gdd/09-my-thuat-am-thanh.md#15-câu-hỏi-mở) |

### H. Giao diện

| Mã | Câu hỏi | Phương án mặc định | Nguồn |
|---|---|---|---|
| H1 | Hướng dẫn tân thủ có thưởng; nhân vật cũ có thấy? | Không thưởng riêng; nhân vật cấp ≥ 5 hoặc đã qua nhiệm vụ chính thứ 3 được bỏ qua, bật lại ở Cài đặt | [GD Q1](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở), [GD Q3](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H2 | Khóa cứng nút theo cấp? | Không ẩn; nút mờ + huy hiệu "Lv N", cổng cấp thật ở server | [GD Q2](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H3 | Cài đặt âm thanh, trợ năng đồng bộ theo tài khoản? | Theo thiết bị; chỉ 6 khóa tự đánh/hiển thị đồng bộ qua `c.settings` | [GD Q5](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H4 | Lời nhắc sự kiện bật mặc định cho loại nào; dải biểu ngữ mấy viên? | Bật Hung Tinh, Tà Thú, Thủ Hộ Làng, Chiến Trường, chiến gia tộc; tắt Giờ Vàng, Lôi Đài Tam Hùng; 2 viên khi cao ≥ 375px, 1 viên khi thấp hơn | [GD Q6](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở), [GD Q7](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H5 | Chế độ đảo tay D-pad? | Không ở 1.0 (ADR-05f-3), chỉ dời và đổi cỡ | [GD Q8](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H6 | Tên "Lời Dặn Trưởng Làng"? | Giữ, chân dung Trưởng Làng làng xuất phát | [GD Q9](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |
| H7 | Ai sửa thanh trang túi bị cắt trên điện thoại? | Worker của `ui-mobile-pass`; nếu `ui-bag-expand` gộp trước thì sửa ngay trong đợt gộp đó | [GD Q10](gdd/05-he-thong-giao-dien.md#7-câu-hỏi-mở) |

---

## 7. Cách dùng features.json và ROADMAP

**features.json** là mảng 213 đối tượng, sắp theo `phase` rồi `id`:

| Trường | Ý nghĩa |
|---|---|
| `id` | id duy nhất, dạng `<tiền tố>-<tên>` theo [01 mục 7](gdd/01-tam-nhin.md#7-quy-ước-id-tính-năng) |
| `phase` | giai đoạn 0-8 trong ROADMAP |
| `title` | tên ngắn tiếng Việt |
| `priority` | `Must`, `Should`, `Could`, `Won't` |
| `status` | `todo`, `done`, `blocked`; `done` khi đạt đủ `acceptance` trên cây làm việc hiện tại; việc gộp `main` theo dõi riêng ở T0.02 (`ops-commit-restructure`), id có tiêu chí "đã commit lên `main`" giữ `todo` tới khi T0.02 xong |
| `acceptance` | tiêu chí chấp nhận kiểm được bằng lệnh hoặc ảnh chụp |
| `tests` | file kiểm thử và lệnh phải đạt |
| `files` | file được sửa (dùng để phân vùng khi chạy nhiều agent) |
| `pillars`, `section`, `size`, `depends` | trụ cột phục vụ, file mục sở hữu đặc tả, cỡ S/M/L, id phải gộp trước |
| `signature`, `spec`, `branch`, `parent` | cờ đặc sắc, đặc tả đợt 3 (`specs/*.md`, ngoài repo, xem dòng "Nguồn ngoài repo" ở đầu tài liệu), nhánh đang làm, tính năng cha |
| `notes` | ghi chú tự do: tiến độ việc làm dở (có cụm "Tiến độ"), lý do điều chỉnh khi ghép (có cụm "Ghép GDD"), rủi ro và điều kiện riêng |

**ROADMAP.md** chia việc thành lô theo giai đoạn. Mỗi tính năng có **mã dòng** `Tg.nn` (g = giai đoạn); id chỉ ghi một lần ở bảng của giai đoạn, mọi chỗ khác dùng mã. "Điều kiện ra" của một giai đoạn là danh sách lệnh phải đạt; giai đoạn sau chỉ gộp `main` khi giai đoạn trước đã ra. Lễ hội có đường khẩn riêng chạy song song.

Quy trình làm một tính năng:

1. Tìm id trong `features.json`, đọc `section` (đặc tả), `spec`, `depends` (phải gộp trước), `files` (vùng được sửa).
2. Nhận lô trong ROADMAP, dùng cổng và `DATA_DIR` riêng của lô.
3. Làm, chạy `tests` và mọi lệnh ở `acceptance`; đổi client thì chụp ảnh desktop và điện thoại.
4. Đạt đủ `acceptance` thì đổi `status` thành `done`; gộp `main` theo lô, đúng lượt giai đoạn. Làm dở thì giữ `todo` và ghi tiến độ vào `notes`.
5. Đổi giai đoạn, mức hay phụ thuộc thì sửa cả `features.json` lẫn bảng giai đoạn trong ROADMAP; hạ một Must hay phá quy tắc thì viết ADR trong file mục sở hữu và thêm vào bảng mục 3.

Cột `opencode` trong bảng tính năng của các file mục cũ không còn hiệu lực: người dùng đã bỏ opencode, mọi lô giao agent Claude trong worktree riêng, gộp bằng `git diff | git apply --3way`. Khi số liệu đổi, sửa thẳng `features.json` rồi sửa hàng tương ứng ở bảng giai đoạn của ROADMAP và các bảng số ở mục 4, mục 5 của tài liệu này (mỗi id đúng một hàng ở ROADMAP, đúng giai đoạn, cùng tên, mức, trạng thái, cỡ, phụ thuộc).
