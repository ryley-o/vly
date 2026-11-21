// exploreStates: par, par routes, dead ends and the chance that a random mover wins, on a tiny puzzle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { exploreStates } from '../src/tools/statespace.js';

// a counter from 0: +1 or +2 wins at exactly 5; +3 is a trap (past 5 you can never win; 4 -> only +1 wins)
const moves = (n) => (n >= 5 ? [] : [1, 2, 3].map((d) => ({ move: `+${d}`, state: n + d })));
test('exploreStates: the fewest moves, how many routes, dead ends, a random mover', () => {
  const r = exploreStates({ start: 0, moves, key: String, isWin: (n) => n === 5 });
  assert.equal(r.solvable, true);
  assert.equal(r.par, 2, '2 + 3 or 3 + 2');
  assert.equal(r.parRoutes, 2);
  assert.ok(['+2 +3', '+3 +2'].includes(r.path.join(' ')));
  assert.ok(r.deadStates > 0, 'overshooting 5 can never win');
  assert.deepEqual(r.deadStarts, [], 'no first move is a dead end');
  assert.ok(r.randomWinRate > 0 && r.randomWinRate < 1, `random win rate ${r.randomWinRate}`);
  const stuck = exploreStates({ start: 0, moves: () => [], key: String, isWin: () => false });
  assert.equal(stuck.solvable, false);
  assert.equal(stuck.par, null);
  const capped = exploreStates({ start: 0, moves: (n) => [{ move: 'x', state: n + 1 }], key: String, isWin: () => false, maxStates: 50 });
  assert.equal(capped.truncated, true);
});
