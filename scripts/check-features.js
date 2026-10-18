'use strict';

// Kiểm sổ tính năng docs/features.json: npm run check:features
// - cấu trúc: id không trùng, ưu tiên/trạng thái hợp lệ, phụ thuộc tồn tại; "blocked" phải có trong docs/DECISIONS.md
// - mục "done": mọi file trong `tests` tồn tại; mỗi dòng `acceptance` có ≥ 1 bằng chứng trong `proof` (cùng chỉ số),
//   dạng "<file test> :: <đoạn nhãn>", và nhãn đó xuất hiện trên một dòng "✔" của log lần chạy test tương ứng.
// Log lấy từ VERIFY_LOGS (thư mục log của npm run verify); không có thì tự chạy các test không cần trình duyệt.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LOGS = process.env.VERIFY_LOGS || null;
// log của bước không chạy (verify --no-browser / --no-load): bằng chứng trong đó không kiểm, chỉ ghi chú
const SKIP = new Set((process.env.VERIFY_SKIP || '').split(',').filter(Boolean));
const PRIORITY = ['Must', 'Should', 'Could', "Won't"];
const STATUS = ['todo', 'doing', 'done', 'blocked'];
const errs = [];
const err = (m) => errs.push(m);

// File test → các log chứa kết quả của nó
const LOG_OF = {
  'tests/smoke.js': ['smoke.log'],
  'tools/check-data.js': ['check.log'],
  'tests/e2e/e2e.js': ['e2e-d.log', 'e2e-m.log'],
  'tests/e2e/ui-multiplayer.js': ['ui.log'],
  'tests/e2e/perf.js': ['perf-d.log', 'perf-m.log'],
  'tests/e2e/gallery.js': ['visual.log'],
  'tests/e2e/sfx.js': ['sfx.log'],
  'tests/e2e/ui-audit.js': ['ui-audit.log'],
  'tests/prod/smoke-prod.js': ['prod.log'],
  'tests/load/load.js': ['load.log'],
  'tests/load/persist-bench.js': ['persist.log'],
  'tests/load/crash.js': ['smoke.log'],
  'tests/features/verify.js': ['verify-self.log'],
  'scripts/verify.js': ['verify.log'],
};
const logsFor = (file) => LOG_OF[file] || (file.startsWith('tests/features/') ? ['smoke.log'] : null);
const BROWSER_LOGS = new Set(['verify.log', 'e2e-d.log', 'e2e-m.log', 'ui.log', 'perf-d.log', 'perf-m.log', 'visual.log', 'sfx.log', 'ui-audit.log', 'load.log', 'persist.log', 'prod.log']);

let fj;
try { fj = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'features.json'), 'utf8')); } catch (e) {
  console.log(`✘ docs/features.json: ${e.message}`);
  process.exit(1);
}
const decisions = fs.existsSync(path.join(ROOT, 'docs', 'DECISIONS.md')) ? fs.readFileSync(path.join(ROOT, 'docs', 'DECISIONS.md'), 'utf8') : '';
const ids = new Set();
for (const f of fj) {
  if (!f.id || ids.has(f.id)) err(`id trùng hoặc rỗng: ${f.id}`);
  ids.add(f.id);
}
const needLogs = new Set();
for (const f of fj) {
  const at = `[${f.id}]`;
  if (!PRIORITY.includes(f.priority)) err(`${at} ưu tiên lạ: ${f.priority}`);
  if (!STATUS.includes(f.status)) err(`${at} trạng thái lạ: ${f.status}`);
  for (const d of f.depends || []) if (!ids.has(d)) err(`${at} phụ thuộc không tồn tại: ${d}`);
  if (f.status === 'blocked' && !decisions.includes(f.id)) err(`${at} "blocked" nhưng docs/DECISIONS.md không ghi lý do`);
  if (f.status !== 'done') continue;
  for (const t of f.tests || []) if (!fs.existsSync(path.join(ROOT, t))) err(`${at} file test không có: ${t}`);
  const proof = f.proof || [];
  (f.acceptance || []).forEach((a, i) => {
    const list = [].concat(proof[i] || []);
    if (!list.length) { err(`${at} acceptance #${i + 1} chưa có bằng chứng: "${a.slice(0, 80)}"`); return; }
    for (const p of list) {
      const [file, label] = p.split(' :: ').map((s) => (s || '').trim());
      if (!file || !label) { err(`${at} bằng chứng sai dạng "<file> :: <nhãn>": ${p}`); continue; }
      if (!(f.tests || []).includes(file)) err(`${at} bằng chứng dùng ${file} nhưng file không nằm trong "tests" của mục`);
      if (!fs.existsSync(path.join(ROOT, file))) { err(`${at} file test không có: ${file}`); continue; }
      const lg = logsFor(file);
      if (!lg) { err(`${at} không biết log của ${file}`); continue; }
      lg.forEach((l) => needLogs.add(l));
    }
  });
}

// Thiếu log: tự chạy test không cần trình duyệt
const logDir = LOGS || fs.mkdtempSync(path.join(os.tmpdir(), 'ns-features-'));
const runTo = (log, args) => {
  const p = path.join(logDir, log);
  if (fs.existsSync(p)) return;
  console.log(`  chạy ${args.join(' ')} → ${log}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  fs.writeFileSync(p, (r.stdout || '') + (r.stderr || ''));
};
if (needLogs.has('smoke.log')) runTo('smoke.log', ['tests/smoke.js']);
if (needLogs.has('check.log')) runTo('check.log', ['tools/check-data.js']);
if (needLogs.has('verify-self.log')) runTo('verify-self.log', ['tests/features/verify.js']);
const passLines = {};
for (const l of needLogs) {
  const p = path.join(logDir, l);
  if (!fs.existsSync(p) && SKIP.has(l)) { console.log(`  – bỏ qua bằng chứng trong ${l} (bước không chạy)`); passLines[l] = []; continue; }
  if (!fs.existsSync(p)) { err(`chưa có log ${l}${BROWSER_LOGS.has(l) ? ' (test trình duyệt/tải: chạy qua npm run verify)' : ''}`); passLines[l] = []; continue; }
  passLines[l] = fs.readFileSync(p, 'utf8').split('\n').filter((x) => /^\s*✔/.test(x));
}

let proven = 0;
for (const f of fj) {
  if (f.status !== 'done') continue;
  (f.acceptance || []).forEach((a, i) => {
    for (const p of [].concat((f.proof || [])[i] || [])) {
      const [file, label] = p.split(' :: ').map((s) => (s || '').trim());
      const lg = file && logsFor(file);
      if (!lg || !label) continue;
      for (const l of lg) {
        if (!passLines[l] || !passLines[l].length) continue;
        if (!passLines[l].some((x) => x.includes(label))) err(`[${f.id}] acceptance #${i + 1}: "${label}" không có dòng ✔ trong ${l}`);
        else proven++;
      }
    }
  });
}

const count = (st) => fj.filter((f) => f.status === st).length;
const ms = (st) => fj.filter((f) => f.status === st && ['Must', 'Should'].includes(f.priority)).length;
console.log(`Sổ tính năng: ${fj.length} mục, done ${count('done')} (Must/Should ${ms('done')}/${fj.filter((f) => ['Must', 'Should'].includes(f.priority)).length}), blocked ${count('blocked')}, todo ${count('todo') + count('doing')}; ${proven} bằng chứng đạt`);
for (const e of errs.slice(0, 200)) console.log(`  ✘ ${e}`);
if (errs.length > 200) console.log(`  ... và ${errs.length - 200} lỗi nữa`);
console.log(errs.length ? `SỔ TÍNH NĂNG HỎNG: ${errs.length} lỗi` : 'SỔ TÍNH NĂNG ĐẠT');
process.exit(errs.length ? 1 : 0);
