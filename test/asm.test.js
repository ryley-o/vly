import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, disassemble, decode, AsmError, addressOf, bankOf } from '../src/asm/index.js';
import { OPS, formHasImm } from '../src/core/index.js';

test('every instruction assembles and disassembles back to the same text', () => {
  const samples = {
    none: '', hw: '', rd: 'r3', rs: 'r4', 'rd,rs': 'r1, r2', 'rd,imm': 'r5, 0x1234', 'rd,n': 'r6, 7', imm: '0x4321',
    'rd,[rs]': 'r1, [r2]', '[rd],rs': '[r3], r4', 'rd,[rs+imm]': 'r1, [r2+0x0010]', '[rd+imm],rs': '[r3+0x0020], r4',
  };
  for (const op of OPS) {
    const args = samples[op.form];
    const src = `${op.name} ${args}`.trim();
    const { bytes } = assemble(src);
    assert.equal(bytes.length, formHasImm(op.form) ? 4 : 2, src);
    assert.equal(bytes[0], op.op, src);
    const d = decode(bytes, 0);
    const norm = (s) => s.toLowerCase().replace(/0x0+([0-9a-f])/g, '0x$1').replace(/\s+/g, ' ');
    assert.equal(norm(d.text), norm(src), `round trip of ${src}`);
  }
});

test('labels, forward references and expressions', () => {
  const { bytes, symbols } = assemble(`
    JMP end
    LDI r0, table + 2
    LDI r1, (1 << 4) | 3
    LDI r2, 'A'
    LDI r3, lo(0x1234)
    LDI r4, hi(0x1234)
    LDI r5, $
end:
    RET
table: .dw 1, 2, 3
  `);
  assert.equal(symbols.end.addr, 28, 'end label address');
  const dv = new DataView(bytes.buffer);
  assert.equal(dv.getUint16(2, true), symbols.end.addr);
  assert.equal(dv.getUint16(6, true), symbols.table.addr + 2);
  assert.equal(dv.getUint16(10, true), 19);
  assert.equal(dv.getUint16(14, true), 65);
  assert.equal(dv.getUint16(18, true), 0x34);
  assert.equal(dv.getUint16(22, true), 0x12);
  assert.equal(dv.getUint16(26, true), 24, '$ is the current address');
});

test('constants, forward-referenced constants and directives', () => {
  const { bytes } = assemble(`
    SIZE = later - start
start: .db 1, 2, "ab", 0x7F
    .asciz "hi\\n"
    .ds 2, 0xEE
    .align 4
    .dw SIZE
later:
  `);
  assert.deepEqual(Array.from(bytes.slice(0, 5)), [1, 2, 97, 98, 0x7f]);
  assert.deepEqual(Array.from(bytes.slice(5, 9)), [104, 105, 10, 0]);
  assert.deepEqual(Array.from(bytes.slice(9, 11)), [0xee, 0xee]);
  assert.equal(bytes.length, 14);
  assert.equal(bytes[12] | (bytes[13] << 8), 14);
});

test('pseudo instructions', () => {
  const { bytes } = assemble('INC r1\nDEC r2\nCLR r3\nSUBI r4, 5');
  assert.equal(disassemble(bytes).join('\n').replace(/ +/g, ' ').includes('ADDI r4, 0xFFFB'), true);
  assert.equal(bytes[1], 0x10 | 0); // INC r1 -> ADDI r1 (rs unused)
});

test('.org, .bank and address mapping', () => {
  const { bytes, symbols } = assemble(`
a: .db 1
.org 16384
b: .db 2
.bank 3
c: .db 3
.bank 5
d: .db 4
  `);
  assert.equal(symbols.a.addr, 0);
  assert.equal(symbols.b.addr, 16384);
  assert.equal(symbols.b.bank, 2);
  assert.equal(symbols.c.addr, 0x4000);
  assert.equal(symbols.c.bank, 3);
  assert.equal(symbols.d.addr, 0x4000);
  assert.equal(symbols.d.bank, 5);
  assert.equal(bytes[16384], 2);
  assert.equal(bytes[3 * 8192], 3);
  assert.equal(bytes[5 * 8192], 4);
  assert.equal(addressOf(24575), 24575);
  assert.equal(addressOf(24576), 0x4000);
  assert.equal(bankOf(100), 0);
  assert.equal(bankOf(20000), 2);
});

test('bank() and offset() expressions', () => {
  const { bytes } = assemble(`
 LDI r0, bank(tiles)
 LDI r1, tiles
.bank 7
tiles: .db 9
  `);
  assert.equal(bytes[2], 7);
  assert.equal(bytes[6] | (bytes[7] << 8), 0x4000);
});

test('.include and .incbin through readFile', () => {
  const files = { 'a.inc': 'LDI r0, 5\n', 'blob.bin': new Uint8Array([7, 8, 9]) };
  const readFile = (p) => files[p] ?? (() => { throw new Error('missing'); })();
  const { bytes } = assemble('.include "a.inc"\n.incbin "blob.bin", 1, 2', { readFile });
  assert.deepEqual(Array.from(bytes), [0x03, 0x00, 5, 0, 8, 9]);
});

test('error messages carry file, line and a helpful hint', () => {
  const cases = [
    ['FOO r1', /unknown instruction 'FOO'/],
    ['LDI r1', /LDI takes 2 operands/],
    ['LDI r99, 1', /expected a register/],
    ['LDI r1, 0x12345', /does not fit in 16 bits/],
    ['LD r1, [r2+4]', /use the X form/],
    ['JMP nowhere', /undefined symbol 'nowhere'/],
    ['x: .db 1\nx: .db 2', /already defined/],
    ['SHLI r1, 16', /0\.\.15/],
    ['.db 300', /does not fit in 8 bits/],
    ['.bank 1', /fixed area/],
  ];
  for (const [src, re] of cases) {
    assert.throws(() => assemble(src, { filename: 't.asm' }), (e) => e instanceof AsmError && re.test(e.message) && /t\.asm:\d+:/.test(e.message), src);
  }
});

test('errors are collected, not just the first', () => {
  try {
    assemble('FOO\nBAR\nLDI r1, 1');
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof AsmError);
    assert.equal(e.errors.length, 2);
    assert.equal(e.errors[1].line, 2);
  }
});

test('an instruction may not straddle a bank boundary above the flat region', () => {
  assert.throws(() => assemble('.org 24574\nLDI r0, 1'), /straddles/);
});
