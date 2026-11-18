.header init, frame
init:
  LDI r0, 0xb8f6
  LDI r1, 0x8000
  LDI r2, 0x472c
  LDI r3, 0x10
  LDI r4, 0xead9
  LDI r5, 0x80
  LDI r6, 0x3
  LDI r7, 0x8eab
  LDI r8, 0x100
  LDI r9, 0x20
  LDI r10, 0x1da8
  LDI r11, 0x7f
  LDI r12, 0x4
  LDI r13, 0x4
  RET
frame:
  LDI r6, 0xb2c7
  LD r7, [r6]
  JGT L0
  MOV r0, r9
  NEG r5
  MOV r5, r1
  SRND r7, r11
L0:
  RND r4
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  FMUL r14, r3
  LDI r12, 0xffff
  STB [r12], r6
  LDI r5, 0xbdb7
  LDB r3, [r5]
  LDI r0, 0xbd6d
  LDI r1, 0xb347
  LDI r2, 111
  MSET
  XORI r4, 0xf
  NOT r5
  SHLI r6, 9
  LDI r0, 0xB300
  LDI r1, 0xba3e
  ST [r0], r1
  LDI r3, 0x655a
  LD r5, [r3]
  LDI r0, 0xB300
  LDI r1, 0xf66d
  ST [r0], r1
  CALL sub1
  LDI r8, 0x7736
  LDBX r2, [r8+0x3034]
  LDI r0, 0x9f38
  STB [r0], r8
  MUL r2, r9
  LDI r1, 0xb235
  STX [r1+0x7f], r0
  XOR r8, r8
  RND r9
  ANDI r10, 0xf
  LDI r2, 0x631f
  LD r11, [r2]
  NEG r15
  CALL sub2
  LDI r2, 0xb3a0
  LDX r5, [r2+0x8001]
  NOP
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  LDI r12, 0xb092
  LDX r10, [r12+0x2]
  LDI r1, 0x4834
  LD r6, [r1]
  LDI r4, 0x63ba
  STX [r4+0xa787], r2
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  MOV r1, r13
  LDI r6, 0x1
  LDI r0, 0xe060
  LDB r0, [r0]
  LDI r0, 0xb267
  LDI r1, 0xb28a
  LDI r2, 218
  MCPY
  LDI r0, 0xB322
  LDI r1, 11
  STB [r0], r1
  CMPI r14, 0x1
  RND r2
  MUL r13, r6
  LDI r7, 0x6931
  LDB r12, [r7]
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  JC L1
  CALL sub0
  LDI r6, 0x603c
  STX [r6+0x8], r8
L1:
  LDI r3, 0xb382
  LDX r2, [r3+0xffff]
  LDI r0, 0xB322
  LDI r1, 25
  STB [r0], r1
  LDI r2, 0x7fff
  LDI r12, 0xbb01
  LDX r12, [r12+0x39cc]
  SRND r0, r7
  JMP L2
  MOV r8, r2
  MOV r3, r7
  RND r7
  LDI r0, 0xB300
  LDI r1, 0x66e2
  ST [r0], r1
L2:
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOP
  ADDI r13, 0x2
  LDI r2, 0xb2c6
  STB [r2], r1
  MOD r13, r6
  LDI r4, 0x952b
  LDBX r4, [r4+0x3]
  LDI r8, 0x86de
  LDB r8, [r8]
  CALL sub0
  LDI r12, 0x7b77
  STBX [r12+0x4b55], r9
  NEG r5
  SARI r6, 9
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 35
  STB [r0], r1
  LDI r0, 0xB300
  LDI r1, 0xef8a
  ST [r0], r1
  MUL r2, r1
  SRND r11, r2
  LDI r7, 0xb26c
  LDB r0, [r7]
  MUL r7, r14
  LDI r4, 0x8491
  POP r1
  CALL sub2
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  ORI r5, 0x8
  POP r1
  LDI r8, 0xb2c0
  LDBX r6, [r8+0x95c3]
  PUSH r4
  LDI r0, 0xb134
  LDI r1, 0x69cb
  LDI r2, 45
  MCPY
  SRND r5, r4
  MUL r3, r6
  LDI r0, 0xaadf
  LDI r1, 0x76d1
  LDI r2, 85
  MSET
  MOV r5, r5
  ANDI r12, 0x10
  LDI r0, 0x765d
  LDI r1, 0x6da6
  LDI r2, 52
  MCPY
  LDI r0, 0xB300
  LDI r1, 0x800d
  ST [r0], r1
  LDI r9, 0x9a81
  ST [r9], r6
  PUSH r11
  LDI r0, 0xb37c
  STBX [r0+0x2], r8
  LDI r0, 0xb01f
  LDI r1, 0x3a2b
  LDI r2, 0
  MSET
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r8, 0xb0c4
  STB [r8], r12
  LDI r11, 0xacd5
  LDX r3, [r11+0x1]
  LDI r15, 0
  RET
sub0:
  SHL r11, r5
  XOR r2, r7
  SUB r11, r2
  RET
sub1:
  XOR r2, r2
  ADD r0, r1
  RET
sub2:
  XOR r4, r0
  XOR r11, r8
  RET
sub3:
  SHL r2, r8
  XOR r7, r2
  SUB r7, r2
  XOR r9, r11
  SHL r2, r5
  RET
.org 0x2000
  .db 34, 22, 240, 114, 59, 96, 29, 127, 84, 255, 248, 51, 239, 52, 18, 145
  .db 37, 213, 181, 185, 234, 143, 71, 65, 168, 19, 46, 209, 199, 87, 141, 27
  .db 153, 72, 153, 133, 252, 12, 131, 241, 25, 162, 136, 152, 174, 146, 231, 50
  .db 249, 77, 150, 160, 209, 210, 3, 233, 43, 246, 150, 174, 174, 46, 237, 62
  .db 196, 152, 73, 238, 51, 233, 188, 131, 157, 52, 202, 135, 13, 117, 180, 252
  .db 129, 0, 236, 183, 224, 106, 181, 194, 232, 2, 52, 135, 202, 140, 70, 150
  .db 184, 207, 51, 122, 204, 72, 146, 102, 115, 8, 94, 181, 197, 147, 163, 60
  .db 40, 242, 107, 211, 44, 171, 253, 153, 217, 124, 37, 56, 231, 13, 83, 93
.bank 3
  .db 179, 191, 137, 46, 194, 250, 171, 110, 36, 205, 172, 6, 40, 128, 144, 55, 186, 238, 139, 133, 180, 153, 77, 190, 25, 223, 199, 26, 201, 151, 146, 115
.bank 4
  .db 9, 118, 113, 16, 224, 107, 106, 46, 97, 134, 224, 198, 221, 154, 91, 203, 222, 224, 192, 181, 27, 223, 138, 199, 38, 230, 149, 31, 152, 45, 76, 206
.bank 5
  .db 132, 135, 168, 217, 11, 19, 160, 114, 215, 34, 13, 96, 99, 191, 137, 93, 129, 153, 188, 54, 204, 191, 73, 144, 47, 78, 254, 192, 105, 79, 184, 84
