# Ninja School - Pixel Online

Game nhập vai ninja 2D đồ họa pixel, **chơi online nhiều người ngay trên trình duyệt** (PC và điện thoại), lấy cảm hứng từ dòng game ninja học đường trên di động.

Toàn bộ đồ họa pixel được **vẽ bằng code**, không dùng hình ảnh hay tài nguyên của bất kỳ game nào khác. Dự án không liên quan đến TeaMobi hay bất kỳ nhà phát hành nào.

## Tính năng

| Hệ thống | Chi tiết |
|---|---|
| Tài khoản | Đăng ký / đăng nhập (mật khẩu băm scrypt), tự đăng nhập lại bằng token, tối đa 3 nhân vật mỗi tài khoản |
| 6 phái - 3 hệ | Kiếm, Tiêu (Hỏa) · Kunai, Cung (Thủy) · Đao, Quạt (Phong). Hỏa khắc Phong, Phong khắc Thủy, Thủy khắc Hỏa |
| Kỹ năng | Mỗi phái 1 đòn thường + 5 kỹ năng (đơn mục tiêu, diện rộng, xuyên thẳng, lướt chém, buff, hồi máu) + 1 tuyệt kỹ cấp 60, nâng tới cấp 15, thanh phím 1-6 |
| Nhân vật | Cấp 1-120, điểm tiềm năng (Sức mạnh, Thân pháp, Chakra, Thể lực), tẩy điểm |
| Thế giới | 23 bản đồ: 3 làng, 19 bãi luyện công (cấp 1-120, có 3 nhánh phụ vào qua cửa bí mật), Đấu Trường PK tự do; bục nhảy, nhảy đôi, cổng dịch chuyển |
| Quái & Boss | 51 loại quái với AI tuần tra/đuổi đánh/đánh xa, 11 boss thế giới hồi sinh định kỳ (Vua Slime → Long Vương cấp 125), thông báo toàn server, chia thưởng theo sát thương |
| Trang bị | 9 ô trang bị + ô thú cưng, 12 bậc (Gỗ → Thần → Tiên → Thánh), 5 độ hiếm với dòng chỉ số ngẫu nhiên, rơi đồ có chủ sở hữu |
| Cường hóa | +1 đến +16 tại Thợ Rèn, đá cường hóa 4 cấp (Sơ, Trung, Cao, Thần), tỉ lệ thành công giảm dần, Bùa Bảo Hộ chống tụt cấp |
| Thú cưng & đồ ăn | 6 thú cưng đi theo chủ, tăng % EXP và chỉ số (Rồng Con rơi từ Long Vương) · Đồ ăn buff 30 phút (+10% tấn công/phòng thủ/sinh lực) |
| Sự kiện | Giờ Vàng nhân đôi EXP toàn máy chủ 12h-13h và 20h-22h (giờ Việt Nam) |
| NPC | Trưởng Làng (nhiệm vụ chính), Bà Thuốc, Thợ Rèn, Tiểu Nhị (nhiệm vụ hằng ngày), Phu Xe (dịch chuyển), Lão Gia Tộc, Thủ Kho, Hộ Pháp (hang động) |
| Nhiệm vụ | 51 nhiệm vụ chính từ cấp 1 đến 120 (diệt quái, thu thập, săn boss, khám phá bản đồ, cường hóa, vượt hang động, đạt cấp) + 20 nhiệm vụ diệt quái mỗi ngày |
| Xã hội | Chat bản đồ (bong bóng trên đầu), thế giới, nhóm, gia tộc, nhắn riêng · Nhóm 6 người chia EXP · Gia tộc 10 cấp (góp quỹ xu, tới 70 thành viên, +% EXP cho cả tộc), tộc trưởng/trưởng lão · Giao dịch an toàn (khóa + xác nhận 2 bên) |
| PvP | Thách đấu 1-1, chế độ PK (điểm hiếu chiến, phạt EXP), Đấu Trường |
| Hang Động Thử Thách | Phó bản riêng cho từng nhóm: 5 đợt quái + boss trong 10 phút, quái mạnh theo cấp trung bình nhóm, 3 lượt/ngày, thưởng EXP, xu, Rương Báu, đá cường hóa |
| Thủ Kho | 60 ô cất đồ, dùng chung ở mọi làng |
| Bạn bè | Kết bạn, xem online/offline, nhắn tin, mời nhóm nhanh, thông báo khi bạn bè online |
| Điểm danh & Vòng quay | Quà điểm danh 7 ngày liên tục · Vòng quay may mắn bằng xu hoặc lượng |
| Tiện ích | Tự động đánh (tự tìm quái, dùng kỹ năng, uống thuốc, nhặt đồ), bảng xếp hạng, bản đồ thu nhỏ, điều khiển cảm ứng, âm thanh tổng hợp bằng WebAudio |
| Tiền tệ | Xu (đánh quái, nhiệm vụ) và Lượng (boss, nhiệm vụ hằng ngày) mua Bí Kíp x2 EXP, Bùa Bảo Hộ, Thẻ Hồi Sinh |

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

Kiểm thử tự động (bật server tạm và cho 2 bot chơi thử qua WebSocket) và kiểm tra chéo dữ liệu game:

```bash
npm test
npm run check
npm run test:ui    # giao diện 2 người chơi thật (cần Playwright, server chạy với ADMINS=duoalpha,duobravo)
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
| Enter | Chat |

Bấm vào NPC để nói chuyện, bấm vào quái để chọn mục tiêu, bấm vào người chơi để mời nhóm, giao dịch, thách đấu, nhắn tin, xem thông tin.

Lệnh chat: `/w tên tin` (nhắn riêng), `/p` (nhóm), `/g` (gia tộc), `/a` (thế giới), `/moi tên`, `/gd tên`, `/td tên`, `/xem tên`, `/online`, `/help`.
Lệnh admin: `/lv n`, `/item id sl [độ hiếm]`, `/plus n` (cường hóa vũ khí), `/xu n`, `/luong n`, `/tp map`, `/boss`, `/all tin`, `/kick tên`.

## Cấu trúc mã nguồn

```
server/
  index.js          HTTP tĩnh + WebSocket, đăng nhập, tạo nhân vật
  db.js             Lưu trữ JSON (ghi nguyên tử, tự lưu định kỳ)
  data/             Dữ liệu game: phái, kỹ năng, vật phẩm, quái, bản đồ, nhiệm vụ
  game/
    world.js        Vòng lặp 20 tick/giây, vào/ra bản đồ, xếp hạng
    map.js          Bản đồ: người chơi, quái, vật phẩm rơi, đồng bộ trạng thái
    monster.js      AI quái & boss
    combat.js       Kỹ năng, sát thương, ngũ hành, rơi đồ, chết/hồi sinh
    dungeon.js      Phó bản Hang Động Thử Thách (bản sao riêng theo nhóm)
    player.js       Nhân vật, chỉ số, túi đồ, kinh nghiệm
    actions.js      NPC, cửa hàng, cường hóa, nhiệm vụ, thủ kho, điểm danh, vòng quay
    social.js       Chat, nhóm, bạn bè, giao dịch, thách đấu, gia tộc, lệnh admin
public/
  index.html, css/style.css
  js/
    main.js         Màn hình đăng nhập / chọn nhân vật, vòng lặp
    game.js         Vật lý, dự đoán phía client, chiến đấu, tự động đánh, vẽ
    sprites.js      Sprite pixel: ninja, 11 kiểu quái, icon vật phẩm
    maprender.js    17 chủ đề bản đồ, parallax, trang trí, hạt thời tiết
    fx.js           Hiệu ứng kỹ năng, số sát thương
    ui.js           HUD và các cửa sổ
    sound.js        Hiệu ứng âm thanh WebAudio
test/smoke.js       Kiểm thử tự động end-to-end
```

Server quyết định mọi kết quả (sát thương, rơi đồ, giao dịch, tiền tệ). Client chỉ gửi ý định hành động, server kiểm tra tầm đánh, hồi chiêu, chakra, tốc độ di chuyển và khoảng cách NPC.
