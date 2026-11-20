# VLY standard library

Generated from `src/lang/stdlib.js` by `npm run docs:stdlib`. Everything here is written in the VLY language itself;
only what your program calls is included in the cartridge. You can redefine any of it in your own code.

## Memory map

| Constant | Value | Meaning |
|---|---|---|
| `SAVE` | `0x6000` | 1 KB of save data (SAVE_SIZE bytes) |
| `SAVE_SIZE` | `1024` |  |
| `FONT` | `0x6400` | 95 built-in glyph tiles, ASCII 0x20-0x7E |
| `FONT_TILES` | `95` |  |
| `TILES` | `0x8000` | tile RAM: 512 tiles of 16 bytes |
| `BG_MAP` | `0xA000` | 32x32 background cells (2 bytes each) |
| `WIN_MAP` | `0xA800` | 32x32 window cells |
| `OAM` | `0xB000` | 64 sprites of 8 bytes |
| `BG_PAL` | `0xB200` | 8 palettes x 4 colors (RGB444 words) |
| `OBJ_PAL` | `0xB240` |  |
| `LCDC` | `0xB300` |  |
| `SCX` | `0xB302` |  |
| `SCY` | `0xB303` |  |
| `WX` | `0xB304` |  |
| `WY` | `0xB305` |  |
| `FRAME` | `0xB310` |  |
| `INPUT` | `0xB314` |  |
| `PRESSED` | `0xB316` |  |
| `STATUS` | `0xB318` |  |
| `SAVECTL` | `0xB320` |  |
| `ROMBANK` | `0xB322` |  |
| `AUDIO` | `0xB340` |  |
| `SCREEN_W` | `160` |  |
| `SCREEN_H` | `144` |  |


## Flags

| Constant | Value | Meaning |
|---|---|---|
| `LCD_BG` | `1` |  |
| `LCD_WIN` | `2` |  |
| `LCD_OBJ` | `4` |  |
| `BTN_UP` | `1` |  |
| `BTN_DOWN` | `2` |  |
| `BTN_LEFT` | `4` |  |
| `BTN_RIGHT` | `8` |  |
| `BTN_A` | `16` |  |
| `BTN_B` | `32` |  |
| `BTN_START` | `64` |  |
| `BTN_SELECT` | `128` |  |
| `CELL_PRIO` | `0x200` | background cell draws over sprites |
| `CELL_FLIPX` | `0x400` |  |
| `CELL_FLIPY` | `0x800` |  |
| `SPR_BEHIND` | `8` | sprite hides behind non-zero background pixels |
| `SPR_FLIPX` | `0x10` |  |
| `SPR_FLIPY` | `0x20` |  |
| `SPR_8X16` | `0x40` |  |
| `SPR_16X16` | `0x80` |  |
| `SPR_32X32` | `0xC0` |  |


## Input

- `held()`: Button bitmask held this frame (`BTN_*` flags).
- `pressed()`: Buttons that went from up to down this frame.
- `btn(mask)`: Is any button in `mask` held? Returns 0 or 1.
- `btnp(mask)`: Was any button in `mask` pressed this frame? Returns 0 or 1.
- `frames()`: The frame counter (low 16 bits).

## Display

- `lcd(flags)`: Set the display layers: `lcd(LCD_BG | LCD_WIN | LCD_OBJ)`.
- `scroll(x, y)`: Set the background scroll position (0-255 each, wraps).
- `window_pos(x, y)`: Set where the window layer starts on screen (`x`, `y`).
- `bg_pal(p, c0, c1, c2, c3)`: Set background palette `p` (0-7) to four colors (use `rgb(r,g,b)`).
- `obj_pal(p, c0, c1, c2, c3)`: Set sprite palette `p` (0-7) to four colors; color 0 is transparent.
- `load_tiles(src, first, count)`: Copy `count` tiles of art at `src` into tile RAM starting at tile `first`.
- `load_map(src, w, h, col, row)`: Copy a tilemap (`tilemap NAME = "file.map";`, with `NAME_W` / `NAME_H`) into the background map at (`col`, `row`).
- `map_cell(src, w, x, y)`: Read the cell at (`x`, `y`) of a tilemap that is `w` cells wide.
- `clear_bg()`: Clear the background map (all cells become tile 0, palette 0).
- `clear_win()`: Clear the window map.
- `set_cell(col, row, v)`: Set background map cell (`col`, `row`) to `v` = tile index, optionally `| (palette << 12) | CELL_FLIPX | CELL_FLIPY | CELL_PRIO`.
- `get_cell(col, row)`: Read background map cell (`col`, `row`).
- `set_wcell(col, row, v)`: Set window map cell (`col`, `row`).
- `fill_cells(col, row, w, h, v)`: Fill a `w` x `h` rectangle of background cells with `v`.

## Sprites

- `sprite(i, x, y, tile, attr)`: Set sprite `i` (0-63): position, first `tile`, and `attr` (`SPR_*` flags, `| palette`).
- `move_sprite(i, x, y)`: Move sprite `i` without changing its tile or attributes.
- `hide_sprite(i)`: Move sprite `i` off screen.
- `hide_all_sprites()`: Move all 64 sprites off screen (call once in `init()` before enabling `LCD_OBJ`).

## Text (uses the built-in font)

- `load_font(first)`: Copy the 95 built-in glyph tiles into tile RAM starting at tile `first` and remember it for `text()`.
- `put_text(map, col, row, s)`: Write string `s` into the 32x32 map at `map` (`BG_MAP` or `WIN_MAP`) starting at (`col`, `row`). `\n` starts a new line.
- `text(col, row, s)`: Write string `s` into the background map at (`col`, `row`). Needs `load_font` first. **Glyph ink is palette colour 3** of the tile's palette (colour 0 is the background): put your text colour in colour 3 of that palette.
- `wtext(col, row, s)`: Write string `s` into the window map.
- `utoa(n)`: Convert an unsigned number to a string in a shared buffer; returns its address (valid until the next call).
- `itoa(n)`: Convert a signed number to a string in a shared buffer; returns its address.
- `pad_map(map, col, row, used, width)`: Internal helper: blank cells so a number field is `width` columns wide.
- `print_u(col, row, n)`: Print an unsigned number at (`col`, `row`) in a 5-column field (clears stale digits).
- `print_i(col, row, n)`: Print a signed number at (`col`, `row`) in a 6-column field.
- `wprint_u(col, row, n)`: Print an unsigned number into the window layer in a 5-column field.
- `wprint_i(col, row, n)`: Print a signed number into the window layer in a 6-column field.
- variable `font_base`: Tile index where `load_font` put the glyphs.
- variable `text_pal`: Background palette (0-7) used by `text()`.

## Math

- `min(a, b)`: Smaller of two (signed) values.
- `max(a, b)`: Larger of two (signed) values.
- `clamp(v, lo, hi)`: Limit `v` to the range `lo..hi`.
- `abs(v)`: Absolute value.
- `sign(v)`: Returns -1, 0 or 1.
- `rand(n)`: Random number from 0 to `n - 1`.
- `rand_range(lo, hi)`: Random number from `lo` to `hi` inclusive.
- `overlap(ax, ay, aw, ah, bx, by, bw, bh)`: Do two rectangles (x, y, w, h) overlap? Returns 0 or 1.
- `sin(a)`: Sine of `a` where 256 is a full turn; result is 8.8 fixed point (-256..256).
- `cos(a)`: Cosine, same units as `sin`.

## Save data

- `save_loaded()`: Was the cartridge started with an existing save? (STATUS bit).
- `save_get(off)`: Read the 16-bit word at byte offset `off` (0-1022) of the save.
- `save_set(off, v)`: Write a 16-bit word into the save at byte offset `off`.
- `save_get8(off)`: Read a byte of the save.
- `save_set8(off, v)`: Write a byte of the save.
- `save_clear()`: Zero the whole 1,024-byte save region.
- `save_commit()`: Ask the host to store the save (the player may be prompted). Does not stop the program.
- `save_sum()`: Checksum of save bytes 0-1021 (about 20,000 cycles).
- `save_seal()`: Store the checksum at bytes 1022-1023; call before `save_commit()`.
- `save_valid()`: Does the stored checksum match? Use after loading to reject corrupt saves.

## Strings: a strings asset keeps text in a ROM bank (one string per line), so a long story never fills the always-visible region

- `str_get(a, bk, i, buf)`: Copy string `i` of a `strings NAME bank N = "story.txt";` asset into the RAM buffer `buf` (up to 255 characters) and return `buf`. Pass `NAME` and `NAME_BANK`; text lives in a ROM bank, so a long story never fills the always-visible region. One string per line in the file, `\n` inside a line is a line break; `NAME_COUNT` is the number of strings.
- `bank_peek8(bk, a)`: Read one byte of a banked asset from anywhere: `bank_peek8(bankof(song), song + offset)` for an `asset song bank 3 = incbin("song.bin");`. It selects the bank, reads, and puts the window back, so it is safe in every function (a helper of your own that only calls `select_bank` is undone on return when its caller was moved into a bank).
- `bank_peek(bk, a)`: Like `bank_peek8` but reads a 16-bit word.
- `isqrt(n)`: Integer square root of an unsigned 16-bit value (result 0 to 255): `isqrt(dx * dx + dy * dy)` is a distance while the squares fit in 16 bits (each of dx, dy under 181). For a larger or finer range scale the numbers down first (a distance in 1/8 px squared fits).

## Audio

- `tone(ch, hz, vol, duty)`: Start channel `ch` (0-1 pulse, 2 triangle, 3 noise) at `hz` with volume 0-15 and pulse `duty` 0-3.
- `tone_off(ch)`: Silence channel `ch`.
- `master_volume(v)`: Set the master volume 0-15.
- variable `audio_hold`: Frames left that a sound effect owns each audio channel (an array of 4); `std/music` leaves a held channel alone. Used by `std/sfx`.

## Example

```
tileset art = "art.tiles";

func init() {
  load_font(0);
  load_tiles(art, 100, art_COUNT);
  bg_pal(0, rgb(15,15,15), rgb(10,10,12), rgb(5,5,9), rgb(0,0,3));
  text(1, 1, "SCORE");
  lcd(LCD_BG | LCD_OBJ);
}

func frame() {
  print_u(7, 1, frames());
}
```
