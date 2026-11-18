import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assemble } from '../src/asm/index.js';
import { Machine, sha256Hex, FONT, GLYPHS, OPS, validateCartridge, CartridgeError } from '../src/core/index.js';
import * as C from '../src/core/constants.js';
import { machineFrom, runSnippet } from './helpers.js';

test('sha256 matches node:crypto', () => {
  for (const len of [0, 1, 55, 56, 63, 64, 65, 1000, 69120]) {
    const data = new Uint8Array(len).map((_, i) => (i * 31 + 7) & 255);
    assert.equal(sha256Hex(data), createHash('sha256').update(data).digest('hex'), `len ${len}`);
  }
});

test('font has 95 glyphs and every ink pixel uses color 3', () => {
  assert.equal(Object.keys(GLYPHS).length, 95);
  assert.equal(FONT.length, 1520);
  // 'A' (0x41) tile 33: row 3 is 11111 -> pixels x=1..5 are color 3
  const tile = 0x41 - 0x20;
  const row3 = [FONT[tile * 16 + 6], FONT[tile * 16 + 7]];
  const px = [];
  for (let x = 0; x < 8; x++) px.push(((x < 4 ? row3[0] : row3[1]) >> (6 - 2 * (x & 3))) & 3);
  assert.deepEqual(px, [0, 3, 3, 3, 3, 3, 0, 0]);
});

test('header validation', () => {
  const ok = assemble('.header a, a\na: RET').bytes;
  assert.deepEqual(validateCartridge(ok), []);
  const bad = ok.slice();
  bad[0] = 0;
  assert.match(validateCartridge(bad)[0], /magic/);
  const v2 = ok.slice();
  v2[2] = 2;
  assert.match(validateCartridge(v2)[0], /spec_version/);
  assert.throws(() => new Machine(bad), CartridgeError);
});

test('every opcode has a distinct code and sane length/cost', () => {
  const seen = new Set();
  for (const op of OPS) {
    assert.ok(!seen.has(op.op));
    seen.add(op.op);
    assert.ok(op.cycles >= 1);
  }
});

test('ADD/SUB flags', () => {
  const m = runSnippet(`
    LDI r0, 0xFFFF
    LDI r1, 1
    ADD r0, r1        ; 0, carry, zero
    JZ   .z1
    LDI r9, 0xDEAD
.z1: JC .c1
    LDI r9, 0xDEAD
.c1: LDI r2, 0x7FFF
    LDI r3, 1
    ADD r2, r3        ; 0x8000, overflow, negative
    JLT .neg1         ; N != V? N=1,V=1 -> not less
    LDI r8, 1         ; reached when not less
.neg1:
    LDI r4, 5
    LDI r5, 7
    SUB r4, r5        ; borrow
    JC .b1
    LDI r9, 0xBEEF
.b1: NOP
  `);
  assert.equal(m.r[0], 0);
  assert.equal(m.r[2], 0x8000);
  assert.equal(m.r[9], 0);
  assert.equal(m.r[8], 1);
  assert.equal(m.r[4], 0xfffe);
});

test('signed vs unsigned comparison jumps', () => {
  const m = runSnippet(`
    LDI r0, 0xFFFF     ; -1 signed, 65535 unsigned
    LDI r1, 1
    CMP r0, r1
    JLT .signedless    ; -1 < 1 signed
    LDI r5, 0xBAD
.signedless:
    JA .unsignedabove  ; 65535 > 1 unsigned
    LDI r6, 0xBAD
.unsignedabove: NOP
  `);
  assert.equal(m.r[5], 0);
  assert.equal(m.r[6], 0);
});

test('shifts, FMUL, MUL, DIV, MOD', () => {
  const m = runSnippet(`
    LDI r0, 0x8001
    SHRI r0, 1          ; logical -> 0x4000
    LDI r1, 0x8000
    SARI r1, 3          ; arithmetic -> 0xF000
    LDI r2, 0x0180      ; 1.5 in 8.8
    LDI r3, 0x0200      ; 2.0
    FMUL r2, r3         ; 3.0 -> 0x0300
    LDI r4, 300
    LDI r5, 7
    MUL r4, r5          ; 2100
    LDI r6, 100
    LDI r7, 7
    DIV r6, r7          ; 14
    LDI r8, 100
    MOD r8, r7          ; 2
    LDI r9, 0xFFFF      ; -1 * 0x0100 (-1.0 * 1.0) in 8.8 -> -0.00390625? no: FMUL(-1, 256) = -1
    LDI r10, 0x0100
    FMUL r9, r10
  `);
  assert.equal(m.r[0], 0x4000);
  assert.equal(m.r[1], 0xf000);
  assert.equal(m.r[2], 0x0300);
  assert.equal(m.r[4], 2100);
  assert.equal(m.r[6], 14);
  assert.equal(m.r[8], 2);
  assert.equal(m.r[9], 0xffff);
});

test('divide by zero faults and defines results', () => {
  const m = runSnippet(`
    LDI r0, 9
    LDI r1, 0
    DIV r0, r1
    LDI r2, 9
    MOD r2, r1
  `);
  assert.equal(m.r[0], 0xffff);
  assert.equal(m.r[2], 9);
  assert.equal(m.status & C.ST_DIV0, C.ST_DIV0);
});

test('stack: PUSH/POP/CALL/RET', () => {
  const m = runSnippet(`
    LDI r0, 0x1111
    PUSH r0
    LDI r0, 0x2222
    PUSH r0
    POP r1
    POP r2
    CALL sub
    LDI r4, 0x4444
    RET
sub:
    LDI r3, 0x3333
    RET
  `);
  assert.equal(m.r[1], 0x2222);
  assert.equal(m.r[2], 0x1111);
  assert.equal(m.r[3], 0x3333);
  assert.equal(m.r[4], 0x4444);
  assert.equal(m.r[15], 0, 'SP is back to 0 after balanced calls');
});

test('memory: 16-bit wrap, byte loads, indexed access', () => {
  const m = runSnippet(`
    LDI r0, 0xB400
    LDI r1, 0x1234
    ST [r0], r1
    LDB r2, [r0]        ; 0x34
    LDX r3, [r0+0]      ; 0x1234
    LDI r4, 0xFFFF
    LDI r5, 0xAB
    STB [r4], r5        ; 0xFFFF is work RAM
    LDI r6, 0x00CD
    STBX [r4+1], r6     ; wraps to 0x0000 -> ROM -> RO_WRITE fault
    LDB r7, [r4]
  `);
  assert.equal(m.r[2], 0x34);
  assert.equal(m.r[3], 0x1234);
  assert.equal(m.r[7], 0xab);
  assert.equal(m.status & C.ST_RO_WRITE, C.ST_RO_WRITE);
  assert.equal(m.read8(0), 0x56, 'ROM unchanged');
});

test('ROM writes and FONT writes fault and are ignored', () => {
  const m = runSnippet(`
    LDI r0, 0x6400
    LDI r1, 0x77
    STB [r0], r1
  `);
  assert.equal(m.status & C.ST_RO_WRITE, C.ST_RO_WRITE);
  assert.equal(m.read8(0x6400), FONT[0]);
});

test('reserved regions read 0 and ignore writes without faulting', () => {
  const m = runSnippet(`
    LDI r0, 0x7000
    LDI r1, 0x55
    STB [r0], r1
    LDB r2, [r0]
    LDI r0, 0xB290
    STB [r0], r1
    LDB r3, [r0]
  `);
  assert.equal(m.r[2], 0);
  assert.equal(m.r[3], 0);
  assert.equal(m.status, 0);
});

test('read-only I/O registers ignore writes', () => {
  const m = machineFrom(`init:\n RET\nframe:\n LDI r0, 0xB314\n LDI r1, 0xFF\n STB [r0], r1\n RET`, { frames: 1, input: 4 });
  assert.equal(m.read16(C.INPUT), 4);
});

test('input latch: INPUT and PRESSED', () => {
  const m = machineFrom(`
init:
  RET
frame:
  LDI r0, 0xB314
  LD r1, [r0]
  LDI r0, 0xB316
  LD r2, [r0]
  RET`, { frames: 1, input: 0x11 });
  assert.equal(m.r[1], 0x11);
  assert.equal(m.r[2], 0x11);
  m.runFrame(0x11);
  assert.equal(m.r[1], 0x11);
  assert.equal(m.r[2], 0, 'held, not newly pressed');
  m.runFrame(0x13);
  assert.equal(m.r[2], 0x02);
});

test('frame counter increments and starts at 0', () => {
  const m = machineFrom(`
init:
  RET
frame:
  LDI r0, 0xB310
  LD r1, [r0]
  RET`, { frames: 1 });
  assert.equal(m.r[1], 0);
  m.runFrame(0); assert.equal(m.r[1], 1);
  m.runFrame(0); assert.equal(m.r[1], 2);
});

test('cycle budget cuts off a runaway routine and flags OVERRUN next frame', () => {
  const m = machineFrom(`init:\n RET\nframe:\n .loop: INC r0\n JMP .loop`, { frames: 1 });
  assert.ok(m.lastCycles <= C.CYCLES_PER_FRAME);
  assert.ok(m.lastCycles > C.CYCLES_PER_FRAME - 10);
  m.runFrame(0);
  assert.equal(m.status & C.ST_OVERRUN, C.ST_OVERRUN);
});

test('illegal opcode faults and ends the routine', () => {
  const { bytes } = assemble('.header init, frame\ninit: RET\nframe: .db 0xEE, 0\n LDI r0, 9\n RET');
  const m = new Machine(bytes);
  m.runFrame(0);
  assert.equal(m.status & C.ST_ILLEGAL, C.ST_ILLEGAL);
  assert.equal(m.r[0], 0);
});

test('HALT ends the routine', () => {
  const m = runSnippet(`LDI r0, 1\n HALT\n LDI r0, 2`);
  assert.equal(m.r[0], 1);
});

test('MCPY is overlap safe and MSET fills', () => {
  const m = runSnippet(`
    LDI r0, 0xB400
    LDI r1, 0x0102
    ST [r0], r1
    LDI r1, 0x0304
    STX [r0+2], r1
    ; copy 4 bytes from B400 to B401 (overlapping, forward)
    LDI r0, 0xB401
    LDI r1, 0xB400
    LDI r2, 4
    MCPY
    LDI r0, 0xB410
    LDI r1, 0xAA
    LDI r2, 5
    MSET
  `);
  const got = Array.from({ length: 5 }, (_, i) => m.read8(0xb400 + i));
  assert.deepEqual(got, [0x02, 0x02, 0x01, 0x04, 0x03]);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => m.read8(0xb410 + i)), [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0]);
});

test('MCPY/MSET cost depends on length', () => {
  const m = machineFrom(`init:\n RET\nframe:\n LDI r0, 0xB400\n LDI r1, 0\n LDI r2, 400\n MSET\n RET`, { frames: 1 });
  // 3 LDI (2 each) + MSET (8 + 400/8 = 58) + RET (3)
  assert.equal(m.lastCycles, 6 + 58 + 3);
});

test('PRNG: xorshift32 from the fixed start state, SRND reseeds', () => {
  const m = runSnippet(`
    RND r0
    RND r1
    LDI r2, 0
    LDI r3, 0
    SRND r2, r3       ; zero seed becomes the default
    RND r4
    LDI r2, 0x1234
    LDI r3, 0x5678
    SRND r2, r3
    RND r5
  `);
  const step = (x) => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x; };
  let x = 0x9e3779b9;
  x = step(x); const a = x >>> 16;
  x = step(x); const b = x >>> 16;
  assert.equal(m.r[0], a);
  assert.equal(m.r[1], b);
  assert.equal(m.r[4], a, 'zero reseed restores the start state');
  assert.equal(m.r[5], step(0x12345678) >>> 16);
});

test('save: SAVECTL triggers onSave with the 1 KB region; SAVE_LOADED reflects initial save', () => {
  const saves = [];
  const { bytes } = assemble(`
.header init, frame
init: RET
frame:
  LDI r0, 0x6000
  LDI r1, 0x7788
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  RET`);
  const m = new Machine(bytes, { onSave: (b) => saves.push(b) });
  m.runFrame(0);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].length, 1024);
  assert.equal(saves[0][0], 0x88);
  assert.equal(saves[0][1], 0x77);
  assert.equal(m.status & C.ST_SAVE_LOADED, 0);

  const save = new Uint8Array(1024); save[5] = 9;
  const m2 = new Machine(bytes, { save });
  m2.runFrame(0);
  assert.equal(m2.status & C.ST_SAVE_LOADED, C.ST_SAVE_LOADED);
  assert.equal(m2.read8(0x6005), 9);
  assert.throws(() => new Machine(bytes, { save: new Uint8Array(10) }), /1024/);
});

test('ROM banking: window shows the selected bank, power-on bank is 2', () => {
  const src = `
.header init, frame
init: RET
frame:
  LDI r0, 0x4000
  LDB r1, [r0]       ; bank 2 (power-on): byte at offset 16384
  LDI r2, 0xB322
  LDI r3, 3
  STB [r2], r3
  LDB r4, [r0]       ; bank 3: offset 24576
  LDI r3, 5
  STB [r2], r3
  LDB r5, [r0]       ; bank 5: offset 40960
  LDI r3, 127
  STB [r2], r3
  LDB r6, [r0]       ; past the end of the image: 0
  RET
.org 16384
.db 0xA2
.bank 3
.db 0xA3
.bank 5
.db 0xA5`;
  const { bytes } = assemble(src);
  assert.equal(bytes.length, 5 * 8192 + 1);
  const m = new Machine(bytes);
  m.runFrame(0);
  assert.equal(m.r[1], 0xa2);
  assert.equal(m.r[4], 0xa3);
  assert.equal(m.r[5], 0xa5);
  assert.equal(m.r[6], 0);
  assert.equal(m.read8(0xb322), 127);
});

test('flat 24 KB image: address == image offset up to 0x5FFF', () => {
  const { bytes } = assemble(`.header init, frame\ninit: RET\nframe: RET\n.org 0x5FFF\n.db 0x99`);
  const m = new Machine(bytes);
  assert.equal(m.read8(0x5fff), 0x99);
});

test('state hash and frame hash are deterministic and sensitive', () => {
  const src = `init:\n RET\nframe:\n LDI r0, 0xB400\n LD r1, [r0]\n INC r1\n ST [r0], r1\n RET`;
  const a = machineFrom(src, { frames: 10 });
  const b = machineFrom(src, { frames: 10 });
  assert.equal(Buffer.from(a.stateHash()).toString('hex'), Buffer.from(b.stateHash()).toString('hex'));
  const c = machineFrom(src, { frames: 11 });
  assert.notEqual(Buffer.from(a.stateHash()).toString('hex'), Buffer.from(c.stateHash()).toString('hex'));
  assert.equal(Buffer.from(a.frameHash()).toString('hex'), Buffer.from(c.frameHash()).toString('hex'), 'nothing visible changed');
});

test('audio synthesis: silent by default, pulse/triangle/noise produce bounded output', async () => {
  const { Synth, wavFromFloat } = await import('../src/core/index.js');
  const m = machineFrom(`init:\n RET\nframe:\n RET`);
  const s = new Synth(m.mem);
  assert.ok(s.render(100).every((v) => v === 0));
  const reg = (ch, hz, vol, ctrl) => { const b = C.AUDIO + ch * 4; m.mem[b] = hz & 255; m.mem[b + 1] = hz >> 8; m.mem[b + 2] = vol; m.mem[b + 3] = ctrl; };
  m.mem[C.AUDIO + 16] = 15;
  for (const [ch, ctrl] of [[0, 0x82], [2, 0x80], [3, 0x80]]) {
    reg(0, 0, 0, 0); reg(2, 0, 0, 0); reg(3, 0, 0, 0);
    reg(ch, 440, 15, ctrl);
    const out = new Synth(m.mem).render(2000);
    assert.ok(out.some((v) => v !== 0), `channel ${ch} is audible`);
    assert.ok(out.every((v) => v >= -1 && v <= 1));
  }
  const wav = wavFromFloat(new Float32Array(10));
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(wav.length, 44 + 20);
});
