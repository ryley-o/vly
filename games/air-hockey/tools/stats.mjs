import { build, makeBot, mulberry, BTN } from './sim.mjs';
import { Machine } from '../../../src/core/machine.js';
import { makeReader } from './sim.mjs';
const { rom, ram } = await build();
const level = process.argv[2] !== undefined ? +process.argv[2] : 1, seed = +process.argv[3] || 5, frames = +process.argv[4] || 20000;
const bot = { delay: 14, aimErr: 12, noise: 0.015, predict: 1, bank: 0, counter: 0, err: 9, corner: 1 };
const m = new Machine(rom, {}); m.boot();
const rd = makeReader(m, ram);
const dec = makeBot(rd, bot, mulberry(seed));
const hits = { 1: [], 2: [] }; let idle = 0, play = 0, goals = 0, lastScore = '0,0', fastIn = 0;
let f = 0; 
for (; f < frames; f++) {
  const st = rd('state'); let b = 0;
  if (st === 0 && f >= 20 && f < 23) b = BTN.START;
  else if (st === 1) { if (rd('sel') !== level && f % 6 === 0) b = BTN.DOWN; else if (rd('sel') === level && f % 6 === 0) b = BTN.A; }
  else if (st === 2) b = (rd('st_t') > 25 && f % 4 === 0) ? BTN.A : 0;
  else if (st === 4) b = dec();
  m.runFrame(b);
  if (rd('state') === 4) {
    play++;
    const sp = Math.hypot(rd('pvx'), rd('pvy')) / 256;
    if (sp < 0.1) idle++;
    const e = rd('ev_mallet'); if (e) hits[e].push(Math.hypot(rd('pvx'), rd('pvy')) / 256);
  }
  const sc = rd('score',0)+','+rd('score',1); if (sc !== lastScore) { lastScore = sc; goals++; }
}
const avg = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
console.log('level', level, 'frames', f, 'play', play, 'idle%', (100 * idle / play).toFixed(1), 'goals', goals, 'frames/goal', Math.round(f / Math.max(1, goals)));
console.log(' bot hits', hits[1].length, 'avg out speed', avg(hits[1]), ' cpu hits', hits[2].length, 'avg', avg(hits[2]));
console.log(' final', lastScore);
