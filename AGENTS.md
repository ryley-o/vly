# AGENTS.md: building on VLY-1

VLY-1 is a tiny, deterministic handheld game console. You write games in the VLY language (or assembly), and the `vly`
tool compiles, runs, screenshots and tests them headlessly, so you can prove a game works before a person ever plays
it. This file is the fast path for AI agents. Run `vly docs` for everything else. For a complete, polished game to
learn from, read `games/hill-racer/` (a racer: the worked example of the design playbook) and `games/star-raptor/` (a three-stage
shooter with bosses, built by an assistant from this guidance), each with source, art, tests and a bot. `games/cat-garden/` is a calm, no-fail game (three gardens, six cats): the example for non-action games, and `games/midnight-nightingale/` for story and puzzle games (rooms, locks, clues, dialogue). `games/fret-rush/` is a rhythm game (song clock, hit windows, calibration, per-song saves). `games/nebble/` is a virtual pet (needs over time, no-clock rule, growth by care history, persona bots). `games/air-hockey/` is a versus game (physics without tunnelling, AI levels, bot-calibrated). `games/ninja-chef/` is a long-scrolling platformer (three 1,920 px stages, banked level data, checkpoints, bosses, a bot with a reaction delay).

## Rules that are not optional

**Your game must be your own.** The templates and the sample games in `games/` are *references*: read them to learn a technique (how a tilemap is scanned, how a boss is staged, how a save is sealed). Never ship one with a new skin, new title, new art or renamed words:
its rules, levels, code structure and art must be your own, designed for this person. `vly check` compares your sources with every template and sample game and **fails a re-skin**. Start from an empty project (`vly new mygame`), not from a game.

**Plan before you build.** Write `DESIGN.md` (one sentence, controls, screens, a content table with a row per stage or level, what makes this game different from the nearest sample game), show it to the person, then build. A real game is not three levels: see "Depth and length" in `vly docs design`.

## Set up

No access to the repository? Download the toolchain: `curl -sL https://vly-1.vercel.app/vly-cli.tgz | tar xz` makes `./vly` (run `./vly/bin/vly`).

```sh
git clone <this repository> && cd vly     # Node 20+; no dependencies to install
alias vly="node $PWD/cli/vly.js"                  # or: npm link
vly new mygame && cd mygame                       # an empty project. Templates (--template game|pong|battle|platformer|puzzle|shooter) are for learning from, not for shipping
```

## The loop (do this after every change)

```sh
vly build                                                     # compile; errors say file:line:col and suggest fixes
vly run build/mygame.vlc --frames 120 --input "RIGHT@0-59" --screenshot shot.png --mem score
vly test                                                      # assertions in vly.json
```

**Before designing, read `vly docs design`** (the quality bar: a good game has a title, pause, game over, sound for every event,
more than one stage, depth; the playbook has numbers, readability rules and a finishing checklist). **Before calling it finished, run
`vly check`** (quality gates) and fix or explain every WARN.

**Always look at the screenshot** (it is a PNG; `--ascii` gives a text version) and check that the `faults:` line says
`none` and cycles per frame are well under 120,000. Add a test in `vly.json` for each behavior; use
`"frameHash": "auto"` then `vly test --update` to lock in a good screen.

Look before you guess: `--filmstrip 12 --filmstrip-out strip.png` (a whole run in one image), `--watch score,lives`
(when each variable changed), `--gif out.gif`, `--wav out.wav`, `--trace 40`. For long inputs use `--input-file` (or
`"inputFile"` in a test). To prove a level is winnable, write a bot against `src/core`, record its presses and test them
(`vly docs workflow`; the `puzzle` and `shooter` templates do this).

If you can use MCP tools, run `vly mcp` and use `vly_build`, `vly_run` (`screenshot: true`), `vly_test`, `vly_tiles`,
`vly_docs`, `vly_new`. They return screenshots as images.

## What to read

1. `vly docs language`: the language (short). 2. `vly docs stdlib`: what you can call. 3. `vly docs workflow`.
4. `vly docs cli`, `vly docs assembly`, `SPEC.md` (the machine), `CONTRACTS.md` (on-chain) as needed.

## The machine in one paragraph

160x144 screen made of 8x8 tiles (4 colors, 8+8 palettes of 4), a scrolling background map, a window layer, and 64
hardware sprites. 60 frames per second; `frame()` gets 120,000 cycles, `init()` 1,200,000; drawing is free. 8 buttons.
About 19 KB of work RAM, a 1 KB save blob, up to 1 MB of ROM (the compiler spreads code over banks for you). Fully deterministic: same cartridge +
same inputs = same pixels, so tests can check exact hashes.

## Rules of thumb

- Everything is a 16-bit word; `<` is signed, `/` is signed. Use `ult/ugt`, `udiv/umod` for unsigned.
- Call `load_font(0)` before `text()`, `hide_all_sprites()` before enabling `LCD_OBJ`, and `lcd(...)` to show layers.
- Write tile art as text (`.tiles`), preview it, and keep it simple: 4 colors, 8x8 tiles.
- Build maps in `init()`; move `scroll()` and sprites in `frame()`.
- Randomness starts from a fixed state: call `srand(hi, lo)` with something that varies (e.g. `frames()` when the player
  first presses START) if you want different games each time.
- Don't spend cycles redrawing text every frame; update when values change.
- Reachable-only: unused functions and variables are dropped from the cartridge.
- Big games just work: when code outgrows the 16 KB the CPU always sees, the compiler moves functions into ROM banks by
  itself (`vly build` reports it). Put art in a bank once a game grows (`tileset art bank 3 = "art.tiles";` then
  `select_bank(bankof(art))` before loading it); see "Banks" in `vly docs language`.

## Report what hurt, send fixes

If you built something with VLY-1 and a doc, tool or error message misled you, say so: open an issue or a pull request (`CONTRIBUTING.md`, `docs/agent-trials.md`). Keep a worklog while you work; it is the most useful thing you can hand back.

## Working on this repository

```sh
npm test                 # JavaScript tests (emulator, assembler, compiler, CLI, templates, conformance, MCP)
npm run gen              # regenerate spec/isa.json, spec/font.*, c/*.h, docs/stdlib.md from the sources of truth
npm run conformance      # regenerate conformance carts + golden hashes (only when behavior intentionally changes)
npm run difftest         # run every conformance case in JS and C and compare hash-for-hash
npm run fuzz -- 300      # compare JS and C on 300 fresh random programs
npm run test:contracts   # compile the Solidity and run it in an in-process EVM
npm run docs             # build the website into site/dist
```

Sources of truth: `src/core/isa.js` (instruction set), `src/core/constants.js` (memory map), `src/core/font.js`,
`SPEC.md` (normative text). If you change machine behavior, update the JS core, the C core (`c/vly.c`), the spec and
regenerate the conformance suite, and make sure `npm run difftest` passes. Keep implementations simple.
