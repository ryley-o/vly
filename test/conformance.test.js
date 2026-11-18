import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceCartridge } from '../src/tools/trace.js';
import { sha256Hex } from '../src/core/sha256.js';

const conf = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'conformance');
const { cases } = JSON.parse(fs.readFileSync(path.join(conf, 'cases.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(conf, 'expected.json'), 'utf8'));

for (const c of cases) {
  test(`conformance: ${c.name} matches its golden digest`, () => {
    const rom = new Uint8Array(fs.readFileSync(path.join(conf, c.cart)));
    const lines = traceCartridge(rom, c.frames, c.input);
    const e = expected[c.name];
    assert.equal(lines[0], e.init, 'state after init');
    assert.equal(lines[lines.length - 1], e.last, 'state after the last frame');
    assert.equal(sha256Hex(new TextEncoder().encode(lines.join('\n'))), e.digest, 'digest of all frames');
  });
}
