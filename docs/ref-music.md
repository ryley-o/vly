# Reference: music for a four-channel handheld

Read this before you write any music, and again when someone says the soundtrack is "fine but forgettable". It is a reference guide to section 8 of the design playbook (`vly docs design`): the playbook lists what a game must have; this says how to make it good.

**Quality bar:** a player should be able to hum the stage theme after the first minute, should not notice it looping the second time, and should feel the tension change when the music does. If you can only describe your music as "background", rewrite the tune.

## 1. The machine, as a band

Four channels: **0 and 1 pulse** (a square wave with four duty widths: thin and nasal to full and hollow), **2 triangle** (soft, no volume control: bass), **3 noise** (drums, cymbals, thumps). `std/music` plays up to three voices on channels 0 to 2; drums and effects are yours to time on channel 3 (`vly docs modules`, `std/sfx`, `std/tunes`).

| Channel | Role in the music | Notes |
|---|---|---|
| 0 pulse | **lead**: the tune someone hums | keep it between `N_C4` and `N_C6`; duty 1 or 2 |
| 1 pulse | **harmony, arpeggio or echo** | it yields to sound effects, so never put the only melody here |
| 2 triangle | **bass** | stay between `N_A2` and `N_C4`: a 40 mm speaker has almost nothing below about 110 Hz |
| 3 noise | **drums** | short bursts: kick (low, 2 frames), snare (mid, 3 frames), hat (high, 1 frame, quiet). On the noise channel `hz` is the *rate* of the random noise: low rates are a rumble, high rates a hiss. Starting points (check the pitch by rendering a WAV, we have not listened): kick `tone(3, 150, 12, 0)`, snare `tone(3, 1000, 10, 0)`, hat `tone(3, 6000, 5, 0)` |

`music_tempo(n)` is frames per step. Treat a step as a sixteenth note: **BPM = 900 / n** (tempo 9 is 100 BPM, 8 is 112, 6 is 150, 5 is 180).
Length in seconds = bars x 16 steps x n / 60 (4/4 time). A 16-bar tune at tempo 8 lasts 34 s; a 32-bar tune at tempo 9 lasts 77 s.
Music is data, and data is cheap: a 32-bar, two-voice tune is a few hundred bytes. **ROM space is never a reason for a short loop.** (Nine 32-bar songs do not fit in the always-visible 16 KB as `btable`s: put them in a banked `records` asset and copy the current one into a RAM buffer when a stage starts; the recipe is under `std/music` in `vly docs modules`.)

## 2. What the classics did (techniques to learn, not notes to copy)

- **Super Mario Bros. (Koji Kondo).** The overworld theme is in C major at about 100 BPM, tonal parts in straight eighths over a *swung* rhythm part, with syncopation and a bouncing bass; Kondo has said he always liked Latin music, and writers hear ragtime and calypso in it. Lesson: **a groove and a rhythm identity come before a clever melody**: syncopation (stress the off-beat), a bass that bounces (root, octave, root, fifth), and a melody built from a few short, singable motifs. The underwater and castle themes use the same few notes with a different feel.
- **Castlevania, Ghosts 'n Goblins and others borrowing from Baroque music.** Writers describe Bach-like writing: a repeated bass note under a running melody (a *pedal point*), melodies that repeat a figure a step higher (a *sequence*), arpeggiated minor chords, and rhythmic drive. Some game tracks quote Bach directly (the Toccata and Fugue in D minor, the Chromatic Fantasia). Lesson: **Baroque writing is perfect for two or three voices**: a melody, a bass, and the harmony implied between them; little needs more than that.
- **Final Fantasy (Nobuo Uematsu).** Classical influences (Bach, Chopin, Debussy) mixed with film-score habits and progressive rock, and a **leitmotif**: a short theme for a character or place that comes back in different moods. Lesson: write one memorable motif for your game and let it return (title, a calm version in the hub, a fast one in the finale).
- **Tetris:** the Game Boy's famous tune is the Russian folk song *Korobeiniki*, reduced to a melody and a bass. The most remembered game tunes are short, singable and rhythmic, and an old song can be the best source of one (see below).

### Classical music is a free library (the compositions, not the recordings)

The *compositions* of composers who died long ago are in the public domain: you may arrange them. Reduce to melody + bass (+ arpeggio) and make it your own; credit the composer on the title or credits screen. Do not copy another *game's* tune. Pieces that already suit a four-channel band:

| Mood | Pieces to arrange |
|---|---|
| Chase, danger, speed | Grieg, *In the Hall of the Mountain King* (an ostinato that speeds up); Offenbach, *Galop infernal* (the can-can); Rimsky-Korsakov, *Flight of the Bumblebee*; Mozart, *Rondo alla Turca* |
| Dark, castle, boss | Bach, *Toccata and Fugue in D minor* (the opening figure); Mussorgsky, *Night on Bald Mountain*; Saint-Saens, *Danse Macabre*; Chopin, *Funeral March* |
| Bright, adventure, title | Vivaldi, *Spring*; Beethoven, *Ode to Joy*; Tchaikovsky, *Dance of the Reed Flutes*; Strauss, *The Blue Danube* |
| Calm, hub, sleep | Satie, *Gymnopedie No. 1*; Debussy, *Clair de lune*; Bach, *Air on the G String*; Pachelbel, *Canon* (its chord loop is a classic) |

## 3. Craft

1. **Start with a motif** of 3 to 6 notes and a rhythm you can tap on a table. Say it, then play it. If it is not catchy as a rhythm, change the rhythm before the notes.
2. **Phrase like speech:** a 4-bar phrase asks, the next 4 bars answer (same start, different end). Eight bars is a sentence; 16 bars is a paragraph.
3. **Form: A, A', B, A.** Play the tune (A), repeat it with a small change (A'), contrast with new material and a different harmony (B), come back home (A). 16 bars minimum; 32 is better for a stage that is played for minutes.
4. **Harmony in four chords.** Major: I - V - vi - IV (C - G - Am - F). Minor: i - VI - III - VII (Am - F - C - G). The bass plays the roots; the arpeggio (channel 1, a step every 2 or 3 frames: root, third, fifth, third) paints the chord. Change chords every bar or every two beats.
5. **Bass patterns:** root-octave bounce (Mario), root-fifth (marching), pedal point (one note under moving harmony, for tension), walking (stepwise line, for a calm hub).
6. **Fake a chord, fake an echo.** One pulse channel plays one note, but cycling the chord notes fast (each step 2 frames) is heard as a chord. For an echo, voice 1 plays the lead's notes one step later at about 40% of the volume.
7. **Timbre is a verb.** Change the duty width between sections (thin for the verse, full for the chorus), or on a held note. `music_duty(voice, d)`.
8. **Drums are punctuation:** kick on beats 1 and 3, snare on 2 and 4, a quiet hat on the off-beats; in a build-up, double the pattern. Leave the drums out for the first pass so they arrive as an event.
9. **Rests are notes.** A beat of silence before the downbeat makes the next one hit harder.

## 4. Length, repetition and variety (what the research and the classics agree on)

Short repeating loops cause listening fatigue and lower enjoyment in play-tests; longer loops hide the repetition; layering and variation help most. The practical numbers for this machine:

| Piece | Length | Loops? |
|---|---|---|
| Stage theme | **32 bars** (60 to 80 s) with A, A', B, A | yes, with the intro played once |
| A very short stage or a mini-game | 16 bars (30 to 35 s) | yes, with variation on the repeat |
| Title | 8 to 16 bars, calm, leaves room for the "press start" | yes |
| Boss | 16 bars, faster, lower, more drums | yes |
| Hub, menu or level select | 16 bars, sparse | yes, quiet |
| Level clear / win | 3 to 6 s fanfare | **no** (`MUS_END`) |
| Death, game over | 1 to 3 s | no |

- **Do not restart the whole track after a death:** play the 2-second death jingle, then resume the stage theme at the loop point, not the beginning, so the player is not hearing the same 4 bars a hundred times.
- **Vary on the second pass:** let the drums enter, move the lead up an octave, drop the harmony for four bars and bring it back; the same tune sounds new.
- **Raise the tension, do not repeat it:** the last third of a stage, a low-health warning or a timer running out can raise the tempo one notch (`music_tempo`) or add a voice.
- **Match the length to the time the player spends:** a stage played for 3 minutes with a 30-second loop is heard six times. Write 60 seconds or lengthen the stage's variety.
- **Seam:** the last bar of the loop should lead into the first; end on the dominant or a rising line, not a full stop, so the repeat does not sound like a restart.

## 5. Mix for a 40 mm speaker

- Lead voice volume 7 to 8, harmony 5 to 6, bass 9 (it is the quietest by nature), sound effects 9 to 13, `master_volume` 8 to 12 (`vly check` reports the peak: keep it under 0.6).
- No sustained tone above about 1.4 kHz: it is shrill on this speaker (`N_F6` is 1.4 kHz).
- Sound effects interrupt channel 1 and channel 3 only, so the lead stays on channel 0 and the music never loses its tune when you jump.
- Pause **lowers** the music; it does not stop it (so a random START press in `vly check` is not read as "the game is silent").

## 6. The set list every game needs (plan it in `DESIGN.md`)

Title theme (the motif, calm), a theme per stage or zone (different key, tempo and feel), a boss theme, level clear, death, game over, win. Name each by mood and BPM in the plan: "stage 1: bright, C major, 112 BPM, bouncing bass; stage 3: tense, A minor, 150 BPM, pedal point".

| Genre | A good starting feel |
|---|---|
| Platformer | bright major, 110 to 130 BPM, syncopated lead, bouncing bass |
| Puzzle, cozy | calm, 80 to 100 BPM, a repeating bass with a slowly moving melody (Satie, Pachelbel) |
| Shooter, racer | driving minor, 140 to 170 BPM, drums early, a pedal bass |
| Mystery, horror | sparse, slow, minor, long rests, a thin pulse lead and a low drone |
| Rhythm | the chart is the melody: the notes the player hits are the tune |

## 7. A process that works without ears

You cannot listen, so use the numbers: write the tune; render it (`vly run build/x.vlc --frames 3600 --wav out.wav`); check the length of the music before it loops, that the peak volume is under 0.6, that nothing is above 1.4 kHz, that the title is audible, and that the loop point lines up (the last bar resolves into the first). Then read the notes as a person would: sing the lead aloud from the note names (`N_E4, N_E4, N_E4, N_C4 ...`); if it has no shape (it goes up and down at random), it will not be memorable.

## Sources and honesty

Koji Kondo and the Mario theme: the song's key, tempo and rhythm are described in the Wikipedia and Super Mario Wiki articles, and the ragtime reading in a Brandeis article; Kondo's liking for Latin music is from a 2001 interview. Baroque writing in Castlevania and Ghosts 'n Goblins and Uematsu's influences come from fan and press analysis (HardcoreGaming101, Time Extension, The Line of Best Fit, NME); they are interpretations, not composer statements. The loop-length advice summarises game-audio writing (fatigue in short loops, longer or layered loops, variation) and is secondhand from a composer's handbook: treat the numbers in section 4 as our recommendations, which you should check by length arithmetic rather than by taste. The speaker advice (nothing useful below about 110 Hz) is a property of a 40 mm speaker, which the hardware plan uses.
