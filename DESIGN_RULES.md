# DESIGN RULES - Ninja School Pixel Online

Quy chuẩn thiết kế bắt buộc cho mọi thay đổi về đồ họa, giao diện, hiệu ứng và nội dung game. Mục tiêu: mọi phần do người hay agent nào làm đều trông như của **một** game.

Các con số dưới đây lấy từ code hiện tại. Nếu cần đổi một quy chuẩn, sửa code **và** sửa file này trong cùng một commit.

---

## 0. Nguyên tắc gốc

1. **Phong cách**: game nhập vai ninja 2D di động kiểu Việt Nam cổ điển. Nhân vật chibi đầu to, viền tối, màu bão hòa tươi, bối cảnh làng Nhật Bản (mái ngói cong, đèn lồng, hoa anh đào), giao diện gỗ sơn mài viền vàng đồng.
2. **Bản quyền**: mọi hình ảnh đều tự thiết kế. **Cấm** sao chép, can lại hay tải về sprite, logo, âm thanh của TeaMobi hoặc bất kỳ game nào. Tên NPC, bản đồ, kỹ năng cũng phải tự đặt.
3. **Vẽ bằng code**: không có file ảnh hay âm thanh bên ngoài. Đồ họa dùng `fillRect`, chuỗi pixel art, canvas offscreen, CSS gradient hoặc SVG nội tuyến (`data:`). Âm thanh dùng WebAudio tổng hợp (`public/js/sound.js`).
4. **Nhất quán hơn ấn tượng**: một chi tiết đẹp nhưng lệch phong cách chung thì phải bỏ hoặc sửa cho khớp.

---

## 1. Lưới pixel và hệ tọa độ

| Quy chuẩn | Giá trị |
|---|---|
| Đơn vị thế giới | 1 đơn vị = 1 pixel nghệ thuật |
| Phóng to | Zoom **nguyên** (thường 3-5), `imageSmoothingEnabled = false` |
| Mặt đất | `y = 300`; bản đồ cao `360`; rộng 900-2200 |
| Khung nhìn | khoảng 380-760 × 216-260 pixel nghệ thuật |
| Gốc tọa độ sprite | **giữa chân**: x là tâm, y là đáy (bàn chân chạm đất) |
| Bục nhảy | `[x, y, w]`, một chiều (đứng được từ trên, nhảy xuyên từ dưới) |

- Lớp thế giới (canvas phân giải thấp) **không** dùng khử răng cưa, không vẽ ở tọa độ lẻ: mọi tọa độ phải `Math.round`.
- **Chữ** (tên, số sát thương, bong bóng chat) vẽ trên canvas phân giải cao **sau khi** phóng to, không vẽ chữ trên lớp pixel.
- Kích thước pixel của boss là `Math.round(scale)`, không dùng scale lẻ trên lớp pixel.

---

## 2. Bảng màu và ánh sáng

- **Viền**: mọi sprite nhân vật, quái và icon có viền tối 1px. Màu viền chuẩn `#1d1424` (sprite) và `#120804` (giao diện), **không** dùng đen thuần `#000`.
- **Đổ bóng**: 3 tông (sáng, gốc, tối) sinh từ màu gốc bằng `shade(color, f)` trong `sprites.js`. Ánh sáng chiếu từ **trên-trái**: mặt trên và trái sáng hơn, dưới và phải tối hơn.
- **Ngũ hành** (`ELEMENT_COLORS`):

| Hệ | Màu | Khắc |
|---|---|---|
| Hỏa | `#ff7043` | khắc Phong |
| Thủy | `#42a5f5` | khắc Hỏa |
| Phong | `#7ccd5a` | khắc Thủy |

- **Độ hiếm** (dùng thống nhất cho chữ, viền ô, ánh sáng):

| Bậc | Tên | Màu |
|---|---|---|
| 0 | Thường | `#ffffff` |
| 1 | Tốt | `#5ab4ff` |
| 2 | Hiếm | `#ffd23c` |
| 3 | Sử thi | `#c77dff` |
| 4 | Huyền thoại | `#ff8a3c` |

- **Bậc trang bị** (12 bậc, mỗi bậc 10 cấp): Gỗ, Đồng, Sắt, Bạc, Vàng, Ngọc, Huyền, Long, Thiên, Thần, Tiên, Thánh. Màu kim loại nằm ở `TIER_METAL`, màu áo ở `TIER_OUTFIT`, màu viền ở `TIER_TRIM` trong `sprites.js`; màu icon ở `TIER_COLORS` trong `server/data/items.js`. Thêm bậc mới thì **phải** thêm màu vào cả 4 mảng.

---

## 3. Nhân vật ninja (`public/js/sprites.js`)

- Chiều cao chuẩn `NINJA_H = 28`, rộng 18-20px. Đầu chiếm khoảng 40-45% chiều cao. Mắt to có điểm sáng.
- Kiểu tóc chọn theo băm tên: nam `spiky, neat, topknot, wild`, nữ `long, bun, pony, bob`.
- Băng trán màu hệ, có miếng kim loại màu theo bậc **nón**. Áo theo bậc **áo**, quần theo bậc **quần**, thắt lưng và khăn quàng màu hệ.
- Vũ khí theo phái: kiếm, phi tiêu, kunai, cung, đao, quạt. Cường hóa từ +5 lấp lánh, từ +8 phát sáng, từ +11 có hào quang.
- Số khung hoạt ảnh: `idle 4, walk 6, jump 2, attack 3, dead 1`. Nháy trắng khi trúng đòn (`flash`).
- NPC dùng `drawNinja(..., { npcType })` với ngoại hình riêng từng loại: `elder, potion, smith, task, tele, clan, storage, dungeon`. Thêm loại NPC mới thì phải vẽ ngoại hình mới, không dùng lại ninja thường.
- Mọi tổ hợp (kiểu, khung, hướng, look, palette) chỉ vẽ **một lần** vào canvas offscreen rồi dùng lại.

---

## 4. Quái vật và boss (`public/js/monsterart.js`)

- 11 kiểu sprite: `slime, bunny, mushroom, imp, flyer, humanoid, crab, golem, ghost, beast, snowman`. Quái mới **phải** dùng một kiểu có sẵn với bảng màu riêng. Chỉ thêm kiểu mới khi không kiểu nào phù hợp.
- Bảng màu quái `pal = [chính, phụ, nhấn]`; mọi tông sáng tối đều sinh từ 3 màu này.
- Hình vẽ có thể lớn hơn hitbox server tối đa khoảng 1.5 lần. Hitbox (rộng × cao ở scale 1):

| Kiểu | Hitbox | Kiểu | Hitbox |
|---|---|---|---|
| slime | 16×12 | crab | 20×12 |
| bunny | 14×14 | golem | 20×26 |
| mushroom | 14×16 | ghost | 16×20 |
| imp | 14×18 | beast | 24×14 |
| flyer | 18×12 | snowman | 16×22 |
| humanoid | 12×22 | | |

- Mỗi kiểu có 3-4 khung đứng/đi và 1-2 khung tấn công (`st = 2`). `flyer` và `ghost` lơ lửng.
- **Boss**: pixel size `Math.round(scale)`, có hào quang động, mắt phát sáng, vương miện hoặc sừng.
- `monsterHeight(def)` phải khớp với hình vẽ, vì nhãn tên và thanh máu đặt theo giá trị này.
- Mặt quái dễ thương (mắt to có điểm sáng, má hồng ở quái cấp thấp). Quái cấp cao hung dữ hơn nhưng vẫn cùng phong cách.

---

## 5. Bản đồ (`public/js/maprender.js`)

- Mỗi bản đồ có một `theme` trong `THEMES`. Bản đồ mới **ưu tiên dùng lại** chủ đề có sẵn: `village_fire, village_water, village_wind, grass_fire, lake, grass_wind, bamboo, beach, cave, desert, mist, snow, ice, dark_forest, lava, hell, arena`.
- Thứ tự lớp: trời (dải màu dither, mặt trời/trăng/sao, mây), núi xa, đồi tầm trung, hàng cây gần, địa hình, cổng, NPC, vật phẩm, quái, người chơi, hiệu ứng, hạt thời tiết, lớp phủ ánh sáng.
- Parallax được prerender thành **dải lặp**. Địa hình tĩnh prerender **một lần** khi tạo `MapRenderer`.
- Mặt đất có mép cỏ (hoặc tuyết, cát, đá), lớp đất có sỏi và rễ, tối dần theo độ sâu, vách đá ở hai đầu bản đồ.
- Làng: nhà mái ngói cong, cửa shoji sáng ấm, đèn lồng có quầng sáng. Màu chủ đạo: Hỏa đỏ cam, Thủy xanh lam, Phong xanh lục.
- **Cổng**: cổng ở mép bản đồ là cột sáng kèm biển chỉ hướng; cổng `door` ở giữa bản đồ là cổng đá hoặc torii có xoáy năng lượng.
- Không đặt trang trí che NPC (cách NPC ít nhất 26px) hoặc che cổng (cách cổng ít nhất 70px).

---

## 6. Hiệu ứng kỹ năng (`public/js/fx.js`)

- Hiệu ứng theo `skill.fx.k`: `slash, proj, burst, wave, rain, meteor, whirl, aura, heal, dash`. Đạn (`p`): `shuriken, arrow, kunai, wind, fire, water, ice`.
- Bảng màu theo hệ `EP`:
  - **fire**: lửa và tàn lửa (`#fff59d → #ff7043`), có khói.
  - **water / ice**: bọt nước, giọt nước, vòng sóng.
  - **wind**: lá cây và vệt gió (`#7cb342 … #c5e1a5`).
- Ánh sáng dùng `globalCompositeOperation = 'lighter'`. Giới hạn `MAX_PARTS = 900` hạt và `MAX_TEXTS = 70` chữ. Không tạo gradient mới cho từng hạt.
- Thời lượng: chém 0.2s, đạn 0.22-0.3s, nổ 0.35-0.45s, lốc xoáy 0.7s, lên cấp 1.4s.
- **Số trên màn hình** (font VT323, viền `#1a1020`):

| Loại | Màu |
|---|---|
| Đòn của mình | `#ffffff` |
| Chí mạng | `#ffeb3b`, to hơn, có dấu `!` |
| Mình bị đánh | `#ff5252` |
| Đòn người khác | `#ffcc80` |
| Hồi máu | `#69f0ae`, có dấu `+` |
| EXP | `#b3e5fc` |
| Xu | `#ffd54f` |
| Né | `#b0bec5`, chữ "Né" |

---

## 7. Icon (`public/js/icons.js`)

| Loại | Kích thước gốc | Hiển thị |
|---|---|---|
| Vật phẩm `iconURL(icon, rarity)` | 16×16 | 32-48px trong ô; khoảng 12px trên mặt đất |
| Kỹ năng `skillIconURL(sk, sid, elColor)` | 24×24 | 32-48px |
| Giao diện `uiIconURL(name)` | 16×16, nền trong suốt | 16-32px |

- Mỗi vật phẩm có `icon: { k, c, s? }`. `k` là hình dạng (`sword, blade, kunai, shuriken, bow, fan, hat, armor, gloves, pants, shoes, necklace, ring, amulet, potion, scroll, book, stone, charm, chest, card, material, food, pet, xu`), `c` là màu theo bậc.
- Thêm `k` mới thì **phải** vẽ hình trong `iconCanvas`. Không để rơi vào ô vuông mặc định.
- Tên icon giao diện: `bag, char, skill, quest, party, friends, clan, rank, map, gift, wheel, settings, auto, pk, chat, talk, pick, target, xu, luong, attack, close`.
- **Không dùng emoji** trong giao diện, vì mỗi máy hiển thị một kiểu.

---

## 8. Giao diện (`public/css/style.css`, `public/css/screens.css`, `public/js/ui.js`)

- **Token màu** (`:root` trong `style.css`):
  - Nền chung: `--ink #120804`, `--text #f8eedb`, `--muted #c2ab8a`.
  - Vàng và sơn mài: `--gold #f0c869`, `--gold2 #b07d33`, `--gold3 #6d4815`, `--lac #8e2414`, `--lac2 #5a140a`.
  - Thanh chỉ số: `--hp`, `--mp`, `--exp`.
  - Tiền: `--xu`, `--luong`.
  - Độ hiếm: `--r1 … --r4`.

  Không viết mã màu mới trực tiếp khi đã có token phù hợp.
- **Khung**: cửa sổ dùng `--frame-win` với nền da thuộc `--leather`. Bảng HUD dùng `--frame-hud`, khung boss dùng `--frame-boss`, tiêu đề dùng dải lụa `--ribbon`. Màn hình mở đầu dùng các token `--sc-*` trong `screens.css`.
- **Font**: VT323, cỡ chữ gốc 20px; chữ nhỏ (`.tiny`) không dưới 15px.
- **Nút**: bấm thì lún xuống 1-2px. Nút chính (`.primary`) màu cam vàng, nút nguy hiểm (`.danger`) màu đỏ sơn mài. Nút kỹ năng **tròn**, hồi chiêu dạng quét tròn kèm số giây.
- **Bố cục HUD cố định**:
  - Trên trái: trạng thái (avatar tròn, huy hiệu cấp, thanh HP/MP/EXP, xu và lượng).
  - Trên giữa: mục tiêu.
  - Trên phải: bản đồ nhỏ, theo dõi nhiệm vụ.
  - Phải: lưới menu.
  - Dưới trái: chat.
  - Dưới phải: cụm kỹ năng 6 ô xếp vòng cung quanh nút đánh thường.
- **Điện thoại** (`body.touch`, `@media (max-height: 520px)`): vùng chạm tối thiểu 44px, không chồng lấn, chat thu gọn mặc định, có D-pad bên trái.
- **Lớp z-index**: canvas 0, màn hình mở đầu 10, HUD 20, hội thoại NPC 45, cửa sổ 50, toast 55, lời mời và popup vật phẩm 60, menu người chơi 70, màn trọng thương 80, mất kết nối 100.
- **Văn phong**: tiếng Việt có dấu đầy đủ. NPC xưng "ta", gọi người chơi là "ngươi". Thông báo hệ thống ngắn gọn, trung tính. Đơn vị tiền ghi "xu" và "lượng". Số có dấu chấm ngăn cách hàng nghìn (`toLocaleString('vi-VN')`).

---

## 9. Thiết kế nội dung và cân bằng (`server/data/*`)

| Hạng mục | Quy chuẩn |
|---|---|
| Cấp | 1-120; EXP cần `20·lv² + 80·lv`; mỗi cấp +5 tiềm năng, +1 điểm kỹ năng |
| Quái thường cấp L | HP `40 + 2L² + 20L`, công `8 + 5L`, thủ `1.5L`, EXP `10 + 8L` |
| Boss | HP ×45, công ×2.2, thủ ×1.6, EXP ×40, hồi sinh 10 phút |
| Trang bị | bậc = ⌊cấp quái / 10⌋; vũ khí công `8 + 6t² + 14t`, áo thủ `5 + 3t² + 8t` |
| Cường hóa | +16 tối đa; mỗi cấp +8% chỉ số gốc; đá Sơ +1~4, Trung +5~8, Cao +9~12, Thần +13~16 |
| Rơi đồ (quái thường) | trang bị 4.5%, đá 3.5%, bình 6%, rương 0.4%; độ hiếm 60/28/10/2% |
| Kỹ năng | 6 kỹ năng + 1 đòn thường mỗi phái, tối đa cấp 15, cấp L cần nhân vật đạt `req + 3·(L-1)` |
| Bản đồ | mỗi bãi luyện công có 3 loại quái, chênh nhau 2-3 cấp, xếp từ cấp thấp (trái) đến cấp cao (phải) |

**Quy tắc đặt tên:**
- Kỹ năng, bản đồ, boss: Hán-Việt hoặc thuần Việt giàu hình ảnh (Hỏa Long Thần Kiếm, Thung Lũng Sương).
- Trang bị: "Loại + Bậc" (Kiếm Bạc, Áo Thánh).
- Vật phẩm nhiệm vụ: danh từ cụ thể (Vảy Rồng, Lông Lôi Điểu).

**Nhiệm vụ chính:**
- Xếp theo `req` tăng dần.
- Loại nhiệm vụ: `talk, kill, collect, level, visit, upgrade, dungeon`.
- Mỗi nhiệm vụ phải nói rõ **địa điểm**.
- Phần thưởng theo hệ số `expNeed(req)`.

**Không phá cân bằng:** đổi công thức hay tỉ lệ rơi phải ghi lý do trong commit và cập nhật bảng trên.

---

## 10. Hiệu năng

- Mục tiêu 60fps trên điện thoại tầm trung. Mỗi khung hình chủ yếu là `drawImage` từ cache, hạn chế `fillRect` lẻ.
- Không cấp phát mảng hay đối tượng lớn trong vòng lặp vẽ. Cache theo khóa chuỗi trong `Map`.
- Server chạy 20 tick/giây, gửi trạng thái 10 lần/giây. Không gửi dữ liệu tĩnh trong gói trạng thái.
