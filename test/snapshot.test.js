// What was the game doing when it failed: function, call chain, variables, picture; in vly check, vly run and vly test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildText } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';
import { faultSnapshot, firstFaultOf, formatSnapshot } from '../src/tools/snapshot.js';
import { checkCartridge } from '../src/tools/check.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROKEN = `var d = 3; var state = 0; var enemies[4];
func compute(x) { return 100 / x; }
func tick() { d = d - 1; enemies[1] = compute(d); }
func init() { enemies[0] = 5; }
func frame() { state = state + 1; if (state > 4) { tick(); } }`;

const build = () => buildText({ text: BROKEN, filename: 'main.vly', baseDir: '/nonexistent' });

test('a fault is explained: where, how it got there, and the variables (watched ones first)', async () => {
  const b = await build();
  const r = runCartridge(b.bytes, { frames: 30 });
  const first = firstFaultOf(r);
  assert.equal(first.kind, 'DIV0');
  const s = faultSnapshot(b.bytes, { ...first, input: '', symbols: b.symbols, ram: b.stats.ram, watch: ['d'] });
  assert.equal(s.fn, 'compute');
  assert.deepEqual(s.calledFrom, ['tick']);
  assert.equal(s.frame, first.frame);
  assert.equal(s.vars[0].name, 'd', 'the watched variable comes first');
  assert.equal(s.vars[0].value, 0);
  const enemies = s.vars.find((v) => v.name === 'enemies');
  assert.deepEqual(enemies.values, [5, 100, 0, 0]);
  assert.ok(s.rgba && s.rgba.length === 160 * 144 * 4, 'the picture is attached');
  assert.ok(!JSON.stringify(s).includes('rgba'), 'but it is not part of the JSON');
  const text = formatSnapshot(s);
  assert.match(text, /divided by zero on frame \d+, in compute\(\)/);
  assert.match(text, /called from tick/);
  assert.match(text, /variables: d=0 /);
});

test('without the source the address and instruction are still reported, with a pointer to build from source', async () => {
  const b = await build();
  const first = firstFaultOf(runCartridge(b.bytes, { frames: 30 }));
  const s = faultSnapshot(b.bytes, { ...first, input: '' });
  assert.equal(s.fn, null);
  assert.match(s.instruction, /^DIV/);
  assert.match(formatSnapshot(s), /build from source/);
});

test('a game without faults has nothing to explain', async () => {
  const b = await buildText({ text: 'var n; func frame() { n++; }', filename: 'main.vly', baseDir: '/nonexistent' });
  assert.equal(firstFaultOf(runCartridge(b.bytes, { frames: 60 })), null);
});

test('vly check puts the explanation in the FAIL and keeps the replay input and picture', async () => {
  const b = await build();
  const r = checkCartridge(b.bytes, { frames: 600, symbols: b.symbols, ram: b.stats.ram });
  const f = r.checks.find((c) => c.id === 'faults');
  assert.equal(f.status, 'fail');
  assert.match(f.hint, /in compute\(\)/);
  assert.match(f.hint, /variables: .*state=/);
  assert.ok(r.snapshot.scenario);
  assert.ok(r.snapshot.rgba);
});

test('vly test failures say where the game faulted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-snap-'));
  fs.writeFileSync(path.join(dir, 'main.vly'), BROKEN);
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ entry: 'main.vly', tests: [{ name: 'runs', frames: 20, input: '' }] }));
  const out = spawnSync(process.execPath, [path.join(root, 'cli/vly.js'), 'test', dir], { encoding: 'utf8' });
  assert.notEqual(out.status, 0);
  assert.match(out.stdout, /in compute\(\)/);
  assert.match(out.stdout, /variables: /);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vly run and vly check write the evidence next to the build', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-snap-'));
  fs.writeFileSync(path.join(dir, 'main.vly'), BROKEN);
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ entry: 'main.vly', watch: ['state'] }));
  const cli = path.join(root, 'cli/vly.js');
  const run = spawnSync(process.execPath, [cli, 'run', 'main.vly', '--frames', '20', '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(run.stdout);
  assert.equal((j.data || j).snapshot.fn, 'compute');
  assert.ok(fs.existsSync(path.join(dir, 'build', 'fault.png')));
  const chk = spawnSync(process.execPath, [cli, 'check', 'main.vly', '--frames', '600'], { cwd: dir, encoding: 'utf8' });
  assert.match(chk.stdout, /in compute\(\)/);
  assert.ok(fs.existsSync(path.join(dir, 'build', 'check-fault.png')));
  assert.ok(fs.existsSync(path.join(dir, 'build', 'check-fault.input')));
  fs.rmSync(dir, { recursive: true, force: true });
});
