// What was the game doing when it failed? Replays a run up to its first fault (the machine is deterministic, so the
// replay is exact) and records where it happened, the calls that led there, the game's variables and the screen.
// Needs the build's symbols and RAM map to give names; with a bare .vlc it still reports the address and instruction.

import { Machine } from '../core/machine.js';
import * as C from '../core/constants.js';
import { decode } from '../asm/disasm.js';
import { parseInputSpec } from './input.js';
import { functionRanges } from './profile.js';

const FAULT_BITS = { DIV0: C.ST_DIV0, RO_WRITE: C.ST_RO_WRITE, ILLEGAL: C.ST_ILLEGAL, OVERRUN: C.ST_OVERRUN };
const hex4 = (n) => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
const signed = (v) => (v >= 0x8000 ? v - 0x10000 : v);

/** The first fault of a run result `r` (from runCartridge): the earliest frame, as {kind, frame}, or null. */
export function firstFaultOf(r) {
  const all = Object.entries(r.firstFault || {}).map(([kind, frame]) => ({ kind, frame })).sort((a, b) => a.frame - b.frame);
  return all[0] || null;
}

/**
 * Replay up to `frame` and describe the first `kind` fault in it.
 * @param {Uint8Array} rom
 * @param {{kind: string, frame: number, input?: string|((f:number)=>number), save?: Uint8Array|null,
 *          symbols?: object, ram?: object, watch?: string[]}} o   `frame` is the 0-based frame the fault happened in
 */
export function faultSnapshot(rom, o) {
  const inputFn = typeof o.input === 'function' ? o.input : parseInputSpec(o.input || '');
  const bit = FAULT_BITS[o.kind];
  const m = new Machine(rom, { save: o.save || null });
  m.boot();
  for (let f = 0; f < o.frame; f++) m.runFrame(inputFn(f));

  let prev = null, hit = null, ramCopy = null;
  const stop = (at) => { hit = at; ramCopy = m.mem.slice(C.WRAM); hit.stack = readStack(m, at.regs[15]); };
  m.tracer = (pc, op, rd, rs, imm, r) => {
    if (!hit && prev && (m.status & bit)) stop(prev);        // the previous instruction raised it
    prev = { pc, regs: Array.from(r), bank: m.mem[C.ROMBANK] };
  };
  m.runFrame(inputFn(o.frame));
  m.tracer = null;
  if (!hit && prev) stop(prev);                              // the last instruction raised it, or the frame ran out of cycles
  const rgba = m.renderRGBA();
  if (!hit) return null;

  const ranges = o.symbols ? functionRanges(o.symbols) : [];
  const nameAt = (pc, bank) => {
    if (!ranges.length) return null;
    const off = pc < C.ROM_WINDOW_START ? pc : (bank & 0x7f) * C.BANK_SIZE + (pc - C.ROM_WINDOW_START);
    const f = ranges.find((x) => off >= x.start && off < x.end);
    return f ? f.name : null;
  };
  const bytes = Uint8Array.from([0, 1, 2, 3], (_, i) => m.read8(hit.pc + i));
  let instruction = '';
  try { instruction = decode(bytes, 0).text; } catch { /* leave blank */ }
  const fn = nameAt(hit.pc, hit.bank);
  const chain = [];
  for (const ret of hit.stack) {
    const name = nameAt(ret - 4, hit.bank);                  // the CALL is 4 bytes long, so it starts 4 before the return address
    if (name && name !== chain[chain.length - 1]) chain.push(name);
    if (chain.length >= 6) break;
  }
  // a fault inside a built-in routine (division, copy) belongs to the function that called it
  const helper = !fn && chain.length > 0;
  const snap = {
    kind: o.kind, frame: o.frame, pc: hit.pc, instruction, fn: fn || chain[0] || null, ...(helper ? { inBuiltIn: true } : {}),
    calledFrom: chain.slice(fn ? (chain[0] === fn ? 1 : 0) : 1),
    vars: o.ram ? readVars(o.ram, ramCopy, o.watch || []) : [],
  };
  Object.defineProperty(snap, 'rgba', { value: rgba, enumerable: false });     // the picture is a file, not part of the JSON
  return snap;
}

/** The words on the stack that look like return addresses (the byte 4 before them is a CALL or CALLR). */
function readStack(m, sp) {
  const out = [];
  for (let a = sp, n = 0; a !== 0 && a < 0xfffe && n < 64; a += 2, n++) {
    const w = m.read16(a);
    if (w >= 4 && (m.read8(w - 4) === 0x3c || m.read8(w - 4) === 0x3f)) out.push(w);
  }
  return out;
}

function readVars(ram, copy, watch) {
  const at = (a) => a - C.WRAM;
  const names = Object.keys(ram).filter((n) => ram[n].addr >= C.WRAM && at(ram[n].addr) + ram[n].bytes <= copy.length && !n.startsWith('__'));
  const first = watch.filter((n) => names.includes(n));
  const ordered = [...first, ...names.filter((n) => !first.includes(n)).sort((a, b) => ram[a].addr - ram[b].addr)];
  return ordered.slice(0, 48).map((name) => {
    const r = ram[name];
    const byteElems = r.type === 'byte[]' || r.type === 'byte';
    const n = Math.min(r.type.endsWith('[]') ? r.bytes / (byteElems ? 1 : 2) : 1, 8);
    const total = r.type.endsWith('[]') ? r.bytes / (byteElems ? 1 : 2) : 1;
    const values = [];
    for (let i = 0; i < n; i++) {
      const a = at(r.addr) + i * (byteElems ? 1 : 2);
      values.push(byteElems ? copy[a] : signed(copy[a] | (copy[a + 1] << 8)));
    }
    return r.type.endsWith('[]') ? { name, values, of: total } : { name, value: values[0] };
  });
}

const FAULT_WORDS = {
  DIV0: 'divided by zero', RO_WRITE: 'wrote to read-only memory', ILLEGAL: 'ran an illegal instruction', OVERRUN: 'ran out of its cycle budget',
};

/** One readable block: what happened, where, how it got there, and the variables. */
export function formatSnapshot(s, { replay } = {}) {
  const where = s.fn ? `in ${s.fn}()` : `at ${hex4(s.pc)}${s.instruction ? ` (${s.instruction})` : ''}`;
  let t = `${s.kind}: the game ${FAULT_WORDS[s.kind] || 'faulted'} on frame ${s.frame}, ${where}`;
  if (s.fn && s.instruction) t += s.inBuiltIn ? ` (inside a built-in routine, ${hex4(s.pc)}: ${s.instruction})` : `, at ${hex4(s.pc)}: ${s.instruction}`;
  if (s.calledFrom && s.calledFrom.length) t += `\n        called from ${s.calledFrom.join(' <- ')}`;
  if (s.vars && s.vars.length) {
    const one = s.vars.map((v) => (v.values ? `${v.name}=[${v.values.join(',')}${v.of > v.values.length ? ',…' : ''}]` : `${v.name}=${v.value}`));
    t += `\n        variables: ${one.join(' ')}`;
  } else if (!s.fn) {
    t += '\n        (build from source, vly check src/main.vly, to see function and variable names)';
  }
  if (replay) t += `\n        replay: ${replay}`;
  return t;
}
