// Anti-cheat check: a bot that mashes every lane button every 3rd frame. Should not be able to score well.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HOME = process.env.VLY_HOME || new URL('../../..', import.meta.url).pathname;
const { runBot, mask } = await import(path.join(HOME, 'src/tools/bot.js'));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const song = +(process.argv[2] ?? 0), every = +(process.argv[3] ?? 3);
const all = mask('LEFT+DOWN+B+A');
const r = await runBot({
  source: path.join(ROOT, 'src/main.vly'), live: ['state', 'sel', 'pending'],
  decide: (f, read) => {
    const s = read('state');
    if (s === 0) return f === 30 ? mask('START') : 0;
    if (s === 1) return f % 6 === 0 ? (read('sel') !== song ? mask('DOWN') : mask('START')) : 0;
    if (s === 2 && read('pending') < 0) return f % every === 0 ? all : 0;
    return 0;
  },
  done: (read) => read('state') === 5 || (read('state') === 4 && read('res_t') >= 125), maxFrames: 9000, after: 5,
});
const R = r.read;
console.log(JSON.stringify({ song, mashEveryFrames: every, state: R('state'), score: R('score'), perfect: R('nperf'), good: R('ngood'), miss: R('nmiss'), meter: R('meter'), acc: R('res_acc'), frames: r.frames }));
