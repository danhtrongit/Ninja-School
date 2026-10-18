# GDD 08 — Phụ lục: bảng nhiệm vụ và thoại

| Mục | Nội dung |
|---|---|
| Thuộc | [`08-cot-truyen.md`](08-cot-truyen.md) (id `quest-main`, `quest-main-199`, `quest-kyduyen`, `quest-lore`, `quest-main-gap`) |
| Ngày | 18/10/2026 |
| Cách sinh | Bảng A, C sinh bằng `gddwork/lab/q08/build.js` + `gen-md.js`: nhiệm vụ `m1`-`m51` đọc từ `src/shared/data/quests.js` của thư mục làm việc; 73 nhiệm vụ Thượng Giới và 40 kỳ duyên nạp nguyên các lệnh `qx` và `sq` của `content/30-quests.md` mục 4 và 8. Bảng B lấy từ `gap.js`. Phụ lục E kiểm bằng `story-draft.js` (độ dài, từ cấm, id tồn tại: 46 cặp, 0 lỗi) |
| Công thức | `expNeed(lv) = ⌊(20·lv² + 80·lv)·(1 + max(0, lv − 120)²/2000)⌋`; EXP thưởng `round(expNeed(req)·hệ số)`; xu nhiệm vụ chính `200 + req²·8`, kỳ duyên `100 + req²·4`, đều trao thành **xu khóa** |

Ghi chú đọc bảng:
- "Giao / trả": loại NPC `elder`. Hạ Giới: Trưởng Làng bất kỳ hoặc Trấn Trưởng của 2 trạm Hạ Giới. Thượng Giới: trưởng lão cổng vùng (bãi M1, x 220) hoặc bất kỳ NPC `elder` nào khác.
- "Bản đồ": nơi có mục tiêu (bãi có quái, bãi có quái rơi vật phẩm, bản đồ `visit`), Thợ Rèn trạm vùng với `upgrade`, Hộ Pháp ở làng với `dungeon`.
- Hệ số boss vùng `<prefix>_q7` = **1,0** (GDD 08 mục 0.3 ý 1); `content/30-quests.md` ghi 0,6, số EXP ở đây đã sửa.
- Tên quái/boss Hạ Giới ghi theo dữ liệu hiện tại; sau `quest-npc-rename`: Slime Xanh → Nhầy Xanh, Vua Slime → Vua Nhầy Xanh, Pharaoh Phục Sinh → Sa Mạc Cổ Vương.
- Trang bị thưởng có độ hiếm "Tốt", tất cả vật phẩm thưởng đều **khóa** (`specs/bound.md`). "Vũ khí <bậc> (đúng phái)" là `W<t>`: Kiếm, Phi Tiêu, Kunai, Cung, Đao hoặc Quạt theo phái người nhận.

---

## A. 124 nhiệm vụ chính

### A.0 Tổng theo chương

| Chương / hồi | id | Số NV | Cấp | EXP | Xu khóa | Lượng |
|---|---|---|---|---|---|---|
| Chương 1 — Tam Thôn Nhập Môn | `m1` – `m11` | 11 | 1-12 | 14.636 | 7.136 | 16 |
| Chương 2 — Sóng Biển Hang Dơi | `m12` – `m20` | 9 | 13-25 | 58.916 | 28.088 | 26 |
| Chương 3 — Cát Vàng Cổ Mộ | `m21` – `m28` | 8 | 26-42 | 153.352 | 79.440 | 37 |
| Chương 4 — Băng Sơn Tinh Thể | `m29` – `m37` | 9 | 43-65 | 400.800 | 216.576 | 70 |
| Chương 5 — Ma Lâm Hỏa Địa | `m38` – `m44` | 7 | 67-95 | 666.582 | 346.888 | 170 |
| Chương 6 — Thiên Ngoại Long Cung | `m45` – `m51` | 7 | 96-118 | 1.022.464 | 668.568 | 920 |
| Hồi 1 — Quần Đảo Bồng Lai · Thủy Ấn | `bl_q1` – `bl_q9` | 9 | 120-128 | 876.889 | 1.103.520 | 105 |
| Hồi 2 — Xích Viêm Hỏa Vực · Hỏa Ấn | `xv_q1` – `xv_q9` | 9 | 130-138 | 1.159.763 | 1.288.800 | 110 |
| Hồi 3 — Vạn Niên Băng Nguyên · Băng Ấn | `bn_q1` – `bn_q9` | 9 | 140-148 | 1.628.849 | 1.488.480 | 110 |
| Hồi 4 — Thiên Cổ Hoàng Lăng · Thổ Ấn | `hl_q1` – `hl_q9` | 9 | 150-158 | 2.200.798 | 1.702.560 | 110 |
| Hồi 5 — U Minh Quỷ Lâm · Mộc Ấn | `um_q1` – `um_q9` | 9 | 160-168 | 3.218.855 | 1.931.040 | 110 |
| Hồi 6 — Tinh Hà Thiên Lộ · Tinh Ấn | `th_q1` – `th_q9` | 9 | 170-178 | 4.357.179 | 2.173.920 | 110 |
| Hồi 7 — Hỗn Độn Ma Vực · Ám Ấn | `hd_q1` – `hd_q9` | 9 | 180-188 | 6.244.442 | 2.431.200 | 120 |
| Hồi 8 — Thái Cực Thần Cảnh · Thái Cực Ấn | `tc_q1` – `tc_q10` | 10 | 190-198 | 9.755.641 | 3.016.664 | 660 |

Tổng: 124 nhiệm vụ · EXP 31.759.166 · lượng 2.674 · kiểu: kill 50, collect 30, visit 13, level 10, talk 9, upgrade 6, dungeon 6.

### Chương 1 — Tam Thôn Nhập Môn (`m1` – `m11`, cấp 1-12)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `m1` | Nhập Môn Ninja | 1 | talk | Trưởng Làng | Trưởng Làng (bất kỳ) | làng | 60 | 208 | Nón Gỗ, Giày Gỗ |
| 2 | `m2` | Dọn Dẹp Slime | 1 | kill | Slime Xanh ×8 | Trưởng Làng (bất kỳ) | Đồi Hỏa Diệm | 150 | 208 | Bình Sinh Lực Nhỏ ×15 |
| 3 | `m3` | Thỏ Phá Ruộng | 2 | kill | Thỏ Rừng ×10 | Trưởng Làng (bất kỳ) | Đồi Hỏa Diệm | 288 | 232 | Áo Gỗ, Quần Gỗ |
| 4 | `m4` | Thu Thập Nấm Độc | 4 | collect | Nấm Độc ×6 (← Nấm Độc) | Trưởng Làng (bất kỳ) | Đồi Hỏa Diệm | 640 | 328 | Bình Chakra Nhỏ ×15, Găng Gỗ, 2 lượng |
| 5 | `m5` | Đột Phá Cấp 8 | 6 | level | cấp 8 | Trưởng Làng (bất kỳ) | bãi hợp cấp | 600 | 488 | Dây Chuyền Gỗ, Nhẫn Gỗ, Ngọc Bội Gỗ |
| 6 | `m6` | Lò Rèn Đầu Tiên | 7 | upgrade | +2 một món đang mặc | Trưởng Làng (bất kỳ) | Thợ Rèn (làng) | 770 | 592 | Đá Cường Hóa Sơ ×6, 1 lượng |
| 7 | `m7` | Khỉ Trúc Tinh Nghịch | 8 | kill | Khỉ Trúc ×12 | Trưởng Làng (bất kỳ) | Rừng Trúc | 1.536 | 712 | Đá Cường Hóa Sơ ×5 |
| 8 | `m8` | Mật Ong Rừng | 9 | collect | Mật Ong ×8 (← Ong Bắp Cày) | Trưởng Làng (bất kỳ) | Rừng Trúc | 1.872 | 848 | Bình Sinh Lực Vừa ×20 |
| 9 | `m9` | Thử Thách Hang Động | 10 | dungeon | 1 lượt | Trưởng Làng (bất kỳ) | Hang Động Thử Thách (Hộ Pháp) | 2.240 | 1.000 | Rương Báu, 3 lượng |
| 10 | `m10` | Trừng Trị Sơn Tặc | 11 | kill | Sơn Tặc ×15 | Trưởng Làng (bất kỳ) | Rừng Trúc | 2.640 | 1.168 | Vũ khí Đồng (đúng phái), 5 lượng |
| 11 | `m11` | Vua Slime | 12 | kill | Vua Slime ×1 | Trưởng Làng (bất kỳ) | Rừng Trúc | 3.840 | 1.352 | Rương Báu ×2, 5 lượng |

### Chương 2 — Sóng Biển Hang Dơi (`m12` – `m20`, cấp 13-25)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 12 | `m12` | Vỏ Cua Cứng | 13 | collect | Vỏ Cua ×10 (← Cua Đá) | Trưởng Làng (bất kỳ) | Bờ Biển San Hô | 3.094 | 1.552 | Áo Đồng, Quần Đồng |
| 13 | `m13` | Vườn Anh Đào | 14 | visit | Vườn Anh Đào | Trưởng Làng (bất kỳ) | Vườn Anh Đào | 2.016 | 1.768 | Bánh Bao Sức Mạnh ×2 |
| 14 | `m14` | Cánh Hoa Tiên | 15 | collect | Cánh Hoa Tiên ×10 (← Hoa Tiên Tử) | Trưởng Làng (bất kỳ) | Vườn Anh Đào | 3.990 | 2.000 | Nón Đồng, Giày Đồng |
| 15 | `m15` | Hải Tặc Xâm Lăng | 16 | kill | Hải Tặc ×20 | Trưởng Làng (bất kỳ) | Bờ Biển San Hô | 4.480 | 2.248 | Đá Cường Hóa Sơ ×10, Bình Chakra Vừa ×20 |
| 16 | `m16` | Hang Dơi Âm U | 19 | kill | Dơi Hang ×20 | Trưởng Làng (bất kỳ) | Hang Dơi | 6.118 | 3.088 | Găng Đồng, Nhẫn Đồng |
| 17 | `m17` | Cửu Vĩ Hồ | 21 | kill | Cửu Vĩ Hồ ×1 | Trưởng Làng (bất kỳ) | Vườn Anh Đào | 10.500 | 3.728 | Rương Báu ×2, Dây Chuyền Đồng, 8 lượng |
| 18 | `m18` | Xương Cốt Hang Sâu | 22 | collect | Xương Cũ ×12 (← Bộ Xương) | Trưởng Làng (bất kỳ) | Hang Dơi | 8.008 | 4.072 | Vũ khí Sắt (đúng phái), 5 lượng |
| 19 | `m19` | Cường Hóa +5 | 23 | upgrade | +5 một món đang mặc | Trưởng Làng (bất kỳ) | Thợ Rèn (làng) | 6.210 | 4.432 | Đá Cường Hóa Trung ×3, Bùa Bảo Hộ, 3 lượng |
| 20 | `m20` | Diệt Dơi Chúa | 25 | kill | Dơi Chúa ×1 | Trưởng Làng (bất kỳ) | Hang Dơi | 14.500 | 5.200 | Rương Báu ×3, 10 lượng |

### Chương 3 — Cát Vàng Cổ Mộ (`m21` – `m28`, cấp 26-42)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 | `m21` | Cát Vàng Sa Mạc | 26 | collect | Cát Vàng ×12 (← Bọ Cạp Cát) | Trưởng Làng (bất kỳ) | Hoang Mạc Cát | 10.920 | 5.608 | Đá Cường Hóa Trung ×3, Bình Sinh Lực Lớn ×20 |
| 22 | `m22` | Đạo Tặc Sa Mạc | 29 | kill | Đạo Tặc Sa Mạc ×20 | Trưởng Làng (bất kỳ) | Hoang Mạc Cát | 11.484 | 6.928 | Áo Sắt, Quần Sắt |
| 23 | `m23` | Lông Sói Xám | 32 | collect | Lông Sói ×15 (← Sói Xám) | Trưởng Làng (bất kỳ) | Thung Lũng Sương | 13.824 | 8.392 | Áo Bạc, Vũ khí Bạc (đúng phái) |
| 24 | `m24` | Phế Tích Cổ | 34 | visit | Phế Tích Cổ | Trưởng Làng (bất kỳ) | Phế Tích Cổ | 7.752 | 9.448 | Trà Thiết Bích ×3 |
| 25 | `m25` | Mảnh Tượng Đá | 35 | collect | Mảnh Tượng Đá ×12 (← Tượng Đá Cổ) | Trưởng Làng (bất kỳ) | Phế Tích Cổ | 16.380 | 10.000 | Nón Bạc, Giày Bạc |
| 26 | `m26` | Ninja Lang Thang | 38 | kill | Ninja Lang Thang ×25 | Trưởng Làng (bất kỳ) | Thung Lũng Sương | 19.152 | 11.752 | Đá Cường Hóa Trung ×6, 10 lượng |
| 27 | `m27` | Pharaoh Phục Sinh | 40 | kill | Pharaoh Phục Sinh ×1 | Trưởng Làng (bất kỳ) | Phế Tích Cổ | 35.200 | 13.000 | Rương Báu ×4, Vũ khí Vàng (đúng phái), 12 lượng |
| 28 | `m28` | Lang Vương | 42 | kill | Lang Vương ×1 | Trưởng Làng (bất kỳ) | Thung Lũng Sương | 38.640 | 14.312 | Rương Báu ×5, 15 lượng |

### Chương 4 — Băng Sơn Tinh Thể (`m29` – `m37`, cấp 43-65)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 29 | `m29` | Người Tuyết Nổi Giận | 43 | kill | Người Tuyết ×25 | Trưởng Làng (bất kỳ) | Núi Tuyết | 24.252 | 14.992 | Áo Vàng, Quần Vàng |
| 30 | `m30` | Hang Động Tinh Anh | 45 | dungeon | 3 lượt | Trưởng Làng (bất kỳ) | Hang Động Thử Thách (Hộ Pháp) | 35.280 | 16.400 | Rương Báu ×3, Bí Kíp Nhân Đôi ×2, 10 lượng |
| 31 | `m31` | Bạch Viên Núi Tuyết | 48 | kill | Bạch Viên ×25 | Trưởng Làng (bất kỳ) | Núi Tuyết | 29.952 | 18.632 | Nón Vàng, Giày Vàng, Găng Vàng |
| 32 | `m32` | Tinh Thể Băng | 50 | collect | Tinh Thể Băng ×15 (← Băng Nhân) | Trưởng Làng (bất kỳ) | Đỉnh Băng Giá | 32.400 | 20.200 | Vũ khí Ngọc (đúng phái), Đá Cường Hóa Cao ×3 |
| 33 | `m33` | Hang Pha Lê | 56 | visit | Hang Pha Lê | Trưởng Làng (bất kỳ) | Hang Pha Lê | 20.160 | 25.288 | Canh Nhân Sâm ×3 |
| 34 | `m34` | Tinh Thể Tím | 58 | collect | Tinh Thể Tím ×15 (← Pha Lê Nhân) | Trưởng Làng (bất kỳ) | Hang Pha Lê | 43.152 | 27.112 | Áo Ngọc, Quần Ngọc |
| 35 | `m35` | Tuyết Quái Vương | 60 | kill | Tuyết Quái Vương ×1 | Trưởng Làng (bất kỳ) | Đỉnh Băng Giá | 76.800 | 29.000 | Rương Báu ×5, 20 lượng |
| 36 | `m36` | Sừng Quỷ Đỏ | 62 | collect | Sừng Quỷ ×20 (← Quỷ Đỏ) | Trưởng Làng (bất kỳ) | Rừng Ma | 49.104 | 30.952 | Vũ khí Huyền (đúng phái), Đá Cường Hóa Cao ×5, 20 lượng |
| 37 | `m37` | Tinh Thể Vương | 65 | kill | Tinh Thể Vương ×1 | Trưởng Làng (bất kỳ) | Hang Pha Lê | 89.700 | 34.000 | Rương Báu ×5, Dây Chuyền Huyền, 20 lượng |

### Chương 5 — Ma Lâm Hỏa Địa (`m38` – `m44`, cấp 67-95)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 38 | `m38` | Cường Hóa +10 | 67 | upgrade | +10 một món đang mặc | Trưởng Làng (bất kỳ) | Thợ Rèn (làng) | 47.570 | 36.112 | Đá Cường Hóa Cao ×6, Bùa Bảo Hộ ×3, 20 lượng |
| 39 | `m39` | Ảnh Ninja | 68 | kill | Ảnh Ninja ×30 | Trưởng Làng (bất kỳ) | Rừng Ma | 58.752 | 37.192 | Áo Huyền, Quần Huyền |
| 40 | `m40` | Dung Nham Nhân | 72 | kill | Dung Nham Nhân ×30 | Trưởng Làng (bất kỳ) | Hang Quỷ | 65.664 | 41.672 | Nón Long, Giày Long |
| 41 | `m41` | Quỷ Võ Sĩ | 78 | kill | Quỷ Võ Sĩ ×30 | Trưởng Làng (bất kỳ) | Hang Quỷ | 76.752 | 48.872 | Vũ khí Long (đúng phái), 20 lượng |
| 42 | `m42` | Quỷ Vương | 82 | kill | Quỷ Vương ×1 | Trưởng Làng (bất kỳ) | Hang Quỷ | 141.040 | 53.992 | Vũ khí Thiên (đúng phái), Rương Báu ×8, 50 lượng |
| 43 | `m43` | Địa Ngục Khuyển | 84 | kill | Địa Ngục Khuyển ×30 | Trưởng Làng (bất kỳ) | Cổng Địa Ngục | 88.704 | 56.648 | Áo Thiên, Quần Thiên |
| 44 | `m44` | Ma Thần Diệt Thế | 95 | kill | Ma Thần ×1 | Trưởng Làng (bất kỳ) | Cổng Địa Ngục | 188.100 | 72.400 | Vũ khí Thần (đúng phái), Đá Cường Hóa Thần ×2, 80 lượng |

### Chương 6 — Thiên Ngoại Long Cung (`m45` – `m51`, cấp 96-118)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 45 | `m45` | Thiên Cung | 96 | visit | Thiên Cung | Trưởng Làng (bất kỳ) | Thiên Cung | 57.600 | 73.928 | Bí Kíp Nhân Đôi ×3, 10 lượng |
| 46 | `m46` | Lông Lôi Điểu | 100 | collect | Lông Lôi Điểu ×20 (← Lôi Điểu) | Trưởng Làng (bất kỳ) | Thiên Cung | 124.800 | 80.200 | Vũ khí Tiên (đúng phái), Áo Tiên, 30 lượng |
| 47 | `m47` | Hồn Ma Giới | 106 | collect | Hồn Ma Giới ×20 (← Ma Giới Quỷ) | Trưởng Làng (bất kỳ) | Ma Giới | 139.920 | 90.088 | Quần Tiên, Nón Tiên, Đá Cường Hóa Thần ×3, 30 lượng |
| 48 | `m48` | Thiên Ma | 110 | kill | Thiên Ma ×1 | Trưởng Làng (bất kỳ) | Ma Giới | 250.800 | 97.000 | Vũ khí Thánh (đúng phái), Rương Báu ×10, 100 lượng |
| 49 | `m49` | Vảy Rồng | 114 | collect | Vảy Rồng ×25 (← Hải Xà) | Trưởng Làng (bất kỳ) | Long Cung | 161.424 | 104.168 | Áo Thánh, Quần Thánh, Đá Cường Hóa Thần ×5, 50 lượng |
| 50 | `m50` | Long Vương | 118 | kill | Long Vương ×1 | Trưởng Làng (bất kỳ) | Long Cung | 287.920 | 111.592 | Rương Báu ×15, Đá Cường Hóa Thần ×5, 200 lượng |
| 51 | `m51` | Ninja Huyền Thoại | 118 | level | cấp 120 | Trưởng Làng (bất kỳ) | bãi hợp cấp | 0 | 111.592 | Rương Báu ×20, 500 lượng |

### Hồi 1 — Quần Đảo Bồng Lai · Thủy Ấn (`bl_q1` – `bl_q9`, cấp 120-128)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 52 | `bl_q1` | Thiên Môn Hải Ngoại | 120 | visit | Bích Sa Hải Ngạn | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Bích Sa Hải Ngạn | 29.760 | 115.400 | Bình Sinh Lực hp5 ×30, Bình Chakra mp5 ×30 |
| 53 | `bl_q2` | Bái Kiến Bạch Hạc | 120 | talk | Tiên Ông Bạch Hạc | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Bích Sa Hải Ngạn | 29.760 | 115.400 | Vũ khí Phượng (đúng phái), 5 lượng |
| 54 | `bl_q3` | Ốc Mượn Hồn Lấp Bến | 121 | kill | Ốc Mượn Hồn Ngũ Sắc ×40 | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Bích Sa Hải Ngạn | 90.795 | 117.328 | Áo Phượng, 10 lượng |
| 55 | `bl_q4` | Vỏ Ốc Nhuốm Máu | 122 | collect | Vỏ Ốc Ngũ Sắc ×20 (← Ốc Mượn Hồn Ngũ Sắc) | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Bích Sa Hải Ngạn | 92.416 | 119.272 | Quần Phượng, Đá Cường Hóa Thần ×2, 10 lượng |
| 56 | `bl_q5` | Dạ Xoa Lên Bờ | 124 | kill | Hải Dạ Xoa ×40 | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Đào Hoa Tiên Đảo | 95.994 | 123.208 | Nón Phượng, Giày Phượng, 10 lượng |
| 57 | `bl_q6` | Thận Lâu Ảo Cảnh | 125 | visit | Thận Lâu Ảo Cảnh | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Thận Lâu Ảo Cảnh | 32.653 | 125.200 | Trà Thiết Bích ×3, 5 lượng |
| 58 | `bl_q7` | Tịnh Hóa Thủy Ấn | 126 | kill | Hải Thị Thận Long ×1 | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Thận Lâu Ảo Cảnh | 333.496 | 127.208 | Rương Báu ×5, Nhẫn Phượng, 30 lượng |
| 59 | `bl_q8` | Lông Tiên Hạc | 127 | collect | Lông Tiên Hạc ×25 (← Đan Đỉnh Tiên Hạc) | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Hải Long Thủy Phủ | 102.268 | 129.232 | Găng Phượng, Dây Chuyền Phượng, 15 lượng |
| 60 | `bl_q9` | Biển Lửa Phía Đông | 128 | level | cấp 130 | Tiên Ông Bạch Hạc hoặc Trưởng Làng | Hải Long Thủy Phủ | 69.747 | 131.272 | Ngọc Bội Phượng, Rương Báu ×3, 20 lượng |

### Hồi 2 — Xích Viêm Hỏa Vực · Hỏa Ấn (`xv_q1` – `xv_q9`, cấp 130-138)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 61 | `xv_q1` | Hỏa Vực Khai Lộ | 130 | visit | Xích Sa Hỏa Lộ | Hỏa Công Đầu Đà hoặc Trưởng Làng | Xích Sa Hỏa Lộ | 36.582 | 135.400 | Bình Sinh Lực hp5 ×30, Bình Chakra mp5 ×30 |
| 62 | `xv_q2` | Đầu Đà Giữ Lửa | 130 | talk | Hỏa Công Đầu Đà | Hỏa Công Đầu Đà hoặc Trưởng Làng | Xích Sa Hỏa Lộ | 36.582 | 135.400 | Vũ khí Kỳ Lân (đúng phái), 5 lượng |
| 63 | `xv_q3` | Địa Trùng Đục Đất | 131 | kill | Dung Nham Địa Trùng ×40 | Hỏa Công Đầu Đà hoặc Trưởng Làng | Xích Sa Hỏa Lộ | 112.529 | 137.488 | Áo Kỳ Lân, 10 lượng |
| 64 | `xv_q4` | Nham Tinh Nhóm Lò | 132 | collect | Nham Tinh ×20 (← Nham Tương Tinh) | Hỏa Công Đầu Đà hoặc Trưởng Làng | Xích Sa Hỏa Lộ | 115.467 | 139.592 | Quần Kỳ Lân, Đá Cường Hóa Cao ×8, Bùa Bảo Hộ ×3, 10 lượng |
| 65 | `xv_q5` | Đao Khách Huyết Nguyệt | 134 | kill | Xích Sa Đao Khách ×40 | Hỏa Công Đầu Đà hoặc Trưởng Làng | Dung Nham Hà | 121.825 | 143.848 | Nón Kỳ Lân, Giày Kỳ Lân, 10 lượng |
| 66 | `xv_q6` | Thần Binh Tôi Lửa | 135 | upgrade | +11 một món đang mặc | Hỏa Công Đầu Đà hoặc Trưởng Làng | Thợ Rèn Viêm Chùy (Trấn Xích Thạch) | 83.504 | 146.000 | Đá Cường Hóa Thần ×3, Bùa Bảo Hộ ×2, 10 lượng |
| 67 | `xv_q7` | Tịnh Hóa Hỏa Ấn | 136 | kill | Xích Diệm Dung Thần ×1 | Hỏa Công Đầu Đà hoặc Trưởng Làng | Hỏa Diệm Sơn Khẩu | 429.542 | 148.168 | Rương Báu ×5, Nhẫn Kỳ Lân, 30 lượng |
| 68 | `xv_q8` | Lam Diễm Châu | 137 | collect | Lam Diễm Châu ×25 (← U Lam Quỷ Hỏa) | Hỏa Công Đầu Đà hoặc Trưởng Làng | Luyện Hỏa Thần Đàn | 132.650 | 150.352 | Găng Kỳ Lân, Dây Chuyền Kỳ Lân, 15 lượng |
| 69 | `xv_q9` | Băng Hỏa Giao Thoa | 138 | level | cấp 140 | Hỏa Công Đầu Đà hoặc Trưởng Làng | Luyện Hỏa Thần Đàn | 91.082 | 152.552 | Ngọc Bội Kỳ Lân, Rương Báu ×3, 20 lượng |

### Hồi 3 — Vạn Niên Băng Nguyên · Băng Ấn (`bn_q1` – `bn_q9`, cấp 140-148)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 70 | `bn_q1` | Vạn Niên Băng Nguyên | 140 | visit | Tuyết Lĩnh Phong Khẩu | Băng Tâm Sư Thái hoặc Trưởng Làng | Tuyết Lĩnh Phong Khẩu | 48.384 | 157.000 | Bình Sinh Lực hp5 ×30, Bình Chakra mp5 ×30 |
| 71 | `bn_q2` | Sư Thái Băng Tâm | 140 | talk | Băng Tâm Sư Thái | Băng Tâm Sư Thái hoặc Trưởng Làng | Tuyết Lĩnh Phong Khẩu | 48.384 | 157.000 | Vũ khí Nhật Nguyệt (đúng phái), 5 lượng |
| 72 | `bn_q3` | Tuyết Quái Xuống Núi | 141 | kill | Tuyết Quái Hàn Lão ×40 | Băng Tâm Sư Thái hoặc Trưởng Làng | Tuyết Lĩnh Phong Khẩu | 149.719 | 159.248 | Áo Nhật Nguyệt, 10 lượng |
| 73 | `bn_q4` | Áo Lông Tuyết Thố | 142 | collect | Lông Tuyết Thố ×20 (← Vạn Niên Tuyết Thố) | Băng Tâm Sư Thái hoặc Trưởng Làng | Tuyết Lĩnh Phong Khẩu | 154.495 | 161.512 | Quần Nhật Nguyệt, Đá Cường Hóa Thần ×2, 10 lượng |
| 74 | `bn_q5` | Đạo Quân Dưới Băng | 144 | kill | Hàn Phách U Linh ×40 | Băng Tâm Sư Thái hoặc Trưởng Làng | Vạn Trượng Băng Cốc | 164.699 | 166.088 | Nón Nhật Nguyệt, Giày Nhật Nguyệt, 10 lượng |
| 75 | `bn_q6` | Rèn Thân Chịu Lạnh | 145 | dungeon | 2 lượt | Băng Tâm Sư Thái hoặc Trưởng Làng | Hang Động Thử Thách (Hộ Pháp, làng) | 170.139 | 168.400 | Rương Báu ×3, Bí Kíp Nhân Đôi, 10 lượng |
| 76 | `bn_q7` | Tịnh Hóa Băng Ấn | 146 | kill | Bắc Minh Thiên Lang ×1 | Băng Tâm Sư Thái hoặc Trưởng Làng | Băng Phách Hồ | 586.044 | 170.728 | Rương Báu ×5, Nhẫn Nhật Nguyệt, 30 lượng |
| 77 | `bn_q8` | Nanh Sói Bắc Minh | 147 | collect | Nanh Tuyết Lang ×25 (← Bắc Minh Tuyết Lang) | Băng Tâm Sư Thái hoặc Trưởng Làng | Tuyết Lĩnh Phong Khẩu | 181.727 | 173.072 | Găng Nhật Nguyệt, Dây Chuyền Nhật Nguyệt, 15 lượng |
| 78 | `bn_q9` | Cửa Lăng Hé Mở | 148 | level | cấp 150 | Băng Tâm Sư Thái hoặc Trưởng Làng | Băng Tinh Cổ Thành | 125.258 | 175.432 | Ngọc Bội Nhật Nguyệt, Rương Báu ×3, 20 lượng |

### Hồi 4 — Thiên Cổ Hoàng Lăng · Thổ Ấn (`hl_q1` – `hl_q9`, cấp 150-158)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 79 | `hl_q1` | Thiên Cổ Hoàng Lăng | 150 | visit | Hoàng Sa Thần Đạo | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Hoàng Sa Thần Đạo | 66.990 | 180.200 | Bình Sinh Lực hp5 ×40, Bình Chakra mp5 ×40 |
| 80 | `hl_q2` | Người Giữ Lăng | 150 | talk | Thủ Lăng Lão Nhân | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Hoàng Sa Thần Đạo | 66.990 | 180.200 | Vũ khí Tinh Hà (đúng phái), 5 lượng |
| 81 | `hl_q3` | Cương Thi Đội Mồ | 151 | kill | Thiên Cổ Cương Thi ×40 | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Hoàng Sa Thần Đạo | 207.907 | 182.608 | Áo Tinh Hà, 10 lượng |
| 82 | `hl_q4` | Mảnh Đào Dũng | 152 | collect | Mảnh Đào Dũng ×20 (← Thiên Cổ Đào Dũng) | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Hoàng Sa Thần Đạo | 215.115 | 185.032 | Quần Tinh Hà, Đá Cường Hóa Cao ×4, Đá Cường Hóa Thần ×4, Bùa Bảo Hộ ×3, 10 lượng |
| 83 | `hl_q5` | Thạch Sư Trở Giáo | 154 | kill | Thạch Sư Trấn Mộ ×40 | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Thạch Tượng Mộ Đạo | 230.375 | 189.928 | Nón Tinh Hà, Giày Tinh Hà, 10 lượng |
| 84 | `hl_q6` | Giáp Trụ Kim Thân | 155 | upgrade | +12 một món đang mặc | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Thợ Rèn Đồng Xanh (Trấn Thủ Lăng) | 158.960 | 192.400 | Đá Cường Hóa Thần ×3, Bùa Bảo Hộ ×2, 10 lượng |
| 85 | `hl_q7` | Tịnh Hóa Thổ Ấn | 156 | kill | Vạn Cổ Thi Hoàng ×1 | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Tử Kim Quan Điện | 822.681 | 194.888 | Rương Báu ×5, Nhẫn Tinh Hà, 30 lượng |
| 86 | `hl_q8` | Ngọc Ấn Hoàng Lăng | 157 | collect | Ngọc Ấn Hoàng Lăng ×25 (← Bạch Cốt Ngự Lâm Quân) | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Địa Cung Hoàng Lăng | 255.475 | 197.392 | Găng Tinh Hà, Dây Chuyền Tinh Hà, 15 lượng |
| 87 | `hl_q9` | Đường Xuống U Minh | 158 | level | cấp 160 | Thủ Lăng Lão Nhân hoặc Trưởng Làng | Địa Cung Hoàng Lăng | 176.305 | 199.912 | Ngọc Bội Tinh Hà, Rương Báu ×3, 20 lượng |

### Hồi 5 — U Minh Quỷ Lâm · Mộc Ấn (`um_q1` – `um_q9`, cấp 160-168)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 88 | `um_q1` | U Minh Quỷ Lâm | 160 | visit | Quỷ Lâm Sương Mù | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Quỷ Lâm Sương Mù | 94.464 | 205.000 | Bình Sinh Lực hp6 ×30, Bình Chakra mp6 ×30 |
| 89 | `um_q2` | Ngọn Đèn Xanh | 160 | talk | Thanh Đăng Đạo Nhân | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Quỷ Lâm Sương Mù | 94.464 | 205.000 | Vũ khí Hỗn Nguyên (đúng phái), 5 lượng |
| 90 | `um_q3` | Quỷ Mộc Chắn Lối | 161 | kill | Quỷ Mộc Yêu Thụ ×40 | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Quỷ Lâm Sương Mù | 293.357 | 207.568 | Áo Hỗn Nguyên, 10 lượng |
| 91 | `um_q4` | Bấc Đèn Lân Quang | 162 | collect | Bào Tử Lân Quang ×20 (← Lân Quang Ma Cô) | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Quỷ Lâm Sương Mù | 303.664 | 210.152 | Quần Hỗn Nguyên, Đá Cường Hóa Thần ×2, 10 lượng |
| 92 | `um_q5` | Sứ Giả Câu Hồn | 164 | kill | U Minh Câu Hồn Sứ ×40 | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Hắc Mộc Âm Lâm | 325.334 | 215.368 | Nón Hỗn Nguyên, Giày Hỗn Nguyên, 10 lượng |
| 93 | `um_q6` | Luyện Đảm Trừ Tà | 165 | dungeon | 2 lượt | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Hang Động Thử Thách (Hộ Pháp, làng) | 336.711 | 218.000 | Rương Báu ×3, Bí Kíp Nhân Đôi, 10 lượng |
| 94 | `um_q7` | Tịnh Hóa Mộc Ấn | 166 | kill | Sơn Tiêu Quỷ Vương ×1 | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Quỷ Mẫu Sào Huyệt | 1.161.535 | 220.648 | Rương Báu ×5, Nhẫn Hỗn Nguyên, 30 lượng |
| 95 | `um_q8` | Tơ Quỷ Chu | 167 | collect | Tơ Quỷ Chu ×25 (← Quỷ Diện Chu) | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Vong Xuyên Trúc Ảnh | 360.589 | 223.312 | Găng Hỗn Nguyên, Dây Chuyền Hỗn Nguyên, 15 lượng |
| 96 | `um_q9` | Ánh Sao Trên Ngọn Trúc | 168 | level | cấp 170 | Thanh Đăng Đạo Nhân hoặc Trưởng Làng | Vong Xuyên Trúc Ảnh | 248.737 | 225.992 | Ngọc Bội Hỗn Nguyên, Rương Báu ×3, 20 lượng |

### Hồi 6 — Tinh Hà Thiên Lộ · Tinh Ấn (`th_q1` – `th_q9`, cấp 170-178)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 97 | `th_q1` | Tinh Hà Thiên Lộ | 170 | visit | Vân Hải Thiên Lộ | Quan Tinh Lão Tổ hoặc Trưởng Làng | Vân Hải Thiên Lộ | 133.110 | 231.400 | Bình Sinh Lực hp6 ×30, Bình Chakra mp6 ×30 |
| 98 | `th_q2` | Lão Tổ Xem Sao | 170 | talk | Quan Tinh Lão Tổ | Quan Tinh Lão Tổ hoặc Trưởng Làng | Vân Hải Thiên Lộ | 133.110 | 231.400 | Vũ khí Thái Cực (đúng phái), 5 lượng |
| 99 | `th_q3` | Loan Điểu Hóa Dữ | 171 | kill | Thanh Loan Tiên Điểu ×40 | Quan Tinh Lão Tổ hoặc Trưởng Làng | Vân Hải Thiên Lộ | 413.055 | 234.128 | Áo Thái Cực, 10 lượng |
| 100 | `th_q4` | Tinh Sa Vẽ Tinh Đồ | 172 | collect | Tinh Sa ×20 (← Tinh Đẩu Linh) | Quan Tinh Lão Tổ hoặc Trưởng Làng | Vân Hải Thiên Lộ | 427.198 | 236.872 | Quần Thái Cực, Đá Cường Hóa Thần ×6, Bùa Bảo Hộ ×4, 10 lượng |
| 101 | `th_q5` | Thủ Vệ Phản Thiên | 174 | kill | Tinh Hà Thủ Vệ ×40 | Quan Tinh Lão Tổ hoặc Trưởng Làng | Tinh Thạch Lâm | 456.775 | 242.408 | Nón Thái Cực, Giày Thái Cực, 10 lượng |
| 102 | `th_q6` | Giáp Sao Băng | 175 | upgrade | +13 một món đang mặc | Quan Tinh Lão Tổ hoặc Trưởng Làng | Thợ Rèn Tinh Thiết (Trạm Quan Tinh) | 314.816 | 245.200 | Đá Cường Hóa Thần ×3, Bùa Bảo Hộ ×2, 10 lượng |
| 103 | `th_q7` | Tịnh Hóa Tinh Ấn | 176 | kill | Đọa Thiên Tinh Quân ×1 | Quan Tinh Lão Tổ hoặc Trưởng Làng | Thiên Lang Tinh Đài | 1.627.084 | 248.008 | Rương Báu ×5, Nhẫn Thái Cực, 30 lượng |
| 104 | `th_q8` | Mảnh Tinh Giáp | 177 | collect | Mảnh Tinh Giáp ×25 (← Tinh Giáp Cự Giải) | Quan Tinh Lão Tổ hoặc Trưởng Làng | Tinh Thạch Lâm | 504.487 | 250.832 | Găng Thái Cực, Dây Chuyền Thái Cực, 15 lượng |
| 105 | `th_q9` | Bên Kia Ngân Hà | 178 | level | cấp 180 | Quan Tinh Lão Tổ hoặc Trưởng Làng | Ngân Hà Kiều | 347.544 | 253.672 | Ngọc Bội Thái Cực, Rương Báu ×3, 20 lượng |

### Hồi 7 — Hỗn Độn Ma Vực · Ám Ấn (`hd_q1` – `hd_q9`, cấp 180-188)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 106 | `hd_q1` | Hỗn Độn Ma Vực | 180 | visit | Hoang Vực Ma Thổ | Phá Ma Thiền Sư hoặc Trưởng Làng | Hoang Vực Ma Thổ | 185.472 | 259.400 | Bình Sinh Lực hp6 ×40, Bình Chakra mp6 ×40 |
| 107 | `hd_q2` | Thiền Sư Phá Ma | 180 | talk | Phá Ma Thiền Sư | Phá Ma Thiền Sư hoặc Trưởng Làng | Hoang Vực Ma Thổ | 185.472 | 259.400 | Vũ khí Vô Cực (đúng phái), 5 lượng |
| 108 | `hd_q3` | Ma Trùng Phệ Hồn | 181 | kill | Phệ Hồn Ma Trùng ×40 | Phá Ma Thiền Sư hoặc Trưởng Làng | Hoang Vực Ma Thổ | 574.703 | 262.288 | Áo Vô Cực, 10 lượng |
| 109 | `hd_q4` | Ma Tinh Hỗn Độn | 182 | collect | Ma Tinh Hỗn Độn ×20 (← Hỗn Độn Tiểu Ma) | Phá Ma Thiền Sư hoặc Trưởng Làng | Hoang Vực Ma Thổ | 593.493 | 265.192 | Quần Vô Cực, Đá Cường Hóa Thần ×3, 10 lượng |
| 110 | `hd_q5` | Long Cốt Bốc Lửa | 184 | kill | Cốt Viêm Ma Long ×40 | Phá Ma Thiền Sư hoặc Trưởng Làng | Huyết Trì Luyện Ngục | 632.618 | 271.048 | Nón Vô Cực, Giày Vô Cực, 10 lượng |
| 111 | `hd_q6` | Phá Trận Huyết Trì | 185 | dungeon | 3 lượt | Phá Ma Thiền Sư hoặc Trưởng Làng | Hang Động Thử Thách (Hộ Pháp, làng) | 652.971 | 274.000 | Rương Báu ×3, Bí Kíp Nhân Đôi ×2, 10 lượng |
| 112 | `hd_q7` | Đoạt Lại Ám Ấn | 186 | kill | Thao Thiết Ma Thần ×1 | Phá Ma Thiền Sư hoặc Trưởng Làng | Tế Đàn Huyết Nguyệt | 2.246.210 | 276.968 | Rương Báu ×6, Nhẫn Vô Cực, 40 lượng |
| 113 | `hd_q8` | Oán Hồn Châu | 187 | collect | Oán Hồn Châu ×25 (← Hỗn Độn Oán Hồn) | Phá Ma Thiền Sư hoặc Trưởng Làng | Huyết Nguyệt Ma Điện | 695.303 | 279.952 | Găng Vô Cực, Dây Chuyền Vô Cực, 15 lượng |
| 114 | `hd_q9` | Cửa Thần Cảnh | 188 | level | cấp 190 | Phá Ma Thiền Sư hoặc Trưởng Làng | Huyết Nguyệt Ma Điện | 478.200 | 282.952 | Ngọc Bội Vô Cực, Rương Báu ×3, 20 lượng |

### Hồi 8 — Thái Cực Thần Cảnh · Thái Cực Ấn (`tc_q1` – `tc_q10`, cấp 190-198)

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|---|---|
| 115 | `tc_q1` | Thái Cực Thần Cảnh | 190 | visit | Vân Môn Thần Lộ | Thái Cực Chân Nhân hoặc Trưởng Làng | Vân Môn Thần Lộ | 254.334 | 289.000 | Bình Sinh Lực hp6 ×40, Bình Chakra mp6 ×40 |
| 116 | `tc_q2` | Chân Nhân Thái Cực | 190 | talk | Thái Cực Chân Nhân | Thái Cực Chân Nhân hoặc Trưởng Làng | Vân Môn Thần Lộ | 254.334 | 289.000 | Vũ khí Chí Tôn (đúng phái), 5 lượng |
| 117 | `tc_q3` | Thanh Giao Quẫy Nước | 191 | kill | Thanh Giao Thần Cảnh ×40 | Thái Cực Chân Nhân hoặc Trưởng Làng | Vân Môn Thần Lộ | 786.726 | 292.048 | Áo Chí Tôn, 10 lượng |
| 118 | `tc_q4` | Linh Chi Tiên Thảo | 192 | collect | Linh Chi Tiên Thảo ×20 (← Vạn Niên Linh Chi) | Thái Cực Chân Nhân hoặc Trưởng Làng | Vân Môn Thần Lộ | 811.045 | 295.112 | Quần Chí Tôn, Đá Cường Hóa Thần ×3, 10 lượng |
| 119 | `tc_q5` | Huyền Vũ Nhiễm Ma | 195 | kill | Huyền Vũ Thần Quy ×40 | Thái Cực Chân Nhân hoặc Trưởng Làng | Lưỡng Nghi Thủy Cảnh | 887.664 | 304.400 | Nón Chí Tôn, Giày Chí Tôn, 10 lượng |
| 120 | `tc_q6` | Trăm Trận Thành Thần | 195 | dungeon | 3 lượt | Thái Cực Chân Nhân hoặc Trưởng Làng | Hang Động Thử Thách (Hộ Pháp, làng) | 887.664 | 304.400 | Rương Báu ×3, Bí Kíp Nhân Đôi ×2, 10 lượng |
| 121 | `tc_q7` | Thái Âm Ngọc Hồ | 196 | kill | Thái Âm Ngọc Hồ ×1 | Thái Cực Chân Nhân hoặc Trưởng Làng | Bát Quái Đào Nguyên | 3.048.192 | 307.528 | Rương Báu ×6, Nhẫn Chí Tôn, 40 lượng |
| 122 | `tc_q8` | Âm Dương Châu | 197 | collect | Âm Dương Châu ×25 (← Âm Dương Linh Thể) | Thái Cực Chân Nhân hoặc Trưởng Làng | Lưỡng Nghi Thủy Cảnh | 941.894 | 310.672 | Găng Chí Tôn, Dây Chuyền Chí Tôn, 15 lượng |
| 123 | `tc_q9` | Phong Ấn Ma Tôn | 197 | kill | Hư Vô Ma Tôn ×1 | Thái Cực Chân Nhân hoặc Trưởng Làng | Thái Cực Thánh Điện | 1.883.788 | 310.672 | Rương Báu ×10, Ngọc Bội Chí Tôn, Đá Cường Hóa Thần ×5, 60 lượng |
| 124 | `tc_q10` | Chí Tôn Ninja | 198 | level | cấp 199 | Thái Cực Chân Nhân hoặc Trưởng Làng | Thái Cực Thánh Điện | 0 | 313.832 | Rương Báu ×20, Đá Cường Hóa Thần ×10, 500 lượng |

---

## B. Nhiệm vụ lấp khoảng trống 84-95 (đề xuất, ADR-08-1)

Chèn sau `m43` "Địa Ngục Khuyển", trước `m44` "Ma Thần Diệt Thế". Dữ liệu ở `src/shared/data/quests/gap.js`, quái/vật phẩm/bản đồ theo `content/10-world.md` mục 5.4 (`hagioi/gd.js`). Hệ số theo chuỗi cũ. Trang bị bậc 8 (Thiên).

| # | id | Tên | Cấp | Loại | Mục tiêu | Giao / trả | Bản đồ | Hệ số | EXP | Xu khóa | Lượng | Vật phẩm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 43a | `hg_q1` | Huyệt Vạn Cốt | 85 | visit | `gd_vancot` | Trưởng Làng / Trấn Trưởng | Huyệt Vạn Cốt | 0,3 | 45.390 | 58.000 | 0 | Trà Thiết Bích ×3 |
| 43b | `hg_q2` | Hồn Cốt Oán Khí | 86 | collect | Hồn Cốt `gd_honcot` ×15 (← Cốt Binh 84) | Trưởng Làng / Trấn Trưởng | Huyệt Vạn Cốt | 0,6 | 92.880 | 59.368 | 5 | Đá Cường Hóa Cao ×4, Bùa Bảo Hộ |
| 43c | `hg_q3` | Huyết Linh Trên Hồ | 88 | kill | Huyết Linh `gd_huyetlinh` ×30 | Trưởng Làng / Trấn Trưởng | Huyết Hồ | 0,6 | 97.152 | 62.152 | 0 | Nón Thiên, Giày Thiên |
| 43d | `hg_q4` | Trấn Trưởng Vân Môn | 89 | talk | NPC `elder` (mô tả chỉ Trấn Trưởng Vân Tùng) | Trưởng Làng / Trấn Trưởng | Trấn Vân Môn | 0,3 | 49.662 | 63.568 | 5 | Bí Kíp Nhân Đôi |
| 43e | `hg_q5` | Huyết Ma Vương | 92 | kill | Huyết Ma Vương `boss_gd_huyetma` ×1 | Trưởng Làng / Trấn Trưởng | Huyết Hồ | 1,0 | 176.640 | 67.912 | 15 | Rương Báu ×4, Găng Thiên |
| 43f | `hg_q6` | Lông Hạc Thần | 93 | collect | Lông Hạc Thần `gd_longhac` ×15 (← Hạc Thần 92) | Trưởng Làng / Trấn Trưởng | Vân Thạch Lâm | 0,6 | 108.252 | 69.392 | 10 | Dây Chuyền Thiên, Đá Cường Hóa Thần |

Tổng: EXP 569.976, xu khóa 380.392, lượng 35. Mô tả (`desc`, ≤ 200 ký tự, có địa điểm):

| id | Mô tả |
|---|---|
| `hg_q1` | Dưới Cổng Địa Ngục có cửa đá dẫn xuống Huyệt Vạn Cốt (cửa giữa Cổng Địa Ngục). Đi vào xem tiếng xương khua mỗi đêm từ đâu ra. |
| `hg_q2` | Cốt Binh ở Huyệt Vạn Cốt mang Hồn Cốt đầy oán khí. Thu 15 khúc để Trưởng Làng xem ai đã gọi chúng dậy. |
| `hg_q3` | Huyết Linh bay trên mặt Huyết Hồ (sau Huyệt Vạn Cốt), hút máu kẻ qua đường. Tiêu diệt 30 con. |
| `hg_q4` | Trấn Trưởng Vân Tùng ở Trấn Vân Môn (sau Cổng Địa Ngục) từng biết kẻ cầm đầu Huyết Nguyệt Giáo khi hắn còn trẻ. Đến gặp ông. |
| `hg_q5` | Giáo phái dùng máu Huyết Hồ nuôi Huyết Ma Vương. Cùng đồng đội hạ hắn giữa Huyết Hồ. |
| `hg_q6` | Hạc Thần ở Vân Thạch Lâm (cửa giữa Trấn Vân Môn) rụng Lông Hạc Thần. Thu 15 chiếc làm bùa hộ thân trước khi đánh Ma Thần. |

Kiểm điều kiện (`content/30-quests.md` 9.1 áp cho `gap`): quái `kill` thường cấp ≤ `req + 3` (Huyết Linh 88 ≤ 91); vật phẩm `collect` có quái rơi cấp ≤ `req + 3` (Cốt Binh 84 ≤ 89, Hạc Thần 92 ≤ 96); `req` không giảm (84 → 85 → 86 → 88 → 89 → 92 → 93 → 95). Sau khi chèn, chênh cấp lớn nhất giữa 2 nhiệm vụ chính liền nhau trong 1-120 là 6.

---

## C. 40 kỳ duyên (8 chuỗi × 5)

Nhận ở Kỳ nhân (`<prefix>_hermit`, bãi M1 x 340), làm lần lượt, tối đa 3 đang làm. `talk` trả và nhận thưởng ở Kỳ nhân vùng trước. Hệ số EXP: kỳ duyên 1-2 = 0,12, 3 = 0,08, 4 = 0,15, 5 = 0,10. Tổng 40 kỳ duyên: 80 lượng, 16 Rương Báu, 8 Đá Cường Hóa Thần, 16 Thẻ Hồi Sinh, 8 Bí Kíp Nhân Đôi, 16 đồ ăn.

| id | Tên | Cấp | Loại | Mục tiêu | Kỳ nhân giao (trả) | EXP | Xu khóa | Thưởng khác |
|---|---|---|---|---|---|---|---|---|
| `bl_s1` | Lưới Rách | 120 | kill | Lưu Quang Thủy Mẫu ×25 | Ngư Ông Lục Bình | 35.712 | 57.700 | Canh Nhân Sâm ×2 |
| `bl_s2` | Vỏ Ốc Cho Cháu | 122 | collect | Vỏ Ốc Ngũ Sắc ×10 | Ngư Ông Lục Bình | 36.966 | 59.636 | Đá Cường Hóa Thần |
| `bl_s3` | Bóng Thuyền Trong Sương | 124 | visit | Thận Lâu Ảo Cảnh | Ngư Ông Lục Bình | 25.598 | 61.604 | Thẻ Hồi Sinh ×2 |
| `bl_s4` | Kẻ Bắt Cóc | 125 | kill | Ngư Nhân Tuần Hải ×30 | Ngư Ông Lục Bình | 48.980 | 62.600 | Bí Kíp Nhân Đôi |
| `bl_s5` | Nanh Đổi Người | 127 | collect | Nanh Dạ Xoa ×10 | Ngư Ông Lục Bình | 34.089 | 64.616 | Rương Báu ×2, 10 lượng |
| `xv_s1` | Củi Lửa Cho Lò | 130 | kill | Nham Tương Tinh ×25 | Đan Sư Hồng Lô | 43.898 | 67.700 | Bánh Bao Sức Mạnh ×2 |
| `xv_s2` | Nọc Độc Làm Thuốc | 132 | collect | Đuôi Độc Hạt ×10 | Đan Sư Hồng Lô | 46.187 | 69.796 | Đá Cường Hóa Thần |
| `xv_s3` | Hơi Lửa Miệng Núi | 134 | visit | Hỏa Diệm Sơn Khẩu | Đan Sư Hồng Lô | 32.487 | 71.924 | Thẻ Hồi Sinh ×2 |
| `xv_s4` | Máu Sói Lửa | 135 | kill | Xích Viêm Hỏa Lang ×30 | Đan Sư Hồng Lô | 62.628 | 73.000 | Bí Kíp Nhân Đôi |
| `xv_s5` | Đan Dược Gửi Ngư Ông | 136 | talk | mang tin tới Ngư Ông Lục Bình | Đan Sư Hồng Lô (trả: Ngư Ông Lục Bình) | 42.954 | 74.084 | Rương Báu ×2, 10 lượng |
| `bn_s1` | Dơi Băng Đêm Đông | 140 | kill | Hàn Băng Biên Bức ×25 | Liệp Hộ Bạch Mao | 58.061 | 78.500 | Canh Nhân Sâm ×2 |
| `bn_s2` | Áo Lông Cho Bản | 142 | collect | Lông Tuyết Thố ×10 | Liệp Hộ Bạch Mao | 61.798 | 80.756 | Đá Cường Hóa Thần |
| `bn_s3` | Bóng Người Dưới Hồ | 144 | visit | Băng Phách Hồ | Liệp Hộ Bạch Mao | 43.920 | 83.044 | Thẻ Hồi Sinh ×2 |
| `bn_s4` | Giải Băng Chắn Lối | 146 | kill | Băng Giáp Giải ×30 | Liệp Hộ Bạch Mao | 87.907 | 85.364 | Bí Kíp Nhân Đôi |
| `bn_s5` | Băng Thạch Gửi Đan Sư | 147 | talk | mang tin tới Đan Sư Hồng Lô | Liệp Hộ Bạch Mao (trả: Đan Sư Hồng Lô) | 60.576 | 86.536 | Rương Báu ×2, 10 lượng |
| `hl_s1` | Mở Lối Thần Đạo | 150 | kill | Thiên Cổ Đào Dũng ×25 | Thư Sinh Mặc Văn | 80.388 | 90.100 | Trà Thiết Bích ×2 |
| `hl_s2` | Chữ Trên Bùa Trấn | 152 | collect | Bùa Trấn Thi ×10 | Thư Sinh Mặc Văn | 86.046 | 92.516 | Đá Cường Hóa Thần |
| `hl_s3` | Bia Đá Địa Cung | 154 | visit | Địa Cung Hoàng Lăng | Thư Sinh Mặc Văn | 61.433 | 94.964 | Thẻ Hồi Sinh ×2 |
| `hl_s4` | Kẻ Cướp Văn Thư | 155 | kill | Kim Giáp Thánh Trùng ×30 | Thư Sinh Mặc Văn | 119.220 | 96.200 | Bí Kíp Nhân Đôi |
| `hl_s5` | Thư Hỏi Thợ Săn | 157 | talk | mang tin tới Liệp Hộ Bạch Mao | Thư Sinh Mặc Văn (trả: Liệp Hộ Bạch Mao) | 85.158 | 98.696 | Rương Báu ×2, 10 lượng |
| `um_s1` | Đường Về Nhà | 160 | kill | Lân Quang Ma Cô ×25 | Tiều Phu Mạc Sầu | 113.357 | 102.500 | Canh Nhân Sâm ×2 |
| `um_s2` | Đèn Đi Đò Đêm | 162 | collect | Bào Tử Lân Quang ×10 | Tiều Phu Mạc Sầu | 121.466 | 105.076 | Đá Cường Hóa Thần |
| `um_s3` | Bến Đò Vong Xuyên | 164 | visit | Vong Xuyên Trúc Ảnh | Tiều Phu Mạc Sầu | 86.756 | 107.684 | Thẻ Hồi Sinh ×2 |
| `um_s4` | Hồn Thê Bị Giam | 166 | kill | Quỷ Diện Chu ×30 | Tiều Phu Mạc Sầu | 174.230 | 110.324 | Bí Kíp Nhân Đôi |
| `um_s5` | Bó Củi Trầm Tạ Ơn | 167 | talk | mang tin tới Thư Sinh Mặc Văn | Tiều Phu Mạc Sầu (trả: Thư Sinh Mặc Văn) | 120.196 | 111.656 | Rương Báu ×2, 10 lượng |
| `th_s1` | Tơ Mây Bị Cháy | 170 | kill | Tinh Đẩu Linh ×25 | Tiên Nữ Vân Cẩm | 159.732 | 115.700 | Bánh Bao Sức Mạnh ×2 |
| `th_s2` | Sợi Sao | 172 | collect | Tinh Sa ×10 | Tiên Nữ Vân Cẩm | 170.879 | 118.436 | Đá Cường Hóa Thần |
| `th_s3` | Khung Cửi Trên Cầu | 174 | visit | Ngân Hà Kiều | Tiên Nữ Vân Cẩm | 121.807 | 121.204 | Thẻ Hồi Sinh ×2 |
| `th_s4` | Đá Lưu Ly Phá Gấm | 175 | kill | Lưu Ly Tinh Thạch ×30 | Tiên Nữ Vân Cẩm | 236.112 | 122.600 | Bí Kíp Nhân Đôi |
| `th_s5` | Áo Gấm Cho Tiều Phu | 177 | talk | mang tin tới Tiều Phu Mạc Sầu | Tiên Nữ Vân Cẩm (trả: Tiều Phu Mạc Sầu) | 168.162 | 125.416 | Rương Báu ×2, 10 lượng |
| `hd_s1` | Thoát Khỏi Bầy Ma | 180 | kill | Hỗn Độn Tiểu Ma ×25 | Ma Nữ Dạ Lan | 222.566 | 129.700 | Trà Thiết Bích ×2 |
| `hd_s2` | Ma Tinh Vẽ Bùa | 182 | collect | Ma Tinh Hỗn Độn ×10 | Ma Nữ Dạ Lan | 237.397 | 132.596 | Đá Cường Hóa Thần |
| `hd_s3` | Tế Đàn Năm Xưa | 184 | visit | Tế Đàn Huyết Nguyệt | Ma Nữ Dạ Lan | 168.698 | 135.524 | Thẻ Hồi Sinh ×2 |
| `hd_s4` | Đồng Môn Cũ | 185 | kill | Ma Vực Thiết Kỵ ×30 | Ma Nữ Dạ Lan | 326.486 | 137.000 | Bí Kíp Nhân Đôi |
| `hd_s5` | Lời Xin Lỗi Muộn | 187 | talk | mang tin tới Tiên Nữ Vân Cẩm | Ma Nữ Dạ Lan (trả: Tiên Nữ Vân Cẩm) | 231.768 | 139.976 | Rương Báu ×2, 10 lượng |
| `tc_s1` | Tiên Tử Nghịch Ngợm | 190 | kill | Đào Hoa Tiên Tử ×25 | Tiên Đồng Ngọc Hư | 305.201 | 144.500 | Bánh Bao Sức Mạnh ×2 |
| `tc_s2` | Thuốc Cho Sư Phụ | 192 | collect | Linh Chi Tiên Thảo ×10 | Tiên Đồng Ngọc Hư | 324.418 | 147.556 | Đá Cường Hóa Thần |
| `tc_s3` | Đào Tiên Chín Nghìn Năm | 194 | visit | Bát Quái Đào Nguyên | Tiên Đồng Ngọc Hư | 229.734 | 150.644 | Thẻ Hồi Sinh ×2 |
| `tc_s4` | Thần Tượng Nứt Vỡ | 196 | kill | Bạch Ngọc Thần Tượng ×30 | Tiên Đồng Ngọc Hư | 457.229 | 153.764 | Bí Kíp Nhân Đôi |
| `tc_s5` | Thiệp Hội Ấn | 197 | talk | mang tin tới Ma Nữ Dạ Lan | Tiên Đồng Ngọc Hư (trả: Ma Nữ Dạ Lan) | 313.965 | 155.336 | Rương Báu ×2, 10 lượng |

Vòng tin (kỳ duyên `talk` cuối mỗi vùng): `xv_s5` Đan Sư → Ngư Ông · `bn_s5` Thợ Săn → Đan Sư · `hl_s5` Thư Sinh → Thợ Săn · `um_s5` Tiều Phu → Thư Sinh · `th_s5` Tiên Nữ → Tiều Phu · `hd_s5` Ma Nữ → Tiên Nữ · `tc_s5` Tiên Đồng → Ma Nữ. Riêng `bl_s5` là `collect` (vùng đầu không có vùng trước).

EXP kỳ duyên mỗi vùng ≈ 5,5-6,3% EXP cả dải 10 cấp (bl 181.345 = 5,6%; tc 1.630.547 = 6,3%).

---

## D. Lệnh Truy Nã và Tiểu Nhị (số mẫu)

Lệnh Truy Nã (`quest-truyna`, GDD mục 5 PvE; cùng module `sidequest`): 3 lệnh/ngày theo thứ tự săn 40 quái (8%) → thu 12 vật phẩm (8%) → hạ boss vùng (12%), EXP theo cấp lúc nhận lệnh, xu khóa `2.000 + 40·cấp` mỗi lệnh, lệnh thứ 3 thêm Rương Báu + Đá Cường Hóa Thần (khóa). Nhận ở Kỳ nhân vùng có `r.lv ≤ cấp ≤ r.lv + 19`, trả ở Kỳ nhân cùng vùng; sang ngày mới (giờ VN) lệnh dở bị hủy.

| Cấp | Săn quái / Thu thập (8%) | Diệt boss (12%) | Cả 3 lệnh/ngày | Xu khóa mỗi lệnh |
|---|---|---|---|---|
| 120 | 23.808 | 35.712 | 83.328 (28% cấp) | 6.800 |
| 130 | 29.266 | 43.898 | 102.430 (28% cấp) | 7.200 |
| 140 | 38.707 | 58.061 | 135.475 (28% cấp) | 7.600 |
| 150 | 53.592 | 80.388 | 187.572 (28% cấp) | 8.000 |
| 160 | 75.571 | 113.357 | 264.499 (28% cấp) | 8.400 |
| 170 | 106.488 | 159.732 | 372.708 (28% cấp) | 8.800 |
| 180 | 148.378 | 222.566 | 519.321 (28% cấp) | 9.200 |
| 190 | 203.467 | 305.201 | 712.135 (28% cấp) | 9.600 |
| 199 | 266.329 | 399.494 | 932.152 (28% cấp) | 9.960 |

Tiểu Nhị (`quest-daily-task`, `DAILY.reward` nhân `expScale` đúng `content/00-foundation.md` mục 2.3; nếu ADR-06-2 của GDD 06 được duyệt thì từ cấp 121 bỏ `expScale`, ví dụ cấp 199 còn 114.863 EXP, khoảng 3,5% một cấp):

| Cấp | EXP mỗi nhiệm vụ | % một cấp |
|---|---|---|
| 120 | 46.560 | 15,6% |
| 140 | 73.224 | 15,1% |
| 160 | 139.320 | 14,7% |
| 180 | 267.960 | 14,4% |
| 199 | 473.295 | 14,2% |

---

## E. Thoại (`src/shared/data/story.js`, `quest-lore`)

Mọi câu đã qua kiểm của `story-draft.js`: ≤ 140 ký tự, không từ cấm, khóa id có trong chuỗi chính (gồm `hg_q*`). Người nói là NPC `elder` đang đứng trước người chơi; vì nhiệm vụ Hạ Giới trả ở mọi Trưởng Làng, câu viết trung tính, không gọi tên làng của người nói.

### E.1 Cảnh mở đầu (`PROLOGUE`, 4 khung)

| Khung | Chữ |
|---|---|
| 1 | Ba nghìn năm trước, tám thần thú đặt Bát Phương Thiên Ấn, giam Hư Vô Ma Tôn xuống đáy trời. |
| 2 | Dưới trời là Hạ Giới. Ba làng Hỏa Vân, Thủy Nguyệt, Phong Lâm giữ nghề ninja, đời này truyền đời khác. |
| 3 | Đêm nay trăng đỏ như máu. Quái quanh làng bỗng hung dữ, có người thấy bóng áo đen đốt hương ở bìa rừng. |
| 4 | Trưởng Làng đang chờ ngươi. Con đường ninja bắt đầu từ đây. |

Câu kết (`EPILOGUE`, trưởng lão nói sau `tc_q10`): Chí Tôn Ninja, hai cõi nhớ ơn ngươi. Rảnh thì ghé thăm các Kỳ nhân, họ vẫn kể chuyện ngươi mỗi tối.

### E.2 Chương (`CHAPTERS`)

| id | Tên | Từ | Đến | Mở ở cấp | Tóm tắt (hồi ký) |
|---|---|---|---|---|---|
| `c1` | Tam Thôn Nhập Môn | `m1` | `m11` | 1 | Ngươi nhập môn đúng đêm trăng đỏ. Quái hiền quanh làng hóa dữ, kẻ cầm đầu bầy nhầy ở Rừng Trúc đã ngã. |
| `c2` | Sóng Biển Hang Dơi | `m12` | `m20` | 13 | Hải tặc, hồ ly chín đuôi, Dơi Chúa. Lần đầu ngươi nghe tên Huyết Nguyệt Giáo. |
| `c3` | Cát Vàng Cổ Mộ | `m21` | `m28` | 26 | Giáo phái đánh thức Sa Mạc Cổ Vương, để lại dấu trăng đỏ trên quan tài. |
| `c4` | Băng Sơn Tinh Thể | `m29` | `m37` | 43 | Tuyết lở do người gọi, lõi pha lê khắc dấu trăng đỏ. Ngươi học được Tuyệt Kỹ. |
| `c5` | Ma Lâm Hỏa Địa | `m38` | `m44` | 67 | Quỷ Vương mang lệnh bài của Ma Quân. Trấn Trưởng Vân Tùng kể chuyện hai đệ tử Phá Ma Tự. Cổng Địa Ngục đóng lại. |
| `c6` | Thiên Ngoại Long Cung | `m45` | `m51` | 96 | Thiên Ma săn Long Châu, Long Vương nhiễm ma khí. Long Châu mở Thiên Môn. |
| `c7` | Quần Đảo Bồng Lai | `bl_q1` | `bl_q9` | 120 | Thủy Ấn bị giấu trong Thận Lâu Ảo Cảnh. Hải Thị Thận Long đã yên giấc. |
| `c8` | Xích Viêm Hỏa Vực | `xv_q1` | `xv_q9` | 130 | Giáo phái rèn ma đao bằng lửa Ấn. Xích Diệm Dung Thần trả lại lửa cho lò trời. |
| `c9` | Vạn Niên Băng Nguyên | `bn_q1` | `bn_q9` | 140 | Đạo quân cổ dưới băng suýt tỉnh. Băng Ấn lạnh trở lại. |
| `c10` | Thiên Cổ Hoàng Lăng | `hl_q1` | `hl_q9` | 150 | Kẻ trộm mộ ếm bùa cả lăng. Vạn Cổ Thi Hoàng nằm xuống lần nữa. |
| `c11` | U Minh Quỷ Lâm | `um_q1` | `um_q9` | 160 | Câu Hồn Sứ bắt hồn nuôi Quỷ Vương. Những hồn bị giam đã thấy đường về. |
| `c12` | Tinh Hà Thiên Lộ | `th_q1` | `th_q9` | 170 | Sao máu mọc, Tinh Quân phản thiên. Tinh Ấn sáng lại. |
| `c13` | Hỗn Độn Ma Vực | `hd_q1` | `hd_q9` | 180 | Ma Quân hiến cả giáo phái cho Thao Thiết rồi chết trong bụng nó. Ám Ấn đã về. |
| `c14` | Thái Cực Thần Cảnh | `tc_q1` | `tc_q10` | 190 | Tám Ấn hội tụ, Hư Vô Ma Tôn bị phong ấn. Tên ngươi khắc trên Thánh Điện. |

`hg_q1`-`hg_q6` thuộc `c5` (nằm giữa `m43` và `m44`).

### E.3 Lời giao / lời trả (`LINES`, 46 cặp đợt đầu)

| Nhiệm vụ | Người nói | Lời giao (khi mở hội thoại nhận) | Lời trả (khi nhận thưởng) |
|---|---|---|---|
| `m1` | Trưởng Làng / Trấn Trưởng | Muốn làm ninja à? Ta không nhận kẻ chỉ ham kiếm sắc. Đội nón này vào, rồi chứng minh ngươi biết giữ làng. | Từ nay ngươi là đệ tử Tam Thôn. Đừng làm ta xấu hổ. |
| `m11` | Trưởng Làng / Trấn Trưởng | Bầy quái nhầy ở Rừng Trúc có một con cầm đầu, to như cái chum. Hạ nó, dân làng mới dám vào rừng chặt trúc. | Giỏi. Nhưng lạ thật, quái hiền thế sao bỗng hóa dữ. Trăng đêm qua đỏ quá. |
| `m12` | Trưởng Làng / Trấn Trưởng | Thuyền buôn ở Bờ Biển San Hô không về. Ra đó xem sao, tiện nhặt vỏ cua về làm khiên. | Cua cứng thế này thì hải tặc còn cứng hơn. Cẩn thận. |
| `m17` | Trưởng Làng / Trấn Trưởng | Hồ ly chín đuôi trong Vườn Anh Đào mê hoặc người qua đường. Rủ đồng đội đi cùng, một mình ngươi sẽ bị nó dắt mũi. | Trước khi tan nó nói "trăng máu sắp lên". Ta không thích câu ấy chút nào. |
| `m20` | Trưởng Làng / Trấn Trưởng | Dơi Chúa trong Hang Dơi hút máu gia súc cả ba làng. Hạ nó, ta sẽ kể ngươi nghe chuyện cái hang ấy. | Hang Dơi từng là chỗ tu của bọn ninja phản đồ. Chúng tự xưng Huyết Nguyệt Giáo. |
| `m21` | Trưởng Làng / Trấn Trưởng | Thương đoàn kể có kẻ đào phế tích ban đêm ở Hoang Mạc Cát. Gom ít Cát Vàng, tiện dò la xem sao. | Cát này lẫn tro hương. Có kẻ đang làm lễ giữa sa mạc. |
| `m27` | Trưởng Làng / Trấn Trưởng | Trong Phế Tích Cổ, một vị vua cát vừa bị đánh thức. Phong ấn hắn lại trước khi cát vùi cả hoang mạc. | Trên quan tài có vẽ vầng trăng đỏ. Huyết Nguyệt Giáo đã tới đó trước ngươi. |
| `m28` | Trưởng Làng / Trấn Trưởng | Lang Vương ở Thung Lũng Sương dẫn bầy sói ra tận cổng làng. Đi đi, ta giữ cửa cho. | Ngươi lớn thật rồi. Phía bắc là Núi Tuyết, gió ở đó lạnh như dao. |
| `m29` | Trưởng Làng / Trấn Trưởng | Người Tuyết trên Núi Tuyết nổi giận đánh cả thợ săn. Dẹp 25 tên, xem ai đứng sau. | Có kẻ đốt hương trên đỉnh gọi tuyết lở. Mùi hương ấy giống hệt ở sa mạc. |
| `m35` | Trưởng Làng / Trấn Trưởng | Tuyết Quái Vương giữ Đỉnh Băng Giá như giữ nhà. Hạ nó, rồi về đây học Tuyệt Kỹ. | Thân thủ ngươi đủ học Tuyệt Kỹ rồi. Đừng để sức mạnh làm mờ mắt. |
| `m37` | Trưởng Làng / Trấn Trưởng | Tinh Thể Vương trong Hang Pha Lê hút linh khí cả dãy núi. Đập vỡ lõi của nó. | Lõi pha lê khắc dấu trăng đỏ. Bọn chúng đang nuôi thứ gì đó dưới Rừng Ma. |
| `m38` | Trưởng Làng / Trấn Trưởng | Đường xuống Rừng Ma toàn quỷ dữ. Gặp Thợ Rèn nâng một món lên +10 rồi hẵng đi. | Thép tốt. Đi đi, đừng ngoái lại. |
| `m42` | Trưởng Làng / Trấn Trưởng | Quỷ Vương trong Hang Quỷ nhận lệnh của Huyết Nguyệt Giáo. Hạ hắn, chặt cánh tay đầu tiên của chúng. | Trên người hắn có lệnh bài khắc chữ "Ma Quân". Kẻ cầm đầu giáo phái đã có tên. |
| `hg_q1` | Trưởng Làng / Trấn Trưởng | Đêm nào dưới Cổng Địa Ngục cũng có tiếng xương khua. Xuống Huyệt Vạn Cốt xem cho ta. | Xương người, xương thú, xương cả ninja. Có kẻ gọi chúng dậy. |
| `hg_q4` | Trưởng Làng / Trấn Trưởng (lời trả: Vân Tùng) | Trấn Trưởng Vân Tùng ở Trấn Vân Môn từng gặp kẻ cầm đầu giáo phái khi hắn còn trẻ. Đi nghe ông kể. | Ma Quân từng là đệ tử Phá Ma Tự, tên Huyết Nguyệt. Hắn muốn mở cửa trời gọi một thứ còn đáng sợ hơn. |
| `hg_q5` | Trưởng Làng / Trấn Trưởng | Giáo phái dùng máu Huyết Hồ nuôi Huyết Ma Vương. Gọi đồng đội, hạ hắn trước khi hồ cạn. | Hồ đã trong lại. Giờ chỉ còn Ma Thần chắn Cổng Địa Ngục. |
| `m44` | Trưởng Làng / Trấn Trưởng | Ma Thần trấn Cổng Địa Ngục là cửa ải cuối trước Thiên Cung. Giáo phái muốn hắn mở toang cổng. | Cổng Địa Ngục đã đóng. Con đường lên Thiên Cung mở cho ngươi. |
| `m45` | Trưởng Làng / Trấn Trưởng | Qua Trấn Vân Môn là Thiên Cung. Thiên binh không đón khách, ngươi phải tự chứng minh. | Thiên binh đã cúi đầu chào ngươi. Hiếm lắm đấy. |
| `m48` | Trưởng Làng / Trấn Trưởng | Thiên Ma chiếm Ma Giới, mượn tay giáo phái tìm Long Châu. Không được để hắn chạm tới Long Cung. | Thiên Ma nói Long Vương đang giữ chìa khóa của trời. Mau tới Long Cung. |
| `m50` | Trưởng Làng / Trấn Trưởng | Long Vương bị ma khí ăn mòn, không còn nhận ra ai. Giải thoát cho ngài. | Long Vương tan biến, để lại Long Châu. Ánh châu chỉ về phía đông Long Cung. |
| `m51` | Trưởng Làng / Trấn Trưởng | Luyện tới cấp 120 đi. Khi ấy Long Châu sẽ mở cho ngươi một cánh cửa. | Cửa trời đã mở. Thượng Giới đang đợi ngươi, Ninja Huyền Thoại. |
| `bl_q2` | Tiên Ông Bạch Hạc | Ta là Bạch Hạc, giữ Thủy Ấn ba nghìn năm. Tám Ấn giam một kẻ không được phép tỉnh. Nay một Ấn đã vấy máu. | Cầm lấy binh khí này. Ở Thượng Giới, thép Hạ Giới chỉ như que củi. |
| `bl_q7` | Tiên Ông Bạch Hạc | Thận Long là bạn cũ của ta. Ma khí làm nó quên mình là ai. Đánh nhanh, đừng để nó đau lâu. | Thủy Ấn đã sạch. Một Ấn xong, còn bảy. Ma Quân sẽ không ngồi yên đâu. |
| `bl_q9` | Tiên Ông Bạch Hạc | Biển phía đông đang sôi, đó là Hỏa Ấn loạn. Luyện tới cấp 130 rồi hẵng sang. | Đi đi. Hỏa Công Đầu Đà nóng tính, nhưng lòng ông ấy trong. |
| `xv_q2` | Hỏa Công Đầu Đà | Từ Bồng Lai tới à? Lão Bạch Hạc chỉ giỏi đánh cờ. Ở đây ta dạy bằng lửa. | Thanh binh khí này tôi trong lò lửa trời. Đừng làm mẻ nó. |
| `xv_q7` | Hỏa Công Đầu Đà | Dung Thần nuốt lửa Ấn, lớn hơn mỗi ngày. Đánh nhanh, đánh mạnh, đừng đứng trong vết nứt. | Lửa Ấn đã về lò. Ta nợ ngươi một chén rượu nóng. |
| `xv_q9` | Hỏa Công Đầu Đà | Lửa yên rồi thì băng lại động. Luyện tới cấp 140, sang băng nguyên phía đông. | Gặp Băng Tâm Sư Thái thì đừng đùa. Bà ấy không biết cười. |
| `bn_q2` | Băng Tâm Sư Thái | Dưới băng là một đạo quân cổ. Chúng ngủ nhờ Băng Ấn. Ấn tan thì chúng tỉnh, và chúng không phân biệt ai. | Binh khí này lạnh như băng, chém không để lại vết máu. |
| `bn_q7` | Băng Tâm Sư Thái | Thiên Lang canh hồ nghìn năm. Tiếng hú của nó giờ là tiếng của ma khí. Xuống hồ, kết thúc nỗi đau ấy. | Băng Ấn lạnh trở lại. Đạo quân dưới băng lại ngủ yên. |
| `bn_q9` | Băng Tâm Sư Thái | Cửa lăng phía đông vừa hé. Luyện tới cấp 150 rồi đi, kẻ giữ lăng đang đợi. | Thủ Lăng Lão Nhân trọng lễ. Cúi chào trước khi nói. |
| `hl_q2` | Thủ Lăng Lão Nhân | Dòng họ ta giữ lăng ba mươi đời. Đời ta lại để giáo phái lọt vào. Ngươi giúp ta rửa nhục. | Thanh binh khí này chôn cùng một vị tướng. Ông ấy sẽ vui khi nó được dùng lại. |
| `hl_q7` | Thủ Lăng Lão Nhân | Thi Hoàng ôm Thổ Ấn như ôm ngai vàng, tưởng mình còn là vua. Nhắc cho hắn nhớ hắn đã chết. | Thổ Ấn đã về. Lăng có thể ngủ thêm nghìn năm nữa. |
| `hl_q9` | Thủ Lăng Lão Nhân | Lối đông thông vào rừng ma. Luyện tới cấp 160, mang theo đèn. | Trong rừng ấy chỉ tin một ngọn đèn xanh. Nhớ lấy. |
| `um_q2` | Thanh Đăng Đạo Nhân | Trong rừng này đừng theo ánh sáng nào ngoài đèn của ta. Ánh khác đều là quỷ dụ người. | Binh khí này đã được ta niệm chú. Quỷ thấy nó sẽ lùi. |
| `um_q7` | Thanh Đăng Đạo Nhân | Quỷ Vương nuôi mình bằng hồn người. Mỗi lần hắn gầm là một hồn mất. Hạ hắn trước khi trăng lên. | Những hồn bị giam đã thấy đường về. Mộc Ấn xanh lại rồi. |
| `um_q9` | Thanh Đăng Đạo Nhân | Từ ngọn trúc cao nhất có lối lên trời sao. Luyện tới cấp 170 rồi trèo. | Lão Tổ trên ấy hay nói số. Nghe cho kỹ, ông ấy hiếm khi sai. |
| `th_q2` | Quan Tinh Lão Tổ | Ta xem sao năm trăm năm, chưa thấy sao nào đỏ như máu. Có kẻ đang kéo trời đổ xuống. | Binh khí này đúc từ sao rơi. Đừng để nó chạm nước. |
| `th_q7` | Quan Tinh Lão Tổ | Tinh Quân từng là tướng trời, nay theo Ma Quân vì muốn làm vua sao. Coi chừng, hắn đánh từ trên cao xuống. | Sao máu đã tắt, Tinh Ấn sáng lại. Nhưng cuối cầu Ngân Hà, ma khí đặc như mực. |
| `th_q9` | Quan Tinh Lão Tổ | Đầu cầu bên kia là sào huyệt giáo phái. Luyện tới cấp 180 rồi qua cầu. | Phá Ma Thiền Sư đang đợi ngươi ở đó. Ông ấy có món nợ riêng với Ma Quân. |
| `hd_q2` | Phá Ma Thiền Sư | Ma Quân từng là sư đệ của ta. Ta đã không giữ được hắn. Lần này ta không để hắn đi xa hơn. | Binh khí này ta giữ ba mươi năm, chờ người đủ sức cầm. |
| `hd_q7` | Phá Ma Thiền Sư | Ma Quân hiến cả giáo phái cho Thao Thiết rồi tự vào bụng nó. Hạ con thú ấy, ngươi sẽ gặp sư đệ ta lần cuối. | Hắn chết mà mỉm cười. Có lẽ hắn cũng mệt rồi. Ám Ấn đã về. |
| `hd_q9` | Phá Ma Thiền Sư | Sau điện là Vân Môn của Thần Cảnh. Luyện tới cấp 190 rồi mở cửa bằng Oán Hồn Châu. | Đi đi. Phần còn lại của giáo phái, ta lo. |
| `tc_q2` | Thái Cực Chân Nhân | Bảy Ấn đã sạch nhờ ngươi. Thái Cực Ấn là Ấn cuối, cũng là cái khóa chính giam Ma Tôn. | Binh khí Chí Tôn. Ba nghìn năm chưa ai cầm nó ra trận. |
| `tc_q7` | Thái Cực Chân Nhân | Ngọc Hồ là đệ tử út của ta. Ma khí ăn vào nó trước khi ta kịp nhận ra. Hãy đưa nó về. | Ngọc Hồ đã ngủ yên. Tám Ấn đã đủ. Giờ là lúc đối mặt Ma Tôn. |
| `tc_q9` | Thái Cực Chân Nhân | Ma Tôn sắp phá phong ấn. Tám Ấn chỉ khép lại được nếu hắn ngã xuống trước. Gọi đồng đội, vào Thánh Điện. | Thiên Ấn đã khép. Hai cõi bình yên. Ngươi làm được điều ba nghìn năm không ai làm được. |
| `tc_q10` | Thái Cực Chân Nhân | Chỉ còn một bước: đạt cấp 199. Khi ấy tên ngươi sẽ khắc lên Thánh Điện. | Từ hôm nay ngươi là Chí Tôn Ninja. Ta không còn gì để dạy ngươi nữa. |

Kỳ duyên đã có lời cảm ơn riêng (trường `done` của lệnh `sq`, `content/30-quests.md` mục 8), không lặp lại ở đây.

---

## F. Câu hỏi mở

Câu hỏi chung của chuỗi nhiệm vụ nằm ở [`08-cot-truyen.md`](08-cot-truyen.md) mục 12; dưới đây chỉ là câu hỏi về cách đọc và cập nhật các bảng của phụ lục.

| # | Câu hỏi | Phương án mặc định |
|---|---|---|
| F1 | Nếu `<prefix>_q7` hạ về hệ số 0,6 (GDD 06 Câu hỏi mở Q10), bảng A đổi những số nào? | Chỉ đổi cột EXP của 8 dòng `bl_q7`, `xv_q7`, `bn_q7`, `hl_q7`, `um_q7`, `th_q7`, `hd_q7`, `tc_q7` thành số của `content/30-quests.md` (200.098 / 257.725 / 351.626 / 493.609 / 696.921 / 976.250 / 1.347.726 / 1.828.915), tổng A.0 thành EXP 27.657.252; xu khóa, lượng, vật phẩm giữ nguyên. Sinh lại bằng `gddwork/lab/q08/gen-md.js`, không sửa tay |
| F2 | Bảng B (`hg_q1`-`hg_q6`) có tính vào sàn ≥ 120 nhiệm vụ chính không? | **Không**: sàn đã đạt bằng 124 dòng của bảng A; bảng B chỉ vào dữ liệu khi ADR-08-1 được duyệt và khi đó tổng thành 130 |
| F3 | Tên quái/boss Hạ Giới trong bảng A ghi theo tên hiện tại hay tên sau `quest-npc-rename`? | **Tên hiện tại** (khớp dữ liệu và kiểm thử hôm nay); khi lô đổi tên xong thì sinh lại bảng A, id không đổi |
| F4 | Bảng D (Lệnh Truy Nã, Tiểu Nhị) là số chốt hay số mẫu? | **Số mẫu** tính từ công thức; số chốt là công thức trong `content/30-quests.md` mục 6 và `content/00-foundation.md` mục 2.3. Khi ADR-06-2 được duyệt, sinh lại cột Tiểu Nhị theo công thức không `expScale` |
| F5 | Lời giao/trả (mục E) cho nhiệm vụ chưa có dòng trong `LINES` lấy ở đâu? | Dùng câu chung hiện có của `modules/quest`; thêm dần theo chương, mỗi câu qua `story-draft.js` (≤ 140 ký tự, không từ cấm) |
