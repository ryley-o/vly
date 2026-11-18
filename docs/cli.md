# The `vly` command line tool

Every command accepts `--json` and then prints one JSON object with `"ok": true|false` plus command-specific fields
(errors are `{"ok": false, "error": {"message", "errors": [{file, line, col, message}]}}`). Exit codes: `0` success,
`1` error (bad input, compile error), `2` a test failed, `3` a run finished with faults.

## Commands

| Command | What it does |
|---|---|
| `vly new <dir> [--template hello\|game\|pong\|battle\|platformer\|puzzle\|shooter]` | create a starter project (src, assets, vly.json with tests) |
| `vly build [entry] [-o out.vlc] [--asm] [--symbols]` | compile `.vly` / assemble `.asm`; writes the cartridge and `<out>.map.json` (RAM map, function sizes); `--asm` also writes the generated assembly |
| `vly run <cart or source> [options]` | run headlessly and report; see below |
| `vly test [paths] [--update]` | run test specs (`vly.json` `"tests"`, `*.test.json`) |
| `vly info <cart>` | header, size, SHA-256 |
| `vly disasm <cart> [--start A --end B]` | disassemble |
| `vly run ... --until state==6` | stop the run when a variable condition holds (`==`, `!=`, `>=`, `<=`, `>`, `<`); `--frames` is the limit; the output says if and when it held |
| `vly import <picture.png> [--name hero] [--cell 16x16] [--tile] [-o hero.tiles]` | turn any PNG into `.tiles` text, reducing the colours to what the hardware allows (3 for sprites, 4 for tiles) and printing the palette to set |
| `vly check [cart|source] [--frames N]` | quality gates: plays the game with no input, with START, and with a careless random player (default 7,200 frames, two minutes), and reports faults, cycle budget, a frozen game, whether START does anything, sound on the title and in play, sprite use, text covered by sprites, variety, saves. Every WARN is a bug to fix or a decision to explain; a FAIL means not finished (exit code 1) |
| `vly check ... --input-file tests/win.input [--save after.sav]` | also play a recorded path (for example a bot's winning run) and check its faults, budget, sprites and covered text, so late-game screens that careless play never reaches are covered. Paths up to 15 minutes are played. To reach a late screen that needs earlier progress (an adult pet, stage 3), start from a save with `--save` (make one with a bot or `vly run ... --save-out`). A budget failure names the frame and which run it came from; replay it with `vly run ... --worst 5`. Also warns about shrill tones (above 1.4 kHz for a long time) and about saving more than about 3 times a minute |
| `vly run ... --worst N` | also list the N worst frames by cycles, and with the source which functions spent them (a frame over 80,000 cycles gets a warning and this listing automatically) |
| `vly test --accept` | after a change you made on purpose and looked at, take the new picture/state hash of tests whose hash changed (a test that fails for any other reason is never accepted); `--update` only fills `"auto"` |
| `vly tiles <file> [-o out.bin] [--sheet preview.png] [--colors c0,c1,c2,c3]` | convert `.tiles` text or `.png` art to tile data, or preview it: the sheet shows every tile and multi-tile sprite assembled with its name (color 0 as a checkerboard); `--colors 9bd,fff,8a5,321` previews with real palette colors; `--raw` gives the plain grid |
| `vly isa` | instruction table |
| `vly docs [topic] [--all]` | print documentation |
| `vly export <cart or source> [--html out.html] [--title T]` | package a cartridge as one self-contained HTML game (see `vly docs distribution`) |
| `vly chunks <cart> [--deployer 0xADDR] [--out-dir d]` | plan on-chain storage: chunk creation code, salts, ROM hash, gas estimate; with `--deployer` also predicted chunk addresses, per-chunk `ChunkDeployer.deploy` calldata and a `VlyFactory.create` config (see CONTRACTS.md section 7) |
| `vly mcp` | MCP server on stdio |
| `vly play <cart or source>` | play it: the native player if built, otherwise a one-file HTML game opened in your browser |
| `vly watch [entry]` | rebuild on every file change and print one result line (errors, size, cycles, faults) |
| `vly serve [dir] [--port N]` | serve the website/playground |

## `vly run`

```
vly run game.vly --frames 120 --input "RIGHT@0-59, A@60" --screenshot shot.png --mem score,buf[2]:4 --ascii
```

| Option | Meaning |
|---|---|
| `--frames N` | frames to run (default 60; 60 frames = one second) |
| `--input SCRIPT` | scripted buttons, below |
| `--input-file PATH` | read the script from a file (newlines separate segments, `#` starts a comment): for long inputs recorded by a bot |
| `--screenshot file.png` | write the final screen (`--scale N`, default 4) |
| `--shots 0,30,60 --out-dir d` | write several frames (0 = after init) as `frame_NNNN.png` |
| `--mem a,b:len` | read memory at the end: addresses (`0xB400:16`) or variable names (`score`, `grid[3]`) |
| `--ascii` | print a low-resolution ASCII picture of the final screen |
| `--filmstrip N --filmstrip-out strip.png` | ONE image with N evenly spaced frames, each labelled with its frame number: the fastest way to see how a game evolves |
| `--watch score,x,grid[3]` | a timeline of every change to those variables, with the frame it happened in (frame -1 is after `init`) |
| `--trace FRAME[:LIMIT]` or `--trace init:LIMIT` | the first instructions executed in that frame, with function names, instruction text and registers |
| `--gif out.gif [--gif-every 2] [--gif-scale 2]` | an animated GIF of the run (30 fps by default); verified pixel-identical to the emulator |
| `--wav out.wav` | the audio of the run (44.1 kHz mono) from the reference synthesizer |
| `--save file` / `--save-out file` | start from a save file / write the last committed save |

The output includes init and per-frame cycle use, faults, the frame hash and state hash (identical runs give
identical hashes; use them to detect regressions) and any memory you asked for. Faults are: `DIV0`, `RO_WRITE`
(wrote to ROM or the font), `ILLEGAL` (bad opcode), `OVERRUN` (a routine ran out of cycles).

**Input scripts** list button presses over time: `BUTTONS@FRAMES` separated by commas. Buttons are `UP DOWN LEFT RIGHT A B
START SELECT` joined with `+`. Frames are a number, a range `10-20` (inclusive) or open-ended `30-`. Examples:
`RIGHT@0-59`, `A+RIGHT@60-79, START@100`, `B@0-`. Add `/P` to press for one frame out of every `P`: `A@30-3000/3` mashes A (frames 30, 33, 36, ...), which is how to drive menus and dialogue. Frames are numbered from 0.

## Projects: `vly.json`

```json
{
  "name": "mygame",
  "entry": "src/main.vly",
  "out": "build/mygame.vlc",
  "tests": [
    { "name": "walks right", "frames": 40, "input": "RIGHT@0-39",
      "expect": { "words": { "x": 40, "scores[2]": 7 }, "frameHash": "auto", "maxCycles": 20000 } }
  ]
}
```

A test runs the program for `frames` with `input`, then checks `expect`:

- `words` / `bytes`: memory by variable name (`"score"`, `"grid[3]"`) or address (`"0xB400"`). `words` reads 16 bits at the name's address; for a `byte` array use `bytes` (one byte per name, or a list). `vly tiles art.tiles --sheet p.png --colors 9bd,fff,8a5,321` previews with real colours.
- `frameHash`, `stateHash`: the exact screen / machine state. Write `"auto"` and run `vly test --update` to record.
- `maxCycles`: the busiest frame must stay under this.
- `saves`: how many times the cartridge requested a save (`save_commit()`); `saveWords`: words of the last requested save by byte offset, e.g. `{ "0": 7 }`.
- Faults (div by zero, bad opcode, ROM writes, overruns, init over budget) fail a test unless `"allowFaults": true`.
- `"save": "file.sav"` starts the test from a save file.
- `"inputFile": "tests/clear.input"` reads the input script from a file (in addition to `input`): newlines separate segments and `#` starts a comment. Use it for long inputs recorded by a bot (see `vly docs workflow`).

## Files

| File | Meaning |
|---|---|
| `*.vlc` | a cartridge: the raw ROM image (what goes on chain), at most 1 MB |
| `*.map.json` | written by `vly build`: `ram` (variable -> address), `functions` (address, size) |
| `*.tiles` | tile art as text (see `vly docs language`) |
| `vly.json` | project file |
