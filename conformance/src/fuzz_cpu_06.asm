.header init, frame
init:
  LDI r0, 0xffff
  LDI r1, 0x7fff
  LDI r2, 0xffff
  LDI r3, 0xfffe
  LDI r4, 0x0
  LDI r5, 0x0
  LDI r6, 0x0
  LDI r7, 0xffff
  LDI r8, 0x80
  LDI r9, 0x10
  LDI r10, 0x0
  LDI r11, 0x2
  LDI r12, 0x3
  LDI r13, 0x10
  RET
frame:
  MOV r13, r13
  LDI r6, 0x9b91
  MULI r8, 0x9519
  SARI r9, 9
  SRND r2, r9
  SUB r8, r0
  LDI r0, 0xB300
  LDI r1, 0x2dc3
  ST [r0], r1
  LDI r0, 0x1824
  LDI r1, 0xfffd
  LDI r2, 283
  MSET
  LDI r0, 0xb23a
  LDI r1, 0xbed7
  LDI r2, 63
  MSET
  POP r10
  POP r10
  CMP r0, r9
  NEG r7
  AND r9, r1
  JNC L0
  LDI r6, 0x7fff
  POP r0
L0:
  LDI r0, 0xb383
  LDI r1, 0xad0f
  LDI r2, 121
  MSET
  NOP
  JA L1
  LDI r2, 0xb24b
  LDBX r1, [r2+0x7fff]
  LDI r0, 0xbe4e
  STBX [r0+0x7f], r11
L1:
  LDI r0, 0xB300
  LDI r1, 0xcb1f
  ST [r0], r1
  LDI r3, 0xbd75
  ST [r3], r9
  NOP
  RND r15
  NOP
  CMPI r12, 0x7f
  RND r8
  SRND r10, r1
  CALL sub1
  NOP
  LDI r0, 0xb25c
  STBX [r0+0x8001], r8
  LDI r0, 0xB322
  LDI r1, 39
  STB [r0], r1
  MOV r6, r5
  LDI r8, 0xbd51
  LDBX r3, [r8+0x7fff]
  LDI r4, 0x6903
  LDB r6, [r4]
  NOP
  NOP
  MOV r5, r15
  JNZ L2
  LDI r7, 0x95a7
  STB [r7], r1
  LDI r0, 0x6826
  LDI r1, 0xb342
  LDI r2, 91
  MSET
L2:
  LDI r0, 0xB322
  LDI r1, 25
  STB [r0], r1
  PUSH r4
  LDI r0, 0xd64f
  STBX [r0+0x0], r5
  LDI r0, 0xb083
  LDBX r2, [r0+0x100]
  LDI r3, 0x38ea
  STB [r3], r0
  MULI r14, 0xa0f4
  SHLI r8, 8
  NOP
  LDI r0, 0xba02
  LDB r3, [r0]
  LDI r12, 0xb2b2
  ST [r12], r6
  LDI r8, 0xac16
  ST [r8], r8
  SHLI r11, 11
  LDI r0, 0xB300
  LDI r1, 0xf130
  ST [r0], r1
  NOP
  NOP
  MOV r9, r5
  LDI r0, 0xB322
  LDI r1, 1
  STB [r0], r1
  JA L3
  SARI r4, 10
  POP r11
  LDI r8, 0xe9b3
  LDX r12, [r8+0x8001]
L3:
  LDI r0, 0xb210
  LDI r1, 0x62f4
  LDI r2, 299
  MSET
  LDI r0, 0xB300
  LDI r1, 0x5390
  ST [r0], r1
  LDI r0, 0xa04f
  LDB r9, [r0]
  LDI r1, 0xb64f
  STB [r1], r6
  MOV r7, r7
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  CALL sub3
  LDI r0, 0xB322
  LDI r1, 22
  STB [r0], r1
  LDI r8, 0x661d
  LD r0, [r8]
  JGT L4
  LDI r2, 0xb235
  LD r7, [r2]
  LDI r4, 0x647a
  STB [r4], r5
  NOP
  NOT r0
  LDI r0, 0xb3f5
  LDI r1, 0x7eba
  LDI r2, 251
  MSET
L4:
  NOP
  NOP
  MOV r13, r0
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
  MOV r3, r6
  XORI r13, 0xcf2e
  NOP
  POP r10
  SRND r7, r6
  MULI r8, 0x7fff
  LDI r0, 0xad10
  LDI r1, 0x613f
  LDI r2, 226
  MCPY
  LDI r2, 0x6256
  STB [r2], r8
  NOP
  NOP
  RND r6
  MOV r14, r8
  LDI r0, 0xB300
  LDI r1, 0x89c9
  ST [r0], r1
  MOV r13, r6
  NOP
  TST r5, r8
  CALL sub3
  RND r9
  LDI r6, 0x6884
  ST [r6], r4
  NOP
  JLE L5
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  CALLR r8
  RND r5
  MOV r9, r12
L5:
  PUSH r1
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  RND r4
  MOV r13, r1
  LDI r0, 0xB300
  LDI r1, 0xd60d
  ST [r0], r1
  CALL sub1
  NOP
  MOV r13, r8
  ADD r7, r5
  MOV r9, r9
  LDI r0, 0xB300
  LDI r1, 0xad86
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x6f54
  ST [r0], r1
  NOP
  LDI r1, 0xfff8
  ST [r1], r8
  LDI r5, 0xb378
  LD r3, [r5]
  LDI r4, 0x20
  SRND r1, r5
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  LDI r15, 0
  RET
sub0:
  ADD r4, r5
  SUB r10, r3
  RET
sub1:
  XOR r6, r8
  SHL r9, r10
  RET
sub2:
  XOR r7, r4
  SUB r6, r12
  XOR r9, r4
  ADD r11, r4
  ADD r4, r3
  RET
sub3:
  ADD r4, r8
  SUB r5, r8
  SHL r11, r7
  SHL r3, r3
  SUB r1, r0
  RET
.org 0x2000
  .db 112, 81, 133, 139, 129, 179, 236, 63, 37, 176, 121, 33, 34, 91, 216, 27
  .db 25, 145, 14, 124, 138, 9, 202, 224, 14, 3, 127, 89, 9, 60, 151, 62
  .db 203, 159, 206, 183, 137, 112, 28, 18, 171, 232, 151, 116, 206, 46, 153, 179
  .db 177, 51, 1, 170, 147, 135, 41, 255, 47, 233, 33, 69, 78, 193, 197, 42
  .db 178, 29, 228, 228, 38, 94, 12, 142, 183, 152, 144, 46, 245, 193, 228, 189
  .db 112, 62, 206, 212, 254, 132, 55, 80, 153, 152, 151, 34, 176, 149, 80, 175
  .db 176, 191, 4, 50, 225, 66, 143, 221, 76, 9, 84, 57, 78, 130, 37, 246
  .db 32, 10, 107, 235, 119, 237, 167, 152, 210, 119, 72, 207, 29, 13, 147, 57
.bank 3
  .db 130, 67, 104, 218, 241, 230, 187, 254, 128, 104, 90, 224, 31, 216, 112, 39, 108, 159, 244, 152, 117, 37, 49, 246, 68, 205, 36, 199, 7, 186, 0, 86
.bank 4
  .db 233, 172, 211, 65, 76, 70, 59, 69, 170, 8, 114, 101, 21, 6, 225, 248, 17, 150, 194, 106, 234, 148, 94, 99, 115, 106, 163, 153, 125, 52, 198, 0
.bank 5
  .db 117, 168, 231, 128, 205, 213, 234, 210, 189, 110, 43, 201, 106, 220, 31, 94, 55, 245, 70, 201, 161, 175, 228, 27, 199, 52, 234, 71, 46, 32, 2, 101
