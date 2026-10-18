# Nhật ký tiến độ

Ghi sau mỗi tính năng / mỗi lần đổi mốc ảnh. Mới nhất ở trên.

## 2026-10-18

### Smoke test production (`npm run test:prod`)

- `tests/prod/smoke-prod.js`: bot không cần quyền admin. Kiểm `/api/status` trùng commit main, rồi chạy lần lượt: đăng ký (hoặc đăng nhập tài khoản thử), tạo nhân vật mới, vào game, nhận nhiệm vụ ở Trưởng Làng, mua 5 bình HP, mua đá và cường hóa vũ khí +1, chat, qua cổng ra bãi, đánh quái tới khi lên cấp, cuối cùng xóa nhân vật thử.
- Chạy với https://ninja.iqx.vn (b87858c): 16/16 đạt, "PRODUCTION ĐẠT".

### Dùng nhiều và Tự động nâng cao (yêu cầu của chủ dự án)

- `item-use-many`: gói `useItem { slot, n }` (n tối đa `USE_MANY.max` = 50, chỉ lấy từ chồng ở ô đã chọn). Rương mở n lần, gộp phần thưởng vào một thông báo, dừng khi túi đầy. Đồ ăn và Bí Kíp Nhân Đôi cộng dồn thời gian, trần 24 giờ. Bình thuốc, sách, thức ăn thú vẫn dùng từng món. Hành trang có nút "Dùng nhiều" với hộp chọn số lượng (×5/×10/×20/Tất cả).
- `cmb-auto-plus` (chỉ chạy trên máy khách, lưu trong `S.settings`), gồm các tùy chọn:
  - tự hồi sinh: Tắt / Về làng / Thẻ / Thẻ hoặc lượng, có thời gian chờ 1-30 giây;
  - về làng xong tự tìm đường lại chỗ cũ, tới nơi bật lại auto và săn tiếp quái nhiệm vụ;
  - bỏ qua boss;
  - chỉ đánh loại quái đầu tiên;
  - tự ăn đồ ăn tăng sức;
  - chọn kỹ năng auto được dùng.
- Lệnh admin `/chet` (gục ngay) dùng cho test hồi sinh. `test:e2e` có mục 8 (`ONLY=auto`), đạt cả desktop lẫn 844×390. `npm test` đạt.

### Sửa: hồi sinh về làng không hồi máu

- Máy chủ đã hồi đầy máu nhưng nhánh về làng không gửi lại gói `me`. Máy khách thay `S.me` theo `enterMap` mà không vẽ lại HUD, nên thanh máu vẫn hiện 0. Đã sửa cả hai phía: `Pk.revive` gọi `markMe()`, còn `ui.onEnterMap` gọi `updateStatus()`.
- Test: `tests/features/pk.js` (đơn vị) và bước "đổi bản đồ: thanh máu vẽ lại" trong `test:e2e`.

### Tiếng hiệu ứng tổng hợp WebAudio (D-03)

- Chủ dự án báo tiếng hiệu ứng file nghe rè, ồn. Thay bằng 49 tiếng tổng hợp trong `src/client/js/core/sound.js`, bỏ 45 file `src/client/audio/sfx`.
- `npm run test:sfx` (Chromium, OfflineAudioContext): 49/49 tiếng đạt, đỉnh -3 đến -20 dBFS, năng lượng trên 8 kHz ≤ 1,7%. Độ lớn cân theo nhóm: đòn đánh ~-28 dB RMS, nổ/boss ~-25, nhạc hiệu ~-31, giao diện ~-36.
- `npm run check` kiểm mọi id tiếng trong bảng âm thanh và mọi `sfx('...')` có công thức trong `RECIPES`.

### Hạ tầng kiểm chứng (GĐ0, `dev-verify` đang làm)

- `scripts/verify.js` + `npm run verify`: 6 bước kiểm tĩnh (`--quick` 1,5 giây) + `npm test` + trình duyệt (`test:ui`, `test:e2e` hai cỡ, `test:perf` hai cỡ, `test:visual`, `test:sfx`) với server tạm tự bật + `test:load` + `check:features`.
- `tests/features/verify.js`: 13/13 đạt (gây 9 loại lỗi trên bản sao, `--quick --root` đều trả mã 1 và chỉ đúng chỗ).
- `scripts/check-features.js` (`npm run check:features`): mỗi dòng acceptance của mục "done" phải có bằng chứng `proof` trỏ tới dòng ✔ trong log test. Hiện 148 dòng của 53 mục "done" chưa có `proof`: đang gắn dần, mục nào không chứng minh được thì trả về "todo".
- `test:perf` thêm 30 người chơi khác (bot WebSocket đánh quái cùng bản đồ) và ngưỡng luật 7: máy tính 60 fps, CPU 3,0-4,0 ms/khung (p95 ≤ 4,9); điện thoại 844×390 59,6-60 fps, CPU 3,8-4,3 ms (p95 ≤ 5,1). Đạt.
- `test:load` (`tests/load/load.js`, bot nhẹ `tests/lib/lightbot.js`) + `/api/metrics` có token (`src/server/services/metrics.js`). Lần thử 500 bot × 5 phút: tick p95 ≤ 4,97 ms, lưu chặn tối đa 13,6 ms, heap không tăng. Bài chính thức 60 phút chạy trong `npm run verify`.
- `/api/status` trả `commit` (GIT_SHA → `src/server/REVISION` do `git archive` điền → `git rev-parse`) và `version` dạng `1.0.0+<sha7>`.
- Sửa: `nearNpc` ném lỗi với id NPC là object (gói rác); `h()` bỏ thuộc tính `html` (gán `innerHTML` từ dữ liệu, không nơi nào dùng).

### Chốt commit main (T0.01, T0.02 phần git)

- `main` = 8fac3bb + 4 nhóm (đợt 1-2B, tái cấu trúc, túi đồ, âm thanh) + đồ họa + xu khóa/cân bằng + sửa `nearNpc` + tài liệu thiết kế (D-01). `npm run check` và `npm test` đạt trên cây trước commit. Đã đẩy `origin/main`.
