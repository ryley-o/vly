// Deterministic per-frame trace of a cartridge run: one line per frame with cycles, status and both hashes.
// The C implementation (c/main.c) prints the same format, which is how the two are compared.

import { Machine } from '../core/machine.js';
import { toHex } from '../core/sha256.js';
import { parseInputSpec } from './input.js';

/** @returns {string[]} lines: "<frame> <cycles> <status> <stateHash> <frameHash>"; the first line is frame -1 (after init). */
export function traceCartridge(rom, frames, input = '') {
  const inputFn = typeof input === 'function' ? input : parseInputSpec(input);
  const m = new Machine(rom);
  const line = (f, cycles) => `${f} ${cycles} ${m.status} ${toHex(m.stateHash())} ${toHex(m.frameHash())}`;
  m.boot();
  const lines = [line(-1, m.initCycles)];
  for (let i = 0; i < frames; i++) {
    m.runFrame(inputFn(i));
    lines.push(line(i, m.lastCycles));
  }
  return lines;
}

/** Per-frame input bytes as a Uint8Array (for the C runner). */
export function inputBytes(frames, input = '') {
  const fn = typeof input === 'function' ? input : parseInputSpec(input);
  return Uint8Array.from({ length: frames }, (_, i) => fn(i));
}
