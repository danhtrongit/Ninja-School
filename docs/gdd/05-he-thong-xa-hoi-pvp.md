# GDD 05 — Hệ thống xã hội và PvP

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 5 (phần xã hội, gia tộc, chợ, PvP) |
| Ngày | 18/10/2026 |
| Phạm vi id | `soc-chat`, `soc-invites`, `soc-party`, `soc-friends`, `soc-trade`, `soc-mail`, `soc-rank`, `pvp-duel`, `pvp-arena`, `clan-core`, `soc-chat-safety`, `soc-party-plus`, `soc-inspect`, `soc-titles`, `eco-market`, `clan-war`, `pvp-battlefield`, `pvp-freezone` (danh mục) + `pvp-arena-bracket` (id mới, con của `pvp-arena`) |
| Nguồn đã đọc | `CLAUDE.md`, `DESIGN_RULES.md`, `docs/gdd/01-tam-nhin.md`, mã `src/` ở thư mục làm việc ngày 18/10/2026 (`modules/chat, invites, party, friends, trade, mail, rank, pk, clan, arena`, `core/combat.js`, `core/map.js`, `core/player.js`, `windows/*.js`), đặc tả đã duyệt `specs/market.md`, `specs/clanwar.md`, `specs/battlefield.md`, `specs/titles.md`, `specs/PLAN.md`, nội dung cấp 199 `content/00-foundation.md`, `40-items-shops.md`, `50-worldboss-events.md`, `60-mounts-pets.md`, kiểm kê `gddwork/audit-systems.md`, `audit-risk.md`, nhật ký `npm test` (`gddwork/lab/test1.log`, đạt, 183 giây) |
| Thí nghiệm kèm | `gddwork/lab/soc/proto-clan.js` (lỗi chèn prototype ở gia tộc), `gddwork/lab/soc/trade-cap.js` (giao dịch vượt trần xu) |

Quy tắc đọc: chỗ nào mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 4. Với 4 tính năng đã có đặc tả triển khai (`market`, `clanwar`, `battlefield`, `titles`), tài liệu này **tóm theo khuôn GDD và ghi phần chỉnh**; khi worker làm, đặc tả gốc + phụ lục điều phối của nó là nguồn chi tiết, các dòng "Chỉnh so với đặc tả" ở đây ưu tiên hơn.

---

## 0. Tóm tắt

### 0.1 Bảng tính năng của mục này

| id | Tên | Trụ cột | MoSCoW | Trạng thái | GĐ | Cỡ | Đặc sắc | Nguồn chi tiết |
|---|---|---|---|---|---|---|---|---|
| `soc-chat` | Chat 5 kênh và lệnh nhanh | P4 | M | done | 4 | S | | mục 1.1 |
| `soc-invites` | Menu người chơi, lời mời 30 giây | P4 | M | done | 4 | S | | mục 1.2 |
| `soc-party` | Nhóm 6 người chia EXP | P4 | M | done | 4 | S | | mục 1.3 |
| `soc-friends` | Bạn bè 50 người | P4 | S | done | 4 | S | | mục 1.4 |
| `soc-trade` | Giao dịch 1-1 khóa + xác nhận | P4, P5 | M | **todo** (lỗi vượt trần xu) | 0 | S | | mục 1.5 |
| `soc-mail` | Hộp thư 30 thư + giftcode | P5 | M | done | 4 | M | có | mục 1.6 |
| `soc-rank` | Bảng xếp hạng 4 tab | P4 | S | done | 4 | S | | mục 1.7 |
| `pvp-duel` | Thách đấu 1-1 | P3, P4 | S | done | 4 | S | | mục 1.8 |
| `pvp-arena` | Lôi đài xếp hạng Elo | P3, P4 | S | done | 4 | L | có | mục 1.9 |
| `clan-core` | Gia tộc cơ bản | P4 | M | **todo** (lỗi chèn prototype, thiếu kiểm thử) | 0 | M | | mục 1.10 |
| `soc-chat-safety` | Chặn, lọc từ, báo cáo, cấm chat | P4, P5 | M | todo | 4 | M | | mục 2.1 |
| `soc-party-plus` | Bảng tìm nhóm, luật chia đồ | P4 | S | todo | 4 | M | | mục 2.2 |
| `soc-inspect` | Xem người chơi kể cả offline | P4 | C | todo | 4 | S | | mục 2.3 |
| `soc-titles` | Danh hiệu, thành tựu, kẻ thù | P4 | S | todo | 4 | M | | mục 2.4, `specs/titles.md` |
| `eco-market` | Chợ Ký Gửi | P4, P5 | S | todo | 3 | L | | mục 2.5, `specs/market.md` |
| `clan-war` | Gia tộc mở rộng + chiến gia tộc | P4 | S | todo | 4 | L | có | mục 2.6, `specs/clanwar.md` |
| `pvp-battlefield` | Chiến Trường Long Phượng | P3, P4 | S | todo | 4 | L | có | mục 2.7, `specs/battlefield.md` |
| `pvp-arena-bracket` | Lôi đài theo khung cấp 20-199 | P3, P5 | S | todo | 4 | M | | mục 2.8 (id mới) |
| `pvp-freezone` | Đấu Trường có luật: Giờ Huyết Chiến, Huyết Bảng | P3, P4 | C | todo | 4 | M | | mục 2.9 |

Tính năng đặc sắc thuộc mục này (đếm vào sàn ≥ 10 đặc sắc M/S): `soc-mail`, `pvp-arena`, `clan-war`, `pvp-battlefield`.

Hai hệ thống catalog ghi `done` nhưng tài liệu này hạ về `todo` vì phát hiện lỗi thật khi đọc mã (thí nghiệm ở `gddwork/lab/soc/`):

| id | Lỗi | Tái hiện | Cách sửa đã chẩn đoán |
|---|---|---|---|
| `clan-core` | Tộc trưởng gửi `clanPromote { name: '__proto__' }` làm `Object.prototype.rank = 'elder'`; gửi thêm `rank: 'leader'` thì `({}).rank === 'leader'`, `cl.leader = undefined`, tộc trưởng thật bị giáng làm trưởng lão (gia tộc mất chủ, `leaveClan` sau đó ném lỗi ở `cl.leader.toLowerCase()`). `clanKick { name: '__proto__' }` cũng đi vào nhánh xóa với `t = Object.prototype` | `node gddwork/lab/soc/proto-clan.js` in `Object.prototype.rank sau clanPromote __proto__ = elder` | `clanKick`, `clanPromote`: `const key = clean(m.name, 16).toLowerCase(); if (!own(cl.members, key)) return;` (dùng `own` của `core/util.js`) |
| `soc-trade` | `tradeOk` cộng xu không kẹp trần: người có 2.000.000.000 xu nhận thêm 1.000.000.000 thành 3.000.000.000 (trần xu là 2e9 ở `Player.gainXu`) | `node gddwork/lab/soc/trade-cap.js` in `A xu sau giao dịch = 3000000000 (VƯỢT trần 2e9)` | Trước khi chuyển: nếu `p.c.xu - p.trade.xu + o.trade.xu > 2e9` (hoặc phía kia) thì hủy giao dịch "Vượt giới hạn xu mang theo (2 tỉ)." |

### 0.2 Lịch hoạt động đông người (giờ Việt Nam)

Không có hai hoạt động cùng dùng biểu ngữ dưới giữa chồng giờ. Lịch gộp từ `specs/PLAN.md` và `content/50-worldboss-events.md` mục 0.1, thêm Giờ Huyết Chiến của `pvp-freezone`.

| Giờ | Hoạt động | id | Biểu ngữ HUD |
|---|---|---|---|
| giờ chẵn :30-:50 | Tà Thú Xuất Thế | `pve-tathu` | `#hud-event` |
| 09:00, 13:00, 17:00, 19:00, 23:00 (30 phút) | Hung Tinh Giáng Thế | `pve-worldboss` | `#hud-wb` |
| 12:00-12:13, 21:00-21:13 | Thủ Hộ Làng | `evt-village-defense` | `#hud-defense` |
| 19:50 đăng ký, 20:00-20:30 hằng ngày | Chiến Trường Long Phượng | `pvp-battlefield` | `#hud-bf` |
| thứ 3/5/7: đăng ký tới 21:15, mở 21:25, đánh 21:30-21:45 | Chiến gia tộc | `clan-war` | `#hud-cw` (giữa trên) |
| 22:00-22:25 hằng ngày | Giờ Huyết Chiến ở Đấu Trường | `pvp-freezone` | không có biểu ngữ, chỉ `#map-info` + dòng lịch |
| cả ngày | Lôi đài xếp hạng | `pvp-arena` | `#hud-arena` |
| 00:00 thứ Hai | Thưởng tuần lôi đài (qua hộp thư) | `pvp-arena`, `pvp-arena-bracket` | không |

Giờ Huyết Chiến đặt sau chiến gia tộc (21:45) và trước Tà Thú 22:30, không trùng Hung Tinh (23:00). Lịch Sự Kiện (`evt-calendar`) đọc các mốc trên từ dữ liệu (`BATTLE`, `CLAN.war`, `PVPZONE`), không chép giờ vào client.

### 0.3 Ma trận chặn tương tác theo trạng thái

"Có" = đã có trong mã; "Mới" = tính năng ở cột tiêu đề hoặc ghi trong ô phải thêm; trống = cho phép.

| Thao tác \ trạng thái | Đang lôi đài (`p.match`) | Chiến trường (`p.bf`) | Chiến gia tộc (`p.cw`) | Tộc Địa (`map.terr`) | Đang giao dịch (`p.trade`) | Trọng thương (`p.dead`) |
|---|---|---|---|---|---|---|
| `tradeReq`, `tradeAccept` | chặn (Có) | chặn (Mới, `pvp-battlefield`) | chặn (Mới, `clan-war`) | | đã giao dịch thì chặn (Có) | chặn (Mới, `soc-trade`) |
| `duelReq`, `duelAccept` | chặn (Có) | chặn mọi bản đồ `instance` (Mới, `pvp-battlefield`) | chặn (Mới, như cột trái) | chặn (Mới) | | chặn lúc nhận (Có) |
| `arenaJoin` | | chặn (Mới, `pvp-arena-bracket`) | chặn (Mới, `pvp-arena-bracket`) | chặn (Mới) | | |
| `bfJoin` | chặn (đặc tả) | | chặn (Mới) | chặn (bản đồ instance, đặc tả) | | chặn (đặc tả) |
| `clanWarEnter`, `clanTerrEnter` | chặn (đặc tả) | chặn (Mới) | | | hủy giao dịch rồi vào (đặc tả) | chặn (đặc tả) |
| `mkSell`, `mkBuy` | chặn (đặc tả) | không có NPC | không có NPC | không có NPC | chặn (đặc tả) | chặn qua `nearNpc` |
| `titleSet` | chặn (đặc tả) | | | | | |
| `revive` (tại chỗ / về làng) | không có trạng thái chết | chặn (đặc tả, sửa `pk.revive`) | không có trạng thái chết (đặc tả) | | | |
| `partyInvite` | | | | | | |

Quy tắc chung: mọi chỗ đánh người (`canPvp`, `damagePlayer` ở `core/combat.js`) kiểm `p.match`, rồi `map.clanwar`, rồi `map.bf` **trước** luật khu an toàn/thách đấu (thứ tự chèn đã chốt ở `specs/PLAN.md` mục 3). Thách đấu bị chặn ở mọi bản đồ `instance` vì nhánh thách đấu trong `damagePlayer` chạy trước nhánh chiến trường: nếu không chặn, người thua trong chiến trường sẽ "thua thách đấu còn 1 máu" thay vì bị hạ theo luật chiến trường.

### 0.4 Quy ước chung cho mọi hệ thống của mục này

| # | Quy ước |
|---|---|
| X1 | Tên người chơi từ client: `clean(m.name, 16)`, tra bằng `world.byName` (Map) hoặc `db.getChar` (đã dùng `hasOwnProperty`). Tra object thường bằng khóa client (`cl.members[tên]`, `c.bf.buys[id]`) **phải** qua `own()`; danh sách cố định thì tra bằng `Map`/`find`. |
| X2 | Mọi hành động mới có khoảng cách tối thiểu theo trường thời gian trên `Player` (`p.<x>At`), sai thì bỏ qua im lặng. Gói `chat`, lời mời, báo cáo có giới hạn riêng ở mục 2.1. |
| X3 | Tiền (quy tắc G12 của đợt 3): tiền đi giữa người chơi (giá chợ, giao dịch, góp quỹ, treo thưởng) **chỉ** `c.xu`/`c.luong`, không bao giờ xu khóa; phí hệ thống trả bằng `payXu` (xu khóa trước); thưởng kiểu nhiệm vụ (nhiệm vụ gia tộc, thành tựu) là xu khóa/đồ khóa; thưởng PvP/sự kiện (lôi đài, chiến trường, chiến gia tộc, Huyết Chiến) là xu và đồ thường; đồ đổi bằng danh vọng/cống hiến là đồ khóa. |
| X4 | Mọi chuỗi do người chơi gõ (tên, chat, ghi chú, thông báo tộc, lý do báo cáo) vào DOM qua `h()` (text node). Không `innerHTML`. |
| X5 | Không thêm nút vào `#hud-menu` (giữ 16 nút, DESIGN_RULES mục 8). Lối vào mới: phím đã phân bổ (H = Chiến trường), tab trong cửa sổ có sẵn, NPC, menu người chơi (`.pmenu`), nút ở chân cửa sổ Nhân vật. |
| X6 | Tab mới dùng thuộc tính riêng `data-<x>tab` (`data-mktab`, `data-cltab`, `data-bftab`, `data-frtab`, `data-achtab`, `data-ptab`), **không** dùng `data-tab` (bộ chọn mà `tests/` và `tools/shot.js` dùng chung). Đặc tả `titles.md` mục 3.1 và 3.3 ghi `data-tab`: chỉnh thành `data-achtab` và `data-frtab`. |
| X7 | Trận, phòng, hàng chờ chỉ sống trong RAM. Mất kết nối, đổi bản đồ, khởi động lại máy chủ: đưa người về chỗ cũ hoặc làng (`left` ghi đè `c.map/x/y` như lôi đài), trận bị hủy không thưởng, không mất đồ. |
| X8 | Mọi nguồn hồi máu mới bỏ qua bản đồ `arena`; trong chiến trường/chiến gia tộc hồi sinh do module trận quyết định, không qua gói `dead`. |
| X9 | Mọi lời mời giữa người chơi đi qua `invites.invite()` để luật chặn/riêng tư của `soc-chat-safety` áp dụng một chỗ. |
| X10 | Tài khoản và cổng thử riêng cho mỗi tính năng (CLAUDE.md mục làm việc song song): xem bảng 0.5. |

### 0.5 Tài khoản thử và cổng chụp ảnh

| Tính năng | Tài khoản admin trong `ADMINS` (`tests/lib/harness.js`) | Cổng chụp ảnh + `DATA_DIR` |
|---|---|---|
| `eco-market` | `cho_ban, cho_mua` | 3625, `/tmp/ns-market` |
| `soc-titles` | `dhieu_a, dhieu_b` (theo đặc tả) | 3627, `/tmp/ns-titles` |
| `clan-war` | `cw_alpha, cw_bravo` (theo đặc tả) | 3629, `/tmp/ns-clanwar` |
| `pvp-battlefield` | `bfadmin, bftwo, bfthree, bffour` (server riêng của file thử) | 3632, `/tmp/ns-battlefield` |
| `soc-chat-safety` | `chat_a, chat_b, chat_c` | 3641, `/tmp/ns-chatsafe` |
| `soc-party-plus` | `nhom_a, nhom_b, nhom_c` | 3642, `/tmp/ns-party` |
| `soc-inspect` | dùng `nhom_a, nhom_b` | 3643, `/tmp/ns-inspect` |
| `pvp-arena-bracket` | `lodai_c, lodai_d` (thêm cạnh `lodai_a, lodai_b`) | 3644, `/tmp/ns-arenabr` |
| `pvp-freezone` | `pk_a, pk_b, pk_c` | 3645, `/tmp/ns-freezone` |
| `clan-core` | `toc_a, toc_b, toc_c` | 3646, `/tmp/ns-clan` |

---

## 1. Hệ thống đã có: hiện trạng và phần cần nâng

### 1.1 `soc-chat` — Chat 5 kênh (P4)

**Mục đích**: người chơi nói chuyện theo phạm vi (bản đồ, thế giới, nhóm, gia tộc, mật) và gõ lệnh nhanh thay cho bấm menu.

**Hiện trạng** (`modules/chat`, khung `#hud-chat`, `#chat-*` trong `ui/ui.js`):

| Hạng mục | Giá trị |
|---|---|
| Gói | `chat { ch: 'map'\|'world'\|'party'\|'clan'\|'pm', msg, to }` → `chat { ch, from, id, cls, msg, to? }`; hệ thống `ch: 'sys'` |
| Giới hạn | tin ≤ 140 ký tự (`clean`), mỗi tin cách ≥ 0,8 giây; thế giới cần cấp 5 và cách ≥ 8 giây; mật chỉ tới người đang online |
| Lệnh | `/w <tên> <tin>`, `/p`, `/g`, `/a`, `/online`, `/moi <tên>`, `/gd <tên>`, `/td <tên>`, `/xem <tên>`, `/help`; admin chuyển sang `modules/admin` |
| Hiển thị | bong bóng chat vẽ chữ trên canvas phân giải cao sau khi phóng to; khung chat thu gọn mặc định trên điện thoại |
| Kiểm thử | `tests/features/social.js` (chat nhóm, chat bản đồ); mọi phần kiểm thử dùng lệnh admin qua chat |

**Phần cần nâng** (đặc tả ở mục 2.1 `soc-chat-safety`, không đổi trạng thái `done` của `soc-chat`): lọc từ, chặn người chơi, cấm chat, chống lặp tin, ẩn liên kết và số điện thoại. Lệnh mới thêm vào `/help`: `/chan <tên>`, `/bochan <tên>`.

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in "chat nhóm" và "chat bản đồ" đạt trong phần 5 của bộ chạy; gõ `/help` nhận 1 dòng `ch: 'sys'` (người thường) hoặc 3 dòng (admin).

### 1.2 `soc-invites` — Menu người chơi và lời mời (P4)

**Hiện trạng** (`modules/invites`, `windows/dialog.js` lớp `.pmenu`, `#invites`):

| Hạng mục | Giá trị |
|---|---|
| Loại lời mời | `party`, `trade`, `duel`, `clan`, `friend`; khóa `p.invites['<loại>:<tên thường>'] = hạn` (30 giây), khóa luôn có dấu `:` nên không chạm prototype |
| Gói | `invite { kind, from, clan? }` (server → client); `decline { kind, from }` → bên mời nhận thông báo "đã từ chối"; nhận lời qua `<loại>Accept { from }` của từng module |
| Menu người chơi | bấm nhân vật trên bản đồ: Xem thông tin, Mời vào nhóm, Giao dịch, Thách đấu, Kết bạn, Mời gia tộc |
| Kiểm thử | `tests/e2e/ui-multiplayer.js` (menu, lời mời giao dịch/nhóm/thách đấu qua giao diện); `decline` chưa có kiểm thử bot |

**Phần cần nâng** (thuộc `soc-chat-safety`): giới hạn gửi lời mời (1 lời mời cùng loại tới cùng người mỗi 10 giây, tối đa 20 lời mời mỗi phút), tôn trọng danh sách chặn và cài đặt "Nhận lời mời", thêm 2 mục "Chặn" và "Báo cáo" vào `.pmenu`.

**Tiêu chí chấp nhận (đang đạt)**: `npm run test:ui` in "B nhận lời mời giao dịch", "lập nhóm 2 người qua menu + lời mời", "B nhận lời thách đấu".

### 1.3 `soc-party` — Nhóm 6 người (P4)

**Hiện trạng** (`modules/party`, `windows/party.js`, `#hud-party`):

| Quy tắc | Giá trị (mã hiện tại) |
|---|---|
| Lập nhóm | người được mời nhận lời thì nhóm được tạo, người mời là trưởng nhóm; chỉ trưởng nhóm mời; tối đa 6 (`PARTY_MAX`) |
| Rời / mời ra | trưởng nhóm rời thì người vào sớm nhất còn lại làm trưởng; còn ≤ 1 người thì giải tán; nhóm không lưu khi thoát game |
| EXP | chia đều cho thành viên **còn sống ở cùng bản đồ** (không giới hạn khoảng cách): tổng = EXP quái × `(1 + 0,12·(n − 1))` × hệ số sự kiện; người hạ ×1,1; theo chênh cấp với quái: cao hơn > 10 cấp ×0,1, > 5 cấp ×0,5, thấp hơn > 10 cấp ×1,3 (`core/combat.js shareExp`) |
| Đồ rơi | trong 15 giây quyền nhặt, mọi thành viên của chủ món đều nhặt được (`core/map.js canPick`) |
| Bảo vệ | cùng nhóm không đánh nhau, kể cả ở bản đồ PvP |
| Gói | `partyInvite { name }`, `partyAccept { from }`, `partyLeave`, `partyKick { name }` → `party { id, members: [{ id, name, cls, lv, hp, mhp, map, mapId, leader }] }` |
| Kiểm thử | `tests/features/social.js` (lập nhóm, `mapId` từng thành viên, chat nhóm), `daily.js` (cập nhật khi đổi bản đồ); `partyLeave`, `partyKick` chưa có kiểm thử (thuộc `dev-test-coverage`) |

**Phần cần nâng** (mục 2.2 `soc-party-plus`): bảng tìm nhóm, luật chia đồ Luân phiên, giới hạn khoảng cách nhận EXP chia nhóm.

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in "lập nhóm 2 người", "gói nhóm có mapId của từng thành viên", "đồng đội nhận cập nhật nhóm khi thành viên đổi bản đồ".

### 1.4 `soc-friends` — Bạn bè (P4)

**Hiện trạng** (`modules/friends`, `windows/friends.js`):

| Quy tắc | Giá trị |
|---|---|
| Kết bạn | chỉ khi đối phương đang online, qua lời mời `friend`; tối đa 50 mỗi bên; danh sách lưu `c.friends` (tên) |
| Xóa | `friendDel { name }` xóa hai chiều (cả người offline qua `db.getChar`) |
| Báo online | móc `join`/`leave` gửi dòng `sys` cho bạn bè đang online |
| Gói | `friendAdd`, `friendAccept`, `friendDel`, `friendList` → `friends { list: [{ name, lv, cls, map, online }] }` |
| Kiểm thử | `tests/features/daily.js` "kết bạn thành công"; xóa và danh sách chưa có kiểm thử |

**Phần cần nâng**:
1. `sanitize` của `c.friends` chỉ kiểm là mảng: phần tử không phải chuỗi sẽ làm `n.toLowerCase()` ném lỗi. Thêm vào `soc-chat-safety` hàm `cleanNames(list, max)` dùng chung cho `c.friends` (50) và `c.blocks` (100): giữ chuỗi 3-16 ký tự, bỏ trùng không phân biệt hoa thường.
2. Tab "Kẻ thù" (`soc-titles`), tab "Chặn" (`soc-chat-safety`), tab "Huyết Bảng" (`pvp-freezone`) cùng nằm trong cửa sổ Bạn bè với `data-frtab`.

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in "kết bạn thành công".

### 1.5 `soc-trade` — Giao dịch 1-1 (P4, P5) — trạng thái `todo`

**Mục đích**: hai người đứng gần nhau đổi đồ và xu một cách an toàn, không bị tráo đồ phút cuối.

**Hiện trạng** (`modules/trade`, `windows/trade.js`):

| Bước | Quy tắc |
|---|---|
| Mời | cùng bản đồ, cách ≤ 250 px, cả hai cấp ≥ 5, không ở lôi đài, không ai đang giao dịch (kiểm lại lúc nhận lời) |
| Đặt | ≤ 10 ô, bỏ ô trống và đồ có hạn (`it.exp`); xu kẹp `[0, c.xu]`; chụp lại tham chiếu món + số lượng + ngọc khảm (`trade.items`) |
| Khóa | `tradeLock`: không đặt lại được nữa |
| Xác nhận | `tradeOk` chỉ khi hai bên đã khóa; khi cả hai `ok` thì so từng ô với bản chụp (cùng object, cùng `q`, cùng ngọc, không có hạn), kiểm xu và chỗ trống, chuyển đồ nguyên object (giữ `r, p, o, gems, plv, pexp, love`) |
| Hủy | `tradeCancel`, rời bản đồ, thoát game đều hủy cho cả hai |
| Kiểm thử | `social.js` (giao dịch xu + vật phẩm), `fashion.js` (đồ có hạn, tráo đồ sau khi khóa), `gems.js` (ngọc đi theo món), `pets.js` (thú giữ cấp + thân mật), `ui-multiplayer.js` (qua giao diện) |

**Phần cần nâng (làm ở GĐ 0, giao opencode được)**:

| # | Việc | Quy tắc |
|---|---|---|
| T1 | Kẹp trần xu | trước khi chuyển: `xuSau(p) = p.c.xu − p.trade.xu + o.trade.xu`; nếu `xuSau(p) > 2e9` hoặc `xuSau(o) > 2e9` thì `cancelTrade(p, 'Vượt giới hạn xu mang theo (2 tỉ).')` |
| T2 | Kiểm lại vị trí lúc chốt | `tradeOk` kiểm `o.map === p.map && |o.x − p.x| ≤ 250 && !p.dead && !o.dead`, sai thì hủy "Hai bên phải đứng gần nhau." |
| T3 | Đồ khóa | do `eco-bound` làm: `tradeSet` lọc bằng `canTransfer(it)` thay `!it.exp`; `same()` dùng `canTransfer` (đặc tả `bound.md` mục a) |
| T4 | Bản đồ trận | `tradeReq`/`tradeAccept` từ chối khi bên nào có `p.bf` hoặc `p.cw` (do `pvp-battlefield`/`clan-war` thêm 1 điều kiện cạnh `p.match`) |
| T5 | Nhật ký | mỗi giao dịch thành công ghi 1 dòng vào nhật ký kiểm toán của `ops-audit-log` (`{ t: 'trade', a, b, itemsA, itemsB, xuA, xuB }`), không thuộc phạm vi tài liệu này |
| T6 | Cảnh báo giao dịch lệch (client) | khi bên kia không đặt gì và mình đặt > 0 món hoặc > 0 xu, nút "Xác nhận" đổi thành "Xác nhận (bạn không nhận gì)" màu cảnh báo; chỉ là chữ, server không đổi |

**Gói**: không thêm gói. **Điện thoại**: cửa sổ giao dịch giữ bố cục hiện có, nút Khóa/Xác nhận/Hủy cao ≥ 44px. **Chống nhân bản**: chuyển nguyên object và gán `null` ô cũ trong cùng một lượt đồng bộ (Node đơn luồng); không `await` giữa kiểm tra và chuyển.

**Tiêu chí chấp nhận**:
1. Kiểm thử đơn vị mới trong `tests/features/social.js`: A có 2.000.000.000 xu, B đặt 1.000.000.000 xu, hai bên khóa + xác nhận → giao dịch bị hủy, A vẫn 2.000.000.000, B vẫn 1.000.000.000.
2. Bot: B đi xa 400 px sau khi hai bên đã khóa, A và B xác nhận → nhận `tradeEnd { ok: false }`, đồ không đổi chủ.
3. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`, mọi kiểm tra giao dịch cũ vẫn đạt.

### 1.6 `soc-mail` — Hộp thư và giftcode (P5, đặc sắc)

**Hiện trạng**: đúng như `CLAUDE.md` (mục Hộp thư) và `DESIGN_RULES.md` mục 8, 9: 30 thư, giữ 30 ngày, ≤ 6 món/thư (tự tách), người offline nhận được, nhận tất cả, xóa đã đọc; giftcode cố định (`GIFTCODES`) và tạm (`/code`), dùng một lần theo **tài khoản**, khóa dò mã. Trả về `false` khi hộp đầy thư còn quà, người gọi tự chuyển kho/giữ hộ. Gói `mailList, mailRead, mailClaim, mailClaimAll, mailDel, mailDelRead, giftcode` → `mail`, `codeResult`. Kiểm thử: `tests/features/mail.js` (59 kiểm tra), `persistence.js`, `e2e.js`.

**Phần cần nâng** (không thuộc mục này, ghi để không làm trùng):

| Việc | Thuộc id |
|---|---|
| Trường `xuk` trong thư, thư admin là đồ khóa | `eco-bound` (`bound.md` mục l) |
| Thư người chơi gửi nhau kèm đồ/xu | **Không làm ở 1.0** (mở đường rửa xu khóa và mua bán tiền thật; giao dịch 1-1 và chợ đã đủ) |
| Nhật ký thư có quà | `ops-audit-log` |
| Chợ, chiến gia tộc, chiến trường dùng thư cho người offline/túi đầy | các tính năng đó gọi `world.mail.deliver` / `sendItems`, xử lý `false` |

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in toàn bộ khối "0f. Hộp thư" và "7i. Hộp thư, giftcode, lễ hội".

### 1.7 `soc-rank` — Bảng xếp hạng (P4)

**Hiện trạng** (`modules/rank`, `world.computeRank` mỗi 60 giây, `windows/rank.js` tab `data-rktab`):

| Tab | Nội dung |
|---|---|
| Cấp | top 30 theo tổng EXP |
| Gia tộc | top 20 theo tổng cấp thành viên |
| Diệt quái | top 20 theo `c.kills` (số quái chủ sở hữu hạ) |
| Lôi đài | top 30 theo Elo + thẻ của mình (`arenaMe`) |

**Phần cần nâng**:

| Việc | id thực hiện | Quy tắc |
|---|---|---|
| Lôi đài theo khung cấp | `pvp-arena-bracket` | tab Lôi đài thêm hàng chọn khung `[data-arbr=0..4]` |
| Lực chiến | `cmb-power-score` (mục chiến đấu) | tab mới khi tính năng đó có |
| Chiến trường (danh vọng tuần) | `pvp-battlefield` (tùy chọn, mức C, không bắt buộc cho 1.0) | đọc `c.bf.total` |
| Hạ người chơi | `pvp-freezone` | dùng khóa mới `c.pvpKills` (không đổi nghĩa `c.kills`, xem `audit-systems` R3) |
| Gia tộc theo thành tích chiến | `clan-war` | thêm cột "Thắng chiến" từ `cl.war.win` vào tab Gia tộc |

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in "bảng xếp hạng có tab lôi đài, hạng của mình: 2".

### 1.8 `pvp-duel` — Thách đấu 1-1 (P3, P4)

**Hiện trạng** (`modules/pk`): cùng bản đồ, không trong làng, không ở lôi đài; lời mời 30 giây; trận kết thúc khi một bên còn 1 máu (không chết, không mất EXP, không tăng hiếu chiến); rời bản đồ hoặc thoát game hủy trận. Gói `duelReq { name }`, `duelAccept { from }` → `duel { with, name }`. Kiểm thử: `tests/e2e/ui-multiplayer.js` (bắt đầu và gây sát thương), `arena.js` (lời thách đấu gửi trước trận không nhận được trong phòng đấu).

**Phần cần nâng**: chặn `duelReq`/`duelAccept` ở mọi bản đồ `instance` (ma trận 0.3); việc này đi kèm `pvp-battlefield` (1 điều kiện `p.map.def.instance` trong `pk/index.js`). Cược xu khi thách đấu: **không làm** (biến thách đấu thành kênh chuyển xu không phí).

**Tiêu chí chấp nhận (đang đạt)**: `npm run test:ui` in "bắt đầu thách đấu" và "đòn đánh trong thách đấu gây sát thương cho B".

### 1.9 `pvp-arena` — Lôi đài xếp hạng (P3, P4, đặc sắc)

**Hiện trạng**: đúng như `CLAUDE.md` (mục Lôi đài) và `DESIGN_RULES.md` mục 9 hàng "Lôi đài xếp hạng": cấp 20, Elo 1.000, K = 32, biên ghép 100 + 50 mỗi 10 giây (tối đa 1.000), đếm ngược 5 giây + 3 phút, cấm vật phẩm và hồi máu, 3 trận tính điểm/cặp/ngày, 20 trận/ngày có thưởng, bỏ trận khi chưa ai ra đòn khóa 60 giây, thưởng tuần qua thư (hạng 1: 100 lượng, 2-3: 60, 4-10: 30, 11-50: 10). Kiểm thử `tests/features/arena.js` (47 kiểm tra), `e2e.js`.

**Phần cần nâng**: ghép cặp chỉ theo Elo nên khi trần cấp lên 199, nhân vật cấp 199 mới tạo Elo 1.000 sẽ gặp nhân vật cấp 20 Elo 1.000 và thắng chắc. Đặc tả nâng cấp ở mục 2.8 (`pvp-arena-bracket`). Danh vọng (`c.arena.fame`) là tiền tệ chung với chiến trường và Huyết Chiến; chỗ tiêu ở `gear-fame` (mục trang bị) và cửa hàng danh vọng (`pvp-battlefield`).

**Tiêu chí chấp nhận (đang đạt)**: `npm test` in toàn bộ khối "0g. Lôi đài" và "7j. Lôi đài xếp hạng".

### 1.10 `clan-core` — Gia tộc cơ bản (P4) — trạng thái `todo`

**Mục đích**: gia tộc là đơn vị xã hội bền nhất; phải chạy đúng và có kiểm thử trước khi xây `clan-war` lên trên.

**Hiện trạng** (`modules/clan`, NPC `clan` "Lão Gia Tộc" ở 3 làng, `windows/clan.js`, phím G):

| Quy tắc | Giá trị |
|---|---|
| Lập tộc | cấp 15, 50.000 xu (chỉ `c.xu`), tên 3-12 ký tự `[A-Za-z0-9]`, không trùng (không phân biệt hoa thường); thông báo toàn máy chủ |
| Chức | `leader` (tộc trưởng), `elder` (trưởng lão), `member`; trưởng lão mời, đuổi thành viên thường, sửa thông báo tộc; tộc trưởng thăng/giáng, nhường chức |
| Sức chứa | `20 + 5·cấp` (cấp 10: 70 người) |
| Cấp | 1-10; 100 xu góp = 1 EXP tộc; cần `2000·cấp²` EXP; góp tối thiểu 1.000 xu; mỗi cấp +1% EXP cho thành viên (móc `stats`) |
| Rời | tộc trưởng rời: nhường cho trưởng lão (vào sớm nhất), không có thì thành viên vào sớm nhất; còn 1 người thì giải tán; xóa nhân vật cũng đi đường này |
| Lưu | `db.clans[id] = { name, leader, created, notice, members{khóa: { name, rank, joined }}, level, exp, fund }`, `c.clan` |
| Gói | `npcAct { a: 'create', text }`, `clanInvite { name }`, `clanAccept { from }`, `clanLeave`, `clanKick { name }`, `clanInfo`, `clanNotice { text }`, `clanPromote { name, rank? }`, `clanDonate { xu }` → `clan`, `openUi { ui: 'clan' }` |
| Kiểm thử | `passive.js` chỉ có lập tộc + góp quỹ lên cấp 2; 7/8 hành động chưa có kiểm thử (`audit-systems` R7) |

**Phần cần nâng (GĐ 0)**:

| # | Việc | Quy tắc |
|---|---|---|
| C1 | Sửa lỗi chèn prototype | `clanKick`, `clanPromote` tra thành viên bằng `own(cl.members, key)`; `key = clean(m.name, 16).toLowerCase()` (mục 0.1) |
| C2 | Dọn dữ liệu gia tộc khi nạp | hàm `cleanClans(db)` trong `init` (export để kiểm thử): bỏ khóa thành viên không phải chuỗi chữ thường, `rank` ngoài 3 giá trị thì về `member`, `leader` không còn trong `members` thì chọn lại theo luật nhường chức, `level` kẹp 1-10, `exp`/`fund` số nguyên ≥ 0 (`fund` ≤ 2e12), nhân vật có `c.clan` trỏ tộc không còn mình thì `c.clan = null` (đã làm một phần ở `world.join`). `clanwar` mở rộng hàm này bằng `cleanClan` của nó |
| C3 | `clanDonate` dùng `int(m.xu)` kẹp `[1000, 2e9]` | thay `Math.floor(+m.xu)` |
| C4 | Giới hạn trưởng lão | tối đa 4 trưởng lão mỗi tộc; thăng người thứ 5 báo "Gia tộc đã đủ 4 trưởng lão." |
| C5 | Kiểm thử | file mới `tests/features/clan.js` (đơn vị + bot 3 nhân vật) phủ đủ 8 hành động + NPC lập tộc; `dev-test-coverage` coi phần gia tộc là xong khi file này đạt |

**Điện thoại**: cửa sổ Gia tộc hiện có giữ nguyên; nút Thăng/Giáng/Nhường/Đuổi cao ≥ 44px (`body.touch`), hàng nút xuống dòng khi rộng < 520px.

**Chống gian lận**: quỹ tộc không có đường rút ra xu; góp quỹ chỉ trừ `c.xu` (không xu khóa); mọi thao tác quyền hạn kiểm chức ở server; lời mời đi qua `invites.invite()`.

**Tiêu chí chấp nhận**:
1. `tests/features/clan.js` có ≥ 25 lời gọi `ok()` đạt, gồm: lập tộc thiếu cấp/thiếu xu/tên sai/trùng tên bị từ chối; mời + nhận; trưởng lão mời được, thành viên không mời được; đuổi theo quyền (trưởng lão không đuổi trưởng lão); thăng/giáng/nhường chức; tộc trưởng rời → trưởng lão lên thay; người cuối rời → giải tán, `db.clans` không còn khóa; xóa nhân vật tộc trưởng → nhường chức; `clanNotice` cắt 120 ký tự; góp 999 xu bị từ chối.
2. Kiểm thử đơn vị: `clanPromote { name: '__proto__', rank: 'leader' }` và `clanKick { name: 'constructor' }` không làm `({}).rank` khác `undefined`, `cl.leader` giữ nguyên.
3. Kiểm thử đơn vị `cleanClans`: tộc có `leader` không còn trong `members` được chọn lại; `rank: 'boss'` về `member`; `fund: -5` về 0.
4. `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`.

---

## 2. Hệ thống mới và hệ thống đã có đặc tả

### 2.1 `soc-chat-safety` — An toàn giao tiếp (P4, P5, Must, GĐ 4)

**Mục đích**: người chơi tự bảo vệ mình (chặn, tắt lời mời, tắt tin mật), máy chủ chặn chửi bậy, quảng cáo bán tiền thật và spam, quản trị có bằng chứng để xử lý. Đây là `M` vì thiếu nó thì kênh thế giới và lời mời là đường quấy rối không có cách tự vệ (vi phạm "tương tác an toàn" của P4) và không có cơ sở xử lý vi phạm (P5).

**Luồng người chơi**:
1. Bấm tên người khác (trên bản đồ hoặc trong khung chat) → menu người chơi có thêm "Chặn" và "Báo cáo".
2. "Chặn": hộp xác nhận `ask()` → người đó không còn gửi được chat (mọi kênh), tin mật, lời mời tới mình; tin của họ ở kênh bản đồ/thế giới/nhóm/gia tộc không hiện với mình. Bỏ chặn ở cửa sổ Bạn bè tab "Chặn" hoặc lệnh `/bochan <tên>`.
3. "Báo cáo": chọn lý do (Spam, Chửi bới, Gian lận/hack, Lừa đảo, Tên xấu), ghi chú ≤ 120 ký tự → máy chủ lưu kèm 10 dòng chat gần nhất của người bị báo cáo. Người báo cáo nhận "Đã ghi nhận báo cáo."
4. Cài đặt mục "Riêng tư": Nhận lời mời (Tất cả / Bạn bè, gia tộc, nhóm / Không ai), Nhận tin mật (cùng 3 mức), Ẩn trang bị khi người lạ xem (dùng cho `soc-inspect`).
5. Gõ từ cấm: chữ bị thay bằng dấu `*` (cả người gửi cũng thấy bản đã lọc); dán liên kết ngoài hoặc số điện thoại: thay bằng `[liên kết]` / `***`. Lặp một câu 3 lần trong 30 giây: tin thứ 3 bị chặn kèm cảnh báo.
6. Bị cấm chat: gõ vào kênh bị cấm nhận "Ngươi bị cấm chat tới HH:MM (lý do: <lý do>)", phần lý do lấy từ `c.mute.why`.

**Quy tắc, công thức** (`SAFETY` trong `src/shared/data/chatfilter.js`):

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `blockMax` | 100 | số người chặn tối đa (`c.blocks`) |
| `inviteGap` | 10000 ms | cùng loại lời mời tới cùng người cách nhau ≥ 10 giây |
| `invitePerMin` | 20 | mỗi người gửi tối đa 20 lời mời mỗi phút (mọi loại) |
| `repeat` | `{ n: 3, ms: 30000 }` | cùng nội dung (đã chuẩn hóa) 3 lần trong 30 giây: chặn tin thứ 3 |
| `repeatMute` | `{ n: 2, ms: 600000, mute: 300000 }` | vi phạm lặp tin 2 lần trong 10 phút: tự cấm kênh công khai (bản đồ, thế giới) 5 phút |
| `reportGap` | 30000 ms | mỗi người báo cáo cách nhau ≥ 30 giây |
| `reportDay` | 10 | tối đa 10 báo cáo mỗi ngày (giờ Việt Nam) |
| `reportSame` | 3600000 ms | cùng một người bị cùng một người báo cáo tối đa 1 lần mỗi giờ |
| `reportKeep` | `{ max: 2000, days: 30 }` | lưu tối đa 2.000 báo cáo, xóa báo cáo quá 30 ngày |
| `ctxLines` | 10 (giữ 20 dòng trong RAM) | số dòng chat gần nhất của người bị báo cáo đính kèm |
| `autoMute` | `{ n: 3, ms: 3600000, minLv: 20, mute: 1800000 }` | ≥ 3 báo cáo lý do Spam/Chửi bới từ 3 **tài khoản và IP khác nhau**, người báo cáo cấp ≥ 20, trong 60 phút: tự cấm kênh công khai 30 phút, ghi vào danh sách báo cáo dòng "tự động" |
| `reasons` | `spam, abuse, cheat, scam, name` | nhãn: Spam, Chửi bới, Gian lận/hack, Lừa đảo, Tên xấu |

Chuẩn hóa để lọc (`fold`): bỏ dấu tiếng Việt, `đ → d`, chữ thường, bỏ ký tự ngăn cách nằm giữa chữ (`. _ - *`), gộp chữ lặp ≥ 3 lần về 1, đổi số/ký hiệu thay chữ (`0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s`). Từ cấm (`BAD_WORDS`, ≥ 80 mục, chủ dự án duyệt danh sách) khớp **theo từ nguyên** trên bản đã chuẩn hóa (cụm nhiều từ khớp theo dãy từ); không khớp chuỗi con để tránh chặn nhầm từ thường. Liên kết: `(https?://|www\.)\S+` và `tên-miền.(com|net|vn|org|io|xyz|me|gg|link|shop|top)` trừ tên miền trong `LINK_ALLOW` (tên miền chính thức của game) → `[liên kết]`. Số điện thoại: dãy có ≥ 9 chữ số (cho phép khoảng trắng, dấu chấm, gạch) → `***`. Lọc chạy trên server trước khi phát; tên nhân vật và tên gia tộc mới cũng qua `nameOk(name)` (từ chối nếu chứa từ cấm sau chuẩn hóa).

Thứ tự xử lý gói `chat` (server): (1) lệnh `/` như cũ; (2) kiểm cấm chat theo kênh; (3) giới hạn tần suất cũ (0,8 giây; thế giới 8 giây); (4) chống lặp; (5) lọc; (6) ghi vào vòng đệm 20 dòng của người gửi (`p.chatLog`, chỉ RAM); (7) phát cho từng người nhận, **bỏ qua** người có người gửi trong danh sách chặn; tin mật tới người chặn mình hoặc người đặt "Nhận tin mật" không cho phép thì người gửi nhận câu giống hệt người offline "Người chơi không online hoặc không nhận tin mật." (không lộ việc bị chặn).

Lời mời (`invites.invite`): bỏ qua im lặng với người nhận và báo người gửi "Người chơi không nhận lời mời." khi: người nhận chặn người gửi; cài đặt "Nhận lời mời" không cho phép (mức 1: chỉ bạn bè, cùng gia tộc, cùng nhóm); vượt `inviteGap`/`invitePerMin` (báo "Gửi lời mời quá nhanh.").

**Dữ liệu**:

| File | Nội dung | Gửi client? |
|---|---|---|
| `src/shared/data/chatfilter.js` (mới) | `SAFETY`, `BAD_WORDS`, `LINK_ALLOW`, hàm thuần `fold`, `filterText(text) → { text, hit }`, `nameOk(name)` | chỉ `SAFETY` (qua `clientData.safety`: `blockMax`, `reasons` có nhãn); **không** gửi danh sách từ cấm |

**Lưu trữ**:

| Trường | Kiểu | Dọn ở |
|---|---|---|
| `c.blocks` | mảng tên (≤ 100) | `sanitize` qua `cleanNames(list, 100)` (dùng chung cho `c.friends`, 50) |
| `c.social` | `{ inv: 0\|1\|2, pm: 0\|1\|2, hideEq: bool }` | `sanitize` (sai kiểu → mặc định `{ inv: 0, pm: 0, hideEq: false }`) |
| `c.mute` | `{ until: ms, ch: 'pub'\|'all', why: chuỗi ≤ 60, by: chuỗi ≤ 16 }` hoặc `null` | `sanitize` (hết hạn → `null`) |
| `db.meta.reports` | mảng `{ id, at, from, facc, target, reason, note, ctx: [{ at, ch, msg }], auto }` | `cleanReports` lúc `init` (bỏ phần tử hỏng, cắt theo `reportKeep`) |

**Gói**:

| Hướng | `t` | Trường | Kiểm tra server |
|---|---|---|---|
| c → s | `blockAdd` | `name` | `clean(name, 16)`, không phải mình, nhân vật tồn tại (`db.getChar`), chưa đủ 100 |
| c → s | `blockDel` | `name` | có trong danh sách |
| c → s | `blockList` | | cách ≥ 1 giây |
| c → s | `report` | `name, reason, note` | `reason` thuộc `SAFETY.reasons` (so chuỗi), `note = clean(note, 120)`, các giới hạn `reportGap/Day/Same`, không tự báo cáo mình |
| c → s | `socialSet` | `inv, pm, hideEq` | `int` kẹp 0-2, `!!hideEq`; cách ≥ 1 giây |
| s → c | `blocks` | `list: [{ name, lv, cls, online }]` | |
| s → c | `reportResult` | `ok, msg` | |
| s → c | `me` (có sẵn) | thêm `social`, `mute: { until, ch } \| null` | |

Lệnh chat mới: `/chan <tên>`, `/bochan <tên>` (mọi người); admin: `/camchat <tên> <phút> [pub|all] [lý do]`, `/mochat <tên>`, `/baocao [n]` (in n báo cáo mới nhất, mặc định 5).

**Module, cửa sổ, DOM**:

| Phía | Thành phần |
|---|---|
| Server | module mới `src/server/modules/safety/index.js` (`expose: 'safety'`), API cho module khác: `world.safety.allow(to, from, kind)` (`kind`: `'chat'\|'pm'\|'invite'`), `world.safety.check(p, ch, text)` → chuỗi đã lọc hoặc `null` (bị chặn/cấm), `world.safety.isMuted(p, ch)`. Móc: `sanitize`, `selfData`, `clientData`, `join` (dựng `p.blockSet` là `Set` tên thường), `charDeleted` (không cần xóa tên khỏi danh sách người khác: `blockList` tự bỏ tên không còn) |
| Sửa tối thiểu | `modules/chat` (gọi `check` + phát theo người nhận), `modules/invites` (`invite` gọi `allow`), `core/gateway.js` (`createChar` gọi `nameOk`), `modules/clan` (`clanCreate` gọi `nameOk`), `modules/admin` (3 `case` mới) |
| Client | `windows/friends.js` tab `[data-frtab=block]` "Chặn" (hàng `.blk-row`: tên, Lv phái, chấm online, nút "Bỏ chặn"); `windows/dialog.js` `.pmenu` thêm `it('block', 'Chặn')` và `it('report', 'Báo cáo')` với `[data-act=block]`, `[data-act=report]`, khung báo cáo `.rep-form` (5 nút lý do dạng chip, ô ghi chú, nút "Gửi"); `windows/settings.js` mục "Riêng tư" (`[data-act=social-inv]`, `[data-act=social-pm]`, `[data-act=social-hide]`); khung chat: bấm tên người gửi mở `.pmenu` nếu người đó online |
| DOM | không thêm id; giữ nguyên `#chat-*`, `#invites` |

**Bố cục điện thoại**: chip lý do và nút trong `.rep-form` cao ≥ 44px, xếp 2 hàng ở màn ≤ 760px; tab "Chặn" dùng chung lưới danh sách với tab Bạn bè; bấm giữ (≥ 450 ms) vào tên trong khung chat cũng mở `.pmenu` (điện thoại không có trỏ chuột).

**Chống gian lận, lạm dụng**: không tin số/chuỗi từ client (mục X1); báo cáo không có thưởng và không tự phạt nặng (tự cấm chỉ 30 phút kênh công khai, cần 3 tài khoản + 3 IP khác nhau cấp ≥ 20) để nhóm nhân vật phụ không lạm dụng được; danh sách từ cấm không gửi client (không dò được để lách); bộ lọc chạy sau giới hạn tần suất (tin rác không tốn CPU lọc).

**Tiêu chí chấp nhận**:
1. `tests/features/chatsafe.js` có ≥ 30 `ok()` đạt trong `npm test`, gồm: A chặn B → chat bản đồ, thế giới, nhóm của B không tới A, tới C vẫn có; tin mật B → A trả câu "không online hoặc không nhận tin mật"; lời mời nhóm/giao dịch/thách đấu/kết bạn của B tới A bị bỏ; bỏ chặn thì nhận lại bình thường; `blockAdd { name: '__proto__' }` và tên 200 ký tự không làm hỏng dữ liệu; `c.blocks` dài 101 phần tử lúc nạp bị cắt còn 100.
2. Đơn vị: `filterText` thay đúng từ cấm có dấu, không dấu, chèn dấu chấm, chữ lặp, số thay chữ; **không** thay 20 câu thường có chứa chuỗi con trùng từ cấm (bộ câu đối chứng nằm trong file kiểm thử); liên kết ngoài → `[liên kết]`, tên miền trong `LINK_ALLOW` giữ nguyên; `0912 345 678` → `***`.
3. Đơn vị: `filterText` chạy 10.000 lần với câu 140 ký tự trung bình ≤ 0,05 ms/lần (in số đo trong kiểm thử).
4. Bot: lặp cùng câu 3 lần trong 30 giây → tin thứ 3 không tới người khác; 3 bot cấp 20 (tài khoản khác nhau) báo cáo cùng người lý do `spam` → người đó bị cấm kênh công khai 30 phút, vẫn chat nhóm được; `/mochat` gỡ cấm.
5. Bot: báo cáo lần 2 trong 30 giây bị từ chối; báo cáo lưu kèm ≤ 10 dòng chat gần nhất của người bị báo cáo; khởi động lại máy chủ (`persistence.js`) báo cáo còn nguyên.
6. Tạo nhân vật/gia tộc tên chứa từ cấm bị từ chối với thông báo rõ.
7. `tools/shot.js` chụp cửa sổ Bạn bè tab Chặn và khung báo cáo ở 1280×720 và `mobile: true`, in `OK no console errors`; `npm run test:ui` đạt (menu người chơi đổi).

**Kiểm thử**: `tests/features/chatsafe.js` (mới, đơn vị + bot, tài khoản `chat_a, chat_b, chat_c`), bổ sung `tests/e2e/ui-multiplayer.js` (bấm "Chặn" từ menu người chơi, chat của người bị chặn không hiện).

### 2.2 `soc-party-plus` — Tìm nhóm và luật chia đồ (P4, Should, GĐ 4)

**Mục đích**: người chơi điện thoại chơi phiên ngắn tìm được bạn đi hang/phó bản/boss trong vài chục giây mà không phải rao ở kênh thế giới; nhóm tự chọn cách chia đồ công bằng.

**Luồng người chơi**:
1. Cửa sổ Nhóm (phím có sẵn) có 2 tab `[data-ptab=mine]` "Nhóm của ta" (nội dung cũ) và `[data-ptab=lfg]` "Tìm nhóm".
2. Tab Tìm nhóm: danh sách tin (mục tiêu, ghi chú, cấp yêu cầu, số người n/6, bản đồ trưởng nhóm). Tin hợp cấp mình xếp trước. Nút "Xin vào".
3. Người chưa có nhóm hoặc trưởng nhóm bấm "Đăng tin": chọn mục tiêu (Hang động, Phó bản, Săn boss, Luyện cấp, Nhiệm vụ, Khác), cấp từ-đến, ghi chú ≤ 60 ký tự.
4. Trưởng nhóm nhận lời mời kiểu `apply` ("X (Lv N, phái) xin vào nhóm") ở khung lời mời như các lời mời khác → "Đồng ý" thì X vào nhóm.
5. Trưởng nhóm chọn luật chia đồ ở tab Nhóm của ta: **Tự do** (như hiện tại) hoặc **Luân phiên**.

**Quy tắc** (`LFG`, `PARTY_RULES` trong `src/shared/data/social.js` mới):

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `LFG.goals` | `hang, pho, boss, luyen, nv, khac` + nhãn | mục tiêu |
| `LFG.noteLen` | 60 | ghi chú |
| `LFG.ttl` | 900000 ms | tin tự hết sau 15 phút; nhóm đủ 6, giải tán, trưởng nhóm thoát game thì tin bị xóa ngay |
| `LFG.max` | 300 | tổng tin toàn máy chủ (đầy thì từ chối tin mới) |
| `LFG.postGap` / `applyGap` | 10000 / 5000 ms | đăng tin lại, xin vào |
| `LFG.listMax` | 50 | số tin trả về mỗi lần xem |
| `PARTY_RULES.expRange` | 900 px | thành viên chỉ nhận EXP chia nhóm khi ở cùng bản đồ **và** cách quái bị hạ ≤ 900 px theo chiều ngang (hiện tại: cả bản đồ); người ngoài tầm không được tính vào số người `n` của hệ số `1 + 0,12·(n − 1)` |
| `PARTY_RULES.lootRange` | 600 px | tầm nhận lượt ở chế độ Luân phiên |

Luật Luân phiên: với mỗi **vật phẩm** (không áp cho xu) rơi từ quái do thành viên hạ, quyền nhặt 15 giây gán cho thành viên kế tiếp theo con trỏ `party.turn` trong số thành viên còn sống, cùng bản đồ, cách quái ≤ 600 px (vòng qua người không đủ điều kiện; không ai đủ thì gán cho người hạ). Trong 15 giây đó chỉ người được gán nhặt được (không mở cho cả nhóm như chế độ Tự do). Món độ hiếm ≥ 2 hoặc rơi từ boss: phát dòng chat nhóm "Lượt nhặt: <tên> nhận <món>". Tự nhặt của thú cưng tôn trọng quyền nhặt như cũ.

**Dữ liệu và lưu**: tin tìm nhóm và luật chia đồ chỉ trong RAM (nhóm vốn không lưu). Không thêm trường trên nhân vật.

**Gói**:

| Hướng | `t` | Trường | Kiểm tra server |
|---|---|---|---|
| c → s | `lfgList` | `goal?` | cách ≥ 1 giây; `goal` thuộc danh sách hoặc bỏ qua |
| c → s | `lfgPost` | `goal, note, lvMin, lvMax` | chưa có nhóm hoặc là trưởng nhóm, nhóm chưa đủ; `int` kẹp 1-199, `lvMin ≤ lvMax`; `clean(note, 60)` qua `world.safety.check` nếu có |
| c → s | `lfgDel` | | xóa tin của mình |
| c → s | `lfgApply` | `id` | `int`; chưa có nhóm; cấp trong khoảng; gửi `invite { kind: 'apply', from, lv, cls }` tới trưởng nhóm qua `invites.invite` |
| c → s | `applyAccept` | `from` | là trưởng nhóm (hoặc chủ tin khi chưa có nhóm), `takeInvite(p, 'apply', from)`, người xin còn online và chưa có nhóm, nhóm chưa đủ |
| c → s | `partyLoot` | `mode` | trưởng nhóm; `mode === 'turn' ? 'turn' : 'free'` |
| s → c | `lfg` | `list: [{ id, leader, lv, cls, goal, note, n, map, lvMin, lvMax, at, mine }], max` | |
| s → c | `party` (có sẵn) | thêm `loot` | |

**Module, cửa sổ, DOM**: `modules/party` (thêm hành động, không module mới); sửa tối thiểu `core/combat.js` (`shareExp` lọc theo `expRange`, chỗ gán chủ đồ rơi theo luật nhóm) và `core/map.js` (`canPick` không mở cho cả nhóm khi `party.loot === 'turn'`) — vùng Lõi server, Read lại trước khi Edit; `windows/party.js` 2 tab `data-ptab`; lời mời `apply` hiển thị ở `#invites` như các loại khác (`windows/dialog.js`). Không thêm id DOM.

**Bố cục điện thoại**: tab Tìm nhóm là danh sách 1 cột, mỗi hàng cao ≥ 52px, nút "Xin vào" 44px ở mép phải; form đăng tin là 1 hàng chip mục tiêu cuộn ngang + 2 ô số + ô ghi chú + nút.

**Chống gian lận**: số cấp, mục tiêu, id tin qua `int`/so chuỗi; tin tìm nhóm không chứa vật phẩm hay tiền; chế độ Luân phiên chỉ đổi người được nhặt, không tạo thêm đồ; EXP theo tầm khoảng cách giảm cày cấp bằng cách đứng ở góc bản đồ.

**Tiêu chí chấp nhận**:
1. `tests/features/party.js` có ≥ 20 `ok()` đạt: đăng tin, thấy tin ở bot khác, xin vào → trưởng nhóm đồng ý → nhóm 2 người; xin vào ngoài khoảng cấp bị từ chối; nhóm đủ 6 thì tin biến mất; `lfgApply { id: '__proto__' }` không gây lỗi; `partyLeave`, `partyKick` (chuyển trưởng nhóm, giải tán khi còn 1 người).
2. Luân phiên: 3 bot cùng nhóm đứng gần, bot A hạ 3 quái có rơi vật phẩm → quyền nhặt lần lượt thuộc B, C, A (kiểm trường chủ món trong gói `gAdd` hoặc thử nhặt bằng `pickup`); người không được gán nhặt trong 15 giây nhận "Vật phẩm này thuộc về người khác."
3. EXP: thành viên đứng cách quái 1.200 px không nhận `expGain` khi đồng đội hạ quái; đứng cách 500 px thì nhận.
4. `DESIGN_RULES.md` mục 9 có hàng "Nhóm" ghi hệ số EXP, tầm 900 px, luật chia đồ (ADR-05c-3).
5. Ảnh `tools/shot.js` cửa sổ Nhóm tab Tìm nhóm ở desktop và điện thoại, in `OK no console errors`.

**Kiểm thử**: `tests/features/party.js` (mới, tài khoản `nhom_a, nhom_b, nhom_c`), `tests/e2e/ui-multiplayer.js` (xin vào nhóm qua giao diện).

### 2.3 `soc-inspect` — Xem người chơi kể cả offline (P4, Could, GĐ 4)

**Mục đích**: khoe đồ, thú, ngoại hình, danh hiệu; tra người trên bảng xếp hạng và người đã hạ mình, kể cả khi họ offline.

**Luồng**: bấm "Xem thông tin" ở menu người chơi, gõ `/xem <tên>`, bấm tên trong bảng xếp hạng/bạn bè/kẻ thù → cửa sổ Xem có 2 tab `[data-instab=gear]` "Trang bị" (như hiện tại) và `[data-instab=look]` "Ngoại hình & thú" (chân dung vẽ bằng `drawPortrait` với thời trang, thú cưỡi; thú cưng bằng `drawPet` kèm cấp và thân mật).

**Quy tắc**:

| Mục | Quy tắc |
|---|---|
| Online | như hiện tại + `fashion` (4 ô thời trang), `pet` (`id, plv, love`), `title`, `clan`, `online: true` |
| Offline | đọc `db.getChar(tên)`: `name, cls, lv, equip` (bỏ món đã hết hạn), `clan`, `title`, `last` (ngày giờ đăng nhập cuối), `s` lấy từ ảnh chụp chỉ số `c.snap`, `online: false` |
| Ảnh chụp chỉ số | `c.snap = { maxHp, maxMp, atk, def, crit, dodge }` (các khóa mà cửa sổ Xem đang hiển thị) ghi ở móc `leave` và mỗi lần `world.saveAll` cho người online |
| Riêng tư | `c.social.hideEq = true` (cài đặt ở `soc-chat-safety`): người không cùng nhóm/gia tộc/bạn bè chỉ thấy tên, cấp, phái, gia tộc, danh hiệu; gói có `hidden: true` |
| Giới hạn | `inspect` cách ≥ 1 giây mỗi người; tên `clean(name, 16)` |

**Gói**: `inspect { name }` → `inspect { name, cls, lv, equip?, s?, clan, title, pk, fashion?, pet?, online, last?, hidden? }` (giữ tên trường cũ, chỉ thêm).

**Module, cửa sổ**: `modules/rank` (`inspect`), `core/player.js` (ghi `c.snap`, vùng Lõi), `windows/inspect.js`. Không id DOM mới.

**Điện thoại**: 2 tab chiếm cả chiều ngang, chân dung 96×96 tỉ lệ 4, lưới trang bị 3 cột.

**Chống gian lận**: chỉ đọc; không lộ `c.mail`, `c.inv`, tiền; người offline đọc qua `getChar` (không trỏ prototype).

**Tiêu chí chấp nhận**:
1. `tests/features/social.js` thêm ≥ 6 `ok()`: xem người online có `fashion`, `pet`; xem người offline có `equip`, `s.maxHp > 0`, `online: false`; bật `hideEq` thì người lạ nhận `hidden: true` không có `equip`, bạn bè vẫn thấy; tên `__proto__` nhận "Không tìm thấy người chơi."
2. Ảnh cửa sổ Xem cả 2 tab ở desktop và điện thoại, in `OK no console errors`.

**Kiểm thử**: `tests/features/social.js`.

### 2.4 `soc-titles` — Danh hiệu, thành tựu, kẻ thù (P4, Should, GĐ 4)

**Nguồn chi tiết**: `specs/titles.md` + phụ lục lô 2. Tóm theo khuôn:

| Mục | Nội dung |
|---|---|
| Mục đích | mốc dài hạn có thưởng, danh hiệu khoe trên đầu, ghi nhớ kẻ đã hạ mình (nền cho truy nã của `pvp-freezone`) |
| Luồng | đạt mốc → thông báo + chấm đỏ nút Nhân vật → cửa sổ "Danh Hiệu & Thành Tựu" (nút ở chân cửa sổ Nhân vật, **không** phím tắt) → Nhận thưởng; tab Danh hiệu → Đeo (1 danh hiệu, cộng chỉ số nhỏ, hiện chữ màu trên tên) ; cửa sổ Bạn bè tab Kẻ thù |
| Dữ liệu | `src/shared/data/titles.js`: `ACH_KEYS` (9 nhóm), `ACH` (34 mục + 3 mục mới dưới đây), `TITLES` (20 + 2 mới), `TITLE_STAT_CAP = { atk: 100, def: 50, hp: 800, crit: 2, dodge: 2, expPct: 5 }`, `ACH_LUONG_MAX` |
| Lưu | `c.ach = { on, cnt: { boss, tathu, tathuTop, pk, plus }, done, got }`, `c.enemies = [{ name, n, at }]` (≤ 20) |
| Móc mới | `playerKilled(victim, killer)` (phát trong `killPlayer`; lôi đài, thách đấu, chiến trường, chiến gia tộc không đi qua nên không tính), `progress(p, key, n)` (Thợ Rèn báo cấp cường hóa) |
| Gói | `achClaim { id }`, `titleSet { id }`, `enemyList`, `enemyDel { name }` → `ach { on, v, done, got }`, `enemies { list }`; `me.title`; `info().title` (đi trong `pJoin`/`pInfo`) |
| Module/cửa sổ | `modules/titles` (mới), `windows/titles.js` (cửa sổ `ach`), sửa `windows/friends.js`, `windows/character.js`, `game.js` (`drawName` thêm 1 dòng), `core/combat.js` (1 dòng `emit`), `modules/smith` (1 dòng), `core/player.js` (`info`), `core/modules.js` (2 móc), admin `/thanhtuu` |
| Chống gian lận | nhận thưởng ghi `got` ngay sau `giveReward` (đồng bộ); id tra `Map`/`own`; PK chỉ tính khi nạn nhân cấp ≥ 10 và ≥ cấp người hạ − 10, mỗi cặp 1 lần/30 phút, thưởng PK chỉ xu nhỏ; `titleSet` cách 2 giây, cấm khi `p.match` |
| Kiểm thử | `tests/features/titles.js` (đơn vị + bot `dhieu_a`, `dhieu_b`), check-data khối danh hiệu |

**Chỉnh so với đặc tả** (ưu tiên hơn `specs/titles.md`):

| # | Chỉnh | Lý do |
|---|---|---|
| T1 | Tab dùng `data-achtab="ach\|title"` và `data-frtab="friends\|enemies"` thay `data-tab` | quy ước X6 |
| T2 | Thêm 3 mốc cấp: `lv_7` (140, "Phá Cảnh Thượng Giới", 30 lượng, danh hiệu `t_lv_7` "Thượng Giới Hành Giả", grade 2, `{ hp: 500, def: 25 }`), `lv_8` (170, "Tinh Hà Lữ Khách", 30 lượng), `lv_9` (199, "Thái Cực Viên Mãn", 60 lượng + 2 Rương Báu, danh hiệu `t_lv_9` "Thái Cực Chân Nhân", grade 4, `{ hp: 800, atk: 80, def: 50 }`); `ACH_LUONG_MAX` 400 → 500 (tổng mới 500) | cấp tối đa 199 (`content/00-foundation.md` mục 7.3); chỉ số trong `TITLE_STAT_CAP` |
| T3 | `quest_4` dùng `MAIN_QUESTS.length` nên tự lên ≥ 120 nhiệm vụ; giữ | |
| T4 | Thưởng là thưởng kiểu nhiệm vụ: `giveReward(p, r, { bound: true })`, xu thành xu khóa, vật phẩm khóa; lượng giữ là lượng | phụ lục lô 2, quy ước X3 |

**Tiêu chí chấp nhận**: theo `specs/titles.md` mục 4 (≥ 35 `ok()` trong `tests/features/titles.js`), cộng: (1) `npm run check` kiểm mọi `TITLES[*].stats` ≤ `TITLE_STAT_CAP`, tổng lượng ≤ `ACH_LUONG_MAX`, mốc `level` ≤ `MAX_LEVEL`; (2) không cửa sổ nào của tính năng dùng `data-tab` (`grep -n "data-tab" src/client/js/ui/windows/titles.js` không có kết quả); (3) ảnh desktop + điện thoại cửa sổ `ach` và tab Kẻ thù in `OK no console errors`; (4) `npm run test:ui` đạt (cửa sổ Bạn bè đổi).

### 2.5 `eco-market` — Chợ Ký Gửi (P4, P5, Should, GĐ 3)

**Nguồn chi tiết**: `specs/market.md` + phụ lục lô 2 (đã sửa theo xu khóa). Tóm theo khuôn:

| Mục | Nội dung |
|---|---|
| Mục đích | người chơi bán đồ cho nhau khi offline, giá do người chơi đặt; phí đăng + thuế là điểm hút tiền |
| Luồng | NPC Chưởng Quỹ ở cuối mỗi làng (x 1600; làng rộng 1800) → cửa sổ "Chợ Ký Gửi" 4 tab `data-mktab`: Mua hàng / Đăng bán / Hàng của tôi / Lịch sử; mua bấm 2 lần ("Mua" → "Xác nhận" trong 4 giây) |
| Quy tắc | cấp ≥ 10; bày 48 giờ; 8 tin/nhân vật, 5.000 tin toàn máy chủ; giá xu 100-1.000.000.000, lượng 1-100.000 (cả lô); phí đăng 1% giá trị quy xu (1 lượng = 5.000 xu), kẹp 100-20.000 xu, trả bằng `payXu`, không hoàn; thuế 5% làm tròn xuống trừ vào tiền người bán; cấm vật phẩm nhiệm vụ, đồ có hạn, đồ khóa (`canTransfer`); cấm mua hàng của mình hoặc cùng tài khoản; hết hạn trả về hộp thư, hộp thư đầy thì nằm lại "Hết hạn – chờ trả" và thử lại mỗi 30 giây |
| Dữ liệu | `src/shared/data/market.js` (`MARKET`, `CATS` 11 loại, `catOf`, `tierOf`, `listFee`, `saleNet`, `fold`); `NPC_TYPES.market`, 3 NPC (Chưởng Quỹ Phú Quý / Hữu Tài / Đắc Lợi), cổng phải làng x 1784 |
| Lưu | `db.meta.market = { seq, list, log }` (nhật ký 500 giao dịch), `c.mkLog` (30 mục) |
| Gói | `mkSearch { npc, cat, tier, cur, min, max, q, sort, page }`, `mkMine`, `mkLog`, `mkSell { npc, slot, qty, cur, price }`, `mkBuy { npc, id, cur, price }`, `mkCancel { npc, id }` → `mkOpen`, `mkList`, `mkMine`, `mkLog` |
| Module/cửa sổ | `modules/market` (mới, `expose: 'market'`), `windows/market.js`, `css/market.css` (link sau `worldmap.css`), NPC trong `render/sprites/npc.js`, nhà trong `render/map/village.js` |
| Điện thoại | hàng loại cuộn ngang; bộ lọc xếp 2 hàng; tab Đăng bán 2 cột thành xếp dọc; mọi nút ≥ 44px |
| Chống nhân bản | gỡ tin khỏi `store.list` **trước** khi trừ tiền/thêm đồ; người mua nhận bản sao sâu; mua lại cùng id bị từ chối; hết hạn chỉ gỡ tin sau khi `sendItems` thành công; không `await` giữa kiểm và làm; gói không chứa `sk`, `acc` |
| Kiểm thử | `tests/features/market.js` (đơn vị + bot `cho_ban`, `cho_mua`), check-data khối chợ |

**Chỉnh so với đặc tả**:

| # | Chỉnh | Lý do |
|---|---|---|
| M1 | Nhật ký kiểm toán: ngoài `store.log`, mỗi lần mua ghi 1 dòng vào nhật ký của `ops-audit-log` khi tính năng đó có (`{ t: 'market', id, q, cur, price, s, b }`) | `audit-risk` R-26 |
| M2 | Trạm Thượng Giới (`content/10-world.md`) **không** có Chưởng Quỹ; chợ dùng chung toàn máy chủ nên 3 làng là đủ, Phu Xe đưa người về làng | giữ bố cục trạm 5-6 nhà |
| M3 | Giá trần lượng 100.000 và luồng lượng giữa người chơi được ghi thành ADR-05c-1 | P5, chuẩn bị cho `mon-topup` |

**Tiêu chí chấp nhận**: theo `specs/market.md` mục 6 (bảng công thức đơn vị, 17 bước bot), cộng: (1) `grep -n "1580\|1624\|1640" src/shared/data/maps.js` không có kết quả; (2) `npm run check` sạch; (3) ảnh 4 tab desktop + điện thoại in `OK no console errors`; (4) đo bằng script trong `tests/features/market.js`: `mkSearch` trên 5.000 tin trả lời ≤ 5 ms.

### 2.6 `clan-war` — Gia tộc mở rộng và chiến gia tộc (P4, Should, GĐ 4, đặc sắc)

**Nguồn chi tiết**: `specs/clanwar.md` + phụ lục lô 3. Phụ thuộc `clan-core` (phải xong trước). Tóm theo khuôn:

| Mục | Nội dung |
|---|---|
| Mục đích | gia tộc có việc mỗi ngày (nhiệm vụ, cửa hàng cống hiến, trận pháp, boss Tộc Địa) và một sân đấu tập thể theo lịch |
| Luồng | cửa sổ Gia tộc (G) có 6 tab `data-cltab`: Thành viên / Nhiệm vụ / Cửa hàng / Trận pháp / Tộc Địa / Chiến; NPC Lão Gia Tộc thêm "Vào ải boss của gia tộc", "Chiến gia tộc" |
| Nhiệm vụ ngày | Luyện Binh (diệt 60 quái không thấp hơn cấp mình quá 10): 30 cống hiến, 300 EXP tộc, 5.000 xu khóa; Góp Quỹ (góp 20.000 xu): 20 cống hiến; Thủ Hộ Tộc Địa (có mặt khi hạ boss Tộc Địa): 40 cống hiến, 300 EXP tộc, 10.000 xu khóa |
| Cống hiến | cá nhân, gắn với gia tộc (rời tộc là mất); góp quỹ 1.000 xu = 1 cống hiến, tối đa 100/ngày từ góp quỹ |
| Cửa hàng | 12 mục gốc + 10 mục Thượng Giới nối cuối (`content/40-items-shops.md` mục 4.14), mở theo cấp gia tộc, giới hạn lượt/ngày, đồ mua là đồ khóa |
| Trận pháp | 5 trận (tấn công 0,5%/cấp, phòng thủ 0,8%, sinh lực 0,8%, chí mạng 0,2, EXP 0,5%), cấp ≤ cấp gia tộc ≤ 10, phí `30.000·L²` xu từ quỹ |
| Tộc Địa | 1 lần hạ boss/ngày/tộc, mở 30 phút; 5 bậc boss: Thạch Lang Hộ Sơn (30, tộc cấp 1), Huyết Ưng Tộc Chủ (60, cấp 4), Hắc Khôi Thủ Lăng (95, cấp 7), Băng Tâm Hộ Tộc Thần (140, cấp 9), Thần Long Tổ Miếu (180, cấp 10) (2 bậc cuối do `pve-clanboss`); HP boss ×1.000; thưởng 50 cống hiến + 500 EXP tộc cho thành viên có mặt đã vào tộc ≥ 12 giờ |
| Chiến gia tộc | thứ 3/5/7; đăng ký (tộc trưởng/trưởng lão, tộc ≥ 3 người) tới 21:15, ghép cặp theo sức mạnh `cấp tộc·1000 + tổng cấp 15 người cao nhất`, mở 21:25, đánh 21:30-21:45 ở bản đồ `tocchien`; ≤ 15 người mỗi phe, cấp ≥ 20, vào tộc ≥ 12 giờ; hạ địch +10 (mỗi nạn nhân tính tối đa 8 lần), 3 cờ (x 400/800/1200, bán kính 70, cần 10 điểm chiếm, +20 khi chiếm, +3 mỗi 5 giây khi giữ); khiên 5 giây sau hồi sinh; thưởng cần ở trận ≥ 3 phút: thắng 150 cống hiến + 30.000 xu, hòa 100 + 20.000, thua 60 + 10.000 (xu thường); tộc không có đối thủ nhận 800 EXP tộc |
| Lưu | `db.clans[id]`: `members[k].cp, cpt`, `skills`, `terr { day, killed }`, `war { win, lose, draw }`; `c.ctask`, `c.cshop`; `db.meta.clanwar { day, list, pairs, paired }`; trận và Tộc Địa đang mở chỉ trong RAM |
| Gói | `clanX`, `clanTaskClaim { i }`, `clanShopBuy { i, n }`, `clanSkillUp { k }`, `clanTerrOpen { tier }`, `clanTerrEnter`, `clanWarSignup`, `clanWarEnter` → `clanx`, `clanTerr`, `cw`, `cwResult` |
| Module/cửa sổ/DOM | `modules/clanwar` (mới, `expose: 'clanwar'`), `src/shared/data/clan.js`, bản đồ `lanhdia`, `tocchien`; `windows/clanwar.js`, cửa sổ `cwres`; HUD `#hud-cw` ngay sau `#hud-arena`; `render/clanflag.js`; icon `cwflag`; sửa `core/combat.js` 3 chỗ |
| Điện thoại | thanh tab cuộn ngang; lưới cửa hàng 2 cột ở ≤ 600px; `#hud-cw` thu 85%, không che `#hud-status`, `#minimap` |
| Chống gian lận | xem `specs/clanwar.md` mục 6 (nhận đôi, cửa hàng nguyên tử, nhảy tộc lấy thưởng, nuôi điểm, quỹ không rút được, người ngoài tộc bị đẩy khỏi Tộc Địa) |
| Kiểm thử | `tests/features/clanwar.js` (đơn vị + bot `cw_alpha`, `cw_bravo`), check-data khối gia tộc |

**Chỉnh so với đặc tả**:

| # | Chỉnh | Lý do |
|---|---|---|
| W1 | `clanTerrOpen` kẹp `tier` trong `0..CLAN.terr.tiers.length − 1`; cửa sổ vẽ mọi bậc trong dữ liệu (lưới 2 cột trên điện thoại) | `pve-clanboss` thêm bậc 4-5 |
| W2 | `cleanClan` của `clanwar` gọi sau `cleanClans` của `clan-core` (không viết lại phần dọn thành viên/chức) | tránh trùng việc |
| W3 | Trong `tocchien` và `lanhdia`: chặn `tradeReq/tradeAccept` khi `p.cw`, chặn thách đấu (bản đồ `instance`), `arenaJoin` từ chối khi `p.cw` (do `pvp-arena-bracket` thêm) | ma trận 0.3 |
| W4 | Tab Gia tộc của bảng xếp hạng thêm cột "Thắng chiến" (`cl.war.win`) | `soc-rank` |
| W5 | `CLAN.shop` chỉ được nối cuối (chỉ số mục là khóa lượt mua đã lưu); `npm run check` báo lỗi nếu số mục giảm | `content/40-items-shops.md` mục 9 |

**Tiêu chí chấp nhận**: theo `specs/clanwar.md` mục 7, cộng: (1) `warPhase` đúng với 6 mốc thời gian của thứ 3 và 1 mốc thứ 2 (không phải ngày chiến); (2) bot: `duelReq` trong `tocchien` bị từ chối; (3) bot: gia tộc cấp 1 `clanTerrOpen { tier: 4 }` nhận "Cần gia tộc cấp 10."; (4) ảnh 6 tab + `#hud-cw` desktop + điện thoại in `OK no console errors`; (5) `npm run test:ui` đạt (cửa sổ Gia tộc đổi); (6) `npm run test:perf` giữ khoảng 60 khung hình khi có 3 cờ trên màn hình.

### 2.7 `pvp-battlefield` — Chiến Trường Long Phượng (P3, P4, Should, GĐ 4, đặc sắc)

**Nguồn chi tiết**: `specs/battlefield.md` + phụ lục lô 4. Tóm theo khuôn:

| Mục | Nội dung |
|---|---|
| Mục đích | PvP tập thể hằng ngày cho mọi người từ cấp 30, không cần gia tộc, chia phe do máy chủ, thưởng danh vọng |
| Luồng | 19:50 thông báo, biểu ngữ `#hud-bf` có nút Đăng ký (hoặc phím H, NPC Chiến Tướng Hàn Phong ở Đấu Trường x 330) → 20:00 chia phòng theo khung cấp (≤ 40 người/phòng, ≥ 4 người mới mở), chia 2 phe Thanh Long Doanh / Xích Phượng Doanh cân tổng cấp → bản đồ `chientruong` (rộng 2000, doanh trại 2 đầu là vùng an toàn 200 px) → 15 giây chuẩn bị → đánh tới 20:30 hoặc phe đạt 500 điểm |
| Điểm | phe: hạ địch +3, chiếm cờ +10, giữ mỗi cờ +2 mỗi 10 giây; cá nhân: hạ +10, hỗ trợ +4, chiếm +15, phòng thủ +2; cùng cặp chỉ tính 3 lần/trận; chiếm cờ: `prog` ±10·min(3, chênh số người)/giây, kẹp ±100 |
| Chết | hồi sinh sau 5 giây ở doanh trại, khiên 3 giây, không mất EXP, không rơi đồ, không gói `dead` |
| Thưởng | 1 lần/ngày, cần điểm cá nhân ≥ 10 và còn ở chiến trường lúc kết thúc: danh vọng = 30/22/15 (thắng/hòa/thua) + min(50, ⌊điểm/10⌋) + 20 nếu MVP; xu = 250/180/120 × cấp; EXP = 8%/6%/5% EXP cần của cấp; MVP thêm 1 Rương Báu |
| Cửa hàng danh vọng | danh vọng chung với lôi đài (`c.arena.fame`), lượt theo tuần, đồ đổi là đồ khóa; 10 mục gốc + 11 mục Thượng Giới (`content/40-items-shops.md` mục 4.13) + Mảnh Mây (`content/60-mounts-pets.md` mục 13); Võ Sư Thiết Quyền cũng mở cửa hàng này |
| Lưu | `c.bf { got, wins, losses, draws, kills, deaths, caps, best, total, wk, buys }`; phòng chỉ trong RAM |
| Gói | `bfJoin`, `bfCancel`, `bfEnter`, `bfLeave`, `bfInfo`, `bfBoard`, `bfBuy { npc, id, n }` → `bf`, `bfRoster`, `bfBoard`, `bfKill`, `bfCap`, `bfDead`, `bfResult`, `bfShopResult`, `openUi { ui: 'battle' }` |
| Module/cửa sổ/DOM | `modules/battlefield` (`world.bf`), `BATTLE` trong `extras.js`, bản đồ `chientruong`, NPC `battle`; `windows/battle.js` (tab `data-bftab`), cửa sổ `bfres`, HUD `#hud-bf` sau `#hud-defense`, `#bf-feed`, `#bf-respawn` tạo động; `render/bfart.js`; phím H; sửa `core/combat.js` 3 chỗ (sau dòng của `clan-war`), `pk.revive`, `server/index.js` (`BF=0` tắt lịch) |
| Điện thoại | viên `#hud-bf` giữa D-pad và cụm kỹ năng (`left: 240px; right: 310px`), nút ≥ 44px, bảng điểm 1 cột 2 phe xếp chồng, chữ ≥ 15px |
| Chống gian lận | xem `specs/battlefield.md` mục 8 (thưởng 2 lần khóa theo ngày, `pairCap`, 2 nhân vật/IP, khiên, chặn hồi sinh bằng lượng, `bfBuy` tra `find`) |
| Kiểm thử | `tests/features/battlefield.js` (đơn vị + bot trên server riêng, `BF=0`), check-data khối `BATTLE` |

**Chỉnh so với đặc tả**:

| # | Chỉnh | Lý do |
|---|---|---|
| B1 | `brackets: [[30, 59], [60, 89], [90, 119], [120, 159], [160, 199]]`; check-data đòi khung cuối kết thúc ở `MAX_LEVEL` | `content/00-foundation.md` mục 7.3 |
| B2 | `pk/index.js`: `duelReq`, `duelAccept` từ chối khi `p.map.def.instance` ("Không thể thách đấu ở đây."); `trade`: từ chối khi `p.bf` | ma trận 0.3: nhánh thách đấu trong `damagePlayer` chạy trước nhánh chiến trường |
| B3 | Không bán/đổi danh vọng ra lượng; mọi dòng cửa hàng mới chỉ nối cuối | P5 |
| B4 | Lịch Sự Kiện (`evt-calendar`) đọc `BATTLE.hour/minute/regBefore/dur` từ `S.G.battle` | không chép giờ |

**Tiêu chí chấp nhận**: theo `specs/battlefield.md` mục 5 (9 ca đơn vị, 21 bước bot), cộng: (1) `splitRooms` với 85 người khung 160-199 cho 3 phòng; (2) bot: `duelReq` trong `chientruong` bị từ chối, `tradeReq` bị từ chối; (3) ảnh `#hud-bf` (đăng ký, trong trận), cửa sổ 3 tab, cửa sổ kết quả ở desktop và 3 cỡ điện thoại (667×375, 740×360, 844×390) in `OK no console errors`; (4) `npm run test:perf` giữ khoảng 60 khung hình trong phòng 40 người giả lập (đo bằng kịch bản perf có `BF`).

### 2.8 `pvp-arena-bracket` — Lôi đài theo khung cấp (P3, P5, Should, GĐ 4, id mới)

**Vì sao cần id mới**: `pvp-arena` đã xong và đạt kiểm thử; nhưng khi trần cấp lên 199 (`core-levelcap-199`), ghép cặp chỉ theo Elo làm lôi đài mất công bằng (nhân vật cấp 199 mới có 1.000 Elo gặp cấp 20 cùng 1.000 Elo). Tách thành id con (`parent: pvp-arena`) để không hạ trạng thái của hệ thống đang chạy tốt.

**Mục đích**: mỗi người chỉ gặp đối thủ cùng khung cấp; bảng xếp hạng và thưởng tuần theo khung; tổng lượng thưởng tuần tăng có kiểm soát.

**Luồng**: đăng ký như cũ → viên `#hud-arena` ghi "Hào Kiệt Đài · n người chờ" (n = người chờ cùng khung) → trận như cũ → tab Lôi đài của bảng xếp hạng có hàng chip khung `[data-arbr=0..4]`, mặc định khung của mình.

**Quy tắc** (thêm vào `ARENA` trong `src/shared/data/extras.js`, đúng checklist "Luật / thưởng lôi đài" của `CLAUDE.md`):

| Khung | Tên | Cấp |
|---|---|---|
| 0 | Tân Tú Đài | 20-59 |
| 1 | Hào Kiệt Đài | 60-99 |
| 2 | Anh Hùng Đài | 100-139 |
| 3 | Tông Sư Đài | 140-179 |
| 4 | Chí Tôn Đài | 180-199 |

| Luật | Giá trị |
|---|---|
| Ghép cặp | chỉ hai người cùng khung (khung tính lúc đăng ký, lưu ở mục hàng chờ); biên Elo giữ nguyên (100, +50/10 giây, tối đa 1.000) |
| Elo | một điểm Elo chung (`c.arena.elo`) đi theo người qua các khung |
| Thưởng tuần `ARENA.weekly` (mỗi khung) | hạng 1: 40 lượng, 80.000 xu, 2 Rương Báu; hạng 2-3: 25 lượng, 50.000 xu, 1 rương; hạng 4-10: 12 lượng, 25.000 xu; hạng 11-20: 4 lượng, 10.000 xu |
| Số hạng có thưởng | `min(20, max(1, ⌊số người đủ điều kiện của khung × payShare⌋))`, `payShare = 0,5` (khung ít người không trả hết 20 suất, chặn nuôi nhân vật phụ cho đủ người) |
| Điều kiện thưởng tuần | như cũ (≥ 3 trận, thắng ≥ 1, Elo ≥ 1.000); khung xét thưởng = `c.arena.wbr` = khung của trận tính điểm **cuối cùng** trong tuần |
| Tổng lượng tối đa/tuần | 5 khung × (40 + 2·25 + 7·12 + 10·4) = 1.070 lượng (hiện tại 830 cho 1 bảng); thực tế thấp hơn do `payShare` |
| Chặn | `arenaJoin` từ chối khi `p.bf`, `p.cw`, đang đăng ký chiến trường (`world.bf` có tên trong danh sách đăng ký), hoặc đang ở bản đồ `instance` khác lôi đài; khi ghép, bỏ qua người trong hàng chờ vừa có `p.bf`/`p.cw` |

**Dữ liệu**: `ARENA.brackets: [{ name, from, to }]`, `ARENA.payShare`, `ARENA.weekly` (giá trị mới theo bảng). **Lưu**: thêm `wbr` (0-4) vào `cleanArena`. **Gói**: `arena` thêm `br`; `arenaResult` thêm `br`; `rank` thêm `arenaBr: [top 30 mỗi khung]` (giữ `arena` = top 30 chung để tương thích), `arenaMe` thêm `br`, `brRank`.

**Module, cửa sổ**: `modules/arena` (`bracketOf(lv)` thuần, ghép, `computeRank`, `payWeek`), `windows/rank.js` (chip khung), `windows/arena.js` (tên khung trong viên HUD và cửa sổ kết quả), `tools/check-data.js` (khung liên tục từ `minLv` tới `MAX_LEVEL`, không chồng; `weekly[*].to` tăng dần, lượng không tăng khi hạng thấp hơn), `DESIGN_RULES.md` mục 9 hàng "Lôi đài xếp hạng".

**Điện thoại**: chip khung cuộn ngang, cao 44px; viên HUD ở màn ≤ 760px chỉ ghi tên khung + "n chờ".

**Chống gian lận**: khung tính từ cấp ở server; `payShare` và điều kiện tuần chặn nuôi khung vắng; một Elo chung không cho "làm lại điểm" bằng cách đổi khung.

**Tiêu chí chấp nhận**:
1. `tests/features/arena.js` thêm ≥ 10 `ok()`: `bracketOf(20) = 0`, `bracketOf(59) = 0`, `bracketOf(60) = 1`, `bracketOf(199) = 4`, `bracketOf(19) = -1`; đơn vị ghép: lv 25 và lv 150 cùng Elo chờ 10 phút giả lập không ghép, lv 150 và 160 ghép ngay; `payWeek` khung có 3 người đủ điều kiện chỉ trả hạng 1.
2. Bot: `lodai_c` (`/lv 150`) và `lodai_a` (cấp 20-59) đăng ký cùng lúc → sau 3 giây vẫn ở hàng chờ; `lodai_d` (`/lv 160`) đăng ký → `lodai_c` và `lodai_d` vào phòng đấu.
3. Toàn bộ 47 kiểm tra lôi đài cũ vẫn đạt; `npm run check` sạch.
4. Ảnh tab Lôi đài có chip khung ở desktop và điện thoại, in `OK no console errors`.

**Kiểm thử**: `tests/features/arena.js`, `tests/e2e/e2e.js` (đăng ký/hủy vẫn đạt).

### 2.9 `pvp-freezone` — Đấu Trường có luật (P3, P4, Could, GĐ 4)

**Mục đích**: bãi PK tự do (`arena`, "Đấu Trường", `pvp: true`) hiện chỉ có luật "không mất EXP"; tính năng này cho nó một giờ cao điểm có thưởng nhỏ, màu tên rõ ràng cho người hiếu chiến, và một bảng treo thưởng để người bị hạ có cách đáp trả trong luật chơi. Mức `C`: không tính năng nào phụ thuộc; gỡ bằng bỏ 1 dòng module.

**Luồng**:
1. 21:55 thông báo "Giờ Huyết Chiến sắp bắt đầu ở Đấu Trường"; 22:00-22:25 hạ người ở Đấu Trường được danh vọng; 22:25 thông báo 3 người hạ nhiều nhất.
2. Cửa sổ Bạn bè tab Kẻ thù: mỗi hàng có nút "Treo thưởng" (nếu người đó hạ mình trong 24 giờ) → nhập số xu → tin lên tab `[data-frtab=hb]` "Huyết Bảng" (toàn máy chủ).
3. Ai hạ được người bị treo thưởng (PK ngoài lôi đài, thách đấu, chiến trường, chiến gia tộc) thì nhận toàn bộ tiền treo, toàn máy chủ được thông báo.

**Quy tắc** (`PVPZONE` trong `src/shared/data/pvpzone.js` mới):

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `map` | `'arena'` | Đấu Trường |
| `hour` | 22:00-22:25 (phút trong ngày 1320-1345), báo trước 5 phút | Giờ Huyết Chiến |
| `shield` | 3000 ms | khiên khi vào Đấu Trường (không nhận sát thương, không đánh được người) |
| `kill.fame` | 2 | danh vọng mỗi lần hạ hợp lệ trong Giờ Huyết Chiến |
| `kill.dayCap` | 10 | số lần hạ có thưởng mỗi ngày |
| `kill.pairDay` | 2 | cùng một cặp tính tối đa 2 lần mỗi ngày |
| `kill.lvGap` | 15 | nạn nhân cấp ≥ cấp người hạ − 15 |
| `top`, `topMin` | 30 / 20 / 10 danh vọng, cần ≥ 3 lần hạ | thưởng 3 người hạ nhiều nhất cuối giờ |
| `name` | hiếu chiến 1-4 hoặc đang bật PK: `#ff5252` (như hiện tại); hiếu chiến ≥ 5: `#d50000` đậm | màu tên trên đầu (`game.js drawName`) |
| `bounty.min/max` | 10.000 / 2.000.000 xu thường | mức treo |
| `bounty.feePct` | 10 | phí treo (hút xu), trả ngay |
| `bounty.hours` | 72 | hết hạn: hoàn 90% vào `c.xu` (người treo online) hoặc qua thư |
| `bounty.perPoster` / `perTarget` | 1 / 5 | mỗi người treo 1 lệnh đang chạy; mỗi mục tiêu tối đa 5 lệnh |
| `bounty.enemyHours` | 24 | chỉ treo được người trong danh sách Kẻ thù đã hạ mình trong 24 giờ |
| `bounty.lvGap` | 20 | người lĩnh thưởng cấp ≥ cấp mục tiêu − 20 |
| `bounty.listMax` | 500 | tổng lệnh toàn máy chủ |
| `sysBounty` | `{ pk: 10, fame: 5, dayCap: 3 }` | hạ người có hiếu chiến ≥ 10 được thêm 5 danh vọng, tối đa 3 lần/ngày |

Điều kiện một lần hạ "hợp lệ" (dùng cho danh vọng và lĩnh thưởng): đi qua móc `playerKilled` (của `soc-titles`, nên lôi đài/thách đấu/chiến trường/chiến gia tộc tự loại); người hạ khác nạn nhân, khác tài khoản, khác IP (trừ địa chỉ nội bộ khi chạy thử); không cùng nhóm, không cùng gia tộc. Lĩnh thưởng: cộng tổng tiền các lệnh qua `gainXu`; phần vượt trần 2e9 gửi thư `world.mail.deliver`; xóa lệnh trước khi cộng (không lĩnh 2 lần).

**Dữ liệu và lưu**:

| Trường | Nội dung |
|---|---|
| `c.hc` | `{ day, n, sb }` số lần hạ có thưởng và số lần thưởng truy nã hệ thống trong ngày (dọn ở `sanitize`) |
| `c.pvpKills` | tổng lần hạ người hợp lệ (dùng cho bảng xếp hạng PK sau này) |
| `db.meta.hb` | `{ seq, list: [{ id, target, tk, poster, pk, pacc, xu, at, until }] }` (dọn ở `init`: bỏ lệnh hỏng/quá hạn quá 7 ngày) |
| RAM | đếm cặp trong ngày (`Map`), bảng hạ trong Giờ Huyết Chiến (khởi động lại máy chủ thì đếm lại từ 0, chấp nhận) |

**Gói**:

| Hướng | `t` | Trường | Kiểm tra server |
|---|---|---|---|
| c → s | `hbList` | | cách ≥ 1 giây |
| c → s | `hbPost` | `name, xu` | `clean(name, 16)`; có trong `c.enemies` với `at` ≤ 24 giờ; `int(xu)` trong khoảng; `c.xu ≥ xu` (không xu khóa); giới hạn số lệnh; trừ đủ `xu` (phí 10% giữ lại, 90% vào lệnh) |
| c → s | `hbCancel` | `id` | `int`; lệnh của mình; hoàn 90% số tiền trong lệnh |
| s → c | `hb` | `list: [{ id, target, lv, cls, online, xu, n, until, mine }], max` | |
| s → c | `hz` | `{ on, left, n, top: [{ name, n }] }` | gửi cho người ở Đấu Trường mỗi 5 giây khi Giờ Huyết Chiến đang chạy (hiện ở `#map-info`) |

**Module, cửa sổ**: `modules/freezone` (mới; móc `second` cho lịch, `playerKilled`, `enterMap` cho khiên, `sanitize`, `selfData`, `clientData`); `windows/friends.js` tab `[data-frtab=hb]` và nút "Treo thưởng" ở tab Kẻ thù; `game.js` 1 dòng màu tên; `evt-calendar` đọc `S.G.pvpzone.hour`. Không id DOM mới.

**Điện thoại**: tab Huyết Bảng 1 cột, nút ≥ 44px; nhập xu bằng `ask()` có ô số.

**Chống gian lận**: danh vọng có trần ngày, trần cặp, khoảng cấp, khác tài khoản/IP; treo thưởng chỉ với kẻ đã hạ mình (không dựng lệnh tùy ý để chuyển xu), phí 10% làm chuyển xu qua treo thưởng đắt hơn giao dịch; không xu khóa; lệnh xóa trước khi trả.

**Tiêu chí chấp nhận**:
1. `tests/features/freezone.js` có ≥ 20 `ok()`: ép giờ (`/hz on`) → hạ hợp lệ +2 danh vọng; lần thứ 3 cùng cặp không cộng; cùng tài khoản không cộng; nạn nhân thấp hơn 16 cấp không cộng; hết giờ top 3 nhận thưởng khi ≥ 3 lần hạ.
2. Treo thưởng: B hạ A → A treo 100.000 xu lên B (A mất 100.000, lệnh 90.000); C hạ B → C nhận 90.000, lệnh biến mất, thông báo toàn máy chủ; A treo người chưa hạ mình bị từ chối; `hbPost { xu: -5 }`, `{ name: '__proto__' }` không đổi gì; hết hạn giả lập → A nhận 81.000 (90%) qua thư khi offline.
3. Khiên 3 giây khi vào Đấu Trường: đòn trong 3 giây không trừ máu.
4. Ảnh tab Huyết Bảng và màu tên (hiếu chiến 3 và 6) ở desktop và điện thoại, in `OK no console errors`.

**Kiểm thử**: `tests/features/freezone.js` (mới, tài khoản `pk_a, pk_b, pk_c`, lệnh admin `/hz on|off`).

---

## 3. Tổng hợp giao thức và dữ liệu lưu mới của mục này

### 3.1 Tên hành động mới (client → server)

Router dừng khởi động khi trùng tên; bảng dưới đã đối chiếu với 68 hành động hiện có và các đặc tả đợt 3, không trùng.

| Module | Hành động |
|---|---|
| `safety` | `blockAdd`, `blockDel`, `blockList`, `report`, `socialSet` |
| `party` | `lfgList`, `lfgPost`, `lfgDel`, `lfgApply`, `applyAccept`, `partyLoot` |
| `titles` | `achClaim`, `titleSet`, `enemyList`, `enemyDel` |
| `market` | `mkSearch`, `mkMine`, `mkLog`, `mkSell`, `mkBuy`, `mkCancel` |
| `clanwar` | `clanX`, `clanTaskClaim`, `clanShopBuy`, `clanSkillUp`, `clanTerrOpen`, `clanTerrEnter`, `clanWarSignup`, `clanWarEnter` |
| `battlefield` | `bfJoin`, `bfCancel`, `bfEnter`, `bfLeave`, `bfInfo`, `bfBoard`, `bfBuy` |
| `freezone` | `hbList`, `hbPost`, `hbCancel` |

### 3.2 Gói mới (server → client)

`blocks`, `reportResult`, `lfg`, `ach`, `enemies`, `mkOpen`, `mkList`, `mkMine`, `mkLog`, `clanx`, `clanTerr`, `cw`, `cwResult`, `bf`, `bfRoster`, `bfBoard`, `bfKill`, `bfCap`, `bfDead`, `bfResult`, `bfShopResult`, `hb`, `hz`; lời mời kiểu mới `invite { kind: 'apply' }`. Trường thêm vào gói có sẵn: `me.social`, `me.mute`, `me.title`, `me.bf`, `party.loot`, `inspect.{fashion, pet, title, online, last, hidden}`, `arena.br`, `arenaResult.br`, `rank.arenaBr`, `arenaMe.{br, brRank}`, `info().title`.

### 3.3 Trường lưu mới

| Nơi | Trường | Tính năng |
|---|---|---|
| nhân vật `c` | `blocks`, `social`, `mute` | `soc-chat-safety` |
| nhân vật `c` | `snap` | `soc-inspect` |
| nhân vật `c` | `ach`, `enemies` | `soc-titles` |
| nhân vật `c` | `mkLog` | `eco-market` |
| nhân vật `c` | `ctask`, `cshop` | `clan-war` |
| nhân vật `c` | `bf` | `pvp-battlefield` |
| nhân vật `c` | `arena.wbr` | `pvp-arena-bracket` |
| nhân vật `c` | `hc`, `pvpKills` | `pvp-freezone` |
| gia tộc `db.clans[id]` | `members[k].cp/cpt`, `skills`, `terr`, `war` | `clan-war` |
| `db.meta` | `reports` | `soc-chat-safety` |
| `db.meta` | `market` | `eco-market` |
| `db.meta` | `clanwar` | `clan-war` |
| `db.meta` | `hb` | `pvp-freezone` |

Mọi trường mới có hàm dọn ở `sanitize` (nhân vật) hoặc `init` (toàn cục), có kiểm thử đơn vị với dữ liệu hỏng (số âm, kiểu lạ, khóa `__proto__`). Khi `ops-persist-shard` (lưu theo nhân vật) vào, các module sửa nhân vật offline (`market` cộng tiền người bán, `freezone` hoàn tiền, `clanwar` thưởng) phải gọi `db.touch` thay `db.dirty = true` như `audit-risk` ADR-R-1 ghi.

### 3.4 Thứ tự làm đề xuất trong mục này

| Bước | Việc | Giai đoạn | Giao opencode |
|---|---|---|---|
| 1 | `clan-core` (C1-C5), `soc-trade` (T1, T2) | 0 | có (lỗi đã chẩn đoán, có lệnh kiểm) |
| 2 | `eco-market` (sau `eco-bound`) | 3 | không (kinh tế, chống nhân bản) |
| 3 | `soc-chat-safety` | 4 | không cho phần server (bảo mật); có cho tab Chặn và mục Riêng tư ở client sau khi server xong |
| 4 | `soc-titles` | 4 | có (đặc tả chi tiết tới mức mã), Claude rà soát |
| 5 | `clan-war` | 4 | không (lõi combat, kinh tế) |
| 6 | `pvp-battlefield`, `pvp-arena-bracket` | 4 | battlefield không; arena-bracket có |
| 7 | `soc-party-plus`, `soc-inspect`, `pvp-freezone` | 4 (đẩy sang 1.1 nếu vượt ngân sách) | party-plus và inspect có; freezone không |

---

## 4. Quyết định kiến trúc (ADR)

### ADR-05c-1 — Lượng là tiền tệ trên Chợ Ký Gửi

- **Bối cảnh**: `specs/market.md` (đã duyệt) cho phép đăng bán bằng lượng. Lượng hiện chỉ kiếm trong game (≈ 25/ngày); `01-tam-nhin` Q1 để ngỏ nạp tiền thật (`mon-topup`, mức C, cần ADR riêng). Khi có nạp tiền, chợ bằng lượng trở thành cổng đổi tiền thật ↔ đồ trong game.
- **Quyết định**: giữ lượng trên chợ ở 1.0 với: giá 1-100.000 lượng mỗi lô, thuế 5% (hút lượng), cấm mua của mình/cùng tài khoản, nhật ký 500 giao dịch + nhật ký kiểm toán, đồ khóa và đồ có hạn không lên chợ; giao dịch 1-1 vẫn **không** chuyển lượng.
- **Phương án khác**: (a) chợ chỉ bằng xu: an toàn hơn nhưng người chơi bận không mua được đồ hiếm bằng lượng kiếm được, lượng ít chỗ tiêu; (b) cho giao dịch 1-1 chuyển lượng: không có thuế, khó kiểm soát.
- **Chi phí**: thêm 1 nhánh tiền tệ trong `market` (đã có trong đặc tả), thêm dòng kiểm toán.
- **Hệ quả**: ADR của `mon-topup` phải xét lại chợ bằng lượng (đề xuất mặc định khi đó: lượng nạp là "lượng khóa" không lên chợ). Theo dõi chỉ số: tổng lượng qua chợ/tuần so với lượng phát ra/tuần; vượt 30% thì tăng thuế lượng lên 8%.

### ADR-05c-2 — Lưu ngữ cảnh chat kèm báo cáo vi phạm

- **Bối cảnh**: hiện máy chủ không lưu chat; xử lý báo cáo cần bằng chứng. Lưu toàn bộ chat tốn đĩa và đụng quyền riêng tư.
- **Quyết định**: chỉ giữ 20 dòng gần nhất mỗi người trong RAM; khi có báo cáo thì chép 10 dòng của người bị báo cáo vào `db.meta.reports` (≤ 2.000 báo cáo, xóa sau 30 ngày). Tin mật chỉ được chép khi người báo cáo là người nhận tin mật đó.
- **Phương án khác**: (a) ghi toàn bộ chat ra file ngày: đủ bằng chứng nhưng lớn và nhạy cảm; (b) không lưu: không xử lý được.
- **Chi phí**: ≈ 20 × 160 byte × 300 người = 1 MB RAM; `meta.json` tăng tối đa ≈ 2.000 × 2 KB = 4 MB (cần tính vào đo tải ở `audit-risk` mục 3).
- **Hệ quả**: trang quản trị (`ADR-R-5`) đọc từ `db.meta.reports`; chính sách riêng tư khi mở máy chủ chính thức phải ghi việc lưu này.

### ADR-05c-3 — EXP nhóm chỉ chia trong tầm 900 px

- **Bối cảnh**: `shareExp` chia cho mọi thành viên cùng bản đồ, không xét khoảng cách; `DESIGN_RULES.md` chưa có hàng "Nhóm". Với bản đồ rộng và tự đánh, thành viên đứng góc bản đồ vẫn nhận EXP.
- **Quyết định**: thành viên chỉ nhận và chỉ được tính vào số người khi cách quái ≤ 900 px theo chiều ngang (khoảng 1,5 màn hình máy tính); thêm hàng "Nhóm" vào `DESIGN_RULES.md` mục 9 (hệ số `1 + 0,12·(n − 1)`, người hạ ×1,1, hệ số chênh cấp hiện có, tầm 900 px, luật chia đồ).
- **Phương án khác**: giữ cả bản đồ (khuyến khích treo máy nuôi cấp); tầm 600 px (quá chặt khi đánh boss to).
- **Chi phí**: 1 phép so sánh mỗi thành viên mỗi lần hạ quái; sửa `core/combat.js` (vùng Lõi).
- **Hệ quả**: đổi hành vi đã có nên kiểm thử `daily.js`/`social.js` liên quan nhóm phải chạy lại; ghi rõ trong ghi chú cập nhật cho người chơi.

---

## 5. Câu hỏi mở

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Ngân sách GĐ 4 có đủ cho cả 8 việc mới của mục này cùng các mục khác (`cmb-power-score`, `gear-fame`, `pve-clanboss`, `ops-anticheat`)? Riêng mục này M+S chiếm ≈ 82% công sức GĐ 4 | Giữ `soc-chat-safety`, `soc-titles`, `clan-war`, `pvp-battlefield`, `pvp-arena-bracket` trong GĐ 4; nếu toàn GĐ vượt M+S ≤ 80% thì `soc-party-plus` lùi sang GĐ 5 và `soc-inspect`, `pvp-freezone` (mức C) sang bản 1.1 |
| Q2 | Tên gia tộc có cho dùng chữ tiếng Việt có dấu và khoảng trắng không (hiện chỉ `[A-Za-z0-9]` 3-12)? | Có, ở `clan-core` sau khi có `nameOk`: cho chữ cái tiếng Việt, số, 1 khoảng trắng giữa từ, 3-14 ký tự; kiểm trùng theo dạng đã bỏ dấu (`fold`) để "Long Hổ" và "Long Ho" không cùng tồn tại; tên cũ giữ nguyên |
| Q3 | Elo lôi đài có tách theo khung cấp không? | Không: một Elo chung đi theo người (`pvp-arena-bracket`); xét lại sau 4 tuần nếu người vừa lên khung thua > 70% trận đầu |
| Q4 | Lôi đài có mùa giải (đặt lại Elo định kỳ)? | Không ở 1.0; thưởng tuần đã tạo nhịp; mùa giải 8 tuần (Elo về `1000 + (Elo − 1000)/2`) là việc của 1.1 |
| Q5 | Danh sách từ cấm ai duyệt và có cho người chơi tự tắt lọc không? | Chủ dự án duyệt `BAD_WORDS` (≥ 80 mục) trước GĐ 4; không cho tắt lọc ở kênh công khai; tin mật vẫn lọc |
| Q6 | Tự cấm chat theo báo cáo có quá dễ bị nhóm lạm dụng? | Giữ ngưỡng 3 tài khoản + 3 IP khác nhau, cấp ≥ 20, chỉ kênh công khai, 30 phút; admin xem `/baocao` hằng ngày trong tuần đầu để chỉnh |
| Q7 | Luật Luân phiên có áp cho rương thưởng boss (2 Rương Báu cho người gây nhiều sát thương nhất) không? | Không: thưởng theo sát thương giữ nguyên; Luân phiên chỉ áp đồ rơi ra đất |
| Q8 | Có giới hạn chênh cấp để chặn "kéo cấp" trong nhóm (người cấp 199 hạ quái cấp 150 cho bạn cấp 60)? | Có ở `soc-party-plus`: thành viên thấp hơn quái > 20 cấp chỉ nhận hệ số ×0,5 thay ×1,3; con số cuối cùng do công cụ cân bằng (`dev-balance-tool`, mục 06) chốt |
| Q9 | Người chơi có thấy ai đã chặn mình? | Không: tin mật/lời mời trả cùng câu với người offline/không nhận |
| Q10 | Đấu Trường có cần thêm luật rơi đồ cho người tên đỏ? | Không ở 1.0 (P5: không mất đồ vì người khác); tên đỏ chịu mất 5% EXP khi chết (đã có) và bị treo Huyết Bảng hệ thống |
| Q11 | Giờ Huyết Chiến cho cả cuối tuần lẫn ngày thường? | Hằng ngày 22:00-22:25; nếu Lịch Sự Kiện cuối tuần thêm hoạt động đêm thì dời sang 22:05 để không chồng thông báo |
| Q12 | Chợ Ký Gửi có trạm ở Thượng Giới? | Không (chỉnh M2); xét lại nếu số đo cho thấy > 50% người cấp 120+ không ghé làng trong một ngày |
| Q13 | Thư người chơi gửi nhau (kể cả chỉ chữ) có làm ở 1.0? | Không: chat mật + hộp thư hệ thống đủ; thư kèm đồ là `Won't` cho 1.0 (đường rửa xu khóa) |
| Q14 | Cược xu trong thách đấu? | Không (`Won't` 1.0): chuyển xu không phí, dễ dàn xếp |
