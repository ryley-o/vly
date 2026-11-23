# Making a good game: the VLY-1 design playbook

Read this before you design anything, and again before you call a game finished. Most costly mistakes in real builds were
design and verification mistakes, not coding mistakes. This page is the difference between a toy and a game someone wants
to keep playing.

## Reference guides (the central index)

**How to read the guidance here.** It is a set of patterns that tend to work and patterns that tend to fail, with the reasons, not a rulebook. Numbers are starting points taken from classics or from our own trials, and the thresholds in our tools are estimates; there will be games where the right answer is different. When you break a pattern, do it on purpose and say why in `DESIGN.md`. When a pattern fits, use it and spend your effort on what is yours.

This playbook says what a good game needs. The reference guides say exactly how, with numbers; read the ones that fit your game *before* you build that part, and say in `DESIGN.md` which you used.

| Your game has... | Read | What is in it |
|---|---|---|
| a character that runs and jumps through a scrolling level | `vly docs ref-sidescroller` | the exact Super Mario Bros. movement numbers (walk, run, skid, variable jump, air control), collision and corner sliding, how Mario judges enemy contact (falling onto an enemy always stomps), forgiveness, camera, level design philosophy; and `import "std/platformer"`, a tested module that does it |
| music (every game) | `vly docs ref-music` | channel roles on this machine, what Kondo, the Baroque-minded Castlevania composers and Uematsu did, public-domain classical pieces to arrange, loop length and variation, mixing for a tiny speaker |
| **any game, before you choose the idea** | `vly docs ref-originality` | how to invent a mechanic that is simple, elegant and tied to the story: a process with random constraints to escape the first-idea trap, ten elegance tests, being original in several facets at once, and making the levels come from the mechanic |
| levels (every game with stages) | `vly docs ref-levels` | what makes levels fun: every jump needs a consequence, the four beats, pacing and rest, enemy arrangements, terrain and verticality, a working method, and `vly levels` to find dead screens, flat runs, repeated enemies and jumps with no consequence |
| power-ups and abilities | `vly docs ref-powerups` | why Mario's mushroom, flower and star are elegant, how they really work (read from the code), a process for inventing your own with a cost and a visible state, and a small implementation |
| any game with timing, reactions or several things to read at once | `vly docs ref-humans` | what a person can do in a fraction of a second: reaction times, choice cost, latency, frame arithmetic; reaction versus anticipation; one decision per beat; forgiveness patterns; bots with reaction delays; a fairness checklist |
| an arcade or score-chase game (runs, par, fairness, skill ladder, what brings players back) | `vly docs ref-arcade` | how a 64-stage arcade game was built and measured: one verb with one choice, stages generated around a safe path, a ladder of bots (oracle, human-like noise, naive), instant retry, felt events, unlocks and grades |
| a puzzle game (a rule, solver-first levels, difficulty curve, teaching by requirement) | `vly docs ref-puzzles` | how a 63-level puzzle was made and proved: a rule that is a picture, a solver and backwards generation, proving every rule bites, par and random-win-rate curves, undo, hints, readability |
| the shape of the game, exploring, atmosphere | `vly docs ref-worlds` | ten structures beyond "scroll right, checkpoints, ending", how to choose one from the story, what makes exploring satisfying, and cheap ways to make a four-colour screen beautiful |
| any game | `vly docs ref-genres` | the recipe per genre: platformer, racer, shooter, puzzle, story, rhythm, virtual pet, versus; the sample game to read for each |

**Read `ref-originality` first, then the others as they apply.** More deep guides (shooter, racer, rhythm, pet) are added as those genres are tested (puzzle has one: `ref-puzzles`; arcade has one: `ref-arcade`); until then `ref-genres` is the guide.

## 0. The quality bar

**Your game must be your own.** The templates and the sample games in `games/` are *references*: read them to learn a technique (how a tilemap is scanned, how a boss is staged, how a save is sealed). Never ship one with a new skin, new title, new art or renamed words:
its rules, levels, code structure and art must be your own, designed for this person. `vly check` compares your sources with every template and sample game and **flags a re-skin**. Start from an empty project (`vly new mygame`), not from a game. A game that only changes the title, the colours, the sprites or the story around someone else's levels is a re-skin, however nicely it runs. If you catch yourself reusing a template's level data or its main loop, stop and design your own.

**Be original, not only different.** Copying a classic's *feel* (Mario's movement, Tetris's controls, a shooter's weapon curve) is the right start, because feel is hard and the classics solved it. Copying its *look, cast and world* is not: no brick-and-question-mark blocks, mushroom walkers, green pipes, plumbers or princesses; no falling blocks that are Tetris with a new colour. Combine the classic's feel with something of your own, in at least one way that changes how the game *plays* (a new mechanic, a tool, a world rule) and in your own theme, sprites, palettes, story and sound. Write down in `DESIGN.md` what you borrowed, what is new, and three things the classic does not have. A reader should be able to tell the game from a single screenshot. **`vly docs ref-originality` is how to get there**: a process for inventing a simple, elegant mechanic that is tied to your story, and for being original in several facets (mechanic, structure, art, sound, story) at once, not one.

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

- **Targets for a full game**: an action or platform game has **24 or more stages in 6 to 8 worlds** (Super Mario Bros. has 32 stages in 8 worlds, and a person who plays the classics found a 12-stage game too short). A world is 3 or 4 stages and a boss or castle, with a new look, palette, music track and *one new mechanic* introduced safely, used
  in combination, then tested by the boss; a first playthrough takes **45 to 90 minutes** for a person (a bot that knows the level takes a third of that); a racing game has 12 or more tracks in
  cups; a puzzle game 40 or more levels (100 to 200 on a rising curve, or generated, is better); an adventure 6 or more areas. A small game (an arcade score-chaser) is fine at one screen, but then it needs **escalation** (new rules every minute), not stages.
- **Plan the content in a table before coding** (one row per stage: name, theme, new mechanic or enemy, length in screens, boss or gimmick, music, secret). The table is what
  keeps stage 6 from being stage 2 with a new palette. Introduce each mechanic in a safe spot, repeat it with a twist, then combine it with an earlier one.
- **Make content cheap to add**: levels are **data** (an ASCII `.map`, a generator script that writes banked bytes, or a spawn script table), enemies are a few behaviours with parameters
  (speed, hits, pattern), and a bigger game reuses the same systems with new data, so stage 7 costs hours of design, not a rewrite. Put level data in banks (`vly docs language`, Banks).
- **Build a vertical slice first** (title to boss to results, with stage 1 only, all polish), then add content in passes, **running a bot through every new stage** and `vly check` with a recorded
  path after each pass. Time budget: the engine and the first stage are about a third of the work, the other stages the rest.
- **Beyond the minimum (best practices, not requirements).** The numbers above are a floor, and many games should go well past them. What makes a long game *fun* is not the count but the shape:
  - **A curve, not a pile.** 200 puzzle levels that rise steadily in difficulty, each introducing or recombining one idea, are far better than 40 in random order. Order content by measured difficulty (moves a solver needs, how often a bot dies, par time), teach one idea, test it, twist it, combine it with an old one, then give a breather before the next step up.
  - **Generated content is a strength.** A generator with a difficulty parameter and a seed (`srand`) gives hundreds of levels, or an endless mode that escalates, from a few hundred bytes of code. Make solvable by construction, or verify each level with a solver or bot and ship the verified list as data. Infinite generated levels can beat hand-made ones; keep a few hand-made set pieces for the high points.
  - **Progress the player can see and replay.** Unlock the next level by beating the last; give a **level select** (a grid of levels showing locked, open, beaten, and the medal earned) so beaten levels can be played again; resume where the player left off. 200 levels fit the 1 KB save easily (a byte or two each).
  - **Records that make a level worth replaying.** Best time, fewest moves or highest score per level, collectibles found, a par and bronze/silver/gold medals, power-ups used or skipped, a perfect-run flag. Show them on the select screen and on the title. A record turns "I won" into "I can do better".
  - **Modes.** A relaxed mode and a hard mode, an endless mode with a saved best, a time attack, a daily-style seeded challenge (a fixed seed shared by everyone, since there is no clock).
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

### `DESIGN.md`: the plan, and a checklist (best practice)

Write it in the project folder before you code and show it to the person. A good one has: **the game in one sentence**; **what makes it this person's** (their name, their jokes, their rules); **what it borrows and what is its own** (the classic feel you copied, the mechanic and the theme and story that are new, three things the classic does not have); **the idea** (the one-sentence mechanic, ten candidate titles with the three finalists, and five level ideas for the one you chose: `vly docs ref-originality`); **the structure and why** (`vly docs ref-worlds`); **your power-ups** and what each costs (`vly docs ref-powerups`); **controls**; **screens**; a **content table** (a row per stage or level: theme, new mechanic or enemy, **the decision that mechanic creates for the player**, boss or set-piece, music); **how progress works** (unlocks, level select, saves, records); and what makes it different from the nearest sample game. End it with a list headed `## Done when` with one line per promise ("8 stages, each with its own boss", "a recorded path clears stage 3", "level select shows medals"). `vly check` prints that list back at the end; go through it in your final message to the person: done, partly done or not done, with evidence. It is a best practice, not a gate: its value is that a gap is hard to hide.

### What the classics teach (they had the same constraints)

The games people still love from the NES and Game Boy era had a screen this small, four colours or a few more, a handful of buttons and almost no memory. They did not win by having more. Take their habits, not their sprites (and see the originality note above: learn the technique, then make your own game).

- **Feel first, then levels.** Miyamoto's team tried a Mario that ran and bounced around before they had a level, and "realised that this was great fun"; they tested how a large character felt to control and made jumps far bigger than real life. Make the character move well in an empty room (section 6) before you build anything around it.
- **Teach with the game, not with text.** World 1-1 has no instructions. The first enemy walks on the ground so jumping over it or on it is the obvious answer; some pits have floors so the first mistake does not end the run; the first power-up is hard to miss. Put each new idea in a safe place, make the player use it, and let the next level need it. `analyzeCampaign` checks that level 1, 2, 3 really require what they claim to teach.
- **Four beats per idea: introduce, develop, twist, conclude.** Nintendo's level designers describe it as the four-act *kishōtenketsu* shape: show a mechanic safely, add depth to it, surprise the player with an unexpected use, then finish with a test. It is the same as "teach, test, twist" in section 9 with a closing beat; a level that only repeats the first beat is filler.
- **Be kind to beginners, deep for experts.** Kirby's Dream Land was made easy on purpose: extra lives, flight, a generous attack, damage that is not instant death. The depth was for those who looked for it. A first-time player should be able to finish; a keen player should find a better grade, a hidden route or a harder mode.
- **One idea, played well, in a short session.** Tetris needed no tutorial and no story, and it fitted the "pick up, play, put down" pattern of a handheld. If your idea does not fit in one sentence, it is probably two games.
- **Simple rules, different personalities.** Pac-Man's four ghosts each follow a different one-line rule (chase, ambush ahead of you, mirror you, or flee when you come close). That gave a rich game from tiny code and kept it from being boring or impossible. Prefer three enemies that each need a different answer over ten that do the same thing.
- **Withered technology, used laterally.** Gunpei Yokoi's rule for the Game Boy was to take mature, cheap technology and find a new use for it: a plain screen, long battery life, a great game in the box. The limits are the product. Do not fight them (no fake colours, no fake resolution); make them part of the look and the feel.
- **Fun first, then everything else.** Iwatani on Pac-Man: "fun should be the first point of any game". If a feature is clever and not fun, remove it.

### Familiar beats clever (Jakob's law)

People spend most of their time playing *other* games, so they expect yours to work like those. Jakob Nielsen formulated this for websites, and it holds for any place people meet many designs: **a familiar pattern costs the player nothing; a new one costs attention you wanted to spend on the game**. This is the whole reason the VLY-1 has one common front end and one control layout.

- **Spend your novelty on the one thing that is yours** (the core mechanic, the world, the jokes), not on controls, menus, health or pause.
- **Use the conventions every handheld player already knows:** the D-pad moves; A is the main action and "yes"; B is the second action and "back"; START starts and pauses; "PRESS START" on the title; hearts or a bar for health; coins or stars for collecting; red and flashing for danger; the goal usually to the right or up; a pause that stops everything and a resume that is instant.
- **Reuse menu and level-select patterns** (`std/ui`, `std/flow`) so a player who has used one VLY-1 game has already learned your menus.
- **A familiar thing may look new.** Keep the behaviour, change the art. Keeping the behaviour is what makes the art feel good.
- **Breaking a convention is allowed, but it has to earn its place.** Jakob's law describes a cost; it does not forbid paying it. If you do (a reversed control, a button that changes meaning, a screen that works differently), the gain must be one the player feels in the first minute, and the game must show it before it matters.

Further reading, if you want the detail: Miyamoto on World 1-1 ([Game Developer](https://gamedeveloper.com/design/how-miyamoto-built-i-super-mario-bros-i-legendary-world-1-1), [AV Club](https://www.avclub.com/shigeru-miyamoto-explains-the-making-of-super-mario-bro-1798284041)); Nintendo's four-step level design ([MCV](https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps)); Sakurai on being kind to beginners ([Nintendo Life](https://www.nintendolife.com/news/2023/09/random-kirbys-dream-land-is-all-about-being-kind-to-beginners-says-sakurai)); Yokoi's lateral thinking with withered technology ([Wikipedia](https://en.wikipedia.org/wiki/Gunpei_Yokoi)); Pac-Man's ghosts ([Wikipedia](https://en.wikipedia.org/wiki/Ghosts_(Pac-Man)), [The Pac-Man Dossier](https://www.gamedeveloper.com/design/the-pac-man-dossier)); Jakob's law ([Laws of UX](https://lawsofux.com/jakobs-law/)).

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

*A quick test at the native size, with the HUD visible: point to the next safe landing and the nearest hazard. If background art could be mistaken for a platform, give solid terrain the strongest edges and make scenery softer (`vly docs ref-sidescroller`, "Seeing where you will land").*

- **Text facts** (they cost one trial an evening): the font's glyphs are 5 x 7 pixels at the top-left of an 8 x 8 cell, so letters in neighbouring cells touch or nearly touch (leave a blank row between lines you want to read, and a blank column where numbers meet labels); `print_u`/`wprint_u` are left-aligned in their field; the window layer is drawn over the background, so background text on the rows the window covers (the bottom rows when you use it for a HUD) is hidden; the screen is 20 columns wide, so strings longer than 20 characters fall off the edge (`wtext` warns at build time); and the labels on a filmstrip cover row 0 of each frame, so text there looks clipped but is not.
- The screen is 20 x 18 tiles of 8 x 8 pixels. A sprite smaller than 8 x 8 is hard to read; a hero is usually 8 x 16 or 16 x 16.
- **Four colours per tile or sprite** (colour 0 is transparent for sprites). Use contrast, not detail: dark outline, one mid
  tone, one highlight. Keep the 8 + 8 palettes organised: palette 0 for the world, others for variety (one per enemy type,
  one for pickups, one for the HUD).
- **Keep the HUD in the window layer**, not the background. `scroll()` moves the whole background, so a HUD drawn there
  scrolls away. The window layer sits on top and does not scroll: `lcd(LCD_BG | LCD_WIN | LCD_OBJ)`, `window_pos(0, 128)`
  puts a two-row strip along the bottom, and `wtext`, `wprint_u` and `set_wcell` write to it. Reserve the top or bottom two
  rows for the HUD and **never let gameplay objects enter that zone**. Two traps seen in real games: sprites are drawn *over* the window layer, so a hero or platform that falls into a pit passes over the HUD (hide or stop drawing a sprite when its y reaches the HUD rows); and colour 0 of a background tile and an unwritten window cell are opaque, so blank HUD cells show the scene behind them until you fill them with an explicit solid tile. A 160 x 144 screen minus a two-row HUD leaves 8 block rows of 16 px (not 9) for play.
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
  | one `fade_set` / `fade_update` step (64 colours) | 15,000 to 31,000 (31,000 measured in a real game with 16 palettes: give a fade step a quiet frame) |
  | `save_valid()` | 20,000 (check it once and keep the answer, not every frame) |
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

### The common front end: one pattern on every screen, obsessively clear

People like to see, not read (an AI reads every word; a player glances). Design every screen so it can be understood in a second without reading, and make the whole game follow **one pattern** so nothing needs explaining.
`templates/flow` is a small working project of all of this (menus, confirm, how-to page, level grid, grades, saves, with replay tests): copy its front end, then make the game itself your own. `std/flow` has the parts.

**Reset the world when you change screens.** A menu, a game-over or a story card drawn after a scrolling stage tends to need a `scroll(0, 0)`, a cleared map and hidden sprites first; otherwise the text appears shifted (in one trial the game-over title lost its first letters off the left edge). Take a screenshot of **every** screen (title, how-to, grid, story card, pause, game over, ending) after playing a stage, not only from a cold start, and read the text on it.

**The flow** (every game with progress):

1. The console's boot logo (not yours). Then the game's **splash**: its art and name, a few seconds, any button skips.
2. **Menu**: if a save with progress exists, the menu is exactly **CONTINUE (first and selected), NEW GAME**, in that order, every game. On a first run there is only NEW GAME. There is no separate "erase data" item: NEW GAME *is* the erase, and it says so.
3. **NEW GAME with a save asks first**: a box that names exactly what will be erased ("ERASE SAVE? ALL GRADES GO"), with **KEEP selected by default** and ERASE second. B cancels. Never erase on a single press. Choosing ERASE wipes the save and starts the story; choosing KEEP returns to the menu with everything intact. Never let a NEW GAME silently resume old progress.
   **Read the save every time the menu is shown, not once at power-on.** A game that decided "is there a save?" in `init()` offered only NEW GAME after the player had cleared stages *in the same session*, while the level grid (which read the save live) already showed the check marks; NEW GAME then reset the unlock counter but not the marks. Keep one function (`refresh()` in `templates/flow`) that recomputes `has_save`, the unlock counter and everything the grid draws from the save, call it whenever you enter the menu or the grid, draw marks only from that, and make NEW GAME (once confirmed) wipe the save itself (`save_clear`, `save_seal`, `save_commit`) so nothing is left to draw. *Test:* beat a level, go back to the title: CONTINUE is there; choose NEW GAME and ERASE in the confirm box: the grid has no marks.
4. The **opening story**: a few short lines (or pictures) that give the player a reason to care. Always after the menu, both for CONTINUE and NEW GAME.
5. The **how-to page**: shown every time at startup, because it is the one page that has to explain symbols. Pictograms, not paragraphs: a frame with the D-pad cross and "MOVE", a frame with "A" and "PICK", a frame with "B" and "BACK", plus whatever symbols the puzzle uses (draw each and say what it does). This is the only place where words explain pictures.
6. The **hub**: a level-select grid (below). Then the level.

**One menu pattern, everywhere, never explained**: UP/DOWN (or LEFT/RIGHT) move the cursor, **A or START choose, B goes back or cancels**. Every menu, confirm box and grid behaves the same, so the player learns it once and it needs no legend. Do not scatter hotkeys.
Inside a level, the arrows plus A and B are usually enough (Mario, Tetris and Kirby needed nothing more), and a game rarely needs SELECT while playing. Extra controls (an undo, a zoomed or "open" view, a mode toggle) each add a thing to learn and a way to get lost, so add one only when the game is really better with it. When you do, put it on a button the player will find and show it on the how-to page.

**Layout rules** (the screen is 20 x 18 cells; everything snaps to the 8-pixel grid):

- **One alignment per screen**: centred or left-justified, never a mix. Centre blocks with `ui_centre(width)` (a grid or menu that hugs the left edge looks like a mistake: a 4-cell-wide menu starts at column 8, not 4). Titles centred, lists left-justified in a column, numbers right-aligned in a fixed width. Use the same margins on every screen.
- **Group, then space**: related things sit together (an icon next to its label, a score next to its heading); a blank row separates groups. Do not scatter items across the screen.
- **The same thing in the same place** on every screen (title on row 0 or 2, the prompt at the bottom). Do not move the cursor column between menus.
- **Show, don't tell**: a lock icon says "locked", a grade letter says how well you did, a blinking A frame says "press A", a coloured frame says "here". Prefer a picture, a number, a colour or motion to a sentence. At most three short lines of text on any screen.
- **One thing blinks at a time**; the selected thing is the brightest (a different colour frame beats an arrow alone).
- **Number your pictures too**: if you teach a rule with a picture (a tiny before and after for "swap"), put it where the player is looking when they first need it, not on a separate page.

### Level select, progression and grades

- A **grid** of levels (4 columns suits 160 pixels), one framed cell per level showing its number and its **best grade**; a lock icon on levels not yet open. Progress is the grid itself: you can see what is open, what is beaten and how well.
- **Progressive unlocking**: beating a level opens the next. The cursor starts on **the next level you have not beaten**, so a returning player just presses A. Beaten levels stay selectable (favourites to replay and improve).
- **What opens next is implied** by the next cell being open and the one after it locked; do not add a legend. Ordinary finishes advance the story; **grades and medals reward mastery** and are never required to move on (unless the game says so with a picture).
- **Grades from a measurable par**: if you know the minimum (turns, moves, seconds), grade against it: AAA at par, then AA, A, B, C, D as the player strays (`grade_for(turns, par)` in `std/flow` is a good default: slack grows with the level's size). Show the grade on the result screen and in the grid. Time, collectibles or power-ups used can grade other genres the same way.
- Keep grades in the save, 4 bits a level (`pg_get`, `pg_record`, `pg_next`, `pg_beaten` in `std/flow`): 200 levels take 100 bytes.
- The **hub is where the player lives between levels**: it should look good, load instantly, and make the next step obvious.

## 5. Controls

- **Running and jumping through a level? Read `vly docs ref-sidescroller` first and start from `import "std/platformer"`**: it is Mario's movement, measured, and it saves you the weeks that feel-tuning takes.
- Lock the map in the brief and show it on the title screen. Conventions that players already know:
  D-pad moves; **A is the main action** (jump, confirm, accelerate); **B is the second action** (attack, run, turbo, cancel);
  START pauses and starts; SELECT is for something rare (map, options, change item). Menus: D-pad moves, A confirms, B backs out.
- **Use `btnp` for one-shot actions** (jump, menu choices, shoot once per press) and `btn` for held actions (run, accelerate).
  Using `btn` for a menu makes it fly past the choice.
- **Never rely on more than two buttons at once** and never require precise diagonal timing. Eight-way input is fine; do not require all eight.
- **Forgive the player, in combat above all**: in Mario, if you are coming down and touch an enemy, *you* kill it (any downward contact is a stomp; only walking into it or hitting it from below hurts), a hit starts a blinking invulnerability in which stomps still work, and the first hit never kills (`vly docs ref-sidescroller`, "Enemy contact"). Also *coyote time* (allow a jump for about 5 frames after leaving a ledge), a *jump buffer* (remember a press for about 6 frames before landing), and generous hitboxes for the player's attacks and slightly smaller hitboxes for the player's own body.
- On a handheld the thumb covers the lower left and right of the pad, so avoid fast sequences that alternate left and right buttons.
- **Taps, holds and releases are three different inputs; test them separately.** If a tap means "go" and a hold means "go fast", a plain tap must not trigger the fast version, and a hold that begins on one screen must not carry into the next. `std/flow` has `bt_tap(b)` (fires on release of a press of 12 frames or fewer), `bt_hold(b, n)` (fires once, after n frames held) and `bt_flush()` (ignore a button already held when the screen changes until it is released): call `bt_update()` first in `frame()`. Write a replay test for each: a tap, a hold, a release, a tap-then-hold, a hold across a screen change, and pause/resume. A touch screen has no key repeat and a thumb that rolls, a keyboard has repeat and ghosting: try both.

## 6. Game feel: numbers that work

**These are generic starting numbers for any game.** For a Mario-style run-and-jump platformer, do not use them: `vly docs ref-sidescroller` (and `import "std/platformer"`) has the exact Super Mario Bros. numbers, and they differ on purpose (about 40 frames to walking speed, not 8 to 12; two gravities; a 62 px held jump, not 32; no speed cut when A is released). Where this section and a reference guide disagree, the reference guide wins for that genre.

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
| Invulnerability after a hit | 90 to 170 frames (SMB1: 168), hero blinks every 4 |
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

**For the music itself (writing a tune that is remembered, how long it should be, what to borrow from the classics and from public-domain composers) read `vly docs ref-music`.** What follows is the checklist.

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
- **Keep the mix balanced**: music voices at volume 5 to 8, effects at 9 to 13, `master_volume` at 8 to 12. `vly run ... --audio` (or `--wav out.wav`) adds an `audio:` line with how many seconds were audible and the peak; above 0.6 it will be loud on a small speaker.
- **Do not draw your own boot logo.** The console shows the VLY-1 logo and a chime before any game starts (the player, the native player and the firmware run a small boot cartridge first, then start your game fresh). Your game begins at its own title screen.
- Silence is a tool: drop the music for a boss intro. On pause, **lower** the music (`master_volume`, e.g. to a third) instead of muting it: `vly check`
  presses START at random, so a game that mutes on pause looks silent for much of the test and WARNs that it has no sound.
- You cannot hear the result through the API; the `audio` summary says how long it was audible and how loud. Check that gameplay
  actually produces sound (`audible_seconds` should be most of the run) and that the title screen has music.

## 9. Level and content design

**For levels read `vly docs ref-levels`** (every jump needs a consequence; no dead screens or long flat runs; vary enemy arrangements; terrain and verticality; a working method) and run **`vly levels yourmap.txt`** on your level maps. For power-ups, `vly docs ref-powerups`. For the shape of the whole game (not always "scroll right, checkpoints, ending") and for exploration and atmosphere, `vly docs ref-worlds`.

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

## 10. Genre recipes: `vly docs ref-genres`

Platformer, racer, shooter, puzzle, rhythm, virtual pet, versus, story and others each have a recipe (the numbers, the structure, the traps, the sample game to read) in **`vly docs ref-genres`** (https://vly-1.vercel.app/ref-genres.md). Read the one for your game before you build its core loop; a side-scroller also reads `vly docs ref-sidescroller`.

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

### Show yourself what the player experiences

- **Three kinds of evidence, kept apart.** *Solvability* (a bot or replay clears it) proves a route exists. *Readability* (can a stranger tell what things are, where they will land, what hurts) needs screenshots at the hard moments: the first use of the signature mechanic, a tricky landing, the lip of a big drop. *Feel* (does it respond well, does a mistake feel fair, is recovery quick) needs short clips or filmstrips of the first use of the mechanic and of recovering from a mistake. A bot clear says nothing about the second and third. When a fresh player is available, watch where they hesitate, misread a sprite, or repeat an action without making a decision: those observations were behind the most valuable changes in our trials. Say in your hand-over which of the three you checked and how.
- **Record the opening**: `vly release` writes `release/opening.gif`, `release/opening.png` (an 8-frame contact sheet an assistant can look at) and `release/opening.wav` (the first 30 seconds, driven by `tests/opening.input` if you have one). Look at it and listen: the boot logo, the splash, the menu, the story, the how-to page, the pauses between screens. Is the art good? Do the instructions read? Is there dead time? A solved-in-one-frame replay proves nothing about this.
- **A warning always has a replay**: `vly check --save-input trace.input` writes the careless player's exact input; `vly run build/x.vlc --input-file trace.input --frames N --screenshot s.png` shows the frame. Audio warnings name the START and SELECT presses that muted or paused the game (a random tester that hit Mute is not a silent game).
- **Verify the link, not just the build**: `vly publish` opens the play page, fetches the cartridge as a player would, compares it with what you built (revision, hash) and presses START on it; `vly release` does all of it in one command, including loading an old release's save.
- **Check the real route in the release:** list your recorded winning paths under `"releaseReplays"` in `vly.json` (each can start from a save) and `vly release` runs the quality gates on them, so cycles, sprites and text overlap are measured on the route a player takes and not only on careless play.
- **Keep players' progress across releases**: put a stable `"id"` in `vly.json` (the offline copy's save key follows it, not the cartridge hash) and keep a save from the previous release in `tests/legacy-saves/`; `vly release` loads it and keeps playing. Reserve save bytes for the future and version your save layout inside the game.

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
