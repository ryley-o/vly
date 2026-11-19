---
name: vly-design
description: Design and verify a good VLY-1 game: the quality bar (NES-level depth and polish), a design brief, game feel numbers, readability on 160x144, transitions, controls, sound and music, level design, and a finishing checklist with automated quality gates. Use before designing a VLY-1 game, when a game feels flat or buggy, and before calling any VLY-1 game finished.
---

# Designing a VLY-1 game that is actually good

Companion to the `vly` skill (which says how to build and run). This one says **how to know it is good, and how to prove it**.
The full playbook is `vly docs design` (or https://vly-1.vercel.app/design.md); this page is the short version to load every time.

## The bar

**Your game must be your own.** The templates and the sample games in `games/` are *references*: read them to learn a technique (how a tilemap is scanned, how a boss is staged, how a save is sealed). Never ship one with a new skin, new title, new art or renamed words:
its rules, levels, code structure and art must be your own, designed for this person. `vly check` compares your sources with every template and sample game and **flags a re-skin**. Start from an empty project (`vly new mygame`), not from a game.

Aim for a good NES-era game, not a demo. Always: title screen with the name and PRESS START, pause (START), game over and
retry, a stated goal, controls that feel good and are shown on screen, a sound for every event, a difficulty curve.
Full game: 3+ stages or phases with their own look and music, 3+ enemy behaviours, a boss or finale, 2+ power-ups, saved
progress or best score, 3+ music tracks that do not loop audibly within 20 s, an ending. Scale down if asked, but keep the "always" list.

**Length is part of the bar.** Three stages is a demo. A full action game is 8+ stages in 3-4 worlds (one new mechanic per world), 30-60 minutes for a person; a racer 12+ tracks, a puzzle 40+
levels. Plan the content in a table first (stage, theme, new mechanic, boss, music, secret), keep levels as data (ASCII maps or generated banked bytes), build a vertical slice, then add stages in passes with a
bot through every one. Repeating sounds (guns, ticks) stay below 800 Hz and quiet; `vly check` flags shrill ones. See "Depth and length" in `vly docs design`.

**Go past the minimum when you can** (best practices): a rising difficulty curve (200 levels in order of difficulty beat 40 at random), generated or endless levels, unlock plus a level select to replay beaten levels, and records per level (time, moves, collectibles, medals). Write `DESIGN.md` with a `## Done when` list; `vly check` prints it back and you report against it. See "Beyond the minimum" in `vly docs design`.

**One front end, obsessively clear** (start it with `vly new mygame --template flow`; the code is `templates/flow` and `std/flow`): splash, menu with CONTINUE first (NEW GAME confirms what it erases, KEEP by default), the how-to page of pictograms at every startup, a level grid with locks, unlocks and AAA-to-D grades against par. Every menu: UP/DOWN move, A or START choose, B back, never explained. Arrows plus A and B are usually enough in play; add SELECT or an undo only if the game is really better with it, and show it on the how-to page. Familiar beats clever (Jakob's law): spend novelty on your core mechanic, not on controls and menus. Learn from the classics (feel first, teach by playing, introduce/develop/twist/conclude, kind to beginners, deep for experts): see "What the classics teach" in `vly docs design`. Pictures, colour and motion over sentences; one alignment per screen. Teach each mechanic by making level 1, 2, 3 need it (`analyzeCampaign` proves it). Test taps, holds and releases separately (`bt_*`). `vly release` does build, tests, check, old-save load, opening recording, publish and verify.

## The order of work

1. **Brief first** (show it): genre and core loop in one sentence; locked controls map (D-pad, A main action, B second, START pause,
   SELECT rare); scoring and goal; screens; content list and length.
2. **One mechanic at a time.** Movement and feel first (numbers below), then the next thing. Look at a screenshot after each.
3. **Play the whole game by script** (a bot if needed): every stage, a death, game over, retry, win. Not just the first screen.
4. **Polish in order:** feel, audio, transitions, then art detail.
5. **Run `vly check`** and the finishing checklist. Say plainly what you tested and what you did not.

## Numbers that work (pixels per frame at 60 fps; use 8.8 fixed point)

Walk 1.0-1.5; run 2.0-2.5; reach top speed in 8-12 frames, stop in 6-8. Gravity 0.25; jump launch -4.0 (peak 32 px, about 32 frames in the
air); release A early to cut the jump; terminal fall 4-5. Coyote time 5 frames, jump buffer 6. Hit-stop 2-4 frames; invulnerability
60-90 frames blinking; knockback 2-3 px for 8-10 frames; shake 1-2 px for 6-10 frames. Camera: lead the move direction, max 2 px/frame.
Ramps launch along the slope. Boost needs a cost. Rivals need rubber-banding. Call `srand(hi, lo)` from `frames()` at START.
16-bit signed arithmetic: a score over 32,767 goes negative; compare with `ugt` or cap.

## Readability on 160 x 144

HUD in the **window layer** (`lcd(LCD_BG | LCD_WIN | LCD_OBJ)`, `window_pos`, `wtext`), reserved rows, nothing else enters them.
One ground height used by both drawing and physics; decoration sits **on** the ground, lighter than solids, never read as an obstacle.
Player and dangers contrast in luminance. Mirror with `SPR_FLIPX/FLIPY`; tilt with `rotate hero -20,20 as hero_tilt` in `.tiles`.
Manage sprites with `std/sprites` (`spr_begin(0)`, `spr(x, y, tile, attr)`, `spr_end()`), never hand-numbered slots.
Fake parallax with a few large slow sprites; animate tiles (water, torches); vary what scrolls by every 5-10 seconds of travel.

## Screens and sound

State machine: TITLE, PLAY, PAUSE, DEAD, GAME OVER, WIN. Fade (4 palette steps of 6 frames) or wipe between screens; stage cards for new stages;
a 20-30 frame freeze and a sound on death. Channels: 0 lead, 1 harmony and tonal effects, 2 bass, 3 drums and noise effects. `std/tunes` for ready-made loops (`tune_play(TUNE_ACTION)`; five moods) or `std/music` with `music_build` for your own
(16+ bars with an A, B, A shape, bass and drums), `std/sfx` for effects (`sfx_play(SFX_JUMP)`, `sfx_update()` every frame). Music volume 5-8,
effects 9-13. Every player-caused event has its own sound, and the sound suits the thing (a monster truck revs, it does not beep).

## Level and content design

Teach, test, twist. A new thing every 20-40 seconds; rest beats after hard parts; a stage lasts 60-120 s with 3+ obstacle types and one set piece.
Build the whole course and play it start to finish. Difficulty is a curve: nearly unlosable in the first minute, then ask more.
Every danger visible before it can hurt; every death understandable; restart under 2 seconds. Save a best score or progress.

## Prove it (do all of these)

- `vly build`, then `vly run ... --screenshot` or `--filmstrip 6` at the **start, mid-action and end**; look at them.
- `faults: none`; worst frame under 80,000 cycles (`vly run src/main.vly --profile` shows which function costs what).
- `--watch state,score,lives` and read the timeline: it proves a jump, flip or lap really happened.
- `vly check` (faults, budget, frozen screen, START responds, sound on title and in play, sprite use, text covered by sprites, variety, saves):
  every WARN fixed or explained, no FAIL.
- A full scripted run (`--input-file`) through every state, a long run (`--frames 18000`), and an idle run.
- If a person will play it, ask where they got stuck and fix that.

## Mistakes seen in real builds

Floating decoration (two ground heights); sun over the HUD; background that does not scroll with the player; stale sprites from a missed
hide loop; 93,000 cycles from 20 ground sprites; hand-rotated sprite copies; music of 32 notes with one beep for every event; seven versions
because there was no brief, no screenshots and no length target; a score that went negative; every run the same because `srand` was never called.
