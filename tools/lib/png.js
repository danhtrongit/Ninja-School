'use strict';

// Đọc/ghi PNG không cần thư viện (zlib của Node): đủ cho atlas ×3 (bảng màu + tRNS hoặc RGBA 8 bit).
// decodePng(buf) → { w, h, data: Uint8Array RGBA }; encodePng(w, h, rgba) → Buffer RGBA 8 bit (dùng cho fixture kiểm thử)
const zlib = require('zlib');

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('không phải PNG');
  let off = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  let pal = null;
  let trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const name = buf.toString('latin1', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (name === 'IHDR') {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      depth = d[8];
      type = d[9];
      interlace = d[12];
    } else if (name === 'PLTE') pal = d;
    else if (name === 'tRNS') trns = d;
    else if (name === 'IDAT') idat.push(d);
    else if (name === 'IEND') break;
  }
  if (interlace) throw new Error('PNG xen kẽ (interlace) không hỗ trợ');
  if (!(type in CH)) throw new Error(`kiểu màu PNG ${type} không hỗ trợ`);
  if (type !== 3 && depth !== 8) throw new Error(`PNG ${depth} bit không hỗ trợ (cần 8 bit hoặc bảng màu)`);
  if (type === 3 && !pal) throw new Error('PNG bảng màu thiếu PLTE');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (CH[type] * depth) >> 3);
  const stride = Math.ceil((w * CH[type] * depth) / 8);
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= bpp ? px[dst + i - bpp] : 0;
      const b = y ? px[dst - stride + i] : 0;
      const c = y && i >= bpp ? px[dst - stride + i - bpp] : 0;
      px[dst + i] = (ft === 0 ? x : ft === 1 ? x + a : ft === 2 ? x + b : ft === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 255;
    }
  }
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) {
        const bit = x * depth;
        const v = (px[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
        data[o] = pal[v * 3];
        data[o + 1] = pal[v * 3 + 1];
        data[o + 2] = pal[v * 3 + 2];
        data[o + 3] = trns && v < trns.length ? trns[v] : 255;
      } else {
        const s = y * stride + x * CH[type];
        const g = type === 0 || type === 4;
        data[o] = px[s];
        data[o + 1] = g ? px[s] : px[s + 1];
        data[o + 2] = g ? px[s] : px[s + 2];
        data[o + 3] = type === 6 ? px[s + 3] : type === 4 ? px[s + 1] : 255;
      }
    }
  }
  return { w, h, data };
}

function chunk(name, d) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(d.length);
  const body = Buffer.concat([Buffer.from(name, 'latin1'), d]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const hd = Buffer.alloc(13);
  hd.writeUInt32BE(w, 0);
  hd.writeUInt32BE(h, 4);
  hd[8] = 8;
  hd[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([SIG, chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { decodePng, encodePng };
