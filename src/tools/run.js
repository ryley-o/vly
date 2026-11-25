// Headless cartridge runner shared by the CLI, the MCP server, and tests.

import { Machine } from '../core/machine.js';
import { toHex } from '../core/sha256.js';
import * as C from '../core/constants.js';
import { parseInputSpec } from './input.js';
import { decode } from '../asm/disasm.js';
import { Synth } from '../core/audio.js';
import { AUDIO } from '../core/constants.js';
import { FONT } from '../core/font.js';

/**
 * Run a cartridge for N frames.
 * @param {Uint8Array} rom
 * @param {object} [o]
 * @param {number} [o.frames=60]
 * @param {string|((frame:number)=>number)} [o.input] input spec string or function
 * @param {Uint8Array|null} [o.save]
 * @param {number[]} [o.screenshotFrames] frames after which to capture an RGBA screenshot (1-based count of completed frames; 0 = after init)
 * @param {Array<{addr:number,len:number}>} [o.mem] memory ranges to report at the end
 * @param {Array<{name: string, addr: number, bytes?: number}>} [o.watch] variables to record changes of
 * @param {{frame: number|'init', limit?: number}} [o.trace] record the instructions executed in one frame (or init)
 * @param {{every?: number, max?: number, scaleless?: boolean}} [o.capture] collect RGBA frames every N frames (for GIFs)
 * @param {{addr: number, value: number, bytes?: number}[]} [o.pokes] variables to set after init, before the first frame
 * @param {boolean} [o.audio] also render the audio (mono floats at 44.1 kHz)
 * @param {{addr: number, bytes: number, test: (v: number) => boolean}} [o.until] stop early, after the first frame where this holds
 */
export function runCartridge(rom, o = {}) {
  const frames = o.frames ?? 60;
  const inputFn = typeof o.input === 'function' ? o.input : parseInputSpec(o.input || '');
  const saves = [];
  const m = new Machine(rom, { save: o.save || null, onSave: (b) => saves.push({ frame: m.frame, bytes: b }) });
  const shots = new Map();
  const want = new Set(o.screenshotFrames || []);
  const wantText = new Set(o.textFrames || []);
  const textShots = new Map();
  const watch = (o.watch || []).map((w) => ({ ...w, last: undefined }));
  const changes = [];
  const readWatch = (w) => (w.bytes === 1 ? m.read8(w.addr) : m.read16(w.addr));
  const sample = (frame) => {
    for (const w of watch) {
      const v = readWatch(w);
      if (v !== w.last) { if (changes.length < (o.watchLimit ?? 500)) changes.push({ frame, name: w.name, from: w.last, to: v }); w.last = v; }
    }
  };
  const traceLines = [];
  const traceLimit = o.trace?.limit ?? 200;
  const traceOn = (frame) => {
    m.tracer = (pc, op, rd, rs, imm, r) => {
      if (traceLines.length >= traceLimit) { m.tracer = null; return; }
      const bytes = Uint8Array.from([0, 1, 2, 3], (_, i) => m.read8(pc + i));
      const d = decode(bytes, 0);
      traceLines.push({ pc, text: d.text, len: d.len, regs: Array.from(r) });
    };
  };
  const frames_out = [];
  const capEvery = o.capture?.every ?? 0;
  const synth = o.audio ? new Synth(m.mem, 44100) : null;
  const audioChunks = [];
  // notes: per channel, runs of frames with the channel on, audible and at (about) one pitch; a new pitch starts a new note
  const notes = [], openNote = [null, null, null, null];
  const trackNotes = (f) => {
    for (let c = 0; c < 4; c++) {
      const a = AUDIO + c * 4, hz = m.mem[a] | (m.mem[a + 1] << 8), vol = m.mem[a + 2] & 15, on = (m.mem[a + 3] & 0x80) !== 0 && vol > 0 && (hz > 0 || c === 3);
      const cur = openNote[c];
      if (on && cur && Math.abs(hz - cur.hz) <= Math.max(2, cur.hz * 0.02)) { cur.frames++; cur.maxVol = Math.max(cur.maxVol, vol); }
      else { openNote[c] = null; if (on) { const n = { ch: c, frame: f, hz, frames: 1, maxVol: vol }; notes.push(n); openNote[c] = n; } }
    }
  };
  if (o.trace && o.trace.frame === 'init') traceOn('init');
  m.boot();
  m.tracer = null;
  for (const p of o.pokes || []) { if (p.bytes === 1) m.mem[p.addr] = p.value & 0xff; else { m.mem[p.addr] = p.value & 0xff; m.mem[p.addr + 1] = (p.value >> 8) & 0xff; } }   // start from a chosen state: set variables after init
  sample(-1);
  if (capEvery) frames_out.push(m.renderRGBA());
  if (want.has(0)) shots.set(0, m.renderRGBA());
  if (wantText.has(0)) textShots.set(0, screenText(m.mem, { sprites: true }));

  let maxCycles = 0, totalCycles = 0, overruns = 0, stoppedAt = null;
  const frameCycles = [];
  const faults = { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 };
  const firstFault = {};
  for (let f = 0; f < frames; f++) {
    if (o.trace && o.trace.frame === f) traceOn(f);
    const r = m.runFrame(inputFn(f));
    m.tracer = null;
    sample(f);
    if (capEvery && (f + 1) % capEvery === 0 && frames_out.length < (o.capture.max ?? 600)) frames_out.push(m.renderRGBA());
    if (synth) { audioChunks.push(synth.render(735)); trackNotes(f); }
    maxCycles = Math.max(maxCycles, r.cycles);
    frameCycles.push(r.cycles);
    totalCycles += r.cycles;
    if (r.overrun) overruns++;
    const st = m.status;
    for (const [name, bit] of [['DIV0', C.ST_DIV0], ['RO_WRITE', C.ST_RO_WRITE], ['ILLEGAL', C.ST_ILLEGAL], ['OVERRUN', C.ST_OVERRUN]]) {
      if (st & bit) { faults[name]++; if (!(name in firstFault)) firstFault[name] = f; }
    }
    if (want.has(f + 1)) shots.set(f + 1, m.renderRGBA());
    if (wantText.has(f + 1)) textShots.set(f + 1, screenText(m.mem, { sprites: true }));
    if (o.onFrame) o.onFrame(f + 1, m);
    if (o.until) {
      const v = o.until.bytes === 1 ? m.read8(o.until.addr) : (m.read16(o.until.addr) << 16) >> 16;
      if (o.until.test(v)) { stoppedAt = f + 1; break; }
    }
  }

  if (stoppedAt !== null) shots.set(stoppedAt, m.renderRGBA());           // always keep a picture of the moment the condition held
  const memDump = (o.mem || []).map(({ addr, len }) => {
    const bytes = [];
    for (let i = 0; i < len; i++) bytes.push(m.read8(addr + i));
    return { addr, len, bytes };
  });

  return {
    machine: m,
    frames: stoppedAt ?? frames,
    stoppedAt,
    init: { cycles: m.initCycles, budget: C.INIT_CYCLES, overran: m.initOverran },
    worstFrames: frameCycles.map((c, f) => ({ frame: f, cycles: c })).sort((a, b) => b.cycles - a.cycles).slice(0, o.worst ?? 5),
    cycles: { max: maxCycles, avg: frames ? Math.round(totalCycles / frames) : 0, budget: C.CYCLES_PER_FRAME },
    overruns,
    faults,
    firstFault,
    frameHash: toHex(m.frameHash()),
    stateHash: toHex(m.stateHash()),
    status: m.status,
    saves,
    screenshots: shots,
    textShots,
    mem: memDump,
    changes,
    trace: traceLines,
    capturedFrames: frames_out,
    notes: synth ? notes : null,
    audio: synth ? (() => { const out = new Float32Array(audioChunks.length * 735); audioChunks.forEach((c, i) => out.set(c, i * 735)); return out; })() : null,
  };
}

/**
 * The screen as a 20 x 18 grid of cells, one character each, for assistants that cannot look at pictures:
 * a letter or digit where a cell holds a font glyph (so text() shows up as readable text), '#' for any other tile with
 * something in it, '@' where a sprite sits, '.' for an empty cell. Reads the layers the way the renderer does.
 */
/**
 * Every line of font glyphs in the background and window maps (cells with at most two blank cells between them), with where each cell is on
 * the screen: state 'in' (wholly on screen; up to 2 px over the edge counts as a screen shake), 'part' or 'out', and its pixel position.
 */
function scanTextLines(mem) {
  const lcdc = mem[C.LCDC];
  const bgOn = lcdc & C.LCDC_BG, winOn = lcdc & C.LCDC_WIN;
  const scx = mem[C.SCX], scy = mem[C.SCY], wx = mem[C.WX], wy = mem[C.WY];
  const glyphs = new Map();
  for (let g = 1; g < C.FONT_TILES; g++) glyphs.set(Array.from(FONT.subarray(g * 16, g * 16 + 16)).join(','), String.fromCharCode(32 + g));
  const charOf = (cell) => {
    const t = cell & 0x1ff;
    return glyphs.get(Array.from(mem.subarray(C.TILE_RAM + t * 16, C.TILE_RAM + t * 16 + 16)).join(',')) ?? null;   // null: not a glyph
  };
  const vis = (p0, lim) => (p0 >= -2 && p0 + 8 <= lim + 2 ? 'in' : p0 + 8 <= 0 || p0 >= lim ? 'out' : 'part');
  const lines = [];
  const scan = (mapBase, place) => {
    for (let r = 0; r < 32; r++) {
      const cells = [];
      for (let c = 0; c < 32; c++) { const a = mapBase + 2 * (r * 32 + c); cells.push(charOf(mem[a] | (mem[a + 1] << 8))); }
      let c = 0;
      while (c < 32) {
        if (cells[c] === null) { c++; continue; }
        let last = c, k = c + 1;
        while (k < 32) {
          if (cells[k] !== null) { last = k; k++; continue; }
          let j = k; while (j < 32 && cells[j] === null) j++;
          if (j < 32 && j - k <= 2) k = j; else break;                      // a gap of at most two blank cells stays in the line
        }
        const at = [];
        for (let q = c; q <= last; q++) at.push(place(q, r));
        lines.push({ text: Array.from({ length: last - c + 1 }, (_, q) => cells[c + q] ?? ' ').join(''), cells: at });
        c = last + 1;
      }
    }
  };
  const mk = (x0, y0) => {
    const sx = vis(x0, 160), sy = vis(y0, 144);
    return { x0, y0, state: sx === 'out' || sy === 'out' ? 'out' : sx === 'in' && sy === 'in' ? 'in' : 'part' };
  };
  if (bgOn) {
    scan(C.BG_MAP, (c, r) => {
      const px = ((c * 8 - scx) % 256 + 256) % 256, py = ((r * 8 - scy) % 256 + 256) % 256;
      const x0 = px > 248 ? px - 256 : px, y0 = py > 248 ? py - 256 : py;
      if (winOn && x0 + 4 >= wx && y0 + 4 >= wy) return { x0, y0, state: 'out' };   // under the window: not what the player sees
      return mk(x0, y0);
    });
  }
  if (winOn) scan(C.WIN_MAP, (c, r) => mk(wx + c * 8, wy + r * 8));
  return { lines, scroll: scx || scy ? ` (scroll ${scx},${scy})` : '' };
}

/**
 * Text that the screen edge cuts: a line some of whose cells are on the screen and some not (a status line pushed left by a scrolled
 * background is the classic). Text wholly off screen (part of a scrolling world) is not reported. Returns strings such as
 * `"2-5 THE ROUND" loses "2" at the left or top edge (scroll 8,0)`.
 */
export function clippedText(mem) {
  const { lines, scroll } = scanTextLines(mem);
  const out = [];
  for (const { text, cells } of lines) {
    const state = cells.map((c) => c.state);
    const some = state.some((x) => x !== 'out'), cut = state.some((x) => x !== 'in');
    if (!(some && cut && text.trim())) continue;
    const first = state.findIndex((x) => x === 'in'), lastIn = state.length - 1 - [...state].reverse().findIndex((x) => x === 'in');
    const lostL = first > 0 ? text.slice(0, first).trim() : '', lostR = lastIn >= 0 ? text.slice(lastIn + 1).trim() : '';
    const parts = [];
    if (state[0] !== 'in') parts.push(lostL ? `loses "${lostL}" at the left or top edge` : 'is cut by the left or top edge');
    if (state[state.length - 1] !== 'in') parts.push(lostR ? `loses "${lostR}" at the right or bottom edge` : 'is cut by the right or bottom edge');
    if (!parts.length) parts.push('is partly off the screen');
    out.push(`"${text.trim()}" ${parts.join(' and ')}`);
  }
  return [...new Set(out)].map((x) => x + scroll);
}

/**
 * Text with no margin: a line of visible glyph cells in the outermost cell column or row of the screen (the first and last of 20 columns, the
 * first and last of 18 rows), so its letters touch the screen edge. Not a cut, only cramped. Returns strings such as `"LV 3" touches the top edge`.
 */
export function edgeText(mem) {
  const { lines } = scanTextLines(mem);
  const out = [];
  for (const { text, cells } of lines) {
    if (!text.trim()) continue;
    const vis = cells.filter((c) => c.state === 'in' && c.x0 > -3);
    if (!vis.length) continue;
    const sides = [];
    if (vis.some((c) => c.y0 <= 2)) sides.push('top');
    if (vis.some((c) => c.y0 + 8 >= 142)) sides.push('bottom');
    if (vis.some((c) => c.x0 <= 2)) sides.push('left');
    if (vis.some((c) => c.x0 + 8 >= 158)) sides.push('right');
    if (sides.length) out.push(`"${text.trim()}" touches the ${sides.join(' and ')} edge`);
  }
  return [...new Set(out)];
}

export function screenText(mem, { sprites: listSprites = false } = {}) {
  const lcdc = mem[C.LCDC];
  const bgOn = lcdc & C.LCDC_BG, winOn = lcdc & C.LCDC_WIN, objOn = lcdc & C.LCDC_OBJ;
  const scx = mem[C.SCX], scy = mem[C.SCY], wx = mem[C.WX], wy = mem[C.WY];
  const glyphs = new Map();                       // 16 bytes of tile data -> character
  for (let g = C.FONT_TILES - 1; g >= 0; g--) glyphs.set(Array.from(FONT.subarray(g * 16, g * 16 + 16)).join(','), String.fromCharCode(32 + g));
  const tileChar = (t) => {
    const bytes = Array.from(mem.subarray(C.TILE_RAM + t * 16, C.TILE_RAM + t * 16 + 16));
    if (bytes.every((b) => b === 0)) return '.';
    return glyphs.get(bytes.join(',')) ?? '#';
  };
  const rows = [];
  const pals = [];
  for (let r = 0; r < 18; r++) {
    let line = '', pline = '';
    for (let c = 0; c < 20; c++) {
      const x = c * 8 + 4, y = r * 8 + 4;
      let ch = '.';
      if (winOn && x >= wx && y >= wy) {
        const ux = x - wx, uy = y - wy, a = C.WIN_MAP + 2 * ((uy >> 3) * 32 + (ux >> 3));
        ch = tileChar((mem[a] | (mem[a + 1] << 8)) & 0x1ff);
        pline += ch === '.' ? '.' : String(((mem[a] | (mem[a + 1] << 8)) >> 12) & 7);
      } else if (bgOn) {
        const bx = (x + scx) & 255, by = (y + scy) & 255, a = C.BG_MAP + 2 * ((by >> 3) * 32 + (bx >> 3));
        ch = tileChar((mem[a] | (mem[a + 1] << 8)) & 0x1ff);
        pline += ch === '.' ? '.' : String(((mem[a] | (mem[a + 1] << 8)) >> 12) & 7);
      } else pline += '.';
      line += ch === ' ' ? '.' : ch;
      }
    rows.push(line.split(''));
    pals.push(pline.padEnd(20, '.').split(''));
  }
  const spriteList = [];
  const notes = [];
  if (objOn) {
    const SIZES = [[1, 1], [1, 2], [2, 2], [4, 4]];
    for (let i = 0; i < C.OAM_COUNT; i++) {
      const o = C.OAM + i * 8;
      const sx = ((mem[o] | (mem[o + 1] << 8)) << 16) >> 16, sy = ((mem[o + 2] | (mem[o + 3] << 8)) << 16) >> 16;
      const tile = (mem[o + 4] | (mem[o + 5] << 8)) & 0x1ff;
      const [tw, th] = SIZES[((mem[o + 6] | (mem[o + 7] << 8)) >> 6) & 3];
      const spritePal = (mem[o + 6] | (mem[o + 7] << 8)) & 7;
      const behindFlag = (((mem[o + 6] | (mem[o + 7] << 8)) >> 3) & 1) === 1;          // drawn behind the text, so it does not cover it
      if (sx >= 160 || sy >= 144 || sx + tw * 8 <= 0 || sy + th * 8 <= 0) continue;
      let any = false;
      for (let t = 0; t < tw * th && !any; t++) for (let k = 0; k < 16; k++) if (mem[C.TILE_RAM + ((tile + t) & 0x1ff) * 16 + k]) { any = true; break; }
      if (!any) continue;
      spriteList.push({ index: i, x: sx, y: sy, tile, w: tw * 8, h: th * 8, palette: (mem[o + 6] | (mem[o + 7] << 8)) & 7 });
      for (let cy = Math.max(0, sy >> 3); cy <= Math.min(17, (sy + th * 8 - 1) >> 3); cy++)
        for (let cx = Math.max(0, sx >> 3); cx <= Math.min(19, (sx + tw * 8 - 1) >> 3); cx++) {
          if (!behindFlag && /[A-Za-z0-9]/.test(rows[cy][cx]) && notes.length < 10) notes.push(`sprite ${i} covers '${rows[cy][cx]}' at row ${cy}, column ${cx}`);
          rows[cy][cx] = '@'; pals[cy][cx] = String(spritePal);
        }
    }
  }
  const text = rows.map((r) => r.join('')).join('\n');
  return listSprites ? { text, palettes: pals.map((r) => r.join('')), sprites: spriteList, notes } : text;
}

/** Low-resolution ASCII rendering of an RGBA screen, for terminals and agents that cannot view images. */
export function asciiScreen(rgba, cols = 80) {
  const W = C.SCREEN_W, H = C.SCREEN_H;
  const cw = W / cols, ch = cw * 2; // characters are about twice as tall as wide
  const ramp = ' .:-=+*#%@';
  const lines = [];
  for (let y0 = 0; y0 < H; y0 += ch) {
    let line = '';
    for (let x0 = 0; x0 < W; x0 += cw) {
      let sum = 0, n = 0;
      for (let y = Math.floor(y0); y < Math.min(H, Math.floor(y0 + ch)); y++) {
        for (let x = Math.floor(x0); x < Math.min(W, Math.floor(x0 + cw)); x++) {
          const i = (y * W + x) * 4;
          sum += 255 - (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
          n++;
        }
      }
      const dark = n ? sum / n / 255 : 0;
      line += ramp[Math.min(ramp.length - 1, Math.floor(dark * ramp.length))];
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return lines.join('\n');
}
