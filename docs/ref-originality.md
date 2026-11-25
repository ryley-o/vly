# Reference: inventing an idea that is yours (a mechanic that is simple, elegant and tied to the story)

Read this **before** you choose what your game is, and again when a play-tester says it is "fine but familiar". It is a reference guide to the design playbook (`vly docs design`): the playbook says a game must be your own; this says how to get there.

**Quality bar:** a player can say in one sentence what is special about your game; that idea shows up in *every* level, not only the first; and the mechanic, the story, the look, the sound and the way the game is structured all pull the same way. If you removed the story, the mechanic would still feel odd; if you removed the mechanic, the story would lose its meaning.

## 0. How to use this guide (and how not to)

This guide is scaffolding for your thinking, not a template. **Every example in it is used up: do not build any of them.** If your game ends up with the same shape as an example, you followed it too literally. The same goes for the reference guides on movement, levels, power-ups and structure: they teach *craft*, and your idea decides what the craft is used for.

Two things we saw in our own trials, so you can avoid them:

- **The first-idea trap.** Assistants reach for the same ideas: a clock or gears, a lantern or lamplighter, day and night, a small fox, cat or mouse, crystals, space. A study of language-model brainstorming (Kumar et al., arXiv 2602.20408; we read a tool-made summary, not the full paper) reports that model ideas are less varied than human ones, that a model fixates on its own early ideas inside one session, and that what raised variety most was writing many short titles and then rewriting each to be bolder, and assigning ordinary, different personas; raising the sampling temperature barely helped. **Treat the first theme and the first mechanic that come to mind as used up.**
- **The gimmick that never reaches the levels.** One trial game had a lovely idea (every jump flips the world between two kinds of blocks) and then built levels that barely used it: long open ground, a lone repeated enemy, jumps with nothing at stake. An idea is only as good as the levels that explore it (section 5).

## 1. What a good core mechanic is

- **Simple to say.** "Press A to ___, and the world ___." If it needs two sentences, it is probably two ideas; keep the stronger one.
- **Intuitive.** The player can discover it in the first screen with no words, from what they see and what happens when they try (Inside and Portal teach with the level, not with text).
- **Elegant.** A few rules, and lots of different situations come out of them. The player can invent uses you did not plan.
- **Visible.** The state of the rule is on screen at all times (a colour, a shape, a meter). Hidden state is where players feel cheated.
- **Consequential.** It has a cost, a side effect or a catch that can be turned into a hazard (see the twist in section 5). A power with no downside makes levels trivial.
- **Cohesive.** It is what the character *does*, and it is also the story's central metaphor. The ending should change what the verb means.
- **Flowing.** A great idea can still feel fussy if the verb has friction. Patterns that give a verb a calm, repeatable rhythm: it can be used again at once or after a wait the player can *use* (not idle through); the thing you throw, place or swap can be called back or recovered with one press, so a missed attempt costs a beat and not a trip; a failed attempt gives a clear, gentle answer (a soft sound, a bounce) rather than a punishment; success has a small satisfying signature (a sound that rises, a flash, a settle); and chaining the verb is a pleasure in itself. Patterns that break flow: waiting for a cooldown with nothing to do, long walks to retrieve what you used, ambiguous failures. Measure the loop before and after you change it (frames from action to result, presses to chain three uses, how long the player's hands are empty, how often the object is off screen); in one trial the real frictions were a silent verb and an object off screen, which only showed up when measured (`vly docs workflow`, "Revising a game you already shipped"). In one trial, players loved a throw-and-trade mechanic but did not reach a calm flow, and a recall on a button was the first thing they reached for: watch for where a player *wants* a shortcut, because that is the friction.
- **Few buttons.** Arrows plus A and B. A mechanic that needs three more buttons is not elegant on this hardware.

## 2. A process that works (do it in `DESIGN.md`, do not skip the steps)

1. **Write the feeling and one true thing.** One line: how should the player feel (clever, lonely, mischievous, hunted, calm)? One line: the most *specific, odd, true* fact about the setting you picked. Not its famous symbol: its everyday detail (what does a dye-worker, a lighthouse keeper, a bee-keeper, a night-market porter actually touch and carry all day?).
2. **Force diversity before you write ideas.** Ban your first three themes and your first three objects. Draw two random constraints (pick from a verb list; one physical rule to bend; "one button only"; "no jumping"; "the hero cannot attack"). Imagine three different people proposing the game (a fisherman, an accountant, a toddler, a sound engineer) and take ideas from each.
3. **Write at least ten ideas as five-word titles, then rewrite each one bolder.** Use generators: a verb list (push, carry, swap, stack, shrink, hush, follow, borrow, trade, forget); *rule mutation* (flip gravity, make something expensive, make the floor remember where you stepped); *the world reacts* (what if enemies copy your last move?); *fuse two verbs*; *reverse a convention* (the goal is to lose weight, to be seen, to be last); *theme first* and *mechanic first*.
4. **Filter with the tests in section 4.** Score each idea 0 to 2 per test; keep the top three.
5. **Prove depth: write five level ideas for each survivor,** in this order: a safe introduction; a development with a hazard; **a twist where the mechanic's side effect is turned against the player**; a combination with terrain or an enemy; a conclusion in a different place or setting. **Drop any idea whose five levels are "the same thing with more spikes".**
6. **Tie it to the story.** The mechanic is the character's action *and* the story's metaphor. Decide what the ending does to the meaning of the verb (the hush you used to sneak becomes the silence you choose; the thing you carry stops being a burden).
7. **Check novelty.** Name the three closest games you know. List what you share, then change **at least two** of: the verb, its consequence, the structure, the setting. If you cannot name a neighbour, say so in `DESIGN.md`, and look again.

Worked examples of the *method*, with invented themes. **They are used up: do not use them.**

- *A dye-works town; the verb is bleed.* Colours soak into neighbouring tiles, which a four-shade screen shows clearly. Level ideas: (1) one drop teaches spreading; (2) a wall that dissolves when the shades match; (3) twist: your own sprite changes shade; (4) a maze that is solved shade by shade; (5) the finale cleans the river. Story: the pollution is your own trail.
- *A sleepwalker's mother searching a house at night; the verb is whisper.* Holding a button quietens the world and freezes sleeping furniture that is dangerous when awake. Rooms alternate quiet and loud.
- *A tide-pool crab; the verb is borrow a shell.* Each shell changes jump arc, weight and what can be pushed.

## 3. Be original in several facets, not one

Originality is multi-faceted. List the facets, and make **at least three** of them yours, in ways that reinforce each other:

| Facet | Questions |
|---|---|
| Mechanic | What does the character do that other games' characters do not? |
| Structure | Is it a line of stages, a map, a hub, a loop, one long level, rooms? (`vly docs ref-worlds`) |
| Camera / perspective | Side view, top-down, a view that rotates, a single screen, a camera that is part of the rules? |
| Art direction | A palette per place, a signature shape language, a look nobody has used (a world of paper, glass, wax, sound)? |
| Sound | Does the music respond to the rule? Silence as a tool? An instrument per place? |
| Tone | Funny, tender, eerie, quiet, strange? |
| Story form | A letter, a journey, a mystery assembled from objects, a conversation, no words at all? |
| Input | An unusual use of the same buttons (hold to listen, tap to answer)? |

Real examples (from the sources below): *Return of the Obra Dinn* started from a one-bit look and found its mystery mechanic late, and the look, the mechanic and the tone fit; *This War of Mine* started from the emotion it wanted (loss) and fitted mechanics, withheld rewards and plain symbolic art to it; *Baba Is You* makes its rules into objects and its world map into a level. **Pick one anchor facet, then require two others to change in ways that reinforce it.** A mechanic about silence wants sparse music, a near-monochrome look and a structure of short nights.

## 4. The elegance tests (a checklist; score your top ideas)

- [ ] **One-sentence test:** "Press A to ___, and the world ___."
- [ ] **No-words test:** a player could learn it on the first screen without reading.
- [ ] **Catch test:** it has a side effect or cost that can become a hazard.
- [ ] **Five-levels test:** five distinct levels exist (not five reskins).
- [ ] **Invention test:** a player could plausibly use it in a way you did not plan.
- [ ] **Few-buttons test:** at most arrows plus A and B, and the rule is visible on screen.
- [ ] **Every-object test:** every enemy, block and item reacts to the rule or is deliberately immune, and the exemptions are visible.
- [ ] **Theme test:** remove the story and the mechanic still feels odd; remove the mechanic and the story loses its meaning.
- [ ] **Novelty test:** two named neighbours, and you changed two or more facets.
- [ ] **Dressing test:** would you still like it if the clock, lantern, gear or space dressing were removed?

## 5. The mechanic must live in the levels

Great mechanic-led games get their levels *from* the mechanic (Braid's worlds each explore one idea to its consequences; Baba Is You starts with the obvious levels for each new word, then works backwards from the most interesting interactions). So:

- **Derive the levels from the idea; do not place the idea in levels.** Ask of every screen: *what does the rule do here?* A screen where the rule does nothing is a dead screen, however pretty.
- **Explore, develop, twist, conclude** (`vly docs ref-levels`): each world turns the rule a new way. World 1 uses it plainly; world 2 pairs it with a hazard; world 3 makes it dangerous (the side effect works against the player); world 4 combines it with the terrain; the last world changes what it means.
- **Give the idea a cost and a counter.** Something the rule cannot do, or something that undoes it, so the player has to think and not only repeat.
- **Follow the consequences.** Test the rule against every object in the game (enemies, hazards, springs, doors, pickups). Where it produces something surprising, build a level around it.
- **Keep the rules consistent** so a surprise feels earned, and avoid two mechanics that overlap: the player cannot tell which one you meant.

## 6. Anti-patterns

- A gimmick that never touches level design.
- Novelty for its own sake: a mechanic with no tie to the story.
- Copying a famous game's *look* (see `vly docs ref-sidescroller`, section 0, for Mario: borrow the feel, never the furniture).
- Two overlapping mechanics, or a spammable one-button input with no constraint.
- The first-idea trap (section 0), and the stock set dressing (clocks, lanterns, gears, space).
- A story pasted on after the mechanic is done: the story chooses the art, the music and the structure, so decide it first.

## 6b. When the brief is "wow" (a trial that chose its own idea)

A fresh agent told to surprise people chose a delayed-echo puzzle: a clever rule, an exhaustive solver, 30 proven levels, and a screen that was a small plain board with a staff of notes underneath. Everything about it could be checked by a program, and it was a good puzzle, but nobody would stop and stare. Agents drift toward ideas they can verify by number, because the tools reward that. A "wow" has parts a solver cannot score, so plan them on purpose:
- **Something moves that should not**: scale (a giant boss, a screen-filling effect), a transformation (the world rotates, floods, shatters, changes palette), many things at once (a swarm, a crowd, a fluid), or a sudden change of verb. Motion is what a still screenshot hides.
- **The screen is the instrument**: use the whole 160 x 144, layers that scroll at different speeds, palette cycling, sprite tricks and screen shake (see `ref-genres` for each kind of game) instead of a small centred board.
- **Sound and picture are one event** (the echo game had this part right: every step is a note).
- **One thing a person will describe to a friend** in a sentence: "the enemies are my own recorded ghosts", "the level is a song". Write that sentence in `DESIGN.md` and check that the screen shows it in the first ten seconds.
- **A first minute that hooks without reading**: title, instructions by picture, first success in under thirty seconds.
Puzzles are fine; choose a puzzle because you want one, then give it a presentation that is not a tiny board.

## 7. What to write down

In `DESIGN.md`, before you code (and `vly check` prints it back): the one-sentence mechanic; the feeling and the one true thing; ten titles and the three survivors with their scores; **five level ideas for the chosen one**; what is borrowed from a classic's feel; the facets you made your own (at least three) and how they reinforce each other; the three closest known games and what you changed; and three things in this game that no game you know has.

## Sources and honesty

Read through a summarising fetch tool (so these are summaries of the pages, not verbatim text): Game Developer on Jonathan Blow's puzzle design process and on Braid; Game Developer on Baba Is You's design; Game Developer on Inside's teaching through level design; the Engadget piece on Super Mario 3D World's four-step design and the Game Developer Suzy Cube breakdown (the four beats; kishōtenketsu); Game Developer on This War of Mine's emotional tuning; Game Developer on Return of the Obra Dinn; Nintendo's Ask the Developer interview on Super Mario Bros. Wonder; a secondary summary of Jesse Schell's Lens of Unification; arXiv 2602.20408 on idea diversity in language models (first 100,000 characters read). Not read or not obtained: Game Maker's Toolkit videos (blocked), Schell's and Koster's books (secondary notes only), Celeste's GDC talk. The process in section 2 is our own synthesis; the worked examples and the numbers are ours.
