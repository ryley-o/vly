import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WasmMachine } from '../src/wasm/index.js';
import { Machine } from '../src/core/index.js';
import { sha256Hex } from '../src/core/sha256.js';
import { parseInputSpec } from '../src/tools/input.js';

const conf = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'conformance');
const { cases } = JSON.parse(fs.readFileSync(path.join(conf, 'cases.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(conf, 'expected.json'), 'utf8'));

async function traceWasm(rom, frames, input) {
  const fn = parseInputSpec(input);
  const m = await WasmMachine.create(rom);
  const line = (f, c) => `${f} ${c} ${m.status} ${m.stateHashHex()} ${m.frameHashHex()}`;
  m.boot();
  const lines = [line(-1, m.initCycles)];
  for (let i = 0; i < frames; i++) { m.runFrame(fn(i)); lines.push(line(i, m.lastCycles)); }
  return lines;
}

for (const c of cases) {
  test(`wasm: ${c.name} matches the golden digest`, async () => {
    const rom = new Uint8Array(fs.readFileSync(path.join(conf, c.cart)));
    const lines = await traceWasm(rom, c.frames, c.input);
    const e = expected[c.name];
    assert.equal(lines[0], e.init);
    assert.equal(lines[lines.length - 1], e.last);
    assert.equal(sha256Hex(new TextEncoder().encode(lines.join('\n'))), e.digest);
  });
}

test('wasm: the module is small and has no imports', async () => {
  const bytes = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wasm', 'vly.wasm'));
  assert.ok(bytes.length < 40000, `${bytes.length} bytes`);
  const mod = await WebAssembly.compile(bytes);
  assert.deepEqual(WebAssembly.Module.imports(mod), []);
});

test('wasm: saves, rendering and rejection of bad cartridges', async () => {
  const rom = new Uint8Array(fs.readFileSync(path.join(conf, 'carts', 'template_game.vlc')));
  const saves = [];
  const w = await WasmMachine.create(rom, { onSave: (b) => saves.push(b) });
  const j = new Machine(rom, { onSave: () => {} });
  w.boot(); j.boot();
  for (let i = 0; i < 30; i++) { w.runFrame(i < 12 ? 8 : i === 14 ? 64 : 0); j.runFrame(i < 12 ? 8 : i === 14 ? 64 : 0); }
  assert.equal(saves.length, 1);
  assert.equal(saves[0].length, 1024);
  assert.deepEqual(Array.from(w.renderRGBA().slice(0, 4096)), Array.from(j.renderRGBA().slice(0, 4096)));
  await assert.rejects(() => WasmMachine.create(new Uint8Array(32)), /bad magic/);
  const withSave = await WasmMachine.create(rom, { save: saves[0] });
  withSave.boot();
  withSave.runFrame(0);
  assert.equal(withSave.status & 0x100, 0x100, 'SAVE_LOADED is set');
});

test('wasm: audio matches the reference synth closely', async () => {
  const { Synth } = await import('../src/core/index.js');
  const rom = new Uint8Array(fs.readFileSync(path.join(conf, 'carts', 'audio.vlc')));
  const w = await WasmMachine.create(rom);
  const j = new Machine(rom);
  const synth = new Synth(j.mem);
  w.boot(); j.boot();
  let big = 0, total = 0, nonzero = 0;
  for (let f = 0; f < 100; f++) {
    w.runFrame(0); j.runFrame(0);
    const a = w.renderAudio(735), b = synth.render(735);
    for (let i = 0; i < 735; i++) { total++; if (a[i] !== 0) nonzero++; if (Math.abs(a[i] - b[i]) > 0.05) big++; }
  }
  assert.ok(nonzero > total / 2);
  assert.ok(big / total < 0.01, `${(100 * big / total).toFixed(2)}% differ`);
});
