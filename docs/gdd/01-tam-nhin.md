# GDD 01 — Tầm nhìn

| Mục | Nội dung |
|---|---|
| Tài liệu | Thiết kế game (GDD) Ninja School Pixel Online, mục 1: tầm nhìn, trụ cột, quy ước ưu tiên và id tính năng |
| Ngày | 18/10/2026 |
| Áp dụng cho | mọi mục GDD còn lại, sổ tính năng (`features.json`), ROADMAP giai đoạn 0-8 |
| Nguồn đã đọc | `README.md`, `CLAUDE.md`, `DESIGN_RULES.md`, `NOTE.md`, `package.json`, mã `src/` (thư mục làm việc ngày 18/10/2026), đặc tả đợt 3 (`specs/*.md`, `PLAN.md`), đặc tả nội dung cấp 120-199 (`content/00-60`), nhánh chưa gộp `feat/bag`, `feat/audio` |
| Bản rút gọn cho agent | `scratchpad/gddwork/pillars.md` (trụ cột + quy ước id, ≤ 60 dòng) |

Quy tắc đọc: chỗ nào tài liệu này mâu thuẫn với `CLAUDE.md` hay `DESIGN_RULES.md` thì hai file kia thắng, trừ khi có ADR ở mục 8 ghi rõ là đổi quy tắc. Mọi tên trong game là tên tự đặt; các game ninja khác chỉ được nhắc chung là "game tham khảo" và chỉ để chỉ **loại** cơ chế.

---

## 0. Tóm tắt một trang

| Câu hỏi | Trả lời ngắn |
|---|---|
| Game gì? | Nhập vai ninja 2D đi cảnh, đồ họa pixel chibi, online nhiều người, chơi ngay trên trình duyệt (máy tính và điện thoại, cùng một máy chủ) |
| Cho ai? | Người Việt 15-35 tuổi từng mê dòng game ninja học đường trên điện thoại đời đầu, và người chơi mới thích game nhập vai nhẹ, chơi được ở bất kỳ máy nào |
| Vì sao chọn game này? | Mở link là chơi (không cài, không tải gói đồ họa), cảm giác hoài niệm nhưng đậm chất Việt (lễ hội Việt, giờ Việt Nam, chữ Việt có dấu), chiến đấu đi cảnh có né đòn thật chứ không chỉ so chỉ số, và một nền kinh tế công bằng do máy chủ quyết định |
| Hành trình | Cấp 1 → 199 qua Hạ Giới (cấp 1-120, đã có) và Thượng Giới (8 vùng cấp 120-199), khoảng 25 giờ tới cấp 120 và 45-60 giờ nữa tới 199 khi chơi có bổ trợ |
| Vòng lặp chính | luyện cấp và làm nhiệm vụ → nhặt đồ, rèn, khảm ngọc → hạ boss, vượt hang → so tài lôi đài, chiến trường, chiến gia tộc → khoe ngoại hình, thú cưỡi, thú cưng, danh hiệu → lễ hội theo mùa kéo người quay lại |
| Trụ cột | P1 Hồn ninja Việt · P2 Chạm là chơi · P3 Đi cảnh có tay nghề · P4 Giang hồ có bạn · P5 Công bằng và đường dài |
| Sàn bản 1.0 (không cắt) | cấp 199 · ≥ 80 bản đồ · ≥ 120 nhiệm vụ chính · ≥ 20 thú cưỡi · ≥ 25 thú cưng · 7 lễ hội (Tết, Valentine, 30-4, Hè, Trung Thu, Halloween, Noel) · ≥ 10 tính năng đặc sắc mức Must/Should |

---

## 1. Tầm nhìn

**Ninja School Pixel Online** là một thế giới ninja pixel nhỏ mà sống động, mở ra chỉ bằng một đường link: người chơi chọn một trong 6 phái thuộc 3 hệ khắc chế nhau, lớn lên từ ngôi làng mái ngói đèn lồng tới tận Thái Cực Thần Cảnh ở cấp 199, nhảy bục, né vùng đánh đỏ của boss, rèn món vũ khí +16 của riêng mình, kết bạn, lập gia tộc, so tài trên lôi đài và cùng cả máy chủ đón Tết, Trung Thu, Noel trong game. Game giữ đúng cái hồn của những tựa nhập vai ninja trên điện thoại mà một thế hệ người Việt đã lớn lên cùng (nhân vật chibi, làng ninja, gia tộc, cường hóa hồi hộp) nhưng sửa những điều từng làm họ bỏ game: phải cài đặt, máy yếu giật lag, người nạp tiền đè bẹp người chơi chăm, đồ mất vì lỗi, và cày mãi một việc. Mọi đồ họa vẽ bằng code, mọi kết quả do máy chủ quyết định, mọi màn hình chơi được bằng ngón cái.

**Câu giới thiệu 15 giây**: "Game ninja pixel online kiểu ngày xưa, chơi ngay trên trình duyệt điện thoại hay máy tính, 199 cấp, 6 phái, gia tộc, lôi đài, lễ hội Việt quanh năm. Không cần cài."

### 1.1 Hiện trạng và đích đến

Số liệu hiện trạng đếm từ dữ liệu trong `src/shared/data/` ngày 18/10/2026.

| Hạng mục | Đã có | Sàn bản 1.0 | Ghi chú |
|---|---|---|---|
| Cấp tối đa | 120 | **199** | đường EXP 120-199 đã thiết kế ở `content/00-foundation.md` (cấp ≤ 120 giữ nguyên từng số) |
| Bản đồ | 25 (3 làng, 19 bãi luyện công, Đấu Trường, 2 phó bản) | **≥ 80** | 8 vùng Thượng Giới + Thí Luyện Động + bản đồ gia tộc, chiến trường |
| Nhiệm vụ chính | 51 | **≥ 120** | chính tuyến "Bát Phương Thiên Ấn" 120-199 ở `content/30-quests.md` |
| Thú cưỡi | 5 | **≥ 20** | `content/60-mounts-pets.md` |
| Thú cưng | 6 | **≥ 25** | như trên |
| Lễ hội | 1 (Trăng Rằm) | **7**: Tết, Valentine, 30-4, Hè, Trung Thu, Halloween, Noel | mỗi lễ một mùa riêng, không chồng ngày |
| Tính năng đặc sắc | lôi đài xếp hạng, Tà Thú, khảm ngọc, tự tìm đường | **≥ 10** mức Must/Should | danh sách chốt ở mục GDD tính năng đặc sắc |
| Quái / boss | 65 loại (gồm boss và Tà Thú) | theo đặc tả vùng | mỗi vùng Thượng Giới có quái, boss vùng, chiêu boss riêng |
| Đã làm, chờ gộp | — | — | nhánh `feat/bag` (mở rộng túi bằng lượng, hủy nhanh nhiều món, hộp xác nhận tự làm thay hộp của trình duyệt, túi chia trang 40 ô) và `feat/audio` (nhạc nền, tiếng hiệu ứng từ file tự tạo, WebAudio dự phòng, thanh âm lượng): trạng thái `todo` trong sổ tính năng, ghi chú tên nhánh |

---

## 2. Điểm bán độc nhất (USP)

Mỗi điểm phải đúng **cùng lúc** ba điều: người chơi cảm nhận được trong 10 phút đầu, game tham khảo không có hoặc làm kém, và dự án giữ được bằng kiến trúc hiện tại.

| # | Điểm bán | Người chơi thấy gì | Dựa trên cái gì đã có | Điều kiện để giữ |
|---|---|---|---|---|
| U1 | **Mở link là chơi, máy nào cũng chạy** | không cài app, không tải gói đồ họa; điện thoại tầm trung vẫn 60 khung hình; đổi từ máy tính sang điện thoại vẫn là nhân vật đó | client ES module không build (~1,1 MB mã + 52 KB font), đồ họa vẽ bằng code và cache canvas, bố cục cảm ứng riêng (D-pad, nút 44px), mốc đo 3-4 ms CPU mỗi khung | mỗi tính năng mới qua `test:perf` và chụp ảnh điện thoại; tài nguyên tải thêm (âm thanh) phải tải lười và có dự phòng (ADR-01-1) |
| U2 | **Hoài niệm ninja nhưng là của người Việt** | làng ninja chibi quen thuộc, nhưng tên Hán-Việt, NPC xưng "ta - ngươi", lễ hội Việt (Tết, Trăng Rằm, 30-4), ngày đêm và Giờ Vàng theo giờ Việt Nam | quy tắc đặt tên trong `DESIGN_RULES.md` mục 9, ngày/đêm `vnHour`, mùa Trăng Rằm đang chạy | mọi tên tự đặt; lễ hội lấy từ phong tục Việt; không sao chép tên, hình, âm thanh của game nào |
| U3 | **Chiến đấu đi cảnh có né đòn** | boss báo trước vùng đánh đỏ trên đất kèm tên chiêu, chạy ra là né; nhảy đôi, bục, khắc hệ Hỏa → Phong → Thủy → Hỏa; dưới 30% máu boss cuồng nộ | `BOSS_SKILLS`, `inBossZone`, telegraph ở `game.js`, vật lý nhảy kiểm ở `movement` | mỗi boss mới có 2-3 chiêu báo trước; cân bằng theo "người chơi trung bình" (`specs/balance.md`) để tay nghề bù được thiếu đồ |
| U4 | **Công bằng do máy chủ bảo đảm** | không hack tốc độ, không nhân bản đồ; quà không bao giờ mất (túi đầy thì vào thư, thư đầy thì vào kho, kho đầy thì máy chủ giữ hộ); lôi đài hồi đầy máu, cấm bình, chia % máu theo mức lúc vào trận | máy chủ kiểm mọi số, `bound` (xu khóa) chống rửa tiền, hộp thư, `c.pending` | mọi giao thức mới chỉ nhận ý định; mọi nguồn thưởng đi qua đường không làm mất quà |
| U5 | **Tôn trọng thời gian người chơi** | tự đánh, tự tìm đường tới quái/NPC/mục tiêu nhiệm vụ trên bản đồ thế giới dạng tranh cuộn, lịch sự kiện cố định theo giờ Việt Nam, thưởng tuần qua hộp thư | `pathfind.js`, auto đánh, `worldmap.js`, lịch Tà Thú | tự động không bao giờ nhắm người chơi khác ngoài trận đã đồng ý (lôi đài, thách đấu); hậu kỳ chậm nhưng mỗi buổi chơi vẫn thấy tiến độ |

---

## 3. Người chơi mục tiêu

### 3.1 Ba chân dung

| | **Anh Quân — người hoài niệm** | **Mai — người chơi giờ rảnh** | **Khải — cao thủ đua top** |
|---|---|---|---|
| Tuổi, nghề | 29, nhân viên văn phòng | 17, học sinh cấp 3 | 22, sinh viên năm cuối |
| Thiết bị | máy tính văn phòng (trình duyệt Chrome/Edge) buổi tối; điện thoại Android tầm trung giờ nghỉ trưa | điện thoại Android 3-4 năm tuổi, mạng 4G, màn 720p, pin là vấn đề | máy tính cá nhân, chuột + bàn phím, thỉnh thoảng điện thoại khi đi đường |
| Thời lượng | 1-2 giờ/tối ngày thường, 3-4 giờ cuối tuần; 15 phút buổi trưa | 3-5 lần/ngày, mỗi lần 10-30 phút (giờ ra chơi, trên xe buýt, trước khi ngủ) | 3-5 giờ/ngày, canh đúng giờ sự kiện |
| Thói quen | từng chơi game ninja học đường thời điện thoại phím bấm/cảm ứng đời đầu; thích cường hóa, gia tộc; ghét phải cài thêm app | chơi game di động miễn phí; mê ngoại hình, thú cưng, chụp màn hình gửi bạn; ít kiên nhẫn với hướng dẫn dài | đọc kỹ chỉ số, tính sát thương, so Elo; ghét mất cân bằng, ghét người nạp tiền mua chiến thắng |
| Động lực chính | hoài niệm, cảm giác tiến bộ đều, chơi lại cùng bạn cũ trong một gia tộc | khoe ngoại hình, sưu tầm thú, bạn bè, lễ hội theo mùa | thứ hạng lôi đài, chiến trường, chiến gia tộc, cường hóa +16, làm giàu trên chợ ký gửi |
| Cần từ game | vào nhanh, nhiệm vụ rõ ràng, tự tìm đường, không mất đồ, gia tộc có việc để làm cùng | chơi được bằng một tay, phiên ngắn có phần thưởng (điểm danh, Việc Làng), máy không nóng, đồ đẹp lấy được không cần nạp | luật minh bạch, số đọc được, chống gian lận, lịch sự kiện cố định, thưởng tuần xứng đáng |
| Rủi ro mất người chơi | hậu kỳ cày một việc, thấy game "rỗng" khi bạn bè nghỉ | tải chậm, giật lag, cửa sổ chữ nhỏ khó bấm | thấy có người thắng nhờ lỗi hoặc nhờ tiền, bảng xếp hạng chết |
| Trụ cột phục vụ nhiều nhất | P1, P4, P5 | P2, P1, P4 | P3, P5, P4 |

### 3.2 Không nhắm tới

| Nhóm | Lý do |
|---|---|
| Người chơi tìm đồ họa 3D, hành động tốc độ cao kiểu game đối kháng | đi ngược P1 (pixel chibi) và P2 (máy yếu vẫn chạy); trễ mạng trình duyệt không hợp thao tác khung hình |
| Người chơi muốn bỏ tiền mua thắng ngay | đi ngược P5 |
| Thị trường ngoài tiếng Việt ở bản 1.0 | chữ hiển thị, văn phong, lễ hội đều thiết kế cho người Việt; đa ngôn ngữ để sau 1.0 |

---

## 4. Trụ cột thiết kế

Trụ cột là câu hỏi đặt ra cho **mọi** tính năng, nội dung, hình vẽ. Một đề xuất phải phục vụ ít nhất một trụ cột và không được chống trụ cột nào; nếu chống thì phải sửa hoặc ghi ADR. Trong sổ tính năng, mỗi tính năng ghi các trụ cột nó phục vụ (`pillars: ["P2", "P5"]`).

### P1 — Hồn ninja Việt

**Mô tả**: Game phải nhìn, nghe, đọc như **một** game ninja pixel chibi của người Việt: nhân vật đầu to viền tối màu tươi, làng mái ngói cong đèn lồng hoa anh đào, giao diện gỗ sơn mài viền vàng đồng, chữ Việt có dấu, tên Hán-Việt hoặc thuần Việt giàu hình ảnh, lễ hội theo phong tục Việt, thời gian theo giờ Việt Nam. Hoài niệm là chất liệu, không phải bản sao.

**Phục vụ trụ cột nghĩa là**:
- Theo đúng `DESIGN_RULES.md` (bảng màu, lưới pixel, khung giao diện, văn phong NPC "ta - ngươi", số có dấu chấm hàng nghìn).
- Tên tự đặt, kể được bằng hình ảnh (Hạc Tiên Vân Du, Thung Lũng Sương); không mượn tên riêng của game tham khảo.
- Một chi tiết đẹp mà lệch phong cách chung thì bỏ ("nhất quán hơn ấn tượng").
- Nội dung theo mùa lấy từ đời sống Việt (bánh chưng, đèn ông sao, cờ hoa 30-4).

| Phục vụ | Không phục vụ / chống |
|---|---|
| Lễ Hội Trăng Rằm: quái rơi Bánh Trung Thu, Sứ Giả Lễ Hội đổi quà, đèn ông sao đung đưa trên biểu ngữ | sự kiện mang tên, vật phẩm, NPC chép từ game tham khảo |
| Thú cưỡi Bạch Hổ Sơn Quân vẽ pixel bằng code, bảng màu bão hòa đúng quy chuẩn | dán ảnh sprite tải trên mạng, dù "đẹp hơn" |
| Thông báo hệ thống tiếng Việt ngắn, trung tính, có dấu đầy đủ | chữ tiếng Anh lẫn trong giao diện ("Level up!", "Inventory full") |
| Bậc trang bị mới có màu áo, kim loại, viền riêng khớp bảng cũ | hiệu ứng ánh sáng mịn khử răng cưa trên lớp pixel |

### P2 — Chạm là chơi

**Mô tả**: Từ lúc bấm link tới lúc cầm nhân vật chạy không quá vài giây, ở mọi máy trong tay người Việt: máy tính văn phòng, điện thoại Android tầm trung, iPhone đời cũ. Một tay vẫn chơi được, phiên 10 phút vẫn có ý nghĩa, mất mạng vào lại không mất gì.

**Phục vụ trụ cột nghĩa là**:
- Không bước build, không thư viện client, không tài nguyên bắt buộc tải trước; tài nguyên tùy chọn (âm thanh) tải lười và có dự phòng.
- Mọi cửa sổ, HUD đo ở 1280×720 và điện thoại ngang (844×390, 740×360, 667×375); vùng chạm ≥ 44px; không chồng lấn.
- Giữ 60 khung hình, CPU ≤ 8 ms mỗi khung ở kịch bản `test:perf`.
- Có việc ngắn đáng làm: điểm danh, Việc Làng, Tà Thú 20 phút, lôi đài 3 phút.
- Mất kết nối: tự đăng nhập lại bằng token; trận đấu, giao dịch xử lý rõ ràng.

| Phục vụ | Không phục vụ / chống |
|---|---|
| Tự tìm đường bấm một lần tới mục tiêu nhiệm vụ | cửa sổ chỉ dùng được với chuột (kéo thả là cách **duy nhất**) |
| Túi chia trang 40 ô cho màn nhỏ (nhánh `feat/bag`) | tải trước 30 MB nhạc trước khi vào game |
| Lôi đài 3 phút, Tà Thú 20 phút, có biểu ngữ đếm ngược | sự kiện bắt buộc online liên tục 2 giờ mới có thưởng |
| Thông báo dời lên trên khi cửa sổ có nút sát đáy trên điện thoại | thêm nút menu mà không đo lại 6 bố cục màn hình |

### P3 — Đi cảnh có tay nghề

**Mô tả**: Thắng thua phải đến từ cách chơi chứ không chỉ từ bảng chỉ số. Người chơi đọc được đòn của boss, né được bằng di chuyển, chọn đúng hệ khắc, phối kỹ năng và nhảy bục; số hiển thị (sát thương, tầm, hồi chiêu) đủ rõ để học và tối ưu.

**Phục vụ trụ cột nghĩa là**:
- Mọi đòn diện rộng của boss có báo trước (vùng đỏ, tên chiêu, thanh niệm), trong giới hạn kiểm bởi `npm run check`.
- Khắc hệ, hiệu ứng trạng thái, phân thân, kỹ năng hậu kỳ tạo **lựa chọn**, không chỉ cộng số.
- Cân bằng theo hồ sơ "người chơi trung bình" (`specs/balance.md`): đồ tốt rút ngắn thời gian, không biến boss thành không thể thua hay không thể thắng.
- Tự động đánh là tiện ích luyện cấp, không chơi thay ở nội dung khó (boss vùng, hang cấp Ác mộng, PvP).
- Server kiểm tầm, hồi chiêu, độ cao nhảy: tay nghề không bị vô nghĩa bởi gian lận.

| Phục vụ | Không phục vụ / chống |
|---|---|
| Boss Thượng Giới có chiêu `beam` dạng cột rơi phải đứng giữa khe | boss chỉ có máu ×1000 và đánh thường, ai đủ chỉ số thì thắng |
| Hiệu ứng trạng thái theo hệ (bỏng, chậm, choáng) có icon và thời gian rõ | sát thương "ẩn" không ghi ở đâu |
| Lôi đài hồi đầy máu, cấm bình, so % máu lúc hết giờ | PvP mà bình thuốc mua bằng lượng quyết định thắng thua |
| Chiến trường có cờ, có vị trí chiến thuật | chiến trường chỉ đếm số người mỗi phe |

### P4 — Giang hồ có bạn

**Mô tả**: Ninja không đi một mình. Game phải cho người chơi lý do để gặp nhau (boss chung, hang nhóm, gia tộc, chợ), cách để giúp nhau (nhóm chia EXP, gia tộc cộng EXP, giao dịch an toàn) và sân để so tài có luật (lôi đài, chiến trường, chiến gia tộc). Thế giới phải trông có người: thấy nhau trên bản đồ, nghe tin boss cả máy chủ, thấy thú cưng của người khác.

**Phục vụ trụ cột nghĩa là**:
- Nội dung đông người có thưởng chia công bằng theo đóng góp (bảng sát thương), người đến muộn vẫn có phần nhỏ.
- Gia tộc có việc hằng ngày, nhiệm vụ, Tộc Địa, chiến theo lịch; không chỉ là cái tên.
- Kênh chat theo phạm vi (bản đồ, thế giới, nhóm, gia tộc, riêng), lời mời nhanh từ menu người chơi.
- Lịch sự kiện cố định, không chồng giờ, để hẹn nhau được.
- Mọi tương tác giữa người chơi an toàn: giao dịch khóa và xác nhận 2 bên, PK có luật, danh sách kẻ thù.

| Phục vụ | Không phục vụ / chống |
|---|---|
| Hung Tinh Giáng Thế: 9 boss mỗi khung giờ, máu tăng theo số người đủ cấp | boss thế giới chỉ người đánh đòn cuối nhận thưởng |
| Chợ Ký Gửi cho người chơi bán đồ cho nhau, phí bằng xu | mọi món tốt đều "khóa" vĩnh viễn, không ai cần ai |
| Nhóm 6 người chia EXP, hang động theo nhóm | nội dung hậu kỳ chỉ đánh được một mình |
| Thông báo khi bạn bè online, mời nhóm nhanh | ép ghép nhóm ngẫu nhiên mới vào được nội dung cơ bản |

### P5 — Công bằng và đường dài

**Mô tả**: Máy chủ có thẩm quyền tuyệt đối, kinh tế có nguồn và có hút, tiến độ dài 199 cấp nhưng mỗi buổi chơi đều thấy tiến bộ, và người không nạp tiền chăm chỉ vẫn đứng được ở đỉnh. Đồ của người chơi không bao giờ mất vì lỗi; luật nào cũng minh bạch.

**Phục vụ trụ cột nghĩa là**:
- Client chỉ gửi ý định; máy chủ kiểm kiểu, giới hạn, tầm, hồi chiêu, số dư. Không tin số do client gửi.
- Mỗi nguồn xu/lượng/vật phẩm mới có ước lượng lạm phát và chỗ hút tương ứng; thưởng kiểu nhiệm vụ là xu khóa/đồ khóa (`bound`) để chặn rửa tiền.
- Không bán chỉ số vượt trần bằng lượng; đồ mua bằng lượng là tiện lợi, ngoại hình, rút ngắn thời gian có giới hạn lượt.
- Quà đi theo chuỗi túi → thư → kho → máy chủ giữ hộ; không thả thưởng ra đất.
- Đổi công thức, tỉ lệ rơi phải ghi lý do và cập nhật `DESIGN_RULES.md` mục 9; mỗi tính năng có kiểm thử trong `npm test`.

| Phục vụ | Không phục vụ / chống |
|---|---|
| Xu khóa cho thưởng nhiệm vụ, xu thường cho thưởng sự kiện; phí NPC trả xu khóa trước | nhiệm vụ hằng ngày trả xu thường không giới hạn (nuôi tài khoản phụ bán xu) |
| Thú cưỡi Huyền thoại chỉ từ rương/vòng quay có hạn 7 ngày, tốc chạy có trần 100% | bán thú cưỡi vĩnh viễn +60% tốc chạy bằng lượng |
| Gói ưu đãi bằng lượng có giới hạn lượt theo tuần, không chứa lượng | gói vô hạn bán đá Thần, mua là +16 chắc chắn |
| Thẩm định `npm run check` kiểm giới hạn chiêu boss, mức chặn chỉ số thú | thêm số liệu "cho vui" không qua công cụ cân bằng |

### 4.1 Khi các trụ cột xung đột

Thứ tự ưu tiên: **P5 > P2 > P3 > P4 > P1**. Ràng buộc bản quyền (không sao chép) và kiến trúc trong `CLAUDE.md` đứng **trên** mọi trụ cột, không phải trụ cột để cân nhắc.

| Xung đột thường gặp | Thắng | Cách xử lý mặc định |
|---|---|---|
| Hiệu ứng boss đẹp (P1, P3) làm điện thoại tụt dưới 60 khung hình (P2) | P2 | giảm hạt, cache canvas, tắt bớt trên `body.touch`; không bỏ vùng báo trước |
| Chợ giữa người chơi (P4) mở đường rửa xu thưởng (P5) | P5 | món khóa và xu khóa không lên chợ; phí chợ trả bằng xu thường |
| Tự đánh tiện lợi (P2) làm PvP thành máy đánh máy (P3) | P3 | tự đánh không nhắm người ngoài trận đã đồng ý; nội dung khó cần thao tác tay |
| Tên nghe "đúng chất" game tham khảo (P1) | quy tắc bản quyền | đặt tên mới cùng tinh thần |
| Sự kiện đông người (P4) chồng giờ với sự kiện khác | P2, P4 cùng phía | dời lịch, không cho 2 biểu ngữ dưới giữa hiện cùng lúc |

---

## 5. MoSCoW áp dụng cho dự án

Mỗi tính năng trong sổ tính năng có đúng một mức `M`, `S`, `C` hoặc `W`. Mức xét cho **bản 1.0** (mở máy chủ chính thức có đủ sàn tối thiểu); bản 1.x xét lại.

| Mức | Tên | Định nghĩa cho dự án | Tiêu chí bắt buộc | Ví dụ |
|---|---|---|---|---|
| `M` | Must — phải có | Thiếu thì **không phát hành 1.0**, hoặc phát hành là vi phạm sàn tối thiểu, bảo mật, ổn định | ít nhất một trong: (a) thuộc sàn tối thiểu; (b) thiếu thì vòng lặp chính gãy ở một dải cấp; (c) chống mất dữ liệu, gian lận, nhân bản đồ; (d) quy định bắt buộc của nền tảng (giấy phép, bản quyền) | cấp 199 và 8 vùng Thượng Giới, ≥ 120 nhiệm vụ chính, xu khóa, cân bằng boss, sao lưu dữ liệu, 7 lễ hội |
| `S` | Should — nên có | Rất đáng giá, nằm trong kế hoạch 1.0; nếu trễ thì phát hành 1.0 vẫn được và đưa vào 1.1 không làm hỏng dữ liệu | phục vụ ≥ 2 trụ cột hoặc là tính năng đặc sắc; có đặc tả; không chặn tính năng `M` khác | chợ ký gửi, chiến trường, chiến gia tộc, kinh mạch, nhạc nền |
| `C` | Could — có thì tốt | Thêm hương vị, làm khi dư công (thường giao worker opencode); không ai phụ thuộc vào nó | không có tính năng `M`/`S` nào phụ thuộc; gỡ ra được bằng cách bỏ một dòng ở `modules/index.js` | thêm câu thoại NPC theo mùa, biểu cảm nhân vật, trang trí làng thêm |
| `W` | Won't (lần này) — không làm trong 1.0 | Đã cân nhắc và **từ chối cho 1.0**, ghi lại để không bàn lại; muốn làm phải viết ADR | ghi lý do (trụ cột bị chống hoặc chi phí) | ứng dụng cài đặt riêng, đồ họa 3D, chat thoại, nhiều máy chủ ghép (liên server), giao dịch tiền thật giữa người chơi |

### 5.1 Quy tắc dùng MoSCoW

| # | Quy tắc |
|---|---|
| 1 | Mọi mục của sàn tối thiểu (mục 0) là `M` và **không được hạ**. Tính năng đặc sắc (`sig-*` hoặc gắn cờ đặc sắc) ở mức `M` + `S` phải ≥ 10. |
| 2 | Công sức ước tính mỗi giai đoạn: `M` ≤ 60%, `M` + `S` ≤ 80%, phần còn lại là `C` và dự phòng sửa lỗi. Vượt thì hạ `S` xuống `C` hoặc đẩy sang giai đoạn sau, không cắt chất lượng `M`. |
| 3 | Hạ một tính năng `M` xuống mức thấp hơn (ngoài sàn) cần ADR; nâng `C` → `S` cần chỉ ra trụ cột phục vụ và chỗ trong lịch. |
| 4 | Một tính năng `M` không được phụ thuộc tính năng `S`/`C`. Nếu phụ thuộc thì tính năng kia được nâng lên `M` hoặc tách phần cần dùng thành tính năng `M` riêng. |
| 5 | `W` không phải "không bao giờ": xét lại sau 1.0. |
| 6 | `done` xét trên cây làm việc hiện tại; việc đưa mã lên `main` theo dõi riêng bằng `core-restructure` và `ops-commit-restructure` (T0.01, T0.02). Tính năng "đã làm, chờ gộp" của `feat/bag` có tiêu chí "đã commit lên `main`" nên giữ `todo` tới khi T0.02 xong; `snd-audio-files` (`feat/audio`) còn thiếu tiêu chí khác nên cũng `todo`. |

### 5.2 Định nghĩa "xong" (áp dụng mọi mức)

Một tính năng chỉ chuyển `done` khi đủ: đặc tả hoặc mục GDD tương ứng có bảng số liệu; `npm test` in `TẤT CẢ KIỂM TRA ĐỀU ĐẠT` và có kiểm thử riêng ở `tests/features/`; `npm run check` không có dòng lỗi; đổi client thì có ảnh chụp 1280×720 và điện thoại, in `OK no console errors`; thêm vẽ thì qua `test:perf`; `DESIGN_RULES.md` mục liên quan đã cập nhật; mọi tiêu chí trong `acceptance` đạt trên cây làm việc hiện tại. Việc gộp `main` theo dõi riêng bằng T0.02 (`ops-commit-restructure`); tính năng nào có tiêu chí "đã commit lên `main`" thì giữ `todo` tới khi T0.02 xong.

### 5.3 Giai đoạn ROADMAP và `phaseHint`

| `phaseHint` | Giai đoạn | Mức thường gặp |
|---|---|---|
| 0 | Ổn định (gộp tái cấu trúc, sửa lỗi, gộp nhánh chờ) | `M` |
| 1 | Chiến đấu và đồ họa nhân vật | `M`, `S` |
| 2 | Thế giới 121-199 và nhiệm vụ | `M` |
| 3 | Trang bị, rèn và kinh tế | `M`, `S` |
| 4 | Xã hội, gia tộc và PvP | `S` |
| 5 | Tính năng đặc sắc | `S` (đủ ≥ 10 đặc sắc `M`/`S`) |
| 6 | Sự kiện và lễ hội | `M` (7 lễ hội), `S` |
| 7 | Âm thanh, hoàn thiện | `S`, `C` |
| 8 | Tải và vận hành | `M` (sao lưu, giám sát), `S` |

---

## 6. Thước đo thành công của tầm nhìn

Các ngưỡng là mục tiêu mặc định cho bản 1.0; mục GDD vận hành sẽ chốt cách đo.

| Trụ cột | Chỉ số | Mục tiêu |
|---|---|---|
| P2 | thời gian từ mở link tới điều khiển được nhân vật (điện thoại 4G, lần đầu) | ≤ 8 giây |
| P2 | khung hình trên điện thoại tầm trung, kịch bản `test:perf` | 60 khung hình, CPU ≤ 8 ms/khung |
| P2, P4 | tỉ lệ phiên chơi trên điện thoại | ≥ 50% số phiên |
| P1, P4 | giữ chân ngày 1 / ngày 7 / ngày 30 | ≥ 40% / ≥ 20% / ≥ 10% |
| P3 | tỉ lệ người chơi trung bình (đồ đúng cấp, cường hóa trung bình) hạ boss vùng một mình | 2-6 phút mỗi boss, thua được nếu đứng yên ăn chiêu |
| P4 | tỉ lệ người cấp ≥ 30 có gia tộc | ≥ 60% |
| P5 | số lỗi mất đồ, nhân bản đồ, gian lận được xác nhận sau 1.0 | 0 lỗi mất đồ chưa bồi thường quá 24 giờ |
| P5 | người không nạp tiền trong top 10 lôi đài tuần | ≥ 5/10 (khi có nạp tiền thật) |
| P5 | thời gian 1 → 199 có bổ trợ thông thường | 70-85 giờ chơi |

---

## 7. Quy ước id tính năng

### 7.1 Định dạng

```
<tiền tố>-<tên-ngắn-không-dấu>
```

- Chữ thường `a-z`, số `0-9`, ngăn bằng `-`. Không dấu tiếng Việt, không gạch dưới, không viết hoa.
- Biểu thức kiểm: `^(core|cmb|char|gear|eco|soc|clan|pvp|pve|world|quest|evt|pet|sig|ui|art|snd|ops|mon|dev)-[a-z0-9]+(-[a-z0-9]+)*$`, tổng dài 6-40 ký tự.
- Tên ngắn là **danh từ chỉ tính năng**, không phải động từ việc làm (`eco-market`, không `eco-them-cho`). Ưu tiên trùng tên module server hoặc tên đặc tả đã có (`specs/market.md` → `eco-market`, module `arena` → `pvp-arena`), nếu không thì tiếng Việt không dấu ngắn gọn (`sig-kinhmach`) hoặc tiếng Anh ngắn (`sig-meridian`); một khi đã chọn thì giữ.

### 7.2 Tiền tố

| Tiền tố | Khu vực | Gồm | Vùng mã thường chạm |
|---|---|---|---|
| `core` | Lõi | vòng lặp thế giới, router, móc module, lưu dữ liệu, tài khoản, giao thức, ổn định | `src/server/core/**`, `services/**` |
| `cmb` | Chiến đấu, phái, kỹ năng | sát thương, khắc hệ, kỹ năng chủ động/nội tại, hiệu ứng trạng thái, cân bằng, AI quái | `core/combat.js`, `modules/skills`, `data/skills.js`, `data/monsters.js` |
| `char` | Đồ họa nhân vật, ngoại hình | sprite ninja, bậc áo, tạo nhân vật, chân dung, NPC | `render/sprites*`, màn chọn nhân vật |
| `gear` | Trang bị, rèn, ngọc | bậc trang bị, cường hóa, khảm/ghép ngọc, chế tác, thần binh | `modules/smith`, `modules/gems`, `data/items/*` |
| `eco` | Kinh tế, tiền, chợ | xu, xu khóa, lượng, cửa hàng NPC, chợ ký gửi, nguồn/hút tiền | `modules/shop`, chợ, `bound` |
| `soc` | Xã hội | chat, bạn bè, nhóm, giao dịch, lời mời, danh hiệu, kẻ thù | `modules/chat`, `friends`, `party`, `trade`, `invites` |
| `clan` | Gia tộc | lập tộc, cấp tộc, quỹ, nhiệm vụ tộc, Tộc Địa, chiến gia tộc | `modules/clan`, `clanwar` |
| `pvp` | Đấu người | PK, thách đấu, lôi đài, chiến trường | `modules/pk`, `arena`, `battlefield` |
| `pve` | Hang, phó bản, boss | phó bản, Thí Luyện Động, boss thế giới theo giờ, Tà Thú, boss vùng | `modules/dungeon`, `caves`, `events`, `worldboss` |
| `world` | Bản đồ, dịch chuyển | bản đồ, vùng, cổng, bản đồ thế giới, tìm đường, ngày/đêm | `data/maps.js`, `data/regions/`, `movement`, `worldmap.js` |
| `quest` | Nhiệm vụ | chính tuyến, kỳ duyên, truy nã, Việc Làng, hằng ngày | `modules/quest`, `data/quests*` |
| `evt` | Sự kiện, lễ hội | lễ hội theo mùa, lịch sự kiện, Giờ Vàng, Thủ Hộ Làng | `modules/season`, `data/seasons/`, `calendar.js` |
| `pet` | Thú cưng, thú cưỡi, thời trang | thú cưng, thức ăn, thú cưỡi, tiến hóa, pháp bảo, thời trang | `modules/pets`, `fashion`, `mountup`, `beasts` |
| `sig` | Tính năng đặc sắc | tính năng được chọn làm điểm nhấn của game (dùng khi tính năng **không** thuộc rõ khu vực nào khác hoặc là hệ thống hậu kỳ riêng) | module riêng |
| `ui` | Giao diện | HUD, khung cửa sổ, túi đồ, cài đặt, bố cục điện thoại, hộp xác nhận | `ui/**`, `css/**` |
| `art` | Đồ họa thế giới | quái, bản đồ, hiệu ứng, icon, theme | `render/monster*`, `render/map*`, `render/fx*`, `render/icons*` |
| `snd` | Âm thanh | nhạc nền, tiếng hiệu ứng, âm lượng | `core/sound.js`, `data/audio.js` |
| `ops` | Vận hành | triển khai, sao lưu, giám sát, chống lạm dụng, tải, quản trị | `Dockerfile`, `deploy/`, `modules/admin`, `index.js` |
| `mon` | Kiếm tiền | cửa hàng lượng, gói ưu đãi, nạp tiền, giá | `items/shops.js`, `items/bundles.js` |
| `dev` | Công cụ phát triển | kiểm thử, `check-data`, công cụ cân bằng, chụp ảnh, công cụ nội dung | `tests/**`, `tools/**` |

### 7.3 Quy tắc

| # | Quy tắc |
|---|---|
| 1 | **Chọn tiền tố theo người chơi thấy gì trước**, rồi mới theo vùng mã: tính năng lôi đài là `pvp-arena` dù chạm cả `ui/windows/arena.js`. Tính năng đặc sắc thuộc rõ một khu vực thì giữ tiền tố khu vực (`pvp-battlefield`) và đánh dấu đặc sắc bằng trường riêng trong sổ (`signature: true`); `sig-` chỉ dùng cho hệ thống đặc sắc không thuộc khu vực nào (kinh mạch, phân thân nếu tách khỏi kỹ năng). |
| 2 | **Id bất biến**: đã đưa vào sổ thì không đổi, không dùng lại cho tính năng khác, kể cả khi tính năng bị bỏ (`W`) hay đổi tên hiển thị. |
| 3 | **Tách**: tính năng lớn tách thành con thì giữ id cha, con dùng id cha + hậu tố (`clan-war` → `clan-war-lanhdia`, `clan-war-chien`); ghi `parent` ở con. |
| 4 | **Gộp**: giữ id cũ hơn, id kia chuyển trạng thái `merged` kèm `into`. |
| 5 | Nội dung theo lô dùng hậu tố định danh sẵn có: vùng theo `key` trong `content/00-foundation.md` (`world-region-bonglai`, `quest-main-bonglai`), lễ hội theo tên ngắn (`evt-tet`, `evt-trungthu`). |
| 6 | Việc làm trên nhánh chưa gộp vẫn dùng id thường, ghi tên nhánh ở `note` (`ui-bag-expand`: "đã làm trên nhánh `feat/bag`, chờ gộp"). |
| 7 | Id xuất hiện trong: sổ tính năng, mục GDD, tên nhánh (`feat/<id>` khi phù hợp), báo cáo của worker. Không cần xuất hiện trong mã nguồn. |
| 8 | Một tính năng chỉ có một id; nếu hai mục GDD cùng mô tả, mục sau dẫn id mục trước, không tạo id mới. |

### 7.4 Bảng id chuẩn cho việc đã có đặc tả hoặc đã làm

Các mục GDD khác dùng đúng id dưới đây khi nhắc tới các việc này. Mức MoSCoW ở đây là đề xuất của tầm nhìn; mục GDD sở hữu có thể chỉnh nếu ghi lý do.

| id | Tính năng | Nguồn | Trụ cột | MoSCoW | `phaseHint` |
|---|---|---|---|---|---|
| `core-restructure` | gộp đợt tái cấu trúc `src/` đang chưa commit | git trạng thái làm việc | P5 | M | 0 |
| `ui-bag-expand` | mở rộng túi bằng lượng, túi chia trang 40 ô | nhánh `feat/bag` | P2 | S | 0 |
| `ui-bag-bulkdrop` | hủy nhanh nhiều món | nhánh `feat/bag` | P2 | S | 0 |
| `ui-ask-dialog` | hộp xác nhận tự làm thay hộp của trình duyệt | nhánh `feat/bag` | P1, P2 | M | 0 |
| `cmb-balance` | cân bằng boss, Tà Thú, quái theo người chơi trung bình | `specs/balance.md` | P3, P5 | M | 1 |
| `cmb-status` | hiệu ứng trạng thái theo hệ | `specs/status.md` | P3 | S | 1 |
| `cmb-clone` | Phân Thân (kỹ năng cấp 70 mỗi phái) | `specs/clone.md` | P3 | S | 1 |
| `cmb-skills-199` | 3 kỹ năng chủ động + 2 nội tại hậu kỳ mỗi phái | `content/00-foundation.md` mục 5 | P3 | M | 1 |
| `char-tier-outfit` | hình nhân vật bậc trang bị 12-19 | `content/00-foundation.md` mục 3.3 | P1 | M | 1 |
| `core-levelcap-199` | nâng cấp tối đa 199, đường EXP mới | `content/00-foundation.md` | P5 | M | 2 |
| `world-upper` | tờ bản đồ Thượng Giới, Phu Xe lối tắt | `content/00-foundation.md` mục 6 | P2 | M | 2 |
| `world-region-<key>` | 8 vùng Thượng Giới (từ `bonglai` tới `thaicuc` theo bảng 6.2) | `content/00-foundation.md`, `content/20-monsters.md` | P1, P3 | M | 2 |
| `quest-main-199` | chính tuyến "Bát Phương Thiên Ấn" 120-199 | `content/30-quests.md` | P1, P2 | M | 2 |
| `quest-kyduyen` | nhiệm vụ Kỳ Duyên | `content/30-quests.md` | P1 | S | 2 |
| `quest-truyna` | Lệnh Truy Nã | `content/30-quests.md` | P2 | S | 2 |
| `quest-dailies` | Việc Làng (nhiệm vụ hằng ngày đa dạng) | `specs/dailies.md` | P2, P5 | S | 2 |
| `pve-caves` | Thí Luyện Động | `specs/dungeons.md` | P3, P4 | S | 2 |
| `eco-bound` | xu khóa và vật phẩm khóa | `specs/bound.md` | P5 | M | 3 |
| `eco-market` | Chợ Ký Gửi | `specs/market.md` | P4, P5 | S | 3 |
| `gear-crafting` | chế tác ở Thợ Rèn | `specs/crafting.md` | P5 | S | 3 |
| `gear-smith-plus` | ghép đá cường hóa, tách cường hóa | `NOTE.md` | P5 | S | 3 |
| `gear-tier-199` | trang bị bậc 12-19, thần binh vùng | `content/00-foundation.md` mục 3, `content/40-items-shops.md` | P5 | M | 3 |
| `mon-luong-shop` | quầy Kỳ Trân Các, gói ưu đãi giới hạn lượt | `content/40-items-shops.md` mục 3.6 | P5 | S | 3 |
| `soc-titles` | danh hiệu, thành tựu, danh sách kẻ thù | `specs/titles.md` | P4 | S | 4 |
| `clan-war` | gia tộc mở rộng: nhiệm vụ tộc, cửa hàng, trận pháp, Tộc Địa, chiến gia tộc | `specs/clanwar.md` | P4 | S | 4 |
| `pvp-battlefield` | Chiến Trường Long Phượng | `specs/battlefield.md` | P3, P4 | S | 4 |
| `sig-meridian` | Kinh Mạch (tu luyện hậu kỳ) | `specs/meridian.md` | P5 | S | 5 |
| `pet-mountup` | thú cưỡi nuôi và tiến hóa, thú cưng tiến hóa, pháp bảo sau lưng | `specs/mountup.md` | P1, P4 | S | 5 |
| `pet-beasts` | 20 thú cưỡi, 25 thú cưng, 8 kỹ năng thú, ghép mảnh | `content/60-mounts-pets.md` | P1 | M | 5 |
| `pve-worldboss` | Hung Tinh Giáng Thế (boss thế giới theo giờ) | `content/50-worldboss-events.md` | P4 | S | 6 |
| `evt-calendar` | Lịch Sự Kiện, Giờ Vàng cuối tuần | `content/50-worldboss-events.md` | P2, P4 | S | 6 |
| `evt-village-defense` | Thủ Hộ Làng | `specs/dailies.md` | P4 | S | 6 |
| `evt-tet`, `evt-valentine`, `evt-304`, `evt-he`, `evt-trungthu`, `evt-halloween`, `evt-noel` | 7 lễ hội của sàn tối thiểu | `content/50-worldboss-events.md`, `content/40-items-shops.md` | P1, P4 | M | 6 |
| `snd-audio-files` | nhạc nền, tiếng hiệu ứng từ file tự tạo, WebAudio dự phòng, thanh âm lượng | nhánh `feat/audio`, ADR-01-1 | P1 | S | 7 |
| `dev-balance-tool` | công cụ đo cân bằng `tools/balance.js` | `specs/balance.md` | P5 | M | 1 |

Ghi chú tên lễ hội: id dùng tên ngắn của **dịp lễ**; tên hiển thị của mùa (ví dụ Lễ Hội Trăng Rằm, Hội Xuân Đinh Mùi, Lễ Hội Đất Tổ, Hội Hè Biển Xanh, Đêm Hội Hóa Trang, Đêm Đông An Lành, Mùa Hoa Tình Nhân) do mục GDD sự kiện chốt. Mỗi năm một mùa mới của cùng dịp dùng chung id lễ (`evt-tet`), phân biệt năm ở dữ liệu `SEASONS`.

---

## 8. Quyết định kiến trúc (ADR)

### ADR-01-1 — Cho phép file âm thanh tự tạo trong client

| Mục | Nội dung |
|---|---|
| Trạng thái | Đề xuất, chờ gộp nhánh `feat/audio` (tính năng `snd-audio-files`) |
| Bối cảnh | `DESIGN_RULES.md` mục 0.3 hiện ghi "không có file ảnh hay âm thanh bên ngoài; âm thanh dùng WebAudio tổng hợp". Tiếng tổng hợp đủ cho tiếng bấm, tiếng chém nhưng không làm được nhạc nền có giai điệu theo vùng, theo lễ hội; P1 (hồn game, cảm xúc hoài niệm) cần nhạc. Nhánh `feat/audio` đã làm: file `.ogg` (+ `.m4a` cho Safari) tạo ngoài repo bằng model sinh âm thanh (nhạc: ACE-Step 1.5, giấy phép MIT; tiếng: Stable Audio 3 Small SFX, Stability AI Community License), chép vào `src/client/audio/{music,sfx}/` bằng `tools/sync-audio.js`, ghi nguồn ở `CREDITS.md`, máy chủ HTTP hỗ trợ Range, thiếu file thì dùng WebAudio. Kho tạo hiện khoảng 520 KB. |
| Quyết định | Đổi quy tắc 0.3 thành: **đồ họa** vẫn vẽ bằng code 100%; **âm thanh** được là file do dự án tự tạo (không tải từ nơi khác), có ghi nguồn từng file, có dự phòng WebAudio, tải lười (nhạc phát qua thẻ audio khi cần, tiếng hiệu ứng tải sau khi vào game), không chặn vào game. Sửa `DESIGN_RULES.md` mục 0.3 và `CLAUDE.md` trong cùng commit gộp nhánh (nhánh đã có sẵn đoạn sửa). |
| Phương án khác | (a) Giữ WebAudio thuần, viết bộ tổng hợp nhạc theo nốt (chiptune) bằng code: đúng quy tắc, không tốn băng thông, nhưng tốn nhiều công soạn nhạc và khó đạt chất lượng; (b) dùng nhạc miễn phí tải trên mạng: vi phạm quy tắc bản quyền "không dùng file tải từ nơi khác", loại; (c) chỉ cho file tiếng hiệu ứng, nhạc vẫn tổng hợp: giảm dung lượng nhưng nhạc là phần đáng giá nhất. |
| Chi phí | dung lượng tải thêm (mục tiêu tổng ≤ 8 MB cho toàn bộ nhạc + tiếng, mỗi bài nhạc ≤ 600 KB Opus); thêm bước `sync-audio` và kiểm `check-data` (theme, kỹ năng mới phải có dòng âm thanh); rủi ro giấy phép: Stability AI Community License yêu cầu ghi "Powered by Stability AI" và có ngưỡng doanh thu thương mại, phải rà lại trước khi bật nạp tiền thật (mục 9). |
| Hệ quả | P2 phải đo lại "mở link tới điều khiển được" khi có nhạc (nhạc không được nằm trên đường tải bắt buộc). Mọi tài nguyên tải thêm sau này (nếu có) theo cùng mẫu: tự tạo, ghi nguồn, tải lười, có dự phòng bằng code. Đồ họa **không** được dùng ADR này làm tiền lệ. |

---

## 9. Câu hỏi mở

Mỗi câu có phương án mặc định; các mục GDD khác làm theo mặc định cho tới khi chủ dự án chốt khác.

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| Q1 | Có nạp tiền thật (mua lượng) ở bản 1.0 không? | **Không** ở 1.0: lượng chỉ kiếm trong game (khoảng 25 lượng/ngày theo ước tính ở `content/40-items-shops.md`). Cổng nạp là tính năng `mon-topup` mức `C`, `phaseHint` 8, phải có ADR riêng (dịch vụ ngoài, pháp lý, giấy phép âm thanh) và tuân P5 (không bán chỉ số vượt trần). |
| Q2 | Một máy chủ phục vụ bao nhiêu người cùng lúc? | mục tiêu 1.0: **300 người online** trên một tiến trình Node, lưu JSON; vượt mức này thì mục GDD vận hành đề xuất ADR (tách dữ liệu, nhiều máy chủ). |
| Q3 | Thời lượng 1 → 199 có dài quá với người chơi giờ rảnh (Mai)? | giữ đường EXP của `content/00-foundation.md` (khoảng 110 giờ luyện thuần, 70-85 giờ có bổ trợ); bù bằng Việc Làng, Giờ Vàng, hang động cho phiên ngắn; xét lại sau 4 tuần dữ liệu thật. |
| Q4 | Lễ hội Valentine và 30-4 có đủ "chất Việt" để thành mùa riêng? | có: Valentine thành **Mùa Hoa Tình Nhân** (hoa, thiệp, quà cặp đôi), 30-4 gộp Giỗ Tổ thành **Lễ Hội Đất Tổ** như `content/50-worldboss-events.md`; vẫn một mùa tại một thời điểm. |
| Q5 | Có hỗ trợ màn dọc trên điện thoại? | không ở 1.0: giữ màn ngang và gợi ý xoay máy (`#rotate-hint`); màn dọc là `ui-portrait` mức `W`. |
| Q6 | Có đa ngôn ngữ? | không ở 1.0 (`ui-i18n` mức `W`); chữ hiển thị vẫn gom về dữ liệu/cửa sổ để dễ tách sau. |
| Q7 | Tính năng đặc sắc dùng tiền tố `sig-` hay tiền tố khu vực? | tiền tố khu vực + trường `signature: true`; `sig-` chỉ cho hệ thống không thuộc khu vực nào (mục 7.3 quy tắc 1). |
| Q8 | Tên game chính thức khi phát hành có giữ "Ninja School Pixel Online"? | giữ tên dự án hiện tại cho tới khi chủ dự án chốt thương hiệu; mục GDD vận hành kiểm tra trùng nhãn hiệu trước khi mở máy chủ chính thức. |

---

## 10. Tham chiếu

| Tài liệu | Dùng cho |
|---|---|
| `CLAUDE.md` | kiến trúc, bất biến, quy trình kiểm chứng, phân vùng file |
| `DESIGN_RULES.md` | phong cách, giao diện, cân bằng (mục 9), hiệu năng (mục 10) |
| `README.md` | danh sách tính năng hiện có, điều khiển |
| `NOTE.md` | việc còn treo ở Thợ Rèn (`gear-smith-plus`) |
| `specs/PLAN.md` và 13 đặc tả đợt 3 | thứ tự lô, phụ thuộc, id trong bảng 7.4 |
| `content/00-foundation.md` | hợp đồng chung cấp 120-199 (EXP, bậc trang bị, vùng) |
| `content/20-60` | quái, nhiệm vụ, vật phẩm và cửa hàng, boss thế giới và lễ hội, thú cưỡi và thú cưng |
| nhánh `feat/bag`, `feat/audio` | việc đã làm, chờ gộp (`ui-bag-*`, `ui-ask-dialog`, `snd-audio-files`) |
