// win rates of three bot "humans" against the four CPU levels
import { build, playMatch, BOTS } from './sim.mjs';
const { rom, ram } = await build();
const BOTS_UNUSED = {
  novice:  { delay: 22, aimErr: 22, noise: 0.04, predict: 0, bank: 0, counter: 0, err: 16, corner: 0 },
  average: { delay: 14, aimErr: 12, noise: 0.015, predict: 1, bank: 0, counter: 0, err: 9, corner: 1 },
  expert:  { delay: 8, aimErr: 6, noise: 0.005, predict: 1, bank: 1, counter: 1, err: 4, corner: 1 },
};
const N = +process.argv[2] || 8;
const only = process.argv[3];
const out = {};
for (const [name, bot] of Object.entries(BOTS)) {
  if (only && only !== name) continue;
  for (const level of [0, 1, 2, 3]) {
    let w = 0, l = 0, d = 0, frames = 0, goals = 0, sf = 0, sa = 0;
    for (let s = 1; s <= N; s++) {
      const r = playMatch(rom, ram, { level, bot, seed: s * 7 + level, startAt: 20 + ((s * 53) % 300), maxFrames: 45000, unlock: true });
      if (r.won) w++; else if (r.lost) l++; else d++;
      frames += r.stats.frames; goals += r.score[0] + r.score[1]; sf += r.score[0]; sa += r.score[1];
    }
    console.log(name.padEnd(8), 'vs level', level, `W${w} L${l} unfinished${d}`, 'avg match', Math.round(frames / N / 60) + 's', 'frames/goal', Math.round(frames / Math.max(1, goals)), 'avg score', (sf / N).toFixed(1), '-', (sa / N).toFixed(1));
  }
}
