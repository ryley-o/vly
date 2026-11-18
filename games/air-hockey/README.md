# AIR HOCKEY for the VLY-1

You (red, left) against the computer (blue, right). First to 7 goals wins. Four computer levels: ROOKIE, PRO, CHAMP and
LEGEND (LEGEND opens when you beat CHAMP once). Your win/loss record per level, and your fastest shot, are kept in the save.

Controls: D-PAD moves your mallet, START pauses (SELECT then quits to the menu), A / START choose in menus, B goes back.
If the puck lies still in your half for 7 seconds you lose the point (the arcade shot clock).

```
vly build                    # build/hockey.vlc
vly test                     # 14 tests: menus, pause, three whole matches (bots), saves, screen hashes
vly check src/main.vly --input-file tests/win_rookie.input      # quality gates, also playing a recorded whole match
node tools/mkart.mjs         # regenerate the table art, big letters and sprites (needs tools/font.json)
node tools/rate.mjs 20       # win rate of three bot "humans" (novice / average / expert) against each level
node tools/stress.mjs 3000   # tunnelling / sanity stress test of the puck physics
node tools/record.mjs 0 win 1 average tests/win_rookie.input   # record a bot's whole match as an input script
```

Files: `src/main.vly` (screens and flow), `src/physics.vly`, `src/ai.vly`, `src/sound.vly` (effects and music),
`src/table_data.vly` (generated), `assets/*.tiles` (generated), `tools/` (generator, bots, stress test).
