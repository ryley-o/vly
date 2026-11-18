// The boot sequence is a real cartridge the hosts run first. It must be current (npm run gen), run clean, draw the logo and make a sound.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildFile } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';
import { BOOT_ROM, BOOT_FRAMES } from '../src/boot/boot-rom.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the boot ROM is current, runs without faults, falls then rests, and plays a chime', async () => {
  const b = await buildFile(path.join(root, 'boot', 'boot.vly'));
  assert.deepEqual(Array.from(BOOT_ROM), Array.from(b.bytes), 'src/boot/boot-rom.js is stale: run npm run gen');
  const header = fs.readFileSync(path.join(root, 'c', 'boot_rom.h'), 'utf8');
  assert.match(header, new RegExp(`VLY_BOOT_FRAMES ${BOOT_FRAMES}`));
  assert.match(header, new RegExp(`vly_boot_rom\\[${BOOT_ROM.length}\\]`));
  const r = runCartridge(BOOT_ROM, { frames: BOOT_FRAMES, audio: true, screenshotFrames: [5, 40, 100, BOOT_FRAMES - 1] });
  assert.deepEqual(r.faults, Object.fromEntries(Object.entries(r.faults).map(([k]) => [k, 0])), 'no faults');
  const hex = (f) => Buffer.from(r.screenshots.get(f)).toString('hex');
  assert.notEqual(hex(5), hex(40), 'the logo is falling');
  assert.notEqual(hex(40), hex(100), 'and then it rests');
  assert.equal(hex(100), hex(BOOT_FRAMES - 1), 'the resting logo is still');
  const peak = r.audio.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak > 0.05, 'the chime is audible');
  assert.ok(peak < 0.6, `and not loud (peak ${peak.toFixed(2)})`);
});

test('vly check prints the checklist from DESIGN.md, as information', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-plan-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'p', entry: 'src/main.vly', out: 'build/p.vlc', tests: [] }));
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), 'var n;\nfunc init() { load_font(0); lcd(LCD_BG); text(2, 2, "PLAN"); }\nfunc frame() { n++; print_u(2, 4, n); }\n');
  fs.writeFileSync(path.join(dir, 'DESIGN.md'), `# Plan\n\n${'A game about growing quilts. '.repeat(30)}\n\n## Done when\n\n- [ ] 200 levels in order of difficulty\n- [ ] a level select with medals\n\n## Notes\n- not a promise\n`);
  const r = spawnSync('node', [path.join(root, 'cli', 'vly.js'), 'check', '--frames', '600'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout, /INFO\s+plan: your own plan promises 2 things/);
  assert.match(r.stdout, /\[ \] 200 levels in order of difficulty/);
  assert.doesNotMatch(r.stdout, /not a promise/);
});
