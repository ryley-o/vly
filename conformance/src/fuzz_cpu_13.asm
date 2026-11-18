.header init, frame
init:
  LDI r0, 0x5b28
  LDI r1, 0xf
  LDI r2, 0x7f
  LDI r3, 0x80
  LDI r4, 0x3
  LDI r5, 0x1f
  LDI r6, 0x80
  LDI r7, 0x1
  LDI r8, 0x1f
  LDI r9, 0x80
  LDI r10, 0xaa3e
  LDI r11, 0xfb42
  LDI r12, 0x1
  LDI r13, 0x10
  RET
frame:
  LDI r10, 0xb8da
  NOP
  RND r9
  LDI r8, 0xb31d
  LD r2, [r8]
  LDI r5, 0xb3a9
  STB [r5], r12
  LDI r9, 0xa52f
  LDI r5, 0xbb3e
  LDBX r9, [r5+0x8dac]
  LDI r1, 0xb36a
  LDBX r12, [r1+0x80]
  LDI r1, 0x9d23
  PUSH r13
  RND r0
  LDI r4, 0xc12
  STBX [r4+0x8001], r11
  LDI r4, 0x507d
  LDBX r10, [r4+0x1f]
  CALL sub3
  LDI r11, 0xb3f9
  LDBX r12, [r11+0x80]
  LDI r6, 0x100
  LDI r0, 0xb2d6
  STX [r0+0x2], r2
  LDI r0, 0xB300
  LDI r1, 0x2acc
  ST [r0], r1
  NOP
  MUL r9, r6
  LDI r0, 0x60e8
  LDI r1, 0xb2fe
  LDI r2, 189
  MCPY
  LDI r0, 0xbb24
  LDI r1, 0xb3ab
  LDI r2, 169
  MSET
  JGT L0
  LDI r0, 0xB322
  LDI r1, 3
  STB [r0], r1
L0:
  NOT r8
  CALL sub2
  NEG r5
  XORI r13, 0x4
  NOP
  RND r12
  NEG r5
  CALL sub2
  LDI r2, 0xac80
  CALL sub0
  LDI r0, 0xB300
  LDI r1, 0xc4da
  ST [r0], r1
  LDI r0, 0xb255
  LDI r1, 0xaeda
  LDI r2, 43
  MCPY
  CALL sub2
  MOV r6, r7
  SRND r7, r4
  LDI r6, 0x9a8f
  DIV r2, r5
  JGE L1
  JMP L2
  LDI r0, 0xB300
  LDI r1, 0xa6f2
  ST [r0], r1
  LDI r11, 0xb7bc
  LDBX r8, [r11+0x2e41]
L2:
  MULI r2, 0x20
  LDI r11, 0x1b14
  LD r7, [r11]
  LDI r4, 0xb23f
L1:
  JGE L3
  LDI r13, 0x10
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
L3:
  MOV r3, r5
  NEG r1
  CALL sub0
  LDI r2, 0xe762
  STX [r2+0x2], r7
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r9, 0xb2fc
  LDBX r4, [r9+0x10]
  SUB r1, r3
  PUSH r8
  LDI r15, 0xb05f
  POP r4
  SRND r4, r4
  NOP
  JA L4
  PUSH r10
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
L4:
  ORI r5, 0x100
  LDI r0, 0x6216
  LDI r1, 0xa4d2
  LDI r2, 222
  MSET
  LDI r11, 0xb2f0
  LD r10, [r11]
  LDI r11, 0xfff7
  ST [r11], r2
  SRND r8, r6
  NOP
  LDI r0, 0xB322
  LDI r1, 9
  STB [r0], r1
  SRND r12, r12
  NOT r2
  LDI r8, 0xc42e
  STBX [r8+0x3], r3
  LDI r0, 0xB300
  LDI r1, 0x5149
  ST [r0], r1
  NEG r4
  RND r8
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 17
  STB [r0], r1
  RND r9
  LDI r3, 0x6453
  ST [r3], r11
  NEG r7
  LDI r4, 0x6514
  STX [r4+0x2], r1
  NOP
  LDI r6, 0x7fef
  STX [r6+0xf8fa], r2
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  JC L5
  LDI r0, 0xd588
  LDI r1, 0xb2d1
  LDI r2, 114
  MCPY
  LDI r12, 0x4
  NOP
  SHRI r15, 7
L5:
  LDI r15, 0
  RET
sub0:
  XOR r4, r9
  SUB r9, r4
  ADD r7, r4
  SUB r2, r1
  ADD r10, r9
  RET
sub1:
  SHL r11, r2
  XOR r11, r8
  SHL r6, r12
  XOR r2, r7
  SHL r7, r2
  RET
sub2:
  XOR r9, r4
  ADD r9, r6
  XOR r6, r6
  RET
sub3:
  SUB r12, r2
  XOR r2, r3
  RET
.org 0x2000
  .db 3, 246, 13, 245, 171, 147, 67, 229, 181, 97, 252, 219, 70, 146, 188, 73
  .db 13, 138, 26, 96, 68, 235, 63, 97, 153, 111, 222, 105, 34, 87, 118, 53
  .db 213, 122, 161, 185, 157, 35, 44, 91, 31, 20, 177, 128, 92, 143, 146, 227
  .db 116, 99, 228, 62, 132, 43, 187, 156, 83, 121, 130, 210, 176, 154, 72, 186
  .db 64, 226, 65, 148, 10, 38, 173, 60, 55, 247, 31, 10, 204, 66, 60, 203
  .db 108, 197, 65, 211, 138, 6, 144, 39, 80, 223, 3, 226, 61, 123, 193, 154
  .db 71, 12, 242, 135, 79, 13, 69, 251, 147, 36, 61, 233, 51, 75, 200, 159
  .db 238, 188, 215, 51, 202, 253, 174, 47, 68, 6, 216, 68, 44, 0, 108, 88
.bank 3
  .db 240, 170, 222, 206, 153, 74, 196, 177, 166, 51, 69, 109, 124, 184, 26, 250, 157, 233, 2, 205, 222, 69, 153, 219, 86, 9, 58, 216, 255, 232, 147, 134
.bank 4
  .db 25, 84, 172, 211, 27, 120, 86, 39, 87, 203, 156, 246, 120, 240, 229, 169, 63, 16, 174, 22, 216, 140, 241, 31, 7, 60, 12, 30, 144, 37, 71, 199
.bank 5
  .db 146, 146, 33, 122, 166, 156, 186, 93, 9, 239, 105, 223, 206, 6, 1, 180, 252, 53, 61, 10, 243, 155, 23, 162, 68, 179, 80, 120, 25, 163, 208, 170
