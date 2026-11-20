# The VLY language

VLY is a small C-like language that compiles to VLY-1 machine code. Source files end in `.vly`. It is designed to
be easy for people and AI agents to write correctly: one numeric type, no hidden behavior, and precise error
messages. Read this once; then read `vly docs stdlib` for the standard library.

```
// hello.vly
var x = 20;

func init() {                       // optional: runs once at power-on
  load_font(0);
  text(1, 1, "HELLO");
  lcd(LCD_BG);
}

func frame() {                      // required: runs 60 times per second
  x = x + btn(BTN_RIGHT);
}
```

## Values and types

There is **one type: a 16-bit word**. Whether it is signed or unsigned depends on the operation:

| Operation | Behavior |
|---|---|
| `+ - * & \| ^ ~ <<` | identical for signed and unsigned (results wrap at 16 bits) |
| `< <= > >=` | **signed** comparison. Use `ult(a,b) ule ugt uge` for unsigned |
| `>>` | **arithmetic** (sign-preserving) shift; `>>>` is logical |
| `/` and `%` | **signed**, truncating toward zero (`-7 / 2 == -3`, `-7 % 3 == -1`). `udiv(a,b)` / `umod(a,b)` are unsigned and faster |
| shift counts | taken modulo 16 (`x << 17` is `x << 1`) |
| `==` `!=` `!` `&&` `\|\|` | give `0` or `1`; `&&` and `\|\|` short-circuit |
| `a ? b : c` | ternary |

Numbers: decimal `42`, hex `0xB400`, binary `0b1010`, characters `'A'` and `'\n'`, `true` (1) and `false` (0).
Literals must fit in 16 bits (0 to 65535); write negatives with a minus sign (`-5`). Strings `"text"` are the
**address** of a zero-terminated byte string in ROM, usable anywhere a number is.

Division by zero yields `0xFFFF` for `/` and the dividend for `%`, and sets the DIV0 fault (visible in `vly run`).

## Declarations (top level)

```
const SPEED = 2;                  // compile-time constant (may use other constants and operators)
var score;                        // global word in RAM, starts at 0
var lives = 3;                    // global with a constant (or string) initial value
var scores[8];                    // global word array
byte buf[64];                     // global byte array
table sizes = { 8, 16, 32 };      // read-only word table in ROM (entries: constants or strings)
btable map = { 1, 0, 1, 1 };      // read-only byte table in ROM
asset blob = incbin("data.bin");  // raw file contents in ROM; blob is its address; blob_SIZE is its length
tileset art = "art.tiles";        // tile art from a text file (see "Tile art" below)
tilemap level = "level.map";     // a level drawn as ASCII art (see `vly docs modules`)
asset big bank 5 = incbin("x.bin");   // data in ROM bank 5 (see "Banks")
                                  // (a `tilemap` cannot go in a bank: it stays in the always-visible 16 KB at 2 bytes per cell)
import "other.vly";               // include another source file
import "std/ui";                   // built-in modules: std/ui (menus, dialogue), std/anim, std/music
func name(a, b) { ... }           // function; returns a value with `return expr;`
func big(a) bank 4 { ... }        // a function whose code lives in ROM bank 4 (see "Banks")
```

- Order does not matter: you can use a function or table before it is declared.
- Global initializers must be constants. To start from a computed value, assign it in `init()`.
- Arrays are indexed from 0 and **not bounds-checked**. `scores[i]` is a variable, so `scores` alone is its address.
- A global is only allocated (and an initializer only runs) if reachable code uses it, so unused variables cost nothing.

## Statements

```
var a = 1;                        // local variable (stack); scoped to its block
a = a + 1;    a += 2;    a++;     // assignment; compound ops: += -= *= /= %= &= |= ^= <<= >>=
scores[i] = 5;    scores[i] += 1; // array element
if (a > 2) { ... } else if (a == 0) { ... } else { ... }
while (a < 10) { ... }
for (var i = 0; i < 8; i++) { ... }
break;  continue;  return;  return a + 1;
{ ... }                           // block
f(a, b);                          // call as a statement (result ignored)
asm("MOV r1, r0");                // inline assembly (see below)
```

Braces are optional around a single statement. Every statement ends with `;`. Comments are `// line` and `/* block */`.
Compound assignment on an array element evaluates the index expression twice, so avoid side effects there.

## Functions

- Parameters and locals are stack variables holding **one word each**. There are no local arrays: declare arrays globally (`var cells[64];`), and pass a function an array's *address* (the array name alone) which it reads with `peek(p + i * 2)` and `peek8(p + i)` and writes with `poke(p + i * 2, v)`. Recursion works; the stack has about 4 KB, so keep recursion shallow.
- Arguments are evaluated left to right. A function with no `return` yields an undefined value; use `return expr;`
  when you need one.
- `init()` (optional, no parameters) runs once at power-on with a budget of 1,200,000 cycles. `frame()` (required,
  no parameters) runs once per frame with a budget of 120,000 cycles. If a routine exceeds its budget it is cut off
  and `vly run` / `vly test` report an OVERRUN fault.
- You may redefine any standard library function; your definition wins.
- Only functions reachable from `init()` and `frame()` are included in the cartridge (others get a warning).

## Intrinsics (built in)

| Call | Meaning |
|---|---|
| `peek(addr)` / `peek8(addr)` | read a 16-bit word / byte |
| `poke(addr, v)` / `poke8(addr, v)` | write a word / byte |
| `copy(dst, src, n)` | copy `n` bytes (overlap-safe; this is the `MCPY` instruction) |
| `fill(dst, byte, n)` | set `n` bytes (`MSET`) |
| `rnd()` | next 16-bit random number; `srand(hi, lo)` reseeds (the start state is fixed) |
| `udiv(a, b)` `umod(a, b)` | unsigned divide / modulo |
| `fmul(a, b)` | signed 8.8 fixed-point multiply `(a*b) >> 8` |
| `ult(a,b) ule ugt uge` | unsigned comparisons (0 or 1) |
| `rgb(r, g, b)` | color word from components 0-15, evaluated at compile time (arguments must be constants) |
| `select_bank(n)` | choose which ROM bank appears at `0x4000` |
| `bankof(asset)` | the bank number of an asset or tileset |
| `halt()` | end the current routine immediately |
| `asm("...")` | inline assembly text |

## The memory map in code

The standard library defines constants for every address, flag and button; see `vly docs stdlib`. The essentials:
tile RAM `TILES` (0x8000, 512 tiles of 16 bytes), background map `BG_MAP`, window map `WIN_MAP`, sprite table `OAM`
(64 sprites of 8 bytes), palettes `BG_PAL` / `OBJ_PAL`, save data `SAVE` (1,024 bytes), and registers `LCDC`, `SCX`,
`SCY`, `WX`, `WY`, `INPUT`, `PRESSED`. Work RAM for your variables is 0xB400-0xEFFF.

## Tile art

Tiles are 8x8 pixels with 4 colors (0-3). Write art as text in a `.tiles` file:

```
# art.tiles
tile grass:               # one tile: 8 rows of 8 characters
  ........
  ..1.....
  ........
  ........
  ........
  ........
  ........
  ........
sprite hero 2x2:          # 2 tiles wide, 2 tall: 16 rows of 16 characters
  ................
  ...
```

Characters: `.` or space = 0, `0` `1` `2` `3` = that color index, `#` = 3. In code:

```
tileset art = "art.tiles";
load_tiles(art, 100, art_COUNT);        // copy all tiles into tile RAM starting at tile 100
set_cell(2, 3, 100 + art_grass);        // art_grass is the tile index within the set
sprite(0, x, y, 100 + art_hero, SPR_16X16);
```

`NAME_COUNT` is the tile count, `NAME_SIZE` the byte size, and `NAME_tilename` the first tile index of each named
tile or sprite. A sprite of `WxH` tiles uses `W*H` consecutive tiles in row-major order, exactly what the sprite
hardware expects. Sprite color 0 is transparent; background color 0 is opaque. **Draw order: a lower sprite number draws on top of a higher one**, so the first sprite you place is the frontmost (put a pet's face before its body, a message before the scenery); `std/sprites` numbers sprites in the order you call `spr()`, so call what must be on top first and far scenery (mountains, clouds) last. In a `.tiles` pixel row every character is a pixel: a stray
space counts as transparent colour 0 and silently shifts the row (the width error appears only when you preview). The tileset name (`art`) is also the
ROM address of its data, so `copy()` can read from it, for example to animate coins or lava by copying frames into the tile memory.

Colors come from palettes: each tile cell or sprite picks one of 8 palettes, each with 4 colors (`bg_pal`, `obj_pal`).
Preview art any time with `vly tiles art.tiles --sheet preview.png` (or the `vly_tiles` MCP tool).

**Mirroring and tilting.** The hardware mirrors for free: `SPR_FLIPX` / `SPR_FLIPY` in a sprite's `attr` and `CELL_FLIPX` /
`CELL_FLIPY` in a map cell, so draw a character facing one way only. There is no rotation. For tilt or banking, ask the art file
for pre-rotated copies of a sprite (degrees, positive is clockwise, about the sprite's centre; the copies are the same size):

```
sprite truck 2x1:
  ................
  ...
rotate truck -20,-10,10,20 as truck_tilt     # truck_tilt_m20, truck_tilt_m10, truck_tilt_p10, truck_tilt_p20
```

Each name is a constant for its first tile, like any other. Keep tilting sprites inside their bounding box (leave a
margin) and pick the frame from the angle: `tile = truck_tilt_p10` when the nose is up about 10 degrees.

**Draw it by hand.** The sprite editor (https://vly-1.vercel.app/sprites.html) is a 4-colour pixel editor in the browser: pencil, fill, flip, shift, a live preview, a picture importer, and it writes the `.tiles` text (with an optional `rotate` line for tilt frames). Paste existing `.tiles` text back in to edit it.

**Pictures in, art out.** `vly import picture.png --name hero [--cell 16x16] -o hero.tiles` turns any PNG into `.tiles` text,
reducing it to the 3 colours a sprite can show (4 for tiles with `--tile`) and printing the palette to set. Fully transparent pixels become colour 0.

## Strings in banks: long text and dialogue

String literals (`"HELLO"`) are stored in the 16 KB the CPU always sees, together with the code, so a story or a lot of dialogue fills it fast ("must always be visible"
errors). Put text in a ROM bank instead with a `strings` asset: a text file with **one string per line** (`\n` inside a line is a line break, `\\` a backslash):

```
strings story bank 3 = "story.txt";          // up to 8 KB per file; use story2 bank 4 = "story2.txt"; for more
byte line[256];
func show(i) { text(1, 1, str_get(story, story_BANK, i, line)); }      // copies string i into RAM and returns it
```

`str_get(asset, NAME_BANK, i, buf)` copies string `i` (up to 255 characters) into the RAM buffer `buf` and gives `buf` back, leaving the bank window as it found it, so it is
safe to call from anywhere. `NAME_COUNT` is the number of strings. Without `bank N` the text stays in the always-visible region (fine for a few lines).

## Banks and large cartridges

A cartridge is up to 1 MB, but the CPU has a 16-bit address space, so it sees the image through a keyhole: the first
**16 KB is always visible**, and an 8 KB window at `0x4000` shows one **bank** at a time (banks are numbered from 2,
8 KB each). You rarely need to think about this, because the compiler does the bookkeeping:

- A small program (up to 24 KB, never switching banks) is simply one flat region.
- **When code outgrows that, the compiler moves functions into banks by itself**, largest first, and routes calls to
  them through a 26-byte stub that switches bank, calls, and switches back. Your source does not change. `vly build`
  tells you what it did: `always-visible region: 15736/16384 bytes; bank 2: 3378/8192` and
  `moved to banks to make room: hero_step (2), critters_update (2)`.
- What must stay in the always-visible 16 KB: tables, strings, unbanked art and maps, the standard library, and any
  function the compiler cannot move safely (one that calls `select_bank()`, names an asset that lives in a bank, reads
  through a computed address with `peek`/`copy`, or contains `asm`). If that does not fit, the error lists the biggest
  functions and why each one has to stay.

**Let the compiler choose the bank: `bank auto`.** Write `bank auto` instead of a number and the compiler packs your assets into banks itself (largest first, several small ones to a bank, never in a bank you named yourself). Read them from anywhere with `bank_peek8(bankof(x), x + i)`, or `str_get(NAME, NAME_BANK, ...)` for strings. Nothing is wasted in the cartridge but the room left in the last bank, and `vly build` prints what went where. Assets without `bank` stay in the always-visible 16 KB, which is the fastest to read (no bank switch), so keep small things you touch every frame there.

```
tileset art bank auto = "art.tiles";
strings story bank auto = "story.txt";
asset music bank auto = incbin("music.bin");
```

**Many levels or records: `records`.** An asset can be a table of fixed-size records, such as 200 levels of 240 bytes. It is spread over as many banks as it needs (whole records only, 34 of them to a bank here), and you read it by number without thinking about banks:

```
asset levels bank auto records 240 = incbin("levels.bin");   // a generator script writes levels.bin: 240 bytes per level
...
n = levels_load(7, grid);        // (the functions take your asset's name: `asset lv ... records` gives lv_load, lv_peek8, lv_peek, lv_COUNT) copy level 7 into RAM at grid (fast: use this at the start of a level)
t = levels_peek8(i, j);          // byte j of level i, straight from ROM (about 60 cycles; fine for the odd read, not a loop of thousands)
w = levels_peek(i, j);           // the word at byte j of level i
levels_COUNT   levels_RECORD   levels_PER_BANK   // constants: records, bytes per record, records per bank
```

The file must be a whole number of records. A record size that does not divide 8192 well wastes room in every bank (3000-byte records leave 2192 of 8192 unused), and `vly build` warns when more than 1 KB per bank is lost: pad or split the records to a nicer size such as 2048, 1024 or 512. Up to about 1 MB (125 banks) fits.

**Put art and data in a bank** once a game grows; it is the easiest room to make. (A `tilemap` is the exception: `.map` levels stay in the
always-visible region, 2 bytes per cell, so a 240x17 level costs 8 KB. For a long level keep one tile per byte in a banked `asset` (a small
generator script writes the `.bin`), `select_bank(bankof(level))` and read a column at a time, or use `std/stream`.)

```
tileset art bank 3 = "art.tiles";
asset music bank 5 = incbin("music.bin");
...
select_bank(bankof(art));         // choose which bank the window shows; it stays chosen
load_tiles(art, 100, art_COUNT);  // reads from bank 3
```

**Placing code yourself** is optional (useful to keep code next to its data, or to decide what is "far"):

```
func build_world(seed) bank 4 {     // this function's code is stored in bank 4
  ...
}
func frame() { if (starting) { build_world(7); } }   // call it like any other function
```

Rules that keep banking safe (the compiler enforces them):

- Calls work from anywhere and may recurse. A call into a bank costs about 27 extra cycles, so keep tiny helpers that
  run thousands of times a frame out of banks (the compiler's own choices already favor big functions).
- **Read banked data with `bank_peek8(bankof(x), x + i)`** (or `bank_peek` for a word) from anywhere: it selects the bank and puts the window back. A helper of your own that merely
  calls `select_bank()` and returns is undone on return whenever its caller was moved into a bank (silently reading the wrong bank), so do not write one.
- **Only one bank is visible at a time.** A banked function can use globals, tables, strings, any other function, and
  data in its own bank, but not data in a different bank (a compile error says so), and it cannot call
  `select_bank()` itself. It *can* call an unbanked function that does: for a caller in a bank the switch is undone on
  return (its own code has to come back); for unbanked callers the chosen bank stays, as usual.
- `init()` and `frame()` cannot be given a bank by hand. A bank holds 8,192 bytes; an overfull one is a compile error
  that lists its functions. A single function larger than 8,192 bytes cannot be placed: split it.

## Inline assembly

`asm("LDI r1, 5\nADD r0, r1")` emits raw assembly (see `vly docs assembly`). The compiler uses `r0` (expression
result), `r1`-`r3` (scratch), `r13` (always zero: globals are read as `[r13+address]`), `r14` (frame pointer) and
`r15` (stack pointer). Your inline code may freely use `r0`-`r12`, must leave `r13`-`r15` as it found them, and can
read locals with `LDX r0, [fp-2]` (first local), `[fp-4]`, and
parameters at `[fp+4]` upward. Use it sparingly; most programs never need it.

## Cost model

Real measurements, in machine cycles (the budget is 120,000 per frame, so a simple frame is a few percent of it):

| Operation | Cycles |
|---|---|
| `x = x + 1` (global) | 12 |
| `a * 3 + b` with locals | ~30 |
| call a function with no / two arguments | 15 / 33 |
| loop iteration (`while (i < n) { i++; }`) | 20 |
| `sprite(i, x, y, tile, attr)` | 107 |
| `set_cell(col, row, v)` | 57 |
| `text(col, row, s)` | ~110 per character |
| `print_u(col, row, n)` | ~1,100 |
| `btn(mask)` | 44 |
| `copy` 256 bytes / `fill` 2 KB | 78 / 285 |
| `hide_all_sprites()` | ~3,900 |
| `save_sum()` | ~20,500 (call it rarely) |

Rendering the screen is free (done by hardware). If you hit the budget, update only what changed and avoid
redrawing text every frame.

## Common mistakes

- Forgetting `load_font(0)` before `text()` (the text then shows as blank tiles), or `lcd(LCD_BG | LCD_OBJ)` to turn
  layers on. Sprites are off until you enable `LCD_OBJ`, and unused sprites sit at (0,0): call `hide_all_sprites()`.
- Tile 0 is the font's space glyph when the font is loaded at 0, so it works as the "empty" tile.
- Comparing with `<` when the values may exceed 32,767: use `ult`/`ugt`.
- Using a variable as an array (`p[i]` where `p` holds an address): use `peek(p + i * 2)` / `peek8(p + i)`.
- Writing to ROM tables or constants (a compile error) or to read-only memory (the `RO_WRITE` fault).
- Expecting globals to be re-initialized each frame: they are initialized once at power-on.

For compile errors, read the message: it names the file, line and column, and suggests the nearest known name.
