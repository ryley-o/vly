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
- **Enemy contact: use `pl_enemy` and read "Enemy contact" below.** Mario is forgiving, and that forgiveness is most of why it feels fair.
- **One-way platforms and moving platforms:** a one-way platform is solid only for a falling character whose feet were above its top last frame (your `pl_solid` cannot know: handle it with a second check after `pl_step`). A moving platform carries the character by adding its movement to `pl_x`/`pl_y` after the step.
- **Slopes are not supported** by this module. If your game needs them, say so in `DESIGN.md` and write a separate floor-height function; most of the best games on this hardware did not need slopes.

## 5b. Enemy contact: Mario is forgiving (when in doubt, the player wins)

**Use `pl_enemy(ex, ey, ew, eh)` for every enemy: it returns 0 (no contact), 1 (stomp: kill it, call `pl_bounce()`, play the sound, give points) or 2 (hurt: call `pl_hurt()`, knock back, lose a hit point).** The rules, and where each comes from (verified in the annotated disassembly of SMB1 unless marked as ours):

1. **Falling onto an enemy always stomps it.** SMB1's check reads the character's vertical speed: any speed downwards is a stomp, with *no test of where the feet are* (`lda Player_Y_Speed / bmi ChkInj / bne EnemyStomped`). So the player who is coming down and touches an enemy at all, at its top, its side or its middle, kills it and not the other way round. This is the single most forgiving rule in the game. Our `pl_enemy` does the same (`pl_vy > 0`), and also counts a landing or standing contact with the feet in the top half of the enemy as a stomp.
2. **Only walking into it, or rising into it from below, hurts.** For the common enemies (Goombas and Koopas) a level or upward contact hurts with no height test at all; some later enemy types add a test that the feet were at least 12 px above the enemy's top. So the way to avoid a hurt is simple to learn: jump on them.
3. **A stomp timer makes chains work.** After a stomp, a short window (`pl_stomp_t`, 6 frames here) treats the next contact as a stomp too, so two enemies side by side both die and bouncing from head to head scores the chain (100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000, then a 1-up; the first few steps are verified, the later values are the community's numbers). A hurt is checked after the stomp, never before.
4. **Stomps still work while blinking.** After a hit the character is invulnerable for a while (`pl_inv`, `pl_hurt()` sets it to 90 frames; flash the sprite every other frame) and is not hurt again, *but can still stomp*, which is how a player fights their way out of a bad spot. SMB1 sets a short injury timer (8 on the first hit; how fast it counts down was not verified, so the 90 frames are our choice).
5. **A hit is not death for a powered-up character.** Big Mario shrinks and survives; small Mario dies. Give every game a hit point buffer (hearts, a power-up that is lost first) so the first mistake is survivable. A pit is a death; a hit is not.
6. **Contacts are checked a little less than perfectly.** SMB1 resolves player-enemy contact on every other frame only, enemy hit boxes are smaller than their sprites, and enemies that are still off the edge of the screen cannot touch the character (they wake up about 72 px beyond the screen edge). We copy the spirit: `pl_enemy` shrinks the character's box by `pl_hurt_inset` (2 px each side) and the enemy's by 1 px, so a graze with a sprite's corner is not a hit; do not let enemies hurt from off-screen; do not check contact on the frame an enemy spawns. (The every-other-frame check itself is an NES quirk, not something to copy.)
7. **Things that always hurt are rare and obvious.** Spikes, fire, a piranha plant, a boss's body: no stomp possible, drawn so you can see it. Make those the exception and mark them with a different colour and a spiky shape (a Spiny hurts when stomped in SMB1: it is the one the player learns not to jump on).
8. **A kicked shell is the hardest thing in the game to read, so it is taught in safety:** a stationary shell is kicked by touching it (it moves at 3 px/frame), a moving shell hurts the character from the side and can be stomped to stop it.
9. **After a stomp the bounce is a small constant hop** whatever the buttons (SMB1's stomp path sets a speed of about -3 units; `pl_bounce()` uses -4 px/frame: either way the player lands on the next enemy or ledge without having to aim). Make the bounce high enough to clear the next enemy so chains are possible.

**Things to test:** drop the character onto an enemy from 5 different horizontal offsets: always a stomp. Walk into one: hurt. Jump into its underside: hurt, never a stomp. Stand in it while blinking: hurt once. Two enemies 10 px apart: stomp both with one jump. `test/platformer.test.js` does these on the module.

## 6. Scaling to your block size

The screen is 160 x 144: **10 x 9 blocks of 16 pixels** (SMB has 16 x 15). Keep 16-pixel blocks and 16-pixel characters and these numbers as they are: the jump is then 4 blocks out of 9 on screen, so keep ground at rows 6 to 8 and headroom above it in every place the player jumps. If you want a smaller character on 8-pixel blocks, scale all *lengths, speeds and accelerations* by the same factor `s` (8-pixel blocks: `s = 0.5`) and leave frame counts alone, so the jump takes the same time and covers the same number of blocks. Example for `s = 0.5`: top walk 3072, top run 5120, jump -512 / -640, gravity 16 / 56 (rising) and so on; set `pl_w = 6`, `pl_h = 8`.

## 7. The camera and the screen

**Use `pl_camera(world_width)` (after `pl_step`, every frame): it is SMB1's camera, tested.** What it does, and why each part matters:

- **Scroll only when the character passes a line about 44% in from the left (SMB1: 112 of 256; here 70 of 160 px)**, and move exactly as far as the character moved that frame. The character then stays at the same screen position while the world slides under it, so nothing wobbles. A camera that eases toward the player, lags behind, or moves in fractions of the character's speed is what players call *jerky*: the character's pixel position steps while the camera glides, and the sprite shimmers against the background. Same whole pixels, same frame, for both.
- **Order inside a frame:** read input, `pl_step`, move enemies, `pl_camera`, then draw sprites at `x - pl_cam` and scroll the background by `pl_cam` (`stream_scroll(pl_cam)`). Never draw with last frame's camera and this frame's player.
- **Never scroll back** (SMB1's choice): the left edge of the screen is a wall (`pl_camera` pushes the character off it). Backtracking is not a feature, and it means you never stream content twice. If you want backtracking, say so in the plan.
- **At the end of the world** the camera stops and the character walks to the flag.
- **Vertical:** SMB1 never scrolls vertically; its stages are one screen tall (15 blocks). With 9 blocks of height, keep each stage within one screen of height where you can; if a stage climbs, lock the camera to the ground row and follow only when the character is above row 3 or below row 7, in whole pixels, with no easing. Do not shake the camera on every jump.
- **Boss rooms:** stop the camera (the arena is one screen), show it before the fight, give a checkpoint just before.
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

13. **Vary the ground.** A stage reads as designed when the ground changes: a step up, a dip, a raised block island, a low ceiling, a second height with a choice between a high safe route and a low risky one. A long stretch of bare flat floor with things standing on it reads as empty; fill it with a block row, a coin arc, steps or a pipe. (Players who played Fox Shift, a bot-proven 12-stage game, found its ground and level layout reasonable, so this is a guide, not a hard limit.)
14. **A level is a path with a path for the eye.** Pull the player forward with a line of coins, a light, a distant landmark in the parallax; end the stage with a visible goal and a short fanfare.

Layout checklist before you call a level done: play it with the delayed bot; read it as a row of 10-block screens and ask each one "what is new here, what is the challenge, where is the rest"; count the first time each hazard appears and check it is safe; find the longest stretch with nothing to do and cut or fill it; list the ground height per column (a `tools/` script over your level data) and check it changes at least every 2 screens; prove with a **search bot** that every collectible is reachable and the level has no soft-lock (`vly docs workflow`, "A search bot for action games").

## 10. What real players noticed (a checklist; each one cost a game its feel)

These come from people playing agent-built platformers. Test each one yourself, with a bot or a scripted input, before you hand the game over.

1. **Checkpoints need breathing room.** A respawn must never put the character beside something that attacks. At every checkpoint: no enemy or hazard within 64 px (4 blocks) ahead or 32 px behind at the moment of respawn (move it, or start it asleep until the character moves), and about 90 frames of blinking invulnerability. *Test:* for each checkpoint, respawn and press nothing for 60 frames: no damage.
2. **Nothing falls forever.** Any enemy, item or projectile that falls below the bottom of the world is removed (or, for the player, loses a life). Compare with signed arithmetic (`y > WORLD_BOTTOM`), because a y that goes below 0 on this 16-bit machine wraps to 65,000 and the thing shoots back to the top. *Test:* put an enemy over a pit and run 300 frames: it is gone.
3. **A boss fight is one on one.** On entering the boss arena: lock the camera, remove every other enemy, stop the stage's spawners and projectiles, and only bring in minions on purpose, with a visible cue. Enemies that walk in from the left edge during a boss fight are a bug. *Test:* at the first frame of the fight and 600 frames later, count active enemies: only the boss (plus the minions you scripted).
4. **Silence on every state change.** A boss's death sound that keeps playing into the menu and the next stage means a tone was left on. When the state changes (death, clear, menu, pause), call `sfx_stop()` and make jingles finite (`MUS_END`). *Test:* `vly run --audio` after the clear screen: the sound has stopped within 2 seconds.
5. **Never stuck in a block.** A switch or timed block that turns solid on the character, a moving platform, a bad spawn: `pl_step` already pushes the character out to the nearest free pixel (`pl_eject`). If you write your own movement, do the same: look up first, then right, then left, one pixel further each time, until free. *Test:* switch the block on while standing in it: the character is free within a frame.
6. **Run is B.** The people who play platformers want B to run, as in Mario. If your game needs a second action (a shift, a shot), make it automatic or contextual, use down plus A, or tie it to a pickup; if it must have its own button and you give up B for it, say so in the how-to page and make sure the game is still comfortable at walking speed.
7. **Slide round corners.** Jumping up under the edge of a block must slide the character round it, not stop the jump (SMB1's behaviour; `pl_nudge` pixels). Tested in `std/platformer`: use it.
8. **The front end is the common one.** A saved game gives CONTINUE then NEW GAME on the title; NEW GAME asks KEEP or ERASE (KEEP selected) before it wipes the save, and no marks from the old game may remain after ERASE. No save: NEW GAME alone. Start from `vly new mygame --template flow`, which has exactly this and tests for it.
9. **Length.** 24 or more stages in 6 to 8 worlds is a full game (SMB1 has 32 in 8). 12 stages is a demo to anyone who played the classics.
10. **Combat is forgiving.** If you jump and an enemy and you touch, you kill it, not the other way round: falling onto an enemy always stomps, only walking into it or hitting it from below hurts, a hit starts a blinking invulnerability in which you can still stomp, and the first hit never kills (section 5b, `pl_enemy`). Players who played Fox Shift asked for exactly this.
11. **Centre what you draw.** Grids, menus and titles are centred with `ui_centre(width)`; a block that sits a cell or two left looks wrong.

## Sources and honesty

The movement numbers come from fan-documented analysis of the NTSC game's code: the SMBpedia "Movement" article (slither, based on doppelganger's SMB1 disassembly), community physics notes (walk 1.5 and run 2.5 px/frame, accelerations, jump tables), and speedrunning guides. Two cross-checks disagree slightly (some sources list top speeds one raw unit higher); the disassembly values are used here. The terminal fall speed and the exact collision box are not settled in those sources: the 4 px/frame cap and the 12 x 16 body are our choices. The forgiveness knobs (section 4) are modern additions, not SMB1 behaviour. The level-design rules are Nintendo's own stated approach plus our own experience of what makes a small-screen level readable; the numbers (check-point spacing, gaps by jump) are measured on this module.
