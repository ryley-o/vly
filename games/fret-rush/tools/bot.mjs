// A rhythm bot. It plays a whole song from the title screen to the results screen and records its presses.
//   node tools/bot.mjs --song 1 --delay 6 --jitter 2 --seed 1 --out tests/song1.input
// delay  = frames late (the bot thinks the song clock is `delay` frames behind: a systematic reaction lag)
// jitter = each note gets its own random error of +-jitter frames (a human is never perfectly steady)
// cal    = the input offset the bot has been given in the game (it is not applied here: the game applies it); pass --save to use a save with cal
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = process.env.VLY_HOME || new URL('../../..', import.meta.url).pathname;
const { runBot, mask } = await import(path.join(HOME, 'src/tools/bot.js'));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const song = +arg('song', 0), delay = +arg('delay', 0), jitter = +arg('jitter', 0), seed = +arg('seed', 1);
const out = arg('out', null), savePath = arg('save', null), skipRate = +arg('skip', 0);
const quiet = process.argv.includes('--quiet');
const charts = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/charts.json'), 'utf8'));
const chart = charts[song];
const LANE_BTN = ['LEFT', 'DOWN', 'B', 'A'].map(mask);

let rs = seed >>> 0 || 1;
const rnd = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const offs = chart.lanes.map(() => [0, 1, 2, 3].map(() => Math.round((rnd() * 2 - 1) * jitter)));   // per note and lane
const skip = chart.lanes.map(() => [0, 1, 2, 3].map(() => rnd() < skipRate));                          // notes the bot never plays

const next = [0, 0, 0, 0];
const advance = (l) => { while (next[l] < chart.lanes.length && !((chart.lanes[next[l]] >> l) & 1)) next[l]++; };
for (let l = 0; l < 4; l++) advance(l);
let since = 0;

const decide = (f, read) => {
  const state = read('state');
  if (state === 0) return f === 30 ? mask('START') : 0;
  if (state === 1) {
    const sel = read('sel');
    if (f % 6 !== 0) return 0;
    return sel !== song ? mask('DOWN') : mask('START');
  }
  if (state === 4 && process.argv.includes('--skipresults')) return read('res_t') === 3 ? mask('A') : 0;
  if (state !== 2) return 0;
  if (read('rc') > 0 || read('pending') >= 0) return 0;
  if (since++ < delay + 3) return 0;           // the delayed clock is stale for the first `delay` frames of a song
  const st = read('st');                       // the delayed song clock, as of the end of the previous frame
  let m = 0;
  for (let l = 0; l < 4; l++) {
    const k = next[l];
    if (k >= chart.lanes.length) continue;
    // the frame the game will run now has clock st + 1 (+ delay if we see the clock late)
    if (st + 1 >= k * chart.sf + offs[k][l]) {
      if (!skip[k][l]) m |= LANE_BTN[l];
      next[l] = k + 1; advance(l);
    }
  }
  return m;
};

const save = savePath ? fs.readFileSync(savePath) : null;
const r = await runBot({
  source: path.join(ROOT, 'src/main.vly'), decide, delay, save,
  live: ['state', 'sel', 'rc', 'pending'],
  done: (read) => (read('state') === 4 && (process.argv.includes('--skipresults') ? read('res_saved') === 1 : read('res_t') >= 125)) || read('state') === 5 && read('fail_t') > 30,
  maxFrames: 14000, after: 10,
});
const R = (n) => r.read(n);
const res = { song, delay, jitter, skip: skipRate, state: R('state'), score: R('score'), perfect: R('nperf'), good: R('ngood'), miss: R('nmiss'), maxcombo: R('maxcombo'), acc: R('res_acc'), grade: R('res_grade'), meter: R('meter'), fc: R('res_fc'), newbest: R('res_new'), frames: r.frames, notes: chart.lanes.reduce((a, m) => a + [0, 1, 2, 3].filter((l) => (m >> l) & 1).length, 0) };
if (!quiet) console.log(JSON.stringify(res));
else console.log(JSON.stringify(res));
if (out) fs.writeFileSync(path.resolve(out), r.input);
if (process.argv.includes('--savefile')) fs.writeFileSync(path.resolve(arg('savefile', 'tests/after.sav')), r.save || Buffer.alloc(0));
