# Reference: the shape of a game, exploring it, and making it beautiful

Read this when you are choosing what kind of game yours is (before you plan the levels) and again when it feels like "a scroller with checkpoints and an ending". It is a reference guide to the design playbook (`vly docs design`): the playbook says a game needs stages, a front end and an ending; this says what shapes a game can take, what makes a place worth exploring, and how a four-colour screen can still feel alive.

**Quality bar:** the structure is a choice that follows from your story and your mechanic, not a default. The player can move around and discover the world in a way that suits the character; there is a first small secret within a minute; at least one place has a palette, a sound and a mood that people would remember as "the beautiful bit"; and the ending feels like the place the whole game was heading to.

Our trials produced three games that were all a horizontal scroller with checkpoints and an ending. That shape is excellent when the story *is* a journey from here to there. It is a rut when it is only the default.

## 1. Ten structures, and when to choose each

(**[F]** a source describes it; **[I]** our inference. "Data" and "save" are what each asks of your level data and of the 1 KB save.)

| # | Structure | Classic example | What it asks of data and save | Choose it when |
|---|---|---|---|---|
| 1 | **Linear stages with checkpoints** [F] | Shovel Knight (a checkpoint can be broken for gold, at the cost of a farther respawn) | ordered scrolling maps; stage number, gold | a skill or rhythm game around one mechanic; the story is a journey |
| 2 | **Single-screen rooms** [F] | Celeste's chapters (rooms with optional strawberries), arcade Donkey Kong | one small tile map per room; room count, collectible bits | a precise, tight mechanic; many rooms are cheap to author |
| 3 | **Interconnected map with ability gates** [F] | Super Metroid, Hollow Knight (rooms linked from the start, abilities open the way, shortcuts, tolerated sequence breaks) | a room graph, gate flags, item flags; ability, item and visited-room bits (a few hundred bits fit in 1 KB) | the story is about growing able to go back, and your mechanic grows (dash, climb, swim) |
| 4 | **World map with levels and secret exits** [F] | Super Mario World (a second exit unlocks shortcuts) | a map graph plus exit flags per level; bits per exit | many short, varied levels |
| 5 | **Hub with unlockable doors** [F] | Super Mario 64 (paintings lead to courses; collected stars open more) | one hub plus N small stages; star bits | each place has its own palette and mood |
| 6 | **Top-down overworld of themed screens** [F] | Link's Awakening on the Game Boy (a 2 x 2 screen block layout, with buffer screens so tile sets do not clash while scrolling) | a screen grid with a tile set per block; item and flag bits | exploration and a "big island" feel |
| 7 | **Roguelike run** [F] | Spelunky (rooms from templates placed along a solution path) | room templates plus a seed; best score and unlocks | replay matters more than authored beauty |
| 8 | **Time loop** [F] | Majora's Mask (a three-day cycle: quests reset, tools and masks stay) | a small town with schedules; kept-item bits | a compact world revisited with new knowledge |
| 9 | **Survival cycle** [F] | Rain World (a rain clock forces returns to shelter; karma gates regions) | regions of rooms; karma, region | tension and wildlife (**[I]** the ecosystem AI is probably too costly for this hardware) |
| 10 | **Score chase, endless runner or vertical climber** [I] | arcade games | a few tile chunks plus a seed; top scores | the smallest scope, a pick-up-and-play game |

Also: **an easy main game with a hidden hard mode** [F] (Kirby's Dream Land's Extra Mode; its director said the main game was made kind to beginners on purpose), and **a long single level** (a journey with no stage breaks).

## 2. How to choose (a method)

1. **Write the story as one sentence:** "[Character] wants [goal] but [obstacle]."
2. **Name the verb the character does best** (jump, dash, climb, swim, whisper).
3. **Pick the structure whose unit matches the verb:** a precise verb with short tests suits rooms; a verb that grows suits an interconnected map; many moods suit a hub; a journey suits one long level; knowledge you carry back suits a time loop.
4. **Check the budget:** rooms times bytes per room, plus the flag bits against the 1 KB save; levels as data in banks (`vly docs ref-sidescroller`, "How long a stage is").
5. **Decide what is beautiful:** one place whose palette, music and weather are the point.
6. **Ask "what is the first secret within 60 seconds?"**
7. **Reject "a horizontal scroller with checkpoints and an ending"** unless the story really is a journey, and say in `DESIGN.md` why you chose what you chose.

## 3. Exploration: what makes it satisfying

- **Reward curiosity quickly.** **[F]** Miyamoto has described exploring caves and a lake as a child and returning to the cave with a lantern; the first Zelda puts a cave in front of the player at the start and pays curiosity with a sword. **[I]** Give a small secret within the first minute.
- **Signal what is out of reach.** **[F]** Super Metroid shows glimpses of hidden rooms, uses unusual blocks to mark gates and doors that need a specific weapon, and plants hidden shortcuts so backtracking is not dull; one-way drops narrow the player's focus; a new ability sends the player back to rooms they remember.
- **Let the player get lost and find the way.** **[F]** Hollow Knight's team aimed at that feeling; its map is partial and filled in by the player. **[I]** On a tiny screen, a landmark you can see from far away does the work of a map.
- **Do not turn the map into errands.** **[O]** Too many explicit locks feel like chores; give abilities several uses (progress, shortcut, combat).
- **Rewards that explorers value:** secrets and shortcuts, collectibles, abilities, new regions, places that are simply lovely to find. Lore and vistas are rewards too (**[I]**: we found little direct sourcing).
- **What the character does while exploring should feel good in itself** (`vly docs ref-sidescroller` for the feel of moving): if running through the world is a pleasure, the player explores for the sake of it.

## 4. Beauty and atmosphere on 160 x 144 pixels and four colours

Cheap, concrete techniques (sources at the end; the machine facts are this console's):

- **A palette per place.** The console has 8 background and 8 object palettes of four colours; change them per area (`bg_pal`, `obj_pal`). **[F]** On the Game Boy, choosing which of four shades each tone maps to is almost free, and Link's Awakening inverts an object palette for effect. A dark cave, a bright beach, a white flash: the same art, a different mood.
- **Layers of depth.** There is one scrolling background, so fake parallax with a few large, slow sprites (clouds, distant hills drawn as sprites) and by drawing the foreground as sprites that move faster. Keep the layers to sky, far hills and ground (**[I]**).
- **Animated tiles.** Cycling a few tiles' pixels animates water, grass, torches, rain and waves; it costs one `load_tiles` of a few tiles a few times a second. **[F]** Link's Awakening's opening animates its waves by rewriting tile data.
- **Fades and flashes.** **[F]** Link's Awakening fades to white between inside and outside. A fade or flash is only palette writes (`std/fade`; a fade step costs about 31,000 cycles, so do it on a quiet frame).
- **Fake translucency.** **[F]** Drawing a sprite only on alternate frames fakes transparency (the same trick as blinking invulnerability). Good for ghosts, water, glass.
- **A camera reveal.** **[I]** Hold the camera, then scroll to a vista; look at it for a moment; return control. Costs nothing.
- **Quiet.** **[F]** Abzu goes silent when you surface; Journey follows a three-part emotional arc. **[I]** Stop the music for a quiet moment, then bring one voice back.
- **Music and sound by place.** One tune per place, a different key and tempo and instrument (`vly docs ref-music`), and sound effects that belong to the world (wet footsteps, wind), not just beeps.
- **Characters that react to the world.** **[F]** Swink's "game feel" principles cover polish and appealing reaction. **[I]** Squash on landing, a puff of dust, the character shivering in snow, looking up at a vista, slowing in mud: a few frames each, and the world feels shared.
- **One distinctive silhouette per thing.** Enemies, pickups and hazards recognisable at a glance in four colours (`vly docs design`, section 2).
- **One place that is the point.** Choose the single most beautiful place in the game and spend your effort there: its own palette, its own tune, its own weather, a quiet moment, something to find.

## 5. Endings and replay

Alternatives to "checkpoint, last boss, credits":

- **A return** (the character gets home, and home has changed because of what they did).
- **A changed world** (the hub or the first stage now looks different, with the colours back, the lights on, the water clean).
- **An epilogue walk** (a short, quiet, playable stretch with no danger).
- **Completion as a goal** (a percentage of the map, every secret found, a time record, grades per stage).
- **A harder second pass** [F] (the first Zelda's Second Quest rearranged its overworld and dungeons; Kirby's Dream Land hid a hard Extra Mode; Majora's Mask resets time but keeps your tools). Beware: "new game plus" fits an interconnected map poorly.
- **An ending that changes what the mechanic means** (`vly docs ref-originality`).

Whatever you choose, **give the player a reason to be glad they finished,** and say so in the last screen in as few words as possible.

## Sources and honesty

Read through a summarising fetch tool (summaries, not verbatim): Video Game Chronicle on Miyamoto's childhood explorations and the first Zelda; Game Developer on Super Metroid's level design and "invisible hand", and on Rain World's ecosystem; Yacht Club Games' post on checkpoint design (Shovel Knight); the zladx.github.io write-up of Link's Awakening's special effects; mdagois.github.io on Game Boy parallax; Game Developer on "principles of virtual sensation" (Swink's game feel); Nintendo Life on Kirby's Dream Land (Sakurai); an abstract of a GDC talk on exploration; a partial Game Developer piece on how Hollow Knight's developers mapped their world. Seen only in search results (so treat as lower confidence): Super Mario World's secret exits, Super Mario 64's hub, Majora's Mask's time loop (Aonuma), Spelunky's room templates, Celeste, Abzu's silence, Journey's emotional arc, New Game Plus. Not found: Super Mario Bros. 3's map, vertical climbers and endless runners (our category 10 is our own inference), Metroid II, Swink's book chapters, Ori and Journey talk content. Several pages (a Metroidvania map article, a Zelda dungeon site, a Celeste summary) were unavailable. The structure table's "data and save" column and the method in section 2 are our own synthesis.
