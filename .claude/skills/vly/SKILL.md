---
name: vly
description: Build, run, screenshot and test games for the VLY-1 handheld console (the VLY language, .tiles art, the `vly` CLI or its MCP server). Use when asked to make a VLY-1 cartridge/game, work on .vly or .tiles files, or debug a VLY cartridge.
---

# Building VLY-1 cartridges

VLY-1 is a deterministic 160x144 tile-based handheld. You write `.vly` source and `.tiles` art; the `vly` CLI builds, runs
headlessly, screenshots and tests. Everything is checkable by a command.

## Workflow

1. If the project does not exist: `vly new <dir> --template <t>`. Pick the closest starting point: `hello` (minimal), `game`
   (scrolling world, collision, saves), `pong` (states, sound, AI), `battle` (menus, dialogue, generated monsters),
   `platformer` (physics, tilemaps, 3 levels), `puzzle` (grid logic, undo, 7 levels as ASCII maps), `shooter` (many
   sprites, formation, bombs, starfield). Read the template's `src/main.vly` before writing your own.
2. Read the docs once: `vly docs language`, `vly docs stdlib` (or the `vly_docs` MCP tool).
3. Edit `src/main.vly` and `assets/*.tiles`.
4. Loop: `vly build` then
   `vly run build/<name>.vlc --frames 120 --input "RIGHT@0-59, A@60" --screenshot shot.png --mem <variable>`.
   **View the screenshot.** Confirm `faults: none` and cycles per frame well under 120000.
5. Add tests to `vly.json` (`vly test`); use `"frameHash": "auto"` and `vly test --update` to record good screens.

If the `vly_*` MCP tools are available (`vly mcp`), use them instead: `vly_build`, `vly_run` with `screenshot: true`,
`vly_test`, `vly_tiles` (preview art), `vly_docs`.

## Key facts

- One type: a 16-bit word. `<` and `/` are signed; use `ult/ugt/udiv/umod` for unsigned. `>>` is arithmetic, `>>>` logical.
- `func init()` runs once, `func frame()` runs 60 times a second (required). Globals are `var x;`, arrays `var a[8];`
  `byte b[8];`, ROM data `table t = {1,2};` `btable`, strings `"text"` (an address), art `tileset art = "art.tiles";`.
- Setup order in `init()`: `load_font(0)`, `load_tiles(art, 100, art_COUNT)`, palettes (`bg_pal`, `obj_pal` with
  `rgb(r,g,b)`), `hide_all_sprites()`, build the map with `set_cell`, then `lcd(LCD_BG | LCD_OBJ)`.
- `frame()`: read `btn(BTN_LEFT)` / `btnp(BTN_A)`, update state, `sprite(i, x, y, tile, attr)`, `scroll(x, y)`.
- Tile art: `tile name:` with 8 rows of 8 chars, or `sprite name 2x2:` with 16 rows of 16 chars; `.` is 0 (transparent for
  sprites), `1` `2` `3` are palette colors. Preview with `vly tiles art.tiles --sheet preview.png`.
- Saves: `save_set(off, v)`, `save_seal()`, `save_commit()`; check `save_loaded() && save_valid()` at start.
- Limits: 64 sprites, 512 tiles, ~19 KB RAM, 1 KB save, 1 MB ROM (code is banked automatically).

## Quality: design first, then prove it

Before designing, load the **`vly-design` skill** (or `vly docs design`): the quality bar, game feel numbers, readability rules
and the finishing checklist. After building, run **`vly check`** (quality gates: faults, budget, frozen game, sound, sprites, covered
text, variety) and **`vly run src/main.vly --profile`** when cycles are high. Helpers worth knowing: `std/sprites` (slots handed out
per frame), `std/sfx` (ready sound effects that share channels with `std/music`), `rotate` lines in `.tiles` (pre-rotated sprites),
`vly import picture.png` (PNG to `.tiles`).

## Seeing what happened (use these before guessing)

- `--filmstrip 12 --filmstrip-out strip.png`: ONE image of the whole run. Best first look at any behavior over time.
- `--watch score,lives`: a timeline of exactly which frame each variable changed. `--trace 40` shows the instructions of
  one frame. `--gif out.gif` and `--wav out.wav` record the run.
- `--input-file moves.txt` (or `"inputFile"` in a test): long inputs, one segment per line, `#` comments.
- To prove a level or wave is winnable, write a small bot with the reference emulator (`src/core`), record its presses,
  and test the recording. See `vly docs workflow` ("Testing a whole level or wave with a bot"); the `puzzle` and `shooter`
  templates show it.

## Levels as ASCII art

`tilemap level = "level.map";` with a `legend:` and a `map:` (see `vly docs modules`). Characters become map cells and,
with `, marker`, spawn points (`level_P_X`, `level_P_Y`, `level_E_list`). Scan cells with `map_cell(level, level_W, x, y)`.
`import "std/ui"` gives menus and dialogue boxes; `import "std/anim"` gives `blink`, `approach`, `anim_frame`;
`import "std/music"` plays songs written as `(note, steps)` tables.

## When the game gets big

The CPU always sees 16 KB of ROM plus one 8 KB bank at a time, but you rarely need to care: when code outgrows that,
the compiler moves functions into banks by itself and `vly build` reports it. What you should do as a game grows is
move art to a bank (`tileset art bank 3 = "art.tiles";` then `select_bank(bankof(art))` before loading). You can also
place code yourself (`func title_screen() bank 4 { ... }`); a banked function cannot read data from a different bank.
If something cannot fit, the error lists the biggest functions and why each one has to stay visible.

## Debugging

- `--mem score,grid[3]` reads variables by name. `vly build --asm` shows generated assembly. `--shots 0,10,20 --out-dir d`
  captures frames over time. `OVERRUN` means too much work in one frame.
- Compile errors name file, line, column and suggest the nearest name; fix them in order.
