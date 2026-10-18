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

## Mục "blocked"

Chưa có.
