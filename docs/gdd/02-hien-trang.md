# GDD 02 — Hiện trạng

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 2: hiện trạng mã nguồn, số liệu thực, kết quả kiểm chứng, nợ kỹ thuật, rủi ro và việc đang dở |
| Ngày | 18/10/2026 |
| Trạng thái đọc | thư mục làm việc `/Users/danhtrongit/game/Ninja-School` (nhánh `main`), gồm cả phần **đang stage chưa commit**. Commit gần nhất trên `main`: `8fac3bb` |
| Nguồn | kiểm kê `gddwork/audit-data.md`, `gddwork/audit-systems.md`, `gddwork/audit-risk.md` (chiều 18/10/2026), đọc lại mã `src/`, chạy lại công cụ đếm và kiểm tra (mục 1.3) |
| Công cụ, log | `gddwork/lab/count.js` (chỉ đọc repo), kết quả mới `gddwork/lab/m02/count-now.json`, log `gddwork/lab/m02/check.log`, `gddwork/lab/m02/test.log`; đo tải `gddwork/lab/persist-bench.js`, `shard-bench.js` |
| Liên quan | `01-tam-nhin.md` (trụ cột, MoSCoW, id), `10-ky-thuat-van-hanh.md` (đặc tả các việc `ops-*`, `dev-*` nêu ở mục 6), các mục `05-*` (đặc tả phần cần nâng của từng hệ thống) |

Quy tắc đọc: mục này **mô tả cái đang có**, không thiết kế lại hệ thống. Mỗi hệ thống ghi id trong sổ tính năng và trụ cột phục vụ (P1 Hồn ninja Việt · P2 Chạm là chơi · P3 Đi cảnh có tay nghề · P4 Giang hồ có bạn · P5 Công bằng và đường dài). Phần "cần nâng" chỉ trỏ tới id xử lý; đặc tả đầy đủ nằm ở mục GDD sở hữu id đó. Đường dẫn rút gọn theo `CLAUDE.md`: `modules/` = `src/server/modules/`, `windows/` = `src/client/js/ui/windows/`, `features/` = `tests/features/`.

---

## 0. Tóm tắt một trang

| # | Kết luận | Bằng chứng | Mức |
|---|---|---|---|
| 1 | Vòng chơi cấp 1-120 **khép kín và chạy ổn**: 29 module server, 70 hành động, 23 cửa sổ, 6 phái, 65 quái (14 boss), 25 bản đồ, 51 nhiệm vụ chính, 306 vật phẩm | đếm lại bằng `count.js` (mục 2) | — |
| 2 | Kiểm chứng tự động **đạt** trên thư mục làm việc hiện tại | `npm run check` in `✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng`; `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` (376 ✔, 0 ✘, 188 giây) (mục 3) | — |
| 3 | Nội dung còn **xa sàn 1.0**: cấp 120/199, bản đồ 25/80, nhiệm vụ chính 51/120, thú cưỡi 5/20, thú cưng 6/25, lễ hội 1/7 | mục 2.1 | Cao (khối lượng) |
| 4 | Lưu trữ là rủi ro **nghiêm trọng** nhất: file JSON hỏng thì máy chủ chạy với bảng rỗng rồi ghi đè file thật sau 30 giây; ghi toàn bộ dữ liệu 2-4 lần/phút trên luồng chính; sao lưu cùng ổ bị xoay mất sau 12 lần khởi động | `services/db.js` dòng 21-28, 30-35, 38-55 (mục 6.1) | Nghiêm trọng |
| 5 | Băng thông gói `state` tăng theo bình phương số người trên một bản đồ: 300 người một bãi ≈ 27 MB/s; chưa có kênh bản đồ | đo `gddwork/lab/shard-bench.js`, `persist-bench.js` (mục 6.3) | Cao khi có boss thế giới |
| 6 | **Toàn bộ đợt tái cấu trúc chưa commit**: 216 file, +35.962/−16.930 dòng, nay đã gồm cả nội dung `feat/bag` và `feat/audio` cùng bản đồ import (import map) phục vụ tĩnh. Production dựng từ `git archive` nên chưa triển khai được | `git diff --cached --shortstat`, mục 7 | Cao |
| 7 | 13 đặc tả đợt 3 đã duyệt và 7 tài liệu nội dung cấp 120-199 đã viết, **chưa có dòng mã nào** | mục 7.4, 7.5 | — |
| 8 | Lỗ kiểm thử: 17 hành động (cộng nhánh `revive` về làng và 3 thao tác NPC Tiểu Nhị) không có kiểm thử bot nào, nặng nhất là gia tộc (7/8 hành động) và nhiệm vụ hằng ngày Tiểu Nhị (nguồn tiền hằng ngày) | `grep` trong `tests/` (mục 5.2) | Cao |
| 9 | Việc đầu tiên phải làm (giai đoạn 0): commit tái cấu trúc → `ops-db-safe-load` → `ops-backup` → `dev-test-coverage` → `ops-persist-shard` → `ops-crash-guard` | mục 7.7 | — |

---

## 1. Phạm vi, nguồn và cách đo

### 1.1 Đã đọc

| Hạng mục | Đã đọc |
|---|---|
| Lõi server | `src/server/core/*.js`, `src/server/services/*.js`, `src/server/index.js` |
| Module | 29 module `src/server/modules/*/index.js`, thứ tự theo `modules/index.js` |
| Client | `ui/ui.js`, 23 cửa sổ `ui/windows/*.js`, `game/game.js`, `game/pathfind.js`, `core/*.js`, `main.js`, lướt `render/**` |
| Dữ liệu | `src/shared/constants.js`, `src/shared/formulas.js`, `src/shared/data/**` (đếm bằng script, không ghi) |
| Kiểm thử | `tests/smoke.js`, `tests/lib/*`, 18 file `tests/features/*`, 3 file `tests/e2e/*`, `tools/check-data.js`, `tools/shot.js`, `tools/sync-audio.js` |
| Git | `git status`, `git diff --cached`, nhánh `feat/bag`, `feat/audio`, `snap/bag-base`, `checkpoint/truoc-tai-cau-truc`, `checkpoint/sau-tai-cau-truc` |
| Tài liệu sẵn có | `NOTE.md`, đặc tả đợt 3 `scratchpad/specs/*.md` + `PLAN.md`, thiết kế nội dung `scratchpad/content/00-60*.md` |

### 1.2 Thang mức hoàn thiện

| Mức | Nghĩa |
|---|---|
| **Đủ** | Vòng chơi khép kín (server + giao diện + lưu dữ liệu), có kiểm thử, dùng tốt trong phạm vi cấp 1-120 |
| **Một phần** | Chạy được nhưng thiếu chiều sâu hoặc nội dung so với đích 1.0, hoặc thiếu kiểm thử ở nhánh xử lý chính |
| **Sơ khai** | Chỉ có khung tối thiểu, chưa có luật chơi riêng |
| **Chưa commit** | Có trong thư mục làm việc (đã stage), chưa vào lịch sử `main` |
| **Chưa có** | Không có mã; có thể đã có đặc tả |

Trạng thái trong sổ tính năng: `done` chỉ khi có trong mã thư mục làm việc **và** đạt mọi tiêu chí chấp nhận; theo định nghĩa "xong" ở `01-tam-nhin.md` mục 5.2, việc chưa gộp vào `main` (gồm `ui-bag-*`, `ui-ask-dialog`, `snd-audio-files`) vẫn là `todo`.

### 1.3 Thay đổi so với kiểm kê buổi chiều

Kiểm kê `audit-*.md` chạy lúc khoảng 15:45; khi viết mục này (khoảng 16:30) thư mục làm việc đã thay đổi. Đã chạy lại `count.js` và so khớp từng khóa:

| Chỉ số | Kiểm kê | Hiện tại | Lý do |
|---|---:|---:|---|
| Module server | 28 | **29** | thêm `modules/audio` (từ `feat/audio`) |
| Hành động client → server | 68 | **70** | thêm `discardMany`, `invExpand` (từ `feat/bag`) |
| File kiểm thử `tests/**/*.js` | 23 | **25** | thêm `features/inventory.js`, `features/audio.js` |
| Lời gọi `ok(` tĩnh | 430 | **445** | +7 hành trang, +8 âm thanh |
| Công cụ `tools/` | 2 | **3** | thêm `tools/sync-audio.js` |
| Dòng JS server / client / CSS / shared | 6.902 / 25.330 / 2.601 / 1.331 | **7.003 / 25.704 / 2.638 / 1.381** | như trên |
| Mọi số liệu nội dung (vật phẩm, quái, bản đồ, nhiệm vụ, kỹ năng, thú, lễ hội) | | **không đổi** | 16 khóa khác nhau, đều thuộc nhóm `code.*` |

Kết luận: nội dung hai nhánh `feat/bag` và `feat/audio` **đã được đưa vào thư mục làm việc** (đang stage). So với đầu nhánh `feat/audio`, phần stage chỉ khác 4 file: `services/http.js` (+bản đồ import và `modulepreload`, lưu đệm theo băm nội dung), `CLAUDE.md` (+1 dòng giải thích), `DEPLOY.md` (hướng dẫn pm2 mới, khuyên HTTP/2), `tests/e2e/e2e.js`. Không có thay đổi chưa stage nào trong `src/`.

---

## 2. Số liệu thực

### 2.1 So với sàn bản 1.0

| Hạng mục sàn | Sàn 1.0 | Hiện có | Thiếu | Thiết kế bù đã viết | Id xử lý |
|---|---|---|---|---|---|
| Cấp tối đa | 199 | **120** (`MAX_LEVEL`, `constants.js` dòng 4) | 79 cấp | `content/00-foundation.md`: đường EXP mới, giữ nguyên từng số ≤ 120 | `core-levelcap-199`, `cmb-balance-upper` |
| Bản đồ | ≥ 80 | **25** (3 làng, 19 bãi, Đấu Trường, Lôi Đài, Hang Động Thử Thách) | ≥ 55 | `content/10-world.md`: 92 bản đồ không phải phó bản (23 cũ + 21 Hạ Giới + 48 Thượng Giới) | `world-lower-fill`, `world-region-*` (8 vùng), `world-towns`, `world-upper` |
| Nhiệm vụ chính | ≥ 120 | **51** (cấp 1 → 118) | ≥ 69 | `content/30-quests.md`: 73 nhiệm vụ mới, tổng 124 | `quest-main-199`, `quest-main-gap` |
| Thú cưỡi | ≥ 20 | **5** | ≥ 15 | `content/60-mounts-pets.md` | `pet-beasts` |
| Thú cưng | ≥ 25 | **6** | ≥ 19 | như trên | `pet-beasts` |
| Lễ hội | 7 | **1** (`trangram2026`, ứng với Trung Thu) | 6 | `content/50-worldboss-events.md`, `content/40-items-shops.md` | `evt-tet`, `evt-valentine`, `evt-304`, `evt-he`, `evt-trungthu`, `evt-halloween`, `evt-noel` |
| Tính năng đặc sắc M/S | ≥ 10 | 10 đang chạy: Lôi đài Elo, Tà Thú, phó bản sóng quái, ngọc khảm, thú cưng có cấp, hộp thư + giftcode, lễ hội theo mùa, tự tìm đường liên bản đồ, 3 bộ thanh kỹ năng, ngày/đêm giờ Việt Nam | 0 về số, thiếu về chiều sâu | `04-dac-sac.md` chốt danh sách | `sig-hopkich`, `sig-thanhan`, `sig-meridian`, `pvp-battlefield`, `clan-war` |

### 2.2 Nội dung chi tiết

| Nhóm | Số liệu | Nguồn dữ liệu |
|---|---|---|
| Phái, hệ | 6 phái (Kiếm, Tiêu = Hỏa; Kunai, Cung = Thủy; Đao, Quạt = Phong), khắc vòng Hỏa → Phong → Thủy → Hỏa, ×1,15 khi khắc, ×0,9 khi bị khắc | `data/classes.js`, `core/combat.js` |
| Kỹ năng | 60 (mỗi phái 1 đánh thường + 6 chủ động + 3 nội tại); cấp học cao nhất 60; cấp kỹ năng tối đa 15; 10 chỉ số nội tại; 10 kiểu hiệu ứng `fx.k` | `data/skills.js` |
| Vật phẩm | 306: trang bị 190 (168 chiến đấu, 6 thú cưng, 16 thời trang/thú cưỡi), ngọc 60, sách 18, nhiệm vụ 14, bình 8, đá 4, đồ ăn 3, thức ăn thú 3, cuộn 2, linh tinh 2, rương 1, token lễ hội 1 | `data/items/*` |
| Bậc trang bị | 12 bậc (Gỗ cấp 1 → Thánh cấp 110), lỗ khảm 1/2/3; 5 độ hiếm, bể 11 dòng phụ | `items/base.js`, `items/equipment.js` |
| Cường hóa | +1 → +16, tỉ lệ 100% → 4%, 4 loại đá, phí `(plus+1)²·400·(tier+1)` xu, từ +4 thất bại tụt 1 cấp trừ khi có Bùa Bảo Hộ | `items/base.js` (`UPGRADE`), `modules/smith` |
| Ngọc khảm | 6 loại × 10 cấp, ghép 3 → 1 tỉ lệ 100% → 25% | `items/gems.js` |
| Quái | 65 loại: 51 quái thường cấp 1-120 (11 kiểu hình), 11 boss bản đồ (cấp 12-125), 3 Tà Thú (32/60/95); 37 chiêu boss | `data/monsters.js` |
| Bản đồ | 25; 23 theme; 45 cổng, không có cổng một chiều; 28 NPC đặt trên bản đồ, 10 loại NPC; rộng 640-2200 px | `data/maps.js` |
| Dải mỏng | bãi theo cấp quái cao nhất: 1-20: 6 · 21-40: 4 · **41-60: 2** · 61-80: 3 · **81-100: 1** · 101-120: 3 | `data/maps.js` |
| Nhiệm vụ | 51 chính tuyến (kill 25, collect 14, visit 4, upgrade 3, level 2, dungeon 2, talk 1), khoảng trống lớn nhất cấp 84 → 95; hằng ngày Tiểu Nhị 20 lượt/ngày một kiểu "diệt N quái" | `data/quests.js`, `modules/quest` |
| Thú | 6 thú cưng (cấp thú 1-50, 2 kỹ năng thú), 5 thú cưỡi (+15% → +35% tốc chạy), thời trang 11 mẫu (mặt nạ 3, áo choàng 4, y phục 4) | `data/pets.js`, `items/fashion.js` |
| Định kỳ | điểm danh 7 ngày; vòng quay 11 ô; Tà Thú mỗi 2 giờ phút 30; Giờ Vàng 12-13h, 20-22h (nằm cứng trong `core/world.js` dòng 13); 1 mùa lễ hội; 3 giftcode cố định; hộp thư 30 thư × 6 món, giữ 30 ngày | `data/extras.js`, `core/world.js` |
| Lôi đài | cấp 20, Elo 1000, K = 32, 5 giây chuẩn bị + 3 phút, 3 trận tính điểm/cặp/ngày, thưởng tuần 4 mốc | `data/extras.js` (`ARENA`) |
| Hằng số khác | túi 40 ô (mở rộng tới 100 ô bằng `INV_EXPAND` 6 lần × 10 ô, giá 50-400 lượng), kho 60 ô, 3 bộ × 6 ô kỹ năng, nhóm 6 người, gia tộc 10 cấp (25 → 70 chỗ), PK từ cấp 10, sát thương PvP ×0,45 | `constants.js`, module tương ứng |

Đường EXP hiện tại `expNeed(lv) = 20·lv² + 80·lv`: tổng tới cấp 120 là 11.947.600; nếu giữ nguyên công thức thì tổng tới 199 chỉ gấp 4,5 lần trong khi EXP quái tăng tuyến tính, quá phẳng cho 79 cấp hậu kỳ. `content/00-foundation.md` đã chọn đường mới cho > 120 (`core-levelcap-199`).

### 2.3 Mã nguồn và kiểm thử

| Mục | Số |
|---|---:|
| Module server (`modules/*`, đều có trong `modules/index.js`) | 29 |
| Hành động client → server | 70 (+ 6 gói sảnh) |
| Cửa sổ client (`windows/*.js`) | 23 |
| File JS server / client / shared, file CSS | 45 / 84 / 19 / 8 |
| Dòng JS server / client / CSS / shared | 7.003 / 25.704 / 2.638 / 1.381 |
| File lớn nhất | `game/game.js` 1.826 dòng, `ui/ui.js` 984, `core/player.js` 701, `core/combat.js` 582 |
| File kiểm thử | 25 (18 `features/`, 3 `e2e/`, 3 `lib/`, `smoke.js`) |
| Lời gọi `ok(` tĩnh | 445 (`features/` 375, `e2e/` 67, còn lại 3) |
| Công cụ | `tools/check-data.js`, `tools/shot.js`, `tools/sync-audio.js` |

---

## 3. Kết quả kiểm chứng

### 3.1 Lệnh bắt buộc

Chạy trên thư mục làm việc ngày 18/10/2026, dữ liệu tạm của `npm test` đặt trong `gddwork/lab/m02/tmp` (qua `TMPDIR`) để không ghi vào repo.

| Lệnh | Dòng cuối | ✔ | ✘ | Thời gian | Mã thoát | Log |
|---|---|---:|---:|---:|---:|---|
| `npm run check` | `✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng` | 1 | 0 | 0,2 giây | 0 | `lab/m02/check.log` |
| `npm test` (16:21 → 16:24) | `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` | 376 | 0 | 188 giây | 0 | `lab/m02/test.log` |
| `npm test` (kiểm kê buổi chiều, trước khi có `feat/bag` + `feat/audio`) | `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` | 361 | 0 | 183 giây | 0 | `lab/test1.log` |

### 3.2 Các phần của `npm test`

| Nhóm | Phần | Hệ thống được kiểm |
|---|---|---|
| Thế giới giả, không cần server | 0 → 0g + 2 phần đơn vị mới | công thức nội tại; chiêu boss + Tà Thú; dọn boss khi túi đầy; ngọc; thú cưng; hộp thư/giftcode/lễ hội; lôi đài (Elo, tuần, ghép cặp); **số ô hành trang theo lần mở rộng**; **danh sách file âm thanh và bảng gắn** |
| Bot WebSocket thật | 1 → 9 | đăng ký, nhiệm vụ, cổng + chiến đấu, admin + kỹ năng + cường hóa, nhiều người chơi, hoạt động hằng ngày + phó bản, hậu kỳ cấp 120, nội tại, kiểm tra độ cao, Tà Thú, thời trang, ngọc, thú cưng, hộp thư, lôi đài, **hành trang mở rộng + hủy nhiều món**, **HTTP phục vụ âm thanh (Range)**, lưu và tải lại dữ liệu |

### 3.3 Chưa chạy trong đợt này

| Lệnh | Vì sao chưa chạy | Lần chạy được biết gần nhất | Mặc định |
|---|---|---|---|
| `npm run test:e2e` (desktop + `MOBILE=1`) | cần server riêng có `ACC` trong `ADMINS` và Playwright ngoài `dependencies`; agent khác đang sửa lỗi cuối trên cùng thư mục | chạy tay trong đợt tái cấu trúc | chạy cả hai chế độ trước khi commit tái cấu trúc (`ops-commit-restructure`) |
| `npm run test:ui` | cần 2 trình duyệt và server `ADMINS=duoalpha,duobravo` | như trên | như trên |
| `npm run test:perf` | cần trình duyệt thật | như trên | chạy lại sau khi gộp `feat/audio` vì `game.js`, `core/sound.js` đổi |
| `tools/shot.js` | không đổi client trong mục này | — | chụp 1280×720 + điện thoại trước khi commit |

CI (`.github/workflows/ci.yml`) chỉ chạy `npm run check` + `npm test`; không có kiểm thử trình duyệt tự động (`dev-ci-browser`).

---

## 4. Hệ thống đã có

Cột **Kiểm thử**: `f/x` = `tests/features/x.js`; **E2E** = `tests/e2e/e2e.js`; **UI2** = `tests/e2e/ui-multiplayer.js`; **PERF** = `tests/e2e/perf.js`; **chk** = `tools/check-data.js`. Cột **Cần nâng → id** liệt kê phần còn thiếu và id sẽ xử lý; GĐ là giai đoạn ROADMAP của phần cần nâng.

### 4.0 Nền kiến trúc

| Id | Thành phần | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `core-modules` | Cổng WebSocket `/ws` (gói ≤ 16 KB, ≤ 80 gói/giây/kết nối, ping 30 giây), bảng hành động không prototype (trùng tên dừng khởi động), 5 móc tĩnh + 14 móc thế giới, gói `data` dựng một lần | P5 | `core/gateway.js`, `router.js`, `modules.js`, `gamedata.js` | Đủ | mọi phần `npm test` | gói vượt tần suất bị bỏ im lặng → `ops-anticheat`; gói `data` 119 KB không nén mỗi lần kết nối → `ops-data-http`; không kiểm `bufferedAmount` → `ops-state-culling` | 4, 5, 7 |
| `core-save` | JSON toàn bộ trong RAM, ghi file tạm rồi đổi tên, sao lưu 12 bản, mật khẩu `scrypt`, token 30 ngày | P5 | `services/db.js`, `core/world.js` | Một phần | f/persistence (24) | đọc hỏng chạy rỗng, không fsync, ghi toàn bộ đồng bộ, sao lưu cùng ổ → `ops-db-safe-load`, `ops-persist-shard`, `ops-backup`, `ops-crash-guard` | 0 |
| `core-restructure` | Bố cục `src/` (lõi, module, client chia vùng, `tests/features`) | P5 | đã stage, chưa commit | Chưa commit | `npm test`, `npm run check` đạt | commit + gộp nhánh → `ops-commit-restructure` | 0 |
| `dev-test-harness` | `npm test` (bot), `npm run check`, `tools/shot.js`, `test:ui/e2e/perf` | P5 | `tests/**`, `tools/**` | Đủ | — | lệnh kiểm chứng một chạm + đếm sàn → `dev-verify`; CI trình duyệt → `dev-ci-browser`; hành động thiếu kiểm thử → `dev-test-coverage` | 0, 7 |
| `ops-admin-cmd` | 19 lệnh chat `/lv /item /hethan /plus /thu /xu /luong /tp /boss /bosshp /event /all /kick /mobs /mail /code /sukien /arena` | P5 | `modules/admin` | Đủ cho kiểm thử | mọi phần kiểm thử | không nhật ký → `ops-audit-log`; không tra cứu người offline, khóa tài khoản → `ops-gm-panel` | 3, 8 |
| `ui-title` | Màn mở đầu, `GET /api/status` (`online, accounts, version`) hiện ở `#server-status` | P1, P2 | `main.js`, `services/http.js` | Đủ | E2E | trạng thái chi tiết cho vận hành → `ops-monitoring` | 8 |

### 4.1 Tài khoản, nhân vật

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `core-account` | Tài khoản | P5, P2 | đăng ký (tên 4-16, mật khẩu 6-64, 10 tài khoản/giờ/IP), đăng nhập mật khẩu hoặc token, khóa 1 phút sau 8 lần sai/IP, đá phiên trùng | Đủ | f/account, f/persistence | đổi mật khẩu, mật khẩu cấp 2 → `ops-account-security`; token lưu nguyên văn → `ops-anticheat`; `scryptSync` chặn luồng ~30 ms → `ops-crash-guard` | 0, 4, 8 |
| `core-characters` | Nhân vật | P2 | 6 phái × 2 giới, tối đa 3/tài khoản, xóa phải gõ lại tên, tóc theo băm tên | Đủ | f/account, f/mail | chọn tóc/màu, đổi tên → `char-create-custom` | 1 |

### 4.2 Thế giới, di chuyển

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `world-movement` | Di chuyển, nhảy đôi, xuống bục; server kiểm tốc chạy và độ cao nhảy (`JUMP/JUMP2/GRAV`), đo ping | P3, P5 | `modules/movement`, `game/game.js` | Đủ | f/movement, f/combat, E2E | khinh công → `cmb-khinhcong` | 5 |
| `world-base` | 25 bản đồ, cổng hai chiều, cửa giữa bản đồ, bãi sinh bằng `genField` | P1, P2 | `data/maps.js` | Một phần | f/combat, f/account, chk | thêm bản đồ → `world-lower-fill`, `world-region-*`; làng tham số hóa → `world-towns`; bố cục viết tay → `world-layout` | 2 |
| `world-teleport` | NPC dịch chuyển giữa 3 làng (miễn phí dưới cấp 20, sau đó 300 xu) | P2 | NPC `tele` | Đủ | f/social, E2E | về trạm theo bản đồ, Phu Xe → `world-home` | 2 |
| `world-worldmap` | Bản đồ thế giới, tự tìm đường liên bản đồ (phím T, nút "Đi tới"), nhảy bục tự động | P2 | `ui/worldmap.js`, `windows/map.js`, `game/pathfind.js` (chỉ client) | Đủ | E2E (đi xa, hủy, đổi làng, điện thoại) | nhiều tờ Thượng Giới → `world-upper` | 2 |
| `art-maps` | 23 theme, ngày/đêm theo giờ Việt Nam, hạt môi trường, rung màn hình | P1 | `render/maprender.js` + `map/` | Đủ (hình ảnh) | ảnh chụp, PERF | theme mới → `art-themes-new`; thời tiết có tác động → `sig-thoitiet` | 2, 6 |

### 4.3 Chiến đấu, phát triển nhân vật

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `core-levelcap-199` | Cấp độ và EXP | P5 | `20·lv² + 80·lv`, mỗi cấp +5 tiềm năng +1 điểm kỹ năng, báo toàn máy chủ mỗi 10 cấp, **trần 120** | Một phần | f/combat, f/endgame | cấp 121-199, đường EXP mới (chính là id này) | 2 |
| `cmb-classes` | 6 phái, 3 hệ khắc vòng, 3 làng | P1, P3 | `data/classes.js` | Đủ | f/account | Thức Tỉnh phái → `sig-thuctinh` | 5 |
| `cmb-skills` | 6 kỹ năng chủ động/phái (6 kiểu `single, aoe, line, dash, buff, heal`), cấp tối đa 15; 3 bộ × 6 ô thanh kỹ năng | P3 | `modules/skills`, `core/combat.js`, `windows/skills.js` | Một phần | f/skills (11, gồm chặn `sid` độc hại), E2E | kỹ năng sau cấp 60 → `cmb-clone`, `cmb-skills-199`; trạng thái (chỉ có làm chậm) → `cmb-status` | 1 |
| `cmb-passive` | 3 nội tại/phái học bằng sách, 10 chỉ số | P3, P5 | `modules/skills` móc `stats` | Đủ | f/passive (34), chk | nội tại hậu kỳ → `cmb-skills-199` | 1 |
| `cmb-potential` | 4 tiềm năng, tẩy điểm 20 lượng | P3 | `skills.addStat/resetStats` | Đủ (chưa kiểm thử tẩy) | f/skills (`addStat`) | kiểm thử `resetStats` → `dev-test-coverage` | 0 |
| `cmb-stats` | `recalc()` qua móc `stats`; trần chí mạng 60%, né 45%, kháng 50%, tốc chạy 60% + thú cưỡi; hồi phục tự nhiên | P3, P5 | `core/player.js` | Đủ | f/passive, f/gems, f/pets | lực chiến tổng hợp → `cmb-power-score`; Kinh Mạch → `sig-meridian` | 4, 5 |
| `cmb-buffs` | Buff kỹ năng, 4 buff lưu khi thoát | P3 | `modules/buffs` | Đủ | f/endgame, f/passive | — | — |
| `cmb-auto` | Tự đánh (F), tự uống thuốc, tự nhặt, săn đúng quái nhiệm vụ (chỉ client) | P2 | `game/game.js` | Đủ | E2E, PERF | cài đặt tự đánh lưu server → `ui-settings-sync` | 7 |
| `cmb-death-revive` | Tử trận mất 1-5% EXP, hồi sinh tại chỗ (1 lượng / Thẻ Hồi Sinh) hoặc về làng | P3, P5 | `core/combat.js`, `modules/pk` | Đủ | f/boss (tại chỗ) | kiểm thử về làng → `dev-test-coverage`; hồi sinh theo trạm → `world-home` | 0, 2 |
| `cmb-monster-ai` | Đi tuần, chủ động, kéo về chỗ (3,5 giây, hồi 30%), đánh xa, bay, làm chậm | P3 | `core/monster.js` | Một phần | f/combat, PERF | quái tinh anh có kỹ năng → `cmb-elite-mobs`; cân bằng → `cmb-balance` | 1, 2 |
| `art-monsters` | 11 kiểu hình quái vẽ bằng code, biến thể boss | P1 | `render/monsterart.js` + `monster/` | Đủ | chk, PERF | quái 121-199 → `art-monsters-199` | 2 |
| `pve-boss-field` | 11 boss bản đồ, 2-3 chiêu niệm có cảnh báo vùng, cuồng nộ dưới 30%, triệu hồi, chia EXP theo sát thương, top 3 nhận lượng | P3, P4 | `core/monster.js`, `core/combat.js`, `game.js onBossCast/onBossHit` | Đủ | f/boss (39), chk, E2E | cân bằng theo người chơi trung bình → `cmb-balance`, `dev-balance-tool` | 1 |
| `cmb-loot` | Rơi đồ: quyền nhặt 15 giây, mất sau 60 giây, nhặt tay (Z) hoặc tự nhặt | P4, P5 | `core/map.js`, `movement.pickup` | Đủ (nhặt tay chưa kiểm thử) | f/combat, f/pets | luật chia đồ trong nhóm → `soc-party-plus`; kiểm thử `pickup` → `dev-test-coverage` | 0, 4 |
| `art-fx` | Hiệu ứng kỹ năng, chữ sát thương, rung, hiệu ứng rèn/khảm, lấp lánh thời trang | P1, P3 | `render/fx.js` + `fx/` | Đủ | ảnh chụp, PERF | hit-stop → `art-hitstop`; vệt vũ khí → `art-weapon-trail` | 1 |
| `char-ninja` | Nhân vật chibi pixel và NPC vẽ bằng code, 12 bậc áo | P1 | `render/sprites.js` + `sprites/` | Đủ | ảnh chụp | hình bậc 12-19 → `char-tier-outfit` | 1 |

### 4.4 Vật phẩm, trang bị, kinh tế

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `gear-inventory` | Hành trang 40 ô: dùng, mặc, hủy, sắp xếp gộp chồng | P2 | `modules/inventory`, `windows/inventory.js` | Đủ | f/quest, f/fashion, f/passive, f/endgame | mở rộng + chia trang → `ui-bag-expand`; hủy nhiều món → `ui-bag-bulkdrop` (cả hai **chưa commit**, mục 7.2) | 0 |
| `gear-equipment` | 9 ô × 12 bậc, vũ khí riêng phái, 5 độ hiếm | P3, P5 | `items/equipment.js` | Một phần | f/quest, f/endgame | bậc 12-19 → `gear-tier-199`; đồ khóa → `eco-bound`; so sánh khi trỏ → `ui-item-compare` | 1, 3 |
| `gear-upgrade` | Cường hóa +16, báo toàn máy chủ từ +10 | P5 | `modules/smith`, `windows/smith.js` | Đủ | f/skills, f/fashion, UI2 | ghép đá, tách cường hóa (`NOTE.md`) → `gear-smith-plus`; chuyển cấp → `gear-upgrade-transfer` | 3 |
| `gear-gems` | Khảm/gỡ/ghép ngọc | P5 | `modules/gems` | Đủ | f/gems (45), chk, E2E | — | — |
| `gear-storage` | Thủ kho 60 ô | P2, P5 | `modules/storage` | Đủ | f/daily, f/pets | cất xu, mở rộng, kho chung → `gear-storage-plus` | 3 |
| `gear-chest` | Rương Báu ngẫu nhiên | P5 | `inventory.openChest` | Đủ | gián tiếp | bảng rơi dữ liệu, tỉ lệ công khai → `eco-loot-tables` | 3 |
| `eco-currency` | Xu (trần 2 tỉ), lượng | P5 | `core/player.js` | Một phần | gián tiếp | xu khóa → `eco-bound`; nguồn/hút → `eco-economy-model`; trần trả phí → `mon-spend-cap` | 1, 3 |
| `eco-shop-npc` | Tiệm Thuốc (14 món xu + 39 món lượng), Lò Rèn (trang bị bậc 0-3, đá, ngọc cấp 1), bán đồ lấy xu | P2, P5 | `modules/shop`, `windows/shop.js` | Đủ | f/quest, f/passive, f/gems, f/pets | chia tab → `eco-shop-tabs`; hàng hậu kỳ → `eco-consumables-199` | 2, 3 |

### 4.5 Thời trang, thú cưỡi, thú cưng

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `pet-fashion` | 3 ô thời trang có chỉ số, bản có hạn 7 ngày tự gỡ, không cường hóa, không giao dịch bản có hạn | P1 | `modules/fashion` | Một phần (11 mẫu) | f/fashion (22) | mẫu theo lễ hội → `evt-*`; tủ ngoại hình → `pet-wardrobe` | 6 |
| `pet-mount` | 5 thú cưỡi, tốc chạy ngoài trần 60% | P1, P2 | ô `mount`, `render/sprites/mount.js` | Một phần (5/20) | f/fashion, E2E | 20 loài → `pet-beasts`; nuôi, tiến hóa, pháp bảo → `pet-mountup` | 5 |
| `pet-pets` | 6 thú cưng, cấp 1-50, thân mật, đói thì dỗi, 2 kỹ năng | P1, P4 | `modules/pets`, `windows/pet.js` | Một phần (6/25) | f/pets (32), chk, E2E | 25 loài, 8 kỹ năng → `pet-beasts` | 5 |

### 4.6 Nhiệm vụ, PvE, sự kiện

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `quest-main` | 51 nhiệm vụ chính, 7 kiểu, thưởng vũ khí đúng phái | P1, P2 | `modules/quest` (NPC `elder`), `windows/quest.js`, `#hud-quest` | Một phần | f/quest (chỉ nhiệm vụ 1), chk, E2E | 73 nhiệm vụ 120-199 → `quest-main-199`; khoảng trống 84-95 → `quest-main-gap`; cốt truyện → `quest-lore` | 2 |
| `quest-daily-task` | Tiểu Nhị: diệt N quái hợp cấp, 20 lượt/ngày, mỗi 5 lượt +1 Rương Báu | P2, P5 | NPC `task` | Một phần, **không có kiểm thử bot** | — | kiểm thử → `dev-test-coverage`; nhiều kiểu việc → `quest-dailies` | 0, 3 |
| `evt-checkin` | Điểm danh 7 ngày, Vòng Quay 11 ô | P2 | `modules/checkin`, `modules/wheel` | Đủ | f/daily, chk | lịch tháng, giới hạn lượt → `evt-login-rewards` | 6 |
| `pve-dungeon` | Hang Động Thử Thách: nhóm, cấp 10, 3 lượt/ngày, 5 đợt + boss, 10 phút | P3, P4 | `modules/dungeon` | Một phần (1 phó bản) | f/daily (vào, đợt 1, trừ lượt) | hang theo cấp + độ khó → `pve-caves`; nhiều ải → `pve-dungeon-multi` | 2, 5 |
| `pve-tathu` | Tà Thú mỗi 2 giờ phút 30, báo trước 5 phút, 20 phút, thưởng theo hạng sát thương, túi đầy gửi thư | P4 | `modules/events`, `windows/event.js` | Đủ | f/boss (39), E2E | cấp 130/160/190 → `pve-tathu-199`; boss thế giới theo giờ → `pve-worldboss` | 6 |
| `evt-season-core` | Khung lễ hội: rơi token, Sứ Giả đổi quà có giới hạn, tự bật theo ngày | P1, P4 | `modules/season`, `windows/season.js` | Đủ (khung) | f/mail, E2E | 6 lễ còn lại + mùa 2027 → `evt-tet`, `evt-valentine`, `evt-304`, `evt-he`, `evt-halloween`, `evt-noel`, `evt-trungthu` | 6 |
| `evt-calendar` | Giờ Vàng ×2 EXP 12-13h, 20-22h | P2, P4 | `core/world.js` dòng 13 (hằng số cứng) | Sơ khai, không kiểm thử | — | đưa vào dữ liệu, thêm cuối tuần, cửa sổ lịch → chính id này | 6 |

### 4.7 Xã hội

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `soc-chat` | 5 kênh (bản đồ, thế giới cấp 5 + 8 giây/tin, nhóm, gia tộc, mật), lệnh `/w /p /g /a /online /moi /gd /td /xem /help` | P4 | `modules/chat`, `#hud-chat` | Đủ | f/social | chặn, lọc từ, báo cáo → `soc-chat-safety` | 4 |
| `soc-invites` | Lời mời 5 loại hạn 30 giây, menu người chơi | P4 | `modules/invites`, `windows/dialog.js` | Đủ (`decline` chưa kiểm thử) | các test xã hội, UI2 | kiểm thử `decline` → `dev-test-coverage` | 0 |
| `soc-friends` | Bạn bè ≤ 50, chỉ kết khi online, báo online/offline | P4 | `modules/friends` | Đủ (xóa, danh sách chưa kiểm thử) | f/daily | kẻ thù → `soc-titles`; kiểm thử → `dev-test-coverage` | 0, 4 |
| `soc-party` | Nhóm 6, EXP +12%/thành viên cùng bản đồ, HUD nhóm | P4 | `modules/party` | Đủ (rời, mời ra chưa kiểm thử) | f/social, f/daily, UI2 | tìm nhóm, chia đồ → `soc-party-plus` | 4 |
| `soc-trade` | Giao dịch 1-1 ≤ 250 px, cấp 5, ≤ 10 món + xu, khóa rồi xác nhận, so khớp món lúc chốt, cấm đồ có hạn, cấm trên lôi đài | P4, P5 | `modules/trade` | Đủ | f/social, f/fashion, f/gems, f/pets, f/arena, UI2 | nhật ký giao dịch → `ops-audit-log`; đồ khóa → `eco-bound` | 1, 3 |
| `soc-mail` | Hộp thư 30 thư, quà cho người offline; giftcode dùng một lần theo tài khoản | P5 | `modules/mail` | Đủ | f/mail (59), f/persistence, chk, E2E | kiểm thử `mailRead` → `dev-test-coverage` | 0 |
| `soc-rank` | BXH cấp, gia tộc, diệt quái, lôi đài | P4 | `modules/rank`, `windows/rank.js` | Đủ | f/arena | lực chiến, PK, thú cưng → `cmb-power-score` | 4 |
| `soc-inspect` | Xem trang bị, chỉ số người **đang online** | P4 | `rank.inspect`, `windows/inspect.js` | Một phần, không kiểm thử | — | người offline, thú, thời trang → chính id này | 4 |
| `clan-core` | Lập tộc cấp 15 + 50.000 xu, 3 chức, nhường chức tự động, góp quỹ lên cấp 1-10, +1% EXP/cấp | P4 | `modules/clan`, `windows/clan.js` | Một phần, **7/8 hành động không kiểm thử** | f/passive (lập + góp) | kiểm thử `features/clan.js` → `dev-test-coverage`; nhiệm vụ tộc, Tộc Địa, chiến gia tộc → `clan-war` | 0, 4 |

### 4.8 PvP

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `pvp-pk` | Bật PK từ cấp 10, cấm trong làng, cùng nhóm/tộc không đánh nhau, điểm hiếu chiến, mất 5% EXP khi chết; chế độ PK không lưu khi thoát (chủ ý) | P3, P4 | `modules/pk`, `core/combat.canPvp` | Một phần, không kiểm thử bot | — | kiểm thử → `dev-test-coverage`; tên đỏ, truy nã → `pvp-freezone` | 0, 4 |
| `pvp-duel` | Thách đấu 1-1 cùng bản đồ, thua còn 1 máu, không mất EXP | P3, P4 | `modules/pk` | Đủ | f/arena, UI2 | — | — |
| `pvp-freezone` | Đấu Trường: bản đồ `pvp: true` từ cấp 10, không luật, không thưởng | P3, P4 | `data/maps.js` | Sơ khai | — | giờ mở, thưởng, truy nã → chính id này | 4 |
| `pvp-arena` | Lôi đài Elo 1-1, ghép theo cửa sổ Elo, cấm vật phẩm và hồi máu, thưởng tuần qua thư | P3, P4 | `modules/arena`, `windows/arena.js`, `#hud-arena` | Đủ | f/arena (47), E2E | đấu đội 3v3 → `pvp-arena-3v3`; cân bằng phái → `cmb-pvp-balance` | 4, 6 |

### 4.9 Giao diện, âm thanh

| Id | Hệ thống | Trụ cột | Hiện trạng | Mức | Kiểm thử | Cần nâng → id | GĐ |
|---|---|---|---|---|---|---|---|
| `ui-hud` | HUD máu/chakra/EXP, mục tiêu, buff, nhiệm vụ, bản đồ nhỏ, biểu ngữ sự kiện/lôi đài/phó bản, menu 16 nút, thông báo | P2 | `ui/ui.js`, `css/hud.css` | Đủ | E2E | trung tâm nhắc việc → `ui-notify-center` | 7 |
| `ui-windows` | Khung cửa sổ + 23 cửa sổ | P2, P1 | `ui/ui.js`, `windows/*` | Đủ | E2E (một phần) | rà điện thoại mọi cửa sổ mới → `ui-mobile-pass` | 7 |
| `ui-touch` | D-pad, cụm kỹ năng, nút AUTO, gợi ý xoay ngang | P2 | `core/input.js`, `css/touch.css` | Đủ | E2E `MOBILE=1` | tùy chỉnh vị trí nút → `ui-settings-sync` | 7 |
| `ui-settings` | Tự uống HP/MP theo %, phạm vi tìm quái, tự nhặt, hiện tên, âm thanh, ngày/đêm 3 mức, rung; lưu `localStorage` | P2 | `windows/settings.js`, `core/store.js` | Đủ | gián tiếp | `c.settings` có sẵn trên server nhưng không dùng → `ui-settings-sync` | 7 |
| `ui-ask-dialog` | Hộp xác nhận tự làm `ask()` thay `confirm()` | P1, P2 | `windows/dialog.js` | **Chưa commit** | E2E gián tiếp | commit → `ops-commit-restructure` | 0 |
| `snd-audio-files` | Nhạc nền theo theme/tình huống, tiếng kỹ năng theo kỹ năng và `fx.k`, WebAudio tổng hợp dự phòng, 2 thanh âm lượng | P1 | `modules/audio`, `data/audio.js`, `core/sound.js`, `tools/sync-audio.js` | **Chưa commit**; thư mục `src/client/audio/` **chưa tồn tại** nên mọi máy đang dùng tiếng tổng hợp | f/audio (8) | chốt ADR-01-1, đưa file + `CREDITS.md` vào nơi tái lập được → chính id này; nhạc lễ hội, theme mới → `snd-content-199` | 7 |

### 4.10 Hệ thống chưa có nhưng đã có đặc tả

| Id | Hệ thống | Đặc tả | Lô đợt 3 | GĐ |
|---|---|---|---|---|
| `eco-bound` | Xu khóa, vật phẩm khóa | `specs/bound.md` | 1 | 1 |
| `cmb-balance`, `dev-balance-tool` | Cân bằng boss/Tà Thú/quái, `tools/balance.js` | `specs/balance.md` | 1 | 1 |
| `cmb-status` | Trạng thái theo hệ | `specs/status.md` | 2 | 1 |
| `pve-caves` | Thí Luyện Động | `specs/dungeons.md` | 2 | 2 |
| `eco-market` | Chợ Ký Gửi | `specs/market.md` | 2 | 3 |
| `gear-crafting` | Chế tác ở Thợ Rèn | `specs/crafting.md` | 2 | 3 |
| `soc-titles` | Danh hiệu, thành tựu, kẻ thù | `specs/titles.md` | 2 | 4 |
| `cmb-clone` | Phân Thân (cấp 70) | `specs/clone.md` | 3 | 1 |
| `clan-war` | Gia tộc mở rộng, chiến gia tộc | `specs/clanwar.md` | 3 | 4 |
| `sig-meridian` | Kinh Mạch | `specs/meridian.md` | 3 | 5 |
| `quest-dailies`, `evt-village-defense` | Việc Làng, Thủ Hộ Làng | `specs/dailies.md` | 3 | 2, 6 |
| `pvp-battlefield` | Chiến Trường hai phe | `specs/battlefield.md` | 4 | 4 |
| `pet-mountup` | Thú cưỡi nuôi, thú cưng tiến hóa, pháp bảo | `specs/mountup.md` | 4 | 5 |

---

## 5. Ma trận kiểm thử

### 5.1 Số kiểm tra theo file

| File | `ok(` | Loại | Id được kiểm |
|---|---:|---|---|
| `features/mail.js` | 59 | đơn vị + bot | `soc-mail`, `evt-season-core`, `core-characters` |
| `features/arena.js` | 47 | đơn vị + bot | `pvp-arena`, `soc-rank`, `pvp-duel`, `soc-trade` |
| `features/gems.js` | 45 | đơn vị + bot | `gear-gems`, `eco-shop-npc`, `soc-trade` |
| `features/boss.js` | 39 | đơn vị + bot | `pve-boss-field`, `cmb-death-revive`, `pve-tathu` |
| `features/passive.js` | 34 | đơn vị + bot | `cmb-passive`, `cmb-stats`, `clan-core` (lập + góp) |
| `features/pets.js` | 32 | đơn vị + bot | `pet-pets`, `gear-storage`, `soc-trade` |
| `features/persistence.js` | 24 | bot (tắt/bật server) | `core-save` |
| `features/fashion.js` | 22 | bot | `pet-fashion`, `pet-mount`, `soc-trade` |
| `features/daily.js` | 12 | bot | `evt-checkin`, `gear-storage`, `soc-friends`, `pve-dungeon` |
| `features/skills.js` | 11 | bot | `cmb-skills`, `cmb-potential`, `gear-upgrade` |
| `features/account.js` | 9 | bot | `core-account`, `core-characters`, `world-base` |
| `features/social.js` | 8 | bot | `world-teleport`, `soc-chat`, `soc-party`, `soc-trade` |
| `features/audio.js` | 8 | đơn vị + HTTP | `snd-audio-files` |
| `features/endgame.js` | 7 | bot | `core-levelcap-199` (cấp 120), `cmb-buffs`, `pet-pets`, `gear-equipment` |
| `features/inventory.js` | 7 | đơn vị + bot | `ui-bag-expand`, `ui-bag-bulkdrop` |
| `features/quest.js` | 6 | bot | `quest-main` (nhiệm vụ 1), `eco-shop-npc`, `gear-inventory` |
| `features/combat.js` | 6 | bot | `world-base`, `cmb-loot`, `cmb-monster-ai` |
| `features/movement.js` | 2 | bot | `world-movement` |
| `e2e/e2e.js` | 55 | Playwright 1 người (desktop + `MOBILE=1`) | `world-worldmap`, `cmb-passive`, `pet-mount`, `pet-pets`, `gear-gems`, `soc-mail`, `evt-season-core`, `pve-tathu`, `pvp-arena`, `quest-main`, `cmb-skills`, `cmb-auto` |
| `e2e/ui-multiplayer.js` | 12 | Playwright 2 người | `soc-invites`, `soc-trade`, `soc-party`, `pvp-duel`, `gear-upgrade` |
| `e2e/perf.js` | đo khung hình | Playwright | `art-maps`, `cmb-monster-ai`, `cmb-auto`, `art-fx` |

### 5.2 Hành động chưa có kiểm thử bot (xác minh bằng `grep` trong `tests/`)

| Module | Hành động | Rủi ro | Id xử lý |
|---|---|---|---|
| clan | `clanInvite, clanAccept, clanLeave, clanKick, clanInfo, clanNotice, clanPromote` | **cao** (quyền hạn, nhường chức, giải tán) | `dev-test-coverage` (file mới `features/clan.js`), chặn trước `clan-war` |
| quest | NPC `task`: `accept`, `finish`, `cancel` | **cao** (nguồn EXP/xu/lượng hằng ngày) | `dev-test-coverage`, chặn trước `quest-dailies` |
| skills | `resetStats` | trung bình (tiêu lượng) | `dev-test-coverage` |
| party | `partyLeave`, `partyKick` | trung bình (chuyển trưởng nhóm, giải tán) | `dev-test-coverage` |
| pk | `pk`, `revive` về làng | trung bình | `dev-test-coverage` |
| world | Giờ Vàng | trung bình (×2 EXP) | `evt-calendar` |
| friends | `friendDel`, `friendList` | thấp | `dev-test-coverage` |
| movement | `pickup` thủ công | thấp | `dev-test-coverage` |
| invites | `decline` | thấp | `dev-test-coverage` |
| rank | `inspect` | thấp | `dev-test-coverage` |
| mail | `mailRead` | thấp | `dev-test-coverage` |

Không có kiểm thử trình duyệt cho: cửa hàng, thủ kho, điểm danh, vòng quay, gia tộc, bạn bè, phó bản, nhiệm vụ hằng ngày, tiềm năng, xem người chơi (`ui-mobile-pass` rà điện thoại, `dev-ci-browser` chạy hằng đêm).

---

## 6. Nợ kỹ thuật và rủi ro

Mức: **N** nghiêm trọng (mất dữ liệu diện rộng) · **C** cao · **T** trung bình · **TH** thấp. Mã `R-xx` theo `audit-risk.md`, `Rx` theo `audit-systems.md` mục 9. Đề xuất chi tiết và ADR nháp (lưu theo nhân vật, SQLite, kênh bản đồ, gói `data` qua HTTP, trang GM) được đặc tả và đánh số lại ở `10-ky-thuat-van-hanh.md`.

### 6.1 Lưu trữ (đã đọc lại mã, đúng như kiểm kê)

| Mã | Rủi ro / nợ | Bằng chứng | Mức | Ảnh hưởng | Đề xuất | Id xử lý | GĐ |
|---|---|---|---|---|---|---|---|
| R-03 | Đọc file lỗi (JSON hỏng, file 0 byte sau mất điện) thì trả bảng rỗng và chạy tiếp | `db.js` dòng 21-28: chỉ `console.error` khi lỗi khác `ENOENT` | N | 30 giây sau `saveAll` ghi đè file thật bằng `{}`: mất toàn bộ tài khoản/nhân vật, chỉ còn sao lưu | lỗi khác `ENOENT` thì dừng khởi động, giữ file hỏng `.corrupt-<giờ>`, thử `.tmp`/sao lưu mới nhất, cần `FORCE_EMPTY=1` mới chạy rỗng | `ops-db-safe-load` | 0 |
| R-04 | Không `fsync` file và thư mục quanh `rename` | `db.js` dòng 30-35 | C | mất điện để lại file rỗng, rồi rơi vào R-03 | ghi + `fsyncSync` + `rename` + fsync thư mục (đo: chỉ thêm 5-20%) | `ops-db-safe-load` | 0 |
| R-05 | Lỗi ghi chỉ in console, không báo động | `db.js` `save()` | C | ổ đầy hoặc quá giới hạn chuỗi V8 thì ngừng lưu mà không ai biết | đếm lỗi liên tiếp, đưa vào `/api/status`, báo admin online, chặn vào game sau 3 lỗi | `ops-db-safe-load`, `ops-monitoring` | 0, 8 |
| R-01, R-02 | Ghi **toàn bộ** 4 file đồng bộ; hai bộ hẹn giờ (30 giây vô điều kiện ở `world.js` dòng 34 + 15 giây khi `dirty` ở `index.js` dòng 49) | `db.js`, `world.js`, `index.js` | C | chặn vòng lặp tỉ lệ tổng số nhân vật từng tạo (bảng 6.2) | lưu theo nhân vật, chỉ phần bẩn, chia lô 20 nhân vật | `ops-persist-shard` | 0 |
| R-06 | 4 file ghi rời, không nguyên tử giữa các file | `db.js` `save()` | T | sập giữa chừng: mã quà đã dùng lưu ở tài khoản nhưng nhân vật chưa nhận quà | bản chụp có số thế hệ, nạp kiểm cùng thế hệ | `ops-persist-shard` | 0 |
| R-08, R-07 | Đỉnh bộ nhớ khi lưu ≈ 2,9 lần kích thước file; giới hạn chuỗi V8 ~512 MB | đo `persist-bench.js` | C / T | OOM ở ~880 nhân vật hậu kỳ với 768 MB | như R-01; đặt `--max-old-space-size` | `ops-persist-shard`, `ops-deploy` | 0, 8 |
| R-09 | Sao lưu cùng ổ, giữ 12 mốc, mỗi lần khởi động thêm 1 mốc sau 60 giây | `db.js` dòng 38-55, `index.js` dòng 50-51 | C | 12 lần redeploy liên tiếp xóa hết lịch sử; hỏng ổ mất cả hai | giữ theo tầng (24 giờ, 14 ngày, 8 tuần), bản khởi động không vào vòng xoay, đẩy bản ngày ra ngoài máy | `ops-backup` | 0 |
| R-10 | Không bắt `uncaughtException`/`unhandledRejection` | `index.js` chỉ có SIGINT/SIGTERM (dòng 47-48) | T | lỗi trong tick làm sập, mất ≤ 30 giây tiến độ | lưu khẩn cấp rồi thoát mã ≠ 0 | `ops-crash-guard` | 0 |
| R-11 | Token đăng nhập lưu nguyên văn | `db.js` | T | lộ sao lưu = chiếm phiên 30 ngày | lưu `sha256(token)`, so `timingSafeEqual` | `ops-anticheat` | 4 |
| R-16 | `scryptSync` chặn luồng ~30 ms (M1) | `db.js`, `gateway.js` | T | 16-33 lần đăng nhập/giây chiếm trọn CPU | `crypto.scrypt` bất đồng bộ + hàng đợi 4 việc | `ops-crash-guard` | 0 |

### 6.2 Ngưỡng an toàn của cách lưu hiện tại (VPS ≈ số đo M1 × 2, container 768 MB)

| Chỉ tiêu | Dân số trộn (5,8 KB/nhân vật) | Hậu kỳ đầy đồ (53,6 KB/nhân vật) |
|---|---:|---:|
| Mượt: chặn ≤ 50 ms | ~650 nhân vật | ~80 |
| Chấp nhận: chặn ≤ 100 ms | **~1.300** | **~160** |
| Khựng rõ: chặn ≥ 250 ms | ≥ ~3.400 | ≥ ~400 |
| Trần bộ nhớ (OOM khi lưu) | ~6.000 | ~880 |
| Lưu theo nhân vật, chia lô (`shard-bench.js`, 300 nhân vật bẩn) | lượt chặn dài nhất 22,6 ms, không phụ thuộc tổng số tài khoản | |

Ngưỡng phải có `ops-persist-shard` trước khi: tổng nhân vật vượt 1.000 **hoặc** nhân vật cấp ≥ 100 vượt 150. Mặc định của GDD: làm ngay giai đoạn 0, không chờ ngưỡng.

### 6.3 Thế giới, mạng

| Mã | Rủi ro / nợ | Bằng chứng | Mức | Ảnh hưởng | Đề xuất | Id xử lý | GĐ |
|---|---|---|---|---|---|---|---|
| R-12, R-13 | Một bản đồ = một `GameMap`; gói `state` 10 lần/giây gửi mọi người + quái tới mọi người trong bản đồ | `world.js`, `map.js` | C | băng thông O(n²): 150 người một bãi 6,8 MB/s, 300 người 27,3 MB/s; điện thoại 4G nhận 47-93 KB/s mỗi người | kênh bản đồ (trần mềm 40/kênh) + lọc khung nhìn ±600 px | `world-channels`, `ops-state-culling` | 5 |
| R-14 | Không kiểm `bufferedAmount` trước `ws.send` | `gateway.js` | T | máy khách mạng yếu làm hàng đợi phình RAM máy chủ | bỏ gói `state` khi > 256 KB, ngắt khi > 2 MB | `ops-state-culling` | 5 |
| R-15 | Gói `data` 119.443 B (gzip 23.357 B) gửi không nén mỗi lần kết nối; cấp 199 dự kiến gấp 2-3 | `gateway.js`, đo `buildGameData` | T | tốn dữ liệu điện thoại, chậm vào game | tải qua HTTP có băm phiên bản | `ops-data-http` | 7 |
| R-17 | Vượt 80 gói/giây bị bỏ im lặng | `gateway.js` dòng 200 | TH | khó phát hiện bot | đếm vi phạm, ngắt khi vượt 3 giây liên tiếp | `ops-anticheat` | 4 |
| R-18 | Một tiến trình, một luồng | `index.js` | TH | CPU chưa phải nút thắt: 500 người rải đều, tick trung vị 0,11 ms, gửi gói ~5,5% CPU | giữ nguyên tới mục tiêu 300 người online; liên máy chủ là `W` | `ops-load-test`, `ops-cross-server` | 8 |

### 6.4 Mã client, nội dung

| Mã | Rủi ro / nợ | Bằng chứng | Mức | Ảnh hưởng | Đề xuất | Id xử lý | GĐ |
|---|---|---|---|---|---|---|---|
| R9 | `game/game.js` 1.826 dòng; 4 lô đợt 3 đều chèn vào đó | `wc -l`, `PLAN.md` mục 4 | T | xung đột gộp, khó giao song song | **không tách trước đợt 3** (đặc tả đợt 3 neo vị trí chèn theo nội dung `game.js`); tách sau lô 4 | `core-gameloop-split` (mục 8, mới) | 7 |
| R-19 | Mọi bãi sinh bằng `genField` (cùng kiểu bục 1-2 tầng) | `maps.js` dòng 8-57 | T | ≥ 80 bản đồ khó có bản sắc | khóa `layout`/`segments` tùy chọn | `world-layout` | 2 |
| R-20 | Chỉ 3 làng; `village()` cố định 1640 px, 9 NPC tọa độ cứng | `maps.js` | T | thêm NPC phải sửa hàm chung; Chợ Ký Gửi đã phải nới 1800 | làng/trạm nhận danh sách NPC + độ rộng | `world-towns` | 2 |
| R-21 | Khối lượng nội dung so với sàn (mục 2.1) | `count.js` | C | trễ 1.0 nếu không chia lô cho worker | 92 bản đồ theo `content/10-world.md`; đếm sàn trong `dev-verify` | `world-lower-fill`, `world-region-*`, `quest-main-199`, `pet-beasts`, `evt-*`, `dev-verify` | 2, 5, 6 |
| R6 | Nhiệm vụ hằng ngày một kiểu, không kiểm thử | `modules/quest` | T | nguồn tiền không có lưới an toàn | kiểm thử trước, Việc Làng sau | `quest-daily-task`, `quest-dailies` | 0, 2 |
| R7 | Gia tộc 7/8 hành động không kiểm thử | `grep` mục 5.2 | C | `clan-war` xây trên nền chưa kiểm | `features/clan.js` trước `clan-war` | `dev-test-coverage`, `clan-core` | 0 |
| R8 | Tên NPC phiên âm kiểu Nhật (Tetsu, Ken, Rin, Bo, Ryu, Yuki, Sora, Mizu, Kai, Haru, Kaze, Fuu, Jin, Daichi, Gan) và boss "Pharaoh Phục Sinh" lệch quy tắc đặt tên | `data/maps.js`, `data/monsters.js` | TH | chống P1 | đổi chuỗi `name`, giữ id | `quest-npc-rename` | 7 |
| R3 | `c.kills` là số quái hạ (BXH "Diệt quái"), dễ nhầm với PK | `core/combat.js`, `core/world.js` | TH | nhầm khi làm BXH PK | thêm `pvpKills` riêng | `cmb-power-score` | 4 |
| R5 | `c.settings` tạo sẵn nhưng không dùng | `core/player.js` | TH | cài đặt tự đánh không theo người sang thiết bị khác | đồng bộ phần tự đánh | `ui-settings-sync` | 7 |
| R-22 | Âm thanh: file đã có ở `src/client/audio/` (`CREDITS.md`, `music/`, `sfx/`; 25 nhạc nền + 45 tiếng hiệu ứng) trong thư mục làm việc nhưng **chưa theo dõi git**, chưa commit `main`; nguồn tạo file nằm ngoài repo; `README.md` dòng 33 vẫn ghi "âm thanh tổng hợp bằng WebAudio" | `ls`, `tools/sync-audio.js`, `README.md` dòng 33 | T | bản dựng không tái lập; tài liệu lệch mã | chốt ADR-01-1, đưa file vào nơi tái lập được, sửa README | `snd-audio-files` | 7 |

### 6.5 Vận hành, triển khai

| Mã | Rủi ro / nợ | Mức | Ảnh hưởng | Id xử lý | GĐ |
|---|---|---|---|---|---|
| R-23 | Đợt tái cấu trúc chưa commit (mục 7.1); production dựng từ `git archive`, CI build từ `main` | C | không triển khai được bản mới; một lệnh git nhầm là mất hàng chục nghìn dòng | `ops-commit-restructure` | 0 |
| R-24 | Commit `920700a` trên nhánh `feat/bag` mang tên "tạm: ảnh chụp" nhưng thực chứa toàn bộ tái cấu trúc (210 file, không có ảnh); bỏ nó thì mất tái cấu trúc, giữ nguyên thì lịch sử ghi sai | T | lịch sử khó đọc, dễ bỏ nhầm | `ops-commit-restructure` (dùng cây của nó, viết lại thông điệp) | 0 |
| R-25 | Không có trang GM: không tra cứu người offline, không khóa tài khoản, không cấm chat | C | không xử lý được gian lận, hỗ trợ người chơi | `ops-gm-panel` | 8 |
| R-26 | Lệnh admin tạo xu/lượng/vật phẩm không ghi nhật ký | C | lộ tài khoản admin = in tiền không truy vết | `ops-audit-log` | 3 |
| R-27 | `/api/status` chỉ có `ok, version, online, accounts` | C | sự cố chỉ biết khi người chơi kêu | `ops-monitoring` | 8 |
| R-28 → R-31 | Docker chạy root, không `HEALTHCHECK`, không giới hạn heap; compose dùng `latest`, không xoay log; hai đường triển khai lệch nhau; khuyến nghị "1 GB RAM là đủ" sai với số đo | T | lỗ hổng leo quyền, đầy ổ vì log, image đã kiểm thử không phải image đang chạy | `ops-deploy` | 8 |
| R-32 | CI không chạy kiểm thử trình duyệt | TH | hồi quy giao diện/hiệu năng chỉ bắt khi chạy tay | `dev-ci-browser` | 7 |

---

## 7. Việc đang dở

### 7.1 Đợt tái cấu trúc chưa commit (`core-restructure`, `ops-commit-restructure`)

| Mục | Giá trị |
|---|---|
| Phạm vi | `public/` + `server/` → `src/client`, `src/server/{core,services,modules}`, `src/shared`; tách `render/*` thành file vào + thư mục con; tách cửa sổ ra `ui/windows/`; tách kiểm thử ra `tests/{lib,features,e2e}` |
| Trạng thái git | 216 file trong index (164 thêm, 25 đổi tên, 17 xóa, 10 sửa), +35.962/−16.930 dòng; chưa theo dõi: `NOTE.md`, `docs/` |
| Đã gồm | toàn bộ `feat/bag` + `feat/audio` (mục 7.2, 7.3); bản đồ import + `modulepreload` + lưu đệm theo băm nội dung ở `services/http.js`; hướng dẫn pm2 mới ở `DEPLOY.md` |
| Mốc an toàn | nhánh `checkpoint/truoc-tai-cau-truc`, `checkpoint/sau-tai-cau-truc`, `snap/bag-base` |
| Kiểm chứng | `npm run check` sạch, `npm test` đạt (mục 3.1); chưa chạy `test:e2e`, `test:ui`, `test:perf` trên bản stage cuối |
| Việc còn lại để commit | một agent khác đang ở bước sửa lỗi cuối; chạy đủ kiểm thử trình duyệt + chụp ảnh; commit tiếng Việt theo `CLAUDE.md`; không đưa `NOTE.md`, ảnh chụp, `data/` |

### 7.2 Nhánh `feat/bag` (nội dung đã có trong bản stage)

| Commit | Nội dung | Id | Kiểm thử |
|---|---|---|---|
| `fdd1297` | Mở rộng túi bằng lượng (`INV_EXPAND`: 6 lần × 10 ô, 50/100/150/200/300/400 lượng, tối đa 100 ô; `invSize(c)`; trường `c.invExt`), hủy nhanh nhiều món (`discardMany {items:[[ô,id]]}`), hộp xác nhận `ask()` thay `confirm()` | `ui-bag-expand`, `ui-bag-bulkdrop`, `ui-ask-dialog` | `features/inventory.js` (7) |
| `4b0ff52` | Hành trang chia trang 40 ô, ô khóa ở trang cuối bấm để mở rộng | `ui-bag-expand` | như trên |
| `920700a` | "tạm: ảnh chụp" | — | **không đưa vào `main`** |

### 7.3 Nhánh `feat/audio` (nội dung đã có trong bản stage)

| Commit | Nội dung | Id | Kiểm thử |
|---|---|---|---|
| `25428b0` | Module `audio` (móc `clientData.audio` liệt kê file có sẵn), `data/audio.js` (23 theme → `MUSIC_THEME`; nhạc tình huống title/boss/tathu/arena/dungeon/festival; 42 dòng `SKILL_SFX`), `core/sound.js` phát file + WebAudio dự phòng, 2 thanh âm lượng trong Cài đặt, HTTP hỗ trợ Range cho `.ogg/.m4a`, `tools/sync-audio.js`, kiểm chéo trong `check-data` | `snd-audio-files` | `features/audio.js` (8) |

Điều kiện chuyển `done`: chốt ADR-01-1 (`01-tam-nhin.md` mục 8), có file âm thanh và `CREDITS.md` tái lập được trên máy khác, đo lại thời gian "mở link tới điều khiển được" (nhạc không nằm trên đường tải bắt buộc).

### 7.4 Đặc tả đợt 3 đã duyệt (`scratchpad/specs/`, chưa có mã)

| Lô | Đặc tả | Id | GĐ | Phụ thuộc chính |
|---|---|---|---|---|
| 1 – Nền | `bound.md`, `balance.md` | `eco-bound`; `cmb-balance`, `dev-balance-tool` | 3; 1 | — (10 đặc tả sau dựa vào `payXu/gainXuk/canTransfer` và `BOSS_MUL`) |
| 2 | `status.md`, `dungeons.md`, `market.md`, `crafting.md`, `titles.md` | `cmb-status`, `pve-caves`, `eco-market`, `gear-crafting`, `soc-titles` | 1, 2, 3, 3, 4 | lô 1; `titles` thêm móc `playerKilled` |
| 3 | `clone.md`, `clanwar.md`, `meridian.md`, `dailies.md` | `cmb-clone`, `clan-war`, `sig-meridian`, `quest-dailies` + `evt-village-defense` | 1, 4, 5, 2/6 | `status` (khối `#hud-buffs`), `dungeons` (`pickBoss`), `crafting`, làng 1800 của `market` |
| 4 | `battlefield.md`, `mountup.md` | `pvp-battlefield`, `pet-mountup` | 4, 5 | `clanwar` (`canPvp`), `clone` (`ghost`), `meridian` |

`PLAN.md` đã gỡ xung đột: phím tắt (H chiến trường, Y Việc Làng, U thú cưỡi), id bản đồ (`chientruong` / `tocchien`), lịch không chồng giờ (Thủ Hộ Làng 12:00/21:00; chiến gia tộc mở 21:25, đánh 21:30-21:45; Chiến Trường 20:00-20:30; Tà Thú giờ chẵn :30-:50), mỗi lô tối đa một móc mới, mọi module đăng ký một dòng cuối mảng, cổng chụp ảnh 3621-3633.

### 7.5 Thiết kế nội dung cấp 120-199 (`scratchpad/content/`, bản thiết kế đã chốt, chưa có mã)

| File | Nội dung | Id | Ghi chú |
|---|---|---|---|
| `00-foundation.md` | hợp đồng chung: đường EXP > 120, bậc trang bị 12-19, kỹ năng hậu kỳ, 8 vùng, quy ước file `data/regions/`, `quests/` | `core-levelcap-199`, `gear-tier-199`, `cmb-skills-199`, `char-tier-outfit`, `world-upper` | số liệu đo bằng `recalc()`/`calc()` thật |
| `10-world.md` | 92 bản đồ không phải phó bản (69 mới: Hạ Giới 21, Thượng Giới 48), trạm, Phu Xe, theme mới, tọa độ bản đồ thế giới | `world-lower-fill`, `world-towns`, `world-region-*`, `art-themes-new` | sinh tự động từ `content/tools/world-data.js` |
| `20-monsters.md` | 72 quái, 9 boss, 24 vật phẩm nhiệm vụ Thượng Giới | `world-region-*`, `art-monsters-199` | kiểm bằng bản sao ngoài repo, **chưa** qua `npm run check` |
| `30-quests.md` | 73 nhiệm vụ chính mới (tổng 124), Kỳ Duyên, Lệnh Truy Nã | `quest-main-199`, `quest-kyduyen`, `quest-truyna` | id `<vùng>_q<n>`, 51 nhiệm vụ cũ đóng băng |
| `40-items-shops.md` | vật phẩm, cửa hàng Thượng Giới, quầy lượng | `gear-tier-199`, `eco-consumables-199`, `eco-loot-tables`, `mon-luong-shop` | |
| `50-worldboss-events.md` | boss thế giới theo giờ, Tà Thú cấp cao, boss gia tộc, lịch sự kiện, 7 lễ hội | `pve-worldboss`, `pve-tathu-199`, `pve-clanboss`, `evt-calendar`, `evt-*` | boss gia tộc chỉ chạy khi `clan-war` đã vào `main` |
| `60-mounts-pets.md` | 20 thú cưỡi, 25 thú cưng, 8 kỹ năng thú, ghép mảnh | `pet-beasts` | dựa trên `specs/mountup.md` |

### 7.6 Việc treo khác

| Nguồn | Nội dung | Id |
|---|---|---|
| `NOTE.md` (chưa theo dõi git) | hoàn thiện Thợ Rèn: ghép đá cường hóa, tách cường hóa | `gear-smith-plus` |
| `docs/gdd/` (chưa theo dõi git) | GDD bản ghép 18/10/2026, gồm 12 mục + ROADMAP + features.json | — |

### 7.7 Thứ tự đề xuất cho giai đoạn 0

| # | Việc | Id | Điều kiện xong |
|---|---|---|---|
| 1 | Chốt bản stage: chạy `test:e2e` (desktop + `MOBILE=1`), `test:ui`, `test:perf`, chụp ảnh; commit 4 nhóm (cherry-pick `5a50602`, tái cấu trúc, túi, âm thanh); viết lại thông điệp "tạm: ảnh chụp" | `ops-commit-restructure` | `git status --short src tests tools` rỗng; CI xanh trên `main` |
| 2 | Nạp an toàn + fsync + báo lỗi lưu | `ops-db-safe-load` | kiểm thử: `characters.json` = `{"a":` → khởi động ném lỗi, file gốc còn nguyên |
| 3 | Sao lưu theo tầng | `ops-backup` | 20 lần khởi động liên tiếp vẫn còn bản sao lưu ngày hôm trước |
| 4 | Kiểm thử còn trống (mục 5.2) | `dev-test-coverage` | mọi hành động trong bảng 5.2 có ≥ 1 `ok(` trong `tests/features/` |
| 5 | Lưu theo nhân vật, chia lô | `ops-persist-shard` | `persist-bench`: chặn ≤ 25 ms ở 5.000 nhân vật hậu kỳ, 200 online |
| 6 | Chống sập, `scrypt` bất đồng bộ | `ops-crash-guard` | 50 lần đăng nhập đồng thời không làm tick trễ > 50 ms |
| 7 | Lệnh kiểm chứng một chạm | `dev-verify` | `npm run verify` in đếm sàn nội dung và mã thoát ≠ 0 khi `check`/`test` hỏng |

Đặc tả các việc `ops-*`, `dev-*` ở `10-ky-thuat-van-hanh.md`.

---

## 8. Đặc tả tính năng mới của mục này

### 8.1 `core-gameloop-split` — Tách `game/game.js` theo nhóm xử lý sau đợt 3

| Mục | Nội dung |
|---|---|
| Trụ cột | P5 (đường dài: giữ mã sửa được, giao song song được) |
| MoSCoW, GĐ, cỡ | `C`, giai đoạn 7, cỡ M |
| Mục đích | `game/game.js` (1.826 dòng) là file lớn nhất phía client và là chỗ mọi tính năng mới chèn xử lý gói (`onXxx`), hiệu ứng, HUD tạm. Bốn lô đợt 3 cùng sửa nó nên phải gộp tuần tự. Tách theo nhóm giúp mỗi agent giữ một file theo đúng quy tắc phân vùng của `CLAUDE.md`. |
| Luồng người chơi | không đổi: người chơi không thấy khác biệt nào (cùng hình, cùng phím, cùng khung hình). |
| Quy tắc | (1) Làm **sau** khi lô 4 đợt 3 (`pvp-battlefield`, `pet-mountup`) đã vào `main`, vì đặc tả đợt 3 neo vị trí chèn theo nội dung `game.js` hiện tại. (2) `game.js` giữ lớp `Game`, vòng lặp vẽ, camera, dự đoán di chuyển và đăng ký `n.on('<t>', fn)`; thân các trình xử lý gói chuyển sang `game/handlers/<nhóm>.js` (nhóm gợi ý: `combat`, `boss`, `world`, `social`, `pet`, `event`) theo mẫu gộp `Object.assign(Game.prototype, <các nhóm>)` giống `ui/windows/`. (3) Không đổi API công khai trong bảng `CLAUDE.md` (`game/pathfind.js` không chạm), không đổi id DOM, không đổi `window.ninja`. (4) Chỉ di chuyển mã, không sửa logic trong cùng thay đổi. |
| Dữ liệu | không đổi `src/shared/data`. |
| Gói `{ t }` | không thêm, không đổi. |
| Module server, cửa sổ, id DOM | không có. File mới chỉ ở `src/client/js/game/handlers/`; cập nhật mục "Cấu trúc thư mục" và bảng vùng "Vòng lặp game" trong `CLAUDE.md`. |
| Bố cục điện thoại | không đổi; kiểm bằng `MOBILE=1`. |
| Chống gian lận | không áp dụng (chỉ client, server vẫn có thẩm quyền). |
| Tiêu chí chấp nhận | `wc -l src/client/js/game/game.js` ≤ 1.100; không file nào trong `game/handlers/` > 500 dòng; `git diff` không chạm file vào `render/*.js`, `game/pathfind.js`, `ui/ui.js`; `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`; `npm run test:e2e` desktop và `MOBILE=1` in `E2E ĐẠT` và `OK no console errors`; `npm run test:ui` đạt; `npm run test:perf` không giảm quá 2 khung hình/giây so với lần đo ngay trước khi tách; `tools/shot.js` desktop + điện thoại in `OK no console errors`. |
| Kiểm thử | `tests/e2e/e2e.js`, `tests/e2e/ui-multiplayer.js`, `tests/e2e/perf.js`; không cần kiểm thử bot mới vì server không đổi. |
| Giao opencode | được: việc cơ học, kiểm bằng lệnh; Claude rà diff (chỉ di chuyển mã) trước khi gộp. |

---

## 9. Quyết định kiến trúc

Mục này không đề xuất thay đổi quy tắc nào của `CLAUDE.md` hay `DESIGN_RULES.md`, nên không có ADR riêng. Các ADR nháp do kiểm kê rủi ro đưa ra (lưu theo nhân vật; SQLite dự phòng; kênh bản đồ; gói `data` qua HTTP; trang GM; file âm thanh) được chốt và đánh số `ADR-10-n` ở `10-ky-thuat-van-hanh.md`; file âm thanh đã có `ADR-01-1`.

---

## 10. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Nội dung `feat/bag` + `feat/audio` đã nằm trong bản stage của đợt tái cấu trúc: commit chung một lần hay tách commit? | Tách 4 nhóm trên `main` theo thứ tự: cherry-pick `5a50602` (đợt 1, 2A, 2B) → tái cấu trúc (cây `920700a`, commit này mang tên "tạm: ảnh chụp" nhưng thực chứa tái cấu trúc, viết lại thông điệp) → túi đồ (`ui-bag-*`, `ui-ask-dialog`) → âm thanh (`snd-audio-files`), để hoàn tác riêng được (chỉnh khi ghép, xem GDD K5). |
| Q2 | Đưa file âm thanh vào git hay giữ ngoài repo và chép lúc build? | Đưa vào git ở `src/client/audio/` kèm `CREDITS.md` nếu tổng ≤ 8 MB (theo ADR-01-1) để bản dựng tái lập được; vượt 8 MB thì chuyển sang tải lười theo bản đồ và vẫn giữ trong git. |
| Q3 | Có chạy kiểm thử trình duyệt (`test:e2e`, `test:ui`, `test:perf`) trên bản stage trước khi commit không, khi agent khác đang sửa lỗi cuối? | Có, sau khi agent kia báo xong; chạy trên cổng riêng (ví dụ 3640) với `DATA_DIR` riêng, kết quả ghi vào báo cáo commit. |
| Q4 | Giới hạn bộ nhớ container production thực tế là bao nhiêu (số đo dùng 768 MB)? | Dùng 768 MB; ghi giới hạn này vào `deploy/docker-compose.yml` mẫu khi làm `ops-deploy`. |
| Q5 | Có tách `game/game.js` trước đợt 3 để giảm xung đột không? | Không: đặc tả đợt 3 neo vị trí chèn theo nội dung file hiện tại; tách sau lô 4 (`core-gameloop-split`, giai đoạn 7). |
| Q6 | Có đổi tên NPC phiên âm kiểu Nhật và boss "Pharaoh Phục Sinh" ngay giai đoạn 0? | Không; đổi ở giai đoạn 7 (`quest-npc-rename`), giữ id để không vỡ dữ liệu lưu và kiểm thử. |
| Q7 | Đấu Trường PK tự do (không luật, không thưởng) giữ hay bỏ? | Giữ làm bãi PK không thưởng; luật và thưởng đưa vào `pvp-freezone` (`C`). |
| Q8 | `README.md` còn ghi "âm thanh tổng hợp bằng WebAudio": sửa lúc nào? | Sửa trong cùng commit âm thanh (Q1), khi `snd-audio-files` vào `main`. |

---

## 11. Tham chiếu

| Tài liệu | Dùng cho |
|---|---|
| `gddwork/audit-data.md` | số liệu nội dung đầy đủ (bản đồ từng dòng, đường EXP, bảng vật phẩm) |
| `gddwork/audit-systems.md` | bảng giao thức đầy đủ theo module, dữ liệu lưu trên nhân vật |
| `gddwork/audit-risk.md` | số đo lưu trữ/băng thông đầy đủ, ADR nháp |
| `gddwork/lab/m02/` | log kiểm chứng của mục này |
| `01-tam-nhin.md` | trụ cột, MoSCoW, định nghĩa "xong", ADR-01-1 |
| `10-ky-thuat-van-hanh.md` | đặc tả các việc ổn định và vận hành |
| `scratchpad/specs/PLAN.md` | thứ tự lô đợt 3, xung đột đã gỡ |
