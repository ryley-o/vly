.header init, frame
init:
  LDI r0, 0x2
  LDI r1, 0x100
  LDI r2, 0x20
  LDI r3, 0x4
  LDI r4, 0x0
  LDI r5, 0x0
  LDI r6, 0x1
  LDI r7, 0x3
  LDI r8, 0x7
  LDI r9, 0x0
  LDI r10, 0x1
  LDI r11, 0x7
  LDI r12, 0x1f
  LDI r13, 0x1f
  RET
frame:
  NOP
  MOV r9, r2
  PUSH r11
  MOV r11, r5
  POP r13
  LDI r7, 0xa6da
  STX [r7+0x7fff], r1
  LDI r4, 0x661a
  LDB r4, [r4]
  POP r8
  NOP
  NOT r10
  NOT r6
  POP r12
  NOP
  SHLI r3, 5
  LDI r0, 0xf393
  LDI r1, 0xadb9
  LDI r2, 209
  MCPY
  XORI r4, 0xde9f
  NOT r7
  NOP
  NOP
  LDI r5, 0x6348
  LDBX r4, [r5+0x10]
  JGT L0
  LDI r10, 0x4aca
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  LDI r6, 0x8872
  LDBX r10, [r6+0x75bb]
  SHRI r3, 4
  SRND r3, r7
  RND r11
L0:
  LDI r1, 0x4e93
  LD r7, [r1]
  LDI r9, 0x77c4
  STX [r9+0x3952], r2
  SRND r8, r11
  POP r5
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  POP r11
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  LDI r6, 0xb615
  LD r11, [r6]
  NOP
  CMPI r6, 0x100
  NOP
  POP r11
  POP r4
  NOP
  DIV r4, r5
  MUL r6, r11
  POP r10
  CALL sub2
  CALLR r4
  LDI r0, 0xb1e0
  LDI r1, 0xa5b5
  LDI r2, 121
  MSET
  SRND r12, r4
  LDI r0, 0xB322
  LDI r1, 23
  STB [r0], r1
  LDI r0, 0xa2fe
  ST [r0], r7
  FMUL r7, r13
  LDI r2, 0x6322
  LDB r1, [r2]
  ORI r14, 0x80
  SRND r8, r6
  SRND r12, r6
  LDI r6, 0x6ef1
  LDBX r6, [r6+0xfffe]
  CMPI r10, 0x0
  CALL sub2
  LDI r0, 0xB300
  LDI r1, 0xe455
  ST [r0], r1
  NOP
  DIV r11, r1
  CALL sub1
  LDI r11, 0x6056
  LDB r9, [r11]
  LDI r11, 0xa824
  STBX [r11+0x8000], r3
  LDI r0, 0x7aac
  LDI r1, 0x62d1
  LDI r2, 95
  MCPY
  MOV r3, r13
  LDI r0, 0xB300
  LDI r1, 0x2023
  ST [r0], r1
  CALLR r2
  AND r1, r15
  CALL sub1
  JMP L1
  CALL sub2
  NEG r6
L1:
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  LDI r4, 0x578d
  LDI r0, 0x6058
  STBX [r0+0x1f], r6
  MOV r6, r6
  LDI r0, 0xec54
  LDI r1, 0xfffa
  LDI r2, 171
  MSET
  CALL sub2
  SRND r0, r0
  SUB r1, r7
  LDI r7, 0x6593
  SHL r11, r4
  NOP
  CALL sub0
  MOV r14, r0
  LDI r5, 0x693e
  LDB r9, [r5]
  LDI r0, 0xB300
  LDI r1, 0x98ab
  ST [r0], r1
  RND r2
  LDI r3, 0x9e93
  STBX [r3+0x0], r7
  LDI r4, 0xb339
  LD r12, [r4]
  NOP
  NOP
  LDI r1, 0xb20d
  ST [r1], r11
  LDI r0, 0xB322
  LDI r1, 39
  STB [r0], r1
  POP r3
  LDI r12, 0xb08c
  LDB r9, [r12]
  SRND r4, r12
  JLE L2
L2:
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r5
  LDI r0, 0x6570
  LD r2, [r0]
  LDI r11, 0x2
  FMUL r11, r9
  NEG r9
  NOP
  PUSH r11
  LDI r0, 0xa6d0
  LDI r1, 0x68cb
  LDI r2, 282
  MCPY
  LDI r9, 0x6635
  LDX r4, [r9+0xb253]
  RND r6
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  NOP
  CALL sub2
  SRND r2, r1
  NOP
  LDI r1, 0xa3b0
  LDBX r2, [r1+0x1]
  NOP
  MOV r6, r6
  LDI r2, 0xb0e4
  LDB r11, [r2]
  NOP
  NEG r4
  LDI r12, 0xb01c
  STX [r12+0x7c66], r3
  LDI r0, 0xd7c1
  LDI r1, 0x9ecb
  LDI r2, 194
  MCPY
  LDI r5, 0xe954
  STB [r5], r6
  HALT
  LDI r0, 0xB300
  LDI r1, 0x5b0e
  ST [r0], r1
  NOP
  LDI r4, 0x43c3
  STB [r4], r3
  LDI r0, 0x75a6
  LDI r1, 0x67d4
  LDI r2, 184
  MSET
  LDI r11, 0x825b
  STBX [r11+0xf894], r2
  PUSH r13
  LDI r0, 0xB300
  LDI r1, 0xe005
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 7
  STB [r0], r1
  ORI r11, 0xffff
  LDI r0, 0xb081
  LDI r1, 0xa654
  LDI r2, 40
  MSET
  LDI r0, 0x89a2
  LDI r1, 0x60b4
  LDI r2, 91
  MCPY
  POP r2
  PUSH r1
  LDI r10, 0xb297
  STX [r10+0xf], r9
  LDI r5, 0xcc6e
  LDB r4, [r5]
  NOP
  MOV r9, r2
  LDI r6, 0xa76c
  STB [r6], r0
  JNC L3
  ANDI r13, 0xc21b
  CALL sub0
  PUSH r11
  LDI r0, 0xB300
  LDI r1, 0x5669
  ST [r0], r1
L3:
  LDI r15, 0
  RET
sub0:
  SHL r9, r12
  SUB r8, r7
  RET
sub1:
  ADD r9, r5
  XOR r10, r4
  SUB r12, r4
  SUB r0, r5
  XOR r9, r7
  RET
sub2:
  SUB r1, r11
  ADD r4, r6
  SHL r6, r0
  SUB r8, r1
  RET
sub3:
  SHL r4, r5
  SHL r2, r8
  SHL r6, r9
  SUB r2, r9
  RET
.org 0x2000
  .db 29, 5, 154, 190, 126, 176, 182, 26, 196, 223, 146, 227, 52, 49, 37, 254
  .db 133, 224, 253, 103, 28, 90, 49, 227, 221, 83, 21, 28, 195, 0, 33, 29
  .db 0, 219, 118, 166, 213, 48, 116, 39, 216, 217, 36, 121, 184, 118, 237, 199
  .db 204, 118, 168, 67, 239, 88, 0, 49, 90, 223, 209, 196, 6, 101, 234, 199
  .db 135, 134, 172, 134, 107, 217, 231, 236, 16, 188, 218, 173, 66, 45, 20, 249
  .db 78, 150, 114, 77, 48, 16, 59, 119, 235, 175, 188, 226, 187, 75, 35, 30
  .db 245, 130, 151, 157, 2, 40, 30, 172, 88, 221, 175, 231, 48, 172, 241, 207
  .db 37, 63, 173, 173, 85, 49, 26, 138, 9, 123, 44, 131, 217, 61, 2, 153
.bank 3
  .db 110, 148, 119, 114, 62, 194, 56, 125, 133, 10, 193, 27, 248, 2, 66, 61, 56, 41, 204, 128, 117, 54, 62, 236, 214, 131, 193, 119, 100, 230, 228, 19
.bank 4
  .db 240, 50, 39, 100, 116, 63, 35, 156, 80, 51, 127, 183, 65, 106, 122, 103, 240, 113, 152, 39, 192, 167, 49, 13, 139, 149, 74, 239, 35, 150, 138, 170
.bank 5
  .db 57, 113, 71, 19, 197, 19, 61, 79, 58, 197, 11, 9, 17, 183, 52, 130, 68, 228, 182, 56, 196, 13, 71, 239, 201, 172, 134, 183, 249, 69, 254, 213
