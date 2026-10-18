'use strict';

// Lệnh kiểm chứng một chạm: npm run verify [-- --quick | --floor | --no-browser | --no-load | --prod | --json <file> | --root <thư mục> | --out <thư mục>]
// Bước 1-6 kiểm tĩnh (cú pháp, dữ liệu, id DOM, API công khai, quy tắc tĩnh, sàn nội dung).
// Bước 7-10 chạy kiểm thử: npm test, trình duyệt (test:ui, test:e2e máy tính + điện thoại, test:perf hai cỡ, test:visual)
// với server tạm do script tự bật (cổng riêng, DATA_DIR tạm, ADMINS cho tài khoản test), test:load, check:features.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(opt('--root') || path.join(__dirname, '..'));
const QUICK = flag('--quick');
const FLOOR = flag('--floor');
const BROWSER = !QUICK && !flag('--no-browser');
const LOAD = !QUICK && !flag('--no-load');
// --prod: thêm bước smoke test máy chủ thật (npm run test:prod), dùng khi đã triển khai đúng commit này
const PROD = !QUICK && flag('--prod');
const OUT = path.resolve(opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'ns-verify-')));
fs.mkdirSync(OUT, { recursive: true });

const rel = (f) => path.relative(ROOT, f);
const read = (f) => fs.readFileSync(f, 'utf8');
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (e.name.endsWith('.js')) out.push(f);
  }
  return out;
}

// Chạy lệnh, gom stdout+stderr (ghi kèm ra file log nếu có), trả { code, out }
function run(cmd, args, o = {}) {
  return new Promise((resolve) => {
    const ch = spawn(cmd, args, { cwd: o.cwd || ROOT, env: { ...process.env, ...(o.env || {}) }, stdio: [o.input != null ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let out = '';
    const logf = o.log ? fs.createWriteStream(o.log) : null;
    const on = (d) => { out += d; if (logf) logf.write(d); if (o.echo) process.stdout.write(d); };
    ch.stdout.on('data', on);
    ch.stderr.on('data', on);
    if (o.input != null) ch.stdin.end(o.input);
    let timer = null;
    if (o.timeout) timer = setTimeout(() => { out += `\n[verify] quá thời gian ${o.timeout} ms, dừng tiến trình\n`; ch.kill('SIGKILL'); }, o.timeout);
    ch.on('close', (code) => { clearTimeout(timer); if (logf) logf.end(); resolve({ code: code == null ? 1 : code, out }); });
  });
}

async function pool(items, n, fn) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); }
  }));
  return res;
}

const steps = [];
function report(name, ok, lines = [], extra = {}) {
  steps.push({ name, ok, lines, ...extra });
  const mark = ok === null ? '–' : ok ? '✔' : '✘';
  console.log(`${mark} ${name}${extra.ms != null ? ` (${(extra.ms / 1000).toFixed(1)} s)` : ''}`);
  for (const l of lines.slice(0, 40)) console.log(`    ${l}`);
  if (lines.length > 40) console.log(`    ... và ${lines.length - 40} dòng nữa`);
}
const timed = async (fn) => { const t0 = Date.now(); const r = await fn(); return { ...r, ms: Date.now() - t0 }; };

// ---------- 1. Cú pháp
async function stepSyntax() {
  const files = ['src', 'tests', 'tools', 'scripts'].flatMap((d) => walk(path.join(ROOT, d)));
  const clientDir = path.join(ROOT, 'src', 'client') + path.sep;
  const bad = [];
  await pool(files, os.cpus().length, async (f) => {
    const r = f.startsWith(clientDir)
      ? await run(process.execPath, ['--input-type=module', '--check'], { input: read(f) })
      : await run(process.execPath, ['--check', f]);
    if (r.code !== 0) {
      const m = r.out.match(/:(\d+)\n/) || r.out.match(/\[stdin\]:(\d+)/);
      const msg = (r.out.split('\n').find((l) => /Error/.test(l)) || '').trim();
      bad.push(`${rel(f)}${m ? ':' + m[1] : ''} ${msg}`);
    }
  });
  return { ok: bad.length === 0, lines: bad.length ? bad : [`${files.length} file`] };
}

// ---------- 2. Dữ liệu
async function stepData() {
  const r = await run(process.execPath, [path.join(ROOT, 'tools', 'check-data.js')], { log: path.join(OUT, 'check.log') });
  const good = r.code === 0 && /^✔ Dữ liệu hợp lệ/m.test(r.out);
  const lines = good ? [r.out.split('\n').find((l) => l.startsWith('✔ Dữ liệu hợp lệ'))] : r.out.split('\n').filter((l) => /✘|Error|lỗi/i.test(l));
  return { ok: good, lines };
}

// ---------- 3. Id DOM dùng chéo (đọc từ CLAUDE.md)
function clientSources() {
  const html = read(path.join(ROOT, 'src', 'client', 'index.html'));
  const js = walk(path.join(ROOT, 'src', 'client', 'js')).map(read).join('\n');
  return { html, js };
}
function stepDom() {
  const md = read(path.join(ROOT, 'CLAUDE.md'));
  const i = md.indexOf('Các id DOM dùng chéo');
  if (i < 0) return { ok: false, lines: ['CLAUDE.md thiếu mục "Các id DOM dùng chéo"'] };
  const block = md.slice(i, md.indexOf('\n\n', md.indexOf('\n', i) + 1) + 1 || undefined);
  const para = md.slice(i).split('\n## ')[0].split('\n').slice(0, 3).join('\n');
  const toks = [...(block + para).matchAll(/`([^`]+)`/g)].flatMap((m) => m[1].split(',')).map((x) => x.trim());
  const { html, js } = clientSources();
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g), ...js.matchAll(/\bid:\s*'([^']+)'/g), ...js.matchAll(/\.id\s*=\s*'([^']+)'/g)].map((m) => m[1]));
  const all = html + '\n' + js;
  const miss = [];
  let n = 0;
  for (const t of new Set(toks)) {
    if (t.startsWith('#')) {
      n++;
      const id = t.slice(1);
      if (id.endsWith('*')) { const pre = id.slice(0, -1); if (![...ids].some((x) => x.startsWith(pre))) miss.push(t); } else if (!ids.has(id)) miss.push(t);
    } else if (/^[.[]/.test(t)) {
      n++;
      const parts = [...t.matchAll(/\.([\w-]+)|\[([\w-]+)/g)].map((m) => m[1] || m[2]);
      if (!parts.every((p) => all.includes(p))) miss.push(t);
    }
  }
  return { ok: miss.length === 0 && n > 30, lines: miss.length ? miss.map((x) => `thiếu ${x}`) : [`${n} mục có đủ`] };
}

// ---------- 4. API công khai
function stepApi() {
  const md = read(path.join(ROOT, 'CLAUDE.md'));
  const sec = md.slice(md.indexOf('## API công khai'), md.indexOf('Các id DOM dùng chéo'));
  const miss = [];
  let n = 0;
  for (const row of sec.split('\n')) {
    const m = row.match(/^\|\s*`([^`]+\.js)`\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const entry = path.join(ROOT, 'src', 'client', 'js', m[1]);
    if (!fs.existsSync(entry)) { miss.push(`${m[1]}: không có file`); continue; }
    const src = read(entry);
    const sub = path.join(path.dirname(entry), path.basename(entry, '.js').replace(/art$/, '').replace(/^maprender$/, 'map').replace(/^monster$/, 'monster'));
    const subSrc = walk(fs.existsSync(sub) ? sub : path.join(path.dirname(entry), '__none__')).map(read).join('\n');
    const exported = new Set();
    for (const x of src.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let)\s+([A-Za-z_$][\w$]*)/g)) exported.add(x[1]);
    for (const x of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const nm of x[1].split(',')) exported.add(nm.trim().split(/\s+as\s+/).pop().trim());
    // bỏ phần giải thích trong ngoặc ngoài dấu ` (vd "(`o`: `t, dir`)", "(định nghĩa ở `ui/dom.js`)")
    const cell = m[2].replace(/`[^`]*`|\([^()]*\)/g, (x) => (x[0] === '`' ? x : ''));
    for (const seg of cell.split(';')) {
      const [head, methods] = seg.split(/\sc[óo]\s/);
      const names = (s) => [...(s || '').matchAll(/`([^`]+)`/g)].flatMap((x) => x[1].split(/,(?![^(]*\))/)).map((x) => (x.trim().match(/^(?:class\s+)?([A-Za-z_$][\w$]*)/) || [])[1]).filter(Boolean);
      const hasClass = /`class\s/.test(cell);
      for (const nm of names(head)) {
        n++;
        if (exported.has(nm)) continue;
        // tên dưới dạng phương thức / thuộc tính của lớp được xuất (vd FX.drawGround, FX.shakeScale)
        const def = new RegExp(`(^|\\s)(async\\s+|get\\s+)?${nm}\\s*\\([^)]*\\)\\s*\\{|this\\.${nm}\\s*=`, 'm');
        if (hasClass && (def.test(src) || def.test(subSrc))) continue;
        miss.push(`${m[1]}: thiếu export ${nm}`);
      }
      for (const nm of names(methods)) {
        n++;
        const def = new RegExp(`(^|\\s)(async\\s+|get\\s+)?${nm}\\s*\\([^)]*\\)\\s*\\{|this\\.${nm}\\s*=`, 'm');
        if (!def.test(src) && !def.test(subSrc)) miss.push(`${m[1]}: thiếu phương thức ${nm}`);
      }
    }
  }
  return { ok: miss.length === 0 && n > 40, lines: miss.length ? miss : [`${n} tên có đủ`] };
}

// ---------- 5. Quy tắc tĩnh
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n').map((l) => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
function stepStatic() {
  const bad = [];
  const lineOf = (s, idx) => s.slice(0, idx).split('\n').length;
  for (const f of walk(path.join(ROOT, 'src', 'client', 'js'))) {
    const s = stripComments(read(f));
    const rules = [
      [/(^|[^.\w$])(alert|confirm|prompt)\s*\(/g, (m) => `${m[2]}() của trình duyệt (dùng this.ask)`],
      [/\bimport\s*(?:[^;'"]*?from\s*)?['"][^'"]*shared\//g, () => 'client import src/shared'],
      [/\bimport\s*\(\s*['"][^'"]*shared\//g, () => 'client import src/shared'],
      [/innerHTML\s*=\s*(?!\s*'[^'$]*'\s*[;,)])(?!\s*"[^"$]*"\s*[;,)])/g, () => 'innerHTML gán biểu thức (dùng h())'],
      [/['"`]https?:\/\/(?!www\.w3\.org\/)[^'"`]*/g, (m) => `URL ngoài ${m[0].slice(1, 60)}`],
    ];
    for (const [re, msg] of rules) for (const m of s.matchAll(re)) bad.push(`${rel(f)}:${lineOf(s, m.index)} ${msg(m)}`);
  }
  for (const f of walk(path.join(ROOT, 'src'))) {
    const raw = read(f);
    const s = stripComments(raw);
    for (const m of s.matchAll(/(^|[;{}\s])var\s+[A-Za-z_$]/g)) bad.push(`${rel(f)}:${lineOf(s, m.index + m[1].length)} dùng var`);
    const isCjs = f.includes(`${path.sep}src${path.sep}server${path.sep}`) || f.includes(`${path.sep}src${path.sep}shared${path.sep}`);
    if (isCjs && !/^\s*(\/\/[^\n]*\n\s*)*'use strict';/.test(raw)) bad.push(`${rel(f)}:1 thiếu 'use strict'`);
  }
  // Chuyển giá trị giữa hai người phải nằm trong db.commit (bật khi lớp lưu theo nhân vật có commit)
  const dbSrc = path.join(ROOT, 'src', 'server', 'services', 'db.js');
  if (fs.existsSync(dbSrc) && /\bcommit\s*\(/.test(read(dbSrc))) {
    for (const mod of ['trade', 'mail', 'market', 'vault', 'clan', 'clanwar']) {
      const f = path.join(ROOT, 'src', 'server', 'modules', mod, 'index.js');
      if (!fs.existsSync(f)) continue;
      const s = stripComments(read(f));
      for (const fn of s.split(/\n {2}(?=[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{)/)) {
        const actors = new Set([...fn.matchAll(/\b(\w+)\.(?:removeItem|removeItemB|gainXu|gainXuk|addItem|payXu)\s*\(/g)].map((m) => m[1]));
        if (actors.size >= 2 && !/\bdb\.commit\s*\(/.test(fn)) bad.push(`${rel(f)}: hàm "${fn.trim().split('(')[0]}" chuyển giá trị giữa ${[...actors].join(', ')} mà không gọi db.commit`);
      }
    }
  }
  return { ok: bad.length === 0, lines: bad };
}

// ---------- 6. Sàn nội dung 1.0
function stepFloor() {
  const lines = [];
  const lack = [];
  const req = (p) => { const k = path.join(ROOT, p); delete require.cache[require.resolve(k)]; return require(k); };
  let C;
  let maps;
  let quests;
  let items;
  let pets;
  let extras;
  try {
    C = req('src/shared/constants.js');
    maps = req('src/shared/data/maps.js');
    quests = req('src/shared/data/quests.js');
    items = req('src/shared/data/items/index.js');
    pets = req('src/shared/data/pets.js');
    extras = req('src/shared/data/extras.js');
  } catch (e) {
    return { ok: false, lines: [`không nạp được dữ liệu: ${e.message}`], lack: ['dữ liệu'] };
  }
  const MAPS = maps.MAPS || {};
  const QUESTS = quests.MAIN_QUESTS || [];
  const ITEMS = items.ITEMS || {};
  const PETS = pets.PETS || [];
  const FEST = ['tet', 'valentine', '304', 'he', 'trungthu', 'halloween', 'noel'];
  const fest = new Set((extras.SEASONS || []).map((s) => s.fest).filter((f) => FEST.includes(f)));
  let sig = 0;
  let sigErr = null;
  try {
    const fj = JSON.parse(read(path.join(ROOT, 'docs', 'features.json')));
    sig = fj.filter((f) => f.signature && ['Must', 'Should'].includes(f.priority) && f.status === 'done').length;
  } catch (e) { sigErr = `docs/features.json: ${e.code === 'ENOENT' ? 'không có file' : e.message}`; }
  const rows = [
    ['Cấp tối đa', C.MAX_LEVEL || 0, 199],
    ['Bản đồ (không tính phó bản)', Object.values(MAPS).filter((m) => !m.instance).length, 80],
    ['Nhiệm vụ chính', Array.isArray(QUESTS) ? QUESTS.length : Object.keys(QUESTS).length, 120],
    ['Thú cưỡi', Object.values(ITEMS).filter((it) => it.slot === 'mount').length, 20],
    ['Thú cưng', Array.isArray(PETS) ? PETS.length : Object.keys(PETS).length, 25],
    ['Lễ hội (7 dịp)', fest.size, 7],
    ['Tính năng đặc sắc Must/Should xong', sig, 10],
  ];
  for (const [name, v, need] of rows) {
    const good = v >= need && !(name.startsWith('Tính năng') && sigErr);
    lines.push(`${good ? '✔' : '·'} ${name}: ${v}/${need}`);
    if (!good) lack.push(`thiếu sàn: ${name} ${v}/${need}`);
  }
  if (sigErr) lines.push(sigErr);
  return { ok: FLOOR ? lack.length === 0 : null, lines: FLOOR ? [...lines, ...lack] : lines, lack };
}

// ---------- Server tạm cho kiểm thử trình duyệt
function playwrightPath() {
  const cands = [...(process.env.NODE_PATH || '').split(path.delimiter), path.join(os.homedir(), '.local', 'share', 'ninja-tools', 'node_modules'), path.join(ROOT, 'node_modules')];
  try { cands.push(require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch (e) { /* không có npm toàn cục */ }
  return cands.find((d) => d && fs.existsSync(path.join(d, 'playwright', 'package.json'))) || null;
}
const PERF_BOTS = Array.from({ length: 30 }, (_, i) => `vfbot${String(i + 1).padStart(2, '0')}`);
const ADMINS = ['duoalpha', 'duobravo', 'vfe2ed', 'vfe2em', 'vfperfd', 'vfperfm', 'vfvisual', 'vfaudit', ...PERF_BOTS];
async function startServer(port, dataDir, logFile) {
  const ch = spawn(process.execPath, [path.join(ROOT, 'src', 'server', 'index.js')], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMINS: ADMINS.join(','), REG_LIMIT: '0', DEV_TOOLS: '1', NS_TEST: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  const lf = fs.createWriteStream(logFile);
  const on = (d) => { log += d; lf.write(d); };
  ch.stdout.on('data', on);
  ch.stderr.on('data', on);
  for (let i = 0; i < 100 && !log.includes('đang chạy'); i++) await new Promise((r) => setTimeout(r, 100));
  return { ch, log: () => log, stop: () => new Promise((r) => { ch.on('close', r); ch.kill('SIGTERM'); setTimeout(() => ch.kill('SIGKILL'), 8000); }) };
}

async function stepCmd(name, cmd, args, o, pass) {
  const r = await timed(() => run(cmd, args, o));
  const good = pass(r);
  const tail = r.out.trim().split('\n').slice(-6);
  report(name, good, good ? tail.slice(-2) : tail.concat([`log: ${o.log}`]), { ms: r.ms });
  return good;
}

(async () => {
  const t0 = Date.now();
  console.log(`Kiểm chứng ${ROOT}${QUICK ? ' (--quick)' : ''}${FLOOR ? ' (--floor)' : ''}\nLog: ${OUT}\n`);
  const s1 = await timed(stepSyntax); report('1 Cú pháp', s1.ok, s1.lines, { ms: s1.ms });
  const s2 = await timed(stepData); report('2 Dữ liệu (check-data)', s2.ok, s2.lines, { ms: s2.ms });
  const s3 = stepDom(); report('3 Id DOM dùng chéo', s3.ok, s3.lines);
  const s4 = stepApi(); report('4 API công khai', s4.ok, s4.lines);
  const s5 = stepStatic(); report('5 Quy tắc tĩnh', s5.ok, s5.lines);
  const s6 = stepFloor(); report('6 Sàn nội dung 1.0', s6.ok, s6.lines);
  const s6b = require('./lib/coverage').stepCoverage(ROOT, flag('--strict-coverage')); report('6b Phủ kiểm thử theo hành động', s6b.ok, s6b.lines);

  if (QUICK) {
    for (const nm of ['7 Kiểm thử bot (npm test)', '8 Trình duyệt', '9 Tải (test:load)', '10 Sổ tính năng (check:features)']) report(nm, null, ['bỏ qua (--quick)']);
  } else {
    // bản sao sạch (không có thay đổi chưa commit): repoUnitTests kiểm thêm git status
    let clean = false;
    try { clean = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString() === ''; } catch (e) { /* không phải repo git */ }
    await stepCmd('7 Kiểm thử bot (npm test)', process.execPath, [path.join(ROOT, 'tests', 'smoke.js')], { env: clean ? { NS_CLEAN_CLONE: '1' } : {}, log: path.join(OUT, 'smoke.log'), timeout: 900000 }, (r) => r.code === 0 && r.out.includes('TẤT CẢ KIỂM TRA ĐỀU ĐẠT'));
    if (BROWSER) {
      const pw = playwrightPath();
      if (!pw) report('8 Trình duyệt', false, ['không tìm thấy Playwright: cài bằng "npm i -g playwright && npx playwright install chromium" hoặc đặt NODE_PATH']);
      else {
        const port = 3600 + Math.floor(Math.random() * 90);
        const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-verify-data-'));
        const srv = await startServer(port, dataDir, path.join(OUT, 'server-browser.log'));
        const env = { NODE_PATH: pw, BASE_URL: `http://localhost:${port}/`, PORT: String(port) };
        const okE2E = (r) => r.code === 0 && r.out.includes('E2E ĐẠT') && r.out.includes('OK no console errors');
        const okNoErr = (r) => r.code === 0 && r.out.includes('OK no console errors');
        await stepCmd('8a test:ui (2 người chơi)', process.execPath, ['tests/e2e/ui-multiplayer.js'], { env: { ...env, OUT: path.join(OUT, 'duo') }, log: path.join(OUT, 'ui.log'), timeout: 600000 }, okNoErr);
        await stepCmd('8b test:e2e máy tính', process.execPath, ['tests/e2e/e2e.js'], { env: { ...env, ACC: 'vfe2ed', MOBILE: '0', OUT: path.join(OUT, 'e2e') }, log: path.join(OUT, 'e2e-d.log'), timeout: 1200000 }, okE2E);
        await stepCmd('8c test:e2e điện thoại', process.execPath, ['tests/e2e/e2e.js'], { env: { ...env, ACC: 'vfe2em', MOBILE: '1', OUT: path.join(OUT, 'e2e') }, log: path.join(OUT, 'e2e-m.log'), timeout: 1200000 }, okE2E);
        await stepCmd('8d test:perf máy tính 1280×720', process.execPath, ['tests/e2e/perf.js'], { env: { ...env, ACC: 'vfperfd', MOBILE: '0', BOTS: PERF_BOTS.join(','), OUT: path.join(OUT, 'perf') }, log: path.join(OUT, 'perf-d.log'), timeout: 900000 }, okNoErr);
        await stepCmd('8e test:perf điện thoại 844×390', process.execPath, ['tests/e2e/perf.js'], { env: { ...env, ACC: 'vfperfm', MOBILE: '1', BOTS: PERF_BOTS.join(','), OUT: path.join(OUT, 'perf') }, log: path.join(OUT, 'perf-m.log'), timeout: 900000 }, okNoErr);
        await stepCmd('8f test:visual (gallery + mốc băm)', process.execPath, ['tests/e2e/gallery.js'], { env: { ...env, ACC: 'vfvisual', OUT: path.join(OUT, 'visual') }, log: path.join(OUT, 'visual.log'), timeout: 600000 }, okNoErr);
        await stepCmd('8g test:sfx (chất lượng tiếng hiệu ứng)', process.execPath, ['tests/e2e/sfx.js'], { env, log: path.join(OUT, 'sfx.log'), timeout: 300000 }, okNoErr);
        await stepCmd('8h test:audit (giao diện theo cảnh, 4 cỡ màn)', process.execPath, ['tests/e2e/ui-audit.js'], { env: { ...env, ACC: 'vfaudit', OUT: path.join(OUT, 'audit') }, log: path.join(OUT, 'ui-audit.log'), timeout: 600000 }, (r) => r.code === 0 && r.out.includes('UI-AUDIT ĐẠT') && r.out.includes('OK no console errors'));
        await srv.stop();
        const bad = srv.log().split('\n').filter((l) => /\[ws\] Lỗi xử lý|Error:|TypeError|ReferenceError/.test(l));
        report('8i server trong lúc kiểm thử trình duyệt không lỗi', bad.length === 0, bad.slice(0, 10));
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
    } else report('8 Trình duyệt', null, ['bỏ qua (--no-browser)']);
    if (LOAD) await stepCmd('9 Tải (test:load)', process.execPath, ['tests/load/load.js'], { env: { OUT: path.join(OUT, 'load') }, log: path.join(OUT, 'load.log'), timeout: 2 * 3600000 }, (r) => r.code === 0 && r.out.includes('TẢI ĐẠT'));
    else report('9 Tải (test:load)', null, ['bỏ qua (--no-load)']);
    if (PROD) await stepCmd('9b Production (test:prod)', process.execPath, ['tests/prod/smoke-prod.js'], { log: path.join(OUT, 'prod.log'), timeout: 600000 }, (r) => r.code === 0 && r.out.includes('PRODUCTION ĐẠT'));
    // D-02: verify chạy đủ các bộ test; phần thêm của chính verify (bước 1-6, bật/tắt server, dọn) không quá 15 giây
    const testMs = steps.filter((s) => /^(7|8|9)/.test(s.name) && s.ms != null).reduce((n, s) => n + s.ms, 0);
    const extra = Date.now() - t0 - testMs;
    report('9c Thời gian thêm ngoài các bộ test', extra <= 15000, [`${(extra / 1000).toFixed(1)} s (≤ 15 s), các bộ test ${(testMs / 1000).toFixed(1)} s`]);
    // bảng bước tới đây làm log cho check:features (bằng chứng "scripts/verify.js :: <nhãn>")
    fs.writeFileSync(path.join(OUT, 'verify.log'), steps.map((s) => `${s.ok === null ? '–' : s.ok ? '✔' : '✘'} ${s.name}${s.lines.length ? `: ${s.lines.join(' | ')}` : ''}`).join('\n') + '\n');
    // bước bị tắt bằng cờ (CI: --no-browser --no-load) thì check:features bỏ qua bằng chứng nằm trong log của bước đó
    const skip = [...(BROWSER ? [] : ['e2e-d.log', 'e2e-m.log', 'ui.log', 'perf-d.log', 'perf-m.log', 'visual.log', 'sfx.log', 'ui-audit.log']), ...(LOAD ? [] : ['load.log']), ...(PROD ? [] : ['prod.log'])];
    await stepCmd('10 Sổ tính năng (check:features)', process.execPath, ['scripts/check-features.js'], { env: { VERIFY_LOGS: OUT, VERIFY_SKIP: skip.join(',') }, log: path.join(OUT, 'features.log'), timeout: 600000 }, (r) => r.code === 0);
  }

  const failed = steps.filter((s) => s.ok === false);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${failed.length ? `KIỂM CHỨNG HỎNG: ${failed.length} bước (${failed.map((s) => s.name).join('; ')})` : 'KIỂM CHỨNG ĐẠT'} sau ${sec} s`);
  const jf = opt('--json');
  if (jf) fs.writeFileSync(jf, JSON.stringify({ root: ROOT, quick: QUICK, floor: FLOOR, sec: +sec, steps }, null, 1));
  process.exit(failed.length ? 1 : 0);
})();
