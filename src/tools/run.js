// Headless cartridge runner shared by the CLI, the MCP server, and tests.

import { Machine } from '../core/machine.js';
import { toHex } from '../core/sha256.js';
import * as C from '../core/constants.js';
import { parseInputSpec } from './input.js';
import { decode } from '../asm/disasm.js';
import { Synth } from '../core/audio.js';
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
    if (synth) audioChunks.push(synth.render(735));
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
    audio: synth ? (() => { const out = new Float32Array(audioChunks.length * 735); audioChunks.forEach((c, i) => out.set(c, i * 735)); return out; })() : null,
  };
}

/**
 * The screen as a 20 x 18 grid of cells, one character each, for assistants that cannot look at pictures:
 * a letter or digit where a cell holds a font glyph (so text() shows up as readable text), '#' for any other tile with
 * something in it, '@' where a sprite sits, '.' for an empty cell. Reads the layers the way the renderer does.
 */
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
