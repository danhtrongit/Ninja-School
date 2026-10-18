'use strict';

// Máy chủ HTTP: phục vụ thư mục tĩnh src/client (nén gzip, ETag) và /api/status
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
};
// Âm thanh: đọc thẳng từ đĩa (không giữ trong bộ đệm), hỗ trợ Range vì Safari chỉ phát <audio> khi server trả 206
const MEDIA_EXT = new Set(['.ogg', '.m4a']);

function sendMedia(req, res, file, st, headers) {
  headers['Accept-Ranges'] = 'bytes';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  let start = 0;
  let end = st.size - 1;
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = +m[1];
      if (m[2]) end = Math.min(+m[2], end);
    } else start = Math.max(0, st.size - +m[2]);
    if (start > end || start >= st.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
      return res.end();
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(m && (m[1] || m[2]) ? 206 : 200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
}

// Nén gzip file tĩnh dạng văn bản, giữ bộ đệm theo thời điểm sửa file
const GZIP_EXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.webmanifest']);
const staticCache = new Map();
function readStatic(file, st, gzip, cb) {
  const key = `${file}|${gzip ? 1 : 0}`;
  const hit = staticCache.get(key);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return cb(null, hit.buf);
  fs.readFile(file, (e, raw) => {
    if (e) return cb(e);
    const buf = gzip ? zlib.gzipSync(raw, { level: 6 }) : raw;
    staticCache.set(key, { mtime: st.mtimeMs, size: st.size, buf });
    cb(null, buf);
  });
}

// Phiên bản theo nội dung (8 ký tự hex), giữ bộ đệm theo thời điểm sửa file
const verCache = new Map();
function fileVer(file) {
  const st = fs.statSync(file);
  const hit = verCache.get(file);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.v;
  const v = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  verCache.set(file, { mtime: st.mtimeMs, size: st.size, v });
  return v;
}

function listFiles(dir, ext, rel = '') {
  let out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out = out.concat(listFiles(dir, ext, r));
    else if (d.name.endsWith(ext)) out.push(r);
  }
  return out.sort();
}

// Client không có bước build nên ~85 module ES tải theo thác nhiều tầng. index.html được chèn
// import map trỏ mỗi module tới bản ?v=<băm nội dung> (lưu đệm lâu, không phải hỏi lại máy chủ)
// cùng modulepreload cho mọi module để trình duyệt tải song song ngay từ đầu.
function buildIndex(root, file) {
  const vers = {};
  const imports = {};
  let preload = '';
  for (const r of listFiles(path.join(root, 'js'), '.js')) {
    const u = `js/${r}`;
    vers[u] = `${u}?v=${fileVer(path.join(root, u))}`;
    imports[`./${u}`] = `./${vers[u]}`;
    preload += `\n  <link rel="modulepreload" href="${vers[u]}">`;
  }
  for (const r of listFiles(path.join(root, 'css'), '.css')) vers[`css/${r}`] = `css/${r}?v=${fileVer(path.join(root, 'css', r))}`;
  const map = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
  return fs.readFileSync(file, 'utf8')
    .replace(/(href|src)="((?:js|css)\/[^"?]+)"/g, (s, a, u) => (vers[u] ? `${a}="${vers[u]}"` : s))
    // import map phải đứng trước mọi thẻ module/modulepreload
    .replace('</head>', `  ${map}${preload}\n</head>`);
}

// File js/css xin đúng phiên bản hiện tại thì được lưu đệm vĩnh viễn
function versioned(root, file, url) {
  const v = url.searchParams.get('v');
  if (!v || !/^(js|css)\//.test(path.relative(root, file).split(path.sep).join('/'))) return false;
  try {
    return fileVer(file) === v;
  } catch (e) {
    return false;
  }
}

// root: thư mục tĩnh; status(): nội dung JSON của /api/status
function createHttpServer(root, status) {
  const indexFile = path.join(root, 'index.html');
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(status()));
    }
    let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      return res.end();
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        file = path.join(file, 'index.html');
        try {
          st = fs.statSync(file);
        } catch (e) {
          st = null;
        }
      }
      if (err && !st) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Không tìm thấy');
      }
      const ext = path.extname(file);
      const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && GZIP_EXT.has(ext);
      const cache = versioned(root, file, url) ? 'public, max-age=31536000, immutable' : 'no-cache';
      if (file === indexFile) {
        let raw;
        try {
          raw = Buffer.from(buildIndex(root, file));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Lỗi máy chủ');
        }
        const etag = `"${crypto.createHash('md5').update(raw).digest('hex').slice(0, 16)}${gzip ? '-gz' : ''}"`;
        const headers = { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache', ETag: etag, Vary: 'Accept-Encoding' };
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, headers);
          return res.end();
        }
        if (gzip) headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers);
        return res.end(gzip ? zlib.gzipSync(raw, { level: 6 }) : raw);
      }
      const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}${gzip ? '-gz' : ''}"`;
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding' };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        return res.end();
      }
      if (MEDIA_EXT.has(ext)) return sendMedia(req, res, file, st, headers);
      readStatic(file, st, gzip, (e, buf) => {
        if (e) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Không tìm thấy');
        }
        if (gzip) headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers);
        res.end(buf);
      });
    });
  });
}

module.exports = { createHttpServer };
