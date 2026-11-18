// ASCII level maps (*.map). Browser-safe.
//
//   legend:
//     # = world_tree | (1 << 12)        a character and the 16-bit map cell it stands for (any constant expression)
//     . = world_grass
//     P = world_grass, marker           ", marker" records where this character appears (spawn points, items, enemies)
//   map:
//   ##########
//   #..P.....#
//   ##########
//
// Lines starting with // in the legend are comments. Rows under `map:` are taken literally and must all be the same
// width. Every character must be in the legend.

export class MapError extends Error {}

export function parseMapText(text, filename = 'input.map') {
  const lines = text.split(/\r?\n/);
  const fail = (ln, msg) => { throw new MapError(`${filename}:${ln + 1}: ${msg}`); };
  let mode = null;
  const legend = new Map();
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (mode === null || mode === 'legend') {
      const t = raw.trim();
      if (t === '' || t.startsWith('//')) continue;
      if (/^legend:\s*$/i.test(t)) { mode = 'legend'; continue; }
      if (/^map:\s*$/i.test(t)) { mode = 'map'; continue; }
      if (mode === 'legend') {
        const m = /^(\S)\s*=\s*(.+?)(?:\s*,\s*(marker))?\s*$/.exec(t);
        if (!m) fail(i, `bad legend line "${t}" (expected: C = expression  or  C = expression, marker)`);
        if (legend.has(m[1])) fail(i, `character '${m[1]}' is defined twice in the legend`);
        if (m[3] && !/^[A-Za-z0-9]$/.test(m[1])) fail(i, 'marker characters must be a letter or digit');
        legend.set(m[1], { expr: m[2], marker: !!m[3], line: i + 1 });
        continue;
      }
      fail(i, 'expected "legend:" or "map:"');
    } else {
      if (raw.trim() === '' && rows.length === 0) continue;
      rows.push({ text: raw.replace(/\s+$/, ''), line: i });
    }
  }
  while (rows.length && rows[rows.length - 1].text === '') rows.pop();
  if (!legend.size) throw new MapError(`${filename}: missing "legend:" section`);
  if (!rows.length) throw new MapError(`${filename}: missing "map:" section or it is empty`);
  const width = Math.max(...rows.map((r) => r.text.length));
  const markers = new Map();
  rows.forEach((r, y) => {
    if (r.text.length !== width) fail(r.line, `row ${y + 1} is ${r.text.length} characters wide but the map is ${width} wide (trailing spaces are ignored; use a legend entry for blanks)`);
    for (let x = 0; x < width; x++) {
      const ch = r.text[x];
      const l = legend.get(ch);
      if (!l) fail(r.line, `character '${ch}' at column ${x + 1} is not in the legend`);
      if (l.marker) { if (!markers.has(ch)) markers.set(ch, []); markers.get(ch).push({ x, y }); }
    }
  });
  if (width > 255 || rows.length > 255) throw new MapError(`${filename}: maps may be at most 255 x 255`);
  return { legend, rows: rows.map((r) => r.text), width, height: rows.length, markers };
}
