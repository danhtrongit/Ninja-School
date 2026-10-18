# GDD 09 — Mỹ thuật & Âm thanh

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 9: chuẩn đồ họa (hoạt ảnh, khựng đòn, vệt vũ khí, cut-in, hào quang cường hóa, màu 8 bậc trang bị mới, theme vùng 121-199), quy trình duyệt hình, âm thanh (file tự tạo, nhạc tổng hợp WebAudio, danh sách tiếng hiệu ứng) |
| Ngày | 18/10/2026 |
| Id phụ trách | `char-ninja`, `art-monsters`, `art-fx`, `art-maps`, `art-icons`, `char-tier-outfit`, `art-anim-standard`, `art-hitstop`, `art-weapon-trail`, `art-enhance-aura`, `art-monsters-199`, `art-themes-new`, `art-cutin`, `dev-gallery`, `dev-baseline-shots`, `snd-audio-files`, `snd-content-199`, `snd-synth-music` (id mới) |
| Nguồn đã đọc | `DESIGN_RULES.md` (bản thư mục làm việc và bản `HEAD`), `CLAUDE.md`; mã `src/client/js/render/**` (`sprites.js`, `sprites/frame.js`, `sprites/color.js`, `fx.js`), `game/game.js` (`onHit`, `updateMusic`), `core/sound.js`, `ui/windows/settings.js`, `ui/windows/arena.js`, `ui/ui.js`; `src/shared/data/audio.js`, `src/shared/data/items/base.js`, `src/server/modules/audio`, `src/server/services/http.js`, `tools/sync-audio.js`, `tools/shot.js`, `tools/check-data.js`, `tests/features/audio.js`, `tests/e2e/perf.js`, `.dockerignore`; nhánh `feat/audio` (`git show 25428b0 --stat`); hàng đợi tạo âm thanh `~/.local/share/ninja-audio/{queue.tsv, run_queue.py, README.md, queue.log, out/}`; `content/00-foundation.md` mục 3, `content/10-world.md` mục 3 và 7, `content/20-monsters.md` mục 2-3, `content/50-worldboss-events.md` mục 0 và 7; GDD `01-tam-nhin.md` (ADR-01-1), `02-hien-trang.md`, `04-dac-sac.md` (`sig-thanhan`), `05-he-thong-trang-bi.md` (`gear-tier-199`) |
| Đo đạc riêng | `scratchpad/gddwork/lab/m09/`: `tiercolor.js` + `tiercand.js` (khoảng cách màu Lab giữa 20 bậc), mã hóa lại bài `title` ở 64/48/40 kbps, `synth/engine.js` + `synth/run.js` (nguyên mẫu nhạc tổng hợp, dựng offline 3 bài trong Chromium headless, kết quả `synth/run.out.json`, file nghe thử `synth/*.ogg`) |
| Quy ước | "đã có" = có trong mã thư mục làm việc và đạt tiêu chí; nhánh `feat/bag`, `feat/audio` coi là đã làm, chờ gộp (nội dung `feat/audio` đã nằm trong bản stage của đợt tái cấu trúc nhưng chưa commit, nên `snd-audio-files` vẫn `todo`). Thư mục `specs/`, `content/`, `gddwork/` nói ở đây nằm trong `scratchpad/` của phiên thiết kế |

Quy tắc đọc: chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 14. Mọi tên trong game là tên tự đặt; game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ **loại** cơ chế. Mọi chuẩn mới ở đây khi làm xong phải chép vào `DESIGN_RULES.md` trong cùng commit với mã (mục 13.3 liệt kê dòng cần sửa).

---

## 0. Tóm tắt

| Id | Tên | Trụ cột | Mức | Trạng thái | Giai đoạn | Cỡ | Mục |
|---|---|---|---|---|---|---|---|
| `char-ninja` | Nhân vật chibi pixel và NPC vẽ bằng code | P1 | Must | done | 1 | M | 3.1 |
| `art-monsters` | Quái vẽ bằng code, 11 kiểu sprite, biến thể boss | P1 | Must | done | 1 | M | 3.2 |
| `art-fx` | Hiệu ứng kỹ năng, chữ sát thương, rung, rèn/khảm | P1, P3 | Must | done | 1 | M | 3.3 |
| `art-maps` | 23 theme, ngày/đêm giờ Việt Nam, hạt môi trường | P1 | Must | done | 1 | M | 3.4 |
| `art-icons` | Icon vật phẩm, kỹ năng, giao diện vẽ bằng code | P1 | Must | done | 1 | M | 3.5 |
| `art-anim-standard` | Chuẩn hoạt ảnh mới: 11 trạng thái nhân vật, 6 trạng thái quái | P1, P3 | Should | todo | 1 | L | 4 |
| `art-hitstop` | Khựng đòn theo loại đòn (ms) và phản hồi trúng đòn | P3 | Should | todo | 1 | S | 5 |
| `art-weapon-trail` | Vệt vũ khí theo phái, hệ và bậc | P1, P3 | Should | todo | 1 | M | 6 |
| `art-cutin` | Khung cut-in Tuyệt Kỹ / Ấn Kỹ | P1, P3 | Should | todo | 5 | M | 7 |
| `art-enhance-aura` | Hào quang theo mốc cường hóa +5/+8/+11/+13/+15/+16 và theo bộ | P1, P5 | Should | todo | 3 | M | 8 |
| `char-tier-outfit` | Màu và hoa văn nhân vật cho 8 bậc trang bị 12-19 | P1 | Must | todo | 1 | S | 9 |
| `art-themes-new` | 3 theme mới (đầm lầy, tinh hà, núi ngọc bích) + 39 biến thể bản đồ | P1 | Must | todo | 2 | M | 10.1 |
| `art-monsters-199` | Hình 72 quái + 9 boss Thượng Giới (mượn hình `art`, bảng màu vùng) | P1 | Must | todo | 2 | M | 10.3 |
| `snd-audio-files` | Nhạc nền, tiếng hiệu ứng từ file tự tạo, dự phòng WebAudio, thanh âm lượng | P1, P2 | Should | todo (nhánh `feat/audio`, đã stage) | 7 | M | 11.1-11.3 |
| `snd-synth-music` | Nhạc nền tổng hợp WebAudio thủ tục cho mọi bài (dự phòng, chế độ tiết kiệm dữ liệu, lớp cuồng nộ) | P1, P2 | Should | todo | 7 | M | 11.4 |
| `snd-content-199` | 15 bài nhạc mới (theme mới, boss hậu kỳ, sự kiện, 7 lễ hội) + 44 tiếng mới | P1 | Should | todo | 7 | M | 11.5-11.6 |
| `dev-gallery` | Trang `/dev/gallery` (chỉ admin) xem mọi hình vẽ code | P1, P5 | Must (nâng khi ghép) | todo | 1 | M | 12.1 |
| `dev-baseline-shots` | Mốc hồi quy đồ họa: mã băm từng ô gallery + so điểm ảnh | P1, P5 | Should | todo | 1 | M | 12.2 |

Quyết định chính:

1. **Hoạt ảnh**: nhân vật từ 5 lên 11 trạng thái (thêm `fall, land, cast, hurt, die, dash`, `attack` 3 → 4 khung), quái thêm `hurt` và `die`, boss thêm `cast` khớp thời gian niệm. Không đổi chữ ký `drawNinja`/`drawMonster`, chỉ thêm giá trị `o.anim`.
2. **Khựng đòn** chỉ là hình ảnh phía máy khách, 0-200 ms theo loại đòn, trần 150 ms trong 1 giây trượt, không bao giờ giữ vị trí hay chặn gửi gói.
3. **Màu 8 bậc mới** lấy theo `content/00-foundation.md` mục 3.3, **trừ** kim loại bậc 17 Thái Cực đổi `#f4f4f4` → `#fff4d6` vì đo được ΔE76 chỉ 6,6 so với bậc Bạc (mục 9.2).
4. **Âm thanh**: ADR-09-1 chốt chi tiết thực thi ADR-01-1 (giấy phép, mã hóa Opus 48 kbps, ngân sách theo phiên thay vì 8 MB tổng, công thức tạo nằm trong repo), đồng thời đặc tả **nhạc tổng hợp WebAudio thủ tục** cho đủ 40 bài làm lớp dự phòng bắt buộc (nguyên mẫu đo được: 2,7 KB nén, dựng nhanh 10-21 lần thời gian thực).
5. **Duyệt hình** qua trang `/dev/gallery` (chỉ bật khi `DEV_TOOLS=1` và tài khoản trong `ADMINS`) và mốc hồi quy bằng **mã băm** từng ô (ADR-09-2) để không phải commit ảnh chụp.

---

## 1. Hiện trạng đo được (thư mục làm việc 18/10/2026)

### 1.1 Đồ họa

| Hạng mục | Số liệu trong mã | Nguồn |
|---|---|---|
| Khung nhân vật | `NINJA_H = 28`, bộ đệm khung 76×64 (`sprites/pixbuf.js`), gốc giữa chân | `sprites/color.js`, `pixbuf.js` |
| Hoạt ảnh nhân vật | `NFRAMES = { idle: 4, walk: 6, jump: 2, attack: 3, dead: 1 }`; nhịp `idle` 2,6 khung/giây, `walk` 12, `jump` 8, `attack` 85 ms/khung | `sprites/frame.js`, `sprites.js` dòng 170-177 |
| Trúng đòn | nháy trắng 0,12 s (`e.flash = t + 0.12`), tia lửa 4 (chí mạng 10), chữ số; boss đánh trúng mình rung 1,5 (chí mạng 3) | `game/game.js` `onHit` |
| Cường hóa trên hình | chỉ theo **vũ khí** (`look.wp`): +5 lấp lánh 2 điểm, +8 vũ khí phát sáng + 3 điểm, +11 hào quang toàn thân | `sprites.js` dòng 129-150, 223-238 |
| Bậc trang bị | 12 bậc, 4 mảng màu 12 phần tử (`TIER_OUTFIT/METAL/TRIM` ở client, `TIER_COLORS` ở `items/base.js`; `TIER_COLORS` trùng `TIER_METAL`) | `sprites/color.js`, `items/base.js` |
| NPC | 10 loại có ngoại hình riêng | `sprites/npc.js` |
| Thời trang, thú | 3 mặt nạ, 4 áo choàng, 4 trang phục, 5 thú cưỡi, 6 thú cưng | `sprites/fashion.js`, `mount.js`, `petart.js` |
| Quái | 11 kiểu sprite, quái người 17 bộ `HUM` (14 quái + 3 boss), 65 quái trong dữ liệu | `render/monster/`, `npm run check` |
| Bản đồ | 23 theme, 25 bản đồ, ngày/đêm 3 mức | `render/map/themes.js`, `npm run check` |
| Hiệu ứng | 10 kiểu `fx.k`, 7 loại đạn, `MAX_PARTS = 900`, `MAX_TEXTS = 70`, vệt chém cache 8 khung | `render/fx.js` + `fx/` |
| Icon | 31 kiểu `icon.k`, kỹ năng 24×24, giao diện 29 tên | `render/icons/` |
| Hiệu năng | mốc gần nhất: 60 fps, CPU 3-4 ms/khung trung bình, p95 ≤ 5 ms (trần 8 ms) | `DESIGN_RULES.md` mục 10 |
| Kiểm tra dữ liệu | `node tools/check-data.js` in "✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng" (chạy 18/10/2026) | |

### 1.2 Âm thanh

| Hạng mục | Hiện trạng | Nguồn |
|---|---|---|
| Quy tắc | `HEAD`: "Âm thanh dùng WebAudio tổng hợp". Bản stage (từ `feat/audio`): file tự tạo ở `src/client/audio/{music,sfx}/<id>.ogg` (+ `.m4a`), nguồn ở `CREDITS.md`, thiếu file thì tổng hợp, bus nhạc × 0,55, đổi bài giảm dần 1,2 s | `git show HEAD:DESIGN_RULES.md`, `DESIGN_RULES.md` mục 0.3 |
| Mã | đã stage: module `audio` (móc `clientData.audio` liệt kê file có thật), `data/audio.js` (`MUSIC_THEME` 23 theme, `MUSIC_SCENE` 6 tình huống, `SKILL_SFX` 42 kỹ năng, `FX_SFX` 10, `EVENT_SFX` 13, `BOSS_SFX` 5), `core/sound.js` 294 dòng, HTTP Range cho `.ogg/.m4a`, `tools/sync-audio.js`, 2 thanh âm lượng, `tests/features/audio.js` (8 kiểm tra) | `git status`, `git show 25428b0 --stat` |
| Tiếng tổng hợp | 17 tiếng (`swing, shoot, magic, hit, crit, hurt, coin, pickup, level, quest, die, portal, click, spin, boss, jump, heal`) | `core/sound.js` `SOUNDS` |
| Nhạc tổng hợp | **không có**: thiếu file thì im lặng | `core/sound.js` `syncMusic` |
| File | hàng đợi 71 file (25 nhạc + 46 tiếng) đã tạo **đủ 71/71** ngoài repo (`queue.log`: 16:23 → 19:24 ngày 18/10/2026, kiểm lúc 20:31). Nhạc: 25 bài 60 s, `.ogg` tổng 20 MB (739-918 KB/bài, thực 115 kbps), `.m4a` 24 MB, trung bình 196 s máy/bài. Tiếng: 46 file, `.ogg` tổng 616 KB (12-17 KB/file), `.m4a` 684 KB, mỗi lô 2-3 tiếng 13-18 s. Mỗi file có `.json` ghi prompt, model, ngày tạo. Thư mục `src/client/audio/` **chưa tồn tại** (chưa chạy `tools/sync-audio.js`) | `queue.tsv`, `queue.log`, `out/{music,sfx}/` |
| Model | nhạc: ACE-Step 1.5 (MIT); tiếng: Stable Audio 3 Small SFX (Stability AI Community License, đã có token; đã tạo đủ 46 tiếng). Dòng đầu `queue.tsv` vẫn ghi MOSS-SoundEffect (đã lỗi thời, `run_queue.py` gọi `--backend sa3`) | `README.md`, `sa3_test.log`, `run_queue.py` |

### 1.3 Lỗi và lệch phát hiện khi đọc (đưa vào phần cần nâng)

| # | Lệch | Bằng chứng | Xử lý ở |
|---|---|---|---|
| L1 | Kết quả lôi đài phát **hai** tiếng chồng nhau: `arenaResult` gọi `sfx('victory'/'defeat')`, rồi `showArenaResult` gọi `sfx('quest'/'die'/'coin')` (`die` cũng ra file `defeat`) | `game.js` dòng 233-236, `windows/arena.js` dòng 129 | 11.6 |
| L2 | Đếm ngược lôi đài "ĐẤU!" phát `sfx('boss')` (= tiếng cảnh báo boss u ám), cùng lúc `onArena` phát `arena_start` | `windows/arena.js` dòng 122, `game.js` dòng 243 | 11.6 |
| L3 | File `dodge`, `ui_open` có trong hàng đợi nhưng không chỗ nào gọi; `quest`, `spin`, `jump` không có file tương ứng | `grep sfx(` | 11.6 |
| L4 | Nhạc bitrate danh nghĩa 96 kbps ra thực 115 kbps → 739-918 KB/bài; 25 bài đã tạo = 20 MB `.ogg` + 24 MB `.m4a`, vượt xa mục tiêu "≤ 8 MB tổng" của ADR-01-1 | `ffprobe title.ogg`, `du out/music` | ADR-09-1 |
| L5 | `.dockerignore` loại `*.md` và `tools` → `src/client/audio/CREDITS.md` không vào ảnh Docker | `.dockerignore` | ADR-09-1 |
| L6 | File âm thanh phục vụ với `Cache-Control: no-cache` (không có `?v=`), mỗi lần vào bản đồ trình duyệt phải hỏi lại máy chủ | `services/http.js` `versioned()` chỉ nhận `js/`, `css/` | 11.2 |
| L7 | Kim loại bậc 17 Thái Cực đề xuất `#f4f4f4` gần như trùng Bạc `#dfe6ec` (ΔE76 6,6) | `lab/m09/tiercolor.out` | 9.2 |
| L8 | Danh sách id tiếng phụ (`enhance_ok`, `gem`, `mail`, `arena_start`, `victory`, `defeat`, `ui_open`) viết cứng trong `tools/sync-audio.js`, không nằm trong bảng dữ liệu | `tools/sync-audio.js` dòng 13-16 | 11.3 |

---

## 2. Nguyên tắc chung cho mọi hệ thống ở mục này

1. **Đồ họa 100% vẽ bằng code** (`DESIGN_RULES.md` 0.3). ADR-09-1 chỉ áp cho âm thanh, không phải tiền lệ cho ảnh.
2. **Chỉ là hình ảnh/âm thanh**: không hệ thống nào ở mục này đổi logic, thời gian hồi chiêu, tầm đánh hay sát thương. Máy chủ không nhận thêm số liệu nào từ máy khách. Gói mới chỉ đi **từ máy chủ xuống** (`look.sp`, `devGallery`).
3. **Dựng một lần, vẽ nhiều lần**: mọi khung mới vào canvas offscreen theo khóa chuỗi trong `Map`, không tạo gradient mới mỗi khung, không cấp phát mảng trong vòng vẽ (`DESIGN_RULES.md` mục 10).
4. **Ngân sách CPU**: tổng phần vẽ mới của mục này ≤ 1 ms/khung trung bình ở kịch bản `test:perf` (20 người chơi, 18-23 quái, auto, ban đêm), để tổng vẫn ≤ 5 ms trung bình, ≤ 8 ms p95.
5. **Tôn trọng cài đặt**: `fx.shakeScale = 0` (tắt rung) cũng tắt khựng đòn mạnh; trình duyệt báo `prefers-reduced-motion: reduce` thì mặc định tắt rung, khựng đòn, cut-in trượt (chỉ hiện dải tĩnh 0,5 s).
6. **Đọc được hơn đẹp** (P3): hiệu ứng của người khác mờ hơn của mình (alpha 0,6), không che vùng cảnh báo chiêu boss (`telegraph` luôn vẽ trên lớp mặt đất và không bị hạt che quá 30% diện tích).
7. **Điện thoại**: không có hình mới nào nhận chạm; mọi dải ngang (cut-in) tránh nút HUD theo 6 bố cục chuẩn (1280×720/700/681, 844×390, 740×360, 667×375).

---

## 3. Hệ thống đã có: hiện trạng và phần cần nâng

### 3.1 `char-ninja` — Nhân vật chibi pixel và NPC (P1 · Must · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `drawNinja(ctx, x, y, o)`, `drawPortrait`, 8 kiểu tóc theo băm tên, băng trán màu hệ, áo/quần/nón theo bậc, 6 vũ khí theo phái, 10 loại NPC riêng, thời trang 4 ô, thú cưỡi vẽ dưới người cưỡi, cache khung theo `sp.key#anim f flash ride` |
| Đạt | `npm run check` kiểm mỗi `NPC_TYPES` có hàm trong `NPCS`; ảnh `tools/shot.js` desktop + điện thoại; `test:perf` 3-4 ms |
| Cần nâng | trạng thái hoạt ảnh mới (mục 4, `art-anim-standard`), màu bậc 12-19 (mục 9, `char-tier-outfit`), hào quang theo bộ (mục 8), khung `talk` cho NPC (mục 4.1), giới hạn bộ đệm khung LRU 1.500 mục (mục 4.4) |

### 3.2 `art-monsters` — Quái vẽ bằng code (P1 · Must · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | 11 kiểu, bảng màu `pal[3]`, `VARIANT` theo id, `HUM` 17 bộ, boss có biến thể riêng + `AURA2` + `rageAura`, `prewarmMonsters` lúc vào bản đồ, khung đứng/đi 3-4 và tấn công 1-2 |
| Cần nâng | khung `hurt` và `die` (mục 4.2) thay cho "rơi xuống + nháy trắng"; boss có khung `cast` trong lúc niệm (khớp `bossCast.dur`); hình 121-199 (mục 10.3) |

### 3.3 `art-fx` — Hiệu ứng (P1, P3 · Must · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `class FX`: 10 kiểu kỹ năng, 7 đạn, chữ số 8 màu, rung có giảm theo khoảng cách, `telegraph/bossSkill/enhance/mountDust/gemSocket/costumeSparkle`, giới hạn 900 hạt và 70 chữ |
| Cần nâng | khựng đòn (mục 5), vệt vũ khí (mục 6), cut-in (mục 7), hiệu ứng mốc cường hóa +13/+15/+16 (mục 8), hiệu ứng mặt đất cho trạng thái của `cmb-status` (Bỏng, Lạnh Cóng, Độc, Choáng; màu theo mục 4.3, chủ sở hữu logic là `05-he-thong-chien-dau.md`) |

### 3.4 `art-maps` — Bản đồ (P1 · Must · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | 23 theme có `THEMES` + `SCENES`, parallax dải lặp prerender, địa hình prerender một lần, ngày/đêm giờ Việt Nam (`vnHour`), `drawNight` + `drawLighting` chỉ `drawImage`, `MAP_VARIANTS` đổi trang trí theo id bản đồ |
| Cần nâng | 3 theme mới + 39 biến thể + nhà trạm theo `townStyle` (mục 10.1), bảng nhận diện vùng 121-199 (mục 10.2) |

### 3.5 `art-icons` — Icon (P1 · Must · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `iconURL` 16×16 cho 31 kiểu `k`, `skillIconURL` 24×24 (chủ động nền tròn, nội tại khung lục giác), `uiIconURL` 29 tên; `npm run check` kiểm mọi `icon.k` có hình |
| Cần nâng | sao lấp lánh `g: 1` (bậc ≥ 12) và `g: 2` (bậc ≥ 16) trên icon trang bị theo `gear-tier-199`; icon cho vật phẩm mới thuộc từng mục GDD chủ sở hữu (mục này chỉ giữ chuẩn); 2 icon giao diện mới `sound` (loa) cho dòng nguồn âm thanh trong Cài đặt và `gallery` (khung tranh) cho trang `/dev/gallery` |

---

## 4. `art-anim-standard` — Chuẩn hoạt ảnh (P1, P3 · Should · todo)

### 4.1 Mục đích

Đòn đánh phải "đọc được" (P3): người chơi thấy lúc vung, lúc trúng, lúc kẻ địch chịu đòn và gục xuống. Hiện nhân vật chỉ có 5 trạng thái, niệm chiêu dùng lại khung đánh, chết là 1 khung nằm. Chuẩn mới đặt số khung, nhịp và tư thế cho từng trạng thái để mọi worker vẽ cùng một nhịp.

### 4.2 Luồng người chơi

Chạy (walk) → nhảy (lên `jump`, xuống `fall`, chạm đất `land`) → bấm đòn thường (`attack` 4 khung) → bấm kỹ năng buff/hồi máu (`cast`) → bị quái đánh (`hurt`, giật lùi 1 px) → hết máu (`die` khuỵu rồi ngã, nằm `dead`) → hồi sinh (`land` từ trên xuống 1 lần). Lướt (`dash`) khi dùng kỹ năng `fx.k = 'dash'`. NPC nói chuyện khi hội thoại mở (`talk`).

### 4.3 Quy tắc: bảng khung

**Nhân vật** (`sprites/frame.js` `NFRAMES`, nhịp tính ở `sprites.js` `drawNinja`):

| `o.anim` | Hiện tại | Chuẩn mới | Nhịp | Tư thế từng khung | Khi nào (máy khách tự suy ra) |
|---|---|---|---|---|---|
| `idle` | 4 | 4 (giữ) | 2,6 khung/s | thở: vai lên 1 px ở khung 2-3 | đứng yên |
| `walk` | 6 | 6 (giữ) | `12 × clamp(tốc/100, 1, 1,5)` khung/s | sải chân như cũ | đang chạy; nhịp theo tốc chạy để chân không trượt |
| `jump` | 2 | 2 | 8 khung/s | co gối, tay sau | trên không và `vy < 0` (của mình) hoặc `y` giảm so với gói trước (người khác) |
| `fall` | (dùng `jump`) | 2 | 8 khung/s | chân duỗi, tay dang | trên không và đang rơi |
| `land` | không | 2 | 50 ms/khung, 1 lần | khuỵu gối 2 px rồi đứng | vừa chạm đất sau ≥ 0,25 s trên không, sau hồi sinh |
| `attack` | 3 × 85 ms | 4: lấy đà 60 ms, vung 2 × 50 ms, thu 80 ms (tổng 240 ms, cũ 255 ms) | theo `o.atkP` hoặc thời gian | khung 1 vũ khí ra sau, 2-3 vung qua trước (vệt vũ khí mục 6 vẽ ở 2-3), 4 thu về | `attackUntil` |
| `cast` | không (dùng `attack`) | 3: giơ ấn, tụ khí (lặp khi buff kéo dài), phát | 90 ms/khung | hai tay trước ngực, vũ khí cất sau lưng | kỹ năng `fx.k` thuộc `aura, heal` |
| `hurt` | nháy trắng 0,12 s | 2: giật lùi 1 px ngược hướng đòn + nháy trắng ở khung 1 | 80 ms/khung | thân nghiêng sau, mắt nhắm | `flash > t`; không chặn điều khiển |
| `dash` | (dùng `walk`) | 2 | 60 ms/khung | thân nghiêng trước 2 px, khăn bay thẳng | kỹ năng `fx.k = 'dash'` trong 0,3 s |
| `die` | không | 4: khuỵu 2, ngã 2 | 100 ms/khung, 1 lần | ngã về sau hướng đòn cuối | `dead` vừa chuyển từ `false` sang `true` |
| `dead` | 1 | 1 (giữ) | | nằm | sau `die` |
| `talk` (NPC) | không | 2 | 4 khung/s | tay phải giơ, miệng mở 1 px | hội thoại NPC đang mở với NPC đó |
| `win` (Could) | không | 4 | 6 khung/s | giơ vũ khí lên trời | thắng lôi đài, 1,5 s |

**Quái** (`render/monster/`, giữ `o.st` của máy chủ: 0 đứng, 1 đi, 2 đánh):

| Trạng thái | Hiện tại | Chuẩn mới | Ghi chú |
|---|---|---|---|
| đứng / đi | 3-4 | 4 / 4 | `flyer`, `ghost` lơ lửng nhấp nhô 1 px như cũ |
| đánh (`st = 2`) | 1-2 | 2: ra đòn, thu | máy chủ đặt `st = 2` đúng lúc gây sát thương nên **không** có khung lấy đà cho quái thường (báo trước đòn quái thường là việc của `cmb-monster-ai`, xem Q9) |
| `hurt` | nháy trắng | 1 khung lệch 1 px ngược hướng đòn + nháy trắng 0,12 s | `o.hurt` (= `flash`) |
| `die` | rơi 10 px + nháy | 3 khung: co lại, xẹp/tan, còn bóng; 0,12 s/khung | slime xẹp, ghost tan thành 6 hạt, golem vỡ 4 mảnh (hạt `fx.sparks` màu `pal[1]`) |
| boss `cast` | không | 2 khung lặp 6 khung/s: thân sáng lên `pal[2]`, tay/hàm mở | trong thời gian `bossCast.dur` |

**Thú cưng**: giữ 4 + 4 khung, thêm `happy` 2 khung (nhảy 2 px) khi được cho ăn. **Thú cưỡi**: giữ.

**Màu hiệu ứng trạng thái** (chung cho `cmb-status`): Bỏng `#ff7043` (tàn lửa bay lên), Lạnh Cóng `#8fe3ff` (tinh thể quanh chân, thân ám lam 30%), Độc `#9ccc65` (bọt bong bóng), Choáng `#ffeb3b` (3 sao xoay trên đầu, bán kính 6), Chậm dùng icon `slow` có sẵn.

### 4.4 Dữ liệu, gói, mã

| Phần | Nội dung |
|---|---|
| Dữ liệu `src/shared/data` | không đổi |
| Gói | không gói mới. `cast/dash` suy từ `fx` (`m.sid` → `S.G.skills[sid].fx.k`); `die` suy từ `p.dead` đổi trạng thái |
| Vùng file | Nhân vật & NPC (`render/sprites.js`, `sprites/frame.js`, `sprites/body.js`, `sprites/weapons.js`, `sprites/npc.js`); Quái (`render/monster/*.js`); Vòng lặp game (`game/game.js`: tính `anim` ở dòng chọn `anim`, lưu `dieAt`, `landAt`, `castUntil`, `dashUntil`) |
| API | `drawNinja` nhận thêm giá trị `o.anim` mới, giá trị lạ vẫn rơi về `idle` như cũ; `drawMonster` thêm `o.hurt`, `o.dieT` (0-1) tùy chọn |
| Bộ nhớ | khung dựng lười (chỉ khung được vẽ); nháy trắng chỉ dựng cho khung `hurt` (bỏ bản `F` cho mọi khung khác); `frameCache` giới hạn LRU 1.500 mục (xóa 20% cũ nhất khi đầy) |
| DOM | không có id mới |

### 4.5 Điện thoại, chống gian lận

Không có điều khiển mới. Không ảnh hưởng máy chủ.

### 4.6 Tiêu chí chấp nhận

- `NFRAMES` có đủ 12 khóa với số khung đúng bảng 4.3; `npm run check` kiểm thêm: mọi khóa của `NFRAMES` có hàm dựng trong `sprites/frame.js` (đọc mã như các kiểm tra hiện có).
- Trang `/dev/gallery` mục "Nhân vật" vẽ đủ 6 phái × 2 giới × 12 trạng thái × mọi khung, không ô trống, `OK no console errors`.
- Nhân vật cao đúng `NINJA_H` ở mọi khung trừ `die/dead` (đo bằng hộp bao điểm ảnh trong `tests/e2e/gallery.js`).
- Tổng thời gian `attack` = 240 ms ± 5 ms (đo `drawNinja` với `o.atkP`).
- `test:perf` desktop và `MOBILE=1`: CPU trung bình tăng ≤ 0,3 ms so với lần đo ngay trước, p95 ≤ 8 ms, 60 fps.
- Ảnh `tools/shot.js` 1280×720 và `mobile: true` ở bãi đông quái, có cảnh chết + hồi sinh, `OK no console errors`.

### 4.7 Kiểm thử

`tests/e2e/gallery.js` (mới, mục 12), `tests/e2e/perf.js`, `tests/e2e/e2e.js` (thêm bước: `/hp 1` để chết rồi hồi sinh, kiểm `ninja.game.me.anim` đi qua `die` → `dead` → `land`).

---

## 5. `art-hitstop` — Khựng đòn (P3 · Should · todo)

### 5.1 Mục đích

Cho đòn nặng "có lực": hình khựng lại vài chục mili giây lúc trúng, như game hành động đi cảnh. Chỉ là hình ảnh phía máy khách, máy chủ không biết tới.

### 5.2 Luồng

Mình chém trúng chí mạng → người mình và quái bị trúng đứng hình 45 ms, quái lệch 1 px theo hướng đòn, hạt bắn ra chậm lại → hình chạy tiếp. Mình bị boss đánh chí mạng → khựng 70 ms kèm rung 3 có sẵn. Hạ boss → khựng 160 ms + rung 6 có sẵn.

### 5.3 Quy tắc: thời lượng theo loại đòn

| Loại đòn (chỉ đòn do **mình** gây hoặc **mình** nhận) | Khựng (ms) | Ai đứng hình | Ghi chú |
|---|---|---|---|
| Đòn thường trúng | 0 | | giữ nháy trắng + chữ số; auto đánh cả giờ không bị giật |
| Đòn thường chí mạng | 45 | mình + mục tiêu | |
| Kỹ năng 1 mục tiêu (`slash, proj, dash`) | 50 | mình + mục tiêu | chí mạng +20 |
| Kỹ năng lan (`burst, wave, rain, whirl`) | 60 | mình + mọi mục tiêu trúng | tính **một lần mỗi lần tung**, không theo số mục tiêu |
| Kỹ năng nặng (`meteor`, kỹ năng có `fx.big`) | 80 | mình + mục tiêu | chí mạng +20 |
| Hạ gục quái tinh anh (`cmb-elite-mobs`) | 100 | mục tiêu | |
| Hạ gục boss | 160 | toàn cảnh (FX chậm 0,15×) | kèm rung 6 có sẵn |
| Mình bị quái/boss đánh | 0 / 40 (chí mạng 70) | mình | |
| PvP: mình trúng đối thủ / đối thủ trúng mình | 40 / 40 | hai bên | |
| Hạ gục lôi đài (`arena.ko`) | 200 + FX chậm 0,5× trong 0,6 s | toàn cảnh | chỉ hình ảnh; trận đã kết thúc ở máy chủ |
| Tung Ấn Kỹ (`sig-thanhan`) | 120 | mình | trùng lúc cut-in vào khung |

Luật chung:

- `game.hitStop(ms, ids)`: đặt `stopUntil = max(stopUntil, now + ms)` (không cộng dồn); trong lúc khựng, thời gian hoạt ảnh của các thực thể trong `ids` không tăng, `fx.update(dt × 0.15)` cho hạt quanh điểm trúng (bán kính 48), mục tiêu lệch ±1 px xen kẽ mỗi 30 ms.
- **Không** giữ vị trí: vị trí của mọi thực thể vẫn nội suy theo gói máy chủ, mình vẫn di chuyển, vẫn gửi gói, vẫn nhận phím. Camera không dừng.
- Trần: tổng thời gian khựng ≤ 150 ms trong 1 giây trượt bất kỳ; vượt thì bỏ khựng mới (giữ chữ số, nháy).
- Tắt khi cài đặt "Khựng đòn" tắt (mới, mặc định bật; mặc định tắt nếu `prefers-reduced-motion`).

### 5.4 Dữ liệu, gói, mã

| Phần | Nội dung |
|---|---|
| Dữ liệu | bảng `HITSTOP` trong `game/game.js` (hằng số hình ảnh, không phải dữ liệu game nên không vào `src/shared`) |
| Gói | không mới; dùng `hit` (`m.list` có `crit`), `fx`, `kill`/`dead` có sẵn |
| Vùng file | Vòng lặp game (`game/game.js` `onHit`, `onFx`, `update`, `render`), Hiệu ứng (`render/fx.js`: `update(dt, slowAt?)` thêm tham số tùy chọn), `windows/settings.js` (1 công tắc "Khựng đòn", khóa `S.settings.hitstop`) |
| DOM | không id mới; công tắc dùng `label.set-row` sẵn có (cao 44 px trên điện thoại) |

### 5.5 Chống gian lận

Không có dữ liệu gửi lên. Không đổi tốc độ hay thời gian hồi chiêu.

### 5.6 Tiêu chí chấp nhận

- E2E: bật `/plus 16`, đánh chí mạng quái (ép bằng `/crit 100` của admin nếu có, không thì lặp tới khi `m.list` có chí mạng) → `ninja.game.stopUntil - now` nằm trong `[40, 50]` ms; đòn thường không chí mạng → `stopUntil` không đổi.
- Auto đánh 60 giây ở bãi đông quái: tổng thời gian khựng mỗi giây trượt ≤ 150 ms (máy khách ghi `ninja.game.hitStopLog`).
- Lôi đài: hạ gục → khựng 200 ms, `arenaResult` vẫn tới và cửa sổ kết quả mở đúng như cũ.
- Tắt "Khựng đòn" → mọi lần `stopUntil` không đổi.
- `test:perf`: CPU trung bình không tăng quá 0,05 ms.

### 5.7 Kiểm thử

`tests/e2e/e2e.js` (bước khựng đòn), `tests/e2e/ui-multiplayer.js` (bước lôi đài hạ gục), `tests/e2e/perf.js`.

---

## 6. `art-weapon-trail` — Vệt vũ khí (P1, P3 · Should · todo)

### 6.1 Mục đích

Mỗi phái có dáng vung riêng để nhìn bóng là biết phái (P1), bậc và cường hóa thấy được qua vệt (P5 khoe công sức), và hướng vung rõ để PvP đọc được (P3).

### 6.2 Quy tắc

| Phái | Vũ khí | Kiểu vệt | Kích thước (px nghệ thuật) | Thời lượng |
|---|---|---|---|---|
| Kiếm (Hỏa) | `sword` | cung chém 100° phía trước, từ trên xuống | bán kính 16, dày 3 → 1 | 140 ms |
| Đao (Phong) | `blade` | cung 140° rộng, dày, có đuôi | bán kính 18, dày 4 → 1 | 170 ms |
| Kunai (Thủy) | `kunai` | 2 vệt đâm ngang song song cách 3 px | dài 14, dày 2 | 100 ms |
| Phi Tiêu (Hỏa) | `shuriken` | không vệt cung; đạn có 3 bóng mờ cách 4 px, alpha 0,6/0,35/0,15 | | theo đạn |
| Cung (Thủy) | `bow` | dây cung rung 2 khung + mũi tên có vệt thẳng | vệt 10, dày 1 | theo đạn |
| Quạt (Phong) | `fan` | rẻ quạt 5 tia gió 60° | bán kính 16, dày 2 | 160 ms |

Màu:

- Lõi vệt `shade(TIER_METAL[t], 0.6)`, viền ngoài `ELEMENT_COLORS[hệ]`, viền tối 1 px `#1d1424` chỉ ở mép ngoài (giữ chuẩn viền).
- Bậc ≥ 12: thêm đường lõi trắng 1 px; bậc ≥ 16: thêm 3 hạt sáng dọc vệt (dùng `fx.star`).
- Cường hóa vũ khí ≥ +8: vệt vẽ bằng `lighter`, alpha 0,85; dưới +8: `source-over`, alpha 0,7.
- Người khác: alpha × 0,6.
- Vệt vẽ ở khung 2-3 của `attack` (mục 4.3), nâng theo `lift` khi cưỡi thú như `slash`.

Cache: mỗi tổ hợp (vũ khí 6 × dải bậc 3 (0-11, 12-15, 16-19) × dải cường hóa 2 × hướng 2) dựng 8 khung vào một tấm 48×48×8 → tối đa 72 tấm, khóa `trail|w|tb|pb|dir`. Màu hệ cố định theo phái nên không nhân thêm.

### 6.3 Dữ liệu, gói, mã

| Phần | Nội dung |
|---|---|
| Dữ liệu | không; `S.G.classes[cls].weapon`, `.element` có sẵn; bậc vũ khí lấy từ `look.w` có sẵn |
| Gói | không mới |
| Vùng file | Hiệu ứng (`render/fx.js` + `render/fx/trail.js` mới: `fx.trail(x, y, dir, weapon, el, tier, plus, other)` export mới), Vòng lặp game (`game.js`: gọi `fx.trail` khi `attack` vào khung 2) |

### 6.4 Tiêu chí chấp nhận

- Gallery mục "Vệt vũ khí": 6 vũ khí × 3 dải bậc × 2 dải cường hóa, ô nào cũng có điểm ảnh khác nền; mã băm ô ổn định giữa 2 lần chạy (`dev-baseline-shots`).
- `test:perf` với 20 người chơi cùng auto đánh: phần vệt ≤ 0,3 ms/khung trung bình (đo bằng `performance.now()` quanh `fx.draw` trước/sau).
- Ảnh desktop + điện thoại 6 phái đang đánh, `OK no console errors`; vệt không che chữ số sát thương (chữ vẽ ở lớp phân giải cao sau).

### 6.5 Kiểm thử

`tests/e2e/gallery.js`, `tests/e2e/perf.js`.

---

## 7. `art-cutin` — Khung cut-in Tuyệt Kỹ / Ấn Kỹ (P1, P3 · Should · todo)

### 7.1 Mục đích

Khoảnh khắc cao trào đáng chụp màn hình khi tung chiêu mạnh nhất. Khung vẽ dùng chung; người dùng chính là `sig-thanhan` (Ấn Kỹ, `04-dac-sac.md`). Tuyệt kỹ cấp 60 trở lên có thể dùng bản nhỏ (Could).

### 7.2 Luồng

Thanh Ấn đầy → bấm nút Ấn → máy chủ phát `sealFx { a, cls, name }` → người tung thấy dải ngang trượt vào giữa màn hình (chân dung phái, tên Ấn Kỹ), khựng 120 ms, tiếng `seal_cutin`; người khác cùng bản đồ thấy dải nhỏ trên đầu nhân vật (`sealTag`).

### 7.3 Quy tắc hình (khớp `04-dac-sac.md` dòng 248, chi tiết thêm ở đây)

| Thành phần | Chuẩn |
|---|---|
| Dải | rộng 100% khung game, cao 120 px (điện thoại 84 px), tâm ở `top: 44%` máy tính, `top: 32%` điện thoại (như số đếm ngược lôi đài) |
| Nền | dải sơn mài `#5a140a` → màu hệ (`ELEMENT_COLORS`) theo chiều ngang, viền vàng đồng `#f0c869` 3 px trên/dưới, 8 vạch tốc độ trắng chéo 20° chạy ngược hướng trượt (alpha 0,35) |
| Chân dung | `drawPortrait` tỉ lệ 3 (điện thoại 2), đặt ở 18% chiều ngang từ cạnh vào, nhìn về giữa màn hình, mặc đúng `look` (thời trang, bậc) của người tung |
| Chữ | tên Ấn Kỹ, VT323 40 px (điện thoại 30 px), màu `#fff3d6`, viền `#1a1020` 2 px, căn sau chân dung |
| Thời gian | trượt vào 120 ms (đi từ mép theo hướng nhìn), giữ 400 ms, trượt ra 180 ms; tổng 700 ms |
| Cache | nền dải dựng một lần mỗi phái mỗi cỡ màn; chân dung dựng mỗi lần đổi `look`; mỗi khung chỉ `drawImage` |
| Người khác | `sealTag`: dải nhỏ 64×14 trên tên nhân vật, tên Ấn Kỹ 16 px, 1,2 s |
| Cài đặt | "Hiện cut-in Ấn Kỹ" (mặc định bật; tắt thì chỉ `sealTag` cho cả mình); `prefers-reduced-motion`: không trượt, hiện tĩnh 500 ms |
| Không | không nhận chạm (`pointer-events: none`), không che thanh trạng thái, không vẽ khi đang mở cửa sổ (`body.win-open`) |

Bản nhỏ cho tuyệt kỹ (Could): cao 48 px, chỉ người tung thấy, 450 ms, tắt chung công tắc.

### 7.4 Dữ liệu, gói, mã

| Phần | Nội dung |
|---|---|
| Dữ liệu | tên Ấn Kỹ ở `shared/data/seal.js` (thuộc `sig-thanhan`) |
| Gói | `sealFx { a, cls, name }` máy chủ → bản đồ (thuộc `sig-thanhan`) |
| Vùng file | Hiệu ứng (`render/fx.js` thêm `cutin({ look, cls, name, el })`, `sealTag(x, y, name, color)`; `render/fx/cutin.js` mới); vẽ trên canvas game (không id DOM mới) |

### 7.5 Tiêu chí chấp nhận

- Gallery mục "Cut-in": 6 phái × 2 cỡ (desktop/điện thoại) ở 3 thời điểm (vào giữa chừng, giữ, ra), không ô trống.
- E2E (`04-dac-sac.md`): sau khi tung `ninja.game.fx.cutins.length > 0`, sau 1 s về 0.
- `test:perf` có kịch bản tung Ấn Kỹ mỗi 10 giây: khung vẽ cut-in ≤ 0,2 ms, không khung nào > 12 ms lúc dựng lần đầu (dựng sẵn khi vào bản đồ nếu thanh Ấn ≥ 80%).
- Ảnh 6 bố cục chuẩn không đè nút HUD; `OK no console errors`.

### 7.6 Kiểm thử

`tests/e2e/gallery.js`, `tests/e2e/e2e.js` (bước Ấn Kỹ của `sig-thanhan`), `tests/e2e/perf.js`.

---

## 8. `art-enhance-aura` — Hào quang theo mốc cường hóa (P1, P5 · Should · todo)

### 8.1 Mục đích

Cường hóa là đường dài tốn công nhất (+1 → +16, tỉ lệ tới 4%). Người chơi cần thấy công sức của mình và của người khác bằng mắt, theo các mốc rõ ràng (P5: đường dài có cột mốc; P1: đẹp, khoe được).

### 8.2 Quy tắc mốc

Hai nguồn: **vũ khí** `wp` (như cũ, `look.wp`) và **bộ** `sp` = cấp cường hóa **thấp nhất** trong 5 ô `hat, armor, gloves, pants, shoes` (mới, `look.sp`; thiếu ô nào thì `sp = 0`).

| Mốc | Theo vũ khí `wp` (hiện tại → mới) | Theo bộ `sp` (mới) |
|---|---|---|
| +5 | lấp lánh 2 điểm trên vũ khí (giữ) | |
| +8 | vũ khí phát sáng + 3 điểm (giữ); vệt vũ khí chuyển `lighter` (mục 6) | viền áo (`TIER_TRIM`) sáng nhịp 1,2 s, alpha 0,35-0,6 |
| +11 | hào quang toàn thân màu vũ khí + đốm (giữ) | |
| +12 | | vạt áo/khăn quàng để lại 1 đốm sáng màu hệ mỗi 0,15 s khi chạy |
| +13 | hào quang **2 lớp**: trong màu hệ, ngoài `TIER_METAL[bậc vũ khí]`; 4 đốm bay lên chậm (12 px/s) | |
| +15 | thêm **vòng phù văn** dưới chân: elip 28×9, 8 khung xoay 0,5 vòng/s, vẽ ở lớp mặt đất (`fx.drawGround`), màu ngoài của lớp +13 | vòng phù văn có thêm vòng trong mảnh (nếu `sp ≥ 12`) |
| +16 | **Viên Mãn**: lớp ngoài đổi vàng `#ffe082`, gót chân có vệt sáng khi chạy (mỗi 0,12 s, 4 hạt), vòng phù văn vàng | |

Ràng buộc:

- Hào quang vẽ **sau** thân (như cũ), không che mặt; độ sáng vùng thân giảm như `levelUp` để vẫn thấy nhân vật.
- Người khác: alpha × 0,6; khi > 12 nhân vật có hào quang trên màn hình, người xa nhất bỏ vòng phù văn (giữ hào quang) để giữ ngân sách.
- Trong lôi đài và chiến trường: giữ nguyên (khoe là mục đích), nhưng vòng phù văn vẽ dưới `telegraph`.
- Hiệu ứng `fx.enhance` (lúc cường hóa xong) giữ nguyên; thêm: lần đầu đạt +13/+15/+16 vũ khí thì `fx.levelUp`-kiểu cột sáng màu mốc 1,2 s và tiếng `enhance_milestone`.

### 8.3 Dữ liệu, gói

| Phần | Nội dung |
|---|---|
| Dữ liệu | không thêm vào `src/shared/data`; mốc là hằng số hình ảnh trong `sprites.js` |
| Gói | `look` (trong `state`, `enter`, `inspect`, màn chọn nhân vật) thêm `sp` (số nguyên 0-16) do máy chủ tính trong hàm dựng `look` (`core/player.js`); dữ liệu cũ không có `sp` thì coi 0 |
| Vùng file | Lõi server (`core/player.js`: 1 dòng tính `sp` cạnh `wp`, xem quy tắc 2 của CLAUDE.md); Nhân vật & NPC (`render/sprites.js` khóa cache thêm `sb` = dải bộ 0/8/12, `sprites/frame.js`); Hiệu ứng (`render/fx.js` vòng phù văn trong `fx/gear.js`) |
| DOM | không mới; cửa sổ Nhân Vật và xem người khác (`windows/character.js`, `windows/inspect.js`) thêm dòng "Hào quang: Vũ khí +N · Bộ +M" (chữ) |

### 8.4 Chống gian lận

`sp` và `wp` máy chủ tính từ trang bị đang mặc; máy khách không gửi. Chỉ là hình.

### 8.5 Tiêu chí chấp nhận

- Kiểm thử thế giới giả: nhân vật mặc 5 ô +12, +12, +9, +15, +12 → `look.sp === 9`; thiếu giày → `sp === 0`; tháo vũ khí → `wp === 0`.
- Gallery mục "Hào quang": `wp` 0, 5, 8, 11, 13, 15, 16 × `sp` 0, 8, 12 × 3 hệ, không ô trống; mã băm ổn định.
- `test:perf` kịch bản 20 người chơi đều +16 bộ +12: phần hào quang + vòng phù văn ≤ 0,4 ms/khung trung bình; 60 fps điện thoại.
- `DESIGN_RULES.md` mục 3 dòng "Cường hóa từ +5" ghi đủ bảng 8.2.

### 8.6 Kiểm thử

`tests/features/inventory.js` (thêm `look.sp`), `tests/e2e/gallery.js`, `tests/e2e/perf.js`.

---

## 9. `char-tier-outfit` — Màu 8 bậc trang bị mới (P1 · Must · todo)

### 9.1 Mục đích

Bậc 12-19 (cấp 120-190, `gear-tier-199`) phải nhìn ra trên người nhân vật và trên icon: mỗi bậc một bộ màu khác các bậc cũ, đi kèm hoa văn tăng dần.

### 9.2 Bảng màu cho cả 4 mảng

Nối vào **cuối** mỗi mảng (giữ thứ tự 0-11). `TIER_COLORS` (`items/base.js`) **luôn bằng** `TIER_METAL` (`sprites/color.js`) như hiện tại.

| t | Tên bậc | Cấp | `TIER_OUTFIT` (vải áo) | `TIER_METAL` = `TIER_COLORS` (kim loại, icon) | `TIER_TRIM` (viền) | Ý tưởng hoa văn |
|---|---|---|---|---|---|---|
| 12 | Phượng | 120 | `#c8431c` | `#ff7a2e` | `#ffd27a` | giáp vai lông vũ |
| 13 | Kỳ Lân | 130 | `#4f8a2a` | `#b6f05a` | `#f0ffd0` | vảy lân trên vai |
| 14 | Nhật Nguyệt | 140 | `#3a4f8c` | `#a8c4ff` | `#ffffff` | gia huy trăng khuyết |
| 15 | Tinh Hà | 150 | `#26246e` | `#4a6cff` | `#c8d4ff` | chấm sao trên vạt áo |
| 16 | Hỗn Nguyên | 160 | `#127a78` | `#38e8e0` | `#e0fffc` | điểm sáng trắng giữa gia huy |
| 17 | Thái Cực | 170 | `#e8e4dc` | **`#fff4d6`** (đặc tả nội dung ghi `#f4f4f4`) | `#2a2433` | viền tối trên áo sáng (âm dương) |
| 18 | Vô Cực | 180 | `#4a1e7a` | `#c86bff` | `#ffd6ff` | vạt áo dài thêm 1 hàng |
| 19 | Chí Tôn | 190 | `#7a1420` | `#ffd700` | `#ffd700` | viền vàng kim toàn thân |

Đo (`lab/m09/tiercolor.out`, `tiercand.out`, khoảng cách CIE76 trong Lab):

| Phép đo | Theo `content/00-foundation.md` | Sau khi đổi Thái Cực |
|---|---|---|
| Kim loại: cặp gần nhất có bậc mới | 6,6 (Thái Cực - Bạc) | 20,2 (Thái Cực - Bạc) |
| Vải áo: cặp gần nhất có bậc mới | 14,6 (Vô Cực - Tinh Hà; phân biệt được nhờ kim loại khác hẳn) | 14,6 |
| Cặp (vải, kim loại) gần nhất toàn bảng, lấy max hai khoảng | 19,3 (Gỗ - Đồng, bậc cũ) | 19,3 |
| Tương phản icon trên nền ô `#2a1a10` (bậc mới) | 3,9 (Tinh Hà) - 15,2 | 3,9 - 14,6 |

Viền (`TIER_TRIM`) được phép trùng giữa các bậc (bậc cũ đã trùng: Ngọc = Huyền `#f2c230`), vì nhận diện bằng cặp (vải, kim loại).

Hoa văn (theo `content/00-foundation.md` mục 3.3, không đổi): áo `at ≥ 12` giáp vai 2 bên; `at ≥ 16` điểm sáng giữa gia huy + vạt áo màu viền dài thêm 1 hàng; băng trán `ht ≥ 12` thêm điểm sáng thứ hai. Không hoạt ảnh, không hào quang (hào quang thuộc mục 8). Mọi điểm trong `NINJA_H`.

### 9.3 Dữ liệu, gói, mã

| Phần | Nội dung |
|---|---|
| Dữ liệu | `src/shared/data/items/base.js` `TIER_NAMES/TIER_LV/TIER_COLORS` dài 20 do `core-levelcap-199` mở (một chủ, chỉnh khi ghép); tính năng này chỉ giữ 3 mảng client |
| Gói | không mới (`look.w/a/p/h` đã có số bậc) |
| Vùng file | Nhân vật & NPC (`render/sprites/color.js`, `render/sprites/body.js`); `tools/check-data.js` (độ dài 4 mảng = `TIERS`, khoảng cách màu) |

### 9.4 Tiêu chí chấp nhận

- `TIER_OUTFIT/TIER_METAL/TIER_TRIM` dài 20, `npm run check` sạch; với mọi bậc `j ≥ 12`, ΔE76 kim loại tới mọi bậc khác ≥ 15. Kiểm `TIER_COLORS[i] === TIER_METAL[i]` khi `core-levelcap-199` mở 20 bậc.
- Ảnh bậc 12, 15, 17, 19 cho 6 phái × nam/nữ dựng bằng ô gallery `/dev/gallery` với `look` gán thẳng (không cần vật phẩm, nên chụp được ở ĐIỂM DỪNG 1), desktop + điện thoại, `OK no console errors`; gallery mục "Bậc trang bị" hiện 20 bậc cạnh nhau. Ảnh mặc đủ bộ vật phẩm (`/item armor_17 1`) thuộc `gear-tier-199`.
- Bậc 0-11 không đổi một điểm ảnh nào (so ô gallery bậc 0-11 với cùng ô dựng từ mốc `a4b4a0a`, trước khi đổi màu).

### 9.5 Kiểm thử

`tools/check-data.js`, `tests/features/levelcap.js` (của `gear-tier-199`), `tests/e2e/gallery.js`.

---

## 10. Thế giới 121-199: theme, biến thể, quái

### 10.1 `art-themes-new` — 3 theme mới và biến thể bản đồ (P1 · Must · todo)

**Mục đích.** 48 bản đồ Thượng Giới cần cảnh khác nhau mà không viết bộ vẽ mới: ưu tiên dùng lại 23 theme, đa dạng bằng `MAP_VARIANTS`, chỉ thêm 3 theme cho cảnh chưa có (đặc tả chi tiết: `content/10-world.md` mục 7, tài liệu này chốt chuẩn và tiêu chí).

| Theme mới | Ý tưởng | Điểm nhận diện | `dayK` | Hạt | Bản đồ dùng |
|---|---|---|---|---|---|
| `swamp` (đầm lầy) | đầm nước đen phủ bèo, rễ đước, sương thấp, đom đóm | trời lục xám, liễu rủ, mặt nước phản chiếu mờ, `fogA 0,18` | 0,85 | `firefly` | `ga_damhac`, `gc_damoan`, `um_damuminh` |
| `starfield` (tinh hà) | đường lát ngọc trôi giữa dải Ngân Hà | trời chàm 220 sao, dải cực quang làm Ngân Hà, cột đá trôi, bục mây tím | 0,3 | `sparkle` | `th_ngankieu`, `th_langdai`, `hd_hukhong` (biến thể `void`) |
| `jade_peak` (núi đá vôi ngọc bích) | rừng đá vôi màu ngọc như tranh thủy mặc | 2 lớp `karst` màu ngọc, tùng trên đỉnh, hồ xanh ngọc, nhiều khoảng trắng | 1 | `mist` | `gd_thachlam`, `ge_loivan`, `bl_ngocphong`, `hl_thachquan`, `tc_bandao`, `tc_tram` |

Quy tắc:

- Chỉ dùng loại lớp/trang trí/hạt **đã có** (`hills, trees, props, mount, clouds, colonnade, karst`; mặt đất `grass, cloud, rock`; hạt `firefly, sparkle, mist`). Không viết bộ vẽ mới, không sửa `map/sky.js`.
- Mỗi theme mới đủ 5 nơi: `THEMES`, `SCENES` (`render/map/themes.js`), `REGION` + `THEME_GLYPH` + glyph 12×10 (`ui/worldmap.js`), danh sách `THEMES` trong `tools/check-data.js`, và **dòng nhạc** `MUSIC_THEME` (`swamp → field_swamp`, `starfield → field_starfield`, `jade_peak → field_jade`; `npm run check` đã báo lỗi nếu thiếu).
- 39 biến thể `MAP_VARIANTS` (15 Hạ Giới mở rộng + 24 Thượng Giới) theo `content/10-world.md` mục 7.6; tên trong `swap` chưa có hình thì đổi sang loại khác trong cùng danh sách và ghi lại.
- Trạm (`town: true` + `townStyle`): nhà vẽ theo hệ như làng, nền theo theme bãi (1 dòng trong `maprender.js`).
- Ngày/đêm: `starfield` có `dayK 0,3` (luôn tối dịu), không làm tối thêm quá mức thực thể (`ENT_DARK` giữ 0,4).

### 10.2 Bảng nhận diện 8 vùng Thượng Giới

| Vùng (khóa) | Cấp | Tông màu chủ đạo (quái + cảnh) | Theme các bản đồ (M1, M2, M3, D1, P, Trạm) | Hạt đặc trưng | Nhạc (theo theme, mục 11.5) |
|---|---|---|---|---|---|
| Quần Đảo Bồng Lai (`bonglai`) | 120-129 | lam ngọc - hồng san hô | `beach`, `sakura`, `dragon_palace`, `lake`, `jade_peak`, `beach` + nhà Thủy | `sparkle`, `mist` | `field_beach`, `field_sakura`, `field_sea`, `field_jade` |
| Xích Viêm Hỏa Vực (`xichviem`) | 130-139 | đỏ cam | `desert`, `lava`, `hell`, `lava`, `cave`, `desert` + nhà Hỏa | `ember` | `field_desert`, `field_lava`, `field_hell`, `field_cave` |
| Vạn Niên Băng Nguyên (`bangnguyen`) | 140-149 | trắng lam | `snow`, `ice`, `crystal`, `ice`, `mist`, `snow` + nhà Thủy | `mote`, `snow` | `field_snow`, `field_crystal`, `field_mist` |
| Thiên Cổ Hoàng Lăng (`hoanglang`) | 150-159 | vàng đồng - đất nung | `desert`, `ruins`, `cave`, `ruins`, `jade_peak`, `ruins` + nhà Hỏa | `sand`, `mote` | `field_desert`, `field_ruins`, `field_cave`, `field_jade` |
| U Minh Quỷ Lâm (`uminh`) | 160-169 | lục độc - tím | `mist`, `dark_forest`, `bamboo`, `dark_forest`, `swamp`, `bamboo` + nhà Phong | `firefly`, `void` | `field_mist`, `field_dark`, `field_bamboo`, `field_swamp` |
| Tinh Hà Thiên Lộ (`tinhha`) | 170-179 | chàm - vàng sao | `heaven`, `crystal`, `starfield`, `starfield`, `heaven`, `heaven` + nhà Phong | `sparkle` | `field_heaven`, `field_crystal`, `field_starfield` |
| Hỗn Độn Ma Vực (`hondon`) | 180-189 | đen tím - đỏ máu | `abyss`, `hell`, `lava`, `hell`, `starfield`, `abyss` + nhà Hỏa | `ember`, `void` | `field_abyss`, `field_hell`, `field_lava`, `field_starfield` |
| Thái Cực Thần Cảnh (`thaicuc`) | 190-199 | trắng đen - vàng kim | `heaven`, `dragon_palace`, `heaven`, `sakura`, `jade_peak`, `jade_peak` + nhà Thủy | `petal`, `sparkle` | `field_heaven`, `field_sea`, `field_sakura`, `field_jade` |

Trạm dùng nhạc làng theo `townStyle` (mục 11.5, `MUSIC_TOWN`).

**Dữ liệu, gói.** Theme là dữ liệu client (`render/map/themes.js`), bản đồ chọn theme ở `src/shared/data/maps.js` / `regions/*.js` (thuộc `world-region-*`). Không gói mới.

**Tiêu chí chấp nhận.**

- `npm run check` sạch: 26 theme có `SCENES`, `REGION`, `THEME_GLYPH`, `MUSIC_THEME`.
- Ảnh từng bản đồ dùng theme mới hoặc biến thể (`/tp <id>`), ban ngày (`forceHour = 12`) và ban đêm (`forceHour = 22`), desktop + điện thoại, `OK no console errors`; không trang trí nào cách NPC < 26 px hay cổng < 70 px (kiểm có sẵn của `check-data`).
- `test:perf` với `MAPS=th_ngankieu,um_damuminh,tc_bandao`: 60 fps, CPU trung bình ≤ 5 ms.
- Gallery mục "Theme": 26 dải 320×120 lúc 12h và 22h.

**Kiểm thử.** `tools/check-data.js`, `tests/features/world.js` (của `world-upper`), `tests/e2e/perf.js`, `tests/e2e/gallery.js`.

### 10.3 `art-monsters-199` — Hình quái và boss Thượng Giới (P1 · Must · todo)

**Mục đích.** 72 quái + 9 boss mới có hình ngay mà không vẽ mới từng con (đặc tả chi tiết: `content/20-monsters.md` mục 2-3, 5).

Quy tắc:

- Trường `art` trong file vùng: `{ idQuái: 'idGốc' }`, gốc cùng kiểu sprite, boss chỉ mượn boss, không mượn Tà Thú/quái hang/gia tộc. Thứ tự ưu tiên ở client: hình riêng theo id → hình mượn → mặc định của kiểu (`variantOf`).
- Bảng màu `pal[3]` theo tông vùng (bảng 10.2), không `#000000`; hai quái cùng nguồn mượn trong một vùng phải khác màu chính ΔE76 ≥ 25.
- Boss: `AURA2` riêng 9 boss (màu theo `content/20-monsters.md` 3.5), `BOSS_CROWN` thêm 2 boss thân sói/cáo; boss cuối `boss_tc_maton` có hào quang vàng `#fff59d` và khung `cast` (mục 4.3).
- Bước A2 (Could trong id này): 18 bộ trang phục quái người riêng ở `render/monster/humhi.js`.
- Cỡ: `scale` 1 / 1,3-1,4 / 1,6 theo đặc tả; thân chính ≤ 1,5 lần hitbox (`DESIGN_RULES.md` mục 4).

**Tiêu chí chấp nhận.** `npm run check` khối "Quái Thượng Giới": mỗi quái mới có `art` hợp lệ, cùng kiểu, bảng màu đúng dạng; `monsterHeight(def)` khớp hộp bao điểm ảnh ±2 px (đo trong `tests/e2e/gallery.js`); ảnh mỗi vùng (4 bãi + bí cảnh) desktop + điện thoại `OK no console errors`; `prewarmMonsters` vào bản đồ có boss vùng không khung nào > 16 ms.

**Kiểm thử.** `tools/check-data.js`, `tests/features/regions.js` (mới, của `content/20-monsters.md` 3.7), `tests/e2e/gallery.js`.

---

## 11. Âm thanh

### 11.1 `snd-audio-files` — hiện trạng (P1, P2 · Should · todo, nhánh `feat/audio`)

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | nhạc nền có giai điệu theo vùng/tình huống và tiếng hiệu ứng có chất liệu thật (kim loại, lửa, nước) mà tiếng tổng hợp đơn giản không làm được (P1), không làm chậm lúc vào game (P2) |
| Luồng | vào trang → màn mở đầu im lặng tới lần chạm/phím đầu (trình duyệt chặn tự phát) → `unlock()` bật nhạc `title`, tải lần lượt tiếng hiệu ứng mỗi 60 ms → vào bản đồ `updateMusic()` chọn bài theo tình huống (lôi đài > Tà Thú > boss trong 0,75 khung nhìn > phó bản > làng lúc lễ hội) rồi theo theme → đổi bài giảm dần 1,2 s, bài mới tăng dần 1,5 s |
| Quy tắc | file tồn tại mới phát (`S.G.audio.have`); Opus nếu trình duyệt phát được, không thì `.m4a`; tiếng lệch cao độ 0,96-1,04 để không nghe như máy; mỗi tên tiếng chặn lặp 45 ms; bus nhạc × 0,55; 2 thanh âm lượng 0-100 (`musicVol` mặc định 60, `sfxVol` 80) lưu `localStorage`; Cài đặt ghi "Tiếng hiệu ứng: Powered by Stability AI." khi có file tiếng |
| Dữ liệu | `src/shared/data/audio.js` |
| Gói | không hành động mới; `data.audio = { MUSIC_THEME, MUSIC_DEFAULT, MUSIC_SCENE, SKILL_SFX, FX_SFX, EVENT_SFX, BOSS_SFX, have { music, sfx }, m4a { music, sfx } }` qua móc `clientData` |
| Module, client | `modules/audio`, `services/http.js` (Range, 206/416), `core/sound.js` (`sfx, skillSfx, bossSfx, music, musicFor, applyAudio, audioInfo`), `game/game.js` (`updateMusic`), `windows/settings.js` |
| Chống gian lận | id file chỉ `[a-z0-9_]`; HTTP chặn đường dẫn ra ngoài `src/client` (đã có `403`); Range ngoài file trả 416 |
| Kiểm thử | `tests/features/audio.js`: 3 kiểm tra đơn vị + 5 kiểm tra HTTP Range |

Phần cần nâng (điều kiện để chuyển `done`):

1. Chốt ADR-09-1 (mục 14) và gộp theo thứ tự: tái cấu trúc → túi đồ → âm thanh.
2. 71 file đã tạo ở `~/.local/share/ninja-audio/out/`: mã hóa lại nhạc sang Opus 48 kbps (≈ 12 MB cho 25 bài, mục 11.2), chuyển công thức vào `AUDIO_SPEC` (mục 11.3), chép bằng `tools/sync-audio.js`, nghe duyệt vòng lặp từng bài, commit `src/client/audio/` + `CREDITS.md`.
3. Sửa `.dockerignore` thêm `!src/client/audio/CREDITS.md` (L5).
4. URL có phiên bản: `data.audio.have` thành `{ id: ver }` (8 ký tự băm nội dung), máy khách gọi `audio/<kind>/<id>.ogg?v=<ver>`, `services/http.js` cho `audio/` vào `versioned()` để trả `immutable` (L6).
5. Sửa L1, L2, L3 (mục 11.6).
6. Tiếng của người khác: kỹ năng của người chơi khác trong 1 khung nhìn phát ở gain 0,35, lệch trái/phải bằng `StereoPannerNode` theo `clamp((x − tâm camera) / (W/2), −0,8, 0,8)`; tối đa 12 tiếng cùng lúc (bỏ tiếng cũ nhất).
7. Nhạc nhỏ đi 30% trong 1,5 s khi phát tiếng dài (`levelup`, `victory`, `defeat`, `quest_done`, `enhance_milestone`).
8. `README.md` bỏ dòng "âm thanh tổng hợp bằng WebAudio".

### 11.2 Ngân sách và mã hóa (đo trong `lab/m09`)

| Định dạng | Cài đặt | Đo trên bài `title` 60 s | Dùng |
|---|---|---|---|
| Opus `.ogg` | 96 kbps (hiện tại) | 847 KB (thực 115 kbps) | bỏ |
| Opus `.ogg` | 64 kbps stereo | 620 KB | |
| Opus `.ogg` | **48 kbps stereo** | **470 KB** | nhạc (chuẩn mới) |
| Opus `.ogg` | 40 kbps stereo | 399 KB | dự phòng nếu vượt ngân sách |
| AAC `.m4a` | 64 kbps stereo | 492 KB | bản phụ cho trình duyệt không phát Opus |
| Opus `.ogg` mono | 64 kbps | khoảng 8 KB mỗi giây tiếng | tiếng hiệu ứng (giữ) |

Ngân sách (thay mục tiêu "≤ 8 MB tổng" của ADR-01-1, xem ADR-09-1):

| Chỉ số | Trần |
|---|---|
| Mỗi bài nhạc `.ogg` | ≤ 520 KB, dài 45-75 s, vòng lặp liền (cắt theo ô nhịp, nối đuôi vào đầu 50 ms) |
| Mỗi tiếng `.ogg` | ≤ 24 KB (≤ 2,5 s) |
| Kho `.ogg`: nhạc / tiếng | ≤ 21 MB (40 bài) / ≤ 2 MB (90 tiếng) |
| Byte âm thanh trên đường "mở link tới điều khiển được" | 0 |
| Byte âm thanh tải trong 10 phút đầu một phiên | ≤ 2 MB (bài `title` + 1 làng + 1 bãi + tiếng) |

### 11.3 Công thức tạo nằm trong repo

- `src/shared/data/audio.js` thêm `AUDIO_SPEC`: `[kind, id, giây, prompt, seed]` cho **mọi** id nhạc và tiếng (chuyển từ `~/.local/share/ninja-audio/queue.tsv`, prompt tiếng Anh vì là đầu vào model, mô tả tiếng Việt ở bảng 11.6).
- `tools/audio-queue.js` (mới): xuất `queue.tsv` từ `AUDIO_SPEC`; `tools/sync-audio.js` lấy danh sách id từ `AUDIO_SPEC` thay danh sách viết cứng (L8), ghi `CREDITS.md` gồm model, giấy phép, prompt, seed, ngày tạo.
- `npm run check` thêm: mọi id trong `MUSIC_*`, `SKILL_SFX`, `FX_SFX`, `EVENT_SFX`, `BOSS_SFX`, `SFX_SYNTH` có dòng `AUDIO_SPEC`; mọi id nhạc có công thức `SYNTH_MUSIC` (mục 11.4); mọi chuỗi `sfx('x')` trong mã client (đọc như các kiểm tra mã hiện có) có trong `EVENT_SFX` hoặc `SFX_SYNTH`.
- Prompt cấm nêu tên game, tác giả, bài hát, nhân vật có thật; chỉ mô tả nhạc cụ, nhịp, tâm trạng ("retro 16-bit", "pentatonic", "instrumental, no vocals").

### 11.4 `snd-synth-music` — Nhạc nền tổng hợp WebAudio thủ tục (P1, P2 · Should · todo)

**Mục đích.** (a) Lớp dự phòng bắt buộc cho **mọi** bài khi chưa có file, file lỗi hay trình duyệt không giải mã được; (b) chế độ "Tiết kiệm dữ liệu" cho điện thoại mạng di động (0 byte nhạc); (c) lớp nhạc động mà file không làm được: boss cuồng nộ thêm trống dồn. Đúng quy tắc gốc của dự án (WebAudio tổng hợp), không có rủi ro giấy phép.

**Luồng.** `music(id)` → có file và chế độ "Tự động" → phát file như cũ; không có file **hoặc** chế độ "Tổng hợp" → `musicgen.play(SYNTH_MUSIC[id])` qua cùng `musicBus`, cùng giảm/tăng dần 1,2/1,5 s. Tab ẩn (`document.hidden`) thì dừng lập lịch.

**Đo nguyên mẫu** (`lab/m09/synth/run.out.json`, Chromium headless trên M1, dựng offline 44,1 kHz; nghe thử ở `lab/m09/synth/*.ogg`):

| Bài thử | Thang, BPM | Dài | Số nốt/s | Node âm thanh/s | Dựng nhanh hơn thời gian thực | Lập lịch trên luồng chính |
|---|---|---|---|---|---|---|
| `village_fire` | `bac`, 92 | 73 s | 4,8 | 24 | 15,9 lần | 0,24 ms mỗi giây nhạc |
| `boss` | `chien`, 148 | 45 s | 11,5 | 51 | 9,8 lần | 0,33 ms mỗi giây nhạc |
| `field_abyss` | `ma`, 76 | 88 s | 2,6 | 12 | 20,9 lần | 0,09 ms mỗi giây nhạc |

Mã nguyên mẫu 8,1 KB, nén gzip 2,7 KB (so với 470 KB một bài file). Luồng âm thanh dùng ≤ 10% một nhân ở bài nặng nhất; luồng chính ≤ 0,006 ms/khung.

**Quy tắc bộ máy** (`src/client/js/core/musicgen.js` mới):

| Thành phần | Chuẩn |
|---|---|
| Ngẫu nhiên | `mulberry32(seed)` riêng mỗi bài: cùng bài luôn ra cùng giai điệu |
| Lập lịch | `setInterval` 50 ms, xếp nốt trước 0,2 s theo `AudioContext.currentTime`; tối đa 10 giọng cùng lúc (cướp giọng cũ nhất) |
| Giai điệu | mỗi đoạn một môtíp 2 ô nhịp: đi bước theo thang (±1 bậc 50%, ±2 bậc 30%, giữ 20%), 12% nghỉ; trường độ theo `dens` (≥ 0,6: móc đơn/đen; < 0,6: đen/trắng); câu = môtíp, môtíp dịch +2 bậc ở ô 5-6, về chủ âm ở 2 phách cuối đoạn |
| Hòa âm | vòng bậc gốc `[0, 3, 4, 0]` của thang; trầm đánh phách 1 và 3; `harm` rải 4 phách hoặc giữ hợp âm `pad` |
| Cấu trúc đoạn | chuỗi `form` như `I2 A8 B8 A8 C4`: `I` dạo đầu (trống + chiêng, không giai điệu), `A` chủ đề, `B` đối (dịch +2 bậc, dày hơn), `C` chuyển (dịch −1 bậc, thưa), rồi lặp từ `A` (không lặp `I`); đầu mỗi đoạn `B/C` đánh chiêng |
| Lớp | `layer 0` bình thường; `layer 1` (boss cuồng nộ, `o.rage`): thêm phách móc đơn và trống dồn mỗi 2 ô nhịp, không đổi BPM |
| Âm lượng | bus tổng hợp 0,5 rồi vào `musicBus`; nén động `DynamicsCompressor` (ngưỡng −18 dB) để không vỡ tiếng |

**Thang âm** (nửa cung tính từ chủ âm; số trong ngoặc là cent lệch để ra hơi Việt, xấp xỉ, không nhại bài có sẵn):

| Khóa | Tên | Bậc | Màu sắc |
|---|---|---|---|
| `bac` | Ngũ cung Bắc | 0, 2, 5, 7, 9 | vui, sáng, làng quê |
| `xuan` | Ngũ cung Xuân | 0, 2, 4, 7, 9 | tươi, lễ hội nhẹ |
| `nam` | Ngũ cung Nam | 0, 3 (−30), 5, 7, 10 (+30) | trầm, huyền bí |
| `oan` | Ngũ cung Oán | 0, 3 (+30), 5, 7, 10 (−30) | ai oán, sương mù |
| `am` | U tối | 0, 1, 5, 7, 8 | hang, đầm, quỷ |
| `thien` | Thiên giới | 0, 2, 4, 6, 9 | lâng lâng, trên mây |
| `ma` | Ma giới | 0, 1, 4, 5, 7, 8, 10 | ma mị, dung nham |
| `hoi` | Hội | 0, 2, 4, 5, 7, 9, 11 | rộn ràng |
| `chien` | Chiến | 0, 2, 3, 5, 7, 9, 10 | dồn dập, quyết đấu |

**Nhạc cụ tổng hợp** (tên nhạc cụ Việt cho dễ nhớ; chỉ là công thức âm sắc):

| Khóa | Gợi | Công thức WebAudio |
|---|---|---|
| `tranh` | đàn tranh | tam giác + sin quãng tám (0,3), tấn 3 ms, tắt mũ 0,9 s, lọc thấp 3,2 → 1,2 kHz; nốt ≥ 0,5 s có nhấn lên nửa cung sau 150 ms |
| `bau` | đàn bầu | sin + bội 2 (0,15), tấn 20 ms, rung 5 Hz sâu 0,9% bắt đầu sau 250 ms, trượt giữa hai nốt 80 ms |
| `sao` | sáo trúc | sin + tam giác (0,2), tiếng hơi nhiễu lọc dải 2,5 kHz, tấn 40 ms, rung 5,5 Hz sau 150 ms, nhả 120 ms |
| `nguyet` | đàn nguyệt | `PeriodicWave` 6 bội giảm dần, tấn 2 ms, tắt 0,35 s, lọc dải 1,8 kHz |
| `ken` | kèn bầu | răng cưa qua lọc dải 1,1 kHz (Q 2), rung 6 Hz, tấn 30 ms |
| `chuong` | chuông, khánh | 3 sin bội 1 / 2,76 / 5,4, tắt 1,8 s |
| `pad` | dây, hợp xướng | 2 răng cưa lệch ±7 cent qua lọc thấp 1,4 kHz, tấn 0,6 s, nhả 1 s |
| `bass` | trầm | tam giác qua lọc thấp 600 Hz, tắt 0,4 s |
| `trong` | trống lớn | sin quét 120 → 48 Hz trong 0,25 s + tiếng gõ nhiễu 20 ms |
| `trongcom` | trống cơm | sin 230 → 180 Hz (mở) hoặc 170 → 130 Hz (bịt) 0,12 s |
| `mo` | mõ | sin 900 Hz 50 ms + nhiễu dải 1,5 kHz |
| `phach` | phách, chũm chọe | nhiễu lọc cao 3,5 kHz 30 ms |
| `chieng` | chiêng | 3 sin 110 / 163 / 231 Hz, tắt 2,8 s |

**Mẫu trống** (phách trong ô 4/4): `calm` trống cơm 1 (bịt), 3 (mở), mõ 2,5 và 4,5; `march` trống 1, 3 + phách mọi móc đơn; `battle` trống 1, 1,5, 2,5, 3, 3,5, 4,5 + phách 2, 4 + trống cơm 1,75, 3,75; `fest` trống cơm 1, 1,75, 2,5, 3, 4 + phách nửa phách; `dark` trống 1 + mõ 3,5; `none` không trống.

**Bảng 40 bài** (`SYNTH_MUSIC` trong `src/shared/data/audio.js`; `gốc` là số MIDI; "dẫn/hòa" là nhạc cụ giai điệu/đệm; mọi bài có `bass`):

| Id | Dùng cho | Thang | Gốc | BPM | Dẫn / hòa | Trống | Cấu trúc | Tâm trạng |
|---|---|---|---|---|---|---|---|---|
| `title` | màn mở đầu | `bac` | 62 (Rê) | 104 | `sao` / `tranh` | `march` + chiêng mở | I2 A8 B8 A8 C4 | hùng tráng, mời gọi |
| `village_fire` | làng Hỏa, trạm nhà Hỏa | `bac` | 62 | 92 | `sao` / `tranh` | `calm` | A8 B8 A8 C4 | ấm, yên |
| `village_water` | làng Thủy, trạm nhà Thủy | `xuan` | 65 | 84 | `tranh` / `chuong` | `none` | A8 B8 A8 C4 | êm như mặt hồ |
| `village_wind` | làng Phong, trạm nhà Phong | `bac` | 67 | 100 | `sao` / `nguyet` | `calm` | A8 B8 A8 C4 | thoáng, vui |
| `field_grass` | `grass_fire`, `grass_wind`, mặc định | `xuan` | 60 | 112 | `sao` / `nguyet` | `march` | A8 B8 A8 C4 | phiêu lưu |
| `field_bamboo` | `bamboo` | `nam` | 64 | 88 | `sao` / `tranh` | `calm` | A8 B8 A8 C4 | tĩnh, bí ẩn |
| `field_beach` | `beach`, `lake` | `xuan` | 69 | 108 | `nguyet` / `chuong` | `fest` | A8 B8 A8 C4 | nắng, thong thả |
| `field_cave` | `cave` | `am` | 50 | 72 | `tranh` / `pad` | `dark` | A8 B8 A8 C4 | vọng, căng |
| `field_desert` | `desert` | `ma` | 64 | 96 | `bau` / `nguyet` | `march` | A8 B8 A8 C4 | khô nóng |
| `field_mist` | `mist` | `oan` | 62 | 70 | `sao` / `pad` | `dark` | A8 B8 A8 C4 | u buồn |
| `field_snow` | `snow`, `ice` | `thien` | 69 | 80 | `tranh` / `pad` | `none` | A8 B8 A8 C4 | lạnh, hùng vĩ |
| `field_dark` | `dark_forest` | `am` | 60 | 84 | `bau` / `pad` | `dark` | A8 B8 A8 C4 | rợn |
| `field_lava` | `lava` | `ma` | 50 | 126 | `nguyet` / `pad` | `battle` | A8 B8 A8 C4 | rực, gấp |
| `field_hell` | `hell` | `ma` | 48 | 116 | `bau` / `pad` | `battle` | A8 B8 A8 C4 | đe dọa |
| `field_heaven` | `heaven` | `thien` | 65 | 76 | `sao` / `chuong` | `none` | A8 B8 A8 C4 | thanh tịnh |
| `field_sea` | `dragon_palace` | `nam` | 67 | 82 | `tranh` / `pad` | `calm` | A8 B8 A8 C4 | huyền ảo dưới nước |
| `field_sakura` | `sakura` | `xuan` | 64 | 90 | `tranh` / `sao` | `calm` | A8 B8 A8 C4 | dịu dàng |
| `field_ruins` | `ruins` | `oan` | 57 | 92 | `nguyet` / `pad` | `march` | A8 B8 A8 C4 | cổ kính |
| `field_crystal` | `crystal` | `thien` | 71 | 96 | `chuong` / `pad` | `calm` | A8 B8 A8 C4 | lấp lánh |
| `field_abyss` | `abyss` | `ma` | 52 | 76 | `tranh` / `pad` | `dark` | A8 B8 A8 C4 | tà ác |
| `arena` | phòng lôi đài | `chien` | 57 | 140 | `nguyet` / `bass` | `battle` + chiêng mở | I2 A8 B8 A8 C4 | quyết đấu |
| `boss` | boss Hạ Giới (cấp < 120) | `chien` | 57 | 148 | `bau` / `pad` | `battle` | I2 A8 B8 A8 C4, có `layer 1` | dồn dập |
| `tathu` | Tà Thú trong bản đồ | `ma` | 55 | 156 | `bau` + `sao` quãng tám / `pad` | `battle` | I2 A8 B8 A8 C4, có `layer 1` | khẩn cấp |
| `dungeon` | phó bản, hang | `am` | 50 | 120 | `nguyet` / `pad` | `march` | A8 B8 A8 C4 | căng |
| `festival` | lễ hội mặc định (= Trăng Rằm) | `hoi` | 60 | 116 | `sao` / `tranh` + `chuong` | `fest` | A8 B8 A8 C4 | rộn ràng |
| `field_swamp` | `swamp` (mới) | `am` | 60 | 78 | `bau` / `pad` | `dark` | A8 B8 A8 C4 | ẩm, độc |
| `field_starfield` | `starfield` (mới) | `thien` | 62 | 72 | `sao` / `chuong` rải móc đơn | `none` | A8 B8 A8 C4 | bao la |
| `field_jade` | `jade_peak` (mới) | `bac` | 67 | 88 | `sao` / `tranh` | `calm` | A8 B8 A8 C4 | thủy mặc |
| `boss_high` | boss vùng 120-199 | `ma` | 47 | 152 | `bau` / `pad` | `battle` + chiêng mỗi đoạn | I2 A8 B8 A8 C4, có `layer 1` | áp đảo |
| `boss_final` | `boss_tc_maton` | `am` | 48 | 160 | `bau` + `ken` / `pad` | `battle` + chiêng mỗi 2 ô | I4 A8 B8 C8, có `layer 1` | trận cuối |
| `worldboss` | Hung Tinh Giáng Thế | `chien` | 50 | 150 | `sao` + `bau` đồng âm / `pad` | `battle` | I2 A8 B8 A8 C4, có `layer 1` | cả máy chủ cùng đánh |
| `battlefield` | Chiến Trường | `chien` | 52 | 138 | `ken` / `bass` | `march` dồn | I2 A8 B8 A8 C4 | trống trận |
| `clanwar` | Chiến gia tộc | `chien` | 55 | 132 | `ken` / `pad` | `march` | I2 A8 B8 A8 C4 | quân kỳ |
| `defense` | Thủ Hộ Làng | `bac` | 62 | 126 | `sao` / `nguyet` | `march` | I2 A8 B8 A8 C4 | giữ làng |
| `fest_tet` | Hội Xuân (Tết) | `xuan` | 65 | 120 | `ken` / `tranh` | `fest` (trống lân) | I2 A8 B8 A8 C4 | rộn rã |
| `fest_tinhnhan` | Mùa Hoa Tình Nhân | `xuan` | 69 | 84 | `tranh` / `chuong` + `pad` | `calm` | A8 B8 A8 C4 | ngọt ngào |
| `fest_datto` | Lễ Hội Đất Tổ (30-4) | `bac` | 62 | 100 | `sao` / `nguyet` | `march` + chiêng (trống đồng) | I2 A8 B8 A8 C4 | trang nghiêm, tự hào |
| `fest_he` | Hội Hè Biển Xanh | `hoi` | 67 | 124 | `nguyet` / `chuong` | `fest` | A8 B8 A8 C4 | tươi mát |
| `fest_hoatrang` | Đêm Hội Hóa Trang (Halloween) | `am` | 64 | 108 | `bau` / `chuong` (hộp nhạc) | `fest` + mõ | A8 B8 A8 C4 | rùng rợn vui |
| `fest_giangsinh` | Đêm Đông An Lành (Noel) | `hoi` | 65 | 96 | `chuong` / `pad` | `calm` | A8 B8 A8 C4 | ấm áp, chuông ngân |

`fest_trangram` dùng chính `festival`.

**Dữ liệu.** `SYNTH_MUSIC = { id: { sc, root, bpm, lead, harm, drums, form, dens, seed } }`, `SFX_SYNTH = { idTiếng: tênCôngThứcTổngHợp }` (mục 11.6) trong `src/shared/data/audio.js`; tới máy khách qua `data.audio`.

**Gói.** Không mới.

**Module, cửa sổ.** `core/musicgen.js` (mới, vùng Vòng lặp game), `core/sound.js` (`syncMusic` chọn file hay tổng hợp; export mới `musicLayer(n)`), `game/game.js` (`updateMusic`: gọi `musicLayer(1)` khi boss gần đang cuồng nộ), `windows/settings.js` thêm hàng chọn "Nguồn nhạc: Tự động / Tổng hợp (tiết kiệm dữ liệu)" (`S.settings.musicSrc = 'auto' | 'synth'`, nút 2 lựa chọn cao 44 px trên điện thoại).

**Chống gian lận.** Không liên quan máy chủ.

**Tiêu chí chấp nhận.**

- `npm run check`: 40 id nhạc đều có `SYNTH_MUSIC` hợp lệ (thang thuộc 9 khóa, nhạc cụ thuộc 13 khóa, `bpm` 60-180, `form` khớp `^(I\d )?([ABC]\d+ ?)+$`).
- E2E: xóa `have.music` (`ninja.S.G.audio.have.music = []`), vào bản đồ → `ninja.sound.state().src === 'synth'` và `AudioContext.currentTime` tăng; đổi sang "Tổng hợp" khi có file → 0 yêu cầu mạng tới `audio/music/` trong 60 giây (đếm bằng `page.on('request')`).
- `test:perf` bật nhạc tổng hợp bài `boss`: CPU luồng chính tăng ≤ 0,05 ms/khung trung bình.
- Dựng offline 75 s mỗi bài trong `tests/e2e/audio.js` (mới): không có mẫu nào vượt biên độ 1,0, đỉnh trong 0,3-0,95, không đoạn im lặng > 2 s.

**Kiểm thử.** `tests/features/audio.js` (bảng dữ liệu), `tests/e2e/audio.js` (mới), `tests/e2e/perf.js`.

### 11.5 `snd-content-199` — Nhạc mới cho nội dung 121-199 và sự kiện (P1 · Should · todo)

15 bài mới (bảng 11.4 từ `field_swamp` tới `fest_giangsinh`) và 44 tiếng mới (bảng 11.6 cột "Trạng thái file" = mới).

Bảng gắn mới trong `src/shared/data/audio.js`:

| Bảng | Nội dung |
|---|---|
| `MUSIC_THEME` | thêm `swamp: 'field_swamp'`, `starfield: 'field_starfield'`, `jade_peak: 'field_jade'` |
| `MUSIC_TOWN` (mới) | `{ fire: 'village_fire', water: 'village_water', wind: 'village_wind' }`: bản đồ `town` có `townStyle` dùng nhạc làng |
| `MUSIC_SCENE` | thêm `boss_high`, `boss_final`, `worldboss`, `battlefield`, `clanwar`, `defense` |
| `MUSIC_SEASON` (mới) | theo `look` của mùa: `trangram → festival`, `giangsinh → fest_giangsinh`, `tet → fest_tet`, `tinhnhan → fest_tinhnhan`, `datto → fest_datto`, `he → fest_he`, `hoatrang → fest_hoatrang` |

Thứ tự ưu tiên trong `updateMusic` (mới): lôi đài > chiến trường > chiến gia tộc > Hung Tinh trong bản đồ > Tà Thú trong bản đồ > boss trong 0,75 khung nhìn (`boss_final` nếu là boss cuối, `boss_high` nếu cấp ≥ 120, không thì `boss`) > Thủ Hộ Làng > phó bản > làng/trạm lúc lễ hội (`MUSIC_SEASON[mùa.look]`) > trạm (`MUSIC_TOWN`) > theme.

Tiêu chí: `npm run check` sạch với bảng mới (mọi khóa `MUSIC_SEASON` là `look` của một mùa trong `SEASONS`); 15 bài có file trong `src/client/audio/music/` hoặc ghi rõ trong `CREDITS.md` là "chưa tạo, dùng tổng hợp"; E2E `/sukien tet2027` rồi về làng → `ninja.sound.state().id === 'fest_tet'`.

Kiểm thử: `tests/features/audio.js`, `tests/e2e/audio.js`.

### 11.6 Danh sách tiếng hiệu ứng đầy đủ

Cột "Tổng hợp" là công thức dự phòng trong `SFX_SYNTH` (17 cái có sẵn + 8 cái mới: `error`, `open`, `close`, `gong`, `horn`, `chime`, `thud`, `sparkle`). "Hàng đợi" = đã có dòng trong `queue.tsv` và **đã tạo file** ở `~/.local/share/ninja-audio/out/sfx/` (46/46, 18/10/2026), chưa chép vào repo; "mới" = thêm vào `AUDIO_SPEC`.

**Chiến đấu cơ bản**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `hit` | đòn của mình trúng (`onHit`, `m.a === mình`) | tiếng chạm gọn, chắc | hàng đợi | `hit` |
| `crit` | đòn của mình chí mạng | chạm nặng có tiếng giòn, đi kèm khựng đòn | hàng đợi | `crit` |
| `hurt` | mình bị trúng | tiếng huỵch ngắn | hàng đợi | `hurt` |
| `dodge` | mình né được hoặc đòn mình bị né (`miss`) | vút nhẹ (sửa L3: hiện chưa gọi) | hàng đợi | `swing` |
| `slash_basic` | đòn thường cận chiến, `EVENT_SFX.swing` | vút kiếm ngắn | hàng đợi | `swing` |
| `jump` | nhảy (lần 1 và lần 2) | bật nhẹ, gain 0,4 | mới | `jump` |
| `land` | chạm đất sau ≥ 0,6 s trên không | bịch nhẹ, gain 0,3 | mới | `thud` |
| `potion` | uống bình HP/MP | ực nước + leng keng | mới | `pickup` |
| `revive` | hồi sinh | luồng sáng đi lên | mới | `heal` |
| `defeat` | mình tử trận (`EVENT_SFX.die`), thua lôi đài | chuỗi nốt đi xuống buồn | hàng đợi | `die` |

**Kỹ năng phái** (đã gắn `SKILL_SFX`, 21 file trong hàng đợi): `slash_fire` (Kiếm, chém lửa), `fire_burst` (nổ vòng lửa), `sword_wave` (kiếm khí), `meteor` (thiên thạch rơi + nổ), `shuriken` (phi tiêu xoay kim loại), `shuriken_rain` (mưa phi tiêu), `explosive_shuriken` (phi tiêu nổ), `kunai_stab` (đâm kunai), `water_slash` (lưỡi nước), `water_vortex` (xoáy nước), `ice_shard` (mảnh băng vỡ), `tsunami` (sóng lớn đổ), `arrow` (bật dây cung), `arrow_rain` (mưa tên), `pierce_arrow` (tên xuyên năng lượng), `blade_wind` (đao + gió), `whirlwind` (lốc đao), `dash` (lướt), `wind_blade` (lưỡi gió), `tornado` (lốc xoáy), `buff` (tụ khí ngân lên), `heal` (hồi máu leng keng). Khi nào: mình tung (`m.a === mình`), người khác trong khung nhìn gain 0,35 + lệch trái phải (11.1 mục 6). Tổng hợp: `swing`/`shoot`/`magic`/`heal` theo `fx.k` như hiện tại.

Kỹ năng hậu kỳ mới của `cmb-skills-199`: dùng `FX_SFX` theo `fx.k` mặc định; được thêm tối đa 1 tiếng riêng mỗi phái cho tuyệt kỹ cuối (`ult_kiem`, `ult_tieu`, `ult_kunai`, `ult_cung`, `ult_dao`, `ult_quat`, mới, tổng hợp `magic`).

**Boss và sự kiện chiến đấu**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `boss_warn` | thông báo `notice.kind = 'boss'`, boss bắt đầu niệm (`bossCast`) | ầm ì báo nguy | hàng đợi | `boss` |
| `boss_quake` / `boss_roar` / `boss_beam` / `boss_nova` / `boss_summon` | `bossHit` theo `k` | đất nứt / gầm / tia từ trời / nổ vòng lớn / vòng triệu hồi | hàng đợi | `magic` |
| `boss_rage` | boss gần mình chuyển cuồng nộ | gầm trầm + trống dồn | mới | `boss` |
| `boss_die` | boss bị hạ gần mình | tiếng sụp + chiêng ngân | mới | `gong` |
| `boss_spawn` | boss hồi sinh trong bản đồ mình | luồng gió tối | mới | `boss` |
| `tathu_horn` | Tà Thú báo trước 5 phút và lúc xuất hiện | tù và xa | mới | `horn` |
| `worldboss_horn` | Hung Tinh báo trước và giáng thế | tù và + chiêng | mới | `horn` |
| `status_burn` / `status_freeze` / `status_poison` / `status_stun` | mình dính trạng thái (`cmb-status`) | xèo lửa / đóng băng rắc / bọt sủi / chuông kêu | mới | `hurt` |
| `clone_summon` | phân thân xuất hiện (`cmb-clone`) | vút đôi có vọng | mới | `magic` |
| `seal_full` | Thanh Ấn đầy | ngân trong một nốt | mới | `chime` |
| `seal_cutin` | tung Ấn Kỹ (cut-in) | vút mạnh + chiêng | mới | `gong` |

**Tiến trình nhân vật**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `levelup` | lên cấp (`EVENT_SFX.level`) | khúc nhạc ngắn đi lên | hàng đợi | `level` |
| `quest_accept` | nhận nhiệm vụ | cuộn giấy mở + nốt | mới | `quest` |
| `quest_done` | hoàn thành nhiệm vụ, `notice.kind = reward/quest`, nhập mã quà đúng | ba nốt vui (sửa L3) | mới | `quest` |
| `skill_learn` | học/nâng kỹ năng | ngân sáng | mới | `chime` |
| `potential` | cộng tiềm năng | tách nhẹ | mới | `click` |
| `meridian_open` | đả thông kinh mạch (`sig-meridian`) | luồng khí + ngân | mới | `sparkle` |
| `title_get` | nhận danh hiệu (`soc-titles`) | kèn ngắn | mới | `level` |

**Trang bị, kinh tế, giao diện**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `coin` | nhặt xu | leng keng | hàng đợi | `coin` |
| `pickup` | nhặt vật phẩm | bụp nhẹ | hàng đợi | `pickup` |
| `equip` / `unequip` | mặc / tháo trang bị | lách cách kim loại | mới | `click` |
| `enhance_ok` / `enhance_fail` | kết quả cường hóa | đe + ngân sáng / đe + bịch trầm | hàng đợi | `level` / `hurt` |
| `enhance_milestone` | lần đầu đạt +13/+15/+16 vũ khí | đe + chiêng + ngân dài | mới | `gong` |
| `gem` | khảm/gỡ/ghép ngọc thành công | tách + lấp lánh pha lê | hàng đợi | `sparkle` |
| `craft_ok` / `craft_fail` | chế tác, rã đồ, tẩy luyện (`gear-crafting`) | búa gõ 3 lần + ngân / tịt | mới | `level` / `error` |
| `buy` / `sell` | mua / bán ở NPC | xu rơi vào túi / xu trượt ra | mới | `coin` |
| `market_sold` | món trên chợ bán được (`eco-market`) | chuông quầy | mới | `chime` |
| `chest_open` | mở rương | nắp gỗ bật + lấp lánh | mới | `pickup` |
| `wheel_tick` / `wheel_win` | vòng quay chạy / dừng (thay `spin`, `quest`) | tích tắc / khúc vui | mới | `spin` / `quest` |
| `checkin` | điểm danh | đóng dấu | mới | `click` |
| `mail` | có thư mới | giấy sột soạt + chuông nhỏ | hàng đợi | `chime` |
| `gift_claim` | nhận quà thư, giftcode | mở bao | mới | `pickup` |
| `ui_click` | bấm nút (`EVENT_SFX.click`) | gõ gỗ nhẹ, gain 0,5 | hàng đợi | `click` |
| `ui_open` / `ui_close` | mở / đóng cửa sổ (sửa L3: gọi ở `UI.open/close`) | cuộn giấy mở / gập | hàng đợi / mới | `open` / `close` |
| `error` | thao tác bị từ chối (thiếu xu, túi đầy) theo `notice.kind = 'warn'` | tịt trầm ngắn | mới | `error` |
| `portal` | qua cổng | vút ma thuật | hàng đợi | `portal` |
| `teleport` | Phu Xe, Bùa Về Làng | luồng gió cuộn | mới | `portal` |

**Xã hội và PvP**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `invite` | nhận lời mời nhóm/giao dịch/thách đấu/kết bạn | hai nốt hỏi | mới | `chime` |
| `whisper` | tin nhắn riêng | ping nhẹ | mới | `click` |
| `trade_done` | giao dịch xong | xu + bắt tay | mới | `coin` |
| `pk_on` | bật PK | rút kiếm | mới | `swing` |
| `arena_tick` | đếm ngược 5 → 1 (thay `spin`) | tách gỗ | mới | `spin` |
| `arena_start` | "ĐẤU!" (thay `boss`, sửa L2; `onArena` không phát thêm) | chiêng | hàng đợi | `gong` |
| `victory` | thắng lôi đài/chiến trường (chỉ ở `arenaResult`, bỏ lời gọi ở `showArenaResult`, sửa L1) | kèn thắng ngắn | hàng đợi | `quest` |
| `bf_capture` | chiếm cờ chiến trường (`pvp-battlefield`) | trống + cờ phần phật | mới | `horn` |
| `clanwar_horn` | chiến gia tộc bắt đầu | tù và trầm | mới | `horn` |

**Thú, thời trang, lễ hội**

| Id | Khi nào phát | Mô tả | File | Tổng hợp |
|---|---|---|---|---|
| `mount_on` / `mount_off` | lên / xuống thú cưỡi | hí ngắn / chân chạm đất | mới | `jump` / `thud` |
| `pet_feed` | cho thú ăn | nhai + tim | mới | `pickup` |
| `pet_level` | thú lên cấp | khúc ngắn cao | mới | `level` |
| `evolve` | tiến hóa thú cưỡi/thú cưng, ghép thú (`pet-mountup`, `pet-beasts`) | xoáy sáng + ngân | mới | `sparkle` |
| `costume` | khoác thời trang Sử thi trở lên | lấp lánh | mới | `sparkle` |
| `season_start` | lễ hội bắt đầu (gói `season` từ `null` sang mùa) | pháo + chiêng | mới | `gong` |
| `season_ex` | đổi quà lễ hội | túi quà mở | mới | `pickup` |

Quy tắc chung cho tiếng: gain theo nhóm (giao diện 0,5; chiến đấu 0,8; boss 0,9; khúc nhạc ngắn 1,0); chặn lặp 45 ms mỗi tên (giữ); tối đa 12 tiếng cùng lúc; tiếng ≤ 2,5 s; không tiếng nào nhại tiếng đặc trưng của game khác (prompt không nêu tên game).

Tổng: 46 tiếng hàng đợi + 44 mới (kể cả 6 `ult_*`) = 90 id.

---

## 12. Quy trình duyệt hình

### 12.1 `dev-gallery` — Trang `/dev/gallery` (P1, P5 · Must, nâng khi ghép · todo)

**Mục đích.** Một trang xem **mọi** hình vẽ bằng code ở mọi trạng thái cạnh nhau: người duyệt (Claude hoặc chủ dự án) thấy lệch phong cách, ô trống, sai màu mà không phải chơi tới nơi; công cụ chụp có chỗ cố định để so mốc (mục 12.2).

**Luồng.** Máy dev chạy `DEV_TOOLS=1 ADMINS=art1 node src/server/index.js` → mở `http://localhost:<cổng>/dev/gallery` → đăng nhập tài khoản admin (ô tên/mật khẩu như màn hình chính) → máy chủ xác nhận → trang dựng lưới theo `S.G`. Chọn mục, lọc tên, kéo thanh thời gian, đổi tỉ lệ 1-5, nền sáng/tối/ban đêm.

**Quy tắc.**

| Mục | Nội dung ô |
|---|---|
| Nhân vật | 6 phái × 2 giới × 12 trạng thái (mục 4) × mọi khung |
| Bậc trang bị | 20 bậc, đứng + chạy, kèm ô màu 4 mảng và ΔE tới bậc gần nhất (đỏ khi < 15) |
| Hào quang | `wp` 0/5/8/11/13/15/16 × `sp` 0/8/12 × 3 hệ |
| Vệt vũ khí | 6 vũ khí × 3 dải bậc × 2 dải cường hóa, khung 2 và 5 |
| Thời trang, thú | mọi `MASKS`, `CLOAKS`, `COSTUMES`, `MOUNTS`, `PET_ART` (đứng + chạy) |
| NPC | mọi `NPCS` (`idle`, `talk`) |
| Quái | mọi `S.G.monsters` × `st` 0/1/2 + `hurt` + `die`; boss thêm `cast` và `rage`; ghi `monsterHeight` và hộp bao điểm ảnh |
| Hiệu ứng | 10 `fx.k` × 3 hệ ở 3 thời điểm; `telegraph` 3 hình; `bossSkill` 5 loại; `enhance`, `gemSocket` |
| Cut-in | 6 phái × 2 cỡ × 3 thời điểm |
| Theme | mọi `THEMES` dải 320×120 lúc 12h và 22h |
| Icon | mọi `ITEMS` (`iconURL`), mọi kỹ năng (`skillIconURL`), mọi tên `uiIconURL` |
| Âm thanh | nút nghe từng id nhạc/tiếng: bản file (nếu có) và bản tổng hợp cạnh nhau |

- Chế độ chụp `?shot=1`: thời gian đóng băng theo `t` trong URL, `Math.random` thay bằng `mulberry32(1)` **chỉ trong trang này**, mỗi ô có `data-cell="<mục>/<khóa>"` và kích thước cố định; trang đặt `window.galleryReady = true` khi dựng xong và `window.galleryHashes = { ô: băm FNV-1a 32 bit của ImageData }`.
- Trang chỉ import file vào của các vùng (`render/sprites.js`, `monsterart.js`, `maprender.js`, `fx.js`, `icons.js`, `petart.js`), không import file thư mục con.

**Dữ liệu.** Không thêm vào `src/shared/data`.

**Gói.** `devGallery {}` máy khách → máy chủ; máy chủ → `devGallery { ok }` (`ok = true` chỉ khi tài khoản trong `ADMINS` và `DEV_TOOLS=1`). Gói `data` như mọi kết nối.

**Module, file.** `modules/admin` thêm hành động `devGallery` (không trùng tên hành động nào); `services/http.js` (vùng Lõi server): đường dẫn bắt đầu `/dev/` trả 404 trừ khi `config.devTools`, và chèn import map + `?v=` cho mọi file `.html` (không chỉ `index.html`); `src/server/index.js` đọc `DEV_TOOLS`; file mới `src/client/dev/gallery.html`, `src/client/js/dev/gallery.js`, `src/client/css/dev.css`. Id DOM mới chỉ trong trang gallery: `#gal-login`, `#gal-nav`, `#gal-grid`, `#gal-time`.

**Điện thoại.** Lưới 2 cột, thanh điều khiển dính trên, nút ≥ 44 px; dùng được nhưng mục tiêu chính là máy tính.

**Chống lạm dụng.** Mặc định tắt ở production (`DEV_TOOLS` không đặt → 404, kể cả với admin); có bật thì vẫn cần đăng nhập admin; trang không có hành động ghi nào; dữ liệu tĩnh đều đã công khai qua gói `data`, gallery không làm lộ thêm.

**Tiêu chí chấp nhận.**

- `tests/features/devtools.js` (bot): không đặt `DEV_TOOLS` → `GET /dev/gallery` 404; đặt → 200; `devGallery` từ tài khoản thường → `ok: false`, từ admin → `ok: true`.
- `tests/e2e/gallery.js`: mở `?shot=1`, chờ `galleryReady` ≤ 20 s, mọi ô có ít nhất 1 điểm ảnh khác nền, `OK no console errors`, số ô ≥ 2.000.
- `tools/shot.js` nhận `screen: 'gallery'` (+ `section`) và chụp được từng mục.

**Kiểm thử.** `tests/features/devtools.js` (mới), `tests/e2e/gallery.js` (mới).

### 12.2 `dev-baseline-shots` — Mốc hồi quy đồ họa (P1, P5 · Should · todo)

**Mục đích.** Biết ngay commit nào đổi hình của thứ không định đổi (ví dụ sửa màu bậc 19 làm lệch bậc 3), mà không commit ảnh chụp (CLAUDE.md cấm).

**Luồng.**

1. `node tools/shotdiff.js` (Playwright, `NODE_PATH` như các công cụ khác, server riêng cổng 3600, `DATA_DIR` riêng, `DEV_TOOLS=1`, `ADMINS=shot1`) mở gallery `?shot=1`, lấy `galleryHashes`.
2. So với `tests/baseline/gallery.json` (đã commit: `{ ô: băm }`, khoảng 2.000 dòng, < 80 KB).
3. Ô khác băm: dựng bản mốc từ git (`git worktree add <tmp> <ref, mặc định main>`, server cổng 3601), chụp từng ô ở cả hai bên, so từng điểm ảnh trong trình duyệt (vẽ 2 PNG vào canvas, so `ImageData`), ghi `<tmp>/shotdiff/<ô>-{base,new,diff}.png` (điểm khác tô đỏ) và `report.html`. Không ghi vào repo.
4. Người duyệt xem báo cáo; đổi có chủ ý thì `node tools/shotdiff.js --update` ghi lại băm các ô đã duyệt (commit cùng thay đổi hình).

**Quy tắc so.**

| Loại ô | Ngưỡng |
|---|---|
| Lớp pixel (`source-over`, tọa độ nguyên): nhân vật, quái, icon, theme | khớp tuyệt đối (0 điểm ảnh khác) |
| Có `lighter`/`globalAlpha` (hào quang, vệt, hiệu ứng) | ≤ 0,5% điểm ảnh khác, mỗi kênh lệch ≤ 8 |
| Ô có chữ (cut-in) | chỉ so vùng không chữ (mặt nạ chữ do gallery cấp) |
| Ảnh màn hình game (`tools/shot.js`) | không so tự động; duyệt bằng mắt theo danh sách 12 cảnh chuẩn (làng ngày/đêm, bãi đông quái, boss niệm chiêu, lôi đài, cửa sổ túi, Thợ Rèn, bản đồ thế giới, mỗi tờ, điện thoại 844×390) |

Chạy trên Chromium headless `--disable-gpu` để kết quả tái lập giữa máy; mốc lập trên Linux CI và macOS riêng nếu khác (`gallery.json` có khóa `platform`).

**Tiêu chí chấp nhận.** Chạy 2 lần liên tiếp không sửa gì → 0 ô khác; đổi 1 màu trong `TIER_METAL[3]` → báo đúng các ô có bậc 3 (Bạc) và không ô nào khác; `report.html` mở được, không lỗi console; thời gian chạy toàn bộ ≤ 3 phút trên máy dev.

**Kiểm thử.** `tests/e2e/gallery.js` (chế độ `BASELINE=1` gọi cùng hàm so); CI hằng đêm (`dev-ci-browser`, `10-ky-thuat-van-hanh.md`) chạy `tools/shotdiff.js` với `main`.

### 12.3 Quy trình duyệt một thay đổi đồ họa (áp dụng cho mọi id ở mục này)

1. Worker sửa đúng vùng file (bảng vùng CLAUDE.md), chạy `npm run check`, `npm test`.
2. Chạy `tools/shotdiff.js`: ô đổi phải đúng ô định đổi.
3. Chụp `tools/shot.js` desktop 1280×720 và `mobile: true` cho cảnh liên quan, in `OK no console errors`.
4. Vẽ mới thì `npm run test:perf` desktop và `MOBILE=1`, ghi số CPU trước/sau vào báo cáo.
5. Claude xem gallery + ảnh, đối chiếu `DESIGN_RULES.md` (viền `#1d1424`, ánh sáng trên-trái, không emoji, không chữ trên lớp pixel), rồi mới `--update` mốc và gộp.
6. Cập nhật `DESIGN_RULES.md` trong cùng commit.

---

## 13. Ngân sách tổng và tài liệu phải sửa

### 13.1 Ngân sách hiệu năng (kịch bản `test:perf`)

| Phần mới | Trần CPU trung bình mỗi khung |
|---|---|
| Hoạt ảnh mới (`art-anim-standard`) | 0,3 ms |
| Khựng đòn | 0,05 ms |
| Vệt vũ khí (20 người) | 0,3 ms |
| Hào quang + vòng phù văn (20 người +16) | 0,4 ms |
| Cut-in | 0,2 ms lúc hiện, 0 lúc ẩn |
| Nhạc tổng hợp (luồng chính) | 0,05 ms |
| **Tổng** | ≤ 1 ms → toàn khung ≤ 5 ms trung bình, ≤ 8 ms p95 |

### 13.2 Bộ nhớ

`frameCache` nhân vật LRU 1.500 mục; tấm vệt vũ khí ≤ 72; tiếng hiệu ứng giải mã giữ trong RAM ≤ 90 bộ đệm × ≤ 2,5 s mono (≈ 20 MB PCM float 44,1 kHz ở trường hợp xấu nhất; tải lười theo lần dùng đầu thay vì tải hết nếu `navigator.deviceMemory ≤ 2`).

### 13.3 Dòng cần sửa trong `DESIGN_RULES.md` khi làm xong

| Mục | Sửa |
|---|---|
| 0.3 Âm thanh | thêm: mã hóa Opus 48 kbps nhạc / 64 kbps mono tiếng, ngân sách bảng 11.2, `AUDIO_SPEC` là nguồn tạo, nhạc tổng hợp `SYNTH_MUSIC` là dự phòng bắt buộc, chế độ "Tổng hợp" |
| 2 Bậc trang bị | 20 bậc, tên 8 bậc mới, Thái Cực kim loại `#fff4d6`, luật ΔE ≥ 15 |
| 3 Nhân vật | bảng hoạt ảnh 4.3 thay dòng `idle 4, walk 6, jump 2, attack 3, dead 1`; bảng mốc cường hóa 8.2 thay dòng "+5 / +8 / +11" |
| 4 Quái | khung `hurt`, `die`, boss `cast` |
| 5 Bản đồ | thêm 3 theme vào danh sách và bảng theme riêng |
| 6 Hiệu ứng | khựng đòn (bảng 5.3), vệt vũ khí (6.2), cut-in (7.3), màu trạng thái (4.3) |
| 8 Giao diện | công tắc "Khựng đòn", "Hiện cut-in Ấn Kỹ", hàng "Nguồn nhạc" trong Cài đặt |
| 10 Hiệu năng | bảng 13.1 |

---

## 14. Quyết định kiến trúc (ADR)

### ADR-09-1 — Âm thanh từ file do model tạo: chi tiết thực thi, giấy phép, ngân sách; nhạc tổng hợp là dự phòng bắt buộc

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất; làm rõ và **thay phần "Chi phí"** của ADR-01-1 (`01-tam-nhin.md` mục 8). Gộp cùng `snd-audio-files` |
| Bối cảnh | `DESIGN_RULES.md` ở `HEAD` ghi "không có file ảnh hay âm thanh bên ngoài" và "Âm thanh dùng WebAudio tổng hợp". Nhánh `feat/audio` (đã stage) đổi quy tắc sang file tự tạo, nhưng: (1) đủ 71/71 file đã tạo ngoài repo nhưng chưa chép vào, `src/client/audio/` chưa có; (2) nhạc 96 kbps ra 739-918 KB/bài, 25 bài = 20 MB `.ogg` + 24 MB `.m4a`, mục tiêu "≤ 8 MB tổng" không đạt được; (3) công thức tạo (`queue.tsv`, prompt, seed) nằm ngoài repo, máy khác không tái tạo được, dòng đầu `queue.tsv` còn ghi sai model; (4) `.dockerignore` bỏ `CREDITS.md`; (5) khi thiếu file, nhạc im lặng hoàn toàn. Giấy phép: ACE-Step 1.5 (mã + trọng số MIT; thẻ model cho dùng nhạc tạo ra cho mục đích thương mại); Stable Audio 3 Small SFX theo Stability AI Community License: miễn phí cả thương mại khi tổng doanh thu năm (gồm công ty liên kết) dưới 1 triệu USD, dùng thương mại phải **đăng ký miễn phí**, phải hiện "Powered by Stability AI" ở trang/giao diện/tài liệu liên quan (bắt buộc nếu phân phối model hoặc sản phẩm dùng một phần model; với chỉ đầu ra thì mơ hồ, chọn cách an toàn là luôn ghi), không dùng đầu ra để huấn luyện model nền tảng khác, giấy phép thu hồi được khi vi phạm; bộ mã hóa văn bản T5Gemma trong SA3 kèm Gemma Terms of Use (có danh mục cách dùng bị cấm) |
| Quyết định | 1. **Giữ** cho phép file âm thanh do dự án tự tạo bằng model có giấy phép cho dùng thương mại đầu ra; đồ họa vẫn 100% code. 2. Nhạc: ACE-Step 1.5. Tiếng: Stable Audio 3 Small SFX, **dự phòng** MOSS-SoundEffect v2.0 (Apache-2.0, không ngưỡng doanh thu). 3. **Công thức tạo nằm trong repo** (`AUDIO_SPEC`, `tools/audio-queue.js`, `tools/sync-audio.js` đọc bảng), `CREDITS.md` ghi model + giấy phép + prompt + seed từng file. 4. Mã hóa: nhạc Opus 48 kbps stereo (đo 470 KB/60 s), `.m4a` AAC 64 kbps làm bản phụ; tiếng Opus 64 kbps mono. 5. **Ngân sách theo phiên** (bảng 11.2): 0 byte âm thanh trên đường vào game, ≤ 2 MB trong 10 phút đầu, mỗi bài ≤ 520 KB, kho `.ogg` ≤ 21 MB nhạc + 2 MB tiếng. 6. File commit vào `src/client/audio/` (tái lập, vào ảnh Docker), `.dockerignore` giữ `CREDITS.md`, URL có `?v=` lưu đệm vĩnh viễn. 7. **Nhạc tổng hợp WebAudio thủ tục là lớp dự phòng bắt buộc** cho mọi id (`SYNTH_MUSIC`, mục 11.4) và mọi tiếng (`SFX_SYNTH`); `npm run check` chặn id thiếu công thức; Cài đặt có chế độ "Tổng hợp". 8. Ghi nguồn: Cài đặt hiện "Nhạc tạo bằng ACE-Step 1.5 (MIT) · Tiếng hiệu ứng: Powered by Stability AI.", `README.md` có mục "Nguồn âm thanh". 9. Trước khi bật `mon-topup` hoặc mở máy chủ công khai: đăng ký Stability AI Community License; nếu không đăng ký hoặc doanh thu dự kiến chạm ngưỡng thì tạo lại toàn bộ tiếng bằng MOSS (một lượt máy rảnh) |
| Phương án khác | (a) **Chỉ nhạc tổng hợp WebAudio thủ tục** (giữ quy tắc cũ): nguyên mẫu đo được 2,7 KB nén, dựng nhanh 10-21 lần thời gian thực, 0 byte tải, 0 rủi ro giấy phép, có lớp động (cuồng nộ); nhưng âm sắc điện tử, giai điệu sinh từ quy tắc kém cảm xúc hơn file, P1 yếu. Giữ làm dự phòng thay vì bỏ. (b) File chỉ cho tiếng, nhạc tổng hợp: kho chỉ 2 MB nhưng bỏ phần giá trị nhất (nhạc). (c) Soạn nhạc bằng tay (MIDI) rồi dựng: chất lượng kiểm soát được nhưng cần người soạn, không có trong dự án. (d) Nhạc/tiếng miễn phí tải trên mạng: vi phạm `DESIGN_RULES.md` 0.2, loại. (e) Không đưa file vào git, chép lúc build Docker: bản dựng phụ thuộc máy tạo, không tái lập, loại. |
| Chi phí | Dung lượng: ≈ 19 MB `.ogg` + 20 MB `.m4a` cho 40 bài, ≈ 0,7 MB + 0,7 MB cho 90 tiếng, tăng lịch sử git một lần (mỗi lần tạo lại một bài thêm ≈ 1 MB). Thời gian máy (đo đợt 18/10): ACE-Step trung bình 196 s/bài 60 s trên M1 16 GB (bài đầu 344 s do nạp model) → 15 bài mới ≈ 50 phút máy rảnh; SA3 lô 2-3 tiếng 13-18 s → 44 tiếng mới ≈ 5 phút. Mã hóa lại 25 bài có sẵn sang 48 kbps: vài giây, không cần tạo lại. Công duyệt: nghe mỗi bài ≈ 2 phút, kiểm vòng lặp liền. Mã: `musicgen.js` ≈ 350 dòng, sửa `sound.js`, `audio.js`, `check-data`, `sync-audio`, công cụ mới `audio-queue.js`. Rủi ro pháp lý: ngưỡng doanh thu SA, đăng ký thương mại, chính sách Gemma. |
| Hệ quả | `DESIGN_RULES.md` 0.3 giữ bản đang stage và bổ sung theo 13.3; ADR-01-1 dùng ngân sách mới; `mon-topup` phải kiểm lại mục 9 của quyết định; nhạc không bao giờ im lặng khi thiếu file; máy yếu/mạng di động có lựa chọn 0 byte; mọi tài nguyên tải thêm sau này phải theo mẫu: tự tạo, công thức trong repo, ghi nguồn, tải lười, có dự phòng bằng code. Đồ họa không được dùng ADR này làm tiền lệ. |

### ADR-09-2 — Mốc hồi quy đồ họa lưu bằng mã băm, không commit ảnh

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, cùng `dev-baseline-shots` |
| Bối cảnh | CLAUDE.md cấm commit ảnh chụp kiểm tra. Nhưng so hồi quy cần một mốc cố định; mốc lưu ngoài repo thì không ai khác dùng được |
| Quyết định | Commit `tests/baseline/gallery.json` chỉ chứa mã băm FNV-1a 32 bit của `ImageData` từng ô gallery (văn bản, < 80 KB). Ảnh mốc khi cần xem thì dựng lại từ git (`worktree` của ref mốc) vào thư mục tạm |
| Phương án khác | (a) commit ảnh PNG mốc (≈ 2.000 ô, vài MB, trái CLAUDE.md); (b) git LFS (thêm hạ tầng, không có trong dự án); (c) chỉ duyệt bằng mắt (bỏ sót lệch nhỏ như đổi 1 màu ở bậc cũ) |
| Chi phí | `tools/shotdiff.js` ≈ 250 dòng; mỗi lần so lỗi phải dựng server thứ hai từ worktree (≈ 30 s); băm nhạy với khác biệt trình duyệt nên cần ghi `platform` và ghim bản Chromium của Playwright |
| Hệ quả | CLAUDE.md mục Git thêm câu "mã băm mốc hình (`tests/baseline/*.json`) được commit, ảnh thì không". Đổi hình có chủ ý phải kèm `--update` trong cùng commit, người duyệt thấy được trong diff |

---

## 15. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Kim loại bậc 17 Thái Cực: giữ `#f4f4f4` của `content/00-foundation.md` hay đổi? | Đổi sang `#fff4d6` (ΔE76 tới Bạc 20,2 thay vì 6,6); `TIER_COLORS` theo cùng giá trị; `05-he-thong-trang-bi.md` (`gear-tier-199`) dẫn bảng 9.2 của tài liệu này |
| Q2 | Đưa file âm thanh vào git dù kho vượt 8 MB? | Có, theo ADR-09-1: ≤ 21 MB `.ogg` nhạc + 2 MB tiếng (+ bản `.m4a`); vượt thì hạ nhạc xuống Opus 40 kbps (đo 399 KB/bài) trước khi bỏ bài |
| Q3 | Giữ bản `.m4a` cho trình duyệt không phát Opus? | Giữ ở 1.0; bỏ khi đo `canPlayType('audio/ogg; codecs="opus"')` ở phiên thật cho thấy ≥ 98% phiên phát được Opus trong 4 tuần |
| Q4 | Có đăng ký Stability AI Community License trước khi mở công khai? | Có, đăng ký miễn phí ở giai đoạn 8; nếu không đăng ký được thì tạo lại toàn bộ tiếng bằng MOSS-SoundEffect v2.0 (Apache-2.0) |
| Q5 | Khựng đòn có áp cho đòn thường khi auto? | Không cho đòn thường không chí mạng; chí mạng 45 ms, trần 150 ms mỗi giây trượt |
| Q6 | Hào quang theo vũ khí hay theo cả bộ? | Cả hai: hào quang thân theo vũ khí (`wp`, như cũ), viền áo và đốm theo bộ (`sp` = cấp thấp nhất 5 ô áo giáp) |
| Q7 | Mỗi vùng Thượng Giới có bài nhạc riêng? | Không ở 1.0: dùng nhạc theo theme (3 bài theme mới) + bài boss hậu kỳ; nhạc riêng vùng xét ở 1.1 |
| Q8 | `/dev/gallery` có bật ở máy chủ thật? | Không: chỉ khi `DEV_TOOLS=1` (máy dev, CI); có bật vẫn cần đăng nhập admin |
| Q9 | Quái thường có khung lấy đà báo trước đòn? | Không ở mục này (máy chủ gây sát thương ngay lúc `st = 2`); nếu cần báo trước thì `cmb-monster-ai` thêm độ trễ 200 ms và gói báo trước, tài liệu này chỉ vẽ |
| Q10 | Bộ đệm khung nhân vật có giới hạn? | LRU 1.500 mục, nháy trắng chỉ dựng cho khung `hurt` |
| Q11 | Nhạc tổng hợp chỉ là dự phòng hay người chơi được chọn? | Cả hai: tự dùng khi thiếu file, và Cài đặt có "Nguồn nhạc: Tự động / Tổng hợp (tiết kiệm dữ liệu)", mặc định "Tự động" |
| Q12 | Mã băm mốc lập trên máy nào? | Linux CI là mốc chuẩn (`platform: linux`); máy dev macOS có khóa riêng, chỉ dùng tham khảo |
| Q13 | Tiếng kỹ năng của người chơi khác có phát? | Có, trong 1 khung nhìn, gain 0,35, lệch trái/phải; tối đa 12 tiếng cùng lúc |

---

## 16. Tham chiếu

| Tài liệu | Dùng cho |
|---|---|
| `DESIGN_RULES.md` mục 0-6, 10 | chuẩn gốc được nâng ở đây |
| `CLAUDE.md` | phân vùng file, API công khai `render/*.js`, quy trình chụp ảnh, cấm commit ảnh |
| `01-tam-nhin.md` mục 8 | ADR-01-1 (ADR-09-1 làm rõ) |
| `02-hien-trang.md` | trạng thái `snd-audio-files`, rủi ro R-22 |
| `04-dac-sac.md` | `sig-thanhan` dùng `art-cutin` |
| `05-he-thong-chien-dau.md` | `cmb-status`, `cmb-clone`, `cmb-monster-ai` (logic; tài liệu này chỉ vẽ và tiếng) |
| `05-he-thong-trang-bi.md` | `gear-tier-199` (dữ liệu bậc), `gear-upgrade` |
| `content/00-foundation.md` mục 3 | bậc 12-19, hoa văn |
| `content/10-world.md` mục 3, 7 | bản đồ, theme mới, biến thể |
| `content/20-monsters.md` mục 2-3, 5 | `art`, `AURA2`, quái người riêng |
| `content/50-worldboss-events.md` mục 0, 7 | lịch sự kiện, `look` lễ hội cho `MUSIC_SEASON` |
| `~/.local/share/ninja-audio/` | hàng đợi tạo âm thanh, giấy phép đã lưu (`licenses/`) |
| `scratchpad/gddwork/lab/m09/` | đo màu, đo mã hóa, nguyên mẫu nhạc tổng hợp |
