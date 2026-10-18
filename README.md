# Ninja School - Pixel Online

Game nhập vai ninja 2D đồ họa pixel, **chơi online nhiều người ngay trên trình duyệt** (PC và điện thoại), lấy cảm hứng từ dòng game ninja học đường trên di động.

Toàn bộ đồ họa pixel được **vẽ bằng code**, không dùng hình ảnh hay tài nguyên của bất kỳ game nào khác. Dự án không liên quan đến TeaMobi hay bất kỳ nhà phát hành nào.

## Tính năng

| Hệ thống | Chi tiết |
|---|---|
| Tài khoản | Đăng ký / đăng nhập (mật khẩu băm scrypt), tự đăng nhập lại bằng token, tối đa 3 nhân vật mỗi tài khoản |
| 6 phái - 3 hệ | Kiếm, Tiêu (Hỏa) · Kunai, Cung (Thủy) · Đao, Quạt (Phong). Hỏa khắc Phong, Phong khắc Thủy, Thủy khắc Hỏa |
| Kỹ năng | Mỗi phái 1 đòn thường + 5 kỹ năng (đơn mục tiêu, diện rộng, xuyên thẳng, lướt chém, buff, hồi máu) + 1 tuyệt kỹ cấp 60, nâng tới cấp 15, thanh phím 1-6 |
| Kỹ năng nội tại | Mỗi phái 3 nội tại (cấp 15, 35, 50) luôn có hiệu lực: % sinh lực, % tấn công/phòng thủ, chí mạng, sát thương chí mạng, % né, % sát thương kỹ năng, kháng hệ khắc, hồi chakra mỗi giây, % tốc chạy. Học cấp 1 bằng Sách kỹ năng (bán ở Tiệm Thuốc bằng lượng, rơi từ boss), nâng bằng điểm kỹ năng |
| Nhân vật | Cấp 1-120, điểm tiềm năng (Sức mạnh, Thân pháp, Chakra, Thể lực), tẩy điểm |
| Thế giới | 23 bản đồ: 3 làng, 19 bãi luyện công (cấp 1-120, có 3 nhánh phụ vào qua cửa bí mật), Đấu Trường PK tự do; thêm 2 phó bản (Hang Động Thử Thách, phòng Lôi Đài); 23 chủ đề cảnh vẽ riêng; bục nhảy, nhảy đôi, cổng dịch chuyển; bản đồ thế giới dạng tranh cuộn, tự tìm đường tới bản đồ, NPC hay mục tiêu nhiệm vụ |
| Quái & Boss | 51 loại quái với AI tuần tra/đuổi đánh/đánh xa, 11 boss thế giới hồi sinh định kỳ (Vua Slime → Long Vương cấp 125) có 2-3 chiêu báo trước vùng đánh và cuồng nộ dưới 30% máu, 3 Tà Thú sự kiện; thông báo toàn server, chia thưởng theo sát thương |
| Trang bị | 9 ô trang bị + ô thú cưng + 4 ô thời trang, 12 bậc (Gỗ → Thần → Tiên → Thánh), 5 độ hiếm với dòng chỉ số ngẫu nhiên, rơi đồ có chủ sở hữu |
| Cường hóa | +1 đến +16 tại Thợ Rèn, đá cường hóa 4 cấp (Sơ, Trung, Cao, Thần), tỉ lệ thành công giảm dần, Bùa Bảo Hộ chống tụt cấp |
| Khảm ngọc | 6 loại ngọc × 10 cấp: Hỏa Tâm (+tấn công), Thủy Linh (+sinh lực), Thổ Giáp (+phòng thủ), Phong Ảnh (+% né), Lôi Quang (+% chí mạng), Huyết Hồn (+% hút máu). Trang bị chiến đấu có 1-3 lỗ khảm theo bậc (Gỗ-Sắt 1, Bạc-Huyền 2, Long trở lên 3), mỗi món chỉ khảm 1 viên mỗi loại. Tại Thợ Rèn: khảm (bấm hoặc kéo ngọc vào lỗ tròn), gỡ (tốn xu, ngọc về hành trang), ghép 3 viên cùng cấp thành 1 viên cấp trên (tỉ lệ giảm dần, thất bại mất 1 viên). Ngọc cấp 1 bán ở Lò Rèn, quái thường thỉnh thoảng rơi cấp 1-2, boss luôn rơi 1 viên cấp 2-5. Ngọc đi theo món khi giao dịch, cất kho, bán |
| Thú cưng & đồ ăn | 6 thú cưng vẽ pixel bay/chạy theo chủ (người khác cũng thấy), cấp 1-50: nhận một phần EXP khi chủ diệt quái, chỉ số tăng theo cấp; độ thân mật (dưới 20 thú dỗi); kỹ năng tự động Tha Đồ (nhặt đồ) và Hồi Xuân (hồi máu). Cho ăn Bánh Gạo / Cá Khô / Linh Thú Đan (Tiệm Thuốc, tab Thú cưng) để tăng EXP và thân mật. Cửa sổ Thú cưng (phím K). Rồng Con rơi từ Long Vương · Đồ ăn buff 30 phút (+10% tấn công/phòng thủ/sinh lực) |
| Thời trang & thú cưỡi | 4 ô riêng (tab "Thời trang" trong Hành Trang): 3 mặt nạ, 4 áo choàng bay theo bước chạy, 4 bộ trang phục đổi màu và hoa văn áo quần, 5 thú cưỡi (Ngựa Hồng Tông, Sói Ngân Nguyệt, Hạc Tiên Vân Du, Bạch Hổ Sơn Quân, Kỳ Lân Hỏa Vân) cộng 15-35% tốc chạy ngoài giới hạn của trang bị. Chỉ số nhỏ (+% EXP, +% sinh lực, công). Bán bằng lượng ở Tiệm Thuốc (vĩnh viễn); Rương Báu và Vòng Quay có thể ra đồ 7 ngày (món Huyền thoại chỉ có từ đây), hết hạn tự biến mất, không giao dịch được |
| Sự kiện | Giờ Vàng nhân đôi EXP toàn máy chủ 12h-13h và 20h-22h (giờ Việt Nam) · Sự kiện Tà Thú mỗi 2 giờ · **Lễ hội theo mùa**: Lễ Hội Trăng Rằm (25/09 - 08/11) quái rơi Bánh Trung Thu, boss rơi nhiều hơn; đổi bánh lấy xu, bình thuốc, Bí Kíp, đá, rương, lượng, ngọc, thời trang và thú cưỡi 15 ngày ở Sứ Giả Lễ Hội trong mỗi làng (giới hạn lượt cả mùa). Biểu ngữ lễ hội dưới khối nhiệm vụ |
| Hộp thư & Giftcode | Hộp thư hệ thống (phím L, chấm đỏ khi có thư mới): tối đa 30 thư, tự xóa sau 30 ngày, đính kèm xu, lượng, vật phẩm; nhận từng thư hoặc nhận tất cả (kiểm tra đủ chỗ trong hành trang). Người offline vẫn nhận được. Quà Ban Quản Trị, quà giftcode và thưởng Tà Thú khi hành trang đầy đều gửi qua thư. Nhập mã quà tặng ở Cài đặt hoặc Hộp thư: mỗi tài khoản dùng mỗi mã 1 lần (xóa nhân vật tạo lại cũng không nhập lại được), nhập sai 5 lần trong 1 phút thì tạm khóa |
| NPC | Trưởng Làng (nhiệm vụ chính), Bà Thuốc, Thợ Rèn, Tiểu Nhị (nhiệm vụ hằng ngày), Phu Xe (dịch chuyển), Lão Gia Tộc, Thủ Kho, Hộ Pháp (hang động), Sứ Giả Lễ Hội (đổi quà sự kiện) |
| Nhiệm vụ | 51 nhiệm vụ chính từ cấp 1 đến 120 (diệt quái, thu thập, săn boss, khám phá bản đồ, cường hóa, vượt hang động, đạt cấp) + 20 nhiệm vụ diệt quái mỗi ngày |
| Xã hội | Chat bản đồ (bong bóng trên đầu), thế giới, nhóm, gia tộc, nhắn riêng · Nhóm 6 người chia EXP · Gia tộc 10 cấp (góp quỹ xu, tới 70 thành viên, +% EXP cho cả tộc), tộc trưởng/trưởng lão · Giao dịch an toàn (khóa + xác nhận 2 bên) |
| PvP | Thách đấu 1-1, chế độ PK (điểm hiếu chiến, phạt EXP), Đấu Trường. **Lôi đài xếp hạng** (từ cấp 20, đăng ký ở Võ Sư Thiết Quyền trong Đấu Trường hoặc tab Lôi đài của Bảng Xếp Hạng): ghép cặp theo điểm Elo (biên nới dần khi chờ lâu), mỗi trận một phòng đấu riêng, đếm ngược 5 giây, đấu 3 phút, hồi đầy sinh lực/chakra, cấm bình thuốc; hạ gục thì thắng, hết giờ so % sinh lực (theo sinh lực tối đa lúc vào đấu), rời trận hay mất kết nối tính thua; bỏ trận khi chưa ai ra đòn thì trận không tính và người bỏ chờ 60 giây mới đăng ký lại. Thưởng mỗi trận xu + danh vọng, thưởng tuần theo hạng gửi qua hộp thư (0 giờ thứ Hai; cần ≥ 3 trận, thắng ≥ 1 và điểm ≥ 1.000). Auto đánh và tự tìm đường không bao giờ nhắm người chơi khác ngoài trận lôi đài |
| Hang Động Thử Thách | Phó bản riêng cho từng nhóm: 5 đợt quái + boss trong 10 phút, quái mạnh theo cấp trung bình nhóm, 3 lượt/ngày, thưởng EXP, xu, Rương Báu, đá cường hóa |
| Thủ Kho | 60 ô cất đồ, dùng chung ở mọi làng |
| Bạn bè | Kết bạn, xem online/offline, nhắn tin, mời nhóm nhanh, thông báo khi bạn bè online |
| Điểm danh & Vòng quay | Quà điểm danh 7 ngày liên tục · Vòng quay may mắn bằng xu hoặc lượng |
| Tiện ích | Tự động đánh (tự tìm quái, dùng kỹ năng, uống thuốc, nhặt đồ), bảng xếp hạng, bản đồ thu nhỏ, điều khiển cảm ứng, âm thanh tổng hợp bằng WebAudio · Ngày/đêm theo giờ Việt Nam và rung màn hình (chỉnh trong Cài đặt) |
| Tiền tệ | Xu (đánh quái, nhiệm vụ) và Lượng (boss, nhiệm vụ hằng ngày) mua Bí Kíp x2 EXP, Bùa Bảo Hộ, Thẻ Hồi Sinh, Sách kỹ năng nội tại, thời trang và thú cưỡi |

## Chạy trên máy

Cần Node.js 18 trở lên.

```bash
npm install
npm start
```

Sau đó mở http://localhost:3000. Muốn chơi cùng bạn bè trong mạng LAN thì mở `http://<IP-máy-bạn>:3000`.

Biến môi trường:

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `PORT` | Cổng HTTP / WebSocket | `3000` |
| `DATA_DIR` | Thư mục lưu dữ liệu (JSON) | `./data` |
| `ADMINS` | Danh sách **tên tài khoản** admin, cách nhau bởi dấu phẩy | (trống) |
| `MOTD` | Thông báo hiện khi người chơi vào game | (trống) |
| `TATHU` | `0` để tắt lịch tự động của sự kiện Tà Thú (lệnh admin `/event` vẫn dùng được) | bật |
| `SEASON` | `0` để tắt lịch lễ hội theo mùa (lệnh admin `/sukien` vẫn ép bật được) | bật |
| `TRUST_PROXY` | Số proxy đứng trước server. Chỉ khi đó mới đọc IP người chơi từ `X-Forwarded-For` (đếm từ cuối, vì phần đầu máy khách tự ghi được). `auto`: tin 1 proxy khi kết nối tới từ loopback/mạng nội bộ (Caddy, Nginx cùng máy, Render); `0`: luôn dùng IP của kết nối | `auto` |
| `REG_LIMIT` | Số tài khoản tạo mới tối đa mỗi IP mỗi giờ (`0` = không giới hạn; kết nối loopback không tính) | `10` |

Kiểm thử tự động (bật server tạm và cho 2 bot chơi thử qua WebSocket) và kiểm tra chéo dữ liệu game:

```bash
npm test
npm run check
npm run test:ui    # giao diện 2 người chơi thật (cần Playwright, server chạy với ADMINS=duoalpha,duobravo)
npm run test:e2e   # tìm đường, bản đồ thế giới, hệ thống mới (cần Playwright, BASE_URL + ACC là tài khoản admin)
npm run test:perf  # đo khung hình trên bản đồ đông quái (cần Playwright, BASE_URL + ACC là tài khoản admin)
```

Khi phát triển thêm, xem **[DESIGN_RULES.md](DESIGN_RULES.md)** (quy chuẩn đồ họa, giao diện, cân bằng) và **[CLAUDE.md](CLAUDE.md)** (quy tắc làm việc cho người và agent AI).

## Đưa game lên mạng (online)

**Hướng dẫn chi tiết từng bước (Render, VPS + Docker + HTTPS, sao lưu, xử lý sự cố): xem [DEPLOY.md](DEPLOY.md).**

Server là một tiến trình Node.js duy nhất phục vụ cả web lẫn WebSocket, nên chạy được trên mọi host hỗ trợ Node hoặc Docker. Dữ liệu người chơi nằm trong `DATA_DIR`, vì vậy cần **ổ đĩa lưu trữ bền vững**.

**Render.com**: bấm nút dưới (hoặc *New → Blueprint* rồi chọn repo này). File `render.yaml` đã cấu hình sẵn web service, ổ đĩa `/var/data` và health check.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/danhtrongit/ninja-school)

> Gói miễn phí của Render không có ổ đĩa bền vững, dữ liệu sẽ mất mỗi lần server khởi động lại. Muốn giữ tài khoản người chơi thì dùng gói có disk (như cấu hình sẵn) hoặc một VPS.

**Docker có sẵn (không cần build)**: mỗi lần push lên `main`, GitHub Actions tự kiểm thử rồi đẩy image lên GitHub Container Registry.

```bash
docker run -d --name ninja --restart unless-stopped -p 80:3000 -v ninja-data:/data -e ADMINS=tentaikhoan ghcr.io/danhtrongit/ninja-school:latest
```

> Lần đầu, vào GitHub → Packages → `ninja-school` → Package settings, đặt **Public** để máy chủ kéo image không cần đăng nhập (hoặc `docker login ghcr.io`).

**Docker tự build / VPS**:

```bash
docker build -t ninja-school .
docker run -d --name ninja -p 80:3000 -v ninja-data:/data -e ADMINS=tentaikhoan ninja-school
```

**Railway / Fly.io / máy chủ riêng**: dùng `Dockerfile`, hoặc chạy `npm install && npm start`. Nhớ gắn volume cho `DATA_DIR`.

Nếu đặt sau Nginx, cần bật nâng cấp WebSocket cho đường dẫn `/ws`:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $remote_addr;
}
```

## Điều khiển

| Phím | Chức năng |
|---|---|
| A/D hoặc ←/→ | Di chuyển |
| W / ↑ / Space | Nhảy (nhấn lần 2 trên không để nhảy đôi), vào cửa |
| S + Space | Xuống khỏi bục |
| J | Đánh thường |
| 1 - 6 | Kỹ năng trên thanh |
| Q / E | Uống bình HP / MP |
| X | Nói chuyện NPC, vào cửa, nhặt đồ |
| Z | Nhặt đồ |
| Tab | Đổi mục tiêu |
| F | Bật/tắt tự động đánh |
| B, C, V, N, P, O, G, R, M | Túi đồ, Nhân vật, Kỹ năng, Nhiệm vụ, Nhóm, Bạn bè, Gia tộc, Xếp hạng, Bản đồ |
| K, L | Thú cưng, Hộp thư |
| Enter | Chat |

Bấm vào NPC để nói chuyện, bấm vào quái để chọn mục tiêu, bấm vào người chơi để mời nhóm, giao dịch, thách đấu, nhắn tin, xem thông tin.

Lệnh chat: `/w tên tin` (nhắn riêng), `/p` (nhóm), `/g` (gia tộc), `/a` (thế giới), `/moi tên`, `/gd tên`, `/td tên`, `/xem tên`, `/online`, `/help`.
Lệnh admin: `/lv n`, `/item id sl [độ hiếm] [số ngày hạn]`, `/hethan [giây]` (mọi đồ có hạn trên người hết hạn sau n giây, để thử), `/plus n` (cường hóa vũ khí), `/thu cấp [thân mật]` (cấp và thân mật thú đang mang), `/xu n`, `/luong n`, `/tp map`, `/boss`, `/bosshp %` (đặt máu boss trên bản đồ đang đứng, để thử cuồng nộ), `/event tathu [boss] [bản đồ]` (gọi Tà Thú ngay), `/event stop`, `/all tin`, `/kick tên`, `/mail <tên|all> <xu> <lượng> [vật phẩm] [sl] [ngày]` (gửi thư quà, người offline nhận khi vào game), `/code <MÃ> <xu> <lượng> [vật phẩm] [sl] [giờ=24] [lượt]` (tạo giftcode tạm), `/code` (danh sách), `/code xoa <MÃ>`, `/sukien <mã mùa|tat|auto>` (ép bật/tắt lễ hội để thử), `/arena` (xem hàng chờ lôi đài), `/arena reward` (trao thưởng lôi đài tuần ngay), `/arena elo n` (đặt điểm lôi đài của mình).

Giftcode cố định, lịch lễ hội và luật/thưởng lôi đài nằm trong `src/shared/data/extras.js` (`GIFTCODES`, `SEASONS`, `ARENA`).

### Chiêu boss và sự kiện Tà Thú

- Mỗi boss có 2-3 chiêu đặc biệt: **Địa Chấn** (vòng hoặc dải đất), **Gầm** (làm chậm), **Triệu Hồi** (gọi quái con), **Tia/Cột** (dải thẳng hoặc nhiều cột từ trời), **Bộc Phát** (vòng lớn). Trước khi tung chiêu, vùng nguy hiểm hiện màu đỏ trên mặt đất kèm tên chiêu và thanh niệm ở khung mục tiêu: chạy ra khỏi vùng là né được. Dưới 30% máu boss **nổi cuồng nộ**: niệm và ra chiêu nhanh hơn, chạy nhanh hơn, có quầng lửa đỏ.
- **Tà Thú Xuất Thế**: mỗi 2 giờ (0h, 2h, ..., 22h giờ Việt Nam) phút 30, một trong 3 Tà Thú (Hắc Viêm cấp 32, Băng Phách cấp 60, Huyết Nguyệt cấp 95) xuất hiện ở một bãi luyện công hợp cấp, báo trước 5 phút, tồn tại 20 phút. Biểu ngữ dưới màn hình đếm ngược, bấm vào để tự tìm đường tới; bản đồ thế giới đánh dấu nơi Tà Thú đang ở. Khi Tà Thú bị hạ, mọi người nhận bảng sát thương; thưởng theo hạng (top 1: 30 lượng, xu, 3 rương, sách nội tại đúng phái; top 2-3: lượng, xu, rương, đá cường hóa; top 10: lượng, xu, rương; ai gây từ 1% máu: lượng và xu). Hành trang đầy thì đồ thưởng được gửi vào hộp thư (hộp thư đầy quà thì vào thủ kho; kho cũng đầy thì server giữ hộ và tự trả khi hành trang có chỗ).

## Cấu trúc mã nguồn

```
src/
  server/                 Node.js (CommonJS)
    index.js              Đọc cấu hình, tạo DB + World, nối HTTP và WebSocket
    core/                 Engine dùng chung
      world.js            Vòng lặp 20 tick/giây, vào/ra bản đồ, xếp hạng
      map.js, monster.js  Bản đồ (người chơi, quái, đồ rơi, đồng bộ trạng thái), AI quái & boss
      combat.js           Kỹ năng, sát thương, ngũ hành, rơi đồ, chết/hồi sinh
      player.js           Nhân vật, chỉ số (recalc), túi đồ, kinh nghiệm, thú cưng
      router.js           Bảng hành động: gói { t } của máy khách → handler của module
      modules.js          Nạp module, điểm móc (hook) giữa lõi và module, NPC theo loại
      gateway.js          Sảnh đăng nhập / tạo nhân vật và kết nối WebSocket
      gamedata.js         Gói 'data' (dữ liệu tĩnh gửi máy khách)
      npc.js, util.js     nearNpc/dialog; int, clean, own
    services/             db.js (lưu JSON nguyên tử), http.js (phục vụ src/client), reward.js (trao thưởng)
    modules/<tên>/        Mỗi tính năng một thư mục (index.js): movement, inventory, buffs, skills, fashion,
                          pets, npc, quest, shop, smith, gems, storage, checkin, wheel, invites, chat, admin,
                          friends, party, pk, trade, clan, rank, dungeon, events, season, mail, arena
  shared/                 CommonJS, server và tools dùng (máy khách nhận qua gói 'data')
    constants.js          MAX_LEVEL, INV_SIZE, STORAGE_SIZE, HOTBAR...
    formulas.js           expNeed, vnDay
    data/                 classes, skills, monsters, maps, quests, extras, pets, items/ (base, equipment,
                          consumables, pets, fashion, books, gems, shops)
  client/                 Thư mục tĩnh (ES module, không build)
    index.html, manifest.webmanifest, favicon.svg, fonts/ (VT323, OFL)
    css/                  style, hud, windows, features, touch, worldmap, screens, fonts
    js/
      main.js             Màn hình đăng nhập / chọn nhân vật, khởi động game
      core/               net.js (WebSocket), store.js (trạng thái + S.G), input.js, sound.js
      game/               game.js (vật lý, dự đoán, chiến đấu, tự đánh, vẽ), pathfind.js (tìm đường)
      render/             File vào giữ API công khai, phần thân tách trong thư mục con:
                          sprites.js + sprites/ (ninja, NPC, thời trang, thú cưỡi), monsterart.js + monster/,
                          maprender.js + map/ (23 chủ đề, ngày/đêm), fx.js + fx/, icons.js + icons/,
                          petart.js (thú cưng), titleart.js (màn hình mở đầu)
      ui/                 ui.js (HUD, khung cửa sổ, chat), dom.js (h, $), common.js, worldmap.js,
                          windows/<cửa sổ>.js (túi đồ, kỹ năng, rèn, thư, lôi đài...)
tests/
  smoke.js                npm test: bộ chạy (server tạm + bot WebSocket), gọi lần lượt các phần
  lib/                    harness.js (ok, server tạm), bot.js (bot WebSocket), helpers.js
  features/<tính năng>.js Kiểm thử từng tính năng (công thức + kịch bản WebSocket)
  e2e/                    Trình duyệt thật (Playwright): e2e.js, perf.js, ui-multiplayer.js
tools/                    check-data.js (npm run check), shot.js (chụp ảnh giao diện)
```

Server quyết định mọi kết quả (sát thương, rơi đồ, giao dịch, tiền tệ). Client chỉ gửi ý định hành động, server kiểm tra tầm đánh, hồi chiêu, chakra, tốc độ di chuyển, độ cao nhảy (không lơ lửng được trên không) và khoảng cách NPC.
