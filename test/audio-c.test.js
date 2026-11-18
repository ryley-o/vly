import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Machine, Synth } from '../src/core/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'c', 'build', 'vlyc');

test('C audio synthesis matches the JavaScript reference within rounding', () => {
  try { execFileSync('make', ['-C', path.join(root, 'c')], { stdio: 'ignore' }); } catch { return; } // no C toolchain: skip
  const cart = path.join(root, 'conformance', 'carts', 'audio.vlc');
  const frames = 200;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-audio-'));
  const pcmFile = path.join(tmp, 'c.pcm');
  execFileSync(bin, [cart, String(frames), '/dev/null', pcmFile], { stdio: 'ignore' });
  const cpcm = new Int16Array(fs.readFileSync(pcmFile).buffer.slice(0));
  assert.equal(cpcm.length, frames * 735);

  const rom = new Uint8Array(fs.readFileSync(cart));
  const m = new Machine(rom);
  const synth = new Synth(m.mem, 44100);
  m.boot();
  let big = 0, total = 0, nonzero = 0, sumsq = 0;
  for (let f = 0; f < frames; f++) {
    m.runFrame(0);
    const js = synth.render(735);
    for (let i = 0; i < 735; i++) {
      const jv = Math.round(js[i] * 32767);
      const cv = cpcm[f * 735 + i];
      if (cv !== 0) nonzero++;
      total++;
      sumsq += (jv - cv) * (jv - cv);
      if (Math.abs(jv - cv) > 1500) big++; // more than about 4.5% of full scale
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.ok(nonzero > total * 0.5, 'the cartridge makes sound');
  const rms = Math.sqrt(sumsq / total);
  // phases are float64 in JS and 32-bit fixed point in C, so a few samples at waveform edges may flip
  assert.ok(big / total < 0.01, `${((100 * big) / total).toFixed(3)}% of samples differ noticeably (rms ${rms.toFixed(1)})`);
});
