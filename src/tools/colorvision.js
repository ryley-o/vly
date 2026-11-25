// Seeing like another player: contrast ratios, colour-vision simulations and a "did the highlight change enough to see?" report.
//
// The numbers: WCAG 2.x relative luminance and contrast ratio. W3C asks for at least 3:1 between a control's selected or focused state and what
// it is compared with (non-text contrast), and 4.5:1 for small text. The colour-vision matrices are Machado, Oliveira and Fernandes (2009)
// at full severity, applied to linear RGB. They show how a picture looks to a player with no red cones (protan), no green cones (deutan) or no
// blue cones (tritan). "gray" is plain luminance, which is also how the four-shade handheld look reads.
import { runCartridge } from './run.js';

const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const unlin = (v) => { const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); };

export const CVD_MATRICES = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export const VISIONS = ['normal', 'protan', 'deutan', 'tritan', 'gray'];

/** Relative luminance of an sRGB colour [r, g, b] (0-255). */
export function luminance([r, g, b]) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
/** WCAG contrast ratio between two luminances (1 to 21). */
export function contrastOfLuminance(a, b) { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); }
export function contrast(c1, c2) { return contrastOfLuminance(luminance(c1), luminance(c2)); }
export function parseColor(s) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(s).trim()) || /^#?([0-9a-f]{3})$/i.exec(String(s).trim());
  if (!m) throw new Error(`"${s}" is not a colour (use #rrggbb)`);
  let h = m[1]; if (h.length === 3) h = [...h].map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** How an sRGB colour looks under a vision: returns [r, g, b]. */
export function simulateColor(rgb, vision) {
  if (vision === 'normal') return rgb;
  const l = rgb.map(lin);
  if (vision === 'gray') { const y = unlin(0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]); return [y, y, y]; }
  const M = CVD_MATRICES[vision];
  return M.map((row) => unlin(row[0] * l[0] + row[1] * l[1] + row[2] * l[2]));
}
/** A whole RGBA image as seen under a vision (a new array). */
export function simulateImage(rgba, vision) {
  if (vision === 'normal') return rgba;
  const out = new Uint8Array(rgba.length);
  const cache = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const k = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    let c = cache.get(k);
    if (!c) { c = simulateColor([rgba[i], rgba[i + 1], rgba[i + 2]], vision); cache.set(k, c); }
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = rgba[i + 3];
  }
  return out;
}

/**
 * Does moving the selection change enough of the picture, by enough? Run the cartridge with `input`, take a picture at the end (selection at A), press
 * `dir` for a frame, let it settle, take another (selection at B). The pixels that differ are the highlight leaving A and arriving at B. For those pixels
 * (this is the "focused versus unfocused state of the same pixels" idea of WCAG 2.2) report how many there are and, per vision, how many differ by at least
 * 3:1 in contrast and by at least 1.5:1 (a weak but perhaps visible change).
 */
export function highlightReport(rom, { input = '', frames = null, dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'], settle = 20, save = null } = {}) {
  const lastFrame = frames ?? (Math.max(0, ...[...String(input).matchAll(/@(\d+)(?:-(\d+))?/g)].map((m) => Number(m[2] ?? m[1]))) + 30);
  const results = [];
  for (const dir of dirs) {
    const press = `${dir}@${lastFrame}`;
    const base = String(input);
    const end = lastFrame + 1 + settle;
    const r = runCartridge(rom, { frames: end, input: [base, press].filter(Boolean).join('\n'), save, screenshotFrames: [lastFrame, end] });
    const a = r.screenshots.get(lastFrame), b = r.screenshots.get(end);
    if (!a || !b) continue;
    const changed = [];
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed.push(i);
    const per = {};
    for (const v of VISIONS) {
      let strong = 0, weak = 0;
      for (const i of changed) {
        const ca = simulateColor([a[i], a[i + 1], a[i + 2]], v), cb = simulateColor([b[i], b[i + 1], b[i + 2]], v);
        const ratio = contrast(ca, cb);
        if (ratio >= 3) strong++; if (ratio >= 1.5) weak++;
      }
      per[v] = { strong, weak, strongShare: changed.length ? strong / changed.length : 0 };
    }
    results.push({ dir, changedPixels: changed.length, vision: per });
  }
  return { lastFrame, results };
}

/** A short verdict. Thresholds are our estimates: at least 3:1 on half of the changed pixels under every vision passes; fewer than 24 changed pixels is only noted as small. */
export function highlightVerdict(report, { minPixels = 24, minShare = 0.5 } = {}) {
  const moving = report.results.filter((x) => x.changedPixels > 0);
  if (!moving.length) return { ok: false, text: 'no direction changed the screen: either nothing is selectable here, the screen was not reached, or the selection is invisible' };
  const lines = [];
  let ok = true;
  for (const x of moving) {
    const bad = VISIONS.filter((v) => x.vision[v].strongShare < minShare);
    const few = x.changedPixels < minPixels;
    if (bad.length) ok = false;
    lines.push(`${x.dir}: ${x.changedPixels} pixels change${few ? ' (small: a single arrow or a thin outline is easy to miss; also change the selected item itself)' : ''}; at 3:1 or more: ${VISIONS.map((v) => `${v} ${(x.vision[v].strongShare * 100).toFixed(0)}%`).join(', ')}${bad.length ? `  <- weak under ${bad.join(', ')}` : ''}`);
  }
  return { ok, text: lines.join('\n') };
}
