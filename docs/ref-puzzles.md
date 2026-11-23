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

## Sources and honesty

This guide comes from our own trials (a 63-level folding puzzle and a 128-ribbon word game, each built by an assistant from the other guides), from the puzzle-design ideas already cited in `ref-originality` (Braid, Baba Is You and Inside teach by level design; we read tool-made summaries) and from `ref-levels` (the four-beat structure). We did **not** do fresh web research for this guide. The measurements (par routes, dead ends, random win rate) are a proxy: the trial measured no human players, so whether the early worlds are too easy and the late ones fun is unknown. The thresholds and readings here are our interpretation.
