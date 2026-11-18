import test from 'node:test';
import assert from 'node:assert/strict';
import { compileToCartridge, CompileError } from '../src/lang/index.js';
import { Machine } from '../src/core/index.js';
import * as C from '../src/core/constants.js';

/** Compile and run `src` for N frames; `get(name, i)` reads global word `name[i]`. */
function run(src, { frames = 1, files = {}, input = 0 } = {}) {
  const readFile = (p) => { if (p in files) return files[p]; throw new Error('missing ' + p); };
  const r = compileToCartridge(src, { filename: 't.vly', readFile });
  const saves = [];
  const m = new Machine(r.bytes, { onSave: (b) => saves.push(b) });
  for (let i = 0; i < frames; i++) m.runFrame(typeof input === 'function' ? input(i) : input);
  const get = (name, i = 0) => m.read16(r.symbols['v_' + name].value + 2 * i);
  const gets = (name, i = 0) => (get(name, i) << 16) >> 16;
  return { m, r, get, gets, saves };
}
const compileErr = (src, opts = {}) => {
  try { compileToCartridge(src, { filename: 't.vly', readFile: () => { throw new Error('no files'); }, ...opts }); } catch (e) { return e; }
  assert.fail('expected a compile error');
};

test('arithmetic, precedence and signed division', () => {
  const { gets, get } = run(`
    var out[16];
    func frame() {
      out[0] = 2 + 3 * 4;
      out[1] = (1 << 4) | 3;
      out[2] = -7 / 2;
      out[3] = -7 % 3;
      out[4] = 7 % -3;
      out[5] = udiv(65535, 10);
      out[6] = 100 - 250;
      out[7] = ~0;
      out[8] = 0x1234 >> 4;
      out[9] = -16 >> 2;
      out[10] = -16 >>> 12;
      out[11] = 300 * 300;
      var a = 17; var b = 5;
      out[12] = a / b;
      out[13] = a % b;
      out[14] = (0 - a) / b;
      out[15] = fmul(0x0180, 0x0200);
    }`);
  assert.equal(gets('out', 0), 14);
  assert.equal(gets('out', 1), 19);
  assert.equal(gets('out', 2), -3);
  assert.equal(gets('out', 3), -1);
  assert.equal(gets('out', 4), 1);
  assert.equal(get('out', 5), 6553);
  assert.equal(gets('out', 6), -150);
  assert.equal(get('out', 7), 0xffff);
  assert.equal(get('out', 8), 0x123);
  assert.equal(gets('out', 9), -4);
  assert.equal(get('out', 10), 15);
  assert.equal(get('out', 11), (300 * 300) & 0xffff);
  assert.equal(gets('out', 12), 3);
  assert.equal(gets('out', 13), 2);
  assert.equal(gets('out', 14), -3);
  assert.equal(get('out', 15), 0x300);
});

test('comparisons are signed; ult/ugt are unsigned', () => {
  const { get } = run(`
    var out[10];
    func frame() {
      var neg = -1; var one = 1;
      out[0] = neg < one;
      out[1] = ult(neg, one);
      out[2] = ugt(neg, one);
      out[3] = neg >= one;
      out[4] = one == 1;
      out[5] = one != 1;
      out[6] = 5 <= 5;
      out[7] = 3 > 4;
      out[8] = !one;
      out[9] = !0;
    }`);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => get('out', i)), [1, 0, 1, 0, 1, 0, 1, 0, 0, 1]);
});

test('&& and || short-circuit and yield 0/1', () => {
  const { get } = run(`
    var out[6];
    var calls;
    func bump() { calls++; return 1; }
    func zero() { calls++; return 0; }
    func frame() {
      out[0] = zero() && bump();
      out[1] = bump() || bump();
      out[2] = 5 && 7;
      out[3] = 0 || 9;
      out[4] = calls;
      if (zero() || bump() && !zero()) { out[5] = 1; }
    }`);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => get('out', i)), [0, 1, 1, 1, 2, 1]);
});

test('loops: while, for, break, continue, nested scopes', () => {
  const { get } = run(`
    var out[4];
    func frame() {
      var sum = 0;
      for (var i = 0; i < 10; i++) {
        if (i % 2 == 0) { continue; }
        if (i > 7) { break; }
        sum += i;
      }
      out[0] = sum;               // 1+3+5+7 = 16
      var n = 0; var k = 5;
      while (k > 0) { n = n + k; k--; }
      out[1] = n;                 // 15
      var x = 1;
      { var x2 = 2; x = x + x2; }
      out[2] = x;
      var t = 0;
      for (var a = 0; a < 3; a++) { for (var b = 0; b < 3; b++) { t++; } }
      out[3] = t;
    }`);
  assert.deepEqual([0, 1, 2, 3].map((i) => get('out', i)), [16, 15, 3, 9]);
});

test('recursion, many parameters, parameter assignment', () => {
  const { get } = run(`
    var out[4];
    func fact(n) { if (n <= 1) { return 1; } return n * fact(n - 1); }
    func fib(n) { if (n < 2) { return n; } return fib(n - 1) + fib(n - 2); }
    func six(a, b, c, d, e, f) { return a + b * 2 + c * 3 + d * 4 + e * 5 + f * 6; }
    func bump(p) { p = p + 1; return p; }
    func frame() {
      out[0] = fact(5);
      out[1] = fib(10);
      out[2] = six(1, 1, 1, 1, 1, 1);
      var v = 10;
      out[3] = bump(v) + v;
    }`);
  assert.equal(get('out', 0), 120);
  assert.equal(get('out', 1), 55);
  assert.equal(get('out', 2), 21);
  assert.equal(get('out', 3), 21);
});

test('arrays, byte arrays, compound assignment, expressions as indexes', () => {
  const { get, m, r } = run(`
    var out[8];
    byte bytes[4];
    var words[4];
    func frame() {
      var i = 1;
      bytes[0] = 0x1FF;          // stored as 0xFF
      bytes[i] = 7;
      bytes[i + 1] = bytes[0] + 1;
      words[i * 2] = 1000;
      words[3] += 5;
      words[3] *= 3;
      out[0] = bytes[0];
      out[1] = bytes[1];
      out[2] = bytes[2];
      out[3] = words[2];
      out[4] = words[3];
      words[1] = 1; words[1] <<= 4; words[1] |= 3;
      out[5] = words[1];
      i = 0;
      while (i < 4) { words[i] = words[i] + i; i++; }
      out[6] = words[0] + words[1] + words[2] + words[3];
    }`);
  assert.equal(get('out', 0), 0xff);
  assert.equal(get('out', 1), 7);
  assert.equal(get('out', 2), 0, 'bytes[2] = 0xFF + 1 stores the low byte, 0');
  assert.equal(get('out', 3), 1000);
  assert.equal(get('out', 4), 15);
  assert.equal(get('out', 5), 19);
  assert.equal(get('out', 6), 1040);
});

test('tables, strings, globals with initial values', () => {
  const { get } = run(`
    var out[6];
    var counter = 5;
    var big = 0xB000;
    table nums = { 10, 20, 30, 40 };
    btable bs = { 1, 2, 3 };
    table names = { "ab", "cde" };
    func strlen(s) { var n = 0; while (peek8(s + n) != 0) { n++; } return n; }
    func frame() {
      out[0] = nums[0] + nums[3];
      out[1] = bs[2];
      out[2] = strlen("hello");
      out[3] = strlen(names[1]);
      out[4] = counter + big;
      out[5] = peek8("A") ;
      counter++;
    }`, { frames: 2 });
  assert.equal(get('out', 0), 50);
  assert.equal(get('out', 1), 3);
  assert.equal(get('out', 2), 5);
  assert.equal(get('out', 3), 3);
  assert.equal(get('out', 4), 6 + 0xb000);
  assert.equal(get('out', 5), 65);
});

test('ternary, constants, constant folding', () => {
  const { get } = run(`
    const A = 3;
    const B = A * 4 + 1;
    const C = B > 10 ? 100 : 200;
    var out[4];
    func frame() {
      var x = 5;
      out[0] = x > 3 ? 1 : 2;
      out[1] = B;
      out[2] = C;
      out[3] = (A << 2) + (rgb(15, 0, 15) >> 8);
    }`);
  assert.deepEqual([0, 1, 2, 3].map((i) => get('out', i)), [1, 13, 100, 12 + 15]);
});

test('standard library: math, sin/cos, print_u/print_i render text', () => {
  const { get, gets, m } = run(`
    var out[10];
    func init() { load_font(0); lcd(LCD_BG); }
    func frame() {
      out[0] = min(3, 9);
      out[1] = max(3, 9);
      out[2] = clamp(50, 0, 10);
      out[3] = abs(-12);
      out[4] = sign(-9);
      out[5] = sin(0);
      out[6] = sin(64);
      out[7] = cos(0);
      out[8] = sin(192);
      out[9] = rand(10) < 10;
      print_u(0, 0, 12345);
      print_i(0, 1, -307);
    }`);
  assert.deepEqual([0, 1, 2, 3].map((i) => get('out', i)), [3, 9, 10, 12]);
  assert.equal(gets('out', 4), -1);
  assert.equal(get('out', 5), 0);
  assert.equal(get('out', 6), 256);
  assert.equal(get('out', 7), 256);
  assert.equal(gets('out', 8), -256);
  assert.equal(get('out', 9), 1);
  const cell = (col, row) => m.read16(C.BG_MAP + 2 * (row * 32 + col)) & 0x1ff;
  const text = (row, n) => Array.from({ length: n }, (_, i) => String.fromCharCode(cell(i, row) + 32)).join('');
  assert.equal(text(0, 5), '12345');
  assert.equal(text(1, 4), '-307');
});

test('put_text handles newlines and the text palette', () => {
  const { m } = run(`
    func init() { load_font(10); text_pal = 3; text(2, 2, "A\\nB"); }
    func frame() {}`);
  const a = m.read16(C.BG_MAP + 2 * (2 * 32 + 2));
  const b = m.read16(C.BG_MAP + 2 * (3 * 32 + 2));
  assert.equal(a & 0x1ff, 10 + ('A'.charCodeAt(0) - 32));
  assert.equal(a >> 12, 3);
  assert.equal(b & 0x1ff, 10 + ('B'.charCodeAt(0) - 32));
});

test('save helpers: set, seal, validate, commit', () => {
  const { m, saves, get } = run(`
    var out[2];
    func frame() {
      save_set(0, 0xBEEF);
      save_seal();
      out[0] = save_valid();
      save_set8(5, 99);
      out[1] = save_valid();
      save_commit();
    }`);
  assert.equal(m.status & C.ST_OVERRUN, 0);
  assert.equal(m.lastCycles < C.CYCLES_PER_FRAME, true, `used ${m.lastCycles} cycles`);
  assert.equal(saves.length, 1);
  assert.equal(saves[0][0], 0xef);
  assert.equal(get('out', 0), 1, 'valid right after sealing');
  assert.equal(get('out', 1), 0, 'invalid after a later change');
});

test('assets: flat incbin, banked asset with select_bank, tilesets with named constants', () => {
  const files = {
    'blob.bin': new Uint8Array([9, 8, 7, 6]),
    'big.bin': new Uint8Array([0xA5, 0x5A]),
    'art.tiles': `tile grass:\n  ........\n  ........\n  ........\n  ........\n  ........\n  ........\n  ........\n  ........\ntile rock:\n  33333333\n  3......3\n  3......3\n  3......3\n  3......3\n  3......3\n  3......3\n  33333333\n`,
  };
  const { get } = run(`
    asset blob = incbin("blob.bin");
    asset big bank 5 = incbin("big.bin");
    tileset art = "art.tiles";
    var out[6];
    func frame() {
      out[0] = blob[2];
      select_bank(bankof(big));
      out[1] = peek8(big);
      out[2] = peek8(big + 1);
      out[3] = art_rock;
      out[4] = art_COUNT;
      out[5] = blob_SIZE + art_SIZE;
      load_tiles(art, 7, art_COUNT);
    }`, { files });
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => get('out', i)), [7, 0xa5, 0x5a, 1, 2, 4 + 32]);
});

test('unused functions and globals are removed from the cartridge', () => {
  const a = compileToCartridge('func frame() {}');
  const b = compileToCartridge('var big[2000]; func unused() { big[3] = 1; } func frame() {}', { filename: 't.vly' });
  assert.equal(a.bytes.length, b.bytes.length);
  assert.ok(b.warnings.some((w) => /unused/.test(w) && /never called/.test(w)));
  assert.equal(b.stats.ramUsed, 0);
  assert.ok(a.bytes.length < 80, `empty program is tiny (${a.bytes.length} bytes)`);
});

test('user code can override standard library functions', () => {
  const { get } = run(`
    var out[1];
    func abs(v) { return 4242; }
    func frame() { out[0] = abs(-5); }`);
  assert.equal(get('out'), 4242);
});

test('imports', () => {
  const { get } = run(`
    import "lib.vly";
    var out[1];
    func frame() { out[0] = triple(7); }`, { files: { 'lib.vly': 'func triple(x) { return x * 3; }' } });
  assert.equal(get('out'), 21);
});

test('errors: messages include file, line, column and hints', () => {
  const cases = [
    ['func frame() { x = 1; }', /unknown name 'x'/],
    ['func frame() { var counter = 1; cuonter = 2; }', /Did you mean 'counter'/],
    ['func frame() { foo(); }', /unknown function 'foo'/],
    ['func frame() { sprit(0,0,0,0,0); }', /Did you mean 'sprite'/],
    ['func frame() { sprite(1); }', /sprite\(\) takes 5 arguments, but 1 was given/],
    ['const K = 1; func frame() { K = 2; }', /cannot assign to 'K' because it is a constant/],
    ['func frame() { break; }', /only valid inside a loop/],
    ['func other() {}', /missing required function: func frame/],
    ['func frame() { var a = 1; var a = 2; }', /already declared/],
    ['func frame() { var a = 1 }', /expected ';'/],
    ['func frame() { 1 + 2; }', /no effect/],
    ['table t = {1,2}; func frame() { t[0] = 3; }', /read-only/],
    ['var a[2]; func frame() { a = 3; }', /cannot assign to the array/],
    ['func frame() { var p = 1; p[0] = 2; }', /not an array or table/],
    ['var x; var x; func frame() {}', /already defined/],
    ['func frame() { var z = rgb(1, 2); }', /takes 3 arguments/],
    ['func frame() { return 1 / 0; }', /division by zero/],
    ['func f(a, a) {} func frame() {}', /duplicate parameter/],
    ['func frame() { if (1) { }', /missing '}'/],
    ['var a = 70000; func frame() {}', /does not fit in 16 bits/],
    ['var a = f(); func f() { return 1; } func frame() { a = a + 1; }', /constant or a string/],
    ['func frame() { var s = "x"; var n = s + ; }', /unexpected ';'/],
  ];
  for (const [src, re] of cases) {
    const e = compileErr(src);
    assert.ok(e instanceof CompileError, `${src} -> ${e.message}`);
    assert.match(e.message, re, src);
    assert.match(e.message, /^t\.vly:\d+:\d+:|^generated|<std>/, `has location: ${e.message}`);
  }
});

test('multiple errors in different functions are reported together', () => {
  const e = compileErr('func a() { nope1(); }\nfunc b() { nope2(); }\nfunc frame() {}');
  assert.equal(e.errors.length, 2);
  assert.equal(e.errors[1].line, 2);
});

test('flat region overflow gives a helpful error', () => {
  const big = new Uint8Array(25000);
  const e = compileErr('asset huge = incbin("h.bin"); func frame() { poke8(0xB400, huge[0]); }', { readFile: () => big });
  assert.match(e.message, /must always be visible takes \d+ bytes, but that region is 16384/);
  assert.match(e.message, /unbanked assets \(250\d\d bytes here\)/);
  assert.match(e.message, /Move art and maps to a bank/);
});

test('runs within the cycle budget: a sprite loop over all 64 sprites', () => {
  const { m } = run(`
    func init() { lcd(LCD_OBJ); }
    func frame() {
      for (var i = 0; i < 64; i++) { sprite(i, i * 2, i, 1, 0); }
    }`, { frames: 3 });
  assert.ok(m.lastCycles < C.CYCLES_PER_FRAME / 2, `used ${m.lastCycles} cycles`);
  assert.equal(m.status & C.ST_OVERRUN, 0);
});

test('inline asm statements', () => {
  const { get } = run(`
    var out[2];
    func frame() {
      var a = 5;
      asm("LDI r1, 7\\nLDX r0, [fp-2]\\nADD r0, r1");
      out[0] = a;
      poke(0xB500, 1);
      asm("LDI r2, 0xB500\\nLD r0, [r2]\\nINC r0\\nST [r2], r0");
      out[1] = peek(0xB500);
    }`);
  assert.equal(get('out', 0), 5);
  assert.equal(get('out', 1), 2);
  const e = compileErr('func frame() { asm(5); }');
  assert.match(e.message, /string literal/);
});

const TILE_A = 'tile a:\n' + '  1.......\n' + '  ........\n'.repeat(7);

test('banked functions: far calls pass arguments and results, recurse, cross banks and restore the bank', () => {
  const { get, r } = run(`
    tileset art bank 3 = "art.tiles";
    var out[8];
    func far_add(a, b) bank 4 { var c = a + b; return c * 2; }
    func far_fact(n) bank 4 { if (n <= 1) { return 1; } return n * far_fact(n - 1); }
    func far_none() bank 5 { out[3] = far_add(1, 2) + 100; }
    func far_art() bank 3 { return peek8(art); }
    func three(a, b, c) bank 6 { return a * 100 + b * 10 + c; }
    func init() {
      out[0] = far_add(3, 4);
      out[1] = far_fact(6);
      far_none();
      out[2] = peek8(ROMBANK);
      select_bank(bankof(art));
      out[4] = far_art();
      out[5] = peek8(ROMBANK);
      out[6] = three(1, 2, 3);
    }
    func frame() { out[7] = far_add(out[7], 1); }`, { frames: 3, files: { 'art.tiles': TILE_A } });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((i) => get('out', i)), [14, 720, 2, 106, 0x40, 3, 123]);
  assert.equal(get('out', 7), 14, 'three frames of out = (out + 1) * 2');
  assert.ok(r.stats.functionBytes.far_fact > 20, 'banked bodies are measured');
  assert.ok(r.stats.bankBytes['4'] > 40 && r.stats.bankBytes['4'] < 300, JSON.stringify(r.stats.bankBytes));
  assert.ok(r.bytes.length > 6 * 8192, 'the image reaches bank 6');
});

test('banked functions: mistakes are compile errors that say what to do', () => {
  const files = { 'art.tiles': TILE_A };
  const readFile = (p) => files[p];
  let e = compileErr('tileset art bank 3 = "art.tiles"; func f() bank 4 { return peek8(art); } func frame() { f(); }', { readFile });
  assert.match(e.message, /'art' is in bank 3 but f\(\) runs in bank 4/);
  e = compileErr('func f() bank 4 { select_bank(5); } func frame() { f(); }');
  assert.match(e.message, /select_bank\(\) cannot be used inside f\(\)/);
  e = compileErr('func frame() bank 4 { }');
  assert.match(e.message, /frame\(\) is an entry point/);
  e = compileErr('func f() bank 2 { } func frame() { f(); }');
  assert.match(e.message, /bank must be 3\.\.127/);
  e = compileErr('func f() bank { } func frame() { f(); }');
  assert.match(e.message, /bank needs a number/);
  // a bank that is too full names the bank and its functions
  const body = Array.from({ length: 700 }, (_, i) => `x = x * 3 + ${i}; y = y ^ x;`).join('\n');
  e = compileErr(`var x; var y; func big() bank 4 { ${body} } func frame() { big(); }`);
  assert.match(e.message, /bank 4 holds \d+ bytes, but a bank is 8192/);
  assert.match(e.message, /big \d+/);
  // one function that is bigger than a bank cannot be placed anywhere: the error says to split it
  e = compileErr(`var x; var y; func big() { ${body} ${body} } func frame() { big(); }`);
  assert.match(e.message, /must always be visible takes \d+ bytes, but that region is 16384/);
  assert.match(e.message, /big \d+ \(bigger than one 8192-byte bank: split it/);
  // the same is explained when banked assets are present (it used to be an internal error)
  e = compileErr(`tileset art bank 3 = "art.tiles"; var x; var y; func big() { ${body} ${body} } func frame() { big(); load_tiles(art, 100, 1); }`, { readFile });
  assert.match(e.message, /must always be visible takes \d+ bytes/);
  assert.match(e.message, /frame \d+ \(uses 'art', which is in bank 3\)/);
});

test('big programs: the compiler spreads code over banks by itself and calls still work', () => {
  // 40 functions of about 1 KB each: 40 KB of code, far more than the 16 KB that is always visible
  const fns = Array.from({ length: 40 }, (_, i) => `func work${i}(a) { var t = a; ${Array.from({ length: 34 }, (_, k) => `t = t * 3 + ${i + k}; acc = acc ^ t;`).join(' ')} return t + ${i}; }`).join('\n');
  const calls = Array.from({ length: 40 }, (_, i) => `sum = sum + work${i}(${i});`).join(' ');
  const src = `var acc; var sum; var bank_after;\n${fns}\nfunc frame() { sum = 0; acc = 0; ${calls} bank_after = peek8(ROMBANK); }`;
  const { r, get } = run(src, { frames: 2 });
  assert.ok(r.stats.flatBytes <= 16384, `always-visible part is ${r.stats.flatBytes}`);
  assert.equal(r.stats.flatLimit, 16384);
  const moved = Object.entries(r.stats.autoBanked);
  assert.ok(moved.length >= 25, `moved ${moved.length} functions`);
  assert.ok(new Set(moved.map(([, b]) => b)).size >= 4, 'more than one bank was needed');
  for (const v of Object.values(r.stats.bankBytes)) assert.ok(v <= 8192);
  // the same arithmetic done in JavaScript
  let acc = 0, sum = 0;
  for (let i = 0; i < 40; i++) { let t = i; for (let k = 0; k < 34; k++) { t = (t * 3 + i + k) & 0xffff; acc ^= t; } sum = (sum + t + i) & 0xffff; }
  assert.equal(get('sum'), sum);
  assert.equal(get('acc'), acc);
  assert.equal(get('bank_after'), 2, 'the bank window is back where it started');
  // small programs are untouched: no stubs, one flat region
  const small = compileToCartridge('var a; func frame() { a++; }', { filename: 't.vly' });
  assert.deepEqual(small.stats.autoBanked, {});
  assert.equal(small.stats.flatLimit, 24576);
});

test('bank switching is safe from banked code: select_bank sticks for flat callers and is undone for banked ones', () => {
  const files = { 'a.tiles': TILE_A, 'b.tiles': TILE_A.replace('1.......', '3.......') };
  const { get } = run(`
    tileset art_a bank 3 = "a.tiles";
    tileset art_b bank 5 = "b.tiles";
    var out[8];
    func use_a() { select_bank(bankof(art_a)); return peek8(art_a); }      // leaves bank 3 showing
    func use_b() { select_bank(bankof(art_b)); return peek8(art_b); }
    func helper(x) { return use_b() + x; }                                 // switches banks through a callee
    func far(n) bank 4 { var v = helper(n); return v + use_a() + 1000; }   // must survive both switches
    func init() {
      out[0] = use_a();
      out[1] = peek8(ROMBANK);       // 3: the choice sticks for a flat caller
      out[2] = far(7);
      out[3] = peek8(ROMBANK);       // still 3: far() got its own bank back each time, then ours came back
      out[4] = helper(1);
      out[5] = peek8(ROMBANK);       // 5: helper called from flat code leaves bank 5 showing
    }
    func frame() { }`, { files });
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => get('out', i)), [0x40, 3, 0xc0 + 7 + 0x40 + 1000, 3, 0xc0 + 1, 5]);
});

test('code size: globals go through the zero register, zero stores and frameless functions are compact', () => {
  const r = compileToCartridge(`
    var a; var b; var arr[4];
    func bump() { a = a + 1; }
    func clear() { a = 0; arr[2] = 0; b = 0; }
    func frame() { bump(); clear(); if (a == 0) { b = arr[1]; } }`, { filename: 't.vly' });
  assert.match(r.asm, /LDX r0, \[r13\+v_a\]/);
  assert.match(r.asm, /STX \[r13\+v_a\], r13/, 'storing zero needs no load');
  assert.match(r.asm, /STX \[r13\+v_arr\+4\], r13/);
  assert.match(r.asm, /TST r0, r0/);
  assert.doesNotMatch(r.asm, /f_bump:\n\s+PUSH fp/, 'no frame for a function without parameters or locals');
  assert.ok(r.stats.functionBytes.bump <= 14, `bump is ${r.stats.functionBytes.bump} bytes`);
  assert.ok(r.stats.functionBytes.clear <= 14, `clear is ${r.stats.functionBytes.clear} bytes`);
  // r13 is zero even if a previous routine left something else in it
  const { get } = run(`var x = 7; var seen; func init() { asm("LDI r13, 99"); } func frame() { seen = x; x = 0; }`, { frames: 1 });
  assert.equal(get('seen'), 7);
  assert.equal(get('x'), 0);
});
