# Hướng dẫn đưa game lên mạng (deploy)

Game là **một tiến trình Node.js** phục vụ cả trang web lẫn WebSocket (`/ws`) trên cùng một cổng. Muốn chạy online chỉ cần hai thứ:

1. Một máy chủ chạy được Node.js 18+ hoặc Docker.
2. Một **ổ đĩa bền vững** cho thư mục dữ liệu (`DATA_DIR`). Tài khoản, nhân vật và gia tộc được lưu ở đây dưới dạng file JSON, kèm bản sao lưu tự động mỗi 6 giờ trong `DATA_DIR/backups`.

| Biến môi trường | Ý nghĩa | Ví dụ |
|---|---|---|
| `PORT` | Cổng lắng nghe | `3000` |
| `DATA_DIR` | Thư mục dữ liệu (phải là ổ bền vững) | `/data` |
| `ADMINS` | Tên **tài khoản** được dùng lệnh admin, cách nhau bởi dấu phẩy | `danhtrong,gm01` |
| `MOTD` | Thông báo hiện khi người chơi vào game | `Chào mừng!` |
| `TRUST_PROXY` | Số proxy đứng trước server (đọc IP thật từ `X-Forwarded-For`). Mặc định `auto` đúng cho Caddy/Nginx/Render; đặt `2` nếu có thêm một tầng (vd Cloudflare → Caddy) | `auto` |
| `REG_LIMIT` | Tài khoản tạo mới tối đa mỗi IP mỗi giờ | `10` |

Ba cách bên dưới xếp từ dễ đến linh hoạt. Chọn **một** cách.

---

## Cách A - Render.com (không cần quản lý máy chủ)

1. Vào https://render.com và đăng nhập bằng GitHub.
2. Bấm **New → Blueprint**, chọn repo `danhtrongit/Ninja-School`.
   Hoặc bấm nút [Deploy to Render](https://render.com/deploy?repo=https://github.com/danhtrongit/Ninja-School) trong README.
3. Render đọc file `render.yaml` có sẵn:
   - Tạo web service Node (gói **Starter**).
   - Gắn ổ đĩa 1GB tại `/var/data` (đã đặt sẵn `DATA_DIR=/var/data`).
   - Kiểm tra sức khỏe tại `/api/status`.
4. Ở ô **ADMINS**, điền tên tài khoản bạn sẽ đăng ký trong game (ví dụ `danhtrong`), rồi bấm **Apply**.
5. Chờ build xong (khoảng 1-3 phút) rồi mở địa chỉ `https://ninja-school-xxxx.onrender.com`.
6. Gắn tên miền riêng (không bắt buộc): **Settings → Custom Domains**, thêm tên miền, tạo bản ghi CNAME theo hướng dẫn. Render tự cấp HTTPS.

> **Lưu ý:** gói **Free** của Render không có ổ đĩa và tự ngủ khi không có người chơi. Mỗi lần khởi động lại, **mọi tài khoản sẽ mất**. Chỉ dùng gói Free để thử nhanh: đổi `plan: free` và xóa khối `disk` trong `render.yaml`.

Mỗi lần bạn push lên nhánh `main`, Render tự deploy lại phiên bản mới. Dữ liệu trên ổ đĩa vẫn được giữ nguyên.

---

## Cách B - VPS có Docker (khuyên dùng, rẻ, toàn quyền)

Dùng được với mọi VPS Linux có Docker (ví dụ Ubuntu 22.04/24.04). Cấu hình nhỏ (1 vCPU, 1GB RAM) là đủ để bắt đầu.

### B1. Cài Docker (một lần)

```bash
curl -fsSL https://get.docker.com | sh
sudo ufw allow 80,443/tcp      # nếu VPS dùng ufw
```

### B2a. Chạy nhanh, không cần tên miền (truy cập bằng `http://IP-VPS`)

Image được GitHub Actions build sẵn và đẩy lên `ghcr.io` sau mỗi lần push, nên không cần build lại:

```bash
docker run -d --name ninja --restart unless-stopped \
  -p 80:3000 \
  -v ninja-data:/data \
  -e ADMINS=tentaikhoan_admin \
  ghcr.io/danhtrongit/ninja-school:latest
```

Mở `http://IP-VPS` là vào được game. Cách này phục vụ qua HTTP/1.1 nên lần đầu mở trang tải ~100 file chậm hơn khi mạng trễ; có tên miền thì nên dùng B2b (Caddy tự bật HTTP/2).

### B2b. Có tên miền + HTTPS tự động (Caddy)

1. Tạo bản ghi **A** cho tên miền (ví dụ `game.tenmien.vn`) trỏ về IP của VPS.
2. Lấy hai file cấu hình mẫu:
   ```bash
   mkdir -p ~/ninja && cd ~/ninja
   curl -fsSLO https://raw.githubusercontent.com/danhtrongit/Ninja-School/main/deploy/docker-compose.yml
   curl -fsSLO https://raw.githubusercontent.com/danhtrongit/Ninja-School/main/deploy/Caddyfile
   ```
3. Sửa `Caddyfile` (thay `game.tenmien.vn`) và dòng `ADMINS=` trong `docker-compose.yml`.
4. Chạy:
   ```bash
   docker compose up -d
   ```
5. Mở `https://game.tenmien.vn`. Caddy tự xin chứng chỉ HTTPS và tự chuyển tiếp WebSocket.

### Cập nhật lên phiên bản mới

```bash
docker pull ghcr.io/danhtrongit/ninja-school:latest
docker compose up -d          # nếu dùng B2b
# hoặc với B2a:
docker rm -f ninja && docker run -d --name ninja --restart unless-stopped -p 80:3000 -v ninja-data:/data -e ADMINS=tentaikhoan_admin ghcr.io/danhtrongit/ninja-school:latest
```

Dữ liệu nằm trong volume `ninja-data` nên không mất khi cập nhật.

### Sao lưu và khôi phục

```bash
# Sao lưu toàn bộ dữ liệu ra file ninja-backup.tgz ở thư mục hiện tại
docker run --rm -v ninja-data:/data -v "$PWD":/b alpine tar czf /b/ninja-backup.tgz -C /data .

# Khôi phục (dừng game trước)
docker stop ninja
docker run --rm -v ninja-data:/data -v "$PWD":/b alpine sh -c "rm -rf /data/* && tar xzf /b/ninja-backup.tgz -C /data"
docker start ninja
```

> Nếu `docker pull` báo `denied`, vào GitHub → **Packages** → `ninja-school` → **Package settings**, đặt **Public**. Hoặc chạy `docker login ghcr.io` bằng tài khoản GitHub.

---

## Cách C - VPS chạy Node trực tiếp (không Docker)

```bash
# Ubuntu: cài Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs git
git clone https://github.com/danhtrongit/Ninja-School.git ~/ninja && cd ~/ninja
npm ci --omit=dev
sudo npm i -g pm2
PORT=3000 DATA_DIR=$HOME/ninja-data ADMINS=tentaikhoan_admin pm2 start npm --name ninja -- start
pm2 save && pm2 startup        # tự chạy lại khi VPS khởi động
```

Đặt sau Nginx: xem cấu hình chuyển tiếp WebSocket trong README (bắt buộc có `Upgrade` và `Connection "upgrade"`), nên bật HTTP/2 (`listen 443 ssl http2;`). Cập nhật bằng `git pull && npm ci --omit=dev && pm2 restart ninja`.

> **Máy cài theo hướng dẫn cũ** (`pm2 start server/index.js`): mã máy chủ đã dời sang `src/server/`, pm2 vẫn nhớ đường dẫn cũ nên `pm2 restart` sẽ báo `Script not found`. Làm **một lần** sau `git pull`, giữ nguyên `DATA_DIR`/`ADMINS` đang dùng:
> ```bash
> pm2 delete ninja
> PORT=3000 DATA_DIR=$HOME/ninja-data ADMINS=tentaikhoan_admin pm2 start npm --name ninja -- start
> pm2 save
> ```

---

## Kiểm tra sau khi deploy

1. `https://<địa-chỉ>/api/status` trả về `{"ok":true,...,"online":0,...}`.
2. Mở trang game, **đăng ký** tài khoản trùng tên với `ADMINS`, tạo nhân vật, vào game. Gõ `/help` trong chat: phải thấy thêm dòng lệnh admin.
3. Mở game trên **thiết bị thứ hai** (điện thoại), đăng ký tài khoản khác. Hai nhân vật phải nhìn thấy nhau. Thử chat bản đồ, bấm vào nhau để mời nhóm hoặc giao dịch.
4. Khởi động lại máy chủ (Render: **Manual Deploy**; Docker: `docker restart ninja`), đăng nhập lại: tài khoản và nhân vật vẫn còn.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Vào trang được nhưng báo "Mất kết nối" liên tục | Proxy không chuyển tiếp WebSocket | Nginx: thêm `proxy_http_version 1.1`, `Upgrade`, `Connection "upgrade"`. Caddy và Render tự làm. |
| Khởi động lại thì mất hết tài khoản | `DATA_DIR` không nằm trên ổ bền vững | Docker: thêm `-v ninja-data:/data`. Render: dùng gói có disk. |
| Không dùng được lệnh `/lv`, `/item`... | Tên tài khoản chưa có trong `ADMINS` | Thêm đúng **tên tài khoản** (không phải tên nhân vật), rồi khởi động lại. |
| `docker pull` báo `denied` | Package GHCR đang ở chế độ riêng tư | Đặt Public trong Package settings hoặc `docker login ghcr.io`. |
| Cổng 80 đã bị dùng | Có Apache/Nginx khác đang chạy | Đổi `-p 8080:3000` hoặc tắt dịch vụ kia. |
