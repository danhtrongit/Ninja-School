# GDD 05 — Hệ thống thú cưỡi, thú cưng và ngoại hình

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5 (phần thú cưỡi, thú cưng, thời trang, ngoại hình nhân vật) |
| Ngày | 18/10/2026 |
| Phạm vi id | `pet-fashion`, `pet-mount`, `pet-pets`, `pet-beasts`, `pet-mountup`, `pet-appearance-fx`, `pet-wardrobe`, `char-create-custom` (danh mục) + `char-rename` (id mới, tách từ `char-create-custom`) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md` (mục 2, 3, 7, 9), `docs/gdd/01-tam-nhin.md`, `02-hien-trang.md`, `03-doi-chieu.md`, `04-dac-sac.md`; mã ở thư mục làm việc ngày 18/10/2026: `src/shared/data/pets.js`, `items/{base,fashion,pets,equipment}.js`, `modules/{pets,fashion,inventory}`, `core/{player,gateway}.js`, `render/{petart.js,sprites.js,sprites/mount.js,sprites/body.js,sprites/color.js}`, `ui/windows/pet.js`, `tools/check-data.js`, `tests/features/{pets,fashion}.js`; đặc tả đã duyệt `specs/mountup.md` (kèm phụ lục điều phối đợt 3), `specs/PLAN.md`; nội dung cấp 199 `content/60-mounts-pets.md`, `content/50-worldboss-events.md` mục 7-8 (thời trang lễ hội), `content/PLAN.md` mục 1 (các mâu thuẫn đã gỡ); kiểm kê `gddwork/audit-data.md`, `audit-systems.md`, `audit-risk.md`; nhật ký `gddwork/lab/test1.log` (`npm test` đạt, 183 giây), `gddwork/lab/check1.log` (`npm run check` sạch) |
| Thí nghiệm kèm | `gddwork/lab/m05e/beasts-check.js` (chỉ số 22 thú cưỡi ở cấp 30 Thần Thú, 25 thú cưng ở cấp 50, kiểm mức chặn và trùng id/tên với dữ liệu hiện có; kết quả `beasts-check.out.txt`: "OK mọi chỉ số trong mức chặn, không trùng id/tên"), `gddwork/lab/m05e/exp-sums.js` (tổng EXP nuôi thú cưỡi/thú cưng, kết quả `exp-sums.out.txt`) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 4 của tài liệu này. Với 2 tính năng đã có đặc tả triển khai (`pet-beasts` ← `content/60-mounts-pets.md`, `pet-mountup` ← `specs/mountup.md`), tài liệu này **tóm theo khuôn GDD và ghi phần chỉnh**; worker làm theo đặc tả gốc + phụ lục điều phối của nó, các dòng "Chỉnh so với đặc tả" ở đây ưu tiên hơn. Thứ tự ưu tiên giữa các đặc tả nội dung giữ như `content/PLAN.md`: PLAN → phụ lục đợt 3 → `00-foundation` → `10-world` → `20-monsters` → `30-quests` → `40`/`50`/`60`.

---

## 0. Tóm tắt

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | Đặc sắc | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|---|
| `pet-fashion` | Thời trang 3 ô có chỉ số, bản có hạn 7 ngày | P1 | S | done | 5 | M | có | mục 1.1 |
| `pet-mount` | Thú cưỡi tăng tốc chạy ngoài trần | P1, P2 | M | done | 5 | M | | mục 1.2 |
| `pet-pets` | Thú cưng có cấp, thân mật, thức ăn, kỹ năng | P1, P4 | M | done | 5 | M | có | mục 1.3 |
| `pet-beasts` | 22 thú cưỡi, 25 thú cưng, 8 kỹ năng thú, ghép mảnh | P1, P4, P5 | M | todo | 5 | L | | mục 2.1, `content/60-mounts-pets.md` |
| `pet-mountup` | Thú cưỡi nuôi và tiến hóa, thú cưng đổi hình thái, pháp bảo sau lưng | P1, P4 | S | todo | 5 | L | có | mục 2.2, `specs/mountup.md` |
| `pet-appearance-fx` | Hào quang bộ thời trang, vệt theo thú cưỡi, dấu chân | P1 | C | todo | 6 | M | | mục 2.3 |
| `pet-wardrobe` | Tủ ngoại hình lưu kiểu đã sở hữu, nhuộm màu | P1, P5 | C | todo | 6 | M | | mục 2.4 |
| `char-create-custom` | Chọn tóc, màu tóc, màu mắt, màu da, khăn che mặt khi tạo nhân vật; Gương Hóa Dung | P1, P2 | C | todo | 1 | M | | mục 2.5 |
| `char-rename` | Đổi tên nhân vật bằng Thẻ Cải Danh (id mới, tách từ `char-create-custom`) | P4, P5 | C | todo | 8 | M | | mục 2.6, ADR-05e-3 |

Tính năng đặc sắc thuộc mục này (đếm vào sàn ≥ 10 đặc sắc M/S, khớp `04-dac-sac.md`): `pet-fashion`, `pet-pets` (đã làm), `pet-mountup` (chưa làm).

Lý do tách `char-rename` khỏi `char-create-custom`: đổi ngoại hình chỉ chạm dữ liệu một nhân vật, còn đổi tên chạm mọi bảng dùng tên làm khóa (nhân vật, tài khoản, bạn bè, gia tộc, cặp lôi đài, xếp hạng). Hai việc có rủi ro, kiểm thử và giai đoạn khác nhau, gộp một id thì `char-create-custom` không thể "xong" sớm ở giai đoạn 1.

### 0.2 Sàn nội dung và cách đạt

| Sàn 1.0 | Hiện có | Sau mục này | Nguồn thêm | id |
|---|---:|---:|---|---|
| Thú cưỡi ≥ 20 | 5 | **22** | 15 loài của `content/60` + 2 loài lễ hội (`mount_lanxuan` Tết, `mount_tuanloc` Noel) của `content/50` | `pet-beasts`, `evt-tet`, `evt-noel` |
| Thú cưng ≥ 25 | 6 | **25** | 19 loài của `content/60` | `pet-beasts` |
| Kỹ năng thú | 2 | 8 | 6 kỹ năng mới (`mana, ward, rage, strike, fortune, purge`) | `pet-beasts` |
| Hình thái thú cưng | 1 | 3 (Ấu Thú, Trưởng Thành, Linh Thú) | `evo: [b1, b2]` cho cả 25 loài | `pet-mountup`, `pet-beasts` |
| Bậc thú cưỡi | 1 | 3 (Thú Non, Chiến Thú, Thần Thú) | cấp 1-30 trên món | `pet-mountup` |

Thú cưng đúng bằng sàn (25), không có dư. Để một loài không qua duyệt mỹ thuật không làm vỡ sàn, mục 2.1.9 khai 3 loài **dự bị** (dữ liệu sẵn, chỉ vẽ khi cần). 20 thú cưỡi thường trực không tính 2 thú lễ hội vẫn đạt sàn, nên lễ hội trễ không làm vỡ sàn thú cưỡi.

### 0.3 Các ô ngoại hình và luật chung

| Ô (`SLOTS`) | Tên hiển thị | Nhóm | Chỉ số | Có hạn | Giao dịch | Nuôi/lên cấp | Cường hóa, khảm | Thứ tự vẽ (sau → trước) |
|---|---|---|---|---|---|---|---|---|
| `pet` | Thú cưng | ô riêng | theo cấp thú 1-50 | không (đồ bán bằng lượng là vĩnh viễn) | được, giữ `plv/pexp/love` | có (`pets`) | không | đi theo, vẽ riêng |
| `mask` | Mặt nạ | `FASHION_SLOTS` | nhỏ, có trần | bản rương/vòng quay 7 ngày, lễ hội 15 ngày | bản vĩnh viễn được | không | không | trên mặt |
| `cloak` | Áo choàng | `FASHION_SLOTS` | nhỏ, có trần | như trên | như trên | không | không | trong khung thân |
| `costume` | Trang phục | `FASHION_SLOTS` | nhỏ, có trần | như trên | như trên | không | không | thay màu áo quần |
| `mount` | Thú cưỡi | `FASHION_SLOTS` | `spd` + chỉ số theo cấp yêu cầu (ADR-05e-1) | như trên | bản vĩnh viễn được, giữ `ml/mx/ms` | có (`mountup`, chỉ bản vĩnh viễn) | không | dưới người cưỡi |
| `wing` | Pháp bảo | ô riêng (mới, `pet-mountup`) | cố định, có trần | không | được | không | không | sau thân, trước thú cưỡi |

Luật chung cho mọi hệ thống của mục này:

1. **Trạng thái nuôi nằm trên chính món đồ**: thú cưng `it.plv/pexp/love`, thú cưỡi `it.ml/mx/ms`. `it.exp` luôn là **hạn sử dụng** (ms), không bao giờ là EXP. Mọi chỗ sao chép/di chuyển món (giao dịch, kho, thư, đồ giữ hộ `c.pending`, chợ) chuyển nguyên object, không dựng lại từ id. Thiếu trường thì `cleanPet` / `cleanMount` đưa về mặc định khi tải.
2. **Lôi đài** (`map.def.arena`): mọi kỹ năng thú hồi máu/chakra/buff bị bỏ qua; không cho ăn, không tiến hóa (CLAUDE.md: mọi nguồn hồi máu mới phải bỏ qua bản đồ `arena`).
3. **Xu khóa** (`eco-bound`, G12 của đợt 3): phí trả cho hệ thống (ghép mảnh, tiến hóa, nhuộm) dùng `p.xuAll()` + `p.payXu(cost)`; đầu vào khóa thì đầu ra khóa (`it.b = 1`). Thưởng kiểu sự kiện (Tà Thú, boss) là đồ thường.
4. **Không bán chỉ số vượt trần** (P5): mọi chỉ số ngoại hình có mức chặn do `npm run check` kiểm; món Huyền thoại (`grade 4`) không bán ở cửa hàng (luật đã có trong `check-data.js`).
5. **Tên tự đặt** Hán-Việt/thuần Việt, không trùng tên vật phẩm/quái có sẵn (đã kiểm bằng `gddwork/lab/m05e/beasts-check.js` và `content/PLAN.md` mục 1).
6. **Hình vẽ 100% bằng code** (DESIGN_RULES mục 1-3, 7): viền tối `#1d1424`, ánh sáng trên-trái, không khử răng cưa, mỗi khung dựng một lần rồi cache.

### 0.4 Tài khoản thử và cổng chụp ảnh

Mỗi việc dùng server riêng: `PORT=<cổng> DATA_DIR=/tmp/ns-<tên> ADMINS=<tài khoản> node src/server/index.js`. Không dùng cổng 3000 hay server dùng chung.

| id | Cổng | Tài khoản | `DATA_DIR` |
|---|---|---|---|
| `pet-mountup` | 3633 | `mountqa1` | `/tmp/ns-mountup` |
| `pet-beasts` | 3760-3769 (bảng worker ở `content/60` mục 2) | `thuk01`, `thuma1`, `thumb1`, `thup1`-`thup3`, `thui01`, `thuu01`, `thuqa1` | `/tmp/ns-beasts-<worker>` |
| `pet-appearance-fx` | 3770 | `ngoaihinh1` | `/tmp/ns-appfx` |
| `pet-wardrobe` | 3771 | `tudo01` | `/tmp/ns-wardrobe` |
| `char-create-custom` | 3772 | `taonv01` | `/tmp/ns-charcc` |
| `char-rename` | 3773 | `doiten01`, `doiten02` | `/tmp/ns-rename` |

---

## 1. Hệ thống đã có: hiện trạng và phần cần nâng

### 1.1 `pet-fashion` — Thời trang 3 ô (P1, đặc sắc) — `done`

**Hiện trạng** (`src/shared/data/items/fashion.js`, `modules/fashion`, `modules/inventory`, `windows/inventory.js` tab "Thời trang", `render/sprites/fashion.js`):

| id | Tên | Ô | Mã hình | Bậc hiếm | Cấp | Chỉ số | Giá |
|---|---|---|---|---|---:|---|---|
| `mask_fox` | Mặt Nạ Hồ Ly | mask | fox | Hiếm | 10 | expPct 5, crit 1 | 40 lượng |
| `mask_oni` | Mặt Nạ Quỷ Đỏ | mask | oni | Sử thi | 30 | atk 60, crit 2 | 90 lượng |
| `mask_tengu` | Mặt Nạ Thiên Cẩu | mask | tengu | Huyền thoại | 50 | expPct 8, atk 100, dodge 2 | rương/vòng quay 7 ngày |
| `cloak_wind` | Áo Choàng Phong Vân | cloak | wind | Tốt | 10 | dodge 1, hp 150 | 30 lượng |
| `cloak_night` | Áo Choàng Dạ Ảnh | cloak | night | Hiếm | 20 | def 30, hpPct 3 | 60 lượng |
| `cloak_flame` | Áo Choàng Xích Diễm | cloak | flame | Sử thi | 40 | atk 80, hpPct 4 | 120 lượng |
| `cloak_snow` | Áo Choàng Tuyết Hồ | cloak | snow | Huyền thoại | 60 | def 80, hpPct 6, expPct 5 | rương/vòng quay 7 ngày |
| `costume_sakura` | Y Phục Anh Đào | costume | sakura | Hiếm | 1 | expPct 5, hp 100 | 50 lượng |
| `costume_ocean` | Hải Lam Y | costume | ocean | Hiếm | 1 | expPct 5, mp 100 | 50 lượng |
| `costume_shadow` | Dạ Hành Phục | costume | shadow | Sử thi | 20 | expPct 5, atk 40, dodge 2 | 100 lượng |
| `costume_dragon` | Long Bào Kim Tuyến | costume | dragon | Huyền thoại | 40 | expPct 10, hpPct 5, atk 80 | rương/vòng quay 7 ngày |

Quy tắc đang chạy: không cường hóa (`noUpgrade`), không lỗ khảm, độ hiếm cố định theo `grade`, trần `expPct ≤ 10, hpPct ≤ 8, crit/dodge ≤ 3`, giá ≤ 300 lượng (`check-data.js`); bản rương/vòng quay hạn 7 ngày (`FASHION_DAYS`), trọng số chọn theo grade 6/4/2/1; hết hạn tự gỡ lúc tải và mỗi 5 giây (`fashion.playerSecond`), báo "Hết hạn sử dụng: Mặt Nạ Thiên Cẩu."; đồ có hạn không giao dịch được. Ngoại hình gửi qua `look.mask/cloak/costume` (mã hình). Trang phục Sử thi trở lên lấp lánh (`fx.costumeSparkle`).

**Kiểm chứng hiện tại**: `npm test` phần "7f. Thời trang & thú cưỡi" 22 dòng ✔ (gồm chặn ô `__proto__`, giao dịch đồ có hạn, hết hạn mất chỉ số); `npm run check` sạch (`gddwork/lab/test1.log`, `check1.log`).

**Phần cần nâng** (không làm trong id này):

| Việc | id nhận |
|---|---|
| 10 món thời trang lễ hội (Áo Dài Xuân Thắm, Áo Choàng Hồng Tâm, Áo Tứ Thân Kinh Bắc, Kính Râm Sóng Bạc, Mặt Nạ Thỏ Ngọc, Mặt Nạ Bí Ngô Ma Trơi, Áo Choàng Dạ Bức, Y Phục Tuyết Đông + 2 thú cưỡi lễ hội), hạn 15 ngày | `evt-tet`, `evt-valentine`, `evt-304`, `evt-he`, `evt-trungthu`, `evt-halloween`, `evt-noel` (`content/50` mục 7-8) |
| Tủ ngoại hình, ẩn ô, nhuộm màu | `pet-wardrobe` |
| Hào quang khi mặc đủ bộ | `pet-appearance-fx` |
| Hàng "Ngoại trang" của cửa sổ Nhân Vật lên 6 ô (thêm `wing`) | `pet-mountup` |
| Xem thời trang/thú của người khác khi offline | `soc-inspect` |

### 1.2 `pet-mount` — Thú cưỡi (P1, P2) — `done`

**Hiện trạng**: 5 thú cưỡi ở ô `mount` (`FASHION`), tốc chạy `stats.spd` cộng **ngoài** trần 60% của trang bị + nội tại, tổng tối đa 100% (`Player.recalc`, `t.mountSpd`); server nhận tốc cũ thêm 2,5 giây sau khi tháo/hết hạn để bước đang chạy không bị kéo lại (`modules/movement`). Hình vẽ ở `render/sprites/mount.js` (`MOUNTS` 4 dáng bốn chân + 1 chim, `MOUNT_HEADS`, `mountEntry(type, anim, f, flash)`, `mountOffset(look)`, `ninjaHeight(look)`), bụi chân `fx.mountDust` khi chạy.

| id | Tên | Bậc hiếm | Cấp | Chỉ số cấp 1 | Nguồn | Hình pixel |
|---|---|---|---:|---|---|---|
| `mount_horse` | Ngựa Hồng Tông | Tốt | 10 | spd 15 | 50 lượng | ngựa nâu đỏ `#8a5634`, bụng be, bờm nâu đen, yên đỏ viền vàng, đuôi lông |
| `mount_wolf` | Sói Ngân Nguyệt | Hiếm | 20 | spd 20, atk 40 | 120 lượng | sói xám bạc bụng trắng, mắt lam `#4fc3f7`, đuôi xù, yên chàm |
| `mount_crane` | Hạc Tiên Vân Du | Sử thi | 35 | spd 25, dodge 2, mp 200 | 250 lượng | hạc trắng mào đỏ, cổ dài vươn trước, chân mảnh, yên lam |
| `mount_tiger` | Bạch Hổ Sơn Quân | Sử thi | 50 | spd 28, atk 90, crit 2 | 400 lượng | hổ trắng sọc tím than, mắt lam, đuôi dài, yên lục ngọc |
| `mount_qilin` | Kỳ Lân Hỏa Vân | Huyền thoại | 70 | spd 35, atk 150, hp 600 | rương/vòng quay 7 ngày | kỳ lân lục ngọc vảy vàng, bờm lửa cam, đuôi lửa, hào quang `#ff9e40` |

**Kiểm chứng hiện tại**: `npm test` (7f) có "5 thú cưỡi, đều cộng tốc chạy", "tốc chạy 0 → 35", "cưỡi thú chạy nhanh (bước 278px): server không kéo lại", "tháo thú cưỡi: bước đang chạy dở không bị kéo lại"; `check-data.js` kiểm `spd` 5-40, chỉ thú cưỡi có `spd`, ≥ 4 mã hình, giá ≤ 600 lượng.

**Phần cần nâng**: 17 loài mới → `pet-beasts`; cấp, tiến hóa, pháp bảo → `pet-mountup`; vệt theo thú → `pet-appearance-fx`. Sửa một dòng ở `03-doi-chieu.md` K11: mức chặn đúng là `spd` gốc 5-40 (không phải ≤ 35), sau nuôi ≤ 47, tổng tốc ≤ 100% (ADR-05e-1).

### 1.3 `pet-pets` — Thú cưng (P1, P4, đặc sắc) — `done`

**Hiện trạng** (`src/shared/data/pets.js`, `items/pets.js`, `modules/pets`, `Player.petAddExp/petTick/petDecay` ở `core/player.js`, `windows/pet.js` phím K, `render/petart.js`):

| Quy tắc | Giá trị |
|---|---|
| Cấp | 1-50, EXP cần `expNeed(lv) = 20·lv² + 80·lv` (tổng 1 → 50 = 906.500, đo ở `exp-sums.out.txt`) |
| EXP từ diệt quái | `10% × (1 + thân mật/100)` EXP gốc chủ nhận (thân mật 100 = 20%), vẫn nhận khi chủ đã tối đa cấp |
| Chỉ số | mỗi cấp +3% chỉ số cộng thẳng, +1,5% chỉ số phần trăm (`PET_PCT`); cấp 50 ≈ ×2,47 / ×1,735 |
| Thân mật | 0-100, bắt đầu 50, giảm 1 mỗi 10 phút mang theo; dưới 20 dỗi, không dùng kỹ năng |
| Kỹ năng | Tha Đồ `pick` (mỗi 1,5 giây nhặt 1 món trong `60 + 2·cấp`), Hồi Xuân `heal` (mỗi 4 giây khi chủ dưới 70% sinh lực hồi `1 + 0,06·(cấp − 1)`%) |
| Thức ăn | Bánh Gạo Linh Thú +300 EXP +3 (600 xu), Cá Khô Ngân Lân +2.500 +6 (4.000 xu), Linh Thú Đan +15.000 +15 (5 lượng) |
| Gói | `pet` (chỉ cập nhật `S.equip.pet`), `petAct { id, k: pick/heal/feed/lv }`, `look.pet` (mã hình) + `look.pl` (cấp thú) |
| Hình | 6 mã hình 20×18; cấp 20+ lấp lánh, 35+ quầng `#8fe3ff` + viền sáng, 50 quầng vàng `#ffe082` |

| id | Tên | Cấp | Chỉ số cấp 1 → cấp 50 | Kỹ năng | Nguồn | Hình pixel |
|---|---|---:|---|---|---|---|
| `pet_slime` | Slime Con | 1 | expPct 5 → 8,7; hp 100 → 247 | heal | 20 lượng | khối thạch tròn nảy, bóng sáng trên-trái |
| `pet_bunny` | Thỏ Ngọc | 10 | expPct 8 → 13,9; crit 2 → 3,5; hp 200 → 494 | pick | 40 lượng | thỏ trắng tai dài, nhảy cóc |
| `pet_bat` | Dơi Nhỏ | 30 | expPct 10 → 17,3; atk 40 → 99; dodge 2 → 3,5 | pick | 70 lượng | dơi tím than bay, vỗ cánh nhanh |
| `pet_fox` | Hồ Ly Con | 50 | expPct 15 → 26; atk 90 → 222; crit 3 → 5,2 | heal | 120 lượng | cáo cam đuôi bông chóp trắng |
| `pet_ghost` | Linh Hồn Nhỏ | 70 | expPct 18 → 31,2; mp 400 → 988; skillDmg 6 → 10,4 | heal | 160 lượng | hồn ma trắng lam bay, quầng `#9fe2ff` |
| `pet_dragon` | Rồng Con | 100 | expPct 25 → 43,4; atk 220 → 543; hp 1200 → 2964; crit 4 → 6,9 | pick, heal | Long Vương 25% | rồng lục ngọc bay, sừng và râu vàng |

**Kiểm chứng hiện tại**: `npm test` phần "0e. Thú cưng" (thế giới giả) và phần bot thú cưng (cho ăn, dỗi, kho, giao dịch giữ cấp 12 và thân mật 70, `/thu`) đều ✔; `check-data.js` kiểm hình `PET_ART`, icon, kỹ năng, `expPct` 1-25, thức ăn tăng dần.

**Phần cần nâng**: 19 loài + 6 kỹ năng → `pet-beasts`; hình thái 20/40 → `pet-mountup`. Lỗ hổng nhỏ ghi nhận khi đọc mã: `makeItem` (`items/equipment.js`) cho thú cưng nhận `rarity` từ tham số và `rollOptions` khi `r > 0`, nên lệnh admin `/item pet_x 1 3` sinh thú có dòng chỉ số phụ. Không có nguồn người chơi nào gọi với `rarity` cho thú (boss rơi `makeItem(id, 1)`), nên chưa hạ `done`; `pet-beasts` sửa bằng cách cho thú cưng có `grade` (mục 2.1.4) và `pet-mountup` đổi điều kiện thành `def.grade != null`.

---

## 2. Hệ thống mới

### 2.1 `pet-beasts` — 22 thú cưỡi, 25 thú cưng, 8 kỹ năng thú, ghép mảnh (P1, P4, P5) — M, giai đoạn 5

#### 2.1.1 Mục đích

Đạt sàn 1.0 (≥ 20 thú cưỡi, ≥ 25 thú cưng) và cho mỗi dải cấp 1-199 một mục tiêu sưu tầm: thú bán ở Tiệm Thuốc cho người mới, thú rơi từ boss vùng cho người cày, thú Huyền thoại ghép từ mảnh cho mục tiêu nhiều ngày có thể mua bán mảnh ở chợ (P4). Thú cưng hậu kỳ khác nhau bằng **kỹ năng hỗ trợ** (hồi chakra, hộ chủ, vồ quái chủ đang đánh, chiêu tài, giải hiệu ứng) chứ không bằng chỉ số áp đảo (P5).

#### 2.1.2 Luồng người chơi

1. Tiệm Thuốc tab "Thú cưng"/"Thời trang" bày thêm 9 thú cưng và 5 thú cưỡi mới, giá theo cấp.
2. Đánh boss Hạ Giới, boss vùng Thượng Giới, Tà Thú: hiếm khi rơi thẳng một thú (2-6%), thường rơi **mảnh** (`frag_*`).
3. Mảnh trong túi có dòng "Ghép: 87/100 · phí 300.000 xu"; đủ thì nút **Ghép** sáng → bấm → thú Huyền thoại vĩnh viễn vào túi, hiệu ứng nổ vàng, thông báo toàn máy chủ.
4. Mang thú cưng mới: cửa sổ Thú cưng (K) ghi kỹ năng mới với số theo cấp và dòng "Cấp 13: hồi 2,96% chakra"; ngoài thế giới thú hồi chakra (tia lam), hộ chủ (tia vàng + chữ "Hộ Chủ"), vồ quái (lao tới, số sát thương), chiêu tài (`+N xu`), thanh tâm (tia xanh lá).
5. Cưỡi thú mới: 3 dáng mới (thú bốn chân với 6 kiểu đầu mới, chim săn, pháp tọa bay không có bụi chân).

#### 2.1.3 Bảng thú cưỡi (22 loài)

Bậc hiếm theo `RARITY` (1 Tốt, 2 Hiếm, 3 Sử thi, 4 Huyền thoại). Cột "Cấp 30 Thần Thú" là chỉ số khi đã nuôi tối đa theo `pet-mountup` (cộng thẳng ×1,87×1,35, phần trăm ×1,435, `spd` +6,9, cộng thêm `hp 500, def 50, atk 60`); số do `gddwork/lab/m05e/beasts-check.js` tính. Thú cưỡi không có kỹ năng chủ động; cột "Đặc tính" ghi dáng và **vệt Thần Thú** (`pet-appearance-fx`, mục 2.3). Tiến hóa áp chung cho mọi thú cưỡi vĩnh viễn: Thú Non (cấp 1-10) → Chiến Thú (giáp ngực, khăn yên, mũ giáp) → Thần Thú (bờm/đuôi đổi màu `EVO_MANE`, hào quang `EVO_GLOW`, tia sáng dưới vó). Thú có hạn (rương 7 ngày, lễ hội 15 ngày) không nuôi được.

| # | id | Tên | Hiếm | Cấp | Chỉ số cấp 1 | Cấp 30 Thần Thú | Đặc tính (dáng · vệt) | Nguồn | Mô tả hình vẽ pixel |
|---:|---|---|---|---:|---|---|---|---|---|
| 1 | `mount_horse` | Ngựa Hồng Tông (cũ) | Tốt | 10 | spd 15 | spd 21,9, hp 500, def 50, atk 60 | bốn chân · `dust` | 50 lượng | như mục 1.2 |
| 2 | `mount_deer` | Hươu Sao Thanh Mộc | Tốt | 15 | spd 16, hp 150 | spd 22,9, hp 879, def 50, atk 60 | bốn chân · `leaf` | 70 lượng; rương/vòng quay 7 ngày | hươu nâu `#b5774a` đốm sao trắng trên lưng, gạc phân nhánh màu kem, tai ngang, mõm thon, đuôi cụt |
| 3 | `mount_wolf` | Sói Ngân Nguyệt (cũ) | Hiếm | 20 | spd 20, atk 40 | spd 26,9, atk 161, hp 500, def 50 | bốn chân · `frost` | 120 lượng | như mục 1.2 |
| 4 | `mount_ox` | Thanh Ngưu Thạch Giác | Hiếm | 30 | spd 20, def 40, hp 300 | spd 26,9, def 151, hp 1257, atk 60 | bốn chân · `stone` | 160 lượng; rương 7 ngày | trâu xanh đá `#3f7f8c`, sừng ngà cong lên-trước, đầu vuông to, mõm sáng, cổ dày, đuôi búi |
| 5 | `mount_lanxuan` | Lân Vàng Nghênh Xuân (lễ hội) | Huyền thoại | 30 | spd 30, atk 100, expPct 5 | (có hạn, không nuôi) | bốn chân · `petal` | đổi quà Hội Xuân, 15 ngày | lân múa vàng `#f2c230`, đầu lân có sừng đỏ, bờm tua đỏ-vàng, đuôi lửa (`content/50` mục 8.1) |
| 6 | `mount_tuanloc` | Tuần Lộc Đêm Đông (lễ hội) | Huyền thoại | 30 | spd 30, hp 500, dodge 2 | (có hạn, không nuôi) | bốn chân · `frost` | đổi quà Đêm Đông An Lành, 15 ngày | tuần lộc nâu `#8d6e63`, gạc lớn, mũi đỏ, khăn len đỏ trắng, đuôi xù |
| 7 | `mount_crane` | Hạc Tiên Vân Du (cũ) | Sử thi | 35 | spd 25, dodge 2, mp 200 | spd 31,9, dodge 2,9, mp 505, hp 500, def 50, atk 60 | chim · `cloud` | 250 lượng | như mục 1.2 |
| 8 | `mount_lotus` | Liên Hoa Bảo Tọa | Sử thi | 40 | spd 26, mp 400, hpPct 3 | spd 32,9, mp 1010, hpPct 4,3, hp 500, def 50, atk 60 | pháp tọa bay (không bụi) · `petal` | ghép 80 Cánh Sen Linh + 100.000 xu; rương 7 ngày | đài sen hồng `#f48fb1` 3 cánh trước 4 cánh sau, lá sen xanh đỡ dưới, đệm ngồi, nhấp nhô chậm |
| 9 | `mount_tiger` | Bạch Hổ Sơn Quân (cũ) | Sử thi | 50 | spd 28, atk 90, crit 2 | spd 34,9, atk 287, crit 2,9, hp 500, def 50 | bốn chân · `shadow` | 400 lượng | như mục 1.2 |
| 10 | `mount_lion` | Kim Sư Hống Nguyệt | Sử thi | 60 | spd 30, atk 110, hp 400 | spd 36,9, atk 338, hp 1510, def 50 | bốn chân · `gold` | 480 lượng; rương 7 ngày | sư tử vàng `#e0a83a`, bờm dày ôm đầu hai tông, miệng gầm mở, đuôi búi |
| 11 | `mount_qilin` | Kỳ Lân Hỏa Vân (cũ) | Huyền thoại | 70 | spd 35, atk 150, hp 600 | spd 41,9, atk 439, hp 2015, def 50 (chỉ khi có bản vĩnh viễn, xem câu hỏi mở 3) | bốn chân · `flame` | rương/vòng quay 7 ngày | như mục 1.2 |
| 12 | `mount_eagle` | Thiết Ưng Phá Vân | Sử thi | 90 | spd 33, atk 130, dodge 2 | spd 39,9, atk 388, dodge 2,9, hp 500, def 50 | chim săn · `feather` | Ma Thần, Thiên Ma 3% | ưng nâu sắt `#5d4a3a`, đầu trắng mỏ quặp vàng, cánh gập răng cưa, đuôi quạt 4 lông, chân móng vàng |
| 13 | `mount_cloud` | Tường Vân Tọa | Huyền thoại | 100 | spd 36, dodge 3, expPct 5, mp 600 | spd 42,9, dodge 4,3, expPct 7,2, mp 1515, hp 500, def 50, atk 60 | pháp tọa bay (không bụi) · `cloud` | ghép 100 Mảnh Tường Vân + 300.000 xu | 5 đốm mây trắng-lam xếp thành tòa, cuộn vàng hai đầu, vệt mây kéo sau khi chạy |
| 14 | `mount_turtle` | Huyền Quy Trấn Hải | Sử thi | 120 | spd 30, def 170, hp 1100 | spd 36,9, def 479, hp 3277, atk 60 | bốn chân (mai) · `water` | 520 lượng | rùa đen lục `#2f4f4f`, mai vòm vân lục giác phủ thân, đầu nhỏ vươn trước thấp ngang giữa mai, đuôi cụt |
| 15 | `mount_blazewolf` | Xích Diễm Lang | Sử thi | 130 | spd 34, atk 260, crit 2 | spd 40,9, atk 716, crit 2,9, hp 500, def 50 | bốn chân · `flame` | boss Xích Viêm 2% | sói đỏ `#c62828`, bờm và đuôi lửa vàng cam, quầng đỏ cả ở bậc 0 |
| 16 | `mount_frostdeer` | Băng Giác Tuyết Lộc | Sử thi | 140 | spd 34, hp 1300, dodge 2 | spd 40,9, hp 3782, dodge 2,9, def 50, atk 60 | bốn chân · `frost` | boss Băng Nguyên 2% | hươu trắng băng `#cfe8f7`, gạc pha lê lam, chấm sương trên lưng |
| 17 | `mount_firebird` | Hỏa Phượng Triều Dương | Huyền thoại | 145 | spd 38, atk 300, hpPct 4 | spd 44,9, atk 817, hpPct 5,7, hp 500, def 50 | chim săn · `flame` | ghép 120 Lông Hỏa Phượng + 800.000 xu | phượng cam `#ff7043`, mào 3 lông bập bùng, 3 dải đuôi lửa vàng-đỏ đổi hình theo khung |
| 18 | `mount_stonelion` | Thạch Sư Trấn Lăng | Sử thi | 150 | spd 35, def 200, hp 1400 | spd 41,9, def 555, hp 4034, atk 60 | bốn chân · `stone` | 600 lượng | sư tử đá xám `#9e9a8e` kiểu tượng giữ lăng, bờm cuộn xoắn, vết nứt tối, mắt ngọc lục |
| 19 | `mount_nightmare` | U Minh Dạ Mã | Sử thi | 160 | spd 36, atk 340, crit 2 | spd 42,9, atk 918, crit 2,9, hp 500, def 50 | bốn chân · `shadow` | boss U Minh 2% | ngựa đen tím `#2b2140`, bờm và đuôi lửa ma tím, mắt đỏ, quầng tím cả ở bậc 0 |
| 20 | `mount_skyhorse` | Thiên Mã Tinh Vân | Huyền thoại | 170 | spd 39, atk 380, hp 1500, dodge 2 | spd 45,9, atk 1019, hp 4287, dodge 2,9, def 50 | bốn chân có cánh · `star` | ghép 150 Bờm Thiên Mã + 1.000.000 xu | ngựa trắng tím nhạt `#f3f0ff`, đôi cánh gập trên sườn, bờm ánh sao, móng bạc |
| 21 | `mount_rhino` | Hắc Giác Ma Tê | Sử thi | 180 | spd 36, atk 300, def 260, hp 1700 | spd 42,9, atk 817, def 706, hp 4792 | bốn chân · `shadow` | boss Hỗn Độn 2% | tê giác đen xám `#3b3742`, sừng ngà cong trên mũi, cổ bọc giáp tối, tai nhỏ |
| 22 | `mount_golddrake` | Kim Long Ngự Thiên | Huyền thoại | 190 | spd 40, atk 450, hp 1600, crit 3 | spd 46,9, atk 1196, hp 4539, crit 4,3, def 50 | bốn chân (rồng) · `star` | ghép 200 Vảy Kim Long + 2.000.000 xu | rồng vàng `#f2b630`, 2 sừng ngả sau, bờm đỏ, hàm mở có răng, vảy lưng, đuôi dài có chóp lửa |

Ghi chú hình: thú cưỡi không được cao hơn yên đã khai (`lift` không đổi), đầu/mào cách mũi mặt nạ Thiên Cẩu ≥ 1px; gạc, sừng không vượt đỉnh đầu người cưỡi (DESIGN_RULES mục 3). Chi tiết lưới pixel ở `content/60` mục 9.1-9.2, khóa hình `lion` của lễ hội đã đổi thành `lanxuan` (`content/PLAN.md` mục 1, dòng 9).

#### 2.1.4 Bảng thú cưng (25 loài)

Bậc hiếm thú cưng hiện **chưa có trong dữ liệu**; tài liệu này thêm `grade` suy ra theo luật (không thêm cột vào `PETS`), tính ở `items/pets.js`:

| Luật (theo thứ tự) | Bậc |
|---|---|
| Có trong `FORGE` (ghép mảnh) hoặc là `pet_dragon` | 4 Huyền thoại |
| Không bán (`luong = 0`) | 3 Sử thi |
| Bán, cấp yêu cầu ≥ 50 | 2 Hiếm |
| Bán, cấp yêu cầu < 50 | 1 Tốt |

`grade` dùng cho màu tên, viền icon và `makeItem` (cùng nhánh `def.grade != null` với thời trang và pháp bảo: `r = grade`, `o = []`). Thú cưng cũ trong dữ liệu người chơi giữ `r` đang lưu (không ghi lại), vì `r` của thú không ảnh hưởng chỉ số.

Cột "Hình thái" là phụ kiện vẽ đè khi thú đạt **Trưởng Thành** (cấp 20, `b1`) và **Linh Thú** (cấp 40, `b2` gồm cả `b1`), chỉ đổi ngoại hình, không đổi chỉ số (`pet-mountup`). Cấp 50 = chỉ số cộng thẳng ×2,47, phần trăm ×1,735.

| # | id | Tên | Hiếm | Cấp | Chỉ số cấp 1 → cấp 50 | Kỹ năng | Hình thái b1 / b2 | Nguồn | Mô tả hình vẽ pixel (khung 20×18) |
|---:|---|---|---|---:|---|---|---|---|---|
| 1 | `pet_slime` | Slime Con (cũ) | Tốt | 1 | expPct 5 → 8,7; hp 100 → 247 | heal | nơ đỏ trên đỉnh / vương miện vàng 3 mũi ngọc đỏ | 20 lượng | khối thạch tròn nảy, bóng sáng trên-trái |
| 2 | `pet_squirrel` | Sóc Lông Tơ | Tốt | 5 | expPct 6 → 10,4; hp 120 → 296 | pick | khăn lá phong đỏ quanh cổ / hạt sồi hóa vàng, chóp đuôi phát sáng | 25 lượng | sóc hạt dẻ đuôi bông cong lên lưng, bụng kem, ôm hạt sồi trước ngực, nhảy cóc |
| 3 | `pet_bunny` | Thỏ Ngọc (cũ) | Tốt | 10 | expPct 8 → 13,9; crit 2 → 3,5; hp 200 → 494 | pick | khăn quàng đỏ bay khi chạy / vòng hoa đào trên gốc tai | 40 lượng | thỏ trắng tai dài, nhảy cóc |
| 4 | `pet_firefly` | Đom Đóm Lục Quang | Tốt | 15 | expPct 7 → 12,1; mp 150 → 370 | mana | bụng to hơn, 2 đốm sáng trôi sau đuôi / cánh ánh vàng, vương miện 3 điểm sáng | 35 lượng | đom đóm bay, đầu-ngực tím than, bụng phát sáng xanh vàng, cánh mỏng vỗ 4 khung, quầng `#c6ff6b` |
| 5 | `pet_goldtoad` | Kim Thiềm Nhỏ | Tốt | 20 | expPct 8 → 13,9; hp 220 → 543; def 20 → 49 | fortune | dây đỏ treo 2 đồng xu dưới cằm / mụn lưng hóa ngọc bích, thỏi vàng trên đầu | 60 lượng | cóc vàng thân dẹt, 2 mắt lồi, 4 mụn lưng, ngậm đồng xu lỗ vuông |
| 6 | `pet_calico` | Miêu Linh Tam Thể | Tốt | 25 | expPct 9 → 15,6; atk 35 → 86; crit 2 → 3,5 | pick, fortune | vòng cổ đỏ lục lạc lớn / đuôi thứ hai, chóp đuôi vàng | 80 lượng | mèo trắng mảng cam và đen, tai trái cam tai phải đen, mắt xanh lá, lục lạc vàng |
| 7 | `pet_bat` | Dơi Nhỏ (cũ) | Tốt | 30 | expPct 10 → 17,3; atk 40 → 99; dodge 2 → 3,5 | pick | dải ngực vàng, nanh trắng / viền cánh sáng tím, mắt đỏ | 70 lượng | dơi tím than bay, vỗ cánh nhanh |
| 8 | `pet_owl` | Cú Mèo Dạ Tuần | Tốt | 40 | expPct 12 → 20,8; mp 250 → 617; dodge 2 → 3,5 | mana | quặp cuộn thư dấu sáp đỏ / trăng lưỡi liềm sau đầu, chóp cánh bạc | 100 lượng | cú nâu xám bay, đĩa mặt kem, 2 mắt tròn hổ phách, chỏm tai, mỏ vàng |
| 9 | `pet_goldturtle` | Kim Quy Nhỏ | Sử thi | 45 | expPct 12 → 20,8; def 60 → 148; hp 500 → 1235 | ward | 3 ngọc đỏ dọc sống mai / vân sóng ngọc trên mai, vương miện ngọc | Lang Vương, Pharaoh Phục Sinh 5% | rùa con mai vàng vân chấm, đầu và chân ngọc lục, bước so le chậm |
| 10 | `pet_fox` | Hồ Ly Con (cũ) | Hiếm | 50 | expPct 15 → 26; atk 90 → 222; crit 3 → 5,2 | heal | đuôi thứ hai / ba đuôi chóp lam, chấm trán đỏ | 120 lượng; Cửu Vĩ Hồ 10% | cáo cam đuôi bông chóp trắng |
| 11 | `pet_panda` | Trúc Hùng Con | Hiếm | 60 | expPct 14 → 24,3; hp 650 → 1605; def 70 → 173 | ward, heal | nón lá kem / đai lưng đỏ võ sinh, ngọc bội lục | 140 lượng | gấu trúc tròn trắng đen, dải vai đen, quầng mắt đen, tai đen tròn |
| 12 | `pet_ghost` | Linh Hồn Nhỏ (cũ) | Hiếm | 70 | expPct 18 → 31,2; mp 400 → 988; skillDmg 6 → 10,4 | heal | khăn tam giác trắng trên trán / 2 đốm lửa hồn lam hai bên | 160 lượng; Thiên Ma 10% | hồn ma trắng lam bay, quầng `#9fe2ff` |
| 13 | `pet_papercrane` | Hạc Giấy Linh | Sử thi | 80 | expPct 16 → 27,8; mp 450 → 1112; skillDmg 5 → 8,7; dodge 2 → 3,5 | purge, mana | giấy hoa chấm hồng / mép cánh dát vàng, 2 điểm lấp lánh | Quỷ Vương 6% | hạc gấp giấy toàn mặt phẳng tam giác (không elip), 3 tông trắng-xám nếp gấp, cánh vỗ 4 khung, quầng `#e1f5fe` |
| 14 | `pet_monkey` | Hầu Nhi Kim Mao | Hiếm | 90 | expPct 18 → 31,2; atk 190 → 469; crit 3 → 5,2 | strike, pick | khăn đỏ quấn cổ / 2 vòng tay ngọc lục, mắt ánh vàng (không vẽ vòng đầu, mây, gậy) | 200 lượng | khỉ lông vàng kim, mặt hồng be, tai tròn, đuôi dài cong sau lưng |
| 15 | `pet_dragon` | Rồng Con (cũ) | Huyền thoại | 100 | expPct 25 → 43,4; atk 220 → 543; hp 1200 → 2964; crit 4 → 6,9 | pick, heal | sừng vàng dài thêm, 3 gai lưng / ngọc rồng vàng lơ lửng trước miệng | Long Vương 25% | rồng lục ngọc bay, sừng và râu vàng |
| 16 | `pet_vermilion` | Chu Tước Non | Sử thi | 110 | expPct 22 → 38,2; atk 240 → 593; skillDmg 5 → 8,7; hpPct 3 → 5,2 | rage, heal | dải đuôi dài thêm, chóp lửa vàng / mào 5 lông, vòng lửa sau đầu | Thiên Ma 6% | chim lửa đỏ bụng vàng bay, mào 3 lông cam, quầng `#ff8a65` |
| 17 | `pet_seahorse` | Hải Mã Bồng Lai | Hiếm | 120 | expPct 20 → 34,7; hp 1300 → 3211; mp 600 → 1482; hpPct 3 → 5,2 | mana, heal | ngọc trai ôm đuôi, vây lưng hồng / vương miện san hô, thêm bong bóng | 240 lượng | cá ngựa lam ngọc bay thẳng đứng, mõm ống, thân 4 đốt gờ sáng, đuôi cuộn, bong bóng |
| 18 | `pet_salamander` | Hỏa Tích Dịch | Sử thi | 130 | expPct 20 → 34,7; atk 300 → 741; crit 3 → 5,2; lifesteal 1 → 1,7 | strike, rage | lửa sống lưng cao 2px / 2 sừng đá đen, mắt trắng nóng, đốm dung nham | boss Xích Viêm 4% | kỳ nhông đỏ dung nham thân dài thấp, mắt vàng khe dọc, đuôi thon chóp lửa, 4 chân xòe |
| 19 | `pet_ermine` | Tuyết Điêu Nhi | Hiếm | 140 | expPct 20 → 34,7; hp 1500 → 3705; def 160 → 395; dodge 3 → 5,2 | ward, pick | khăn băng lam quấn cổ / bông tuyết lơ lửng đổi dạng theo khung | 280 lượng | chồn tuyết trắng thân dài mảnh, đuôi chóp đen, 3 điểm sương trên lưng |
| 20 | `pet_scarab` | Kim Giáp Trùng | Sử thi | 150 | expPct 22 → 38,2; def 200 → 494; hp 1600 → 3952; hpPct 4 → 6,9 | fortune, ward | 2 đường khảm lam ngọc / đĩa mặt trời 4 tia trên đầu, cánh hé lóe sáng | boss Hoàng Lăng 4% | bọ hung mai vàng kim loại, đầu đồng, sừng cong, 3 chân mảnh, ngọc lam trên đỉnh |
| 21 | `pet_lantern` | Đăng Linh U Minh | Hiếm | 160 | expPct 22 → 38,2; mp 900 → 2223; skillDmg 7 → 12,1; hp 1500 → 3705 | purge, mana | tua dài, 2 đốm lửa ma lam quay quanh / nan đèn tím, hoa văn xoáy vàng trên má | 340 lượng | đèn lồng giấy đỏ có mặt cười, thè lưỡi, chóp và đáy gỗ, quai xách, tua vàng, quầng `#ffb74d` |
| 22 | `pet_starcat` | Tinh Miêu Ngân Hà | Sử thi | 170 | expPct 23 → 39,9; atk 400 → 988; crit 4 → 6,9; dodge 3 → 5,2 | rage, pick, fortune | đuôi ngân hà, 3 sao bay theo / đôi cánh tinh vân tím, sao 4 cánh trên đầu | boss Tinh Hà 4% | mèo chàm điểm sao trắng vàng, dấu trăng khuyết trên trán, đuôi chóp sao, quầng `#9fa8da` |
| 23 | `pet_chaosimp` | Hắc Diệm Ma Đồng | Sử thi | 180 | expPct 23 → 39,9; atk 430 → 1062; skillDmg 7 → 12,1; lifesteal 2 → 3,5 | strike, rage | cặp cánh thứ hai, chóp đuôi sáng / 3 mảnh hỗn độn tím-lam quay quanh | boss Hỗn Độn 4% | tiểu quỷ tím đen tròn bay, 2 sừng ngà, một mắt đỏ to con ngươi vàng, miệng răng cưa, cánh dơi nhỏ |
| 24 | `pet_jadeqilin` | Ngọc Lân Nhi | Huyền thoại | 190 | expPct 25 → 43,4; hp 2200 → 5434; def 260 → 642; hpPct 5 → 8,7 | ward, heal, purge | 2 đám mây lành dưới vó / sừng dài thêm, vòng ngọc, bờm xanh ngọc | ghép 150 Mảnh Ngọc Lân + 1.500.000 xu | kỳ lân con ngọc bích vảy vàng, bờm lửa dọc gáy, 1 sừng vàng, đuôi búi lửa, quầng `#a7ffeb` |
| 25 | `pet_yinyangkoi` | Song Ngư Thái Cực | Huyền thoại | 195 | expPct 25 → 43,4; atk 470 → 1161; hp 2000 → 4940; crit 4 → 6,9 | fortune, heal, rage | vây đuôi dài như lụa / vòng bát quái đứt nét xoay quanh | ghép 200 Vảy Song Ngư + 2.000.000 xu | hai cá chép trắng đốm đỏ và đen đốm vàng lượn tròn quanh tâm, quầng trắng |

So sánh độ mạnh (đo bằng `beasts-check.js`, đối chiếu chỉ số trung bình của `content/00-foundation.md`): Tinh Miêu cấp 50 cộng 988 công ≈ 9,5% công người cấp 170 trung bình; Rồng Con cũ cấp 50 ≈ 15% ở cấp 100, nên thú hậu kỳ **không** lấn át thú cũ theo tỉ lệ.

#### 2.1.5 Kỹ năng thú cưng (8)

Chạy khi thú đi theo, thân mật ≥ `PET.loveLazy` (20), chủ không chết. `pick`, `heal` giữ ở `Player.petTick`; 6 kỹ năng mới chạy trong module `beasts` (móc `tick` mỗi 5 nhịp và móc `kill`), **không** sửa `petTick`.

| Khóa | Tên | Điều kiện | Hiệu quả | Hồi chiêu | Cấp 1 | Cấp 50 | Lôi đài |
|---|---|---|---|---|---|---|---|
| `pick` | Tha Đồ | có món của chủ/không chủ trong tầm | nhặt 1 món | 1,5 giây | tầm 62 | tầm 160 | không có đồ rơi |
| `heal` | Hồi Xuân | chủ dưới 70% sinh lực | hồi `1 + 0,06·(cấp − 1)`% sinh lực tối đa | 4 giây | 1% | 3,94% | bỏ qua |
| `mana` | Linh Tuyền | chủ dưới 50% chakra | hồi `2 + 0,08·(cấp − 1)`% chakra tối đa | 5 giây | 2% | 5,92% | bỏ qua |
| `ward` | Hộ Chủ | chủ dưới 90% sinh lực, chưa có buff | buff `pet_ward` +`6 + 0,2·(cấp − 1)`% phòng thủ 8 giây | 20 giây | +6% | +15,8% | bỏ qua |
| `rage` | Cuồng Nộ | có quái chủ đã đánh trong tầm 160, chưa có buff | buff `pet_rage` +`5 + 0,14·(cấp − 1)`% tấn công 10 giây | 25 giây | +5% | +11,9% | bỏ qua |
| `strike` | Trảo Kích | quái gần nhất **chủ đã gây sát thương** (`m.dmgBy.has(p.name)`) trong tầm `120 + cấp`, lệch cao ≤ 70 | đòn thường bằng `30 + 1,4·(cấp − 1)`% tấn công chủ (tính `combat.calc`, có chí mạng, không hút máu, không hiệu ứng) | 3 giây | 30%, tầm 121 | 98,6%, tầm 170 | không có quái |
| `fortune` | Chiêu Tài | mỗi lần chủ được tính hạ quái | `ch`% cơ hội nhận thêm `2 × cấp quái` xu (boss ×10) | không | 10% | 29,6% | không có quái |
| `purge` | Thanh Tâm | chủ đang có bỏng/độc/lạnh cóng/phá giáp/câm lặng | gọi `world.status.cleanse(p)` (không giải khống chế) | `8000 − 80·(cấp − 1)` ms | 8 giây | 4,08 giây | bỏ qua |

Quy tắc an toàn: thú **không bao giờ** đánh người chơi (P3, `03-doi-chieu.md` D18); `strike` chỉ đánh quái chủ đã chạm nên không cướp quái người khác (P4); `fortune` trả **xu thường** (loại "rơi đồ" theo G12). `purge` cần `cmb-status`; chưa có `world.status` thì kỹ năng tự bỏ qua (kiểm `world.status && p.sts`), thú mang `purge` vẫn dùng được kỹ năng còn lại.

Ước lượng ảnh hưởng `fortune`: người cấp 150 hạ ~600 quái/giờ, cấp 50 thú → 0,296 × 600 × 300 = ~53.000 xu/giờ thêm; nhỏ hơn xu quái rơi cùng giờ, ghi vào mô hình nguồn xu của `eco-economy-model`.

#### 2.1.6 Ghép mảnh

| Mảnh (id) | Tên | Nhận | Số mảnh | Phí xu | Rơi từ |
|---|---|---|---:|---:|---|
| `frag_lotus` | Cánh Sen Linh | `mount_lotus` | 80 | 100.000 | Tuyết Quái Vương, Tinh Thể Vương (2 × 40%), Hắc Viêm/Băng Phách Tà Thú (3 × 50%) |
| `frag_cloud` | Mảnh Tường Vân | `mount_cloud` | 100 | 300.000 | Ma Thần, Thiên Ma (2 × 40%), Long Vương (2 × 50%), Băng Phách (30%), Huyết Nguyệt Tà Thú (3 × 50%) |
| `frag_firebird` | Lông Hỏa Phượng | `mount_firebird` | 120 | 800.000 | boss vùng Bồng Lai, Xích Viêm (2 × 50%) |
| `frag_skyhorse` | Bờm Thiên Mã | `mount_skyhorse` | 150 | 1.000.000 | boss vùng Băng Nguyên, Hoàng Lăng (2 × 50%), Tinh Hà (50%) |
| `frag_jadeqilin` | Mảnh Ngọc Lân | `pet_jadeqilin` | 150 | 1.500.000 | boss vùng U Minh, Tinh Hà (2 × 50%) |
| `frag_golddrake` | Vảy Kim Long | `mount_golddrake` | 200 | 2.000.000 | boss vùng Hỗn Độn (2 × 50%), Thái Cực (3 × 50%) |
| `frag_yinyangkoi` | Vảy Song Ngư | `pet_yinyangkoi` | 200 | 2.000.000 | boss vùng Hỗn Độn (50%), Thái Cực (3 × 50%) |

Nối thêm (lô L1 của `content/PLAN.md`): boss Hạ Giới mới, Tà Thú 130/160/190 (`pve-tathu-199`) và Hung Tinh dải ≥ 128 (`pve-worldboss`) thêm dòng vào `BEAST_DROPS`, không sửa file khác.

Nhịp ghép: boss vùng hồi sinh 10 phút, mỗi lần hạ trung bình 1 mảnh → một người chiếm boss liên tục ~6 mảnh/giờ; Huyền thoại 150-200 mảnh là mục tiêu nhiều ngày, rút ngắn bằng mua mảnh ở chợ (`eco-market`). Mảnh xếp chồng 999, giá bán NPC 200 xu.

#### 2.1.7 Dữ liệu (file nào trong `src/shared/data`)

| File | Nội dung | Ghi chú |
|---|---|---|
| `beasts/mounts.js` (mới) | `MOUNT_ROWS` (15 dòng, cùng khuôn `FASHION` + phần tử thứ 9 là chú thích nguồn), `MOUNT_COLORS` | dữ liệu thuần, không `require` `items/monsters/maps/pets` |
| `beasts/pets.js` (mới) | `PET_ROWS` (19 dòng, khuôn `PETS` + phần tử thứ 8 là nguồn) | |
| `beasts/petskills.js` (mới) | `PET_SKILLS_X` (6 kỹ năng, trường theo cấp là hàm) | |
| `beasts/forge.js` (mới) | `FORGE` (7 dòng) | |
| `beasts/drops.js` (mới) | `BEAST_DROPS` (theo id boss), `REGION_BEAST_DROPS` (theo vùng) | |
| `pets.js` | `PETS.push(PET_ROWS)`, `Object.assign(PET_SKILLS, PET_SKILLS_X)`, `petClientInfo()` tổng quát (hàm theo cấp → mảng 0..maxLv) | kết quả `pick/heal` y hệt cũ |
| `items/fashion.js` | `FASHION.push(MOUNT_ROWS)`, màu icon, mô tả nguồn; `FASHION_POOL` chỉ món cấp ≤ 70 | tỉ lệ tương đối món cũ không đổi |
| `items/pets.js` | mô tả nguồn, `grade` suy ra (mục 2.1.4) | |
| `items/beasts.js` (mới) | vật phẩm mảnh `type: 'beastfrag'`, `forge: { to, n, xu }`, icon `{ k: 'frag', s, t }` | dựng sau `mountup.build()` |
| `items/index.js` | `beasts.build()` cuối chuỗi build | không đổi thứ tự khóa `ITEMS` cũ |
| `monsters.js` | khối cuối gộp `BEAST_DROPS` vào `m.drops` (dùng `hasOwnProperty`) | boss gia tộc, boss hang không đổi |
| `audio.js` | không thêm (kỹ năng thú dùng tiếng có sẵn `sfx('pick'/'level')`) | |

Thứ tự cố định khi gộp với các đặc tả khác: `content/PLAN.md` mục S1 ("mountup.build() → 40 → 60 beasts.build() → 50 seasonal.build()").

#### 2.1.8 Gói `{ t }` client ↔ server

| Chiều | Gói | Trường | Ghi chú |
|---|---|---|---|
| C → S | `useItem` | `{ slot }` | ô chứa mảnh `beastfrag` → `beasts.forge(p, slot, def)` |
| S → C | `data.pet.skills` | mỗi kỹ năng `{ name, every, below?, dur?, range?, xu?, boss?, keys?, <trường theo cấp>: number[51] }` | máy khách không nhận hàm |
| S → C (bản đồ) | `petAct` | `{ id, k: 'mana', n }`, `{ id, k: 'ward' }`, `{ id, k: 'rage' }`, `{ id, k: 'strike', x, y }`, `{ id, k: 'xu', n }`, `{ id, k: 'purge' }` | thêm vào `pick/heal/feed/lv` có sẵn |
| S → C (bản đồ) | `hit` | `{ a: 'p<id>', list: [['m<id>', dmg, crit, 0]], pet: 1 }` | số sát thương của `strike` |
| S → C (bản đồ) | `beastForge` | `{ id }` | nổ vàng ở người ghép |

#### 2.1.9 Module server, cửa sổ client, id DOM

- **Server**: module mới `src/server/modules/beasts/index.js` (`name: 'beasts'`, `init`, móc `tick` + `kill`, phương thức `forge`; export `runPetSkills`, `fortune` cho kiểm thử). `modules/index.js` thêm 1 dòng cuối mảng. `modules/inventory/index.js`: 1 dòng `useItem` (`beastfrag` → `world.mods.beasts.forge`), 1 khóa `sortInv` (`beastfrag: 9`). `modules/admin`: lệnh `/mac <mã trang bị>` (tạo và mặc ngay, cho chụp ảnh).
- **Client**: `render/sprites/mount-quad.js` (`MOUNTS_QUAD, MOUNT_HEADS_QUAD, QUAD_TAILS, QUAD_EXTRAS`), `render/sprites/mount-air.js` (`MOUNTS_AIR, MOUNT_BUILDERS` cho `raptor`, `glide`), `render/petart/{base,early,mid,late}.js`, `render/icons/beasts.js` (`drawFragIcon`), khối `MOUNT_ICONS` ở `render/icons/fashion.js`; export mới `mountHovers(look)` ở `render/sprites.js` (thêm export, không đổi chữ ký cũ). Cửa sổ: `windows/pet.js` (`petSkillText` 6 nhánh mới), `windows/inventory.js` (nút "Ghép", dòng tiến độ mảnh). `game/game.js`: 6 nhánh `onPetAct`, gói `beastForge`, không bụi chân cho pháp tọa.
- **Id DOM mới**: không có. Nút "Ghép" là `[data-act]` trong khung chi tiết vật phẩm sẵn có.
- **Thú cưng dự bị** (chỉ dùng khi một loài không qua duyệt mỹ thuật, giữ sàn 25): `pet_lotusfrog` Ếch Lá Sen (cấp 35, expPct 11, hp 400, `heal`, 90 lượng; ếch xanh ngồi trên lá sen tròn), `pet_kite` Diều Giấy Sáo (cấp 75, expPct 17, mp 500, dodge 2, `mana`, 180 lượng; diều cánh bướm bay có dây và đuôi tua), `pet_stonelion` Nghê Đá Con (cấp 135, expPct 20, def 170, hp 1500, `ward, pick`, 270 lượng; nghê đá xám bờm xoăn). Số đã nằm trong mức chặn mục 2.1.12.

#### 2.1.10 Bố cục điện thoại (844×390, 740×360, 667×375)

- Cửa sổ Thú cưng với thú 3 kỹ năng (`pet_starcat`) không tràn ngang: cột kỹ năng cuộn dọc trong `.pet-cols`, mỗi kỹ năng 2 dòng (mô tả + "Cấp N+1").
- Nút "Ghép" trong chi tiết vật phẩm cao ≥ 44px (`body.touch`), dòng tiến độ "87/100" chữ `b.good`/`b.bad` có sẵn.
- Chữ nổi kỹ năng thú (`Hộ Chủ`, `+N xu`) đặt ở `e.y - headH(e) - 2`, không đè thanh máu mục tiêu `#hud-target`.

#### 2.1.11 Chống gian lận và nhân bản đồ

1. `forge`: chặn `p.dead`, `p.trade`, chống bấm liên tục 500ms; kiểm `own(ITEMS, fg.to)`; kiểm **đủ mảnh, đủ xu, còn ô trống** trước khi trừ; trừ mảnh (`removeItemB`) trước, trừ xu sau, lỗi thì hoàn mảnh đúng số khóa/thường; đầu vào khóa → đầu ra khóa.
2. `slot` từ client qua `int()` và kẹp trong túi; ô trống hoặc không phải `beastfrag` thì bỏ qua (không lỗi).
3. Kỹ năng thú đọc `p.s`/`p.c` của server, không nhận số từ client; `strike` dùng `combat.calc` và `damageMonster` như kỹ năng chủ động (cùng thứ tự: trừ máu rồi gửi `hit`).
4. Thú cưỡi/thú cưng mới là món đồ thường: giao dịch/kho/thư chuyển nguyên object (giữ `plv/pexp/love`, `ml/mx/ms`, `b`).
5. Mảnh là `stack: 999`, gộp chồng qua `sameStack` (giữ tách chồng khóa và chồng thường).

#### 2.1.12 Mức chặn chỉ số (`tools/check-data.js`, `L` = cấp yêu cầu)

| Loại | Chỉ số được phép | Mức trần |
|---|---|---|
| Thú cưỡi | `spd, atk, def, hp, mp, crit, dodge, expPct, hpPct` | `spd` 5-40 (có sẵn); `atk ≤ max(150, 2,5L)`, `hp ≤ max(600, 10L)`, `def ≤ max(80, 1,5L)`, `mp ≤ max(400, 6L)`; `expPct ≤ 10, hpPct ≤ 8, crit/dodge ≤ 3` (có sẵn) |
| Thú cưng | `expPct, atk, def, hp, mp, crit, dodge, skillDmg, hpPct, lifesteal, hit` (không `spd`) | 2-4 chỉ số; `expPct` 1-25 (có sẵn); `atk ≤ max(100, 2,5L)`, `hp ≤ max(300, 12L)`, `def ≤ max(60, 1,5L)`, `mp ≤ max(400, 6L)`, `crit, dodge ≤ 5`, `skillDmg ≤ 8`, `hpPct ≤ 6`, `lifesteal ≤ 2`, `hit ≤ 3L` |
| Mảnh | `forge.to` tồn tại, `n` 50-300, `xu` 50.000-3.000.000, đích không bán ở cửa hàng, có ≥ 1 boss rơi | |
| Kỹ năng | mỗi khóa `PET_SKILLS` có nhánh `k === '<khóa>'` trong `petSkillText` và `m.k === '<k>'` trong `game.js` | |

Kết quả đo hiện tại (`beasts-check.out.txt`): cả 22 thú cưỡi và 25 thú cưng nằm trong mức chặn, không trùng id/tên với 306 vật phẩm và 65 quái hiện có.

#### 2.1.13 Tiêu chí chấp nhận

1. `node -e "const {ITEMS}=require('./src/shared/data/items');const v=Object.values(ITEMS);console.log(v.filter(i=>i.slot==='mount').length,v.filter(i=>i.slot==='pet').length)"` in số thú cưỡi ≥ 20 và thú cưng ≥ 25 (khi chưa có 2 thú lễ hội: 20 và 25).
2. `npm run check` không có dòng lỗi (sau pha 2 không còn cảnh báo `⚠ hình tạm`).
3. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`, có phần "Thú cưỡi & thú cưng mở rộng" đủ 13 ca đơn vị + 6 ca bot của `content/60` mục 7.3.
4. Số kỹ năng đúng tuyệt đối: `mana.pct(50) === 5.92`, `ward.v(50) === 15.8`, `rage.v(50) === 11.9`, `strike.pct(50) === 98.6`, `strike.r(50) === 170`, `fortune.ch(50) === 29.6`, `purge.every(50) === 4080`.
5. Ghép: 99 mảnh → từ chối, không mất mảnh, không mất xu; 100 mảnh → nhận thú, xu giảm đúng phí; mảnh khóa → thú nhận có `b === 1`; túi đầy → từ chối nguyên trạng.
6. `node tools/shot.js` mỗi thú cưỡi (đứng, chạy, nhảy, bậc 0/1/2 bằng `/cuoi 30 2`) và mỗi thú cưng (cấp 1/20/40 bằng `/thu`) ở 1280×720 và `mobile: true` in `OK no console errors`; Claude duyệt ảnh trước khi gộp.
7. `npm run test:perf` với nhân vật cưỡi `mount_golddrake` + mang `pet_yinyangkoi`: giữ ~60fps, CPU mỗi khung ≤ 8ms (DESIGN_RULES mục hiệu năng).

#### 2.1.14 Kiểm thử

- `tests/features/beasts.js` (mới): `beastUnitTests({ ok })` + `beastTest(a, { ok, sleep })`, bot riêng `beastqa` (thêm cuối `ADMINS` trong `tests/lib/harness.js`), gọi trong `tests/smoke.js` theo G9.
- `tests/features/pets.js`, `tests/features/fashion.js`: không sửa; phải vẫn đạt (kết quả `pick/heal` và 5 thú cưỡi cũ y hệt).
- `tests/e2e/e2e.js`: không thêm bước bắt buộc; chạy lại desktop + `MOBILE=1` sau khi gộp hình vẽ.

### 2.2 `pet-mountup` — Thú cưỡi nuôi và tiến hóa, thú cưng đổi hình thái, pháp bảo (P1, P4, đặc sắc) — S, giai đoạn 5

Nguồn chi tiết: `specs/mountup.md` + phụ lục điều phối đợt 3 (lô 4, song song `pvp-battlefield`). Mục này tóm theo khuôn và ghi phần chỉnh.

#### 2.2.1 Mục đích

Cho thú cưỡi một đường nuôi dài hạn (thức ăn, EXP khi cưỡi đi săn, 3 bậc đổi hình) để người chơi gắn bó với một con thú và khoe được tiến độ (P1, P4); thú cưng đổi hình thái ở cấp 20 và 40 để cấp thú có ý nghĩa nhìn thấy được; thêm ô pháp bảo sau lưng với chỉ số cố định có nguồn trong game (P5, `03-doi-chieu.md` D20).

#### 2.2.2 Luồng người chơi

1. Cưỡi một thú vĩnh viễn → phím **U** (hoặc tab "Thú cưỡi" trong cửa sổ Thú cưng, hoặc nút "Nuôi thú" trong chi tiết thú đang cưỡi) mở cửa sổ Thú Cưỡi: hình thú tỉ lệ 2, bậc, cấp, thanh EXP, chỉ số `a → b`.
2. Cưỡi đi diệt quái: thú nhận 20% EXP gốc của quái. Cho ăn Cỏ Thanh Vân / Đậu Kim Ngọc / Long Mạch Châu (nút "Cho ăn" và "x10").
3. Đạt cấp trần (10, 20) → khối "Tiến hóa" hiện yêu cầu Thú Hồn Thạch + xu → bấm "Tiến hóa" (chắc chắn thành công) → hiệu ứng nổ vàng, chữ "Tiến hóa: Chiến Thú!", hình đổi ngay; lên Thần Thú thì báo toàn máy chủ.
4. Thú cưng mang theo vượt cấp 20/40: thông báo "Sóc Lông Tơ tiến hóa thành hình thái Trưởng Thành!", hiệu ứng ở thú, hình đổi.
5. Mua/nhặt pháp bảo → mặc ở ô "Pháp bảo" (tab Thời trang) → cánh/vòng kiếm hiện sau lưng, kể cả khi cưỡi thú.

#### 2.2.3 Quy tắc và công thức

| Tham số (`src/shared/data/mountup.js`) | Giá trị |
|---|---|
| Bậc | 0 Thú Non (cấp ≤ 10), 1 Chiến Thú (≤ 20), 2 Thần Thú (≤ 30); bậc sau bắt đầu từ cấp trần bậc trước |
| EXP cần | `need(lv) = 100 + 60·lv²`; tổng bậc 0 = 18.000, bậc 1 = 132.100, bậc 2 = 366.100 (cả đường 516.200, `exp-sums.out.txt`) |
| EXP khi cưỡi | `killShare` 20% EXP gốc của quái chủ được tính hạ; đạt cấp trần thì EXP thừa bỏ |
| Chỉ số | cộng thẳng `×(1 + 0,03·(cấp − 1))·evoMul[bậc]` với `evoMul = [1; 1,15; 1,35]`; phần trăm `×(1 + 0,015·(cấp − 1))`; `spd + 0,1·(cấp − 1) + [0, 2, 4][bậc]`; cộng thêm `evoStats`: bậc 1 `hp 200, def 20`, bậc 2 `hp 500, def 50, atk 60` |
| Phí tiến hóa | bậc 0 → 1: 3 Thú Hồn Thạch + 50.000 xu; bậc 1 → 2: 8 đá + 200.000 xu |
| Thức ăn | Cỏ Thanh Vân +200 EXP (400 xu), Đậu Kim Ngọc +1.500 (2.500 xu), Long Mạch Châu +12.000 (5 lượng); số món cho hết từng bậc: Cỏ 90/661/1.831, Đậu 12/89/245, Châu 2/12/31 |
| Thú Hồn Thạch `mount_evo` | 10 lượng ở Tiệm Thuốc; boss Hạ Giới rơi 25-50%; bán NPC 500 xu |
| Thú cưng đổi hình thái | cấp 20 Trưởng Thành, cấp 40 Linh Thú (`PET_EVO`), **không** đổi chỉ số |
| Pháp bảo (ô `wing`) | Cánh Phong Vũ (Hiếm, cấp 30, hp 300, dodge 1, 150 lượng), Cánh Dạ Điệp (Sử thi, cấp 50, atk 80, hp 400, crit 1,5, 300 lượng), Kiếm Luân Hộ Thể (Sử thi, cấp 70, atk 150, def 60, skillDmg 3, 500 lượng), Cánh Hỏa Phượng (Huyền thoại, cấp 90, atk 220, hp 800, crit 2, expPct 5, chỉ Ma Thần 2% và Long Vương 4%); không cường hóa, không lỗ khảm, không vào rương |
| Không nuôi | thú có hạn (`it.exp > 0`), đang giao dịch, đã chết, đang ở lôi đài |

Ví dụ số khớp kiểm thử: Kỳ Lân cấp 30 bậc 2 = `atk 439, hp 2015, spd 41,9, def 50`; Bạch Hổ cấp 30 bậc 2 `crit 2,9`; Ngựa cấp 10 bậc 1 `spd 17,9, hp 200, def 20`. Tốc chạy thú cưỡi tối đa 46,9 (Kim Long), tổng tốc vẫn kẹp 100%.

#### 2.2.4 Dữ liệu

`src/shared/data/mountup.js` (mới: `MOUNT, MOUNT_FOOD, PET_EVO, WINGS`, `cleanMount`, `mountStatVal`, `mountClientInfo`), `items/mountup.js` (mới: thức ăn `type: 'mountfood'`, `mount_evo`, pháp bảo), `items/base.js` (`SLOTS` thêm `wing` ở cuối, `SLOT_NAMES.wing = 'Pháp bảo'`, không vào `GEAR_SLOTS`/`FASHION_SLOTS`), `items/index.js`, `items/shops.js` (Tiệm Thuốc), `items/equipment.js` (`makeItem` theo `def.grade != null`, `cleanMount`, nhánh thú cưỡi trong `itemStats`), `monsters.js` (`BOSS_DROPS` thêm `mount_evo`, `wing_phoenix`).

#### 2.2.5 Gói `{ t }`

| Chiều | Gói | Trường |
|---|---|---|
| C → S | `mountFeed` | `{ id: string ≤ 32, n: int 1-99 }` |
| C → S | `mountEvo` | `{}` |
| S → C | `data.mountup` | `mountClientInfo()` (bảng `need` 0..30, hệ số, phí, `petEvo`) |
| S → C | `mount` | `{ id, ml, mx, ms }` hoặc `{ id: null }`, gộp mỗi 5 nhịp |
| S → C (bản đồ) | `mountAct` | `{ id, k: 'lv' \| 'feed' \| 'evo', lv?, ms? }` |
| S → C | `mountEvoResult` | `{ ok, ms, name, stage }` |
| S → C (bản đồ) | `petAct` | thêm `{ id, k: 'evo', st }` |
| S → C | `me.look`, `pInfo` | thêm `look.wing` (mã hình), `look.ms` (bậc thú cưỡi, chỉ khi > 0) |

#### 2.2.6 Module server, cửa sổ client, id DOM

- **Server**: module mới `src/server/modules/mountup/index.js` (hành động `mountFeed`, `mountEvo`; móc `clientData`, `sanitize`, `kill`, `petLevel`, `tick`). Lõi sửa tối thiểu: `core/modules.js` thêm móc tĩnh `petLevel` cuối `STATIC_HOOKS`; `core/player.js` gọi `petLevel` trong `petAddExp`, `lookOf` thêm `wing` và `ms`; `core/gateway.js` `lookOf` màn chọn nhân vật bỏ `wing`, `ms`. `modules/inventory`: `useItem` nhánh `mountfood`, `sortInv`. `modules/admin`: `/cuoi <cấp> [bậc]`.
- **Client**: cửa sổ mới `ui/windows/mount.js` (`renderMount`, `mountSync`, `drawMountFig`), gộp vào `UI.prototype`, mục `mount` trong bảng `refresh()`; `windows/pet.js` thanh tab `.pm-tabs` + dòng "Hình thái"; `windows/inventory.js` ô `wing` (`STYLE_POS.wing = [3, 3]`), nút "Nuôi thú"; `core/input.js` `KeyU: 'w_mount'`; `core/store.js` `itemStats` nhánh thú cưỡi + `myMount()`; `ui/common.js` `STYLE_SLOTS` thêm `wing`; `render/sprites/mount.js` `mountEntry(type, anim, f, flash, stage = 0)` (thêm tham số tùy chọn, đúng quy tắc API), `EVO_MANE`, `EVO_GLOW`; `render/sprites/wing.js` (mới, `WINGS`, `drawWing`); `render/petart.js` trường `evo` cho mọi loài; icon `mountitem`, `wing`.
- **Id DOM mới**: không. Nút tab dùng `button.pm-tab[data-pmtab=pet|mount]`; không thêm nút vào `#hud-menu` (giữ 16 nút).

#### 2.2.7 Bố cục điện thoại

`.win-mount { width: min(640px, 96vw) }`; 844×390: sân khấu 120×104 bên trái, thông tin bên phải, hai cột "Chỉ số" và "Tiến hóa" cuộn dọc trong thân cửa sổ; nút "Cho ăn", "x10", "Tiến hóa", tab `.pm-tab` cao ≥ 44px trên `body.touch`; thông báo (`#toasts`) lên mép trên khi cửa sổ Thú Cưỡi mở (như Thú cưng). Hàng "Ngoại trang" của cửa sổ Nhân Vật 6 ô cùng nút "Danh hiệu", "Kinh mạch" không tràn ở 667×375.

#### 2.2.8 Chống gian lận và nhân bản đồ

1. Không nhận `slot/ml/ms` từ client; luôn thao tác `p.c.equip.mount`. `id` thức ăn qua `own(ITEMS, id)` và đúng `type === 'mountfood'` (chặn `__proto__`, `constructor`); `n` qua `int()` kẹp 1-99.
2. Trừ trước, cộng sau: bỏ từng món thức ăn rồi mới cộng EXP; dừng ngay khi đạt cấp trần (không nuốt món thừa). Tiến hóa kiểm đủ đá **và** xu trước khi trừ.
3. Chống bấm liên tục 250ms cho cả hai hành động; chặn khi `p.trade`, `p.dead`, lôi đài.
4. Dữ liệu hỏng: `itemStats` đọc cấp/bậc qua `mountLv/mountStage` (kẹp), nên `ml: 1e9` trong thư hay đồ giữ hộ không thổi phồng chỉ số; `cleanMount` kẹp `mx < need(ml)` ở `sanitize`.
5. Thú cưỡi có hạn không nuôi được: không thể đổ tài nguyên vào món sẽ mất, và đồ có hạn vốn không giao dịch được.

#### 2.2.9 Chỉnh so với đặc tả `specs/mountup.md`

| # | Chỗ trong đặc tả | Chỉnh |
|---|---|---|
| 1 | `mountEvo` bước 6-7 dùng `p.c.xu` | Dùng `p.xuAll()` để kiểm và `p.payXu(cost)` để trừ (phụ lục G12 đã nói, ghi lại cho rõ); cửa sổ khóa nút theo `xuAll()` của `core/store.js` |
| 2 | Mục 0 "Chưa có `tests/features/`" | Đã có (tái cấu trúc): kiểm thử ở `tests/features/mountup.js`, gọi theo G9 (đơn vị cuối `unitTests()`, bot trước `saveTest`), bot riêng `mountqa1` thay vì mượn `botadmin` |
| 3 | Mục 7 ca bot 1 `a.data.slots` | Giữ: gói `data` đã có `slots` và `slotNames` (`core/gamedata.js`), ô `wing` phải xuất hiện ở cả hai |
| 4 | Mục 4.6 c) thú cưng | `evo` bắt buộc cho **mọi** khóa `PET_ART`, kể cả 19 loài của `pet-beasts`; `check-data` đọc regex trên cả `petart.js` và `petart/*.js` |
| 5 | Vệt dưới vó bậc 2 (`drawAuraSparks`) | Giữ; vệt chạy theo `trail` của `pet-appearance-fx` là phần thêm, tắt được trong Cài đặt |
| 6 | `makeItem` đổi `def.fashion` thành `def.grade != null` | Áp cho cả thú cưng (khi `pet-beasts` thêm `grade`), sửa luôn lỗ hổng `rollOptions` cho thú ở mục 1.3 |
| 7 | Móc `charRenamed` (mục 2.6) | `mountup` không lưu tên người chơi nên không cần cài; ghi để người rà khỏi hỏi |

#### 2.2.10 Tiêu chí chấp nhận

1. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`, có phần "Thú cưỡi nuôi & tiến hóa, pháp bảo" với 11 ca đơn vị + 13 ca bot của đặc tả mục 7.
2. `itemStats({ id: 'mount_qilin', ml: 30, ms: 2 })` = `{ spd: 41.9, atk: 439, hp: 2015, def: 50 }`; `itemStats(makeItem('mount_qilin'))` = `{ spd: 35, atk: 150, hp: 600 }` (y hệt cũ).
3. Cho ăn 99 Đậu Kim Ngọc từ cấp 1: dùng đúng 12 món, dừng ở cấp 10; gửi 2 `mountEvo` liền khi đủ cho 1 lần: chỉ tăng 1 bậc, đá và xu trừ đúng 1 lần.
4. `mountFeed { id: '__proto__', n: 'abc' }`, `{ id: 'hp1' }`, `{ n: -9 }`, `mountEvo { x: 1 }`: server không lỗi, `ml/ms` không đổi.
5. `npm run check` không lỗi (khối "Thú cưỡi nuôi & pháp bảo": `MOUNT.cap` tăng dần, `EVO_MANE/EVO_GLOW` đủ khóa mọi thú cưỡi, `PET_ART` mỗi khóa có `evo`, pháp bảo không lỗ khảm).
6. `node tools/shot.js` cửa sổ Thú Cưỡi (bậc 0/1/2), cửa sổ Thú cưng (thú cấp 1/20/40), nhân vật đeo 4 pháp bảo đứng/chạy/cưỡi thú ở 1280×720 và `mobile: true` in `OK no console errors`.
7. `npm run test:ui` đạt (menu người chơi vẫn thấy hình người khác cưỡi Thần Thú có pháp bảo).

#### 2.2.11 Kiểm thử

`tests/features/mountup.js` (mới, `unitTests` + `wsTest`), `tests/features/pets.js` và `fashion.js` không đổi và phải đạt; `tests/e2e/e2e.js` bước thời trang + thú cưỡi giữ nguyên, chạy lại desktop + `MOBILE=1`.

### 2.3 `pet-appearance-fx` — Hào quang bộ thời trang, vệt theo thú cưỡi, dấu chân (P1) — C, giai đoạn 6

#### 2.3.1 Mục đích

Thưởng **thuần ngoại hình** cho người sưu tầm: mặc đủ một bộ thời trang thì có hào quang riêng, Thần Thú để lại vệt theo dáng thú, người mặc đủ bộ khi đi bộ để lại dấu chân. Không cộng chỉ số (P5), tắt được để giữ 60fps trên điện thoại (P2).

#### 2.3.2 Luồng người chơi

Mặc đủ các món của một bộ (bản vĩnh viễn hoặc có hạn đều được) → thông báo "Kích hoạt hào quang Bộ Xích Long" → quanh nhân vật có hạt bay theo màu bộ; cửa sổ Hành trang tab Thời trang có dòng "Bộ: Xích Long (3/3)". Cưỡi thú bậc Thần Thú (hoặc thú Huyền thoại) chạy trên mặt đất → vệt hạt sau vó theo loại thú. Cài đặt có lựa chọn "Hiệu ứng ngoại hình: Tất cả / Chỉ của tôi / Tắt".

#### 2.3.3 Quy tắc

| Bộ (`id`) | Tên | Món (đủ mới kích hoạt) | Hiệu ứng | Màu |
|---|---|---|---|---|
| `set_xichlong` | Bộ Xích Long | `mask_oni`, `cloak_flame`, `costume_dragon` | đốm lửa bay lên | `#ff7043` |
| `set_daanh` | Bộ Dạ Ảnh | `mask_tengu`, `cloak_night`, `costume_shadow` | khói tím trôi ngang | `#7d5bd0` |
| `set_anhdao` | Bộ Anh Đào | `mask_fox`, `cloak_wind`, `costume_sakura` | cánh hoa đào rơi | `#f48fb1` |
| `set_tuyethai` | Bộ Tuyết Hải | `cloak_snow`, `costume_ocean` | bông tuyết lam | `#b3e5fc` |
| `set_nghenhxuan` | Bộ Nghênh Xuân | `costume_aodaixuan`, `mount_lanxuan` | pháo giấy đỏ vàng | `#e5484d` |
| `set_hongtam` | Bộ Hồng Tâm | `cloak_hongtam`, `costume_sakura` | tim hồng nhỏ | `#ff8fb1` |
| `set_kinhbac` | Bộ Kinh Bắc | `costume_tuthan`, `cloak_wind` | lá sen xanh | `#43a047` |
| `set_bienxanh` | Bộ Biển Xanh | `mask_kinhram`, `costume_ocean` | bọt sóng trắng | `#e1f5fe` |
| `set_trangram` | Bộ Trăng Rằm | `mask_thongoc`, `mount_crane` | ánh trăng vàng nhạt | `#fff59d` |
| `set_hoatrang` | Bộ Hóa Trang | `mask_bingo`, `cloak_dabuc` | ma trơi cam | `#ff8f00` |
| `set_demdong` | Bộ Đêm Đông | `costume_tuyetdong`, `mount_tuanloc` | tuyết trắng | `#fafafa` |

- Xét bộ theo thứ tự bảng, bộ đầu tiên đủ món thì thắng (một người chỉ có một hào quang). Bộ có món lễ hội chưa có trong `ITEMS` thì bỏ qua (dữ liệu dùng `own(ITEMS, id)`), `check-data` cảnh báo (không lỗi) cho tới khi lễ hội vào.
- **Vệt thú cưỡi** (`trail`): khi `look.ms === 2` hoặc thú `grade 4`, đang chạy trên mặt đất (không áp cho pháp tọa bay: pháp tọa có vệt riêng trong hình). 10 loại: `dust` (bụi đất, mặc định), `leaf`, `petal`, `cloud`, `flame`, `frost`, `shadow`, `star`, `water`, `stone`, gán theo bảng mục 2.1.3.
- **Dấu chân**: người có bộ kích hoạt, không cưỡi thú, đang chạy: mỗi 0,25 giây một dấu 2×1px màu bộ trên mặt sàn, mờ dần trong 1,2 giây.
- **Ngân sách vẽ**: mỗi thực thể ≤ 12 hạt sống; toàn màn hình ≤ 240 hạt ngoại hình; chỉ vẽ cho 20 người gần nhất trong khung nhìn; mọi khung hạt dựng một lần rồi cache theo (loại, màu).

#### 2.3.4 Dữ liệu

`src/shared/data/items/fashion.js`: thêm `FASHION_SETS = [[id, tên, [id món], màu, kiểu hạt]]` và export. Bảng vệt theo mã hình thú (`TRAILS`) là cấu hình vẽ, đặt ở client `render/fx/trails.js` (giống `EVO_MANE` ở `sprites/mount.js`), `check-data` kiểm mọi mã hình thú cưỡi có khóa trong `TRAILS`.

#### 2.3.5 Gói `{ t }`

Không có hành động mới. `look.set` (id bộ đang kích hoạt, chỉ khi có) gửi trong `me.look`/`pInfo`, tính ở server bằng móc tĩnh mới `look(c, out)` (mục 2.3.6). Gói `data.fashionSets` (qua `clientData`) cho tên/màu bộ.

#### 2.3.6 Module server, cửa sổ client, id DOM

- **Móc `look(c, out)`** (dùng chung cho `pet-appearance-fx`, `pet-wardrobe`, `char-create-custom`): thêm `'look'` cuối `STATIC_HOOKS` ở `core/modules.js` + 1 dòng chú thích "`look(c, out)` sửa ngoại hình gửi người khác"; `lookOf(c)` ở `core/player.js` gọi `hooks.call('look', c, out)` ngay trước `return`. Tính năng nào trong ba cái làm trước thì thêm móc này (vùng Lõi server, sửa 2 dòng, ghi báo cáo); hai cái sau chỉ đăng ký móc.
- **Server**: thêm vào module `fashion` có sẵn móc `look(c, out)` tính `out.set`, và `clientData` gửi `fashionSets`. Không module mới.
- **Client**: `render/fx/trails.js` (mới, nội bộ vùng Hiệu ứng) + hàm công khai thêm vào `class FX`: `appearanceAura(x, y, setId, color)`, `trail(x, y, dir, kind)`, `footprint(x, y, color)` (thêm phương thức, không đổi cái cũ); `game/game.js` gọi một hàm `updateAppearanceFx(e, dt)` ở chỗ đang gọi `mountDust`/`costumeSparkle`; `windows/inventory.js` dòng "Bộ: <tên bộ> (đủ/tổng món)"; `windows/settings.js` lựa chọn "Hiệu ứng ngoại hình" (lưu `localStorage` như các cài đặt khác).
- **Id DOM mới**: không.

#### 2.3.7 Bố cục điện thoại

Cài đặt mặc định trên `body.touch` là "Chỉ của tôi"; lựa chọn là nhóm 3 nút cao 44px. Dòng "Bộ: Xích Long (3/3)" trong hành trang nằm ở hàng 4 của `.doll` cùng dòng tốc chạy (không làm cửa sổ co giãn), rút còn tên bộ khi màn ≤ 760px.

#### 2.3.8 Chống gian lận

Thuần hình: server tính `look.set` từ đồ đang mặc, client không gửi gì. Bộ không có chỉ số nên không có gì để khai thác.

#### 2.3.9 Tiêu chí chấp nhận

1. Kiểm thử đơn vị: nhân vật mặc `mask_oni + cloak_flame + costume_dragon` → `lookOf(c).set === 'set_xichlong'`; tháo 1 món → không có `set`; mặc cả hai bộ trùng món (`costume_ocean` + `cloak_snow` + `mask_kinhram`) → bộ đứng trước trong bảng thắng.
2. `npm run check` không lỗi: mọi món trong `FASHION_SETS` là thời trang/thú cưỡi có thật (trừ món lễ hội chưa vào: cảnh báo), mọi mã hình thú cưỡi có khóa trong `TRAILS`.
3. `npm run test:perf` với 20 nhân vật đều có bộ kích hoạt và cưỡi Thần Thú: ~60fps, CPU mỗi khung ≤ 8ms; tắt hiệu ứng thì không tạo hạt nào (`fx` đếm 0 hạt ngoại hình).
4. `node tools/shot.js` từng bộ và 10 loại vệt ở 1280×720 và `mobile: true` in `OK no console errors`.

#### 2.3.10 Kiểm thử

`tests/features/fashion.js` thêm `appearanceUnitTests()` (đơn vị, móc `look`) và gọi ở cuối `unitTests()` của `tests/smoke.js`; `tests/e2e/perf.js` thêm cờ môi trường `APPFX=1` dựng 20 bot có bộ + Thần Thú.

### 2.4 `pet-wardrobe` — Tủ ngoại hình và nhuộm màu (P1, P5) — C, giai đoạn 6

#### 2.4.1 Mục đích

Tách "trông thế nào" khỏi "mặc gì để có chỉ số" cho 3 ô thời trang: người chơi giữ được kiểu đã từng sở hữu, chọn hiển thị kiểu khác món đang mặc, ẩn mặt nạ, nhuộm áo choàng/trang phục. Tăng giá trị sưu tầm của thời trang lễ hội mà không bán thêm chỉ số (P5). Quyết định thay đổi bất biến "ngoại hình = món đang mặc" ghi ở ADR-05e-2.

#### 2.4.2 Luồng người chơi

1. Mặc một món thời trang (mask/cloak/costume) → kiểu đó tự vào tủ (bản vĩnh viễn: mãi mãi; bản có hạn: tới khi món hết hạn).
2. Hành trang tab Thời trang → nút "Tủ đồ" → cửa sổ Tủ Ngoại Hình: 3 tab ô, lưới kiểu đã có (icon, tên, nhãn "Đang mặc"/"Đang hiện"/"còn 3n").
3. Chọn một kiểu → "Hiển thị" (người khác thấy kiểu này, chỉ số vẫn theo món đang mặc); "Ẩn ô này"; "Theo đồ đang mặc".
4. Ô áo choàng/trang phục có hàng 9 ô màu: "Màu gốc" + 8 thuốc nhuộm; có thuốc thì "Nhuộm" (tiêu 1 lọ); đổi về màu gốc miễn phí.

#### 2.4.3 Quy tắc

| Quy tắc | Giá trị |
|---|---|
| Ô áp dụng | `mask`, `cloak`, `costume` (không áp cho `mount`, `wing`, `pet`: hình thú cưỡi/pháp bảo đổi độ cao và vùng đánh nhìn thấy, ADR-05e-2) |
| Mở khóa | khi món ở ô thời trang được mặc (móc `stats` của module, chạy trong `recalc`); hạn trong tủ = hạn món (0 = vĩnh viễn); hạn mới dài hơn thì ghi đè |
| Hiển thị | `c.style[slot]`: `null` theo đồ đang mặc, `'none'` ẩn ô, mã hình đã có trong tủ và chưa hết hạn |
| Hết hạn | kiểu có hạn hết hạn thì xóa khỏi tủ; nếu đang hiển thị thì về `null` (cùng nhịp `checkExpiry` 5 giây) |
| Thuốc nhuộm | 8 màu: Chu Sa `#c62828`, Hoàng Thổ `#c9a227`, Thanh Lục `#2e7d32`, Lam Ngọc `#1e88e5`, Tử Đinh `#6a1b9a` (30.000 xu mỗi lọ, Tiệm Thuốc tab Thời trang) và Kim Tuyến `#f2c230`, Ngân Hà `#3949ab`, Huyết Ngọc `#8e1b3a` (15 lượng mỗi lọ); 1 lọ nhuộm 1 ô, giữ tới khi nhuộm lại; về màu gốc miễn phí |
| Màu cấm | không màu `#000000` (DESIGN_RULES), độ sáng màu nhuộm trong 0,18-0,85 để viền tối `#1d1424` vẫn tách hình |
| Lôi đài, chiến trường | hiển thị như thường (thuần hình); không đổi kiểu khi đang trong trận (`p.match`, `p.bf`, `p.cw`) để tránh đổi hình giữa trận |

#### 2.4.4 Dữ liệu

`src/shared/data/wardrobe.js` (mới): `WARDROBE = { slots: ['mask', 'cloak', 'costume'], cd: 500 }`, `DYES = [[id, tên, màu, giá xu, giá lượng]]`. `items/consumables.js`: vật phẩm `dye_<id>` `type: 'dye'`, icon `{ k: 'dye', c }` (lọ thuốc nhuộm, vẽ ở `render/icons/items.js`, thêm `dye` vào `ICON_KINDS` của `check-data`). `items/shops.js`: thêm vào Tiệm Thuốc. Trên nhân vật: `c.wardrobe = { mask: { <look>: hạn ms|0 }, cloak: {}, costume: {} }`, `c.style = { mask, cloak, costume }`, `c.dye = { cloak: 0-8, costume: 0-8 }`.

#### 2.4.5 Gói `{ t }`

| Chiều | Gói | Trường |
|---|---|---|
| C → S | `wardrobeOpen` | `{}` → server gửi `wardrobe` |
| C → S | `styleSet` | `{ slot: 'mask'\|'cloak'\|'costume', look: string\|null }` (`'none'` = ẩn) |
| C → S | `dyeApply` | `{ slot: 'cloak'\|'costume', dye: string }` (id thuốc, `''` = màu gốc) |
| S → C | `wardrobe` | `{ owned: { mask: { look: hạn } }, style, dye }` |
| S → C | `me.look`, `pInfo` | `look.mask/cloak/costume` đã áp kiểu hiển thị (`'none'` thì không gửi khóa), `look.dy = [dye áo choàng, dye trang phục]` khi khác 0 |

#### 2.4.6 Module server, cửa sổ client, id DOM

- **Server**: module mới `src/server/modules/wardrobe/index.js` (`actions: wardrobeOpen, styleSet, dyeApply`; móc `stats` mở khóa, `sanitize` dọn `c.wardrobe/style/dye`, `look` áp kiểu và màu, `playerSecond` dọn hạn mỗi 5 giây, `clientData` gửi `DYES`). Thêm dòng cuối `modules/index.js`.
- **Client**: cửa sổ mới `ui/windows/wardrobe.js` (`renderWardrobe`), gộp `UI.prototype`, mục `wardrobe` trong `refresh()`; `windows/inventory.js` nút "Tủ đồ" `[data-act=wardrobe]` ở tab Thời trang; `render/sprites/fashion.js` nhận `look.dy` (đổi màu chính `c`/`o`, tông sáng/tối bằng `sh()`, khóa cache thêm màu nhuộm).
- **Id DOM mới**: không (cửa sổ dùng `.win-wardrobe`, tab `[data-wdslot]`).

#### 2.4.7 Bố cục điện thoại

844×390: sân khấu xem trước 96×96 bên trái (nhân vật tỉ lệ 2, không cưỡi thú), lưới kiểu 4 cột bên phải cuộn dọc, ô kiểu 48×48; hàng màu nhuộm 9 ô 36px + nút "Nhuộm" 44px; 3 tab ô cao 44px.

#### 2.4.8 Chống gian lận

1. `slot` phải thuộc `WARDROBE.slots` (`own`), `look` phải là khóa riêng của `c.wardrobe[slot]` và chưa hết hạn (không tin danh sách client gửi); `dye` phải là id trong `DYES` và có vật phẩm trong túi.
2. Trừ lọ thuốc trước khi ghi màu; chống bấm 500ms; chặn khi `p.trade`, `p.dead`, đang trong trận.
3. Tủ chỉ chứa mã hình, không chứa món: không thể lấy lại món hay chỉ số từ tủ, không nhân bản được.
4. `sanitize` kẹp mỗi ô tủ ≤ 200 kiểu, bỏ khóa không có trong mã hình thời trang hiện có, bỏ `__proto__`.

#### 2.4.9 Tiêu chí chấp nhận

1. Bot: mặc `mask_fox` → `wardrobe.owned.mask.fox === 0`; tháo, mặc `mask_oni`, `styleSet { slot: 'mask', look: 'fox' }` → người chơi thứ hai thấy `look.mask === 'fox'`, chỉ số vẫn là của `mask_oni`.
2. `styleSet` với kiểu chưa có, `slot: '__proto__'`, `slot: 'mount'` → bị bỏ qua, không lỗi.
3. Món 7 ngày (`/item mask_tengu 1 0 7`, `/hethan 2`) → sau khi hết hạn kiểu `tengu` biến khỏi tủ, ô đang hiển thị về `null`.
4. Nhuộm: có 1 `dye_lamngoc` → `dyeApply` → túi còn 0, `look.dy[0] === <chỉ số màu>`; không có thuốc → từ chối, màu không đổi.
5. `npm test` đạt, `npm run check` không lỗi, `node tools/shot.js` cửa sổ Tủ Ngoại Hình + nhân vật nhuộm 8 màu ở 1280×720 và `mobile: true` in `OK no console errors`.

#### 2.4.10 Kiểm thử

`tests/features/wardrobe.js` (mới): `wardrobeUnitTests()` (sanitize, móc `look`, hết hạn) + `wardrobeTest(a, b)` (2 bot `tudo01`, `tudo02`), gọi trong `tests/smoke.js` theo G9.

### 2.5 `char-create-custom` — Tùy chọn ngoại hình khi tạo nhân vật (P1, P2) — C, giai đoạn 1

#### 2.5.1 Mục đích

Hiện ngoại hình nhân vật suy ra từ băm tên (`render/sprites.js`: kiểu tóc theo giới 4 loại, 8 màu tóc, 6 màu mắt, 3 màu da, nam có khăn che mặt 1/3 số tên). Người chơi không chọn được và đổi tên là đổi mặt. Tính năng cho chọn ngay ở màn tạo nhân vật, có nút "Ngẫu nhiên", và đổi lại sau bằng Gương Hóa Dung. Nhân vật cũ không chọn gì thì giữ đúng mặt cũ.

#### 2.5.2 Luồng người chơi

1. Màn tạo nhân vật: dưới ô tên và nút giới tính có hàng "Ngoại hình" gồm 5 bộ chọn ◀ ▶: Kiểu tóc (4 theo giới), Màu tóc (8), Màu mắt (6), Màu da (3), Khăn che mặt (Có/Không, chỉ nam) + nút "Ngẫu nhiên". Hình xem trước lớn đổi ngay.
2. Bấm "Tạo" → nhân vật mang đúng ngoại hình đã chọn ở màn chọn nhân vật và trong game.
3. Trong game: dùng Gương Hóa Dung (Tiệm Thuốc, 30 lượng) → cửa sổ Hóa Dung cùng 5 bộ chọn → "Xác nhận" tiêu 1 gương.

#### 2.5.3 Quy tắc

| Trường `c.ap` | Miền | Mặc định khi thiếu |
|---|---|---|
| `h` kiểu tóc | 0-3 (nam: spiky, neat, topknot, wild; nữ: long, bun, pony, bob) | theo băm tên như hiện tại |
| `hc` màu tóc | 0-7 (`HAIR`) | băm tên |
| `ir` màu mắt | 0-5 (`IRIS`) | băm tên |
| `sk` màu da | 0-2 (`SKIN`) | băm tên |
| `fm` khăn che mặt | 0-1, nữ luôn 0 | băm tên |

Không có `c.ap` thì máy khách vẽ như cũ (không đổi mặt nhân vật đang có). Đổi giới tính không có trong tính năng này. Gương Hóa Dung không giới hạn lượt, giá 30 lượng (thuần ngoại hình, nguồn hút lượng nhỏ).

#### 2.5.4 Dữ liệu

`src/shared/constants.js`: `APPEARANCE = { h: 4, hc: 8, ir: 6, sk: 3, fm: 2 }` (số lựa chọn mỗi trường, máy khách đọc qua `data`). `items/consumables.js`: `mirror_hoadung` Gương Hóa Dung `type: 'appearance'`, icon `{ k: 'mirror' }` (gương đồng tròn cán gỗ, vẽ ở `render/icons/items.js`, thêm `mirror` vào `ICON_KINDS`), bán ở Tiệm Thuốc bằng lượng.

#### 2.5.5 Gói `{ t }`

| Chiều | Gói | Trường |
|---|---|---|
| C → S | `createChar` | thêm `ap: [h, hc, ir, sk, fm]` (tùy chọn) |
| C → S | `apSet` | `{ ap: [h, hc, ir, sk, fm] }` (cần 1 `mirror_hoadung` trong túi) |
| S → C | `chars` (màn chọn), `me.look`, `pInfo` | `look.ap = [h, hc, ir, sk, fm]` khi nhân vật có `c.ap` |

#### 2.5.6 Module server, cửa sổ client, id DOM

- **Server**: `core/gateway.js` `createChar` nhận và kiểm `ap` (vùng Lõi server, ghi báo cáo); `core/player.js` `newChar(name, cls, gender, ap)` thêm tham số tùy chọn; móc `look` (mục 2.3.6) thêm `out.ap`; module mới nhỏ `src/server/modules/appearance/index.js` (`actions: { apSet }`, móc `sanitize` kẹp `c.ap`, `look`, `clientData`). `useItem` của `mirror_hoadung` chỉ báo `openUi { ui: 'appearance' }` (1 dòng ở `modules/inventory`).
- **Client**: `render/sprites.js` dùng `look.ap` nếu có (thay các nhánh `(hh >>> n) % k`); `main.js` + `css/screens.css` hàng chọn ở màn tạo; cửa sổ mới `ui/windows/appearance.js` (`renderAppearance`).
- **Id DOM mới**: `#cc-look` (khung hàng chọn ở màn tạo), các nút trong đó dùng `[data-ap=h|hc|ir|sk|fm]` và `[data-apdir=-1|1]`, nút `#cc-random`. Không đổi `#char-create, #in-cname, #in-gender, #btn-create` và `.class-card`.

#### 2.5.7 Bố cục điện thoại

844×390 màn tạo: hàng "Ngoại hình" là 5 ô chọn xếp 1 hàng (mỗi ô: nhãn nhỏ trên, ◀ màu/tên ▶ dưới, nút 44×44), nút "Ngẫu nhiên" cuối hàng; khi màn rộng ≤ 700px chuyển thành 2 hàng (3 + 2 + nút). Thẻ phái và nút "Tạo" không bị đẩy khỏi màn (kiểm bằng ảnh `screen: 'create'`, `mobile: true`).

#### 2.5.8 Chống gian lận

`ap` phải là mảng đúng 5 số nguyên trong miền; sai một phần tử thì bỏ cả `ap` (dùng băm tên), không lỗi; nữ ép `fm = 0`. `apSet` trừ gương trước khi ghi, chống bấm 500ms, chặn khi đang giao dịch/trận. Thuần hình, không chỉ số.

#### 2.5.9 Tiêu chí chấp nhận

1. Bot tạo nhân vật với `ap: [2, 5, 1, 0, 1]` → gói `chars` có `look.ap` đúng; tạo với `ap: [9, 'x']` → nhân vật vẫn tạo được, không có `look.ap`.
2. Nhân vật cũ (không có `c.ap`): ảnh chụp trước/sau khi gộp giống nhau từng điểm ảnh (`tools/shot.js` cùng tài khoản, so bằng ảnh baseline `dev-baseline-shots` nếu đã có, nếu chưa thì so mắt).
3. `apSet` khi không có gương → từ chối; có gương → `look.ap` đổi, gương còn 0.
4. `node tools/shot.js` `screen: 'create'` desktop và `mobile: true` in `OK no console errors`; `npm test`, `npm run check` đạt; `npm run test:e2e` (tạo nhân vật) đạt cả `MOBILE=1`.

#### 2.5.10 Kiểm thử

`tests/features/account.js` thêm ca tạo nhân vật có `ap` (đúng/sai miền); `tests/features/appearance.js` (mới) cho `apSet`; `tests/e2e/e2e.js` bấm "Ngẫu nhiên" 1 lần ở màn tạo.

### 2.6 `char-rename` — Đổi tên nhân vật (P4, P5) — C, giai đoạn 8 (id mới)

#### 2.6.1 Mục đích

Cho người chơi sửa tên đặt vội lúc mới chơi mà không mất nhân vật, đồng thời giữ an toàn cho mọi bảng đang dùng tên làm khóa và chống mạo danh. Quyết định cho phép đổi tên ghi ở ADR-05e-3.

#### 2.6.2 Luồng người chơi

Mua Thẻ Cải Danh (Tiệm Thuốc, 100 lượng) → dùng → cửa sổ "Cải Danh" nhập tên mới (cùng luật tên lúc tạo), hiện điều kiện → "Đổi tên" → hỏi xác nhận bằng `this.ask` → thành công: tên trên đầu đổi ngay, kênh thế giới báo "A nay đổi tên thành B", bạn bè/gia tộc thấy tên mới.

#### 2.6.3 Quy tắc

| Quy tắc | Giá trị |
|---|---|
| Điều kiện | không trong nhóm, giao dịch, lôi đài/chiến trường/chiến gia tộc/phó bản, không chết; lần đổi trước cách ≥ 30 ngày (`c.renamedAt`) |
| Tên mới | cùng bộ kiểm tra của `createChar` (độ dài, ký tự, từ cấm, không trùng tên đang có), không trùng tên **đã giữ chỗ** |
| Giữ chỗ tên cũ | 30 ngày trong `db.meta.oldNames[tên cũ] = { to: tên mới, until }`, chỉ chính chủ lấy lại được |
| Cập nhật | khóa `db.chars`, danh sách nhân vật của tài khoản, `world.byName`, danh sách bạn của mọi nhân vật có tên cũ, gia tộc (`members` khóa + `name`, `leader`), `db.meta.arenaPairs` (khóa chứa tên), bảng xếp hạng (tính lại), lời mời đang treo (hủy); thư cũ giữ nguyên chữ `from` (lịch sử) |
| Thẻ | `card_rename` `type: 'rename'`, không giao dịch được (khóa), 100 lượng |

#### 2.6.4 Dữ liệu

`items/consumables.js` (`card_rename`, icon `card` có sẵn), `items/shops.js`, `src/shared/constants.js` (`RENAME = { cdDays: 30, holdDays: 30 }`).

#### 2.6.5 Gói `{ t }`

| Chiều | Gói | Trường |
|---|---|---|
| C → S | `charRename` | `{ name: string }` |
| S → C | `renameResult` | `{ ok, msg, name? }` |
| S → C (bản đồ) | `pInfo` | tên mới |

#### 2.6.6 Module server, cửa sổ client, id DOM

- **Server**: module mới `src/server/modules/rename/index.js`; dùng hàm kiểm tên xuất từ `core/gateway.js` (thêm export, không đổi hành vi), `db.renameChar(oldName, newName)` mới ở `services/db.js` (đổi khóa nguyên tử, ghi `dirty`; nếu `ops-persist-shard` đã chia file theo nhân vật thì đổi tên file theo cùng thao tác). Mỗi module giữ dữ liệu theo tên (`friends`, `clan`, `arena`, `rank`) nhận móc thế giới mới `charRenamed(oldName, newName)` (thêm cuối `WORLD_HOOKS`) và tự cập nhật phần của mình, giống `charDeleted`.
- **Client**: cửa sổ mới `ui/windows/rename.js`; xác nhận bằng `this.ask` (`ui-ask-dialog`).
- **Id DOM mới**: không.

#### 2.6.7 Bố cục điện thoại

Cửa sổ nhỏ: ô nhập tên cao 44px, dòng điều kiện, nút "Đổi tên" 44px; bàn phím ảo mở không che nút (cửa sổ neo trên).

#### 2.6.8 Chống gian lận

1. Kiểm mọi điều kiện **trước** khi trừ thẻ; trừ thẻ và đổi khóa trong cùng một lượt xử lý đồng bộ (không `await` giữa chừng), lỗi giữa chừng thì hoàn tác toàn bộ.
2. Hai người đổi sang cùng một tên cùng lúc: lượt sau thấy tên đã có trong `db.chars` và bị từ chối (Node xử lý tuần tự).
3. Chống mạo danh: tên cũ giữ chỗ 30 ngày; tên mới không được trùng tên đang giữ chỗ.
4. Mọi tra cứu theo tên dùng `own()`/`Map`, tên `__proto__` đã bị luật tên chặn từ trước.

#### 2.6.9 Tiêu chí chấp nhận

1. Bot `doiten01` (có bạn `doiten02`, cùng gia tộc, có trận lôi đài tính điểm với nhau) đổi tên → `doiten02` thấy tên mới trong danh sách bạn và gia tộc; `db.meta.arenaPairs` không còn khóa tên cũ; `world.mail.charOf(tên mới)` trả đúng nhân vật; `charOf(tên cũ)` trả `null`.
2. Đổi lần hai trong 30 ngày → từ chối, thẻ còn nguyên; người khác tạo nhân vật trùng tên cũ trong 30 ngày → từ chối.
3. Khởi động lại server (`reloadTest`) → nhân vật tải bằng tên mới, không còn bản tên cũ.
4. `npm test` đạt; `npm run test:ui` đạt (menu người chơi, lời mời dùng tên mới).

#### 2.6.10 Kiểm thử

`tests/features/rename.js` (mới, 2 bot), `tests/features/persistence.js` thêm ca tải lại sau đổi tên.

---

## 3. Thứ tự làm và giao việc

| Bước | id | Phụ thuộc cứng | Giao | Ghi chú |
|---|---|---|---|---|
| 1 | `char-create-custom` | `core-characters` | opencode (server + màn tạo), Claude duyệt ảnh | thêm móc `look` (mục 2.3.6) |
| 2 | `pet-mountup` | `eco-bound` | opencode theo `specs/mountup.md` lô 4; hình thú/pháp bảo: opencode vẽ nháp + Claude duyệt | sau lô 3 đợt 3 (vị trí chèn) |
| 3 | `pet-beasts` | `eco-bound`, `core-levelcap-199` | K, S, U: opencode; MA, MB, P1-P3, I: opencode vẽ nháp + Claude duyệt (`content/60` mục 2) | làm **sau** `pet-mountup` nếu cùng giai đoạn (dùng `stage`, `cleanMount`); chạy được khi chưa có `pet-mountup` (đặc tả có nhánh "nếu có") |
| 4 | `pet-appearance-fx` | `pet-mountup` | Claude (thẩm mỹ, hiệu năng) | sau lễ hội thì bộ lễ hội tự bật |
| 5 | `pet-wardrobe` | `pet-fashion` | opencode, Claude rà kinh tế thuốc nhuộm | |
| 6 | `char-rename` | `core-characters`, `ops-persist-shard` | Claude (logic khóa dữ liệu) | giai đoạn 8 |

`pet-beasts` mức M không phụ thuộc cứng vào `pet-mountup` (mức S), đúng luật MoSCoW "M không phụ thuộc S/C".

---

## 4. ADR

### ADR-05e-1 — Thú cưỡi dùng mức chặn chỉ số theo cấp, tách khỏi mức chặn thời trang

- **Bối cảnh**: DESIGN_RULES mục 9 dòng "Thời trang" gộp ô `mount` vào 4 ô thời trang với chỉ số nhỏ (công 40-150, thủ 30-80, sinh lực 100-600); `03-doi-chieu.md` K11 ghi `spd ≤ 35`. Thú cưỡi cấp 120-190 của `pet-beasts` cần công tới 450, sinh lực tới 1.700, thủ tới 260 để còn ý nghĩa ở hậu kỳ, và `pet-mountup` cộng thêm `spd` tới +6,9.
- **Quyết định**: ô `mount` dùng mức chặn theo cấp yêu cầu ở mục 2.1.12 (`atk ≤ max(150, 2,5L)`, `hp ≤ max(600, 10L)`, `def ≤ max(80, 1,5L)`, `mp ≤ max(400, 6L)`); giữ trần phần trăm thời trang (`expPct ≤ 10, hpPct ≤ 8, crit/dodge ≤ 3`) và `spd` gốc 5-40 như `check-data.js` hiện có; `spd` sau nuôi ≤ 47; tổng tốc chạy ≤ 100%. Ba ô `mask/cloak/costume` giữ nguyên mức chặn nhỏ. Cập nhật DESIGN_RULES mục 9 (dòng "Thú cưỡi") và sửa K11 của `03-doi-chieu.md`.
- **Phương án khác**: (a) giữ chỉ số thú cưỡi nhỏ, chỉ khác `spd`: thú hậu kỳ chỉ còn là đồ trang trí, không đủ động lực cày mảnh 200 món; (b) cho thú cưỡi cộng phần trăm công/thủ: khó kiểm, dễ vượt trần cân bằng.
- **Chi phí**: 1 khối kiểm mới trong `check-data.js` (đã đặc tả ở `content/60` mục 6), sửa 2 dòng tài liệu.
- **Hệ quả**: thú cưỡi hậu kỳ đóng góp ~9% công, ~14% sinh lực người chơi cùng cấp (Kim Long cấp 30 Thần Thú); thú bán bằng lượng luôn yếu hơn thú rơi/ghép cùng dải cấp, giữ P5. `cmb-balance-upper` phải tính chỉ số thú cưỡi trung bình vào hồ sơ người chơi trung bình.

### ADR-05e-2 — Tủ ngoại hình: kiểu hiển thị có thể khác món đang mặc (3 ô thời trang)

- **Bối cảnh**: hiện `look.mask/cloak/costume` luôn là mã hình của món đang mặc (`lookOf`), DESIGN_RULES mô tả thời trang "đọc từ `look.*`". Tủ ngoại hình cần hiển thị kiểu đã từng sở hữu hoặc ẩn ô.
- **Quyết định**: chỉ 3 ô `mask/cloak/costume` được ghi đè hiển thị qua móc `look(c, out)`; `mount`, `wing`, `pet` luôn theo món đang mặc vì chúng đổi độ cao nhân vật (`mountOffset`, nhãn tên), bóng và vị trí đánh nhìn thấy, ảnh hưởng đọc trận (P3). Chỉ số luôn theo món đang mặc. Ghi bất biến mới vào DESIGN_RULES: "ngoại hình 3 ô thời trang có thể khác món đang mặc; thú cưỡi, pháp bảo, thú cưng thì không".
- **Phương án khác**: (a) ghi đè cả thú cưỡi: người chơi đọc sai tốc chạy đối thủ, đổi hình giữa lôi đài; (b) không có tủ, chỉ có nhuộm: không giải quyết thời trang lễ hội hết hạn là mất kiểu.
- **Chi phí**: module `wardrobe`, móc `look`, khóa cache hình theo màu nhuộm (thêm tối đa 9 biến thể mỗi kiểu áo choàng/trang phục, dựng lười khi gặp).
- **Hệ quả**: món thời trang có hạn vẫn có giá trị sưu tầm trong thời hạn; cần kiểm hiệu năng cache (mục 2.4.9 điểm 5).

### ADR-05e-3 — Cho phép đổi tên nhân vật dù tên là khóa dữ liệu

- **Bối cảnh**: tên nhân vật (chữ thường) là khóa của `db.chars`, `world.byName`, danh sách bạn, thành viên gia tộc, cặp lôi đài trong ngày, và là tham số của `world.mail.charOf(tên)`. Hiện không có đường đổi.
- **Quyết định**: cho đổi tên bằng Thẻ Cải Danh với một thao tác đồng bộ `db.renameChar` + móc thế giới mới `charRenamed(old, new)` cho từng module tự cập nhật dữ liệu của mình (như `charDeleted`), giới hạn 30 ngày một lần, giữ chỗ tên cũ 30 ngày. Không thêm id nội bộ bất biến cho nhân vật ở 1.0.
- **Phương án khác**: (a) thêm `c.uid` bất biến và đổi mọi bảng sang khóa uid: đúng về lâu dài nhưng chạm hầu hết module và dữ liệu đã lưu, rủi ro cao trước 1.0; (b) không cho đổi tên: người chơi đặt nhầm tên phải tạo lại nhân vật.
- **Chi phí**: 1 module, 1 hàm `db`, 1 móc thế giới, kiểm thử 2 bot; mỗi module giữ dữ liệu theo tên phải cài móc `charRenamed` (friends, clan, arena, rank; module mới sau này phải nhớ).
- **Hệ quả**: `check-data`/review module mới phải hỏi "có lưu tên người chơi không, có xử lý `charRenamed` không"; thêm dòng này vào CLAUDE.md mục "Thêm module tính năng mới". Nếu sau 1.0 chuyển sang uid (`ops-data-migration`) thì bỏ móc này.

---

## 5. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định (áp dụng nếu không ai trả lời) |
|---|---|---|
| 1 | Giữ tên "Slime Con" (chữ "Slime" không phải tiếng Việt, P1) hay đổi tên hiển thị? | Giữ nguyên tên và id vì boss "Vua Slime" và quái cùng họ đang dùng chữ này; nếu vùng Thế giới đổi tên họ quái thì đổi cả thú cưng cùng đợt, id `pet_slime` giữ nguyên |
| 2 | Thú cưng có cần cột `grade` khai tay trong `PETS` thay vì suy ra theo luật? | Suy ra theo luật ở mục 2.1.4, không đổi khuôn dòng `PETS` (tránh đụng 3 đặc tả đang dùng khuôn này) |
| 3 | Kỳ Lân Hỏa Vân chỉ có bản 7 ngày nên không bao giờ nuôi được; có thêm đường ra bản vĩnh viễn? | Không thêm ở 1.0; cân nhắc mảnh `frag_qilin` (Tà Thú Huyết Nguyệt) ở 1.1 nếu số liệu cho thấy người chơi muốn |
| 4 | Thú cưỡi có hạn từ lễ hội (15 ngày) có được nuôi tạm rồi mất? | Không (giữ `specs/mountup.md`: thú có hạn không nuôi) |
| 5 | Tủ ngoại hình lưu theo nhân vật hay theo tài khoản? | Theo nhân vật (`c.wardrobe`), đồng nhất với các dữ liệu khác; chung tài khoản xét cùng `gear-storage-plus` |
| 6 | Bộ thời trang có nên cộng chỉ số nhỏ? | Không, thuần hình (P5) |
| 7 | Giá Gương Hóa Dung (30 lượng) và Thẻ Cải Danh (100 lượng) | Giữ; `eco-economy-model` xếp chúng vào nguồn hút lượng thuần ngoại hình, đổi giá chỉ qua công cụ cân bằng |
| 8 | Thuốc nhuộm 3 màu đặc biệt chỉ bán lượng có làm người chơi miễn phí thấy thiệt? | Thêm 3 màu này vào bảng đổi quà của lễ hội tương ứng (Kim Tuyến: Tết, Ngân Hà: Trung Thu, Huyết Ngọc: Halloween) với giá 40 token, giới hạn 2 lượt/mùa; việc thuộc `evt-tet`, `evt-trungthu`, `evt-halloween` |
| 9 | Kỹ năng `fortune` cộng xu thường hay xu khóa? | Xu thường (loại "rơi đồ" theo G12); `eco-economy-model` theo dõi, nếu nguồn xu vượt mô hình thì hạ `ch` qua dữ liệu |
| 10 | Có cho đổi giới tính bằng Gương Hóa Dung? | Không ở 1.0 (đụng tóc theo giới, trang phục, NPC xưng hô); xét lại sau 1.0 |
| 11 | Đổi tên: tên cũ trong thư đã gửi, nhật ký chat có sửa theo? | Không; thư giữ chữ `from` cũ làm lịch sử |
| 12 | Hiệu ứng ngoại hình người khác mặc định bật hay tắt trên điện thoại? | "Chỉ của tôi" trên `body.touch`, "Tất cả" trên máy tính |
