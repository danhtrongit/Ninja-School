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
npm run test:ui / test:e2e / test:perf   # kiểm thử trình duyệt thật (Playwright), xem đầu file trong tests/e2e/
npm run test:audit             # giao diện theo cảnh ở 4 cỡ màn (tests/e2e/ui-audit.js, thêm cảnh vào bảng SCENES)
npm run test:persist           # đo lưu theo nhân vật: 5.000 nhân vật hậu kỳ, 200 online (trễ vòng lặp, RSS)
npm run test:prod              # smoke test máy chủ thật (PROD_URL, mặc định https://ninja.iqx.vn): đăng ký → lên cấp, kiểm /api/status trùng commit main
PORT=3000 DATA_DIR=/tmp/ns ADMINS=tentk1,tentk2 NS_TEST=1 node src/server/index.js   # admin dùng được lệnh vận hành /mail /code /sukien /arena /all /kick
# NS_TEST=1 (chỉ server kiểm thử, production KHÔNG đặt): mở lệnh kiểm thử /lv /item /plus /tp /xu /xuk /luong /boss /bosshp /chet /event /hethan /thu /tieunhi
# và cho đăng ký tên có trong ADMINS; không có NS_TEST thì tên trong ADMINS chưa có tài khoản không đăng ký được ([ALERT] trong log).
# Mỗi lệnh admin ghi một dòng "[ADMIN] <tài khoản> /<lệnh> ..." ra log. Script tự bật server (tests/, scripts/verify.js) phải đặt NS_TEST=1.
```

## Cấu trúc thư mục

```
src/server/index.js        đọc cấu hình, tạo DB + World, nối HTTP + WebSocket, lưu định kỳ
src/server/core/           engine dùng chung: world, map, monster, combat, player,
                           router (bảng hành động), modules (nạp module + điểm móc), gateway (sảnh + WebSocket),
                           gamedata (gói 'data'), npc (nearNpc, dialog), util (int, clean, own)
src/server/services/       db (lưu JSON), http (phục vụ src/client), reward (giveReward, rewardLabel)
src/server/modules/<x>/    mỗi tính năng một thư mục index.js (danh sách + thứ tự ở modules/index.js)
src/shared/                CommonJS, server + tools dùng: constants.js, formulas.js, data/ (items/ tách theo loại)
src/client/                thư mục tĩnh: index.html, css/, fonts/, js/
src/client/js/             main.js; core/ (net, store, input, sound); game/ (game, pathfind);
                           render/ (file vào + thư mục con: sprites/, monster/, map/, fx/, icons/; petart, titleart);
                           ui/ (ui.js, dom.js, common.js, worldmap.js, windows/<cửa sổ>.js)
tests/smoke.js             npm test: bộ chạy; tests/lib/ (harness, bot, helpers); tests/features/<x>.js
tests/e2e/                 Playwright: e2e.js, perf.js, ui-multiplayer.js
tools/                     check-data.js (npm run check), shot.js (chụp ảnh)
```

- `services/http.js` chèn vào `index.html` lúc phục vụ một import map trỏ mỗi file `js/**` tới bản `?v=<băm nội dung>` (lưu đệm vĩnh viễn) và `modulepreload` cho mọi module, `css/*.css` cũng gắn `?v=`. Thêm/sửa file client không cần làm gì thêm; chỉ import bằng đường dẫn tương đối tĩnh.
- Client là ES module không build nên **không** import `src/shared/` (dữ liệu tĩnh tới qua gói `data`, đọc bằng `S.G`).
- `render/<x>.js` là **file vào** giữ API công khai (bảng dưới), phần thân nằm trong thư mục con (`sprites.js` → `sprites/`, `monsterart.js` → `monster/`, `maprender.js` → `map/`, `fx.js` → `fx/`, `icons.js` → `icons/`). Module khác chỉ import file vào.
- `ui/ui.js` giữ HUD, khung cửa sổ, chat và bảng `refresh()`; nội dung từng cửa sổ ở `ui/windows/<x>.js` (`export default { renderX() {...} }`, `this` là đối tượng UI), gộp vào `UI.prototype` ở cuối `ui.js`.

## Kiến trúc và bất biến

- **Server có thẩm quyền**: client chỉ gửi ý định (`move`, `skill`, `useItem`, ...). Server kiểm tra tầm đánh, hồi chiêu, chakra, tốc độ, độ cao nhảy, khoảng cách NPC, số dư tiền. **Không bao giờ** tin dữ liệu số do client gửi.
- **Giao thức**: JSON `{ t: 'loai', ...du_lieu }`. Lúc kết nối, server gửi gói `data` (toàn bộ dữ liệu tĩnh, dựng ở `core/gamedata.js`, module thêm phần riêng qua móc `clientData`). Client đọc dữ liệu tĩnh qua `S.G` (`src/client/js/core/store.js`), **không** chép dữ liệu game vào client.
- **Module server** (`src/server/modules/<x>/index.js`) export `{ name, init?(world), actions?, npcs?, hooks?, expose? }`:
  - `actions: { t: handler(p, m) }`: `core/router.js` gom thành bảng hành động không có prototype (gói `t = 'constructor'`, `'__proto__'`... bị bỏ qua). Trùng tên hành động, trùng loại NPC hay handler không phải hàm thì server **dừng ngay lúc khởi động**.
  - `npcs: { loại: { open(p, n), act?(p, n, a, m) } }`: module `npc` tìm NPC đứng gần rồi chuyển cho module đăng ký loại đó.
  - `hooks`: hàm hoặc `{ order, fn }`, chạy theo thứ tự trong `modules/index.js` (trừ khi có `order`). Móc tĩnh luôn chạy, kể cả thế giới giả của kiểm thử: `stats, kill, sanitize, selfData, clientData`. Móc thế giới (chỉ khi có `world.mods`): `join, leave, left, beforeEnterMap, mapLeft, enterMap, second, playerSecond, tick, update, sendState, rank, monsterKilled, charDeleted`. Ý nghĩa từng móc ghi ở đầu `core/modules.js`.
  - `this` của handler, NPC và móc thế giới là đối tượng `init(world)` trả về (`world.mods[name]`); không có `init` hoặc móc tĩnh thì `this` là chính object export. `expose: 'ten'` gắn thêm vào `world.ten` (đang có `world.event`, `world.mail`, `world.season`, `world.arena`).
  - Gọi qua module khác: `world.mods.<tên>`; phát móc: `world.emit(hook, ...args)`; xử lý gói: `world.router.handle(p, m)`.
- **Chỉ số nhân vật**: `Player.recalc()` (`core/player.js`) dựng bảng tạm `t = { p, c, now, eq, mountSpd, buf, pas, expPct, expMul }` rồi gọi móc `stats(t)`: `inventory` cộng trang bị/ngọc/thú/thời trang vào `eq`, `skills` cộng nội tại vào `pas`, `buffs` cộng buff vào `buf`, `clan` cộng `expPct`. Chỉ số mới: thêm khóa vào bảng tạm, cộng ở móc `stats` của module, dùng trong công thức của `recalc()`.
- **Độ cao (y)**: `move` (`modules/movement`) kiểm y theo vật lý nhảy (`JUMP/JUMP2/GRAV`, bục của bản đồ), quá giới hạn thì gửi `pos` kéo xuống. Đổi vật lý nhảy ở `game/game.js` thì **phải** sửa hằng số tương ứng trong `modules/movement/index.js`. Client gửi `move` ngay ở khung chạm đất.
- **Dữ liệu game** nằm trong `src/shared/data/`: `classes, skills, monsters, maps, quests, extras, pets` và `items/` (`index.js` dựng `ITEMS`/`SHOPS` từ `base, equipment, consumables, pets, fashion, books, gems, shops`; thứ tự thêm vật phẩm giữ cố định). Hằng số dùng chung ở `src/shared/constants.js`, công thức ở `src/shared/formulas.js`. Thêm nội dung thì sửa ở đây; client tự nhận qua `S.G`.
- **Lõi server** (`src/server/core/`): `world` (vòng lặp, vào/ra bản đồ), `map`, `monster` (AI quái), `combat` (kỹ năng, sát thương, rơi đồ), `player` (chỉ số, túi đồ, EXP, thú cưng). Còn lại là module: `movement` (di chuyển, cổng, nhặt đồ, ping, dịch chuyển), `inventory`, `buffs`, `skills`, `fashion`, `pets`, `npc`, `quest`, `shop`, `smith` (cường hóa), `gems`, `storage`, `checkin`, `wheel`, `invites`, `chat`, `admin` (lệnh `/...`), `friends`, `party`, `pk` (PK, thách đấu, hồi sinh), `trade`, `clan`, `rank`, `dungeon`, `events` (Tà Thú, `world.event`), `season` (lễ hội), `mail` (hộp thư + giftcode), `arena` (lôi đài).
- **Lôi đài**: cấu hình `ARENA` (`extras.js`), phòng đấu là phó bản `loidai` (`maps.js`, cờ `arena: true`), mỗi trận một `GameMap` riêng (id `loidai#n`). Người chơi trong trận có `p.match` (`{ id, map, a, b, state: 'prep'|'fight'|'end', rated, hit, maxHp }`: `hit` = đã có đòn trúng, `maxHp` = sinh lực tối đa từng bên lúc vào đấu, hết giờ chia % theo mức này) và `p.arenaBack` (bản đồ, vị trí, sinh lực/chakra trước trận để trả lại). Điểm lưu ở `c.arena` (`cleanArena` chuẩn hóa: `elo, win, lose, draw, fame, streak, best, day, dn, wk, wn, ww, paid`), `selfData()` gửi `me.arena`. Giao thức: `arenaJoin`, `arenaCancel`, `arenaLeave` → `arena { st: 'idle'|'queue'|'prep'|'fight'|'end', wait, n, left, opp { id, name, cls, lv, elo }, rated }`, `arenaResult { res, reason, rated, nc, opp, elo, before, d, xu, fame, hp, ohp, streak, quit, lock }` (`nc`: bỏ trận/hòa khi chưa ai ra đòn → trận không tính; `lock`: ms người bỏ bị cấm đăng ký). Vào game server luôn gửi trạng thái `arena` hiện tại (`arena.onJoin` → `sendState`) và kết quả trận bị xử thua lúc mất kết nối; `arenaCancel`/`arenaLeave` không khớp trạng thái server cũng được gửi lại trạng thái thật. Số trận tính điểm mỗi cặp trong ngày lưu ở `db.meta.arenaPairs`; gói `rank` có thêm `arena` (top 30) và `arenaMe`; mở tab qua `openUi { ui: 'rank', tab: 'arena' }`. Mọi chỗ đánh người (`canPvp`, `damagePlayer` trong `core/combat.js`) phải kiểm `p.match` trước luật khu an toàn/thách đấu; đòn chí mạng trong trận gọi `world.arena.ko(p)` (không chết thật, không rơi đồ); chiêu nhiều đòn kiểm lại `canPvp` trước mỗi đòn nên trận xong là dừng. Mọi nguồn hồi máu mới (thú cưng, buff theo thời gian...) phải bỏ qua bản đồ `arena`. Giao dịch/thách đấu phải kiểm `p.match` cả lúc gửi lẫn lúc nhận lời mời. Đổi bản đồ (`enterMap`) và thoát game (`leave`) đã báo `world.arena` để xử thua.
- **Hộp thư**: gửi thư bằng `world.mail.deliver(c, { from, title, body, xu, xuk, luong, items })` hoặc `sendItems(c, base, items)` (tự tách thư khi > 6 món), `c` là dữ liệu nhân vật (`world.mail.charOf(tên)` lấy cả người offline). Trả về `false` khi hộp đầy thư còn quà: người gọi phải tự xử lý (vd `stashItem`), không được làm mất quà. Quà kiểu thưởng hệ thống (nhiệm vụ, điểm danh, thành tựu...) dùng `xuk` (xu khóa) thay `xu` và cho vật phẩm qua `bind` (`src/shared/bound.js`). Thư nằm ở `c.mail`, `selfData()` gửi `me.mail = { n: chưa đọc, g: còn quà }`. Giao thức: `mailList, mailRead{id}, mailClaim{id}, mailClaimAll, mailDel{id}, mailDelRead` → `mail { list, max, keep }`; `giftcode{code}` → `codeResult { ok, msg, mail?, wait? }`. Mã đã dùng lưu theo **tài khoản** (`accounts.json` → `acc.codes`, kèm `c.codes` cũ); IP người chơi (`conn.ip`) chỉ lấy từ `X-Forwarded-For` (phần tử cuối) khi đứng sau proxy tin cậy (`TRUST_PROXY`), không bao giờ lấy phần tử đầu.
- **Sự kiện theo mùa**: server báo mùa đang chạy bằng gói `season { id|null }` (lúc vào game và khi đổi mùa), máy khách tra `S.G.seasons` bằng `activeSeason()` (`store.js`). Đổi quà `seasonEx { npc, id, n }` → `seasonResult { ok, msg, season }`; mở cửa sổ qua `openUi { ui: 'event', npc }`. Số lần đổi trong mùa lưu ở `c.season = { id, ex }`.
- **Lưu dữ liệu** (`services/db.js`, ADR-10-1): mỗi nhân vật một file `DATA_DIR/chars/<khóa>.json` (khóa = tên chữ thường, `encodeURIComponent`), bảng `accounts.json`, `clans.json`, `meta.json` (`meta.layout = 2`). Đổi dữ liệu thì đánh dấu bẩn `db.touch(tên | '#accounts' | '#clans' | '#meta', khẩn)`: thường thì mỗi nhân vật ghi tối đa 1 lần/30 giây (bảng 5 giây), khẩn (quà trong thư, thoát game, đá ngọc...) ghi ngay tick sau. Thao tác đổi **nhiều bản ghi** mà ghi lệch nhau sẽ nhân bản/mất đồ (giao dịch, góp gia tộc, mã quà, tạo/xóa nhân vật, kết quả lôi đài) dùng `db.commit([tên, '#bảng', ...], 'lý do')`: nhật ký `journal/<gen>.json` ghi trước, sập giữa chừng thì khởi động lại phát lại, không chặn vòng lặp. **Không** còn `db.dirty = true`. Người online được đánh dấu bẩn 30 giây một lần (`world.saveAll`), ghi xuống đĩa do `db.flushTick()` cuối mỗi tick (≤ 8 ms hoặc 20 bản ghi, tối đa 24 lần ghi cùng lúc); tắt máy/lỗi chết người gọi `db.flushAllSync()`. Dữ liệu một file cũ (`characters.json`) tự tách khi khởi động, file cũ giữ dưới tên `characters.migrated-*.json`. Kiểm thử: thế giới giả dùng `fakeDb()`, đọc/sửa nhân vật trên đĩa bằng `readChars/writeChars` (`tests/lib/helpers.js`), nhân vật hậu kỳ mẫu `lateChar()` (`tests/lib/chars.js`); đo bằng `npm run test:persist`.
- Dữ liệu người chơi nằm ở `DATA_DIR` (mặc định `./data` ở gốc repo, đã nằm trong `.gitignore`). **Không** commit thư mục này. Lưu ý: `.gitignore` chỉ bỏ qua `/data/` ở gốc; `src/shared/data/` **phải** được commit.

## API công khai giữa các module client (không được đổi chữ ký)

Đường dẫn tính từ `src/client/js/`.

| Module | Export |
|---|---|
| `render/sprites.js` | `drawNinja(ctx, x, y, o)`, `drawPortrait(ctx, o)`, `NINJA_H`, `ELEMENT_COLORS`, `shade`, `mountOffset(look)`, `ninjaHeight(look)` |
| `render/monsterart.js` | `drawMonster(ctx, x, y, def, o)`, `monsterHeight(def)`, `prewarmMonsters(defs)` (dựng sẵn khung khi vào bản đồ) |
| `render/maprender.js` | `class MapRenderer(map)` có `drawBackground`, `drawTerrain`, `drawPortals`, `drawNight(ctx, camX, camY, W, H, hour, px, py)`, `drawParticles`, `drawForeground`, `drawLighting(ctx, camX, camY, W, H, hour, px, py)`; `THEMES`; ngày/đêm: `vnHour(now)`, `dayPhase(h)`, `setLighting(k)`, `getLighting()` |
| `render/fx.js` | `class FX` có `sparks, text, slash, proj, burst, wave, rain, meteor, whirl, aura, heal, dash, levelUp, update, draw, drawTexts`; `drawGround(ctx, camX, camY)`; boss/tính năng: `telegraph, bossSkill, enhance, mountDust, gemSocket, costumeSparkle`; rung: `addShake(v), shakeAt(x, y, v), shakeXY()`, thuộc tính `shakeScale` (0 = tắt) |
| `render/icons.js` | `iconCanvas`, `iconURL(icon, rarity)`, `skillIconURL(sk, sid, elColor)`, `uiIconURL(name)` |
| `render/petart.js` | `drawPet(ctx, x, y, kind, o)` (`o`: `t, dir, moving, lv, scale, happy, noShadow, still`), `PET_ART`, `PET_KINDS`, `petFlies(kind)`, `petHeight(kind)`, `petPixels(kind)` (khung đứng cho icon) |
| `render/titleart.js` | logo, nền màn hình mở đầu, `CLASS_STATS` |
| `game/pathfind.js` | `findRoute, routeMaps, nearestMap, mapsWithMob, mobsDropping, mapsWithDrop, mapsWithNpc, questDest, dailyDest` (lộ trình giữa bản đồ); `buildNav, surfaceAt, surfaceBelow, navPlan` (nhảy bục trong bản đồ) |
| `ui/ui.js` | `class UI`, `h(tag, attrs, ...kids)` (định nghĩa ở `ui/dom.js`, `ui.js` xuất lại) |
| `ui/worldmap.js` | `WORLD_LAYOUT` (tọa độ từng bản đồ trên tranh), `buildWorldMap({ cur, questMaps, partyMaps, eventMaps, onGo })` |

Được phép **thêm** tham số tùy chọn hoặc export mới. Không được đổi tên hay bỏ tham số cũ. File trong thư mục con (`render/sprites/`, `ui/windows/`...) là nội bộ của vùng đó.

**Các id DOM dùng chéo giữa module, không được đổi:**
`#game, #hud, #hud-skills, #hud-dpad, #hud-status, #avatar, #st-*, #bar-hp, #bar-mp, #bar-exp, #hud-target, #tg-*, #hud-map, #map-name, #map-info, #map-ping, #minimap, #hud-quest, #hud-menu, #hud-buffs, #hud-party, #hud-chat, #chat-*, #windows, #dialogs, #invites, #toasts, #overlay-conn, #rotate-hint, #screen-login, #screen-chars, #in-user, #in-pass, #in-pass2, #btn-login, #login-err, #char-create, #in-cname, #in-gender, #btn-create, #chars-err, #server-status`. Thêm vào đó các selector mà `tests/` và `tools/shot.js` dùng: `.class-card`, `.char-card .btn.primary`, `[data-tab]`, `[data-act]`.

## Làm việc song song nhiều agent

1. **Mỗi file chỉ một agent sửa** trong cùng một đợt. Người điều phối giao rõ file cho từng agent. Việc theo **tính năng** thì giao trọn một hàng ở bảng tính năng; việc ở **vùng dùng chung** thì giao theo bảng vùng.

**Tính năng** (đường dẫn rút gọn: `modules/` = `src/server/modules/`, `windows/` = `src/client/js/ui/windows/`, `features/` = `tests/features/`):

| Tính năng | Server | Cửa sổ | Kiểm thử |
|---|---|---|---|
| Di chuyển, cổng, nhặt đồ, dịch chuyển | `modules/movement` | | `features/movement.js` |
| Hành trang, trang bị, buff, mở rộng túi, hủy nhanh | `modules/inventory`, `modules/buffs` | `windows/inventory.js`, `windows/character.js` | `features/endgame.js`, `features/inventory.js` |
| Kỹ năng, tiềm năng, nội tại | `modules/skills` | `windows/skills.js` | `features/skills.js`, `features/passive.js` |
| Thời trang, thú cưỡi | `modules/fashion` | `windows/inventory.js` (ô thời trang) | `features/fashion.js` |
| Thú cưng | `modules/pets` | `windows/pet.js` | `features/pets.js` |
| NPC, nhiệm vụ | `modules/npc`, `modules/quest` | `windows/dialog.js`, `windows/quest.js` | `features/quest.js` |
| Cửa hàng | `modules/shop` | `windows/shop.js` | `features/quest.js` |
| Thợ Rèn, ngọc khảm | `modules/smith`, `modules/gems` | `windows/smith.js` | `features/gems.js` |
| Thủ kho, điểm danh, vòng quay | `modules/storage`, `modules/checkin`, `modules/wheel` | `windows/storage.js`, `windows/checkin.js`, `windows/wheel.js` | `features/daily.js` |
| Chat, lời mời, nhóm, giao dịch | `modules/chat`, `modules/invites`, `modules/party`, `modules/trade` | `windows/party.js`, `windows/trade.js`, `windows/dialog.js` | `features/social.js`, `npm run test:ui` |
| Bạn bè, gia tộc, xếp hạng | `modules/friends`, `modules/clan`, `modules/rank` | `windows/friends.js`, `windows/clan.js`, `windows/rank.js`, `windows/inspect.js` | `features/daily.js`, `features/passive.js` |
| PK, thách đấu, hồi sinh | `modules/pk` | `windows/dialog.js` (tử trận) | `npm run test:ui` |
| Phó bản | `modules/dungeon` | | `features/daily.js` |
| Tà Thú | `modules/events` | `windows/event.js` | `features/boss.js` |
| Lễ hội theo mùa | `modules/season` | `windows/season.js` | `features/mail.js` |
| Hộp thư, giftcode | `modules/mail` | `windows/mail.js` | `features/mail.js` |
| Lôi đài | `modules/arena` | `windows/arena.js` (+ tab trong `rank.js`) | `features/arena.js` |
| Âm thanh (nhạc nền, tiếng hiệu ứng, âm lượng) | `modules/audio` (+ Range trong `services/http.js`) | `windows/settings.js` (thanh âm lượng) | `features/audio.js` |
| Lệnh admin | `modules/admin` | | dùng trong mọi phần kiểm thử |
| Xu khóa & vật phẩm khóa | `modules/bound`, `src/shared/bound.js` (luật khóa nằm ở từng module: shop, trade, gems, mail...) | ổ khóa trong `ui/common.js` (`itemIcon`), `windows/shop.js`, `windows/trade.js` | `features/bound.js` |

**Vùng dùng chung** (thường chỉ một agent giữ mỗi vùng trong một đợt):

| Vùng | File |
|---|---|
| Lõi server | `src/server/core/**`, `src/server/services/**`, `src/server/index.js`, `src/server/modules/index.js` |
| Dữ liệu game | `src/shared/**` (tách được theo file: `items/*.js`, `monsters.js`, `maps.js`...) |
| Nhân vật & NPC | `render/sprites.js`, `render/sprites/**` |
| Quái | `render/monsterart.js`, `render/monster/**` |
| Bản đồ | `render/maprender.js`, `render/map/**` |
| Hiệu ứng & icon | `render/fx.js`, `render/fx/**`, `render/icons.js`, `render/icons/**`, `render/petart.js` |
| HUD & khung cửa sổ | `ui/ui.js`, `ui/dom.js`, `ui/common.js`, `css/style.css`, `css/hud.css`, `css/windows.css`, `css/features.css`, `css/touch.css`, phần `#hud` trong `index.html` |
| Bản đồ thế giới | `ui/worldmap.js`, `windows/map.js`, `css/worldmap.css` |
| Màn hình mở đầu | `main.js`, `render/titleart.js`, `css/screens.css`, phần `#screen-*` trong `index.html` |
| Vòng lặp game | `game/game.js`, `game/pathfind.js`, `core/input.js`, `core/net.js`, `core/store.js`, `core/sound.js` |
| Hạ tầng kiểm thử | `tests/smoke.js`, `tests/lib/**`, `tests/e2e/**`, `tools/**` |

(`render/`, `ui/`, `game/`, `core/`, `main.js` tính từ `src/client/js/`; `css/` từ `src/client/`.) Tính năng mới thường phải chạm một dòng ở vùng dùng chung (thêm tên vào `modules/index.js`, import cửa sổ + một dòng trong bảng `refresh()` của `ui.js`, gọi phần kiểm thử trong `tests/smoke.js`): người điều phối giao trước cho một agent, hoặc agent tính năng sửa đúng dòng đó theo mục 2.

2. Nếu buộc phải sửa 1-2 dòng ở file của agent khác (ví dụ một độ lệch vị trí trong `game.js`), hãy **Read lại ngay trước khi Edit**, sửa tối thiểu, rồi ghi rõ trong báo cáo cuối.
3. Cần chức năng từ vùng của agent khác thì **gọi qua API công khai** ở bảng trên (server: `world.mods.<tên>`, móc). Nếu chưa có, tạo hàm tạm (stub) có cùng chữ ký và ghi chú lại để agent kia làm tiếp.
4. **Không** khởi động lại hay tắt server dùng chung khi agent khác đang chụp ảnh. Cần server riêng thì chạy ở cổng khác (ví dụ 3600) với `DATA_DIR` riêng.
5. Mỗi agent dùng **tài khoản test riêng** (tên 4-16 ký tự, ví dụ `art1`, `qatest2`). Đăng nhập trùng tài khoản sẽ đá phiên của agent khác ra.
6. **Báo cáo cuối** gồm: việc đã làm, file đã sửa, đường dẫn ảnh chụp kiểm tra, những điều agent khác cần biết (API mới, hành vi đổi, việc còn dang dở).

## Thêm module tính năng mới

1. **Server**: tạo `src/server/modules/<tên>/index.js` (`'use strict'`, CommonJS), mẫu ngắn nhất là `modules/checkin`:
   ```js
   class Foo { constructor(world) { this.world = world; } fooDo(p, m) { /* kiểm tra m bằng int()/clean() */ } }
   module.exports = { name: 'foo', init: (world) => new Foo(world), actions: { fooDo: Foo.prototype.fooDo }, hooks: { clientData(out) { out.foo = FOO; } }, Foo };
   ```
   Thêm `require('./<tên>')` vào `src/server/modules/index.js` (vị trí trong danh sách = thứ tự chạy móc). Tên hành động phải chưa có ở module khác. Cần lưu dữ liệu trên nhân vật thì dọn ở móc `sanitize(c)` và gửi qua `selfData(p, d, now)`. Dữ liệu tĩnh đặt ở `src/shared/data/`.
2. **Client**: cửa sổ mới ở `src/client/js/ui/windows/<tên>.js` (`export default { renderFoo() {...} }`, dựng DOM bằng `h()`), import + thêm vào `Object.assign(UI.prototype, ...)` và bảng `refresh()` trong `ui.js`. Gói server → UI đăng ký bằng `n.on('t', ...)` trong hàm dựng của `UI`; gói ảnh hưởng thế giới (hiệu ứng, vị trí) xử lý trong `game.js` (`onXxx(m)`). CSS riêng của tính năng vào `css/features.css`.
3. **Kiểm thử**: tạo `tests/features/<tên>.js` export các hàm `xxxUnitTests()` (thế giới giả, không cần server) và/hoặc `async xxxTest(a, ...)` (bot WebSocket thật), dùng `ok/sleep` từ `tests/lib/harness.js`, `Bot` từ `tests/lib/bot.js`; gọi chúng trong `tests/smoke.js` đúng chỗ (các phần chạy nối tiếp, phần sau dùng nhân vật phần trước để lại: xem chú thích trong bộ chạy). Dữ liệu tĩnh mới thì thêm kiểm tra chéo vào `tools/check-data.js`.

## Giao việc cho agent phụ

- **Không** dùng opencode hay MCP `agent-hub` (người dùng đã bỏ, 2026-10-18) trừ khi người dùng yêu cầu lại. Việc song song giao agent Claude (Agent/Workflow), mỗi agent một git worktree riêng.
- Prompt cho agent phải tự đủ: mục tiêu, file được sửa (và file **không** được sửa), quy tắc liên quan trong file này và `DESIGN_RULES.md`, lệnh kiểm chứng (`npm test`, `npm run check`, `tools/shot.js` với cổng/tài khoản/`DATA_DIR` riêng), nội dung cần báo lại. Vẫn áp dụng phân vùng file ở mục trên.
- Người điều phối rà kết quả (đọc diff, chạy kiểm thử, xem ảnh chụp) trước khi gộp.

## Quy trình kiểm tra trước khi xong việc

1. **Đổi server** (`src/server/**`, `src/shared/**`): chạy `npm test`, phải in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT`. Có tính năng mới thì **thêm kiểm thử** vào `tests/features/<tính năng>.js` và gọi trong `tests/smoke.js`. Kiểm tra cú pháp nhanh: `node --check <file>`.
2. **Đổi dữ liệu game** (`src/shared/data/**`) hoặc hình vẽ được dữ liệu tham chiếu (icon, NPC, theme, thời trang, thú cưng): chạy `npm run check`, không được có dòng lỗi. `check-data.js` đọc mã client theo file vào + thư mục con (`render/icons.js` + `render/icons/`, `render/maprender.js` + `render/map/`...).
3. **Đổi client**: chụp ảnh bằng `tools/shot.js` (xem đầu file để biết tham số) ở desktop 1280×720 **và** điện thoại `mobile: true`. Xem ảnh, đảm bảo đẹp và đúng `DESIGN_RULES.md`. Script phải in `OK no console errors`.
   Đổi giao diện xã hội (menu người chơi, lời mời, giao dịch, nhóm, thách đấu): chạy `npm run test:ui` (2 trình duyệt thật, cần Playwright và server có `ADMINS=duoalpha,duobravo`).
   Đổi tìm đường, bản đồ thế giới hay hệ thống lớn: chạy `npm run test:e2e` cả desktop lẫn `MOBILE=1` (cần `BASE_URL` server riêng có `ACC` trong `ADMINS`, xem đầu `tests/e2e/e2e.js`), phải in `E2E ĐẠT` và `OK no console errors`.
   Trong trình duyệt, `window.ninja = { game, ui, net, S }` để công cụ kiểm thử đọc trạng thái game.
   Ép giờ cho lớp ngày/đêm: `ninja.game.forceHour = 22` (`null` = giờ thực Việt Nam). Thử rung: `ninja.game.fx.addShake(8)`.
4. Kiểm tra hiệu năng khi thêm vẽ mới: `npm run test:perf` (bản đồ đông quái, bật tự động đánh, xem đầu `tests/e2e/perf.js`), phải giữ khoảng 60fps.
5. Playwright không nằm trong `dependencies`: chạy các lệnh trình duyệt với `NODE_PATH` trỏ tới nơi đã cài (vd `NODE_PATH=$(npm root -g)`).

## Quy ước code

- Giống code xung quanh: 2 dấu cách thụt lề, nháy đơn, có chấm phẩy, `const`/`let`, không dùng `var`.
- Server dùng CommonJS (`require`) và `'use strict'`. Client dùng ES modules (`import`).
- Comment ngắn, **bằng tiếng Việt**, chỉ viết khi giải thích *tại sao*. Không comment kể lại thay đổi.
- Chữ hiển thị cho người chơi là tiếng Việt có dấu. Tên định danh trong code bằng tiếng Anh hoặc không dấu.
- Không thêm thư viện npm mới trừ khi thật cần thiết (hiện chỉ có `ws`). Client không thêm thư viện hay CDN nào ngoài font VT323.
- Bảo mật: mọi chuỗi từ người chơi đưa vào DOM qua text node (hàm `h()`), **không** dùng `innerHTML` với dữ liệu người chơi.
- Không dùng `alert/confirm/prompt` của trình duyệt. Hỏi xác nhận bằng `await this.ask({ title, text, ok, cancel, danger, icon })` (`ui/windows/dialog.js`, trả về `true/false`, `text` là chuỗi hoặc mảng nút `h()`). Server kiểm tra kiểu và giới hạn mọi trường nhận được (xem `int()`, `clean()`).

## Thêm nội dung (checklist)

- **Vật phẩm**: file đúng loại trong `src/shared/data/items/` (`equipment.js`, `consumables.js`, `books.js`, `gems.js`, `fashion.js`, `pets.js`; bậc/ô/nhãn ở `base.js`) → `icon.k` phải có hình trong `render/icons.js` (bản đồ pixel `ITEM_MAPS` ở `render/icons/items.js`) → nếu bán thì thêm vào `SHOPS` (`items/shops.js`) → `npm run check`.
- **Quái**: thêm vào `LIST` trong `src/shared/data/monsters.js` (dùng kiểu sprite có sẵn, bảng màu riêng; quái người nên có bộ trang phục riêng trong `HUM` ở `render/monster/humanoid.js`) → đặt vào bản đồ (`field(...)` trong `maps.js`) → vật phẩm rơi phải tồn tại → npm run check kiểm dải cân bằng (tools/balance.js).
- **Atlas ảnh ×3 cho quái/boss** (`DESIGN_RULES.md` mục 11): dựng ngoài repo bằng `~/.local/share/ninja-art/tools/` (`gen.mjs` → `cutout.py` → `rig.py` → `atlas.py`) → chép `<id>.png` + `<id>.json` vào `src/client/art/monster/` (boss: `art/boss/`) → thêm dòng nguồn vào `src/client/art/CREDITS.md` → chuyển **trọn** các loài của bản đồ → xóa hình code riêng của loài (`VARIANT`, `HUM`) → `npm run check` → `npm run test:visual` (mục atlas trong gallery).
- **Boss**: thêm vào `BOSSES` → thêm `boss: [{ m, x }]` cho bản đồ → có thể thêm `BOSS_DROPS` → **bắt buộc** thêm 2-3 chiêu vào `BOSS_SKILLS` (`monsters.js`, dùng helper `quake/fissure/roar/summon/beam/pillar/nova`; quái con của `summon` phải tồn tại) → `npm run check` kiểm giới hạn tầm, thời gian niệm, hệ số → hệ số chiêu theo loại (quake ≤ 1.8, beam ≤ 2, nova 2-2.6) → chạy node tools/balance.js xem bảng boss.
- **Chiêu boss mới**: `k` chỉ được là `quake|roar|summon|beam|nova` (trùng `bossSkill` trong `fx.js`), `shape` là `circle|line|pillar`. Vùng trúng tính ở `inBossZone` (`core/combat.js`), hình cảnh báo vẽ ở `onBossCast`/`onBossHit` (`game/game.js`): đổi một bên thì phải đổi bên kia cho khớp.
- **Tà Thú (boss sự kiện)**: thêm vào `BOSSES` với phần tử thứ 8 = `1` (`event: true`, không cần đặt lên bản đồ, không hồi sinh, phó bản không chọn) → thêm id vào `TATHU.bosses` (`extras.js`) → thêm `BOSS_SKILLS`, `BOSS_DROPS` → `VARIANT` (`render/monster/variants.js`) và `AURA2` (`render/monster/boss.js`) → phải có ít nhất 1 bãi luyện công có quái chênh ≤ `TATHU.mapLv` cấp (`npm run check` báo lỗi nếu không).
- **Bản đồ**: thêm bằng `field()` hoặc `reg()` trong `maps.js`. Cổng phải **hai chiều**: bản đồ đích cần có cổng quay lại. Dùng lại `theme` có sẵn. Thêm tọa độ vào `WORLD_LAYOUT` trong `src/client/js/ui/worldmap.js`.
- **Theme bản đồ mới** (chỉ khi không theme nào hợp): thêm vào `THEMES` **và** `SCENES` (`render/map/themes.js`), `REGION`/`THEME_GLYPH`/`DECO` (`worldmap.js`), danh sách `THEMES` trong `tools/check-data.js` → `npm run check`.
- **Nhiệm vụ chính**: thêm `q(...)` vào `src/shared/data/quests.js` **đúng thứ tự `req`**; mục tiêu, vật phẩm thưởng và bản đồ phải tồn tại.
- **Kỹ năng**: `src/shared/data/skills.js`, dùng `fx.k` có sẵn trong `fx.js`, kiểm tra `skillIconURL` vẽ được.
- **Kỹ năng nội tại**: thêm vào `skills.js` với `type: 'passive'`, `pas: { stat, v: [cơ bản, mỗi cấp] }`, `stat` phải có trong `PASSIVE_STATS` (không có `fx/mp/cd`). Sách `book_<id>` tự sinh trong `items/books.js` (giá lượng và màu bìa theo `BOOK_GRADE`, icon `{ k: 'book', s: 'pas' }` có huy hiệu nội tại) và tự vào Tiệm Thuốc; nhớ cho boss rơi qua `books(req, ch)` trong `BOSS_DROPS` (`monsters.js`). Chỉ số mới thì thêm vào bảng tạm và công thức của `recalc()` (`core/player.js`; nội tại cộng qua móc `stats` của `modules/skills`), thêm hình vào `PASSIVE_ART` (`render/icons/skills.js`). Chạy `npm run check`.
- **Thời trang / thú cưỡi**: thêm dòng vào bảng `FASHION` trong `src/shared/data/items/fashion.js` (`[id, tên, ô, mã hình, grade, cấp, chỉ số, giá lượng]`, giá 0 = không bán, chỉ ra từ rương/vòng quay) → vẽ mã hình trong `render/sprites/fashion.js` (`MASKS` / `CLOAKS` / `COSTUMES`) hoặc `render/sprites/mount.js` (`MOUNTS`, thú bốn chân thêm `MOUNT_HEADS`) → icon trong `render/icons/fashion.js` (`MASK_ICONS` / `COSTUME_ICON` / `MOUNT_ICONS` + `MOUNT_ICON_PAL`, áo choàng dùng màu `c`) → `npm run check`. Ô mới thì thêm vào `FASHION_SLOTS` (`items/base.js`), `STYLE_SLOTS` (`ui/common.js`) và `STYLE_POS` (`ui/windows/inventory.js`). Chỉ thú cưỡi được có `spd` (giới hạn trong `DESIGN_RULES.md` mục 9).
- **Loại ngọc khảm mới**: thêm vào `GEM_TYPES` (`items/gems.js`: `name, stat, label, unit, c, v[10]`, `v` tăng dần) → 10 vật phẩm `gem_<loại>_<cấp>` tự sinh và ngọc cấp 1 tự vào Lò Rèn → vẽ hình trong `GEM_SHAPES` (`render/icons/items.js`, hàm `inside(u, v)`) → chỉ số mới thì thêm khóa vào `eq` và công thức của `recalc()` (`core/player.js`; ngọc tự cộng qua `itemStats` ở móc `stats` của `modules/inventory`) và thêm nhãn `STAT_LABELS` (`items/base.js`), thêm chỉ số vào `GEM_STATS` trong `tools/check-data.js` → `npm run check`. Mỗi món có tối đa 3 lỗ, không khảm trùng loại, nên tổng số loại phải ≥ 3. Món đồ lưu ngọc ở `it.gems` (`[id|null, ...]`, dài bằng số lỗ); mọi chỗ sao chép/so sánh món đồ (giao dịch, kho) phải giữ nguyên trường này.
- **Thú cưng**: thêm dòng vào `PETS` trong `src/shared/data/pets.js` (`[id, tên, cấp yêu cầu, chỉ số cấp 1, giá lượng (0 = không bán), mã hình, kỹ năng]`, kỹ năng trong `PET_SKILLS`) → vẽ mã hình trong `PET_ART` (`src/client/js/render/petart.js`; icon `{ k: 'pet', s: mã hình }` tự sinh) → `npm run check`. Cấp/EXP/thân mật lưu trên món (`it.plv/pexp/love`), mọi chỗ sao chép món đồ phải giữ các trường này; dữ liệu cũ thiếu trường thì `cleanPet` đưa về cấp 1. Kỹ năng mới: thêm vào `PET_SKILLS` + chạy trong `petTick` (`core/player.js`) + hiệu ứng `onPetAct` (`game/game.js`) + mô tả `petSkillText` (`ui/windows/pet.js`). Thức ăn: dòng `PET_FOOD` + hình trong `PETFOOD_ICONS` (`render/icons/fashion.js`).
- **Giftcode cố định**: thêm vào `GIFTCODES` (`extras.js`): mã 4-20 chữ in hoa/số, `reward { xu, luong, items: [[id, sl]] }`, `until` bắt buộc (`'YYYY-MM-DD'` giờ Việt Nam), `from`/`lv`/`note` tùy chọn → `npm run check`. Mã tạm thời: admin `/code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ] [lượt]`.
- **Sự kiện theo mùa mới**: thêm phần tử vào `SEASONS` (`extras.js`: `id, name, desc, from, until, token, drop { rate, lvGap, boss, event }, exchange [{ id, cost, limit?, reward { xu, luong, items, days } }]`), không trùng thời gian mùa khác → vật phẩm token `type: 'event'` cộng dồn trong `items/consumables.js` với icon `k` riêng (vẽ trong `iconCanvas` của `render/icons.js`, thêm vào `ICON_KINDS` của `tools/check-data.js`) → `npm run check`. Thử trước ngày bằng `/sukien <id>`, xong thì `/sukien auto`.
- **Luật / thưởng lôi đài**: chỉ sửa `ARENA` (`extras.js`): `minLv`, `elo`, `k`, `match { base, grow, growEvery, max }`, `countdown`, `dur`, `pairDaily`, `daily`, `win/lose/draw { xu, fame }`, `weeklyMin`, `weeklyWin`, `dodgeLock`, `weekly [{ to, luong, xu, items }]` (`to` tăng dần, hạng thấp không nhiều lượng hơn hạng cao) → `npm run check` → cập nhật bảng mục 9 của `DESIGN_RULES.md`. Thử thưởng tuần bằng `/arena reward`.
- **Loại NPC mới**: thêm vào `NPC_TYPES` (`maps.js`) → ngoại hình trong `NPCS` (`render/sprites/npc.js`) → nhà trong `SHOP` (`render/map/village.js`) → đăng ký `npcs: { loại: { open(p, n), act(p, n, a, m) } }` trong module của tính năng → `npm run check` (kiểm đủ 3 nơi vẽ).
- **Âm thanh**: bảng gắn ở `src/shared/data/audio.js` (`MUSIC_THEME` theme → nhạc, `MUSIC_SCENE` boss/Tà Thú/lôi đài/phó bản/lễ hội, `SKILL_SFX` kỹ năng → tiếng, mặc định theo `FX_SFX[fx.k]`, `EVENT_SFX` tên `sfx('...')` → file, `BOSS_SFX` chiêu boss). Theme bản đồ hoặc kỹ năng mới phải có dòng tương ứng (`npm run check` báo thiếu). Máy khách: `sfx(tên)`, `skillSfx(sid, k)`, `bossSfx(k)`, `music(id)`, `musicFor(map, scene)` (`core/sound.js`); nhạc tự chọn ở `updateMusic()` (`game/game.js`). File tạo ngoài repo bằng hàng đợi `~/.local/share/ninja-audio/run_queue.py` (chỉ chạy khi máy rảnh), rồi `node tools/sync-audio.js` chép vào `src/client/audio` và ghi `CREDITS.md`.
- **Bậc trang bị mới**: thêm vào `TIER_NAMES/TIER_LV/TIER_COLORS` (`items/base.js`) **và** `TIER_OUTFIT/TIER_METAL/TIER_TRIM` (`render/sprites/color.js`).
- **Phần thưởng / nguồn xu mới**: quà (nhiệm vụ, điểm danh, giftcode, thư, sự kiện đổi quà) trao **xu khóa** (`p.gainXuk`) và vật phẩm **khóa** (`p.addItem(id, q, r, days, 1)` hoặc `bind(it)` từ `src/shared/bound.js`; `giveReward(p, r, { bound: true })` + `rewardLabel(r, true)`). Phí NPC trừ bằng `p.payXu(cost)` (xu khóa trước), kiểm đủ bằng `p.xuAll()` (máy khách: `xuAll()` ở `core/store.js`). Tiền chuyển giữa người chơi (giao dịch, góp gia tộc, chợ) chỉ dùng `p.c.xu`. Mọi tính năng chuyển đồ sang người khác (giao dịch, ký gửi, thư người chơi, thả đất) **phải** lọc bằng `canTransfer(it)`. Gộp chồng vật phẩm phải dùng `sameStack(it, id, b)`; tiêu hao dùng `p.removeItem` (tự trừ chồng khóa trước) hoặc `p.removeItemB` khi cần biết số món khóa đã trừ. Thưởng kiểu sự kiện/phó bản/PvP (Tà Thú, hang động, lôi đài) và xu/đồ rơi từ quái vẫn là **thường**.
- **Hệ thống cộng chỉ số mới** (ngọc, thời trang, thú...): cập nhật hồ sơ "người chơi trung bình" trong `tools/balance.js` và dòng "Mốc cân bằng" ở `DESIGN_RULES.md`, chạy `npm run check`.

## Git

- Commit message **tiếng Việt**: dòng đầu tóm tắt, thân giải thích nếu cần.
- Chỉ commit khi `npm test` đạt và client không có lỗi console. Không commit file đang làm dở của agent khác.
- Đẩy lên nhánh `main` của `danhtrongit/Ninja-School` (`git push -u origin main`).
- **Không** commit thư mục `data/`, `node_modules/`, ảnh chụp kiểm tra hay file tạm.
