// Fuzz campaign: generate N random programs (CPU and video) and compare the JavaScript reference with the C
// implementation hash-for-hash on every frame. Usage: node scripts/fuzz.js [count=200] [firstSeed=100000]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assemble } from '../src/asm/assembler.js';
import { traceCartridge, inputBytes } from '../src/tools/trace.js';
import { cpuFuzz, videoFuzz, mulberry32 } from './fuzz-gen.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const count = parseInt(process.argv[2] || '200', 10);
const first = parseInt(process.argv[3] || '100000', 10);
execFileSync('make', ['-C', path.join(root, 'c')], { stdio: 'ignore' });
const bin = path.join(root, 'c', 'build', 'vlyc');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-fuzz-'));
let bad = 0, runs = 0, frames = 0;
for (let i = 0; i < count; i++) {
  const seed = first + i;
  const video = i % 5 === 4;
  const src = video ? videoFuzz(seed) : cpuFuzz(seed);
  let rom;
  try { rom = assemble(src, { filename: `fuzz_${seed}.asm` }).bytes; } catch (e) { console.log(`seed ${seed}: generator produced invalid assembly: ${e.message.split('\n')[0]}`); bad++; continue; }
  const n = video ? 12 : 30;
  const r = mulberry32(seed ^ 0x5555);
  const input = `${['RIGHT', 'A', 'UP+B', 'START', 'LEFT+DOWN'][Math.floor(r() * 5)]}@${Math.floor(r() * 8)}-${8 + Math.floor(r() * 20)}`;
  const js = traceCartridge(rom, n, input);
  const cart = path.join(tmp, 'c.vlc'), inp = path.join(tmp, 'in.bin');
  fs.writeFileSync(cart, rom); fs.writeFileSync(inp, inputBytes(n, input));
  const out = execFileSync(bin, [cart, String(n), inp], { maxBuffer: 1 << 28 }).toString().trim().split('\n');
  runs++; frames += n;
  const k = js.findIndex((l, idx) => l !== out[idx]);
  if (k >= 0 || out.length !== js.length) {
    bad++;
    const keep = path.join(root, 'tmp', `fuzz_${seed}.asm`);
    fs.mkdirSync(path.dirname(keep), { recursive: true });
    fs.writeFileSync(keep, src);
    console.log(`DIFF seed ${seed} (${video ? 'video' : 'cpu'}): first mismatch at line ${k}\n  js: ${js[k]}\n  c : ${out[k]}\n  program saved to ${keep}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `${bad} mismatch(es) in ${runs} programs` : `fuzz ok: ${runs} random programs, ${frames} frames, JS and C agree everywhere`);
process.exit(bad ? 1 : 0);
