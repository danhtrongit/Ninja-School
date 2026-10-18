# GDD 05 — Hệ thống trang bị, rèn, túi, tiền khóa, cửa hàng

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5 (phần trang bị và kinh tế vật phẩm): trang bị, cường hóa, ngọc khảm, Thợ Rèn mở rộng, hành trang, thủ kho, rương, tiền tệ, xu khóa và vật phẩm khóa, cửa hàng NPC |
| Ngày | 18/10/2026 |
| Id phụ trách (23) | `gear-equipment`, `gear-upgrade`, `gear-gems`, `gear-inventory`, `gear-storage`, `gear-chest`, `eco-currency`, `eco-shop-npc`, `ui-bag-expand`, `ui-bag-bulkdrop`, `eco-bound`, `gear-tier-199`, `gear-crafting`, `gear-smith-plus`, `gear-upgrade-transfer`, `gear-refine`, `gear-fame`, `gear-storage-plus`, `eco-consumables-199`, `eco-loot-tables`, `eco-shop-tabs` (21 id của danh mục) + 2 id mới tách ra: `eco-currency-guard` (con của `eco-currency`), `eco-sell-bulk` |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md` (mục 7, 8, 9), `NOTE.md`, mã thư mục làm việc ngày 18/10/2026 (`src/server/modules/{inventory,smith,gems,storage,shop,trade}`, `src/server/core/{player,combat}.js`, `src/shared/data/items/*`, `src/shared/constants.js`, `src/client/js/ui/windows/{inventory,smith,shop,storage}.js`, `tests/features/*`), đặc tả đợt 3 đã duyệt `specs/bound.md`, `specs/crafting.md`, `specs/PLAN.md` (+ phần liên quan của `battlefield.md`, `balance.md`, `market.md`), nội dung cấp 120-199 `content/00-foundation.md` mục 3, `content/40-items-shops.md`, nhánh `feat/bag` |
| Số đo riêng của mục này | `scratchpad/gddwork/lab/m05/upgrade-sim.js` (kỳ vọng chi phí cường hóa, giải xích Markov trên bảng `UPGRADE` thật), `lab/m05/econ.js` (giá ghép đá, tách, rã, rèn đúc, chuyển cấp, trang sức Vinh Danh); kết quả thô `upgrade-sim.out.txt`, `econ.out.txt`; `npm run check` ngày 18/10: `✔ Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng` |
| Sổ đăng ký | `scratchpad/gddwork/registry/05b.json` (23 mục) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 15. Mọi tên trong game là tên tự đặt; game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ **loại** cơ chế. Đặc tả đợt 3 (`specs/*.md`) và nội dung (`content/*.md`) là bản triển khai chi tiết; tài liệu này tóm theo khuôn GDD, chốt chỗ còn hở, và ghi rõ chỗ **chỉnh lại** so với đặc tả (ADR-05b-1, ADR-05b-4).

---

## 0. Tóm tắt

| Id | Tên | Trụ cột | Mức | Trạng thái | GĐ | Mục |
|---|---|---|---|---|---|---|
| `gear-equipment` | Trang bị 9 ô × 12 bậc, 5 độ hiếm có dòng phụ | P3, P5 | M | done | 3 | 3.1 |
| `gear-upgrade` | Cường hóa +1 → +16, Bùa Bảo Hộ, báo toàn máy chủ từ +10 | P5 | M | done | 3 | 3.2 |
| `gear-gems` | Ngọc khảm 6 loại × 10 cấp, ghép 3 → 1 | P5 | S | done | 3 | 3.3 |
| `gear-inventory` | Hành trang: dùng, mặc, hủy, sắp xếp | P2 | M | done | 3 | 3.4 |
| `ui-bag-expand` | Mở rộng túi bằng lượng, túi chia trang 40 ô | P2 | S | todo (chờ gộp `feat/bag`) | 0 | 3.4.1 |
| `ui-bag-bulkdrop` | Hủy nhanh nhiều món | P2 | S | todo (chờ gộp `feat/bag`) | 0 | 3.4.2 |
| `gear-storage` | Thủ kho 60 ô | P2, P5 | M | done | 3 | 3.5 |
| `gear-chest` | Rương Báu | P5 | S | todo (mã chạy, thiếu kiểm thử và bảng tỉ lệ) | 3 | 3.6 |
| `eco-currency` | Xu (trần 2 tỉ) và lượng | P5 | M | done | 3 | 3.7 |
| `eco-currency-guard` | Giữ toàn vẹn tiền: trần lượng, kẹp khi tải, chặn tràn khi nhận tiền từ người khác, nhãn nguồn | P5 | M | todo | 3 | 3.7.1 |
| `eco-shop-npc` | Cửa hàng NPC: Tiệm Thuốc, Lò Rèn, bán lấy xu | P2, P5 | M | done | 3 | 3.8 |
| `eco-bound` | Xu khóa và vật phẩm khóa | P5 | M | todo | 1 (dời từ 3 khi ghép, xem ROADMAP) | 4 |
| `gear-smith-plus` | Ghép đá cường hóa, tách cường hóa, ghép ngọc nhiều lần (NOTE.md) | P5 | S | todo | 3 | 5.1 |
| `gear-upgrade-transfer` | Chuyển cấp cường hóa sang món mới | P5 | S | todo | 3 | 5.2 |
| `gear-crafting` | Chế tác: Tinh Thiết, rã đồ, rèn đúc theo ô | P5 | S | todo | 3 | 5.3 |
| `gear-refine` | Tẩy luyện dòng phụ, giữ 1 dòng | P5 | C | todo | 3 | 5.4 |
| `gear-tier-199` | Trang bị bậc 12-19 và Thần binh vùng | P5, P3 | M | todo | 3 | 6 |
| `eco-consumables-199` | Bình cấp 120/160, đồ ăn 6 nhóm, đan dược | P3, P5 | M | todo | 2 | 7 |
| `eco-loot-tables` | Bảng rơi dữ liệu `LOOT`, rương vùng, Rương Thượng Giới, cẩm nang, hộp lễ hội | P5 | S | todo | 3 | 8 |
| `eco-shop-tabs` | Cửa hàng chia quầy và tab, khung giới hạn lượt | P2 | S | todo | 3 | 9 |
| `eco-sell-bulk` | Bán nhanh nhiều món, mua lại món vừa bán, ghim món quý | P2, P5 | S | todo | 3 | 10 |
| `gear-fame` | Trang sức Vinh Danh đổi và nâng bằng danh vọng | P4, P5 | S | todo | 4 | 11 |
| `gear-storage-plus` | Kho mở rộng, Rương Gia Bảo dùng chung tài khoản (cất xu) | P2 | C | todo | 3 | 12 |

Ba điểm chốt của mục này:
1. **Thợ Rèn hoàn thiện** (yêu cầu trong `NOTE.md`) gồm 6 thao tác mới chia vào đúng tab người chơi nghĩ tới: Ghép đá nằm cạnh Ghép ngọc; Tách cường hóa và Chuyển cấp là chế độ của tab Cường hóa; tab mới "Chế tác" có Rèn đúc, Rã đồ, Tẩy luyện (ADR-05b-1). "Tách cường hóa" là **giữ món, đưa về +0, hoàn một nửa đá danh nghĩa**; phá món lấy nguyên liệu là "Rã đồ".
2. **Đá hoàn lại luôn khóa** (tách, rã) để xu khóa và đá khóa không "rửa" được qua cường hóa rồi tách (ADR-05b-4). Các luật khóa khác giữ nguyên `specs/bound.md`.
3. Mọi thao tác mới đi qua **một module server `crafting`** và một cửa sổ `upgrade` có sẵn; máy khách không tự tính công thức, mọi bảng tra tới qua `clientData` (CLAUDE.md: không chép dữ liệu game vào client).

---

## 1. Hiện trạng đo được

### 1.1 Số liệu trong code (thư mục làm việc 18/10/2026)

| Hạng mục | Giá trị | Nơi |
|---|---|---|
| Trang bị chiến đấu | 168 món = 72 vũ khí (6 phái × 12 bậc) + 96 món 8 ô dùng chung | `items/equipment.js` `build()` |
| Bậc | 12: Gỗ, Đồng, Sắt, Bạc, Vàng, Ngọc, Huyền, Long, Thiên, Thần, Tiên, Thánh (cấp 1, 10, 20 đến 110) | `items/base.js` |
| Công thức | vũ khí công `W(t) = 8 + 6t² + 14t`, áo thủ `A(t) = 5 + 3t² + 8t`, giá `100·(t+1)^2.2·hệ số` | `equipment.js` |
| Độ hiếm | Thường 0 dòng phụ, Tốt 1-2, Hiếm 2-3, Sử thi 3-4, Huyền thoại 4-5; bể 11 chỉ số | `RARITY`, `OPTION_POOL` |
| Rơi trang bị | quái 4,5% một món bậc `⌊cấp/10⌋`, ô ngẫu nhiên, **vũ khí phái ngẫu nhiên** (5/6 vũ khí rơi ra không đúng phái người nhặt); độ hiếm quái 60/28/10/2, boss 4 món độ hiếm Hiếm/Sử thi/Huyền thoại 25/55/20 | `core/combat.js` `rollDrops`, `rollRarity` |
| Cường hóa | +16, tỉ lệ 100% giảm dần đến 4%, đá Sơ/Trung/Cao/Thần theo mốc 4 cấp, số đá `p mod 4 + 1`, phí `(p+1)²·400·(t+1)`, mỗi cấp +8% chỉ số gốc, từ +4 thất bại tụt 1 cấp (trừ khi dùng Bùa Bảo Hộ 2 lượng) | `UPGRADE`, `modules/smith` |
| Ngọc | 6 loại × 10 cấp, lỗ 1/2/3 theo bậc, không trùng loại, gỡ `300 + 200·N²` xu, ghép 3 → 1 phí `1000·N²` tỉ lệ 100% giảm dần đến 25% | `items/gems.js`, `modules/gems` |
| Hành trang | 40 ô; nhánh `feat/bag` thêm `INV_EXPAND = { step: 10, cost: [50, 100, 150, 200, 300, 400] }` (tối đa 100 ô), `discardMany`, `invExpand`, túi chia trang 40 ô, `ask()` | `constants.js`, `modules/inventory`, `windows/inventory.js` |
| Thủ kho | 60 ô, cộng dồn chồng, dùng chung mọi làng, miễn phí | `modules/storage` |
| Đồ giữ hộ | `c.pending`: thưởng không vào túi, kho cũng đầy thì giữ, trả dần mỗi giây | `Player.stashItem`, `deliverPending` |
| Tiền | xu trần 2 tỉ qua `gainXu`; **lượng không có trần**, cộng thẳng `p.c.luong +=` ở 15 chỗ; giao dịch cộng xu thẳng `p.c.xu +=` (không qua trần) | `grep "luong +=" src/server` |
| Cửa hàng | Tiệm Thuốc 14 món xu + 39 món lượng; Lò Rèn đá Sơ + 6 ngọc cấp 1 + trang bị bậc 0-3; bán NPC 25% giá (trang bị nhân theo độ hiếm và cấp cường hóa, cộng 25% giá ngọc đang khảm) | `items/shops.js`, `modules/shop` |
| Rương Báu | 30% xu `500 + 200·cấp + ngẫu nhiên(200·cấp)`, 20% đá theo cấp ×2-5, 25% trang bị đúng phái bậc theo cấp độ hiếm Tốt/Hiếm/Sử thi 54/36/10, 13% Bí Kíp Nhân Đôi, 5% thời trang 7 ngày, 7% lượng 2-9; cần 1 ô trống | `modules/inventory` `openChest` |

### 1.2 Chi phí cường hóa kỳ vọng (đo bằng `lab/m05/upgrade-sim.js`)

Bảng dưới là kỳ vọng toán học từ bảng `UPGRADE` thật, tính từ +0. "Danh nghĩa" là số đá nếu không lần nào thất bại.

| Đích | Cách | Số lần thử | Bùa | Đá thực tiêu (Sơ / Trung / Cao / Thần) | Đá danh nghĩa | Phí xu bậc 0 | Phí xu bậc 11 |
|---|---|---:|---:|---|---|---:|---:|
| +4 | | 4,4 | 0 | 11,4 / - / - / - | 10 | 14.084 | 169.011 |
| +8 | không bùa | 23,6 | 0 | 18,4 / 39,7 / - / - | 10 / 10 | 307.155 | 3.685.854 |
| +8 | bùa từ +4 | 11,9 | 7,5 | 11,4 / 20,3 / - / - | 10 / 10 | 152.522 | 1.830.268 |
| +10 | bùa từ +4 | 18,3 | 13,9 | 11,4 / 20,3 / 10 / - | 10 / 10 / 3 | 387.951 | 4.655.411 |
| +12 | không bùa | 1.354 | 0 | 240 / 2.708 / 449 / - | 10 / 10 / 10 | 29,5 triệu | 353,5 triệu |
| +12 | bùa từ +4 | 29,1 | 24,7 | 11,4 / 20,3 / 48,6 / - | 10 / 10 / 10 | 967.951 | 11.615.411 |
| +16 | bùa từ +4 | 90,2 | 85,8 | 11,4 / 20,3 / 48,6 / 180,6 | 10 mỗi loại | 6.462.395 | 77.548.744 |
| +16 | không bùa | 30,8 triệu | 0 | (không thực tế) | | | |

Kết luận dùng cho mọi thiết kế ở mục 5: (1) từ +10 người chơi **luôn** dùng Bùa Bảo Hộ, nên +16 tốn khoảng 86 bùa (172 lượng) và 181 Đá Thần cho một món; (2) số đá thực tiêu gấp 1,1-18 lần danh nghĩa, nên mọi khoản hoàn đá tính theo **danh nghĩa** (không theo số thực tiêu) không thể sinh lời; (3) Đá Trung/Cao/Thần hiện **không mua được** ở đâu (chỉ rơi), nên đường ghép đá (mục 5.1) vừa là cách có đá vừa là chỗ hút xu lớn.

### 1.3 Kiểm thử đang bao phủ

| Hành động | Kiểm thử có | Thiếu |
|---|---|---|
| `equip`, `unequip` | `features/quest.js`, `features/endgame.js`, `features/fashion.js` (ô `__proto__`) | mặc sai phái, thiếu cấp |
| `upgrade` | `features/skills.js` (+0 → +1), `features/fashion.js` (chặn thời trang, ô `__proto__`), E2E (hiển thị +11) | thất bại tụt cấp, Bùa Bảo Hộ, báo toàn máy chủ (giao `dev-test-coverage`) |
| `gemPut`, `gemTake`, `gemMerge` | `features/gems.js` (45 kiểm tra), E2E | |
| `sortInv`, `discard` | `features/passive.js`, `features/fashion.js`, `features/mail.js` | |
| `discardMany`, `invExpand` | `features/inventory.js` (nhánh `feat/bag`, đã có trong index) | |
| `storePut`, `storeTake` | `features/daily.js`, `features/pets.js` | kho đầy |
| `buy`, `sell` | `features/quest.js`, `features/passive.js`, `features/gems.js` | không có E2E cửa hàng |
| mở Rương Báu (`useItem` loại `chest`) | **không có** | toàn bộ (mục 3.6) |

---

## 2. Nguyên tắc chung cho mọi hệ thống ở mục này

| # | Nguyên tắc | Cách làm |
|---|---|---|
| N1 | Server có thẩm quyền | Máy khách chỉ gửi ý định (`npc`, ô, id, số lần). Mọi số qua `int()` và kẹp biên; khóa ô trang bị kiểm bằng danh sách `SLOTS`/`GEAR_SLOTS` **và** `own()`; id vật phẩm tra bằng `hasOwnProperty` hoặc danh sách cho phép, không bao giờ `ITEMS[m.id]` trước khi kiểm. |
| N2 | Kiểm trước, trừ sau | Đủ tiền, đủ nguyên liệu, **đủ chỗ** (`canAddItems(list, minus)` với `b`) kiểm hết rồi mới trừ bất cứ thứ gì. Không có nhánh "trừ rồi mới phát hiện túi đầy". |
| N3 | Đúng ô, không theo id | Thao tác lên một món cụ thể (tách, rã, bán) lấy món từ đúng ô `i`, xóa đúng ô `i` (`p.c.inv[i] = null`), không dùng `removeItem(id)` (có thể trúng món khác cùng id). |
| N4 | Chặn trạng thái nguy hiểm | `p.dead`, `p.trade` (món đã đặt vào giao dịch), `p.match` (lôi đài) thì bỏ qua thao tác đổi món. Phải đứng gần NPC đúng loại (`nearNpc(p, m.npc, loại)`, cùng bản đồ, 130 px). |
| N5 | Chống bấm dồn | Mỗi nhóm thao tác có mốc thời gian riêng trên `Player` (không lưu): `p.lastCraft` 250 ms, gán **chỉ khi** thao tác thực hiện. |
| N6 | Khóa lan truyền | Đầu vào có món khóa thì đầu ra khóa (bảng 4.3). Đá **hoàn lại** luôn khóa. Không có đường nào mở khóa hay đổi xu khóa thành xu. |
| N7 | Gộp chồng | Mọi chỗ gộp chồng dùng `sameStack(it, id, b)`; mọi chỗ chuyển món sang người khác (giao dịch, chợ, thư người chơi, kho chung tài khoản) lọc bằng `canTransfer(it)`. |
| N8 | Chỉ số đổi thì tính lại | Đổi món đang mặc: `p.recalc(); refreshInfo(p); p.checkQuestState();`. Luôn `p.markInv(); p.markMe(); world.db.dirty = true`. |
| N9 | Bảng tra cho máy khách | Công thức nằm ở `src/shared/data/items/*.js`; module đưa bảng tính sẵn qua móc `clientData` (ví dụ `out.craft`). Máy khách chỉ tra bảng. |
| N10 | Giao diện | Dựng DOM bằng `h()` (tên món là text node), hỏi xác nhận bằng `await this.ask({ title, text, ok, cancel, danger })` (không `confirm()`), nút thao tác chính cao ≥ 44 px trên điện thoại, không cuộn ngang trang, hàng tab con cuộn ngang trong khung. Thông báo kết quả chỉ giữ 1 cái mới nhất. |
| N11 | Thông báo toàn máy chủ | Chỉ ở mốc hiếm: cường hóa/chuyển cấp đạt +10, ghép ngọc cấp ≥ 8, ghép thần binh, mở rương ra Huyền thoại hoặc ≥ 20 lượng. |
| N12 | Phân vùng file | Một file một agent mỗi đợt (CLAUDE.md). Các id ở mục 5 cùng sửa `modules/crafting/index.js`, `items/crafting.js`, `windows/smith.js`, `windows/crafting.js` nên làm **tuần tự** theo mục 14. |

---

## 3. Hệ thống đã có: hiện trạng và phần cần nâng

### 3.1 `gear-equipment` — Trang bị (P3, P5 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Trục tiến triển chính: mỗi 10 cấp có bậc mới, độ hiếm và dòng phụ tạo khác biệt giữa hai món cùng bậc. |
| Hiện trạng | 9 ô chiến đấu (`GEAR_SLOTS`), vũ khí riêng phái, 8 ô dùng chung; tên "Loại + Bậc" (Kiếm Bạc, Áo Thánh); `itemStats` cộng chỉ số gốc × (1 + 0,08·cấp cường hóa) + dòng phụ + ngọc; `makeItem(id, q, độ hiếm, ngày)`; món có hạn `it.exp`. Hình nhân vật đổi màu theo bậc áo/vũ khí (`TIER_OUTFIT/METAL/TRIM`). |
| Dữ liệu | `src/shared/data/items/{base,equipment}.js` |
| Gói | `equip { slot }`, `unequip { slot }` → `inv`, `me`, `info` |
| Phần cần nâng | bậc 12-19 + Thần binh (`gear-tier-199`, mục 6); món khóa (`eco-bound`); so sánh nhanh khi trỏ/chạm (`ui-item-compare`, mục GDD giao diện); ra đúng ô mình cần qua Rèn đúc (`gear-crafting`); vũ khí sai phái rơi ra có chỗ dùng qua Rã đồ (`gear-crafting`). **Không** làm thưởng bộ (đủ 9 món cùng bậc): xem Câu hỏi mở Q11. |
| Tiêu chí (đang đạt) | `npm run check` sạch; `ITEMS` có đúng 168 trang bị chiến đấu (72 vũ khí + 96); `npm test` đạt phần mặc trang bị (`features/quest.js`, `features/endgame.js`) và chặn ô giả (`features/fashion.js`). |

### 3.2 `gear-upgrade` — Cường hóa (P5 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Hút đá và xu lâu dài, cho món cũ giá trị khi chưa lên bậc mới; mốc +5/+8/+11 có hiệu ứng ánh sáng trên vũ khí (DESIGN_RULES mục 3). |
| Hiện trạng | Cửa sổ Thợ Rèn tab "Cường hóa" `[data-smtab=upg]`, gói `upgrade { npc, src: 'eq'|'inv', slot, charm }` → `upgradeResult { ok, plus, name }` + `smithFx` cho cả bản đồ; thông báo thế giới khi đạt ≥ +10. |
| Phần cần nâng | phí trừ xu khóa trước (`eco-bound`: `p.xuAll()`/`p.payXu`); hoàn đá khi tách, chuyển cấp sang món mới (`gear-smith-plus`, `gear-upgrade-transfer`); kiểm thử nhánh thất bại tụt cấp, Bùa Bảo Hộ (giao `dev-test-coverage`); chặn `p.dead`/`p.match` như ngọc khảm (1 dòng, làm cùng `gear-smith-plus`). Không đổi tỉ lệ, không thêm cấp +17~+20 ở 1.0 (`content/00-foundation.md` mục 3.4). |
| Tiêu chí (đang đạt) | `features/skills.js`: cường hóa vũ khí +0 → +1 trừ đúng đá và xu, có `upgradeResult`; `features/fashion.js`: thời trang và ô `__proto__`/`constructor` bị từ chối, server không sập; `DESIGN_RULES.md` mục 9 hàng "Cường hóa" khớp `UPGRADE` (+16, +8%/cấp, đá theo mốc). |

### 3.3 `gear-gems` — Ngọc khảm (P5 · S · done, đặc sắc)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `gemPut { npc, src, slot, hole, gem }`, `gemTake { npc, src, slot, hole }`, `gemMerge { npc, id }` → `gemResult`; 250 ms giữa hai lần ghép; ngọc đi theo món khi giao dịch, cất kho, bán (+25% giá viên). Đã có 45 kiểm tra (`features/gems.js`) và E2E khảm + ghép. |
| Phần cần nâng | ghép nhiều lần một lượt (`n` ≤ 10) trong tab Ghép chung với đá (`gear-smith-plus`); khóa lan truyền khi khảm/gỡ/ghép (`eco-bound`); ngọc cấp 6-7 ở hậu kỳ (boss rơi cấp `min(7, 2 + ⌊cấp/35⌋)`, `content/00-foundation.md` mục 3.6, thuộc `core-levelcap-199`); cẩm nang ngọc (`eco-loot-tables`). **Không** làm đục thêm lỗ (3 lỗ đã là trần theo bậc). |
| Tiêu chí (đang đạt) | `features/gems.js` đạt 45 kiểm tra; E2E (`tests/e2e/e2e.js`) mở tab Khảm ngọc và khảm được; `npm run check` kiểm `GEM_TYPES` tăng dần. |

### 3.4 `gear-inventory` — Hành trang (P2 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `useItem { slot }` (bình hồi chiêu, cuộn, đồ ăn, rương, sách, thức ăn thú), `equip`, `unequip`, `discard { slot }`, `sortInv` (thứ tự loại `equip, potion, food, petfood, scroll, book, stone, gem, chest, event, misc, quest`, loại lạ xếp cuối). Cửa sổ `inv` (phím B) có tab ô trang bị `[data-eqtab=gear|style]`, chi tiết `.item-pop` tự đóng khi món rời ô. |
| Phần cần nâng | thứ tự sắp cho loại mới: `bundle` = vị trí `chest`, `pill` = `scroll`, `frag` = `stone` (`content/40-items-shops.md` 5.2f); Tinh Thiết `ore` là `type: 'stone'` nên tự đứng cạnh đá; khóa chồng (`sameStack` trong `sortInv`, `eco-bound`); ghim món quý chống hủy/bán nhầm (`eco-sell-bulk`). |
| Tiêu chí (đang đạt) | `features/passive.js` kiểm thứ tự `sortInv` theo loại; `features/fashion.js` hủy món và tháo ô; `features/mail.js` hủy món. |

#### 3.4.1 `ui-bag-expand` — Mở rộng túi bằng lượng (P2 · S · todo, nhánh `feat/bag`)

| Khía cạnh | Nội dung |
|---|---|
| Đã làm | `INV_EXPAND = { step: 10, cost: [50, 100, 150, 200, 300, 400] }` lượng (tổng 1.200 lượng cho 100 ô), `invSize(c)` theo `c.invExt`; `sanitize` giữ ô đang có đồ khi bảng giá bị rút bớt (không mất vật phẩm); `invExpand` → `inv`, `me`; `clientData.invExpand`; nút "+ Mở rộng" `[data-act=inv-expand]` hỏi bằng `ask()`; túi chia trang 40 ô `[data-invpage]`, trang cuối lấp ô khóa `.slot-locked` (bấm để mở rộng); `features/inventory.js` (`bagUnitTests`, `bagTest`). Nội dung đã nằm trong index của thư mục làm việc (mốc `a4b4a0a`), chờ commit lên `main` cùng `ops-commit-restructure`. |
| Còn thiếu để "xong" | hàng "Hành trang" ở `DESIGN_RULES.md` mục 9 (40 ô + 6 lần × 10, giá từng lần); ảnh chụp desktop và điện thoại của túi 2-3 trang; commit lên `main`. |
| Tiêu chí | `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` gồm `bagUnitTests` và `bagTest` (mở rộng trừ đúng lượng, thêm 10 ô); `tools/shot.js` túi 100 ô ở 1280×720 và `mobile: true` in `OK no console errors`, nút trang ≥ 44 px trên điện thoại; `grep -n "Hành trang" DESIGN_RULES.md` có hàng mục 9 ghi `INV_EXPAND`. |

#### 3.4.2 `ui-bag-bulkdrop` — Hủy nhanh nhiều món (P2 · S · todo, nhánh `feat/bag`)

| Khía cạnh | Nội dung |
|---|---|
| Đã làm | Chế độ chọn `[data-act=pick-start]` → chọn ô, "Chọn đồ thường" `[data-act=pick-plain]` (trang bị trắng chưa cường hóa, không ngọc), "Hủy N món" `[data-act=pick-discard]` hỏi lại bằng `ask()` (món giá trị đưa lên đầu tô đỏ); gói `discardMany { items: [[ô, id]] }` (mảng nhiều cặp): id phải khớp món đang ở ô, bỏ qua ô trùng/rác, chặn khi giao dịch. |
| Còn thiếu | món đã ghim (`it.pin`, mục 10) không chọn được và server bỏ qua (làm trong `eco-sell-bulk`, không chặn việc gộp nhánh); ảnh chụp chế độ chọn trên điện thoại; commit lên `main`. |
| Tiêu chí | `bagTest` đạt (hủy đúng món, bỏ qua id lệch và dữ liệu rác); ảnh `pick` desktop + điện thoại không lỗi console. |

### 3.5 `gear-storage` — Thủ kho (P2, P5 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | NPC Thủ Kho (`storage`) ở mỗi làng, kho 60 ô dùng chung mọi làng; `storePut { npc, slot }` (cộng dồn chồng trước, kho đầy thì báo), `storeTake { npc, slot }` (`addItemObj`, giữ nguyên `gems`, `plv/pexp/love`, `exp`); kho còn là nơi nhận thưởng khi túi và hộp thư đầy (`stashItem`). |
| Phần cần nâng | gộp chồng theo trạng thái khóa (`eco-bound`); kho mở rộng và Rương Gia Bảo dùng chung tài khoản (`gear-storage-plus`, C); kho chia trang khi > 60 ô. |
| Tiêu chí (đang đạt) | `features/daily.js` cất/lấy đúng món; `features/pets.js` cất thú cưng giữ cấp và thân mật. |

### 3.6 `gear-chest` — Rương Báu (P5 · S · todo)

Mã chạy đủ (mục 1.1) nhưng **chưa có kiểm thử nào mở rương** và tỉ lệ chưa ghi ở `DESIGN_RULES.md`, nên chưa đạt định nghĩa "xong".

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Phần thưởng bất ngờ nhỏ (5 Tiểu Nhị, boss, Tà Thú, lôi đài tuần) có trần rõ; P5 yêu cầu **công khai tỉ lệ** cho mọi hộp ngẫu nhiên. |
| Luồng | Bấm Rương Báu → "Sử dụng" → server cần ≥ 1 ô trống, bỏ 1 rương, quay 1 kết quả, thông báo. |
| Quy tắc | giữ đúng 6 nhánh hiện tại (mục 1.1). Khi `eco-loot-tables` vào, chuyển Rương Báu sang bảng `LOOT.bau` với **cùng tỉ lệ** (30/20/25/13/5/7) để chi tiết vật phẩm tự hiện bảng tỉ lệ; trước đó cửa sổ chi tiết ghi tỉ lệ từ `clientData.chestOdds`. Rương khóa → mọi thứ khóa, xu thành xu khóa (`eco-bound`). |
| Dữ liệu | `items/consumables.js` (`chest`), sau này `src/shared/data/loot.js` (`bau`) |
| Gói | `useItem { slot }` → `notice` loại `reward`, `inv`, `me` |
| Chống gian lận | kiểm ô trống trước khi bỏ rương; `Math.random` chỉ ở server; không nhận tham số nào từ máy khách ngoài ô. |
| Tiêu chí | (1) kiểm thử đơn vị `chestUnitTests()` trong `tests/features/inventory.js`: mở 10.000 rương với `Player` thật, tỉ lệ 6 nhánh lệch ≤ 1,5 điểm % so với 30/20/25/13/5/7; túi đầy → rương còn nguyên, có thông báo "Hành trang đã đầy!"; trang bị ra đúng phái và bậc `min(TIERS−1, ⌊cấp/10⌋)`; (2) `DESIGN_RULES.md` mục 9 có hàng "Rương Báu" ghi đủ tỉ lệ; (3) chi tiết Rương Báu trong túi hiện bảng tỉ lệ (ảnh desktop + điện thoại, `OK no console errors`). |
| Kiểm thử | `tests/features/inventory.js` (`chestUnitTests`) |

### 3.7 `eco-currency` — Xu và lượng (P5 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `c.xu` (trần 2 tỉ qua `gainXu`), `c.luong` (không trần); `me.xu/luong` hiện ở HUD (`#st-xu`) và hàng tiền `moneyLine()` chân cửa sổ. Nguồn lượng: nhiệm vụ chính, Tiểu Nhị, điểm danh, Tà Thú, lôi đài, boss top 3, rương, giftcode, thư admin. |
| Tiêu chí (đang đạt) | `features/quest.js` mua 5 bình trừ đúng 100 xu; `features/social.js` giao dịch đổi xu đúng; `features/mail.js` nhận xu/lượng trong thư. |

#### 3.7.1 `eco-currency-guard` — Giữ toàn vẹn tiền (P5 · M · todo, id mới, `parent: eco-currency`)

Lý do tách id: ba lỗ thật tìm thấy khi đọc mã, không thuộc id nào khác của danh mục: (a) lượng không có trần và không kiểm kiểu ở 15 chỗ cộng; (b) giao dịch cộng xu thẳng `p.c.xu += o.trade.xu - p.trade.xu` nên người nhận có thể vượt 2 tỉ; (c) `sanitize` không kẹp `xu/luong` (file sửa tay hay hỏng có `NaN`/số âm thì đi thẳng vào mọi phép so sánh).

| Khía cạnh | Nội dung |
|---|---|
| Quy tắc | `CUR_MAX = 2e9` cho `xu`, `xuk`, `luong`. `Player.gainLuong(n, src)` và `Player.spendLuong(n, src)` (trả `false` nếu thiếu, không trừ) thay mọi `p.c.luong +=/-=`; `gainXu(n, src)` thêm tham số nhãn nguồn. Nhận tiền **từ người chơi khác** (giao dịch, chợ, thư người chơi) mà vượt trần thì **từ chối giao dịch** và báo "Xu của <tên> đã gần đạt giới hạn." (không cắt mất tiền); thưởng từ hệ thống thì kẹp ở trần như hiện tại. `sanitize` kẹp `xu`, `xuk`, `luong` về số nguyên 0..`CUR_MAX` (`NaN` → 0). Mỗi lần cộng/trừ gọi `this.world.econ && this.world.econ.log(p, loại, n, src)` (hàm tạm, `ops-audit-log` làm phần ghi nhật ký). |
| Dữ liệu | `src/shared/constants.js` (`CUR_MAX`) |
| Module | `core/player.js` (3 hàm + kẹp trong `sanitize`), thay lời gọi ở `modules/{inventory,quest,mail,season,arena,events,admin,skills,wheel,pk,trade}`, `core/combat.js`, `services/reward.js` (từng dòng, không đổi logic khác) |
| Gói | không đổi (`me.xu/luong/xuk`) |
| Chống gian lận | không có số tiền nào từ máy khách được cộng; nhãn nguồn là hằng chuỗi trong code. |
| Tiêu chí | `grep -rnE "c\.luong \+=|c\.luong -=|c\.xu \+=" src/server` không còn dòng nào ngoài `core/player.js`; kiểm thử đơn vị: `gainLuong(3e9)` → 2e9; `spendLuong(5)` khi có 3 → `false`, không đổi; nhân vật có `luong: 'abc', xu: -5` → sau `new Player` là 0/0; giao dịch khi người nhận có 1,999 tỉ xu và nhận 5 triệu → giao dịch hủy, hai bên giữ nguyên tiền và đồ; `npm test` đạt. |
| Kiểm thử | `tests/features/currency.js` (mới: `currencyUnitTests`), `tests/features/social.js` (thêm 1 ca giao dịch vượt trần) |

### 3.8 `eco-shop-npc` — Cửa hàng NPC (P2, P5 · M · done)

| Khía cạnh | Nội dung |
|---|---|
| Hiện trạng | `buy { npc, id, qty }` (id phải có trong danh sách của NPC, sách 1 cuốn/lần, kiểm tiền và chỗ trước khi trừ), `sell { npc, slot, qty }` (25% giá); gói `shop { npc, title, items[{ id, price, cur }] }`; cửa sổ `shop` với tab Mua / Thú cưng / Thời trang / Bán (`[data-shtab]`). Lò Rèn chỉ bán bậc 0-3. |
| Phần cần nâng | hàng mua bằng lượng hoặc bằng xu khóa thì khóa, bán đồ khóa ra xu khóa, ô "Không dùng xu khóa" (`eco-bound`); hai quầy xu/lượng và tab tự xếp, giới hạn lượt (`eco-shop-tabs`); bán nhiều món, mua lại, ghim (`eco-sell-bulk`); E2E cửa hàng (thêm trong `eco-shop-tabs`). |
| Tiêu chí (đang đạt) | `features/quest.js` mua bình; `features/passive.js` mua sách đúng phái, mua 10 sách chỉ được 1, bán sách ra xu; `features/gems.js` mua ngọc cấp 1 ở Lò Rèn, bán món có ngọc cộng giá ngọc. |

---

## 4. `eco-bound` — Xu khóa và vật phẩm khóa (P5 · M · todo)

Đặc tả triển khai đầy đủ: `specs/bound.md` (lô 1 đợt 3). Phần dưới tóm theo khuôn GDD và ghi 3 điểm bổ sung (4.6).

### 4.1 Mục đích

Thưởng "kiểu nhiệm vụ" (nhiệm vụ, điểm danh, giftcode, thư quản trị, đổi quà lễ hội, hàng mua bằng lượng) không thành hàng hóa giữa người chơi: chặn cày nhân vật phụ để chuyển quà, chặn bán quà lấy tiền thật, giữ giá trị chợ cho đồ cày được (P5). Vẫn cho người chơi dùng hết quà của mình: mặc, dùng, cường hóa, khảm, bán NPC, cất kho.

### 4.2 Luồng người chơi

1. Nhận 1.000 xu từ nhiệm vụ → hàng tiền ghi "1.000 xu khóa" (icon đồng xu đồng đỏ có ổ khóa con). HUD không thêm ô, chỉ `title` của ô xu ghi cả hai.
2. Mua bình ở Tiệm Thuốc: phí trừ xu khóa trước; lần mua có dùng xu khóa thì bình khóa (ổ khóa 12 px góc trên phải ô). Muốn hàng không khóa thì bật ô "Không dùng xu khóa".
3. Mở giao dịch: ô khóa mờ đi, bấm không chọn được; dòng gợi ý giải thích.
4. Bán món khóa cho NPC → nhận xu khóa.

### 4.3 Quy tắc

| Luật | Giá trị |
|---|---|
| Tiền | `c.xuk` 0..2e9. Nguồn: thưởng nhiệm vụ chính và hằng ngày, điểm danh, vòng quay, giftcode, thư quản trị, đổi quà lễ hội, rương khóa, bán đồ khóa. Phí NPC (mua bằng xu, cường hóa, gỡ/ghép ngọc, dịch chuyển, vòng quay xu, mọi phí ở mục 5) trừ xu khóa trước bằng `p.payXu(cost, noBound)`. Không giao dịch, không góp hay lập gia tộc, không đặt giá chợ. |
| Cờ món | `it.b = 1`, chỉ server đặt. Chồng khóa và chồng thường không bao giờ gộp. |
| Khi nào khóa | quà như trên; mua bằng lượng; mua bằng xu có dùng xu khóa; mở từ rương khóa; khảm ngọc khóa vào món (cả món khóa); gỡ ngọc từ món khóa; ghép có ít nhất 1 viên khóa; đổi bằng danh vọng/cống hiến (G12); **đá hoàn lại từ tách cường hóa và rã đồ (luôn khóa, ADR-05b-4)**; chuyển cấp từ món nguồn khóa (món nhận khóa). |
| Không khóa (chủ ý) | cường hóa món thường bằng đá khóa/xu khóa (R7 của `bound.md`: tránh khóa nhầm món đắt); xu và đồ rơi từ quái, thưởng lôi đài, Tà Thú, phó bản, chiến trường. |
| Không chuyển | giao dịch, chợ, thư người chơi, Rương Gia Bảo dùng chung tài khoản: chỉ món `canTransfer(it)` (không khóa, không hạn). |

### 4.4 Dữ liệu, gói, module

| Phần | Nội dung |
|---|---|
| Dữ liệu | `src/shared/bound.js` mới: `XUK_MAX, isBound, bind, sameStack, canTransfer, cleanBound, cleanXuk`. Không thêm vật phẩm. |
| Lõi | `core/player.js`: `canAdd/addItem` thêm tham số `b`, `canAddItems` mang `b`, `removeItemB(id, qty)` (ưu tiên chồng khóa, trả số món khóa đã trừ), `gainXuk`, `xuAll`, `payXu`. |
| Module | `modules/bound` mới (móc `sanitize` order 2, `selfData` gửi `xuk`); sửa đúng các hàm đã liệt kê ở `bound.md` 3.3 (trade, storage, inventory, shop, smith, gems, movement, wheel, reward, checkin, quest, mail, admin, season). |
| Gói | `me.xuk`; `buy` thêm `nb` (chỉ nhận `true`/`1`); `mail.list[*].xuk`; `gemResult.bound`; món mang sẵn `b`. |
| Client | icon `lock`, `xuk` (`render/icons/ui.js`); `xuAll()` (`core/store.js`); `itemIcon` vẽ ổ khóa `.bnd`; `invGrid(onclick, mark, dim)`; chi tiết `.id-bound`; ô `.shop-nb`; token `--xuk: #e9a86a`. |
| Điện thoại | hàng tiền `.money` được xuống dòng; `.shop-nb` cao 44 px; không thêm ô HUD (khung trạng thái điện thoại đã thu 0,72). |

### 4.5 Chống gian lận và nhân bản

Theo `bound.md` mục 6 (R1-R11): gộp chồng chỉ qua `sameStack` ở đủ 6 chỗ (`grep` kiểm), mua bằng xu khóa thì hàng khóa và bán hàng khóa ra xu khóa (thiếu một vế là in tiền), `tradeOk` kiểm lại `canTransfer` lúc chốt, ngọc khóa lan sang món, rương khóa lan sang mọi món mở ra, tiền giao dịch chỉ `c.xu`, `payXu` kiểm đủ trước khi trừ, không đọc `b`/`xuk` từ gói máy khách.

### 4.6 Bổ sung so với `specs/bound.md`

| # | Bổ sung | Lý do |
|---|---|---|
| B1 | Đá hoàn lại (tách cường hóa, rã đồ) **luôn** khóa, kể cả khi món nguồn không khóa | Kết hợp R7 (cường hóa bằng đá khóa không khóa món) với hoàn đá sẽ thành đường đổi đá khóa → đá thường (ADR-05b-4). |
| B2 | Mua lại món vừa bán (`eco-sell-bulk`): món **không khóa** chỉ trả được bằng `c.xu` | Bán món thường lấy xu rồi mua lại bằng xu khóa = đổi xu khóa thành xu 1:1. |
| B3 | Phí của mọi thao tác ở mục 5, 11, 12 dùng `p.payXu`, máy khách khóa nút theo `xuAll()` | Giữ G12 của `PLAN.md` cho các id mới. |

### 4.7 Tiêu chí chấp nhận và kiểm thử

- `tests/features/bound.js` (`unit` 17 ca + `bot` 9 bước của `bound.md` 5.1) đạt; các kiểm tra cũ bị ảnh hưởng sửa theo `bound.md` 5.2, **không** xóa kiểm tra nào; `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`.
- `grep -rn "s.id === it.id\|it.id === id\|x.id === it.id" src/server` chỉ còn chỗ đã chuyển sang `sameStack`; `grep -rn "p.c.xu -=\|p.c.xu <" src/server` chỉ còn ở `trade`, `clan`.
- `npm run check` sạch (kiểm `reward.xu` nguyên ≥ 0).
- Ảnh `tools/shot.js` cổng 3621, `DATA_DIR=/tmp/ns-bound`: túi có ổ khóa, 2 chồng `hp1` riêng, chi tiết "Vật phẩm khóa", hàng tiền 3 mục, ở 1280×720 và `mobile: true`, đều in `OK no console errors`.
- `DESIGN_RULES.md` mục 7 (icon `lock`, `xuk`), 8 (token, ô khóa), 9 (2 hàng xu khóa, vật phẩm khóa) cập nhật.

---

## 5. Thợ Rèn hoàn thiện

### 5.0 Bố cục cửa sổ Thợ Rèn sau nâng cấp (áp dụng cho 5.1-5.4)

Cửa sổ vẫn là `upgrade` (tiêu đề "Thợ Rèn"), giữ chiều cao tối thiểu `min(540px, 92vh)`. Tab chính `[data-smtab]`:

| Tab | Id | Chế độ con | Thuộc id |
|---|---|---|---|
| Cường hóa | `upg` | `[data-upmode=up|split|move]`: Cường hóa · Tách cường hóa · Chuyển cấp | `gear-upgrade`, `gear-smith-plus` (split), `gear-upgrade-transfer` (move) |
| Khảm ngọc | `gem` | (không đổi) | `gear-gems` |
| Ghép | `merge` (đổi nhãn "Ghép ngọc" → "Ghép") | `[data-mgkind=gem|stone]`: Ngọc · Đá cường hóa | `gear-gems`, `gear-smith-plus` |
| Chế tác | `craft` (mới) | `[data-crtab=forge|salvage|refine]`: Rèn đúc · Rã đồ · Tẩy luyện | `gear-crafting`, `gear-refine` |

Hội thoại NPC Thợ Rèn thêm 2 lựa chọn: "Ghép đá cường hóa" (`a: 'stone'` → `openUi { ui: 'upgrade', npc, tab: 'merge', kind: 'stone' }`) và "Chế tác trang bị" (`a: 'craft'` → `tab: 'craft'`). Máy chủ: **một module `crafting`** (`src/server/modules/crafting/index.js`, đăng ký một dòng cuối `modules/index.js`), không đăng ký lại NPC `smith` (trùng loại NPC làm server dừng), chỉ sửa `open`/`act` của `modules/smith`. Dữ liệu: `src/shared/data/items/crafting.js` (`CRAFT`, `stonesUsed`, `salvageYield`, `craftable`, vật phẩm `ore`), nối cuối `items/index.js`. Kết quả mọi thao tác: gói `craftResult { act, ok }` kèm trường riêng từng thao tác + `smithFx` có sẵn (không thêm hiệu ứng vẽ mới). Máy khách: `ui/windows/crafting.js` mới (`renderCraft`, `renderSplit`, `renderMove`, `renderStoneMerge`), `smith.js` sửa tối thiểu (hàng tab, chế độ con, gọi sang `crafting.js`), `ui.js` thêm import, nhánh `openUi` nhận `kind`, `n.on('craftResult')` cuối `bind`. Bảng tra: `clientData.craft` (mục 5.5).

Điện thoại: hàng chế độ con `.cr-seg` (3 nút mỗi tab, cao 44 px, cuộn ngang trong khung nếu thiếu chỗ), danh sách món cột trái, hộp thao tác cột phải như tab Cường hóa hiện tại; nút thao tác chính luôn trong khung nhìn; thông báo kết quả hiện phía trên (quy tắc có sẵn của Thợ Rèn).

### 5.1 `gear-smith-plus` — Ghép đá, tách cường hóa, ghép ngọc nhiều lần (P5 · S · todo)

**Mục đích.** Thực hiện yêu cầu `NOTE.md`. Ghép đá cho người chơi một đường có Đá Trung/Cao/Thần bằng xu (hiện chỉ rơi), đồng thời là chỗ hút xu lớn nhất hậu kỳ. Tách cường hóa cho phép bỏ một món đã đổ đá mà không mất trắng, khi món mới khác ô (chuyển cấp chỉ cùng ô).

**Luồng.**
- Ghép đá: Thợ Rèn → tab Ghép → "Đá cường hóa" → chọn đá trong túi (đá đủ 3 viên có tam giác xanh) → chọn số lượt 1-10 (`input.cr-n`, tối đa `⌊có/3⌋`) → thấy "3 × Đá Sơ → 1 Đá Trung · tỉ lệ 80% · phí 1.500 xu/lượt" → **GHÉP ĐÁ**.
- Tách cường hóa: tab Cường hóa → "Tách cường hóa" → chọn món ≥ +1 (mặc hoặc túi) → thấy "+12 → +0, nhận lại 5 Đá Sơ, 5 Đá Trung, 5 Đá Cao (khóa), phí 72.000 xu" → **TÁCH** → hộp `ask()` nguy hiểm "Món sẽ về +0, chỉ hoàn một nửa số đá cơ bản. Tiếp tục?".
- Ghép ngọc nhiều lần: tab Ghép → "Ngọc" có ô số lượt như ghép đá.

**Quy tắc và công thức.**

| Thao tác | Luật |
|---|---|
| Ghép đá | chuỗi `stone1 → stone2 → stone3 → stone4`; 3 viên cấp i → 1 viên cấp i+1; tỉ lệ `[80, 65, 50]`%; phí `[1.500, 8.000, 40.000]` xu mỗi lượt; thất bại mất 1 viên, trả 2; tối đa 10 lượt mỗi lần bấm, phí tính một lần `cost·n`, kiểm đủ `3n` viên và chỗ cho trường hợp xấu nhất (`n` viên cấp trên + `2n` viên cấp dưới) trước khi trừ. Khóa: trừ bằng `removeItemB` (chồng khóa trước); `kb = ⌈nb/3⌉` lượt đầu là lượt khóa, kết quả và viên trả lại của lượt khóa đều khóa. Đá Thần không ghép tiếp. |
| Tách cường hóa | món trang bị chiến đấu (`craftable`: 9 ô, không thời trang/thú, không `exp`, không Vinh Danh), `p ≥ 1`; món về `p = 0`, giữ ngọc, dòng phụ, độ hiếm; hoàn `⌊stonesUsed(p)[đá] × 50%⌋` mỗi loại, **luôn khóa**; phí `500·p·(bậc+1)` xu. |
| Ghép ngọc nhiều lần | `gemMerge { npc, id, n }`, `n` 1-10 (mặc định 1, gói cũ không có `n` vẫn chạy như nay); mỗi lượt như luật hiện có; kiểm đủ `3n` viên, phí `mergeCost·n`, chỗ cho trường hợp xấu nhất; thông báo thế giới nếu có lượt ra cấp ≥ 8. |

Số đo (`lab/m05/econ.js`): giá kỳ vọng mỗi viên khi ghép từ Đá Sơ mua 300 xu: Đá Trung **2.850** xu (giá danh nghĩa 2.500), Đá Cao **22.392** (15.000), Đá Thần **169.569** (80.000); bán lại NPC chỉ 625 / 3.750 / 20.000 nên không có vòng lãi. Một món +16 cần khoảng 181 Đá Thần thực tiêu (mục 1.2) ≈ 30,7 triệu xu nếu toàn bộ đi đường ghép: mục tiêu dài hạn, không bắt buộc (Đá Thần còn rơi từ quái cấp ≥ 90, boss, rương vùng, cửa hàng danh vọng).

Hoàn đá khi tách (khóa, 50% danh nghĩa):

| Cấp | Đá nhận lại | Bán NPC (xu khóa) | Phí bậc 3 | Phí bậc 11 |
|---|---|---:|---:|---:|
| +4 | 5 Sơ | 375 | 8.000 | 24.000 |
| +8 | 5 Sơ, 5 Trung | 3.500 | 16.000 | 48.000 |
| +12 | 5 Sơ, 5 Trung, 5 Cao | 22.250 | 24.000 | 72.000 |
| +16 | 5 mỗi loại | 122.250 | 32.000 | 96.000 |

So với chi phí thực để đạt cấp đó (mục 1.2: +12 có bùa tiêu 48,6 Đá Cao, +16 tiêu 181 Đá Thần), lượng hoàn nhỏ hơn rất xa, nên không thể "cường hóa → tách → cường hóa" để sinh lời.

**Dữ liệu.** `items/crafting.js`: `CRAFT.stone = { chain, rate: [80, 65, 50], cost: [1500, 8000, 40000], maxBatch: 10 }`, `CRAFT.split = { refund: 0.5, cost: (p, t) => 500 * p * (t + 1) }`, `stonesUsed(p)`, `craftable(it)`. Không thêm vật phẩm.

**Gói.**

| Gói (máy khách → server) | Trường | Kiểm |
|---|---|---|
| `craftStone` | `npc, id, n` | gần Thợ Rèn, không chết/giao dịch, 250 ms; `id` phải nằm trong `CRAFT.stone.chain` (tra bằng `indexOf`), không là đá cuối; `n = kẹp(int(m.n,1), 1, 10)` |
| `craftSplit` | `npc, src: 'eq'|'inv', slot` | như trên; `slot` ô mặc phải thuộc `GEAR_SLOTS` và `own()`; ô túi kiểm biên; `craftable`, `p ≥ 1`; đủ `xuAll`; đủ chỗ cho đá hoàn (`canAddItems` với `b = 1`) |
| `gemMerge` (mở rộng) | thêm `n` | như hiện có + kẹp `n` |

Server → máy khách: `craftResult { act: 'stone', ok, fail, id, next, cost }`, `craftResult { act: 'split', name, from, got: [{ id, q }], cost }`, `gemResult { act: 'merge', ok, fail, n }` (giữ các trường cũ); `smithFx` có sẵn (`k: 'gem'` khi có lượt thành công, `k: 'enh'` thất bại). Không gửi lại cả danh sách: `inv`, `me` do `markInv/markMe`.

**Module, cửa sổ, DOM.** Server: `modules/crafting` (`craftStone`, `craftSplit`), `modules/gems` (`gemMerge` thêm `n`), `modules/smith` (`open`/`act` thêm lựa chọn, `upgrade` thêm chặn `p.dead`/`p.match`). Client: `windows/crafting.js` (`renderStoneMerge`, `renderSplit`), `windows/smith.js` (`[data-mgkind]`, `[data-upmode]`, đổi nhãn tab Ghép), `ui.js` (`openUi.kind`, `craftResult`). Selector cho kiểm thử: `[data-mgkind=stone]`, `[data-upmode=split]`, `[data-act=craft-stone]`, `[data-act=craft-split]`.

**Chống gian lận.** Kiểm chỗ trước khi trừ (N2); tách chỉ đổi `it.p` của đúng món đã chọn và cộng đá hoàn trong cùng lượt xử lý đồng bộ (không có `await` giữa); đá hoàn luôn khóa; `p.trade` chặn mọi thao tác (món đang đặt giao dịch không đổi được); dữ liệu cũ có `p > 16` bị kẹp ở `sanitize` của module `crafting`.

**Tiêu chí chấp nhận.**
1. Đơn vị (`Math.random` giả lập trong `try/finally`): 6 Đá Sơ, `n = 2`, `random = 0` → 0 Sơ, 2 Trung, xu −3.000; 3 Sơ, `random = 0.999` → còn 2 Sơ, 0 Trung, xu −1.500; `id` là `stone4`, `'__proto__'`, `'hp1'`, `{a:1}` → túi và xu không đổi; `n = 999` → kẹp 10, `n = -5` → 1; túi đầy không đủ chỗ trường hợp xấu nhất → báo đầy, không trừ gì; 2 Sơ khóa + 4 Sơ thường, `n = 2`, `random = 0` → 1 Trung khóa + 1 Trung thường.
2. Tách: món +12 bậc 3 trong túi → `p = 0`, nhận đúng 5 Sơ + 5 Trung + 5 Cao đều `b === 1`, xu −24.000, ngọc khảm còn nguyên; món đang mặc → `p.s.atk` giảm đúng; món `exp`, thời trang, `p = 0` → từ chối; túi đầy → từ chối, món giữ +12.
3. `gemMerge` với `n = 3`, `random = 0` → 9 viên cấp 1 thành 3 viên cấp 2, phí ×3; gói không có `n` chạy như cũ (45 kiểm tra cũ của `features/gems.js` vẫn đạt).
4. Bot (`features/crafting.js`, tài khoản `craft1`): đứng xa NPC gửi `craftStone` → không có `craftResult` trong 1,5 s; lại gần, `/item stone1 6` → `craftStone n=2` → `ok + fail === 2`; `/plus 8` → `craftSplit eq weapon` → vũ khí +0, túi có `stone1` và `stone2` khóa; gói rác (`slot: '__proto__'`, `id: {a:1}`) không làm sập server.
5. `npm run check`: `CRAFT.stone` dài đúng, mọi id tồn tại; với mọi i, `sellPrice(chain[i+1]) < 3·price(chain[i]) + cost[i]`.
6. Ảnh 1280×720 và `mobile: true` của tab Ghép (Đá) và chế độ Tách, cổng 3626, `DATA_DIR=/tmp/ns-crafting`, đều `OK no console errors`; nút chính ≥ 44 px trên điện thoại.
7. `DESIGN_RULES.md` mục 8 (Thợ Rèn: tab và chế độ con) và mục 9 (hàng "Chế tác") cập nhật.

**Kiểm thử.** `tests/features/crafting.js` (mới: `craftUnitTests`, `craftTest`), `tests/features/gems.js` (thêm ca `n`), `tests/e2e/e2e.js` (mở tab Ghép → Đá cường hóa).

### 5.2 `gear-upgrade-transfer` — Chuyển cấp cường hóa (P5 · S · todo)

**Mục đích.** Lên bậc mới không phải đổ lại toàn bộ đá; giữ giá trị công sức (P5 "đường dài") mà vẫn hút tài nguyên (luôn mất cấp, tốn lượng + xu).

**Luồng.** Tab Cường hóa → "Chuyển cấp" → lưới 1 "Món chuyển" (mặc + túi, `p ≥ 2`, dấu `E` cho món đang mặc) → lưới 2 "Món nhận" (cùng ô, bậc ≥, khác món) → hộp "+12 (Kiếm Bạc) → +10 (Kiếm Ngọc) · Kiếm Bạc về +0 · 24 lượng + 36.000 xu" → **CHUYỂN CẤP** → `ask()` (nếu món chuyển khóa mà món nhận chưa khóa: thêm dòng "Món nhận sẽ bị khóa").

**Quy tắc.** Hai món `craftable`, cùng `slot`; bậc món nhận ≥ bậc món chuyển; món chuyển `p ≥ 2`; cấp mới `np = p − (p ≥ 10 ? 2 : 1)`; phải `np > p(món nhận)`; phí `2·p` lượng + `500·p·(bậc nhận+1)` xu (`payXu`); đặt `B.p = np` và `A.p = 0` trong cùng lượt xử lý; món chuyển khóa → món nhận khóa; `np ≥ 10` → thông báo thế giới. Ngọc và dòng phụ **không** chuyển.

| Ví dụ | Lượng | Xu (nhận bậc 5 / 11 / 19) |
|---|---:|---|
| +5 → +4 | 10 | 15.000 / 30.000 / 50.000 |
| +10 → +8 | 20 | 30.000 / 60.000 / 100.000 |
| +12 → +10 | 24 | 36.000 / 72.000 / 120.000 |
| +16 → +14 | 32 | 48.000 / 96.000 / 160.000 |

**Dữ liệu.** `CRAFT.transfer = { loss: (p) => (p >= 10 ? 2 : 1), luong: (p) => 2 * p, cost: (p, t) => 500 * p * (t + 1) }`.

**Gói.** `craftTransfer { npc, fromSrc, fromSlot, toSrc, toSlot }` → `craftResult { act: 'transfer', from, to, plus, luong, cost }` + `smithFx { k: 'enh', ok: true, plus }`.

**Module, cửa sổ.** `modules/crafting` (`craftTransfer`), `windows/crafting.js` (`renderMove`), selector `[data-upmode=move]`, `[data-act=craft-move]`.

**Điện thoại.** Hai lưới xếp chồng trong cột trái (lưới 2 chỉ hiện sau khi chọn món 1), hộp thao tác cột phải.

**Chống gian lận.** `A.it !== B.it`; khóa ô qua `GEAR_SLOTS` + `own()`; lượng kiểm bằng `spendLuong` (sau `eco-currency-guard`) hoặc `p.c.luong <` trước khi trừ; không có trạng thái chờ giữa hai món; `p.trade` chặn.

**Tiêu chí chấp nhận.** Đơn vị: A `w_kiem_3` +12 đang mặc → B `w_kiem_5` +0 trong túi: B +10, A +0, lượng −24, xu −36.000, `p.s.atk` giảm; +5 → món đã +4 bị từ chối; khác ô, bậc nhận thấp hơn, A === B, thiếu lượng (không trừ xu) đều từ chối; A khóa → B có `b === 1`. Bot: `/plus 6` vũ khí đang mặc + vũ khí bậc cao hơn trong túi → món nhận +5, vũ khí đang mặc +0. Ảnh desktop + điện thoại `OK no console errors`. `npm test` đạt.

**Kiểm thử.** `tests/features/crafting.js` (`transfer*` ca).

### 5.3 `gear-crafting` — Chế tác: Tinh Thiết, rã đồ, rèn đúc (P5 · S · todo)

**Mục đích.** (1) Vũ khí sai phái và đồ thừa (5/6 vũ khí rơi ra không đúng phái) có chỗ dùng thay vì chỉ bán 25% giá; (2) chống xui ô: gom đồ thừa thành nguyên liệu để **rèn đúng ô mình cần**; (3) hút xu theo bậc.

**Luồng.** Tab Chế tác → "Rã đồ": lưới trang bị trong **túi** (không nhận đồ đang mặc) → thấy "Nhận 7 Tinh Thiết + 3 Đá Sơ (khóa) · phí 2.400 xu" → **RÃ ĐỒ** (`ask()` nguy hiểm). "Rèn đúc": chọn ô (9 nút ô, vũ khí tự theo phái), chọn bậc (≤ bậc theo cấp nhân vật) → thấy "28 Tinh Thiết + 28.800 xu → Kiếm Thiên ngẫu nhiên Thường 40% · Tốt 35% · Hiếm 20% · Sử thi 5%" → **RÈN**.

**Quy tắc và công thức.**

| Thao tác | Luật |
|---|---|
| Tinh Thiết | id `ore`, `type: 'stone'` (xếp cạnh đá), `stack: 999`, giá 400 (bán NPC 100), icon `{ k: 'material', c: '#9fb4c7' }` có sẵn; **không** bán ở cửa hàng. |
| Rã đồ | chỉ ô túi, `craftable`, không còn ngọc khảm (phải gỡ trước), không ghim; nhận `1 + ⌊bậc/2⌋ + độ hiếm` Tinh Thiết + `⌊stonesUsed(p) × 30%⌋` mỗi loại đá (**luôn khóa**); phí `200·(bậc+1)` xu; món nguồn khóa → Tinh Thiết khóa. Xóa đúng ô (N3). |
| Rèn đúc | `slot ∈ GEAR_SLOTS`, bậc `0 ≤ t ≤ min(TIERS−1, ⌊cấp/10⌋)`; tốn `6 + 2t` Tinh Thiết (`removeItemB`, có viên khóa thì món ra khóa) + `200·(t+1)²` xu; độ hiếm Thường/Tốt/Hiếm/Sử thi `40/35/20/5`, **không** ra Huyền thoại (giữ giá trị boss, rương); vũ khí luôn đúng phái người rèn; cần 1 ô trống. |

Số đo (`econ.js`): rèn 1 món cần trung bình 4,0-4,7 món rã cùng bậc; chi phí rèn luôn lớn hơn giá bán NPC kỳ vọng của món ra (bậc 11: 28.800 xu + 28 Tinh Thiết so với 12.870 xu bán; bậc 19: 80.000 + 44 so với 39.597), nên không có vòng "rã → rèn → bán" sinh lời.

| Bậc | Tinh Thiết khi rã (Thường đến Huyền thoại) | Phí rã | Tinh Thiết để rèn | Phí rèn |
|---:|---|---:|---:|---:|
| 0 | 1-5 | 200 | 6 | 200 |
| 6 | 4-8 | 1.400 | 18 | 9.800 |
| 11 | 6-10 | 2.400 | 28 | 28.800 |
| 15 | 8-12 | 3.200 | 36 | 51.200 |
| 19 | 10-14 | 4.000 | 44 | 80.000 |

**Dữ liệu.** `items/crafting.js`: vật phẩm `ore`, `CRAFT.salvage = { ore: (t, r) => 1 + ⌊t/2⌋ + r, refund: 0.3, cost: (t) => 200·(t+1) }`, `CRAFT.forge = { ore: (t) => 6 + 2t, cost: (t) => 200·(t+1)², rarity: [40, 35, 20, 5, 0] }`, `salvageYield(it)`.

**Gói.** `craftSalvage { npc, slot }` → `craftResult { act: 'salvage', name, plus, got, cost }`; `craftForge { npc, slot: tên ô, tier }` → `craftResult { act: 'forge', id, r, cost, ore }` + `smithFx { k: 'enh', ok: true, plus: 0 }`.

**Module, cửa sổ, DOM.** `modules/crafting` (`craftSalvage`, `craftForge`, móc `sanitize` kẹp `it.p` 0..16 và dọn `it.o`), `windows/crafting.js` (`renderCraft` + `renderSalvage`, `renderForge`), selector `[data-smtab=craft]`, `[data-crtab=forge|salvage]`, `[data-forge-slot=<ô>]`, `[data-act=craft-salvage]`, `[data-act=craft-forge]`. CSS cuối `css/windows.css` khối `/* ----- Chế tác */`.

**Điện thoại.** Rèn đúc: 9 nút ô thành lưới 3 × 3 cao 44 px; bậc chọn bằng 2 nút `−`/`+` (không dùng thanh trượt, khó chạm); dòng tỉ lệ độ hiếm thu thành 1 dòng chữ nhỏ.

**Chống gian lận.** Kiểm chỗ cho mọi đầu ra trước khi xóa món (`canAddItems(out, [[it.id, 1]])`); không nhận đồ đang mặc, đồ `exp`, thời trang, thú; `tier` và `slot` qua `int()`/danh sách cho phép; độ hiếm quay ở server; món ra đi qua `makeItem` (dòng phụ quay mới), không sao chép món cũ.

**Tiêu chí chấp nhận.** Đơn vị: `salvageYield` đúng 4 ví dụ (`w_kiem_0` Thường +0 → 1 Tinh Thiết; `armor_4` Hiếm +4 → 5 Tinh Thiết + 3 Sơ; `ring_7` Sử thi +8 → 7 + 3 Sơ + 3 Trung; `w_kiem_11` Huyền thoại +16 → 10 + 3 mỗi loại), đá hoàn `b === 1`; rã `armor_4` trong túi → ô trống, món cùng id ở ô khác còn nguyên; có ngọc/`exp`/thú/thời trang/ô `-1`, `999`, `'__proto__'` → từ chối, không đổi; rèn với `random` giả lập ra đúng độ hiếm theo trọng số, `tier` vượt cấp → từ chối, `slot: '__proto__'` → từ chối, vũ khí ra đúng phái; 1.000 lần rèn bậc 5 cho tỉ lệ độ hiếm lệch ≤ 3 điểm %. `npm run check`: `ore` không nằm trong `SHOPS`; với mọi bậc, `sellPrice` kỳ vọng của món rèn < `phí rèn + 100·Tinh Thiết`; rã món Lò Rèn bán (bậc 0-3, Thường +0) không lãi so với giá mua. Bot: `/item armor_4 1 2` → rã → có ≥ 5 `ore`; `/item ore 30` → rèn `hat` bậc 3 → túi có `hat_3`. Ảnh tab Chế tác 3 chế độ ở desktop + điện thoại `OK no console errors`.

**Kiểm thử.** `tests/features/crafting.js`, `tools/check-data.js` (khối "Chế tác" trước khối "Cân bằng").

### 5.4 `gear-refine` — Tẩy luyện dòng phụ (P5 · C · todo)

**Mục đích.** Món độ hiếm cao nhưng dòng phụ xấu có đường sửa (hút Tinh Thiết, xu, lượng); là hương vị, gỡ được bằng bỏ thao tác.

**Quy tắc.** Món `craftable`, độ hiếm ≥ Tốt, có dòng phụ; quay lại **toàn bộ** dòng phụ bằng `rerollOptions(bậc, độ hiếm, n, giữ, vịTrí)` (không trùng khóa); số dòng giữ trong khoảng `RARITY[r].opts`; tốn `2 + ⌊bậc/2⌋` Tinh Thiết + `300·(bậc+1)·độ hiếm` xu; giữ lại 1 dòng thêm `3 + bậc` lượng (cần ≥ 2 dòng). Thay ngay, không có "xem trước rồi chọn giữ cũ" (không có trạng thái treo để khai thác). Giữ nguyên cờ khóa. Tách `optValue` khỏi `rollOptions` mà **giữ nguyên thứ tự gọi `Math.random()`** (kiểm thử rơi đồ đang giả lập).

**Gói.** `craftReroll { npc, src, slot, lock }` (`lock = -1` không giữ) → `craftResult { act: 'reroll', name, o, ore, cost, luong }` + `smithFx { k: 'gem', c: màu độ hiếm }`.

**Module, cửa sổ.** `modules/crafting` (`craftReroll`), `items/equipment.js` (`optValue`, `rerollOptions`, `cleanOptions`, `OPT_KEYS` thêm ở cuối file), `windows/crafting.js` (`renderRefine`: danh sách dòng `✦` mỗi dòng là `label.cr-line` có radio, thêm lựa chọn "Không giữ dòng nào"), selector `[data-crtab=refine]`, `[data-act=craft-reroll]`.

**Điện thoại.** Mỗi dòng radio cao 44 px.

**Chống gian lận.** `lock` qua `int()` và kẹp biên; `cleanOptions` ở `sanitize` bỏ khóa lạ (`'__proto__'`), giá trị `NaN`/âm, khóa trùng, cắt 5 dòng.

**Tiêu chí chấp nhận.** Đơn vị: `rerollOptions(5, 3, 4, null)` trả 4 dòng không trùng thuộc `OPT_KEYS`; giữ `['atk', 99]` ở vị trí 1 → `o[1]` đúng, không dòng nào khác là `atk`; `rollOptions` với `Math.random = () => 0` cho kết quả như trước khi tách hàm; tẩy món r2 hai dòng `lock = 0` → dòng 0 giữ, vẫn 2 dòng, trừ đúng Tinh Thiết và lượng; món r0, `lock = 5` khi có 2 dòng, thiếu Tinh Thiết (không trừ xu) → từ chối; `sanitize` của món `{ p: 99, o: [['atk', 3], ['x', 1]] }` → `p = 16`, `o = [['atk', 3]]`. Bot: `/item ring_3 1 2` + Tinh Thiết → `craftReroll` → `o.length` trong `RARITY[2].opts`. Ảnh desktop + điện thoại `OK no console errors`.

**Kiểm thử.** `tests/features/crafting.js`.

### 5.5 Bảng tra `clientData.craft` (dùng chung 5.1-5.4)

```js
out.craft = {
  stone: { chain, rate, cost, maxBatch },
  split: { refund, cost: [p][t] },                 // phí tách theo cấp và bậc
  stoneUsed: [p] -> { stone1, stone2, stone3, stone4 }, // đá danh nghĩa đã dùng tới +p
  transfer: { loss: [p], luong: [p], cost: [p][t] },
  salvage: { refund, ore: [t][r], cost: [t] },
  forge: { ore: [t], cost: [t], rarity },
  reroll: { ore: [t], cost: [t][r], lockLuong: [t] },
};
```
Máy khách đọc `S.G.craft`, không viết lại công thức nào (kiểm bằng `grep -n "floor(t / 2)\|200 \* (t" src/client/js` không có dòng nào).

---

## 6. `gear-tier-199` — Trang bị bậc 12-19 và Thần binh vùng (P5, P3 · M · todo)

Đặc tả triển khai: `content/00-foundation.md` mục 3 (bậc, chỉ số, màu) và `content/40-items-shops.md` mục 3.1-3.2, 5.2e (Thần binh, mảnh, ghép).

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Mỗi vùng Thượng Giới (cấp 120-199) có bậc trang bị riêng; Thần binh là đường "chắc chắn có" vũ khí Huyền thoại đúng phái cho người cày đủ một vùng. |
| Luồng | Luyện vùng → nhặt trang bị bậc mới (quái 4,5%, boss 4 món), Mảnh Thần Binh (boss 2,5 mảnh/lần, quái 0,4%, rương vùng); gom 30 mảnh + xu → "Ghép (30/30)" trong chi tiết mảnh → Thần binh đúng phái, thông báo thế giới. |
| Quy tắc | `TIERS = 20`; 8 bậc mới: Phượng 120, Kỳ Lân 130, Nhật Nguyệt 140, Tinh Hà 150, Hỗn Nguyên 160, Thái Cực 170, Vô Cực 180, Chí Tôn 190 (màu icon và áo theo bảng 3.1/3.3 của `00-foundation.md`). Giữ `W(t)`, `A(t)`, `price`; dòng sinh lực dùng `hT(t) = t ≤ 11 ? t : 2t − 11` (bậc 0-11 giữ nguyên từng số). Icon bậc ≥ 12 có sao lấp lánh `g: 1`, ≥ 16 `g: 2`. Lò Rèn vẫn chỉ bán bậc 0-3. Lỗ ngọc 3 (sẵn theo `GEM.holes`). Cường hóa không đổi (+16). Thần binh `uw_<phái>_<vùng>`: 48 món, cấp `lv vùng + 5`, công `round(W(t)·1,1)`, chí mạng `3 + 0,5(t−12)`%, ST kỹ năng `5 + (t−12)`%, `grade: 4` cố định không dòng phụ ngẫu nhiên, cường hóa và khảm được; Mảnh `frag_<vùng>` (8 loại) `{ p, n: 30, xu: lv vùng × 1000 }`, ghép cần `xuAll()` và 1 ô trống, có mảnh khóa thì Thần binh khóa. |
| Số liệu | vũ khí bậc 12 / 15 / 19: công 1.040 / 1.568 / 2.440 (bậc 11: 888); áo bậc 19: thủ 1.240, sinh lực 1.100; Thần binh bậc 12 công 1.144 → bậc 19 công 2.684; phí ghép 120.000 → 190.000 xu; phí cường hóa +15 → +16 bậc 19: 2.048.000 xu. |
| Dữ liệu | `items/base.js` (`TIER_NAMES/LV/COLORS` nối 8 phần tử: do `core-levelcap-199` làm, một chủ, chỉnh khi ghép; tính năng này dùng lại), `items/equipment.js` (`hT`, icon `g`, export `W, price`), `items/chests.js` (mảnh + Thần binh), `makeItem`: trang bị có `def.grade` (không thời trang) → `r = grade`, `o = []` (ai làm trước giữa `gear-tier-199` và `pet-mountup` thêm nhánh này, bên sau chỉ kiểm). |
| Gói | không gói mới: `useItem { slot }` trên mảnh → ghép; `inv`, `me`, `chat` thế giới. |
| Module, cửa sổ | `modules/inventory` (`combineFrag`, thứ tự `frag` trong `sortInv`); `windows/inventory.js` (nút "Ghép (x/30)", dòng "Thu thập x/30 · Phí ghép <xu> → <tên Thần binh>"). Màu nhân vật thuộc `char-tier-outfit` (`render/sprites/color.js`, `body.js`). |
| Điện thoại | nút Ghép trong chi tiết vật phẩm cao 44 px. |
| Chống gian lận | ghép trừ mảnh bằng `removeItemB` rồi mới thêm Thần binh trong cùng lượt; kiểm 1 ô trống trước; Thần binh id dựng từ `p.c.cls` (không nhận phái từ máy khách); `p.trade` chặn. |
| Tiêu chí | `npm run check` sạch với 20 bậc; `TIER_OUTFIT/METAL/TRIM` dài bằng `TIERS` (check-data kiểm); bậc 0-11 của mọi món giữ nguyên từng số (so bảng chụp trước/sau trong `levelcap.js`); `ITEMS.uw_kiem_bl.stats` = `{ atk: 1144, crit: 3, skillDmg: 5 }`, `ITEMS.uw_quat_tc.stats.atk === 2684`; `makeItem('uw_dao_hl')` có `r === 4`, `o.length === 0`; 29 mảnh → "Cần 30", 30 mảnh + đủ xu → có `uw_<phái>_<vùng>`, mảnh về 0, `xuAll` giảm đúng phí; ảnh mặc đủ bộ bậc 12/15/17/19 ở 6 phái nam/nữ desktop + điện thoại `OK no console errors`; `npm test` đạt. |
| Kiểm thử | `tests/features/levelcap.js` (bậc, chỉ số), `tests/features/itemshop.js` (mảnh, Thần binh) |

---

## 7. `eco-consumables-199` — Tiêu hao hậu kỳ (P3, P5 · M · todo)

Đặc tả triển khai: `content/00-foundation.md` 3.5 (bình), `content/40-items-shops.md` 3.4-3.5, 4.2-4.6, 5.2b-c, 5.3-5.4.

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Hậu kỳ có bình đủ lớn (P3: không chết vì bình nhỏ), đồ ăn là lựa chọn chiến thuật có trần (không cộng dồn vô hạn), đường sửa lựa chọn tiềm năng/kỹ năng khi 198 điểm kỹ năng không đủ tối đa một phái. |
| Quy tắc | **Bình**: `hp5/mp5` cấp 120 hồi 12.000 (MP 7.200) giá 2.500 xu; `hp6/mp6` cấp 160 hồi 25.000 (MP 15.000) giá 6.000 xu; hồi chiêu chung theo `POTION_CD` của `cmb-balance`. **Đồ ăn**: 11 món mới, 6 nhóm `atk, def, hp, crit, dodge, exp`; cùng nhóm không cộng dồn (ăn món khác cùng nhóm thì món cũ mất ngay, báo "(thay cho <tên món cũ>)"), cùng món thì cộng nối thời gian; trần % công/thủ/sinh lực 20, chí mạng/né 5, % EXP 20; giữ khi thoát game; Trà Ngộ Đạo +20% EXP 60 phút giá 4 lượng, các món khác bán xu (3.000-20.000). **Đan**: Hoán Cốt Đan (tẩy tiềm năng, 18 lượng), Vong Ưu Đan (trả điểm kỹ năng: đòn thường giữ, nội tại và kỹ năng nhập môn về cấp 1, chủ động khác xóa và gỡ khỏi 3 bộ phím; 30 lượng), Đại Bí Kíp Nhân Đôi (+120 phút, 18 lượng). Đan chỉ bị trừ khi có điểm để trả; không dùng khi giao dịch hay ở lôi đài. |
| Dữ liệu | `src/shared/data/foods.js` (`FOODS`, `FOOD_BUFFS`), `constants.js` (`PERSIST_BUFFS` có phần tử thứ 4 = nhóm), `items/consumables.js` (bình 5-6), `items/foods.js`, `items/utility.js` (đan, Đại Bí Kíp), `items/shops.js` (bày hàng). |
| Gói | `useItem { slot }` → `notice`, `me` (buff), `inv`. |
| Module | `modules/inventory` (nhánh `food` theo nhóm, nhánh `pill`, thông báo Bí Kíp theo phút), `modules/buffs` (móc `stats`: `expPct` cộng vào `t.expPct`), `modules/skills` (`resetStatsFree`, `resetSkills`, không thêm hành động). Icon `pill`, đồ ăn `bun/tea/soup/wine/sweet` (`render/icons/items.js`, vùng "Hiệu ứng & icon"). |
| Điện thoại | nút "Sử dụng" có sẵn; ô buff HUD `#hud-buffs` lấy icon theo `S.G.items[khóa]` (không đổi). |
| Chống gian lận | nhóm và giá trị buff chỉ từ dữ liệu; đan kiểm điểm trước khi trừ; Vong Ưu Đan dọn hotbar ở server. |
| Tiêu chí | đơn vị (`itemshop.js` ca 2, 5, 8): `PERSIST_BUFFS.food_atk3` = `['atkPct', 20, 'Bánh Hấp Long Tu', 'atk']`; ăn `food_atk` rồi `food_atk3` → chỉ còn buff `food_atk3`, có chữ "thay cho Bánh Bao Sức Mạnh"; `food_exp` → `expMul` ×1,2; Hoán Cốt Đan trả đúng điểm, dùng khi chưa cộng → đan còn; Vong Ưu Đan trả đúng `skillPoints` và gỡ hotbar; `npm run check`: mỗi nhóm đồ ăn không vượt trần, giá tăng theo giá trị; ảnh HUD có 3 buff đồ ăn desktop + điện thoại `OK no console errors`; `npm test` đạt. |
| Kiểm thử | `tests/features/itemshop.js` |

---

## 8. `eco-loot-tables` — Bảng rơi dữ liệu và rương (P5 · S · todo)

Đặc tả triển khai: `content/40-items-shops.md` 3.3, 4.1, 4.7, 4.12, 5.2d-e.

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Mọi hộp ngẫu nhiên đọc **một bảng dữ liệu** (không viết cứng trong code), tỉ lệ công khai được (P5), nội dung mới chỉ thêm dòng. |
| Quy tắc | `LOOT` (`src/shared/data/loot.js`): mỗi bảng `{ lv, rows: [[trọng số, loại, a, b, c]] }`, mở 1 lần chọn đúng 1 dòng; loại `xu, xulv, item, stone, pot, equip, gem, book, luong, fashion`; `lv: 0` = theo cấp người mở. Bảng: `rg_<vùng>` (8 rương vùng, tổng trọng số 100: xu 26, Đá Thần 18, trang bị đúng phái 16, ngọc 8, bình 10, mảnh 8, Bí Kíp 7, sách 3, lượng 5-15 là 2, Bùa 2), `up` (Rương Thượng Giới), `gem3`, `gem4` (cẩm nang), `lehoi` (hộp lễ hội), và `bau` (Rương Báu cũ, cùng tỉ lệ hiện tại, mục 3.6). `regionDrops(prefix)`: quái vùng rơi rương 0,3% + mảnh 0,4%, boss vùng 1 rương + 2,5 mảnh. Rương khóa → mọi thứ khóa, xu thành xu khóa; lượng và thời trang giữ như Rương Báu. Ra ≥ 20 lượng hoặc trang bị Huyền thoại → thông báo thế giới. **Công khai tỉ lệ**: chi tiết rương liệt kê từng dòng với % = trọng số / tổng (máy khách đọc `S.G.loot`). |
| Dữ liệu | `src/shared/data/loot.js`, `items/chests.js` (`chest_<vùng>`, `chest_up`, `box_gem3`, `box_gem4`), `items/events.js` (`box_lehoi`), `monsters.js` (vòng gộp vùng); `rollLoot(key, cấp, phái, rnd)` export từ `items/index.js` (dùng `hasOwnProperty`). |
| Gói | `useItem { slot }` → `notice` + `chat` thế giới khi hiếm; `clientData.loot` (bảng đã tính %). |
| Module, cửa sổ | `modules/inventory` (`openLoot`; Rương Báu chuyển sang `openLoot('bau')`); `windows/inventory.js` (khối "Tỉ lệ" trong `itemDetail` cho vật phẩm có `loot`, lớp `.id-odds`). |
| Điện thoại | khối tỉ lệ gập mặc định ("Xem tỉ lệ ▾", nút 44 px) để chi tiết không dài quá màn ngang. |
| Chống gian lận | `rollLoot('__proto__')`/khóa lạ trả `null`; kiểm ≥ 1 ô trống trước khi bỏ rương; trọng số chỉ ở dữ liệu. |
| Tiêu chí | `npm run check`: mọi bảng tổng trọng số > 0, `rg_*` đúng 100, mọi `item` tồn tại, mọi vật phẩm `type: 'chest'` có `loot` trỏ bảng có thật (trừ khi không có `loot` thì là Rương Báu cũ trước khi chuyển); đơn vị: `rollLoot('rg_bl', 1, 'kiem', () => 0)` → `{ xu: 30000 }`, `rollLoot('gem4', 50, 'cung')` → `gem_*_4`, `rollLoot('__proto__', 1, 'kiem') === null`; 10.000 lần mở `bau` lệch ≤ 1,5 điểm % so với tỉ lệ cũ; bot mở `chest_bl` ×3 nhận 3 thông báo bắt đầu bằng "Mở Rương Ngọc Trai Bồng Lai nhận"; ảnh chi tiết rương có bảng tỉ lệ desktop + điện thoại `OK no console errors`. |
| Kiểm thử | `tests/features/itemshop.js`, `tests/features/inventory.js` (`chestUnitTests` dùng chung) |

---

## 9. `eco-shop-tabs` — Cửa hàng chia quầy và tab (P2 · S · todo)

Đặc tả triển khai: `content/40-items-shops.md` 4.11, 5.1, 7.1, 7.3.

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Tiệm Thuốc sẽ có hơn 80 món (bình 12, đồ ăn 14, sách theo phái, thời trang, thú, gói, tiện ích): một danh sách dài không dùng được trên điện thoại (P2). |
| Luồng | Tiệm Thuốc → 2 nút quầy `[data-shq=xu|luong]`: "Tiệm Thuốc" (xu: Thuốc · Đồ ăn · Tạp hóa · Bán) và "Kỳ Trân Các" (lượng: Gói ưu đãi · Thời trang · Thú cưỡi · Thú cưng · Tiện ích · Sách). Lò Rèn: Trang bị · Đá & Ngọc · Bán. Món giới hạn ghi "Còn x/y lượt tuần này" / "Giới hạn N lần/nhân vật" / "Đã hết lượt". |
| Quy tắc | tab tính tự động theo loại (`shopTab(id, def, cur)`), món mới của đặc tả khác tự rơi đúng tab không cần khai báo; giới hạn lượt `SHOP_LIMITS = { id: { wk } | { life } }`, lưu `c.shopLim = { wk, w, l }`, tuần bắt đầu thứ Hai 00:00 giờ Việt Nam; giới hạn kiểm và ghi ở server sau khi trừ tiền thành công; gói `shop` giữ trường cũ (`npc, title, items[{ id, price, cur }]`) và thêm `luongName, tab, lim, max, left`. Không thêm NPC hay nhà mới. |
| Dữ liệu | `items/shops.js` (`SHOP_TABS`, `SHOP_LIMITS`, `shopTab`, `luongName: 'Kỳ Trân Các'`), `clientData.shopTabs`. |
| Gói | `buy { npc, id, qty, nb }` (khi có giới hạn: `qty = min(qty, left)`, hết lượt → "Món này mỗi nhân vật chỉ mua được một lần." / "Tuần này đã hết lượt mua món này."); sau khi mua món giới hạn server gửi lại `shop`. |
| Module, cửa sổ, DOM | `modules/shop` (viết lại theo 40 mục 5.1, giữ nguyên phần `bound`, `sell`), `windows/shop.js` (`renderShop`, `shopRow`), CSS cuối `css/features.css` khối `/* ----- Cửa hàng phân tab */`. Selector: `[data-shq]`, `[data-shtab]`, `.sh-lim`, `.shop-row.out`. |
| Điện thoại | hai nút quầy chia đôi bề ngang, cao 44 px; hàng tab cuộn ngang không xuống dòng; `.shop-list` 1 cột (có sẵn ở `touch.css`). |
| Chống gian lận | `cleanShopLim` chỉ giữ id có trong `SHOP_LIMITS` (chặn `__proto__`), số lượt kẹp 0..999; giá luôn lấy từ `ITEMS`, không từ gói. |
| Tiêu chí | đơn vị: `shopTab` đúng 14 ví dụ của 40 mục 5.6 ca 3; `weekKey` đúng 3 mốc (thứ Hai 00:00 giờ VN); `cleanShopLim({ wk: 5, w: { pack_week: 3, __proto__: 1, abc: 2 }, l: 'x' })` → `{ wk: '', w: { pack_week: 3 }, l: {} }`; bot: gói `shop` có `luongName === 'Kỳ Trân Các'`, mọi dòng có `tab` thuộc `S.G.shopTabs`, mua món giới hạn lần 2 bị từ chối và lượng không đổi; E2E mới: mở Tiệm Thuốc, đổi quầy, đổi tab, mua 1 bình (`tests/e2e/e2e.js`); ảnh 6 tab desktop + `mobile: true` (844×390) không tràn khung, `OK no console errors`; kiểm thử cũ (`features/quest.js`, `passive.js`, `gems.js`, `pets.js`) vẫn đạt. |
| Kiểm thử | `tests/features/itemshop.js`, `tests/e2e/e2e.js` |

---

## 10. `eco-sell-bulk` — Bán nhanh, mua lại, ghim món quý (P2, P5 · S · todo, id mới)

Lý do thêm id: túi tới 100 ô và trang bị rơi 32 món/giờ ở cấp 120 (`content/40-items-shops.md` mục 8); bán từng món qua hộp chi tiết là thao tác nặng nhất trên điện thoại. Bán nhanh đi kèm 2 lưới an toàn (P5 "không mất đồ vì bấm nhầm"): mua lại và ghim.

| Khía cạnh | Nội dung |
|---|---|
| Luồng | Cửa hàng → tab Bán → "Bán nhanh" `[data-act=sell-pick]` (cùng chế độ chọn của Hủy nhanh: "Chọn đồ thường", đếm "Đã chọn N · Thu về X xu") → **BÁN N MÓN** (`ask()`, món giá trị tô đỏ đứng đầu). Dòng "Mua lại" dưới lưới: 10 món vừa bán gần nhất, mỗi món một nút giá. Chi tiết món trong túi có nút "Ghim"/"Bỏ ghim" `[data-act=pin]`; món ghim có ghim nhỏ góc dưới phải, không chọn được ở Bán nhanh/Hủy nhanh. |
| Quy tắc | `sellMany { npc, items: [[ô, id, sl]] }`: tối đa số ô của túi, id phải khớp món ở ô, bỏ ô trùng/rác/ghim; giá mỗi món `sellPrice(it)·sl` như `sell`. Mua lại: `p.buyback` (bộ nhớ phiên, **không lưu**, mất khi thoát hay đổi nhân vật) giữ 10 mục `{ it (bản đúng số lượng đã bán), price, b }` theo thứ tự mới nhất; giá mua lại = đúng số tiền đã nhận; món khóa (đã bán ra xu khóa) trả bằng `payXu` (xu khóa trước), món **không khóa trả bằng `c.xu`** (B2, mục 4.6); món trở về nguyên vẹn (cường hóa, ngọc, dòng phụ, cấp thú). Ghim: `itemPin { slot, on }` đặt `it.pin = 1` hoặc xóa; `sell`, `sellMany`, `discard`, `discardMany`, `craftSalvage` từ chối món ghim; ghim không chặn mặc, giao dịch, cất kho. |
| Dữ liệu | không thêm dữ liệu tĩnh; trường món `pin` (dọn ở `sanitize`: chỉ giữ `1`). |
| Gói | `sellMany`, `buyBack { npc, i }`, `itemPin { slot, on }`; gói `shop` thêm `back: [{ i, id, q, r, p, price, cur: 'xu'|'xuk' }]` (gửi lại sau mỗi lần bán/mua lại). |
| Module, cửa sổ | `modules/shop` (`sellMany`, `buyBack`), `modules/inventory` (`itemPin`, chặn ghim trong `discard/discardMany`), `windows/shop.js` (tab Bán), `windows/inventory.js` (nút Ghim, chế độ chọn bỏ món ghim), `ui/common.js` (`itemIcon` vẽ ghim `.pin`). |
| Điện thoại | hàng "Mua lại" cuộn ngang, ô 44 px; nút "Bán N món" cố định cuối khung bán. |
| Chống gian lận | mua lại là **chuyển** đúng đối tượng đã bán (không sao chép); mỗi mục dùng 1 lần; kiểm chỗ trước khi trừ tiền; xu thường bắt buộc cho món không khóa (chặn đổi xu khóa → xu); bán nhanh dùng `int()` cho ô và số lượng, kẹp 1..`it.q`. |
| Tiêu chí | đơn vị: bán 3 món → xu tăng đúng tổng `sellPrice`; mua lại món thứ 2 → món về túi giống hệt (so `JSON.stringify` bỏ qua thứ tự khóa), tiền trừ đúng; món thường bán 1.000 xu, có 5.000 xu khóa và 0 xu → mua lại bị từ chối "Không đủ xu"; món khóa → mua lại trừ xu khóa; mua lại lần 2 cùng mục → không có gì; món ghim không bán, không hủy (cả `discardMany`), vẫn mặc được; `p.buyback` không có trong dữ liệu lưu (tải lại nhân vật → rỗng); bot: `sellMany` với dữ liệu rác (`'x'`, `[[9999,'a',1]]`, `[[0,'__proto__',1]]`) không làm sập và không đổi túi; ảnh tab Bán (chọn 5 món, hàng mua lại) desktop + điện thoại `OK no console errors`. |
| Kiểm thử | `tests/features/sellbulk.js` (mới: `sellBulkUnitTests`, `sellBulkTest`) |

---

## 11. `gear-fame` — Trang sức Vinh Danh (P4, P5 · S · todo)

**Mục đích.** Danh vọng (lôi đài, chiến trường) có một mục tiêu lâu dài ngoài đổi đá/rương: bộ trang sức riêng cho người chơi PvP, tăng sức chịu đòn **trước người chơi** mà không làm mạnh lên trong PvE. Người chỉ đánh quái không cần nó; người PvP có lý do quay lại lôi đài mỗi tuần (P4). Không bán bằng lượng, không chuyển nhượng (P5).

**Luồng.** Đấu Trường → Võ Sư Thiết Quyền → "Vinh Danh" → cửa sổ `honor` 2 tab `[data-hntab=buy|up]`. Tab Đổi: 12 thẻ (3 món × 4 giai), giá danh vọng, cấp cần, nút "Đổi" (nếu đang có món giai dưới cùng ô: nút "Thăng giai" giảm giá). Tab Rèn danh: chọn món Vinh Danh (mặc hoặc túi) → "Vinh Giai 3 → 4 · +3% chỉ số, +0,3% kháng sát thương người chơi · 160 danh vọng" → **NÂNG**.

**Quy tắc.**

| Mục | Giá trị |
|---|---|
| Món | 3 ô trang sức `necklace`, `ring`, `amulet` × 4 giai: Hiệp Sĩ (cấp 40, tương đương bậc 4), Hào Kiệt (80, bậc 8), Tông Sư (120, bậc 12), Võ Thánh (160, bậc 16). Tên "Nhẫn Hào Kiệt", "Dây Chuyền Tông Sư", "Ngọc Bội Võ Thánh"; id `vd_<ô>_<giai 1-4>`. |
| Chỉ số gốc | bằng món thường cùng ô và bậc (ví dụ Nhẫn Hào Kiệt công 151, chí mạng 5%; Dây Chuyền Võ Thánh sinh lực 1.290, chakra 330) + dòng cố định **Kháng ST người chơi** 2 / 3 / 4 / 5% theo giai. Không dòng phụ ngẫu nhiên, không lỗ ngọc, không cường hóa bằng đá (`noUpgrade: true`), không tham gia chế tác. |
| Vinh Giai | `it.vg` 0..10; mỗi giai +3% chỉ số gốc và +0,3% kháng; giá nâng `(vg + 1) × (20 + 10 × giai)` danh vọng (giai 1: 30 → 300, tổng 1.650; giai 4: 60 → 600, tổng 3.300). |
| Đổi | 300 / 600 / 1.000 / 1.500 danh vọng; cần cấp; **khóa** (G12). Thăng giai: nộp món giai ngay dưới cùng ô → giảm 40% giá, món mới giữ `vg − 2` (≥ 0). |
| Kháng ST người chơi | chỉ số mới `pvpRes`: tổng trần 30%; áp ở `damagePlayer` khi nguồn là người chơi (PK, thách đấu, lôi đài, chiến trường, chiến gia tộc): `dmg × (1 − pvpRes/100)`. Không ảnh hưởng đòn quái/boss. Ba món Võ Thánh Vinh Giai 10: 3 × (5 + 3) = 24%. |
| Thời lượng | danh vọng 800-1.500/tuần (`content/40-items-shops.md` mục 8) → đủ bộ Hào Kiệt Vinh Giai 10 sau khoảng 4-6 tuần, đủ bộ Võ Thánh Vinh Giai 10 (4.500 + 9.900 danh vọng, có thăng giai) sau 10-18 tuần. |

**Dữ liệu.** `src/shared/data/items/honor.js` (mới, `HONOR = { bands, cost, upCost, step: 0.03, pvpStep: 0.3, pvpCap: 30, ascend: 0.6 }`, dựng 12 món, nối cuối `items/index.js`), `STAT_LABELS.pvpRes = 'Kháng ST người chơi %'` (`items/base.js`), `itemStats` nhân theo `vg` cho món `honor` (`equipment.js`).

**Gói.** `honorBuy { npc, id }`, `honorUp { npc, src, slot }` → `honorResult { ok, msg, item }`; mở: `npcAct { id, a: 'honor' }` → `openUi { ui: 'honor', npc }`; danh sách đọc từ `clientData.honor` + `me.arena.fame`.

**Module, cửa sổ.** `modules/honor` mới (hành động trên, móc `clientData`, `sanitize` kẹp `vg` 0..10); `modules/arena` thêm 1 lựa chọn hội thoại + 1 nhánh `act` (quy tắc 2 của CLAUDE.md, NPC `arena` đã thuộc module arena); lõi `core/player.js` (`eq.pvpRes`, `s.pvpRes = min(30, eq.pvpRes)`) và `core/combat.js` (`damagePlayer` 1 dòng) — vùng "Lõi server", ADR-05b-3; `windows/honor.js` mới (`renderHonor`), `ui.js` (import, `refresh`, `openUi`), CSS cuối `css/features.css`. Cửa sổ Nhân Vật hiện dòng "Kháng ST người chơi" khi > 0.

**Điện thoại.** Lưới 2 cột thẻ (như cửa hàng danh vọng của chiến trường), nút Đổi/Nâng 44 px, số danh vọng hiện ở đầu cửa sổ.

**Chống gian lận.** Trừ danh vọng **trước** khi trao món (kiểm chỗ trước đó); `id` tìm bằng `find` trong danh sách, không tra object; món đổi luôn khóa nên không mua hộ/bán lại được; `vg` chỉ server tăng; `pvpRes` kẹp trần trong `recalc`.

**Tiêu chí chấp nhận.** Đơn vị: `itemStats({ id: 'vd_ring_2', vg: 10 })` = chỉ số gốc ×1,3 và `pvpRes` 6; nhân vật mặc 3 món Võ Thánh vg 10 có `s.pvpRes === 24`; thêm món giả `pvpRes` 50 → `s.pvpRes === 30`; `damagePlayer` với nguồn người chơi giảm đúng %, nguồn quái không đổi; đổi khi thiếu danh vọng/cấp/chỗ → từ chối, không trừ; thăng giai giữ `vg − 2` và thu đúng 60% giá; `upgrade` (đá) với món Vinh Danh → "Vật phẩm này không thể cường hóa."; bot: admin đặt `c.arena.fame = 2000` (thêm tham số `fame` cho lệnh `/arena` của `modules/admin`) → đổi Nhẫn Hiệp Sĩ → nâng 3 lần → `vg === 3`, danh vọng giảm đúng; món có `b === 1`, `tradeSet` không chọn được; ảnh cửa sổ `honor` 2 tab desktop + điện thoại `OK no console errors`; `DESIGN_RULES.md` mục 9 có hàng "Trang sức Vinh Danh"; `npm run check` kiểm giá tăng dần theo giai, `pvpRes` gốc ≤ 5. |

**Kiểm thử.** `tests/features/honor.js` (mới: `honorUnitTests`, `honorTest`), `npm run test:ui` (2 trình duyệt: PK có và không có trang sức, so số sát thương hiện ra).

---

## 12. `gear-storage-plus` — Kho mở rộng và Rương Gia Bảo (P2 · C · todo)

| Khía cạnh | Nội dung |
|---|---|
| Mục đích | Người chơi lâu năm có chỗ cất đồ lễ hội, đồ dự phòng; chuyển xu và đồ giữa các nhân vật **của cùng tài khoản** mà không cần nhờ người khác giao dịch. |
| Luồng | Thủ Kho → 2 tab `[data-sttab=own|vault]`: "Kho nhân vật" (60 ô + mở rộng) và "Rương Gia Bảo" (30 ô + ô xu, dùng chung 3 nhân vật của tài khoản). Nút "+ Mở rộng kho" `[data-act=store-expand]` hỏi `ask()`. Ô xu Gia Bảo: nhập số → "Gửi" / "Rút". |
| Quy tắc | Kho mở rộng: `STORE_EXPAND = { step: 20, cost: [30, 60, 100, 150] }` lượng → tối đa 140 ô, `c.stExt`; kho chia trang 40 ô như túi. Rương Gia Bảo: 30 ô + xu thường ≤ 2 tỉ; **chỉ nhận món `canTransfer`** (không khóa, không hạn) và xu thường (không xu khóa): đồ khóa từ điểm danh, nhiệm vụ của nhân vật phụ không dồn được về nhân vật chính (giữ ý nghĩa của `eco-bound`); món mang `vid` (id ngẫu nhiên 12 ký tự) khi vào Gia Bảo. |
| Dữ liệu | `constants.js` (`STORE_EXPAND`, `VAULT_SIZE = 30`); bản ghi tài khoản `acc.vault = { items, xu }` (ADR-05b-2). |
| Gói | `storeExpand {}`; `vaultPut { npc, slot }`, `vaultTake { npc, slot }`, `vaultXu { npc, n }` (`n` dương gửi, âm rút) → `storage { npc, items, size, vault: { items, xu } }`. |
| Module, cửa sổ | `modules/storage` (hành động mới, móc `sanitize` kẹp `stExt`), `services/db` (đọc/ghi `acc.vault` qua hàm có sẵn của bản ghi tài khoản), `windows/storage.js` (2 tab, phân trang). |
| Điện thoại | 2 tab 44 px; ô xu là `input[type=number]` + 2 nút 44 px; lưới dùng `invGrid` phân trang có sẵn. |
| Chống gian lận | một tài khoản chỉ có một phiên (cổng đã đá phiên trùng) nên hai nhân vật cùng tài khoản không thao tác Gia Bảo cùng lúc; ghi `accounts` và nhân vật cùng lượt lưu; lúc tải nhân vật, món trong túi/kho có `vid` trùng món đang ở Gia Bảo thì bỏ bản trong nhân vật (chống nhân đôi khi sập giữa hai lần ghi); chỉ bật khi `ops-persist-shard` có số thế hệ chung cho các file (R-06 của mục vận hành). Xu Gia Bảo kẹp trần; rút vượt trần nhân vật → từ chối. |
| Tiêu chí | đơn vị: `storeExpand` trừ đúng lượng, kho thêm 20 ô, lần thứ 5 báo tối đa; Gia Bảo từ chối món khóa, món có hạn, xu khóa; nhân vật A gửi `w_kiem_3` + 5.000 xu → đăng xuất → nhân vật B cùng tài khoản rút được đúng món (giữ `p`, `gems`, `o`) và xu; giả lập "nhân vật lưu, tài khoản chưa lưu" và ngược lại → sau khi tải không có món nào xuất hiện 2 lần, không món nào mất; ảnh 2 tab desktop + điện thoại `OK no console errors`. |
| Kiểm thử | `tests/features/storage.js` (mới: `storageUnitTests`, `storageTest`), `tests/features/persistence.js` (thêm 1 ca tải lại Gia Bảo) |

---

## 13. Kinh tế tổng hợp của mục này

### 13.1 Nguồn và hút (sau khi xong mục 4-12)

| Dòng | Nguồn (vào) | Hút (ra) |
|---|---|---|
| Xu thường | quái, bán đồ cho NPC (đồ không khóa), lôi đài, Tà Thú, phó bản, chiến trường | mua NPC, cường hóa, khảm/gỡ/ghép ngọc, ghép đá, tách, rã, rèn đúc, chuyển cấp, tẩy luyện, ghép Thần binh, dịch chuyển, gia tộc |
| Xu khóa | nhiệm vụ, điểm danh, vòng quay, giftcode, thư quản trị, lễ hội, rương khóa, bán đồ khóa | như xu thường nhưng chỉ phí NPC (trừ trước) |
| Lượng | nhiệm vụ chính, Tiểu Nhị, điểm danh, Tà Thú, lôi đài, boss top 3, rương | Bùa Bảo Hộ, mở rộng túi (1.200), mở rộng kho (340), chuyển cấp (`2·p`), giữ dòng tẩy luyện, sách, thời trang, thú, gói ưu đãi (`mon-luong-shop`), đan |
| Đá cường hóa | rơi, boss, rương, danh vọng, gia tộc, lễ hội, ghép đá, hoàn khi tách/rã (khóa) | cường hóa (thực tiêu gấp 1,1-18 lần danh nghĩa, mục 1.2) |
| Tinh Thiết | rã đồ | rèn đúc, tẩy luyện |
| Danh vọng | lôi đài, chiến trường | cửa hàng danh vọng, trang sức Vinh Danh |

### 13.2 Bất biến kinh tế phải có kiểm tra tự động (`tools/check-data.js`, khối "Trang bị & Thợ Rèn" ngay trước khối "Cân bằng")

| # | Bất biến | Kiểm |
|---|---|---|
| E1 | Không vòng lãi khi ghép đá | `sellPrice(đá i+1) < 3·price(đá i) + phí i` |
| E2 | Không vòng lãi khi rã món mua ở Lò Rèn | tổng `sellPrice` đầu ra của `salvageYield({ id, r: 0, p: 0 })` < `price + phí rã` với mọi món `equipTiers` |
| E3 | Rèn đúc không sinh lời | `E[sellPrice món rèn] < phí rèn + 100·Tinh Thiết` mọi bậc |
| E4 | Chuyển cấp luôn mất cấp | `CRAFT.transfer.loss(p) ≥ 1` mọi `p` 2..16 |
| E5 | Hoàn đá nhỏ hơn danh nghĩa | `split.refund < 1`, `salvage.refund < split.refund` |
| E6 | Đồ mua bằng lượng không thành xu có lời | `sellPrice` mọi món chỉ có `priceLuong` ≤ 12 xu |
| E7 | Rương công khai | mọi vật phẩm `type: 'chest'` có bảng `loot` hợp lệ (sau `eco-loot-tables`) |
| E8 | Vinh Danh không vượt trần | `pvpRes` gốc ≤ 5, giá đổi/nâng tăng dần theo giai |

---

## 14. Thứ tự làm và phân vùng file

| Đợt | Id (song song trong đợt nếu không chung file) | File chính | Ghi chú |
|---|---|---|---|
| 0 | `ui-bag-expand`, `ui-bag-bulkdrop` | commit index hiện tại (`ops-commit-restructure`) | chỉ còn tài liệu + ảnh |
| 3a | `eco-bound` | `shared/bound.js`, `core/player.js`, nhiều module (bảng `bound.md` 3.3) | lô 1 đợt 3, chạy cùng `cmb-balance` |
| 3a | `gear-chest` (kiểm thử) | `tests/features/inventory.js`, `DESIGN_RULES.md` | không đụng mã |
| 3b | `eco-currency-guard` | `core/player.js` (sau bound), các dòng `luong +=` | cùng file lõi với bound nên làm sau |
| 3b | `gear-smith-plus` | `modules/crafting` (mới), `items/crafting.js` (mới), `modules/smith` (`open/act`), `modules/gems` (`gemMerge`), `windows/{smith,crafting}.js`, `ui.js` | mở khung Thợ Rèn cho 3c |
| 3b | `eco-shop-tabs` | `modules/shop`, `items/shops.js`, `windows/shop.js`, `css/features.css` | |
| 3c | `gear-upgrade-transfer` → `gear-crafting` → `gear-refine` | cùng `modules/crafting`, `items/crafting.js`, `windows/crafting.js` | **tuần tự**, một agent một lúc |
| 3c | `eco-sell-bulk` | `modules/shop` (sau tabs), `modules/inventory`, `windows/shop.js`, `windows/inventory.js`, `ui/common.js` | sau `eco-shop-tabs` |
| 2-3 | `eco-consumables-199`, `gear-tier-199`, `eco-loot-tables` | dữ liệu `items/*`, `loot.js`, `foods.js`, `modules/inventory` | theo `content/40` (I1 → I2 → I3/I4) sau F1 của `content/00` |
| 4 | `gear-fame` | `modules/honor` (mới), `items/honor.js`, lõi 2 dòng, `windows/honor.js` | sau `eco-bound` |
| sau 0 | `gear-storage-plus` | `modules/storage`, `services/db`, `windows/storage.js` | sau `ops-persist-shard` |

Cổng và `DATA_DIR` riêng để chụp ảnh: giữ bảng của `PLAN.md` (bound 3621, crafting 3626); id mới của mục này: `eco-currency-guard` 3640, `eco-sell-bulk` 3641, `gear-fame` 3642, `gear-storage-plus` 3643, `gear-chest` 3644 (`DATA_DIR=/tmp/ns-<id>`). Tài khoản admin kiểm thử thêm vào **cuối** `ADMINS` trong `tests/lib/harness.js`: `craft1`, `sellb1`, `honor1`, `vault1`.

Giao worker opencode (CLAUDE.md): được giao các id có đặc tả kiểm bằng lệnh và không chứa logic chống nhân bản mới (`gear-chest`, `gear-tier-199`, `eco-consumables-199`, `eco-loot-tables`, `eco-shop-tabs`, `gear-refine`, `ui-bag-*` phần tài liệu/ảnh); Claude tự làm hoặc rà kỹ các id có luồng tiền/đồ mới (`eco-bound`, `eco-currency-guard`, `gear-smith-plus`, `gear-upgrade-transfer`, `gear-crafting`, `eco-sell-bulk`, `gear-fame`, `gear-storage-plus`).

---

## 15. Quyết định kiến trúc (ADR)

### ADR-05b-1 — Phân bổ lại thao tác Thợ Rèn so với `specs/crafting.md`

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, áp dụng khi làm `gear-smith-plus` |
| Bối cảnh | `specs/crafting.md` (đã duyệt) đặt 4 thao tác (ghép đá, tách đồ, chuyển cấp, tẩy luyện) dưới một tab "Chế tác" 4 nút con, dùng `confirm()`, máy khách tự tính lại số Tinh Thiết. Sau khi đặc tả viết: `NOTE.md` của chủ dự án yêu cầu "tách cường hóa" (khác "tách đồ" phá món), `CLAUDE.md` cấm `confirm()` (đã có `ask()`), và danh mục tách id `gear-smith-plus` / `gear-upgrade-transfer` / `gear-crafting` / `gear-refine`. |
| Quyết định | (1) Ghép đá vào tab "Ghép" (cùng kiểu 3 → 1 với ngọc, `[data-mgkind]`); Tách cường hóa và Chuyển cấp là chế độ của tab "Cường hóa" (`[data-upmode]`); tab "Chế tác" chỉ còn Rèn đúc, Rã đồ, Tẩy luyện (`[data-crtab]`). (2) "Tách đồ" của đặc tả đổi tên "Rã đồ"; "Tách cường hóa" là thao tác mới (giữ món). (3) Mọi xác nhận dùng `ask()`. (4) Máy khách chỉ đọc `S.G.craft`. (5) Tên gói giữ tiền tố `craft*` của đặc tả, thêm `craftSplit`, `craftForge`. |
| Phương án khác | (a) Làm đúng đặc tả: 6 nút con trong 1 tab, chật trên điện thoại 844 px, người chơi tìm "ghép đá" ở tab ngọc; (b) cửa sổ Thợ Rèn thứ hai: thêm một tên cửa sổ, tách luồng NPC, không đáng. |
| Chi phí | sửa `windows/smith.js` nhiều hơn đặc tả (2 hàng chế độ con), cập nhật `DESIGN_RULES.md` mục 8 đoạn Thợ Rèn; kiểm thử E2E có selector mới. |
| Hệ quả | Mỗi tab có tối đa 3 chế độ con, vừa một hàng trên điện thoại; các id ở mục 5 vẫn chung `modules/crafting` nên làm tuần tự. |

### ADR-05b-2 — Rương Gia Bảo lưu ở bản ghi tài khoản

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, chỉ làm sau `ops-persist-shard` |
| Bối cảnh | Dữ liệu chung tài khoản phải nằm ngoài bản ghi nhân vật. Hiện `db` ghi 4 file rời, không có giao dịch giữa file (R-06): sập giữa hai lần ghi có thể làm món vừa chuyển nằm ở cả hai nơi hoặc biến mất. |
| Quyết định | `acc.vault` trong bản ghi tài khoản; chỉ món `canTransfer` và xu thường; món mang `vid`; tải nhân vật bỏ bản trùng `vid` với Gia Bảo; tính năng chỉ bật khi lưu trữ có số thế hệ chung cho các file (mục vận hành ADR-R-1). |
| Phương án khác | (a) Bỏ Gia Bảo, chỉ làm kho mở rộng: an toàn nhất, mất "cất xu" và chuyển đồ giữa nhân vật; (b) lưu Gia Bảo như một bản ghi nhân vật đặc biệt trong file nhân vật: cùng file nên ghi nguyên tử, nhưng mọi chỗ duyệt danh sách nhân vật (xếp hạng, thư, gia tộc) phải bỏ qua bản ghi lạ. |
| Chi phí | phụ thuộc `ops-persist-shard`; thêm ca kiểm thử tải lại. |
| Hệ quả | Mức C: nếu `ops-persist-shard` trễ thì chỉ phát hành phần kho mở rộng. |

### ADR-05b-3 — Chỉ số mới `pvpRes` (kháng sát thương người chơi)

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, làm cùng `gear-fame` |
| Bối cảnh | Đồ danh vọng cần bản sắc PvP mà không thành đồ PvE mạnh hơn (P3: PvE thắng bằng tay nghề và trang bị cày). Chỉ số hiện có đều dùng cả PvE. |
| Quyết định | Thêm khóa `pvpRes` vào bảng `eq` của `recalc()`, `s.pvpRes = min(30, eq.pvpRes)`, một dòng nhân ở `damagePlayer` khi `src.player`. Chỉ trang sức Vinh Danh có chỉ số này ở 1.0. Không thêm chỉ số tấn công PvP (tránh khuyến khích săn người). |
| Phương án khác | (a) Đồ danh vọng chỉ có chỉ số thường cao hơn 10%: đơn giản nhưng người PvE cũng đi cày lôi đài để mạnh lên PvE; (b) thêm ô trang bị riêng "Chiến Ấn": cần sửa `SLOTS`, lưới ô quanh nhân vật (đã kín 4 hàng × 2 cột), lớn hơn nhiều. |
| Chi phí | 2 dòng ở vùng "Lõi server" (`player.js`, `combat.js`), nhãn mới, cân bằng lại số sát thương PvP trong `tools/balance.js` (thêm hồ sơ có/không trang sức). |
| Hệ quả | Mọi chỗ đánh người chơi đi qua `damagePlayer` nên lôi đài, chiến trường, chiến gia tộc tự áp dụng. Thêm nguồn `pvpRes` khác sau này phải giữ trần 30%. |

### ADR-05b-4 — Đá hoàn lại luôn khóa

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, bổ sung `specs/bound.md` (không đổi R7) |
| Bối cảnh | R7 của `bound.md` chủ ý cho cường hóa món thường bằng đá khóa mà món vẫn thường. `specs/crafting.md` hoàn 30% đá khi phá món, `gear-smith-plus` hoàn 50% khi tách. Ghép hai luật: dùng đá khóa (quà điểm danh, gói lượng) cường hóa món thường rồi tách → nhận đá **thường**, bán lên chợ. |
| Quyết định | Mọi viên đá do hệ thống hoàn lại (tách cường hóa, rã đồ) đều khóa, bất kể món nguồn. Món vẫn theo R7. |
| Phương án khác | (a) Ghi trên món số đá khóa đã đổ (`it.pb`): chính xác hơn nhưng thêm trường phải giữ qua giao dịch, kho, chợ, chuyển cấp; (b) bỏ hoàn đá: mất ý nghĩa của "tách cường hóa" trong `NOTE.md`. |
| Chi phí | 1 tham số `b = 1` ở 2 chỗ cộng đá; người chơi không bán được đá hoàn lại (chấp nhận: đá hoàn là để dùng tiếp). |
| Hệ quả | Không có đường đổi đá khóa → đá thường; nguồn đá thường trên chợ chỉ còn rơi và ghép đá từ đá thường. |

---

## 16. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | "Tách cường hóa" trong `NOTE.md` là giữ món (về +0, hoàn đá) hay phá món lấy nguyên liệu? | Làm cả hai: "Tách cường hóa" giữ món, hoàn 50% đá danh nghĩa (khóa) (`gear-smith-plus`); "Rã đồ" phá món lấy Tinh Thiết + 30% đá (`gear-crafting`). |
| Q2 | Tỉ lệ hoàn đá khi tách 50% có quá hào phóng? | Giữ 50% danh nghĩa: chỉ bằng 3-28% số đá thực tiêu (mục 1.2), đá hoàn khóa nên không ra chợ. Xem lại sau 4 tuần dữ liệu `ops-audit-log`. |
| Q3 | Có cho chuyển cấp giữa hai ô khác nhau (vũ khí → áo)? | Không: chỉ cùng ô; khác ô thì dùng tách cường hóa. |
| Q4 | Rèn đúc có ra Huyền thoại? | Không: 40/35/20/5 (Thường → Sử thi). Huyền thoại chỉ từ boss, rương, Thần binh. |
| Q5 | Ghép đá có cần giới hạn lượt mỗi ngày để giữ giá Đá Thần rơi? | Không giới hạn: giá kỳ vọng 169.569 xu/Đá Thần đã gấp 2,1 lần giá danh nghĩa; theo dõi lượng xu hút ở `ops-audit-log`. |
| Q6 | Lượng có trần không? | Có, 2 tỉ như xu (`eco-currency-guard`), chủ yếu chặn dữ liệu hỏng. |
| Q7 | Mua lại món vừa bán có giữ qua đăng xuất? | Không: chỉ trong phiên, 10 món gần nhất, không lưu (tránh thêm dữ liệu nhân vật). |
| Q8 | Rương Gia Bảo có nhận đồ khóa và xu khóa? | Không: chỉ món `canTransfer` và xu thường, để quà nhiệm vụ của nhân vật phụ không dồn về nhân vật chính. |
| Q9 | Trang sức Vinh Danh có lỗ ngọc, có cường hóa bằng đá? | Không cả hai; sức mạnh đến từ Vinh Giai (danh vọng). |
| Q10 | Có thêm ô trang bị riêng cho đồ danh vọng? | Không ở 1.0 (ADR-05b-3 phương án b); dùng 3 ô trang sức có sẵn. |
| Q11 | Có thưởng bộ khi mặc đủ 9 món cùng bậc? | Không ở 1.0: bậc đổi mỗi 10 cấp nên bộ đủ 9 món hiếm khi có, và thêm một nguồn chỉ số cần cân bằng lại; xét lại cho Thần binh vùng sau 1.0. |
| Q12 | Rương Báu cũ có chuyển sang bảng `LOOT`? | Có, khi `eco-loot-tables` vào, giữ nguyên tỉ lệ; trước đó tỉ lệ ghi trong `DESIGN_RULES.md` và chi tiết vật phẩm. |
| Q13 | Cường hóa +17 ~ +20 cho hậu kỳ? | Không ở 1.0 (`content/00-foundation.md` 3.4); nếu làm cần đặc tả riêng vì đụng chuỗi đá của ghép đá, tách, rã. |
| Q14 | Kho mở rộng có bán bằng xu thay lượng? | Lượng (30/60/100/150), như mở rộng túi; mức C nên có thể bỏ nếu `eco-economy-model` thấy lượng hút quá nhiều. |

---

## 17. Tham chiếu

| Tài liệu | Dùng cho |
|---|---|
| `specs/bound.md` | `eco-bound` (mục 4), luật khóa ở mọi mục khác |
| `specs/crafting.md` | `gear-smith-plus`, `gear-upgrade-transfer`, `gear-crafting`, `gear-refine` (mục 5, có chỉnh theo ADR-05b-1, ADR-05b-4) |
| `specs/PLAN.md` | quy ước gộp G1-G12, lô, cổng chụp ảnh |
| `specs/battlefield.md` | danh vọng, cửa hàng danh vọng (`gear-fame` dùng chung `c.arena.fame`) |
| `content/00-foundation.md` mục 3 | `gear-tier-199` |
| `content/40-items-shops.md` | `gear-tier-199` (Thần binh), `eco-consumables-199`, `eco-loot-tables`, `eco-shop-tabs` |
| `NOTE.md` | yêu cầu Thợ Rèn (`gear-smith-plus`) |
| `scratchpad/gddwork/lab/m05/*` | số đo mục 1.2, 5, 11 |
| `docs/gdd/01-tam-nhin.md` | trụ cột, MoSCoW, quy ước id |
