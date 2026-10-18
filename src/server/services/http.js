'use strict';

// Máy chủ HTTP: phục vụ thư mục tĩnh src/client (nén gzip, ETag) và /api/status
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

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

// root: thư mục tĩnh; status(): nội dung JSON của /api/status
function createHttpServer(root, status) {
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
      const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}${gzip ? '-gz' : ''}"`;
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag, Vary: 'Accept-Encoding' };
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        return res.end();
      }
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
