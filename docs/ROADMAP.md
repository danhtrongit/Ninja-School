# Lộ trình Ninja School Pixel Online đến bản 1.0

Phiên bản 1.0 của lộ trình, lập ngày 2026-10-18. Đi cùng [`GDD.md`](GDD.md) và sổ tính năng [`features.json`](features.json) (khớp 1-1 với tài liệu này).

## Cách đọc

- 9 giai đoạn (GĐ0-GĐ8) đi lần lượt. Một giai đoạn **ra** khi mọi lệnh ở "Điều kiện ra" đạt; giai đoạn sau chỉ gộp vào `main` khi giai đoạn trước đã ra. Lô của giai đoạn sau được làm trước trong worktree riêng nhưng chỉ gộp đúng lượt.
- Mỗi tính năng có một **mã dòng** `Tg.nn` (g = giai đoạn). Id tính năng chỉ ghi một lần, ở bảng của giai đoạn chứa nó; mọi chỗ khác (lô, phụ thuộc, rủi ro) dùng mã dòng.
- Cột "Phụ thuộc" ghi mã dòng của tính năng phải gộp trước. Trạng thái và tiêu chí chấp nhận đầy đủ nằm trong `features.json` (trường `acceptance`, `tests`, `files`, `notes`).
- Cỡ: S ≈ 1 đơn vị công, M ≈ 2, L ≈ 4 (dùng để tính ngân sách MoSCoW). Người làm: **Opus** là Claude điều phối tự làm; **agent Claude** là agent Claude riêng trong worktree riêng (người dùng đã bỏ opencode/agent-hub ngày 18-10-2026; gộp bằng `git diff | git apply --3way`).
- "Xong" theo `01-tam-nhin.md` mục 5.2: kiểm thử riêng + `npm test` + `npm run check` + ảnh desktop/điện thoại không lỗi console (+ `test:perf` khi vẽ mới) + `DESIGN_RULES.md` cập nhật, tức đạt đủ `acceptance` **trên cây làm việc hiện tại**. Việc đưa mã lên `main` theo dõi riêng bằng T0.01/T0.02; id có tiêu chí "đã commit lên `main`" giữ "chưa xong" tới khi T0.02 xong. Việc làm dở ghi tiến độ trong `notes`.

## Trạng thái thực tế ngày 18-10-2026

- `main` (HEAD `8fac3bb`) còn thiếu commit `5a50602` "Điểm khôi phục: sau đợt 1, 2A, 2B" (43 file, khoảng 16.500 dòng: lôi đài, hộp thư, lễ hội, ngọc, thú cưng, thời trang, bản đồ thế giới, nội tại, Tà Thú; nằm trên nhánh `checkpoint/truoc-tai-cau-truc`), tái cấu trúc, túi đồ (`feat/bag`) và âm thanh (`feat/audio`). Git index của thư mục làm việc có 221 file, gồm tái cấu trúc + túi + âm thanh (mốc `a4b4a0a`) **trộn** với việc GĐ1/GĐ2: màu bậc 12-19, icon 18 kỹ năng cao cấp, 3 theme + 39 biến thể (nhánh `nf/f2`, `nf/f3`, `nf/w1`, mốc `d8161c2`) và xu khóa + cân bằng (`dot3/bound`, `dot3/balance`). Thư mục `src/client/audio/` chưa theo dõi git. Production https://ninja.iqx.vn chạy từ nhánh mốc `checkpoint/am-thanh` (`d8161c2`), không phải từ `main`.
- Đã làm, chưa gộp: mở rộng túi bằng lượng, hủy nhanh, hộp xác nhận `ask()`, túi chia trang; 25 nhạc nền + 45 tiếng hiệu ứng file thật (`src/client/audio`, 47 MB gồm `.ogg` + `.m4a`, ACE-Step MIT + Stable Audio Community License), thanh âm lượng nhạc/hiệu ứng, nhạc tự đổi theo bản đồ, boss, Tà Thú, lôi đài, phó bản, lễ hội; màu nhân vật bậc 12-19; icon 18 kỹ năng cao cấp + vòng thần kỹ; 3 theme bản đồ `swamp`, `starfield`, `jade_peak` + 39 biến thể + nhà trạm (chưa bản đồ nào dùng, chưa vào `THEMES` của `check-data`).
- Đang làm: đợt 3 lô 1 `bound` (xu khóa) ở nhánh `dot3/bound` (`655143d` + `52e230e` "Sửa sau rà soát") và `balance` ở nhánh `dot3/balance` (`ab90718` + `9c6b3c7` "Sửa sau rà soát"). Cả hai đã đưa vào index của thư mục làm việc (`modules/index.js` có `require('./bound')`, `smoke.js` gọi `boundUnit`/`balanceBotTest`, `check-data.js` có khối "Cân bằng", `node tools/balance.js --check` thoát 0), chưa commit `main`; còn `npm test` trên cây gộp, ảnh cổng 3621/3622, rà soát cuối.
- 53 id "xong" được kiểm trên thư mục làm việc ngày 18-10-2026 (9/10 tính năng đặc sắc đã xong chưa có trên `main` 8fac3bb) và kiểm lại sau T0.02.
- Kiểm trên cây hiện tại: `npm run check` đạt (306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng); `npm test` chạy 2 lần: lần 1 hỏng ca "Thỏ Ngọc tự nhặt đồ rơi gần chủ", lần 2 đạt (ca chập chờn, sửa ở lô 0-D).

## Tổng quan giai đoạn

| GĐ | Tên | Số tính năng | M | S | C | W | Đã xong | M % công | M+S % công | Công còn lại |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Ổn định | 21 | 19 | 2 | 0 | 0 | 6 | 95% | 100% | 26 |
| 1 | Chiến đấu và đồ họa nhân vật | 34 | 26 | 7 | 1 | 0 | 19 | 74% | 97% | 32 |
| 2 | Thế giới 121-199 và nhiệm vụ | 30 | 22 | 8 | 0 | 0 | 4 | 69% | 100% | 61 |
| 3 | Trang bị, rèn và kinh tế | 30 | 15 | 12 | 3 | 0 | 7 | 50% | 93% | 46 |
| 4 | Xã hội, gia tộc và PvP | 23 | 6 | 15 | 2 | 0 | 8 | 21% | 93% | 30 |
| 5 | Tính năng đặc sắc | 25 | 3 | 15 | 7 | 0 | 4 | 11% | 69% | 66 |
| 6 | Sự kiện và lễ hội | 25 | 9 | 9 | 7 | 0 | 3 | 36% | 75% | 49 |
| 7 | Âm thanh và hoàn thiện | 15 | 3 | 8 | 2 | 2 | 2 | 17% | 60% | 27 |
| 8 | Tải và vận hành | 10 | 3 | 2 | 3 | 2 | 0 | 25% | 50% | 24 |
| | **Tổng** | **213** | **106** | **78** | **25** | **4** | **53** | 46% | 85% | **361** |

Ngân sách `01-tam-nhin.md` mục 5.1 (M ≤ 60%, M+S ≤ 80% công mỗi giai đoạn) tính theo cỡ. GĐ0, GĐ1, GĐ2 vượt vì gần như toàn việc sàn tối thiểu, chống mất dữ liệu và đợt 3 lô 1 đang chạy: không được hạ (quy tắc 1, 4). Bù bằng hai cách: mức C của các giai đoạn này (tùy biến tạo nhân vật) lùi được sang 1.1 mà không vỡ dữ liệu, và mỗi giai đoạn để 20% thời gian lịch cho sửa lỗi. GĐ3, GĐ4 có M+S trên 80%: nếu trễ thì mức S không ai phụ thuộc trong M (Đấu Trường có luật, so sánh đồ, xem người chơi, bảng tìm nhóm) lùi sang giai đoạn sau, như câu hỏi mở Q1 của `05-he-thong-xa-hoi-pvp.md`.

## Mốc thời gian

Ngày là dự kiến, chỉnh lại sau mỗi điểm dừng. Lễ hội chạy theo ngày thật nên có hạn cứng riêng (cột cuối).

| Mốc | Từ | Đến | Ghi chú |
|---|---|---|---|
| GĐ0 Ổn định | 2026-10-19 | 2026-11-01 | triển khai lại production từ `main` ngay khi ra |
| GĐ1 Chiến đấu và đồ họa nhân vật | 2026-10-26 | 2026-11-22 | lô 1-A đã chạy từ 18-10; gộp `main` sau khi GĐ0 ra |
| ĐIỂM DỪNG 1 | 2026-11-23 | 2026-11-24 | chủ dự án duyệt bộ ảnh nhân vật |
| Đường khẩn Đêm Đông 2026 | 2026-11-02 | 2026-12-05 | lên máy chủ trước 2026-12-05; mùa `giangsinh2026` chạy 2026-12-12 → 2027-01-04 |
| GĐ2 Thế giới 121-199 và nhiệm vụ | 2026-11-23 | 2027-01-10 | phát hành vùng theo dải liền nhau, 2 tuần một đợt |
| ĐIỂM DỪNG 2 | 2027-01-11 | 2027-01-12 | chủ dự án duyệt bộ ảnh bản đồ mới |
| Đường khẩn Hội Xuân 2027 | 2027-01-04 | 2027-01-21 | `tet2027` chạy 2027-01-28 → 2027-02-13 |
| Đường khẩn Mùa Hoa Tình Nhân 2027 | 2027-01-18 | 2027-02-07 | `tinhnhan2027` chạy 2027-02-14 → 2027-03-08 |
| GĐ3 Trang bị, rèn và kinh tế | 2027-01-13 | 2027-02-07 | bắt đầu sau khi ĐIỂM DỪNG 2 duyệt |
| GĐ4 Xã hội, gia tộc và PvP | 2027-02-08 | 2027-03-07 |  |
| GĐ5 Tính năng đặc sắc | 2027-03-08 | 2027-04-18 |  |
| Đường khẩn Lễ Hội Đất Tổ 2027 | 2027-03-15 | 2027-04-03 | `datto2027` chạy 2027-04-10 → 2027-05-05 |
| GĐ6 Sự kiện và lễ hội | 2027-04-19 | 2027-05-23 | `he2027` (2027-06-01) lên bản đầy đủ trước 2027-05-25 |
| GĐ7 Âm thanh và hoàn thiện | 2027-05-24 | 2027-06-20 | tổng kiểm L2 ở cuối |
| GĐ8 Tải và vận hành | 2027-06-21 | 2027-07-18 | mở bản 1.0 khi `npm run verify -- --floor` mã 0 |
| Sau 1.0 | 2027-09-04 | 2027-11-07 | `trangram2027` (2027-09-04), `hoatrang2027` (2027-10-23) chạy trên khung đầy đủ |

Lễ Hội Trăng Rằm 2026 đang chạy tới 2026-11-08: mùa đang chạy không đổi số đổi quà. Đêm Hội Hóa Trang bắt đầu từ 2027 (không rút ngắn Trăng Rằm 2026).

## Giai đoạn 0: Ổn định

**Mục tiêu.** Đưa toàn bộ việc GĐ0 đang nằm ngoài `main` (đợt 1-2B ở `5a50602`, tái cấu trúc `src/`, túi đồ, hộp xác nhận, âm thanh) vào `main` thành 4 nhóm commit tách riêng (việc GĐ1/GĐ2 đang nằm trong index giữ ở nhánh riêng); có lệnh kiểm chứng một chạm `scripts/verify.js` + `npm run verify`; chặn mất dữ liệu (nạp an toàn, sao lưu, chống sập, lưu theo nhân vật). Production chuyển từ nhánh mốc `checkpoint/am-thanh` sang `main`.

**Điều kiện vào.**

- Thư mục làm việc ở `main` có `npm run check` sạch và `npm test` đạt (đo 18-10-2026: check đạt; npm test chạy 2 lần, lần 1 hỏng 1 ca chập chờn của thú cưng, lần 2 đạt).
- Nhánh `feat/bag`, `feat/audio`, nhánh mốc `checkpoint/truoc-tai-cau-truc` (`5a50602`), `checkpoint/am-thanh` và các nhánh `nf/*`, `dot3/*` còn nguyên để đối chiếu.

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run check` không có dòng `✘`; `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`
- `git log origin/main` có 4 nhóm commit theo thứ tự: (0) cherry-pick `5a50602` (đợt 1, 2A, 2B), (1) tái cấu trúc thuần, (2) túi đồ, (3) âm thanh (kèm `src/client/audio/` và `CREDITS.md`); không có commit tên "tạm: ảnh chụp", `data/`, `NOTE.md`, ảnh chụp. `git diff` giữa `main` + các nhánh `nf/*`, `dot3/*` và index ngày 18-10-2026 rỗng (không mất việc).
- `npm run verify -- --quick` mã 0 dưới 15 giây; `npm run verify -- --floor` in đúng các dòng sàn còn thiếu (chưa phải mã 0 ở giai đoạn này).
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`)
- `npm run test:perf` giữ khoảng 60 khung/giây
- CI xanh trên `main` với Node 24 (ADR-10-5).

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T0.01 | `core-restructure` | Cấu trúc mã src/ (lõi server, module, client chia vùng, tests/features), chưa commit | Must | chưa xong | L | không |
| T0.02 | `ops-commit-restructure` | Chốt commit lên main: đợt 1-2B (5a50602), tái cấu trúc, túi đồ, âm thanh (bỏ tên commit tạm), đưa production về main | Must | chưa xong | M | T0.01 |
| T0.03 | `ui-ask-dialog` | Hộp xác nhận ask() thay hộp của trình duyệt (đã làm trên nhánh feat/bag, chờ gộp; còn lỗi A1-A5) | Must | chưa xong | S | T0.02 |
| T0.04 | `ui-bag-expand` | Mở rộng túi bằng lượng (INV_EXPAND 6 lần × 10 ô), túi chia trang 40 ô | Should | chưa xong | S | T0.02 |
| T0.05 | `ui-bag-bulkdrop` | Hủy nhanh nhiều món (discardMany, chế độ chọn, hỏi bằng ask()) | Should | chưa xong | S | T0.02, T0.03 |
| T0.06 | `dev-verify` | Lệnh kiểm chứng một chạm scripts/verify.js + npm run verify (cú pháp, check, id DOM, API công khai, quy tắc tĩnh, sàn nội dung, test) | Must | chưa xong | M | T0.02 |
| T0.07 | `ops-db-safe-load` | Nạp dữ liệu an toàn: không chạy rỗng khi file hỏng, ghi có fsync, báo lỗi lưu, khóa DATA_DIR | Must | chưa xong | S | T0.02 |
| T0.08 | `ops-backup` | Sao lưu theo tầng giờ/ngày/tuần/trước triển khai, bản ngày đẩy ra ngoài máy, scripts/restore.js | Must | chưa xong | M | T0.07 |
| T0.09 | `ops-crash-guard` | Chống sập: bắt lỗi chưa xử lý để lưu khẩn cấp, cô lập lỗi móc, băm mật khẩu bất đồng bộ | Must | chưa xong | S | T0.07 |
| T0.10 | `ops-persist-shard` | Lưu theo nhân vật, chỉ ghi phần bẩn có ngân sách 8 ms/tick, nhật ký nhóm ghi cho thao tác nhiều bản ghi (ADR-10-1) | Must | chưa xong | L | T0.07, T0.08 |
| T0.11 | `ops-admin-guard` | Khóa quyền quản trị: cấm đăng ký tên có trong ADMINS, tắt lệnh kiểm thử ở production, log lệnh admin | Must | chưa xong | S | T0.02 |
| T0.12 | `soc-trade` | Giao dịch 1-1 khóa + xác nhận, kẹp trần xu, kiểm vị trí lúc chốt | Must | chưa xong | S | không |
| T0.13 | `clan-core` | Gia tộc cơ bản: sửa chèn prototype, dọn dữ liệu, giới hạn trưởng lão, kiểm thử đủ | Must | chưa xong | M | không |
| T0.14 | `quest-daily-task` | Nhiệm vụ hằng ngày Tiểu Nhị: bổ sung kiểm thử bot và admin /tieunhi | Must | chưa xong | S | không |
| T0.15 | `dev-test-coverage` | Kiểm thử cho hành động còn trống: gia tộc, Tiểu Nhị, PK, rời nhóm, tẩy tiềm năng, xem người chơi, ngắt kết nối giữa giao dịch | Must | chưa xong | M | T0.02 |
| T0.16 | `core-account` | Tài khoản: đăng ký, đăng nhập, nhớ phiên bằng token, giới hạn thử sai và tạo theo IP | Must | xong | M | không |
| T0.17 | `core-characters` | Nhân vật: tạo 6 phái × 2 giới, tối đa 3 mỗi tài khoản, xóa phải gõ lại tên | Must | xong | S | không |
| T0.18 | `core-modules` | Khung module server: bảng hành động không prototype, điểm móc, gói data, cổng WebSocket | Must | xong | L | không |
| T0.19 | `core-save` | Lưu và tải lại tiến trình bằng JSON (4 file, ghi tmp rồi rename, sao lưu 12 mốc) | Must | xong | M | không |
| T0.20 | `dev-test-harness` | Bộ kiểm thử: npm test (bot WebSocket), npm run check, tools/shot.js, test:ui/e2e/perf | Must | xong | L | không |
| T0.21 | `ops-admin-cmd` | Lệnh quản trị qua chat (/lv, /item, /xu, /tp, /boss, /event, /mail, /code, /sukien, /arena) | Must | xong | M | không |

**Lô thực hiện và thứ tự gộp.**

1. **0-A Chốt commit** (Opus, tuần tự): T0.01, T0.02, T0.03, T0.04, T0.05. Dựng `main` từ chuỗi commit có sẵn, **không** commit thẳng từ index (index trộn việc GĐ1/GĐ2). Nhóm 0: cherry-pick `5a50602` (đợt 1, 2A, 2B trên bố cục cũ). Nhóm 1 tái cấu trúc thuần (**T0.01**): cây của `920700a` (tên "tạm: ảnh chụp" nhưng thực chứa tái cấu trúc 210 file, không có ảnh) đặt sau nhóm 0, viết lại thông điệp. Nhóm 2 túi đồ `fdd1297` + `4b0ff52` (**T0.03** → **T0.04** → **T0.05**). Nhóm 3 âm thanh `25428b0` + phần còn lại của mốc `a4b4a0a` (Range trong `services/http.js`, `tests/e2e/e2e.js`) + `src/client/audio/` lấy từ mốc `d8161c2` kèm `CREDITS.md` (phần file của **T7.01**, chốt ADR-01-1 và ADR-09-1). Phần đồ họa N-F2/N-F3/N-W1 (`nf/f2`, `nf/f3`, `nf/w1`) và lô 1-A (`dot3/bound`, `dot3/balance`) không vào `main` ở GĐ0: rebase lên `main` mới, gộp đúng lượt ở GĐ1 (**T1.01**, **T1.02**, **T1.03**, **T1.06**, **T1.07**) và GĐ2 (**T2.07**). Đóng bằng **T0.02**.
2. **0-B Lệnh kiểm chứng** (agent Claude): T0.06. `scripts/verify.js` 7 bước + `--floor` đếm sàn 1.0 (ADR-10-6). Từ đây mọi điều kiện ra dùng `npm run verify`.
3. **0-C An toàn dữ liệu** (Opus, tuần tự): T0.07, T0.08, T0.09, T0.10. Thứ tự gộp **T0.07** → **T0.08** → **T0.09** → **T0.10** (ADR-10-1). Mỗi bước chạy lại `persist-bench`.
4. **0-D Vá lỗi và kiểm thử còn trống** (agent Claude, song song với 0-C (file khác)): T0.11, T0.12, T0.13, T0.14, T0.15. Vá trần xu khi giao dịch, chèn prototype ở gia tộc, khóa quyền admin; thêm kiểm thử cho hành động còn trống và làm ổn định ca "Thỏ Ngọc tự nhặt đồ".
5. **Đã xong, giữ hồi quy**: T0.16, T0.17, T0.18, T0.19, T0.20, T0.21. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện. Đây là lần đầu production chạy từ `main` thay cho nhánh mốc `checkpoint/am-thanh`.

## Giai đoạn 1: Chiến đấu và đồ họa nhân vật

**Mục tiêu.** Gộp đợt 3 lô 1 (xu khóa, cân bằng), thêm hiệu ứng trạng thái, phân thân, kỹ năng hậu kỳ; hoàn thiện đồ họa nhân vật (màu bậc 12-19, chuẩn hoạt ảnh, khựng đòn, vệt vũ khí) và trang xem hình `/dev/gallery` để chủ dự án duyệt.

**Điều kiện vào.**

- GĐ0 đã ra (commit `main`, `npm run verify` mã 0).
- Nhánh `dot3/bound`, `dot3/balance`, `nf/f2`, `nf/f3` đã tách từ mốc `a4b4a0a`: rebase lên `main` mới trước khi gộp (`nf/w1` gộp ở GĐ2).

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `node tools/balance.js --check` thoát mã 0
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:perf` giữ khoảng 60 khung/giây (vẽ mới: hoạt ảnh, vệt vũ khí, hiệu ứng trạng thái)
- Ảnh `tools/shot.js` 1280×720 và `mobile: true` cho mọi cửa sổ đổi trong giai đoạn, in `OK no console errors`.
- **ĐIỂM DỪNG 1** đã được chủ dự án duyệt (mục bên dưới).

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T1.01 | `eco-bound` | Xu khóa và vật phẩm khóa (đá hoàn lại luôn khóa) | Must | chưa xong | L | không |
| T1.02 | `dev-balance-tool` | Công cụ đo cân bằng tools/balance.js + khối Cân bằng trong npm run check | Must | chưa xong | M | không |
| T1.03 | `cmb-balance` | Cân bằng boss, Tà Thú, quái theo người chơi trung bình (cấp 1-120) | Must | chưa xong | M | T1.02 |
| T1.04 | `cmb-status` | Hiệu ứng trạng thái theo hệ (bỏng, đóng băng, choáng, độc, lạnh cóng, phá giáp, câm) và ô trạng thái HUD | Should | chưa xong | L | T1.03 |
| T1.05 | `cmb-clone` | Phân Thân: kỹ năng cấp 70 mỗi phái | Should | chưa xong | M | T1.04, T1.03 |
| T1.06 | `char-tier-outfit` | Màu và hoa văn nhân vật cho 8 bậc trang bị 12-19 (3 mảng TIER_OUTFIT/METAL/TRIM dài 20) | Must | chưa xong | S | T1.08 |
| T1.07 | `cmb-skills-199` | Kỹ năng hậu kỳ: 3 chủ động (cấp 100/130/160) + 2 nội tại (120/150) mỗi phái | Must | chưa xong | M | T1.03 |
| T1.08 | `dev-gallery` | Trang /dev/gallery (chỉ admin, DEV_TOOLS=1) xem mọi hình vẽ code | Must | chưa xong | M | không |
| T1.09 | `art-anim-standard` | Chuẩn hoạt ảnh: nhân vật 11 trạng thái + talk NPC, quái hurt/die, boss cast | Should | chưa xong | L | T1.08 |
| T1.10 | `art-hitstop` | Khựng đòn theo loại đòn (0-200 ms) và phản hồi trúng đòn | Should | chưa xong | S | không |
| T1.11 | `art-weapon-trail` | Vệt vũ khí theo phái, hệ, bậc và cường hóa | Should | chưa xong | M | T1.09, T1.08 |
| T1.12 | `dev-baseline-shots` | Mốc hồi quy đồ họa: mã băm từng ô gallery + so điểm ảnh (tools/shotdiff.js) | Should | chưa xong | M | T1.08 |
| T1.13 | `cmb-death-revive` | Tử trận, mất EXP, hồi sinh tại chỗ (bảo hộ 3 giây, giá leo thang) hoặc về điểm hồi sinh | Must | chưa xong | S | không |
| T1.14 | `ops-anticheat-move` | Ngân sách quãng đường cho gói move (đóng lỗ tăng tốc 4-18 lần bằng dồn gói) | Must | chưa xong | S | T0.02 |
| T1.15 | `char-create-custom` | Chọn kiểu tóc, màu tóc, màu mắt, màu da, khăn che mặt khi tạo nhân vật; Gương Hóa Dung | Could | chưa xong | M | T0.17 (xong) |
| T1.16 | `art-fx` | Hiệu ứng kỹ năng, chữ sát thương, rung màn hình, hiệu ứng rèn/khảm | Must | xong | M | không |
| T1.17 | `art-icons` | Icon vật phẩm, kỹ năng, giao diện vẽ bằng code | Must | xong | M | không |
| T1.18 | `art-maps` | Bản đồ 23 theme, ngày/đêm theo giờ Việt Nam, hạt môi trường | Must | xong | M | không |
| T1.19 | `art-monsters` | Quái vẽ bằng code (11 kiểu sprite, biến thể boss) | Must | xong | M | không |
| T1.20 | `char-ninja` | Nhân vật chibi pixel và NPC vẽ bằng code | Must | xong | M | không |
| T1.21 | `cmb-auto` | Tự động đánh, tự uống thuốc, tự nhặt, săn đúng quái nhiệm vụ (chỉ máy khách) | Must | xong | M | không |
| T1.22 | `cmb-buffs` | Buff kỹ năng tạm thời và buff lưu khi thoát (Bí Kíp Nhân Đôi, món ăn) | Must | xong | S | không |
| T1.23 | `cmb-classes` | 6 phái, 3 hệ khắc vòng Hỏa-Thủy-Phong, 3 làng phái | Must | xong | S | không |
| T1.24 | `cmb-loot` | Rơi đồ có quyền nhặt 15 giây, nhặt tay hoặc tự nhặt | Must | xong | S | không |
| T1.25 | `cmb-monster-ai` | AI quái: đi tuần, chủ động, kéo về chỗ, đánh xa, bay, làm chậm | Must | xong | M | không |
| T1.26 | `cmb-passive` | Kỹ năng nội tại học bằng sách, 10 chỉ số nội tại | Should | xong | S | không |
| T1.27 | `cmb-potential` | Tiềm năng 4 chỉ số, tẩy điểm bằng lượng | Must | xong | S | không |
| T1.28 | `cmb-skills` | Kỹ năng chủ động cấp 1-60 (nâng tới cấp 15) và thanh kỹ năng 3 bộ × 6 ô | Must | xong | M | không |
| T1.29 | `cmb-stats` | Công thức chỉ số nhân vật (recalc qua móc stats, trần chí mạng/né/kháng/tốc) | Must | xong | M | không |
| T1.30 | `pve-boss-field` | Boss bản đồ: chiêu niệm có cảnh báo vùng, cuồng nộ, chia thưởng theo sát thương | Must | xong | L | không |
| T1.31 | `ui-hud` | HUD: thanh chỉ số, mục tiêu, buff, theo dõi nhiệm vụ, bản đồ nhỏ, biểu ngữ, thông báo | Must | xong | M | không |
| T1.32 | `ui-touch` | Điều khiển cảm ứng: D-pad, cụm kỹ năng, nút tự đánh, gợi ý xoay ngang | Must | xong | M | không |
| T1.33 | `ui-windows` | Khung cửa sổ và 23 tệp cửa sổ (22 khóa refresh() + hội thoại) | Must | xong | L | không |
| T1.34 | `world-movement` | Di chuyển, nhảy đôi, xuống bục, máy chủ kiểm tốc và độ cao nhảy | Must | xong | S | không |

**Lô thực hiện và thứ tự gộp.**

1. **1-A Đợt 3 lô 1 (đang chạy)** (agent Claude (worktree `wt-bound`, `wt-balance`)): T1.01, T1.02, T1.03. Gộp theo `specs/PLAN.md` mục 5: `bound` trước (**T1.01**), `balance` sau (**T1.02** rồi **T1.03**). Rà diff, chạy lại `check`/`test`, xem ảnh cổng 3621/3622 trước khi gộp.
2. **1-B Đợt 3 lô 2, phần chiến đấu** (agent Claude): T1.04. Đặc tả `status` (cổng 3623). Chèn trong thân vòng BOSSES của `monsters.js` như phụ lục điều phối.
3. **1-C Đợt 3 lô 3, phần chiến đấu** (agent Claude): T1.05. Đặc tả `clone` (cổng 3628), sau **T1.04** vì dùng `defMul` và khối `#hud-buffs`.
4. **1-D Đồ họa nhân vật và kỹ năng hậu kỳ** (agent Claude (file client) + Opus (dữ liệu)): T1.06, T1.07. Lô N-F2 (3 mảng màu `TIER_OUTFIT/METAL/TRIM` dài 20) và N-F3 (icon 18 kỹ năng cao cấp + vòng thần kỹ) đã vẽ xong ở nhánh `nf/f2`, `nf/f3`. **T1.06** gộp sau **T1.08** vì ảnh duyệt dựng bằng ô gallery với `look` gán thẳng, không cần vật phẩm; `TIER_NAMES/TIER_LV/TIER_COLORS` dài 20 thuộc **T2.01**. **T1.07** còn dữ liệu 30 kỹ năng và sách 120 (ADR-05a-1); sách 150 do boss vùng Hoàng Lăng rơi (**T2.12**).
5. **1-E Hoạt ảnh và mốc hình** (agent Claude): T1.08, T1.09, T1.10, T1.11, T1.12. Gallery trước để mọi lô vẽ có chỗ so; mốc băm (ADR-09-2) lập tay trên máy dev, CI hằng đêm dùng lại ở GĐ7.
6. **1-F Luật chiến đấu còn thiếu** (agent Claude): T1.13, T1.14, T1.15. Hồi sinh leo thang + bảo hộ 3 giây, ngân sách quãng đường cho gói `move`; tùy biến ngoại hình khi tạo nhân vật làm khi dư công.
7. **Đã xong, giữ hồi quy**: T1.16, T1.17, T1.18, T1.19, T1.20, T1.21, T1.22, T1.23, T1.24, T1.25, T1.26, T1.27, T1.28, T1.29, T1.30, T1.31, T1.32, T1.33, T1.34. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

### ĐIỂM DỪNG 1: chủ dự án duyệt đồ họa nhân vật

Dừng gộp GĐ2 cho tới khi chủ dự án trả lời "duyệt" hoặc liệt kê chỗ sửa. Ảnh chụp bằng `tools/shot.js` (cổng 3705, `DATA_DIR=/tmp/ns-dd1`, tài khoản `artf2`), lưu ở thư mục nháp `shots/dd1/` (không commit), mỗi cảnh có bản 1280×720 và `mobile: true`, script in `OK no console errors`:

1. 6 phái × 2 giới bậc 12, 15, 17, 19 dựng bằng ô `/dev/gallery` với `look` gán thẳng (T1.06, T1.08), không cần vật phẩm, so với bậc 0-11 cũ đặt cạnh; ảnh mặc đủ bộ vật phẩm bậc 12-19 thuộc T3.09
2. Trang `/dev/gallery` (T1.08): lưới mọi nhân vật, NPC, quái, thú, icon; mã băm mốc của T1.12
3. 11 trạng thái hoạt ảnh nhân vật + nói chuyện NPC, quái trúng đòn/chết, boss (T1.09), ảnh động ghép khung
4. Vệt vũ khí theo 6 phái, 3 hệ, bậc và mốc cường hóa (T1.11); khựng đòn chí mạng (T1.10)
5. Hiệu ứng trạng thái bỏng, đóng băng, choáng, độc, lạnh cóng trên người và quái, biểu tượng ở `#hud-buffs` (T1.04)
6. Phân thân của 6 phái (T1.05)
7. Cửa sổ Kỹ năng có 30 kỹ năng hậu kỳ (kỹ năng cấp 130/160 hiện khóa vì cấp tối đa còn 120), icon 18 kỹ năng cao cấp + vòng thần kỹ ở 24 px và 48 px (T1.07)
8. Hộp tử trận có giá hồi sinh leo thang (T1.13); hộp xác nhận `ask()` thường và nguy hiểm
9. Một bãi luyện ở `forceHour` 12 và 22 với 6 người chơi đánh cùng lúc (kiểm đọc được trên nền đêm)

Kèm số đo: `npm run test:perf` (khung/giây, ms CPU/khung) trước và sau giai đoạn.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 2: Thế giới 121-199 và nhiệm vụ

**Mục tiêu.** Mở cấp tối đa 199, Hạ Giới thêm 19 bãi + 2 trạm, Thượng Giới 8 vùng × 6 bản đồ, 72 quái + 9 boss mới, chính tuyến 124 nhiệm vụ, Kỳ Duyên, Lệnh Truy Nã, Thí Luyện Động. Đạt các sàn cấp 199, ≥ 80 bản đồ, ≥ 120 nhiệm vụ chính.

**Điều kiện vào.**

- GĐ1 đã ra và ĐIỂM DỪNG 1 đã duyệt.
- Lô 2-B (theme mới) đã gộp trước luồng vùng vì `check-data` đòi theme `swamp`, `starfield`, `jade_peak`.

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `CHECK_RELEASE=1 npm run check` không có dòng lỗi
- `node tools/balance.js --check` thoát mã 0
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors` (tìm đường qua 92 bản đồ, trạm, Phu Xe 2 trang)
- `npm run test:perf` giữ khoảng 60 khung/giây trên một bãi `starfield` và một bãi có rồng (tỉ lệ 1,6)
- `npm run verify -- --floor` không còn dòng thiếu cấp 199, bản đồ, nhiệm vụ chính.
- Bot `capbot1` lên cấp 199.
- **ĐIỂM DỪNG 2** đã được chủ dự án duyệt.

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T2.01 | `core-levelcap-199` | Cấp tối đa 199 có trần theo vùng đã phát hành, đường EXP mới (giữ nguyên ≤ 120), mở 20 bậc trang bị | Must | chưa xong | M | T1.03 |
| T2.02 | `ops-data-migration` | Phiên bản dữ liệu meta.v + bước nâng cấp thuần, id khai tử (legacy.js), không xóa đồ id lạ, khóa id phát hành | Must | chưa xong | M | T0.07, T0.08 |
| T2.03 | `eco-consumables-199` | Tiêu hao hậu kỳ: bình cấp 120/160, đồ ăn 6 nhóm có trần, đan dược | Must | chưa xong | M | T2.01, T1.01 |
| T2.04 | `world-towns` | Trạm/thị trấn dùng chung hàm outpost(), làng nhận danh sách NPC làm tham số | Must | chưa xong | M | T2.28 (xong) |
| T2.05 | `world-home` | Về làng/hồi sinh theo trạm gần nhất (homeOf), Phu Xe 2 trang với trạm Hạ Giới và Thượng Giới | Must | chưa xong | M | T2.04 |
| T2.06 | `art-monsters-199` | Hình 72 quái + 9 boss Thượng Giới (mượn art, bảng màu vùng, AURA2) | Must | chưa xong | M | không |
| T2.07 | `art-themes-new` | 3 theme bản đồ mới (swamp, starfield, jade_peak) và 39 biến thể MAP_VARIANTS | Must | chưa xong | M | không |
| T2.08 | `world-region-bonglai` | Vùng Thượng Giới Quần Đảo Bồng Lai (cấp 120-129): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.04, T2.05, T2.07, T2.06, T2.01 |
| T2.09 | `world-upper` | Tờ bản đồ thế giới Thượng Giới (4 tờ) và lối tắt Phu Xe tới vùng | Must | chưa xong | M | T2.30 (xong), T2.04, T2.05, T2.08 |
| T2.10 | `world-region-xichviem` | Vùng Thượng Giới Xích Viêm Hỏa Vực (cấp 130-139): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.08 |
| T2.11 | `world-region-bangnguyen` | Vùng Thượng Giới Vạn Niên Băng Nguyên (cấp 140-149): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.10 |
| T2.12 | `world-region-hoanglang` | Vùng Thượng Giới Thiên Cổ Hoàng Lăng (cấp 150-159): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.11, T2.07 |
| T2.13 | `world-region-uminh` | Vùng Thượng Giới U Minh Quỷ Lâm (cấp 160-169): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.12, T2.07 |
| T2.14 | `world-region-tinhha` | Vùng Thượng Giới Tinh Hà Thiên Lộ (cấp 170-179): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.13, T2.07 |
| T2.15 | `world-region-hondon` | Vùng Thượng Giới Hỗn Độn Ma Vực (cấp 180-189): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.14, T2.07 |
| T2.16 | `world-region-thaicuc` | Vùng Thượng Giới Thái Cực Thần Cảnh (cấp 190-199): 4 bãi, bí cảnh có boss vùng, trạm | Must | chưa xong | M | T2.15, T2.07 |
| T2.17 | `quest-main-199` | Chính tuyến "Bát Phương Thiên Ấn" cấp 120-199 (73 nhiệm vụ, tổng 124) | Must | chưa xong | L | T2.01, T2.09, T2.08, T2.10, T2.11, T2.12, T2.13, T2.14, T2.15, T2.16, T1.01 |
| T2.18 | `world-lower-fill` | Hạ Giới thêm 19 bãi và 2 trạm, lấp dải cấp mỏng | Must | chưa xong | L | T2.04, T2.05, T2.07 |
| T2.19 | `quest-main-gap` | Lấp khoảng trống chính tuyến cấp 84-95 (hg_q1-hg_q6), sửa 10 mô tả thiếu địa điểm | Should | chưa xong | S | T2.01, T2.18, T2.02 |
| T2.20 | `world-layout` | Bố cục bản đồ viết tay (layout, segments) cho bản đồ quan trọng | Should | chưa xong | M | T2.28 (xong), T2.18, T2.08 |
| T2.21 | `pve-caves` | Thí Luyện Động: 3 hang × 3 độ khó cho cấp 30-120 | Should | chưa xong | L | T1.03 |
| T2.22 | `cmb-elite-mobs` | Quái tinh anh có kỹ năng riêng trên bãi luyện | Should | chưa xong | M | T1.03, T1.02 |
| T2.23 | `quest-kyduyen` | Kỳ Duyên: 40 kỳ duyên (8 chuỗi × 5) ở 8 vùng Thượng Giới, NPC Kỳ nhân | Should | chưa xong | L | T2.17, T2.08, T1.01 |
| T2.24 | `quest-truyna` | Lệnh Truy Nã: 3 lệnh/ngày (săn, thu, boss vùng) ở Kỳ nhân cho cấp 120+ | Should | chưa xong | M | T2.23, T2.08 |
| T2.25 | `quest-lore` | Cốt truyện tổng, thoại nhiều NPC, cảnh mở đầu, chương và hồi ký | Should | chưa xong | M | T2.27 (xong) |
| T2.26 | `ui-tutorial` | Lời Dặn Trưởng Làng: hướng dẫn tân thủ chỉ tay 12 bước, giới thiệu tính năng theo cấp | Should | chưa xong | L | T1.31 (xong), T0.03 |
| T2.27 | `quest-main` | Chính tuyến Hạ Giới: 51 nhiệm vụ cấp 1-118, 7 kiểu, thưởng vũ khí đúng phái | Must | xong | M | không |
| T2.28 | `world-base` | Khung bản đồ: 3 làng, 19 bãi luyện, cổng hai chiều, cửa giữa bản đồ | Must | xong | S | không |
| T2.29 | `world-teleport` | Phu Xe dịch chuyển giữa 3 làng (miễn phí dưới cấp 20, sau đó 300 xu) | Must | xong | S | không |
| T2.30 | `world-worldmap` | Bản đồ thế giới và tự tìm đường liên bản đồ | Must | xong | M | T2.28 (xong) |

**Lô thực hiện và thứ tự gộp.**

1. **2-A Nền tảng (N1-N5 của kế hoạch nội dung)** (Opus, tuần tự, mỗi bước gộp `main`): T2.01, T2.02, T2.03, T2.04, T2.05, T2.06. N1: **T2.01** (MAX_LEVEL 199, trần `LEVEL_CAP` theo vùng đã phát hành, `expNeed/expScale`, `TIER_NAMES/TIER_LV/TIER_COLORS` dài 20, tách `regions/`, `quests/`), **T2.02** (lưu tiến độ nhiệm vụ theo id, `meta.v`), bình hp5/hp6 của **T2.03** (đồ ăn của nó lấy `foods.js` từ lô I1). N2: **T2.04** → **T2.05** (`outpost()`, `homeOf`, Phu Xe 2 trang). N3: khung `art` + **T2.06**. N4: NPC `elder/hermit` và khung nhiệm vụ vùng cho **T2.17**. N5: khung dữ liệu sự kiện (`calendar.js`, `bosspacks/`, tách `SEASONS` thành `seasons/`) làm sẵn cho **T6.02** và **T6.01**.
2. **2-B Theme mới** (agent Claude (file client)): T2.07. N-W1 đã vẽ 3 theme, 39 biến thể, nhà trạm `townStyle`; còn đưa tên vào `THEMES` của `tools/check-data.js`, gắn bản đồ, chụp ảnh 12 giờ/22 giờ, `test:perf` (ADR-07-3).
3. **2-C Luồng B: 8 vùng Thượng Giới** (agent Claude, 8 nhóm song song (worktree riêng)): T2.08, T2.09, T2.10, T2.11, T2.12, T2.13, T2.14, T2.15, T2.16, T2.17. Mỗi vùng: C-R (`regions/<vùng>.js`) rồi C-Q (`quests/<vùng>.js`) rồi rà soát. Gộp đúng thứ tự Bồng Lai → Xích Viêm → Băng Nguyên → Hoàng Lăng → U Minh → Tinh Hà → Hỗn Độn → Thái Cực; chỉ triển khai dải vùng liền nhau khi `CHECK_RELEASE=1` sạch và `LEVEL_CAP` đặt đúng cấp cao nhất của dải đã phát hành (139/159/179/199, 07 mục 12). Bản đồ thế giới 4 tờ và lối tắt Phu Xe (**T2.09**, lô N-W2, ADR-07-2) gộp ngay sau Bồng Lai. **T2.17** đóng khi đủ 8 vùng.
4. **2-D Hạ Giới** (agent Claude): T2.18, T2.19, T2.20. C-H1 đến C-H5 (`hagioi/ga.js` đến `hagioi/ge.js`), `gb` và `gd` lên cùng lúc vì cùng chen trạm vào đường chính; C-A2 trang phục quái người là tùy chọn. **T2.19** theo ADR-08-1, phát hành sau khi N1 đã chạy thật một bản.
5. **2-E Luồng A phần giai đoạn này** (agent Claude): T2.21, T2.22. Đặc tả `dungeons` (đợt 3 lô 2, cổng 3624) kèm dòng tương thích `maxLv ≤ MAX_LEVEL`, `caveBossLv ≤ MAX_LEVEL + 5`.
6. **2-F Nhiệm vụ phụ và dẫn truyện** (agent Claude): T2.23, T2.24, T2.25, T2.26. Lô S1-KD (Kỳ Duyên + Lệnh Truy Nã, cổng 3730) sau khi có ít nhất vùng Bồng Lai; cốt truyện và hướng dẫn tân thủ dùng bảng thoại của mục 08.
7. **Đã xong, giữ hồi quy**: T2.27, T2.28, T2.29, T2.30. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

### ĐIỂM DỪNG 2: chủ dự án duyệt bản đồ mới

Dừng gộp GĐ3 cho tới khi chủ dự án duyệt. Ảnh chụp ở cổng 3780 (`DATA_DIR=/tmp/ns-dd2`, tài khoản `tongkiem1`), lưu ở `shots/dd2/` (không commit), mỗi cảnh 1280×720 và `mobile: true`, `forceHour` 12 và 22:

1. 8 vùng Thượng Giới: mỗi vùng 1 bãi luyện, trạm và bí cảnh có boss (24 cảnh, T2.08, T2.10, T2.11, T2.12, T2.13, T2.14, T2.15, T2.16)
2. 3 theme mới `swamp`, `starfield`, `jade_peak` và 39 biến thể `MAP_VARIANTS` (T2.07), kiểm trang trí cách NPC ≥ 26 px, cách cổng ≥ 70 px
3. 19 bãi + 2 trạm Hạ Giới mới (T2.18), nhà trạm theo hệ (`townStyle`)
4. Bản đồ thế giới 4 tờ, dấu cổng sang tờ, Phu Xe 2 trang (T2.09, T2.05)
5. 72 quái + 9 boss Thượng Giới trong gallery và trên bãi (T2.06), hào quang `AURA2`, rồng tỉ lệ 1,6
6. NPC Kỳ nhân, cửa sổ Nhiệm vụ có Kỳ Duyên và Lệnh Truy Nã (T2.23, T2.24); theo dõi nhiệm vụ trên HUD
7. Thí Luyện Động 3 hang × 3 độ khó (T2.21), quái tinh anh (T2.22)
8. Cảnh mở đầu và hướng dẫn tân thủ (T2.25, T2.26)

Kèm số đo: `npm run test:perf` trên bãi `starfield` và bãi có rồng; bảng `node tools/balance.js` cho 121-199; bản đồ thế giới ở 360 px không tràn ngang.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện. Trong giai đoạn, mỗi khi một dải vùng liền nhau đạt `CHECK_RELEASE=1` thì được triển khai sớm, kèm nâng `LEVEL_CAP` của **T2.01** tới cấp cao nhất của dải đó.

## Giai đoạn 3: Trang bị, rèn và kinh tế

**Mục tiêu.** Trang bị bậc 12-19 và Thần binh vùng, Thợ Rèn hoàn thiện (ghép đá, tách, chuyển cấp), chế tác, chợ ký gửi, Việc Làng, cửa hàng chia quầy và Kỳ Trân Các, sổ cái lượng, nhật ký kiểm toán, mô hình kinh tế và trần chênh lệch trả phí.

**Điều kiện vào.**

- GĐ2 đã ra và ĐIỂM DỪNG 2 đã duyệt.
- Đợt 3 lô 2 phần trước (`status`, `dungeons`) đã gộp.

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `node tools/balance.js --check` thoát mã 0
- `node tools/sim-exp.js --check`, `node tools/sim-economy.js --check` và `node tools/sim-paygap.js --check` thoát mã 0
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`) (Hành trang, giao dịch, Thợ Rèn đã đổi)
- `npm run test:perf` giữ khoảng 60 khung/giây
- `CHECK_RELEASE=1 npm run check` không có dòng lỗi

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T3.01 | `eco-market` | Chợ Ký Gửi (theo specs/market.md + chỉnh M1-M3) | Should | chưa xong | L | T1.01, T4.21 (xong) |
| T3.02 | `gear-smith-plus` | Thợ Rèn: ghép đá cường hóa, tách cường hóa, ghép ngọc nhiều lần (NOTE.md) | Should | chưa xong | M | T1.01 |
| T3.03 | `gear-crafting` | Chế tác: Tinh Thiết, rã đồ, rèn đúc theo ô | Should | chưa xong | M | T3.02, T1.01 |
| T3.04 | `quest-dailies` | Việc Làng: thu thập, đưa thư, săn bảo vật, hộ tống; 10 việc/ngày, chuỗi, mốc 3/6/10 | Should | chưa xong | L | T2.01, T3.01 |
| T3.05 | `ops-audit-log` | Nhật ký kiểm toán chỉ ghi thêm (audit/*.jsonl) cho lệnh admin, giao dịch, chợ, thư có quà, cường hóa cao, world.econ.log | Must | chưa xong | M | T0.02 |
| T3.06 | `eco-currency-guard` | Giữ toàn vẹn tiền: trần lượng, kẹp khi tải, chặn tràn khi nhận tiền từ người khác, nhãn nguồn | Must | chưa xong | M | T1.01 |
| T3.07 | `mon-luong-ledger` | Sổ cái lượng: mọi thay đổi lượng qua một API có nguồn (gain/pay), kẹp trần 1e9, thống kê ngày meta.econ, lệnh /kinhte | Must | chưa xong | M | T0.02, T1.01 |
| T3.08 | `pve-boss-luongcap` | Trần lượng thưởng boss bản đồ: 60 lượng/nhân vật/ngày (BOSS_LUONG, c.bossL) | Must | chưa xong | S | không |
| T3.09 | `gear-tier-199` | Trang bị bậc 12-19 và Thần binh vùng (48 món, ghép 30 mảnh) | Must | chưa xong | L | T2.01, T1.06 |
| T3.10 | `cmb-balance-upper` | Cân bằng 121-199: chỉ số quái/boss, bậc trang bị 12-19, thời gian hạ quái, thưởng EXP việc ngày theo ADR-06-2 | Must | chưa xong | M | T2.01, T1.02, T3.09, T1.07, T3.21 |
| T3.11 | `gear-upgrade-transfer` | Chuyển cấp cường hóa sang món cùng ô bậc ≥ (mất 1-2 cấp) | Should | chưa xong | S | T3.02 |
| T3.12 | `gear-refine` | Tẩy luyện dòng phụ, giữ 1 dòng bằng lượng | Could | chưa xong | S | T3.03 |
| T3.13 | `art-enhance-aura` | Hào quang theo mốc cường hóa vũ khí (+5/+8/+11/+13/+15/+16) và theo bộ (look.sp) | Should | chưa xong | M | T3.30 (xong), T1.08 |
| T3.14 | `gear-chest` | Rương Báu: tỉ lệ công khai, kiểm thử mở rương | Should | chưa xong | S | không |
| T3.15 | `eco-loot-tables` | Bảng rơi dữ liệu LOOT, rương vùng, Rương Thượng Giới, cẩm nang ngọc, hộp lễ hội, tỉ lệ công khai | Should | chưa xong | M | T3.09, T1.01, T3.14 |
| T3.16 | `eco-shop-tabs` | Cửa hàng chia quầy xu/lượng và tab tự xếp, giới hạn lượt tuần/trọn đời | Should | chưa xong | M | T1.01 |
| T3.17 | `eco-sell-bulk` | Bán nhanh nhiều món, mua lại 10 món vừa bán trong phiên, ghim món quý | Should | chưa xong | M | T1.01, T0.05, T3.16 |
| T3.18 | `mon-luong-shop` | Quầy Kỳ Trân Các 6 tab, 9 gói ưu đãi giới hạn lượt, giá trị quy đổi do máy chủ tính, công khai tỉ lệ | Should | chưa xong | M | T3.07, T1.01, T3.16 |
| T3.19 | `ui-item-compare` | So sánh nhanh chỉ số với món đang mặc (khung rê chuột, khối trong chi tiết, dấu tốt hơn) | Could | chưa xong | S | T1.33 (xong), T0.03 |
| T3.20 | `gear-storage-plus` | Kho mở rộng (tới 140 ô) và Rương Gia Bảo dùng chung tài khoản (30 ô + xu) | Could | chưa xong | M | T0.10, T1.01 |
| T3.21 | `dev-sim-tools` | Công cụ mô phỏng tools/sim-exp.js, tools/sim-combat.js, tools/sim-economy.js | Must | chưa xong | S | T1.02 |
| T3.22 | `eco-economy-model` | Mô hình kinh tế: nguồn/hút xu, lượng; trần 60 lượng/ngày; giá bán đá 5%; rơi đá hậu kỳ | Must | chưa xong | M | T1.01, T3.21 |
| T3.23 | `mon-spend-cap` | Trần chênh lệch trả phí: phân loại hàng lượng (look/util/boost/gear), Hạn mức Tu Luyện 350 lượng/tuần, luật dữ liệu L1-L8, tools/sim-paygap.js | Must | chưa xong | M | T3.07, T3.21, T1.01, T2.27 (xong) |
| T3.24 | `eco-currency` | Xu (trần 2 tỉ) và lượng | Must | xong | M | không |
| T3.25 | `eco-shop-npc` | Cửa hàng NPC: Tiệm Thuốc, Lò Rèn, bán lấy xu | Must | xong | M | không |
| T3.26 | `gear-equipment` | Trang bị 9 ô × 12 bậc, 5 độ hiếm có dòng phụ | Must | xong | M | không |
| T3.27 | `gear-gems` | Ngọc khảm 6 loại × 10 cấp, ghép 3 → 1 | Should | xong | M | không |
| T3.28 | `gear-inventory` | Hành trang: dùng, mặc, hủy, sắp xếp | Must | xong | M | không |
| T3.29 | `gear-storage` | Thủ kho 60 ô dùng chung mọi làng | Must | xong | M | không |
| T3.30 | `gear-upgrade` | Cường hóa +1 → +16, Bùa Bảo Hộ, báo toàn máy chủ từ +10 | Must | xong | M | không |

**Lô thực hiện và thứ tự gộp.**

1. **3-A Đợt 3 lô 2-3 phần kinh tế** (agent Claude): T3.01, T3.02, T3.03, T3.04. Thứ tự gộp `market` → Thợ Rèn mở rộng (ADR-05b-1, ADR-05b-4) → `crafting` → `dailies` (cần làng rộng 1800 của chợ). Kèm dòng tương thích: `dailies` theo `1..MAX_LEVEL`, mốc 10..190.
2. **3-B Tiền tệ và kiểm toán** (Opus (kinh tế, bảo mật)): T3.05, T3.06, T3.07, T3.08. Nhật ký kiểm toán trước để mọi thay đổi tiền sau đó có dấu vết; trần lượng boss 60/ngày theo ADR-06-3.
3. **3-C Trang bị hậu kỳ** (agent Claude + Opus rà số): T3.09, T3.10, T3.11, T3.12, T3.13, T3.14. Lô S1-I1 phần `equipment.js` (Thần binh ghép 30 mảnh trên 20 bậc do **T2.01** mở) rồi cân bằng 121-199 bằng `tools/balance.js`. **T3.10** gộp sau **T3.21** (cần `tools/sim-exp.js`) và sau **T3.04** nếu đã sẵn, vì mang bản vá ADR-06-2 (06 Q9).
4. **3-D Cửa hàng (S1-I1 → S2-I2 → S2-I3 → S2-I4)** (agent Claude): T3.15, T3.16, T3.17, T3.18, T3.19, T3.20. Dữ liệu cửa hàng/rương/gói (cổng 3740) → server cửa hàng (3741) → icon (3742) → giao diện (3743). Kho mở rộng làm sau **T0.10** (ADR-05b-2).
5. **3-E Mô hình kinh tế** (Opus): T3.21, T3.22, T3.23. Công cụ mô phỏng trước, mô hình nguồn/hút và trần chênh lệch trả phí sau; số đổi phải qua công cụ và `DESIGN_RULES.md` mục 9.
6. **Đã xong, giữ hồi quy**: T3.24, T3.25, T3.26, T3.27, T3.28, T3.29, T3.30. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 4: Xã hội, gia tộc và PvP

**Mục tiêu.** Danh hiệu và thành tựu, gia tộc mở rộng + chiến gia tộc, Chiến Trường, boss gia tộc bậc cao, PK có luật, lôi đài theo khung cấp, trang sức Vinh Danh, cân bằng PvP, an toàn chat, chống gian lận.

**Điều kiện vào.**

- GĐ3 đã ra (chợ, Việc Làng, xu khóa đã chạy).

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `node tools/balance.js --check` thoát mã 0 (cả bảng PvP)
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`) (Bạn bè, Gia tộc, giao dịch, thách đấu, menu người chơi)
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:perf` giữ khoảng 60 khung/giây
- Lịch tối không chồng giờ: Chiến Trường 20:00-20:30, chiến gia tộc 21:30-21:45, Tà Thú giờ chẵn :30-:50 (`npm run check`).

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T4.01 | `soc-titles` | Danh hiệu, thành tựu, danh sách kẻ thù (theo specs/titles.md + chỉnh T1-T4) | Should | chưa xong | M | T1.01 |
| T4.02 | `clan-war` | Gia tộc mở rộng (nhiệm vụ, cửa hàng cống hiến, trận pháp, Tộc Địa) + chiến gia tộc (theo specs/clanwar.md + chỉnh W1-W5) | Should | chưa xong | L | T0.13, T1.01, T1.03, T2.21 |
| T4.03 | `pvp-battlefield` | Chiến Trường Long Phượng (theo specs/battlefield.md + chỉnh B1-B4) | Should | chưa xong | L | T4.02, T3.04, T3.01, T1.01, T4.16 (xong), T2.01 |
| T4.04 | `pve-clanboss` | Boss gia tộc bậc cao: Băng Tâm Hộ Tộc Thần (140) và Thần Long Tổ Miếu (180) | Should | chưa xong | S | T4.02, T1.03 |
| T4.05 | `pvp-pk` | PK cơ bản: bật PK từ cấp 10, cấm trong làng, điểm hiếu chiến, phạt EXP (nâng: khóa tắt, bảo vệ tân thủ, màu tên, đếm hạ người) | Should | chưa xong | S | không |
| T4.06 | `pvp-arena-bracket` | Lôi đài theo 5 khung cấp 20-199, bảng xếp hạng và thưởng tuần theo khung | Should | chưa xong | M | T4.16 (xong), T2.01 |
| T4.07 | `gear-fame` | Trang sức Vinh Danh: đổi và nâng Vinh Giai bằng danh vọng, kháng ST người chơi | Should | chưa xong | M | T1.01, T4.16 (xong) |
| T4.08 | `cmb-pvp-balance` | Cân bằng PvP giữa phái: hệ số PvP sau khi trừ thủ k = 0,06 và hệ số phái (ADR-06-1) | Should | chưa xong | S | T3.21, T4.16 (xong), T4.07 |
| T4.09 | `cmb-power-score` | Lực chiến tổng hợp và bảng xếp hạng lực chiến, PK, thú cưng | Should | chưa xong | M | T4.05, T1.02 |
| T4.10 | `pvp-freezone` | Đấu Trường có luật: Giờ Huyết Chiến, màu tên hiếu chiến, Huyết Bảng treo thưởng | Could | chưa xong | M | T4.01, T4.05 |
| T4.11 | `soc-chat-safety` | Chặn người chơi, lọc từ/liên kết/số điện thoại, chống lặp tin, báo cáo, cấm chat, cài đặt riêng tư | Must | chưa xong | M | T4.18 (xong), T4.20 (xong) |
| T4.12 | `soc-inspect` | Xem người chơi kể cả offline, ngoại hình + thú, tùy chọn ẩn trang bị | Could | chưa xong | S | T4.23 (xong), T4.11 |
| T4.13 | `soc-party-plus` | Bảng tìm nhóm, luật chia đồ Luân phiên, EXP nhóm trong tầm 900 px | Should | chưa xong | M | T4.22 (xong) |
| T4.14 | `ui-hud-banners` | Dải biểu ngữ dưới giữa có thứ tự ưu tiên (BannerDock, hợp đồng .bn) | Should | chưa xong | M | T1.31 (xong), T0.03 |
| T4.15 | `ops-anticheat` | Chống gian lận: ngắt lũ gói, giới hạn sai mật khẩu theo tài khoản, băm token, vá đường dẫn HTTP, ipDaily cho mã quà, cờ nghi vấn, thử mờ mọi hành động | Must | chưa xong | M | T3.05, T2.02 |
| T4.16 | `pvp-arena` | Lôi đài xếp hạng 1-1 Elo, thưởng tuần | Should | xong | L | T4.21 (xong), T4.23 (xong) |
| T4.17 | `pvp-duel` | Thách đấu 1-1 (dừng ở 1 máu, không mất EXP) | Should | xong | S | T4.20 (xong) |
| T4.18 | `soc-chat` | Chat 5 kênh (bản đồ, thế giới, nhóm, gia tộc, mật) và lệnh nhanh | Must | xong | S | không |
| T4.19 | `soc-friends` | Bạn bè 50 người, báo online | Should | xong | S | T4.20 (xong) |
| T4.20 | `soc-invites` | Menu người chơi và lời mời 30 giây | Must | xong | S | T4.18 (xong) |
| T4.21 | `soc-mail` | Hộp thư 30 thư + giftcode theo tài khoản | Must | xong | M | không |
| T4.22 | `soc-party` | Nhóm 6 người chia EXP | Must | xong | S | T4.20 (xong) |
| T4.23 | `soc-rank` | Bảng xếp hạng 4 tab (cấp, gia tộc, diệt quái, lôi đài) | Should | xong | S | không |

**Lô thực hiện và thứ tự gộp.**

1. **4-A Đợt 3 lô 2 `titles`** (agent Claude): T4.01. Cổng 3627; được thêm mốc 150/199. Thêm móc `playerKilled`, `progress`.
2. **4-B Đợt 3 lô 3-4 gia tộc và chiến trường** (agent Claude): T4.02, T4.03, T4.04. Thứ tự gộp `clanwar` (bản đồ `tocchien`) → `battlefield` (chèn ngay sau dòng của clanwar trong `canPvp`/`damagePlayer`) → boss gia tộc 140/180 (lô S2-W3).
3. **4-C PvP** (agent Claude + Opus rà số): T4.05, T4.06, T4.07, T4.08, T4.09, T4.10. Hệ số PvP theo ADR-06-1, `pvpRes` theo ADR-05b-3. Đấu Trường có luật là mức C, làm khi dư công.
4. **4-D An toàn xã hội** (agent Claude): T4.11, T4.12, T4.13, T4.14, T4.15. Chặn, lọc, báo cáo (ADR-05c-2), EXP nhóm trong tầm 900 px (ADR-05c-3), dải biểu ngữ có thứ tự ưu tiên cho các HUD sự kiện.
5. **Đã xong, giữ hồi quy**: T4.16, T4.17, T4.18, T4.19, T4.20, T4.21, T4.22, T4.23. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 5: Tính năng đặc sắc

**Mục tiêu.** Đủ ≥ 10 tính năng đặc sắc mức M/S chạy thật: Kinh Mạch, thú cưỡi nuôi/tiến hóa, 22 thú cưỡi + 25 thú cưng, Thanh Ấn, Hợp Kích, Thức Tỉnh, Tháp Vô Tận, Ấn Đài, Sổ Nhẫn Giả, Nhân Duyên, Bế Quan, kênh bản đồ.

**Điều kiện vào.**

- GĐ4 đã ra.
- **T3.03** và **T1.01** đã gộp (Kinh Mạch, thú dùng `makeItem` theo grade và đồ khóa).

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `npm run verify -- --floor` không còn dòng thiếu thú cưỡi, thú cưng, tính năng đặc sắc.
- `node tools/balance.js --check` thoát mã 0
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`) (Nhân Duyên, xem trận)
- `npm run test:perf` giữ khoảng 60 khung/giây (thú mới, cut-in, kênh bản đồ)

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T5.01 | `sig-meridian` | Kinh Mạch: tu luyện hậu kỳ cộng chỉ số | Should | chưa xong | L | T1.01, T3.03, T2.01 |
| T5.02 | `pet-mountup` | Thú cưỡi nuôi và tiến hóa, thú cưng tiến hóa hình thái, pháp bảo sau lưng | Should | chưa xong | L | T1.01, T1.05, T5.01, T3.03 |
| T5.03 | `pet-beasts` | 22 thú cưỡi, 25 thú cưng, 8 kỹ năng thú, ghép mảnh | Must | chưa xong | L | T1.01, T2.01 |
| T5.04 | `art-cutin` | Khung cut-in Tuyệt Kỹ / Ấn Kỹ (dùng cho Thanh Ấn) | Should | chưa xong | M | T1.10 |
| T5.05 | `sig-thanhan` | Thanh Ấn: tích Ấn khí theo đòn trúng/chịu đòn/né hiểm, Ấn Kỹ riêng mỗi phái có cut-in | Should | chưa xong | M | T1.03, T5.04, T1.04 |
| T5.06 | `sig-hopkich` | Hợp Kích: đòn phối hợp khi đồng đội khác hệ ra chiêu trúng cùng quái trong 3 giây, Tam Tài Quy Nguyên đủ 3 hệ | Should | chưa xong | M | T5.05, T1.04, T1.03, T1.02 |
| T5.07 | `sig-thuctinh` | Thức Tỉnh cấp 100 và 150: vượt Tâm Ma Cảnh, chọn 1 trong 2 nhánh đổi cách chơi phái | Should | chưa xong | L | T2.01, T1.07, T1.01, T1.03, T1.02 |
| T5.08 | `pve-thapvotan` | Tháp Vô Tận: leo 150 tầng một mình, thủ lĩnh mỗi 10 tầng, BXH tuần 3 dải cấp | Should | chưa xong | L | T1.03, T1.01, T4.01 |
| T5.09 | `pve-dungeon-multi` | Ấn Đài Thượng Giới: 4 phó bản nhóm 3 ải (sóng quái, phá Trụ Phong Ấn, trùm) cho cấp 120-199 | Should | chưa xong | L | T2.21, T2.08, T3.09, T1.03 |
| T5.10 | `ops-state-culling` | Giảm băng thông gói state: bỏ trường tĩnh, gửi chênh lệch có khung khóa, lọc khung nhìn bản đồ rộng, ngưỡng bufferedAmount | Should | chưa xong | M | T0.02 |
| T5.11 | `world-channels` | Kênh bản đồ cho bãi luyện công (trần 40/60, tối đa 6 kênh, boss chỉ ở kênh 1) theo ADR-05d-1 | Should | chưa xong | L | T5.10 |
| T5.12 | `sig-sonhangia` | Sổ Nhẫn Giả: sưu tầm quái, boss, vật phẩm, thú, thời trang; hạng sổ có trần chỉ số; hiệu ứng tên | Should | chưa xong | M | T4.01 |
| T5.13 | `soc-nhanduyen` | Nhân Duyên: thân thiết, sư đồ, kết nghĩa, kết duyên có kỹ năng đôi | Should | chưa xong | L | T1.01, T4.01, T4.19 (xong), T4.22 (xong) |
| T5.14 | `sig-bequan` | Bế Quan: EXP khi không online có trần 10 giờ, ủy thác lượt hằng ngày bỏ lỡ hôm qua | Should | chưa xong | S | T1.01, T3.04, T0.14 |
| T5.15 | `soc-bieucam` | Biểu cảm, ngồi thiền, chụp ảnh nhóm | Could | chưa xong | S | không |
| T5.16 | `world-hidden` | Bản đồ ẩn, lối tắt và câu đố địa hình | Could | chưa xong | M | T2.20, T2.18, T2.08, T2.16, T1.01, T2.23 |
| T5.17 | `pve-bicanh-phuchu` | Bí Cảnh Phù Chú: phó bản 8 ải ngẫu nhiên, chọn phù chú sau mỗi ải | Could | chưa xong | L | T5.08, T1.02 |
| T5.18 | `sig-nghephu` | Nghề phụ: câu cá, hái thuốc, luyện đan | Could | chưa xong | L | T3.03, T3.01, T3.22 |
| T5.19 | `sig-nharieng` | Nhà riêng trang trí, mời bạn ghé | Could | chưa xong | L | T0.07 |
| T5.20 | `clan-siege` | Công thành chiến gia tộc hằng tuần | Could | chưa xong | L | T4.02, T3.01 |
| T5.21 | `cmb-khinhcong` | Khinh Công: bám tường, nhảy tường, lướt trên không | Could | chưa xong | L | T1.03 |
| T5.22 | `pet-fashion` | Thời trang 3 ô (mặt nạ, áo choàng, y phục) có chỉ số, bản có hạn 7 ngày | Should | xong | M | không |
| T5.23 | `pet-mount` | Thú cưỡi (5 loài) tăng tốc chạy ngoài trần | Must | xong | M | không |
| T5.24 | `pet-pets` | Thú cưng có cấp, thân mật, thức ăn, kỹ năng nhặt đồ/hồi máu | Must | xong | M | không |
| T5.25 | `pve-dungeon` | Hang Động Thử Thách: phó bản nhóm 5 đợt, 3 lượt/ngày | Should | xong | M | không |

**Lô thực hiện và thứ tự gộp.**

1. **5-A Đợt 3 lô 3-4 `meridian` → `mountup`** (agent Claude): T5.01, T5.02. Kinh Mạch theo ADR-05a-2 (`capLv ≤ MAX_LEVEL`, `shareHi: 0.3`); `mountup` chèn sau `ghost` của phân thân và sau `exp` của Kinh Mạch.
2. **5-B Thú (S1-K → S2-S → S2-MA → S2-MB → S2-P1..P3 → S2-PI → S3-U)** (agent Claude): T5.03. Khung dữ liệu và hình (cổng 3760-3769), mức chặn chỉ số thú cưỡi theo ADR-05e-1. Đạt sàn ≥ 20 thú cưỡi, ≥ 25 thú cưng.
3. **5-C Chiến đấu đặc sắc** (agent Claude + Opus rà cân bằng): T5.04, T5.05, T5.06, T5.07. Khung cut-in trước, Thanh Ấn (ADR-04-1) sau, Hợp Kích chỉ PvE ở 1.0.
4. **5-D PvE và kênh bản đồ** (agent Claude): T5.08, T5.09, T5.10, T5.11. Giảm băng thông gói `state` trước khi chia kênh (ADR-05d-1).
5. **5-E Xã hội đặc sắc** (agent Claude): T5.12, T5.13, T5.14. Bế Quan theo ADR-04-3 (một nguồn tiến độ offline, có trần).
6. **5-F Mức C khi dư công** (agent Claude): T5.15, T5.16, T5.17, T5.18, T5.19, T5.20, T5.21. Chỉ nâng hạng khi đạt điều kiện ghi trong `acceptance`; cửa ẩn theo ADR-07-4.
7. **Đã xong, giữ hồi quy**: T5.22, T5.23, T5.24, T5.25. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 6: Sự kiện và lễ hội

**Mục tiêu.** Khung lễ hội bản 2 (file mùa, việc lễ hội, quà theo cấp), Lịch Sự Kiện, đủ 7 lễ hội (Tết, Valentine, 30-4, Hè, Trung Thu, Halloween, Noel), Hung Tinh, Tà Thú hậu kỳ, Yêu Quái Lễ Hội, Thủ Hộ Làng, Lôi Đài Tam Hùng, Nhẫn Giả Lệnh.

**Điều kiện vào.**

- GĐ5 đã ra (mùa mới cần `EVENT_LOOKS`, icon token, `box_lehoi`/`chest_up`).
- Mùa đến trước khi GĐ6 xong đi theo **đường khẩn** (lô 6-0).

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `npm run verify -- --floor` đếm đủ 7 dịp lễ (khóa `fest` trong `SEASONS`).
- `npm run check`: lịch không chồng khung `excl`, Giờ Vàng không chồng, `gift.on` nằm trong mùa.
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:perf` giữ khoảng 60 khung/giây khi mùa có hạt bay (≥ 55 khung/giây)
- Ảnh làng có Sứ Giả + trang trí của từng mùa, cửa sổ Lễ hội 2 tab, cửa sổ Lịch 3 tab, desktop và điện thoại.

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T6.01 | `evt-season-plus` | Lễ hội bản 2: tách file mùa, việc lễ hội 3/ngày, quà theo cấp @, Sứ Giả đổi ngoại hình, trang trí làng, quà ngày chính lễ | Must | chưa xong | L | T6.24 (xong) |
| T6.02 | `evt-calendar` | Lịch Sự Kiện 3 tab (ngày, tuần, năm), Giờ Vàng ra dữ liệu và thêm khung cuối tuần | Should | chưa xong | M | không |
| T6.03 | `evt-noel` | Lễ Hội Đêm Đông An Lành (12/12-04/01): Chuông Ngân, Y Phục Tuyết Đông, Tuần Lộc Đêm Đông, cây thông và tuyết | Must | chưa xong | M | T6.01 |
| T6.04 | `evt-tet` | Hội Xuân (Tết): Bao Lì Xì, Áo Dài Xuân Thắm, Lân Vàng Nghênh Xuân, cây nêu và mai đào | Must | chưa xong | M | T6.01 |
| T6.05 | `evt-valentine` | Mùa Hoa Tình Nhân (14/02-08/03): Đóa Hồng Thắm, Áo Choàng Hồng Tâm, đèn trái tim | Must | chưa xong | M | T6.01 |
| T6.06 | `evt-304` | Lễ Hội Đất Tổ (Giỗ Tổ, 30/4, 1/5): Bánh Giầy, Áo Tứ Thân Kinh Bắc, cờ ngũ sắc và trống đồng | Must | chưa xong | M | T6.01 |
| T6.07 | `evt-he` | Hội Hè Biển Xanh (01/06-15/08): Vỏ Sò Biển Hạ, Kính Râm Sóng Bạc, dù và phao | Must | chưa xong | M | T6.01 |
| T6.08 | `evt-trungthu` | Lễ Hội Trăng Rằm 2027 (trangram2027, từ 2027-09-04): việc lễ hội, Sứ Giả, đèn lồng, Mặt Nạ Thỏ Ngọc; trangram2026 chỉ tách file, giữ nguyên bảng đổi | Must | chưa xong | M | T6.01 |
| T6.09 | `evt-halloween` | Đêm Hội Hóa Trang (23/10-07/11, từ 2027): Kẹo Bí Ngô, Mặt Nạ Bí Ngô Ma Trơi, Áo Choàng Dạ Bức, bí ngô phát sáng | Must | chưa xong | M | T6.01 |
| T6.10 | `pve-worldboss` | Hung Tinh Giáng Thế: 5 khung/ngày, 9 dải cấp, 18 boss wb_*, máu theo người online | Should | chưa xong | L | T6.02, T1.03, T5.11 |
| T6.11 | `pve-tathu-199` | Tà Thú cấp 130/160/190 và chọn boss theo người online (pickTathu) | Should | chưa xong | M | T6.10, T1.03 |
| T6.12 | `evt-festival-boss` | Yêu Quái Lễ Hội: 7 boss lễ × 3 bậc (40/100/160), thay lượt Tà Thú 12:30 và 22:30 khi có mùa | Should | chưa xong | M | T6.01, T6.11 |
| T6.13 | `evt-village-defense` | Thủ Hộ Làng: phòng thủ Linh Thạch qua 5 đợt lúc 12:00 và 21:00 | Should | chưa xong | M | T3.04, T1.01, T3.01, T6.02 |
| T6.14 | `pvp-arena-3v3` | Lôi Đài Tam Hùng 3 đấu 3 có Elo riêng, khung giờ cố định, xem trận trực tiếp | Should | chưa xong | L | T4.16 (xong), T4.22 (xong), T6.02 |
| T6.15 | `sig-nhangialenh` | Nhẫn Giả Lệnh: kỳ 28 ngày 40 bậc, nhánh miễn phí đồ khóa, Kim Lệnh 300 lượng chỉ ngoại hình | Should | chưa xong | S | T6.02, T3.04, T1.01, T3.23 |
| T6.16 | `sig-thoitiet` | Thời tiết ảnh hưởng chiến đấu theo hệ | Could | chưa xong | M | T6.02 |
| T6.17 | `pet-wardrobe` | Tủ ngoại hình lưu kiểu đã sở hữu, nhuộm màu thời trang | Could | chưa xong | M | T5.22 (xong) |
| T6.18 | `pet-mount-skin` | Hoán Hình Thú Cưỡi: 6 kiểu ngoại hình thú cưỡi 0 chỉ số (4 bán lượng, 2 đổi token lễ hội) trong Tủ Ngoại Hình | Could | chưa xong | M | T6.17, T5.03, T3.07 |
| T6.19 | `pet-appearance-fx` | Hiệu ứng ngoại hình: hào quang bộ thời trang, dấu chân, vệt theo thú cưỡi | Could | chưa xong | M | T5.02 |
| T6.20 | `evt-login-rewards` | Điểm danh lịch tháng có bù ngày, vòng quay lượng tối đa 20 lượt/ngày và mốc tuần 10/30/60 | Could | chưa xong | M | T6.23 (xong) |
| T6.21 | `sig-bachquy` | Bách Quỷ Dạ Hành: đoàn quỷ đi qua bãi luyện ban đêm, gộp vào lễ hội | Could | chưa xong | M | T6.09, T6.13 |
| T6.22 | `sig-aptieu` | Áp Tiêu xuyên vùng: hộ tống xe hàng, cướp tiêu có luật | Could | chưa xong | M | T3.04 |
| T6.23 | `evt-checkin` | Điểm danh 7 ngày và Vòng Quay May Mắn | Should | xong | M | không |
| T6.24 | `evt-season-core` | Khung lễ hội theo mùa: SEASONS, rơi token, Sứ Giả đổi quà, /sukien | Must | xong | M | không |
| T6.25 | `pve-tathu` | Tà Thú Xuất Thế mỗi 2 giờ (giờ chẵn :30, 20 phút, thưởng theo hạng) | Should | xong | M | không |

**Lô thực hiện và thứ tự gộp.**

1. **6-0 Đường khẩn theo mùa** (agent Claude, song song từ GĐ1). Mùa có ngày thật trước khi GĐ6 xong được phát hành tối thiểu trên khung **T6.24** đang chạy: file mùa + token + icon + Sứ Giả mặc đồ mùa + thời trang mùa (lô S4-W5/W6 rút gọn, S3-W12, S3-W13). Việc lễ hội và boss lễ bật khi **T6.01** và **T6.12** vào. Hạn lên máy chủ ở bảng "Mốc thời gian".
2. **6-A Khung lễ hội và lịch** (agent Claude): T6.01, T6.02. Lô S2-W4 (lễ hội lõi) + S2-W15 (trang trí làng theo mùa) rồi S4-W16 (HUD + cửa sổ Lịch).
3. **6-B Bảy lễ hội (S4-W5 → W6 → W7 → W8)** (agent Claude): T6.03, T6.04, T6.05, T6.06, T6.07, T6.08, T6.09. Mỗi mùa đủ 7 dòng chuẩn + 2 dòng hậu kỳ chung (`box_lehoi`, `chest_up`). Mùa đã bắt đầu không sửa số đổi quà.
4. **6-C Boss sự kiện (S1-W1 → S1-W2 → S2-W14)** (Opus (S1-W1, kinh tế) + agent Claude): T6.10, T6.11, T6.12. Hung Tinh 5 khung/ngày, thưởng theo hạng sát thương, người vượt cấp không có thưởng; hình 23 boss.
5. **6-D Hoạt động có lịch** (agent Claude): T6.13, T6.14, T6.15, T6.16. Thủ Hộ Làng 12:00/21:00; Tam Hùng theo ADR-04-2 (người xem là nhân vật ẩn).
6. **6-E Ngoại hình và mức C** (agent Claude): T6.17, T6.18, T6.19, T6.20, T6.21, T6.22. Tủ ngoại hình theo ADR-05e-2. Sau cùng lô L1 nối nguồn thú/mảnh: `BEAST_DROPS` cho boss Hạ Giới, Tà Thú mới, Hung Tinh dải ≥ 128; dòng mảnh vào các mùa **chưa** bắt đầu, `ARENA.weekly`, `BATTLE.shop`.
7. **Đã xong, giữ hồi quy**: T6.23, T6.24, T6.25. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 7: Âm thanh và hoàn thiện

**Mục tiêu.** Âm thanh đạt ngân sách và có dự phòng tổng hợp, nhạc cho nội dung 121-199 và lễ hội, rà soát điện thoại và trợ năng, nhắc việc trong ngày, gói dữ liệu qua HTTP, CI trình duyệt hằng đêm, đổi tên NPC phiên âm; tổng kiểm trước tải.

**Điều kiện vào.**

- GĐ6 đã ra.

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `npm run verify -- --browser` đạt
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors` (cả `tests/e2e/audio.js`)
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`)
- `npm run test:perf` giữ khoảng 60 khung/giây khi bật nhạc tổng hợp bài boss
- `node tools/balance.js --check` thoát mã 0
- `CHECK_RELEASE=1 npm run check` không có dòng lỗi
- Tổng kiểm L2: chụp đủ bộ ảnh (mỗi vùng 1 bãi + trạm, Kỳ Trân Các, Lịch, Hung Tinh, thú mới), rà `DESIGN_RULES.md` mục 9 và bảng `CLAUDE.md` khớp mã.

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T7.01 | `snd-audio-files` | Nhạc nền, tiếng hiệu ứng từ file tự tạo (ACE-Step 1.5 / Stable Audio 3), WebAudio dự phòng, thanh âm lượng | Should | chưa xong | M | T0.01 |
| T7.02 | `snd-synth-music` | Nhạc nền tổng hợp WebAudio thủ tục cho mọi bài (dự phòng bắt buộc, chế độ tiết kiệm dữ liệu, lớp cuồng nộ) | Should | chưa xong | M | T7.01 |
| T7.03 | `snd-content-199` | 15 bài nhạc mới (theme mới, boss hậu kỳ, sự kiện, 7 lễ hội) + 44 tiếng hiệu ứng mới | Should | chưa xong | M | T7.01, T7.02, T2.07, T6.24 (xong) |
| T7.04 | `ui-mobile-pass` | Rà soát điện thoại: vùng chạm ≥ 44px, chữ ≥ 15px, không tràn; script ui-audit bắt buộc | Must | chưa xong | M | T0.03 |
| T7.05 | `ui-a11y` | Trợ năng: phóng chữ 115/130%, giảm chuyển động, phân biệt độ hiếm bằng hình, rung máy, bàn phím, tên cho trình đọc màn hình | Should | chưa xong | M | T7.04 |
| T7.06 | `ui-notify-center` | Việc Hôm Nay: chấm đỏ thống nhất, lời nhắc lịch sự kiện, nhật ký thông báo | Should | chưa xong | M | T6.02, T4.14 |
| T7.07 | `ui-settings-sync` | Cài đặt tự đánh lưu theo nhân vật trên server; tùy chỉnh cỡ và vị trí D-pad, cụm kỹ năng | Could | chưa xong | M | T7.14 (xong) |
| T7.08 | `core-gameloop-split` | Tách game/game.js theo nhóm xử lý gói (game/handlers/) sau đợt 3 | Could | chưa xong | M | T4.03, T5.02 |
| T7.09 | `ops-data-http` | Gói dữ liệu tĩnh tải qua HTTP /data.json?v= có gzip và lưu đệm vĩnh viễn, dự phòng dataFull (ADR-10-3) | Should | chưa xong | S | T0.06 |
| T7.10 | `dev-ci-browser` | CI hằng đêm chạy npm run verify -- --browser và test:perf bằng Playwright | Should | chưa xong | S | T0.06 |
| T7.11 | `quest-npc-rename` | Đổi tên 15 NPC phiên âm và tên Slime/Pharaoh sang Hán-Việt/thuần Việt (giữ id) | Should | chưa xong | S | không |
| T7.12 | `ui-i18n` | Đa ngôn ngữ (không làm ở 1.0) | Won't | chưa xong | L | không |
| T7.13 | `ui-portrait` | Màn dọc trên điện thoại (không làm ở 1.0) | Won't | chưa xong | L | không |
| T7.14 | `ui-settings` | Cài đặt: tự uống thuốc, phạm vi tìm quái, hiện tên, âm thanh, ngày/đêm, rung | Must | xong | S | không |
| T7.15 | `ui-title` | Màn mở đầu: đăng nhập, chọn/tạo nhân vật, thẻ phái, trạng thái máy chủ | Must | xong | M | không |

**Lô thực hiện và thứ tự gộp.**

1. **7-A Âm thanh** (agent Claude): T7.01, T7.02, T7.03. Phần file đã commit ở lô 0-A; còn nén nhạc ≤ 520 KB/bài (đo bài lớn nhất 897 KB, tổng `.ogg` nhạc 21,1 MB), đưa `CREDITS.md` vào ảnh Docker, đo ≤ 2 MB âm thanh trong 10 phút đầu (ADR-09-1).
2. **7-B Giao diện** (agent Claude): T7.04, T7.05, T7.06, T7.07. Phóng chữ theo ADR-05f-2, dời/đổi cỡ D-pad theo ADR-05f-3; không nhắc ngoài game bằng thông báo đẩy (ADR-05f-1 từ chối).
3. **7-C Mã và dữ liệu** (Opus + agent Claude): T7.08, T7.09, T7.10. Tách `game/game.js` chỉ sau khi đợt 3 đã gộp hết; gói `data` qua HTTP theo ADR-10-3.
4. **7-D Nội dung** (agent Claude): T7.11. Bảng tên mục 08 mục 5.6, giữ id để không vỡ dữ liệu lưu.
5. **7-W Không làm ở 1.0** (ghi để không bàn lại): T7.12, T7.13. Muốn làm phải có ADR mới.
6. **Đã xong, giữ hồi quy**: T7.14, T7.15. Không sửa trừ khi lô khác buộc phải chạm; kiểm thử cũ không được xóa.

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Sao lưu `data/` trên VPS → `git archive` từ commit đã gộp của `main` → chép lên `/srv/ninja-school/ninja-app.tgz` → chạy `/srv/ninja-school/redeploy.sh` (container `ninja-school`, cổng 127.0.0.1:3210) → kiểm `/api/status`, đăng nhập thử bằng tài khoản riêng, chụp 1 ảnh production, xem lại các site khác trên VPS. Khung giờ: ngày thường 09:00-11:00 hoặc 14:00-16:00 giờ Việt Nam, tránh giờ sự kiện.

## Giai đoạn 8: Tải và vận hành

**Mục tiêu.** Giám sát, triển khai thống nhất bằng image CI theo SHA, đo tải 300 người online trên một tiến trình, bảo mật tài khoản, trang quản trị GM, đổi tên nhân vật; nạp tiền thật chỉ khi có ADR-11-1 và xác nhận pháp lý.

**Điều kiện vào.**

- GĐ7 đã ra, tổng kiểm L2 sạch.

**Điều kiện ra** (chạy ở cổng riêng, `DATA_DIR` riêng, không đụng server dùng chung).

- `npm run verify` (trước khi có lệnh này: `npm run check` rồi `npm test`)
- `npm run verify -- --floor` mã 0 (đủ sàn 1.0).
- `CHECK_RELEASE=1 npm run check` không có dòng lỗi
- Đo tải: ngưỡng K1-K6 đạt ở 300 người online, báo cáo K7 ở 500.
- `npm run test:e2e` máy tính và `MOBILE=1` (server riêng, `BASE_URL`, `ACC` có trong `ADMINS`, `NODE_PATH=$(npm root -g)`) in `E2E ĐẠT` và `OK no console errors`
- `npm run test:ui` (server có `ADMINS=duoalpha,duobravo`)
- `npm run test:perf` giữ khoảng 60 khung/giây
- Sao lưu ngoài máy chạy và khôi phục thử thành công.

**Tính năng.**

| Mã | id | Tên | Ưu tiên | Trạng thái | Cỡ | Phụ thuộc |
|---|---|---|---|---|---|---|
| T8.01 | `ops-monitoring` | Giám sát: /api/status gọn có ok/503, /api/metrics có token, log JSON một dòng, cảnh báo webhook | Must | chưa xong | M | T0.07, T0.08 |
| T8.02 | `ops-deploy` | Triển khai thống nhất ninja.iqx.vn: image CI theo SHA, Node 24, chạy không root, HEALTHCHECK, mem_limit, xoay log, redeploy.sh có quay lui | Must | chưa xong | M | T8.01, T0.08, T0.06 |
| T8.03 | `ops-load-test` | Đo tải 300 người online trên một tiến trình (K1-K6 ngưỡng 1.0, K7 sức chịu 500 người) | Must | chưa xong | M | T8.01, T0.10, T0.09 |
| T8.04 | `ops-account-security` | Bảo mật tài khoản: đổi mật khẩu, mật khẩu cấp 2 khóa thao tác giá trị, mã khôi phục | Should | chưa xong | M | T2.02, T3.05, T0.09 |
| T8.05 | `ops-gm-panel` | Trang quản trị GM /gm/: tra cứu/sửa nhân vật offline, khóa tài khoản, cấm chat, kinh tế, khôi phục, bảo trì (ADR-10-4) | Should | chưa xong | L | T3.05, T8.01, T0.10, T0.08 |
| T8.06 | `char-rename` | Đổi tên nhân vật bằng Thẻ Cải Danh, cập nhật mọi bảng dùng tên làm khóa | Could | chưa xong | M | T0.17 (xong), T0.10 |
| T8.07 | `mon-topup` | Nạp tiền thật mua lượng: cửa sổ Nạp Lượng 4 tab, đơn hàng, bộ chuyển đổi nhà cung cấp + nhà cung cấp giả mock, tự giới hạn chi tiêu (cổng thật ngoài phạm vi, ADR-11-1) | Could | chưa xong | L | T3.07, T3.23, T3.05, T8.04, T0.08 |
| T8.08 | `mon-monthly-card` | Thẻ Nguyệt Bổng 30.000 đ: 300 lượng ngay + 20 lượng/ngày × 30 ngày, tích tối đa 7 ngày, không chỉ số | Could | chưa xong | S | T8.07 |
| T8.09 | `mon-rmt` | Giao dịch tiền thật giữa người chơi (Won't: không xây, giữ rào chắn) | Won't | chưa xong | S | T1.01, T3.01 |
| T8.10 | `ops-cross-server` | Liên máy chủ (ghép nhiều cụm chơi chung) | Won't | chưa xong | L | không |

**Lô thực hiện và thứ tự gộp.**

1. **8-A Vận hành** (Opus): T8.01, T8.02, T8.03. Từ đây triển khai bằng image theo SHA (ADR-10-5), không dùng `git archive` tay nữa.
2. **8-B Tài khoản và GM** (Opus + agent Claude): T8.04, T8.05, T8.06. Trang GM theo ADR-10-4; đổi tên nhân vật theo ADR-05e-3 (móc `charRenamed`).
3. **8-C Kiếm tiền (mức C)** (Opus, chỉ khi có ADR-11-1 được duyệt và văn bản pháp chế): T8.07, T8.08. Mặc định `PAY_PROVIDER=off`; lượng là một loại, chợ bằng lượng giữ 3 rào (ADR-11-2).
4. **8-W Không làm ở 1.0** (ghi để không bàn lại): T8.09, T8.10. Muốn làm phải có ADR mới (SQLite cũng chưa làm, ADR-10-2).

**Triển khai lên ninja.iqx.vn sau giai đoạn.** Từ giai đoạn này production kéo image CI theo SHA (lô 8-A); mở bản 1.0 khi mọi điều kiện ra đạt.

## Rủi ro

| # | Rủi ro | Ảnh hưởng | Cách giảm | Liên quan |
|---|---|---|---|---|
| 1 | Toàn bộ đợt 1-2B (`5a50602`), tái cấu trúc, túi đồ, âm thanh chỉ có ở thư mục làm việc và nhánh mốc, chưa vào `main`; index trộn việc GĐ1/GĐ2 | mất việc nếu thao tác git sai; production lệch `main` | lô 0-A làm đầu tiên, dựng `main` từ chuỗi commit, so `git diff` với index trước khi đẩy, không `checkout`/`stash` trên thư mục làm việc, giữ nhánh mốc tới khi `main` triển khai xong | T0.01, T0.02 |
| 2 | Âm thanh 47 MB (nhạc `.ogg` 21,1 MB, bài lớn nhất 897 KB) vượt ngân sách ADR-09-1 | kho git phình, tải chậm trên 4G | nén Opus 40-48 kbps trước khi commit hoặc ngay lô 7-A; tải lười theo bản đồ; nhạc tổng hợp làm dự phòng | T7.01, T7.02 |
| 3 | Lễ hội theo ngày thật: Đêm Đông 2026-12-12, Hội Xuân 2027-01-28, Tình Nhân 2027-02-14, Đất Tổ 2027-04-10 đến trước GĐ6 | trễ mùa là mất dịp cả năm | lô 6-0 đường khẩn trên khung lễ hội có sẵn; hạn lên máy chủ trước ngày mở mùa 7 ngày | T6.03, T6.04, T6.05, T6.06 |
| 4 | Điểm nóng `monsters.js`, `maps.js`, `items/index.js`, `combat.js`, `game.js` bị nhiều lô sửa | xung đột gộp, ghi đè | chỉ Opus (nền tảng) và lô được chỉ định sửa, mỗi lô một khối có chỗ chèn cố định; xung đột "danh sách" giữ cả hai bên, hai lô sửa cùng một dòng thì dừng | T2.01, T3.15 |
| 5 | Đặc tả đợt 3 viết cho cấp 120, nền tảng 199 vào trước lô 2-4 | giới hạn cấp sai, kiểm thử hỏng | giao kèm dòng tương thích (00-foundation mục 7.3) cho `dungeons`, `dailies`, `titles`, `meridian`, `battlefield`, `market` | T2.21, T3.04, T5.01 |
| 6 | Hiệu năng: 69 bản đồ mới, rồng tỉ lệ 1,6, `starfield` 220 sao, 9 Hung Tinh cùng lúc | rớt dưới 60 khung/giây trên điện thoại | `test:perf` sau GĐ2 và sau lô thú; giảm hạt theo `body.touch` | T2.07, T6.10 |
| 7 | Kinh tế: thưởng kiểu nhiệm vụ trả xu thường, gói lượng không giới hạn | lạm phát, phá P5 | quy tắc G12 (xu khóa/đồ khóa), sổ cái lượng, trần 60 lượng/ngày, mô phỏng trước khi đổi số | T1.01, T3.07, T3.22 |
| 8 | Lưu JSON toàn bộ mỗi lần khi đông người | giật vòng lặp, mất dữ liệu khi sập | lưu theo nhân vật, ghi phần bẩn, sao lưu tầng | T0.10, T0.08 |
| 9 | Kiểm thử chập chờn (ca thú cưng nhặt đồ) | chặn gộp sai, mất tin vào `npm test` | làm ổn định trong lô 0-D, đạt 10/10 lần liên tiếp | T0.15 |
| 10 | Pháp lý: giấy phép tiếng (Stability AI Community License), thu phí | không mở công khai được | đăng ký giấy phép miễn phí ở GĐ8, nếu không được thì tạo lại tiếng bằng model Apache-2.0; nạp tiền chỉ bật khi có văn bản pháp chế | T8.07, T7.01 |
| 11 | Nhiều agent sửa cùng file trong một đợt | ghi đè lẫn nhau | phân vùng theo bảng của `CLAUDE.md`, mỗi lô một cổng và `DATA_DIR` riêng (3621-3633, 3641-3648, 3651-3664, 3700-3708, 3711-3716, 3730-3743, 3760-3780) | mọi lô |

## Điều chỉnh khi ghép sổ tính năng

Các giai đoạn và phụ thuộc dưới đây khác bản đăng ký của mục sở hữu, lý do ghi trong `notes` của từng tính năng:

- T1.01 dời GĐ3 → GĐ1: đang làm cùng cân bằng (đợt 3 lô 1) và ba tính năng GĐ2 cần xu khóa.
- T3.10 dời GĐ2 → GĐ3: cần bậc trang bị 12-19 (T3.09).
- T3.04 dời GĐ2 → GĐ3: `specs/PLAN.md` đặt Việc Làng sau chợ (T3.01) vì cần làng rộng 1800.
- T6.14 và T6.16 dời GĐ5 → GĐ6: cần khối lịch và kiểm không chồng giờ (T6.02).
- T3.21 nâng Should → Must vì hai tính năng Must cần công cụ mô phỏng (quy tắc 4).
- Bỏ 4 vòng phụ thuộc (cut-in ↔ Thanh Ấn, màu bậc ↔ trang bị bậc, trạm ↔ tờ Thượng Giới, theme/quái ↔ tờ Thượng Giới) và 3 phụ thuộc Must → Should (quái Thượng Giới → gallery, mô hình kinh tế → bảng rơi, Thợ Rèn mở rộng); mốc băm đồ họa không chờ CI hằng đêm.
- Đổi số ADR trùng: `ADR-05-1`, `ADR-05-2` của `05-he-thong-chien-dau.md` thành `ADR-05a-1`, `ADR-05a-2`; `ADR-05-1` đến `ADR-05-4` của `05-he-thong-trang-bi.md` thành `ADR-05b-1` đến `ADR-05b-4` (đã sửa trong các file mục).
- T1.08 và T2.30 nâng Should → Must (soát lần 2): T1.06 và T2.09 là Must phụ thuộc chúng (quy tắc 4); T2.30 đã xong nên không đổi công, T1.08 vốn là điều kiện của ĐIỂM DỪNG 1. Đây là cặp Must → Should còn sót sau lần gỡ 3 cặp ở trên.
- Bản vá ADR-06-2 (thưởng EXP việc ngày, trần hệ số EXP quái ×3) và tiêu chí `sim-exp` chuyển từ T2.01 sang T3.10, vì cần `errandReward` của T3.04 và `tools/sim-exp.js` của T3.21 (cả hai ở GĐ3); khớp 06 Q9 "áp sau lô dailies và F1". T2.01 nhận thêm trần cấp `LEVEL_CAP` theo vùng đã phát hành (07 mục 12) và việc mở 20 bậc trong `items/base.js` (một chủ, đúng N1 của `content/PLAN.md`); T1.06 chỉ giữ 3 mảng màu nhân vật, T3.09 giữ Thần binh và ảnh mặc đủ bộ vật phẩm.
- Tiêu chí "sách 150 có boss rơi" chuyển từ T1.07 sang T2.12 (boss vùng Hoàng Lăng cấp 150-159) vì ở GĐ1 boss cao nhất là cấp 125. T6.08 nhắm mùa `trangram2027` (2027-09-04) vì `trangram2026` kết thúc 2026-11-08, trước GĐ6.
- Khung `tests/e2e/ui-audit.js` (cảnh `ask`, `ask-danger`) do T0.03 tạo; T7.04 chỉ mở rộng ra mọi cửa sổ. T2.26, T3.19, T4.14 thêm phụ thuộc T0.03. Thêm phụ thuộc theo `specs/PLAN.md` mục 2: T3.03 ← T1.01 (bound ► crafting), T3.04 ← T3.01 (market ► dailies), T5.02 ← T1.05, T5.01, T3.03 (clone, meridian, crafting ► mountup).
- (a) `specs/PLAN.md` đòi lô sau chỉ bắt đầu khi lô trước đã gộp; lộ trình gộp `clone` (lô 3, T1.05) ở GĐ1, trước `dungeons`, `market`, `crafting`, `titles` của lô 2. Đã kiểm bảng file lõi mục 4: `clone` chỉ cần `status` (T1.04, cùng GĐ1, gộp trước) và sửa `case` trong switch của `combat.js`, `ghost` trong `sprites.js`, `fx.js`, `style.css`, cuối `bind` của `game.js`, cuối danh sách `modules/index.js`, `ui.js`; bốn tính năng còn lại của lô 2 không sửa chung dòng nào (chỉ chung xung đột "danh sách", giữ cả hai bên theo mục 5.3). Thứ tự status → clone → mountup giữ nguyên.
- (b) `content/PLAN.md` đặt nền tảng N1 trước luồng A (đợt 3 lô 2-4) và viết dòng tương thích cho `dungeons`, `dailies`, `titles`, `meridian`, `battlefield`, `market`. Lộ trình để `status`, `clone` (GĐ1) và phần kỹ năng của N1 (T1.07) trước T2.01. `status` và `clone` không có dòng tương thích nào phụ thuộc cấp tối đa; sáu đặc tả có dòng tương thích đều gộp sau T2.01 (T2.21 ở lô 2-E, T3.01, T3.04 ở GĐ3, T4.01, T4.03 ở GĐ4, T5.01 ở GĐ5). T1.07 chỉ thêm dữ liệu kỹ năng, sách, icon; kỹ năng cấp 130/160 kiểm bằng kiểm thử đơn vị tới khi T2.01 vào.
- (c) `content/PLAN.md` mở S1 (gồm S1-KD) sau khi cả hai luồng GĐ2 đã gộp; lộ trình để S1-KD (T2.23, T2.24) ở GĐ2 và `meridian`, `mountup` (đợt 3 lô 3-4) ở GĐ5. S1-KD chỉ tạo file mới (`sidequests/*`, `modules/sidequest/`) và sửa `windows/quest.js`, cuối `features.css`, một dòng ở danh sách module/admin/smoke/harness/check-data; không chạm điểm nóng `monsters.js`, `maps.js`, `items/index.js`, và vẫn chờ T2.17 (đủ 8 vùng). `meridian`, `mountup` gộp sau `crafting` (T3.03) như `specs/PLAN.md`; khi T3.15 (S1-I1) đã gộp trước thì `mountup.build()` chèn ngay trước dòng build của S1-I1 để giữ thứ tự build của `items/index.js`.
- Đổi tên tránh trùng tên của game tham khảo: "Hang Động Cấp Bậc" thành **Thí Luyện Động**, "lãnh địa gia tộc" thành **Tộc Địa** (NPC Thủ Hộ Tộc Địa); id của T2.21, T4.02 và bản đồ `lanhdia` giữ nguyên.
