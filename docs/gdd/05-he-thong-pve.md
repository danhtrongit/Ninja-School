# GDD 05 — Hệ thống PvE và nội dung lặp lại

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5 (phần PvE): boss, phó bản, việc hằng ngày, đăng nhập, lịch sự kiện, 7 lễ hội cả năm, di chuyển phục vụ PvE |
| Ngày | 18/10/2026 |
| Sổ tính năng | `scratchpad/gddwork/registry/05d.json` (28 mục: 25 id của danh mục + 3 id mới `evt-season-plus`, `evt-festival-boss`, `pve-boss-luongcap`) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, mã `src/` ở thư mục làm việc ngày 18/10/2026 (`modules/season, events, dungeon, quest, checkin, wheel, movement`, `core/world.js`, `shared/data/extras.js, quests.js`), `tests/features/{boss,daily,mail,social}.js`, `gddwork/{pillars,audit-data,audit-systems,audit-risk}.md`, `specs/{PLAN,dungeons,dailies,balance,bound}.md`, `content/{PLAN,00-foundation,10-world,30-quests,40-items-shops,50-worldboss-events}.md` |
| Số đo riêng | `gddwork/lab/m05d/daily-budget.js` (ngân sách EXP mỗi ngày), `gddwork/lab/m05d/trials.js` (chỉ số Ấn Đài), kết quả ở file `.out.txt` cùng thư mục |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hoặc `DESIGN_RULES.md` thì hai file đó thắng, trừ khi có ADR ở mục 10 ghi rõ là đổi quy tắc. Đặc tả chi tiết từng dòng mã đã có ở `specs/*.md` và `content/*.md`; tài liệu này tóm theo khuôn GDD, chốt chỗ còn trống và **không chép lại** mã dài, chỉ dẫn tới mục gốc. Các game ninja khác chỉ được nhắc chung là "game tham khảo" để chỉ **loại** cơ chế; mọi tên trong tài liệu là tên tự đặt.

---

## 0. Tóm tắt

### 0.1 Các tính năng trong mục này

| id | Tên | Trụ cột | Mức | Trạng thái | GĐ | Mục |
|---|---|---|---|---|---|---|
| `pve-boss-field` | Boss bản đồ: chiêu niệm có cảnh báo vùng, cuồng nộ, chia thưởng theo sát thương | P3, P4 | Must | done | 1 | 2.1 |
| `pve-boss-luongcap` | Trần lượng thưởng boss bản đồ mỗi ngày (mới) | P5 | Must | todo | 3 | 2.2 |
| `pve-tathu` | Tà Thú Xuất Thế mỗi 2 giờ | P4, P3 | Should | done | 6 | 2.3 |
| `pve-tathu-199` | Tà Thú cấp 130/160/190, chọn boss theo người online | P4, P3 | Should | todo | 6 | 2.4 |
| `pve-worldboss` | Hung Tinh Giáng Thế: 9 boss thế giới theo giờ | P4, P3 | Should | todo | 6 | 2.5 |
| `pve-clanboss` | Boss gia tộc bậc cao (cấp 140, 180) | P4 | Should | todo | 4 | 2.6 |
| `pve-dungeon` | Hang Động Thử Thách (phó bản nhóm 5 đợt) | P3, P4 | Should | done | 5 | 3.1 |
| `pve-caves` | Thí Luyện Động: 3 hang × 3 độ khó (cấp 30-120) | P3, P4 | Should | todo | 2 | 3.2 |
| `pve-dungeon-multi` | Ấn Đài Thượng Giới: phó bản nhóm 3 ải, boss riêng mỗi ải (cấp 120-199) | P3, P4 | Should | todo | 5 | 3.3 |
| `quest-daily-task` | Nhiệm vụ hằng ngày Tiểu Nhị | P2, P5 | Must | todo | 0 | 4.1 |
| `quest-dailies` | Việc Làng: 4 kiểu việc, chuỗi, mốc thưởng | P2, P5 | Should | todo | 3 (dời từ 2 khi ghép, xem ROADMAP) | 4.2 |
| `quest-truyna` | Lệnh Truy Nã: 3 lệnh/ngày ở Thượng Giới | P2 | Should | todo | 2 | 4.3 |
| `evt-checkin` | Điểm danh 7 ngày và Vòng Quay May Mắn | P2 | Should | done | 6 | 5.1 |
| `evt-login-rewards` | Điểm danh lịch tháng có bù ngày, vòng quay có giới hạn và mốc tích lũy | P2, P5 | Could | todo | 6 | 5.2 |
| `evt-calendar` | Lịch Sự Kiện 3 tab, Giờ Vàng ra dữ liệu và thêm cuối tuần | P2, P4 | Should | todo | 6 | 6 |
| `evt-season-core` | Khung lễ hội theo mùa | P1, P4 | Must | done | 6 | 7.1 |
| `evt-season-plus` | Lễ hội bản 2: mùa tách file, việc lễ hội, quà theo cấp, Sứ Giả đổi ngoại hình, trang trí làng, quà ngày chính lễ (mới) | P1, P2, P4 | Must | todo | 6 | 7.2 |
| `evt-festival-boss` | Yêu Quái Lễ Hội: boss riêng mỗi lễ, thay 2 lượt Tà Thú mỗi ngày (mới) | P1, P3, P4 | Should | todo | 6 | 7.3 |
| `evt-tet` | Hội Xuân (Tết) | P1, P4 | Must | todo | 6 | 7.5 |
| `evt-valentine` | Mùa Hoa Tình Nhân | P1, P4 | Must | todo | 6 | 7.6 |
| `evt-304` | Lễ Hội Đất Tổ (Giỗ Tổ + 30-4) | P1, P4 | Must | todo | 6 | 7.7 |
| `evt-he` | Hội Hè Biển Xanh | P1, P4 | Must | todo | 6 | 7.8 |
| `evt-trungthu` | Lễ Hội Trăng Rằm | P1, P4 | Must | todo | 6 | 7.9 |
| `evt-halloween` | Đêm Hội Hóa Trang | P1, P4 | Must | todo | 6 | 7.10 |
| `evt-noel` | Lễ Hội Đêm Đông An Lành | P1, P4 | Must | todo | 6 | 7.11 |
| `world-teleport` | Phu Xe dịch chuyển giữa 3 làng | P2 | Must | done | 2 | 8.1 |
| `world-home` | Về làng/hồi sinh theo trạm gần nhất, Phu Xe 2 trang | P2 | Must | todo | 2 | 8.2 |
| `world-channels` | Kênh bản đồ cho bãi luyện công đông người | P2, P4 | Should | todo | 5 | 8.3 |

Ba id mới và lý do:
- `evt-season-plus`: `evt-season-core` đang chạy đúng và có kiểm thử (`tests/features/mail.js`), giữ `done`. Phần nâng cấp (tách file mùa, việc lễ hội, quà theo cấp, ngoại hình Sứ Giả, trang trí) là điều kiện của cả 7 lễ hội mức Must nên phải có id riêng mức Must; ghép vào `evt-season-core` thì id `done` sẽ thành `todo` sai sự thật.
- `evt-festival-boss`: yêu cầu "boss/sự kiện riêng mỗi lễ hội" là một hệ thống có dữ liệu, máy chủ, hình vẽ riêng. Để mức Should (lễ hội Must không phụ thuộc nó, xem 7.3) đúng quy tắc "M không phụ thuộc S/C".
- `pve-boss-luongcap`: đo mã hiện tại thấy boss bản đồ trao 20/10/5 lượng cho hạng 1-3 mỗi lần hạ, 11 boss hồi sinh 10 phút, **không có trần**. Một người mạnh xoay vòng 3 boss có thể nhận khoảng 360 lượng mỗi giờ, gấp hơn 10 lần ngân sách 25 lượng/ngày của `content/40-items-shops.md`. Đây là lỗ hổng kinh tế (P5) nên mức Must.

### 0.2 Vòng lặp PvE theo nhịp thời gian

| Nhịp | Người chơi làm gì | Hệ thống |
|---|---|---|
| Phiên 10 phút (P2) | điểm danh, nhận 1-2 việc làng, một lượt hang hoặc một boss đang mở, đổi quà lễ hội | `evt-checkin`, `quest-dailies`, `pve-caves`, `pve-worldboss`, `evt-season-plus` |
| Ngày | 20 việc Tiểu Nhị, 10 Việc Làng, 3 Lệnh Truy Nã (cấp ≥ 120), 3 lượt Hang Động Thử Thách, 2 lượt mỗi hang Thí Luyện Động, 1 lượt Ấn Đài, 5 khung Hung Tinh, 12 lượt Tà Thú, 2 lượt Thủ Hộ Làng, 3 việc lễ hội | mục 2-4, 7 |
| Tuần | mốc vòng quay, thưởng tuần lôi đài, Giờ Vàng cuối tuần, Hung Tinh ×1,25 thứ Bảy, Chủ Nhật | `evt-login-rewards`, `evt-calendar` |
| Năm | 7 lễ hội, mỗi lễ 16-76 ngày, mỗi lễ có token, Sứ Giả đổi đồ, việc lễ hội, trang trí, boss riêng, thời trang độc quyền | mục 7 |

### 0.3 Lịch toàn máy chủ (giờ Việt Nam, sau khi đủ tính năng)

| Giờ | Sự kiện | id | Ghi chú |
|---|---|---|---|
| mọi giờ chẵn, phút 30-50 (00:30, 02:30, 04:30, đến 22:30) | Tà Thú Xuất Thế | `pve-tathu` | có sẵn |
| 12:30-12:50, 22:30-22:50 khi có lễ hội | Yêu Quái Lễ Hội (thay lượt Tà Thú cùng giờ) | `evt-festival-boss` | mới |
| 09:00-09:30, 13:00, 17:00, 19:00 | Hung Tinh Giáng Thế | `pve-worldboss` | mới |
| 23:00-23:30 | Canh Ba Hung Tinh (thưởng ×1,5) | `pve-worldboss` | mới |
| 09:00-11:00 thứ Bảy, Chủ Nhật | Giờ Vàng Cuối Tuần | `evt-calendar` | mới |
| 12:00-13:00, 20:00-22:00 | Giờ Vàng | `evt-calendar` | có sẵn, chuyển ra dữ liệu |
| 12:00-12:13, 21:00-21:13 | Thủ Hộ Làng | `evt-village-defense` (mục 04) | `specs/dailies.md` |
| 19:50 đăng ký, 20:00-20:30 | Chiến Trường | `pvp-battlefield` (mục 05 xã hội) | |
| 21:15-21:45 thứ 3/5/7 | Chiến gia tộc | `clan-war` | |
| 00:00 thứ Hai | Thưởng tuần lôi đài | `pvp-arena` | |

Bất biến lịch (check-data kiểm, xem `content/50-worldboss-events.md` mục 2.8): hai sự kiện có HUD dưới giữa màn hình (`excl`) không bao giờ chồng khoảng `[giờ bắt đầu, giờ bắt đầu + thời lượng)`. Hung Tinh luôn ở giờ lẻ phút 00-30, Tà Thú ở giờ chẵn phút 30-50.

---

## 1. Nguyên tắc chung cho mọi hệ thống PvE

### 1.1 Quy tắc bắt buộc

| # | Quy tắc | Áp dụng | Nguồn |
|---|---|---|---|
| G1 | Máy chủ quyết định mọi thứ: cấp, lượt, khoảng cách NPC (`nearNpc`, 130 px), thời gian (giờ VN `+7h`). Client chỉ gửi id chuỗi (tra bằng `Map` hoặc `own()`) và số nguyên qua `int()` | mọi hành động mới | `CLAUDE.md` |
| G2 | **Thưởng kiểu nhiệm vụ** (Tiểu Nhị, Việc Làng, Truy Nã, việc lễ hội, điểm danh, vòng quay, đổi quà lễ hội) trao **xu khóa/đồ khóa** khi `eco-bound` đã vào (`p.gainXuk` nếu có, không thì `p.gainXu`). **Thưởng kiểu sự kiện** (boss, Tà Thú, Hung Tinh, phó bản, hang) trao xu và đồ thường | mục 2-7 | `specs/bound.md`, `specs/PLAN.md` G12 |
| G3 | **Quà không bao giờ mất**: túi → thư (`world.mail.sendItems`) → thủ kho/giữ hộ (`p.stashItem`). Thưởng hạng không thả ra đất | mọi hàm trao thưởng | `CLAUDE.md` (hộp thư), `modules/events.give` |
| G4 | **Trao thưởng một chỗ duy nhất**, xóa trạng thái "đang làm" **trước** khi cộng thưởng, kiểm `canAddItems(list, minus)` **trước** khi trừ/cộng | Việc Làng, Truy Nã, việc lễ hội, đổi quà | `specs/dailies.md` 3.4 |
| G5 | Chặn bấm liên tục: mỗi hành động mới có `p.last<Tên>` 200-1.200 ms | mọi hành động mới | mẫu `seasonEx`, `spin` |
| G6 | Chặn cày boss cấp thấp: người vượt cấp boss + 20 không có hạng, không lượng, không đồ rơi, EXP ×0,1, không được tính vào số người dùng để tăng máu boss | Hung Tinh, Yêu Quái Lễ Hội | `content/50` mục 12 |
| G7 | Sự kiện theo lịch **không gọi bù** khi máy chủ khởi động lại giữa khung (chỉ gọi trong phút đầu) | Tà Thú, Hung Tinh, Yêu Quái Lễ Hội, Thủ Hộ Làng | `content/50` mục 3.3 |
| G8 | Mọi nguồn hồi máu mới bỏ qua bản đồ `arena`; mọi chỗ đánh người kiểm `p.match` trước | phó bản, boss | `CLAUDE.md` (lôi đài) |
| G9 | Dữ liệu ngày lưu trên nhân vật có `day: 'YYYY-MM-DD'` giờ VN, dọn ở móc `sanitize` (khóa lạ bỏ, số kẹp biên, `Object.create(null)` cho bảng đếm) | mọi bộ đếm lượt | mẫu `cleanCaves`, `cleanDailies` |
| G10 | Tên mới theo `DESIGN_RULES.md` (Hán-Việt hoặc thuần Việt, NPC xưng "ta - ngươi"); lễ gốc nước ngoài dùng tên Việt hóa | dữ liệu mới | `DESIGN_RULES.md` |

### 1.2 Ngân sách EXP mỗi ngày từ nội dung lặp lại

Số tính bằng `gddwork/lab/m05d/daily-budget.js` theo công thức nền tảng (`expNeed` có `expScale`) và đặc tả đợt 3, làm **hết** lượt trong ngày, tính bằng % EXP một cấp tại cấp đó:

| Cấp | Tiểu Nhị (20) | Việc Làng (10) | Truy Nã (3) | Hang Thử Thách (3) | Thí Luyện Động (2) | Ấn Đài (1) | Việc lễ hội | Tổng |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 | 638% | 650% | 0 | 66% | 0 | 0 | 7% | 1.360% |
| 60 | 383% | 397% | 0 | 66% | 44% | 0 | 7% | 897% |
| 120 | 313% | 328% | 28% | 66% | 44% | 35% | 7% | 820% |
| 160 | 295% | 310% | 28% | 66% | 0 | 35% | 7% | 741% |
| 199 | 284% | 299% | 28% | 66% | 0 | 35% | 7% | 720% |

Nhận xét: hai nguồn lớn nhất (Tiểu Nhị, Việc Làng) mỗi nguồn khoảng 3 cấp/ngày ở hậu kỳ nếu làm hết, nhưng cần 1,5-2 giờ mỗi nguồn (Tiểu Nhị đòi 800 lượt hạ quái). Chiều dài 1 → 199 (mục tiêu 70-85 giờ) do mục 06 cân bằng chốt bằng `dev-balance-tool`; tài liệu này không tự đổi hệ số, chỉ ghi câu hỏi mở Q1.

### 1.3 Ngân sách lượng mỗi ngày từ PvE (người chơi chăm, không nạp)

| Nguồn | Lượng/ngày | Ghi chú |
|---|---:|---|
| Tiểu Nhị | 20 | 1 lượng × 20 việc |
| Điểm danh | khoảng 2,1 | 15 lượng mỗi chu kỳ 7 ngày |
| Việc Làng | 5 | mốc 10 việc |
| Tà Thú | 1-30 | phần lớn người chơi ở mốc "còn lại" (1) hoặc top 10 (5) |
| Hung Tinh | 3-17 (trần lý thuyết 83, cuối tuần 104) | `content/50` mục 12 |
| Boss bản đồ | **≤ 60** sau `pve-boss-luongcap` (hiện chưa có trần) | mục 2.2 |
| Lễ hội | ≤ 50 mỗi mùa (dòng `luong` 10 lượt × 5) + giftcode ≤ 20 | quy ra 1-3/ngày |
| Hang, Ấn Đài | chỉ lần đầu vượt mỗi độ khó | không lặp |

Rào chắn P5: trung vị lượng PvE nhận mỗi ngày của người chơi hoạt động ≤ 40, phân vị 90 ≤ 120. Đo bằng nhật ký kinh tế của `ops-audit-log` (mục 10 tài liệu vận hành) sau 2 tuần chạy thật; vượt thì giảm trần ở 2.2 trước, không giảm thưởng sự kiện có lịch.

---

## 2. Boss và sự kiện boss

### 2.1 `pve-boss-field` — Boss bản đồ (đã có)

**Mục đích**: đỉnh mỗi bãi luyện công, dạy người chơi đọc chiêu niệm và né bằng di chuyển (P3), cùng đánh chia thưởng theo đóng góp (P4).

**Hiện trạng** (`core/monster.js`, `core/combat.js` `bossSkillHit`, `game.js onBossCast/onBossHit`):

| Hạng mục | Giá trị |
|---|---|
| Số boss | 11 boss cấp 12-125 trên 11 bãi, hồi sinh 10 phút |
| Chiêu | 2-3 chiêu mỗi boss (37 chiêu, `k ∈ quake, roar, summon, beam, nova`, `shape ∈ circle, line, pillar`), niệm có vùng cảnh báo, né được |
| Cuồng nộ | dưới 30% máu: hồi chiêu ×0,6, niệm ×0,85, đánh thường ×0,75, tốc ×1,2 |
| Thưởng | EXP chia theo % sát thương; lượng hạng 1/2/3 = 20/10/5, còn lại có > 2% sát thương = 1; boss gọi bằng lệnh/phó bản (`noRespawn`) 3/1 |
| Kiểm thử | `tests/features/boss.js` phần 0b (công thức chiêu), 0c (dọn boss, túi đầy), 7e (chiêu báo trước bằng bot); `tools/check-data.js` kiểm tầm, thời gian niệm, hệ số |

**Phần cần nâng** (các id khác làm, ghi lại để không sót):
- Hệ số máu/công/thủ/EXP theo người chơi trung bình (×150 / ×1,5 / ×1,6 / ×60 × `expScale`): `cmb-balance` (`specs/balance.md`).
- Boss cấp 121-199 (8 boss vùng Thượng Giới + 3 boss Hạ Giới mới): `world-region-*`, `world-lower-fill` (`content/20-monsters.md`).
- Trần lượng mỗi ngày: `pve-boss-luongcap` (2.2).
- Boss chỉ ở kênh 1 khi có kênh: `world-channels` (8.3, ADR-05d-1).

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` với phần 0b, 0c, 7e; `npm run check` không dòng `✘` cho 11 boss (2-3 chiêu, tầm, thời gian niệm).

### 2.2 `pve-boss-luongcap` — Trần lượng boss bản đồ (mới)

**Mục đích**: đóng lỗ hổng lượng không giới hạn ở boss bản đồ mà không làm mất động lực đánh boss (EXP, đồ rơi, sách vẫn có).

**Luồng người chơi**: hạ boss → nhận lượng như cũ cho tới khi đủ 60 lượng trong ngày từ boss bản đồ → từ lần sau thông báo `notice` kiểu `reward`: "Tham gia diệt <tên>: +N EXP (hôm nay đã nhận đủ 60 lượng từ boss bản đồ)". Qua 0 giờ VN đếm lại.

**Quy tắc**:
- `BOSS_LUONG = { day: 60 }` trong `src/shared/data/extras.js` (cuối file, gần `TATHU`).
- Áp cho boss có `m.boss && !m.event && !m.wb && !m.cave && !m.clan && !m.trial` (boss bản đồ, kể cả `noRespawn` gọi bằng lệnh). Tà Thú, Hung Tinh, boss hang/gia tộc/Ấn Đài có lịch hoặc lượt nên không áp.
- Lượng thực nhận = `min(luong, BOSS_LUONG.day − c.bossL.n)`; phần dư bỏ (không đổi ra xu để không bơm xu).
- Trần tính theo **nhân vật** (mỗi tài khoản tối đa 3 nhân vật). Nhân vật phụ cũng phải tự đánh đủ sát thương nên chấp nhận.

**Dữ liệu**: `BOSS_LUONG` (`extras.js`). Trường nhân vật `c.bossL = { day: 'YYYY-MM-DD', n: 0..60 }`, dọn trong `Player.sanitize` hoặc móc `sanitize` của module `events` (G9).

**Gói { t }**: không có gói mới; `me.bossL` (để HUD cửa sổ Nhân vật hiện "Lượng boss hôm nay: n/60") qua `selfData`.

**Module/cửa sổ/DOM**: `core/combat.js` (khối chia thưởng boss, dòng tính `luong` theo hạng sát thương), móc `sanitize`/`selfData` ở `modules/events`. Cửa sổ `windows/character.js` thêm một dòng chữ, không id DOM mới.

**Điện thoại**: dòng chữ trong cửa sổ Nhân vật, không thêm nút.

**Chống gian lận**: số đếm chỉ tăng ở máy chủ; ngày lấy `vnDay()`; dữ liệu cũ thiếu trường thì `{ day: '', n: 0 }`.

**Tiêu chí chấp nhận**:
1. Đơn vị (thế giới giả, `tests/features/boss.js` thêm vào `bossCleanupUnitTests`): người chơi hạng 1 ở 4 boss liên tiếp nhận 20 + 20 + 20 + 0 lượng; sang ngày mới (đổi `c.bossL.day`) nhận lại 20.
2. `c.bossL = { day: 5, n: -3, x: 1 }` qua `sanitize` thành `{ day: '', n: 0 }`.
3. Tà Thú hạng 1 vẫn nhận đủ 30 lượng khi `c.bossL.n = 60`.
4. `npm test` đạt; `npm run check` không dòng `✘`.

**Kiểm thử**: `tests/features/boss.js`.

### 2.3 `pve-tathu` — Tà Thú Xuất Thế (đã có)

**Hiện trạng** (`modules/events`, `world.event`, cửa sổ `windows/event.js`, `#hud-event`):

| Hạng mục | Giá trị |
|---|---|
| Lịch | giờ chẵn phút 30 (giờ VN), báo trước 5 phút, tồn tại 20 phút, 12 lượt/ngày |
| Boss | 3 Tà Thú (cấp 32, 60, 95), chọn ngẫu nhiên, xuất hiện ở bãi có quái lệch ≤ 10 cấp |
| Thưởng theo hạng sát thương | hạng 1: 30 lượng, 1.000 xu × cấp, 3 Rương Báu, 1 sách nội tại đúng phái; hạng 2: 20 lượng, 2 rương, 5 đá; hạng 3: 15 lượng, 2 rương, 3 đá; 4-10: 5 lượng, 1 rương; còn lại ≥ 1% máu: 1 lượng, 100 xu × cấp |
| Gói | `event` (trạng thái), `eventResult` (bảng hạng) |
| Kiểm thử | `tests/features/boss.js` 0b, 0c, 7e (E2E thấy biểu ngữ và chiêu niệm) |

**Phần cần nâng**: HP theo số người đủ cấp (`eventHpMul`, `cmb-balance`); thêm Tà Thú cấp cao và chọn boss thông minh (2.4); nhường 2 lượt/ngày cho Yêu Quái Lễ Hội khi có lễ (7.3).

**Tiêu chí chấp nhận (đang đạt)**: `npm test` đạt phần 0b, 0c, 7e; `npm run check` kiểm Tà Thú có bãi hợp cấp, `VARIANT`, `AURA2`.

### 2.4 `pve-tathu-199` — Tà Thú cấp cao

**Mục đích**: người cấp 120-199 có Tà Thú hợp sức; lượt Tà Thú không rơi vào boss mà không ai online đủ cấp đánh.

**Quy tắc** (đặc tả gốc: `content/50-worldboss-events.md` mục 4):
- Thêm 3 boss ở gói `src/shared/data/bosspacks/tathu.js`: Hắc Thủy Tà Giao (130, Thủy), Tuyết Ma Tà Hồ (160, Thủy), Diêm La Tà Quân (190, Hỏa). Không chiêu triệu hồi, chiêu mạnh nhất ×1,8.
- `TATHU.bosses` thêm 3 id. Chọn boss bằng hàm thuần `pickTathu(bosses, players, mapsOf)`: chỉ boss có bãi hợp cấp; ưu tiên boss có người online cấp `[lv − 10, lv + 30]` không ở phó bản; không có thì ngẫu nhiên trong boss có bãi.
- `bookOf(cls, lv)`: sách hạng 1 theo cấp boss `< 45 → 15`, `< 80 → 35`, `< 125 → 50`, `< 155 → 120`, còn lại `150`.
- Số đo: HP một người (×420) 15,3 / 22,9 / 31,9 triệu; EXP (×150 × `expScale`) 165.375 / 348.300 / 791.775.

**Dữ liệu**: `bosspacks/tathu.js`, `extras.js` (`TATHU.bosses`). Hình: `VARIANT` (`dragonK`, `fox9`, bí danh `HUM.ev_diemla = HUM.boss_god`), `AURA2` (`render/monster/`).

**Gói { t }**: không đổi (`event`, `eventResult`).

**Module**: `modules/events` (`pickTathu`, `bookOf`, export `stoneOf`).

**Điện thoại**: không đổi giao diện.

**Chống gian lận**: boss vẫn chỉ do lịch hoặc lệnh admin `/event` gọi; không hành động client nào.

**Tiêu chí chấp nhận**:
1. `tests/features/boss.js` `bossUnitTests`: `bookOf(0, 130)` là sách req 120, `bookOf(0, 190)` req 150, `bookOf(0, 95)` req 50; `pickTathu(['ev_hacviem','ev_diemla'], [{ lv: 35, map: { def: {} } }], (k) => (k === 'ev_diemla' ? [] : ['wasteland'])) === 'ev_hacviem'`; danh sách rỗng trả `null`; `MONSTERS.ev_diemla.event && MONSTERS.ev_diemla.pack === 'tathu'`.
2. `npm run check`: Tà Thú cấp ≤ 125 thiếu bãi là `✘`; > 125 thiếu bãi là `⚠` (thành `✘` khi `CHECK_RELEASE=1`).
3. `npm test` đạt; ảnh `tools/shot.js` 3 boss mới (desktop + `mobile: true`) in `OK no console errors` khi vùng tương ứng đã có bãi.

**Kiểm thử**: `tests/features/boss.js`.

### 2.5 `pve-worldboss` — Hung Tinh Giáng Thế

**Mục đích**: đỉnh hoạt động chung theo giờ cho mọi dải cấp (P4), mỗi người có một boss hợp sức ở gần mình; boss đêm cho người chơi khuya.

**Luồng người chơi**:
1. 5 phút trước khung: thông báo toàn máy chủ + gói `wb` → dòng lịch trong khối nhiệm vụ HUD đổi "Sắp tới: Hung Tinh 13:00".
2. Đúng giờ: 9 boss xuất hiện ở 9 bãi (mỗi dải cấp một boss). Mỗi người online nhận tin hệ thống "Hung Tinh hợp cấp ngươi: <tên> (cấp L) tại <bản đồ>". Viên `#hud-wb` hiện tên boss hợp cấp, bản đồ, % máu, đồng hồ; bấm thì tự tìm đường (`goEvent`).
3. Đứng cùng bản đồ: mỗi 3 giây nhận `wbDmg` (top 5 và hạng của mình), desktop có khung `.wb-board`.
4. Boss bị hạ: cửa sổ kết quả như Tà Thú (`eventResult` có `k: 'wb'`).

**Quy tắc** (đặc tả gốc `content/50` mục 3; chốt lại ở đây):

| Hạng mục | Giá trị |
|---|---|
| Khung | 09:00, 13:00, 17:00, 19:00, 23:00 (đêm, "Canh Ba Hung Tinh"), mỗi khung 30 phút, báo trước 5 phút |
| Dải cấp | 25, 45, 65, 88, 108, 128, 148, 168, 188; mỗi dải 2 boss luân phiên `(ngày × 5 + khung) % 2` (18 boss `wb_*`) |
| Bản đồ | bãi có trung bình cấp quái lệch ≤ 10 so với dải, mỗi boss một bãi khác nhau; dải chưa có bãi (Thượng Giới chưa làm) thì bỏ, không lỗi |
| Máu | `HP quái cùng cấp × (400 + 150 × n)`, n = người online cấp `[lv − 15, lv + 20]` không ở phó bản, 1 ≤ n ≤ 25. Ước tính: 1 người 10,7-13,4 phút, 10 người 3,7-4,6 phút, 25 người 3,2-4,0 phút |
| Công/thủ | như boss thường sau `cmb-balance`; chiêu mạnh nhất ≤ ×1,8; `nova` 2,0 chỉ ở dải ≤ 108; không `summon` |
| EXP | gốc × 100 × `expScale`; chia `(0,15 + phần sát thương) × Giờ Vàng`, người vượt cấp ×0,1 |
| Thưởng hạng (xu nhân cấp boss) | hạng 1: 15 lượng, 600 xu, 2 rương, 3 đá, 1 ngọc cấp `min(6, 1 + ⌊lv/35⌋)`, 1 sách nội tại đúng phái; 2-3: 8 lượng, 400 xu, 1 rương, 2 đá, 1 ngọc; 4-10: 3 lượng, 250 xu, 1 rương, 1 đá; còn lại ≥ 0,5% máu: 1 lượng, 100 xu, 1 đá |
| Hệ số | khung đêm ×1,5 lượng/xu và top 10 thêm 1 rương; thứ Bảy, Chủ Nhật ×1,25 (nhân dồn) |
| Vượt cấp | cấp > boss + 20: không hạng, không thưởng, không đồ rơi, EXP ×0,1, không tính vào n |
| Đồ rơi | về người không vượt cấp có sát thương cao nhất **đang ở bản đồ** |
| Lễ hội | khi có mùa: hạng có thưởng nhận thêm token `drop.wb` (6-10 mặc định) |

**Dữ liệu**: `src/shared/data/worldboss.js` (`WORLDBOSS`, `WB_HP`, `WB_MUL`, `wbHpMul`, `gemLv`), `src/shared/data/bosspacks/{index,worldboss}.js` (khung gói boss, id tiền tố `wb_`, `ev_`, `cb_`), gộp vào `MONSTERS` trong `monsters.js` (một vòng, `M.pack`, `M.wb` trên dữ liệu; `m.wb` trên quái đang sống do module gán).

**Gói { t }**:

| Hướng | Gói | Nội dung |
|---|---|---|
| S→C | `wb` | `{ k: 'wb', on, title, night, left, next, list: [{ id, key, name, lv, map, mapName, x, hp, dead }] }` khi vào game, báo trước, xuất hiện, boss bị hạ, kết thúc, mỗi 10 giây khi mở |
| S→C | `wbDmg` | `{ id, top: [[tên, pct]] (≤ 5, không gồm người vượt cấp), me: [hạng, pct] }` mỗi 3 giây cho người cùng bản đồ |
| S→C | `eventResult` | như Tà Thú thêm `k: 'wb'` |
| C→S | không có | Hung Tinh chỉ do lịch hoặc admin `/hungtinh` |

**Module/cửa sổ/DOM**: module mới `src/server/modules/worldboss/index.js` (`expose: 'wb'`, móc `second` order 3, `join`, `clientData`); `core/combat.js` 2 chỗ (`kill`: nhánh `m.wb`, xóa quái `m.wb`); `modules/dungeon.pickBoss` bỏ `wb`; `src/server/index.js` config `worldboss: process.env.WB !== '0'`; admin `/hungtinh [start [dải]|stop|<boss> <bản đồ>]`. Client: `#hud-wb` (`index.html` sau `#hud-event`), `windows/event.js` (`setWorldBoss`, `.wb-board`), `game.js` (nhận `wb`, `wbDmg`), `windows/map.js` (dấu Hung Tinh trên bản đồ thế giới). Hình boss: `VARIANT`, `AURA2`, bí danh `HUM` (`content/50` mục 8.3).

**Điện thoại**: `#hud-wb` cao ≥ 44 px, ẩn `.wb-board`; khi `#hud-event` đang hiện thì `#hud-wb` dời lên 44 px; bấm viên là tự tìm đường.

**Chống gian lận/nhân bản**: không hành động client; người vượt cấp không thổi phồng HP; không gọi bù khi khởi động lại; thưởng hạng trao bằng `give()` (G3), không rơi ra đất; `rank` chỉ đếm người không vượt cấp.

**Tiêu chí chấp nhận** (đo bằng lệnh):
1. `tests/features/worldboss.js` `worldBossUnitTests` 7 ý của `content/50` mục 3.6: `slotAt('2026-10-19T13:10+07').i === 1`; `nextSlotAt('2026-10-19T23:40+07') === '2026-10-20T09:00+07'`; `inBand(10, 25) && !inBand(9, 25) && inBand(45, 25) && !inBand(46, 25)`; `rewardTier(1, 5).luong === 15`; `slotMul(Chủ Nhật 23:05, đêm) === 1.875`; `wbMaps(25)` chứa `bat_cave`; `MONSTERS.wb_docnha.hp === baseStats(25).hp × 550`.
2. `worldBossTest` (bot `wbbot1`): gọi `/hungtinh wb_docnha bat_cave` → gói `wb.on`, `list.length === 1`; hạ boss → `eventResult.me.rank === 1`; ở cấp 120 hạ lại → `me.rank === 0` và phần thưởng chứa "vượt cấp", lượng không tăng.
3. `npm run check`: khung không chồng nhau, dải tăng ngặt, mỗi boss đúng một dải, dải ≤ 120 có bãi; dòng lịch `wb_*` khớp `slots`.
4. `npm run test:perf` với Hung Tinh bật trên bản đồ đo giữ ≥ 55 khung/giây trung bình; ảnh `#hud-wb` desktop + điện thoại in `OK no console errors`.

**Kiểm thử**: `tests/features/worldboss.js`, `tests/e2e/perf.js`, `tests/e2e/e2e.js` (biểu ngữ).

### 2.6 `pve-clanboss` — Boss gia tộc bậc cao

**Mục đích**: gia tộc cấp 9-10 có mục tiêu chung ở Tộc Địa (P4). Con của `clan-war` (`specs/clanwar.md`, Tộc Địa có bậc `tier`).

**Quy tắc** (`content/50` mục 5): gói `bosspacks/clan.js` thêm Băng Tâm Hộ Tộc Thần (140, gia tộc cấp 9) và Thần Long Tổ Miếu (180, gia tộc cấp 10); `CLAN.terr.tiers` thêm 2 bậc; tộc trưởng chọn bậc bất kỳ đã mở khi mở Tộc Địa (`clanTerrOpen { tier }`, máy chủ kẹp `tier` trong `0..tiers.length − 1` và kiểm cấp gia tộc). HP theo `CLAN_HP` của clanwar: 42,0 triệu và 68,4 triệu. Khung gói boss `bosspacks/index.js` (tiền tố `cb_`) do việc nào trong `pve-clanboss`/`pve-worldboss` vào trước tạo ra. Rơi: Đá Cường Hóa Thần 2/3 viên, sách req 120/150 (3%).

**Dữ liệu**: `bosspacks/clan.js`, `src/shared/data/clan.js` (`terr.tiers`). **Gói**: `clanTerrOpen { tier }` (có sẵn trong clanwar). **Module/cửa sổ**: `modules/clanwar` (1 dòng kẹp), `windows/clanwar.js` (vẽ thẻ cho mọi bậc trong `S.G.clan.terr.tiers`). **Điện thoại**: 5 thẻ bậc lưới 2 cột, mỗi thẻ ≥ 44 px cao. **Chống gian lận**: chỉ tộc trưởng mở, tier ngoài khoảng bị từ chối, thưởng boss gia tộc là thưởng sự kiện (G2).

**Tiêu chí chấp nhận**: `tests/features/clanwar.js` thêm ca: gia tộc cấp 1 gửi `clanTerrOpen { tier: 4 }` → `notice` "Cần gia tộc cấp 10."; `tier: 9` không mở; `npm run check` kiểm `clanLv` tăng và boss có `clan`; ảnh tab Tộc Địa 5 thẻ desktop + điện thoại in `OK no console errors`.

**Kiểm thử**: `tests/features/clanwar.js`.

---

## 3. Phó bản

### 3.1 `pve-dungeon` — Hang Động Thử Thách (đã có)

**Hiện trạng** (`modules/dungeon`, NPC loại `dungeon` "Hộ Pháp" ở mỗi làng, x = 190):

| Hạng mục | Giá trị |
|---|---|
| Vào | từ cấp 10, 3 lượt/ngày, cả nhóm đứng gần cùng bản đồ vào một bản sao `dungeon#n` |
| Lượt chơi | 5 đợt quái (quái thường gần cấp trung bình nhóm) + boss bản đồ gần cấp nhất, 10 phút |
| Thưởng | `expNeed(cấp) × 0,22`, `1.000 + 300 × cấp` xu, 1 Rương Báu, 3 đá theo cấp; thông báo toàn máy chủ |
| HUD | `#map-info` "Đợt 2/5 · 7:12" (gói `dungeon`) |
| Kiểm thử | `tests/features/daily.js`: Hộ Pháp cho vào, người cấp thấp bị loại, đợt 1 có quái, rời về làng, trừ lượt 2/3 |

**Phần cần nâng**: hệ số máu boss phó bản (`BOSS_HP = 0,5`) ở `cmb-balance`; lớp `Dungeon` nhận tham số `opts` (bản đồ, cấp, nhóm quái, boss, số đợt, thời gian, `bossHp`) để Thí Luyện Động và Ấn Đài dùng lại: làm trong `pve-caves` (`specs/dungeons.md` 3.1); `pickBoss` bỏ boss `cave`, `clan`, `wb`, `trial`.

**Tiêu chí chấp nhận (đang đạt)**: phần 6 của `npm test` (`tests/features/daily.js`) đạt 6 ý về phó bản.

### 3.2 `pve-caves` — Thí Luyện Động

**Mục đích**: phó bản có độ khó tăng dần cho cấp 30-120 (P3), lý do lập nhóm hằng ngày (P4).

**Luồng người chơi**: nói chuyện Hộ Pháp từ cấp 30 → lựa chọn "Thí Luyện Động" (đứng đầu danh sách) → cửa sổ **Hang Động** 3 thẻ hang → chọn độ khó → "Vào hang" / "Vào hang cùng nhóm" → 5 đợt, đợt 5 boss riêng của hang → thưởng.

**Quy tắc** (đặc tả gốc `specs/dungeons.md`):

| Hang | Khung cấp | Theme | Boss (Thường/Khó/Ác mộng) | Thưởng lần đầu (lượng) |
|---|---|---|---|---|
| Hang Thạch Nhũ (`thachnhu`) | 30-59 | `cave` | Thạch Giáp Cự Nhân 36/42/48 | 3 / 5 / 10 |
| Hàn Băng Động (`hanbang`) | 60-89 | `crystal` | Hàn Băng Long Mẫu 66/72/78 | 5 / 10 / 15 |
| Luyện Ngục Động (`luyenguc`) | 90-120 | `lava` | Luyện Ngục Ma Tôn 96/102/108 | 10 / 15 / 20 |

| Độ khó | Cấp quái cộng | Cấp người tối thiểu | Máu/công/thủ/EXP | Thời gian | Thưởng EXP |
|---|---|---|---|---|---|
| Thường | +0 | cấp hang | ×1 | 10 phút | `expNeed(min(cấp, boss)) × 0,15` |
| Khó | +6 | +5 | ×1,35 / 1,15 / 1,1 / 1,3 | 10 phút | × 0,22 |
| Ác mộng | +12 | +10 | ×1,8 / 1,3 / 1,2 / 1,7 | 12 phút | × 0,3 |

- 2 lượt mỗi hang mỗi ngày (mọi độ khó dùng chung); Khó/Ác mộng chỉ mở khi người mở hang (trưởng nhóm) đã vượt độ khó trước (`best`).
- Boss hang: máu `baseStats × 75`, công ×1,5, thủ ×1,6, EXP ×30, không bị `BOSS_HP` giảm thêm (`bossHp: 1`).
- Thưởng mỗi người: EXP, xu, đá, rương; Khó/Ác mộng thêm ngọc ngẫu nhiên; Ác mộng thêm Bí Kíp Nhân Đôi và loan báo toàn máy chủ.
- Mở rộng 120-199 **không** làm ở đây: thuộc `pve-dungeon-multi` (3.3).

**Dữ liệu**: `src/shared/data/caves.js` (mới, dữ liệu thuần); quái/boss sinh 3 bản theo độ khó trong `monsters.js` (`<id>_<0|1|2>`); 3 bản đồ `instance` trong `maps.js`; `gamedata.js` gửi `art, cid, cave, diff, clan`.

**Gói { t }**:

| Hướng | Gói | Trường |
|---|---|---|
| C→S | `caveEnter` | `npc` (chuỗi), `cave` (chuỗi id hang), `diff` (0-2) |
| S→C | `openUi` | `{ ui: 'caves', npc }` |
| S→C | `dungeon` | thêm `cave, name, diff` |
| S→C | `me.caves` | `{ day, runs, best }` |
| S→C | `data.caves` | `{ rules, diffs, list }` |

**Module/cửa sổ/DOM**: module mới `modules/caves` (`expose: 'caves'`, `CaveRun extends Dungeon`), sửa tối thiểu `modules/dungeon` (tham số `opts`, lựa chọn hội thoại), admin `/hang vao|win|reset|mo`. Cửa sổ mới `windows/caves.js` (`renderCaves`), CSS cuối `features.css`. Không id DOM mới (dùng `[data-act]` có sẵn cho nút).

**Điện thoại**: 3 thẻ hang xếp dọc cuộn được, nút độ khó ≥ 44 px, nút "Vào hang" dính chân cửa sổ.

**Chống gian lận**: chỉ dùng `cave` (tra `own(CAVE_BY_ID)`) và `diff` (`int`, kẹp 0-2) từ client; trừ lượt **trước** khi tạo bản sao; thành viên vắng mặt/đang lôi đài/khác bản đồ bị loại; thưởng chỉ cho `memberNames` còn trong bản đồ; quà qua `give()` (G3); hủy giao dịch đang mở khi vào hang.

**Tiêu chí chấp nhận**:
1. `tests/features/caves.js` đơn vị: `thachnhu_doi_0` có hp 2440, atk 296, def 45, exp 250; `thachnhu_vuong_0` hp 251.400; `cleanCaves` bỏ khóa lạ, kẹp `runs` 0-2, `best` 0-3; `caveReason` trả đúng 4 câu theo thứ tự kiểm.
2. Bot: vào hang qua `/hang vao thachnhu 0`, nhận `dungeon.cave === 'thachnhu'`; `/hang win` → `notice` thưởng và `me.caves.best.thachnhu === 1`; vào lần 3 trong ngày bị từ chối "Hôm nay đã hết lượt".
3. `npm run check` sạch (quái/boss hang có hình `art`, summon trỏ đúng độ khó); `npm test` đạt; ảnh cửa sổ Hang Động và HUD trong hang (desktop + điện thoại) in `OK no console errors`.

**Kiểm thử**: `tests/features/caves.js`.

### 3.3 `pve-dungeon-multi` — Ấn Đài Thượng Giới (thiết kế mới)

**Mục đích**: hậu kỳ (120-199) cần một phó bản nhóm dài hơn, có cơ chế khác "đánh đợt quái" (P3) và boss riêng mỗi ải, là nguồn chính của Mảnh Thần Binh ngoài boss vùng (P5, đi cùng `gear-tier-199`). Gắn cốt truyện "tám Thiên Ấn" của `content/30-quests.md` (P1). Loại cơ chế "phó bản nhiều ải nối nhau" có ở game tham khảo; nội dung và tên tự đặt.

**Luồng người chơi**:
1. Hộ Pháp (từ cấp 120) có lựa chọn "Ấn Đài Thượng Giới" → cửa sổ **Ấn Đài**: 4 thẻ, mỗi thẻ ghi khung cấp, 3 boss (hình vẽ thật), lượt còn hôm nay, thưởng, đã vượt chưa.
2. Trưởng nhóm bấm "Vào Ấn Đài" → cả nhóm đứng gần (≤ 300 px) vào ải 1.
3. **Ải 1 – Tiền Điện** (sóng quái): 3 đợt quái vùng, đợt 3 có Hộ Ấn Tướng (boss ải 1). Hạ xong: cổng sáng ở mép phải, cả nhóm bước qua (hoặc tự chuyển sau 15 giây).
4. **Ải 2 – Phong Ấn Trận** (giữ nhịp): 3 Trụ Phong Ấn đứng yên ở 3 bục; quái sinh liên tục (tối đa 12 con sống). Phá đủ 3 trụ trong 4 phút thì boss ải 2 hiện ra; quá 4 phút trụ hồi đầy máu một lần (không thua ngay). Hạ boss ải 2 → cổng.
5. **Ải 3 – Ấn Điện** (boss): trùm 3 chiêu, cuồng nộ dưới 30% máu. Hạ trùm → thưởng, thông báo toàn máy chủ, bản sao đóng sau 20 giây.
6. Tổng thời gian 20 phút cho cả 3 ải; hết giờ thì về làng, **vẫn nhận** thưởng các ải đã qua (một phần), không nhận thưởng trùm.

**Quy tắc và số liệu** (tính bằng `gddwork/lab/m05d/trials.js`):

| id | Tên | Cấp Ấn Đài (`lv`) | Khung cấp vào | Theme ải 1 / 2 / 3 | Boss ải 1 | Boss ải 2 | Trùm ải 3 | Mảnh rơi |
|---|---|---:|---|---|---|---|---|---|
| `thuyhoa` | Ấn Đài Thủy Hỏa | 125 | 120-139 | `beach` / `lava` / `dragon_palace` | Triều Âm Hộ Vệ (`crab`, thân `emperor`, Thủy) | Hỏa Ấn Thủ Tướng (`golem`, thân `crystalK`, Hỏa) | Song Ấn Long Quân (`beast`, thân `dragonK`, Thủy) | `frag_bl`, `frag_xv` |
| `bangtho` | Ấn Đài Băng Thổ | 145 | 140-159 | `ice` / `desert` / `ruins` | Băng Ấn Hàn Vệ (`golem`, `yetiK`, Thủy) | Sa Ấn Cổ Thi (`humanoid`, bí danh `HUM.boss_pharaoh`, Hỏa) | Hoàng Lăng Thổ Long (`beast`, `serpent`, Phong) | `frag_bn`, `frag_hl` |
| `moctinh` | Ấn Đài Mộc Tinh | 165 | 160-179 | `swamp` / `dark_forest` / `starfield` | Mộc Ấn Thụ Linh (`imp`, `oniK`, Phong) | Tinh Ấn Dạ Điểu (`flyer`, `batK`, Phong) | Tinh Mộc Song Hồn (`ghost`, thân `frost`, Thủy) | `frag_um`, `frag_th` |
| `amcuc` | Ấn Đài Ám Cực | 185 | 180-199 | `abyss` / `hell` / `heaven` | Ám Ấn Ma Kỵ (`humanoid`, bí danh `HUM.boss_god`, Hỏa) | Cực Ấn Thiên Lang (`beast`, `wolfK`, Phong) | Hư Ảnh Ma Tôn (`humanoid`, bí danh `HUM.boss_heaven`, Hỏa) | `frag_hd`, `frag_tc` |

| Thành phần | Cấp | Máu | Công / thủ | EXP |
|---|---|---|---|---|
| Quái ải | `lv` đến `lv + 4`, chọn bằng `pickPool(lv)` của phó bản (quái thường vùng gần nhất) | `baseStats × partyMul(n)` | `baseStats` | `baseStats` |
| Trụ Phong Ấn (`tr_tru`, `golem`, thân `crystal`, cờ `noAttack: true`, `speed: 0`) | `lv + 3` | `baseStats.hp × 8 × partyMul(n)` | không đánh, thủ ×1 | 0 |
| Boss ải 1 | `lv + 2` | `baseStats.hp × 40 × partyMul(n)` | ×1,5 / ×1,6 | `baseStats.exp × 30 × expScale` |
| Boss ải 2 | `lv + 4` | `baseStats.hp × 50 × partyMul(n)` | ×1,5 / ×1,6 | như trên |
| Trùm ải 3 | `lv + 8` | `baseStats.hp × 90 × partyMul(n)` | ×1,5 / ×1,6 | như trên |

- `partyMul(n) = 0,6 + 0,2 × n`, n = số người vào lúc mở (1-6): 1 người 0,8; 3 người 1,2; 6 người 1,8. Không đổi giữa chừng khi có người rời (chống "vào đông rồi rời bớt").
- Số đo trùm (nhóm 3 người): Ấn Đài 125: 4,11 triệu máu, công 4.394; Ấn Đài 145: 5,39 triệu; 165: 6,84 triệu; 185: 8,47 triệu (`trials.out.txt`). Mục tiêu cân bằng: nhóm 3 người trung bình hạ trùm 3-6 phút, đo bằng `tools/balance.js` (`dev-balance-tool`); lệch thì chỉnh hệ số máu (40/50/90), không nới dải.
- Chiêu (helper có sẵn, không `summon`, mạnh nhất ≤ ×1,8, `nova` 2,0 chỉ ở trùm `thuyhoa`): mỗi boss ải 2 chiêu, mỗi trùm 3 chiêu. Tên chiêu theo boss (ví dụ Song Ấn Long Quân: `beam(300, 1.8, 'Song Ấn Long Tức')`, `quake(130, 1.7, 'Thủy Hỏa Chấn')`, `nova(150, 2.0, 'Ấn Bạo')`); người làm dữ liệu đặt tên Hán-Việt theo hệ của boss.
- Lượt: **1 lượt/ngày cho mỗi Ấn Đài đúng khung cấp** (người cấp 140 chỉ vào được `bangtho`); trừ lượt lúc vào cho mọi thành viên.
- Thưởng mỗi người (thưởng phó bản, G2 = thường):

| Ải | EXP | Xu | Vật phẩm |
|---|---|---|---|
| Qua ải 1 | `expNeed(min(cấp, lv + 8)) × 0,08` | `lv × 150` | 1 Đá Cường Hóa Thần |
| Qua ải 2 | × 0,10 | `lv × 200` | 1 Đá Thần, 1 Mảnh Thần Binh vùng thứ nhất |
| Hạ trùm | × 0,17 | `lv × 400` | 2-3 Mảnh Thần Binh (ngẫu nhiên một trong hai vùng), 1 Rương Thượng Giới (`chest_up`, chưa có thì 2 Rương Báu), sách nội tại req 120 (Ấn Đài 125, 145) hoặc 150 (165, 185) 3% mỗi cuốn, `mount_evo` 30% nếu vật phẩm tồn tại |
| Lần đầu hạ trùm | | | 20 lượng (một lần mỗi Ấn Đài) |

Tổng EXP một lượt đủ 3 ải = 0,35 `expNeed`: cấp 133 là 138.325, cấp 193 là 975.296.

**Dữ liệu**: file mới `src/shared/data/trials.js` (dữ liệu thuần, không require `monsters/maps/items`): `TRIALS` (bảng trên, mỗi boss `{ id, name, type, art, pal, el, scale, skills }`), `TRIAL_RULES = { daily: 1, range: 300, time: 20 * 60000, stageWaves: 3, sealN: 3, sealTime: 4 * 60000, maxAlive: 12, hp: [40, 50, 90], party: [0.6, 0.2] }`, `trialKey`, `partyMul`. Quái/boss/trụ sinh trong `monsters.js` (khối trước `module.exports`, tiền tố `tr_`, cờ `trial: true`). Bản đồ: 12 bản đồ `instance` (`tr_<id>_<1|2|3>`, rộng 1100, bố cục như phó bản, cổng trái `@home`) trong `maps.js`.

**Gói { t }**:

| Hướng | Gói | Trường |
|---|---|---|
| C→S | `trialEnter` | `npc` (chuỗi), `id` (chuỗi id Ấn Đài) |
| S→C | `openUi` | `{ ui: 'trials', npc }` |
| S→C | `dungeon` | thêm `trial, name, stage (1-3), stages: 3, seal: số trụ còn` |
| S→C | `me.trials` | `{ day, runs: { id: 0..1 }, best: { id: 0|1 } }` |
| S→C | `data.trials` | `{ rules, list: [{ id, name, lv, minLv, maxLv, bosses: [id], rewards }] }` |

**Module/cửa sổ/DOM**: module mới `src/server/modules/trials/index.js` (`expose: 'trials'`, lớp `TrialRun extends Dungeon`: giữ danh sách 3 `GameMap`, chuyển ải bằng `world.enterMap(p, nextMap, 90 + i × 14)`, `update` của module dungeon tự chạy lượt vì lượt nằm trong `world.dungeons`); `core/monster.js` thêm nhánh `noAttack` (không chọn mục tiêu, không đánh, vẫn nhận sát thương); `modules/dungeon` thêm lựa chọn "Ấn Đài Thượng Giới" (≥ 120) cạnh "Thí Luyện Động"; admin `/andai vao <id>|win|next|reset`. Cửa sổ mới `windows/trials.js` (`renderTrials`); HUD dùng `#map-info` ("Ải 2/3 · Trụ 1/3 · 14:05"). Hình: `VARIANT`/`AURA2`/bí danh `HUM` cho 12 boss (`render/monster/`).

**Điện thoại**: 4 thẻ xếp dọc, mỗi thẻ có 3 icon boss 32 px; nút "Vào Ấn Đài" ≥ 44 px; chữ `#map-info` rút gọn "Ải 2/3 · 14:05".

**Chống gian lận/nhân bản**: chỉ nhận `id` chuỗi tra `own()`; kiểm cấp và lượt từng thành viên; trừ lượt trước khi tạo bản sao; thưởng ải trao **một lần** (cờ `run.paid[stage]`) cho người có tên trong `memberNames` đang ở bản đồ ải; rời bản sao giữa chừng không vào lại được (bản sao gắn tên); lần đầu (`best`) ghi trước khi cộng lượng; quà qua `give()` (G3).

**Tiêu chí chấp nhận**:
1. `tests/features/trials.js` đơn vị: `partyMul(1) === 0.8`, `partyMul(6) === 1.8`; `MONSTERS.tr_thuyhoa_3` (trùm) có `hp === Math.round(baseStats(133).hp × 90)` ở mức 1 người chuẩn hóa (`partyMul` áp lúc sinh); `cleanTrials` kẹp `runs` 0-1, `best` 0-1, bỏ khóa `__proto__`.
2. Bot (`andai1`, cấp 125): `/andai vao thuyhoa` → `dungeon.trial === 'thuyhoa'`, `stage === 1`; `/andai next` hai lần → `stage === 3`; `/andai win` → nhận `notice` thưởng có "Mảnh Thần Binh" và lần đầu `+20 lượng`; vào lần 2 cùng ngày bị từ chối; gửi `trialEnter { id: '__proto__' }` không làm sập máy chủ.
3. `npm run check`: 12 boss có 2-3 chiêu đúng dải, `VARIANT`/`AURA2`, 12 bản đồ `instance` có cổng `@home`; mảnh rơi tồn tại hoặc cảnh báo khi `gear-tier-199` chưa vào.
4. `tools/balance.js` in dòng Ấn Đài: thời gian trùm với nhóm 3 người trung bình trong 3-6 phút.
5. `npm test` đạt; ảnh cửa sổ Ấn Đài + ải 2 có trụ + trùm (desktop + điện thoại) in `OK no console errors`; `npm run test:perf` không giảm quá 2 khung/giây.

**Kiểm thử**: `tests/features/trials.js`, `tests/e2e/perf.js`.

---

## 4. Việc hằng ngày

### 4.1 `quest-daily-task` — Tiểu Nhị (đã có mã, thiếu kiểm thử)

**Hiện trạng** (`modules/quest`, NPC loại `task`, dữ liệu `DAILY` trong `quests.js`): diệt N quái hợp cấp (`15 + min(25, ⌊cấp/4⌋)`, quái gần cấp có trên bản đồ), 20 lượt/ngày, thưởng `(10 + 8L)(12 + 0,3L)` EXP, `200 + 60L` xu, 1 lượng, mỗi 5 lượt thêm 1 Rương Báu; hủy giữa chừng được; tìm đường `dailyDest`. Không có kiểm thử bot (rủi ro R6 của kiểm kê: nguồn EXP/xu/lượng hằng ngày lớn nhất).

**Phần cần nâng**:
- Kiểm thử bot (việc chính của id này, GĐ 0).
- EXP nhân `expScale(L)` khi nền tảng 199 vào (`content/00-foundation.md` dòng `DAILY.reward`): `core-levelcap-199` làm.
- Xu → xu khóa, rương mỗi 5 lượt → rương khóa (`eco-bound`, `specs/bound.md` dòng `finishDaily`).
- Giữ song song Việc Làng (Tiểu Nhị là "săn quái có thưởng", Việc Làng là "việc đa dạng"); Lệnh Truy Nã không thay Tiểu Nhị.

**Dữ liệu**: `DAILY` (`quests.js`). **Gói**: `npc`, `npcAct { a: 'accept'|'finish'|'cancel' }` (có sẵn). **Module/cửa sổ**: `modules/quest`, `windows/quest.js`. Admin mới cho kiểm thử: `/tieunhi done|reset` (đặt `prog = n` hoặc xóa `c.daily`).

**Điện thoại**: hội thoại NPC có sẵn.

**Chống gian lận**: `finish` chỉ khi `prog ≥ n`; `task` xóa trước khi cộng thưởng; `day` theo `vnDay()`; tiến độ chỉ tăng ở móc `kill` khi đúng quái.

**Tiêu chí chấp nhận**:
1. `tests/features/daily.js` thêm `dailyTaskTest`: nhận việc → `me.daily.task.n === DAILY.count(cấp)`; `npcAct finish` khi chưa đủ không cộng gì; `/tieunhi done` → `finish` cộng đúng `DAILY.reward(cấp).exp` (đọc `me.exp`) và 1 lượng; lượt thứ 5 thêm 1 `chest` trong túi; lượt 21 bị từ chối "đã hoàn thành 20"; `npcAct { a: 'finish' }` gửi 2 lần liền chỉ cộng một lần.
2. `DAILY.reward(120).exp === 46560` (đơn vị).
3. `npm test` đạt.

**Kiểm thử**: `tests/features/daily.js`.

### 4.2 `quest-dailies` — Việc Làng

**Mục đích**: việc hằng ngày đa dạng, gắn làng và đường đi (P1, P2), thưởng theo chuỗi để khuyến khích làm liên tục, có mốc lượng nhỏ (P5).

**Luồng người chơi**: từ cấp 10, phím **Y** (theo `specs/PLAN.md`, thay cho H trong đặc tả cũ), nút "Việc làng" ở chân cửa sổ Nhiệm vụ, hoặc dòng "Việc làng" ở khối theo dõi nhiệm vụ → cửa sổ **Việc Làng** → "Nhận việc" (đứng trong làng bất kỳ) → làm → nộp → nhận thưởng; mốc 3/6/10 việc.

**Quy tắc** (đặc tả gốc `specs/dailies.md` mục 1.1, 2, 3.1-3.5):

| Kiểu | Trọng số | Hệ số thưởng | Cấp | Việc |
|---|---:|---:|---:|---|
| Thu thập | 30 | 1,0 | 10 | mang `5 + ⌊cấp/20⌋` vật phẩm nhiệm vụ của quái cấp `[L − 15, L + 3]` về làng |
| Đưa thư | 25 | 0,8 | 10 | tới NPC loại ngẫu nhiên ở làng khác |
| Săn bảo vật | 25 | 1,2 | 15 | 2 manh mối, đứng mặt đất bấm "Đào", gợi ý nóng/lạnh (≤ 120 / ≤ 320 px), trúng nếu cách ≤ 40 px |
| Hộ tống | 20 | 1,5 | 12 | tiểu đồng theo sau, phải đi qua các bãi nối 2 làng trong 10 phút; mất 5 máu/giây cho mỗi quái nhắm mình trong 140 px |

- 10 việc/ngày; chuỗi +10% mỗi bậc (tối đa +90%); hủy tối đa 3 lần/ngày, hủy hoặc thất bại đưa chuỗi về 0.
- Thưởng `exp = (10 + 8L)(15 + 0,4L) × hệ số × chuỗi × expScale(L)`, `xu = (300 + 80L) × hệ số × chuỗi` (xu khóa, G2). Mốc: việc 3 → 2 đá theo cấp; việc 6 → Rương Báu + Bí Kíp Nhân Đôi; việc 10 → 5 lượng + 2 Rương Báu.
- Ví dụ cấp 30, chuỗi 0, thu thập: 6.750 EXP, 2.700 xu; hộ tống chuỗi 9: 19.238 EXP, 7.695 xu.
- Thủ Hộ Làng (cùng đặc tả) thuộc `evt-village-defense` (mục 04 đặc sắc), không đặc tả lại ở đây.

**Dữ liệu**: `src/shared/data/dailies.js` (`ERRANDS`, `chainMul`, `errandReward`, `stoneOf`). Trường nhân vật `c.dailies = { day, done, chain, best, cancels, ms, cur }`, `cur.lv` 1..`MAX_LEVEL`.

**Gói { t }**: C→S `dlyAccept {}`, `dlyCancel {}`, `dlyTurnIn { npc? }`, `dlyDig {}`; S→C `dlyResult { ok, msg, warm? }`, `me.dailies` (không bao giờ chứa tọa độ bảo vật), `data.dailies`.

**Module/cửa sổ/DOM**: module mới `modules/dailies` (`expose: 'dailies'`, móc `sanitize`, `selfData`, `clientData`, `enterMap`, `playerSecond`, `leave`); cửa sổ `windows/dailies.js` (`renderDailies`); `core/input.js` phím Y; `game.js` vẽ tiểu đồng và dấu `?` trên NPC đích; admin `/viec`.

**Điện thoại**: cửa sổ một cột, nút "Nhận việc"/"Nộp"/"Đào" ≥ 44 px; nút "Đào" cũng có ở cụm kỹ năng khi đang có việc săn bảo vật và đứng đúng bản đồ.

**Chống gian lận**: tọa độ bảo vật chỉ ở máy chủ; đào có hồi 1,5 giây; hộ tống đi tắt (thiếu bãi trong `route`) là thất bại; thoát game khi hộ tống là thất bại; `complete()` là chỗ trao thưởng duy nhất, xóa `cur` trước khi cộng; trừ vật phẩm thu thập cùng lúc kiểm chỗ trống (`canAddItems(items, minus)`).

**Tiêu chí chấp nhận**: theo `specs/dailies.md` mục 6.1 (`tests/features/dailies.js`): `cleanDailies` dọn `__proto__`, cấp ngoài khoảng, tuyến hộ tống sai; `errandReward('collect', 30, 0)` = `{ exp: 6750, xu: 2700 }`; `makeTask` với `rnd` cố định sinh đúng việc; bot nhận, nộp thu thập, đào trúng bằng lệnh admin, hộ tống đi tắt bị đánh thất bại; việc 11 bị từ chối; `npm run check` kiểm `ERRANDS.routes` trỏ bản đồ có thật, mốc 10..190 có vật phẩm `collect`; `npm test` đạt; ảnh cửa sổ Việc Làng và tiểu đồng (desktop + điện thoại) in `OK no console errors`; `npm run test:e2e` cả desktop và `MOBILE=1` đạt (đổi `game.js`, `input.js`).

**Kiểm thử**: `tests/features/dailies.js`, `tests/e2e/e2e.js`.

### 4.3 `quest-truyna` — Lệnh Truy Nã

**Mục đích**: việc ngày ngắn cho cấp ≥ 120, kéo người chơi về bãi vùng của mình, tiêu thụ vật phẩm nhiệm vụ vùng, hướng tới boss vùng (P2).

**Luồng người chơi**: tới Kỳ nhân (`<prefix>_hermit`, NPC loại `hermit`, x = 340 trên bãi đầu vùng) → "Nhận lệnh truy nã (n/3)" → làm → quay lại Kỳ nhân trả lệnh. Thứ tự cố định: săn 40 quái vùng → thu 12 vật phẩm vùng → hạ boss vùng.

**Quy tắc** (đặc tả gốc `content/30-quests.md` mục 0.6, 6.2, 7):

| Hạng mục | Giá trị |
|---|---|
| Điều kiện | cấp ≥ 120 và `r.lv ≤ cấp ≤ r.lv + 19` của vùng có Kỳ nhân |
| Lượt | 3 lệnh/ngày, làm lần lượt; bỏ lệnh không tính lượt; sang ngày lệnh dở bị hủy |
| Thưởng | `expNeed(L) × 0,08 / 0,08 / 0,12` + xu khóa `2.000 + 40L` mỗi lệnh; lệnh cuối ngày thêm Rương Báu + Đá Cường Hóa Thần (khóa) |
| Số mẫu | cấp 120: 83.328 EXP cả ngày (28% cấp); cấp 199: 932.152 (28%) |

**Dữ liệu**: `src/shared/data/sidequests/index.js` (`BOUNTY`, `bountyReward`), cùng module với Kỳ Duyên (`quest-kyduyen`, mục 08). Trường `c.side.bd, bn, b`.

**Gói { t }**: không có hành động mới; `npcAct { id, a: 'bt:acc'|'bt:view'|'bt:fin'|'bt:drop' }` (tầm 130, NPC loại `hermit` đúng vùng); `me.side.b`, `me.side.bn`; `data.side.bounty`.

**Module/cửa sổ**: `modules/sidequest` (mới, chung với Kỳ Duyên), `windows/quest.js` (mục "Lệnh truy nã" trong tab nhiệm vụ phụ), admin `/kyduyen done bounty`.

**Điện thoại**: hội thoại NPC có sẵn; dòng lệnh truy nã trong khối nhiệm vụ HUD bấm được để tự tìm đường tới bãi có quái/boss.

**Chống gian lận**: chuỗi `a` lạ (`__proto__`, số) bị bỏ qua; trả lệnh chỉ ở Kỳ nhân đúng vùng; `gather` kiểm và trừ vật phẩm trong túi lúc trả; `bn` tăng trước khi cộng thưởng.

**Tiêu chí chấp nhận**: `tests/features/sidequest.js` ý 3, 4, 8, 9 của `content/30` mục 10.2: `makeBounty(r.lv, r, 'hunt', () => 0)` trả quái thường của vùng; `bountyReward(160, 'hunt').exp === 75571`, `bountyReward(160, 'boss').exp === 113357`, `BOUNTY.xu(160) === 8400`; bot nhận/trả lệnh 1 → `me.side.bn === 1`; bỏ lệnh 2 → `bn` vẫn 1; đứng xa không nhận được; `npm run check` khối "Kỳ duyên và lệnh truy nã" sạch; `npm test` đạt.

**Kiểm thử**: `tests/features/sidequest.js`.

---

## 5. Đăng nhập và phần thưởng

### 5.1 `evt-checkin` — Điểm danh 7 ngày và Vòng Quay May Mắn (đã có)

**Hiện trạng**:

| Hệ thống | Quy tắc | Dữ liệu | Kiểm thử |
|---|---|---|---|
| Điểm danh | 1 lần/ngày giờ VN, chuỗi liên tiếp, quà vòng 7 ngày (mỗi vòng 15 lượng + 18.000 xu gốc × `(1 + cấp/20)` + vật phẩm), nghỉ một ngày thì chuỗi về 1 | `CHECKIN` (`extras.js`), hành động `checkin` | `tests/features/daily.js`: nhận ngày 1, chặn lần 2 |
| Vòng quay | 10.000 xu hoặc 2 lượng mỗi lượt, 11 ô, trọng số khác nhau theo loại tiền, ô thời trang 7 ngày, trúng 20 lượng thì loan báo; chặn 1,2 giây; túi đầy thì từ chối trước khi trừ tiền | `WHEEL`, hành động `spin` → `spinResult` | `tests/features/daily.js`: quay trả thưởng |

Giá trị kỳ vọng vòng quay lượng (tính từ `WHEEL`): 0,48 lượng trả về mỗi lượt 2 lượng, là chỗ hút lượng có thưởng vật phẩm (P5 đạt).

**Phần cần nâng**: xu thưởng thành xu khóa (`eco-bound`); lịch tháng, bù ngày, giới hạn lượt, mốc tích lũy (5.2).

**Tiêu chí chấp nhận (đang đạt)**: phần 6 của `npm test` đạt 3 ý điểm danh/vòng quay.

### 5.2 `evt-login-rewards` — Điểm danh lịch tháng, vòng quay có mốc

**Mục đích**: người chơi giờ rảnh không mất cả vòng vì nghỉ một ngày (P2); vòng quay lượng có trần mỗi ngày và mốc tích lũy thay cho quay vô hạn (P5). Mức Could: gỡ được bằng bỏ một dòng module, không ai phụ thuộc.

**Quy tắc**:
- **Lịch tháng** thay vòng 7 ngày: tháng dương lịch giờ VN, ô ngày 1..28 (tháng dài hơn thì ngày 29-31 lặp quà ngày 28). Quà ô 7, 14, 21, 28 lớn (lượng, rương, thời trang 7 ngày ở ô 28). Bảng `CHECKIN_MONTH` 28 dòng trong `extras.js`; tổng lượng mỗi tháng ≤ 70 (khoảng 2,3/ngày, bằng mức cũ).
- **Bù ngày**: ngày đã qua trong tháng chưa điểm danh thì bấm "Bù" giá 5 lượng/ngày, tối đa 3 lần/tháng; không bù ngày tương lai; không bù sang tháng khác.
- **Vòng quay**: tối đa 20 lượt lượng/ngày (xu không giới hạn); mốc tích lũy tuần (thứ Hai 0 giờ đặt lại) 10 / 30 / 60 lượt lượng → 1 Bùa Bảo Hộ / 1 thời trang 7 ngày / 1 Rương Thượng Giới (hoặc 3 Rương Báu khi chưa có `chest_up`).
- Dữ liệu cũ `c.checkin = { day, streak }` đổi sang `c.checkin = { m: 'YYYY-MM', days: [số ngày], fix: 0..3 }` trong `sanitize`; người đang có chuỗi được tính ngày hôm nay đã điểm danh nếu `day === vnDay()`.

**Dữ liệu**: `CHECKIN_MONTH`, `WHEEL.dailyLuong = 20`, `WHEEL.milestones = [{ at, items }]` (`extras.js`). Trường `c.wheel = { day, n, wk, wn, got: [] }`.

**Gói { t }**: C→S `checkin { day? }` (không có `day` = hôm nay; có `day` = bù ngày, số nguyên 1-31 qua `int()`), `spin { cur }` (có sẵn), `wheelClaim { at }`; S→C `me.checkin`, `me.wheel`, `spinResult` (có sẵn).

**Module/cửa sổ/DOM**: `modules/checkin`, `modules/wheel`; cửa sổ `windows/checkin.js` (lưới 7 × 4 ô), `windows/wheel.js` (thanh mốc). Không id DOM mới.

**Điện thoại**: lưới 7 cột ô 40 px (vẫn ≥ 44 px chiều bấm nhờ khoảng đệm), thanh mốc nằm dưới vòng quay.

**Chống gian lận**: bù chỉ ngày `< hôm nay` trong tháng hiện tại; trừ lượng trước khi ghi ngày (cùng một hàm, không có khoảng hở); `wheelClaim` kiểm `at` có trong bảng và chưa nhận.

**Tiêu chí chấp nhận**: `tests/features/daily.js` thêm: điểm danh hôm nay → `me.checkin.days` chứa ngày; bù ngày 1 với 5 lượng → lượng giảm 5, lần bù thứ 4 bị từ chối; quay lượng lượt 21 trong ngày bị từ chối; đủ 10 lượt → `wheelClaim { at: 10 }` nhận Bùa, nhận lần 2 bị từ chối; dữ liệu cũ `{ day, streak }` qua `sanitize` không lỗi; `npm test` đạt; ảnh 2 cửa sổ (desktop + điện thoại) in `OK no console errors`.

**Kiểm thử**: `tests/features/daily.js`.

---

## 6. `evt-calendar` — Lịch Sự Kiện và Giờ Vàng

**Mục đích**: người chơi biết hôm nay có gì, mấy giờ, boss nào hợp cấp mình (P2); các sự kiện chung không chồng giờ (P4).

**Hiện trạng**: Giờ Vàng ×2 EXP 12-13h và 20-22h nằm cứng trong `core/world.js` (`GOLDEN_HOURS`), không có kiểm thử, không có cửa sổ lịch.

**Luồng người chơi**: dòng `.qt-cal` cuối khối nhiệm vụ HUD ("Sắp tới: Tà Thú 14:30" hoặc "Đang diễn ra: Hung Tinh") → bấm mở cửa sổ **Lịch Sự Kiện** 3 tab: Hôm nay / Trong tuần / Lễ hội năm. Cửa sổ Lễ hội có nút "Lịch".

**Quy tắc** (đặc tả gốc `content/50` mục 2.5, 9.4):
- `GOLDEN = { daily: [[12, 13], [20, 22]], weekend: [[9, 11]] }`, `goldenAt(ms)` hàm thuần; `world.isGoldenHour()` gọi `goldenAt`.
- `CALENDAR`: mỗi dòng `{ id, k, name, at: [giờ, phút], dur (phút), days (null = mọi ngày), need?, excl?, note }`, dựng từ `WORLDBOSS.slots`, `TATHU`, `GOLDEN`, Thủ Hộ Làng, Chiến Trường, Chiến gia tộc, thưởng tuần lôi đài. Dòng có `need` chỉ hiện khi gói `data` có khóa đó (tính năng đã vào).
- Khi có lễ hội, máy khách đổi tên dòng `tathu_1230` và `tathu_2230` thành "Yêu Quái Lễ Hội" (`evt-festival-boss`, dữ liệu `SEASON_BOSS.hours`).
- Tab Hôm nay: dòng đã qua mờ, đang diễn ra viền vàng có đồng hồ, sắp tới ghi "Còn h giờ m phút", dòng Hung Tinh ghi boss hợp cấp người xem (tính phía client bằng cùng công thức `bossFor`). Tab Tuần: lưới 7 cột (điện thoại: danh sách). Tab Năm: mọi mùa trong `S.G.seasons` theo ngày, token, thời trang độc quyền, nút "Đổi quà" cho mùa đang chạy.

**Dữ liệu**: `src/shared/data/calendar.js` (mới), khung rỗng `src/shared/data/worldboss.js` (`slots: []` cho tới khi `pve-worldboss` điền). `gamedata.js` thêm `calendar`, `golden`.

**Gói { t }**: không có gói mới; dữ liệu tĩnh trong `data`; trạng thái động lấy từ `event`, `wb`, `season` có sẵn.

**Module/cửa sổ/DOM**: `core/world.js` (bỏ `GOLDEN_HOURS`), `core/gamedata.js`; cửa sổ mới `windows/calendar.js` (`renderCalendar`, tab `[data-caltab=day|week|year]`), `ui.js` (import, `refresh()`, nhánh `openUi` `calendar`, dòng `.qt-cal`), CSS `.cal-row`, `.cal-now`, `.cal-past`, `.cal-week`. Không thêm nút `#hud-menu`, không phím tắt.

**Điện thoại**: tab ≥ 44 px; lưới tuần thành một cột; dòng lịch cao ≥ 44 px, chạm dòng sự kiện đang mở là tự tìm đường.

**Chống gian lận**: dữ liệu chỉ để hiển thị; Giờ Vàng vẫn do máy chủ tính.

**Tiêu chí chấp nhận**:
1. `tests/features/eventcore.js` (mới): `goldenAt('2026-10-19T12:30+07') === true` (thứ Hai), `goldenAt('2026-10-19T09:30+07') === false`, `goldenAt('2026-10-18T09:30+07') === true` (Chủ Nhật), `goldenAt('2026-10-19T20:59+07') === true`; `CALENDAR.filter(r => r.k === 'tathu').length === 12`.
2. `npm run check`: id dòng không trùng, giờ hợp lệ, hai dòng `excl` có ngày chung không chồng khoảng; `GOLDEN` không chồng; dòng `defense_*`, `battle_1950`, `clanwar_2115` khớp hằng của tính năng tương ứng khi có.
3. `tests/e2e/e2e.js` thêm bước: bấm `.qt-cal` → cửa sổ Lịch mở, đổi 3 tab, không lỗi console (desktop và `MOBILE=1`, in `E2E ĐẠT`).
4. Ảnh 3 tab (desktop + điện thoại) in `OK no console errors`; `npm test` đạt.

**Kiểm thử**: `tests/features/eventcore.js`, `tests/e2e/e2e.js`.

---

## 7. Lễ hội theo mùa

### 7.1 `evt-season-core` — Khung lễ hội (đã có)

**Hiện trạng** (`modules/season`, `world.season`, NPC loại `event` "Sứ Giả Lễ Hội" ở mỗi làng, cửa sổ `windows/season.js`):

| Hạng mục | Giá trị |
|---|---|
| Lịch | `SEASONS` trong `extras.js`, ngày theo giờ VN, một mùa tại một thời điểm, tự bật/tắt mỗi giây, báo toàn máy chủ khi đổi mùa |
| Rơi | quái cấp ≥ cấp người hạ − `lvGap` rơi token tỉ lệ `rate`; boss rơi `drop.boss`; Tà Thú thưởng hạng thêm `drop.event` |
| Đổi quà | `seasonEx { npc, id, n }`, `n` 1-50 lần liền, `limit` cả mùa mỗi nhân vật, `days` = hạn dùng; tra dòng bằng `Map`; kiểm chỗ trống tính cả ô token sẽ trống |
| Mùa đang chạy | `trangram2026` Lễ Hội Trăng Rằm 25/09-08/11/2026, token Bánh Trung Thu, 9 dòng đổi |
| Admin | `/sukien <id>|tat|auto` |
| Kiểm thử | `tests/features/mail.js` phần 0f và 7i (bật/tắt, đổi quà, giới hạn lượt, thiếu bánh, mã lạ, đứng xa, hết mùa) |

**Tiêu chí chấp nhận (đang đạt)**: phần 0f, 7i của `npm test` đạt; `npm run check` kiểm mùa không chồng ngày, mỗi mùa ≤ 92 ngày, token tồn tại.

### 7.2 `evt-season-plus` — Lễ hội bản 2 (mới)

**Mục đích**: mọi lễ hội có đủ 7 thành phần mà sàn 1.0 yêu cầu (thời gian, vật phẩm rơi, NPC đổi quà có ngoại hình riêng, bảng đổi, nhiệm vụ sự kiện, trang trí bản đồ, boss/sự kiện riêng) bằng **dữ liệu**, thêm mùa mới không sửa mã (P1, P4); phiên 10 phút vẫn có việc lễ hội (P2).

**Luồng người chơi**:
1. Mùa bắt đầu: thông báo "Sự kiện <tên> bắt đầu! Săn quái nhặt <token> rồi tới Sứ Giả <chức danh> trong làng"; làng đổi trang trí; Sứ Giả mặc đồ của mùa.
2. Sứ Giả: "Đổi quà lễ hội" (tab Đổi quà), "Việc lễ hội hôm nay" (tab Việc lễ hội), "Nhận quà mừng lễ" (chỉ ngày chính lễ).
3. Việc lễ hội: 3 việc/ngày (diệt quái, hạ boss, ghé bản đồ), nhận thưởng ở bất kỳ đâu bằng nút "Nhận".

**Quy tắc** (đặc tả gốc `content/50` mục 2.6, 2.7, 6; phần "quà ngày chính lễ" là mới ở tài liệu này):

| Thành phần | Quy tắc |
|---|---|
| Tách file mùa | `src/shared/data/seasons/<id>.js`, tên file = id (`^[a-z]+\d{4}\.js$`), tự dò bằng `fs.readdirSync`, xếp theo `from`; `extras.SEASONS` vẫn export cùng mảng |
| Lược đồ mùa | `id, name, from, until, look, npcTitle, token, tokenDef?, desc, drop { rate, lvGap, boss, event, wb }, fashion, quests, exchange, gift?, codes?` (đúng thứ tự trường) |
| Token mới | dựng ở `items/seasonal.js` từ `tokenDef` (`type: 'event'`, cộng dồn 999, giao dịch được); mùa sau dùng lại token thì `tokenDef: null` |
| Thời trang độc quyền | dòng `fashion` (`[id, tên, ô, mã hình, grade, cấp, chỉ số, màu icon]`), `price: 0`, `season: id`, chỉ có trong `exchange` của chính mùa với `limit` và `days` |
| Quà theo cấp | id `@hp/@mp` (cấp 1/10/30/60/120/160 → bình cỡ 1-6, thiếu thì lùi), `@stone` (1/30/60/90 → Sơ/Trung/Cao/Thần), `@gem` (ngọc loại ngẫu nhiên cấp 1-5 theo cấp 1/40/80/120/160); hàm thuần `resolvePh(id, lv)` |
| Bảng đổi chuẩn | 7 dòng đầu mọi mùa mới, đúng id và thứ tự: `xu` 5 → 6.000 xu; `potion` 8 → 10 `@hp` + 10 `@mp`; `exp2` 15 → 1 Bí Kíp Nhân Đôi; `stone` 20 → 2 `@stone`; `chest` 25 → 1 Rương Báu; `luong` 40 → 5 lượng (10 lượt); `gem` 60 → 1 `@gem` (5 lượt). Hai dòng hậu kỳ `box` 20 → `box_lehoi`, `chest_up` 40 → `chest_up` (5 lượt) do `eco-loot-tables` thêm vào các mùa **chưa bắt đầu** khi vật phẩm có |
| Việc lễ hội | đúng 3 việc: `kill` (n 30-300, quái không phải boss, không thấp hơn cấp mình quá `lvGap`), `boss` (n 1-3, mọi người có sát thương đều được tính, gồm boss bản đồ, Tà Thú, Hung Tinh, Yêu Quái Lễ Hội), `visit` (bản đồ không `town`/`instance`, n = 1); làm mới 0 giờ VN; thưởng token 1-20, xu khóa `xuL × cấp` (0-200), EXP `expF × expNeed(cấp)` (≤ 0,1). Chuẩn: kill `{ tok: 6, xuL: 50, expF: 0.03 }`, boss `{ tok: 8, xuL: 80, expF: 0.04 }`, visit `{ tok: 3, xuL: 20 }` |
| Ngoại hình Sứ Giả | `look ∈ SEASON_LOOKS = trangram, tet, tinhnhan, datto, he, hoatrang, giangsinh`; máy khách vẽ `EVENT_LOOKS[look]` (`render/sprites/npc.js`) qua tham số tùy chọn mới `o.npcLook` của `drawNinja`; chức danh trên đầu = `npcTitle` |
| Trang trí làng | `SEASON_DECOR[look]` (`render/map/season.js` mới): lớp tĩnh vẽ một lần mỗi (bản đồ làng, mùa), hạt bay ≤ 40/màn hình ở bãi ngoài trời trừ theme `lava, hell, abyss, cave, crystal, desert`; `MapRenderer.drawSeason(ctx, camX, camY, W, H, look, t)` (method mới, ghi vào bảng API `CLAUDE.md`) |
| **Quà ngày chính lễ** (mới) | trường `gift: { on: ['YYYY-MM-DD'], items: [[id, sl]] }`: vào ngày có trong `on` (giờ VN, nằm trong mùa), mỗi nhân vật nhận một lần mỗi ngày ở Sứ Giả (lựa chọn "Nhận quà mừng lễ"); ghi `c.season.g = ['YYYY-MM-DD']` |
| Token ở Hung Tinh | hạng có thưởng nhận thêm `drop.wb` token (`world.season.wbBonus()`) |

**Dữ liệu**: `src/shared/data/seasons/{index,<id>}.js` (`SEASON_PH`, `SEASON_LOOKS`, `SEASON_QUEST_KINDS`, `SEASON_BOSS` của 7.3), `src/shared/data/items/seasonal.js`, `extras.js` (lấy `SEASONS`, gộp giftcode mùa vào `GIFTCODES`). Trường nhân vật `c.season = { id, ex, q: { day, p, d }, g: [] }`.

**Gói { t }**:

| Hướng | Gói | Nội dung |
|---|---|---|
| C→S | `seasonEx { npc, id, n }` | có sẵn; dòng có `@` được thay bằng vật phẩm thật theo cấp người đổi |
| C→S | `seasonQClaim { id }` | mới; nhận thưởng việc lễ hội, không cần đứng gần NPC |
| C→S | `npcAct { id, a: 'quest'|'gift' }` | mới trong hội thoại Sứ Giả: mở tab việc / nhận quà ngày chính lễ |
| S→C | `season { id }` | có sẵn |
| S→C | `seasonResult { ok, msg, season }` | có sẵn, dùng cho cả `seasonQClaim` |
| S→C | `openUi { ui: 'event', npc, tab: 'q'? }` | thêm `tab` |
| S→C | `me.season` | thêm `q`, `g` |
| S→C | `data.seasons`, `data.seasonPh` | thêm `from, until, look, npcTitle, quests, gift` (chỉ ngày, không lộ gì bí mật) |

**Module/cửa sổ/DOM**: `modules/season` (`resolvePh`, `labelOf`, `qState`, `questProg`, móc tĩnh `kill`, móc `enterMap`, hành động `seasonQClaim`, `gift`); `windows/season.js` (2 tab `[data-evtab=ex|q]`, thẻ `.evq-card`, chấm đỏ khi có việc xong chưa nhận, nút "Tìm đường" cho việc ghé bản đồ, nút "Lịch"); `render/sprites.js` (2 dòng: tham số `npcLook`, khóa cache), `render/sprites/npc.js` (`EVENT_LOOKS`, tách hình hiện tại thành `trangram`), `render/map/season.js` + `render/maprender.js` (`drawSeason`), `game.js` (truyền `npcLook`, gọi `drawSeason`). CSS cuối `features.css` khối "Lễ hội: việc lễ hội". Không id DOM mới.

**Điện thoại**: tab ≥ 44 px; thẻ việc một cột, nút "Nhận" ≥ 44 px; trang trí và hạt bay giữ ≥ 55 khung/giây ở `test:perf` (nếu tụt thì tắt hạt bay khi `S.settings.lowfx`).

**Chống gian lận/nhân bản**: `seasonQClaim.id` chỉ là chuỗi tra `find`; tiến độ chỉ tăng ở máy chủ (móc `kill`, `enterMap`; bản đồ `instance` không tính ghé); nhận thưởng kiểm `p.lv ≥ t.lv`, chưa nhận, đủ tiến độ, đủ chỗ (`canAddItems`), ghi `q.d` trước khi cộng; `sanitize` dọn `q.p` (khóa `^[a-z0-9_]{1,16}$`, số 0..1e6, `Object.create(null)`), `q.d` ≤ 10, `g` ≤ 10 chuỗi ngày; quà ngày chính lễ ghi ngày trước khi cộng; **mùa đang chạy** (`trangram2026`) không được đổi `exchange` và `drop` cũ (người chơi đang tích bánh), chỉ thêm `look`, `npcTitle`, `quests`, `drop.wb`.

**Tiêu chí chấp nhận**:
1. `tests/features/eventcore.js`: `SEASONS[0].id === 'trangram2026'`, `exchange.length === 9`, dòng `crane` giữ `cost 300, limit 1, days 15`; `extras.SEASONS === seasons.SEASONS`.
2. `tests/features/season.js` đơn vị: `resolvePh('@hp', 5) === 'hp1'`, `resolvePh('@hp', 45) === 'hp3'`, `resolvePh('@stone', 95) === 'stone4'`, `resolvePh('@gem', 130)` là ngọc cấp 4; `sanitize` dọn `__proto__`, số âm, phần tử không phải chuỗi; `questProg` tăng đúng 3 loại việc với quái/boss/bản đồ mẫu; quà ngày chính lễ chỉ nhận được vào ngày trong `gift.on` và một lần.
3. Bot (`sesbot1`): `/sukien trangram2026` → `season.id`; `/tp water_lake` → `me.season.q.p.ngamtrang === 1`; `seasonQClaim ngamtrang` → +3 bánh, gửi lại bị từ chối "đã nhận"; `seasonQClaim { id: { a: 1 } }` không làm sập máy chủ; đổi dòng `potion` vẫn đúng.
4. `npm run check`: lược đồ mọi mùa (mục 6.5 của `content/50`), `look` có trong `EVENT_LOOKS` và `SEASON_DECOR`, ngày `gift.on` nằm trong mùa, mỗi mùa ≤ 92 ngày, không chồng ngày.
5. Ảnh: làng `v_fire` có Sứ Giả + trang trí, cửa sổ Lễ hội 2 tab (desktop + điện thoại) in `OK no console errors`; `npm run test:perf` với `/sukien` mùa có hạt bay giữ ≥ 55 khung/giây; `npm run test:e2e` desktop và `MOBILE=1` đạt (đổi `game.js`).

**Kiểm thử**: `tests/features/eventcore.js`, `tests/features/season.js`, `tests/features/mail.js` (giữ nguyên), `tests/e2e/e2e.js`, `tests/e2e/perf.js`.

### 7.3 `evt-festival-boss` — Yêu Quái Lễ Hội (mới)

**Mục đích**: mỗi lễ hội có một boss riêng mang không khí lễ (P1), là lý do tụ họp cả máy chủ (P4), đánh có tay nghề như Tà Thú (P3). Không tăng tổng số sự kiện boss và tổng lượng phát ra: boss lễ hội **thay** 2 trong 12 lượt Tà Thú mỗi ngày.

**Luồng người chơi**: khi có mùa, lượt Tà Thú 12:30 và 22:30 thành "Yêu Quái Lễ Hội: <tên boss>" (thông báo, biểu ngữ `#hud-event`, lịch). Boss xuất hiện ở bãi hợp cấp; đánh và nhận thưởng như Tà Thú, thêm token và quà lễ.

**Quy tắc**:
- `SEASON_BOSS = { hours: [12, 22], tiers: [40, 100, 160], title: 'Yêu Quái Lễ Hội', tokMul: 1.5, topBox: 10 }` (`seasons/index.js`).
- Mỗi `look` có một boss, sinh 3 bậc cấp 40/100/160, id `ev_<look>_<bậc>` (ví dụ `ev_tet_40`), trong gói boss mới `src/shared/data/bosspacks/season.js` (`key: 'season', kind: 'event'`, thêm vào `PACKS`). Boss lễ hội **không** nằm trong `TATHU.bosses`.
- Chọn bậc: `pickTathu([ev_<look>_40, _100, _160], người online, eventMaps)` (2.4): ưu tiên bậc có người online đủ cấp và có bãi hợp cấp. Bậc 160 tự có khi vùng U Minh có bãi.
- HP, công, thủ, EXP như Tà Thú cùng cấp (`eventHpMul(n)`, `cmb-balance`). Chiêu: 3 chiêu, không `summon`, mạnh nhất ≤ ×1,8, không `nova`.
- Thưởng: bảng hạng `TATHU.rewards`; token thưởng hạng = `drop.event × tokMul`; hạng 1-10 thêm 1 `box_lehoi` (chưa có thì 1 Rương Báu). Lượng không đổi so với lượt Tà Thú bị thay.
- Hết mùa: lượt 12:30 và 22:30 trở lại Tà Thú.

| `look` | Lễ | Boss | Kiểu sprite, thân (`VARIANT`) | Hệ | Bảng màu | `AURA2` | Chiêu |
|---|---|---|---|---|---|---|---|
| `tet` | Hội Xuân | Hắc Thổ Quỷ Vương (quỷ chiếm đất bị cây nêu đuổi, tích cây nêu ngày Tết) | `imp`, `oniK` | Hỏa | `#1a0f0a`, `#c62828`, `#ffd54a` | `#ffd54a` | `quake(120, 1.6, 'Địa Quỷ Chấn')`, `pillar(3, 1.6, 'Quỷ Hỏa Trụ')`, `roar(140, 30, 'Quỷ Hống Đầu Năm')` |
| `tinhnhan` | Mùa Hoa Tình Nhân | Đoạn Duyên Yêu Hồ (yêu hồ cắt tơ hồng) | `beast`, `fox9` | Phong | `#4a0e2e`, `#f06292`, `#fff59d` | `#f06292` | `beam(240, 1.6, 'Đoạn Tơ Tuyến')`, `pillar(3, 1.5, 'Hồng Tâm Trụ')`, `roar(140, 30, 'Mị Hồn Âm')` |
| `datto` | Lễ Hội Đất Tổ | Hồng Thủy Giao Long (giao long dâng nước, gợi tích núi chặn nước) | `beast`, `serpent` | Thủy | `#0d3b66`, `#4fc3f7`, `#e0f7fa` | `#4fc3f7` | `beam(280, 1.7, 'Hồng Thủy Tuyến')`, `quake(120, 1.6, 'Lũ Cuốn Chấn')`, `roar(150, 35, 'Giao Long Hống')` |
| `he` | Hội Hè Biển Xanh | Cự Giải Đá Ngầm | `crab`, `emperor` | Thủy | `#5d4037`, `#ffab91`, `#4dd0e1` | `#ffab91` | `fissure(220, 1.6, 'Càng Đá Liệt')`, `quake(110, 1.6, 'Sóng Ngầm Chấn')`, `roar(140, 30, 'Bọt Biển Âm')` |
| `trangram` | Lễ Hội Trăng Rằm | Hắc Hùng Thực Nguyệt (con gấu ăn trăng trong chuyện dân gian về nguyệt thực) | `golem`, `yetiK` | Phong | `#2d1b12`, `#6d4c41`, `#fff59d` | `#fff59d` | `quake(120, 1.7, 'Hùng Chấn')`, `beam(240, 1.6, 'Thực Nguyệt Tuyến')`, `roar(150, 35, 'Hắc Hùng Hống')` |
| `hoatrang` | Đêm Hội Hóa Trang | Ma Trơi Quỷ Vương | `ghost`, `fire` | Hỏa | `#1b0033`, `#76ff03`, `#ff8f00` | `#76ff03` | `pillar(3, 1.6, 'Ma Trơi Trụ')`, `beam(260, 1.6, 'U Hỏa Tuyến')`, `roar(140, 35, 'Quỷ Khóc Âm')` |
| `giangsinh` | Đêm Đông An Lành | Băng Tinh Tuyết Quái | `golem`, `crystalK` | Thủy | `#fafafa`, `#c62828`, `#81d4fa` | `#e1f5fe` | `quake(120, 1.6, 'Tuyết Lở Chấn')`, `pillar(3, 1.6, 'Băng Trụ Giáng')`, `roar(140, 40, 'Hàn Phong Hống')` |

Bảng màu và tên chiêu là đề xuất mặc định, người vẽ chỉnh sau khi chụp ảnh nếu tông lệch `DESIGN_RULES.md` mục 4; tên boss chốt như bảng.

**Dữ liệu**: `bosspacks/season.js` (mới), `SEASON_BOSS` (`seasons/index.js`). Hình: `VARIANT`, `AURA2` (`render/monster/variants.js`, `boss.js`) cho 21 id.

**Gói { t }**: không có gói mới; `event` thêm `title` của boss lễ (đã có trường `title`), `eventResult` như Tà Thú.

**Module/cửa sổ/DOM**: `modules/events` (lúc bắt đầu lượt: nếu giờ VN ∈ `SEASON_BOSS.hours` và `world.season.cur()` có mùa → chọn trong 3 bậc của `look`; thưởng thêm `box_lehoi`), `modules/season` (`festivalBoss()` trả 3 id), `windows/calendar.js` (đổi tên dòng). Không id DOM mới.

**Điện thoại**: dùng `#hud-event` có sẵn.

**Chống gian lận**: như Tà Thú (lịch máy chủ, không gọi bù, thưởng qua `give()`); người vượt cấp boss + 20 không có hạng (G6, áp mới cho boss lễ hội vì bậc boss cách nhau 60 cấp).

**Tiêu chí chấp nhận**:
1. `tests/features/season.js` đơn vị: với `force = 'tet2027'`, `festivalBoss()` trả `['ev_tet_40', 'ev_tet_100', 'ev_tet_160']`; hàm chọn lượt `slotBoss(Date.parse('2027-02-01T12:30+07'))` trả bậc boss lễ, `slotBoss(Date.parse('2027-02-01T14:30+07'))` trả `null` (Tà Thú thường); hết mùa trả `null` ở 12:30.
2. `tests/features/boss.js` bot: `/sukien tet2027`, `/event tathu ev_tet_40 <bãi hợp cấp>`, `/bosshp 1`, hạ → `eventResult` hạng 1 có `box_lehoi` (hoặc Rương Báu) và `bao_lixi`; người cấp 120 hạ bậc 40 → hạng 0, "vượt cấp".
3. `npm run check`: 21 boss có `VARIANT`, `AURA2`, 3 chiêu đúng dải, không `summon`; bậc 40, 100 có bãi hợp cấp (`✘` nếu thiếu), bậc 160 thiếu bãi là `⚠`; mỗi `look` trong `SEASON_LOOKS` có đủ 3 bậc.
4. Ảnh 7 boss bậc 40 (desktop + điện thoại, đứng và cuồng nộ `/bosshp 20`) in `OK no console errors`; `npm test` đạt.

**Kiểm thử**: `tests/features/season.js`, `tests/features/boss.js`.

### 7.4 Lịch lễ hội cả năm

| id mùa | Lễ (id tính năng) | Tên trong game | Từ | Đến | Ngày | Token (id, tên, icon `k`) | Rơi quái | Ghi chú |
|---|---|---|---|---|---:|---|---:|---|
| `trangram2026` | `evt-trungthu` | Lễ Hội Trăng Rằm | 25/09/2026 | 08/11/2026 | 45 | `banh_trungthu`, Bánh Trung Thu, `mooncake` | 5% | đang chạy; Đêm Hội Hóa Trang 2026 bỏ vì trùng |
| `giangsinh2026` | `evt-noel` | Lễ Hội Đêm Đông An Lành | 12/12/2026 | 04/01/2027 | 24 | `chuong_ngan`, Chuông Ngân, `bell` | 5% | hạn chót phát hành 12/12/2026 |
| `tet2027` | `evt-tet` | Hội Xuân Đinh Mùi | 28/01/2027 | 13/02/2027 | 17 | `bao_lixi`, Bao Lì Xì, `lixi` | 6% | mùng 1 = 06/02/2027 |
| `tinhnhan2027` | `evt-valentine` | Mùa Hoa Tình Nhân | 14/02/2027 | 08/03/2027 | 23 | `hoa_hong`, Đóa Hồng Thắm, `rose` | 5% | gộp 8/3 |
| `datto2027` | `evt-304` | Lễ Hội Đất Tổ | 10/04/2027 | 05/05/2027 | 26 | `banh_giay`, Bánh Giầy, `ricecake` | 5% | Giỗ Tổ 16/04/2027, 30/4, 1/5 |
| `he2027` | `evt-he` | Hội Hè Biển Xanh | 01/06/2027 | 15/08/2027 | 76 | `oc_ngusac`, Vỏ Sò Biển Hạ, `shell` | 4% | mùa dài nên rơi thấp hơn |
| `trangram2027` | `evt-trungthu` | Lễ Hội Trăng Rằm | 04/09/2027 | 26/09/2027 | 23 | `banh_trungthu` | 5% | rằm 15/09/2027 |
| `hoatrang2027` | `evt-halloween` | Đêm Hội Hóa Trang | 23/10/2027 | 07/11/2027 | 16 | `keo_bingo`, Kẹo Bí Ngô, `pumpkin` | 5% | |
| `giangsinh2027` | `evt-noel` | Lễ Hội Đêm Đông An Lành | 12/12/2027 | 04/01/2028 | 24 | `chuong_ngan` | 5% | |
| `tet2028` | `evt-tet` | Hội Xuân Mậu Thân | 17/01/2028 | 02/02/2028 | 17 | `bao_lixi` | 6% | mùng 1 = 26/01/2028 |

Quy tắc dựng mùa cho các năm sau (mỗi năm thêm file mới, id kèm năm, không sửa file mùa đã chạy):

| Lễ | Từ | Đến | Khi trùng |
|---|---|---|---|
| Tết | mùng 1 − 9 ngày | mùng 1 + 7 ngày | ưu tiên Tết |
| Tình Nhân | 14/02, hoặc ngày sau khi Tết kết thúc nếu Tết phủ 14/02 | 08/03 | rút ngắn, tối thiểu 14 ngày; dưới 14 ngày thì bỏ năm đó |
| Đất Tổ | `min(Giỗ Tổ − 6 ngày, 20/04)` | 05/05 | không trùng mùa nào |
| Hội Hè | 01/06 | 15/08 | không trùng |
| Trăng Rằm | rằm tháng 8 − 11 ngày | rằm + 11 ngày | ưu tiên Trăng Rằm |
| Hóa Trang | 23/10 | 07/11 | bắt đầu sau ngày kết thúc Trăng Rằm, tối thiểu 10 ngày; dưới 10 ngày thì bỏ năm đó |
| Đêm Đông | 12/12 | 04/01 năm sau | ưu tiên hơn Tết sớm (Tết bắt đầu sau 04/01) |

Bảng đổi chuẩn và thưởng việc lễ hội chuẩn ở 7.2. Mỗi mục 7.5-7.11 chỉ ghi phần **riêng** của lễ: dòng đổi riêng, thời trang độc quyền, việc lễ hội, Sứ Giả, trang trí, boss lễ, quà ngày chính lễ, giftcode. `drop` chuẩn `{ rate: 0.05, lvGap: 10, boss: [3, 6], event: [8, 12], wb: [6, 10] }`, khác thì ghi.

**Tiêu chí chấp nhận chung cho mỗi lễ** (mục 7.5-7.11 tham chiếu bằng "TCC-lễ"):
- (a) File mùa của lễ tồn tại cho mọi năm trong bảng 7.4; `npm run check` không dòng `✘` (lược đồ, token có icon trong `ICON_KINDS`, thời trang có hình/icon, `look` có hình Sứ Giả và trang trí, `gift.on` trong mùa, không chồng ngày).
- (b) `tests/features/season.js` hàm `festivalUnitTests()` duyệt **mọi** mùa trong `SEASONS`: ép bật bằng `Season.setForce(id)`; người chơi giả đủ token đổi được dòng `xu` và dòng thời trang độc quyền (vật phẩm có `exp` hạn đúng `days`); 3 việc lễ hội tăng tiến độ đúng với quái/boss/bản đồ mẫu của mùa; `gift` chỉ nhận ngày trong `on`.
- (c) Bot `festivalBotTest(id)` (chạy cho một mùa mỗi lễ, luân phiên): `/sukien <id>` → `season.id`; hội thoại Sứ Giả chứa `npcTitle` và 3 lựa chọn; `seasonQClaim` việc ghé bản đồ nhận đúng `tok` token.
- (d) Ảnh `tools/shot.js` (desktop 1280×720 và `mobile: true`): làng `v_fire` ban ngày và `forceHour = 22` có Sứ Giả mặc đồ mùa + trang trí; cửa sổ Lễ hội 2 tab; nhân vật mặc thời trang độc quyền; mỗi lệnh in `OK no console errors`.
- (e) `npm run test:perf` khi mùa có hạt bay đang bật giữ ≥ 55 khung/giây trung bình.
- (f) `DESIGN_RULES.md` mục 9 có một hàng cho mỗi mùa (mẫu ở `content/50` mục 7.5).

### 7.5 `evt-tet` — Hội Xuân

| Thành phần | Nội dung |
|---|---|
| Thời gian | `tet2027` 28/01-13/02/2027, `tet2028` 17/01-02/02/2028 (quy tắc 7.4) |
| Vật phẩm rơi | `bao_lixi` Bao Lì Xì (phong bao đỏ chữ Phúc vàng, icon `lixi` màu `#d32f2f`); `drop { rate: 0.06, boss: [4, 8], event: [10, 15], wb: [8, 12] }` (Tết rơi nhiều hơn) |
| NPC đổi quà | Sứ Giả Hội Xuân (`look: 'tet'`): áo dài đỏ thắm `#c62828` viền và chấm hoa mai vàng `#ffd54a`, quần trắng kem, khăn vấn đỏ viền vàng cao 3 px, tay cầm cành mai (cán nâu `#6d4c41`, 5 bông vàng 2×2 nhụy cam `#ff8f00`) |
| Bảng đổi riêng (sau 7 dòng chuẩn) | `charm` 30 → 1 Bùa Bảo Hộ (5 lượt); `aodai` 150 → Áo Dài Xuân Thắm (1 lượt, 15 ngày); `lanxuan` 320 → Lân Vàng Nghênh Xuân (1 lượt, 15 ngày) |
| Thời trang độc quyền | `costume_aodaixuan` Áo Dài Xuân Thắm (y phục, grade 3, cấp 1, `expPct 8, hp 300`, hình `aodai`: hoa mai 3×3 rải trên áo, tà dài tới gối); `mount_lanxuan` Lân Vàng Nghênh Xuân (thú cưỡi 4 chân, grade 4, cấp 30, `spd 30, atk 100, expPct 5`, thân vàng, bờm đỏ dày, mặt lân to tròn sừng đơn ngắn, khác `qilin`) |
| Việc lễ hội | `hailoc` Săn Quái Hái Lộc (kill 120, cấp 5); `trutadau` Trừ Tà Đầu Năm (boss 1, cấp 15); `duxuan` Du Xuân Vườn Hoa (ghé `sakura_garden`, cấp 15) |
| Trang trí | 2 cây nêu (cột tre 70 px, vải đỏ, khánh), 3 chậu mai vàng, 2 chậu đào hồng, câu đối đỏ hai bên cửa nhà Trưởng Làng, dây đèn lồng đỏ; hạt cánh mai vàng 2×1 rơi chéo |
| Boss lễ | Hắc Thổ Quỷ Vương (7.3) |
| Quà ngày chính lễ | mùng 1, 2, 3 Tết (2027: 06-08/02; 2028: 26-28/01): 10 Bao Lì Xì mỗi ngày ("Lộc đầu năm") |
| Giftcode | `XUANDINHMUI` (2027), `XUANMAUTHAN` (2028): 88.888 xu, 20 lượng, 30 Bao Lì Xì, 2 Bí Kíp Nhân Đôi, cấp 5 |
| Âm thanh | nhạc lễ hội `MUSIC_SCENE.festival` (có sẵn ở nhánh âm thanh); bản nhạc riêng mỗi lễ thuộc `snd-content-199` |
| Tiêu chí | TCC-lễ (a)-(f) cho `tet2027`, `tet2028`; thêm: `tet2028.tokenDef === null` và `fashion` rỗng (dùng lại của 2027) |
| Kiểm thử | `tests/features/season.js` |

### 7.6 `evt-valentine` — Mùa Hoa Tình Nhân

| Thành phần | Nội dung |
|---|---|
| Thời gian | `tinhnhan2027` 14/02-08/03/2027 (gộp ngày Quốc tế Phụ nữ 8/3) |
| Vật phẩm rơi | `hoa_hong` Đóa Hồng Thắm (icon `rose` `#e91e63`), `drop` chuẩn; token giao dịch được (tặng hoa cho người khác là chủ ý) |
| NPC đổi quà | Sứ Giả Tình Nhân (`look: 'tinhnhan'`): áo dài hồng `#f06292` viền trắng, 2 trái tim đỏ 3×3 trên tà áo, tóc dài nơ đỏ to 5×3, ôm bó hồng 3 bông giấy gói trắng |
| Bảng đổi riêng | `revive` 10 → 2 Thẻ Hồi Sinh; `rose` 140 → Áo Choàng Hồng Tâm (1 lượt, 15 ngày) |
| Thời trang độc quyền | `cloak_hongtam` Áo Choàng Hồng Tâm (áo choàng, grade 3, cấp 10, `hpPct 4, dodge 1, expPct 3`, màu `#e91e63`, hoa văn tim trắng) |
| Việc lễ hội | `haihoa` Hái Hoa Tặng Người (kill 100); `hohoa` Hộ Hoa Diệt Yêu (boss 1); `henho` Hẹn Dưới Tán Anh Đào (ghé `sakura_garden`) |
| Trang trí | dây đèn trái tim hồng nối các mái, 4 bóng bay tim đỏ/hồng trước nhà, khóm hồng thấp ven đường; hạt cánh hồng `#f48fb1` |
| Boss lễ | Đoạn Duyên Yêu Hồ (7.3) |
| Quà ngày chính lễ | 14/02 và 08/03: 10 Đóa Hồng Thắm |
| Giftcode | `HOAHONG2027`: 10 lượng, 20 Đóa Hồng Thắm, 2 Thẻ Hồi Sinh |
| Tiêu chí | TCC-lễ (a)-(f) cho `tinhnhan2027` |
| Kiểm thử | `tests/features/season.js` |

### 7.7 `evt-304` — Lễ Hội Đất Tổ

| Thành phần | Nội dung |
|---|---|
| Thời gian | `datto2027` 10/04-05/05/2027 (Giỗ Tổ 10/3 âm lịch = 16/04/2027, đại lễ 30/4 và 1/5 trong cùng mùa) |
| Vật phẩm rơi | `banh_giay` Bánh Giầy (icon `ricecake` `#f5f5f0`: 2 viên bánh trắng trên lá chuối), `drop` chuẩn |
| NPC đổi quà | Sứ Giả Đất Tổ (`look: 'datto'`): áo tứ thân nâu `#6d4c41`, yếm đỏ cam `#d84315`, thắt lưng xanh lá buông 2 dải, nón quai thao vành 13 px màu gỗ sáng, bưng mâm gỗ có 3 viên bánh giầy |
| Bảng đổi riêng | `food` 12 → 2 món ăn tăng công; `tuthan` 150 → Áo Tứ Thân Kinh Bắc (1 lượt, 15 ngày) |
| Thời trang độc quyền | `costume_tuthan` Áo Tứ Thân Kinh Bắc (y phục, grade 3, cấp 1, `expPct 6, def 40, hp 200`, hình yếm thoi đỏ cam giữa ngực) |
| Việc lễ hội | `luyenbinh` Luyện Binh Giữ Nước (kill 150); `tramyeu` Trảm Yêu Hộ Đất Tổ (boss 1); `coinguon` Tìm Về Cội Nguồn (ghé `ancient_ruins`, cấp 35) |
| Trang trí | 3 cột cờ hội ngũ sắc phấp phới (hoạt ảnh kiểu cờ dọc có sẵn), trống đồng 24×10 trên bục giữa làng (mặt trống vòng đồng tâm); không hạt bay |
| Boss lễ | Hồng Thủy Giao Long (7.3) |
| Quà ngày chính lễ | 16/04, 30/04, 01/05: 10 Bánh Giầy |
| Giftcode | `DATTO2027`: 50.000 xu, 20 Bánh Giầy, 2 món ăn tăng công |
| Tiêu chí | TCC-lễ (a)-(f) cho `datto2027` |
| Kiểm thử | `tests/features/season.js` |

### 7.8 `evt-he` — Hội Hè Biển Xanh

| Thành phần | Nội dung |
|---|---|
| Thời gian | `he2027` 01/06-15/08/2027 (76 ngày, mùa dài nhất, ≤ 92) |
| Vật phẩm rơi | `oc_ngusac` Vỏ Sò Biển Hạ (icon `shell` `#ffab91`, 5 sọc ngũ sắc nhạt), `drop.rate` 0,04 |
| NPC đổi quà | Sứ Giả Hội Hè (`look: 'he'`): áo cộc tay xanh biển `#29b6f6`, quần lửng trắng, nón lá vành 13 px có 2 vạch nan, cầm phao bơi sọc đỏ trắng 7×7 |
| Bảng đổi riêng | `food` 12 → 2 món ăn tăng thủ; `shades` 120 → Kính Râm Sóng Bạc (1 lượt, 15 ngày); `ocean` 150 → y phục biển có sẵn `costume_ocean` (1 lượt, 15 ngày) |
| Thời trang độc quyền | `mask_kinhram` Kính Râm Sóng Bạc (mặt nạ, grade 2, cấp 10, `expPct 5, dodge 1`, 2 tròng đen bóng có chấm sáng, gọng vàng mảnh) |
| Việc lễ hội | `dietquai` Dẹp Quái Bãi Biển (kill 120); `santhuyquai` Săn Thủy Quái (boss 1); `tambien` Tắm Biển San Hô (ghé `coast`, cấp 12) |
| Trang trí | 3 ô dù sọc đỏ trắng, 2 phao bơi dựa tường, xô cát và xẻng, dây cờ tam giác nhiều màu; không hạt bay |
| Boss lễ | Cự Giải Đá Ngầm (7.3) |
| Quà ngày chính lễ | 01/06 (Tết thiếu nhi): 10 Vỏ Sò Biển Hạ |
| Giftcode | `HEXANH2027`: 60.000 xu, 10 lượng, 25 Vỏ Sò Biển Hạ |
| Tiêu chí | TCC-lễ (a)-(f) cho `he2027` |
| Kiểm thử | `tests/features/season.js` |

### 7.9 `evt-trungthu` — Lễ Hội Trăng Rằm

| Thành phần | Nội dung |
|---|---|
| Hiện trạng | `trangram2026` đang chạy (25/09-08/11/2026): Bánh Trung Thu, 9 dòng đổi (có `costume_ocean` và `mount_crane` 15 ngày), giftcode `TRANGRAM`. Thiếu: việc lễ hội, Sứ Giả mặc đồ mùa (hiện là hình mặc định), trang trí làng, boss lễ, mùa 2027 |
| Thời gian | `trangram2026` (giữ), `trangram2027` 04/09-26/09/2027 |
| Vật phẩm rơi | `banh_trungthu` (có sẵn, icon `mooncake`), `drop` chuẩn; `trangram2027` có `drop.wb: [6, 10]`; `trangram2026` kết thúc 08/11/2026, trước GĐ6, nên chỉ tách file, không sửa thêm (chỉnh khi ghép) |
| NPC đổi quà | Sứ Giả Trăng Rằm (`look: 'trangram'`): giữ hình Sứ Giả hiện tại làm bộ đồ Trăng Rằm (tách vào `EVENT_LOOKS.trangram`) |
| Bảng đổi riêng 2027 | `rabbit` 150 → Mặt Nạ Thỏ Ngọc (1 lượt, 15 ngày); `crane` 300 → Hạc Tiên Vân Du (1 lượt, 15 ngày). Bảng 2026 **không đổi** |
| Thời trang độc quyền | `mask_thongoc` Mặt Nạ Thỏ Ngọc (mặt nạ, grade 3, cấp 10, `expPct 6, crit 1, hp 200`, tai dài lòng hồng, mắt khe đỏ) |
| Việc lễ hội | `ruocden` Rước Đèn Trừ Yêu (kill 100, cấp 5); `diettinh` Diệt Yêu Đêm Rằm (boss 1, cấp 15); `ngamtrang` Ngắm Trăng Bên Hồ (ghé `water_lake`, cấp 1). Chỉ cho `trangram2027` (`trangram2026` đã kết thúc khi GĐ6 bắt đầu) |
| Trang trí | dây đèn lồng giấy đỏ/trắng giữa các mái, 2 đèn kéo quân tròn 10 px trên cột; không hạt bay |
| Boss lễ | Hắc Hùng Thực Nguyệt (7.3) |
| Quà ngày chính lễ | ngày rằm (2027: 15/09): 10 Bánh Trung Thu. `trangram2026` không có (rằm đã qua) |
| Giftcode | `TRANGRAM` (có sẵn, 2026), `TRANGRAM27`: 15 lượng, 15 Bánh Trung Thu, 2 Bí Kíp Nhân Đôi |
| Tiêu chí | TCC-lễ (a)-(f) cho `trangram2027`; `trangram2026` chỉ kiểm tách file đúng và 9 dòng đổi giữ nguyên số (kiểm thử 7.2 ý 1) |
| Kiểm thử | `tests/features/season.js`, `tests/features/eventcore.js`, `tests/features/mail.js` |

### 7.10 `evt-halloween` — Đêm Hội Hóa Trang

| Thành phần | Nội dung |
|---|---|
| Thời gian | `hoatrang2027` 23/10-07/11/2027 (năm 2026 bỏ vì trùng Trăng Rằm 2026) |
| Vật phẩm rơi | `keo_bingo` Kẹo Bí Ngô (icon `pumpkin` `#ff8f00`: kẹo gói giấy cam hình bí, 2 đầu xoắn), `drop` chuẩn |
| NPC đổi quà | Sứ Giả Hóa Trang (`look: 'hoatrang'`): áo choàng trùm tím đậm `#4a148c` viền cam, mũ trùm che tóc chỉ lộ 2 chấm mắt sáng, cầm đèn bí ngô cam 5×5 mắt miệng vàng phát sáng |
| Bảng đổi riêng | `revive` 10 → 2 Thẻ Hồi Sinh; `pumpkin` 120 → Mặt Nạ Bí Ngô Ma Trơi (1 lượt, 15 ngày); `batwing` 160 → Áo Choàng Dạ Bức (1 lượt, 15 ngày) |
| Thời trang độc quyền | `mask_bingo` Mặt Nạ Bí Ngô Ma Trơi (grade 3, cấp 20, `atk 70, crit 2`); `cloak_dabuc` Áo Choàng Dạ Bức (grade 3, cấp 30, `atk 90, dodge 2`, mép dưới răng cưa cánh dơi) |
| Việc lễ hội | `batma` Bắt Ma Đêm Hội (kill 120); `truyeu` Trừ Yêu Diệt Quỷ (boss 1); `lacsuong` Lạc Vào Sương Mù (ghé `misty_valley`, cấp 33) |
| Trang trí | 6 quả bí ngô khắc mặt phát sáng (thêm nguồn sáng cam ban đêm), mạng nhện ở góc 3 mái, 4 dơi giấy đen treo dây; hạt ma trơi xanh lục 12 đốm bay chậm |
| Boss lễ | Ma Trơi Quỷ Vương (7.3) |
| Quà ngày chính lễ | 31/10: 10 Kẹo Bí Ngô |
| Giftcode | `HOATRANG27`: 50.000 xu, 10 lượng, 20 Kẹo Bí Ngô |
| Tiêu chí | TCC-lễ (a)-(f) cho `hoatrang2027`; thêm ảnh ban đêm (`forceHour = 22`) thấy ánh sáng bí ngô |
| Kiểm thử | `tests/features/season.js` |

### 7.11 `evt-noel` — Lễ Hội Đêm Đông An Lành

| Thành phần | Nội dung |
|---|---|
| Thời gian | `giangsinh2026` 12/12/2026-04/01/2027, `giangsinh2027` 12/12/2027-04/01/2028 (gồm Tết Dương lịch) |
| Vật phẩm rơi | `chuong_ngan` Chuông Ngân (icon `bell` `#e0c060`: chuông bạc nơ đỏ 2 dải), `drop` chuẩn |
| NPC đổi quà | Sứ Giả Đêm Đông (`look: 'giangsinh'`): áo dài đỏ viền lông trắng 1 px ở cổ, gấu, tay; mũ len đỏ chóp gập, chỏm bông trắng; khăn quàng xanh lá; cầm chuông bạc 3×4 |
| Bảng đổi riêng | `food` 12 → 2 món ăn tăng máu; `winter` 150 → Y Phục Tuyết Đông (1 lượt, 15 ngày); `reindeer` 320 → Tuần Lộc Đêm Đông (1 lượt, 15 ngày) |
| Thời trang độc quyền | `costume_tuyetdong` Y Phục Tuyết Đông (y phục, grade 3, cấp 1, `expPct 6, hpPct 4`, viền lông trắng + 2 bông tuyết 3×3); `mount_tuanloc` Tuần Lộc Đêm Đông (thú cưỡi 4 chân, grade 4, cấp 30, `spd 30, hp 500, dodge 2`, gạc bạc phân nhánh 6 px, mũi đỏ 1 px) |
| Việc lễ hội | `dontuyet` Dọn Tuyết Đường Làng (kill 120); `duoiquy` Đuổi Quỷ Đêm Đông (boss 1); `ngamtuyet` Leo Núi Ngắm Tuyết (ghé `snow_mountain`, cấp 40) |
| Trang trí | cây thông 40 px trang trí bóng màu và ngôi sao vàng giữa làng, 2 người tuyết, hộp quà xếp chồng, dây đèn nhiều màu nhấp nháy theo thời gian, tuyết đọng 2 px trên mép mái; hạt tuyết 1×1 và 2×2 rơi lắc nhẹ |
| Boss lễ | Băng Tinh Tuyết Quái (7.3) |
| Quà ngày chính lễ | 24/12, 25/12, 01/01: 10 Chuông Ngân |
| Giftcode | `DEMDONG2026`, `DEMDONG2027`: 50.000 xu, 10 lượng, 20 Chuông Ngân, 1 Bí Kíp Nhân Đôi |
| Hạn chót | `giangsinh2026` phải lên máy chủ thật trước 12/12/2026; nếu GĐ 6 chưa xong thì phát hành riêng dữ liệu mùa + token + Sứ Giả + thời trang (đường tối thiểu), việc lễ hội/boss lễ bật khi `evt-season-plus`/`evt-festival-boss` vào (xem Q4) |
| Tiêu chí | TCC-lễ (a)-(f) cho `giangsinh2026`, `giangsinh2027`; thêm: `giangsinh2027.tokenDef === null` |
| Kiểm thử | `tests/features/season.js` |

---

## 8. Di chuyển phục vụ PvE

### 8.1 `world-teleport` — Phu Xe giữa 3 làng (đã có)

**Hiện trạng** (`modules/movement`, NPC loại `tele` ở mỗi làng): hội thoại liệt kê 2 làng còn lại, miễn phí dưới cấp 20, sau đó 300 xu; `npcAct { a: 'go:<làng>' }` kiểm làng hợp lệ, đủ xu, rồi đổi bản đồ. Kiểm thử: `tests/features/social.js` (bot đi `v_water` → `v_fire`); E2E đi làng khác.

**Phần cần nâng**: 2 trang và trạm (`world-home`, 8.2); phí trừ xu khóa trước (`eco-bound`).

**Tiêu chí chấp nhận (đang đạt)**: phần 5 của `npm test` (`tests/features/social.js`) đạt ý dịch chuyển.

### 8.2 `world-home` — Về làng theo trạm, Phu Xe 2 trang

**Mục đích**: ở Thượng Giới, chết hoặc dùng Cuộn Về Làng không bị đưa về làng Hạ Giới xa hàng chục bản đồ (P2).

**Quy tắc** (đặc tả gốc `content/10-world.md` mục 4.5, 4.6):
- Mỗi bản đồ có trường `home` (trạm gần nhất). `world.homeOf(p)`: đang ở bản đồ không `instance` có `home` hợp lệ → về `home`; không thì về làng của phái. `sendHome` dùng `homeOf`; phó bản, lôi đài vẫn về làng.
- Hồi sinh "về làng" (`pk.revive`) và Cuộn Về Làng (`scroll_home`) dùng `homeOf`. Đứng trong trạm (trạm không có `home`) mà dùng cuộn thì về làng: hai lần cuộn là tới làng.
- Phu Xe 2 trang: trang 0 = làng (300 xu, dưới cấp 20 miễn phí) + trạm Hạ Giới (1.000 xu, đủ `minLv`); trang 1 (cấp ≥ 120) = trạm mỗi vùng Thượng Giới đã mở và người chơi đủ cấp vùng (5.000 xu). Đi bộ luôn miễn phí.

**Dữ liệu**: `maps.js` (`home`, `OUTPOSTS`), `regions/*` (`town`, `entry`, `lv`). **Gói { t }**: `npcAct { a: 'go:<id>'|'go:@<vùng>'|'page:0'|'page:1' }`. **Module**: `core/world.js` (`homeOf`, `sendHome`), `modules/pk`, `modules/inventory`, `modules/movement`. Không cửa sổ mới.

**Điện thoại**: hội thoại có tối đa 9 lựa chọn mỗi trang, cuộn được, mỗi nút ≥ 44 px.

**Chống gian lận**: đích chỉ là chuỗi tra trong `VILLAGES`, `OUTPOSTS` hoặc `REGIONS`; kiểm cấp, kiểm xu trước khi trừ; không dịch chuyển tới bản đồ `instance`.

**Tiêu chí chấp nhận**:
1. `tests/features/world.js` (mới, `content/10-world.md` mục 9.2): `homeOf` của người đứng ở bãi có `home` trả trạm đó; ở phó bản trả làng phái; Phu Xe trang 2 có trạm vùng khi đủ cấp (khi chưa có vùng nào in "bỏ qua"); dịch chuyển thiếu xu bị từ chối, không trừ xu.
2. Bot chết ở bãi có `home`, `revive` về làng → bản đồ là trạm đó.
3. `npm run check` khối "Thế giới": mọi `home` trỏ trạm tồn tại; `npm test` đạt; `npm run test:e2e` desktop và `MOBILE=1` đạt (tìm đường qua trạm).

**Kiểm thử**: `tests/features/world.js`, `tests/e2e/e2e.js`.

### 8.3 `world-channels` — Kênh bản đồ

**Mục đích**: bãi luyện công đông người vẫn mượt trên điện thoại (P2) và không tranh quái tới mức bỏ chơi (P4), mà không nhân bản boss làm loạn kinh tế (P5). Đo hiện tại: 150 người một bãi = 6,8 MB/s, 300 người = 27 MB/s gói `state` (`audit-risk.md` mục 3.3). Phá bất biến "một id bản đồ = một thể hiện" nên có ADR-05d-1.

**Luồng người chơi**:
1. Vào một bãi luyện công: máy chủ tự xếp kênh (ưu tiên kênh có bạn cùng nhóm, rồi cùng gia tộc, rồi kênh đầu còn dưới trần mềm). `#map-name` hiện "Rừng Trúc · Kênh 2" khi có từ 2 kênh trở lên.
2. Cửa sổ bản đồ (phím M) có mục "Kênh": danh sách kênh, số người/trần, dấu "Boss" ở kênh 1; bấm để đổi kênh.
3. Boss bản đồ, Tà Thú, Hung Tinh, Yêu Quái Lễ Hội **chỉ ở kênh 1**; người ở kênh khác thấy biểu ngữ "Boss ở Kênh 1" kèm nút đổi.

**Quy tắc**:

| Hạng mục | Giá trị |
|---|---|
| Áp dụng | bãi luyện công (bản đồ không `town`, không `instance`, không `pvp`, không `arena`). Làng và trạm vẫn một thể hiện (không có quái, băng thông do `ops-state-culling` lo) |
| Trần | mềm 40 (mở kênh mới khi mọi kênh đạt), cứng 60 (không xếp thêm), kênh 1 khi có boss sự kiện đang sống: cứng 80; tối đa 6 kênh mỗi bản đồ |
| Đóng kênh | kênh ≠ 1 trống 5 phút thì hủy (quái, đồ rơi dọn theo) |
| Đổi kênh | hành động `chSwitch { ch }`: cùng bản đồ gốc, không chết, không lôi đài/giao dịch, không trúng đòn trong 5 giây, hồi 10 giây, kênh đích còn dưới trần cứng; giữ nguyên `x, y` |
| Tất cả kênh đầy | không chặn di chuyển: xếp vào kênh ít người nhất (vượt trần cứng), ghi nhật ký vận hành |
| Lưu | `c.map` lưu id gốc; đăng nhập lại xếp kênh mới |
| Nhóm | EXP nhóm và HUD nhóm coi "cùng bản đồ" là cùng **thể hiện** (cùng kênh); HUD nhóm ghi kênh của từng người |

**Dữ liệu**: `CHANNEL = { soft: 40, hard: 60, bossHard: 80, max: 6, idleMs: 300000, switchCd: 10000, hurtCd: 5000 }` (`src/shared/constants.js`).

**Gói { t }**:

| Hướng | Gói | Trường |
|---|---|---|
| S→C | `enterMap` | thêm `ch` (1-6) và `chn` (số kênh đang mở) |
| C→S | `chList {}` | xin danh sách kênh bản đồ đang đứng |
| S→C | `chs` | `{ map, list: [{ ch, n, cap, boss }] }` |
| C→S | `chSwitch { ch }` | `int(ch)` 1..`CHANNEL.max` |

**Module/cửa sổ/DOM**: `core/world.js` (`maps[id]` thành danh sách kênh, `pickChannel(p, def)`, `enterMap`, dọn kênh trống ở `secondTick`), `core/map.js` (`map.ch`, `map.baseId`), module mới `modules/channels` (hành động `chList`, `chSwitch`), `modules/events`, `modules/worldboss`, `modules/season` và boss bản đồ (`core/monster.js` sinh boss) chỉ dùng kênh 1; `modules/party` so thể hiện. Client: `windows/map.js` (mục "Kênh"), `ui.js` (chữ `#map-name`), `game.js` (nhận `ch`). Không đổi id DOM; không đổi chữ ký `pathfind` (tìm đường dùng `def.id`).

**Điện thoại**: danh sách kênh mỗi dòng ≥ 44 px; biểu ngữ "Boss ở Kênh 1" dùng khung `#hud-event` khi người chơi ở kênh khác của bản đồ có boss.

**Chống gian lận/nhân bản**: boss chỉ ở kênh 1 nên không nhân lượng/đồ rơi; đổi kênh có hồi và cấm khi vừa trúng đòn (chống thoát chết); đồ rơi thuộc thể hiện, đổi kênh không mang theo quyền nhặt; `ch` từ client chỉ qua `int()` và kẹp.

**Tiêu chí chấp nhận**:
1. `tests/features/channels.js` (mới) đơn vị: `pickChannel` với 41 người giả cùng bản đồ mở kênh 2; người cùng nhóm với người ở kênh 2 được xếp kênh 2 dù kênh 1 còn chỗ; kênh 2 trống 5 phút (giả lập `now`) bị hủy; boss bản đồ chỉ có ở thể hiện `ch === 1`.
2. Bot: 2 bot `/tp bamboo`, bot B `chSwitch { ch: 2 }` khi chỉ có 1 kênh bị từ chối; `CHANNEL.soft` hạ còn 1 qua biến môi trường kiểm thử → bot B ở kênh 2 (`enterMap.ch === 2`); bot A trúng đòn rồi đổi kênh ngay bị từ chối; `chSwitch { ch: '__proto__' }` không làm sập.
3. `npm test` đạt (mọi kiểm thử cũ dùng `p.map.id` vẫn đạt); `npm run test:e2e` desktop và `MOBILE=1` đạt (tìm đường qua bản đồ có 2 kênh).
4. Đo tải (`ops-load-test`): 300 bot dồn vào một bãi → không kênh nào > 60 người, băng thông ra mỗi kênh ≤ 1 MB/s.

**Kiểm thử**: `tests/features/channels.js`, `tests/e2e/e2e.js`, kịch bản tải của `ops-load-test`.

---

## 9. Kiểm thử tổng hợp

| File | Loại | id phủ | Trạng thái |
|---|---|---|---|
| `tests/features/boss.js` | đơn vị + bot | `pve-boss-field`, `pve-boss-luongcap`, `pve-tathu`, `pve-tathu-199`, `evt-festival-boss` | có, mở rộng |
| `tests/features/worldboss.js` | đơn vị + bot | `pve-worldboss` | mới |
| `tests/features/clanwar.js` | bot | `pve-clanboss` | mới (đi cùng `clan-war`) |
| `tests/features/daily.js` | bot | `pve-dungeon`, `evt-checkin`, `quest-daily-task`, `evt-login-rewards` | có, mở rộng |
| `tests/features/caves.js` | đơn vị + bot | `pve-caves` | mới |
| `tests/features/trials.js` | đơn vị + bot | `pve-dungeon-multi` | mới |
| `tests/features/dailies.js` | đơn vị + bot | `quest-dailies` | mới |
| `tests/features/sidequest.js` | đơn vị + bot | `quest-truyna` | mới (chung với `quest-kyduyen`) |
| `tests/features/eventcore.js` | đơn vị | `evt-calendar`, `evt-season-plus`, `evt-trungthu` | mới |
| `tests/features/season.js` | đơn vị + bot | `evt-season-plus`, `evt-festival-boss`, 7 lễ hội | mới |
| `tests/features/mail.js` | đơn vị + bot | `evt-season-core` | có, giữ nguyên |
| `tests/features/social.js` | bot | `world-teleport` | có |
| `tests/features/world.js` | đơn vị + bot | `world-home` | mới |
| `tests/features/channels.js` | đơn vị + bot | `world-channels` | mới |
| `tests/e2e/e2e.js` | Playwright | `evt-calendar`, `evt-season-plus`, `quest-dailies`, `world-home`, `world-channels`, `pve-worldboss` | có, thêm bước |
| `tests/e2e/perf.js` | Playwright | `pve-worldboss`, `pve-dungeon-multi`, `evt-season-plus`, lễ hội | có |

Mỗi file mới theo `CLAUDE.md` mục "Thêm module tính năng mới" bước 3: export `xxxUnitTests()` và/hoặc `async xxxTest()`, gọi trong `tests/smoke.js` (đơn vị cuối `unitTests()`, bot ngay trước `await saveTest(ctx);`), tài khoản admin riêng thêm cuối `ADMINS` trong `tests/lib/harness.js`, biến tắt lịch thêm cuối `env` (`WB: '0'`, `TATHU: '0'`).

---

## 10. Quyết định kiến trúc (ADR)

### ADR-05d-1 — Kênh bản đồ cho bãi luyện công

- **Bối cảnh**: mỗi id bản đồ có đúng một `GameMap` (`core/world.js`), gói `state` gửi mọi người + quái tới mọi người trong bản đồ 10 lần/giây, băng thông tăng theo bình phương số người (đo: 150 người 6,8 MB/s, 300 người 27 MB/s). Hung Tinh, Tà Thú, lễ hội kéo đông người vào vài bãi. Mục tiêu 1.0 là 300 người online một tiến trình (`01-tam-nhin.md` Q2). Bản nháp ADR-R-3 (`audit-risk.md`) đề xuất kênh nhưng để mục sự kiện chốt cách xử lý boss.
- **Quyết định**: bãi luyện công có tối đa 6 thể hiện (`<id>`, `<id>#2` đến `<id>#6`, cùng cách đặt tên với `loidai#n`, `dungeon#n`), trần mềm 40, cứng 60; làng, trạm, phó bản, lôi đài, đấu trường không chia kênh. **Mọi boss (bản đồ, Tà Thú, Hung Tinh, Yêu Quái Lễ Hội) chỉ ở kênh 1**, kênh 1 khi có boss sự kiện sống được nâng trần cứng 80 và dựa vào lọc theo khung nhìn của `ops-state-culling`. Mã ngữ nghĩa (nhiệm vụ ghé bản đồ, tìm đường, `persistPos`, việc lễ hội, hộ tống) dùng `map.def.id`; so "cùng chỗ" (nhóm, giao dịch, PK) dùng thể hiện (`p.map === o.map`).
- **Quy tắc bị đổi**: bất biến ngầm "id bản đồ = một thể hiện" mà `changeMap`, `persistPos`, `party`, `events`, `dungeon` đang dựa vào; giao thức `enterMap` thêm trường `ch`, `chn` (thêm trường, không đổi trường cũ).
- **Phương án khác**: (a) chỉ lọc theo khung nhìn: giảm băng thông nhưng màn hình vẫn nghẹt và quái vẫn bị tranh; (b) mỗi kênh một bản sao boss chia máu: công bằng hơn cho người ở kênh 2 nhưng nhân thưởng lượng/đồ rơi theo số kênh, trái P5 (ưu tiên P5 > P4 theo `01-tam-nhin.md` 4.1); (c) chặn cứng số người vào bản đồ: người chơi bị kẹt ở cổng, trái P2.
- **Chi phí**: 3-4 ngày lõi + client + kiểm thử (`channels.js`, e2e), cộng rà mọi chỗ dùng `p.map.id` (`grep -n "map.id" src/server` liệt kê và phân loại trong báo cáo của người làm).
- **Hệ quả**: chịu được sự kiện 300 người; kênh 1 lúc có boss vẫn là điểm nóng nên `ops-state-culling` là điều kiện trước; người chơi có thao tác mới "đổi kênh"; mọi tính năng sau này sinh quái đặc biệt trên bãi phải ghi rõ kênh (mặc định kênh 1).

Không đề xuất nào khác trong mục này phá quy tắc `CLAUDE.md`/`DESIGN_RULES.md`: dữ liệu mới nằm ở `src/shared/data` và tới máy khách qua gói `data`; đồ họa (Sứ Giả, trang trí, boss, token, thời trang) vẽ bằng mã; tham số mới của `drawNinja` (`npcLook`) và method mới `drawSeason` là **thêm** vào API công khai, đúng quy tắc "được phép thêm tham số tùy chọn hoặc export mới".

---

## 11. Thứ tự làm và phụ thuộc

| GĐ | Việc (theo thứ tự) | Ghi chú |
|---|---|---|
| 0 | `quest-daily-task` (kiểm thử) | không phụ thuộc gì |
| 2 | `pve-caves` (sau `cmb-balance`), `world-home` (sau `world-towns`; `world-upper` dùng lại), `quest-dailies` (sau `core-levelcap-199`; trả xu khóa bằng `p.gainXuk` khi `eco-bound` đã vào, chưa có thì `p.gainXu`, nên không chờ GĐ 3), `quest-truyna` (sau `quest-kyduyen`, vùng Bồng Lai) | `specs/PLAN.md` lô 2, lô 3 |
| 3 | `pve-boss-luongcap` | nhỏ, giao opencode được |
| 4 | `pve-clanboss` (sau `clan-war`, `cmb-balance`; việc nào vào trước trong `pve-clanboss` và `pve-worldboss` thì tạo khung `bosspacks/index.js`, việc sau dùng lại) | |
| 5 | `world-channels` (sau `ops-state-culling`), `pve-dungeon-multi` (sau `pve-caves`, `world-region-bonglai`, `gear-tier-199`) | |
| 6 | `evt-calendar` → `pve-worldboss` → `pve-tathu-199` → `evt-season-plus` → 7 lễ hội (`evt-noel` trước tiên vì hạn 12/12/2026) → `evt-festival-boss` → `evt-login-rewards` | thứ tự gộp theo `content/50` mục 1 (E1 → E2 → E3) |

Ràng buộc mức: `evt-season-plus` (Must) chỉ phụ thuộc `evt-season-core` (nút "Lịch" trong cửa sổ Lễ hội chỉ hiện khi `evt-calendar` đã vào); 7 lễ hội (Must) chỉ phụ thuộc `evt-season-plus` (Must); `evt-festival-boss` (Should) phụ thuộc lễ hội lõi chứ không ngược lại; dòng đổi `box`/`chest_up` do `eco-loot-tables` (Should) tự thêm khi có, lễ hội không chờ.

---

## 12. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Tiểu Nhị (20 việc) cộng Việc Làng (10 việc) cho khoảng 6 cấp/ngày ở cấp 120 nếu làm hết (mục 1.2). Có giảm số việc Tiểu Nhị khi Việc Làng vào không? | Giữ cả hai như đặc tả (danh mục ghi "giữ song song"); mục 06 cân bằng đo lại bằng `dev-balance-tool` sau khi `quest-dailies` vào, nếu thời gian 1 → 199 dưới 70 giờ thì giảm hệ số EXP Việc Làng trước, không giảm số lượt |
| Q2 | Trần lượng boss bản đồ 60/ngày có quá thấp với người chơi chăm đánh boss? | Giữ 60, đo trung vị và phân vị 90 lượng PvE/ngày 2 tuần sau phát hành (rào chắn 1.3); chỉnh trong `BOSS_LUONG` không cần sửa mã |
| Q3 | Boss chỉ ở kênh 1 (ADR-05d-1) có làm người chơi kênh khác thấy bị thiệt? | Có biểu ngữ và nút đổi sang kênh 1; kênh 1 khi có boss được nâng trần 80. Không làm bản sao boss mỗi kênh (trái P5) |
| Q4 | `giangsinh2026` (12/12/2026) có kịp đủ việc lễ hội và boss lễ hội không? | Nếu GĐ 6 chưa xong trước 05/12/2026 thì phát hành đường tối thiểu: file mùa + token + icon + Sứ Giả mặc đồ mùa + thời trang (W5, W12, W13 của `content/50`) trên khung `evt-season-core` có sẵn (khi đó dữ liệu mùa vẫn nằm trong `extras.js`), việc lễ hội và boss lễ bật khi `evt-season-plus`/`evt-festival-boss` vào |
| Q5 | Yêu Quái Lễ Hội thay 2 lượt Tà Thú (12:30, 22:30) hay thêm lượt mới? | Thay, để tổng lượng phát ra không đổi và lịch không chồng |
| Q6 | Đêm Hội Hóa Trang 2026 bị bỏ vì trùng Trăng Rằm 2026 (đến 08/11). Có rút ngắn Trăng Rằm 2026 để chạy Hóa Trang không? | Không: mùa đang chạy không đổi ngày (người chơi đang tích bánh); Hóa Trang bắt đầu từ 2027 |
| Q7 | Quà ngày chính lễ dựa trên ngày âm lịch (mùng 1 Tết, Giỗ Tổ, rằm) phải nhập tay mỗi năm? | Có: ghi ngày dương lịch cụ thể trong `gift.on` của từng file mùa; check-data kiểm ngày nằm trong mùa. Không thêm bảng âm lịch vào mã |
| Q8 | Ấn Đài cho 1 lượt/ngày mỗi Ấn Đài có đủ để gom 30 Mảnh Thần Binh? | Đủ ở mức "nguồn phụ": 3-4 mảnh/lượt, cộng boss vùng (2,5 mảnh/lần) thì khoảng 7-10 ngày một thần binh; nếu người chơi phản hồi chậm thì tăng lên 2 lượt/ngày bằng `TRIAL_RULES.daily`, không đổi tỉ lệ rơi |
| Q9 | Có cho đánh Ấn Đài một mình không? | Có (hệ số máu 0,8 khi 1 người), nhưng cân bằng theo nhóm 3 người; một mình mất khoảng gấp 2-3 lần thời gian, vẫn trong giới hạn 20 phút với người trang bị khá |
| Q10 | Thủ Hộ Làng (`evt-village-defense`) đặc tả chung file với Việc Làng; ai giữ `src/shared/data/dailies.js`? | Một người làm cả hai trong cùng lô (lô 3 đợt 3) như `specs/dailies.md`; mục 04 đặc tả lối chơi Thủ Hộ Làng, mục này đặc tả Việc Làng |
| Q11 | Phím mở Việc Làng là H (đặc tả cũ) hay Y? | Y, theo `specs/PLAN.md` (H dành cho Chiến Trường) |
| Q12 | Lịch tháng (`evt-login-rewards`) thay vòng 7 ngày có làm người đang giữ chuỗi dài bị thiệt? | Không bồi thường riêng: chuyển đổi tính ngày hôm nay đã điểm danh nếu có; tổng lượng mỗi tháng của lịch mới (≤ 70) không thấp hơn vòng cũ (khoảng 64) |
