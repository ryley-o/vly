.header init, frame
init:
  LDI r0, 0x4
  LDI r1, 0x920c
  LDI r2, 0x7fff
  LDI r3, 0x1295
  LDI r4, 0xe8d5
  LDI r5, 0x8001
  LDI r6, 0x7
  LDI r7, 0x2
  LDI r8, 0x20
  LDI r9, 0x71bf
  LDI r10, 0x7fff
  LDI r11, 0x6f60
  LDI r12, 0x2ca3
  LDI r13, 0xb20
  RET
frame:
  JNC L0
  SRND r3, r8
  LDI r0, 0x7ea6
  LDX r9, [r0+0x2]
  SRND r8, r2
L0:
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r7
  LDI r3, 0xbe94
  ST [r3], r7
  RND r12
  LDI r9, 0xb4a3
  LDX r11, [r9+0x80]
  CALL sub2
  JGE L1
  LDI r9, 0x6512
  LD r10, [r9]
  PUSH r9
L1:
  LDI r0, 0xB322
  LDI r1, 27
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  FMUL r10, r9
  POP r2
  SUB r8, r15
  RND r9
  CMPI r0, 0x8001
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  PUSH r10
  LDI r13, 0x7805
  LDI r8, 0x2a22
  NOP
  LDI r2, 0x60e5
  ST [r2], r12
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  ADD r7, r9
  SHRI r13, 13
  CALL sub0
  LDI r9, 0x7fe3
  ST [r9], r5
  LDI r0, 0x6479
  LDX r3, [r0+0xf]
  AND r13, r4
  LDI r4, 0x6c69
  LD r4, [r4]
  LDI r0, 0xB300
  LDI r1, 0x748c
  ST [r0], r1
  LDI r0, 0x7f8f
  LDI r1, 0xfffb
  LDI r2, 238
  MSET
  NOP
  NOT r3
  CALL sub0
  POP r0
  LDI r5, 0xad07
  LDBX r1, [r5+0x8001]
  JLT L2
  LDI r0, 0xB300
  LDI r1, 0xe86d
  ST [r0], r1
L2:
  LDI r0, 0xB300
  LDI r1, 0xed5d
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  CALLR r7
  LDI r0, 0xB300
  LDI r1, 0x1d44
  ST [r0], r1
  LDI r12, 0xefe6
  LDI r0, 0xB300
  LDI r1, 0x9c28
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x800b
  ST [r0], r1
  LDI r8, 0xb324
  LDX r3, [r8+0x1]
  MOV r3, r4
  LDI r0, 0x8bf7
  LDI r1, 0xbc10
  LDI r2, 241
  MCPY
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r2, 0xb258
  LDBX r3, [r2+0x8001]
  PUSH r9
  POP r12
  NOP
  LDI r10, 0xb06f
  STBX [r10+0xc14d], r8
  SARI r8, 9
  NOP
  NOP
  LDI r2, 0xfff2
  LD r0, [r2]
  JZ L3
  SRND r0, r9
  NOP
  PUSH r8
  LDI r11, 0xb034
  LDBX r3, [r11+0x8000]
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
L3:
  MOV r0, r0
  POP r5
  LDI r0, 0xB322
  LDI r1, 31
  STB [r0], r1
  JGT L4
L4:
  LDI r11, 0xb678
  LDX r1, [r11+0x8]
  MOV r13, r15
  LDI r0, 0x7c7d
  LDI r1, 0xbda5
  LDI r2, 53
  MCPY
  MOV r10, r14
  LDI r8, 0xb2b4
  LDBX r10, [r8+0xb9ad]
  NEG r12
  LDI r11, 0x92a5
  LDBX r8, [r11+0x8315]
  LDI r0, 0xaf60
  LDI r1, 0xe90f
  LDI r2, 137
  MCPY
  POP r0
  PUSH r1
  POP r13
  NOP
  CALL sub2
  LDI r12, 0xb2e8
  STB [r12], r12
  MUL r9, r5
  LDI r0, 0xB322
  LDI r1, 17
  STB [r0], r1
  LDI r6, 0xa3ec
  STB [r6], r6
  PUSH r14
  NOP
  LDI r13, 0xc95f
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xb9ca
  LDI r1, 0xb204
  LDI r2, 221
  MSET
  AND r0, r1
  LDI r0, 0xB300
  LDI r1, 0x47f9
  ST [r0], r1
  RND r8
  LDI r4, 0x1c49
  LDX r2, [r4+0xbd4b]
  LDI r4, 0xce77
  STX [r4+0x554d], r8
  NOP
  NOP
  SRND r2, r4
  LDI r0, 0xB300
  LDI r1, 0x7571
  ST [r0], r1
  MOV r8, r13
  LDI r0, 0xB300
  LDI r1, 0xe69b
  ST [r0], r1
  LDI r10, 0xd6b8
  LDX r7, [r10+0xf097]
  LDI r0, 0xB300
  LDI r1, 0x35dd
  ST [r0], r1
  LDI r8, 0x7fff
  LDI r8, 0xb296
  LD r0, [r8]
  LDI r5, 0xd902
  LD r0, [r5]
  LDI r10, 0xaf86
  LD r10, [r10]
  LDI r3, 0x37dd
  STB [r3], r11
  LDI r11, 0x699e
  STBX [r11+0x3], r7
  LDI r0, 0xB300
  LDI r1, 0x6ad1
  ST [r0], r1
  CALL sub1
  POP r4
  SRND r7, r3
  LDI r0, 0xB300
  LDI r1, 0x3a38
  ST [r0], r1
  NOT r0
  LDI r3, 0xb092
  ST [r3], r3
  NOP
  LDI r0, 0xB300
  LDI r1, 0xb1d
  ST [r0], r1
  LDI r10, 0xb111
  LD r7, [r10]
  LDI r0, 0xB300
  LDI r1, 0xbf8a
  ST [r0], r1
  PUSH r1
  NOP
  RND r2
  JLE L5
  PUSH r3
  PUSH r3
  NOP
  NOT r13
  LDI r0, 0xad7e
  ST [r0], r3
  PUSH r12
  RND r9
L5:
  LDI r10, 0xae64
  LD r9, [r10]
  MOV r1, r14
  CALLR r4
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r7, 0x9e8c
  STX [r7+0x7fff], r1
  NOP
  POP r9
  LDI r2, 0xa04e
  LDB r2, [r2]
  SHLI r6, 15
  PUSH r0
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r8, 0xb244
  ST [r8], r5
  LDI r15, 0
  RET
sub0:
  SHL r6, r6
  ADD r1, r12
  SUB r10, r2
  RET
sub1:
  ADD r6, r6
  SUB r2, r11
  XOR r5, r1
  ADD r6, r4
  SHL r5, r3
  RET
sub2:
  SHL r2, r4
  XOR r11, r2
  SHL r8, r3
  RET
sub3:
  XOR r4, r8
  ADD r6, r6
  ADD r11, r5
  RET
.org 0x2000
  .db 223, 29, 56, 208, 108, 2, 148, 197, 155, 202, 140, 93, 100, 59, 255, 172
  .db 74, 223, 80, 103, 6, 2, 205, 245, 179, 136, 30, 52, 25, 20, 6, 32
  .db 168, 249, 103, 206, 164, 176, 243, 110, 79, 78, 136, 44, 182, 193, 74, 33
  .db 121, 175, 191, 153, 228, 222, 110, 223, 232, 106, 14, 227, 159, 90, 160, 225
  .db 120, 109, 28, 122, 9, 155, 144, 47, 27, 42, 211, 23, 12, 230, 160, 22
  .db 222, 193, 197, 76, 94, 216, 56, 189, 253, 229, 144, 7, 243, 190, 138, 37
  .db 237, 16, 124, 103, 161, 211, 6, 117, 239, 97, 66, 196, 212, 117, 19, 175
  .db 188, 132, 87, 222, 111, 72, 60, 67, 234, 186, 206, 39, 125, 161, 126, 85
.bank 3
  .db 23, 72, 116, 118, 96, 220, 250, 14, 34, 52, 28, 179, 172, 255, 91, 139, 236, 82, 209, 243, 220, 177, 75, 137, 250, 250, 113, 35, 105, 31, 219, 73
.bank 4
  .db 47, 187, 243, 161, 22, 49, 136, 129, 165, 250, 245, 128, 112, 15, 174, 47, 183, 148, 203, 250, 50, 2, 214, 145, 169, 101, 16, 226, 148, 96, 212, 51
.bank 5
  .db 63, 226, 252, 222, 43, 86, 132, 40, 174, 139, 54, 177, 128, 209, 228, 3, 84, 132, 117, 150, 112, 199, 15, 80, 13, 200, 104, 240, 27, 109, 70, 14
