// Tile and sprite art tools. Pure JS (no Node APIs) so the playground can use them too.
//
// Text format (*.tiles), designed to be easy for people and AI agents to write:
//
//   # comment
//   tile grass:            one 8x8 tile, 8 rows of 8 characters
//     ........
//     ...3....
//     ..3.3...
//     ........
//     ........
//     ........
//     ........
//     ........
//   sprite hero 2x2:       a sprite 2 tiles wide x 2 tall: 16 rows of 16 characters
//     ...
//   rotate hero -20,-10,10,20 as hero_tilt
//                          pre-rotated copies of a sprite (degrees, positive = clockwise, about its centre), named
//                          hero_tilt_m20, hero_tilt_m10, hero_tilt_p10, hero_tilt_p20, each the same size as hero.
//                          The hardware has no rotation, so a tilting vehicle swaps between these frames.
//
// Pixel characters: '.' or ' ' = 0, '0'-'3' = that color index, '#' = 3.
// Tiles are numbered in file order starting at 0; a sprite occupies W*H consecutive tiles in row-major
// order (exactly the layout the sprite hardware expects). Each name defines a constant NAME = first tile index.

export class TilesError extends Error {}

const PIXEL = (ch) => {
  if (ch === '.' || ch === ' ') return 0;
  if (ch === '#') return 3;
  if (ch >= '0' && ch <= '3') return ch.charCodeAt(0) - 48;
  return -1;
};

/** Encode 64 color indices (row-major 8x8) into the 16-byte 2bpp tile format. */
export function encodeTile(px) {
  const out = new Uint8Array(16);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      out[y * 2 + (x >> 2)] |= (px[y * 8 + x] & 3) << (6 - 2 * (x & 3));
    }
  }
  return out;
}

/** Decode a 16-byte tile to 64 color indices. */
export function decodeTile(bytes, offset = 0) {
  const px = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      px[y * 8 + x] = (bytes[offset + y * 2 + (x >> 2)] >> (6 - 2 * (x & 3))) & 3;
    }
  }
  return px;
}

/**
 * Rotate a sprite (w x h tiles, each a 64-entry colour array) by `deg` degrees clockwise about its centre. Nearest-neighbour,
 * so pixels stay crisp; anything rotated in from outside is transparent (index 0). Returns tiles in the same layout.
 */
export function rotateSprite(tiles, w, h, deg) {
  const W = w * 8, H = h * 8;
  const src = new Uint8Array(W * H);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) src[(ty * 8 + y) * W + tx * 8 + x] = tiles[ty * w + tx][y * 8 + x];
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;               // inverse mapping: where did this pixel come from?
      const sx = Math.floor(c * dx + s * dy + cx), sy = Math.floor(-s * dx + c * dy + cy);
      out[y * W + x] = sx >= 0 && sx < W && sy >= 0 && sy < H ? src[sy * W + sx] : 0;
    }
  }
  const result = [];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const px = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px[y * 8 + x] = out[(ty * 8 + y) * W + tx * 8 + x];
    result.push(px);
  }
  return result;
}

/**
 * Parse a .tiles text file.
 * @returns {{data: Uint8Array, count: number, names: Array<{name: string, index: number, w: number, h: number}>}}
 */
export function parseTilesText(text, filename = 'input.tiles') {
  const lines = text.split(/\r?\n/);
  const tiles = []; // each is Uint8Array(64)
  const names = [];
  const seen = new Set();
  let i = 0;
  const fail = (ln, msg) => { throw new TilesError(`${filename}:${ln + 1}: ${msg}`); };
  while (i < lines.length) {
    const line = lines[i].replace(/#\s.*$/, '').replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const rot = /^\s*rotate\s+([A-Za-z_][A-Za-z0-9_]*)\s+(-?\d+(?:\s*,\s*-?\d+)*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(line);
    if (rot) {
      const base = names.find((n) => n.name === rot[1]);
      if (!base) fail(i, `rotate: "${rot[1]}" is not defined above this line (define the sprite first)`);
      for (const a of rot[2].split(',').map((x) => parseInt(x, 10))) {
        const name = `${rot[3]}_${a < 0 ? 'm' : 'p'}${Math.abs(a)}`;
        if (seen.has(name)) fail(i, `duplicate name "${name}"`);
        seen.add(name);
        const first = tiles.length;
        for (const t of rotateSprite(tiles.slice(base.index, base.index + base.w * base.h), base.w, base.h, a)) tiles.push(t);
        names.push({ name, index: first, w: base.w, h: base.h });
      }
      i++;
      continue;
    }
    let m = /^\s*(tile|sprite)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(\d+)x(\d+))?\s*:\s*$/.exec(line);
    if (!m) fail(i, `expected "tile NAME:" or "sprite NAME WxH:", got "${line.trim()}"`);
    const kind = m[1], name = m[2];
    const w = kind === 'tile' ? 1 : parseInt(m[3] || '1', 10);
    const h = kind === 'tile' ? 1 : parseInt(m[4] || '1', 10);
    if (seen.has(name)) fail(i, `duplicate name "${name}"`);
    if (kind === 'sprite' && !m[3]) fail(i, `sprite "${name}" needs a size like 2x2 (tiles wide x tall)`);
    if (!(w >= 1 && h >= 1 && w * h <= 64)) fail(i, `bad size ${w}x${h}`);
    seen.add(name);
    const startLine = i;
    i++;
    const rows = [];
    while (rows.length < h * 8) {
      if (i >= lines.length) fail(startLine, `"${name}" needs ${h * 8} pixel rows, found ${rows.length}`);
      let row = lines[i].replace(/^\s+/, '').replace(/\s+$/, '');
      if (row.startsWith('#') && !/^[#.0-3 ]+$/.test(row)) { i++; continue; } // comment line
      if (row === '') { i++; continue; }
      if (row.length !== w * 8) fail(i, `row has ${row.length} pixels, expected ${w * 8}`);
      for (const ch of row) if (PIXEL(ch) < 0) fail(i, `bad pixel character "${ch}" (use . 0 1 2 3 #)`);
      rows.push(row);
      i++;
    }
    const base = tiles.length;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const px = new Uint8Array(64);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px[y * 8 + x] = PIXEL(rows[ty * 8 + y][tx * 8 + x]);
        tiles.push(px);
      }
    }
    names.push({ name, index: base, w, h });
  }
  const data = new Uint8Array(tiles.length * 16);
  tiles.forEach((px, k) => data.set(encodeTile(px), k * 16));
  return { data, count: tiles.length, names };
}

/**
 * Convert an RGBA image (multiples of 8 in both dimensions) to tiles, row-major by tile.
 * Colors are mapped to indices 0..3 by brightness: the lightest color is index 0, the darkest is index 3.
 * Fully transparent pixels become index 0.
 * @returns {{data: Uint8Array, count: number, palette: number[] (0xRRGGBB per index), tilesWide: number, tilesHigh: number}}
 */
export function tilesFromRGBA(width, height, rgba, opts = {}) {
  if (width % 8 || height % 8) throw new TilesError(`image is ${width}x${height}; both sides must be multiples of 8`);
  const colorsSeen = new Map();
  const key = (i) => (rgba[i * 4 + 3] < 128 ? -1 : (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]);
  for (let i = 0; i < width * height; i++) {
    const k = key(i);
    if (k >= 0) colorsSeen.set(k, (colorsSeen.get(k) || 0) + 1);
  }
  const lum = (c) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  let colors = [...colorsSeen.keys()].sort((a, b) => lum(b) - lum(a));
  if (opts.palette) colors = opts.palette.slice();
  if (colors.length > 4) {
    throw new TilesError(`image uses ${colors.length} colors; tiles allow 4 (found: ${colors.slice(0, 8).map((c) => '#' + c.toString(16).padStart(6, '0')).join(' ')}${colors.length > 8 ? ' ...' : ''}). Reduce the palette or pass --palette.`);
  }
  const index = new Map(colors.map((c, i) => [c, i]));
  const tw = width / 8, th = height / 8;
  const data = new Uint8Array(tw * th * 16);
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const px = new Uint8Array(64);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const k = key((ty * 8 + y) * width + tx * 8 + x);
          px[y * 8 + x] = k < 0 ? 0 : index.get(k) ?? 0;
        }
      }
      data.set(encodeTile(px), (ty * tw + tx) * 16);
    }
  }
  return { data, count: tw * th, palette: colors, tilesWide: tw, tilesHigh: th };
}

/** Render tiles (2bpp bytes) to an RGBA sheet, `perRow` tiles per row, using a 4-color palette (0xRRGGBB). */
export function tilesToRGBA(data, perRow = 16, palette = [0xffffff, 0xaaaaaa, 0x555555, 0x000000]) {
  const count = Math.floor(data.length / 16);
  const rows = Math.ceil(count / perRow);
  const width = perRow * 8, height = rows * 8;
  const rgba = new Uint8Array(width * height * 4);
  for (let t = 0; t < count; t++) {
    const px = decodeTile(data, t * 16);
    const ox = (t % perRow) * 8, oy = Math.floor(t / perRow) * 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const c = palette[px[y * 8 + x]];
        const d = ((oy + y) * width + ox + x) * 4;
        rgba[d] = c >> 16; rgba[d + 1] = (c >> 8) & 255; rgba[d + 2] = c & 255; rgba[d + 3] = 255;
      }
    }
  }
  return { width, height, rgba };
}

/**
 * A labelled contact sheet for named art: every `tile` and `sprite WxH` drawn assembled, with its name underneath.
 * Color 0 is shown as a checkerboard (it is transparent for sprites). `palette` is four 0xRRGGBB colors.
 * @param {{data: Uint8Array, names: Array<{name: string, index: number, w: number, h: number}>}} parsed from parseTilesText
 */
export function tilesContactSheet(parsed, { scale = 6, palette = [0xffffff, 0xaaaaaa, 0x555555, 0x000000], maxWidth = 960, glyphs = {} } = {}) {
  const ls = 2, gap = 10, labelH = 8 * ls + 4;
  const boxes = parsed.names.map((n) => ({ ...n, pw: n.w * 8 * scale, ph: n.h * 8 * scale, lw: n.name.length * 6 * ls }));
  // flow layout
  let x = gap, y = gap, rowH = 0, W = 0;
  for (const b of boxes) {
    const bw = Math.max(b.pw, b.lw);
    if (x + bw + gap > maxWidth && x > gap) { x = gap; y += rowH + labelH + gap; rowH = 0; }
    b.x = x; b.y = y; b.bw = bw;
    x += bw + gap; rowH = Math.max(rowH, b.ph); W = Math.max(W, x);
  }
  const H = y + rowH + labelH + gap;
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = 34; rgba[i * 4 + 1] = 40; rgba[i * 4 + 2] = 30; rgba[i * 4 + 3] = 255; }
  const put = (px, py, c) => { if (px < 0 || py < 0 || px >= W || py >= H) return; const i = (py * W + px) * 4; rgba[i] = c >> 16; rgba[i + 1] = (c >> 8) & 255; rgba[i + 2] = c & 255; };
  for (const b of boxes) {
    for (let ty = 0; ty < b.h; ty++) for (let tx = 0; tx < b.w; tx++) {
      const px = decodeTile(parsed.data, (b.index + ty * b.w + tx) * 16);
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) {
        const v = px[yy * 8 + xx];
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const X = b.x + (tx * 8 + xx) * scale + sx, Y = b.y + (ty * 8 + yy) * scale + sy;
          const checker = (((X - b.x) >> 2) + ((Y - b.y) >> 2)) & 1 ? 0x6f7f8f : 0x5f6f7f;
          put(X, Y, v === 0 ? checker : palette[v]);
        }
      }
    }
    let lx = b.x;
    for (const ch of b.name.toUpperCase()) {
      const g = glyphs[ch === '_' ? '-' : ch];
      if (g) g.split('/').forEach((row, ry) => { for (let rx = 0; rx < 5; rx++) if (row[rx] === '1') for (let sy = 0; sy < ls; sy++) for (let sx = 0; sx < ls; sx++) put(lx + rx * ls + sx, b.y + b.ph + 3 + ry * ls + sy, 0xc8e6aa); });
      lx += 6 * ls;
    }
  }
  return { width: W, height: H, rgba };
}


/**
 * Turn an RGBA picture into .tiles text. Any number of colours: more than the hardware allows are reduced to the nearest of
 * 3 (sprites, where index 0 is transparent) or 4 (tiles) by brightness. Returns the text plus the palette you should set.
 * @param {number} width @param {number} height @param {Uint8Array} rgba
 * @param {{name?: string, cell?: [number, number], kind?: 'sprite'|'tile'}} [opts] cell = pixel size of one sprite (default: whole picture)
 */
export function pngToTilesText(width, height, rgba, opts = {}) {
  const name = opts.name || 'art';
  const kind = opts.kind || 'sprite';
  const [cw, ch] = opts.cell || [Math.ceil(width / 8) * 8, Math.ceil(height / 8) * 8];
  if (cw % 8 || ch % 8) throw new TilesError(`a sprite cell must be a multiple of 8 pixels (got ${cw}x${ch})`);
  if (kind === 'sprite' && (cw / 8 > 4 || ch / 8 > 4)) throw new TilesError(`a sprite is at most 4x4 tiles (32x32 pixels); this cell is ${cw}x${ch}. Pass --cell 16x16 (or 32x32) to cut the picture into sprites`);
  const levels = kind === 'sprite' ? 3 : 4;
  const opaque = (x, y) => x < width && y < height && rgba[(y * width + x) * 4 + 3] >= 128;
  const colour = (x, y) => { const i = (y * width + x) * 4; return (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]; };
  const lum = (c) => 0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  // palette: the distinct opaque colours, light to dark; if there are too many, cluster by brightness into `levels` groups
  const counts = new Map();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (opaque(x, y)) counts.set(colour(x, y), (counts.get(colour(x, y)) || 0) + 1);
  const distinct = [...counts.keys()].sort((a, b) => lum(b) - lum(a));
  let palette = distinct, assign;
  if (distinct.length <= levels) {
    assign = new Map(distinct.map((c, i) => [c, i]));
  } else {
    const groups = Array.from({ length: levels }, () => []);
    distinct.forEach((c, i) => groups[Math.min(levels - 1, Math.floor((i * levels) / distinct.length))].push(c));
    palette = groups.map((g) => { let r = 0, gg = 0, b = 0, n = 0; for (const c of g) { const w = counts.get(c); r += (c >> 16) * w; gg += ((c >> 8) & 255) * w; b += (c & 255) * w; n += w; } return ((Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n)); });
    assign = new Map(); groups.forEach((g, gi) => g.forEach((c) => assign.set(c, gi)));
  }
  const offset = kind === 'sprite' ? 1 : 0;                 // sprite colour 0 is transparent: opaque colours are 1..3
  const cols = Math.ceil(width / cw), rows = Math.ceil(height / ch);
  const out = [`# made by vly import: ${width}x${height} pixels, ${distinct.length} colours`];
  const rgbs = palette.map((c) => `rgb(${(c >> 20) & 15}, ${(c >> 12) & 15}, ${(c >> 4) & 15})`);
  out.push(kind === 'sprite' ? `# obj_pal(P, 0, ${rgbs.join(', ')});   // colour 0 is clear; 1 is the lightest` : `# bg_pal(P, ${rgbs.join(', ')});   // 0 is the lightest`);
  let n = 0;
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const nm = cols * rows === 1 ? name : `${name}_${n}`;
    out.push(kind === 'sprite' ? `sprite ${nm} ${cw / 8}x${ch / 8}:` : `tile ${nm}:`);
    const w = kind === 'sprite' ? cw : 8, h = kind === 'sprite' ? ch : 8;
    for (let y = 0; y < h; y++) {
      let row = '  ';
      for (let x = 0; x < w; x++) {
        const px = cx * cw + x, py = cy * ch + y;
        row += opaque(px, py) ? String(assign.get(colour(px, py)) + offset) : '.';
      }
      out.push(row);
    }
    n++;
  }
  return { text: out.join('\n') + '\n', palette, colours: distinct.length, sprites: n };
}
