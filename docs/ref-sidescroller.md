# Reference: side-scrolling platformers (the Mario recipe)

Read this when your game has a character that runs and jumps through a level that scrolls. It is a reference guide to the design playbook (`vly docs design`):
the playbook says *that* controls must feel good; this says *exactly how* the best one did it, gives you the numbers, and gives you a module that already does it.

**Quality bar:** the character should feel like Mario in World 1-1 within ten seconds of picking up the pad: it speeds up and slows down with weight, a tap hops and a held button soars, running
is a choice you make with B, you can steer a little in the air but not change your mind, you slide round a block's corner instead of bonking, and a jump over a pit is yours to judge.
If a play-tester says it feels "floaty", "sticky", "slippery" or "stiff", it is wrong and you fix it before you build levels on it.

## 1. The fast path: `import "std/platformer"`

```
import "std/platformer";

func pl_solid(x, y) {                       // YOU write one function: is the world pixel (x, y) solid?
  return tile_at(x >> 3, y >> 3) != 0;      // however your level is stored; return 1 for solid, 0 for air
}
func init() { pl_init(24, 96); }            // top-left of the 12 x 16 body, in world pixels
func frame() {
  pl_step(btn(BTN_RIGHT) - btn(BTN_LEFT),   // direction -1, 0, 1
          btn(BTN_B),                       // run
          btnp(BTN_A),                      // jump pressed this frame
          btn(BTN_A));                      // jump held
  if (pl_jumped) { sfx_play(SFX_JUMP); }
  if (pl_landed) { /* dust, thud */ }
  if (pl_bump) { /* a block was hit from below at (pl_bx, pl_by): break it, spit a coin */ }
  // draw your sprite at (pl_x - 2 - camera_x, pl_y); flip it when pl_face < 0
}
```

You still write: the level, drawing and animation, the camera, enemies and what hurts, blocks and pickups. `pl_step` does the movement and the collision, with the numbers below, in about 6,000 cycles at worst.
State you can read: `pl_x, pl_y` (whole pixels, top-left of the body), `pl_vx` (1/4096 px per frame), `pl_vy` (1/256 px per frame), `pl_face` (1 or -1), `pl_ground`, `pl_rt` (run timer).
Things to call: `pl_bounce()` when the character lands on an enemy; set `pl_vy` and `pl_vx` yourself for knockback or springs.
Knobs (set after `pl_init`): `pl_w`, `pl_h` (body size, default 12 x 16), `pl_coyote_max` (4), `pl_buffer_max` (5), `pl_nudge` (4), `pl_inset` (2). Set the first three to 0 for strict SMB1.

If you do not use the module (a different feel is a design decision, not a mistake), use these numbers anyway as your starting point and verify the same things (section 8).

## 2. The numbers (Super Mario Bros., NTSC, 60 frames a second)

From community documentation of the original game's code (doppelganger's disassembly as summarised by the SMBpedia "Movement" article and the SMB physics research notes; see the sources at the end). Units: pixels and frames.

| What | SMB1 value | In `std/platformer` units |
|---|---|---|
| Top walking speed | 1.5 px/frame | `pl_vx` 6144 (1/4096 px) |
| Top running speed (B held) | 2.5 px/frame | 10240 |
| Walking acceleration | 0.0371 px/frame² (about 40 frames to top walking speed) | 152 per frame |
| Running acceleration | 0.0557 px/frame² | 228 |
| Letting go: friction | 0.0371 (walking), 0.0508 (at run speed) | 152 / 208 |
| Skid (pushing the other way) | twice the acceleration: 0.0742 / 0.1016 | 304 / 416; under 0.69 px/frame the character turns on the spot |
| After B is let go | run speed is kept for 10 frames, then snaps back to walking speed | `pl_rt` counts 10 down |
| In the air | same acceleration; no input keeps the speed; B does nothing; the run speed set on the ground persists | |
| Jump speed (rise) | 4 px/frame below 1.56 px/frame of speed, 5 px/frame at or above it | -1024 / -1280 (1/256 px) |
| Gravity rising, A held | 0.125 px/frame² (slow) and 0.156 (fast jump) | 32 / 40 |
| Gravity falling, or A let go while rising | 0.4375 px/frame² (slow), 0.5625 (fast jump) | 112 / 144 |
| Top falling speed | 4 px/frame (the source is not exact here) | 1024 |
| Head hit | starts falling at 1 px/frame | `pl_vy = 256` |
| Bounce on an enemy | -4 px/frame whatever the buttons | `pl_bounce()` |
| Body | 12 px wide, 16 high (small Mario); blocks are 16 x 16 | `pl_w`, `pl_h` |

What those numbers mean in play (measured on `std/platformer`, so you can check yours against it):

| Jump | Height | In the air | Distance |
|---|---|---|---|
| Standing, A held | 62 px (about 4 blocks) | 51 frames | 0 |
| Walking, A held | 67 px | 56 frames | 84 px (5 blocks) |
| Walking, A tapped | 23 px (a block and a half) | 21 frames | 32 px |
| Running (B), A held | 78 px (about 5 blocks) | 54 frames | 135 px (8 blocks) |
| Running, A tapped | 24 px | 18 frames | 45 px |

## 3. Why it feels like that (the magic, one idea at a time)

1. **Two gravities, one button.** Rising with A held the character is light (0.125); the moment A is let go, or the apex passes, gravity jumps to 3.5 times that. That single switch is the variable jump: a tap is a hop, holding is a soar, with no special-case code, and the fall is quicker than the rise, which reads as weight. Do not cut the speed on release instead (it feels like hitting a ceiling) and do not make gravity constant (it feels like the moon).
2. **Speed is momentum, in both directions.** 40 frames to reach full walking speed means the character has to be *driven*: you plan a stop. The skid (double deceleration, facing flips at once) tells the player they overdid it, and it is part of the fun. Never snap the speed to the cap in the opposite direction.
3. **Run is a decision.** B raises the cap from 1.5 to 2.5 and the acceleration by half. Run jumps are higher and much longer, so B is what lets a good player cross the wide gap and fall into the pit if they misjudge: risk and reward on one button. The 10-frame run timer lets you let go of B just before a jump and keep the speed.
4. **The air is committed.** Speed carries from the ground and the same acceleration applies, so you can nudge a jump but not undo it; letting go of D-pad keeps the speed. Players judge jumps by this: the take-off decides the arc, the air corrects it.
5. **Jump speed depends on take-off speed.** Faster take-offs are higher *and* longer, so the player learns "run to clear it" without being told.
6. **No dead zones.** The character responds on the first frame: a pressed button changes the speed in that frame, and a jump starts in that frame. If your input is read once per frame in `frame()` that is automatic; never add an "input delay" for animation.
7. **Whole pixels, small steps.** Motion is applied one pixel at a time, X then Y, with the collision checked at each pixel. Nothing tunnels through a wall at 2.5 px/frame, nothing sticks, and every collision answer is exact.

## 4. Forgiveness that the original did not have (and why it is on by default)

SMB1 is strict; modern players, and a 160 x 144 screen with small buttons, reward a little slack that is invisible when it works. Each is one knob (0 turns it off):

- **Coyote time** (`pl_coyote_max`, 4 frames): a jump pressed up to 4 frames after walking off a ledge still jumps. The player *felt* they pressed it in time and they did.
- **Jump buffer** (`pl_buffer_max`, 5 frames): a jump pressed up to 5 frames before landing happens on landing, so back-to-back hops are easy.
- **Corner slide** (`pl_nudge`, 4 px): jumping with the head clipping a block's corner by up to 4 pixels slides round the corner (to the side you are moving, then the other) instead of bonking. This is how the character "slides around blocks" in games that feel good.
- **Foot inset** (`pl_inset`, 2 px): the feet must overlap a ledge by more than 2 pixels to stand on it, so you drop past the very edge instead of hanging on air, and landings on a ledge's lip are generous.

## 5. Collision, the right way

- **Pixel probes, not tiles.** The module asks `pl_solid(x, y)` at points along the body's edges (every 8 pixels and the end) as it moves one pixel at a time. Your `pl_solid` can read tiles, a collision map, moving platforms or anything else; keep it cheap (a table lookup).
- **Order: X first, then Y**, each as a loop of single pixels. Resolve each axis fully before the next. This gives sliding along walls and floors for free.
- **Body smaller than the sprite.** The sprite is 16 x 16; the body is 12 x 16 (draw the sprite at `pl_x - 2`). A narrower body forgives side contact and makes jumping between pillars fair.
- **Stomping:** an enemy hit counts as a stomp when the character is falling (`pl_vy > 0`) and the feet are in the top half of the enemy; otherwise the character is hurt. Test on the *previous* frame's position if enemies move fast. On a stomp: defeat the enemy, `pl_bounce()`, a sound, 100 points.
- **Hurt:** brief invulnerability (about 60 frames, flash every other frame), a small knockback (set `pl_vx` and `pl_vy`), no instant death for the first hit if the game has power-ups. A pit is a death; a hit is not.
- **One-way platforms and moving platforms:** a one-way platform is solid only for a falling character whose feet were above its top last frame (your `pl_solid` cannot know: handle it with a second check after `pl_step`). A moving platform carries the character by adding its movement to `pl_x`/`pl_y` after the step.
- **Slopes are not supported** by this module. If your game needs them, say so in `DESIGN.md` and write a separate floor-height function; most of the best games on this hardware did not need slopes.

## 6. Scaling to your block size

The screen is 160 x 144: **10 x 9 blocks of 16 pixels** (SMB has 16 x 15). Keep 16-pixel blocks and 16-pixel characters and these numbers as they are: the jump is then 4 blocks out of 9 on screen, so keep ground at rows 6 to 8 and headroom above it in every place the player jumps. If you want a smaller character on 8-pixel blocks, scale all *lengths, speeds and accelerations* by the same factor `s` (8-pixel blocks: `s = 0.5`) and leave frame counts alone, so the jump takes the same time and covers the same number of blocks. Example for `s = 0.5`: top walk 3072, top run 5120, jump -512 / -640, gravity 16 / 56 (rising) and so on; set `pl_w = 6`, `pl_h = 8`.

## 7. The camera and the screen

- **Scroll when the character passes about 40% of the screen width** (x = 64 of 160), moving the camera exactly as far as the character moves past it, so the player always sees at least 6 blocks ahead at run speed (the run covers 2.5 px/frame: 6 blocks is 38 frames of warning).
- **Never scroll back** in a stage (SMB's choice): backtracking is not a feature, it makes the left edge a wall, and it saves you from streaming content twice. If you want backtracking, say so in the plan.
- **Vertical:** lock to the ground row unless the character is above row 3 or below row 7, then follow smoothly. Do not shake the camera on every jump.
- **Boss rooms:** lock the camera, show the arena before the fight, give a checkpoint just before.
- Use `std/stream` for levels wider than the screen (one column of tiles at a time) and `asset levels bank auto records ...` for many stages (`vly docs language`).

## 8. Prove the feel (do this before you build levels)

In an empty test room (a flat floor and one wall), with a script of `RIGHT@...,A@...` input and `vly run ... --watch pl_x,pl_y,pl_vx`, check and write down as tests:

1. Walk: top speed reached in about 40 frames. Run (B held): 2.5 px/frame. B let go: still running 10 frames later, then walking.
2. Standing jump with A held: about 62 px; with a tap: about 20; running jump with A held: about 78.
3. Skid: running at full speed then the opposite direction: about 25 frames to stop, facing flips at once.
4. In the air with no input the speed does not change; with the opposite input it slows.
5. A wall stops the character flat (speed 0); a head under a block's corner slides round; a head under the middle of a block bonks.
6. A jump pressed 3 frames after walking off a ledge works; 12 frames after does not.
7. The worst frame stays under 30,000 cycles with the movement, 8 enemies and the camera.
8. A bot with a reaction delay (`vly docs workflow`) can finish the level, and a bot that holds only RIGHT cannot (the level asks for jumps).

The tests in `test/platformer.test.js` of the toolchain do exactly this for `std/platformer`; copy their approach.

## 9. Level design (the philosophy, then the layout)

**The player is learning a language, one word at a time, and the level is the teacher.** World 1-1 has no text: a lone walking enemy in the open that you will bump into and learn to jump or stomp; then a row of blocks overhead, a mushroom you cannot easily miss, a low pipe, a pit with a floor under part of it so the first mistake is survivable, a staircase, a flag. In order, each idea is introduced in safety, then tested with a small challenge, then combined.

Rules to design by (they come from Miyamoto's and Hayashida's own descriptions of Nintendo level design; the four beats are introduction, development, twist, conclusion):

1. **Introduce in safety.** The first time a hazard appears, a mistake must cost nothing (a pit with a floor, an enemy in the open with space either side, a spike line you can see over).
2. **Develop.** The same hazard again, in a harder arrangement (two enemies, a narrower gap).
3. **Twist.** Use it in a way the player did not expect (the pit now has a moving platform over it; the enemy is above you).
4. **Conclude.** A short test that needs everything just learned (a gauntlet before the flag), then reward and rest.
5. **Rhythm, not density:** tension and release in waves; after a hard section, a flat run with coins or a power-up. About every 10 to 14 blocks something new happens; never more than 3 of the same pattern in a row.
6. **Readable in a glance:** solid is high-contrast and flat-edged, decoration is lighter and behind, hazards are a different colour from scenery, and the player always sees a danger one run-length (6 blocks) before it can hurt.
7. **Fair gaps:** design a gap by the jump that crosses it. At walking speed a 3-block gap is easy, a 4-block gap needs A held for the whole arc; a 5- or 6-block gap needs a run (B). Teach 2 and 3 first. A gap wider than 7 blocks is not possible (and if it is, it needs a spring).
8. **Coins as breadcrumbs:** a curved line of coins shows the jump arc and the safe route; use them to teach, not to pad.
9. **Heights:** keep 5 rows of air above the ground where the player runs (a full jump is 4 blocks), and low ceilings only where you want a run under.
10. **Checkpoints and lives:** a checkpoint every 45 to 60 seconds; losing a life costs seconds, not minutes; a restart is under 2 seconds.
11. **One signature per stage:** each stage has one new idea (a hazard, a mechanic or a set-piece) and one memorable place. A boss is a test of the idea the stage taught.
12. **Length:** 60 to 120 seconds of play per stage for a first-time player (see "Depth and length" in the playbook), more stages beat longer ones, and the last stage is not the hardest by raw difficulty only: it uses everything.

Layout checklist before you call a level done: play it with the delayed bot; read it as a row of 10-block screens and ask each one "what is new here, what is the challenge, where is the rest"; count the first time each hazard appears and check it is safe; find the longest stretch with nothing to do and cut or fill it.

## Sources and honesty

The movement numbers come from fan-documented analysis of the NTSC game's code: the SMBpedia "Movement" article (slither, based on doppelganger's SMB1 disassembly), community physics notes (walk 1.5 and run 2.5 px/frame, accelerations, jump tables), and speedrunning guides. Two cross-checks disagree slightly (some sources list top speeds one raw unit higher); the disassembly values are used here. The terminal fall speed and the exact collision box are not settled in those sources: the 4 px/frame cap and the 12 x 16 body are our choices. The forgiveness knobs (section 4) are modern additions, not SMB1 behaviour. The level-design rules are Nintendo's own stated approach plus our own experience of what makes a small-screen level readable; the numbers (check-point spacing, gaps by jump) are measured on this module.
