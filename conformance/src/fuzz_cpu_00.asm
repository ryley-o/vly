.header init, frame
init:
  LDI r0, 0xffff
  LDI r1, 0x7fff
  LDI r2, 0x10
  LDI r3, 0xfffe
  LDI r4, 0x3
  LDI r5, 0x20
  LDI r6, 0xff
  LDI r7, 0x8001
  LDI r8, 0xf
  LDI r9, 0x80
  LDI r10, 0x8
  LDI r11, 0x3
  LDI r12, 0xf
  LDI r13, 0x528d
  RET
frame:
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x48f
  ST [r0], r1
  LDI r3, 0x6307
  STBX [r3+0x3], r11
  POP r0
  MOV r7, r3
  LDI r10, 0x6dcc
  LDX r2, [r10+0x8000]
  SRND r5, r12
  LDI r12, 0xb322
  STX [r12+0xf], r2
  ADD r9, r9
  NOT r1
  NOT r7
  MOV r2, r9
  NOP
  LDI r0, 0xB322
  LDI r1, 19
  STB [r0], r1
  NEG r11
  RND r6
  LDI r11, 0x601a
  STX [r11+0x0], r9
  LDI r3, 0xbec2
  STB [r3], r1
  NOP
  LDI r5, 0x6069
  ST [r5], r0
  NEG r13
  NOP
  NOT r9
  POP r7
  PUSH r5
  PUSH r13
  CALL sub3
  LDI r0, 0xB300
  LDI r1, 0x1533
  ST [r0], r1
  SARI r10, 6
  LDI r0, 0xbffe
  LDB r7, [r0]
  LDI r8, 0xafb9
  LDBX r1, [r8+0x255]
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  SRND r10, r11
  CMPI r3, 0x7
  ORI r3, 0x0
  RND r6
  PUSH r7
  CALL sub3
  NOP
  SHRI r13, 15
  CALLR r4
  LDI r4, 0x6689
  LDI r8, 0xbdb9
  LDB r10, [r8]
  NOP
  LDI r11, 0x82c8
  LDX r4, [r11+0x94f8]
  NOP
  SRND r1, r6
  SHLI r1, 12
  LDI r12, 0xb265
  SRND r8, r2
  LDI r0, 0xB322
  LDI r1, 22
  STB [r0], r1
  LDI r0, 0xB300
  LDI r1, 0xd74e
  ST [r0], r1
  LDI r9, 0x804b
  LD r0, [r9]
  PUSH r1
  LDI r9, 0x1bc8
  LDI r0, 0xB322
  LDI r1, 22
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NOP
  CALL sub1
  LDI r9, 0x7c7b
  LDB r8, [r9]
  SHRI r15, 4
  JNC L0
  LDI r0, 0x98ef
  LDI r1, 0x625f
  LDI r2, 77
  MCPY
  LDI r7, 0xb368
  LDBX r8, [r7+0x5d20]
L0:
  CALL sub3
  SHRI r9, 2
  NOP
  LDI r11, 0xd4fb
  STB [r11], r2
  NOP
  SRND r0, r2
  SRND r3, r6
  MOV r8, r4
  LDI r0, 0x10
  LDI r10, 0xb218
  STBX [r10+0x7], r12
  SHLI r2, 3
  CALL sub3
  NOP
  LDI r0, 0xB300
  LDI r1, 0xf51f
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  CMPI r5, 0x7fff
  NOP
  MULI r1, 0x7
  NOP
  CALL sub2
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  SHLI r8, 1
  ADDI r9, 0x7373
  SRND r8, r0
  LDI r0, 0xB300
  LDI r1, 0xdef2
  ST [r0], r1
  SRND r3, r9
  JA L1
  SHRI r13, 15
  LDI r6, 0xb1b9
  LDBX r10, [r6+0x4daa]
  POP r14
  SRND r12, r4
L1:
  LDI r0, 0xB322
  LDI r1, 3
  STB [r0], r1
  CALLR r4
  LDI r11, 0xae83
  LDB r8, [r11]
  CALL sub2
  NOP
  LDI r7, 0x69a4
  LD r0, [r7]
  PUSH r11
  LDI r3, 0x20
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  NOP
  LDI r0, 0x2d5f
  LDI r1, 0xb26b
  LDI r2, 79
  MSET
  PUSH r13
  CALL sub0
  SRND r0, r1
  CALLR r7
  CALL sub1
  JC L2
  SRND r9, r6
  RND r9
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  CALL sub2
L2:
  ANDI r9, 0x3
  RND r7
  LDI r10, 0xb2fe
  STBX [r10+0x7f], r12
  SRND r6, r10
  LDI r0, 0xB322
  LDI r1, 9
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 37
  STB [r0], r1
  ADDI r2, 0x0
  PUSH r10
  LDI r5, 0x6029
  LDBX r8, [r5+0x10]
  OR r2, r1
  NOP
  LDI r0, 0xac0e
  LDI r1, 0xb369
  LDI r2, 45
  MSET
  LDI r4, 0xa6c7
  LDB r12, [r4]
  NOT r2
  NOP
  LDI r0, 0xB322
  LDI r1, 20
  STB [r0], r1
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  NOP
  CALL sub2
  NOP
  LDI r0, 0xB322
  LDI r1, 28
  STB [r0], r1
  NOP
  SRND r7, r6
  LDI r2, 0xba7b
  ST [r2], r0
  SRND r6, r11
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  SHLI r6, 2
  SRND r10, r11
  NOT r0
  LDI r4, 0xb2a4
  STBX [r4+0x7f], r11
  NOP
  LDI r10, 0xf
  LDI r0, 0xB300
  LDI r1, 0x51e0
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r8
  NOP
  LDI r9, 0xa7b6
  STB [r9], r3
  SARI r5, 11
  SHL r12, r5
  LDI r3, 0x9a94
  LDBX r7, [r3+0x10]
  RND r9
  SHRI r0, 13
  NOP
  LDI r0, 0xb25d
  LDI r1, 0x808e
  LDI r2, 188
  MSET
  POP r8
  NOP
  SRND r11, r5
  NOP
  LDI r0, 0xB322
  LDI r1, 13
  STB [r0], r1
  POP r11
  LDI r9, 0xeb96
  LDBX r5, [r9+0xf]
  LDI r0, 0xB322
  LDI r1, 16
  STB [r0], r1
  LDI r8, 0xb275
  POP r5
  NOP
  LDI r15, 0
  RET
sub0:
  ADD r8, r4
  ADD r2, r1
  XOR r11, r7
  RET
sub1:
  SUB r2, r8
  ADD r4, r4
  RET
sub2:
  ADD r7, r4
  XOR r5, r4
  RET
sub3:
  XOR r11, r0
  SHL r4, r0
  SHL r6, r10
  SUB r6, r5
  RET
.org 0x2000
  .db 20, 196, 176, 243, 162, 24, 218, 35, 115, 54, 166, 15, 94, 162, 4, 214
  .db 97, 13, 217, 129, 244, 99, 225, 229, 190, 66, 103, 41, 250, 204, 208, 149
  .db 149, 142, 125, 56, 161, 44, 55, 37, 161, 66, 200, 244, 250, 0, 40, 173
  .db 24, 68, 23, 109, 77, 248, 56, 123, 44, 189, 39, 123, 80, 245, 107, 1
  .db 213, 203, 30, 223, 220, 88, 38, 164, 99, 128, 126, 100, 14, 79, 182, 226
  .db 131, 165, 31, 76, 88, 190, 216, 239, 68, 234, 14, 128, 10, 47, 131, 38
  .db 24, 30, 6, 105, 233, 107, 112, 181, 239, 60, 171, 203, 247, 201, 42, 214
  .db 202, 160, 102, 183, 237, 78, 17, 194, 57, 119, 254, 252, 133, 124, 92, 234
.bank 3
  .db 160, 252, 161, 95, 238, 154, 126, 113, 228, 198, 175, 77, 0, 74, 59, 82, 199, 234, 94, 215, 162, 25, 124, 120, 195, 13, 95, 150, 232, 81, 22, 47
.bank 4
  .db 254, 88, 48, 207, 122, 245, 225, 163, 242, 1, 39, 72, 13, 157, 162, 141, 24, 164, 160, 133, 115, 115, 78, 215, 74, 114, 192, 36, 254, 238, 173, 189
.bank 5
  .db 90, 206, 80, 203, 226, 239, 223, 235, 240, 14, 234, 146, 21, 157, 150, 12, 81, 93, 72, 243, 152, 240, 92, 225, 56, 196, 37, 221, 132, 85, 214, 252
