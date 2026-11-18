# FRET RUSH

A four-lane guitar rhythm game for the VLY-1. Hit the notes as they reach the line; the notes you hit play the lead guitar
over the band.

## Controls

| Button | Does |
|---|---|
| LEFT, DOWN (or UP), B, A | the four lanes, left to right (green, red, yellow, blue) |
| START | pause (RESUME / RETRY / QUIT), 3-2-1 before it carries on |
| SELECT | SETUP: measure and set your input offset (do this once; it is saved) |
| UP / DOWN, A, B | menus |

## Songs

| Song | BPM | Notes | Perfect / Good window (frames, either side) |
|---|---|---|---|
| FIRST CHORDS | 90 | 115 | 4 / 9 |
| OPEN ROAD | 112.5 | 249 | 3 / 8 |
| NEON RIFF | 128.6 | 320 | 3 / 7 |
| SHRED STORM | 150 | 414 | 3 / 7 |

Score: PERFECT 10, GOOD 6, times a combo multiplier (x1, x2 at 10, x3 at 20, x4 at 30). The rock meter fills with hits and
drains on misses; empty = the song fails. Grades by accuracy (perfect 100%, good 70%): S 95+, A 85+, B 70+, C 55+, D.
Best score, combo, accuracy and grade are saved per song.

## Working on it

```sh
node tools/gen.mjs                    # songs and big letters -> assets/, src/songdata.vly, tests/charts.json
vly build && vly test                 # 26 tests (bot playthroughs of every song, pause, setup, saves)
node tools/bot.mjs --song 3 --delay 2 --jitter 3 --skip 0.03 --out tests/x.input   # a human-like bot
vly check src/main.vly --input-file tests/song3_human.input
```

Songs are written in `tools/gen.mjs` as chord progressions and riff patterns (degrees of the chord in the key); the chart is the
lead melody, one lane per quarter of the song's pitch range. Everything is on one clock: step k happens at frame k * frames-per-step.
