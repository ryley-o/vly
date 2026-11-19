// std/flow: taps, holds and releases told apart; the KEEP/ERASE confirm; per-level grades in the save; the level-select grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compileToCartridge } from '../src/lang/index.js';
import { Machine } from '../src/core/machine.js';
import * as C from '../src/core/constants.js';

const B = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, A: 16, B: 32, START: 64, SELECT: 128 };
function play(src, script, vars) {
  const r = compileToCartridge(src, { filename: 'm.vly', readFile: () => '' });
  const m = new Machine(r.bytes); m.boot();
  const log = {};
  const read = (n) => (m.read16(r.stats.ram[n].addr) << 16) >> 16;
  for (let f = 0; f < script.frames; f++) { m.runFrame(script.at(f)); for (const v of vars) (log[v] ||= []).push(read(v)); }
  return { log, last: (v) => log[v][log[v].length - 1], read };
}
const held = (list) => (f) => list.reduce((b, [mask, from, to]) => (f >= from && f <= to ? b | mask : b), 0);

const BUTTONS = `import "std/flow";
var taps; var holds; var rels; var frames_b;
func init() { load_font(0); lcd(LCD_BG); }
func frame() { bt_update(); if (bt_tap(BTN_B)) { taps++; } if (bt_hold(BTN_B, 12)) { holds++; } if (bt_released(BTN_B)) { rels++; } frames_b = bt_frames(BTN_B); }`;

test('buttons: a short press is a tap on release, a long hold fires once and is not a tap, release is separate', () => {
  const tapOnly = play(BUTTONS, { frames: 60, at: held([[B.B, 10, 15]]) }, ['taps', 'holds', 'rels']);
  assert.deepEqual([tapOnly.last('taps'), tapOnly.last('holds'), tapOnly.last('rels')], [1, 0, 1], 'a 6-frame press is one tap, no hold');
  assert.equal(tapOnly.log.taps[15], 0, 'the tap does not fire while the button is still down');
  assert.equal(tapOnly.log.taps[16], 1, 'it fires on the release');
  const hold = play(BUTTONS, { frames: 80, at: held([[B.B, 10, 50]]) }, ['taps', 'holds', 'rels']);
  assert.deepEqual([hold.last('taps'), hold.last('holds'), hold.last('rels')], [0, 1, 1], 'a 41-frame hold fires the hold once, is not a tap, and releases once');
  assert.equal(hold.log.holds[20], 0); assert.equal(hold.log.holds[21], 1, 'the hold fires on the 12th frame held, and counts once');
  const again = play(BUTTONS, { frames: 120, at: held([[B.B, 10, 40], [B.B, 60, 66]]) }, ['taps', 'holds']);
  assert.deepEqual([again.last('taps'), again.last('holds')], [1, 1], 'release, then a fresh short press, is a new tap');
});

test('buttons: a button held across a screen change is ignored until it is released (bt_flush)', () => {
  const src = `import "std/flow";
var taps; var holds; var moved;
func init() { load_font(0); lcd(LCD_BG); }
func frame() { bt_update(); if (frames() == 10) { bt_flush(); moved = 1; } if (bt_hold(BTN_B, 12)) { holds++; } if (bt_tap(BTN_B)) { taps++; } }`;
  const r = play(src, { frames: 90, at: held([[B.B, 5, 45], [B.B, 60, 80]]) }, ['taps', 'holds']);
  assert.equal(r.log.holds[44], 0, 'the hold that began before the change never fires: it was flushed at frame 10');
  assert.equal(r.log.taps[46], 0, 'and its release is not a tap');
  assert.equal(r.last('holds'), 1, 'a fresh hold after the release works again');
});

test('confirm: KEEP is selected first, B keeps, A on KEEP keeps, moving then A erases', () => {
  const SRC = `import "std/flow";
var out = 9; var sel;
func init() { load_font(0); ui_init(60); lcd(LCD_BG); confirm_open(BG_MAP, 2, 4, "ERASE QUILT 3?", "ITS GRADES GO TOO"); }
func frame() { var c = confirm_update(); if (c >= 0) { out = c; } sel = cf_sel; }`;
  const press = (list) => ({ frames: 80, at: held(list) });
  assert.equal(play(SRC, press([[B.A, 10, 12]]), ['out']).last('out'), 0, 'A straight away keeps');
  assert.equal(play(SRC, press([[B.START, 10, 12]]), ['out']).last('out'), 0, 'START straight away keeps too');
  assert.equal(play(SRC, press([[B.B, 10, 12]]), ['out']).last('out'), 0, 'B cancels');
  assert.equal(play(SRC, press([[B.RIGHT, 10, 12], [B.A, 20, 22]]), ['out']).last('out'), 1, 'moving to ERASE and pressing A erases');
  assert.equal(play(SRC, press([[B.DOWN, 10, 12], [B.START, 20, 22]]), ['out']).last('out'), 1, 'DOWN works as well as RIGHT, START as well as A');
  assert.equal(play(SRC, press([[B.RIGHT, 10, 12], [B.LEFT, 20, 22], [B.A, 30, 32]]), ['out']).last('out'), 0, 'moving back to KEEP keeps');
  assert.equal(play(SRC, { frames: 20, at: () => 0 }, ['out']).last('out'), 9, 'nothing happens until a button is pressed');
});

test('progress: grades keep the best, pack 4 bits per level in the save, and open levels one at a time', () => {
  const SRC = `import "std/flow";
var g1; var g2; var best; var nxt; var beaten; var o3; var o4; var o5;
func init() {
  load_font(0);
  pg_record(0, grade_for(7, 7)); pg_record(1, grade_for(10, 8));
  best = pg_record(1, grade_for(8, 8));
  var worse = pg_record(1, grade_for(20, 8));
  g1 = pg_get(0); g2 = pg_get(1);
  nxt = pg_next(10); beaten = pg_beaten(10);
  o3 = pg_open(2, 10); o4 = pg_open(3, 10);
}
func frame() {}`;
  const r = play(SRC, { frames: 2, at: () => 0 }, ['g1', 'g2', 'best', 'nxt', 'beaten', 'o3', 'o4']);
  assert.equal(r.last('g1'), 6, 'par is AAA');
  assert.equal(r.last('g2'), 6, 'a better second try raised level 1 from AA (2 over par with par 8: slack 1, over 2 is A) to AAA');
  assert.equal(r.last('best'), 1, 'a new best says so');
  assert.equal(r.last('nxt'), 2); assert.equal(r.last('beaten'), 2);
  assert.equal(r.last('o3'), 1, 'the next level is open'); assert.equal(r.last('o4'), 0, 'the one after is locked');
  const grades = (turns, par) => { const t = play(`import "std/flow";\nvar g;\nfunc init() { g = grade_for(${turns}, ${par}); }\nfunc frame() {}`, { frames: 1, at: () => 0 }, ['g']); return t.last('g'); };
  assert.deepEqual([grades(5, 5), grades(6, 5), grades(7, 5), grades(9, 5), grades(13, 5), grades(30, 5)], [6, 5, 4, 3, 2, 1], 'par 5: AAA, AA, A, B, C, D as the turns grow');
  assert.equal(grades(100, 100), 6); assert.equal(grades(112, 100), 5, 'par 100 has a slack of 12: AA');
});

test('grid: arrows move without wrapping, A or START chooses an open level, a locked one answers -3, B -2', () => {
  const SRC = `import "std/flow";
var out = -9; var sel;
func init() { load_font(0); grid_open(4, 10, 0); }
func frame() { var c = grid_update(5); if (c != -1) { out = c; } sel = grid_sel; }`;
  const at = (list) => ({ frames: 90, at: held(list) });
  assert.equal(play(SRC, at([[B.A, 5, 7]]), ['out']).last('out'), 0);
  assert.equal(play(SRC, at([[B.DOWN, 5, 6], [B.START, 15, 17]]), ['out']).last('out'), 4, 'DOWN moves a row (4 columns)');
  assert.equal(play(SRC, at([[B.DOWN, 5, 6], [B.RIGHT, 15, 16], [B.A, 25, 27]]), ['out']).last('out'), 5, 'level 5 is the last open one');
  assert.equal(play(SRC, at([[B.DOWN, 5, 6], [B.RIGHT, 15, 16], [B.RIGHT, 25, 26], [B.A, 35, 37]]), ['out']).last('out'), -3, 'level 6 is locked');
  assert.equal(play(SRC, at([[B.B, 5, 7]]), ['out']).last('out'), -2);
  assert.equal(play(SRC, at([[B.LEFT, 5, 6], [B.UP, 15, 16], [B.A, 25, 27]]), ['sel', 'out']).last('sel'), 0, 'no wrap at the edges');
});
