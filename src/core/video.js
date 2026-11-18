// VLY-1 video renderer (SPEC.md section 4). Pure function of the machine's memory.
// Reads only: tile RAM, BG/window maps, OAM, palettes and the LCDC/SCX/SCY/WX/WY registers.

import * as C from './constants.js';

const W = C.SCREEN_W, H = C.SCREEN_H;
const SIZES = [[1, 1], [1, 2], [2, 2], [4, 4]]; // [tilesWide, tilesHigh]

function paletteTable(mem, base) {
  // 8 palettes x 4 colors -> packed 0xRRGGBB values
  const out = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    const v = mem[base + i * 2] | (mem[base + i * 2 + 1] << 8);
    const r = ((v >> 8) & 15) * 17, g = ((v >> 4) & 15) * 17, b = (v & 15) * 17;
    out[i] = (r << 16) | (g << 8) | b;
  }
  return out;
}

/** Render to a packed Uint32Array(160*144) of 0xRRGGBB values. */
function renderPacked(mem) {
  const out = new Uint32Array(W * H);
  const lcdc = mem[C.LCDC];
  const bgOn = lcdc & C.LCDC_BG, winOn = lcdc & C.LCDC_WIN, objOn = lcdc & C.LCDC_OBJ;
  const scx = mem[C.SCX], scy = mem[C.SCY], wx = mem[C.WX], wy = mem[C.WY];
  const bgPal = paletteTable(mem, C.BG_PAL);
  const objPal = paletteTable(mem, C.OBJ_PAL);

  const sprites = [];
  if (objOn) {
    for (let i = 0; i < C.OAM_COUNT; i++) {
      const o = C.OAM + i * 8;
      const sx = ((mem[o] | (mem[o + 1] << 8)) << 16) >> 16;
      const sy = ((mem[o + 2] | (mem[o + 3] << 8)) << 16) >> 16;
      const tile = (mem[o + 4] | (mem[o + 5] << 8)) & 0x1ff;
      const attr = mem[o + 6] | (mem[o + 7] << 8);
      const [tw, th] = SIZES[(attr >> 6) & 3];
      const sw = tw * 8, sh = th * 8;
      if (sx >= W || sy >= H || sx + sw <= 0 || sy + sh <= 0) continue;
      sprites.push({ sx, sy, sw, sh, tw, tile, pal: attr & 7, behind: (attr >> 3) & 1, fx: (attr >> 4) & 1, fy: (attr >> 5) & 1 });
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Step 1: background or window pixel.
      let cellBase = 0, px = 0, py = 0, haveCell = false;
      if (winOn && x >= wx && y >= wy) {
        const ux = x - wx, uy = y - wy;
        cellBase = C.WIN_MAP + 2 * ((uy >> 3) * 32 + (ux >> 3));
        px = ux & 7; py = uy & 7; haveCell = true;
      } else if (bgOn) {
        const bx = (x + scx) & 255, by = (y + scy) & 255;
        cellBase = C.BG_MAP + 2 * ((by >> 3) * 32 + (bx >> 3));
        px = bx & 7; py = by & 7; haveCell = true;
      }
      let bgC = 0, bgColor, bgPrio = 0;
      if (haveCell) {
        const cell = mem[cellBase] | (mem[cellBase + 1] << 8);
        if (cell & 0x400) px = 7 - px;
        if (cell & 0x800) py = 7 - py;
        bgC = (mem[C.TILE_RAM + (cell & 0x1ff) * 16 + py * 2 + (px >> 2)] >> (6 - 2 * (px & 3))) & 3;
        bgColor = bgPal[((cell >> 12) & 7) * 4 + bgC];
        bgPrio = (cell >> 9) & 1;
      } else {
        bgColor = bgPal[0];
      }

      // Step 2: first covering sprite (lowest OAM index) with a non-zero color index.
      let color = bgColor;
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        if (x < s.sx || x >= s.sx + s.sw || y < s.sy || y >= s.sy + s.sh) continue;
        let ox = x - s.sx, oy = y - s.sy;
        if (s.fx) ox = s.sw - 1 - ox;
        if (s.fy) oy = s.sh - 1 - oy;
        const t = (s.tile + (oy >> 3) * s.tw + (ox >> 3)) & 0x1ff;
        const sc = (mem[C.TILE_RAM + t * 16 + (oy & 7) * 2 + ((ox & 7) >> 2)] >> (6 - 2 * ((ox & 7) & 3))) & 3;
        if (sc === 0) continue;
        // Step 3: priority. Decided only for the first opaque sprite.
        if (bgC !== 0 && (s.behind || bgPrio)) color = bgColor;
        else color = objPal[s.pal * 4 + sc];
        break;
      }
      out[y * W + x] = color;
    }
  }
  return out;
}

export function renderRGB(mem) {
  const p = renderPacked(mem);
  const out = new Uint8Array(W * H * 3);
  for (let i = 0; i < p.length; i++) {
    out[i * 3] = p[i] >> 16; out[i * 3 + 1] = (p[i] >> 8) & 255; out[i * 3 + 2] = p[i] & 255;
  }
  return out;
}

export function renderRGBA(mem) {
  const p = renderPacked(mem);
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < p.length; i++) {
    out[i * 4] = p[i] >> 16; out[i * 4 + 1] = (p[i] >> 8) & 255; out[i * 4 + 2] = p[i] & 255; out[i * 4 + 3] = 255;
  }
  return out;
}
