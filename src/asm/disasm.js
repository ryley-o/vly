// VLY-1 disassembler. Linear sweep; bytes that do not decode are shown as .db.

import { OP_BY_CODE, formHasImm } from '../core/isa.js';

const hex = (v, w = 4) => '0x' + v.toString(16).toUpperCase().padStart(w, '0');
const reg = (n) => (n === 15 ? 'sp' : `r${n}`);

/** Decode one instruction at `bytes[i]`. Returns {len, text, op} (op null if illegal / truncated). */
export function decode(bytes, i, labelFor = () => null) {
  const opc = bytes[i];
  const op = OP_BY_CODE[opc];
  if (!op) return { len: 1, text: `.db ${hex(opc, 2)}`, op: null };
  const len = formHasImm(op.form) ? 4 : 2;
  if (i + len > bytes.length) return { len: 1, text: `.db ${hex(opc, 2)}`, op: null };
  const b1 = bytes[i + 1];
  const rd = b1 >> 4, rs = b1 & 15;
  const imm = len === 4 ? bytes[i + 2] | (bytes[i + 3] << 8) : 0;
  const immText = (v) => labelFor(v) || hex(v);
  const off = (v) => (v >= 0x8000 ? `-${hex(0x10000 - v)}` : `+${hex(v)}`);
  let args = '';
  switch (op.form) {
    case 'none': case 'hw': args = ''; break;
    case 'rd': args = reg(rd); break;
    case 'rs': args = reg(rs); break;
    case 'rd,rs': args = `${reg(rd)}, ${reg(rs)}`; break;
    case 'rd,imm': args = `${reg(rd)}, ${immText(imm)}`; break;
    case 'rd,n': args = `${reg(rd)}, ${rs}`; break;
    case 'imm': args = immText(imm); break;
    case 'rd,[rs]': args = `${reg(rd)}, [${reg(rs)}]`; break;
    case '[rd],rs': args = `[${reg(rd)}], ${reg(rs)}`; break;
    // r13 is the compiler's zero register, so with it the "offset" is really an absolute address: show it unsigned
    case 'rd,[rs+imm]': args = `${reg(rd)}, [${reg(rs)}${rs === 13 ? `+${hex(imm)}` : off(imm)}]`; break;
    case '[rd+imm],rs': args = `[${reg(rd)}${rd === 13 ? `+${hex(imm)}` : off(imm)}], ${reg(rs)}`; break;
  }
  return { len, text: args ? `${op.name} ${args}` : op.name, op };
}

/**
 * @param {Uint8Array} bytes
 * @param {{start?: number, end?: number, symbols?: Record<string, any>}} [opts] offsets into `bytes`
 * @returns {string[]} lines like "0010: 03 00 34 12   LDI r0, 0x1234"
 */
export function disassemble(bytes, opts = {}) {
  const start = opts.start ?? 0;
  const end = Math.min(opts.end ?? bytes.length, bytes.length);
  const byAddr = new Map();
  if (opts.symbols) for (const [name, s] of Object.entries(opts.symbols)) if (s.kind === 'label') byAddr.set(s.addr, name);
  const labelFor = (v) => byAddr.get(v) || null;
  const lines = [];
  let i = start;
  while (i < end) {
    if (byAddr.has(i)) lines.push(`${byAddr.get(i)}:`);
    const d = decode(bytes, i, labelFor);
    const raw = Array.from(bytes.slice(i, i + d.len), (b) => b.toString(16).padStart(2, '0')).join(' ');
    lines.push(`  ${i.toString(16).padStart(4, '0')}: ${raw.padEnd(11)} ${d.text}`);
    i += d.len;
  }
  return lines;
}
