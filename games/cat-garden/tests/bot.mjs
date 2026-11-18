// A bot that plays the whole game (title -> three gardens -> birthday party) and records its presses.
// usage: node tests/bot.mjs   (writes tests/full.input and tests/won.sav)
import fs from 'node:fs';
import { runBot, mask } from '../../../src/tools/bot.js';
const maps = [1, 2, 3].map((n) => fs.readFileSync(new URL(`../assets/g${n}.map`, import.meta.url), 'utf8').split('map:\n')[1].trim().split('\n'));
const find = (g, ch) => { const o = []; maps[g].forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) o.push([x, y]); })); return o; };
const beds = [0, 1, 2].map((g) => find(g, 'B'));
const bench = [0, 1, 2].map((g) => find(g, 'S')[0]);
const barrel = [0, 1, 2].map((g) => find(g, 'W')[0]);
const FAV = [0, 1, 2, 1, 2, 0];
const DIRS = [[0, 1, 'DOWN', 0], [0, -1, 'UP', 1], [-1, 0, 'LEFT', 2], [1, 0, 'RIGHT', 3]];
let cool = 0, stats = { days: 0 };
const decide = (f, read) => {
  const st = read('state');
  if (st === 0) return f === 30 ? mask('START') : 0;
  if (st !== 1) return 0;
  if (read('ox') !== 0 || read('oy') !== 0) return 0;
  if (cool > 0) { cool--; return 0; }
  const g = read('g'), tx = read('tx'), ty = read('ty'), face = read('face'), water = read('water'), tool = read('tool');
  const cats = [0, 1].map((k) => { const c = 2 * g + k; return { c, here: read('cat_here', c), x: read('cat_x', c), y: read('cat_y', c), h: read('hearts', c), pet: read('cat_pet', c), type: FAV[c] + 1 }; });
  const occupied = new Set(cats.filter((c) => c.here).map((c) => c.x + ',' + c.y));
  const free = (x, y) => x >= 0 && x <= 19 && y >= 1 && y <= 14 && !read('sol', y * 20 + x) && !occupied.has(x + ',' + y);
  const press = (b) => { cool = 1; return mask(b); };
  // BFS toward any of the goal cells; returns the first direction
  const route = (goals) => {
    const key = (x, y) => y * 20 + x; const prev = new Map([[key(tx, ty), null]]); const q = [[tx, ty]];
    const gs = new Set(goals.map(([x, y]) => key(x, y)));
    if (gs.has(key(tx, ty))) return 'here';
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy, name] of DIRS) {
        const nx = x + dx, ny = y + dy; if (!free(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y, name]);
        if (gs.has(key(nx, ny))) { let cur = [nx, ny]; let step = name; while (true) { const p = prev.get(key(cur[0], cur[1])); if (!p) break; step = p[2]; cur = [p[0], p[1]]; } return step; }
        q.push([nx, ny]);
      }
    }
    return null;
  };
  // go next to (x,y), face it and press A; returns a mask or null when unreachable
  const useAt = (x, y) => {
    for (const [dx, dy, name, fc] of DIRS) if (tx + dx === x && ty + dy === y) return face === fc ? press('A') : press(name);
    const r = route(DIRS.map(([dx, dy]) => [x + dx, y + dy]));
    return r && r !== 'here' ? press(r) : null;
  };
  const bs = beds[g].map((_, k) => { const v = read('bed', g * 12 + k); return { k, x: beds[g][k][0], y: beds[g][k][1], type: v >> 4, stage: (v >> 1) & 3, wet: v & 1 }; });
  let m;
  // 1. both cats are friends and the gate is open: walk through it
  if (g < 2 && cats.every((c) => c.h >= 5) && ((read('cleared') >> g) & 1)) { const r = route([[19, 7], [19, 8]]); if (r && r !== 'here') return press(r); }
  // 2. pet a cat (a gift of its favourite flower is used automatically)
  for (const c of cats) if (c.here && c.h < 5 && (c.pet === 0 || read('inv', g * 3 + c.type - 1) > 0) && (m = useAt(c.x, c.y))) return m;
  // 3. pick blooms a cat wants
  for (const b of bs) if (b.stage === 3 && b.type && cats.some((c) => c.h < 5 && c.type === b.type) && read('inv', g * 3 + b.type - 1) === 0 && (m = useAt(b.x, b.y))) return m;
  // 4. water
  for (const b of bs) if (b.type && b.stage < 3 && !b.wet) {
    if (water > 0) { if ((m = useAt(b.x, b.y))) return m; } else if ((m = useAt(barrel[g][0], barrel[g][1]))) return m;
  }
  // 5. plant the flowers the cats want
  const wanted = cats.filter((c) => c.h < 5).map((c) => c.type).filter((t) => bs.filter((b) => b.type === t).length < 2);
  const empty = bs.filter((b) => !b.type);
  if (wanted.length && empty.length) { if (tool !== wanted[0]) return press('B'); for (const b of empty) if ((m = useAt(b.x, b.y))) return m; }
  // 6. rest on the bench
  if ((m = useAt(bench[g][0], bench[g][1]))) { stats.days++; return m; }
  return 0;
};
const r = await runBot({ source: new URL('../src/main.vly', import.meta.url).pathname, decide, done: (read) => read('state') === 5, maxFrames: 40000, after: 400 });
console.log('frames', r.frames, 'reached party:', r.reachedDone, 'day', r.read('day'), 'hearts', [0,1,2,3,4,5].map((i) => r.read('hearts', i)).join(','), 'cleared', r.read('cleared'));
fs.writeFileSync(new URL('./full.input', import.meta.url), r.input);
if (r.save) fs.writeFileSync(new URL('./won.sav', import.meta.url), r.save);
