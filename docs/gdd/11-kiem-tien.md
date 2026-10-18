# GDD 11 — Kiếm tiền

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 11: mô hình kiếm tiền của một công ty tự bỏ vốn, không có nhà phát hành |
| Ngày | 18/10/2026 |
| Phạm vi id | `mon-luong-shop`, `mon-spend-cap`, `mon-monthly-card`, `mon-topup`, `mon-rmt` (danh mục) + 2 id mới: `mon-luong-ledger` (sổ cái lượng, nền cho mọi trần chi tiêu và đo đạc), `pet-mount-skin` (ngoại hình thú cưỡi, tiền tố `pet` vì người chơi thấy nó ở ô thú cưỡi) |
| Liên quan, đặc tả ở nơi khác (ở đây chỉ chốt giá và luật kiếm tiền) | `sig-nhangialenh` (04 mục 12), `ui-bag-expand` (05 trang bị, nhánh `feat/bag`: đã làm, chờ gộp), `gear-storage-plus` (05 trang bị mục 12), `pet-wardrobe` (05 thú và ngoại hình mục 2.4), `eco-bound`, `eco-market` (ADR-05c-1), `eco-economy-model`, `dev-sim-tools` (06 cân bằng), `ops-audit-log`, `ops-account-security` (10 vận hành), `pve-boss-luongcap` (05 PvE mục 2.2) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, `docs/gdd/01-tam-nhin.md`, `04-dac-sac.md`, `05-he-thong-*.md`; `gddwork/{pillars.md, catalog.json, audit-data.md, audit-systems.md, audit-risk.md}`; đặc tả đợt 3 `specs/{bound, market, balance, meridian, mountup, PLAN}.md`; nội dung cấp 199 `content/{00-foundation, 40-items-shops, 60-mounts-pets}.md`; mã `src/` ở thư mục làm việc ngày 18/10/2026 (`modules/{shop, inventory, smith, wheel, quest, mail, arena, events, season, admin, pk, skills}`, `core/{player, combat}.js`, `shared/data/{extras, quests}.js`, `shared/data/items/{fashion, pets, books, consumables, equipment, gems, shops}.js`, `shared/constants.js`) |
| Thí nghiệm kèm | `gddwork/lab/m11/sim-paygap.js` (chênh lệch sức mạnh người nạp so với người miễn phí, kết quả `sim-paygap.design.out`, `sim-paygap.now.out`), `gddwork/lab/m11/upgrade-cost.js` (kỳ vọng đá, bùa, lượng để cường hóa, kết quả `upgrade-cost.out`). Cả hai chỉ đọc repo, dùng thư viện mô phỏng `gddwork/lab/sim/lib.js` của mục 06 |
| Sổ tính năng | `gddwork/registry/11.json` (7 mục) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 9 ghi rõ là đổi quy tắc. Mọi tên trong mục này là tên tự đặt; các game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ **loại** cơ chế. **Cổng thanh toán thật nằm ngoài phạm vi**: mục này thiết kế giao diện, luồng, dữ liệu, bộ chuyển đổi nhà cung cấp và một nhà cung cấp giả (`mock`) để kiểm thử; ký hợp đồng, giấy phép và tích hợp nhà cung cấp thật là việc của ADR-11-1 khi công ty quyết định bật.

---

## 0. Tóm tắt một trang

| Câu hỏi | Trả lời ngắn |
|---|---|
| Kiếm tiền bằng gì? | Bán **lượng** (tiền cao cấp duy nhất). Người chơi tiêu lượng vào ngoại hình, tiện ích, Kim Lệnh của Nhẫn Giả Lệnh, và một phần nhỏ có trần cho tăng tốc tiến triển. Không bán chỉ số vượt trần, không có hệ thống "VIP" theo tổng nạp |
| Người không nạp có thiệt không? | Mọi thứ bán bằng lượng đều mua được bằng lượng kiếm trong game (≈ 25 lượng/ngày người chơi vừa, ≈ 50 người chơi chăm). Món mạnh nhất mỗi ô (Huyền thoại) **chỉ** có từ chơi: boss, ghép mảnh, lễ hội |
| Trần chênh lệch | Sức mạnh `P = DPS × EHP` với boss cùng cấp. `G = P(người nạp tối đa) / P(người miễn phí chăm cùng cấp, cùng số ngày)`. **G ≤ 1,15** khi đã ở dải cấp ≥ 30 ngày, **G ≤ 1,40** trong 30 ngày đầu. Trong đấu 1-1 cùng cấp, tỉ lệ thời gian hạ nhau đúng bằng G |
| Cái gì giữ trần? | (1) **Hạn mức Tu Luyện tuần**: lượng tiêu cho nhóm tăng tốc (đá, bùa, ngọc, Bí Kíp, thức ăn thú, vòng quay lượng, mua đồ tiến triển trên chợ bằng lượng) tối đa 350 lượng/tuần/nhân vật = đúng lượng một người miễn phí chăm kiếm trong tuần; (2) luật dữ liệu: gói không chứa ngọc cao hơn mức trung bình của dải cấp, Huyền thoại không bán; (3) công cụ `tools/sim-paygap.js --check` chặn khi gộp |
| Giá | 100 đ = 1 lượng. Nạp 10.000-500.000 đ, thưởng thêm 0-12%, nhân đôi lần đầu mỗi mệnh giá (≤ 200.000 đ). Kim Lệnh 300 lượng (≈ 30.000 đ). Thẻ Nguyệt Bổng 30.000 đ (900 lượng trong 30 ngày). Gói Khai Môn 20.000 đ (200 lượng + bộ ngoại hình 0 chỉ số) |
| 1.0 có nạp tiền thật không? | **Không** (01-tam-nhin Q1). 1.0 làm `mon-luong-ledger` + `mon-spend-cap` (bắt buộc, vì lượng miễn phí cũng cần trần và đo) + `mon-luong-shop`. `mon-topup`, `mon-monthly-card` mức Could, giai đoạn 8, chỉ bật khi ADR-11-1 được duyệt (pháp lý, nhà cung cấp) |
| Chống lạm phát | Lượng: mọi lần cộng/trừ qua sổ cái có nguồn; mục tiêu hút ≥ 85% phát mỗi 4 tuần; lượng trung vị tồn ≤ 30 ngày thu nhập. Xu: gói và thưởng kiểu nhiệm vụ trả **xu khóa** (chỉ tiêu ở NPC); không có quầy NPC đổi lượng ↔ xu |
| Quyết định kiến trúc | ADR-11-1 cổng nạp qua nhà cung cấp ngoài (tuyến HTTP nhận báo có, file `orders.json`, biến môi trường), ADR-11-2 lượng là **một** loại, chợ bằng lượng giữ lại kèm 3 rào (trả lời yêu cầu xét lại của ADR-05c-1) |

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | opencode | Mục |
|---|---|---|---|---|---|---|---|---|
| `mon-luong-ledger` | Sổ cái lượng: mọi thay đổi lượng qua một API có nguồn, thống kê ngày, lệnh `/kinhte` | P5 | M | todo | 3 | M | có | 7.1 |
| `mon-spend-cap` | Trần chênh lệch trả phí: phân loại hàng lượng, Hạn mức Tu Luyện tuần, luật dữ liệu, `tools/sim-paygap.js` | P5, P3 | M | todo | 3 | M | không | 7.2 |
| `mon-luong-shop` | Quầy Kỳ Trân Các, gói ưu đãi giới hạn lượt, công khai tỉ lệ | P5, P2 | S | todo | 3 | M | có | 7.3 |
| `mon-topup` | Nạp tiền thật mua lượng (giao diện, luồng, bộ chuyển đổi, nhà cung cấp giả) | P5, P2 | C | todo | 8 | L | không | 7.4 |
| `mon-monthly-card` | Thẻ Nguyệt Bổng (lượng mỗi ngày, không chỉ số) | P5 | C | todo | 8 | S | có | 7.5 |
| `pet-mount-skin` | Hoán Hình Thú Cưỡi: ngoại hình thú cưỡi 0 chỉ số | P1, P5 | C | todo | 6 | M | có | 7.6 |
| `mon-rmt` | Giao dịch tiền thật giữa người chơi | P5 | W | todo | 8 | S | không | 7.7 |

Không có tính năng nào ở đây là `done`: mã hiện tại có lượng, cửa hàng lượng một tab, vòng quay, mở rộng túi (nhánh `feat/bag`), nhưng chưa có sổ cái, chưa có trần chi tiêu, chưa có gói giới hạn lượt.

---

## 1. Nguyên tắc

### 1.1 Mười hai nguyên tắc (thứ tự ưu tiên từ trên xuống)

| # | Nguyên tắc | Trụ cột | Cách kiểm |
|---|---|---|---|
| N1 | **Không bán chỉ số vượt trần**: tiền chỉ rút ngắn thời gian tới mức người miễn phí chăm cũng đạt, không mở mức người miễn phí không bao giờ chạm | P5 | `tools/sim-paygap.js --check` (mục 5) |
| N2 | **Mọi thứ bán bằng tiền thật đều quy ra lượng**, trừ ngoại hình độc quyền của gói nạp (0 chỉ số). Không có món chỉ số nào chỉ mua được bằng tiền thật | P5 | `check-data`: món có chỉ số trong gói nạp → lỗi |
| N3 | **Món mạnh nhất mỗi ô không bán**: Huyền thoại (grade 4) của thời trang, thú cưỡi, thú cưng, Thần binh chỉ có từ boss, ghép mảnh, lễ hội, xếp hạng | P5, P4 | `check-data` (đã có cho thời trang/thú cưỡi, mở rộng cho thú cưng) |
| N4 | **Không mua thắng PvP**: lôi đài cấm vật phẩm (đã có), không bán lượt đấu, không bán điểm xếp hạng, không bán khiên chiến trường; hồi sinh bằng lượng bị chặn ở chiến trường (`battlefield.md`) | P3, P5 | kiểm thử `arena.js`, `battlefield.js` |
| N5 | **Ngẫu nhiên phải công khai**: mọi nguồn ngẫu nhiên tiêu lượng (vòng quay lượng, rương trong gói) hiện bảng tỉ lệ đầy đủ do máy chủ gửi; vòng quay lượng có trần lượt/ngày. **Không** bán hộp ngẫu nhiên trực tiếp bằng tiền thật | P5 | cửa sổ có `.odds`; `check-data` gói nạp không chứa vật phẩm `type: 'chest'` |
| N6 | **Không ép mua**: không đếm ngược giả, không "giá gốc" bịa, không bật cửa sổ mời nạp khi chết, thua, hết túi, hết lượng; không thông báo đẩy mời nạp. Chỉ hiện một dòng thông tin kèm nút nhỏ | P2, P5 | rà giao diện (mục 7.3, 7.4) |
| N7 | **Giá minh bạch**: giá hiện bằng lượng; cửa sổ nạp hiện đ ↔ lượng; "giá trị quy đổi" của gói do máy chủ tính từ giá lẻ thật, không gõ tay | P5 | đơn vị `bundleValue()` |
| N8 | **Quà không bao giờ mất**: lượng nạp ghi có kể cả khi người chơi offline, đơn quá hạn mà tiền đã về vẫn ghi có; phần thưởng thẻ tháng tích tối đa 7 ngày | P5 | kiểm thử `topup.js` |
| N9 | **Không có VIP theo tổng nạp**: không cấp bậc VIP, không màu chat, không ưu tiên xếp hàng, không tăng EXP/rơi đồ theo số tiền đã nạp | P4, P5 | không có trường `vip` trong dữ liệu; `grep -rn "vip" src/` rỗng |
| N10 | **Lượng nạp không hết hạn, không quy đổi ngược ra tiền**, không chuyển trực tiếp giữa người chơi (giao dịch 1-1 chỉ xu) | P5 | `trade` không có trường lượng |
| N11 | **Tự giới hạn chi tiêu**: người chơi tự đặt trần nạp/tháng; giảm có hiệu lực ngay, tăng sau 72 giờ | P5 | kiểm thử `topup.js` |
| N12 | **Mọi số trong mục này là dữ liệu** (`src/shared/data/monetize.js`), đổi số phải qua `npm run check` + `tools/sim-paygap.js --check` + bảng `DESIGN_RULES.md` mục 9 | P5 | quy trình gộp |

### 1.2 Không làm (và lý do)

| Không làm | Lý do |
|---|---|
| Cấp VIP theo tổng nạp, quà "tích lũy nạp" có chỉ số | chống P5, tạo áp lực nạp không đáy |
| Bán đá Thần, ngọc cao cấp, Bùa Bảo Hộ không giới hạn | bùa là chìa khóa cường hóa từ +12 (mục 5.3): bán không trần thì người nạp đạt +14 cả bộ, G ≈ 1,4-1,6 |
| Bán lượt quay/hộp ngẫu nhiên trực tiếp bằng tiền | rủi ro pháp lý (yếu tố may rủi), chống P5 |
| Bán bậc Nhẫn Giả Lệnh, mua điểm, mua nhiệm vụ | 04 mục 12.4 đã cấm; giữ |
| "Lượng khóa" thứ tư | tăng độ rối cho người chơi; rủi ro được chặn bằng 3 rào của ADR-11-2 |
| Quảng cáo xem video lấy thưởng | phá P1/P2 (giật khung, tải nặng), không phù hợp trò chơi trên trình duyệt chạy 60 khung |
| Bán tài khoản, bán nhân vật, sàn giao dịch tiền thật | `mon-rmt` mức W (mục 7.7) |

---

## 2. Tiền tệ

### 2.1 Ba loại tiền

| | **Xu** (`c.xu`) | **Xu khóa** (`c.xuk`, `eco-bound`) | **Lượng** (`c.luong`) |
|---|---|---|---|
| Vai trò | tiền chơi chính, lưu thông giữa người chơi | tiền thưởng kiểu nhiệm vụ, chỉ tiêu ở hệ thống | tiền cao cấp, nguồn thu |
| Nguồn | quái rơi, bán đồ thường cho NPC, thưởng sự kiện/PvP/xếp hạng, giao dịch, chợ | nhiệm vụ chính, hằng ngày, Việc Làng, điểm danh, vòng quay, giftcode, thư Ban Quản Trị, đổi quà lễ hội, gói lượng (phần xu), bán đồ khóa | Tiểu Nhị, điểm danh, Việc Làng, boss (có trần), Tà Thú, Hung Tinh, xếp hạng tuần, lễ hội, giftcode, rương, thành tựu; chợ (người bán nhận); **nạp tiền** (khi bật) |
| Chỗ tiêu | NPC, cường hóa, ghép, phí chợ, giao dịch, gia tộc | NPC (trừ trước xu thường) | Kỳ Trân Các, mở rộng túi/kho, Kim Lệnh, vòng quay lượng, tẩy điểm, hồi sinh tại chỗ, chợ (người mua trả) |
| Chuyển cho người khác | giao dịch, chợ, Rương Gia Bảo | không | chỉ qua chợ (ADR-05c-1, ADR-11-2); **không** qua giao dịch 1-1 |
| Trần | 2.000.000.000 | 2.000.000.000 | 1.000.000.000 (mới, `MONETIZE.luongMax`, kẹp trong `sanitize`; hiện mã chưa kẹp `c.luong`, chỉ hộp thư kẹp 1.000.000 mỗi thư) |
| Hàng mua được thì | thường (hoặc khóa nếu lần mua có dùng xu khóa) | khóa | **khóa** (`eco-bound`: mua bằng lượng ở NPC → `it.b = 1`; ADR-11-2 mở rộng cho chợ) |

### 2.2 Quan hệ quy đổi

| Cặp | Có đổi trực tiếp không | Tỉ giá tham chiếu (chỉ để tính phí, giá trị gói, mô phỏng) |
|---|---|---|
| đ → lượng | có, qua nạp (khi bật) | **100 đ = 1 lượng** (giá gốc, chưa thưởng thêm) |
| lượng → đ | **không bao giờ** (N10) | |
| lượng ↔ xu | không có quầy NPC. Người chơi tự đặt giá trên chợ | 1 lượng ≈ 5.000 xu (`MARKET.luongXu` của `market.md`, dùng tính phí đăng) |
| xu khóa → xu | không bao giờ (`eco-bound`) | |
| lượng → xu khóa | gián tiếp nhỏ: phần xu trong gói lượng và giải xu của vòng quay lượng | gói: ≤ 300.000 xu khóa một lần/nhân vật; vòng quay: kỳ vọng ≤ 1.500 xu/lượt |

Lý do không có quầy đổi lượng → xu: người nạp không được "in xu" làm lạm phát giá chợ của người miễn phí. Người nạp muốn dùng lượng để có đồ của người khác thì phải mua trên chợ: lượng đi từ người nạp sang người miễn phí, đồ đi từ người miễn phí sang người nạp, tổng xu trong nền kinh tế không đổi.

### 2.3 Đơn vị trên giao diện

Theo `DESIGN_RULES.md` mục 8: chữ "xu", "xu khóa", "lượng", số có dấu chấm ngăn nghìn. Tiền thật ghi "đ" sau số (`20.000 đ`), không ghi "VND", "$" hay "K". Hàng tiền (`moneyLine()`) gồm xu, xu khóa, lượng; HUD chỉ xu và lượng (`eco-bound`).

---

## 3. Lượng của người chơi miễn phí

### 3.1 Lượng kiếm được mỗi ngày (thiết kế 1.0, sau mọi trần đã đặc tả)

Ba hồ sơ dùng xuyên suốt mục này. "Vừa" là hồ sơ thiết kế (con số ≈ 25 lượng/ngày ở `01-tam-nhin` Q1 và `content/40-items-shops.md` mục 8).

| Nguồn | id | Chăm (2-3 giờ/ngày, cấp 120+) | Vừa (45-60 phút) | Ít (15 phút) | Ghi chú |
|---|---|---:|---:|---:|---|
| Tiểu Nhị (20 việc × 1) | `quest-daily-task` | 20 | 10 | 0 | `DAILY.reward(lv).luong = 1` |
| Điểm danh (15 lượng / 7 ngày) | `evt-checkin` | 2 | 2 | 2 | lịch tháng của `evt-login-rewards` giữ tổng tương đương |
| Việc Làng (mốc 10 việc) | `quest-dailies` | 5 | 5 | 5 | |
| Tà Thú (12 lượt/ngày, tham gia 2-3) | `pve-tathu` | 6 | 2 | 0 | hạng 4-10: 5; còn lại: 1 |
| Hung Tinh | `pve-worldboss` | 5 | 1 | 0 | 05 PvE: 3-17/ngày |
| Boss bản đồ (trần 60/ngày) | `pve-boss-luongcap` | 8 | 2 | 0 | trần chặn người xoay vòng boss |
| Rương Báu (7% ra 2-9 lượng) | `gear-chest` | 1 | 0,5 | 0 | |
| Thưởng tuần lôi đài, Tháp Vô Tận, chiến trường (chia 7) | `pvp-arena`, `pve-thapvotan`, `pvp-battlefield` | 3 | 0,5 | 0 | chỉ người vào bảng |
| Lễ hội + giftcode (chia đều năm) | `evt-season-core`, `soc-mail` | 2 | 2 | 1 | mỗi mùa ≤ 50 + giftcode ≤ 20 |
| Thành tựu, danh hiệu (một lần, chia 100 ngày) | `soc-titles` | 1 | 1 | 0,5 | |
| **Tổng** | | **≈ 53** | **≈ 26** | **≈ 8,5** | |

Rào chắn đo thật (giữ đúng 05 PvE mục 1.3): **trung vị lượng nhận/ngày của nhân vật hoạt động ≤ 40, phân vị 90 ≤ 120**, đo bằng `mon-luong-ledger` sau 2 tuần chạy thật. Vượt thì giảm trần boss bản đồ trước (05 PvE 2.2), không giảm thưởng sự kiện có lịch.

### 3.2 Người miễn phí mua được gì, sau bao lâu (hồ sơ Vừa, 25 lượng/ngày)

| Mục tiêu | Giá (lượng) | Số ngày | Ghi chú |
|---|---:|---:|---|
| Mở rộng túi lần 1 (+10 ô) | 50 | 2 | `INV_EXPAND.cost[0]` |
| Mở rộng túi tối đa (100 ô) | 1.200 | 48 | 6 lần: 50/100/150/200/300/400 |
| Kim Lệnh một kỳ (28 ngày) | 300 | 12 | mua được bằng lượng của chính kỳ đó |
| Bộ thời trang Sử thi (Quỷ Đỏ, Xích Diễm, Dạ Hành) | 310 | 12,4 | chỉ số nhỏ có trần |
| Thú cưỡi Bạch Hổ Sơn Quân | 400 | 16 | tốc 28 |
| Thú cưỡi bán đắt nhất (Thạch Sư Trấn Lăng) | 600 | 24 | |
| Thú cưng Đăng Linh U Minh (cấp 160) | 340 | 14 | |
| Gói Thượng Giới (một lần) | 120 | 5 | quà mốc cấp 120 |
| Hạn mức Tu Luyện một tuần | 350 | 14 | người Chăm tiêu đủ mỗi tuần |
| Hoán Hình Thú Cưỡi rẻ nhất | 200 | 8 | 0 chỉ số |

Đây là cam kết thiết kế: **mọi món trên đều trong tầm người chơi vừa** trong 2-7 tuần. Tiền thật chỉ đổi "bao lâu".

---

## 4. Hàng hóa và giá

### 4.1 Bốn nhóm hàng lượng

Mỗi món có giá lượng (`priceLuong`), mỗi lần trừ lượng ở bất kỳ module nào, đều thuộc đúng một nhóm. Nhóm suy ra tự động từ dữ liệu (`luongCat(id, def)` ở `src/shared/data/monetize.js`), món mới của đặc tả khác tự rơi đúng nhóm.

| Nhóm | Khóa | Gồm | Luật | Trần |
|---|---|---|---|---|
| Ngoại hình | `look` | thời trang chỉ số 0, Hoán Hình Thú Cưỡi, thuốc nhuộm, khung chân dung, Kim Lệnh | `stats` rỗng (kiểm khi gộp) | không trần |
| Tiện ích | `util` | mở rộng túi/kho, Hoán Cốt Đan, Vong Ưu Đan, Thẻ Hồi Sinh, tẩy tiềm năng bằng lượng, hồi sinh tại chỗ, Cuộn Về Làng mua bằng lượng | không cộng chỉ số, không tăng tài nguyên tiến triển | tự nhiên (mở rộng có số lần tối đa) |
| Tu Luyện | `boost` | Bí Kíp Nhân Đôi, Đại Bí Kíp, Bùa Bảo Hộ, đá, cẩm nang ngọc, rương, thức ăn thú, Long Mạch Châu, Thú Hồn Thạch, Linh Thú Đan, Trà Ngộ Đạo, Bảo Mạch Đan, mọi gói `pack_*`, vòng quay lượng, mua bằng lượng trên chợ các món thuộc các loại trên | rút ngắn thời gian | **Hạn mức Tu Luyện tuần: 350 lượng/nhân vật** (mục 7.2) |
| Trang bị chỉ số | `gear` | thời trang/thú cưỡi/thú cưng có chỉ số, sách nội tại | grade ≤ 3 (Huyền thoại không bán), chỉ số trong mức chặn theo cấp (`content/60` mục 3.8, `DESIGN_RULES` mục 9), mua một lần dùng lâu | không trần tiền, trần bằng dữ liệu |

Quy tắc suy nhóm (`luongCat`), theo thứ tự: `def.slot` thuộc `FASHION_SLOTS` hoặc `def.type === 'mountskin'|'dye'|'frame'` và mọi chỉ số bằng 0 → `look`; `def.type === 'book'` hoặc (`def.fashion`/`def.slot === 'pet'|'mount'`) có chỉ số → `gear`; id thuộc `MONETIZE.util` → `util`; còn lại → `boost` (mặc định an toàn: món lạ bị tính vào trần).

### 4.2 Bảng giá đề xuất (lượng ↔ đ, 100 đ = 1 lượng)

**Gói tân thủ**

| Gói | Giá | Nội dung | Giới hạn | Nhóm |
|---|---|---|---|---|
| Gói Tân Thủ (`pack_newbie`, có sẵn ở `content/40` 3.6) | 10 lượng (≈ 1.000 đ) | 20.000 xu khóa, 50 bình máu + 50 bình chakra vừa, 5 Cuộn Về Làng, 1 Bí Kíp, 10 Đá Sơ | 1 lần/nhân vật | `boost` |
| **Gói Khai Môn** (mới, nạp tiền) | 20.000 đ | 200 lượng + bộ ngoại hình "Khai Môn" (Mặt Nạ Khai Môn, Y Phục Khai Môn, chỉ số 0, khóa) + khung chân dung "Khai Môn" | 1 lần/tài khoản; chỉ hiện khi nhân vật cao nhất của tài khoản < cấp 60; không đếm ngược | lượng + `look` |

**Thẻ tháng và hành trình**

| Gói | Giá | Nội dung | Ghi chú |
|---|---|---|---|
| **Thẻ Nguyệt Bổng** (`mon-monthly-card`) | 30.000 đ | 300 lượng ngay + 20 lượng/ngày × 30 ngày (bấm nhận, tích tối đa 7 ngày) = 900 lượng; biểu tượng nhỏ cạnh tên trong cửa sổ Nhân vật (không hiện ở bản đồ, không ở chat) | chỉ bán bằng tiền (bán bằng lượng sẽ thành "lãi suất" in lượng); chồng tối đa 60 ngày; 20/ngày < 26/ngày của người vừa |
| Kim Lệnh của Nhẫn Giả Lệnh (`sig-nhangialenh`, 04 mục 12) | 300 lượng (≈ 30.000 đ) | thời trang kỳ + khung + hiệu ứng tên tạm, mọi món chỉ số 0 | mua bằng lượng, **không** bán đ trực tiếp để người miễn phí có cùng đường mua; chặn sau ngày 21 của kỳ |

**Ngoại hình**

| Hàng | Giá lượng | ≈ đ | Ghi chú |
|---|---:|---:|---|
| Thời trang có chỉ số nhỏ (đang bán) | 30-120 | 3.000-12.000 | `gear`, giữ giá hiện tại |
| Bộ ngoại hình cửa hàng mỗi quý (mới, 0 chỉ số): mặt nạ / áo choàng / y phục | 80 / 120 / 150 | 8.000 / 12.000 / 15.000 | 2 bộ mỗi quý, vẽ bằng code theo checklist thời trang; mỗi bộ cửa hàng có một bộ "anh em" đổi bằng token lễ hội (P5 sưu tầm) |
| Hoán Hình Thú Cưỡi (`pet-mount-skin`) | 200-400 | 20.000-40.000 | 0 chỉ số, mục 7.6 |
| Thuốc nhuộm Kim Tuyến / Ngân Hà / Huyết Ngọc (`pet-wardrobe`) | 15 | 1.500 | 5 màu còn lại bán bằng xu |

**Trang bị chỉ số (một lần, có trần dữ liệu)**

| Hàng | Giá lượng | ≈ đ | Ghi chú |
|---|---:|---:|---|
| Thú cưỡi (Tốt → Sử thi) | 50-600 | 5.000-60.000 | `content/60` 3.7; Huyền thoại (Kỳ Lân, Tường Vân, Hỏa Phượng, Thiên Mã, Kim Long) không bán |
| Thú cưng | 20-340 | 2.000-34.000 | thú cưng tốt nhất mỗi dải từ boss/ghép |
| Sách nội tại | 30 / 60 / 100 | 3.000-10.000 | boss cũng rơi |

**Tiện ích**

| Hàng | Giá lượng | ≈ đ | Ghi chú |
|---|---:|---:|---|
| Mở rộng túi (`ui-bag-expand`, nhánh `feat/bag`) | 50 / 100 / 150 / 200 / 300 / 400 | tổng 120.000 | 6 lần × 10 ô, tối đa 100 ô; giữ đúng `INV_EXPAND` đã làm |
| Mở rộng kho (`gear-storage-plus`) | 30 / 60 / 100 / 150 | tổng 34.000 | 4 lần × 20 ô, tối đa 140 ô |
| Hoán Cốt Đan / Vong Ưu Đan | 18 / 30 | 1.800 / 3.000 | tẩy tiềm năng / kỹ năng |
| Thẻ Hồi Sinh | 1 | 100 | chặn ở chiến trường, lôi đài |

**Tu Luyện (`boost`, tính vào Hạn mức tuần)**

| Hàng | Giá lượng | Ghi chú |
|---|---:|---|
| Bí Kíp Nhân Đôi / Đại Bí Kíp | 5 / 18 | buff `exp2` cộng nối tối đa 240 phút (mới, chặn dồn vô hạn) |
| Bùa Bảo Hộ | 2 | khóa cường hóa từ +12 (mục 5.3) |
| 9 gói `pack_*` (`content/40` 3.6) | 10-120 | giới hạn lượt tuần/nhân vật giữ nguyên; **sửa**: `pack_gem` cấp 60 → **75** (mục 5.4) |
| Vòng quay lượng | 2/lượt | tối đa 20 lượt/ngày (`evt-login-rewards`); bảng tỉ lệ hiện trong cửa sổ |

### 4.3 Mệnh giá nạp (`mon-topup`)

| id | Giá | Lượng gốc | Thưởng thêm | Tỉ lệ thưởng | Lần đầu mỗi mệnh giá (1 lần/tài khoản) |
|---|---:|---:|---:|---:|---|
| `n10` | 10.000 đ | 100 | 0 | 0% | nhân đôi: 200 |
| `n20` | 20.000 đ | 200 | 10 | 5% | nhân đôi phần gốc: 410 |
| `n50` | 50.000 đ | 500 | 30 | 6% | 1.030 |
| `n100` | 100.000 đ | 1.000 | 80 | 8% | 2.080 |
| `n200` | 200.000 đ | 2.000 | 200 | 10% | 4.200 |
| `n500` | 500.000 đ | 5.000 | 600 | 12% | không nhân đôi |
| `starter` | 20.000 đ | 200 | 0 | | Gói Khai Môn, 1 lần/tài khoản |
| `card` | 30.000 đ | 300 + 20/ngày × 30 | | | Thẻ Nguyệt Bổng |

Luật số (kiểm khi gộp): giá tăng dần; lượng gốc = giá / 100; tỉ lệ thưởng không giảm khi giá tăng và ≤ 12%; nhân đôi lần đầu chỉ cho mệnh giá ≤ 200.000 đ; không gói nạp nào chứa vật phẩm có chỉ số hay vật phẩm ngẫu nhiên.

Mệnh giá chọn theo mức nạp phổ biến của ví điện tử, chuyển khoản QR ngân hàng và thẻ cào trong nước; nhà cung cấp nào không có mệnh giá thì ẩn mệnh giá đó.

---

## 5. Trần chênh lệch sức mạnh

### 5.1 Công thức

```
P(hồ sơ, L)   = DPS(hồ sơ, boss cùng cấp L) × EHP(hồ sơ, boss cùng cấp L)
EHP           = sinh lực tối đa / sát thương kỳ vọng một đòn thường của boss cùng cấp
G(L, d)       = P(người nạp tối đa, L, d) / P(người miễn phí chăm, L, d)       (trung bình 3 phái Kiếm, Cung, Quạt)
Trần          : G ≤ 1,15 khi d ≥ 30 ngày trong dải cấp (ổn định)
                G ≤ 1,40 khi d < 30 ngày (khởi đầu, người miễn phí chưa kịp tích lượng)
```

`DPS` và `EHP` lấy đúng mô hình của `dev-sim-tools` (06 cân bằng, bản nháp `gddwork/lab/sim/lib.js`): chiêu xả đúng hồi chiêu, đòn thường lấp chỗ trống, sát thương kỳ vọng với chí mạng, hệ số phòng thủ thật của `core/combat.js`. Vì sao là tích: trong đấu 1-1, thời gian A hạ B là `EHP_B / DPS_A`, nên tỉ lệ thời gian hạ nhau = `(DPS_A · EHP_A) / (DPS_B · EHP_B)` = G. G = 1,15 nghĩa là người nạp tối đa hạ người miễn phí chăm nhanh hơn 15% so với chiều ngược lại: đủ để kỹ năng né vùng đánh và khắc hệ lật ngược (P3).

"Người nạp tối đa" = người miễn phí chăm + tiêu đủ Hạn mức Tu Luyện mỗi tuần + mua mọi món `gear` cao nhất đang bán ở dải cấp + mọi `look`/`util`. "Người miễn phí chăm" = hồ sơ trung bình của `balance.md`/`content/00-foundation` (cường hóa `plusOf(L)`, ngọc `gemLvOf(L)`, thời trang và thú cưng mua bằng lượng miễn phí, nội tại, kinh mạch).

### 5.2 Kết quả đo (thí nghiệm `gddwork/lab/m11/sim-paygap.js`, chế độ `design` = số liệu cấp 199 đã chốt)

G theo từng đòn bẩy, so với người miễn phí chăm cùng cấp:

| Kịch bản | 30 | 60 | 90 | 120 | 160 | 199 |
|---|---:|---:|---:|---:|---:|---:|
| Người miễn phí sớm (chưa có thời trang, thú) | 0,73 | 0,72 | 0,84 | 0,86 | 0,88 | 0,89 |
| Người miễn phí khởi đầu có quà nhiệm vụ (bộ thời trang Tốt + Thỏ Ngọc, đề xuất 5.5) | 0,89 | 0,83 | 0,92 | 0,93 | 0,91 | 0,92 |
| +1 cường hóa cả 9 món | 1,07 | 1,08 | 1,08 | 1,09 | 1,11 | 1,10 |
| +2 cường hóa | 1,15 | 1,16 | 1,17 | 1,19 | 1,25 | 1,22 |
| +3 cường hóa | 1,24 | 1,25 | 1,27 | 1,30 | 1,40 | 1,36 |
| Ngọc +1 cấp cả bộ | **1,65** | 1,32 | 1,37 | 1,30 | 1,28 | 1,22 |
| Ngọc +2 cấp | 3,33 | 1,91 | 1,99 | 1,76 | 1,68 | 1,54 |
| Thú cưng +10 cấp | 1,02 | 1,02 | 1,01 | 1,00 | 1,00 | 1,00 |
| Thú cưỡi bán đắt nhất trong dải | 1,00 | 1,04 | 1,03 | 1,02 | 1,01 | 1,00 |
| Kinh mạch +1 tầng | 1,00 | 1,00 | 1,06 | 1,05 | 1,04 | 1,00 |
| **Mức trần thiết kế**: +1 cường hóa, thú cưng +10, thú cưỡi bán đắt nhất | **1,09** | **1,14** | **1,12** | **1,11** | **1,12** | **1,11** |
| Vượt: mức trần + ngọc +1 | 1,81 | 1,51 | 1,54 | 1,45 | 1,44 | 1,36 |

Đọc bảng:
- **Ngọc là đòn bẩy nguy hiểm nhất**: một cấp ngọc cả bộ đáng giá hơn 3 cấp cường hóa ở cấp thấp. Vì vậy lượng **không bao giờ** được mua ngọc cao hơn mức trung bình của dải (luật L2 ở 5.4). Mức tăng 1,65 ở cấp 30 cũng là tín hiệu cho 06 cân bằng xem lại bước nhảy giá trị ngọc cấp 2 → 3 (Câu hỏi mở 7).
- Mức trần thiết kế (≈ "+1 cường hóa cả bộ, thú mua sớm hơn") cho G 1,09-1,14: đạt trần ổn định 1,15.
- Khởi đầu: mức trần / người miễn phí có quà nhiệm vụ = 1,14 / 0,83 = **1,38** ở cấp 60 (≤ 1,40). Không có quà nhiệm vụ thì 1,14 / 0,72 = 1,58: vượt. Do đó `mon-spend-cap` phụ thuộc đề xuất 5.5.
- Ở chế độ `now` (số liệu cấp 120 hiện tại) +1 cường hóa ở cấp 60 cho G 1,24 (đường cường hóa hiện tại dốc ở bậc 6): cùng kết luận, chỉ chặt hơn; đã có trong `sim-paygap.now.out`.

### 5.3 Bùa Bảo Hộ là chìa khóa của cường hóa

Kỳ vọng mỗi món (thí nghiệm `upgrade-cost.js`, tỉ lệ `UPGRADE.rate`, rớt 1 cấp khi thất bại từ +4 nếu không có bùa; quy đá ra lượng theo 1 lượng = 5.000 xu):

| Bước | Tỉ lệ | Lần thử (có bùa) | Lần thử (không bùa, tính cả rớt cấp) | Lượng quy đổi cộng dồn (có bùa) |
|---|---:|---:|---:|---:|
| +8 → +9 | 35% | 2,9 | 20 | 41 |
| +10 → +11 | 22% | 4,5 | 200 | 119 |
| +11 → +12 | 16% | 6,3 | 1.056 | 207 |
| +12 → +13 | 12% | 8,3 | 7.751 | 357 |
| +13 → +14 | 9% | 11,1 | 78.383 | 734 |
| +15 → +16 | 4% | 25 | gần như không thể | 3.218 |

Không có bùa thì từ +12 trở lên gần như không thể; có bùa thì cả bộ 9 món lên +13 tốn khoảng 300 bùa (600 lượng) cộng đá. Người miễn phí vừa có 600 lượng sau 24 ngày; người nạp không trần có thể mua hết trong một ngày rồi đẩy +14, +15. Kết luận: **Bùa Bảo Hộ thuộc nhóm `boost`**, chịu Hạn mức Tu Luyện, và nguồn bùa miễn phí (vòng quay, Nhẫn Giả Lệnh, cửa hàng danh vọng, gia tộc) phải đủ cho đường cường hóa trung bình (06 cân bằng kiểm bằng `dev-sim-tools`).

### 5.4 Luật dữ liệu giữ trần (kiểm bằng `tools/check-data.js`, khối "Kiếm tiền")

| # | Luật | Hiện trạng |
|---|---|---|
| L1 | Mọi món có `priceLuong` có nhóm (`luongCat` ≠ null); món nhóm `look` có mọi chỉ số bằng 0 | mới |
| L2 | Gói (`type: 'bundle'`) và hàng lượng không chứa ngọc cấp > `gemAvg(gói.lv)` với `gemAvg(L) = min(L ≤ 120 ? 5 : 8, 1 + ⌊L/25⌋)` (cùng công thức hồ sơ trung bình); cẩm nang ngọc tính theo cấp ngọc trong bảng rơi | **`pack_gem` (cấp 60, Cẩm Nang Ngọc Tứ Phẩm = ngọc cấp 4) vi phạm**: `gemAvg(60) = 3` → đổi cấp gói thành 75 |
| L3 | Đá Thần (`stone4`) chỉ trong gói `life: 1` và gói có cấp ≥ 120 | `pack_upper` đạt |
| L4 | Không gói nào chứa `luong`, không gói lồng gói, mọi gói có dòng trong `SHOP_LIMITS` | `content/40` đã có, giữ |
| L5 | Món `gear` bán: grade ≤ 3; chỉ số trong mức chặn theo cấp (`content/60` 3.8 cho thú, `DESIGN_RULES` mục 9 cho thời trang) | đã có cho thời trang, thú cưỡi; thêm cho thú cưng |
| L6 | Mỗi ô (mask, cloak, costume, mount, pet) có ít nhất một món **không bán** có tổng chỉ số quy đổi ≥ món bán mạnh nhất cùng dải 30 cấp (người miễn phí luôn có đích cao hơn hàng bán) | mới |
| L7 | Gói nạp (`MONETIZE.topup.packs`): luật số ở 4.3; nội dung chỉ lượng + món nhóm `look` | mới |
| L8 | `MONETIZE.boostWeek` trong [175, 525] (1-3 tuần lượng của người vừa) | mới |

### 5.5 Đề xuất cho nhiệm vụ chính (phụ thuộc của `mon-spend-cap`)

Để khoảng cách khởi đầu ≤ 1,40, người miễn phí cần một bộ ngoại hình có chỉ số nhỏ sớm mà không phải tích lượng. Đề xuất cho `quest-main` (không sửa ở mục này, người giữ `src/shared/data/quests.js` thêm vào phần thưởng, đồ **khóa**): Thỏ Ngọc (`pet_bunny`) ở nhiệm vụ cấp 10, Mặt Nạ Hồ Ly cấp 12, Áo Choàng Phong Vân cấp 15, Ngựa Hồng Tông cấp 18, Y Phục Anh Đào cấp 20. Tổng giá trị 240 lượng, đúng nhịp "ngày đầu chơi". Đây cũng là bài học từ game tham khảo: người mới thấy mình đẹp lên ngay, không nghĩ "phải nạp mới có áo".

### 5.6 Đo sau khi ra mắt

| Chỉ số | Mục tiêu | Nguồn số |
|---|---|---|
| Người không nạp trong top 10 lôi đài tuần (mỗi khung) | ≥ 5/10 (01-tam-nhin) | `rank` + cờ `acc.pay.total > 0` |
| Lực chiến trung vị top 10 người nạp / top 10 người không nạp cùng khung cấp | ≤ 1,15 | `cmb-power-score` |
| Tỉ lệ người nạp chạm Hạn mức Tu Luyện tuần | ≤ 30% người nạp | `mon-luong-ledger` |
| Tỉ trọng doanh thu nhóm `look` + `util` + Kim Lệnh | ≥ 60% lượng tiêu từ lượng nạp | `mon-luong-ledger` |

Vượt mục tiêu 2 tuần liền: hạ `boostWeek` 50 lượng hoặc chuyển một món từ bán sang thưởng, ghi vào `DESIGN_RULES.md` mục 9; không đổi giá đã bán (không hoàn tiền vì đổi luật).

---

## 6. Chống lạm phát

### 6.1 Lượng

Lượng sinh ra từ hai vòi: **phát miễn phí** (mục 3.1) và **nạp**. Lượng mất khỏi nền kinh tế khi tiêu ở hệ thống (Kỳ Trân Các, mở rộng, Kim Lệnh, vòng quay, hồi sinh, tẩy điểm) và thuế 5% trên chợ. Lượng qua chợ chỉ đổi chủ.

| Chỉ số theo dõi (từ `meta.econ` của sổ cái) | Mục tiêu | Đòn bẩy khi lệch |
|---|---|---|
| Hút / phát (tổng 4 tuần, chưa tính nạp) | ≥ 0,85 | thêm 1 bộ ngoại hình cửa hàng, thêm mốc vòng quay; không giảm phát của sự kiện có lịch |
| Lượng tồn trung vị của nhân vật hoạt động | ≤ 30 ngày thu nhập (≤ 750 với hồ sơ vừa) | như trên |
| Lượng qua chợ / lượng phát mỗi tuần | ≤ 30% (ADR-05c-1) | thuế lượng 5% → 8% |
| Giá trung vị Đá Thần trên chợ bằng lượng | ổn định ±25% trong 4 tuần | thêm/giảm nguồn đá ở danh vọng và gia tộc |
| Lượng nhận/ngày trung vị, phân vị 90 | ≤ 40, ≤ 120 | giảm trần boss bản đồ |

### 6.2 Xu (phần liên quan kiếm tiền; mô hình đầy đủ ở `eco-economy-model`, 06)

- Mọi xu đi ra từ lượng là **xu khóa** (phần xu trong gói, giải xu của vòng quay lượng): chỉ tiêu ở NPC, nên người nạp không đổ xu lên chợ.
- Không quầy NPC đổi lượng → xu; không mua xu bằng tiền thật.
- Bán lại món mua bằng lượng cho NPC: ≤ 12 xu (`content/40` mục 8), không có vòng "lượng → món → xu" có lời.

### 6.3 Vật phẩm

- Món mua bằng lượng đều khóa (`eco-bound`), kể cả mua trên chợ bằng lượng (ADR-11-2): người nạp không thành "nguồn cung" đồ thường cho chợ.
- Gói có giới hạn lượt tuần hoặc một lần (`SHOP_LIMITS`); mọi nguồn có trần được ghi ở `DESIGN_RULES.md` mục 9.

---

## 7. Đặc tả hệ thống

### 7.1 `mon-luong-ledger` — Sổ cái lượng (P5 · Must · giai đoạn 3 · M)

**Mục đích**: hiện có 17 chỗ cộng/trừ `c.luong` rải ở 13 file (`core/combat.js`, `modules/{admin, arena×2, events, inventory×2, mail×2, pk, quest×2, season, shop, skills, wheel}`, `services/reward.js`), không kẹp trần, không ghi nguồn. Không có sổ cái thì không đo được mục 3.1, không áp được Hạn mức Tu Luyện, không đối soát được nạp tiền. Hệ thống này gom mọi thay đổi lượng về một API.

**Luồng người chơi**: không thấy gì mới, trừ dòng "Lượng nhận hôm nay: n" trong cửa sổ Nhân vật. Quản trị thấy báo cáo `/kinhte`.

**Quy tắc**:
- `services/luong.js` (mới, vùng Lõi server):
  - `gain(c, n, src)`: `n` nguyên dương, `src` thuộc `MONETIZE.src` (`quest, daily, dailies, checkin, wheel, chest, boss, event, worldboss, arena, tower, battlefield, season, mail, giftcode, title, admin, market, topup, card, refund`); `c.luong = min(luongMax, c.luong + n)`; cộng `c.lg.d` (nhận hôm nay theo nguồn miễn phí hay nạp); cộng `meta.econ[ngày].in[src]`.
  - `pay(c, n, sink, cat)`: trả `false` nếu `c.luong < n`, nếu `c.luongDebt > 0` (nợ do hoàn tiền, 7.4), hoặc nếu `cat === 'boost'` và vượt Hạn mức (7.2); ngược lại trừ, cộng `c.lg.b` (tuần), `meta.econ[ngày].out[sink]`. `sink` ∈ `shop, bag, store, pass, wheel, revive, reset, market, smith, transfer, skin, card`.
  - `Player.gainLuong(n, src)`, `Player.payLuong(n, sink, cat)`: bọc hai hàm trên + `markMe()`.
  - Người offline (thưởng tuần lôi đài, hộp thư Tà Thú, nạp tiền): gọi thẳng `gain(c, n, src)` trên dữ liệu từ `world.mail.charOf(tên)`.
- Thay 17 chỗ hiện có bằng API (ví dụ `combat.js:444` → `pl.gainLuong(luong, 'boss')`; `inventory/index.js:168` → `if (!p.payLuong(cost, 'bag', 'util')) return p.notice('Không đủ lượng.', 'warn')`). Sau khi xong: `grep -rnE "c\.luong\s*(\+|-)?=" src/server` chỉ còn trong `services/luong.js` và `sanitize`.
- Ghi sự kiện lớn vào nhật ký kiểm toán (`ops-audit-log`, `world.audit(kind, data)`; chưa có thì hàm rỗng cùng chữ ký, ghi chú cho agent 10): mọi `admin`, `topup`, `refund`, `market` ≥ 500 lượng, `gain` một lần ≥ 1.000 lượng.
- `meta.econ` giữ 90 ngày gần nhất; mỗi ngày `{ in: {src: n}, out: {sink: n}, act: số nhân vật có thay đổi, med: trung vị nhận }` (trung vị tính lúc qua ngày từ `c.lg` của nhân vật đã vào game trong ngày).

**Dữ liệu**: `src/shared/data/monetize.js` (mới): `MONETIZE = { luongMax: 1e9, vndPerLuong: 100, xuRef: 5000, src, sink, util, boostWeek: 350, gap: { steady: 1.15, early: 1.40 }, topup, card, starter }` (danh sách `src`/`sink` ở quy tắc trên, `util` ở mục 4.1, `topup` ở 7.4, `card` ở 7.5, `starter` ở 4.2), hàm thuần `luongCat(id, def)`, `weekKey(now)` (thứ Hai 00:00 giờ Việt Nam), `bundleValue(id)`. Trường nhân vật `c.lg = { d: 'YYYY-MM-DD', inF, inT, wk: 'YYYY-Www', b }`, `c.luongDebt` (mặc định 0); `sanitize` kẹp `c.luong` về `[0, luongMax]`, `c.lg` sai kiểu → mặc định.

**Gói { t }**: không gói mới; `me.lg = { inF, b, cap }` qua `selfData`.

**Module, cửa sổ, DOM**: `services/luong.js` (mới), `core/player.js` (2 phương thức), 13 file module ở trên (mỗi chỗ 1 dòng), `modules/admin` thêm `/kinhte [YYYY-MM-DD]` (in 3 dòng: tổng nhận theo nguồn, tổng tiêu theo nhóm, trung vị/phân vị 90). Cửa sổ `windows/character.js` thêm 1 dòng chữ. Không id DOM mới.

**Bố cục điện thoại**: một dòng chữ trong cửa sổ Nhân vật, không thêm nút.

**Chống gian lận, nhân bản**: kiểm đủ rồi mới trừ; `pay` là điểm duy nhất trừ lượng nên mọi trần áp một nơi; `src`/`sink` không thuộc danh sách → ném lỗi khi chạy kiểm thử (bắt lỗi lập trình), ghi `warn` khi chạy thật; ngày theo giờ máy chủ.

**Tiêu chí chấp nhận**:
1. `grep -rnE "c\.luong\s*(\+|-)?=" src/server` chỉ ra dòng trong `services/luong.js` và `sanitize`.
2. Kiểm thử đơn vị: `gain` kẹp ở 1e9; `pay` thiếu lượng → `false`, lượng không đổi; `pay` khi `luongDebt > 0` → `false`; `c.luong = -5` hoặc `'abc'` qua `sanitize` → 0.
3. Bot: hạ boss bản đồ hạng 1 → `meta.econ[hôm nay].in.boss` tăng 20; mua `charm` → `out.shop` tăng 2; `/kinhte` in đủ 3 dòng.
4. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` (mọi kiểm thử lượng cũ của quest, mail, arena, wheel, inventory vẫn đạt, không sửa kỳ vọng số).

**Kiểm thử**: `tests/features/monetize.js` (mới: `monetizeUnitTests()` + `async monetizeTest(ctx)`, gọi trong `tests/smoke.js`).

### 7.2 `mon-spend-cap` — Trần chênh lệch trả phí (P5, P3 · Must · giai đoạn 3 · M)

**Mục đích**: biến nguyên tắc N1 thành luật máy chủ chạy được và số kiểm được: lượng (dù kiếm hay nạp) chỉ rút ngắn thời gian tới mức người chơi chăm đạt được.

**Luồng người chơi**:
1. Mở Kỳ Trân Các: đầu tab "Gói ưu đãi" và "Tiện ích" có thanh **Hạn mức Tu Luyện tuần** `120/350 lượng · đặt lại thứ Hai 00:00`.
2. Mua món nhóm `boost` khi còn hạn mức: như cũ. Hết hạn mức: nút mua xám, chữ nhỏ "Đã đạt Hạn mức Tu Luyện tuần". Món `look`, `util`, `gear` vẫn mua bình thường.
3. Vòng quay lượng và mua trên chợ bằng lượng cũng hiện số hạn mức còn lại khi món thuộc nhóm `boost`.
4. Bấm biểu tượng "i" cạnh thanh: hộp giải thích 3 dòng (vì sao có hạn mức, nhóm nào tính, ngoại hình không giới hạn).

**Quy tắc, công thức**:
- `boostLeft(c) = MONETIZE.boostWeek − (c.lg.wk === weekKey() ? c.lg.b : 0)`; `payLuong(n, sink, 'boost')` từ chối khi `n > boostLeft`.
- Nhóm theo `luongCat` (mục 4.1). Gói tính bằng giá gói. Vòng quay lượng: `wheel` gọi `payLuong(2, 'wheel', 'boost')`. Chợ: tin `cur: 'luong'` có món `luongCat` = `boost` (hoặc món không có `priceLuong` nhưng thuộc loại `stone, gem, chest, frag, beastfrag, petfood, mountfood, food, scroll`) thì `payLuong(price, 'market', 'boost')`.
- Buff `exp2` cộng nối tối đa 240 phút (`modules/buffs`, 1 dòng): chặn dồn Bí Kíp không đáy.
- Luật dữ liệu L1-L8 (mục 5.4) trong `tools/check-data.js`.
- `tools/sim-paygap.js` (mới, vùng Hạ tầng kiểm thử, dùng thư viện mô phỏng chung của `dev-sim-tools`): dựng hồ sơ "miễn phí chăm", "miễn phí khởi đầu" và "nạp tối đa" ở cấp 30/60/90/120/160/199 cho 3 phái; "nạp tối đa" = chăm + quy đổi `boostWeek` lượng/tuần thành bùa/đá/ngọc theo bảng giá thật (`ITEMS`, `BUNDLES`, giới hạn lượt) qua mô phỏng 90 ngày (kỳ vọng số lần thử theo `UPGRADE.rate`, như `upgrade-cost.js`) + món `gear` bán đắt nhất trong dải. In bảng như 5.2; `--check` thoát mã 1 nếu G(d ≥ 30) > `gap.steady` hoặc G(d < 30) > `gap.early` ở bất kỳ cấp nào; `--json` in số cho CI.

**Dữ liệu**: `src/shared/data/monetize.js` (`boostWeek`, `gap`, `util`, `luongCat`), `src/shared/data/items/bundles.js` (`pack_gem` cấp 75 khi `mon-luong-shop` vào), `DESIGN_RULES.md` mục 9 thêm hàng "Kiếm tiền" (nhóm hàng, Hạn mức Tu Luyện 350/tuần, G ≤ 1,15 / 1,40, luật L1-L8).

**Gói { t }**: `me.lg.b`, `me.lg.cap` (đã có ở 7.1). `shop` thêm trường `cat` mỗi dòng hàng. Không hành động mới.

**Module, cửa sổ, DOM**: `services/luong.js` (kiểm hạn mức), `modules/shop`, `modules/wheel`, `modules/market` (khi có), `modules/buffs` (trần `exp2`); `windows/shop.js` (thanh hạn mức), `windows/wheel.js` (dòng còn lại); `tools/check-data.js`, `tools/sim-paygap.js`. DOM mới: `.cap-bar` (thanh), `[data-act=cap-info]` (nút "i", 44×44 trên điện thoại).

**Bố cục điện thoại**: thanh hạn mức cao 28px dính trên đầu danh sách hàng (không cuộn mất), nút "i" vùng chạm 44px; hộp giải thích dùng `ask()` một nút "Đã hiểu".

**Chống gian lận, nhân bản**:
- Đổi tuần theo giờ máy chủ; hạn mức theo nhân vật, kiểm trong `pay` (một chỗ).
- Né hạn mức bằng nhân vật phụ rồi chuyển đồ: món mua bằng lượng đều khóa (`eco-bound`, ADR-11-2), không chuyển được.
- Né bằng chợ: mua đồ tiến triển bằng lượng trên chợ tính vào hạn mức.

**Tiêu chí chấp nhận**:
1. Đơn vị: `boostWeek = 350`; mua 175 Bùa (350 lượng) đạt; Bùa thứ 176 → từ chối, lượng không đổi; đổi `c.lg.wk` sang tuần trước → mua lại được; mua mở rộng túi (`util`) và thời trang (`gear`) khi đã hết hạn mức → được.
2. Đơn vị: `luongCat` cho mọi id trong `SHOPS.potion.luong` không trả `null`; `exp2` dùng 10 cuốn liền → buff còn 240 phút.
3. `npm run check` không dòng lỗi và có khối "Kiếm tiền" với L1-L8; ca thử âm: `pack_gem` cấp 60 với `gem4` → báo lỗi L2.
4. `node tools/sim-paygap.js --check` thoát mã 0 ở chế độ `design`: G ổn định ≤ 1,15, G khởi đầu ≤ 1,40 ở cả 6 mốc cấp (phụ thuộc đề xuất quà nhiệm vụ 5.5).
5. Ảnh Kỳ Trân Các có thanh hạn mức, desktop 1280×720 và `mobile: true`, `OK no console errors`.

**Kiểm thử**: `tests/features/monetize.js` (đơn vị + bot `/luong 400`, mua 175 bùa, bùa 176 bị từ chối), `tools/sim-paygap.js --check` trong `npm run verify` (`dev-verify`).

### 7.3 `mon-luong-shop` — Quầy Kỳ Trân Các (P5, P2 · Should · giai đoạn 3 · M)

**Hiện trạng**: Tiệm Thuốc bày chung hàng xu và hàng lượng trong một danh sách (`modules/shop` `shopList`, `SHOPS.potion.luong`: Bí Kíp, Bùa, Thẻ Hồi Sinh, 5 thú cưng, Linh Thú Đan, 11 thời trang/thú cưỡi, sách đúng phái); mua bằng lượng trừ thẳng `p.c.luong`, không khóa món, không giới hạn lượt, không tab.

**Phần cần nâng** (đặc tả triển khai đầy đủ: `content/40-items-shops.md` mục 3.6, 4.9-4.11, 5.1, 7.1; ở đây chỉ ghi phần kiếm tiền thêm vào):

| # | Thêm | Lý do |
|---|---|---|
| K1 | Quầy "Kỳ Trân Các" (lượng) tách khỏi quầy "Tiệm Thuốc" (xu), 6 tab: Gói ưu đãi, Thời trang, Thú cưỡi, Thú cưng, Tiện ích, Sách | theo `content/40`; giữ |
| K2 | 9 gói `pack_*` giới hạn lượt (`c.shopLim`), `pack_gem` cấp **75** | luật L2 |
| K3 | Mọi lần trừ qua `payLuong(cost, 'shop', luongCat(id))` | sổ cái, hạn mức |
| K4 | Dòng "Giá trị quy đổi: N lượng" của gói do `bundleValue(id)` tính từ giá lẻ thật (`priceLuong`, đá theo `xuRef`); không có giá gạch ngang | N7 |
| K5 | Món ngẫu nhiên (rương trong gói, cẩm nang ngọc): bấm vào hiện bảng tỉ lệ `.odds` lấy từ `LOOT` qua `S.G` | N5 |
| K6 | Nhãn nhóm nhỏ trên mỗi ô hàng: "Ngoại hình", "Tiện ích", "Tu Luyện" (có thanh hạn mức), "Chỉ số" | minh bạch, P5 |
| K7 | Nút "Nạp lượng" ở chân quầy (`[data-act=topup-open]`) **chỉ hiện** khi `S.G.monetize.topup.on` | 1.0 không có nạp |

**Luồng người chơi**: Tiệm Thuốc → chọn quầy Kỳ Trân Các → tab → bấm hàng → chi tiết (giá, nhóm, giá trị quy đổi, tỉ lệ nếu ngẫu nhiên, "Mua bằng lượng: vật phẩm bị khóa") → "Mua" → `ask()` xác nhận nếu giá ≥ 50 lượng.

**Dữ liệu**: `items/bundles.js`, `items/shops.js` (`SHOP_TABS`, `SHOP_LIMITS`, `shopTab`), `monetize.js`.

**Gói { t }**: `shop { npc, title, q: 'xu'|'luong', tabs, items: [{ id, price, cur, tab, cat, lim?: { left, wk|life } }] }`; `buy { npc, id, qty, q }` (giữ chữ ký cũ, thêm `q`).

**Module, cửa sổ, DOM**: `modules/shop`, `windows/shop.js`, `css/features.css`; DOM mới: `[data-q=xu|luong]` (nút quầy), `[data-tab=goi|thoitrang|thucuoi|pet|tienich|sach]` (đúng quy ước `[data-tab]` cho kiểm thử), `.odds`, `.cap-bar` (7.2), `[data-act=topup-open]`.

**Bố cục điện thoại**: quầy là 2 nút đầu cửa sổ 44px; tab cuộn ngang; lưới hàng 3 cột ô 88px; chi tiết mở thành bảng dưới (không hộp nổi); nút Mua 44px dính chân.

**Chống gian lận, nhân bản**: giới hạn lượt kiểm và ghi **sau** khi trừ lượng thành công, trong cùng hàm; `cleanShopLim` chỉ giữ id có thật (`Object.hasOwn`); giá lấy từ `ITEMS` phía máy chủ, không từ gói; mở gói kiểm đủ ô trước khi bỏ gói.

**Tiêu chí chấp nhận**:
1. `tests/features/itemshop.js` (của `content/40`) đạt, thêm: mua `pack_week` lần 2 trong tuần → từ chối, lượng không đổi; món mua có `b === 1`.
2. `bundleValue('pack_exp') === 24` (4 Bí Kíp × 5 + 1 Trà Ngộ Đạo × 4).
3. Ảnh quầy Kỳ Trân Các 6 tab + bảng tỉ lệ cẩm nang ngọc, desktop + điện thoại, `OK no console errors`.
4. `npm run check` sạch (L2-L4).

**Kiểm thử**: `tests/features/itemshop.js`, `tests/features/monetize.js`.

### 7.4 `mon-topup` — Nạp tiền thật (P5, P2 · Could · giai đoạn 8 · L)

**Phạm vi**: giao diện, luồng, dữ liệu, bộ chuyển đổi nhà cung cấp, nhà cung cấp giả `mock` để kiểm thử. **Không** ký nhà cung cấp, không xin giấy phép (ADR-11-1, Câu hỏi mở 1-3). Mặc định `PAY_PROVIDER=off`: không tuyến HTTP, không nút, `S.G.monetize.topup.on = false`.

**Mục đích**: nguồn thu duy nhất của công ty, thiết kế sao cho không mất tiền của người chơi, không ghi có hai lần, không bị lợi dụng rửa tiền.

**Luồng người chơi**:
1. Mở "Nạp Lượng" từ nút ở Kỳ Trân Các hoặc bấm số lượng ở hàng tiền (`moneyLine`, khi bật).
2. Cửa sổ 4 tab: **Nạp** (lưới mệnh giá: giá đ, lượng gốc, thưởng, nhãn "Lần đầu ×2" nếu còn), **Gói** (Khai Môn nếu còn quyền, Thẻ Nguyệt Bổng), **Lịch sử** (20 đơn gần nhất), **Giới hạn** (trần tự đặt/tháng).
3. Bấm mệnh giá → `ask()`: "Nạp 50.000 đ nhận 1.030 lượng cho nhân vật <tên>. Lượng không quy đổi ngược ra tiền." → Đồng ý.
4. Máy chủ tạo đơn, trả đường dẫn thanh toán → máy khách mở **thẻ trình duyệt mới** (không khung nhúng) và hiện mã đơn + trạng thái "Đang chờ thanh toán" + đồng hồ 15 phút.
5. Thanh toán xong: nhà cung cấp gọi máy chủ → ghi có → máy khách nhận `topupDone`, toast "+1.030 lượng", tiếng `sfx('reward')`. Nếu người chơi đã thoát: lượng vẫn cộng vào nhân vật, kèm thư "Nạp thành công".
6. Đóng cửa sổ khi đang chờ: đơn vẫn sống; trạng thái xem lại ở tab Lịch sử.

**Quy tắc**:
- Trạng thái đơn: `new → paid → credited`; `new → expired` (15 phút, chỉ để ẩn khỏi giao diện); báo có tới cho đơn `expired` mà số tiền khớp → **vẫn ghi có** (N8). `credited → reversed` khi nhà cung cấp báo hoàn tiền/tranh chấp.
- Ghi có: lượng = gốc + thưởng (+ gốc nữa nếu lần đầu mệnh giá đó của tài khoản, ≤ 200.000 đ); `gain(c, n, 'topup')`; đặt `acc.pay.first[pack] = 1`, `acc.pay.total += vnd`; lưu **ngay** (`db.flush()`), chỉ trả 200 cho nhà cung cấp sau khi lưu xong.
- Lượng mới nạp **chờ 72 giờ mới dùng được trên chợ** (`c.lg.hold = [{ n, until }]`, tối đa 50 phần tử, gộp theo ngày): chặn thẻ ăn cắp → mua đồ của đồng bọn → hoàn tiền. Ở Kỳ Trân Các dùng ngay.
- Hoàn tiền: trừ lượng còn lại; thiếu thì `c.luongDebt = phần thiếu`, `payLuong` từ chối tới khi trả hết; khóa chợ của tài khoản; ghi kiểm toán; thông báo trong thư.
- Trần: mỗi tài khoản ≤ 2.000.000 đ/ngày (`MONETIZE.topup.dayMax`), trần tự đặt/tháng (`acc.pay.selfCap`, 0 = không đặt); giảm có hiệu lực ngay, tăng sau 72 giờ (`acc.pay.capAt`); tài khoản chưa xác thực theo yêu cầu pháp lý (ADR-11-1) không tạo được đơn.
- Một tài khoản tối đa 3 đơn `new` cùng lúc; `topupOrder` tối đa 1 lần/5 giây.
- Gói Khai Môn: `acc.pay.starter` chưa đặt và nhân vật cao nhất < 60. Thẻ Nguyệt Bổng: 7.5.

**Dữ liệu**: `MONETIZE.topup = { on: false (máy chủ tự bật theo PAY_PROVIDER), packs: [[id, vnd, luong, bonus, first]], dayMax, expireMin: 15, holdH: 72, maxOpen: 3 }`; `acc.pay = { total, first: {}, starter: 0, selfCap: 0, capAt: 0, month: 'YYYY-MM', monthVnd: 0, day: 'YYYY-MM-DD', dayVnd: 0 }` trong `accounts.json`; file mới `DATA_DIR/orders.json` (`{ id: { acc, char, pack, vnd, luong, st, at, txn, prov } }`, giữ 400 ngày, chỉ mục `txn` để chặn báo có lặp).

**Gói { t }**:

| Chiều | Gói | Trường |
|---|---|---|
| máy khách → máy chủ | `topupInfo` | |
| máy khách → máy chủ | `topupOrder` | `pack` (id trong `packs`) |
| máy khách → máy chủ | `topupHist` | |
| máy khách → máy chủ | `topupLimit` | `vnd` (0 hoặc 50.000-50.000.000) |
| máy chủ → máy khách | `topup` | `{ on, packs: [{ id, vnd, luong, bonus, first }], starter, card: { until, bank }, cap: { self, month, day }, open: [{ id, pack, exp }] }` |
| máy chủ → máy khách | `topupPay` | `{ order, vnd, url, exp }` |
| máy chủ → máy khách | `topupDone` | `{ order, luong, bonus, first }` |
| máy chủ → máy khách | `topupHist` | `{ list: [{ id, pack, vnd, luong, st, at }] }` |
| nhà cung cấp → máy chủ | `POST /api/pay/<provider>` | thân theo nhà cung cấp; bộ chuyển đổi trả `{ order, txn, vnd, ok, kind: 'paid'|'reversed' }` |

**Module, cửa sổ, DOM**: module mới `modules/topup` (`actions: topupInfo, topupOrder, topupHist, topupLimit`; móc `join` gửi `topupDone` cho đơn ghi có lúc offline chưa báo, `sanitize`, `selfData`, `clientData` gửi `monetize.topup` công khai); `services/pay/index.js` (bộ chuyển đổi: `create(order) → { url }`, `verify(req) → kết quả`), `services/pay/mock.js` (ký HMAC-SHA256 bằng `PAY_SECRET`, dùng `crypto` sẵn của Node), tuyến `POST /api/pay/:prov` trong `services/http.js` (chỉ khi `PAY_PROVIDER` khác `off`; giới hạn thân 8 KB; danh sách IP cho phép `PAY_IPS`); `services/db.js` thêm `orders`. Cửa sổ `windows/topup.js` (`renderTopup`), mục `topup` trong `refresh()`. DOM mới: `[data-tab=nap|goi|lichsu|gioihan]`, `.tp-pack[data-pack]`, `[data-act=tp-buy]`, `[data-act=tp-limit]`, `[data-act=topup-open]`.

**Bố cục điện thoại**: lưới mệnh giá 2 cột ô 160×96px; tab 44px; đơn đang chờ là dải dưới cùng có mã đơn (chữ to, chọn được để chép) và nút "Mở trang thanh toán" 44px; không bàn phím ảo trừ tab Giới hạn (ô số `inputmode=numeric`).

**Chống gian lận, nhân bản**:

| Nguy cơ | Chặn |
|---|---|
| Máy khách gửi số tiền/số lượng | không nhận: gói chỉ có `pack`, mọi số tra `MONETIZE` phía máy chủ |
| Giả báo có | chữ ký HMAC theo nhà cung cấp + danh sách IP + so số tiền với đơn; sai → 403, ghi kiểm toán |
| Báo có lặp (nhà cung cấp gửi lại) | chỉ mục `txn` và trạng thái đơn; lần 2 trả 200, không ghi có |
| Sập giữa ghi có và lưu | ghi có + đổi trạng thái + `flush` trong một lượt; trả 200 sau `flush`; nhà cung cấp gửi lại thì trạng thái đã `credited` |
| Thẻ ăn cắp rồi hoàn tiền | 72 giờ chờ chợ, nợ lượng, khóa chợ |
| Lần đầu ×2 nhiều lần bằng nhiều nhân vật | cờ `first` theo **tài khoản** |
| Chèn `__proto__` vào `pack` | tra bằng `Object.hasOwn` trên bảng không prototype |

**Tiêu chí chấp nhận** (chạy với `PAY_PROVIDER=mock PAY_SECRET=<chuỗi thử>`):
1. Đơn `n50` + báo có đúng chữ ký → `me.luong` tăng 1.030 (lần đầu), `acc.pay.first.n50 === 1`; đơn `n50` lần 2 → tăng 530.
2. Báo có sai chữ ký → HTTP 403, lượng không đổi; báo có lặp cùng `txn` → HTTP 200, lượng không đổi.
3. Nhân vật offline lúc báo có → vào game nhận `topupDone`, lượng đúng, có thư.
4. Báo hoàn tiền khi đã tiêu hết → `luongDebt > 0`, mua `charm` bị từ chối; dùng lượng trên chợ trong 72 giờ đầu bị từ chối.
5. `PAY_PROVIDER=off`: `topupOrder` → từ chối; `POST /api/pay/mock` → 404; ảnh Kỳ Trân Các không có nút nạp.
6. Ảnh 4 tab cửa sổ Nạp Lượng, desktop + điện thoại, `OK no console errors`.

**Kiểm thử**: `tests/features/topup.js` (mới; bot gọi `fetch` tới tuyến giả), `npm run test:e2e` thêm bước mở cửa sổ nạp khi `PAY_PROVIDER=mock`.

### 7.5 `mon-monthly-card` — Thẻ Nguyệt Bổng (P5 · Could · giai đoạn 8 · S)

**Mục đích**: gói giá trị cao, đều đặn cho người muốn ủng hộ trò chơi một khoản nhỏ mỗi tháng; chỉ lượng, không chỉ số, không EXP.

**Luồng người chơi**: Nạp Lượng → tab Gói → "Thẻ Nguyệt Bổng 30.000 đ" → thanh toán (luồng 7.4) → nhận 300 lượng ngay; từ hôm sau mỗi ngày bấm "Nhận 20 lượng" ở tab Gói hoặc chấm đỏ của `ui-notify-center`; cửa sổ Nhân vật có biểu tượng thẻ nhỏ và "còn 23 ngày".

**Quy tắc**: `c.card = { until: ms, last: 'YYYY-MM-DD', bank: 0..7 }`; mỗi 00:00 giờ Việt Nam khi còn hạn: `bank = min(7, bank + 1)` (tính lúc vào game theo số ngày đã qua); `cardClaim` trả `bank × 20` lượng qua `gain(c, n, 'card')`, đặt `bank = 0`. Mua thêm khi còn hạn: cộng nối 30 ngày, tối đa 60 ngày còn lại. Thẻ gắn với nhân vật được chọn lúc mua. Không bán bằng lượng.

**Dữ liệu**: `MONETIZE.card = { vnd: 30000, now: 300, daily: 20, days: 30, bankMax: 7, maxDays: 60 }`.

**Gói { t }**: `cardClaim` (máy khách → máy chủ); `topup.card { until, bank }`; `me.card { d (ngày còn), bank }`.

**Module, cửa sổ, DOM**: trong `modules/topup` (hành động `cardClaim`, móc `join` dồn ngày); `windows/topup.js` tab Gói; `windows/character.js` 1 dòng. DOM mới: `[data-act=card-claim]`.

**Bố cục điện thoại**: thẻ là một khối 100% ngang, nút "Nhận" 44px.

**Chống gian lận, nhân bản**: dồn ngày theo giờ máy chủ, kẹp 7; `cardClaim` đặt `bank = 0` trước khi cộng; đổi giờ máy khách vô tác dụng.

**Tiêu chí chấp nhận**: đơn vị: mua thẻ → +300; giả lập qua 3 ngày → `bank === 3`, nhận → +60, nhận lần 2 → +0; qua 10 ngày → `bank === 7`; mua thẻ thứ 3 khi còn 50 ngày → còn 60 ngày; hết hạn → `bank` không tăng.

**Kiểm thử**: `tests/features/topup.js`.

### 7.6 `pet-mount-skin` — Hoán Hình Thú Cưỡi (P1, P5 · Could · giai đoạn 6 · M)

**Mục đích**: hàng ngoại hình đáng giá nhất của thể loại là thú cưỡi, nhưng thú cưỡi ở đây có chỉ số. Hoán Hình cho người chơi cưỡi thú mạnh nhất mình có mà **hiển thị** hình khác: bán được ngoại hình mà không bán chỉ số (P5), và cho người miễn phí một đích sưu tầm qua lễ hội.

**Luồng người chơi**:
1. Mua "Hoán Hình: Mặc Lang Dạ Ảnh" (Kỳ Trân Các, tab Thú cưỡi, nhóm Ngoại hình) hoặc đổi token lễ hội lấy hoán hình lễ hội.
2. Dùng vật phẩm trong túi → mở khóa vĩnh viễn kiểu đó trong Tủ Ngoại Hình (tab mới "Thú cưỡi").
3. Tủ Ngoại Hình → tab Thú cưỡi → chọn kiểu → nhân vật đang cưỡi thú nào cũng hiện hình kiểu đó; chỉ số, tốc chạy vẫn của thú thật. Chọn "Theo thú đang cưỡi" để bỏ.

**Quy tắc**:
- Vật phẩm `mskin_<id>` `type: 'mountskin'`, `skin: '<look>'`, không chỉ số, `priceLuong` hoặc 0 (chỉ từ lễ hội).
- Bộ đầu (vẽ bằng code, đổi bảng màu khung thú có sẵn, `MOUNT_SKIN_PAL` trong `render/sprites/mount.js`): **Hồng Mã Kim Yên** (ngựa đỏ son `#b3261e`, yên vàng, 200 lượng), **Mặc Lang Dạ Ảnh** (sói đen than `#2b2a33`, mắt đỏ, 250 lượng), **Kim Hạc Lưu Vân** (hạc lông vàng nhạt, mào đỏ, 300 lượng), **Ngọc Hổ Băng Văn** (hổ lam băng sọc bạc, 400 lượng); lễ hội (đổi token, 0 lượng): **Lân Sư Nghênh Xuân** (Tết, khung sư tử Kim Sư, đỏ vàng), **Thỏ Ngọc Cung Trăng** (Trung Thu, khung hươu đổi tai, trắng ánh lam).
- Mỗi kiểu bán bằng lượng phải có ít nhất 1 kiểu lễ hội cùng độ hiếm hiển thị (P5): `check-data` đếm.
- Hiển thị: `lookOf(c)` đặt `out.mount = c.style.mount` khi đang cưỡi thú thật và kiểu đã mở khóa; độ cao yên (`mountOffset(look)`) theo kiểu hiển thị, máy chủ không dùng `look` cho vật lý nên di chuyển không đổi.

**Dữ liệu**: `src/shared/data/mountskins.js` (mới): `MOUNT_SKINS = [[id, tên, look gốc (khung vẽ), look mới, bảng màu, giá lượng, nguồn]]`; `items/consumables.js` dựng `mskin_*`; `pet-wardrobe` thêm `'mount'` vào `WARDROBE.slots` với điều kiện mở khóa riêng.

**Gói { t }**: dùng lại `styleSet { slot: 'mount', look }` của `pet-wardrobe`; `wardrobe.owned.mount`.

**Module, cửa sổ, DOM**: `modules/wardrobe` (mở rộng), `modules/inventory` (dùng `mountskin`), `core/player.js` `lookOf` (2 dòng); `windows/wardrobe.js` tab `[data-wtab=mount]`; `render/sprites/mount.js` (`MOUNT_SKIN_PAL`), `render/icons/fashion.js` (icon tự sinh từ khung thú + bảng màu).

**Bố cục điện thoại**: như Tủ Ngoại Hình (05 thú và ngoại hình 2.4): sân khấu xem trước nhân vật **đang cưỡi** tỉ lệ 2, lưới kiểu 4 cột ô 48px.

**Chống gian lận, nhân bản**: `look` phải là khóa riêng của `c.wardrobe.mount`; vật phẩm khóa (mua bằng lượng); bỏ qua slot lạ; dùng vật phẩm trừ trước khi mở khóa; kiểu đã có → từ chối, không trừ.

**Tiêu chí chấp nhận**:
1. Bot: dùng `mskin_maclang` → túi giảm 1, `wardrobe.owned.mount.maclang` có; cưỡi `mount_tiger` + `styleSet { slot: 'mount', look: 'maclang' }` → bot thứ hai thấy `look.mount === 'maclang'`, `me.s.spd` không đổi so với trước khi đặt kiểu.
2. Tháo thú cưỡi → `look.mount` không còn (không cưỡi "hình" mà không có thú).
3. `npm run check`: mọi `MOUNT_SKINS` có bảng màu vẽ được, không chỉ số; số kiểu lễ hội ≥ số kiểu bán.
4. Ảnh 6 kiểu đang chạy, desktop + điện thoại, `OK no console errors`; `npm run test:perf` giữ ≈ 60 khung (bảng màu dựng sẵn khung khi vào bản đồ).

**Kiểm thử**: `tests/features/wardrobe.js` (phần Thú cưỡi).

### 7.7 `mon-rmt` — Giao dịch tiền thật giữa người chơi (Won't)

**Quyết định**: không xây sàn, không cho phép, điều khoản sử dụng cấm mua bán tài khoản, nhân vật, vật phẩm, lượng bằng tiền thật. Lý do: chống P5 (người có tiền mua thẳng đồ Huyền thoại người khác cày), rủi ro pháp lý (quy đổi vật phẩm ảo ra tiền), rủi ro lừa đảo người chơi trẻ.

**Rào chắn đã có hoặc thuộc tính năng khác (ghi để không ai gỡ)**:

| Rào | Ở đâu |
|---|---|
| Giao dịch 1-1 không chuyển lượng; xu kẹp `[0, c.xu]` | `soc-trade` |
| Đồ khóa, đồ có hạn không giao dịch, không lên chợ | `eco-bound` |
| Chợ cấm mua của mình/cùng tài khoản; thuế 5%; giá trần lô 100.000 lượng | `eco-market`, ADR-05c-1 |
| Món mua bằng lượng trên chợ bị khóa với người mua; lượng nạp chờ 72 giờ mới lên chợ; mua đồ tiến triển bằng lượng trên chợ tính Hạn mức | ADR-11-2, 7.2, 7.4 |
| Nhật ký kiểm toán chợ ≥ 500 lượng; cờ cảnh báo khi một tài khoản nhận > 2.000 lượng/tuần từ chợ hoặc mua/bán lặp với cùng một tài khoản > 3 lần/tuần | `ops-audit-log`, `ops-gm-panel` |

**Tiêu chí chấp nhận** (giữ nguyên trạng "không làm"): `grep -rn "luong" src/server/modules/trade` rỗng; không có tuyến HTTP nào ngoài `/api/pay/:prov` nhận tiền.

---

## 8. Liên kết với tính năng đặc tả ở nơi khác

| id | Nơi đặc tả | Mục này chốt |
|---|---|---|
| `sig-nhangialenh` | 04 mục 12 | Kim Lệnh 300 lượng, nhóm `look`, không bán đ trực tiếp; `passBuy` trừ qua `payLuong(300, 'pass', 'look')` |
| `ui-bag-expand` | 05 trang bị (nhánh `feat/bag`, đã làm, chờ gộp; thư mục làm việc ngày 18/10/2026 đã chứa `INV_EXPAND` và `invExpand` chưa commit) | giá 50/100/150/200/300/400 giữ nguyên; khi gộp, `invExpand` đổi sang `payLuong(cost, 'bag', 'util')` (một dòng, theo 7.1) |
| `gear-storage-plus` | 05 trang bị mục 12 | 30/60/100/150 lượng, nhóm `util` |
| `pet-wardrobe` | 05 thú và ngoại hình 2.4 | 3 thuốc nhuộm 15 lượng nhóm `look`; thêm slot `mount` cho `pet-mount-skin` |
| `evt-login-rewards` | 05 PvE | vòng quay lượng ≤ 20 lượt/ngày, nhóm `boost`, bảng tỉ lệ `.odds` |
| `eco-market` | 05 xã hội mục 2.5, ADR-05c-1 | 3 rào của ADR-11-2 |
| `pve-boss-luongcap` | 05 PvE 2.2 | nguồn `boss` trong sổ cái; trần 60 là đòn bẩy đầu tiên khi lượng phát vượt rào |
| `dev-sim-tools`, `eco-economy-model` | 06 cân bằng | `tools/sim-paygap.js` dùng chung thư viện mô phỏng; số lượng mục 3.1 là đầu vào mô hình |
| `ops-audit-log`, `ops-account-security` | 10 vận hành | `world.audit(kind, data)`; xác thực tài khoản (số điện thoại) trước khi bật nạp |

---

## 9. Quyết định kiến trúc

### ADR-11-1 — Cổng nạp qua nhà cung cấp thanh toán ngoài

- **Bối cảnh**: kiến trúc hiện tại chỉ có HTTP tĩnh + WebSocket, lưu 4 file JSON, không gọi dịch vụ ngoài; `CLAUDE.md` cấm thêm thư viện npm khi không thật cần; `01-tam-nhin` Q1 để nạp tiền ngoài 1.0. Thu tiền thật cần: nhà cung cấp được cấp phép (ví điện tử, chuyển khoản QR qua trung gian, thẻ cào), tuyến nhận báo có, lưu đơn bền vững, và điều kiện pháp lý của trò chơi trực tuyến có thu phí tại Việt Nam (theo hiểu biết hiện tại: giấy phép trò chơi G1 và phê duyệt nội dung trước khi thu phí, xác thực tài khoản bằng số điện thoại, giới hạn thời gian chơi người dưới 18 tuổi, thanh toán qua tổ chức trung gian được cấp phép, vật phẩm ảo không quy đổi ra tiền; pháp chế phải xác nhận, Câu hỏi mở 1).
- **Quyết định**: (1) thêm bộ chuyển đổi `services/pay/` với giao diện `create(order)`, `verify(req)`, mỗi nhà cung cấp một file, chỉ dùng `crypto`/`https` sẵn của Node (không thư viện mới); (2) thêm tuyến `POST /api/pay/:prov` trong `services/http.js`, chỉ bật khi `PAY_PROVIDER` khác `off`; (3) thêm file `orders.json` vào lớp lưu (`services/db.js`), ghi ngay khi ghi có (không đợi chu kỳ lưu 30 giây); (4) biến môi trường `PAY_PROVIDER`, `PAY_SECRET`, `PAY_IPS`, `PAY_RETURN_URL`; (5) máy khách mở trang thanh toán ở thẻ mới, không nhúng, không tải tài nguyên ngoài vào trang game (giữ quy tắc "không CDN"); (6) nhà cung cấp `mock` cho kiểm thử, luôn có.
- **Phương án khác**: (a) dịch vụ thanh toán tách riêng (tiến trình khác) gửi lệnh ghi có qua WebSocket quản trị: tách biệt tốt nhưng thêm một tiến trình phải vận hành, nhiều điểm hỏng hơn với đội nhỏ; (b) bán mã nạp qua đại lý bên ngoài, người chơi nhập như giftcode: không cần tuyến HTTP nhưng chiết khấu đại lý cao, dễ bị lộ mã, khó hoàn tiền; (c) chỉ nhận chuyển khoản tay, quản trị cộng bằng `/mail`: rẻ nhất nhưng chậm, sai sót, không mở rộng được, vi phạm N8 khi quản trị quên.
- **Chi phí**: khoảng 4-6 ngày công lõi + 2 ngày kiểm thử cho bộ chuyển đổi, tuyến, đơn, giao diện, `mock`; mỗi nhà cung cấp thật thêm 1-2 ngày; phí giao dịch 1-3% (ví, QR) hoặc chiết khấu thẻ cào cao hơn nhiều (Câu hỏi mở 2); chi phí pháp lý và giấy phép ngoài kỹ thuật; rà lại giấy phép âm thanh tự tạo trước khi thu phí (ADR-01-1).
- **Hệ quả**: lớp lưu có thêm một file phải sao lưu cùng lượt (`ops-backup`, `ops-persist-shard` phải biết); `services/http.js` có tuyến POST đầu tiên (giới hạn thân, IP, chữ ký); kiểm thử cần biến môi trường riêng; tài liệu `DEPLOY.md` thêm mục biến thanh toán; `CLAUDE.md` thêm dòng "Nạp tiền" ở phần kiến trúc khi tính năng được làm.

### ADR-11-2 — Lượng là một loại; chợ bằng lượng giữ lại kèm 3 rào

- **Bối cảnh**: ADR-05c-1 giữ lượng làm tiền tệ trên Chợ Ký Gửi và yêu cầu ADR của `mon-topup` xét lại, mặc định đề xuất "lượng nạp là lượng khóa, không lên chợ". Đề bài mục này chốt 3 loại tiền (xu, xu khóa, lượng).
- **Quyết định**: **không** tách "lượng khóa". Lượng nạp và lượng kiếm là một. Chợ bằng lượng giữ, thêm 3 rào: (R1) món mua trên chợ bằng lượng **bị khóa** với người mua (`bind(it)` lúc giao); (R2) mua món tiến triển trên chợ bằng lượng tính vào Hạn mức Tu Luyện tuần (7.2); (R3) lượng nạp chờ 72 giờ mới dùng được trên chợ (7.4). Giữ nguyên các rào của ADR-05c-1 (thuế 5%, cấm cùng tài khoản, nhật ký).
- **Phương án khác**: (a) lượng khóa cho lượng nạp (mặc định của ADR-05c-1): người nạp không mua được đồ người miễn phí cày, người miễn phí mất nguồn lượng lớn nhất từ thị trường, thêm loại tiền thứ tư phải giải thích; (b) chợ chỉ bằng xu: an toàn nhất nhưng người bận không mua được đồ bằng lượng kiếm được; (c) giữ nguyên ADR-05c-1 không rào: người nạp mua ngọc cấp cao không giới hạn trên chợ, G vượt 1,5 (mục 5.2).
- **Chi phí**: R1 một dòng ở `market` (gọi `bind`), R2 dùng `payLuong` của 7.1, R3 trường `c.lg.hold` + kiểm ở `mkBuy`; thêm 3 ca kiểm thử.
- **Hệ quả**: người miễn phí bán đồ cày được cho người nạp lấy lượng (vòng tuần hoàn quen thuộc của thể loại), người nạp không bán lại được món đã mua (chặn rửa tiền, chặn đầu cơ), trần G giữ được; `eco-market` thêm 3 tiêu chí chấp nhận (ghi ở sổ tính năng mục này dưới `depends`, người giữ `eco-market` thêm vào kiểm thử của mình).

---

## 10. Mô hình doanh thu tham khảo (giả định để thử độ nhạy, không phải cam kết)

| Giả định | Thấp | Giữa | Cao |
|---|---:|---:|---:|
| Người chơi hoạt động mỗi tháng (MAU) | 2.000 | 4.000 | 8.000 |
| Tỉ lệ người nạp trong tháng | 2% | 4% | 6% |
| Doanh thu trung bình mỗi người nạp/tháng (ARPPU) | 60.000 đ | 120.000 đ | 200.000 đ |
| **Doanh thu gộp/tháng** | **2.400.000 đ** | **19.200.000 đ** | **96.000.000 đ** |
| Phí thanh toán (2% ví/QR) | 48.000 đ | 384.000 đ | 1.920.000 đ |
| Máy chủ (1 tiến trình, mục tiêu 300 người online, VPS hiện có) | ≈ 1.000.000 đ | ≈ 1.500.000 đ | ≈ 3.000.000 đ (2 máy) |

Ý nghĩa cho thiết kế: doanh thu chủ yếu đến từ **số người chơi ở lại** (MAU) chứ không từ ép người nạp chi nhiều, nên ưu tiên giữ chân (P2, P4) và niềm tin (P5) đúng với hướng tự bỏ vốn, không có áp lực doanh thu quý của nhà phát hành. ARPPU giữa (120.000 đ) ≈ một Thẻ Nguyệt Bổng + một Kim Lệnh + một mệnh giá 50.000 đ mỗi tháng: không cần người chi lớn. Chỉ số theo dõi khi bật nạp: tỉ lệ nạp, ARPPU, tỉ trọng doanh thu theo nhóm (mục 5.6), tỉ lệ hoàn tiền (< 0,5%).

---

## 11. Thứ tự làm và phụ thuộc

| Bước | id | Giai đoạn | Phụ thuộc | Ghi chú |
|---|---|---|---|---|
| 1 | `mon-luong-ledger` | 3 | `eco-bound` (cùng lô sửa các module trả tiền), `ops-commit-restructure` | worker opencode làm thay 17 chỗ theo danh sách 7.1, Claude rà |
| 2 | `mon-luong-shop` | 3 | `mon-luong-ledger`, `eco-bound`, `eco-shop-tabs` | theo `content/40` + K1-K7 |
| 3 | `mon-spend-cap` | 3 | `mon-luong-ledger`, `mon-luong-shop`, `dev-sim-tools`, `quest-main` (đề xuất 5.5) | Claude làm (kinh tế), công cụ `sim-paygap` có thể giao worker sau khi chốt mô hình |
| 4 | `pet-mount-skin` | 6 | `pet-wardrobe`, `pet-beasts`, `mon-luong-ledger` | |
| 5 | `mon-topup` | 8 | ADR-11-1 duyệt, `mon-luong-ledger`, `mon-spend-cap`, `ops-audit-log`, `ops-account-security`, `ops-backup` | chỉ bật sau pháp chế |
| 6 | `mon-monthly-card` | 8 | `mon-topup` | |
| — | `mon-rmt` | 8 | | Won't, giữ rào |

Tính năng Must (`mon-luong-ledger`, `mon-spend-cap`) không phụ thuộc tính năng Should/Could của mục này. `mon-spend-cap` phụ thuộc `mon-luong-shop` (Should) chỉ ở phần `pack_gem`: nếu Kỳ Trân Các trễ thì luật L2 vẫn kiểm được trên dữ liệu hiện có (chưa có gói nào), hạn mức vẫn áp cho Bùa/Bí Kíp đang bán.

---

## 12. Câu hỏi mở

Mỗi câu có phương án mặc định; đặc tả ở trên đã viết theo phương án mặc định, đổi thì chỉ sửa dữ liệu (`monetize.js`) hoặc một quy tắc nêu rõ.

| # | Câu hỏi | Mặc định đang dùng | Ảnh hưởng nếu đổi |
|---|---|---|---|
| 1 | Điều kiện pháp lý để thu phí (giấy phép G1, phê duyệt nội dung, xác thực số điện thoại, giới hạn giờ chơi người dưới 18 tuổi, trung gian thanh toán được cấp phép) cụ thể là gì với công ty? | Không bật nạp ở 1.0; `PAY_PROVIDER=off`; bật chỉ khi pháp chế xác nhận bằng văn bản và ADR-11-1 được duyệt | thêm bước xác thực ở `core-account`, giới hạn giờ chơi ở `ops-account-security` |
| 2 | Nhà cung cấp thanh toán đầu tiên: ví điện tử/chuyển khoản QR hay thẻ cào? | ví điện tử + chuyển khoản QR qua một trung gian (phí ≈ 1-3%); thẻ cào để sau vì chiết khấu cao và rủi ro thẻ gian | thêm một file bộ chuyển đổi, mệnh giá theo nhà mạng |
| 3 | Tỉ giá 100 đ = 1 lượng? | có | đổi `vndPerLuong`; mọi giá lượng giữ nguyên, chỉ bảng 4.3 đổi |
| 4 | Hạn mức Tu Luyện 350 lượng/tuần/nhân vật (bằng lượng tuần của người miễn phí chăm)? | 350 | giảm: doanh thu nhóm `boost` giảm, G giảm; tăng quá 525 bị `check-data` chặn |
| 5 | Trần G: 1,15 ổn định, 1,40 khởi đầu? | đúng như vậy | đổi `MONETIZE.gap`, chạy lại `sim-paygap --check`, cập nhật `DESIGN_RULES` mục 9 |
| 6 | Nhiệm vụ chính tặng bộ thời trang Tốt + Thỏ Ngọc (đề xuất 5.5) để giữ G khởi đầu ≤ 1,40? | có, đồ khóa, cấp 10-20 | không tặng: phải hạ trần khởi đầu xuống bằng cách giảm giá thời trang Tốt, hoặc chấp nhận G khởi đầu ≈ 1,58 |
| 7 | Bước nhảy giá trị ngọc ở cấp thấp (ngọc +1 cấp cho G 1,65 ở cấp 30) có phải giảm ở 06 cân bằng không? | chuyển câu hỏi cho 06 (`cmb-balance`); mục này chỉ chặn lượng mua ngọc trên mức trung bình (L2) | nếu 06 làm phẳng đường ngọc, có thể nới L2 thêm 1 cấp |
| 8 | Món mua trên chợ bằng lượng bị khóa (ADR-11-2 R1)? | có | không khóa: phải bỏ R1, mở đường rửa lượng → xu; cần ADR mới |
| 9 | Thẻ Nguyệt Bổng: 30.000 đ, 300 ngay + 20/ngày, tích tối đa 7 ngày? | đúng như vậy | đổi `MONETIZE.card`; `daily` không được vượt lượng/ngày của người vừa (26) |
| 10 | Có bán dịch vụ đổi tên nhân vật, đổi phái bằng lượng ở 1.0 không? | không ở 1.0 (đổi tên đụng gia tộc, bạn bè, xếp hạng; đổi phái đụng cân bằng) | thêm id mới nhóm `util`, cần đặc tả riêng |
| 11 | Lượng đã phát trước khi có sổ cái (dữ liệu cũ, có thể lớn do boss chưa có trần) có thu hồi không? | không thu hồi; chỉ kẹp trần 1e9, bắt đầu đếm từ ngày gộp | thu hồi gây mất niềm tin, chống P5 |
| 12 | Gói Khai Môn hiện tới khi nhân vật cao nhất < 60 hay theo thời gian tạo tài khoản? | theo cấp (< 60), không đếm ngược | theo thời gian sẽ tạo áp lực "mua ngay", trái N6 |
