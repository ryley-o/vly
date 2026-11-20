# Reference: power-ups and abilities (what makes a mushroom feel elegant)

Read this when your game gives the player anything to pick up or earn that changes what they can do. It is a reference guide to the design playbook (`vly docs design`): the playbook says a full game has power-ups; this says what the best ones were made of, how Mario's actually work, and how to invent your own that fit your game.

**Quality bar:** the player can say what each power-up does in five words ("lets you shoot", "makes you tough", "you can't be hurt for a while"); the character *looks* different while it is active; the level was built to make the pickup unmissable the first time and rewarding to use afterwards; and there are few of them, each with a cost or a counter. A pickup that changes only a number is not a power-up.

An observer who played AI-built platformers missed "elegant power-ups like mushrooms and stars in Mario". The classic set is small, readable and tightly tied to the hit rules; learn why it works, then make something that is not a mushroom.

## 1. Principles

(**[F]** from a primary source or the SMB1 disassembly; **[O]** analysis; **[I]** our inference. Sources at the end.)

1. **A power-up is a verb or a state you can feel at once.** **[F]** Mushroom: taller, can break bricks, can take a hit. Fire flower: shoot. Starman: touching enemies kills them, and nothing hurts you. If the player cannot feel the change in the first second, it is not a power-up.
2. **The hit-point buffer is the power-up.** **[F]** Being hit when big turns you small (with brief invulnerability) instead of killing you, and a fire-powered character also drops to small, not to "big". **[I]** An extra hit of health that is *readable on the sprite* needs no HUD and teaches itself.
3. **Teach by play, not by text.** **[F]** In World 1-1 the first power-up item is arranged so that you cannot easily avoid it: the blocks box you in, it moves towards you, and if you miss it it bounces off a pipe and comes back. The designers said the item was tuned to be satisfying to chase.
4. **Introduce it in a low-risk space, then layer.** **[F]** In Super Mario Bros. 3 the leaf is first offered in a safe, flat area, with two early chances to get it, and only later do obstacles need the tail.
5. **Trade-offs make a power-up interesting.** **[F]** The Frog suit is strong underwater and clumsy on land; the Hammer suit is rare and offensive; swapping suits can open a different route. A power with no weakness makes levels trivial.
6. **Abilities as keys.** **[F]** In Super Metroid a new ability is taught in a room that needs it, areas are shown but out of reach, and every ability opens shortcuts back through the map. (Structure: `vly docs ref-worlds`.)
7. **Pay off beyond the lock.** **[F]** Zelda items were criticised for working in one dungeon and then being forgotten; the fix is to let abilities interact with the world and with each other.
8. **Budget the choices.** **[F]** Hollow Knight's charms cost "notches", so the player cannot carry everything; Wonder's team cut its badge prototypes from more than 50 to about 20. **Fewer, stronger, more distinct** beats many overlapping.
9. **Powers can come from enemies.** **[F]** Kirby copies an ability by swallowing an enemy; Mega Man takes a boss's weapon, which is a weakness against another boss.
10. **Mario's mushroom grew out of playtesting.** **[F]** Its role as the "good item" was not in the first plan, and having the character grow only part-way through the game also came from testing. Build, play, adjust.

## 2. How Super Mario Bros.' items actually work (read from the disassembly)

**Verified in the annotated source** (doppelganger's `SMBDIS.ASM`; we read the routines and the timer table ourselves):

- **Three forms:** small (0), super (1), fiery (2). A `?` block marked as "mushroom or flower" gives a **mushroom if you are small and a flower if you are super or fiery**, so you never receive a useless pickup. Touching it: +1000 points, a pickup sound, small to super, super to fiery, fiery stays fiery. Growing or shrinking briefly freezes the game's timers.
- **Being hit:** small Mario dies. Otherwise the form becomes small, an injury timer of 8 starts, a "hurt" sound plays, and contact does nothing while the timer runs. That timer counts down once every 21 frames, so it lasts **8 × 21 = 168 frames, about 2.8 seconds**.
- **The starman:** the star timer is set to 35 and the star music starts. It counts down on the same once-per-21-frames tick, so the star lasts **35 × 21 = 735 frames, about 12 seconds**. The character's palette cycles fast while the timer is above 8 and slower below it, and the level music returns when it reaches 4 (the last few seconds are the warning). While it runs, every enemy you touch is killed as if hit by a shell, and fire bars and hammers do not hurt.
- **How an item appears:** it is born inside the block, drawn behind it, rises 1 pixel every 4 frames until it has cleared the block, then acts. A **mushroom walks** like an enemy and turns at walls; a **star bounces** as it travels; a **flower stays put**.
- **Small Mario cannot break bricks; big Mario can.** The form is a verb, not only health.

**From fan and secondary sources (not verified by us):** the hidden 1-up block in 1-1; fire Mario holding two fireballs on screen; some enemies resisting fire; the mushroom's walking speed (sources disagree whether it equals Mario's walk or is a little slower).

**What this teaches:** a handful of states (a form number and a timer), one hit rule, one spawn rule, and a visible change. That is the whole system.

## 3. Inventing your own (a process)

1. **Name your core verb** (jump, swim, swing, flip, whisper). Your power-ups should *change that verb*.
2. **For each power-up pick one change to the verb:** extend it (jump higher, further, twice), invert it, exploit it (the thing your mechanic does, but bigger), or add a second verb to it (jump plus shoot).
3. **Give it a visible state and a cost:** a different sprite or palette; a timer, an ammo count, a weakness, or something it cannot do (a fire flower cannot break bricks, a shell makes you slow).
4. **Pick one level shape that rewards it and one that blocks it:** a gap only the double jump crosses, a wall only the shell survives; a cave where the power makes things worse.
5. **Sketch its first appearance:** safe, alone, impossible to miss, with a visible reason to use it right there.
6. **Decide the hit rule:** what does a hit do to each form? (Mario: powered becomes small, small dies.) Is there a recovery (the lost power drops and can be picked up again)?
7. **Keep two to four:** a hit-point buffer, one that changes what you can do, one temporary power fantasy (a star-like burst), and perhaps a reward for exploration (an extra life, a key). More than that and they overlap.
8. **Tie them to the world and the story** (`vly docs ref-originality`): a power-up is a thing from *your* world, with a reason to be there, not a mushroom with a new colour.

Example sets, to show the *method* (they are used up, do not use them): a deep-sea robot, with ballast (sink fast and walk the sea floor, break floors; cannot float), sonar (reveals hidden blocks for a few seconds, drains over time) and a pressure shell (a short invincible rush that costs your steering); a house of wind-up toys, with a held charge for a long dash, "slow hands" (enemies at half speed for six seconds) and a spare coil (one stored extra hit); a ghost garden, with a lantern (its light reveals platforms and enemies shy from it), a wisp form (float through thin walls but cannot hit) and a seed shot that grows a platform.

## 4. Beyond pick-ups

- **Abilities as keys** (Metroid): new abilities open parts of a map you have already seen. Design the first room that needs it so the player learns it there.
- **A loadout with a budget** (Hollow Knight's notches): the player chooses a few from many; the choice is the fun.
- **Enemy as source** (Kirby, Mega Man): defeating something gives its power; the order of fights matters.
- **Transformations with trade-offs** (Mario 3's suits).
- **One verb, explored deeply** (Celeste's air dash, refilled by landing or a gem): the level design carries everything, and no pick-up is needed.

## 5. A simple implementation

One variable for the form, one for a timer, one hit rule, one spawn rule, one visible change (this builds with `std/platformer`; `pl_inv` and `pl_hurt()` are its blinking invulnerability, 168 frames):

```
import "std/platformer";
var form;            // 0 small, 1 big, 2 special: the sprite and the abilities follow this
var star_t;          // frames of "nothing can hurt me" left (counts down once a frame)
var dead;
func take_powerup(kind) {                    // kind 0: mushroom or flower, 2: star
  if (kind == 2) { star_t = 735; return; }   // SMB1: about 12 seconds
  if (form < 2) { form++; }                  // small -> big -> special, never downgraded by a pickup
}
func hurt_player() {                         // call when pl_enemy says 2
  if (star_t > 0 || pl_inv > 0) { return; }
  if (form == 0) { dead = 1; return; }       // small dies
  form = 0; pl_hurt();                       // otherwise shrink and blink for pl_inv_max frames
}
func spawn_for_block() { return form == 0 ? 0 : 1; }   // the block gives the weakest useful item for the current form
func update_powers() { if (star_t > 0) { star_t--; } }
```

Draw the form with a different sprite or palette; flash faster as the timer runs low (SMB1 speeds the palette cycle down at the end and returns the level music); change the music while a temporary power is active.

## 6. Anti-patterns

- A pickup with no new verb and no visible change.
- A power that trivialises levels (no cost, no counter-hazard).
- Too many power-ups with overlapping uses.
- An item you can only use in one room.
- An item that is easy to avoid by accident: put it where the player cannot miss it the first time (the 1-1 corridor).
- Giving a second power with no cost when the player already has one (SMB1 prevents it by changing what the block spawns).
- Progress that is blocked unless you have a power you lost: give a way to get it back near the place that needs it.

## Sources and honesty

Read: the SMB1 disassembly (we checked the timers, the injury code and the item-collision code ourselves in `SMBDIS.ASM`); the Nintendo Iwata Asks on New Super Mario Bros. Wii (the mushroom); the Wikipedia entry for World 1-1; gamedev.net on Super Mario Bros. 3's level design (the leaf); Game Developer on Super Metroid's design and on Zelda's situational-item problem; Team Cherry's post on Hollow Knight's charms; Nintendo's Ask the Developer on Wonder's badges; Nintendo's Kirby Super Star developer interview; the Super Mario Wiki item pages (fan source). Seen only in search results: the Mega Man weapon-weakness analyses, SMB3 suit retrospectives, GMTK videos (blocked). Not obtained: Kondo on the starman music, Tezuka on the 1-up, SMB3 suit hit rules. The Mario timer durations (168 and 735 frames) are our calculation from the timer table and the 21-frame interval, which we verified in the source; the example power-up sets and the process are ours.
