import test from 'node:test';
import assert from 'node:assert/strict';
import { compileToCartridge } from '../src/lang/index.js';
import { Machine } from '../src/core/index.js';
import { clippedText } from '../src/tools/run.js';

const play = (src, frames = 3) => {
  const m = new Machine(compileToCartridge(src, { filename: 't.vly' }).bytes);
  m.boot();
  for (let i = 0; i < frames; i++) m.runFrame(0);
  return m;
};

test('clippedText: a scrolled status line loses its first letter, and it is reported', () => {
  const m = play('func init() { load_font(0); text(0, 0, "2-5 THE ROUND"); text(3, 8, "HELLO"); }\nfunc frame() { poke8(SCX, 8); }\n');
  const c = clippedText(m.mem);
  assert.equal(c.length, 1, JSON.stringify(c));
  assert.match(c[0], /"2-5 THE ROUND" loses "2" at the left/);
  assert.match(c[0], /scroll 8,0/);
});

test('clippedText: text past the right edge, and nothing for text that fits or a one-pixel shake', () => {
  assert.match(clippedText(play('func init() { load_font(0); text(15, 3, "VERY LONG LABEL"); }\nfunc frame() {}\n').mem)[0], /loses "LONG LABEL" at the right/);
  assert.deepEqual(clippedText(play('func init() { load_font(0); text(0, 0, "2-5 THE ROUND"); text(1, 17, "BOTTOM LINE"); }\nfunc frame() {}\n').mem), []);
  assert.deepEqual(clippedText(play('func init() { load_font(0); text(0, 0, "SHAKEN TEXT"); }\nfunc frame() { poke8(SCX, 1); poke8(SCY, 255); }\n').mem), []);
});

test('clippedText: text in a scrolling world that is wholly off screen is not a cut', () => {
  assert.deepEqual(clippedText(play('func init() { load_font(0); text(24, 5, "FAR AWAY"); text(1, 1, "HERE"); }\nfunc frame() {}\n').mem), []);
});

test('vly check says so: the text_clip check warns on a cut line and passes on a clean one', async () => {
  const { checkCartridge } = await import('../src/tools/check.js');
  const rom = (src) => compileToCartridge(src, { filename: 't.vly' }).bytes;
  const bad = checkCartridge(rom('func init() { load_font(0); text(0, 0, "2-5 THE ROUND"); }\nfunc frame() { poke8(SCX, 8); }\n'), { frames: 300 });
  const good = checkCartridge(rom('func init() { load_font(0); text(0, 0, "2-5 THE ROUND"); }\nfunc frame() {}\n'), { frames: 300 });
  const pick = (r) => (r.checks || r).find((c) => c.id === 'text_clip');
  assert.equal(pick(bad).status, 'warn'); assert.match(pick(bad).message, /loses "2"/);
  assert.equal(pick(good).status, 'pass');
});
