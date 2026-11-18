// Reference audio synthesis for VLY-1 (SPEC.md section 8). Informative: audio never affects program state.
// Pure JS, no dependencies. Used by the web player and by tools that export WAV files.

import { AUDIO } from './constants.js';

const DUTY = [0.125, 0.25, 0.5, 0.75];

export class Synth {
  /** @param {Uint8Array} mem the machine's backing memory (Machine#mem) */
  constructor(mem, rate = 44100) {
    this.mem = mem;
    this.rate = rate;
    this.phase = [0, 0, 0, 0];
    this.lfsr = 0x4000;
    this.wasOn = [false, false, false, false];
  }

  /** Render `n` mono samples as floats in [-1, 1] using the current register values. */
  render(n) {
    const out = new Float32Array(n);
    const m = this.mem;
    const master = (m[AUDIO + 16] & 15) / 15;
    const ch = [];
    for (let c = 0; c < 4; c++) {
      const base = AUDIO + c * 4;
      const hz = m[base] | (m[base + 1] << 8);
      const vol = (m[base + 2] & 15) / 15;
      const ctrl = m[base + 3];
      const on = (ctrl & 0x80) !== 0;
      if (on && !this.wasOn[c]) { this.phase[c] = 0; if (c === 3) this.lfsr = 0x4000; }
      this.wasOn[c] = on;
      ch.push({ hz, vol, duty: DUTY[ctrl & 3], on });
    }
    for (let i = 0; i < n; i++) {
      let mix = 0;
      for (let c = 0; c < 4; c++) {
        const k = ch[c];
        if (!k.on || k.vol === 0) continue;
        let p = this.phase[c] + k.hz / this.rate;
        let v;
        if (c === 3) {
          while (p >= 1) { p -= 1; const bit = (this.lfsr ^ (this.lfsr >> 1)) & 1; this.lfsr = (this.lfsr >> 1) | (bit << 14); }
          v = this.lfsr & 1 ? 1 : -1;
        } else {
          p -= Math.floor(p);
          v = c === 2 ? 4 * Math.abs(p - 0.5) - 1 : p < k.duty ? 1 : -1;
        }
        this.phase[c] = p;
        mix += v * k.vol;
      }
      out[i] = Math.max(-1, Math.min(1, (mix / 4) * master));
    }
    return out;
  }
}

/** Encode float samples as a 16-bit mono WAV file (Uint8Array). */
export function wavFromFloat(samples, rate = 44100) {
  const data = new Uint8Array(44 + samples.length * 2);
  const dv = new DataView(data.buffer);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) data[o + i] = s.charCodeAt(i); };
  wr(0, 'RIFF'); dv.setUint32(4, 36 + samples.length * 2, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  wr(36, 'data'); dv.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return data;
}
