# GDD 04 — Tính năng đặc sắc

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 4: các tính năng đặc sắc làm nên bản sắc của game (ngoài các hệ thống nền ở mục 5) |
| Ngày | 18/10/2026 |
| Phạm vi | 19 ứng viên có `owner` là file này trong danh mục `gddwork/catalog.json`: 10 mức Should (đặc tả đầy đủ), 9 mức Could (tóm tắt + lý do) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, `docs/gdd/01-tam-nhin.md`, `docs/gdd/02-hien-trang.md`, `gddwork/{pillars.md, catalog.json, audit-data.md, audit-systems.md, audit-risk.md}`, đặc tả đợt 3 `specs/*.md` (đặc biệt `dailies.md`, `titles.md`, `status.md`, `clone.md`, `meridian.md`, `battlefield.md`, `PLAN.md`), nội dung cấp 120-199 `content/00-foundation.md`, `content/40-items-shops.md`, `content/50-worldboss-events.md`; mã `src/` (thư mục làm việc ngày 18/10/2026: `core/combat.js`, `core/modules.js`, `core/world.js`, `modules/arena`, `modules/index.js`, `shared/data/{skills,classes,maps,extras}.js`, `client/js/ui/ui.js`, `client/css/hud.css`, `client/js/core/input.js`) |
| Sổ tính năng | `gddwork/registry/04.json` (19 mục, cùng id với danh mục) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 14 ghi rõ là đổi quy tắc. Mọi tên trong mục này là tên tự đặt (Hán-Việt hoặc thuần Việt); các game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ **loại** cơ chế.

---

## 0. Tóm tắt một trang

| Câu hỏi | Trả lời ngắn |
|---|---|
| Tính năng đặc sắc là gì? | Hệ thống người chơi **kể lại cho bạn bè**: thứ không chỉ cộng số mà tạo khoảnh khắc (đòn phối hợp ba hệ nổ tung boss, cut-in Ấn Kỹ, leo tầng tháp đua top tuần, bái sư, xem trận đấu đội) |
| Bao nhiêu? | 19 ứng viên: **10 Should** (đặc tả đầy đủ ở mục 3-12), **9 Could** (mục 13). Không có Must: không tính năng nào ở đây là sàn tối thiểu hay chống mất dữ liệu |
| Sàn "≥ 10 tính năng đặc sắc mức M/S" | **Đã đạt bằng tính năng đã làm** (10 tính năng `signature: true` có `status: done` ở mức M/S, mục 1.2; đạt `acceptance` trên cây làm việc, 9/10 chưa có trên `main` 8fac3bb nên sàn tính chính thức khi `ops-commit-restructure` xong). Mười tính năng Should ở đây nâng tổng lên 26 và giữ sàn kể cả khi phải dời 1-2 tính năng sang 1.1 |
| Thứ tự làm | Giai đoạn 5 (sau 0-4): Thanh Ấn → Hợp Kích → Thức Tỉnh → Tháp Vô Tận → Sổ Nhẫn Giả → Bế Quan → Nhân Duyên. Giai đoạn 6: Thủ Hộ Làng (đặc tả `dailies.md` sẵn có) → Nhẫn Giả Lệnh → Lôi Đài Tam Hùng (dời từ GĐ5 khi ghép, cần lịch sự kiện) |
| Chi phí | 2 S, 4 M, 4 L cho 10 tính năng Should; 6/10 giao được worker opencode (đặc tả đã chốt, kiểm bằng lệnh) |
| Quyết định kiến trúc | 3 ADR: ô Ấn Kỹ trên cụm kỹ năng (ADR-04-1), người xem trận là nhân vật ẩn trong phòng đấu (ADR-04-2), tiến độ khi không online có trần (ADR-04-3) |

### 0.1 Mười tính năng Should

| # | id | Tên hiển thị | Một câu | Trụ cột | GĐ | Cỡ | opencode |
|---|---|---|---|---|---|---|---|
| 1 | `sig-thanhan` | Thanh Ấn | Đánh trúng, chịu đòn, né hiểm chiêu boss tích Ấn khí; đầy thì tung **Ấn Kỹ** riêng mỗi phái có cut-in | P3, P1 | 5 | M | không |
| 2 | `sig-hopkich` | Hợp Kích | Hai đồng đội khác hệ ra chiêu trúng cùng một quái trong 3 giây sinh đòn phối hợp; đủ ba hệ thì nổ **Tam Tài Quy Nguyên** | P3, P4 | 5 | M | không |
| 3 | `sig-thuctinh` | Thức Tỉnh | Cấp 100 và 150 vượt Tâm Ma Cảnh rồi chọn 1 trong 2 nhánh làm đổi cách chơi của phái | P3, P5 | 5 | L | không |
| 4 | `pve-thapvotan` | Tháp Vô Tận | Leo 150 tầng một mình, mỗi 10 tầng một thủ lĩnh có chiêu báo trước, BXH tuần theo 3 dải cấp | P3, P2 | 5 | L | có |
| 5 | `evt-village-defense` | Thủ Hộ Làng | 12:00 và 21:00 quái công thành, cả làng giữ Linh Thạch qua 5 đợt | P4 | 6 | M | có |
| 6 | `sig-sonhangia` | Sổ Nhẫn Giả | Sưu tầm quái, trang bị, thời trang, thú; hạng sổ cộng chỉ số nhỏ có trần; hiệu ứng tên | P4, P5 | 5 | M | có |
| 7 | `sig-bequan` | Bế Quan | Không online vẫn tích EXP có trần 10 giờ; ủy thác lượt hằng ngày bỏ lỡ hôm qua | P2, P5 | 5 | S | có |
| 8 | `soc-nhanduyen` | Nhân Duyên | Sư đồ, kết nghĩa, kết duyên; độ thân mật bạn bè; kỹ năng đôi | P4 | 5 | L | có |
| 9 | `pvp-arena-3v3` | Lôi Đài Tam Hùng | Đấu đội 3-3 có Elo riêng, khung giờ cố định; xem trận trực tiếp | P3, P4 | 6 (dời từ 5 khi ghép, xem ROADMAP) | L | không |
| 10 | `sig-nhangialenh` | Nhẫn Giả Lệnh | Hành trình 40 bậc mỗi kỳ 28 ngày: nhánh miễn phí (đồ khóa) và nhánh Kim Lệnh 300 lượng **chỉ ngoại hình** | P4, P5 | 6 | S | có |

---

## 1. Cách chọn và xếp loại

### 1.1 Tiêu chí chấm

Mỗi ứng viên chấm 0-3 ở năm tiêu chí; tổng ≥ 10 và không chống trụ cột nào thì xếp Should, còn lại Could. Hai tiêu chí "rủi ro" và "chi phí" chấm ngược (3 = rủi ro thấp, rẻ).

| id | Thu hút (khoảnh khắc kể lại được) | Trụ cột phục vụ | Dùng lại nền có sẵn | Rủi ro (3 = thấp) | Chi phí (3 = rẻ) | Tổng | Xếp |
|---|---|---|---|---|---|---|---|
| `sig-thanhan` | 3 | 2 | 3 (combat, fx, sprites) | 2 | 2 | 12 | S |
| `sig-hopkich` | 3 | 2 | 2 (nhóm, status) | 2 | 2 | 11 | S |
| `sig-thuctinh` | 3 | 2 | 2 (skills, boss) | 2 | 1 | 10 | S |
| `pve-thapvotan` | 2 | 2 | 3 (phó bản, boss, BXH) | 2 | 1 | 10 | S |
| `evt-village-defense` | 2 | 1 | 3 (đặc tả xong) | 2 | 2 | 10 | S |
| `sig-sonhangia` | 2 | 2 | 3 (titles) | 2 | 2 | 11 | S |
| `sig-bequan` | 1 | 2 | 3 | 2 | 3 | 11 | S |
| `soc-nhanduyen` | 3 | 1 | 2 (bạn bè, lời mời, nhóm) | 2 | 1 | 10 | S |
| `pvp-arena-3v3` | 3 | 2 | 3 (lôi đài 1-1) | 1 | 1 | 10 | S |
| `sig-nhangialenh` | 2 | 2 | 2 (mùa, thời trang) | 2 | 2 | 10 | S |
| `pve-bicanh-phuchu` | 3 | 1 | 1 | 1 | 0 | 6 | C |
| `sig-bachquy` | 2 | 2 | 2 | 1 | 2 | 9 | C |
| `sig-thoitiet` | 2 | 1 | 2 | 0 | 2 | 7 | C |
| `sig-nghephu` | 2 | 2 | 1 | 1 | 0 | 6 | C |
| `soc-bieucam` | 2 | 2 | 2 | 3 | 3 | 12 | C (không ai phụ thuộc, xem 13.5) |
| `clan-siege` | 3 | 1 | 1 | 0 | 0 | 5 | C |
| `sig-nharieng` | 2 | 2 | 0 | 1 | 0 | 5 | C |
| `sig-aptieu` | 2 | 2 | 1 | 0 | 1 | 6 | C |
| `cmb-khinhcong` | 3 | 2 | 1 | 0 | 1 | 7 | C |

`soc-bieucam` đạt điểm cao nhưng giữ Could theo định nghĩa ở `01-tam-nhin.md` mục 5: không tính năng nào phụ thuộc, gỡ được bằng một dòng module; đây là việc tốt cho worker khi dư công.

### 1.2 Sàn "≥ 10 tính năng đặc sắc M/S"

| Nhóm | id | Số |
|---|---|---|
| Đã làm (`signature: true`, `status: done` trên cây làm việc, mức M/S) | `cmb-passive`, `gear-gems`, `soc-mail`, `pvp-arena`, `pve-tathu`, `pve-dungeon`, `evt-season-core`, `pet-fashion`, `pet-pets`, `world-worldmap` | 10 |
| Đặc tả ở mục khác, chưa làm | `cmb-clone`, `sig-meridian`, `clan-war`, `pvp-battlefield`, `pve-worldboss`, `pet-mountup` | 6 |
| Đặc tả ở mục này | 10 tính năng ở bảng 0.1 | 10 |
| **Tổng M/S đặc sắc** | | **26** |

Sàn được giữ kể cả khi mọi tính năng chưa làm trễ sang 1.1; mục tiêu chất lượng của 1.0 là có ít nhất 4 tính năng Should của mục này (Thanh Ấn, Hợp Kích, Tháp Vô Tận, Thủ Hộ Làng) để game có "điểm nhấn" khác game tham khảo.

### 1.3 Quy ước chung cho mọi tính năng trong mục này

Áp dụng thêm vào quy ước gộp G1-G12 của `specs/PLAN.md` (phụ lục điều phối đợt 3, vẫn còn hiệu lực).

| # | Quy ước |
|---|---|
| C1 | Mỗi tính năng một module `src/server/modules/<tên>/index.js`, đăng ký **một dòng ở cuối** mảng `modules/index.js`; cần thứ tự móc thì dùng `{ order, fn }`. Tên module: `seal`, `combo`, `awaken`, `tower`, `dailies` (Thủ Hộ Làng nằm trong module của `dailies.md`), `codex`, `retreat`, `bonds`, `arena` (mở rộng, thêm file `arena/team.js`, `arena/watch.js`), `pass` |
| C2 | Dữ liệu tĩnh mỗi tính năng một file `src/shared/data/<tên>.js`, gửi máy khách qua móc `clientData` (khóa trùng tên module). Không chép số vào client |
| C3 | Không thêm nút vào `#hud-menu` (giữ 16 nút, `DESIGN_RULES.md` mục 8). Không thêm phím chữ cái: mọi chữ cái đã dùng hoặc đã phân bổ (H Chiến trường, Y Việc làng, U Thú cưỡi). Phím mới duy nhất: **7** cho Ấn Kỹ. Cửa sổ mới mở bằng nút trong cửa sổ có sẵn, hội thoại NPC, dòng trong khối theo dõi nhiệm vụ, hoặc tab của Lịch Sự Kiện |
| C4 | Không thêm NPC hay nhà mới trong làng (bố cục làng đã khóa ở `market.md`). Tính năng cần NPC thì thêm lựa chọn vào hội thoại NPC sẵn có: Trưởng Làng (`elder`), Hộ Pháp (`dungeon`), Tiểu Nhị (`task`), Võ Sư Thiết Quyền (`arena`) |
| C5 | Xu khóa và đồ khóa theo G12: thưởng kiểu nhiệm vụ/thành tựu/sưu tầm/hành trình → `gainXuk` + đồ khóa; thưởng sự kiện/PvP/xếp hạng tuần → xu và đồ thường; phí NPC → `payXu`. Lượng chỉ từ xếp hạng tuần và mốc lớn, có trần ghi ở từng tính năng |
| C6 | Quà không bao giờ mất: mọi thưởng đi qua chuỗi hành trang → hộp thư (`world.mail.sendItems`) → thủ kho → giữ hộ (`c.pending`). Không thả thưởng ra đất |
| C7 | Lôi đài và phòng đấu (`map.arena`): mọi cơ chế mới (Ấn khí, Hợp Kích, buff kết nghĩa, kỹ năng đôi) phải kiểm cờ `arena` và luật trong `CLAUDE.md` mục Lôi đài (không hồi máu, không vật phẩm) |
| C8 | Kiểm thử: `tests/features/<tên>.js` export `<tên>UnitTests(ok)` (thế giới giả) và `async <tên>Test(ctx)` (bot thật), gọi trong `tests/smoke.js` theo G9; tài khoản admin riêng thêm vào cuối `ADMINS` của `tests/lib/harness.js` |
| C9 | Chụp ảnh: mỗi tính năng một cổng và `DATA_DIR=/tmp/ns-<tên>`: seal 3801 · combo 3802 · awaken 3803 · tower 3804 · codex 3805 · retreat 3806 · bonds 3807 · arena3 3808 · pass 3809 (Thủ Hộ Làng giữ cổng 3631 của `dailies.md`). Ảnh desktop 1280×720 và `mobile: true`, phải in `OK no console errors` |
| C10 | Mỗi tính năng có lệnh admin để thử nhanh, đặt `case` ngay trước `default:` (G8). Tên đã phân bổ: `/an` (seal), `/hopkich` (combo), `/thuctinh` (awaken), `/thap` (tower), `/so` (codex), `/bequan` (retreat), `/duyen` (bonds), `/tamhung` (arena3), `/lenh` (pass) |
| C11 | Mỗi tính năng có số liệu thì thêm **một hàng cuối** bảng `DESIGN_RULES.md` mục 9 trong cùng commit và một khối kiểm trong `tools/check-data.js` (đặt trước khối "Cân bằng", G10) |
| C12 | Mọi chuỗi tên người chơi vào DOM qua `h()` (text node). Mọi trường client gửi qua `int()`/`clean()`; khóa tra bảng dùng `Object.hasOwn` hoặc bảng không prototype (chặn `__proto__`) |

---

## 2. Lịch và tương tác giữa các tính năng

### 2.1 Lịch thêm vào `CALENDAR` (`src/shared/data/calendar.js` của `50-worldboss-events.md`)

Giờ Việt Nam. Cột "excl" là sự kiện có biểu ngữ dưới giữa toàn máy chủ, không được chồng giờ nhau (`check-data` kiểm).

| Giờ | Sự kiện | Nguồn | excl |
|---|---|---|---|
| 12:00-12:13, 21:00-21:13 | Thủ Hộ Làng | `evt-village-defense` (đã có trong lịch của 50) | có |
| 18:00-19:00 hằng ngày; 21:45-23:00 hằng ngày; 15:00-17:00 thứ Bảy, Chủ Nhật | Lôi Đài Tam Hùng mở ghép | `pvp-arena-3v3` | không (chỉ hiện trong phòng đấu) |
| 00:00 thứ Hai | Thưởng tuần Tháp Vô Tận, Lôi Đài Tam Hùng qua hộp thư; đặt lại kỷ lục tuần | `pve-thapvotan`, `pvp-arena-3v3` | không |
| 00:00 thứ Hai đầu kỳ (mỗi 28 ngày) | Mở kỳ Nhẫn Giả Lệnh mới | `sig-nhangialenh` | không |

Khung Lôi Đài Tam Hùng tránh: Hung Tinh 19:00-19:30 và 23:00-23:30 (người chơi trong phòng đấu không thấy biểu ngữ boss, nhưng cùng nhóm người chơi hậu kỳ, tránh để họ phải chọn), Chiến Trường 19:50-20:30, Thủ Hộ Làng 21:00-21:13, Chiến gia tộc 21:15-21:45 (thứ 3/5/7). Khung tối 21:45-23:00 bắt đầu sau chiến gia tộc và kết thúc trước Canh Ba Hung Tinh.

### 2.2 Ma trận tương tác

| A \ B | Thanh Ấn | Hợp Kích | Thức Tỉnh | Tháp | Lôi Đài Tam Hùng |
|---|---|---|---|---|---|
| **Thanh Ấn** | | Tam Tài Quy Nguyên cộng 10% Ấn khí cho 3 người góp | nhánh Thức Tỉnh **không** sửa Ấn Kỹ (giữ Ấn Kỹ là "chữ ký phái" cố định) | Ấn khí về 0 khi vào tháp và mỗi lượt leo | Ấn khí về 0 lúc vào trận, Ấn Kỹ lên người chơi ×0,5 và trần 35% sinh lực |
| **Hợp Kích** | | | hiệu ứng trạng thái của nhánh Thức Tỉnh không tính là "dấu hệ" | không có (leo tháp một mình) | không có (Hợp Kích chỉ PvE ở 1.0) |
| **Thức Tỉnh** | | | | thủ lĩnh tầng 100 và 150 dùng lại hình Tâm Ma | có hiệu lực (là chỉ số của nhân vật) |
| **Bế Quan** | | | | không tính tầng khi offline | không |
| **Nhẫn Giả Lệnh** | nhiệm vụ "Tung Ấn Kỹ 10 lần" | nhiệm vụ "Hợp Kích 20 lần" | không | nhiệm vụ "Leo 10 tầng" | nhiệm vụ "3 trận đội" |

---
## 3. Thanh Ấn (`sig-thanhan`)

### 3.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-thanhan` |
| Trụ cột | **P3** (thưởng tay nghề: né hiểm chiêu boss nạp Ấn khí nhanh nhất), **P1** (Ấn Kỹ mang tên Hán-Việt, cut-in vẽ bằng code theo phái) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · M |
| Phụ thuộc | `cmb-balance` (thang số boss mới), `art-cutin` (khung vẽ cut-in), `cmb-status` (Ấn Kỹ của Kunai gây Lạnh Cóng; thiếu `status` thì bỏ hiệu ứng, phần còn lại vẫn chạy) |
| Vùng file | Lõi server (`core/combat.js`: tách `pickVictims`, gọi 3 móc mới; `core/modules.js`: 3 móc), module mới `modules/seal`, dữ liệu `shared/data/seal.js`, HUD (`ui/ui.js`, `css/hud.css`, `css/touch.css`), Hiệu ứng (`render/fx.js` + `render/fx/cutin.js`), Vòng lặp game (`game/game.js`, `core/input.js` phím 7), `windows/settings.js`, kiểm thử `tests/features/seal.js` |
| opencode | không: chạm lõi chiến đấu, bố cục HUD và thẩm mỹ cut-in, cần Claude làm và rà |

### 3.2 Mục đích, vì sao thu hút

Chiến đấu hiện tại là vòng xoay 6 kỹ năng theo hồi chiêu: đều tay nhưng thiếu cao trào. Thanh Ấn thêm một nhịp "gồng - bùng nổ" mà người chơi **tự tạo ra bằng tay nghề**: né đúng lúc chiêu boss sắp nổ (đứng trong vùng đỏ lúc boss bắt đầu niệm, chạy ra trước khi nổ) cho lượng Ấn khí bằng 6 lần một chiêu trúng. Khi đầy, nút Ấn sáng, bấm là một dải cut-in chân dung nhân vật lướt ngang màn hình kèm tên Ấn Kỹ: khoảnh khắc chụp màn hình, khoe bạn bè. Mỗi phái một Ấn Kỹ cố định nên Ấn Kỹ cũng là "chữ ký" của phái.

### 3.3 Luồng người chơi

1. Đạt cấp 40: thông báo "Ngươi đã lĩnh ngộ Thanh Ấn. Đánh trúng, chịu đòn và né hiểm để tích Ấn khí." Vòng Ấn khí hiện quanh nút đánh thường; nút Ấn (phím **7**) hiện cạnh trên phải nút đánh thường, mờ.
2. Đánh quái, ra chiêu trúng, chịu đòn: vòng đầy dần (màu theo hệ phái). Né được chiêu boss: chữ nổi "Né hiểm!" vàng, vòng nhảy 12%.
3. Đầy 100%: nút Ấn sáng, vòng đập nhịp 0,8 giây, tiếng chuông ngắn (nếu bật âm thanh).
4. Bấm nút Ấn (hoặc phím 7) có mục tiêu hoặc không: máy chủ kiểm, tung Ấn Kỹ. Người tung thấy cut-in 0,7 giây (dải ngang giữa màn hình, chân dung, tên Ấn Kỹ); người khác cùng bản đồ thấy dải nhỏ trên đầu nhân vật kèm tên Ấn Kỹ. Hiệu ứng kỹ năng lớn, rung màn hình nhẹ.
5. Ra khỏi giao tranh quá 10 giây: Ấn khí giảm 2%/giây (chặn tích sẵn ở làng rồi mang đi).

### 3.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Mở khóa | cấp ≥ 40, mọi phái |
| Thang Ấn khí | 0-1.000 (hiển thị 0-100%), chỉ trong RAM, **không lưu** khi thoát |
| Nạp | chiêu (không phải đánh thường) trúng ≥ 1 kẻ địch: **+20** mỗi lần ra chiêu (không nhân số mục tiêu) · đánh thường trúng: **+5** (tối đa 1 lần/0,4 giây) · chịu đòn ≥ 1% sinh lực tối đa: **+15** (tối đa 1 lần/giây) · **né hiểm** chiêu boss: **+120** (1 lần mỗi chiêu boss) · Tam Tài Quy Nguyên (Hợp Kích ba hệ): **+100** cho 3 người góp |
| Né hiểm | người chơi nằm trong vùng chiêu boss lúc boss **bắt đầu niệm** (chụp danh sách id), lúc chiêu nổ không còn trong vùng, và cách tâm vùng ≤ bán kính + 80 px (chặn "đứng xa từ đầu") |
| Tụt | không gây hay chịu sát thương quá 10 giây: −20/giây |
| Đặt về 0 | sau khi tung; khi vào lôi đài, Tháp Vô Tận, Chiến Trường, chiến gia tộc; khi chết |
| Tung | cần đủ 1.000, còn sống, không bị khống chế/câm (`status`), lôi đài phải ở trạng thái `fight`; chặn 3 giây giữa hai lần tung (chống gửi trùng) |
| Hệ số Ấn Kỹ | `mul = 30 + 0,15 · cấp nhân vật` (cấp 40: 36 · 120: 48 · 199: 59,9), tính là sát thương kỹ năng (cộng `skillDmg`), khắc hệ như thường |
| Trần lên boss | ≤ 5% sinh lực tối đa của boss mỗi lần tung |
| PvP | nhân thêm ×0,5 (sau `PVP_SCALE` 0,45), trần 35% sinh lực tối đa của mục tiêu mỗi lần tung |
| Số mục tiêu | tối đa 10 như mọi chiêu vùng |

Ấn Kỹ từng phái (không trùng tên kỹ năng sẵn có hay kỹ năng hậu kỳ đã đặt tên ở `content/00-foundation.md`):

| Phái | Ấn Kỹ | Kiểu | Thông số | Hiệu ứng thêm | `fx.k` |
|---|---|---|---|---|---|
| Kiếm (Hỏa) | Xích Nhật Trảm Không | `aoe` quanh thân | bán kính 160 | Bỏng 3 giây (nếu có `status`) | `burst` lớn, màu `#ff6d00` |
| Tiêu (Hỏa) | Kim Ô Tán Hỏa | `aoe` quanh mục tiêu | tầm 190, bán kính 170 | không | `rain` đạn `fire` |
| Kunai (Thủy) | Thủy Nguyệt Kính Hoa | `aoe` quanh thân | bán kính 170 | Lạnh Cóng 40% trong 3 giây | `whirl` màu `#4fc3f7` |
| Cung (Thủy) | Thương Long Xạ Nhật | `line` | dài 340 | không | `wave` đạn `arrow` |
| Đao (Phong) | Cửu Châu Phong Lôi Trảm | `dash` | lướt 220 | không | `dash` màu `#c6ff00` |
| Quạt (Phong) | Thiên Nữ Tán Hoa | `aoe` quanh mục tiêu | tầm 190, bán kính 170 | hồi 12% sinh lực cho bản thân và đồng đội trong 200 px (không hồi trên bản đồ `arena`) | `rain` đạn `wind` + `heal` |

Ước lượng thời gian đầy (người chơi trung bình xoay đủ 6 kỹ năng, đánh boss): ~50 lần ra chiêu/phút × 20 + đánh thường ~60 × 5 = 1.300/phút → **đầy sau 45-60 giây**; có 2 lần né hiểm thì ~35 giây. Ước lượng sát thương: người chơi trung bình cấp 120 gây ~10,5 lần công mỗi giây (`content/00-foundation.md` bảng 4.2: DPS 53.428 / công 5.088); Ấn Kỹ 48 lần công mỗi ~50 giây ≈ +9% DPS đơn mục tiêu, nằm trong dải mục tiêu **6-12%** (boss solo vẫn 2-6 phút).

### 3.5 Dữ liệu (`src/shared/data/seal.js`, mới)

```js
'use strict';

// Thanh Ấn: tích Ấn khí, đầy thì tung Ấn Kỹ của phái. Bảng cân bằng: DESIGN_RULES mục 9, hàng "Thanh Ấn".
const SEAL = {
  minLv: 40, max: 1000,
  gain: { skill: 20, basic: 5, hurt: 15, dodge: 120, combo3: 100 },
  basicCd: 400, hurtCd: 1000, hurtMin: 0.01, dodgePad: 80,
  idle: 10000, decay: 20, castCd: 3000,
  mul: [30, 0.15],            // mul = a + b · cấp nhân vật
  bossCap: 0.05, pvpMul: 0.5, pvpCap: 0.35,
};
// Ấn Kỹ theo phái: cùng lược đồ trường với SKILLS (type, radius, range, center, fx) để dùng lại pickVictims
const SEAL_ARTS = {
  kiem: { name: 'Xích Nhật Trảm Không', type: 'aoe', center: 'self', radius: 160, st: { k: 'burn', ch: 100, dur: 3000, v: 8 }, fx: { k: 'burst', c: '#ff6d00', big: true } },
  tieu: { name: 'Kim Ô Tán Hỏa', type: 'aoe', center: 'target', range: 190, radius: 170, fx: { k: 'rain', p: 'fire', c: '#ffab00', big: true } },
  kunai: { name: 'Thủy Nguyệt Kính Hoa', type: 'aoe', center: 'self', radius: 170, st: { k: 'chill', ch: 100, dur: 3000, v: 40 }, fx: { k: 'whirl', c: '#4fc3f7', big: true } },
  cung: { name: 'Thương Long Xạ Nhật', type: 'line', range: 340, fx: { k: 'wave', p: 'arrow', c: '#18ffff', big: true } },
  dao: { name: 'Cửu Châu Phong Lôi Trảm', type: 'dash', range: 220, fx: { k: 'dash', c: '#c6ff00', big: true } },
  quat: { name: 'Thiên Nữ Tán Hoa', type: 'aoe', center: 'target', range: 190, radius: 170, heal: 12, healR: 200, fx: { k: 'rain', p: 'wind', c: '#ccff90', big: true } },
};
const sealMul = (lv) => SEAL.mul[0] + SEAL.mul[1] * lv;

module.exports = { SEAL, SEAL_ARTS, sealMul };
```

`tools/check-data.js` (khối "Thanh Ấn"): mỗi phái trong `CLASSES` có đúng một `SEAL_ARTS`; `fx.k` thuộc danh sách hiệu ứng có sẵn; `type` thuộc `aoe|line|dash`; bán kính ≤ 190, tầm ≤ 340; tên không trùng tên kỹ năng nào trong `SKILLS`; `sealMul(199) ≤ 60`; `bossCap ≤ 0.05`, `pvpCap ≤ 0.35`; `st.k` (nếu có) thuộc `STATUS` khi file `status.js` tồn tại.

### 3.6 Giao thức

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| máy khách → máy chủ | `sealCast` | `tid` (chuỗi `m<id>`/`p<id>`, tùy chọn), `dir` (−1/1) | server bỏ qua mọi trường khác |
| máy chủ → máy khách | `me` | thêm `seal` (0-1000, số nguyên), `sealOn` (đã mở khóa) | qua móc `selfData` |
| máy chủ → bản đồ | `sealFx` | `a` (id người tung), `cls`, `name` | máy khách vẽ cut-in (người tung) hoặc dải nhỏ trên đầu (người khác) |
| máy chủ → bản đồ | `fx`, `hit`, `heal` | như chiêu thường, `sid: 'seal'` | dùng lại đường vẽ hiệu ứng có sẵn |
| máy chủ → máy khách | `notice` | "Né hiểm!" (`kind: 'good'`) | chỉ người né |
| dữ liệu tĩnh | `data.seal` | `{ SEAL, SEAL_ARTS }` | móc `clientData` |

### 3.7 Máy chủ, máy khách, DOM

**Móc mới** (`core/modules.js`, một dòng mỗi móc ở cuối `WORLD_HOOKS`, dùng chung cho `combo` và `codex`):

| Móc | Gọi ở | Ý nghĩa |
|---|---|---|
| `hitDealt(p, target, dmg, src)` | `combat.useSkill` sau mỗi đòn trúng (cả quái và người), `src = { sid, basic, el }` | người chơi gây sát thương |
| `playerHurt(p, dmg, src)` | `combat.damagePlayer`, `monsterAttack`, `bossSkillHit` | người chơi chịu sát thương thật (> 0) |
| `bossDodge(p, m, sk)` | `combat.bossSkillHit`: với mỗi id trong `c.inside` (chụp lúc niệm ở `core/monster.js`) không còn trong vùng và đủ gần | né hiểm |

**Lõi** (`core/combat.js`, sửa tối thiểu, ghi báo cáo): tách khối chọn nạn nhân trong `useSkill` (các nhánh `single/aoe/line/dash`) thành `pickVictims(p, def, target, dir, now)` trả `{ victims, fxTarget }`; `useSkill` gọi lại hàm này (hành vi không đổi, kiểm bằng `npm test`). Thêm `castArt(p, art, mul, msg)` dùng `pickVictims` rồi áp trần boss/PvP. `core/monster.js`: lúc bắt đầu niệm, `c.inside = ids người chơi đang inBossZone`.

**Module `modules/seal/index.js`**: lớp `Seal` (`world.mods.seal`), hành động `sealCast`; móc `hitDealt` (+20/+5), `playerHurt` (+15), `bossDodge` (+120, gửi `notice`), `playerSecond` (tụt khi rảnh), `enterMap` (về 0 nếu bản đồ `arena`/`tower`/`battle`/`instance` giao tranh), `selfData` (`d.seal`, `d.sealOn`), `clientData`. Trạng thái trên `Player`: `p.seal`, `p.sealHit` (lần cuối gây/chịu sát thương), `p.sealCd`, `p.sealBasicAt`, `p.sealHurtAt`. Lệnh admin `/an full|0`.

**Máy khách**:

| Thành phần | Thay đổi |
|---|---|
| `ui/ui.js` (HUD) | thêm `this.sealBtn = sbtn('seal', 'seal', 'Ấn Kỹ (7)', ico('seal', 'sk-img'), '7')` vào `#hud-skills`; vòng `.seal-ring` trong nút đánh thường (`--seal: 0..1`, `conic-gradient`); cập nhật trong handler `me` |
| `css/hud.css`, `css/touch.css` | `.sbtn.seal { right: 22px; bottom: 116px; width: 48px; height: 48px }` (giữa đỉnh nút đánh thường y=110 và đáy ô 6 y=172, xem ADR-04-1); `.sbtn.seal.full` viền vàng đập; `.seal-ring` vòng 4px ngoài viền vàng nút đánh thường |
| `core/input.js` | `Digit7: 's7'` → hành động `seal` (`game.castSeal()`) |
| `game/game.js` | `castSeal()` gửi `sealCast` với mục tiêu hiện tại; `onSealFx(m)` gọi `fx.cutin({ look, name, color })` cho người tung hoặc `fx.sealTag(x, y, name, color)` cho người khác (khối gói mới ở cuối `bind`, G4) |
| `render/fx.js` + `render/fx/cutin.js` (mới) | thêm phương thức `cutin({ look, name, color })` và `sealTag(x, y, name, color)` (export mới, không đổi chữ ký cũ): dải 100% ngang cao 120px (điện thoại 84px), chân dung `drawPortrait` tỉ lệ 3, tên Ấn Kỹ cỡ 40px viền đen 2px; trượt vào 120 ms, giữ 400 ms, trượt ra 180 ms; canvas dải dựng một lần mỗi phái rồi cache |
| `windows/settings.js` | công tắc "Hiện cut-in Ấn Kỹ" (mặc định bật; tắt thì chỉ còn dải nhỏ) lưu `localStorage` |
| `windows/skills.js` | dòng cuối tab Kỹ năng: Ấn Kỹ của phái, hệ số hiện tại, hướng dẫn nạp |
| DOM mới | `.sbtn.seal[data-act=seal]`, `.seal-ring`; không có id mới (cut-in vẽ trên canvas game) |

### 3.8 Bố cục điện thoại

Nút Ấn 48px (≥ 44px) đặt trong khoảng trống giữa nút đánh thường và ô kỹ năng 6 của vòng cung; không đè `hb-sets` (`right: 186px; bottom: 192px`) hay bình thuốc. Cut-in cao 84px, nằm ở `top: 32%` (như số đếm ngược lôi đài) để không che thanh trạng thái và khung mục tiêu; không nhận chạm (`pointer-events: none`). Đo lại 6 bố cục 1280×720/700/681, 844×390, 740×360, 667×375 theo ADR-04-1.

### 3.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Gửi `sealCast` liên tục / giả gauge | gauge chỉ ở server; thiếu 1.000 thì bỏ qua; `castCd` 3 giây |
| Tích sẵn ở làng rồi mang tới boss | tụt 2%/giây sau 10 giây rảnh; về 0 khi vào phòng đấu, tháp, chiến trường |
| Nạp bằng đánh nhau với bạn (thách đấu) | nạp bình thường (đó là giao tranh thật), nhưng đổi lại Ấn Kỹ PvP ×0,5 và trần 35%, không có thưởng vật phẩm nào từ Ấn khí |
| Né hiểm giả | danh sách `inside` chụp ở server lúc niệm; chỉ +120 một lần mỗi chiêu mỗi người |
| Ấn Kỹ một phát hạ boss sự kiện | trần 5% sinh lực boss mỗi lần tung |

### 3.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | phái đánh nhanh (Tiêu, Quạt hai đòn) nạp nhanh hơn | nạp theo **lần ra chiêu**, không theo số đòn/số mục tiêu; `tools/balance.js` khối "Thanh Ấn" so thời gian đầy giữa 6 phái, chênh ≤ 20% |
| Cân bằng | PvP một phát hạ người | trần 35% + ×0,5; lôi đài 3 phút đủ cho tối đa 2-3 lần tung mỗi bên |
| Kỹ thuật | tách `pickVictims` làm vỡ hành vi chiêu cũ | làm trước mọi thay đổi khác, `npm test` + `tests/features/skills.js` phải đạt nguyên trạng |
| Kỹ thuật | cut-in tụt khung hình điện thoại | dải dựng sẵn vào canvas, chỉ `drawImage` mỗi khung; `test:perf` có kịch bản tung Ấn Kỹ mỗi 10 giây |
| Gian lận | bot tự né bằng đọc gói `bossCast` | chấp nhận: né được là tay nghề hay công cụ đều phải di chuyển thật qua `move` có kiểm tốc; phần thưởng chỉ là Ấn khí |

### 3.11 Tiêu chí chấp nhận

1. `tests/features/seal.js`: ≥ 18 kiểm tra đạt, gồm mọi số trong bảng 3.4 (nạp, tụt, về 0, trần boss 5%, trần PvP 35%, hệ số `sealMul(120) === 48`).
2. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` sau khi tách `pickVictims` (không đổi số `ok()` của các file cũ).
3. `tools/balance.js` khối "Thanh Ấn": thời gian đầy 35-70 giây cho cả 6 phái ở cấp 60/120/199; DPS tăng 6-12%; boss solo vẫn 2-6 phút (khối cân bằng của `check-data` không báo lỗi).
4. `npm run check` sạch với khối "Thanh Ấn".
5. `test:perf` (kịch bản có Ấn Kỹ mỗi 10 giây): 60 khung hình, CPU p95 ≤ 8 ms/khung.
6. Ảnh `tools/shot.js` desktop + điện thoại: nút Ấn không chồng nút nào ở 6 bố cục; in `OK no console errors`.

### 3.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị (`sealUnitTests`, thế giới giả) | nạp +20 khi chiêu trúng 3 quái (không phải +60); đánh thường 2 lần trong 0,3 giây chỉ +5; chịu đòn 0,5% sinh lực không nạp; tụt sau 10 giây; né hiểm: chụp `inside`, dời người chơi ra ngoài, gọi `bossSkillHit` → +120; đứng xa từ đầu → 0; `castArt` lên boss sinh lực 1.000.000 gây ≤ 50.000; lên người chơi ≤ 35% |
| Bot (`sealTest`, tài khoản `sealbot`) | `/lv 40`, `/an full`, `sealCast` → nhận `sealFx` và `hit` có `sid: 'seal'`, `me.seal === 0`; gửi lại ngay → không có `sealFx`; cấp 39 → `sealOn` false; gửi `sealCast { tid: { a: 1 } }` không làm sập máy chủ |
| E2E (`tests/e2e/e2e.js` thêm bước) | `/an full` rồi bấm phím 7 → canvas có cut-in (đọc `ninja.game.fx.cutins.length > 0`), sau 1 giây về 0; điện thoại bấm `.sbtn.seal` |

---

## 4. Hợp Kích (`sig-hopkich`)

### 4.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-hopkich` (tên trong danh mục: "Hợp Kích Ngũ Hành"; game có 3 hệ nên tên hiển thị là **Hợp Kích**, đòn ba hệ là **Tam Tài Quy Nguyên**) |
| Trụ cột | **P3** (phối kỹ năng có chủ đích, đọc thời điểm của đồng đội), **P4** (lý do lập nhóm khác hệ, khác làng) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · M |
| Phụ thuộc | `sig-thanhan` (3 móc `hitDealt`, `playerHurt`, `bossDodge` và Ấn khí cho đòn ba hệ), `cmb-status` (Phá Giáp, Lạnh Cóng; thiếu thì chỉ còn sát thương thêm), `cmb-balance`, `dev-balance-tool` |
| Vùng file | module mới `modules/combo`, dữ liệu `shared/data/combo.js`, Hiệu ứng (`render/fx.js` + `render/fx/combo.js`), Vòng lặp game (`game/game.js` một khối gói), `windows/party.js` (dòng hướng dẫn), kiểm thử `tests/features/combo.js`, `tools/balance.js` khối "Hợp Kích" |
| opencode | không: cân bằng sát thương nhóm và chia đóng góp boss |

### 4.2 Mục đích, vì sao thu hút

Ba làng, ba hệ khắc nhau là bản sắc của game nhưng hiện chỉ có một tác dụng: ×1,15 khi khắc. Hợp Kích biến hệ thành **lý do chơi cùng nhau**: nhóm có Kiếm (Hỏa) và Đao (Phong) đánh cùng một con boss, chiêu nối nhau trong 3 giây là sinh đòn "Phong Trợ Hỏa Uy" nổ lan, chữ to giữa màn hình, tên hai người góp. Nhóm đủ ba hệ có đòn Tam Tài Quy Nguyên, đòn mạnh nhất game do **ba người** tạo ra. Người chơi sẽ chủ động rủ người làng khác vào nhóm, gọi nhau "ra chiêu đi" trên kênh nhóm.

### 4.3 Luồng người chơi

1. Ở trong nhóm (≥ 2 người cùng bản đồ). Cửa sổ Nhóm hiện dòng hệ của từng thành viên và gợi ý "Nhóm có 2 hệ: Hợp Kích sẵn sàng" / "đủ 3 hệ: Tam Tài Quy Nguyên".
2. Người A (Hỏa) ra chiêu trúng quái X: quái X mang **dấu Hỏa** (vòng nhỏ màu hệ dưới chân quái, 3 giây).
3. Người B (Phong, cùng nhóm) ra chiêu trúng quái X trong 3 giây: máy chủ sinh đòn Hợp Kích lên X (và quái quanh X nếu là đòn lan). Màn hình: chữ "PHONG TRỢ HỎA UY" hai màu, tên "A + B", số sát thương lớn.
4. Quái X có cả ba dấu từ ba người khác hệ trong 3 giây: đòn **Tam Tài Quy Nguyên** (ưu tiên hơn đòn đôi), rung màn hình nhẹ, ba người được +10% Ấn khí.
5. Quái X vừa dính Hợp Kích thì 4 giây sau mới dính tiếp đòn đôi, 12 giây mới dính tiếp đòn ba (chặn spam).

### 4.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Điều kiện | chỉ PvE (quái, boss, Tà Thú, Hung Tinh, quái hang); hai/ba người **cùng nhóm**, cùng bản đồ, **khác hệ**; dấu chỉ từ chiêu (không phải đánh thường), kể cả Ấn Kỹ |
| Cửa sổ thời gian | dấu tồn tại 3.000 ms kể từ đòn đặt dấu; đòn của người thứ hai phải tới trong cửa sổ |
| Hồi trên mỗi quái | đòn đôi 4.000 ms; đòn ba 12.000 ms (đòn ba không bị chặn bởi hồi đòn đôi) |
| Sát thương đòn đôi | `bonus = k · dmg2`, `dmg2` là sát thương của đòn kích hoạt (đã gồm chí mạng, khắc hệ), `k` theo cặp ở bảng dưới |
| Sát thương đòn ba | `bonus = 3,0 · dmg3`, lan bán kính 120 quanh quái (tối đa 8 quái) |
| Trần | mỗi đòn Hợp Kích lên boss ≤ 3% sinh lực tối đa boss; lên quái thường không trần |
| Chia công | sát thương Hợp Kích chia **đều** cho những người góp dấu khi ghi `dmgBy` (thưởng theo hạng boss, EXP chia theo % sát thương), không ai được tính trọn |

| Cặp hệ | Tên | `k` | Hiệu ứng thêm | Lan |
|---|---|---|---|---|
| Hỏa + Phong | Phong Trợ Hỏa Uy | 1,5 | không | bán kính 90 quanh quái, tối đa 6 quái |
| Thủy + Hỏa | Thủy Hỏa Tương Xung | 1,2 | Phá Giáp 20% trong 4 giây | không |
| Phong + Thủy | Hàn Phong Ngưng Thủy | 1,2 | Lạnh Cóng 40% trong 3 giây (boss: tỉ lệ dính theo `bossRes`) | không |
| Hỏa + Thủy + Phong | Tam Tài Quy Nguyên | 3,0 | +100 Ấn khí cho 3 người góp | bán kính 120, tối đa 8 quái |

Ước lượng (người chơi trung bình cấp 120, chiêu kích hoạt ~35.000 sát thương lên boss): nhóm 3 người đủ 3 hệ đánh boss 12 giây sinh ~2 đòn đôi + 1 đòn ba ≈ 2 × 1,35 × 35.000 + 3 × 35.000 ≈ 200.000, nhóm gây ~160.000/giây × 12 = 1,9 triệu → **+10-11% DPS nhóm**. Hai hệ: ~3 đòn đôi/12 giây ≈ +6-8%. Mục tiêu đo: 2 hệ +5-9%, 3 hệ +8-15%. Boss thế giới tính máu theo số người nên Hợp Kích không làm boss "tan" nhanh bất thường; boss vùng solo không đổi (một mình không có Hợp Kích).

### 4.5 Dữ liệu (`src/shared/data/combo.js`, mới)

```js
'use strict';

// Hợp Kích: đồng đội khác hệ ra chiêu trúng cùng quái trong cửa sổ thời gian. DESIGN_RULES mục 9, hàng "Hợp Kích".
const COMBO = {
  window: 3000, pairCd: 4000, tripleCd: 12000, bossCap: 0.03,
  pairs: {
    'fire+wind': { name: 'Phong Trợ Hỏa Uy', k: 1.5, splash: 90, max: 6, c: ['#ff7043', '#9ccc65'] },
    'fire+water': { name: 'Thủy Hỏa Tương Xung', k: 1.2, st: { k: 'armor', v: 20, dur: 4000 }, c: ['#ff7043', '#42a5f5'] },
    'water+wind': { name: 'Hàn Phong Ngưng Thủy', k: 1.2, st: { k: 'chill', v: 40, dur: 3000 }, c: ['#42a5f5', '#9ccc65'] },
  },
  triple: { name: 'Tam Tài Quy Nguyên', k: 3.0, splash: 120, max: 8, seal: 100, c: ['#ff7043', '#42a5f5', '#9ccc65'] },
};
// khóa cặp không phụ thuộc thứ tự: sắp tên hệ theo bảng chữ cái
const pairKey = (a, b) => (a < b ? `${a}+${b}` : `${b}+${a}`);

module.exports = { COMBO, pairKey };
```

`check-data` (khối "Hợp Kích"): đủ 3 cặp của 3 hệ trong `ELEMENTS`; `0 < k ≤ 2` cho cặp, `k ≤ 3` cho ba; `splash ≤ 120`; `bossCap ≤ 0.03`; `st.k` thuộc `STATUS` khi có `status.js`; tên không trùng tên kỹ năng.

### 4.6 Giao thức

| Chiều | Gói | Trường |
|---|---|---|
| máy chủ → bản đồ | `combo` | `k` (một trong `'fire+wind'`, `'fire+water'`, `'water+wind'`, `'triple'`), `tid` (`m<id>`), `by` (mảng tên người góp), `list` ([[`m<id>`, sát thương]]) |
| máy chủ → máy khách | `party` | thêm `els` (hệ từng thành viên) để cửa sổ Nhóm hiện gợi ý |
| dữ liệu tĩnh | `data.combo` | `COMBO` |

Không có hành động mới từ máy khách: Hợp Kích do máy chủ phát hiện hoàn toàn.

### 4.7 Máy chủ, máy khách, DOM

- **Module `modules/combo/index.js`**: móc `hitDealt(p, target, dmg, src)` (từ `sig-thanhan`): bỏ qua nếu `target.kind !== 'm'`, `src.basic`, `!p.party`, bản đồ `arena`. Trên quái lưu `m.marks = { fire: { pid, t, dmg }, water: { pid, t, dmg }, wind: { pid, t, dmg } }` (chỉ trong RAM). Khi người thứ hai/ba khác hệ, cùng nhóm, trong cửa sổ: tính đòn, gây sát thương qua `combat.damageMonster` với phần ghi công chia đều (thêm tham số tùy chọn `credit: [[p, phần]]` vào `damageMonster`, mặc định giữ hành vi cũ), phát `combo`, áp `status` nếu có module `status`, cộng Ấn khí qua `world.mods.seal.add(p, n)` nếu có. Xóa dấu đã dùng. Lệnh admin `/hopkich on|off` (tắt toàn máy chủ để so đo) và `/hopkich test` (gắn 3 dấu giả lên quái gần nhất).
- **Lõi**: `combat.damageMonster(m, p, dmg, credit)` thêm tham số tùy chọn `credit` (chữ ký cũ vẫn chạy). Ghi báo cáo.
- **Máy khách**: `game.js` khối "Hợp Kích": `onCombo(m)` → `fx.combo(x, y, def, names)` và chữ sát thương; vẽ vòng dấu hệ dưới chân quái khi gói `hit` đến từ đồng đội (máy khách tự suy từ `hit` + hệ của người đánh, chỉ để trang trí, không quyết định gì). `render/fx/combo.js` (mới) + phương thức `combo()` trong `FX` (export mới): hai/ba vòng màu hệ xoáy vào nhau 300 ms rồi `burst`, tên đòn chữ 30px viền đen. `windows/party.js`: dòng "Hệ trong nhóm: Hỏa · Phong — Hợp Kích sẵn sàng".
- **DOM mới**: không có id mới; lớp `.pt-combo` trong cửa sổ Nhóm.

### 4.8 Bố cục điện thoại

Tên đòn Hợp Kích vẽ trên canvas phía trên quái, cỡ chữ 24px trên điện thoại (30px máy tính), tối đa 2 dòng, không chồng khung mục tiêu (`#hud-target`): nếu quái nằm trong 90px đầu khung nhìn thì chữ vẽ dưới quái. Dòng gợi ý ở cửa sổ Nhóm xuống dòng khi hẹp, không thêm nút.

### 4.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Nhân vật phụ cùng tài khoản/máy đứng nhóm để "nuôi" đòn | chấp nhận: hai nhân vật vẫn phải ra chiêu thật, có hồi chiêu, tốn chakra; Hợp Kích chỉ tăng sát thương, không sinh vật phẩm |
| Hợp Kích để giành hạng 1 boss | sát thương chia đều cho người góp; trần 3% sinh lực boss mỗi đòn |
| Máy khách giả gói `combo` | máy khách không gửi gì; gói chỉ đi từ máy chủ |
| Tràn bộ nhớ dấu | dấu nằm trên quái, xóa khi quái chết/biến mất; tối đa 3 dấu mỗi quái |

### 4.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | nhóm 3 hệ quá mạnh ở phó bản/hang | đo bằng `tools/balance.js` khối "Hợp Kích" (mô phỏng nhóm 3 người 60 giây); trần 15% DPS nhóm; nếu vượt thì giảm `k` |
| Cân bằng | làng có phái hỗ trợ (Quạt) bị bỏ rơi khỏi nhóm | Quạt là phái Phong duy nhất đánh xa: nhóm muốn đủ ba hệ vẫn cần Phong; Thiên Nữ Tán Hoa (Ấn Kỹ) cũng đặt dấu |
| Kỹ thuật | móc `hitDealt` gọi nhiều lần mỗi chiêu | xử lý O(1) mỗi đòn, chỉ đọc/ghi `m.marks`; đo `tick` trung vị với 300 người (`ops-load-test`) không tăng quá 5% |
| Gian lận | không có điểm yếu đáng kể | xem 4.9 |

### 4.11 Tiêu chí chấp nhận

1. `tests/features/combo.js` ≥ 15 kiểm tra đạt.
2. `tools/balance.js` khối "Hợp Kích": 2 hệ +5-9% DPS nhóm, 3 hệ +8-15% ở cấp 60/120/199; solo +0%.
3. `npm run check` sạch; `npm test` đạt.
4. `test:perf` với 3 người nhóm đánh bãi quái đông: p95 ≤ 8 ms/khung.
5. Ảnh chụp đòn Tam Tài Quy Nguyên (desktop + điện thoại), chữ không chồng HUD, `OK no console errors`.

### 4.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị (`comboUnitTests`) | thế giới giả 3 người chơi (kiem/dao/kunai) cùng nhóm, 1 quái: A rồi B trong 1 giây → 1 gói `combo` `k = 'fire+wind'`, sát thương = 1,5 × đòn B; B lại sau 2 giây → không có (hồi 4 giây); A, B, C trong 3 giây → `triple`, mỗi người +100 Ấn khí (khi có `seal`); hai người khác nhóm → không có; đánh thường → không đặt dấu; quá 3 giây → không có; boss sinh lực 1.000.000 → mỗi đòn ≤ 30.000; `dmgBy` chia đều |
| Bot (`comboTest`, `combo1`, `combo2`) | lập nhóm 2 bot khác hệ, `/hopkich test` → nhận `combo`; rời nhóm → không còn |
| E2E | không bắt buộc (hiệu ứng vẽ); ảnh chụp ở tiêu chí 5 |

---
## 5. Thức Tỉnh (`sig-thuctinh`)

### 5.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-thuctinh` |
| Trụ cột | **P3** (lựa chọn lối chơi, không chỉ cộng số), **P5** (nhánh là đánh đổi ngang nhau, đổi nhánh có phí và hồi, không bán bằng lượng) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · L |
| Phụ thuộc | `core-levelcap-199` (cấp 150), `cmb-skills-199` (nhánh bậc 2 sửa kỹ năng id 11-13), `eco-bound` (`payXu`), `cmb-balance`, `dev-balance-tool`; `cmb-status` cho các nhánh có hiệu ứng (thiếu thì bỏ phần hiệu ứng, `check-data` cảnh báo) |
| Vùng file | Lõi server (`core/player.js` `recalc`: khóa `mods` trong bảng tạm; `core/combat.js` `useSkill`/`pickVictims` đọc `p.skMods`), module mới `modules/awaken`, dữ liệu `shared/data/awaken.js` + 12 boss Tâm Ma (gói boss `shared/data/bosspacks/trial.js` theo mẫu `50-worldboss-events.md` mục 2.1) + 2 bản đồ phó bản `tamma1`, `tamma2` (`maps.js`), Quái (`render/monster/variants.js`, `humanoid.js`: 6 bộ Tâm Ma), cửa sổ mới `windows/awaken.js`, `windows/skills.js` (hiện số đã sửa), `windows/dialog.js` không đổi, kiểm thử `tests/features/awaken.js` |
| opencode | không: cân bằng 24 nhánh cần Claude chốt số; phần dữ liệu và cửa sổ có thể giao sau khi số đã chốt |

### 5.2 Mục đích, vì sao thu hút

Ở hậu kỳ, hai người cùng phái cùng cấp hiện chơi giống hệt nhau. Thức Tỉnh cho hai **mốc lớn** (cấp 100, cấp 150), mỗi mốc là một trận đấu tâm ma một mình rồi một quyết định: Kiếm thiêu rụi cả bầy hay Kiếm một nhát đoạt mệnh. Lựa chọn hiện trên cửa sổ xem người chơi, tạo bàn luận "nhánh nào mạnh" mà không có đáp án duy nhất vì hai nhánh mạnh ở hai việc khác nhau (dọn bãi/hang so với đánh boss/PvP).

### 5.3 Luồng người chơi

1. Cấp 100: Trưởng Làng làng phái nhắn "Ngươi đã chạm ngưỡng Thức Tỉnh. Hãy tới gặp ta." (dòng mới trong khối theo dõi nhiệm vụ, bấm tự tìm đường).
2. Hội thoại Trưởng Làng có lựa chọn "Thức Tỉnh" → mở cửa sổ **Thức Tỉnh**: 2 tầng (Nhất Trọng cấp 100, Nhị Trọng cấp 150), mỗi tầng 2 thẻ nhánh có tên, mô tả, số thay đổi cụ thể.
3. Bấm "Vào Tâm Ma Cảnh": vào phó bản một mình `tamma1`, đối đầu **Tâm Ma** (hình ninja đúng phái mình, bảng màu tối, 3 chiêu boss có báo trước). 5 phút. Thua hoặc hết giờ: về làng đầy máu, không mất EXP, thử lại sau 30 giây.
4. Thắng: chọn một nhánh (hộp xác nhận `ask()`: "Chọn Viêm Hải Kiếm Hồn? Đổi nhánh sau này tốn 200.000 xu và chỉ đổi được 7 ngày một lần."). Thông báo toàn máy chủ "X đã Thức Tỉnh Nhất Trọng: Viêm Hải Kiếm Hồn".
5. Kỹ năng bị nhánh sửa hiện số mới trong cửa sổ Kỹ năng (ví dụ "Bán kính 85 → 106"), có huy hiệu nhánh.
6. Cấp 150: lặp lại với Nhị Trọng (`tamma2`, Tâm Ma cấp 150).
7. Đổi nhánh: ở Trưởng Làng, "Đổi nhánh", mất phí, hồi 7 ngày. Lần đổi đầu tiên trong 24 giờ sau khi chọn: miễn phí (sửa chọn nhầm).

### 5.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Tầng | Nhất Trọng: cấp 100, phó bản `tamma1`, Tâm Ma cấp 100 · Nhị Trọng: cấp 150, `tamma2`, Tâm Ma cấp 150 (cần đã chọn Nhất Trọng) |
| Tâm Ma | boss chuẩn theo `balance.md` (sinh lực ×150, công ×1,5, thủ ×1,6) → người chơi trung bình solo ~2,5 phút; 3 chiêu `BOSS_SKILLS` (một `beam`, một `quake`, một `summon` gọi 2 "Ảo Ảnh"); cờ `trial: true` (không đặt trên bản đồ, không rơi đồ, phó bản/Tà Thú/Hung Tinh/tháp không chọn) |
| Thử lại | không giới hạn số lần; chờ 30 giây giữa hai lần vào; không mất EXP khi thua trong phó bản Tâm Ma |
| Hiệu lực nhánh | qua móc `stats`: `pas` cộng như nội tại; `mods` ghi `t.mods[sid] = { mul, cd, radius, range, heal, hits, st }`, `recalc` lưu `p.skMods`; `useSkill` nhân/cộng lúc dùng |
| Giới hạn mỗi sửa đổi | `mul` ≤ ×1,25 · `cd` ≥ ×0,85 · `radius`/`range` ≤ ×1,25 · `heal` ≤ ×1,2 · `hits` +1 chỉ khi `mul` ≤ ×0,75 cùng chiêu · hiệu ứng: tỉ lệ ≤ 30%, thời lượng ≤ 3 giây (khống chế ≤ 1,5 giây) |
| Giới hạn chỉ số `pas` mỗi nhánh | `crit`/`dodge` ≤ 3 · `hpPct`/`defPct` ≤ 10 · `critDmg` ≤ 12 · `skillDmg` ≤ 5 |
| Mục tiêu sức mạnh | mỗi tầng +5-7% "điểm sức mạnh" (trung bình DPS boss một mục tiêu và DPS bầy 5 quái, hoặc sinh lực hiệu dụng với nhánh thủ); hai nhánh cùng tầng chênh ≤ 4% điểm sức mạnh |
| Đổi nhánh | phí `200.000 · tầng` xu (`payXu`: xu khóa trước), hồi 7 ngày; lần đầu trong 24 giờ sau khi chọn miễn phí và không tính hồi |
| PvP | nhánh có hiệu lực ở mọi nơi (là chỉ số nhân vật); khống chế từ nhánh chịu `pvpCcMul` 0,5 của `status` |

24 nhánh (mã `<phái>_<tầng><a|b>`; tên không trùng tên kỹ năng hiện có hay kỹ năng hậu kỳ):

| Phái | Nhánh | Tên | Sửa đổi | Lối chơi |
|---|---|---|---|---|
| Kiếm | 1a | Viêm Hải Kiếm Hồn | `k2` bán kính ×1,25 + Bỏng 25% (3 giây); `k5` bán kính ×1,15 | dọn bầy |
| Kiếm | 1b | Nhất Kiếm Đoạt Mệnh | `k1` ×1,25; `k3` ×1,10; chí mạng +3 | đánh boss |
| Kiếm | 2a | Niết Bàn Trùng Sinh | % sinh lực +6, % phòng thủ +6; `k11` hồi ×0,85 | trụ lâu |
| Kiếm | 2b | Kiếm Ý Thông Thiên | `k12` ×1,15; sát thương chí mạng +12 | dồn sát thương |
| Tiêu | 1a | Mãn Thiên Hoa Vũ | `t2` bán kính ×1,2; `t5` bán kính ×1,15; `t6` hồi ×0,9 | dọn bầy |
| Tiêu | 1b | Hỏa Tinh Truy Mệnh | `t4` ×1,2; `t1`, `t4` tầm ×1,1; chí mạng +3 | đánh boss từ xa |
| Tiêu | 2a | Tinh Hỏa Liệu Nguyên | `t11` hồi ×0,85; `t13` bán kính ×1,12 | dọn bầy |
| Tiêu | 2b | Ảnh Sát Vô Hình | `t12` ×1,15; né +3 | đơn mục tiêu, PvP |
| Kunai | 1a | Hàn Băng Thứ Cốt | `n1` + Lạnh Cóng 30% (2 giây); `n4` ×1,15 | khống chế |
| Kunai | 1b | Huyền Thủy Kim Thân | % phòng thủ +8, % sinh lực +5; `n3` hồi máu ×1,15 | trụ lâu, hỗ trợ |
| Kunai | 2a | Băng Phong Vạn Lý | `n13` bán kính ×1,12 + Đóng Băng 15% (1,5 giây) | khống chế bầy |
| Kunai | 2b | Thương Lan Liên Kích | `n12` +1 đòn, hệ số ×0,7; % sát thương kỹ năng +4 | đơn mục tiêu |
| Cung | 1a | Tiễn Vũ Lưu Ly | `c2` bán kính ×1,2; `c5` bán kính ×1,15 | dọn bầy |
| Cung | 1b | Bách Bộ Xuyên Dương | `c1`, `c4` tầm ×1,15 và ×1,1; chí mạng +3 | bắn tỉa |
| Cung | 2a | Bích Hải Triều Dâng | `c11` hồi ×0,85; `c13` tầm ×1,12 | dọn đường thẳng |
| Cung | 2b | Truy Phong Nhất Tiễn | `c12` ×1,15; sát thương chí mạng +12 | dồn sát thương |
| Đao | 1a | Cuồng Phong Đao Trận | `d2` bán kính ×1,25 + Phá Giáp 25% (3 giây) | dọn bầy, mở giáp cho nhóm |
| Đao | 1b | Thiết Trụ Đao Hồn | % phòng thủ +10, % sinh lực +6 | đỡ đòn |
| Đao | 2a | Truy Phong Ảnh Bộ | `d12` tầm lướt ×1,2, hồi ×0,85 | cơ động |
| Đao | 2b | Vạn Kiếp Đao Ý | `d13` ×1,15; % sát thương kỹ năng +5 | dồn sát thương |
| Quạt | 1a | Xuân Phong Hóa Vũ | `q3` hồi máu ×1,2, hồi chiêu ×0,85 | hồi máu nhóm |
| Quạt | 1b | Phong Nhận Phi Hoa | `q2` ×1,15; `q5` ×1,12 | gây sát thương |
| Quạt | 2a | Vạn Mộc Hồi Xuân | `q12` hồi máu ×1,15, hồi chiêu ×0,85 | hồi máu nhóm |
| Quạt | 2b | Phong Vân Biến Ảo | `q13` bán kính ×1,12 + Câm Lặng 15% (1,5 giây) | khống chế |

Số liệu trong bảng là **khởi điểm**; `tools/balance.js` khối "Thức Tỉnh" phải chứng minh tiêu chí "chênh ≤ 4%" trước khi gộp, worker được chỉnh trong giới hạn ở bảng quy tắc.

### 5.5 Dữ liệu

`src/shared/data/awaken.js` (mới):

```js
'use strict';

// Thức Tỉnh: 2 tầng × 2 nhánh mỗi phái. mods: hệ số nhân (mul, cd, radius, range, heal), hits cộng, st thêm hiệu ứng.
const AWAKEN = {
  tiers: [
    { lv: 100, map: 'tamma1', name: 'Nhất Trọng' },
    { lv: 150, map: 'tamma2', name: 'Nhị Trọng' },
  ],
  trialTime: 5 * 60 * 1000, retryCd: 30000,
  swapFee: [200000, 400000], swapCd: 7 * 86400000, freeSwap: 86400000,
};
const BRANCHES = {
  kiem_1a: { cls: 'kiem', tier: 0, name: 'Viêm Hải Kiếm Hồn', mods: { k2: { radius: 1.25, st: { k: 'burn', ch: 25, dur: 3000, v: 6 } }, k5: { radius: 1.15 } }, desc: 'Biển lửa lan rộng, thiêu cả bầy quái.' },
  kiem_1b: { cls: 'kiem', tier: 0, name: 'Nhất Kiếm Đoạt Mệnh', pas: { crit: 3 }, mods: { k1: { mul: 1.25 }, k3: { mul: 1.1 } }, desc: 'Dồn kiếm ý vào một nhát, đoạt mạng kẻ mạnh.' },
  // 22 nhánh còn lại theo bảng GDD 04 mục 5.4, cùng lược đồ trường
};
// boss Tâm Ma theo phái và tầng: tm_<phái>_<1|2> (bosspacks/trial.js)
const trialBoss = (cls, tier) => `tm_${cls}_${tier + 1}`;

module.exports = { AWAKEN, BRANCHES, trialBoss };
```

Gói boss `src/shared/data/bosspacks/trial.js` (mới): 12 dòng `BOSSES` (tên "Tâm Ma · Hỏa Kiếm", "Tâm Ma · Hỏa Tiêu", "Tâm Ma · Thủy Kunai", "Tâm Ma · Thủy Cung", "Tâm Ma · Phong Đao", "Tâm Ma · Phong Quạt", mỗi tên ở cấp 100 và 150), kiểu sprite người (`HUM`), cờ `trial: true`, 3 chiêu mỗi boss trong giới hạn `DESIGN_RULES.md` mục 9. Bản đồ `tamma1` (theme `mist`), `tamma2` (theme `abyss`): `instance: true`, `trial: true`, rộng 960, không cổng.

`check-data` (khối "Thức Tỉnh"): mỗi phái đủ 4 nhánh (2 tầng × a/b); mọi `sid` trong `mods` thuộc đúng phái và có `req` ≤ cấp tầng (tầng 1 chỉ sửa kỹ năng req ≤ 100, tầng 2 sửa req ≤ 150); mọi giới hạn ở bảng 5.4; tên nhánh không trùng nhau và không trùng tên kỹ năng; boss `trialBoss` tồn tại, có cờ `trial`, có 2-3 chiêu; bản đồ `tamma1/2` tồn tại.

### 5.6 Giao thức

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| máy khách → máy chủ | `npcAct` | `a: 'awaken'` ở NPC `elder` làng phái | mở cửa sổ (`openUi { ui: 'awaken' }`) |
| máy khách → máy chủ | `awakenTrial` | `tier` (0/1) | phải đứng gần Trưởng Làng (`nearNpc`), đủ cấp, chưa qua tầng đó, hết `retryCd` |
| máy khách → máy chủ | `awakenPick` | `tier`, `b` (`'a'`/`'b'`) | đã qua thử thách tầng, chưa chọn |
| máy khách → máy chủ | `awakenSwap` | `tier`, `b` | gần Trưởng Làng, đã chọn, hết hồi hoặc trong 24 giờ miễn phí, đủ xu |
| máy chủ → máy khách | `me` | `awk: [nhánh|null, nhánh|null]`, `awkPass: [bool, bool]`, `awkSwapAt: [ms, ms]` | qua `selfData` |
| máy chủ → máy khách | `awakenResult` | `ok, msg` | kết quả chọn/đổi/thử thách |
| máy chủ → bản đồ | `pInfo` | thêm `awk` | cửa sổ xem người chơi hiện nhánh |
| dữ liệu tĩnh | `data.awaken` | `{ AWAKEN, BRANCHES }` | |

### 5.7 Máy chủ, máy khách, DOM

- **Module `modules/awaken/index.js`**: NPC `elder` đã thuộc module `quest`, nên `awaken` **không** đăng ký loại NPC mà thêm lựa chọn qua móc mới nhỏ của `quest` (một dòng: `quest` gọi `world.mods.awaken && world.mods.awaken.dialogOpts(p, n)` khi dựng hội thoại Trưởng Làng). Hành động `awakenTrial/Pick/Swap`; phó bản như `dungeon` (instance `GameMap`, hẹn giờ, `p.trialBack` để trả về chỗ cũ, chết trong `trial` thì hồi sinh tại làng đầy máu không trừ EXP: kiểm cờ `map.def.trial` trong `combat.killPlayer`, một dòng); móc `stats` (cộng `pas`, ghi `mods`), `sanitize` (`c.awk` chỉ nhận id có trong `BRANCHES` đúng phái và đúng tầng; `c.awkPass`, `c.awkAt` dạng số), `selfData`, `clientData`, `leave` (đang thử thách thì hủy, về làng). Lệnh admin `/thuctinh pass <0|1>` (đánh dấu đã qua thử thách), `/thuctinh win` (hạ Tâm Ma đang đấu), `/thuctinh reset`, `/thuctinh stat` (tỉ lệ chọn nhánh).
- **Lõi**: `Player.recalc` thêm `mods: {}` vào bảng tạm và `this.skMods = t.mods`; `combat.useSkill`/`pickVictims` đọc `const md = p.skMods[sid] || NO_MOD` để nhân `mul`, `cd`, `radius`, `range`, `heal`, cộng `hits`, thêm `st` (chuyển cho `status`). Ghi báo cáo.
- **Máy khách**: `windows/awaken.js` (mới, `renderAwaken`), import vào `ui.js` theo G3, mục `awaken` trong `refresh()`; `windows/skills.js` hiện số sau sửa đổi (`awkMods(S.G.awaken, S.me.awk)`) và huy hiệu nhánh; `windows/inspect.js` dòng "Thức Tỉnh: tên nhánh"; icon nhánh dùng lại `skillIconURL` của kỹ năng bị sửa, viền vàng (tầng 1) / tím (tầng 2).
- **DOM mới**: cửa sổ `awaken` với `[data-awtier=0|1]`, thẻ `.aw-branch[data-b=a|b]`, nút `[data-act=aw-trial]`, `[data-act=aw-pick]`, `[data-act=aw-swap]`.

### 5.8 Bố cục điện thoại

Cửa sổ Thức Tỉnh: mỗi tầng một hàng, hai thẻ nhánh cạnh nhau (mỗi thẻ ≥ 300px ở 844×390, chữ mô tả 15px tối thiểu, cuộn dọc trong cửa sổ). Nút "Vào Tâm Ma Cảnh"/"Chọn"/"Đổi nhánh" cao 44px. Màn ≤ 740px rộng: thẻ xếp dọc. Trong phó bản Tâm Ma dùng biểu ngữ dưới giữa `#hud-trial` (cùng kiểu `#hud-arena`: tên tầng, đồng hồ, nút "Rời" bấm 2 lần).

### 5.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Gửi `awakenPick` khi chưa qua thử thách / chọn nhánh phái khác | server kiểm `awkPass[tier]`, `BRANCHES[id].cls === c.cls`, tra bằng `Object.hasOwn` |
| Đổi nhánh liên tục để né phí | hồi 7 ngày lưu trên nhân vật; miễn phí chỉ một lần trong 24 giờ đầu |
| Nhờ người khác vào phó bản đánh hộ | phó bản một mình (instance riêng), không vào nhóm, không dịch chuyển vào |
| Dữ liệu `c.awk` bị sửa tay | `sanitize` loại nhánh không hợp lệ, `recalc` chỉ đọc qua `BRANCHES` |
| Treo phó bản | 5 phút hết giờ thì đẩy ra; thoát game thì hủy |

### 5.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | một nhánh áp đảo (ai cũng chọn) | đo tỉ lệ chọn sau 2 tuần (lệnh admin `/thuctinh stat`); nhánh > 75% người chọn thì xem lại số; mọi số trong dữ liệu nên chỉnh không cần sửa mã |
| Cân bằng | cộng dồn với Kinh Mạch, nội tại làm vượt trần chí mạng/né | trần chung giữ ở `recalc` (chí mạng ≤ 60, né ≤ 45) |
| Kỹ thuật | `useSkill` thêm nhánh đọc `skMods` làm sai chiêu cũ | `NO_MOD` mặc định là phép đồng nhất; kiểm thử đơn vị so sát thương có/không nhánh |
| Kỹ thuật | 12 boss Tâm Ma tốn công vẽ | dùng `HUM` có sẵn + bảng màu tối theo phái, không vẽ hình mới |
| Gian lận | không đáng kể | xem 5.9 |

### 5.11 Tiêu chí chấp nhận

1. `tests/features/awaken.js` ≥ 20 kiểm tra đạt.
2. `tools/balance.js` khối "Thức Tỉnh": với cả 6 phái ở cấp 100 và 150, mỗi tầng +5-7% điểm sức mạnh, hai nhánh cùng tầng chênh ≤ 4%.
3. Tâm Ma: người chơi trung bình cấp 100/150 solo 2-4 phút (khối cân bằng `check-data` với cờ `trial`).
4. `npm run check` sạch; `npm test` đạt.
5. Ảnh cửa sổ Thức Tỉnh và phó bản Tâm Ma desktop + điện thoại, `OK no console errors`.

### 5.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | `recalc` với `awk = ['kiem_1a', null]`: `skMods.k2.radius === 1.25`; nhân vật Cung mang `kiem_1a` (dữ liệu sửa tay) → `sanitize` xóa; `useSkill` k2 có nhánh trúng quái ở khoảng cách 100 (ngoài 85, trong 106); nhánh `n12` đánh 3 đòn; phí đổi nhánh tầng 2 là 400.000 |
| Bot (`awakebot`) | `/lv 100`, `/tp v_fire`, đi tới Trưởng Làng, `awakenPick` khi chưa qua → `ok false`; `/thuctinh pass 0`; `awakenPick { tier: 0, b: 'a' }` → `me.awk[0] === 'kiem_1a'`; `awakenSwap` ngay → miễn phí, xu không đổi; lần 2 → "Hãy đợi"; `awakenTrial` vào phó bản → nhận `enterMap` `tamma1`; `/boss` hạ Tâm Ma bằng lệnh admin `/thuctinh win` → `awkPass[1]` vẫn false (đúng tầng 0) |
| E2E | không bắt buộc; ảnh ở tiêu chí 5 |

---

## 6. Tháp Vô Tận (`pve-thapvotan`)

### 6.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `pve-thapvotan` |
| Trụ cột | **P3** (tầng thủ lĩnh có chiêu báo trước, thời gian giới hạn), **P2** (lượt leo 5-15 phút, làm được trong giờ nghỉ) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · L |
| Phụ thuộc | `cmb-balance` (thang boss), `eco-bound` (thưởng lần đầu là xu khóa/đồ khóa), `soc-titles` (3 danh hiệu tầng 50/100/150; thiếu thì bỏ phần danh hiệu); dùng được trước `core-levelcap-199` (tầng có cấp quái > cấp tối đa chưa mở) |
| Vùng file | module mới `modules/tower`, dữ liệu `shared/data/tower.js` + 5 bản đồ `thap1..thap5` (`maps.js`), Lõi (`core/combat.js` `killPlayer`: chết trong tháp không mất EXP, một dòng), `windows/tower.js` (mới), `windows/rank.js` (tab "Tháp"), HUD `#hud-tower` (`index.html`, `css/features.css`, `css/touch.css`), `game/game.js` (khối gói), kiểm thử `tests/features/tower.js` |
| opencode | có: luật và số đã chốt ở đây, kiểm bằng `npm test`, `npm run check`, ảnh chụp |

### 6.2 Mục đích, vì sao thu hút

Người chơi thích leo thứ hạng, nhưng lôi đài là PvP và không phải ai cũng muốn. Tháp Vô Tận là thước đo PvE thuần: một con số ("tầng 87") dễ khoe, BXH tuần đặt lại để luôn có cơ hội, chia 3 dải cấp nên người cấp 60 không phải so với người cấp 190. Mỗi lượt leo ngắn (5-15 phút), có điểm dừng rõ ràng, hợp phiên chơi của người bận. Tầng thủ lĩnh dùng chiêu báo trước nên đồ tốt rút ngắn thời gian, còn tay né quyết định leo được bao xa.

### 6.3 Luồng người chơi

1. Cấp 30, ở bất kỳ làng nào, nói chuyện với Hộ Pháp (NPC `dungeon`) → lựa chọn "Tháp Vô Tận" → cửa sổ **Tháp Vô Tận**: kỷ lục, kỷ lục tuần, hạng tuần trong dải, lượt còn lại hôm nay (3), phần thưởng lần đầu kế tiếp, tab BXH tuần.
2. Bấm "Leo từ tầng 1" hoặc "Xuất phát nhanh từ tầng N" (N = 70% kỷ lục, làm tròn xuống bội 5, cộng 1).
3. Vào phòng tháp (một mình). Biểu ngữ `#hud-tower`: "THÁP VÔ TẬN · Tầng 37 · 01:12 · còn 3 quái". 3 giây chuẩn bị rồi quái xuất hiện.
4. Hạ hết quái trước khi hết giờ → "Tầng 37 vượt qua!", hồi 20% sinh lực/chakra, 3 giây sau tầng 38 (cùng phòng, dựng lại quái, có thể đổi nền theo dải tầng).
5. Mỗi 10 tầng là tầng thủ lĩnh: 1 boss có chiêu báo trước + 2 quái hộ vệ, 150 giây.
6. Chết, hết giờ, hoặc bấm "Rời" (2 lần): lượt leo kết thúc, cửa sổ kết quả: tầng đạt, kỷ lục, hạng tuần, thưởng lần đầu nhận được (đã vào túi hoặc hộp thư). Về chỗ cũ, đầy máu nếu chết (không mất EXP).
7. 00:00 thứ Hai: thưởng hạng tuần qua hộp thư, kỷ lục tuần về 0.

### 6.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Điều kiện | cấp ≥ 30, không trong nhóm đang ở phó bản, không đang thi đấu, không chết; đứng gần Hộ Pháp |
| Lượt | 3 lượt bắt đầu mỗi ngày (giờ Việt Nam); một lượt = leo liên tục tới khi dừng |
| Số tầng | 150 |
| Cấp quái tầng f | `Lf = min(199, 5 + ⌊1,3 · f⌋)` (tầng 1: 6 · 50: 70 · 100: 135 · 150: 199); tầng có `Lf > MAX_LEVEL` chưa mở |
| Tầng thường | `n = min(10, 4 + ⌊f/25⌋)` quái lấy từ 3 loài quái thường gần `Lf` nhất (`pickPool` như `dungeon`, bỏ quái `event/trial/cave/clan`); sinh lực ×2,0, công ×1,2; thời gian 90 giây |
| Tầng thủ lĩnh (f chia hết 10) | 1 boss gần `Lf` nhất có `BOSS_SKILLS` (không `event/trial`), sinh lực = sinh lực boss chuẩn × 0,27 (≈ 40 giây solo người chơi trung bình cùng cấp), + 2 quái hộ vệ; thời gian 150 giây. Tầng 50/100/150: dùng hình Tà Thú gần cấp nhất (biến thể có sẵn) với cùng hệ số |
| Giữa hai tầng | 3 giây, hồi 20% sinh lực và chakra; được dùng bình thuốc như ngoài bản đồ |
| Kết thúc | chết / hết giờ / rời / mất kết nối → kỷ lục lượt = tầng cuối cùng đã vượt |
| Xuất phát nhanh | tầng `5 · ⌊0,7 · kỷ lục / 5⌋ + 1` (kỷ lục mọi thời), không nhận thưởng lần đầu các tầng bỏ qua (đã nhận từ trước) |
| Ghi hạng tuần | theo `wkBest` giảm dần, bằng nhau thì `wkTime` (tổng thời gian leo của lượt lập kỷ lục) tăng dần |
| Dải cấp BXH | **Tân Tú** 30-79 · **Trung Kiên** 80-139 · **Tông Sư** 140-199, theo cấp lúc lập kỷ lục tuần (lên cấp giữa tuần thì kỷ lục cũ ở lại dải cũ; lượt sau tính dải mới) |
| Đồng thời | tối đa 80 phòng tháp mở cùng lúc; đầy thì báo "Tháp đang đông, ngươi thử lại sau 1 phút" (không trừ lượt) |

Thưởng lần đầu (mỗi nhân vật, vĩnh viễn, là thưởng kiểu thành tựu nên **khóa**):

| Mốc | Thưởng |
|---|---|
| mỗi tầng | `40 · Lf` xu khóa |
| tầng chia hết 5 | 2 đá cường hóa theo cấp `Lf` (`stoneOf`), khóa |
| tầng chia hết 10 | 1 ngọc khảm ngẫu nhiên cấp `min(8, 1 + ⌊f/20⌋)` + 1 Rương Báu, khóa |
| tầng 50 / 100 / 150 | danh hiệu `t_tower_1` "Đăng Tháp Khách" (Hiếm, công +20) / `t_tower_2` "Vấn Đỉnh Cao Thủ" (Sử thi, công +50, sinh lực +200) / `t_tower_3` "Vô Tận Tháp Chủ" (Huyền thoại, công +90, chí mạng +1,5) — trong `TITLE_STAT_CAP` của `soc-titles` |

Tổng xu khóa lần đầu cả 150 tầng ≈ 40 × Σ Lf ≈ 40 × 15.200 ≈ 608.000 xu khóa (một lần mỗi nhân vật): nhỏ so với thu nhập hậu kỳ ~1 triệu xu/giờ (`content/40-items-shops.md` mục 8).

Thưởng hạng tuần (xếp hạng: xu và đồ **thường**, gửi hộp thư), mỗi dải:

| Hạng | Lượng | Xu | Vật phẩm | Điều kiện |
|---|---|---|---|---|
| 1 | 40 | 100.000 | Rương Báu ×2 | `wkBest` ≥ 10 (Tân Tú) / 20 (Trung Kiên) / 30 (Tông Sư) |
| 2-3 | 25 | 60.000 | Rương Báu ×1 | như trên |
| 4-10 | 12 | 30.000 | | như trên |
| 11-50 | 4 | 10.000 | | như trên |

Tổng lượng phát tối đa mỗi tuần: 3 dải × (40 + 2·25 + 7·12 + 40·4) = 3 × 334 = **1.002 lượng/tuần toàn máy chủ**, ghi vào mô hình kinh tế (`eco-economy-model`).

### 6.5 Dữ liệu (`src/shared/data/tower.js`, mới)

```js
'use strict';

// Tháp Vô Tận: leo tầng một mình, BXH tuần theo dải cấp. DESIGN_RULES mục 9, hàng "Tháp Vô Tận".
const TOWER = {
  minLv: 30, floors: 150, runsPerDay: 3, maxRooms: 80,
  lvOf: (f) => Math.min(199, 5 + Math.floor(1.3 * f)),
  countOf: (f) => Math.min(10, 4 + Math.floor(f / 25)),
  mob: { hp: 2.0, atk: 1.2, time: 90000 },
  boss: { every: 10, hp: 0.27, guards: 2, time: 150000, special: [50, 100, 150] },
  gap: 3000, regen: 0.2, quick: 0.7,
  maps: [[30, 'thap1'], [60, 'thap2'], [90, 'thap3'], [120, 'thap4'], [150, 'thap5']], // [tầng tối đa, bản đồ]
  brackets: [{ id: 'tantu', name: 'Tân Tú', lv: [30, 79], min: 10 }, { id: 'trungkien', name: 'Trung Kiên', lv: [80, 139], min: 20 }, { id: 'tongsu', name: 'Tông Sư', lv: [140, 199], min: 30 }],
  first: { xuPerLv: 40, stoneEvery: 5, stones: 2, gemEvery: 10, titles: { 50: 't_tower_1', 100: 't_tower_2', 150: 't_tower_3' } },
  weekly: [
    { to: 1, luong: 40, xu: 100000, items: [['chest', 2]] },
    { to: 3, luong: 25, xu: 60000, items: [['chest', 1]] },
    { to: 10, luong: 12, xu: 30000 },
    { to: 50, luong: 4, xu: 10000 },
  ],
};

module.exports = { TOWER };
```

Bản đồ (`maps.js`, sau khối `dungeon`): `thap1` (theme `cave`), `thap2` (`ruins`), `thap3` (`lava`), `thap4` (`ice`), `thap5` (`heaven`), mỗi bản `instance: true, tower: true`, rộng 960, `spawnX: 120`, không cổng, không NPC.

`check-data` (khối "Tháp Vô Tận"): `lvOf` tăng không giảm, `lvOf(150) === 199`; mỗi tầng thủ lĩnh có ít nhất 1 boss hợp lệ trong ±10 cấp; mỗi tầng thường có ≥ 3 loài quái trong ±8 cấp (với cấp ≤ `MAX_LEVEL`); 5 bản đồ tồn tại với cờ `tower`; `weekly` `to` tăng dần, lượng không tăng theo hạng; danh hiệu `first.titles` tồn tại khi có `TITLES`.

### 6.6 Giao thức

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| máy khách → máy chủ | `npcAct` | `a: 'tower'` ở NPC `dungeon` | mở cửa sổ |
| máy khách → máy chủ | `towerInfo` | `br` (dải muốn xem BXH, tùy chọn) | chặn 1 giây/lần |
| máy khách → máy chủ | `towerStart` | `quick` (bool) | gần Hộ Pháp, còn lượt, đủ điều kiện |
| máy khách → máy chủ | `towerLeave` | | kết thúc lượt |
| máy chủ → máy khách | `tower` | `me { best, wkBest, wkRank, runs, fc }`, `br`, `top` (30 dòng `[tên, phái, cấp, tầng, giây]`), `next` (thưởng lần đầu kế) | |
| máy chủ → máy khách | `towerState` | `f, Lf, state ('prep'|'fight'|'clear'|'end'), left (ms), alive, boss` | mỗi giây khi trong tháp |
| máy chủ → máy khách | `towerResult` | `f, best, wkBest, rank, br, got` (chuỗi mô tả thưởng lần đầu) | |
| máy chủ → máy khách | `me` | `tower { best, runs }` | `selfData` |

### 6.7 Máy chủ, máy khách, DOM

- **Module `modules/tower/index.js`** (mẫu `modules/dungeon` + `arena`): lớp `Tower` (`world.mods.tower`), bảng phòng `rooms: Map<pid, run>`; `run = { p, map, f, state, until, mobs: Set, t0, back }`; móc `second` (chạy từng phòng: hết giờ, hết quái, chuyển tầng), `leave` (kết thúc lượt), `enterMap` (rời phòng bằng đường khác thì kết thúc), `sanitize` (`c.tower = { best, wk, wkBest, wkTime, wkBr, runs, day, fc }` kiểu số, `fc ≤ best ≤ 150`), `selfData`, `clientData`, `rank` (tính top 30 mỗi dải mỗi 60 giây như `arena.computeRank`), lệnh admin `/thap <tầng>|win|die|reward`. Thưởng tuần: `second` kiểm `weekId` đổi (lưu `db.meta.towerWeek`), gửi thư theo `TOWER.weekly`, như `arena.payWeek`.
- **NPC**: Hộ Pháp thuộc module `dungeon`; thêm lựa chọn bằng một dòng gọi `world.mods.tower && world.mods.tower.dialogOpts(p, n)` trong hội thoại của `dungeon` (ghi báo cáo).
- **Lõi**: `combat.killPlayer` coi `map.def.tower` như phó bản không phạt EXP (một dòng cạnh kiểm `arena`).
- **Máy khách**: `windows/tower.js` (mới, `renderTower`, `renderTowerRes`), import theo G3; `windows/rank.js` tab "Tháp" (`[data-rktab=tower]`) với 3 nút dải; `game.js` khối "Tháp Vô Tận": `onTowerState` cập nhật `#hud-tower`; `index.html` thêm `#hud-tower` ngay sau `#hud-bf` (G6).
- **DOM mới**: `#hud-tower` (viên dưới giữa, cùng kiểu `#hud-arena`), cửa sổ `tower`, `towerres`, `[data-twbr=tantu|trungkien|tongsu]`, nút `[data-act=tw-start]`, `[data-act=tw-quick]`, `[data-act=tw-leave]`.

### 6.8 Bố cục điện thoại

`#hud-tower` dùng đúng vị trí và kích thước của `#hud-arena` trên điện thoại (giữa mép phải D-pad `left: 240px` và bình thuốc `right: 310px`), nút "Rời" 44px, bấm 2 lần trong 3 giây. Biểu ngữ Tà Thú đang hiện thì viên nằm ngay trên (`body.ev-on`). Cửa sổ Tháp: 2 cột (thông tin + BXH) trên máy tính, 1 cột trên màn ≤ 760px, nút 44px, BXH cuộn dọc trong cửa sổ.

### 6.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Thoát game giữa tầng để giữ kỷ lục / lượt | mất kết nối = kết thúc lượt, kỷ lục là tầng cuối **đã vượt**; lượt đã trừ lúc bắt đầu |
| Nhận lại thưởng lần đầu | `fc` (tầng cao nhất đã nhận) lưu trên nhân vật, cập nhật **trước** khi trao; `sanitize` kẹp `fc ≤ best` |
| Hai lượt cùng lúc (gửi `towerStart` liên tiếp) | một `run` mỗi người; đang có thì bỏ qua |
| Nhân vật phụ đẩy hạng | hạng tuần cần đạt tầng tối thiểu theo dải; leo là một mình nên không "kéo" được |
| Đứng ngoài tầm cho quái không tới (khai thác AI) | quái tháp chủ động (`aggro`) và không kéo về chỗ (`leash` tắt trong `tower`); phòng rộng 960 không có bục chết |
| Sửa `c.tower` | `sanitize` kiểm kiểu, kẹp `0..150`, `runs` `0..3` |

### 6.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | Quạt/Kunai (phái hồi máu) leo cao hơn hẳn | đo bằng `tools/balance.js` khối "Tháp": tầng ước tính của người chơi trung bình mỗi phái chênh ≤ 10%; chỉnh `mob.atk` nếu cần |
| Cân bằng | BXH dải Tông Sư bị người cấp 199 chiếm hết | chấp nhận (đúng tinh thần đua top); dải dưới vẫn có thưởng |
| Kỹ thuật | 80 phòng × 10 quái = 800 quái chạy AI | quái tháp dùng chung `Monster.update` như phó bản; `ops-load-test` đo thêm kịch bản 80 phòng; vượt ngưỡng thì giảm `maxRooms` |
| Kỹ thuật | lưu thêm `c.tower` | < 100 byte mỗi nhân vật |
| Gian lận | tự động đánh leo hộ | cho phép (PvE); tầng thủ lĩnh có chiêu báo trước nên đứng yên tự đánh sẽ thua ở tầng cao |

### 6.11 Tiêu chí chấp nhận

1. `tests/features/tower.js` ≥ 22 kiểm tra đạt.
2. `tools/balance.js` khối "Tháp": người chơi trung bình cấp 60/120/199 dừng ở tầng có `Lf` cao hơn cấp mình 5-10 cấp (tức tầng `(L − 5)/1,3` cộng thêm 4-8 tầng), 6 phái chênh ≤ 10%; boss tầng 10k solo 30-60 giây.
3. `npm run check` sạch; `npm test` đạt.
4. Đo tải: 80 phòng tháp đồng thời (bot giả trong `ops-load-test`), `tick` trung vị ≤ 2 ms.
5. Ảnh cửa sổ Tháp, `#hud-tower`, kết quả (desktop + điện thoại), `OK no console errors`.

### 6.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | `lvOf(1) === 6`, `lvOf(100) === 135`, `lvOf(150) === 199`; `countOf(100) === 8`; tầng xuất phát nhanh với kỷ lục 87 là 61; xếp hạng: (40, 300 s) đứng trên (40, 320 s); `sanitize` kẹp `fc ≤ best`; dải theo cấp 79/80/139/140 |
| Bot (`towerbot`) | cấp 29 → `towerStart` bị từ chối; `/lv 60`, gần Hộ Pháp, `towerStart` → `enterMap` `thap1`, `towerState.f === 1`; `/thap win` 5 lần → `f === 6`, túi có 2 đá khóa; `/thap 10` + `win` → có ngọc; `/thap die` (lệnh admin hạ chính mình trong tháp) → `towerResult`, `c.level`/EXP không đổi; lượt thứ 4 trong ngày → "hết lượt"; `/thap reward` → thư "Thưởng Tháp Vô Tận" có `luong === 40` cho hạng 1 dải Tân Tú khi `wkBest ≥ 10` |
| E2E | thêm bước: mở hội thoại Hộ Pháp → "Tháp Vô Tận" → cửa sổ hiện, bấm "Leo từ tầng 1" → `#hud-tower` hiện; điện thoại `MOBILE=1` |

---
## 7. Thủ Hộ Làng (`evt-village-defense`)

### 7.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `evt-village-defense` |
| Trụ cột | **P4** (cả làng cùng giữ một mục tiêu, người mới góp được), **P1** (giữ Linh Thạch của làng phái), **P5** (lượng chỉ khi thắng, điểm có trần) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 6 · M |
| Phụ thuộc | `quest-dailies` (chung module/dữ liệu `dailies`, đặc tả gốc `specs/dailies.md`), `eco-bound`, `eco-market` (đồ thưởng thường bán được), `evt-calendar` (dòng lịch, loại trừ giờ) |
| Vùng file | `src/shared/data/dailies.js` (`DEFENSE`), module `modules/dailies/defense.js` (`name: 'defense'`, `expose: 'defense'`), `src/server/index.js` (`config.defense`), `windows/dailies.js` (khối `.dly-def`, cửa sổ `defres`), `ui.js` (`setDefense`, dòng theo dõi), `index.html` (`#hud-defense`), `css/features.css`, `render/dailyart.js` (Linh Thạch), kiểm thử `tests/features/dailies.js` |
| opencode | có: đặc tả từng hàm đã có ở `specs/dailies.md` mục 3.6, 4.5, 6; mục này chỉ thêm phần nâng cấp cấp 199 |

### 7.2 Mục đích, vì sao thu hút

Mọi sự kiện hiện có (Tà Thú, Hung Tinh) diễn ra ở bãi luyện công, người cấp thấp đứng xem. Thủ Hộ Làng kéo cả máy chủ về **làng**, nơi ai cũng có mặt: quái tràn từ hai mép vào phá Linh Thạch giữa làng. Người cấp 15 hạ được quái yếu nhất vẫn có điểm; người cấp cao chặn tướng đợt cuối. Thắng hay thua là của chung, rõ ràng trên thanh Linh Thạch. Đây là trải nghiệm "giang hồ" dễ hiểu nhất cho người mới vào nhóm Zalo của máy chủ.

### 7.3 Luồng người chơi

1. 11:55 / 20:55: thông báo toàn máy chủ "Thủ Hộ Làng: quái sắp tấn công Làng Hỏa sau 5 phút!". Dòng "Thủ Hộ Làng" hiện trong khối theo dõi nhiệm vụ, bấm để tự tìm đường.
2. 12:00: làng được chọn (xoay vòng 3 làng theo ngày và khung giờ) vào chuẩn bị 60 giây; `#hud-defense` hiện khi đứng trong làng đó.
3. 5 đợt, mỗi đợt tối đa 2 phút, nghỉ 20 giây. Quái sinh ở hai mép, đi về Linh Thạch (x 750). Quái chạm Linh Thạch thì biến mất và trừ 4 (tướng trừ 25).
4. Đợt 5 có tướng (boss gần cấp sự kiện, máu ×0,5 so với boss chuẩn nhân hệ số đông người).
5. Hết 5 đợt còn Linh Thạch > 0: thắng. Linh Thạch về 0: thua.
6. Cửa sổ kết quả `defres` (hạng, điểm, top 10), thưởng gửi hộp thư.

### 7.4 Quy tắc, công thức, số liệu

Toàn bộ luật lõi giữ đúng `specs/dailies.md` (dữ liệu `DEFENSE` mục 2, module mục 3.6). Tóm tắt:

| Quy tắc | Giá trị |
|---|---|
| Lịch | 12:00 và 21:00 giờ Việt Nam, xoay vòng `VILLAGES[(ngày · 2 + khung) mod 3]`; báo trước 5 phút; xong trước 12:13 / 21:13 |
| Tham gia | cấp ≥ 10, đứng trong làng; không đăng ký |
| Đợt | 5 đợt × tối đa 120 giây, nghỉ 20 giây, chuẩn bị 60 giây |
| Số quái | `6 + 2 · đợt + min(10, n)` (n = số người cấp ≥ 10 trong làng), tối đa 30 quái sống cùng lúc |
| Máu quái | × `1 + 0,1 · min(20, n)`; tướng × `0,5 · (1 + 0,1 · min(20, n))` |
| Linh Thạch | 100; quái −4, tướng −25 |
| Điểm | quái 4 (chia theo % sát thương thật), tướng 60; trần 200; cần ≥ 5 điểm để có hạng |
| Thưởng (P = min(điểm, 200)) | EXP `(10 + 8 · min(L, cấp)) · P`, xu `P · (20 + 4L)` (xu **thường**: thưởng sự kiện theo G12); thua: × 0,5, không lượng, không đồ hạng |
| Thưởng hạng (chỉ khi thắng) | 1: 10 lượng + Rương Báu ×2 · 2-3: 6 lượng + Rương ×1 · 4-10: 3 lượng + đá ×3 · còn lại (≥ 5 điểm): 1 lượng |
| Quái công thành | không rơi đồ, không hồi sinh, không tính lễ hội theo mùa, `master = 'siege'` |

**Nâng cấp cho trần cấp 199** (phần riêng của tài liệu này, áp dụng khi `core-levelcap-199` đã gộp):

| Mục | Bản đặc tả gốc | Bản 1.0 |
|---|---|---|
| Cấp sự kiện `L` | trung bình 10 người cao nhất, kẹp 5..110 | kẹp 5..195 (`DEFENSE.maxL = 195`) |
| EXP | `(10 + 8 · min(L, cấp)) · P` | nhân thêm `expScale(min(L, cấp))` của `formulas.js` (cùng hệ số với quái thường sau khi kéo dài đường EXP), để phần thưởng không teo ở cấp 150+ |
| Đá | `stoneOf` 4 bậc (lv < 90 → stone3, còn lại stone4) | `stoneOf` dùng chung một hàm ở `dailies.js`; nếu `gear-tier-199` thêm bậc đá cho cấp 120+/160+ thì hàm trả bậc mới, không thì giữ `stone4` |
| Tướng đợt cuối | `pickBoss(L)` mọi boss | loại boss `event`, `trial`, `tower` và boss có cờ `cave`/`clan` |
| Tổng lượng mỗi lượt | `10 + 2·6 + 7·3 + (n − 10)·1` | giữ; thêm trần 60 lượng/lượt (hạng > 60 không có lượng) để chặn máy chủ đông bơm lượng |

Mức thưởng mẫu: L = 40, P = 200: 66.000 EXP, 36.000 xu. L = 150 (`expScale(150)` ≈ 3,1 theo `core-levelcap-199`): ~ `(10 + 1.200) · 200 · 3,1` ≈ 750.000 EXP, ≈ 6 phút cày bãi của người cấp 150 (đúng định hướng "sự kiện = 5-10 phút cày", `DESIGN_RULES.md` mục 9).

### 7.5 Dữ liệu

`src/shared/data/dailies.js` theo `specs/dailies.md` mục 2, bổ sung 3 khóa trong `DEFENSE`:

```js
  maxL: 195,                // kẹp cấp sự kiện (bản gốc 110)
  luongCap: 60,             // hạng > 60 không có lượng
  bossSkip: ['event', 'trial', 'tower', 'cave', 'clan'], // cờ boss bị loại khi chọn tướng
```

`check-data` (khối Việc Làng / Thủ Hộ Làng theo `specs/dailies.md` mục 6) thêm: `maxL ≤ MAX_LEVEL`; với mọi `L` 5..`maxL` bước 5, `pickPool(L)` có ≥ 2 loài và `pickBoss(L)` tồn tại; tổng lượng tối đa mỗi lượt ≤ `luongCap` + 33.

### 7.6 Giao thức

| Chiều | Gói | Trường |
|---|---|---|
| máy chủ → mọi người | `defense` | ngoài trận: `{ on: 0, next (ms), village, mapName }`; trong trận: `{ on: 1, village, mapName, state ('prep'|'fight'|'rest'), wave, waves, left (ms), ward, me (điểm), rank }` |
| máy chủ → người tham gia | `defenseResult` | `{ ok, village, mapName, wave, ward, me { rank, pts, exp, xu, luong, items }, top: [[tên, điểm]] }` |
| máy khách → máy chủ | không có | sự kiện không cần gói hành động riêng; đánh quái bằng `skill` như thường |

### 7.7 Máy chủ, máy khách, DOM

Theo `specs/dailies.md` mục 3.6 (module `defense`: `tick`, `start`, `spawnWave`, `finish`, `info`, `brief`, `admin`), mục 4 (`setDefense`, `showDefenseResult`, `renderDefRes`, `dlyTrackerRows`), mục 4.5 (CSS). DOM mới: `#hud-defense` (sau `#arena-cd` trong `index.html`, quy ước G6), cửa sổ `defres` (`.dfr-head.r-win|r-lose`), khối `.dly-def` trong cửa sổ Việc Làng, dòng theo dõi `.qt.def`. Lệnh admin `/phongthu <làng>|next|win|leak|stop`. Biến môi trường `DEFENSE=0` tắt lịch tự động (kiểm thử).

### 7.8 Bố cục điện thoại

`#hud-defense`: dưới giữa như `#hud-arena`, rộng 300px trên điện thoại, ẩn chữ "THỦ HỘ LÀNG" ở ≤ 760px, ẩn khi mở cửa sổ/hội thoại, đẩy lên 62px khi biểu ngữ Tà Thú hiện (`body.ev-on`). Không đè D-pad và cụm kỹ năng ở 844×390 và 667×375 (đo trong ảnh chụp). Cửa sổ kết quả: một cột, top 10 cuộn dọc.

### 7.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Đánh quái đã gần chết để ăn điểm | điểm chia theo sát thương thật (`dmgBy` cắt phần dư), không theo đòn kết liễu |
| Nhân vật phụ đứng làng ăn 1 lượng | cần ≥ 5 điểm (≥ 2 quái hạ góp phần đáng kể); trần 60 lượng mỗi lượt |
| Thoát/vào lại để nhận thưởng hai lần | điểm giữ theo tên trong `cur.pts`, `finish` chạy một lần (cờ `cur` xóa trước khi gửi thư) |
| Kéo quái công thành ra khỏi làng | quái có `x1/x2` trong làng, không theo người chơi qua cổng |
| Hộp thư đầy | `sendItems` trả `false` → người online nhận trực tiếp nếu đủ chỗ, không thì ghi nhật ký (không nhân bản) |

### 7.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | máy chủ vắng (≤ 3 người) không thắng nổi | số quái và máu co theo `n`; đợt 1-2 người cấp sự kiện một mình giữ được (khối `tools/balance.js` "Thủ Hộ Làng" kiểm n = 1, 5, 20) |
| Cân bằng | trùng giờ với Tà Thú/Hung Tinh | đã sắp lịch ở `evt-calendar` (12:00/21:00 không trùng khung :30-:50 và 09/13/17/19/23 giờ) |
| Kỹ thuật | 30 quái + 50 người trong làng vượt 60fps điện thoại | `test:perf` thêm kịch bản `/phongthu`; giữ trần 30 quái sống |
| Kỹ thuật | AI quái đi bộ tới `dest` không cần sửa `core/monster.js` | đã kiểm trong đặc tả gốc |

### 7.11 Tiêu chí chấp nhận

1. `tests/features/dailies.js`: ca đơn vị 7-10 và ca bot 12-13 của `specs/dailies.md` đạt, thêm ca `L` kẹp 195 và trần lượng 60.
2. `npm run check` sạch (khối Thủ Hộ Làng có thêm kiểm `maxL`, `pickBoss`).
3. `npm run test:perf` với `/phongthu` + 30 quái: ≥ 55 fps trung vị.
4. Ảnh `#hud-defense` và `defres` desktop + điện thoại 844×390, 667×375; `OK no console errors`.

### 7.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | `nextDefense`, `slotVillage`, `defenseRank` (thắng/thua/trần lượng), `DEFENSE.exp` có `expScale`, `L` kẹp 5..195, `pickBoss` bỏ boss `event`/`trial`/`tower` |
| Bot | kịch bản 12-13 của `specs/dailies.md` (`dlybot`, `/phongthu v_fire`, `next`, `leak`, `win`, thư "Thưởng Thủ Hộ Làng") + bot cấp 160: thư có đá đúng `stoneOf(L)` |
| E2E | ảnh chụp, không bắt buộc kịch bản riêng |

---

## 8. Sổ Nhẫn Giả (`sig-sonhangia`)

### 8.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-sonhangia` |
| Trụ cột | **P5** (mục tiêu dài cho người chơi lâu năm, chỉ số nhỏ có trần), **P4** (hiệu ứng tên khoe được), **P1** (mỗi trang sổ có lời bình kiểu truyền thuyết Việt) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · M |
| Phụ thuộc | `soc-titles` (móc `progress`, cửa sổ `titles`, `c.ach`), các vùng đất `world-region-*` (vùng nào đã gộp thì có trang "Vùng đất" tương ứng, đếm số bản đồ đã ghé; vùng chưa có thì không hiện) |
| Vùng file | module mới `modules/codex`, dữ liệu `shared/data/codex.js`, lõi (`core/combat.js` `killMonster`: đã có móc `kill`/`monsterKilled`, không sửa), `windows/titles.js` (tab "Sổ Nhẫn Giả"), `windows/rank.js` (tab "Sưu tầm"), `render/sprites.js` vẽ hiệu ứng tên (thêm tham số tùy chọn `o.nameFx` cho `drawNinja`), `game/game.js` (truyền `nameFx` từ `pInfo`), kiểm thử `tests/features/codex.js` |
| opencode | có |

### 8.2 Mục đích, vì sao thu hút

Người chơi lâu năm hết mục tiêu khi đồ đã đủ. Sổ Nhẫn Giả biến mọi thứ họ đã làm thành bộ sưu tập: hạ đủ 1.000 Hỏa Hồ thì trang "Hỏa Hồ" chuyển sang viền vàng, sở hữu một lần mỗi thú cưỡi thì trang "Thú cưỡi" đầy. Điểm sổ đổi ra **hạng sổ** với chỉ số nhỏ có trần và **hiệu ứng tên** (tên nhân vật đổi màu ánh kim, có vệt sáng chạy qua) mà ai đứng gần cũng thấy. Người chơi mới thì có danh sách việc rõ ràng để khám phá thế giới ("quái này rơi ở đâu", nối với tìm đường).

### 8.3 Luồng người chơi

1. Mở cửa sổ Nhân vật (C) → nút "Danh hiệu" → tab mới **Sổ Nhẫn Giả** (`[data-tab=codex]`) bên cạnh "Thành tựu" và "Danh hiệu".
2. Trang đầu: hạng sổ hiện tại, thanh điểm tới hạng kế, chỉ số đang nhận, ô chọn hiệu ứng tên đã mở.
3. 5 mục con: **Quái vật**, **Thủ lĩnh**, **Vật phẩm**, **Thú cưng & thú cưỡi**, **Thời trang**. Mỗi mục là lưới thẻ: hình (dùng lại `drawMonster`/`iconURL`/`drawPet`), tên, mức (Đồng/Bạc/Vàng), số đếm. Thẻ chưa gặp hiện bóng đen và "?" (quái chưa gặp chỉ hiện tên bản đồ có nó, bấm "Tìm đường").
4. Thẻ đạt mức mới có chấm vàng; bấm "Nhận" (hoặc "Nhận tất cả") để cộng điểm sổ, điểm không tự cộng để người chơi có khoảnh khắc nhận.
5. Hạng sổ lên: thông báo, hiệu ứng `levelUp` nhỏ, mở hiệu ứng tên ở hạng 3/6/9.
6. BXH tab "Sưu tầm": top 30 theo điểm sổ.

### 8.4 Quy tắc, công thức, số liệu

| Loại thẻ | Mức Đồng | Mức Bạc | Mức Vàng |
|---|---|---|---|
| Quái thường (mỗi loài) | hạ 1 · 1 điểm | hạ 100 · 3 điểm | hạ 1.000 · 6 điểm |
| Thủ lĩnh bản đồ (mỗi boss) | hạ 1 · 5 điểm | hạ 10 · 10 điểm | hạ 50 · 20 điểm |
| Tà Thú / Hung Tinh (mỗi boss) | góp sát thương 1 lần · 5 điểm | 10 lần · 10 điểm | top 3 sát thương 1 lần · 20 điểm |
| Vật phẩm (trang bị theo bậc × ô, thuốc, sách, ngọc) | sở hữu lần đầu · 1 điểm (đồ Huyền thoại 3 điểm) | | |
| Thú cưng (mỗi loài) | sở hữu · 3 điểm | đạt cấp 10 · 6 điểm | đạt cấp 20 · 12 điểm |
| Thú cưỡi, thời trang (mỗi món) | sở hữu (vĩnh viễn hoặc có hạn) · 2 điểm | | |

"Hạ" tính cho người nhận EXP của con quái (người đánh cuối và thành viên nhóm cùng bản đồ được chia EXP), giống cách tính nhiệm vụ.

Hạng sổ (điểm tích lũy → chỉ số cộng dồn, trần tuyệt đối nằm ở hạng 10):

| Hạng | Tên | Điểm | Chỉ số (tổng tới hạng đó) | Mở |
|---|---|---|---|---|
| 1 | Sơ Kiến | 50 | sinh lực +0,3% | |
| 2 | Lịch Duyệt | 150 | +0,6% sinh lực, công +0,3% | |
| 3 | Bác Văn | 300 | +0,9% sinh lực, +0,5% công | hiệu ứng tên "Ngân Quang" (bạc) |
| 4 | Quảng Kiến | 500 | +1,2%, +0,8%, thủ +0,3% | |
| 5 | Thông Hiểu | 800 | +1,5%, +1,0%, +0,6%, % EXP +1 | |
| 6 | Uyên Bác | 1.200 | +1,8%, +1,2%, +0,9%, +1,5 | hiệu ứng "Kim Quang" (vàng) |
| 7 | Tinh Thông | 1.700 | +2,1%, +1,4%, +1,2%, +2 | |
| 8 | Bách Sự Thông | 2.300 | +2,4%, +1,6%, +1,5%, +2,5 | |
| 9 | Vạn Sự Thông | 3.000 | +2,7%, +1,8%, +1,8%, +3 | hiệu ứng "Lưu Ly" (vệt sáng ngũ sắc chạy qua tên) |
| 10 | Thiên Thư Chủ | 4.000 | +3,0% sinh lực, +2,0% công, +2,0% thủ, +3% EXP | khung chân dung vàng trong cửa sổ xem người chơi |

Trần chỉ số hạng 10 (sinh lực +3%, công +2%, thủ +2%, EXP +3%) nhỏ hơn một lần cường hóa +1 của món vũ khí cuối game, đúng P5. Tổng điểm có thể đạt khi 1.0 có ~140 loài quái, ~25 boss, ~400 vật phẩm, ~40 thú cưng/thú cưỡi/thời trang: ước 140·10 + 25·35 + 400·1,2 + 40·8 ≈ 3.100-3.500 (người chơi rất chăm đạt hạng 9 trong khoảng 3-6 tháng; hạng 10 cần nội dung thêm sau 1.0, cố ý làm mục tiêu xa).

Hiệu ứng tên chỉ là hình (không chỉ số), bật/tắt bằng ô chọn, hiện với mọi người trong bản đồ qua `pInfo.nfx`.

### 8.5 Dữ liệu (`src/shared/data/codex.js`, mới)

```js
'use strict';

// Sổ Nhẫn Giả: mức của từng loại thẻ, hạng sổ, hiệu ứng tên. Chỉ số % cộng qua móc stats (codex).
const CODEX = {
  tiers: {
    mob: [[1, 1], [100, 3], [1000, 6]],        // [số lần, điểm]
    boss: [[1, 5], [10, 10], [50, 20]],
    world: [[1, 5], [10, 10], [-1, 20]],       // -1: vào top 3 sát thương
    item: [[1, 1]], itemLegend: [[1, 3]],
    pet: [[1, 3], [10, 6], [20, 12]],          // pet: số lần ở đây là cấp thú
    style: [[1, 2]],
  },
  ranks: [
    { pts: 50, name: 'Sơ Kiến', st: { hpPct: 0.3 } },
    { pts: 150, name: 'Lịch Duyệt', st: { hpPct: 0.6, atkPct: 0.3 } },
    { pts: 300, name: 'Bác Văn', st: { hpPct: 0.9, atkPct: 0.5 }, fx: 'ngan' },
    { pts: 500, name: 'Quảng Kiến', st: { hpPct: 1.2, atkPct: 0.8, defPct: 0.3 } },
    { pts: 800, name: 'Thông Hiểu', st: { hpPct: 1.5, atkPct: 1.0, defPct: 0.6, expPct: 1 } },
    { pts: 1200, name: 'Uyên Bác', st: { hpPct: 1.8, atkPct: 1.2, defPct: 0.9, expPct: 1.5 }, fx: 'kim' },
    { pts: 1700, name: 'Tinh Thông', st: { hpPct: 2.1, atkPct: 1.4, defPct: 1.2, expPct: 2 } },
    { pts: 2300, name: 'Bách Sự Thông', st: { hpPct: 2.4, atkPct: 1.6, defPct: 1.5, expPct: 2.5 } },
    { pts: 3000, name: 'Vạn Sự Thông', st: { hpPct: 2.7, atkPct: 1.8, defPct: 1.8, expPct: 3 }, fx: 'luuly' },
    { pts: 4000, name: 'Thiên Thư Chủ', st: { hpPct: 3, atkPct: 2, defPct: 2, expPct: 3 }, frame: 1 },
  ],
  cap: { hpPct: 3, atkPct: 2, defPct: 2, expPct: 3 },
  nameFx: { ngan: { name: 'Ngân Quang', c: ['#e6eef7', '#9fb3c8'] }, kim: { name: 'Kim Quang', c: ['#ffe27a', '#d89a1e'] }, luuly: { name: 'Lưu Ly', c: ['#ff8a8a', '#ffd23c', '#7ccd5a', '#5ab4ff', '#c77dff'] } },
  // lời bình cho thẻ quái/boss: tra theo id, thiếu thì dùng câu chung theo theme bản đồ
  lore: {},
};

module.exports = { CODEX };
```

Danh sách thẻ **không** chép vào dữ liệu: dựng từ `MONSTERS`, `BOSSES`, `ITEMS`, `PETS`, `FASHION` lúc khởi động (bỏ quái `trial/tower` của tháp, quái công thành dùng lại loài thường). `lore` được viết dần (worker nội dung), thiếu câu thì dùng câu chung theo theme.

`check-data` (khối "Sổ Nhẫn Giả"): `ranks` `pts` tăng dần; mỗi `st` không vượt `cap`, mỗi khóa tăng không giảm; `fx` tồn tại trong `nameFx`; mọi khóa `lore` là id quái/boss có thật; tổng điểm tối đa của dữ liệu hiện tại ≥ điểm hạng 9 (sổ phải hoàn thành được tới hạng 9 với nội dung đang có).

### 8.6 Giao thức

| Chiều | Gói | Trường |
|---|---|---|
| máy khách → máy chủ | `codexList` | `cat` (`'mob'|'boss'|'world'|'item'|'pet'|'style'`) — chặn 0,5 giây/lần |
| máy khách → máy chủ | `codexClaim` | `key` (chuỗi khóa thẻ) hoặc `all: 1` |
| máy khách → máy chủ | `nameFx` | `id` (`'ngan'|'kim'|'luuly'|''`) — chặn 3 giây/lần |
| máy chủ → máy khách | `codex` | `cat, rows: [[key, n, tierGot, tierReady]], pts, rank` |
| máy chủ → máy khách | `me` | `codex { pts, rank, ready (số thẻ chờ nhận), fx }` |
| máy chủ → bản đồ | `pInfo` | thêm `nfx` (mã hiệu ứng tên đang bật) |
| dữ liệu tĩnh | `data.codex` | `{ CODEX }` (không gửi `lore` đầy đủ; `lore` gửi theo trang khi `codexList`) |

Khóa thẻ: `m:<id quái>`, `b:<id boss>`, `w:<id boss sự kiện>`, `i:<id vật phẩm>`, `p:<id thú>`, `s:<id thời trang>`.

### 8.7 Máy chủ, máy khách, DOM

- **Module `modules/codex/index.js`**: móc `kill(p, m)` (đếm `m:`/`b:` cho từng người nhận EXP: dùng danh sách người được chia mà `combat` đã truyền cho móc), `monsterKilled` (Tà Thú/Hung Tinh: `w:` cho mọi người có sát thương, top 3 đánh dấu mức Vàng), `progress(p, key, n)` (từ `soc-titles`: thêm khóa `'own'` do `Player.addItem` phát với id vật phẩm, `'petLv'` khi thú lên cấp; một dòng mỗi chỗ phát, ghi báo cáo), móc `stats` (cộng `hpPct/atkPct/defPct/expPct` của hạng vào bảng tạm), `sanitize` (`c.codex = { n: {key: số}, got: {key: mức}, pts, fx }`, chỉ nhận khóa có trong bảng thẻ dựng lúc khởi động, kẹp số), `selfData`, `clientData`, `rank` (top 30 theo `pts`, gắn vào gói `rank` khóa `codex`). Lệnh admin `/so <key> <n>`, `/so full`.
- **Đếm hiệu quả**: `c.codex.n` chỉ lưu khi số mới vượt một mức hoặc mỗi 50 lần (tránh `dirty` mỗi con quái); kiểm thử đo hàm `kill` thêm ≤ 0,02 ms.
- **Máy khách**: `windows/titles.js` thêm tab `[data-tab=codex]` (`renderCodex`), lưới thẻ dùng `iconURL`, canvas nhỏ `drawMonster(ctx, x, y, def, { still: true })` cache theo id; `windows/rank.js` tab `[data-rktab=codex]`; `render/sprites.js`: tham số tùy chọn `o.nameFx` trong `drawNinja` (vẽ tên bằng gradient theo `CODEX.nameFx`, `luuly` có vệt sáng chạy theo `o.t`) — thêm tham số tùy chọn, không đổi chữ ký; `game.js` truyền `nameFx` từ `pInfo.nfx`.
- **DOM mới**: `[data-tab=codex]`, `.cx-card[data-cx=<key>]`, `[data-cxcat=mob|boss|world|item|pet|style]`, `[data-act=cx-claim]`, `[data-act=cx-claimall]`, `select.cx-fx`.

### 8.8 Bố cục điện thoại

Lưới thẻ 72×88px, số cột tự co (`repeat(auto-fill, minmax(72px, 1fr))`), 5 nút mục con thành hàng cuộn ngang 44px. Chi tiết thẻ mở ở bảng dưới cửa sổ (không phải hộp nổi) để không che lưới. Nút "Nhận tất cả" cố định ở chân cửa sổ.

### 8.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Nhận điểm hai lần một mức | `got[key]` lưu mức đã nhận, cập nhật trước khi cộng `pts`; `pts` tính lại từ `got` lúc `sanitize` (không tin số lưu) |
| Mượn đồ qua giao dịch để mở thẻ vật phẩm | chấp nhận (mở thẻ là sở hữu lần đầu, 1 điểm); chỉ tính khi vật phẩm vào túi của chính nhân vật qua `addItem` — đồ nhận từ giao dịch vẫn tính, đúng ý "đã sở hữu" |
| Khóa thẻ độc (`__proto__`) | tra qua `Map` thẻ dựng sẵn, khóa từ máy khách phải `typeof === 'string'` và có trong `Map` |
| Cày quái cấp thấp lấy mức Vàng | cho phép; điểm mỗi loài có trần 10 điểm, không đáng để khai thác |

### 8.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | chỉ số sổ cộng vào mọi thứ | trần 3/2/2/3% kiểm bằng `check-data`; tính vào `tools/balance.js` như người chơi hậu kỳ |
| Kỹ thuật | `c.codex.n` lớn (~600 khóa) | khóa ngắn, ≤ 8 KB mỗi nhân vật; chỉ gửi theo mục khi mở |
| Kỹ thuật | vẽ tên gradient mỗi khung | cache canvas tên theo `(tên, fx)`; vệt sáng dùng `globalCompositeOperation` trên ảnh cache |
| Nội dung | 140 lời bình | không bắt buộc ở 1.0; câu chung theo theme |

### 8.11 Tiêu chí chấp nhận

1. `tests/features/codex.js` ≥ 18 kiểm tra đạt.
2. `npm run check` sạch; tổng điểm tối đa ≥ 3.000.
3. Hạng 10 cộng đúng trần (đơn vị); `recalc` khớp `tools/balance.js`.
4. `test:perf` không giảm quá 1 fps khi 20 người có hiệu ứng tên `luuly` cùng bản đồ.
5. Ảnh tab Sổ Nhẫn Giả, hiệu ứng tên trên đầu nhân vật (desktop + điện thoại), `OK no console errors`.

### 8.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | bảng thẻ dựng đủ loài từ `MONSTERS`; `kill` 100 lần → `n['m:slime'] === 100`, `ready` có mức Bạc; `codexClaim` → `pts` +4 (1 + 3); nhận lại → không đổi; `sanitize` với `got` giả mạo mức 5 → kẹp; `pts` tính lại đúng; hạng 10 → `hpPct` cộng 3 |
| Bot (`codexbot`) | hạ 1 quái → `me.codex.ready === 1`; `codexClaim { key }` → `pts === 1`; `/so full` → `rank === 10`; `nameFx { id: 'luuly' }` → bot khác nhận `pInfo.nfx === 'luuly'`; `nameFx { id: 'abc' }` → từ chối |
| E2E | không bắt buộc |

---
## 9. Bế Quan Tu Luyện (`sig-bequan`)

### 9.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-bequan` |
| Trụ cột | **P2** (người bận vẫn tiến, mở máy là nhận), **P5** (có trần, không thay được chơi thật, không bán bằng lượng) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · S |
| Phụ thuộc | `eco-bound` (`payXu`, `gainXuk`), `quest-dailies` (lượt Việc Làng để ủy thác; thiếu thì chỉ ủy thác Tiểu Nhị), `quest-daily-task` (có sẵn: `DAILY`) |
| Vùng file | module mới `modules/retreat`, dữ liệu thêm `RETREAT` vào `src/shared/data/extras.js` (khối riêng cuối file), `core/world.js` (ghi `c.lastOut` lúc rời game, một dòng cạnh `lastLogin`), cửa sổ mới `windows/retreat.js`, kiểm thử `tests/features/retreat.js` |
| opencode | có |

### 9.2 Mục đích, vì sao thu hút

Người chơi Việt trên điện thoại thường chơi theo giờ nghỉ trưa, giờ tối. Hôm bận không vào được thì tụt lại sau bạn bè và dần bỏ game. Bế Quan cho EXP khi không online, có trần 10 giờ, tương đương ~30-45 phút cày: đủ để không bị bỏ rơi, không đủ để thay việc chơi. Ủy thác cho phép nhận một nửa thưởng các lượt nhiệm vụ hằng ngày hôm qua bỏ lỡ (không có lượng, không có rương), giảm cảm giác "phải đăng nhập mỗi ngày kẻo lỗ".

### 9.3 Luồng người chơi

1. Vào game sau ≥ 30 phút vắng mặt (cấp ≥ 20): cửa sổ **Bế Quan** tự mở sau màn tải (không mở khi đang ở phó bản/lôi đài; thông báo chờ tới khi về bản đồ thường).
2. Cửa sổ ghi: "Ngươi đã bế quan 6 giờ 12 phút. Tu vi tích được: 214.560 EXP." Hai nút: **Nhận** (×1, miễn phí) và **Nhận gấp rưỡi** (×1,5, tốn 60.000 xu: xu khóa trước).
3. Nếu hôm qua bỏ lỡ lượt nhiệm vụ: phần **Ủy thác** liệt kê "Tiểu Nhị: còn 14 lượt · thưởng 50%: 98.000 EXP, 18.200 xu khóa · phí 16.800 xu" và "Việc Làng: còn 6 lượt". Mỗi dòng một nút "Ủy thác".
4. Đóng cửa sổ không nhận: EXP bế quan vẫn giữ tới lần vào sau (cộng dồn tối đa trần), có dòng "Bế Quan: còn tu vi chưa nhận" trong khối theo dõi; ủy thác hết hạn lúc 24:00 hôm nay.

### 9.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Điều kiện | cấp ≥ 20; vắng ≥ 30 phút (`now − c.lastOut`); không tính khi nhân vật bị khóa |
| EXP mỗi phút vắng | `rate · E(L)`, `E(L) = 12 · (10 + 8L) · expScale(L)` (EXP/phút cày bãi người chơi trung bình, `content/00-foundation.md` mục 4.2), `rate = 0,05` |
| Trần | 600 phút cộng dồn (`c.rt.min ≤ 600`) ≈ 30 phút cày bãi ở ×1, 45 phút ở ×1,5 |
| Nhận gấp rưỡi | phí `500 · L` xu (`payXu`); cấp 120: 60.000 xu (≈ 4 phút cày) |
| Không nhân | thẻ/buff nhân đôi EXP, % EXP từ trang bị, gia tộc, lễ hội **không** áp dụng cho EXP bế quan |
| Kinh Mạch | EXP bế quan không đổ vào `chankhi` (`meridian` móc `exp` bỏ qua nguồn `'retreat'`) |
| Cấp tối đa | EXP vượt trần cấp bị bỏ như EXP thường |
| Ủy thác | lượt Tiểu Nhị (`DAILY.max − done` của **hôm qua**) và Việc Làng (`ERRANDS` lượt còn của hôm qua): thưởng 50% EXP + 50% xu dưới dạng **xu khóa**, không lượng, không rương, không mốc tuần; phí `100 · L` xu mỗi lượt; chỉ nhận trong ngày kế tiếp (sang ngày nữa thì mất) |
| Không cộng dồn với chơi thật | ủy thác chỉ tính lượt **không làm**; lượt đã làm hôm qua không ủy thác được |

Số mẫu, cấp 120 (`expScale(120)` = 1 khi chưa có trần 199): `E = 12 · 970 = 11.640` EXP/phút; vắng 10 giờ: `0,05 · 11.640 · 600 = 349.200` EXP (×1,5: 523.800). Ủy thác 20 lượt Tiểu Nhị cấp 120: `DAILY.reward(120)` = 970 · 48 = 46.560 EXP, 7.400 xu mỗi lượt → 50%: 465.600 EXP, 74.000 xu khóa; phí 240.000 xu. Phí ủy thác cố ý cao hơn số xu nhận được: ủy thác là đổi xu lấy EXP (một chỗ tiêu xu), không phải nguồn xu.

### 9.5 Dữ liệu (`src/shared/data/extras.js`, khối mới cuối file)

```js
// Bế Quan: EXP khi vắng mặt (có trần) và ủy thác lượt nhiệm vụ hằng ngày hôm qua. GDD 04 mục 9.
const RETREAT = {
  minLv: 20, minAway: 30, capMin: 600, rate: 0.05,
  boost: { mul: 1.5, feePerLv: 500 },
  entrust: { share: 0.5, feePerLv: 100, kinds: ['task', 'errand'] },
};
```

Thêm `RETREAT` vào `module.exports` của `extras.js`. `check-data` (khối "Bế Quan"): `capMin · rate ≤ 45` (≤ 45 phút cày tương đương ở ×1), `boost.mul ≤ 1,5`, `entrust.share ≤ 0,5`; phí ủy thác mỗi lượt ≥ 50% xu thưởng nhận được ở mọi cấp 20-199.

### 9.6 Giao thức

| Chiều | Gói | Trường |
|---|---|---|
| máy chủ → máy khách | `retreat` | `{ min, exp, exp15, fee, ent: [{ k: 'task'|'errand', n, exp, xuk, fee }] }` (gửi khi vào game nếu có gì để nhận, và khi `retreatInfo`) |
| máy khách → máy chủ | `retreatInfo` | |
| máy khách → máy chủ | `retreatClaim` | `mode` (`1` hoặc `2` = gấp rưỡi) |
| máy khách → máy chủ | `entrust` | `k` (`'task'`/`'errand'`) |
| máy chủ → máy khách | `me` | `rt { min, ent }` (hiện dòng theo dõi) |

### 9.7 Máy chủ, máy khách, DOM

- **Module `modules/retreat/index.js`**: `c.rt = { min, at, ent: { day, task, errand } }`. Móc `join(p)`: tính phút vắng từ `c.lastOut` (thiếu thì 0), cộng vào `c.rt.min` (kẹp 600), chụp số lượt bỏ lỡ hôm qua (đọc `c.daily` của module `quest` và `c.dly` của `dailies` qua `world.mods`: `quest.missedYesterday(c)`, `dailies.missedYesterday(c)`: hai hàm nhỏ mới, ghi báo cáo, stub trả 0 nếu module chưa có), gửi `retreat`. Móc `left(p)`: `c.lastOut = now` (hoặc một dòng trong `core/world.js` cạnh `lastLogin` nếu `left` không có `c`). Hành động `retreatClaim`: tính `exp = rate · E(L) · min`, chế độ 2 thì `payXu(fee)` trước, rồi `c.rt.min = 0` **trước** `p.gainExp(exp, 'retreat')`. `entrust`: kiểm `ent.day === hôm nay`, `n > 0`, `payXu(fee · n)`, đặt `ent[k] = 0` rồi trao. `sanitize`: kẹp số; `selfData`. Lệnh admin `/bequan <phút>` (giả vắng mặt: đặt `c.rt.min`), `/bequan ent` (chụp lại lượt bỏ lỡ).
- **`gainExp` nguồn**: `Player.gainExp(n, src)` thêm tham số tùy chọn `src` để Kinh Mạch/sổ/buff bỏ qua nguồn `'retreat'` (lõi, một dòng, ghi báo cáo).
- **Máy khách**: `windows/retreat.js` (`renderRetreat`), tự mở khi nhận gói `retreat` có `min ≥ 30` hoặc `ent` khác rỗng và không ở bản đồ `instance`; dòng theo dõi `.qt.rt` "Bế Quan: còn tu vi chưa nhận"; số EXP dùng `toLocaleString('vi-VN')`.
- **DOM mới**: cửa sổ `retreat`, `[data-act=rt-claim]`, `[data-act=rt-claim2]`, `[data-act=rt-ent][data-k=task|errand]`.

### 9.8 Bố cục điện thoại

Cửa sổ nhỏ (rộng tối đa 420px, điện thoại toàn chiều rộng trừ 16px mỗi bên): hình tượng ninja ngồi thiền (vẽ bằng `drawPortrait` + vòng sáng, không có tranh mới), dòng thời gian, số EXP lớn 28px, 2 nút 44px cạnh nhau, phần Ủy thác dưới dạng 2 dòng có nút. Không cuộn ở 844×390.

### 9.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Đổi giờ máy để vắng lâu hơn | thời gian lấy ở máy chủ (`Date.now()` server) |
| Thoát/vào liên tục để nhận nhiều lần | `c.rt.min` cộng dồn chung một trần 600; nhận là về 0 |
| Gửi `retreatClaim` hai lần cùng lúc | đặt `min = 0` trước khi trao (một luồng) |
| Ủy thác lượt đã làm | chụp số lượt bỏ lỡ một lần lúc `join` đầu tiên của ngày, lưu `ent.day` |
| Nhân vật phụ treo để lấy xu khóa | ủy thác lỗ xu (phí ≥ 50% xu nhận), không có lượng |

### 9.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | người chơi nghĩ "không cần chơi" | trần 30-45 phút tương đương; ghi rõ trong cửa sổ "Bế quan tối đa 10 giờ" |
| Cân bằng | tăng tốc lên cấp tổng thể ~8-12% với người chơi 1 giờ/ngày | đã tính trong `cmb-balance` (đường EXP); chấp nhận vì đúng P2 |
| Kỹ thuật | `missedYesterday` cần trạng thái ngày trước của `quest`/`dailies` | hai module đã lưu `day` + `done`; nếu `day` là hôm qua thì `max − done`, cũ hơn thì `max` (vắng cả ngày hôm qua) |

### 9.11 Tiêu chí chấp nhận

1. `tests/features/retreat.js` ≥ 14 kiểm tra đạt.
2. `npm run check` sạch (khối "Bế Quan").
3. Ảnh cửa sổ Bế Quan desktop + điện thoại, `OK no console errors`.

### 9.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | `c.lastOut = now − 700 phút` → `min === 600`; cấp 120, 600 phút → `exp === 349200`; chế độ 2 thiếu xu → từ chối, `min` không đổi; nhận → `min === 0`, nhận lại → từ chối; ủy thác: `c.daily = { day: hôm qua, done: 6 }` → `ent.task === 14`; phí ≥ 50% xu nhận ở cấp 20, 100, 199 |
| Bot (`rtbot`) | `/lv 40`, ghi `lastOut` qua lệnh admin `/bequan 120` (giả vắng 120 phút) → gói `retreat` `min === 120`; `retreatClaim { mode: 1 }` → EXP tăng đúng; `entrust { k: 'task' }` khi `n === 0` → "Không còn lượt" |
| E2E | không bắt buộc |

---

## 10. Nhân Duyên: Sư Đồ, Kết Nghĩa, Kết Duyên (`soc-nhanduyen`)

### 10.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `soc-nhanduyen` |
| Trụ cột | **P4** (quan hệ bền giữa người chơi, lý do quay lại vì người khác), **P2** (người mới có thầy dẫn), **P5** (thưởng quan hệ là khóa, không chuyển nhượng; không bán bằng lượng) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · L |
| Phụ thuộc | `eco-bound`, `soc-titles` (danh hiệu Danh Sư, Đồng Tâm), `soc-party` (có sẵn), `soc-friends` (có sẵn: chỉ bạn bè mới lập quan hệ) |
| Vùng file | module mới `modules/bonds`, dữ liệu `shared/data/bonds.js`, `windows/friends.js` (tab "Nhân duyên"), `windows/inspect.js` (dòng quan hệ), `game/game.js` (hiệu ứng kỹ năng đôi, khối riêng), `render/fx.js` (thêm hàm `bondLink` mới, không đổi hàm cũ), vật phẩm `ring_dongtam` (`items/consumables.js`) + icon (`render/icons/items.js`), kiểm thử `tests/features/bonds.js` |
| opencode | có, sau khi Claude rà phần chống cày (mục 10.9) |

### 10.2 Mục đích, vì sao thu hút

Game cũ giữ người chơi bằng quan hệ: thầy trò, anh em kết nghĩa, vợ chồng trong game. Bạn bè hiện có chỉ là danh sách tên. Nhân Duyên cho ba tầng quan hệ có **lợi ích nhỏ khi chơi cùng nhau** và **cột mốc đáng nhớ** (lễ bái sư, lễ kết nghĩa có thông báo cả máy chủ, kỹ năng đôi gọi nhau tới bên cạnh). Người mới có thầy dẫn đi qua giai đoạn cấp 10-70, nơi tỉ lệ bỏ game cao nhất; người cấp cao có lý do quay lại cày cùng đệ tử để nhận Sư Đức.

### 10.3 Luồng người chơi

**Thân thiết** (nền cho mọi quan hệ): hai người là bạn bè, chơi cùng nhóm cùng bản đồ thì điểm thân thiết tăng; hiện ở danh sách bạn bè (biểu tượng tim + số).

**Sư đồ**:
1. Đệ tử (cấp 10-69) mở tab "Nhân duyên" → "Tìm sư phụ" (danh sách người online cấp ≥ 90 bật "nhận đệ tử") hoặc bấm vào người chơi → "Bái sư".
2. Sư phụ nhận lời mời (hộp lời mời như kết bạn). Thông báo bản đồ "A đã bái B làm sư phụ".
3. Đệ tử đạt cấp 20, 30, 40, 50, 60, 70: cả hai nhận thưởng qua hộp thư; sư phụ nhận Sư Đức.
4. Cấp 70: "Xuất sư" tự động, thông báo toàn máy chủ, danh hiệu cho đệ tử "Danh Môn Đệ Tử"; sư phụ có 3 đệ tử xuất sư được danh hiệu "Danh Sư".

**Kết nghĩa** (2-5 người): trưởng nhóm (thân thiết ≥ 300 với từng người) mở "Kết nghĩa" khi cả nhóm đứng gần Trưởng Làng, mỗi người xác nhận, mỗi người trả 50.000 xu. Trưởng nhóm đặt tên nhóm (2-8 ký tự, ví dụ "Lạc Hồng"). Tên nhóm hiện dưới tên nhân vật khi xem thông tin.

**Kết duyên** (2 người, mọi giới tính): thân thiết ≥ 999, cả hai cấp ≥ 40, một người mua Nhẫn Đồng Tâm (99.000 xu, Tiệm Thuốc), cầu duyên ở Trưởng Làng, người kia đồng ý. Thông báo toàn máy chủ, hiệu ứng pháo hoa ở làng (dùng `fx.burst`). Mở kỹ năng đôi **Tâm Ý Tương Thông** (dịch chuyển tới bạn đời) và nội tại **Song Tâm Hộ Thể**.

### 10.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Thân thiết | +1 mỗi 10 quái hạ khi cùng nhóm cùng bản đồ (trần 50/ngày mỗi cặp); +5 mỗi lần cùng hoàn thành phó bản/hang; +3 mỗi lượt Thủ Hộ Làng cùng tham gia; tối đa 9.999; không giảm theo thời gian |
| Sư phụ | cấp ≥ 90 **và** ≥ cấp đệ tử + 40; tối đa 3 đệ tử cùng lúc; bật "nhận đệ tử" |
| Đệ tử | cấp 10-69; một sư phụ; không cùng tài khoản và không cùng IP đăng nhập lần cuối với sư phụ (IP lấy theo quy tắc `conn.ip` ở `CLAUDE.md`) |
| Lợi ích sư đồ | đệ tử cùng nhóm cùng bản đồ với sư phụ: EXP +10% (nhân vào `expMul`); sư phụ nhận 1 Sư Đức mỗi 100 quái đệ tử hạ khi cùng nhóm (trần 30/ngày) |
| Mốc đệ tử | cấp 20/30/40/50/60/70: đệ tử nhận `2.000 · cấp` xu khóa + Bình Tiên Dược (khóa); sư phụ nhận `20 · cấp/10` Sư Đức (40/60/80/100/120/140) |
| Sư Đức | đổi ở tab Nhân duyên (cửa hàng nhỏ, đồ **khóa**): Đá cường hóa theo cấp (20 Sư Đức), Bí Kíp (60), Rương Báu (120), thời trang "Áo Choàng Danh Sư" (800, không chỉ số) |
| Đoạn sư đồ | một bên chủ động, hồi 24 giờ không bái/nhận ai; đệ tử vắng 7 ngày thì sư phụ được đoạn không hồi |
| Xuất sư | cấp 70 tự động; danh hiệu đệ tử `t_disciple` (Tốt, sinh lực +100); sư phụ đủ 3 xuất sư: `t_master` "Danh Sư" (Sử thi, công +40, EXP +1) |
| Kết nghĩa | 2-5 người, cấp ≥ 30, đôi một là bạn bè, thân thiết với trưởng nhóm ≥ 300; phí 50.000 xu mỗi người; một người một nhóm kết nghĩa |
| Lợi ích kết nghĩa | ≥ 2 thành viên cùng nhóm cùng bản đồ: EXP +3%, sát thương lên boss +5% |
| Rời kết nghĩa | tự rời bất cứ lúc nào, hồi 72 giờ không vào nhóm khác; nhóm còn 1 người thì giải tán |
| Kết duyên | 2 người, cấp ≥ 40, bạn bè, thân thiết ≥ 999, Nhẫn Đồng Tâm (99.000 xu, đồ khóa, dùng một lần) |
| Tâm Ý Tương Thông | dịch chuyển tới chỗ bạn đời nếu cùng loại bản đồ thường (không phó bản, lôi đài, tháp, chiến trường, Tâm Ma, làng đang Thủ Hộ không giới hạn), hồi 10 phút, không dùng khi đang giao chiến (bị đánh trong 5 giây) |
| Song Tâm Hộ Thể | cùng nhóm cùng bản đồ: sinh lực +4% (cộng vào `buf.hpPct`, không cộng dồn với nhau) |
| Đoạn duyên | hai bên đồng ý: ngay; một bên: chờ 7 ngày; sau đó hồi 7 ngày không kết duyên |

Lợi ích có trần: tối đa EXP +10% (sư đồ, chỉ đệ tử) + 3% (kết nghĩa); không có lợi ích nào áp dụng ở lôi đài, chiến trường (P5: PvP xếp hạng không bị ảnh hưởng bởi quan hệ).

### 10.5 Dữ liệu (`src/shared/data/bonds.js`, mới)

```js
'use strict';

// Nhân Duyên: thân thiết, sư đồ, kết nghĩa, kết duyên. GDD 04 mục 10.
const BONDS = {
  intim: { perKills: 10, dayCap: 50, dungeon: 5, defense: 3, max: 9999 },
  mentor: {
    minLv: 90, gap: 40, maxDisc: 3, discLv: [10, 69], grad: 70, expPct: 10,
    deedPer: 100, deedDay: 30, leaveCd: 86400000, idleDrop: 7 * 86400000,
    miles: [20, 30, 40, 50, 60, 70], mileXu: 2000, mileItem: 'pot_elixir', mileDeed: 2,
    titles: { disciple: 't_disciple', master: 't_master', masterN: 3 },
    shop: [
      { id: 'STONE', n: 1, cost: 20 }, { id: 'skillbook', n: 1, cost: 60 },
      { id: 'chest', n: 1, cost: 120 }, { id: 'cloak_danhsu', n: 1, cost: 800 },
    ],
  },
  sworn: { min: 2, max: 5, minLv: 30, intim: 300, fee: 50000, expPct: 3, bossDmg: 5, leaveCd: 72 * 3600000, nameLen: [2, 8] },
  wed: { minLv: 40, intim: 999, ring: 'ring_dongtam', callCd: 600000, combatLock: 5000, hpPct: 4, divorceWait: 7 * 86400000, cd: 7 * 86400000 },
};

module.exports = { BONDS };
```

Id vật phẩm thực tế (`pot_elixir`, `skillbook`, `chest`) phải khớp `ITEMS` (worker tra và sửa nếu tên khác, `check-data` bắt lỗi); `STONE` thay bằng `stoneOf(cấp)` như `dailies`. Vật phẩm mới: `ring_dongtam` "Nhẫn Đồng Tâm" (`items/consumables.js`, `type: 'bond'`, giá 99.000 xu, Tiệm Thuốc, icon `k: 'ring'` có sẵn hoặc vẽ mới ở `ITEM_MAPS`), thời trang `cloak_danhsu` "Áo Choàng Danh Sư" (bảng `FASHION`, giá lượng 0, chỉ số 0). Danh hiệu `t_disciple`, `t_master` thêm vào `TITLES` (`soc-titles`) với `from` là thành tựu ẩn do `bonds` mở.

`check-data` (khối "Nhân Duyên"): mọi id trong `shop`/`mileItem`/`ring` tồn tại; `cloak_danhsu` không có chỉ số; `expPct` sư đồ ≤ 10, kết nghĩa ≤ 3; `discLv[1] < grad`.

### 10.6 Giao thức

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| máy khách → máy chủ | `bondInfo` | | mở tab |
| máy khách → máy chủ | `bondReq` | `k` (`'mentor'|'disciple'|'sworn'|'wed'`), `name` | gửi lời mời (dùng `modules/invites` có sẵn: loại lời mời mới `bond`) |
| máy khách → máy chủ | `bondAccept` | `k`, `from` (tên người mời) | lời mời giữ 30 giây như `invite`/`takeInvite` của `modules/invites` (khóa `bond-<k>:<tên>`) |
| máy khách → máy chủ | `bondLeave` | `k`, `name` (tùy chọn) | đoạn quan hệ |
| máy khách → máy chủ | `bondOpt` | `mentorOpen` (bool) | bật nhận đệ tử |
| máy khách → máy chủ | `bondCall` | | Tâm Ý Tương Thông |
| máy khách → máy chủ | `bondShop` | `i` (chỉ số trong `shop`) | đổi Sư Đức |
| máy khách → máy chủ | `swornName` | `name` | trưởng nhóm đặt tên |
| máy chủ → máy khách | `bonds` | `{ intim: [[tên, điểm]], mentor, disc: [[tên, cấp, online]], sworn { name, members }, wed { name, since, callAt }, deed, open, list (sư phụ đang nhận) }` | |
| máy chủ → bản đồ | `pInfo` | thêm `bd { sw (tên nhóm kết nghĩa), wed (tên bạn đời) }` | cửa sổ xem người chơi |
| máy chủ → bản đồ | `bondFx` | `{ a, b, k }` | hiệu ứng lễ, dịch chuyển |

### 10.7 Máy chủ, máy khách, DOM

- **Module `modules/bonds/index.js`**: dữ liệu theo nhân vật `c.bond = { intim: {tên: n}, iday, mentor, disc: [], grad, deed, deedDay, open, swornId, wed, wedAt, leaveAt: {k: ms}, callAt }`; nhóm kết nghĩa lưu ở `db.meta.sworn` (`{ id: { name, members: [tên] } }`) để thành viên offline vẫn đúng. Móc `kill(p, m)` (thân thiết, Sư Đức), `stats` (EXP/HP theo quan hệ có mặt cùng nhóm cùng bản đồ: đọc `p.party` và bản đồ, cache mỗi `playerSecond` để không duyệt nhóm mỗi lần `recalc`), `playerSecond` (cập nhật cờ "đang có thầy/bạn đời/huynh đệ bên cạnh", gọi `recalc` khi đổi), `sanitize`, `selfData`, `charDeleted` (gỡ khỏi mọi quan hệ, nhóm kết nghĩa), `rank` (không). Mốc đệ tử: móc `exp`/lên cấp (dùng móc `level` nếu có; nếu chưa có thì kiểm trong `playerSecond` so `c.bond.lastLv`). Lời mời dùng cặp hàm `invite(from, to, kind, extra)` / `takeInvite(p, kind, from)` của `modules/invites` (loại `bond-mentor`, `bond-disciple`, `bond-sworn`, `bond-wed`; nếu hai hàm chưa được export thì thêm vào `module.exports` của `invites`, một dòng, ghi báo cáo). Lệnh admin `/duyen intim <tên> <n>`, `/duyen grad`.
- **Kỹ năng đôi**: `bondCall` kiểm điều kiện như bảng, dùng `world.changeMap(p, mapId, x)` của lõi (hàm đổi bản đồ có sẵn trong `core/world.js`); phát `bondFx` cả hai bản đồ.
- **Máy khách**: `windows/friends.js` thêm tab `[data-ftab=bonds]` (`renderBonds`: 3 khối Sư đồ / Kết nghĩa / Kết duyên, cửa hàng Sư Đức); `windows/inspect.js` dòng "Kết nghĩa: Lạc Hồng · Bạn đời: X"; nút "Tâm Ý Tương Thông" trong khối Kết duyên (không thêm nút HUD); `game.js` `onBondFx` gọi `fx.bondLink` (dây sáng nối hai người 1 giây) và `fx.burst`.
- **DOM mới**: `[data-ftab=friends|bonds]`, `.bd-block[data-bd=mentor|sworn|wed]`, `[data-act=bd-req]`, `[data-act=bd-leave]`, `[data-act=bd-call]`, `[data-act=bd-shop]`, `#in-sworn` (ô tên nhóm).

### 10.8 Bố cục điện thoại

Tab Nhân duyên: 3 khối gập/mở (mặc định mở khối đang có quan hệ), mỗi dòng người cao 48px, nút 44px. Cửa hàng Sư Đức là lưới 2 cột. Ô nhập tên nhóm dùng bàn phím ảo: cửa sổ cuộn để ô không bị che (như ô chat).

### 10.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Tự làm thầy mình bằng nhân vật phụ để lấy thưởng mốc | cấm cùng tài khoản và cùng IP lần cuối; thưởng mốc là đồ khóa, xu khóa; Sư Đức chỉ đổi đồ khóa |
| Nuôi đệ tử ảo hàng loạt (bái rồi đoạn) | tối đa 3 đệ tử; mốc đã nhận lưu trên **đệ tử** (`c.bond.miles`) nên đoạn và bái thầy khác không nhận lại; sư phụ chỉ nhận Sư Đức mốc khi đệ tử đã làm đệ tử của mình ≥ 24 giờ |
| Cày thân thiết bằng hai nhân vật treo | trần 50/ngày mỗi cặp (đạt 999 cần ≥ 20 ngày); quái phải cùng cấp ±10 với người chơi cao hơn mới tính |
| Dùng Tâm Ý Tương Thông để vào chỗ cấm / thoát giao chiến | danh sách bản đồ cấm, khóa 5 giây sau khi bị đánh, hồi 10 phút |
| Tên nhóm kết nghĩa xúc phạm | dùng bộ lọc từ của `chat` (`clean()` + danh sách cấm), 2-8 ký tự |
| Lời mời độc (`name` là object) | `clean()` chuỗi, kiểm `typeof` |

### 10.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | EXP +13% làm lệch đường cấp | chỉ khi chơi cùng nhau, đúng mục đích P4; tính vào `cmb-balance` như "người chơi nhóm" |
| Xã hội | kết duyên gây tranh cãi về giới tính | mặc định mọi giới tính (Câu hỏi mở 5), không có từ "vợ/chồng" trong giao diện, dùng "bạn đời" |
| Kỹ thuật | quan hệ giữa người offline (đoạn quan hệ, xóa nhân vật) | `world.mail.charOf(tên)` để sửa người offline; móc `charDeleted` dọn hết |
| Kỹ thuật | cỡ L, nhiều luồng | chia 3 lô: Thân thiết + Sư đồ (lô 1), Kết nghĩa (lô 2), Kết duyên (lô 3), mỗi lô kiểm thử riêng |

### 10.11 Tiêu chí chấp nhận

1. `tests/features/bonds.js` ≥ 30 kiểm tra đạt (3 lô).
2. `npm run check` sạch.
3. `npm run test:ui` thêm kịch bản 2 trình duyệt: bái sư, chấp nhận, thấy dòng quan hệ trên cửa sổ xem người chơi.
4. Ảnh tab Nhân duyên (3 khối), hiệu ứng `bondLink`, desktop + điện thoại; `OK no console errors`.

### 10.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | thân thiết +1 sau 10 quái cùng nhóm, trần 50/ngày; đệ tử cấp 70 không bái được; sư phụ cấp 90 + đệ tử cấp 55 (chênh 35) → từ chối; mốc 30 → thư đệ tử có xu khóa 60.000, sư phụ +60 Sư Đức; đoạn rồi bái thầy khác → mốc 30 không nhận lại; kết nghĩa 6 người → từ chối; tên nhóm "a" → từ chối; `bondCall` khi bạn đời ở `loidai#1` → từ chối; `charDeleted` gỡ khỏi `db.meta.sworn` |
| Bot (`bondbot1`, `bondbot2`) | kết bạn, `/duyen intim`, `bondReq { k: 'disciple' }`, `bondAccept`, `/lv 30` đệ tử → thư mốc; `bondReq { k: 'wed' }` thiếu nhẫn → từ chối; mua nhẫn, `bondAccept` → cả hai nhận `bonds.wed`; `bondCall` → `pos` gần bạn đời; gọi lại → "hồi" |
| E2E | `npm run test:ui` kịch bản ở tiêu chí 3 |

---
## 11. Lôi Đài Tam Hùng và xem trận (`pvp-arena-3v3`)

### 11.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `pvp-arena-3v3` (con của `pvp-arena`) |
| Trụ cột | **P3** (PvP đội cần phối hợp, khắc hệ, chọn mục tiêu), **P4** (ba người một đội, người khác xem trận), **P5** (trận đội không cho mang thuốc, Elo riêng, thưởng tuần có điều kiện) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 5 · L |
| Phụ thuộc | `pvp-arena` (có sẵn: `modules/arena`, `p.match`, `canPvp`, `damagePlayer`, `arena.ko`), `soc-party` (có sẵn), `evt-calendar` (khung giờ) |
| Vùng file | `modules/arena/index.js` (tách lớp: thêm `require('./team')`, `require('./watch')`, ủy quyền hành động), file mới `modules/arena/team.js`, `modules/arena/watch.js`, dữ liệu `ARENA3` cuối `extras.js`, bản đồ `loidai3` (`maps.js`), lõi `core/combat.js` (`canPvp` đọc `p.match.side` thay vì cặp `a/b`; một hàm), `core/world.js` (bỏ qua `p.watch` trong `pJoin`/danh sách người của bản đồ; xem ADR-04-2), `windows/arena.js` (tab), `windows/rank.js` (tab "Tam Hùng"), `game/game.js` (chế độ xem), `index.html`/`css/features.css` (`#hud-watch`), kiểm thử `tests/features/arena3.js` |
| opencode | không: chạm lõi PvP và luồng vào/ra bản đồ, Claude làm và rà |

### 11.2 Mục đích, vì sao thu hút

Lôi đài 1-1 thưởng người mạnh nhất, nhưng phần đông người chơi thích đi cùng bạn. Tam Hùng là PvP xếp hạng **theo đội cố định 3 người**: một Quạt hồi máu, một Đao giữ trận, một Tiêu dồn sát thương là đội hình có lý do tồn tại. Xem trận trực tiếp biến trận hay thành sự kiện xã hội: bạn gia tộc vào cổ vũ, người mới học cách chơi. Khung giờ cố định gom người chơi vào cùng lúc để ghép trận nhanh.

### 11.3 Luồng người chơi

1. Lập nhóm đúng 3 người (cấp ≥ 40). Trưởng nhóm mở cửa sổ Lôi đài (Võ Sư Thiết Quyền hoặc nút trong Lịch Sự Kiện) → tab **Tam Hùng** (`[data-artab=team]`) → "Ghép trận đội" (chỉ sáng trong khung giờ, ngoài giờ ghi "Mở lúc 18:00").
2. Hai thành viên còn lại nhận hộp xác nhận "Trưởng nhóm muốn ghép Tam Hùng. Sẵn sàng?" (15 giây). Đủ 3 xác nhận thì vào hàng chờ.
3. Ghép xong: cả 6 người vào phòng `loidai3#n`, hai đội ở hai mép, đếm ngược 10 giây (đọc thông tin đối thủ: phái, cấp, hệ).
4. Đánh 4 phút. Người bị hạ thành người xem trong trận (camera theo đồng đội còn sống, bấm để đổi người).
5. Hết người một bên: bên kia thắng. Hết giờ: so tổng % sinh lực còn lại (người bị hạ tính 0%) của mỗi đội.
6. Cửa sổ kết quả: đội, Elo trước/sau, xu, danh vọng; nút "Ghép tiếp" (giữ nhóm).
7. **Xem trận**: tab **Đang đấu** (`[data-artab=live]`) liệt kê trận đang diễn ra (1-1 và Tam Hùng, sắp theo Elo trung bình): bấm "Xem" → vào phòng đấu như người xem ẩn (ADR-04-2), `#hud-watch` hiện tên hai bên, số người xem, nút "Rời". Hết trận thì tự về chỗ cũ sau 4 giây.

### 11.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Đội | nhóm đúng 3 người, cùng ở bản đồ thường (không phó bản, không đang thi đấu), mỗi người cấp ≥ 40, không ai đang bị khóa bỏ trận |
| Khung giờ | 18:00-19:00, 21:45-23:00 hằng ngày; thêm 15:00-17:00 thứ Bảy, Chủ Nhật (giờ Việt Nam); trận đang đánh lúc đóng khung vẫn đánh xong |
| Elo | `c.arena3.elo` riêng, bắt đầu 1.000; đội lấy trung bình 3 người; `K = 24`; mỗi người cộng/trừ cùng một mức `Δ = K · (S − E)` với `E` tính từ Elo trung bình hai đội; không xuống dưới 0 |
| Ghép | chênh Elo trung bình ≤ 120, nới 60 mỗi 15 giây chờ, tối đa 600; không ghép hai đội có chung người đã đấu nhau ≥ 3 trận tính điểm trong ngày (cặp đội = tập 6 tên, lưu `db.meta.arena3Pairs`) |
| Trận | chuẩn bị 10 giây; 4 phút; vào trận hồi đầy; không bình thuốc, cuộn, đồ ăn; không hồi tự nhiên; kỹ năng hồi máu của Quạt/Kunai có hiệu lực (chỉ lên đồng đội trong trận) nhưng **× 0,6** trong `loidai3` |
| Hạ gục | `arena.ko(p)`: không chết thật, không rơi đồ, thành người xem trong trận (`p.match.out = true`), không bị đánh, không ra chiêu |
| Hết giờ | đội có tổng `hp / maxHp` (theo `maxHp` lúc vào trận) lớn hơn thắng; chênh < 1% là hòa |
| Bỏ trận / mất kết nối | người đó bị tính hạ gục ngay, khóa đăng ký Tam Hùng 5 phút; nếu cả đội bỏ khi chưa ai ra đòn thì trận không tính (`nc`) |
| Số trận tính | 10 trận tính điểm mỗi người mỗi ngày; quá thì vẫn đánh được nhưng không đổi Elo, không thưởng |
| Thưởng trận (xu thường, danh vọng chung với 1-1) | thắng 4.000 xu + 15 danh vọng · thua 1.500 + 5 · hòa 2.500 + 8 |
| Thưởng tuần (thứ Hai 00:00, theo Elo cá nhân Tam Hùng, đủ ≥ 5 trận và ≥ 2 thắng trong tuần, Elo ≥ 1.000) | hạng 1-3: 60 lượng + 120.000 xu + Rương Báu ×2 · 4-10: 30 lượng + 60.000 xu + Rương ×1 · 11-30: 10 lượng + 20.000 xu |
| Tổng lượng tuần toàn máy chủ | 3 · 60 + 7 · 30 + 20 · 10 = **590 lượng** (ghi vào mô hình kinh tế) |
| Danh hiệu | top 1 tuần: `t_tamhung` "Tam Hùng Đệ Nhất" giữ 7 ngày (Sử thi, công +40), qua `soc-titles` |

**Xem trận** (cả 1-1 và Tam Hùng):

| Quy tắc | Giá trị |
|---|---|
| Ai được xem | cấp ≥ 10, đang ở bản đồ thường, không trong hàng chờ, không trong nhóm/đội của trận đó |
| Số người xem | ≤ 30 mỗi trận; đầy thì "Trận đã đủ người xem" |
| Người xem | đối tượng `Player` thật nhưng `p.watch = { mid, back }`: không có trong `pJoin`/`state` gửi người khác, không chạm quái/người, `canPvp` luôn sai, không nhặt đồ, không dùng vật phẩm, không di chuyển (camera theo người đang đấu); chat chỉ ở kênh trận (`[Xem]`), người đấu **không** thấy kênh này |
| Vào/ra | vào: lưu `back = { map, x, y }`, đưa vào bản đồ trận; ra (nút, hết trận, mất kết nối): về `back` (nếu bản đồ `back` là phó bản đã đóng thì về làng phái) |
| Trễ | không trễ hình (đơn giản); chống mách nước bằng việc người đấu không thấy kênh chat người xem |

### 11.5 Dữ liệu

`src/shared/data/extras.js`, khối mới cuối file:

```js
// Lôi Đài Tam Hùng (3 đấu 3) và xem trận. GDD 04 mục 11.
const ARENA3 = {
  minLv: 40, size: 3, elo: 1000, k: 24,
  match: { base: 120, grow: 60, growEvery: 15000, max: 600 },
  confirm: 15000, countdown: 10000, dur: 4 * 60 * 1000, close: 4000,
  healMul: 0.6, drawPct: 1, quitLock: 5 * 60 * 1000,
  pairDaily: 3, daily: 10,
  hours: [
    { days: [0, 1, 2, 3, 4, 5, 6], from: [18, 0], to: [19, 0] },
    { days: [0, 1, 2, 3, 4, 5, 6], from: [21, 45], to: [23, 0] },
    { days: [0, 6], from: [15, 0], to: [17, 0] },
  ],
  win: { xu: 4000, fame: 15 }, lose: { xu: 1500, fame: 5 }, draw: { xu: 2500, fame: 8 },
  weeklyMin: 5, weeklyWin: 2,
  weekly: [
    { to: 3, luong: 60, xu: 120000, items: [['chest', 2]] },
    { to: 10, luong: 30, xu: 60000, items: [['chest', 1]] },
    { to: 30, luong: 10, xu: 20000 },
  ],
  title: 't_tamhung',
  watch: { minLv: 10, max: 30, back: 4000 },
};
```

Bản đồ `loidai3` (`maps.js`, sau `loidai`): `theme: 'arena'`, `instance: true`, `arena: true`, `team: true`, `w: 960`, `spawnX: 480`, điểm xuất phát hai đội `x 120/160/200` và `760/800/840`.

`check-data` (khối "Lôi Đài Tam Hùng"): `hours` không chồng khung `excl` của `CALENDAR` (Hung Tinh, Chiến Trường, Thủ Hộ Làng, Chiến gia tộc); `weekly` `to` tăng dần và lượng không tăng theo hạng; `healMul ≤ 1`; `loidai3` có cờ `arena` và `team`; danh hiệu `title` tồn tại khi có `TITLES`; cập nhật bảng `DESIGN_RULES.md` mục 9 (hàng "Lôi Đài Tam Hùng").

### 11.6 Giao thức

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| máy khách → máy chủ | `arena3Join` | | chỉ trưởng nhóm; mở xác nhận cho 2 người kia |
| máy khách → máy chủ | `arena3Ready` | `ok` (bool) | thành viên xác nhận |
| máy khách → máy chủ | `arena3Cancel` | | rời hàng chờ (cả đội) |
| máy khách → máy chủ | `arena3Leave` | | bỏ trận (bấm 2 lần ở máy khách) |
| máy chủ → máy khách | `arena3` | `st ('idle'|'confirm'|'queue'|'prep'|'fight'|'end'), wait, left, side, team: [{ id, name, cls, lv, hp, out }], opp: [{ id, name, cls, lv, elo, out }], elo, open (khung giờ đang mở), next (ms tới khung kế)` | như `arena` của 1-1 |
| máy chủ → máy khách | `arena3Result` | `res, reason, rated, nc, elo, before, d, xu, fame, hp, ohp, quit, lock` | `hp`/`ohp` là tổng % hai đội |
| máy khách → máy chủ | `arenaLive` | | danh sách trận đang đấu (chặn 2 giây/lần) |
| máy chủ → máy khách | `arenaLive` | `list: [{ id, kind ('solo'|'team'), a: [tên], b: [tên], elo, left, n }]` | |
| máy khách → máy chủ | `arenaWatch` | `id` (mã trận) | |
| máy khách → máy chủ | `arenaWatchEnd` | | |
| máy chủ → máy khách | `watch` | `{ id, kind, a, b, n, left, follow }` hoặc `null` khi kết thúc | |
| máy khách → máy chủ | `chat` | `ch: 'watch'` | kênh người xem |
| gói `rank` | thêm `arena3` (top 30) và `arena3Me` | | |

### 11.7 Máy chủ, máy khách, DOM

- **`modules/arena/team.js`** (lớp `Team`, tạo trong `init` của `arena`, `world.mods.arena.team`): hàng chờ đội, xác nhận, ghép (dùng lại `pairKey`/`pairTable` dạng tập 6 tên), `start` tạo `GameMap('loidai3')`, `p.match = { id, map, side: 'a'|'b', team: true, state, rated, hit, maxHp, out }`, `update` (hết giờ, hết người), `finish` (Elo, thưởng, thư tuần), `payWeek` (như `arena.payWeek`), móc `leave`/`enterMap` giống 1-1. `p.arenaBack` dùng lại. Lệnh admin (qua `arena.admin`): `/tamhung open|close` (ép khung giờ), `/tamhung ko <a|b>` (hạ cả đội), `/tamhung reward` (thưởng tuần), `/tamhung stat` (tỉ lệ thắng theo thành phần đội).
- **`modules/arena/watch.js`** (lớp `Watch`): `live()` liệt kê trận; `watch(p, id)` đặt `p.watch`, gọi `world.changeMap(p, map.id, x)` với cờ ẩn; `end(p)`; móc `leave` (về `back` khi lưu); `match.close` gọi `end` cho mọi người xem.
- **`modules/arena/index.js`**: thêm hành động `arena3Join/Ready/Cancel/Leave`, `arenaLive`, `arenaWatch`, `arenaWatchEnd` ủy quyền cho `team`/`watch`; `sanitize` thêm `c.arena3 = cleanArena(c.arena3)` (cùng lược đồ 1-1); `selfData` thêm `me.arena3`; `rank` thêm top 30.
- **Lõi** (ghi báo cáo, Claude làm): `canPvp(a, b)`: trong trận, đánh được khi `a.match.id === b.match.id && a.match.side !== b.match.side && !a.match.out && !b.match.out` (1-1 đặt `side` sẵn nên luật cũ giữ nguyên); kỹ năng `heal` trong trận chỉ chọn người cùng `side`; `map.addPlayer`/gửi `pJoin`, `state` bỏ qua `p.watch`; người xem không vào `map.players` dùng cho quái/AoE (danh sách riêng `map.watchers`).
- **Máy khách**: `windows/arena.js` thêm tab `[data-artab=solo|team|live]`, `renderArena3`, `renderArenaLive`; hộp xác nhận dùng `ask()`; `windows/rank.js` tab `[data-rktab=arena3]`; `game.js` khối "Xem trận": khi `S.watch` thì ẩn nhân vật mình, camera theo `follow` (bấm/chạm người đấu để đổi), ẩn cụm kỹ năng và D-pad (`body.watching`); `#hud-watch` (sau `#hud-tower`, G6) hiện "A, B, C đấu D, E, F · 02:41 · 12 người xem · Rời".
- **DOM mới**: `[data-artab=solo|team|live]`, `[data-act=a3-join]`, `[data-act=a3-cancel]`, `[data-act=watch][data-id]`, `#hud-watch`, `body.watching`.

### 11.8 Bố cục điện thoại

Trong trận Tam Hùng: khung đồng đội nhỏ (3 thanh máu 120×10px) ở góc trên trái dưới `#hud-status`, đối thủ ở góc trên phải dưới `#hud-map`; không chạm cụm kỹ năng. Chế độ xem: ẩn D-pad và cụm kỹ năng, `#hud-watch` dưới giữa rộng ≤ 360px, nút "Rời" 44px, chạm vào nhân vật để đổi người theo dõi. Tab "Đang đấu": danh sách dòng 56px, nút "Xem" 44px.

### 11.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Dàn xếp trận (đội phụ thua cho đội chính) | ≤ 3 trận tính điểm mỗi cặp đội mỗi ngày; 10 trận mỗi người; thưởng tuần cần ≥ 2 thắng và Elo ≥ 1.000; Elo cộng trừ đối xứng nên nuôi đội phụ làm tụt Elo đội phụ |
| Bỏ trận khi sắp thua để né Elo | bỏ trận = bị hạ + thua cho người bỏ, khóa 5 phút |
| Người xem mách nước | người đấu không thấy kênh `watch`; người cùng nhóm/đội không được xem trận của mình |
| Người xem tác động trận (AoE, nhặt, chặn đường) | người xem không có trong danh sách người của bản đồ dùng cho chiến đấu; `canPvp` sai; mọi hành động trừ `chat`, `arenaWatchEnd`, `ping` bị bỏ qua khi có `p.watch` (kiểm ở `router.handle`, một dòng) |
| Dùng xem trận để dịch chuyển (vào xem rồi "rời" ra chỗ khác) | luôn về đúng `back` |
| Mang thuốc/hồi máu ngoài | luật lôi đài cũ (cờ `arena`) áp dụng nguyên; `healMul` 0,6 |

### 11.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | đội có Quạt hồi máu bất tử | `healMul 0,6`, hết giờ so % máu; đo tỉ lệ thắng theo thành phần đội sau 2 tuần (`/tamhung stat`) |
| Cân bằng | máy chủ ít người: ghép lâu | khung giờ cố định gom người; nới Elo tối đa 600; nếu chờ > 3 phút thì gợi ý "Thử Lôi đài 1-1" |
| Kỹ thuật | người xem ẩn là thay đổi lõi (ADR-04-2) | kiểm thử đơn vị: người xem không xuất hiện ở `pJoin`, không trúng AoE, không bị quái nhắm |
| Kỹ thuật | 6 người + 30 người xem/trận | người xem nhận `state` như người trong bản đồ (băng thông như bản đồ 36 người, trong ngưỡng `ops-load-test`) |

### 11.11 Tiêu chí chấp nhận

1. `tests/features/arena3.js` ≥ 26 kiểm tra đạt; `tests/features/arena.js` (1-1) vẫn đạt nguyên.
2. `npm run test:ui` thêm kịch bản xem trận (trình duyệt thứ 2 xem trận 1-1 của trình duyệt 1 với bot, `#hud-watch` hiện, người đấu không thấy người xem).
3. `npm run check` sạch.
4. Ảnh: trận Tam Hùng 6 người (bot), kết quả, chế độ xem; desktop + điện thoại; `OK no console errors`.

### 11.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | Elo đội: 1.000 vs 1.000 thắng → +12 mỗi người; `canPvp` cùng `side` sai, khác `side` đúng, `out` sai; hết giờ tổng % (90+0+50 vs 60+60+0) → đội a; chênh 0,5% → hòa; người xem không trong `map.players` |
| Bot (`a3bot1`..`a3bot6`) | 2 nhóm 3 bot cấp 40, `/tamhung open` (mở khung giờ cho kiểm thử), `arena3Join` + `arena3Ready` → cả 6 nhận `arena3 st 'prep'`; `/tamhung ko a` hạ đội a → `arena3Result` `res 'lose'` cho đội a, Elo giảm 12; bot thứ 7 `arenaLive` thấy trận, `arenaWatch` → `watch` có `n === 1`, gửi `skill` → bị bỏ qua; hết trận → bot 7 về đúng bản đồ cũ |
| E2E | `npm run test:ui` kịch bản ở tiêu chí 2 |

---

## 12. Nhẫn Giả Lệnh (`sig-nhangialenh`)

### 12.1 Thẻ tính năng

| Mục | Nội dung |
|---|---|
| id | `sig-nhangialenh` |
| Trụ cột | **P5** (nhánh trả phí **chỉ ngoại hình**, không bán cấp; nhánh miễn phí đầy đủ), **P4** (nhiệm vụ kéo người chơi vào sự kiện chung), **P2** (nhiệm vụ ngày làm xong trong 30-40 phút) |
| MoSCoW, GĐ, cỡ | Should · giai đoạn 6 · S |
| Phụ thuộc | `evt-calendar` (cửa sổ Lịch Sự Kiện có tab), `quest-dailies` (một số nhiệm vụ đếm Việc Làng), `eco-bound` (thưởng nhánh miễn phí là đồ khóa), `mon-spend-cap` (giới hạn chi tiêu lượng/ngày nếu có) |
| Vùng file | module mới `modules/pass`, dữ liệu `shared/data/pass.js`, thời trang mới (bảng `FASHION`, `render/sprites/fashion.js`, `render/icons/fashion.js`: 1 bộ trang phục + 1 áo choàng + 1 mặt nạ mỗi kỳ), cửa sổ `windows/pass.js` (tab trong Lịch Sự Kiện), dòng theo dõi `.qt.pass` (`ui.js`), kiểm thử `tests/features/pass.js` |
| opencode | có (vẽ thời trang mỗi kỳ do Claude duyệt thẩm mỹ) |

### 12.2 Mục đích, vì sao thu hút

Người chơi cần một lộ trình dài với phần thưởng nhìn thấy trước 28 ngày, và máy chủ cần nguồn thu **không phá công bằng**. Nhẫn Giả Lệnh là một thanh 40 bậc: làm việc thường ngày (đánh quái, phó bản, sự kiện) là lên bậc. Nhánh miễn phí cho đủ vật phẩm tiến triển (khóa); nhánh **Kim Lệnh** (300 lượng một kỳ) chỉ thêm ngoại hình riêng của kỳ, có số hiệu kỳ để khoe "đã có từ kỳ 1". Không bán bậc, không có chỉ số trong nhánh trả phí: người không trả tiền không yếu hơn.

### 12.3 Luồng người chơi

1. Cấp ≥ 15: mở Lịch Sự Kiện → tab **Nhẫn Giả Lệnh** (`[data-evtab=pass]`), hoặc bấm dòng `.qt.pass` trong khối theo dõi ("Nhẫn Giả Lệnh · bậc 12 · 3/6 việc hôm nay").
2. Cửa sổ: thanh bậc ngang cuộn (40 ô, mỗi ô 2 tầng: Thường / Kim Lệnh), danh sách nhiệm vụ ngày (6) và tuần (4) có tiến độ, đồng hồ hết kỳ.
3. Làm nhiệm vụ trong lúc chơi bình thường; nhiệm vụ xong tự cộng điểm (không phải bấm), có thông báo nhỏ.
4. Bậc mới mở: ô sáng, bấm "Nhận" hoặc "Nhận tất cả".
5. Muốn Kim Lệnh: bấm "Mở Kim Lệnh (300 lượng)" trong 21 ngày đầu kỳ, xác nhận `ask()`; nhận ngay mọi phần Kim Lệnh của các bậc đã đạt.
6. Hết kỳ: phần thưởng chưa nhận của các bậc đã đạt tự gửi hộp thư.

### 12.4 Quy tắc, công thức, số liệu

| Quy tắc | Giá trị |
|---|---|
| Kỳ | 28 ngày, bắt đầu 00:00 thứ Hai; số kỳ `n = ⌊(ngày − mốc) / 28⌋ + 1`, mốc là thứ Hai đầu tiên sau khi bật tính năng (`PASS.epoch`) |
| Bậc | 40 bậc × 1.000 điểm |
| Nhiệm vụ ngày | 6 việc, mỗi việc 150-200 điểm, trần **1.000 điểm/ngày** (6 việc tổng 1.000) |
| Nhiệm vụ tuần | 4 việc × 1.187-1.188 điểm (tổng 4.750/tuần) |
| Tổng điểm có thể đạt | 28 · 1.000 + 4 · 4.750 = 47.000; cần 40.000 (≈ 85%): bỏ ~4 ngày vẫn đủ 40 bậc |
| Bậc sau 40 | mỗi 2.000 điểm thêm: 1 Rương Báu khóa (tối đa 3 lần mỗi kỳ) |
| Nhánh Thường | mọi người cấp ≥ 15; thưởng **khóa**: xu khóa (mỗi bậc `3.000 · ⌈bậc/5⌉`), đá cường hóa theo cấp, Bí Kíp, Tĩnh Tâm Hương, Rương Báu, thức ăn thú; **không lượng** |
| Nhánh Kim Lệnh | 300 lượng, mua trong 21 ngày đầu kỳ; thưởng: bộ trang phục kỳ (bậc 40), áo choàng kỳ (bậc 25), mặt nạ kỳ (bậc 10), khung chân dung kỳ (bậc 1), hiệu ứng tên tạm "Lệnh Quang" trong kỳ (bậc 30), biểu tượng chat; **mọi món chỉ số 0** |
| Thời trang Kim Lệnh | vĩnh viễn, khóa (không giao dịch), tên ghi số kỳ ("Áo Lệnh Kỳ 1 · Hồng Liên") |
| Cấm | không mua bậc, không mua điểm, không mua nhiệm vụ; không đổi lượng ra điểm dưới mọi hình thức |
| Hoàn tiền | không; mua sau ngày 21 bị chặn để không ai trả tiền mà không kịp đạt bậc |

Bảng nhiệm vụ (dữ liệu, xoay theo ngày trong tuần, đếm bằng móc có sẵn):

| Loại | Việc | Đếm bằng | Điểm |
|---|---|---|---|
| Ngày (cố định) | Hạ 300 quái | móc `kill` | 200 |
| Ngày (cố định) | Hoàn thành 5 nhiệm vụ Tiểu Nhị hoặc Việc Làng | móc `progress` khóa `daily` | 200 |
| Ngày (xoay 1) | Vượt 1 phó bản / leo 5 tầng tháp / 3 trận lôi đài (theo ngày) | `progress` khóa `dungeon`, `tower`, `arena` | 150 |
| Ngày (xoay 2) | Tham gia 1 sự kiện (Tà Thú, Thủ Hộ Làng, Hung Tinh) | `progress` khóa `event` | 150 |
| Ngày (xoay 3) | Tung Ấn Kỹ 5 lần / Hợp Kích 10 lần / cường hóa 3 lần | `progress` khóa `seal`, `combo`, `plus` | 150 |
| Ngày (cố định) | Điểm danh | móc `checkin` (`progress` khóa `checkin`) | 150 |
| Tuần | Hạ 2.000 quái | `kill` | 1.188 |
| Tuần | Tham gia 5 sự kiện | `progress` `event` | 1.188 |
| Tuần | Vượt 5 phó bản hoặc 30 tầng tháp | `progress` | 1.187 |
| Tuần | Hoàn thành 30 nhiệm vụ hằng ngày | `progress` `daily` | 1.187 |

Mỗi việc chỉ phát `progress` từ module của chính hệ thống đó (một dòng `hooks.emit` mỗi chỗ, ghi báo cáo); tính năng chưa có thì việc xoay sang việc khác trong danh sách dự phòng (`fallback: 'kill100'`).

Ước tính giá trị: nhánh Thường cả kỳ ≈ 300.000-600.000 xu khóa + 40 đá + 6 Bí Kíp + 6 rương ≈ 2 ngày cày của người chơi cùng cấp: đáng làm nhưng không bắt buộc. Kim Lệnh 300 lượng ≈ 12 ngày lượng miễn phí (~25 lượng/ngày, `content/40-items-shops.md`) hoặc gói nạp nhỏ: mua được bằng lượng kiếm trong game (P5).

### 12.5 Dữ liệu (`src/shared/data/pass.js`, mới)

```js
'use strict';

// Nhẫn Giả Lệnh: kỳ 28 ngày, 40 bậc. Nhánh Kim Lệnh chỉ ngoại hình (check-data chặn mọi chỉ số). GDD 04 mục 12.
const PASS = {
  epoch: '2027-01-04', days: 28, buyDays: 21, minLv: 15,
  levels: 40, per: 1000, dayCap: 1000, overflow: { per: 2000, item: 'chest', max: 3 },
  price: 300,
  daily: [
    { id: 'kill300', k: 'kill', n: 300, pts: 200 },
    { id: 'daily5', k: 'daily', n: 5, pts: 200 },
    { rot: [{ id: 'dg1', k: 'dungeon', n: 1 }, { id: 'tw5', k: 'tower', n: 5 }, { id: 'ar3', k: 'arena', n: 3 }], pts: 150 },
    { rot: [{ id: 'ev1', k: 'event', n: 1 }], pts: 150 },
    { rot: [{ id: 'seal5', k: 'seal', n: 5 }, { id: 'combo10', k: 'combo', n: 10 }, { id: 'plus3', k: 'plus', n: 3 }], pts: 150 },
    { id: 'checkin', k: 'checkin', n: 1, pts: 150 },
  ],
  weekly: [
    { id: 'kill2000', k: 'kill', n: 2000, pts: 1188 },
    { id: 'ev5', k: 'event', n: 5, pts: 1188 },
    { id: 'dg5', k: 'dungeon', n: 5, alt: { k: 'tower', n: 30 }, pts: 1187 },
    { id: 'daily30', k: 'daily', n: 30, pts: 1187 },
  ],
  fallback: { id: 'kill100', k: 'kill', n: 100 },
  // thưởng nhánh Thường: [bậc, phần thưởng]; 'XUK' = xu khóa theo bậc, 'STONE' = đá theo cấp người nhận
  free: [],
  // mỗi kỳ một bộ: [bậc, id thời trang/khung/hiệu ứng]; mọi id phải có chỉ số 0
  seasons: {
    1: { name: 'Hồng Liên', gold: [[1, 'frame_p1'], [10, 'mask_p1'], [25, 'cloak_p1'], [30, 'namefx_p1'], [40, 'suit_p1']] },
  },
};

module.exports = { PASS };
```

`free` (40 dòng) do worker sinh theo quy tắc ở bảng 12.4: bậc chia hết 5 → Rương Báu hoặc Bí Kíp xen kẽ; bậc chia hết 3 → 2 đá; còn lại xu khóa; bậc 20 và 40: Tĩnh Tâm Hương ×3. Mỗi kỳ mới thêm một phần tử vào `seasons` và 3 thời trang + 1 khung vào dữ liệu thời trang/vẽ (theo checklist thời trang của `CLAUDE.md`).

`check-data` (khối "Nhẫn Giả Lệnh"): tổng điểm ngày = `dayCap`; tổng có thể đạt ≥ `levels · per · 1,1`; `free` đủ 40 bậc, không có `luong`; **mọi id trong `seasons[*].gold` tồn tại và có chỉ số bằng 0** (thời trang `stats` rỗng, không `spd`); `price` ≥ 200; `buyDays < days`; mọi `k` nằm trong danh sách khóa `progress` đã đăng ký.

### 12.6 Giao thức

| Chiều | Gói | Trường |
|---|---|---|
| máy khách → máy chủ | `passInfo` | |
| máy khách → máy chủ | `passClaim` | `lv` (1-40), `lane` (`'free'`/`'gold'`) |
| máy khách → máy chủ | `passClaimAll` | |
| máy khách → máy chủ | `passBuy` | |
| máy chủ → máy khách | `pass` | `{ n (kỳ), name, end (ms), pts, lv, gold (bool), got: { free: [bậc], gold: [bậc] }, tasks: [{ id, k, n, cur, pts, done, week }], over }` |
| máy chủ → máy khách | `me` | `pass { lv, ready (số ô chờ nhận), today (việc xong/6) }` |

### 12.7 Máy chủ, máy khách, DOM

- **Module `modules/pass/index.js`**: `c.pass = { n, pts, gold, got: { f: bitmask, g: bitmask }, day, dc: {id: n}, wk, wc: {id: n}, dayPts, over }`. Móc `kill` (đếm quái), `progress(p, key, n)` (đếm việc), `playerSecond` (không cần), `join` (đổi kỳ: gửi thư phần chưa nhận của kỳ cũ rồi đặt lại; đổi ngày/tuần: đặt lại bộ đếm), `sanitize` (kẹp số, bitmask 40 bit dạng 2 số 20 bit hoặc mảng), `selfData`, `clientData`. `passBuy`: kiểm ngày trong kỳ ≤ `buyDays`, chưa mua, kiểm `p.c.luong >= price` rồi trừ `p.c.luong` như `modules/shop` (ghi một dòng nhật ký mua bán lượng), đặt `gold = true` trước khi trao. `passClaim`: bit chưa đặt và bậc đã đạt → đặt bit **trước** khi trao (`giveReward(p, r, { bound: true })`, túi đầy thì gửi thư). Lệnh admin `/lenh pts <n>`, `/lenh day`, `/lenh season <n>`.
- **Máy khách**: `windows/pass.js` (`renderPass`) là tab `[data-evtab=pass]` của cửa sổ Lịch Sự Kiện (`evt-calendar`); nếu cửa sổ lịch chưa có thì mở như cửa sổ riêng `pass` từ dòng theo dõi. Ô bậc dùng `iconURL`; thời trang Kim Lệnh xem trước bằng `drawPortrait` có mặc món đó.
- **DOM mới**: `[data-evtab=pass]`, `.ps-track`, `.ps-cell[data-lv]`, `[data-act=ps-claim]`, `[data-act=ps-claimall]`, `[data-act=ps-buy]`, `.qt.pass`.

### 12.8 Bố cục điện thoại

Thanh bậc là dải cuộn ngang (ô 64×120px, 2 tầng), tự cuộn tới bậc hiện tại khi mở; danh sách nhiệm vụ dưới thanh, mỗi dòng 48px có thanh tiến độ. Nút "Nhận tất cả" và "Mở Kim Lệnh" cố định ở chân cửa sổ, 44px. Xem trước trang phục mở trong bảng dưới (không hộp nổi).

### 12.9 Chống gian lận, nhân bản

| Nguy cơ | Chặn |
|---|---|
| Nhận một ô hai lần | bit đặt trước khi trao; `sanitize` kẹp bit ≤ bậc đạt |
| Đổi giờ máy để sang ngày mới | ngày theo giờ máy chủ (giờ Việt Nam) |
| Cày điểm bằng nhân vật phụ rồi chuyển đồ | thưởng nhánh Thường là đồ khóa; thời trang Kim Lệnh khóa |
| Mua Kim Lệnh hai lần | cờ `gold` theo kỳ; `passBuy` khi đã có → từ chối, không trừ lượng |
| Món Kim Lệnh lén có chỉ số | `check-data` chặn khi gộp |

### 12.10 Rủi ro

| Loại | Rủi ro | Giảm thiểu |
|---|---|---|
| Cân bằng | nhánh Thường làm phình xu khóa | xu khóa chỉ tiêu ở NPC (eco-bound), tổng ≤ 600.000/kỳ, tính vào mô hình kinh tế |
| Cộng đồng | người chơi coi là "trả tiền mới đủ" | nhánh trả phí chỉ ngoại hình, ghi rõ trên nút "Chỉ ngoại hình, không chỉ số" |
| Nội dung | mỗi kỳ cần 3 thời trang + khung mới | lịch vẽ 4 tuần một bộ; thiếu bộ mới thì dùng lại khuôn đổi bảng màu (chấp nhận cho kỳ phụ) |
| Kỹ thuật | `progress` phải phát từ nhiều module | mỗi chỗ một dòng; việc thiếu nguồn tự xoay sang `fallback` |

### 12.11 Tiêu chí chấp nhận

1. `tests/features/pass.js` ≥ 18 kiểm tra đạt.
2. `npm run check` sạch, khối "Nhẫn Giả Lệnh" chặn được món Kim Lệnh có chỉ số (ca thử âm trong `tools/check-data.js` tự kiểm bằng dữ liệu giả).
3. Ảnh tab Nhẫn Giả Lệnh desktop + điện thoại, `OK no console errors`.

### 12.12 Kiểm thử

| Loại | Nội dung |
|---|---|
| Đơn vị | hạ 300 quái → `dayPts += 200`; vượt trần ngày → dừng ở 1.000; số kỳ từ `epoch`; mua ngày 22 → từ chối; `passClaim` bậc chưa đạt → từ chối; nhận lại → từ chối; đổi kỳ → phần chưa nhận vào thư |
| Bot (`passbot`) | `/lv 20`, `/lenh pts 5000` → `pass.lv === 5`; `passClaimAll` → túi có đồ khóa; `passBuy` thiếu lượng → từ chối; `/luong 300`, `passBuy` → `gold === true`, lượng giảm 300, nhận khung chân dung bậc 1; `passBuy` lần 2 → từ chối, lượng không đổi |
| E2E | không bắt buộc |

---
## 13. Tính năng mức Could (tóm tắt và lý do)

Chín ứng viên dưới đây giữ trong danh mục, không đặc tả đầy đủ ở 1.0. Mỗi mục ghi: ý tưởng, vì sao Could, điều kiện để nâng lên Should, cỡ ước tính.

### 13.1 Bí Cảnh Phù Chú (`pve-bicanh-phuchu`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | phó bản một mình hoặc nhóm 2, 8 ải bố cục ngẫu nhiên; sau mỗi ải chọn 1 trong 3 **phù chú** (ví dụ "Kim Cang Phù: thủ +20% tới hết lượt", "Hỏa Phù: đòn thường kèm bỏng") cộng dồn trong lượt; mỗi lượt khác nhau |
| Vì sao Could | trùng mục đích với Tháp Vô Tận (PvE thử thách có điểm dừng) và hang động; bố cục ngẫu nhiên cần sinh bản đồ theo thủ tục (chưa có), phù chú cộng dồn phá thang cân bằng boss; chi phí L+ |
| Điều kiện nâng | Tháp Vô Tận chạy ổn ≥ 4 tuần, có công cụ cân bằng tự động (`dev-balance-tool`) mô phỏng được tổ hợp phù chú |
| Cỡ | L · giai đoạn 5 (sau 1.0) |

### 13.2 Bách Quỷ Dạ Hành (`sig-bachquy`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | đêm (giờ Việt Nam 23:30-00:30), đoàn 20-30 quỷ đi ngang một bãi luyện ngẫu nhiên, ai đánh cũng có điểm, đoàn rơi hộp quà |
| Vì sao Could | khung đêm đã có Hung Tinh 23:00-23:30 và Tà Thú giờ chẵn; 30 quỷ di chuyển cùng lúc tốn hiệu năng điện thoại; giá trị trùng Thủ Hộ Làng |
| Điều kiện nâng | gộp làm "biến thể" của lễ hội `evt-halloween` (chỉ chạy trong mùa lễ, dùng lại module `season` và đường đi của quái công thành Thủ Hộ Làng) |
| Cỡ | M · giai đoạn 6 (trong lễ hội) |

### 13.3 Thời tiết ảnh hưởng chiến đấu (`sig-thoitiet`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | mưa tăng sát thương Thủy, nắng tăng Hỏa, gió tăng Phong 5-10% theo thời tiết của bản đồ |
| Vì sao Could | thời tiết ngẫu nhiên thưởng/phạt theo phái người chơi không chọn được: chống P5 (công bằng); phá so sánh BXH, lôi đài; cần đồng bộ thời tiết máy chủ - máy khách |
| Điều kiện nâng | chỉ giữ thời tiết **trang trí** (đã có lớp ngày/đêm); nếu có hiệu ứng thì chỉ ở sự kiện có báo trước (ví dụ "Đêm Mưa Thủy Hệ" trong lịch) và đối xứng giữa 3 hệ trong tuần |
| Cỡ | M · giai đoạn 5 |

### 13.4 Nghề phụ: câu cá, hái thuốc, luyện đan (`sig-nghephu`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | câu cá mini-game canh nhịp ở bờ hồ, hái thuốc ở bãi, luyện đan ở Bà Thuốc thành bình/đồ ăn; dùng chung nền chế tác `gear-crafting` |
| Vì sao Could | thêm nguồn vật phẩm mới phải cân lại kinh tế (`eco-economy-model`), mini-game câu cá cần điều khiển chạm riêng; cỡ L; không phụ thuộc trụ cột chính |
| Điều kiện nâng | `gear-crafting` và chợ ký gửi (`eco-market`) chạy ổn, mô hình kinh tế có chỗ cho nguồn mới; làm câu cá trước như hoạt động thư giãn không có thưởng giá trị cao |
| Cỡ | L · giai đoạn 5 (sau 1.0) |

### 13.5 Biểu cảm, ngồi thiền, chụp ảnh nhóm (`soc-bieucam`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | 8 biểu cảm (vẫy tay, cúi chào, cười, khóc, ngồi, thiền, tức giận, cổ vũ) qua bảng nhanh trong ô chat; "chụp ảnh nhóm" lưu khung canvas có khung viền game |
| Vì sao Could | điểm chấm cao (rẻ, ít rủi ro) nhưng không tính năng nào phụ thuộc và không mở nội dung mới; là việc tốt cho worker opencode khi dư công |
| Điều kiện nâng | giao ngay khi có một đợt worker rảnh: gói `emote { k }` (danh sách trắng), chặn 2 giây/lần, vẽ trong `render/sprites` bằng tư thế có sẵn |
| Cỡ | S · giai đoạn 5 |

### 13.6 Công thành chiến gia tộc (`clan-siege`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | mỗi tuần các gia tộc tranh một thành; tộc giữ thành thu 1-2% thuế chợ ký gửi |
| Vì sao Could | phụ thuộc `clan-war` và `eco-market` (đều chưa làm); lịch tối đã kín (Chiến Trường, Chiến gia tộc, Thủ Hộ Làng, Tam Hùng); thuế chợ chuyển xu giữa người chơi tạo bất công nếu một tộc thống trị lâu (chống P5) |
| Điều kiện nâng | `clan-war` có ≥ 8 gia tộc tham gia đều đặn ≥ 4 tuần; thưởng thành là danh hiệu + ngoại hình thay vì thuế |
| Cỡ | L · giai đoạn 5 (sau 1.0) |

### 13.7 Nhà riêng (`sig-nharieng`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | mỗi nhân vật một căn nhà (bản đồ phó bản riêng), đặt đồ trang trí, mời bạn ghé |
| Vì sao Could | bản đồ riêng tồn tại lâu dài tốn bộ nhớ và lưu trữ JSON; cần hệ đồ trang trí, đặt vật trên lưới, vẽ nhiều; cỡ L; lợi ích trụ cột thấp so với chi phí |
| Điều kiện nâng | lưu trữ chuyển sang cơ sở dữ liệu thật (sau `ops-db-safe-load`) và có nhu cầu ngoại hình đủ lớn từ Nhẫn Giả Lệnh |
| Cỡ | L · sau 1.0 |

### 13.8 Áp Tiêu xuyên vùng (`sig-aptieu`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | nhận xe tiêu ở làng, hộ tống qua 3-4 bản đồ; người khác được cướp tiêu theo luật |
| Vì sao Could | cướp tiêu là PK có thưởng: dễ thành bắt nạt người mới (chống P4, P5); trùng loại "hộ tống" của Việc Làng (`quest-dailies`) |
| Điều kiện nâng | hộ tống Việc Làng được ưa chuộng; cướp tiêu chỉ trong khung giờ, chỉ giữa người chênh ≤ 10 cấp, người hộ tống chọn "bật cướp" để nhận thưởng gấp đôi |
| Cỡ | M · giai đoạn 6 |

### 13.9 Khinh Công (`cmb-khinhcong`)

| Mục | Nội dung |
|---|---|
| Ý tưởng | bám tường, nhảy tường, lướt trên không; mở đường tắt và bí mật trên bản đồ |
| Vì sao Could | đổi vật lý nhảy ở `game/game.js` buộc đổi hằng số kiểm `JUMP/JUMP2/GRAV` ở `modules/movement` (`CLAUDE.md`), mở kẽ hở gian lận vị trí; bản đồ hiện không có tường đứng; điều khiển chạm thêm nút |
| Điều kiện nâng | có hệ kiểm vị trí theo đường đi (không chỉ độ cao), bản đồ mới thiết kế có tường (vùng 121-199) |
| Cỡ | L · giai đoạn 5 (sau 1.0) |

---

## 14. Quyết định kiến trúc (ADR)

### ADR-04-1: Ô Ấn Kỹ trên cụm kỹ năng

| Mục | Nội dung |
|---|---|
| Bối cảnh | `DESIGN_RULES.md` mục 8 cố định cụm kỹ năng (nút đánh thường 96px, vòng cung 6 ô, `hb-sets`) và đã đo 6 bố cục điện thoại. Thanh Ấn cần một nút bấm nhanh trong lúc đánh, không thể nằm trong menu |
| Quyết định | thêm **một** nút `.sbtn.seal` 48px ở khoảng trống giữa nút đánh thường và ô 6 (`right: 22px; bottom: 116px`), phím 7; vòng Ấn khí vẽ quanh nút đánh thường (không tốn chỗ). Nút chỉ hiện khi cấp ≥ 40. Cập nhật `DESIGN_RULES.md` mục 8 (hàng cụm kỹ năng) trong cùng commit |
| Phương án khác | (a) Ấn Kỹ thay ô kỹ năng 6 khi đầy: người chơi mất chiêu cấp cao đúng lúc cần, gây nhầm; (b) bấm giữ nút đánh thường 0,6 giây: chậm, dễ bấm nhầm khi tự đánh; (c) nút trong `#hud-menu`: xa tay phải, trái mục 8 (giữ 16 nút) |
| Chi phí | M (CSS 6 bố cục + đo ảnh lại + phím 7 trong `input.js`) |
| Hệ quả | cụm kỹ năng có 9 phần tử bấm; mọi tính năng sau muốn thêm nút cụm kỹ năng phải có ADR riêng; `tests/e2e` đo lại không chồng lấn |

### ADR-04-2: Người xem trận là nhân vật ẩn trong phòng đấu

| Mục | Nội dung |
|---|---|
| Bối cảnh | Xem trận cần nhận đúng gói `state` của phòng đấu. Lõi hiện chỉ gửi `state` cho người **trong** bản đồ; mọi người trong bản đồ đều thấy nhau, đánh được nhau theo luật bản đồ. Không có khái niệm "khán giả" |
| Quyết định | người xem là `Player` thật được đưa vào bản đồ trận với cờ `p.watch`; lõi (`core/world.js`, `core/map.js`, `core/combat.js`, `core/router.js`) bỏ qua `p.watch` khi gửi `pJoin`/`state` cho người khác, khi chọn mục tiêu quái/AoE/PvP, và chặn mọi hành động trừ `chat`, `ping`, `arenaWatchEnd`. Người xem được giữ ở danh sách riêng `map.watchers` |
| Phương án khác | (a) máy chủ phát lại gói của trận tới người xem đứng ở bản đồ khác: phải nhân bản gói theo trận, người xem vẫn thấy thế giới cũ của mình, khó dựng màn hình; (b) ghi hình rồi phát lại sau trận: không trực tiếp, tốn lưu trữ; (c) không có xem trận: mất giá trị xã hội của Tam Hùng |
| Chi phí | M trong lõi (5-8 chỗ kiểm `p.watch`), phải có kiểm thử đơn vị cho từng chỗ |
| Hệ quả | mọi tính năng sau thêm "duyệt người trong bản đồ" phải dùng hàm lõi `map.fighters()` (bỏ người xem) thay vì đọc `map.players` trực tiếp; ghi vào `CLAUDE.md` mục kiến trúc khi gộp |

### ADR-04-3: Tiến độ khi không online có trần

| Mục | Nội dung |
|---|---|
| Bối cảnh | Trụ cột P2 muốn người bận không bị bỏ lại; P5 và kinh tế không muốn treo máy/không chơi vẫn mạnh. Hiện không có cơ chế nào tạo tài nguyên khi người chơi offline |
| Quyết định | cho phép **một** nguồn tiến độ offline duy nhất: Bế Quan, EXP ≤ 600 phút × 5% EXP/phút cày (≈ 30 phút cày, ×1,5 nếu trả xu), không xu, không lượng, không vật phẩm; ủy thác chỉ hoàn 50% thưởng lượt hằng ngày bị bỏ của **hôm qua** dưới dạng xu khóa và có phí lớn hơn xu nhận. Mọi đề xuất tiến độ offline sau này phải đi qua ADR mới |
| Phương án khác | (a) không có tiến độ offline: người chơi 30 phút/ngày tụt xa, bỏ game; (b) treo máy offline đầy đủ như game tham khảo kiểu "nhàn rỗi": phá P3, P5 và kinh tế xu; (c) thẻ EXP đôi bán bằng lượng: trả tiền để mạnh, chống P5 |
| Chi phí | S |
| Hệ quả | tốc độ lên cấp của người chơi 1 giờ/ngày tăng ~8-12% (đã tính vào `cmb-balance`); `Player.gainExp` có tham số nguồn để các hệ khác loại trừ EXP bế quan |

---

## 15. Bảng xếp loại MoSCoW

| # | id | Tên | Ưu tiên | Trụ cột | GĐ | Cỡ | opencode | Trạng thái | Phụ thuộc chính |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `sig-thanhan` | Thanh Ấn | Should | P3, P1 | 5 | M | không | todo | `cmb-balance`, `art-cutin`, `cmb-status` |
| 2 | `sig-hopkich` | Hợp Kích | Should | P3, P4 | 5 | M | không | todo | `sig-thanhan`, `cmb-status`, `cmb-balance` |
| 3 | `sig-thuctinh` | Thức Tỉnh | Should | P3, P5 | 5 | L | không | todo | `core-levelcap-199`, `cmb-skills-199`, `eco-bound` |
| 4 | `pve-thapvotan` | Tháp Vô Tận | Should | P3, P2 | 5 | L | có | todo | `cmb-balance`, `eco-bound` |
| 5 | `evt-village-defense` | Thủ Hộ Làng | Should | P4 | 6 | M | có | todo | `quest-dailies`, `eco-bound`, `evt-calendar` |
| 6 | `sig-sonhangia` | Sổ Nhẫn Giả | Should | P4, P5 | 5 | M | có | todo | `soc-titles` |
| 7 | `sig-bequan` | Bế Quan | Should | P2, P5 | 5 | S | có | todo | `eco-bound`, `quest-dailies` |
| 8 | `soc-nhanduyen` | Nhân Duyên | Should | P4 | 5 | L | có | todo | `eco-bound`, `soc-titles` |
| 9 | `pvp-arena-3v3` | Lôi Đài Tam Hùng | Should | P3, P4 | 6 (dời từ 5 khi ghép) | L | không | todo | `pvp-arena`, `evt-calendar` |
| 10 | `sig-nhangialenh` | Nhẫn Giả Lệnh | Should | P4, P5 | 6 | S | có | todo | `evt-calendar`, `quest-dailies`, `eco-bound`, `mon-spend-cap` |
| 11 | `pve-bicanh-phuchu` | Bí Cảnh Phù Chú | Could | P3 | 5 | L | không | todo | `pve-thapvotan`, `dev-balance-tool` |
| 12 | `sig-bachquy` | Bách Quỷ Dạ Hành | Could | P1, P4 | 6 | M | có | todo | `evt-halloween`, `evt-village-defense` |
| 13 | `sig-thoitiet` | Thời tiết chiến đấu | Could | P3, P1 | 6 (dời từ 5 khi ghép) | M | không | todo | `evt-calendar` |
| 14 | `sig-nghephu` | Nghề phụ | Could | P1, P2 | 5 | L | có | todo | `gear-crafting`, `eco-market`, `eco-economy-model` |
| 15 | `soc-bieucam` | Biểu cảm, chụp ảnh nhóm | Could | P4, P1 | 5 | S | có | todo | không |
| 16 | `clan-siege` | Công thành chiến | Could | P4 | 5 | L | không | todo | `clan-war`, `eco-market` |
| 17 | `sig-nharieng` | Nhà riêng | Could | P1, P4 | 5 | L | không | todo | `ops-db-safe-load` |
| 18 | `sig-aptieu` | Áp Tiêu xuyên vùng | Could | P4, P3 | 6 | M | có | todo | `quest-dailies` |
| 19 | `cmb-khinhcong` | Khinh Công | Could | P3, P1 | 5 | L | không | todo | `cmb-balance` |

Không có Must (không tính năng nào trong mục này là điều kiện tối thiểu của 1.0) và không có Won't (mọi ứng viên còn đường nâng hạng có điều kiện rõ ở mục 13). Tổng cỡ 10 Should: 2 S + 4 M + 4 L.

---

## 16. Câu hỏi mở

Mỗi câu có phương án mặc định; đặc tả ở trên đã viết theo phương án mặc định, đổi thì chỉ sửa dữ liệu hoặc một quy tắc nêu rõ.

| # | Câu hỏi | Mặc định đang dùng | Ảnh hưởng nếu đổi |
|---|---|---|---|
| 1 | Ấn Kỹ dùng phím **7** và nút 48px cạnh nút đánh thường (ADR-04-1) hay thay vào ô kỹ năng 6 khi đầy? | phím 7 + nút riêng | đổi sang thay ô 6: bỏ CSS nút mới, sửa `input.js`, `ui.js` |
| 2 | Hợp Kích có tính trong PvP (chiến trường, gia tộc chiến) ở 1.0 không? | chỉ PvE ở 1.0 | bật PvP: thêm hệ số PvP 0,5 và kiểm thử cân bằng chiến trường |
| 3 | Phí đổi nhánh Thức Tỉnh: 200.000 xu × tầng, hồi 7 ngày, lần đầu trong 24 giờ miễn phí? | đúng như vậy | chỉ đổi số trong `AWAKEN` |
| 4 | Tháp Vô Tận chia BXH 3 dải cấp (30-79, 80-139, 140-199) hay một bảng chung? | 3 dải | một bảng: lượng tuần giảm còn 1/3, người cấp thấp không có cơ hội |
| 5 | Kết duyên cho mọi giới tính, giao diện dùng chữ "bạn đời"? | có, mọi giới tính | giới hạn giới tính: thêm một điều kiện trong `bondReq` |
| 6 | Bế Quan: 5% EXP/phút cày, trần 10 giờ, gấp rưỡi bằng xu (không bằng lượng)? | đúng như vậy | tăng tỉ lệ cần sửa ADR-04-3 và mô hình EXP |
| 7 | Khung giờ Lôi Đài Tam Hùng: 18:00-19:00, 21:45-23:00 hằng ngày, thêm 15:00-17:00 cuối tuần? | đúng như vậy | đổi `ARENA3.hours`, `check-data` kiểm không chồng lịch |
| 8 | Giá Kim Lệnh 300 lượng mỗi kỳ, chỉ mua trong 21 ngày đầu? | 300 lượng, 21 ngày | đổi `PASS.price`, `buyDays`; `check-data` chặn giá < 200 |
| 9 | Trần lượng mỗi lượt Thủ Hộ Làng 60 (hạng > 60 không có lượng)? | 60 | đổi `DEFENSE.luongCap` |
| 10 | Trần chỉ số Sổ Nhẫn Giả hạng 10: sinh lực +3%, công +2%, thủ +2%, EXP +3%? | đúng như vậy | đổi `CODEX.cap` và cột `st`; tính lại `tools/balance.js` |
| 11 | Xem trận có cho mọi người (kể cả người cùng gia tộc với một bên) và không trễ hình? | cho mọi người trừ thành viên của chính trận đó; không trễ; người đấu không thấy kênh chat người xem | thêm trễ 10 giây: cần bộ đệm gói theo trận (M) |
| 12 | Nhân Duyên: cấm sư đồ cùng IP đăng nhập lần cuối (có thể chặn nhầm người cùng nhà/quán net)? | cấm cùng tài khoản và cùng IP | nới: chỉ cấm cùng tài khoản, chấp nhận rủi ro nuôi đệ tử ảo (thưởng đã khóa) |
| 13 | Tâm Ma Cảnh: thua không mất EXP và thử lại không giới hạn (chờ 30 giây)? | đúng như vậy | giới hạn lượt/ngày: thêm `retryDay` vào `AWAKEN` |
