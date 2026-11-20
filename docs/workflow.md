# Building a cartridge: the agent workflow

This is the recommended loop for an AI agent (or a person who likes quick feedback). Everything is deterministic and
headless, so every step can be checked by a command.

## 1. Orient (once)

```
vly docs agents          # this workflow in short form
vly docs language        # the language (read all of it, it is short)
vly docs stdlib          # the functions you can call
```

## 2. Start from an empty project

```
vly new mygame        # an empty project. Never start by re-skinning a template or a sample game
cd mygame
```

The templates (`--template game|pong|battle|platformer|puzzle|shooter|flow`) and `games/` are to learn techniques from. `--template flow` is the exception that is meant to be copied: its
front end (splash, menu, erase confirmation, how-to page, level grid, grades, saves) is the same in every game, so use it and make the game itself your own.

## 3. The edit loop

1. Edit `src/main.vly` (and art in `assets/*.tiles`).
2. `vly build` and fix compile errors. They name the file, line and column, and suggest the closest known name.
3. `vly run build/mygame.vlc --frames 120 --input "RIGHT@0-59" --screenshot shot.png --mem score` and **look at the
   screenshot** (or use `--ascii`). Check cycles per frame and that the faults line says `none`.
4. `vly test` and add a test for each behavior you care about (see `vly docs cli`). Use `"frameHash": "auto"` plus
   `vly test --update` to lock in a known-good screen.

Over MCP the same loop is `vly_build`, `vly_run` (with `screenshot: true`), `vly_test`, and `vly_tiles` for previewing
art, with inline `code` if you do not want to touch the file system.

## 4. Design within the constraints

| Limit | Value | Note |
|---|---|---|
| Screen | 160 x 144, 20 x 18 tiles | colors: 4 per palette, 8 background + 8 sprite palettes |
| Tiles | 512 in tile RAM | the font uses 95 if loaded |
| Sprites | 64 on screen, sizes 8x8, 8x16, 16x16, 32x32 | color 0 is transparent |
| Cycles | 120,000 per frame, 1,200,000 for init | rendering is free |
| Work RAM | about 19 KB for your variables | 1,024 bytes of save data |
| ROM | 1 MB; 16 KB always visible plus 8 KB banks | code is about 12-25 bytes per statement; the compiler spreads it over banks for you |

Practical advice:

- Draw once, scroll often. Build the map in `init()`, then move `scroll()` / sprites in `frame()`.
- Use the window layer (`window_pos`, `wtext`) for a HUD that does not scroll.
- Keep per-frame work small: update only what changed.
- For random numbers call `srand` once with something that varies, like the frame counter when the player first presses
  START. The generator starts from a fixed state, so every run is reproducible, which keeps tests stable.
- Saves: use `save_set`/`save_get`, then `save_seal()` and `save_commit()` when the player saves. On start, check
  `save_loaded() && save_valid()`.
- Pixel art: write `.tiles` text, preview it with `vly tiles art.tiles --sheet preview.png` (or `vly_tiles`), and
  iterate until it reads well at 8x8. Sprites use palette color 0 as transparent.

## 5. Seeing what happened over time

A single screenshot shows one moment. For behavior over time use:

```sh
vly run build/mygame.vlc --frames 240 --input "RIGHT@0-90, A@100" --filmstrip 8 --filmstrip-out strip.png   # a contact sheet of 8 moments
vly run build/mygame.vlc --frames 240 --input "..." --watch score,x,y                                         # when did each variable change?
vly run build/mygame.vlc --frames 240 --input "..." --trace 120:40                                            # what ran in frame 120?
vly run build/mygame.vlc --frames 240 --input "..." --gif demo.gif                                            # something to share
```

## 6. Debugging

- `vly run ... --mem name` shows a variable; names come from the RAM map in `build/*.map.json`.
- `vly build --asm` writes the generated assembly; `vly disasm` shows the cartridge.
- `--shots 0,10,20 --out-dir shots` captures frames over time.
- A run that reports `OVERRUN` is doing too much in one frame; look at the busiest functions with
  `vly build --json` (`functionBytes`) and the cost table in `vly docs language`.
- If something is wrong with the machine itself, the specification is `SPEC.md`; an independent C implementation
  (`c/`) and a conformance suite (`conformance/`) keep implementations honest.

## 7. Ship it

```
vly export build/mygame.vlc --html mygame.html    # one self-contained file that plays anywhere
vly chunks build/mygame.vlc --json                # plan the chunk contracts and ROM hash for on-chain storage
```

See `CONTRACTS.md`: chunks are stored once (shared by content), a game is an immutable clone, and each printed copy
has its own 1,024-byte save.

## Testing a whole level or wave with a bot

Scripted inputs are fine for "press right and see the player move". To prove a level is **winnable**, or a wave
**clearable**, write a small bot in JavaScript that plays the game and records what it pressed:

```js
import { Machine } from './src/core/index.js';          // the reference emulator
const m = new Machine(rom); m.boot();
for (let f = 0; f < 3000; f++) {
  const sx = m.read16(ram.sx.addr), fx = m.read16(ram.fx.addr);   // ram: the *.map.json written by vly build
  const input = decide(sx, fx);                                    // your strategy
  m.runFrame(input);
  inputs.push(input);
}
```

Compress the per-frame buttons into `BUTTON@START-END` segments, save them to `tests/clear.input`, and add a test with
`"inputFile": "tests/clear.input"` that asserts the level was cleared (for example `"words": { "state": 2, "lives": 3 }`)
plus a `"frameHash"`. The shooter template does this for wave 1, and the puzzle template proves every level is solvable
with a breadth-first solver that produces the optimal moves. If the bot cannot win, the level (or the physics) is the
bug, and the bot found it for you.

### The bot kit (`src/tools/bot.js`)

You do not have to write the loop above by hand. `runBot` builds your game, plays it with a policy you write, and returns the presses as an
input script, the save the game wrote, and whether the bot reached the goal:

```js
import { runBot, mask } from './vly/src/tools/bot.js';          // ./src/tools/bot.js inside the repository
import fs from 'node:fs';
const r = await runBot({
  source: 'src/main.vly',
  decide: (f, read) => (read('state') === 0 ? (f === 20 ? mask('START') : 0) : mask('A') | (read('foe_x') < read('x') ? mask('LEFT') : mask('RIGHT'))),
  done: (read) => read('state') === 6,                           // the win state: stop a little after it holds
  delay: 12,                                                     // optional: react to what was true 12 frames ago
  delays: { puck_x: 14, puck_y: 14 },                            // optional: per-variable delays (see the first bullet below)
  live: ['x', 'y'],                                              // optional: variables read live (your own position is not delayed)
});
fs.writeFileSync('tests/win.input', r.input);                     // replay it in vly.json with "inputFile"
fs.writeFileSync('tests/after-win.sav', r.save);                  // a finished game's save, for tests of unlocks, stage select, best scores
```

- **`delays: { name: frames }` sets a different delay per variable** (a puck seen 14 frames late while `state` is read at once); `live` is a delay of 0.
- **The delay applies to scalar variables only, unless you list arrays in `delayArrays: ['foe_x', 'foe_y']`**; otherwise array reads (`read('foe_x', i)`) are live. A human knows their own position instantly and sees the
  world late, so name your own state in `live: [...]` and keep the delayed world. (A bot that sees even its own position 12 frames late falls into the first pit.)
- **A perfect bot proves nothing about fun.** A bot that never dies shows the level is winnable, not that it is fair. Run it again with a
  reaction delay (`delay: 12` is about a fifth of a second, a quick human; `24` a slow one) and with a worse policy (random jitter, no
  bombs): if only the perfect bot survives, the game is too hard; if even the worst bot wins easily, it is too easy.
- **Saves for tests.** A test can start from a save (`"save": "tests/after-win.sav"`) to check the title's best score, an unlocked stage or a
  harder loop. Make the file with a bot (`r.save` above) or with `vly run ... --save-out tests/x.sav` after a scripted run.
- After a change you made on purpose and looked at, `vly test --accept` takes the new picture hashes (any test that fails for another reason is never accepted).

Other tricks that paid off: `vly run ... --watch score,left` shows exactly when things happen (the first kill, the first
death), and `--filmstrip 12 --filmstrip-out strip.png` shows a whole run in one image.

### A search bot for action games: look ahead on clones (`Machine.clone()`)

A policy bot ("if the foe is left, go left") is enough for puzzles and simple shooters. A **platformer, a racer or anything with timing and phases** needs a bot that *tries things*: copy the machine, run each candidate plan a few dozen frames ahead on the copy, keep the plan that scores best, commit its first few frames on the real machine, repeat. This is the bot that finds what `vly check` cannot: a goal your level generator erased, a platform one pixel too high to reach, a collectible out of jump range, a **soft-lock** (a spot where the player can no longer progress, such as a spring left behind off-screen).

```js
import { Machine } from './vly/src/core/index.js';
import { mask } from './vly/src/tools/bot.js';
const m = new Machine(rom); m.boot();
const read = (c, n) => c.read16(ram[n].addr);                   // ram: the *.map.json written by vly build
const plans = [                                                 // each plan is a list of [buttons, frames]
  [[mask('RIGHT'), 30]], [[mask('RIGHT|A'), 30]], [[mask('RIGHT|A'), 12], [mask('RIGHT'), 18]],
  [[mask('LEFT'), 10], [mask('RIGHT|A'), 20]],                  // walking backwards, or it can never fetch the spring it needs
];
const score = (c) => read(c, 'px') * 4 - read(c, 'py') / 8 + (read(c, 'lives') < lives0 ? -5000 : 0);
const inputs = [];
while (read(m, 'state') !== WIN && inputs.length < 20000) {
  let best = null;
  for (const plan of plans) {
    const c = m.clone();                                        // an independent copy: cheap, about 10,000 frames a second
    for (const [btn, n] of plan) for (let i = 0; i < n; i++) c.runFrame(btn);
    const s = score(c);
    if (!best || s > best.s) best = { s, plan };
  }
  for (const [btn, n] of best.plan.slice(0, 1)) for (let i = 0; i < Math.min(n, 8); i++) { m.runFrame(btn); inputs.push(btn); }  // commit only the first 8 frames
}
```

Write `inputs` out as `BUTTON@START-END` segments (as above), save them as `tests/stageN.input`, and a `vly.json` test replays them. Pitfalls that cost one real build an hour:

- **Commit only the first N frames of the winning plan**, then plan again. A plan that waits (zero frames) and one that runs must start at the same time, or the bot waits forever; every plan needs the same tail policy.
- **Scores must be continuous.** A score that drops when a boss spawns or when the bot is "near the gem" makes it refuse to cross that line. Reward progress smoothly, penalise death hard.
- **Include plans that walk backwards** (left for 10 frames, then right). A bot that only goes forward cannot fetch a spring or key behind it, and will call a solvable level a soft-lock.
- **Waiting plans must not share the running tail,** or "wait" always ties "run" and loses on an arbitrary tie-break.
- **Goal modes:** pass the target in the score (`--gem 2` in your own script): the same bot can prove every collectible is reachable, not just that the exit is.
- **A perfect bot proves the level is possible, not that it is fair.** Add a clumsy bot (decides only every 0.3 s, picks a random plan one time in five) and report how many stages it clears; the stages it fails show where a person will struggle.
- The bot's deaths per stage are your **difficulty curve**: print them. If deaths do not rise from stage 1 to stage 12, the curve is flat.
