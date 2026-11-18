// The device layer (HAL + portable frame loop) and the RP2040 port. Skips cleanly if there is no C toolchain.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hw = path.join(root, 'hardware');
let haveCC = true;
try { execFileSync('cc', ['--version'], { stdio: 'ignore' }); execFileSync('make', ['--version'], { stdio: 'ignore' }); } catch { haveCC = false; }
const skip = haveCC ? false : 'no C toolchain';

test('device loop: real cartridges through a stub HAL match the reference renderer, audio count and save round trip', { skip }, () => {
  const out = execFileSync('make', ['-C', hw, 'test'], { encoding: 'utf8' });
  for (const cart of ['template_pong', 'template_platformer', 'template_shooter', 'audio']) assert.match(out, new RegExp(`ok  .*${cart}\\.vlc`));
  assert.match(out, /3000 frames, 1102500 samples, 1 saves/);
});

test('RP2040 firmware type-checks against the stand-in Pico SDK headers', { skip }, () => {
  execFileSync('make', ['-C', hw, 'check-rp2040'], { stdio: 'pipe' });
});

test('vlc2c turns a cartridge into a header the device layer accepts', { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-vlc2c-'));
  const cart = path.join(root, 'conformance', 'carts', 'template_pong.vlc');
  const header = execFileSync('node', [path.join(hw, 'tools', 'vlc2c.js'), cart], { encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'cart.h'), header);
  const size = fs.statSync(cart).size;
  assert.match(header, new RegExp(`cart_size = ${size};`));
  fs.writeFileSync(path.join(dir, 'main.c'), `
#include <stdio.h>
#include <string.h>
#include "cart.h"
#include "device.h"
static void vs(void *u) { (void)u; }
static void db(void *u) { (void)u; }
static void dl(void *u, int y, const uint16_t *p) { (void)u; (void)y; (void)p; }
static vly_device_t d;
int main(void) {
  vly_hal_t hal = { 0, vs, 0, db, dl, db, 0, 0, 0 };
  if (vly_device_init(&d, &hal, cart_data, cart_size, 22050) != 0) return 1;
  for (int i = 0; i < 30; i++) vly_device_frame(&d);
  printf("%u\\n", (unsigned)d.frames);
  return 0;
}`);
  execFileSync('cc', ['-std=gnu99', '-I', dir, '-I', hw, '-o', path.join(dir, 'a.out'), path.join(dir, 'main.c'), path.join(hw, 'device.c'), path.join(root, 'c', 'vly.c')], { stdio: 'pipe' });
  assert.equal(execFileSync(path.join(dir, 'a.out'), { encoding: 'utf8' }).trim(), '30');
  assert.throws(() => execFileSync('node', [path.join(hw, 'tools', 'vlc2c.js'), path.join(root, 'package.json')], { stdio: 'pipe' }), /not a VLY-1 cartridge|Command failed/);
});
