// Minimal PNG encoder/decoder (Node only: uses node:zlib). Enough for screenshots and tile art.

import { deflateSync, inflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode RGBA (4 bytes/pixel) or RGB (3 bytes/pixel) pixels to a PNG Buffer. */
export function encodePNG(width, height, pixels, channels = 4) {
  if (channels !== 3 && channels !== 4) throw new Error('channels must be 3 or 4');
  if (pixels.length !== width * height * channels) throw new Error('pixel buffer has the wrong size');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = channels === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Nearest-neighbour integer upscale of an RGBA image. */
export function upscale(width, height, rgba, k) {
  if (k === 1) return { width, height, rgba };
  const W = width * k, H = height * k;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = (y / k) | 0;
    for (let x = 0; x < W; x++) {
      const sx = (x / k) | 0;
      const s = (sy * width + sx) * 4, d = (y * W + x) * 4;
      out[d] = rgba[s]; out[d + 1] = rgba[s + 1]; out[d + 2] = rgba[s + 2]; out[d + 3] = rgba[s + 3];
    }
  }
  return { width: W, height: H, rgba: out };
}

/** Decode a non-interlaced PNG. Returns {width, height, rgba: Uint8Array}. */
export function decodePNG(buf) {
  buf = Buffer.from(buf);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG file');
  let pos = 8;
  let ihdr = null, plte = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') ihdr = data;
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!ihdr) throw new Error('PNG is missing IHDR');
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  const depth = ihdr[8], ctype = ihdr[9], interlace = ihdr[12];
  if (interlace) throw new Error('interlaced PNGs are not supported; re-save without interlacing');
  const channelsByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsByType[ctype];
  if (!channels) throw new Error(`unsupported PNG color type ${ctype}`);
  if (![1, 2, 4, 8, 16].includes(depth)) throw new Error(`unsupported PNG bit depth ${depth}`);
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((width * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('PNG data is truncated');
  const img = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = img.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? img.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (f !== 0) throw new Error(`bad PNG filter ${f}`);
      out[i] = v & 255;
    }
  }
  const sample = (row, idx) => {
    // read sample `idx` (in channel units) of a scanline, scaled to 8 bits unless palette index
    if (depth === 8) return row[idx];
    if (depth === 16) return row[idx * 2];
    const perByte = 8 / depth;
    const byte = row[Math.floor(idx / perByte)];
    const shift = 8 - depth * ((idx % perByte) + 1);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const rgba = new Uint8Array(width * height * 4);
  const maxv = (1 << Math.min(depth, 8)) - 1;
  for (let y = 0; y < height; y++) {
    const row = img.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const d = (y * width + x) * 4;
      let r, g, b, a = 255;
      if (ctype === 3) {
        const i = sample(row, x);
        if (!plte) throw new Error('indexed PNG is missing PLTE');
        r = plte[i * 3]; g = plte[i * 3 + 1]; b = plte[i * 3 + 2];
        if (trns && i < trns.length) a = trns[i];
      } else if (ctype === 0) {
        r = g = b = Math.round((sample(row, x) * 255) / maxv);
      } else if (ctype === 4) {
        r = g = b = Math.round((sample(row, x * 2) * 255) / maxv);
        a = Math.round((sample(row, x * 2 + 1) * 255) / maxv);
      } else if (ctype === 2) {
        r = sample(row, x * 3); g = sample(row, x * 3 + 1); b = sample(row, x * 3 + 2);
      } else {
        r = sample(row, x * 4); g = sample(row, x * 4 + 1); b = sample(row, x * 4 + 2); a = sample(row, x * 4 + 3);
      }
      rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = a;
    }
  }
  return { width, height, rgba };
}
