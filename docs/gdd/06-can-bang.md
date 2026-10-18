# GDD 06 — Cân bằng 1-199

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 6: cân bằng toàn dải cấp 1-199 (đường EXP, chỉ số quái/boss/Tà Thú/Hung Tinh, bậc trang bị, hồ sơ người chơi trung bình, thời gian hạ, đóng góp sức mạnh, PvP, dòng tiền) và bộ công cụ đo |
| Ngày | 18/10/2026 |
| Id phụ trách (7) | `cmb-balance`, `dev-balance-tool`, `core-levelcap-199`, `cmb-balance-upper`, `eco-economy-model`, `dev-sim-tools`, `cmb-pvp-balance` |
| Nguồn đã đọc | mã `src/` ở thư mục làm việc ngày 18/10/2026 (`shared/formulas.js`, `shared/constants.js`, `shared/data/{monsters,quests,extras,classes,skills}.js`, `shared/data/items/{equipment,consumables,gems}.js`, `server/core/{combat,player}.js`, `server/modules/{smith,dungeon,quest,events,inventory,movement}`), `DESIGN_RULES.md` mục 9; đặc tả `specs/{balance,crafting,meridian,dailies,bound,market}.md`; nội dung `content/{PLAN,00-foundation,30-quests,40-items-shops,50-worldboss-events}.md`; GDD 01-05 |
| Số đo riêng | `scratchpad/gddwork/lab/sim/`: `lib.js` (mô hình dùng chung, gọi `Player.recalc` và `Combat.calc` thật), `sim-exp.js`, `sim-combat.js`, `sim-economy.js`, `boss-cap.js`, `pvp-scan.js`, `pvp-post.js`, `quests-design.js`, `tier-slots.js`; kết quả thô `exp-now.md`, `exp-design.md`, `exp-design-B.md`, `combat-now.md`, `combat-design.md`, `econ-now.md`, `econ-design.md`, `boss-cap.out`, `pvp-scan.out`, `pvp-post.out` |
| Quy ước | "**Đo trên mã**" = chạy với `SIM_MODE=now`, dữ liệu và công thức đúng như thư mục làm việc hôm nay (cấp tối đa 120, 12 bậc trang bị, quái công `8 + 5L`, boss HP ×45). "**Mô hình thiết kế**" = `SIM_MODE=design`: cùng mã thật nhưng vá trong bộ nhớ đúng theo đặc tả đã chốt (`specs/balance.md` mục 2-5, `content/00-foundation.md` mục 2-5: cấp 199, bậc 12-19 với `hT`, 30 kỹ năng hậu kỳ, công thức quái/boss mới). Số thiết kế chưa có trong mã; chúng là **đích** cho các id `todo` |

Quy tắc đọc: chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 12. Đặc tả nằm ngoài repo (thư mục `scratchpad/` của phiên thiết kế), ghi dạng "đặc tả chi tiết: `specs/<file>` mục x" hoặc "`content/<file>` mục x". Tên quái, boss, vật phẩm đều tự đặt; game khác chỉ được nhắc chung là "game tham khảo".

---

## 0. Tóm tắt

| Id | Tên | Trụ cột | Mức | Trạng thái | Giai đoạn | Cỡ | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|
| `cmb-balance` | Cân bằng boss, Tà Thú, quái theo người chơi trung bình (cấp 1-120) | P3, P5 | Must | todo | 1 | M | mục 3, 5, 6; `specs/balance.md` |
| `dev-balance-tool` | `tools/balance.js` + khối "Cân bằng" trong `npm run check` | P5 | Must | todo | 1 | M | mục 11.1; `specs/balance.md` mục 6 |
| `core-levelcap-199` | Cấp tối đa 199 có trần theo vùng đã phát hành, đường EXP mới (giữ nguyên ≤ 120), mở 20 bậc trang bị | P5 | Must | todo | 2 | M | mục 2; `content/00-foundation.md` mục 2 |
| `cmb-balance-upper` | Cân bằng 121-199: quái/boss, bậc 12-19, thời gian hạ; bản vá ADR-06-2 và tiêu chí `sim-exp` (chuyển từ `core-levelcap-199` khi ghép) | P3, P5 | Must | todo | 3 (dời từ 2 khi ghép, xem ROADMAP) | M | mục 3-7; `content/00-foundation.md` mục 3-4 |
| `eco-economy-model` | Mô hình kinh tế: nguồn/hút xu, lượng, trần lượng mỗi ngày | P5 | Must | todo | 3 | M | mục 9, 10; ADR-06-3 |
| `dev-sim-tools` | `tools/sim-exp.js`, `tools/sim-combat.js`, `tools/sim-economy.js` | P5 | Must (nâng khi ghép) | todo | 3 | S | mục 11.2 |
| `cmb-pvp-balance` | Cân bằng PvP giữa 6 phái | P3, P4 | Should | todo | 4 | S | mục 8; ADR-06-1 |

Năm điều GDD này chốt:

1. **Cân bằng đo bằng công cụ, không bằng cảm giác.** Mọi con số trong tài liệu ra từ `Player.recalc()` và `Combat.calc()` thật. `tools/balance.js` (`dev-balance-tool`) là cửa chặn trong `npm run check` cho quái/boss/Tà Thú; ba công cụ `tools/sim-*.js` (`dev-sim-tools`) là báo cáo chạy tay có cờ `--check` (mục 11).
2. **Giữ nguyên đường EXP của `content/00-foundation.md`** (`expScale = 1 + max(0, L−120)²/2000`), nhưng chặn ba chỗ làm hậu kỳ trôi quá nhanh: thưởng EXP việc ngày không nhân `expScale` và không nhân Bí Kíp, trần hệ số nhân EXP quái ×3 (ADR-06-2; đi ngược dòng `dailies` của `PLAN.md` GĐ2 nên cần người điều phối duyệt, mục 1.3 N5, Câu hỏi mở Q9). Đo được: người chơi Trung bình (2 giờ/ngày) đi 120 → 199 trong 23,4 giờ chơi / 12 ngày thay vì 10,5 giờ / 5 ngày.
3. **Hai boss hậu kỳ phải hạ hệ số chiêu**: mô hình cho thấy chiêu ×2,0 ở cấp 195 lấy 48,7% và chiêu ×1,9 ở cấp 199 lấy 47,6% sinh lực Cung, vượt trần 47%. Luật mới: boss cấp ≥ 193 và boss có cấp tận cùng 7-9 trong dải 140-199 dùng chiêu mạnh nhất ≤ ×1,85 (mục 6.3).
4. **PvP đổi công thức** (ADR-06-1): hệ số PvP nhân **sau** khi trừ thủ, `k = 0,06`, kèm hệ số theo phái. Thời gian hạ trung vị từ 2,5-3,6 giây (đo trên mã) lên khoảng 15-21 giây, cặp lệch nhất từ 2,6-2,9 lần xuống ≤ 1,6 lần.
5. **Hai răng cưa kinh tế lớn nhất**: bán Đá Cường Hóa Thần rơi từ quái (20.000 xu/viên, 42 viên/ngày) chiếm 21-43% xu vào ở cấp 90-199; và nguồn lượng của người đứng đầu sự kiện lên tới khoảng 485 lượng/ngày. Xử lý: giá bán NPC của đá còn 5%, quái ≥ 90 rơi Đá Cao 75% / Đá Thần 25%, trần 60 lượng/ngày từ hoạt động lặp lại (ADR-06-3).

**Về câu hỏi của người dùng ("chưa có tính năng ghép đá cường hoá hoặc chuyển cường hoá nhỉ")**: đúng, mã hiện tại chưa có. Hai tính năng này thuộc `gear-smith-plus` (Ghép đá, Tách cường hóa) và `gear-upgrade-transfer` (Chuyển cấp) do `docs/gdd/05-he-thong-trang-bi.md` mục 5.1-5.2 phụ trách, giai đoạn 3. Tài liệu này chỉ đo tác động kinh tế của chúng (mục 9.4): ghép đá là đường **duy nhất** có Đá Trung/Cao/Thần ngoài rơi đồ, với giá trị quy đổi 2.850 / 22.392 / 169.569 xu mỗi viên; chuyển cấp rẻ hơn cường hóa lại từ đầu 40-68% xu (cấp 60-199). Cả hai là bồn hút xu lớn nhất hậu kỳ và không tạo vòng sinh lời.

---

## 1. Phương pháp đo

### 1.1 Mô hình dùng chung (`lab/sim/lib.js`)

| Thành phần | Cách làm |
|---|---|
| Người chơi | `makePlayer(cls, L, opt)` dựng nhân vật bằng `newChar` + `Player.recalc()` thật trong thế giới giả (như `specs/balance.md` mục 6). `opt`: `plus`, `gems`, `fashion`, `pet`, `passive`, `mer` (tầng kinh mạch) |
| Kinh mạch | bọc `hooks.call('stats')` để cộng chỉ số Kinh Mạch theo `specs/meridian.md` (chưa có trong mã); mặc định **tắt** trong hồ sơ trung bình (phụ lục `specs/balance.md`) |
| Sát thương | `Combat.calc(att, tgt, mul, isSkill)` thật; DPS = trung bình đòn thường + chuỗi kỹ năng theo hồi chiêu, nhân `UPTIME = 0,6` (thời gian thực sự đứng đánh) |
| Quái, boss | `baseStats(L)` + `BOSS_MUL` (mã) hoặc công thức thiết kế (mục 3) |
| Chế độ | `SIM_MODE=now` (đo trên mã) / `SIM_MODE=design` (vá trong bộ nhớ, không sửa file repo) |
| Biến thể EXP | `DS=0` thưởng việc ngày không nhân `expScale`; `RM=0` thưởng việc ngày không nhân Bí Kíp; `STACK=0` trần ×3 cho EXP quái; `EXPDIV` (mặc định 2000) |

Kiểm chứng mô hình: chế độ `now` ra đúng số đã công bố trong `specs/balance.md` mục 3.1/3.4 (sinh lực Kiếm cấp 120 = 14.658; Vua Slime đánh thường 6,1%, chiêu 11,2%, solo 1,1 phút). Chế độ `design` ra đúng `specs/balance.md` mục 5.1 (Tuyết Quái Vương 1.345.200 HP, Long Vương 5.068.500 HP).

### 1.2 Lệnh chạy bản nháp

```bash
cd scratchpad/gddwork/lab/sim
SIM_MODE=now node sim-combat.js > combat-now.md
SIM_MODE=design node sim-combat.js > combat-design.md
DS=0 RM=0 STACK=0 SIM_MODE=design node sim-exp.js > exp-design-B.md
SIM_MODE=design node sim-economy.js > econ-design.md     # tự đặt DS=0 RM=0 STACK=0
node boss-cap.js; node pvp-scan.js; node pvp-post.js
```

### 1.3 Mâu thuẫn nguồn đã phát hiện

| # | Nguồn | Mâu thuẫn | Xử lý trong tài liệu này |
|---|---|---|---|
| N1 | `content/00-foundation.md` bảng 4.2 | Đo khi kỹ năng nội tại `c15` còn là `hpPct` (bản giữ chỗ trong `model/cap199.js`); bản chốt `c15 = resist` nên sinh lực Cung thấp hơn khoảng 13% (cấp 190: 26.702 so với 30.696 trong bảng) | Dùng số đo lại (mục 5). Phần trăm sát thương boss lên Cung tính trên số mới, vì thế hai boss cấp 195/199 vượt trần (mục 6.3) |
| N2 | `content/00-foundation.md` mục 2 | Ghi "khoảng 45-60 giờ chơi cho 120 → 199"; mô hình với đúng các nguồn EXP đã đặc tả cho 10,5 giờ (Trung bình) vì thưởng việc ngày nhân `expScale` | ADR-06-2 đưa lên 23,4 giờ; khoảng 45-60 giờ chỉ đạt khi dốc `expScale` (Câu hỏi mở Q1) |
| N3 | `content/20-monsters.md` | `boss_tc_ngocho` (cấp 195) có `nova(150, 2.0)` "Thái Âm Bạo"; `boss_tc_maton` (cấp 199) có `pillar(5, 1.9)`: vượt trần 47% của `specs/balance.md` | Đổi thành `quake(150, 1.8)` và `pillar(5, 1.85)` (mục 6.3), làm trong `cmb-balance-upper` |
| N4 | `specs/balance.md` hồ sơ trung bình | Hồ sơ cường hóa/ngọc ở cấp 150-199 đắt gấp 20-32 lần số xu người chơi Trung bình kiếm được tới cấp đó (mục 9.5) | Giữ hồ sơ làm chuẩn "đã ổn định ở dải" (nguồn cao hơn); thêm hồ sơ "chỉ trang bị" làm biên an toàn (mục 5.2) và Câu hỏi mở Q3 |
| N5 | `content/PLAN.md` mục 3 GĐ2 luồng A (dòng `dailies`: "`errandReward` × `expScale`") và `content/00-foundation.md` mục 2 (`DAILY.reward` nhân `expScale`) | Nguồn ưu tiên cao nhất chốt nhân `expScale` cho việc ngày; mô hình cho thấy cách đó đưa người chơi TB qua 120 → 199 trong 10,5 giờ, trái chính mục tiêu "45-60 giờ" của `00-foundation` | GDD đề xuất ngược lại bằng **ADR-06-2** (cần người điều phối duyệt vì đi ngược PLAN). Thứ tự làm: lô `dailies` và F1 vẫn làm **đúng PLAN**; ADR-06-2 là một bản vá riêng 4 dòng trong `cmb-balance-upper` (GĐ3, chuyển từ `core-levelcap-199` khi ghép), áp sau khi duyệt (Câu hỏi mở Q9) |
| N6 | `content/00-foundation.md` mục 7.2 (nhiệm vụ diệt boss vùng hệ số 1,0) và `content/30-quests.md` (khối mã dùng 0,6) | `lab/sim/quests-design.js` nạp nguyên khối mã của `30-quests` nên mọi số EXP của mục 2 tính với `<prefix>_q7` hệ số 0,6; GDD 08 mục 0.3 ý 1 chốt 1,0 theo thứ tự ưu tiên PLAN (00 > 30) | Giữ số mục 2 (0,6) làm số chuẩn đã công bố; đo lại với 1,0 (`lab/soat678/sim`, biến `Q7=1`, phương án B): TB 120 → 199 **21,8 giờ / 11 ngày** (thay vì 23,4 / 12), Nhẹ 25,0 giờ / 49 ngày, Cày 19,2 giờ / 4 ngày; luyện quái thấp nhất 22,6% (dải 190-199), nhiệm vụ chính 26,9-37,7% mỗi dải. Phương án A với 1,0: TB 9,8 giờ / 5 ngày. Bản nháp mục 2 **chưa tính** 40 kỳ duyên và Lệnh Truy Nã của GDD 08 (`08-phu-luc-nhiem-vu.md` mục C, D); thêm cả hai (`lab/soat678/sim/sim-exp2.js`, biến `KD=1 TN=1`, truy nã 4 phút/lệnh, 21 quái/lệnh, không nhân Bí Kíp), phương án B: hệ số 1,0 cho TB **19,9 giờ / 10 ngày**, luyện quái dải 190-199 còn **15,6%** (dưới tiêu chí 20 giờ và 20%); hệ số 0,6 cho TB **21,3 giờ / 11 ngày**, luyện quái thấp nhất 21,6% (đạt). Quyết định: dữ liệu giữ 1,0 theo thứ tự ưu tiên PLAN; `tools/sim-exp.js` bắt buộc tính kỳ duyên và truy nã (mục 11.2); nếu công cụ thật xác nhận lệch dải thì hạ `<prefix>_q7` về 0,6 (Câu hỏi mở Q10) |

---

## 2. Cấp 199 và đường EXP (`core-levelcap-199`, P5)

**Mục đích.** Mở trần cấp 120 → 199 mà không đổi một số nào ở cấp ≤ 120, để người chơi cũ không thấy thanh EXP đổi nghĩa; hậu kỳ chậm dần nhưng một buổi chơi vẫn thấy tiến độ.

**Luồng người chơi.** Không có màn hình mới. Thanh `#bar-exp` vẫn hiện `% cấp`. Ở cấp 120 lên 121 người chơi nhận thông báo "Đã mở cấp 121-199" (gói `levelUp` có sẵn). Cửa sổ Nhân Vật hiện "EXP cần" theo công thức mới.

**Quy tắc, công thức** (chi tiết: `content/00-foundation.md` mục 2):

```js
// src/shared/formulas.js
const EXP_HI = { from: 120, div: 2000 };
const expScale = (lv) => 1 + Math.max(0, lv - EXP_HI.from) ** 2 / EXP_HI.div;
const expBase = (lv) => Math.floor(20 * lv * lv + 80 * lv);      // thú cưng dùng
const expNeed = (lv) => Math.floor((20 * lv * lv + 80 * lv) * expScale(lv));
```

| Nguồn EXP | Công thức | Nhân `expScale`? | Nhân Bí Kíp (×2)? | Ghi chú |
|---|---|---|---|---|
| Quái thường | `10 + 8L`; người hạ ×1,1; nhóm `1 + 0,12(n−1)`; Giờ Vàng ×2 | không | có | trần tổng hệ số ×3 (ADR-06-2) |
| Boss, Tà Thú, Hung Tinh | `(10 + 8L) × mul × expScale(L)` | có | có | boss `mul` 60, Tà Thú 150, Hung Tinh 100 |
| Nhiệm vụ chính | `expNeed(req) · F` | có (qua `expNeed`) | không (đã chia ngược `/expMul`) | 51 cũ + 73 mới |
| Tiểu Nhị (`DAILY`) | `(10 + 8L)(12 + 0,3L)` | **không** từ cấp 121 (ADR-06-2) | **không** (ADR-06-2) | `content/00-foundation.md` mục 2 và `PLAN.md` GĐ2 ghi có nhân: ADR-06-2 đề xuất bỏ (N5) |
| Việc Làng | `(10 + 8L)(15 + 0,4L)·m·chuỗi` | **không** (ADR-06-2) | **không** | `specs/dailies.md` |
| Hang động | `0,22 · expNeed(L)` | có (qua `expNeed`) | **không** (ADR-06-2) | 3 lượt/ngày |

Bảng đường EXP (thuần công thức, giống nhau ở mọi biến thể):

| Cấp | expScale | EXP cần | EXP 1 quái | Số quái/cấp | Phút/cấp (12 quái/phút) | Giờ cộng dồn từ cấp 1 |
|---|---|---|---|---|---|---|
| 1 | 1,000 | 100 | 18 | 5 | 0 | 0 |
| 10 | 1,000 | 2.800 | 90 | 28 | 2 | 0,2 |
| 20 | 1,000 | 9.600 | 170 | 51 | 4 | 0,7 |
| 30 | 1,000 | 20.400 | 250 | 74 | 6 | 1,6 |
| 40 | 1,000 | 35.200 | 330 | 97 | 8 | 2,8 |
| 50 | 1,000 | 54.000 | 410 | 120 | 10 | 4,3 |
| 60 | 1,000 | 76.800 | 490 | 142 | 12 | 6,1 |
| 70 | 1,000 | 103.600 | 570 | 165 | 14 | 8,2 |
| 80 | 1,000 | 134.400 | 650 | 188 | 16 | 10,6 |
| 90 | 1,000 | 169.200 | 730 | 211 | 18 | 13,4 |
| 100 | 1,000 | 208.000 | 810 | 233 | 19 | 16,4 |
| 110 | 1,000 | 250.800 | 890 | 256 | 21 | 19,8 |
| 120 | 1,000 | 297.600 | 970 | 279 | 23 | 23,5 |
| 130 | 1,050 | 365.820 | 1.050 | 317 | 26 | 27,6 |
| 140 | 1,200 | 483.840 | 1.130 | 389 | 32 | 32,4 |
| 150 | 1,450 | 669.900 | 1.210 | 503 | 42 | 38,5 |
| 160 | 1,800 | 944.640 | 1.290 | 666 | 55 | 46,4 |
| 170 | 2,250 | 1.331.100 | 1.370 | 883 | 74 | 57,0 |
| 180 | 2,800 | 1.854.719 | 1.450 | 1.163 | 97 | 70,9 |
| 190 | 3,450 | 2.543.340 | 1.530 | 1.511 | 126 | 89,1 |
| 198 | 4,042 | 3.233.276 | 1.594 | 1.844 | 154 | 107,5 |

Tổng luyện thuần 1 → 199: **110,1 giờ** (1 → 120: 23,5 giờ; 120 → 199: 86,6 giờ), khớp `content/00-foundation.md`. Đây là số đo trên công thức, không phụ thuộc mô hình người chơi.

**Thời gian theo hồ sơ chơi** (mô hình, `sim-exp.js`; mỗi ngày một ngân sách phút, hoạt động có trần xếp theo EXP/phút, phần còn lại luyện quái 12 con/phút):

| Hồ sơ | Mô tả |
|---|---|
| Thuần | 24 giờ/ngày luyện quái, không bổ trợ, không nhiệm vụ (chuẩn so sánh) |
| Nhẹ | 30 phút/ngày, không bổ trợ, có việc ngày và nhiệm vụ |
| Trung bình (TB) | 2 giờ/ngày, 1 giờ trong Giờ Vàng, Bí Kíp 1 giờ |
| Cày | 6 giờ/ngày, nhóm 3, Bí Kíp cả ngày, 3 giờ Giờ Vàng |

| Phương án | TB 1 → 120 | TB 120 → 199 | Cày 120 → 199 | Nhẹ 120 → 199 |
|---|---|---|---|---|
| A: như `00-foundation` viết (việc ngày nhân `expScale` và Bí Kíp, hệ số quái tới ×4) | 7,1 h / 4 ngày | 10,5 h / 5 ngày | 10,8 h / 2 ngày | 15,7 h / 31 ngày |
| A + chỉ bỏ `expScale` ở việc ngày (`DS=0`) | | 17,4 h / 9 ngày | | |
| **B: ADR-06-2** (`DS=0 RM=0 STACK=0`) | **8,9 h / 5 ngày** | **23,4 h / 12 ngày** | **20,5 h / 4 ngày** | **26,6 h / 52 ngày** |
| B + `EXPDIV = 1200` | 8,9 h / 5 ngày | 29,4 h / 15 ngày | 27,0 h / 5 ngày | 29,1 h / 57 ngày |
| B + `EXPDIV = 1000` | 8,9 h / 5 ngày | 31,8 h / 16 ngày | 30,3 h / 6 ngày | 30,2 h / 59 ngày |
| B + `EXPDIV = 600` | 8,9 h / 5 ngày | 41,5 h / 21 ngày | 42,4 h / 8 ngày | 32,6 h / 64 ngày |

Phương án B, theo dải (giờ chơi / ngày lịch):

| Dải | Nhẹ | Trung bình | Cày |
|---|---|---|---|
| 120-129 | 1,9 h / 4 | 1,5 h / 1 | 0,8 h / 1 |
| 130-139 | 2,1 h / 4 | 1,6 h / 0 | 1,7 h / 0 |
| 140-149 | 2,4 h / 5 | 1,7 h / 1 | 1,5 h / 0 |
| 150-159 | 3,2 h / 6 | 2,5 h / 2 | 2,0 h / 0 |
| 160-169 | 4,0 h / 8 | 2,9 h / 1 | 2,6 h / 1 |
| 170-179 | 4,4 h / 8 | 3,9 h / 2 | 3,4 h / 0 |
| 180-189 | 4,6 h / 9 | 4,6 h / 2 | 4,3 h / 1 |
| 190-199 | 4,0 h / 8 | 4,7 h / 3 | 4,3 h / 1 |
| **1-199** | **38,1 h / 75** | **32,3 h / 17** | **26,5 h / 5** |

Nguồn EXP theo dải (B, hồ sơ TB):

| Dải | Quái | Tiểu Nhị | Việc Làng | Hang | Nhiệm vụ chính |
|---|---|---|---|---|---|
| 60-69 | 41,5% | 22,4% | 0,0% | 0,0% | 36,0% |
| 90-99 | 36,3% | 15,6% | 34,7% | 0,0% | 13,4% |
| 120-129 | 33,1% | 18,4% | 25,8% | 0,0% | 22,7% |
| 150-159 | 34,2% | 21,4% | 20,5% | 0,0% | 24,0% |
| 180-189 | 28,0% | 20,2% | 7,9% | 19,1% | 24,8% |
| 190-199 | 23,3% | 17,4% | 10,7% | 16,3% | 32,3% |

Ở phương án A, luyện quái chỉ còn 6% EXP dải 190-199 (việc ngày chiếm gần hết), tức người chơi "điểm danh việc ngày rồi thoát". Phương án B giữ luyện quái 23-38% và nhiệm vụ chính khoảng 25%, đúng ý "đi cảnh có tay nghề" (P3).

Phiên 10 phút luyện quái (% một cấp): cấp 120 được 43,0% (Bí Kíp 86,0%, Bí Kíp + Giờ Vàng 172,1% ở phương án A; trần ×3 ở B là 129%); cấp 180 được 10,3%; cấp 198 được 6,5% (trần ×3: 19,5%). Một lượt Tiểu Nhị ở cấp 198 cho 3,5% cấp (A: 14,2%).

**Dữ liệu.** `src/shared/constants.js` `MAX_LEVEL = 199`; `src/shared/formulas.js` như trên; `DAILY.reward` (`quests.js`) bỏ hệ số `expScale` trong `content/00-foundation.md` mục 2 (ADR-06-2); `errandReward` (`specs/dailies.md`) tương tự; trần nhân EXP: `src/server/core/combat.js` `shareExp` tính `mul = min(3, expEvent × expMul)`.

**Gói `{ t }`.** Không có gói mới. `me.exp`, `me.lv` trong `selfData` giữ nguyên; máy khách đọc `expNeed` qua `S.G` (gói `data` gửi `MAX_LEVEL` và tham số `EXP_HI`).

**Module, cửa sổ, id DOM.** `core/player.js` (`gainExp`), `core/combat.js` (`shareExp`), `modules/quest` (`finishDaily`), `modules/dungeon`; máy khách `#bar-exp`, `windows/character.js`. Không đổi id DOM.

**Bố cục điện thoại.** Không đổi. Chữ "Lv 199" trong `#st-lv` phải vừa khung 844×390 (đã có chỗ cho 3 chữ số).

**Chống gian lận.** EXP chỉ cộng ở server; `expMul` lấy từ buff server; trần ×3 kiểm ở server; thưởng việc ngày tính theo cấp lúc **nhận** nhiệm vụ (không theo lúc trả) để không "nhận ở cấp thấp, trả ở cấp cao" hay ngược lại.

**Tiêu chí chấp nhận.**

1. `expNeed(L)` với L = 1..120 trùng từng số với `20L² + 80L`; `expNeed(198) = 3.233.276`; cấp 199 là trần (`gainExp` không cộng EXP khi `lv === 199`, giống cấp 120 hôm nay).
2. `sim-exp --check` (mô hình B): luyện thuần 1 → 199 trong 105-115 giờ; TB 120 → 199 trong 20-30 giờ chơi và 10-16 ngày lịch; Cày 120 → 199 ≥ 4 ngày lịch; ở mọi dải ≥ 120 luyện quái chiếm ≥ 20% EXP của hồ sơ TB.
3. Một lượt Tiểu Nhị ở cấp ≥ 121 cho ≤ 16% một cấp; hệ số nhân EXP quái thực tế ≤ 3.
4. Thú cưng vẫn dùng `expBase` (cấp thú 50 cần đúng như cũ).
5. Nhân vật cấp 120 cũ (dữ liệu JSON có `exp` > 0) nạp lại vẫn cùng `exp`, lên 121 khi đủ `expNeed(120)`.

Phân chia khi ghép sổ tính năng: tiêu chí 2, 3 cùng phần `DAILY.reward`, `errandReward`, `shareExp` ở mục Dữ liệu thuộc `cmb-balance-upper` (GĐ3, sau `quest-dailies` và `dev-sim-tools`); `core-levelcap-199` giữ tiêu chí 1, 4, 5, thêm trần cấp `LEVEL_CAP` theo vùng đã phát hành (07 mục 12) và việc mở 20 bậc trang bị trong `items/base.js`.

**Kiểm thử.** `tests/features/levelcap.js` (mới): đơn vị `expNeed` 1..199, `shareExp` trần ×3 (Giờ Vàng + Bí Kíp), `DAILY.reward(150)` không nhân Bí Kíp; bot: `/lv 120` → giết quái cấp 120 đến lúc lên 121, `me.lv === 121`. `npm test`, `npm run check`, `node tools/sim-exp.js --check`.

---

## 3. Công thức chỉ số quái, boss, Tà Thú, Hung Tinh (`cmb-balance`, `cmb-balance-upper`, P3, P5)

**Mục đích.** Một bộ công thức theo cấp cho mọi loại địch để mỗi dải cấp có cảm giác giống nhau: quái thường chết sau vài đòn và gây áp lực vừa đủ, boss là trận đánh vài phút, sự kiện cần đông người.

**Luồng người chơi.** Không có màn hình mới; người chơi thấy quái "đánh đau" hơn (đúng trong dải 1,5-7% sinh lực/đòn) và boss sống lâu hơn (2-6 phút solo thay vì 1 phút).

**Quy tắc, công thức** (chi tiết: `specs/balance.md` mục 2-5; `content/00-foundation.md` mục 4; `content/50-worldboss-events.md` mục 3-4):

| Loại | Đo trên mã | Thiết kế |
|---|---|---|
| Quái thường cấp L: HP | `40 + 2L² + 20L` | giữ |
| Quái thường: công | `8 + 5L` | `round(8 + 6L + 0,12L²)` |
| Quái thường: thủ | `1,5L` | giữ |
| Quái thường: EXP | `10 + 8L` | giữ |
| Boss (`BOSS_MUL`) | HP ×45, công ×2,2, thủ ×1,6, EXP ×40 | HP ×150, công ×1,5, thủ ×1,6, EXP ×60 × `expScale` |
| Tà Thú (`event: true`) | HP ×80, EXP ×60 | HP `eventHpMul(n) = 300 + 120n` theo số người tham gia n (1..20), công ×1,5, EXP ×150 × `expScale` |
| Hung Tinh (boss thế giới, `pve-worldboss`) | chưa có | HP `wbHpMul(n) = 400 + 150n` (n ≤ 25), công ×1,5, EXP ×100 × `expScale`; 9 dải cấp 25-188, 5 khung giờ/ngày |
| Chiêu boss | `quake` ×1,3-1,8, `beam` ×1,4-2, `nova` ×2-2,6, `roar` ×0,5-0,7 | giữ dải, thêm trần 47% sinh lực Cung trung bình (mục 6.3) |

`baseStats(L)` trong `src/shared/data/monsters.js` là chỗ duy nhất tính chỉ số theo cấp; boss/Tà Thú/Hung Tinh nhân hệ số trên kết quả đó. `eventHpMul(n)` tính lại HP khi số người trong vùng đổi (đã đặc tả ở `specs/balance.md` mục 4).

**Dữ liệu.** `src/shared/data/monsters.js` (`baseStats`, `BOSS_MUL`, `eventHpMul`, `BOSS_SKILLS`), `src/shared/data/worldboss.js` (`wbHpMul`), `DESIGN_RULES.md` mục 9 cập nhật hàng "Quái thường", "Boss", "Tà Thú".

**Gói `{ t }`.** Không có gói mới; `mob { hp, maxHp }` có sẵn.

**Module.** `core/monster.js`, `core/combat.js` (không đổi công thức sát thương PvE), `modules/events`.

**Bố cục điện thoại, id DOM.** Không đổi. Thanh máu boss `#hud-target` hiện số lớn (đến 32 triệu) dạng rút gọn "31,9 tr" (đã có hàm định dạng).

**Chống gian lận.** Chỉ số quái chỉ ở server; HP Tà Thú tính theo số người **đã gây sát thương trong 20 giây gần nhất** chứ không theo số người đứng trong bản đồ, để không gọi người treo máy vào làm HP tăng/giảm có lợi.

**Tiêu chí chấp nhận.** Xem mục 6 (dải đạt cho từng loại); `npm run check` khối "Cân bằng" không có dòng lỗi.

**Kiểm thử.** `tests/features/balance.js` (mới, `specs/balance.md` mục 7): đơn vị `baseStats(60)`, `BOSS_MUL`, `eventHpMul(1..20)`; gọi `tools/balance.js` và kiểm từng dải.

---

## 4. Bậc trang bị 0-19 (`cmb-balance-upper`, P5)

Chi tiết: `content/00-foundation.md` mục 3. Công thức giữ `W(t) = 8 + 6t² + 14t` (công vũ khí), `A(t) = 5 + 3t² + 8t` (thủ áo), giá `100·(t+1)^2,2·mul`. Chỉ đổi **dòng sinh lực** từ bậc 12: `hT(t) = t ≤ 11 ? t : 2t − 11` (bậc 0-11 giữ nguyên từng số). Bậc theo cấp: `t = min(19, ⌊L/10⌋)`.

Bảng (mô hình thiết kế, +0, độ hiếm Thường; phí cường hóa theo `UPGRADE.cost(p, t) = (p+1)²·400·(t+1)`):

| t | Tên bậc | Cấp | Công vũ khí | Thủ áo | Sinh lực áo | Sinh lực dây chuyền | Giá vũ khí (xu) | Phí lần +9 → +10 | Phí lần +15 → +16 |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Gỗ | 1 | 8 | 5 | 20 | 30 | 150 | 40.000 | 102.400 |
| 1 | Đồng | 10 | 28 | 16 | 60 | 90 | 689 | 80.000 | 204.800 |
| 2 | Sắt | 20 | 60 | 33 | 100 | 150 | 1.682 | 120.000 | 307.200 |
| 3 | Bạc | 30 | 104 | 56 | 140 | 210 | 3.167 | 160.000 | 409.600 |
| 4 | Vàng | 40 | 160 | 85 | 180 | 270 | 5.174 | 200.000 | 512.000 |
| 5 | Ngọc | 50 | 228 | 120 | 220 | 330 | 7.727 | 240.000 | 614.400 |
| 6 | Huyền | 60 | 308 | 161 | 260 | 390 | 10.847 | 280.000 | 716.800 |
| 7 | Long | 70 | 400 | 208 | 300 | 450 | 14.551 | 320.000 | 819.200 |
| 8 | Thiên | 80 | 504 | 261 | 340 | 510 | 18.855 | 360.000 | 921.600 |
| 9 | Thần | 90 | 620 | 320 | 380 | 570 | 23.773 | 400.000 | 1.024.000 |
| 10 | Tiên | 100 | 748 | 385 | 420 | 630 | 29.319 | 440.000 | 1.126.400 |
| 11 | Thánh | 110 | 888 | 456 | 460 | 690 | 35.505 | 480.000 | 1.228.800 |
| 12 | Phượng | 120 | 1.040 | 533 | 540 | 810 | 42.342 | 520.000 | 1.331.200 |
| 13 | Kỳ Lân | 130 | 1.204 | 616 | 620 | 930 | 49.839 | 560.000 | 1.433.600 |
| 14 | Nhật Nguyệt | 140 | 1.380 | 705 | 700 | 1.050 | 58.009 | 600.000 | 1.536.000 |
| 15 | Tinh Hà | 150 | 1.568 | 800 | 780 | 1.170 | 66.858 | 640.000 | 1.638.400 |
| 16 | Hỗn Nguyên | 160 | 1.768 | 901 | 860 | 1.290 | 76.397 | 680.000 | 1.740.800 |
| 17 | Thái Cực | 170 | 1.980 | 1.008 | 940 | 1.410 | 86.634 | 720.000 | 1.843.200 |
| 18 | Vô Cực | 180 | 2.204 | 1.121 | 1.020 | 1.530 | 97.577 | 760.000 | 1.945.600 |
| 19 | Chí Tôn | 190 | 2.440 | 1.240 | 1.100 | 1.650 | 109.234 | 800.000 | 2.048.000 |

Ghi chú: bậc 0-11 là số **đo trên mã**; bậc 12-19 là mô hình thiết kế (`content/00-foundation.md` mục 3.2, cùng số). Cấp 191-199 dùng chung bậc 19 (răng cưa R5, mục 10).

**Chỉ số đủ 9 ô** (+0, độ hiếm Thường; `lab/sim/tier-slots.js` dựng từ công thức `build()` của `src/shared/data/items/equipment.js`, bậc 0-11 so khớp từng số với `ITEMS` thật: 0 lệch; bậc 12-19 thay `t` của dòng `hp` bằng `hT(t)`, dòng `mp`, né, tốc, chí mạng giữ `t`). Vũ khí của 6 phái cùng chỉ số; cột Σ cộng cả bộ 9 món:

| t | Vũ khí: công | Nón: thủ / HP | Áo: thủ / HP | Găng: công / thủ | Quần: thủ / HP | Giày: thủ / né % / tốc | Dây chuyền: HP / MP | Nhẫn: công / CM % | Ngọc bội: HP / MP / thủ | Σ công | Σ thủ | Σ HP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 8 | 2 / 10 | 5 / 20 | 2 / 1 | 3 / 10 | 2 / 1 / 2 | 30 / 10 | 2 / 1 | 20 / 20 / 1 | 12 | 14 | 90 |
| 1 | 28 | 6 / 30 | 16 / 60 | 7 / 3 | 10 / 35 | 5 / 1,5 / 3 | 90 / 30 | 8 / 1,5 | 50 / 50 / 3 | 43 | 43 | 265 |
| 2 | 60 | 13 / 50 | 33 / 100 | 15 / 7 | 20 / 60 | 10 / 2 / 4 | 150 / 50 | 18 / 2 | 80 / 80 / 7 | 93 | 90 | 440 |
| 3 | 104 | 22 / 70 | 56 / 140 | 26 / 11 | 34 / 85 | 17 / 2,5 / 5 | 210 / 70 | 31 / 2,5 | 110 / 110 / 11 | 161 | 151 | 615 |
| 4 | 160 | 34 / 90 | 85 / 180 | 40 / 17 | 51 / 110 | 26 / 3 / 6 | 270 / 90 | 48 / 3 | 140 / 140 / 17 | 248 | 230 | 790 |
| 5 | 228 | 48 / 110 | 120 / 220 | 57 / 24 | 72 / 135 | 36 / 3,5 / 7 | 330 / 110 | 68 / 3,5 | 170 / 170 / 24 | 353 | 324 | 965 |
| 6 | 308 | 64 / 130 | 161 / 260 | 77 / 32 | 97 / 160 | 48 / 4 / 8 | 390 / 130 | 92 / 4 | 200 / 200 / 32 | 477 | 434 | 1.140 |
| 7 | 400 | 83 / 150 | 208 / 300 | 100 / 42 | 125 / 185 | 62 / 4,5 / 9 | 450 / 150 | 120 / 4,5 | 230 / 230 / 42 | 620 | 562 | 1.315 |
| 8 | 504 | 104 / 170 | 261 / 340 | 126 / 52 | 157 / 210 | 78 / 5 / 10 | 510 / 170 | 151 / 5 | 260 / 260 / 52 | 781 | 704 | 1.490 |
| 9 | 620 | 128 / 190 | 320 / 380 | 155 / 64 | 192 / 235 | 96 / 5,5 / 11 | 570 / 190 | 186 / 5,5 | 290 / 290 / 64 | 961 | 864 | 1.665 |
| 10 | 748 | 154 / 210 | 385 / 420 | 187 / 77 | 231 / 260 | 116 / 6 / 12 | 630 / 210 | 224 / 6 | 320 / 320 / 77 | 1.159 | 1.040 | 1.840 |
| 11 | 888 | 182 / 230 | 456 / 460 | 222 / 91 | 274 / 285 | 137 / 6,5 / 13 | 690 / 230 | 266 / 6,5 | 350 / 350 / 91 | 1.376 | 1.231 | 2.015 |
| 12 | 1.040 | 213 / 270 | 533 / 540 | 260 / 107 | 320 / 335 | 160 / 7 / 14 | 810 / 250 | 312 / 7 | 410 / 380 / 107 | 1.612 | 1.440 | 2.365 |
| 13 | 1.204 | 246 / 310 | 616 / 620 | 301 / 123 | 370 / 385 | 185 / 7,5 / 15 | 930 / 270 | 361 / 7,5 | 470 / 410 / 123 | 1.866 | 1.663 | 2.715 |
| 14 | 1.380 | 282 / 350 | 705 / 700 | 345 / 141 | 423 / 435 | 212 / 8 / 16 | 1.050 / 290 | 414 / 8 | 530 / 440 / 141 | 2.139 | 1.904 | 3.065 |
| 15 | 1.568 | 320 / 390 | 800 / 780 | 392 / 160 | 480 / 485 | 240 / 8,5 / 17 | 1.170 / 310 | 470 / 8,5 | 590 / 470 / 160 | 2.430 | 2.160 | 3.415 |
| 16 | 1.768 | 360 / 430 | 901 / 860 | 442 / 180 | 541 / 535 | 270 / 9 / 18 | 1.290 / 330 | 530 / 9 | 650 / 500 / 180 | 2.740 | 2.432 | 3.765 |
| 17 | 1.980 | 403 / 470 | 1.008 / 940 | 495 / 202 | 605 / 585 | 302 / 9,5 / 19 | 1.410 / 350 | 594 / 9,5 | 710 / 530 / 202 | 3.069 | 2.722 | 4.115 |
| 18 | 2.204 | 448 / 510 | 1.121 / 1.020 | 551 / 224 | 673 / 635 | 336 / 10 / 20 | 1.530 / 370 | 661 / 10 | 770 / 560 / 224 | 3.416 | 3.026 | 4.465 |
| 19 | 2.440 | 496 / 550 | 1.240 / 1.100 | 610 / 248 | 744 / 685 | 372 / 10,5 / 21 | 1.650 / 390 | 732 / 10,5 | 830 / 590 / 248 | 3.782 | 3.348 | 4.815 |

Cách đọc cho cân bằng:

| Đại lượng | Bậc 11 → 19 | Ghi chú |
|---|---|---|
| Σ công trang bị | 1.376 → 3.782 (×2,75) | theo `W(t)` bình phương, không đổi công thức |
| Σ thủ trang bị | 1.231 → 3.348 (×2,72) | theo `A(t)` |
| Σ HP trang bị | 2.015 → 4.815 (×2,39) | nhờ `hT`; nếu giữ `t` thì chỉ 3.415 (×1,69): Cung cấp 199 mất 1.400 HP gốc, khoảng 2.860 sau +13 (11% của 26.864), ước tính chiêu boss ×1,85 lên khoảng 52% HP, vượt trần 47% |
| Cường hóa | mỗi cấp +8% chỉ số gốc của món (`UPGRADE.bonus`): +10 = ×1,80, +13 = ×2,04, +16 = ×2,28 | nhân trên cột trên, không nhân dòng phụ và ngọc |
| Né, tốc, chí mạng | tuyến tính theo `t` (giày né 10,5%, nhẫn CM 10,5% ở bậc 19) | giữ tuyến tính để không chạm trần né/CM sớm |

---

## 5. Hồ sơ người chơi trung bình (`cmb-balance`, `cmb-balance-upper`)

### 5.1 Định nghĩa

Phụ lục điều phối của `specs/balance.md` (nguồn cao hơn GDD) định nghĩa "người chơi trung bình cấp L" là người **đã ổn định ở dải**:

| Thành phần | Công thức |
|---|---|
| Bậc trang bị | `min(19, ⌊L/10⌋)`, 9 ô, độ hiếm Thường |
| Cường hóa | `min(L ≤ 120 ? 10 : 13, round(2 + L/15))` |
| Ngọc | cấp `max(1, min(L ≤ 120 ? 5 : 8, 1 + ⌊L/25⌋))`, đủ lỗ theo bậc, theo `GEM_PLAN` (công/sinh lực/thủ/chí mạng) |
| Tiềm năng | `5(L−1)` điểm: 50% sức, 20% nhanh nhẹn, 30% thể lực |
| Thời trang, thú cưỡi | 4 món theo mốc cấp 1/20/40 (`fashionOf`) |
| Thú cưng | `petOf(L)`, cấp `round(0,4L)` (trần 50) |
| Nội tại | mọi nội tại của phái, cấp `⌊(L − req)/3⌋ + 1` (trần 15) |
| Kinh mạch | **không tính** (tùy chọn; đo riêng ở mục 7) |

### 5.2 Kết quả (mô hình thiết kế; cấp ≤ 120 trùng đo trên mã trừ cấp 100-120 có kỹ năng hậu kỳ k11)

| Cấp | Bậc | +cường | Ngọc | HP Kiếm | Công Kiếm | Thủ Kiếm | Chí mạng % | HP Cung | DPS Kiếm | HP "chỉ trang bị" | DPS "chỉ trang bị" |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | 1 | +3 | 1 | 1.606 | 188 | 85 | 12,1 | 1.559 | 690 | 775 | 501 |
| 30 | 3 | +4 | 2 | 3.154 | 647 | 382 | 16,2 | 2.816 | 3.134 | 1.895 | 2.022 |
| 60 | 6 | +6 | 3 | 6.254 | 1.726 | 921 | 29,2 | 5.252 | 12.624 | 3.723 | 6.755 |
| 90 | 9 | +8 | 4 | 10.634 | 3.094 | 1.893 | 33,7 | 8.979 | 27.814 | 5.721 | 14.038 |
| 120 | 12 | +10 | 5 | 15.409 | 5.088 | 3.275 | 43,0 | 13.052 | 53.428 | 8.160 | 26.391 |
| 150 | 15 | +12 | 7 | 23.546 | 8.431 | 5.601 | 54,3 | 20.151 | 95.617 | 10.884 | 41.952 |
| 160 | 16 | +13 | 7 | 24.937 | 9.548 | 6.677 | 57,5 | 21.365 | 110.540 | 11.967 | 49.078 |
| 180 | 18 | +13 | 8 | 29.988 | 11.803 | 8.973 | 60,0 | 25.772 | 138.860 | 13.587 | 61.099 |
| 199 | 19 | +13 | 8 | 31.240 | 12.751 | 9.776 | 60,0 | 26.864 | 149.994 | 14.553 | 68.518 |

Đo trên mã ở cấp 120 (bậc 11, chưa có k11): HP Kiếm 14.658, công 4.515, thủ 2.900, HP Cung 12.397, DPS 44.067.

"Chỉ trang bị" = cường hóa thấp hơn hồ sơ 3 cấp, không ngọc, không thời trang/thú/nội tại (hàm `low` của `specs/balance.md`): biên an toàn cho người mới lên dải. Theo mục 9.5, người chơi TB lúc **vừa** đạt cấp L thường chỉ mua nổi +4 đến +6 và ngọc cấp 3-5, tức nằm giữa hai cột này.

---

## 6. Mục tiêu thời gian hạ (TTK) và dải đạt

### 6.1 Bảng mục tiêu

| Đối tượng | Chỉ số | Dải đạt | Nguồn |
|---|---|---|---|
| Quái thường cùng cấp | đòn quái / HP Kiếm hồ sơ | 1,5-7% | `specs/balance.md` |
| | đòn quái / HP Cung "chỉ trang bị" | ≤ 16% | mới (GDD này) |
| | số đòn thường Kiếm để hạ | 2-8,5 | `specs/balance.md` |
| | giây hạ bằng DPS Kiếm | 0,4-1,2 | mới: giữ nhịp 12-17 quái/phút |
| Boss thường | đánh thường / HP Kiếm | 4-18% | `specs/balance.md` |
| | chiêu mạnh nhất / HP Cung | ≤ 47% | `specs/balance.md` |
| | solo (hiệu suất 60%) | 2-6 phút | `specs/balance.md` |
| | nhóm 5 | ≥ 25 giây | mới: boss không "bốc hơi" |
| Tà Thú | 1 người | ≤ 15 phút | `specs/balance.md` |
| | 10 người | ≥ 2 phút | `specs/balance.md` |
| Hung Tinh | 1 người | ≤ 15 phút | mới |
| | 10 người | 3-6 phút | mới |
| | 25 người | ≥ 2,5 phút | mới |
| PvP (mục 8) | thời gian hạ trung vị 36 cặp phái | 12-25 giây ở cấp 60-199 | mới (ADR-06-1) |

### 6.2 Quái thường cùng cấp

| Cấp | HP quái | Công quái (mã → thiết kế) | Đòn / HP Kiếm (mã → thiết kế) | Đòn / HP Cung "chỉ trang bị" (thiết kế) | Đòn thường Kiếm để hạ | Giây hạ (DPS Kiếm) |
|---|---|---|---|---|---|---|
| 10 | 440 | 58 → 80 | 0,4% → 1,8% | 5,7% | 2,3 | 0,6 |
| 30 | 2.440 | 158 → 296 | 0,6% → 2,2% | 9,4% | 3,6 | 0,8 |
| 60 | 8.440 | 308 → 800 | 0,6% → 4,0% | 11,9% | 4,1 | 0,7 |
| 90 | 18.040 | 458 → 1.520 | 0,5% → 3,7% | 13,1% | 4,5 | 0,6 |
| 120 | 31.240 | 608 → 2.456 | 0,5% → 3,2% | 12,9% | 4,4 | 0,6 |
| 150 | 48.040 | → 3.608 | → 1,9% | 12,0% | 3,8 | 0,5 |
| 180 | 68.440 | → 4.976 | → 2,0% | 12,0% | 3,7 | 0,5 |
| 199 | 83.222 | → 5.954 | → 2,3% | 15,6% | 4,2 | 0,6 |

Kết luận: **trên mã hôm nay quái thường chỉ gây 0,4-0,7% sinh lực mỗi đòn**, dưới dải 1,5% (không có áp lực, tự động đánh treo máy vô hạn). Thiết kế đưa về 1,8-4,0%, hạ trong 2,3-4,5 đòn. DPS lý thuyết cho 16-17 quái/phút (kể 3 giây di chuyển); mô hình EXP dùng 12 quái/phút cho an toàn.

### 6.3 Boss thường

| Boss | Cấp | HP (mã → thiết kế) | Đánh thường / HP Kiếm (thiết kế) | Chiêu mạnh nhất / HP Cung (thiết kế) | Solo phút (mã → thiết kế) | Nhóm 5 (giây) |
|---|---|---|---|---|---|---|
| Vua Slime | 12 | 25.560 → 85.200 | 5,9% | ×1,5: 10,9% | 1,1 → 3,6 | 43 |
| Dơi Chúa | 28 | 97.560 → 325.200 | 9,3% | ×0,6: 4,3% | 1,3 → 4,4 | 53 |
| Lang Vương | 42 | 198.360 → 661.200 | 10,9% | ×1,7: 27,9% | 0,9 → 3,1 | 38 |
| Tuyết Quái Vương | 62 | 403.560 → 1.345.200 | 11,8% | ×1,8: 34,3% | 0,9 → 3,0 | 36 |
| Quỷ Vương | 85 | 728.550 → 2.428.500 | 11,6% | ×1,9: 37,2% | 0,9 → 2,9 | 35 |
| Ma Thần | 100 | 991.800 → 3.306.000 | 10,0% | ×2,2: 42,7% | 0,8 → 2,5 | 30 |
| Thiên Ma | 112 | 1.231.560 → 4.105.200 | 12,1% | ×2,0: 43,4% | 0,9 → 2,7 | 33 |
| Long Vương | 125 | 1.520.550 → 5.068.500 | 11,3% | ×1,8: 35,8% | 1,0 → 2,5 | 30 |
| Boss mẫu 145 | 145 | → 6.748.500 | 12,3% | ×2,0: 46,0% | → 2,5 | 30 |
| Boss mẫu 165 | 165 | → 8.668.500 | 9,8% | ×2,0: 45,3% | → 2,3 | 28 |
| Boss mẫu 185 | 185 | → 10.828.500 | 8,6% | ×2,0: 45,8% | → 2,3 | 28 |
| **Boss mẫu 195** | 195 | → 11.998.500 | 9,4% | **×2,0: 48,7%** | → 2,4 | 29 |
| **Boss mẫu 199** | 199 | → 12.483.300 | 10,4% | **×1,9: 47,6%** | → 2,5 | 30 |

Đo trên mã: boss chết trong 0,8-1,3 phút solo, chiêu mạnh nhất chỉ lấy 9,6-20% sinh lực (vì HP ×45 và công cấp thấp). Thiết kế đưa về 2,3-4,4 phút solo, 27-53 giây nhóm 5.

**Hệ số chiêu tối đa để ≤ 47% sinh lực Cung** (`boss-cap.out`): sinh lực Cung tăng theo bậc trang bị (mỗi 10 cấp) còn công boss tăng mỗi cấp, nên các cấp **tận cùng 7-9** của mỗi dải là chỗ hẹp nhất:

| Cấp boss | 100 | 119 | 124 | 147 | 149 | 168 | 169 | 174 | 188 | 189 | 193 | 195 | 197 | 199 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hệ số tối đa | 2,37 | 1,98 | 2,00 | 1,99 | 1,94 | 1,99 | 1,97 | 1,98 | 1,98 | 1,97 | 1,98 | 1,95 | 1,92 | 1,88 |

Luật mới (thêm vào `npm run check` qua `tools/balance.js`): mọi boss kiểm từng chiêu theo đúng cấp của nó; **quy ước thiết kế** để khỏi chạy thử từng con: boss cấp ≥ 193 và boss cấp tận cùng 7-9 trong dải 140-199 dùng chiêu mạnh nhất ≤ ×1,85. Sửa hai boss trong `content/20-monsters.md`: `boss_tc_ngocho` (195) `nova(150, 2.0)` → `quake(150, 1.8)` (giữ tên "Thái Âm Bạo", đổi hình cảnh báo thành vòng đất); `boss_tc_maton` (199) `pillar(5, 1.9)` → `pillar(5, 1.85)`.

### 6.4 Tà Thú (phút để hạ theo n người đủ cấp)

| Tà Thú | Cấp | HP 1 người (thiết kế) | Chiêu mạnh nhất / HP Cung | n=1 | n=3 | n=5 | n=10 | n=20 |
|---|---|---|---|---|---|---|---|---|
| Hắc Viêm Tà Thú | 32 | 1.145.760 | ×1,8: 23,7% | 10,2 | 5,4 | 4,4 | 3,7 | 3,3 |
| Băng Phách Tà Thú | 60 | 3.544.800 | ×1,8: 32,6% | 8,2 | 4,3 | 3,5 | 2,9 | 2,6 |
| Huyết Nguyệt Tà Thú | 95 | 8.395.800 | ×2,0: 44,7% | 8,7 | 4,5 | 3,7 | 3,1 | 2,8 |
| Hắc Thủy Tà Giao | 130 | 15.304.800 | ×1,8: 34,7% | 6,7 | 3,5 | 2,9 | 2,4 | 2,1 |
| Tuyết Ma Tà Hồ | 160 | 22.864.800 | ×1,8: 36,1% | 6,2 | 3,2 | 2,7 | 2,2 | 2,0 |
| Diêm La Tà Quân | 190 | 31.936.800 | ×1,8: 39,2% | 6,4 | 3,4 | 2,8 | 2,3 | 2,1 |

Đo trên mã (HP ×80 cố định): 1,6-2 phút với 1 người, 0,2 phút với 10 người: Tà Thú bị "bốc hơi", hạng sát thương quyết định bởi ai đánh đòn đầu. Thiết kế đạt cả hai dải.

### 6.5 Hung Tinh Giáng Thế (mô hình thiết kế, `content/50-worldboss-events.md` mục 3-4)

| Dải | HP n=1 | HP n=10 | n=1 (phút) | n=5 | n=10 | n=25 | Đánh thường / HP Kiếm |
|---|---|---|---|---|---|---|---|
| 25 | 984.500 | 3.401.000 | 14,5 | 6,0 | 5,0 | 4,4 | 7,9% |
| 65 | 5.384.500 | 18.601.000 | 11,7 | 4,9 | 4,1 | 3,5 | 13,1% |
| 108 | 14.040.400 | 48.503.200 | 10,4 | 4,4 | 3,6 | 3,1 | 12,6% |
| 148 | 25.744.400 | 88.935.200 | 9,3 | 3,9 | 3,2 | 2,8 | 13,2% |
| 188 | 40.968.400 | 141.527.200 | 8,9 | 3,7 | 3,1 | 2,7 | 9,4% |

Đạt dải ở mọi dải cấp (1 người 8,8-14,5 phút; 10 người 3,0-5,0; 25 người 2,7-4,4).

### 6.6 Tiêu chí chấp nhận và kiểm thử (`cmb-balance` cho cấp 1-120, `cmb-balance-upper` cho 121-199)

1. `node tools/balance.js --check` thoát mã 0 và `npm run check` không có dòng lỗi khối "Cân bằng" với **mọi** quái/boss/Tà Thú trong `MONSTERS` (không chỉ quái mẫu).
2. Quái thường: 1,5-7% HP Kiếm hồ sơ, ≤ 16% HP Cung "chỉ trang bị", hạ trong 2-8,5 đòn thường.
3. Boss thường: đánh thường 4-18% HP Kiếm; từng chiêu ≤ 47% HP Cung **ở đúng cấp boss**; solo 2-6 phút; nhóm 5 ≥ 25 giây.
4. Tà Thú: n=1 ≤ 15 phút, n=10 ≥ 2 phút. Hung Tinh: n=1 ≤ 15, n=10 trong 3-6, n=25 ≥ 2,5 phút.
5. `tests/features/balance.js` gọi lại các hàm của `tools/balance.js` cho Vua Slime, Long Vương, ba Tà Thú cũ (đã có trong `specs/balance.md` mục 7) và thêm 3 boss mẫu 145/185/199.
6. `DESIGN_RULES.md` mục 9: hàng "Quái thường", "Boss", "Tà Thú" ghi công thức mới (quy tắc "Không phá cân bằng").

---

## 7. Đóng góp sức mạnh hậu kỳ

Sức mạnh = DPS lên boss cùng cấp × EHP (số đòn boss chịu được). Phần trăm đóng góp của một hệ thống = phần logarit nó thêm vào tổng (cộng các bước = 100%). Mô hình thiết kế, Kiếm:

| Cấp | Nền (+0, không ngọc) | Cường hóa | Ngọc | Thời trang + thú | Nội tại | Tổng so với nền | Kinh mạch (tùy chọn) thêm |
|---|---|---|---|---|---|---|---|
| 60 | ×1 | 32,4% | 33,3% | 19,5% | 14,8% | ×5,2 | 0% (chưa mở) |
| 120 | ×1 | 39,5% | 30,5% | 6,5% | 15,4% | ×9,9 | 8,1% (×12,1) |
| 160 | ×1 | 41,5% | 27,8% | 4,3% | 19,5% | ×22,1 | 6,9% (×27,8) |
| 199 | ×1 | 39,7% | 25,5% | 3,6% | 21,9% | ×23,4 | 9,3% (×32,3) |

Đo trên mã ở cấp 120: cường hóa 56%, ngọc 22% (chưa có nội tại hậu kỳ). Nhận xét:

- **Cường hóa là trục chính (40%)**, đúng vai trò bồn tiêu xu và đá lớn nhất; ngọc 26-31%; nội tại tăng dần nhờ nội tại hậu kỳ 120/150.
- **Thời trang + thú chỉ 4% hậu kỳ**: đúng ý `DESIGN_RULES.md` mục 9 (chỉ số nhỏ, không bắt buộc nạp).
- **Kinh mạch 7-9%** (×1,2-1,4 tổng): đủ để người chơi lâu năm thấy khác biệt, không đủ để chia đôi cộng đồng. Không đưa vào hồ sơ trung bình; quái/boss **không** được tinh chỉnh theo kinh mạch.

Tiêu chí chấp nhận (đo bằng `sim-combat --check`): ở cấp 120/160/199, cường hóa 30-50%, ngọc 20-35%, thời trang + thú ≤ 10%, kinh mạch ≤ 12% (bước tùy chọn).

---

## 8. PvP giữa 6 phái (`cmb-pvp-balance`, P3, P4)

**Mục đích.** Trận đấu người với người (lôi đài, PK, chiến trường, công thành) kéo đủ dài để kỹ năng và di chuyển có ý nghĩa, và không phái nào thắng chỉ nhờ con số.

**Luồng người chơi.** Không đổi: đăng ký lôi đài, PK ngoài vùng an toàn, thách đấu. Người chơi thấy sát thương lên người khác nhỏ hơn rõ (số đỏ nhỏ hơn) và trận kéo khoảng 15-20 giây.

**Hiện trạng đo trên mã.** `PVP_SCALE = 0,45` nhân vào hệ số chiêu **trước** khi trừ thủ (`core/combat.js` dòng 14, 274). Mô hình hồ sơ trung bình, thời gian hạ (giây) từ hàng tấn công lên cột phòng thủ, cấp 120:

| Tấn công \ Phòng thủ | Kiếm | Tiêu | Kunai | Cung | Đao | Quạt |
|---|---|---|---|---|---|---|
| Kiếm | 2,2 | 2,1 | 2,3 | 2,3 | 2,7 | 1,7 |
| Tiêu | 3,1 | 2,9 | 3,3 | 3,2 | 3,8 | 2,3 |
| Kunai | 2,9 | 3,8 | 3,2 | 3,1 | 3,7 | 3,2 |
| Cung | 2,1 | 2,8 | 2,3 | 2,3 | 2,7 | 2,4 |
| Đao | 2,8 | 2,6 | 3,0 | 2,0 | 2,5 | 2,2 |
| Quạt | 4,5 | 4,2 | 4,8 | 3,3 | 4,0 | 3,5 |

Trung vị 2,5-3,6 giây ở cấp 60-199; Kiếm hạ Quạt nhanh gấp 2,6-2,9 lần chiều ngược lại. Trận lôi đài 3 phút thực chất là "ai ra chiêu trước".

**Thử nghiệm** (`pvp-scan.out`, `pvp-post.out`):

| Cách | Hệ số | Trung vị cấp 60 / 120 / 199 (giây) | Cặp lệch nhất |
|---|---|---|---|
| Nhân trước khi trừ thủ (như mã) | 0,45 | 3,6 / 2,9 / 2,5 | 2,6-2,9 lần |
| | 0,20 | 12,7 / 8,8 / 8,2 | 3,4-3,9 lần |
| | 0,12 | 31,6 / 22,5 / (phi tuyến theo cấp) | 2,9-3,5 lần |
| Nhân **sau** khi trừ thủ | 0,10 | 12,5 / 10,0 / 8,7 | 2,2-2,5 lần |
| | 0,08 | 15,6 / 12,4 / 10,9 | 2,2-2,5 lần |
| | 0,08 + hệ số phái | 16,0 / 12,8 / 11,1 | **1,4-1,6 lần** |

Nhân trước khi trừ thủ làm thủ "nuốt" phần lớn đòn khi hệ số nhỏ, nên thời gian hạ dao động mạnh theo cấp và phái thủ cao (Đao) gần như bất tử. Nhân sau khi trừ thủ giữ tỉ lệ ổn định theo cấp.

**Quy tắc, công thức (ADR-06-1).**

```js
// core/combat.js, nhánh đánh người (canPvp đã qua)
const raw = this.calc(att, tgt, mul, isSkill);            // như PvE, chưa thu nhỏ
const dmg = Math.max(1, Math.round(raw * PVP.k * (CLASSES[att.cls].pvp || 1) * (1 - tgt.s.pvpRes / 100)));
```

| Tham số | Giá trị | Chỗ đặt |
|---|---|---|
| `PVP.k` | 0,06 (trung vị khoảng 15-21 giây ở cấp 60-199; cấp 30 khoảng 40 giây) | `src/shared/data/extras.js` `PVP = { k: 0.06 }` |
| Hệ số phái `pvp` | Kiếm 0,8 · Tiêu 1,05 · Kunai 1,0 · Cung 0,95 · Đao 0,9 · Quạt 1,3 | `src/shared/data/classes.js` |
| `pvpRes` | kháng sát thương người chơi, trần 30% (`gear-fame`, ADR-05b-3) | đã đặc tả ở GDD 05 |

Hút máu, chí mạng, hệ khắc, kháng hệ giữ như PvE (đã nằm trong `calc`). Lôi đài vẫn tắt mọi nguồn hồi máu (`CLAUDE.md`).

**Dữ liệu.** `extras.js` (`PVP`), `classes.js` (`pvp`), `DESIGN_RULES.md` mục 9 thêm hàng "PvP".

**Gói `{ t }`.** Không có gói mới; `hit` có sẵn. Gói `data` gửi `PVP` và `pvp` của phái để cửa sổ Nhân Vật hiện "Sát thương PvP ×0,8" khi xem phái.

**Module, cửa sổ.** `core/combat.js` (vùng Lõi server, 2-3 dòng ở nhánh người chơi), `windows/character.js` (một dòng chỉ số). Không đổi id DOM.

**Bố cục điện thoại.** Dòng "Sát thương PvP" nằm trong danh sách chỉ số cuộn của cửa sổ Nhân Vật, không thêm khung.

**Chống gian lận.** Hệ số chỉ ở server; client không gửi số sát thương. `canPvp` vẫn kiểm `p.match` trước luật khu an toàn (CLAUDE.md).

**Tiêu chí chấp nhận.**

1. `sim-combat --check --pvp`: ma trận 6 × 6 ở cấp 60/120/160/199 có trung vị 12-25 giây, ô nhỏ nhất ≥ 6 giây, tỉ lệ lệch cặp tệ nhất (A hạ B so với B hạ A) ≤ 1,6.
2. Đơn vị: hai nhân vật cấp 120 hồ sơ trung bình, cùng một đòn `calc` cố định ngẫu nhiên → sát thương PvP = `round(raw × 0,06 × pvp(phái))`.
3. Lôi đài: trận bot hai Kiếm cấp 60 hết 3 phút không kết thúc trong 10 giây đầu.

**Kiểm thử.** `tests/features/pvp.js` (mới): đơn vị công thức; bot hai người thách đấu (`features/social.js` có sẵn khung) đo số đòn để hạ; `npm run test:ui` (giao diện thách đấu không đổi).

---

## 9. Kinh tế: nguồn và hút xu, lượng (`eco-economy-model`, P5)

**Mục đích.** Biết xu và lượng đi vào, đi ra ở đâu, theo cấp; đặt trần để người chơi đứng đầu không in tiền, và để giá cường hóa/ngọc/kinh mạch hợp với số tiền người chơi thật kiếm được.

**Luồng người chơi.** Không có màn hình riêng. Người chơi thấy: (1) bán đá cho NPC rẻ hơn, nên giữ đá lại để cường hóa hoặc ghép; (2) khi đã nhận đủ 60 lượng trong ngày từ hoạt động lặp lại, phần thưởng lượng sau đó đổi thành xu khóa, có thông báo "Hôm nay đã nhận đủ 60 lượng, phần vượt đổi thành 5.000 xu khóa/lượng".

### 9.1 Giả định hồ sơ Trung bình mỗi ngày (`sim-economy.js`)

1.200 quái (2 giờ × 10 quái/phút thực), 20 lượt Tiểu Nhị, 10 Việc Làng, 3 lượt hang, 1 Tà Thú, 1 Hung Tinh, 1 Thủ Hộ Làng (hạng thường), 5 trận lôi đài (thắng một nửa), 25 bình sinh lực + 13 bình chakra, 5 lần Phu Xe, Bùa Bảo Hộ dùng từ +7. Rơi xu quái `randInt(2L+3, 5L+8)` (trung bình `3,5L + 5,5`); trang bị rơi 4,5% bán 25% (độ hiếm trung bình 0,54, hệ số giá 1,044); đá rơi 3,5% bán 25% giá.

### 9.2 Xu vào / ra mỗi ngày

Mô hình thiết kế (có Việc Làng, Hung Tinh, Thủ Hộ Làng, bình cấp 5-6):

| Nguồn / hút | 30 | 60 | 90 | 120 | 150 | 180 | 199 |
|---|---|---|---|---|---|---|---|
| + Quái rơi xu | 132.600 | 258.600 | 384.600 | 510.600 | 636.600 | 762.600 | 842.400 |
| + Bán trang bị rơi | 37.746 | 129.384 | 283.662 | 505.224 | 797.796 | 1.164.348 | 1.303.452 |
| + **Bán đá rơi** | 26.250 | 157.500 | **840.000** | **840.000** | **840.000** | **840.000** | **840.000** |
| + Tiểu Nhị | 40.000 | 76.000 | 112.000 | 148.000 | 184.000 | 220.000 | 242.800 |
| + Việc Làng (xu khóa) | 44.044 | 83.194 | 122.344 | 161.494 | 200.644 | 239.794 | 264.589 |
| + Hang động | 30.000 | 57.000 | 84.000 | 111.000 | 138.000 | 165.000 | 182.100 |
| + Rương Báu | 28.500 | 55.500 | 82.500 | 109.500 | 136.500 | 163.500 | 180.600 |
| + Tà Thú, Hung Tinh, Thủ Hộ Làng | 14.400 | 27.600 | 40.800 | 54.000 | 67.200 | 80.400 | 88.760 |
| + Lôi đài | 10.000 | 10.000 | 10.000 | 10.000 | 10.000 | 10.000 | 10.000 |
| + Điểm danh (xu khóa) | 2.571 | 2.571 | 2.571 | 2.571 | 2.571 | 2.571 | 2.571 |
| **Tổng vào** | **366.111** | **857.349** | **1.962.477** | **2.452.389** | **3.013.311** | **3.648.213** | **3.957.272** |
| − Bình thuốc | 12.160 | 38.000 | 38.000 | 95.000 | 95.000 | 228.000 | 228.000 |
| − Phu Xe | 1.500 | 1.500 | 1.500 | 1.500 | 1.500 | 1.500 | 1.500 |
| **Ròng (trước cường hóa, ngọc)** | **352.451** | **817.849** | **1.922.977** | **2.355.889** | **2.916.811** | **3.418.713** | **3.727.772** |
| Bán đá / tổng vào | 7,2% | 18,4% | **42,8%** | 34,3% | 27,9% | 23,0% | 21,2% |

Đo trên mã (không có Việc Làng, Hung Tinh, bình cấp 5-6), cấp 30/60/90/120: tổng vào 302.117 / 735.905 / 1.783.583 / 2.134.505; ròng 288.457 / 696.405 / 1.744.083 / 2.095.005; bán đá chiếm 8,7% / 21,4% / **47,1%** / 39,4%.

### 9.3 Lượng vào / ra mỗi ngày (hồ sơ TB)

| Nguồn / hút | Thiết kế | Đo trên mã |
|---|---|---|
| + Tiểu Nhị (1 lượng/lượt) | 20 | 20 |
| + Việc Làng (mốc 10) | 5 | 0 |
| + Rương Báu (7% × 5,5) | 3,9 | 2,7 |
| + Điểm danh (15 lượng/7 ngày) | 2,1 | 2,1 |
| + Tà Thú / Hung Tinh / Thủ Hộ Làng (hạng thường) | 3 | 1 |
| − Bí Kíp 1 giờ (trừ Bí Kíp từ rương) | 3,5 | 5,5 |
| − Thẻ Hồi Sinh | 1 | 1 |
| **Ròng** | **29,5** | **19,4** |

Người đứng đầu mọi hoạt động có thể nhận lý thuyết khoảng **485 lượng/ngày**: Tà Thú 12 lần × hạng 1 30 lượng = 360, Hung Tinh khoảng 83 (5 khung giờ), Thủ Hộ Làng 20, Tiểu Nhị 20, điểm danh. Gấp khoảng 16 lần người TB và gấp 2-3 lần nguồn lượng miễn phí đã định trong `content/40-items-shops.md` mục 8 (khoảng 25 lượng/ngày). Đây là răng cưa R2 (mục 10), xử lý bằng ADR-06-3.

### 9.4 Chi phí cường hóa, ngọc, kinh mạch; giá trị đá (liên quan ghép đá và chuyển cấp)

Chi phí kỳ vọng cường hóa **một món** từ +0 (xích Markov trên `UPGRADE` thật: thất bại từ +4 tụt 1 cấp, dùng Bùa Bảo Hộ từ +7 thì không tụt):

| Bậc | +10: xu | +10: đá Sơ / Trung / Cao / Thần | +10: Bùa | +13: xu | +13: Đá Thần | +16: xu | +16: Đá Thần | +16: Bùa |
|---|---|---|---|---|---|---|---|---|
| 5 | 2.633.991 | 16,4 / 25,5 / 10 / 0 | 8,8 | 9.493.991 | 8,3 | 39.080.658 | 180,6 | 80,7 |
| 11 | 5.267.982 | 16,4 / 25,5 / 10 / 0 | 8,8 | 18.987.982 | 8,3 | 78.161.315 | 180,6 | 80,7 |
| 15 | 7.023.976 | 16,4 / 25,5 / 10 / 0 | 8,8 | 25.317.309 | 8,3 | 104.215.087 | 180,6 | 80,7 |
| 19 | 8.779.970 | 16,4 / 25,5 / 10 / 0 | 8,8 | 31.646.637 | 8,3 | 130.268.859 | 180,6 | 80,7 |

(GDD 05 mục 1.2 giả định người chơi dùng Bùa từ +10, ra 86 Bùa và 181 Đá Thần cho +16: cùng bậc độ lớn.)

Giá trị một viên đá (ghép 3 → 1 theo `specs/crafting.md`: tỉ lệ 80/65/50%, phí 1.500/8.000/40.000 xu, thất bại mất 1 trả 2):

| Đá | Giá Lò Rèn | Giá trị ghép kỳ vọng từ Đá Sơ | Bán NPC 25% (mã) | Bán NPC 5% (đề xuất) |
|---|---|---|---|---|
| Đá Cường Hóa Sơ | 300 | 300 | 75 | 15 |
| Đá Cường Hóa Trung | không bán | 2.850 | 625 | 125 |
| Đá Cường Hóa Cao | không bán | 22.392 | 3.750 | 750 |
| Đá Cường Hóa Thần | không bán | 169.569 | **20.000** | 4.000 |

Ngọc cấp n từ ngọc cấp 1 (1.500 xu), ghép 3 → 1, phí `1000·n²`, tỉ lệ 100/90/80/70/60/50/40/32/25%:

| Cấp | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Xu kỳ vọng | 1.500 | 5.500 | 21.556 | 81.306 | 301.619 | 1.147.603 | 4.662.413 | 21.103.357 | 108.354.705 | 650.452.232 |

Kinh mạch (8 huyệt cùng tầng, `xuCost(i, t) = 1500·t²·(1 + 0,25i)` chia tỉ lệ tầng): tầng 1 22.500 xu; tầng 3 355.472; tầng 5 1.700.857; tầng 8 9.413.058; tầng 10 23.762.216 xu (danh nghĩa 8.662.500, `specs/meridian.md`).

**Chuyển cấp so với cường hóa lại** (9 món, hồ sơ trung bình khi lên bậc mới; chuyển cấp = phí `500·p·(bậc+1)` xu + `2p` lượng + cường hóa bù số cấp mất):

| Cấp | Bậc | +P | Cường hóa lại: xu | Đá (quy ra xu) | Chuyển cấp: xu + đá | Chuyển cấp: lượng | Tiết kiệm xu |
|---|---|---|---|---|---|---|---|
| 60 | 6 | +6 | 4.259.305 | 187.098 | 2.558.786 | 108 | 42% |
| 90 | 9 | +8 | 18.321.293 | 699.070 | 6.090.000 | 187 | 68% |
| 120 | 12 | +10 | 51.362.824 | 2.714.378 | 30.145.451 | 296 | 44% |
| 150 | 15 | +12 | 146.735.783 | 10.500.794 | 92.170.416 | 410 | 41% |
| 199 | 19 | +13 | 284.819.729 | 23.218.486 | 185.125.962 | 497 | 40% |

Chuyển cấp đúng vai trò `gear-upgrade-transfer`: rẻ hơn rõ (giữ công sức, P5), nhưng vẫn tốn 32-60% chi phí và 108-497 lượng cho 9 món, nên là bồn hút cả xu lẫn lượng.

### 9.5 Hồ sơ trung bình có mua nổi không?

Tích lũy xu ròng từ cấp 1 đến lúc đạt L (hồ sơ TB, mô hình B) so với giá trị hồ sơ trung bình ở L:

| Cấp | Ngày lịch | Giờ chơi | Xu ròng tích lũy | Đá rơi tích lũy | Giá trị cường hóa hồ sơ (xu + đá) | Giá trị ngọc hồ sơ | Hồ sơ / tích lũy | Mua nổi (60% ngân sách cho cường hóa, 40% cho ngọc) |
|---|---|---|---|---|---|---|---|---|
| 30 | 1 | 0,4 | 46.273 | 9 | 537.916 (+4) | 99.000 (cấp 2) | 13,8 | +1, chưa ngọc |
| 60 | 2 | 2,0 | 479.327 | 43 | 4.446.404 (+6) | 388.000 (cấp 3) | 10,1 | +2, ngọc cấp 2 |
| 90 | 3 | 5,0 | 1.948.172 | 104 | 19.020.363 (+8) | 2.195.250 (cấp 4) | 10,9 | +3, ngọc cấp 3 |
| 120 | 5 | 8,9 | 6.127.980 | 187 | 54.077.202 (+10) | 8.143.714 (cấp 5) | 10,2 | +4, ngọc cấp 4 |
| 150 | 7 | 13,7 | 12.376.382 | 288 | 157.236.577 (+12) | 125.885.143 (cấp 7) | 22,9 | +5, ngọc cấp 4 |
| 180 | 12 | 23,0 | 26.732.701 | 483 | 293.797.229 (+13) | 569.790.643 (cấp 8) | 32,3 | +6, ngọc cấp 5 |
| 199 | 17 | 32,3 | 43.337.895 | 678 | 308.038.215 (+13) | 569.790.643 (cấp 8) | 20,3 | +6, ngọc cấp 5 |

Đọc bảng: người chơi TB lên cấp **nhanh hơn nhiều** so với tốc độ kiếm xu để đạt hồ sơ trung bình; họ vừa lên cấp L với khoảng +4..+6 và ngọc cấp 3-5. Ở cấp 199 với 3,7 triệu xu ròng/ngày, cần thêm khoảng 76 ngày để có +13 trên 9 món, và khoảng 154 ngày nữa cho ngọc cấp 8: hậu kỳ "đường dài" (P5) đúng ý, nhưng nghĩa là **quái/boss phải chơi được với người dưới hồ sơ**. Vì thế mục 6.1 thêm dải "≤ 16% HP Cung chỉ trang bị" cho quái thường, và Câu hỏi mở Q3 bàn chuyện hạ trần ngọc hồ sơ.

### 9.6 Giá cửa hàng chính và bồn tiêu tiền

| Bồn hút | Đơn vị | Giá | Loại tiền | Nguồn |
|---|---|---|---|---|
| Cường hóa | lần | `(p+1)²·400·(t+1)` + đá | xu | mã (`UPGRADE`) |
| Bùa Bảo Hộ | viên | 2 | lượng | mã |
| Ghép đá | lượt | 1.500 / 8.000 / 40.000 | xu | `gear-smith-plus` |
| Tách cường hóa | lần | `500·p·(t+1)` | xu | `gear-smith-plus` |
| Chuyển cấp | lần | `500·p·(t+1)` + `2p` | xu + lượng | `gear-upgrade-transfer` |
| Ngọc: ghép / gỡ | lượt | `1000·n²` / `300 + 200n²` | xu | mã |
| Kinh mạch | tầng | `1500·t²·(1 + 0,25i)` (tổng 8.662.500) | xu | `sig-meridian` |
| Bình thuốc HP/MP | bình | 20 / 90 / 320 / 1.000 / 2.500 / 6.000 | xu | mã + `eco-consumables-199` |
| Phu Xe | chuyến | 300 | xu | mã |
| Vòng quay | lượt | 10.000 xu hoặc 2 lượng | xu / lượng | mã |
| Chợ | giao dịch | phí đăng 1% (100-20.000) + thuế 5% | xu | `eco-market` |
| Đồ ăn thú | món | 600 / 4.000 xu, 5 lượng | xu / lượng | mã |
| Bí Kíp Nhân Đôi | 30 phút | 5 | lượng | mã |
| Thẻ Hồi Sinh | thẻ | 1 | lượng | mã |
| Sách kỹ năng | cuốn | 30 / 60 / 100 | lượng | mã |
| Thời trang, thú cưỡi, thú cưng | món | 20-400 | lượng | mã |
| Gói ưu đãi `pack_*` | gói | `content/40-items-shops.md` mục 3.6 | lượng | `mon-luong-shop` |

### 9.7 Quy tắc chốt (ADR-06-3 và phần không cần ADR)

| # | Quy tắc | Chỗ sửa | Phối hợp |
|---|---|---|---|
| E1 | Giá bán NPC của 4 loại đá cường hóa = 5% giá gốc (Sơ 15, Trung 125, Cao 750, Thần 4.000) | `src/shared/data/items/consumables.js` (trường `sell`), `modules/shop` (`sell` đọc `ITEMS[id].sell ?? 25%`) | `eco-shop-npc` (GDD 05) |
| E2 | Quái cấp ≥ 90 rơi Đá Cao 75% / Đá Thần 25%; 60-89 Trung 25% / Cao 75% (thay cho "một loại theo dải 30 cấp") | `core/combat.js` `rollDrops` | `eco-loot-tables` (GDD 05) |
| E3 | Trần **60 lượng/ngày** từ hoạt động lặp lại (Tiểu Nhị, Việc Làng, Tà Thú, Hung Tinh, Thủ Hộ Làng, rương mở từ hoạt động); phần vượt đổi 5.000 xu khóa/lượng. Không tính: nạp, thư admin, giftcode, thưởng tuần lôi đài, nhiệm vụ chính một lần, điểm danh | `src/server/core/player.js` `addLuong(n, src)` + `c.luongDay = { d, n }` dọn ở `sanitize` | ADR-06-3, `eco-bound` (xu khóa) |
| E4 | Thưởng lượng Tà Thú theo hạng giữ nguyên, nhưng một người chỉ nhận lượng hạng 1-3 tối đa 3 lần/ngày (lần sau nhận như hạng 4-10) | `modules/events` | `pve-tathu` |
| E5 | Mọi phần thưởng xu từ hoạt động lặp lại mới thêm (Việc Làng, điểm danh, Thủ Hộ Làng) là xu khóa | đã có trong `specs/bound.md` | `eco-bound` |

**Dữ liệu.** `extras.js` thêm `ECONOMY = { luongDayCap: 60, luongOverflowXu: 5000, stoneSellPct: 5 }`.

**Gói `{ t }`.** `selfData` thêm `me.luongDay = { n, cap }` để cửa sổ hành trang hiện "Lượng hôm nay 42/60". Gói `toast` có sẵn báo phần vượt đổi xu khóa.

**Module, cửa sổ, id DOM.** `core/player.js` (`addLuong`), mọi chỗ cộng lượng dùng hàm này (`modules/quest`, `modules/events`, `modules/inventory` `openChest`, `modules/dungeon`); `windows/inventory.js` thêm một dòng chữ nhỏ dưới số lượng (`.inv-luongday`). Không đổi id DOM có sẵn.

**Bố cục điện thoại.** Dòng "Lượng hôm nay n/60" nằm cùng hàng tiền ở chân hành trang, cỡ chữ 12px, rơi xuống dòng thứ hai khi rộng < 400px.

**Chống gian lận.** `addLuong` là đường **duy nhất** cộng lượng từ hoạt động (kiểm bằng `rg "c.luong \+="` chỉ còn trong `addLuong`, nạp và admin); ngày tính theo `vnDay()`; đổi nhân vật trong cùng tài khoản **không** làm mới trần (đếm theo tài khoản `acc.luongDay`, vì lượng chuyển được qua chợ/giao dịch).

**Tiêu chí chấp nhận.**

1. `sim-economy --check`: ở mọi mốc cấp 30-199, bán đá rơi ≤ 10% tổng xu vào của hồ sơ TB (hiện 7,2-42,8%).
2. Xu ròng/ngày hồ sơ TB ở cấp 199 trong 2-5 triệu; tỉ lệ (giá trị cường hóa hồ sơ ở 199) / (xu ròng/ngày ở 199) trong 60-120 ngày.
3. Lượng ròng/ngày hồ sơ TB 20-35; người đứng đầu mọi hoạt động ≤ 60 lượng từ hoạt động lặp lại (đơn vị: 13 lần thưởng Tà Thú hạng 1 trong một ngày → `c.luong` tăng đúng 60, phần còn lại thành xu khóa).
4. Bán 1 Đá Cường Hóa Thần cho NPC được 4.000 xu; giá trị ghép kỳ vọng Đá Thần ≥ 20 lần giá bán NPC (không có vòng "mua Sơ → ghép → bán" sinh lời).
5. Chuyển cấp luôn đắt hơn 30% chi phí cường hóa lại cùng mức (không thể "chuyển → tách → chuyển" sinh lời; tách hoàn đá khóa theo GDD 05).

**Kiểm thử.** `tests/features/economy.js` (mới): đơn vị `addLuong` (trần, tràn ra xu khóa, ngày mới làm mới, tài khoản 2 nhân vật dùng chung trần), `sell` đá 5%, `rollDrops` cấp 95 với `random` cố định ra đúng loại đá; `node tools/sim-economy.js --check`.

---

## 10. Răng cưa đã biết và cách xử lý

| # | Răng cưa | Số đo | Ảnh hưởng | Cách xử lý | Id |
|---|---|---|---|---|---|
| R1 | Bán Đá Thần rơi cho NPC 20.000 xu, rơi 3,5% mọi quái ≥ 90 | 42 viên/ngày ≈ 840.000 xu, 21-47% xu vào ở cấp 90-199 | xu hậu kỳ phình; Đá Cao thiếu vì quái ≥ 90 chỉ rơi Thần | E1 (bán 5%), E2 (Cao 75% / Thần 25%) | `eco-economy-model`, `eco-loot-tables` |
| R2 | Lượng của người đứng đầu sự kiện | khoảng 485 lượng/ngày so với 29,5 của người TB | phá giá lượng, mua đứt Bùa/Bí Kíp | E3 trần 60/ngày (ADR-06-3), E4 | `eco-economy-model` |
| R3 | Thưởng EXP việc ngày nhân `expScale` và Bí Kíp, hệ số quái tới ×4 | TB 120 → 199 chỉ 10,5 giờ / 5 ngày; luyện quái còn 6% EXP dải 190 | hậu kỳ thành điểm danh; mất P3 | ADR-06-2 | `cmb-balance-upper` |
| R4 | Boss cấp tận cùng 7-9 và ≥ 193 vượt 47% HP Cung khi chiêu ≥ ×1,9 | 195: 48,7% (×2,0); 199: 47,6% (×1,9), 51,1% nếu ×2,0 | Cung chết một chiêu | luật ≤ ×1,85 (mục 6.3), sửa 2 boss | `cmb-balance-upper` |
| R5 | Bậc trang bị dừng ở 19 từ 190-199 | quái 199 lấy 3,9% HP Cung so với 2,5% ở 190; HP chỉ trang bị 15,6% | 9 cấp cuối khó hơn rõ | chấp nhận (vẫn trong dải); Thần binh (`gear-fame`) và ngọc cấp 8 là đường mạnh lên ở 190-199 | `cmb-balance-upper` |
| R6 | Chí mạng chạm trần 60% từ cấp 170 | hồ sơ 60,0% ở 170-199 | ngọc Lôi Quang và dòng phụ chí mạng thành vô ích | `GEM_PLAN` hồ sơ đổi `loi` → `hoa` khi CM ≥ 60; cửa sổ Nhân Vật ghi "(đã trần)"; Câu hỏi mở Q4 | `cmb-balance-upper` |
| R7 | Quái thường trên mã gây 0,4-0,7% HP/đòn | dưới dải 1,5% | không áp lực, treo máy vô hạn | công quái `8 + 6L + 0,12L²` | `cmb-balance` |
| R8 | Boss/Tà Thú trên mã chết trong 1 phút solo, Tà Thú 0,2 phút với 10 người | dưới dải 2 phút | hạng sát thương = ai đánh trước | `BOSS_MUL` mới, `eventHpMul(n)` | `cmb-balance` |
| R9 | PvP hạ trong 1,4-6,1 giây, Kiếm hạ Quạt nhanh gấp 2,6-2,9 lần | trên mã | lôi đài là ai ra chiêu trước | ADR-06-1 | `cmb-pvp-balance` |
| R10 | Hồ sơ cường hóa/ngọc đắt gấp 10-32 lần xu tích lũy | mục 9.5 | người vừa lên dải yếu hơn hồ sơ | dải "chỉ trang bị" cho quái; Q3 | `cmb-balance-upper`, `eco-economy-model` |
| R11 | Bí Kíp × Giờ Vàng thành ×4, rương cho thêm Bí Kíp | 10 rương/ngày ra 1,3 Bí Kíp | lệch người có lượng | trần ×3 (ADR-06-2) | `cmb-balance-upper` |
| R12 | Bảng 4.2 `00-foundation` dùng `c15 = hpPct` cũ | HP Cung cao hơn thật 13% | đánh giá thấp sát thương boss lên Cung | đo lại bằng `tools/balance.js` sau khi gộp `cmb-skills-199` | `cmb-balance-upper` |

---

## 11. Công cụ đo

### 11.1 `tools/balance.js` (`dev-balance-tool`, P5, giai đoạn 1)

| Mục | Nội dung |
|---|---|
| Mục đích | Cửa chặn tự động: mọi quái/boss/Tà Thú mới thêm phải nằm trong dải mục 6.1 |
| Nội dung | đúng `specs/balance.md` mục 6 (hồ sơ trung bình, `makePlayer`, các hàm đo), mở rộng tới 199: `tierOf = min(TIERS − 1, ⌊L/10⌋)`, trần cường hóa/ngọc theo mục 5.1, hồ sơ `low` |
| Đầu vào | dữ liệu thật trong `src/shared/data/*`, không tham số; `--json` in máy đọc; `--check` thoát 1 khi lệch dải; `--mob <id>` đo một con |
| Đầu ra | bảng markdown: người chơi trung bình mỗi 10 cấp, quái mẫu mỗi 10 cấp, từng boss (đánh thường, từng chiêu, solo, nhóm 5), từng Tà Thú (n = 1/3/5/10/20) |
| Dải đạt | mục 6.1 (quái, boss, Tà Thú; Hung Tinh khi `pve-worldboss` có dữ liệu) |
| Lệnh chạy | `node tools/balance.js`, `node tools/balance.js --check` |
| Nối vào `npm run check` | **Có**: `tools/check-data.js` gọi các hàm của `tools/balance.js` (khối "Cân bằng"), lỗi in như mọi lỗi dữ liệu khác. Thời gian chạy mục tiêu < 3 giây |
| File | `tools/balance.js` (mới, vùng Hạ tầng kiểm thử), `tools/check-data.js`, `tests/features/balance.js`, `tests/smoke.js` (1 dòng) |

### 11.2 `tools/sim-*.js` (`dev-sim-tools`, P5, giai đoạn 3)

Chung: CommonJS, `'use strict'`, chỉ `require` mã thật (`src/shared`, `src/server/core`) và `tools/balance.js`; **không** có chế độ "design" (bản nháp dùng để đo đặc tả trước khi có mã; công cụ thật đo mã hiện có). Mỗi công cụ có `--json`, `--check` (thoát 1 khi lệch dải), `--profile <tên>`. Không nối vào `npm run check` mặc định (mô hình có giả định người chơi, chạy 5-20 giây); thêm script `npm run sim` chạy cả ba với `--check`, gọi trong quy trình "Đổi dữ liệu game" của `CLAUDE.md` khi đổi EXP, rơi đồ, giá hoặc thưởng.

| Công cụ | Đầu vào | Đầu ra | Dải đạt (`--check`) | Lệnh |
|---|---|---|---|---|
| `tools/sim-exp.js` | `expNeed`, `MAIN_QUESTS`, `DAILY`, `ERRANDS`, hang động, 40 kỳ duyên (một lần, theo `req`) và Lệnh Truy Nã (3 lệnh/ngày từ cấp 120, 8/8/12% `expNeed`, không nhân Bí Kíp); hồ sơ `thuan/nhe/tb/cay` (phút/ngày, quái/phút, hệ số nhân, có việc ngày/nhiệm vụ) | bảng đường EXP mỗi 10 cấp; giờ chơi và ngày lịch theo dải cho từng hồ sơ; nguồn EXP theo dải; phiên 10 phút | mục 2 tiêu chí 2-3 | `node tools/sim-exp.js [--profile tb] [--check]` |
| `tools/sim-combat.js` | hồ sơ (`avg`, `low`, `econ` = mức mua nổi từ `sim-economy`); `MONSTERS`, `BOSS_SKILLS`, `CLASSES` | người chơi theo cấp; TTK quái; boss; Tà Thú; Hung Tinh; đóng góp sức mạnh (mục 7); ma trận PvP 6 × 6 (`--pvp`) | mục 6.1, mục 7, mục 8 tiêu chí 1 | `node tools/sim-combat.js [--pvp] [--profile low] [--check]` |
| `tools/sim-economy.js` | ngày chơi của hồ sơ TB (từ `sim-exp`), `rollDrops` kỳ vọng, `UPGRADE`, `GEM`, `MERIDIAN`, `SHOPS`, `ECONOMY`, thưởng hoạt động | xu/lượng vào-ra mỗi ngày theo cấp; chi phí cường hóa/ngọc/kinh mạch; giá trị đá; tích lũy so với hồ sơ; chuyển cấp so với cường hóa lại | mục 9.7 tiêu chí 1-4 | `node tools/sim-economy.js [--check]` |

Tiêu chí chấp nhận `dev-sim-tools`: ba công cụ chạy trên mã hiện có in đúng các bảng mục 2, 6, 9 (cột "đo trên mã" khớp ± 1%); `--check` thoát 1 khi sửa tạm `BOSS_MUL.hp` về 45 (thử âm); `npm run sim` có trong `package.json`; `CLAUDE.md` mục "Quy trình kiểm tra" thêm một dòng nhắc chạy `npm run sim` khi đổi EXP/rơi đồ/giá. Việc chuyển bản nháp `lab/sim/*` thành công cụ là việc cơ học có đặc tả rõ: giao opencode.

---

## 12. ADR

### ADR-06-1 — Hệ số PvP nhân sau khi trừ thủ, kèm hệ số phái

- **Bối cảnh.** `PVP_SCALE = 0,45` nhân vào hệ số chiêu trước khi trừ `0,6·def` cho thời gian hạ 1,4-6,1 giây và lệch cặp 2,6-2,9 lần (mục 8). Hạ hệ số trước khi trừ thủ (0,12) làm kết quả phi tuyến: phái thủ cao gần như bất tử, cấp thấp đánh lâu gấp 3 lần cấp cao.
- **Quyết định.** Sát thương PvP = `round(calc(att, tgt, mul) × PVP.k × pvp(phái tấn công) × (1 − pvpRes))`, `PVP.k = 0,06`, hệ số phái Kiếm 0,8 / Tiêu 1,05 / Kunai 1,0 / Cung 0,95 / Đao 0,9 / Quạt 1,3.
- **Phương án khác.** (a) giữ cách cũ với hệ số 0,12: trung vị 22-32 giây nhưng lệch 2,9-3,5 lần; (b) thêm "thủ PvP" riêng: thêm một chỉ số cho mọi trang bị, chi phí dữ liệu lớn; (c) chỉnh chỉ số phái gốc: ảnh hưởng PvE.
- **Chi phí.** 2-3 dòng trong `core/combat.js` (vùng Lõi server), 1 trường trong `classes.js`, 1 hằng trong `extras.js`; cập nhật `DESIGN_RULES.md` mục 9.
- **Hệ quả.** Thời gian hạ PvP dài hơn khoảng 6 lần so với hôm nay; số sát thương nổi lên trong lôi đài nhỏ đi. Hệ số phái là chỗ chỉnh cân bằng PvP về sau, không chạm PvE.

### ADR-06-2 — Thưởng EXP việc ngày không nhân `expScale`/Bí Kíp, trần hệ số EXP quái ×3

- **Bối cảnh.** `content/00-foundation.md` mục 2 cho `DAILY` và `errandReward` nhân `expScale` để giữ khoảng 15% một cấp mỗi lượt; Bí Kíp nhân cả thưởng việc ngày; Giờ Vàng × Bí Kíp = ×4. Mô hình: người chơi TB qua 120 → 199 trong 10,5 giờ / 5 ngày, luyện quái chỉ còn 6% EXP dải 190.
- **Trạng thái.** Đề xuất của GDD, **cần người điều phối duyệt** vì đi ngược `content/PLAN.md` (nguồn ưu tiên cao nhất, GĐ2 dòng `dailies`) và `content/00-foundation.md` mục 2 (bảng nguồn EXP, dòng `DAILY.reward` và `errandReward`). Mặc định: duyệt (Câu hỏi mở Q9). Cho tới lúc duyệt, lô `dailies` và F1 làm đúng PLAN; bản vá ADR-06-2 đi riêng trong `cmb-balance-upper` (chuyển từ `core-levelcap-199` khi ghép vì cần `errandReward` của `quest-dailies` và `tools/sim-exp.js` ở GĐ3).
- **Quyết định.** Từ cấp 121, thưởng EXP của Tiểu Nhị và Việc Làng tính theo công thức cấp ≤ 120 (không `expScale`); thưởng Tiểu Nhị, Việc Làng, hang động **không** nhân Bí Kíp (giống nhiệm vụ chính); hệ số nhân EXP quái `min(3, expEvent × expMul)`.
- **Phương án khác.** (a) giữ như nguồn: hậu kỳ thành điểm danh; (b) dốc `expScale` (`EXPDIV` 600-1200): luyện thuần tăng lên 140-218 giờ, phạt người chơi luyện quái, vẫn cần (a) để giữ tỉ lệ nguồn; giữ làm Câu hỏi mở Q1.
- **Chi phí.** Sửa một hệ số trong `quests.js` (`DAILY.reward`), `specs/dailies.md` (`errandReward`), `modules/dungeon`, `core/combat.js` `shareExp` (1 dòng). Đi ngược hai dòng của `content/00-foundation.md` mục 2 và một dòng của `content/PLAN.md` GĐ2 (đều là nguồn cao hơn GDD): ghi ở đây, ở mục 1.3 (N5) và báo người điều phối. Nếu không duyệt, phương án A giữ nguyên và tiêu chí `sim-exp --check` của `cmb-balance-upper` đổi thành "TB 120 → 199 trong 8-14 giờ chơi, ≥ 4 ngày lịch" (số đo A: 10,5 giờ / 5 ngày).
- **Hệ quả.** TB 120 → 199: 23,4 giờ / 12 ngày; Cày 4 ngày; luyện quái 23-38% EXP mọi dải. Lượt Tiểu Nhị ở cấp 198 chỉ còn 3,5% cấp (từ 14,2%): người chơi thấy rõ, cần ghi trong bản tin cập nhật.

### ADR-06-3 — Trần 60 lượng/ngày từ hoạt động lặp lại, phần vượt đổi xu khóa

- **Bối cảnh.** Người đứng đầu mọi hoạt động nhận khoảng 485 lượng/ngày (mục 9.3), gấp 16 lần người TB và gấp 2-3 lần nguồn lượng miễn phí `content/40-items-shops.md` mục 8 định. Lượng mua được Bùa, Bí Kíp, thời trang và bán qua chợ: phá giá lượng và cửa hàng lượng (`mon-luong-shop`).
- **Quyết định.** Hàm `addLuong(n, src)` duy nhất; nguồn thuộc nhóm "lặp lại" cộng vào `acc.luongDay`, quá 60 thì phần vượt đổi 5.000 xu khóa/lượng; trần tính theo **tài khoản**.
- **Phương án khác.** (a) cắt thưởng lượng Tà Thú/Hung Tinh: người đứng đầu mất động lực; (b) trần theo nhân vật: tài khoản nhiều nhân vật lách được; (c) không trần, chỉ tăng giá cửa hàng lượng: phạt người TB.
- **Chi phí.** Thêm `acc.luongDay` vào bản ghi tài khoản (`accounts.json`, giống `acc.codes`), sửa 5-6 chỗ cộng lượng sang `addLuong`; vùng Lõi server + các module tính năng (mỗi chỗ 1 dòng).
- **Hệ quả.** Người TB (29,5 lượng/ngày) không chạm trần; người đứng đầu vẫn hơn TB khoảng 2 lần lượng và nhiều xu khóa hơn. Mọi nguồn lượng mới phải khai báo nhóm `src` (lặp lại / một lần).

---

## 13. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Có dốc đường EXP hậu kỳ (`EXP_HI.div` 2000 → 1000) để TB 120 → 199 gần khoảng "45-60 giờ" mà `00-foundation` ghi không? (1000: TB 31,8 giờ / 16 ngày; 600: 41,5 giờ / 21 ngày) | **Giữ 2000** ở bản 1.0 (đúng nguồn). Sau 2 tuần số liệu thật: nếu trung vị người chơi đạt 199 trong < 10 ngày lịch thì hạ xuống 1000 (chỉ đổi một hằng, người chơi cũ giữ % thanh EXP) |
| Q2 | `PVP.k = 0,06` hay 0,08? (0,08: trung vị 11-16 giây; 0,06: khoảng 15-21 giây) | **0,06**, là hằng trong `extras.js`, chỉnh sau mùa lôi đài đầu tiên theo thời gian trận trung vị đo trên server |
| Q3 | Hạ trần ngọc của hồ sơ trung bình trên 120 từ 8 xuống 7 (giá trị ngọc hồ sơ ở 199 từ 570 triệu xuống 126 triệu xu)? | **Giữ 8** (phụ lục `specs/balance.md` là nguồn cao hơn); thêm dải "chỉ trang bị" để chắc người dưới hồ sơ vẫn chơi được; đo lại khi `cmb-balance-upper` xong |
| Q4 | Chí mạng vượt trần 60% có đổi thành sát thương chí mạng không? | **Không** ở 1.0; hiển thị "(đã trần)" và đổi `GEM_PLAN` hồ sơ. Xem lại khi làm `cmb-power-score` |
| Q5 | Người chơi đã bán Đá Thần giá cũ có được bù khi đổi giá bán 5%? | **Không bù** (giá bán NPC không phải tài sản); thông báo trước 3 ngày trong bản tin |
| Q6 | Trần lượng 60/ngày có tính phần thưởng lễ hội (`evt-*`) không? | **Có** nếu thưởng lặp lại hằng ngày (đổi quà theo mùa, điểm danh lễ hội); **không** với quà một lần của mùa |
| Q7 | Hệ số phái PvP có dùng cho chiến trường/công thành hay chỉ lôi đài? | **Mọi** sát thương người lên người, một công thức cho dễ hiểu |
| Q8 | Bùa Bảo Hộ dùng từ +7 (mô hình này) hay từ +10 (GDD 05 mục 1.2) làm chuẩn để tính chi phí? | **Từ +7** cho mô hình kinh tế (người TB thận trọng hơn); hai cách lệch dưới 15% tổng chi phí +13 |
| Q9 | Người điều phối có duyệt ADR-06-2 (bỏ `expScale` và Bí Kíp khỏi thưởng việc ngày, trần EXP quái ×3) dù `PLAN.md` GĐ2 và `00-foundation` mục 2 chốt nhân `expScale`? | **Duyệt**: bản vá 4 dòng áp sau lô `dailies` và F1 (các lô đó vẫn làm đúng PLAN). Nếu không duyệt: giữ phương án A, nới tiêu chí `sim-exp` như ghi ở ADR-06-2 |
| Q10 | Hệ số EXP nhiệm vụ diệt boss vùng `<prefix>_q7` giữ 1,0 (GDD 08 mục 0.3 ý 1) khi bản nháp có đủ kỳ duyên và Lệnh Truy Nã cho TB 120 → 199 chỉ 19,9 giờ và luyện quái 15,6% ở dải 190-199 (mục 1.3 N6)? | **Giữ 1,0** ở dữ liệu cho tới khi `tools/sim-exp.js` (`dev-sim-tools`) có đủ nguồn. Nếu `--check` của công cụ thật báo TB dưới 20 giờ hoặc luyện quái dưới 20% ở bất kỳ dải ≥ 120 thì hạ 8 nhiệm vụ `<prefix>_q7` về 0,6 (đúng khối mã `content/30-quests.md`; mỗi vùng sửa một số), cập nhật phụ lục A của GDD 08 và dòng kiểm `bl_q7:200098` |
