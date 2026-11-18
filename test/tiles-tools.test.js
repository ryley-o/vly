import test from 'node:test';
import assert from 'node:assert/strict';

test('rotate: pre-rotated copies of a sprite, named by angle, same size, pixels preserved at 0 degrees and turned at 90', async () => {
  const { parseTilesText } = await import('../src/tools/tiles.js');
  const art = 'sprite arrow 1x1:\n  ...33...\n  ..3333..\n  .333333.\n  ...33...\n  ...33...\n  ...33...\n  ...33...\n  ........\nrotate arrow 0,90,-90 as turn\n';
  const t = parseTilesText(art, 'a.tiles');
  assert.deepEqual(t.names.map((n) => `${n.name}:${n.index}:${n.w}x${n.h}`), ['arrow:0:1x1', 'turn_p0:1:1x1', 'turn_p90:2:1x1', 'turn_m90:3:1x1']);
  const tile = (i) => Array.from(t.data.subarray(i * 16, i * 16 + 16)).join(',');
  assert.equal(tile(1), tile(0), 'zero degrees is a copy');
  assert.notEqual(tile(2), tile(0), 'ninety degrees is different');
  assert.notEqual(tile(2), tile(3), 'and the other way is different again');
  assert.throws(() => parseTilesText('rotate nothing 10 as x\n', 'a.tiles'), /not defined above/);
});

test('pngToTilesText: reduces many colours to the palette the hardware allows, keeps transparency, and slices cells', async () => {
  const { pngToTilesText, parseTilesText } = await import('../src/tools/tiles.js');
  const w = 16, h = 8, px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (y < 1) px.set([0, 0, 0, 0], i);                       // transparent first row
    else px.set([x * 16, x * 16, 255 - y * 8, 255], i);        // many different colours
  }
  const r = pngToTilesText(w, h, px, { name: 'gem', cell: [8, 8] });
  assert.equal(r.sprites, 2);
  const parsed = parseTilesText(r.text, 'gem.tiles');              // the output is valid .tiles
  assert.deepEqual(parsed.names.map((n) => n.name), ['gem_0', 'gem_1']);
  assert.match(r.text, /sprite gem_0 1x1:\n  \.{8}\n/, 'the transparent row is colour 0');
  assert.equal(r.palette.length, 3, 'three colours for a sprite');
  assert.ok(r.colours > 3);
  assert.throws(() => pngToTilesText(48, 48, new Uint8Array(48 * 48 * 4).fill(255), { name: 'big' }), /at most 4x4 tiles/);
});
