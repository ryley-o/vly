# Built-in modules and level maps

## Importing modules

```
import "std/ui";       // boxes, menus, typewriter dialogue
import "std/anim";     // animation and timing helpers
import "std/music";    // a three-voice tracker for background music and jingles (what to write: `vly docs ref-music`)
```

**Names a module keeps for itself.** Importing a module reserves these name prefixes, so do not start your own variables or functions with them (the compiler tells you which module owns a name and to rename yours): `ui_ menu_ dlg_ dialog_` (std/ui), `anim_` (std/anim), `mus_ music_ N_ MUS_` (std/music), `spr_` and `spr` (std/sprites), `sfx_ SFX_` (std/sfx), `stream_` (std/stream), `tune_ TUNE_` (std/tunes), `fade_` (std/fade), `bt_ BT_ cf_ confirm_ pg_ grade_ grid_` (std/flow), `pl_` (std/platformer). The standard library keeps `font_base`, `text_pal` and `audio_hold`.

**Variables a module lets you poke** (everything else is private): `fade_bg[32]` and `fade_obj[32]` (the palettes a fade scales: `fade_save()` copies the live palettes there; change a word to change what the fade brings back, then `fade_set(level)` or `fade_to(level, speed)`), `fade_speed` (frames per step), `mus_duty[voice]` (pulse width of a music voice, 0 to 3; also `music_duty(voice, d)`), `mus_muted` (1 silences the music), `audio_hold[channel]` (frames a sound effect owns a channel; music leaves a held channel alone), `text_pal` (palette 0 to 7 that `text()` uses), `font_base` (tile where the glyphs start), `menu_sel` (the highlighted item after `menu_open`).

Built-in modules are written in VLY. Like the standard library, only the functions and variables your program uses are
included in the cartridge, and you can redefine any of them. They need `load_font()` (text) and, for `std/ui`, one call
to `ui_init(first_tile)`, which loads 11 small frame and cursor tiles into tile RAM starting at `first_tile`.

## std/ui

All drawing goes into one of the 32x32 maps: `BG_MAP`, or `WIN_MAP` for a box that does not scroll. Cells use the
palette in `text_pal` (default 0). Coordinates are in 8x8 cells.

| Function | What it does |
|---|---|
| `ui_init(first)` | load the UI tiles at tile `first` (call once, after `load_font`) |
| `ui_box(map, col, row, w, h)` | draw a framed blank box, `w` x `h` cells including the frame |
| `ui_clear(map, col, row, w, h)` | blank a rectangle |
| `ui_centre(w)` | the column that centres something `w` cells wide on the 20-cell screen: use it for menus, grids and titles instead of a hand-picked margin |
| `menu_open(map, col, row, items, count)` | draw a menu; `items` is a word table of strings: `table items = {"FIGHT", "ITEM"};`. **Set `menu_gap = 2` first** for a blank row between items (the default 1 packs them and the 5 x 7 glyphs touch), and **`menu_sel_pal = 1`** (after defining palette 1 as an inverse of palette 0: colours 0 and 3 swapped) so the selected item is a light bar with dark letters, easy to see in grey and for colour-blind players (`vly docs ref-readability`) |
| `menu_update()` | call every frame: returns `-1` (nothing yet), the chosen index when A is pressed, or `-2` when B is pressed. UP/DOWN move the cursor and wrap |
| `menu_close()` | erase the menu |
| `dialog_open(map, col, row, w, h)` | draw a dialogue box |
| `dialog_say(text)` | start typing `text` into it (`\n` starts a new line; long lines wrap) |
| `dialog_update()` | call every frame: types a character every other frame (hold A to hurry); when the text is complete a small arrow shows and pressing A returns `1` |
| `dialog_close()` | erase the box |

```
import "std/ui";
table choices = { "FIGHT", "ITEM", "RUN" };

func init() {
  load_font(0);
  ui_init(60);
  lcd(LCD_BG | LCD_WIN);
  window_pos(0, 96);
  dialog_open(WIN_MAP, 0, 0, 20, 6);
  dialog_say("A wild BLOCK appeared!\nWhat will you do?");
}
func frame() {
  if (dialog_update() == 1) {
    dialog_close();
    menu_open(WIN_MAP, 10, 0, choices, 3);
  }
}
```

## std/anim

| Function | What it does |
|---|---|
| `anim_frame(t, count, speed)` | which of `count` frames to show at time `t` when each frame lasts `speed` ticks |
| `blink(t, period)` | 1 for `period` ticks then 0 for `period` ticks, repeating |
| `approach(v, target, step)` | move `v` toward `target` by at most `step`, never overshooting |

## `std/music`: a tiny tracker

Up to three voices, each playing a `btable` of `(note, steps)` pairs on one audio channel.

```
import "std/music";

btable lead = { N_E4, 2, N_G4, 2, N_C5, 4, 0, 2, MUS_LOOP };   // 0 is a rest
btable bass = { N_C3, 4, N_G3, 4, MUS_LOOP };
btable jingle = { N_C5, 1, N_E5, 1, N_G5, 1, N_C6, 3, MUS_END };

func init() {
  music_tempo(8);                 // frames per step: 8 is 7.5 steps a second
  music_play(0, 0, lead, 8);      // voice 0 on channel 0 (pulse) at volume 8
  music_play(1, 2, bass, 9);      // voice 1 on channel 2 (triangle)
}
func frame() { music_update(); }  // once per frame
```

| Call | Meaning |
|---|---|
| `music_tempo(frames_per_step)` | speed for every voice |
| `music_play(voice, channel, song, volume)` | start a song on voice 0-2; channels 0-1 are pulse, 2 is triangle |
| `music_duty(voice, d)` | pulse width 0-3 for that voice (call after `music_play`) |
| `music_update()` | advance the music; call once per frame |
| `music_stop(voice)`, `music_stop_all()` | stop and silence |
| `music_playing(voice)` | 1 while the voice still has notes (a `MUS_END` song stops itself) |
| `music_mute(on)` | silence the music without losing the beat |

Notes are semitones named `N_C2` (1) up to `N_B6` (60); sharps are `N_CS4`, `N_DS4`, `N_FS4`, `N_GS4`, `N_AS4`. End a
song with `MUS_LOOP` (repeat forever) or `MUS_END` (play once: good for fanfares on a spare voice). Each note starts
at full volume and fades toward half, which gives a soft pluck. Keep one or two channels free for sound effects
(`tone(1, hz, vol, duty)`, and channel 3 is noise).

**A whole soundtrack: songs live in ROM banks, one at a time in RAM.** A `btable` lives in the always-visible 16 KB, which nine 32-bar songs overflow. A song is just bytes (`note, steps` pairs ending in `MUS_LOOP` or `MUS_END`) at an address, and `music_play` takes any address, in RAM too. So keep every song in a banked `records` asset (one record per song, sized for the longest: 1024 bytes gives 8 songs a bank), and copy the song you need into a RAM buffer when a stage starts:

```
asset songs bank auto records 1024 = incbin("songs.bin");     // your generator script writes songs.bin: one 1024-byte record per song
byte buf0[1024]; byte buf1[1024]; byte buf2[1024];           // one RAM buffer per voice
func start_song(i) {                                          // song i is three records: lead, harmony, bass (3 * i, 3 * i + 1, 3 * i + 2)
  songs_load(3 * i, buf0); songs_load(3 * i + 1, buf1); songs_load(3 * i + 2, buf2);
  music_play(0, 0, buf0, 8); music_play(1, 1, buf1, 6); music_play(2, 2, buf2, 9);
}
```

`songs_load` is named after your asset (`asset songs ... records` gives `songs_load`, `songs_peek8`, `songs_COUNT`). The load costs a few thousand cycles: do it when a stage starts, behind a fade, not in the middle of play. Do not call `select_bank` yourself around `music_update`: the music runs every frame, and a bank left selected for the rest of the frame breaks whatever reads another bank after it.

## `std/platformer`: Super Mario Bros. movement and collision

```
import "std/platformer";
func pl_solid(x, y) { return level_is_solid(x, y); }     // you write this: 1 if the world pixel is solid
func init() { pl_init(24, 96); }
func frame() { pl_step(btn(BTN_RIGHT) - btn(BTN_LEFT), btn(BTN_B), btnp(BTN_A), btn(BTN_A)); }
```

Walk 1.5 px/frame, run 2.5 (B), 40 frames to top speed, skid, a 10-frame run timer, a jump that is a hop when tapped and 4 to 5 blocks when held, speed kept in the air, 12 x 16 body, one pixel at a time, slides round block corners, coyote time and a jump buffer. Read `pl_x, pl_y, pl_vx, pl_vy, pl_face, pl_ground`; check `pl_jumped, pl_landed, pl_bump (pl_bx, pl_by)` for sounds and block hits; for each enemy call `pl_enemy(x, y, w, h)` (0 no contact, 1 stomp: kill it and call `pl_bounce()`, 2 hurt: call `pl_hurt()`; Mario's forgiving rules: falling onto an enemy always stomps, `pl_inv` counts the blinking frames); `pl_camera(world_width)` after `pl_step` is the Mario camera (see below); a character buried in something solid (a switch block that just turned on) is pushed out by `pl_step` itself, the way SMB1 does (1 px per frame sideways away from the touching side; floating up if buried on both sides: `pl_hit()`, `pl_unstick()`, `pl_eject()`); tune with `pl_coyote_max`, `pl_buffer_max`, `pl_nudge`, `pl_inset`, `pl_w`, `pl_h`. The numbers, why they feel right, collision, camera and level design are in `vly docs ref-sidescroller`.

**The camera:** call `pl_camera(world_width_in_pixels)` once per frame right after `pl_step`, then draw the player at `pl_x - pl_cam` and scroll the background by `pl_cam` (`stream_scroll(pl_cam)`) in the same frame. It is SMB1's camera: it moves only when the character is past `pl_cam_line` (70 px) from the left edge, moves exactly as far as the character moved (whole pixels, so the sprite does not wobble: an eased or delayed camera is what makes scrolling look jerky), never scrolls back, stops at the end of the world, and keeps the character from walking off the left of the screen.

## Tilemaps: levels as ASCII art

A `.map` file draws a level with characters and says what each one means:

```
legend:
  // a character, an equals sign, and a constant expression for the 16-bit map cell
  # = T + art_wall
  . = T + art_floor
  P = T + art_floor, marker
  C = T + art_coin, marker
map:
##########
#P.....C.#
#..###...#
#C.....C.#
##########
```

```
const T = 100;                      // where the art tiles live in tile RAM
tileset art = "art.tiles";
tilemap level = "level.map";

func init() {
  load_tiles(art, T, art_COUNT);
  load_map(level, level_W, level_H, 2, 2);        // draw it into the background at cell (2, 2)
  player_x = level_P_X * 8;                         // where the P was (cell coordinates)
  for (var i = 0; i < level_C_COUNT; i++) {         // every C
    spawn_coin(level_C_list[i * 2], level_C_list[i * 2 + 1]);   // (x, y) cell pairs
  }
}
```

- The legend value is any constant expression. **It must include the tile offset** (`T + art_wall`), because tile
  indices in a map refer to tile RAM, not to the art file. Add `| (palette << 12)`, `| CELL_FLIPX` and friends for
  attributes.
- `, marker` (letters and digits only) records where a character appears. You get `level_P_X`, `level_P_Y` (the first
  one), `level_P_COUNT`, and `level_P_list`, a word table of x, y pairs in cell coordinates.
- `level_W`, `level_H` and `level_SIZE` (bytes) are constants. `level` itself is the address of the cell data (one
  16-bit word per cell, row-major), so `map_cell(level, level_W, x, y)` reads a cell, e.g. to test for walls.
- Maps may be larger than the 32x32 background (up to 255 x 255); copy the part you want to show, or scroll by
  streaming rows as the camera moves.
- Errors name the `.map` file and line: a character missing from the legend, uneven row widths, a legend value that
  is not constant.


## std/sprites: a sprite manager

There are 64 sprite slots. Assigning indices by hand and forgetting to hide one leaves stale sprites on screen (a rival from
the last level, a flag from the last lap). `std/sprites` hands slots out each frame and hides the ones you did not use:

```
import "std/sprites";
func frame() {
  spr_begin(0);                         // slots 0..first-1 stay yours; hand out from `first`
  spr(hero_x, hero_y, TILE_HERO, 0);    // returns the slot used, or -1 when all 64 are in use
  for (var i = 0; i < enemy_n; i++) { spr(ex[i], ey[i], TILE_ENEMY, 1); }
  spr_end();                            // hides every slot not used this frame
}
```

`spr_used()` tells you how many slots this frame has used so far; keep well under 64. Multi-tile sprites still take one
slot (set the size flag in `attr`).

## std/sfx: sound effects that cooperate with the music

`sfx_play(SFX_JUMP)` and call `sfx_update()` once a frame (next to `music_update()`). Effects: `SFX_JUMP`, `SFX_LAND`,
`SFX_COIN`, `SFX_HIT`, `SFX_POWER`, `SFX_SELECT`, `SFX_BACK`, `SFX_EXPLODE`, `SFX_SHOOT`, `SFX_DEATH`, `SFX_PAUSE`,
`SFX_WIN`. Tonal effects use audio channel 1 and noise effects channel 3. While one plays, the music voice on that channel
yields, and it comes back at its next note. One effect plays at a time (a new one replaces the old).

```
import "std/music"; import "std/sfx";
func frame() { music_update(); sfx_update(); if (btnp(BTN_A)) { sfx_play(SFX_JUMP); } }
```

For a sound you drive yourself, such as an engine whose pitch follows speed, `sfx_tone(ch, hz, vol, duty, frames)` takes the
channel for `frames` frames (call it every frame while the sound runs). Plan the four channels first: music on 0 (lead),
1 (harmony, yields to effects), 2 (bass) and 3 (drums, yields to noise effects). See the design playbook.


## std/stream: an endless scrolling world

The background is a 32 x 32 map that wraps, so a world wider than 256 pixels is built by writing columns just before they scroll into
view. `std/stream` does that for you. You define the world as a function; it keeps the 32 columns around the camera written and sets
the hardware scroll.

```
import "std/stream";
var cam;
// the cell at world column wx (0, 1, 2, ...) and map row 0..19: tile | palette << 12 (flip flags allowed)
func stream_tile(wx, row) {
  var ground = 12 + sin(wx * 5) / 90;               // a rolling hill: the row where the ground starts
  if (row == ground) { return T_GRASS; }
  if (row > ground) { return T_DIRT; }
  return T_SKY;
}
func init() { /* load tiles, palettes */ stream_start(cam); }
func frame() { cam += 2; stream_scroll(cam); }
```

It scrolls either way. A column is about 20 cells, so keep `stream_tile` cheap (a lookup, a height table). Because `scroll()` moves the whole
background, put the HUD in the window layer (`lcd(LCD_BG | LCD_WIN | LCD_OBJ)`, `window_pos(0, 128)`, `wtext`, `wprint_u`) and fake a
second, slower layer with a few large sprites moving at half the camera speed. Use the same height function for drawing and for
physics, so nothing floats above the ground.


## std/flow

The front end and controls every game needs, so they are the same everywhere (`import "std/flow";`, which imports `std/ui`). `templates/flow` shows all of it working, with replay tests.

| Function | What it does |
|---|---|
| `bt_update()` | call first in `frame()`: tracks how long each button is held |
| `bt_tap(b)` | 1 on the frame a button is **released** after a short press (12 frames or fewer) |
| `bt_hold(b, n)` | 1, once, on the frame the button has been held `n` frames |
| `bt_released(b)`, `bt_frames(b)` | 1 on the release frame; how many frames it has been held |
| `bt_flush()` | ignore every button held right now until it is released (call when the screen changes) |
| `confirm_open(map, col, row, title, warning)` | a box naming what will be erased, **KEEP selected**, ERASE second (keep title and warning to 14 characters or so) |
| `confirm_update()` | `-1` waiting, `0` keep (KEEP chosen, or B), `1` erase confirmed. LEFT/RIGHT/UP/DOWN move, A or START choose, B cancels |
| `pg_get(level)`, `pg_record(level, grade)` | the best grade of a level (0 = not beaten, 1 = D ... 6 = AAA), kept in the save at `pg_base` (default byte 64), 4 bits a level; `pg_record` returns 1 on a new best |
| `pg_save()` | seal and commit the save |
| `pg_next(count)`, `pg_beaten(count)`, `pg_open(level, count)` | the first unbeaten level, how many are beaten, whether a level is open (progressive unlocking) |
| `grade_for(turns, par)`, `grade_name(g)` | AAA at par, AA, A, B, C, D as turns pass it (the slack grows with par); the letters |
| `grid_open(cols, count, start)`, `grid_update(unlocked)` | a level-select cursor: `-1` nothing yet, the level on A or START, `-3` on a locked level, `-2` on B. `grid_sel` is the cursor; you draw the cells |

`menu_update()` in `std/ui` now treats START like A, so every menu follows the same pattern: UP/DOWN move, A or START choose, B goes back.

## std/fade and `spr_text`

`std/fade` fades the whole screen to black and back by scaling every palette colour (4 is normal, 0 is black):

```
import "std/fade";
func init() { /* set bg_pal / obj_pal */ fade_save(); fade_set(0); fade_to(4, 6); }      // start black, fade in, a step every 6 frames
func frame() {
  fade_update();                                                                       // once per frame
  if (leaving && !fade_busy()) { start_next_screen(); fade_to(4, 6); }
  if (btnp(BTN_START)) { leaving = 1; fade_to(0, 6); }
}
```

Call `fade_save()` after you set palettes on purpose (it remembers the real colours); `fade_set(n)` jumps to a level; a step costs about 15,000 cycles (so fade in steps, not in one frame, and do not combine it with another big call). Set or change palettes at full brightness (`fade_set(4)` first), then `fade_save()`; palette changes made while faded are lost when you save. To change colours while the screen is faded or fading (a screen change behind black, a lava stage, a flash), use `fade_bg_set(i, colour)` and `fade_obj_set(i, colour)` (`i` is the entry 0 to 31, so palette `p`, colour `k` is `p * 4 + k`): they update the remembered colour and show it at the current brightness. **Do not** write `bg_pal` and then call `fade_save()` while faded: `fade_save()` restores the old colours first, so your new ones are lost (the screen comes back in the old palette). Setting a whole screen's palettes with the two setters and one `fade_to` costs far less than `fade_save()` plus `fade_set()` (about 31,000 cycles each).
`spr_text(x, y, "WARNING", pal)` (in `std/sprites`) draws big letters as sprites, for banners and messages over the action; call it first in the frame so
the letters get the low slot numbers and sit on top. The letters are drawn in **palette colour 3**, so choose an object palette whose colour 3 contrasts with the
background (a dark colour 3 over a dark scene is unreadable).

## Long songs from patterns: `music_build`

A tune that does not audibly loop needs 16 or more bars. Write each distinct bar once and list the order:

```
import "std/music";
btable lead_pats = { N_A4,0,N_C5,N_A4,0,N_E5,N_D5,N_C5,   N_G4,0,N_B4,N_G4,0,N_D5,N_C5,N_B4 };   // 2 patterns of 8 steps
btable lead_order = { 0, 1, 0, 1, 0, 1, 0, 1 };                                                   // 8 bars
byte lead_buf[8 * 8 * 2 + 1];                                                                      // 2 bytes per step + the loop mark
func init() { music_tempo(7); music_play(0, 0, music_build(lead_buf, lead_pats, 8, lead_order, 8), 7); }
```

Each step is one note (0 is a rest) lasting one step. Give each voice its own buffer and play the voices together: lead on channel 0,
bass on channel 2 (see the channel plan in the design playbook). Hill Racer builds a 24-bar race song and a 16-bar title song this way.


## std/tunes: five placeholder loops (do not ship them)

Five ready-made loops for an early build, **not for the finished game**: every game that ships them sounds the same, and `vly check` warns about them. Replace them with your own motif or an arranged public-domain tune (`vly tune` has 83 ready-made ones: `vly docs ref-classics`; `vly docs ref-music`, "Where your music comes from"). They are 16 to 24 bars each (20 to 30 seconds before they repeat), melody on channel 0 and bass on channel 2, so
channels 1 and 3 stay free for sound effects.

```
import "std/tunes";                                   // also brings in std/music and std/sfx
func init() { tune_play(TUNE_ADVENTURE); }
func frame() { music_update(); sfx_update(); }
```

| Tune | Mood |
|---|---|
| `TUNE_TITLE` | calm, A minor, slow: a title or menu |
| `TUNE_ADVENTURE` | bright and bouncy, C major: exploring, platforming |
| `TUNE_ACTION` | driving, A minor: racing, shooting |
| `TUNE_BOSS` | fast and tense, D minor: a boss or a final push |
| `TUNE_SPACE` | spacious, E minor: space, caves, night |

`tune_play` builds the song (about one frame of work), so call it when a scene starts. Switch tunes at scene changes (title to play to boss);
`tune_stop()` silences it. For a signature tune of your own, see `music_build` above.
