# GDD 03 — Đối chiếu tham khảo theo loại cơ chế

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 3: đối chiếu từng **loại cơ chế** của dòng game nhập vai ninja 2D (game tham khảo) với hiện trạng của ta và quyết định cho bản 1.0 |
| Ngày | 18/10/2026 |
| Áp dụng cho | các mục hệ thống `docs/gdd/05-*.md`, cân bằng `06-can-bang.md`, thế giới `07-the-gioi.md`, cốt truyện `08-cot-truyen.md`, kiếm tiền `11-kiem-tien.md`, sổ tính năng (`features.json`) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, `NOTE.md`, mã `src/` (thư mục làm việc ngày 18/10/2026, gồm phần túi mở rộng và âm thanh chưa commit), `docs/gdd/01-tam-nhin.md`, kiểm kê `gddwork/audit-systems.md`, `audit-data.md`, `audit-risk.md`, danh mục `gddwork/catalog.json`, đặc tả đợt 3 `specs/*.md` + `PLAN.md`, đặc tả nội dung cấp 120-199 `content/00-60` |
| Không làm trong mục này | không đặc tả chi tiết hệ thống (đã có mục GDD chủ, liệt kê ở mục 6), không thêm id mới (sổ đăng ký của mục này rỗng: `registry/03.json = []`) |

**Quy tắc bản quyền của mục này.** Game tham khảo chỉ được nhắc chung là "game tham khảo" và chỉ ở mức **loại cơ chế** (ví dụ "cường hóa bằng đá theo dải cấp"). Không có tên trường, phái, làng, NPC, vật phẩm, bản đồ, sự kiện hay boss nào của game khác trong tài liệu này. Mọi tên trong cột "Hiện trạng của ta" và "Quyết định" là tên tự đặt của dự án (Hán-Việt hoặc thuần Việt, theo `DESIGN_RULES.md` mục 9). Chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng.

---

## 0. Cách đọc

### 0.1 Cột của bảng đối chiếu

| Cột | Ý nghĩa |
|---|---|
| **#** | mã dòng `Dnn`, dùng để dẫn từ mục khác (ví dụ "xem 03-D21") |
| **Loại cơ chế** | tên chung của cơ chế, không gắn với game nào |
| **Game tham khảo làm thế nào** | mô tả chung cách dòng game nhập vai ninja 2D trên điện thoại thường làm, kèm điểm yếu mà người chơi hay phàn nàn |
| **Hiện trạng của ta** | **Có** / **Có một phần** / **Thiếu** / **Chờ gộp** (thang ở mục 0.2) + file chính |
| **Quyết định** | **Tương tự** (làm cùng loại cơ chế, số liệu của ta) · **Khác** (làm khác, tốt hơn theo trụ cột) · **Bỏ** (không làm ở 1.0) |
| **Lý do** | trụ cột phục vụ (P1-P5, định nghĩa ở `01-tam-nhin.md` mục 4) và câu giải thích ngắn |
| **Id (mức, GĐ)** | id trong danh mục `catalog.json`, mức MoSCoW, giai đoạn ROADMAP; id đầu tiên là id chính của dòng |

Mục GDD chủ của từng id (nơi có đặc tả đầy đủ theo khuôn mục đích → luồng → quy tắc → dữ liệu → gói → module → điện thoại → chống gian lận → tiêu chí → kiểm thử) ghi ở bảng mục 6.

### 0.2 Thang hiện trạng

| Mức | Nghĩa |
|---|---|
| **Có** | vòng chơi khép kín (server + giao diện + lưu dữ liệu), có kiểm thử, dùng tốt ở cấp 1-120 hiện tại |
| **Có một phần** | chạy được nhưng thiếu chiều sâu, nội dung hoặc kiểm thử so với đích 1.0 |
| **Thiếu** | chưa có dòng mã nào trong `src/`; có thể đã có đặc tả ở `specs/` hoặc `content/` |
| **Chờ gộp** | đã làm nhưng chưa vào nhánh `main` (đang ở thư mục làm việc chưa commit, hoặc nhánh `feat/bag`, `feat/audio`); trạng thái sổ tính năng vẫn `todo` |

Trụ cột viết tắt: **P1** Hồn ninja Việt · **P2** Chạm là chơi · **P3** Đi cảnh có tay nghề · **P4** Giang hồ có bạn · **P5** Công bằng và đường dài. Thứ tự ưu tiên khi xung đột: P5 > P2 > P3 > P4 > P1.

### 0.3 Số liệu tổng hợp

| Chỉ tiêu | Số |
|---|---:|
| Dòng đối chiếu | 57 (38 dòng bắt buộc của khung GDD + 19 dòng thêm, đánh dấu *(dòng thêm)*) |
| Quyết định chính **Tương tự** | 27 (nhiều dòng vẫn kèm điểm **Khác** ở luật, ghi ngay sau trong cùng ô) |
| Quyết định chính **Khác** | 27 |
| Quyết định chính **Bỏ** | 3 (cộng 9 chi tiết bỏ nằm trong dòng Tương tự/Khác, gom ở mục 4) |
| Hiện trạng **Có** | 19 · **Có một phần** 16 · **Thiếu** 21 · **Chờ gộp** 1 |
| Id danh mục được dẫn | 113, tất cả có trong `catalog.json` (lệnh kiểm ở mục 7) |

Quyết định chính là nhãn **đầu tiên** trong ô "Quyết định". Một dòng "Tương tự" nghĩa là giữ loại cơ chế và nhịp chơi quen thuộc; phần "Khác" đi kèm là luật ta đổi để giữ trụ cột.

---

## 1. Bảng đối chiếu

### 1.1 Nhân vật và chiến đấu

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D01 | **Phái và hệ khắc** | người chơi làm tân thủ vài cấp rồi mới chọn phái theo vũ khí; mỗi phái thuộc một hệ, ba hệ khắc nhau theo vòng; đổi phái phải mua vật phẩm bằng tiền nạp | **Có**: 6 phái × 2 giới chọn ngay khi tạo nhân vật (thẻ phái có chỉ số), 3 hệ Hỏa → Phong → Thủy → Hỏa, khắc ×1,15, bị khắc ×0,9, kháng hệ khắc tối đa 50%, 3 làng phái (`src/shared/data/classes.js`, `src/server/core/combat.js` `elementMul`, `src/client/js/main.js` `.class-card`) | **Khác**: chọn phái từ màn tạo nhân vật để vào trận trong phút đầu; không có đổi phái bằng tiền; chiều sâu hậu kỳ bằng **Thức Tỉnh** chọn 1 trong 2 nhánh ở cấp 100 và 150 | P2 (10 phút đầu đã chơi đúng phái), P3 (khắc hệ rõ, sai hệ vẫn đánh được), P5 (không bán đổi phái) | `cmb-classes` (M, 1, đã xong), `sig-thuctinh` (S, 5), `cmb-pvp-balance` (S, 4) |
| D02 | **Tiềm năng** | mỗi cấp cộng điểm vào nhóm chỉ số; tẩy điểm cần vật phẩm hiếm, thường chỉ bán bằng tiền nạp | **Có**: +5 điểm mỗi cấp vào 4 chỉ số Sức mạnh, Nhanh nhẹn, Trí tuệ, Thể lực; tẩy điểm 20 lượng (`src/server/modules/skills` `addStat`, `resetStats`; `ui/windows/character.js`); `resetStats` chưa có kiểm thử bot | **Tương tự**, thêm **Hoán Cốt Đan** kiếm được trong game (rương, cửa hàng gia tộc) và gợi ý cộng điểm theo phái | P3 (thử lối chơi khác), P5 (tẩy điểm không gắn với nạp) | `cmb-potential` (M, 1, đã xong), `eco-consumables-199` (M, 2), `dev-test-coverage` (M, 0) |
| D03 | **Kỹ năng và phân thân** | kỹ năng mở theo mốc cấp, học bằng sách mua/rơi, nâng bằng điểm kỹ năng; ở mốc cấp cao mở kỹ năng **phân thân** tạo bản sao cùng chiến đấu một lúc, dùng được cả khi đánh người | **Có một phần**: mỗi phái 1 đòn thường + 6 chủ động (cấp học tới 60) + 3 nội tại, cấp kỹ năng tối đa 15, 3 bộ thanh kỹ năng × 6 ô (`src/shared/data/skills.js`, `modules/skills`, `ui/windows/skills.js`); **chưa** có phân thân, **chưa** có kỹ năng trên cấp 60 | **Tương tự** cho phân thân (cấp 70, 40% → 68% công của chủ, 30 → 58 giây, hồi 120 giây) nhưng **Khác** ở luật: phân thân **chỉ đánh quái**, không có máu, không vào làng/lôi đài, không đánh người dưới bất kỳ chế độ nào; kỹ năng chủ động học bằng điểm kỹ năng (không phải mua sách), sách chỉ dùng cho nội tại; thêm 3 chủ động (cấp 100/130/160) + 2 nội tại (120/150) mỗi phái | P3 (PvP thắng bằng tay nghề, không bằng số bản sao), P2 (phân thân giúp luyện cấp nhanh trên điện thoại) | `cmb-skills` (M, 1, đã xong), `cmb-passive` (S, 1, đã xong), `cmb-clone` (S, 1), `cmb-skills-199` (M, 1) |
| D04 | Hiệu ứng trạng thái *(dòng thêm)* | kỹ năng gây choáng, đóng băng, bỏng, độc theo hệ; khống chế dài làm PvP thành ai ra đòn trước thắng | **Thiếu**: chỉ có làm chậm từ quái và chiêu boss `roar` (`core/monster.js`); đặc tả `specs/status.md` | **Tương tự** về loại hiệu ứng (Bỏng, Lạnh Cóng, Đóng Băng, Phá Giáp, Choáng, Trúng Độc, Câm Lặng) nhưng **Khác** ở giới hạn: chỉ số "Kháng hiệu ứng", boss miễn khống chế, có biểu tượng đếm ngược ở `#hud-buffs`, kỹ năng hồi máu giải hiệu ứng không khống chế | P3 (hiệu ứng nhìn thấy và phản ứng được) | `cmb-status` (S, 1) |
| D05 | Tu luyện hậu kỳ *(dòng thêm)* | hệ thống tu luyện cộng chỉ số vĩnh viễn bằng tài nguyên tích lũy, vật phẩm tăng tỉ lệ bán bằng tiền nạp; thất bại liên tiếp không được bù | **Thiếu**: đặc tả `specs/meridian.md` | **Khác**: **Kinh Mạch** 8 huyệt × 10 tầng, nạp bằng **Chân khí** tích từ EXP (20% từ cấp 60, 100% ở cấp tối đa) để cấp tối đa vẫn có tiến độ; thất bại cộng **phúc duyên** +5% tỉ lệ (tối đa +30%) nên tiến độ được bảo đảm; vật phẩm bảo hộ chỉ chống mất nguyên liệu, không tăng trần | P5 (đường dài, không bán tỉ lệ) | `sig-meridian` (S, 5) |
| D06 | Tự động đánh *(dòng thêm)* | không có hoặc rất sơ sài, người chơi dùng công cụ tự động bên ngoài; vừa bất công vừa bị khóa tài khoản | **Có**: tự đánh (phím F), tự uống thuốc theo %, tự nhặt, săn đúng quái nhiệm vụ, chỉ chạy ở máy khách, server vẫn kiểm mọi gói (`src/client/js/game/game.js` `toggleAuto`, `updateAuto`, `huntTarget`) | **Khác**: tự động chính chủ, miễn phí cho mọi người; không bao giờ nhắm người chơi ngoài trận đã đồng ý; không chạy khi đóng trình duyệt; EXP lúc vắng mặt có trần qua **Bế quan** | P2 (chơi trên điện thoại không mỏi tay), P5 (không ai lợi thế nhờ công cụ ngoài) | `cmb-auto` (M, 1, đã xong), `sig-bequan` (S, 5), `ops-anticheat` (M, 4) |
| D07 | Tử trận và hồi sinh *(dòng thêm)* | chết mất EXP, có nơi rơi đồ; hồi sinh tại chỗ tốn tiền nạp | **Có**: mất 1-5% EXP, hồi tại chỗ bằng 1 lượng hoặc Thẻ Hồi Sinh, hoặc về làng (`core/combat.js` `killPlayer`, `modules/pk` `revive`, `ui/windows/dialog.js`) | **Tương tự** (giữ mất EXP làm cái giá của sai lầm), không rơi đồ; về làng theo trạm gần nhất của bản đồ | P3, P5 (quà và đồ không bao giờ mất) | `cmb-death-revive` (M, 1, đã xong), `world-home` (M, 2) |

### 1.2 Trang bị và rèn

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D08 | **Trang bị theo bậc** | mỗi khoảng 10 cấp một bậc đồ, đồ chia theo phái và theo giới; đồ cấp cao rơi từ boss/hang hoặc ghép từ nguyên liệu | **Có một phần**: 9 ô × 12 bậc (Gỗ → Thánh, cấp 1-110), vũ khí riêng phái, giáp và trang sức dùng chung, 5 độ hiếm có 0-5 dòng phụ (`src/shared/data/items/equipment.js`, `items/base.js`); thiếu bậc 12-19 | **Tương tự** nhịp bậc 10 cấp (20 bậc tới cấp 190); **Khác**: không chia đồ theo giới, hình nhân vật đổi theo bậc đồ đang mặc, **Thần binh vùng** ghép từ 30 mảnh của vùng Thượng Giới | P3, P5 (không có đồ "chết", mọi bậc có nguồn), P1 (ngoại hình theo bậc) | `gear-equipment` (M, 3, đã xong), `gear-tier-199` (M, 3), `char-tier-outfit` (M, 1) |
| D09 | **Cường hóa** | +1 tới mức trần bằng đá theo dải cấp, tỉ lệ giảm dần; thất bại có thể tụt cấp hoặc **mất đồ**; bùa bảo hộ chủ yếu bán bằng tiền nạp; đồ cao phát sáng | **Có**: +1 → +16, 4 loại đá (Sơ/Trung/Cao/Thần theo dải 4 cấp), tỉ lệ 100% → 4%, từ +4 thất bại tụt 1 cấp trừ khi dùng Bùa Bảo Hộ, **không bao giờ mất món**, từ +10 báo toàn máy chủ (`src/server/modules/smith`, `UPGRADE` trong `items/equipment.js`, `ui/windows/smith.js`) | **Tương tự** về nhịp hồi hộp; **Khác**: không có kết quả mất món, Bùa Bảo Hộ có nguồn trong game, không thêm đá mới cho hậu kỳ (Đá Thần thêm nguồn), hào quang theo mốc +X | P5 (không mất công sức vì một lần xui), P1 (hào quang dễ nhìn) | `gear-upgrade` (M, 3, đã xong), `art-enhance-aura` (S, 3) |
| D10 | **Ghép đá** | đặt nhiều đá cấp thấp và tiền vào lò, tỉ lệ ra đá cấp cao phụ thuộc lượng đặt; kết quả khó đoán | **Thiếu**: `NOTE.md` yêu cầu; đặc tả `specs/crafting.md` mục 3.2 | **Khác**: công thức cố định **3 → 1** với tỉ lệ công khai theo cấp đá, phí xu, tối đa 10 lần mỗi lượt, thất bại trả lại 2 viên; giá kỳ vọng một đá Trung (~2.850 xu) cao hơn giá Lò Rèn (2.500 xu) nên không thành nguồn lãi | P5 (minh bạch, không mở đường in tiền) | `gear-smith-plus` (S, 3), `gear-crafting` (S, 3) |
| D11 | **Tách cường hóa** | hạ cấp cường hóa của món để lấy lại một phần đá đã dùng | **Thiếu**: `NOTE.md` yêu cầu; đặc tả `specs/crafting.md` mục 3.3 ("Tách đồ") | **Khác**: phá món trong túi (đã gỡ hết ngọc) lấy **Tinh Thiết** + hoàn 30% số đá **danh nghĩa** (không tính lần thất bại), có phí xu; vòng "cường hóa → tách" luôn lỗ; nhu cầu "giữ cấp khi đổi đồ" do D12 đáp ứng | P5 (xả đồ thừa, hút xu, không lãi) | `gear-smith-plus` (S, 3) |
| D12 | **Chuyển cường hóa** | chuyển cấp cường hóa từ món cũ sang món mới, cần vật phẩm chuyển hóa thường bán bằng tiền nạp; có nơi giữ nguyên cấp | **Thiếu**: đặc tả `specs/crafting.md` mục 3.4 | **Khác**: chỉ giữa hai món **cùng ô**, món nhận cùng bậc hoặc cao hơn, món nguồn từ +2; mất 1 cấp (từ +10 mất 2), tốn lượng + xu, món nguồn về +0; không cần vật phẩm nạp | P5 (lên đồ mới không mất trắng nhưng vẫn có hút) | `gear-upgrade-transfer` (S, 3) |
| D13 | **Tinh luyện** | dùng nguyên liệu hiếm luyện thêm hoặc đổi dòng chỉ số cho đồ cao cấp, có nơi vượt mức chỉ số gốc | **Thiếu**: dòng phụ `it.o` đã có (`rollOptions` trong `items/equipment.js`); đặc tả `specs/crafting.md` mục 3.5 ("Tẩy luyện") | **Khác**: chỉ **quay lại dòng phụ** trong bể chỉ số sẵn có của bậc và độ hiếm, được giữ 1 dòng (tốn thêm lượng), đổi ngay (không có trạng thái "xem trước rồi giữ cũ" để khai thác), không bao giờ vượt trần | P5 (không bán chỉ số vượt trần) | `gear-refine` (C, 3) |
| D14 | **Ngọc khảm** | món cấp cao có lỗ khảm cộng chỉ số, ghép ngọc lên cấp, đục thêm lỗ bằng vật phẩm bán bằng tiền nạp | **Có**: 6 loại × 10 cấp, 1-3 lỗ theo bậc, không khảm trùng loại, gỡ tốn xu, ghép 3 → 1 tỉ lệ 100% → 25%, thất bại mất 1 viên; 45 kiểm tra (`src/server/modules/gems`, `items/gems.js`, `tests/features/gems.js`) | **Tương tự** (giữ nguyên); **Bỏ** đục thêm lỗ ở 1.0 (số lỗ theo bậc cố định) | P5, P3 | `gear-gems` (S, 3, đã xong) |
| D15 | **Đồ đặc biệt nâng bằng danh vọng** | món đặc biệt (trang sức, áo choàng) chỉ đổi và nâng cấp bằng điểm danh vọng từ PvP và nhiệm vụ, là thước đo thâm niên | **Có một phần**: điểm danh vọng `c.arena.fame` đã tích từ lôi đài (`modules/arena`), **chưa** có chỗ tiêu; cửa hàng danh vọng nằm trong `specs/battlefield.md` | **Khác**: danh vọng **chung** lôi đài + chiến trường, món đổi bằng danh vọng là **đồ khóa**, giới hạn lượt theo tuần, chỉ số nằm trong trần của bậc tương ứng | P4 (thưởng cho người tham gia hoạt động chung), P5 (không giao dịch được nên không thành hàng nạp) | `gear-fame` (S, 4), `pvp-battlefield` (S, 4) |
| D16 | Rương ngẫu nhiên *(dòng thêm)* | rương may mắn bán bằng tiền nạp, tỉ lệ không công khai, có món vượt trần | **Có**: Rương Báu rơi từ quái, phó bản, điểm danh, mở ra xu, đá, trang bị, thời trang 7 ngày, lượng (`modules/inventory` `openChest`) | **Khác**: tỉ lệ nằm ở bảng dữ liệu `LOOT` và hiện trong cửa sổ, rương vùng và hộp lễ hội cùng một khung; không có rương bán chỉ số vượt trần | P5 (minh bạch) | `gear-chest` (S, 3, đã xong), `eco-loot-tables` (S, 3) |

### 1.3 Thú và ngoại hình

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D17 | **Thú cưỡi** | thú cưỡi tăng tốc chạy và chỉ số, nuôi bằng thức ăn lên cấp; loài hiếm chỉ có qua nạp hoặc sự kiện, tốc độ chênh lệch lớn | **Có một phần**: 5 thú cưỡi, tốc +15% → +35% cộng **ngoài** trần 60% (tổng ≤ 100%), server giữ tốc cũ 2,5 giây khi tháo (`src/shared/data/items/fashion.js`, `render/sprites/mount.js`); thiếu cấp, tiến hóa | **Tương tự**: thú cưỡi vĩnh viễn có cấp 1-30, 3 bậc tiến hóa đổi ngoại hình; **Khác**: tốc có trần cứng (DESIGN_RULES mục 9), loài hiếm ghép từ mảnh rơi boss; 20 loài | P1 (khoe ngoại hình), P2 (đi lại nhanh trên bản đồ rộng) | `pet-mount` (M, 5, đã xong), `pet-beasts` (M, 5), `pet-mountup` (S, 5) |
| D18 | **Thú cưng** | thú đi theo cộng chỉ số, vài con nhặt đồ; thú mạnh nhất bán bằng tiền nạp | **Có một phần**: 6 thú, cấp 1-50 theo EXP chủ, thân mật giảm dần, đói thì dỗi, 3 loại thức ăn, 2 kỹ năng tự động (Tha Đồ, Hồi Xuân), hào quang theo cấp (`src/shared/data/pets.js`, `modules/pets`, `render/petart.js`) | **Khác**: thú có tính cách (thân mật, dỗi), 8 kỹ năng **hỗ trợ** (hồi chakra, hộ chủ, vồ quái chủ đang đánh, chiêu tài, giải hiệu ứng) không đánh người; đổi hình thái ở cấp 20/40 **không** đổi chỉ số; 25 loài | P1, P4 (thú là chuyện để khoe và kể) | `pet-pets` (M, 5, đã xong), `pet-beasts` (M, 5), `pet-mountup` (S, 5) |
| D19 | **Thời trang** | thời trang cộng chỉ số đáng kể, có hạn hoặc vĩnh viễn, chủ yếu bán bằng tiền nạp | **Có một phần**: 3 ô (mặt nạ, áo choàng, y phục) + ô thú cưỡi, chỉ số nhỏ có trần (`expPct` ≤ 10, `hpPct` ≤ 8, chí mạng/né ≤ 3), bản 7 ngày tự gỡ khi hết hạn, không giao dịch bản có hạn (`modules/fashion`, `items/fashion.js`) | **Khác**: chỉ số thời trang luôn dưới trần nhỏ; mẫu theo 7 lễ hội Việt; tủ ngoại hình, nhuộm màu, hào quang bộ là thuần ngoại hình | P1 (bản sắc), P5 (không bán chỉ số) | `pet-fashion` (S, 5, đã xong), `pet-wardrobe` (C, 6), `pet-appearance-fx` (C, 6), `mon-spend-cap` (M, 3) |
| D20 | Pháp bảo sau lưng *(dòng thêm)* | cánh hoặc pháp bảo sau lưng cộng chỉ số lớn, bán theo gói nạp | **Thiếu**: đặc tả `specs/mountup.md` (ô mới `wing`, 4 món) | **Tương tự** về hình (cánh, vòng kiếm sau lưng kể cả khi cưỡi thú); **Khác**: chỉ số cố định trong trần, có nguồn trong game | P1, P5 | `pet-mountup` (S, 5) |

### 1.4 Kinh tế

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D21 | **Tiền khóa** | loại tiền khóa nhận từ nhiệm vụ và quà, chỉ tiêu ở NPC, không giao dịch | **Thiếu**: đặc tả `specs/bound.md` (`c.xuk`, cờ `it.b`, `payXu`, `gainXuk`, `canTransfer`) | **Tương tự** (xu khóa trả phí NPC trước, xu thường sau); **Khác**: có cả **vật phẩm khóa** (huy hiệu ổ khóa, chồng khóa và chồng thường không gộp), mua bằng lượng ra đồ khóa, không có cách mở khóa; quy tắc G12 áp cho mọi tính năng mới (thưởng kiểu nhiệm vụ → khóa, thưởng sự kiện/PvP → thường) | P5 (chặn rửa tiền và nhân vật phụ cày quà) | `eco-bound` (M, 3) |
| D22 | **Chợ ký gửi** | đăng bán vật phẩm qua NPC hoặc khu chợ, người khác tìm và mua; có nơi không thu phí nên chợ thành chỗ tích trữ | **Thiếu**: đặc tả `specs/market.md` | **Tương tự** (ký gửi qua NPC Chưởng Quỹ ở mỗi làng); **Khác**: phí đăng bằng xu không hoàn + **thuế 5%** (hút xu), 48 giờ, hết hạn tự về hộp thư, bán bằng xu hoặc lượng, cấm đồ khóa/có hạn, lịch sử 30 giao dịch, tìm kiếm gõ không dấu | P4 (kinh tế giữa người chơi), P5 (có hút, không mất đồ) | `eco-market` (S, 3) |
| D23 | **Giao dịch** | giao dịch 1-1 hai bước; lừa đảo phổ biến do tráo món phút chót; không có nhật ký | **Có**: đứng gần ≤ 250 px, từ cấp 5, ≤ 10 món + xu, khóa rồi xác nhận, so khớp từng món (kể cả ngọc, cấp thú) lúc chốt, cấm đồ có hạn, cấm khi đang lôi đài (`src/server/modules/trade`, `ui/windows/trade.js`, `tests/e2e/ui-multiplayer.js`) | **Tương tự** (giữ); thêm **mật khẩu cấp 2** khóa giao dịch, nhật ký kiểm toán chỉ ghi thêm, chặn đồ khóa | P4, P5 | `soc-trade` (M, 4, đã xong), `ops-account-security` (S, 8), `ops-audit-log` (M, 3), `eco-bound` (M, 3) |
| D24 | Cửa hàng NPC và cửa hàng lượng *(dòng thêm)* | cửa hàng tiền thường và cửa hàng tiền nạp; cửa hàng nạp bán đồ mạnh nhất, gói không giới hạn | **Có**: Tiệm Thuốc (14 món xu + 39 món lượng), Lò Rèn (trang bị 4 bậc đầu, đá, ngọc cấp 1) (`modules/shop`, `items/shops.js`); chưa chia tab, chưa có quầy lượng riêng | **Khác**: quầy **Kỳ Trân Các** chỉ bán tiện ích, ngoại hình, gói ưu đãi **giới hạn lượt** theo tuần; không bán chỉ số vượt trần; cửa hàng tự xếp tab theo loại vật phẩm | P5 (không bán sức mạnh), P2 (tìm hàng nhanh) | `eco-shop-npc` (M, 3, đã xong), `eco-shop-tabs` (S, 3), `mon-luong-shop` (S, 3), `mon-spend-cap` (M, 3) |
| D25 | Nạp tiền và cấp đặc quyền *(dòng thêm)* | nạp thẻ đổi tiền cao cấp; cấp đặc quyền theo tổng nạp cộng chỉ số và quyền lợi | **Thiếu** (có chủ ý): lượng chỉ đến từ nhiệm vụ, boss, điểm danh, sự kiện, giftcode | **Bỏ** cấp đặc quyền cộng chỉ số; nạp tiền thật là `C` ở giai đoạn 8 và cần ADR riêng; thẻ tháng (nếu có) không cộng chỉ số | P5 (người chăm không thua người nạp) | `mon-topup` (C, 8), `mon-monthly-card` (C, 8), `mon-spend-cap` (M, 3) |
| D26 | Mở rộng túi và kho *(dòng thêm)* | mở rộng túi, kho bằng tiền nạp | **Chờ gộp**: túi 40 ô, mở rộng bằng lượng 6 lần × 10 ô (tối đa 100), chia trang 40 ô, hủy nhanh nhiều món, hộp xác nhận tự làm (`modules/inventory` `invExpand`, `discardMany`; `ui/windows/inventory.js`; có trong thư mục làm việc chưa commit, gốc ở nhánh `feat/bag`); thủ kho 60 ô **Có** (`modules/storage`) | **Tương tự** (mở rộng bằng lượng kiếm được trong game); kho mở rộng, cất xu, kho chung tài khoản ở mức `C` | P2 (bớt dọn túi trên điện thoại) | `ui-bag-expand` (S, 0), `ui-bag-bulkdrop` (S, 0), `ui-ask-dialog` (M, 0), `gear-storage` (M, 3, đã xong), `gear-storage-plus` (C, 3) |

### 1.5 Xã hội và gia tộc

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D27 | **Nhóm** | nhóm khoảng 6 người, cộng EXP theo thành viên, nhặt đồ chung; tìm nhóm bằng kênh chat | **Có**: 6 người, trưởng nhóm mời/mời ra, +12% EXP mỗi thành viên cùng bản đồ, HUD nhóm có bản đồ từng người (`src/server/modules/party`, `ui/windows/party.js`, `#hud-party`); `partyLeave`, `partyKick` chưa có kiểm thử | **Tương tự**; thêm bảng **tìm nhóm** và **luật chia đồ** (lần lượt, ngẫu nhiên, trưởng nhóm) | P4 | `soc-party` (M, 4, đã xong), `soc-party-plus` (S, 4) |
| D28 | **Gia tộc** | lập tộc bằng tiền, nhiều chức, góp quỹ lên cấp, kỹ năng tộc; sau khi lập thì ít việc chung | **Có một phần**: lập từ cấp 15 + 50.000 xu, 3 chức, nhường chức tự động, góp xu lên cấp 1-10, +1% EXP mỗi cấp, sức chứa 20 + 5·cấp, thông báo tộc (`src/server/modules/clan`, `ui/windows/clan.js`); 7/8 hành động chưa có kiểm thử | **Tương tự** khung; **Khác**: mỗi ngày 3 **nhiệm vụ tộc**, **điểm cống hiến** cá nhân (rời tộc là mất), cửa hàng tộc giới hạn lượt, 5 **trận pháp** nâng bằng quỹ tộc cộng chỉ số cho cả tộc | P4 (tộc có việc mỗi ngày) | `clan-core` (M, 0), `clan-war` (S, 4), `dev-test-coverage` (M, 0) |
| D29 | **Tộc Địa gia tộc** | bản đồ riêng của tộc mở theo ngày, có boss/quái cho thành viên, cần vật phẩm để mở; đồ quý về tay người đánh đòn cuối | **Thiếu**: đặc tả `specs/clanwar.md` mục 4.4, boss cấp cao ở `content/50-worldboss-events.md` mục 5 | **Tương tự** (tộc trưởng hoặc trưởng lão mở 1 lần/ngày, bản đồ `lanhdia` riêng); **Khác**: boss 3 bậc theo cấp tộc + 2 bậc cấp 140/180, mọi thành viên có mặt nhận cống hiến, chia theo đóng góp, không theo đòn cuối | P4 | `clan-war` (S, 4), `pve-clanboss` (S, 4) |
| D30 | **Gia tộc chiến** | các tộc đăng ký đánh nhau theo lịch tuần, hạ địch và chiếm điểm; bản lớn có công thành giữ thành thu thuế | **Thiếu**: đặc tả `specs/clanwar.md` mục 4.5 | **Tương tự** (thứ Ba, Năm, Bảy; đăng ký tới 21:15, đánh 21:30-21:45 giờ Việt Nam; 3 lá cờ; hạ địch +10, chiếm cờ +20, giữ +3 mỗi 5 giây); **Khác**: lịch không chồng sự kiện có boss/HUD khác; công thành hằng tuần để ở mức `C` | P4, P3 | `clan-war` (S, 4), `clan-siege` (C, 5) |
| D31 | **Xếp hạng** | bảng xếp hạng cấp, tài phú, gia tộc, lực chiến; thưởng top | **Có**: top 30 cấp theo tổng EXP, top 20 gia tộc, top 20 diệt quái, top 30 lôi đài + hạng của mình (`src/server/modules/rank`, `core/world.js` `computeRank`, `ui/windows/rank.js`) | **Tương tự**; thêm **lực chiến**, PK, thú cưng; **Bỏ** bảng tài phú | P4; P5 (bảng tài phú khuyến khích tích trữ và mua bán bằng tiền thật) | `soc-rank` (S, 4, đã xong), `cmb-power-score` (S, 4) |
| D32 | Danh hiệu, thành tựu, kẻ thù *(dòng thêm)* | danh hiệu cộng chỉ số, có danh sách kẻ thù để trả thù | **Thiếu**: đặc tả `specs/titles.md` (móc mới `playerKilled`, `progress`) | **Tương tự**; chỉ danh hiệu đang đeo mới cộng chỉ số; mở rộng thành **Sổ Nhẫn Giả** sưu tầm quái, vật phẩm, thú | P4, P5 | `soc-titles` (S, 4), `sig-sonhangia` (S, 5) |
| D33 | Chat và an toàn giao tiếp *(dòng thêm)* | kênh thế giới tốn tiền hoặc vật phẩm, nhiều tin rác, ít công cụ chặn | **Có một phần**: 5 kênh (bản đồ, thế giới từ cấp 5 và 8 giây/tin, nhóm, gia tộc, mật) + lệnh nhanh (`src/server/modules/chat`, `#hud-chat`); thiếu chặn, lọc từ, báo cáo | **Khác**: kênh thế giới miễn phí có nhịp giới hạn; thêm chặn người chơi, lọc từ, báo cáo vi phạm (bắt buộc cho 1.0) | P4, P5 | `soc-chat` (M, 4, đã xong), `soc-chat-safety` (M, 4) |
| D34 | Bạn bè, sư đồ, kết duyên *(dòng thêm)* | bạn bè, sư đồ, kết hôn có quà và kỹ năng đôi | **Có một phần**: bạn bè tối đa 50, báo online/offline (`src/server/modules/friends`); chưa có sư đồ, kết nghĩa, kết duyên | **Tương tự**; kỹ năng đôi chỉ hỗ trợ, không cộng chỉ số PvP | P4 | `soc-friends` (S, 4, đã xong), `soc-nhanduyen` (S, 5) |

### 1.6 PvP

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D35 | **Chiến trường 2 phe** | mỗi tối mở chiến trường, người chơi vào một trong hai phe, điểm theo hạ địch, đổi điểm lấy vật phẩm; chênh cấp lớn nên người yếu bị hạ liên tục | **Thiếu**: đặc tả `specs/battlefield.md` | **Khác**: 19:50 đăng ký, 20:00-20:30 đánh; chia theo **khung cấp** (30-59, 60-89, 90-120, mở rộng tới 199), mỗi phòng ≤ 40 người, hai phe **cân theo tổng cấp**; 3 cứ điểm có cờ; chết hồi ở doanh trại sau 5 giây, không mất EXP, không rơi đồ; MVP mỗi phe; danh vọng chung với lôi đài | P3 (thắng bằng phối hợp và tay nghề), P4 | `pvp-battlefield` (S, 4) |
| D36 | **Lôi đài** | đấu 1-1 có cược tiền hoặc thách đấu tự do; xếp hạng theo số trận thắng nên cày được bằng cách đấu người yếu | **Có**: Elo khởi đầu 1.000, K = 32, ghép theo cửa sổ Elo nới dần, phòng riêng `loidai#n`, hồi đầy máu, cấm bình và hồi máu, hết giờ chia % máu theo mức lúc vào trận, 3 trận tính điểm mỗi cặp mỗi ngày, bỏ trận bị khóa 60 giây, thưởng tuần qua thư; 47 kiểm tra (`src/server/modules/arena`, `ui/windows/arena.js`, `tests/features/arena.js`) | **Khác** (đã làm): Elo chống cày điểm, chống bơm điểm giữa một cặp; thêm **đấu đội 3-3** và xem trận | P3, P4 | `pvp-arena` (S, 4, đã xong), `pvp-arena-3v3` (S, 5), `pvp-duel` (S, 4, đã xong) |
| D37 | **Khu PK tự do** | bản đồ hoặc chế độ PK tự do; giết người tăng điểm ác, tên đỏ, **chết rơi đồ**, nhà giam | **Có một phần**: bật PK từ cấp 10 ngoài làng, cùng nhóm/tộc không đánh nhau, điểm hiếu chiến +1 mỗi lần giết người không bật PK (giảm 1 mỗi 10 phút), người có điểm mất 5% EXP khi chết; Đấu Trường là bản đồ `pvp: true` chưa có luật riêng; chế độ PK không lưu khi thoát (`src/server/modules/pk`, `core/combat.js` `canPvp`, `src/shared/data/maps.js`) | **Khác**: **không rơi đồ**; khu PK có giờ mở, thưởng riêng, **tên đỏ** và **truy nã**; **Bỏ** nhà giam; người mới không bị kéo vào PK (chế độ PK tắt khi vào lại game) | P3, P4, P5 (đồ không mất) | `pvp-pk` (S, 1), `pvp-freezone` (C, 4), `cmb-pvp-balance` (S, 4) |
| D38 | Thách đấu *(dòng thêm)* | thách đấu tại chỗ, thường kèm cược tiền | **Có**: cùng bản đồ, ngoài làng, thua còn 1 máu, không mất EXP (`modules/pk` `duelReq`, `duelAccept`) | **Tương tự**; **Bỏ** cược tiền | P4; P5 (cược là đường chuyển tiền khó kiểm) | `pvp-duel` (S, 4, đã xong) |

### 1.7 PvE

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D39 | **Hang động theo mốc cấp** | mỗi khung cấp có hang riêng, giới hạn lượt vào mỗi ngày, đánh quái lấy nguyên liệu, có hạng theo thời gian vượt | **Thiếu**: đặc tả `specs/dungeons.md` (module `caves`, bản đồ `cave_thachnhu`, `cave_hanbang`, `cave_luyenguc`) | **Tương tự** (khung cấp, lượt/ngày); **Khác**: 3 độ khó Thường/Khó/Ác mộng mở dần, 2 lượt/hang/ngày, 5 đợt + boss có chiêu báo trước, thưởng lượng lần đầu mỗi độ khó, vượt Ác mộng báo toàn máy chủ | P3 (độ khó theo tay nghề), P4 (đi nhóm) | `pve-caves` (S, 2) |
| D40 | **Phó bản nhóm nhiều ải** | phó bản nhóm nhiều ải liên tiếp, mỗi ải một boss, giới hạn theo tuần | **Có một phần**: Hang Động Thử Thách (nhóm, cấp 10, 3 lượt/ngày, 5 đợt quái + boss, 10 phút, cấp theo trung bình nhóm) (`src/server/modules/dungeon`) | **Tương tự**: phó bản nhiều ải theo dải cấp, boss riêng mỗi ải; **Khác**: thêm **Tháp Vô Tận** leo tầng có bảng xếp hạng tuần; bí cảnh bố cục ngẫu nhiên ở mức `C` | P3, P4 | `pve-dungeon` (S, 5, đã xong), `pve-dungeon-multi` (S, 5), `pve-thapvotan` (S, 5), `pve-bicanh-phuchu` (C, 5) |
| D41 | **Boss thế giới theo giờ** | boss xuất hiện ở bản đồ cố định theo giờ, đồ quý về người đánh đòn cuối hoặc nhóm đông nhất; cả máy chủ dồn một chỗ nên giật và tranh chấp | **Có một phần**: 11 boss bản đồ hồi sinh 10 phút, 2-3 chiêu niệm có cảnh báo vùng, cuồng nộ dưới 30%, chia EXP theo % sát thương, top 3 nhận lượng (`core/monster.js`, `core/combat.js` `bossSkillHit`, `game/game.js` `onBossCast`); **chưa** có boss thế giới theo giờ | **Khác**: **Hung Tinh Giáng Thế** 5 khung/ngày (09, 13, 17, 19, 23 giờ), mỗi khung 9 boss cùng lúc theo dải cấp ở 9 bản đồ khác nhau, máu theo số người đủ cấp đang online, thưởng theo **hạng sát thương** (≥ 0,5% máu là có quà), người vượt cấp không có hạng; chiêu báo trước; cần chia khu (D50) | P3 (né đòn quyết định), P4 (chia theo đóng góp) | `pve-boss-field` (M, 1, đã xong), `pve-worldboss` (S, 6), `world-channels` (S, 5) |
| D42 | **Tà thú** | thú dữ sự kiện xuất hiện rải rác ở nhiều bản đồ, ai gặp trước hạ trước, đồ quý về một người | **Có**: 3 Tà Thú, mỗi 2 giờ (giờ chẵn) phút 30, báo trước 5 phút, tồn tại 20 phút, thưởng theo hạng sát thương, túi đầy thì gửi thư; 39 kiểm tra (`src/server/modules/events`, `ui/windows/event.js`, `tests/features/boss.js`) | **Khác** (đã làm): một boss báo trước toàn máy chủ + tự tìm đường tới, thưởng theo đóng góp; thêm Tà Thú cấp 130/160/190 | P4 | `pve-tathu` (S, 6, đã xong), `pve-tathu-199` (S, 6) |
| D43 | Phòng thủ làng *(dòng thêm)* | quái công thành theo đợt vào giờ cố định, thưởng theo số quái hạ | **Thiếu**: đặc tả `specs/dailies.md` mục 1.2 | **Khác**: **Thủ Hộ Làng** 12:00 và 21:00, làng xoay vòng, bảo vệ Linh Thạch 100 điểm bền, 5 đợt (đợt 5 có tướng), thưởng theo đóng góp, người offline nhận quà qua thư | P4 | `evt-village-defense` (S, 6) |

### 1.8 Sự kiện và dịch vụ

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D44 | **Lễ hội** | mỗi dịp lễ có vật phẩm rơi, đổi quà, thời trang lễ có chỉ số, đua top nạp | **Có một phần**: khung mùa tự bật/tắt theo ngày, quái rơi vật phẩm sự kiện, NPC Sứ Giả đổi quà có giới hạn (`src/server/modules/season`, `SEASONS` trong `extras.js`, `ui/windows/season.js`); 1/7 lễ (Lễ Hội Trăng Rằm 2026) | **Tương tự** (rơi vật phẩm, đổi quà); **Khác**: lấy phong tục Việt, mỗi mùa có 3 Việc lễ hội/ngày, trang trí làng và hạt bay theo mùa, một mùa tại một thời điểm, thời trang lễ dưới trần, **không** đua top nạp | P1 (lễ Việt quanh năm), P4 | `evt-season-core` (M, 6, đã xong), `evt-tet` (M, 6), `evt-valentine` (M, 6), `evt-304` (M, 6), `evt-he` (M, 6), `evt-trungthu` (M, 6), `evt-halloween` (M, 6), `evt-noel` (M, 6) |
| D45 | **Điểm danh** | điểm danh ngày và tháng, quà mốc, thêm quà riêng cho người nạp | **Có**: chu kỳ 7 ngày lặp, chuỗi liên tiếp, mỗi chu kỳ 15 lượng + 18.000 xu + vật phẩm (`src/server/modules/checkin`, `ui/windows/checkin.js`) | **Tương tự**; lịch tháng có **bù ngày** ở mức `C`; quà là xu khóa/đồ khóa | P2, P5 | `evt-checkin` (S, 6, đã xong), `evt-login-rewards` (C, 6), `eco-bound` (M, 3) |
| D46 | **Vòng quay** | vòng quay may mắn tốn tiền nạp, không giới hạn lượt, tỉ lệ ẩn | **Có**: 11 ô, 10.000 xu hoặc 2 lượng mỗi lượt, có thời trang 7 ngày (`src/server/modules/wheel`, `WHEEL`) | **Khác**: tỉ lệ công khai trong cửa sổ, **giới hạn lượt/ngày** và mốc tích lũy (mức `C`), quà khóa | P5 | `evt-checkin` (S, 6, đã xong), `evt-login-rewards` (C, 6) |
| D47 | **Giftcode** | mã quà theo sự kiện, nhập trong game, mỗi tài khoản hoặc nhân vật một lần | **Có**: mã cố định có hạn + mã tạm của admin, dùng một lần theo **tài khoản**, khóa thử sai (`src/server/modules/mail` `redeem`, `GIFTCODES` trong `extras.js`) | **Tương tự** (đã làm) | P5 | `soc-mail` (M, 4, đã xong) |
| D48 | Hộp thư hệ thống *(dòng thêm)* | thư hệ thống, quà có thể mất khi túi đầy hoặc thư hết hạn | **Có**: 30 thư, giữ 30 ngày, ≤ 6 món/thư, nhận cho người offline; quà không bao giờ mất (túi → thư → kho → máy chủ giữ hộ `c.pending`) (`modules/mail`, `ui/windows/mail.js`, 59 kiểm tra) | **Khác** (đã làm) | P5 | `soc-mail` (M, 4, đã xong) |
| D49 | Giờ nhân đôi và lịch sự kiện *(dòng thêm)* | giờ nhân đôi EXP cố định; sự kiện rải rác, nhiều cái chồng giờ nhau | **Có một phần**: Giờ Vàng ×2 EXP 12-13 giờ và 20-22 giờ viết cứng trong `src/server/core/world.js` (`GOLDEN_HOURS`), chưa có cửa sổ lịch | **Khác**: lịch là dữ liệu (`calendar.js`), cửa sổ Lịch Sự Kiện 3 tab, thêm Giờ Vàng 09-11 giờ cuối tuần, các sự kiện có boss/HUD **không chồng giờ** | P2 (biết trước để sắp thời gian), P4 | `evt-calendar` (S, 6), `ui-notify-center` (S, 7) |

### 1.9 Thế giới và nhiệm vụ

| # | Loại cơ chế | Game tham khảo làm thế nào | Hiện trạng của ta | Quyết định | Lý do | Id (mức, GĐ) |
|---|---|---|---|---|---|---|
| D50 | **Chia khu bản đồ** | mỗi bản đồ có nhiều khu (kênh) với sức chứa, người chơi tự chọn; boss có ở từng khu; bạn bè dễ lạc khu | **Thiếu**: mỗi bản đồ một `GameMap` (`src/server/core/world.js`, `core/map.js`); chỉ lôi đài có phòng riêng `loidai#n` | **Khác**: khu chỉ tự mở khi bản đồ đông (trần mềm 40, trần cứng 60 người), nhóm và gia tộc **ưu tiên cùng khu**, khu trống 5 phút tự đóng, đổi khu ở cửa sổ bản đồ; kèm lọc gói `state` theo khung nhìn (ADR-R-3 ở `audit-risk.md`, chốt ở mục GDD vận hành) | P2 (giữ 60 khung hình khi đông), P4 (không lạc bạn) | `world-channels` (S, 5), `ops-state-culling` (S, 5) |
| D51 | **Dịch chuyển** | xe/NPC chở giữa các làng tốn tiền; vật phẩm dịch chuyển tới bản đồ bất kỳ, thường bán bằng tiền nạp | **Có**: NPC dịch chuyển giữa 3 làng (miễn phí dưới cấp 20, sau đó 300 xu), Cuộn Về Làng, bản đồ thế giới dạng tranh + **tự tìm đường** liên bản đồ và nhảy bục (`src/server/modules/movement` `teleport`, `src/client/js/game/pathfind.js`, `ui/worldmap.js`) | **Khác**: tự tìm đường đi bộ qua cổng là cách chính (bản đồ có ý nghĩa, gặp người trên đường); Phu Xe có lối tắt tới cổng mỗi vùng Thượng Giới; về làng theo trạm gần nhất; **không** bán dịch chuyển tức thời tới bãi bất kỳ | P2, P4 | `world-teleport` (M, 2, đã xong), `world-worldmap` (S, 2, đã xong), `world-home` (M, 2), `world-upper` (M, 2) |
| D52 | **Nhiệm vụ chính** | chuỗi nhiệm vụ dẫn từ cấp 1 tới trần, thưởng EXP và đồ; nhiều đoạn chỉ là đi lại nói chuyện, không nói rõ địa điểm | **Có một phần**: 51 nhiệm vụ cấp 1-118, 7 kiểu (`talk, kill, collect, level, visit, upgrade, dungeon`), tự hoàn thành theo trạng thái, thưởng vũ khí đúng phái, phím T tự đi tới mục tiêu (`src/shared/data/quests.js`, `modules/quest`, `game/pathfind.js` `questDest`) | **Tương tự** (chuỗi dẫn đường tới trần); **Khác**: mỗi nhiệm vụ nói rõ địa điểm và tự tìm đường, id ổn định để chèn dải mới không lệch tiến độ, thưởng xu khóa/đồ khóa; chính tuyến **Bát Phương Thiên Ấn** đưa tổng lên 124 nhiệm vụ tới cấp 199 | P1 (cốt truyện riêng), P2, P5 | `quest-main` (M, 2, đã xong), `quest-main-199` (M, 2), `quest-main-gap` (S, 2), `quest-lore` (S, 2), `ops-data-migration` (M, 2) |
| D53 | **Nhiệm vụ phụ** | nhiệm vụ phụ rải ở NPC, thưởng nhỏ, ít gắn cốt truyện | **Thiếu** | **Khác**: chuỗi **Kỳ Duyên** 40 chuỗi ở 8 vùng Thượng Giới, mỗi chuỗi gắn truyện của vùng | P1 | `quest-kyduyen` (S, 2) |
| D54 | **Nhiệm vụ hằng ngày** | nhiệm vụ diệt quái lặp có giới hạn lượt/ngày, thêm lệnh truy bắt kẻ đầu sỏ; thưởng tiền thường nên nhân vật phụ cày được | **Có một phần**: Tiểu Nhị giao diệt N quái hợp cấp, 20 lượt/ngày, mỗi 5 lượt +1 Rương Báu; chưa có kiểm thử bot (`modules/quest` NPC `task`, `game/pathfind.js` `dailyDest`) | **Khác**: **Việc Làng** 4 kiểu (thu thập, đưa thư, săn bảo vật, hộ tống), 10 việc/ngày, chuỗi +10% thưởng mỗi bậc (tối đa +90%), mốc việc thứ 3/6/10; **Lệnh Truy Nã** 3 lệnh/ngày theo vùng; thưởng xu khóa/đồ khóa | P2 (phiên 10 phút có ý nghĩa), P5 (không cày tiền bằng nhân vật phụ) | `quest-daily-task` (M, 0), `quest-dailies` (S, 2), `quest-truyna` (S, 2) |
| D55 | Hướng dẫn tân thủ *(dòng thêm)* | trang hướng dẫn chữ dài hoặc chuỗi bấm bắt buộc | **Thiếu**: có tự đi theo nhiệm vụ nhưng chưa có bước chỉ dẫn | **Khác**: chỉ tay theo bước, mở dần tính năng theo cấp, bỏ qua được | P2 | `ui-tutorial` (S, 2) |
| D56 | Liên máy chủ *(dòng thêm)* | gộp hoặc nối nhiều máy chủ cho sự kiện đỉnh | **Thiếu** (có chủ ý) | **Bỏ** ở 1.0: vượt mục tiêu 300 người online trên một tiến trình | P5 (ổn định trước) | `ops-cross-server` (W, 8) |
| D57 | Mua bán bằng tiền thật giữa người chơi *(dòng thêm)* | người chơi mua bán đồ và tài khoản bằng tiền thật ngoài game, game không kiểm soát, lừa đảo nhiều | **Thiếu** (có chủ ý) | **Bỏ**; giảm động cơ bằng tiền khóa, đồ khóa, không có bảng tài phú, nhật ký kiểm toán | P5 | `mon-rmt` (W, 8), `eco-bound` (M, 3), `ops-audit-log` (M, 3) |

---

## 2. Bảo chứng cho các quyết định "Khác"

Một quyết định "làm khác" chỉ có giá trị nếu đo được. Bảng dưới gom các bất biến cần có kiểm thử. Mục GDD chủ của từng id viết đặc tả và kiểm thử chi tiết; mục này chỉ chốt **cái gì phải đúng**. File kiểm thử ghi "(mới)" là file đặc tả đã đặt tên nhưng chưa có trong `tests/features/`.

| # | Bất biến | Cách đo (đạt khi) | Kiểm thử | Dòng | Id |
|---|---|---|---|---|---|
| K01 | Cường hóa thất bại không bao giờ làm mất món | bot thử `upgrade` 500 lần ở +4 → +16 không dùng Bùa: số món trong túi + trang bị không đổi, `it.p ≥ cấp trước − 1` sau mỗi lần | `tests/features/skills.js` (bổ sung ca) | D09 | `gear-upgrade` |
| K02 | Ghép, tách, chuyển cấp không sinh lãi | ghép đá: chi phí kỳ vọng một đá cấp N+1 ≥ giá Lò Rèn của nó; tách: số đá hoàn ≤ 30% số đá danh nghĩa; chuyển: tổng cấp hai món sau ≤ trước − 1 | `tests/features/crafting.js` (mới), `npm run check` | D10-D12 | `gear-smith-plus`, `gear-upgrade-transfer` |
| K03 | Tẩy luyện không vượt trần, không có trạng thái treo | 1.000 lần `craftReroll`: mọi dòng `it.o` nằm trong bể chỉ số của bậc/độ hiếm; không có gói "giữ dòng cũ" | `tests/features/crafting.js` (mới) | D13 | `gear-refine` |
| K04 | Xu khóa và đồ khóa không rò sang người khác | `tradeSet`, `mkSell` với đồ có `it.b` bị từ chối; không hành động nào làm `c.xu` tăng từ `c.xuk`; bán NPC đồ khóa chỉ ra xu khóa | `tests/features/bound.js` (mới) | D21, D45, D52, D54 | `eco-bound` |
| K05 | Chợ có hút và không mất đồ | người bán nhận đúng `giá − ⌊giá·5%⌋`; phí đăng không hoàn; hai người mua cùng lúc chỉ một người thành công; hàng hết hạn về thư hoặc nằm chờ trả khi hộp thư đầy | `tests/features/market.js` (mới) | D22 | `eco-market` |
| K06 | Phân thân không đánh người | bật PK, thách đấu và Đấu Trường: phân thân gây 0 sát thương lên người chơi; không triệu hồi được trong làng và lôi đài | `tests/features/clone.js` (mới) | D03 | `cmb-clone` |
| K07 | Boss thế giới chia theo đóng góp | mọi người gây ≥ 0,5% máu boss đều có quà; người đánh đòn cuối không có thưởng riêng; người vượt cấp không có hạng | `tests/features/worldboss.js` (mới) | D41 | `pve-worldboss` |
| K08 | Chiến trường cân phe | trong mỗi phòng, chênh tổng cấp hai phe ≤ cấp của người cao nhất phòng; không người nào ở phòng sai khung cấp; chết không mất EXP và không đổi túi đồ | `tests/features/battlefield.js` (mới) | D35 | `pvp-battlefield` |
| K09 | Lôi đài chống cày điểm | tổng Elo hai bên sau trận không đổi; trận thứ 4 trong ngày của một cặp không tính điểm | `tests/features/arena.js` (đã có, giữ đạt) | D36 | `pvp-arena` |
| K10 | PK không làm mất đồ | sau khi bị hạ trong PK hoặc khu PK, `inv` và `equip` của người chết không đổi; chỉ mất EXP theo luật | `tests/features/pk.js` (mới, thuộc `dev-test-coverage`) | D07, D37 | `pvp-pk`, `pvp-freezone` |
| K11 | Tốc chạy và chỉ số ngoại hình có trần | `npm run check` báo lỗi nếu thú cưỡi có `spd` > 35, tổng tốc > 100%, thời trang/pháp bảo/đồ danh vọng vượt mức chặn | `tools/check-data.js`, `tests/features/fashion.js` | D15, D17, D19, D20 | `pet-beasts`, `pet-mountup`, `gear-fame`, `mon-spend-cap` |
| K12 | Tỉ lệ ngẫu nhiên công khai | mọi rương, hộp, vòng quay mở theo bảng dữ liệu (`LOOT`, `WHEEL`) và cửa sổ hiện tỉ lệ; `npm run check` kiểm tổng trọng số > 0 và mọi vật phẩm tồn tại | `tools/check-data.js`, `tests/features/daily.js` | D16, D46 | `eco-loot-tables`, `evt-login-rewards` |
| K13 | Quà không bao giờ mất | mọi nguồn thưởng mới đi qua túi → thư → kho → giữ hộ; ca túi đầy + hộp thư đầy vẫn giữ quà ở `c.pending` | `tests/features/mail.js` (đã có, mở rộng cho mỗi nguồn mới) | D43, D48 | `soc-mail` |
| K14 | Tự động đánh không nhắm người chơi | E2E bật tự động đánh ở bản đồ PvP có người chơi khác bật PK: không gói `skill` nào có `tid` là người chơi | `tests/e2e/e2e.js` (bổ sung ca) | D06 | `cmb-auto` |
| K15 | Chia khu giữ trần người mỗi khu | bot đưa 70 người vào một bản đồ thường: không khu nào > 60 người; thành viên cùng nhóm cùng khu | kiểm thử bot của `world-channels` (tên file do mục GDD chủ đặt) + `npm run test:perf` | D50 | `world-channels` |

---

## 3. Đánh giá theo nhóm

| Nhóm | Dòng | Tương tự | Khác | Bỏ | Nhận xét |
|---|---|---:|---:|---:|---|
| Nhân vật và chiến đấu | D01-D07 | 4 | 3 | 0 | khung chiến đấu đã đủ; khác biệt nằm ở luật PvP (phân thân không đánh người, hiệu ứng có kháng), tu luyện hậu kỳ có bảo đảm tiến độ và tự động chính chủ |
| Trang bị và rèn | D08-D16 | 3 | 6 | 0 | nhóm khác biệt nhiều nhất: mọi thao tác rèn đều minh bạch, không mất món, không lãi, không bán vượt trần |
| Thú và ngoại hình | D17-D20 | 2 | 2 | 0 | giữ loại cơ chế quen thuộc, chặn chỉ số bằng trần dữ liệu |
| Kinh tế | D21-D26 | 4 | 1 | 1 | tiền khóa + chợ có thuế là hai trụ của kinh tế; cấp đặc quyền nạp bị bỏ |
| Xã hội và gia tộc | D27-D34 | 7 | 1 | 0 | giữ khung quen thuộc nhưng gia tộc phải có việc mỗi ngày; an toàn giao tiếp là bắt buộc |
| PvP | D35-D38 | 1 | 3 | 0 | ghép theo cấp và Elo, không rơi đồ |
| PvE | D39-D43 | 2 | 3 | 0 | thưởng theo đóng góp, chiêu báo trước, chia khu khi đông |
| Sự kiện và dịch vụ | D44-D49 | 3 | 3 | 0 | lễ Việt, lịch không chồng giờ, tỉ lệ công khai |
| Thế giới và nhiệm vụ | D50-D57 | 1 | 5 | 2 | tự tìm đường thay dịch chuyển trả tiền; nhiệm vụ ngày đa dạng, thưởng khóa |
| **Tổng** | 57 | **27** | **27** | **3** | |

---

## 4. Những gì ta cố ý không làm

Gom các chi tiết **Bỏ** (cả dòng và bên trong dòng) để các mục GDD khác không vô tình đưa lại. Làm lại bất kỳ mục nào cần ADR.

| Chi tiết bỏ | Dòng | Vì sao | Trụ cột bảo vệ |
|---|---|---|---|
| Cấp đặc quyền theo tổng nạp có cộng chỉ số | D25 | người chăm thua người nạp; trái định nghĩa công bằng của 1.0 | P5 |
| Cường hóa thất bại làm vỡ hoặc mất món | D09 | mất công sức nhiều tuần vì một lần xui; là lý do bỏ game hàng đầu ở dòng game này | P5 |
| Chết khi PK rơi đồ trên người | D07, D37 | quà không bao giờ mất; rơi đồ biến PK thành trộm, đẩy người mới khỏi bãi luyện | P5, P4 |
| Nhà giam cho người tên đỏ | D37 | khóa người chơi khỏi nội dung là phạt quá nặng; tên đỏ + truy nã đủ răn đe | P4 |
| Cược tiền trong thách đấu | D38 | đường chuyển tiền giữa nhân vật khó kiểm, dễ dùng rửa tiền | P5 |
| Bảng xếp hạng tài phú | D31 | khuyến khích tích trữ và mua bán tiền thật | P5 |
| Đục thêm lỗ ngọc | D14 | số lỗ theo bậc đủ chiều sâu; đục lỗ thường là hàng nạp | P5 |
| Đổi phái bằng vật phẩm trả tiền | D01 | mọi phái mở từ đầu; Thức Tỉnh cho chiều sâu hậu kỳ | P5 |
| Đồ chia theo giới | D08 | gấp đôi số món, không thêm lối chơi; hình nhân vật đã vẽ theo giới | P2 |
| Dịch chuyển tức thời tới bãi bất kỳ bằng vật phẩm | D51 | bản đồ mất ý nghĩa, người chơi không gặp nhau | P4 |
| Liên máy chủ | D56 | vượt mục tiêu tải 1.0 | P5 |
| Mua bán bằng tiền thật giữa người chơi | D57 | rủi ro pháp lý, lừa đảo | P5 |

Mục này **không** đề xuất ADR mới vì không quyết định nào phá quy tắc `CLAUDE.md` hay `DESIGN_RULES.md`. Hai quyết định có dính tới quy tắc đã có ADR ở chỗ khác: chia khu bản đồ đổi bất biến "một id bản đồ = một thể hiện" (ADR-R-3 trong `gddwork/audit-risk.md`, chốt ở mục GDD vận hành `10-ky-thuat-van-hanh.md`); âm thanh từ file tự tạo (ADR-01-1 ở `01-tam-nhin.md`).

---

## 5. Kết luận: khác biệt chiến lược

Đối chiếu 57 loại cơ chế cho thấy ta **không cần phát minh loại cơ chế mới** để có một game ninja đủ đầy: gần như mọi thứ người chơi dòng game này quen (phái khắc hệ, cường hóa +16, ngọc khảm, thú cưỡi, gia tộc, lôi đài, chiến trường, hang theo cấp, lễ hội, giftcode) đều đã có hoặc đã có đặc tả. Khác biệt nằm ở **luật** của từng cơ chế. Năm hướng sau là chiến lược, mọi mục GDD khác phải giữ:

1. **Công bằng là sản phẩm chứ không phải lời hứa (P5).** Ở game tham khảo, phần lớn cơ chế rèn và ngoại hình là chỗ bán sức mạnh: bùa bảo hộ, vật phẩm chuyển cường hóa, đục lỗ, tinh luyện vượt trần, thời trang chỉ số lớn, cấp đặc quyền. Ta giữ nguyên **loại** cơ chế (người chơi vẫn có cảm giác rèn đồ hồi hộp) nhưng đổi luật: không mất món, tỉ lệ công khai, mọi thao tác rèn đều không sinh lãi, chỉ số ngoại hình có trần trong dữ liệu và `npm run check` chặn. Tiền khóa + đồ khóa cắt đường nhân vật phụ cày quà để bán. Vì vậy 6/9 dòng nhóm trang bị là "Khác", 3 dòng còn lại (bậc đồ, cường hóa, ngọc khảm) giữ nhịp quen thuộc nhưng cũng bỏ kết quả mất món và hàng nạp.
2. **Thưởng theo đóng góp, không theo đòn cuối (P4).** Boss thế giới, Tà Thú, ải boss của gia tộc, thủ hộ làng đều chia theo hạng sát thương hoặc đóng góp, người vượt cấp không lấy được hạng. Đây là điều kiện để boss chung là hoạt động **của cả máy chủ** thay vì cuộc tranh đòn cuối giữa vài người mạnh nhất.
3. **Ghép người đúng tầm (P3).** Lôi đài bằng Elo, chiến trường theo khung cấp và cân tổng cấp hai phe, hang có độ khó, phân thân không đánh người, hiệu ứng khống chế có kháng và boss báo trước vùng đánh. Người chơi trung bình thắng được bằng tay nghề; game tham khảo thường để chênh lệch cấp/đồ quyết định.
4. **Tôn trọng thời gian trên điện thoại (P2).** Tự động đánh chính chủ thay công cụ ngoài, tự tìm đường thay dịch chuyển trả tiền, lịch sự kiện cố định theo giờ Việt Nam không chồng nhau, nhiệm vụ ngày đa dạng có mốc, chia khu khi đông để giữ 60 khung hình. Ta không bắt người chơi online liền nhiều giờ hay trả tiền để bớt mỏi tay.
5. **Hồn Việt ở mọi lớp tên và lịch (P1).** Cùng loại lễ hội và thời trang như game tham khảo, nhưng 7 lễ lấy từ phong tục Việt, tên Hán-Việt/thuần Việt tự đặt, NPC xưng "ta - ngươi"; không mượn bất kỳ tên riêng nào.

**Những gì còn thiếu nhiều nhất so với một game ninja đủ đầy** (theo số dòng "Thiếu"): rèn mở rộng (D10-D13), kinh tế giữa người chơi (D21, D22), gia tộc có việc và chiến tộc (D29, D30), PvP tập thể (D35), PvE theo giờ và theo cấp (D39, D41, D43), chia khu (D50) và nhiệm vụ phụ (D53). Mọi mục này đã có id và đặc tả nguồn; thứ tự làm theo `specs/PLAN.md` (lô 1 `bound` + `balance` trước) rồi tới đặc tả nội dung `content/`.

**Điều kiện để chiến lược đứng vững**: bảng bảo chứng ở mục 2 phải vào kiểm thử trước khi tính năng tương ứng được coi là xong (định nghĩa "xong" ở `01-tam-nhin.md` mục 5.2).

---

## 6. Mục GDD chủ của các id được dẫn

| Mục GDD chủ | Id dẫn trong mục này |
|---|---|
| `05-he-thong-chien-dau.md` | `cmb-classes`, `cmb-potential`, `cmb-skills`, `cmb-passive`, `cmb-auto`, `cmb-death-revive`, `pvp-pk`, `cmb-status`, `cmb-clone`, `cmb-skills-199`, `cmb-power-score`, `sig-meridian` |
| `05-he-thong-trang-bi.md` | `gear-equipment`, `gear-upgrade`, `gear-gems`, `gear-storage`, `gear-chest`, `eco-shop-npc`, `ui-bag-expand`, `ui-bag-bulkdrop`, `eco-bound`, `gear-tier-199`, `gear-crafting`, `gear-smith-plus`, `gear-upgrade-transfer`, `gear-refine`, `gear-fame`, `gear-storage-plus`, `eco-consumables-199`, `eco-loot-tables`, `eco-shop-tabs` |
| `05-he-thong-xa-hoi-pvp.md` | `soc-chat`, `soc-party`, `soc-friends`, `soc-trade`, `soc-mail`, `soc-rank`, `pvp-arena`, `pvp-duel`, `clan-core`, `eco-market`, `soc-titles`, `clan-war`, `pvp-battlefield`, `soc-chat-safety`, `soc-party-plus`, `pvp-freezone` |
| `05-he-thong-pve.md` | `pve-boss-field`, `pve-tathu`, `pve-dungeon`, `evt-checkin`, `evt-season-core`, `world-teleport`, `quest-daily-task`, `pve-caves`, `quest-dailies`, `quest-truyna`, `world-home`, `pve-dungeon-multi`, `pve-clanboss`, `world-channels`, `pve-worldboss`, `pve-tathu-199`, `evt-calendar`, `evt-tet`, `evt-valentine`, `evt-304`, `evt-he`, `evt-trungthu`, `evt-halloween`, `evt-noel`, `evt-login-rewards` |
| `05-he-thong-thu-ngoai-hinh.md` | `pet-fashion`, `pet-mount`, `pet-pets`, `pet-beasts`, `pet-mountup`, `pet-appearance-fx`, `pet-wardrobe` |
| `05-he-thong-giao-dien.md` | `ui-ask-dialog`, `ui-tutorial`, `ui-notify-center` |
| `04-dac-sac.md` | `sig-thuctinh`, `pve-thapvotan`, `pve-bicanh-phuchu`, `evt-village-defense`, `sig-sonhangia`, `sig-bequan`, `soc-nhanduyen`, `clan-siege`, `pvp-arena-3v3` |
| `06-can-bang.md` | `cmb-pvp-balance` |
| `07-the-gioi.md` | `world-worldmap`, `world-upper` |
| `08-cot-truyen.md` | `quest-main`, `quest-main-199`, `quest-kyduyen`, `quest-lore`, `quest-main-gap` |
| `09-my-thuat-am-thanh.md` | `char-tier-outfit`, `art-enhance-aura` |
| `10-ky-thuat-van-hanh.md` | `dev-test-coverage`, `ops-data-migration`, `ops-audit-log`, `ops-anticheat`, `ops-state-culling`, `ops-account-security`, `ops-cross-server` |
| `11-kiem-tien.md` | `mon-luong-shop`, `mon-spend-cap`, `mon-monthly-card`, `mon-topup`, `mon-rmt` |

Sổ đăng ký của mục này (`gddwork/registry/03.json`) là mảng rỗng: mục 3 không sở hữu tính năng nào, chỉ dẫn id của các mục trên.

---

## 7. Kiểm chứng tài liệu

**Mọi id dẫn trong mục này có trong danh mục** (đạt khi in `OK`; `G` là thư mục chứa `catalog.json`, chạy ở gốc repo):

```bash
G=/private/tmp/claude-501/-Users-danhtrongit-game-Ninja-School/fddbf4ca-8b7c-430c-9de6-f17e33e5a6fc/scratchpad/gddwork
python3 - "$G/catalog.json" docs/gdd/03-doi-chieu.md <<'PY'
import json, re, sys
cat = {x['id'] for x in json.load(open(sys.argv[1]))}
pre = 'core|cmb|char|gear|eco|soc|clan|pvp|pve|world|quest|evt|pet|sig|ui|art|snd|ops|mon|dev'
ids = set(re.findall(r'`((?:' + pre + r')-[a-z0-9-]+)`', open(sys.argv[2]).read()))
print(sorted(ids - cat) or 'OK', len(ids))
PY
```

| Kiểm tra | Cách làm | Đạt khi |
|---|---|---|
| Không có tên riêng của game khác | rà tay khi duyệt | chỉ có cụm "game tham khảo"; không có tên trường, làng, NPC, vật phẩm, bản đồ, sự kiện, boss của game khác |
| Hiện trạng đúng với mã | `npm run check` (lần chạy ngày 18/10/2026 in `Dữ liệu hợp lệ: 306 vật phẩm, 65 quái, 25 bản đồ, 51 nhiệm vụ, 60 kỹ năng`); `ls src/server/modules` (29 module, có `audio`, chưa có `bound`, `market`, `crafting`, `caves`, `clanwar`, `battlefield`, `titles`, `meridian`, `mountup`) | khớp số liệu ở cột "Hiện trạng của ta"; dòng nào lệch thì sửa cột hiện trạng, không sửa quyết định |
| Số đếm ở mục 0.3 và mục 3 | đếm nhãn đầu tiên của cột "Quyết định" và "Hiện trạng" ở 57 dòng `Dnn` | khớp hai bảng tổng hợp |

---

## 8. Câu hỏi mở

Mỗi câu có phương án mặc định; các mục GDD chủ làm theo mặc định cho tới khi chủ dự án chốt khác.

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | `NOTE.md` ghi "tách cường hóa": là **hạ cấp giữ món** (lấy lại đá) hay **phá món** lấy nguyên liệu như `specs/crafting.md`? | Làm "Tách đồ" phá món (Tinh Thiết + 30% đá danh nghĩa) ở 1.0; không làm "hạ cấp giữ món" vì chuyển cường hóa (D12) đã phủ nhu cầu đổi đồ mà giữ cấp. Cả hai vẫn dưới id `gear-smith-plus` |
| Q2 | Chuyển cường hóa giữa hai vũ khí khác phái (cùng ô `weapon`) có cho phép không? | Cho phép: luật chỉ xét cùng ô và bậc món nhận ≥ bậc món nguồn; không có đổi phái nên không tạo lỗ hổng |
| Q3 | Boss thế giới khi bản đồ chia khu: mỗi khu một bản sao boss hay một boss duy nhất ở khu 1? | Mỗi khu một bản sao boss, máu tính theo số người đủ cấp trong khu đó, xếp hạng và thưởng theo khu; mục `05-he-thong-pve.md` có thể đổi nếu đo tải cho thấy một boss + lọc tầm nhìn rẻ hơn |
| Q4 | Khung cấp chiến trường sau khi mở cấp 199? | Thêm 2 khung 121-159 và 160-199 (tổng 5 khung), giữ ≤ 40 người/phòng và cân tổng cấp |
| Q5 | Danh vọng dùng chung giữa lôi đài và chiến trường hay tách riêng? | Dùng chung `c.arena.fame` như `specs/battlefield.md`, một cửa hàng danh vọng mở được ở cả Võ Sư Thiết Quyền và Chiến Tướng Hàn Phong |
| Q6 | Khu PK tự do có rơi đồ không (một phần người chơi lâu năm thích)? | Không rơi đồ. Phạt bằng mất EXP theo điểm hiếu chiến, tên đỏ, lệnh truy nã có thưởng cho người hạ; xét lại chỉ khi có ADR và số liệu 4 tuần |
| Q7 | Có làm đục thêm lỗ ngọc không? | Không ở 1.0; số lỗ theo bậc cố định (1-3). Xét lại ở bản 1.1 nếu dữ liệu kinh tế cho thấy ngọc cấp cao ứ đọng |
| Q8 | Có bảng xếp hạng tài phú (xu, lượng) không? | Không; thay bằng bảng lực chiến, PK, thú cưng (`cmb-power-score`) |
| Q9 | Thách đấu có thêm cược xu không? | Không; thách đấu chỉ để so tài, không chuyển tiền |
| Q10 | Phân thân có được dùng trong chiến trường và chiến gia tộc không (chỉ đánh quái nên vô hại)? | Cho triệu hồi ở mọi bản đồ trừ làng và lôi đài như `specs/clone.md`; trong chiến trường/chiến tộc không có quái nên phân thân chỉ đứng cạnh chủ, không gây sát thương lên người |
