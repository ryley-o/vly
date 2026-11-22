// Generates docs/stdlib.md from src/lang/stdlib.js. Fails if a function or constant has no description, so the
// documentation cannot drift from the library.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STDLIB_SOURCE } from '../src/lang/stdlib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = {
  // input
  held: 'Button bitmask held this frame (`BTN_*` flags).',
  pressed: 'Buttons that went from up to down this frame.',
  btn: 'Is any button in `mask` held? Returns 0 or 1.',
  btnp: 'Was any button in `mask` pressed this frame? Returns 0 or 1.',
  frames: 'The frame counter (low 16 bits).',
  // display
  lcd: 'Set the display layers: `lcd(LCD_BG | LCD_WIN | LCD_OBJ)`.',
  scroll: 'Set the background scroll position (0-255 each, wraps).',
  window_pos: 'Set where the window layer starts on screen (`x`, `y`).',
  bg_pal: 'Set background palette `p` (0-7) to four colors (use `rgb(r,g,b)`).',
  obj_pal: 'Set sprite palette `p` (0-7) to four colors; color 0 is transparent.',
  load_tiles: 'Copy `count` tiles of art at `src` into tile RAM starting at tile `first`.',
  load_map: 'Copy a tilemap (`tilemap NAME = "file.map";`, with `NAME_W` / `NAME_H`) into the background map at (`col`, `row`).',
  map_cell: 'Read the cell at (`x`, `y`) of a tilemap that is `w` cells wide.',
  clear_bg: 'Clear the background map (all cells become tile 0, palette 0).',
  clear_win: 'Clear the window map.',
  set_cell: 'Set background map cell (`col`, `row`) to `v` = tile index, optionally `| (palette << 12) | CELL_FLIPX | CELL_FLIPY | CELL_PRIO`.',
  get_cell: 'Read background map cell (`col`, `row`).',
  set_wcell: 'Set window map cell (`col`, `row`).',
  fill_cells: 'Fill a `w` x `h` rectangle of background cells with `v`.',
  // sprites
  sprite: 'Set sprite `i` (0-63): position, first `tile`, and `attr` (`SPR_*` flags, `| palette`).',
  move_sprite: 'Move sprite `i` without changing its tile or attributes.',
  hide_sprite: 'Move sprite `i` off screen.',
  hide_all_sprites: 'Move all 64 sprites off screen (call once in `init()` before enabling `LCD_OBJ`).',
  // text
  load_font: 'Copy the 95 built-in glyph tiles into tile RAM starting at tile `first` and remember it for `text()`.',
  put_text: 'Write string `s` into the 32x32 map at `map` (`BG_MAP` or `WIN_MAP`) starting at (`col`, `row`). `\\n` starts a new line.',
  text: 'Write string `s` into the background map at (`col`, `row`). Needs `load_font` first. **Glyph ink is palette colour 3** of the tile\'s palette (colour 0 is the background): put your text colour in colour 3 of that palette.',
  wtext: 'Write string `s` into the window map.',
  utoa: 'Convert an unsigned number to a string in a shared buffer; returns its address (valid until the next call).',
  itoa: 'Convert a signed number to a string in a shared buffer; returns its address.',
  pad_map: 'Internal helper: blank cells so a number field is `width` columns wide.',
  print_u: 'Print an unsigned number at (`col`, `row`) in a 5-column field (clears stale digits). Left-aligned: the number starts at `col`.',
  print_i: 'Print a signed number at (`col`, `row`) in a 6-column field.',
  wprint_u: 'Print an unsigned number into the window layer in a 5-column field. The number is written from `col` (left-aligned) and the rest of the field is blanked, so put a label at least 5 columns before the next thing on the row.',
  wprint_i: 'Print a signed number into the window layer in a 6-column field (left-aligned like `wprint_u`).',
  // math
  min: 'Smaller of two (signed) values.',
  max: 'Larger of two (signed) values.',
  clamp: 'Limit `v` to the range `lo..hi`.',
  abs: 'Absolute value.',
  sign: 'Returns -1, 0 or 1.',
  rand: 'Random number from 0 to `n - 1`.',
  rand_range: 'Random number from `lo` to `hi` inclusive.',
  overlap: 'Do two rectangles (x, y, w, h) overlap? Returns 0 or 1.',
  sin: 'Sine of `a` where 256 is a full turn; result is 8.8 fixed point (-256..256).',
  cos: 'Cosine, same units as `sin`.',
  // save
  save_loaded: 'Was the cartridge started with an existing save? (STATUS bit).',
  save_get: 'Read the 16-bit word at byte offset `off` (0-1022) of the save.',
  save_set: 'Write a 16-bit word into the save at byte offset `off`.',
  save_get8: 'Read a byte of the save.',
  save_set8: 'Write a byte of the save.',
  save_clear: 'Zero the whole 1,024-byte save region.',
  save_commit: 'Ask the host to store the save (the player may be prompted). Does not stop the program.',
  save_sum: 'Checksum of save bytes 0-1021 (about 20,000 cycles).',
  save_seal: 'Store the checksum at bytes 1022-1023; call before `save_commit()`.',
  save_valid: 'Does the stored checksum match? Use after loading to reject corrupt saves.',
  // strings
  bank_peek8: 'Read one byte of a banked asset from anywhere: `bank_peek8(bankof(song), song + offset)` for an `asset song bank 3 = incbin("song.bin");`. It selects the bank, reads, and puts the window back, so it is safe in every function (a helper of your own that only calls `select_bank` is undone on return when its caller was moved into a bank).',
  isqrt: 'Integer square root of an unsigned 16-bit value (result 0 to 255): `isqrt(dx * dx + dy * dy)` is a distance while the squares fit in 16 bits (each of dx, dy under 181). For a larger or finer range scale the numbers down first (a distance in 1/8 px squared fits).',
  bank_peek: 'Like `bank_peek8` but reads a 16-bit word.',
  str_get: 'Copy string `i` of a `strings NAME bank N = "story.txt";` asset into the RAM buffer `buf` (up to 255 characters) and return `buf`. Pass `NAME` and `NAME_BANK`; text lives in a ROM bank, so a long story never fills the always-visible region. One string per line in the file, `\\n` inside a line is a line break; `NAME_COUNT` is the number of strings.',
  // audio
  tone: 'Start channel `ch` (0-1 pulse, 2 triangle, 3 noise) at `hz` with volume 0-15 and pulse `duty` 0-3.',
  tone_off: 'Silence channel `ch`.',
  master_volume: 'Set the master volume 0-15.',
};
const VAR_DOCS = { font_base: 'Tile index where `load_font` put the glyphs.', text_pal: 'Background palette (0-7) used by `text()`.', numbuf: 'Internal number-to-text buffer.', sin_q: 'Internal quarter-wave sine table.', audio_hold: 'Frames left that a sound effect owns each audio channel (an array of 4); `std/music` leaves a held channel alone. Used by `std/sfx`.' };

const lines = STDLIB_SOURCE.split('\n');
const sections = [];
let cur = { title: 'General', items: [] };
const missing = [];
for (const line of lines) {
  const sec = /^\/\/ ===== (.+) =====/.exec(line);
  if (sec) { cur = { title: sec[1], items: [] }; sections.push(cur); continue; }
  let m;
  if ((m = /^const (\w+) = ([^;]+);\s*(?:\/\/\s*(.*))?$/.exec(line))) cur.items.push({ kind: 'const', name: m[1], value: m[2], note: m[3] || '' });
  else if ((m = /^func (\w+)\(([^)]*)\)/.exec(line))) {
    if (!DOCS[m[1]]) missing.push(m[1]);
    cur.items.push({ kind: 'func', name: m[1], params: m[2].trim(), doc: DOCS[m[1]] || '' });
  } else if ((m = /^(?:var|byte|table) (\w+)/.exec(line)) && !m[1].startsWith('_')) {
    if (!VAR_DOCS[m[1]]) missing.push(m[1]);
    cur.items.push({ kind: 'var', name: m[1], doc: VAR_DOCS[m[1]] || '' });
  }
}
const known = new Set(sections.flatMap((s) => s.items.map((i) => i.name)));
const stale = Object.keys(DOCS).filter((k) => !known.has(k));
if (missing.length || stale.length) {
  console.error(`stdlib docs out of sync. missing descriptions: ${missing.join(', ') || '-'}; descriptions for unknown names: ${stale.join(', ') || '-'}`);
  process.exit(1);
}

let md = '# VLY standard library\n\nGenerated from `src/lang/stdlib.js` by `npm run docs:stdlib`. Everything here is written in the VLY language itself;\nonly what your program calls is included in the cartridge. You can redefine any of it in your own code.\n\n';
for (const s of sections) {
  md += `## ${s.title[0].toUpperCase()}${s.title.slice(1)}\n\n`;
  const consts = s.items.filter((i) => i.kind === 'const');
  if (consts.length) {
    md += '| Constant | Value | Meaning |\n|---|---|---|\n' + consts.map((c) => `| \`${c.name}\` | \`${c.value}\` | ${c.note} |`).join('\n') + '\n\n';
  }
  for (const f of s.items.filter((i) => i.kind === 'func' && i.name !== 'pad_to')) md += `- \`${f.name}(${f.params})\`: ${f.doc}\n`;
  const vars = s.items.filter((i) => i.kind === 'var' && !['numbuf', 'sin_q'].includes(i.name));
  for (const v of vars) md += `- variable \`${v.name}\`: ${v.doc}\n`;
  md += '\n';
}
md += '## Example\n\n```\ntileset art = "art.tiles";\n\nfunc init() {\n  load_font(0);\n  load_tiles(art, 100, art_COUNT);\n  bg_pal(0, rgb(15,15,15), rgb(10,10,12), rgb(5,5,9), rgb(0,0,3));\n  text(1, 1, "SCORE");\n  lcd(LCD_BG | LCD_OBJ);\n}\n\nfunc frame() {\n  print_u(7, 1, frames());\n}\n```\n';
fs.writeFileSync(path.join(root, 'docs', 'stdlib.md'), md);
console.log('wrote docs/stdlib.md');
