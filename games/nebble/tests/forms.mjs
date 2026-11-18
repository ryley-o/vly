// node tests/forms.mjs [seeds]: which adult form each persona ends up with, over several seeds
import { buildGame, session, makePolicy } from './pbot.mjs';
const game = await buildGame();
const seeds = +(process.argv[2] || 10);
const names = ['STARRY', 'DASHY', 'PUDGY', 'LUNA', 'SCAMP'];
for (const persona of (process.argv[3] || 'attentive,snacker,player,sleeper,mixed,casual,forgetful,neglect').split(',')) {
  const cnt = [0, 0, 0, 0, 0]; let adultAt = [], notAdult = 0, wins = [0, 0], plays = [0, 0];
  for (let s = 1; s <= seeds; s++) {
    const policy = makePolicy({ persona, seed: s * 7 + 1 });
    let stageAt = -1;
    const base = policy.decide;
    policy.decide = (f, read, api) => { if (stageAt < 0 && read('stage') === 3) stageAt = f; return base(f, read, api); };
    const { r } = await session(game, { persona, policy }, null, 3600 * 16);
    if (r.read('stage') === 3) { cnt[r.read('form')]++; adultAt.push(stageAt / 3600); } else notAdult++;
    for (const x of policy.stats.results) { plays[0]++; if (x[2] > 0) wins[0]++; }
  }
  const avg = adultAt.length ? (adultAt.reduce((a, b) => a + b, 0) / adultAt.length).toFixed(1) : '-';
  console.log(persona.padEnd(10), names.map((n, i) => `${n}:${cnt[i]}`).join(' '), ' notAdult:', notAdult, ' grew up after (min):', avg, ' minigame results', plays[0], 'wins', wins[0]);
}
