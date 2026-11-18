import test from 'node:test';
import assert from 'node:assert/strict';
import { compileToCartridge } from '../src/lang/index.js';
import { Machine } from '../src/core/index.js';

// Compiler fuzzing: random expressions are compiled and run, and the result is compared with an independent
// reference evaluator implementing the language's documented 16-bit semantics.

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const s16 = (v) => (v << 16) >> 16;
const u16 = (v) => v & 0xffff;

function genExpr(rnd, depth, vars) {
  const R = (n) => Math.floor(rnd() * n);
  if (depth <= 0 || rnd() < 0.18) {
    if (rnd() < 0.5) { const v = vars[R(vars.length)]; return { src: v.name, val: v.val }; }
    const lit = rnd() < 0.5 ? R(40) : [0, 1, 2, 15, 16, 255, 256, 0x7fff, 0x8000, 0xffff, 1234, 40000][R(12)];
    return { src: String(lit), val: s16(lit) };
  }
  const k = R(14);
  if (k === 0) { const a = genExpr(rnd, depth - 1, vars); return { src: `(-${wrap(a.src)})`, val: s16(-a.val) }; }
  if (k === 1) { const a = genExpr(rnd, depth - 1, vars); return { src: `(~${wrap(a.src)})`, val: s16(~a.val) }; }
  if (k === 2) { const a = genExpr(rnd, depth - 1, vars); return { src: `(!${wrap(a.src)})`, val: a.val === 0 ? 1 : 0 }; }
  if (k === 3) {
    const c = genExpr(rnd, depth - 1, vars), a = genExpr(rnd, depth - 1, vars), b = genExpr(rnd, depth - 1, vars);
    return { src: `(${c.src} ? ${a.src} : ${b.src})`, val: c.val !== 0 ? a.val : b.val };
  }
  const a = genExpr(rnd, depth - 1, vars), b = genExpr(rnd, depth - 1, vars);
  const ops = ['+', '-', '*', '&', '|', '^', '<<', '>>', '>>>', '/', '%', '==', '!=', '<', '<=', '>', '>=', '&&', '||'];
  const op = ops[R(ops.length)];
  let val;
  let right = b;
  if (op === '/' || op === '%') { right = { src: `(${b.src} | 1)`, val: s16(b.val | 1) }; } // never divide by zero
  switch (op) {
    case '+': val = s16(a.val + b.val); break;
    case '-': val = s16(a.val - b.val); break;
    case '*': val = s16(Math.imul(a.val, b.val)); break;
    case '&': val = s16(a.val & b.val); break;
    case '|': val = s16(a.val | b.val); break;
    case '^': val = s16(a.val ^ b.val); break;
    case '<<': val = s16(a.val << (b.val & 15)); break;
    case '>>': val = s16(a.val >> (b.val & 15)); break;
    case '>>>': val = s16(u16(a.val) >>> (b.val & 15)); break;
    case '/': val = s16(Math.trunc(a.val / right.val)); break;
    case '%': val = s16(a.val % right.val); break;
    case '==': val = a.val === b.val ? 1 : 0; break;
    case '!=': val = a.val !== b.val ? 1 : 0; break;
    case '<': val = a.val < b.val ? 1 : 0; break;
    case '<=': val = a.val <= b.val ? 1 : 0; break;
    case '>': val = a.val > b.val ? 1 : 0; break;
    case '>=': val = a.val >= b.val ? 1 : 0; break;
    case '&&': val = a.val !== 0 && b.val !== 0 ? 1 : 0; break;
    case '||': val = a.val !== 0 || b.val !== 0 ? 1 : 0; break;
  }
  return { src: `(${a.src} ${op} ${right.src})`, val };
}
const wrap = (s) => (s.startsWith('(') ? s : `(${s})`);

test('compiler fuzz: 400 random expressions agree with the reference evaluator', () => {
  const rnd = mulberry32(20260101);
  const R = (n) => Math.floor(rnd() * n);
  const N = 400, PER = 8; // 8 expressions per cartridge, 50 cartridges
  for (let batch = 0; batch < N / PER; batch++) {
    const vars = ['a', 'b', 'c', 'd'].map((name) => ({ name, val: s16([0, 1, 2, 3, 7, 100, 255, 0x7fff, 0x8000, 0xffff, 12345, 54321][R(12)] ?? R(65536)) }));
    const exprs = Array.from({ length: PER }, () => genExpr(rnd, 1 + R(4), vars));
    const src = `var out[${PER}];\nfunc frame() {\n${vars.map((v) => `  var ${v.name} = ${u16(v.val)};`).join('\n')}\n${exprs.map((e, i) => `  out[${i}] = ${e.src};`).join('\n')}\n}\n`;
    let r;
    try { r = compileToCartridge(src); } catch (e) { assert.fail(`compile error: ${e.message}\n${src}`); }
    const m = new Machine(r.bytes);
    m.runFrame(0);
    assert.equal(m.status & 0xf, 0, `faults while running\n${src}`);
    const base = r.symbols.v_out.value;
    exprs.forEach((e, i) => {
      const got = s16(m.read16(base + 2 * i));
      assert.equal(got, e.val, `expression ${e.src}\n  with ${vars.map((v) => `${v.name}=${v.val}`).join(' ')}\n  expected ${e.val}, got ${got}\n${src}`);
    });
  }
});

test('compiler fuzz: random statements (loops, ifs, arrays) agree with a JS model', () => {
  const rnd = mulberry32(777);
  const R = (n) => Math.floor(rnd() * n);
  for (let t = 0; t < 40; t++) {
    const n = 3 + R(20), step = 1 + R(4), mod = 2 + R(7), thr = R(15);
    const src = `var out[4];\nvar arr[32];\nfunc frame() {\n  var sum = 0; var cnt = 0;\n  for (var i = 0; i < ${n}; i += ${step}) {\n    arr[i] = i * ${mod} - ${thr};\n    if (i % ${mod} == 0) { continue; }\n    if (arr[i] > ${thr}) { sum += arr[i]; } else { sum -= i; }\n    cnt++;\n    if (cnt > 12) { break; }\n  }\n  out[0] = sum; out[1] = cnt;\n  var j = ${n}; var w = 0;\n  while (j > 0) { w = w ^ (j << 1); j = j - ${step}; }\n  out[2] = w;\n}\n`;
    let sum = 0, cnt = 0; const arr = [];
    for (let i = 0; i < n; i += step) { arr[i] = i * mod - thr; if (i % mod === 0) continue; if (arr[i] > thr) sum += arr[i]; else sum -= i; cnt++; if (cnt > 12) break; }
    let w = 0; for (let j = n; j > 0; j -= step) w = s16(w ^ s16(j << 1));
    const r = compileToCartridge(src);
    const m = new Machine(r.bytes);
    m.runFrame(0);
    const b = r.symbols.v_out.value;
    assert.equal(s16(m.read16(b)), s16(sum), `sum\n${src}`);
    assert.equal(m.read16(b + 2), cnt, `cnt\n${src}`);
    assert.equal(s16(m.read16(b + 4)), w, `w\n${src}`);
  }
});
