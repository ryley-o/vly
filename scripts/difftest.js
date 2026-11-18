// Differential test: run every conformance case in the JS reference and the C implementation and compare the
// per-frame trace line by line. Usage: node scripts/difftest.js [--filter substring]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { traceCartridge, inputBytes } from '../src/tools/trace.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conf = path.join(root, 'conformance');
const filter = process.argv.includes('--filter') ? process.argv[process.argv.indexOf('--filter') + 1] : '';

execFileSync('make', ['-C', path.join(root, 'c')], { stdio: 'inherit' });
const bin = path.join(root, 'c', 'build', 'vlyc');
const { cases } = JSON.parse(fs.readFileSync(path.join(conf, 'cases.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-diff-'));
let bad = 0;
for (const c of cases) {
  if (filter && !c.name.includes(filter)) continue;
  const cart = path.join(conf, c.cart);
  const rom = new Uint8Array(fs.readFileSync(cart));
  const js = traceCartridge(rom, c.frames, c.input);
  const inFile = path.join(tmp, 'in.bin');
  fs.writeFileSync(inFile, inputBytes(c.frames, c.input));
  const out = execFileSync(bin, [cart, String(c.frames), inFile], { maxBuffer: 1 << 28 }).toString().trim().split('\n');
  let diff = null;
  for (let i = 0; i < js.length; i++) {
    if (js[i] !== out[i]) { diff = { i, js: js[i], c: out[i] }; break; }
  }
  if (!diff && out.length !== js.length) diff = { i: Math.min(out.length, js.length), js: js[out.length] || '(end)', c: out[js.length] || '(end)' };
  if (diff) {
    bad++;
    const [jf, jc, js_, jstate, jframe] = (diff.js || '').split(' ');
    const [cf, cc, cs, cstate, cframe] = (diff.c || '').split(' ');
    const what = [jc !== cc ? `cycles js=${jc} c=${cc}` : null, js_ !== cs ? `status js=${js_} c=${cs}` : null, jstate !== cstate ? 'state hash differs' : null, jframe !== cframe ? 'frame hash differs' : null].filter(Boolean).join('; ');
    console.log(`DIFF  ${c.name}: first mismatch at frame ${jf}: ${what}`);
  } else {
    console.log(`ok    ${c.name} (${c.frames} frames)`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `\n${bad} case(s) differ` : '\nall cases match between JS and C');
process.exit(bad ? 1 : 0);
