// Plays the SETUP screen: taps A `late` frames after each click, eight times, then B to save. Writes the presses to a file.
//   node tools/calbot.mjs --late 6 --out tests/cal6.input
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HOME = process.env.VLY_HOME || new URL('../../..', import.meta.url).pathname;
const { runBot, mask } = await import(path.join(HOME, 'src/tools/bot.js'));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const late = +arg('late', 3), out = arg('out', 'tests/cal.input');
let taps = 0, doneTaps = false, lastTap = -99;
const r = await runBot({
  source: path.join(ROOT, 'src/main.vly'),
  live: ['state', 'sc', 'cal', 'sc_taps'],
  decide: (f, read) => {
    const state = read('state');
    if (state === 0) return f === 30 ? mask('SELECT') : 0;
    if (state !== 6) return 0;
    if (!doneTaps && taps < 8 && ((read('sc') + 1) % 36 === ((late % 36) + 36) % 36) && f - lastTap > 10) { taps++; lastTap = f; if (taps === 8) doneTaps = true; return mask('A'); }
    if (doneTaps && f - lastTap > 20) return mask('B');
    return 0;
  },
  done: (read) => read('state') === 1 && read('sc') > 0,
  maxFrames: 2000, after: 30,
});
console.log('cal =', r.read('cal'), 'frames', r.frames);
fs.writeFileSync(path.resolve(out), r.input);
if (r.save) fs.writeFileSync(path.resolve(out.replace('.input', '.sav')), r.save);
