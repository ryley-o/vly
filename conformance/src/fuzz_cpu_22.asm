.header init, frame
init:
  LDI r0, 0x7f
  LDI r1, 0x80
  LDI r2, 0x7f
  LDI r3, 0x8
  LDI r4, 0x1f
  LDI r5, 0x9d9c
  LDI r6, 0x7fff
  LDI r7, 0x8000
  LDI r8, 0x4
  LDI r9, 0x8
  LDI r10, 0x687a
  LDI r11, 0x7fff
  LDI r12, 0x3
  LDI r13, 0x1
  RET
frame:
  LDI r8, 0xbcd7
  LDBX r8, [r8+0xffff]
  MUL r11, r12
  PUSH r9
  NOP
  LDI r0, 0xB300
  LDI r1, 0xcd61
  ST [r0], r1
  MOV r7, r9
  LDI r9, 0xab3a
  STX [r9+0x4], r5
  LDI r2, 0xb73d
  ST [r2], r7
  NOP
  POP r3
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r3, 0x3
  CALL sub1
  CALLR r8
  LDI r0, 0xB322
  LDI r1, 13
  STB [r0], r1
  PUSH r13
  LDI r5, 0xf
  RND r5
  POP r2
  POP r8
  SARI r0, 3
  LDI r0, 0xfff5
  LDI r1, 0xb215
  LDI r2, 53
  MSET
  LDI r1, 0xb2bc
  LDX r11, [r1+0xb618]
  LDI r4, 0xb331
  STBX [r4+0x3], r2
  LDI r12, 0x7ac7
  LD r7, [r12]
  NOP
  DIV r8, r0
  LDI r10, 0xaf6b
  ST [r10], r0
  NOT r4
  NOP
  LDI r4, 0xb14c
  LDB r7, [r4]
  PUSH r11
  PUSH r10
  MULI r2, 0xffff
  LDI r0, 0xfff8
  LDI r1, 0x6897
  LDI r2, 274
  MCPY
  LDI r0, 0xB300
  LDI r1, 0x3308
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 13
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  POP r13
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  SRND r7, r3
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  ORI r12, 0xb399
  LDI r10, 0xb3f1
  LDB r0, [r10]
  LDI r0, 0xcac
  LDI r1, 0x6066
  LDI r2, 8
  MSET
  PUSH r4
  NOT r8
  MOV r15, r11
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  MOV r6, r4
  SARI r6, 12
  XORI r13, 0x8
  MOV r1, r5
  PUSH r7
  LDI r0, 0xB322
  LDI r1, 27
  STB [r0], r1
  MOV r8, r6
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r3, 0xfff0
  STB [r3], r8
  RND r9
  LDI r0, 0xB322
  LDI r1, 5
  STB [r0], r1
  HALT
  POP r1
  NOP
  LDI r0, 0x6518
  LDI r1, 0xb02e
  LDI r2, 185
  MCPY
  LDI r3, 0x18fe
  LDI r9, 0xb333
  MOV r7, r8
  JNC L0
  LDI r5, 0xb028
  LD r4, [r5]
  NOP
  LDI r13, 0xaad3
L0:
  TST r10, r4
  MOV r4, r3
  RND r3
  LDI r10, 0x6519
  LDBX r5, [r10+0x1]
  NEG r9
  SRND r1, r0
  POP r12
  LDI r5, 0x68d
  STB [r5], r12
  LDI r0, 0xB322
  LDI r1, 39
  STB [r0], r1
  LDI r3, 0x7c61
  LDI r0, 0xB322
  LDI r1, 27
  STB [r0], r1
  LDI r1, 0x68ed
  LDBX r6, [r1+0x1f]
  LDI r10, 0xfff3
  STX [r10+0x7f], r3
  NOP
  LDI r10, 0xb355
  STX [r10+0x8], r0
  LDI r0, 0xB322
  LDI r1, 27
  STB [r0], r1
  POP r1
  NOP
  LDI r0, 0xB322
  LDI r1, 3
  STB [r0], r1
  LDI r0, 0x9bb
  NOP
  LDI r0, 0xdee7
  LDI r1, 0x60e5
  LDI r2, 140
  MSET
  NOP
  LDI r0, 0xB300
  LDI r1, 0xf71d
  ST [r0], r1
  LDI r2, 0xa671
  STB [r2], r3
  SHRI r11, 12
  LDI r7, 0xb8ef
  LDX r10, [r7+0x80]
  PUSH r5
  LDI r0, 0xB322
  LDI r1, 0
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  NOP
  LDI r8, 0xffff
  NOP
  LDI r8, 0x7991
  ST [r8], r4
  NEG r13
  LDI r9, 0xb1fd
  STX [r9+0xfffe], r12
  NOP
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  JLE L1
  LDI r3, 0xf
  SHLI r1, 3
  RND r0
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
L1:
  LDI r3, 0xfff1
  LDBX r12, [r3+0x3]
  JLE L2
  JLE L3
  LDI r3, 0xea39
  LDX r1, [r3+0x8000]
  LDI r4, 0xffff
  STBX [r4+0x81a0], r8
  LDI r0, 0xb066
  LDI r1, 0xfffb
  LDI r2, 26
  MCPY
L3:
  NOP
L2:
  LDI r0, 0xd343
  NEG r1
  PUSH r1
  TST r2, r1
  JGT L4
  ORI r1, 0x0
  NOP
  MOV r6, r12
  RND r4
  LDI r0, 0xfff8
  LDI r1, 0x6350
  LDI r2, 136
  MCPY
L4:
  LDI r11, 0xeaf1
  LDI r8, 0x64f6
  ST [r8], r3
  JC L5
  LDI r0, 0xB300
  LDI r1, 0x9f8e
  ST [r0], r1
  SRND r3, r5
  LDI r9, 0xb28b
  STB [r9], r6
  LDI r9, 0x2c15
L5:
  LDI r4, 0xafef
  ST [r4], r7
  RND r13
  LDI r14, 0x6163
  PUSH r12
  LDI r13, 0xbed5
  PUSH r0
  SRND r0, r9
  LDI r0, 0xe9cb
  LDI r1, 0xcf2c
  LDI r2, 154
  MSET
  LDI r0, 0x6360
  LDI r1, 0xb366
  LDI r2, 17
  MCPY
  LDI r7, 0xb2f7
  LDBX r4, [r7+0x1]
  LDI r0, 0xB322
  LDI r1, 24
  STB [r0], r1
  NOP
  LDI r2, 0x6e64
  LDX r9, [r2+0xce39]
  LDI r4, 0x29f7
  LDBX r9, [r4+0x4]
  SHLI r7, 8
  LDI r0, 0xb1c9
  LDI r1, 0x610f
  LDI r2, 242
  MSET
  NOP
  LDI r1, 0x4395
  LDBX r5, [r1+0x3cf8]
  PUSH r8
  LDI r0, 0xB300
  LDI r1, 0x4ad9
  ST [r0], r1
  CALL sub2
  PUSH r13
  PUSH r0
  LDI r14, 0x1c47
  LDI r11, 0xb2c6
  STBX [r11+0x10], r1
  XORI r7, 0xdbe5
  NOP
  LDI r8, 0xb2fd
  ST [r8], r8
  CALL sub2
  LDI r15, 0
  RET
sub0:
  ADD r12, r11
  SUB r10, r8
  SHL r0, r8
  RET
sub1:
  SUB r10, r4
  SHL r1, r11
  RET
sub2:
  SHL r1, r1
  SUB r3, r1
  RET
sub3:
  XOR r12, r5
  SUB r12, r6
  ADD r8, r4
  RET
.org 0x2000
  .db 37, 55, 118, 55, 199, 255, 99, 168, 103, 53, 220, 59, 136, 208, 29, 174
  .db 252, 214, 9, 160, 154, 126, 115, 46, 117, 168, 5, 199, 26, 47, 154, 113
  .db 218, 68, 245, 173, 226, 9, 146, 191, 235, 16, 161, 74, 166, 70, 212, 0
  .db 69, 96, 87, 205, 178, 140, 230, 158, 36, 202, 163, 234, 74, 191, 30, 57
  .db 94, 35, 213, 254, 198, 254, 110, 62, 121, 150, 199, 163, 54, 65, 141, 60
  .db 192, 38, 54, 14, 193, 177, 134, 13, 151, 133, 227, 151, 224, 186, 24, 144
  .db 180, 64, 79, 60, 32, 195, 91, 252, 96, 240, 149, 13, 58, 61, 80, 213
  .db 152, 28, 65, 175, 137, 199, 124, 215, 105, 202, 68, 49, 168, 201, 147, 120
.bank 3
  .db 132, 166, 114, 58, 15, 197, 212, 249, 187, 84, 69, 81, 95, 22, 224, 3, 248, 40, 175, 150, 5, 100, 126, 85, 81, 24, 165, 52, 93, 40, 124, 27
.bank 4
  .db 46, 163, 108, 138, 140, 129, 37, 170, 75, 125, 35, 101, 64, 154, 102, 238, 236, 123, 142, 18, 254, 133, 139, 184, 53, 85, 195, 47, 179, 133, 19, 1
.bank 5
  .db 163, 82, 213, 198, 59, 107, 208, 142, 182, 85, 124, 16, 247, 67, 140, 248, 237, 83, 239, 167, 243, 246, 188, 68, 90, 188, 14, 96, 196, 163, 44, 117
