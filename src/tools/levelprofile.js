// Is this level interesting? A profile of an ASCII level map: where the events are, how long the dead stretches are, how the
// ground changes, how varied the enemies are, how the intensity rises and falls. It cannot tell you a level is fun, but it finds
// the things that make levels feel empty: long flat events-free runs, pits and enemies bunched together while whole screens do nothing,
// one enemy type repeated, a new hazard that arrives with company, and no rest after a hard stretch.
// The thresholds are estimates (docs/ref-levels.md says where they come from); pass your own in options.
//
// The map: rows from the top of the level to the bottom, one character per 16 x 16 block (or whatever your block is).
//   solid:    # = % (the ground and walls; the lowest solid stack in a column is its ground; solid cells above it are platforms)
//   hazard:   ^ (spikes, fire and the like)
//   enemy:    any lowercase letter except o (each letter is a type)
//   pickup:   o * $
//   special:  S spring, C checkpoint, G goal, @ start
//   empty:    . or space.  A column whose bottom row is not solid is a pit.

const DEFAULTS = {
  solid: '#=%',
  hazard: '^',
  pickup: 'o*$',
  special: 'SCG@',
  window: 10,                 // columns per "screen"
  maxFlatRun: 12,             // longest run of flat ground with no events (columns)
  minOffBaseline: 0.25,       // share of columns that are not plain baseline ground (raised, lowered, with a platform above)
  heightChangeSpan: 20,       // every span of this many columns should change the ground height at least once
  maxSameEnemyRun: 2,         // consecutive encounters with the same enemy type
  introGap: 5,                // a first appearance should have no other event within this many columns
  maxNeutralShare: 0.5,       // share of raised steps and platforms with nothing at stake around them
};

export function analyzeLevel(text, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const rows = (Array.isArray(text) ? text : String(text).split('\n')).map((r) => r.replace(/\r$/, ''));
  while (rows.length && rows[rows.length - 1].trim() === '') rows.pop();
  const width = Math.max(0, ...rows.map((r) => r.length));
  const H = rows.length;
  const cell = (r, c) => (rows[r] && rows[r][c]) || '.';
  const isSolid = (ch) => o.solid.includes(ch);
  const isEnemy = (ch) => /[a-z]/.test(ch) && !o.pickup.includes(ch);
  const cols = [];
  for (let c = 0; c < width; c++) {
    const bottom = cell(H - 1, c);
    const col = { c, pit: !isSolid(bottom), top: H, platform: false, hazards: 0, enemies: [], pickups: 0, special: [] };
    if (!col.pit) { let r = H - 1; while (r >= 0 && isSolid(cell(r, c))) r--; col.top = r + 1; }
    for (let r = 0; r < H; r++) {
      const ch = cell(r, c);
      if (isSolid(ch) && r < col.top) col.platform = true;
      else if (o.hazard.includes(ch)) col.hazards++;
      else if (isEnemy(ch)) col.enemies.push(ch);
      else if (o.pickup.includes(ch)) col.pickups++;
      else if (o.special.includes(ch)) col.special.push(ch);
    }
    cols.push(col);
  }
  const heights = cols.filter((x) => !x.pit).map((x) => x.top);
  const freq = new Map(); for (const h of heights) freq.set(h, (freq.get(h) || 0) + 1);
  const baseline = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? H - 1;

  // events: the things that ask something of the player. A run of pit columns is one event.
  const events = new Array(width).fill(0);
  const kinds = new Array(width).fill('');
  cols.forEach((x, i) => {
    let n = 0; const k = [];
    if (x.pit && !(i > 0 && cols[i - 1].pit)) { n++; k.push('pit'); }
    if (x.hazards) { n++; k.push('hazard'); }
    n += x.enemies.length; for (const e of x.enemies) k.push(`enemy:${e}`);
    if (x.special.includes('S')) { n++; k.push('spring'); }
    if (x.special.includes('C')) { k.push('checkpoint'); }
    if (i > 0 && !x.pit && !cols[i - 1].pit && x.top !== cols[i - 1].top) { n++; k.push('height'); }
    if (x.platform && !(i > 0 && cols[i - 1].platform)) { n++; k.push('platform'); }
    if (x.pickups && !(i > 0 && cols[i - 1].pickups)) { n++; k.push('pickups'); }
    events[i] = n; kinds[i] = k.join(' ');
  });

  const warnings = [];
  const W = o.window;
  const windows = [];
  for (let s = 0; s < width; s += W) {
    const e = events.slice(s, s + W).reduce((a, b) => a + b, 0);
    const hard = cols.slice(s, s + W).reduce((a, x) => a + (x.pit && !(x.c > 0 && cols[x.c - 1].pit) ? 1 : 0) + x.hazards + x.enemies.length, 0);
    windows.push({ from: s, events: e, hard, intensity: hard === 0 ? 0 : hard === 1 ? 1 : hard <= 3 ? 2 : 3 });
  }
  const merge = (ranges) => { const out = []; for (const [a, b] of ranges) { const l = out[out.length - 1]; if (l && a <= l[1] + 1) l[1] = Math.max(l[1], b); else out.push([a, b]); } return out; };
  for (const [a, b] of merge(windows.filter((w) => w.events === 0 && w.from + W <= width).map((w) => [w.from, w.from + W - 1]))) warnings.push(`columns ${a}-${b}: nothing happens (no pit, enemy, hazard, platform, height change or pickup); give ${b - a + 1 > W ? 'these screens' : 'this screen'} a question to ask`);

  // the longest flat stretch where nothing happens
  let run = 0, runStart = 0, longest = { len: 0, from: 0 };
  cols.forEach((x, i) => {
    const quiet = !x.pit && events[i] === 0 && x.top === baseline;
    if (quiet) { if (run === 0) runStart = i; run++; if (run > longest.len) longest = { len: run, from: runStart }; } else run = 0;
  });
  if (longest.len > o.maxFlatRun) warnings.push(`columns ${longest.from}-${longest.from + longest.len - 1}: ${longest.len} columns of flat, empty ground in a row (limit ${o.maxFlatRun}); add a step, a dip, a platform route, an enemy pair, a coin arc`);

  // ground variety
  const off = cols.filter((x) => x.pit || x.platform || x.top !== baseline).length / Math.max(1, width);
  if (off < o.minOffBaseline) warnings.push(`only ${(off * 100).toFixed(0)}% of the columns leave the baseline ground (aim for at least ${o.minOffBaseline * 100}%): raise, lower and layer the ground`);
  const flatSpans = [];
  for (let s = 0; s + o.heightChangeSpan <= width; s += o.heightChangeSpan) {
    let changes = 0; for (let i = s + 1; i < s + o.heightChangeSpan; i++) if (!cols[i].pit && !cols[i - 1].pit && cols[i].top !== cols[i - 1].top) changes++;
    const hasPit = cols.slice(s, s + o.heightChangeSpan).some((x) => x.pit);
    if (changes === 0 && !hasPit) flatSpans.push([s, s + o.heightChangeSpan - 1]);
  }
  for (const [a, b] of merge(flatSpans)) warnings.push(`columns ${a}-${b}: the ground never changes height for ${b - a + 1} columns`);

  // enemies: encounters (a cluster of enemies within 3 columns), their types, repetition and first appearances
  const encounters = [];
  cols.forEach((x, i) => { for (const e of x.enemies) { const last = encounters[encounters.length - 1]; if (last && i - last.to <= 3) { last.to = i; last.types.add(e); } else encounters.push({ from: i, to: i, types: new Set([e]) }); } });
  let sameRun = 1;
  for (let i = 1; i < encounters.length; i++) {
    const a = [...encounters[i - 1].types].sort().join(''), b = [...encounters[i].types].sort().join('');
    sameRun = a === b ? sameRun + 1 : 1;
    if (sameRun === o.maxSameEnemyRun + 1) warnings.push(`columns ${encounters[i - sameRun + 1].from}-${encounters[i].to}: ${sameRun} encounters in a row with the same enemy (${b}); vary the type, the arrangement (single, pair, on a platform, over a pit) or the terrain`);
  }
  const first = new Map();
  cols.forEach((x, i) => { const names = [...x.enemies.map((e) => `enemy ${e}`), ...(x.hazards ? ['hazards'] : [])]; for (const n of names) if (!first.has(n)) first.set(n, i); });
  for (const [name, at] of first) {
    if (at < o.introGap) continue;                                   // right at the start there is nothing else yet
    const near = cols.slice(Math.max(0, at - o.introGap), at + o.introGap + 1).some((x, k) => { const i = Math.max(0, at - o.introGap) + k; return i !== at && (x.pit || x.hazards || x.enemies.length) && !(x.enemies.length && x.enemies.every((e) => `enemy ${e}` === name) && i === at); });
    if (near) warnings.push(`column ${at}: ${name} first appears with other dangers within ${o.introGap} columns; introduce a new thing alone, where a mistake costs nothing`);
  }

  // consequences: raised steps and platforms with nothing at stake around them are "neutral hops"
  let obstacles = 0, neutral = 0;
  cols.forEach((x, i) => {
    const stepUp = i > 0 && !x.pit && !cols[i - 1].pit && x.top < cols[i - 1].top;
    const platformStart = x.platform && !(i > 0 && cols[i - 1].platform);
    if (!(stepUp || platformStart)) return;
    obstacles++;
    const around = cols.slice(Math.max(0, i - 3), i + 4);
    if (!around.some((y) => y.pit || y.hazards || y.enemies.length || y.pickups)) neutral++;
  });
  if (obstacles >= 4 && neutral / obstacles > o.maxNeutralShare) warnings.push(`${neutral} of ${obstacles} raised steps and platforms have nothing at stake near them (no pit, hazard, enemy or pickup within 3 columns): a jump with no consequence is a chore; put a pit under it, an enemy on it, or a reward above it`);

  // intensity: rise and fall
  for (let i = 2; i < windows.length; i++) if (windows[i].intensity === 3 && windows[i - 1].intensity === 3 && windows[i - 2].intensity === 3) warnings.push(`columns ${windows[i - 2].from}-${windows[i].from + W - 1}: three very busy screens in a row; give the player a rest`);
  for (let i = 3; i < windows.length; i++) if ([1, 2, 3].every((k) => windows[i - k].intensity === windows[i].intensity)) { warnings.push(`columns ${windows[i - 3].from}-${windows[i].from + W - 1}: four screens in a row with the same intensity (${windows[i].intensity} of 3); vary the pacing: rise, peak, rest`); break; }

  const pits = cols.filter((x, i) => x.pit && !(i > 0 && cols[i - 1].pit)).length;
  const types = [...new Set(cols.flatMap((x) => x.enemies))];
  return {
    columns: width, rows: H, baselineRow: baseline,
    pits, enemies: cols.reduce((a, x) => a + x.enemies.length, 0), enemyTypes: types, hazards: cols.reduce((a, x) => a + x.hazards, 0), pickups: cols.reduce((a, x) => a + (x.pickups ? 1 : 0), 0),
    offBaselineShare: Number(off.toFixed(2)), longestEmptyFlatRun: longest.len, neutralHops: { neutral, of: obstacles },
    intensityByScreen: windows.map((w) => w.intensity).join(''), eventsByScreen: windows.map((w) => w.events),
    warnings,
  };
}

export function formatLevelProfile(name, r) {
  const lines = [`${name}: ${r.columns} columns x ${r.rows} rows (${(r.columns / 10).toFixed(1)} screens)`];
  lines.push(`  pits ${r.pits}, enemies ${r.enemies} (${r.enemyTypes.length} types: ${r.enemyTypes.join(' ') || 'none'}), hazards ${r.hazards}, pickup clusters ${r.pickups}`);
  lines.push(`  ground off the baseline: ${(r.offBaselineShare * 100).toFixed(0)}%, longest flat empty run: ${r.longestEmptyFlatRun} columns, neutral hops: ${r.neutralHops.neutral}/${r.neutralHops.of}`);
  lines.push(`  intensity per screen (0 rest to 3 busy): ${r.intensityByScreen}`);
  if (r.warnings.length) { lines.push(`  ${r.warnings.length} thing${r.warnings.length === 1 ? '' : 's'} to look at:`); for (const w of r.warnings) lines.push(`    - ${w}`); }
  else lines.push('  nothing flagged: no dead screens, flat runs, repeated enemies or neutral jumps found (this does not prove it is fun: playtest it)');
  return lines.join('\n');
}
