.header init, frame
init:
  LDI r0, 0x4
  LDI r1, 0x4
  LDI r2, 0x80
  LDI r3, 0xffff
  LDI r4, 0xf
  LDI r5, 0x4
  LDI r6, 0x8
  LDI r7, 0x70ee
  LDI r8, 0xffff
  LDI r9, 0xfffe
  LDI r10, 0x7369
  LDI r11, 0x100
  LDI r12, 0xc2a4
  LDI r13, 0xf
  RET
frame:
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NOP
  POP r8
  LDI r8, 0x757d
  ST [r8], r12
  LDI r0, 0xb3d6
  LDI r1, 0xb267
  LDI r2, 247
  MSET
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  SRND r7, r8
  NOT r7
  LDI r8, 0xd890
  LDB r5, [r8]
  ADDI r7, 0x8001
  LDI r13, 0xfff4
  LDI r11, 0x6ea8
  LDX r12, [r11+0x7f]
  XORI r1, 0x1f
  LDI r0, 0x6829
  LDI r1, 0xb2d4
  LDI r2, 129
  MCPY
  LDI r1, 0x1a6a
  ST [r1], r8
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NEG r6
  PUSH r12
  CALL sub1
  LDI r3, 0xb955
  LD r10, [r3]
  LDI r0, 0xB300
  LDI r1, 0xe36e
  ST [r0], r1
  LDI r10, 0x4438
  LDB r11, [r10]
  SRND r1, r6
  JLT L0
  NOP
  LDI r0, 0xf727
  LDI r1, 0x6867
  LDI r2, 132
  MSET
  NOP
  NOP
  LDI r5, 0xb235
  RND r1
  PUSH r15
L0:
  JGT L1
  JMP L2
  LDI r0, 0xb2b8
  LD r11, [r0]
  LDI r1, 0xb609
  LDBX r2, [r1+0x8]
L1:
  NOP
  PUSH r8
  NEG r0
L2:
  AND r11, r0
  RND r2
  LDI r0, 0xB322
  LDI r1, 11
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 1
  STB [r0], r1
  NOP
  NOT r13
  CALL sub2
  PUSH r7
  JC L3
  LDI r0, 0xB300
  LDI r1, 0xecea
  ST [r0], r1
L3:
  ADDI r11, 0x8
  LDI r7, 0xb2cc
  LDB r11, [r7]
  SRND r12, r12
  ADD r7, r13
  LDI r3, 0x9bd3
  MOV r11, r0
  NOP
  JGT L4
  LDI r11, 0x8
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  JLE L5
  TST r6, r10
  MULI r13, 0x6c72
  LDI r5, 0xa8f5
  LDB r11, [r5]
L4:
  NOP
  CALL sub0
  LDI r0, 0xb1f6
  LDI r1, 0x639a
  LDI r2, 48
  MSET
L5:
  LDI r2, 0x3ec0
  LDX r11, [r2+0xf]
  LDI r0, 0xB300
  LDI r1, 0x90a3
  ST [r0], r1
  POP r11
  PUSH r13
  SARI r12, 11
  LDI r5, 0xec76
  POP r8
  LDI r8, 0xa409
  LDI r3, 0xbf4a
  STX [r3+0x100], r3
  SARI r0, 7
  RND r5
  SRND r6, r9
  LDI r2, 0x8977
  STBX [r2+0x20], r11
  SRND r12, r9
  SHLI r3, 11
  SRND r10, r7
  MULI r11, 0x1f
  RND r8
  CALL sub1
  LDI r0, 0xB300
  LDI r1, 0x927a
  ST [r0], r1
  FMUL r4, r8
  LDI r0, 0xb2af
  LDI r1, 0xad48
  LDI r2, 176
  MSET
  RND r4
  LDI r0, 0xccab
  LDB r1, [r0]
  POP r10
  CALLR r5
  LDI r5, 0xa319
  STX [r5+0x8001], r5
  LDI r9, 0xd4d6
  LDB r8, [r9]
  LDI r11, 0x62e5
  STBX [r11+0xf836], r8
  LDI r6, 0x69ce
  LDX r10, [r6+0x10]
  SHLI r13, 7
  LDI r0, 0xB322
  LDI r1, 28
  STB [r0], r1
  SRND r8, r5
  RND r13
  MOV r13, r15
  LDI r0, 0xb124
  LDB r5, [r0]
  LDI r10, 0x7261
  STB [r10], r0
  NOP
  NOP
  MOV r8, r8
  LDI r6, 0xb140
  LD r4, [r6]
  SHR r6, r9
  POP r6
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  CALL sub2
  LDI r0, 0xB300
  LDI r1, 0x1da5
  ST [r0], r1
  MOV r6, r6
  LDI r0, 0x693e
  LDI r1, 0xb274
  LDI r2, 141
  MSET
  NOP
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NEG r4
  SHLI r3, 6
  LDI r0, 0x8cb7
  LDI r1, 0x6f86
  LDI r2, 237
  MSET
  RND r6
  FMUL r6, r5
  LDI r1, 0x6492
  ST [r1], r11
  LDI r0, 0xB300
  LDI r1, 0xaf00
  ST [r0], r1
  LDI r0, 0xfffe
  MOV r7, r2
  LDI r6, 0x35db
  LD r12, [r6]
  LDI r3, 0x80
  LDI r0, 0xB300
  LDI r1, 0xcf31
  ST [r0], r1
  SRND r12, r1
  LDI r6, 0xb91e
  LDB r5, [r6]
  NEG r4
  NOP
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  NOP
  LDI r4, 0xc536
  ST [r4], r5
  SHRI r2, 8
  LDI r0, 0xB322
  LDI r1, 17
  STB [r0], r1
  POP r0
  RND r5
  MOV r12, r1
  XORI r10, 0xd55d
  POP r8
  LDI r0, 0xa90b
  STX [r0+0x8001], r9
  MUL r10, r15
  MOV r10, r0
  POP r6
  LDI r7, 0xb9d6
  LDBX r1, [r7+0xaeed]
  POP r13
  LDI r0, 0xB300
  LDI r1, 0x7536
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 25
  STB [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x335f
  ST [r0], r1
  NEG r8
  NOP
  LDI r1, 0xa4a5
  STB [r1], r0
  LDI r7, 0xb30a
  STBX [r7+0x84a4], r8
  LDI r13, 0xba4a
  LDI r8, 0x7
  NOP
  CALL sub3
  LDI r9, 0xac4f
  LDBX r8, [r9+0x7f]
  NOT r10
  LDI r0, 0xB300
  LDI r1, 0x76b0
  ST [r0], r1
  LDI r15, 0
  RET
sub0:
  ADD r6, r0
  ADD r8, r7
  XOR r0, r10
  SUB r11, r0
  RET
sub1:
  XOR r2, r6
  XOR r5, r7
  RET
sub2:
  SUB r6, r5
  XOR r11, r6
  ADD r0, r5
  XOR r0, r6
  ADD r4, r8
  RET
sub3:
  XOR r12, r10
  ADD r6, r9
  SUB r3, r10
  RET
.org 0x2000
  .db 52, 214, 119, 33, 150, 22, 184, 150, 75, 27, 125, 57, 108, 18, 238, 191
  .db 65, 170, 64, 37, 192, 234, 250, 44, 234, 50, 250, 138, 187, 226, 82, 155
  .db 219, 165, 200, 79, 174, 28, 94, 66, 171, 47, 27, 195, 102, 94, 117, 203
  .db 173, 201, 149, 234, 5, 243, 58, 233, 59, 90, 67, 46, 42, 14, 142, 174
  .db 37, 41, 145, 167, 33, 59, 171, 67, 239, 45, 35, 126, 5, 109, 29, 206
  .db 206, 168, 65, 192, 25, 254, 117, 248, 112, 81, 46, 153, 151, 118, 33, 183
  .db 203, 98, 209, 235, 179, 20, 222, 52, 134, 108, 238, 222, 186, 184, 221, 58
  .db 46, 60, 228, 95, 46, 34, 160, 238, 2, 23, 104, 245, 155, 160, 9, 252
.bank 3
  .db 25, 241, 1, 122, 67, 116, 160, 18, 7, 65, 102, 96, 160, 228, 42, 18, 172, 233, 83, 121, 88, 70, 240, 170, 132, 179, 209, 34, 49, 155, 137, 204
.bank 4
  .db 203, 57, 30, 191, 61, 178, 123, 84, 191, 129, 120, 139, 213, 99, 90, 52, 48, 233, 255, 249, 216, 144, 40, 135, 47, 126, 239, 195, 248, 214, 17, 119
.bank 5
  .db 19, 11, 82, 114, 217, 132, 230, 252, 147, 48, 165, 1, 110, 76, 236, 130, 7, 178, 158, 69, 190, 162, 113, 151, 169, 191, 177, 204, 124, 46, 121, 24
