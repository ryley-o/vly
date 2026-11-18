// node tests/calib.mjs savefile plays   : mini-game star distribution per game and skill, from a saved pet
import fs from 'node:fs';
import { buildGame, session, makePolicy } from './pbot.mjs';
const game = await buildGame();
const save = fs.readFileSync(process.argv[2]);
const plays = +(process.argv[3] || 20);
const skills = {
  perfect: { delay: 0, jitter: 0, slip: 0, comp: true },
  careful: { delay: 8, jitter: 1, slip: 0.02, comp: true },
  casual: { delay: 14, jitter: 3, slip: 0.08, comp: true },
  sloppy: { delay: 24, jitter: 6, slip: 0.2, comp: true, gap: 25 },
  slow: { delay: 32, jitter: 4, slip: 0.1, comp: true, gap: 30 },
  late12: { delay: 12, jitter: 0, slip: 0, comp: false },
};
const names = ['CATCH', 'COPY', 'HOP'];
for (const [sn, skill] of Object.entries(skills)) {
  const row = [];
  for (let g = 0; g < 3; g++) {
    const policy = makePolicy({ persona: 'trainer', game: g, seed: 11 + g, skill, freeze: true });
    const { r } = await session(game, { persona: 'trainer', game: g, policy }, save, 3600 * 25);
    // stop when enough plays: re-run is simpler than a done hook here: use stats
    const res = policy.stats.results.filter((x) => x[0] === g).slice(0, plays);
    const hist = [0, 0, 0, 0]; let sc = 0; for (const x of res) { hist[x[2]]++; sc += x[1]; }
    row.push(`${names[g]} n=${res.length} stars0-3=${hist.join('/')} avg=${(sc / Math.max(1, res.length)).toFixed(1)}`);
  }
  console.log(sn.padEnd(8), row.join(' | '));
}
