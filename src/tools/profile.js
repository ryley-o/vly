// A cycle profiler: where does a frame's time go? Counts the cycles of every instruction against the function it is in.
import { Machine } from '../core/machine.js';
import { OP_BY_CODE } from '../core/isa.js';
import * as C from '../core/constants.js';
import { parseInputSpec } from './input.js';

/** Address ranges of every function, from the assembler's symbols (offsets are positions in the cartridge image). */
export function functionRanges(symbols) {
  const starts = [];
  for (const [k, s] of Object.entries(symbols)) {
    if (s.kind !== 'label') continue;
    if (k.startsWith('f_') && !k.endsWith('__ret')) starts.push({ name: k.slice(2), start: s.offset });
    else if (k.startsWith('fb_') && symbols['fbe_' + k.slice(3)]) starts.push({ name: k.slice(3), start: s.offset, end: symbols['fbe_' + k.slice(3)].offset });
  }
  starts.sort((a, b) => a.start - b.start);
  const codeEnd = symbols.__code_end ? symbols.__code_end.offset : Infinity;
  return starts.map((f, i) => ({ name: f.name, start: f.start, end: f.end ?? Math.min(i + 1 < starts.length ? starts[i + 1].start : codeEnd, codeEnd) }));
}

/**
 * Run `frames` frames and report the cycles used by each function (frame routine only; init is separate).
 * @returns {{frames: number, avg_cycles_per_frame: number, functions: Array<{name: string, cycles_per_frame: number, percent: number}>}}
 */
export function profileCartridge(rom, symbols, { frames = 240, input = '', top = 12 } = {}) {
  const ranges = functionRanges(symbols);
  const m = new Machine(rom);
  const inputFn = parseInputSpec(input || '');
  m.boot();
  const acc = new Map();
  let total = 0;
  const find = (off) => {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (ranges[mid].start <= off) lo = mid + 1; else hi = mid - 1; }
    const f = hi >= 0 ? ranges[hi] : null;
    return f && off < f.end ? f.name : '(unknown)';
  };
  m.tracer = (pc, op, rd, rs, imm, r) => {
    let cost = OP_BY_CODE[op] ? OP_BY_CODE[op].cycles : 1;
    if (op === 0x40) cost += r[2] >> 2; else if (op === 0x41) cost += r[2] >> 3;
    const off = pc < C.ROM_WINDOW_START ? pc : (m.mem[C.ROMBANK] & 0x7f) * C.BANK_SIZE + (pc - C.ROM_WINDOW_START);
    const name = find(off);
    acc.set(name, (acc.get(name) || 0) + cost);
    total += cost;
  };
  for (let f = 0; f < frames; f++) m.runFrame(inputFn(f));
  m.tracer = null;
  const functions = [...acc].sort((a, b) => b[1] - a[1]).slice(0, top).map(([name, c]) => ({ name, cycles_per_frame: Math.round(c / frames), percent: Math.round((c / total) * 1000) / 10 }));
  return { frames, avg_cycles_per_frame: Math.round(total / frames), functions };
}

/**
 * For particular frames (usually the worst ones), say which functions spent the cycles in each: one pass, tracing only those frames.
 * @returns {Array<{frame: number, cycles: number, functions: Array<{name: string, cycles: number}>}>}
 */
export function profileFrames(rom, symbols, frames, { input = '', save = null, top = 4 } = {}) {
  const ranges = functionRanges(symbols);
  const want = new Set(frames);
  const last = Math.max(...frames);
  const m = new Machine(rom, { save });
  const inputFn = parseInputSpec(input || '');
  m.boot();
  const find = (off) => {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (ranges[mid].start <= off) lo = mid + 1; else hi = mid - 1; }
    const f = hi >= 0 ? ranges[hi] : null;
    return f && off < f.end ? f.name : '(unknown)';
  };
  const out = [];
  for (let f = 0; f <= last; f++) {
    if (!want.has(f)) { m.runFrame(inputFn(f)); continue; }
    const acc = new Map();
    let total = 0;
    m.tracer = (pc, op, rd, rs, imm, r) => {
      let cost = OP_BY_CODE[op] ? OP_BY_CODE[op].cycles : 1;
      if (op === 0x40) cost += r[2] >> 2; else if (op === 0x41) cost += r[2] >> 3;
      const off = pc < C.ROM_WINDOW_START ? pc : (m.mem[C.ROMBANK] & 0x7f) * C.BANK_SIZE + (pc - C.ROM_WINDOW_START);
      const name = find(off);
      acc.set(name, (acc.get(name) || 0) + cost); total += cost;
    };
    m.runFrame(inputFn(f));
    m.tracer = null;
    out.push({ frame: f, cycles: total, functions: [...acc].sort((a, b) => b[1] - a[1]).slice(0, top).map(([name, cycles]) => ({ name, cycles })) });
  }
  return out;
}
