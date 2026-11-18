// The VLY standard library, written in the VLY language itself. It is parsed with every program, but only the
// functions, tables and variables your code actually uses end up in the cartridge. Any name defined here can be
// redefined in your own code. Documented in docs/stdlib.md (generated from this file by `npm run docs`).

const sinQuarter = Array.from({ length: 65 }, (_, i) => Math.round(256 * Math.sin((i * Math.PI) / 128)));

export const STDLIB_SOURCE = `
// ===== memory map =====
const SAVE = 0x6000;       // 1 KB of save data (SAVE_SIZE bytes)
const SAVE_SIZE = 1024;
const FONT = 0x6400;       // 95 built-in glyph tiles, ASCII 0x20-0x7E
const FONT_TILES = 95;
const TILES = 0x8000;      // tile RAM: 512 tiles of 16 bytes
const BG_MAP = 0xA000;     // 32x32 background cells (2 bytes each)
const WIN_MAP = 0xA800;    // 32x32 window cells
const OAM = 0xB000;        // 64 sprites of 8 bytes
const BG_PAL = 0xB200;     // 8 palettes x 4 colors (RGB444 words)
const OBJ_PAL = 0xB240;
const LCDC = 0xB300;
const SCX = 0xB302;
const SCY = 0xB303;
const WX = 0xB304;
const WY = 0xB305;
const FRAME = 0xB310;
const INPUT = 0xB314;
const PRESSED = 0xB316;
const STATUS = 0xB318;
const SAVECTL = 0xB320;
const ROMBANK = 0xB322;
const AUDIO = 0xB340;
const SCREEN_W = 160;
const SCREEN_H = 144;

// ===== flags =====
const LCD_BG = 1;
const LCD_WIN = 2;
const LCD_OBJ = 4;
const BTN_UP = 1;
const BTN_DOWN = 2;
const BTN_LEFT = 4;
const BTN_RIGHT = 8;
const BTN_A = 16;
const BTN_B = 32;
const BTN_START = 64;
const BTN_SELECT = 128;
const CELL_PRIO = 0x200;   // background cell draws over sprites
const CELL_FLIPX = 0x400;
const CELL_FLIPY = 0x800;
const SPR_BEHIND = 8;      // sprite hides behind non-zero background pixels
const SPR_FLIPX = 0x10;
const SPR_FLIPY = 0x20;
const SPR_8X16 = 0x40;
const SPR_16X16 = 0x80;
const SPR_32X32 = 0xC0;

// ===== input =====
func held() { return peek(INPUT); }
func pressed() { return peek(PRESSED); }
func btn(mask) { return (peek(INPUT) & mask) != 0; }
func btnp(mask) { return (peek(PRESSED) & mask) != 0; }
func frames() { return peek(FRAME); }

// ===== display =====
func lcd(flags) { poke(LCDC, flags); }
func scroll(x, y) { poke8(SCX, x); poke8(SCY, y); }
func window_pos(x, y) { poke8(WX, x); poke8(WY, y); }
func bg_pal(p, c0, c1, c2, c3) {
  var a = BG_PAL + p * 8;
  poke(a, c0); poke(a + 2, c1); poke(a + 4, c2); poke(a + 6, c3);
}
func obj_pal(p, c0, c1, c2, c3) {
  var a = OBJ_PAL + p * 8;
  poke(a, c0); poke(a + 2, c1); poke(a + 4, c2); poke(a + 6, c3);
}
func load_tiles(src, first, count) { copy(TILES + first * 16, src, count * 16); }

// Copy a tilemap (see "tilemap NAME = ...") into the background map with its top-left at (col, row).
func load_map(src, w, h, col, row) {
  var n = min(w, 32 - col);
  for (var y = 0; y < h && row + y < 32; y++) {
    copy(BG_MAP + (((row + y) << 5) + col) * 2, src + y * w * 2, n * 2);
  }
}
// The map cell at (x, y) of a tilemap that is w cells wide.
func map_cell(src, w, x, y) { return peek(src + (y * w + x) * 2); }
func clear_bg() { fill(BG_MAP, 0, 2048); }
func clear_win() { fill(WIN_MAP, 0, 2048); }
func set_cell(col, row, v) { poke(BG_MAP + ((row << 5) + col) * 2, v); }
func get_cell(col, row) { return peek(BG_MAP + ((row << 5) + col) * 2); }
func set_wcell(col, row, v) { poke(WIN_MAP + ((row << 5) + col) * 2, v); }
func fill_cells(col, row, w, h, v) {
  var y = 0;
  while (y < h) {
    var x = 0;
    while (x < w) { set_cell(col + x, row + y, v); x++; }
    y++;
  }
}

// ===== sprites =====
func sprite(i, x, y, tile, attr) {
  var a = OAM + (i << 3);
  poke(a, x); poke(a + 2, y); poke(a + 4, tile); poke(a + 6, attr);
}
func move_sprite(i, x, y) {
  var a = OAM + (i << 3);
  poke(a, x); poke(a + 2, y);
}
func hide_sprite(i) { poke(OAM + (i << 3) + 2, 0x7FFF); }
func hide_all_sprites() {
  var i = 0;
  while (i < 64) { hide_sprite(i); i++; }
}

// ===== text (uses the built-in font) =====
var font_base;   // tile index where load_font() put the glyphs
var text_pal;    // background palette (0-7) used for text
func load_font(first) {
  font_base = first;
  copy(TILES + first * 16, FONT, FONT_TILES * 16);
}
func put_text(map, col, row, s) {
  var start = map + ((row << 5) + col) * 2;
  var a = start;
  var c = peek8(s);
  while (c != 0) {
    if (c == 10) {
      start = start + 64;
      a = start;
    } else {
      if (c >= 32 && c <= 126) { poke(a, (c - 32) + font_base + (text_pal << 12)); }
      a = a + 2;
    }
    s = s + 1;
    c = peek8(s);
  }
}
func text(col, row, s) { put_text(BG_MAP, col, row, s); }
func wtext(col, row, s) { put_text(WIN_MAP, col, row, s); }

byte numbuf[8];
func utoa(n) {
  var p = 7;
  numbuf[7] = 0;
  while (1) {
    p = p - 1;
    numbuf[p] = 48 + umod(n, 10);
    n = udiv(n, 10);
    if (n == 0) { break; }
  }
  return numbuf + p;
}
func itoa(n) {
  if (n < 0) {
    var s = utoa(0 - n);
    s = s - 1;
    poke8(s, 45);
    return s;
  }
  return utoa(n);
}
// print_u / print_i write right-padded fields (5 and 6 columns) so a shrinking number leaves no stale digits.
func pad_map(map, col, row, used, width) {
  while (used < width) { poke(map + ((row << 5) + col + used) * 2, font_base + (text_pal << 12)); used++; }
}
func print_u(col, row, n) {
  var s = utoa(n);
  text(col, row, s);
  pad_map(BG_MAP, col, row, numbuf + 7 - s, 5);
}
func print_i(col, row, n) {
  var s = itoa(n);
  text(col, row, s);
  pad_map(BG_MAP, col, row, numbuf + 7 - s, 6);
}
// Same as print_u / print_i, drawn into the window layer.
func wprint_u(col, row, n) {
  var s = utoa(n);
  wtext(col, row, s);
  pad_map(WIN_MAP, col, row, numbuf + 7 - s, 5);
}
func wprint_i(col, row, n) {
  var s = itoa(n);
  wtext(col, row, s);
  pad_map(WIN_MAP, col, row, numbuf + 7 - s, 6);
}

// ===== math =====
func min(a, b) { if (a < b) { return a; } return b; }
func max(a, b) { if (a > b) { return a; } return b; }
func clamp(v, lo, hi) { if (v < lo) { return lo; } if (v > hi) { return hi; } return v; }
func abs(v) { if (v < 0) { return 0 - v; } return v; }
func sign(v) { if (v < 0) { return -1; } if (v > 0) { return 1; } return 0; }
func rand(n) { return umod(rnd(), n); }
func rand_range(lo, hi) { return lo + umod(rnd(), hi - lo + 1); }
func overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
}

// sin/cos: angle 0-255 is one full turn; the result is 8.8 fixed point (-256..256).
table sin_q = { ${sinQuarter.join(', ')} };
func sin(a) {
  a = a & 255;
  var q = a >> 6;
  var i = a & 63;
  if (q == 0) { return sin_q[i]; }
  if (q == 1) { return sin_q[64 - i]; }
  if (q == 2) { return 0 - sin_q[i]; }
  return 0 - sin_q[64 - i];
}
func cos(a) { return sin(a + 64); }

// ===== save data =====
func save_loaded() { return (peek(STATUS) & 0x100) != 0; }
func save_get(off) { return peek(SAVE + off); }
func save_set(off, v) { poke(SAVE + off, v); }
func save_get8(off) { return peek8(SAVE + off); }
func save_set8(off, v) { poke8(SAVE + off, v); }
func save_clear() { fill(SAVE, 0, SAVE_SIZE); }
func save_commit() { poke(SAVECTL, 1); }
// Optional integrity check: a 16-bit sum of the words at bytes 0..1021, stored at bytes 1022-1023.
// It costs roughly 25,000 cycles, so call it once (not every frame).
func save_sum() {
  var s = 0;
  var a = SAVE;
  var end = SAVE + 1022;
  while (ult(a, end)) { s = s + peek(a); a = a + 2; }
  return s;
}
func save_seal() { poke(SAVE + 1022, save_sum()); }
func save_valid() { return peek(SAVE + 1022) == save_sum(); }

// ===== strings: a strings asset keeps text in a ROM bank (one string per line), so a long story never fills the always-visible region =====
// Copy string i into buf (RAM, up to 255 characters) and return buf. Pass NAME and NAME_BANK. Safe to call from anywhere.
func str_get(a, bk, i, buf) {
  var prev = peek8(ROMBANK);
  if (bk != 0) { select_bank(bk); }
  var p = a + peek(a + 2 + i * 2);
  var n = 0;
  var c = peek8(p);
  while (c != 0 && n < 255) { poke8(buf + n, c); n++; c = peek8(p + n); }
  poke8(buf + n, 0);
  if (bk != 0) { select_bank(prev); }
  return buf;
}

// Read a byte or word of a banked asset from anywhere: bank_peek8(NAME_BANK, NAME + offset). Puts the bank window back, so it is safe in moved functions.
func bank_peek8(bk, a) {
  var prev = peek8(ROMBANK);
  select_bank(bk);
  var v = peek8(a);
  select_bank(prev);
  return v;
}
func bank_peek(bk, a) {
  var prev = peek8(ROMBANK);
  select_bank(bk);
  var v = peek(a);
  select_bank(prev);
  return v;
}

// Integer square root of an unsigned 16-bit value (0 to 255), for distances: isqrt(dx * dx + dy * dy) when both are under 181.
func isqrt(n) {
  var r = 0;
  var b = 0x4000;
  while (b != 0) {
    if (uge(n, r + b)) { n = n - r - b; r = (r >> 1) + b; } else { r = r >> 1; }
    b = b >> 2;
  }
  return r;
}

// ===== audio =====
func tone(ch, hz, vol, duty) {
  var a = AUDIO + (ch << 2);
  poke(a, hz); poke8(a + 2, vol); poke8(a + 3, 0x80 | duty);
}
func tone_off(ch) { poke8(AUDIO + (ch << 2) + 3, 0); }
func master_volume(v) { poke8(AUDIO + 16, v); }
// Frames left that a sound effect owns each channel; std/music does not touch a channel while it is held (see std/sfx).
var audio_hold[4];
`;
