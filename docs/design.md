# Making a good game: the VLY-1 design playbook

Read this before you design anything, and again before you call a game finished. Most costly mistakes in real builds were
design and verification mistakes, not coding mistakes. This page is the difference between a toy and a game someone wants
to keep playing.

## 0. The quality bar

**Your game must be your own.** The templates and the sample games in `games/` are *references*: read them to learn a technique (how a tilemap is scanned, how a boss is staged, how a save is sealed). Never ship one with a new skin, new title, new art or renamed words:
its rules, levels, code structure and art must be your own, designed for this person. `vly check` compares your sources with every template and sample game and **flags a re-skin**. Start from an empty project (`vly new mygame`), not from a game. A game that only changes the title, the colours, the sprites or the story around someone else's levels is a re-skin, however nicely it runs. If you catch yourself reusing a template's level data or its main loop, stop and design your own.

**Aim for the depth and polish of a good NES-era game, not a tech demo.** A person who is given this game should still be
playing it an hour later, and should be able to tell where the care went. Concretely, a finished game has:

| Always (even a tiny game) | Add for a full game |
|---|---|
| A title screen with the game's name and "PRESS START" | 3 or more distinct stages, zones or phases, each with its own look, hazards and music |
| Pause on START, game over, retry without restarting the console | 3 or more enemy or obstacle behaviours that need different answers, and a boss or finale |
| A clear goal the player can state in one sentence, and a way to win or a reason to go on | 2 or more power-ups, upgrades or abilities that change how you play |
| Controls that feel good (section 5) and are explained on screen | Progress or high score saved to the cartridge (1 KB is plenty) |
| Sound effects for every event the player causes (jump, hit, pickup, fail) | 3 or more music tracks (title, play, boss or win), none of which audibly loops in the first 20 seconds |
| A difficulty curve: easy first minute, then it asks more | A short ending, and secrets or a reason to replay |
| A name or message for the person it was made for, if there is one | 10 or more minutes before the player has seen everything |

If the person asked for something small, scale the right column down, but **keep the left column**. Do not trade polish for
more features: a short game with excellent feel beats a long one that is clumsy.

### Depth and length: three stages is a demo, not a game

The table's "3 or more" is a floor. The NES games people still play had **8 stages and a final fortress (Mega Man), 32 levels in 8 worlds (Super Mario Bros.), 9 dungeons
and an overworld (Zelda)**, and took one to ten hours. The 1 MB cartridge allows that; a stage costs a few hundred bytes of level data plus the code that is reused. Our own sample
games stop at three stages because they were built to show *techniques*; **do not copy that length**. Plan for it:

- **Targets for a full game**: an action or platform game has **8 or more stages in 3 or 4 worlds** (each world a new look, palette, music track and *one new mechanic* introduced safely, used
  in combination, then tested by a boss); a first playthrough takes **30 to 60 minutes** for a person (a bot that knows the level takes a third of that); a racing game has 12 or more tracks in
  cups; a puzzle game 40 or more levels; an adventure 6 or more areas. A small game (an arcade score-chaser) is fine at one screen, but then it needs **escalation** (new rules every minute), not stages.
- **Plan the content in a table before coding** (one row per stage: name, theme, new mechanic or enemy, length in screens, boss or gimmick, music, secret). The table is what
  keeps stage 6 from being stage 2 with a new palette. Introduce each mechanic in a safe spot, repeat it with a twist, then combine it with an earlier one.
- **Make content cheap to add**: levels are **data** (an ASCII `.map`, a generator script that writes banked bytes, or a spawn script table), enemies are a few behaviours with parameters
  (speed, hits, pattern), and a bigger game reuses the same systems with new data, so stage 7 costs hours of design, not a rewrite. Put level data in banks (`vly docs language`, Banks).
- **Build a vertical slice first** (title to boss to results, with stage 1 only, all polish), then add content in passes, **running a bot through every new stage** and `vly check` with a recorded
  path after each pass. Time budget: the engine and the first stage are about a third of the work, the other stages the rest.
- **Reasons to come back**: unlockable stages or characters, a second harder loop with changed layouts, time and score medals per stage, hidden collectibles, a bestiary or recipe list, a
  password-free save (1 KB holds all of it).
- **Difficulty is a curve, not a ramp**: easy stage, hard stage, breather, set-piece. Test with a bot that reacts late (`delay: 12`); if only the perfect bot finishes, it is too hard; if it never
  dies, too easy. A boss should be learnable in three tries.
- **If you cannot fit the length in one session**, say so plainly to the person ("this is stages 1 to 3 of 8; the rest follows the same pattern") and ship the vertical slice, then continue; do not
  stop at three stages and call it finished.

### Calm, no-fail and collection games (cozy, sandbox, creative, gift games)

Not every good game has enemies, a clock or a game over. For a relaxing game the **bar is the same, the shape is different**: map it like this.

| The action bar says | For a calm game |
|---|---|
| 3+ stages or zones with their own look | 3+ places (gardens, rooms, islands), each with its own look, music and things to find |
| 3+ enemy or obstacle behaviours | 3+ characters or creatures with their own habits, likes and dislikes (a cat that visits only when its favourite flower is in bloom) |
| a boss or finale | a **finale that rewards the whole game** (a party, a sunrise, an ending scene), not a fight |
| game over, retry, "why did I lose" | **no fail state, but never a dead end**: nothing can be broken, nothing can be missed forever; always something gentle to do next |
| difficulty curve | a **pacing curve**: new things arrive steadily (a new seed, a new visitor, a new place every few minutes); no waiting longer than a minute for the next change |
| score and high score | a **collection or friendship goal** the player can see (a book of visitors, hearts, flowers grown), saved on the cartridge |
| hit-stop, shake, danger sounds | **soft feedback**: every action has a small gentle sound and a visible response; nothing startles |

Still required: title with a "CONTINUE" when a save exists, pause or help on START, fades between places, sound for every action, music that does not
loop audibly (several slow tracks), a saved game, and **depth**: a first-time player should still have things to discover after ten minutes. A game that a
perfect bot completes in under two minutes is too thin: **measure it** (`runBot`, see the workflow doc) and add goals (more visitors, longer growth, a second
and third place) until the bot needs at least five minutes of play, so a person, who is slower and wanders, takes 20 or more. Optional for a calm game: game
over and retry, bosses, power-ups, hit-stop, a difficulty curve. Where something would normally punish, let it only make a pleasant thing take longer.
`games/cat-garden` is the worked example (a gift game for a mother who likes gardening and cats: three gardens, six cats, a birthday finale).

## 1. Process: brief, one mechanic at a time, see everything, play the whole game

1. **Write a one-page brief before any code**, and show it to the person in a few lines. It must settle:
   - *Genre and the core loop in one sentence* ("steer a truck over hills, collect fuel, beat the clock").
   - *Controls map, locked* (section 5): what each of D-pad, A, B, START, SELECT does. Do not change it later without telling them.
   - *Scoring and the goal*: what is the score, what wins, what loses, what is saved.
   - *Screens*: title, play, pause, game over, win.
   - *Content list and length*: stages, enemy types, power-ups, music tracks, effects (section 0 sets the minimum).
2. **Build one mechanic at a time.** Movement first. Get it feeling right, with the numbers in section 6, before adding the next thing.
3. **See every change.** After each mechanic, look at screenshots at the start, mid-action and the end of a run. Bugs
   like a mud puddle floating 8 pixels above the dirt, a sun overlapping the HUD, or a background that does not scroll with
   the player are obvious in a picture and invisible in numbers. Reading `screen_text` is a fallback for when you cannot see images.
4. **Play the whole game, not the opening screen.** Script a full run with inputs (a bot if needed): every stage, a death, a
   win, the game over screen, the retry. Run `check` (section 11).
5. **Polish last, in this order:** feel (6), audio (8), transitions (7), then art detail. Never polish art while the mechanic is still wrong.
6. **Finish with the checklist** in section 12 and tell the person honestly what you tested and what you did not.

## 2. The canvas: 160 x 144 pixels, readable at a glance

- The screen is 20 x 18 tiles of 8 x 8 pixels. A sprite smaller than 8 x 8 is hard to read; a hero is usually 8 x 16 or 16 x 16.
- **Four colours per tile or sprite** (colour 0 is transparent for sprites). Use contrast, not detail: dark outline, one mid
  tone, one highlight. Keep the 8 + 8 palettes organised: palette 0 for the world, others for variety (one per enemy type,
  one for pickups, one for the HUD).
- **Keep the HUD in the window layer**, not the background. `scroll()` moves the whole background, so a HUD drawn there
  scrolls away. The window layer sits on top and does not scroll: `lcd(LCD_BG | LCD_WIN | LCD_OBJ)`, `window_pos(0, 128)`
  puts a two-row strip along the bottom, and `wtext`, `wprint_u` and `set_wcell` write to it. Reserve the top or bottom two
  rows for the HUD and **never let gameplay objects enter that zone**.
- **One ground truth.** Every surface the player can stand on or drive over is at one height you can name (a row of tiles, or a
  height table). Place decoration relative to it: a puddle, a flower or a fence post sits **on** the ground line, not 8
  pixels above it. If it is decoration, make it visibly different from anything solid (colour, behind-sprite flag, no outline).
- **Decoration must never read as an obstacle**, and an obstacle must never read as decoration. Dark trees that are stuck
  on screen but not solid are a lie to the player.
- **Contrast between plane and thing.** The player and anything dangerous must stand out from the background in luminance, not just hue.
- **The window layer always runs from its top-left corner to the bottom-right of the screen**: it cannot be a strip in the middle,
  so a one-line banner is not a window overlay (use sprites with `spr_text`, or BG text with scrolling held still). **Sprites draw
  over the window layer** (unless `SPR_BEHIND` and the window pixel is non-zero), so anything that flies into the HUD rows covers
  the HUD: stop enemies and bullets before the HUD zone (despawn above it) and check a screenshot.
- Sprites use `SPR_BEHIND` to pass behind background pixels (a hero behind a tree top), `SPR_FLIPX` / `SPR_FLIPY` to mirror,
  and tile-map cells have `CELL_FLIPX` / `CELL_FLIPY`. **Mirror instead of drawing both directions.** There is no rotation:
  for tilt or banking, pre-draw a few angles (the `.tiles` format can generate rotated copies: see `rotate` in the art docs) and swap frames.
- **Sprite budget is 64, so manage it.** Use the `std/sprites` helpers (`spr_begin(0)`, `spr(x, y, tile, attr)`,
  `spr_end()`): they hand out slots each frame and hide the ones you did not use, so a stale rival or flag can never linger.
  Do not hand-assign indices and then forget to hide them.

## 3. Backgrounds and scrolling

- The background is a 32 x 32 tile map (256 x 256 px) that wraps. `scroll(x, y)` sets the offset. For a world wider than 256
  px, **stream columns**: as the camera moves, write the column that is about to scroll into view (a ring buffer: slot =
  column mod 32). See Thies' World and the `std/` notes in the modules page for the pattern.
- **Parallax is faked.** There is one background layer. For a second, slower layer use sprites (clouds, distant hills as 32 x
  32 sprites moving at half speed), or tile art that you shift by rewriting tiles at half the camera speed. Even one cloud
  layer moving at 0.5x makes a scene feel deep. Keep it cheap: a few big sprites, not many small ones.
- **Animate the world**, even slightly: water, torches, grass, flags. Swap a tile's art every 8 to 16 frames (`anim_frame`
  from `std/anim`), or write a different tile index into the map cells.
- **Vary what scrolls by.** Repeating one tile pattern for a minute reads as empty. Change palette, add landmarks every 5 to
  10 seconds of travel, change the ground shape, change the sky between stages.
- **What is expensive** (measured, in cycles; a frame has 120,000 and you want the worst frame under 80,000):

  | Call | Cost |
  |---|---|
  | writing every cell of the 32 x 32 background map with `set_cell` | 84,000 (`clear_bg()` is only about 400) |
  | filling the whole 20 x 18 window with `set_wcell` | 29,000 |
  | `tune_play` (building a 16 to 24 bar song) | 21,000 to 31,000 |
  | `music_build` of one 256-step voice | 19,000 (so build one voice per frame and start all voices together on the same step, not in one frame) |
  | `fill_cells` over the whole 32 x 32 map | 58,000 (it is not a memset) |
  | `save_seal` + `save_commit` (the checksum) | 21,000 |
  | a dark screen from nothing | about 400: make the blank cell tile 0 with palette 0 dark, then `clear_bg()` (a loop of `fill_cells` over the whole screen costs about 44,000) |
  | 20 `print_u` calls | 21,000 (print numbers only when they change) |
  | 100 `sin` + 100 `cos` | 25,000 |
  | 100 `overlap` calls | 12,000 |
  | 64 `sprite` calls | 9,000 |
  | 100 `rand` calls | 7,000 |
  | `text()` of 23 characters | 2,600 (about 110 cycles a character) |
  | one `fade_set` / `fade_update` step (64 colours) | 15,000 |
  | `hide_all_sprites()` | 4,000 |
  | `load_tiles` of 64 tiles | 500 |

  **Never put two of the big ones in the same frame** (a screen change that rebuilds the window, starts a tune and saves will spike).
  Spread them over frames with a small state, or do them while the screen is faded out. `vly run --worst 5` lists the frames that cost the most.
- Scrolling costs: a full column write is cheap; redrawing text or the whole map every frame is not. Budget: `frame()` has
  120,000 cycles and `init()` 1,200,000; aim to stay **under 80,000 in the worst frame** and check `cycles_per_frame.max`.

## 4. Screens, flow and transitions

A game is a state machine. Name the states and handle each in one place:

`TITLE -> PLAY -> (PAUSE <-> PLAY) -> DEAD -> (GAME OVER | RETRY) -> (WIN) -> TITLE`

- **Title screen**: the game's name, a hero or logo, "PRESS START" blinking (`blink` from `std/anim`), music playing. Show the
  controls once, short ("A JUMP  B TURBO").
- **Never cut straight between screens.** Use a transition of 15 to 30 frames: a **fade** (step the palettes toward black
  over 4 steps of 6 frames, then back up on the new screen), a **wipe** (reveal columns of tiles left to right), or a
  **stage card** ("STAGE 2 / THE CAVES" for 90 frames with a jingle). Fades are the simplest: keep a `fade` level 0 to 3 and
  derive the palette from it.
- **Pause** on START: freeze the update, keep drawing, show "PAUSED", mute or lower the music. Resume on START.
- **Game over** shows the score and best score, a choice (RETRY / QUIT) and a sound. Retrying must reset *everything* (positions,
  timers, spawn lists, hidden sprites) with no leftovers from the last run.
- **Death is a moment, not a cut.** Freeze 20 to 30 frames, play the fail sound, flash or fall, then continue.
- **Give feedback for every state change** (a sound, a flash, a number popping up). If nothing tells the player something happened, they will not know.

## 5. Controls

- Lock the map in the brief and show it on the title screen. Conventions that players already know:
  D-pad moves; **A is the main action** (jump, confirm, accelerate); **B is the second action** (attack, run, turbo, cancel);
  START pauses and starts; SELECT is for something rare (map, options, change item). Menus: D-pad moves, A confirms, B backs out.
- **Use `btnp` for one-shot actions** (jump, menu choices, shoot once per press) and `btn` for held actions (run, accelerate).
  Using `btn` for a menu makes it fly past the choice.
- **Never rely on more than two buttons at once** and never require precise diagonal timing. Eight-way input is fine; do not require all eight.
- **Forgive the player**: *coyote time* (allow a jump for about 5 frames after leaving a ledge), a *jump buffer* (remember a press for about 6 frames before landing), and generous hitboxes for the player's attacks and slightly smaller hitboxes for the player's own body.
- On a handheld the thumb covers the lower left and right of the pad, so avoid fast sequences that alternate left and right buttons.

## 6. Game feel: numbers that work

All speeds are in pixels per frame at 60 frames per second. For slow speeds like 0.5 px/frame use fixed point: **8.8** (value `x * 256`, draw with `x >> 8`) works only for positions
under 128 px, such as a single screen or an object's offset. A **wide world** (a scrolling level, over 128 px) will not fit: keep the position in
whole pixels and keep a separate sub-pixel remainder (`x`, `x_frac` in 1/256 px; add the speed to `x_frac` and carry into `x`), or keep only
the velocity in 8.8. The platformer template does this; `games/ninja-chef` does it over 1,920 px levels. 1 px/frame is 60 px/s, a screen width in 2.7 seconds.

| Thing | Good starting value |
|---|---|
| Walk speed | 1.0 to 1.5 px/frame (hero), enemies 0.5 to 1.0 |
| Run / dash | 2.0 to 2.5 px/frame |
| Acceleration to full speed | reach top speed in 8 to 12 frames; stop in 6 to 8 (friction) so it has weight |
| Gravity | 0.25 px/frame squared (64 in 8.8) |
| Jump launch | -4.0 px/frame: peak height 32 px (4 tiles), airtime about 32 frames. Cut the jump short when A is released (halve the upward speed) for variable height |
| Terminal fall speed | 4 to 5 px/frame |
| Camera | follow with a small lead in the move direction; max 2 px/frame; do not snap |
| Projectile | 3 to 4 px/frame, fewer than 4 on screen |
| Invulnerability after a hit | 60 to 90 frames, hero blinks every 4 |
| Hit-stop (freeze on impact) | 2 to 4 frames |
| Screen shake | scroll offset of 1 to 2 px for 6 to 10 frames, on big impacts only |
| Knockback | 2 to 3 px/frame away for 8 to 10 frames |

- **Ramps and slopes launch you along the slope**, not straight up. A ramp that teleports a vehicle into the air is wrong;
  carry the ground's slope into the launch velocity.
- **Tilt or banking only matters if landing angle matters.** If the vehicle can crash for landing badly, show the angle
  (pre-drawn rotation frames) and make the crash rule match what the player saw.
- **A speed boost needs a cost** (an overheat bar, a limited stock, a slower turn) or it is just the normal speed.
- **Rivals and enemies need rubber-banding**: if the player is far ahead, slow the rival a little; far behind, help it, within a few percent. A race should stay a race.
- **Randomness**: the generator starts from a fixed state, so call `srand(hi, lo)` once with something that varies (`frames()`
  at the moment START is pressed) or every run is identical. Use `rand` for variety, not for core fairness.
- **Arithmetic is 16-bit and signed**: a score above 32,767 turns negative if you compare it with `<`. Use `ult`/`ugt` for
  unsigned values, or cap the score. A timer in frames wraps at 65,535 (18 minutes).

## 7. Transitions, juice and small delights

Players feel the difference between a game that responds and one that merely updates. Cheap things that matter:

- Squash and stretch by swapping a frame for 2 to 3 frames on jump and landing; a dust puff sprite on landing and on skids.
- Numbers pop up on pickups (`+10` rising for 20 frames). Flash the HUD value when it changes (blink the digits for 20 frames).
- Anticipation and recovery: an enemy that telegraphs for 20 frames before it attacks is fair; one that does not is cheating.
- The hero faces where it moves (`SPR_FLIPX`), blinks when idle for 3 seconds, and has distinct frames for stand, walk (2 to 4 frames), jump, hurt.
- Parallax clouds, falling leaves, twinkling stars, water shimmer: one cheap ambient effect per stage.
- Death and win animations, a stage clear jingle, a fanfare for a new best score.

## 8. Sound and music

The machine has 4 channels: **0 and 1 are pulse (square), 2 is triangle, 3 is noise.** Plan them before writing anything:

| Channel | Music | Sound effects |
|---|---|---|
| 0 pulse | lead melody | rarely |
| 1 pulse | harmony or arpeggio | **tonal effects** (jump, pickup, power-up, shoot): the music voice on this channel yields while an effect plays |
| 2 triangle | bass line | none |
| 3 noise | drums (kick and snare as short bursts) | **noise effects** (landing, hit, explosion, engine rumble) |

**Fastest start:** `std/tunes` has five finished loops (`tune_play(TUNE_ACTION)`, `TUNE_ADVENTURE`, `TUNE_TITLE`, `TUNE_BOSS`, `TUNE_SPACE`) on channels 0 and 2, so you get good music in two lines and can spend your effort on a signature tune later (`music_build` makes long songs out of patterns). Use `std/music` for songs (`music_play`, `music_update`) and `std/sfx` for effects (`sfx_play(SFX_JUMP)`, `sfx_update()` each
frame), which cooperate so effects interrupt the music cleanly and the music comes back.

- **Every event the player causes has its own sound:** jump, land, hit, pickup, power-up, shoot, enemy defeat, menu move,
  menu confirm, pause, death, level clear. If two events sound the same, one of them needs a new sound. The sound a
  thing makes should suit it: a monster truck should rev (a rising triangle or pulse pitch following speed), not beep.
- **Music is long enough not to be noticed looping.** A 32-note loop is heard as a loop in 10 seconds. Write at least 16
  bars (a 20 to 30 second loop) of melody with variation (A section, B section, A again), a bass line, and drums. Use
  `music_tempo` to change speed and keep tracks distinct: title (calm), play (driving), boss or danger (faster, lower),
  win (a short fanfare that does not loop).
- **Sounds you hear hundreds of times must be gentle.** A tone above about 1.4 kHz is shrill on a tiny speaker and unbearable when repeated (a shooter's gun
  at 1,500 to 2,400 Hz was the worst sound in our own sample games). Rules: a repeating effect (a gun, a step, a tick) is **below 800 Hz, volume 3 to 5, 2 to 3 frames long**,
  or a soft noise burst; keep tones above 1 kHz for one-off sparkles (a pickup chime, a power-up) at moderate volume; never put a sustained tone above 1.5 kHz in a game. Listen to it
  as a person would: `vly run ... --wav out.wav` and check the spectrum or volume, or ask a person to play for 30 seconds with the sound on; if you cannot listen, assume a 20-second
  loop of the most frequent sound is annoying until the numbers say otherwise.
- **Keep the mix balanced**: music voices at volume 5 to 8, effects at 9 to 13, `master_volume` at 8 to 12. The run summary
  tells you `peak_volume`; above 0.6 it will be loud on a small speaker.
- Silence is a tool: drop the music for a boss intro. On pause, **lower** the music (`master_volume`, e.g. to a third) instead of muting it: `vly check`
  presses START at random, so a game that mutes on pause looks silent for much of the test and WARNs that it has no sound.
- You cannot hear the result through the API; the `audio` summary says how long it was audible and how loud. Check that gameplay
  actually produces sound (`audible_seconds` should be most of the run) and that the title screen has music.

## 9. Level and content design

- **Teach, test, twist.** Introduce a hazard in a safe place, then test it with a small challenge, then combine it with
  another hazard. A new thing every 20 to 40 seconds keeps attention.
- **Pace in waves**: tension, release, tension. After a hard section give a rest beat (a long flat run, a pickup).
- **Length and variety targets for a stage**: 60 to 120 seconds of play; at least 3 different obstacle types; no pattern
  repeated more than 3 times in a row; one memorable set piece (a jump chain, a mini-boss, a chase).
- **A course is more than its first screen.** Early racing tracks were too short and repetitive because nobody set a length or variety target. Build the full course, run it start to finish, and make sure the middle is as good as the beginning.
- **Difficulty is a curve, not a cliff.** The first minute should be nearly impossible to lose. Ramp by adding things, not only speed. Offer a safety valve (a checkpoint, extra lives, a hint after repeated deaths).
- **Fairness**: every danger is visible before it can hurt, every death is understandable, every restart is quick (under 2 seconds).
- **Reward exploration and mastery**: a secret, a bonus, a best-time or high score the player wants to beat. Save it.
- Content that scales: enemy palette swaps with new behaviours, reuse tile sets with different palettes per stage, one boss with 3 phases.

## 10. Genre recipes (start from these, not from nothing)

**Platformer.** Variable-height jump (numbers in section 6), coyote time, one-way platforms, enemies that patrol and
can be stomped, a checkpoint every 20 seconds, 3 or more stages, collectibles. The `platformer` template has physics and tilemaps.

**Racer (side view).** `games/hill-racer` is the worked example of everything in this playbook (read its source and tests). Terrain as a height function of x so the ground can be drawn and driven on; the vehicle follows the
ground slope; ramps carry slope into the jump; lap and best-time as the score; rivals with rubber-banding; boost with an
overheat bar; three or more tracks that differ in hill shapes, hazards and sky. HUD in the window layer.

**Top-down adventure.** A world of rooms or a big scrolling map with solid and walkable tiles, doors and keys, an inventory
of 3 to 6 items, NPC dialogue (`std/ui`), at least 3 enemy types, a boss, a reason to return (shortcuts, upgrades). The `game` and `battle` templates cover maps and menus. Thies' World is the full-size example.

**Shooter.** Scrolling starfield (cheap sprites at 2 speeds), 4 or more enemy formations, power-ups that change the weapon, a mid-boss and a boss, a score multiplier that rewards risk. The `shooter` template has formations and bombs.

**Stage script (shooters, runners, anything with waves).** Do not spawn enemies from scattered `if` statements. Write the stage as a table of
`(frame, kind, x)` rows, read one row at a time, so a stage is data you can see, reorder and test:

```
btable stage1 = { 90,E_ROCK,40,  120,E_ROCK,100,  200,E_UFO,20,  230,E_UFO,120,  400,E_BOSS_WARNING,0,  520,E_BOSS,80,  0 };   // frame, kind, x
var script_i; var stage_t;
func run_script() {
  var f = peek8(stage1 + script_i * 3);                 // frames fit in a byte here; use a table of words for long stages
  while (f != 0 && f <= stage_t) { spawn(peek8(stage1 + script_i * 3 + 1), peek8(stage1 + script_i * 3 + 2)); script_i++; f = peek8(stage1 + script_i * 3); }
  stage_t++;
}
```

Each stage has: a card ("STAGE 2"), the script, a boss warning (siren and a "WARNING" banner for about 2 seconds, music changes to `TUNE_BOSS`), the boss
with 2 or 3 phases that change below health thresholds, a clear banner and score tally, then the next stage's card. `games/star-raptor` is a full example.

**Story and puzzle games (mystery, escape room, adventure with talk).** The pieces that worked in a full example (`games/midnight-nightingale`):
rooms as separate screens (6 or more) joined by doors, one interaction button (A: talk, examine, take, use) and one notebook button (SELECT) that lists the
clues found; **a reusable lock screen** (a digit safe, a letter wheel, an ordering, a clock) so five different locks cost one piece of code; dialogue as a
typewriter text box with a speaker name, word wrap, a page marker and A to continue (the box moves to the top when the hero is low, so it never covers the
hero); a character who gives **graduated hints** when the player is stuck; a final deduction or choice that needs several clues and explains a wrong answer
instead of ending the game; progress saved at every milestone. **Keep the text in a `strings` asset** (`strings story bank 3 = "story.txt";`, then
`str_get(story, story_BANK, i, buf)`): ordinary string literals all live in the 16 KB the CPU always sees and a story fills it quickly. **Pacing for a
thinking game is reading time**: a bot that knows every answer finishes in a minute; add the time to read each page (about 2.5 seconds) and to think at
each lock (20 to 60 seconds for a person) when you compare with the "10+ minutes" target, and give every lock a way forward (a hint) so nobody is stuck for good.

**Long scrolling platformer (stages wider than a screen).** What worked in `games/ninja-chef` (three stages of 240 tiles, bosses, checkpoints):
store each stage as **one byte per tile in a banked `asset`** written by a small generator script (`tools/mklevels.mjs`: ASCII rows in, `.bin` out), because a `tilemap`
costs 2 bytes per cell in the always-visible 16 KB; copy the stage into RAM (or stream a column at a time as the camera moves) and test collisions against that. Keep the
hero in whole pixels plus a sub-pixel remainder (a 1,920 px world does not fit in 8.8). Hand-tuned feel, measured with `--watch py,vx`: gravity 64, jump -1024,
walk 384, terminal 1152 gave a 30 px held jump (14 frames to the peak, 30 airborne), a 10 px tap, full speed in 9 frames and a stop in 6; a 4-tile gap is the longest
you can fairly ask for. A pit costs a heart and puts the hero back on the last safe ground (never an instant game over); checkpoint flags save the spot. Give each stage a
boss arena where the camera locks, a card before it and a cooking, tally or reward screen after it. **Test it with the bot kit and a delay**: a bot that sees the
world 12 frames late but knows its own position (`live: ['px','py']`) is a fair stand-in for a quick child; if only the perfect bot finishes, lower the difficulty
(extra heart, slower boss, more health pickups) before calling it a kids' game.

**Rhythm game (notes, timing, scores).** What worked in `games/fret-rush` (four lanes, four songs, grades): **one frame counter is the song clock**; the music, the
falling notes and the judging all read it (step k happens at frame `k * frames_per_step`, no drift: audio registers set in frame N sound during frame N, so audio is
frame-exact). `std/music` free-runs and cannot start on a chosen frame, so for a game where timing is the point write a tiny sequencer driven by the song clock
(`tone()` calls from a song table) and let the **lead part be the chart**: the notes the player hits are the melody. Store songs as a banked `asset` written by a generator
script and read it with `bank_peek8`. Windows, in frames either side of the note: **Perfect 3 to 4, Good 7 to 9** (wider on a slow song); a press earlier than the Good window
with no note near it breaks the combo (that is what stops mashing: a bot mashing every 3rd frame failed every song in 5 seconds); show EARLY/LATE on a miss. Add a **setup
screen** that measures input delay from about 8 taps and subtracts it. Required screens: title, song select with a preview, 3-2-1 count-in (4 beats, the first note on "GO"),
play (score, combo, multiplier up to x4, a rock meter), pause with resume/retry/quit and a count-in after, a fail screen, results with a grade and accuracy, per-song saved bests
that a worse run cannot lower. **Test it with a bot that presses N frames late and with jitter** (`runBot`, `delay`): the reference game got all-perfect at 0 to 3 frames late,
all-GOOD at 6, and failed every song at 12; with jitter of +-2 frames an S grade was possible and +-6 was uncomfortable on the hardest song. Call `api.flush()` in the bot when the
song clock restarts, or the delayed read of it is the previous song's.

**Versus game against the computer (air hockey, tennis, fighting, pong-likes).** What worked in `games/air-hockey` (four AI levels, first to 7):
**physics**: two sub-steps per frame, positions in 1/64 px (a 160 px screen fits 16 bits only that way), velocities in 1/256 px/frame, and distances compared as squares or with `isqrt`.
Make tunnelling impossible by keeping the largest movement in a sub-step (puck 2.75 + mallet 1.5 px) well under the contact distance (11 px), clamp against walls, treat goal posts as point
circles, and test it: a 6,000-trial stress test with a mallet charging the puck found a bug where mallet and puck sat 7 px inside each other in a corner. Cap the puck speed (5.5 px/frame),
use restitution 0.7 for the mallet (0.9 gave 60-hit rallies), 0.92 for walls, a little drag. **The AI is a human-shaped controller, not a cheat**: it sees the puck N frames late
(28, 14, 7, 4 for four levels), has a speed cap (1.1 to 2.4 px/frame defending), a position error (+-24 down to +-2 px), an aim error, and only the top levels predict wall bounces and
bank shots. Same physics for both sides; levels differ only in those numbers. **Calibrate with bots of different skill** (20 matches each): the novice bot should beat ROOKIE most of the time
and lose to the rest, the expert bot should win about 20/16/6/4 of 20; a mallet that "sees" 30 frames late should lose to PRO. **Stalemate traps** every one of which a headless bot-vs-AI
match found: attack zones that both stop just before the centre line (a puck resting there freezes the game), an AI that winds up and then retreats as it speeds up (latch the charge state),
an unreachable wind-up point when the puck sits on a wall, a "walk into it" fallback that stops 1 px short, and an idle player (add a shot clock: a puck lying still in your half for 7 s costs
you the point). A wide goal (56 px) beats a narrow one (40 px let every shot be saved). Pace: 600 to 1,050 frames per goal including about 230 of celebration and serve. Give the loser the serve, show match
point and sudden death, lock the top level until the previous is beaten, and save wins and losses per level plus a best-shot record. If two sounds must overlap (a noise thock under a tonal
knock) `std/sfx`'s single lane is not enough; use two channels yourself.

**Pet and care games (virtual pet, garden, farm: needs that change over time).** What worked in `games/nebble` (four needs, three growth stages, five adult forms, three mini-games):
**time**: there is no real-time clock, so pet time runs only while the console is on, and every power-on applies **one fixed "nap"** (hunger -14, fun -10, clean -8, energy +12, a need never pushed below 30)
whether it was off for a minute or a month; say so on an in-game page, because pretending the pet lived in real time would be a lie nobody can check. **Neglect never kills**: the pet grows up as the
"scruffy" form, every action still works at zero, and nothing is lost; the cost of neglect is *which* adult you get. **Pace**: needs fall about 1 per 3 to 5 seconds awake (hungry face after about 2.5 minutes of neglect,
everything at zero after about 7), a meal gives +34, a snack +12 and fun, a bath +45, sleep refills in about 20 seconds; stages at 3 minutes and 12 minutes of life, so a person who plays in 3-minute sessions
has an adult in 5 sessions. **Forms decided by care history** (counters kept in the save: snacks, games won, evening sleeps, baths, time spent with a need near zero), decided once at growth, each adult with
different needs (one gets hungry faster, one sleeps better), and an album page of the forms found so far: that is the reason to start again. **Mini-games** give 0 to 3 stars and a fun gain
(+6 to +34), with saved bests. A day cycle (day, evening, night with their own palette and music, a faster clock while the pet sleeps) makes the same room feel different. **Test with persona bots**
(attentive, snack-giver, plays a lot, ignores 45% / 70% / 85% of the time, does nothing) over 8 seeds each and check that each persona lands on the form you meant, that the neglect bot's pet is alive, and
that mini-game star counts spread with reaction delay (a late bot should get 0 or 1 stars, a quick one 3). **Saving**: write the save at milestones (a meal, a bath, growth, leaving) and at most
about once a minute; the cartridge flash survives about 100,000 writes per sector, so a save every few seconds would wear it out within weeks (`vly check` warns above about 3 a minute).
Keep numbers that grow past 32,767 (age in frames) in two words or compare with `ult` (the compiler warns when a constant above 32,767 meets a signed `<`).

**Puzzle.** Rules a person can state in a sentence; a tutorial level that teaches by doing; 15 or more levels ramping up; undo and restart on a button; a clear "solved" moment with a sound; progress saved. The `puzzle` template has 7 levels and undo.

**Arcade (endless).** One screen, rising speed, a score and a saved high score, a danger that escalates in phases (not just faster), and a combo or risk reward. Ends fast, restarts instantly.

## 11. Testing and debugging: prove it, do not assume it

Do all of these. Each has a tool.

1. **Compile cleanly.** `vly build`: fix the first error first.
2. **`faults` must be `none`.** Division by zero, writes to ROM, illegal instruction and cycle overruns are all reported.
3. **Check the budget.** `cycles_per_frame.max` under 80,000 (120,000 is the hard cap), and `init_overran` false. If it is high, run the
   profiler (`profile: true` returns cycles per function) and fix the top function, not guesses.
4. **See it.** Screenshots at several frames (`shots_at: [0, 60, 300, 1200]`) or the filmstrip. Check alignment, overlap, scrolling
   (does the background move with the player?), the HUD zone, and that nothing is stuck on screen.
5. **Press the buttons a player would.** Use `input` for movement, jumps and menus. Then press START at the title and play a
   full run. Watch the variables that matter with `watch` (state, score, lives, speed) and read the timeline: it is how you
   prove a jump, a flip or a lap really happened.
6. **Run the automated quality check.** `vly check` plays the game with scripted and random input for several
   minutes of game time and reports: faults, worst-frame cycles, whether the screen changes (not frozen), whether sound plays, sprite
   hygiene, text covered by sprites, whether the title responds to START, and whether the game ends or resets. **Treat every WARN as a bug to fix or a decision to explain.**
7. **Play every state.** Title, play, pause, death, game over, retry, win. Retry must be identical to a fresh start.
8. **Run long.** 5 minutes of input (`frames: 18000`) to catch wrapping counters, sprite leaks and drift.
9. **Edge cases.** Hold every button at once; do nothing for 30 seconds; die immediately; reach the end instantly (set the starting state by a debug flag in a test, never in the shipped game).
10. **Playtest with the real player** when there is one. Ask what they were trying to do and where they got stuck; fix that, not what you assumed.

If you cannot see images, `screen_text` shows text and sprites; its `notes` call out sprites that cover text. Still ask for a picture to be looked at by a person when it matters.

## 12. Finishing checklist (all must be true)

- [ ] The brief exists and the game matches it; the controls map is shown on the title screen
- [ ] Title, play, pause, game over, retry, win all work and transition smoothly
- [ ] `faults: none`, worst-frame cycles under 80,000, `check` has no unexplained WARN
- [ ] Screenshots from start, mid-game and end reviewed: no floating objects, no overlap with the HUD, the background scrolls with the world
- [ ] Every player-caused event has its own sound; music is 20 or more seconds before it repeats; the title has music
- [ ] A full run from title to the end (or a long arcade run) was played by script, including a death and a retry
- [ ] The first minute is easy, the difficulty rises, the player always knows why they lost
- [ ] Progress or best score is saved and survives a reload
- [ ] It has depth: more than one stage or phase, more than one enemy behaviour, something to unlock or beat
- [ ] The person is told plainly what was tested, what was not, and how to give feedback

## 13. Mistakes seen in real builds (do not repeat these)

| Mistake | Why it happened | Do this instead |
|---|---|---|
| A mud puddle floating 8 px above the dirt | the ground height was guessed in two places | one ground-height function used by drawing and physics; look at a screenshot |
| A sun drawn on top of the HUD | decoration placed without a safe zone | reserve HUD rows; keep decoration out of them; check a screenshot |
| Decoration read as an obstacle (dark trees stuck on screen) | same colour and outline as solid things | decoration is lighter and behind; obstacles are high contrast |
| The background did not move with the player | scrolling faked with a few sprites that were never updated | scroll the map; stream columns; verify in a screenshot after moving |
| Stale rivals and flags lingered across versions | hand-managed sprite indices, a hide loop that missed one | `std/sprites`: slots are handed out and unused ones are hidden every frame |
| 33,000 to 93,000 cycles per frame after adding scenery | 20 ground sprites and a height function called 65 times a frame | per-function profile, compute once per frame, use tiles for ground |
| Tilt done by generating nose-up copies by hand in Python | no rotation | use the `.tiles` `rotate` helper, or flip flags for mirrors |
| Seven versions to reach a good game | text-only checks, no design brief, no length target | brief first, screenshots on, full runs, `check` |
| Previews expiring in the middle of a playtest | each try made a new link | publish once (`publish_game`); revisions keep the same link |
| Music that loops noticeably and an engine that beeps | 32 notes and one beep for every event | 16+ bars, a bass and drums, effects that suit the thing |
| A score that goes negative | signed 16-bit arithmetic | cap it, or compare with `ugt`; keep big numbers split into two words |
| Every run is the same | the random generator starts from a fixed state | `srand(hi, lo)` from `frames()` at START |
| Menus that skip two choices per press | `btn` used where `btnp` was needed | `btnp` for one-shot input |
