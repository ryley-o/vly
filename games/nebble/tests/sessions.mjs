// node tests/sessions.mjs persona minutesPerSession sessions [seed]: play in short sessions, power cycling in between (the save carries over)
import { buildGame, session, makePolicy } from './pbot.mjs';
const game = await buildGame();
const [persona, mins, n, seed] = [process.argv[2] || 'attentive', +(process.argv[3] || 3), +(process.argv[4] || 6), +(process.argv[5] || 3)];
let save = null; const names = ['STARRY', 'DASHY', 'PUDGY', 'LUNA', 'SCAMP'];
for (let i = 1; i <= n; i++) {
  const policy = makePolicy({ persona, seed: seed * 100 + i });
  let first = null;
  const base = policy.decide;
  policy.decide = (f, read, api) => { if (!first && read('state') === 3 && read('trans') === 0) first = ['hun', 'fun', 'nrg', 'cln', 'clk', 'age'].map((k) => read(k)); return base(f, read, api); };
  const { r } = await session(game, { persona, policy }, save, mins * 3600);
  const rd = r.read;
  console.log(`session ${i}: room needs on arrival (hun,fun,nrg,cln,clk,age) = ${first}; end: stage ${rd('stage')} form ${rd('stage') === 3 ? names[rd('form')] : '-'} age ${rd('age')} day ${rd('day')} needs ${rd('hun')}/${rd('fun')}/${rd('nrg')}/${rd('cln')} boots ${rd('boots')} saveBytesUsed 60`);
  save = r.save || save;
}
