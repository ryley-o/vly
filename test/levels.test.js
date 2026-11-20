// vly levels: a profile of an ASCII level map that finds what makes levels feel empty.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { analyzeLevel } from '../src/tools/levelprofile.js';

const FLAT = [
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '..............................a..................................a..............................G...',
  '@...................................................................................................',
  '####################################################################################################',
  '####################################################################################################',
];
const VARIED = [
  '....................................................................................................',
  '..........................o.o.......................................o...............................',
  '.........................###......................................#####..................o.o.o......',
  '...................................o.........................................^^.....................',
  '.......................................b.......................c........e.....#######...............G',
  '.....a........................#.......###..............................###.....#...........d.........',
  '@...####.....####..S.......####......###....C....a....#####.......b..###..^^...##...#####......####...',
  '####################..####.....#####.###..###########......######.#########...#####....#######....####',
  '####################..####.....#####.###..###########......######.#########...#####....#######....####',
];

test('a flat level with a few identical enemies is flagged: dead screens, a long flat run, no ground variety, a repeated enemy', () => {
  const r = analyzeLevel(FLAT);
  const text = r.warnings.join('\n');
  assert.match(text, /nothing happens/);
  assert.match(text, /columns of flat, empty ground in a row/);
  assert.match(text, /leave the baseline ground/);
  assert.match(text, /never changes height/);
  assert.ok(r.longestEmptyFlatRun > 30, `longest ${r.longestEmptyFlatRun}`);
});

test('a varied level with pits, steps, platforms, hazards and five enemy kinds has no dead screens or long flat runs', () => {
  const r = analyzeLevel(VARIED);
  assert.equal(r.pits >= 5, true);
  assert.equal(r.enemyTypes.length, 5);
  assert.ok(r.longestEmptyFlatRun <= 12);
  assert.ok(!r.warnings.some((w) => /nothing happens|flat, empty|baseline ground|same enemy/.test(w)), r.warnings.join('\n'));
  assert.ok(r.offBaselineShare > 0.4);
});

test('the same enemy three times in a row is flagged, and a new enemy introduced beside a pit is flagged', () => {
  const rows = [
    '..............................................................',
    '..a....a....a...........b.....................................',
    '##########################..##################################',
    '##########################..##################################',
  ];
  const r = analyzeLevel(rows, { window: 10 });
  assert.ok(r.warnings.some((w) => /3 encounters in a row with the same enemy \(a\)/.test(w)), r.warnings.join('\n'));
  assert.ok(r.warnings.some((w) => /enemy b first appears with other dangers/.test(w)), r.warnings.join('\n'));
});

test('vly levels prints the profile for files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-lv-'));
  fs.writeFileSync(path.join(dir, 'flat.txt'), FLAT.join('\n'));
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'vly.js');
  const out = spawnSync(process.execPath, [cli, 'levels', path.join(dir, 'flat.txt')], { encoding: 'utf8' });
  assert.match(out.stdout, /flat\.txt: 100 columns x 7 rows/);
  assert.match(out.stdout, /things to look at/);
  fs.rmSync(dir, { recursive: true, force: true });
});

// The code in the power-up guide must compile and run.
import { buildText } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';
test('docs/ref-powerups.md: the implementation sketch builds with std/platformer and runs', async () => {
  const md = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'ref-powerups.md'), 'utf8');
  const code = /## 5\. A simple implementation[\s\S]*?```\n([\s\S]*?)```/.exec(md)[1];
  const text = `${code}\nfunc pl_solid(x, y) { return y >= 112; }\nfunc init() { pl_init(20, 96); }\nfunc frame() { pl_step(0, 0, 0, 0); update_powers(); if (frames() == 3) { take_powerup(0); take_powerup(0); } if (frames() == 5) { hurt_player(); } }\n`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  let out = null;
  const r = runCartridge(b.bytes, { frames: 10, onFrame: (f, m) => { out = { form: m.read16(b.stats.ram.form.addr), dead: m.read16(b.stats.ram.dead.addr) }; } });
  assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 });
  assert.deepEqual(out, { form: 0, dead: 0 }, 'grown twice, then hit once: shrinks to small and lives');
});
