.header init, frame
init:
  LDI r0, 0x3823
  LDI r1, 0xf
  LDI r2, 0xf2f4
  LDI r3, 0xffff
  LDI r4, 0xa877
  LDI r5, 0x7
  LDI r6, 0x10
  LDI r7, 0x7f
  LDI r8, 0x100
  LDI r9, 0x8001
  LDI r10, 0x8000
  LDI r11, 0x482a
  LDI r12, 0xf
  LDI r13, 0x0
  RET
frame:
  LDI r0, 0xB300
  LDI r1, 0x40d1
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r6
  NOP
  LDI r3, 0x63ae
  STBX [r3+0x1810], r10
  NOP
  CALL sub2
  LDI r5, 0xdd87
  SARI r12, 7
  LDI r2, 0xb1e4
  STBX [r2+0x7fff], r3
  LDI r6, 0xb1e1
  STBX [r6+0x8d7], r9
  NOP
  NOP
  NOP
  SRND r9, r0
  LDI r0, 0xB300
  LDI r1, 0xc91
  ST [r0], r1
  NOT r1
  POP r13
  LDI r2, 0xb05a
  STBX [r2+0x1], r7
  CALL sub3
  ORI r3, 0xffff
  POP r0
  MUL r13, r5
  NOT r14
  LDI r11, 0xb1d9
  STB [r11], r6
  RND r13
  NOP
  POP r8
  LDI r4, 0xfff6
  LDB r6, [r4]
  CALL sub2
  LDI r0, 0xB300
  LDI r1, 0xb2ee
  ST [r0], r1
  CALL sub3
  LDI r13, 0xb247
  NOP
  RND r13
  LDI r3, 0x8001
  PUSH r6
  JMP L0
  LDI r0, 0xB300
  LDI r1, 0xe863
  ST [r0], r1
  RND r0
  PUSH r12
  MOV r3, r12
  XORI r8, 0x3
  LDI r0, 0xB300
  LDI r1, 0x9bd5
  ST [r0], r1
L0:
  SARI r8, 13
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  NOP
  JNZ L1
  LDI r0, 0xfff6
  LDI r1, 0xb263
  LDI r2, 199
  MSET
L1:
  LDI r4, 0x6323
  LDX r9, [r4+0x45d1]
  ADDI r3, 0x20
  NOP
  LDI r11, 0x6024
  LDX r10, [r11+0x20]
  OR r8, r9
  CALL sub3
  RND r1
  SHRI r1, 1
  LDI r0, 0x6787
  LDI r1, 0xb09c
  LDI r2, 163
  MSET
  NOP
  MUL r7, r8
  LDI r0, 0xB322
  LDI r1, 14
  STB [r0], r1
  CMP r11, r11
  SRND r10, r12
  NOP
  SUB r1, r8
  CALL sub3
  MOV r2, r7
  RND r9
  SHLI r1, 2
  LDI r9, 0xb275
  LD r12, [r9]
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  PUSH r10
  CALL sub0
  JGT L2
  LDI r6, 0xffff
  LDB r2, [r6]
  NEG r0
  LDI r7, 0x642e
  LD r9, [r7]
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
L2:
  LDI r0, 0x6ee7
  LDI r1, 0x644d
  LDI r2, 164
  MCPY
  MOV r5, r7
  CMPI r6, 0x3
  POP r2
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r3, 0x624c
  STX [r3+0x7fff], r2
  LDI r11, 0xd879
  LDBX r12, [r11+0x8000]
  LDI r4, 0x608d
  STB [r4], r8
  RND r2
  NOP
  SRND r1, r5
  LDI r8, 0xb359
  ST [r8], r5
  SRND r7, r5
  RND r13
  LDI r10, 0x687f
  STBX [r10+0xfffe], r1
  NOP
  NOP
  XOR r3, r7
  LDI r0, 0xB322
  LDI r1, 3
  STB [r0], r1
  MOV r1, r2
  CALL sub0
  SHR r5, r4
  NOP
  LDI r1, 0xb664
  STB [r1], r7
  NOP
  RND r13
  XOR r13, r7
  POP r3
  FMUL r2, r11
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  POP r2
  LDI r6, 0x4d5e
  STB [r6], r9
  LDI r10, 0xfff9
  LD r4, [r10]
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  NOT r9
  XOR r0, r8
  POP r13
  MOV r3, r5
  POP r4
  LDI r11, 0x64fe
  LD r12, [r11]
  LDI r0, 0xB300
  LDI r1, 0xdf79
  ST [r0], r1
  SARI r8, 0
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  SRND r1, r6
  HALT
  MOV r7, r2
  NOP
  XORI r0, 0xd68e
  LDI r0, 0xb2de
  LDI r1, 0xa30f
  LDI r2, 110
  MCPY
  LDI r5, 0x20
  LDI r7, 0xfff9
  LDX r2, [r7+0x8]
  RND r1
  NEG r14
  POP r3
  LDI r0, 0x8889
  LDI r1, 0xabe8
  LDI r2, 265
  MCPY
  CALLR r2
  XOR r2, r2
  LDI r0, 0xb23b
  LDX r0, [r0+0x4]
  SHLI r13, 15
  NOP
  SHR r5, r2
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  NOP
  NOP
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  SRND r0, r12
  LDI r0, 0x9b68
  LDI r1, 0xb32a
  LDI r2, 289
  MCPY
  LDI r0, 0xB300
  LDI r1, 0x78e3
  ST [r0], r1
  NEG r3
  LDI r0, 0xb305
  LDI r1, 0xb135
  LDI r2, 32
  MSET
  LDI r6, 0xfb60
  LD r6, [r6]
  LDI r0, 0xB300
  LDI r1, 0xcbc6
  ST [r0], r1
  SRND r2, r10
  MULI r4, 0x0
  LDI r0, 0xB322
  LDI r1, 34
  STB [r0], r1
  SRND r11, r8
  LDI r7, 0xd7b3
  NOP
  NOT r12
  LDI r2, 0x625e
  LDBX r10, [r2+0x1]
  LDI r0, 0xb31e
  LDI r1, 0xfff9
  LDI r2, 105
  MSET
  RND r2
  SHRI r5, 7
  XORI r1, 0xffff
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NOP
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  LDI r0, 0xb38e
  LDI r1, 0x7276
  LDI r2, 203
  MSET
  CMPI r0, 0x8
  LDI r7, 0xb268
  STBX [r7+0x8000], r6
  ANDI r2, 0x20
  NEG r10
  NEG r10
  MOV r6, r1
  CALL sub3
  CALL sub1
  DIV r0, r1
  RND r8
  SHR r14, r12
  SHR r11, r4
  LDI r8, 0x7f77
  LDX r2, [r8+0x1f]
  LDI r4, 0x6251
  LDB r8, [r4]
  RND r10
  RND r4
  PUSH r10
  MOV r3, r8
  NOP
  NOP
  CALL sub1
  PUSH r12
  LDI r15, 0
  RET
sub0:
  XOR r1, r12
  ADD r7, r0
  SHL r11, r10
  RET
sub1:
  XOR r2, r11
  XOR r1, r4
  ADD r6, r6
  RET
sub2:
  XOR r8, r7
  SHL r12, r2
  RET
sub3:
  SUB r2, r3
  SUB r10, r10
  XOR r10, r4
  ADD r9, r10
  SHL r8, r7
  RET
.org 0x2000
  .db 100, 53, 133, 7, 161, 194, 146, 79, 233, 179, 136, 49, 248, 24, 153, 169
  .db 134, 199, 11, 207, 110, 198, 251, 91, 181, 201, 5, 105, 244, 165, 166, 133
  .db 15, 69, 173, 78, 195, 163, 1, 130, 112, 10, 162, 2, 71, 58, 41, 199
  .db 3, 144, 24, 81, 83, 187, 244, 4, 80, 114, 51, 20, 121, 207, 214, 39
  .db 163, 187, 11, 140, 96, 45, 244, 147, 61, 57, 105, 14, 26, 245, 111, 141
  .db 1, 248, 67, 198, 37, 153, 166, 9, 81, 181, 69, 145, 12, 8, 235, 128
  .db 120, 177, 100, 110, 154, 86, 102, 35, 228, 212, 224, 193, 92, 39, 240, 180
  .db 254, 161, 141, 63, 98, 130, 193, 9, 19, 83, 45, 19, 77, 180, 214, 4
.bank 3
  .db 118, 242, 43, 157, 47, 249, 72, 116, 101, 125, 215, 100, 210, 223, 25, 71, 240, 150, 218, 110, 212, 175, 251, 167, 106, 205, 124, 106, 244, 91, 247, 157
.bank 4
  .db 250, 59, 105, 28, 125, 188, 198, 208, 46, 95, 243, 96, 1, 192, 21, 32, 63, 13, 175, 115, 75, 86, 243, 254, 253, 77, 32, 174, 178, 158, 8, 120
.bank 5
  .db 164, 104, 225, 178, 76, 93, 211, 6, 187, 168, 152, 230, 114, 95, 187, 19, 250, 39, 222, 240, 217, 212, 142, 118, 12, 225, 140, 74, 129, 64, 48, 155
