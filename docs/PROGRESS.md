# Nhật ký tiến độ

Ghi sau mỗi tính năng / mỗi lần đổi mốc ảnh. Mới nhất ở trên.

## 2026-10-19

### GĐ0: ui-ask-dialog, ui-bag-expand, ui-bag-bulkdrop, ops-commit-restructure, core-restructure → done

- Khung `tests/e2e/ui-audit.js` (`npm run test:audit`, bước 8h của verify) kiểm từng cảnh ở 4 cỡ màn: 1280×720, 844×390, 740×360, 667×375. Có 4 cảnh: `ask`, `ask-danger`, `bag-pages`, `bag-pick`.
- Lỗi khung test tìm ra và đã sửa:
  - nút của hộp `ask()` trên cảm ứng chỉ cao 27 px, nay ≥ 44 px;
  - hộp `danger` trả `true` khi bấm Enter: nay nút Thôi được focus sẵn và Enter là hủy;
  - Tab thoát ra khỏi hộp: nay xoay vòng trong hộp;
  - mảng chuỗi trong `text` bị dính liền: nay mỗi chuỗi một dòng;
  - hàng nút chuyển trang của túi bị cắt trên màn cao 390: điện thoại nay dùng bộ ◀ n/N ▶ trên hàng tiêu đề;
  - màn 667 px đẩy túi xuống dưới trang bị: màn hẹp nay xếp túi lên trước.
- Còn lại cho `ui-mobile-pass`: cửa sổ Hành trang ở màn cao ≤ 390 px vẫn phải cuộn để xem hết cột trang bị.
- `tests/features/repo.js` kiểm:
  - lịch sử main theo D-01 (8 nhóm commit đúng thứ tự);
  - không có commit tạm, không có file cấm;
  - cây của nhóm âm thanh trùng a4b4a0a;
  - DESIGN_RULES khớp hằng số;
  - CI dùng Node 24 và verify;
  - `git status` sạch khi chạy trên bản clone.
- CI chạy `npm run verify -- --no-browser --no-load` (D-06). `check:features` bỏ qua bằng chứng nằm trong log của bước không chạy. `--prod` thêm bước `test:prod`.
- Test chập chờn đã sửa:
  - boss "lần niệm 2": thêm hồi máu, đứng đúng mặt đất, đánh một đòn để boss nhận mục tiêu;
  - người thứ hai G đứng ngoài tầm 360 px của chiêu cột;
  - Dùng nhiều chọn chồng lớn nhất.
- Ảnh: `docs/shots/ui-ask-dialog`, `ui-bag-expand`, `ui-bag-bulkdrop`, `item-use-many`, `cmb-auto-plus`.

## 2026-10-18 (tiếp)
### GĐ0: soc-trade, quest-daily-task, ops-admin-guard

- `soc-trade`: `tradeOk` hủy giao dịch khi xu một bên sau khi chuyển vượt `XU_MAX` (2e9, mới trong `src/shared/constants.js`); kiểm lại lúc chốt hai bên cùng bản đồ, cách ≤ 250 px, không ai gục, không ở lôi đài/chiến trường. `tradeReq`/`tradeAccept` chặn cờ `p.bf`/`p.cw` (tính năng sau đặt cờ). Cửa sổ giao dịch: nút "Xác nhận" (trước là "Đồng ý"), mình đưa mà bên kia không đặt gì thì thành "Xác nhận (bạn không nhận gì)" màu đỏ, có `data-act="trade-ok"`. Kiểm thử: `tradeUnitTests` (thế giới giả, quét 784 tổ hợp xu thay cho `gddwork/lab/soc/trade-cap.js` không có trong repo), bot đi xa 400 px trong `socialTest`, bước nút cảnh báo trong `test:ui`.
- `quest-daily-task`: lệnh admin `/tieunhi done|reset`; `dailyTaskTest` (bot riêng `tieunhiqa`, cấp 80) + `dailyTaskUnitTests` (`DAILY.reward(120).exp === 46560`, khớp công thức hiện tại).
- `ops-admin-guard`: lệnh kiểm thử (`/lv /item /hethan /plus /thu /xu /xuk /luong /tp /boss /bosshp /chet /event /tieunhi`) chỉ chạy khi `NS_TEST=1`; lệnh vận hành (`/mail /code /sukien /arena /all /kick /mobs`) luôn chạy. Mỗi lệnh admin in `[ADMIN] <tài khoản> /<lệnh> <tham số>`. Gói `register` từ chối tên có trong `ADMINS` mà chưa có tài khoản (in `[ALERT]`), trừ server `NS_TEST=1`. `tests/lib/harness.js`, `tests/features/devtools.js`, `tests/load/load.js` đặt `NS_TEST=1`; `tests/features/admin.js` chạy server riêng không `NS_TEST`. Production **không** đặt `NS_TEST`.
### Gia tộc cơ bản (`clan-core`) và phủ kiểm thử hành động (`dev-test-coverage`)

- Sửa chèn prototype ở `modules/clan`: `clanKick`/`clanPromote`/`clanInfo`/`myClan` tra thành viên bằng `own(cl.members, clean(name, 16).toLowerCase())`. Trước khi sửa, `clanPromote { name: '__proto__', rank: 'leader' }` đặt `Object.prototype.rank = 'leader'` và xóa `cl.leader`.
- `cleanClans(db)` chạy trong `init` (có export để kiểm thử): bỏ khóa thành viên lạ, chức lạ về `member`, chọn lại tộc trưởng khi `leader` không còn trong tộc, chỉ một `leader`, tối đa 4 trưởng lão, kẹp `level` 1-10 và `exp`/`fund` (quỹ tối đa 2e12), bỏ tộc rỗng, nhân vật trỏ tới tộc không còn mình thì `c.clan = null`.
- `clanDonate`: dùng `int()`, góp tối thiểu 1.000 xu, tối đa 2 tỷ. Tối đa 4 trưởng lão; thăng người thứ 5 báo "Gia tộc đã đủ 4 trưởng lão.". Nhường chức khi tộc đã đủ trưởng lão thì tộc trưởng cũ về thành viên. Trường chữ là object (vd `{ toString: 1 }`) không còn làm `clean()`/`int()` ném lỗi trong module này.
- `tests/features/clan.js`: 16 kiểm tra đơn vị (có kịch bản tương đương `proto-clan`: dội gói `clan*` rác từ cả 3 chức) và 37 kiểm tra với 3 bot (lập qua NPC, mời, từ chối, nhận, thông báo, thăng chức, nhường, đuổi, rời, giải tán, quyền sai).
- Kiểm thử mới cho các hành động chưa có bot: `pk`, `duelReq/duelAccept`, `revive` về làng (`pk.js`), `resetStats` (`skills.js`), `pickup`, `ping` (`movement.js`), `partyLeave/partyKick`, `friendList/friendDel`, `inspect`, `mailRead`, ngắt kết nối giữa giao dịch (`social.js`), Thợ Rèn `upgrade/sellui` (`gems.js`).
- `scripts/lib/coverage.js` (chạy riêng `node scripts/lib/coverage.js`, hoặc bước "6b" trong `scripts/verify.js`): router 70/70 hành động có kiểm thử. Thao tác NPC còn thiếu chỉ in cảnh báo (`--strict-coverage` thì tính là hỏng): Tiểu Nhị `task:accept/finish/cancel` (`quest-daily-task` làm ở `daily.js`), `elder:finish`, `arena:cancel/rank`.
- Ca "Thỏ Ngọc tự nhặt đồ rơi gần chủ" thỉnh thoảng hỏng vì quái chết sát chủ (< 18 px) nên chủ tự nhặt xu trước thú. Đã đổi thành đánh tiếp (tối đa 8 con) tới khi thấy thú nhặt. Đo riêng đoạn này 10 lần trên cùng server: logic cũ 8/10, logic mới 10/10.
- `npm test` đạt, 213-247 giây khi máy chạy song song các agent khác (tải 6-8).

## 2026-10-18

### Lưu trữ an toàn, chống sập, sao lưu theo tầng (GĐ0: `ops-db-safe-load`, `ops-crash-guard`, `ops-backup`)

- Nạp an toàn (`services/db.js`): file JSON hỏng/0 byte → đổi tên `<file>.corrupt-<giờ>`, thử `<file>.tmp` hợp lệ (đưa về file chính), không có thì **thoát mã 2** kèm hướng dẫn `scripts/restore.js`; lần khởi động sau vẫn từ chối chừng nào còn file hỏng mà thiếu file chính. `FORCE_EMPTY=1` mới cho chạy rỗng. Không tự nạp bản sao lưu (tránh trộn dữ liệu lệch giờ giữa các file).
- Ghi bền: `.tmp` + `fsync` + `rename` + `fsync` thư mục. `db.saveErrors` đếm lỗi liên tiếp: `/api/status` có `saveErrors`, `ok: false` khi > 0; in `[ALERT] lưu thất bại`; admin online nhận `notice { kind: 'warn' }`; từ 3 lỗi thì `selectChar` bị từ chối (người đang chơi không bị đá). Ghi được lại → 0.
- Khóa `DATA_DIR/server.lock` (`pid`, `host`, làm mới mỗi 15 giây): tiến trình thứ hai **thoát mã 3**; khóa của pid đã chết, của chính pid mình (container khởi động lại) hoặc của máy khác quá 90 giây thì lấy lại. Tắt sạch / lỗi chết người thì xóa khóa.
- Chống sập: `uncaughtException`/`unhandledRejection` → dòng JSON `{ lvl: 'fatal' }` ra stderr, lưu khẩn cấp đồng bộ (cả người đang online), thoát mã 1. `world.emit` bọc lỗi từng móc: log `[hook] Lỗi móc "<móc>" của module <tên>` (tối đa 3 lần/phút), lỗi > 100 lần/phút thì tắt móc đó tới khi khởi động lại.
- Băm mật khẩu bất đồng bộ (`crypto.scrypt`, cùng tham số nên băm cũ vẫn đúng) qua hàng đợi 2 việc chạy / 64 việc chờ; `register`/`login` trong gateway thành `async`, gói khác của kết nối đang chờ băm bị bỏ. 50 lần đăng nhập đồng thời: tick trễ tối đa ~25 ms.
- Sao lưu (`services/backup.js`, `scripts/backup.js`, `scripts/restore.js`): `DATA_DIR/backups/{hourly,daily,weekly,pre}/<YYYYMMDD-HHmmss>[-nhãn].tgz` (giờ VN), giữ 48/30/12/10. Lịch theo chu kỳ (giờ: phút 05, ngày: 03:05, tuần: thứ Hai 03:10), không theo lần khởi động, nên khởi động lại nhiều lần không sinh/xoá bản. `tar` chạy ở tiến trình con rồi đọc lại kiểm (5.000 nhân vật 27,5 MB: trễ vòng lặp ≤ 2,4 ms). `BACKUP_PUSH_CMD` đẩy bản ngày ra ngoài máy (`$BACKUP_FILE`), `PRE_DEPLOY=<nhãn>` tạo bản trước triển khai lúc khởi động (một lần mỗi nhãn), `BACKUP=0` tắt lịch, `BACKUP_DELAY_MS` lần kiểm đầu (mặc định 60 giây). `restore.js --list | --check | --apply | --char --from`; `--apply` từ chối khi khóa còn sống (mã 3), dữ liệu cũ dời vào `before-restore-<giờ>/`.
- Kiểm thử: `tests/features/storage.js`, `tests/features/backup.js`, `loginBurstTest` trong `tests/features/account.js` (máy chủ riêng cổng 4310-4339). Biến chỉ có tác dụng khi `NS_TEST=1`: `NS_TEST_SAVE_FAIL=<n>`, `NS_TEST_THROW=second|fatal|reject`, `SIGUSR2` = lưu ngay. `NS_DEBUG_LAG=1` in trễ tick mỗi giây.

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
