# Reference: making levels that are fun (and finding the dull ones before a player does)

Read this before you design a single level, and again after you have a first full pass, with `vly levels` in hand. It is a reference guide to the design playbook (`vly docs design`): the playbook says a game needs stages with a curve; this says how the best designers make a stage worth playing, and gives you a tool that finds the dull parts of yours.

**Quality bar:** every screen of a level asks the player a question, and a wrong answer costs something. There are no dead screens, no long stretches of bare flat ground, no jumps that matter to nobody, and no enemy repeated until it stops meaning anything. A new idea is introduced where a mistake is free, then used, then twisted, then finished with. The level has a shape: a rise, a peak, a rest, a landmark you can describe afterwards.

An observer who played an AI-built platformer put it plainly: the early levels were boring, with jumps that had no consequences (no fall, nothing at stake), repetitive enemies and large swaths of open ground. This guide is the fix for exactly that.

## 1. The principles experts agree on

(Tags: **[F]** stated by a designer or a primary source; **[O]** analysis or opinion that is widely shared; **[I]** our inference. Sources at the end; we read tool-made summaries of pages, not the raw text.)

1. **A challenge only counts if failing costs something.** **[F]** Difficulty is the chance of failing times the price of failing. A jump onto a safe platform with nothing beneath it is "neutral ground": a fine rest, but not a challenge. A pit is the simplest hazard because it is static, and because it cannot be tested safely it must *look* hostile at first sight. **[I]** So every jump needs a reason: a pit under it, an enemy or hazard at the take-off or landing, a reward the jump earns, or a choice of route it makes. A hop with none of those is neutral, and neutral hops should be a minority.
2. **Difficulty comes from combining things, not from long jumps.** **[F]** One studio notes that Super Mario Bros. permits jumps of roughly 4 to 10 tiles but most of its levels ask for only 2 to 3; the challenge is a jump *plus* an enemy, a moving platform, a timing.
3. **Teach, test, twist, conclude** (kishōtenketsu). **[F]** Mario 3D World's director described it: introduce the idea where failure is nearly impossible; develop it; twist it into something unexpected; conclude with an easier finish and move on. A full cycle took about five minutes in 3D World. One breakdown counts a mechanic across the four acts: one instance in the introduction, one in the development, two or more in the twist, one in the conclusion.
4. **Pacing is intensity against rest.** **[O]** A spike is only felt after a lull; constant peak becomes the new baseline. Rest can still contain easy action (a flat run of enemies you can stomp, a coin arc). Put safe ground next to danger, and quiet beats before a climax.
5. **One idea per level, not every idea.** **[O]** Random scatter, overstuffing and padding are the marks of an amateur level. Pick the level's *one* question and let the enemies, hazards and terrain serve it.
6. **Risk and reward routes, secrets.** **[F]** The main path keeps one direction; secrets branch *against* it (above or below on a horizontal level), are about a screen wide and need effort to enter; shortcuts are harder than the main route; some safe-looking routes lead to harder places.
7. **Short, medium and long goals.** **[F]** A short goal is about 30 seconds away (the next platform, the next enemy); a medium goal is visible but not reachable yet (a bridge that needs a jump sequence); a long goal is a landmark. A cycle of fear then relief keeps the player moving. An odd object in empty space draws the eye (and the player).
8. **Perceived danger can exceed real danger.** **[O]** A wide-looking gap with a floor the player can see is exciting and survivable.
9. **Nintendo's own process.** **[F]** The designers drew levels on graph paper and walked the player's path by hand; World 1-1 was finished last; ideas from the late game were too hard for beginners, so easy versions moved to the start of every level; the first pipe in 1-1 is placed so that a mushroom that bounces off it comes back to the player. The Wonder team wanted at least one surprise per course. The Mario Maker directors' advice: play many levels, know your audience, playtest and watch for boredom.
10. **Telegraph and be fair.** **[F]** Safe and dangerous ground must look different; give a sound or colour cue before something moves; time hazards so a safe opening always exists; never kill on first contact something the player could not have seen.

## 2. Every jump needs a reason

For every gap, ledge, step or platform the player must cross, at least one of these must hold:

| Reason | Example |
|---|---|
| **A fall** | A pit (void below) the player must clear; a hazard floor; water that carries them back. |
| **An enemy or hazard** | An enemy at the take-off or the landing; spikes between two platforms; something that moves while you jump. |
| **A reward** | A coin arc that shows the jump's path; a power-up on the high ledge. |
| **A route choice** | The high route is safe and slow, the low route is fast and risky; the jump picks which. |
| **Your mechanic** | The jump is how the game's own rule is used (flip, swap, grab). |

Count your "pure neutral hops" (a step up or a platform with none of those within three columns). Keep them a minority (`vly levels` counts them). A level made of neutral hops is a chore.

## 3. The shape of a stage

- **Four beats per idea:** introduce it (safe, alone, with a visible reason), develop it (a harder arrangement), twist it (the thing the player did not expect), conclude (an easier finish that proves they learned it). A stage of 60 to 120 seconds holds one main idea, one or two helpers, and one set piece.
- **Intensity curve:** score each screen 0 (rest) to 3 (busy). Rise, peak, rest, climb again to a higher peak, then a short easy finish. Never three very busy screens in a row; never four screens of the same intensity.
- **A landmark per few screens:** something you could point to afterwards (a tower, a waterfall, a giant door, a collapsing bridge). No two four-screen spans should look the same.
- **Set piece:** one memorable place per stage that is only possible in this stage (a chase, a rising floor, a moving-platform ride, a mini-boss).
- **The opening is not an apology.** Early levels need not be empty: a safe start can still contain a small choice or a reward (a coin arc showing the jump, a hidden ledge). Teach with consequence, as World 1-1 does with its first enemy.

## 4. Enemies that do not bore

- **Arrangements, not just types.** One enemy can be met as: alone in the open; a pair; patrolling a platform; above a pit; at a landing; guarding a reward; arriving from behind; in a corridor with a low ceiling. The same enemy in a new arrangement is a new problem.
- **Introduce a new enemy alone,** where a mistake costs nothing, then repeat it with a twist, then combine it with a hazard or an earlier enemy.
- **Do not repeat an arrangement more than twice in a row.** **[O]** Only the first enemy in a repeated group adds real challenge; the rest slow the player down.
- **Enemies should come from the world,** not from a list: what lives here, what does it do all day, how does your mechanic act on it? (`vly docs ref-originality`.)
- **A cast of three to five behaviours per world** that need different answers (stomp it, go round it, wait for it, lure it, avoid it) beats ten that need the same one.

## 5. Terrain and verticality

- **Vary the ground.** A stage reads as designed when the ground changes: a step up, a dip, a raised island, a low ceiling, a second layer. **[I]** Aim for the ground height to change at least once every two screens, and for a quarter or more of the columns to be off the baseline floor.
- **Layer the screen.** After the opening, most screens have two vertical layers (the floor and a platform route above or a pit below).
- **Secrets run against the main direction** (above or below), are one screen wide, and cost effort; reward them with something worth the risk (a power-up, a shortcut, a vista).
- **Gap widths:** use the jump numbers in `vly docs ref-sidescroller` (section 2). 3 blocks or fewer in the first stage; a 4-block gap needs a held jump, a 5-block gap a run. Most Mario gaps are 2 to 3 blocks.
- **Footing before and after danger:** at least one safe tile before and after every hazard cluster, and a checkpoint before a big challenge and after a hard one, with breathing room at the respawn.

## 6. How to build a level (a working method)

1. **Decide the question** the level asks (one sentence), and its four beats.
2. **Sketch it** on grid paper or in a text file, one character per block, as a *path*: where does the player's eye go, where do they stop and think, where do they rest.
3. **Walk it by hand** (Nintendo did): imagine the player's jumps from the first block to the last. Where are they safe? Where could they fail? What do they see before they commit?
4. **Write it as data** (ASCII rows; your own generator script is fine; keep levels as data, `vly docs ref-sidescroller`, "How long a stage is"). Do not type pixel coordinates into code.
5. **Run `vly levels yourmap.txt`** (below). Fix what it flags, or decide on purpose to keep it.
6. **Prove it can be finished** with a bot (`vly docs workflow`, "A search bot for action games"), and prove it is not trivial: a bot that holds only RIGHT must fail, and a delayed, sloppy bot should clear the early levels.
7. **Watch a player (or a delayed bot) for boredom,** not only deaths: where does it do nothing for ten seconds?

## 7. `vly levels`: find the dull parts

`vly levels stage1.txt stage2.txt` reads ASCII level maps (rows from top to bottom; `#` solid, `^` hazard, `a`-`z` enemy types, `o` pickup, `S` spring, `C` checkpoint, `G` goal, `@` start, `.` empty; a column with no floor is a pit) and prints a profile:

- dead screens (ten columns where nothing happens);
- **can the player get through at all** (a static check, before any bot runs): a pit wider than `--max-gap` (default 7 columns, the running jump) or a wall taller than `--max-step` (default 4 rows) is reported first;
- the longest run of flat, empty ground (more than 12 columns is flagged);
- how much of the level leaves the baseline ground, and long stretches with no height change;
- the same enemy encountered more than twice in a row, and a new enemy or hazard that first appears with other dangers beside it;
- raised steps and platforms with nothing at stake around them ("neutral hops");
- the intensity of each screen and runs of busy or same-intensity screens.

Your map will have letters that are scenery or switches, not enemies: pass `--enemies abc` (only these letters are enemies) or `--ignore xyz` (treat these as empty), and start comment lines with `;` or `//`. Without that the profile of a decorated map is nonsense.

The thresholds are **our estimates** (we found no authoritative events-per-screen number), so treat each flag as a question: *is this on purpose?* A flat run before a boss can be a deliberate rest. **A clean profile does not prove a level is fun,** and researchers who generate levels warn against trusting metrics without playtests; use it to find the dull parts, then play it. For your own thresholds, call `analyzeLevel(text, { maxFlatRun: 8, window: 10 })` from `src/tools/levelprofile.js` in a script.

### Things that must stay on one screen (the camera never scrolls back)

The camera in `std/platformer` follows the player forward and **never scrolls back**, as in Super Mario Bros. A puzzle that links two places (a pressure plate and its gate, a switch and its door, a hat parked here and a bridge there) only works if both can be on screen at once, or the player can see the result of what they did. In our trials, three levels were unwinnable for this reason: a plate 12 blocks behind its gate. Patterns that work: keep linked things within roughly a screen of each other, show the effect on screen when the cause happens, or let the camera visit the far thing for a moment (a camera reveal, `vly docs ref-worlds`, section 4). Whatever you choose, test that a player who has not read your design can see what they changed. `vly levels` cannot see your puzzle links; check them by hand and by a bot.

### Never trap the player (a way out of every puzzle)

A puzzle that needs a setup (park an object on a plate, open a gate first) can be walked past: a player who skips the setup may reach the gate with no way to go back, especially when the camera never scrolls back. Patterns that work: let the player undo or restart the room with one button (not only through a pause menu), return a thrown or placed object to the player, put the setup where it cannot be bypassed, or check with a bot that "ran past the setup" ends in a restartable state. `vly levels` cannot see puzzle links; test the skipped-setup route by hand.

### Each mechanic should change a decision

When you plan a stage, write down **the decision the mechanic creates for the player** (a column in the `DESIGN.md` content table: "stage, new thing, the decision it creates"). A mechanic that changes no decision is decoration: in one trial a pond taught cast power before it affected anything, and a tap and a timed hook were enough there; the extra range only earned its place later, when a far pool changed the timing and what could be caught, and a tractor was introduced on routes with a heavy load to haul. Introduce a mechanic where it is first needed, in its simplest form, and add depth only when a later place gives it something to decide.

### What a fall repeats

A checkpoint is a statement about how much play a fall costs. Count it: after dying, how much *meaningful* play does the player repeat, and how much of that is just walking? A good place is just before a decision, after the player has secured something that matters (a rescue, a delivery, a key), and with breathing room at the respawn. Consider carrying what was secured across a fall; one midpoint flag was enough for a trial game's routes once rescues and deliveries survived a death.

## 8. Common failures of generated levels, and the fix

(Our inference from the sources; no source studied AI-built levels directly.)

| Failure | Fix |
|---|---|
| Long flat ground with decoration on it | Change the ground height; add a step, a dip, a platform route, a pit. |
| Gaps and ledges with nothing under or around them | Make the pit lethal and visible, or put an enemy or a reward on the far side. |
| One enemy type at even intervals | Vary the type and arrangement; introduce one at a time. |
| Even density with no rest or climax | Score the screens 0 to 3 and shape the curve. |
| Every mechanic in every screen | One main idea per level, with the four beats. |
| A weak first level | Keep it safe but give it a small choice or reward in the first minute. |
| The idea is only in the first level | Derive every level from the idea (`vly docs ref-originality`, section 5). |

## 9. Self-review, per screen

*What question does this screen ask? What happens if the player misses? Is the answer visible before they commit? What is new here? Where is the rest?*

## Sources and honesty

Read through a summarising fetch tool (summaries, not verbatim): Nicollet's article on difficulty in dexterity-based platformers (gamedev.net); the Yacht Club Games level-design deep dive for Specter of Torment and their checkpoint-design post; the Gamasutra interview with Hirokazu Yasuhara; Iwata Asks for New Super Mario Bros. Wii (volume 2); Nintendo's Ask the Developer on Super Mario Bros. Wonder; the Engadget piece on Super Mario 3D World's four-step design; the Game Developer breakdown of Suzy Cube's level design; cxong's 2D level-design patterns; Game Developer's articles on intensity ramps, on Super Mario Bros. 3's level design (part 2), on Super Mario Maker lessons and tips; the Game Informer interview with the Mario Maker directors. Seen only in search results: the Celeste level-design lessons, Game Maker's Toolkit videos (transcripts blocked), Sonic route design (fan sources). We could not verify the exact placement of World 1-1's first pit or Goomba. The numbers in section 5 and the thresholds of `vly levels` are estimates from this research and our own trials, not published figures.
