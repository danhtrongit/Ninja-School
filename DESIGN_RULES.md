# DESIGN RULES - Ninja School Pixel Online

Quy chuẩn thiết kế bắt buộc cho mọi thay đổi về đồ họa, giao diện, hiệu ứng và nội dung game. Mục tiêu: mọi phần do người hay agent nào làm đều trông như của **một** game.

Các con số dưới đây lấy từ code hiện tại. Nếu cần đổi một quy chuẩn, sửa code **và** sửa file này trong cùng một commit.

---

## 0. Nguyên tắc gốc

1. **Phong cách**: game nhập vai ninja 2D di động kiểu Việt Nam cổ điển. Nhân vật chibi đầu to, viền tối, màu bão hòa tươi, bối cảnh làng Nhật Bản (mái ngói cong, đèn lồng, hoa anh đào), giao diện gỗ sơn mài viền vàng đồng.
2. **Bản quyền**: mọi hình ảnh đều tự thiết kế. **Cấm** sao chép, can lại hay tải về sprite, logo, âm thanh của TeaMobi hoặc bất kỳ game nào. Tên NPC, bản đồ, kỹ năng cũng phải tự đặt.
3. **Vẽ bằng code**: không có file ảnh bên ngoài. Đồ họa dùng `fillRect`, chuỗi pixel art, canvas offscreen, CSS gradient hoặc SVG nội tuyến (`data:`).
   **Âm thanh**: nhạc nền và tiếng hiệu ứng là file do dự án tự tạo bằng model sinh âm thanh (nhạc: ACE-Step 1.5, MIT; tiếng: Stable Audio 3 Small SFX, ghi "Powered by Stability AI"), đặt ở `src/client/audio/{music,sfx}/<id>.ogg` (+ `.m4a`) qua `tools/sync-audio.js`, nguồn từng file ghi ở `src/client/audio/CREDITS.md`. Không dùng file tải từ nơi khác. Thiếu file thì `core/sound.js` dùng tiếng tổng hợp WebAudio. Nhạc loop, nhỏ hơn tiếng hiệu ứng (bus nhạc × 0.55), đổi bài giảm dần 1.2 giây.
4. **Nhất quán hơn ấn tượng**: một chi tiết đẹp nhưng lệch phong cách chung thì phải bỏ hoặc sửa cho khớp.

---

## 1. Lưới pixel và hệ tọa độ

| Quy chuẩn | Giá trị |
|---|---|
| Đơn vị thế giới | 1 đơn vị = 1 pixel nghệ thuật |
| Phóng to | Zoom **nguyên** (thường 3-5), `imageSmoothingEnabled = false` |
| Mặt đất | `y = 300`; bản đồ cao `360`; rộng 900-2200 |
| Khung nhìn | khoảng 380-760 × 216-260 pixel nghệ thuật |
| Gốc tọa độ sprite | **giữa chân**: x là tâm, y là đáy (bàn chân chạm đất) |
| Bục nhảy | `[x, y, w]`, một chiều (đứng được từ trên, nhảy xuyên từ dưới) |

- Lớp thế giới (canvas phân giải thấp) **không** dùng khử răng cưa, không vẽ ở tọa độ lẻ: mọi tọa độ phải `Math.round`.
- **Chữ** (tên, số sát thương, bong bóng chat) vẽ trên canvas phân giải cao **sau khi** phóng to, không vẽ chữ trên lớp pixel.
- Kích thước pixel của boss là `Math.round(scale)`, không dùng scale lẻ trên lớp pixel.

---

## 2. Bảng màu và ánh sáng

- **Viền**: mọi sprite nhân vật, quái và icon có viền tối 1px. Màu viền chuẩn `#1d1424` (sprite) và `#120804` (giao diện), **không** dùng đen thuần `#000`.
- **Đổ bóng**: 3 tông (sáng, gốc, tối) sinh từ màu gốc bằng `shade(color, f)` trong `sprites.js`. Ánh sáng chiếu từ **trên-trái**: mặt trên và trái sáng hơn, dưới và phải tối hơn.
- **Ngũ hành** (`ELEMENT_COLORS`):

| Hệ | Màu | Khắc |
|---|---|---|
| Hỏa | `#ff7043` | khắc Phong |
| Thủy | `#42a5f5` | khắc Hỏa |
| Phong | `#7ccd5a` | khắc Thủy |

- **Độ hiếm** (dùng thống nhất cho chữ, viền ô, ánh sáng):

| Bậc | Tên | Màu |
|---|---|---|
| 0 | Thường | `#ffffff` |
| 1 | Tốt | `#5ab4ff` |
| 2 | Hiếm | `#ffd23c` |
| 3 | Sử thi | `#c77dff` |
| 4 | Huyền thoại | `#ff8a3c` |

- **Bậc trang bị** (12 bậc, mỗi bậc 10 cấp): Gỗ, Đồng, Sắt, Bạc, Vàng, Ngọc, Huyền, Long, Thiên, Thần, Tiên, Thánh. Màu kim loại nằm ở `TIER_METAL`, màu áo ở `TIER_OUTFIT`, màu viền ở `TIER_TRIM` trong `src/client/js/render/sprites/color.js`; màu icon ở `TIER_COLORS` trong `src/shared/data/items/base.js`. Thêm bậc mới thì **phải** thêm màu vào cả 4 mảng.

---

## 3. Nhân vật ninja (`src/client/js/render/sprites.js` + `sprites/`)

- Chiều cao chuẩn `NINJA_H = 28`, rộng 18-20px. Đầu chiếm khoảng 40-45% chiều cao. Mắt to có điểm sáng.
- Kiểu tóc chọn theo băm tên: nam `spiky, neat, topknot, wild`, nữ `long, bun, pony, bob`.
- Băng trán màu hệ, có miếng kim loại màu theo bậc **nón**. Áo theo bậc **áo**, quần theo bậc **quần**, thắt lưng và khăn quàng màu hệ.
- Vũ khí theo phái: kiếm, phi tiêu, kunai, cung, đao, quạt. Cường hóa từ +5 lấp lánh, từ +8 phát sáng, từ +11 có hào quang.
- Số khung hoạt ảnh: `idle 4, walk 6, jump 2, attack 3, dead 1`. Nháy trắng khi trúng đòn (`flash`).
- NPC dùng `drawNinja(..., { npcType })` với ngoại hình riêng từng loại: `elder, potion, smith, task, tele, clan, storage, dungeon, arena, event`. Thêm loại NPC mới thì phải vẽ ngoại hình mới, không dùng lại ninja thường (`npm run check` kiểm tra mỗi loại trong `NPC_TYPES` có hàm trong `NPCS` của `render/sprites/npc.js` và nhà trong `SHOP` của `render/map/village.js`).
  - `arena` (Võ Sư Thiết Quyền ở Đấu Trường, đăng ký lôi đài xếp hạng): võ sư vạm vỡ (`bulk`), cởi trần tay, tóc rối, khăn hachimaki trên trán, dây chéo ngực, đeo đao lớn bậc 7.
  - `event` (Sứ Giả Lễ Hội, đổi quà sự kiện theo mùa): nữ, áo dài đỏ thắm có hoa văn chấm kem và viền gấu kem, đai lưng vàng rộng thắt nơ sau lưng (`festivalObi`), tóc dài cài hoa hồng nhụy vàng, mặt nạ thỏ trắng má đỏ buộc lệch sau đầu (`gearFestival`), tay cầm đèn ông sao đỏ năm cánh trên cán tre có ruột nến vàng (`propStarLantern`). Mọi chi tiết nằm trong `NINJA_H`.
- Mọi tổ hợp (kiểu, khung, hướng, look, palette) chỉ vẽ **một lần** vào canvas offscreen rồi dùng lại.
- **Thời trang** (chỉ người chơi, NPC/bạn đồng hành không có), đọc từ `look.mask / look.cloak / look.costume / look.mount` (mã hình, không phải id vật phẩm):
  - Mặt nạ (`MASKS`: `fox, oni, tengu`): che nửa trên mặt, thay khăn che mặt vải; có dây buộc sau đầu. `drawPortrait` cũng vẽ mặt nạ.
  - Áo choàng (`CLOAKS`: `wind, night, flame, snow`): thay khăn choàng cũ, vẽ **sau** thân; đứng yên rủ thẳng, chạy thì bay ngược và gợn theo khung chạy, nhảy thì tung cao. Phía trước có quai vai + khuy cài (tuyết hồ thêm cổ lông).
  - Trang phục (`COSTUMES`: `sakura, ocean, shadow, dragon`): thay bảng màu áo/quần/viền/găng của bậc trang bị và vẽ hoa văn riêng (cánh hoa, sóng, dây chéo, vảy rồng + ngọc ngực). Không thay hình vũ khí, tóc, băng trán.
  - Thú cưỡi (`MOUNTS`: `horse, wolf, tiger, qilin` bốn chân; `crane` chim): vẽ **dưới** người cưỡi, cache riêng `mountEntry(type, anim, f)`; 4 khung đi (`t·10`), 4 khung đứng (`t·1.6`, nhấp nhô 1px). Người cưỡi ngồi (chỉ hiện chân gần), lùi 3px về sau, nâng lên `mountOffset(look)` px (= độ cao yên − 7). Kỳ lân có hào quang và đuôi lửa.
  - Mọi nhãn trên đầu (tên, thanh máu, bóng chat, chữ sát thương/hồi máu/lên cấp) dùng `ninjaHeight(look)` = `NINJA_H + mountOffset(look)`. Vệt chém (`slash`) và điểm phóng (`proj`) của người cưỡi cũng nâng theo `lift`; hiệu ứng có vòng mặt đất (`burst`, `wave`, `whirl`, `aura`, `heal`) giữ ở chân thú. Đầu/mào thú cưỡi phải cách mũi mặt nạ dài (Thiên Cẩu) ít nhất 1px (cổ hạc vươn ra trước). Nhãn NPC bị đẩy lên trên tên người chơi khi chồng nhau.
  - Hiệu ứng: đang cưỡi và chạy trên mặt đất thì `fx.mountDust` mỗi ~0.09s sau vó; vừa khoác trang phục Sử thi trở lên thì `fx.costumeSparkle`, Huyền thoại thì lấp lánh lại mỗi 7-10s.

### Thú cưng đi theo (`src/client/js/render/petart.js`)

- 6 mã hình (`PET_ART`): `slime, bunny, fox` chạy/nhảy dưới đất; `bat, ghost, dragon` bay (`fly` px trên mặt đất, nhấp nhô `bob`). Gửi qua `look.pet` (mã hình) và `look.pl` (cấp thú); **không** dùng id vật phẩm.
- Khung gốc 20×18, neo giữa-đáy (x=10). Thân 10-14px, vẽ bằng elip đổ bóng 4 tông (sáng trên-trái), viền tự động `#1d1424`, mắt to có điểm sáng. Hai trạng thái: đứng (`fps[0]`) và chạy/bay (`fps[1]`), mỗi trạng thái 4 khung. Mọi khung (kể cả bản lật trái) chỉ vẽ **một lần** vào canvas offscreen.
- Đi theo: đứng sau lưng chủ 18px (cưỡi thú 28px), đuổi theo mượt, quay mặt theo hướng chạy, đứng yên thì quay về phía chủ. Ma có quầng sáng `glow`.
- Thú đi bộ **không** bay lên theo khi chủ nhảy: đứng trên mặt sàn chủ đứng lần cuối (`Game.floorBelow(x, y)`: đất hoặc sàn gỗ ngay dưới điểm); chỗ đứng sau lưng chủ không còn sàn (chủ nhảy khỏi mép) thì rơi xuống sàn bên dưới. Thú bay theo độ cao của chủ nhưng bóng luôn nằm trên mặt sàn (`o.shadowDY` của `drawPet`).
- Theo cấp thú: 20+ có sao lấp lánh (cả ở sân khấu cửa sổ, sao nhân theo tỉ lệ), 35+ có quầng màu `#8fe3ff` bán kính 18, 50 có quầng vàng `#ffe082`; từ 35 có thêm viền sáng 1px cùng màu ôm sát hình thú (ngoài viền tối) để thấy rõ ở tỉ lệ 1. Được cho ăn thì 2 trái tim hồng bay lên.
- Kỹ năng tự động (gói `petAct`): `pick` thì thú lao tới chỗ món đồ rồi quay về, kèm tia sáng; `heal` thì có tia xanh lá và số `+N` trên đầu chủ; `feed` bay tim; `lv` có tia vàng và chữ `Thú cưng LvN!`.
- Thêm thú mới: vẽ hàm `drawX(b, f, moving)` trên `Buf` 20×18, thêm vào `PET_ART`, icon dùng lại khung đứng (`petPixels`).

---

## 4. Quái vật và boss (`src/client/js/render/monsterart.js` + `monster/`)

- 11 kiểu sprite: `slime, bunny, mushroom, imp, flyer, humanoid, crab, golem, ghost, beast, snowman`. Quái mới **phải** dùng một kiểu có sẵn với bảng màu riêng. Chỉ thêm kiểu mới khi không kiểu nào phù hợp.
- Bảng màu quái `pal = [chính, phụ, nhấn]`; mọi tông sáng tối đều sinh từ 3 màu này.
- Hình vẽ có thể lớn hơn hitbox server tối đa khoảng 1.5 lần. Hitbox (rộng × cao ở scale 1):

| Kiểu | Hitbox | Kiểu | Hitbox |
|---|---|---|---|
| slime | 16×12 | crab | 20×12 |
| bunny | 14×14 | golem | 20×26 |
| mushroom | 14×16 | ghost | 16×20 |
| imp | 14×18 | beast | 24×14 |
| flyer | 18×12 | snowman | 16×22 |
| humanoid | 12×22 | | |

- Mỗi kiểu có 3-4 khung đứng/đi và 1-2 khung tấn công (`st = 2`). `flyer` và `ghost` lơ lửng.
- **Ngoại hình riêng theo id**: cùng một kiểu sprite, mỗi loài có thể có biến thể riêng qua bảng `VARIANT` (id → biến thể: `monkey`, `bee`, `scorp`, `tree`, `statue`, `coral`, `crystal`, `fox`, `serpent`, `worm`, `bone`...). Quái **người** (`humanoid`) có bộ trang phục và vũ khí riêng theo id trong bảng `HUM` (`bandit, pirate, skeleton, sandbandit, mummy, cursedmummy, rogue, iceninja, shadow, samurai, deathknight, celestial, voidknight, dragonguard`); id chưa có trong `HUM` dùng `bandit`. Thêm quái người mới thì **nên** thêm bộ riêng vào `HUM`.
- **Boss**: pixel size `Math.round(scale)`, có hào quang động, mắt phát sáng, vương miện hoặc sừng. Mỗi boss có thiết kế riêng, không chỉ phóng to quái thường: biến thể `king` (boss_slime), `batK`, `wolfK`, `yetiK`, `oniK`, `fox9` (cáo chín đuôi), `crystalK`, `dragonK`; boss người `boss_god`, `boss_pharaoh`, `boss_heaven` nằm trong `HUM`. Chỉ `boss_slime, boss_wolf, boss_fox` đội vương miện vẽ thêm (`BOSS_CROWN`), các boss khác đã có sừng/mũ trong hình.
- **Boss sự kiện Tà Thú** (`ev_*`, `event: true`) dùng lại biến thể boss (`ev_hacviem` → `wolfK`, `ev_bangphach` → `crystalK`, `ev_huyetnguyet` → `oniK`) nhưng bảng màu riêng tối và rực hơn, hào quang `AURA2` riêng. Thêm Tà Thú mới thì **phải** thêm vào `VARIANT` và `AURA2`.
- **Cuồng nộ** (`o.rage`, máu boss dưới 30%): `rageAura` vẽ quầng đỏ `#ff1744` sau lưng và đốm lửa đỏ/cam bốc lên phía trước, chỉ vẽ cho boss. Không đổi bảng màu thân boss khi cuồng nộ.
- **Ngoại lệ kích thước** (so với hitbox ở trên): vũ khí cầm tay của quái người, cánh, đuôi và tai được vượt bề ngang tới khoảng 1.8 lần; rồng (`darkdragon`) và `boss_heaven` (vòng hào quang sau lưng) tới khoảng 2 lần. Chiều cao của `flyer`/`ghost` tính cả 10px lơ lửng. Thân chính vẫn phải nằm trong khoảng 1.5 lần hitbox.
- `monsterHeight(def)` phải khớp với hình vẽ, vì nhãn tên và thanh máu đặt theo giá trị này.
- Khung hình dựng một lần rồi cache; game gọi `prewarmMonsters(defs)` lúc vào bản đồ (quái + boss của bản đồ) để lần đầu xuất hiện không bị giật. Quái sinh giữa chừng (phó bản) được dựng dần theo ngân sách thời gian mỗi khung.
- Mặt quái dễ thương (mắt to có điểm sáng, má hồng ở quái cấp thấp). Quái cấp cao hung dữ hơn nhưng vẫn cùng phong cách.

---

## 5. Bản đồ (`src/client/js/render/maprender.js` + `map/`)

- Mỗi bản đồ có một `theme` trong `THEMES` (bảng màu, trang trí) và `SCENES` (cảnh nền nhiều lớp). Bản đồ mới **ưu tiên dùng lại** chủ đề có sẵn: `village_fire, village_water, village_wind, grass_fire, lake, grass_wind, bamboo, beach, cave, desert, mist, snow, ice, dark_forest, lava, hell, arena, heaven, dragon_palace, abyss, sakura, ruins, crystal`.
- 6 chủ đề riêng cho bản đồ nhánh phụ và hậu kỳ:

| Theme | Bản đồ | Điểm nhận diện |
|---|---|---|
| `sakura` | Vườn Anh Đào | cây anh đào hồng, đèn đá, cầu cong qua ao, cánh hoa bay |
| `ruins` | Phế Tích Cổ | cột đá vỡ, tượng, tháp đá, bục đá cát, cát bay |
| `crystal` | Hang Pha Lê | hang có trần, pha lê tím/lam/hồng phát sáng, đốm sáng trôi |
| `heaven` | Thiên Cung | bục mây, cây vàng, cột mây, sen, lông vũ rơi |
| `abyss` | Ma Giới | trăng tím, gai, cây chết, mắt trên thân, bục đá viền tím phát sáng |
| `dragon_palace` | Long Cung | dưới nước: rong, san hô, sò, cột ngọc, đàn cá, bọt nước |

- Thứ tự lớp: trời (dải màu dither, mặt trời/trăng/sao, mây), núi xa, đồi tầm trung, hàng cây gần, địa hình, cổng, **lớp đêm** (`drawNight`), hiệu ứng mặt đất (`fx.drawGround`), NPC, vật phẩm, quái, người chơi, hiệu ứng, hạt thời tiết, lớp phủ không khí (`drawForeground`), **lớp ngày/đêm** (`drawLighting`), rồi mới tới chữ trên lớp phân giải cao.
- **Ngày/đêm** theo giờ Việt Nam (UTC+7, `vnHour`): tối dần từ khoảng 18h, sáng lại khoảng 5h-6h, ráng chiều cam quanh 18h, ráng sáng hồng quanh 6h. Ban đêm có sao, trăng, đèn lồng/cửa shoji/đuốc/pha lê có quầng sáng và một vòng sáng nhỏ quanh người chơi.
  - `drawNight` làm tối nền và địa hình (đục lỗ sáng ở nguồn sáng); thực thể vẽ sau chỉ bị ám nhẹ (`ENT_DARK = 0.4`) để quái và người chơi vẫn đọc rõ.
  - Mức ảnh hưởng theo chủ đề (`dayK`): ngoài trời 1, Thiên Cung 0.8, Long Cung 0.55, nơi tối sẵn 0.5, Ma Giới 0.45, hang có trần 0.2.
  - Người chơi chọn mức trong Cài đặt: Tắt / Nhẹ / Đầy đủ (`setLighting(0 / 0.5 / 1)`).
  - Chỉ dùng ảnh vẽ sẵn (`drawImage` với `multiply`/`lighten`/`screen`), **không** tạo gradient mới mỗi khung.
- Parallax được prerender thành **dải lặp**. Địa hình tĩnh prerender **một lần** khi tạo `MapRenderer`.
- Mặt đất có mép cỏ (hoặc tuyết, cát, đá), lớp đất có sỏi và rễ, tối dần theo độ sâu, vách đá ở hai đầu bản đồ.
- Làng: nhà mái ngói cong, cửa shoji sáng ấm, đèn lồng có quầng sáng. Màu chủ đạo: Hỏa đỏ cam, Thủy xanh lam, Phong xanh lục.
- **Cổng**: cổng ở mép bản đồ là cột sáng kèm biển chỉ hướng; cổng `door` ở giữa bản đồ là cổng đá hoặc torii có xoáy năng lượng.
- Không đặt trang trí che NPC (cách NPC ít nhất 26px) hoặc che cổng (cách cổng ít nhất 70px).
- Làng rộng 1640px, 9 nhà NPC; cổng phải ở x = 1624. Quầy Sứ Giả Lễ Hội (`SHOP.event`): rèm noren đỏ `#c62828`, biển trăng rằm (`ICONS.moon`), hai cột đèn lồng hai bên có quầng sáng.

---

## 6. Hiệu ứng kỹ năng (`src/client/js/render/fx.js` + `fx/`)

- Hiệu ứng theo `skill.fx.k`: `slash, proj, burst, wave, rain, meteor, whirl, aura, heal, dash`. Đạn (`p`): `shuriken, arrow, kunai, wind, fire, water, ice`.
- Bảng màu theo hệ `EP`:
  - **fire**: lửa và tàn lửa (`#fff59d → #ff7043`), có khói.
  - **water / ice**: bọt nước, giọt nước, vòng sóng.
  - **wind**: lá cây và vệt gió (`#7cb342 … #c5e1a5`).
- Ánh sáng dùng `globalCompositeOperation = 'lighter'`. Giới hạn `MAX_PARTS = 900` hạt và `MAX_TEXTS = 70` chữ. Không tạo gradient mới cho từng hạt.
- Thời lượng hình ảnh (không ảnh hưởng logic hay hồi chiêu): chém 0.2-0.26s, đạn 0.22-0.3s, nổ 0.48-0.6s, lốc xoáy 0.75-0.9s, lướt 0.55s, buff 1.25s, hồi máu 1.35s, thiên thạch 1.3s (chạm đất ở 0.32s), lên cấp 1.5s.
- Hiệu ứng được vẽ sẵn thành sprite cache: vệt chém 8 khung, phi tiêu xoay 8 khung, lưỡi gió/kiếm khí 16 góc.
- Hiệu ứng boss và tính năng (chỉ là hình ảnh):
  - **Cảnh báo boss** `telegraph`: kéo dài `dur` + chớp trắng 0.16s. Nền màu chiêu (mặc định `#ff5252`), viền ngoài `#1d1424`, viền nhịp đập 3→9Hz (đổi độ sáng mượt, không bật/tắt), dấu `!` cam đỏ `#ff6d3a` luôn hiện.
  - **Chiêu boss** `bossSkill`: quake 0.95s (vết nứt dung nham, vòng bụi màu đất), roar 0.8s, summon 1.25s (vòng phù văn tím `#c77dff`), beam 0.85s (vòng sóng màu nguyên tố), nova 0.8s (chỉ nova dùng vòng sóng trắng). Cỡ hình ảnh tối đa gấp 2.
  - **Nối với server** (`game.js`): gói `bossCast` → `telegraph` theo `shape` (`circle` bán kính `r`; `line` dải dài `r` theo `dir`, dày `w` của chiêu (mặc định 16); `pillar` một vòng nhỏ ở mỗi điểm `pts`), màu `#ff5252` (triệu hồi `#c77dff`), kèm tên chiêu dạng chữ to `#ff8a80` trên đầu boss. Gói `bossHit` → `bossSkill` (dải `line` vẽ thành chuỗi beam cách nhau 0.055s, `pillar` một beam ở mỗi điểm, `summon` một vòng ở mỗi chỗ quái con xuất hiện). Vùng hình ảnh **phải khớp** vùng sát thương `inBossZone` ở `combat.js` (circle: lệch ngang ≤ r+6; line: từ boss (lùi 6px) dọc dải dài r, lệch dọc ≤ w/2 + 2; pillar: lệch ngang ≤ r+6).
  - **Hiệu ứng mặt đất** (`ground: true`: cảnh báo, vết nứt, vòng triệu hồi) vẽ bằng `fx.drawGround` trước quái/người chơi để nằm dưới chân.
  - **Rung màn hình**: `fx.shake` tối đa 12px, giảm theo khoảng cách tới khung nhìn, `fx.shakeScale = 0` để tắt (Cài đặt "Rung màn hình"). Game lệch camera nguyên pixel (`fx.shakeXY()`), chạm mép bản đồ thì rung ngược lại để không lộ ra ngoài; nhãn tên và số sát thương rung theo (`toScreen`), và chạm/bấm chuột cũng cộng độ lệch này (`onPointer`) để trúng đúng chỗ hình đang hiện. Mức rung: boss đánh trúng mình 1.5 (chí mạng 3), hạ boss 6 (giảm theo khoảng cách) - hai chỗ này game đang gọi; chiêu boss 3-7, cường hóa +13 trở lên 2, cường hóa thất bại 1.5 - tự rung khi `bossSkill`/`enhance` được gọi. Không rung cho đòn đánh thường của người chơi.
  - **Bụi chân thú cưỡi** `mountDust`: gọi khoảng 8 lần/giây khi đang chạy, khói màu đất bay ngược hướng chạy.
  - Cường hóa thành công 1.1s (màu theo mốc +), thất bại 0.85s (dấu X đỏ `#ff5252`), khảm ngọc 0.75s, thời trang 1.1s (sao 4 cánh có viền tối). Lên cấp và cường hóa giảm độ sáng cột ở vùng thân để vẫn thấy nhân vật.
  - **Nối Thợ Rèn với server** (`game.js`): gói `smithFx { id, k, ok, plus?, c? }` gửi cả bản đồ. `k: 'enh'` → `fx.enhance(x, chân, ok, plus)` (cường hóa; ghép ngọc thất bại cũng dùng dạng thất bại), `k: 'gem'` → `fx.gemSocket(x, chân - 14, màu ngọc)` (khảm thành công, ghép ngọc thành công). Chân tính cả độ nâng thú cưỡi (`lift`).
- **Số trên màn hình** (font VT323, viền `#1a1020`):

| Loại | Màu |
|---|---|
| Đòn của mình | `#ffffff` |
| Chí mạng | `#ffeb3b`, to hơn, có dấu `!` |
| Mình bị đánh | `#ff5252` |
| Đòn người khác | `#ffcc80` |
| Hồi máu | `#69f0ae`, có dấu `+` |
| EXP | `#b3e5fc` |
| Xu | `#ffd54f` |
| Né | `#b0bec5`, chữ "Né" |

---

## 7. Icon (`src/client/js/render/icons.js` + `icons/`)

| Loại | Kích thước gốc | Hiển thị |
|---|---|---|
| Vật phẩm `iconURL(icon, rarity)` | 16×16 | 32-48px trong ô; khoảng 12px trên mặt đất |
| Kỹ năng `skillIconURL(sk, sid, elColor)` | 24×24 | 32-48px |
| Giao diện `uiIconURL(name)` | 16×16, nền trong suốt | 16-32px |

- Kỹ năng chủ động vẽ trên **nền tròn**; kỹ năng nội tại (`type: 'passive'`) vẽ trên **khung lục giác** viền vàng đồng với 6 đinh tán và huy hiệu mũi tên xanh ngọc ở góc trên phải. Hình bên trong theo chỉ số (`PASSIVE_ART[pas.stat]`), tô màu theo hệ. Không dùng khung lục giác cho thứ khác.
- Mỗi vật phẩm có `icon: { k, c, s? }`. `k` là hình dạng (`sword, blade, kunai, shuriken, bow, fan, hat, armor, gloves, pants, shoes, necklace, ring, amulet, potion, scroll, book, stone, charm, chest, card, material, food, pet, xu, mask, cloak, costume, mount, gem, petfood`), `c` là màu theo bậc. Thú cưng dùng `{ k: 'pet', s: <mã hình petart> }` (vẽ khung đứng của chính con thú, căn giữa 16×16); thức ăn thú `{ k: 'petfood', c, s: grain|fish|pill }` theo `PETFOOD_ICONS`. Thời trang dùng `{ k: <ô>, c, s: <mã hình> }`: `mask` vẽ đúng mặt nạ (`MASK_ICONS`), `cloak` áo choàng hình thang có cổ + khuy vàng và hoa văn theo `s`, `costume` áo kimono có đai và hoa văn, `mount` đầu thú nghiêng (hổ nhìn thẳng, hạc cả thân) theo `MOUNT_ICONS`; `npm run check` kiểm tra `s` có hình. Sách kỹ năng nội tại dùng `{ k: 'book', s: 'pas' }`: bìa xanh dương / đỏ / vàng hổ phách theo req 15 / 35 / 50, thêm huy hiệu mũi tên xanh ngọc ở góc dưới phải. Không dùng bìa tím (trùng Bí Kíp Nhân Đôi) và không bỏ `s: 'pas'` (`npm run check` báo lỗi).
- **Ngọc khảm** dùng `{ k: 'gem', c: <màu loại>, s: '<loại><cấp>' }` (ví dụ `loi7`). Hình theo loại trong `GEM_SHAPES`: Hỏa giọt lửa nhọn đỉnh, Thủy viên tròn dẹt, Thổ bát giác vuông, Phong lá xéo hai đầu nhọn, Lôi hình thoi cao có tia sét trắng, Huyết trái tim. Mặt cắt: mặt bàn giữa phẳng sáng, gờ mặt bàn sáng/tối theo hướng, 8 múi giác quanh tô 5 tông `tierPal` theo ánh sáng trên-trái, chấm sáng trắng góc trên-trái. Cấp: 1-3 trơn, 4-6 quầng màu ngọc nhạt + 1 sao lấp lánh, 7-9 quầng rõ (2px) + 2 sao, 10 quầng vàng `#ffe082` + 3 sao. Màu loại: Hỏa `#ff5a1f`, Thủy `#3fa9f5`, Thổ `#e0952a`, Phong `#5fd36a`, Lôi `#9b7bff`, Huyết `#e8304f`. Không dùng hình `stone` (đá cường hóa) cho ngọc.
- Thêm `k` mới thì **phải** vẽ hình trong `iconCanvas`. Không để rơi vào ô vuông mặc định.
- Tên icon giao diện: `bag, char, skill, quest, party, friends, clan, rank, map, mail, gift, wheel, settings, auto, pk, chat, talk, pick, target, xu, luong, attack, close, path, beast, slow, pet, festival, arena, lock, xuk`. `mail` (phong thư kem, nắp chữ V, dấu sáp đỏ) cho nút Hộp thư (phím L); `festival` (đèn ông sao đỏ ruột vàng) chỉ dùng cho sự kiện theo mùa (biểu ngữ, cửa sổ Lễ Hội). Vật phẩm sự kiện có icon riêng theo `icon.k` (`mooncake`: bánh nướng vàng nâu viền gợn sóng, vòng hoa văn nổi). `pet` (dấu chân thú) dùng cho nút Thú cưng (phím K). `beast` (mặt quỷ sừng trắng mắt vàng) chỉ dùng cho sự kiện Tà Thú; `arena` (hai kiếm bắt chéo sau khiên tròn đỏ có sao vàng) chỉ dùng cho lôi đài (viên HUD, tab xếp hạng, cửa sổ kết quả); `slow` (ốc sên) cho hiệu ứng xấu bị làm chậm.
- **Không dùng emoji** trong giao diện, vì mỗi máy hiển thị một kiểu.
- Icon giao diện `lock` (ổ khóa sơn mài đỏ `--lac`, quai thép sáng trái/tối phải, 2 đinh vàng, lỗ khóa đen) chỉ dùng cho vật phẩm khóa (huy hiệu ô, dòng chi tiết, ghi chú cửa hàng); `xuk` (đồng xu đồng đỏ có lỗ vuông, ổ khóa con góc dưới phải) cho xu khóa. Không dùng `lock` cho "chưa đủ cấp" (đó là lớp `.locked` tô đỏ mờ).

---

## 8. Giao diện (`src/client/css/*.css`, `src/client/js/ui/ui.js`, `src/client/js/ui/windows/*.js`)

- **Token màu** (`:root` trong `style.css`):
  - Nền chung: `--ink #120804`, `--text #f8eedb`, `--muted #c2ab8a`.
  - Vàng và sơn mài: `--gold #f0c869`, `--gold2 #b07d33`, `--gold3 #6d4815`, `--lac #8e2414`, `--lac2 #5a140a`.
  - Thanh chỉ số: `--hp`, `--mp`, `--exp`.
  - Tiền: `--xu`, `--luong`.
  - Độ hiếm: `--r1 … --r4`.

  Không viết mã màu mới trực tiếp khi đã có token phù hợp.
- **Khung**: cửa sổ dùng `--frame-win` với nền da thuộc `--leather`. Bảng HUD dùng `--frame-hud`, khung boss dùng `--frame-boss`, tiêu đề dùng dải lụa `--ribbon`. Màn hình mở đầu dùng các token `--sc-*` trong `screens.css`.
- **Font**: VT323 (lưu kèm game trong `src/client/fonts/`, giấy phép OFL, khai báo ở `src/client/css/fonts.css`, không tải từ Google Fonts), cỡ chữ gốc 20px; chữ nhỏ (`.tiny`) không dưới 15px.
- **Nút**: bấm thì lún xuống 1-2px. Nút chính (`.primary`) màu cam vàng, nút nguy hiểm (`.danger`) màu đỏ sơn mài. Nút kỹ năng **tròn**, hồi chiêu dạng quét tròn kèm số giây.
- **Bố cục HUD cố định**:
  - Trên trái: trạng thái (avatar tròn, huy hiệu cấp, thanh HP/MP/EXP, xu và lượng).
  - Trên giữa: mục tiêu.
  - Trên phải: bản đồ nhỏ, theo dõi nhiệm vụ.
  - Phải: lưới menu.
  - Dưới trái: chat.
  - Dưới phải: cụm kỹ năng 6 ô xếp vòng cung quanh nút đánh thường.
  - Dưới giữa: biểu ngữ sự kiện `#hud-event` (Tà Thú: tên sự kiện, đồng hồ đếm ngược, tên boss, bản đồ; bấm để tự tìm đường, đã ở gần thì chọn boss làm mục tiêu). Rộng tối đa `min(420px, 40vw)`, điện thoại 300px (ẩn hậu tố " Tà Thú" `.ev-sfx`); thiếu chỗ thì tên bản đồ co trước, tên boss giữ nguyên; bản đồ thế giới đang mở được vẽ lại khi sự kiện đổi; ẩn khi có cửa sổ hoặc hội thoại mở (`body.win-open`, `body.dlg-open`). Còn dưới 2 phút thì đồng hồ đỏ nhấp nháy. Sau khi boss bị hạ, biểu ngữ thành nút "Xem bảng sát thương" trong 2 phút.
  - Dưới giữa (lôi đài): viên `#hud-arena` cùng kiểu biểu ngữ (huy hiệu tròn icon `arena`). Đang chờ ghép (`.queue`): "LÔI ĐÀI", thời gian chờ đếm lên, "Đang chờ ghép trận · n người chờ", nút "Hủy". Trong trận (`.prep/.fight/.end`, nền đỏ sẫm): "LÔI ĐÀI" (hoặc "GIAO HỮU"), "Chuẩn bị" / đồng hồ còn lại (dưới 30 giây đỏ nhấp nháy) / "Kết thúc", "VS tên đối thủ · Lv phái · Elo" (điện thoại ẩn phần Lv), nút đỏ "Rời" phải bấm 2 lần trong 3 giây (lần 1 đổi thành "Chắc?" nhấp nháy). Khi biểu ngữ Tà Thú đang hiện thì viên nằm ngay trên (`body.ev-on`). Ẩn khi có cửa sổ hoặc hội thoại mở. Bấm "Rời" lần 2 (hoặc trận kết thúc) thì xóa ngay thông báo cảnh báo "Bấm lần nữa để rời". Điện thoại: viên nằm giữa khoảng trống từ mép phải D-pad (`left: 240px`) tới bình thuốc của cụm kỹ năng (`right: 310px`, màn thấp ≤ 520px `right: 272px`), không bao giờ đè bình thuốc; nút Hủy/Rời cao 44px; màn ≤ 760px rút "Đang chờ ghép trận" thành "Đang chờ", ≤ 729px bỏ huy hiệu và chữ "LÔI ĐÀI" (khoảng trống chỉ còn ~155px). Đo lại ở 667×375, 740×360, 844×390 khi đổi cụm kỹ năng hay D-pad.
  - Camera trong phòng đấu canh vào điểm giữa hai đấu thủ (mình luôn cách mép khung ≥ 60), hai bên xuất phát cách giữa sàn 45px: cả hai đứng trong vùng trống giữa D-pad và cụm kỹ năng (điện thoại) / giữa khung chat và lưới menu (máy tính 1280×720), không ai nằm dưới nút HUD.
  - Đếm ngược vào trận `#arena-cd`: số 5 → 1 rồi "ĐẤU!" (1 giây) cỡ 120px (điện thoại 80px) giữa màn hình (máy tính `top: 44%`, điện thoại `top: 32%` để không đè tên nhân vật và băng tên bản đồ), viền chữ đỏ sẫm, phóng to mờ dần mỗi số, không nhận chạm. Lúc "ĐẤU!" hiện (`body.ar-go`) điện thoại tạm ẩn `#hud-target` (khung mục tiêu tự chọn đối thủ đúng lúc đó, chữ sẽ đè), hết "ĐẤU!" thì khung hiện lại. Vào trận thì dọn thông báo cũ (`#toasts`) để số không bị che.
- **Lôi đài** (cửa sổ, `ui/windows/arena.js`, `ui/windows/rank.js`): bảng xếp hạng có tab thứ tư "Lôi đài" (`[data-rktab=arena]`): thẻ của mình (huy hiệu, Elo cỡ lớn, nhãn "Hạng N"/"Chưa xếp hạng", thắng/thua/hòa, danh vọng, thanh "Tuần này n/3 trận"), nút "Đăng ký thi đấu" / "Hủy đăng ký" / "Đang thi đấu" / "Cần cấp 20" (`.ar-join`, điện thoại cao 44px), luật tóm tắt, top 30 (hạng, tên, Lv phái, `nT nB`, Elo), dòng thưởng tuần. Cửa sổ kết quả `arenares` tự mở sau trận (trừ khi đang giao dịch/cường hóa/mua bán): huy hiệu tròn vàng (thắng) / xám (thua) / xanh (hòa), chữ THẮNG/THUA/HÒA lớn, đối thủ, lý do (hạ gục, hết giờ kèm % sinh lực hai bên, rời trận, mất kết nối), "Điểm lôi đài trước → sau ±d" (giao hữu thì ghi không đổi điểm), xu + danh vọng nhận được, chuỗi thắng; chân: "Bảng xếp hạng", "Đấu trận mới", "Đóng" (điện thoại cao 44px). Trận không tính (`nc`) ghi "Trận không tính: chưa bên nào ra đòn" thay dòng điểm, người bỏ thấy số giây phải chờ để đăng ký lại. Lớp kết quả dùng `.arr-head.r-win/r-lose/r-draw` (**không** dùng `.win`, đã là lớp khung cửa sổ). Trong phòng đấu, tên đối thủ hiện đỏ như người đang PK; khung bản đồ nhỏ ghi "Lôi đài xếp hạng", đầu khung đỏ như khu PK.
- **Tự động và người chơi khác**: auto đánh, chiêu tự chọn mục tiêu khi bật auto và việc tự đuổi theo (`chase`) **chỉ** nhắm quái, đối thủ lôi đài đang trong trận, hoặc đối thủ thách đấu. Người chơi khác ở khu PK chỉ đánh khi tự bấm chọn và đã trong tầm (ngoài tầm thì báo "Mục tiêu ở quá xa", không tự tìm đường). Trong phòng đấu không tự uống bình thuốc.
- **Khung mục tiêu boss**: cuồng nộ thêm lớp `.rage` (nhãn `CUỒNG NỘ`, thanh máu đỏ rực, viền đập 0.5s). Điện thoại: lúc cuồng nộ ẩn nhãn `BOSS` và tên hệ để tên boss không bị cắt. Khi boss niệm chiêu hiện thanh `#tg-cast` "Đang niệm: <tên chiêu>" chạy đầy theo thời gian niệm.
- **Hiệu ứng xấu** (buff có khóa `bs_*` do chiêu boss): ô buff viền đỏ `.buff.debuff`, icon giao diện riêng.
- **Cửa sổ kết quả Tà Thú** (`evresult`): tự mở khi boss chết chỉ với người đang ở bản đồ của boss (gói `eventResult` có `map`) và đang không mở cửa sổ khác (không chen ngang giao dịch, cường hóa, mua bán); người ở bản đồ khác chỉ nhận thông báo, xem qua biểu ngữ. Khi cửa sổ mở (`body.evr-open`), thông báo loại `boss`/`world` bị ẩn (vẫn có trong khung chat) để không đè nút Đóng; dòng của mình, top 10 có huy chương vàng/bạc/đồng, thanh sát thương tỉ lệ với hạng 1.
- **Điện thoại** (`body.touch`, `@media (max-height: 520px)`): vùng chạm tối thiểu 44px (cả hàng công tắc `label.set-row` trong Cài đặt; nút nhỏ xếp chồng như `Nâng`/`Gán vào ô`/`Đọc sách` cao 34px + `::after` lấn 5px, khe 10px), không chồng lấn, chat thu gọn mặc định, có D-pad bên trái.
- **Menu** (`#hud-menu`): 16 nút (14 cửa sổ + AUTO + PK). Màn cao ≥ 740px: lưới 4 cột × 4 hàng 46px ở phải; cao 681-739px: 6 cột × 3 hàng (4 hàng chạm đáy khối nhiệm vụ khi có 2 nhiệm vụ + biểu ngữ lễ hội, đáy ở y≈292); màn thấp máy tính: 8 cột × 2 hàng 38px phía trên; cảm ứng màn thấp: 8 cột 36px (AUTO nằm ở cụm kỹ năng), nút chat thu gọn đặt sát trái menu (`right: 503px` khi cao ≤ 520px, `537px` khi ≤ 680px). Điện thoại hẹp ≤ 760px: khung trạng thái scale 0.72, menu 8 cột 34px khe 2px, nút chat thu gọn xuống dưới khung trạng thái (`left: 6px; top: 84px`, hàng buff dịch sang `left: 46px`); ≤ 729px: scale 0.68, menu 28px. Nút menu là **ngoại lệ** của vùng chạm 44px (lưới dày, bấm nhầm chỉ mở một cửa sổ, đóng lại được). Thêm nút mới phải kiểm tra lại mọi bố cục (đo ở 1280×720/700/681, 844×390, 740×360, 667×375) và chỗ nút chat.
- **Hộp thư** (cửa sổ `mail`, phím L, nút `.m-mail` có chấm đỏ khi `me.mail.n` (chưa đọc) hoặc `me.mail.g` (còn quà) > 0): trên cùng là ô nhập mã quà tặng; dưới chia 2 cột: danh sách thư (mới nhất trên cùng, thư chưa đọc có chấm đỏ và tiêu đề vàng, thư còn quà có nhãn "Quà") và nội dung thư (tiêu đề, người gửi, giờ Việt Nam, "tự xóa sau N ngày" chuyển cam khi ≤ 3 ngày, nội dung giữ xuống dòng, ô quà đính kèm, nút Nhận quà / dấu "Đã nhận", nút Xóa tắt khi còn quà). Chân: số thư, "Xóa thư đã đọc", "Nhận tất cả (n)". Mở thư là đánh dấu đã đọc. Điện thoại: 2 cột 240px + phần còn lại, nút và ô nhập mã cao ≥ 44px, thông báo hiện ở trên (đè băng tiêu đề).
- **Mã quà tặng**: ô nhập chữ in hoa ở Cài đặt (mục "Mã quà tặng") và đầu cửa sổ Hộp thư; kết quả hiện ngay dưới ô (xanh/đỏ), không bật thông báo nổi khi đang mở 2 cửa sổ này. Ghi chú/thông báo chỉ nhắc phím tắt (L) trên máy tính; thông báo từ server không nhắc phím. Đổi nhân vật / đăng xuất thì `ui.reset()` xóa thư, kết quả nhập mã, mã đang gõ, `S.seasonId` của nhân vật trước.
- **Lễ hội theo mùa**: biểu ngữ `.qt-season` ở cuối khối nhiệm vụ (đèn ông sao đung đưa, tên lễ hội, số bánh đang có, số ngày còn lại; điện thoại: khối có nhiệm vụ thì biểu ngữ thành huy hiệu 44px (đèn + số bánh) bên trái đầu khối nhiệm vụ để không đè cụm kỹ năng, khối chỉ có biểu ngữ thì 1 dòng không có số ngày; màn ≤ 760px ẩn huy hiệu khi có mục tiêu, ≤ 830px ẩn khi đang tìm đường), bấm để mở cửa sổ `event`; hiện khi server báo mùa đang chạy (gói `season`). Cửa sổ Lễ Hội: băng đầu tím-đỏ có trăng tròn, tên, ngày, mô tả, ô số bánh; lưới 2 cột thẻ đổi quà (icon quà, tên, giá bánh, lượt còn lại / "không giới hạn", hạn dùng) với nút Đổi và "x10" (món không giới hạn đủ bánh). Mở từ biểu ngữ (không đứng ở NPC), hoặc mở ở NPC rồi đi xa quá 120 (server nhận trong 130), thì nút đổi tắt, chân cửa sổ có nút "Tìm đường" tới Sứ Giả Lễ Hội gần nhất. Tên lễ hội trong cửa sổ dùng lớp `.evs-title` (không dùng `.ev-*` của biểu ngữ Tà Thú `#hud-event`). Điện thoại: Đổi/x10 xếp chồng cao 34px + `::after` lấn 5px, khe 10px; nút Đổi đứng một mình cao 44px. NPC Lễ Hội có dấu `!` vàng khi đủ bánh đổi món rẻ nhất.
- **Lớp z-index**: canvas 0, màn hình mở đầu 10, HUD 20, hội thoại NPC 45, cửa sổ 50, toast 55, lời mời và popup vật phẩm 60, menu người chơi 70, màn trọng thương 80, hộp xác nhận `ask()` 90, mất kết nối 100.
- **Băng rôn thông báo** (`#toasts`): giữa trên, ngay dưới khung nhân vật. Màn cao ≥ 681px và rộng ≥ 900px: rộng tối đa `100vw - 452px` để không đè khối bản đồ/nhiệm vụ bên phải (thông báo dài tự xuống dòng). Khi có cửa sổ mở: chuyển xuống đáy giữa, rộng tối đa 520px. Điện thoại, cửa sổ có nút thao tác sát đáy (Thợ Rèn, Hộp thư, Lễ hội, Thú cưng): lên mép trên (đè băng tiêu đề) thay vì đáy.
- **Hành trang**: khung trái có 2 tab `[data-eqtab=gear|style]` (không dùng `data-tab`, đã dành cho màn hình đăng nhập): "Trang bị" (9 ô chiến đấu quanh hình nhân vật) và "Thời trang" (mặt nạ, áo choàng, trang phục bên trái; thú cưỡi, thú cưng bên phải; dòng "Cưỡi thú: +x% tốc chạy"; hình nhân vật thu về tỉ lệ 2 khi cưỡi thú). Cửa sổ xem người khác dùng cùng tab. Cửa sổ Nhân Vật có hàng "Ngoại trang" 5 ô. Hai tab dùng chung 4 hàng ô của `.doll` (dòng tốc chạy nằm ở hàng 4) để cửa sổ không co giãn, nút tab không nhảy khi đổi tab. Vật phẩm có hạn hiện huy hiệu đỏ góc dưới trái ô (`7n` ngày, `5g` giờ, `<1g`; làm tròn lên nên món vừa nhận 7 ngày hiện `7n`), chi tiết ghi "Hạn sử dụng: còn X ngày Y giờ" (đỏ khi còn dưới 1 ngày). Chi tiết vật phẩm (`.item-pop`) tự đóng khi món đó rời ô của nó (hết hạn, bị dùng, tháo). Tiệm Thuốc có tab "Thời trang" riêng. Cường hóa không bày thú cưng, thời trang.
- **Cửa sổ Thú cưng** (`pet`, phím K, nút dấu chân trên menu; nút "Thú cưng" ở chân cửa sổ Nhân Vật; "Chăm sóc" trong chi tiết thú đang mang): sân khấu 120×104 vẽ thú tỉ lệ 5 (canvas pixel, `image-rendering: pixelated`), huy hiệu cấp, thanh EXP vàng và thanh thân mật hồng, tâm trạng (dưới 20 "Đang dỗi" đỏ). Hai cột: chỉ số (giá trị cấp sau dạng `a → b`) và kỹ năng tự động (mô tả + dòng `Cấp N+1: …` ngắn). Hàng thức ăn 3 thẻ (icon, tên, hiệu quả, nút "Cho ăn"; hết thì "Chưa có"). Chưa mang thú thì liệt kê thú trong hành trang với nút "Mang theo". Gói `pet` chỉ cập nhật `S.equip.pet`, không gửi lại cả hành trang. Khi đang mở cửa sổ, gói `pet`/`inv` chỉ sửa tại chỗ thanh EXP, thân mật, tâm trạng (`petSync`); chỉ dựng lại khi cấp, trạng thái dỗi/no, số thức ăn hay thú trong túi đổi (để không mất cú bấm "Cho ăn"). Kỹ năng ghi tầm bằng số như kỹ năng chủ động ("tầm nhặt 160"), **không** ghi `px`. Thú cấp tối đa và thân mật đầy: nút thức ăn ghi "Đã no", tiêu đề hàng ghi "Thú đã đạt cấp và thân mật tối đa". Nút "Thú cưng" ở chân cửa sổ Nhân Vật cao 44px trên điện thoại. Tiệm Thuốc có tab "Thú cưng" (`data-shtab=pet`): thức ăn + thú cưng.
- Menu máy tính: AUTO là ô 46px như PK (chữ dưới icon) để 13 nút + AUTO + PK vừa 5 hàng; màn thấp (≤680px) menu 8 cột.
- **Thợ Rèn** (cửa sổ `upgrade`, tiêu đề "Thợ Rèn", chiều cao tối thiểu `min(540px, 92vh)` để đổi tab không nhảy, nội dung dài vẫn mở rộng tới `max-height` của `.win`): 3 tab `[data-smtab=upg|gem|merge]` "Cường hóa / Khảm ngọc / Ghép ngọc" (hội thoại NPC có lựa chọn "Khảm & ghép ngọc" mở thẳng tab khảm). Tab Khảm: trái là trang bị có lỗ (đang mặc có dấu `E` đỏ góc trên phải, xếp trước) và ngọc trong hành trang; phải là bàn khảm `.gem-board` (món đồ ở giữa, các lỗ tròn `.gem-hole` 52px viền vàng đồng bên dưới, lỗ có ngọc phát sáng màu ngọc + số cấp, lỗ trống có dấu `+`, khi đã chọn ngọc hợp lệ thì lỗ trống nhấp nháy vàng `.ready`), chữ chỉ số dưới mỗi lỗ, dòng "Ngọc cộng", hộp thao tác (khảm / gỡ kèm phí / lý do không khảm được). Chọn ngọc rồi bấm lỗ, hoặc kéo thả ngọc vào lỗ (chỉ máy tính). Tab Cường hóa: cột trái là danh sách trang bị và chi tiết món đang chọn (ngọc khảm gói trong một dòng tóm tắt `itemDetail(it, null, { gems: 'short' })`), cột phải chỉ có hộp cường hóa để nút CƯỜNG HÓA luôn trong khung nhìn. Tab Ghép: 3 lỗ nhỏ → mũi tên → lỗ kết quả lớn, tỉ lệ, số viên, phí; ngọc đủ 3 viên có tam giác xanh góc trên phải. Ô vật phẩm: ngọc có số cấp góc trên trái; trang bị đã khảm có dãy chấm tròn 7px góc dưới phải (chấm màu ngọc, lỗ trống chấm tối). Chi tiết vật phẩm có mục "Ngọc khảm n/N lỗ". Chữ chỉ số ngọc dùng `gemText`/`gemParts` (số có dấu chấm hàng nghìn: "+2.400 sinh lực"); chú thích dưới lỗ chỉ được ngắt dòng giữa số và nhãn. Bán món có ngọc phải hỏi lại (gợi ý gỡ ngọc trước); hủy món có ngọc cũng hỏi lại. Thông báo kết quả khảm/gỡ/ghép chỉ giữ 1 cái mới nhất; trên điện thoại khi mở Thợ Rèn, thông báo hiện ở trên (đè băng tiêu đề) để không che nút thao tác sát đáy. Nút thao tác chính (KHẢM NGỌC, GỠ NGỌC, GHÉP NGỌC, CƯỜNG HÓA) cao tối thiểu 44px trên điện thoại. Điện thoại: bàn khảm xếp ngang (món trái, lỗ phải), ẩn dòng tổng và ghi chú chân cửa sổ (cả 3 tab).
- **Văn phong**: tiếng Việt có dấu đầy đủ. NPC xưng "ta", gọi người chơi là "ngươi". Thông báo hệ thống ngắn gọn, trung tính. Đơn vị tiền ghi "xu" và "lượng". Số có dấu chấm ngăn cách hàng nghìn (`toLocaleString('vi-VN')`).
- **Xu khóa & vật phẩm khóa**: token `--xuk #e9a86a`. Ô vật phẩm khóa có ổ khóa 12px góc trên phải (`.bnd`; ở Thợ Rèn đứng dưới dấu `E` đang mặc); chi tiết có dòng "Vật phẩm khóa: không thể giao dịch" (`.id-bound`, màu cảnh báo). Hàng tiền (`moneyLine`) gồm xu, xu khóa, lượng (được xuống dòng trên điện thoại). HUD **không** thêm ô xu khóa, chỉ `title` của ô xu ghi cả hai. Cửa hàng có thanh `.shop-nbar` **trên** danh sách hàng (không đặt cuối danh sách vì phải cuộn mới thấy): công tắc "Không dùng xu khóa" (chỉ ở tab có hàng bán bằng xu; điện thoại cao 44px) và ghi chú khi nào hàng bị khóa. Giao dịch: ô khóa/có hạn mờ (`.nt`), không chọn được. Thợ Rèn: món khóa trên bàn khảm cũng có ổ khóa (16px); phí kiểm theo `xuAll()` (`title` "Trừ xu khóa trước"); khảm ngọc khóa vào món chưa khóa thì hỏi xác nhận; ghép có viên khóa thì báo viên mới sẽ khóa.

---

## 9. Thiết kế nội dung và cân bằng (`src/shared/data/*`)

| Hạng mục | Quy chuẩn |
|---|---|
| Cấp | 1-120; EXP cần `20·lv² + 80·lv`; mỗi cấp +5 tiềm năng, +1 điểm kỹ năng |
| Hành trang | Gốc 40 ô (`INV_SIZE`), mở rộng bằng lượng `INV_EXPAND`: 6 lần × 10 ô, giá 50 / 100 / 150 / 200 / 300 / 400 lượng (tối đa 100 ô). Lưới chia trang 40 ô, nút trang cao ≥ 44 px trên điện thoại. Hủy nhanh nhiều món (`discardMany`) và Dùng nhiều (`useItem n`, tối đa `USE_MANY.max` = 50 món, buff cộng dồn tối đa 24 giờ) |
| Quái thường cấp L | HP `40 + 2L² + 20L`, công `8 + 6L + 0.12L²` (làm tròn), thủ `1.5L`, EXP `10 + 8L` |
| Boss | HP ×150, công ×1.5, thủ ×1.6, EXP ×60 (so với quái thường cùng cấp, `BOSS_MUL`), hồi sinh 10 phút. Trong phó bản HP ×0.5 |
| Chiêu boss | 2-3 chiêu mỗi boss (`BOSS_SKILLS` trong `monsters.js`): `quake` (vòng/dải đất, ×1.3-1.8), `roar` (vòng, ×0.6, làm chậm 25-40% trong 3s), `summon` (gọi 2-3 quái con, tối đa gấp đôi số gọi mỗi lần, quái con không rơi đồ, biến mất khi boss chết), `beam` (dải thẳng hoặc 3-5 cột, ×1.4-2), `nova` (vòng lớn, ×2-2.6). Niệm 1-1.8s, hồi 9-20s, giữa hai chiêu tối thiểu 1.6s. Chiêu đánh mọi người chơi còn sống trong vùng (không chỉ mục tiêu), không gây sát thương trong làng. Giới hạn kiểm tra: dải ≤320px, cột ≤40px, vòng ≤160px, niệm 0.8-3s, hệ số 0-3. `npm run check` kiểm dải hệ số theo loại: quake 1.3-1.8, beam (cả pillar) 1.4-2, nova 2-2.6, roar 0.5-0.7 |
| Cuồng nộ | máu boss dưới 30%: hồi chiêu ×0.6, niệm ×0.85, đánh thường nhanh ×0.75, chạy ×1.2; thông báo cả bản đồ |
| Tà Thú (sự kiện) | 3 boss `ev_*` (cấp 32 / 60 / 95), HP ×(300 + 120·n) với n = số người online cấp ≥ cấp boss − 10, không ở phó bản, lúc xuất hiện (1-20; `eventHpMul`), công ×1.5, EXP ×150, không hồi sinh. Xuất hiện mỗi 2 giờ (giờ chẵn, giờ Việt Nam) phút 30, báo trước 5 phút, tồn tại 20 phút, ở bãi luyện công có quái chênh ≤10 cấp. Thưởng theo hạng sát thương (xu nhân cấp boss): hạng 1: 30 lượng, 1.000 xu, 3 rương, 1 sách nội tại đúng phái (req 15/35/50 theo cấp boss <45/<80/còn lại); hạng 2: 20 lượng, 700 xu, 2 rương, 5 đá; hạng 3: 15 lượng, 500 xu, 2 rương, 3 đá; hạng 4-10: 5 lượng, 300 xu, 1 rương; còn lại gây từ 1% máu: 1 lượng, 100 xu. EXP chia theo tỉ lệ sát thương (`15% + phần đóng góp`). Hành trang đầy thì đồ thưởng gửi vào hộp thư; hộp thư đầy quà thì vào thủ kho; kho cũng đầy thì server giữ hộ (`c.pending`) và tự trả khi hành trang có chỗ. **Không** thả đồ thưởng ra đất |
| Trang bị | bậc = ⌊cấp quái / 10⌋; vũ khí công `8 + 6t² + 14t`, áo thủ `5 + 3t² + 8t` |
| Cường hóa | +16 tối đa; mỗi cấp +8% chỉ số gốc; đá Sơ +1~4, Trung +5~8, Cao +9~12, Thần +13~16 |
| Rơi đồ (quái thường) | trang bị 4.5%, đá 3.5%, bình 6%, rương 0.4%, ngọc khảm 1.2% (cấp 1; quái từ cấp 40: 25% ra cấp 2); độ hiếm 60/28/10/2% |
| Ngọc khảm | 6 loại × 10 cấp (`GEM_TYPES`, id `gem_<loại>_<cấp>`). Cấp 1 → 10: Hỏa Tâm +12 → +470 tấn công, Thủy Linh +60 → +2.400 sinh lực, Thổ Giáp +8 → +280 phòng thủ, Phong Ảnh và Lôi Quang +0.4 → +4% né/chí mạng, Huyết Hồn +0.3 → +3.2% hút máu (tổng trần 10%, đánh boss chỉ tính 50%, hồi theo sát thương thực gây ra, kể cả PvP; gửi gói `heal` có `ls: 1`, gộp mỗi 0,6 giây, máy khách hiện số `+N` màu hồng máu `#ff8aa0`). Cộng thẳng, **không** nhân theo cấp cường hóa. Lỗ khảm theo bậc: Gỗ-Sắt 1, Bạc-Huyền 2, Long trở lên 3; chỉ 9 ô chiến đấu (thú cưng, thời trang không có lỗ). **Không** khảm 2 viên cùng loại vào 1 món. Gỡ: `300 + 200·cấp²` xu, ngọc về hành trang. Ghép 3 viên cấp N → 1 viên N+1: phí `1000·N²` xu, tỉ lệ 100/90/80/70/60/50/40/32/25%, thất bại mất 1 viên (trả 2). Giá `1500·3^(N-1)` xu, Lò Rèn bán cấp 1 (1.500 xu). Boss luôn rơi 1 viên cấp `min(5, 2 + ⌊cấp boss/35⌋)`. Ngọc đi theo món khi giao dịch, cất kho; bán món thì cộng 25% giá mỗi viên. Mọi thao tác cần đứng gần Thợ Rèn và không đang giao dịch |
| Bình thuốc | Hồi chiêu chung mọi cỡ: HP 4 giây, MP 1,5 giây (`POTION_CD` trong `src/shared/constants.js`, gửi máy khách `S.G.potCd`); server nhận sớm tối đa 200ms do trễ mạng, phần sớm trừ vào lượt sau (uống dồn không nhanh hơn hồi chiêu); dùng khi còn hồi chiêu thì báo "Bình thuốc đang hồi chiêu" tối đa 1 lần mỗi vòng. Nút bình trên HUD hiện vòng hồi chiêu |
| Mốc cân bằng | Người chơi trung bình cấp L: tiềm năng 50% Sức mạnh / 20% Thân pháp / 30% Thể lực; 9 món bậc ⌊L/10⌋ cường hóa +min(10, round(2 + L/15)); đủ lỗ ngọc cấp min(5, 1 + ⌊L/25⌋); thời trang và thú theo cấp; nội tại cấp min(15, ⌊(L − req)/3⌋ + 1). Không cộng các hệ thống đợt 3 (kinh mạch, thú nuôi/pháp bảo, danh hiệu, trận pháp gia tộc) vì là hậu kỳ/tùy chọn. Dải: quái thường cùng cấp 1,5-7% HP/đòn và chết sau 2-8,5 đòn thường; boss đánh thường 4-18% HP, chiêu mạnh nhất ≤ 47% HP phái đánh xa, solo 2-6 phút (60% DPS lý thuyết); Tà Thú 1 người ≤ 15 phút, 10 người ≥ 2 phút. Đo bằng `node tools/balance.js`, `npm run check` báo lỗi khi lệch |
| Kỹ năng | 6 kỹ năng + 1 đòn thường mỗi phái, tối đa cấp 15, cấp L cần nhân vật đạt `req + 3·(L-1)` |
| Kỹ năng nội tại | 3 mỗi phái (req 15, 35, 50), tối đa cấp 15, cấp 1 học bằng sách, cấp sau như kỹ năng thường. Giá trị `[cơ bản, mỗi cấp]` (cấp 15): % sinh lực `[4, 0.8]` (15.2%), % tấn công `[3, 0.6]` (11.4%), % phòng thủ `[5, 1]` (19%), chí mạng `[2, 0.4]` (7.6), né `[2, 0.3]` (6.2), % ST kỹ năng `[4, 0.8]` (15.2%), ST chí mạng `[10, 2]` (+38%, gốc 160%), kháng hệ khắc `[8, 1.5]` (29%, trần 50%), chakra/giây `[2, 0.6]` (10.4), % tốc chạy `[4, 0.8]` (15.2%). Chỉ số giữ 1 chữ số lẻ (kể cả `spd`) để cửa sổ Kỹ năng và Nhân Vật ghi cùng một số. Chữ hiển thị: cấp kỹ năng ghi `LvN` (`Lv1: …`, `Lv15 (tối đa): …`), cấp nhân vật ghi `Mở ở cấp N` / `Yêu cầu nhân vật cấp N` |
| Sách kỹ năng | Tiệm Thuốc: 30 / 60 / 100 lượng (req 15 / 35 / 50), chỉ bày sách đúng phái. Boss rơi mỗi cuốn 2-3.5% (6 phái: khoảng 12-20% ra ít nhất 1 cuốn): boss dưới cấp 30 rơi sách req 15, cấp 42 rơi req 15-35, cấp 60-85 rơi req 35-50, cấp 100+ rơi req 50. Bán lại cho NPC giá `req·50` xu. Mỗi lần mua chỉ 1 cuốn (không có ô số lượng) |
| Thời trang | 4 ô `mask, cloak, costume, mount` (`FASHION_SLOTS`), không tính vào 9 ô chiến đấu, không cường hóa, độ hiếm cố định theo `grade` (1 Tốt - 4 Huyền thoại). Chỉ số nhỏ: `expPct` ≤ 10, `hpPct` ≤ 8, `crit`/`dodge` ≤ 3, công 40-150, thủ 30-80, sinh lực 100-600. Mặt nạ 40-90 lượng, áo choàng 30-120, trang phục 50-100; món Huyền thoại (`tengu, snow, dragon, qilin`) **không bán**, chỉ ra từ rương/vòng quay |
| Thú cưỡi | `stats.spd` 15 (ngựa, Tốt) / 20 (sói, Hiếm) / 25 (hạc, Sử thi) / 28 (hổ, Sử thi) / 35 (kỳ lân, Huyền thoại), cộng **ngoài** trần 60% tốc chạy của trang bị + nội tại, tổng tối đa 100%. Giá 50 / 120 / 250 / 400 lượng. Server nhận tốc cũ thêm 2.5s sau khi tháo/hết hạn để gói di chuyển đang bay không bị kéo lại |
| Thú cưng | `src/shared/data/pets.js`. Cấp 1-50, EXP cần `20·lv² + 80·lv`. Diệt quái: thú nhận `10% × (1 + thân mật/100)` EXP gốc của chủ (thân mật 100 = 20%), vẫn nhận khi chủ đã max cấp. Chỉ số lưu trên món đồ (`it.plv`, `it.pexp`, `it.love`; **không** dùng `it.exp` vì đó là hạn sử dụng); mỗi cấp +3% chỉ số cộng thẳng, +1.5% chỉ số phần trăm (`PET_PCT`), cấp 50 ≈ ×2.47 / ×1.74. `expPct` cấp 1 trong 1-25. Thân mật 0-100, bắt đầu 50, giảm 1 mỗi 10 phút mang theo; dưới 20 thú dỗi, không dùng kỹ năng. Kỹ năng: Tha Đồ (`pick`, mỗi 1.5s nhặt 1 món của chủ/không chủ trong `60 + 2·cấp` px; bỏ qua món hành trang không chứa nổi để còn nhặt xu/món khác, chỉ tính hồi chiêu khi nhặt được), Hồi Xuân (`heal`, mỗi 4s khi chủ dưới 70% sinh lực hồi `1 + 0.06·(cấp−1)`% sinh lực tối đa). Thú không cường hóa, không có lỗ khảm. Giá 20 / 40 / 70 / 120 / 160 lượng, Rồng Con chỉ rơi từ boss |
| Thức ăn thú | Bánh Gạo Linh Thú +300 EXP +3 thân mật (600 xu), Cá Khô Ngân Lân +2.500 EXP +6 (4.000 xu), Linh Thú Đan +15.000 EXP +15 (5 lượng). Phải đang mang thú; cấp 50 và thân mật đầy thì từ chối. EXP tăng dần theo giá (`npm run check` kiểm) |
| Hạn sử dụng | đồ từ Rương Báu (5%) và Vòng Quay (ô "Thời trang": ~1% khi quay xu, ~4.8% khi quay lượng) có hạn **7 ngày** (`it.exp`, ms). Trọng số chọn món theo grade 6/4/2/1 (Huyền thoại ~9%). Hết hạn: server dọn lúc tải nhân vật và mỗi 5 giây khi online (trên người, túi, thủ kho, đồ giữ hộ), tính lại chỉ số, báo "Hết hạn sử dụng: …". Đồ có hạn **không giao dịch được**; `tradeOk` so đúng món + số lượng đã đặt (`trade.items`), ô bị tráo sau khi đặt (dùng/tháo đồ rơi vào ô đó) thì hủy giao dịch. Màn chọn nhân vật (`lookOf`) bỏ qua món đã hết hạn lúc offline. Đồ mua bằng lượng là vĩnh viễn. Đồ khóa (`it.b`) cũng không giao dịch được |
| Hộp thư | `MAIL` trong `extras.js`: tối đa 30 thư mỗi nhân vật, thư quá 30 ngày tự xóa (kể cả còn quà), tối đa 6 món đính kèm mỗi thư (nhiều hơn thì tách thành nhiều thư "(1/2)"). Hộp đầy thì bỏ thư cũ nhất đã đọc và không còn quà; toàn thư còn quà thì không nhận thêm. Nhận quà kiểm tra đủ chỗ cho **mọi** món (tính cộng dồn), thiếu chỗ thì từ chối cả thư. Thư lưu trong dữ liệu nhân vật (`c.mail`) nên người offline vẫn nhận. Dùng cho: quà admin (`/mail`), giftcode khi túi đầy, thưởng Tà Thú khi túi đầy (hộp thư đầy quà thì mới chuyển thủ kho) |
| Giftcode | `GIFTCODES` trong `extras.js` (mã 4-20 chữ in hoa/số, `reward`, `until` bắt buộc, `from`, `lv` tùy chọn; ngày theo giờ Việt Nam, `until` tính hết ngày) + mã tạm của admin `/code` (lưu `meta.json`, tự dọn khi hết hạn, có thể giới hạn số lượt). Mỗi **tài khoản** dùng mỗi mã 1 lần (lưu `acc.codes` trong `accounts.json`, xóa nhân vật tạo lại cùng tên không nhập lại được; lượt tối đa của mã `/code` cũng tính theo tài khoản). Chống dò mã: mỗi tài khoản sai 5 lần/phút (mỗi IP 30 lần/phút, IP lấy từ phần tử cuối `X-Forwarded-For` khi đứng sau proxy tin cậy; mỗi IP tạo tối đa 10 tài khoản/giờ) thì khóa tới hết phút, mỗi lần nhập cách nhau ≥ 0,4 giây. Thưởng mỗi mã không quá 100 lượng. Xu trong thưởng trao thành **xu khóa**, vật phẩm bị khóa |
| Sự kiện theo mùa | `SEASONS` trong `extras.js`, chỉ một mùa tại một thời điểm, dài tối đa 92 ngày. Lễ Hội Trăng Rằm (25/09 - 08/11): quái thường rơi 1 Bánh Trung Thu tỉ lệ 5% nếu cấp quái ≥ cấp người hạ − 10, boss rơi 3-6, mỗi người có hạng ở Tà Thú nhận 8-12. Đổi quà (bánh/lần, giới hạn cả mùa): 6.000 xu (5), 10 bình HP + 10 bình MP lớn (8), Bí Kíp Nhân Đôi (15), 2 đá Trung (20), Rương Báu (25), 5 lượng (40, 10 lần), Huyết Hồn Ngọc Cấp 2 (60, 5 lần), Hải Lam Y 15 ngày (150, 1 lần), Hạc Tiên Vân Du 15 ngày (300, 1 lần). Trang bị/thời trang đổi được phải có giới hạn lượt; thời trang phải có hạn dùng. Bánh bán NPC 5 xu. Admin `/sukien <mã mùa|tat|auto>` ép bật/tắt để thử |
| Lôi đài xếp hạng | `ARENA` trong `extras.js`. Đăng ký từ cấp 20 ở Võ Sư Thiết Quyền (Đấu Trường) hoặc tab Lôi đài. Elo khởi đầu 1.000, K = 32, tổng điểm hai bên không đổi, không xuống dưới 0. Ghép cặp: biên chênh Elo 100, mỗi 10 giây chờ nới thêm 50, tối đa 1.000 (lấy biên rộng hơn của hai người), ưu tiên người chờ lâu và điểm gần nhất. Mỗi trận một phòng riêng `loidai` (phó bản, chủ đề `arena`, rộng 640, hai bên đứng cách giữa sàn 45px): đếm ngược 5 giây (không ra chiêu), đấu 3 phút; vào trận hồi đầy sinh lực/chakra, xóa hồi chiêu và buff, không dùng vật phẩm (trừ thay trang bị), không hồi máu tự nhiên (cả kỹ năng Hồi Xuân của thú cưng); ra trận trả lại sinh lực/chakra như trước trận và về chỗ cũ. Hạ gục (đòn chí mạng để đối thủ còn 1 máu) thắng; hết giờ so % sinh lực (chia theo sinh lực tối đa lúc vào đấu, tháo đồ phút cuối không lợi), bằng nhau thì hòa; rời trận, đổi bản đồ hay mất kết nối là thua. Chưa bên nào đánh trúng mà đã bỏ trận hoặc hòa: trận không tính (không điểm, không thưởng, không tính trận tuần), người bỏ chờ 60 giây (`dodgeLock`) mới đăng ký lại. Thưởng mỗi trận (tối đa 20 trận/ngày): thắng 3.000 xu + 10 danh vọng, hòa 2.000 + 5, thua 1.000 + 3; người rời trận không có thưởng. Cùng một cặp chỉ 3 trận tính điểm mỗi ngày (lưu `db.meta`, khởi động lại máy chủ không làm mới), sau đó là giao hữu (không đổi điểm, không thưởng). Thưởng tuần (0 giờ thứ Hai giờ Việt Nam, qua hộp thư, cần ≥ 3 trận, thắng ≥ 1 trận (`weeklyWin`) trong tuần và điểm ≥ 1.000): hạng 1: 100 lượng, 200.000 xu, 3 Rương Báu; hạng 2-3: 60 lượng, 120.000 xu, 2 rương; hạng 4-10: 30 lượng, 60.000 xu, 1 rương; hạng 11-50: 10 lượng, 20.000 xu. Admin `/arena` (xem hàng chờ), `/arena reward` (trao thưởng tuần ngay để thử), `/arena elo <n>` |
| Bản đồ | mỗi bãi luyện công có 3 loại quái, chênh nhau 2-3 cấp, xếp từ cấp thấp (trái) đến cấp cao (phải) |
| Xu khóa | `c.xuk`, trần 2.000.000.000. Nguồn: thưởng nhiệm vụ chính/hằng ngày, điểm danh, vòng quay, giftcode, thư admin, đổi quà lễ hội, rương khóa, bán đồ khóa (giá bán = `sellPrice`, như đồ thường). Phí NPC (mua bằng xu, cường hóa, gỡ/ghép ngọc, dịch chuyển, vòng quay xu) trừ xu khóa trước. Không giao dịch, không góp/tạo gia tộc. Không có cách đổi xu khóa thành xu |
| Vật phẩm khóa | `it.b = 1`. Gắn khi: quà (như trên), mua bằng lượng, mua bằng xu có dùng xu khóa, mở từ rương khóa, cho thú cưng ăn thức ăn khóa (thú bị khóa, máy khách hỏi lại trước), khảm ngọc khóa (món bị khóa), gỡ ngọc từ món khóa, ghép có viên khóa. Chồng khóa không gộp với chồng thường. Không giao dịch/ký gửi/gửi người khác (`canTransfer`). Bán NPC nhận xu khóa. **Có chủ đích**: dùng xu khóa/đá khóa để cường hóa đồ thường thì đồ **không** bị khóa (tránh khóa nhầm đồ đắt). Đồ rơi từ quái, thưởng Tà Thú/phó bản/lôi đài là đồ thường |

**Quy tắc đặt tên:**
- Kỹ năng, bản đồ, boss: Hán-Việt hoặc thuần Việt giàu hình ảnh (Hỏa Long Thần Kiếm, Thung Lũng Sương).
- Trang bị: "Loại + Bậc" (Kiếm Bạc, Áo Thánh).
- Thời trang, thú cưỡi, thức ăn thú: tên riêng Hán-Việt giàu hình ảnh (Mặt Nạ Hồ Ly, Áo Choàng Dạ Ảnh, Long Bào Kim Tuyến, Bạch Hổ Sơn Quân). Không dùng tên vật phẩm của game khác.
- Vật phẩm nhiệm vụ: danh từ cụ thể (Vảy Rồng, Lông Lôi Điểu).
- NPC lôi đài, danh hiệu đấu: Hán-Việt võ hiệp (Võ Sư Thiết Quyền, Lôi Đài). Không dùng tên đấu trường hay danh hiệu của game khác.
- Lễ hội, vật phẩm sự kiện, NPC lễ hội: lấy từ phong tục Việt Nam (Trăng Rằm, Bánh Trung Thu, đèn ông sao, Sứ Giả Nguyệt Lan/Thu/Hạ). Không dùng tên sự kiện hay vật phẩm của game khác.

**Nhiệm vụ chính:**
- Xếp theo `req` tăng dần.
- Loại nhiệm vụ: `talk, kill, collect, level, visit, upgrade, dungeon`.
- Mỗi nhiệm vụ phải nói rõ **địa điểm**.
- Phần thưởng theo hệ số `expNeed(req)`.

**Không phá cân bằng:** đổi công thức hay tỉ lệ rơi phải ghi lý do trong commit và cập nhật bảng trên.

---

## 10. Hiệu năng

- Mục tiêu 60fps trên điện thoại tầm trung. Mỗi khung hình chủ yếu là `drawImage` từ cache, hạn chế `fillRect` lẻ.
- Không cấp phát mảng hay đối tượng lớn trong vòng lặp vẽ. Cache theo khóa chuỗi trong `Map`.
- Server chạy 20 tick/giây, gửi trạng thái 10 lần/giây. Không gửi dữ liệu tĩnh trong gói trạng thái.
- Mốc đo gần nhất (Chromium headless, 1280×720 và điện thoại 844×390 @2x): bản đồ 18-23 quái, auto đánh, ban đêm, thú cưỡi + thú cưng + đủ thời trang, thêm 8 hiệu ứng nổ/lốc/thiên thạch mỗi giây: 60fps, CPU mỗi khung (update + render + HUD) trung bình 3-4ms, p95 ≤ 5ms. Thêm vẽ mới mà vượt 8ms/khung ở kịch bản này là phải tối ưu.
