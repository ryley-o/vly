// Contact sheets: several frames in one PNG-ready image, each labelled with its frame number, so an agent can read a
// whole sequence at a glance. Uses the console's own font for the labels.

import { GLYPHS } from '../core/font.js';
import { SCREEN_W, SCREEN_H } from '../core/constants.js';

/**
 * @param {Array<{label: string, rgba: Uint8Array}>} frames 160x144 RGBA images
 * @returns {{width: number, height: number, rgba: Uint8Array}}
 */
export function filmstrip(frames, { cols = 4, scale = 2, gap = 4 } = {}) {
  cols = Math.min(cols, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const labelH = 9;
  const cellW = SCREEN_W * scale, cellH = SCREEN_H * scale + labelH * scale;
  const W = cols * cellW + (cols + 1) * gap, H = rows * cellH + (rows + 1) * gap;
  const out = new Uint8Array(W * H * 4);
  const BG = [34, 40, 30];
  for (let i = 0; i < W * H; i++) { out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255; }
  const put = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; out[i] = r; out[i + 1] = g; out[i + 2] = b; };
  frames.forEach((f, n) => {
    const cx = gap + (n % cols) * (cellW + gap), cy = gap + Math.floor(n / cols) * (cellH + gap);
    // label
    let tx = cx + 2 * scale;
    for (const ch of f.label) {
      const g = GLYPHS[ch];
      if (g) g.split('/').forEach((row, ry) => { for (let rx = 0; rx < 5; rx++) if (row[rx] === '1') for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) put(tx + rx * scale + sx, cy + (1 + ry) * scale + sy - scale, 200, 230, 170); });
      tx += 6 * scale;
    }
    // frame
    for (let y = 0; y < SCREEN_H * scale; y++) {
      const sy = Math.floor(y / scale);
      for (let x = 0; x < SCREEN_W * scale; x++) {
        const sx = Math.floor(x / scale);
        const si = (sy * SCREEN_W + sx) * 4;
        put(cx + x, cy + labelH * scale + y, f.rgba[si], f.rgba[si + 1], f.rgba[si + 2]);
      }
    }
  });
  return { width: W, height: H, rgba: out };
}

/** Evenly spaced frame numbers 1..frames (n of them), always ending on the last frame. */
export function evenFrames(frames, n) {
  if (n <= 1) return [frames];
  const out = [];
  for (let k = 0; k < n; k++) out.push(Math.max(1, Math.round((frames * (k + 1)) / n)));
  return [...new Set(out)];
}
