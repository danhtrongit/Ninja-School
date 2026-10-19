# Quyết định trong lúc thực hiện

Ghi các quyết định lệch hoặc bổ sung so với `GDD.md` / `ROADMAP.md`, và mọi mục `features.json` để "blocked" (kèm lý do theo luật 9 của mục tiêu).

## D-01 (2026-10-18) Chốt commit main: 4 nhóm + phần đã chạy production

- `ROADMAP.md` T0.02 muốn `main` chỉ gồm 4 nhóm commit ở GĐ0 (đợt 1-2B, tái cấu trúc, túi đồ, âm thanh), còn màu bậc 12-19, icon kỹ năng, 3 theme (`nf/*`) và xu khóa + cân bằng (`dot3/bound`, `dot3/balance`) gộp ở GĐ1/GĐ2.
- Mục tiêu người dùng giao (luật 1) yêu cầu commit **cây hiện tại** sau khi `check` + `test` đạt. Production (ninja.iqx.vn, mốc `checkpoint/lo1`) đã chạy xu khóa từ 18-10-2026 22:10: người chơi đã có `c.xuk` và đồ khóa `it.b`. Triển khai một `main` thiếu xu khóa sẽ làm mất dữ liệu đó khi lưu (trái luật 8).
- Quyết định: dựng `main` bằng 4 nhóm commit đúng thứ tự của T0.02 (cây lấy nguyên từ `5a50602`, `920700a`, `fdd1297`, `4b0ff52`, `a4b4a0a` + `src/client/audio`), rồi thêm 3 commit riêng cho phần đã chạy production: đồ họa (`d8161c2`), xu khóa + cân bằng (`8f389c3`), sửa `nearNpc`. Cây cuối trùng cây đã kiểm (`npm run check` + `npm test` đạt).
- Hệ quả: acceptance dòng 4 của `ops-commit-restructure` ("nf/*, dot3/* không vào main ở GĐ0") được thay bằng nội dung trên; các id `eco-bound`, `dev-balance-tool`, `cmb-balance`, `char-tier-outfit` có mã trên `main` nhưng vẫn "todo" tới khi đạt đủ acceptance riêng (ảnh gallery, kiểm thử...).

## D-02 (2026-10-18) `npm run verify` mặc định chạy đủ, kể cả trình duyệt và tải

- GDD 10 mục 14.2 để kiểm thử trình duyệt sau cờ `--browser`; mục tiêu (luật 1) yêu cầu `npm run verify` chạy cả `test:ui`, `test:e2e` hai cỡ, `test:perf`, `test:visual`, `test:load`, `check:features`.
- Quyết định: mặc định chạy đủ 10 bước; `--quick` chỉ chạy bước 1-6 (kiểm tĩnh, ≤ 15 giây); `--no-browser`, `--no-load` chỉ dùng khi đang làm dở, không dùng để xác nhận xong. Script tự bật server tạm (cổng 3600-3689, `DATA_DIR` tạm, `ADMINS` cho tài khoản test, `DEV_TOOLS=1`).
- `test:load` mặc định 500 bot trong 60 phút (luật 7). Kịch bản K1-K7 của GDD 10 mục 13 (300 người, VPS thử) vẫn là acceptance của `ops-load-test` ở GĐ8.

## D-03 (2026-10-18) Tiếng hiệu ứng tổng hợp bằng WebAudio thay file

- Người chơi thử (chủ dự án) báo nhiều tiếng hiệu ứng file (Stable Audio) nghe rè, ồn. Luật 4 của mục tiêu cũng yêu cầu âm thanh WebAudio.
- Quyết định: bỏ 45 file `src/client/audio/sfx`, mọi tiếng hiệu ứng tổng hợp trong `core/sound.js` (bảng `RECIPES`, 49 tiếng; ồn hồng qua bộ lọc, cắt trên 7 kHz, bao âm mềm, bộ nén trên kênh hiệu ứng, tối đa 8 tiếng chồng nhau, cùng tiếng cách ≥ 70 ms). `tests/e2e/sfx.js` (`npm run test:sfx`) đo từng tiếng: đỉnh ≤ -1 dBFS, RMS ≥ -40 dBFS, năng lượng trên 8 kHz ≤ 3%. Nhạc nền giữ file ACE-Step (MIT).
- Hệ quả: không còn ràng buộc giấy phép Stability AI; `CREDITS.md` chỉ còn nhạc nền.

## D-04 (2026-10-18) Không dùng opencode / agent-hub

- Mục tiêu (luật 4) nhắc giao việc cho worker opencode theo `CLAUDE.md`, nhưng `CLAUDE.md` (sửa theo yêu cầu người dùng ngày 18-10-2026) ghi không dùng opencode / agent-hub trừ khi người dùng yêu cầu lại. Làm theo `CLAUDE.md`: Claude tự làm hoặc giao agent Claude.

## D-05 (2026-10-18) Không dùng Phaser

- Người dùng hỏi vì sao client không dùng Phaser để tránh bấm nhầm nút. Luật 4 và `CLAUDE.md` cấm thêm thư viện/CDN khi GDD chưa có ADR. Nút giao diện là DOM nằm trên canvas, đổi khung vẽ không sửa được lỗi bấm nhầm. Lỗi bấm nhầm được xử lý như lỗi giao diện (tìm đúng nút, vùng chạm ≥ 44 px trên điện thoại theo `DESIGN_RULES.md`).

## D-06 (2026-10-19) CI chạy verify không có bước trình duyệt và tải; ảnh tính năng lưu ở docs/shots

- Mốc băm ảnh của `test:visual` lưu theo nền tảng (`darwin-arm64`), máy CI là `linux-x64` nên không so được. `test:load` chạy 60 phút. Vì vậy CI (`.github/workflows/ci.yml`, Node 24) chạy `npm run verify -- --no-browser --no-load`: kiểm tĩnh, `npm test`, `check:features` (bằng chứng nằm trong log trình duyệt / tải được ghi "bỏ qua", không tính là đạt). Lần kiểm chứng xác nhận xong việc chạy `npm run verify` đầy đủ trên bản clone sạch ở máy dev M1.
- `npm run verify -- --prod` thêm bước `test:prod` (smoke test https://ninja.iqx.vn, kiểm `/api/status.commit` trùng main). Chỉ dùng sau khi đã triển khai đúng commit.
- Luật 6 của mục tiêu yêu cầu lưu ảnh ở `docs/shots/<id>/`, còn `CLAUDE.md` cấm commit "ảnh chụp kiểm tra". Hiểu là: ảnh tạm khi kiểm tra không commit; ảnh minh họa tính năng (JPEG, điện thoại thu về rộng 844 px) thì commit trong `docs/shots/<id>/` để `docs/REPORT.md` dẫn tới. `tests/features/repo.js` chặn ảnh nằm ngoài `docs/shots`, `src/client`, `tests/baseline`.

## D-07 (2026-10-19) Đồ họa chuyển sang pixel ×3 từ ảnh AI (DESIGN_RULES mục 11)

- Người dùng chốt hướng đồ họa mới và ghi vào `DESIGN_RULES.md` (luật 0.3, lưới ×3 ở mục 1, mục 11). Lúc đầu chốt ×4, cùng ngày đổi sang ×3 vì trên máy 1080p và điện thoại phổ biến ×4 chỉ còn khoảng 1 pixel thiết bị mỗi pixel nghệ thuật. Lớp thế giới vẽ ở tỉ lệ nguyên `k = ceil(s)` rồi dán cả lớp ra màn hình một lần có làm mượt. Ảnh do dự án tự tạo bằng Cloudflare Workers AI (FLUX.2 klein 4B, Apache 2.0), cắt mảnh, dựng khung xương mảnh cứng, thu về pixel ×3, đặt ở `src/client/art/`, ghi nguồn ở `src/client/art/CREDITS.md`. Luật 4 của mục tiêu ghi "đồ hoạ vẽ bằng code"; người dùng sửa `DESIGN_RULES.md` sau đó và nhắc "dựa vào đó thực hiện cho đúng", nên luật 0.3 mới thắng: hình vẽ code vẫn dùng cho nhóm chưa chuyển, ảnh AI tự tạo cho nhóm đã chuyển. Phần còn lại của luật 4 vẫn giữ: ảnh là tài nguyên tự tạo, không thêm thư viện hay CDN.
- Cách áp vào ROADMAP:
  - Thêm `art-x3-world` (GĐ1, Must): bước 1 của thứ tự chuyển đổi (lớp thế giới ×3 vẽ ở tỉ lệ nguyên rồi thu mượt, bộ nạp atlas, hình code cũ phóng nguyên ×3, đo lại `test:perf` cả điện thoại @3x, kiểm atlas trong `check-data.js`), kèm atlas đầu tiên là Địa Ngục Khuyển và trọn vùng bản đồ của nó (mục 11: một bản đồ không được nửa ×1 nửa ×3).
  - Nhóm chưa chuyển vẫn vẽ bằng code theo số liệu mục 1-7 (giữ nhất quán, luật 0.4). Mục nào thêm hình **mới** cho một nhóm đã bắt đầu chuyển (quái từ GĐ1, ninja/NPC, thú, nền theo thứ tự mục 11) thì làm bằng atlas ×3: `art-monsters-199` (quái và boss Thượng Giới là vùng bản đồ mới, làm trọn ×3), `pet-beasts`, `pet-mountup`, `pet-mount-skin`.
  - Hoạt ảnh `art-anim-standard` dùng tên và số khung theo bảng hoạt ảnh mục 11 để bộ khung giữ nguyên khi ninja chuyển sang ×3. Màu bậc `char-tier-outfit` vẫn là `TIER_OUTFIT/TIER_METAL/TIER_TRIM`, sau này thay vào dải chỉ số lúc dựng cache. Vệt vũ khí, hào quang, cut-in vẫn vẽ bằng code lúc chạy (mục 11: hiệu ứng không nướng vào atlas).
- Tạo ảnh không chạy trên máy cá nhân; công cụ cắt/khung xương/thu pixel và ảnh HD để ngoài repo (`~/.local/share/ninja-art/`). Chỉ PNG + JSON atlas và `CREDITS.md` vào repo.

## Mục "blocked"

Chưa có.

## D-08 (2026-10-19) Lớp ×1 vẽ ở độ phân giải ×1; bước test:perf điện thoại @3x đo khi Chromium vẽ bằng GPU

- Sau khi gộp lớp thế giới ×3 (`2e82e8e`), `test:perf` điện thoại @2x tụt còn 49-56 khung/giây (trước 60) dù CPU mỗi khung chỉ 1,5-2,5 ms.
  - Nguyên nhân: nền trời, parallax, địa hình, bóng đêm, sương, ánh sáng đều là hình ×1, nhưng bị vẽ thẳng lên canvas 1688×780. Mỗi lớp toàn màn hình tốn gấp 9 lần so với canvas ×1 cũ.
  - Đo bằng cách tắt từng lớp: nền +9, ánh sáng +11, sương +11 khung/giây.
- Sửa (`game/game.js`):
  - Nền + địa hình + cổng + bóng đêm vẽ vào canvas ×1 rồi phóng một lần không làm mượt. Cùng điểm ảnh như trước vì các lớp này dùng tọa độ nguyên.
  - Khi `s` lẻ, lớp ×1 (nền, hạt, sương, ánh sáng) vẽ thẳng lên màn hình theo `zoom` nguyên. Chỉ thực thể và hiệu ứng ×3 đi qua canvas phụ `k` rồi thu mượt (đúng DESIGN_RULES mục 1).
  - Kết quả @2x: 60 khung/giây ở cả 5 bản đồ, CPU p95 2,5-3,7 ms. @3x: CPU mỗi khung trung bình từ 36-58 ms xuống 6 ms.
- @3x (canvas 2532×1170, canvas phụ 3048×1410) trong Chromium headless vẽ bằng CPU:
  - chỉ còn 28-31 khung/giây;
  - tắt hết lớp bản đồ và hiệu ứng vẫn chỉ 54-60;
  - một lượt phủ toàn màn hình thêm (multiply) tốn ~15 khung/giây.
  - Không cách gộp lớp nào đưa được về ≥ 58 khi máy CPU tự vẽ từng điểm ảnh.
- Điện thoại thật luôn vẽ canvas bằng GPU. Quyết định:
  - bước `8e3` của verify chạy `perf.js` với `GPU=1` (`--enable-gpu-rasterization --ignore-gpu-blocklist --use-angle=metal`), ngưỡng giữ nguyên (≥ 58 khung/giây, CPU ≤ 5 / p95 ≤ 8 ms). Đo được 60 khung/giây, CPU p95 2,1-2,7 ms.
  - Bước máy tính 1280×720 và điện thoại @2x vẫn vẽ bằng CPU (khắt khe hơn), ngưỡng không đổi.
- Đảo lại được: bỏ `GPU: '1'` ở `scripts/verify.js`. Muốn @3x đạt khi vẽ bằng CPU thì phải hạ số lượt phủ toàn màn hình (gộp sương + ánh sáng thành một lượt nhân + một lượt cộng ở ×1), vẫn không đủ theo số đo trên.

