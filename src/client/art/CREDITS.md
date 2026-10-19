# Nguồn ảnh ×3

Mọi ảnh trong thư mục này do dự án tự tạo bằng Cloudflare Workers AI, model FLUX.2 klein 4B (giấy phép Apache 2.0), không lấy từ game hay nguồn khác (DESIGN_RULES.md mục 11). Ảnh nguồn 1024×1024 được tách nền, cắt mảnh, dựng khung xương mảnh cứng (chỉ xoay và dời) rồi thu về pixel ×3 với bảng màu cố định và viền ngoài `#1d1424`.

Mọi prompt bắt đầu bằng câu phong cách chung, dán nguyên văn:

> 2D mobile RPG game art, Japanese ninja fantasy world, chibi proportions, thick dark brown outline, cel shading with three tones, light from top-left, vibrant saturated colors, clean simple shapes, full body side view facing left, single character centered, isolated on a plain flat white background, no ground shadow, no text

Cột "Mô tả" là phần nối sau câu phong cách (prompt đầy đủ = câu phong cách + ". " + mô tả).

| Atlas | Model | Seed | Ngày | Ảnh tham chiếu | Mô tả |
|---|---|---|---|---|---|
| monster/hellhound | @cf/black-forest-labs/flux-2-klein-4b | 303 | 2026-10-18 | không | Monster: a fierce black hellhound wolf with glowing orange lava cracks across its dark fur, a blazing flame mane on its neck and a flame-tipped tail, standing pose with all four legs straight and clearly separated, mouth closed |
| monster/deathknight | @cf/black-forest-labs/flux-2-klein-4b | 11 | 2026-10-18 | không | Monster: a death knight warrior in heavy black plate armor with glowing toxic green runes, a tattered dark green cape, horned skull-shaped helmet with glowing green eyes, holding a large greatsword pointed down in the front hand, standing upright in profile, legs slightly apart, arms held slightly away from the body |
| monster/darkdragon | @cf/black-forest-labs/flux-2-klein-4b | 33 | 2026-10-18 | không | Monster: a dark dragon walking on four legs, deep indigo scales with violet highlights, small bat wings folded on its back, glowing red eyes and red horns, long thick tail, all four legs straight and clearly separated, mouth closed |
| boss/boss_god | @cf/black-forest-labs/flux-2-klein-4b | 44 | 2026-10-18 | không | Monster: a towering demon god boss, dark purple-black armor with glowing violet energy veins, large curved horns, flowing dark cape, glowing crimson eyes, holding a huge dark scythe staff upright in the front hand, standing upright in profile, legs slightly apart, arms held slightly away from the body |
