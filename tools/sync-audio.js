'use strict';

// Chép file nhạc nền đã tạo (ngoài repo) vào src/client/audio/music và ghi CREDITS.md theo nguồn từng file.
// Tiếng hiệu ứng không dùng file: tổng hợp bằng WebAudio ở src/client/js/core/sound.js.
// Dùng: node tools/sync-audio.js [thư mục out]   (mặc định ~/.local/share/ninja-audio/out, có music/ chứa <id>.ogg, <id>.m4a, <id>.json)
// Chỉ chép id có trong bảng âm thanh (src/shared/data/audio.js) để không lọt file thử nghiệm vào game.
const fs = require('fs');
const os = require('os');
const path = require('path');
const AUDIO = require('../src/shared/data/audio');

const SRC = path.resolve(process.argv[2] || path.join(os.homedir(), '.local/share/ninja-audio/out'));
const DST = path.join(__dirname, '..', 'src', 'client', 'audio');
const used = {
  music: new Set([AUDIO.MUSIC_DEFAULT, ...Object.values(AUDIO.MUSIC_THEME), ...Object.values(AUDIO.MUSIC_SCENE)]),
};

const credits = [];
let copied = 0;
for (const kind of ['music']) {
  const from = path.join(SRC, kind);
  if (!fs.existsSync(from)) continue;
  fs.mkdirSync(path.join(DST, kind), { recursive: true });
  for (const f of fs.readdirSync(from).sort()) {
    const m = /^([a-z0-9_]+)\.(ogg|m4a)$/.exec(f);
    if (!m || !used[kind].has(m[1])) continue;
    const src = path.join(from, f);
    const dst = path.join(DST, kind, f);
    const st = fs.statSync(src);
    if (!fs.existsSync(dst) || fs.statSync(dst).size !== st.size) {
      fs.copyFileSync(src, dst);
      copied++;
    }
    if (m[2] !== 'ogg') continue;
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(from, `${m[1]}.json`), 'utf8'));
    } catch (e) {
      /* thiếu thông tin nguồn: vẫn ghi tên file */
    }
    credits.push(`| ${kind} | ${m[1]} | ${meta.model || '?'} | ${String(meta.prompt || '').replace(/\|/g, '/')} |`);
  }
}

if (credits.length) {
  fs.writeFileSync(path.join(DST, 'CREDITS.md'), [
    '# Nguồn âm thanh',
    '',
    'Toàn bộ file được tạo bằng model sinh âm thanh chạy trên máy của nhóm phát triển, không lấy từ game khác.',
    '',
    '- Nhạc nền: ACE-Step 1.5 (giấy phép MIT).',
    '- Tiếng hiệu ứng: Stable Audio 3 Small SFX, Stability AI Community License. **Powered by Stability AI.**',
    '  Dùng thương mại khi doanh thu năm dưới 1 triệu USD cần đăng ký miễn phí với Stability AI.',
    '',
    '| Loại | Id | Model | Mô tả tạo |',
    '|---|---|---|---|',
    ...credits,
    '',
  ].join('\n'));
}
console.log(`Đã chép ${copied} file mới vào ${path.relative(process.cwd(), DST) || DST}; ${credits.length} id có bản .ogg.`);
