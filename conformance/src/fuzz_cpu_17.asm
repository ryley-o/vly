.header init, frame
init:
  LDI r0, 0x3
  LDI r1, 0x4
  LDI r2, 0x80
  LDI r3, 0x8
  LDI r4, 0x1f
  LDI r5, 0x8
  LDI r6, 0xf
  LDI r7, 0x7f
  LDI r8, 0x0
  LDI r9, 0x7341
  LDI r10, 0x20
  LDI r11, 0x1f
  LDI r12, 0x10
  LDI r13, 0x20
  RET
frame:
  LDI r15, 0x10
  LDI r0, 0xB300
  LDI r1, 0x4136
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x96d
  ST [r0], r1
  RND r4
  CALL sub0
  MOD r7, r9
  LDI r7, 0xfff1
  STX [r7+0xf], r12
  SARI r10, 4
  SRND r2, r4
  LDI r0, 0xb201
  LDI r1, 0x694b
  LDI r2, 24
  MSET
  SHRI r1, 9
  NOP
  NOP
  LDI r11, 0x776b
  LDBX r3, [r11+0x2]
  LDI r4, 0xb361
  STB [r4], r2
  NOP
  SHLI r2, 15
  SRND r10, r2
  LDI r0, 0xb2b4
  LDI r1, 0x1e07
  LDI r2, 217
  MSET
  MOV r1, r6
  LDI r1, 0xf108
  LDB r7, [r1]
  LDI r0, 0xB300
  LDI r1, 0xcbbc
  ST [r0], r1
  NOT r2
  LDI r0, 0xb002
  ST [r0], r7
  PUSH r8
  PUSH r1
  NOP
  LDI r10, 0xb22e
  ST [r10], r4
  FMUL r3, r9
  POP r4
  LDI r0, 0xB300
  LDI r1, 0x6de8
  ST [r0], r1
  POP r3
  LDI r4, 0x92e8
  NOT r12
  POP r7
  CALL sub3
  MOV r15, r1
  LDI r11, 0xb221
  STBX [r11+0x0], r8
  SARI r8, 12
  NOP
  POP r14
  LDI r0, 0xB322
  LDI r1, 20
  STB [r0], r1
  LDI r5, 0xa8b2
  ST [r5], r0
  LDI r0, 0xaf59
  LDBX r4, [r0+0xdbcf]
  NOP
  LDI r3, 0xb10d
  LD r0, [r3]
  NOP
  NOP
  SHL r10, r0
  LDI r5, 0x609a
  LDBX r7, [r5+0xc143]
  MOD r15, r8
  CMP r9, r1
  SHLI r10, 0
  PUSH r1
  AND r0, r9
  NOP
  LDI r0, 0x1051
  STBX [r0+0x80], r10
  NOP
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
  LDI r0, 0xb2a1
  LDI r1, 0xb5ef
  LDI r2, 50
  MCPY
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  MOV r9, r12
  LDI r13, 0xb288
  LDI r13, 0xb292
  LDI r11, 0xfff6
  LDB r11, [r11]
  SRND r1, r12
  LDI r0, 0xB300
  LDI r1, 0xeb63
  ST [r0], r1
  XORI r13, 0x7fff
  LDI r3, 0xb25b
  LDBX r1, [r3+0xfffe]
  NOP
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r9, 0xfffc
  STBX [r9+0x7], r12
  LDI r2, 0xd7fd
  STBX [r2+0x3], r7
  RND r6
  SAR r3, r7
  LDI r2, 0x511d
  LDBX r0, [r2+0x7e49]
  MOV r4, r10
  LDI r10, 0x61a6
  LDBX r9, [r10+0xbeeb]
  LDI r6, 0x46a5
  LDBX r10, [r6+0x3]
  XORI r8, 0xf147
  SHRI r4, 13
  RND r4
  LDI r0, 0xB300
  LDI r1, 0xe027
  ST [r0], r1
  NOP
  LDI r13, 0x3
  MOV r9, r9
  SRND r4, r4
  LDI r9, 0xffff
  NOP
  RND r11
  NOP
  POP r9
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  SRND r1, r4
  LDI r12, 0x659d
  LD r7, [r12]
  SHLI r4, 0
  LDI r7, 0xb28e
  LDB r12, [r7]
  MOV r3, r7
  CALL sub1
  MOV r5, r10
  ORI r3, 0xe375
  JGE L0
  NOP
  SRND r8, r3
  SRND r10, r3
  LDI r10, 0x7122
  STBX [r10+0x8], r10
  LDI r12, 0xb219
  STB [r12], r2
L0:
  LDI r9, 0x3
  LDI r0, 0xB322
  LDI r1, 34
  STB [r0], r1
  POP r2
  SARI r10, 8
  LDI r10, 0x60bd
  STBX [r10+0xffff], r8
  JC L1
  LDI r0, 0xB322
  LDI r1, 23
  STB [r0], r1
  SRND r5, r8
  POP r2
  NOP
L1:
  NOP
  LDI r0, 0x943b
  LDI r1, 0x6575
  LDI r2, 103
  MSET
  LDI r9, 0xb329
  ST [r9], r7
  LDI r15, 0
  RET
sub0:
  XOR r7, r1
  XOR r12, r0
  RET
sub1:
  ADD r9, r11
  ADD r11, r0
  SHL r0, r5
  ADD r6, r3
  ADD r11, r3
  RET
sub2:
  SUB r10, r3
  ADD r7, r0
  SHL r0, r7
  XOR r0, r5
  RET
sub3:
  XOR r10, r4
  ADD r8, r6
  SHL r3, r11
  ADD r7, r11
  RET
.org 0x2000
  .db 70, 10, 175, 78, 41, 105, 151, 19, 210, 160, 52, 85, 208, 52, 92, 253
  .db 249, 108, 68, 87, 240, 73, 167, 2, 115, 68, 53, 255, 178, 168, 157, 222
  .db 255, 171, 121, 54, 209, 62, 189, 245, 131, 155, 57, 106, 148, 11, 30, 246
  .db 1, 48, 78, 82, 174, 63, 194, 78, 203, 6, 112, 185, 192, 156, 93, 98
  .db 194, 192, 254, 48, 4, 114, 247, 248, 123, 70, 50, 164, 6, 85, 31, 105
  .db 166, 119, 3, 38, 174, 70, 132, 129, 152, 66, 157, 193, 78, 64, 143, 81
  .db 34, 96, 31, 79, 70, 140, 224, 40, 247, 27, 222, 143, 213, 83, 148, 141
  .db 96, 78, 36, 184, 171, 74, 15, 213, 98, 73, 184, 179, 66, 142, 182, 179
.bank 3
  .db 102, 145, 33, 179, 80, 232, 111, 14, 80, 150, 124, 132, 78, 119, 41, 239, 47, 7, 87, 91, 218, 123, 68, 151, 23, 73, 41, 71, 4, 59, 33, 93
.bank 4
  .db 127, 64, 33, 198, 241, 229, 203, 149, 17, 107, 100, 208, 8, 159, 182, 52, 31, 126, 196, 183, 96, 21, 247, 152, 124, 81, 49, 111, 205, 53, 153, 148
.bank 5
  .db 64, 199, 109, 233, 170, 160, 241, 180, 228, 150, 160, 245, 36, 142, 26, 155, 64, 51, 97, 211, 116, 156, 24, 151, 29, 167, 23, 114, 150, 243, 236, 95
