// Lexer for the VLY language (.vly). See docs/language.md.

export class CompileError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(list.map((e) => `${e.file}:${e.line}:${e.col}: ${e.message}${e.text ? `\n    ${e.text.trim()}` : ''}`).join('\n'));
    this.name = 'CompileError';
    this.errors = list;
  }
}

export const KEYWORDS = new Set([
  'func', 'var', 'byte', 'const', 'table', 'btable', 'asset', 'tileset', 'tilemap', 'strings', 'import', 'bank',
  'if', 'else', 'while', 'for', 'break', 'continue', 'return', 'true', 'false',
]);

const PUNCT = [
  '<<=', '>>=', '>>>', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '++', '--',
  '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '<', '>', '=', '(', ')', '{', '}', '[', ']', ',', ';', '?', ':',
];

const ESC = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34 };

/** @returns {Array<{t: 'num'|'id'|'kw'|'str'|'op'|'eof', v: any, line: number, col: number, file: string}>} */
export function lex(src, file) {
  const toks = [];
  const lines = src.split(/\r?\n/);
  const fail = (line, col, message) => { throw new CompileError({ file, line, col, message, text: lines[line - 1] }); };
  let i = 0, line = 1, lineStart = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === '\n') { line++; i++; lineStart = i; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
    if (ch === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') {
      const startLine = line, startCol = i - lineStart + 1;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') { line++; lineStart = i + 1; } i++; }
      if (i >= n) fail(startLine, startCol, 'unterminated /* comment');
      i += 2;
      continue;
    }
    const col = i - lineStart + 1;
    const tok = (t, v, len) => { toks.push({ t, v, line, col, file }); i += len; };
    if (/[0-9]/.test(ch)) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|[0-9][0-9_]*)/.exec(src.slice(i, i + 40));
      const s = m[0].replace(/_/g, '');
      const v = /^0[xX]/.test(s) ? parseInt(s.slice(2), 16) : /^0[bB]/.test(s) ? parseInt(s.slice(2), 2) : parseInt(s, 10);
      if (v > 65535) fail(line, col, `number ${m[0]} does not fit in 16 bits`);
      tok('num', v, m[0].length);
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i, i + 80));
      tok(KEYWORDS.has(m[0]) ? 'kw' : 'id', m[0], m[0].length);
      continue;
    }
    if (ch === "'") {
      const m = /^'(\\.|[^\\'\n])'/.exec(src.slice(i, i + 6));
      if (!m) fail(line, col, 'bad character literal (use e.g. \'A\' or \'\\n\')');
      const c = m[1];
      let v;
      if (c[0] === '\\') { v = ESC[c[1]]; if (v === undefined) fail(line, col, `unknown escape \\${c[1]}`); } else v = c.charCodeAt(0);
      tok('num', v, m[0].length);
      continue;
    }
    if (ch === '"') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\n') fail(line, col, 'unterminated string');
        if (src[j] === '\\') {
          const e = ESC[src[j + 1]];
          if (e === undefined) fail(line, col, `unknown escape \\${src[j + 1]}`);
          s += String.fromCharCode(e); j += 2;
        } else { s += src[j]; j++; }
      }
      if (j >= n) fail(line, col, 'unterminated string');
      tok('str', s, j + 1 - i);
      continue;
    }
    const p = PUNCT.find((q) => src.startsWith(q, i));
    if (!p) fail(line, col, `unexpected character '${ch}'`);
    tok('op', p, p.length);
  }
  toks.push({ t: 'eof', v: '<end of file>', line, col: i - lineStart + 1, file });
  return toks;
}
