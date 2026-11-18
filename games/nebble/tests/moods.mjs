// Contact sheet: every adult form and a few moods. node tests/moods.mjs out.png
import fs from 'node:fs';
import { buildGame } from './pbot.mjs';
import { Machine } from '../../../src/core/machine.js';
import * as C from '../../../src/core/constants.js';
import { encodePNG, upscale } from '../../../src/tools/png.js';
const game = await buildGame();
const save = fs.readFileSync('tests/adult.sav');
const B = (n) => C.BTN[n];
const out = [];
for (const [label, setup] of [
  ['stage', [[1, 'baby'], [2, 'child'], [3, 'adult']]],
]) { void label; void setup; }
async function shot(stage, form, needs, frames = 30) {
  const m = new Machine(game.rom, { save, onSave: () => {} }); m.boot();
  const ram = game.ram; const w = (n, v) => m.write16(ram[n].addr, v);
  const run = (n, b = 0) => { for (let i = 0; i < n; i++) m.runFrame(b); };
  run(20); run(2, B('START')); run(80);                       // continue into the room
  w('stage', stage); w('form', form);
  run(2, B('START')); run(5); run(2, B('DOWN')); run(5); run(2, B('DOWN')); run(5); run(2, B('A')); run(80);   // pause, save + title
  run(2, B('START')); run(100);                                // continue again: the room loads the poked pet
  for (const [n, v] of Object.entries(needs)) w(n, v);
  run(frames);
  return m.renderRGBA();
}
const cells = [];
const moods = { happy: { hun: 90, fun: 90, nrg: 90, cln: 90 }, hungry: { hun: 10, fun: 90, nrg: 90, cln: 90 }, bored: { hun: 90, fun: 10, nrg: 90, cln: 90 }, sleepy: { hun: 90, fun: 90, nrg: 10, cln: 90 }, dirty: { hun: 90, fun: 90, nrg: 90, cln: 10 }, sulk: { hun: 5, fun: 5, nrg: 90, cln: 90 } };
for (const [st, fo] of [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4]]) cells.push(await shot(st, fo, moods.happy));
for (const k of ['hungry', 'bored', 'sleepy', 'dirty', 'sulk']) cells.push(await shot(3, 1, moods[k]));
// crop each to the floor area (rows 6..14 = y 56..120), 160x64, upscale 3, tile 3 across
const crop = (px) => { const o = new Uint8Array(160 * 80 * 4); for (let y = 0; y < 80; y++) for (let x = 0; x < 160; x++) for (let c = 0; c < 4; c++) o[(y * 160 + x) * 4 + c] = px[((y + 52) * 160 + x) * 4 + c]; return o; };
const cols = 4, rows = Math.ceil(cells.length / cols), k = 3;
const W = 160 * k * cols, H = 80 * k * rows; const sheet = new Uint8Array(W * H * 4);
cells.forEach((px, i) => { const up = upscale(160, 80, crop(px), k); const ox = (i % cols) * 160 * k, oy = Math.floor(i / cols) * 80 * k; for (let y = 0; y < 80 * k; y++) for (let x = 0; x < 160 * k; x++) for (let c = 0; c < 4; c++) sheet[((oy + y) * W + ox + x) * 4 + c] = up.rgba[(y * 160 * k + x) * 4 + c]; });
fs.writeFileSync(process.argv[2] || 'shots/moods.png', encodePNG(W, H, sheet, 4));
console.log('written', W, H);
