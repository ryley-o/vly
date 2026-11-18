.header init, frame
init:
  LDI r0, 0x65e5
  LDI r1, 0xb272
  LDI r2, 0x1f
  LDI r3, 0x100
  LDI r4, 0x1
  LDI r5, 0x80
  LDI r6, 0x100
  LDI r7, 0x1956
  LDI r8, 0x4
  LDI r9, 0x4
  LDI r10, 0x80
  LDI r11, 0x1a7c
  LDI r12, 0x7b21
  LDI r13, 0x8000
  RET
frame:
  MOV r13, r12
  LDI r12, 0xfff2
  STX [r12+0xf], r2
  NOP
  SHRI r4, 5
  LDI r0, 0xB300
  LDI r1, 0x8f7c
  ST [r0], r1
  LDI r0, 0xfff2
  LDI r1, 0xb257
  LDI r2, 260
  MSET
  TST r4, r6
  NOP
  NEG r15
  CALL sub1
  LDI r0, 0xb669
  LDI r1, 0x3dea
  LDI r2, 79
  MCPY
  LDI r0, 0xB322
  LDI r1, 5
  STB [r0], r1
  PUSH r12
  SRND r12, r2
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r12, 0xb8f2
  LD r2, [r12]
  ORI r0, 0x4
  ADDI r3, 0x8001
  LDI r1, 0xabe7
  LDBX r10, [r1+0x7f]
  NOT r7
  ANDI r2, 0x1f
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xb27f
  LDI r1, 0xfff1
  LDI r2, 40
  MSET
  LDI r9, 0x60e8
  LDB r1, [r9]
  POP r2
  TST r4, r1
  LDI r0, 0xB322
  LDI r1, 7
  STB [r0], r1
  CALL sub2
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r8, 0x647d
  STX [r8+0xcc2f], r3
  RND r10
  POP r3
  MOV r11, r10
  SRND r9, r5
  SHLI r15, 7
  LDI r0, 0x6675
  LDI r1, 0xb0ef
  LDI r2, 232
  MSET
  DIV r8, r9
  LDI r4, 0xb2eb
  LD r5, [r4]
  MUL r3, r11
  NOP
  LDI r0, 0xB300
  LDI r1, 0x89ae
  ST [r0], r1
  LDI r2, 0xfff3
  LDB r7, [r2]
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  HALT
  NOP
  NOP
  NOP
  MOV r13, r14
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  SRND r6, r5
  XORI r3, 0x1f
  RND r7
  LDI r11, 0x9779
  STBX [r11+0x9edc], r1
  NOT r9
  NOT r2
  RND r1
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
  LDI r10, 0x8b3e
  LDX r7, [r10+0xa0bf]
  NOP
  MOV r3, r12
  ORI r8, 0xff
  SRND r2, r9
  POP r9
  LDI r10, 0xfff0
  LDBX r8, [r10+0x8001]
  JLE L0
  NOP
  CALL sub1
  LDI r0, 0xB322
  LDI r1, 16
  STB [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x20b3
  ST [r0], r1
  SARI r11, 0
L0:
  LDI r0, 0xB300
  LDI r1, 0xfd1f
  ST [r0], r1
  CALL sub2
  POP r3
  LDI r6, 0xb3c8
  CALL sub1
  MOV r5, r3
  CALL sub0
  ADDI r6, 0x7f
  NOP
  LDI r0, 0xB300
  LDI r1, 0x8bbc
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  POP r1
  NOP
  LDI r0, 0xb2be
  LDI r1, 0xb20d
  LDI r2, 269
  MCPY
  MOV r1, r2
  DIV r6, r13
  LDI r6, 0x637e
  PUSH r11
  NOP
  JGT L1
  NOP
  LDI r0, 0x6265
  LDI r1, 0xb30e
  LDI r2, 44
  MCPY
L1:
  MULI r2, 0x0
  NOP
  SARI r2, 8
  PUSH r2
  ORI r9, 0x0
  LDI r10, 0x94d5
  STX [r10+0x5487], r6
  SRND r0, r6
  NOP
  LDI r0, 0xfff0
  LDI r1, 0xb9dc
  LDI r2, 64
  MCPY
  LDI r11, 0xb273
  LDBX r9, [r11+0x7]
  LDI r9, 0x69e5
  ST [r9], r12
  MOV r3, r14
  JMP L2
  LDI r15, 0x9d0b
  MOV r6, r13
  ORI r7, 0x8001
  LDI r6, 0xbdca
  LDBX r1, [r6+0x1]
L2:
  LDI r11, 0x4b53
  LD r10, [r11]
  LDI r9, 0xb6ab
  LD r12, [r9]
  JMP L3
  LDI r5, 0xfff4
  LD r0, [r5]
  NOP
L3:
  LDI r12, 0xa2dd
  STBX [r12+0x8], r8
  NOP
  PUSH r15
  RND r5
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r6, 0x0
  NOP
  SRND r0, r7
  SHRI r0, 5
  MOV r9, r1
  NOP
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r15, 0
  RET
sub0:
  SUB r8, r10
  XOR r7, r10
  ADD r4, r11
  XOR r5, r11
  RET
sub1:
  ADD r9, r3
  XOR r2, r7
  RET
sub2:
  SHL r3, r1
  SUB r10, r5
  ADD r10, r0
  ADD r9, r7
  RET
sub3:
  SUB r5, r2
  SUB r11, r11
  XOR r5, r12
  RET
.org 0x2000
  .db 27, 224, 145, 8, 222, 248, 28, 125, 134, 79, 253, 233, 96, 215, 85, 13
  .db 64, 171, 230, 57, 254, 69, 105, 138, 61, 102, 125, 165, 27, 201, 175, 30
  .db 39, 253, 15, 81, 176, 47, 112, 188, 57, 61, 139, 134, 224, 96, 188, 190
  .db 114, 114, 110, 206, 10, 244, 248, 205, 74, 205, 196, 171, 117, 188, 188, 92
  .db 39, 155, 121, 45, 221, 195, 140, 29, 129, 240, 138, 248, 154, 14, 131, 2
  .db 174, 94, 118, 208, 238, 197, 241, 121, 140, 6, 221, 34, 49, 47, 238, 91
  .db 226, 65, 33, 135, 7, 103, 99, 0, 200, 11, 29, 181, 225, 248, 152, 62
  .db 251, 117, 145, 141, 163, 228, 80, 131, 134, 191, 16, 247, 189, 144, 221, 154
.bank 3
  .db 25, 170, 138, 76, 104, 13, 243, 4, 54, 92, 108, 242, 140, 63, 228, 208, 16, 51, 89, 141, 238, 61, 207, 90, 102, 2, 199, 158, 29, 110, 106, 90
.bank 4
  .db 16, 28, 85, 49, 7, 206, 37, 137, 191, 205, 205, 5, 227, 240, 119, 15, 175, 147, 187, 156, 214, 104, 180, 85, 110, 30, 198, 90, 216, 122, 16, 6
.bank 5
  .db 14, 152, 125, 10, 109, 32, 130, 225, 52, 44, 229, 111, 208, 50, 252, 192, 52, 60, 179, 115, 67, 32, 147, 75, 206, 21, 130, 85, 153, 234, 108, 16
