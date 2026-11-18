// node tests/mksave.mjs out.sav "stage=2,age=700,n_snack=9"   [from.sav]
// Makes a scenario save: loads a save, pokes variables, and uses the game's own pause -> "SAVE + TITLE" to write it (so it is sealed and valid).
import fs from 'node:fs';
import { buildGame } from './pbot.mjs';
import { Machine } from '../../../src/core/machine.js';
import * as C from '../../../src/core/constants.js';
const [out, spec, from] = [process.argv[2], process.argv[3], process.argv[4] || 'tests/adult.sav'];
const game = await buildGame();
let saved = null;
const m = new Machine(game.rom, { save: fs.readFileSync(from), onSave: (b) => { saved = Uint8Array.from(b); } }); m.boot();
const run = (n, b = 0) => { for (let i = 0; i < n; i++) m.runFrame(b); };
run(20); run(2, C.BTN.START); run(100);
for (const kv of spec.split(',').filter(Boolean)) { const [k, v] = kv.split('='); m.write16(game.ram[k].addr, +v); }
run(1);
run(2, C.BTN.START); run(5); run(2, C.BTN.DOWN); run(5); run(2, C.BTN.DOWN); run(5); run(2, C.BTN.A); run(30);
fs.writeFileSync(out, saved);
console.log('wrote', out, spec);
