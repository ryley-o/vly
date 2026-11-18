// A template or sample game with a new skin is not a game: the originality gate must catch it, leave our own games alone, and the index must be current.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildIndex, compare, verdict, loadIndex, readProjectFiles } from '../src/tools/originality.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refDirs = () => {
  const refs = {};
  for (const group of ['templates', 'games']) for (const e of fs.readdirSync(path.join(root, group), { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(root, group, e.name, 'src'))) refs[`${group === 'templates' ? 'template ' : ''}${e.name}`] = path.join(root, group, e.name);
  return refs;
};

test('the originality index is current (npm run gen rebuilds it)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(buildIndex(refDirs()))), loadIndex());
});

test('every template and sample game is its own game: none looks like a re-skin of another', () => {
  const idx = loadIndex();
  for (const [name, dir] of Object.entries(refDirs())) {
    const others = { ...idx, refs: Object.fromEntries(Object.entries(idx.refs).filter(([k]) => k !== name)) };
    const v = verdict(compare(readProjectFiles(dir), others));
    assert.notEqual(v.status, 'fail', `${name}: ${v.message}`);
  }
});

test('a template with a new title and a few renamed words is a re-skin, and vly check fails it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-reskin-'));
  const run = (...a) => spawnSync('node', [path.join(root, 'cli', 'vly.js'), ...a], { cwd: dir, encoding: 'utf8' });
  assert.equal(run('new', dir, '--template', 'puzzle').status, 0);
  const main = path.join(dir, 'src', 'main.vly');
  fs.writeFileSync(main, fs.readFileSync(main, 'utf8').replaceAll('CRATES', 'QUILTS'));
  const r = run('check', '--frames', '600');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL\s+originality: this looks like a re-skin of template puzzle/);
});

test('an original program passes the gate; a missing DESIGN.md is a warning', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-own-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'own', entry: 'src/main.vly', out: 'build/own.vlc', tests: [] }));
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), 'var n;\nfunc init() { load_font(0); lcd(LCD_BG); text(2, 2, "MY OWN GAME"); }\nfunc frame() { n++; print_u(2, 4, n); if (btnp(BTN_START)) { n = 0; } }\n');
  const r = spawnSync('node', [path.join(root, 'cli', 'vly.js'), 'check', 'src/main.vly', '--frames', '600'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout, /PASS\s+originality/);
  assert.match(r.stdout, /WARN\s+brief: there is no DESIGN.md/);
});
