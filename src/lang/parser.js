// Recursive-descent parser for the VLY language. Produces a plain-object AST.

import { lex, CompileError } from './lexer.js';

// Binary operator precedence (higher binds tighter).
const PREC = {
  '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5,
  '==': 6, '!=': 6, '<': 7, '<=': 7, '>': 7, '>=': 7,
  '<<': 8, '>>': 8, '>>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
};
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);

export function parse(src, file) {
  const toks = lex(src, file);
  const lines = src.split(/\r?\n/);
  let p = 0;

  const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
  const err = (tok, message) => { throw new CompileError({ file: tok.file, line: tok.line, col: tok.col, message, text: lines[tok.line - 1] }); };
  const isOp = (v) => peek().t === 'op' && peek().v === v;
  const isKw = (v) => peek().t === 'kw' && peek().v === v;
  const eatOp = (v) => { if (isOp(v)) { return toks[p++]; } return null; };
  const expectOp = (v, what) => {
    if (!isOp(v)) err(peek(), `expected '${v}'${what ? ' ' + what : ''}, found '${peek().v}'`);
    return toks[p++];
  };
  const expectKw = (v) => { if (!isKw(v)) err(peek(), `expected '${v}', found '${peek().v}'`); return toks[p++]; };
  const expectId = (what) => {
    if (peek().t !== 'id') err(peek(), `expected ${what || 'a name'}, found '${peek().v}'`);
    return toks[p++];
  };
  const pos = (t) => ({ file: t.file, line: t.line, col: t.col });

  // ---- expressions ----
  function parseExpr(minPrec = 0) {
    let left = parseTernary();
    return left;
  }

  function parseTernary() {
    const cond = parseBinary(1);
    if (isOp('?')) {
      const t = toks[p++];
      const a = parseExpr();
      expectOp(':', 'in ?: expression');
      const b = parseTernary();
      return { k: 'cond', cond, a, b, ...pos(t) };
    }
    return cond;
  }

  function parseBinary(minPrec) {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t.t !== 'op' || !(t.v in PREC) || PREC[t.v] < minPrec) return left;
      p++;
      const right = parseBinary(PREC[t.v] + 1);
      left = { k: 'bin', op: t.v, l: left, r: right, ...pos(t) };
    }
  }

  function parseUnary() {
    const t = peek();
    if (t.t === 'op' && (t.v === '-' || t.v === '~' || t.v === '!')) {
      p++;
      return { k: 'un', op: t.v, e: parseUnary(), ...pos(t) };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let e = parsePrimary();
    for (;;) {
      if (isOp('(')) {
        const t = toks[p++];
        if (e.k !== 'id') err(t, 'only named functions can be called');
        const args = [];
        if (!isOp(')')) {
          do { args.push(parseExpr()); } while (eatOp(','));
        }
        expectOp(')', 'to close the argument list');
        e = { k: 'call', name: e.name, args, ...pos(t), line: e.line, col: e.col, file: e.file };
      } else if (isOp('[')) {
        const t = toks[p++];
        const idx = parseExpr();
        expectOp(']', 'to close the index');
        if (e.k !== 'id') err(t, 'only arrays and tables can be indexed');
        e = { k: 'index', name: e.name, idx, ...pos(t), line: e.line, col: e.col, file: e.file };
      } else return e;
    }
  }

  function parsePrimary() {
    const t = peek();
    if (t.t === 'num') { p++; return { k: 'num', v: t.v, ...pos(t) }; }
    if (t.t === 'str') { p++; return { k: 'str', v: t.v, ...pos(t) }; }
    if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) { p++; return { k: 'num', v: t.v === 'true' ? 1 : 0, ...pos(t) }; }
    if (t.t === 'id') { p++; return { k: 'id', name: t.v, ...pos(t) }; }
    if (t.t === 'op' && t.v === '(') {
      p++;
      const e = parseExpr();
      expectOp(')');
      return e;
    }
    err(t, t.t === 'eof' ? 'unexpected end of file in expression' : `unexpected '${t.v}' in expression`);
  }

  // ---- statements ----
  function parseBlock() {
    const open = expectOp('{');
    const body = [];
    while (!isOp('}')) {
      if (peek().t === 'eof') err(open, "missing '}' for this block");
      body.push(parseStatement());
    }
    p++;
    return { k: 'block', body, ...pos(open) };
  }

  function parseSimpleStatement(allowVar = true) {
    // var decl, assignment, ++/--, or call. No trailing semicolon consumed.
    const t = peek();
    if (t.t === 'kw' && t.v === 'var') {
      if (!allowVar) err(t, "'var' is not allowed here");
      p++;
      const name = expectId('a variable name');
      let init = null;
      if (eatOp('=')) init = parseExpr();
      return { k: 'local', name: name.v, init, ...pos(name) };
    }
    const e = parseExpr();
    if (peek().t === 'op' && ASSIGN_OPS.has(peek().v)) {
      const opTok = toks[p++];
      if (e.k !== 'id' && e.k !== 'index') err(opTok, 'the left side of an assignment must be a variable or array element');
      const value = parseExpr();
      return { k: 'assign', op: opTok.v, target: e, value, ...pos(opTok) };
    }
    if (isOp('++') || isOp('--')) {
      const opTok = toks[p++];
      if (e.k !== 'id' && e.k !== 'index') err(opTok, `'${opTok.v}' needs a variable or array element`);
      return { k: 'assign', op: opTok.v === '++' ? '+=' : '-=', target: e, value: { k: 'num', v: 1, ...pos(opTok) }, ...pos(opTok) };
    }
    if (e.k !== 'call') err(t, 'this expression has no effect; statements must be assignments or calls');
    return { k: 'expr', e, ...pos(t) };
  }

  function parseStatement() {
    const t = peek();
    if (isOp('{')) return parseBlock();
    if (isOp(';')) { p++; return { k: 'block', body: [], ...pos(t) }; }
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': {
          p++;
          expectOp('(', 'after "if"');
          const cond = parseExpr();
          expectOp(')');
          const then = parseStatement();
          let els = null;
          if (isKw('else')) { p++; els = parseStatement(); }
          return { k: 'if', cond, then, els, ...pos(t) };
        }
        case 'while': {
          p++;
          expectOp('(', 'after "while"');
          const cond = parseExpr();
          expectOp(')');
          return { k: 'while', cond, body: parseStatement(), ...pos(t) };
        }
        case 'for': {
          p++;
          expectOp('(', 'after "for"');
          let init = null, cond = null, step = null;
          if (!isOp(';')) init = parseSimpleStatement();
          expectOp(';', 'after the for-loop initializer');
          if (!isOp(';')) cond = parseExpr();
          expectOp(';', 'after the for-loop condition');
          if (!isOp(')')) step = parseSimpleStatement(false);
          expectOp(')');
          return { k: 'for', init, cond, step, body: parseStatement(), ...pos(t) };
        }
        case 'break': p++; expectOp(';'); return { k: 'break', ...pos(t) };
        case 'continue': p++; expectOp(';'); return { k: 'continue', ...pos(t) };
        case 'return': {
          p++;
          let e = null;
          if (!isOp(';')) e = parseExpr();
          expectOp(';', 'after return');
          return { k: 'return', e, ...pos(t) };
        }
        case 'var': {
          const s = parseSimpleStatement();
          expectOp(';', 'after the declaration');
          return s;
        }
        default: err(t, `unexpected '${t.v}' here`);
      }
    }
    const s = parseSimpleStatement();
    expectOp(';', 'at the end of the statement');
    return s;
  }

  // ---- top level ----
  function parseTop() {
    const items = [];
    while (peek().t !== 'eof') {
      const t = peek();
      if (t.t !== 'kw') err(t, `expected a declaration (func, var, byte, const, table, btable, asset, tileset, tilemap, import), found '${t.v}'`);
      switch (t.v) {
        case 'import': {
          p++;
          const s = peek();
          if (s.t !== 'str') err(s, 'import needs a quoted file name');
          p++;
          expectOp(';');
          items.push({ k: 'import', path: s.v, ...pos(t) });
          break;
        }
        case 'const': {
          p++;
          const name = expectId('a constant name');
          expectOp('=');
          const value = parseExpr();
          expectOp(';');
          items.push({ k: 'const', name: name.v, value, ...pos(name) });
          break;
        }
        case 'var': case 'byte': {
          p++;
          const name = expectId('a variable name');
          if (isOp('[')) {
            p++;
            const size = parseExpr();
            expectOp(']');
            expectOp(';');
            items.push({ k: 'array', elem: t.v === 'byte' ? 8 : 16, name: name.v, size, ...pos(name) });
          } else {
            if (t.v === 'byte') err(name, "'byte' declares arrays only (e.g. byte buf[16];); plain variables use 'var'");
            let init = null;
            if (eatOp('=')) init = parseExpr();
            expectOp(';');
            items.push({ k: 'global', name: name.v, init, ...pos(name) });
          }
          break;
        }
        case 'table': case 'btable': {
          p++;
          const name = expectId('a table name');
          expectOp('=');
          expectOp('{');
          const values = [];
          if (!isOp('}')) {
            do { if (isOp('}')) break; values.push(parseExpr()); } while (eatOp(','));
          }
          expectOp('}');
          expectOp(';');
          items.push({ k: 'table', elem: t.v === 'btable' ? 8 : 16, name: name.v, values, ...pos(name) });
          break;
        }
        case 'asset': case 'tileset': case 'tilemap': case 'strings': {
          p++;
          const name = expectId('a name');
          let bank = null, records = null;
          if (isKw('bank')) {
            p++;
            const b = peek();
            if (b.t === 'id' && b.v === 'auto') { bank = 'auto'; p++; }            // the compiler picks the bank (packs the assets of the program together)
            else if (b.t === 'num') { bank = b.v; p++; }
            else err(b, 'bank needs a number (3..127), or the word auto to let the compiler choose');
          }
          if (peek().t === 'id' && peek().v === 'records') {                       // asset NAME bank auto records 240 = incbin("levels.bin"): a table of fixed-size records spread over banks
            const rw = peek();
            if (t.v !== 'asset') err(rw, 'records N works with an asset: asset levels bank auto records 240 = incbin("levels.bin");');
            p++;
            const n = peek();
            if (n.t !== 'num' || n.v < 1 || n.v > 8192) err(n, 'records needs the size of one record in bytes (1 to 8192), for example: records 240');
            p++;
            records = n.v;
            if (bank === null) bank = 'auto';
            else if (bank !== 'auto') err(rw, 'records chooses its own banks: write bank auto records N, or leave bank out');
          }
          expectOp('=');
          let path;
          if (t.v === 'asset') {
            const fn = expectId('incbin');
            if (fn.v !== 'incbin') err(fn, 'asset values look like: incbin("file.bin")');
            expectOp('(');
            const s = peek();
            if (s.t !== 'str') err(s, 'incbin needs a quoted file name');
            p++;
            expectOp(')');
            path = s.v;
          } else {
            const s = peek();
            if (s.t !== 'str') err(s, `${t.v} needs a quoted ${t.v === 'tilemap' ? '.map' : t.v === 'strings' ? '.txt' : '.tiles'} file name`);
            p++;
            path = s.v;
          }
          expectOp(';');
          items.push({ k: t.v, name: name.v, bank, ...(records ? { records } : {}), path, ...pos(name) });
          break;
        }
        case 'func': {
          p++;
          const name = expectId('a function name');
          expectOp('(');
          const params = [];
          if (!isOp(')')) {
            do { params.push(expectId('a parameter name').v); } while (eatOp(','));
          }
          expectOp(')');
          let bank = null;                       // func name(args) bank 4 { ... } puts the code in ROM bank 4
          if (isKw('bank')) {
            p++;
            const b = peek();
            if (b.t !== 'num') err(b, 'bank needs a number (3..127)');
            p++;
            bank = b.v;
          }
          if (!isOp('{')) err(peek(), "expected '{' to start the function body");
          const body = parseBlock();
          items.push({ k: 'func', name: name.v, params, bank, body, ...pos(name) });
          break;
        }
        default:
          err(t, `unexpected '${t.v}' at the top level`);
      }
    }
    return items;
  }

  return parseTop();
}
