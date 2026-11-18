// Regenerates the conformance suite: cartridges (hand-written sources + seeded random programs),
// conformance/cases.json, and conformance/expected.json (golden digests computed by the JS reference).
// Usage: node scripts/gen-conformance.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../src/asm/assembler.js';
import { buildFile } from '../src/tools/build.js';
import { traceCartridge } from '../src/tools/trace.js';
import { sha256Hex } from '../src/core/sha256.js';
import { mulberry32, cpuFuzz, videoFuzz } from './fuzz-gen.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conf = path.join(root, 'conformance');
fs.mkdirSync(path.join(conf, 'carts'), { recursive: true });
fs.mkdirSync(path.join(conf, 'src'), { recursive: true });

const cases = [];
const add = (name, source, frames, input = '') => {
  const rom = source;
  fs.writeFileSync(path.join(conf, 'carts', `${name}.vlc`), rom);
  cases.push({ name, cart: `carts/${name}.vlc`, frames, input });
};

// hand-written
for (const [file, frames, input] of [
  ['memory_map.asm', 4, ''], ['banking.asm', 3, ''], ['budget.asm', 12, ''], ['stack_edge.asm', 3, ''],
  ['alu_ops.vly', 24 * 144 + 2, ''], ['audio.vly', 200, ''],
]) {
  const b = await buildFile(path.join(conf, 'src', file));
  add(file.replace(/\.[a-z]+$/, ''), b.bytes, frames, input);
}
// fuzz programs
for (let i = 0; i < 24; i++) {
  const src = cpuFuzz(1000 + i);
  fs.writeFileSync(path.join(conf, 'src', `fuzz_cpu_${String(i).padStart(2, '0')}.asm`), src);
  const r = mulberry32(5000 + i);
  const inp = `${['RIGHT', 'A', 'UP+B', 'START', 'LEFT+DOWN'][Math.floor(r() * 5)]}@${Math.floor(r() * 10)}-${10 + Math.floor(r() * 20)}`;
  add(`fuzz_cpu_${String(i).padStart(2, '0')}`, assemble(src, { filename: `fuzz_cpu_${i}.asm` }).bytes, 40, inp);
}
for (let i = 0; i < 8; i++) {
  const src = videoFuzz(7000 + i);
  fs.writeFileSync(path.join(conf, 'src', `fuzz_video_${i}.asm`), src);
  add(`fuzz_video_${i}`, assemble(src, { filename: `fuzz_video_${i}.asm` }).bytes, 25);
}
// templates
for (const t of ['hello', 'game', 'pong', 'battle', 'platformer', 'puzzle', 'shooter']) {
  const b = await buildFile(path.join(root, 'templates', t, 'src', 'main.vly'));
  // the first 240 frames of the shooter's recorded bot (see templates/shooter/tests/wave1.input)
  const botInput = fs.readFileSync(path.join(root, 'templates', 'shooter', 'tests', 'wave1.input'), 'utf8').split('\n')
    .filter((l) => /^\w+@\d+/.test(l) && parseInt(l.split('@')[1], 10) < 240).join(', ');
  const inputs = {
    shooter: [240, botInput],
    platformer: [170, 'START@5, RIGHT@10-165, A@45-59, A@91-105, A@108-122'],
    puzzle: [90, 'START@5, RIGHT@10, RIGHT@13, RIGHT@16, RIGHT@19, A@30, RIGHT@40, DOWN@43, B@46'],
  };
  const [n, input] = inputs[t] || [90, 'RIGHT@0-40, DOWN@20-60, A@10, A@12, START@50'];
  add(`template_${t}`, b.bytes, n, input);
}

fs.writeFileSync(path.join(conf, 'cases.json'), JSON.stringify({ description: 'VLY-1 conformance cases. Run each cart for N frames with the given input and compare per-frame state/frame hashes.', cases }, null, 2) + '\n');

const expected = {};
for (const c of cases) {
  const rom = new Uint8Array(fs.readFileSync(path.join(conf, c.cart)));
  const lines = traceCartridge(rom, c.frames, c.input);
  expected[c.name] = { frames: c.frames, digest: sha256Hex(new TextEncoder().encode(lines.join('\n'))), init: lines[0], last: lines[lines.length - 1] };
}
fs.writeFileSync(path.join(conf, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
console.log(`wrote ${cases.length} conformance cases`);
