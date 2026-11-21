// An exhaustive look at a puzzle level: every state you can reach, the fewest moves to win, how many ways there are to win in that many,
// which states are dead ends (no way to win from them), and how likely a player who moves at random is to win. Small puzzles (a few
// hundred thousand states) are solved in a moment, so you can prove a level is solvable and measure how hard it is before a person plays it.
//
//   import { exploreStates } from './vly/src/tools/statespace.js';
//   const r = exploreStates({
//     start: initialState,                                   // anything you can turn into a key
//     moves: (s) => [{ move: 'fold-3', state: s2 }, ...],    // every legal move and the state it leads to ([] when stuck)
//     key: (s) => JSON.stringify(s),                         // a string that is the same for the same state (default: JSON)
//     isWin: (s) => s.clean,
//     maxStates: 500000,                                     // give up (truncated: true) past this many states
//   });
//   r.solvable, r.par (fewest moves), r.parRoutes (how many routes win in par moves), r.deadStarts (the first moves that can no longer win),
//   r.deadStates, r.states, r.randomWinRate (chance a random mover wins, ignoring moves back), r.path (one par route, as the move names)
export function exploreStates({ start, moves, key = (s) => JSON.stringify(s), isWin, maxStates = 500000 }) {
  const ids = new Map(); const states = []; const edges = []; const dist = [];
  const add = (s, d) => { const k = key(s); let id = ids.get(k); if (id === undefined) { id = states.length; ids.set(k, id); states.push(s); edges.push(null); dist.push(d); } return id; };
  add(start, 0);
  let truncated = false;
  for (let i = 0; i < states.length; i++) {
    if (states.length > maxStates) { truncated = true; break; }
    if (isWin(states[i])) { edges[i] = []; continue; }               // a won state ends the game
    const out = [];
    for (const m of moves(states[i])) { const before = states.length; const j = add(m.state, dist[i] + 1); out.push({ to: j, move: m.move }); void before; }
    edges[i] = out;
  }
  const n = states.length;
  const win = states.map((s, i) => edges[i] !== null && isWin(s));
  // can each state still win? (reverse reachability from the winning states)
  const rev = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) if (edges[i]) for (const e of edges[i]) rev[e.to].push(i);
  const canWin = new Array(n).fill(false); const q = [];
  for (let i = 0; i < n; i++) if (win[i]) { canWin[i] = true; q.push(i); }
  while (q.length) { const x = q.pop(); for (const y of rev[x]) if (!canWin[y]) { canWin[y] = true; q.push(y); } }
  // fewest moves, and the number of routes of that length (a BFS already gave each state its distance)
  let par = null; for (let i = 0; i < n; i++) if (win[i] && (par === null || dist[i] < par)) par = dist[i];
  const ways = new Array(n).fill(0); ways[0] = 1;
  const order = [...Array(n).keys()].sort((a, b) => dist[a] - dist[b]);
  for (const i of order) if (edges[i]) for (const e of edges[i]) if (dist[e.to] === dist[i] + 1) ways[e.to] += ways[i];
  let parRoutes = 0; for (let i = 0; i < n; i++) if (win[i] && dist[i] === par) parRoutes += ways[i];
  // one par route
  let path = null;
  if (par !== null) {
    const prev = new Array(n).fill(null); const seen = new Array(n).fill(false); seen[0] = true; const bq = [0];
    for (let h = 0; h < bq.length; h++) { const x = bq[h]; if (edges[x]) for (const e of edges[x]) if (!seen[e.to]) { seen[e.to] = true; prev[e.to] = { from: x, move: e.move }; bq.push(e.to); } }
    const goal = [...Array(n).keys()].find((i) => win[i] && dist[i] === par);
    path = []; for (let x = goal; prev[x]; x = prev[x].from) path.unshift(prev[x].move);
  }
  const deadStates = []; for (let i = 0; i < n; i++) if (!canWin[i] && edges[i] !== null) deadStates.push(i);
  const deadStarts = (edges[0] || []).filter((e) => !canWin[e.to]).map((e) => e.move);
  // the chance that a random mover (one that never wins by a rule you did not allow) wins: exact, by value iteration over the reachable graph
  let p = new Array(n).fill(0); for (let i = 0; i < n; i++) if (win[i]) p[i] = 1;
  for (let it = 0; it < 200; it++) {
    const np = p.slice();
    for (let i = 0; i < n; i++) if (!win[i] && edges[i] && edges[i].length) np[i] = edges[i].reduce((a, e) => a + p[e.to], 0) / edges[i].length;
    let d = 0; for (let i = 0; i < n; i++) d = Math.max(d, Math.abs(np[i] - p[i])); p = np; if (d < 1e-9) break;
  }
  return { solvable: par !== null, par, parRoutes, path, states: n, truncated, deadStates: deadStates.length, deadStarts, randomWinRate: Number(p[0].toFixed(4)) };
}
