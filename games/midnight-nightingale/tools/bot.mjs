// A bot that plays the whole mystery (navigates rooms with a BFS on the 10x8 block grid, talks, solves the locks, accuses).
// usage: node tools/bot.mjs [--wrong] [--delay N] [--out tests/win.input] [--save tests/won.sav]
import fs from 'node:fs';
import { runBot, mask } from '../../../src/tools/bot.js';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const wrongFirst = args.includes('--wrong');
const reading = args.includes('--read');   // read every dialogue page at about 3 s per page instead of speeding through
let readT = 0;
const delay = +opt('--delay', 0);
const out = opt('--out', null), saveOut = opt('--save', null);

const ANS = { 0: [7, 3, 2], 1: [0, 1, 2, 3], 2: [15, 8, 4], 3: [8, 5], 4: [2, 3, 7] };
const SIZE = (id, slot) => id === 0 || id === 4 ? 10 : id === 1 ? 4 : id === 2 ? 26 : (slot === 0 ? 12 : 6);
const F = { INTRO: 1, RUG: 2, DRAWER: 4, SAFE: 8, LIBOPEN: 16, GEAR: 32, CLKKEY: 64, CLKOPEN: 128, GEARSET: 256, STAIRS: 512, BOX: 1024, DONE: 2048 };
const EDGES = { 0: [1, 2, 3, 4], 1: [0], 2: [0], 3: [0], 4: [0, 5], 5: [4] };
const route = (a, b) => { const q = [[a]]; const seen = new Set([a]); while (q.length) { const p = q.shift(); const c = p[p.length - 1]; if (c === b) return p; for (const n of EDGES[c]) if (!seen.has(n)) { seen.add(n); q.push([...p, n]); } } };
const use = (room, ch, done) => ({ kind: 'use', room, ch, done });
const go = (room, to) => ({ kind: 'go', room, to, done: (r) => r('room') === to });
const fl = (r) => r('fl') & 0xFFFF, cl = (r) => r('cl') & 0xFFFF;
const plan = [
  use(0, 'O', r => fl(r) & F.INTRO),
  go(0, 1), use(1, 'r', r => fl(r) & F.RUG), use(1, 'D', r => fl(r) & F.DRAWER), use(1, 'E', r => (cl(r) & 6) === 6),
  use(1, 'A', r => fl(r) & F.SAFE),
  go(1, 0), go(0, 2), use(2, 'R', r => cl(r) & 32), use(2, 'Q', r => fl(r) & F.GEAR),
  go(2, 0), go(0, 3), use(3, 't', r => r('tk') & 1), use(3, 'I', r => cl(r) & 8), use(3, 'M', r => r('tk') & 4), use(3, 'C', r => fl(r) & F.CLKKEY),
  go(3, 0), use(0, 'H', r => cl(r) & 16), use(0, 'V', r => r('tk') & 2),
  go(0, 4), use(4, 'W', r => cl(r) & 128), use(4, 'X', r => fl(r) & F.GEARSET), use(4, 'X', r => fl(r) & F.STAIRS),
  go(4, 5), use(5, 'Z', r => fl(r) & F.BOX),
  go(5, 4), go(4, 0), use(0, 'O', r => r('state') === 6),
];
let si = 0, f0 = 0, lastRoom = -1, idle = 0, accT = 0;
function solid(ch, room, flags) {
  if (ch === '.' || ch === ',' || ch === 'r') return false;
  if (ch >= '0' && ch <= '5') { const d = +ch; if (room === 0 && d === 2 && !(flags & F.LIBOPEN)) return true; if (room === 0 && d === 4 && !(flags & F.CLKOPEN)) return true; if (room === 4 && d === 5 && !(flags & F.STAIRS)) return true; return false; }
  return true;
}
function bfs(grid, start, goals) {
  const q = [[start, []]]; const seen = new Set([start.join()]);
  while (q.length) {
    const [[x, y], path] = q.shift();
    if (goals.some(g => g[0] === x && g[1] === y)) return path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 9 || ny > 7 || seen.has(nx + ',' + ny)) continue;
      if (solid(grid[ny][nx], 0, 0xFFFF) && !(grid[ny][nx] >= '0' && grid[ny][nx] <= '5')) continue;
      if (!walk(grid[ny][nx])) continue;
      seen.add(nx + ',' + ny); q.push([[nx, ny], [...path, [nx, ny]]]);
    }
  }
  return null;
}
const walk = (ch) => ch === '.' || ch === ',' || ch === 'r';
let wrongDone = false;
const result = await runBot({
  source: 'src/main.vly', delay, maxFrames: 40000, after: 120,
  done: (r) => r('state') === 7,
  decide: (f, read, api) => {
    const st = read('state');
    const tap = (b) => ((f & 1) ? 0 : mask(b));
    if (st === 0) return f === 20 ? mask('START') : 0;
    if (st === 1) return (f % 20 === 0) ? mask('A') : 0;
    if (st === 3) {   // lock screen
      const id = read('lk_id'), cur = read('lk_cur'); const ans = ANS[id];
      for (let i = 0; i < ans.length; i++) {
        const v = read('lk_val', i);
        if (v !== ans[i]) {
          if (cur !== i) return tap('RIGHT');
          const sz = SIZE(id, i); const up = (ans[i] - v + sz) % sz;
          return up <= sz / 2 ? tap('UP') : tap('DOWN');
        }
      }
      return tap('A');
    }
    if (st === 6) {   // accusation
      if (read('dlg_open')) return tap('A');
      const sel = read('sel');
      if (wrongFirst && !wrongDone) { if (read('wrong') >= 2) wrongDone = true; else { if (sel !== 0 && read('wrong') === 0) return tap('LEFT'); if (sel !== 1 && read('wrong') === 1) return tap('RIGHT'); return (f % 40 === 0) ? mask('A') : 0; } }
      if (sel < 2) return tap('RIGHT');
      return (f % 40 === 0) ? mask('A') : 0;
    }
    if (process.env.DBG && f % 120 === 0) console.log(f, 'st', st, 'room', read('room'), 'px', read('hx')/4, read('hy')/4, 'dlg', read('dlg_open'), 'si', si);
    if (st === 7) return 0;
    if (st !== 2) return 0;
    if (read('dlg_open')) { if (!reading) return tap('A'); if (read('dlg_wait')) { readT++; if (readT > 150) { readT = 0; return tap('A'); } } return 0; }
    if (si >= plan.length) return 0;
    const step = plan[si];
    if (step.done(read)) { si++; idle = 0; return 0; }
    const room = read('room');
    const flags = read('fl') & 0xFFFF;
    const px = read('hx') / 4, py = read('hy') / 4;
    const cx = (px + 8) >> 4, cy = (py + 12) >> 4;
    const grid = []; for (let y = 0; y < 8; y++) { let row = ''; for (let x = 0; x < 10; x++) row += String.fromCharCode(read('rg', y * 10 + x)); grid.push(row); }
    let targetRoom = step.room;
    if (room !== targetRoom) { const p = route(room, targetRoom); const nextRoom = p[1]; return moveTo(room, grid, [cx, cy], px, py, { door: String(nextRoom), flags }); }
    if (step.kind === 'go') return moveTo(room, grid, [cx, cy], px, py, { door: String(step.to), flags });
    return moveTo(room, grid, [cx, cy], px, py, { ch: step.ch, flags });
  },
});
function moveTo(room, grid, cur, px, py, tgt) {
  let bx = -1, by = -1;
  const want = tgt.door ?? tgt.ch;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) if (grid[y][x] === want && bx < 0) { bx = x; by = y; }
  if (bx < 0) return 0;
  const nbrs = [[bx + 1, by, 'LEFT'], [bx - 1, by, 'RIGHT'], [bx, by + 1, 'UP'], [bx, by - 1, 'DOWN']].filter(n => n[0] >= 0 && n[0] < 10 && n[1] >= 0 && n[1] < 8 && walk(grid[n[1]][n[0]]));
  let best = null;
  for (const n of nbrs) { const p = bfs(grid, cur, [[n[0], n[1]]]); if (p && (!best || p.length < best.p.length)) best = { n, p }; }
  if (!best) return 0;
  const [tx, ty, dir] = best.n;
  const next = best.p.length ? best.p[0] : [tx, ty];
  const dxp = next[0] * 16 - px, dyp = next[1] * 16 - py;
  if (best.p.length === 0 && tgt.door) {
    const hor = dir === 'LEFT' || dir === 'RIGHT';
    if (hor && Math.abs(ty * 16 - py) >= 2) return ty * 16 > py ? mask('DOWN') : mask('UP');
    if (!hor && Math.abs(tx * 16 - px) >= 2) return tx * 16 > px ? mask('RIGHT') : mask('LEFT');
  }
  if (best.p.length === 0) {
    idle++;
    if (idle % 40 === 20) return mask('A');
    return mask(dir);
  }
  // align the perpendicular axis first, then move along the path
  const horizontal = next[1] === cur[1];
  if (horizontal) { if (Math.abs(dyp) >= 2 && best.p.length) return dyp > 0 ? mask('DOWN') : mask('UP'); return Math.abs(dxp) < 2 ? 0 : (dxp > 0 ? mask('RIGHT') : mask('LEFT')); }
  if (Math.abs(dxp) >= 2) return dxp > 0 ? mask('RIGHT') : mask('LEFT');
  return Math.abs(dyp) < 2 ? 0 : (dyp > 0 ? mask('DOWN') : mask('UP'));
}
console.log('frames', result.frames, 'reachedDone', result.reachedDone, 'plan step', si, '/', plan.length, 'minutes', (result.frames / 3600).toFixed(1));
console.log('wrong guesses', result.read('wrong'), 'clues', result.read('cl'), 'fl', result.read('fl'));
if (out) fs.writeFileSync(out, result.input);
if (saveOut && result.save) fs.writeFileSync(saveOut, result.save);
