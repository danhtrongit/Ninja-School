# GDD 05 — Hệ thống chiến đấu

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5: đặc tả hệ thống chiến đấu (phái, chỉ số, kỹ năng, buff, tự động, AI quái, rơi đồ, tử trận, PK, hiệu ứng trạng thái, phân thân, kỹ năng hậu kỳ, quái tinh anh, lực chiến, kinh mạch) |
| Ngày | 18/10/2026 |
| Id phụ trách | `cmb-classes`, `cmb-potential`, `cmb-skills`, `cmb-passive`, `cmb-stats`, `cmb-buffs`, `cmb-auto`, `cmb-death-revive`, `cmb-monster-ai`, `cmb-loot`, `pvp-pk`, `cmb-status`, `cmb-clone`, `cmb-skills-199`, `cmb-elite-mobs`, `cmb-power-score`, `sig-meridian` |
| Nguồn đã đọc | mã `src/` ở thư mục làm việc ngày 18/10/2026 (`core/combat.js`, `core/player.js`, `core/monster.js`, `core/map.js`, `core/world.js`, `modules/skills`, `modules/buffs`, `modules/pk`, `modules/rank`, `game/game.js`, `ui/windows/*`), `src/shared/data/{classes,skills,monsters}.js`, `src/shared/constants.js`, kiểm thử `tests/features/*.js` và `tests/e2e/*.js`, đặc tả đợt 3 (`specs/status.md`, `specs/clone.md`, `specs/meridian.md`, `specs/balance.md`, `specs/PLAN.md`), đặc tả nội dung `content/00-foundation.md` (mục 4, 5, 7.3) và `content/20-monsters.md`, GDD 01 |
| Đo đạc riêng | `scratchpad/gddwork/lab/cmb/power.js` (gọi `Player.recalc` thật, kết quả ở `power.out`): lực chiến 6 phái, sát thương và thời gian hạ quái tinh anh |
| Quy ước | "đã có" = có trong mã thư mục làm việc và có kiểm thử chứng minh; nhánh `feat/bag`, `feat/audio` coi là đã làm, chờ gộp. Các thư mục `specs/` và `content/` nói ở đây nằm trong `scratchpad/` của phiên thiết kế |

Quy tắc đọc: chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 7. Tên kỹ năng, quái, hiệu ứng đều tự đặt; game khác chỉ được nhắc chung là "game tham khảo". Đặc tả đợt 3 đã duyệt (`specs/*.md`) là nguồn chi tiết cho `cmb-status`, `cmb-clone`, `sig-meridian`; tài liệu này tóm lại, ghi phần GDD chốt thêm và phần lệch (có lý do).

---

## 0. Tóm tắt

| Id | Tên | Trụ cột | Mức | Trạng thái | Giai đoạn | Cỡ | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|
| `cmb-classes` | 6 phái, 3 hệ khắc vòng, 3 làng phái | P1, P3 | Must | done | 1 | S | mục 2.1 |
| `cmb-stats` | Công thức chỉ số nhân vật và trần | P3, P5 | Must | done | 1 | M | mục 2.2 |
| `cmb-potential` | Tiềm năng 4 chỉ số, tẩy điểm | P3 | Must | done | 1 | S | mục 2.3 |
| `cmb-skills` | Kỹ năng chủ động, thanh kỹ năng 3 bộ × 6 ô | P3 | Must | done | 1 | M | mục 2.4 |
| `cmb-passive` | Nội tại học bằng sách, 10 chỉ số | P3, P5 | Should | done | 1 | S | mục 2.5 |
| `cmb-buffs` | Buff kỹ năng, buff lưu khi thoát | P3 | Must | done | 1 | S | mục 2.6 |
| `cmb-auto` | Tự đánh, tự uống thuốc, tự nhặt | P2 | Must | done | 1 | M | mục 2.7 |
| `cmb-monster-ai` | AI quái và boss | P3 | Must | done | 1 | M | mục 2.8 |
| `cmb-loot` | Rơi đồ, quyền nhặt 15 giây | P4, P5 | Must | done | 1 | S | mục 2.9 |
| `cmb-death-revive` | Tử trận, mất EXP, hồi sinh (nâng: bảo hộ, giá leo thang) | P3, P5 | Must | todo | 1 | S | mục 2.10 |
| `pvp-pk` | PK cơ bản (nâng: kiểm thử, khóa tắt PK, bảo vệ tân thủ, màu tên) | P3, P4 | Should | todo | 4 | S | mục 2.11 |
| `cmb-status` | Hiệu ứng trạng thái theo hệ | P3 | Should | todo | 1 | L | mục 3.1, `specs/status.md` |
| `cmb-clone` | Phân Thân cấp 70 | P3 | Should | todo | 1 | M | mục 3.2, `specs/clone.md` |
| `cmb-skills-199` | Kỹ năng hậu kỳ 100/130/160 + nội tại 120/150 | P3 | Must | todo | 1 | M | mục 3.3, `content/00-foundation.md` mục 5 |
| `cmb-elite-mobs` | Quái tinh anh trên bãi luyện | P3 | Should | todo | 2 | M | mục 3.4 (thiết kế mới) |
| `cmb-power-score` | Lực chiến và 3 bảng xếp hạng mới | P4, P5 | Should | todo | 4 | M | mục 3.5 (thiết kế mới) |
| `sig-meridian` | Kinh Mạch, tu luyện hậu kỳ | P5 | Should | todo | 5 | L | mục 3.6, `specs/meridian.md` |

Ba điều GDD này chốt:

1. **Mọi hệ thống chiến đấu Must đã chạy được hôm nay**; phần việc còn lại là nâng (tử trận, PK), nội dung hậu kỳ (`cmb-skills-199`) và các tính năng Should có đặc tả. Không tính năng Must nào phụ thuộc tính năng Should/Could.
2. **Mọi số chiến đấu do máy chủ tính**; máy khách chỉ gửi ý định `skill { sid, tid, dir }`. Tính năng mới (hiệu ứng, phân thân, tinh anh) không thêm hành động nào cho chiến đấu ngoài những gói đã liệt kê ở mục 5.
3. **Cân bằng theo "người chơi trung bình"** của `specs/balance.md` (kéo dài tới 199 ở `content/00-foundation.md` mục 4). Mọi tham số mới ở mục 3 có dải mục tiêu đo được bằng `tools/balance.js` (tính năng `dev-balance-tool`, GDD 06).

---

## 1. Mô hình chiến đấu chung

### 1.1 Vòng đời một đòn đánh

| Bước | Nơi | Việc | Kiểm tra / số liệu |
|---|---|---|---|
| 1 | máy khách | người chơi bấm nút kỹ năng hoặc auto chọn kỹ năng | máy khách chặn sớm (hồi chiêu, chakra) chỉ để phản hồi nhanh, không có giá trị pháp lý |
| 2 | gói | `skill { sid, tid, dir }` | `sid` chuỗi, `tid` số nguyên, `dir` ±1 |
| 3 | `core/combat.js` `useSkill` | kiểm theo thứ tự: đúng phái → không phải nội tại → đã học → trạng thái trận lôi đài → hồi chiêu (dung sai 60 ms) → cách kỹ năng trước ≥ 180 ms → đủ chakra | trượt thì bỏ qua im lặng hoặc báo `notice` |
| 4 | `useSkill` | chọn mục tiêu theo `type`: `single` (một mục tiêu trong `range`), `aoe` (tâm `self` hoặc `target`, bán kính `radius`), `line`, `dash` (gửi `pos`), `buff` (cả nhóm trong 250), `heal` (cả nhóm trong bán kính) | đòn trúng người chơi khác phải qua `canPvp` (mục 2.11) |
| 5 | `calc(att, tgt, mul, isSkill)` | né → sát thương thô → chí mạng → hệ khắc → kháng | công thức mục 1.2 |
| 6 | `damageMonster` / `damagePlayer` | trừ máu, ghi `dmgBy` (quái), gây thù, kiểm cuồng nộ boss; người chơi: lôi đài, thách đấu, chết thật | hút máu tính trên số máu thực mất |
| 7 | phát gói | `fx` (hình chiêu), `hit` (số sát thương từng mục tiêu, cờ chí mạng) | phát cho người cùng bản đồ |
| 8 | `killMonster` / `killPlayer` | chia EXP, rơi đồ, nhiệm vụ, móc `monsterKilled`; người chơi: phạt EXP, điểm hiếu chiến | mục 2.9, 2.10, 2.11 |

### 1.2 Công thức sát thương (hiện hành, `core/combat.js`)

```text
né      : ngẫu nhiên(100) < né_mục_tiêu − chính_xác_người_đánh × 0,04         → "Né"
thô     : atk × mul × (1 + skillDmg/100 nếu là kỹ năng) − def_mục_tiêu × 0,6
sàn     : thô ≥ atk × mul × 0,12
dao động: × ngẫu nhiên(0,9 đến 1,1)
chí mạng: ngẫu nhiên(100) < crit  →  × critDmg/100   (critDmg gốc 160)
hệ khắc : người đánh khắc mục tiêu × 1,15; bị khắc × 0,9
kháng   : chỉ khi người đánh khắc mục tiêu: × (1 − resist/100), resist ≤ 50
PvP     : × 0,45 (PVP_SCALE)
```

Vòng khắc: **Hỏa khắc Phong, Phong khắc Thủy, Thủy khắc Hỏa**. Quái có `el` thì cũng theo vòng này. Đo kiểm thử hiện có: 1000 sát thương gốc thành 1150 khi khắc, kháng 20 kéo về 920 (`tests/features/passive.js`).

### 1.3 Nhịp thời gian máy chủ

| Nhịp | Chu kỳ | Việc chiến đấu chạy ở đó |
|---|---|---|
| `tick` | 50 ms (20 lần/giây) | `GameMap.update`: AI quái, đòn quái, niệm chiêu boss, hết hạn đồ dưới đất |
| gửi trạng thái | 100 ms | `state` vị trí, máu quái và người |
| `second` | 1 giây | hồi phục tự nhiên, hồi chakra nội tại, hết hạn buff (`playerSecond`), giảm điểm hiếu chiến |
| xếp hạng | 60 giây | `computeRank` rồi móc `rank` |

Hiệu ứng trạng thái (mục 3.1) dùng nhịp `tick` cho khống chế và nhịp riêng 1000 ms mỗi hiệu ứng cho sát thương theo thời gian; không thêm vòng lặp mới.

### 1.4 Bất biến chiến đấu (mọi tính năng ở mục 2-3 phải giữ)

| # | Bất biến | Nơi kiểm |
|---|---|---|
| B1 | Máy khách không gửi số sát thương, máu, vị trí trúng; máy chủ tự tính từ `p.s` | `useSkill`, `calc` |
| B2 | `canPvp` và `damagePlayer` kiểm `p.match` (lôi đài) **trước** luật khu an toàn, thách đấu, PK | `core/combat.js` |
| B3 | Nguồn hồi máu mới (thú, buff theo thời gian, hiệu ứng, kinh mạch) bỏ qua bản đồ `arena` | móc của module |
| B4 | Chiêu nhiều đòn kiểm lại `canPvp` trước mỗi đòn | `useSkill` |
| B5 | Trạng thái chiến đấu tạm (hiệu ứng, phân thân, tinh anh, bảo hộ hồi sinh) chỉ ở RAM, không ghi file; đổi bản đồ, thoát, chết là mất | module tương ứng |
| B6 | Mọi trần chỉ số áp ở `Player.recalc` (chí mạng 60, né 45, kháng 50, tốc chạy 100, hút máu theo `GEM.lifestealCap`) | `core/player.js` |
| B7 | Tự động (auto) chỉ chạy ở máy khách, không nhắm người chơi khác ngoài đối thủ lôi đài; máy chủ không có chế độ treo máy | `game/game.js` |

---

## 2. Hệ thống đã có

Mỗi tính năng: bảng hiện trạng theo mẫu (mục đích, luồng, quy tắc, dữ liệu, gói, module/cửa sổ, điện thoại, chống gian lận), phần cần nâng, tiêu chí chấp nhận và kiểm thử. Tiêu chí của tính năng `done` chỉ ghi hành vi đã có kiểm thử chứng minh; kiểm thử còn thiếu (tẩy điểm, nhặt tay, PK, hồi sinh về làng, kéo về chỗ) được giao: PK và hồi sinh ở chính mục này (2.10, 2.11), tẩy điểm cho `dev-test-coverage` (GDD 10), AI kéo về chỗ và làm chậm vào `tests/features/elite.js` (mục 3.4).

### 2.1 `cmb-classes` — 6 phái, 3 hệ khắc vòng (P1, P3)

| Mục | Nội dung |
|---|---|
| Mục đích | Cho người chơi một bản sắc ngay từ phút đầu (vũ khí, hệ, làng) và một lý do chọn đồng đội khác hệ |
| Luồng | tạo nhân vật chọn 1 trong 6 thẻ phái (`.class-card`) → vào làng phái → đòn thường và kỹ năng đều theo hệ của phái |
| Quy tắc | Hỏa: Kiếm (cận), Tiêu (xa). Thủy: Kunai (cận), Cung (xa). Phong: Đao (cận), Quạt (xa). Cận chiến nhiều máu và phòng thủ, đánh xa nhiều chí mạng và né (`BASE_STATS` theo `melee/ranged`). Khắc hệ ×1,15 / ×0,9 (mục 1.2) |
| Dữ liệu | `src/shared/data/classes.js` (`CLASSES`, `BASE_STATS`, `ELEMENTS`, `village`) |
| Gói | `createChar { name, cls, gender }` (ở sảnh `core/gateway.js`); `data.classes` |
| Module / cửa sổ | `core/gateway.js` (sảnh), màn hình `#screen-chars`, `render/titleart.js` `CLASS_STATS` |
| Điện thoại | thẻ phái 2 cột, mỗi thẻ ≥ 44px chiều cao |
| Chống gian lận | `cls` phải là phái có thật trong `CLASSES`, không đổi phái sau khi tạo |
| Phần cần nâng | không. Lực chiến (mục 3.5) dùng để giám sát độ lệch giữa phái |

Tiêu chí chấp nhận: tạo được nhân vật cả 6 phái; khắc hệ ra đúng 1150 / 920 trong kiểm thử đơn vị; `cls` lạ bị từ chối.
Kiểm thử: `tests/features/passive.js` (hệ khắc, kháng), `tests/features/account.js` (tạo nhân vật).

### 2.2 `cmb-stats` — Công thức chỉ số nhân vật (P3, P5)

| Mục | Nội dung |
|---|---|
| Mục đích | Một nơi duy nhất quyết định chỉ số, để mọi nguồn (trang bị, ngọc, thú, thời trang, nội tại, buff, gia tộc, sau này hiệu ứng và kinh mạch) cộng cùng một cách và cùng bị trần |
| Luồng | đổi đồ, lên cấp, học nội tại, nhận buff → máy chủ gọi `Player.recalc()` → gói `me` cập nhật cửa sổ Nhân Vật |
| Quy tắc | xem bảng dưới |
| Dữ liệu | `BASE_STATS` (`classes.js`), `PASSIVE_STATS` (`skills.js`), `GEM` (`items/gems.js`) |
| Gói | `me.s` (chỉ số đã tính) |
| Module / cửa sổ | `core/player.js` `recalc`; móc `stats` của `inventory`, `skills`, `buffs`, `clan`; cửa sổ `windows/character.js` |
| Điện thoại | cửa sổ Nhân Vật cuộn dọc, danh sách chỉ số 2 cột |
| Chống gian lận | chỉ số luôn tính lại từ dữ liệu lưu, không bao giờ nhận từ máy khách; trần áp ở cuối `recalc` |

Công thức hiện hành (`b` = `BASE_STATS` của phái, `lv` = cấp):

| Chỉ số | Công thức | Trần |
|---|---|---|
| Sinh lực tối đa | `(b.hp + b.hpLv·lv + vit·12 + eq.hp) × (1 + (buf.hpPct + eq.hpPct + pas.hpPct)/100)` | |
| Chakra tối đa | `b.mp + b.mpLv·lv + int·6 + eq.mp` | |
| Tấn công | `(b.atk + b.atkLv·lv + str·2 + agi·0,5 + eq.atk) × (1 + (buf.atkPct + pas.atkPct)/100)` | |
| Phòng thủ | `(b.def + b.defLv·lv + vit·0,6 + eq.def) × (1 + (buf.defPct + pas.defPct)/100)` | |
| Chí mạng | `b.crit + agi·0,15 + eq + buf + pas` | 60 |
| Né | `b.dodge + agi·0,12 + eq + buf + pas` | 45 |
| Chính xác | `agi + eq.hit` | |
| Tốc chạy | `min(60, eq + buf + pas) + thú cưỡi` | 100; giảm tốc giữ số cũ 2,5 giây (`spdHold`) |
| % sát thương kỹ năng | `int·0,6 + eq.skillDmg + pas.skillDmg` | |
| Sát thương chí mạng | `160 + pas.critDmg` | |
| Kháng hệ khắc | `pas.resist` | 50 |
| Hút máu | `eq.lifesteal` | `GEM.lifestealCap` |

Phần cần nâng (do tính năng khác làm, mục này chỉ ghi điểm chèn): `stRes` (mục 3.1), `power` (mục 3.5), cộng kinh mạch vào `eq` (mục 3.6). Chỉ số mới luôn theo đúng đường của `CLAUDE.md`: thêm khóa vào bảng tạm, cộng ở móc `stats`, dùng trong `recalc`.

Tiêu chí chấp nhận: kiểm thử đơn vị nội tại, ngọc, thú cưng cho ra đúng số; trần chí mạng 60 / né 45 / kháng 50 không vượt khi cộng dồn mọi nguồn.
Kiểm thử: `tests/features/passive.js`, `tests/features/gems.js`, `tests/features/pets.js`.

### 2.3 `cmb-potential` — Tiềm năng 4 chỉ số (P3)

| Mục | Nội dung |
|---|---|
| Mục đích | Cho người chơi tự chọn lối đánh trong cùng một phái (dồn sức mạnh, dồn nhanh nhẹn để chí mạng/né, dồn trí tuệ cho kỹ năng, dồn thể lực để trụ) |
| Luồng | lên cấp nhận +5 điểm → cửa sổ Nhân Vật bấm `+` hoặc `+10` ở `str/agi/int/vit` → chỉ số đổi ngay; muốn chơi lại thì Tẩy điểm (20 lượng) |
| Quy tắc | mỗi cấp +5 điểm; tẩy trả lại toàn bộ điểm đã cộng (trừ 20 điểm gốc mỗi chỉ số), giá 20 lượng |
| Dữ liệu | `BASE_STATS` có 4 chỉ số gốc; giá tẩy trong `modules/skills` |
| Gói | `addStat { k, n }`, `resetStats {}` → `me` |
| Module / cửa sổ | `modules/skills`; `windows/character.js` |
| Điện thoại | nút `+` 44px |
| Chống gian lận | `k` phải thuộc 4 khóa; `n` qua `int()`, không vượt số điểm còn; trừ lượng trước khi trả điểm, thiếu lượng thì từ chối |
| Phần cần nâng | không đổi luật. Kiểm thử bot cho `resetStats` (trừ đúng 20 lượng, trả đúng điểm, thiếu lượng bị từ chối) giao `dev-test-coverage` |

Tiêu chí chấp nhận: `addStat` cộng đúng, không cộng quá số điểm, `k` lạ bị bỏ qua (11 kiểm tra của `tests/features/skills.js` đạt).
Kiểm thử: `tests/features/skills.js`.

### 2.4 `cmb-skills` — Kỹ năng chủ động và thanh kỹ năng (P3)

| Mục | Nội dung |
|---|---|
| Mục đích | Mỗi phái có bộ chiêu riêng mở dần theo cấp, mỗi chiêu có vai trò (đơn mục tiêu, diện rộng, lướt, buff, hồi máu) |
| Luồng | đạt cấp `req` → cửa sổ Kỹ năng (phím V) học bằng 1 điểm kỹ năng → chiêu tự vào ô trống thanh kỹ năng → nâng tới cấp 15 khi nhân vật đủ `req + 3·(cấp kỹ năng − 1)` |
| Quy tắc | mỗi phái: đòn thường + 6 chiêu (`req` 1/5/10/20/30/60) + 3 nội tại; `SKILL_MAX_LV = 15`; `skillVal(arr, lv) = arr[0] + arr[1]·(lv − 1)`; hồi chiêu và chakra theo bảng; 3 bộ thanh × 6 ô (`HOTBAR`, `HOTBAR_SETS`), đổi bộ cách nhau ≥ 300 ms |
| Dữ liệu | `src/shared/data/skills.js` (60 kỹ năng), `src/shared/constants.js` |
| Gói | `skill { sid, tid, dir }`, `learnSkill { sid }`, `hotbar { i, sid }`, `hotbarSet { n }` → `fx`, `hit`, `me` |
| Module / cửa sổ | `core/combat.js` `useSkill`; `modules/skills`; `windows/skills.js`; HUD `#hud-skills` |
| Điện thoại | cụm 6 ô vòng cung quanh nút đánh thường, nút tròn ≥ 44px, hồi chiêu quét tròn kèm số giây (`DESIGN_RULES.md` mục 8) |
| Chống gian lận | kiểm phái, đã học, hồi chiêu, khoảng cách 180 ms, chakra, tầm đánh ở máy chủ; `sid` tra bằng `skillOf` (có `hasOwnProperty`) |
| Phần cần nâng | thêm trường `step` và hàm `skillNeedLv` cho kỹ năng hậu kỳ (mục 3.3); thêm trường `st` (mục 3.1) và `type: 'clone'` (mục 3.2). Không đổi chữ ký gói |

Tiêu chí chấp nhận: học, nâng, gán thanh kỹ năng đạt trong bot; cấp 120 học được chiêu cấp 60; e2e học kỹ năng và gán thanh đạt cả máy tính lẫn điện thoại.
Kiểm thử: `tests/features/skills.js`, `tests/features/endgame.js`, `tests/e2e/e2e.js`.

### 2.5 `cmb-passive` — Nội tại học bằng sách (P3, P5)

| Mục | Nội dung |
|---|---|
| Mục đích | Một nhánh tiến bộ lâu dài, mua bằng lượng hoặc nhặt từ boss, không làm lệch PvP (giá trị nhỏ, có trần) |
| Luồng | đạt cấp 15/35/50 → mua sách ở Tiệm Thuốc (30/60/100 lượng) hoặc nhặt từ boss → dùng sách học cấp 1 → nâng bằng điểm kỹ năng |
| Quy tắc | 3 nội tại mỗi phái; `pas: { stat, v }` với `stat` thuộc 10 chỉ số `PASSIVE_STATS`; giá trị cấp 15 theo bảng `DESIGN_RULES.md` mục 9 |
| Dữ liệu | `skills.js` (`type: 'passive'`), `items/books.js` (`BOOK_GRADE`), `monsters.js` `BOSS_DROPS` (`books(req, ch)`) |
| Gói | `useItem` (sách), `learnSkill` → `me` |
| Module / cửa sổ | `modules/skills` (móc `stats`), `modules/inventory`; `windows/skills.js`, icon khung lục giác |
| Điện thoại | như cửa sổ Kỹ năng |
| Chống gian lận | sách đúng phái, đúng cấp; nội tại không dùng được như chiêu chủ động (`useSkill` chặn) |
| Phần cần nâng | thêm nội tại cấp 120/150 (mục 3.3) |

Tiêu chí chấp nhận: các kiểm tra trong `tests/features/passive.js` đạt (sách rơi từ boss, ST chí mạng 170 khi học nội tại tương ứng, hồi chakra mỗi giây).
Kiểm thử: `tests/features/passive.js`.

### 2.6 `cmb-buffs` — Buff (P3)

| Mục | Nội dung |
|---|---|
| Mục đích | Cho chiêu hỗ trợ và vật phẩm một tác dụng có thời hạn, nhìn thấy được |
| Luồng | dùng chiêu `buff` (cả nhóm trong 250) hoặc ăn món ăn, Bí Kíp Nhân Đôi → biểu tượng ở `#hud-buffs` có đếm ngược → hết hạn tự gỡ |
| Quy tắc | `addBuff(key, name, stat, v, dur)`; cùng khóa thì làm mới; buff `PERSIST_BUFFS` (`exp2`, `food_atk`, `food_def`, `food_hp`) lưu khi thoát, còn lại mất khi thoát |
| Dữ liệu | `constants.js` `PERSIST_BUFFS`, `items/consumables.js` |
| Gói | `me.buffs` |
| Module / cửa sổ | `modules/buffs` (móc `stats`, `playerSecond`), HUD `#hud-buffs` |
| Điện thoại | hàng buff dịch sang phải khi màn hẹp (`DESIGN_RULES.md` mục 8) |
| Chống gian lận | `stat` và `v` lấy từ dữ liệu tĩnh, không từ gói; lôi đài xóa buff khi vào trận |
| Phần cần nâng | hiệu ứng bất lợi (mục 3.1) hiện chung hàng `#hud-buffs` với viền đỏ; ô đếm giờ phân thân (mục 3.2) |

Tiêu chí chấp nhận: món ăn cộng đúng %, buff lưu qua đăng nhập lại, buff hết hạn bị gỡ.
Kiểm thử: `tests/features/endgame.js`, `tests/features/passive.js`, `tests/features/persistence.js`.

### 2.7 `cmb-auto` — Tự động đánh (P2)

| Mục | Nội dung |
|---|---|
| Mục đích | Tôn trọng thời gian người chơi (U5): luyện cấp không cần bấm liên tục, nhất là trên điện thoại |
| Luồng | bấm AUTO (phím F) → nhân vật tự tìm quái trong `autoRange` (mặc định 600), ưu tiên quái nhiệm vụ đang làm (`huntTarget`) → tự dùng buff/hồi máu trước rồi chiêu mạnh nhất sẵn sàng → tự uống bình khi sinh lực dưới `autoHp` (40%) hoặc chakra dưới `autoMp` (25%) → tự nhặt đồ của mình |
| Quy tắc | bỏ qua quái cao hơn mình quá 8 cấp (trừ boss); không bao giờ nhắm người chơi, trừ đối thủ lôi đài; không uống bình trong lôi đài |
| Dữ liệu | `core/store.js` (cài đặt mặc định, lưu trình duyệt) |
| Gói | không có gói riêng: auto gửi đúng các gói người chơi tự bấm (`move`, `skill`, `useItem`, `pickup`) |
| Module / cửa sổ | `game/game.js` (`autoTarget`, `huntTarget`, `updateAuto`, `toggleAuto`), cài đặt trong cửa sổ Cài đặt |
| Điện thoại | nút AUTO nằm ở cụm kỹ năng khi màn thấp |
| Chống gian lận | máy chủ kiểm mọi gói như khi bấm tay; không có treo máy phía máy chủ |
| Phần cần nâng | auto dùng phân thân khi có mục tiêu là quái (mục 3.2); auto không nhắm quái đang đóng băng khi có mục tiêu khác (tránh phí đòn khống chế, mục 3.1); auto coi quái tinh anh là mục tiêu ưu tiên thấp hơn quái nhiệm vụ (mục 3.4) |

Tiêu chí chấp nhận: e2e bật auto hạ được Slime; `test:perf` bật auto vẫn giữ khoảng 60 khung hình/giây.
Kiểm thử: `tests/e2e/e2e.js`, `tests/e2e/perf.js`.

### 2.8 `cmb-monster-ai` — AI quái và boss (P3)

| Mục | Nội dung |
|---|---|
| Mục đích | Quái đủ "sống" để đi cảnh có tay nghề (P3): chủ động, đuổi, bị kéo về chỗ; boss báo trước vùng đánh để né được |
| Luồng | quái đi tuần trong vùng sinh → thấy người trong 120px ngang và nửa chiều cao theo dọc thì đuổi (quét mỗi 400 ms) → đánh theo `atkRange`, `atkCd` → người chạy xa quá 500px hoặc quái bị kéo ra khỏi vùng quá 3,5 giây thì bỏ mục tiêu, quái thường hồi 30% máu |
| Quy tắc | làm chậm: tốc chạy × 0,45, nhịp đánh × 1,4; nghỉ thì quái thường hồi 2%/giây; boss: chiêu đầu sau 2,2 giây vào trận, mỗi chiêu niệm (`bossCast`) rồi mới trúng (`bossSkillHit`, vùng `inBossZone`), dưới 30% máu cuồng nộ (`RAGE`: hồi chiêu × 0,6, niệm × 0,85, nhịp đánh × 0,75, tốc × 1,2); chí mạng quái 3%, boss 10% |
| Dữ liệu | `src/shared/data/monsters.js` (`baseStats`, `LIST`, `BOSSES`, `BOSS_SKILLS`, `RAGE`) |
| Gói | `state` (vị trí, máu), `hit` (đòn quái lên người), `bossCast`, `bossHit`, `mRage`, `mSpawn`, `mDie` |
| Module / cửa sổ | `core/monster.js`, `core/combat.js` (`monsterAttack`, `bossSkillHit`); vẽ `render/monsterart.js`, cảnh báo `onBossCast` ở `game/game.js` |
| Điện thoại | thanh mục tiêu `#hud-target` có thanh niệm chiêu `#tg-cast` |
| Chống gian lận | AI chạy ở máy chủ; vị trí người chơi dùng để tính trúng là vị trí máy chủ đã kiểm (`movement`) |
| Phần cần nâng | hiệu ứng theo loài (mục 3.1), quái tinh anh (mục 3.4) dùng trường riêng từng con thay cho `def`; số liệu sát thương quái theo `specs/balance.md` (tính năng `cmb-balance`, GDD 06) |

Tiêu chí chấp nhận: bot hạ quái và nhận đòn quái; kiểm thử boss niệm, trúng, cuồng nộ đạt; `test:perf` ở bản đồ đông quái giữ khoảng 60 khung hình/giây.
Kiểm thử: `tests/features/combat.js`, `tests/features/boss.js`, `tests/e2e/perf.js`. Kéo về chỗ và làm chậm có kiểm thử hồi quy trong `tests/features/elite.js` (mục 3.4).

### 2.9 `cmb-loot` — Rơi đồ và quyền nhặt (P4, P5)

| Mục | Nội dung |
|---|---|
| Mục đích | Phần thưởng thấy được ngay sau trận; không bị người khác cướp đồ trong lúc mình đang đánh |
| Luồng | quái chết → đồ rơi tại chỗ → 15 giây đầu chỉ chủ (người hạ, hoặc người gây nhiều sát thương nhất với boss) và nhóm của chủ nhặt được → sau đó ai cũng nhặt → 60 giây không ai nhặt thì biến mất; đứng gần trong 18px tự nhặt xu, bật tự nhặt thì nhặt trong 30px |
| Quy tắc | `rollDrops`: xu, trang bị 4,5%, đá cường hóa 3,5%, bình 6%, ngọc `GEM.dropRate`, rương 0,4%; boss có `BOSS_DROPS`; EXP quái thường chia theo `shareExp` (nhóm +12% mỗi thành viên, chênh cấp 0,1/0,5/1,3, người hạ × 1,1, Giờ Vàng × 2); boss chia theo % sát thương, 3 người đầu thêm 20/10/5 lượng, ai trên 2% sát thương thêm 1 |
| Dữ liệu | `monsters.js`, `items/*.js`, `core/map.js` (`OWNER_TIME = 15000`, `ITEM_LIFE = 60000`) |
| Gói | `pickup { id }` → `gAdd` (đồ rơi), `gDel` (đồ đã nhặt hoặc hết hạn), `inv` |
| Module / cửa sổ | `core/combat.js` `killMonster`, `rollDrops`; `core/map.js` `canPick`, `tryPickup`; `modules/movement` (`pickup`) |
| Điện thoại | đồ dưới đất có vòng sáng theo bậc, chạm vào để đi tới nhặt |
| Chống gian lận | `canPick` ở máy chủ; khoảng cách nhặt kiểm ở máy chủ; túi đầy thì không nhặt (đồ vẫn nằm đó, không mất) |
| Phần cần nâng | rơi thêm của quái tinh anh qua móc `monsterKilled` (mục 3.4); đá kinh mạch (mục 3.6) cũng qua móc này, không sửa `rollDrops` |

Tiêu chí chấp nhận: bot hạ quái tự nhặt xu; thú Thỏ Ngọc nhặt món trong bán kính và bỏ qua món của người khác; boss chia lượng theo sát thương.
Kiểm thử: `tests/features/combat.js`, `tests/features/pets.js`, `tests/features/boss.js`.

### 2.10 `cmb-death-revive` — Tử trận và hồi sinh (P3, P5) — cần nâng

**Hiện trạng.**

| Mục | Nội dung |
|---|---|
| Luồng | sinh lực về 0 → hộp thoại tử trận (người hạ, số EXP mất) → "Hồi sinh tại chỗ" (1 Thẻ Hồi Sinh hoặc 1 lượng, sinh lực 60%, chakra ít nhất 30%) hoặc "Về làng" (đầy máu, về làng phái) |
| Quy tắc phạt | chỉ ngoài bản đồ PvP và từ cấp 5: mất 5% EXP cấp hiện tại nếu có điểm hiếu chiến, 1% nếu bị người chơi hạ, còn lại 2%; lôi đài và thách đấu không chết thật |
| Gói | `dead { lost, by }`, `revive { mode: 'here' / khác }` → `revived {}` |
| Module / cửa sổ | `core/combat.js` `killPlayer`; `modules/pk` `revive`; `windows/dialog.js` (hộp tử trận) |
| Thoát khi đang chết | `world` đưa về làng với 1 máu |

**Vấn đề.** (1) Hồi sinh tại chỗ cạnh boss thì có thể bị đánh chết lại ngay trong khung hình đầu, mất thêm 1 lượng. (2) Giá cố định 1 lượng biến hồi sinh tại chỗ thành "nạp tiền để đứng lì" ở boss thế giới, trái P5. (3) Ở Thượng Giới (cấp 120-199) "về làng phái" là đường rất xa.

**Phần cần nâng.**

| # | Thay đổi | Chi tiết |
|---|---|---|
| N1 | Bảo hộ 3 giây sau hồi sinh tại chỗ | `p.guardUntil = now + 3000`; trong thời gian đó `damagePlayer` bỏ qua đòn (chèn **sau** kiểm `p.match`, cạnh luật khu an toàn), quái không chọn làm mục tiêu; người chơi dùng kỹ năng thì bảo hộ hết ngay. Nhân vật nhấp nháy 50% độ mờ (cờ `guard` trong `info`) |
| N2 | Giá hồi sinh tại chỗ leo thang | lần 1/2/3 trở lên trong 10 phút: 1/2/3 lượng; Thẻ Hồi Sinh luôn là 1 thẻ. Đếm ở RAM `p.reviveLog` (mảng mốc thời gian, giữ tối đa 3), không lưu file |
| N3 | Về điểm hồi sinh gần | bản đồ có trường tùy chọn `rv` (id làng) thì "Về làng" đưa tới `rv`; không có thì về làng phái như cũ. `npm run check` kiểm `rv` là bản đồ `town` có thật. Vùng Thượng Giới đặt `rv` về thị trấn vùng (GDD thế giới) |
| N4 | Hộp tử trận ghi giá | `dead { lost, by, cost }` với `cost = { card: 0/1, luong: n }`; nút "Hồi sinh tại chỗ (n lượng)" hoặc "(1 Thẻ Hồi Sinh)" |
| N5 | Lệnh admin `/chet` | tự hạ nhân vật mình để kiểm thử và chụp ảnh |

| Mục mẫu | Nội dung |
|---|---|
| Dữ liệu | `constants.js` thêm `REVIVE = { guard: 3000, win: 600000, cost: [1, 2, 3] }`; `maps.js` trường `rv` |
| Gói | `dead { lost, by, cost }`, `revived { guard }`, `info.guard` |
| Module / cửa sổ | `modules/pk` (`revive`), một dòng ở `core/combat.js` `damagePlayer`, một điều kiện trong quét mục tiêu của `core/monster.js`; `windows/dialog.js` |
| Điện thoại | hai nút xếp dọc, mỗi nút cao 44px; nút hồi sinh tại chỗ là `.primary` |
| Chống gian lận | trừ thẻ/lượng trước khi hồi sinh, thiếu thì từ chối; `mode` chỉ nhận `'here'` hoặc `'town'`; không hồi sinh khi `!p.dead`; bảo hộ không áp trong lôi đài (lôi đài không có chết thật) |

Tiêu chí chấp nhận:

1. Hồi sinh tại chỗ lần 1/2/3 trong 10 phút trừ đúng 1/2/3 lượng; sau 10 phút trở lại 1 lượng; có thẻ thì chỉ trừ 1 thẻ.
2. Trong 3 giây sau hồi sinh tại chỗ, đòn quái và đòn PK không trừ máu; dùng kỹ năng thì bảo hộ hết ngay (đòn tiếp theo trúng).
3. "Về làng" ở bản đồ có `rv` đưa tới đúng `rv`, đầy máu và chakra.
4. Mất EXP đúng 2% / 1% / 5% theo ba trường hợp; dưới cấp 5 và bản đồ PvP không mất.
5. `revive` khi còn sống không làm gì; `mode` lạ coi như `'town'`.

Kiểm thử: `tests/features/death.js` (mới, đơn vị + bot, tài khoản `chettest`), giữ kiểm thử hồi sinh tại chỗ trong `tests/features/boss.js`.

### 2.11 `pvp-pk` — PK cơ bản (P3, P4) — cần nâng

**Hiện trạng.** `pk { on }` bật PK từ cấp 10, không bật trong làng; chế độ PK **không** lưu khi thoát (chủ ý, giữ nguyên). `canPvp(a, b)` theo thứ tự: lôi đài (cùng trận và đang `fight`) → làng thì không → thách đấu nhau thì được → bản đồ PvP thì được (trừ cùng nhóm) → cùng nhóm hoặc cùng gia tộc thì không → `a.pkMode` và cả hai từ cấp 10. Hạ người không bật PK và không có điểm hiếu chiến thì kẻ hạ +1 điểm hiếu chiến (tối đa 99); điểm giảm 1 mỗi 10 phút chơi; có điểm thì chết mất 5% EXP. Tên đỏ khi bật PK hoặc có điểm, biểu tượng điểm ở `#hud-buffs`, thẻ "Hiếu chiến n" ở cửa sổ xem người chơi. Chưa có kiểm thử bot nào.

**Phần cần nâng.**

| # | Thay đổi | Chi tiết |
|---|---|---|
| K1 | Kiểm thử bot | bật/tắt, chặn dưới cấp 10, chặn trong làng, hạ người cộng điểm, chết có điểm mất 5% |
| K2 | Khóa tắt PK 60 giây | sau đòn PvP cuối cùng (gây hoặc nhận), `pk { on: false }` bị từ chối với thông báo số giây còn lại (`p.pkLock`), chống bật đánh rồi tắt ngay để né trả đũa |
| K3 | Bảo vệ tân thủ | không đánh được người thấp hơn mình **quá 20 cấp**, trừ khi người đó đang bật PK hoặc có điểm hiếu chiến. Chèn trong `canPvp` sau luật cùng nhóm/gia tộc, trước dòng `pkMode`; máy khách có bản sao điều kiện ở `game.js` (hàm kiểm đánh người) để không chọn nhầm |
| K4 | Màu tên theo mức | chỉ bật PK, chưa có điểm: cam `#ffb74d`; điểm 1-4: đỏ `#ff5252`; điểm ≥ 5: đỏ thẫm `#ff1744` có viền tối 1px. Ở `drawName` của `game.js`, phối hợp với danh hiệu (`soc-titles`) để không đè chữ |
| K5 | Đếm hạ người | `c.pvpKills` (chỉ tăng khi hạ người ngoài lôi đài, ngoài thách đấu, ngoài bản đồ PvP và người bị hạ từ cấp 10), dọn ở `sanitize`, dùng cho bảng xếp hạng PK (mục 3.5). Tách hẳn khỏi `c.kills` (đang là số quái đã diệt) |

| Mục mẫu | Nội dung |
|---|---|
| Dữ liệu | `constants.js` thêm `PK = { minLv: 10, lock: 60000, protectGap: 20, decay: 600, max: 99 }` (gom số đang rải trong mã) |
| Gói | `pk { on }` → `notice`, `me.pkMode`, `me.pkLock` (ms còn lại) |
| Module / cửa sổ | `modules/pk`; `core/combat.js` `canPvp`, `killPlayer`; `game/game.js` `drawName` và hàm kiểm đánh người |
| Điện thoại | nút PK trong lưới menu như cũ; khi đang khóa, nút hiện số giây |
| Chống gian lận | mọi luật ở `canPvp` máy chủ; máy khách chỉ là bản sao để giao diện không cho chọn nhầm |

Giai đoạn: đặt ở **giai đoạn 4** (cùng danh hiệu, khu PvP tự do, chiến trường) vì màu tên và đếm hạ người dùng chung với `soc-titles`, `pvp-freezone`; lõi PK hiện có đã chạy được từ giai đoạn 1.

Tiêu chí chấp nhận:

1. Bot: dưới cấp 10 bật PK bị từ chối; trong làng bị từ chối; hai bot cấp 30 ngoài làng, A bật PK đánh trúng B; A hạ B (B không bật PK) thì A có 1 điểm hiếu chiến, `pvpKills` +1.
2. A tắt PK trong 60 giây sau đòn cuối bị từ chối; sau 60 giây thì tắt được.
3. Bot cấp 50 bật PK không gây được sát thương lên bot cấp 25 không bật PK; bot cấp 25 bật PK thì bị đánh được.
4. Bot có điểm hiếu chiến chết mất đúng 5% EXP cấp.
5. `npm run test:ui` (2 trình duyệt thật) vẫn đạt; ảnh chụp tên ba màu đúng mức.

Kiểm thử: `tests/features/pk.js` (mới, tài khoản `pktest1`, `pktest2`), `tests/e2e/ui-multiplayer.js`.

---

## 3. Hệ thống mới

### 3.1 `cmb-status` — Hiệu ứng trạng thái theo hệ (P3)

**Mục đích.** Cho mỗi hệ một "cảm giác" khác nhau ngoài con số (Hỏa đốt, Thủy làm chậm và đóng băng, Phong phá giáp), tạo lựa chọn khi phối nhóm và khi đánh boss, đồng thời cho quái và boss một cách gây áp lực có thể né hoặc giải.

**Luồng người chơi.** Kiếm chém trúng quái → 25% quái bị Bỏng (chữ nổi "Bỏng" màu cam, lửa nhỏ trên thân, mất máu mỗi giây). Người chơi đứng trong vùng chiêu Địa Chấn của boss → bị Choáng 1 giây (sao xoay trên đầu, không đi, không ra chiêu). Đồng đội phái Quạt dùng Hồi Xuân Phong → giải Bỏng, Độc, Lạnh Cóng, Phá Giáp, Câm cho người được hồi. Biểu tượng hiệu ứng bất lợi của mình ở `#hud-buffs`, viền đỏ, có đếm ngược; cửa sổ Nhân Vật có dòng "Kháng hiệu ứng: X%".

**Quy tắc, công thức** (tóm `specs/status.md` mục 2.1-2.4, không chép lại bảng):

| Hiệu ứng | Khóa | Loại | Tác dụng |
|---|---|---|---|
| Bỏng | `burn` | sát thương theo thời gian | mỗi giây `v`% tấn công của người gây |
| Trúng Độc | `poison` | sát thương theo thời gian | như Bỏng, thời gian dài hơn, giá trị thấp hơn |
| Lạnh Cóng | `chill` | bất lợi | quái: dùng cơ chế chậm có sẵn; người: giảm `v`% tốc chạy |
| Đóng Băng | `freeze` | khống chế | đứng yên, không ra chiêu; boss miễn nhiễm |
| Choáng | `stun` | khống chế | như Đóng Băng; boss miễn nhiễm |
| Phá Giáp | `armor` | bất lợi | giảm `v`% phòng thủ |
| Câm Lặng | `silence` | bất lợi | chỉ đánh thường được |

- Kháng hiệu ứng người chơi `stRes = min(40, 0,15·(cấp − 1) + 0,03·vit)`; boss 30; quái thường 0. Tỉ lệ dính `ch × (1 − res/100)`; thời gian trên người `× (1 − res/200)`, khống chế trong PvP thêm `× 0,5`.
- Sau khi hết khống chế có 3 giây miễn khống chế (`ccImmune`), chống khóa liên hoàn.
- Cùng loại không cộng dồn: lấy thời hạn và giá trị lớn hơn. Sát thương theo thời gian: không chí mạng, không né, bỏ qua phòng thủ, không hút máu; PvP × 0,45; lên người chơi tối đa 4% sinh lực tối đa mỗi giây.
- `n4`, `n6` bỏ trường `slow` cũ, thay bằng `chill` (cùng cảm giác, nay có kháng).
- Đổi bản đồ, chết, thoát: xóa mọi hiệu ứng (bất biến B5).

**Phần GDD chốt thêm so với đặc tả.**

| # | Chốt | Lý do |
|---|---|---|
| S1 | Kỹ năng hậu kỳ `n11`, `n12`, `n13` dùng `st` Lạnh Cóng thay cho `slow` (giá trị cùng mẫu `n4`/`n6`: `ch: [100, 0]`, `v: [30, 1]`, thời gian giữ như `content/00-foundation.md`) nếu `cmb-status` gộp trước `cmb-skills-199`; nếu gộp sau thì `cmb-status` sửa 3 dòng này | giữ một cơ chế làm chậm duy nhất |
| S2 | Auto (mục 2.7) bỏ qua quái đang bị Đóng Băng/Choáng khi có mục tiêu khác trong tầm, và không dùng chiêu khống chế lên mục tiêu đang miễn khống chế | tránh phí chiêu, giúp nhóm |
| S3 | Hiệu ứng không bao giờ được gây lên người cùng nhóm, cùng gia tộc ngoài bản đồ PvP (dùng chung `canPvp`) | bất biến B2 |
| S4 | Thú cưng và phân thân không gây hiệu ứng (phân thân chỉ đánh thường) | giữ phân thân là "thêm sát thương", không thêm khống chế |

**Dữ liệu.** `src/shared/data/status.js` mới (`STATUS`, `ST_RULES`, `MONSTER_ST`, `bossElemSt`); trường `st` trong `skills.js` và `monsters.js` theo `specs/status.md` mục 2.2-2.3.

**Gói** (`specs/status.md` mục 3.9). `sts { id, s, add, res }` (một thực thể dính, làm mới, hết, được giải hoặc kháng; `res` hiện chữ "Kháng"), `stsAll { list }` (lúc vào bản đồ), `hit.dot` (số sát thương theo thời gian), `me.sts`, `me.s.stRes`, `data.status`, `data.stRules`. Không thêm gì vào gói `state`.

**Module, cửa sổ, DOM.** Module `status` (expose `world.status`, `rules.js` có `defMul`, `isCC`, `isSilenced`); sửa tối thiểu `core/combat.js`, `core/player.js`, `core/monster.js`, `modules/movement` theo `specs/status.md` mục 3.4-3.7; lệnh admin `/st`, `/stm`. Máy khách: `game.js` vẽ icon trên đầu, `render/fx` hình hiệu ứng thân, icon `st_*` trong `render/icons`, `#hud-buffs` dùng lại (không thêm id DOM mới).

**Bố cục điện thoại.** Icon hiệu ứng trên đầu 8×8 (tối đa 3, hơn thì hiện "+n"); ô ở `#hud-buffs` như buff thường, viền đỏ 1px; nút kỹ năng mờ đi và có khóa nhỏ khi bị Câm.

**Chống gian lận.** Bị khống chế thì máy chủ từ chối `move` và `skill` (không tin máy khách tự đứng yên); `st` chỉ đọc từ dữ liệu tĩnh; trạng thái không lưu file nên không có đường nhân bản. Sát thương theo thời gian ghi `dmgBy` của người gây, nên tranh boss vẫn công bằng.

**Tiêu chí chấp nhận.**

1. Đơn vị: tỉ lệ dính với `ch = 100`, `res = 0` là 100%; `res = 40` cho tỉ lệ 60% ± 3% trên 5.000 lần thử.
2. Boss không bao giờ bị Choáng/Đóng Băng; người chơi sau khống chế có 3 giây miễn.
3. Bỏng trên người chơi không vượt 4% sinh lực tối đa mỗi giây; trong PvP nhân 0,45.
4. Người bị Choáng gửi `move` lệch vị trí thì nhận `pos` kéo về; gửi `skill` bị bỏ qua.
5. Hồi Xuân Phong giải đủ 5 hiệu ứng không khống chế.
6. `npm run test:perf` có hiệu ứng trên 30 quái vẫn khoảng 60 khung hình/giây; `tools/shot.js` cổng 3623 không lỗi console.

**Kiểm thử.** `tests/features/status.js` (đơn vị + bot, theo `specs/status.md` mục 6.1), `tools/check-data.js` (khóa `st` hợp lệ, `ch ≤ 100`, `dur ≤ max`), `tests/e2e/perf.js`.

### 3.2 `cmb-clone` — Phân Thân cấp 70 (P3, tính năng đặc sắc)

**Mục đích.** Một kỹ năng "đinh" giữa đường (cấp 70) cho mọi phái: nhìn thấy mình tách làm hai là khoảnh khắc ninja kinh điển; về số, đó là thêm khoảng nửa sát thương đòn thường trong gần một phút mỗi hai phút.

**Luồng người chơi.** Cấp 70 học kỹ năng phân thân của phái → bấm ở bãi luyện → khói màu hệ bung, một ninja giống hệt mình nhưng mờ khoảng 60% và ám màu hệ xuất hiện, tự chạy tới quái gần nhất quanh chủ và đánh bằng đòn thường → ô đếm giờ ở `#hud-buffs` → hết giờ, đổi bản đồ hoặc chết thì tan thành khói. Trong làng hoặc lôi đài bấm thì nhận "Không thể phân thân ở đây."

**Quy tắc** (tóm `specs/clone.md` mục 0, 2.3): 6 kỹ năng `k10/t10/n10/c10/d10/q10`, `req 70`, `type: 'clone'`, hồi chiêu 120 giây; phân thân mang `40 + 2·(cấp − 1)`% tấn công của chủ (cấp 15: 68%), sống `30 + 2·(cấp − 1)` giây (cấp 15: 58 giây); nhịp đánh = nhịp đòn thường × 1,4; không cộng % sát thương kỹ năng, không hút máu, không làm chậm, không gây hiệu ứng (S4). Không có máu, không bị đánh, không đánh người chơi (kể cả bản đồ PvP, lôi đài), không nhặt đồ. Sát thương tính là của chủ (EXP, rơi đồ, nhiệm vụ, xếp hạng boss). Hồi chiêu 120 giây ≥ thời gian tối đa + 30 giây nên không bao giờ có 2 phân thân.

**Dữ liệu.** Khối kỹ năng mới và `CLONE_AI = { scan: 260, scanY: 90, leash: 320, speed: 160, follow: 22, atkSlow: 1.4 }` trong `skills.js`.

**Gói.** Không có hành động mới (dùng `skill`). Máy chủ gửi `cloneAdd { id, o, sid, x, y, dir, left }`, `cloneGone { id, why }`, `cState { c }` (10 lần/giây, chỉ bản đồ có phân thân), `fx` thêm trường `c` (id phân thân), `hit` với `a: 'c<id>'`, `me.clone { sid, until }`.

**Module, cửa sổ, DOM.** Module `clone` (expose `world.clone`), sửa tối thiểu `core/combat.js` (nhánh `type === 'clone'` trong `useSkill`). Máy khách: `drawNinja(ctx, x, y, o)` thêm tham số tùy chọn `o.ghost` (đúng quy tắc chỉ thêm tham số), `FX.clone`, dòng thông tin trong cửa sổ Kỹ năng, ô đếm giờ `#hud-buffs`. Không có cửa sổ mới, không id DOM mới.

**Phần GDD chốt thêm.** Phân thân không tính vào lực chiến (mục 3.5, vì là kỹ năng có thời hạn). Auto dùng phân thân khi đang có mục tiêu là quái và chưa có phân thân (`specs/clone.md` mục 1.6). Với quái tinh anh (mục 3.4), sát thương phân thân vẫn ghi cho chủ nên chủ vẫn là người gây nhiều sát thương nhất.

**Bố cục điện thoại.** Không thêm nút; kỹ năng gán vào thanh như chiêu thường.

**Chống gian lận.** Phân thân chỉ tồn tại ở máy chủ; mọi đòn tính từ `owner.s` lúc đánh; không có đường nào để máy khách tạo hay điều khiển phân thân; kiểm làng và lôi đài ở máy chủ.

**Tiêu chí chấp nhận.**

1. Cấp 70 học được, cấp 69 không; dùng trong làng và lôi đài bị từ chối.
2. Phân thân cấp 1 gây sát thương bằng 40% ± 10% đòn thường của chủ trên cùng mục tiêu (trung bình 200 đòn, không chí mạng).
3. Hết 30 giây (cấp 1) thì `cloneGone`; đổi bản đồ thì `cloneGone` ngay.
4. Bản đồ PvP và PK: phân thân không bao giờ gây sát thương lên người chơi.
5. Quái chết bởi đòn phân thân: chủ nhận EXP, nhiệm vụ tiến độ +1.
6. `tools/shot.js` cổng 3628 máy tính và điện thoại không lỗi console, phân thân mờ đúng màu hệ.

**Kiểm thử.** `tests/features/clone.js` (theo `specs/clone.md` mục 5.1), `tools/check-data.js` (trần `pct ≤ 70`, `dur ≤ 60000`, `cd ≥ dur tối đa + 30000`).

### 3.3 `cmb-skills-199` — Kỹ năng hậu kỳ (P3)

**Mục đích.** Cấp 120-199 (Thượng Giới) cần mốc mở chiêu mới để mỗi vùng có cảm giác mạnh lên, và nội tại mới để sách boss Thượng Giới có giá trị.

**Luồng người chơi.** Cấp 100 mở thần kỹ thứ nhất (học được ngay hôm nay vì cấp tối đa hiện là 120); cấp 120 và 150 mở hai nội tại mới (sách bìa xanh ngọc 150 lượng và hồng 200 lượng, boss Thượng Giới rơi); cấp 130 và 160 mở hai thần kỹ cuối. Icon thần kỹ có vòng viền kim phân biệt.

**Quy tắc** (đặc tả đủ ở `content/00-foundation.md` mục 5.1-5.5, chỉ tóm):

| Nhóm | Id | `req` | `step` | Chuẩn số |
|---|---|---|---|---|
| Thần kỹ 1 | `k11 t11 n11 c11 d11 q11` | 100 | 3 | diện rộng, `mul [6.0, 0.4]`, hồi 22 giây, chakra `[140, 10]` |
| Thần kỹ 2 | `k12 t12 n12 c12 d12 q12` | 130 | 2 | đơn mục tiêu tổng `mul` cấp 15 ≈ 17,4 (Quạt là hồi máu 46%), hồi 30 giây |
| Thần kỹ 3 | `k13 t13 n13 c13 d13 q13` | 160 | 2 | diện rộng bán kính 190, `mul [8.0, 0.55]`, hồi 35 giây |
| Nội tại 4 | `k14 t14 n14 c14 d14 q14` | 120 | 3 | chỉ số trong 10 `PASSIVE_STATS`, giá trị cùng bảng nội tại cũ |
| Nội tại 5 | `k15 t15 n15 c15 d15 q15` | 150 | 2 | như trên |

- Trường mới `step` (2 hoặc 3, mặc định 3) và hàm `skillNeedLv(sk, lv) = req + (step hoặc 3) × (lv − 1)`, để thần kỹ cấp 160 vẫn nâng tới cấp 15 trước cấp 199 (160 + 2·14 = 188).
- Tổng điểm kỹ năng ở cấp 199 là 198, cần 219 để nâng hết một phái (kể cả phân thân): người chơi **phải chọn** (chủ ý, giữ chiều sâu P3).
- Chỉ dùng `fx.k` và đạn có sẵn (`DESIGN_RULES.md` mục 6); icon riêng 18 thần kỹ trong `SKILL_ART`, không có thì vẫn rơi vào hình chung.
- Hiệu ứng trạng thái cho thần kỹ: xem S1 ở mục 3.1.

**Dữ liệu.** `skills.js` (khối `Object.assign` sau tuyệt kỹ cấp 60, trước khối nội tại), `items/books.js` (`BOOK_GRADE` thêm 120 và 150, export), `monsters.js` `BOSS_DROPS` (sách 120/150 cho boss rồng và boss các vùng Thượng Giới).

**Gói.** Không đổi; `data.skills` đã gửi cả object nên máy khách có `step`.

**Module, cửa sổ.** `modules/skills` dùng `skillNeedLv` thay cho `req + cur·3`; `windows/skills.js` 2 chỗ tính cấp cần; `render/icons/skills.js` thêm hình và tham số tùy chọn `divine` cho nền chiêu (không đổi chữ ký `skillIconURL`).

**Bố cục điện thoại.** Cửa sổ Kỹ năng có thêm 5 dòng mỗi phái, cuộn dọc; không đổi thanh kỹ năng (vẫn 3 bộ × 6 ô, đủ chỗ cho 10 chiêu chủ động + đòn thường).

**Chống gian lận.** Học và nâng kiểm ở máy chủ bằng `skillNeedLv`; sách đúng phái đúng cấp; `npm run check` kiểm `step ∈ {2, 3}`, `skillNeedLv(sk, 15) ≤ MAX_LEVEL` khi cấp tối đa là 199.

**Tiêu chí chấp nhận.**

1. Cấp 100 học được `k11`, cấp 99 không; nâng `k11` lên cấp 2 cần cấp 103.
2. Khi `MAX_LEVEL = 199` (tính năng `core-levelcap-199`): `k13` cấp 15 cần đúng cấp 188; học `k15` cần sách và cấp 150.
3. Sát thương `k11` cấp 1 lên bù nhìn không phòng thủ bằng `atk × 6,0 × (1 + skillDmg/100)` ± 10% (dao động).
4. `npm run check` không lỗi: 30 kỹ năng mới có icon, sách 120/150 có boss rơi, `fx.k` hợp lệ.
5. `tools/shot.js` cửa sổ Kỹ năng máy tính và điện thoại không lỗi console, viền kim hiện ở thần kỹ.

**Kiểm thử.** `tests/features/lateskills.js` (mới: đơn vị `skillNeedLv`, bot cấp 100 học `k11` qua `/lv`, bot cấp 150 dùng sách `book_k15` khi cấp tối đa cho phép), `tests/features/endgame.js` giữ nguyên.

### 3.4 `cmb-elite-mobs` — Quái tinh anh (P3, giai đoạn 2)

**Mục đích.** Bãi luyện dễ thành đơn điệu ở hậu kỳ. Thỉnh thoảng một con quái thường "thức tỉnh" thành tinh anh: to hơn, có một chiêu báo trước, đáng đánh vì rơi nhiều hơn. Đây là cơ hội nhỏ cho tay nghề (P3) mà không cần lập nhóm, khác boss (10 phút một lần, cần nhóm). `content/20-monsters.md` chưa có loại quái này; mục này là thiết kế gốc.

**Luồng người chơi.** Đang luyện cấp ở bãi cấp ≥ 15 → thông báo bản đồ "Một con Dơi Pha Lê đã hóa Tinh Anh!" → con quái đó to 1,3 lần, tên vàng "Tinh Anh · Dơi Pha Lê", có hào quang → đánh nó lâu hơn (15-45 giây một mình), nó có một chiêu báo trước vùng đỏ trên đất như boss, chạy ra là né → hạ được thì rơi thêm 3 lượt đồ, 25% có ngọc, EXP gấp 6.

**Quy tắc, công thức.**

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| `minLv` | 15 | quái dưới cấp 15 không hóa tinh anh |
| `chance` | 0,02 mỗi lượt kiểm | kiểm mỗi 30 giây mỗi bản đồ đủ điều kiện |
| `cd` | 300.000 ms | sau khi tinh anh chết, bản đồ chờ 5 phút mới được có con mới |
| Số tinh anh tối đa | 1 mỗi bản đồ | |
| `hp` | × 20 | so với máu quái gốc |
| `atk` | × 1,4 | so với tấn công quái gốc sau `cmb-balance` |
| `def` | × 1,3 | |
| `exp` | × 6 | áp trong `shareExp`, cộng dồn với Giờ Vàng |
| `scale` | 1,3 | chỉ hình vẽ, không đổi vùng chạm quá 30% |
| `rolls` | 3 | gọi thêm 3 lần `rollDrops` thường |
| `gem` | 0,25 | xác suất thêm 1 viên ngọc cấp phù hợp |

- **Ai được hóa:** quái thường còn sống, không có mục tiêu, máu đầy, cấp ≥ 15, ở bản đồ không phải làng, phó bản, bản đồ PvP, lôi đài. Không bao giờ là boss, Tà Thú, quái con do chiêu `summon` gọi ra.
- **Chiêu theo hệ** (`ELITE_SKILLS`, dùng helper có sẵn trong `monsters.js`, mỗi tinh anh một chiêu, hồi chiêu 9 giây, niệm theo mặc định của helper):

| Hệ quái | Chiêu | Helper |
|---|---|---|
| Hỏa | Nộ Viêm Chấn | `quake(80, 1.3)` vòng tròn quanh thân |
| Thủy | Hàn Thủy Khiếu | `roar(110, 30)` làm chậm (cơ chế `bs_slow` có sẵn) |
| Phong | Phong Nhận Tuyến | `beam(180, 1.4)` đường thẳng |
| Không hệ | Dã Thú Chấn | `quake(70, 1.3)` |

- **Không cuồng nộ** (cuồng nộ chỉ của boss). Kéo về chỗ như quái thường, nhưng khi bỏ mục tiêu thì hồi đầy máu (chống thả diều kéo đi nơi khác).
- **Chủ rơi đồ:** người gây nhiều sát thương nhất (như boss), không phải người ra đòn cuối, để người cướp đòn cuối không ăn công.
- Khi tinh anh chết: quái gốc trở lại bình thường lúc hồi sinh (mọi trường riêng bị xóa trong `reset()`).

**Số đo** (`scratchpad/gddwork/lab/cmb/power.js`, hồ sơ trang bị trung bình không ngọc không thú; hồ sơ trung bình đầy đủ của `specs/balance.md` có sinh lực cao hơn 66-93%):

| Quái mẫu | Cấp | Máu tinh anh (× 20) | 1 đòn thường so với sinh lực Kiếm (hồ sơ thiếu) | Ước tính hồ sơ trung bình |
|---|---|---|---|---|
| Đạo Tặc Sa Mạc | 29 | 46.040 | 10,8% | khoảng 6% |
| Dơi Pha Lê | 59 | 163.640 | 13,8% | khoảng 7-8% |
| Tử Thần Kỵ Sĩ | 88 | 345.760 | 15,5% | khoảng 8-9% |
| Long Vệ | 120 | 624.800 | 21,1% | khoảng 11-12% |

Thời gian hạ lý thuyết khoảng 12-13 giây (đòn liên tục, không né), thực tế 20-25 giây khi phải chạy né chiêu: nằm trong dải mục tiêu **một mình 15-45 giây**, **một đòn thường 4-12% sinh lực hồ sơ trung bình**. Hệ số `atk × 1,6` đã thử và bị loại (vượt 12%).

**Dữ liệu.** `src/shared/data/monsters.js` thêm `ELITE` và `ELITE_SKILLS` (export); `tools/check-data.js` kiểm dải `hp 10-30`, `atk 1,2-1,6`, `exp 3-10`, `chance ≤ 0,05`, `cd ≥ 120000`, chiêu tinh anh hợp lệ như chiêu boss (tầm, niệm, hệ số).

**Gói.** Không có hành động mới. Máy chủ: `mSpawn` gửi lại con quái đã hóa (máy khách `addMonster` thay thế theo id) với `pub()` có thêm `elite: 1`; `notice { kind: 'elite' }` cho người cùng bản đồ; chiêu dùng lại `bossCast`/`bossHit`.

**Module, cửa sổ, DOM.**

| Nơi | Việc |
|---|---|
| Module mới `src/server/modules/elite/index.js` | móc `second` (mỗi 30 giây chọn bản đồ đủ điều kiện, tung `chance`, hóa một con), móc `monsterKilled` (rơi thêm, thông báo, đặt `cd` cho bản đồ); lệnh `/tinhanh` (admin, hóa con gần nhất ngay để kiểm thử) đăng ký qua `modules/admin` |
| `core/monster.js` | đọc trường riêng của từng con trước `def`: `this.skills` thay cho `this.def.skills` khi có; `reset()` xóa `elite`, `atk`, `armor`, `skills`, `expMul`; `pub()` thêm `elite` |
| `core/combat.js` | `m.atk` thay cho `d.atk` khi có (`monsterAttack`, `bossSkillHit`); `armor` thay cho `def.def` khi có (tính sát thương lên quái); chủ rơi đồ = người gây nhiều sát thương nhất khi `m.elite`; `expMul` trong `shareExp` |
| `game/game.js` | tên vàng `#f0c869` "Tinh Anh · tên"; thanh mục tiêu `#tg-name` cùng màu; auto ưu tiên tinh anh thấp hơn quái nhiệm vụ |
| `render/monsterart.js` | `drawMonster(ctx, x, y, def, o)` thêm tham số tùy chọn `o.elite` (phóng 1,3 và hào quang vàng mỏng); vùng Quái giữ |

Không thêm id DOM. Không thêm móc mới (dùng `second` và `monsterKilled` có sẵn).

**Bố cục điện thoại.** Thông báo bản đồ một dòng ở `#toasts`; tên "Tinh Anh · tên" rút còn "TA · tên" khi màn ≤ 760px.

**Chống gian lận.** Toàn bộ ở máy chủ; không có gói nào để người chơi gọi tinh anh; chủ rơi đồ theo sát thương nên không cướp đòn cuối được; kéo đi xa thì hồi đầy máu; không có ở phó bản (phó bản có thưởng riêng) nên không nhân thưởng.

**Tiêu chí chấp nhận.**

1. Đơn vị: trên 10.000 lượt kiểm với `chance = 0,02`, tỉ lệ hóa 2% ± 0,5%; không bao giờ có 2 tinh anh cùng bản đồ; không hóa ở làng, phó bản, bản đồ PvP, lôi đài, không hóa boss.
2. Tinh anh có máu đúng × 20, tấn công × 1,4, EXP × 6 khi hạ; sau khi hồi sinh trở lại chỉ số gốc.
3. Hai bot cùng đánh: bot gây nhiều sát thương hơn là chủ rơi đồ dù bot kia ra đòn cuối.
4. `tools/balance.js` (tính năng `dev-balance-tool`): một đòn thường tinh anh 4-12% sinh lực hồ sơ trung bình và thời gian hạ một mình 15-45 giây ở cấp 30, 60, 90, 120 (và 150, 199 khi có Thượng Giới).
5. Hồi quy AI quái thường: bị kéo ra khỏi vùng quá 3,5 giây thì bỏ mục tiêu và hồi 30% máu; bị làm chậm thì tốc × 0,45.
6. `tools/shot.js` máy tính và điện thoại có tinh anh, không lỗi console; `npm run test:perf` không giảm quá 2 khung hình/giây.

**Kiểm thử.** `tests/features/elite.js` (mới: đơn vị thế giới giả + bot `elitetest` dùng `/tinhanh`), `tools/check-data.js`, `tests/e2e/perf.js`.

### 3.5 `cmb-power-score` — Lực chiến và bảng xếp hạng (P4, P5, giai đoạn 4)

**Mục đích.** Một con số duy nhất để người chơi so sánh nhanh (khoe, chọn đồng đội, xem người lạ trước khi PK) và để đội phát triển giám sát độ lệch giữa 6 phái. Kèm 3 bảng xếp hạng mới cho người thích đua top (chân dung "cao thủ" ở GDD 01): Lực chiến, PK, Thú cưng.

**Luồng người chơi.** Cửa sổ Nhân Vật có dòng to "Lực chiến 24.398" dưới chân dung; đổi đồ thì toast "Lực chiến +1.240" (xanh) hoặc "−320" (đỏ); cửa sổ xem người chơi khác có lực chiến của họ; Bảng Xếp Hạng có thêm 3 tab.

**Công thức** (hàm thuần `powerScore(s, lv)` trong `src/shared/formulas.js`):

```text
lực chiến = làm tròn(
    2 × atk × (1 + crit × (critDmg − 100) / 10000) × (1 + skillDmg / 200)
  + 0,3 × maxHp
  + 2,5 × def
  + 1,5 × cấp × (dodge + resist / 4) )
```

- Tính trên chỉ số **không có buff tạm** (buff kỹ năng, món ăn, Bí Kíp Nhân Đôi không tính), không tính thú cưỡi tốc chạy, không tính phân thân. Có tính trang bị, ngọc, thú cưng, thời trang, nội tại, gia tộc, kinh mạch.
- Cách tính trong `Player.recalc`: tách phần "từ bảng tạm ra chỉ số" thành hàm nội bộ, gọi lần hai với `buf` bằng 0 để lấy `p.s.power`. Một lần `recalc` thêm khoảng vài chục phép tính, không đáng kể.
- Lưu `c.power` (số) khi lưu nhân vật để xếp hạng được cả người offline; lúc tải tính lại (không tin số lưu).

**Số đo** (`scratchpad/gddwork/lab/cmb/power.out`, hồ sơ trang bị trung bình, phân bổ tiềm năng 50/20/30, có nội tại):

| Cấp | Lực chiến (thấp nhất đến cao nhất) | Chênh giữa 6 phái |
|---|---|---|
| 10 | 868 | 0% |
| 30 | 2.766 đến 2.934 | 6,1% |
| 60 | 7.512 đến 8.286 | 10,3% |
| 90 | 14.922 đến 16.487 | 10,5% |
| 120 | 23.102 đến 25.202 | 9,1% |

Quạt thấp nhất ở mọi mốc (phái hỗ trợ, phần hồi máu không vào công thức); chênh ≤ 10,5% là chấp nhận được. Công thức thử đầu tiên với trọng số né/kháng `3 × cấp` cho chênh 24-28% nên bị loại.

**Bảng xếp hạng mới.**

| Tab (`data-rktab`) | Xếp theo | Nguồn | Số dòng |
|---|---|---|---|
| `power` | `c.power` | mọi nhân vật | 30 + dòng của mình (`powerMe`) |
| `pvp` | `c.pvpKills` (mục 2.11 K5) | nhân vật có ít nhất 1 | 30 |
| `pet` | cấp rồi EXP thú đang mang (`c.equip.pet.plv`, `pexp`) | nhân vật có thú | 30 |

- Tab "Diệt quái" hiện có (`kills`, đọc `c.kills`) giữ nguyên tên và nghĩa.
- Không xếp nhân vật của tài khoản admin (`ADMINS`) ở các bảng mới (Câu hỏi mở Q1).
- Thêm qua móc `rank` có sẵn: module ghi `world.rankCache.power`, `.pvp`, `.pet`; không sửa `computeRank`.

**Dữ liệu.** `formulas.js` (`powerScore`); không có dữ liệu tĩnh mới.

**Gói.** `me.s.power`; `rank { power, pvp, pet, powerMe }` (thêm trường vào gói có sẵn); `inspect.power`.

**Module, cửa sổ, DOM.** Module mới `src/server/modules/power/index.js` (móc `rank`, `sanitize` cho `c.power`, `selfData`); một chỗ chèn trong `core/player.js` `recalc`; `windows/character.js` (dòng lực chiến), `windows/rank.js` (3 tab, phối hợp chủ của `soc-rank`), `windows/inspect.js`. Không thêm id DOM; tab mới dùng `data-rktab`.

**Bố cục điện thoại.** Bảng Xếp Hạng 7 tab: hàng tab cuộn ngang, mỗi tab cao 44px; lực chiến ở cửa sổ Nhân Vật một dòng chữ 20px.

**Chống gian lận.** Lực chiến chỉ tính ở máy chủ từ dữ liệu lưu; `c.power` lưu chỉ để xếp hạng offline và luôn bị tính lại lúc tải; buff tạm không tính nên không "ăn món ăn để leo bảng".

**Tiêu chí chấp nhận.**

1. Đơn vị: `powerScore` tăng đơn điệu theo từng chỉ số (tăng một chỉ số, giữ chỉ số khác, thì không giảm).
2. Ăn món ăn +10% tấn công không đổi `power`; mặc trang bị tốt hơn thì `power` tăng và có toast.
3. `tools/balance.js` trên hồ sơ trung bình: chênh lực chiến giữa 6 phái ≤ 20% ở cấp 30, 60, 90, 120 (và 150, 199 khi có).
4. Bot: gói `rank` có `power` (≤ 30 dòng, giảm dần), `pvp`, `pet`, `powerMe` đúng hạng của mình; nhân vật admin không xuất hiện.
5. Nhân vật offline vẫn có trong bảng `power` với số đã lưu.
6. `tools/shot.js` Bảng Xếp Hạng máy tính và điện thoại không lỗi console, 7 tab không tràn ngang trang.

**Kiểm thử.** `tests/features/power.js` (mới, tài khoản `powertest`), cập nhật kiểm tra tab ở `tests/e2e/e2e.js` nếu có đọc danh sách tab.

### 3.6 `sig-meridian` — Kinh Mạch (P5, tính năng đặc sắc, giai đoạn 5)

**Mục đích.** Đích dài hạn sau khi đạt cấp tối đa: EXP không bỏ phí mà thành Chân khí để đả thông 8 huyệt, cộng chỉ số thẳng. Biên độ tổng ngang một bộ ngọc cấp 10, không vượt (P5: đường dài nhưng không làm lệch PvP).

**Luồng người chơi** (tóm `specs/meridian.md` mục 1): từ cấp 60 mỗi lần nhận EXP thêm một phần thành Chân khí → nút "Kinh mạch" ở chân cửa sổ Nhân Vật (`.mer-open`) mở cửa sổ ninja ngồi thiền với 8 huyệt → chọn huyệt xem chỉ số, tầng, tỉ lệ, chi phí → "Đả thông" → thành công: hiệu ứng tụ khí người xung quanh thấy được; thất bại: mất đá, xu, một nửa Chân khí, được +5% phúc duyên (tối đa +30%); Hộ Mạch Đan (3 lượng) giữ Chân khí và đá khi thất bại. Đủ 8 huyệt tầng 5: Tiểu Chu Thiên +3% sinh lực; tầng 10: Đại Chu Thiên +8%.

**Quy tắc chính.** 8 huyệt mở ở cấp 60/65/70/75/80/90/100/110, mỗi huyệt 10 tầng; tỉ lệ thành công tầng 1-10: 100/95/85/75/65/55/45/38/32/26%; chi phí Chân khí `12000 × t² × (1 + 0,25·i)`, xu `1500 × t² × (1 + 0,25·i)`; đá Linh Mạch Thạch 3 bậc (rơi từ quái cấp ≥ 55 qua móc `monsterKilled`); tổng 80 tầng cần 69,3 triệu Chân khí. Đủ 80 tầng: sinh lực +3.000, tấn công +480, phòng thủ +285, chakra +1.200, chí mạng +4,5, né +4, chính xác +190, % sát thương kỹ năng +7, % sinh lực +8.

**Phần GDD chốt (lệch đặc tả khi cấp tối đa lên 199, xem ADR-05a-2).**

| # | Chốt | Chi tiết |
|---|---|---|
| M1 | Giữ `capLv = 120` là mốc mở tầng 6-10 | không đổi nghĩa thành "cấp tối đa" |
| M2 | Thêm `shareHi = 0,3` | cấp 120-198: 30% EXP thành Chân khí (không trừ EXP); cấp tối đa (199): 100% |
| M3 | `npm run check` kiểm `capLv ≤ MAX_LEVEL` | tránh khóa tầng 6-10 nếu sau này đổi cấp |
| M4 | Không phím tắt | phím U đã giao cho thú cưỡi (`pet-mountup`); mở từ cửa sổ Nhân Vật |
| M5 | Phí xu trả bằng `payXu` | xu khóa trước, xu thường sau (quy tắc G12 của đợt 3, tính năng `eco-bound`) |
| M6 | Thanh EXP ở cấp tối đa | ghi "Chân khí n" thay cho "MAX" (đặc tả ghi cấp 120, nay là cấp tối đa) |
| M7 | Lực chiến | kinh mạch cộng vào `eq` nên tự vào lực chiến (mục 3.5) |

**Dữ liệu.** `src/shared/data/meridian.js` (`MERIDIAN`, `POINTS`, `qiCost`, `xuCost`, `stoneCost`, `rateOf`, `cleanMeridian`, `meridianBonus`, `meridianClient`), `src/shared/data/items/meridian.js` (đá 3 bậc, Hộ Mạch Đan, loại `meridian`).

**Gói.** `meridianUp { i, protect }` → `meridianResult { i, ok, lv, rate, protect, name, lost }`, `meridianFx { id, ok, c }` (phát cho bản đồ), `me.meridian { qi, lv, luck }`, `data.meridian`.

**Module, cửa sổ, DOM.** Module `meridian` (móc mới `exp` theo đặc tả, một trong 4 móc mới được phép của đợt 3; móc `stats` cộng vào `eq`); sửa tối thiểu `core/player.js` (`gainExp` phát móc `exp`) và `core/world.js` theo `specs/meridian.md` mục 3.1; lệnh admin `/chankhi`, `/kinhmach`; cửa sổ `windows/meridian.js` mở bằng `.mer-open`.

**Bố cục điện thoại.** Cửa sổ một cột: hình ngồi thiền thu nhỏ ở trên (tỉ lệ 2), danh sách 8 huyệt dạng thẻ ở dưới, nút "Đả thông" và ô Hộ Mạch Đan cao 44px.

**Chống gian lận.** Trừ đủ Chân khí, đá, xu trước khi tung tỉ lệ; `i` qua `int()` trong 0-7; cách nhau ≥ 300 ms; `cleanMeridian` ở `sanitize` kẹp mọi số; tung tỉ lệ ở máy chủ; dữ liệu lưu trên nhân vật nên giao dịch, kho không chạm tới.

**Tiêu chí chấp nhận.**

1. Đơn vị: các số đối chiếu của `specs/meridian.md` mục 2.1 đúng (`qiCost(0,1) = 12000`, `qiCost(7,10) = 5500000`, `stoneCost(5) = ['mer_stone2', 2]`).
2. Cấp 59 nhận EXP không có Chân khí; cấp 60 nhận 1.000 EXP được 200 Chân khí; cấp 150 được 300; cấp tối đa được 1.000.
3. Tầng 6 bị từ chối khi chưa cấp 120; tầng 1 huyệt Dũng Tuyền bị từ chối khi chưa cấp 110.
4. Thất bại không có Hộ Mạch Đan: mất đá, xu, nửa Chân khí, phúc duyên +5; có Hộ Mạch Đan: chỉ mất xu và đan.
5. Phí xu trừ xu khóa trước.
6. Đủ 80 tầng: chỉ số cộng đúng bảng, `hpPct` +8; lôi đài không có nguồn hồi máu nào từ kinh mạch.
7. `tools/shot.js` cổng 3630 máy tính và điện thoại không lỗi console.

**Kiểm thử.** `tests/features/meridian.js` (theo `specs/meridian.md` mục 5, tài khoản `kinhmach`), `tools/check-data.js` (mục 5.3 của đặc tả + M3).

---

## 4. Thứ tự chèn vào file lõi dùng chung

Nhiều tính năng cùng chạm `core/combat.js`, `core/player.js`, `core/monster.js`. Thứ tự gộp theo lô của đợt 3 (`specs/PLAN.md`) và giai đoạn của sổ tính năng; mỗi tính năng **Read lại ngay trước khi Edit** (quy tắc làm song song mục 2 của `CLAUDE.md`).

| File | Hàm | Thứ tự chèn (trước → sau) |
|---|---|---|
| `core/combat.js` | `useSkill` (đầu hàm) | `clan-war` → `status` (chặn khi khống chế, Câm) → `clone` (nhánh `type === 'clone'`) |
| `core/combat.js` | `canPvp` | lôi đài (`p.match`) → `clan-war` → `pvp-battlefield` → làng → thách đấu → bản đồ PvP → nhóm/gia tộc → bảo vệ tân thủ (`pvp-pk` K3) → `pkMode` |
| `core/combat.js` | `damagePlayer` | lôi đài (`p.match`) → `clan-war` → `pvp-battlefield` → bảo hộ hồi sinh (`cmb-death-revive` N1) → thách đấu → chết thật |
| `core/combat.js` | sau khi trúng (`hit`) | `status` (gây hiệu ứng) → hút máu |
| `core/combat.js` | `monsterAttack`, `bossSkillHit`, tính sát thương lên quái | `status` (`defMul`) → `cmb-elite-mobs` (`m.atk`, `armor`) |
| `core/combat.js` | `killMonster` | `cmb-elite-mobs` (chủ = sát thương cao nhất, `expMul`) |
| `core/combat.js` | `killPlayer` | `pvp-pk` K5 (`pvpKills`) → móc `playerKilled` (`soc-titles`) |
| `core/player.js` | `recalc` | `status` (`stRes`) → `pet-mountup` → `cmb-power-score` (tính lần hai không buff, **cuối cùng**) |
| `core/player.js` | `gainExp` | `sig-meridian` (móc `exp`) |
| `core/monster.js` | `update`, `reset`, `pub` | `status` (khống chế quái) → `cmb-elite-mobs` (trường riêng) → `cmb-death-revive` N1 (bỏ qua người đang bảo hộ khi quét mục tiêu) |

---

## 5. Tổng hợp gói tin

| Gói | Chiều | Tính năng | Trường |
|---|---|---|---|
| `skill` | khách → chủ | `cmb-skills`, `cmb-clone` | `sid, tid, dir` |
| `learnSkill`, `hotbar`, `hotbarSet` | khách → chủ | `cmb-skills`, `cmb-skills-199` | `sid` / `i, sid` / `n` |
| `addStat`, `resetStats` | khách → chủ | `cmb-potential` | `k, n` / không |
| `pk` | khách → chủ | `pvp-pk` | `on` |
| `revive` | khách → chủ | `cmb-death-revive` | `mode: 'here' / 'town'` |
| `meridianUp` | khách → chủ | `sig-meridian` | `i, protect` |
| `fx`, `hit` | chủ → khách | mọi đòn | `hit` thêm `dot` (status), `res` (Kháng), `a: 'c<id>'` (phân thân) |
| `dead` | chủ → khách | `cmb-death-revive` | `lost, by, cost` (mới: `cost`) |
| `revived` | chủ → khách | `cmb-death-revive` | `guard` (mới) |
| `sts`, `stsAll` | chủ → khách | `cmb-status` | `id, s, add, res` / `list` |
| `cloneAdd`, `cloneGone`, `cState` | chủ → khách | `cmb-clone` | theo `specs/clone.md` mục 3.4 |
| `mSpawn` | chủ → khách | `cmb-monster-ai`, `cmb-elite-mobs` | `pub()` thêm `elite` |
| `bossCast`, `bossHit` | chủ → khách | boss, `cmb-elite-mobs` | dùng lại |
| `rank` | chủ → khách | `cmb-power-score` | thêm `power, pvp, pet, powerMe` |
| `meridianResult`, `meridianFx` | chủ → khách | `sig-meridian` | theo `specs/meridian.md` mục 3.3 |
| `me` | chủ → khách | nhiều | thêm `s.power`, `s.stRes`, `sts`, `clone`, `meridian`, `pkLock` |
| `data` | chủ → khách | nhiều | thêm `status`, `stRules`, `meridian`, `elite` (tên chiêu cho thanh niệm) |

---

## 6. Kế hoạch kiểm thử

| File | Tính năng | Kiểu | Tài khoản / cổng chụp ảnh |
|---|---|---|---|
| `tests/features/combat.js` (có) | `cmb-loot`, `cmb-monster-ai` | bot | có sẵn |
| `tests/features/skills.js` (có) | `cmb-potential`, `cmb-skills` | bot | có sẵn |
| `tests/features/passive.js` (có) | `cmb-classes`, `cmb-stats`, `cmb-passive` | đơn vị + bot | có sẵn |
| `tests/features/boss.js` (có) | boss AI, hồi sinh tại chỗ | đơn vị + bot | có sẵn |
| `tests/features/endgame.js`, `persistence.js` (có) | `cmb-skills`, `cmb-buffs` | bot | có sẵn |
| `tests/features/death.js` (mới) | `cmb-death-revive` | đơn vị + bot | `chettest` |
| `tests/features/pk.js` (mới) | `pvp-pk` | bot 2 người | `pktest1`, `pktest2` |
| `tests/features/status.js` (mới) | `cmb-status` | đơn vị + bot | theo đặc tả; cổng 3623 |
| `tests/features/clone.js` (mới) | `cmb-clone` | đơn vị + bot | theo đặc tả; cổng 3628 |
| `tests/features/lateskills.js` (mới) | `cmb-skills-199` | đơn vị + bot | `lateskill` |
| `tests/features/elite.js` (mới) | `cmb-elite-mobs`, hồi quy AI | đơn vị + bot | `elitetest` |
| `tests/features/power.js` (mới) | `cmb-power-score` | đơn vị + bot | `powertest` |
| `tests/features/meridian.js` (mới) | `sig-meridian` | đơn vị + bot | `kinhmach`; cổng 3630 |
| `tests/e2e/e2e.js`, `perf.js`, `ui-multiplayer.js` (có) | `cmb-auto`, `cmb-skills`, hiệu năng, PK | trình duyệt thật | theo đầu file |
| `tools/check-data.js` (mở rộng) | `st`, `clone`, `step`, `ELITE`, `capLv`, `rv` | kiểm chéo dữ liệu | không |

Mỗi file mới gọi trong `tests/smoke.js` đúng chỗ (phần chạy nối tiếp) theo `CLAUDE.md` mục "Thêm module tính năng mới". `npm test` phải in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`.

---

## 7. Quyết định kiến trúc (ADR)

### ADR-05a-1 — Kỹ năng hậu kỳ: bước cấp 2 và thêm kỹ năng mỗi phái

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, đi cùng `cmb-skills-199` |
| Bối cảnh | `DESIGN_RULES.md` mục 9 ghi "6 kỹ năng + 1 đòn thường mỗi phái, tối đa cấp 15, cấp L cần nhân vật đạt `req + 3·(L − 1)`" và "3 nội tại mỗi phái (req 15, 35, 50)". Với cấp tối đa 199, chiêu mở ở cấp 160 theo bước 3 cần cấp 202 để đạt cấp 15, tức không bao giờ tối đa được; thêm phân thân (`specs/clone.md`) và 5 chiêu/nội tại hậu kỳ thì mỗi phái có 10 chiêu chủ động và 5 nội tại |
| Quyết định | Sửa 2 dòng của `DESIGN_RULES.md` mục 9: kỹ năng thành "10 kỹ năng chủ động + 1 đòn thường mỗi phái (req 1/5/10/20/30/60, phân thân 70, thần kỹ 100/130/160); cấp L cần `req + step·(L − 1)` với `step` 3 (mặc định) hoặc 2 (chiêu từ cấp 130)"; nội tại thành "5 mỗi phái (req 15, 35, 50, 120, 150)", sách 150/200 lượng cho req 120/150. Thêm câu: "Tổng điểm kỹ năng ở cấp tối đa ít hơn tổng cần để nâng hết một phái, người chơi phải chọn". Sửa trong cùng commit gộp `cmb-skills-199` |
| Phương án khác | (a) Giữ bước 3, chấp nhận thần kỹ cấp 160 chỉ tới cấp 14: vướng tiêu chí "tối đa cấp 15" và gây cảm giác thiếu; (b) hạ `req` chiêu cuối xuống 150: dồn mốc mở vào giữa vùng, bỏ trống 150-199; (c) tăng điểm kỹ năng để nâng được hết: mất lựa chọn, mọi người chơi cùng một phái giống nhau |
| Chi phí | thêm 1 trường dữ liệu, 1 hàm dùng chung, 3 chỗ sửa (server 1, cửa sổ 2), kiểm tra dữ liệu thêm 2 luật; không đổi giao thức |
| Hệ quả | chiêu hậu kỳ nâng nhanh hơn chiêu cũ (bước 2), chấp nhận vì người chơi hậu kỳ lên cấp chậm hơn nhiều (`expScale`); tài liệu và cửa sổ Kỹ năng hiện "Yêu cầu nhân vật cấp N" theo `skillNeedLv` |

### ADR-05a-2 — Kinh Mạch khi cấp tối đa lên 199

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, đi cùng `sig-meridian` (sau `core-levelcap-199`) |
| Bối cảnh | `specs/meridian.md` (đã duyệt ở đợt 3) viết khi cấp tối đa là 120: `capLv = 120` vừa là mốc mở tầng 6-10 vừa là "cấp tối đa, 100% EXP thành Chân khí", và phím U mở cửa sổ. Sau `core-levelcap-199` hai nghĩa này tách rời; phím U đã giao cho thú cưỡi (`specs/PLAN.md`) |
| Quyết định | `capLv = 120` chỉ còn nghĩa "mở tầng 6-10"; thêm `shareHi = 0,3` cho cấp 120-198; 100% chỉ ở `MAX_LEVEL`; `npm run check` kiểm `capLv ≤ MAX_LEVEL`; không phím tắt, mở bằng nút `.mer-open`; phí xu qua `payXu`. Sửa đặc tả và dòng "Kinh mạch" của `DESIGN_RULES.md` mục 9 trong cùng commit |
| Phương án khác | (a) Đổi `capLv` thành 199: tầng 6-10 khóa tới cấp tối đa, người chơi 120-198 (phần lớn thời gian hậu kỳ) không tiến được ở kinh mạch; (b) giữ `share = 0,2` tới 198: Chân khí cấp 120-198 quá chậm so với chi phí tầng 6-10; (c) 100% từ cấp 120: người chơi không còn lý do giữ EXP, và Chân khí đầy quá nhanh so với hành trình 45-60 giờ |
| Chi phí | 1 hằng số, 1 nhánh trong hàm chia Chân khí, 1 luật kiểm dữ liệu, sửa đặc tả; không đổi giao thức |
| Hệ quả | Chân khí ở 120-198 nhanh hơn 1,5 lần so với 60-119; tổng 69,3 triệu Chân khí ước tính đạt quanh cấp 190-199 với người chơi trung bình (đo lại bằng `tools/balance.js` khi có đường EXP mới) |

---

## 8. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định (áp dụng nếu không ai trả lời) |
|---|---|---|
| Q1 | Có loại nhân vật của tài khoản admin (`ADMINS`) khỏi 3 bảng xếp hạng mới không? | Có, loại khỏi `power`, `pvp`, `pet`; bảng cũ giữ như hiện tại |
| Q2 | Giá hồi sinh tại chỗ leo thang 1/2/3 lượng trong 10 phút có quá gắt với người đánh boss thế giới? | Giữ 1/2/3 lượng, Thẻ Hồi Sinh luôn 1 thẻ; xem lại sau 2 tuần số liệu |
| Q3 | Bảo vệ tân thủ chênh 20 cấp có áp ở bản đồ PvP và khu PvP tự do không? | Không: chỉ áp ở bản đồ thường với chế độ PK; bản đồ PvP, khu tự do, chiến trường, chiến gia tộc theo luật riêng |
| Q4 | Tỉ lệ tinh anh 2% mỗi 30 giây và chờ 5 phút sau khi chết có hợp với bãi đông người? | Giữ 2% / 30 giây / 5 phút, tối đa 1 con mỗi bản đồ; chỉnh qua `ELITE` không cần sửa mã |
| Q5 | Sau khi đạt cấp tối đa và đủ 80 tầng kinh mạch, có tầng thứ hai (Kỳ Kinh Bát Mạch) không? | Không có trong bản 1.0; Chân khí dư vẫn tích (trần `qiMax`) để dùng cho tính năng sau |
| Q6 | Hiệu ứng trạng thái có còn khi đổi bản đồ không? | Không: đổi bản đồ, chết, thoát đều xóa hết (bất biến B5) |
| Q7 | Có cho tự động đánh chạy ở máy chủ khi người chơi đóng trình duyệt không? | Không: auto chỉ ở máy khách, không treo máy ở máy chủ (bất biến B7) |
| Q8 | Lực chiến có tính phần hồi máu của phái Quạt để thu hẹp chênh lệch? | Không trong bản 1.0; chênh đo được ≤ 10,5% dưới trần 20% của tiêu chí |
| Q9 | Chế độ PK có nên lưu khi thoát? | Không (giữ chủ ý hiện tại): vào game luôn ở chế độ hòa bình |
