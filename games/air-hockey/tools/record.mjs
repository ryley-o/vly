// Record a bot's whole match as an input script (and the save the game wrote), with the toolchain's bot kit.
//   node tools/record.mjs <level> <win|lose> <seed0> <novice|average|expert> <out.input>
import fs from 'node:fs';
import { runBot, mask } from '../../../src/tools/bot.js';
import { makeBot, mulberry, BOTS } from './sim.mjs';
const [level, want, seed0, botName, out] = [+process.argv[2], process.argv[3], +process.argv[4], process.argv[5], process.argv[6]];
const unlockSave = (() => { const b = new Uint8Array(1024); return b; })();
for (let seed = seed0; seed < seed0 + 80; seed++) {
  let dec = null;
  const r = await runBot({
    source: 'src/main.vly',
    save: process.env.SAVE ? fs.readFileSync(process.env.SAVE) : undefined,
    decide: (f, read) => {
      const st = read('state');
      if (st === 0) return f >= 20 && f < 23 ? mask('START') : 0;
      if (st === 1) { const sel = read('sel'); return f % 6 === 0 ? (sel !== level ? mask('DOWN') : mask('A')) : 0; }
      if (st === 2) return read('st_t') > 25 && f % 4 === 0 ? mask('A') : 0;
      if (st === 4) { dec = dec || makeBot(read, BOTS[botName], mulberry(seed)); return dec(); }
      return 0;
    },
    done: (read) => read('state') === 7,
    maxFrames: 40000, after: 90,
  });
  const s0 = r.read('score', 0), s1 = r.read('score', 1);
  const ok = r.reachedDone && (want === 'win' ? s0 > s1 : s1 > s0);
  console.log('seed', seed, s0 + '-' + s1, r.frames, ok ? 'OK' : 'no');
  if (ok) {
    fs.writeFileSync(out, `# ${botName} bot vs level ${level}: ${s0}-${s1} in ${r.frames} frames (seed ${seed}); recorded with runBot\n` + r.input.split('\n').slice(1).join('\n'));
    if (r.save) fs.writeFileSync(out.replace('.input', '.sav'), r.save);
    console.log('wrote', out);
    break;
  }
}
