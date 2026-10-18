'use strict';

// Phủ kiểm thử theo hành động: mọi tên hành động trong router (actions của mọi module) phải xuất hiện
// trong tests/features/*.js (chuỗi 'ten' hoặc lời gọi .ten( ) ở file có ok(); thao tác NPC (npcAct { id: '<làng>_<loại>', a })
// được dò từ thân act() của module, file kiểm thử phải nhắc loại NPC và gửi đúng a.
// Chạy riêng: node scripts/lib/coverage.js [--strict] (in bảng, thiếu hành động router thì mã 1; --strict tính cả thao tác NPC)
const fs = require('fs');
const path = require('path');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function featureTexts(root) {
  const dir = path.join(root, 'tests', 'features');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
    .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }))
    .filter((x) => /\bok\(/.test(x.text));
}

// Thao tác 'a' của act(p, n, a, m): các so sánh a === 'x' và a.startsWith('x')
function npcActs(fn) {
  const src = String(fn);
  const out = new Set();
  for (const m of src.matchAll(/\ba\s*===\s*'([^']+)'/g)) out.add(m[1]);
  for (const m of src.matchAll(/\ba\.startsWith\('([^']+)'\)/g)) out.add(`${m[1]}*`);
  return [...out];
}

function coverage(root) {
  const mods = require(path.join(root, 'src', 'server', 'modules'));
  const files = featureTexts(root);
  const where = (re) => files.filter((f) => re.test(f.text)).map((f) => f.file.replace(/\.js$/, ''));
  const actions = [];
  for (const mod of mods) {
    for (const t of Object.keys(mod.actions || {})) {
      const q = esc(t);
      actions.push({ mod: mod.name, name: t, files: where(new RegExp(`['"\`]${q}['"\`]|\\.${q}\\(`)) });
    }
  }
  const npcs = [];
  for (const mod of mods) {
    for (const [type, def] of Object.entries(mod.npcs || {})) {
      if (!def.act) continue;
      for (const a of npcActs(def.act)) {
        const act = a.endsWith('*') ? `${esc(a.slice(0, -1))}[^'"\`]*` : esc(a);
        // file kiểm thử phải nhắc tới NPC loại đó (id '<làng>_<loại>', 'arena_master'...) và gửi thao tác a tương ứng
        const typeRe = new RegExp(`['"\`_]${esc(type)}[_'"\`]`);
        const actRe = new RegExp(`\\ba:\\s*['"\`]${act}['"\`]`);
        npcs.push({ mod: mod.name, name: `${type}:${a}`, files: files.filter((f) => typeRe.test(f.text) && actRe.test(f.text)).map((f) => f.file.replace(/\.js$/, '')) });
      }
    }
  }
  return { actions, npcs };
}

// Bước báo cáo cho scripts/verify.js: { ok, lines }
function stepCoverage(root, strict) {
  const { actions, npcs } = coverage(root);
  const miss = actions.filter((x) => !x.files.length);
  const missN = npcs.filter((x) => !x.files.length);
  const lines = [`hành động router: ${actions.length - miss.length}/${actions.length} có kiểm thử trong tests/features`,
    `thao tác NPC: ${npcs.length - missN.length}/${npcs.length}`];
  for (const x of miss) lines.push(`THIẾU hành động ${x.mod}.${x.name}`);
  for (const x of missN) lines.push(`${strict ? 'THIẾU' : 'cảnh báo: thiếu'} thao tác NPC ${x.mod} ${x.name}`);
  return { ok: miss.length === 0 && (!strict || missN.length === 0), lines };
}

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const strict = process.argv.includes('--strict');
  const { actions, npcs } = coverage(root);
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('Module', 10)} ${pad('Hành động', 16)} Kiểm thử (tests/features)`);
  for (const x of [...actions, ...npcs.map((n) => ({ ...n, name: `npc ${n.name}` }))]) {
    console.log(`${pad(x.mod, 10)} ${pad(x.name, 16)} ${x.files.length ? x.files.join(', ') : '✘ THIẾU'}`);
  }
  const r = stepCoverage(root, strict);
  console.log('');
  for (const l of r.lines) console.log(l);
  console.log(r.ok ? 'PHỦ ĐẠT' : 'PHỦ THIẾU');
  process.exit(r.ok ? 0 : 1);
}

module.exports = { coverage, stepCoverage };
