# GDD 07 — Thế giới

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 7: bố cục thế giới, bản đồ, vùng, dịch chuyển, bản đồ thế giới |
| Ngày | 18/10/2026 |
| Phạm vi id | `world-base`, `world-movement`, `world-worldmap`, `world-upper`, `world-lower-fill`, `world-towns`, `world-region-bonglai`, `world-region-xichviem`, `world-region-bangnguyen`, `world-region-hoanglang`, `world-region-uminh`, `world-region-tinhha`, `world-region-hondon`, `world-region-thaicuc`, `world-layout`, `world-hidden` (16 id, đúng danh mục, không thêm id mới) |
| Id liên quan ở mục khác | `world-home`, `world-teleport`, `world-channels`, `pve-caves`, `pve-worldboss` (`05-he-thong-pve.md`); `art-themes-new`, `art-monsters-199`, `snd-content-199` (`09-my-thuat-am-thanh.md`); `core-levelcap-199` (`06-can-bang.md`); `quest-main-199`, `quest-kyduyen` (`08-cot-truyen.md`); `ops-state-culling`, `dev-verify` (`10-ky-thuat-van-hanh.md`); `eco-bound` (`05-he-thong-trang-bi.md`); `cmb-khinhcong` (`04-dac-sac.md`) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, `docs/gdd/01..05`, mã `src/` ở thư mục làm việc ngày 18/10/2026 (`shared/data/maps.js`, `shared/data/audio.js`, `server/modules/movement`, `client/js/ui/worldmap.js`, `client/js/game/pathfind.js`, `tools/check-data.js`); nội dung cấp 199 đã chốt `content/PLAN.md` (bản cập nhật 18/10, có quy tắc giao việc mới), `content/00-foundation.md` mục 6-8, `content/10-world.md` (toàn bộ), `content/20-monsters.md` mục 2, 4, 7, 8, `content/50-worldboss-events.md` mục 3-4, `specs/dungeons.md`, `specs/battlefield.md`, `specs/clanwar.md`, `specs/bound.md`; kiểm kê `gddwork/audit-data.md`, `audit-risk.md` (R-12, R-19, R-20), `audit-systems.md` |
| Thí nghiệm kèm | `gddwork/lab/w07/table.py`, `gen.py` (dựng bảng 92 bản đồ và danh sách cạnh từ bảng mục 3 của `content/10-world.md`, kiểm cổng hai chiều, liên thông, số bước); đối chiếu 23 bản đồ cũ bằng `clientMaps()` của `src/shared/data/maps.js` thật (khớp từng id, theme, độ rộng, cấp quái, cổng, boss) |

Quy tắc đọc: `CLAUDE.md` và `DESIGN_RULES.md` thắng tài liệu này, trừ chỗ có ADR ở mục 13. Với dữ liệu bản đồ, nguồn chi tiết là `content/10-world.md` (mã dán nguyên khối cho worker); tài liệu này **tóm theo khuôn GDD**, giữ đủ mọi id, số và quyết định để người đọc không phải mở đặc tả. Thứ tự ưu tiên khi các đặc tả nói khác nhau: `content/PLAN.md` → phụ lục điều phối của `specs/<x>.md` → `00-foundation.md` → `10-world.md` → `20-monsters.md` → `30-quests.md` → `40/50/60`.

---

## 0. Tóm tắt

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | Đặc sắc | Giao opencode | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|---|---|
| `world-base` | Khung bản đồ: 3 làng, 19 bãi luyện, cổng hai chiều, cửa giữa bản đồ | P1, P2 | M | done | 2 | S | | - | mục 10.1 |
| `world-movement` | Di chuyển, nhảy đôi, xuống bục, máy chủ kiểm tốc và độ cao nhảy | P3, P5 | M | done | 1 | S | | - | mục 10.2 |
| `world-worldmap` | Bản đồ thế giới và tự tìm đường liên bản đồ | P2 | M (nâng từ S khi ghép) | done | 2 | M | có | - | mục 10.3 |
| `world-towns` | Trạm dùng chung `outpost()`, làng nhận danh sách NPC làm tham số | P2 | M | todo | 2 | M | | có | mục 10.4, `10-world` 4.3 |
| `world-lower-fill` | Hạ Giới thêm 19 bãi + 2 trạm, lấp dải cấp mỏng | P2, P3 | M | todo | 2 | L | | có | mục 10.5, `10-world` 5 |
| `world-upper` | Bản đồ thế giới 4 tờ + Phu Xe trang Thượng Giới | P2 | M | todo | 2 | M | | không | mục 10.6, `10-world` 4.6, 8 |
| `world-region-bonglai` | Vùng 1 Quần Đảo Bồng Lai (120-129) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.1 |
| `world-region-xichviem` | Vùng 2 Xích Viêm Hỏa Vực (130-139) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.2 |
| `world-region-bangnguyen` | Vùng 3 Vạn Niên Băng Nguyên (140-149) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.3 |
| `world-region-hoanglang` | Vùng 4 Thiên Cổ Hoàng Lăng (150-159) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.4 |
| `world-region-uminh` | Vùng 5 U Minh Quỷ Lâm (160-169) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.5 |
| `world-region-tinhha` | Vùng 6 Tinh Hà Thiên Lộ (170-179) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.6 |
| `world-region-hondon` | Vùng 7 Hỗn Độn Ma Vực (180-189) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.7 |
| `world-region-thaicuc` | Vùng 8 Thái Cực Thần Cảnh (190-199) | P1, P3 | M | todo | 2 | M | | có | mục 10.7, `10-world` 6.8 |
| `world-layout` | Bố cục bản đồ viết tay (`layout`, `segments`) cho bản đồ quan trọng | P1, P3 | S | todo | 2 | M | | không | mục 10.8 |
| `world-hidden` | Bí địa, lối tắt và câu đố địa hình | P3, P1 | C | todo | 5 | M | | không | mục 10.9 |

Tính năng đặc sắc thuộc mục này (đếm vào sàn ≥ 10 đặc sắc M/S): `world-worldmap` (đã làm). Mục này giữ sàn **≥ 80 bản đồ**: sau `world-lower-fill` + 8 `world-region-*` có **92 bản đồ không phải phó bản**; riêng 23 bản đồ cũ + 21 Hạ Giới mới + 4 vùng đầu (24) = 68 chưa đủ sàn, nên cả 8 vùng đều là `M`.

Cột "Giao opencode" theo quy tắc người dùng chốt ngày 18/10/2026 (`content/PLAN.md` cuối file): opencode chỉ dán mã/số đã chốt và chạy lệnh; việc đồ họa, giao diện, chọn phương án giao agent Claude. Vì vậy `world-upper` (cửa sổ bản đồ thế giới), `world-layout` (thiết kế bục) và `world-hidden` (thiết kế câu đố, hình cửa ẩn) không giao opencode.

### 0.2 Số liệu thế giới

| Hạng mục | Hiện có (mã ngày 18/10/2026) | Sau mục này | Sàn 1.0 |
|---|---|---|---|
| Bản đồ không phải phó bản | 23 | **92** (23 cũ + 21 Hạ Giới + 48 Thượng Giới) | ≥ 80 |
| Làng | 3 | 3 | |
| Trạm (thị trấn nhỏ có Phu Xe) | 0 | 10 (2 Hạ Giới + 8 Thượng Giới) | |
| Đấu Trường (PvP tự do) | 1 | 1 | |
| Bãi tân thủ (cấp 1-5) | 3 | 3 | |
| Bãi luyện Hạ Giới (cấp 7-120) | 16 | 35 | |
| Bãi luyện Thượng Giới (M1, M2, M3, P) | 0 | 32 | |
| Bí cảnh vùng (D1, có boss vùng) | 0 | 8 | |
| Phó bản/bản sao (không tính vào 92) | 2 (`loidai`, `dungeon`) | 2 + bản đồ phó bản của mục khác (mục 9) | |
| Boss bản đồ | 11 | **23** (11 + 3 Hạ Giới + 9 Thượng Giới) | |
| Quái thường | 51 | 180 (+57 Hạ Giới, +72 Thượng Giới) | phủ 1-199 |
| Vật phẩm nhiệm vụ (`type: 'quest'`) | 14 | 57 (+19 Hạ Giới, +24 Thượng Giới) | |
| Theme bản đồ | 23 | 26 (+`swamp`, `starfield`, `jade_peak`) | |
| Biến thể theo bản đồ (`MAP_VARIANTS`) | 1 (`sakura_garden`) | 40 (+15 Hạ Giới, +24 Thượng Giới) | |
| Tờ bản đồ thế giới | 1 | 4 | |
| NPC Phu Xe | 3 | 13 | |
| Bí địa ẩn (`world-hidden`, mức C, không tính vào 92) | 0 | 4 | |

Độ phủ cấp: mỗi dải 10 cấp ở 1-120 có 4-6 bãi; mỗi dải 10 cấp ở 121-199 có đúng 5 bãi (M1, M2, M3, D1, P). Mỗi bãi đúng 3 loại quái, chênh nhau 2-3 cấp, xếp từ thấp (trái) tới cao (phải).

| Dải | 1-10 | 11-20 | 21-30 | 31-40 | 41-50 | 51-60 | 61-70 | 71-80 | 81-90 | 91-100 | 101-110 | 111-120 | mỗi dải 121-130 tới 191-199 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bãi cũ | 4 | 4 | 2 | 3 | 1 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | 0 |
| Bãi mới | 1 | 2 | 3 | 3 | 4 | 2 | 3 | 3 | 3 | 2 | 3 | 2 | 5 mỗi dải |
| Tổng | 5 | 6 | 5 | 6 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 mỗi dải |

(Một bãi có quái trải qua hai dải được đếm ở cả hai, như `content/10-world.md` mục 0.1.)

### 0.3 Điều chỉnh và phát hiện khi tóm đặc tả

| # | Điều phát hiện | Cách xử lý trong GDD |
|---|---|---|
| D1 | Bảng mục 3 của `10-world.md` (do bộ sinh bảng in) ghi "Phu Xe cấp undefined+" ở `gb_bachtuyet`, `gd_vanmon` | Mã dán ở `10-world` mục 5.2, 5.4 có `minLv: 45` và `minLv: 85`. GDD dùng 45 và 85. Không ảnh hưởng worker (worker dán mã, không dán bảng). |
| D2 | Lô N-W1 (3 theme mới) chỉ ghi sửa `render/map/themes.js`, `maprender.js`, `tools/check-data.js`. Nhưng `tools/check-data.js` dòng 401 báo lỗi `Âm thanh: theme "<t>" chưa có nhạc nền trong MUSIC_THEME` cho mọi theme thiếu nhạc | Lô N-W1 sửa thêm `src/shared/data/audio.js`: 3 dòng `swamp: 'field_mist'`, `starfield: 'field_heaven'`, `jade_peak: 'field_bamboo'` (mục 5.3). Ghi vào `art-themes-new` (mục 09) và tiêu chí của `world-lower-fill`. |
| D3 | `content/PLAN.md` được cập nhật ngày 18/10: N-W1, mọi lô vẽ và giao diện chuyển từ "oc+C" sang **C** | `world-upper` (N-W2), `world-layout`, `world-hidden`: `opencode: false`. Các lô dán dữ liệu (`world-lower-fill`, `world-region-*`, phần dữ liệu và máy chủ của `world-towns`) vẫn giao opencode. |
| D4 | Đồ thị 92 bản đồ (kể cả 23 bản đồ cũ) là **cây**: 92 nút, 91 cạnh, không có vòng | Ghi ở mục 1.5. Lối tắt đầu tiên tạo vòng nằm ở `world-hidden`. `findRoute` dùng tìm kiếm theo đồ thị nên không phải sửa. |
| D5 | Tên "bí cảnh" trùng ý với `pve-bicanh-phuchu` (Bí Cảnh roguelite ở `04-dac-sac.md`) | Câu hỏi mở Q1; mặc định giao diện gọi D1 là "Bí cảnh vùng". |
| D6 | 15 tên NPC làng kiểu Nhật (Tetsu, Ken, Rin, Bo, Ryu, Gan, Yuki, Sora, Mizu, Kai, Daichi, Haru, Kaze, Fuu, Jin) và boss "Pharaoh Phục Sinh" lệch trụ cột P1 | Câu hỏi mở Q4; mặc định đổi tên trong lô `world-towns` (không id nào đổi, kiểm thử không dựa vào tên). |
| D7 | `th_ngankieu` (M3) và `th_langdai` (D1) cùng theme `starfield` mà không bản nào có biến thể; mọi cặp cùng theme khác trong một vùng đều có ít nhất một bản biến thể | Câu hỏi mở Q6; mặc định thêm biến thể cho `th_langdai` ở lô `art-themes-new`. |

---

## 1. Bố cục thế giới

### 1.1 Hai tầng

| Tầng | Cấp | Tờ bản đồ thế giới | Số bản đồ | Cấu trúc |
|---|---|---|---|---|
| **Hạ Giới** | 1-120 | Tờ 1 "Tam Thôn" (cấp 1-50, 22 nút), tờ 2 "Trung Châu" (cấp 50-120, 22 nút) | 44 (23 cũ + 21 mới) | Một **đường chính** chạy qua 3 làng (Hỏa Vân, Thủy Nguyệt, Phong Lâm) tới Long Cung; 2 trạm chen vào đường chính ở cấp 45 và 85; mọi bãi khác là **nhánh** vào qua cửa giữa bản đồ |
| **Thượng Giới** | 120-199 | Tờ 3 "Tiên Châu" (vùng 1-4, cấp 120-160, 24 nút), tờ 4 "Thần Vực" (vùng 5-8, cấp 160-199, 24 nút) | 48 (8 vùng × 6) | 8 vùng nối tiếp nhau bắt đầu từ cổng phía đông Long Cung; mỗi vùng theo khuôn M1 → M2 → M3 trên đường chính, cộng trạm T, bí cảnh D1, bãi phụ P |

Câu chuyện thế giới (chi tiết ở `08-cot-truyen.md`): Hạ Giới là đất của ba làng ninja; ở cấp 120, nhiệm vụ cuối Hạ Giới đưa ninja qua cổng phía đông Long Cung vào Thượng Giới, nơi tám vùng tiên cảnh và ma vực xếp theo dải cấp, kết thúc ở Thái Cực Thần Cảnh với boss cuối Hư Vô Ma Tôn (cấp 199).

### 1.2 Hạ Giới: đường chính và 5 khu mở rộng

Bản đồ cũ giữ nguyên id, theme, quái, boss. Bãi mới gắn vào bản đồ cũ bằng **cửa** (`door: true`); hai trạm được **chen** vào giữa hai bản đồ cũ đang nối nhau trên đường chính (đổi đích hai cổng mép, không bản đồ cũ nào mất cổng).

| Khu | File dữ liệu | Cấp | Bãi mới | Trạm | Boss mới | Vật phẩm nhiệm vụ | Gắn vào bản đồ cũ |
|---|---|---|---|---|---|---|---|
| `ga` Tam Thôn ngoại vi | `src/shared/data/hagioi/ga.js` | 10-42 | `ga_ruongbac`, `ga_modong`, `ga_rungnam`, `ga_ocdao`, `ga_damhac` | - | - | 5: Bó Rơm Vàng, Quặng Đồng, Bào Tử Nấm Ma, Vảy Thủy Xà, Răng Cá Sấu | `bamboo` cửa x480, `bat_cave` cửa x700, `wasteland` cửa x420, `misty_valley` cửa x1500 |
| `gb` Bạch Tuyết Sơn | `hagioi/gb.js` | 40-54 | `gb_tunglam`, `gb_hanphong`, `gb_bangho` | `gb_bachtuyet` Trấn Bạch Tuyết (cấp 45) | Băng Hà Cự Tượng `boss_gb_bangtuong` 50 ở `gb_hanphong` | 3: Lông Cú Tuyết, Băng Thiết Khoáng, Vảy Băng Xà | `snow_mountain` cửa x700; chen trạm `snow_mountain` ↔ `ice_peak` |
| `gc` Ma Lâm Hỏa Địa | `hagioi/gc.js` | 60-80 | `gc_baithama`, `gc_damoan`, `gc_lorenquy`, `gc_concatdo` | - | Hắc Trạch Thi Vương `boss_gc_thivuong` 72 ở `gc_damoan` | 4: Bùa Giấy Cổ, Nhựa Thiềm Thừ, Ma Thiết, Quỷ Hỏa Thạch | `demon_forest` cửa x600, `demon_cave` cửa x600 |
| `gd` Vân Môn | `hagioi/gd.js` | 80-94 | `gd_vancot`, `gd_huyetho`, `gd_thachlam` | `gd_vanmon` Trấn Vân Môn (cấp 85) | Huyết Ma Vương `boss_gd_huyetma` 92 ở `gd_huyetho` | 3: Hồn Cốt, Huyết Tinh, Lông Hạc Thần | `hell_gate` cửa x600; chen trạm `hell_gate` ↔ `heaven` |
| `ge` Thiên Ngoại | `hagioi/ge.js` | 100-120 | `ge_kimkhuyet`, `ge_loivan`, `ge_huvo`, `ge_longmo` | - | - | 4: Kim Diệp, Lôi Thạch, Hư Vô Thạch, Long Cốt | `heaven` cửa x1500, `abyss` cửa x1500 |

Tổng Hạ Giới mới: 19 bãi, 2 trạm, 57 quái thường, 3 boss, 19 vật phẩm nhiệm vụ. Quái mới mượn hình quái gốc cùng kiểu qua trường `art` (không vẽ thêm), ví dụ `ga_chauchau` mượn `bee`, `gb_tegiac` mượn `icewolf`, boss `boss_gb_bangtuong` mượn `boss_yeti`.

### 1.3 Trạm Hạ Giới và điểm về (`home`)

| Trạm | Chen giữa | Phu Xe đưa tới khi | 6 NPC (loại → tên) | Bản đồ có `home` là trạm này |
|---|---|---|---|---|
| `gb_bachtuyet` Trấn Bạch Tuyết (theme `snow`, nhà kiểu `water`) | `snow_mountain` (cổng phải x1984 → trạm @60) ↔ `ice_peak` (cổng trái x16 → trạm @1340) | cấp ≥ 45 | elder Trấn Trưởng Bạch Sơn · potion Y Nữ Tuyết Mai · smith Thợ Rèn Hàn Thạch · task Tiểu Nhị Đông Phong · tele Phu Xe Tuyết Lộc · storage Thủ Kho Băng Kiên | `gb_bangho`, `ice_peak`, `crystal_cave`, `demon_forest`, `gc_baithama`, `gc_damoan`, `demon_cave`, `gc_lorenquy`, `gc_concatdo`, `hell_gate`, `gd_vancot`, `gd_huyetho` (12) |
| `gd_vanmon` Trấn Vân Môn (theme `heaven`, nhà kiểu `fire`) | `hell_gate` (cổng phải x2084 → trạm @60) ↔ `heaven` (cổng trái x16 → trạm @1340) | cấp ≥ 85 | elder Trấn Trưởng Vân Tùng · potion Y Nữ Hạc Lan · smith Thợ Rèn Lôi Chấn · task Tiểu Nhị Phi Vân · tele Phu Xe Bạch Hạc · storage Thủ Kho Vân Đài | `gd_thachlam`, `heaven`, `ge_kimkhuyet`, `ge_loivan`, `abyss`, `ge_huvo`, `ge_longmo`, `dragon_palace` (8) |

Luật điểm về: chết (chọn "về làng"), dùng Cuộn Về Làng (`scroll_home`) hoặc đi cổng `@home` thì về `MAPS[bản đồ đang đứng].home`; bản đồ không có `home` (cấp dưới 50, chính các trạm, phó bản) về làng của phái như cũ. Cơ chế máy chủ (`world.homeOf(p)`) thuộc `world-home` (`05-he-thong-pve.md`); bảng trên là dữ liệu của mục này. Thượng Giới: mọi bản đồ vùng (trừ trạm) có `home = r.town` (trạm của vùng).

### 1.4 Thượng Giới: khuôn mỗi vùng

```
  (vùng trước, M3) ──► [M1 cổng vào] ──► [M2] ──► [M3 cổng ra] ──► (vùng sau, M1)
                          ⇣ cửa x700     ⇣ cửa x1050  ⇣ cửa x700
                        [T trạm]       [D1 bí cảnh] [P bãi phụ]
                        5 NPC          boss x850    (vùng 8: boss cuối ở M3 x1700)
```

| Ô | Vai trò | Rộng | Seed | Quái (ô của `20-monsters`) | Cổng nội vùng |
|---|---|---|---|---|---|
| M1 | bãi đầu đường chính (`entry`) | 2000 | 300 + 10·i + 1 | A: `L+1, L+3, L+5` (số con 8/7/7) | phải x1984 → M2@60; cửa x700 → T@80; cổng trái x16 do `maps.js` tự nối với M3 vùng trước. NPC: Trưởng lão x220, Kỳ nhân x340 |
| M2 | bãi giữa | 2100 | +2 | B: `L+2, L+4, L+7` | x16 → M1@1940; x2084 → M3@60; cửa x1050 → D1@80 |
| M3 | bãi cuối đường chính (`exit`) | 2200 | +3 | C: `L+6, L+8, L+10` | x16 → M2@2040; cửa x700 → P@80; cổng phải x2184 do `maps.js` tự nối với M1 vùng sau |
| D1 | bí cảnh vùng, có boss vùng | 1700 | +4 | S: `L+5, L+7, L+10` (6/6/6) + boss x850 | x16 → M2@1050 |
| P | bãi phụ | 1800 | +5 | `L+4, L+7, L+10` dùng lại quái vùng (vùng 8: 194/196/199), 7/7/6 | x16 → M3@700 |
| T | trạm | 1400 | không | không quái | x16 → M1@700; 5 NPC `tele, potion, smith, storage, task` |

(`L` = cấp gốc của vùng: 120, 130, 140, 150, 160, 170, 180, 190; `i` = số thứ tự vùng 1-8.)

### 1.5 Tính chất đồ thị (đo bằng `gddwork/lab/w07/gen.py`)

| Chỉ số | Giá trị |
|---|---|
| Nút | 92 bản đồ (không tính phó bản) |
| Cạnh | 91 (49 nối bằng cổng mép, 42 nối bằng cửa giữa bản đồ); mọi cạnh có cổng ở cả hai đầu |
| Liên thông | đi bộ từ 3 làng tới được cả 92 bản đồ |
| Dạng | **cây** (không vòng): giữa hai bản đồ luôn chỉ có một đường đi bộ |
| Số bước đi bộ từ `v_fire` | `dragon_palace` 17 · `bl_tram` 19 · `tc_thanhdien` 41 · xa nhất `tc_bandao` 42 |
| Số bước từ trạm vùng tới bản đồ xa nhất của vùng | ≤ 4 (T → M1 → M2 → M3 → P) |
| Cạnh nối hai tờ | `snow_mountain` ↔ `gb_bachtuyet` (tờ 1 ↔ 2), `dragon_palace` ↔ `bl_bichsa` (tờ 2 ↔ 3), `hl_diacung` ↔ `um_quylam` (tờ 3 ↔ 4) |

Hệ quả thiết kế: đi bộ từ làng tới vùng cuối mất 41 lần qua cổng, nên **Phu Xe tới trạm** (mục 6) là bắt buộc, không phải tiện ích; tìm đường tự động phải chạy qua cả 4 tờ (mục 6.3).

---

## 2. Bảng đủ 92 bản đồ

Cột "Vùng": `HG·gốc` = bản đồ Hạ Giới cũ, `HG·ga` tới `HG·ge` = khu Hạ Giới mới (mục 1.2), tên vùng = Thượng Giới. Cột "Cổng nối": id bản đồ đích; "(cửa)" = cổng giữa bản đồ (`door: true`), còn lại là cổng mép; ★ = cổng mới hoặc cổng đổi đích ở bản đồ cũ. Tọa độ cổng, `tx`, seed, tọa độ trên tờ bản đồ thế giới ở `content/10-world.md` mục 3 (bảng) và mục 5-6 (mã). 23 bản đồ cũ đã đối chiếu với `src/shared/data/maps.js` hiện tại: khớp id, tên, theme, rộng, cấp quái, cổng cũ và boss.

#### Tờ 1 — Tam Thôn (cấp 1-50)

| # | id | Tên | Vùng | Loại | Cấp quái | Theme | Rộng | Cổng nối (★ = cổng mới/đổi đích ở bản đồ cũ) | Boss bản đồ | Về (`home`) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `v_fire` | Làng Hỏa Vân | HG·gốc | Làng | - | `village_fire` | 1640 | fire_field, bamboo, arena (cửa) | - | - |
| 2 | `fire_field` | Đồi Hỏa Diệm | HG·gốc | Bãi tân thủ | 1-5 | `grass_fire` | 1260 | v_fire | - | - |
| 3 | `arena` | Đấu Trường | HG·gốc | Đấu Trường (PvP) | - | `arena` | 900 | v_fire | - | - |
| 4 | `bamboo` | Rừng Trúc | HG·gốc | Bãi chính | 7-11 | `bamboo` | 1800 | v_fire, v_water, sakura_garden (cửa), ★ga_ruongbac (cửa) | Vua Slime `boss_slime` 12 | - |
| 5 | `ga_ruongbac` | Ruộng Bậc Thang | HG·ga | Bãi nhánh | 10-14 | `grass_wind` | 1500 | bamboo | - | - |
| 6 | `sakura_garden` | Vườn Anh Đào | HG·gốc | Bãi nhánh | 14-19 | `sakura` | 1500 | bamboo | Cửu Vĩ Hồ `boss_fox` 22 | - |
| 7 | `v_water` | Làng Thủy Nguyệt | HG·gốc | Làng | - | `village_water` | 1640 | bamboo, coast, water_lake (cửa) | - | - |
| 8 | `water_lake` | Hồ Thủy Tiên | HG·gốc | Bãi tân thủ | 1-5 | `lake` | 1260 | v_water | - | - |
| 9 | `coast` | Bờ Biển San Hô | HG·gốc | Bãi chính | 13-17 | `beach` | 1800 | v_water, bat_cave | - | - |
| 10 | `bat_cave` | Hang Dơi | HG·gốc | Bãi chính | 19-24 | `cave` | 1900 | coast, v_wind, ★ga_modong (cửa) | Dơi Chúa `boss_bat` 28 | - |
| 11 | `ga_modong` | Mỏ Đồng Cũ | HG·ga | Bãi nhánh | 20-24 | `cave` | 1600 | bat_cave, ga_rungnam | - | - |
| 12 | `ga_rungnam` | Rừng Nấm Ma | HG·ga | Bãi nhánh | 24-28 | `mist` | 1600 | ga_modong | - | - |
| 13 | `v_wind` | Làng Phong Lâm | HG·gốc | Làng | - | `village_wind` | 1640 | bat_cave, wasteland, wind_hill (cửa) | - | - |
| 14 | `wind_hill` | Đồi Gió Lộng | HG·gốc | Bãi tân thủ | 1-5 | `grass_wind` | 1260 | v_wind | - | - |
| 15 | `wasteland` | Hoang Mạc Cát | HG·gốc | Bãi chính | 26-31 | `desert` | 1900 | v_wind, misty_valley, ancient_ruins (cửa), ★ga_ocdao (cửa) | - | - |
| 16 | `ga_ocdao` | Ốc Đảo Lục Thủy | HG·ga | Bãi nhánh | 30-34 | `desert` | 1700 | wasteland | - | - |
| 17 | `ancient_ruins` | Phế Tích Cổ | HG·gốc | Bãi nhánh | 35-39 | `ruins` | 1600 | wasteland | Pharaoh Phục Sinh `boss_pharaoh` 42 | - |
| 18 | `misty_valley` | Thung Lũng Sương | HG·gốc | Bãi chính | 33-39 | `mist` | 2000 | wasteland, snow_mountain, ★ga_damhac (cửa) | Lang Vương `boss_wolf` 42 | - |
| 19 | `ga_damhac` | Đầm Hắc Thủy | HG·ga | Bãi nhánh | 38-42 | `swamp` | 1700 | misty_valley | - | - |
| 20 | `snow_mountain` | Núi Tuyết | HG·gốc | Bãi chính | 42-48 | `snow` | 2000 | misty_valley, ★gb_bachtuyet, ★gb_tunglam (cửa) | - | - |
| 21 | `gb_tunglam` | Rừng Tùng Tuyết | HG·gb | Bãi nhánh | 40-44 | `snow` | 1800 | snow_mountain, gb_hanphong | - | - |
| 22 | `gb_hanphong` | Hàn Phong Cốc | HG·gb | Bãi nhánh | 44-48 | `ice` | 1800 | gb_tunglam | Băng Hà Cự Tượng `boss_gb_bangtuong` 50 | - |

#### Tờ 2 — Trung Châu (cấp 50-120)

| # | id | Tên | Vùng | Loại | Cấp quái | Theme | Rộng | Cổng nối (★ = cổng mới/đổi đích ở bản đồ cũ) | Boss bản đồ | Về (`home`) |
|---|---|---|---|---|---|---|---|---|---|---|
| 23 | `gb_bachtuyet` | Trấn Bạch Tuyết | HG·gb | Trạm (chen đường chính) | - | `snow` + nhà water | 1400 | snow_mountain, ice_peak, gb_bangho (cửa) | - (Phu Xe từ cấp 45) | - |
| 24 | `gb_bangho` | Hồ Băng Kính | HG·gb | Bãi nhánh | 50-54 | `ice` | 1800 | gb_bachtuyet | - | `gb_bachtuyet` |
| 25 | `ice_peak` | Đỉnh Băng Giá | HG·gốc | Bãi chính | 52-58 | `ice` | 2000 | ★gb_bachtuyet, demon_forest, crystal_cave (cửa) | Tuyết Quái Vương `boss_yeti` 62 | `gb_bachtuyet` |
| 26 | `crystal_cave` | Hang Pha Lê | HG·gốc | Bãi nhánh | 56-61 | `crystal` | 1600 | ice_peak | Tinh Thể Vương `boss_crystal` 66 | `gb_bachtuyet` |
| 27 | `demon_forest` | Rừng Ma | HG·gốc | Bãi chính | 62-68 | `dark_forest` | 2000 | ice_peak, demon_cave, ★gc_baithama (cửa) | - | `gb_bachtuyet` |
| 28 | `gc_baithama` | Bãi Tha Ma | HG·gc | Bãi nhánh | 60-64 | `mist` | 1800 | demon_forest, gc_damoan | - | `gb_bachtuyet` |
| 29 | `gc_damoan` | Đầm Oan Hồn | HG·gc | Bãi nhánh | 66-70 | `swamp` | 1800 | gc_baithama | Hắc Trạch Thi Vương `boss_gc_thivuong` 72 | `gb_bachtuyet` |
| 30 | `demon_cave` | Hang Quỷ | HG·gốc | Bãi chính | 72-79 | `lava` | 2000 | demon_forest, hell_gate, ★gc_lorenquy (cửa) | Quỷ Vương `boss_oni` 85 | `gb_bachtuyet` |
| 31 | `gc_lorenquy` | Lò Rèn Quỷ Hỏa | HG·gc | Bãi nhánh | 70-74 | `lava` | 1800 | demon_cave, gc_concatdo | - | `gb_bachtuyet` |
| 32 | `gc_concatdo` | Cồn Cát Đỏ | HG·gc | Bãi nhánh | 76-80 | `desert` | 1900 | gc_lorenquy | - | `gb_bachtuyet` |
| 33 | `hell_gate` | Cổng Địa Ngục | HG·gốc | Bãi chính | 83-95 | `hell` | 2100 | demon_cave, ★gd_vanmon, ★gd_vancot (cửa) | Ma Thần `boss_god` 100 | `gb_bachtuyet` |
| 34 | `gd_vancot` | Huyệt Vạn Cốt | HG·gd | Bãi nhánh | 80-84 | `cave` | 1900 | hell_gate, gd_huyetho | - | `gb_bachtuyet` |
| 35 | `gd_huyetho` | Huyết Hồ | HG·gd | Bãi nhánh | 86-90 | `hell` | 1900 | gd_vancot | Huyết Ma Vương `boss_gd_huyetma` 92 | `gb_bachtuyet` |
| 36 | `gd_vanmon` | Trấn Vân Môn | HG·gd | Trạm (chen đường chính) | - | `heaven` + nhà fire | 1400 | hell_gate, heaven, gd_thachlam (cửa) | - (Phu Xe từ cấp 85) | - |
| 37 | `gd_thachlam` | Vân Thạch Lâm | HG·gd | Bãi nhánh | 90-94 | `jade_peak` | 1900 | gd_vanmon | - | `gd_vanmon` |
| 38 | `heaven` | Thiên Cung | HG·gốc | Bãi chính | 96-103 | `heaven` | 2100 | ★gd_vanmon, abyss, ★ge_kimkhuyet (cửa) | - | `gd_vanmon` |
| 39 | `ge_kimkhuyet` | Kim Khuyết Đài | HG·ge | Bãi nhánh | 100-104 | `heaven` | 2000 | heaven, ge_loivan | - | `gd_vanmon` |
| 40 | `ge_loivan` | Lôi Vân Phong | HG·ge | Bãi nhánh | 104-108 | `jade_peak` | 2000 | ge_kimkhuyet | - | `gd_vanmon` |
| 41 | `abyss` | Ma Giới | HG·gốc | Bãi chính | 106-112 | `abyss` | 2100 | heaven, dragon_palace, ★ge_huvo (cửa) | Thiên Ma `boss_heaven` 112 | `gd_vanmon` |
| 42 | `ge_huvo` | Hư Vô Động | HG·ge | Bãi nhánh | 110-114 | `crystal` | 2000 | abyss, ge_longmo | - | `gd_vanmon` |
| 43 | `ge_longmo` | Long Mộ | HG·ge | Bãi nhánh | 116-120 | `dragon_palace` | 2100 | ge_huvo | - | `gd_vanmon` |
| 44 | `dragon_palace` | Long Cung | HG·gốc | Bãi chính | 114-120 | `dragon_palace` | 2200 | abyss, ★bl_bichsa | Long Vương `boss_dragon` 125 | `gd_vanmon` |

#### Tờ 3 — Tiên Châu (cấp 120-160)

| # | id | Tên | Vùng | Loại | Cấp quái | Theme | Rộng | Cổng nối (★ = cổng mới/đổi đích ở bản đồ cũ) | Boss bản đồ | Về (`home`) |
|---|---|---|---|---|---|---|---|---|---|---|
| 45 | `bl_bichsa` | Bích Sa Hải Ngạn | Bồng Lai | Bãi chính M1 (vào vùng) | 121-125 | `beach` | 2000 | bl_daohoa, bl_tram (cửa), dragon_palace | - | `bl_tram` |
| 46 | `bl_daohoa` | Đào Hoa Tiên Đảo | Bồng Lai | Bãi chính M2 | 122-127 | `sakura` | 2100 | bl_bichsa, bl_thuyphu, bl_thanlau (cửa) | - | `bl_tram` |
| 47 | `bl_thuyphu` | Hải Long Thủy Phủ | Bồng Lai | Bãi chính M3 (ra vùng) | 126-130 | `dragon_palace` | 2200 | bl_daohoa, bl_ngocphong (cửa), xv_xichsa | - | `bl_tram` |
| 48 | `bl_thanlau` | Thận Lâu Ảo Cảnh | Bồng Lai | Bí cảnh vùng (D1) | 125-130 | `lake` | 1700 | bl_daohoa | Hải Thị Thận Long `boss_bl_thanlong` 125 | `bl_tram` |
| 49 | `bl_ngocphong` | Đảo Ngọc Phong | Bồng Lai | Bãi phụ (P) | 124-130 | `jade_peak` | 1800 | bl_thuyphu | - | `bl_tram` |
| 50 | `bl_tram` | Trấn Vọng Hải | Bồng Lai | Trạm vùng (T) | - | `beach` + nhà water | 1400 | bl_bichsa | - (Phu Xe từ cấp 120) | - |
| 51 | `xv_xichsa` | Xích Sa Hỏa Lộ | Xích Viêm | Bãi chính M1 (vào vùng) | 131-135 | `desert` | 2000 | xv_dungnham, xv_tram (cửa), bl_thuyphu | - | `xv_tram` |
| 52 | `xv_dungnham` | Dung Nham Hà | Xích Viêm | Bãi chính M2 | 132-137 | `lava` | 2100 | xv_xichsa, xv_thandan, xv_hoadiem (cửa) | - | `xv_tram` |
| 53 | `xv_thandan` | Luyện Hỏa Thần Đàn | Xích Viêm | Bãi chính M3 (ra vùng) | 136-140 | `hell` | 2200 | xv_dungnham, xv_hacdieu (cửa), bn_tuyetlinh | - | `xv_tram` |
| 54 | `xv_hoadiem` | Hỏa Diệm Sơn Khẩu | Xích Viêm | Bí cảnh vùng (D1) | 135-140 | `lava` | 1700 | xv_dungnham | Xích Diệm Dung Thần `boss_xv_dungthan` 135 | `xv_tram` |
| 55 | `xv_hacdieu` | Hắc Diệu Nham Động | Xích Viêm | Bãi phụ (P) | 134-140 | `cave` | 1800 | xv_thandan | - | `xv_tram` |
| 56 | `xv_tram` | Trấn Xích Thạch | Xích Viêm | Trạm vùng (T) | - | `desert` + nhà fire | 1400 | xv_xichsa | - (Phu Xe từ cấp 130) | - |
| 57 | `bn_tuyetlinh` | Tuyết Lĩnh Phong Khẩu | Băng Nguyên | Bãi chính M1 (vào vùng) | 141-145 | `snow` | 2000 | bn_bangcoc, bn_tram (cửa), xv_thandan | - | `bn_tram` |
| 58 | `bn_bangcoc` | Vạn Trượng Băng Cốc | Băng Nguyên | Bãi chính M2 | 142-147 | `ice` | 2100 | bn_tuyetlinh, bn_cothanh, bn_bangho (cửa) | - | `bn_tram` |
| 59 | `bn_cothanh` | Băng Tinh Cổ Thành | Băng Nguyên | Bãi chính M3 (ra vùng) | 146-150 | `crystal` | 2200 | bn_bangcoc, bn_vannien (cửa), hl_hoangsa | - | `bn_tram` |
| 60 | `bn_bangho` | Băng Phách Hồ | Băng Nguyên | Bí cảnh vùng (D1) | 145-150 | `ice` | 1700 | bn_bangcoc | Bắc Minh Thiên Lang `boss_bn_thienlang` 145 | `bn_tram` |
| 61 | `bn_vannien` | Đỉnh Vạn Niên | Băng Nguyên | Bãi phụ (P) | 144-150 | `mist` | 1800 | bn_cothanh | - | `bn_tram` |
| 62 | `bn_tram` | Hàn Băng Trấn | Băng Nguyên | Trạm vùng (T) | - | `snow` + nhà water | 1400 | bn_tuyetlinh | - (Phu Xe từ cấp 140) | - |
| 63 | `hl_hoangsa` | Hoàng Sa Thần Đạo | Hoàng Lăng | Bãi chính M1 (vào vùng) | 151-155 | `desert` | 2000 | hl_mudao, hl_tram (cửa), bn_cothanh | - | `hl_tram` |
| 64 | `hl_mudao` | Thạch Tượng Mộ Đạo | Hoàng Lăng | Bãi chính M2 | 152-157 | `ruins` | 2100 | hl_hoangsa, hl_diacung, hl_quandien (cửa) | - | `hl_tram` |
| 65 | `hl_diacung` | Địa Cung Hoàng Lăng | Hoàng Lăng | Bãi chính M3 (ra vùng) | 156-160 | `cave` | 2200 | hl_mudao, hl_thachquan (cửa), um_quylam | - | `hl_tram` |
| 66 | `hl_quandien` | Tử Kim Quan Điện | Hoàng Lăng | Bí cảnh vùng (D1) | 155-160 | `ruins` | 1700 | hl_mudao | Vạn Cổ Thi Hoàng `boss_hl_thihoang` 155 | `hl_tram` |
| 67 | `hl_thachquan` | Thạch Quan Lâm | Hoàng Lăng | Bãi phụ (P) | 154-160 | `jade_peak` | 1800 | hl_diacung | - | `hl_tram` |
| 68 | `hl_tram` | Trấn Thủ Lăng | Hoàng Lăng | Trạm vùng (T) | - | `ruins` + nhà fire | 1400 | hl_hoangsa | - (Phu Xe từ cấp 150) | - |

#### Tờ 4 — Thần Vực (cấp 160-199)

| # | id | Tên | Vùng | Loại | Cấp quái | Theme | Rộng | Cổng nối (★ = cổng mới/đổi đích ở bản đồ cũ) | Boss bản đồ | Về (`home`) |
|---|---|---|---|---|---|---|---|---|---|---|
| 69 | `um_quylam` | Quỷ Lâm Sương Mù | U Minh | Bãi chính M1 (vào vùng) | 161-165 | `mist` | 2000 | um_hacmoc, um_tram (cửa), hl_diacung | - | `um_tram` |
| 70 | `um_hacmoc` | Hắc Mộc Âm Lâm | U Minh | Bãi chính M2 | 162-167 | `dark_forest` | 2100 | um_quylam, um_vongxuyen, um_saohuyet (cửa) | - | `um_tram` |
| 71 | `um_vongxuyen` | Vong Xuyên Trúc Ảnh | U Minh | Bãi chính M3 (ra vùng) | 166-170 | `bamboo` | 2200 | um_hacmoc, um_damuminh (cửa), th_vanhai | - | `um_tram` |
| 72 | `um_saohuyet` | Quỷ Mẫu Sào Huyệt | U Minh | Bí cảnh vùng (D1) | 165-170 | `dark_forest` | 1700 | um_hacmoc | Sơn Tiêu Quỷ Vương `boss_um_sontieu` 165 | `um_tram` |
| 73 | `um_damuminh` | Đầm U Minh | U Minh | Bãi phụ (P) | 164-170 | `swamp` | 1800 | um_vongxuyen | - | `um_tram` |
| 74 | `um_tram` | Trấn U Đăng | U Minh | Trạm vùng (T) | - | `bamboo` + nhà wind | 1400 | um_quylam | - (Phu Xe từ cấp 160) | - |
| 75 | `th_vanhai` | Vân Hải Thiên Lộ | Tinh Hà | Bãi chính M1 (vào vùng) | 171-175 | `heaven` | 2000 | th_tinhlam, th_tram (cửa), um_vongxuyen | - | `th_tram` |
| 76 | `th_tinhlam` | Tinh Thạch Lâm | Tinh Hà | Bãi chính M2 | 172-177 | `crystal` | 2100 | th_vanhai, th_ngankieu, th_langdai (cửa) | - | `th_tram` |
| 77 | `th_ngankieu` | Ngân Hà Kiều | Tinh Hà | Bãi chính M3 (ra vùng) | 176-180 | `starfield` | 2200 | th_tinhlam, th_vanlo (cửa), hd_mathon | - | `th_tram` |
| 78 | `th_langdai` | Thiên Lang Tinh Đài | Tinh Hà | Bí cảnh vùng (D1) | 175-180 | `starfield` | 1700 | th_tinhlam | Đọa Thiên Tinh Quân `boss_th_tinhquan` 175 | `th_tram` |
| 79 | `th_vanlo` | Vân Lộ Tiên Kiều | Tinh Hà | Bãi phụ (P) | 174-180 | `heaven` | 1800 | th_ngankieu | - | `th_tram` |
| 80 | `th_tram` | Trạm Quan Tinh | Tinh Hà | Trạm vùng (T) | - | `heaven` + nhà wind | 1400 | th_vanhai | - (Phu Xe từ cấp 170) | - |
| 81 | `hd_mathon` | Hoang Vực Ma Thổ | Hỗn Độn | Bãi chính M1 (vào vùng) | 181-185 | `abyss` | 2000 | hd_huyettri, hd_tram (cửa), th_ngankieu | - | `hd_tram` |
| 82 | `hd_huyettri` | Huyết Trì Luyện Ngục | Hỗn Độn | Bãi chính M2 | 182-187 | `hell` | 2100 | hd_mathon, hd_madien, hd_tedan (cửa) | - | `hd_tram` |
| 83 | `hd_madien` | Huyết Nguyệt Ma Điện | Hỗn Độn | Bãi chính M3 (ra vùng) | 186-190 | `lava` | 2200 | hd_huyettri, hd_hukhong (cửa), tc_vanmon | - | `hd_tram` |
| 84 | `hd_tedan` | Tế Đàn Huyết Nguyệt | Hỗn Độn | Bí cảnh vùng (D1) | 185-190 | `hell` | 1700 | hd_huyettri | Thao Thiết Ma Thần `boss_hd_thaothiet` 185 | `hd_tram` |
| 85 | `hd_hukhong` | Hư Không Hải | Hỗn Độn | Bãi phụ (P) | 184-190 | `starfield` | 1800 | hd_madien | - | `hd_tram` |
| 86 | `hd_tram` | Trấn Hắc Thạch | Hỗn Độn | Trạm vùng (T) | - | `abyss` + nhà fire | 1400 | hd_mathon | - (Phu Xe từ cấp 180) | - |
| 87 | `tc_vanmon` | Vân Môn Thần Lộ | Thái Cực | Bãi chính M1 (vào vùng) | 191-197 | `heaven` | 2000 | tc_thuycanh, tc_tram (cửa), hd_madien | - | `tc_tram` |
| 88 | `tc_thuycanh` | Lưỡng Nghi Thủy Cảnh | Thái Cực | Bãi chính M2 | 192-198 | `dragon_palace` | 2100 | tc_vanmon, tc_thanhdien, tc_daonguyen (cửa) | - | `tc_tram` |
| 89 | `tc_thanhdien` | Thái Cực Thánh Điện | Thái Cực | Bãi chính M3 (ra vùng) | 193-199 | `heaven` | 2200 | tc_thuycanh, tc_bandao (cửa) | Hư Vô Ma Tôn `boss_tc_maton` 199 | `tc_tram` |
| 90 | `tc_daonguyen` | Bát Quái Đào Nguyên | Thái Cực | Bí cảnh vùng (D1) | 195-199 | `sakura` | 1700 | tc_thuycanh | Thái Âm Ngọc Hồ `boss_tc_ngocho` 195 | `tc_tram` |
| 91 | `tc_bandao` | Vườn Bàn Đào | Thái Cực | Bãi phụ (P) | 194-199 | `jade_peak` | 1800 | tc_thanhdien | - | `tc_tram` |
| 92 | `tc_tram` | Trấn Âm Dương | Thái Cực | Trạm vùng (T) | - | `jade_peak` + nhà water | 1400 | tc_vanmon | - (Phu Xe từ cấp 190) | - |

---

## 3. Sơ đồ kết nối

### 3.1 Đường chính Hạ Giới và các nhánh (ASCII)

Ký hiệu: `─` cổng mép, `⇢` cửa giữa bản đồ, `[ ]` làng/trạm, `◆n` boss cấp n, số trong ngoặc là cấp quái.

```
 #  ĐƯỜNG CHÍNH (trái → phải)        NHÁNH
 1  fire_field (1-5)
 2  [v_fire]                          ⇢ arena (PvP)
 3  bamboo (7-11) ◆12                 ⇢ sakura_garden (14-19) ◆22  ·  ⇢ ga_ruongbac (10-14)
 4  [v_water]                         ⇢ water_lake (1-5)
 5  coast (13-17)
 6  bat_cave (19-24) ◆28              ⇢ ga_modong (20-24) ─ ga_rungnam (24-28)
 7  [v_wind]                          ⇢ wind_hill (1-5)
 8  wasteland (26-31)                 ⇢ ancient_ruins (35-39) ◆42  ·  ⇢ ga_ocdao (30-34)
 9  misty_valley (33-39) ◆42          ⇢ ga_damhac (38-42)
10  snow_mountain (42-48)             ⇢ gb_tunglam (40-44) ─ gb_hanphong (44-48) ◆50
    ════════════ tờ 1 │ tờ 2 ════════════
11  [gb_bachtuyet] trạm 45+           ⇢ gb_bangho (50-54)
12  ice_peak (52-58) ◆62              ⇢ crystal_cave (56-61) ◆66
13  demon_forest (62-68)              ⇢ gc_baithama (60-64) ─ gc_damoan (66-70) ◆72
14  demon_cave (72-79) ◆85            ⇢ gc_lorenquy (70-74) ─ gc_concatdo (76-80)
15  hell_gate (83-95) ◆100            ⇢ gd_vancot (80-84) ─ gd_huyetho (86-90) ◆92
16  [gd_vanmon] trạm 85+              ⇢ gd_thachlam (90-94)
17  heaven (96-103)                   ⇢ ge_kimkhuyet (100-104) ─ ge_loivan (104-108)
18  abyss (106-112) ◆112              ⇢ ge_huvo (110-114) ─ ge_longmo (116-120)
19  dragon_palace (114-120) ◆125
    ════════════ tờ 2 │ tờ 3 ════════════  (cổng phải x2184 → bl_bichsa)
```

### 3.2 Thượng Giới (ASCII)

Mỗi dòng là một vùng; đường chính M1 ─ M2 ─ M3 nối tiếp sang M1 của dòng dưới.

```
 VÙNG        M1 (vào)          M2                 M3 (ra)             NHÁNH (⇢ cửa)
 bl 120-129  bl_bichsa       ─ bl_daohoa        ─ bl_thuyphu      ─┐  ⇢T bl_tram · ⇢D1 bl_thanlau ◆125 · ⇢P bl_ngocphong
 xv 130-139  xv_xichsa       ─ xv_dungnham      ─ xv_thandan      ─┤  ⇢T xv_tram · ⇢D1 xv_hoadiem ◆135 · ⇢P xv_hacdieu
 bn 140-149  bn_tuyetlinh    ─ bn_bangcoc       ─ bn_cothanh      ─┤  ⇢T bn_tram · ⇢D1 bn_bangho ◆145 · ⇢P bn_vannien
 hl 150-159  hl_hoangsa      ─ hl_mudao         ─ hl_diacung      ─┤  ⇢T hl_tram · ⇢D1 hl_quandien ◆155 · ⇢P hl_thachquan
             ════════════ tờ 3 │ tờ 4 ════════════                 │
 um 160-169  um_quylam       ─ um_hacmoc        ─ um_vongxuyen    ─┤  ⇢T um_tram · ⇢D1 um_saohuyet ◆165 · ⇢P um_damuminh
 th 170-179  th_vanhai       ─ th_tinhlam       ─ th_ngankieu     ─┤  ⇢T th_tram · ⇢D1 th_langdai ◆175 · ⇢P th_vanlo
 hd 180-189  hd_mathon       ─ hd_huyettri      ─ hd_madien       ─┤  ⇢T hd_tram · ⇢D1 hd_tedan ◆185 · ⇢P hd_hukhong
 tc 190-199  tc_vanmon       ─ tc_thuycanh      ─ tc_thanhdien ◆199   ⇢T tc_tram · ⇢D1 tc_daonguyen ◆195 · ⇢P tc_bandao
```
(T nối từ M1 x700, D1 nối từ M2 x1050, P nối từ M3 x700. M3 của vùng k nối M1 của vùng k+1 bằng cổng mép do `maps.js` tự thêm; M1 của vùng 1 nối `dragon_palace`.)

Trên tranh bản đồ thế giới, mỗi tờ 3-4 xếp 4 vùng theo hình chữ U: ô (cột 0, hàng 0) → (1, 0) → (1, 1) → (0, 1) (`sheet` của vùng ở mục 4.2).

### 3.3 Danh sách cạnh đầy đủ (91 cạnh)

`a — b` = cổng mép, `a ⇢ b` = cửa giữa bản đồ (thứ tự hai đầu không mang nghĩa; cạnh luôn đi được hai chiều).

**Tờ 1 (21 cạnh)**: `ancient_ruins` ⇢ `wasteland` · `arena` ⇢ `v_fire` · `bamboo` ⇢ `ga_ruongbac` · `bamboo` ⇢ `sakura_garden` · `bamboo` — `v_fire` · `bamboo` — `v_water` · `bat_cave` — `coast` · `bat_cave` ⇢ `ga_modong` · `bat_cave` — `v_wind` · `coast` — `v_water` · `fire_field` — `v_fire` · `ga_damhac` ⇢ `misty_valley` · `ga_modong` — `ga_rungnam` · `ga_ocdao` ⇢ `wasteland` · `gb_hanphong` — `gb_tunglam` · `gb_tunglam` ⇢ `snow_mountain` · `misty_valley` — `snow_mountain` · `misty_valley` — `wasteland` · `v_water` ⇢ `water_lake` · `v_wind` — `wasteland` · `v_wind` ⇢ `wind_hill`

**Tờ 2 (21 cạnh)**: `abyss` — `dragon_palace` · `abyss` ⇢ `ge_huvo` · `abyss` — `heaven` · `crystal_cave` ⇢ `ice_peak` · `demon_cave` — `demon_forest` · `demon_cave` ⇢ `gc_lorenquy` · `demon_cave` — `hell_gate` · `demon_forest` ⇢ `gc_baithama` · `demon_forest` — `ice_peak` · `gb_bachtuyet` ⇢ `gb_bangho` · `gb_bachtuyet` — `ice_peak` · `gc_baithama` — `gc_damoan` · `gc_concatdo` — `gc_lorenquy` · `gd_huyetho` — `gd_vancot` · `gd_thachlam` ⇢ `gd_vanmon` · `gd_vancot` ⇢ `hell_gate` · `gd_vanmon` — `heaven` · `gd_vanmon` — `hell_gate` · `ge_huvo` — `ge_longmo` · `ge_kimkhuyet` — `ge_loivan` · `ge_kimkhuyet` ⇢ `heaven`

**Tờ 3 (23 cạnh)**: `bl_bichsa` — `bl_daohoa` · `bl_bichsa` ⇢ `bl_tram` · `bl_daohoa` ⇢ `bl_thanlau` · `bl_daohoa` — `bl_thuyphu` · `bl_ngocphong` ⇢ `bl_thuyphu` · `bl_thuyphu` — `xv_xichsa` · `bn_bangcoc` ⇢ `bn_bangho` · `bn_bangcoc` — `bn_cothanh` · `bn_bangcoc` — `bn_tuyetlinh` · `bn_cothanh` ⇢ `bn_vannien` · `bn_cothanh` — `hl_hoangsa` · `bn_tram` ⇢ `bn_tuyetlinh` · `bn_tuyetlinh` — `xv_thandan` · `hl_diacung` — `hl_mudao` · `hl_diacung` ⇢ `hl_thachquan` · `hl_hoangsa` — `hl_mudao` · `hl_hoangsa` ⇢ `hl_tram` · `hl_mudao` ⇢ `hl_quandien` · `xv_dungnham` ⇢ `xv_hoadiem` · `xv_dungnham` — `xv_thandan` · `xv_dungnham` — `xv_xichsa` · `xv_hacdieu` ⇢ `xv_thandan` · `xv_tram` ⇢ `xv_xichsa`

**Tờ 4 (23 cạnh)**: `hd_hukhong` ⇢ `hd_madien` · `hd_huyettri` — `hd_madien` · `hd_huyettri` — `hd_mathon` · `hd_huyettri` ⇢ `hd_tedan` · `hd_madien` — `tc_vanmon` · `hd_mathon` ⇢ `hd_tram` · `hd_mathon` — `th_ngankieu` · `tc_bandao` ⇢ `tc_thanhdien` · `tc_daonguyen` ⇢ `tc_thuycanh` · `tc_thanhdien` — `tc_thuycanh` · `tc_thuycanh` — `tc_vanmon` · `tc_tram` ⇢ `tc_vanmon` · `th_langdai` ⇢ `th_tinhlam` · `th_ngankieu` — `th_tinhlam` · `th_ngankieu` ⇢ `th_vanlo` · `th_tinhlam` — `th_vanhai` · `th_tram` ⇢ `th_vanhai` · `th_vanhai` — `um_vongxuyen` · `um_damuminh` ⇢ `um_vongxuyen` · `um_hacmoc` — `um_quylam` · `um_hacmoc` ⇢ `um_saohuyet` · `um_hacmoc` — `um_vongxuyen` · `um_quylam` ⇢ `um_tram`

**Nối hai tờ (3 cạnh)**: `gb_bachtuyet` — `snow_mountain` (tờ 2 ↔ 1) · `bl_bichsa` — `dragon_palace` (tờ 3 ↔ 2) · `hl_diacung` — `um_quylam` (tờ 3 ↔ 4)

---

## 4. Vùng: hình ảnh, âm nhạc, quái, boss, trạm

Nhạc nền lấy theo theme qua bảng `MUSIC_THEME` (`src/shared/data/audio.js`, đã có); khi đánh boss dùng cảnh `boss` (`MUSIC_SCENE`). Trạm phát nhạc làng theo `townStyle` (mục 10.4). Ba theme mới tạm dùng nhạc có sẵn (mục 5.3) tới khi `snd-content-199` có bản riêng.

### 4.1 Hạ Giới (5 khu mở rộng)

| Khu | Chủ đề hình ảnh | Nhạc (theo theme) | Quái đặc trưng | Boss | Trạm |
|---|---|---|---|---|---|
| `ga` Tam Thôn ngoại vi (10-42) | Ruộng bậc thang gió lộng, mỏ đồng có đuốc, rừng nấm ma phát sáng, ốc đảo cọ giữa sa mạc, đầm hắc thủy đầu tiên (`swamp`) | `field_grass`, `field_cave`, `field_mist`, `field_desert`, `swamp` → `field_mist` | Cóc Vàng, Bù Nhìn Rơm, Ma Trơi, Nấm Lân Tinh, Mộc Hồn, Sa Châu Thương Tặc, Cá Sấu Đầm, Thủy Quỷ (15 loại) | - | - |
| `gb` Bạch Tuyết Sơn (40-54) | Rừng tùng tuyết, hẻm gió lạnh, hồ băng như gương; trạm tuyết mái lam | `field_snow` | Cáo Tuyết, Cú Tuyết, Lâm Tặc Tuyết Sơn, Tê Giác Băng, Hàn Băng Võ Sĩ, Thiên Nga Băng (9 loại) | Băng Hà Cự Tượng 50 (Băng Hà Chấn quake ×1,7; Hàn Phong Hống roar chậm 40%; gọi 2 Tê Giác Băng) | Trấn Bạch Tuyết (45+) |
| `gc` Ma Lâm Hỏa Địa (60-80) | Bãi tha ma bia nghiêng, đầm oan hồn (`swamp`), lò rèn quỷ đe sắt, cồn cát đỏ than hồng | `field_mist`, `field_lava`, `field_desert` | Hành Thi, Quạ Địa Phủ, Ma Hời, Thiềm Thừ Độc, Thợ Rèn Quỷ, Hỏa Lang, Viêm Ma (12 loại) | Hắc Trạch Thi Vương 72 (Thi Độc Trụ pillar ×1,7; gọi 3 Hành Thi; Thi Hống roar) | - |
| `gd` Vân Môn (80-94) | Huyệt xương, hồ máu, trấn trên mây mái đỏ, rừng đá vôi ngọc (`jade_peak`) | `field_cave`, `field_hell`, trạm `village_fire`, `jade_peak` → `field_bamboo` | Cốt Lang, Cốt Binh, Huyết Xà, Huyết Linh, Ma Kỵ Binh, Hạc Thần, Thạch Tướng Quân (9 loại) | Huyết Ma Vương 92 (Huyết Quang Tuyến beam ×1,8; Huyết Chấn quake ×1,7; gọi 2 Huyết Linh; rơi thêm `stone4`) | Trấn Vân Môn (85+) |
| `ge` Thiên Ngoại (100-120) | Đài vàng giữa mây, đỉnh sấm ngọc bích, động hư vô tinh thể tím, mộ rồng | `field_heaven`, `field_crystal`, `field_sea`, `jade_peak` → `field_bamboo` | Kim Hầu, Thiên Khuyển, Kim Giáp Thần Binh, Lôi Ưng, Hư Kiếm Khách, Long Hồn, Long Mộ Vệ (12 loại) | - (boss cũ Thiên Ma 112, Long Vương 125 ở bản đồ cũ kề bên) | - |

### 4.2 Thượng Giới: thông số vùng

| # | id tính năng | key · tiền tố | Tên vùng | Cấp vùng / quái | Hệ | Ô trên tờ (`sheet`) | Theme M1 / M2 / M3 / D1 / P / T |
|---|---|---|---|---|---|---|---|
| 1 | `world-region-bonglai` | `bonglai` · `bl` | Quần Đảo Bồng Lai | 120 / 121-130 | Thủy | `{ s: 3, col: 0, row: 0 }` | beach / sakura / dragon_palace / lake / jade_peak / beach + nhà water |
| 2 | `world-region-xichviem` | `xichviem` · `xv` | Xích Viêm Hỏa Vực | 130 / 131-140 | Hỏa | `{ s: 3, col: 1, row: 0 }` | desert / lava / hell / lava (biến thể) / cave / desert + nhà fire |
| 3 | `world-region-bangnguyen` | `bangnguyen` · `bn` | Vạn Niên Băng Nguyên | 140 / 141-150 | Thủy | `{ s: 3, col: 1, row: 1 }` | snow / ice / crystal / ice (biến thể) / mist / snow + nhà water |
| 4 | `world-region-hoanglang` | `hoanglang` · `hl` | Thiên Cổ Hoàng Lăng | 150 / 151-160 | Hỏa | `{ s: 3, col: 0, row: 1 }` | desert / ruins / cave / ruins (biến thể) / jade_peak / ruins + nhà fire |
| 5 | `world-region-uminh` | `uminh` · `um` | U Minh Quỷ Lâm | 160 / 161-170 | Phong | `{ s: 4, col: 0, row: 0 }` | mist / dark_forest / bamboo / dark_forest (biến thể) / swamp / bamboo + nhà wind |
| 6 | `world-region-tinhha` | `tinhha` · `th` | Tinh Hà Thiên Lộ | 170 / 171-180 | Phong | `{ s: 4, col: 1, row: 0 }` | heaven / crystal / starfield / starfield / heaven (biến thể) / heaven + nhà wind |
| 7 | `world-region-hondon` | `hondon` · `hd` | Hỗn Độn Ma Vực | 180 / 181-190 | Hỏa | `{ s: 4, col: 1, row: 1 }` | abyss / hell / lava / hell (biến thể) / starfield / abyss + nhà fire |
| 8 | `world-region-thaicuc` | `thaicuc` · `tc` | Thái Cực Thần Cảnh | 190 / 191-199 | Thủy | `{ s: 4, col: 0, row: 1 }` | heaven / dragon_palace / heaven / sakura / jade_peak / jade_peak + nhà water |

**Chủ đề hình ảnh và âm nhạc** (ý tưởng lấy từ `20-monsters.md` mục 4):

| Vùng | Chủ đề hình ảnh | Nhạc nền (theo theme) | Nhạc trạm |
|---|---|---|---|
| Bồng Lai | Đảo tiên giữa biển sương: sứa phát sáng, cá chuồn bạc, hạc đỏ đỉnh, ngư nhân tuần biển; bí cảnh là lâu đài ảo trên mặt hồ (hải thị thận lâu) | `field_beach`, `field_sakura`, `field_sea` | `village_water` |
| Xích Viêm | Sa mạc đỏ dẫn vào miệng núi lửa: nham tương sống, bướm lửa, giun dung nham, ma hỏa lam | `field_desert`, `field_lava`, `field_hell`, `field_cave` | `village_fire` |
| Băng Nguyên | Thảo nguyên băng vạn năm và biển băng phương bắc: thỏ tuyết, sói tuyết, vượn khổng lồ, giao long băng | `field_snow`, `field_crystal`, `field_mist` | `village_water` |
| Hoàng Lăng | Lăng mộ đế vương vùi trong cát: tượng đất nung, cương thi dán bùa, sư tử đá, thú trấn mộ đồng xanh | `field_desert`, `field_ruins`, `field_cave` | `village_fire` |
| U Minh | Rừng âm u sương độc: nấm lân quang, quạ đen, cây yêu, nhện mặt quỷ, sứ giả câu hồn; đầm đen có đom đóm | `field_mist`, `field_dark`, `field_bamboo` | `village_wind` |
| Tinh Hà | Con đường mây dọc dải ngân hà: tinh linh sao, thỏ ngọc, chim loan, cầu sao (`starfield`) | `field_heaven`, `field_crystal` | `village_wind` |
| Hỗn Độn | Vực hỗn độn trước khi trời đất phân chia: tiểu ma, ong ma, long xương lửa, La Sát; biển hư không đầy sao | `field_abyss`, `field_hell`, `field_lava` | `village_fire` |
| Thái Cực | Cõi thần âm dương hòa hợp: linh chi vạn năm, tiên tử hoa đào, bạch hổ, huyền vũ, thiên tướng; vườn đào tiên trên núi ngọc | `field_heaven`, `field_sea`, `field_sakura` | `village_water` |

**Quái và boss** (id và chỉ số ở `20-monsters.md` mục 4; mỗi vùng 9 loại quái thường, chỉ số sinh từ công thức chung, không tự đặt):

| Vùng | Quái thường (cấp) | Boss vùng ở D1 x850 (cấp, chiêu) |
|---|---|---|
| Bồng Lai | Lưu Quang Thủy Mẫu 121, Ngân Lân Phi Ngư 122, Ốc Mượn Hồn Ngũ Sắc 123, Ngư Nhân Tuần Hải 124, Hồng San Cự Linh 125, Đan Đỉnh Tiên Hạc 126, Hải Dạ Xoa 127, Thanh Khâu Linh Hồ 128, Bồng Lai Tiên Vệ 130 | Hải Thị Thận Long `boss_bl_thanlong` 125: Thận Khí Tuyến (beam ×1,9), Ảo Cảnh Hống (roar, chậm 35%), gọi 2 Hải Dạ Xoa |
| Xích Viêm | Nham Tương Tinh 131, Hỏa Điệp Tiên 132, Dung Nham Địa Trùng 133, Xích Sa Đao Khách 134, Xích Diệm Độc Hạt 135, Luyện Thạch Cự Nhân 136, Xích Viêm Hỏa Lang 137, U Lam Quỷ Hỏa 138, Hỏa Vực Ma Tướng 140 | Xích Diệm Dung Thần `boss_xv_dungthan` 135: Dung Nham Chấn (quake ×1,8), Hỏa Sơn Trụ (pillar ×1,9), gọi 3 Nham Tương Tinh |
| Băng Nguyên | Vạn Niên Tuyết Thố 141, Hàn Băng Biên Bức 142, Tuyết Quái Hàn Lão 143, Băng Giáp Giải 144, Bắc Minh Tuyết Lang 145, Băng Nguyên Cự Viên 146, Hàn Phách U Linh 147, Tuyết Nguyên Liệp Nhân 148, Huyền Băng Giao Long 150 | Bắc Minh Thiên Lang `boss_bn_thienlang` 145: Hàn Băng Liệt Địa (quake line ×1,8), Bắc Minh Băng Bạo (nova ×2), gọi 2 Tuyết Lang |
| Hoàng Lăng | Thiên Cổ Đào Dũng 151, Lăng Mộ Huyết Bức 152, Thiên Cổ Cương Thi 153, Kim Giáp Thánh Trùng 154, Kim Lân Thủ Lăng Xà 155, Lăng Tẩm Oán Linh 156, Thạch Sư Trấn Mộ 157, Bạch Cốt Ngự Lâm Quân 158, Thanh Đồng Trấn Mộ Thú 160 | Vạn Cổ Thi Hoàng `boss_hl_thihoang` 155: Hoàng Lăng Thiên Trụ (pillar ×1,9), gọi 3 Cương Thi, Thi Khí Bạo (nova ×2) |
| U Minh | Lân Quang Ma Cô 161, U Minh Hắc Nha 162, Quỷ Mộc Yêu Thụ 163, Bích Lân Quỷ Hỏa 164, U Minh Hắc Hồ 165, Quỷ Diện Chu 166, U Minh Câu Hồn Sứ 167, Quỷ Lâm Huyết Hầu 168, Quỷ Lâm Đao Khách 170 | Sơn Tiêu Quỷ Vương `boss_um_sontieu` 165: Quỷ Lâm Chấn (quake ×1,7), Sơn Tiêu Khiếu (roar, chậm 40%), U Minh Bạo (nova ×2) |
| Tinh Hà | Tinh Đẩu Linh 171, Nguyệt Cung Ngọc Thố 172, Thanh Loan Tiên Điểu 173, Tinh Hà Thủ Vệ 174, Lưu Ly Tinh Thạch 175, Ngân Hà Vân Linh 176, Tinh Giáp Cự Giải 177, Tinh Hà Ứng Long 178, Thất Tinh Kiếm Khách 180 | Đọa Thiên Tinh Quân `boss_th_tinhquan` 175: Lưu Tinh Trụy (pillar ×1,9), Ngân Hà Tuyến (beam ×1,8), gọi 2 Tinh Hà Thủ Vệ |
| Hỗn Độn | Hỗn Độn Tiểu Ma 181, Hỗn Độn Ma Phong 182, Phệ Hồn Ma Trùng 183, Ma Vực Thiết Kỵ 184, Hắc Diệu Thạch Ma 185, Hỗn Độn Oán Hồn 186, Cốt Viêm Ma Long 187, Ma Vực La Sát 188, Diệt Thế Ma Tướng 190 | Thao Thiết Ma Thần `boss_hd_thaothiet` 185: Thôn Thiên Chấn (quake ×1,8), Thao Thiết Phệ Thiên (nova ×2), gọi 3 Tiểu Ma |
| Thái Cực | Vạn Niên Linh Chi 191, Đào Hoa Tiên Tử 192, Bạch Ngọc Thần Tượng 193, Thanh Giao Thần Cảnh 194, Âm Dương Linh Thể 195, Thần Cảnh Kim Giáp Vệ 196, Thần Cảnh Bạch Hổ 197, Huyền Vũ Thần Quy 198, Thái Cực Thiên Tướng 199 | Thái Âm Ngọc Hồ `boss_tc_ngocho` 195 ở D1: Nguyệt Hoa Tuyến (beam ×1,9), Thái Âm Bạo (nova ×2), Cửu Vĩ Mê Hồn (roar, chậm 40%). **Boss cuối** Hư Vô Ma Tôn `boss_tc_maton` 199 ở M3 `tc_thanhdien` x1700: Thái Cực Thiên Phạt (pillar ×1,9), Âm Dương Liệt Địa (quake line ×1,8), gọi 2 Thiên Tướng |

Boss vùng rơi: luôn `['stone4', 1]`; vùng 1-3 thêm `books(120, 0.03)`; vùng 4-8 thêm `books(120, 0.02)` và `books(150, 0.03)`; khe rơi thú cưỡi/thú cưng do `60-mounts-pets.md` thêm sau (lô L1 của PLAN).

**Trạm, NPC và vật phẩm nhiệm vụ**:

| Vùng | Trạm (T) và 5 NPC `tele · potion · smith · storage · task` | M1: Trưởng lão (x220) · Kỳ nhân (x340) | Vật phẩm nhiệm vụ (quái rơi) |
|---|---|---|---|
| Bồng Lai | `bl_tram` Trấn Vọng Hải: Phu Thuyền Lão Ngư · Y Nữ San Hô · Thợ Rèn Kình Lãng · Thủ Kho Bến Cảng · Tiểu Nhị Sóng Bạc | Tiên Ông Bạch Hạc · Ngư Ông Lục Bình | Vỏ Ốc Ngũ Sắc, Lông Tiên Hạc, Nanh Dạ Xoa |
| Xích Viêm | `xv_tram` Trấn Xích Thạch: Phu Xe Hỏa Mã · Y Nữ Hồng Liên · Thợ Rèn Viêm Chùy · Thủ Kho Thạch Khố · Tiểu Nhị Than Hồng | Hỏa Công Đầu Đà · Đan Sư Hồng Lô | Nham Tinh, Đuôi Độc Hạt, Lam Diễm Châu |
| Băng Nguyên | `bn_tram` Hàn Băng Trấn: Phu Xe Tuần Lộc · Y Nữ Băng Tâm · Thợ Rèn Băng Chùy · Thủ Kho Băng Khố · Tiểu Nhị Đông Tuyết | Băng Tâm Sư Thái · Liệp Hộ Bạch Mao | Lông Tuyết Thố, Nanh Tuyết Lang, Hàn Phách Thạch |
| Hoàng Lăng | `hl_tram` Trấn Thủ Lăng: Phu Xe Hoàng Lộ · Y Nữ Hương Trầm · Thợ Rèn Đồng Xanh · Thủ Kho Cổ Vật · Tiểu Nhị Cát Vàng | Thủ Lăng Lão Nhân · Thư Sinh Mặc Văn | Mảnh Đào Dũng, Bùa Trấn Thi, Ngọc Ấn Hoàng Lăng |
| U Minh | `um_tram` Trấn U Đăng: Phu Xe Đom Đóm · Y Nữ Thảo Dược · Thợ Rèn Mộc Thiết · Thủ Kho Tre Già · Tiểu Nhị Lá Trúc | Thanh Đăng Đạo Nhân · Tiều Phu Mạc Sầu | Bào Tử Lân Quang, Tơ Quỷ Chu, Câu Hồn Liên |
| Tinh Hà | `th_tram` Trạm Quan Tinh: Phu Xe Thiên Mã · Y Nữ Nguyệt Quế · Thợ Rèn Tinh Thiết · Thủ Kho Ngân Hà · Tiểu Nhị Sao Băng | Quan Tinh Lão Tổ · Tiên Nữ Vân Cẩm | Tinh Sa, Tinh Vân La, Mảnh Tinh Giáp |
| Hỗn Độn | `hd_tram` Trấn Hắc Thạch: Phu Xe Ma Mã · Y Nữ Huyết Liên · Thợ Rèn Hắc Diệm · Thủ Kho Thâm Uyên · Tiểu Nhị Tro Than | Phá Ma Thiền Sư · Ma Nữ Dạ Lan | Ma Tinh Hỗn Độn, Oán Hồn Châu, Sừng La Sát |
| Thái Cực | `tc_tram` Trấn Âm Dương: Phu Xe Tiên Hạc · Y Nữ Tiên Thảo · Thợ Rèn Thần Binh · Thủ Kho Bát Quái · Tiểu Nhị Thanh Phong | Thái Cực Chân Nhân · Tiên Đồng Ngọc Hư | Linh Chi Tiên Thảo, Âm Dương Châu, Mai Huyền Vũ |

NPC trạm dùng câu thoại sẵn có của từng loại (xưng "ta", gọi "ngươi"); cửa hàng ở trạm giống cửa hàng làng theo loại NPC. Trưởng lão (`elder`) và Kỳ nhân (`hermit`) của M1 phục vụ nhiệm vụ chính và Kỳ Duyên (`08-cot-truyen.md`).

---

## 5. Theme mới, biến thể theo bản đồ, nhạc tạm

Phần vẽ thuộc `art-themes-new` (`09-my-thuat-am-thanh.md`, đặc tả chi tiết: `content/10-world.md` mục 7). Lý do thêm theme: ADR-07-3.

### 5.1 Ba theme mới

| Theme | Ý tưởng | Dùng ở | Lớp cảnh (chỉ loại đã có) | Hạt | Cổng | Màu trên tranh `REGION` · glyph |
|---|---|---|---|---|---|---|
| `swamp` | Đầm nước đen phủ bèo, rễ đước, sương sát mặt nước, đom đóm xanh vàng; ngày âm u, đêm tối | `ga_damhac`, `gc_damoan`, `um_damuminh` | `hills`, `trees` (liễu, cây chết), `props` (gốc mục, đá rêu), mặt nước tối phản chiếu mờ, sương `fogA 0.18` | `firefly` | `#b6ff7a` | `#8a9a6e` · `swamp` (sậy + gốc chết trên nước) |
| `starfield` | Con đường lát ngọc giữa Ngân Hà: trời tím chàm 220 sao, dải sao chéo trời, tinh vân, cột đá trôi | `th_ngankieu`, `th_langdai`, `hd_hukhong` (biến thể hạt `void`) | `mount` dốc, `clouds` bảng tím, `colonnade` thưa; mặt đất `cloud` | `sparkle` | `#ffd76a` | `#8a84c8` · `star` (sao 4 cánh) |
| `jade_peak` | Rừng đá vôi màu ngọc như tranh thủy mặc, mây quấn sườn, tùng trên đỉnh, hồ ngọc | `gd_thachlam`, `ge_loivan`, `bl_ngocphong`, `hl_thachquan` (biến thể đá mộ), `tc_bandao` (biến thể đào), `tc_tram` | 2 lớp `karst` màu ngọc, `trees` tùng + trúc thưa, mặt đất `rock` | `mist` | `#7affd8` | `#9ccab4` · `karst` (2 cột đá) |

Ràng buộc: không viết bộ vẽ mới; `starfield` vẽ 220 sao một lần vào canvas trời (như `stars: 140` của `dark_forest`), không tốn mỗi khung; `npm run test:perf` trên `th_ngankieu` giữ ≈ 60 khung hình/giây, CPU ≤ 8 ms/khung.

### 5.2 Biến thể theo bản đồ (`MAP_VARIANTS`)

39 dòng mới (15 Hạ Giới, 24 Thượng Giới) đổi hạt và đổi loại trang trí theo id bản đồ, giữ dòng `sakura_garden` cũ. Luật thiết kế: hai bản đồ cùng theme trong cùng vùng phải khác nhau ở ít nhất một biến thể (ngoại lệ hiện có: `th_ngankieu`/`th_langdai`, câu hỏi mở Q6). Trạm dùng theme bãi nhưng vẽ nhà như làng theo `townStyle` (1 dòng trong `MapRenderer`). Danh sách đủ: `content/10-world.md` mục 7.6.

### 5.3 Nhạc tạm cho theme mới (sửa phát hiện D2)

`src/shared/data/audio.js`, thêm vào `MUSIC_THEME` cùng lô với 3 theme (bắt buộc, nếu không `npm run check` báo lỗi ở khối Âm thanh):

| Theme | Nhạc tạm | Lý do |
|---|---|---|
| `swamp` | `field_mist` | không khí âm u, sương |
| `starfield` | `field_heaven` | cõi trời, nhịp chậm |
| `jade_peak` | `field_bamboo` | chất liệu tre trúc, núi rừng sáng |

`snd-content-199` (GĐ 7) có thể thay bằng bản riêng `field_swamp`, `field_star`, `field_jade`; khi đó chỉ đổi 3 dòng này.

---

## 6. Dịch chuyển

### 6.1 Phu Xe 2 trang

Có 13 NPC Phu Xe (`tele`): 3 làng, 2 trạm Hạ Giới, 8 trạm Thượng Giới. Mọi Phu Xe dùng chung hội thoại 2 trang; cơ chế máy chủ thuộc `world-home` (`05-he-thong-pve.md`), phần trang Thượng Giới thuộc `world-upper`. Đặc tả mã: `content/10-world.md` mục 4.6.

| Trang | Đích | Điều kiện hiện | Phí | Ghi chú |
|---|---|---|---|---|
| 1 "Hạ Giới" | 3 làng (`go:v_fire`, `go:v_water`, `go:v_wind`) | trừ làng đang đứng | 300 xu; **miễn phí dưới cấp 20** | như cũ |
| 1 | Trấn Bạch Tuyết `go:gb_bachtuyet` | cấp ≥ 45, không đang đứng ở đó | 1.000 xu | |
| 1 | Trấn Vân Môn `go:gd_vanmon` | cấp ≥ 85 | 1.000 xu | |
| 1 | nút "Thượng Giới ▸" (`page:1`) | có ≥ 1 vùng đã có bản đồ và cấp ≥ `r.lv` | - | |
| 2 "Thượng Giới" | trạm của vùng `go:@<key>` (ví dụ `go:@bonglai` → `bl_tram`) | vùng có bản đồ, cấp ≥ `r.lv`, không đang đứng ở trạm đó | 5.000 xu | vùng chưa có trạm thì về `r.entry` |
| 2 | nút "◂ Hạ Giới" (`page:0`) | luôn | - | |

Câu thoại trang 1: "Ngươi muốn đi đâu? Ninja dưới cấp 20 về làng miễn phí. Cấp 120 trở lên ta đưa tới Thượng Giới." Trang 2: "Thượng Giới hiểm trở, ta chỉ đưa ngươi tới trạm của vùng ngươi đủ sức đặt chân." Phí trừ bằng `p.payXu(cost)` (xu khóa trước) khi `eco-bound` đã vào; trước đó trừ `p.c.xu`. Đi bộ luôn miễn phí.

Kết quả: từ bất kỳ làng/trạm nào, người chơi tới được **mọi thị trấn** (3 làng + 10 trạm) mình đủ cấp bằng một lần nói chuyện; từ trạm vùng tới bản đồ xa nhất của vùng ≤ 4 lần qua cổng.

### 6.2 Về làng và điểm về

Cuộn Về Làng (`scroll_home`), cổng `@home` và hồi sinh "về làng" đều đưa tới `home` của bản đồ đang đứng (mục 1.3); đứng trong trạm dùng bùa thì về làng của phái (hai lần bùa là về tới làng). Trong phó bản/lôi đài vẫn về làng như cũ. Thuộc `world-home`.

### 6.3 Tự tìm đường qua 92 bản đồ

- `game/pathfind.js` (`findRoute`, `routeMaps`, `questDest`, `dailyDest`, `mapsWithMob`, `mapsWithNpc`) đọc `portals` từ `S.G.maps`, nên tự đúng với bản đồ mới, trạm chen giữa và cổng đổi đích; **không** đổi chữ ký.
- Lộ trình đi qua tờ khác: cửa sổ bản đồ thế giới vẽ tới dấu cổng tờ và cho dấu đó nhấp nháy (mục 7).
- Đích nhiệm vụ ở Thượng Giới (`questDest`) cho kết quả đúng kể cả khi đi bộ 40 bản đồ; người chơi tự quyết dùng Phu Xe. Gợi ý Phu Xe trong khung theo dõi nhiệm vụ là việc của `ui-*` (không thuộc mục này).
- Bí địa và lối tắt của `world-hidden` chỉ vào lộ trình khi người chơi đủ điều kiện (mục 10.9, ADR-07-4).

---

## 7. Bản đồ thế giới 4 tờ

Chi tiết mã: `content/10-world.md` mục 8 (thay cho `00-foundation.md` mục 6.9). Thuộc `world-upper`.

| Tờ | Tên tab | Cấp | Nút | Biển (elip `[cx, cy, rx, ry]`) | Trang trí |
|---|---|---|---|---|---|
| 1 | Tam Thôn 1-50 | 1-50 | 22 | `[154,172,50,31]`, `[-6,62,34,30]` | la bàn chuyển sang (20, 20) |
| 2 | Trung Châu 50-120 | 50-120 | 22 | `[30,176,62,34]` | - |
| 3 | Tiên Châu 120-160 | 120-160 | 24 | `[40,2,74,18]` | - |
| 4 | Thần Vực 160-199 | 160-199 | 24 | không | ≈ 40 chấm sao vàng nhạt rắc theo `vnoise` |

- Tranh 280×160; tọa độ nút: bản đồ mới lấy từ `S.G.maps[id].wm = { s, x, y, lb }` (dữ liệu máy chủ gửi, ADR-07-2); bản đồ cũ lấy `WORLD_LAYOUT` (thêm `s`, 8 nút chuyển sang tờ 2 với tọa độ mới: `ice_peak (72,28)`, `crystal_cave (66,64)`, `demon_forest (124,30)`, `demon_cave (176,28)`, `hell_gate (230,30)`, `heaven (244,114)`, `abyss (170,122)`, `dragon_palace (90,124)`).
- Dấu cổng tờ (`SHEET_GATES`): `[1→2 tại (236,16)]`, `[2→1 (12,16)]`, `[2→3 (30,140)]`, `[3→2 (10,80)]`, `[3→4 (10,150)]`, `[4→3 (10,80)]`; glyph cuộn giấy 9×9 (giấy `#f6e6bc`, viền `#9a6a36`, dây đỏ `#c0301a`), nhãn "▸ <tên tờ>", bấm thì sang tờ đó.
- Trạm: glyph nhà, màu mái theo `townStyle` (`fire #d84a2c`, `water #3c86c9`, `wind #4f9a3c`).
- Nhãn dài (tối đa 21 ký tự, ví dụ "Huyết Nguyệt Ma Điện") xuống 2 dòng khi > 14 ký tự, tách ở dấu cách gần giữa nhất.
- `buildWorldMap({ cur, questMaps, partyMaps, eventMaps, onGo, sheet, onSheet })`: chỉ **thêm** 2 tham số tùy chọn; nền mỗi tờ cache riêng (`Map` theo tờ).
- Cửa sổ (`windows/map.js`): hàng tab `[data-wmsheet="1|2|3|4"]`, tab 3/4 chỉ hiện khi tờ có ít nhất một bản đồ; mặc định mở tờ chứa bản đồ đang đứng, nhớ tờ đang xem trong `this._wmSheet`; dưới tranh là hàng chip chú thích vùng (tờ 3-4: 4 vùng + cấp; tờ 1-2: "Làng", "Trạm Bạch Tuyết 45+", "Trạm Vân Môn 85+"), bấm chip thì chọn trạm/cổng vào trên tranh. Chân cửa sổ: "Chọn bản đồ để tự tìm đường · Phu Xe ở làng và trạm đưa tới làng, trạm Hạ Giới và Thượng Giới."
- Điện thoại: tab và chip cao ≥ 44px; hàng tab cuộn ngang trong khung, trang không tràn ngang.

---

## 8. Chia khu bản đồ

Đặc tả hành vi thuộc `world-channels` (`05-he-thong-pve.md`), phần kỹ thuật (lọc gói `state` theo khung nhìn, ADR-R-3 của kiểm kê) ở `ops-state-culling` và mục vận hành `10-ky-thuat-van-hanh.md`. Mục 7 cam kết các điểm sau để hai bên khớp:

| Điểm | Cam kết của mục Thế giới |
|---|---|
| Bản đồ được chia khu | làng, trạm, mọi bãi và bí cảnh vùng (91 bản đồ); **không** chia Đấu Trường (`arena`, PvP tự do cần đông) và mọi phó bản (đã là bản sao) |
| Dữ liệu | không thêm trường bản đồ; khu là thể hiện thứ k của cùng định nghĩa (id dạng `<map>#k`, giống `loidai#n`); cổng, `home`, Phu Xe luôn đưa vào khu được chọn bởi `world-channels` |
| Boss bản đồ | 23 boss bản đồ hồi sinh độc lập theo từng khu (mỗi khu là một `GameMap`); boss sự kiện (Hung Tinh, Tà Thú) chỉ gọi ở khu 1 của bản đồ được chọn |
| Bản đồ thế giới | cửa sổ bản đồ (`windows/map.js`) chừa một hàng dưới chip vùng cho nút "Đổi khu" của `world-channels`; `world-upper` không dùng id DOM mới nên không vướng |
| Sức chứa | theo `03-doi-chieu.md` D50: khu tự mở khi bản đồ > 40 người (trần cứng 60), khu trống 5 phút tự đóng |

---

## 9. Bí cảnh và phó bản theo mốc cấp

"Bí cảnh vùng" (D1) là bản đồ thế giới mở, ai cũng vào; "phó bản" là bản sao riêng (`instance`) do module khác quản lý, không tính vào 92 bản đồ và không có tọa độ trên tranh. Đặc tả phó bản: `05-he-thong-pve.md`.

| Dải cấp | Bãi (số) | Boss bản đồ (thế giới mở) | Phó bản / hoạt động bản sao mở từ dải này | Boss sự kiện |
|---|---|---|---|---|
| 1-10 | 5 | Vua Slime 12 | Hang Động Thử Thách (`pve-dungeon`, cấp 10) | |
| 11-20 | 6 | Cửu Vĩ Hồ 22 | | |
| 21-30 | 5 | Dơi Chúa 28 | Hang Thạch Nhũ 30-59 (`pve-caves`), Chiến Trường 30+ (`pvp-battlefield`), Tháp Vô Tận 30+ (`pve-thapvotan`) | Hung Tinh dải 25 |
| 31-40 | 6 | Lang Vương 42, Pharaoh Phục Sinh 42 | | Tà Thú Hắc Viêm 32 |
| 41-50 | 5 | Băng Hà Cự Tượng 50 | | Hung Tinh dải 45 |
| 51-60 | 4 | Tuyết Quái Vương 62 | Hàn Băng Động 60-89 (`pve-caves`) | Tà Thú Băng Phách 60 |
| 61-70 | 5 | Tinh Thể Vương 66, Hắc Trạch Thi Vương 72 | | Hung Tinh dải 65 |
| 71-80 | 4 | Quỷ Vương 85 | | |
| 81-90 | 4 | Huyết Ma Vương 92 | Luyện Ngục Động 90-120 (`pve-caves`) | Hung Tinh dải 88 |
| 91-100 | 4 | Ma Thần 100 | | Tà Thú Huyết Nguyệt 95 |
| 101-110 | 5 | Thiên Ma 112 | | Hung Tinh dải 108 |
| 111-120 | 4 | Long Vương 125 | | |
| 121-130 | 5 | Hải Thị Thận Long 125 (`bl_thanlau`) | Hang 120+ (đặc tả sau, `pve-caves`) | Hung Tinh dải 128, Tà Thú 130 |
| 131-140 | 5 | Xích Diệm Dung Thần 135 (`xv_hoadiem`) | Boss gia tộc 140 ở Tộc Địa (`pve-clanboss`) | |
| 141-150 | 5 | Bắc Minh Thiên Lang 145 (`bn_bangho`) | | Hung Tinh dải 148 |
| 151-160 | 5 | Vạn Cổ Thi Hoàng 155 (`hl_quandien`) | | Tà Thú 160 |
| 161-170 | 5 | Sơn Tiêu Quỷ Vương 165 (`um_saohuyet`) | | Hung Tinh dải 168 |
| 171-180 | 5 | Đọa Thiên Tinh Quân 175 (`th_langdai`) | Boss gia tộc 180 | |
| 181-190 | 5 | Thao Thiết Ma Thần 185 (`hd_tedan`) | | Hung Tinh dải 188, Tà Thú 190 |
| 191-199 | 5 | Thái Âm Ngọc Hồ 195 (`tc_daonguyen`), Hư Vô Ma Tôn 199 (`tc_thanhdien`) | | |

Bản đồ phó bản hiện có/đã đặc tả (không tính vào 92): `loidai` (lôi đài), `dungeon` (Hang Động Thử Thách), `cave_thachnhu`, `cave_hanbang`, `cave_luyenguc` (`pve-caves`), `chientruong` (`pvp-battlefield`), `tocchien`, `lanhdia` (`clan-war`). Hung Tinh và Tà Thú chọn bãi hợp cấp trong 92 bản đồ (bãi có quái, không phải `town/pvp/instance`, `|(min+max)/2 − lv| ≤ mapLv`); dải > 120 thiếu bãi thì `npm run check` cảnh báo `⚠` (lỗi khi `CHECK_RELEASE=1`), nên phát hành vùng (mục 12) cũng là điều kiện để các dải boss này chạy.

---

## 10. Đặc tả hệ thống

Mỗi tính năng theo khuôn: mục đích → luồng người chơi → quy tắc/công thức → dữ liệu → gói `{t}` → module máy chủ / cửa sổ / id DOM → bố cục điện thoại → chống gian lận → tiêu chí chấp nhận đo được → kiểm thử. Ba tính năng `done` ghi lại hiện trạng làm chuẩn hồi quy; tiêu chí của chúng đã đạt ở mã ngày 18/10/2026.

### 10.1 `world-base` — Khung bản đồ (P1, P2 · Must · done · GĐ 2 · S)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Thế giới liền mạch gồm làng, bãi luyện, cổng hai chiều; người chơi luôn biết đường quay lại |
| Luồng | Vào game ở làng phái → đi tới mép bản đồ hoặc đứng trước cửa → bấm "Vào" → sang bản đồ đích ở vị trí `tx` |
| Quy tắc | Bản đồ dựng bằng `village()` (rộng 1640, 9 NPC) hoặc `field()` (`genField(w, seed, mobs)` sinh bục ổn định theo seed); cổng mép ở x16 / x(w−16); cửa giữa bản đồ có `door: true`; Đấu Trường cần cấp 10 |
| Dữ liệu | `MAPS` trong `src/shared/data/maps.js` (`id, name, theme, w, spawnX, portals [{ x, to, tx, door? }], spawns, npcs, boss?, town?, pvp?, instance?`); `clientMaps()` gửi trong gói `data` |
| Gói | `portal { i }` (chỉ số cổng) → `enterMap { map, x, y, me }` kèm ảnh chụp trạng thái bản đồ (người chơi, quái, vật phẩm rơi) |
| Module / UI | `core/map.js`, `core/world.js` (`changeMap`), `modules/movement` (`portal`), `render/maprender.js` (`drawPortals`) |
| Điện thoại | nút "Vào" hiện khi đứng cạnh cổng, cao ≥ 44px |
| Chống gian lận | máy chủ kiểm `|p.x − pt.x| ≤ 60`, chỉ số cổng là số nguyên trong mảng, cấp ≥ 10 khi vào `pvp`; không nhận tọa độ đích từ máy khách |
| Tiêu chí | (1) `npm run check` không báo "cổng một chiều" với mọi bản đồ; (2) đứng cách cổng 61px gửi `portal` thì không đổi bản đồ; (3) nhân vật cấp 9 không vào được `arena` |
| Kiểm thử | `tools/check-data.js` (khối bản đồ), `tests/features/movement.js`, `npm run test:e2e` |

### 10.2 `world-movement` — Di chuyển và nhảy (P3, P5 · Must · done · GĐ 1 · S)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Điều khiển nhanh, chính xác trên bục; máy chủ chặn chạy nhanh, bay |
| Luồng | Chạy trái/phải, nhảy, nhảy đôi trên không, nhấn xuống để rơi khỏi bục |
| Quy tắc | Hằng số `JUMP 378`, `JUMP2 330`, `GRAV 1000` (nhảy đơn ≈ 71px, nhảy đôi ≈ 125px); `AIR_MAX 2.4` giây, `AIR_SLACK 0.3`; quãng tối đa mỗi gói `maxD = 110 · (1 + spd/100) · 1,6 · dt + 30`; đổi vật lý ở `game/game.js` thì đổi cùng lúc hằng ở `modules/movement/index.js` |
| Dữ liệu | bục `platforms` (mảng `[x, y, w]`) của bản đồ, mặt đất y = 300 |
| Gói | `move { x, y, dir, st }` → khi sai: `pos { x, y }` kéo về |
| Module / UI | `modules/movement` (`move`), `game/game.js`, `core/input.js` (`#hud-dpad`) |
| Điện thoại | dpad trái, nút nhảy phải, vùng chạm ≥ 44px |
| Chống gian lận | quá `maxD` hoặc cao hơn đỉnh nhảy tính từ bục gần nhất thì kéo về; ở trên không quá `AIR_MAX + AIR_SLACK` thì kéo xuống |
| Tiêu chí | (1) `tests/features/movement.js` "nhảy đôi liên tục đúng vật lý: server không sửa vị trí"; (2) cùng file, "lơ lửng cao 100px: server hạ độ cao rồi kéo về mặt đất"; (3) `tests/features/fashion.js` "không cưỡi thú mà đi bước dài như thế thì bị kéo lại"; `JUMP/JUMP2/GRAV` giống nhau ở hai bên, `AIR_MAX/AIR_SLACK` chỉ ở server. Ca nhảy đôi lên bục chênh 124px do `dev-test-coverage` bổ sung nếu cần (chỉnh khi ghép theo mã thật) |
| Kiểm thử | `tests/features/movement.js` (`airTest`), `tests/features/fashion.js`, `npm run test:e2e` |

### 10.3 `world-worldmap` — Bản đồ thế giới và tự tìm đường (P2 · Must, nâng khi ghép · done · GĐ 2 · M · đặc sắc)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Một tranh pixel vẽ tay cả thế giới; bấm bản đồ bất kỳ là nhân vật tự đi tới, qua nhiều cổng |
| Luồng | Mở cửa sổ bản đồ → thấy vị trí mình, bản đồ có nhiệm vụ, thành viên nhóm, sự kiện → bấm nút → "Đi tới" → nhân vật tự chạy, qua cổng, nhảy bục |
| Quy tắc | Tìm đường giữa bản đồ: `findRoute` duyệt đồ thị cổng từ `S.G.maps`; trong bản đồ: `buildNav` + `navPlan` (nhảy bục); dừng khi bị đánh, khi người chơi tự bấm dpad |
| Dữ liệu | `WORLD_LAYOUT` (`ui/worldmap.js`), `portals` của `S.G.maps` |
| Gói | không gói riêng; dùng `portal`, `move` như người chơi |
| Module / UI | `ui/worldmap.js` (`buildWorldMap`), `windows/map.js`, `game/pathfind.js`; DOM `.wmap-cv`, `.wmap-view` |
| Điện thoại | tranh co theo chiều ngang, kéo để cuộn, nút "Đi tới" ở chân cửa sổ |
| Chống gian lận | tự đi chỉ gửi ý định như người chơi; máy chủ kiểm như 10.1, 10.2 |
| Tiêu chí | e2e: bấm một bản đồ cách 3 cổng, nhân vật tới nơi, cửa sổ tự đóng, không lỗi console |
| Kiểm thử | `npm run test:e2e` (desktop và `MOBILE=1`) |

### 10.4 `world-towns` — Trạm dùng chung (P2 · Must · todo · GĐ 2 · M · opencode)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Gỡ R-20: `village()` hiện gắn cứng 9 NPC; cần một hàm dựng trạm nhỏ để 10 trạm dùng chung, và làng nhận danh sách NPC làm tham số |
| Luồng | Người chơi đi qua trạm trên đường chính (hoặc Phu Xe đưa tới) → mua thuốc, rèn, gửi kho, nhận việc, gọi Phu Xe → đi tiếp |
| Quy tắc | `outpost(id, name, theme, style, npcs, portals, opts)`: rộng 1400, `town: true`, `outpost: true`, `minLv` (cấp Phu Xe đưa tới), `townStyle` (`fire/water/wind`), `spawnX 700`, bục `[[250,232,120],[1030,232,120],[640,214,120]]`, NPC đặt lần lượt ở x 220, 360, 500, 900, 1040, 1180; trạm không có quái, không PK (như làng); `village()` nhận thêm tham số tùy chọn `npcs` (mặc định = danh sách 9 NPC hiện tại, kết quả cũ y hệt) |
| Dữ liệu | `src/shared/data/maps.js`: hàm `outpost`, bảng `OUTPOSTS` (id trạm → `{ minLv, lower: true|false, region? }`); `clientMaps()` gửi thêm `townStyle, outpost, minLv, wm, region, zone` khi có. Đổi tên NPC làng theo Q4 (chỉ trường `name`) |
| Gói | không gói mới (NPC dùng `npc { id }`, `npcAct { id, a }` → `dialog`) |
| Module / UI | `src/shared/data/maps.js`; `render/map/village.js` vẽ nhà trạm theo `townStyle` (thuộc `art-themes-new`); nhạc trạm: `musicFor` (`core/sound.js`) chọn `village_<townStyle>` khi `map.outpost` (1 dòng) |
| Điện thoại | không có UI mới |
| Chống gian lận | trạm là `town` nên máy chủ chặn PK như làng; NPC dùng `nearNpc` như cũ |
| Tiêu chí | (1) `clientMaps()` của 23 bản đồ cũ trước và sau thay đổi giống hệt (so JSON, trừ trường `name` NPC đổi theo Q4); (2) một trạm thử có đủ 5-6 NPC, `town: true`, `w = 1400`, `npm run check` sạch; (3) `npm test` đạt |
| Kiểm thử | so ảnh chụp dữ liệu (snapshot) trong `tests/features/movement.js` (đơn vị); `npm run check`; `npm test` |

### 10.5 `world-lower-fill` — Hạ Giới thêm 19 bãi và 2 trạm (P2, P3 · Must · todo · GĐ 2 · L · opencode)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Lấp dải cấp mỏng của Hạ Giới (41-50, 71-90 chỉ có 1 bãi), cho mỗi dải 10 cấp 4-6 bãi; thêm 2 trạm để đường dài 17 bản đồ có điểm nghỉ |
| Luồng | Người chơi đi đường chính như cũ, thấy cửa mới ở bản đồ cũ (ví dụ `bamboo` x480) → vào bãi nhánh hợp cấp; ở cấp 45 và 85 đi qua trạm |
| Quy tắc | Mục 1.2, 1.3; mỗi bãi 3 loại quái chênh 2-3 cấp; cửa mới đặt cách cổng/NPC/boss cũ ≥ 150px; chen trạm chỉ đổi `to/tx` của 2 cổng mép cũ (★ trong bảng mục 2) |
| Dữ liệu | `src/shared/data/hagioi/{index,ga,gb,gc,gd,ge}.js` (mỗi file: `maps`, `links` (cửa thêm vào bản đồ cũ), `splices` (chen trạm), `homes`), 57 quái + 3 boss trong `monsters.js` (mượn hình bằng `art`), `BOSS_SKILLS` + `BOSS_DROPS` cho 3 boss, 19 vật phẩm `type: 'quest'` ở `items/consumables.js`, `wm` cho 21 bản đồ, 15 dòng `MAP_VARIANTS`; `audio.js` 3 dòng nhạc theme (D2) |
| Gói | không gói mới |
| Module / UI | dữ liệu là chính; `maps.js` gọi `applyHagioi()` sau khi dựng bản đồ cũ |
| Điện thoại | không có UI mới |
| Chống gian lận | như 10.1 |
| Tiêu chí | (1) `npm run check` sạch, mọi cổng hai chiều; (2) đếm: 44 bản đồ Hạ Giới, 2 trạm, 108 quái thường Hạ Giới (51 + 57), 14 boss Hạ Giới; (3) mỗi dải 10 cấp ở 1-120 có ≥ 4 bãi (kiểm tự động trong `check-data`); (4) e2e tự tìm đường từ `v_fire` tới `ge_longmo` tới nơi; (5) ảnh chụp 5 bãi tiêu biểu (`ga_damhac`, `gb_hanphong`, `gc_damoan`, `gd_thachlam`, `ge_loivan`) desktop + điện thoại |
| Kiểm thử | `npm run check`, `npm test`, `npm run test:e2e` (+ `MOBILE=1`), `tools/shot.js` |

### 10.6 `world-upper` — Bản đồ thế giới 4 tờ và Phu Xe Thượng Giới (P2 · Must · todo · GĐ 2 · M · Claude)

| Khuôn | Nội dung |
|---|---|
| Mục đích | 92 bản đồ không vừa một tranh 280×160; chia 4 tờ theo dải cấp và cho Phu Xe đưa thẳng tới trạm vùng |
| Luồng | Mở bản đồ → tờ chứa bản đồ đang đứng → bấm tab tờ khác hoặc dấu cổng tờ → bấm bản đồ → "Đi tới". Ở làng/trạm: nói Phu Xe → trang 1 → "Thượng Giới ▸" → chọn vùng → trả 5.000 xu → tới trạm |
| Quy tắc | Mục 6.1 và 7; tab tờ 3/4 chỉ hiện khi có bản đồ; vùng chỉ hiện ở Phu Xe khi có bản đồ và `p.lv ≥ r.lv` |
| Dữ liệu | `wm { s, x, y, lb }` trên bản đồ mới, `REGIONS` (`key, name, lv, entry, exit, town, maps, sheet`), `SHEETS`, `SHEET_GATES`, `sheetOf(id)` ở `ui/worldmap.js`; 8 nút cũ chuyển sang tờ 2 |
| Gói | `npc { id }` → `dialog` (2 trang); `npcAct { id, a: 'page:0'|'page:1'|'go:<map>'|'go:@<key>' }` → `enterMap` hoặc `notice` |
| Module / UI | `modules/movement` (`teleDialog`, `teleport`) phần trang 2; `ui/worldmap.js` (`buildWorldMap` thêm `sheet`, `onSheet`), `windows/map.js`, `css/worldmap.css`; DOM mới `[data-wmsheet]`, `.wmap-tabs`, `.wmap-legend` |
| Điện thoại | tab và chip ≥ 44px, hàng tab cuộn ngang trong khung, không tràn trang; chữ nhãn tối thiểu 12px CSS |
| Chống gian lận | máy chủ dựng lại danh sách đích từ dữ liệu, kiểm cấp, số dư, không nhận đích ngoài danh sách; `a` lạ bị bỏ qua |
| Tiêu chí | (1) e2e chuyển đủ 4 tab, mỗi tab ≥ 22 nút vẽ đúng (đếm bằng `ninja.ui`); (2) bấm dấu cổng tờ sang đúng tờ; (3) nhân vật cấp 119 không thấy nút Thượng Giới, cấp 135 thấy đúng 2 vùng; (4) gửi `npcAct go:@thaicuc` ở cấp 135 không dịch chuyển, không trừ xu; (5) đủ xu thì trừ đúng 5.000 và vào `bl_tram`; (6) ảnh chụp 4 tờ desktop + điện thoại, `OK no console errors` |
| Kiểm thử | `tests/features/movement.js` (`upperTeleTest`), `npm run test:e2e` (+ `MOBILE=1`), `tools/shot.js` |

### 10.7 `world-region-*` — 8 vùng Thượng Giới (P1, P3 · Must · todo · GĐ 2 · M · opencode)

Một khuôn dùng cho cả 8 vùng; khác nhau ở dữ liệu (mục 4.2).

| Khuôn | Nội dung |
|---|---|
| Mục đích | Mỗi vùng là 10 cấp nội dung mới có chủ đề riêng, đưa thế giới từ 120 lên 199 |
| Luồng | Từ M3 vùng trước (hoặc `dragon_palace`) đi cổng mép → M1 gặp Trưởng lão nhận nhiệm vụ → trạm T qua cửa x700 → luyện M1-M3, P → vào D1 đánh boss vùng → sang vùng sau |
| Quy tắc | Khuôn 6 bản đồ ở mục 1.4; quái chỉ số sinh từ công thức chung (`20-monsters.md`), không đặt tay; boss vùng 2-3 chiêu trong `BOSS_SKILLS` (helper có sẵn), tầm và hệ số trong giới hạn `check-data` |
| Dữ liệu | `src/shared/data/regions/<key>.js` (`key, name, lv, sheet, entry, exit, town, maps` + `wm` từng bản đồ), 9 quái + 1 boss (vùng 8: 2 boss) trong `monsters.js`, 3 vật phẩm nhiệm vụ, 3 dòng `MAP_VARIANTS`, 2 NPC M1 + 5 NPC trạm; `regions/index.js` nối vùng theo thứ tự và tự thêm cổng M3 ↔ M1 vùng sau, M1 vùng 1 ↔ `dragon_palace` |
| Gói | không gói mới |
| Module / UI | dữ liệu; hình quái thuộc `art-monsters-199`, theme mới thuộc `art-themes-new` |
| Điện thoại | không có UI mới |
| Chống gian lận | như 10.1; cổng mép vùng không có khóa cấp (quái đủ mạnh để ngăn), Phu Xe có khóa cấp |
| Tiêu chí (mỗi vùng) | (1) `npm run check` sạch; (2) 6 bản đồ, 9 quái, đúng 1 boss vùng (vùng 8: thêm boss cuối), cổng hai chiều, nối vào vùng trước; (3) mỗi dải 10 cấp của vùng có đúng 5 bãi; (4) bot cấp `L` dùng `/tp` vào D1 thấy boss, đánh được boss nhận `stone4`; (5) e2e tự tìm đường từ trạm vùng tới P tới nơi; (6) ảnh chụp M1, D1 (có boss), T desktop + điện thoại; (7) `npm run test:perf` trên M2 giữ ≈ 60 khung hình/giây |
| Kiểm thử | `npm run check`, `npm test` (phần `regionTest` trong `tests/features/boss.js` lặp qua `REGIONS`), `npm run test:e2e`, `tools/shot.js`, `npm run test:perf` |

| id | Cấp vùng | Bản đồ (M1, M2, M3, D1, P, T) | Boss | Phụ thuộc thêm |
|---|---|---|---|---|
| `world-region-bonglai` | 120 | `bl_bichsa, bl_daohoa, bl_thuyphu, bl_thanlau, bl_ngocphong, bl_tram` | `boss_bl_thanlong` 125 | `art-themes-new` (`jade_peak`) |
| `world-region-xichviem` | 130 | `xv_xichsa, xv_dungnham, xv_thandan, xv_hoadiem, xv_hacdieu, xv_tram` | `boss_xv_dungthan` 135 | vùng 1 |
| `world-region-bangnguyen` | 140 | `bn_tuyetlinh, bn_bangcoc, bn_cothanh, bn_bangho, bn_vannien, bn_tram` | `boss_bn_thienlang` 145 | vùng 2 |
| `world-region-hoanglang` | 150 | `hl_hoangsa, hl_mudao, hl_diacung, hl_quandien, hl_thachquan, hl_tram` | `boss_hl_thihoang` 155 | vùng 3, `art-themes-new` |
| `world-region-uminh` | 160 | `um_quylam, um_hacmoc, um_vongxuyen, um_saohuyet, um_damuminh, um_tram` | `boss_um_sontieu` 165 | vùng 4, `art-themes-new` (`swamp`) |
| `world-region-tinhha` | 170 | `th_vanhai, th_tinhlam, th_ngankieu, th_langdai, th_vanlo, th_tram` | `boss_th_tinhquan` 175 | vùng 5, `art-themes-new` (`starfield`) |
| `world-region-hondon` | 180 | `hd_mathon, hd_huyettri, hd_madien, hd_tedan, hd_hukhong, hd_tram` | `boss_hd_thaothiet` 185 | vùng 6, `art-themes-new` |
| `world-region-thaicuc` | 190 | `tc_vanmon, tc_thuycanh, tc_thanhdien, tc_daonguyen, tc_bandao, tc_tram` | `boss_tc_ngocho` 195, `boss_tc_maton` 199 | vùng 7, `art-themes-new` |

### 10.8 `world-layout` — Bố cục bục viết tay (P1, P3 · Should · todo · GĐ 2 · M · Claude)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Gỡ R-19: mọi bãi dùng bục sinh ngẫu nhiên theo seed nên trông giống nhau; bản đồ quan trọng (bí cảnh, boss) cần địa hình có chủ ý: bậc thang, tháp, cầu, đấu trường boss |
| Luồng | Người chơi vào D1: thấy bậc thang dẫn lên, khu boss có hai bục đỡ hai bên để né chiêu đất, lối nhảy lên bục cao lấy tầm nhìn |
| Quy tắc | Trường tùy chọn `layout: { plats, segs }`; `segs` = danh sách `[tên đoạn, x gốc]`, đoạn mẫu ở `src/shared/data/segments.js` (bảng dưới); `genField` nhận thêm tham số `platforms` để thay bục sinh tự động; không có `layout` thì kết quả y hệt cũ |
| Dữ liệu | `segments.js` mới; `layout` trên 12 bản đồ: 8 D1, `tc_thanhdien`, `gb_hanphong`, `gc_damoan`, `gd_huyetho` |
| Gói | không gói mới |
| Module / UI | `src/shared/data/maps.js` (`genField`), `segments.js`; máy chủ (`modules/movement`) và `game/pathfind.js` đọc `platforms` như cũ |
| Điện thoại | không có UI mới; bục ≥ 80px rộng để chạm dễ |
| Chống gian lận | máy chủ kiểm nhảy theo bục thật của bản đồ (không đổi) |
| Tiêu chí | (1) snapshot `platforms` của mọi bản đồ không có `layout` không đổi; (2) `check-data` kiểm: y bục trong [100, 250], mỗi bục tới được từ đất hoặc bục khác (chênh dọc ≤ 66, khe ngang ≤ 60), quanh boss ±300px có ≥ 2 bục ở y ≥ 232; (3) e2e: `navPlan` tới được mọi bục của 12 bản đồ; (4) ảnh chụp 12 bản đồ |
| Kiểm thử | `npm run check`, `npm test`, `npm run test:e2e` (cổng 3717, tài khoản `layout1`), `tools/shot.js` |

| Đoạn | Rộng | Bục `[dx, y, w]` | Dùng cho |
|---|---|---|---|
| `steps` | 360 | `[0,238,100]`, `[120,176,100]`, `[240,114,110]` | bậc thang lên |
| `tower` | 260 | `[0,238,120]`, `[60,176,110]`, `[0,114,120]` | tháp, chỗ đặt rương |
| `bridge` | 420 | `[0,232,420]` | cầu dài |
| `twin` | 400 | `[0,238,110]`, `[290,238,110]` | hai bục đỡ quanh boss |
| `arch` | 380 | `[0,238,90]`, `[100,190,180]`, `[290,238,90]` | vòm |
| `flat` | 300 | không bục | khoảng trống cho chiêu đất |
| `leap` | 460 | `[0,214,80]`, `[190,176,80]`, `[380,138,80]` | chuỗi nhảy đôi |

Bố cục mặc định: D1 `[['steps',160],['twin',650],['arch',1150]]`; `tc_thanhdien` `[['steps',200],['bridge',1000],['twin',1500],['flat',1900]]`; 3 bản đồ boss Hạ Giới `[['steps',200],['arch',480],['twin',900]]` (đổi x theo vị trí boss sao cho `twin` ôm boss).

### 10.9 `world-hidden` — Bí địa, lối tắt, câu đố địa hình (P3, P1 · Could · todo · GĐ 5 · M · Claude)

| Khuôn | Nội dung |
|---|---|
| Mục đích | Thưởng cho người tò mò: cửa ẩn không vẽ cổng, bí địa có rương mỗi ngày, lối tắt tạo vòng đầu tiên trong đồ thị cây |
| Luồng | Nghe gợi ý từ Kỳ nhân/nhiệm vụ Kỳ Duyên → tìm chỗ lạ trên bản đồ (đom đóm tụ, bia đá) → đứng đúng chỗ, nút "Vào" hiện → bí địa → nhảy bục `tower` lên rương → mở rương nhận thưởng khóa |
| Quy tắc | Cổng ẩn có `secret: { lv, hint }`, không vẽ cổng (chỉ hạt gợi ý); vào cần `p.lv ≥ lv`; lần đầu vào ghi `found`; rương mỗi ngày 1 lần (theo ngày giờ Việt Nam); thưởng `{ xu: 50 · lv, items: [['chest', 1]] }` khóa; túi đầy thì gửi thư (`world.mail.deliver`), hộp thư đầy thì giữ lại cho lần sau, không mất quà |
| Dữ liệu | 4 bí địa (bảng dưới, không tính vào 92, luật "3-6 bản đồ mỗi vùng" bỏ qua `hidden: true`), 2 lối tắt; `c.secret = { found: [], day, got: [] }` dọn ở `sanitize`; `me.secret` trong `selfData` |
| Gói | `portal { i }` (như cũ, máy chủ kiểm `secret.lv`); `hiddenChest {}` → `secretResult { ok, msg }` |
| Module / UI | `modules/secret` mới (hành động `hiddenChest`, móc `sanitize`, `selfData`), `modules/movement` thêm kiểm `secret.lv`, `game/pathfind.js` bỏ cổng `secret` khi `lv` chưa đủ hoặc bí địa chưa `found`, `render/map` vẽ hạt gợi ý; bản đồ thế giới không vẽ bí địa chưa tìm thấy |
| Điện thoại | nút "Vào"/"Mở rương" ≥ 44px như cổng thường |
| Chống gian lận | máy chủ kiểm khoảng cách tới rương `{ x: 1200, y: 114 }` (≤ 60 ngang, ≤ 40 dọc), đang ở đúng bản đồ, chưa nhận hôm nay; thưởng khóa (`eco-bound`) nên không buôn được; dữ liệu bí địa có trong gói `data` (Q10) |
| Tiêu chí | (1) bot cấp thấp hơn `lv` gửi `portal` vào cửa ẩn không đổi bản đồ; (2) đủ cấp vào được, `found` ghi lại; (3) `hiddenChest` lần 2 trong ngày trả `ok: false`; (4) đứng cách rương 100px trả `ok: false`; (5) túi đầy thì nhận thư; (6) tìm đường không đi lối tắt khi chưa đủ cấp |
| Kiểm thử | `tests/features/secret.js` (cổng 3718, tài khoản `secret1`), gọi trong `tests/smoke.js`; `npm run check` |

| id | Tên | Cửa ẩn ở | Cấp mở | Quái | Theme | Seed | Tọa độ tờ |
|---|---|---|---|---|---|---|---|
| `ga_hangdom` | Hang Đom Đóm | `ga_rungnam` x1100 | 24 | `ga_namlan`, `ga_buomdem`, `ga_mochon` | `mist` | 225 | tờ 1 (112, 36) |
| `gc_mieuhoang` | Miếu Hoang Âm Hồn | `gc_damoan` x500 | 64 | `gc_mahoi`, `gc_thiemthu`, `gc_muoima` | `ruins` | 226 | tờ 2 (64, 96) |
| `bl_longquat` | Long Quật Bích Thủy | `bl_ngocphong` x1200 | 125 | `bl_sanho`, `bl_daxoa`, `bl_tienve` | `dragon_palace` | 316 | tờ 3 (100, 22) |
| `tc_ngocthanh` | Ngọc Thanh Mật Cảnh | `tc_bandao` x1200 | 194 | `tc_thanhgiao`, `tc_kimgiapve`, `tc_thientuong` | `heaven` | 386 | tờ 4 (48, 84) |

Lối tắt (cổng ẩn hai đầu): `dragon_palace` x600 ↔ `ge_longmo` x1500 (cấp 116); `gc_concatdo` x1500 ↔ `gd_vancot` x900 (cấp 78). Bí địa rộng 1500, bố cục `[['steps',200],['twin',650],['tower',1140]]`, rương trên đỉnh `tower`.

---

## 11. Checklist thêm bản đồ (bản mở rộng của `CLAUDE.md`)

| # | Bước | File | Kiểm bằng |
|---|---|---|---|
| 1 | Chọn loại: bãi `field()`, trạm `outpost()`, làng `village()`; Hạ Giới thêm vào `hagioi/<khu>.js`, Thượng Giới vào `regions/<key>.js` | `src/shared/data/` | |
| 2 | Đặt id (tiền tố khu/vùng, không dấu), tên tiếng Việt có dấu ≤ 21 ký tự, theme có sẵn (theme mới cần ADR như ADR-07-3), rộng 1400-2200, seed chưa dùng | như trên | `npm run check` |
| 3 | 3 loại quái chênh 2-3 cấp, xếp thấp → cao từ trái sang phải; quái phải tồn tại; dải 10 cấp của bản đồ vẫn có 4-6 bãi (Hạ Giới) hoặc đúng 5 (Thượng Giới) | `monsters.js` | `npm run check` |
| 4 | Cổng **hai chiều**: cổng mép ở x16 / x(w−16), cửa giữa có `door: true`, cách cổng/NPC/boss khác ≥ 150px; `tx` của đầu kia đặt cách cổng ≥ 40px để không bị đẩy ngược | `maps.js` | `npm run check` (lỗi "cổng một chiều") |
| 5 | Điểm về `home` (bản đồ cấp ≥ 50): trạm gần nhất theo đường đi bộ | `homes` | `npm test` |
| 6 | Tọa độ trên tờ: `wm { s, x, y, lb }`, cách mọi nút cùng tờ ≥ 20px, trong khung 280×160, không đè biển | dữ liệu bản đồ | `npm run check` |
| 7 | Biến thể (`MAP_VARIANTS`) nếu cùng theme với bản đồ khác trong vùng | `render/map/` (`art-themes-new`) | ảnh chụp |
| 8 | Nhạc: theme đã có dòng `MUSIC_THEME` | `audio.js` | `npm run check` |
| 9 | Boss (nếu có): `boss: [{ m, x }]`, 2-3 chiêu `BOSS_SKILLS`, `BOSS_DROPS`; bản đồ quan trọng thêm `layout` (10.8) | `monsters.js`, `segments.js` | `npm run check` |
| 10 | Nhiệm vụ/vật phẩm trỏ tới bản đồ: mục tiêu tồn tại | `quests.js` | `npm run check` |
| 11 | Chạy `npm test`, `npm run test:e2e` (+ `MOBILE=1`), chụp ảnh desktop + điện thoại, `OK no console errors` | | |

---

## 12. Phát hành dần theo vùng liền dải (`CHECK_RELEASE`)

**Luật**: chỉ phát hành nội dung theo dải cấp **liền nhau** tính từ dưới lên. Người chơi không bao giờ gặp vùng cấp cao có nhiệm vụ trong khi vùng ngay trước còn trống.

| Kiểm | Bình thường (`npm run check`) | `CHECK_RELEASE=1 npm run check` |
|---|---|---|
| Vùng k có nhiệm vụ chính mà vùng k−1 chưa có bản đồ | `⚠` cảnh báo | lỗi |
| Dải boss sự kiện (Hung Tinh, Tà Thú) không có bãi hợp cấp | `⚠` | lỗi |
| `quest-main-199` trỏ tới bản đồ chưa có | lỗi | lỗi |
| Khu Hạ Giới `gb` có mà `gd` chưa có (hoặc ngược lại) | `⚠` | lỗi (`gb` và `gd` chứa 2 trạm mà Phu Xe trang 1 liệt kê, phải lên cùng lúc) |

| Đợt | Nội dung | Điều kiện trước khi gộp vào `main` |
|---|---|---|
| PH-0 | `world-towns`, `art-themes-new`, khu `gb` + `gd` (2 trạm), `world-home` | `CHECK_RELEASE=1 npm run check` sạch, `npm test`, e2e desktop + `MOBILE=1`, ảnh chụp 2 trạm |
| PH-1 | khu `ga`, `gc`, `ge`; vùng 1-2 (Bồng Lai, Xích Viêm); `world-upper`; `core-levelcap-199` mở tới 139 | như trên + ảnh chụp 4 tờ bản đồ |
| PH-2 | vùng 3-4 (Băng Nguyên, Hoàng Lăng), cấp tối đa 159 | như trên |
| PH-3 | vùng 5-6 (U Minh, Tinh Hà), cấp tối đa 179 | như trên + `npm run test:perf` trên `th_ngankieu` |
| PH-4 | vùng 7-8 (Hỗn Độn, Thái Cực), cấp tối đa 199, boss cuối | như trên + bot cấp 199 đánh `boss_tc_maton` |

Cấp tối đa từng đợt do `core-levelcap-199` (`06-can-bang.md`) đặt theo vùng cao nhất đã phát hành, để người chơi không lên cấp vượt nội dung. `world-layout` đi cùng đợt có bản đồ được áp bố cục; `world-hidden` sau PH-4.

---

## 13. ADR

### ADR-07-1 — Trạm `outpost()` và điểm về theo `home`

| Mục | Nội dung |
|---|---|
| Bối cảnh | `CLAUDE.md`/mã hiện tại coi thị trấn là 3 làng dựng bằng `village()` (rộng 1640, 9 NPC cố định); hồi sinh và Cuộn Về Làng luôn đưa về làng phái. Với 92 bản đồ, từ làng đi bộ tới vùng cuối mất 41 lần qua cổng |
| Quyết định | Thêm loại bản đồ "trạm" (`outpost()`: rộng 1400, 5-6 NPC, `town: true`) và trường `home` trên bản đồ; chết/về làng đưa tới `home` |
| Phương án khác | (a) Chỉ thêm Phu Xe ở làng, không trạm: đường về sau mỗi lần chết quá xa ở cấp cao. (b) Làng thứ 4-13 dùng `village()`: 9 NPC mỗi làng là thừa, tranh vẽ bản đồ quá chật |
| Chi phí | 1 hàm dữ liệu, 1 dòng `musicFor`, 1 nhánh vẽ nhà theo `townStyle`; `world.homeOf(p)` ở `world-home` |
| Hệ quả | Thêm mục "trạm" vào checklist (mục 11); kiểm thử về làng phải phân biệt làng/trạm; `CLAUDE.md` mục "Thêm nội dung → Bản đồ" cần một dòng nói về `outpost()` và `home` khi lô này gộp |

### ADR-07-2 — Tọa độ bản đồ thế giới nằm trong dữ liệu (`wm`)

| Mục | Nội dung |
|---|---|
| Bối cảnh | Checklist `CLAUDE.md`: "Thêm tọa độ vào `WORLD_LAYOUT` trong `ui/worldmap.js`". Với 69 bản đồ mới, mỗi lô vùng sẽ phải sửa chung một file của vùng "Bản đồ thế giới", trái quy tắc một file một agent |
| Quyết định | Bản đồ mới khai `wm { s, x, y, lb }` trong dữ liệu (`src/shared/data`), máy chủ gửi qua `clientMaps()`; `WORLD_LAYOUT` giữ cho 23 bản đồ cũ (thêm `s`), không đổi tên export |
| Phương án khác | (a) Mọi lô sửa `WORLD_LAYOUT`: xung đột file, 8 lô vùng không chạy song song được. (b) Chuyển hết 23 bản đồ cũ vào dữ liệu: đổi nhiều file hơn mà không thêm lợi ích |
| Chi phí | `buildWorldMap` đọc thêm `S.G.maps[id].wm`; `check-data` kiểm khoảng cách nút ≥ 20px |
| Hệ quả | Checklist `CLAUDE.md` cần ghi "bản đồ mới: `wm` trong dữ liệu" khi lô `world-upper` gộp; API `WORLD_LAYOUT` vẫn giữ |

### ADR-07-3 — Thêm 3 theme mới

| Mục | Nội dung |
|---|---|
| Bối cảnh | `CLAUDE.md`: "Dùng lại `theme` có sẵn", chỉ thêm theme mới "khi không theme nào hợp". 23 theme hiện có không có đầm lầy, trời sao, núi đá vôi ngọc, trong khi 3 vùng (U Minh, Tinh Hà, Thái Cực) và 4 khu Hạ Giới cần đúng các cảnh đó |
| Quyết định | Thêm `swamp`, `starfield`, `jade_peak` theo đúng checklist theme mới (`THEMES` + `SCENES`, `REGION`/`THEME_GLYPH`/`DECO`, `tools/check-data.js`), cộng 3 dòng `MUSIC_THEME` |
| Phương án khác | (a) Biến thể của `mist`/`heaven`/`bamboo`: biến thể chỉ đổi hạt và loại trang trí, không đổi bảng màu trời và mặt đất nên không ra cảnh mới. (b) Không thêm: 13 bản đồ trùng cảnh với vùng khác, mất P1 |
| Chi phí | 1 lô vẽ (C), ảnh chụp, `test:perf` cho `starfield` |
| Hệ quả | 26 theme; mỗi theme mới dùng ở ≥ 3 bản đồ |

### ADR-07-4 — Cửa ẩn, bí địa ngoài luật vùng, tìm đường có lọc

| Mục | Nội dung |
|---|---|
| Bối cảnh | `DESIGN_RULES.md` yêu cầu cổng vẽ rõ (cổng đá/torii) để người chơi thấy lối đi; luật vùng của mục này "3-6 bản đồ mỗi khu"; `findRoute` đi qua mọi cổng |
| Quyết định | Cổng có `secret` không vẽ cổng, chỉ vẽ hạt gợi ý; bí địa `hidden: true` không đếm vào luật số bản đồ; `findRoute` lọc cổng `secret` khi người chơi chưa đủ điều kiện (tham số tùy chọn, không đổi chữ ký) |
| Phương án khác | (a) Vẽ cổng mờ: hết là bí mật. (b) Bí địa là phó bản: mất cảm giác khám phá thế giới mở |
| Chi phí | `modules/secret`, 1 nhánh trong `portal`, lọc trong tìm đường |
| Hệ quả | `DESIGN_RULES.md` cần ghi ngoại lệ "cổng ẩn" khi `world-hidden` gộp; tìm đường tự động không bao giờ để lộ bí địa chưa tìm thấy |

---

## 14. Lệnh kiểm chứng, cổng và tài khoản

| Lô | Tính năng | Cổng | `DATA_DIR` | Tài khoản (`ADMINS`) | Lệnh |
|---|---|---|---|---|---|
| N2 | `world-towns` | 3701 | `/tmp/ns-world0` | `world0` | `npm run check`, `npm test`, `node tools/shot.js` |
| N-W1 | `art-themes-new` (3 theme, biến thể) | 3707 | `/tmp/ns-artw1` | `artw1` | `npm run check`, shot desktop + `mobile: true`, `npm run test:perf` |
| N-W2 | `world-upper` | 3708 | `/tmp/ns-artw2` | `artw2` | e2e desktop + `MOBILE=1`, shot 4 tờ |
| H1-H5 | `world-lower-fill` khu `ga`-`ge` | 3711-3715 | `/tmp/ns-hgga1` tới `/tmp/ns-hgge1` | `hgga1` tới `hgge1` (một tài khoản mỗi khu) | `npm run check`, `npm test`, shot |
| R1-R8 | `world-region-*` | 3641-3648 | `/tmp/ns-monbl1` tới `/tmp/ns-montc1` | `monbl1` tới `montc1` (một tài khoản mỗi vùng) | `npm run check`, `npm test`, e2e, shot, perf |
| L | `world-layout` | 3717 | `/tmp/ns-layout1` | `layout1` | `npm run check`, e2e |
| S | `world-hidden` | 3718 | `/tmp/ns-secret1` | `secret1` | `npm test` |
| Bot | kiểm thử bot dùng chung | theo bộ chạy | | `wrldbot1` | `npm test` |

Mẫu khởi động máy chủ riêng: `PORT=3711 DATA_DIR=/tmp/ns-hgga1 ADMINS=hgga1 node src/server/index.js`. Lệnh trình duyệt chạy với `NODE_PATH=$(npm root -g)`. Phát hành: `CHECK_RELEASE=1 npm run check`.

---

## 15. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định (dùng nếu không ai trả lời) |
|---|---|---|
| Q1 | Gọi D1 là "bí cảnh vùng" có trùng ý với Bí Cảnh roguelite (`pve-bicanh-phuchu`) không? | Giao diện gọi D1 là "Bí cảnh vùng", roguelite giữ tên "Bí Cảnh Phù Chú"; id không đổi |
| Q2 | `home` của `hell_gate` là Trấn Bạch Tuyết (xa, 6 cổng), trong khi Trấn Vân Môn nằm ngay cổng phải | Đổi `home` của `hell_gate`, `gd_vancot`, `gd_huyetho` sang `gd_vanmon` (gần hơn); `gb_bachtuyet` giữ 9 bản đồ. Bảng mục 2 vẫn ghi `gb_bachtuyet` đúng `content/10-world.md`; lô `world-lower-fill` đổi 3 giá trị `home` trong `hagioi/gd.js` và `maps.js` khi áp phương án này |
| Q3 | Hồi sinh tại chỗ hay ở trạm khi chết ở Thượng Giới? | Ở trạm của vùng (`home`), hồi sinh tại chỗ vẫn dùng vật phẩm như cũ |
| Q4 | Đổi 15 tên NPC làng kiểu Nhật và boss "Pharaoh Phục Sinh"? | Đổi trong lô `world-towns`: Thợ Rèn Thiết Thủ, Tiểu Nhị Kiên, Phu Xe Lâm, Thủ Kho Bảo, Hộ Pháp Long / Thợ Rèn Cang, Tiểu Nhị Tuyết, Phu Thuyền Sa, Thủ Kho Thủy, Hộ Pháp Hải / Thợ Rèn Đại Địa, Tiểu Nhị Xuân, Phu Xe Phong, Thủ Kho Phù, Hộ Pháp Nhân; boss thành "Cổ Vương Phục Sinh"; id không đổi |
| Q5 | Trạm có đủ dịch vụ như làng (giao dịch, gia tộc, lôi đài) không? | Không: trạm chỉ có 5-6 NPC `tele, potion, smith, storage, task` (+ `elder` ở trạm Hạ Giới) |
| Q6 | `th_langdai` cùng theme `starfield` với `th_ngankieu` mà không có biến thể | Thêm 1 dòng `MAP_VARIANTS` cho `th_langdai` (hạt `void`, trang trí `colonnade` dày) trong lô `art-themes-new` |
| Q7 | Nhạc riêng cho 3 theme mới? | Dùng tạm `field_mist`, `field_heaven`, `field_bamboo`; bản riêng ở `snd-content-199` (GĐ 7) |
| Q8 | Nhịp phát hành 5 đợt PH-0..PH-4 cách nhau bao lâu? | 2 tuần mỗi đợt, đợt sau chỉ mở khi đợt trước không có lỗi chặn 7 ngày |
| Q9 | Bao nhiêu bí địa ở `world-hidden`? | 4 (2 Hạ Giới, 2 Thượng Giới) + 2 lối tắt; thêm sau theo phản hồi |
| Q10 | Có giấu dữ liệu bí địa khỏi gói `data` không? | Không giấu (máy khách cần để vẽ khi đã tìm thấy); chấp nhận người đọc mã biết trước, vì thưởng nhỏ và khóa |
| Q11 | Phí Phu Xe Thượng Giới 5.000 xu có hợp không? | 5.000 xu mỗi lần (gấp 5 phí trạm Hạ Giới, gấp 16 phí làng); `06-can-bang.md` chỉnh nếu thu nhập xu cấp 120 lệch; đi bộ luôn miễn phí |
| Q12 | Đấu Trường (`arena`) có chia khu không? | Không chia khu (PvP tự do cần đông); nếu > 60 người thì từ chối vào kèm thông báo |
