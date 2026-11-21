// Campaign analysis: does each level need the mechanic it is meant to teach, and does difficulty actually rise?
// You supply the game-specific part (a solver); this does the bookkeeping and the reading of the results, so an agent can decide what to playtest.
//
//   import { analyzeCampaign, formatCampaign } from './vly/src/tools/campaign.js';
//   const report = analyzeCampaign({
//     levels: 200,                                   // a count, or an array of level descriptions handed to your solver
//     mechanics: ['turn', 'swap', 'express'],        // the rules a level can need
//     solve: (level, allowed) => ({ solvable: true, optimal: 7, wrongRoutes: 3 }),   // allowed = the mechanics it may use
//     intended: { 0: ['turn'], 1: ['swap'], 2: ['turn', 'swap'] },   // optional: the mechanics each level is meant to need
//   });
//   console.log(formatCampaign(report));             // put it in tests/report.mjs: `vly release` prints it
//
// solve(level, allowed) must say whether the level can be solved with ONLY the allowed mechanics, the fewest turns (or moves, seconds,
// whatever your grade uses) it takes, and optionally how many plausible wrong routes there are (a measure of how easy it is to go astray).

//
// A rule can also RESTRICT instead of enable (a star that must never touch ink, a one-square goal): removing it makes the level EASIER, not
// unsolvable. List such rules in `restricting: ['keeper']`; for those, "needs" means "bites": taking the rule away changes the fewest moves, the
// number of wrong routes or whether the level is solvable at all. Every row also has `bites` for every rule.
export function analyzeCampaign({ levels, mechanics, solve, intended = {}, restricting = [] }) {
  const n = Array.isArray(levels) ? levels.length : levels;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const level = Array.isArray(levels) ? levels[i] : i;
    const full = solve(level, mechanics);
    const needs = [], bites = [];
    if (full.solvable) for (const m of mechanics) {
      const without = solve(level, mechanics.filter((x) => x !== m));
      const bit = !without.solvable || (without.optimal ?? null) !== (full.optimal ?? null) || (without.wrongRoutes ?? null) !== (full.wrongRoutes ?? null);
      if (bit) bites.push(m);
      if (restricting.includes(m) ? bit : !without.solvable) needs.push(m);
    }
    rows.push({ level: i, solvable: !!full.solvable, optimal: full.optimal ?? null, wrongRoutes: full.wrongRoutes ?? null, needs, bites });
  }
  const firstNeeding = {};
  for (const m of mechanics) { const r = rows.find((x) => x.needs.includes(m)); firstNeeding[m] = r ? r.level : null; }
  const problems = [];
  for (const r of rows) if (!r.solvable) problems.push({ level: r.level, kind: 'unsolvable', message: `level ${r.level + 1} cannot be solved` });
  for (const [lv, want] of Object.entries(intended)) {
    const r = rows[Number(lv)];
    if (!r) continue;
    const missing = want.filter((m) => !r.needs.includes(m));
    if (missing.length) problems.push({ level: r.level, kind: 'mechanic-not-required', message: `level ${r.level + 1} is meant to teach ${want.join(' + ')} but can be solved without ${missing.join(', ')}` });
  }
  for (const m of mechanics) if (firstNeeding[m] === null) problems.push({ level: null, kind: 'mechanic-never-required', message: `no level actually requires "${m}"` });
  // an opening that is too easy: the first levels all solved in a single move
  const opening = rows.slice(0, 5).filter((r) => r.optimal !== null && r.optimal <= 1).length;
  if (opening >= 3) problems.push({ level: 0, kind: 'easy-opening', message: `${opening} of the first 5 levels need only one move: the opening will feel too easy` });
  // difficulty that does not rise: count the levels that are easier than the average of the 5 before them
  let dips = 0;
  for (let i = 5; i < rows.length; i++) {
    const avg = rows.slice(i - 5, i).reduce((s, r) => s + (r.optimal ?? 0), 0) / 5;
    if (rows[i].optimal !== null && rows[i].optimal < avg * 0.5) dips++;
  }
  if (dips > Math.max(2, rows.length * 0.1)) problems.push({ level: null, kind: 'difficulty-dips', message: `${dips} levels need under half the moves of the 5 before them: difficulty is not rising smoothly (breathers are fine, a pile of them is not)` });
  return { rows, firstNeeding, problems, summary: { levels: n, solvable: rows.filter((r) => r.solvable).length, maxOptimal: Math.max(...rows.map((r) => r.optimal ?? 0)) } };
}

/** A readable report: one line per level (or a sample for long campaigns), the first level that needs each mechanic, and the problems. */
export function formatCampaign(report, { every = null } = {}) {
  const step = every ?? (report.rows.length > 40 ? Math.ceil(report.rows.length / 40) : 1);
  const lines = ['level  optimal  wrong-routes  needs'];
  for (const r of report.rows) {
    if (r.level % step !== 0 && r.level !== report.rows.length - 1 && r.needs.length === 0) continue;
    lines.push(`${String(r.level + 1).padStart(5)}  ${String(r.optimal ?? '-').padStart(7)}  ${String(r.wrongRoutes ?? '-').padStart(12)}  ${r.needs.join(' + ') || '-'}${r.solvable ? '' : '  UNSOLVABLE'}`);
  }
  lines.push('', 'first level that needs each mechanic:');
  for (const [m, l] of Object.entries(report.firstNeeding)) lines.push(`  ${m.padEnd(12)} ${l === null ? 'never (no level needs it)' : l + 1}`);
  lines.push('', report.problems.length ? 'problems:' : 'no problems found.');
  for (const p of report.problems) lines.push(`  - ${p.message}`);
  return lines.join('\n');
}
