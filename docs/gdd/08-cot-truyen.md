# GDD 08 — Cốt truyện và nhiệm vụ

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 8 (bối cảnh, thế lực, nhân vật, cốt truyện theo chương, nhiệm vụ chính, nhiệm vụ phụ, thoại, thưởng, cách kiểm) |
| Ngày | 18/10/2026 |
| Phạm vi id | `quest-main`, `quest-main-199`, `quest-kyduyen`, `quest-lore`, `quest-main-gap`, `quest-npc-rename` (danh mục). Liên quan nhưng thuộc mục khác: `quest-truyna`, `quest-dailies`, `quest-daily-task` (mục 5 PvE), `eco-bound` (mục 5 Trang bị), `core-levelcap-199` (mục 6), `world-region-*`, `world-lower-fill` (mục 7), `ops-data-migration` (mục 10) |
| Phụ lục | [`08-phu-luc-nhiem-vu.md`](08-phu-luc-nhiem-vu.md): bảng đủ 124 nhiệm vụ chính (+ 6 nhiệm vụ lấp khoảng trống đề xuất), 40 kỳ duyên, số Lệnh Truy Nã, thoại mẫu theo chương |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md` (mục 8 văn phong, mục 9 đặt tên + nhiệm vụ chính), mã ở thư mục làm việc ngày 18/10/2026 (`src/shared/data/quests.js`, `maps.js`, `monsters.js`, `classes.js`, `src/server/modules/quest/index.js`, `src/client/js/game/pathfind.js`, `tools/check-data.js`, `tests/features/quest.js`), kế hoạch tổng `content/PLAN.md`, đặc tả `content/00-foundation.md` (mục 2, 6.10, 7.2, 8), `content/10-world.md` (mục 0, 1.2, 3, 5.4, 6), `content/20-monsters.md` (mục 4), **`content/30-quests.md` (nguồn chính, mục 0-12)**, `specs/bound.md`, `specs/dailies.md`, `specs/titles.md`, kiểm kê `gddwork/audit-data.md`, `audit-systems.md` |
| Thí nghiệm kèm | `gddwork/lab/q08/build.js` (dựng bảng 124 nhiệm vụ từ repo + 30-quests, tự kiểm id/`req`/kiểu, tính % EXP từng dải), `gddwork/lab/q08/gap.js` (số liệu lấp khoảng trống 84-95), `gddwork/lab/q08/gen-md.js` (sinh bảng phụ lục). Kết quả: 124 nhiệm vụ, id không trùng, `req` không giảm, đủ 7 kiểu; `npm run check` trên repo hiện tại in `✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng` |

Đường dẫn đặc tả nằm ngoài repo (thư mục làm việc của đợt nội dung). Trong tài liệu này ghi tắt: `content/<file>` = `scratchpad/content/<file>`, `specs/<file>` = `scratchpad/specs/<file>`. Người đọc GDD có đủ quyết định chính (bảng, số, id) ngay trong mục này và phụ lục; đặc tả là nơi có khối mã dán nguyên cho worker.

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 11. Giữa các đặc tả, thứ tự ưu tiên theo `content/PLAN.md`: PLAN → phụ lục điều phối của `specs/<x>.md` → `00-foundation` → `10-world` → `20-monsters` → `30-quests` → `40/50/60`.

---

## 0. Tóm tắt

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|
| `quest-main` | Chính tuyến Hạ Giới 51 nhiệm vụ cấp 1-118 | P1, P2 | M | done | 2 | M | mục 5.1, phụ lục A |
| `quest-main-199` | Chính tuyến "Bát Phương Thiên Ấn" 73 nhiệm vụ cấp 120-199 (tổng 124) | P1, P2, P5 | M | todo | 2 | L | mục 5.2, phụ lục A, `content/30-quests.md` mục 2-5, 9.1, 10.1 |
| `quest-kyduyen` | Kỳ Duyên: 40 kỳ duyên (8 chuỗi × 5) ở 8 vùng Thượng Giới | P1, P4 | S | todo | 2 | L | mục 5.3, phụ lục C, `content/30-quests.md` mục 6-8, 9.2, 10.2 |
| `quest-lore` | Cốt truyện tổng, thoại nhiều NPC, cảnh mở đầu, chương | P1, P2 | S | todo | 2 | M | mục 1-4, 5.4, 6, phụ lục E |
| `quest-main-gap` | Lấp khoảng trống chính tuyến cấp 84-95, sửa mô tả thiếu địa điểm | P2, P5 | S | todo | 2 | S | mục 5.5, ADR-08-1, phụ lục B |
| `quest-npc-rename` | Đổi tên NPC phiên âm và tên quái/boss ngoại lai | P1 | S | todo | 7 | S | mục 5.6 |

Sàn 1.0 do mục này giữ: **≥ 120 nhiệm vụ chính** → thiết kế có **124** (51 cũ `m1`-`m51` + 73 mới), cộng 6 nhiệm vụ lấp khoảng trống (`hg_q1`-`hg_q6`, Should) thành 130 nếu ADR-08-1 được duyệt. Cấp 199 là nhiệm vụ cuối `tc_q10` "Chí Tôn Ninja".

### 0.2 Số liệu chính

| Hạng mục | Giá trị |
|---|---|
| Nhiệm vụ chính | 124 = 51 Hạ Giới (`m1`-`m51`, cấp 1-118) + 73 Thượng Giới (vùng 1-7: 9 nhiệm vụ, vùng 8: 10) |
| Phân theo kiểu (124) | kill 50 (trong đó 20 diệt boss), collect 30, visit 13, level 10, talk 9, upgrade 6, dungeon 6 |
| Chương | Phần I Hạ Giới: 6 chương. Phần II Thượng Giới: 8 hồi (một vùng một hồi, một Thiên Ấn) |
| EXP nhiệm vụ chính 1-118 | 2.316.750 (nguồn chính ở dải đầu; 70-109 chỉ 12-15% EXP dải, xem mục 5.5) |
| EXP nhiệm vụ chính 120-198 | 29.442.416 ≈ 31% tổng EXP 120→199 (hệ số boss vùng 1,0, xem 0.3) |
| Lượng cả chuỗi | 1.239 (Hạ Giới) + 1.435 (Thượng Giới) = 2.674; thêm 35 nếu có `hg_q*` |
| Kỳ duyên | 40 (8 Kỳ nhân × 5), thưởng xu khóa `100 + req²·4`, EXP 0,08-0,15 `expNeed(req)`, 10 lượng ở kỳ duyên cuối mỗi chuỗi (80 lượng một lần) |
| Lệnh Truy Nã | 3 lệnh/ngày ở Kỳ nhân, 8% / 8% / 12% `expNeed(cấp)` (28% một cấp mỗi ngày), xu khóa `2.000 + 40·cấp`/lệnh, lệnh cuối thêm Rương Báu + Đá Cường Hóa Thần |
| Thưởng kiểu nhiệm vụ | xu → **xu khóa**, vật phẩm → **khóa** (`specs/bound.md`), trang bị độ hiếm "Tốt" |

### 0.3 Đối chiếu giữa các đặc tả (đã gỡ theo thứ tự ưu tiên PLAN)

| # | Mâu thuẫn | Gỡ trong GDD | Ai sửa |
|---|---|---|---|
| 1 | Hệ số EXP nhiệm vụ diệt boss vùng: `00-foundation` mục 7.2 ghi "1 `kill` boss vùng (hệ số 1.0)", `30-quests` mục 0 dòng 3 và khối mã dùng **0,6** | Theo ưu tiên (00 > 30): `<prefix>_q7` dùng **1,0**. `tc_q9` (Hư Vô Ma Tôn, boss cuối, không phải "boss vùng") giữ 0,6 như 30. % EXP nhiệm vụ chính mỗi dải tăng từ 23-25% lên 27-29% (vùng 8: 32,3% → 37,7%; đo bằng `sim-exp` phương án B của GDD 06, hồ sơ TB, xem 06 mục 1.3 N6). Số trong phụ lục A đã tính theo 1,0 | worker vùng C-Q1..8: đổi số cuối của `qx('<prefix>_q7', tên, req, 'kill', boss, 1, mô tả, thưởng, lượng, 0.6)` từ `0.6` thành `1.0`; dòng kiểm ở `content/30-quests.md` mục 10.1 thành `bl_q7:333496`. Câu hỏi mở 1 |
| 2 | Tên NPC loại `hermit`: bảng và chữ hiển thị gọi "Kỳ nhân", khối mã `modules/sidequest` (30 mục 7.3) có 3 chuỗi "Ẩn Sĩ" (chú thích đầu file, thông báo xong lệnh truy nã, lệnh `/kyduyen near`) | Chữ người chơi thấy dùng **"Kỳ nhân"** thống nhất; thông báo thành `'Lệnh truy nã đã xong! Hãy về gặp Kỳ nhân của vùng.'` | worker S1-KD |
| 3 | Danh mục ghi `quest-kyduyen` là "40 chuỗi"; 30-quests có 8 chuỗi × 5 = 40 kỳ duyên | Hiểu là **40 kỳ duyên** (không đổi id). Tiêu đề danh mục sửa khi gộp sổ | điều phối GDD |
| 4 | `00-foundation` mục 8 ý 8: "51 nhiệm vụ đầu có id `m1..m51`" chặn việc chèn nhiệm vụ Hạ Giới | Chỉ đổi khi duyệt ADR-08-1 (mục 11) | worker `quest-main-gap` |
| 5 | Mô tả nhiệm vụ cũ (`m2, m3, m4, m14, m16, m21, m22, m25, m31, m34`) không nêu tên bản đồ, trái `DESIGN_RULES` mục 9 "mỗi nhiệm vụ phải nói rõ địa điểm" | Viết lại 10 mô tả (chỉ chữ, không đổi thứ tự/id), mục 5.5 | worker `quest-main-gap` |

---

## 1. Bối cảnh thế giới

### 1.1 Hai cõi

| Cõi | Cấp | Bản đồ | Mô tả |
|---|---|---|---|
| **Hạ Giới** | 1-120 | 44 bản đồ không phải phó bản sau `world-lower-fill` (3 làng Tam Thôn, 2 trạm, 38 bãi, 1 đấu trường) | Đất của người. Ba làng ninja **Tam Thôn** (Làng Hỏa Vân, Làng Thủy Nguyệt, Làng Phong Lâm) giữ nghề ninja đời này truyền đời khác, mỗi làng nuôi hai phái (Kiếm, Tiêu · Kunai, Cung · Đao, Quạt). Từ làng đi ra: rừng trúc, biển san hô, hang dơi, hoang mạc, núi tuyết, rừng ma, cổng địa ngục, Thiên Cung, Ma Giới, Long Cung |
| **Thượng Giới** | 120-199 | 48 bản đồ (8 vùng × 6: 3 bãi chính, 1 bí cảnh có boss, 1 bãi phụ, 1 trạm) | Cõi trên trời, mở ra sau khi Long Vương tan biến để lại **Long Châu**; ánh châu mở **Thiên Môn** ở cổng đông Long Cung. Tám vùng, mỗi vùng giữ một **Thiên Ấn** |

### 1.2 Bát Phương Thiên Ấn

Ba nghìn năm trước, tám thần thú đặt tám **Thiên Ấn** (Thủy, Hỏa, Băng, Thổ, Mộc, Tinh, Ám, Thái Cực) ở tám phương Thượng Giới, cùng giam **Hư Vô Ma Tôn** dưới đáy Thái Cực Thần Cảnh. Mỗi Ấn có một **trưởng lão** giữ ở cổng vùng và một thần thú canh trong bí cảnh. Ma Tôn không chết: hơi thở của hắn rò xuống Hạ Giới qua các khe nứt (Hư Vô Động ở Ma Giới là một khe như thế), làm quái vật hung dữ vào những đêm trăng đỏ.

### 1.3 Dòng thời gian

| Thời điểm | Sự kiện | Người chơi gặp ở |
|---|---|---|
| 3.000 năm trước | Tám thần thú đặt Bát Phương Thiên Ấn, phong ấn Hư Vô Ma Tôn | Cảnh mở đầu khung 1 |
| 30 năm trước | Hai đệ tử giỏi nhất của Phá Ma Tự là Huyền Không (sau này là **Phá Ma Thiền Sư**) và Huyết Nguyệt. Huyết Nguyệt trộm bí kíp cấm, bỏ chùa, lập **Huyết Nguyệt Giáo** từ những ninja phản đồ | hg_q4 (Trấn Trưởng Vân Tùng kể), `hd_q2` |
| 10 năm trước | Giáo phái tu ở Hang Dơi, sau đó tản vào sa mạc, núi tuyết, Rừng Ma | `m20` |
| Đêm mở đầu | Trăng đỏ, quái quanh Tam Thôn hung dữ. Người chơi nhập môn | `m1` |
| Hạ Giới (cấp 1-120) | Giáo phái gọi các **Tà Thú** (Hắc Viêm, Băng Phách, Huyết Nguyệt) xuống Hạ Giới để hút linh khí, nuôi quỷ thần làm tay sai, tìm Long Châu | Chương 1-6, sự kiện Tà Thú Xuất Thế |
| Cuối Hạ Giới | Long Vương nhiễm ma khí, bị hạ; Long Châu mở Thiên Môn | `m50`, `m51` |
| Thượng Giới (cấp 120-199) | Giáo phái làm ô uế lần lượt tám Ấn. Người chơi tịnh hóa từng Ấn, Ma Quân hiến cả giáo phái cho Thao Thiết Ma Thần, Ma Tôn sắp phá phong ấn | Hồi 1-8 |
| Kết | Hư Vô Ma Tôn bị phong ấn lần nữa, người chơi đạt cấp 199, danh xưng **Chí Tôn Ninja** | `tc_q9`, `tc_q10` |

---

## 2. Các thế lực

| Thế lực | Ai | Mục tiêu | Ở đâu | Quan hệ với người chơi |
|---|---|---|---|---|
| **Tam Thôn** | 3 Trưởng Làng (Hỏa Long, Thủy Minh, Phong Vân), Hộ Pháp, Thợ Rèn, Tiểu Nhị, Phu Xe, Thủ Kho, Lão Gia Tộc, Bà Thuốc | Giữ làng, dạy ninja trẻ | Làng Hỏa Vân, Thủy Nguyệt, Phong Lâm | Người chơi là đệ tử; Trưởng Làng bất kỳ giao/nhận nhiệm vụ chính |
| **Trạm Hạ Giới** | Trấn Trưởng Bạch Sơn (Trấn Bạch Tuyết), Trấn Trưởng Vân Tùng (Trấn Vân Môn) | Giữ đường núi và đường lên trời | `gb_bachtuyet`, `gd_vanmon` | Loại NPC `elder`: giao/nhận nhiệm vụ chính như Trưởng Làng |
| **Huyết Nguyệt Giáo** | Huyết Nguyệt Ma Quân và giáo đồ (trong trò chơi là quái thường ở bãi M2 mỗi vùng: Hải Dạ Xoa, Xích Sa Đao Khách, Thạch Sư Trấn Mộ bị ếm bùa, U Minh Câu Hồn Sứ, Tinh Hà Thủ Vệ, Ma Vực Thiết Kỵ, Cốt Viêm Ma Long, Huyền Vũ Thần Quy nhiễm ma) | Phá Bát Phương Thiên Ấn, giải phóng Hư Vô Ma Tôn, đổi lại sức mạnh bất tử | Hạ Giới: bóng tối sau các boss; Thượng Giới: sào huyệt Hỗn Độn Ma Vực | Phản diện xuyên suốt 14 chương |
| **Người giữ Ấn** | 8 trưởng lão vùng (loại `elder`, đứng ở bãi M1, x 220) | Giữ Ấn của mình | Cổng 8 vùng Thượng Giới | Giao/nhận nhiệm vụ chính Thượng Giới |
| **Kỳ nhân** | 8 người đời thường (loại `hermit` mới, bãi M1, x 340) | Sống sót, cứu người thân, chuộc lỗi | Cổng 8 vùng | Giao kỳ duyên và Lệnh Truy Nã; nối thành một vòng tin nhắn |
| **Thần thú canh Ấn** | Hải Thị Thận Long, Xích Diệm Dung Thần, Bắc Minh Thiên Lang, Vạn Cổ Thi Hoàng, Sơn Tiêu Quỷ Vương, Đọa Thiên Tinh Quân, Thao Thiết Ma Thần, Thái Âm Ngọc Hồ | Vốn canh Ấn, nay nhiễm ma khí | Bí cảnh D1 mỗi vùng | Boss chương; hạ để tịnh hóa Ấn |
| **Hư Vô Ma Tôn** | Đại phản diện | Phá phong ấn, nuốt cả hai cõi | Thái Cực Thánh Điện (`tc_thanhdien`) | Boss cuối cấp 199 |
| **Sứ Giả Lễ Hội** | Sứ Giả Nguyệt Lan, Nguyệt Thu, Nguyệt Hạ | Đem lễ Việt vào làng | 3 làng | Ngoài mạch chính (mục 6 GDD lễ hội) |

---

## 3. Nhân vật chính

Người chơi là nhân vật **không lời** (không có câu thoại riêng); mọi NPC gọi người chơi là "ngươi". Tên tự đặt theo `DESIGN_RULES` mục 9: trưởng lão vùng = danh hiệu tu hành + đạo hiệu; kỳ nhân = nghề/thân phận + tên; giáo phái phản diện = Huyết Nguyệt Giáo.

| Nhân vật | id NPC / quái | Vai trò | Giọng | Xuất hiện |
|---|---|---|---|---|
| Trưởng Làng Hỏa Long | `v_fire_elder` | Thầy nhập môn phái Kiếm, Tiêu | Nghiêm, ngắn, hay thử lòng | `m1`-`m51` |
| Trưởng Làng Thủy Minh | `v_water_elder` | Thầy phái Kunai, Cung | Điềm tĩnh, nói bằng hình ảnh nước | `m1`-`m51` |
| Trưởng Làng Phong Vân | `v_wind_elder` | Thầy phái Đao, Quạt | Hóm hỉnh, nhanh | `m1`-`m51` |
| Trấn Trưởng Vân Tùng | elder ở `gd_vanmon` | Nhân chứng thời trẻ của Huyết Nguyệt | Già, chậm, nhiều hồi ức | `hg_q4` (đề xuất), mọi nhiệm vụ chính từ cấp 85 |
| Huyết Nguyệt Ma Quân | không có hình riêng (lệnh bài, lời kể) | Thủ lĩnh Huyết Nguyệt Giáo, sư đệ của Phá Ma Thiền Sư | Không xuất hiện trực tiếp tới hồi 7; chết trong bụng Thao Thiết | `m20`, `m27`, `m42`, `hg_q4`, `hd_q2`, `hd_q7` |
| Hư Vô Ma Tôn | `boss_tc_maton` (cấp 199) | Thứ bị phong ấn | Không nói; chỉ có tên chiêu | `tc_q9` |
| Long Vương | `boss_dragon` (cấp 125) | Thần giữ Long Châu, nhiễm ma khí | Không nói | `m50` |
| Tiên Ông Bạch Hạc | `bl_elder` | Giữ Thủy Ấn | Hiền, mê cờ | Hồi 1 |
| Hỏa Công Đầu Đà | `xv_elder` | Giữ Hỏa Ấn | Nóng tính, thẳng | Hồi 2 |
| Băng Tâm Sư Thái | `bn_elder` | Giữ Băng Ấn | Lạnh, chính xác | Hồi 3 |
| Thủ Lăng Lão Nhân | `hl_elder` | Giữ Thổ Ấn, đời thứ 30 giữ lăng | Tự trách, trọng lễ | Hồi 4 |
| Thanh Đăng Đạo Nhân | `um_elder` | Giữ Mộc Ấn, cầm đèn xanh | Thì thầm, nhiều kiêng kỵ | Hồi 5 |
| Quan Tinh Lão Tổ | `th_elder` | Giữ Tinh Ấn, xem sao | Học giả, hay nói số | Hồi 6 |
| Phá Ma Thiền Sư | `hd_elder` | Sư huynh của Ma Quân | Nặng lòng, ít lời | Hồi 7 |
| Thái Cực Chân Nhân | `tc_elder` | Giữ Thái Cực Ấn, thầy Ngọc Hồ | Cân bằng, ôn hòa | Hồi 8 |
| Ngư Ông Lục Bình | `bl_hermit` | Ông chài mất cháu gái | Mộc mạc, xưng "lão" khi xúc động | Kỳ duyên vùng 1, nhận tin `xv_s5` |
| Đan Sư Hồng Lô | `xv_hermit` | Luyện thuốc giải vết chém ma đao | Tỉ mỉ | Vùng 2, nhận tin `bn_s5` |
| Liệp Hộ Bạch Mao | `bn_hermit` | Thợ săn giữ bản | Thật thà | Vùng 3, nhận tin `hl_s5` |
| Thư Sinh Mặc Văn | `hl_hermit` | Chép văn bia, lần ra tên tám Ấn | Hăng hái, mọt sách | Vùng 4, nhận tin `um_s5` |
| Tiều Phu Mạc Sầu | `um_hermit` | Siêu độ hồn vợ | Buồn, chậm | Vùng 5, nhận tin `th_s5` |
| Tiên Nữ Vân Cẩm | `th_hermit` | Dệt gấm sao | Dịu, tự hào nghề | Vùng 6, nhận tin `hd_s5` |
| Ma Nữ Dạ Lan | `hd_hermit` | Giáo đồ cũ hoàn lương | Dè dặt, tự trách | Vùng 7, nhận tin `tc_s5` |
| Tiên Đồng Ngọc Hư | `tc_hermit` | Đệ tử nhỏ của Chân Nhân | Tinh nghịch | Vùng 8 |

---

## 4. Cốt truyện theo chương

Mỗi chương = một dải cấp; nhiệm vụ đầu chương mở đường, nhiệm vụ boss là cao trào, nhiệm vụ cuối móc sang chương sau. Bảng tổng (EXP tính theo `expNeed` của `core-levelcap-199`, xu là xu khóa):

| Chương / hồi | id | Số NV | Cấp | EXP | Xu khóa | Lượng |
|---|---|---|---|---|---|---|
| Chương 1 — Tam Thôn Nhập Môn | `m1` – `m11` | 11 | 1-12 | 14.636 | 7.136 | 16 |
| Chương 2 — Sóng Biển Hang Dơi | `m12` – `m20` | 9 | 13-25 | 58.916 | 28.088 | 26 |
| Chương 3 — Cát Vàng Cổ Mộ | `m21` – `m28` | 8 | 26-42 | 153.352 | 79.440 | 37 |
| Chương 4 — Băng Sơn Tinh Thể | `m29` – `m37` | 9 | 43-65 | 400.800 | 216.576 | 70 |
| Chương 5 — Ma Lâm Hỏa Địa | `m38` – `m44` (+ `hg_q1` – `hg_q6`) | 7 (+6) | 67-95 | 666.582 (+569.976) | 346.888 (+380.392) | 170 (+35) |
| Chương 6 — Thiên Ngoại Long Cung | `m45` – `m51` | 7 | 96-118 | 1.022.464 | 668.568 | 920 |
| Hồi 1 — Quần Đảo Bồng Lai · Thủy Ấn | `bl_q1` – `bl_q9` | 9 | 120-128 | 876.889 | 1.103.520 | 105 |
| Hồi 2 — Xích Viêm Hỏa Vực · Hỏa Ấn | `xv_q1` – `xv_q9` | 9 | 130-138 | 1.159.763 | 1.288.800 | 110 |
| Hồi 3 — Vạn Niên Băng Nguyên · Băng Ấn | `bn_q1` – `bn_q9` | 9 | 140-148 | 1.628.849 | 1.488.480 | 110 |
| Hồi 4 — Thiên Cổ Hoàng Lăng · Thổ Ấn | `hl_q1` – `hl_q9` | 9 | 150-158 | 2.200.798 | 1.702.560 | 110 |
| Hồi 5 — U Minh Quỷ Lâm · Mộc Ấn | `um_q1` – `um_q9` | 9 | 160-168 | 3.218.855 | 1.931.040 | 110 |
| Hồi 6 — Tinh Hà Thiên Lộ · Tinh Ấn | `th_q1` – `th_q9` | 9 | 170-178 | 4.357.179 | 2.173.920 | 110 |
| Hồi 7 — Hỗn Độn Ma Vực · Ám Ấn | `hd_q1` – `hd_q9` | 9 | 180-188 | 6.244.442 | 2.431.200 | 120 |
| Hồi 8 — Thái Cực Thần Cảnh · Thái Cực Ấn | `tc_q1` – `tc_q10` | 10 | 190-198 | 9.755.641 | 3.016.664 | 660 |

Tên chương, khoảng id và đoạn tóm tắt dưới đây là dữ liệu của `quest-lore` (`CHAPTERS` trong `src/shared/data/story.js`, mục 5.4). Tên quái/boss ghi theo tên **sau** `quest-npc-rename` (mục 5.6); tên cũ trong ngoặc.

### Phần I — Hạ Giới: Trăng Máu Dấy Lên

#### Chương 1 — Tam Thôn Nhập Môn (`m1`-`m11`, cấp 1-12)
- **Mở đầu**: đêm trăng đỏ, người chơi nhập môn ở làng của phái mình, nhận nón và giày gỗ (`m1`).
- **Xung đột**: quái hiền quanh làng (Nhầy Xanh, Thỏ Rừng, Nấm Độc) bỗng phá ruộng; Rừng Trúc có Sơn Tặc chặn đường.
- **Cao trào**: lần đầu cường hóa (`m6`), lần đầu vào Hang Động Thử Thách (`m9`), nhận vũ khí phái (`m10`).
- **Boss chương**: Vua Nhầy Xanh (Vua Slime, `boss_slime` cấp 12) giữa Rừng Trúc (`m11`).
- **Móc nối**: Trưởng Làng nhận ra trăng đỏ đêm qua là điềm xấu; thuyền buôn ở Bờ Biển San Hô mất liên lạc.

#### Chương 2 — Sóng Biển Hang Dơi (`m12`-`m20`, cấp 13-25)
- **Mở đầu**: ra Bờ Biển San Hô dò thuyền buôn (`m12`).
- **Xung đột**: Hải Tặc xâm lăng, Hoa Tiên Tử ở Vườn Anh Đào bị mê hoặc, Dơi Hang tràn khỏi hang.
- **Cao trào**: Cửu Vĩ Hồ (`m17`) trước khi tan nói "Trăng máu sắp lên".
- **Boss chương**: Dơi Chúa (`boss_bat`) ở Hang Dơi (`m20`).
- **Móc nối**: Trưởng Làng kể Hang Dơi từng là nơi tu của một nhóm ninja phản đồ, **Huyết Nguyệt Giáo** (lần đầu nêu tên).

#### Chương 3 — Cát Vàng Cổ Mộ (`m21`-`m28`, cấp 26-42)
- **Mở đầu**: thương đoàn kể có kẻ đào phế tích ban đêm ở Hoang Mạc Cát (`m21`).
- **Xung đột**: Đạo Tặc Sa Mạc, Tượng Đá Cổ tỉnh dậy, Ninja Lang Thang ở Thung Lũng Sương đã theo giáo phái. Sự kiện Tà Thú Hắc Viêm (cấp 32) là "lễ gọi" đầu tiên của giáo phái.
- **Cao trào**: Sa Mạc Cổ Vương (Pharaoh Phục Sinh, `boss_pharaoh`) bị đánh thức trong Phế Tích Cổ (`m27`); trên quan tài vẽ vầng trăng đỏ.
- **Boss chương**: Lang Vương (`boss_wolf`) ở Thung Lũng Sương (`m28`).
- **Móc nối**: gió bắc mang tuyết lở từ Núi Tuyết.

#### Chương 4 — Băng Sơn Tinh Thể (`m29`-`m37`, cấp 43-65)
- **Mở đầu**: Người Tuyết nổi giận đánh thợ săn trên Núi Tuyết (`m29`); có kẻ đốt hương gọi tuyết lở, mùi hương giống ở sa mạc.
- **Xung đột**: Bạch Viên, Tinh Thể Băng ở Đỉnh Băng Giá, Hang Pha Lê bị hút linh khí. Tà Thú Băng Phách (cấp 60).
- **Cao trào**: Tuyết Quái Vương (`m35`) và mở Tuyệt Kỹ cấp 60. Quỷ Đỏ đã bò lên tới bìa Rừng Ma (`m36`).
- **Boss chương**: Tinh Thể Vương (`boss_crystal`) trong Hang Pha Lê (`m37`).
- **Móc nối**: lõi pha lê khắc dấu trăng đỏ; giáo phái đang nuôi thứ gì đó dưới Rừng Ma.

#### Chương 5 — Ma Lâm Hỏa Địa (`m38`-`m44`, cấp 67-95; đề xuất chèn `hg_q1`-`hg_q6` sau `m43`)
- **Mở đầu**: phải cường hóa +10 trước khi xuống Rừng Ma (`m38`).
- **Xung đột**: Ảnh Ninja, Dung Nham Nhân, Quỷ Võ Sĩ ở Hang Quỷ; Địa Ngục Khuyển canh Cổng Địa Ngục.
- **Cao trào**: Quỷ Vương (`m42`) mang lệnh bài khắc "Ma Quân": thủ lĩnh giáo phái có danh xưng. Với `quest-main-gap`: Huyệt Vạn Cốt, Huyết Hồ, Huyết Ma Vương (`boss_gd_huyetma` cấp 92), Trấn Trưởng Vân Tùng kể chuyện hai đệ tử Phá Ma Tự (`hg_q4`). Tà Thú Huyết Nguyệt (cấp 95).
- **Boss chương**: Ma Thần (`boss_god`) ở Cổng Địa Ngục (`m44`).
- **Móc nối**: cổng địa ngục đóng lại, đường lên Thiên Cung mở.

#### Chương 6 — Thiên Ngoại Long Cung (`m45`-`m51`, cấp 96-118)
- **Mở đầu**: qua Trấn Vân Môn lên Thiên Cung (`m45`).
- **Xung đột**: Lôi Điểu, Ma Giới Quỷ; Thiên Ma (`m48`) mượn tay giáo phái tìm Long Châu.
- **Cao trào**: Vảy Rồng ở Long Cung (`m49`); Long Vương nhiễm ma khí.
- **Boss chương**: Long Vương (`boss_dragon` cấp 125) dưới đáy Long Cung (`m50`).
- **Móc nối**: Long Vương tan biến, để lại Long Châu; đạt cấp 120 (`m51`) thì ánh châu mở **Thiên Môn** ở cổng đông Long Cung.

### Phần II — Thượng Giới: Bát Phương Thiên Ấn

Khuôn mỗi hồi (vùng 1-7, 9 nhiệm vụ; vùng 8 thêm 1): `visit` cổng vùng → `talk` trưởng lão (nhận vũ khí bậc vùng) → `kill` quái M1 → `collect` vật phẩm quái M1 → `kill` tay sai giáo phái (quái M2) → [`visit` bí cảnh | `upgrade` +11/+12/+13 | `dungeon` 2-3 lượt] → `kill` thần thú canh Ấn (boss D1) → `collect` vật phẩm M2/M3 → `level` cuối dải. Đặc tả: `content/30-quests.md` mục 2 và 4.

| Hồi | Vùng (cấp) | Mở đầu | Xung đột | Cao trào (nhiệm vụ giữa) | Boss chương | Móc nối |
|---|---|---|---|---|---|---|
| 1 | Quần Đảo Bồng Lai (120-129), Thủy Ấn | Thiên Môn mở, lên Bích Sa Hải Ngạn; Tiên Ông Bạch Hạc kể về tám Ấn (`bl_q2`) | Ốc Mượn Hồn lấp bến, vỏ ốc nhuốm màu trăng máu; Hải Dạ Xoa theo giáo phái lên bờ | Tìm cửa sương vào Thận Lâu Ảo Cảnh (`bl_q6`) | Hải Thị Thận Long `boss_bl_thanlong` 125 (`bl_q7`) | Lông Tiên Hạc bọc Ấn; biển phía đông sôi vì Hỏa Ấn loạn (`bl_q9`) |
| 2 | Xích Viêm Hỏa Vực (130-139), Hỏa Ấn | Hỏa Công Đầu Đà giữ lò lửa trời | Xích Sa Đao Khách rèn ma đao bằng lửa Ấn bên Dung Nham Hà | Cường hóa +11 ở Thợ Rèn Viêm Chùy (`xv_q6`) | Xích Diệm Dung Thần `boss_xv_dungthan` 135 (`xv_q7`) | Lam Diễm Châu may giáp chống lửa, băng nguyên phía đông (`xv_q9`) |
| 3 | Vạn Niên Băng Nguyên (140-149), Băng Ấn | Băng Tâm Sư Thái kể về đạo quân cổ ngủ dưới băng | Giáo đồ đốt băng ở Vạn Trượng Băng Cốc, hồn binh thành Hàn Phách U Linh | Rèn thân trong hang động 2 lượt (`bn_q6`) | Bắc Minh Thiên Lang `boss_bn_thienlang` 145 (`bn_q7`) | Nanh sói làm bùa giữ Ấn; cửa lăng phía đông hé mở (`bn_q9`) |
| 4 | Thiên Cổ Hoàng Lăng (150-159), Thổ Ấn | Thủ Lăng Lão Nhân đời thứ 30 giữ lăng | Giáo phái trộm mộ, ếm bùa Đào Dũng và Thạch Sư | Cường hóa +12 ở Thợ Rèn Đồng Xanh (`hl_q6`) | Vạn Cổ Thi Hoàng `boss_hl_thihoang` 155 (`hl_q7`) | Ngọc Ấn triều cũ niêm cửa lăng; lối đông vào rừng ma (`hl_q9`) |
| 5 | U Minh Quỷ Lâm (160-169), Mộc Ấn | Thanh Đăng Đạo Nhân, ngọn đèn xanh duy nhất soi đường | Câu Hồn Sứ bắt hồn người nuôi Quỷ Vương | Luyện gan trong hang động 2 lượt (`um_q6`) | Sơn Tiêu Quỷ Vương `boss_um_sontieu` 165 (`um_q7`) | Tơ Quỷ Chu siêu độ hồn bị giam; ánh sao trên ngọn trúc (`um_q9`) |
| 6 | Tinh Hà Thiên Lộ (170-179), Tinh Ấn | Quan Tinh Lão Tổ thấy sao máu mọc | Giáo đồ cướp tinh đồ, mua chuộc Tinh Hà Thủ Vệ | Cường hóa +13 ở Thợ Rèn Tinh Thiết (`th_q6`) | Đọa Thiên Tinh Quân `boss_th_tinhquan` 175 (`th_q7`) | Mảnh Tinh Giáp thắp lại sao; đầu cầu Ngân Hà chìm trong ma vực (`th_q9`) |
| 7 | Hỗn Độn Ma Vực (180-189), Ám Ấn | Phá Ma Thiền Sư, sư huynh của Ma Quân, dựng trận phá ma | Cốt Viêm Ma Long canh Huyết Trì; trận pháp quanh tế đàn | Phá trận bằng 3 lượt hang động (`hd_q6`) | Thao Thiết Ma Thần `boss_hd_thaothiet` 185, Ma Quân đã hiến cả giáo phái và chính mình cho nó (`hd_q7`) | Oán Hồn Châu làm chìa mở cửa Thần Cảnh (`hd_q9`) |
| 8 | Thái Cực Thần Cảnh (190-199), Thái Cực Ấn | Bảy Ấn đã sạch; Thái Cực Chân Nhân, Ấn cuối đang rạn | Thanh Giao, Huyền Vũ nhiễm ma khí; trăm trận hang động (`tc_q6`) | Thái Âm Ngọc Hồ, đệ tử út của Chân Nhân (`tc_q7`) | **Hư Vô Ma Tôn** `boss_tc_maton` 199 ở Thái Cực Thánh Điện (`tc_q9`) | Đạt 199, khắc tên lên Thánh Điện: "Chí Tôn Ninja" (`tc_q10`); hậu kỳ chuyển sang hoạt động lặp (Hung Tinh, chiến trường, lôi đài, kỳ duyên đã xong làm thoại kết) |

**Sợi chỉ kỳ duyên**: kỳ duyên cuối mỗi vùng 2-8 là `talk` mang tin về Kỳ nhân vùng trước, nối tám chuyện nhỏ thành một vòng: Tiên Đồng → Ma Nữ → Tiên Nữ → Tiều Phu → Thư Sinh → Thợ Săn → Đan Sư → Ngư Ông (bảng phụ lục C).

---

## 5. Hệ thống

### 5.1 `quest-main` — Chính tuyến Hạ Giới (đã có) · P1, P2 · M · done

- **Mục đích**: dẫn người chơi mới từ cấp 1 tới 120 qua mọi bản đồ cũ, dạy từng hệ thống (cường hóa `m6`, phó bản `m9`, boss nhóm `m17`).
- **Luồng người chơi**: gặp Trưởng Làng bất kỳ → "Nhận nhiệm vụ" → làm mục tiêu (HUD `#hud-quest` theo dõi, phím T tự tìm đường, auto săn đúng quái) → về Trưởng Làng → "Nhận thưởng".
- **Quy tắc** (mã hiện có, `modules/quest`): một nhiệm vụ chính một lúc, `c.quest = { i, st: 0|1|2, prog }`; `talk` xong ngay khi nhận; `collect` trừ vật phẩm khi trả; `upgrade` so `p.maxPlus()`; `dungeon` đếm `onDungeonClear`; trả thưởng cần đủ ô trống, thiếu thì báo và không mất gì.
- **Dữ liệu**: `src/shared/data/quests.js` (sau `core-levelcap-199` thành `quests/legacy.js`, id `m1`-`m51` theo vị trí, đóng băng thứ tự).
- **Gói**: `npc { id }` → `dialog`; `npcAct { id, a: 'accept'|'finish' }`; trạng thái trong `me.quest`.
- **Tiêu chí chấp nhận (đã đạt)**: `npm run check` in `51 nhiệm vụ` không lỗi; `req` không giảm; đủ 7 kiểu; phần "2. Nhiệm vụ & NPC" của `npm test` đạt (`tests/features/quest.js`, `tests/features/combat.js` tiến độ diệt Slime); E2E nhận và tự đi diệt quái nhiệm vụ 2 (`tests/e2e/e2e.js`).

### 5.2 `quest-main-199` — Chính tuyến "Bát Phương Thiên Ấn" cấp 120-199 · P1, P2, P5 · M · todo

**Mục đích**: nối mạch chính từ `m51` tới cấp 199 qua 8 vùng, mỗi vùng tặng đủ 9 món trang bị bậc vùng (người chơi không phải cày đồ thường để theo kịp), dạy các tính năng hậu kỳ (cường hóa +11/+12/+13, hang động, boss vùng theo nhóm). Đặc tả: `content/30-quests.md` mục 0-5, 9.1, 10.1, 11.

**Luồng người chơi**
1. Xong `m51` (cấp 120) → trưởng lão nào cũng giao `bl_q1` "Thiên Môn Hải Ngoại": qua cổng đông Long Cung hoặc Phu Xe trang 2 tới Trấn Vọng Hải.
2. Ở bãi M1 mỗi vùng có trưởng lão (x 220) và Kỳ nhân (x 340) đứng cạnh nhau bên trái bãi, quái cấp thấp nhất M1 không hung hăng.
3. Mỗi nhiệm vụ nhận và trả ở **trưởng lão vùng hoặc Trưởng Làng/Trấn Trưởng bất kỳ** (cùng loại `elder`). HUD ghi "Gặp trưởng lão cổng vùng" khi `req ≥ 120`.
4. Boss vùng ở bí cảnh D1 (cửa giữa M2): cần nhóm. Nhiệm vụ cuối vùng là `level`, mô tả chỉ cổng sang vùng sau.

**Quy tắc, công thức**

| Mục | Quy tắc |
|---|---|
| id | `<prefix>_q<n>`, `prefix ∈ {bl, xv, bn, hl, um, th, hd, tc}`, không bao giờ đổi/đánh lại sau phát hành; lưu tiến độ theo `c.quest.id` (`core-levelcap-199`) |
| `req` | trong `[lv, lv + 9]` của vùng, không giảm toàn chuỗi |
| EXP | `round(expNeed(req) · hệ số)`; hệ số: visit/talk 0,1 · kill/collect/dungeon 0,3 · upgrade/level 0,2 · **boss vùng (`_q7`) 1,0** (0.3 ý 1) · Hư Vô Ma Tôn (`tc_q9`) 0,6 · Chí Tôn (`tc_q10`) 0 |
| Xu | `200 + req²·8`, trao thành **xu khóa** |
| Trang bị | `W<t>` (vũ khí đúng phái) ở `_q2`; `armor/pants/hat/shoes/gloves/ring/necklace/amulet_<t>` rải `_q3`-`_q9`, `t = lv/10` (12-19), độ hiếm "Tốt", **khóa** |
| Cường hóa | đá + Bùa Bảo Hộ tặng ở `_q4` ngay trước nhiệm vụ `upgrade`: +11 (vùng 2), +12 (vùng 4), +13 (vùng 6); không có +14 trở lên trên chính tuyến |
| `upgrade` | đếm ở **bất kỳ** Thợ Rèn, mô tả chỉ Thợ Rèn trạm vùng |
| `dungeon` | `n ≤ 3`, tính mọi lần gọi `p.onDungeonClear()` |
| `talk` | xong ngay khi nhận ở bất kỳ NPC `elder` |
| Lượng | 5-60 mỗi nhiệm vụ, `tc_q10` 500; cả 73 nhiệm vụ 1.435 |
| Phát hành | chỉ phát hành dải vùng liền nhau từ vùng 1 (người đã xong mọi nhiệm vụ có `id = null` sẽ bỏ qua dải thêm sau) |

**Dữ liệu**: `src/shared/data/quests/{index,helper,legacy}.js` (F1, `content/00-foundation.md` mục 6.10) + 8 file `quests/<vùng>.js` (khối mã dán nguyên ở `content/30-quests.md` mục 4.1-4.8, sửa hệ số `_q7` theo 0.3 ý 1). NPC trưởng lão khai `npcs` ở bãi `entry` trong `regions/<vùng>.js` (mã bản đồ `content/10-world.md` mục 6 đã có sẵn). Bảng đủ 73 nhiệm vụ: phụ lục A.

**Gói { t }**: không thêm hành động. `npc { id: '<prefix>_elder' }`, `npcAct { id, a: 'accept'|'finish' }` như cũ; `me.quest` có thêm `id`. Gói `data.quests` đã gửi toàn bộ `MAIN_QUESTS` (thêm trường `id`).

**Module server, cửa sổ, DOM**: `modules/quest` (chuỗi "Hãy về gặp Trưởng Làng" thành `giverText(def)`: `req ≥ 120` → "Hãy về gặp trưởng lão ở cổng vùng (hoặc Trưởng Làng)."), `core/player.js` (2 chuỗi tương tự), `ui/ui.js` `updateQuestTracker` (2 chuỗi), `ui/windows/quest.js` (2 chuỗi trạng thái). Không thêm id DOM. `game/pathfind.js` `questDest` nhánh `talk`: nhãn "Gặp trưởng lão" khi `q.req ≥ 120` (1 dòng, vùng Vòng lặp game).

**Bố cục điện thoại**: trưởng lão và Kỳ nhân cách nhau 120px, nhãn tên + tiêu đề "Nhiệm vụ chính" / "Kỳ duyên" không chồng ở 844×390 và 1280×720; mô tả nhiệm vụ ≤ 200 ký tự để hộp hội thoại không cuộn trên điện thoại.

**Chống gian lận**: server có thẩm quyền như cũ (nhận/trả cần `nearNpc` tầm 130, kiểm cấp, kiểm điều kiện lúc trả, trả thưởng xong mới tăng `i`). Phần thưởng khóa nên không chuyển được sang nhân vật phụ. `c.quest.id` lạ (không có trong `MAIN_QUESTS`) thì `sanitize` rơi về `i` đã kẹp.

**Tiêu chí chấp nhận**
1. `npm run check` in `124 nhiệm vụ` (khi đủ 8 vùng), không dòng lỗi; khối 9.1 của 30-quests chạy (NPC vùng, đích nhiệm vụ trong vùng, quái `kill` cấp ≤ `req + 3`, `level` cuối vùng `n = lv + 10`, vùng 8 `n = 199`).
2. `node -e "const {MAIN_QUESTS}=require('./src/shared/data/quests');const r=MAIN_QUESTS.filter(q=>/^bl_q/.test(q.id));console.log(r.length,r.map(q=>q.id+':'+q.reward.exp).join(' '))"` in `9 bl_q1:29760 bl_q2:29760 bl_q3:90795 bl_q4:92416 bl_q5:95994 bl_q6:32653 bl_q7:333496 bl_q8:102268 bl_q9:69747`.
3. `questChainUnitTests()` (mục 9.3) đi hết chuỗi từ `m1` tới `id === null` trong < 5 giây; tổng lượng nhận = 2.674 (2.709 nếu có `hg_q*`); mọi nhiệm vụ trả được thưởng; `c.quest.id` sau mỗi bước bằng id kế tiếp.
4. Khối "Đích nhiệm vụ" của check-data (mục 9.2): mọi nhiệm vụ có `questDest` khác `null` ở `st` 0/1/2 và có đường đi từ cả 3 làng.
5. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`; ảnh `tools/shot.js` bãi `bl_bichsa` desktop + `mobile: true` in `OK no console errors`, thấy hai NPC đứng trái bãi.

### 5.3 `quest-kyduyen` — Kỳ Duyên · P1, P4 · S · todo

**Mục đích**: cho mỗi vùng Thượng Giới một câu chuyện đời thường song song mạch chính (người thật, nỗi lo thật), thêm lý do quay lại vùng cũ (kỳ duyên cuối mang tin về Kỳ nhân vùng trước) và một NPC cố định cho Lệnh Truy Nã. Đặc tả: `content/30-quests.md` mục 6-8, 9.2, 10.2, 11.

**Luồng người chơi**
1. Tới bãi M1 của vùng, bấm Kỳ nhân (tiêu đề "Kỳ duyên", áo choàng rêu, gậy trúc treo hồ lô đỏ).
2. Hội thoại liệt kê: kỳ duyên kế tiếp đủ cấp ("Kỳ duyên: <tên>"), kỳ duyên đang làm ("Đang làm" / "Trả"), mang tin tới NPC này ("Trao tin: <tên>"), Lệnh Truy Nã nếu cấp hợp vùng.
3. Nhận → làm (kill/collect/visit tự đếm; talk: đi gặp Kỳ nhân vùng trước) → trả → thoại cảm ơn riêng của kỳ duyên.
4. Cửa sổ Nhiệm vụ (N) có thẻ xanh lục "Kỳ duyên" và thẻ đỏ "Truy nã n/3", mỗi thẻ có nút tìm đường.

**Quy tắc, công thức**

| Mục | Giá trị |
|---|---|
| Số lượng | 8 chuỗi × 5 = 40; id `<prefix>_s<n>` (n 1-5), làm lần lượt theo thứ tự trong file |
| Đang làm cùng lúc | tối đa 3 (`SIDE.maxActive`) |
| Kiểu | `kill`, `collect` (nộp cho NPC), `visit`, `talk` (`to` = Kỳ nhân **vùng trước**, trả và nhận thưởng ở NPC đích) |
| `req` | trong `[lv, lv + 9]`, không giảm |
| EXP | `round(expNeed(req) · f)`, `f` 0,08 (visit) / 0,10 (kỳ duyên cuối) / 0,12 (kill/collect đầu) / 0,15 (kill thứ 4); ≈ 5,5-6,3% EXP dải |
| Xu | `100 + req²·4` xu khóa |
| Vật phẩm | đồ ăn buff ×2, Đá Cường Hóa Thần, Thẻ Hồi Sinh ×2, Bí Kíp Nhân Đôi; kỳ duyên cuối 2 Rương Báu + 10 lượng; tất cả khóa |
| Bỏ | được, mất tiến độ, nhận lại được |
| Trạng thái | `c.side = { done: [id], cur: [{ id, prog }], bd, bn, b }` (chung với truy nã) |

**Dữ liệu**: `src/shared/data/sidequests/{helper,index}.js` + 8 file vùng (khối dán `content/30-quests.md` mục 6.1-6.3, 8.1-8.8); `NPC_TYPES.hermit = { title: 'Kỳ duyên', look, field: true }` (`maps.js`); Kỳ nhân khai ở `npcs` bãi `entry` (`regions/<vùng>.js`). Bảng 40 kỳ duyên: phụ lục C.

**Gói { t }**: không thêm hành động. `npc { id }` mở hội thoại; `npcAct { id, a }` với `a` = `sq:view:<id>`, `sq:acc:<id>`, `sq:fin:<id>`, `sq:drop:<id>`, `bt:acc`, `bt:view`, `bt:fin`, `bt:drop`, khác thì mở lại hội thoại. Server → client: `me.side = { done: số, cur: [{ id, name, npc, kind, n, prog, m?, item?, map?, to?, desc }], bn, b }`; `data.side = { maxActive, bounty: { max, span, minLv }, hermits: [{ id, name, map, region }], quests: [{ id, npc, name, req }] }`.

**Module server, cửa sổ, DOM**: module mới `src/server/modules/sidequest/index.js` (thêm cuối mảng `modules/index.js`), móc `sanitize, kill, selfData, clientData` (tĩnh) và `enterMap` (thế giới); NPC loại `hermit`. Admin `/kyduyen near <npc> | done <id|bounty> | reset`. Hình Kỳ nhân `hermit(sp, pal)` trong `render/sprites/npc.js`. Máy khách: khối kỳ duyên trong `ui/windows/quest.js` (`sideDest()` dùng `mapsWithMob`, `mapsWithDrop` của `pathfind.js`), CSS `.quest-card.side`, `.quest-card.bounty` cuối `css/features.css`. **Không** thêm id DOM, phím, nút menu; không đổi `#hud-quest`.

**Bố cục điện thoại**: thẻ kỳ duyên/truy nã không tràn ở 844×390, nút tìm đường ≥ 44px; hội thoại tối đa 5 lựa chọn (3 kỳ duyên + truy nã + quay lại).

**Chống gian lận**: chuỗi `a` tách bằng `split(':')`, id tra bằng `own(SIDE_BY_ID, id)` (gửi `__proto__`, `constructor` không làm gì); chỉ nhận kỳ duyên kế tiếp của đúng NPC; trả: xóa khỏi `cur` và ghi `done` **trước** khi cộng thưởng (gửi lặp không nhận 2 lần); `collect` trừ đồ khi trả; kiểm ô trống trước khi trả; `cleanSide` kẹp `prog`, `bn ≤ 3`, `cur ≤ 3`, giữ `done` đúng mẫu `/^[a-z]{2}_s\d{1,2}$/`; NPC phải trong tầm 130 (module `npc`).

**Tiêu chí chấp nhận**
1. `npm run check` có khối 9.2 của 30-quests, không lỗi (id liên tục, `talk` chỉ trỏ vùng trước, `collect` có quái của vùng rơi, `reward.luong ≤ 20`).
2. `sidequestUnitTests()`: `SIDE_BY_ID.bl_s1.reward.exp === 35712`, `bountyReward(160,'hunt').exp === 75571`, `cleanSide` với dữ liệu rác (`__proto__`, `bn: 99`) ra `cur = []`, `bn === 3`, `({}).prog === undefined`.
3. `sidequestTest(ctx)` (bot `kyduyen1`): nhận, vượt chuỗi bị từ chối, trả 1 lần tăng đúng vật phẩm + xu khóa `100 + req²·4`, trả lặp không thêm, truy nã `hunt` → `gather`, bỏ lệnh không tính lượt.
4. `grep -c "Ẩn Sĩ" src/server/modules/sidequest/index.js` = 0 (0.3 ý 2).
5. Ảnh cửa sổ N ở 1280×720 và 844×390 không tràn, `OK no console errors`.

**Lệnh Truy Nã** (`quest-truyna`, đặc tả thuộc GDD mục 5 PvE) dùng chung module, NPC và `c.side` với kỳ duyên nên làm cùng lô S1-KD. Tóm số: 3 lệnh/ngày theo thứ tự săn 40 quái → thu 12 vật phẩm → hạ boss vùng; nhận ở Kỳ nhân của vùng có `r.lv ≤ cấp ≤ r.lv + 19`; thưởng 8% / 8% / 12% `expNeed(cấp lúc nhận)` + `2.000 + 40·cấp` xu khóa; lệnh thứ 3 thêm Rương Báu + Đá Cường Hóa Thần (khóa). Bảng số: phụ lục D.

### 5.4 `quest-lore` — Cốt truyện, thoại nhiều NPC, cảnh mở đầu · P1, P2 · S · todo

**Mục đích**: người chơi hiểu vì sao mình đi từ làng tới Thái Cực Thần Cảnh, thấy phản diện xuyên suốt, nhớ được tên NPC. Hiện mọi nhiệm vụ chỉ có một câu mô tả và câu chung "Làm tốt lắm!".

**Luồng người chơi**
1. **Cảnh mở đầu**: nhân vật mới vào game lần đầu (`me.level === 1`, `me.quest.id === 'm1'`, `st === 0`) thấy cửa sổ `story` 4 khung chữ trên nền tranh cuộn (tranh vẽ bằng code, dùng lại nền của `render/titleart.js`), nút "Tiếp" và "Bỏ qua". Hết khung thì tự tìm đường tới Trưởng Làng (`travelTo({ npcType: 'elder' })`).
2. **Lời giao / lời trả**: khi mở hội thoại nhận nhiệm vụ, trưởng lão nói câu giao riêng (in nghiêng trước mô tả); khi trả, hộp hội thoại hiện câu trả riêng thay câu chung.
3. **Chương**: xong nhiệm vụ cuối chương thì thông báo kiểu `story` "Chương mới: <tên>" (băng giữa trên, viền vàng sơn mài); cửa sổ Nhiệm vụ ghi tên chương hiện tại ở đầu thẻ chính.
4. **Hồi ký**: nút "Cốt truyện" ở chân cửa sổ Nhiệm vụ mở cửa sổ `story` dạng danh sách chương đã qua (tên + 1-2 câu tóm tắt), chương chưa tới hiện khóa "Đạt cấp X để mở".
5. **Kết**: xong `tc_q10`, trưởng lão nào cũng nói câu kết (thay "Ngươi đã hoàn thành mọi thử thách của ta. Ngươi chính là Ninja huyền thoại!").

**Quy tắc**: lời giao/trả chỉ là chữ, không đổi điều kiện hay thưởng; nhiệm vụ không có dòng trong `LINES` dùng câu chung như cũ (làm dần, đợt đầu có 46 cặp ở phụ lục E); mọi câu theo mục 7.

**Dữ liệu**: file mới `src/shared/data/story.js` (CommonJS, không require dữ liệu khác):
```js
// PROLOGUE: 4 chuỗi; EPILOGUE: chuỗi; CHAPTERS: [{ id: 'c1', name, from: 'm1', to: 'm11', lv: 1, sum }];
// LINES: { '<quest id>': ['lời giao', 'lời trả'] }
module.exports = { PROLOGUE, EPILOGUE, CHAPTERS, LINES };
```
`CHAPTERS` có 14 dòng theo bảng mục 4 (`hg_q*` thuộc `c5`). Khóa `LINES` là id nhiệm vụ (`m<n>`, `hg_q<n>`, `<prefix>_q<n>`).

**Gói { t }**: không thêm hành động. `data.story = { prologue, epilogue, chapters }` (móc `clientData` của `modules/quest`); `LINES` chỉ dùng phía server trong chuỗi `dialog`. Thông báo chương: `notice { msg, kind: 'story' }`.

**Module server, cửa sổ, DOM**: `modules/quest` (`elderDialog` chèn lời giao, `finishMain` gửi `dialog` lời trả + `notice` chương), `ui/windows/story.js` mới (`renderStory()`, hai chế độ: mở đầu và hồi ký), một dòng import + bảng `refresh()` trong `ui/ui.js`, nút "Cốt truyện" trong `ui/windows/quest.js`, CSS `.story-*` và `.toast.story` cuối `css/features.css`. Nút dùng `[data-act=story-next]`, `[data-act=story-skip]`, `[data-act=story-open]` để kiểm thử chọn. Không thêm id DOM.

**Bố cục điện thoại**: khung chữ tối đa 3 dòng ở 844×390 (≤ 140 ký tự/khung), nút "Tiếp"/"Bỏ qua" cao 44px ở góc dưới phải, không che D-pad; trên máy tính cửa sổ rộng 560px.

**Chống gian lận**: không có phần thưởng ở cảnh mở đầu hay hồi ký; ghi nhớ "đã xem mở đầu" là tiện ích riêng máy (localStorage `ns-prologue-<tên nhân vật>`, bọc try/catch; mất thì chỉ xem lại). Danh sách chương đã qua tính từ `me.quest.id` do server gửi.

**Tiêu chí chấp nhận**
1. `npm run check` có khối "Cốt truyện": `CHAPTERS` liền nhau phủ đúng mọi id `MAIN_QUESTS` (không thiếu, không chồng), mọi khóa `LINES` có trong `MAIN_QUESTS`, mỗi câu ≤ 160 ký tự, không chứa từ trong danh sách cấm (tên phiên âm và từ ngoại lai ở bảng 5.6; từ tiếng Anh `ok`, `boss`, `level`, `quest`; dấu ba chấm). Đại từ "bạn", "cậu", "tôi" do người rà soát kiểm bằng mắt, không máy kiểm vì trùng nghĩa khác ("bạn cũ", "tôi thép").
2. `questChainUnitTests()`: với nhiệm vụ có `LINES`, hội thoại `elderDialog` chứa lời giao và hội thoại sau `finishMain` chứa lời trả; xong `m11` sinh `notice` có `kind === 'story'` chứa tên chương 2.
3. Ảnh `tools/shot.js` nhân vật mới (`cmds: []`) desktop + `mobile: true`: thấy khung mở đầu 1, chữ không tràn, `OK no console errors`; bấm `[data-act=story-skip]` thì cửa sổ đóng.
4. `npm test` đạt.

### 5.5 `quest-main-gap` — Lấp khoảng trống 84-95, chỉnh nhịp Hạ Giới · P2, P5 · S · todo

**Mục đích**: hiện từ `m43` (cấp 84) tới `m44` (cấp 95) không có nhiệm vụ chính 11 cấp; dải 70-109 chỉ có 2 nhiệm vụ mỗi 10 cấp, nhiệm vụ chính chỉ đóng 12-15% EXP dải (dải đầu 36-64%). Người chơi mới hay bỏ đúng ở đoạn "không biết làm gì tiếp". Bãi mới Hạ Giới của `world-lower-fill` (Huyệt Vạn Cốt, Huyết Hồ, Trấn Vân Môn, Vân Thạch Lâm, boss Huyết Ma Vương 92) cho đủ nội dung để lấp.

**Đo hiện trạng** (`gddwork/lab/q08/build.js`, EXP nhiệm vụ chính / tổng `expNeed` của dải):

| Dải | NV | % hiện tại | % sau khi chèn `hg_q*` |
|---|---|---|---|
| 60-69 | 5 | 36,4% | 36,4% |
| 70-79 | 2 | 12,2% | 12,2% |
| 80-89 | 2 | 15,3% | **34,4%** |
| 90-99 | 2 | 13,2% | **28,5%** |
| 100-109 | 2 | 11,7% | 11,7% |

**Đề xuất** (chèn sau `m43`, trước `m44`; cần ADR-08-1): 6 nhiệm vụ id `hg_q1`-`hg_q6`, hệ số theo chuỗi cũ (visit/talk 0,3, kill/collect 0,6, boss 1,0), xu khóa `200 + req²·8`, trang bị bậc 8 (Thiên) còn thiếu trong dải.

| id | Tên | Cấp | Loại | Mục tiêu | Bản đồ | EXP | Xu khóa | Lượng | Vật phẩm (khóa) |
|---|---|---|---|---|---|---|---|---|---|
| `hg_q1` | Huyệt Vạn Cốt | 85 | visit | `gd_vancot` | Huyệt Vạn Cốt (cửa x600 Cổng Địa Ngục) | 45.390 | 58.000 | 0 | Trà Thiết Bích ×3 |
| `hg_q2` | Hồn Cốt Oán Khí | 86 | collect | `gd_honcot` ×15 (← Cốt Binh 84) | Huyệt Vạn Cốt | 92.880 | 59.368 | 5 | Đá Cường Hóa Cao ×4, Bùa Bảo Hộ |
| `hg_q3` | Huyết Linh Trên Hồ | 88 | kill | `gd_huyetlinh` ×30 | Huyết Hồ | 97.152 | 62.152 | 0 | Nón Thiên, Giày Thiên |
| `hg_q4` | Trấn Trưởng Vân Môn | 89 | talk | NPC `elder` | Trấn Vân Môn | 49.662 | 63.568 | 5 | Bí Kíp Nhân Đôi |
| `hg_q5` | Huyết Ma Vương | 92 | kill | `boss_gd_huyetma` ×1 | Huyết Hồ | 176.640 | 67.912 | 15 | Rương Báu ×4, Găng Thiên |
| `hg_q6` | Lông Hạc Thần | 93 | collect | `gd_longhac` ×15 (← Hạc Thần 92) | Vân Thạch Lâm | 108.252 | 69.392 | 10 | Dây Chuyền Thiên, Đá Cường Hóa Thần |

Mô tả và lời giao/trả: phụ lục B, E.

**Sửa mô tả thiếu địa điểm** (chỉ chữ `desc` trong `quests/legacy.js`, không đổi thứ tự, tên, thưởng):

| id | Mô tả mới |
|---|---|
| `m2` | Tiêu diệt 8 Nhầy Xanh trên đồi ngoài làng (Đồi Hỏa Diệm, Hồ Thủy Tiên hoặc Đồi Gió Lộng). |
| `m3` | Tiêu diệt 10 Thỏ Rừng phá ruộng trên đồi ngoài làng (Đồi Hỏa Diệm, Hồ Thủy Tiên hoặc Đồi Gió Lộng). |
| `m4` | Thu thập 6 Nấm Độc từ quái Nấm Độc trên đồi ngoài làng (Đồi Hỏa Diệm, Hồ Thủy Tiên hoặc Đồi Gió Lộng). |
| `m14` | Thu thập 10 Cánh Hoa Tiên từ Hoa Tiên Tử ở Vườn Anh Đào. |
| `m16` | Tiêu diệt 20 Dơi Hang trong Hang Dơi. |
| `m21` | Thu thập 12 Cát Vàng từ Bọ Cạp Cát ở Hoang Mạc Cát. |
| `m22` | Đánh bại 20 Đạo Tặc Sa Mạc ở Hoang Mạc Cát. |
| `m25` | Thu thập 12 Mảnh Tượng Đá từ Tượng Đá Cổ trong Phế Tích Cổ. |
| `m31` | Tiêu diệt 25 Bạch Viên trên Núi Tuyết. |
| `m34` | Thu thập 15 Tinh Thể Tím từ Pha Lê Nhân trong Hang Pha Lê. |

(`m2` dùng tên "Nhầy Xanh" khi `quest-npc-rename` đã gộp; nếu chưa thì giữ "Slime Xanh".)

**Dữ liệu**: file mới `src/shared/data/quests/gap.js` (mảng 6 lệnh `qx('hg_q1', tên, req, loại, mục tiêu, n, mô tả, thưởng, lượng, hệ số)` như file vùng), `quests/index.js` ghép `legacy.slice(0, 43).concat(gap, legacy.slice(43), vungQuests)` (id `m<n>` gán theo vị trí trong `legacy` **trước** khi ghép). `core/player.js` `sanitize`: dữ liệu cũ chỉ có `i` (chưa có `id`) thì đổi `i` thành id theo thứ tự legacy trước rồi mới tra vị trí (`i < 51` → `m${i+1}`, `i === 51` → id ngay sau `m51`). Việc chuyển đổi này chung với `ops-data-migration`.

**Gói, module, cửa sổ, DOM**: không đổi (dùng `modules/quest`, cửa sổ Nhiệm vụ như mọi nhiệm vụ chính).

**Bố cục điện thoại**: như 5.2 (mô tả ≤ 200 ký tự).

**Chống gian lận**: người đã qua `m43` khi bản này lên **không** nhận bù 6 nhiệm vụ (tránh thưởng không làm); người đang ở `m44` giữ nguyên trạng thái `st`/`prog` vì lưu theo id. Danh hiệu "Nhiệm vụ chính" của `soc-titles` đếm `c.quest.i`: người đã qua điểm chèn được cộng 6 vào bộ đếm (chấp nhận, không có thưởng EXP/đồ kèm; ghi trong ADR-08-1).

**Tiêu chí chấp nhận**
1. `npm run check`: không còn cặp nhiệm vụ chính liền nhau chênh `req` > 8 trong 1-120; mọi `kill/collect/visit` của `legacy` + `gap` có tên bản đồ chứa mục tiêu trong `desc`; `m1`-`m51` có mặt đúng thứ tự (khối sửa theo ADR-08-1).
2. `levelcap` + `questChainUnitTests()` (`i` đếm từ 0): nhân vật giả lưu cũ không có `id` `{ i: 43, st: 1, prog: 0 }` → sau `sanitize` `c.quest.id === 'm44'`, `st === 1` giữ nguyên; `{ i: 42, st: 2 }` → `id === 'm43'`; `{ i: 51, st: 0 }` → `id === 'bl_q1'`; nhân vật mới xong `m43` thì nhận lần lượt `hg_q1`, `hg_q2`, `hg_q3`, `hg_q4`, `hg_q5`, `hg_q6` rồi tới `m44`.
3. % EXP nhiệm vụ chính dải 80-89 ≥ 30% và 90-99 ≥ 25% (lệnh in của `tools/sim-*.js` hoặc `gddwork/lab/q08/gap.js` chạy trên dữ liệu thật).
4. `npm test` đạt.

### 5.6 `quest-npc-rename` — Đổi tên phiên âm, ngoại lai · P1 · S · todo

**Mục đích**: `DESIGN_RULES` mục 9 yêu cầu tên Hán-Việt/thuần Việt; repo còn 15 NPC tên phiên âm kiểu Nhật và 4 tên quái/boss/thú có chữ ngoại lai. Đổi ở GĐ 7 cùng đợt hoàn thiện.

**Quy tắc**: chỉ đổi chuỗi `name` (và chữ mô tả có nhắc tên); **không** đổi id NPC, id quái, khóa hình (`slime`, `boss_pharaoh` giữ nguyên) để không vỡ dữ liệu lưu, kiểm thử và hình vẽ. Tên mới không trùng tên nào trong `content/10-world.md`, `20`, `40`, `50`, `60` (đã đối chiếu với danh sách NPC trạm).

| id | Tên cũ | Tên mới | File |
|---|---|---|---|
| `v_fire_smith` | Thợ Rèn Tetsu | Thợ Rèn Thiết Sơn | `maps.js` |
| `v_fire_task` | Tiểu Nhị Ken | Tiểu Nhị A Hỏa | `maps.js` |
| `v_fire_tele` | Phu Xe Rin | Phu Xe Xích Mã | `maps.js` |
| `v_fire_storage` | Thủ Kho Bo | Thủ Kho Kim Rương | `maps.js` |
| `v_fire_dungeon` | Hộ Pháp Ryu | Hộ Pháp Long Uy | `maps.js` |
| `v_water_smith` | Thợ Rèn Gan | Thợ Rèn Hàn Giang | `maps.js` |
| `v_water_task` | Tiểu Nhị Yuki | Tiểu Nhị Tuyết Nhi | `maps.js` |
| `v_water_tele` | Phu Thuyền Sora | Phu Thuyền Vân Giang | `maps.js` |
| `v_water_storage` | Thủ Kho Mizu | Thủ Kho Thủy Khố | `maps.js` |
| `v_water_dungeon` | Hộ Pháp Kai | Hộ Pháp Hải Uy | `maps.js` |
| `v_wind_smith` | Thợ Rèn Daichi | Thợ Rèn Thạch Địa | `maps.js` |
| `v_wind_task` | Tiểu Nhị Haru | Tiểu Nhị Xuân Phong | `maps.js` |
| `v_wind_tele` | Phu Xe Kaze | Phu Xe Phong Mã | `maps.js` |
| `v_wind_storage` | Thủ Kho Fuu | Thủ Kho Phong Khố | `maps.js` |
| `v_wind_dungeon` | Hộ Pháp Jin | Hộ Pháp Thần Phong | `maps.js` |
| `slime` (quái) | Slime Xanh | Nhầy Xanh | `monsters.js` |
| `boss_slime` | Vua Slime | Vua Nhầy Xanh | `monsters.js` |
| `boss_pharaoh` | Pharaoh Phục Sinh | Sa Mạc Cổ Vương | `monsters.js` |
| `pet_slime` (thú cưng) | Slime Con | Nhầy Con | `pets.js` (vùng Dữ liệu game, báo GDD mục Thú) |
| `m2` / `m11` / `m27` (tên nhiệm vụ) | Dọn Dẹp Slime / Vua Slime / Pharaoh Phục Sinh | Dọn Dẹp Quái Nhầy / Vua Nhầy Xanh / Cổ Vương Phục Sinh | `quests/legacy.js` (tên + `desc`) |

Chỗ khác phải sửa chữ theo: `README.md` (dòng "Vua Slime → Long Vương"), chú thích `render/monster/humanoid.js` dòng 760, `content/60-mounts-pets.md` mô tả `pet_goldturtle` ("Rơi từ Lang Vương và Sa Mạc Cổ Vương."), thông báo ok trong `tests/features/combat.js` (chữ), `specs/dailies.md` ví dụ "Thủ Kho Mizu" (chữ ví dụ).

**Gói, module, DOM**: không đổi; tên tới máy khách qua gói `data`.

**Bố cục điện thoại**: tên mới ≤ 18 ký tự để nhãn tên NPC 1 dòng ở 844×390.

**Chống gian lận**: không liên quan.

**Tiêu chí chấp nhận**
1. `grep -rnE "Tetsu|Ken'|Rin'|Bo'|Ryu|Gan'|Yuki|Sora|Mizu|Kai'|Daichi|Haru|Kaze|Fuu|Jin'|Slime|Pharaoh" src/shared` không còn dòng nào (trừ khóa hình `'slime'` viết thường).
2. Khối check-data "Tên": mọi `name` của NPC/quái/vật phẩm không chứa từ trong danh sách cấm (bảng trên), không trùng nhau.
3. `npm test` và `npm run test:e2e` (desktop + `MOBILE=1`) đạt; ảnh 3 làng desktop + điện thoại thấy nhãn tên mới 1 dòng.

---

## 6. Nhiệm vụ phụ và hằng ngày

| Loại | id danh mục | Nơi nhận | Nhịp | Thưởng (kiểu nhiệm vụ: xu khóa/đồ khóa) | Cốt truyện | Đặc tả |
|---|---|---|---|---|---|---|
| Kỳ Duyên (40) | `quest-kyduyen` | Kỳ nhân 8 vùng | một lần mỗi kỳ duyên, ≤ 3 đang làm | EXP 0,08-0,15 `expNeed`, xu `100 + req²·4`, đồ ăn/đá/thẻ/bí kíp, cuối chuỗi 10 lượng + 2 rương | Có: 8 câu chuyện nối vòng | 5.3, phụ lục C |
| Lệnh Truy Nã | `quest-truyna` | Kỳ nhân vùng hợp cấp | 3 lệnh/ngày (giờ VN) | 8/8/12% `expNeed`, `2.000 + 40·cấp` xu khóa, lệnh 3: Rương Báu + Đá Cường Hóa Thần | Lời Kỳ nhân, không chuỗi | 5.3, phụ lục D, GDD mục 5 PvE |
| Tiểu Nhị | `quest-daily-task` | NPC `task` ở làng/trạm | 20 lượt/ngày | ~14-16% một cấp/lượt (×`expScale`), mỗi 5 lượt 1 Rương Báu | Không | GDD mục 5 PvE |
| Việc Làng | `quest-dailies` | 3 làng (phím H) | 10 việc/ngày, chuỗi +10%/bậc, mốc 3/6/10 | theo `specs/dailies.md` | Đưa thư giữa NPC làng: dùng tên NPC sau đổi tên (5.6) | `specs/dailies.md`, GDD mục 5 PvE |
| Nhiệm vụ phụ Hạ Giới 1-120 | (không có) | | | | | Ngoài phạm vi 1.0 (`content/30-quests.md` mục 0 dòng 10): Việc Làng đã phủ |

---

## 7. Quy tắc viết thoại

| Mục | Quy tắc |
|---|---|
| Xưng hô | NPC xưng **"ta"**, gọi người chơi **"ngươi"** (`DESIGN_RULES` mục 8). Kỳ nhân già được xưng "lão" khi xúc động (Ngư Ông). Không dùng "bạn", "cậu", "mình", "tôi" |
| Người chơi | Không có lời thoại; không đặt câu hỏi bắt người chơi trả lời bằng chữ |
| Độ dài | Mô tả nhiệm vụ (`desc`) 1-2 câu, ≤ 200 ký tự; lời giao/lời trả (`LINES`) ≤ 160 ký tự (đợt đầu ≤ 140); thoại cảm ơn kỳ duyên (`done`) ≤ 100 ký tự; khung mở đầu ≤ 140 ký tự |
| Nội dung bắt buộc | `desc` có **địa điểm** (tên bản đồ chứa mục tiêu, hoặc chỉ đường: "cửa giữa Dung Nham Hà") và **tên đúng** quái/vật phẩm như dữ liệu; số lượng ghi bằng số |
| Giọng theo vai | Trưởng Làng: thầy dạy, ngắn, có ý thử lòng. Trưởng lão vùng: trang trọng, Hán-Việt nhiều hơn, nói về Ấn. Kỳ nhân: đời thường, thuần Việt, kể chuyện nhà. Tiểu Nhị/Phu Xe: vui, nhanh. Phản diện: không xuất hiện trực tiếp, chỉ qua lời kể, lệnh bài, dấu trăng đỏ |
| Từ ngữ | Tiếng Việt có dấu đầy đủ; không tiếng Anh, không tên riêng của game khác (trường, làng, NPC, vật phẩm, bản đồ, sự kiện, boss); không từ lóng hiện đại, không biểu tượng cảm xúc; số có dấu chấm hàng nghìn |
| Gợi mở | Nhiệm vụ boss chương phải có một chi tiết móc sang chương sau (dấu trăng đỏ, lệnh bài, lời trăng trối) |
| Nhất quán | Tên riêng chỉ lấy từ bảng mục 3 và dữ liệu; tên mới phải qua đối chiếu trùng (`xchk/names.js` của PLAN) |
| Thông báo hệ thống | Trung tính, ngắn: "Nhận kỳ duyên: <tên>", "Hoàn thành '<tên>'! Nhận: <phần thưởng>", "Chương mới: <tên>" |

---

## 8. Quy tắc thưởng

| Nguồn | EXP | Xu | Lượng | Vật phẩm | Ghi chú |
|---|---|---|---|---|---|
| Nhiệm vụ chính Hạ Giới (`m*`, `hg_q*`) | `round(expNeed(req)·f)`, `f` của chuỗi cũ: talk 0,6 (`m1`), kill thường 0,6-1,5, collect 0,6-1,0, level/upgrade 0,5, visit 0,3-0,4, dungeon 0,8, boss 1,0, `m51` 0 | `200 + req²·8` → **xu khóa** | 0-200, `m51` 500 | trang bị bậc theo dải ("Tốt"), đá, rương, bình, đồ ăn; **khóa** | `expNeed` ≤ 120 giữ nguyên từng số (`core-levelcap-199`) nên thưởng cũ không đổi |
| Nhiệm vụ chính Thượng Giới | `round(expNeed(req)·f)` (có `expScale`), `f` ở 5.2 | `200 + req²·8` → xu khóa | 0-60, `tc_q10` 500 | đủ 9 món bậc vùng, đá Thần, Bùa Bảo Hộ, rương, hp5/mp5 (vùng 1-4), hp6/mp6 (vùng 5-8); khóa | 27-29% EXP mỗi dải, vùng 8 37,7% |
| Kỳ duyên | 0,08-0,15 `expNeed(req)` | `100 + req²·4` xu khóa | 10 ở kỳ duyên cuối mỗi chuỗi | xem 5.3; khóa | `reward.luong ≤ 20` (check-data) |
| Lệnh Truy Nã | 8/8/12% `expNeed(cấp lúc nhận)` | `2.000 + 40·cấp` xu khóa | 0 | lệnh 3: Rương Báu + Đá Cường Hóa Thần (khóa) | 28% một cấp mỗi ngày |
| Tiểu Nhị | `(10 + 8L)(12 + 0,3L)·expScale(L)` | `200 + 60L` xu khóa | 1/lượt | mỗi 5 lượt Rương Báu (khóa) | `bound.md` + `core-levelcap-199` |

Quy tắc chung:
- **Xu khóa và đồ khóa** cho mọi thưởng kiểu nhiệm vụ (`specs/bound.md` G12): `finishMain` dùng `p.gainXuk(r.xu)` và `p.addItem(id, n, rarity, 0, 1)`; kỳ duyên và truy nã dùng hàm `give()` cùng quy tắc (chưa có `bound` thì rơi về xu/đồ thường, đã viết sẵn trong khối mã).
- EXP thưởng chia `p.s.expMul` (Bí Kíp Nhân Đôi, gia tộc không nhân thưởng nhiệm vụ).
- **Quà không mất** (P5): thiếu ô trống thì không trả và báo "Cần n ô trống trong hành trang."; không có trường hợp trả một nửa.
- Không bán chỉ số vượt trần: chính tuyến không vượt +13, không tặng ngọc/thời trang; lượng chuỗi mới (1.435) xấp xỉ chuỗi cũ (1.239).
- Đổi công thức, hệ số hay lượng phải chạy `npm run check`, cập nhật bảng `DESIGN_RULES` mục 9 (dòng "Nhiệm vụ chính Thượng Giới", "Kỳ duyên", "Lệnh truy nã") và GDD mục 6 Cân bằng.

---

## 9. Cách kiểm

### 9.1 `tools/check-data.js` (thêm khối theo thứ tự PLAN mục 7)

| Khối | Kiểm | Nguồn |
|---|---|---|
| Nhiệm vụ (có) | loại hợp lệ, `req` không giảm, quái tồn tại và có trên bản đồ, vật phẩm có quái rơi, bản đồ `visit` tồn tại, thưởng tồn tại | repo |
| Nền tảng 8.8 | `id` không trùng; `m1`-`m51` có mặt đúng thứ tự (bản sửa theo ADR-08-1; nếu ADR không duyệt: 51 nhiệm vụ đầu là `m1`-`m51`); `level` có `n ≤ MAX_LEVEL` | `00-foundation` mục 8 |
| NPC vùng + chính tuyến Thượng Giới | 30-quests 9.1 (NPC `elder`/`hermit` đúng bãi, khoảng cách cổng ≥ 120; `kill` trong vùng, cấp ≤ `req + 3`; `collect` thuộc `materials`; `upgrade` có Thợ Rèn trạm; `level` cuối vùng; thưởng bậc `t = lv/10`; mỗi vùng có `kill` boss; Tiểu Nhị đủ quái 120-199) | `content/30-quests.md` 9.1 |
| Kỳ duyên + truy nã | 30-quests 9.2 | `content/30-quests.md` 9.2 |
| **Đích nhiệm vụ (mới, 08)** | `await import()` `src/client/js/game/pathfind.js` (không import gì khác), dựng `S = { G, me, mapId }` từ `core/gamedata.js`; với mỗi nhiệm vụ chính và `st ∈ {0, 1, 2}`: `questDest(S, q)` khác `null`; với `kill/collect/visit`: `findRoute(G.maps, v, đích)` có đường từ cả 3 làng; `desc` chứa tên một bản đồ có mục tiêu (`legacy` + `gap` + vùng) | mục 5.2, 5.5 |
| **Cốt truyện (mới, 08)** | `CHAPTERS` phủ liền mọi id; khóa `LINES` tồn tại; độ dài, đại từ (5.4 tiêu chí 1) | mục 5.4 |
| **Tên (mới, 08)** | danh sách từ cấm 5.6 | mục 5.6 |

### 9.2 Đếm sàn

`dev-verify` (GDD mục 10) đếm `MAIN_QUESTS.length ≥ 120` và in số theo kiểu; dòng tổng của check-data phải in `124 nhiệm vụ` (130 với `hg_q*`).

### 9.3 Kiểm thử: `tests/features/questchain.js` (mới)

Export `{ questChainUnitTests, questChainTest }`; gọi trong `tests/smoke.js`: `questChainUnitTests()` cuối `unitTests()`, `await questChainTest(ctx)` ngay sau phần `levelcap` (tài khoản admin riêng `chuoi1` thêm cuối `ADMINS` ở `tests/lib/harness.js`).

`questChainUnitTests()` — thế giới giả, không cần server, "ca bot lên 199" dạng nhanh:
1. Tạo `Player` giả như `tests/features/levelcap.js`; gắn `Quest` của `modules/quest` với `world` giả (`mods`, `emit` rỗng).
2. Với từng `def` trong `MAIN_QUESTS`: đặt `c.level = def.req`; dọn túi; theo kiểu: `visit` đặt `p.map = { def: { id: def.map } }` trước khi nhận; `acceptMain(p)`; `kill` gọi móc `kill(p, def.m)` `def.n` lần; `collect` `p.addItem(def.item, def.n)`; `upgrade` mặc 1 món `+def.n`; `dungeon` gọi `p.onDungeonClear()` `def.n` lần; `level` đặt `c.level = def.n`; `finishMain(p)`.
3. Kiểm: sau mỗi bước `c.quest.id` bằng id kế tiếp; `luong` tăng đúng `reward.luong`; xu khóa (hoặc xu) tăng `200 + req²·8`; vật phẩm thưởng có cờ khóa khi có `bound`.
4. Cuối: `c.quest.id === null`, `c.quest.i === MAIN_QUESTS.length`, `c.level === 199`, tổng lượng nhận = tổng `reward.luong`, hội thoại trưởng lão chứa `EPILOGUE`. Thời gian < 5 giây.
5. Chuyển dữ liệu cũ (5.5 tiêu chí 2) và id lạ (`c.quest.id = '__proto__'` → rơi về `i` kẹp).

`questChainTest(ctx)` — bot WebSocket thật `chuoi1`:
1. `/lv 120`, lệnh admin mới `/nhiemvu bl_q1` (đặt `c.quest = { i, st: 0, prog: 0, id }`; `case` mới ngay trước `default:` của `modules/admin`, chỉ ADMINS) → `/tp dragon_palace` → đi qua cổng đông → nhận ở `bl_elder` → hoàn thành `visit` ngay khi vào `bl_bichsa`; `talk` `bl_q2` xong ngay, nhận `w_<phái>_12` khóa.
2. `/nhiemvu tc_q10`, `/lv 199`, nhận + trả ở `tc_elder` → `me.quest.id === null`, `me.level === 199`, lượng +500.
3. Gói rác: `npcAct { id: 'bl_elder', a: '__proto__' }`, `a: 123` → server còn sống.

E2E: `tests/e2e/e2e.js` thêm bước "nhiệm vụ Thượng Giới": `/lv 120`, `/nhiemvu bl_q3`, nhận, bấm T → tự đi tới `bl_bichsa` và auto săn `bl_ocmuonhon` (desktop + `MOBILE=1`).

### 9.4 Ảnh và lệnh

```bash
npm run check && npm test                       # TẤT CẢ KIỂM TRA ĐỀU ĐẠT
PORT=3731 DATA_DIR=/tmp/ns-q-bonglai ADMINS=qvbl1 node src/server/index.js &
BASE_URL=http://localhost:3731 NODE_PATH=$(npm root -g) node tools/shot.js '{"account":"qvbl1","out":"/tmp/ns-q-bonglai/d","cmds":["/lv 120","/tp bl_bichsa"],"wait":1500,"shots":[{"name":"npc"},{"name":"quest","key":"KeyN"}]}'
# lặp lại "mobile":true; cổng 3730-3738 theo PLAN mục 6 (kỳ duyên 3730, vùng 3731-3738)
```

---

## 10. Phân đợt, phụ thuộc, giao việc

| Lô (PLAN) | Việc | id | Phụ thuộc | Giao |
|---|---|---|---|---|
| GĐ1 N1 (F1) | `quests/` thành thư mục, `id` ổn định, `expNeed` mới | `core-levelcap-199` (mục 6) | `dev-balance-tool` | Opus/Claude |
| GĐ1 N4 (Q0a/b/c) | `NPC_TYPES.hermit`, chuỗi "Trưởng Làng", hình Kỳ nhân, check 9.1 | `quest-main-199` (phần nền) | N1 | opencode theo 30 mục 5 |
| GĐ2 C-Q1..8 | dán `quests/<vùng>.js`, sửa hệ số `_q7` = 1,0 | `quest-main-199` | `world-region-<vùng>` cùng `hub_batch` | opencode, mỗi vùng một nhóm (vùng → nhiệm vụ → rà soát) |
| GĐ2 (sau C-Q8) | `questchain.js`, admin `/nhiemvu`, khối "Đích nhiệm vụ" | `quest-main-199` | C-Q1..8 | opencode |
| GĐ2 | `story.js`, `windows/story.js`, thoại phụ lục E | `quest-lore` | `quest-main` (Hạ Giới làm trước), C-Q* cho thoại Thượng Giới | Claude viết thoại, opencode nối mã |
| GĐ2 (sau `world-lower-fill` H4) | `quests/gap.js`, chuyển dữ liệu cũ, 10 mô tả | `quest-main-gap` | `world-lower-fill`, `core-levelcap-199`, `ops-data-migration`, ADR-08-1 | opencode |
| GĐ3 S1-KD | `sidequest` + truy nã | `quest-kyduyen`, `quest-truyna` | `quest-main-199` (ít nhất vùng `bonglai`), `eco-bound` | opencode, Claude rà soát kinh tế |
| GĐ7 | đổi tên | `quest-npc-rename` | không | opencode |

---

## 11. ADR

### ADR-08-1 — Chèn nhiệm vụ Hạ Giới vào giữa chuỗi chính (lấp khoảng trống 84-95)

| Mục | Nội dung |
|---|---|
| Bối cảnh | Chuỗi cũ chênh 11 cấp giữa `m43` (84) và `m44` (95); dải 70-109 chỉ 12-15% EXP từ nhiệm vụ chính. `00-foundation` mục 6.10 đóng băng thứ tự `legacy.js` và mục 8 ý 8 đòi "51 nhiệm vụ đầu có id `m1..m51`", nên mọi nhiệm vụ Hạ Giới mới chỉ có thể thêm **sau** `m51` (vô nghĩa với cấp 85). `30-quests` mục 0 dòng 10 để nhiệm vụ phụ Hạ Giới ngoài phạm vi |
| Quyết định | Giữ `legacy.js` nguyên vẹn (id `m<n>` gán theo vị trí trong legacy), thêm `quests/gap.js` (`hg_q1`-`hg_q6`) và ghép ở `quests/index.js` sau phần tử thứ 43. Sửa ý 8 của check-data thành "`m1`-`m51` có mặt, đúng thứ tự, `legacy.length === 51`". `sanitize` chuyển `i` cũ (không có `id`) sang id theo thứ tự legacy trước khi tra vị trí |
| Phương án khác | (a) Không chèn, để Tiểu Nhị/Việc Làng lấp: không sửa gì, nhưng người mới vẫn mất hướng 11 cấp, không có chỗ kể chuyện Huyết Nguyệt giữa Hạ Giới. (b) Một chuỗi kỳ duyên ở Trấn Vân Môn: cần thêm Kỳ nhân Hạ Giới và mở rộng `sidequest` ra ngoài `REGIONS`, nhiều mã hơn. (c) Hạ `req` của `m44`: phá nhịp boss Ma Thần cấp 100 |
| Chi phí | 1 file dữ liệu mới (~40 dòng), 3 dòng `quests/index.js`, ~6 dòng `sanitize`, sửa 1 ý check-data, ca kiểm thử chuyển dữ liệu; cỡ S |
| Hệ quả | Tổng nhiệm vụ chính 130. Phải phát hành **sau** khi F1 (lưu theo id) đã chạy trên máy chủ thật ít nhất một bản, hoặc cùng bản nhưng có bước chuyển `i` → id. Người đã qua `m43` không nhận bù; bộ đếm thành tựu "nhiệm vụ chính" (đếm `c.quest.i`) cộng thêm 6 cho họ. Mọi chỗ khác đọc `MAIN_QUESTS[i]` theo chỉ số vẫn đúng vì chỉ số luôn suy từ `id` |

---

## 12. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| 1 | Hệ số EXP nhiệm vụ diệt boss vùng là 1,0 (`00-foundation` 7.2) hay 0,6 (`30-quests`)? | **1,0** cho `<prefix>_q7` theo thứ tự ưu tiên của PLAN; `tc_q9` giữ 0,6. Chủ mục 6 Cân bằng có thể hạ về 0,6 bằng một dòng nếu `tools/sim-exp.js --check` (phương án B) cho hồ sơ Trung bình đi 120→199 dưới 20 giờ chơi hoặc dưới 10 ngày lịch (tiêu chí GDD 06 mục 2). Đo bản nháp với 1,0: chỉ nhiệm vụ chính 21,8 giờ / 11 ngày (đạt); thêm 40 kỳ duyên và Lệnh Truy Nã 19,9 giờ / 10 ngày, luyện quái dải 190-199 còn 15,6% (lệch). Quyết định cuối theo `tools/sim-exp.js` thật (GDD 06 mục 1.3 N6, Câu hỏi mở Q10) |
| 2 | Duyệt ADR-08-1 (chèn `hg_q1`-`hg_q6`)? | **Duyệt**, phát hành sau F1 đã chạy thật một bản; nếu không duyệt thì vẫn làm phần sửa 10 mô tả |
| 3 | "40 chuỗi" kỳ duyên trong danh mục là 40 kỳ duyên hay 40 chuỗi? | **40 kỳ duyên = 8 chuỗi × 5** như `30-quests`; sửa tiêu đề danh mục |
| 4 | Đổi "Slime" thành "Nhầy" (quái, boss, thú cưng, tên nhiệm vụ)? | **Đổi** theo bảng 5.6, giữ khóa hình `slime` |
| 5 | Bộ tên mới cho 15 NPC phiên âm | Dùng bảng 5.6 |
| 6 | Cảnh mở đầu ghi nhớ "đã xem" ở máy (localStorage) hay trên server? | **Máy** (tiện ích, mất thì xem lại); không thêm trường nhân vật |
| 7 | Viết lời giao/trả cho cả 124 nhiệm vụ ngay? | **Không**: đợt đầu 46 cặp ở phụ lục E (mở/boss/kết mỗi chương), nhiệm vụ khác dùng câu chung; thêm dần, check-data chỉ kiểm khóa có mặt |
| 8 | Danh hiệu theo chương ("Chí Tôn Ninja" khi xong `tc_q10`)? | Chuyển cho `soc-titles` (GDD mục 5 xã hội), ngoài phạm vi mục này |
| 9 | Nhiệm vụ phụ Hạ Giới (kỳ duyên 1-120)? | **Không** cho 1.0 (Việc Làng đã phủ), xem lại ở 1.1 |
| 10 | Lệnh admin mới `/nhiemvu <id>` chỉ cho kiểm thử? | **Có**, chỉ ADMINS, một `case` trong `modules/admin`, ghi vào danh sách lệnh ở `CLAUDE.md` |
| 11 | Hồi ký chương có cho đọc lại cảnh mở đầu? | **Có**, mục đầu danh sách "Mở đầu" |
