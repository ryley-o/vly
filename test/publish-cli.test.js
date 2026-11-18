// `vly publish`: uploads the cartridge (base64) to the site, prints the play link, remembers the edit token to revise the same game, and fails kindly when the site is unreachable.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildText } from '../src/tools/build.js';

const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'vly.js');
const run = (cwd, ...args) => new Promise((resolve) => {
  const p = spawn('node', [cli, ...args], { cwd }); let out = '';
  p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
  p.on('close', (status) => resolve({ status, out }));
});

test('vly publish: refuses a frozen game, sends the cartridge, saves the token, revises the same game next time, and reports an unreachable site', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => { b += d; });
    req.on('end', () => {
      const j = JSON.parse(b); seen.push(j);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(j.game_id
        ? { ok: true, game_id: j.game_id, title: j.title, revision: 2, play_url: 'http://x/g/' + j.game_id, buy_url: 'http://x/buy', expires_at: '2030-01-01T00:00:00Z' }
        : { ok: true, game_id: 'gabc', title: j.title, revision: 1, play_url: 'http://x/g/gabc', buy_url: 'http://x/buy', expires_at: '2030-01-01T00:00:00Z', edit_token: 'secret-token' }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const site = `http://127.0.0.1:${server.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-pub-'));
  const b = await buildText({ text: 'var n;\nfunc init() { load_font(0); lcd(LCD_BG); text(1, 1, "HI"); }\nfunc frame() { n++; print_u(1, 3, n); }', filename: 'main.vly', baseDir: '/nonexistent' });
  fs.writeFileSync(path.join(dir, 'game.vlc'), b.bytes);
  fs.mkdirSync(path.join(dir, 'src')); fs.writeFileSync(path.join(dir, 'src', 'main.vly'), 'func frame() {}');

  const frozen = await buildText({ text: 'func init() { load_font(0); lcd(LCD_BG); text(1, 1, "STUCK"); }\nfunc frame() {}', filename: 'main.vly', baseDir: '/nonexistent' });
  fs.writeFileSync(path.join(dir, 'stuck.vlc'), frozen.bytes);
  const stuck = await run(dir, 'publish', 'stuck.vlc', '--site', site);
  assert.equal(stuck.status, 1); assert.match(stuck.out, /not published: vly check fails[\s\S]*FAIL\s+alive/); assert.equal(seen.length, 0, 'a failing game is not uploaded');

  const dry = await run(dir, 'publish', 'game.vlc', '--site', site, '--dry-run');
  assert.equal(dry.status, 0, dry.out); assert.match(dry.out, /would upload GAME/); assert.equal(seen.length, 0, 'a dry run sends nothing');

  const first = await run(dir, 'publish', 'game.vlc', '--title', 'My Game', '--site', site);
  assert.equal(first.status, 0, first.out);
  assert.match(first.out, /play:\s+http:\/\/x\/g\/gabc/);
  assert.equal(seen[0].title, 'MY GAME');
  assert.equal(Buffer.from(seen[0].cartridge_base64, 'base64').length, b.bytes.length, 'the cartridge goes up as it is');
  assert.ok(seen[0].files['src/main.vly'], 'sources were asked for');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.vly-publish.json'), 'utf8')).edit_token, 'secret-token');

  const second = await run(dir, 'publish', 'game.vlc', '--site', site);
  assert.match(second.out, /revised/);
  assert.equal(seen[1].game_id, 'gabc'); assert.equal(seen[1].edit_token, 'secret-token');
  server.close();

  const down = await run(dir, 'publish', 'game.vlc', '--site', 'http://127.0.0.1:1', '--new');
  assert.equal(down.status, 1);
  assert.match(down.out, /could not reach.*Nothing was published.*vly export/s);
});
