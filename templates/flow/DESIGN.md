# {{name}}: design (an example of the plan to write before you build)

**The game in one sentence.** (Replace this: who it is for and what the player does, in a line a child could repeat.)
This template is only the front end every game needs: splash, menu, how-to page, level grid with grades, saves.

**What makes it theirs.** (A name, an in-joke, a rule the person asked for. Put it in the title, the story and the levels.)

**Controls.** Arrows move, A or START choose, B goes back. In a level: LEFT/RIGHT pick a stitch, A applies it. No SELECT, no undo.

**Screens.** Splash, menu (CONTINUE first when there is a save; NEW GAME asks before erasing, KEEP by default), story, how-to page of pictograms, level grid, level, result.

**Content table.**

| Levels | Theme | New idea | Set piece | Music |
|---|---|---|---|---|
| 1-3 | first stitches | +1 and +3 | none | title tune |
| 4-12 | longer goals | combine them | none | title tune |

**How progress works.** Beating a level opens the next; the grid starts on the next unbeaten level; beaten levels can be replayed to improve a grade. Grade = turns against the minimum (AAA at par). Saved after every finished level.

**Different from the nearest sample game because** (say how, in a sentence).

## Done when

- [ ] the menu opens on CONTINUE when there is a save, and NEW GAME confirms with KEEP selected
- [ ] the how-to page shows at every startup
- [ ] every level's grade is saved and shown in the grid
- [ ] a replay clears level 1 with AAA
- [ ] an old release's save loads and the game carries on from it
