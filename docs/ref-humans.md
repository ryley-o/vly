# Reference: designing for human reaction time, attention and thumbs

Read this whenever a player must react, time a press, read several things at once or plan ahead: any action, arcade, rhythm or timing game, and any puzzle with a clock. It is a reference guide to the design playbook (`vly docs design`). The playbook says a game must be fair; this says what a person can actually do in a fraction of a second, so you can design for people and not for bots.

**Quality bar:** at every moment a player can answer "what do I do next?" at a glance; a cue that must be reacted to gives enough time to react; timing windows are wide enough for a person on a phone; a hard game is hard because of a decision, not because of a reflex nobody has; and a stranger, not a bot, has played it.

A trial (a stone-skipping arcade game, `vly docs ref-arcade`) passed every bot check and still felt brutal to its owner: "very difficult to control or anticipate what to do next". Its bots had perfect information and only noisy timing; a person has neither. This guide is the fix.

## 1. The numbers (and how sure we are)

(Sources at the end. **[S]** a source we read; **[C]** commonly cited, not checked here; **[I]** our inference.)

- **Simple reaction time** (one cue, one response, you are ready): about **190 ms to a light and 160 ms to a sound** for young adults **[S]**; another summary gives about **220 ms** **[S]**. Tired, distracted or older players are slower. Use 200 to 250 ms as the floor, not the average.
- **Choice reaction time** (several possible cues or responses): adds roughly **100 to 300 ms** **[S]**, and grows with the number of options (Hick's law: time grows with the logarithm of the number of choices; each doubling adds a roughly constant amount) **[S]**. Practice flattens this, but only after a lot of it.
- **Input and display latency** adds to all of it: one practitioner measured **60 to 100 ms** on a console **[S]**; touch screens, TVs and wireless controllers vary. **[I]** Assume a phone adds tens of milliseconds you cannot see.
- **Working memory** holds only a few things at once (about **four chunks** **[C]**). **[I]** Do not make a player track more than three or four moving things, rules or states, and make the state visible so they do not have to remember it.
- **One frame is 16.7 ms.** **[I]** A timing window of 2 or 3 frames (33 to 50 ms) is below what most people can hit blind; it is fine in a game whose rhythm the player can *anticipate* and calibrate, and brutal in a game that makes them *react*.
- **Rhythm-game windows are a design choice, not a standard** **[S]**: examples are about 45 ms for the best grade and 90 ms for the next; one dance game uses -32/+96 ms; windows are often defined as a fraction of the beat; and most rhythm games ship a latency calibration screen because audio, display and input delays differ.

## 2. React or anticipate? Decide which game you are making

- **Reaction:** something appears and the player must respond. The honest budget is reaction time plus a choice plus latency: **about 0.3 to 0.5 seconds** from the cue becoming visible to the response being needed, more if there are several possible responses. A cue that gives 200 ms or less is a reflex test, and it is unfair on a phone.
- **Anticipation:** the player knows when it will happen (a beat, a rhythm, a pattern they learned) and can time the press to it. Windows can be much tighter, because the player is not reacting, they are predicting. Rhythm games and platformer jumps live here.
- **Make the type obvious.** A game that *looks* like anticipation but is not (the next event's timing changes with the player's last choice, so the pattern cannot be learned) feels unfair: the trial's hop length depended on the skip type chosen, so the next ring closed at a time that changed with every choice.
- **Telegraph attacks and hazards early and consistently** (`vly docs ref-levels`, "Telegraph and be fair"); a telegraph that gives no time to react is useless **[S]**.

## 3. Reduce what the player has to decide, and when

- **One decision per beat.** If the player must pick among three options *and* time the press, that is two skills at once. Give choices in calm moments and timing in busy ones, or make one of them automatic.
- **Fewer options is faster.** Each added option costs time (Hick). Offer two or three, with a sensible default, and make the right one obvious from what is on screen.
- **Show what is coming.** A lane that scrolls toward you, a ring that closes, an enemy that winds up: the player needs to see the next thing *before* they have to act, ideally half a second or more before. Hide nothing the player needs to plan with.
- **Make the answer to "what do I do next?" readable at native size** (160 x 144, four colours, HUD visible). If you have to study the screen to know the next action, it is too much.
- **Keep patterns learnable.** A pattern that repeats lets players chunk it into muscle memory over several tries **[S]**; a pattern that changes with every choice never lets them.

## 4. Forgiveness that costs nothing in quality

Patterns that make a game kinder without making it dull (the platformer guide has Mario's versions):

- **Input buffering:** accept a press a few frames *before* it is legal and act on it when it is. **Coyote time:** accept a jump a few frames after leaving a ledge.
- **Generous hit boxes and a tight look:** the area that hurts is smaller than the sprite; the area that helps (a catch, a hit) is larger.
- **Two window sizes:** a wide "good" and a narrow "perfect", so the average player succeeds and the keen one is rewarded.
- **Calibration** for anything audio- or timing-critical (`std/flow`; `games/fret-rush` has one), because the player's phone and speakers add delay you cannot measure.
- **Failure that teaches:** a stuck or lost state should say why in a second and let the player retry at once.
- **Ramp up:** start slow and give the player a stretch where they cannot lose.

## 5. Measuring with bots, honestly

`vly docs workflow` has the bot kit. A bot is a tool for finding impossible or broken things, **not** a model of a person:

- A bot that **knows the future** (it plans from your solver) is not reacting; it only has timing noise (`humanize` adds that). It tells you the game is *survivable*, not that a person can anticipate it.
- To model a **reactive** player, give the bot a **reaction delay** that matches your cue: `runBot({ delay: 12 })` reads state as it was 12 frames (200 ms) ago, and `delays` sets per-variable delays. Try 12, 18 and 24 frames. If only a bot with zero delay survives, the game is a reflex test.
- Report the **ladder** (oracle, noisy, delayed, naive) and say what it cannot show: confusion, the cost of choosing, thumb comfort, what a first-time player understands.
- **The real test is a person.** Watch one try the first minute: where do they hesitate, press the wrong thing, say "what do I do?" (`vly docs design`, "Three kinds of evidence").

## 6. A checklist before you call a timing or action game fair

- [ ] Is it a reaction game or an anticipation game, and does the timing budget match (0.3 to 0.5 s per reaction, tighter only for anticipation)?
- [ ] Can you point at the next action from one screenshot, with the HUD?
- [ ] One decision per beat, at most three or four things to track?
- [ ] Is the next event's timing the same every time, so it can be learned?
- [ ] Wide "good" window and narrow "perfect"; buffering; calibration if audio matters?
- [ ] Does a bot with a 200 ms reaction delay get somewhere, and does a person?
- [ ] Is retry instant and is a failure understood?

## Sources and honesty

Read through a search tool (summaries, not full texts): a Nottingham psychology page and a psychology-toolkit page on simple and choice reaction times and Hick's law; a university teaching file on factors affecting reaction time (about 190 ms to light, 160 ms to sound); the Harvard BioNumbers page on reaction time (about 220 ms simple, 384 ms recognition); a Game Developer breakdown of a Dark Souls 3 attack (the Model Human Processor; a practitioner's 60 to 100 ms input-latency test; a wind-up shortened to under 340 ms); Game Developer pieces on telegraphing and difficulty readability; community pages on rhythm-game judgement windows (45/90 ms as an example, a dance game's -32/+96 ms, windows as a fraction of the beat, latency calibration). The working-memory figure of about four chunks (Cowan, 2001) is commonly cited and was **not** checked. The 0.3 to 0.5 second reaction budget, the frame arithmetic and the advice are our own synthesis. We did not run a human study.
