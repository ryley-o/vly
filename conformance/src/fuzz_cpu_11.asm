.header init, frame
init:
  LDI r0, 0x20
  LDI r1, 0x144f
  LDI r2, 0x4199
  LDI r3, 0xfffe
  LDI r4, 0x100
  LDI r5, 0x7f
  LDI r6, 0x0
  LDI r7, 0x743a
  LDI r8, 0x8
  LDI r9, 0x24ee
  LDI r10, 0x2
  LDI r11, 0x9bd
  LDI r12, 0x80
  LDI r13, 0xc6bc
  RET
frame:
  RND r11
  LDI r5, 0x6a3b
  LD r11, [r5]
  PUSH r9
  LDI r4, 0x7f
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  NOP
  POP r14
  NOT r4
  NEG r12
  LDI r9, 0xe720
  STB [r9], r9
  NOP
  LDI r11, 0xb189
  ST [r11], r10
  CMPI r13, 0x30a9
  CALL sub3
  LDI r7, 0xbbbf
  LDB r3, [r7]
  LDI r1, 0xfff6
  LDX r12, [r1+0x7f]
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  JLE L0
  CALL sub1
  SARI r1, 15
  LDI r6, 0x654a
  STX [r6+0x3bd2], r9
  MOV r10, r10
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r12, 0x4f68
  STX [r12+0x8001], r0
L0:
  POP r13
  JNC L1
  LDI r3, 0x1
  LDI r0, 0xfffa
  LDI r1, 0xb272
  LDI r2, 160
  MSET
  PUSH r10
L1:
  SHRI r0, 4
  NOP
  NOT r0
  MOV r0, r1
  JA L2
  LDI r10, 0xb2b7
  LDBX r5, [r10+0x7]
  POP r13
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
L2:
  PUSH r6
  MOV r0, r2
  NOP
  SRND r3, r5
  SHLI r11, 6
  SRND r7, r6
  ADDI r11, 0xaedf
  NOP
  CALL sub1
  ORI r4, 0x8
  ANDI r10, 0x10
  POP r2
  NOP
  TST r12, r10
  CALL sub2
  MUL r11, r10
  SARI r13, 8
  RND r12
  LDI r0, 0xB300
  LDI r1, 0x67cb
  ST [r0], r1
  SRND r8, r6
  CALL sub0
  SAR r11, r9
  PUSH r1
  LDI r0, 0x7583
  LDB r3, [r0]
  POP r7
  SARI r6, 0
  LDI r0, 0xb248
  LDI r1, 0xbefd
  LDI r2, 175
  MCPY
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOT r3
  RND r4
  LDI r0, 0xB300
  LDI r1, 0x6800
  ST [r0], r1
  AND r10, r7
  OR r5, r7
  LDI r0, 0xB300
  LDI r1, 0x4346
  ST [r0], r1
  RND r1
  LDI r2, 0xe3a0
  LDBX r5, [r2+0xf]
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  MOV r5, r1
  LDI r3, 0xa1ad
  LDB r4, [r3]
  NOP
  XOR r3, r12
  LDI r0, 0x7485
  LDI r1, 0xbb1c
  LDI r2, 156
  MSET
  LDI r7, 0xa932
  LD r5, [r7]
  SRND r12, r6
  CALL sub3
  MOV r4, r11
  CALL sub0
  LDI r8, 0x60b2
  STBX [r8+0xfa46], r9
  NOP
  SRND r7, r10
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  CALL sub2
  MULI r3, 0xff
  NEG r7
  ADD r4, r3
  CALL sub3
  LDI r5, 0xb334
  SRND r5, r10
  CALL sub0
  RND r4
  LDI r1, 0x7fff
  LDI r0, 0xbf79
  LDI r7, 0x64cc
  ST [r7], r4
  LDI r0, 0xB300
  LDI r1, 0xfa25
  ST [r0], r1
  LDI r7, 0xb2e9
  LDX r12, [r7+0x356a]
  LDI r4, 0xb2b7
  STBX [r4+0x10], r12
  SHLI r6, 2
  PUSH r1
  SRND r9, r10
  RND r4
  LDI r0, 0xB300
  LDI r1, 0xd687
  ST [r0], r1
  NEG r4
  NOP
  LDI r6, 0x99ea
  LDBX r4, [r6+0x1f]
  LDI r0, 0xB300
  LDI r1, 0xe533
  ST [r0], r1
  DIV r9, r6
  FMUL r10, r10
  LDI r10, 0xfff1
  LDX r6, [r10+0xa599]
  NOP
  LDI r0, 0xB322
  LDI r1, 24
  STB [r0], r1
  JNZ L3
  NOP
  XOR r2, r1
  LDI r8, 0xb160
  STX [r8+0x7fff], r9
  LDI r6, 0xb256
  LDX r5, [r6+0xdb2f]
  XORI r7, 0x9db8
  SRND r8, r11
  NOT r3
L3:
  CALL sub3
  POP r13
  SRND r6, r3
  SRND r0, r10
  SUB r10, r0
  PUSH r3
  LDI r0, 0xb17a
  STBX [r0+0x20], r9
  NOP
  CALL sub3
  LDI r0, 0x9717
  LDI r1, 0xb382
  LDI r2, 179
  MCPY
  SHLI r7, 9
  LDI r0, 0xbe13
  LDB r2, [r0]
  LDI r0, 0xB322
  LDI r1, 12
  STB [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x5afc
  ST [r0], r1
  XORI r4, 0x3169
  SRND r10, r8
  XORI r3, 0x7fff
  MOV r1, r8
  MULI r11, 0xba56
  PUSH r3
  PUSH r12
  RND r4
  LDI r0, 0xB300
  LDI r1, 0x7ef
  ST [r0], r1
  RND r10
  JNC L4
  LDI r8, 0xe6fb
  LDI r0, 0xB300
  LDI r1, 0x7890
  ST [r0], r1
  SRND r3, r0
  LDI r11, 0x7b5e
  LDB r3, [r11]
  LDI r0, 0xb6b2
  LDB r5, [r0]
L4:
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r3, 0xb281
  NOP
  RND r11
  XOR r11, r4
  LDI r0, 0xa507
  LDX r4, [r0+0x7]
  SRND r0, r11
  PUSH r5
  NOT r14
  LDI r0, 0xB300
  LDI r1, 0xaeab
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  CALLR r2
  LDI r8, 0xb308
  LDBX r7, [r8+0x13cd]
  LDI r0, 0xb9e2
  LDI r1, 0x6006
  LDI r2, 262
  MCPY
  SRND r0, r2
  POP r8
  CALL sub0
  NEG r1
  CALL sub0
  PUSH r15
  LDI r7, 0xba6f
  STX [r7+0x0], r4
  LDI r11, 0x85a8
  LDB r6, [r11]
  LDI r0, 0xB322
  LDI r1, 19
  STB [r0], r1
  MOD r1, r1
  LDI r0, 0xB300
  LDI r1, 0xd810
  ST [r0], r1
  NOP
  RND r2
  LDI r0, 0xfff8
  LDI r1, 0xb374
  LDI r2, 179
  MCPY
  RND r2
  LDI r7, 0x80
  MOV r11, r11
  LDI r12, 0xb1e5
  ST [r12], r0
  LDI r0, 0xB300
  LDI r1, 0x2df4
  ST [r0], r1
  SHLI r7, 7
  NOP
  LDI r5, 0xfffc
  STBX [r5+0x1f], r4
  CALL sub3
  SRND r1, r4
  NOP
  SARI r10, 9
  NOP
  CALL sub2
  NOT r8
  LDI r0, 0xb2a5
  LDI r1, 0xb34a
  LDI r2, 292
  MSET
  LDI r15, 0
  RET
sub0:
  SUB r10, r6
  ADD r12, r9
  RET
sub1:
  ADD r0, r2
  XOR r9, r4
  SHL r11, r1
  XOR r10, r8
  SHL r4, r6
  RET
sub2:
  ADD r11, r1
  SHL r9, r4
  ADD r6, r0
  RET
sub3:
  SUB r9, r1
  SHL r11, r3
  ADD r1, r5
  XOR r3, r1
  RET
.org 0x2000
  .db 153, 151, 255, 121, 248, 35, 94, 251, 87, 5, 185, 165, 158, 158, 14, 98
  .db 49, 39, 62, 213, 221, 141, 57, 79, 164, 136, 248, 16, 159, 91, 209, 122
  .db 22, 240, 70, 248, 40, 34, 168, 243, 52, 204, 74, 47, 10, 192, 129, 112
  .db 97, 188, 237, 74, 64, 236, 135, 3, 182, 245, 222, 82, 236, 55, 175, 135
  .db 47, 209, 1, 52, 253, 112, 170, 76, 81, 108, 4, 253, 32, 194, 135, 222
  .db 152, 41, 108, 249, 79, 159, 35, 220, 110, 2, 23, 39, 172, 27, 30, 251
  .db 96, 104, 27, 53, 244, 244, 207, 84, 66, 144, 191, 135, 24, 127, 189, 132
  .db 140, 90, 195, 106, 178, 32, 65, 122, 2, 176, 237, 118, 23, 240, 237, 200
.bank 3
  .db 120, 247, 253, 108, 184, 165, 219, 71, 14, 64, 30, 163, 62, 231, 64, 129, 248, 126, 171, 243, 30, 43, 248, 126, 221, 52, 251, 66, 171, 229, 69, 92
.bank 4
  .db 173, 183, 135, 126, 122, 255, 152, 4, 200, 67, 43, 13, 7, 160, 139, 143, 63, 244, 12, 20, 45, 76, 215, 194, 142, 195, 9, 234, 88, 239, 71, 20
.bank 5
  .db 243, 229, 213, 84, 242, 102, 170, 55, 245, 75, 164, 31, 90, 105, 13, 44, 21, 57, 210, 157, 182, 122, 15, 98, 0, 170, 232, 97, 193, 42, 176, 126
