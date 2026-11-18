// VLY-1 assembler. Two passes, no external dependencies, usable in Node and browsers.
//
//   const { bytes, symbols } = assemble(source, { filename: 'main.asm', readFile })
//
// `readFile(path, fromFile)` must return a string for .include and a Uint8Array for .incbin (it is only
// called for those directives). See docs/asm.md for the syntax.

import { OP_BY_NAME, ALIASES, formHasImm } from '../core/isa.js';
import { MAX_ROM_SIZE, BANK_SIZE } from '../core/constants.js';

export class AsmError extends Error {
  constructor(errors) {
    super(errors.map((e) => `${e.file}:${e.line}: ${e.message}${e.text ? `\n    ${e.text.trim()}` : ''}`).join('\n'));
    this.name = 'AsmError';
    this.errors = errors;
  }
}

const FLAT_LIMIT = 24576; // image offsets below this are visible at address == offset

/** CPU address at which image byte `off` is visible (fixed area, or the bank window). */
export function addressOf(off) {
  return off < FLAT_LIMIT ? off : 0x4000 + (off & (BANK_SIZE - 1));
}
/** Bank number that must be selected for image byte `off` (0 = fixed area, always visible). */
export function bankOf(off) {
  if (off < 0x4000) return 0;
  if (off < FLAT_LIMIT) return 2;
  return off >> 13;
}

// ---- tokenizer / expression evaluator ---------------------------------------------------------------

function tokenize(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === '$' && /[0-9a-fA-F]/.test(s[i + 1] || ''))) {
      let m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|\$[0-9a-fA-F_]+|[0-9][0-9_]*)/.exec(s.slice(i));
      if (!m) throw new Error(`bad number near '${s.slice(i, i + 8)}'`);
      const t = m[0].replace(/_/g, '');
      let v;
      if (t.startsWith('0x') || t.startsWith('0X')) v = parseInt(t.slice(2), 16);
      else if (t.startsWith('0b') || t.startsWith('0B')) v = parseInt(t.slice(2), 2);
      else if (t.startsWith('$')) v = parseInt(t.slice(1), 16);
      else v = parseInt(t, 10);
      toks.push({ t: 'num', v });
      i += m[0].length;
      continue;
    }
    if (ch === "'") {
      const m = /^'(\\.|[^\\'])'/.exec(s.slice(i));
      if (!m) throw new Error('bad character literal');
      toks.push({ t: 'num', v: unescape(m[1]).charCodeAt(0) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_.]/.test(ch)) {
      const m = /^[A-Za-z_.][A-Za-z0-9_.]*/.exec(s.slice(i));
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (ch === '$') { toks.push({ t: 'id', v: '$' }); i++; continue; }
    const two = s.slice(i, i + 2);
    if (two === '<<' || two === '>>') { toks.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/%&|^~(),'.includes(ch)) { toks.push({ t: 'op', v: ch }); i++; continue; }
    throw new Error(`unexpected character '${ch}'`);
  }
  return toks;
}

function unescape(s) {
  return s.replace(/\\(x[0-9a-fA-F]{2}|.)/g, (_, e) => {
    if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', "'": "'", '"': '"' }[e] ?? e;
  });
}

class Expr {
  constructor(text, ctx) {
    this.toks = tokenize(text);
    this.i = 0;
    this.ctx = ctx;
  }
  parse() {
    const v = this.or();
    if (this.i < this.toks.length) throw new Error(`unexpected '${this.toks[this.i].v}' in expression`);
    return v;
  }
  peek() { return this.toks[this.i]; }
  isOp(v) { const t = this.peek(); return t && t.t === 'op' && t.v === v; }
  or() { let a = this.xor(); while (this.isOp('|')) { this.i++; a = a | this.xor(); } return a; }
  xor() { let a = this.and(); while (this.isOp('^')) { this.i++; a = a ^ this.and(); } return a; }
  and() { let a = this.shift(); while (this.isOp('&')) { this.i++; a = a & this.shift(); } return a; }
  shift() {
    let a = this.add();
    for (;;) {
      if (this.isOp('<<')) { this.i++; a = a << this.add(); }
      else if (this.isOp('>>')) { this.i++; a = a >> this.add(); }
      else return a;
    }
  }
  add() {
    let a = this.mul();
    for (;;) {
      if (this.isOp('+')) { this.i++; a = a + this.mul(); }
      else if (this.isOp('-')) { this.i++; a = a - this.mul(); }
      else return a;
    }
  }
  mul() {
    let a = this.unary();
    for (;;) {
      if (this.isOp('*')) { this.i++; a = a * this.unary(); }
      else if (this.isOp('/')) { this.i++; const b = this.unary(); if (b === 0) throw new Error('division by zero'); a = Math.trunc(a / b); }
      else if (this.isOp('%')) { this.i++; const b = this.unary(); if (b === 0) throw new Error('division by zero'); a = a % b; }
      else return a;
    }
  }
  unary() {
    if (this.isOp('-')) { this.i++; return -this.unary(); }
    if (this.isOp('+')) { this.i++; return this.unary(); }
    if (this.isOp('~')) { this.i++; return ~this.unary(); }
    return this.atom();
  }
  atom() {
    const t = this.toks[this.i++];
    if (!t) throw new Error('unexpected end of expression');
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '(') {
      const v = this.or();
      if (!this.isOp(')')) throw new Error("missing ')'");
      this.i++;
      return v;
    }
    if (t.t === 'id') {
      const lname = t.v.toLowerCase();
      if (['lo', 'hi', 'bank', 'addr'].includes(lname) && this.isOp('(')) {
        this.i++;
        const v = this.or();
        if (!this.isOp(')')) throw new Error("missing ')'");
        this.i++;
        if (lname === 'lo') return v & 0xff;
        if (lname === 'hi') return (v >> 8) & 0xff;
        // bank()/addr() take a symbol's image offset, so they need the offset form of the argument.
        throw new Error(`${lname}() must be applied to a label name`);
      }
      if (t.v === '$') return this.ctx.here();
      return this.ctx.symbol(t.v);
    }
    throw new Error(`unexpected '${t.v}' in expression`);
  }
}

// ---- assembler --------------------------------------------------------------------------------------

function splitArgs(s) {
  // Split on commas that are not inside quotes or brackets.
  const out = [];
  let depth = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      cur += ch;
      if (ch === '\\') { cur += s[++i] ?? ''; }
      else if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '[' || ch === '(') depth++;
    if (ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim() !== '' || out.length) out.push(cur.trim());
  return out;
}

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
    if (ch === '"' || (ch === "'" )) { q = ch; continue; }
    if (ch === ';') return line.slice(0, i);
    if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

const REG_RE = /^(?:r(\d{1,2})|sp|fp)$/i;
function parseReg(s) {
  const m = REG_RE.exec(s.trim());
  if (!m) return null;
  if (/^sp$/i.test(s.trim())) return 15;
  if (/^fp$/i.test(s.trim())) return 14;
  const n = parseInt(m[1], 10);
  return n <= 15 ? n : null;
}

/**
 * @param {string} source
 * @param {{filename?: string, readFile?: (path: string, from: string) => string | Uint8Array, maxSize?: number}} [opts]
 * @returns {{bytes: Uint8Array, symbols: Record<string, {offset: number, addr: number, bank: number}>, listing: Array, warnings: string[]}}
 */
export function assemble(source, opts = {}) {
  const filename = opts.filename || 'input.asm';
  const readFile = opts.readFile || (() => { throw new Error('no readFile provided for .include / .incbin'); });
  const maxSize = opts.maxSize || MAX_ROM_SIZE;
  // opts.measure: lay code out past bank boundaries without complaining (the compiler uses this to report sizes)

  const errors = [];
  const warnings = [];
  const symbols = Object.create(null); // name -> {offset|value, kind}
  const lines = []; // flattened source lines after .include expansion

  function addLines(text, file, depth) {
    if (depth > 16) throw new Error(`${file}: .include nested too deeply`);
    const src = text.split(/\r?\n/);
    for (let i = 0; i < src.length; i++) {
      const raw = src[i];
      const m = /^\s*\.include\s+"([^"]+)"\s*(?:[;].*)?$/i.exec(raw);
      if (m) {
        let inc;
        try { inc = readFile(m[1], file); } catch (e) { errors.push({ file, line: i + 1, message: `cannot include "${m[1]}": ${e.message}`, text: raw }); continue; }
        if (typeof inc !== 'string') inc = new TextDecoder().decode(inc);
        addLines(inc, m[1], depth + 1);
        continue;
      }
      lines.push({ file, line: i + 1, raw });
    }
  }
  addLines(source, filename, 0);

  let curLine = null;
  const err = (msg) => errors.push({ file: curLine.file, line: curLine.line, message: msg, text: curLine.raw });

  // pass: 1 = compute symbols, 2 = emit
  const out = new Uint8Array(maxSize + 4);
  let high = 0;
  let off = 0;
  let pass = 1;
  let refine = false; // second symbol pass: redefine labels/consts with values that were forward references before
  const listing = [];

  const ctx = {
    here: () => addressOf(off),
    symbol: (name) => {
      const s = symbols[name];
      if (!s) {
        if (pass === 1) return 0; // forward reference; resolved in pass 2
        throw new Error(`undefined symbol '${name}'`);
      }
      return s.kind === 'label' ? addressOf(s.offset) : s.value;
    },
  };

  function evalExpr(text) {
    // Handle bank(label) / addr(label) specially: they need the label's image offset.
    const rewritten = text.replace(/\b(bank|offset)\s*\(\s*([A-Za-z_.][A-Za-z0-9_.]*)\s*\)/gi, (_, fn, name) => {
      const s = symbols[name];
      if (!s || s.kind !== 'label') {
        if (pass === 1) return '0';
        throw new Error(`${fn}() needs a label; '${name}' is not one`);
      }
      return String(fn.toLowerCase() === 'bank' ? bankOf(s.offset) : s.offset);
    });
    return new Expr(rewritten, ctx).parse();
  }

  function emit(byte) {
    if (off >= maxSize) throw new Error(`cartridge exceeds ${maxSize} bytes`);
    if (pass === 2) out[off] = byte & 0xff;
    off++;
    if (off > high) high = off;
  }
  function emit16(v) {
    emit(v & 0xff);
    emit((v >> 8) & 0xff);
  }
  function check16(v, what) {
    if (v < -32768 || v > 65535) throw new Error(`${what} ${v} does not fit in 16 bits`);
    return v & 0xffff;
  }
  function checkBankCross(start, length, isCode) {
    if (length === 0) return;
    const last = start + length - 1;
    if (last < FLAT_LIMIT) return;
    const crosses = start < FLAT_LIMIT ? true : (start >> 13) !== (last >> 13);
    if (crosses) {
      if (isCode && !opts.measure) throw new Error('instruction straddles an 8 KB bank boundary; use .bank or .org to move it');
      if (pass === 2) warnings.push(`${curLine.file}:${curLine.line}: data at image offset ${start} crosses an 8 KB bank boundary; it will not be contiguous in the CPU's view`);
    }
  }

  function runPass(p, quiet = false) {
    pass = p;
    off = 0;
    for (const L of lines) {
      curLine = L;
      try {
        handleLine(L);
      } catch (e) {
        if (!quiet) err(e.message);
      }
    }
  }

  function define(name, entry) {
    if (!/^[A-Za-z_.][A-Za-z0-9_.]*$/.test(name)) throw new Error(`bad symbol name '${name}'`);
    if (pass === 1 && !refine && symbols[name]) throw new Error(`symbol '${name}' is already defined`);
    if (pass === 1) symbols[name] = entry;
    else if (symbols[name] && entry.kind === 'label' && symbols[name].offset !== entry.offset) {
      throw new Error(`label '${name}' moved between passes (a .org/.ds/.align size depends on a later label)`);
    }
  }

  function handleLine(L) {
    let text = stripComment(L.raw).trim();
    if (!text) return;
    // labels
    for (;;) {
      const m = /^([A-Za-z_.][A-Za-z0-9_.]*)\s*:(?!:)\s*/.exec(text);
      if (!m) break;
      define(m[1], { kind: 'label', offset: off });
      text = text.slice(m[0].length);
    }
    if (!text) return;
    // NAME = expr
    const eq = /^([A-Za-z_.][A-Za-z0-9_.]*)\s*=\s*(.+)$/.exec(text);
    if (eq && !/^r\d+$/i.test(eq[1])) {
      const v = evalExpr(eq[2]);
      define(eq[1], { kind: 'const', value: v });
      return;
    }
    const sp = /^(\S+)\s*(.*)$/.exec(text);
    const word = sp[1];
    const rest = sp[2].trim();
    const startOff = off;
    if (word.startsWith('.')) {
      handleDirective(word.toLowerCase(), rest);
    } else {
      handleInstruction(word, rest);
    }
    if (pass === 2 && off > startOff) listing.push({ file: L.file, line: L.line, offset: startOff, addr: addressOf(startOff), bytes: out.slice(startOff, off), text: text });
  }

  function handleDirective(d, rest) {
    const args = splitArgs(rest);
    switch (d) {
      case '.org': {
        const v = evalExpr(args[0]);
        if (v < 0 || v > maxSize) throw new Error(`.org ${v} out of range`);
        if (pass === 2 && v < off) throw new Error(`.org ${v} moves backwards (current offset is ${off})`);
        // pad with zeros (output array is already zero-filled)
        off = v;
        if (off > high) high = off;
        break;
      }
      case '.bank': {
        const n = evalExpr(args[0]);
        if (n < 0 || n > 127) throw new Error('.bank needs 0..127');
        if (n < 2) throw new Error('banks 0 and 1 are the fixed area; use .org 0 or .org 8192 for them');
        const target = n * BANK_SIZE;
        if (pass === 2 && target < off) throw new Error(`.bank ${n} is behind the current position (offset ${off}); banks must be used in increasing order`);
        off = target;
        if (off > high) high = off;
        break;
      }
      case '.equ': case '.set': {
        define(args[0], { kind: 'const', value: evalExpr(args[1]) });
        break;
      }
      case '.db': case '.byte': {
        for (const a of args) {
          const sm = /^"((?:\\.|[^"\\])*)"$/.exec(a);
          if (sm) {
            const s = unescape(sm[1]);
            checkBankCross(off, s.length, false);
            for (const ch of s) emit(ch.charCodeAt(0));
          } else {
            const v = evalExpr(a);
            if (v < -128 || v > 255) throw new Error(`byte value ${v} does not fit in 8 bits`);
            emit(v & 0xff);
          }
        }
        break;
      }
      case '.dw': case '.word': {
        checkBankCross(off, args.length * 2, false);
        for (const a of args) emit16(check16(evalExpr(a), 'word value'));
        break;
      }
      case '.ascii': case '.asciz': {
        const sm = /^"((?:\\.|[^"\\])*)"$/.exec(rest);
        if (!sm) throw new Error(`${d} needs a double-quoted string`);
        const s = unescape(sm[1]);
        checkBankCross(off, s.length + (d === '.asciz' ? 1 : 0), false);
        for (const ch of s) emit(ch.charCodeAt(0));
        if (d === '.asciz') emit(0);
        break;
      }
      case '.ds': case '.space': {
        const n = evalExpr(args[0]);
        const fill = args[1] !== undefined ? evalExpr(args[1]) : 0;
        if (n < 0) throw new Error('.ds count must be >= 0');
        checkBankCross(off, n, false);
        for (let i = 0; i < n; i++) emit(fill);
        break;
      }
      case '.align': {
        const n = evalExpr(args[0]);
        if (n < 1) throw new Error('.align needs a positive number');
        const fill = args[1] !== undefined ? evalExpr(args[1]) : 0;
        while (off % n !== 0) emit(fill);
        break;
      }
      case '.incbin': {
        const sm = /^"([^"]+)"$/.exec(args[0] || '');
        if (!sm) throw new Error('.incbin needs a quoted file name');
        const data = readFile(sm[1], curLine.file);
        if (typeof data === 'string') throw new Error(`${sm[1]}: expected binary data`);
        const o = args[1] !== undefined ? evalExpr(args[1]) : 0;
        const n = args[2] !== undefined ? evalExpr(args[2]) : data.length - o;
        if (o < 0 || n < 0 || o + n > data.length) throw new Error(`.incbin range out of bounds for ${sm[1]} (${data.length} bytes)`);
        checkBankCross(off, n, false);
        for (let i = 0; i < n; i++) emit(data[o + i]);
        break;
      }
      case '.header': {
        if (off !== 0) throw new Error('.header must be at the very start of the cartridge');
        if (args.length !== 2) throw new Error('.header needs two arguments: init_label, frame_label');
        const initV = check16(evalExpr(args[0]), 'init vector');
        const frameV = check16(evalExpr(args[1]), 'frame vector');
        emit(0x56); emit(0x43); emit(1); emit(0);
        emit16(initV); emit16(frameV);
        for (let i = 0; i < 8; i++) emit(0);
        break;
      }
      default:
        throw new Error(`unknown directive ${d}`);
    }
  }

  function regArg(s, what) {
    const r = parseReg(s);
    if (r === null) throw new Error(`expected a register (r0..r15, sp, fp) for ${what}, got '${s}'`);
    return r;
  }

  // "[r1]" "[r1+expr]" "[r1-expr]"  ->  {reg, imm|null}
  function memArg(s, wantImm) {
    const m = /^\[\s*([A-Za-z0-9_]+)\s*(?:([+-])\s*(.+?))?\s*\]$/.exec(s.trim());
    if (!m) throw new Error(`expected a memory operand like [r1] or [r1+4], got '${s}'`);
    const reg = regArg(m[1], 'memory operand');
    let imm = 0;
    if (m[2]) {
      if (!wantImm) throw new Error('this instruction takes [reg] with no offset; use the X form (LDX/STX/LDBX/STBX) for [reg+offset]');
      imm = evalExpr(m[3]);
      if (m[2] === '-') imm = -imm;
    }
    return { reg, imm };
  }

  function handleInstruction(wordRaw, rest) {
    let word = wordRaw.toUpperCase();
    word = ALIASES[word] || word;
    const args = splitArgs(rest);

    // Pseudo-instructions.
    if (word === 'INC' || word === 'DEC') {
      if (args.length !== 1) throw new Error(`${word} needs one register`);
      return encode('ADDI', [regArg(args[0], word), null], word === 'INC' ? 1 : 0xffff);
    }
    if (word === 'CLR') {
      if (args.length !== 1) throw new Error('CLR needs one register');
      const r = regArg(args[0], 'CLR');
      return encode('XOR', [r, r], 0);
    }
    if (word === 'SUBI') {
      if (args.length !== 2) throw new Error('SUBI needs a register and a value');
      const v = evalExpr(args[1]);
      return encode('ADDI', [regArg(args[0], 'SUBI'), null], (-v) & 0xffff);
    }

    const op = OP_BY_NAME[word];
    if (!op) throw new Error(`unknown instruction '${wordRaw}'`);
    const need = (n) => { if (args.length !== n) throw new Error(`${op.name} takes ${n} operand${n === 1 ? '' : 's'} (${op.form}), got ${args.length}`); };
    let rd = 0, rs = 0, imm = 0;
    switch (op.form) {
      case 'none': case 'hw': need(0); break;
      case 'rd': need(1); rd = regArg(args[0], 'rd'); break;
      case 'rs': need(1); rs = regArg(args[0], 'rs'); break;
      case 'rd,rs': need(2); rd = regArg(args[0], 'rd'); rs = regArg(args[1], 'rs'); break;
      case 'rd,imm': need(2); rd = regArg(args[0], 'rd'); imm = check16(evalExpr(args[1]), 'immediate'); break;
      case 'rd,n': {
        need(2); rd = regArg(args[0], 'rd');
        rs = evalExpr(args[1]);
        if (rs < 0 || rs > 15) throw new Error(`${op.name} count must be 0..15, got ${rs}`);
        break;
      }
      case 'imm': need(1); imm = check16(evalExpr(args[0]), 'address'); break;
      case 'rd,[rs]': {
        need(2); rd = regArg(args[0], 'rd');
        rs = memArg(args[1], false).reg; break;
      }
      case '[rd],rs': {
        need(2); rd = memArg(args[0], false).reg; rs = regArg(args[1], 'rs'); break;
      }
      case 'rd,[rs+imm]': {
        need(2); rd = regArg(args[0], 'rd');
        const m = memArg(args[1], true); rs = m.reg; imm = check16(m.imm, 'offset'); break;
      }
      case '[rd+imm],rs': {
        need(2);
        const m = memArg(args[0], true); rd = m.reg; imm = check16(m.imm, 'offset');
        rs = regArg(args[1], 'rs'); break;
      }
      default: throw new Error('internal: unhandled form ' + op.form);
    }
    encode(op.name, [rd, rs], imm);
  }

  function encode(name, regs, imm) {
    const op = OP_BY_NAME[name];
    const rd = regs[0] ?? 0, rs = regs[1] ?? 0;
    const len = formHasImm(op.form) ? 4 : 2;
    checkBankCross(off, len, true);
    emit(op.op);
    emit((rd << 4) | rs);
    if (len === 4) emit16(imm);
  }

  runPass(1);
  if (errors.length === 0) { refine = true; high = 0; runPass(1, true); }
  if (errors.length === 0) { high = 0; runPass(2); }
  if (errors.length) throw new AsmError(errors);

  // Trim to the highest written byte.
  const bytes = out.slice(0, high);
  const syms = {};
  for (const [name, s] of Object.entries(symbols)) {
    syms[name] = s.kind === 'label'
      ? { kind: 'label', offset: s.offset, addr: addressOf(s.offset), bank: bankOf(s.offset) }
      : { kind: 'const', value: s.value };
  }
  return { bytes, symbols: syms, listing, warnings };
}
