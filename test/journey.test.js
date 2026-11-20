// The path an agent walks, start to finish, on a fresh machine: new project from the flow template, tests, check, release.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vly = path.join(root, 'cli', 'vly.js');

test('journey: vly new --template flow, then vly release --no-publish ends "released and verified" with the opening recorded', { timeout: 300_000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-journey-'));
  const run = (cwd, ...a) => spawnSync(process.execPath, [vly, ...a], { cwd, encoding: 'utf8' });
  const made = run(dir, 'new', 'quilt', '--template', 'flow');
  assert.equal(made.status, 0, made.stderr);
  const game = path.join(dir, 'quilt');
  const t = run(game, 'test');
  assert.equal(t.status, 0, t.stdout);
  assert.match(t.stdout, /10 passed, 0 failed/);
  const r = run(game, 'release', '--no-publish');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /released and verified/);
  for (const f of ['release/opening.gif', 'release/opening.wav', 'quilt.html']) assert.ok(fs.existsSync(path.join(game, f)), `${f} was written`);
  fs.rmSync(dir, { recursive: true, force: true });
});
