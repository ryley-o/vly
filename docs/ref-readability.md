# Reference: seeing what is selected (contrast, colour-blind players and four shades)

Read this whenever a screen has a cursor, a selected row, a highlighted level, a picker, or anything the player must tell apart from its neighbours: menus, level grids, inventories, keyboards, maps, boards. It is a reference guide to the design playbook (`vly docs design`).

**Quality bar:** from one screenshot, with the real palette, a stranger can point to what is selected, in grey, and as a red-blind or green-blind player sees it. The selected thing differs from its neighbours by **brightness**, not only by hue, by a lot of pixels, and (where it matters) by **shape or position** as well. A cursor that moves must visibly change the picture.

Owner feedback after a dozen games: in several (a level-select grid most recently) "I cannot see what I'm highlighting". Each had a highlight that looked fine to its author's eyes and failed for a person: a hue change, a one-shade change or a thin outline in a colour that matched the cell.

## 1. What the research says (and how sure we are)

(**[S]** from a source we read, as search summaries and not full texts; **[I]** our inference. Sources at the end.)

- **Selected and focused states need contrast.** W3C's Non-text Contrast criterion (WCAG 1.4.11) asks for at least **3:1** between a component's state indicator (a selected or focused state, a check mark, an open-state arrow) and the colours next to it **[S]**. If colour is the only way to show which control is selected, the colours involved must reach 3:1 against each other; W3C's own failing example is a star rating that changes from yellow to white at about 1.2:1 **[S]**. A focus indicator is not required, but if you draw one it must meet the 3:1 ratio **[S]**. A separate criterion, Focus Appearance (WCAG 2.2), measures the contrast between the **focused and unfocused states of the same pixels**; we use that idea in `vly highlight`. (We could not confirm from our results whether it is level AA or AAA in the final text; check before citing a level.)
- **Do not rely on colour alone.** The Game Accessibility Guidelines list "no essential information conveyed by colour alone" at their **Basic** tier, and Xbox's accessibility guidelines say the same; the usual fix is a **redundant cue**: shape, symbol, texture, pattern, position or a text label **[S]**. Avoiding colours of similar *lightness* regardless of saturation, and exaggerating the difference between foreground and background, are common practitioner tips **[S, secondary]**.
- **On a four-shade screen every decision is contrast management** **[S]**: foreground and background separation is the constant struggle, and a lighter enemy shade blended into the background; one developer used the background colour for the cursor outline and the cursor vanished **[S]**. The stock grey palette is the best way to preview art meant for the real hardware **[S]**.
- **Colour blindness changes what you see.** About one in twelve men and one in two hundred women have a red-green deficiency (a figure commonly cited; we did not check it here **[I]**). For a red-blind (protan) or green-blind (deutan) player a red and a green of the same brightness are nearly the same colour. The standard simulation is Machado, Oliveira and Fernandes (2009) **[S]**, which `vly run --cvd` and `vly contrast` use.
- **Luminance is what survives.** Brightness differences survive red-green blindness, a grey screen and a dim handheld; hue differences do not. **[I]** On this console, choose highlight colours by brightness first and hue last.

The numbers we use: relative luminance `L = 0.2126 R + 0.7152 G + 0.0722 B` on linearised sRGB, and contrast `(L1 + 0.05) / (L2 + 0.05)` (WCAG; from our own knowledge, not from the search results, and implemented in `src/tools/colorvision.js`). **3:1** is the minimum for a state indicator and for icons; **4.5:1** for small text; **7:1** is comfortable.

## 2. Why this goes wrong on this console

- A palette has **four colours** and a tile uses one palette. A highlight that is "colour 2 instead of colour 1" of the same palette is often one brightness step: about 1.3:1 to 2:1.
- **Hue-only highlights** (the cell goes from green to teal, from red to orange) are what authors see and players do not.
- **Thin outlines** (a one-pixel frame) vanish on a dense board; a **tiny arrow** is easy to lose.
- **A cursor that blinks** is invisible half the time; if the off phase hides it, a screenshot shows nothing.
- **A cursor drawn in a colour that matches its surroundings** (the cell's own colour, the page background, the grid line).
- **A selected state is only checked in the one screenshot where it looked right.**

## 3. Patterns that work (strongest first)

1. **Invert the selected item.** Swap background and ink: a light bar with dark letters in a dark list, or the reverse. It changes the most pixels by the most brightness, and works in grey and under every colour deficiency. For `std/ui` menus it is two lines: define palette 1 as the inverse of palette 0, then `menu_gap = 2; menu_sel_pal = 1;` before `menu_open` (blank row between items, selected item inverted). By hand, in VLY: a second background palette with colours 0 and 3 swapped, and draw the selected item with `text_pal = 1` (redraw the rows when the selection moves; a menu built this way passed `vly highlight` at 100% under every vision, with 1,280 pixels changing per move):

   ```
   bg_pal(0, rgb(1, 2, 6), rgb(4, 6, 12), rgb(9, 11, 15), rgb(15, 15, 15));   // dark background, light ink
   bg_pal(1, rgb(15, 15, 15), rgb(9, 11, 15), rgb(4, 6, 12), rgb(1, 2, 6));   // inverse: light background, dark ink
   func draw_row(i, s) { text_pal = sel == i ? 1 : 0; text(2, 4 + i * 2, s); text_pal = 0; }
   ```
2. **A thick, two-tone frame** (2 pixels) around the selected cell: a light line with a dark line outside it, so it reads on both a light and a dark neighbour. Draw it on the item's edge, not in the colour of the cell.
3. **A shape marker** (an arrow, brackets, a hand) *plus* another cue. Give it a dark outline and a light fill (or the reverse) so it is visible on any background.
4. **Change the item, not only its surroundings**: lift it a pixel or two, enlarge it, give it a different tile (a lit window, an open door), or dim every *other* item (keep the dimmed items readable at 3:1).
5. **Name it.** A line of text ("LEVEL 12: THE CLAQUE"), an icon in the corner or the item's label, so the selection is also legible as words.
6. **A sound** on each move (`sfx_play`) as a redundant channel, never the only one.
7. **Blink only as an extra**, with both phases visible; never let the off phase hide the cursor.

**Do not soften a selection by default.** In one puzzle game the board cursor was a full inversion (a cream cell with dark silhouettes and a white frame). The first reaction was "a little extreme", so it was changed to a soft spotlight (about 5:1) with a lilac frame. After playing both, the owner preferred the original: on a puzzle board the cursor is the thing you look at all the time, and the strong version was easier to follow. So:

- **Keep the strong treatment (pattern 1 or 2) as the default**, on menus, lists and puzzle boards alike. "Extreme" is not a defect when the player is steering the cursor all the time; being hard to see is.
- **Soften only for a reason you can show:** the cursor hides the item the player must read (give the item's name in words, as the label line below the board does, before you weaken the cursor), or it flashes on every step of a held direction.
- **If you do soften it, test both versions with the person** (or keep the strong one): both pass `vly highlight`, so the tool cannot choose for you.
- Check the other direction too: the label line, so the player always knows *what* the selected item is.

## 4. Choosing four colours for a screen with a selection

1. **Fix the brightness order first**, darkest to lightest, with at least 3:1 between the two extremes and the highlight pair: for a dark screen, entry 0 darkest and 3 lightest; reserve the lightest and the darkest *for the highlight and the text*.
2. **Give the other two entries a spread of brightness**, not just hue: 0, about 25%, about 60%, 100% is a good start.
3. **Use hue as flavour**, after brightness is settled (warm or cool, a tint for a world). Keep red and green apart in brightness, or add a shape (a tick and a cross, a symbol per team).
4. **Check pairs with `vly contrast "#rrggbb" "#rrggbb"`**: it prints the ratio normally and for protan, deutan, tritan and grey, and says whether the pair is at least 3:1 everywhere. (A colour is `rgb(r, g, b)` with 0 to 15 per channel; multiply by 17 for the hex digits: `rgb(9, 11, 15)` is `#99bbff`.)
5. **The level grid, the inventory and the picker are the usual victims**: many similar cells, a small cursor. Use pattern 1 or 2, and test them on the busiest screen.

## 5. Test it (do all four, they take a minute)

1. **Look at the real screenshot** at native size, with the cursor on a cell in the *middle* of the grid and on the first and last.
2. **See it as other players do:** `vly run build/x.vlc --input "..." --screenshot s.png --cvd all` writes `s.png` plus `s.protan.png`, `s.deutan.png`, `s.tritan.png` and `s.gray.png`. Open all of them. Can you still point to the selection?
3. **Measure it:** `vly highlight build/x.vlc --input "START@30,A@90"` runs your input to the screen, moves the selection one step in each direction, and reports how many pixels changed and what share of them change by at least 3:1 (and 1.5:1) under normal, protan, deutan, tritan and grey vision. It fails when the change is weak for some players. The thresholds are our estimates; a single arrow is flagged "small".
4. **Lock it in:** add a `vly.json` frame-hash test for the selected state of each screen (`"frameHash": "auto"`), so a later palette change cannot silently remove the highlight.

## 6. Anti-patterns

- **Text the screen edge cuts.** A scrolled background moves every row of its map, including a status line drawn in it: a trial's level label read "-5 THE ROUND" on the 11-wide boards because `scroll(8, 0)` pushed its first character off the screen, and nobody noticed for two revisions. Draw HUD text where the scroll cannot move it (the window layer, or sprites, or shift the text by the scroll), keep every line 8 px inside each edge, and run `vly check`: its `text_clip` check reports any line of text that is partly off the screen (a line cut by a scroll, a label that runs past column 20). Look at the top-left corner of every screen at native size too, on the *widest or most unusual* screen of the game, not on a typical one.
- A highlight that is a different hue at the same brightness.
- A cursor so strong that it blanks the item beneath it with no label saying what the item is.
- A one-pixel outline, or an outline the colour of the cell, the page or the grid.
- A cursor that exists only in a blink's on phase.
- Red against green (or green against orange, or blue against purple) with no brightness or shape difference, for good against bad, teams, or selected against not.
- A selection checked only in your own screenshot, only in colour, only on a bright monitor.
- Hiding the selected item's name: the player knows *where* the cursor is but not *what* it is.

## What to write down

In `DESIGN.md`: how a selection is shown on each kind of screen (menu, level grid, picker), the palette's brightness order, the contrast ratios of the highlight pair (from `vly contrast`), and the result of `vly highlight` and the `--cvd` screenshots.

## Sources and honesty

Read as search summaries (not full texts): W3C Understanding Success Criterion 1.4.11 Non-text Contrast and the WCAG 2.2 Focus Appearance pages (3:1 for selected and focused states; the yellow-to-white 1.2:1 failing example; colour-only states must reach 3:1; focus indicators are optional but must meet the ratio); the Game Accessibility Guidelines page on no essential information conveyed by fixed colour alone and Xbox Accessibility Guideline 103 (colour-alone, redundant cues, customisation); developer notes on four-shade palettes (contrast management, the invisible cursor outline); the authors' page and the `colour` library's source for the Machado, Oliveira and Fernandes (2009) colour-vision-deficiency matrices (severity 1.0, applied to linear RGB). The luminance and contrast formulas are from our own knowledge of WCAG. The prevalence figure for red-green deficiency is commonly cited and not checked. The thresholds in `vly highlight` (3:1 on half the changed pixels under every vision; 24 pixels as "small") are our estimates, not a standard. We did not run a study with colour-blind players: test with them if you can.
