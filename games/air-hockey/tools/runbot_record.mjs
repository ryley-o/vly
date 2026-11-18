// The same "average" player, written with the toolchain's own bot kit (runBot), recording a whole match vs a level as an input script.
//   node tools/runbot_record.mjs <level> <seed> <out.input>
import fs from 'node:fs';
import { runBot, mask } from '../../../src/tools/bot.js';
import { makeBot, mulberry } from './sim.mjs';
const [level, seed, out] = [+process.argv[2], +process.argv[3], process.argv[4]];
const P = { delay: 14, aimErr: 12, noise: 0.015, predict: 1, bank: 0, counter: 0, err: 9, corner: 1 };
let dec = null;
const r = await runBot({
  source: 'src/main.vly',
  delay: 0,                                  // the policy keeps its own 14-frame history of the puck (it needs velocity from it)
  decide: (f, read, api) => {
    const st = read('state');
    if (st === 0) return f >= 20 && f < 23 ? mask('START') : 0;
    if (st === 1) return f % 6 === 0 ? (read('sel') !== level ? mask('DOWN') : mask('A')) : 0;
    if (st === 2) return read('st_t') > 25 && f % 4 === 0 ? mask('A') : 0;
    if (st === 4) { dec = dec || makeBot(read, P, mulberry(seed)); return dec(); }
    return 0;
  },
  done: (read) => read('state') === 7,
  maxFrames: 40000,
  after: 90,
});
console.log('reached win/lose screen:', r.reachedDone, 'frames', r.frames, 'score', r.read('score', 0), r.read('score', 1));
fs.writeFileSync(out, r.input);
if (r.save) fs.writeFileSync(out.replace('.input', '.sav'), r.save);
