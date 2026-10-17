# Quy tắc làm việc cho agent - Ninja School

Đọc file này trước khi sửa bất cứ thứ gì. Mọi thay đổi về đồ họa, giao diện, hiệu ứng hay nội dung phải tuân theo **`DESIGN_RULES.md`**.

## Dự án

Game nhập vai ninja pixel 2D online nhiều người chơi.
- **Server**: Node.js (CommonJS) + `ws`, quyết định mọi logic, lưu dữ liệu bằng JSON.
- **Client**: HTML5 canvas, ES modules thuần, **không có bước build**, không framework.

```bash
npm install
npm start                      # http://localhost:3000
npm test                       # khởi động server tạm + bot WebSocket chơi thử, phải đạt hết
npm run check                  # kiểm tra chéo dữ liệu game (item, quái, bản đồ, nhiệm vụ)
PORT=3000 DATA_DIR=/tmp/ns ADMINS=tentk1,tentk2 node server/index.js   # admin dùng được lệnh /lv /item /plus /tp /xu /boss
```

## Kiến trúc và bất biến

- **Server có thẩm quyền**: client chỉ gửi ý định (`move`, `skill`, `useItem`, ...). Server kiểm tra tầm đánh, hồi chiêu, chakra, tốc độ, khoảng cách NPC, số dư tiền. **Không bao giờ** tin dữ liệu số do client gửi.
- **Giao thức**: JSON `{ t: 'loai', ...du_lieu }`. Lúc kết nối, server gửi gói `data` (toàn bộ dữ liệu tĩnh). Client đọc dữ liệu tĩnh qua `S.G` (`public/js/store.js`), **không** chép dữ liệu game vào client.
- **Dữ liệu game** nằm trong `server/data/`: `classes, skills, items, monsters, maps, quests, extras`. Thêm nội dung thì sửa ở đây; client tự nhận qua `S.G`.
- **Logic server** nằm trong `server/game/`:
  - `world`: vòng lặp, vào/ra bản đồ.
  - `map`, `monster`: AI quái.
  - `combat`: kỹ năng, sát thương, rơi đồ.
  - `player`: chỉ số, túi đồ, EXP, nhiệm vụ.
  - `actions`: NPC, cửa hàng, cường hóa, thủ kho, điểm danh, vòng quay.
  - `social`: chat, nhóm, bạn bè, giao dịch, gia tộc, lệnh admin.
  - `dungeon`: phó bản.
- Dữ liệu người chơi nằm ở `DATA_DIR` (mặc định `./data`, đã nằm trong `.gitignore`). **Không** commit thư mục này. Lưu ý: `.gitignore` chỉ bỏ qua `/data/` ở gốc; `server/data/` **phải** được commit.

## API công khai giữa các module client (không được đổi chữ ký)

| Module | Export |
|---|---|
| `sprites.js` | `drawNinja(ctx, x, y, o)`, `drawPortrait(ctx, o)`, `NINJA_H`, `ELEMENT_COLORS`, `shade` |
| `monsterart.js` | `drawMonster(ctx, x, y, def, o)`, `monsterHeight(def)` |
| `maprender.js` | `class MapRenderer(map)` có `drawBackground`, `drawTerrain`, `drawPortals`, `drawParticles`, `drawForeground`; `THEMES` |
| `fx.js` | `class FX` có `sparks, text, slash, proj, burst, wave, rain, meteor, whirl, aura, heal, dash, levelUp, update, draw, drawTexts` |
| `icons.js` | `iconCanvas`, `iconURL(icon, rarity)`, `skillIconURL(sk, sid, elColor)`, `uiIconURL(name)` |
| `ui.js` | `class UI`, `h(tag, attrs, ...kids)` |
| `titleart.js` | logo, nền màn hình mở đầu, `CLASS_STATS` |

Được phép **thêm** tham số tùy chọn hoặc export mới. Không được đổi tên hay bỏ tham số cũ.

**Các id DOM dùng chéo giữa module, không được đổi:**
`#game, #hud, #hud-skills, #hud-dpad, #hud-status, #avatar, #st-*, #bar-hp, #bar-mp, #bar-exp, #hud-target, #tg-*, #hud-map, #map-name, #map-info, #map-ping, #minimap, #hud-quest, #hud-menu, #hud-buffs, #hud-party, #hud-chat, #chat-*, #windows, #dialogs, #invites, #toasts, #overlay-conn, #rotate-hint, #screen-login, #screen-chars, #in-user, #in-pass, #in-pass2, #btn-login, #login-err, #char-create, #in-cname, #in-gender, #btn-create, #chars-err, #server-status`. Thêm vào đó các selector mà `test/` và `tools/shot.js` dùng: `.class-card`, `.char-card .btn.primary`, `[data-tab]`, `[data-act]`.

## Làm việc song song nhiều agent

1. **Mỗi file chỉ một agent sửa** trong cùng một đợt. Người điều phối giao rõ file cho từng agent. Phân vùng chuẩn:

| Vùng | File |
|---|---|
| Nhân vật & NPC | `sprites.js` |
| Quái | `monsterart.js` |
| Bản đồ | `maprender.js` |
| Hiệu ứng & icon | `fx.js`, `icons.js` |
| HUD & cửa sổ | `style.css`, `ui.js`, phần `#hud` trong `index.html` |
| Màn hình mở đầu | `screens.css`, `main.js`, `titleart.js`, phần `#screen-*` trong `index.html` |
| Vòng lặp game | `game.js`, `input.js` |
| Server | `server/**` |
| Kiểm thử | `test/**`, `tools/**` |

2. Nếu buộc phải sửa 1-2 dòng ở file của agent khác (ví dụ một độ lệch vị trí trong `game.js`), hãy **Read lại ngay trước khi Edit**, sửa tối thiểu, rồi ghi rõ trong báo cáo cuối.
3. Cần chức năng từ vùng của agent khác thì **gọi qua API công khai** ở bảng trên. Nếu chưa có, tạo hàm tạm (stub) có cùng chữ ký và ghi chú lại để agent kia làm tiếp.
4. **Không** khởi động lại hay tắt server dùng chung khi agent khác đang chụp ảnh. Cần server riêng thì chạy ở cổng khác (ví dụ 3600) với `DATA_DIR` riêng.
5. Mỗi agent dùng **tài khoản test riêng** (tên 4-16 ký tự, ví dụ `art1`, `qatest2`). Đăng nhập trùng tài khoản sẽ đá phiên của agent khác ra.
6. **Báo cáo cuối** gồm: việc đã làm, file đã sửa, đường dẫn ảnh chụp kiểm tra, những điều agent khác cần biết (API mới, hành vi đổi, việc còn dang dở).

## Quy trình kiểm tra trước khi xong việc

1. **Đổi server** (`server/**`): chạy `npm test`, phải in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`. Có tính năng mới thì **thêm kiểm thử** vào `test/smoke.js`.
2. **Đổi dữ liệu game**: chạy `npm run check`, không được có dòng lỗi.
3. **Đổi client**: chụp ảnh bằng `tools/shot.js` (xem đầu file để biết tham số) ở desktop 1280×720 **và** điện thoại `mobile: true`. Xem ảnh, đảm bảo đẹp và đúng `DESIGN_RULES.md`. Script phải in `OK no console errors`.
   Đổi giao diện xã hội (menu người chơi, lời mời, giao dịch, nhóm, thách đấu): chạy `npm run test:ui` (2 trình duyệt thật, cần Playwright và server có `ADMINS=duoalpha,duobravo`).
   Trong trình duyệt, `window.ninja = { game, ui, net, S }` để công cụ kiểm thử đọc trạng thái game.
4. Kiểm tra hiệu năng khi thêm vẽ mới: bản đồ đông quái, bật tự động đánh, phải giữ khoảng 60fps.

## Quy ước code

- Giống code xung quanh: 2 dấu cách thụt lề, nháy đơn, có chấm phẩy, `const`/`let`, không dùng `var`.
- Server dùng CommonJS (`require`) và `'use strict'`. Client dùng ES modules (`import`).
- Comment ngắn, **bằng tiếng Việt**, chỉ viết khi giải thích *tại sao*. Không comment kể lại thay đổi.
- Chữ hiển thị cho người chơi là tiếng Việt có dấu. Tên định danh trong code bằng tiếng Anh hoặc không dấu.
- Không thêm thư viện npm mới trừ khi thật cần thiết (hiện chỉ có `ws`). Client không thêm thư viện hay CDN nào ngoài font VT323.
- Bảo mật: mọi chuỗi từ người chơi đưa vào DOM qua text node (hàm `h()`), **không** dùng `innerHTML` với dữ liệu người chơi. Server kiểm tra kiểu và giới hạn mọi trường nhận được (xem `int()`, `clean()`).

## Thêm nội dung (checklist)

- **Vật phẩm**: `server/data/items.js` → `icon.k` phải có hình trong `icons.js` → nếu bán thì thêm vào `SHOPS` → `npm run check`.
- **Quái**: thêm vào `LIST` trong `server/data/monsters.js` (dùng kiểu sprite có sẵn, bảng màu riêng) → đặt vào bản đồ (`field(...)` trong `maps.js`) → vật phẩm rơi phải tồn tại.
- **Boss**: thêm vào `BOSSES` → thêm `boss: [{ m, x }]` cho bản đồ → có thể thêm `BOSS_DROPS`.
- **Bản đồ**: thêm bằng `field()` hoặc `reg()` trong `maps.js`. Cổng phải **hai chiều**: bản đồ đích cần có cổng quay lại. Dùng lại `theme` có sẵn. Thêm id bản đồ vào `order` trong `renderWorldMap()` ở `ui.js`.
- **Nhiệm vụ chính**: thêm `q(...)` vào `server/data/quests.js` **đúng thứ tự `req`**; mục tiêu, vật phẩm thưởng và bản đồ phải tồn tại.
- **Kỹ năng**: `server/data/skills.js`, dùng `fx.k` có sẵn trong `fx.js`, kiểm tra `skillIconURL` vẽ được.
- **Bậc trang bị mới**: thêm vào `TIER_NAMES/TIER_LV/TIER_COLORS` (`items.js`) **và** `TIER_OUTFIT/TIER_METAL/TIER_TRIM` (`sprites.js`).

## Git

- Commit message **tiếng Việt**: dòng đầu tóm tắt, thân giải thích nếu cần.
- Chỉ commit khi `npm test` đạt và client không có lỗi console. Không commit file đang làm dở của agent khác.
- Đẩy lên nhánh `main` của `danhtrongit/Ninja-School` (`git push -u origin main`).
- **Không** commit thư mục `data/`, `node_modules/`, ảnh chụp kiểm tra hay file tạm.
