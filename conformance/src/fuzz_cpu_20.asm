.header init, frame
init:
  LDI r0, 0x10
  LDI r1, 0xffff
  LDI r2, 0x10
  LDI r3, 0x3
  LDI r4, 0x1
  LDI r5, 0x1f
  LDI r6, 0xffff
  LDI r7, 0x2
  LDI r8, 0x2
  LDI r9, 0x7
  LDI r10, 0x1
  LDI r11, 0x100
  LDI r12, 0x7fff
  LDI r13, 0x7
  RET
frame:
  NOP
  CALL sub0
  MULI r12, 0x10
  SRND r10, r7
  LDI r0, 0xb2a8
  LDI r1, 0xb277
  LDI r2, 246
  MCPY
  NEG r6
  NOP
  LDI r9, 0xf135
  STBX [r9+0x7f], r7
  PUSH r8
  LDI r0, 0xB300
  LDI r1, 0x74f5
  ST [r0], r1
  NOP
  LDI r0, 0xb2b9
  LDI r1, 0xfff1
  LDI r2, 31
  MSET
  LDI r0, 0xB300
  LDI r1, 0xcde5
  ST [r0], r1
  LDI r7, 0x7fff
  SRND r1, r12
  JGT L0
  SARI r13, 1
  LDI r4, 0xb88b
  LDBX r8, [r4+0x20]
  RND r1
  NOP
  LDI r11, 0xfff4
  STB [r11], r5
L0:
  JBE L1
  LDI r2, 0xd50
  ST [r2], r4
L1:
  LDI r0, 0xB300
  LDI r1, 0x6711
  ST [r0], r1
  ADD r11, r1
  MOV r10, r13
  JNZ L2
  LDI r0, 0x4cba
  LDI r1, 0x6579
  LDI r2, 214
  MCPY
L2:
  ADD r4, r2
  POP r12
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  SUB r12, r13
  LDI r12, 0x31fa
  STB [r12], r6
  NOP
  CMPI r12, 0x3
  LDI r0, 0x5c40
  LDI r1, 0xac98
  LDI r2, 63
  MSET
  SRND r4, r1
  SRND r5, r5
  LDI r6, 0x4bcb
  LD r10, [r6]
  POP r11
  SRND r1, r5
  SHR r8, r8
  MOV r6, r4
  SRND r3, r9
  LDI r6, 0xb333
  LDB r3, [r6]
  NOP
  SHRI r9, 15
  NOP
  MOV r15, r13
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOT r9
  NEG r10
  SRND r4, r10
  NOP
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  MOV r12, r15
  NEG r15
  SAR r12, r9
  LDI r1, 0xd551
  STX [r1+0x2], r0
  SARI r15, 3
  LDI r0, 0xb636
  LDI r1, 0xc8e6
  LDI r2, 88
  MCPY
  LDI r9, 0x8768
  LDI r2, 0xb015
  STX [r2+0x7], r7
  NOP
  NOP
  SRND r2, r12
  SARI r1, 9
  LDI r5, 0xae6f
  STBX [r5+0x1f87], r8
  LDI r4, 0xbea0
  STBX [r4+0x0], r7
  LDI r3, 0xb30a
  STBX [r3+0x8], r10
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 17
  STB [r0], r1
  LDI r11, 0x8621
  STBX [r11+0xfffe], r1
  ADD r7, r12
  XORI r1, 0xf
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  LDI r11, 0xb105
  LD r11, [r11]
  LDI r1, 0x742
  STB [r1], r3
  POP r11
  NOP
  LDI r1, 0x80
  NOP
  CALL sub3
  NOP
  CALL sub3
  LDI r0, 0xB300
  LDI r1, 0xeff9
  ST [r0], r1
  LDI r11, 0x63c6
  LDI r5, 0xb046
  STB [r5], r9
  LDI r0, 0xB300
  LDI r1, 0xe1a7
  ST [r0], r1
  JLE L3
  LDI r5, 0xfffb
  STB [r5], r3
L3:
  MUL r0, r1
  NOP
  CALL sub1
  LDI r0, 0xB322
  LDI r1, 11
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r11, 0xb3c6
  LDX r4, [r11+0x0]
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  HALT
  PUSH r1
  LDI r0, 0xdb41
  LDI r1, 0x6862
  LDI r2, 298
  MSET
  LDI r1, 0x6720
  LDX r9, [r1+0xe03a]
  LDI r15, 0
  RET
sub0:
  ADD r10, r3
  ADD r4, r4
  RET
sub1:
  SHL r3, r4
  XOR r0, r9
  ADD r5, r7
  SUB r1, r3
  RET
sub2:
  SUB r10, r3
  ADD r12, r9
  ADD r10, r7
  XOR r12, r12
  XOR r5, r10
  RET
sub3:
  ADD r6, r7
  ADD r6, r3
  SHL r1, r7
  SUB r12, r7
  RET
.org 0x2000
  .db 40, 78, 125, 162, 208, 80, 136, 226, 232, 187, 246, 54, 120, 30, 60, 3
  .db 203, 141, 69, 55, 7, 50, 139, 97, 160, 137, 152, 18, 21, 23, 63, 140
  .db 200, 148, 154, 157, 27, 7, 111, 15, 123, 185, 111, 101, 177, 173, 110, 231
  .db 194, 213, 119, 14, 184, 174, 217, 121, 6, 106, 210, 125, 225, 76, 156, 49
  .db 170, 26, 199, 173, 65, 128, 84, 38, 21, 229, 209, 195, 117, 128, 107, 116
  .db 88, 139, 127, 117, 29, 108, 224, 90, 109, 219, 248, 162, 35, 237, 49, 72
  .db 72, 74, 215, 168, 121, 36, 28, 226, 10, 107, 111, 210, 212, 226, 32, 154
  .db 237, 77, 114, 203, 94, 226, 144, 224, 0, 41, 144, 208, 30, 6, 251, 218
.bank 3
  .db 219, 72, 217, 234, 40, 31, 100, 185, 197, 23, 199, 147, 107, 15, 148, 252, 58, 128, 34, 185, 123, 219, 83, 132, 83, 6, 94, 9, 245, 214, 154, 190
.bank 4
  .db 110, 209, 170, 151, 202, 222, 162, 232, 200, 140, 145, 37, 144, 172, 59, 58, 135, 243, 242, 33, 159, 98, 118, 183, 26, 4, 111, 126, 123, 167, 20, 38
.bank 5
  .db 176, 238, 140, 16, 127, 176, 247, 233, 38, 39, 152, 155, 144, 115, 162, 252, 226, 73, 59, 157, 77, 16, 81, 240, 91, 123, 199, 111, 205, 205, 247, 167
