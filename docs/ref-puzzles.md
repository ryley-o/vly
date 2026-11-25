# Reference: puzzle games (a rule you can see, levels you can prove, a curve of decisions)

Read this when your game is mostly about solving: a rule on a small board that turns into harder and stranger problems. It is a reference guide to the design playbook (`vly docs design`); `vly docs ref-originality` is how to invent the rule, `vly docs ref-levels` has the general pacing ideas (teach, test, twist, conclude), and this guide is about what is particular to puzzles: proving every level, measuring difficulty, and teaching by requirement.

**Quality bar:** a player can state the rule in a sentence and see its state on screen; the first level cannot be failed and teaches by doing; every new rule is *needed* (or visibly *restricts*) in the level that introduces it, and you can show that; difficulty rises as harder decisions, not only bigger boards; undo is free and instant; a stuck position is announced; and you know, from numbers and not hope, that every level is solvable and none has a shortcut that breaks it.

These are patterns that worked in our trials, not rules. A puzzle with a different shape (a real-time puzzle, a word game, a procedural endless mode) will need a different balance.

## 1. What a trial that worked did (a folding puzzle, 63 levels, 6 worlds)

A mirrored-fold puzzle took shape in one session because the author did these things, in this order:

1. **Chose a rule that is a picture, not arithmetic.** Equal blots that land on each other vanish; different blots refuse the fold. Rejected were ideas that were bookkeeping (sowing games), ideas that already exist (a rolling painted cube) and ideas whose rule was invisible (keeping both faces of the sheet). A rule you can *see* the consequences of teaches itself.
2. **Wrote the solver first.** A short exhaustive search over all reachable states, using the same rules as the game, gave the fewest moves (par), the number of ways to win in par moves, the dead ends and the chance that a random player wins.
3. **Generated levels backwards.** Start from the solved state and apply the rule's inverse a chosen number of times. A level made this way is solvable by construction, and the number of inverse steps gives you a difficulty knob. Then measure it with the solver, because a random walk backwards can come out easier or stranger than you meant.
4. **Proved each rule bites.** For every world's new rule: take it away and check what happens. If a level is unsolvable without a rule, the rule is *required*; if the level gets shorter or has fewer wrong routes without it (a rule that forbids something), it *bites*. A rule that changes nothing is decoration: cut it.
5. **Played the real cartridge from the title** with a bot that used only button presses, and recorded the presses as a replay test, so the proof covers the game as shipped and not only the solver's model of it.
6. **Fuzzed the cartridge against the solver.** Random boards and random moves, thousands of them, comparing the cartridge's memory with the solver's result. Zero mismatches means the two agree on the rules.

## 2. Measuring a level (and what the numbers mean)

`src/tools/statespace.js` (`exploreStates`) takes your start state, a function that lists the legal moves, a key for a state and a win test. It returns: whether the level is solvable; **par** (the fewest moves); how many routes win in par moves; the **dead ends** (states from which no win is possible); the first moves that lead into a dead end; and the exact chance that a player who moves at random wins. Small puzzles (hundreds of thousands of states) are solved in moments.

Reading the numbers (these are our interpretation, not a standard):

- **Par routes = 1** can feel like guessing the author's single answer; **many routes** can feel loose. Neither is wrong; know which you are making.
- **Dead ends** are where a player gets stuck without knowing it. Early levels with none teach calmly; later levels with some are where "clever" lives. Announce a stuck position clearly (a message and a button that undoes) so a dead end is a lesson and not a punishment.
- **Random win rate** is a cheap difficulty proxy: 100% means the level cannot be lost (a good first level, a bad tenth); a few percent means it needs thought. In the folding trial the average rate fell from 100% in the first world to about a third in the last, and the par went from 2 to 6 folds. A rate is not the same as fun: it says nothing about how a person feels.
- **A difficulty that rises is a curve of decisions** (what does the player have to notice, plan or give up?), not a bigger board. Check that levels get harder in *kind*, and that a breather level appears after a hard one.

`analyzeCampaign` (`src/tools/campaign.js`) reads your solver across the whole campaign and reports the first level that actually needs each rule, levels that claim to teach a rule but do not need it, an opening that is too easy (three of the first five solved in one move) and a difficulty that does not rise. For rules that *restrict* instead of enabling (a piece that must never touch another, a goal of "clean, and also folded to one square"), pass `restricting: ['rule']`: for those, "needs" means "bites" (removing the rule changes par, wrong routes or solvability). Put it in `tests/report.mjs` and `vly release` prints it.

## 3. Structure for short bursts

- **A level is one screen and a few minutes.** Group them into worlds of roughly ten, each adding **one** rule (teach, test, twist, conclude: `vly docs ref-levels`); the last world mixes everything. A grid or list of levels with a saved progress and a grade per level (par or better) lets a player replay for mastery.
- **A world card** (three short lines and the new piece drawn large) introduces a rule without a manual.
- **Pictures, not paragraphs.** The how-to page shows the rule as a before and an after, plus the buttons.
- **Many levels beat few.** A generator with a difficulty setting, or hundreds of levels from one rule, is within the cartridge's budget when levels are small data (`vly docs ref-sidescroller`, "How long a stage is", has the numbers for data in banks).

## 4. Teaching by requirement

Do not explain a rule and hope. Build level 1 so that it cannot be solved (or cannot be finished at par) without the new idea, and let the player discover it by doing. The trial's first level had two equal blots in a row, so the only possible move showed what a fold does; its third level (A B B A) taught "mirror" because the obvious crease was refused. Then **prove it** with the campaign analyser above: do not trust your memory of what each level teaches.

## 5. Feel: undo, retry, hints, refusal

- **Undo is one button and instant;** a refused or undone move costs nothing (decide whether a move you made and then undid counts toward the grade, and say so). Restart is in the pause menu.
- **A refused move should say why** (mark the clashing pieces, play a soft sound) rather than do nothing.
- **A hint is only a hint if the player can find it.** A hint that lives only in the pause menu is not discoverable. Consider offering it gently when the player has been stuck or has undone the same thing several times, or show the hint's button on the how-to page and the level screen.
- **Animate the main action briefly** (the fold took 20 frames) and keep the cursor where the player left it, so repeated moves have a rhythm.
- **Short bursts:** the game should resume where the player left off and never make them redo a level they solved.

## 5b. Size the board to the screen (a lesson from CANON)

A board game or puzzle whose board is a small island in an empty 160 x 144 screen is hard to perceive, however good the rules are. A trial built its first version with 8-pixel cells; the owner played it, said the board was "just a bit small to perceive" and asked for it bigger, and the second version, with 16-pixel cells, was the one people called amazing. Do this from the start:
1. **Measure your largest level first** (columns x rows), before you draw anything.
2. **Pick the biggest cell that fits.** The screen is 20 x 18 tiles (160 x 144 px). Cells of **16 x 16 px fill it for any board up to 10 columns x 8 rows**, leaving exactly one 8 px row above and below for status and a thin strip (8 + 128 + 8 = 144). Use 8 px cells only for boards bigger than 10 x 8, and then compare a screenshot at native size with a bigger crop (`--crop`) to check you can still tell the pieces apart.
3. **The background is made of 8 x 8 tiles**, so a 16 px cell is a block of 2 x 2 tiles (the same `fig`-style helper that the puzzle template uses); 12 px cells are impossible on the background, so choose 8, 16 or 24 (or use sprites). Characters, cursors and anything that moves are 16 x 16 sprites (`SPR_16X16`; `sprite NAME 2x2` lays the four tiles out row by row). Redraw the art at the new size; do not stretch it.
4. **Draw every level at the same cell size** and centre the smaller boards (a screen where the cell size changes between levels feels unstable).
5. **A board a little too wide** (11 columns of 16 px is 176 px): make the outer wall columns the ones that fall off the screen, with `scroll(8, 0)`, and check by a test that no walkable cell is in the cropped part. No camera is needed.
6. **Budget the rest of the screen**: at 16 px cells an 8-row board leaves **2 tile rows** for everything else (one above, one below); a 7-row board leaves 4. A status line goes in one row, a strip or a message in the other. The window layer cannot be a strip in the middle of the screen, so use background rows for the HUD.
7. **Secondary displays are secondary.** CANON's staff of notes mattered less to play than the board did; it became a thin strip. Ask of each extra element whether the player needs it to make the next move.

## 5c. Growing a campaign (a lesson from SHADOW: 30 levels became 90)

Asked to triple a proven puzzle campaign, the agent kept the first 30 levels in place, appended six new worlds of ten, and shipped it. What it learned, and what to copy:
- **Append, never reorder, and version the save.** Old saves keep their grades on the same levels only if the old levels keep their numbers. Put a layout-version byte in the save, write a one-time `migrate_save()` that moves fields, and keep a test that loads a save from each earlier release.
- **Every new world needs its own idea.** New worlds that introduced a rule (one-way tiles, levers, a longer delay, a third echo) were good; worlds assembled from "all the rules at once" were the weakest (the last world was made of leftover candidates, with no idea of its own, and its first three levels were near-identical). If the search cannot find ten levels that bite for an idea, ship fewer levels in that world rather than padding it.
- **A hill-climbing generator converges for small boards and few elements.** With long delays or many elements it found one to three candidates in 100 seconds; plan the search budget per world, run the hard worlds first, and measure how many candidates you got before you design the world around the rule.
- **Measure similarity, not just solvability.** Reject a candidate whose interior cells match an existing level at a threshold (the trial used 0.72 under any rotation or mirror), and report the most similar pairs; check that the difficulty score never falls from one level to the next inside a new world.
- **A rule the helper can undo is weaker than a rule that is required.** If the shadow can undo your lever, the level may be solvable without it; test that each level cannot be solved without the new rule (or is much longer without it), not only that it is solvable.
- **Report the weakest levels honestly** (loose levels have thousands of par routes: a puzzle with thousands of solutions is not sharp) and re-check the level grid, saves and budget (ROM banks, frame cycles, test time) at the new size.
- `vly highlight` cannot tell a scrolling page from a weak selection (the whole page moves, so the changed pixels do not line up); judge a scrolling grid by eye on its screenshots.

## 6. Readability on four colours

- **Give each piece a different shape as well as a colour** (circle, diamond, triangle, burst, star); colour alone fails on four shades and for some players.
- **The cursor or crease must contrast with the board** (a yellow line on cream paper vanished; a dark edge fixed it). Check it on the real screen.
- **Sprite draw order:** a lower sprite slot draws on top of a higher one (`vly docs language`). Marks that must be seen (a refusal cross, a selection) need lower slots than the pieces they sit on. `vly run --oam` lists every sprite's slot, position, tile and flags so you can see what is hiding what.
- **Look at the hardest board** at native size, with the HUD: could a stranger tell the pieces apart?

## 7. Anti-patterns

- Hand-made levels with no solver, so unsolvable or trivial levels reach the player.
- A new rule in every level, or a rule that the levels never need.
- Difficulty that is only size (a bigger grid of the same decision).
- A stuck position with no message and no cheap way out.
- A hint nobody can find, or a hint that gives the answer without a choice.
- Explaining the rule in paragraphs instead of in the first levels.
- Calling the game solved because a bot cleared it: a bot proves a route exists, not that the puzzle is clear, fair or fun. Watch a person.

## What to write down

In `DESIGN.md`: the rule in one sentence; what is visible on screen; the world table (levels, the rule each adds, **the decision it creates**); how the levels are made and how each was proved; the par and random-win-rate curve; how undo, restart and hint work; and what you could not verify (feel, clarity and difficulty for people).

### A puzzle pipeline that scales (from a 50-level threshold-contagion game)

A trial whose rule was "a seated person stands when two neighbours stand; seat exactly par clappers so the whole house stands" (50 levels, 6 worlds, boards up to 7 x 6) built this pipeline, and most puzzle games will want the same shape:

- **Check your first claim about the rule with the solver, before you write levels.** The author assumed a standing block grows into a bounding rectangle; the solver showed blocks are stable and merge at distance 2, and the teaching text had to change. A rule you only believe is not a rule.
- **`exploreStates` checks a level; it is too slow to *search* for levels** (about 100 times slower than a purpose-built search). For generating levels, write a bitmask or typed-array solver (compiled C is fine for the build step; it never ships), and search with annealing or a generator under a **wall-clock cap**, then **re-verify every picked level with a second, independent solver** and require agreement on par and on every winning set (the trial: 76 boards, 0 mismatches).
- **Count the proxies for hard, and keep them honest:** par; the number of winning sets (11 levels had exactly one answer); dead first moves (cells in no answer: 0 to 83% of first seats); the exact chance that a random par-size placement wins (33% in level 1, about 1 in 800,000 in level 50); and a greedy player that always makes the locally best move (it never reached par on 22 levels). These are exact and none of them is a person.
- **Teaching levels can be unfailable.** A level whose random win rate is 100% is fine when its job is to show a rule (the reserved-seat teaching boards were like that).
- **Hint ladders have to be exact to be kind.** Step 1 marks pieces that belong to no answer, step 2 blinks one correct move, step 3 shows a whole answer; cap the grade after hints. When your stored answers are incomplete (more answers than you saved), disable the "this is wrong" step instead of guessing, and say "try another".
- **`analyzeCampaign`: enabling or restricting.** "Needs" means *unsolvable without the rule*. A rule that changes the par instead (here, every rule) must be passed in `restricting`, or the report says no level needs it. `src/tools/campaign.js` explains this; the trial's report then showed each world's rule first biting exactly where intended (fans at level 9, grumps at 17, reserved seats at 25).
- **Cache slow reports.** A `tests/report.mjs` that re-solves every level took about 5 to 6 minutes and looked like a hang inside `vly release`; cache solver results in a file keyed by the level data. (`vly release` now says it is running the report and notes when it took over 30 seconds.)
- **Leave menu rows a blank line apart** if you build your own menu: the 5 x 7 font makes adjacent rows touch.

## 7b. Too easy is a failure too (calibrating for your audience)

A puzzle that nobody can fail is not a puzzle. One trial's word game passed every fairness check and its owner's verdict was "way too easy: any human that can read will never fail" (a player only had to find the next word in a run-on line). Fairness and difficulty are different axes: *fair* means the answer is findable and unique; *hard* means finding it takes insight, not just attention.

- **Decide your audience and say so in `DESIGN.md`.** A game for adults who like puzzles can ask for insight, lateral thinking, working through a clue, deduction or knowledge; a game for children cannot.
- **Look for the "aha", not the lookup.** A good puzzle has a moment where the player sees a thing differently (a clue read another way, a pattern noticed, a constraint combined with another). If the answer comes from scanning and matching, it is a task, not a puzzle.
- **A solver can measure easiness.** Count how many candidate answers survive each clue or constraint, how many steps the player must hold in their head, and how many wrong leads are plausible. If every step has one obvious candidate, it is trivial.
- **Ramp to a hard end.** Early puzzles teach and reassure; middle ones combine ideas; the last ones should make a good player stop and think, and some players should need the hint system. Keep the finale fair (one answer, a clue that justifies it) but demanding.
- **Hints are what make a hard game kind.** Layered hints (a nudge, then a stronger nudge, then the answer) cost the player something small (a grade, a counter) and are always available, so a hard puzzle is a challenge and not a wall.
- **Test with the right model of a player:** not "can read", but "competent and stuck". Ask: what would stop a clever adult for five minutes here, and what gets them unstuck?

## 8. Word games (where words come from, and how to keep them fair)

A word game needs a word list, and the list is a design decision with legal and quality sides. Patterns from a trial that worked (a game where you cut a run-on ribbon of letters into words; 128 ribbons; every piece that is a real word lights up):

- **Decide where the words come from, and say so in `DESIGN.md`.** The safest source is a list you write yourself from general knowledge (a few thousand everyday words is plenty). A public word list (a Scrabble-style dictionary) is useful as a *checker at build time* (is every word you list spelt right and real?), but its licence may be unclear: if you cannot find a licence text you can verify, do not ship it inside the cartridge and say you could not verify it. The shipped data should hold only what you wrote or can legitimately redistribute.
- **Keep the dictionary out of the cartridge.** The cartridge is at most 1 MB and has no network. Store per-puzzle data instead (in the trial: 128 records of 64 bytes holding the letters, the answer and a small table of which substrings count as words, 8 KB in one bank); `vly docs language` has banked records.
- **Make it fair: one reading.** If the player must find *the* answer, prove the puzzle has exactly one. In the trial a ribbon was admitted only if its unspaced letters split into words of the *whole* public dictionary in exactly one way (a dynamic-programming count), so "everything lit" can only be the intended answer. Real words that are not on your common list should stay unlit, so limit them by listing the dictionary words found inside your puzzles and adding the common ones.
- **Keep it appropriate for everyone.** Keep a block list of words you would rather not show, read every puzzle and phrase yourself, and say in `DESIGN.md` that one author's judgement is not a review. Template-generated phrases ("a seed and a dove") can be harmless but meaning-light; authored ones are better.
- **Never make the player type.** Arrows plus A and B are comfortable on a phone; a letter-picker is slow. A puzzle where the verb is *cut, join, swap or pick* (a few presses per word) feels better than one that asks for spelling. In the trial a typical ribbon took 2 to 6 presses early and about 12 to 19 late, and undo was one press.
- **Give live feedback.** Showing the player the truth about every piece they make (it lit, it did not) replaces guess-and-check with deduction. A deliberate trap (a real word that lights up and strands the rest) creates a decision: trust the light or undo.
- **Teach in the first screen.** The title screen can be the tutorial (the sample ribbon cutting itself), then a one-screen how-to of pictures, then a first puzzle that cannot go wrong.
- **Prove it three ways.** A report over every puzzle (one reading, every word on both lists), a bot that plays the real cartridge with button presses from the title to the end, and a fuzz test (random cuts, undos and hints, comparing the cartridge's memory with a model that knows only the phrase and the word list).

## 9. Story-driven puzzle games (when the story is the hook)

A trial asked for "a puzzle game that is like a really good book" and produced a courtroom mystery where each puzzle's answer is a plot fact (6 chapters, 17 puzzles, 205 story pages, about 3,600 words, 75 to 100 minutes). Patterns that made the story and the puzzles one thing:

- **Make the puzzle verb the story's subject.** The protagonist was a court interpreter and the puzzles were translating an invented language whose grammar (an ending saying how the speaker knows what they say: saw, was told, infer) was also the evidence in the mystery. The twist lived in verb endings. When the mechanic and the plot are the same idea, the player cannot skip the puzzles and still understand the story.
- **Every answer is a plot fact.** BOAT left, SAND not iron, ABOARD, the hatch barred from OUTSIDE. A solved puzzle should change what the player knows, not just open a door.
- **Give every puzzle type a story reason.** Cryptic clues were a married couple's letters in a crossword code; the vowel-less telegram was a company cable; the acrostic was a cowardly mentor's one safe warning. Wordplay with no reason in the world feels pasted on.
- **Plant, then pay off.** An unexplained detail in puzzle 1 (a suffix) pays off in puzzles 3 and 4; a pencilled card pays off in a margin; a flinch at English words sets up the character's secret. List your setups and payoffs in `DESIGN.md`.
- **End each chapter on a question.** Raise questions faster than you answer them, and let the last line of a chapter ask the next one.
- **A production puzzle is a great climax:** make the player *speak* (build a sentence) and refuse to claim something they did not earn, so the ending is something they do, not read.
- **Prove the puzzles the way the guide says:** enumerate the hypotheses a player could hold and count how many survive each example (the trial's translation puzzles went from thousands of candidate answers to one by the last example); for wordplay, count the dictionary words that fit (for example 1 word of 33,192 begins BON and ends FIRE) and write a reply for each plausible wrong answer. A solver measures *fairness*, not enjoyment; say so.
- **Respect the reader's memory:** a notebook (words learned, case notes) one press away, a "last time" recap when the player continues, saves at every puzzle and chapter, and a hint ladder (a nudge, a stronger nudge, the answer) that costs only a counter.
- **Budget the words.** An 8-line by 18-column page holds about 130 characters, so a first draft was 2.5 times too long. Plan chapters in pages, write economically, and let the pictures (nine scene pictures here) carry mood.
- **Shape the difficulty curve on purpose.** The trial's guess of minutes stuck per puzzle rose from half a minute to about ten, but not monotonically: a run of easier puzzles after a hard one, a jump in kind at a chapter change, and a gentle last puzzle after the climax. Say that your minutes are an author's guess, not human data.
- **Say what is unverified:** whether the prose lands, where a clever adult really gets stuck, and whether the invented words coincide with real ones.

## Sources and honesty

This guide comes from our own trials (a 63-level folding puzzle, a 128-ribbon word game and a 17-puzzle story game, each built by an assistant from the other guides), from the puzzle-design ideas already cited in `ref-originality` (Braid, Baba Is You and Inside teach by level design; we read tool-made summaries) and from `ref-levels` (the four-beat structure). We did **not** do fresh web research for this guide. The measurements (par routes, dead ends, random win rate) are a proxy: the trial measured no human players, so whether the early worlds are too easy and the late ones fun is unknown. The thresholds and readings here are our interpretation.
