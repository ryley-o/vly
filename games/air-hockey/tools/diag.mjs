// find stalls: puck nearly still for a long time
import { build, playMatch, makeBot, mulberry } from './sim.mjs';
const { rom, ram } = await build();
const level = +process.argv[2] || 1, seed = +process.argv[3] || 5;
const bot = { delay: 10, aimErr: 12, noise: 0.01, predict: 1, bank: 0, counter: 0, err: 3 };
const r = playMatch(rom, ram, { level, bot, seed, startAt: 20, maxFrames: 100 });
const rd = r.rd, m = r.machine;
const dec = makeBot(rd, bot, mulberry(seed + 1));
let still = 0, reports = 0, goals = 0, lastScore = '0,0';
for (let f = 0; f < 40000 && reports < 6; f++) {
  const st = rd('state');
  m.runFrame(st === 4 ? dec() : (st === 7 ? 0 : 0));
  if (st === 4) {
    const sp = Math.hypot(rd('pvx'), rd('pvy')) / 256;
    still = sp < 0.08 ? still + 1 : 0;
    if (still >= 240 && still < 300 && still % 6 === 0) console.log('  dbg', JSON.stringify(dec.dbg), 'me', (rd('mx',0)/64).toFixed(1), (rd('my',0)/64).toFixed(1), 'v', (rd('mvx',0)/256).toFixed(2), (rd('mvy',0)/256).toFixed(2));
    if (still === 240) { reports++; console.log('STALL at', f, 'puck', (rd('pux')/64).toFixed(1), (rd('puy')/64).toFixed(1), 'me', (rd('mx',0)/64).toFixed(1), (rd('my',0)/64).toFixed(1), 'cpu', (rd('mx',1)/64).toFixed(1), (rd('my',1)/64).toFixed(1), 'aimode', rd('ai_mode'), 'score', rd('score',0), rd('score',1)); }
  }
  const sc = rd('score',0)+','+rd('score',1); if (sc !== lastScore) { lastScore = sc; goals++; console.log('goal at', f, sc); }
}
