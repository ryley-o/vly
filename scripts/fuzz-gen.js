// Seeded random program generators shared by the conformance suite and the fuzz campaign.

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const INTERESTING = [0, 1, 2, 3, 4, 7, 8, 15, 16, 31, 32, 0x7f, 0x80, 0xff, 0x100, 0x7fff, 0x8000, 0x8001, 0xfffe, 0xffff];
const REGIONS = [[0x0000, 0x5fff], [0x6000, 0x63ff], [0x6400, 0x69ef], [0x69f0, 0x7fff], [0x8000, 0x9fff], [0xa000, 0xafff], [0xb000, 0xb1ff], [0xb200, 0xb27f], [0xb280, 0xb2ff], [0xb300, 0xb3ff], [0xb400, 0xffff], [0xb400, 0xbfff], [0xfff0, 0xffff]];

export function cpuFuzz(seed) {
  const rnd = mulberry32(seed);
  const R = (n) => Math.floor(rnd() * n);
  const pick = (a) => a[R(a.length)];
  const val = () => (R(4) === 0 ? R(65536) : pick(INTERESTING));
  const reg = () => (R(20) === 0 ? pick([14, 15]) : R(14));
  const addr = () => { const [lo, hi] = pick(REGIONS); return lo + R(hi - lo + 1); };
  const hx = (v) => '0x' + (v & 0xffff).toString(16);
  const lines = [];
  const pending = [];
  let labelN = 0;
  const N = 150 + R(150);
  const gens = [
    () => [`${pick(['ADD', 'SUB', 'AND', 'OR', 'XOR', 'SHL', 'SHR', 'SAR', 'MUL', 'FMUL', 'DIV', 'MOD', 'CMP', 'TST'])} r${reg()}, r${reg()}`],
    () => [`${pick(['NEG', 'NOT'])} r${reg()}`],
    () => [`${pick(['ADDI', 'ANDI', 'ORI', 'XORI', 'MULI', 'CMPI'])} r${reg()}, ${hx(val())}`],
    () => [`${pick(['SHLI', 'SHRI', 'SARI'])} r${reg()}, ${R(16)}`],
    () => [`LDI r${reg()}, ${hx(R(3) === 0 ? addr() : val())}`],
    () => [`MOV r${reg()}, r${reg()}`],
    () => { const b = R(13); return [`LDI r${b}, ${hx(addr())}`, `${pick(['LD', 'LDB'])} r${R(13)}, [r${b}]`]; },
    () => { const b = R(13); return [`LDI r${b}, ${hx(addr())}`, `${pick(['ST', 'STB'])} [r${b}], r${R(13)}`]; },
    () => { const b = R(13); return [`LDI r${b}, ${hx(addr())}`, `${pick(['LDX', 'LDBX'])} r${R(13)}, [r${b}+${hx(val())}]`]; },
    () => { const b = R(13); return [`LDI r${b}, ${hx(addr())}`, `${pick(['STX', 'STBX'])} [r${b}+${hx(val())}], r${R(13)}`]; },
    () => [`PUSH r${reg()}`],
    () => [`POP r${reg()}`],
    () => [`CALL sub${R(4)}`],
    () => (R(12) === 0 ? [`CALLR r${R(13)}`] : [`NOP`]),
    () => { const l = `L${labelN++}`; pending.push({ label: l, at: lines.length + 1 + R(12) }); return [`${pick(['JMP', 'JZ', 'JNZ', 'JC', 'JNC', 'JLT', 'JGE', 'JLE', 'JGT', 'JA', 'JBE'])} ${l}`]; },
    () => [`RND r${reg()}`],
    () => [`SRND r${R(13)}, r${R(13)}`],
    () => [`LDI r0, ${hx(addr())}`, `LDI r1, ${hx(addr())}`, `LDI r2, ${R(300)}`, pick(['MCPY', 'MSET'])],
    () => [`LDI r0, 0xB322`, `LDI r1, ${R(40)}`, 'STB [r0], r1'],
    () => [`LDI r0, 0xB320`, `LDI r1, ${R(3)}`, 'ST [r0], r1'],
    () => [`LDI r0, 0xB300`, `LDI r1, ${hx(R(65536))}`, 'ST [r0], r1'],
    () => ['NOP'],
    () => (R(40) === 0 ? ['HALT'] : ['NOP']),
  ];
  const flush = () => {
    for (const p of [...pending]) if (p.at <= lines.length) { lines.push(`${p.label}:`); pending.splice(pending.indexOf(p), 1); }
  };
  while (lines.filter((l) => !l.endsWith(':')).length < N) {
    flush();
    lines.push(...pick(gens)().map((x) => `  ${x}`));
  }
  for (const p of pending) lines.push(`${p.label}:`);
  const body = lines.join('\n');
  const init = Array.from({ length: 14 }, (_, i) => `  LDI r${i}, ${hx(val())}`).join('\n');
  const data = [];
  for (let k = 0; k < 8; k++) data.push('  .db ' + Array.from({ length: 16 }, () => R(256)).join(', '));
  const bank = [3, 4, 5].map((b) => `.bank ${b}\n  .db ${Array.from({ length: 32 }, () => R(256)).join(', ')}`).join('\n');
  const subs = [0, 1, 2, 3].map((k) => `sub${k}:\n${Array.from({ length: 2 + R(4) }, () => `  ${pick(['ADD', 'XOR', 'SUB', 'SHL'])} r${R(13)}, r${R(13)}`).join('\n')}\n  RET`).join('\n');
  return `.header init, frame\ninit:\n${init}\n  RET\nframe:\n${body}\n  LDI r15, 0\n  RET\n${subs}\n.org 0x2000\n${data.join('\n')}\n${bank}\n`;
}

export function videoFuzz(seed) {
  const rnd = mulberry32(seed);
  const R = (n) => Math.floor(rnd() * n);
  const lcdcHigh = R(2) ? 0 : R(65536) & 0xfff8;
  const sprMask = pickFrom([0xff, 0x7f, 0x3f]);
  function pickFrom(a) { return a[R(a.length)]; }
  return `.header init, frame
init:
  LDI r2, 0
  LDI r3, ${(R(65535) + 1)}
  SRND r3, r3
  ; fill all video memory (tiles, maps, OAM, palettes) with random words
  LDI r0, 0x8000
  LDI r1, 0x1940
.fill:
  RND r2
  ST [r0], r2
  ADDI r0, 2
  DEC r1
  JNZ .fill
  ; place sprites on the screen: x = (rnd & ${sprMask}) - 40, y = (rnd & ${sprMask}) - 40 for all 64
  LDI r0, 0xB000
  LDI r1, 64
.spr:
  RND r2
  ANDI r2, ${sprMask}
  ADDI r2, -40
  ST [r0], r2
  RND r2
  ANDI r2, ${sprMask}
  ADDI r2, -40
  STX [r0+2], r2
  ADDI r0, 8
  DEC r1
  JNZ .spr
  LDI r0, 0xB300
  LDI r1, ${'0x' + (7 | lcdcHigh).toString(16)}
  ST [r0], r1
  RET
frame:
  ; random scroll/window registers and a random LCDC (bits 0-2 vary, higher bits random)
  RND r2
  LDI r0, 0xB302
  STB [r0], r2
  RND r2
  LDI r0, 0xB303
  STB [r0], r2
  RND r2
  ANDI r2, 0xBF
  LDI r0, 0xB304
  STB [r0], r2
  RND r2
  ANDI r2, 0x9F
  LDI r0, 0xB305
  STB [r0], r2
  RND r2
  ANDI r2, 0x${(0x0007 | lcdcHigh).toString(16)}
  ORI r2, 1
  LDI r0, 0xB300
  ST [r0], r2
  ; mutate 8 random sprites (position, tile, attributes) and some tile bytes
  LDI r4, 8
.m:
  RND r2
  ANDI r2, 63
  SHLI r2, 3
  ADDI r2, 0xB000
  RND r3
  ANDI r3, ${sprMask}
  ADDI r3, -40
  ST [r2], r3
  RND r3
  STX [r2+4], r3
  RND r3
  STX [r2+6], r3
  RND r2
  ANDI r2, 0x1FFF
  ADDI r2, 0x8000
  RND r3
  ST [r2], r3
  DEC r4
  JNZ .m
  RET
`;
}

