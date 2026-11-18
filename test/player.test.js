import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Machine } from '../src/core/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let built = false;
try { execFileSync('pkg-config', ['--exists', 'sdl2']); execFileSync('make', ['-C', path.join(root, 'c'), 'player'], { stdio: 'ignore' }); built = true; } catch { /* no SDL2: skip */ }
const bin = path.join(root, 'c', 'build', 'vly-player');
const env = { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' };

test('native player: headless dump equals the reference emulator frame', { skip: !built }, () => {
  for (const name of ['template_game', 'template_pong', 'fuzz_video_3']) {
    const cart = path.join(root, 'conformance', 'carts', `${name}.vlc`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-player-'));
    const out = path.join(tmp, 'shot.ppm');
    execFileSync(bin, [cart, '--frames', '45', '--dump', out], { env });
    const ppm = fs.readFileSync(out);
    const header = 'P6\n160 144\n255\n';
    assert.equal(ppm.subarray(0, header.length).toString(), header);
    const m = new Machine(new Uint8Array(fs.readFileSync(cart)));
    m.boot();
    for (let i = 0; i < 45; i++) m.runFrame(0);
    assert.deepEqual(Array.from(ppm.subarray(header.length)), Array.from(m.renderRGB()), name);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('native player: the windowed path starts, runs and quits cleanly with dummy drivers', { skip: !built }, () => {
  const cart = path.join(root, 'conformance', 'carts', 'template_hello.vlc');
  const r = spawnSync(bin, [cart, '--mute'], { env, timeout: 1500 });
  assert.ok(r.error?.code === 'ETIMEDOUT' || r.status === 0, `exit: ${r.status} ${r.error} ${r.stderr}`);
  assert.ok(!/SDL_CreateWindow|SDL_Init|not a valid/.test(String(r.stderr)), String(r.stderr));
});

test('native player: rejects bad cartridges with a clear message', { skip: !built }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-player-'));
  const bad = path.join(tmp, 'bad.vlc');
  fs.writeFileSync(bad, Buffer.alloc(64));
  const r = spawnSync(bin, [bad, '--frames', '1'], { env });
  assert.notEqual(r.status, 0);
  assert.match(String(r.stderr), /not a valid VLY-1 cartridge/);
  fs.rmSync(tmp, { recursive: true, force: true });
});
