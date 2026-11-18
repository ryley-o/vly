import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { exportHtml } from '../src/export/index.js';

const conf = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'conformance', 'carts');

test('exported HTML is self-contained, escapes the title, and embeds the exact cartridge', () => {
  const rom = new Uint8Array(fs.readFileSync(path.join(conf, 'template_hello.vlc')));
  const html = exportHtml(rom, { title: 'A <b>"bold"</b> & game' });
  assert.ok(!/__[A-Z_]+__/.test(html), 'no placeholders left');
  assert.match(html, /<title>A &lt;b&gt;&quot;bold&quot;&lt;\/b&gt; &amp; game<\/title>/);
  assert.ok(!/src="http|href="http|@import|fetch\(/.test(html), 'no external resources');
  const m = /var ROM = "([^"]+)"/.exec(html);
  assert.deepEqual(Array.from(Buffer.from(m[1], 'base64')), Array.from(rom));
  const w = /var WASM = "([^"]+)"/.exec(html);
  assert.equal(Buffer.from(w[1], 'base64').subarray(0, 4).toString('hex'), '0061736d', 'wasm magic');
  // the inline script parses
  const script = /<script>([\s\S]*)<\/script>/.exec(html)[1];
  assert.doesNotThrow(() => new vm.Script(script));
});

test('exported players run the cartridge: the embedded WASM and script drive a stub DOM', async () => {
  const rom = new Uint8Array(fs.readFileSync(path.join(conf, 'template_game.vlc')));
  const html = exportHtml(rom, { title: 'T' });
  const script = /<script>([\s\S]*)<\/script>/.exec(html)[1];
  let frames = 0, drawn = 0;
  const els = {};
  const el = (id) => (els[id] ||= { id, style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, getContext: () => ({ createImageData: () => ({ data: new Uint8ClampedArray(160 * 144 * 4) }), putImageData() { drawn++; } }), dataset: {}, set onclick(f) {} });
  const store = {};
  const sandbox = {
    document: { addEventListener() {}, getElementById: el, querySelectorAll: () => [], documentElement: { style: { setProperty() {} } }, fullscreenElement: null },
    window: {}, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    WebAssembly, Uint8Array, Int16Array, performance: { now: () => 0 }, matchMedia: () => ({ matches: false }), innerWidth: 800, innerHeight: 800,
    addEventListener() {}, requestAnimationFrame: (f) => { if (frames++ < 3) setTimeout(() => f(frames * 17), 0); }, Array, Math, String, console, setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  await new Promise((r) => setTimeout(r, 120));
  assert.ok(drawn >= 1, 'the screen was drawn');
});
