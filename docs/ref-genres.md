# Reference: genre recipes

Read the recipe for your genre before you design it, and the others for ideas worth stealing. It is a reference guide to the design playbook (`vly docs design`): the playbook says what every game needs; this says what each kind of game needs on this machine. For a side-scroller also read `vly docs ref-sidescroller` (the Mario recipe).


**Platformer.** Use `vly docs ref-sidescroller` and `import "std/platformer"` for the movement (the exact Super Mario Bros. numbers, tested), and read its section 0: borrow the feel, never the look. Variable-height jump, coyote time, one-way platforms, enemies that patrol and
can be stomped, a checkpoint every 20 seconds, 3 or more stages, collectibles. (The `platformer` template is older hand-tuned physics: use `std/platformer`, and start from an empty project.)

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
store each stage as **one byte per tile in a banked `asset`** (or, for many levels, `asset levels bank auto records 240 = incbin("levels.bin");` and `levels_load(i, grid)`: the compiler spreads them over banks, see `vly docs language`) written by a small generator script (`tools/mklevels.mjs`: ASCII rows in, `.bin` out), because a `tilemap`
costs 2 bytes per cell in the always-visible 16 KB; copy the stage into RAM (or stream a column at a time as the camera moves) and test collisions against that. Keep the
hero in whole pixels plus a sub-pixel remainder (a 1,920 px world does not fit in 8.8). (Older hand-tuned feel from that game, kept for comparison; **`ref-sidescroller` and `std/platformer` supersede it, use those numbers instead**.) Measured with `--watch py,vx`: gravity 64, jump -1024,
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

**Teach every mechanic by making the player use it, early.** Do not explain a rule and hope: build the first levels so that level 1 cannot be solved without mechanic A, level 2 not without mechanic B, level 3 only with both (a quilt puzzle: the first needs one turn, the second one swap, the third both), with a tiny before and after picture where the rule first matters. Then **prove it, do not assume it**: `src/tools/campaign.js` (`analyzeCampaign`) takes a solver you write (does this level have a solution using only these mechanics, and what is the fewest moves?) and reports the first level that actually requires each rule, the levels that claim to teach a rule but do not need it, an opening that is too easy (three of the first five levels solved in one move) and a difficulty that does not rise; put it in `tests/report.mjs` and `vly release` prints it. Over a long campaign also track which decisions get harder and where each new rule first matters, so you know what to playtest.

**Puzzle.** Rules a person can state in a sentence; a tutorial level that teaches by doing; 15 or more levels ramping up (aim for far more on a rising curve, or a generator with a difficulty setting; see "Beyond the minimum"); undo and restart on a button; a clear "solved" moment with a sound; progress saved. The `puzzle` template has 7 levels and undo.

**Arcade (endless).** One screen, rising speed, a score and a saved high score, a danger that escalates in phases (not just faster), and a combo or risk reward. Ends fast, restarts instantly.
