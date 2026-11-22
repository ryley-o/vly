# Reference: arcade and score-chase games (short runs, a score to beat, skill that grows)

Read this when your game is a run you start over and over: a shooter, a skipper, a dodger, a runner, any "one more try". It is a reference guide to the design playbook (`vly docs design`); `vly docs ref-originality` is how to find the idea, `ref-levels` and `ref-worlds` cover stages and structure, `ref-puzzles` covers proving levels with a solver (the same ideas apply here), and this guide covers what is particular to arcade games: the shape of a run, fairness, skill you can measure, and what brings a player back.

**Quality bar:** a new player knows what to do within ten seconds and dies, or finishes, in a way they understand; a run is a minute or two and retry is instant (under a second); every run is survivable and none is unfair by accident; the score rewards skill you can name (timing, planning, risk); better players score clearly more than weaker ones; and there is a reason to come back (a grade to beat, a number to share, something to unlock).

These are patterns from our trials, not rules. A different arcade game (an endless runner, a duel, a rhythm-like timing game) will strike different balances.

## 1. What a trial that worked did (a stone-skipping game: one verb, 64 numbered lakes)

1. **One verb with one choice.** Tap to skip the stone as a ring closes; hold a direction to pick a high, middle or flat skip. The choice changes how long the hop lasts, so it changes *when the next ring closes*. Thumbs learn the tap in seconds, and the choice gives the skill ceiling.
2. **Hazards are built around the choice.** A reed blocks flat skips, a low insect blocks middle skips, a tall plant blocks flat and middle, a whirlpool blocks touching down. Each obstacle removes one or two of the three options at that spot, which tells the player what to hold.
3. **A solver, then par.** The author wrote an exact solver for the game's rules and generated each lake *around a secret safe path*, so every lake is solvable by construction and has a known best score (par). The results screen grades a run against par.
4. **A skill ladder of bots.** The real cartridge was played by an oracle (perfect timing) and by bots with timing noise of about 17, 33, 50 and 83 ms, plus a greedy bot (no look-ahead) and a lazy one (always the middle skip). The scores formed a clear ladder: the oracle crossed every lake near par; 17 ms noise crossed about two thirds; 83 ms crossed 7%; greedy and lazy bots almost never did. That is the evidence that skill matters, the game is not a coin flip, and a better player is rewarded.
5. **The chain is the melody.** Each perfect skip plays the next note of a climbing scale, so doing well *sounds* good and a break in the chain is heard.
6. **Fast retry.** About 0.6 seconds from the results screen to the next attempt on the same lake.
7. **A reason to return:** a best score, a grade (D to AAA against par) and a "crossed" flag per lake; stone skins unlocked by lifetime skips; and numbered lakes you can share ("beat my score on lake 17").

## 2. Run structure: fixed, endless or both

- **Fixed, numbered stages** (the same lake every time): learnable, shareable, a par per stage, a grade per stage, and a place to put new hazards in a planned order. Cost: authored or generated content, and a ceiling once the player has solved them. A generator with a seed per stage gives you hundreds cheaply.
- **Endless or random runs:** variety and a high-score table, no ceiling. Cost: harder to prove fair (you must prove the generator never makes an impossible pattern) and a run teaches less because it never repeats.
- **A mix** (fixed stages that unlock an endless mode, or a daily seed) often suits a handheld best.
- Whatever you choose, decide **what a run teaches**: "on this lake the plant after the second pad needs a high skip, so I should save spin first" is a lesson a fixed stage can give and a random run cannot.

## 3. Fairness by construction

- **Generate around a path that exists.** Build the safe route first, then place hazards that leave it open. Prove it with a solver or an oracle bot over every stage, and keep a margin: in the trial, hazard heights equal to jump arcs left 0 to 1 pixels of slack, so any timing noise died. Lowering the hazards and widening margins let a bot with 50 ms of noise get through.
- **Beware doomed states.** A state from which no survival is possible (a trap right in front of a hazard) is unfair if the player cannot see it coming. Count them with the solver (in the trial about 9.5% of reachable states were doomed, visible but easy to drift into) and decide on purpose whether to remove them.
- **Make the first stage nearly impossible to lose** and teach the verb there; raise the difficulty as a curve across stages (in the trial, the share of lakes crossed by a mid-skill bot fell from 60% to 29% from the first quarter to the last).
- **Never let the game punish a button the player did not press.** In the trial, bots died because they released a direction before touchdown; the human version of that is a hold that must be sustained. Make required holds obvious.

## 4. Measuring skill (a ladder of bots)

`vly docs workflow` has the bot kit. For arcade games:

1. **An oracle** that plays perfectly (from your solver) shows the best possible score and checks the solver matches the cartridge (in the trial the oracle reproduced the solver's par exactly).
2. **Humanised bots:** the same policy with `humanize(policy, { delay, jitter, seed })` from `src/tools/bot.js`, run at several jitter values (0, 1, 2, 3, 5 frames), over every stage and several seeds. Report mean score as a share of par and the share of stages survived at each level.
3. **Naive bots** (greedy, lazy, random) show the floor.
4. **Read the ladder:** scores should rise with skill, a sloppy player should be able to do *something*, and the top should be hard to reach. A flat ladder means there is no skill in the game; a cliff means it is too hard.
5. **Be honest about the limit:** bots model timing noise, not a human's confusion. Say what you could not measure (how fast a new player understands, whether the first stage teaches in ten seconds, what thumbs do on a phone).

## 5. Feel: the loop, the hit, the reward

- **Retry in under a second,** with the same stage, so a failure is a lesson and not a chore.
- **Make events felt.** A good action gets a sound, a particle and a number; a failure gets a hit-stop (a few frames of freeze), a shake and a falling tone. `vly run --audio --notes` lists the notes each channel played, so you can check that a chain climbs and nothing is shrill without listening.
- **Sound as score.** Let the sound follow the player's performance (a climbing scale, a rising pitch, a layer that joins).
- **Show the timing.** A closing ring, a shrinking bar or a beat marker makes a timing game readable. Test it at native size with the HUD visible.
- **Watch the cost of the screen after a run.** A results screen that does a lot of setup in one frame can exceed the frame budget forever after (in the trial it overran every frame); stage the setup over several frames and check with `vly run --worst`.

## 6. What brings a player back

- **Something to beat:** a best score per stage; a grade against par; a number to share.
- **Something to earn:** unlocks by lifetime stats (skins, stages, modes), not by grinding a single run.
- **Something to learn:** a stage you nearly cleared and know how to fix.
- **No dark patterns:** no fake urgency, no punishing a player for leaving; saving the best and the unlocks is enough.
- **Say what is next.** After a run, the results screen should offer the obvious next thing (retry, next stage) on one button.

## 7. Anti-patterns

- A score that does not reward skill (a ladder of bots that scores alike).
- An unfair stage no solver has checked, or hazards with no slack so any noise is death.
- A slow retry, a long results animation, or a menu between runs.
- A hint the player cannot find (see `ref-puzzles`) or a first stage that needs reading.
- Difficulty that is only speed (everything faster) instead of new decisions.
- Judging "feel" from a bot clear. A bot proves a run can be survived, not that it is fun.

## What to write down

In `DESIGN.md`: the verb and the one choice; what a run is and how long; fixed, endless or both and why; how fairness is guaranteed and how you checked it (solver, oracle, margins, doomed-state share); the bot ladder and its results; the feel of retry, hit and reward; what brings a player back; and what you could not verify.

## Sources and honesty

This guide comes from our own trial (a 64-lake stone-skipping game built by an assistant from the other guides) and from the structure ideas in `ref-levels` and `ref-puzzles`. We did **not** do fresh web research for it. The ladder of scores is from one game and from bots, not people. The thresholds and readings are our interpretation.
