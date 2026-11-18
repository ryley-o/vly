// How much does the player's reaction delay matter? "average" bot, N matches each.
import { build, playMatch, BOTS } from './sim.mjs';
const { rom, ram } = await build();
const N = +process.argv[2] || 12;
for (const level of [1, 2]) for (const delay of [4, 10, 16, 22, 30]) {
  let w = 0, sf = 0, sa = 0;
  for (let s = 1; s <= N; s++) { const r = playMatch(rom, ram, { level, bot: { ...BOTS.average, delay }, seed: s * 5 + delay, startAt: 20 + ((s * 41) % 300), maxFrames: 45000, unlock: true }); if (r.won) w++; sf += r.score[0]; sa += r.score[1]; }
  console.log(`level ${level} player delay ${String(delay).padStart(2)} frames: won ${w}/${N}, avg score ${(sf / N).toFixed(1)}-${(sa / N).toFixed(1)}`);
}
