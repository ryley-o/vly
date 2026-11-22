// A bot kit: write a small policy that plays your game, and get back (1) the button presses as an input script for vly.json tests,
// (2) the save the game wrote (for tests that need a finished game), and (3) whether the bot got where you wanted. It can play with a
// reaction delay, so you learn whether the game is playable by a human and not only by a perfect machine.
//
//   import { runBot, mask } from './vly/src/tools/bot.js';
//   const r = await runBot({
//     source: 'src/main.vly',                                   // or { rom, ram }
//     decide: (f, read) => (read('state') === 0 ? (f === 20 ? mask('START') : 0) : mask('A') | (read('enemy_x') < read('x') ? mask('LEFT') : mask('RIGHT'))),
//     done: (read) => read('state') === 6,                      // stop (a little later) when this holds
//     delay: 12,                                                // react to what was true 12 frames ago (about 0.2 s)
//     delays: { puck_x: 14, puck_y: 14 },                       // optional: a different delay for some variables (a game state is not slow)
//     live: ['x', 'y'],                                         // optional: these variables are read live (a player knows where they are)
//   });
//   fs.writeFileSync('tests/win.input', r.input);  fs.writeFileSync('tests/after-win.sav', r.save);
//
// Do not let a bot run silently for minutes. Give it a progress measure and a budget, and it stops and says why:
//   progress: (read) => read('pl_x'),     // a number that should keep growing while the bot makes headway (x, stage, score)
//   opening: { input: 'RIGHT@0-40,UP+B@50', frames: 60 },   // optional: presses you wrote by hand for the first `frames` frames, then the policy takes over
//   stuckFrames: 600,                     // stop when `progress` has not beaten its best for this many frames (default 900 when progress is given)
//   maxMillis: 120000,                    // stop after this much wall time (default 300000)
// The result then has `stuck` ({ frame, best, why }) or `timedOut`, and reachedDone is false: read it as "a level bug or a bot limit?" (see docs workflow).
import { Machine } from '../core/machine.js';
import * as C from '../core/constants.js';
import { buildFile } from './build.js';
import { parseInputSpec } from './input.js';

const NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
/** mask('A+RIGHT') -> the button bits, to return from decide(). */
export const mask = (text) => String(text).split('+').reduce((m, n) => m | (C.BTN[n.trim().toUpperCase()] ?? 0), 0);

/**
 * @param {object} o
 * @param {string} [o.source] path of the .vly entry to build
 * @param {Uint8Array} [o.rom] @param {object} [o.ram] a built cartridge and its RAM map, instead of `source`
 * @param {(f: number, read: Function, api: object) => number} o.decide  returns the buttons (use mask()) for frame f. read(name) is the signed
 *   word value of a variable as it was `delay` frames ago; read(name, i) indexes an array (live, not delayed); api.machine is the machine; api.flush() forgets the delayed history (call it when a variable resets, such as a song clock at a new song, so the bot does not read the old value).
 * @param {(read: Function) => boolean} [o.done] when true the run ends `after` frames later
 * @param {number} [o.maxFrames] @param {number} [o.after] @param {number} [o.delay] @param {Object<string, number>} [o.delays] per-variable delays, e.g. { puck_x: 14 } sees only the puck late @param {string[]} [o.delayArrays] arrays whose elements are also read late (read('foe_x', i)); by default array reads are live @param {string[]} [o.live] variables read at once, not delayed @param {Uint8Array} [o.save] a save to start from
 */
export async function runBot(o) {
  let { rom, ram } = o;
  if (!rom) { const b = await buildFile(o.source); rom = b.bytes; ram = b.stats.ram; }
  let lastSave = null;
  const m = new Machine(rom, { save: o.save || null, onSave: (bytes) => { lastSave = bytes; } });
  m.boot();
  const delay = o.delay ?? 0;
  const scalars = Object.entries(ram).filter(([, r]) => r.type === 'word').map(([n, r]) => [n, r.addr]);
  const history = [];
  const delayedArrays = (o.delayArrays || []).map((n) => { if (!ram[n] || !/\[\]$/.test(ram[n].type)) throw new Error(`delayArrays names "${n}", which is not an array in the game`); return n; });
  const snap = () => {
    const s = {};
    for (const [n, a] of scalars) s[n] = (m.read16(a) << 16) >> 16;
    for (const n of delayedArrays) s[`${n}[]`] = Array.from({ length: ram[n].type === 'byte[]' ? ram[n].bytes : ram[n].bytes / 2 }, (_, i) => liveRead(n, i));
    return s;
  };
  const liveRead = (name, i) => {
    const r = ram[name];
    if (!r) throw new Error(`the bot reads "${name}", which is not a variable in the game (known: ${Object.keys(ram).join(', ')})`);
    if (i === undefined) return (m.read16(r.addr) << 16) >> 16;
    return r.type === 'byte[]' ? m.read8(r.addr + i) : (m.read16(r.addr + i * 2) << 16) >> 16;
  };
  const live = new Set(o.live || []);
  const delays = o.delays || {};                                  // per-variable reaction delays, overriding `delay`
  const maxDelay = Math.max(delay, ...Object.values(delays));
  const read = (name, i) => {
    const d = name in delays ? delays[name] : delay;
    if (!d || live.has(name)) return liveRead(name, i);
    if (i !== undefined && !delayedArrays.includes(name)) return liveRead(name, i);
    const past = history[Math.max(0, history.length - 1 - d)] || {};
    if (i !== undefined) return past[`${name}[]`] ? past[`${name}[]`][i] : liveRead(name, i);
    return name in past ? past[name] : liveRead(name);
  };
  const presses = [];
  let last = 0, doneAt = -1, f = 0;
  const max = o.maxFrames ?? 30000;
  const t0 = Date.now(), budget = o.maxMillis ?? 300000, stuckLimit = o.stuckFrames ?? 900;
  let best = -Infinity, bestAt = 0, stuck = null, timedOut = false;
  for (; f < max; f++) {
    if (o.progress && doneAt < 0) {
      const p = o.progress(liveRead);
      if (p > best) { best = p; bestAt = f; } else if (f - bestAt >= stuckLimit) { stuck = { frame: f, best, why: `progress has not improved for ${stuckLimit} frames (best ${best})` }; break; }
    }
    if ((f & 255) === 0 && Date.now() - t0 > budget) { timedOut = true; break; }
    history.push(snap());
    if (history.length > maxDelay + 2) history.shift();
    const openFn = o.opening ? (o._openFn ??= parseInputSpec(o.opening.input || '')) : null;
    const buttons = (openFn && f < (o.opening.frames ?? 0) ? openFn(f) : o.decide(f, read, { machine: m, ram, flush: () => { history.length = 0; } })) | 0;
    m.runFrame(buttons);
    if (buttons !== last) { presses.push({ mask: buttons, from: f }); last = buttons; }
    if (o.done && doneAt < 0 && o.done(liveRead)) doneAt = f;
    if (doneAt >= 0 && f >= doneAt + (o.after ?? 60)) { f++; break; }
  }
  presses.push({ mask: 0, from: f });
  const segs = [];
  for (let i = 0; i < presses.length - 1; i++) if (presses[i].mask) segs.push(`${NAMES.filter((_, k) => presses[i].mask & (1 << k)).join('+')}@${presses[i].from}-${presses[i + 1].from - 1}`);
  return { frames: f, reachedDone: doneAt >= 0, doneAt, stuck, timedOut, input: `# recorded by runBot\n${segs.join(',\n')}\n`, save: lastSave, machine: m, read: liveRead };
}

/**
 * Make a policy play like a person with imperfect timing: every NEW button press the policy makes is delayed by `delay + noise` frames
 * (noise is uniform in [-jitter, +jitter], never earlier than the policy asked), holds follow the policy, releases are immediate.
 * Run the same policy at several `jitter` values (0, 1, 2, 3, 5 frames is roughly 0 to 80 ms) and report the score of each: a game where the
 * best player and a sloppy one score alike has no skill in it; a game where only jitter 0 survives is too hard.
 *   const policy = humanize((f, read) => ..., { delay: 0, jitter: 2, seed: 7 });
 *   const r = await runBot({ source, decide: policy, ... });
 */
export function humanize(decide, { delay = 0, jitter = 0, seed = 1 } = {}) {
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  let prev = 0;
  const items = [];                             // a press that has not finished: { bit, at, len, released, until }
  return (f, read, api) => {
    const want = decide(f, read, api) | 0;
    const pressed = want & ~prev;
    for (let bit = 1; bit < 256; bit <<= 1) if (pressed & bit) items.push({ bit, at: f + Math.max(0, Math.round(delay + (rnd() * 2 - 1) * jitter)), len: 0, released: false, until: Infinity });
    let out = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (!it.released) { if (want & it.bit) it.len++; else it.released = true; }
      if (it.released && it.started) { items.splice(i, 1); continue; }         // released after it appeared: release at once
      if (f < it.at) continue;                                                 // not yet visible
      if (it.released && it.until === Infinity) it.until = f + Math.max(1, it.len);   // released before it appeared: a tap, as long as the policy's, delayed
      if (it.released && f >= it.until) { items.splice(i, 1); continue; }
      it.started = !it.released;
      out |= it.bit;
    }
    prev = want;
    return out;
  };
}
