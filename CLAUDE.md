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
PORT=3000 DATA_DIR=/tmp/ns ADMINS=tentk1,tentk2 node server/index.js   # admin dùng được lệnh /lv /item /plus /tp /xu /boss /bosshp /event /mail /code /sukien /arena
```

## Kiến trúc và bất biến

- **Server có thẩm quyền**: client chỉ gửi ý định (`move`, `skill`, `useItem`, ...). Server kiểm tra tầm đánh, hồi chiêu, chakra, tốc độ, độ cao nhảy, khoảng cách NPC, số dư tiền. **Không bao giờ** tin dữ liệu số do client gửi.
- **Giao thức**: JSON `{ t: 'loai', ...du_lieu }`. Lúc kết nối, server gửi gói `data` (toàn bộ dữ liệu tĩnh). Client đọc dữ liệu tĩnh qua `S.G` (`public/js/store.js`), **không** chép dữ liệu game vào client.
- **Độ cao (y)**: `actions.move()` kiểm y theo vật lý nhảy (`JUMP/JUMP2/GRAV`, bục của bản đồ), quá giới hạn thì gửi `pos` kéo xuống. Đổi vật lý nhảy ở `game.js` thì **phải** sửa hằng số tương ứng trong `actions.js`. Client gửi `move` ngay ở khung chạm đất.
- **Dữ liệu game** nằm trong `server/data/`: `classes, skills, items, monsters, maps, quests, extras, pets`. Thêm nội dung thì sửa ở đây; client tự nhận qua `S.G`.
- **Logic server** nằm trong `server/game/`:
  - `world`: vòng lặp, vào/ra bản đồ.
  - `map`, `monster`: AI quái.
  - `combat`: kỹ năng, sát thương, rơi đồ.
  - `player`: chỉ số, túi đồ, EXP, nhiệm vụ.
  - `actions`: NPC, cửa hàng, cường hóa, thủ kho, điểm danh, vòng quay.
  - `social`: chat, nhóm, bạn bè, giao dịch, gia tộc, lệnh admin.
  - `dungeon`: phó bản.
  - `event`: sự kiện Tà Thú. `mail`: hộp thư hệ thống + giftcode (`world.mail`). `season`: sự kiện theo mùa, rơi vật phẩm sự kiện, đổi quà (`world.season`). `arena`: lôi đài xếp hạng 1 đấu 1 (`world.arena`).
- **Lôi đài**: cấu hình `ARENA` (`extras.js`), phòng đấu là phó bản `loidai` (`maps.js`, cờ `arena: true`), mỗi trận một `GameMap` riêng (id `loidai#n`). Người chơi trong trận có `p.match` (`{ id, map, a, b, state: 'prep'|'fight'|'end', rated, hit, maxHp }`: `hit` = đã có đòn trúng, `maxHp` = sinh lực tối đa từng bên lúc vào đấu, hết giờ chia % theo mức này) và `p.arenaBack` (bản đồ, vị trí, sinh lực/chakra trước trận để trả lại). Điểm lưu ở `c.arena` (`cleanArena` chuẩn hóa: `elo, win, lose, draw, fame, streak, best, day, dn, wk, wn, ww, paid`), `selfData()` gửi `me.arena`. Giao thức: `arenaJoin`, `arenaCancel`, `arenaLeave` → `arena { st: 'idle'|'queue'|'prep'|'fight'|'end', wait, n, left, opp { id, name, cls, lv, elo }, rated }`, `arenaResult { res, reason, rated, nc, opp, elo, before, d, xu, fame, hp, ohp, streak, quit, lock }` (`nc`: bỏ trận/hòa khi chưa ai ra đòn → trận không tính; `lock`: ms người bỏ bị cấm đăng ký). Vào game server luôn gửi trạng thái `arena` hiện tại (`arena.onJoin` → `sendState`) và kết quả trận bị xử thua lúc mất kết nối; `arenaCancel`/`arenaLeave` không khớp trạng thái server cũng được gửi lại trạng thái thật. Số trận tính điểm mỗi cặp trong ngày lưu ở `db.meta.arenaPairs`; gói `rank` có thêm `arena` (top 30) và `arenaMe`; mở tab qua `openUi { ui: 'rank', tab: 'arena' }`. Mọi chỗ đánh người (`canPvp`, `damagePlayer` trong `combat.js`) phải kiểm `p.match` trước luật khu an toàn/thách đấu; đòn chí mạng trong trận gọi `world.arena.ko(p)` (không chết thật, không rơi đồ); chiêu nhiều đòn kiểm lại `canPvp` trước mỗi đòn nên trận xong là dừng. Mọi nguồn hồi máu mới (thú cưng, buff theo thời gian...) phải bỏ qua bản đồ `arena`. Giao dịch/thách đấu phải kiểm `p.match` cả lúc gửi lẫn lúc nhận lời mời. Đổi bản đồ (`enterMap`) và thoát game (`leave`) đã báo `world.arena` để xử thua.
- **Hộp thư**: gửi thư bằng `world.mail.deliver(c, { from, title, body, xu, luong, items })` hoặc `sendItems(c, base, items)` (tự tách thư khi > 6 món), `c` là dữ liệu nhân vật (`world.mail.charOf(tên)` lấy cả người offline). Trả về `false` khi hộp đầy thư còn quà: người gọi phải tự xử lý (vd `stashItem`), không được làm mất quà. Thư nằm ở `c.mail`, `selfData()` gửi `me.mail = { n: chưa đọc, g: còn quà }`. Giao thức: `mailList, mailRead{id}, mailClaim{id}, mailClaimAll, mailDel{id}, mailDelRead` → `mail { list, max, keep }`; `giftcode{code}` → `codeResult { ok, msg, mail?, wait? }`. Mã đã dùng lưu theo **tài khoản** (`accounts.json` → `acc.codes`, kèm `c.codes` cũ); IP người chơi (`conn.ip`) chỉ lấy từ `X-Forwarded-For` (phần tử cuối) khi đứng sau proxy tin cậy (`TRUST_PROXY`), không bao giờ lấy phần tử đầu.
- **Sự kiện theo mùa**: server báo mùa đang chạy bằng gói `season { id|null }` (lúc vào game và khi đổi mùa), máy khách tra `S.G.seasons` bằng `activeSeason()` (`store.js`). Đổi quà `seasonEx { npc, id, n }` → `seasonResult { ok, msg, season }`; mở cửa sổ qua `openUi { ui: 'event', npc }`. Số lần đổi trong mùa lưu ở `c.season = { id, ex }`.
- Dữ liệu người chơi nằm ở `DATA_DIR` (mặc định `./data`, đã nằm trong `.gitignore`). **Không** commit thư mục này. Lưu ý: `.gitignore` chỉ bỏ qua `/data/` ở gốc; `server/data/` **phải** được commit.

## API công khai giữa các module client (không được đổi chữ ký)

| Module | Export |
|---|---|
| `sprites.js` | `drawNinja(ctx, x, y, o)`, `drawPortrait(ctx, o)`, `NINJA_H`, `ELEMENT_COLORS`, `shade`, `mountOffset(look)`, `ninjaHeight(look)` |
| `monsterart.js` | `drawMonster(ctx, x, y, def, o)`, `monsterHeight(def)`, `prewarmMonsters(defs)` (dựng sẵn khung khi vào bản đồ) |
| `maprender.js` | `class MapRenderer(map)` có `drawBackground`, `drawTerrain`, `drawPortals`, `drawNight(ctx, camX, camY, W, H, hour, px, py)`, `drawParticles`, `drawForeground`, `drawLighting(ctx, camX, camY, W, H, hour, px, py)`; `THEMES`; ngày/đêm: `vnHour(now)`, `dayPhase(h)`, `setLighting(k)`, `getLighting()` |
| `fx.js` | `class FX` có `sparks, text, slash, proj, burst, wave, rain, meteor, whirl, aura, heal, dash, levelUp, update, draw, drawTexts`; `drawGround(ctx, camX, camY)`; boss/tính năng: `telegraph, bossSkill, enhance, mountDust, gemSocket, costumeSparkle`; rung: `addShake(v), shakeAt(x, y, v), shakeXY()`, thuộc tính `shakeScale` (0 = tắt) |
| `pathfind.js` | `findRoute, routeMaps, nearestMap, mapsWithMob, mobsDropping, mapsWithDrop, mapsWithNpc, questDest, dailyDest` (lộ trình giữa bản đồ); `buildNav, surfaceAt, surfaceBelow, navPlan` (nhảy bục trong bản đồ) |
| `worldmap.js` | `WORLD_LAYOUT` (tọa độ từng bản đồ trên tranh), `buildWorldMap({ cur, questMaps, partyMaps, onGo })` |
| `petart.js` | `drawPet(ctx, x, y, kind, o)` (`o`: `t, dir, moving, lv, scale, happy, noShadow, still`), `PET_ART`, `PET_KINDS`, `petFlies(kind)`, `petHeight(kind)`, `petPixels(kind)` (khung đứng cho icon) |
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
| Hiệu ứng & icon | `fx.js`, `icons.js`, `petart.js` |
| HUD & cửa sổ | `style.css`, `worldmap.css`, `ui.js`, `worldmap.js`, phần `#hud` trong `index.html` |
| Màn hình mở đầu | `screens.css`, `main.js`, `titleart.js`, phần `#screen-*` trong `index.html` |
| Vòng lặp game | `game.js`, `input.js`, `pathfind.js` |
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
   Ép giờ cho lớp ngày/đêm: `ninja.game.forceHour = 22` (`null` = giờ thực Việt Nam). Thử rung: `ninja.game.fx.addShake(8)`.
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
- **Quái**: thêm vào `LIST` trong `server/data/monsters.js` (dùng kiểu sprite có sẵn, bảng màu riêng; quái người nên có bộ trang phục riêng trong `HUM` ở `monsterart.js`) → đặt vào bản đồ (`field(...)` trong `maps.js`) → vật phẩm rơi phải tồn tại.
- **Boss**: thêm vào `BOSSES` → thêm `boss: [{ m, x }]` cho bản đồ → có thể thêm `BOSS_DROPS` → **bắt buộc** thêm 2-3 chiêu vào `BOSS_SKILLS` (`monsters.js`, dùng helper `quake/fissure/roar/summon/beam/pillar/nova`; quái con của `summon` phải tồn tại) → `npm run check` kiểm giới hạn tầm, thời gian niệm, hệ số.
- **Chiêu boss mới**: `k` chỉ được là `quake|roar|summon|beam|nova` (trùng `bossSkill` trong `fx.js`), `shape` là `circle|line|pillar`. Vùng trúng tính ở `inBossZone` (`combat.js`), hình cảnh báo vẽ ở `onBossCast`/`onBossHit` (`game.js`): đổi một bên thì phải đổi bên kia cho khớp.
- **Tà Thú (boss sự kiện)**: thêm vào `BOSSES` với phần tử thứ 8 = `1` (`event: true`, không cần đặt lên bản đồ, không hồi sinh, phó bản không chọn) → thêm id vào `TATHU.bosses` (`extras.js`) → thêm `BOSS_SKILLS`, `BOSS_DROPS` → `VARIANT` và `AURA2` trong `monsterart.js` → phải có ít nhất 1 bãi luyện công có quái chênh ≤ `TATHU.mapLv` cấp (`npm run check` báo lỗi nếu không).
- **Bản đồ**: thêm bằng `field()` hoặc `reg()` trong `maps.js`. Cổng phải **hai chiều**: bản đồ đích cần có cổng quay lại. Dùng lại `theme` có sẵn. Thêm tọa độ vào `WORLD_LAYOUT` trong `public/js/worldmap.js`.
- **Theme bản đồ mới** (chỉ khi không theme nào hợp): thêm vào `THEMES` **và** `SCENES` (`maprender.js`), `REGION`/`THEME_GLYPH`/`DECO` (`worldmap.js`), danh sách `THEMES` trong `tools/check-data.js` → `npm run check`.
- **Nhiệm vụ chính**: thêm `q(...)` vào `server/data/quests.js` **đúng thứ tự `req`**; mục tiêu, vật phẩm thưởng và bản đồ phải tồn tại.
- **Kỹ năng**: `server/data/skills.js`, dùng `fx.k` có sẵn trong `fx.js`, kiểm tra `skillIconURL` vẽ được.
- **Kỹ năng nội tại**: thêm vào `skills.js` với `type: 'passive'`, `pas: { stat, v: [cơ bản, mỗi cấp] }`, `stat` phải có trong `PASSIVE_STATS` (không có `fx/mp/cd`). Sách `book_<id>` tự sinh trong `items.js` (giá lượng và màu bìa theo `BOOK_GRADE`, icon `{ k: 'book', s: 'pas' }` có huy hiệu nội tại) và tự vào Tiệm Thuốc; nhớ cho boss rơi qua `books(req, ch)` trong `BOSS_DROPS` (`monsters.js`). Chỉ số mới thì áp trong `recalc()` (`player.js`), thêm hình vào `PASSIVE_ART` (`icons.js`). Chạy `npm run check`.
- **Thời trang / thú cưỡi**: thêm dòng vào bảng `FASHION` trong `server/data/items.js` (`[id, tên, ô, mã hình, grade, cấp, chỉ số, giá lượng]`, giá 0 = không bán, chỉ ra từ rương/vòng quay) → vẽ mã hình trong `sprites.js` (`MASKS` / `CLOAKS` / `COSTUMES` / `MOUNTS`, thú bốn chân thêm `MOUNT_HEADS`) → icon trong `icons.js` (`MASK_ICONS` / `COSTUME_ICON` / `MOUNT_ICONS` + `MOUNT_ICON_PAL`, áo choàng dùng màu `c`) → `npm run check`. Ô mới thì thêm vào `FASHION_SLOTS` và `STYLE_POS` trong `ui.js`. Chỉ thú cưỡi được có `spd` (giới hạn trong `DESIGN_RULES.md` mục 9).
- **Loại ngọc khảm mới**: thêm vào `GEM_TYPES` (`items.js`: `name, stat, label, unit, c, v[10]`, `v` tăng dần) → 10 vật phẩm `gem_<loại>_<cấp>` tự sinh và ngọc cấp 1 tự vào Lò Rèn → vẽ hình trong `GEM_SHAPES` (`icons.js`, hàm `inside(u, v)`) → chỉ số mới thì cộng trong `recalc()` (`player.js`, kể cả khóa trong `eq`) và thêm nhãn `STAT_LABELS`, thêm chỉ số vào `GEM_STATS` trong `tools/check-data.js` → `npm run check`. Mỗi món có tối đa 3 lỗ, không khảm trùng loại, nên tổng số loại phải ≥ 3. Món đồ lưu ngọc ở `it.gems` (`[id|null, ...]`, dài bằng số lỗ); mọi chỗ sao chép/so sánh món đồ (giao dịch, kho) phải giữ nguyên trường này.
- **Thú cưng**: thêm dòng vào `PETS` trong `server/data/pets.js` (`[id, tên, cấp yêu cầu, chỉ số cấp 1, giá lượng (0 = không bán), mã hình, kỹ năng]`, kỹ năng trong `PET_SKILLS`) → vẽ mã hình trong `PET_ART` (`public/js/petart.js`; icon `{ k: 'pet', s: mã hình }` tự sinh) → `npm run check`. Cấp/EXP/thân mật lưu trên món (`it.plv/pexp/love`), mọi chỗ sao chép món đồ phải giữ các trường này; dữ liệu cũ thiếu trường thì `cleanPet` đưa về cấp 1. Kỹ năng mới: thêm vào `PET_SKILLS` + chạy trong `petTick` (`player.js`) + hiệu ứng `onPetAct` (`game.js`) + mô tả `petSkillText` (`ui.js`). Thức ăn: dòng `PET_FOOD` + hình trong `PETFOOD_ICONS` (`icons.js`).
- **Giftcode cố định**: thêm vào `GIFTCODES` (`extras.js`): mã 4-20 chữ in hoa/số, `reward { xu, luong, items: [[id, sl]] }`, `until` bắt buộc (`'YYYY-MM-DD'` giờ Việt Nam), `from`/`lv`/`note` tùy chọn → `npm run check`. Mã tạm thời: admin `/code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ] [lượt]`.
- **Sự kiện theo mùa mới**: thêm phần tử vào `SEASONS` (`extras.js`: `id, name, desc, from, until, token, drop { rate, lvGap, boss, event }, exchange [{ id, cost, limit?, reward { xu, luong, items, days } }]`), không trùng thời gian mùa khác → vật phẩm token `type: 'event'` cộng dồn trong `items.js` với icon `k` riêng (vẽ trong `iconCanvas` của `icons.js`, thêm vào `ICON_KINDS` của `tools/check-data.js`) → `npm run check`. Thử trước ngày bằng `/sukien <id>`, xong thì `/sukien auto`.
- **Luật / thưởng lôi đài**: chỉ sửa `ARENA` (`extras.js`): `minLv`, `elo`, `k`, `match { base, grow, growEvery, max }`, `countdown`, `dur`, `pairDaily`, `daily`, `win/lose/draw { xu, fame }`, `weeklyMin`, `weeklyWin`, `dodgeLock`, `weekly [{ to, luong, xu, items }]` (`to` tăng dần, hạng thấp không nhiều lượng hơn hạng cao) → `npm run check` → cập nhật bảng mục 9 của `DESIGN_RULES.md`. Thử thưởng tuần bằng `/arena reward`.
- **Loại NPC mới**: thêm vào `NPC_TYPES` (`maps.js`) → ngoại hình trong `NPCS` (`sprites.js`) → nhà trong `SHOP` (`maprender.js`) → xử lý trong `npc()`/`npcAct()` (`actions.js`) → `npm run check` (kiểm đủ 3 nơi).
- **Bậc trang bị mới**: thêm vào `TIER_NAMES/TIER_LV/TIER_COLORS` (`items.js`) **và** `TIER_OUTFIT/TIER_METAL/TIER_TRIM` (`sprites.js`).

## Git

- Commit message **tiếng Việt**: dòng đầu tóm tắt, thân giải thích nếu cần.
- Chỉ commit khi `npm test` đạt và client không có lỗi console. Không commit file đang làm dở của agent khác.
- Đẩy lên nhánh `main` của `danhtrongit/Ninja-School` (`git push -u origin main`).
- **Không** commit thư mục `data/`, `node_modules/`, ảnh chụp kiểm tra hay file tạm.
