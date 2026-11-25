# Reference: public-domain melodies, ready to play (`vly tune`)

Read this when your game needs music and you want a tune that is **already good**, not one you have to invent note by note. `vly tune` is a library of 83 classical, ragtime and march melodies, each already converted to VLY-1 music data (a lead, a bass and an arpeggio voice) with notes on where it fits, how fast it is and how loud it feels. It is the answer to "the music was original but did not land": a melody that centuries of listeners have already kept is a better starting point than a fresh melody that nobody has tested.

It sits beside `vly docs ref-music` (how the four channels work, loops and variety, drums, writing your own). Read ref-music section 2b for the order of preference; this guide is how to do option 2 well: **an arranged public-domain tune that fits your game's world, transformed so it sounds like your game.**

## 1. The three-minute route

```
vly tune --tags                          # the mood and scene words you can filter by
vly tune --scene night --energy 1-2      # candidates, with tempo, key, length and a one-line note on each
vly tune gymnopedie-1                    # what it is, where it fits, and the source text
vly tune gymnopedie-1 --bars 5-12 --transpose -2 --name night_theme --out night_theme.vly
```

Then, in your game:

```
import "std/music";
import "night_theme.vly";              // the file `vly tune --out` wrote (next to this one): three btables and night_theme_play()
func start_night() { music_stop_all(); night_theme_play(); music_duty(0, 1); }   // after music_play: duty 1 is a thinner, nasal lead
func frame() { music_update(); }
```

`--out` writes (the path is whatever you give it; an import is relative to the file that imports) the btables, a `<name>_play()` function that sets `music_tempo` and starts the three voices (lead on channel 0 at volume 9, bass on the triangle at 8, arpeggio on channel 1 at 4), and a comment crediting the composer and the source. Open the file and look at it: it is plain data you may edit.

Every tune is **32 to 48 seconds** long before it loops. Use `--bars a-b` for a shorter piece (a 4-bar sting, an 8-bar menu loop) or to skip a piece's introduction.

## 2. Licence and credit (the careful version)

What we did: every tune comes from the [Mutopia Project](https://www.mutopiaproject.org/), which publishes typeset scores with MIDI files and states the licence **per piece**. We included only pieces whose page says *Public Domain*, and `sourceUrl` in `vly tune <id>` takes you to that page. Every composer is long dead (the most recent, Sousa, died in 1932; Satie 1925, Fauré 1924, Debussy 1918, Joplin 1917) and every composition was published before 1910, so the compositions are free to use in the United States and in countries that protect works for the author's life plus 70 years.

What you must still do:

1. **Credit the composer** on a title or credits screen (`"Gymnopedie No. 1, Erik Satie"`). It is courtesy, it is honest, and for a game with an arranged tune it is what players expect.
2. **Never use a recording, a sample library or somebody else's published arrangement as your source.** A composition and a recording of it have separate copyright clocks: Beethoven's sonata is free, a 1990 recording of it is not, and a modern arrangement may be protected. The library's notes are a mechanical reduction of a public-domain *edition*; the notes on the page are the composer's.
3. **Do not add a piece to your game because you remember it.** If you want a tune that is not in the library, get it from a score or a MIDI you can trace to a stated licence (section 8), check the composer's death date, and say where it came from in `DESIGN.md`.
4. **A few entries carry a caveat in their `composer` field** because the attribution to Bach is traditional but doubtful (the Minuet in G is by Petzold, "Bist du bei mir" by Stölzel, and the *Notebook for Anna Magdalena Bach* pieces are of uncertain authorship). Credit them as the field says.
5. Modern music is a different thing: a film theme, a game theme (the Game Boy *Tetris* tune is the folk song *Korobeiniki*, but the *recording* and the NES arrangements are protected), a pop song. Never arrange those.

(Not legal advice: this is how a careful maker treats it.)

## 3. Choose by vibe, not by fame

Every entry has a **mood** (words like `dreamy`, `stormy`, `jaunty`), **scenes** it suits, an **energy** from 1 to 5, a **tempo** and a **meter**. The energy is a judgement; the tempo and meter are facts. Use them like this:

| Energy | Feels like | Typical tempo | Where in a game |
|---|---|---|---|
| 1 | still, spacious, a held breath | 50 to 70 bpm | night, a lullaby, a sad ending, credits, a quiet menu |
| 2 | gentle and steady | 65 to 95 bpm | hub, village, exploring safely, a tutorial |
| 3 | moving, bright, purposeful | 95 to 125 bpm | a normal stage, a title that wants to start something |
| 4 | brisk, bouncing, urgent-but-fun | 115 to 150 bpm | a chase, a parade, a festival, a lively stage, victory |
| 5 | driving, stormy, relentless | 130 bpm and up (or minor and heavy) | boss, final battle, a disaster |

**Meter is mood.** 2/4 and 4/4 march and walk; 3/4 waltzes (a ballroom, a carousel, a lullaby when slow); 6/8 and 9/8 lilt and rock (a boat, a lake, a cradle, a jig); a piece in 2/2 with dotted rhythms is a military march. **Mode is mood:** minor keys feel serious, dark or yearning; a minor tune played fast is a chase, played slowly is sorrow.

A guide to the scenes (the full list: `vly tune --scene <word>`):

| Scene | Good starting points |
|---|---|
| **Title (bright)** | `eine-kleine-nachtmusik`, `liberty-bell-march`, `ode-to-joy`, `schubert-marche-militaire`, `royal-fireworks` |
| **Title (dramatic)** | `toccata-and-fugue-dm` (first bars as a sting), `symphony-5-reduction`, `pathetique-1` |
| **Hub, town, menu** | `mozart-k331-theme`, `bach-minuet-in-g`, `handel-gavotte`, `bach-bourree-english-suite`, `sun-flower-slow-drag`, `peacherine-rag`, `an-die-musik` |
| **Meadow, farm, village** | `bach-sheep-may-safely-graze`, `heidenroslein`, `seasons-august`, `glueckes-genug` |
| **Exploring, adventure** | `etude-op10-1` (rolling), `mozart-gigue`, `bach-bourree-e-minor`, `von-fremden-landern` (a journey begins), `arabesque-1` |
| **Platformer, comic, caper** | `maple-leaf-rag`, `the-easy-winners`, `elite-syncopations`, `breeze-from-alabama`, `minute-waltz`, `rondo-alla-turca` |
| **Water, boat, lake** | `auf-dem-wasser-zu-singen`, `die-forelle`, `etude-op25-1`, `bach-prelude-in-c`, `clair-de-lune` |
| **Night, calm, sleep** | `gymnopedie-1`, `gymnopedie-2`, `clair-de-lune`, `schubert-wiegenlied`, `faure-berceuse`, `traumerei` |
| **Ballroom, party** | `chopin-waltz-bminor`, `traviata-valzer`, `traviata-brindisi`, `beethoven-menuett`, `brahms-waltz-15` |
| **Market, festival, parade** | `seasons-february`, `napolitan-dance`, `traviata-zingari`, `traviata-mattadori`, `liberty-bell-march`, `el-capitan` |
| **Tension, dungeon, haunted** | `tempest-1`, `beethoven-quartet-4-1`, `quartettsatz`, `mozart-symphony-25-1`, `mozart-dies-irae` (use sparingly) |
| **Chase** | `fantaisie-impromptu`, `erlkonig`, `appassionata-3`, `quartettsatz`, `rondo-alla-turca` (a light chase) |
| **Boss, final battle** | `pathetique-1`, `symphony-5-reduction`, `appassionata-3`, `erlkonig`, `toccata-and-fugue-dm` |
| **Victory, fanfare** | `royal-fireworks`, `traviata-brindisi`, `liberty-bell-march`, `ode-to-joy` |
| **Sad, loss, ending** | `chopin-prelude-4`, `chopin-prelude-20` (12 bars, very strong), `pathetique-2`, `bach-air-on-the-g-string`, `solace`, `bethena`, `mozart-marche-funebre`, `death-and-the-maiden` |

Do not pick a tune for being famous. A tune everybody knows pulls the player out of your game ("that is the Beethoven one") unless the reference is the joke. Prefer the second tier: `bach-bourree-english-suite` will not distract anyone, and `etude-op10-1` sounds like an adventure without sounding like a quotation.

## 4. Pace the whole soundtrack

A game is played over minutes, so plan the score as a **curve of energy**, not as a pile of nice tunes. In `DESIGN.md`, write a set list before you pick pieces:

| Moment | Energy | Notes |
|---|---|---|
| Title | 3 | has the game's motif or sets its mood; leave room for "press start" |
| Hub / menu | 1 to 2 | quiet and sparse; the player will stay here a while |
| Stage 1 | 3 | the one the player hears most: choose the most singable |
| Stage 2 and 3 | 3 to 4 | **a different key, tempo, meter or composer** from stage 1 |
| Danger (low health, a timer) | raise the tempo 10 to 20% | `music_tempo` one notch lower, or add the arpeggio voice |
| Boss | 5 | faster, minor, busier; drums on channel 3 (see ref-music) |
| Victory | 4 | 3 to 6 seconds, then silence or the hub tune; no loop |
| Sad or ending | 1 | the quietest moment; it should feel like the end of a breath |

Rules that held up:

- **Do not put two tunes of the same composer or the same meter next to each other.** Four stages of Chopin waltzes blend into one. Change composer, meter *and* key between neighbours.
- **Use classics for places and your own motif for people.** Put a short motif of your own (3 to 6 notes, see ref-music section 3) in the title, in the boss tune and at the ending; the classics give the places their atmosphere and your motif ties them together. This keeps the identity that makes a game's music its own.
- **Do not use more than about six classics in one game**, and play a loud one (energy 4 or 5) only when the screen is doing something. A whole game at energy 4 has no highs.
- **Loop long enough.** A stage lasts 2 to 4 minutes, so a 35-second loop is heard four to six times. Chain two tunes of the same mood (an A tune and a B tune, 16 bars each) as one loop, or change the voices on the second pass (drop the arpeggio for the first pass, add it for the second).
- **Silence is a tool.** Stop the music for a moment before a boss or at a quiet cutscene; the entrance is stronger.
- **A stinger is the start of a tune.** `vly tune toccata-and-fugue-dm --bars 1-2 --name boss_sting` is a two-bar "something has appeared"; end it with `MUS_END` (254) instead of the loop byte 255 if you want it to stop (edit the last byte).

## 5. Make it yours (transformations that keep the tune and change the feel)

The tune is a starting point. Change at least three of these so the music belongs to your game, and say what you changed in `DESIGN.md`:

| Change | How | Effect |
|---|---|---|
| Tempo | `--bpm 90` or `--fps 12` (frames per step) | slower is solemn, faster is a chase; 20 to 30% either way is safe, more starts to sound odd |
| Key and register | `--transpose -5` (semitones) | a lower key is darker; the machine plays C2 to B6, the converter refuses what falls outside |
| Which bars | `--bars 9-16` | the tune's best phrase, without the introduction |
| Lead timbre | `music_duty(0, d)`: 0 thin, 1 nasal, 2 square, 3 full | the quickest way to a new sound world |
| Voices | `--no-arp`, or drop the bass | fewer voices: sparer and calmer; more voices: busier |
| Octave | edit the lead by +12 or -12 | a brighter or a darker lead (keep the lead between C4 and C6) |
| Drums | add noise on channel 3 by hand | a march or a rock beat turns a piano piece into game music |
| Ending | change the last notes to a cadence or a held note | gives you a proper ending or a clean loop seam |
| Echo | the same lead a few steps later at a lower volume | an old-console shimmer |

Do not change the *notes of the tune itself* (the order and the rhythm of its first phrase). That is what players will recognise, and the reason you chose it.

## 6. What the converter did, and what it could not

The library is an **automatic reduction** of a piano or ensemble score to three voices. Know its limits:

- **Lead** = the highest note sounding at each step on the right-hand side (at or above middle C). That is usually the tune, but a tune that is carried by an inner voice, or that crosses between hands, is not. `bach-prelude-in-c` has no melody on top at all: its "lead" is the top note of each broken chord, a pleasant running background, not a tune.
- **Bass** = the lowest note below middle C, **moved up an octave if it was below A2** (a 40 mm speaker has almost nothing under 110 Hz). That keeps the bass audible but can change the contour of a wide bass line.
- **Arpeggio** = up to three chord tones cycled one per step, a stand-in for the harmony. On a fast tune (3 or 4 frames per step) it becomes a buzz of 15 or more notes a second: use `--no-arp` or a slower `--fps` there.
- **Introductions and endings come with the piece.** Several pieces begin with a few bars of accompaniment before the tune enters (the Gymnopedies, Clair de lune, the Brindisi), and an excerpt may end mid-phrase. Use `--bars` to start where the tune starts and to end on a phrase end.
- **Dense tunes make a busy lead**: `appassionata-3`, `fantaisie-impromptu`, `etude-op10-1` and the Chopin etudes play 8 to 15 notes a second on the lead. That is the sound of the piece, but it can tire a listener fast and it leaves no space for a sound effect.
- **Tempo and key are estimates.** The tempo is the one we set per piece (a MIDI file often has none), rounded to a whole number of frames per step, so a stated 120 bpm may play at 112. The key name is guessed from the notes (a piece that moves around may be reported as a neighbouring key). Neither affects playing.
- **The first notes were checked against melodies we know** (*Ode to Joy*, the *Minuet in G*, *Rondo alla Turca*; `test/tunes.test.js`). The other 80 were not checked note by note, only converted and played (every tune compiles, runs without a fault and is audible). **If a tune is the heart of your scene, check its opening against a score you can read before you rely on it**, and tell us (in `DESIGN.md`) if it is wrong.

## 7. Check it without ears

1. **Play it and read the notes:** `vly run build/x.vlc --frames 600 --audio --notes 40` lists each channel's notes with names, start times and lengths, so you can compare the first notes of the lead with the score.
2. **Check the range:** the lead stays between C4 and C6 (the table in ref-music), the bass between A2 and C4. `vly tune <id>` prints the lead range.
3. **Check the speed:** a step of 3 frames or less on the arpeggio is a buzz; a lead above 8 notes a second is frantic. `vly check` also warns when a game plays one of the five stock `std/tunes` loops.
4. **Check the seam:** play it through twice (`--frames` 2x its length) and look at where the loop restarts: a full stop in the notes sounds like a restart.
5. **Play it under the game**, with sound effects (they take channel 1, which is why the arpeggio lives there and never the only melody).

## 8. Beyond the library

You may want a piece that is not here: a folk song for a harbour, a hymn, another movement.

1. **Find a source with a stated licence.** The Mutopia Project (filter by licence; open a piece page, read the licence and the composer's dates) offers MIDI and typeset scores. The International Music Score Library Project (IMSLP) is huge but its copyright rules depend on the country and the edition, and a modern edition or arrangement can be protected even when the composer is old: use a score or MIDI whose page states a public-domain or CC0 licence, never an unverified MIDI collection.
2. **Convert it:** `vly tune --midi piece.mid --bars 1-16 [--bpm 110] [--split 60] [--transpose -2] [--name harbour] [--out harbour.vly]` prints the first notes (compare them with the score), the range and the tempo, and writes the same three btables and play function. `--split` is the MIDI note below which notes count as bass (60 is middle C); lower it for a piece that sits low (a lute or a bass-heavy piece), or raise the whole piece with `--transpose 12`.
3. **Short, famous, old tunes** (a folk song, a hymn) you may transcribe by hand from a score you can read. Do not trust memory for the notes of a tune: a language model's memory of a melody is often wrong in a few notes, and a few wrong notes make a tune sound broken rather than different. Put the score source in `DESIGN.md`.
4. **Recordings, samples and sheet music of living composers are not sources.** If you cannot say where a melody came from and when its author died, do not use it.

## What to write down

In `DESIGN.md`: the set list (moment, energy, tune id, composer, the changes you made), the motif of your own and where it returns, where each classic came from (`vly tune <id>` prints it), and the credits line for your title or credits screen.

## Sources and honesty

- The tunes are converted from the Mutopia Project's MIDI files for pieces whose pages state *Public Domain* (the list and the build date are in `src/tools/tunelib.json`; `scripts/build-tunelib.mjs` rebuilds it). The tempo, the excerpt, the moods, scenes and energy are our curation.
- The licence and copyright statements here come from reading the sources' own licence descriptions and from the general rule that a composition's copyright lasts for the author's life plus a term (70 years in many countries), that recordings and editions are protected separately, and that the United States protects works published before 1931 as public domain. They are a careful maker's practice, not legal advice. If a game is going to be sold at scale, ask somebody qualified.
- Arranging *Korobeiniki* for Tetris, and Bach's work as a source for other game tunes, are the standard examples of old music working in a game; the lesson is the choice and the transformation, not the quotation.
