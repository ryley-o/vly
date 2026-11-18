// The firmware compiles against the real Pico SDK for both chips and both display boards. Runs only where the
// SDK and the ARM toolchain exist (set PICO_SDK_PATH, install gcc-arm-none-eabi and cmake); skips cleanly elsewhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdk = process.env.PICO_SDK_PATH;
const have = (cmd) => !spawnSync(cmd, ['--version']).error;
const skip = !sdk || !fs.existsSync(path.join(sdk, 'pico_sdk_init.cmake')) || !have('arm-none-eabi-gcc') || !have('cmake')
  ? 'needs PICO_SDK_PATH, arm-none-eabi-gcc and cmake' : false;

for (const [board, display, lcd] of [['pico2', 'parallel', 'ili9488'], ['pico2', 'parallel', 'hx8357d'], ['pico2', 'spi', 'ili9488'], ['pico', 'spi', 'ili9488']]) {
  test(`firmware builds for ${board} with the ${display} display (${lcd}) and fits in RAM`, { skip, timeout: 600_000 }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vly-fw-${board}-${display}-`));
    const cart = path.join(root, 'conformance', 'carts', 'template_pong.vlc');
    const src = path.join(root, 'hardware', 'rp2040');
    execFileSync('cmake', ['-S', src, '-B', dir, `-DPICO_BOARD=${board}`, `-DVLY_DISPLAY=${display}`, `-DVLY_LCD=${lcd}`, `-DVLY_CART=${cart}`], { stdio: 'pipe', env: process.env });
    const out = spawnSync('cmake', ['--build', dir, '-j8'], { encoding: 'utf8', env: process.env });
    assert.equal(out.status, 0, out.stdout.slice(-2000) + out.stderr.slice(-2000));
    assert.doesNotMatch(out.stdout + out.stderr, /warning:/, 'the firmware builds without warnings');
    assert.ok(fs.statSync(path.join(dir, 'vly1.uf2')).size > 10_000);
    const size = execFileSync('arm-none-eabi-size', [path.join(dir, 'vly1.elf')], { encoding: 'utf8' }).trim().split('\n')[1].trim().split(/\s+/).map(Number);
    const ram = size[1] + size[2];
    assert.ok(ram < (board === 'pico2' ? 400_000 : 200_000), `RAM use ${ram} bytes`);
  });
}
