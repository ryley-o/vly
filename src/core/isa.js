// VLY-1 instruction set table. This file is the single source of truth for opcodes, operand forms and
// cycle costs. `npm run gen` writes spec/isa.json and c/isa_table.h from it. See SPEC.md section 3.
//
// Operand forms:
//   none            no operands
//   rd              register in the high nibble of byte 1
//   rs              register in the low nibble of byte 1
//   rd,rs           both
//   rd,imm          register + 16-bit immediate word
//   rd,n            register + 4-bit count in the rs nibble
//   imm             16-bit immediate word only (jumps, calls)
//   rd,[rs]         load  (rd = dest, rs = address register)
//   [rd],rs         store (rd = address register, rs = value)
//   rd,[rs+imm]     indexed load
//   [rd+imm],rs     indexed store
//   hw              fixed-register hardware op (arguments in R0..R2)

export const FORMS = ['none', 'rd', 'rs', 'rd,rs', 'rd,imm', 'rd,n', 'imm', 'rd,[rs]', '[rd],rs', 'rd,[rs+imm]', '[rd+imm],rs', 'hw'];

export function formHasImm(form) {
  return form.includes('imm');
}

const o = (op, name, form, cycles, group, desc, extra = {}) => ({ op, name, form, cycles, group, desc, ...extra });

export const OPS = [
  o(0x00, 'NOP', 'none', 1, 'system', 'Do nothing.'),
  o(0x01, 'HALT', 'none', 1, 'system', 'End the current routine (like a top-level RET).'),

  o(0x02, 'MOV', 'rd,rs', 1, 'data', 'rd = rs'),
  o(0x03, 'LDI', 'rd,imm', 2, 'data', 'rd = imm'),
  o(0x04, 'LD', 'rd,[rs]', 3, 'data', 'rd = 16-bit load from [rs]'),
  o(0x05, 'LDB', 'rd,[rs]', 3, 'data', 'rd = 8-bit load from [rs], zero-extended'),
  o(0x06, 'ST', '[rd],rs', 3, 'data', '16-bit store of rs to [rd]'),
  o(0x07, 'STB', '[rd],rs', 3, 'data', '8-bit store of the low byte of rs to [rd]'),
  o(0x08, 'LDX', 'rd,[rs+imm]', 4, 'data', 'rd = 16-bit load from [rs+imm]'),
  o(0x09, 'LDBX', 'rd,[rs+imm]', 4, 'data', 'rd = 8-bit load from [rs+imm], zero-extended'),
  o(0x0a, 'STX', '[rd+imm],rs', 4, 'data', '16-bit store of rs to [rd+imm]'),
  o(0x0b, 'STBX', '[rd+imm],rs', 4, 'data', '8-bit store of the low byte of rs to [rd+imm]'),
  o(0x0c, 'PUSH', 'rs', 3, 'data', 'SP -= 2; store rs at [SP]. (PUSH R15 pushes the old SP.)'),
  o(0x0d, 'POP', 'rd', 3, 'data', 'Load [SP]; SP += 2; then rd = loaded value. (POP R15 yields the loaded value.)'),

  o(0x10, 'ADD', 'rd,rs', 1, 'alu', 'rd = rd + rs', { flags: 'ZNCV' }),
  o(0x11, 'SUB', 'rd,rs', 1, 'alu', 'rd = rd - rs (C = borrow)', { flags: 'ZNCV' }),
  o(0x12, 'AND', 'rd,rs', 1, 'alu', 'rd = rd & rs', { flags: 'ZN' }),
  o(0x13, 'OR', 'rd,rs', 1, 'alu', 'rd = rd | rs', { flags: 'ZN' }),
  o(0x14, 'XOR', 'rd,rs', 1, 'alu', 'rd = rd ^ rs', { flags: 'ZN' }),
  o(0x15, 'SHL', 'rd,rs', 1, 'alu', 'rd = rd << (rs & 15)', { flags: 'ZNC' }),
  o(0x16, 'SHR', 'rd,rs', 1, 'alu', 'rd = rd >> (rs & 15), logical', { flags: 'ZNC' }),
  o(0x17, 'SAR', 'rd,rs', 1, 'alu', 'rd = rd >> (rs & 15), arithmetic', { flags: 'ZNC' }),
  o(0x18, 'MUL', 'rd,rs', 3, 'alu', 'rd = low 16 bits of rd * rs', { flags: 'ZN' }),
  o(0x19, 'FMUL', 'rd,rs', 3, 'alu', 'rd = (signed rd * signed rs) >> 8 (8.8 fixed-point multiply)', { flags: 'ZN' }),
  o(0x1a, 'DIV', 'rd,rs', 8, 'alu', 'rd = rd / rs, unsigned. Divide by zero: rd = 0xFFFF and DIV0 fault', { flags: 'ZN' }),
  o(0x1b, 'MOD', 'rd,rs', 8, 'alu', 'rd = rd % rs, unsigned. Modulo by zero: rd unchanged and DIV0 fault', { flags: 'ZN' }),
  o(0x1c, 'NEG', 'rd', 1, 'alu', 'rd = 0 - rd', { flags: 'ZN' }),
  o(0x1d, 'NOT', 'rd', 1, 'alu', 'rd = ~rd', { flags: 'ZN' }),

  o(0x20, 'ADDI', 'rd,imm', 2, 'alu-imm', 'rd = rd + imm', { flags: 'ZNCV' }),
  o(0x21, 'ANDI', 'rd,imm', 2, 'alu-imm', 'rd = rd & imm', { flags: 'ZN' }),
  o(0x22, 'ORI', 'rd,imm', 2, 'alu-imm', 'rd = rd | imm', { flags: 'ZN' }),
  o(0x23, 'XORI', 'rd,imm', 2, 'alu-imm', 'rd = rd ^ imm', { flags: 'ZN' }),
  o(0x24, 'SHLI', 'rd,n', 1, 'alu-imm', 'rd = rd << n (n = 0..15)', { flags: 'ZNC' }),
  o(0x25, 'SHRI', 'rd,n', 1, 'alu-imm', 'rd = rd >> n, logical', { flags: 'ZNC' }),
  o(0x26, 'SARI', 'rd,n', 1, 'alu-imm', 'rd = rd >> n, arithmetic', { flags: 'ZNC' }),
  o(0x27, 'MULI', 'rd,imm', 4, 'alu-imm', 'rd = low 16 bits of rd * imm', { flags: 'ZN' }),

  o(0x28, 'CMP', 'rd,rs', 1, 'compare', 'Set flags from rd - rs', { flags: 'ZNCV' }),
  o(0x29, 'CMPI', 'rd,imm', 2, 'compare', 'Set flags from rd - imm', { flags: 'ZNCV' }),
  o(0x2a, 'TST', 'rd,rs', 1, 'compare', 'Set flags from rd & rs', { flags: 'ZN' }),

  o(0x30, 'JMP', 'imm', 2, 'control', 'PC = imm'),
  o(0x31, 'JZ', 'imm', 2, 'control', 'Jump if Z (equal)', { cond: 'Z' }),
  o(0x32, 'JNZ', 'imm', 2, 'control', 'Jump if !Z (not equal)', { cond: '!Z' }),
  o(0x33, 'JC', 'imm', 2, 'control', 'Jump if C (unsigned below)', { cond: 'C' }),
  o(0x34, 'JNC', 'imm', 2, 'control', 'Jump if !C (unsigned above or equal)', { cond: '!C' }),
  o(0x35, 'JLT', 'imm', 2, 'control', 'Jump if N != V (signed less)', { cond: 'N!=V' }),
  o(0x36, 'JGE', 'imm', 2, 'control', 'Jump if N == V (signed greater or equal)', { cond: 'N==V' }),
  o(0x37, 'JLE', 'imm', 2, 'control', 'Jump if Z or N != V (signed less or equal)', { cond: 'Z|N!=V' }),
  o(0x38, 'JGT', 'imm', 2, 'control', 'Jump if !Z and N == V (signed greater)', { cond: '!Z&N==V' }),
  o(0x39, 'JA', 'imm', 2, 'control', 'Jump if !C and !Z (unsigned above)', { cond: '!C&!Z' }),
  o(0x3a, 'JBE', 'imm', 2, 'control', 'Jump if C or Z (unsigned below or equal)', { cond: 'C|Z' }),
  o(0x3c, 'CALL', 'imm', 4, 'control', 'Push return address; PC = imm'),
  o(0x3d, 'RET', 'none', 3, 'control', 'Pop PC. If SP == 0 the routine ends instead.'),
  o(0x3e, 'JMPR', 'rs', 2, 'control', 'PC = rs'),
  o(0x3f, 'CALLR', 'rs', 4, 'control', 'Push return address; PC = rs'),

  o(0x40, 'MCPY', 'hw', 8, 'hardware', 'Copy R2 bytes from [R1] to [R0] (overlap-safe). Cost 8 + R2/4', { dynamic: true }),
  o(0x41, 'MSET', 'hw', 8, 'hardware', 'Set R2 bytes at [R0] to the low byte of R1. Cost 8 + R2/8', { dynamic: true }),
  o(0x42, 'RND', 'rd', 2, 'hardware', 'rd = next 16-bit pseudorandom value'),
  o(0x43, 'SRND', 'rd,rs', 2, 'hardware', 'Reseed the PRNG with (rd << 16) | rs'),
];

export const OP_BY_CODE = new Array(256).fill(null);
export const OP_BY_NAME = Object.create(null);
for (const op of OPS) {
  if (OP_BY_CODE[op.op]) throw new Error(`duplicate opcode ${op.op}`);
  OP_BY_CODE[op.op] = op;
  OP_BY_NAME[op.name] = op;
}

// Assembler aliases.
export const ALIASES = { JEQ: 'JZ', JNE: 'JNZ', JB: 'JC', JAE: 'JNC', JBL: 'JC', JNB: 'JNC' };

export function opLength(op) {
  return formHasImm(op.form) ? 4 : 2;
}
