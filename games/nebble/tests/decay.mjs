import { buildGame, session, makePolicy } from './pbot.mjs';
const game = await buildGame();
const policy = makePolicy({ persona: 'neglect', seed: 1 });
const rows = []; const base = policy.decide;
policy.decide = (f, read, api) => { if (read('state') === 3 && f % 1800 === 0 || f === 100) rows.push([f, read('state'), read('stage'), read('hun'), read('fun'), read('nrg'), read('cln'), read('mess'), read('clk')]); return base(f, read, api); };
await session(game, { persona: 'neglect', policy }, null, 3600 * 8);
console.log('frame state stage hun fun nrg cln mess clk');
for (const r of rows) console.log(r.join('\t'));
