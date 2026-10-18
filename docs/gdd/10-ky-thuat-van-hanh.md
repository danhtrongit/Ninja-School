# GDD 10 — Kỹ thuật và vận hành

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 10: lưu trữ, sao lưu, nâng cấp dữ liệu, chia khu và băng thông, giám sát, nhật ký kiểm toán, chống gian lận, trang quản trị GM, triển khai `https://ninja.iqx.vn`, đo tải, việc giai đoạn 0 |
| Ngày | 18/10/2026 |
| Id phụ trách | `core-restructure`, `ops-commit-restructure`, `dev-verify`, `dev-test-coverage`, `ops-db-safe-load`, `ops-persist-shard`, `ops-backup`, `ops-crash-guard`, `ops-data-migration`, `ops-audit-log`, `ops-anticheat`, `ops-anticheat-move` (mới), `ops-admin-guard` (mới), `ops-account-security`, `ops-state-culling`, `ops-data-http`, `ops-monitoring`, `ops-gm-panel`, `ops-deploy`, `ops-load-test`, `dev-ci-browser`, `ops-cross-server`; hệ thống đã có: `core-account`, `core-characters`, `core-save`, `core-modules`, `dev-test-harness`, `ops-admin-cmd` |
| Nguồn đã đọc | mã thư mục làm việc ngày 18/10/2026: `src/server/services/{db,http}.js`, `src/server/core/{world,map,gateway,router,modules,player}.js`, `src/server/index.js`, `src/server/modules/{admin,chat,movement}/index.js`, `src/client/js/game/game.js` (`sendMove`), `src/client/index.html`, `tests/smoke.js`, `tests/lib/harness.js`, `tests/features/persistence.js`, `Dockerfile`, `.dockerignore`, `deploy/*`, `.github/workflows/*`, `DEPLOY.md`, `package.json`; kiểm kê `gddwork/audit-risk.md` (số đo gốc), `audit-systems.md`, `audit-data.md`; GDD 01, 02, 03, 05 (các chỗ hẹn với mục này); ghi chú vận hành production của dự án |
| Đo đạc riêng | `gddwork/lab/ops10/shard500.js` (500 người online, lưu theo nhân vật, kết quả `shard500.json`); `gddwork/lab/ops10/speed-probe.js` (vector tăng tốc bằng dồn gói `move`, kết quả `speed-probe.json`); kiểm `Router` bằng `node -e`; `npm test` chạy lại lúc viết: 376 ✔, `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`; `npm run check`: `✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng` |
| Máy đo | Apple M1 Pro, Node v24.21.0, SSD. Máy chủ thật (VPS 1 vCPU, Docker) quy ước **chậm gấp 2** (thời gian); bộ nhớ giữ nguyên |
| Quy ước | "đã có" = có trong mã thư mục làm việc và có kiểm thử/lệnh chứng minh. Nội dung nhánh `feat/bag`, `feat/audio` đã nằm trong bản stage, vẫn tính "đã làm, chờ gộp". `specs/`, `content/`, `gddwork/` nằm trong `scratchpad/` của phiên thiết kế |

Quy tắc đọc: chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 16. Các ADR nháp `ADR-R-1` đến `ADR-R-6` của `audit-risk.md` được chốt và đánh số lại ở đây (`ADR-R-3` kênh bản đồ đã chốt thành `ADR-05d-1` ở `05-he-thong-pve.md`; `ADR-R-6` âm thanh đã chốt thành `ADR-01-1`). Mục này không đặt tên nội dung trò chơi nào; mọi chữ người chơi thấy (thông báo bảo trì, khóa tài khoản) là tiếng Việt có dấu, giọng NPC "ta - ngươi" chỉ dùng trong hội thoại NPC, không dùng cho thông báo hệ thống.

---

## 0. Tóm tắt

| Id | Tên | Trụ cột | Mức | Trạng thái | GĐ | Cỡ | Mục |
|---|---|---|---|---|---|---|---|
| `core-modules` | Khung module server, bảng hành động, móc, cổng WebSocket | P5 | Must | done | 0 | L | 1 |
| `core-account` | Tài khoản, token, giới hạn thử sai/tạo theo IP | P5, P2 | Must | done | 0 | M | 1 |
| `core-characters` | Tạo/xóa/chọn nhân vật, 3 nhân vật/tài khoản | P2 | Must | done | 0 | S | 1 |
| `core-save` | Lưu, tải lại tiến trình bằng JSON | P5 | Must | done | 0 | M | 1 |
| `dev-test-harness` | `npm test`, `npm run check`, `tools/shot.js`, `test:ui/e2e/perf` | P5 | Must | done | 0 | L | 1 |
| `ops-admin-cmd` | Lệnh quản trị qua chat | P5 | Must | done | 0 | M | 1 |
| `core-restructure` | Cấu trúc mã `src/` (chưa commit) | P5 | Must | todo | 0 | L | 14.1 |
| `ops-commit-restructure` | Commit tái cấu trúc, gộp `feat/bag`, `feat/audio` | P5 | Must | todo | 0 | M | 14.1 |
| `dev-verify` | `scripts/verify.js` + `npm run verify` | P5, P2 | Must | todo | 0 | M | 14.2 |
| `dev-test-coverage` | Kiểm thử cho hành động còn trống | P5 | Must | todo | 0 | M | 14.3 |
| `ops-admin-guard` (mới) | Khóa quyền admin, nhật ký lệnh tạm | P5 | Must | todo | 0 | S | 9.4 |
| `ops-db-safe-load` | Nạp an toàn, fsync, báo lỗi lưu, khóa thư mục dữ liệu | P5 | Must | todo | 0 | S | 3.1 |
| `ops-backup` | Sao lưu theo tầng, ra ngoài máy, phục hồi | P5 | Must | todo | 0 | M | 4 |
| `ops-persist-shard` | Lưu theo nhân vật, ghi phần bẩn, nhật ký nhóm ghi | P5, P2 | Must | todo | 0 | L | 3.2 |
| `ops-crash-guard` | Bắt lỗi chết người, lưu khẩn cấp, `scrypt` bất đồng bộ | P5, P2 | Must | todo | 0 | S | 3.3 |
| `ops-anticheat-move` (mới) | Ngân sách quãng đường cho gói `move` | P3, P5 | Must | todo | 1 | S | 9.2 |
| `ops-data-migration` | Phiên bản dữ liệu, bước nâng cấp, id khai tử | P5 | Must | todo | 2 | M | 5 |
| `ops-audit-log` | Nhật ký kiểm toán chỉ ghi thêm | P5 | Must | todo | 3 | M | 8 |
| `ops-anticheat` | Lũ gói, dò mật khẩu, băm token, thử mờ, cờ nghi vấn | P5, P3 | Must | todo | 4 | M | 9.3 |
| `ops-state-culling` | Giảm băng thông gói `state` | P2, P4 | Should | todo | 5 | M | 6.2 |
| `ops-data-http` | Gói `data` qua HTTP có băm phiên bản | P2 | Should | todo | 7 | S | 11 |
| `dev-ci-browser` | CI hằng đêm chạy kiểm thử trình duyệt | P2, P5 | Should | todo | 7 | S | 14.4 |
| `ops-monitoring` | `/api/status` + `/api/metrics`, cảnh báo | P5 | Must | todo | 8 | M | 7 |
| `ops-deploy` | Triển khai thống nhất, phát hành, quay lui | P5 | Must | todo | 8 | M | 12 |
| `ops-load-test` | Đo tải 300 người online, ngưỡng 1.0 | P2, P5 | Must | todo | 8 | M | 13 |
| `ops-gm-panel` | Trang quản trị GM | P5, P4 | Should | todo | 8 | L | 10 |
| `ops-account-security` | Đổi mật khẩu, mật khẩu cấp 2, mã khôi phục | P5 | Should | todo | 8 | M | 9.5 |
| `ops-cross-server` | Liên máy chủ | P4 | Won't | todo | 8 | L | 15 |

Năm điều mục này chốt:

1. **Lưu trữ là việc số 1 của giai đoạn 0**, trước mọi tính năng mới: nạp hỏng thì dừng (không chạy rỗng), ghi có fsync, sao lưu không bị xoay mất, rồi lưu theo nhân vật có nhật ký nhóm ghi (ADR-10-1). Vẫn là JSON, vẫn giữ toàn bộ trong RAM ở bản 1.0.
2. **Với 500 người online, cách lưu hiện tại không đứng được**: chặn vòng lặp 0,2-1,2 giây mỗi 15-30 giây và chạm trần bộ nhớ 768 MB (mục 2). Lưu theo nhân vật đo được chặn lớn nhất 18,6 ms, trễ vòng lặp p99 7,5 ms với 500 nhân vật hậu kỳ (mục 2.4).
3. **Mục tiêu phát hành 1.0 là 300 người online trên một tiến trình**; 500 người là mức thử sức chịu (báo cáo, không chặn phát hành). CPU không phải nút thắt; băng thông khi dồn bản đồ mới là nút thắt, xử lý bằng kênh bản đồ (`world-channels`, GDD 05 PvE) và gói `state` gọn (`ops-state-culling`).
4. **Có một lỗ gian lận đo được**: dồn gói `move` cho tốc chạy 471-1.965 px/giây so với 110 px/giây hợp lệ (gấp 4-18 lần). Sửa bằng ngân sách quãng đường ở giai đoạn 1 (`ops-anticheat-move`), không chờ giai đoạn 4.
5. **Production phải chạy đúng thứ đã kiểm thử**: image CI theo SHA commit trên `main`, có `HEALTHCHECK`, chạy không root, giới hạn heap, xoay log, quay lui bằng một lệnh. Node 20 đã hết hỗ trợ (30/04/2026): nâng lên Node 24 LTS (ADR-10-5).

---

## 1. Hiện trạng kỹ thuật (hệ thống đã có)

| Id | Hiện trạng (đã có, kiểm bằng) | Phần cần nâng (id xử lý) |
|---|---|---|
| `core-modules` | `core/router.js`: bảng hành động `Object.create(null)`, trùng tên hoặc handler không phải hàm thì ném lỗi lúc khởi động (kiểm bằng `node -e` ngày 18/10: trùng → ném, `t = 'constructor' / '__proto__' / 'toString'` → không gọi gì); `core/modules.js`: 5 móc tĩnh + 14 móc thế giới; `core/gateway.js`: `ws` ở `/ws`, gói ≤ 16 KB, ≤ 80 gói/giây/kết nối, ping 30 giây, đá phiên trùng tài khoản; 29 module, 70 hành động | lũ gói bị bỏ im lặng (`ops-anticheat`); không kiểm `bufferedAmount` (`ops-state-culling`); gói `data` 119 KB không nén (`ops-data-http`) |
| `core-account` | đăng ký tên 4-16, mật khẩu 6-64, `scrypt` + muối, token 30 ngày (tối đa 6), khóa 1 phút sau 8 lần sai/IP, 10 tài khoản/giờ/IP (`REG_LIMIT`), IP thật lấy phần tử cuối `X-Forwarded-For` theo `TRUST_PROXY`; `tests/features/account.js`, `persistence.js` | token lưu nguyên văn, dò mật khẩu từ nhiều IP (`ops-anticheat`); `scryptSync` chặn luồng ~30 ms (`ops-crash-guard`); đổi mật khẩu, mật khẩu cấp 2 (`ops-account-security`) |
| `core-characters` | 6 phái × 2 giới, tên 3-12 ký tự, tối đa 3/tài khoản, xóa phải gõ lại tên, móc `charDeleted`; `tests/features/account.js` | đổi tên (`char-rename`, GDD 05 thú-ngoại hình) phụ thuộc `ops-persist-shard` |
| `core-save` | `services/db.js`: 4 file JSON (`accounts, characters, clans, meta`) nạp toàn bộ vào RAM, ghi tmp rồi `rename`; `world.saveAll` 30 giây + `db.save` 15 giây khi `dirty`; sao lưu 12 mốc; `tests/features/persistence.js` (đăng nhập lại, khởi động lại từ file) | toàn bộ mục 2-5 |
| `dev-test-harness` | `tests/smoke.js` (376 kiểm tra, ~188 giây, server tạm cổng 3900-3989, `DATA_DIR` tạm), `tools/check-data.js`, `tools/shot.js`, `tests/e2e/{e2e,ui-multiplayer,perf}.js`; CI chạy `check` + `test` | lệnh một chạm (`dev-verify`), kiểm thử còn trống (`dev-test-coverage`), CI trình duyệt (`dev-ci-browser`) |
| `ops-admin-cmd` | `/lv /item /hethan /plus /thu /xu /luong /tp /boss /bosshp /event /all /kick /mobs /mail /code /sukien /arena` cho tài khoản trong `ADMINS` | không nhật ký (`ops-audit-log`), quyền theo tên tài khoản chưa đăng ký bị chiếm được (`ops-admin-guard`), không khóa/cấm chat (`ops-gm-panel`) |

---

## 2. Giới hạn lưu JSON khi có 500 người online

### 2.1 Chu kỳ lưu hiện tại

| Sự kiện | Chu kỳ | Nguồn | Ghi gì |
|---|---|---|---|
| `world.saveAll()` | 30 giây, vô điều kiện (cả khi máy chủ trống) | `core/world.js` dòng 34, 269-275 | chép vị trí + `putChar` mọi người online → `db.save()` ghi đủ 4 file |
| `db.save()` khi `db.dirty` | 15 giây | `index.js` dòng 49 | đủ 4 file |
| Sao lưu | 6 giờ + 60 giây sau mỗi lần khởi động | `index.js` dòng 50-51, `db.js` dòng 38-55 | copy 4 file vào `DATA_DIR/backups`, giữ 12 mốc |
| Tắt máy (SIGINT/SIGTERM) | khi tắt | `index.js` dòng 39-48 | `leave` từng người, `saveAll` đồng bộ |
| Sập tiến trình | không có | — | mất ≤ 30 giây tiến độ của người online |

Mỗi lần ghi là **toàn bộ** dữ liệu, đồng bộ trên luồng chính. Chi phí tỉ lệ với **tổng số nhân vật từng tạo**, không phải số người online: ~0,037 ms/nhân vật (dân số trộn 5,8 KB/nhân vật) và ~0,32 ms/nhân vật (hậu kỳ đầy đồ 53,6 KB/nhân vật) trên M1, ~75% là `JSON.stringify`.

### 2.2 Số đo gốc (tóm từ `audit-risk.md` mục 3)

| Dân số | Nhân vật | `characters.json` | Chặn vòng lặp mỗi lần lưu (M1) | RSS đỉnh khi lưu |
|---|---|---|---|---|
| trộn | 500 | 2,8 MB | 21 ms | 114 MB |
| trộn | 2.000 | 11,3 MB | 76 ms | 254 MB |
| trộn | 5.000 | 28,2 MB | 181 ms | 500 MB |
| hậu kỳ | 500 | 26,2 MB | 148 ms | 411 MB |
| hậu kỳ | 2.000 | 104,8 MB | 599 ms | 1.160 MB |
| hậu kỳ | 5.000 | 262,0 MB | 1.682 ms | 1.879 MB |

Trộn = 5% hậu kỳ, 35% giữa game, 60% tài khoản bỏ chơi. Phần RAM tăng thêm khi lưu ≈ 2,9 lần kích thước file (chuỗi JSON 2 byte/ký tự vì có tiếng Việt, cộng Buffer UTF-8).

### 2.3 Kịch bản 500 người online (VPS = M1 × 2, container 768 MB, trần RSS khi lưu 600 MB sau khi chừa ~170 MB cho thế giới và socket)

Số người online đỉnh của game trình duyệt thường bằng 5-10% số nhân vật đã tạo, nên 500 người online tương ứng 5.000-10.000 nhân vật.

| Kịch bản | Tổng nhân vật | Ước lượng file nhân vật | Chặn mỗi lần lưu (VPS) | RSS đỉnh khi lưu | Kết luận |
|---|---|---|---|---|---|
| A. Mở được 1 tháng, 500 online, dân số trộn | 3.000 | ~17 MB | ~220 ms | ~340 MB | khựng 0,2 giây mỗi 15-30 giây, vượt ngưỡng vận hành 100 ms |
| B. Sau 6 tháng, dân số trộn | 6.000 | ~34 MB | ~440 ms | ~580 MB | khựng rõ; chạm trần bộ nhớ ở mỗi lần lưu, một đợt quà lễ hội làm thư phình là OOM |
| C. Máy chủ lâu năm, phần lớn người online là hậu kỳ | 2.000 hậu kỳ + 4.000 bỏ chơi | ~110 MB | ~1.250 ms | ~1.200 MB | **OOM chắc chắn**: Docker giết tiến trình lúc lưu, mất ≤ 30 giây tiến độ mỗi lần, lặp lại |
| D. Chỉ tính 500 người online đều hậu kỳ (đo riêng `shard500.js`, ghi 1 file) | 500 | 30,9 MB | ~480 ms (236-241 ms M1) | ~420 MB | ngay cả khi không có ai offline đã vượt ngưỡng |

Ngưỡng an toàn của cách lưu hiện tại (giữ từ `audit-risk.md` mục 5): chặn ≤ 100 ms đến **~1.300 nhân vật trộn / ~160 nhân vật hậu kỳ**; trần bộ nhớ **~6.000 trộn / ~880 hậu kỳ**; giới hạn chuỗi V8 (536.870.888 ký tự) ~93.000 trộn / ~10.000 hậu kỳ. Băng thông với 500 người rải đều 19 bãi: 4,7 MB/s ra (≈ 38 Mbit/s), mỗi người 9,7 KB/s; CPU tick trung vị 0,11 ms, gửi gói ~5,5% CPU. Kết luận: **500 người online cần `ops-persist-shard` + kênh bản đồ; CPU còn dư**.

### 2.4 Đo phương án lưu theo nhân vật với 500 người online (`gddwork/lab/ops10/shard500.js`)

Mỗi lượt (cách nhau 50 ms) lấy B nhân vật bẩn, `JSON.stringify` đồng bộ, ghi bất đồng bộ tmp + `fsync` + `rename`; đo bằng `monitorEventLoopDelay`.

| Hồ sơ | B | 1 file (đồng bộ, như `db.js`) | Lượt chặn dài nhất | Trễ vòng lặp p99 | Trễ vòng lặp lớn nhất | Xả hết 500 nhân vật |
|---|---|---|---|---|---|---|
| giữa game | 20 | 31 ms | 1,7 ms | 2,6 ms | 26,3 ms | 1,3 s |
| giữa game | 50 | 27 ms | 2,1 ms | 2,4 ms | 4,1 ms | 1,1 s |
| hậu kỳ | 10 | 241 ms | 23,1 ms (lượt đầu, JIT) | 4,7 ms | 38,2 ms | 2,7 s |
| hậu kỳ | 20 | 236 ms | 18,6 ms | 7,5 ms | 12,2 ms | 1,4 s |

Với lịch "mỗi nhân vật online ghi tối đa 1 lần/30 giây", 500 người online chỉ cần ~17 lần ghi/giây (~0,85 lần mỗi tick). Chi phí lưu theo đó tỉ lệ với **số người online**, không theo tổng tài khoản; trên VPS dự kiến chặn ≤ 25 ms/lượt nếu dùng ngân sách thời gian 8 ms/lượt (mục 3.2).

---

## 3. Lưu trữ

### 3.1 `ops-db-safe-load` — Nạp an toàn, ghi bền, báo lỗi lưu

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 0 · S |
| Mục đích | Chặn rủi ro nghiêm trọng nhất (R-03): file JSON hỏng thì máy chủ khởi động với bảng rỗng rồi 30 giây sau ghi đè file thật. Ghi phải bền khi mất điện (R-04), lỗi ghi phải được biết (R-05), hai tiến trình không được dùng chung một `DATA_DIR`. |
| Luồng vận hành | Khởi động: đọc từng file. Thiếu file (`ENOENT`) → dùng giá trị mặc định như nay. Lỗi khác (JSON hỏng, file 0 byte, quyền) → đổi tên file sang `<tên>.corrupt-<YYYYMMDD-HHmmss>`, thử nạp `<tên>.tmp` rồi bản sao lưu mới nhất; vẫn không được → **thoát mã 2** kèm hướng dẫn `node scripts/restore.js --list`. Chỉ khi đặt `FORCE_EMPTY=1` mới chạy rỗng. |
| Quy tắc | (1) Ghi: `openSync(tmp,'w')` → `writeSync` → `fsyncSync` → `closeSync` → `renameSync` → `fsync` thư mục (bỏ qua lỗi `EISDIR/EPERM` trên hệ điều hành không hỗ trợ). Chi phí đo: +5-20%. (2) `db.saveErrors` đếm lỗi liên tiếp, `db.lastSaveAt`, `db.lastSaveMs`, `db.maxSaveMs1h`; ghi thành công thì `saveErrors = 0`. (3) `saveErrors ≥ 1` → in `[ALERT] lưu thất bại` + gửi `notice { kind: 'warn' }` cho admin online; `≥ 3` → gateway từ chối `selectChar` mới với "Máy chủ đang gặp sự cố lưu dữ liệu, vui lòng thử lại sau." (người đang chơi không bị đá). (4) Khóa thư mục: lúc khởi động tạo `DATA_DIR/server.lock` bằng `openSync(lockPath, 'wx')` chứa `pid` và giờ; file đã có mà `pid` còn sống (`process.kill(pid, 0)`) → thoát mã 3; `pid` chết → ghi đè. Xóa khi tắt sạch. (5) `/api/status` thêm `saveErrors` và `ok: false` khi `saveErrors > 0` (phần giám sát đầy đủ ở `ops-monitoring`). |
| Dữ liệu | không đổi `src/shared/data`; thêm file `DATA_DIR/server.lock`, `*.corrupt-*` |
| Gói `{ t }` | không thêm; dùng `notice`, `err` có sẵn |
| Module server, client | `src/server/services/db.js` (`_load`, `_write`, khóa), `src/server/index.js` (thoát mã, lời nhắc), `src/server/core/gateway.js` (chặn `selectChar` khi lỗi lưu); không có cửa sổ, không id DOM mới |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận/nhân bản | ghi đè bằng bảng rỗng là "xóa đồ diện rộng"; khóa thư mục chặn hai tiến trình cùng ghi (nhân đôi hoặc mất tiến độ khi chạy nhầm server thử vào `DATA_DIR` thật) |
| Tiêu chí chấp nhận | (a) `characters.json` = `{"a":` → khởi động thoát mã 2, file gốc còn nguyên dưới tên `.corrupt-*`, không có `characters.json` rỗng mới; (b) cùng tình huống có `characters.json.tmp` hợp lệ → khởi động thành công với dữ liệu trong `.tmp`; (c) `FORCE_EMPTY=1` → khởi động được; (d) hai tiến trình cùng `DATA_DIR` → tiến trình thứ hai thoát mã 3; (e) giả `fs.writeSync` ném lỗi 3 lần → `/api/status` có `saveErrors: 3`, `ok: false`, admin online nhận `notice`, `selectChar` bị từ chối; lần ghi sau thành công → `saveErrors: 0`; (f) `npm test` đạt |
| Kiểm thử | `tests/features/storage.js` (mới): phần đơn vị (`DB` trên thư mục tạm trong `os.tmpdir()`) cho (a)-(c), (e); phần tiến trình con cho (d) dùng `startServer` của `tests/lib/harness.js` với `DATA_DIR` chung |
| Giao opencode | không: logic an toàn dữ liệu, Claude làm hoặc rà từng dòng |

### 3.2 `ops-persist-shard` — Lưu theo nhân vật, ghi phần bẩn, nhật ký nhóm ghi (ADR-10-1)

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5, P2 · Must · GĐ 0 · L |
| Mục đích | Bỏ chi phí lưu tỉ lệ với tổng số nhân vật (R-01, R-02, R-07, R-08) và có ghi nguyên tử nhiều bản ghi (R-06) cho giao dịch, chợ, thư gửi người offline, Rương Gia Bảo (`ADR-05b-2` cần "số thế hệ chung"). |
| Luồng vận hành | Người chơi không thấy khác. Lần đầu khởi động bản mới: thấy `characters.json` mà chưa có `chars/` → tách mỗi nhân vật ra `chars/<khóa>.json`, đổi tên file cũ thành `characters.migrated-<giờ>.json` (giữ lại), ghi `meta.layout = 2`. |
| Bố cục đĩa | `DATA_DIR/chars/<khóa-tên-thường>.json` (tên nhân vật theo `NAME_RE` `[A-Za-z0-9_]{3,12}` nên an toàn làm tên file); `accounts.json`, `clans.json`, `meta.json` giữ một file mỗi loại (nhỏ, ghi bất đồng bộ khi bẩn); `journal/<thế-hệ>.json` cho nhóm ghi; `backups/` (mục 4). |
| Quy tắc ghi thường | (1) `db.touch(key)` đánh dấu bẩn (`key` = tên nhân vật thường, hoặc `'accounts' / 'clans' / 'meta'`); `putChar` tự gọi `touch`. (2) Mọi `db.dirty = true` (26 chỗ, `grep -rn "db.dirty = true" src/server`) đổi sang `db.touch(<đúng bản ghi>)`; giữ thuộc tính `dirty` dạng getter chỉ đọc để mã cũ không vỡ. (3) `world.saveAll` không ghi nữa: chép vị trí và `touch` người online. (4) Một bộ lập lịch duy nhất chạy mỗi tick (50 ms): lấy bản ghi bẩn theo thứ tự cũ nhất trước; mỗi nhân vật online ghi tối đa 1 lần/30 giây trừ khi bị đánh dấu khẩn (`db.touch(key, true)`: tiêu lượng, cường hóa ≥ +10, mở rộng túi, nhận quà thư) thì ghi trong ≤ 1 giây; ngân sách **8 ms stringify mỗi tick** hoặc tối đa 20 bản ghi, phần còn lại sang tick sau. (5) Ghi file bất đồng bộ (`fs.promises`: tmp + `fsync` + `rename`); một bản ghi đang ghi dở thì không ghi chồng (đánh dấu bẩn lại, ghi sau). (6) Ghi lỗi → giữ cờ bẩn, tăng `saveErrors` (mục 3.1). (7) Tắt máy, lỗi chết người: xả hết hàng đợi bằng ghi đồng bộ. |
| Quy tắc nhóm ghi (nguyên tử) | `db.commit(keys, reason)`: dùng sau khi một thao tác đổi nhiều bản ghi trong RAM (giao dịch 2 người, chợ: người mua + người bán + `meta`, thư có quà gửi người offline, nhận mã quà: tài khoản + nhân vật, Gia Bảo: tài khoản + nhân vật, phần thưởng gia tộc). (1) `gen = ++meta.gen`; (2) ghi `journal/<gen>.json` = `{ gen, reason, at, recs: { <key>: <toàn bộ bản ghi> } }` bằng ghi đồng bộ có fsync; (3) ghi từng bản ghi với trường `_gen = gen` (đồng bộ, fsync); (4) xóa file nhật ký. Lúc khởi động: duyệt `journal/*.json` theo `gen` tăng dần, bản ghi nào có `_gen` < `gen` của nhật ký thì ghi lại từ nhật ký, rồi xóa nhật ký. Kích thước thường 2-3 bản ghi (≤ 200 KB), chi phí ước 2-6 ms trên VPS. |
| Bộ nhớ | 1.0 vẫn nạp toàn bộ vào RAM (heap 119 MB ở 5.000 nhân vật trộn). Bước 2 (chỉ khi `heapUsed` > 60% `--max-old-space-size` trong 7 ngày liền, đo bằng `ops-monitoring`): nạp lười nhân vật offline + tệp tóm tắt `index.json` (tên, phái, cấp, EXP, gia tộc, lực chiến) cho xếp hạng; không làm trước khi có số đo. |
| Dữ liệu | không đổi `src/shared/data`; thêm `meta.gen`, `meta.layout`, trường `_gen` trên mỗi bản ghi (bị bỏ qua khi gửi máy khách) |
| Gói `{ t }` | không đổi |
| Module server | `services/db.js` (lớp `DB`: `touch, commit, flushTick, flushAllSync, migrateLayout`), `core/world.js` (`saveAll`, gọi `db.flushTick()` trong `tick`), `index.js` (bỏ bộ hẹn giờ 15 giây), các module sửa bản ghi ngoài người chơi đang thao tác: `mail`, `trade`, `clan`, `friends`, `arena`, `season`, `admin`, `checkin`, sau này `market`, `vault`, `clanwar`; `tests/features/persistence.js` (`reloadTest` đọc thẳng `characters.json`: đổi sang đọc `chars/kiemsi.json` qua hàm `readChar(DATA, name)` mới ở `tests/lib/helpers.js`) |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận/nhân bản | (1) Ghi theo nhân vật mà không có nhóm ghi sẽ **mở lỗ nhân bản**: giao dịch xong, sập trước khi bên B được ghi → A mất đồ trong file nhưng B chưa nhận, hoặc ngược lại thì B có đồ còn A vẫn giữ. Vì vậy mọi thao tác chuyển giá trị giữa hai bản ghi **bắt buộc** gọi `db.commit`; `dev-verify` kiểm tĩnh: file nào trong `src/server/modules/{trade,mail,market,vault,clan,clanwar}` gọi `removeItem`/`gainXu` của hai người khác nhau mà không có `db.commit` trong cùng hàm thì báo lỗi (quy tắc grep đơn giản, xem 14.2). (2) Nhân vật đang online không bao giờ bị nạp lại từ đĩa giữa phiên. |
| Tiêu chí chấp nhận | (a) `persist-bench` dựng lại cho bố cục mới: 5.000 nhân vật hậu kỳ, 200 online, trễ vòng lặp p99 ≤ 10 ms và lượt chặn lớn nhất ≤ 25 ms trên M1; RSS đỉnh khi lưu ≤ RSS nền + 30 MB; (b) 500 nhân vật hậu kỳ cùng bẩn xả hết trong ≤ 3 giây; (c) giết tiến trình (`SIGKILL`) ngay sau bước (3) của một `commit` giao dịch (mô phỏng bằng biến môi trường thử `NS_CRASH_AFTER=commit-rec-1`) → khởi động lại, hai nhân vật khớp nhau (tổng vật phẩm + xu của hai bên trước = sau); (d) dữ liệu một file cũ được tách đúng: số khóa `chars/` = số khóa `characters.json`, từng nhân vật `JSON` giống hệt (trừ `_gen`); (e) `grep -rn "db.dirty = true" src/server` không còn kết quả; (f) `npm test` đạt |
| Kiểm thử | `tests/features/storage.js` (đơn vị: `touch`, ngân sách 8 ms, `commit` + phát lại nhật ký, tách bố cục), `tests/features/persistence.js` (cập nhật), kịch bản sập của `tests/load/crash.js` (mới, chạy tay và trong `ops-load-test`) |
| Giao opencode | không (lõi lưu trữ, chống nhân bản); phần đổi `db.dirty` → `db.touch` cơ học có thể giao sau khi Claude viết xong `DB` |

### 3.3 `ops-crash-guard` — Chống sập, lưu khẩn cấp, băm mật khẩu bất đồng bộ

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5, P2 · Must · GĐ 0 · S |
| Mục đích | Lỗi lập trình trong tick làm sập tiến trình và mất tới 30 giây tiến độ không có log nguyên nhân (R-10); `scryptSync` chặn luồng ~30 ms (M1), 16-33 lần đăng nhập/giây đủ chiếm trọn CPU (R-16). |
| Quy tắc | (1) `process.on('uncaughtException' / 'unhandledRejection')`: ghi một dòng JSON `{ lvl: 'fatal', err, stack, at }` ra stderr, gọi `db.flushAllSync()` (bọc `try`), thoát mã 1 để Docker khởi động lại. Lỗi trong handler một gói đã được bắt ở `gateway.js` (giữ nguyên). (2) Lỗi trong một module ở `tick`/`second`: `world.emit` bọc `try/catch` từng móc, ghi log có tên module, đếm `hookErrors[name]`; một móc lỗi > 100 lần/phút thì tắt móc đó tới khi khởi động lại và báo `[ALERT]`. (3) `DB.hash` dùng `crypto.scrypt` bất đồng bộ (luồng libuv) qua hàng đợi tối đa 4 việc; quá 32 việc chờ thì trả `err { msg: 'Máy chủ đang bận, thử lại sau giây lát.' }`. `register`/`login` trong gateway thành hàm `async`; gói khác của kết nối đó đến trong lúc chờ thì bỏ. |
| Dữ liệu, gói | không đổi |
| Module | `src/server/index.js`, `src/server/core/modules.js` (`call`/`emit` bọc lỗi), `src/server/services/db.js` (`hash`, `checkPassword`, `createAccount` trả `Promise`), `src/server/core/gateway.js` |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận | một gói làm sập máy chủ là cách "quay lui" giao dịch vừa làm; bắt lỗi + lưu khẩn cấp + nhóm ghi (3.2) đóng đường này |
| Tiêu chí chấp nhận | (a) 50 lần đăng nhập mật khẩu đồng thời (bot) không làm tick nào trễ > 50 ms (đo `monitorEventLoopDelay` trong server thử, in ở log khi `NS_DEBUG_LAG=1`); (b) ném lỗi trong móc `second` của module giả (bật bằng `NS_TEST_THROW=second`) → server vẫn chạy, log có tên module; (c) `NS_TEST_THROW=fatal` → tiến trình thoát mã 1, nhân vật bot đang online được ghi (cấp vừa đổi bằng `/lv` còn sau khi khởi động lại); (d) `npm test` đạt |
| Kiểm thử | `tests/features/storage.js` phần tiến trình con; bổ sung bot vào `tests/features/account.js` cho (a) |
| Giao opencode | được, sau khi 3.1 vào `main`; Claude rà phần `async` của gateway |

---

## 4. `ops-backup` — Sao lưu và phục hồi

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 0 · M |
| Mục đích | Hiện sao lưu cùng ổ, 12 mốc, mỗi lần khởi động thêm một mốc: 12 lần redeploy/sập liên tiếp là mất hết lịch sử, hỏng ổ là mất cả hai (R-09). Cần mục tiêu phục hồi rõ ràng. |
| Mục tiêu phục hồi | Sập tiến trình: mất ≤ 30 giây tiến độ thường, ≤ 1 giây với thao tác khẩn (3.2). Hỏng file/lỗi dữ liệu: quay về ≤ 1 giờ. Mất VPS: quay về ≤ 24 giờ. Thời gian phục hồi: ≤ 15 phút từ bản trên máy, ≤ 60 phút dựng VPS mới. |

| Tầng | Khi nào | Giữ | Nơi |
|---|---|---|---|
| Giờ | phút 05 mỗi giờ | 48 bản | `DATA_DIR/backups/hourly/` |
| Ngày | 03:05 giờ Việt Nam | 30 bản | `DATA_DIR/backups/daily/` + ngoài máy |
| Tuần | thứ Hai 03:10 | 12 bản | `DATA_DIR/backups/weekly/` |
| Tháng (ngoài máy) | bản ngày của ngày 1 | 12 bản | kho đối tượng ngoài máy |
| Trước triển khai / trước nâng cấp dữ liệu | `scripts/backup.js --tag pre-<phiên-bản>` từ `redeploy.sh`, và tự động trước khi chạy bước nâng cấp dữ liệu (mục 5) | 10 bản gần nhất | `DATA_DIR/backups/pre/` |

| Mục | Nội dung |
|---|---|
| Quy tắc | (1) Bỏ bản "60 giây sau khởi động"; thay bằng bản `pre-*` do quy trình triển khai gọi. (2) Mỗi bản là một `tar.gz` của `DATA_DIR` trừ `backups/` (gồm `journal/`), tạo bằng tiến trình con `tar` (có sẵn trong ảnh alpine) để không chặn vòng lặp; tên `<tầng>/<YYYYMMDD-HHmm>-<gen>.tgz`. Vì từng file được thay nguyên tử và nhóm ghi có nhật ký, bản chụp luôn nạp được. (3) Sau khi tạo: mở lại bằng `tar -tzf` và kiểm số file; ghi `backups/last.json` `{ at, file, bytes, ok }`. (4) Xoay vòng theo bảng; không bao giờ xóa bản cuối cùng còn tốt của mỗi tầng. (5) Ngoài máy: script phía máy chủ VPS `deploy/backup-offsite.sh` (mẫu trong repo) chạy bằng cron của máy chủ lúc 03:30, đẩy bản ngày mới nhất bằng `rclone` (mã hóa phía khách `rclone crypt`) tới kho đối tượng giá rẻ, giữ 30 bản ngày + 12 bản tháng; ghi giờ đẩy thành công vào `DATA_DIR/backups/offsite.json` để `/api/metrics` đọc. (6) Dung lượng: ước 5-10 lần nhỏ hơn dữ liệu thô; 5.000 nhân vật trộn ≈ 32 MB thô → ~5 MB/bản, 100 bản trên máy ≈ 0,5 GB. |
| Phục hồi | `node scripts/restore.js --list` (liệt kê bản, kích thước, `gen`, kết quả kiểm); `--check <bản>` (giải nén vào thư mục tạm, nạp bằng `DB` + chạy `sanitize` mọi nhân vật trong thế giới giả, báo lỗi); `--apply <bản>` (chỉ chạy khi không có `server.lock` sống; chuyển `DATA_DIR` hiện tại sang `DATA_DIR/../data-before-restore-<giờ>` rồi giải nén); `--char <tên> --from <bản>` (lấy một nhân vật ra `DATA_DIR/restore/<tên>-<giờ>.json` để GM xem và áp qua `ops-gm-panel`, nhân vật phải offline). |
| Diễn tập | đầu mỗi tháng: lấy bản ngày ngoài máy, `--check` trên máy khác, khởi động server thử cổng 3600 với `DATA_DIR` tạm, đăng nhập một nhân vật thật bằng tài khoản quản trị (không sửa gì). Ghi kết quả vào sổ vận hành. |
| Dữ liệu, gói | không đổi `src/shared/data`; không gói mới |
| Module | `src/server/services/db.js` (`backup` gọi `scripts/backup.js` logic chung trong `src/server/services/backup.js` mới), `src/server/index.js` (lịch theo giờ Việt Nam), `scripts/backup.js`, `scripts/restore.js` (mới), `deploy/backup-offsite.sh` (mới), `DEPLOY.md` (mục sao lưu) |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận | `backups/` chứa băm mật khẩu và (trước `ops-anticheat`) token nguyên văn: thư mục quyền `700`, bản ngoài máy luôn mã hóa; không phục vụ qua HTTP (`DATA_DIR` nằm ngoài `src/client`) |
| Tiêu chí chấp nhận | (a) 20 lần khởi động lại liên tiếp vẫn còn bản ngày hôm trước và đủ bản giờ; (b) xoay vòng giả lập 60 ngày (đồng hồ giả) giữ đúng 48/30/12 bản; (c) `restore.js --check` trên bản vừa tạo trả mã 0, trên bản bị cắt cụt trả mã ≠ 0; (d) `--apply` khi server đang chạy bị từ chối; (e) tạo bản sao lưu 5.000 nhân vật trộn không làm trễ vòng lặp > 20 ms (tiến trình con); (f) `npm test` đạt |
| Kiểm thử | `tests/features/backup.js` (mới, đơn vị với đồng hồ giả + thư mục tạm); diễn tập tháng là kiểm tra vận hành |
| Giao opencode | được (đặc tả đóng, kiểm bằng lệnh), sau `ops-db-safe-load`; Claude rà `--apply` |

---

## 5. `ops-data-migration` — Nâng cấp dữ liệu người chơi cũ

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 2 · M |
| Mục đích | Cấp 199, nhiệm vụ chèn dải mới, tiền khóa, băm token, bố cục lưu mới đều đổi dữ liệu đã lưu. Hiện chỉ có `sanitize` chạy **lúc vào game** và nó **xóa im lặng** món có id không còn trong `ITEMS` (`core/player.js`: `c.inv.map((it) => (it && ITEMS[it.id] ? it : null))`): đổi tên một id vật phẩm là mất đồ vĩnh viễn của người chơi. |
| Luồng vận hành | Khởi động → nạp dữ liệu → đọc `meta.v` (phiên bản dữ liệu toàn cục). Nếu `meta.v` < bước mới nhất trong mã: tạo bản sao lưu `pre/pre-migrate-v<từ>-v<đến>`, chạy lần lượt các bước cho **mọi** tài khoản, nhân vật, gia tộc (cả người offline), ghi tất cả, đặt `meta.v`. Nếu `meta.v` > bước mới nhất (chạy bản cũ trên dữ liệu mới, ví dụ quay lui image sai cách) → **thoát mã 4** với lời nhắc phục hồi bản `pre-migrate-*`. |
| Quy tắc bước nâng cấp | File `src/server/services/migrate.js`: `STEPS = [{ v, name, char?(c), acc?(a), clan?(cl), meta?(m) }]`, `v` tăng liên tục từ 1. Mỗi bước: chỉ tiến (không có bước lùi), **tự lặp không hại** (chạy hai lần cho kết quả như một lần), thuần (không gọi `world`, không gửi gói), không xóa giá trị người chơi (vật phẩm, tiền, EXP) mà chuyển đổi hoặc bù. Trường `c.v`, `a.v` ghi bước cuối đã chạy trên bản ghi đó (nhân vật tạo mới nhận `v` mới nhất trong `newChar`). `sanitize` giữ vai trò dọn dữ liệu hỏng, không làm việc của bước nâng cấp. |
| Id ổn định | (1) `src/shared/data/legacy.js` (mới): `ITEM_ALIAS { idCũ: idMới }`, `ITEM_RETIRED { idCũ: { xu } }` (bù xu khi bỏ hẳn), `MAP_ALIAS`, `SKILL_RETIRED { sid: hoàn điểm }`, `QUEST_ALIAS`. (2) `sanitize` gặp id lạ: có alias → đổi id; có retired → bù qua thư hệ thống; không có gì → chuyển món vào `c.lost` (mảng, tối đa 200 món, không hiển thị) và ghi `[WARN]`, **không xóa**. GM xem và trả lại bằng `ops-gm-panel`. (3) `tools/ids-lock.json` (mới, sinh bằng `node tools/check-data.js --lock` mỗi lần phát hành): danh sách id vật phẩm, bản đồ, kỹ năng, nhiệm vụ chính, quái đã phát hành. `npm run check` báo lỗi khi một id trong khóa biến mất mà không có dòng trong `legacy.js`. |
| Các bước dự kiến tới 1.0 | v1 `stamp`: đóng dấu `v` cho dữ liệu hiện có, không đổi gì. v2 `quest-id`: `c.quest.id` theo `content/00-foundation.md` mục 10 (51 nhiệm vụ cũ đóng băng, id `m1`-`m51`). v3 `bound`: trường `xuk` và cờ khóa món theo `specs/bound.md` (giá trị mặc định, không chuyển xu cũ thành xu khóa). v4 `token-hash`: `acc.tokens` → băm `sha256` (`ops-anticheat`). v5 `security`: `acc.sec` rỗng (`ops-account-security`). Bố cục lưu theo nhân vật (3.2) dùng `meta.layout`, không nằm trong `STEPS` vì đổi tầng đĩa chứ không đổi bản ghi. Cấp 199 không cần bước (trần nâng, không trường mới). |
| Định danh nhân vật | 1.0 giữ khóa theo tên; đổi tên đi bằng móc `charRenamed` (`ADR` ở `05-he-thong-thu-ngoai-hinh.md`). Chuyển sang `uid` bất biến để sau 1.0 (Câu hỏi mở Q6). |
| Gói `{ t }` | không đổi; `/api/status` thêm `dataV` (mục 7) |
| Module | `src/server/services/migrate.js` (mới), `src/server/services/db.js` (gọi sau khi nạp), `src/server/core/player.js` (`newChar` đặt `v`, `sanitize` dùng `legacy.js`), `src/shared/data/legacy.js` (mới), `tools/check-data.js` (`--lock`, kiểm khóa), `tools/ids-lock.json` |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận/nhân bản | bước nâng cấp chạy trước khi mở cổng WebSocket, nên không ai thao tác trên dữ liệu đang chuyển; alias không được trỏ hai id cũ vào một món "cao hơn" (kiểm trong `check-data`: id mới phải cùng `type`, cùng `slot`, `lv` không cao hơn) |
| Tiêu chí chấp nhận | (a) bộ mẫu `tests/fixtures/chars/v0-*.json` (nhân vật cấp 1, 60, 120 lấy từ dữ liệu thử, xóa tên thật) nâng lên bước mới nhất, so với `tests/fixtures/chars/expected-*.json` giống hệt; (b) chạy nâng cấp hai lần → kết quả như một lần; (c) nhân vật có món id `w_khong_co` → sau tải món nằm trong `c.lost`, tổng số món (túi + kho + trang bị + `lost`) không đổi; (d) `meta.v` = mới nhất + 1 → khởi động thoát mã 4; (e) xóa một id có trong `tools/ids-lock.json` mà không thêm `legacy.js` → `npm run check` báo lỗi; (f) có bản `pre-migrate-*` sau lần nâng cấp; (g) `npm test` đạt |
| Kiểm thử | `tests/features/migrate.js` (mới, đơn vị), `tests/fixtures/chars/` (mới), `tools/check-data.js` |
| Giao opencode | không cho khung `migrate.js` (Claude); được cho từng bước nâng cấp cụ thể khi có đặc tả và mẫu dữ liệu |

---

## 6. Chia khu bản đồ và băng thông

### 6.1 Tham số chia khu (đặc tả tính năng ở `world-channels`, GDD `05-he-thong-pve.md` mục 8.3, `ADR-05d-1`)

Mục này không đặc tả lại tính năng người chơi thấy; chỉ ghi cơ sở số đo và việc kỹ thuật. Đã chốt ở GDD 05: bãi luyện công tối đa 6 thể hiện `<id>`, `<id>#2` đến `<id>#6`; trần mềm 40, cứng 60; kênh 1 khi có boss sự kiện sống trần cứng 80; kênh ≠ 1 trống 5 phút thì hủy; đổi kênh bằng `chSwitch { ch }` (hồi 10 giây, không trúng đòn 5 giây); làng, trạm, phó bản, lôi đài không chia kênh; mã ngữ nghĩa dùng `map.def.id`, so cùng chỗ dùng thể hiện.

| Người một thể hiện | Băng thông ra cả thể hiện (đo/ngoại suy từ `audit-risk` 3.3, O(n²)) | Mỗi người nhận | Ghi chú |
|---|---|---|---|
| 40 (trần mềm) | ~0,5 MB/s | ~12,7 KB/s | đủ cho 4G yếu (≥ 20 KB/s) |
| 60 (trần cứng) | ~1,1 MB/s | ~19 KB/s | chấp nhận |
| 80 (kênh 1 có boss) | ~2,0 MB/s | ~25 KB/s | cần `ops-state-culling` để về ≤ 15 KB/s |
| 150 (không chia kênh) | 6,8 MB/s (đo) | 46,6 KB/s | không chấp nhận |
| 300 (không chia kênh) | 27,3 MB/s (đo) | 93,3 KB/s | không chấp nhận |

Phần kỹ thuật thuộc mục này: `ops-state-culling` (6.2) là điều kiện trước của `world-channels`; `ops-load-test` (mục 13) kiểm "300 bot dồn một bãi → không kênh nào > 60 người, mỗi kênh ≤ 1 MB/s".

### 6.2 `ops-state-culling` — Gói `state` gọn, có ngưỡng gửi

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P2, P4 · Should · GĐ 5 · M |
| Mục đích | Gói `state` 10 lần/giây gửi mọi người + quái của bản đồ tới mọi người trong bản đồ (`core/map.js` `sendState`): băng thông O(n²) (R-13); máy khách mạng yếu làm hàng đợi gửi phình RAM máy chủ (R-14). |
| Phát hiện khi thiết kế | Bản đồ hiện tại rộng 1.260-2.200 px, nội dung cấp 120-199 dự kiến 1.400-1.600 px; khung nhìn máy tính 1.280 px. **Lọc theo khung nhìn gần như không giảm gì** trên các bản đồ này; đòn bẩy chính là **gửi chênh lệch** và **bỏ trường tĩnh**, còn lọc khung nhìn chỉ bật cho bản đồ rộng ≥ 2.400 px (chiến trường, bản đồ boss thế giới). |
| Quy tắc | (1) **Bỏ trường tĩnh**: `maxHp` của người chơi gửi trong gói `look`/`pinfo` khi đổi, không lặp trong `state` (mỗi dòng người chơi bớt 1 số). (2) **Chênh lệch có khung khóa**: mỗi thể hiện giữ bản `state` trước; gói thường chỉ chứa dòng đổi (`x, y, dir, st, hp, cờ`) và danh sách id rời đi `g`; mỗi 2 giây (20 gói) hoặc khi người chơi vừa vào bản đồ thì gửi khung đầy đủ `{ t: 'state', k: 1, p, m }`. Chuỗi gói vẫn dựng **một lần cho cả thể hiện** (chênh lệch tính trên thể hiện, không theo người nhận), người vừa vào nhận một khung đầy đủ riêng. (3) **Lọc khung nhìn** (chỉ bản đồ `w ≥ 2400`): chia bản đồ thành ô 640 px, mỗi người nhận ô của mình ± 1; chuỗi gói được dựng sẵn cho từng tổ hợp ô (≤ `ceil(w/640)` chuỗi), không dựng theo từng người. Bản đồ nhỏ (`#minimap`) vẫn có chấm người chơi xa nhờ gói `far { p: [[id, x]] }` 1 lần/giây. (4) **Ngưỡng gửi**: `conn.sendRaw` kiểm `ws.bufferedAmount`: > 256 KB thì bỏ gói `state`/`far` (không bỏ gói khác), > 2 MB trong 10 giây liên tục thì ngắt kết nối với `kicked { msg: 'Kết nối quá chậm, vui lòng vào lại.' }`; đếm `dropState` cho giám sát. |
| Dữ liệu | không đổi `src/shared/data`; `DESIGN_RULES.md` mục 10 giữ "gửi trạng thái 10 lần/giây" |
| Gói `{ t }` | S→C `state` thêm `k` (1 = khung đầy đủ), `g` (id rời đi); `far` mới; máy khách cũ không có trong 1.0 vì máy khách luôn tải lại cùng máy chủ (bản đồ import có băm, `services/http.js`) |
| Module, client, DOM | `src/server/core/map.js` (`sendState`), `src/server/core/gateway.js` (`Conn.sendRaw` ngưỡng), `src/server/core/world.js` (gửi khung đầy đủ khi `enterMap`); client `src/client/js/game/game.js` (`onState` gộp chênh lệch, `onFar`), `src/client/js/ui/ui.js` (`drawMinimap` dùng thêm `far`). Không id DOM mới |
| Bố cục điện thoại | không đổi hình; mục tiêu chính là điện thoại 4G |
| Chống gian lận | gói chênh lệch không mang dữ liệu mới nào máy khách chưa thấy; máy khách cố tình không đọc socket chỉ làm chính nó bị ngắt, không phình RAM máy chủ |
| Tiêu chí chấp nhận | (a) `persist-bench --tick` bản mới: 60 người một thể hiện, đánh quái 0,5 giây/lần → mỗi người nhận ≤ 12 KB/s (hiện ~19 KB/s ngoại suy), 80 người ≤ 15 KB/s; (b) tick trung vị không tăng quá 10% so với trước; (c) máy khách giả không đọc socket trong 15 giây bị ngắt, RSS máy chủ tăng ≤ 5 MB; (d) `npm run test:e2e` desktop và `MOBILE=1` in `E2E ĐẠT` và `OK no console errors`; `npm run test:perf` giữ ~60 fps; `npm run test:ui` đạt (hai người thấy nhau đúng vị trí); (e) `npm test` đạt |
| Kiểm thử | `tests/features/netstate.js` (mới: đơn vị cho bộ gộp chênh lệch phía máy chủ và hàm gộp tương ứng chép logic máy khách; bot đo byte), `tests/e2e/*` |
| Giao opencode | không (giao thức lõi); Claude làm, opencode viết kiểm thử theo đặc tả |

---

## 7. `ops-monitoring` — Giám sát

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 8 (phần `saveErrors` đã làm ở GĐ 0 trong 3.1) · M |
| Mục đích | Hiện `/api/status` chỉ có `ok, version, online, accounts` (R-27); sự cố chỉ biết khi người chơi kêu. |
| `/api/status` (công khai, kiểm tra sức khỏe) | `{ ok, version, dataV, online, uptime }`. Bỏ `accounts` khỏi trang công khai (lộ quy mô). `ok: false` (mã HTTP 503) khi một trong: `saveErrors > 0`, tick p95 60 giây > 40 ms, trễ vòng lặp p99 > 200 ms, bản sao lưu giờ cũ hơn 2 giờ, RSS > 90% `mem_limit` (đọc `MEM_LIMIT_MB`). |
| `/api/metrics` (riêng) | Chỉ trả khi có tiêu đề `Authorization: Bearer <METRICS_TOKEN>` (biến môi trường, ≥ 32 ký tự; không đặt thì tắt hẳn, trả 404), so bằng `timingSafeEqual`. Trường: `version, dataV, uptime, online, accounts, chars`, `maps: [[id, ch, người]]` (10 thể hiện đông nhất), `tick { p50, p95, max }` (60 giây), `loopLag { p99, max }` (`monitorEventLoopDelay`), `save { lastAt, lastMs, maxMs1h, errors, queue, journal }`, `backup { lastAt, ok, offsiteAt }`, `mem { rss, heapUsed, heapLimit }`, `ws { conns, bufferedMax, dropState, floodKicks }`, `net { outKBs, inKBs }` (đếm byte trong `Conn`), `auth { fails1m, regs1h, scryptQueue }`, `hooks { <module>: lỗi }`, `cheat { flags1h }`. Đơn vị ms, MB, KB/s; số nguyên. |
| Nhật ký | Mỗi dòng log máy chủ là JSON một dòng `{ at, lvl, src, msg, data }` ra stdout/stderr (`lvl`: `info, warn, error, fatal, alert`), giờ UTC ISO; tiện `grep '"lvl":"alert"'`. Docker xoay log (mục 12). Giữ dòng chữ người đọc được cho hai dòng khởi động hiện có. |
| Cảnh báo | (1) Ngoài máy: dịch vụ kiểm tra từ xa (gói miễn phí) gọi `https://ninja.iqx.vn/api/status` mỗi 1 phút, báo khi 2 lần liền lỗi hoặc `ok: false`. (2) Trong máy chủ: khi chuyển `ok` từ đúng sang sai hoặc có `lvl: 'alert'`, gửi `POST` JSON tới `ALERT_WEBHOOK` (nếu đặt; dùng `fetch` có sẵn của Node, không thư viện), tối đa 1 lần/5 phút mỗi loại cảnh báo; đồng thời `notice` cho admin online. (3) Docker `HEALTHCHECK` (mục 12) khởi động lại container khi `/api/status` không trả lời 3 lần liền. |
| Ngưỡng cảnh báo | lưu lỗi ≥ 1; tick p95 > 40 ms trong 5 phút; trễ vòng lặp max > 1 giây; RSS > 85% giới hạn; sao lưu ngày quá 26 giờ; sao lưu ngoài máy quá 30 giờ; số người online giảm > 50% trong 1 phút (nghi sập mạng); `floodKicks` > 20/giờ; `cheat.flags1h` > 50 |
| Dữ liệu, gói | không đổi `src/shared/data`; không gói WebSocket mới |
| Module | `src/server/services/metrics.js` (mới: bộ đếm, cửa sổ trượt, `snapshot()`), `src/server/services/http.js` (đường `/api/metrics`, mã 503), `src/server/services/log.js` (mới: `log(lvl, src, msg, data)`), `src/server/index.js`, `src/server/core/world.js` (đo tick), `src/server/core/gateway.js` (đếm byte) |
| Bố cục điện thoại | không áp dụng (đọc qua trang GM, mục 10) |
| Chống gian lận | `/api/metrics` không công khai (lộ số đông nhất theo bản đồ giúp kẻ phá tìm nơi tập trung); token so thời gian hằng |
| Tiêu chí chấp nhận | (a) `/api/status` không có trường `accounts`; (b) `/api/metrics` không token → 404 (khi chưa đặt) hoặc 401 (khi đã đặt, sai token); đúng token → đủ các khóa liệt kê, kiểu số; (c) giả lỗi lưu → `/api/status` trả 503 và `ALERT_WEBHOOK` (server HTTP giả trong kiểm thử) nhận đúng 1 `POST` trong 5 phút; (d) đo tick không làm tick trung vị tăng quá 2% (`persist-bench --tick`); (e) `npm test` đạt |
| Kiểm thử | `tests/features/metrics.js` (mới: bot + server HTTP giả nhận webhook) |
| Giao opencode | được (đặc tả đóng); Claude rà phần token |

---

## 8. `ops-audit-log` — Nhật ký kiểm toán

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 3 (cùng chợ, tiền khóa) · M |
| Mục đích | Lệnh admin tạo xu/lượng/vật phẩm không để lại dấu vết (R-26); giao dịch, chợ, thư có quà cần truy vết khi có khiếu nại hoặc nghi nhân bản; GDD 05 PvE/Trang bị dùng nhật ký này để đo kinh tế (trung vị lượng/ngày, xu hút qua ghép đá). |
| Quy tắc | (1) `world.audit.write(kind, data)`: thêm một dòng JSON gồm `at`, `k` và các trường của `data` (gộp bằng `Object.assign({ at, k }, data)`) vào `DATA_DIR/audit/<YYYY-MM-DD>.jsonl` (giờ Việt Nam), chỉ ghi thêm, bộ đệm trong RAM xả mỗi 1 giây bằng `fs.promises.appendFile`; tắt máy/lỗi chết người xả đồng bộ. (2) `world.econ.log(p, kind, n, src)` (hàm đã hẹn ở GDD 05 Trang bị) là lớp mỏng trên `audit.write('econ', { c: tên, cur: kind, n, src, bal })`, chỉ ghi khi `|n| ≥ ngưỡng` (`AUDIT.econMin`: xu 10.000, xu khóa 50.000, lượng 1) và gộp các khoản nhỏ thành tổng theo `src` mỗi 10 phút cho từng nhân vật. (3) Bắt buộc ghi: mọi lệnh admin (`{ k: 'admin', by, cmd, args, target }`, ghi **trước** khi thực hiện), giao dịch (`{ k: 'trade', a, b, itemsA, itemsB, xuA, xuB }`), chợ (`{ k: 'market', id, q, cur, price, s, b }`), thư có quà (`{ k: 'mail', to, from, xu, luong, items }`), nhận mã quà (`{ k: 'code', acc, code }`), cường hóa ≥ +10 (`{ k: 'upgrade', c, item, from, to, ok }`), mở rộng túi, tiêu lượng, khóa/mở khóa tài khoản và mọi thao tác GM (mục 10), cờ nghi vấn (`{ k: 'flag', c, why, v }`, mục 9). Vật phẩm ghi dạng rút gọn `[id, q, r, p]`. (4) Giữ 180 ngày trên máy (nén `gzip` các ngày cũ hơn 7 ngày bằng tiến trình con), đưa vào bản sao lưu ngày. (5) Không ghi mật khẩu, token, nội dung chat riêng. |
| Dữ liệu | `src/shared/data/extras.js` thêm `AUDIT = { econMin: { xu, xuk, luong }, keepDays: 180, gzipAfter: 7 }` (kiểm trong `check-data`) |
| Gói `{ t }` | không gói WebSocket mới; đọc qua `ops-gm-panel` (`/gm/api/audit`) |
| Module | `src/server/services/audit.js` (mới; `expose` qua `world.audit`, `world.econ`), `src/server/modules/admin/index.js` (ghi trước mỗi lệnh), `trade`, `mail`, `smith`, `inventory`, sau này `market`, `vault`; `tools/econ-report.js` (mới: đọc `audit/*.jsonl`, in nguồn/hút theo ngày, trung vị lượng/ngày theo nhân vật hoạt động) |
| Bố cục điện thoại | không áp dụng |
| Chống gian lận/nhân bản | file chỉ ghi thêm, không có API xóa; dòng admin ghi trước khi làm nên lệnh làm sập máy chủ vẫn để dấu vết; `tools/econ-report.js --dupe` dò cùng một món (`id, r, p, gems, plv` giống hệt, cường hóa ≥ +12) xuất hiện ở hai nhân vật mà không có dòng `trade/market/mail` nối giữa hai bên |
| Tiêu chí chấp nhận | (a) bot admin `/xu 100`, `/item hp1 5`, `/mail CungThu 10 0` → đủ 3 dòng `k: 'admin'` có `by`, `cmd`; (b) giao dịch bot A-B → 1 dòng `trade` khớp món và xu; (c) 10.000 lần `econ.log` nhỏ trong 1 giây không làm tick trễ > 5 ms và cho ≤ 1 dòng gộp mỗi nhân vật/10 phút; (d) `node tools/econ-report.js --day <hôm nay>` in bảng nguồn/hút, mã 0; (e) `npm test` đạt |
| Kiểm thử | `tests/features/audit.js` (mới: đơn vị + bot) |
| Giao opencode | được (đặc tả đóng, kiểm bằng lệnh) |

---

## 9. Chống gian lận

### 9.1 Danh sách vector và kiểm soát phía máy chủ

| # | Vector | Kiểm soát hiện có (mã thư mục làm việc) | Lỗ / số đo | Đề xuất | Id |
|---|---|---|---|---|---|
| V1 | Tăng tốc bằng dồn gói `move` nhỏ | mỗi gói cho phép `110 × (1 + spd%) × 1,6 × dt + 30` px (`modules/movement`); máy khách thật gửi ≤ 15 gói/giây (`sendMove` cách 66 ms) | **đo được** (`speed-probe.json`, `dragon_palace`, không bị kéo lại lần nào): 10 gói/s → 471 px/s; 20 → 766; 40 → 1.356; 80 → 1.965 px/s (giới hạn bởi bề rộng bản đồ) so với 110 px/s hợp lệ, do hằng số +30 px mỗi gói | ngân sách quãng đường | `ops-anticheat-move` |
| V2 | Bay/lơ lửng né đòn mặt đất | kiểm độ cao theo vật lý nhảy `JUMP/JUMP2/GRAV`, `AIR_MAX` 2,4 giây | đủ | giữ; đổi vật lý thì sửa cả hai bên (quy tắc CLAUDE.md) | — |
| V3 | Đánh xa hơn tầm, bỏ hồi chiêu, chakra âm | `useSkill` kiểm phái, đã học, hồi chiêu (dung sai 60 ms), cách kỹ năng ≥ 180 ms, chakra, tầm | đủ | thêm vào thử mờ (V5) | — |
| V4 | Số liệu giả trong gói (âm, `NaN`, chuỗi, mảng) | `int()`, `clean()`, `own()` ở từng module | chưa có kiểm thử phủ toàn bộ 70 hành động | thử mờ tự động | `ops-anticheat` |
| V5 | Prototype pollution qua `t` hoặc khóa | bảng hành động không prototype (đã kiểm bằng `node -e`), `own()` | đủ cho `t`; khóa lồng trong gói do từng module | thử mờ có `__proto__`, `constructor` ở mọi trường | `ops-anticheat` |
| V6 | Lũ gói | > 80 gói/giây bị bỏ **im lặng** (`gateway.js`) | không thống kê, không ngắt | đếm, ngắt sau 3 giây liên tiếp vượt, ghi cờ | `ops-anticheat` |
| V7 | Gói quá lớn | `maxPayload` 16 KB | đủ | giữ | — |
| V8 | Dò mật khẩu nhiều IP | khóa 1 phút sau 8 lần sai/IP | không giới hạn theo tài khoản | 20 lần sai/tài khoản/15 phút → khóa đăng nhập mật khẩu tài khoản đó 15 phút (token vẫn dùng được) | `ops-anticheat` |
| V9 | Lộ token qua file sao lưu | token lưu nguyên văn (`db.js` `issueToken`) | chiếm phiên 30 ngày | lưu `sha256(token)`, so `timingSafeEqual` | `ops-anticheat` (bước nâng cấp v4) |
| V10 | Chiếm quyền admin bằng cách đăng ký trước tên trong `ADMINS` | quyền = tên tài khoản có trong `ADMINS` (`modules/chat`) | `ADMINS` nêu tên chưa đăng ký → ai đăng ký trước là admin | khóa quyền | `ops-admin-guard` |
| V11 | Admin in tiền không dấu vết | không | R-26 | nhật ký kiểm toán | `ops-audit-log` |
| V12 | Nhân bản đồ do sập giữa hai lần ghi | hiện ghi toàn bộ một lượt (không lệch giữa nhân vật, nhưng lệch giữa 4 file) | sẽ mở rộng khi lưu theo nhân vật | nhóm ghi có nhật ký | `ops-persist-shard` |
| V13 | Nhân bản qua giao dịch/kho/thư khi mất kết nối | một luồng, giao dịch so khớp từng món lúc chốt, hủy khi rời | đủ | thử mờ + kiểm thử ngắt kết nối giữa giao dịch | `dev-test-coverage` |
| V14 | Làm sập máy chủ để quay lui | lỗi handler được bắt ở `gateway.js` | lỗi trong tick làm sập | bắt lỗi + lưu khẩn cấp | `ops-crash-guard` |
| V15 | Nhiều tài khoản cày quà (mã quà, điểm danh, lôi đài) | 10 tài khoản/giờ/IP; mã quà theo tài khoản; lôi đài giới hạn cặp/ngày | một người nhiều IP vẫn làm được | quà giá trị cao (mã quà có `lv`, thưởng tuần lôi đài) giới hạn thêm theo IP/ngày; cờ khi > 5 nhân vật cùng IP nhận cùng mã | `ops-anticheat` |
| V16 | Bot ngoài chơi thay người | game có tự đánh chính chủ (máy khách) | bot WebSocket ngoài không bị cấm về bản chất | không cấm tự động; cờ nghi vấn khi online > 20 giờ/ngày, nhận EXP/giờ > p99 cùng cấp 3 ngày liền; GM xem trước khi xử | `ops-anticheat` |
| V17 | Rời game để tránh chết trong PK | lôi đài xử thua khi thoát; PK tự do không có | thuộc luật PK | nhân vật ở lại bản đồ 10 giây khi vừa trúng đòn PvP | `pvp-pk` (GDD 05 chiến đấu) |
| V18 | Giả IP qua `X-Forwarded-For` | lấy phần tử cuối theo `TRUST_PROXY` | đủ | giữ; production sau nginx là 1 tầng | — |
| V19 | Dò thư mục qua HTTP | `file.startsWith(root)` | thiếu dấu phân cách: thư mục anh em tên bắt đầu bằng `client` sẽ lọt (hiện không có) | so `root + path.sep` | `ops-anticheat` |
| V20 | XSS qua tên, chat, thư | chữ người chơi qua `h()` (text node) | đủ | thêm vào `dev-verify` kiểm tĩnh `innerHTML` | `dev-verify` |
| V21 | Dò mã quà | khóa thử sai có sẵn (`modules/mail`) | đủ | giữ | — |
| V22 | Đổi giờ máy khách để lấy thưởng theo giờ | mọi lịch dùng giờ máy chủ (giờ Việt Nam) | đủ | giữ | — |

### 9.2 `ops-anticheat-move` (mới, con của `ops-anticheat`) — Ngân sách quãng đường

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P3, P5 · Must · GĐ 1 · S |
| Mục đích | Đóng V1: tăng tốc gấp 4-18 lần làm hỏng công bằng PvP, đua boss, nhiệm vụ hộ tống. Kéo về GĐ 1 (thay vì GĐ 4 của `ops-anticheat`) vì lỗ đã đo được và cách sửa nhỏ. |
| Quy tắc | Mỗi người chơi giữ `p.moveBudget` (px). Mỗi gói `move`: `allow = 110 × (1 + p.moveSpd(now)/100) × 1,25`; `p.moveBudget = min(burst, p.moveBudget + allow × dt)` với `burst = max(60, allow × 0,4)` và `dt` kẹp 0..1,2 giây; nếu `|nx − p.x| > p.moveBudget` thì gửi `pos` kéo về như nay và đặt `p.moveBudget = 0`, ngược lại trừ `|nx − p.x|`. Bỏ hằng số `+30` px mỗi gói. Các chỗ máy chủ tự đặt vị trí (`dash`, đổi bản đồ, `pos`, đẩy lùi) đặt `p.moveGrace` như hiện tại và nạp đầy ngân sách. Đếm `p.movePulls`; > 30 lần/phút → ghi cờ `{ k: 'flag', why: 'move' }` (khi `ops-audit-log` có; trước đó chỉ đếm). |
| Dữ liệu | không đổi `src/shared/data` (hằng số trong module, như `JUMP`) |
| Gói `{ t }` | không đổi (`move` → `pos`) |
| Module | `src/server/modules/movement/index.js` (`move`), `src/server/core/player.js` (khởi tạo `moveBudget`) |
| Bố cục điện thoại | không đổi; mạng điện thoại giật (gói dồn sau khi mất sóng) được che bởi `burst` và `dt` tối đa 1,2 giây |
| Chống gian lận | quãng đi tối đa ≈ 1,25 × tốc hợp lệ + 0,4 giây bù, bất kể tần suất gói |
| Tiêu chí chấp nhận | (a) đơn vị với đồng hồ giả (chép `speed-probe.js` vào kiểm thử): 10/20/40/80 gói/giây, mỗi gói đi tối đa → quãng đi trong 1 giây ≤ 1,25 × 110 + 60 = 198 px với `spd = 0`; (b) máy khách hợp lệ mô phỏng 15 gói/giây, nhiễu thời gian ±40 ms, đổi hướng ngẫu nhiên, 60 giây → 0 lần kéo lại; có thú cưỡi `spd = 40` → 0 lần; (c) mô phỏng mất sóng 1 giây rồi dồn 15 gói → ≤ 1 lần kéo lại; (d) `npm test` đạt (`airTest`, auto đánh trong `combat`), `npm run test:e2e` desktop và `MOBILE=1` đạt (tìm đường xuyên bản đồ không bị kéo lại) |
| Kiểm thử | `tests/features/movement.js` (thêm `moveBudgetUnitTests`), `tests/e2e/e2e.js` |
| Giao opencode | không (logic chống gian lận); kiểm thử đơn vị giao được |

### 9.3 `ops-anticheat` — Lũ gói, dò mật khẩu, token, thử mờ, cờ nghi vấn

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5, P3 · Must · GĐ 4 · M |
| Mục đích | Đóng V4-V6, V8, V9, V15, V16, V19; cho GM bằng chứng thay vì đoán. |
| Quy tắc | (1) Lũ gói: giữ trần 80 gói/giây; giây nào vượt thì `conn.floods++`; 3 giây liên tiếp vượt → `close('Gửi dữ liệu quá nhanh.')`, ghi cờ; đếm `ws.floodKicks`. (2) Đăng nhập: đếm sai theo tài khoản (V8). (3) Token: `acc.tokens` khóa là `sha256(token)` hex; `checkToken` băm rồi tra; bước nâng cấp v4 băm token cũ (người chơi không phải đăng nhập lại). (4) HTTP: `file.startsWith(root + path.sep) || file === root`. (5) Quà nhiều tài khoản (V15): `GIFTCODES` và mã tạm có thêm tùy chọn `ipDaily` (số lần/IP/ngày, mặc định 3 cho mã có `luong > 0`); `conn.ip` đã có. (6) Cờ nghi vấn (V16, V1, V6, V15): `world.audit.write('flag', { who, code, info })` + bộ đếm `cheat.flags1h`; không tự khóa tài khoản, GM xử qua `ops-gm-panel`. (7) Thử mờ: kiểm thử tự động gửi gói lỗi tới **mọi** hành động trong bảng. |
| Dữ liệu | `src/shared/data/extras.js`: `GIFTCODES[*].ipDaily` tùy chọn (kiểm trong `check-data`) |
| Gói `{ t }` | không gói mới; `kicked` có sẵn |
| Module | `src/server/core/gateway.js`, `src/server/services/db.js`, `src/server/services/http.js`, `src/server/modules/mail/index.js` (`ipDaily`), `src/server/services/migrate.js` (bước v4) |
| Bố cục điện thoại | không áp dụng |
| Tiêu chí chấp nhận | (a) bot gửi 200 gói/giây trong 4 giây → bị ngắt, `floodKicks` tăng 1; bot 70 gói/giây trong 60 giây không bị ngắt; (b) 21 lần sai mật khẩu một tài khoản từ 3 IP giả (`TRUST_PROXY` + `X-Forwarded-For` trong kiểm thử) → lần thứ 21 bị từ chối dù mật khẩu đúng, token vẫn vào được; (c) `accounts.json` không còn chuỗi token 48 ký tự hex nào trùng token đã cấp; đăng nhập bằng token cũ sau nâng cấp v4 vẫn được; (d) `GET /../server/index.js` và `/%2e%2e/` trả 403/404; (e) thử mờ: với mỗi hành động trong bảng (lấy tự động từ `src/server/modules/index.js`), gửi 30 gói (số âm, `1e308`, `NaN` dạng chuỗi, mảng, đối tượng `{"__proto__":{"x":1}}`, chuỗi 15 KB) → máy chủ vẫn trả `pong`, xu/lượng/số món của bot không tăng, log máy chủ không có `[ws] Lỗi xử lý`, `({}).x === undefined` trong tiến trình (kiểm qua lệnh admin thử `/selftest`, chỉ có khi `NS_TEST=1`); (f) `npm test` đạt |
| Kiểm thử | `tests/features/fuzz.js` (mới), `tests/features/account.js` (thêm (b), (c)), `tests/features/mail.js` (`ipDaily`) |
| Giao opencode | thử mờ và kiểm thử: được; phần gateway/token: Claude |

### 9.4 `ops-admin-guard` (mới) — Khóa quyền quản trị

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 0 · S |
| Mục đích | Đóng V10 ngay (production đang để `ADMINS` rỗng; lần đầu điền tên là lúc dễ bị chiếm) và giới hạn lệnh kiểm thử ở production. |
| Quy tắc | (1) Lúc khởi động, tên nào trong `ADMINS` chưa có tài khoản → in `[ALERT] ADMINS có tài khoản chưa đăng ký: <tên>` và **cấm đăng ký** tên đó qua gói `register` (trả "Tên tài khoản không hợp lệ."); quản trị viên tạo tài khoản bằng `node scripts/admin-create.js <tên>` (hỏi mật khẩu trên terminal, server phải tắt hoặc chạy với `server.lock` của chính nó). (2) Lệnh chỉ dành kiểm thử (`/hethan`, `/bosshp`, `/thu`, `/plus`, `/lv`) chỉ chạy khi `NS_TEST=1` hoặc `ADMIN_DEV=1`; production dùng `/mail`, `/code`, `/sukien`, `/event`, `/arena`, `/all`, `/kick`, `/boss`, `/tp`, `/item`, `/xu`, `/luong`. (3) Trước khi có `ops-audit-log`: mỗi lệnh admin in một dòng `[ADMIN] <tài khoản> /<lệnh> <tham số>` ra log. |
| Dữ liệu, gói | không đổi |
| Module | `src/server/core/gateway.js` (`register`), `src/server/modules/chat/index.js`, `src/server/modules/admin/index.js`, `src/server/index.js`, `scripts/admin-create.js` (mới), `tests/lib/harness.js` (đặt `NS_TEST=1`) |
| Bố cục điện thoại | không áp dụng |
| Tiêu chí chấp nhận | (a) `ADMINS=chuaco` + bot `register { u: 'chuaco' }` → bị từ chối, log có `[ALERT]`; (b) không có `NS_TEST`: `/lv 50` trả "Lệnh không tồn tại."; `/mail` vẫn chạy; (c) `npm test` đạt (harness đặt `NS_TEST=1`) |
| Kiểm thử | `tests/features/account.js` (thêm (a)), `tests/features/admin.js` (mới, server riêng không `NS_TEST`) |
| Giao opencode | không (quyền hạn); nhỏ, Claude làm trong GĐ 0 |

### 9.5 `ops-account-security` — Đổi mật khẩu, mật khẩu cấp 2, mã khôi phục

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Should · GĐ 8 · M |
| Mục đích | Người chơi tự bảo vệ tài sản khi lộ mật khẩu (dùng chung máy, quán net); không có email nên cần đường khôi phục không cần dịch vụ ngoài. |
| Luồng người chơi | Cài đặt → tab "Bảo mật": (1) Đổi mật khẩu: nhập cũ + mới hai lần → mọi phiên khác bị đăng xuất. (2) Đặt mật khẩu cấp 2 (6 chữ số): khi bật, các thao tác giá trị hỏi mã một lần mỗi 30 phút. (3) Mã khôi phục: bấm "Tạo mã khôi phục" → hiện một lần chuỗi 16 ký tự (chia 4 nhóm), người chơi tự chép; dùng ở màn đăng nhập "Quên mật khẩu" để đặt mật khẩu mới. |
| Quy tắc | Mật khẩu cấp 2 hỏi khi: xác nhận giao dịch, đăng bán/mua trên chợ trên 100.000 xu hoặc 50 lượng, hủy/bán món phẩm chất tím trở lên hoặc cường hóa ≥ +8, gửi thư có đồ, rút Gia Bảo, xóa nhân vật. Sai 5 lần → khóa thao tác giá trị 30 phút. Đổi/tắt mật khẩu cấp 2 cần mật khẩu chính; tắt có hiệu lực sau 72 giờ (chống kẻ chiếm phiên tắt ngay), trong 72 giờ người chơi hủy được bằng mã cũ. Lưu: `acc.sec = { pin: <scrypt>, pinSalt, pinOff: giờ, rec: <scrypt mã khôi phục>, recAt }`; mã khôi phục dùng xong thì vô hiệu. Giới hạn thử `pwRecover`: 5 lần/tài khoản/giờ + giới hạn IP như đăng nhập. |
| Dữ liệu | không đổi `src/shared/data`; `acc.sec` (bước nâng cấp v5) |
| Gói `{ t }` | C→S (sảnh và trong game) `pwChange { old, pw }` → `secResult { ok, msg }`; `pinSet { pw, pin }`, `pinOff { pw }`, `pinUnlock { pin }` → `secResult`, `me.sec { pin: bool, unlockedUntil }`; `recNew { pw }` → `secResult { code }` (chỉ lần này); sảnh `pwRecover { u, code, pw }` → `auth` hoặc `err`. S→C `pinNeed { act }` khi thao tác bị chặn chờ mã |
| Module, cửa sổ, DOM | module mới `src/server/modules/security/index.js` (đăng ký hành động trong game; phần sảnh thêm vào `core/gateway.js`), các module giao dịch/chợ/thư/kho gọi `world.mods.security.need(p, 'trade')`; client `src/client/js/ui/windows/settings.js` (tab `[data-tab=sec]`), `src/client/js/ui/windows/dialog.js` (thêm `askPin()` trả mã hoặc `null`), `src/client/js/main.js` (liên kết "Quên mật khẩu" ở `#screen-login`). Id DOM mới: `#sec-pw-old`, `#sec-pw-new`, `#sec-pw-new2`, `#sec-pin`, `#sec-rec-code`, `#in-rec-code`, `#btn-recover` |
| Bố cục điện thoại | ô nhập mã dùng `inputmode="numeric"`, nút ≥ 44 px; mã khôi phục hiển thị cỡ chữ lớn, có nút "Đã chép" (không dùng clipboard nếu trình duyệt chặn) |
| Chống gian lận | mã cấp 2 và mã khôi phục băm `scrypt` bất đồng bộ; so thời gian hằng; không bao giờ gửi lại cho máy khách; mọi đổi bảo mật ghi `ops-audit-log` (không ghi giá trị) |
| Tiêu chí chấp nhận | (a) `pwChange` đúng → token của phiên khác hết hiệu lực, phiên hiện tại giữ; (b) bật mã cấp 2 → `tradeConfirm` không mã bị chặn và nhận `pinNeed`; sau `pinUnlock` đúng thì qua; 5 lần sai → khóa 30 phút; (c) `pinOff` có hiệu lực sau 72 giờ (đồng hồ giả); (d) `pwRecover` với mã đúng đặt được mật khẩu mới, dùng lại mã bị từ chối; (e) ảnh `tools/shot.js` desktop và `mobile: true` của tab Bảo mật in `OK no console errors`; (f) `npm run test:ui` đạt (giao dịch hai người có mã cấp 2); (g) `npm test` đạt |
| Kiểm thử | `tests/features/security.js` (mới), `tests/e2e/ui-multiplayer.js` (thêm bước mã cấp 2) |
| Giao opencode | phần cửa sổ: được; phần máy chủ: Claude |

---

## 10. `ops-gm-panel` — Trang quản trị GM (ADR-10-4)

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5, P4 · Should · GĐ 8 · L |
| Mục đích | Quản trị chỉ có lệnh chat trên nhân vật admin: không tra người offline, không khóa tài khoản, không cấm chat, không xem kinh tế, không khôi phục (R-25). |
| Vai trò | `gm` (hỗ trợ): tìm, xem nhân vật/tài khoản, cấm chat, đá, xem nhật ký, xem cờ nghi vấn. `admin`: thêm khóa tài khoản, gửi thư quà, mã quà, bật sự kiện/lễ hội, sửa tiền/vật phẩm/cấp (bắt buộc lý do), trả món từ `c.lost`. `owner`: thêm khôi phục nhân vật từ sao lưu, thông báo bảo trì, xem `/api/metrics`. Cấu hình `GM_ROLES=ten1:owner,ten2:gm` (tên tài khoản game). |

| Chức năng | Mô tả | Vai trò tối thiểu |
|---|---|---|
| Tìm kiếm | theo tên nhân vật, tài khoản, IP gần nhất (trong 30 ngày, giữ ở `acc.ips` tối đa 10) | gm |
| Hồ sơ | thông tin, túi, kho, trang bị, thư, gia tộc, lôi đài, `c.lost`, 50 dòng nhật ký gần nhất của nhân vật | gm |
| Cấm chat | 10 phút / 1 giờ / 1 ngày / 7 ngày, lý do bắt buộc; người chơi thấy "Ngươi bị cấm chat đến <giờ>." trong khung chat | gm |
| Khóa tài khoản | thời hạn hoặc vĩnh viễn, lý do; đá phiên đang chơi; đăng nhập trả "Tài khoản bị khóa đến <giờ>. Lý do: <lý do>" | admin |
| Sửa nhân vật | cộng/trừ xu, lượng, vật phẩm, đặt cấp; người online thì đưa vào hàng đợi xử lý ở tick kế tiếp (không sửa giữa tick); người offline sửa bản ghi rồi `db.commit` | admin |
| Thư, mã quà, sự kiện | giao diện cho `/mail`, `/code`, `/sukien`, `/event`, `/arena reward` (gọi cùng hàm của `modules/admin`) | admin |
| Kinh tế | tổng xu, xu khóa, lượng đang lưu hành; nguồn/hút theo ngày (từ `tools/econ-report.js`); trung vị lượng/ngày | admin |
| Nhật ký và cờ | lọc `audit/*.jsonl` theo ngày, loại, nhân vật; danh sách cờ nghi vấn chưa xử, đánh dấu "đã xem" | gm |
| Khôi phục nhân vật | chọn bản sao lưu → xem khác biệt → áp (nhân vật phải offline; bản hiện tại lưu vào `DATA_DIR/restore/`) | owner |
| Bảo trì | thông báo đếm ngược 15/5/1 phút rồi tắt sạch (dùng bởi `redeploy.sh`) | owner |
| Số đo | bảng `/api/metrics` dạng chữ | owner |

| Mục | Nội dung |
|---|---|
| Bảo mật | (1) Tắt mặc định: chỉ bật khi `GM=1`; tắt thì `/gm/*` trả 404. (2) Đăng nhập riêng ở `/gm/` bằng tài khoản game có trong `GM_ROLES` + mật khẩu + mã TOTP 6 số (RFC 6238, HMAC-SHA1 30 giây, cài bằng `node scripts/gm-totp.js <tên>` in khóa base32 để thêm vào ứng dụng xác thực; viết bằng `crypto`, không thư viện) bắt buộc với `admin`, `owner`. (3) Phiên: cookie `HttpOnly; Secure; SameSite=Strict; Path=/gm`, hết hạn sau 30 phút không thao tác, tối đa 12 giờ; mỗi yêu cầu ghi kèm tiêu đề `X-GM-CSRF` khớp giá trị trong phiên. (4) 5 lần đăng nhập sai/IP/15 phút → khóa IP 15 phút. (5) Tùy chọn `GM_ALLOW` (danh sách IP/CIDR) và chặn thêm ở nginx (`location /gm/ { allow <IP quản trị>; deny all; }` viết theo IP thật của quản trị viên). (6) Mọi thao tác ghi nhật ký kiểm toán `{ k: 'gm', by, role, act, target, reason, before, after }` **trước** khi thực hiện; lý do ≥ 5 ký tự. (7) Không có chức năng sửa JSON thô, không đọc mật khẩu/token. (8) Thao tác hủy (khóa vĩnh viễn, trừ đồ, khôi phục) phải gõ lại tên nhân vật. |
| Dữ liệu | `acc.ban = { until, reason, by }`, `acc.mute = { until, reason, by }`, `acc.ips = [[ip, giờ]]` (tối đa 10), `acc.gmTotp` (khóa mã hóa bằng `GM_SECRET`); dọn ở `sanitize` tài khoản (bước nâng cấp kèm) |
| Gói `{ t }` | WebSocket không gói mới (dùng `err`, `kicked`, `chat { ch: 'sys' }`); HTTP JSON: `POST /gm/api/login`, `GET /gm/api/search?q=`, `GET /gm/api/char/:name`, `POST /gm/api/char/:name/edit`, `POST /gm/api/ban`, `POST /gm/api/mute`, `POST /gm/api/mail`, `POST /gm/api/code`, `GET /gm/api/audit?day=&k=&c=`, `GET /gm/api/econ?day=`, `POST /gm/api/restore`, `POST /gm/api/maint`, `GET /gm/api/metrics` |
| Module, client, DOM | module `src/server/modules/gm/index.js` (`init(world)`, `expose: 'gm'`, hàm `http(req, res)`), `src/server/services/http.js` (thêm tham số tùy chọn `routes` cho `createHttpServer`, không đổi tham số cũ), `src/server/index.js` (nối `world.gm.http`), `src/server/core/gateway.js` (kiểm `acc.ban`), `src/server/modules/chat/index.js` (kiểm `acc.mute`); trang tĩnh `src/client/gm/index.html`, `src/client/gm/gm.js`, `src/client/gm/gm.css` (cùng bảng màu sơn mài, font VT323 có sẵn). Id DOM trong trang riêng (không đụng trang game): `#gm-login`, `#gm-search`, `#gm-results`, `#gm-char`, `#gm-audit`, `#gm-econ`, `#gm-maint` |
| Bố cục điện thoại | trang dùng được ở 390 px ngang dọc: danh sách một cột, nút ≥ 44 px, bảng cuộn ngang trong khung riêng (trang không cuộn ngang) |
| Chống gian lận | GM không tạo được giá trị mà không để dấu; `econ-report --gm` liệt kê tổng giá trị GM tạo theo người mỗi ngày; quyền `owner` tối đa 2 tài khoản |
| Tiêu chí chấp nhận | (a) không `GM=1` → `/gm/` và `/gm/api/*` trả 404; (b) đăng nhập sai TOTP với vai `admin` bị từ chối; yêu cầu thiếu `X-GM-CSRF` → 403; (c) cấm chat bot 10 phút → bot gửi chat nhận thông báo cấm, hết hạn (đồng hồ giả) chat lại được; (d) khóa tài khoản → bot đang chơi bị `kicked`, đăng nhập lại nhận đúng câu khóa; (e) sửa xu nhân vật offline → file nhân vật có xu mới, nhật ký có dòng `gm` với `before/after`; (f) khôi phục nhân vật online bị từ chối; (g) ảnh `tools/shot.js` trang `/gm/` desktop và `mobile: true` in `OK no console errors`; (h) `npm test` đạt |
| Kiểm thử | `tests/features/gm.js` (mới: HTTP + bot), ảnh chụp bằng `tools/shot.js` (thêm tham số đường dẫn trang nếu chưa có) |
| Giao opencode | không cho phần xác thực/quyền; giao diện trang `src/client/gm/*` giao được theo danh sách API trên |

---

## 11. `ops-data-http` — Gói dữ liệu tĩnh qua HTTP (ADR-10-3)

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P2 · Should · GĐ 7 · S |
| Mục đích | Gói `data` 119.443 byte (gzip 23.357 byte) gửi **không nén** mỗi lần kết nối (R-15); cấp 199 dự kiến gấp 2-3 lần. Vào lại game trên điện thoại tốn dữ liệu và chậm. |
| Quy tắc | Máy chủ dựng gói một lần lúc khởi động như nay, tính `v = md5(chuỗi).slice(0, 12)`, phục vụ `GET /data.json?v=<v>` với gzip và `Cache-Control: public, max-age=31536000, immutable` (sai `v` → 404). Kết nối WebSocket gửi `{ t: 'data', v, url: '/data.json?v=<v>' }` thay cho gói đầy đủ. Máy khách `fetch(url)` rồi đặt `S.G` như cũ; `fetch` lỗi hoặc quá 8 giây thì gửi `{ t: 'dataFull' }` và máy chủ gửi gói đầy đủ kiểu cũ (giữ đường cũ). Bot kiểm thử (`tests/lib/bot.js`) theo cùng luồng. |
| Dữ liệu, module | `src/server/core/gamedata.js` (trả `{ json, v }`), `src/server/services/http.js` (đường `/data.json`), `src/server/core/gateway.js`, `src/client/js/core/net.js`, `src/client/js/core/store.js`, `tests/lib/bot.js`, `CLAUDE.md` mục Giao thức |
| Gói `{ t }` | S→C `data { v, url }` (gói đầy đủ chỉ khi `dataFull`); C→S `dataFull {}` (chỉ trước khi vào nhân vật, tối đa 1 lần/kết nối) |
| Bố cục điện thoại | màn mở đầu hiện "Đang tải dữ liệu" trong `#overlay-conn` như hiện tại |
| Chống gian lận | dữ liệu tĩnh vốn công khai; `dataFull` giới hạn 1 lần để không thành vector khuếch đại |
| Tiêu chí chấp nhận | (a) lần vào thứ hai cùng phiên bản: không có yêu cầu `/data.json` mới (trình duyệt dùng lưu đệm), byte nhận qua WebSocket trước `chars` ≤ 1 KB; (b) chặn `/data.json` trong Playwright → game vẫn vào được qua `dataFull`; (c) `npm run test:e2e` desktop và `MOBILE=1` in `E2E ĐẠT` và `OK no console errors`; (d) `npm test` đạt |
| Kiểm thử | `tests/features/account.js` (thêm kiểm `v`, `/data.json` gzip), `tests/e2e/e2e.js` (thêm bước chặn) |
| Giao opencode | được (đặc tả đóng); Claude rà `net.js` |

---

## 12. `ops-deploy` — Triển khai `https://ninja.iqx.vn`, phát hành, quay lui

### 12.1 Hiện trạng

| Hạng mục | Hiện trạng | Rủi ro |
|---|---|---|
| Máy chủ | VPS dùng chung với các trang khác của chủ dự án (HestiaCP, nginx giữ cổng 80/443); thông tin truy cập nằm trong ghi chú vận hành, **không ghi IP/khóa vào repo** | sửa nginx sai làm hỏng trang khác |
| Ứng dụng | container `ninja-school` ở `127.0.0.1:3210` (cổng 3000 của máy chủ thuộc ứng dụng khác), thư mục `/srv/ninja-school` (`docker-compose.yml`, `.env` có `ADMINS`/`MOTD`, `data/` dữ liệu người chơi, `app/` mã từ `git archive`, `acme/`) | — |
| nginx | `/etc/nginx/conf.d/ninja-school.conf`, có `map $ninja_conn_upgrade` riêng cho `/ws`; chứng chỉ certbot webroot, tự gia hạn | — |
| DNS | Cloudflare, bản ghi A chỉ DNS (không qua proxy) | `TRUST_PROXY` đúng 1 tầng (nginx) |
| Cách cập nhật | `git archive` → `scp` → `/srv/ninja-school/redeploy.sh` dựng image **trên VPS** | image chạy ≠ image CI đã kiểm thử (R-30) |
| Lần triển khai gần nhất | 18/10/2026 16:20, từ nhánh `checkpoint/sau-tai-cau-truc` (commit gom tạm), có bản sao lưu dữ liệu trước triển khai trong `data/backups/` | **production chạy mã chưa nằm trên `main`**; `ADMINS` đang rỗng |
| Image | `node:20-alpine` (Node 20 hết hỗ trợ 30/04/2026), chạy root, không `HEALTHCHECK`, không giới hạn heap; compose mẫu dùng `latest`, không `mem_limit`, không xoay log (R-28, R-29) | — |

### 12.2 Đích đến

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 8 (bước 1-2 của 12.4 làm ngay ở GĐ 0 cùng `ops-commit-restructure`) · M |
| `Dockerfile` | `FROM node:24-alpine@sha256:<ghim>`; `ENV NODE_ENV=production NODE_OPTIONS=--max-old-space-size=512`; `ARG GIT_SHA` → `ENV GIT_SHA`; `npm ci --omit=dev`; `COPY src ./src` và `COPY scripts ./scripts`; `RUN mkdir -p /data && chown node:node /data`; `USER node`; `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`; `STOPSIGNAL SIGTERM` |
| `/srv/ninja-school/docker-compose.yml` (mẫu đưa vào `deploy/docker-compose.iqx.yml`) | `image: ghcr.io/danhtrongit/ninja-school:${IMAGE_TAG}`; `init: true`; `restart: unless-stopped`; `mem_limit: 768m`; `env_file: .env` (`ADMINS, MOTD, METRICS_TOKEN, ALERT_WEBHOOK, GM, GM_ROLES, GM_SECRET, MEM_LIMIT_MB=768, TRUST_PROXY=1`); `volumes: ./data:/data`; `ports: 127.0.0.1:3210:3000`; `stop_grace_period: 30s` (đủ cho xả lưu); `logging: driver json-file, max-size 10m, max-file 5` |
| `VERSION` | `src/server/index.js` đọc `package.json` `version` + `GIT_SHA` (7 ký tự) thay hằng `'1.0.0'`; `/api/status.version` = `1.0.3+a1b2c3d` |
| CI | `.github/workflows/docker.yml`: `npm run verify` thay `check` + `test`; `node-version: 24`; truyền `GIT_SHA`; đẩy tag `:<sha>`, `:latest`, và `:v<x.y.z>` khi đẩy tag git `v*` |
| `package.json` | `engines.node` `>=22`; thêm `"verify": "node scripts/verify.js"` |

### 12.3 Quy trình phát hành

| Bước | Việc | Kiểm chứng |
|---|---|---|
| 1 | Mọi thay đổi vào `main` qua commit tiếng Việt theo `CLAUDE.md`; không đẩy ảnh chụp, `data/`, file tạm | CI xanh |
| 2 | Chốt phiên bản: `npm version patch` (sửa lỗi) hoặc `minor` (nội dung, tính năng); đẩy tag `v1.x.y` | image `:v1.x.y` có trên GHCR |
| 3 | Kiểm thử trình duyệt trên máy dev với server riêng cổng 3600: `npm run test:e2e` desktop + `MOBILE=1`, `npm run test:ui`, `npm run test:perf` nếu có vẽ mới, `tools/shot.js` desktop + điện thoại | `E2E ĐẠT`, `OK no console errors`, ~60 fps |
| 4 | Có bước nâng cấp dữ liệu mới: chạy `restore.js --check` trên bản ngày production đã kéo về (bản sao mã hóa) với image mới ở cổng 3600 | khởi động được, `dataV` đúng, đăng nhập được một nhân vật thử |
| 5 | Chọn giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam; **tránh** Giờ Vàng 12:00-13:00 và 20:00-22:00, Thủ Hộ Làng 12:00/21:00, Chiến Trường 20:00-20:30, chiến gia tộc 21:25-21:45, Tà Thú giờ chẵn :30-:50, 2 ngày cuối mùa lễ hội; bản vá khẩn được làm ngoài khung nhưng vẫn tránh các giờ trên | lịch `evt-calendar` |
| 6 | Chạy `redeploy.sh v1.x.y` (12.4) | `/api/status.version` đúng, `ok: true` |
| 7 | Theo dõi 30 phút: `/api/metrics` (tick, lưu, RSS), log `alert`, kênh phản hồi người chơi | không cảnh báo |
| 8 | Ghi "Tin mới" (danh sách thay đổi tiếng Việt) vào `MOTD` hoặc thư hệ thống | — |

### 12.4 `redeploy.sh <tag>` (mẫu `deploy/redeploy.sh` trong repo, chạy trên VPS)

1. `docker pull ghcr.io/danhtrongit/ninja-school:<tag>`; lỗi thì dừng, không đụng container đang chạy.
2. Ghi tag đang chạy vào `.env.prev`.
3. Nếu `GM=1`: `curl -X POST 127.0.0.1:3210/gm/api/maint` (đếm ngược 5 phút, có token nội bộ `MAINT_TOKEN`); nếu không: thông báo bằng lệnh `docker exec ninja-school node scripts/announce.js "Bảo trì sau 5 phút"` (script gửi tín hiệu `SIGUSR2` kèm file `DATA_DIR/announce.txt`; máy chủ đọc và `announce`), đợi 5 phút.
4. `docker exec ninja-school node scripts/backup.js --tag pre-<tag>` (bản `pre`, mục 4).
5. Đổi `IMAGE_TAG=<tag>` trong `.env`, `docker compose up -d` (SIGTERM → máy chủ xả lưu, thoát 0).
6. Lặp 60 giây: `curl -fs 127.0.0.1:3210/api/status` có `ok: true` và `version` chứa `<tag>`. Đạt → in "Triển khai xong". Không đạt → bước quay lui tự động.
7. nginx **không đổi** khi triển khai thường; nếu phải sửa: `nginx -t` trước khi `reload`, sau đó kiểm các trang khác trên cùng máy chủ trả 200.

### 12.5 Quay lui

| Tình huống | Cách quay lui | Mất dữ liệu |
|---|---|---|
| Bản mới không lên hoặc `ok: false` trong 60 giây (bước 6) | tự động: `IMAGE_TAG` từ `.env.prev`, `docker compose up -d` | không (bản mới chưa nhận người chơi) |
| Lỗi phát hiện trong 30 phút, **không** có bước nâng cấp dữ liệu | `redeploy.sh <tag-cũ>` | không |
| Lỗi phát hiện trong 30 phút, **có** bước nâng cấp dữ liệu | máy chủ cũ sẽ thoát mã 4 trên dữ liệu mới (mục 5), nên: dừng, `restore.js --apply pre/pre-<tag>`, `redeploy.sh <tag-cũ>`, gửi thư xin lỗi kèm quà bù | tiến độ từ lúc triển khai (≤ 30 phút) |
| Lỗi phát hiện sau 30 phút | sửa tiến (bản vá `v1.x.y+1`), không quay lui dữ liệu | không |
| Bước nâng cấp dữ liệu phá hoại (ví dụ xóa trường) | quy tắc mục 5: bước chỉ thêm/chuyển đổi; trường cũ chỉ bỏ ở **bản phát hành sau** khi bản trước đã ổn định 7 ngày | — |

| Mục | Nội dung |
|---|---|
| Dữ liệu, gói | không đổi |
| File | `Dockerfile`, `.dockerignore` (thêm `docs`, `NOTE.md`), `deploy/docker-compose.iqx.yml`, `deploy/redeploy.sh`, `deploy/backup-offsite.sh`, `deploy/nginx-ninja.conf` (mẫu, không chứa IP), `.github/workflows/{ci,docker}.yml`, `package.json`, `src/server/index.js` (`VERSION`, `SIGUSR2`), `scripts/{backup,announce}.js`, `DEPLOY.md` (thêm mục "Production" và sửa khuyến nghị "1 GB RAM là đủ" theo số đo mục 2) |
| Bố cục điện thoại | thông báo bảo trì hiện ở `#toasts` và khung chat, đọc được trên điện thoại |
| Chống gian lận | không root trong container; `.env` quyền `600`; token GHCR chỉ đọc trên VPS; image ghim digest |
| Tiêu chí chấp nhận | (a) `docker inspect` image: `User` = `node`, có `Healthcheck`; (b) `docker compose config` có `mem_limit`, `logging.options.max-size`; (c) `redeploy.sh` với tag không tồn tại không làm gián đoạn container đang chạy; (d) diễn tập trên VPS thử hoặc máy dev (cổng 3600): triển khai tag lỗi cố ý (thoát ngay) → tự quay lui trong ≤ 90 giây; (e) `/api/status.version` khớp SHA của commit trên `main`; (f) không còn đường triển khai bằng `git archive` trong `DEPLOY.md` cho production |
| Kiểm thử | diễn tập vận hành (không thuộc `npm test`); `tests/features/metrics.js` kiểm `version` có SHA khi đặt `GIT_SHA` |
| Giao opencode | không (cần truy cập VPS, người vận hành làm); mẫu file `deploy/*` giao được |

---

## 13. `ops-load-test` — Đo tải, ngưỡng cho 1.0

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P2, P5 · Must · GĐ 8 (chạy lại trước mỗi lễ hội lớn) · M |
| Mục đích | Chứng minh mục tiêu 300 người online/1 tiến trình trên cấu hình giống production, và biết khoảng dư ở 500 người. |
| Công cụ | `tests/load/load.js` (mới): tạo N bot thật bằng `tests/lib/bot.js` từ 1-3 máy (mỗi máy ≤ 200 kết nối), tài khoản `load0001`-`load0500` (máy chủ thử đặt `REG_LIMIT=0`, `ADMINS` gồm các tài khoản bot để `/tp`, `/lv`), đọc `/api/metrics` mỗi 5 giây, in bảng và ghi `load-report.json` ra thư mục chỉ định (không trong repo). `tests/load/seed.js`: dựng `DATA_DIR` với 5.000 nhân vật (dân số trộn) và 1.000 hậu kỳ theo hồ sơ của `persist-bench.js`. `tests/load/crash.js`: kịch bản `SIGKILL` giữa giao dịch (mục 3.2). |
| Máy đo | VPS thử cùng cấu hình production (1 vCPU, container 768 MB, Node 24), không chạy trên VPS production |

| Kịch bản | N | Thời lượng | Ngưỡng đạt (mọi chỉ số trong cửa sổ 60 giây trượt) |
|---|---|---|---|
| K1 rải đều bãi luyện, tự đánh | 300 | 15 phút | tick p95 ≤ 20 ms; trễ vòng lặp p99 ≤ 50 ms; mỗi người nhận trung vị ≤ 15 KB/s, p95 ≤ 25 KB/s; ra tổng ≤ 5 MB/s; RSS ≤ 600 MB; 0 lỗi lưu; 0 `[ws] Lỗi xử lý` |
| K2 dồn một bãi (có `world-channels`) | 300 | 10 phút | không kênh nào > 60 người; mỗi kênh ≤ 1 MB/s; như K1 |
| K3 làng, đứng chat | 150 | 10 phút | như K1; chat thế giới 2 tin/giây tổng |
| K4 bão đăng nhập | 50 đăng nhập mật khẩu/giây trong 30 giây | 1 phút | không tick nào > 50 ms; mọi đăng nhập xong ≤ 10 giây |
| K5 lưu với dữ liệu lớn (`seed.js`) + 300 online | 300 | 15 phút | trễ vòng lặp p99 ≤ 25 ms trong lúc lưu và sao lưu |
| K6 boss sự kiện, kênh 1 trần 80 | 80 + 220 rải | 10 phút | mỗi người ở kênh 1 nhận ≤ 15 KB/s (có `ops-state-culling`) |
| K7 sức chịu (báo cáo, không chặn phát hành) | 500 | 15 phút | ghi lại; nếu tick p95 > 40 ms hoặc RSS > 700 MB thì mở Câu hỏi mở về nâng VPS |

| Mục | Nội dung |
|---|---|
| Dữ liệu, gói | không đổi; dùng gói có sẵn |
| Module | `tests/load/*` (vùng "Hạ tầng kiểm thử"); không sửa mã máy chủ ngoài các biến môi trường đã có |
| Bố cục điện thoại | không áp dụng (đo phía máy chủ); hiệu năng vẽ trên điện thoại do `test:perf` lo |
| Chống gian lận | tài khoản bot chỉ tồn tại trên máy chủ thử |
| Tiêu chí chấp nhận | K1-K6 đạt ngưỡng trên VPS thử, `load-report.json` lưu trong sổ vận hành; K7 có số liệu; GDD 04 hẹn thêm: tick trung vị với 300 người không tăng quá 5% khi bật móc `hitDealt`, 80 phòng tháp đồng thời tick trung vị ≤ 2 ms |
| Kiểm thử | `tests/load/load.js`, `tests/load/seed.js`, `tests/load/crash.js` |
| Giao opencode | được (viết công cụ theo đặc tả); chạy đo và đọc kết quả: Claude/người vận hành |

---

## 14. Giai đoạn 0

### 14.1 `core-restructure`, `ops-commit-restructure` — Chốt tái cấu trúc và gộp nhánh

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 0 · L (`core-restructure`) / M (`ops-commit-restructure`) |
| Hiện trạng | 216 file trong index lúc soạn mục (+35.962/−16.930 dòng; ngày 18-10-2026 đã là 221 file vì thêm `dot3/bound`, `dot3/balance`) gồm cả nội dung `feat/bag` (mở rộng túi bằng lượng 6 lần × 10 ô tối đa 100, hủy nhanh nhiều món `discardMany`, hộp xác nhận `ask()` thay `confirm()`, túi chia trang 40 ô) và `feat/audio` (module `audio`, nhạc nền/tiếng hiệu ứng từ file tự tạo + WebAudio dự phòng, 2 thanh âm lượng, Range cho `.ogg/.m4a`); `npm test` đạt (376 ✔), `npm run check` sạch. Chưa commit; production lúc soạn chạy từ nhánh `checkpoint/sau-tai-cau-truc`, ngày 18-10-2026 đã chuyển sang `checkpoint/am-thanh`. Một agent khác đang ở bước sửa lỗi cuối. |
| Quy tắc | (1) Không commit khi agent khác còn sửa `src/`. (2) Trước commit: `npm test`, `npm run check`, `npm run test:e2e` desktop + `MOBILE=1`, `npm run test:ui`, `npm run test:perf`, ảnh `tools/shot.js` desktop + điện thoại. (3) Commit tiếng Việt, dựng từ chuỗi commit có sẵn (không commit thẳng từ index vì index trộn việc GĐ1/GĐ2), 4 nhóm theo thứ tự: (0) cherry-pick `5a50602` (đợt 1, 2A, 2B, chưa có trên `main`); (1) tái cấu trúc thuần = cây của `920700a` (tên "tạm: ảnh chụp" nhưng thực chứa tái cấu trúc 210 file, không có ảnh), viết lại thông điệp; (2) nội dung túi; (3) nội dung âm thanh (sau khi chốt `ADR-01-1`, file âm thanh có nguồn tái lập + `CREDITS.md`). Không đưa `NOTE.md`, `data/`, ảnh. Nhánh `nf/*`, `dot3/*` giữ riêng, gộp đúng lượt GĐ1/GĐ2 (chỉnh khi ghép). (4) Đẩy `main`, CI xanh, production chuyển sang mã `main` (bước tạm trước `ops-deploy`: vẫn `git archive` nhưng từ `main`). (5) Giữ các nhánh mốc `checkpoint/*`, `snap/bag-base` tới hết GĐ 0. |
| Gói, dữ liệu, DOM | không đổi |
| Tiêu chí chấp nhận | `git status --short src tests tools` rỗng; `git log origin/main` có các commit trên; CI xanh trên `main`; production `version` (sau `ops-deploy`) hoặc nội dung `app/` khớp `main`; `notes` của `ui-bag-expand`, `ui-bag-bulkdrop`, `ui-ask-dialog`, `snd-audio-files` trong `features.json` ghi "đã gộp main" |
| Giao opencode | không (thao tác git, phối hợp agent) |

### 14.2 `dev-verify` — `scripts/verify.js` + `npm run verify`

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5, P2 · Must · GĐ 0 · M |
| Mục đích | Một lệnh duy nhất cho người và worker trước khi báo xong; gom các quy tắc của `CLAUDE.md` mà hiện chỉ dựa vào trí nhớ (id DOM, API công khai, không `confirm()`, client không import `shared/`); đếm sàn nội dung 1.0. |
| Cách dùng | `npm run verify` (đủ), `npm run verify -- --quick` (bỏ `npm test`), `--floor` (thiếu sàn nội dung là lỗi; dùng ở cổng phát hành 1.0), `--browser` (thêm `test:e2e`, `test:ui` khi có Playwright qua `NODE_PATH`), `--json <đường dẫn>` (ghi báo cáo, mặc định không ghi file), `--root <thư mục>` (chạy trên bản sao, dùng cho kiểm thử chính nó). Mã thoát 0 khi mọi bước bắt buộc đạt, 1 khi có lỗi. |

| Bước | Việc | Lỗi khi |
|---|---|---|
| 1 Cú pháp | `node --check` mọi `.js` trong `src/`, `tests/`, `tools/`, `scripts/`; file dưới `src/client/` kiểm bằng `node --input-type=module --check` qua stdin (chạy được cả Node 20 lẫn 24); chạy song song theo số CPU (176 file, tuần tự 6,3 giây trên M1, mục tiêu ≤ 3 giây) | bất kỳ file nào báo lỗi (in đường dẫn + dòng) |
| 2 Dữ liệu | `node tools/check-data.js` | không in dòng bắt đầu `✔ Dữ liệu hợp lệ` hoặc mã ≠ 0 |
| 3 Id DOM dùng chéo | đọc khối "Các id DOM dùng chéo" của `CLAUDE.md`; mỗi `#id` cụ thể phải có `id="<id>"` trong `src/client/index.html` hoặc `id: '<id>'` trong `src/client/js/**`; mỗi mẫu `#st-*`, `#tg-*`, `#chat-*` khớp ≥ 1 id; các bộ chọn `.class-card`, `.char-card .btn.primary`, `[data-tab]`, `[data-act]` xuất hiện trong `src/client/` (hôm nay: đủ 38/38 id có trong `index.html`) | thiếu bất kỳ mục nào |
| 4 API công khai | đọc bảng "API công khai" của `CLAUDE.md`; với mỗi tên xuất, file tương ứng phải có `export function/class/const <tên>` hoặc `export { <tên> }` (danh sách export có chứa `<tên>`) | thiếu tên |
| 5 Quy tắc tĩnh | trong `src/client/js/**`: không `alert(`, `confirm(`, `prompt(`; không `import` đường dẫn chứa `shared/`; URL ngoài chỉ được là font đã ghi trong `CLAUDE.md`; `innerHTML =` chỉ với chuỗi hằng (gán biểu thức thì báo); trong `src/**`: không `var `; mọi file `src/server/**`, `src/shared/**` mở đầu bằng `'use strict'`; module trong `src/server/modules/{trade,mail,market,vault,clan,clanwar}` có hàm chuyển giá trị giữa hai người mà không gọi `db.commit` (bật sau `ops-persist-shard`) | vi phạm (in file:dòng) |
| 6 Sàn nội dung | in bảng: `MAX_LEVEL` / 199; số `MAPS` không có cờ `instance` / 80 (cùng luật [07 mục 0.2](07-the-gioi.md#02-số-liệu-thế-giới), phó bản không tính); số nhiệm vụ chính / 120; số thú cưỡi (`slot === 'mount'`) / 20; số thú cưng (`PETS`) / 25; lễ hội có khóa `fest` trong `SEASONS` thuộc 7 dịp `tet, valentine, 304, he, trungthu, halloween, noel` / 7; tính năng đặc sắc Must/Should (`signature: true`) đã `done` trong `docs/features.json` / 10 (thiếu file hoặc JSON hỏng thì `--floor` báo lỗi, mã 1). Hôm nay: 120, 23, 51, 5, 6, 0 (mùa `trangram2026` chưa có `fest`), 10 | chỉ khi `--floor` |
| 7 Kiểm thử bot | `npm test` (bỏ khi `--quick`) | không có dòng `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` |
| 8 Trình duyệt | `--browser`: `test:e2e` (desktop + `MOBILE=1`), `test:ui` với server riêng do script tự bật ở cổng 3600-3699 và `DATA_DIR` tạm | thiếu `E2E ĐẠT` / `OK no console errors` |

| Mục | Nội dung |
|---|---|
| Dữ liệu | `SEASONS[*].fest` (tùy chọn, enum 7 dịp; `check-data` kiểm giá trị) để đếm lễ hội không phụ thuộc id mùa có năm (`tet2027`, `trangram2026`) |
| Module, file | `scripts/verify.js` (mới), `package.json` (`"verify"`), `docs/features.json` (chỉ đọc), `.github/workflows/{ci,docker}.yml` dùng `npm run verify`, `CLAUDE.md` (mục "Quy trình kiểm tra": thêm `npm run verify`; mục "Cấu trúc thư mục": `scripts/`; bảng vùng "Hạ tầng kiểm thử" thêm `scripts/**`), `tools/check-data.js` (kiểm `fest`) |
| Bố cục điện thoại | không áp dụng |
| Tiêu chí chấp nhận | (a) trên cây hiện tại: `npm run verify -- --quick` mã 0 trong ≤ 15 giây, in bảng 7 bước (bước 7 "bỏ qua"); (b) `npm run verify` mã 0, thời gian ≤ thời gian `npm test` + 15 giây; (c) trên bản sao tạm (`--root`): xóa `id="hud-map"` khỏi `index.html` → mã 1, in `#hud-map`; thêm `confirm(` vào một cửa sổ → mã 1, in file:dòng; thêm lỗi cú pháp vào một file client → mã 1; xóa `export function drawNinja` → mã 1; xóa `docs/features.json` rồi chạy `--floor` → mã 1; (d) `--floor` trên cây hiện tại → mã 1 và in đúng 6 dòng thiếu sàn; (e) CI dùng `npm run verify` và xanh |
| Kiểm thử | `tests/features/verify.js` (mới: chép `src/`, `tools/`, `scripts/`, `CLAUDE.md`, `package.json` vào thư mục tạm, gây lỗi, chạy `--quick --root`; không thuộc `npm test` mặc định vì chép tốn thời gian, chạy bằng `node tests/features/verify.js`) |
| Giao opencode | được (đặc tả đóng, kiểm bằng lệnh); Claude rà bước 5 |

### 14.3 `dev-test-coverage` — Kiểm thử cho hành động còn trống

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P5 · Must · GĐ 0 · M |
| Phạm vi | Theo `02-hien-trang.md` mục 5.2 (đã kiểm bằng `grep` trong `tests/`): **gia tộc** `clanInvite, clanAccept, clanLeave, clanKick, clanInfo, clanNotice, clanPromote` + NPC lập tộc → `tests/features/clan.js` (mới, 3 bot: lập, mời, nhận, thăng chức, nhường trưởng tộc, rời, đuổi, giải tán; quyền sai bị từ chối; khóa `__proto__` ở tên tộc); **Tiểu Nhị** NPC `task` (`accept/finish/cancel`, rương mốc 5) → `tests/features/daily.js`; **nhóm** `partyLeave, partyKick` (chuyển trưởng nhóm, giải tán) → `tests/features/social.js`; **PK** `pk` (dưới cấp 10/trong làng bị chặn, điểm hiếu chiến tăng) và `revive` về làng → `tests/features/pk.js` (mới); `resetStats` (đủ/thiếu 20 lượng, hoàn đủ điểm) → `tests/features/skills.js`; `pickup` thủ công, `ping` → `tests/features/movement.js`; `decline`, `friendDel`, `friendList`, `inspect`, `mailRead` → file tính năng tương ứng; cường hóa thất bại tụt cấp + Bùa Bảo Hộ → `tests/features/gems.js` (hoặc `smith.js` mới); Giờ Vàng (cấu hình `golden` + ép giờ) → `tests/features/combat.js`; ngắt kết nối giữa giao dịch (V13) → `tests/features/social.js` |
| Quy tắc | theo `CLAUDE.md` mục 3 "Kiểm thử": dùng `ok/sleep` của `tests/lib/harness.js`, `Bot`; gọi trong `tests/smoke.js` đúng chỗ (phần sau dùng nhân vật phần trước để lại); thời gian `npm test` tăng ≤ 60 giây |
| Gói, dữ liệu, DOM | không đổi mã máy chủ; nếu kiểm thử lộ lỗi thì ghi lỗi và giao sửa riêng (không sửa lẫn trong việc viết kiểm thử) |
| Tiêu chí chấp nhận | mọi hành động trong bảng 5.2 của `02-hien-trang.md` có ≥ 1 `ok(` liên quan trong `tests/features/` (kiểm bằng script `grep` đi kèm `scripts/verify.js` bước 6 phần báo cáo phủ, chỉ in); `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`; tổng thời gian ≤ 250 giây trên M1 |
| Kiểm thử | các file nêu trên |
| Giao opencode | được (đặc tả hành vi có sẵn); Claude rà kiểm thử gia tộc |

### 14.4 `dev-ci-browser` — CI hằng đêm cho kiểm thử trình duyệt (GĐ 7)

| Mục | Nội dung |
|---|---|
| Trụ cột, mức, GĐ, cỡ | P2, P5 · Should · GĐ 7 · S |
| Quy tắc | `.github/workflows/nightly.yml`: lịch 02:00 giờ Việt Nam (19:00 UTC) và chạy tay; Node 24; `npm ci`; cài Playwright + Chromium vào thư mục riêng (`npm i --no-save playwright` trong job, không thêm vào `dependencies`), `NODE_PATH` trỏ tới đó; `npm run verify -- --browser`; `npm run test:perf`; tải ảnh lỗi/khung hình làm tệp đính kèm job (giữ 7 ngày); job đỏ thì GitHub gửi thư cho chủ repo |
| Tiêu chí chấp nhận | job chạy xanh 3 đêm liên tiếp trên `main`; cố ý làm hỏng một id DOM ở nhánh thử → job đỏ |
| Giao opencode | được |

---

## 15. `ops-cross-server` — Liên máy chủ (Won't cho 1.0)

Ghép nhiều cụm máy chủ chơi chung (lôi đài liên cụm, boss chung) vượt mục tiêu 300 người online/1 tiến trình và cần hạ tầng nhắn tin giữa tiến trình, định danh toàn cục (`uid`), đồng bộ kinh tế. Từ chối cho 1.0. Khi vượt ~1.500 người online đồng thời (R-18), phương án đầu tiên là **mở cụm mới độc lập** (máy chủ 2, dữ liệu riêng, cùng image), không liên cụm. Làm lại cần ADR mới.

---

## 16. Quyết định kiến trúc (ADR)

### ADR-10-1 — Lưu theo nhân vật, ghi phần bẩn, nhật ký nhóm ghi (chốt `ADR-R-1`)

| Mục | Nội dung |
|---|---|
| Trạng thái | Chấp nhận; làm ở GĐ 0 (`ops-persist-shard`) |
| Bối cảnh | `services/db.js` ghi toàn bộ 4 file 2-4 lần/phút, đồng bộ; chi phí và đỉnh bộ nhớ tỉ lệ tổng số nhân vật (mục 2); 500 người online thì khựng 0,2-1,2 giây và OOM ở máy chủ lâu năm. `CLAUDE.md` ghi "lưu dữ liệu bằng JSON" và "Dữ liệu người chơi nằm ở `DATA_DIR`"; đổi bố cục đĩa là đổi cách lưu. |
| Quyết định | Giữ JSON, giữ toàn bộ trong RAM ở 1.0, giữ API `getChar/putChar/deleteChar/accounts/clans/meta`; đổi bố cục thành `chars/<khóa>.json` + 3 file nhỏ; một bộ lập lịch ngân sách 8 ms/tick; `db.touch` thay `db.dirty = true`; `db.commit` có nhật ký `journal/<gen>.json` cho thao tác nhiều bản ghi; tự tách dữ liệu cũ lần đầu; cập nhật `CLAUDE.md` (mục Dữ liệu, mục "Thêm module": "sửa bản ghi người khác phải dùng `db.touch`/`db.commit`"). |

| Phương án | Chặn vòng lặp (500 online hậu kỳ, M1) | Bộ nhớ khi lưu | Ghi nguyên tử nhiều bản ghi | Thư viện | Công sức | Đánh giá |
|---|---|---|---|---|---|---|
| Giữ nguyên (1 file, ghi toàn bộ) | 236-241 ms (chỉ 500 nhân vật), tăng theo tổng | +2,9 × file | không (4 file rời) | không | 0 | loại: vượt ngưỡng ở mục tiêu |
| 1 file + `worker_threads` stringify | ~0 trên luồng chính | **× 2** (sao chép sang worker) | không | không | 1 ngày | loại: làm OOM sớm hơn |
| **Theo nhân vật + phần bẩn + nhật ký nhóm (chọn)** | lượt lớn nhất 18,6 ms, p99 7,5 ms (đo) | + 1 bản ghi | có (nhật ký) | không | 2-3 ngày | chọn |
| Nhật ký chỉ ghi thêm toàn cục + chụp định kỳ | thấp | thấp | có | không | 4-5 ngày | phức tạp hơn, lợi ích như phương án chọn ở quy mô này |
| SQLite tích hợp (`node:sqlite`) | thấp | thấp | có (giao dịch SQL) | không (Node ≥ 22.5) | 3-5 ngày + chuyển dữ liệu | xem ADR-10-2 |
| SQLite qua `better-sqlite3` | thấp | thấp | có | **thêm thư viện native** | 3-5 ngày + biên dịch trong Docker | loại: phá "không thêm thư viện" |
| Cơ sở dữ liệu ngoài (Postgres) | thấp | thấp | có | thêm driver | 1-2 tuần + vận hành | loại: chi phí vận hành |

| Mục | Nội dung |
|---|---|
| Chi phí | 2-3 ngày công lõi (`services/db.js`, `core/world.js`, `index.js`, 26 chỗ `db.dirty`, kiểm thử tải lại + sập); `tests/features/persistence.js` đổi cách đọc file |
| Lộ trình chuyển | (1) `ops-db-safe-load` + `ops-backup` vào `main`. (2) Viết `DB` mới sau cờ `STORE=shard` (mặc định vẫn một file), chạy `npm test` cả hai chế độ. (3) Chạy `tests/load/seed.js` + `persist-bench` bố cục mới, đạt tiêu chí 3.2. (4) Đổi mặc định sang `shard`; lần khởi động đầu tự tách và giữ `characters.migrated-*.json`. (5) Một bản phát hành sau (≥ 7 ngày ổn định) bỏ mã ghi một file; `restore.js` vẫn đọc được bản sao lưu một file cũ. Quay lui trong bước 4: dừng, đổi `STORE=single`, máy chủ ghép `chars/` lại thành `characters.json` (`scripts/restore.js --merge`). |
| Hệ quả | Chi phí lưu tỉ lệ số người online; hàng chục nghìn file nhỏ (cần inode, sao lưu bằng `tar`); mọi tính năng chuyển giá trị giữa người chơi phải dùng `db.commit` (kiểm trong `dev-verify`); mở đường cho Gia Bảo (`ADR-05b-2`), đổi tên nhân vật (`char-rename`). |

### ADR-10-2 — SQLite tích hợp của Node: không làm ở 1.0, có điều kiện kích hoạt

| Mục | Nội dung |
|---|---|
| Trạng thái | Từ chối cho 1.0; xem lại khi chạm điều kiện |
| Bối cảnh | Truy vấn lớn (tra cứu GM theo IP, chợ ký gửi nhiều tin, xếp hạng toàn máy chủ) và quy mô > 50.000 nhân vật khó với JSON trong RAM. |
| Quyết định | Ở lại với ADR-10-1. Kích hoạt đánh giá lại khi một trong: tổng nhân vật > 50.000; heap > 60% giới hạn trong 7 ngày dù đã nạp lười; một truy vấn GM/chợ > 50 ms trên luồng chính. Khi kích hoạt: dùng `node:sqlite` (không thư viện ngoài) với bảng `recs(key PRIMARY KEY, kind, data TEXT, gen, updated)`, giữ API `DB` như ADR-10-1, sao lưu bằng `VACUUM INTO`. |
| Phá quy tắc | "lưu dữ liệu bằng JSON" (dữ liệu vẫn là chuỗi JSON trong cột, nhưng file không còn đọc bằng mắt); mức ổn định của `node:sqlite` theo phiên bản Node phải được kiểm lại lúc kích hoạt |
| Phương án khác | như bảng ADR-10-1 |
| Chi phí | 3-5 ngày + chuyển dữ liệu + công cụ phục hồi mới |
| Hệ quả | Ghi giao dịch nhiều bản ghi bằng SQL, truy vấn nhanh; mất khả năng mở dữ liệu bằng trình soạn thảo |

### ADR-10-3 — Gói dữ liệu tĩnh qua HTTP có băm phiên bản (chốt `ADR-R-4`)

| Mục | Nội dung |
|---|---|
| Trạng thái | Chấp nhận; GĐ 7 (`ops-data-http`) |
| Bối cảnh | `CLAUDE.md` mục Giao thức: "Lúc kết nối, server gửi gói `data`". Gói 119 KB không nén mỗi lần kết nối, cấp 199 ước 300-400 KB. |
| Quyết định | Gói `data` chỉ mang `{ v, url }`; nội dung tải qua `GET /data.json?v=` có gzip và lưu đệm vĩnh viễn; giữ đường gửi đầy đủ qua `dataFull` khi `fetch` lỗi; sửa câu trong `CLAUDE.md` mục Giao thức cùng commit. Máy khách vẫn đọc qua `S.G`, không chép dữ liệu game vào client. |
| Phương án khác | (a) bật `permessage-deflate` của `ws`: giảm ~80% kích thước nhưng tốn CPU + ~300 KB vùng nén mỗi kết nối cho **mọi** gói; (b) giữ nguyên: tốn dữ liệu điện thoại |
| Chi phí | 0,5-1 ngày; `tests/lib/bot.js` đổi theo |
| Hệ quả | Vào lại gần như không tốn dữ liệu; thêm một đường HTTP phải khớp phiên bản với gói WebSocket |

### ADR-10-4 — Trang quản trị GM riêng có API HTTP ghi dữ liệu (chốt `ADR-R-5`)

| Mục | Nội dung |
|---|---|
| Trạng thái | Chấp nhận; GĐ 8 (`ops-gm-panel`) |
| Bối cảnh | Quản trị chỉ có lệnh chat; HTTP hiện chỉ phục vụ tĩnh + `/api/status`. |
| Quyết định | Trang tĩnh `src/client/gm/` (HTML + ES module, không framework, không build) và API `/gm/api/*` trong module `gm`; tắt mặc định (`GM=1`), xác thực riêng (mật khẩu + TOTP), cookie phiên chặt, CSRF, nhật ký mọi thao tác; nginx có thể chặn thêm theo IP. |
| Phá quy tắc | thêm bề mặt HTTP ghi dữ liệu ngoài WebSocket ("client chỉ gửi ý định" vẫn đúng cho người chơi; GM là kênh quản trị riêng); thêm thư mục tĩnh thứ hai trong `src/client/` |
| Phương án khác | (a) thêm lệnh chat `/ban /mute /xem`: rẻ, không tra cứu bảng, khó dùng trên điện thoại, không xem offline đầy đủ; (b) công cụ dòng lệnh sửa JSON trên VPS: nguy hiểm khi máy chủ đang chạy (bị ghi đè sau 30 giây), không nhật ký |
| Chi phí | 3-5 ngày |
| Hệ quả | Hỗ trợ người chơi, xử gian lận, vận hành lễ hội không cần sửa mã; thêm một mục tiêu tấn công nên tắt mặc định và TOTP bắt buộc cho quyền ghi |

### ADR-10-5 — Nâng Node lên 24 LTS

| Mục | Nội dung |
|---|---|
| Trạng thái | Chấp nhận; làm cùng `ops-commit-restructure` (CI) và `ops-deploy` (image) |
| Bối cảnh | Image và CI dùng Node 20, hết hỗ trợ bảo mật từ 30/04/2026; máy dev dùng Node 24.21; `package.json` ghi `>=18`, `DEPLOY.md` ghi "Node.js 18+". |
| Quyết định | `node:24-alpine` ghim digest, CI `node-version: 24`, `engines.node: ">=22"`; `DEPLOY.md`, `README.md` sửa theo. Không dùng tính năng chỉ có ở 24 trong mã máy chủ để vẫn chạy được trên 22 (máy người đóng góp). |
| Phương án khác | Node 22 LTS (hết hỗ trợ 04/2027, phải nâng lần nữa trong năm); giữ Node 20 (không còn bản vá bảo mật) |
| Chi phí | ≤ 0,5 ngày (chạy `npm run verify -- --browser` trên Node 24) |
| Hệ quả | Có `fetch`, `monitorEventLoopDelay`, `node --check` nhận dạng ES module sẵn; lệnh kiểm cú pháp client trong `dev-verify` vẫn dùng `--input-type=module` để chạy cả 22 |

### ADR-10-6 — Thư mục `scripts/` cho công cụ vận hành

| Mục | Nội dung |
|---|---|
| Trạng thái | Chấp nhận; làm cùng `dev-verify` |
| Bối cảnh | `CLAUDE.md` mục "Cấu trúc thư mục" chỉ có `tools/` (kiểm dữ liệu, chụp ảnh) thuộc vùng "Hạ tầng kiểm thử". Các công cụ vận hành (`verify`, `backup`, `restore`, `admin-create`, `gm-totp`, `announce`) chạy cả trong image production, còn `tools/` bị `.dockerignore` loại. |
| Quyết định | Thêm `scripts/` ở gốc repo, CommonJS + `'use strict'`, chỉ dùng mô-đun có sẵn của Node; `Dockerfile` chép `scripts/`; `CLAUDE.md`: thêm `scripts/` vào cấu trúc thư mục và vào vùng "Hạ tầng kiểm thử"; `tools/` giữ công cụ dữ liệu/ảnh/báo cáo (`check-data`, `shot`, `sync-audio`, `econ-report`). |
| Phương án khác | đặt trong `tools/` và bỏ `tools` khỏi `.dockerignore`: đưa cả `shot.js` (cần Playwright) vào image |
| Chi phí | không đáng kể |
| Hệ quả | Một nơi rõ ràng cho lệnh vận hành; worker biết file nào chạy trong production |

---

## 17. Lộ trình và phụ thuộc

| GĐ | Thứ tự | Id | Phụ thuộc | Ai làm |
|---|---|---|---|---|
| 0 | 1 | `ops-commit-restructure` (+ `core-restructure`) | agent sửa lỗi cuối xong | Claude + người |
| 0 | 2 | `ops-admin-guard` | 1 | Claude |
| 0 | 3 | `ops-db-safe-load` | 1 | Claude |
| 0 | 4 | `dev-verify` | 1 | opencode, Claude rà |
| 0 | 5 | `ops-backup` | 3 | opencode, Claude rà |
| 0 | 6 | `dev-test-coverage` | 1 | opencode |
| 0 | 7 | `ops-persist-shard` | 3, 5 | Claude |
| 0 | 8 | `ops-crash-guard` | 3 | opencode, Claude rà |
| 1 | — | `ops-anticheat-move` | — | Claude |
| 2 | — | `ops-data-migration` | `ops-db-safe-load`, `ops-backup`; trước `quest-main-199` | Claude |
| 3 | — | `ops-audit-log` | `ops-commit-restructure`; cùng `eco-bound`, `eco-market` | opencode |
| 4 | — | `ops-anticheat` | `ops-audit-log`, `ops-data-migration` (bước v4) | Claude + opencode (thử mờ) |
| 5 | — | `ops-state-culling` | — ; trước `world-channels`, `pve-worldboss` | Claude |
| 7 | — | `ops-data-http`, `dev-ci-browser` | `dev-verify` | opencode |
| 8 | — | `ops-monitoring` → `ops-deploy` → `ops-account-security` → `ops-gm-panel` → `ops-load-test` | xem registry | người vận hành + Claude |

Ngân sách: các việc Must của mục này ở GĐ 0 chiếm phần lớn GĐ 0 theo đúng mặc định "làm ngay giai đoạn 0, không chờ ngưỡng". Không việc Must nào phụ thuộc việc Should/Could (`ops-load-test` K6 cần `ops-state-culling` (Should) chỉ cho kịch bản boss; nếu `ops-state-culling` trễ thì K6 chuyển sang báo cáo và trần kênh 1 hạ về 60).

---

## 18. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định nếu không ai trả lời |
|---|---|---|
| Q1 | Giới hạn bộ nhớ container production thật là bao nhiêu (giá trị nằm trên VPS, không có trong repo)? | Dùng 768 MB như số đo; ghi `mem_limit: 768m` vào `deploy/docker-compose.iqx.yml` và áp lên VPS ở `ops-deploy` |
| Q2 | Hệ số chậm của VPS so với M1 Pro | ×2; chạy lại `persist-bench.js` và `shard500.js` trên VPS thử giờ thấp điểm ở `ops-load-test`, thay số trong mục 2 |
| Q3 | Tỉ lệ online/tổng nhân vật dùng cho kịch bản 500 người | 5-10%; cập nhật bằng `/api/metrics` (`online`, `chars`) sau 1 tháng chạy thật |
| Q4 | Nơi lưu sao lưu ngoài máy và ai giữ khóa giải mã | Kho đối tượng giá rẻ qua `rclone crypt`; khóa giữ bởi chủ dự án ngoài VPS (trình quản lý mật khẩu), giữ 30 bản ngày + 12 bản tháng |
| Q5 | Chuyển production sang kéo image GHCR theo SHA có cần GHCR công khai không | Giữ gói riêng, VPS đăng nhập GHCR bằng token chỉ đọc; nếu gặp khó thì đặt gói công khai (mã nguồn vốn đã công khai trên GitHub) |
| Q6 | Có chuyển định danh nhân vật sang `uid` bất biến trước 1.0 không | Không; 1.0 giữ khóa theo tên + móc `charRenamed`; `uid` xét sau 1.0 cùng ADR riêng |
| Q7 | Lệnh kiểm thử (`/lv`, `/plus`, `/thu`, `/hethan`, `/bosshp`) có cần dùng ở production để hỗ trợ người chơi không | Không; tắt ở production (`ops-admin-guard`), hỗ trợ đi qua trang GM có lý do và nhật ký |
| Q8 | Giới hạn quà theo IP (`ipDaily`) có làm khó người chơi chung mạng (quán net, ký túc xá) không | Chỉ áp cho mã quà có lượng, 3 lần/IP/ngày; GM tạo được mã riêng không giới hạn IP cho sự kiện cộng đồng |
| Q9 | Kênh cảnh báo (`ALERT_WEBHOOK`) gửi về đâu | Một nhóm chat của chủ dự án nhận webhook JSON; chưa có thì chỉ dùng dịch vụ kiểm tra từ xa + thông báo cho admin online |
| Q10 | Sàn "7 lễ hội" đếm theo khóa nào | Thêm khóa tùy chọn `fest` vào `SEASONS` (enum 7 dịp), `check-data` kiểm, `dev-verify` đếm số dịp khác nhau |
| Q11 | `ops-anticheat-move` kéo về GĐ 1 có vượt ngân sách GĐ 1 không | Không đáng kể (cỡ S); nếu vượt thì làm đầu GĐ 4 trước các việc khác của `ops-anticheat` |
| Q12 | Khung giờ triển khai thường | Ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh mọi giờ sự kiện có lịch; bản vá khẩn được làm ngoài khung |
| Q13 | Mục tiêu 1.0 giữ 300 hay nâng 500 người online | Giữ 300 (GDD 01 Q2); 500 là kịch bản sức chịu K7, chỉ báo cáo |
