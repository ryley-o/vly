.header init, frame
init:
  LDI r0, 0x655
  LDI r1, 0x1
  LDI r2, 0x8000
  LDI r3, 0x8
  LDI r4, 0x7f
  LDI r5, 0x4
  LDI r6, 0x8001
  LDI r7, 0xff
  LDI r8, 0x2
  LDI r9, 0x20
  LDI r10, 0x835d
  LDI r11, 0xffff
  LDI r12, 0x10
  LDI r13, 0x8000
  RET
frame:
  LDI r1, 0x9505
  LDB r7, [r1]
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r2, 0x6288
  LDBX r11, [r2+0x7f]
  PUSH r13
  CALL sub2
  LDI r8, 0xb022
  LD r10, [r8]
  POP r7
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r9, 0x3075
  STX [r9+0x4019], r3
  RND r15
  LDI r7, 0xfffa
  LDBX r2, [r7+0x10]
  POP r12
  MOV r4, r3
  LDI r5, 0x2f99
  STX [r5+0x2], r3
  LDI r11, 0xad00
  LDX r3, [r11+0x4]
  LDI r0, 0xB300
  LDI r1, 0xc931
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x54de
  ST [r0], r1
  JLE L0
  LDI r10, 0xb3fc
  STBX [r10+0x1], r8
  SRND r1, r11
  LDI r0, 0x6292
  LDI r1, 0xfff8
  LDI r2, 281
  MCPY
  SHLI r3, 6
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
L0:
  LDI r5, 0x6842
  CMPI r1, 0x9bda
  LDI r0, 0xa9a3
  LDI r1, 0xb2fe
  LDI r2, 30
  MSET
  LDI r2, 0xf
  SHRI r5, 11
  RND r1
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  LDI r0, 0xba6e
  LDI r1, 0xb249
  LDI r2, 251
  MSET
  LDI r1, 0xb291
  STB [r1], r5
  LDI r7, 0xff67
  STX [r7+0x65cd], r3
  PUSH r2
  PUSH r7
  PUSH r4
  CALL sub2
  SRND r5, r6
  FMUL r3, r4
  LDI r0, 0xB300
  LDI r1, 0xd84c
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  CALL sub2
  LDI r8, 0x2b94
  LD r2, [r8]
  SHRI r4, 14
  LDI r3, 0xa9f7
  LDB r11, [r3]
  NOP
  LDI r0, 0xB300
  LDI r1, 0xe0e
  ST [r0], r1
  NOP
  LDI r9, 0x6396
  LDBX r4, [r9+0x2]
  LDI r11, 0x774f
  STB [r11], r4
  PUSH r5
  NOT r12
  NOP
  NOP
  SHRI r13, 4
  CMPI r13, 0x100
  LDI r12, 0x676f
  STX [r12+0x7fff], r3
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0x60a6
  LDI r1, 0xb10e
  LDI r2, 149
  MSET
  LDI r4, 0xb3e0
  STX [r4+0x1], r2
  NOP
  POP r7
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  POP r8
  LDI r0, 0xB300
  LDI r1, 0x4c23
  ST [r0], r1
  LDI r9, 0xb2a6
  STB [r9], r12
  SRND r10, r6
  CALLR r10
  LDI r9, 0x664d
  LDBX r4, [r9+0x7fff]
  MOV r4, r15
  NOP
  LDI r0, 0xB300
  LDI r1, 0x423a
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0xac74
  ST [r0], r1
  LDI r1, 0xb274
  LDX r10, [r1+0x100]
  POP r12
  LDI r6, 0xf486
  STB [r6], r9
  LDI r5, 0xcd31
  ST [r5], r5
  LDI r11, 0xe8fc
  STBX [r11+0x10], r2
  JLE L1
  NOP
  LDI r1, 0xd5b9
  STX [r1+0xc46d], r0
L1:
  NOT r3
  RND r10
  LDI r9, 0x80fc
  STB [r9], r10
  SHRI r6, 4
  LDI r0, 0xdacf
  LDI r1, 0xb004
  LDI r2, 13
  MSET
  TST r8, r1
  SRND r6, r4
  NOP
  LDI r5, 0x183a
  LDBX r3, [r5+0x8000]
  MULI r10, 0x60b
  NOP
  MULI r8, 0x7fff
  MOV r0, r0
  LDI r7, 0xb2dd
  LDBX r0, [r7+0xf]
  LDI r5, 0x1c41
  LD r7, [r5]
  NOP
  NOP
  RND r3
  JLT L2
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
L2:
  LDI r15, 0
  RET
sub0:
  SHL r5, r3
  XOR r0, r2
  SHL r8, r10
  RET
sub1:
  SHL r10, r0
  SHL r10, r5
  RET
sub2:
  XOR r2, r0
  SHL r7, r2
  XOR r10, r3
  RET
sub3:
  SUB r5, r2
  SHL r11, r4
  SHL r8, r5
  RET
.org 0x2000
  .db 56, 83, 28, 79, 58, 36, 155, 152, 248, 120, 216, 58, 246, 66, 204, 53
  .db 83, 10, 238, 25, 105, 45, 8, 192, 124, 135, 101, 22, 47, 252, 160, 182
  .db 230, 161, 187, 10, 217, 7, 172, 229, 120, 112, 33, 145, 230, 147, 123, 25
  .db 254, 126, 107, 124, 172, 1, 217, 62, 125, 206, 43, 51, 63, 222, 224, 138
  .db 176, 11, 144, 162, 146, 179, 251, 31, 67, 247, 143, 156, 120, 50, 198, 107
  .db 135, 175, 178, 48, 188, 151, 33, 86, 144, 100, 134, 24, 123, 112, 245, 8
  .db 133, 155, 171, 84, 215, 77, 245, 196, 192, 184, 113, 88, 54, 191, 218, 84
  .db 127, 58, 69, 162, 155, 41, 193, 143, 83, 86, 112, 240, 165, 50, 223, 172
.bank 3
  .db 203, 43, 61, 249, 10, 190, 42, 130, 230, 106, 243, 114, 222, 233, 221, 214, 18, 131, 20, 164, 144, 132, 228, 76, 113, 56, 202, 43, 33, 203, 80, 5
.bank 4
  .db 131, 88, 7, 45, 146, 205, 192, 172, 85, 124, 104, 69, 140, 128, 222, 71, 168, 3, 130, 211, 150, 92, 77, 165, 165, 100, 39, 144, 60, 142, 27, 56
.bank 5
  .db 39, 139, 180, 132, 82, 20, 191, 121, 193, 139, 203, 6, 74, 51, 21, 219, 68, 198, 15, 4, 223, 254, 188, 250, 115, 174, 116, 39, 161, 251, 66, 121
