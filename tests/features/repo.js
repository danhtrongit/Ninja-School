'use strict';

// Lịch sử git của main (T0.01/T0.02, docs/DECISIONS.md D-01): đủ nhóm commit đúng thứ tự, không commit tạm, không đưa file cấm vào repo
const path = require('path');
const { execFileSync } = require('child_process');
const { ok } = require('../lib/harness');

const ROOT = path.join(__dirname, '..', '..');
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { return null; } };

// tiêu đề các nhóm commit theo D-01, đúng thứ tự từ cũ tới mới
const GROUPS = [
  'Đợt 1, 2A, 2B: lôi đài, hộp thư',
  'Tái cấu trúc mã nguồn sang src/',
  'Mở rộng túi bằng lượng, hủy nhanh nhiều món',
  'Hành trang chia trang 40 ô',
  'Âm thanh: 25 nhạc nền',
  'Đồ họa: màu nhân vật bậc 12-19',
  'Xu khóa và vật phẩm khóa',
  'Sửa lỗi server khi gói có id NPC',
];

function repoUnitTests() {
  console.log('Kho mã (git): nhóm commit trên main, không commit tạm, không file cấm');
  const log = git('log', '--format=%H %s', '--reverse', 'HEAD');
  if (log == null) { ok(false, 'đọc được git log (cần chạy trong repo git)'); return; }
  const lines = log.trim().split('\n');
  const idx = GROUPS.map((g) => lines.findIndex((l) => l.slice(41).startsWith(g)));
  ok(idx.every((i) => i >= 0) && idx.every((v, i) => !i || v > idx[i - 1]), `main có đủ ${GROUPS.length} nhóm commit D-01 theo đúng thứ tự (${idx.join(' < ')})`);
  ok(!lines.some((l) => /^tạm\b|tạm: ảnh chụp/i.test(l.slice(41))), "không có commit mang tên 'tạm: ảnh chụp'");
  const files = (git('ls-files') || '').split('\n');
  const bad = files.filter((f) => f === 'NOTE.md' || /^data\//.test(f) || /^node_modules\//.test(f) || /\.(png|jpe?g)$/i.test(f) && !/^(docs\/shots|src\/client|tests\/baseline)\//.test(f));
  ok(bad.length === 0, `repo không chứa NOTE.md, data/, node_modules/, ảnh chụp ngoài docs/shots (${bad.slice(0, 5).join(', ') || 'sạch'})`);
  ok(files.includes('src/client/audio/CREDITS.md') && files.some((f) => f.startsWith('src/client/audio/music/')), 'nhóm âm thanh có src/client/audio (nhạc nền + CREDITS.md)');
  // cây sau nhóm âm thanh trùng cây đã kiểm a4b4a0a cộng thư mục âm thanh (chỉ kiểm được khi có đối tượng của mốc cũ)
  const audio = lines.find((l) => l.slice(41).startsWith('Âm thanh: 25 nhạc nền'));
  if (audio && git('cat-file', '-e', 'a4b4a0a^{tree}') != null) {
    const d = git('diff', '--name-only', 'a4b4a0a', audio.slice(0, 40), '--', '.', ':!src/client/audio');
    ok(d === '', `cây sau nhóm âm thanh trùng cây a4b4a0a ngoài src/client/audio (${d === '' ? 'không khác' : d.split('\n').length + ' file khác'})`);
  }
  // DESIGN_RULES.md khớp hằng số trong code
  const dr = require('fs').readFileSync(path.join(ROOT, 'DESIGN_RULES.md'), 'utf8');
  const { INV_EXPAND } = require('../../src/shared/constants');
  const row = dr.split('\n').find((l) => l.startsWith('| Hành trang |')) || '';
  ok(row.includes('INV_EXPAND') && INV_EXPAND.cost.every((c) => row.includes(` ${c} `) || row.includes(` ${c} lượng`)), `DESIGN_RULES.md mục 9 có hàng 'Hành trang' ghi INV_EXPAND và giá từng lần (${INV_EXPAND.cost.join('/')})`);
  ok(/hộp xác nhận `ask\(\)` 90/.test(dr), 'DESIGN_RULES.md mục 8 có lớp z-index 90 cho hộp xác nhận');
  const ci = require('fs').readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  ok(/node-version:\s*24\b/.test(ci) && /npm run verify\b/.test(ci), 'CI chạy npm run verify với node 24');
  // phủ kiểm thử: mọi hành động router có ít nhất một tests/features/*.js gửi tới (scripts/lib/coverage.js, bước 6b của verify)
  const cov = require('../../scripts/lib/coverage').stepCoverage(ROOT, false);
  ok(cov.ok, `phủ kiểm thử: ${cov.lines[0]}${cov.ok ? '' : ` (${cov.lines.filter((l) => l.startsWith('THIẾU')).join('; ')})`}`);
  // bản sao sạch (verify trên clone): src, tests, tools không có thay đổi chưa commit
  if (process.env.NS_CLEAN_CLONE === '1') {
    const st = git('status', '--short', '--', 'src', 'tests', 'tools');
    ok(st === '', `git status --short src tests tools rỗng trên bản sao (${st === '' ? 'sạch' : st.split('\n').length + ' dòng'})`);
  }
}

module.exports = { repoUnitTests };
