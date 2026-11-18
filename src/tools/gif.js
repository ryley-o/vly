// Animated GIF encoder (LZW). Pure JS. Frames are RGBA images of the same size; the palette is built from the
// colors actually used (the console shows at most 64 at once), with a 3-3-2 fallback if there are ever more than 256.

function buildPalette(frames) {
  const map = new Map();
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 4) {
      const c = (f[i] << 16) | (f[i + 1] << 8) | f[i + 2];
      if (!map.has(c)) { map.set(c, map.size); if (map.size > 256) return null; }
    }
  }
  return map;
}

function lzwEncode(indices, minCodeSize) {
  const out = [];
  let cur = 0, bits = 0;
  const clear = 1 << minCodeSize, eof = clear + 1;
  let codeSize = minCodeSize + 1, next = eof + 1;
  const emit = (code) => {
    cur |= code << bits; bits += codeSize;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  let dict = new Map();
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dict = new Map(); codeSize = minCodeSize + 1; next = eof + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eof);
  if (bits > 0) out.push(cur & 255);
  return out;
}

/**
 * @param {Uint8Array[]} frames RGBA frames
 * @param {{width: number, height: number, delayCs?: number, loop?: number}} o
 * @returns {Uint8Array}
 */
export function encodeGif(frames, { width, height, delayCs = 3, loop = 0 }) {
  let palette = buildPalette(frames);
  let quant = null;
  if (!palette) { quant = (r, g, b) => (r & 0xe0) | ((g & 0xe0) >> 3) | (b >> 6); palette = new Map(); }
  const entries = quant ? Array.from({ length: 256 }, (_, i) => [((i & 0xe0) | 0x10) << 16 | (((i & 0x1c) << 3) | 0x10) << 8 | (((i & 3) << 6) | 0x20)]) : [...palette.keys()];
  let size = 2; while ((1 << size) < Math.max(2, entries.length)) size++;
  const bytes = [];
  const w16 = (v) => bytes.push(v & 255, (v >> 8) & 255);
  bytes.push(...[...'GIF89a'].map((c) => c.charCodeAt(0)));
  w16(width); w16(height);
  bytes.push(0x80 | (7 << 4) | (size - 1), 0, 0);
  for (let i = 0; i < (1 << size); i++) {
    const c = entries[i] !== undefined ? (Array.isArray(entries[i]) ? entries[i][0] : entries[i]) : 0;
    bytes.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
  }
  if (loop !== null) bytes.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, loop & 255, (loop >> 8) & 255, 0);
  const minCode = Math.max(2, size);
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0x04, delayCs & 255, (delayCs >> 8) & 255, 0, 0); // graphic control: disposal 1 (leave in place)
    bytes.push(0x2c); w16(0); w16(0); w16(width); w16(height); bytes.push(0);
    const idx = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < f.length; i += 4, j++) idx[j] = quant ? quant(f[i], f[i + 1], f[i + 2]) : palette.get((f[i] << 16) | (f[i + 1] << 8) | f[i + 2]);
    bytes.push(minCode);
    const data = lzwEncode(idx, minCode);
    for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); bytes.push(chunk.length, ...chunk); }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

/** Minimal GIF decoder used by tests: returns frames of palette indices plus the palette. */
export function decodeGif(buf) {
  let p = 6;
  const w = buf[p] | (buf[p + 1] << 8), h = buf[p + 2] | (buf[p + 3] << 8); p += 4;
  const flags = buf[p]; p += 3;
  const palSize = 1 << ((flags & 7) + 1);
  const palette = [];
  for (let i = 0; i < palSize; i++) { palette.push((buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2]); p += 3; }
  const frames = [];
  while (buf[p] !== 0x3b) {
    if (buf[p] === 0x21) { p += 2; while (buf[p]) p += buf[p] + 1; p++; continue; }
    if (buf[p] !== 0x2c) throw new Error('bad GIF block ' + buf[p]);
    p += 10;
    const min = buf[p++];
    const data = [];
    while (buf[p]) { for (let i = 0; i < buf[p]; i++) data.push(buf[p + 1 + i]); p += buf[p] + 1; }
    p++;
    // LZW decode
    const clear = 1 << min, eof = clear + 1;
    let codeSize = min + 1, next = eof + 1;
    let dict = [];
    const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; codeSize = min + 1; next = eof + 1; };
    reset();
    const out = [];
    let cur = 0, bits = 0, di = 0, prev = null;
    for (;;) {
      while (bits < codeSize && di < data.length) { cur |= data[di++] << bits; bits += 8; }
      if (bits < codeSize) break;
      const code = cur & ((1 << codeSize) - 1);
      cur >>>= codeSize; bits -= codeSize;
      if (code === clear) { reset(); prev = null; continue; }
      if (code === eof) break;
      let entry;
      if (dict[code]) entry = dict[code];
      else if (prev) entry = [...prev, prev[0]];
      else throw new Error('bad LZW stream');
      out.push(...entry);
      if (prev) { dict[next++] = [...prev, entry[0]]; if (next === (1 << codeSize) && codeSize < 12) codeSize++; }
      prev = entry;
    }
    frames.push(Uint8Array.from(out));
  }
  return { width: w, height: h, palette, frames };
}
