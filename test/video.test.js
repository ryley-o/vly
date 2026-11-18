import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble } from '../src/asm/index.js';
import { Machine } from '../src/core/index.js';
import * as C from '../src/core/constants.js';
import { encodeTile } from '../src/tools/tiles.js';

function blank() {
  const { bytes } = assemble('.header i, i\ni: RET');
  const m = new Machine(bytes);
  m.boot();
  return m;
}
const solidTile = (m, idx, color) => m.mem.set(encodeTile(new Uint8Array(64).fill(color)), C.TILE_RAM + idx * 16);
const setPal = (m, base, pal, colors) => colors.forEach((c, i) => { m.mem[base + pal * 8 + i * 2] = c & 255; m.mem[base + pal * 8 + i * 2 + 1] = c >> 8; });
const pix = (m, x, y) => { const i = (y * 160 + x) * 4; const f = m.renderRGBA(); return (f[i] << 16) | (f[i + 1] << 8) | f[i + 2]; };
const setCell = (m, base, col, row, v) => { const a = base + 2 * (row * 32 + col); m.mem[a] = v & 255; m.mem[a + 1] = v >> 8; };
const setSprite = (m, i, x, y, tile, attr) => {
  const o = C.OAM + i * 8;
  const w = (a, v) => { m.mem[a] = v & 255; m.mem[a + 1] = (v >> 8) & 255; };
  w(o, x); w(o + 2, y); w(o + 4, tile); w(o + 6, attr);
};

test('power-on screen is blank white', () => {
  const m = blank();
  assert.equal(pix(m, 0, 0), 0xffffff);
  assert.equal(pix(m, 159, 143), 0xffffff);
});

test('background tile with palette and flips', () => {
  const m = blank();
  // tile 1: left half color 3, right half color 1
  const px = new Uint8Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px[y * 8 + x] = x < 4 ? 3 : 1;
  m.mem.set(encodeTile(px), C.TILE_RAM + 16);
  setPal(m, C.BG_PAL, 2, [0x0fff, 0x00f0, 0x0f00, 0x000f]);
  setCell(m, C.BG_MAP, 0, 0, 1 | (2 << 12));
  assert.equal(pix(m, 0, 0), 0x0000ff);   // color 3 -> blue
  assert.equal(pix(m, 7, 0), 0x00ff00);   // color 1 -> green
  setCell(m, C.BG_MAP, 0, 0, 1 | (2 << 12) | 0x400); // flip X
  assert.equal(pix(m, 0, 0), 0x00ff00);
  assert.equal(pix(m, 7, 0), 0x0000ff);
});

test('background scrolls and wraps at 256', () => {
  const m = blank();
  solidTile(m, 1, 3);
  setCell(m, C.BG_MAP, 31, 31, 1); // bottom-right cell of the 256x256 map
  m.mem[C.SCX] = 248; m.mem[C.SCY] = 248;
  assert.equal(pix(m, 0, 0), 0x000000, 'map cell (31,31) appears at the top-left');
  assert.equal(pix(m, 8, 0), 0xffffff, 'wraps to cell (0,31) which is empty');
  m.mem[C.SCX] = 0; m.mem[C.SCY] = 0;
  assert.equal(pix(m, 0, 0), 0xffffff);
});

test('window replaces background and is not scrolled', () => {
  const m = blank();
  solidTile(m, 1, 3);
  setCell(m, C.WIN_MAP, 0, 0, 1);
  m.mem[C.LCDC] = C.LCDC_BG | C.LCDC_WIN;
  m.mem[C.WX] = 16; m.mem[C.WY] = 8;
  m.mem[C.SCX] = 100;
  assert.equal(pix(m, 15, 8), 0xffffff);
  assert.equal(pix(m, 16, 8), 0x000000);
  assert.equal(pix(m, 23, 15), 0x000000);
  assert.equal(pix(m, 24, 8), 0xffffff, 'next window cell is empty');
  assert.equal(pix(m, 16, 7), 0xffffff, 'above the window top');
});

test('sprites: transparency, sizes, flips, palette, ordering', () => {
  const m = blank();
  solidTile(m, 1, 3);
  const px = new Uint8Array(64);
  px[0] = 2; // single opaque pixel at the tile's top-left, rest transparent (0)
  m.mem.set(encodeTile(px), C.TILE_RAM + 2 * 16);
  m.mem[C.LCDC] = C.LCDC_BG | C.LCDC_OBJ;
  setPal(m, C.OBJ_PAL, 1, [0, 0x0f00, 0x00f0, 0x000f]);
  // sprite 0: tile 2, palette 1 -> a green dot at (10,10); rest is transparent showing white background
  setSprite(m, 0, 10, 10, 2, 1);
  assert.equal(pix(m, 10, 10), 0x00ff00);
  assert.equal(pix(m, 11, 10), 0xffffff);
  // flip X moves the dot to the right edge, flip Y to the bottom
  setSprite(m, 0, 10, 10, 2, 1 | 0x10 | 0x20);
  assert.equal(pix(m, 17, 17), 0x00ff00);
  assert.equal(pix(m, 10, 10), 0xffffff);
  // lower index wins over higher index
  setSprite(m, 0, 40, 40, 1, 0);          // solid black (palette 0 color 3 = black)
  setSprite(m, 1, 40, 40, 2, 1);          // green dot behind it in index order
  assert.equal(pix(m, 40, 40), 0x000000);
  // 16x16 sprite uses tiles row-major: tile, tile+1, tile+2, tile+3
  solidTile(m, 10, 1); solidTile(m, 11, 2); solidTile(m, 12, 3); solidTile(m, 13, 0);
  setPal(m, C.OBJ_PAL, 0, [0, 0x0f00, 0x00f0, 0x000f]);
  m.mem.fill(0, C.OAM, C.OAM + 8 * 64);
  setSprite(m, 0, 80, 80, 10, 2 << 6);
  assert.equal(pix(m, 80, 80), 0xff0000, 'top-left is tile 10 (color 1)');
  assert.equal(pix(m, 88, 80), 0x00ff00, 'top-right is tile 11 (color 2)');
  assert.equal(pix(m, 80, 88), 0x0000ff, 'bottom-left is tile 12 (color 3)');
  assert.equal(pix(m, 88, 88), 0xffffff, 'bottom-right is tile 13 (transparent)');
  // reserved high bits of a palette entry are ignored
  setPal(m, C.OBJ_PAL, 7, [0, 0xf0f0, 0, 0]);
  setSprite(m, 0, 80, 80, 10, 2 << 6 | 7);
  assert.equal(pix(m, 80, 80), 0x00ff00);
  // sprites off-screen do not crash and negative coordinates clip
  m.mem.fill(0, C.OAM, C.OAM + 8 * 64);
  setSprite(m, 2, -4, -4, 1, 4);
  setSprite(m, 3, 500, 500, 1, 4);
  assert.equal(pix(m, 3, 3), 0x000000);
  assert.equal(pix(m, 4, 4), 0xffffff);
});

test('sprite priority: behind-background bit and BG priority bit', () => {
  const m = blank();
  solidTile(m, 1, 3);  // opaque BG pixels (color 3)
  solidTile(m, 2, 3);  // sprite tile
  m.mem[C.LCDC] = C.LCDC_BG | C.LCDC_OBJ;
  setPal(m, C.OBJ_PAL, 0, [0, 0x0f00, 0x0f00, 0x0f00]);
  setCell(m, C.BG_MAP, 0, 0, 1);
  setSprite(m, 0, 0, 0, 2, 0);
  assert.equal(pix(m, 0, 0), 0xff0000, 'sprite in front');
  setSprite(m, 0, 0, 0, 2, 8);
  assert.equal(pix(m, 0, 0), 0x000000, 'behind-background: BG color 3 wins');
  setSprite(m, 0, 8, 0, 2, 8);
  assert.equal(pix(m, 8, 0), 0xff0000, 'behind-background but BG color is 0: sprite shows');
  setCell(m, C.BG_MAP, 1, 0, 0x200); // priority bit, tile 0 (color 0)
  setSprite(m, 0, 8, 0, 2, 0);
  assert.equal(pix(m, 8, 0), 0xff0000, 'BG priority only matters for non-zero BG pixels');
  setCell(m, C.BG_MAP, 0, 0, 1 | 0x200);
  setSprite(m, 0, 0, 0, 2, 0);
  assert.equal(pix(m, 0, 0), 0x000000, 'BG priority bit forces BG over the sprite');
});

test('layers can be disabled', () => {
  const m = blank();
  solidTile(m, 1, 3);
  setCell(m, C.BG_MAP, 0, 0, 1);
  assert.equal(pix(m, 0, 0), 0x000000);
  m.mem[C.LCDC] = 0;
  assert.equal(pix(m, 0, 0), 0xffffff, 'background off shows BG palette 0 color 0');
});
