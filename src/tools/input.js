// Input scripts: a compact text format for describing button presses over time.
//
//   "RIGHT@0-59, A+RIGHT@60-79, START@100"
//
// Each segment is BUTTONS@FRAMES. BUTTONS are names joined with '+' (UP DOWN LEFT RIGHT A B START SELECT) or a
// number. FRAMES is a single frame (N), an inclusive range (N-M) or an open range from N onward (N-).
// Add /P to press for ONE frame out of every P ("mashing"): "A@30-3000/3" presses A on frames 30, 33, 36, ...
// Frames are numbered from 0. Overlapping segments are OR-ed together. Segments are separated by commas, semicolons or
// newlines, and `#` starts a comment, so long recorded inputs can live in a file (`--input-file`, or "inputFile" in a test).

import { BTN } from '../core/constants.js';

export function parseInputSpec(spec) {
  const segs = [];
  if (spec && spec.replace(/#[^\n]*/g, '').trim()) {
    for (const part of spec.replace(/#[^\n]*/g, '').split(/[,;\n]/)) {
      const p = part.trim();
      if (!p) continue;
      const m = /^([^@]+)@(\d+)(?:(-)(\d*))?(?:\/(\d+))?$/.exec(p);
      if (!m) throw new Error(`bad input segment "${p}" (expected BUTTONS@FRAME, BUTTONS@START-END, BUTTONS@START- or BUTTONS@START-END/PERIOD)`);
      let mask = 0;
      for (const name of m[1].split('+')) {
        const n = name.trim().toUpperCase();
        if (/^(0x[0-9a-f]+|\d+)$/i.test(n)) mask |= parseInt(n) & 0xff;
        else if (n in BTN) mask |= BTN[n];
        else throw new Error(`unknown button "${name.trim()}" in "${p}" (use ${Object.keys(BTN).join(', ')})`);
      }
      const start = parseInt(m[2], 10);
      const end = m[3] ? (m[4] === '' ? Infinity : parseInt(m[4], 10)) : start;
      if (end < start) throw new Error(`frame range ends before it starts in "${p}"`);
      const period = m[5] ? parseInt(m[5], 10) : 1;
      if (period < 1) throw new Error(`the repeat period must be at least 1 in "${p}"`);
      segs.push({ mask, start, end, period });
    }
  }
  return (frame) => {
    let v = 0;
    for (const s of segs) if (frame >= s.start && frame <= s.end && (frame - s.start) % s.period === 0) v |= s.mask;
    return v;
  };
}

export function buttonNames(mask) {
  return Object.entries(BTN).filter(([, v]) => mask & v).map(([k]) => k).join('+') || '-';
}
