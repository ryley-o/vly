.header init, frame
init:
  LDI r0, 0xf4ff
  LDI r1, 0x3
  LDI r2, 0xb9af
  LDI r3, 0x8000
  LDI r4, 0x10
  LDI r5, 0xf
  LDI r6, 0x3
  LDI r7, 0x8001
  LDI r8, 0x1
  LDI r9, 0x3
  LDI r10, 0x10
  LDI r11, 0x4
  LDI r12, 0x3
  LDI r13, 0x20
  RET
frame:
  NOP
  LDI r1, 0xb643
  LDB r7, [r1]
  SRND r9, r5
  SUB r15, r1
  NOP
  LDI r1, 0xdf56
  ST [r1], r12
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r6, 0xbc2e
  STB [r6], r0
  SRND r9, r12
  XORI r15, 0x83c6
  MOV r5, r9
  NOP
  LDI r2, 0xfff1
  ST [r2], r0
  LDI r0, 0xa0a0
  LDI r1, 0xfffa
  LDI r2, 65
  MSET
  MULI r4, 0x1f
  NOP
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 6
  STB [r0], r1
  NEG r11
  ADDI r6, 0x7
  LDI r0, 0xa5c1
  LDI r1, 0xae00
  LDI r2, 291
  MSET
  NOP
  FMUL r13, r2
  NOP
  LDI r4, 0x63cf
  LDX r12, [r4+0x5e49]
  LDI r11, 0x1bf8
  LDBX r7, [r11+0x1]
  JGE L0
  MULI r5, 0x0
  LDI r0, 0x8904
  LDI r1, 0x6017
  LDI r2, 57
  MSET
L0:
  SRND r9, r7
  LDI r7, 0xfffe
  CALL sub3
  POP r10
  JNZ L1
  RND r10
  NOP
  LDI r0, 0xb7fa
  LDI r1, 0x66b0
  LDI r2, 14
  MSET
  SHL r12, r13
  NOT r7
  LDI r0, 0xB300
  LDI r1, 0x3cd8
  ST [r0], r1
L1:
  SRND r1, r10
  MOV r0, r5
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  NOP
  MULI r13, 0x41b8
  SRND r9, r11
  LDI r5, 0xac4f
  LDBX r9, [r5+0x4e28]
  LDI r11, 0xe283
  ST [r11], r4
  CALL sub2
  NOP
  LDI r0, 0xB300
  LDI r1, 0xa18b
  ST [r0], r1
  LDI r0, 0xb1cd
  LDI r1, 0xb355
  LDI r2, 268
  MCPY
  JBE L2
L2:
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  RND r4
  LDI r2, 0x6148
  LD r6, [r2]
  LDI r0, 0xB300
  LDI r1, 0x20bd
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  LDI r9, 0xfff0
  STB [r9], r7
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  CALL sub3
  LDI r6, 0xb17e
  LD r11, [r6]
  MOV r10, r12
  CALL sub1
  PUSH r8
  NOP
  MOV r6, r7
  LDI r1, 0xffff
  POP r11
  ADDI r10, 0xc130
  SHL r6, r1
  PUSH r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  RND r7
  PUSH r15
  LDI r1, 0xafaf
  LD r5, [r1]
  PUSH r12
  LDI r10, 0xb0d2
  ST [r10], r3
  SARI r2, 13
  SHLI r9, 5
  LDI r3, 0xbb3f
  LD r10, [r3]
  LDI r2, 0xae69
  LD r10, [r2]
  NOT r13
  NOP
  LDI r0, 0x684b
  LDBX r2, [r0+0xfffe]
  CALL sub2
  LDI r3, 0xb0b6
  STX [r3+0x1f], r8
  SRND r6, r4
  POP r3
  LDI r0, 0xB322
  LDI r1, 31
  STB [r0], r1
  NOT r8
  RND r13
  NOP
  PUSH r10
  JGE L3
L3:
  LDI r9, 0xcca2
  STB [r9], r4
  LDI r0, 0xB322
  LDI r1, 18
  STB [r0], r1
  RND r0
  LDI r15, 0
  RET
sub0:
  ADD r8, r9
  XOR r11, r0
  RET
sub1:
  SHL r1, r2
  SUB r12, r10
  XOR r10, r3
  SHL r0, r11
  RET
sub2:
  SHL r10, r1
  SHL r11, r6
  RET
sub3:
  SHL r0, r11
  SHL r5, r6
  SUB r5, r9
  SHL r8, r12
  ADD r6, r6
  RET
.org 0x2000
  .db 212, 73, 134, 22, 184, 78, 132, 95, 38, 248, 59, 250, 106, 174, 25, 198
  .db 52, 95, 3, 135, 142, 214, 138, 27, 135, 93, 194, 186, 202, 210, 96, 228
  .db 14, 123, 28, 41, 235, 64, 140, 206, 184, 99, 64, 8, 163, 92, 84, 217
  .db 85, 142, 252, 170, 252, 143, 34, 222, 127, 136, 85, 95, 82, 54, 60, 33
  .db 110, 201, 157, 189, 120, 56, 83, 120, 167, 83, 16, 101, 141, 175, 130, 171
  .db 101, 209, 107, 137, 230, 253, 56, 56, 64, 29, 71, 121, 126, 203, 225, 251
  .db 144, 201, 1, 241, 117, 191, 238, 236, 90, 105, 40, 89, 182, 213, 216, 111
  .db 56, 151, 183, 84, 252, 173, 11, 230, 14, 8, 114, 73, 56, 181, 146, 69
.bank 3
  .db 70, 40, 71, 190, 195, 55, 213, 171, 43, 146, 71, 121, 2, 207, 162, 182, 93, 210, 43, 5, 212, 121, 25, 69, 190, 8, 157, 72, 4, 2, 207, 86
.bank 4
  .db 115, 173, 248, 252, 98, 184, 123, 76, 114, 229, 72, 98, 25, 79, 170, 179, 210, 179, 201, 136, 10, 23, 230, 224, 137, 229, 47, 64, 106, 193, 187, 122
.bank 5
  .db 48, 1, 91, 169, 236, 228, 131, 40, 57, 12, 115, 89, 193, 181, 148, 42, 247, 176, 242, 114, 198, 237, 225, 105, 200, 181, 91, 157, 224, 129, 109, 59
