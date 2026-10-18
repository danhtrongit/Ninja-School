'use strict';

// Kiểm thử scripts/verify.js: chép cây mã vào thư mục tạm, gây từng lỗi, chạy --quick --root và xem mã thoát.
// Chạy riêng: node tests/features/verify.js (không thuộc npm test vì chép tốn thời gian).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const VERIFY = path.join(ROOT, 'scripts', 'verify.js');
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✘'} ${msg}`); if (!cond) failures++; };

function copyTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-verify-copy-'));
  for (const p of ['src', 'tests', 'tools', 'scripts', 'docs', 'CLAUDE.md', 'package.json']) {
    fs.cpSync(path.join(ROOT, p), path.join(dir, p), { recursive: true, filter: (s) => !s.startsWith(path.join(ROOT, 'src', 'client', 'audio') + path.sep) });
  }
  return dir;
}
const verify = (dir, extra = []) => spawnSync(process.execPath, [VERIFY, '--quick', '--root', dir, ...extra], { encoding: 'utf8' });
const edit = (dir, f, fn) => { const p = path.join(dir, f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };

function main() {
  console.log('\n[verify] lệnh kiểm chứng một chạm');
  const t0 = Date.now();
  const clean = spawnSync(process.execPath, [VERIFY, '--quick'], { encoding: 'utf8' });
  const sec = (Date.now() - t0) / 1000;
  ok(clean.status === 0 && clean.stdout.includes('KIỂM CHỨNG ĐẠT'), `--quick trên cây hiện tại: mã 0 (${clean.status})`);
  ok(sec <= 15, `--quick xong trong ≤ 15 giây (${sec.toFixed(1)} s)`);
  ok(['1 Cú pháp', '2 Dữ liệu', '3 Id DOM', '4 API công khai', '5 Quy tắc tĩnh', '6 Sàn nội dung', '7 Kiểm thử bot'].every((s) => clean.stdout.includes(s)) && /– 7 Kiểm thử bot[^\n]*\n\s+bỏ qua/.test(clean.stdout), '--quick in bảng các bước, bước 7 "bỏ qua"');

  const floor = spawnSync(process.execPath, [VERIFY, '--quick', '--floor'], { encoding: 'utf8' });
  const lack = floor.stdout.split('\n').filter((l) => l.trim().startsWith('thiếu sàn:'));
  // mỗi mục sàn chưa đạt ở bảng --quick (dòng '·') phải có đúng một dòng 'thiếu sàn' khi chạy --floor
  const unmet = clean.stdout.split('\n').filter((l) => l.trim().startsWith('· '));
  ok(floor.status === (unmet.length ? 1 : 0) && lack.length === unmet.length && unmet.every((u) => lack.some((l) => l.includes(u.trim().slice(2).split(':')[0]))),
    `--floor trên cây hiện tại: mã ${floor.status}, đúng một dòng thiếu sàn cho mỗi mục chưa đạt (${lack.length}/${unmet.length})`);

  const cases = [
    ['xóa id="hud-map" khỏi index.html', (d) => edit(d, 'src/client/index.html', (s) => s.replace('id="hud-map"', 'id="hud-mapx"')), [], (r) => r.stdout.includes('#hud-map')],
    ['thêm confirm( vào một cửa sổ', (d) => edit(d, 'src/client/js/ui/windows/mail.js', (s) => s + '\nexport const _x = () => confirm(\'x\');\n'), [], (r) => /src\/client\/js\/ui\/windows\/mail\.js:\d+ confirm/.test(r.stdout)],
    ['lỗi cú pháp ở file client', (d) => edit(d, 'src/client/js/ui/windows/mail.js', (s) => s + '\nexport const = ;\n'), [], (r) => r.stdout.includes('windows/mail.js')],
    ['xóa export function drawNinja', (d) => edit(d, 'src/client/js/render/sprites.js', (s) => s.replace('export function drawNinja', 'function drawNinja')), [], (r) => r.stdout.includes('drawNinja')],
    ['client import src/shared', (d) => edit(d, 'src/client/js/ui/windows/mail.js', (s) => 'import \'../../../../shared/constants.js\';\n' + s), [], (r) => r.stdout.includes('client import src/shared')],
    ['innerHTML gán dữ liệu', (d) => edit(d, 'src/client/js/ui/windows/mail.js', (s) => s + '\nexport const _y = (el, v) => { el.innerHTML = v; };\n'), [], (r) => r.stdout.includes('innerHTML')],
    ['file server thiếu \'use strict\'', (d) => edit(d, 'src/server/modules/checkin/index.js', (s) => s.replace("'use strict';", '')), [], (r) => r.stdout.includes("thiếu 'use strict'")],
    ['dùng var trong src', (d) => edit(d, 'src/server/modules/checkin/index.js', (s) => s + '\nvar zz = 1;\n'), [], (r) => r.stdout.includes('dùng var')],
    ['xóa docs/features.json rồi chạy --floor', (d) => fs.rmSync(path.join(d, 'docs', 'features.json')), ['--floor'], (r) => r.stdout.includes('features.json')],
  ];
  for (const [name, mutate, extra, seen] of cases) {
    const dir = copyTree();
    try {
      const base = verify(dir, extra.filter((x) => x !== '--floor'));
      mutate(dir);
      const r = verify(dir, extra);
      ok(base.status === 0 && r.status === 1 && seen(r), `${name} → mã 1 và chỉ ra chỗ lỗi (trước ${base.status}, sau ${r.status})`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  console.log(failures ? `\nTHẤT BẠI: ${failures} kiểm tra lỗi` : '\nTẤT CẢ KIỂM TRA ĐỀU ĐẠT');
  process.exit(failures ? 1 : 0);
}

if (require.main === module) main();
module.exports = { main };
