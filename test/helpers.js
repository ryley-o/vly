import { assemble } from '../src/asm/index.js';
import { Machine } from '../src/core/index.js';

/** Assemble `body` with a standard header (init/frame labels must exist) and return a booted Machine. */
export function machineFrom(src, { frames = 0, input = 0, save = null } = {}) {
  const { bytes } = assemble('.header init, frame\n' + src);
  const m = new Machine(bytes, { save });
  m.boot();
  for (let i = 0; i < frames; i++) m.runFrame(typeof input === 'function' ? input(i) : input);
  return m;
}

/** Run a snippet of instructions as the frame routine (init is just RET). Returns the machine after one frame. */
export function runSnippet(snippet, { pre = '' } = {}) {
  return machineFrom(`init:\n RET\nframe:\n${snippet}\n RET\n${pre}`, { frames: 1 });
}

export const hex = (u8) => Buffer.from(u8).toString('hex');
