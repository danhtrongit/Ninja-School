# GDD 05 — Hệ thống giao diện và trải nghiệm

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5 (phần giao diện, điều khiển, thông báo, cài đặt, trợ năng) |
| Ngày | 18/10/2026 |
| Phạm vi id | 13 id của danh mục: `ui-hud`, `ui-windows`, `ui-touch`, `ui-settings`, `ui-title`, `ui-ask-dialog`, `ui-tutorial`, `ui-item-compare`, `ui-notify-center`, `ui-mobile-pass`, `ui-settings-sync`, `ui-portrait`, `ui-i18n` + 2 id mới: `ui-hud-banners` (con của `ui-hud`), `ui-a11y` |
| Không thuộc mục này | `ui-bag-expand`, `ui-bag-bulkdrop` (sổ của `05-he-thong-trang-bi.md` mục 3.4); ở đây chỉ ghi luật giao diện của túi chia trang (mục 1.7) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md` (mục 2, 7, 8, 10), `docs/gdd/01-tam-nhin.md` (trụ cột, chân dung, Q5, Q6), `02-hien-trang.md`, `03-doi-chieu.md`, `04-dac-sac.md` (C3, lịch), `05-he-thong-trang-bi.md`, `05-he-thong-xa-hoi-pvp.md`; mã ở thư mục làm việc ngày 18/10/2026: `src/client/index.html`, `js/ui/ui.js`, `js/ui/dom.js`, `js/ui/windows/{dialog,inventory,settings}.js`, `js/core/{input,store}.js`, `css/{touch,hud,windows}.css`, `src/server/core/player.js` (`selfData`), các module có cổng cấp (`chat, trade, dungeon, pk, clan, arena, movement`); đặc tả `specs/PLAN.md`; nội dung `content/50-worldboss-events.md` (Lịch Sự Kiện, `#hud-wb`); kiểm kê `gddwork/audit-systems.md`, `audit-risk.md`; nhánh `feat/bag` (`fdd1297`, `4b0ff52`) |
| Thí nghiệm kèm (chỉ đọc repo, server riêng cổng 3790, `DATA_DIR` trong lab) | `gddwork/lab/ui05/measure.js` (vùng chạm và tràn khung, 16 cửa sổ + HUD, 3 cỡ điện thoại + máy tính), `fonts.js` (chữ dưới 15px), `askbag.js` (hộp xác nhận, túi 100 ô 3 trang), kết quả `mobile.json`, `desktop.json`, `fonts.json`, `summary.txt`, ảnh `shot-bag-m.png`, `shot-ask-m.png`; `npm run test:e2e` desktop và `MOBILE=1` (`e2e-d.log`, `e2e-m.log`, ảnh `e2e/`) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ ba ngoại lệ có ADR ở mục 4. Mọi tên hiển thị trong mục này là tên tự đặt (thuần Việt hoặc Hán-Việt), không lấy từ game tham khảo.

---

## 0. Tóm tắt

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|
| `ui-hud` | HUD: thanh chỉ số, mục tiêu, buff, nhiệm vụ, bản đồ nhỏ, biểu ngữ, thông báo | P2 | M | done | 1 | M | mục 1.1 |
| `ui-windows` | Khung cửa sổ + 23 tệp cửa sổ (22 khóa `refresh()` + hội thoại) | P2, P1 | M | done | 1 | L | mục 1.2 |
| `ui-touch` | D-pad, cụm kỹ năng, AUTO, gợi ý xoay ngang | P2 | M | done | 1 | M | mục 1.3 |
| `ui-settings` | Cài đặt tự đánh, hiển thị, âm thanh, ngày/đêm, rung | P2 | M | done | 7 | S | mục 1.4 |
| `ui-title` | Màn mở đầu: đăng nhập, chọn/tạo nhân vật, trạng thái máy chủ | P1, P2 | M | done | 7 | M | mục 1.5 |
| `ui-ask-dialog` | Hộp xác nhận `ask()` thay hộp trình duyệt | P1, P2 | M | todo (đã làm trên `feat/bag`, chờ gộp; 3 lỗi đo được) | 0 | S | mục 1.6 |
| `ui-hud-banners` | Dải biểu ngữ dưới giữa có thứ tự ưu tiên (id mới, con của `ui-hud`) | P2, P4 | S | todo | 4 | M | mục 2.1 |
| `ui-tutorial` | Lời Dặn Trưởng Làng: chỉ tay từng bước, giới thiệu tính năng theo cấp | P2, P1 | S | todo | 2 | L | mục 2.2 |
| `ui-notify-center` | Việc Hôm Nay: chấm đỏ thống nhất, lời nhắc lịch, nhật ký thông báo | P2, P4 | S | todo | 7 | M | mục 2.3 |
| `ui-mobile-pass` | Rà soát điện thoại: vùng chạm ≥ 44px, chữ ≥ 15px, không tràn | P2 | M | todo | 7 | M | mục 2.4 |
| `ui-settings-sync` | Đồng bộ cài đặt tự đánh theo nhân vật; tùy chỉnh cỡ và vị trí nút cảm ứng | P2 | C | todo | 7 | M | mục 2.5 |
| `ui-item-compare` | So sánh nhanh với món đang mặc | P2 | C | todo | 3 | S | mục 2.6 |
| `ui-a11y` | Trợ năng: phóng chữ, giảm chuyển động, phân biệt độ hiếm không chỉ bằng màu, bàn phím, tên cho trình đọc màn hình (id mới) | P2, P5 | S | todo | 7 | M | mục 2.7 |
| `ui-portrait` | Màn dọc trên điện thoại | P2 | W | todo | 7 | L | mục 3.1 |
| `ui-i18n` | Đa ngôn ngữ | P2 | W | todo | 7 | L | mục 3.2 |

Lý do thêm 2 id: (a) `ui-hud-banners`: sáu đặc tả khác đã phân bổ biểu ngữ dưới giữa (`#hud-wb`, `#hud-defense`, `#hud-bf`, `#hud-cw`, `#hud-tower`, `#hud-trial`), mỗi cái tự đặt vị trí bằng CSS riêng như `body.ev-on #hud-arena`; không có bộ điều phối thì lần gộp lô 3-5 sẽ chồng nút. (b) `ui-a11y`: đề bài mục này yêu cầu trợ năng, danh mục chưa có id nào phủ; gộp vào `ui-settings` (đã `done`) sẽ làm sai trạng thái của nó.

### 0.2 Số đo hiện trạng (thư mục làm việc 18/10/2026, server riêng cổng 3790)

| Phép đo | Kết quả | Nguồn |
|---|---|---|
| `npm run test:e2e` máy tính 1280×720 | 55 ✔, 0 ✘, `E2E ĐẠT`, `OK no console errors` | `lab/ui05/e2e-d.log` |
| `npm run test:e2e` `MOBILE=1` 844×390 | 55 ✔, 0 ✘, `E2E ĐẠT`, `OK no console errors` | `lab/ui05/e2e-m.log` |
| Phần tử bấm được (ngoài `#hud-menu`) có vùng chạm hiệu dụng < 44px, tính cả `::after` lấn ra và nhãn `label` bao ngoài | **48/123** ở cả 844×390, 740×360, 667×375 (HUD 4, Hành trang 4, Nhân vật 9, Kỹ năng 4, Nhiệm vụ 1, Nhóm 3, Bạn bè 3, Gia tộc 1, Xếp hạng 5, Bản đồ 1, Hộp thư 1, Điểm danh 2, Vòng quay 3, Cài đặt 3, Thợ Rèn 1, Lễ hội 2, Thú cưng 1) | `lab/ui05/summary.txt` |
| Nút đóng cửa sổ `.win-head .x` trên điện thoại | 32×32 ở **16/16** cửa sổ đo được | như trên |
| Tràn ngang trang / cửa sổ ra ngoài khung nhìn | 0 ở mọi cửa sổ, mọi cỡ | như trên |
| Chữ dưới 15px trên điện thoại 844×390 | HUD 4 nút chữ (`#map-ping` 13px, `#map-info` 14px, `.qs` 14px, 1 nhãn 14px), Hành trang 9 (nhãn ô trang bị 14px), Kỹ năng 1 (`.sk-lv` 14px), Lễ hội 1 (`small` 13px) | `lab/ui05/fonts.json` |
| Hộp `ask()` trên 844×390 | khung 380×131, nút "Thôi"/"Hủy" 96×28; tiêu điểm đặt sẵn ở nút đồng ý **kể cả khi `danger`**, Enter là xác nhận hủy đồ; viền tiêu điểm màu xanh mặc định của trình duyệt | `lab/ui05/askbag.js`, `shot-ask-m.png` |
| Túi 100 ô (3 trang) trên 844×390 | nút trang `[data-invpage]` 103×24 / 97×24, **bị khung cửa sổ cắt nửa dưới** (phải cuộn mới thấy đủ) | `shot-bag-m.png` |
| Lỗi console khi mở 16 cửa sổ ở 4 cỡ màn | 0 | `mobile.json`, `desktop.json` |

### 0.3 Quy ước chung cho mọi giao diện (áp dụng cho mọi mục GDD khác)

| # | Quy ước |
|---|---|
| U1 | Mọi chuỗi từ người chơi vào DOM qua `h()` (text node). Thuộc tính `html` của `h()` (`ui/dom.js` dòng 20) chỉ dùng cho chuỗi hằng của mã, không bao giờ cho dữ liệu từ server hay người chơi. |
| U2 | Không dùng `alert/confirm/prompt`; hỏi lại bằng `await this.ask({ title, text, ok, cancel, danger, icon })`. Hành động mất đồ, mất tiền lượng, rời trận, rời gia tộc **phải** hỏi lại với `danger: true`. |
| U3 | Không thêm nút vào `#hud-menu` (16 nút). Không thêm phím chữ cái (đã hết, bảng 0.6). Lối vào mới: tab trong cửa sổ có sẵn, hội thoại NPC, dòng trong khối nhiệm vụ, nút ở chân cửa sổ Nhân vật, Lịch Sự Kiện. |
| U4 | Tab mới dùng thuộc tính riêng `data-<x>tab` (đã có `data-eqtab`, `data-smtab`, `data-rktab`, `data-shtab`; đã phân bổ `data-caltab`, `data-mktab`, `data-cltab`, `data-bftab`, `data-frtab`, `data-achtab`, `data-ptab`). `data-tab` chỉ dành cho màn đăng nhập. |
| U5 | Vùng chạm ≥ 44px trên `body.touch` (được dùng `::after` lấn ra để không phình bố cục). Ngoại lệ duy nhất: nút `#hud-menu`. Mọi cửa sổ mới phải qua `tests/e2e/ui-audit.js` (mục 2.4) trước khi gộp. |
| U6 | Chữ ≥ 15px ở mọi cỡ màn (đã ghi ở `DESIGN_RULES.md` mục 8 cho `.tiny`, nay áp cho mọi phần tử chữ, kể cả HUD). |
| U7 | Cỡ màn đo bắt buộc: 1280×720, 1280×700, 1280×681 (máy tính); 844×390, 740×360, 667×375 (điện thoại cảm ứng). Có `ui-a11y`: thêm phóng chữ 130% ở 1280×720 và 844×390. |
| U8 | Cửa sổ mới: `export default { renderX() {} }` trong `ui/windows/<x>.js`, gộp vào `UI.prototype`, thêm khóa ở **cuối** bảng `refresh()` (G3 của `specs/PLAN.md`); dựng lại theo khóa nội dung (như `questKey`) khi gói đến dồn dập để không nuốt cú bấm. |
| U9 | Thông báo (`notice`) ngắn, trung tính, tiếng Việt có dấu; thông báo từ server không nhắc phím tắt; ghi chú trong cửa sổ chỉ nhắc phím khi `!this.touch`. |
| U10 | Không emoji; icon giao diện qua `uiIconURL(name)`; icon mới thêm tên vào danh sách ở `DESIGN_RULES.md` mục 7. |
| U11 | Mọi trạng thái của nhân vật trước bị xóa ở `ui.reset()` khi đổi nhân vật hoặc đăng xuất (đã có cho thư, mã quà, lôi đài, lễ hội); tính năng mới có trạng thái giao diện riêng thì thêm dòng xóa vào `reset()`. |
| U12 | Thêm vẽ mới vào HUD hay lớp phủ: không cấp phát trong vòng lặp vẽ, cập nhật DOM tối đa 4 lần/giây trừ thanh máu; `npm run test:perf` giữ CPU ≤ 8ms/khung (`DESIGN_RULES.md` mục 10). |

### 0.4 Bản đồ khe HUD

| Khe | Phần tử hiện có | Đã phân bổ cho tính năng khác | Chủ sở hữu luật bố cục |
|---|---|---|---|
| Trên trái | `#hud-status` (`#avatar`, `#st-*`, `#bar-hp/mp/exp`), `#hud-buffs`, `#hud-party` | phân thân, hiệu ứng trạng thái chèn vào `#hud-buffs` (`specs/PLAN.md` mục 3) | `ui-hud` |
| Trên giữa | `#hud-target` (+ `#tg-cast`), `#hud-travel`, `#toasts` | lời dặn của `ui-tutorial` khi không có mục tiêu | `ui-hud` |
| Trên phải | `#hud-map` (`#minimap`, `#map-name`, `#map-ping`, `#map-info`), `#hud-quest` (khối nhiệm vụ, biểu ngữ lễ hội `.qt-season`) | dòng `.qt-cal` của Lịch Sự Kiện (`evt-calendar`) | `ui-hud` |
| Phải | `#hud-menu` 16 nút | không thêm nút | `ui-hud` |
| Dưới trái | `#hud-chat` (máy tính), `#hud-dpad` (cảm ứng) | | `ui-touch` |
| Dưới phải | `#hud-skills` (6 ô vòng cung, đánh thường, 2 bình, AUTO trên cảm ứng, bộ kỹ năng) | Ấn Kỹ phím 7 (`sig-thanhan`) | `ui-touch` |
| Dưới giữa | `#hud-event` (Tà Thú), `#hud-arena` | `#hud-wb`, `#hud-defense`, `#hud-bf`, `#hud-cw`, `#hud-tower`, `#hud-trial` | `ui-hud-banners` (mục 2.1) |
| Giữa màn | `#arena-cd` (đếm ngược) | | `pvp-arena` |

### 0.5 Lớp z-index

| Lớp | z | Ghi chú |
|---|---|---|
| canvas | 0 | |
| màn hình mở đầu | 10 | |
| HUD | 20 | |
| hội thoại NPC `#dialogs` | 45 | |
| cửa sổ `#windows` | 50 | |
| thông báo `#toasts` | 55 | |
| **Lời Dặn Trưởng Làng `#tut`** (mới, `ui-tutorial`) | **57** | trên cửa sổ để chỉ tay vào nút trong cửa sổ; dưới lời mời |
| lời mời `#invites`, chi tiết vật phẩm `.item-pop`, **thẻ lời nhắc** (`ui-notify-center`) | 60 | thẻ nhắc dùng chung `#invites` |
| menu người chơi `.pmenu` | 70 | |
| ảnh kéo thả ngọc | 75 | |
| màn trọng thương | 80 | |
| **hộp xác nhận `.ask-back`** | **90** | đã có trong mã, chưa ghi ở `DESIGN_RULES.md`: `ui-ask-dialog` thêm vào bảng |
| mất kết nối `#overlay-conn` | 100 | |

### 0.6 Phím tắt và lối vào cửa sổ

| Phím | Việc | Ghi chú |
|---|---|---|
| A D ← → | đi | |
| W ↑ Space | nhảy, nhảy đôi | S + Space: xuống bục |
| S ↓ | xuống | |
| J | đánh thường | |
| 1-6 | kỹ năng | **7** đã phân bổ cho Ấn Kỹ (`sig-thanhan`); 8, 9, 0 còn trống |
| Q E | bình HP / MP | |
| Z X | nhặt đồ / nói chuyện, vào cửa | |
| Tab | đổi mục tiêu | |
| F | tự động đánh | |
| T | tự tìm đường tới nhiệm vụ | |
| B (I) C V N P O G R M K L | Túi đồ, Nhân vật, Kỹ năng, Nhiệm vụ, Nhóm, Bạn bè, Gia tộc, Xếp hạng, Bản đồ, Thú cưng, Hộp thư | |
| H Y U | đã phân bổ: Chiến trường, Việc Làng, Thú cưỡi (`specs/PLAN.md` mục 6) | |
| Enter, Esc | chat; đóng cửa sổ, hủy tìm đường | |

Cả 26 chữ cái đã dùng hoặc đã phân bổ. Cửa sổ không có phím (Điểm danh, Vòng quay, Cài đặt, Lịch Sự Kiện, Danh hiệu, Kinh mạch, Chợ) mở bằng nút menu, nút trong cửa sổ khác, NPC hoặc dòng HUD.

### 0.7 Tài khoản thử và cổng chụp ảnh

| Tính năng | Tài khoản (thêm vào cuối `ADMINS` ở `tests/lib/harness.js` khi cần lệnh admin) | Cổng + `DATA_DIR` |
|---|---|---|
| `ui-ask-dialog` | `hoi_a` | 3671, `/tmp/ns-ask` |
| `ui-hud-banners` | `bieu_a` | 3672, `/tmp/ns-banner` |
| `ui-tutorial` | `tanthu_a, tanthu_b` (bot), `tanthu_d`, `tanthu_m` (trình duyệt) | 3673, `/tmp/ns-tut` |
| `ui-notify-center` | `nhac_a` | 3674, `/tmp/ns-notify` |
| `ui-mobile-pass`, `ui-a11y` | `ruaso_a` | 3675, `/tmp/ns-uiaudit` |
| `ui-settings-sync` | `caidat_a` (bot + 2 trình duyệt) | 3676, `/tmp/ns-prefs` |
| `ui-item-compare` | `sosanh_a` | 3677, `/tmp/ns-compare` |

---

## 1. Hệ thống đã có: hiện trạng và phần cần nâng

### 1.1 `ui-hud` — HUD (P2 · M · done)

**Mục đích**: mọi thông tin cần trong lúc đánh (máu, chakra, EXP, mục tiêu, buff, nhiệm vụ, bản đồ, sự kiện) đọc được trong một liếc mắt, không che vùng chơi giữa màn.

**Hiện trạng** (`ui/ui.js` `initHud`, `updateStatus`, `updateQuestTracker`, `updateTarget`, `drawMinimap`, `toast`; `css/hud.css`, `css/touch.css`):

| Hạng mục | Giá trị |
|---|---|
| Thanh trạng thái | avatar tròn vẽ bằng `drawPortrait`, huy hiệu cấp `#st-lv`, thanh `#bar-hp/mp/exp` (số có dấu chấm hàng nghìn), xu/lượng |
| Mục tiêu | `#hud-target`: cấp, tên, hệ, thanh máu, boss có `.boss`, cuồng nộ `.rage`, thanh niệm chiêu `#tg-cast` |
| Khối nhiệm vụ | nhiệm vụ chính + hằng ngày, bấm dòng để tự tìm đường (`travelVia`), nút `.qt-go`; chỉ dựng lại khi khóa nội dung (`questKey`) đổi; biểu ngữ lễ hội `.qt-season` |
| Chấm đỏ menu | Nhân vật (còn tiềm năng), Kỹ năng (còn điểm), Hộp thư (thư chưa đọc / còn quà), Điểm danh (lớp `.gift` khi chưa nhận hôm nay) |
| Thông báo | `toast(msg, kind)`: tối đa 4, gộp tin trùng liên tiếp, tắt sau 3,2 giây (loại `map`, `level` 2,2 giây); loại server gửi: `warn` (85 chỗ), `reward` (22), `world` (15), `quest` (6), `boss` (5), `level`, `info`; khi cửa sổ mở thì chuyển xuống đáy giữa |
| Biểu ngữ | `#hud-event` (Tà Thú), `#hud-arena` (lôi đài, nằm trên khi `body.ev-on`), `#arena-cd`; phó bản ghi đợt và giờ ở `#map-info` |
| Kiểm thử | `tests/e2e/e2e.js` (biểu ngữ Tà Thú, khung chờ lôi đài, tìm đường từ dòng nhiệm vụ, đổi bộ kỹ năng trên HUD), đạt 55/55 cả máy tính và điện thoại (mục 0.2) |

**Phần cần nâng** (không đổi trạng thái `done`):

| Việc | id xử lý |
|---|---|
| Bộ điều phối biểu ngữ dưới giữa cho 8 biểu ngữ | `ui-hud-banners` |
| Chấm đỏ thống nhất (thêm Nhiệm vụ, Thú cưng, Xếp hạng), lời nhắc lịch, nhật ký thông báo | `ui-notify-center` |
| Nút thu chat 34×30, `.qt-go` 28×26, bình thuốc 42×42, chữ `#map-ping` 13px, `#map-info` 14px, `.qs` 14px | `ui-mobile-pass` |
| Trình đọc màn hình đọc thông báo (`#toasts` `aria-live`) | `ui-a11y` |

**Tiêu chí chấp nhận (đang đạt)**: `npm run test:e2e` máy tính và `MOBILE=1` in `E2E ĐẠT` và `OK no console errors`; mọi id DOM của HUD trong `CLAUDE.md` có trong `src/client/index.html` (`grep -c 'id="hud-' src/client/index.html` ≥ 13).

### 1.2 `ui-windows` — Khung cửa sổ (P2, P1 · M · done)

**Hiện trạng**:

| Hạng mục | Giá trị |
|---|---|
| Khung | `frameWin(title, body, footer)`: băng lụa tiêu đề, nút đóng `.x`, thân `.win-body` cuộn dọc, chân `.win-foot`; khung `--frame-win` nền da `--leather` |
| Quản lý | một cửa sổ một lúc (`open` đóng cái cũ), `body.win-open`, nút menu đang mở có lớp `.open`; `refresh()` giữ vị trí cuộn; `close()` hủy giao dịch đang mở (trừ `silent`) |
| Bảng `refresh()` | 22 khóa: `inv, char, skill, quest, party, clan, rank, map, settings, shop, upgrade, trade, inspect, storage, friends, gift, wheel, evresult, pet, mail, event, arenares`; hội thoại NPC (`dialog.js`) xử lý ngoài bảng |
| Chi tiết vật phẩm | `.item-pop` (z 60), tự đóng khi món rời ô (`syncItemPop`) |
| Mở cửa sổ từ server | gói `openUi { ui, tab? }` (`upgrade`, `clan`, `event`, `rank`) |
| Đo điện thoại | 16 cửa sổ mở ở 844×390, 740×360, 667×375: không tràn ngang, không lòi khỏi khung nhìn, không lỗi console |

**Cửa sổ đã phân bổ tên** (theo đặc tả, thêm ở cuối bảng `refresh()` theo thứ tự gộp): `calendar` (`evt-calendar`), `market` (`eco-market`), `ach` (`soc-titles`), `battle` (`pvp-battlefield`), `caves` (`pve-caves`), `dailies` (`quest-dailies`), `meridian` (`sig-meridian`), `mount`, `wardrobe` (`pet-mountup`), `awaken` (`sig-thuctinh`), `tower`, `towerres` (`pve-thapvotan`). Tên mới phải khác các tên trên.

**Phần cần nâng**: nút đóng 32×32 và tab 24-26px trên điện thoại (`ui-mobile-pass`); `role="dialog"`, `aria-label`, viền tiêu điểm (`ui-a11y`).

**Tiêu chí chấp nhận (đang đạt)**: bảng `refresh()` có đủ 22 khóa trên (`awk '/^  refresh\(\)/,/^  }/' src/client/js/ui/ui.js | grep -o 'this\.render[A-Za-z]*' | wc -l` ≥ 22, đo ngày 18/10/2026 = 22); `lab/ui05/measure.js` mở 16 cửa sổ ở 4 cỡ màn không lỗi console, `offRight = offLeft = offTop = offBottom = 0`, `pageH = 0`.

### 1.3 `ui-touch` — Điều khiển cảm ứng (P2 · M · done)

**Hiện trạng** (`core/input.js`, `css/touch.css`):

| Hạng mục | Giá trị |
|---|---|
| Nhận biết | `matchMedia('(pointer: coarse)')` → `body.touch` |
| D-pad `#hud-dpad` | khung 236×196 dưới trái; trái/phải/nhảy 64px, xuống/nói chuyện/nhặt/đổi mục tiêu 46px; nút có `data-act`, nhấn giữ bằng `pointerdown` + `setPointerCapture` |
| Cụm kỹ năng | 6 ô vòng cung quanh nút đánh thường, 2 bình thuốc, nút AUTO 54px cạnh cụm, nút đổi bộ "Bộ" 44px; nhấn giữ 500ms mở bảng gán kỹ năng ở đúng ô |
| Màn dọc | `#rotate-hint.ingame` hiện khi `(orientation: portrait) and (pointer: coarse)` |
| Kiểm thử | `npm run test:e2e` `MOBILE=1` đạt 55/55 (đi, tự đánh, bộ kỹ năng, lôi đài) |

**Phần cần nâng**: bình thuốc 42×42 lên 44 (`ui-mobile-pass`); cỡ và vị trí nút do người chơi chỉnh (`ui-settings-sync`, ADR-05f-3); rung nhẹ khi bị boss đánh (`ui-a11y`, tắt mặc định).

**Tiêu chí chấp nhận (đang đạt)**: E2E `MOBILE=1` in `E2E ĐẠT`; nút `.dp` lớn 64px, nhỏ 46px (đo trong `lab/ui05/mobile.json`, không nút `.dp` nào trong danh sách nhỏ hơn 44).

### 1.4 `ui-settings` — Cài đặt (P2 · M · done)

**Hiện trạng** (`windows/settings.js`, `core/store.js` khóa `localStorage` `ns_settings`):

| Khóa | Mặc định | Miền | Nhóm |
|---|---|---|---|
| `autoHp` | 40 | 0-95 (%) | Tự động đánh |
| `autoMp` | 25 | 0-95 (%) | Tự động đánh |
| `autoRange` | 600 | 100-2000 | Tự động đánh |
| `autoPick` | bật | bật/tắt | Tự động đánh |
| `names` | bật | bật/tắt | Hiển thị |
| `sound` | bật | bật/tắt | Âm thanh |
| `musicVol`, `sfxVol` | 60, 80 | 0-100, bước 5 | Âm thanh (thanh trượt từ `feat/audio`, thuộc `snd-audio-files`) |
| `daynight` | 1 | 0 / 0,5 / 1 | Hiển thị |
| `shake` | bật | bật/tắt | Hiển thị |
| `chatTab` | `all` | tab chat | (không hiện trong cửa sổ) |

Cửa sổ còn có ô mã quà tặng, bảng phím điều khiển, nút "Đổi nhân vật" và "Đăng xuất". Đọc lỗi `localStorage` thì dùng mặc định (bọc `try/catch`).

**Phần cần nâng**: phần tự đánh theo nhân vật trên server (`ui-settings-sync`); nhóm "Trợ năng" (`ui-a11y`); nút "Xem lại hướng dẫn" (`ui-tutorial`); nhóm "Lời nhắc" (`ui-notify-center`); "Đổi nhân vật"/"Đăng xuất" 28px lên 44px (`ui-mobile-pass`).

**Tiêu chí chấp nhận (đang đạt)**: `S.settings` có đủ 11 khóa bảng trên với giá trị mặc định khi `localStorage` trống; `daynight` lạ bị đưa về 1 (`loadSettings`); cửa sổ Cài đặt mở ở 3 cỡ điện thoại không tràn (mục 0.2).

### 1.5 `ui-title` — Màn mở đầu (P1, P2 · M · done)

**Hiện trạng** (`main.js`, `render/titleart.js`, `css/screens.css`, phần `#screen-*` trong `index.html`): logo vẽ bằng canvas `#logo-cv`, khung "Cổng Làng Ninja" có 2 tab `[data-tab=login|register]`, `#in-user` (4-16 ký tự), `#in-pass`, `#in-pass2`, `#btn-login`, lỗi ở `#login-err` (`role="alert"`), trạng thái máy chủ `#server-status` từ `GET /api/status` (`ok, version, online, accounts`). Màn chọn nhân vật: thẻ `.char-card`, tạo nhân vật `#char-create` (tên 3-12 ký tự, giới tính, 6 thẻ phái `.class-card` có chỉ số `CLASS_STATS`, xem trước chạm để ra chiêu), hộp xóa nhân vật phải gõ lại tên.

**Phần cần nâng**: không có trong mục này (đoạn mở đầu cốt truyện thuộc `08-cot-truyen.md`; trạng thái máy chủ chi tiết thuộc `ops-monitoring`). Người chơi mới vào game lần đầu thì `ui-tutorial` bắt đầu.

**Tiêu chí chấp nhận (đang đạt)**: E2E đăng ký, tạo nhân vật, vào game ở cả 2 chế độ (mục 0.2); `tools/shot.js` với `screen: 'login'`, `'chars'`, `'create'` in `OK no console errors`.

### 1.6 `ui-ask-dialog` — Hộp xác nhận (P1, P2 · M · todo, nhánh `feat/bag`)

**Mục đích**: mọi câu hỏi "có chắc không" dùng khung gỗ sơn mài của game, chạy được trên điện thoại (hộp `confirm()` của trình duyệt chặn luồng, không theo phong cách, một số trình duyệt nhúng chặn hẳn).

**Đã làm** (`windows/dialog.js` `ask()`, `closeAsk()`; CSS `.ask-*` trong `windows.css`): trả `Promise<boolean>`; `text` là chuỗi hoặc mảng nút `h()`; Enter = đồng ý, Esc hoặc chạm ra ngoài = hủy; bắt phím ở pha capture để phím không lọt vào vòng lặp game; mở hộp mới thì hộp cũ trả `false`. Đang dùng ở 9 chỗ: hủy 1 món, hủy nhiều món, bán món có ngọc, mở rộng túi, tẩy tiềm năng, xóa bạn, nhường chức tộc trưởng, đuổi thành viên, rời gia tộc. Không còn `confirm(`, `alert(`, `prompt(` nào trong `src/client/js`. Thư mục làm việc (đợt tái cấu trúc chưa commit) đã mang sẵn `ask()` trong `windows/dialog.js` (vẫn `okBtn.focus()` ở dòng 135, tức còn lỗi A1); trạng thái giữ `todo` cho tới khi gộp lên `main` và sửa A1-A5.

**Lỗi đo được (phải sửa trước khi coi là xong)**:

| # | Lỗi | Sửa |
|---|---|---|
| A1 | Hộp `danger` đặt tiêu điểm sẵn vào nút đồng ý, Enter là hủy đồ ngay (đo: `enterOnDangerConfirms = true`) | `danger: true` → tiêu điểm vào nút "Thôi"; Enter kích hoạt **nút đang có tiêu điểm** (không mặc định đồng ý); hộp thường giữ như cũ |
| A2 | Nút 96×28 trên điện thoại | `body.touch .ask-btns .btn { min-height: 44px; min-width: 120px }` |
| A3 | Viền tiêu điểm xanh mặc định của trình duyệt (lệch phong cách) | `.ask-box .btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px }`, bỏ viền khi tiêu điểm do chạm |
| A4 | Lớp 90 chưa ghi trong `DESIGN_RULES.md` | thêm "hộp xác nhận 90" vào bảng lớp z-index mục 8 |
| A5 | Tab thoát được ra ngoài hộp | Tab/Shift+Tab xoay vòng giữa 2 nút (bẫy tiêu điểm) |

**Luồng**: hành động nguy hiểm → `await this.ask({ title, text, ok, cancel, danger })` → người chơi chọn → chỉ khi `true` mới `net.send`. Server vẫn kiểm tra như không có hộp (hộp chỉ chống bấm nhầm, không phải bảo mật).

**Dữ liệu, gói, server**: không có.

**DOM**: `.ask-back` > `.ask-box[role=alertdialog][aria-modal=true]` > `.ask-head`, `.ask-text`, `.ask-btns` (`[data-act=ask-cancel]`, `[data-act=ask-ok]`).

**Bố cục điện thoại**: giữa màn, rộng `min(420px, 92vw)`, chữ thân 18px, danh sách món (`.ask-list`) tối đa 8 dòng rồi "và n loại khác", nút 44px.

**Tiêu chí chấp nhận**:
1. `grep -rnE "\b(confirm|alert|prompt)\(" src/client/js | grep -v '//'` không có kết quả (đo ngày 18/10/2026: chỉ còn 1 dòng chú thích ở `windows/dialog.js` dòng 114).
2. `tests/e2e/ui-audit.js` cảnh "ask": nút cao ≥ 44 ở 844×390, 740×360, 667×375; hộp nằm gọn trong khung nhìn.
3. Cảnh "ask-danger": mở `ask({ danger: true })`, nhấn Enter → kết quả `false`; mở `ask({})`, nhấn Enter → `true`; Esc → `false`; chạm nền → `false`.
4. `bagTest` của `tests/features/inventory.js` đạt (đường `discardMany` sau hộp hỏi lại); `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`.
5. Đã gộp lên `main` (`ops-commit-restructure`); `DESIGN_RULES.md` có lớp 90.

**Kiểm thử**: `tests/e2e/ui-audit.js` (mới: `ui-ask-dialog` dựng khung chung với cảnh `ask`, `ask-danger`, theo quy tắc đo mục 2.4; chỉnh khi ghép), `tests/features/inventory.js` (có).

### 1.7 Giao diện túi chia trang (luật hiển thị cho `ui-bag-expand`, `ui-bag-bulkdrop`)

Sổ tính năng của hai id này nằm ở `05-he-thong-trang-bi.md` mục 3.4; mục này chỉ chốt luật giao diện để `ui-mobile-pass` kiểm.

| Luật | Giá trị |
|---|---|
| Trang | 40 ô một trang (`INV_PAGE`), lưới 8 cột; túi ≤ 40 ô thì không có thanh trang |
| Ô khóa | trang cuối chưa đủ 40 ô lấp `.slot-locked`; bấm (khi còn mở rộng được) hỏi bằng `ask()` |
| Nút trang | `[data-invpage=n]` ghi "Trang n" + `đã dùng/tổng` (đỏ khi đầy), lúc đang chọn hủy nhanh ghi `✓n` |
| Đổi trang | giữ trang đang xem khi túi đổi (`this.invPage`), nhớ trong phiên, không lưu |
| **Sửa (đo được)** | ở 844×390 thanh trang bị khung cắt nửa dưới: chuyển thanh trang vào **chân cửa sổ** (`.win-foot`, cạnh dòng tiền) hoặc cố định đáy `.inv-right`; nút trang cao 44px trên cảm ứng, rộng tối thiểu 88px |
| Chế độ hủy nhanh | thanh trên đổi thành "Đã chọn n", "Chọn đồ thường", "Hủy n món" (`danger`), "Xong"; nút 44px trên cảm ứng |

Chủ sửa: worker của `ui-mobile-pass` (file `css/windows.css`, `css/touch.css`, `windows/inventory.js` 1 dòng đổi nơi gắn thanh trang), báo lại cho chủ `05-he-thong-trang-bi.md`.

---

## 2. Hệ thống mới

### 2.1 `ui-hud-banners` — Dải biểu ngữ dưới giữa (P2, P4 · S · todo · GĐ 4)

**Mục đích**: người chơi luôn thấy việc quan trọng nhất đang diễn ra (trận của mình, boss thế giới) mà không có hai viên chồng lên nhau hay đè nút. Phục vụ P2 (đọc được trong một liếc), P4 (hoạt động đông người có lối vào rõ).

**Luồng người chơi**: một sự kiện bắt đầu → viên của nó trượt lên dải dưới giữa. Có hai việc cùng lúc (ví dụ đang chờ ghép lôi đài khi Hung Tinh giáng thế) → hai viên xếp chồng, viên quan trọng hơn nằm dưới (gần ngón cái). Có viên thứ ba → viên trên cùng hiện nút tròn `+1`; chạm vào thì đưa viên ẩn lên thay trong 10 giây. Mở cửa sổ hoặc hội thoại → cả dải ẩn (như hiện nay).

**Quy tắc**:

| Mức ưu tiên (số nhỏ nằm dưới) | Viên | Khi nào |
|---|---|---|
| 1 | `#hud-arena` (`.prep/.fight/.end`), `#hud-tower`, `#hud-trial`, `#hud-bf` (đang trong trận), `#hud-cw` (đang trong trận), `#hud-defense` (đang ở bản đồ phòng thủ) | người chơi đang trong trận/phòng của chính mình |
| 2 | `#hud-wb`, `#hud-event` | boss thế giới / Tà Thú đang diễn ra |
| 3 | `#hud-arena.queue`, `#hud-bf` (đang đăng ký), `#hud-cw` (đang đăng ký) | đang chờ |
| 4 | `#hud-event.done` ("Xem bảng sát thương" 2 phút) | kết quả sau sự kiện |

- Cùng mức thì viên bật trước nằm dưới.
- Số viên hiện tối đa: máy tính 2; cảm ứng cao ≥ 375px: 2; cảm ứng cao < 375px: 1. Phần còn lại ẩn, viên trên cùng có nút `+n` (`[data-act=bn-more]`, 44×44 trên cảm ứng).
- Khoảng cách dọc giữa 2 viên: 6px; đáy viên dưới: máy tính 8px, cảm ứng 6px (giữ như `#hud-event` hiện tại).
- Ngang: máy tính giữa màn, rộng tối đa `min(420px, 40vw)`; cảm ứng nằm giữa mép phải D-pad (`left: 240px`) và bình thuốc (`right: 310px`, màn thấp ≤ 520px `272px`), giữ các luật co chữ đã có ở `DESIGN_RULES.md` mục 8.
- Ẩn khi `body.win-open` hoặc `body.dlg-open`; khi lời dặn `#tut` đang chỉ vào một viên thì viên đó không bị ẩn bởi `+n`.
- Viên chỉ đổi chỗ khi tập viên đổi (không nhảy theo từng giây đếm ngược).

**Dữ liệu**: không có dữ liệu game; bảng mức ưu tiên là luật giao diện trong `ui/banners.js` (không phải số cân bằng nên không vào `src/shared/data`).

**Gói client↔server**: không gói mới; các gói hiện có (`event`, `arena`, và `wb`, `bf`, `cw`, `defense`, `tower`, `trial` của đặc tả khác) chỉ gọi `this.dock.set(id, state)` thay vì tự thêm lớp `body.*-on`.

**Module, cửa sổ, DOM**:

| Phần | Nội dung |
|---|---|
| File mới | `src/client/js/ui/banners.js` (vùng HUD & khung cửa sổ): `export class BannerDock { constructor(root) ; set(id, { prio, on }) ; reflow() ; more() }` |
| `ui/ui.js` | tạo `this.dock = new BannerDock($('#hud'))` trong `initHud`; `setEvent`, `setArena` gọi `this.dock.set(id, { prio, on })`; `reset()` gọi `this.dock.clear()` |
| CSS | `hud.css`: mỗi viên dùng `bottom: var(--bn-y, 8px)`; bỏ `body.ev-on #hud-arena { bottom: 62px }` sau khi dock chạy; `touch.css` tương tự |
| DOM mới | `[data-act=bn-more]` (nút `+n`), biến CSS `--bn-y` trên từng viên; không đổi id các viên |
| Hợp đồng cho đặc tả khác | viên mới phải: là con trực tiếp của `#hud`, có lớp `.bn`, không đặt `bottom` cứng, gọi `ui.dock.set('<id>', { prio, on })` |

**Bố cục điện thoại**: 2 viên cao 44px + khe 6px = 94px, nằm dưới mép trên D-pad (D-pad cao 196px) và không chạm vòng cung kỹ năng; ở 667×375 khoảng ngang ~117px (667 − 240 − 310) nên viên ở cỡ này chỉ hiện đồng hồ và nút (ẩn tên như luật ≤ 729px hiện có).

**Chống gian lận**: chỉ hiển thị; nút trong viên chỉ gửi ý định đã có (`arenaCancel`, `arenaLeave`, `goEvent`), server kiểm như cũ.

**Tiêu chí chấp nhận**:
1. `tests/e2e/ui-audit.js` cảnh "banners": bật giả 3 viên (`#hud-event`, `#hud-arena.queue`, một viên mức 1 tạo bằng `ui.dock.set` trên phần tử thử) ở 6 cỡ màn của U7: hình chữ nhật các viên đang hiện không giao nhau, không giao `.sbtn`, `.dp`, `#hud-skills .mbtn.auto`, `#hud-chat.collapsed`; số viên hiện ≤ 2 (≤ 1 khi cao < 375); có đúng 1 nút `[data-act=bn-more]` cao ≥ 44 trên cảm ứng.
2. Mở cửa sổ bất kỳ → mọi viên có `getComputedStyle(el).visibility === 'hidden'` hoặc `display: none`.
3. `grep -n "ev-on" src/client/css/*.css` không còn quy tắc vị trí cho `#hud-arena`.
4. `npm run test:e2e` máy tính và `MOBILE=1` vẫn `E2E ĐẠT` (bước biểu ngữ Tà Thú, khung chờ lôi đài).
5. `DESIGN_RULES.md` mục 8 thêm đoạn "Dải biểu ngữ dưới giữa" (bảng mức ưu tiên, số viên tối đa, hợp đồng `.bn`).

**Kiểm thử**: `tests/e2e/ui-audit.js` (cảnh `banners`), `tests/e2e/e2e.js` (có).

### 2.2 `ui-tutorial` — Lời Dặn Trưởng Làng (P2, P1 · S · todo · GĐ 2)

**Mục đích**: người mới (chân dung Mai: điện thoại, ít kiên nhẫn với chữ dài) học điều khiển trong 5 phút đầu bằng **chỉ tay vào đúng nút**, không phải đọc trang hướng dẫn; tính năng lớn được giới thiệu đúng lúc mở (cấp 5, 10, 15, 20) thay vì 16 nút cùng đòi chú ý ngay từ đầu. Trưởng Làng của làng xuất phát nói bằng giọng "ta - ngươi" (P1).

**Luồng người chơi**:
1. Nhân vật mới vào game lần đầu: bong bóng lời dặn có chân dung Trưởng Làng hiện ở trên giữa, bàn tay pixel chỉ vào nút cần bấm, vòng sáng quanh nút.
2. Người chơi làm đúng việc → bước sau hiện ngay; không làm trong 45 giây → bàn tay thu nhỏ thành chấm nhấp nháy cạnh nút, bong bóng thu về một dòng (không chặn chơi).
3. Mọi lúc có nút "Bỏ qua hướng dẫn" (44px). Bỏ qua thì không hỏi lại; bật lại ở Cài đặt → "Xem lại hướng dẫn".
4. Khi lên cấp mở tính năng: thẻ "Mở khóa" (thông báo loại `unlock`, viền vàng) + bàn tay chỉ vào nút liên quan 6 giây, mỗi thẻ hiện một lần trong đời nhân vật.
5. Nút menu của tính năng chưa đến cấp hiện mờ (độ mờ 0,5) kèm huy hiệu nhỏ "Lv N"; **vẫn bấm được** và cửa sổ mở bình thường (cổng cấp thật vẫn do server kiểm). Bỏ qua hướng dẫn thì hết mờ.

**Quy tắc — các bước** (dữ liệu `TUTORIAL.steps`, id chuỗi ổn định, không dựa vào chỉ số nhiệm vụ):

| # | id | Bắt đầu khi | Chỉ vào (máy tính / cảm ứng) | Lời dặn (≤ 120 ký tự) | Xong khi (máy khách quan sát) |
|---|---|---|---|---|---|
| 1 | `move` | vào game lần đầu | phím A/D hiện trên bong bóng / `.dp[data-act=left]`, `right` | "Ngươi tới rồi. Bước thử vài bước cho quen chân nào." | nhân vật đi ≥ 120 đơn vị |
| 2 | `jump` | xong `move` | phím W / `.dp[data-act=jump]` | "Ninja phải nhẹ như chim. Nhảy lên, nhảy thêm lần nữa giữa không trung!" | có 1 lần nhảy đôi hoặc 3 lần nhảy |
| 3 | `talk` | xong `jump` | Trưởng Làng trên bản đồ (tọa độ canvas qua `game.screenOf`) / nút `.dp[data-act=talk]` khi đã đứng gần | "Lại đây nói chuyện với ta, ta có việc giao cho ngươi." | hội thoại NPC `elder` mở |
| 4 | `quest` | đã nhận nhiệm vụ chính đầu tiên | dòng `.qt.main` trong `#hud-quest` | "Chạm vào dòng nhiệm vụ, chân ngươi sẽ tự tìm đường." | bắt đầu tự tìm đường hoặc tiến độ nhiệm vụ tăng |
| 5 | `attack` | có quái trong tầm 200 | `.sbtn.basic` / phím J | "Gặp quái thì ra đòn! Đánh thường không tốn chakra." | gây sát thương lần đầu |
| 6 | `equip` | túi có trang bị mặc được mà ô đó trống | nút menu `.m-inv`, rồi ô món đó, rồi nút "Trang bị" | "Ta vừa tặng ngươi đồ mới. Mở túi và mặc vào đi." | `S.equip` có thêm món |
| 7 | `potion` | máu < 50% lần đầu | `.sbtn.pot.hp` / phím Q | "Máu xuống rồi! Uống bình sinh lực ngay." | dùng bình |
| 8 | `auto` | đã hạ 3 quái | `.mbtn.auto` / phím F | "Đánh mãi mỏi tay? Bật tự động, ta trông chừng cho." | bật tự đánh |
| 9 | `stat` | `me.potential > 0` | `.m-char`, rồi nút cộng điểm | "Lên cấp có điểm tiềm năng. Cộng vào chỉ số hợp với phái của ngươi." | tiềm năng giảm |
| 10 | `skill` | `me.skillPoints > 0` | `.m-skill`, rồi nút học | "Có điểm kỹ năng rồi. Học chiêu mới và gán vào ô." | điểm kỹ năng giảm |
| 11 | `map` | nhiệm vụ cần sang bản đồ khác lần đầu | `.m-map` / phím M | "Thế giới rộng lắm. Mở bản đồ, chọn nơi cần đến rồi bấm Đi tới." | mở bản đồ thế giới |
| 12 | `done` | xong `map` | không chỉ | "Ngươi đã sẵn sàng. Có gì còn vướng, mở Cài đặt để xem lại lời ta dặn." | tự đóng sau 6 giây |

Bước có thể xong không theo thứ tự (ví dụ người chơi tự bật AUTO trước): bước đã đạt điều kiện "xong" thì bỏ qua khi tới lượt.

**Quy tắc — giới thiệu tính năng theo cấp** (`TUTORIAL.unlocks`, cấp lấy từ `FEATURE_LV` để không lệch cổng thật của server):

| Khóa | Cấp | Nút chỉ vào | Lời giới thiệu |
|---|---|---|---|
| `social` | `FEATURE_LV.worldChat` = 5 | `.m-party`, `#chat-toggle` | "Từ nay ngươi nói được trên kênh Thế giới và giao dịch với người khác." |
| `dungeon` | `FEATURE_LV.dungeon` = 10 | dòng nhiệm vụ / NPC Hộ Pháp | "Hang Động Thử Thách đã mở. Gặp Hộ Pháp, mỗi ngày 3 lượt." |
| `pk` | `FEATURE_LV.pk` = 10 | `.mbtn.pk` | "Ngươi đủ lớn để bật chế độ PK. Cẩn thận, hạ người lương thiện sẽ mang tiếng ác." |
| `rank` | 10 | `.m-rank` | "Xem thứ hạng của mình trên Bảng Xếp Hạng." |
| `clan` | `FEATURE_LV.clanCreate` = 15 | `.m-clan` | "Ngươi có thể lập gia tộc của riêng mình, hoặc xin vào một gia tộc." |
| `arena` | `FEATURE_LV.arena` = `ARENA.minLv` = 20 | `.m-rank` (tab Lôi đài) | "Lôi đài xếp hạng đã mở. Thắng để lên điểm, cuối tuần có thưởng." |
| `pet` | khi lần đầu có thú cưng trong túi | `.m-pet` | "Thú nhỏ này sẽ theo ngươi, nhặt đồ và giúp ngươi đánh." |

Mờ nút menu: Nhóm, Bạn bè, Vòng quay mờ dưới cấp 5; Xếp hạng, PK mờ dưới cấp 10; Gia tộc mờ dưới cấp 15; Thú cưng mờ khi chưa từng có thú. Túi đồ, Nhân vật, Kỹ năng, Nhiệm vụ, Bản đồ, Hộp thư, Điểm danh, Cài đặt, AUTO không bao giờ mờ.

**Hợp nhất cổng cấp**: thêm `FEATURE_LV = { worldChat: 5, trade: 5, pk: 10, pvpMap: 10, dungeon: 10, clanCreate: 15, teleFee: 20 }` vào `src/shared/constants.js`; các module đang dùng số cứng đổi sang đọc hằng (`chat` dòng 23, `trade` dòng 18, `pk` dòng 15, `movement` dòng 99/129/136, `dungeon` `MIN_LV`, `clan` `CLAN_LV`); lôi đài giữ `ARENA.minLv`. `core/gamedata.js` gửi `featureLv` trong gói `data`. Việc này không đổi luật chơi (cùng số).

**Dữ liệu**:

| File | Nội dung |
|---|---|
| `src/shared/data/tutorial.js` (mới) | `TUTORIAL = { idle: 45, steps: [{ id, start, target: { pc, touch }, text, done }], unlocks: [{ k, lv \| need, target, text }] }`; `start`/`done` là tên điều kiện trong một danh sách cố định (`first`, `after:<id>`, `dialog:elder`, `questAccepted`, `mobNear`, `equipable`, `hpBelow50`, `kills3`, `potential`, `skillPoints`, `mapNeed`, `moved120`, `jumped`, `travel`, `hit`, `equipped`, `potionUsed`, `autoOn`, `potentialSpent`, `skillSpent`, `worldMapOpen`, `timer6`) |
| `src/shared/constants.js` | `FEATURE_LV` (trên) |
| `tools/check-data.js` | id bước duy nhất; `start`/`done` thuộc danh sách cố định; `target` thuộc danh sách bộ chọn cho phép; `text` ≤ 120 ký tự, không chữ tiếng Anh trong danh sách cấm (`level up`, `ok`, `skip`); `unlocks[].lv` khớp `FEATURE_LV`/`ARENA.minLv` |

**Gói client↔server**:

| Hướng | Gói | Trường | Kiểm tra server |
|---|---|---|---|
| C→S | `tut` | `{ a: 'step', step }` | `step = int(m.step)`, nhận khi `cur < step ≤ steps.length` (chỉ tăng) |
| C→S | `tut` | `{ a: 'skip' }` | đặt `skip = true` |
| C→S | `tut` | `{ a: 'reset' }` | `step = 0, skip = false` (giữ `seen`) |
| C→S | `tut` | `{ a: 'seen', k }` | `k = clean(m.k, 16)` phải là khóa trong `TUTORIAL.unlocks` (tra bằng `find`, không tra object), chưa có trong `seen`, và nhân vật đủ điều kiện mở |
| S→C | `me.tut` | `{ step, skip, seen }` | qua móc `selfData` |
| S→C | `data.tutorial`, `data.featureLv` | dữ liệu tĩnh | móc `clientData` |

Giới hạn: mỗi người tối đa 1 gói `tut` / 300ms (`p.tutAt`), sai thì bỏ qua im lặng.

**Module server, cửa sổ client, DOM**:

| Phần | Nội dung |
|---|---|
| Module mới | `src/server/modules/tutorial/index.js`: `name: 'tutorial'`, `actions: { tut }`, `hooks: { sanitize, selfData, clientData }`; một dòng ở cuối `modules/index.js` |
| `sanitize(c)` | `c.tut = { step: int 0..N, skip: bool, seen: [khóa hợp lệ, không trùng, ≤ 16] }`; nhân vật cũ chưa có `c.tut` mà cấp ≥ 5 hoặc đã qua nhiệm vụ chính thứ 3 → `skip: true` (không làm phiền người chơi cũ) |
| Máy khách | `src/client/js/ui/windows/tutorial.js` (mới, gộp vào `UI.prototype`): `tutInit()`, `tutTick()` (gọi từ `UI.frame()`, tối đa 4 lần/giây, chỉ đọc `S.me`, `S.inv`, `S.equip`, `this.game`), `tutShow(step)`, `tutUnlock(k)`; không cần sửa vòng lặp game ngoài 1 hàm `game.screenOf(x, y)` (đổi tọa độ thế giới sang px màn hình, vùng Vòng lặp game, ≤ 8 dòng) |
| Icon | tên giao diện mới `point` (bàn tay pixel chỉ xuống, viền `#120804`, ống tay áo đỏ sơn mài) trong `render/icons/ui.js`; thêm vào danh sách tên icon ở `DESIGN_RULES.md` mục 7 |
| DOM mới | `#tut` (tạo bằng JS, gắn vào `body`, z 57, `pointer-events: none` trừ bong bóng), `.tut-bubble` (chân dung canvas 48px + lời dặn + nút), `.tut-hand`, `.tut-ring`, `[data-act=tut-skip]`, `[data-act=tut-hide]`; Cài đặt thêm `[data-act=tut-reset]`; nút menu mờ có lớp `.mbtn.later` + `data-lv` |
| `ui.reset()` | xóa `#tut` và trạng thái bước của nhân vật trước |

**Bố cục điện thoại**: bong bóng rộng `min(360px, 46vw)` ở trên giữa (`top: 86px`, ngay dưới khung trạng thái), nếu nút đích nằm ở nửa trên màn thì bong bóng xuống đáy giữa, trên dải biểu ngữ. Bong bóng không bao giờ phủ tâm của `.dp`, `.sbtn`, `#hud-menu .mbtn`. Bàn tay 40px, đặt chéo trên-trái nút đích, không che chữ trên nút. Chế độ giảm chuyển động (`ui-a11y`): vòng sáng đứng yên, bàn tay không nhún.

**Chống gian lận, nhân bản**: hướng dẫn **không phát thưởng** (thưởng vẫn đến từ nhiệm vụ chính như cũ), nên khai báo bước sai từ máy khách không đem lại gì. Server chỉ nhận bước tăng dần, khóa `seen` thuộc danh sách cố định, không tra object bằng khóa của máy khách (chặn `__proto__`). Cổng cấp thật vẫn ở module tương ứng.

**Tiêu chí chấp nhận**:
1. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` gồm `tutorialUnitTests` (`cleanTut`: dữ liệu rác, `step` âm/quá lớn/chuỗi, `seen` có `'__proto__'` và khóa lạ bị bỏ; nhân vật cũ cấp 30 thành `skip: true`) và `tutorialTest` (bot `tanthu_a`: nhân vật mới có `me.tut.step === 0 && !me.tut.skip`; `step 3` → 3; `step 2` → vẫn 3; `step 999` → vẫn 3; `seen 'clan'` ở cấp 1 → không thêm; `/lv 15` rồi `seen 'clan'` → có; `skip` → `skip: true`; 20 gói trong 1 giây → tối đa 4 được nhận).
2. `npm run check` sạch, gồm khối kiểm `TUTORIAL`; `grep -nE "p\.lv < (5\|10)\|CLAN_LV = 15\|MIN_LV = 10" src/server/modules` không có kết quả.
3. `tests/e2e/tutorial.js` (máy tính `tanthu_d` và `MOBILE=1` `tanthu_m`): `#tut` hiện trong 3 giây sau khi vào game; đi phải 1,5 giây → bước ≥ 1; nhảy đôi → bước ≥ 2; đi tới Trưởng Làng và mở hội thoại → bước ≥ 3; bấm "Bỏ qua hướng dẫn" → `#tut` biến mất; tải lại trang → `#tut` không hiện; Cài đặt → "Xem lại hướng dẫn" → `#tut` hiện bước 1; tại tâm mọi `.dp` và `.sbtn` đang hiện, `document.elementFromPoint` trả về chính nút đó (lời dặn không chặn thao tác); in `OK no console errors`.
4. `tests/e2e/ui-audit.js` cảnh `tut`: nút trong bong bóng ≥ 44px, bong bóng nằm gọn khung nhìn ở 3 cỡ điện thoại.
5. `npm run test:perf` không giảm quá 1 khung hình/giây so với lần đo trước; `tutTick` trung bình ≤ 0,2ms (đo bằng `performance.now()` trong `tests/e2e/tutorial.js`).
6. Ảnh `tools/shot.js` bước `talk` và thẻ mở khóa `clan` ở 1280×720 và `mobile: true` in `OK no console errors`; `DESIGN_RULES.md` mục 8 thêm đoạn "Lời Dặn Trưởng Làng" (vị trí, z 57, không chặn nút).

**Kiểm thử**: `tests/features/tutorial.js` (mới), `tests/e2e/tutorial.js` (mới), `tests/e2e/ui-audit.js`.

### 2.3 `ui-notify-center` — Việc Hôm Nay và lời nhắc (P2, P4 · S · todo · GĐ 7)

**Mục đích**: người chơi giờ rảnh (Mai) mở game 10 phút là biết ngay còn việc gì có thưởng hôm nay; người chơi canh sự kiện (Khải) được nhắc trước 5 phút mà không phải canh đồng hồ; một nút có chấm đỏ luôn nghĩa là "có việc để làm ở đây". Không thêm nút menu (U3).

**Luồng người chơi**:
1. Nút menu có chấm đỏ → bấm → cửa sổ đó, việc cần làm nằm trên cùng.
2. Dòng lịch `.qt-cal` trong khối nhiệm vụ (của `evt-calendar`) → Lịch Sự Kiện → tab mới **"Việc hôm nay"** (`[data-caltab=todo]`, mặc định khi còn việc chưa xong) liệt kê việc còn lượt, mỗi dòng có nút "Đi" (tự tìm đường tới NPC) hoặc "Mở" (mở cửa sổ).
3. 5 phút trước một sự kiện có trong lịch mà người chơi đủ cấp: thẻ nhắc hiện trong `#invites` ("Hung Tinh giáng thế sau 5 phút · Rừng Trúc"), nút "Đi tới" và "Tắt nhắc"; tự ẩn sau 20 giây. Lúc sự kiện bắt đầu, nhắc lần hai nếu chưa tắt.
4. Tab "Việc hôm nay" có thêm mục "Thông báo gần đây" (30 thông báo cuối của phiên, giờ Việt Nam) để đọc lại thông báo đã trôi.

**Quy tắc — chấm đỏ** (một hàm `updateBadges()` thay 4 dòng rời trong `updateStatus`; chấm đỏ là `.mbtn.dot` 11px đã có, không hiện số):

| Nút | Điều kiện | Nguồn dữ liệu | Trạng thái |
|---|---|---|---|
| Nhân vật | `me.potential > 0` | `me` | có |
| Kỹ năng | `me.skillPoints > 0` | `me` | có |
| Hộp thư | `me.mail.n > 0 \|\| me.mail.g > 0` | `me.mail` | có |
| Điểm danh | `me.checkin.day !== vnDay()` (giữ hiệu ứng `.gift`) | `me.checkin` | có |
| Nhiệm vụ | nhiệm vụ chính xong chưa trả, hoặc đủ cấp nhận mà chưa nhận, hoặc nhiệm vụ hằng ngày xong chưa trả (cùng điều kiện `npcMark` của `game.js`) | `me.quest`, `me.daily` | mới |
| Thú cưng | thú đang mang có `love < S.G.pet.sulk` (đang dỗi) | `S.equip.pet`, `S.G.pet` | mới |
| Xếp hạng | cấp ≥ `ARENA.minLv`, từ thứ Sáu tới Chủ Nhật (giờ VN), số trận tuần `me.arena.wn < S.G.arena.weeklyMin` | `me.arena`, `S.G.arena` | mới |
| Gia tộc | việc tộc còn lượt (khi `clan-war` có `c.ctask`) | `me.ctask` | khi `clan-war` gộp |

**Quy tắc — tab "Việc hôm nay"** (chỉ hiện dòng có dữ liệu trong `S.G`; dòng xong xếp cuối, mờ):

| Dòng | Tiến độ | Nút |
|---|---|---|
| Điểm danh | đã / chưa | "Mở" → `gift` |
| Nhiệm vụ hằng ngày | `daily.done / S.G.daily.max` | "Đi" → Tiểu Nhị (`travelDaily`) |
| Hang Động Thử Thách | `dungeon.runs / S.G.dungeon.daily` (cấp ≥ `FEATURE_LV.dungeon`) | "Đi" → Hộ Pháp |
| Lôi đài tuần | `arena.wn / weeklyMin` (cấp ≥ 20) | "Mở" → `rank` tab `arena` |
| Thư còn quà | `mail.g` | "Mở" → `mail` |
| Lễ hội | số token, đổi được món rẻ nhất chưa | "Mở" → `event` |
| Việc Làng | khi `quest-dailies` có `S.G.dailies` | "Đi" theo đặc tả `dailies.md` |
| Sự kiện kế tiếp | tên + giờ từ `S.G.calendar` | "Đi" khi đang diễn ra (`goEvent`) |

**Quy tắc — lời nhắc**:
- Nguồn: dòng `S.G.calendar` có `excl` hoặc `remind: true` (Hung Tinh, Tà Thú, Thủ Hộ Làng, Chiến Trường, chiến gia tộc). Giờ Vàng không nhắc mặc định.
- Thời điểm: `T − 5 phút` và `T`, tính theo giờ VN có `S.skew`. Mỗi cặp (dòng, khung giờ) nhắc tối đa 1 lần mỗi mốc.
- Không nhắc khi: người chơi dưới cấp tối thiểu của dòng; đang trong trận (`S.arena.st` là `prep/fight/end`), đang ở bản đồ `instance`; đã tắt nhắc dòng đó.
- Cài đặt: nhóm "Lời nhắc" trong Cài đặt, mỗi loại sự kiện một công tắc (`label.set-row` 44px), lưu ở `S.settings.remind = { <khóa dòng>: bool }` (cục bộ thiết bị).
- Âm thanh: `sfx('remind')` nếu có trong `EVENT_SFX`, không có thì `sfx('quest')`.

**Dữ liệu**: không thêm file dữ liệu. Cần 2 dòng `clientData` (không chép số vào máy khách): `modules/dungeon` gửi `out.dungeon = { daily: DAILY_RUNS, minLv: FEATURE_LV.dungeon }`; `modules/quest` gửi `out.daily = { max: 20 }` (hằng `DAILY_MAX` trong module, thay cho số 20 đang ghi cứng ở `game.js` `npcMark`). Lịch lấy từ `S.G.calendar` của `evt-calendar`; dòng lịch có thể thêm trường `remind: true`.

**Gói client↔server**: không có gói mới. Mọi số đã có trong `me` (`checkin`, `daily`, `dungeon`, `quest`, `mail`, `arena`).

**Module, cửa sổ, DOM**:

| Phần | Nội dung |
|---|---|
| Máy khách mới | `src/client/js/ui/windows/notify.js`: `updateBadges()`, `remindTick()` (gọi từ `UI.frame()` mỗi 1 giây), `renderTodo()`, `logNotice(m)` |
| `ui/ui.js` | thay 4 dòng chấm đỏ bằng `this.updateBadges()`; `n.on('notice')` thêm `this.logNotice(m)`; `reset()` xóa nhật ký và mốc đã nhắc |
| `windows/calendar.js` (của `evt-calendar`) | thêm tab `[data-caltab=todo]` gọi `this.renderTodo()` (sửa sau khi `evt-calendar` đã gộp, ghi trong báo cáo theo mục 2 của `CLAUDE.md`) |
| `windows/settings.js` | nhóm "Lời nhắc" |
| DOM mới | `.invite.remind` trong `#invites` với `[data-act=remind-go]`, `[data-act=remind-off]`; `.todo-row` có `[data-act=todo-go]`; `.nlog` (nhật ký) |

**Bố cục điện thoại**: thẻ nhắc dùng đúng vị trí của thẻ lời mời (`#invites`, trên phải dưới bản đồ nhỏ, `top: 86px` ở màn thấp), rộng tối đa 300px, 2 nút 44px; không quá 1 thẻ nhắc cùng lúc (thẻ mới thay thẻ cũ). Tab "Việc hôm nay" 1 cột, mỗi dòng cao ≥ 48px, nút bên phải.

**Chống gian lận**: chỉ đọc số server đã gửi; nút "Đi" dùng tìm đường của máy khách (gửi `move`, `portal` như người chơi tự đi), server kiểm như cũ.

**Tiêu chí chấp nhận**:
1. `tests/e2e/notify.js` (mới, tài khoản `nhac_a`, máy tính và `MOBILE=1`): nhân vật mới chưa điểm danh → `.m-gift` có lớp `gift`; `/lv 12` → `.m-char.dot` và `.m-skill.dot`; nhận nhiệm vụ rồi hoàn thành bằng lệnh admin → `.m-quest.dot`; đặt `S.skew` sao cho Hung Tinh còn 4 phút 58 giây → trong 2 giây có `.invite.remind`; bấm "Tắt nhắc" → `S.settings.remind.wb === false` và đặt lại `S.skew` không nhắc nữa; tab `[data-caltab=todo]` có ≥ 5 `.todo-row`; nhật ký có thông báo vừa nhận; in `OK no console errors`.
2. `grep -n "< 20" src/client/js/game/game.js` không còn số 20 của nhiệm vụ hằng ngày (đọc `S.G.daily.max`).
3. `tests/e2e/ui-audit.js` cảnh `remind`, `todo`: nút ≥ 44px, không tràn ở 3 cỡ điện thoại.
4. `npm test` đạt (2 dòng `clientData` không phá dữ liệu `data`).
5. `DESIGN_RULES.md` mục 8 thêm đoạn "Chấm đỏ và lời nhắc" (bảng điều kiện, thẻ nhắc dùng `#invites`).

**Kiểm thử**: `tests/e2e/notify.js` (mới), `tests/e2e/ui-audit.js`.

### 2.4 `ui-mobile-pass` — Rà soát điện thoại (P2 · M · todo · GĐ 7)

**Mục đích**: giữ lời hứa P2 "chạm là chơi": mọi nút bấm được bằng ngón cái mà không trượt, mọi chữ đọc được trên màn 720p, mọi cửa sổ mới tự động bị kiểm thay vì chờ người chơi phàn nàn.

**Luồng**: (a) sửa toàn bộ danh sách đo được; (b) mở rộng khung `tests/e2e/ui-audit.js` do `ui-ask-dialog` tạo ở GĐ0 bằng script đo của lab, ra mọi cửa sổ; (c) từ đó mọi tính năng có cửa sổ mới phải chạy script này trước khi gộp (quy ước U5).

**Danh sách sửa** (đo ở 844×390, `lab/ui05/summary.txt`):

| Phần tử | Hiện | Sửa (trên `body.touch`) |
|---|---|---|
| `.win-head .x` (16/16 cửa sổ), `.dlg-head .x` | 32×32, 28×28 | giữ hình, thêm `::after` `inset: -6px` → vùng 44×44 |
| `.tab` trong cửa sổ (Hành trang, Kỹ năng, Xếp hạng, Thợ Rèn) | cao 24-26 | `min-height: 44px` (thanh tab cao hơn 18px; cửa sổ đã cuộn dọc nên không tràn) |
| `.btn.small` (Hành trang: Mở rộng, Hủy nhanh, Sắp xếp; Nhân vật: nút cộng điểm 32×24, 40×24; Lễ hội) | cao 24 | `::after` `inset: -10px -4px` như luật nút xếp chồng đã có; nút cộng điểm tiềm năng thành 44×44 |
| ô nhập + nút ở Nhóm, Bạn bè | 28 | `min-height: 44px` |
| nút chính ở Điểm danh, Vòng quay | 28 | `min-height: 44px` |
| "Đổi nhân vật", "Đăng xuất" ở Cài đặt | 28 | `min-height: 44px` |
| `#chat-toggle` | 34×30 | 44×44 |
| `.qt-go` | 28×26 | `::after` như `.qc-go` |
| `.sbtn.pot` | 42×42 | 44×44 (dời `right` 2px để không chạm vòng cung) |
| nút `ask()` | 96×28 | thuộc `ui-ask-dialog` A2 |
| thanh trang túi `[data-invpage]` | cao 24, bị cắt | mục 1.7 |
| chữ < 15px | HUD 4, Hành trang 9, Kỹ năng 1, Lễ hội 1 | `#map-ping`, `#map-info`, `.qs`, nhãn ô trang bị, `.sk-lv`, `small` ở Lễ hội ≥ 15px; nhãn dài thì rút gọn chữ thay vì thu cỡ |

**Quy tắc đo** (`tests/e2e/ui-audit.js`, chuyển từ `lab/ui05/measure.js` + `fonts.js` + `askbag.js`):
- Phần tử bấm được: `button, input, select, textarea, a[href], [data-act], [onclick], .slot:not(.empty), .tab, .ctab` đang hiện; kích thước hiệu dụng = hình chữ nhật của phần tử, cộng phần `::after` lấn ra (khi `position: absolute`), lấy theo `label` bao ngoài nếu là ô nhập. Bỏ qua `#hud-menu` (ngoại lệ của `DESIGN_RULES.md`).
- Tràn: `.win` ra ngoài khung nhìn, `document.documentElement.scrollWidth > innerWidth`, `.win-body` cuộn ngang.
- Chữ: mọi phần tử có nút chữ trực tiếp, `font-size` tính ra < 15px.
- Cảnh: HUD; 16 cửa sổ menu + `upgrade`, `event`; `storage`, `shop` (dựng sẵn dữ liệu bằng cách đứng cạnh NPC qua `/tp`); `.item-pop`; `ask`, `ask-danger`; `bag100` (túi 100 ô); `banners` (`ui-hud-banners`), `tut` (`ui-tutorial`), `remind`, `todo` (`ui-notify-center`), `a11y` (`ui-a11y`); cảnh của tính năng chưa có thì bỏ qua kèm dòng "bỏ qua: chưa có".
- Cỡ màn: 844×390, 740×360, 667×375 (`isMobile`, `hasTouch`, `deviceScaleFactor: 2`); 1280×720 chỉ kiểm tràn và chữ.
- Kết quả: in bảng `cảnh · cỡ · số nút · nút nhỏ · chữ nhỏ · tràn`, dòng cuối `UI-AUDIT ĐẠT` khi mọi cột lỗi bằng 0, ngược lại `UI-AUDIT LỖI n` và mã thoát 1.
- Cách chạy: `BASE_URL=http://localhost:3675 ACC=ruaso_a NODE_PATH=$(npm root -g) node tests/e2e/ui-audit.js` (server có `ruaso_a` trong `ADMINS`); `ONLY=<cảnh,cảnh>` để chạy một phần.

**Dữ liệu, gói, server**: không có.

**Module, cửa sổ, DOM**: chỉ CSS (`css/touch.css`, `css/windows.css`, `css/hud.css`) và 1 dòng ở `windows/inventory.js` (mục 1.7). Không đổi id DOM.

**Tiêu chí chấp nhận**:
1. `tests/e2e/ui-audit.js` in `UI-AUDIT ĐẠT` (0 nút nhỏ ngoài `#hud-menu`, 0 chữ < 15px, 0 tràn) ở 3 cỡ điện thoại cho mọi cảnh đang có.
2. `npm run test:e2e` máy tính và `MOBILE=1` vẫn `E2E ĐẠT`; `npm run test:ui` đạt (cửa sổ giao dịch, nhóm đổi cỡ nút).
3. Ảnh `tools/shot.js` `mobile: true` của Hành trang (túi 100 ô), Nhân vật, Kỹ năng, Cài đặt, `ask` in `OK no console errors`; xem ảnh không có nút chồng chữ.
4. `DESIGN_RULES.md` mục 8 ghi: "mọi cửa sổ mới phải qua `tests/e2e/ui-audit.js`"; mục 8 điện thoại bổ sung các nút đã đổi cỡ.

**Kiểm thử**: `tests/e2e/ui-audit.js` (mở rộng khung của `ui-ask-dialog`), `tests/e2e/e2e.js`, `tests/e2e/ui-multiplayer.js`.

### 2.5 `ui-settings-sync` — Cài đặt theo nhân vật, nút cảm ứng tùy chỉnh (P2 · C · todo · GĐ 7)

**Mục đích**: Anh Quân chơi tối trên máy tính, trưa trên điện thoại: mức tự uống thuốc và phạm vi tìm quái theo **nhân vật**, không phải chỉnh lại ở mỗi máy. Người tay to hoặc tay trái chỉnh được cỡ và vị trí D-pad, cụm kỹ năng.

**Luồng người chơi**:
1. Đổi một cài đặt tự đánh ở bất kỳ máy nào → 1 giây sau máy chủ lưu; vào game ở máy khác → cài đặt đó đã theo sang.
2. Cài đặt hiển thị, âm thanh, trợ năng, bố cục nút vẫn theo **thiết bị** (tai nghe, cỡ màn mỗi máy mỗi khác).
3. Cài đặt (cảm ứng) → "Bố cục nút" → màn chỉnh: D-pad và cụm kỹ năng có viền vàng nét đứt, kéo để dời, 3 nút cỡ (Nhỏ 90% · Vừa 100% · Lớn 115%), "Mặc định", "Xong".

**Quy tắc**:

| Nhóm | Khóa | Lưu ở |
|---|---|---|
| Theo nhân vật | `autoHp`, `autoMp`, `autoRange`, `autoPick`, `names`, `chatTab` | `c.settings` (server) |
| Theo thiết bị | `sound`, `musicVol`, `sfxVol`, `daynight`, `shake`, `remind`, khóa của `ui-a11y`, `touch` | `localStorage` `ns_settings` |

- Khi vào game: giá trị server ghi đè giá trị cục bộ cho nhóm theo nhân vật. Nhân vật chưa có `c.settings` (dữ liệu cũ): máy khách gửi giá trị cục bộ một lần để khởi tạo.
- Gửi: chỉ phần đổi, gộp trong 1 giây (debounce); người chơi đổi liên tục 10 lần trong 1 giây chỉ sinh 1 gói.
- Bố cục nút (`S.settings.touch = { scale, pad: [dx, dy], sk: [dx, dy] }`): `scale ∈ {0.9, 1, 1.15}`; độ dời tính từ vị trí mặc định, kẹp `dx ∈ [−40, 160]` (D-pad) và `[−160, 40]` (cụm kỹ năng), `dy ∈ [−80, 0]`; sau khi kẹp, hai nhóm cách nhau ≥ 24px, không giao `#hud-chat.collapsed`, `#hud-menu`, dải biểu ngữ; không thỏa thì nút "Xong" tắt và ghi lý do. Đổi cỡ màn (xoay, đổi trình duyệt) mà nhóm lòi ra ngoài → tự về mặc định cho cỡ đó.

**Dữ liệu**: `src/shared/data/prefs.js` (mới): `PREFS = { autoHp: { t: 'int', min: 0, max: 95, def: 40 }, autoMp: { t: 'int', min: 0, max: 95, def: 25 }, autoRange: { t: 'int', min: 100, max: 2000, def: 600 }, autoPick: { t: 'bool', def: true }, names: { t: 'bool', def: true }, chatTab: { t: 'enum', v: ['all', 'world', 'map', 'party', 'clan', 'pm'], def: 'all' } }`, gửi qua `clientData.prefs`. `tools/check-data.js` kiểm `def` nằm trong miền và khớp `loadSettings()` mặc định.

**Gói client↔server**:

| Hướng | Gói | Trường | Kiểm tra |
|---|---|---|---|
| C→S | `prefs` | `{ s: { khóa: giá trị } }` | duyệt **theo khóa của `PREFS`** (không duyệt khóa của máy khách), `int`/kẹp miền, `bool` chỉ nhận `true/false`, `enum` phải thuộc `v`; khóa lạ bỏ; tối đa 5 gói / 10 giây (`p.prefsAt`) |
| S→C | `prefs` | `{ s }` | gửi một lần ở móc `join` sau gói `me` |

**Module server, client, DOM**:

| Phần | Nội dung |
|---|---|
| Module mới | `src/server/modules/prefs/index.js` (`name: 'prefs'`, `actions: { prefs }`, `hooks: { sanitize, join, clientData }`); `sanitize(c)` dựng lại `c.settings` chỉ từ khóa `PREFS` (đối tượng mới, không giữ khóa khác) |
| `core/store.js` | `saveSettings()` gọi thêm `syncPrefs()` (debounce 1 giây) |
| `ui/ui.js` | `n.on('prefs', (m) => this.applyPrefs(m))`: `applyPrefs` ghép `m` vào `S.settings` rồi `saveSettings()` cục bộ |
| `windows/settings.js` | dòng ghi chú "Tự động đánh lưu theo nhân vật"; nút "Bố cục nút" (chỉ cảm ứng) |
| `windows/touchlayout.js` (mới) | màn chỉnh bố cục (không phải cửa sổ trong bảng `refresh()`; lớp phủ z 50 thay chỗ cửa sổ) |
| CSS | `touch.css`: `#hud-dpad`, `#hud-skills` dùng `transform: translate(var(--pad-dx), var(--pad-dy)) scale(var(--pad-s))` |
| DOM mới | `[data-act=touch-layout]`, `.tl-edit`, `[data-act=tl-reset]`, `[data-act=tl-done]`, `[data-tlsize=0.9\|1\|1.15]` |

**Bố cục điện thoại**: màn chỉnh bố cục che toàn màn nền mờ 50%, chỉ D-pad và cụm kỹ năng sáng; 3 nút cỡ và 2 nút chức năng ở trên giữa, cao 44px.

**Chống gian lận**: cài đặt không ảnh hưởng luật server (tự đánh là của máy khách). Chặn chèn prototype: không `Object.assign(c.settings, m.s)`, chỉ đọc `m.s[k]` với `k` lấy từ `PREFS` và kiểm `Object.hasOwn(m.s, k)`. Giới hạn cỡ gói đã có (`maxPayload` 16 KB của gateway) và giới hạn tần suất trên.

**Tiêu chí chấp nhận**:
1. `npm test` gồm `prefsUnitTests` (`sanitize` bỏ khóa lạ, `__proto__`, `constructor`; kẹp `autoHp: 500` → 95, `autoRange: -1` → 100; `chatTab: 'x'` → `all`; `autoPick: 'true'` (chuỗi) bị bỏ) và `prefsTest` (bot `caidat_a`: gửi `prefs { s: { autoHp: 70 } }` → tải lại nhân vật nhận `prefs.s.autoHp === 70`; gửi `{ s: { __proto__: { x: 1 } } }` → `({}).x === undefined` trên server; 20 gói liền → chỉ 5 được ghi).
2. `tests/e2e/prefs.js` (mới): trình duyệt A đổi "Tự uống HP" thành 70, đóng; trình duyệt B (ngữ cảnh mới, `localStorage` trống) vào cùng nhân vật → ô ghi 70; `sound` đổi ở A không theo sang B.
3. Cảm ứng: kéo D-pad sang phải 100px, cỡ Lớn → sau tải lại trang, tâm nút trái lệch đúng +100px ±2 và cỡ 74px ±1 (64 × 1,15); kéo cụm kỹ năng đè D-pad → "Xong" bị tắt; E2E `MOBILE=1` vẫn đạt với bố cục mặc định.
4. `npm run check` sạch (khối kiểm `PREFS`); `DESIGN_RULES.md` mục 8 thêm đoạn "Bố cục nút do người chơi chỉnh" theo ADR-05f-3.

**Kiểm thử**: `tests/features/prefs.js` (mới), `tests/e2e/prefs.js` (mới), `tests/e2e/ui-audit.js` (cảnh `touch-layout`).

### 2.6 `ui-item-compare` — So sánh nhanh với món đang mặc (P2 · C · todo · GĐ 3)

**Mục đích**: nhặt được món mới, biết ngay mạnh hơn hay yếu hơn món đang mặc mà không phải mở hai bảng; quan trọng khi lên cấp 121-199 với 19 bậc đồ và ngọc khảm.

**Luồng người chơi**:
- Máy tính: rê chuột lên ô trang bị trong túi, cửa hàng, kho, thư, giao dịch 300ms → khung nhỏ `.item-tip` cạnh con trỏ: tên món, cột "So với đang mặc" từng chỉ số `+12` xanh / `−5` đỏ. Bấm vẫn mở `.item-pop` như cũ.
- Điện thoại: chạm ô → `.item-pop` có thêm khối "So với đang mặc" dưới bảng chỉ số.
- Ô trong túi có tam giác xanh 8px góc trên phải (`.cmp-up`) khi món **tốt hơn hẳn**: mặc được (đủ cấp, đúng phái) và mọi chỉ số ≥ món đang mặc, ít nhất một chỉ số lớn hơn.

**Quy tắc**:
- Đối chiếu với `S.equip[def.slot]`; ô trống → mọi chỉ số tính là tăng.
- Chỉ số so bằng `itemStats(it)` (đã gồm cường hóa, tùy chọn `it.o`, ngọc khảm, cấp thú) cho cả hai món; hiện theo thứ tự `S.G.statLabels`.
- Thời trang chỉ so khi món có chỉ số; thú cưng so theo cấp thú hiện tại.
- Khác phái hoặc thiếu cấp: khối so sánh ghi "Chưa mặc được" (đỏ) và không vẽ `.cmp-up`.
- Không tính một con số "lực chiến" gộp (chưa có công thức được duyệt; tránh dạy người chơi so sai) — xem Câu hỏi mở Q4.

**Dữ liệu, gói, server**: không có (máy khách đã có `itemStats`, `S.equip`).

**Module, cửa sổ, DOM**: `windows/inventory.js` (`itemDetail` thêm khối `.id-cmp`, `invGrid` thêm `.cmp-up`), `ui/common.js` hàm `cmpStats(a, b)` dùng chung cho cửa hàng, kho, thư, giao dịch; DOM mới `.item-tip` (z 60, chỉ `(pointer: fine)`), `.id-cmp`, `.cmp-row.up|.down`, `.cmp-up`.

**Bố cục điện thoại**: khối so sánh 2 cột (nhãn, chênh lệch), tối đa 8 dòng rồi gộp "và n chỉ số khác"; `.item-pop` vẫn nằm gọn khung nhìn (`ui-audit` cảnh `item-pop`).

**Chống gian lận**: chỉ hiển thị.

**Tiêu chí chấp nhận**:
1. `tests/e2e/e2e.js` thêm bước (phần `ONLY=new`): `/item` 2 vũ khí cùng phái bậc 0 và bậc 2 khi đang mặc bậc 1 → đúng 1 ô có `.cmp-up` (bậc 2); chạm ô bậc 0 → `.id-cmp .cmp-row.down` ≥ 1; món khác phái → "Chưa mặc được", không có `.cmp-up`.
2. Máy tính: rê chuột 400ms lên ô → `.item-tip` hiện; điện thoại: không bao giờ có `.item-tip`.
3. `tests/e2e/ui-audit.js` cảnh `item-pop` với món có ngọc khảm 3 lỗ: không tràn ở 3 cỡ điện thoại.
4. Túi 100 ô: dựng lại lưới (`refresh` cửa sổ túi) trung bình ≤ 8ms trên máy tính (đo trong E2E bằng `performance.now()`).

**Kiểm thử**: `tests/e2e/e2e.js`, `tests/e2e/ui-audit.js`.

### 2.7 `ui-a11y` — Trợ năng (P2, P5 · S · todo · GĐ 7)

**Mục đích**: người mắt kém, người nhạy chuyển động, người mù màu đỏ-lục, người chỉ dùng bàn phím vẫn chơi được; công bằng (P5) gồm cả việc không ai bị loại vì giao diện.

**Quy tắc** (nhóm "Trợ năng" trong Cài đặt, lưu theo thiết bị):

| Khóa | Lựa chọn | Mặc định | Tác động |
|---|---|---|---|
| `textScale` | 100% / 115% / 130% | 100% | `body.fs-115` / `.fs-130` phóng chữ ở `.win-body`, `.dialog`, `#toasts`, `#chat-log`, `.item-pop`, `.ask-box`, `.tut-bubble`; **không** phóng HUD chiến đấu (thanh máu, cụm kỹ năng, menu) để giữ bố cục cố định (ADR-05f-2) |
| `calm` (Giảm chuyển động) | bật/tắt | theo `prefers-reduced-motion` | `body.calm`: tắt rung màn hình, tắt hoạt ảnh lặp vô hạn trong HUD và cửa sổ (đồng hồ nhấp nháy, viền cuồng nộ đập, lỗ ngọc nhấp nháy, icon biểu ngữ bước), thay bằng màu tĩnh; thông báo hiện/tắt không trượt |
| `cvd` (Phân biệt độ hiếm bằng hình) | bật/tắt | tắt | `body.cvd`: ô vật phẩm có dấu góc theo độ hiếm (Tốt 1 chấm, Hiếm 2 chấm, Sử thi 3 chấm, Huyền thoại sao 4 cánh), tên hệ ghi chữ cạnh màu hệ ở khung mục tiêu và chi tiết kỹ năng |
| `haptics` (Rung máy) | bật/tắt | tắt | chỉ cảm ứng: `navigator.vibrate(30)` khi trúng đòn boss, 60ms khi trọng thương; không có API thì ẩn công tắc |

Luôn bật (không cần công tắc):
- Viền tiêu điểm `:focus-visible` vàng `var(--gold)` 2px cho nút, tab, ô nhập (thay viền xanh mặc định).
- Bàn phím: Tab đi qua nút trong cửa sổ theo thứ tự đọc; Esc đóng cửa sổ (đã có); trong `ask()` tiêu điểm bị giữ trong hộp (`ui-ask-dialog` A5).
- Tên cho trình đọc màn hình: mọi nút chỉ có icon có `aria-label` (menu đã có; thêm cho nút kỹ năng, bình, D-pad đã có, nút đóng đã có); `.win` có `role="dialog"` và `aria-label` bằng tiêu đề; `#toasts` có `aria-live="polite"`; thẻ lời mời có `role="alertdialog"`.
- Tương phản: chữ `.muted` (`#c2ab8a`) trên nền da giữ tỉ lệ ≥ 4,5:1 (đo ở `ui-audit` bằng màu tính ra của nền gần nhất).

**Dữ liệu, gói, server**: không có (cài đặt theo thiết bị).

**Module, cửa sổ, DOM**: `windows/settings.js` (nhóm Trợ năng), `core/store.js` (khóa mặc định), `game/game.js` (`applySettings` đọc `calm` để tắt rung, 1-2 dòng; gọi rung máy ở `onBossHit`), CSS `style.css` (`:focus-visible`, `.fs-*`), `windows.css` (`.cvd` dấu góc), `hud.css`, `features.css` (`.calm`); `ui/ui.js` (`frameWin` thêm `role`, `aria-label`). Lớp mới trên `body`: `fs-115`, `fs-130`, `calm`, `cvd`.

**Bố cục điện thoại**: 130% làm cửa sổ cao hơn, `.win-body` cuộn dọc (đã có), không được cuộn ngang; nút trong cửa sổ vẫn ≥ 44px.

**Chống gian lận**: không liên quan. Lưu ý công bằng: `cvd` chỉ thêm hình, không thêm thông tin người khác không thấy.

**Tiêu chí chấp nhận**:
1. `tests/e2e/ui-audit.js` cảnh `a11y` ở 1280×720 và 844×390: 100% phần tử bấm được có tên (chữ hiển thị, `aria-label` hoặc `title`); mọi `.win` có `role="dialog"` và `aria-label` khác rỗng; `#toasts[aria-live=polite]` tồn tại.
2. Bật `calm`: trong `#hud` và `.win`, `document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations === Infinity).length === 0`; `ninja.game.fx.shakeScale === 0`. Giả lập `prefers-reduced-motion: reduce` (Playwright `reducedMotion`) với `localStorage` trống → `S.settings.calm === true`.
3. `fs-130`: 16 cửa sổ ở 1280×720 và 844×390 không tràn ngang, không lòi khung nhìn; chữ trong `.win-body` ≥ 19px.
4. `cvd`: ô `.slot.r2` có dấu góc (phần tử giả `::after` có `content` khác `none`).
5. Nhấn Tab trong cửa sổ Cài đặt: phần tử có tiêu điểm có `outline-color` bằng màu `--gold`.
6. `DESIGN_RULES.md` mục 8 thêm đoạn "Trợ năng" (4 khóa, lớp `body`, luật không phóng HUD chiến đấu); mục 2 ghi dấu góc độ hiếm.

**Kiểm thử**: `tests/e2e/ui-audit.js` (cảnh `a11y`).

---

## 3. Không làm ở bản 1.0

### 3.1 `ui-portrait` — Màn dọc (P2 · W)

**Lý do**: lối chơi đi cảnh cần khung nhìn ngang (380-760 × 216-260 pixel nghệ thuật, `DESIGN_RULES.md` mục 1); màn dọc 390×844 chỉ chứa được ~150 pixel nghệ thuật chiều ngang ở zoom 3, không đủ thấy quái và vùng báo trước của boss (chống P3). Thiết kế lại HUD, cụm kỹ năng, 23 cửa sổ cho màn dọc là việc cỡ L không đem thêm người chơi (01-tam-nhin Q5).

**Giữ cho tương lai**: `#rotate-hint` hiện khi xoay dọc trong game; màn đăng nhập/chọn nhân vật dùng được ở màn dọc (`screens.css` có luật `orientation: portrait`).

**Tiêu chí (hành vi giữ nguyên)**: Playwright 390×844 cảm ứng sau khi vào game → `#rotate-hint` hiện (`display: flex`); màn đăng nhập ở 390×844 không tràn ngang. Làm lại cần ADR mới.

### 3.2 `ui-i18n` — Đa ngôn ngữ (P2 · W)

**Lý do**: chữ hiển thị, văn phong "ta - ngươi", lễ hội đều thiết kế cho người Việt (01-tam-nhin mục 3.2, Q6); tách chuỗi khỏi hơn 300 chỗ trong server và máy khách là việc cỡ L, rủi ro cao trong khi chưa có thị trường ngoài tiếng Việt.

**Giữ cho tương lai**: chữ của dữ liệu nằm trong `src/shared/data` (tên, mô tả, lời NPC); `lang="vi"` ở `index.html`; số định dạng qua `fmt()` (`toLocaleString('vi-VN')`) một chỗ.

**Tiêu chí (hành vi giữ nguyên)**: `grep -c 'lang="vi"' src/client/index.html` = 1; mọi định dạng số trong `src/client/js` đi qua `fmt` hoặc `toLocaleString('vi-VN')`. Làm lại cần ADR mới.

---

## 4. ADR

### ADR-05f-1 — Nhắc sự kiện ngoài game bằng thông báo đẩy của trình duyệt: **từ chối ở 1.0**

| Mục | Nội dung |
|---|---|
| Bối cảnh | `ui-notify-center` muốn nhắc người chơi trước giờ sự kiện. Nhắc khi tab đã đóng cần Service Worker + Push API, máy chủ phải ký khóa VAPID và gửi tới dịch vụ đẩy của trình duyệt. |
| Quyết định | 1.0 chỉ nhắc **trong game** (thẻ nhắc trong `#invites`, mục 2.3). Không Service Worker cho đẩy, không xin quyền thông báo. |
| Phương án khác | (a) thư viện `web-push` từ npm: phá quy tắc "chỉ có `ws`"; (b) tự cài mã hóa đẩy bằng `crypto` của Node: ~400 dòng mã bảo mật cần rà soát; (c) `Notification` khi tab còn mở nhưng ẩn: được phép, nhưng ít giá trị so với thẻ nhắc và hay bị trình duyệt chặn. |
| Chi phí nếu làm | 1 thư viện mới hoặc ~400 dòng mã mật mã; lưu đăng ký đẩy theo tài khoản (dữ liệu cá nhân); trang chính sách quyền riêng tư; xử lý thu hồi. |
| Hệ quả | Người chơi phải mở game để thấy nhắc; bù bằng lịch cố định giờ Việt Nam và tab "Việc hôm nay". Xét lại ở GĐ 8 cùng `ops-monitoring` nếu số liệu cho thấy người chơi bỏ lỡ sự kiện nhiều. |

### ADR-05f-2 — Cho phép phóng chữ 115% và 130% trong cửa sổ

| Mục | Nội dung |
|---|---|
| Bối cảnh | `DESIGN_RULES.md` mục 8 cố định "cỡ chữ gốc 20px", bố cục cửa sổ và HUD đo theo cỡ này. Người mắt kém trên màn 720p khó đọc chữ 15-18px trong cửa sổ. |
| Quyết định | Thêm `textScale` (100/115/130%) chỉ áp cho vùng đọc (thân cửa sổ, hội thoại, thông báo, chat, chi tiết vật phẩm, hộp xác nhận, lời dặn). HUD chiến đấu (thanh chỉ số, cụm kỹ năng, menu, biểu ngữ) giữ cỡ gốc. Mặc định 100% nên giao diện chuẩn không đổi. |
| Phương án khác | (a) phóng cả trang bằng `zoom`: vỡ bố cục HUD đã đo ở 6 cỡ màn; (b) để trình duyệt phóng (Ctrl +): canvas game nhỏ lại theo, trên điện thoại bị chặn bởi `user-scalable=no`. |
| Chi phí | CSS cho 2 lớp `body`; `ui-audit` thêm 2 lượt đo (130% ở 1280×720, 844×390); mỗi cửa sổ mới phải đạt ở 130%. |
| Hệ quả | Quy tắc "cỡ chữ gốc 20px" thành "cỡ chữ gốc 20px, vùng đọc nhân `textScale`"; `DESIGN_RULES.md` sửa cùng commit của `ui-a11y`. |

### ADR-05f-3 — Cho phép người chơi dời và đổi cỡ D-pad, cụm kỹ năng

| Mục | Nội dung |
|---|---|
| Bối cảnh | `DESIGN_RULES.md` mục 8 ghi "Bố cục HUD cố định" và nhiều vị trí đo tay (biểu ngữ nằm giữa mép phải D-pad 240px và bình thuốc 310px). Tay người, cỡ máy, thói quen tay trái khác nhau. |
| Quyết định | Cho dời trong giới hạn kẹp (`dx`, `dy` ở mục 2.5) và 3 cỡ 90/100/115%, lưu theo thiết bị; vị trí mặc định vẫn là chuẩn để đo và chụp ảnh. Dải biểu ngữ (`ui-hud-banners`) tính khoảng trống theo vị trí thật của hai nhóm (đọc `getBoundingClientRect`) thay vì hằng 240/310 khi bố cục đã chỉnh. Không làm đảo tay (D-pad sang phải) ở 1.0. |
| Phương án khác | (a) giữ cố định: người tay to bấm nhầm, máy tính bảng nút quá xa mép; (b) kéo thả tự do từng nút: phải kiểm chồng lấn cho 16 nút, rất dễ tạo bố cục hỏng; (c) đảo tay: phải viết lại vòng cung kỹ năng và mọi vị trí biểu ngữ. |
| Chi phí | 1 lớp phủ chỉnh bố cục, 3 biến CSS, kiểm chồng lấn khi lưu; `ui-audit` thêm cảnh `touch-layout`. |
| Hệ quả | "Bố cục HUD cố định" thành "cố định ở mặc định, người chơi dời được D-pad và cụm kỹ năng trong giới hạn"; ảnh kiểm thử và E2E luôn dùng mặc định (không đọc `ns_settings.touch`). |

---

## 5. Thứ tự làm, phụ thuộc, giao việc

| GĐ | id | Phụ thuộc | Giao | Ghi chú |
|---|---|---|---|---|
| 0 | `ui-ask-dialog` | `ops-commit-restructure` | opencode (sửa A1-A5, kiểm bằng `ui-audit` cảnh `ask`) | gộp cùng commit túi đồ; `ui-bag-bulkdrop` phụ thuộc id này |
| 2 | `ui-tutorial` | `core-levelcap-199` không cần; cần `ui-hud` | Claude thiết kế lời dặn + rà; phần server (`modules/tutorial`, `FEATURE_LV`) giao opencode được theo bảng gói | làm cùng đợt nhiệm vụ chính để lời dặn khớp nhiệm vụ đầu |
| 3 | `ui-item-compare` | `ui-windows` | opencode | sau `gear-tier-199` thì chạy lại bước E2E với bậc mới |
| 4 | `ui-hud-banners` | `ui-hud` | opencode, Claude xem ảnh 6 cỡ màn | **trước** khi gộp `pvp-battlefield`, `clan-war`, `evt-village-defense`, `pve-worldboss` (các biểu ngữ mới dùng hợp đồng `.bn`) |
| 7 | `ui-mobile-pass` | `ui-ask-dialog` | opencode (CSS + đưa script lab vào repo) | chạy lại sau mỗi lô có cửa sổ mới |
| 7 | `ui-notify-center` | `evt-calendar`, `ui-hud-banners` | opencode | sửa `windows/calendar.js` sau khi `evt-calendar` gộp |
| 7 | `ui-a11y` | `ui-mobile-pass` | opencode, Claude rà màu và ảnh | |
| 7 | `ui-settings-sync` | `ui-settings` | Claude (kiểm khóa chống chèn prototype ở server), phần lớp phủ bố cục giao opencode | C: trễ thì sang 1.1, dữ liệu `c.settings` vẫn tương thích |
| — | `ui-portrait`, `ui-i18n` | | không làm | |

Ngân sách: trong mục này M chỉ có `ui-ask-dialog`, `ui-mobile-pass` (và 5 id đã `done`); không id M nào phụ thuộc id S/C.

## 6. Kiểm thử tổng hợp

| File | Loại | id phục vụ | Trạng thái |
|---|---|---|---|
| `tests/e2e/e2e.js` | Playwright 1 trình duyệt, máy tính + `MOBILE=1` | `ui-hud`, `ui-windows`, `ui-touch`, `ui-title`, `ui-hud-banners`, `ui-item-compare` | có (55/55 đạt ngày 18/10/2026); thêm bước so sánh vật phẩm |
| `tests/e2e/ui-multiplayer.js` | Playwright 2 trình duyệt | `ui-mobile-pass` (không vỡ giao dịch, nhóm) | có |
| `tests/e2e/perf.js` | đo khung hình | `ui-tutorial`, `ui-hud-banners` | có |
| `tests/e2e/ui-audit.js` | Playwright, 3 cỡ điện thoại + máy tính, cảnh theo tính năng | `ui-mobile-pass`, `ui-ask-dialog`, `ui-a11y`, `ui-hud-banners`, `ui-tutorial`, `ui-notify-center`, `ui-settings-sync`, `ui-item-compare` | mới (gốc: `gddwork/lab/ui05/measure.js`, `fonts.js`, `askbag.js`) |
| `tests/e2e/tutorial.js` | Playwright máy tính + `MOBILE=1` | `ui-tutorial` | mới |
| `tests/e2e/notify.js` | Playwright | `ui-notify-center` | mới |
| `tests/e2e/prefs.js` | Playwright 2 ngữ cảnh | `ui-settings-sync` | mới |
| `tests/features/tutorial.js` | đơn vị + bot | `ui-tutorial` | mới, gọi trong `tests/smoke.js` |
| `tests/features/prefs.js` | đơn vị + bot | `ui-settings-sync` | mới, gọi trong `tests/smoke.js` |
| `tests/features/inventory.js` | đơn vị + bot | `ui-ask-dialog` (gián tiếp) | có |
| `tools/check-data.js` | dữ liệu | `ui-tutorial` (`TUTORIAL`, `FEATURE_LV`), `ui-settings-sync` (`PREFS`) | thêm khối |

Mọi lệnh Playwright chạy với `NODE_PATH` trỏ tới nơi cài Playwright (`CLAUDE.md` quy trình mục 5) và server riêng theo bảng 0.7.

---

## 7. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Hướng dẫn tân thủ có phát thưởng riêng không? | **Không**: thưởng vẫn đến từ nhiệm vụ chính; hướng dẫn không có thưởng thì không cần chống khai bước giả. |
| Q2 | Có khóa cứng tính năng theo cấp (ẩn hẳn nút) để người mới bớt rối không? | **Không** ẩn: nút chỉ mờ + huy hiệu "Lv N", vẫn bấm được; cổng cấp thật giữ ở server như hiện tại; bố cục 16 nút không đổi nên không phải đo lại 6 cỡ màn. |
| Q3 | Nhân vật cũ (đã chơi trước khi có hướng dẫn) có thấy hướng dẫn không? | Không: `sanitize` đặt `skip: true` cho nhân vật cấp ≥ 5 hoặc đã qua nhiệm vụ chính thứ 3; họ vẫn bật lại được ở Cài đặt. |
| Q4 | Có hiện một con số "lực chiến" gộp để so đồ và xếp hạng không? | Không ở `ui-item-compare`: so từng chỉ số. Nếu cân bằng (`06-can-bang.md`) duyệt công thức lực chiến thì thêm một dòng tổng vào khối so sánh, không đổi id. |
| Q5 | Cài đặt âm thanh, trợ năng có đồng bộ theo tài khoản không? | Không: theo thiết bị (tai nghe, cỡ màn mỗi máy khác); chỉ 6 khóa tự đánh/hiển thị theo nhân vật đồng bộ qua `c.settings`. |
| Q6 | Lời nhắc sự kiện bật mặc định cho loại nào? | Bật: Hung Tinh, Tà Thú, Thủ Hộ Làng, Chiến Trường, chiến gia tộc (khi là thành viên tộc đã đăng ký); tắt: Giờ Vàng, Lôi Đài Tam Hùng. |
| Q7 | Dải biểu ngữ cho tối đa mấy viên trên màn thấp? | 2 viên khi cao ≥ 375px, 1 viên khi thấp hơn (740×360), phần còn lại qua nút `+n`. |
| Q8 | Có làm chế độ đảo tay (D-pad bên phải) không? | Không ở 1.0 (ADR-05f-3); chỉ dời trong giới hạn và đổi cỡ. |
| Q9 | Có đổi tên "Lời Dặn Trưởng Làng" thành tên chung không gắn NPC? | Giữ: người dặn là Trưởng Làng của làng xuất phát (chân dung vẽ bằng `drawPortrait` như hội thoại NPC), đúng văn phong P1. |
| Q10 | Ai sửa thanh trang túi bị cắt (mục 1.7) khi `ui-bag-expand` thuộc mục trang bị? | Worker của `ui-mobile-pass` sửa (CSS + 1 dòng `windows/inventory.js`), ghi vào báo cáo cuối cho chủ `05-he-thong-trang-bi.md`; nếu `ui-bag-expand` gộp trước thì sửa ngay trong đợt gộp đó. |
