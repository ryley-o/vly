// `vly release`: build, tests, check, an old release's save, report, offline copy; and the stable save key of exported games.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { exportHtml, saveId } from '../src/export/index.js';
import { buildText } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = `var best; var n;
func init() { load_font(0); lcd(LCD_BG); if (save_valid()) { best = save_get(0); } text(1, 1, "BEST"); }
func frame() { n++; if (btnp(BTN_START)) { best = best + 1; save_set(0, best); save_seal(); save_commit(); } print_u(1, 3, best); print_u(1, 5, n); }`;

test('a stable id (or the cartridge hash) is the save key; legacy keys are carried into the exported page', async () => {
  const b = await buildText({ text: GAME, filename: 'main.vly', baseDir: '/nonexistent' });
  assert.match(saveId(b.bytes, {}), /^[0-9a-f]{16}$/, 'by default the key follows the cartridge hash');
  assert.equal(saveId(b.bytes, { id: 'Switch Yard!' }), 'switch-yard');
  const html = exportHtml(b.bytes, { title: 'T', id: 'switchyard', legacyIds: ['abc123'] });
  assert.match(html, /vly-save:switchyard/);
  assert.match(html, /LEGACY_IDS = \["abc123"\]/);
  assert.doesNotMatch(html, /__[A-Z_]+__/, 'every placeholder was filled');
});

test('vly release: stops at a failing step, tries an old save, runs the report, writes an offline copy', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-release-'));
  fs.mkdirSync(path.join(dir, 'src')); fs.mkdirSync(path.join(dir, 'tests', 'legacy-saves'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), GAME);
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'yard', id: 'switchyard', entry: 'src/main.vly', out: 'build/yard.vlc', tests: [{ name: 'it runs', frames: 30, expect: { words: { n: 30 } } }] }));
  // an old release's save: play it once, pressing START twice, and keep what it wrote
  const b = await buildText({ text: GAME, filename: 'main.vly', baseDir: '/nonexistent' });
  const r = runCartridge(b.bytes, { frames: 120, input: 'START@10,START@40' });
  fs.writeFileSync(path.join(dir, 'tests', 'legacy-saves', 'v1.sav'), r.saves[r.saves.length - 1].bytes);
  fs.writeFileSync(path.join(dir, 'tests', 'report.mjs'), 'console.log("level  optimal  first-use\\n1      1        none");\n');
  const run = (...a) => spawnSync('node', [path.join(root, 'cli', 'vly.js'), 'release', '--no-publish', ...a], { cwd: dir, encoding: 'utf8' });
  const ok = run();
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /ok\s+build/);
  assert.match(ok.stdout, /ok\s+tests: 1 passed/);
  assert.match(ok.stdout, /ok\s+old save tests\/legacy-saves\/v1\.sav: loaded, and the game ran on from it/);
  assert.match(ok.stdout, /level\s+optimal\s+first-use/);
  assert.match(ok.stdout, /offline copy: yard\.html \(save key "switchyard"\)/);
  assert.ok(fs.existsSync(path.join(dir, 'yard.html')));
  assert.match(fs.readFileSync(path.join(dir, 'yard.html'), 'utf8'), /vly-save:switchyard/);
  assert.doesNotMatch(ok.stdout, /looks the same with this save as without/, 'this game shows its best score, so the save visibly matters');
  // a save of the wrong size fails the release; a save the game ignores is a note
  fs.writeFileSync(path.join(dir, 'tests', 'legacy-saves', 'short.sav'), Buffer.alloc(100, 7));
  const bad = run();
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL\s+old save tests\/legacy-saves\/short\.sav: not a 1024-byte save/);
  assert.match(bad.stdout, /not released/);
});

test('vly release --no-sources publishes the cartridge only; without the flag the text sources go along', async (t) => {
  const http = await import('node:http');
  const seen = []; let stored = null;
  const server = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => { b += d; });
    req.on('end', () => {
      if (req.method === 'GET' && req.url.startsWith('/g/')) { res.setHeader('content-type', 'text/html'); return res.end('<html>play</html>'); }
      if (req.method === 'GET' && req.url.startsWith('/api/cart')) { res.setHeader('x-revision', '1'); return res.end(Buffer.from(stored)); }
      const j = JSON.parse(b); seen.push(j); stored = Buffer.from(j.cartridge_base64, 'base64');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, game_id: 'gx', title: j.title, revision: 1, play_url: `${site}/g/gx`, buy_url: 'http://x/buy', expires_at: '2030-01-01T00:00:00Z', edit_token: 't' }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); t.after(() => server.close());
  var site = `http://127.0.0.1:${server.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-release-ns-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), GAME);
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'yard', id: 'yard', entry: 'src/main.vly', out: 'build/yard.vlc', tests: [{ name: 'it runs', frames: 30, expect: { words: { n: 30 } } }] }));
  const { spawn } = await import('node:child_process');
  const go = (...a) => new Promise((resolve) => { const p = spawn('node', [path.join(root, 'cli', 'vly.js'), 'release', '--site', site, ...a], { cwd: dir }); let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; }); p.on('close', (status) => resolve({ status, out })); });
  const a = await go('--no-sources', '--new');
  assert.equal(a.status, 0, a.out);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].files, undefined, 'no sources with --no-sources');
  const b = await go('--new');
  assert.equal(b.status, 0, b.out);
  assert.ok(seen[1].files && seen[1].files['src/main.vly'], 'sources go along by default');
});

test('vly release: checks each route in releaseReplays (with an optional save) and recognises a passing migration test', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-release-rp-'));
  fs.mkdirSync(path.join(dir, 'src')); fs.mkdirSync(path.join(dir, 'tests', 'legacy-saves'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), GAME);
  fs.writeFileSync(path.join(dir, 'tests', 'win.input'), 'START@10,START@40');
  const b = await buildText({ text: GAME, filename: 'main.vly', baseDir: '/nonexistent' });
  const r = runCartridge(b.bytes, { frames: 120, input: 'START@10,START@40' });
  fs.writeFileSync(path.join(dir, 'tests', 'legacy-saves', 'v1.sav'), r.saves[r.saves.length - 1].bytes);
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'yard', id: 'yard', entry: 'src/main.vly', out: 'build/yard.vlc',
    tests: [{ name: 'it runs', frames: 30, expect: { words: { n: 30 } } }, { name: 'continue restores', save: 'tests/legacy-saves/v1.sav', frames: 30, expect: { words: { best: 2 } } }],
    releaseReplays: ['tests/win.input', { input: 'tests/win.input', save: 'tests/legacy-saves/v1.sav', name: 'from the old save' }] }));
  const out = spawnSync('node', [path.join(root, 'cli', 'vly.js'), 'release', '--no-publish'], { cwd: dir, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /ok\s+replay tests\/win\.input: /);
  assert.match(out.stdout, /ok\s+replay from the old save \(from tests\/legacy-saves\/v1\.sav\): /);
  assert.doesNotMatch(out.stdout, /add a vly\.json test that loads it/, 'the migration test covers the save');
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 'yard', id: 'yard', entry: 'src/main.vly', out: 'build/yard.vlc', tests: [{ name: 'it runs', frames: 30, expect: { words: { n: 30 } } }], releaseReplays: ['tests/missing.input'] }));
  const bad = spawnSync('node', [path.join(root, 'cli', 'vly.js'), 'release', '--no-publish'], { cwd: dir, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL\s+replay tests\/missing\.input/);
});
