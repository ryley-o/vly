// VLY language compiler: AST -> VLY-1 assembly text. See docs/language.md.
//
// Design goals: simple and predictable code generation, excellent error messages, no hidden state.
//   * every value is a 16-bit word; comparisons and >> are signed unless you use ult/ule/ugt/uge or >>>
//   * R0 holds expression results, R1-R3 are scratch, R14 is the frame pointer, R15 the stack pointer
//   * arguments are pushed left to right; locals live on the stack below the frame pointer
//   * only functions, globals, tables, strings and assets reachable from init()/frame() end up in the cartridge

import { CompileError } from './lexer.js';
import { parse } from './parser.js';
import { parseTilesText } from '../tools/tiles.js';
import { STDLIB_SOURCE } from './stdlib.js';
import { MODULES, MODULE_FILES } from './modules.js';
import { parseMapText } from '../tools/maps.js';

const w16 = (x) => (x << 16) >> 16;
const u16 = (x) => x & 0xffff;
const RAM_START = 0xb400;
const RAM_LIMIT = 0xf000; // keep the top 4 KB for the stack

const CMP_OPS = new Set(['==', '!=', '<', '<=', '>', '>=']);
const CMP_TRUE = { '==': 'JZ', '!=': 'JNZ', '<': 'JLT', '<=': 'JLE', '>': 'JGT', '>=': 'JGE', ult: 'JC', uge: 'JNC', ugt: 'JA', ule: 'JBE' };
const CMP_FALSE = { '==': 'JNZ', '!=': 'JZ', '<': 'JGE', '<=': 'JGT', '>': 'JLE', '>=': 'JLT', ult: 'JNC', uge: 'JC', ugt: 'JBE', ule: 'JA' };

// name -> number of arguments
const INTRINSICS = {
  peek: 1, peek8: 1, poke: 2, poke8: 2, copy: 3, fill: 3, rnd: 0, srand: 2, select_bank: 1, halt: 0,
  fmul: 2, udiv: 2, umod: 2, ult: 2, ule: 2, ugt: 2, uge: 2, rgb: 3, bankof: 1,
};
const UNSIGNED_CMP = new Set(['ult', 'ule', 'ugt', 'uge']);

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

class Ctx {
  constructor(opts) {
    this.opts = opts;
    const userRead = opts.readFile || (() => { throw new Error('no readFile provided'); });
    // built-in modules ship their own art: std/*.tiles resolve from memory, everything else from the caller
    this.readFile = (p, from) => (p in MODULE_FILES ? MODULE_FILES[p] : userRead(p, from));
    this.files = new Map(); // file -> source lines
    this.loaded = new Set();
    this.syms = new Map();
    this.errors = [];
    this.warnings = [];
    this.strings = new Map(); // text -> label
    this.labelN = 0;
    this.generated = new Map(); // func name -> record
  }

  err(node, message) {
    const lines = this.files.get(node.file) || [];
    this.errors.push({ file: node.file, line: node.line, col: node.col, message, text: lines[node.line - 1] });
  }

  fail(node, message) {
    const lines = this.files.get(node.file) || [];
    throw new CompileError({ file: node.file, line: node.line, col: node.col, message, text: lines[node.line - 1] });
  }

  // ---- loading ----
  loadSource(src, file, std) {
    this.files.set(file, src.split(/\r?\n/));
    const items = parse(src, file);
    for (const it of items) {
      if (it.k === 'import') {
        let text;
        const modName = it.path.replace(/\.vly$/, '');
        if (modName in MODULES) {
          if (this.loaded.has(modName)) continue;
          this.loaded.add(modName);
          this.loadSource(MODULES[modName].source, modName, true);
          continue;
        }
        if (/^std\//.test(modName)) { this.err(it, `unknown built-in module "${it.path}" (available: ${Object.keys(MODULES).join(', ')})`); continue; }
        try { text = this.readFile(it.path, file); } catch (e) { this.err(it, `cannot import "${it.path}": ${e.message}`); continue; }
        if (typeof text !== 'string') text = new TextDecoder().decode(text);
        // the imported file is known by its path relative to the file that imported it, so its own relative paths ("../assets/a.tiles") resolve from its folder
        const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
        const parts = (dir + it.path).split('/'), clean = [];
        for (const q of parts) { if (q === '..' && clean.length && clean[clean.length - 1] !== '..') clean.pop(); else if (q !== '.' && q !== '') clean.push(q); }
        const key = (dir.startsWith('/') ? '/' : '') + clean.join('/');
        if (this.loaded.has(key)) continue;
        this.loaded.add(key);
        this.loadSource(text, key, false);
        continue;
      }
      this.declare(it, std, file);
    }
  }

  declare(it, std, file) {
    const name = it.name;
    const existing = this.syms.get(name);
    if (existing) {
      const clash = (modFile) => {
        const prefix = /^([a-z0-9]+_)/.exec(name);
        return `'${name}' is also a name used inside the standard module ${modFile}, which this program imports. Rename yours${prefix ? ': that module keeps names starting with ' + prefix[1] + ' for itself' : ''}.`;
      };
      if (existing.std && !std) {
        if (/^std\//.test(existing.file || '')) { this.err(it, clash(existing.file)); return; }   // a module's own name: overriding it would break the module
        /* user code may override the core standard library */
      }
      else if (std) {
        if (/^std\//.test(file || '') && !existing.std) { this.err(existing.node, clash(file)); }
        return;
      }
      else {
        this.err(it, `'${name}' is already defined at ${existing.node.file}:${existing.node.line}`);
        return;
      }
    }
    const sym = { name, node: it, std, file };
    switch (it.k) {
      case 'const': sym.kind = 'const'; break;
      case 'global': sym.kind = 'global'; break;
      case 'array': sym.kind = 'array'; break;
      case 'table': sym.kind = 'table'; break;
      case 'func':
        sym.kind = 'func'; sym.nparams = it.params.length;
        if (it.bank != null) {
          if (std) this.err(it, 'standard library functions cannot be banked');
          if (it.bank < 3 || it.bank > 127) this.err(it, 'bank must be 3..127 (the compiler manages banks 0-2 itself)');
          if (name === 'init' || name === 'frame') this.err(it, `${name}() is an entry point: leave it unbanked and call a banked function from it instead`);
        } else if (!std && this.opts.autoBank && this.opts.autoBank.has(name)) {
          it.bank = this.opts.autoBank.get(name);     // the compiler moved this one to make room (see lang/index.js)
          it.auto = true;
        }
        sym.bank = it.bank ?? null;
        break;
      case 'tilemap': {
        sym.kind = 'tilemap';
        sym.bank = it.bank;
        try {
          const raw = this.readFile(it.path, file);
          const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
          const m = parseMapText(text, it.path);
          sym.map = m;
          const c = (n, v) => this.syms.set(`${name}_${n}`, { kind: 'constval', name: `${name}_${n}`, value: w16(v), node: it, std });
          c('W', m.width); c('H', m.height); c('SIZE', m.width * m.height * 2);
          for (const [ch, list] of m.markers) {
            c(`${ch}_X`, list[0].x); c(`${ch}_Y`, list[0].y); c(`${ch}_COUNT`, list.length);
            const values = list.flatMap((p) => [{ ...it, k: 'num', v: p.x }, { ...it, k: 'num', v: p.y }]);
            this.syms.set(`${name}_${ch}_list`, { kind: 'table', name: `${name}_${ch}_list`, node: { ...it, k: 'table', elem: 16, name: `${name}_${ch}_list`, values }, std });
          }
          if (it.bank !== null && (m.width * m.height * 2 > 8192)) this.err(it, `${it.path} is ${m.width * m.height * 2} bytes; a banked map must fit in one 8 KB bank`);
        } catch (e) {
          this.err(it, `cannot load "${it.path}": ${e.message}`);
          return;
        }
        break;
      }
      case 'asset': case 'tileset': case 'strings': {
        sym.kind = it.k === 'strings' ? 'asset' : it.k;
        sym.bank = it.bank;
        let data;
        try {
          const raw = this.readFile(it.path, file);
          if (it.k === 'asset') {
            if (typeof raw === 'string') throw new Error('expected a binary file');
            data = raw;
          } else if (it.k === 'strings') {
            // one string per line; \n inside a line is a line break, \\ a backslash. Layout: u16 count, u16 offsets, then the NUL-terminated strings.
            const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
            const lines = text.replace(/\r\n?/g, '\n').split('\n');
            if (lines.length && lines[lines.length - 1] === '') lines.pop();
            if (!lines.length) throw new Error('the file has no lines in it (one string per line)');
            const enc = new TextEncoder();
            const bodies = lines.map((l) => enc.encode(l.replace(/\\(n|\\)/g, (_, c) => (c === 'n' ? '\n' : '\\'))));
            let off = 2 + lines.length * 2;
            const bytes = [lines.length & 255, lines.length >> 8];
            for (const b of bodies) { bytes.push(off & 255, off >> 8); off += b.length + 1; }
            for (const b of bodies) bytes.push(...b, 0);
            data = Uint8Array.from(bytes);
            this.syms.set(`${name}_COUNT`, { kind: 'constval', name: `${name}_COUNT`, value: lines.length, node: it, std });
            this.syms.set(`${name}_BANK`, { kind: 'constval', name: `${name}_BANK`, value: typeof it.bank === 'number' ? it.bank : 0, node: it, std });
          } else {
            const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
            const t = parseTilesText(text, it.path);
            if (t.count === 0) throw new Error('the file has no tiles or sprites in it (is it empty?)');
            data = t.data;
            sym.tiles = t;
            this.syms.set(`${name}_COUNT`, { kind: 'constval', name: `${name}_COUNT`, value: t.count, node: it, std });
            for (const n of t.names) this.syms.set(`${name}_${n.name}`, { kind: 'constval', name: `${name}_${n.name}`, value: n.index, node: it, std });
          }
        } catch (e) {
          this.err(it, `cannot load "${it.path}": ${e.message}`);
          return;
        }
        sym.data = data;
        if (it.records) this.declareRecords(it, sym, name, data, std);
        else this.syms.set(`${name}_SIZE`, { kind: 'constval', name: `${name}_SIZE`, value: w16(data.length), node: it, std });
        if (it.bank !== null) {
          if (typeof it.bank === 'number' && (it.bank < 3 || it.bank > 127)) this.err(it, 'bank must be 3..127 (banks 0-2 are the flat region)');
          if (data.length > 8192 && !it.records) this.err(it, `${it.path} is ${data.length} bytes; a banked asset must fit in one 8 KB bank${it.k === 'strings' ? ' (split the text over several strings files, each in its own bank)' : it.k === 'asset' ? ` (for a table of fixed-size entries, such as levels, write: asset ${name} bank auto records <bytes per entry> = incbin("${it.path}"); and the compiler spreads it over as many banks as it needs)` : ''}`);
        }
        break;
      }
      default: return;
    }
    this.syms.set(name, sym);
  }

  // asset NAME bank auto records R = incbin("file.bin"): R-byte records, as many per bank as fit, spread over consecutive banks.
  // NAME_peek8(i, j), NAME_peek(i, j) and NAME_load(i, dst) read them from anywhere (they switch the bank and put it back).
  declareRecords(it, sym, name, data, std) {
    const R = it.records;
    if (!data.length || data.length % R) { this.err(it, `${it.path} is ${data.length} bytes, which is not a whole number of ${R}-byte records`); return; }
    const per = Math.floor(8192 / R), count = data.length / R, banks = Math.ceil(count / per);
    if (banks > 120) { this.err(it, `${count} records of ${R} bytes need ${banks} banks; the cartridge has 125`); return; }
    sym.records = R; sym.perBank = per; sym.count = count;
    const waste = 8192 - per * R;
    if (banks > 1 && waste >= 1024) this.warnings.push(`${it.file}:${it.line}: ${name}: ${R}-byte records leave ${waste} bytes of every bank unused (${per} fit in 8192). A record size of ${[...Array(R).keys()].map((k) => R - k).find((r) => 8192 % r === 0 || 8192 - Math.floor(8192 / r) * r < 512)} bytes or a divisor of 8192 would pack tighter`);
    const c = (n, v) => this.syms.set(`${name}_${n}`, { kind: 'constval', name: `${name}_${n}`, value: w16(v), node: it, std });
    c('COUNT', count); c('RECORD', R); c('PER_BANK', per);
    const at = `bankof(${name}) + udiv(i, ${per})`, a = `16384 + umod(i, ${per}) * ${R}`;
    this.loadSource([
      `func ${name}_peek8(i, j) { return bank_peek8(${at}, ${a} + j); }`,
      `func ${name}_peek(i, j) { return bank_peek(${at}, ${a} + j); }`,
      `func ${name}_load(i, dst) { var prev = peek8(ROMBANK); select_bank(${at}); copy(dst, ${a}, ${R}); select_bank(prev); return ${R}; }`,
    ].join('\n'), `<records ${name}>`, true);
  }

  // Give every `bank auto` asset a real bank: record tables get consecutive banks of their own, the others are packed together
  // (largest first). Banks that something names explicitly are left alone.
  packAutoBanks() {
    const taken = new Set();
    const autos = [];
    for (const s of this.syms.values()) {
      if (s.kind === 'func' && s.bank != null) taken.add(s.bank);
      else if ((s.kind === 'asset' || s.kind === 'tileset' || s.kind === 'tilemap') && s.node && s.node.bank !== undefined) {
        if (s.bank === 'auto') autos.push(s); else if (typeof s.bank === 'number') taken.add(s.bank);
      }
    }
    if (!autos.length) return;
    const isFree = (b) => b >= 3 && b <= 127 && !taken.has(b);
    const sizeOf = (s) => (s.kind === 'tilemap' ? s.map.width * s.map.height * 2 : s.data.length);
    const fail = (s) => this.err(s.node, 'the cartridge has no free ROM bank left for this (banks 3 to 127 are all in use)');
    for (const s of autos.filter((a) => a.records)) {
      const n = Math.ceil(s.count / s.perBank);
      let first = 3;
      for (; first + n - 1 <= 127; first++) { let ok = true; for (let b = first; b < first + n; b++) if (!isFree(b)) { ok = false; break; } if (ok) break; }
      if (first + n - 1 > 127) { fail(s); continue; }
      for (let b = first; b < first + n; b++) taken.add(b);
      s.bank = first; s.node.bank = first; s.banks = n;
    }
    const bins = [];
    const plain = autos.filter((a) => !a.records).sort((x, y) => sizeOf(y) - sizeOf(x));
    for (const s of plain) {
      const size = sizeOf(s);
      let bin = bins.find((b) => b.room >= size);
      if (!bin) {
        let b = 3; while (b <= 127 && !isFree(b)) b++;
        if (b > 127) { fail(s); continue; }
        taken.add(b); bin = { bank: b, room: 8192 }; bins.push(bin);
      }
      bin.room -= size;
      s.bank = bin.bank; s.node.bank = bin.bank;
      const k = this.syms.get(`${s.name}_BANK`);
      if (k) k.value = bin.bank;
    }
  }

  suggest(name, extra = []) {
    const names = [...this.syms.keys(), ...Object.keys(INTRINSICS), ...extra];
    let best = null, bestD = 3;
    for (const n of names) {
      if (n.startsWith('__')) continue;
      const d = levenshtein(name.toLowerCase(), n.toLowerCase());
      if (d < bestD) { best = n; bestD = d; }
    }
    if (best) return ` Did you mean '${best}'?`;
    // a name like art_hero where the tileset 'art' exists but has no tile called 'hero': list what it does have
    for (const [k, sy] of this.syms) {
      if (sy.kind === 'tileset' && sy.tiles && name.startsWith(k + '_')) return ` The tileset '${k}' has ${sy.tiles.count} tiles; its names are: ${sy.tiles.names.map((n) => n.name).slice(0, 30).join(', ')}${sy.tiles.names.length > 30 ? ', ...' : ''}.`;
    }
    return '';
  }

  // ---- constants ----
  constEval(e, isLocal = () => false, visiting = new Set()) {
    switch (e.k) {
      case 'num': return w16(e.v);
      case 'id': {
        if (isLocal(e.name)) return null;
        const s = this.syms.get(e.name);
        if (!s) return null;
        if (s.kind === 'constval') return s.value;
        if (s.kind !== 'const') return null;
        if (visiting.has(s.name)) this.fail(s.node, `constant '${s.name}' is defined in terms of itself`);
        if (s.value === undefined) {
          visiting.add(s.name);
          const v = this.constEval(s.node.value, () => false, visiting);
          visiting.delete(s.name);
          if (v === null) this.fail(s.node, `constant '${s.name}' must be a compile-time constant (numbers, other constants and operators only)`);
          s.value = v;
        }
        return s.value;
      }
      case 'un': {
        const v = this.constEval(e.e, isLocal, visiting);
        if (v === null) return null;
        return e.op === '-' ? w16(-v) : e.op === '~' ? w16(~v) : v === 0 ? 1 : 0;
      }
      case 'bin': {
        const a = this.constEval(e.l, isLocal, visiting);
        if (a === null) {
          // still allow short-circuit folding where the left side decides
          return null;
        }
        if (e.op === '&&' && a === 0) return 0;
        if (e.op === '||' && a !== 0) return 1;
        const b = this.constEval(e.r, isLocal, visiting);
        if (b === null) return null;
        switch (e.op) {
          case '+': return w16(a + b);
          case '-': return w16(a - b);
          case '*': return w16(Math.imul(a, b));
          case '/': if (b === 0) this.fail(e, 'division by zero in a constant expression'); return w16(Math.trunc(a / b));
          case '%': if (b === 0) this.fail(e, 'modulo by zero in a constant expression'); return w16(a % b);
          case '&': return w16(a & b);
          case '|': return w16(a | b);
          case '^': return w16(a ^ b);
          case '<<': return w16(a << (b & 15));
          case '>>': return w16(a >> (b & 15));
          case '>>>': return w16(u16(a) >>> (b & 15));
          case '==': return a === b ? 1 : 0;
          case '!=': return a !== b ? 1 : 0;
          case '<': return a < b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0;
          case '>': return a > b ? 1 : 0;
          case '>=': return a >= b ? 1 : 0;
          case '&&': return a !== 0 && b !== 0 ? 1 : 0;
          case '||': return a !== 0 || b !== 0 ? 1 : 0;
        }
        return null;
      }
      case 'cond': {
        const c = this.constEval(e.cond, isLocal, visiting);
        if (c === null) return null;
        return this.constEval(c !== 0 ? e.a : e.b, isLocal, visiting);
      }
      case 'call': {
        if (isLocal(e.name)) return null;
        if (e.name === 'rgb' && !this.syms.has('rgb') ) {
          if (e.args.length !== 3) return null;
          const v = e.args.map((a) => this.constEval(a, isLocal, visiting));
          if (v.some((x) => x === null)) return null;
          return w16(((v[0] & 15) << 8) | ((v[1] & 15) << 4) | (v[2] & 15));
        }
        return null;
      }
      default: return null;
    }
  }

  /** Evaluate a tilemap's legend and return its cell data as little-endian words. */
  buildTilemap(sym) {
    const m = sym.map;
    const values = new Map();
    for (const [ch, l] of m.legend) {
      let v;
      try {
        const ast = parse(`const __cell = ${l.expr};`, sym.node.path)[0];
        v = this.constEval(ast.value);
      } catch (e) { throw new CompileError({ file: sym.node.path, line: l.line, col: 1, message: `legend '${ch}': ${e.message.replace(/^[^:]*:\d+:\d+: /, '')}` }); }
      if (v === null) throw new CompileError({ file: sym.node.path, line: l.line, col: 1, message: `legend '${ch}': "${l.expr}" is not a compile-time constant (use numbers and constants such as art_tree)` });
      values.set(ch, u16(v));
    }
    const data = new Uint8Array(m.width * m.height * 2);
    m.rows.forEach((row, y) => { for (let x = 0; x < m.width; x++) { const v = values.get(row[x]); data[(y * m.width + x) * 2] = v & 255; data[(y * m.width + x) * 2 + 1] = v >> 8; } });
    return data;
  }

  strLabel(text) {
    let l = this.strings.get(text);
    if (!l) { l = `s_${this.strings.size}`; this.strings.set(text, l); }
    return l;
  }

  newLabel() { return `L${this.labelN++}`; }
}

// ---- per-function generator ----------------------------------------------------------------------------

class FnGen {
  constructor(ctx, fnNode, std) {
    this.ctx = ctx;
    this.fn = fnNode;
    this.std = std;
    this.lines = [];
    this.scopes = [new Map()];
    this.nLocals = 0;
    this.loops = [];
    this.callees = new Set();
    this.uses = new Set(); // 'v:name' | 's:text' | 't:name' | 'a:name'
    this.helpers = new Set();
    this.pin = null;         // why this function must stay in the always-visible 16 KB (null: it may be moved to a bank)
    this.switches = false;   // calls select_bank()
    // A function reached through a stub (banked, or 'wrap') finds its parameters 4 bytes further up:
    // the stub's return address and the saved bank sit in between.
    this.far = fnNode.bank != null || fnNode.wrap === true;
    const n = fnNode.params.length;
    fnNode.params.forEach((p, i) => {
      if (this.scopes[0].has(p)) ctx.fail(fnNode, `duplicate parameter '${p}'`);
      this.scopes[0].set(p, { kind: 'param', off: (this.far ? 8 : 4) + 2 * (n - 1 - i) });
    });
    this.isLocal = (name) => this.lookupLocal(name) !== null;
  }

  emit(s) { this.lines.push('  ' + s); }
  label(l) { this.lines.push(l + ':'); }

  lookupLocal(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const s = this.scopes[i].get(name);
      if (s) return s;
    }
    return null;
  }

  constOf(e) { return this.ctx.constEval(e, this.isLocal); }

  fpRef(off) { return off < 0 ? `[fp-${-off}]` : `[fp+${off}]`; }

  resolve(e) {
    const loc = this.lookupLocal(e.name);
    if (loc) return loc;
    const s = this.ctx.syms.get(e.name);
    if (!s) this.ctx.fail(e, `unknown name '${e.name}'.${this.ctx.suggest(e.name, [...this.allLocalNames()])}`);
    return s;
  }

  *allLocalNames() { for (const sc of this.scopes) yield* sc.keys(); }

  // Is `e` cheap and side-effect free to load directly into a register?
  isSimple(e) {
    if (e.k === 'num' || e.k === 'str') return true;
    if (e.k === 'id') {
      if (this.constOf(e) !== null) return true;
      const loc = this.lookupLocal(e.name);
      if (loc) return true;
      const s = this.ctx.syms.get(e.name);
      return !!s && s.kind !== 'func';
    }
    return this.constOf(e) !== null;
  }

  loadSimple(reg, e) {
    const c = this.constOf(e);
    if (c !== null) { this.emit(`LDI ${reg}, ${u16(c)}`); return; }
    if (e.k === 'str') { this.use('s:' + e.v); this.emit(`LDI ${reg}, ${this.ctx.strLabel(e.v)}`); return; }
    this.loadId(reg, e);
  }

  use(key) { this.uses.add(key); }

  // Only one bank is visible at a time, so code running in a bank cannot see data in another one.
  checkBank(sym, e) {
    if (sym.bank == null) return;
    const mine = this.fn.bank ?? null;
    if (mine === null) { this.pinTo(`uses '${sym.name}', which is in bank ${sym.bank}`); return; }
    if (sym.bank !== mine) {
      this.ctx.fail(e, `'${sym.name}' is in bank ${sym.bank} but ${this.fn.name}() runs in bank ${mine}, and only one bank is visible at a time. Put them in the same bank, or read '${sym.name}' from a function that is not banked.`);
    }
  }
  pinTo(reason) { if (!this.pin) this.pin = reason; }

  loadId(reg, e) {
    const s = this.resolve(e);
    switch (s.kind) {
      case 'local': case 'param': this.emit(`LDX ${reg}, ${this.fpRef(s.off)}`); return;
      case 'const': case 'constval': this.emit(`LDI ${reg}, ${u16(this.ctx.constEval(e, this.isLocal))}`); return;
      case 'global': this.use('v:' + s.name); this.emit(`LDX ${reg}, [r13+v_${s.name}]`); return;
      case 'array': this.use('v:' + s.name); this.emit(`LDI ${reg}, v_${s.name}`); return;
      case 'table': this.use('t:' + s.name); this.emit(`LDI ${reg}, t_${s.name}`); return;
      case 'asset': case 'tileset': case 'tilemap': this.checkBank(s, e); this.use('a:' + s.name); this.emit(`LDI ${reg}, a_${s.name}`); return;
      case 'func': this.ctx.fail(e, `'${e.name}' is a function; call it as ${e.name}(...)`);
    }
    this.ctx.fail(e, `cannot use '${e.name}' as a value`);
  }

  storeId(e, src = 'r0') { // value in `src` (r0, or r13 which always holds zero)
    const s = this.resolve(e);
    switch (s.kind) {
      case 'local': case 'param': this.emit(`STX ${this.fpRef(s.off)}, ${src}`); return;
      case 'global': this.use('v:' + s.name); this.emit(`STX [r13+v_${s.name}], ${src}`); return;
      case 'const': case 'constval': this.ctx.fail(e, `cannot assign to '${e.name}' because it is a constant`);
      case 'array': this.ctx.fail(e, `cannot assign to the array '${e.name}'; assign to its elements: ${e.name}[i] = ...`);
      case 'table': this.ctx.fail(e, `'${e.name}' is a read-only table`);
      default: this.ctx.fail(e, `cannot assign to '${e.name}'`);
    }
  }

  // ---- expressions: result in r0; r1-r3 are clobbered ----
  genExpr(e) {
    const c = this.constOf(e);
    if (c !== null) { this.emit(`LDI r0, ${u16(c)}`); return; }
    switch (e.k) {
      case 'str': this.loadSimple('r0', e); return;
      case 'id': this.loadId('r0', e); return;
      case 'index': this.genIndexLoad(e); return;
      case 'un': {
        if (e.op === '!') { this.genBoolValue(e); return; }
        this.genExpr(e.e);
        this.emit(e.op === '-' ? 'NEG r0' : 'NOT r0');
        return;
      }
      case 'bin': this.genBin(e); return;
      case 'cond': {
        const Lelse = this.ctx.newLabel(), Lend = this.ctx.newLabel();
        this.cj(e.cond, Lelse, false);
        this.genExpr(e.a);
        this.emit(`JMP ${Lend}`);
        this.label(Lelse);
        this.genExpr(e.b);
        this.label(Lend);
        return;
      }
      case 'call': this.genCall(e); return;
    }
    this.ctx.fail(e, 'internal compiler error: cannot compile this expression');
  }

  indexInfo(e) {
    const s = this.resolve({ name: e.name, line: e.line, col: e.col, file: e.file });
    if (s.kind === 'array') { this.use('v:' + s.name); return { label: `v_${s.name}`, elem: s.node.elem, table: false, sym: s }; }
    if (s.kind === 'table') { this.use('t:' + s.name); return { label: `t_${s.name}`, elem: s.node.elem, table: true, sym: s }; }
    if (s.kind === 'asset' || s.kind === 'tileset') { this.checkBank(s, e); this.use('a:' + s.name); return { label: `a_${s.name}`, elem: 8, table: true, sym: s }; }
    if (s.kind === 'tilemap') { this.checkBank(s, e); this.use('a:' + s.name); return { label: `a_${s.name}`, elem: 16, table: true, sym: s }; }
    this.ctx.fail(e, `'${e.name}' is not an array or table, so it cannot be indexed. For a pointer in a variable use peek(p + i * 2) or peek8(p + i).`);
  }

  genIndexLoad(e) {
    const info = this.indexInfo(e);
    const word = info.elem === 16;
    const ic = this.constOf(e.idx);
    if (ic !== null) {
      this.emit(`${word ? 'LDX' : 'LDBX'} r0, [r13+${info.label}+${u16(ic) * (word ? 2 : 1)}]`);
      return;
    }
    this.genExpr(e.idx);
    if (word) this.emit('SHLI r0, 1');
    this.emit(word ? `LDX r0, [r0+${info.label}]` : `LDBX r0, [r0+${info.label}]`);
  }

  storeIndex(target, src = 'r0') { // value in `src` (r0, or r13 which always holds zero)
    const info = this.indexInfo(target);
    if (info.table) this.ctx.fail(target, `'${target.name}' is read-only (it lives in ROM); copy it to a RAM array first`);
    const word = info.elem === 16;
    const st = word ? 'STX' : 'STBX';
    const ic = this.constOf(target.idx);
    if (ic !== null) {
      this.emit(`${st} [r13+${info.label}+${u16(ic) * (word ? 2 : 1)}], ${src}`);
      return;
    }
    if (this.isSimple(target.idx)) {
      this.loadSimple('r2', target.idx);
      if (word) this.emit('SHLI r2, 1');
      this.emit(`${st} [r2+${info.label}], ${src}`);
      return;
    }
    if (src !== 'r0') {            // nothing to keep in r0 while the index is worked out
      this.genExpr(target.idx);
      if (word) this.emit('SHLI r0, 1');
      this.emit(`${st} [r0+${info.label}], ${src}`);
      return;
    }
    this.emit('PUSH r0');
    this.genExpr(target.idx);
    if (word) this.emit('SHLI r0, 1');
    this.emit('MOV r2, r0');
    this.emit('POP r0');
    this.emit(`${st} [r2+${info.label}], r0`);
  }

  // Put left operand in r0 and right operand in r1.
  genOperands(l, r) {
    if (this.isSimple(r)) { this.genExpr(l); this.loadSimple('r1', r); }
    else if (this.isSimple(l)) { this.genExpr(r); this.emit('MOV r1, r0'); this.loadSimple('r0', l); }
    else {
      this.genExpr(l);
      this.emit('PUSH r0');
      this.genExpr(r);
      this.emit('MOV r1, r0');
      this.emit('POP r0');
    }
  }

  genBin(e) {
    const { op, l, r } = e;
    if (op === '&&' || op === '||' || CMP_OPS.has(op)) { this.genBoolValue(e); return; }
    const rc = this.constOf(r);
    if (rc !== null) {
      this.genExpr(l);
      const k = u16(rc);
      switch (op) {
        case '+': if (k) this.emit(`ADDI r0, ${k}`); return;
        case '-': if (k) this.emit(`ADDI r0, ${u16(-rc)}`); return;
        case '&': this.emit(`ANDI r0, ${k}`); return;
        case '|': this.emit(`ORI r0, ${k}`); return;
        case '^': this.emit(`XORI r0, ${k}`); return;
        case '*': this.emit(`MULI r0, ${k}`); return;
        case '<<': if (k & 15) this.emit(`SHLI r0, ${k & 15}`); return;
        case '>>': if (k & 15) this.emit(`SARI r0, ${k & 15}`); return;
        case '>>>': if (k & 15) this.emit(`SHRI r0, ${k & 15}`); return;
        case '/': this.emit(`LDI r1, ${k}`); this.helpers.add('__sdiv'); this.emit('CALL __sdiv'); return;
        case '%': this.emit(`LDI r1, ${k}`); this.helpers.add('__smod'); this.emit('CALL __smod'); return;
      }
    }
    this.genOperands(l, r);
    switch (op) {
      case '+': this.emit('ADD r0, r1'); return;
      case '-': this.emit('SUB r0, r1'); return;
      case '&': this.emit('AND r0, r1'); return;
      case '|': this.emit('OR r0, r1'); return;
      case '^': this.emit('XOR r0, r1'); return;
      case '*': this.emit('MUL r0, r1'); return;
      case '<<': this.emit('SHL r0, r1'); return;
      case '>>': this.emit('SAR r0, r1'); return;
      case '>>>': this.emit('SHR r0, r1'); return;
      case '/': this.helpers.add('__sdiv'); this.emit('CALL __sdiv'); return;
      case '%': this.helpers.add('__smod'); this.emit('CALL __smod'); return;
    }
    this.ctx.fail(e, `unsupported operator ${op}`);
  }

  genBoolValue(e) {
    const F = this.ctx.newLabel(), E = this.ctx.newLabel();
    this.cj(e, F, false);
    this.emit('LDI r0, 1');
    this.emit(`JMP ${E}`);
    this.label(F);
    this.emit('LDI r0, 0');
    this.label(E);
  }

  // Emit r0/r1 compare for a comparison; returns the comparison key used for jump selection.
  genCmp(op, l, r) {
    if (op === '<' || op === '<=' || op === '>' || op === '>=') {
      for (const side of [l, r]) {
        const c = side.k === 'num' ? side.v : null;
        if (c !== null && c > 32767 && c <= 65535 && !(this.warned || (this.warned = new Set())).has(`${side.file}:${side.line}`)) {
          this.warned.add(`${side.file}:${side.line}`);
          this.ctx.warnings.push(`${side.file}:${side.line}: the constant ${c} is above 32767, so '${op}' sees it as ${c - 65536} (comparisons are signed); use ult()/ugt()/ule()/uge(), or keep the value under 32768`);
        }
      }
    }
    const rc = this.constOf(r);
    if (rc !== null) { this.genExpr(l); this.emit(`CMPI r0, ${u16(rc)}`); return; }
    this.genOperands(l, r);
    this.emit('CMP r0, r1');
  }

  // Jump to `label` if truthiness(e) == sense; otherwise fall through.
  cj(e, label, sense) {
    const c = this.constOf(e);
    if (c !== null) { if ((c !== 0) === sense) this.emit(`JMP ${label}`); return; }
    if (e.k === 'un' && e.op === '!') { this.cj(e.e, label, !sense); return; }
    if (e.k === 'bin' && e.op === '&&') {
      if (!sense) { this.cj(e.l, label, false); this.cj(e.r, label, false); }
      else { const F = this.ctx.newLabel(); this.cj(e.l, F, false); this.cj(e.r, label, true); this.label(F); }
      return;
    }
    if (e.k === 'bin' && e.op === '||') {
      if (sense) { this.cj(e.l, label, true); this.cj(e.r, label, true); }
      else { const T = this.ctx.newLabel(); this.cj(e.l, T, true); this.cj(e.r, label, false); this.label(T); }
      return;
    }
    if (e.k === 'bin' && (e.op === '==' || e.op === '!=') && this.constOf(e.r) === 0) {
      this.genExpr(e.l);
      this.emit('TST r0, r0');
      this.emit(`${(sense ? CMP_TRUE : CMP_FALSE)[e.op]} ${label}`);
      return;
    }
    if (e.k === 'bin' && CMP_OPS.has(e.op)) {
      this.genCmp(e.op, e.l, e.r);
      this.emit(`${(sense ? CMP_TRUE : CMP_FALSE)[e.op]} ${label}`);
      return;
    }
    if (e.k === 'call' && UNSIGNED_CMP.has(e.name) && !this.isLocal(e.name) && !this.shadowed(e.name)) {
      this.checkArity(e, 2);
      this.genCmp(e.name, e.args[0], e.args[1]);
      this.emit(`${(sense ? CMP_TRUE : CMP_FALSE)[e.name]} ${label}`);
      return;
    }
    this.genExpr(e);
    this.emit('TST r0, r0');
    this.emit(`${sense ? 'JNZ' : 'JZ'} ${label}`);
  }

  shadowed(name) { const s = this.ctx.syms.get(name); return !!s && s.kind === 'func' && !s.std; }

  checkArity(e, n) {
    if (e.args.length !== n) this.ctx.fail(e, `${e.name}() takes ${n} argument${n === 1 ? '' : 's'}, but ${e.args.length} ${e.args.length === 1 ? 'was' : 'were'} given`);
  }

  genCall(e) {
    if (e.name === 'asm' && !this.ctx.syms.has('asm')) {
      // Inline assembly: asm("LDI r1, 5\nADD r0, r1"). Registers r0-r3 are scratch; keep r14/r15 intact.
      if (e.args.length !== 1 || e.args[0].k !== 'str') this.ctx.fail(e, 'asm() takes one string literal of assembly text (separate lines with \\n)');
      this.pinTo('contains inline assembly');
      for (const line of e.args[0].v.split('\n')) { if (line.trim()) this.lines.push('  ' + line.trim()); }
      return;
    }
    const user = this.ctx.syms.get(e.name);
    if (user && user.kind === 'func') {
      if (this.isLocal(e.name)) this.ctx.fail(e, `'${e.name}' is a variable, not a function`);
      this.checkArity(e, user.nparams);
      for (const a of e.args) {
        if (this.constOf(a) === 0) this.emit('PUSH r13');
        else { this.genExpr(a); this.emit('PUSH r0'); }
      }
      this.callees.add(e.name);
      this.emit(`CALL f_${e.name}`);
      if (e.args.length === 1) this.emit('POP r3');
      else if (e.args.length) this.emit(`ADDI sp, ${2 * e.args.length}`);
      return;
    }
    if (e.name in INTRINSICS && !user) { this.genIntrinsic(e); return; }
    if (user) this.ctx.fail(e, `'${e.name}' is not a function`);
    this.ctx.fail(e, `unknown function '${e.name}'.${this.ctx.suggest(e.name)}`);
  }

  loadArgsToRegs(args, regs) {
    // Evaluate args left to right into the given registers.
    if (args.every((a) => this.isSimple(a))) {
      args.forEach((a, i) => this.loadSimple(regs[i], a));
      return;
    }
    for (const a of args) { this.genExpr(a); this.emit('PUSH r0'); }
    for (let i = args.length - 1; i >= 0; i--) this.emit(`POP ${regs[i]}`);
  }

  genIntrinsic(e) {
    const name = e.name;
    this.checkArity(e, INTRINSICS[name]);
    const a = e.args;
    switch (name) {
      case 'peek': case 'peek8': {
        const pc = this.constOf(a[0]);
        if (pc !== null) { this.emit(`${name === 'peek' ? 'LDX' : 'LDBX'} r0, [r13+${u16(pc)}]`); return; }
        this.pinTo('reads memory through a computed address (it might point into a bank)');
        this.genExpr(a[0]);
        this.emit(name === 'peek' ? 'LD r0, [r0]' : 'LDB r0, [r0]');
        return;
      }
      case 'poke': case 'poke8': {
        const st = name === 'poke' ? 'ST' : 'STB';
        const ac = this.constOf(a[0]);
        if (ac !== null) {
          if (this.constOf(a[1]) === 0) { this.emit(`${st}X [r13+${u16(ac)}], r13`); return; }
          this.genExpr(a[1]); this.emit(`${st}X [r13+${u16(ac)}], r0`); return;
        }
        if (this.isSimple(a[1])) { this.genExpr(a[0]); this.loadSimple('r1', a[1]); this.emit(`${st} [r0], r1`); return; }
        this.genExpr(a[0]); this.emit('PUSH r0'); this.genExpr(a[1]); this.emit('MOV r1, r0'); this.emit('POP r0');
        this.emit(`${st} [r0], r1`);
        return;
      }
      case 'copy':
        if (this.constOf(a[1]) === null) this.pinTo('copies from a computed address (it might point into a bank)');
        this.loadArgsToRegs(a, ['r0', 'r1', 'r2']); this.emit('MCPY'); return;
      case 'fill': this.loadArgsToRegs(a, ['r0', 'r1', 'r2']); this.emit('MSET'); return;
      case 'rnd': this.emit('RND r0'); return;
      case 'srand': this.loadArgsToRegs(a, ['r0', 'r1']); this.emit('SRND r0, r1'); return;
      case 'select_bank':
        if (this.fn.bank != null) this.ctx.fail(e, `select_bank() cannot be used inside ${this.fn.name}(), which itself runs from bank ${this.fn.bank}: switching banks would pull the code out from under it. Call a function that is not banked to do it.`);
        this.switches = true;
        this.pinTo('calls select_bank()');
        this.genExpr(a[0]); this.emit('STBX [r13+0xB322], r0'); return;
      case 'halt': this.emit('HALT'); return;
      case 'fmul': this.genOperands(a[0], a[1]); this.emit('FMUL r0, r1'); return;
      case 'udiv': this.genOperands(a[0], a[1]); this.emit('DIV r0, r1'); return;
      case 'umod': this.genOperands(a[0], a[1]); this.emit('MOD r0, r1'); return;
      case 'ult': case 'ule': case 'ugt': case 'uge': this.genBoolValue(e); return;
      case 'rgb': this.ctx.fail(e, 'rgb() needs three constant arguments (0-15 each), e.g. rgb(15, 8, 0)'); return;
      case 'bankof': {
        if (a[0].k !== 'id') this.ctx.fail(a[0], 'bankof() takes the name of an asset or tileset');
        const s = this.resolve(a[0]);
        if (s.kind !== 'asset' && s.kind !== 'tileset' && s.kind !== 'tilemap') this.ctx.fail(a[0], `bankof() needs an asset, tileset or tilemap, but '${a[0].name}' is not one`);
        this.use('a:' + s.name);
        this.emit(`LDI r0, bank(a_${s.name})`);
        return;
      }
    }
    this.ctx.fail(e, `internal compiler error: intrinsic ${name}`);
  }

  // ---- statements ----
  genStmt(s) {
    this.lines.push(`  ; ${s.file}:${s.line}`);
    switch (s.k) {
      case 'block': {
        this.scopes.push(new Map());
        for (const x of s.body) this.genStmt(x);
        this.scopes.pop();
        return;
      }
      case 'local': {
        const scope = this.scopes[this.scopes.length - 1];
        if (scope.has(s.name)) this.ctx.fail(s, `'${s.name}' is already declared in this scope`);
        const zero = !s.init || this.constOf(s.init) === 0;
        if (!zero) this.genExpr(s.init);
        const slot = this.nLocals++;
        scope.set(s.name, { kind: 'local', off: -2 * (slot + 1) });
        this.emit(`STX ${this.fpRef(-2 * (slot + 1))}, ${zero ? 'r13' : 'r0'}`);
        return;
      }
      case 'assign': {
        const t = s.target;
        const value = s.op === '=' ? s.value : { k: 'bin', op: s.op.slice(0, -1), l: t, r: s.value, file: s.file, line: s.line, col: s.col };
        if (s.op === '=' && this.constOf(value) === 0) {           // r13 always holds zero
          if (t.k === 'id') this.storeId(t, 'r13'); else this.storeIndex(t, 'r13');
          return;
        }
        this.genExpr(value);
        if (t.k === 'id') this.storeId(t); else this.storeIndex(t);
        return;
      }
      case 'expr': this.genExpr(s.e); return;
      case 'if': {
        const Lelse = this.ctx.newLabel();
        this.cj(s.cond, Lelse, false);
        this.genStmt(s.then);
        if (s.els) {
          const Lend = this.ctx.newLabel();
          this.emit(`JMP ${Lend}`);
          this.label(Lelse);
          this.genStmt(s.els);
          this.label(Lend);
        } else this.label(Lelse);
        return;
      }
      case 'while': {
        const Ltop = this.ctx.newLabel(), Lend = this.ctx.newLabel();
        this.label(Ltop);
        this.cj(s.cond, Lend, false);
        this.loops.push({ brk: Lend, cont: Ltop });
        this.genStmt(s.body);
        this.loops.pop();
        this.emit(`JMP ${Ltop}`);
        this.label(Lend);
        return;
      }
      case 'for': {
        this.scopes.push(new Map());
        if (s.init) this.genStmt(s.init);
        const Ltop = this.ctx.newLabel(), Lstep = this.ctx.newLabel(), Lend = this.ctx.newLabel();
        this.label(Ltop);
        if (s.cond) this.cj(s.cond, Lend, false);
        this.loops.push({ brk: Lend, cont: Lstep });
        this.genStmt(s.body);
        this.loops.pop();
        this.label(Lstep);
        if (s.step) this.genStmt(s.step);
        this.emit(`JMP ${Ltop}`);
        this.label(Lend);
        this.scopes.pop();
        return;
      }
      case 'break':
        if (!this.loops.length) this.ctx.fail(s, "'break' is only valid inside a loop");
        this.emit(`JMP ${this.loops[this.loops.length - 1].brk}`);
        return;
      case 'continue':
        if (!this.loops.length) this.ctx.fail(s, "'continue' is only valid inside a loop");
        this.emit(`JMP ${this.loops[this.loops.length - 1].cont}`);
        return;
      case 'return':
        if (s.e) this.genExpr(s.e);
        this.emit(`JMP f_${this.fn.name}__ret`);
        return;
    }
    this.ctx.fail(s, 'internal compiler error: cannot compile this statement');
  }

  generate() {
    const body = this.fn.body.body;
    this.lines.push(`  ; ${this.fn.file}:${this.fn.line} func ${this.fn.name}`);
    for (const s of body) this.genStmt(s);
    const ret = `  JMP f_${this.fn.name}__ret`;
    let last = this.lines.length - 1;
    while (last >= 0 && /^\s*;/.test(this.lines[last])) last--;
    if (last >= 0 && this.lines[last] === ret) this.lines.splice(last, 1);
    const needsFrame = this.nLocals > 0 || this.fn.params.length > 0 || this.lines.some((l) => !/^\s*;/.test(l) && /\b(fp|r14)\b/.test(l));
    let pro, epi;
    const entryLabel = `${this.fn.bank != null ? 'fb_' : this.fn.wrap ? 'fx_' : 'f_'}${this.fn.name}:`;
    if (needsFrame) {
      pro = [entryLabel, '  PUSH fp', '  MOV fp, sp'];
      if (this.nLocals) pro.push(`  ADDI sp, ${u16(-2 * this.nLocals)}`);
      epi = [`f_${this.fn.name}__ret:`, '  MOV sp, fp', '  POP fp', '  RET'];
    } else {
      pro = [entryLabel];
      epi = [`f_${this.fn.name}__ret:`, '  RET'];
    }
    if (this.fn.bank != null) epi.push(`fbe_${this.fn.name}:`);
    if (this.fn.wrap) epi.push(`fxe_${this.fn.name}:`);
    return { bank: this.fn.bank ?? null, auto: !!this.fn.auto, wrap: !!this.fn.wrap, pin: this.pin, switches: this.switches, name: this.fn.name, lines: [...pro, ...this.lines, ...epi], callees: this.callees, uses: this.uses, helpers: this.helpers, std: this.std, node: this.fn };
  }
}

const RUNTIME = {
  __sdiv: [
    '__sdiv:', '  CLR r3', '  CMPI r0, 0', '  JGE __sdiv_a', '  NEG r0', '  XORI r3, 1', '__sdiv_a:',
    '  CMPI r1, 0', '  JGE __sdiv_b', '  NEG r1', '  XORI r3, 1', '__sdiv_b:', '  DIV r0, r1', '  CMPI r3, 0',
    '  JZ __sdiv_c', '  NEG r0', '__sdiv_c:', '  RET',
  ],
  __smod: [
    '__smod:', '  CLR r3', '  CMPI r0, 0', '  JGE __smod_a', '  NEG r0', '  INC r3', '__smod_a:',
    '  CMPI r1, 0', '  JGE __smod_b', '  NEG r1', '__smod_b:', '  MOD r0, r1', '  CMPI r3, 0',
    '  JZ __smod_c', '  NEG r0', '__smod_c:', '  RET',
  ],
};

function dbLines(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i += 16) out.push('  .db ' + Array.from(bytes.slice(i, i + 16)).join(', '));
  return out;
}

/** Compile VLY source to assembly text. */
export function compile(source, opts = {}) {
  const file = opts.filename || 'main.vly';
  const ctx = new Ctx(opts);
  const errors = ctx.errors;
  const protect = (fn) => {
    try { return fn(); } catch (e) {
      if (e instanceof CompileError) { errors.push(...e.errors); return undefined; }
      throw e;
    }
  };

  if (!opts.nostd) protect(() => ctx.loadSource(STDLIB_SOURCE, '<std>', true));
  protect(() => ctx.loadSource(source, file, false));
  if (errors.length) throw new CompileError(errors);
  protect(() => ctx.packAutoBanks());
  if (errors.length) throw new CompileError(errors);

  const frameSym = ctx.syms.get('frame');
  if (!frameSym || frameSym.kind !== 'func') errors.push({ file, line: 1, col: 1, message: 'missing required function: func frame() { ... } runs once per frame (60 times a second)' });
  else if (frameSym.nparams) ctx.err(frameSym.node, 'frame() takes no parameters');
  const initSym = ctx.syms.get('init');
  if (initSym && (initSym.kind !== 'func' || initSym.nparams)) ctx.err(initSym.node, 'init() must be a function with no parameters');
  if (errors.length) throw new CompileError(errors);

  // Generate every user function (so errors surface even in unused code), plus whatever the std lib needs.
  const queue = [];
  for (const s of ctx.syms.values()) if (s.kind === 'func' && !s.std) queue.push(s.name);
  const done = new Set();
  while (queue.length) {
    const name = queue.shift();
    if (done.has(name)) continue;
    done.add(name);
    const sym = ctx.syms.get(name);
    if (!sym || sym.kind !== 'func') continue;
    protect(() => {
      const g = new FnGen(ctx, sym.node, sym.std);
      const rec = g.generate();
      ctx.generated.set(name, rec);
      for (const c of rec.callees) queue.push(c);
    });
  }
  if (errors.length) throw new CompileError(errors);

  // Reachability from the entry points.
  const reach = new Set();
  const stack = ['frame'];
  if (initSym) stack.push('init');
  while (stack.length) {
    const n = stack.pop();
    if (reach.has(n)) continue;
    reach.add(n);
    for (const c of ctx.generated.get(n).callees) stack.push(c);
  }
  // select_bank() changes what the bank window shows and leaves it that way. That is fine for callers in the
  // always-visible region, but a caller that itself runs from a bank must get its own bank back. So every unbanked
  // function that switches banks (directly or through unbanked callees) and is called from banked code is compiled
  // with two entries: f_name (the choice of bank sticks) and fs_name (the caller's bank is put back).
  {
    const recs = [...reach].map((n) => ctx.generated.get(n));
    const switchers = new Set(recs.filter((r) => r.bank === null && r.switches).map((r) => r.name));
    for (let grew = true; grew;) {
      grew = false;
      for (const r of recs) {
        if (r.bank === null && !switchers.has(r.name) && [...r.callees].some((c) => switchers.has(c))) { switchers.add(r.name); grew = true; }
      }
    }
    const wrap = new Set();
    for (const r of recs) if (r.bank !== null) for (const c of r.callees) if (switchers.has(c)) wrap.add(c);
    for (const n of wrap) {
      const sym = ctx.syms.get(n);
      sym.node.wrap = true;
      protect(() => ctx.generated.set(n, new FnGen(ctx, sym.node, sym.std).generate()));
    }
    if (errors.length) throw new CompileError(errors);
    for (const r of recs) {
      if (r.bank === null) continue;
      r.lines = r.lines.map((l) => { const m = /^  CALL f_(\w+)$/.exec(l); return m && wrap.has(m[1]) ? `  CALL fs_${m[1]}` : l; });
    }
  }
  const warnings = [...ctx.warnings];
  for (const [n, rec] of ctx.generated) {
    if (!rec.std && !reach.has(n)) warnings.push(`${rec.node.file}:${rec.node.line}: function '${n}' is never called, so it is not included in the cartridge`);
  }

  // Collect what the reachable code uses.
  const usedGlobals = new Set(), usedTables = new Set(), usedAssets = new Set(), usedStrings = new Set(), helpers = new Set();
  for (const n of reach) {
    const rec = ctx.generated.get(n);
    for (const u of rec.uses) {
      const [kind, ...rest] = u.split(':');
      const v = rest.join(':');
      if (kind === 'v') usedGlobals.add(v); else if (kind === 't') usedTables.add(v);
      else if (kind === 'a') usedAssets.add(v); else usedStrings.add(v);
    }
    for (const h of rec.helpers) helpers.add(h);
  }

  // Entry routine: initialize referenced globals, then call init().
  const entry = ['__entry_init:', '  LDI r13, 0'];
  const entryErrors = [];
  const entryUsesStrings = [];
  for (const name of usedGlobals) {
    const s = ctx.syms.get(name);
    if (s.kind !== 'global' || !s.node.init) continue;
    const init = s.node.init;
    try {
      const c = ctx.constEval(init);
      if (c !== null) entry.push(`  LDI r0, ${u16(c)}`);
      else if (init.k === 'str') { entry.push(`  LDI r0, ${ctx.strLabel(init.v)}`); entryUsesStrings.push(init.v); }
      else ctx.fail(init, `the initial value of global '${name}' must be a constant or a string; assign other values inside init()`);
      entry.push(`  STX [r13+v_${name}], r0`);
    } catch (e) { if (e instanceof CompileError) entryErrors.push(...e.errors); else throw e; }
  }
  if (entryErrors.length) throw new CompileError(entryErrors);
  for (const s of entryUsesStrings) usedStrings.add(s);
  if (initSym) entry.push('  CALL f_init');
  entry.push('  RET');

  // RAM layout.
  let ram = RAM_START;
  const ramDefs = [];
  const ramMap = {};
  for (const name of usedGlobals) {
    const s = ctx.syms.get(name);
    let size;
    if (s.kind === 'global') size = 2;
    else if (s.kind === 'array') {
      let n;
      try { n = ctx.constEval(s.node.size); } catch (e) { if (e instanceof CompileError) throw e; throw e; }
      if (n === null) ctx.fail(s.node, `the size of array '${name}' must be a constant`);
      if (n <= 0) ctx.fail(s.node, `array '${name}' needs a positive size`);
      size = s.node.elem === 16 ? n * 2 : n;
      size += size & 1;
    } else continue;
    ramDefs.push(`v_${name} = ${ram}`);
    ramMap[name] = { addr: ram, bytes: size, type: s.kind === 'global' ? 'word' : s.node.elem === 16 ? 'word[]' : 'byte[]' };
    ram += size;
  }
  if (ram > RAM_LIMIT) {
    throw new CompileError({ file, line: 1, col: 1, message: `out of RAM: globals and arrays need ${ram - RAM_START} bytes but only ${RAM_LIMIT - RAM_START} are available (the rest is reserved for the stack)` });
  }

  // Assemble the output text.
  const out = ['; generated by the vly compiler', '; r13 always holds zero: globals are reached as [r13+address]', '.header __entry_init, __entry_frame', ...ramDefs, ...entry, '__entry_frame:', '  LDI r13, 0', '  JMP f_frame'];
  const order = [...ctx.generated.keys()].filter((n) => reach.has(n));
  const bankedFns = [];
  for (const n of order) {
    const rec = ctx.generated.get(n);
    if (rec.bank === null && rec.wrap) {
      // two entries around one body (see the note on select_bank above); both leave the same frame layout
      out.push(`f_${n}:`, '  PUSH r13', `  CALL fx_${n}`, '  POP r3', '  RET',
        `fs_${n}:`, '  LDBX r3, [r13+0xB322]', '  PUSH r3', `  CALL fx_${n}`, '  POP r3', '  STBX [r13+0xB322], r3', '  RET',
        ...rec.lines);
      continue;
    }
    if (rec.bank === null) { out.push(...rec.lines); continue; }
    bankedFns.push(rec);
    // far call: remember the bank that is showing, switch, call, switch back (r0 carries the result through)
    out.push(`f_${n}:`, '  LDBX r3, [r13+0xB322]', '  PUSH r3', `  LDI r3, ${rec.bank}`, '  STBX [r13+0xB322], r3',
      `  CALL fb_${n}`, '  POP r3', '  STBX [r13+0xB322], r3', '  RET');
  }
  out.push('__code_end:');
  for (const h of helpers) out.push(...RUNTIME[h]);
  out.push('__data_start:');

  for (const text of usedStrings) {
    const bytes = [];
    for (const ch of text) { const c = ch.charCodeAt(0); if (c > 255) throw new CompileError({ file, line: 1, col: 1, message: `string ${JSON.stringify(text)} contains a character outside 0-255` }); bytes.push(c); }
    bytes.push(0);
    out.push(`${ctx.strLabel(text)}:`, ...dbLines(bytes));
  }
  for (const name of usedTables) {
    const s = ctx.syms.get(name);
    out.push(`t_${name}:`);
    const vals = [];
    for (const v of s.node.values) {
      if (v.k === 'str' && s.node.elem === 16) { vals.push(ctx.strLabel(v.v)); usedStrings.add(v.v); continue; }
      const c = ctx.constEval(v);
      if (c === null) ctx.fail(v, 'table entries must be constants (numbers, constants, or strings in word tables)');
      vals.push(String(s.node.elem === 16 ? u16(c) : (c & 255)));
    }
    for (let i = 0; i < vals.length; i += 8) out.push(`  .${s.node.elem === 16 ? 'dw' : 'db'} ${vals.slice(i, i + 8).join(', ')}`);
    if (!vals.length) out.push('  .db 0');
  }
  // strings introduced by table entries
  const emitted = new Set(usedStrings);
  for (const [text, label] of ctx.strings) {
    if (out.includes(`${label}:`)) continue;
    const bytes = [...text].map((c) => c.charCodeAt(0)); bytes.push(0);
    out.push(`${label}:`, ...dbLines(bytes));
  }

  const flat = [], banked = [];
  for (const name of usedAssets) {
    const s = ctx.syms.get(name);
    if (s.kind === 'tilemap' && !s.data) s.data = ctx.buildTilemap(s);
    (s.bank === null ? flat : banked).push(s);
  }
  for (const s of flat) out.push(`a_${s.name}:`, ...dbLines(s.data));
  out.push('__flat_end:');
  // a record table is cut into one piece per bank (as many whole records as fit)
  const placed = banked.flatMap((s) => {
    if (!s.records) return [{ bank: s.bank, label: `a_${s.name}`, data: s.data }];
    const step = s.perBank * s.records;
    return Array.from({ length: s.banks }, (_, i) => ({ bank: s.bank + i, label: i === 0 ? `a_${s.name}` : null, data: s.data.subarray(i * step, Math.min((i + 1) * step, s.data.length)) }));
  });
  const bankNums = [...new Set([...placed.map((x) => x.bank), ...bankedFns.map((x) => x.bank)])].sort((x, y) => x - y);
  for (const b of bankNums) {
    out.push(`.bank ${b}`, `__bank_${b}:`);
    for (const rec of bankedFns) if (rec.bank === b) out.push(...rec.lines);
    for (const a of placed) if (a.bank === b) out.push(...(a.label ? [`${a.label}:`] : []), ...dbLines(a.data));
    out.push(`__bank_${b}_end:`);
  }

  const reachRecs = order.map((n) => ctx.generated.get(n));
  const stats = {
    // Does anything ever change the bank window? If not, the first 24 KB behave as one flat region.
    usesBanks: bankedFns.length > 0 || banked.length > 0 || reachRecs.some((r) => r.switches),
    fnMeta: Object.fromEntries(reachRecs.map((r) => [r.name, { std: !!r.std, pin: r.pin, bank: r.bank, auto: r.auto }])),
    ramUsed: ram - RAM_START,
    functions: order.map((n) => n),
    unused: warnings.length,
    globals: [...usedGlobals],
    ram: ramMap,
    assets: [...flat, ...banked].map((a) => ({ name: a.name, kind: a.kind, bytes: a.data.length, bank: a.bank, ...(a.records ? { banks: a.banks, records: a.count } : {}) })),
  };
  return { asm: out.join('\n') + '\n', warnings, stats };
}
