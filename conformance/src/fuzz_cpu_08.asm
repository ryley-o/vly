.header init, frame
init:
  LDI r0, 0x8000
  LDI r1, 0x8
  LDI r2, 0x0
  LDI r3, 0x3
  LDI r4, 0xb0b2
  LDI r5, 0xf
  LDI r6, 0xf6f2
  LDI r7, 0x8001
  LDI r8, 0x8
  LDI r9, 0x7
  LDI r10, 0x7
  LDI r11, 0x80
  LDI r12, 0x8000
  LDI r13, 0xff
  RET
frame:
  SRND r6, r11
  PUSH r2
  LDI r11, 0x94a0
  LDBX r2, [r11+0xc534]
  LDI r0, 0xB300
  LDI r1, 0x965d
  ST [r0], r1
  LDI r7, 0xb296
  LDBX r3, [r7+0x7f]
  NOP
  LDI r4, 0x99f7
  LDX r8, [r4+0x59f6]
  SRND r4, r9
  LDI r0, 0xB300
  LDI r1, 0x8086
  ST [r0], r1
  NOP
  SRND r12, r9
  MOV r7, r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  CALL sub0
  RND r7
  CALL sub1
  LDI r8, 0x64f4
  LDX r4, [r8+0x20]
  POP r13
  LDI r0, 0x1f
  LDI r7, 0xb32f
  LDBX r0, [r7+0xfe8f]
  MOV r9, r2
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  SRND r1, r2
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  SRND r4, r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NEG r12
  SHLI r3, 15
  LDI r0, 0xc1a6
  STB [r0], r0
  LDI r5, 0xa62f
  LD r4, [r5]
  PUSH r2
  LDI r11, 0x0
  LDI r3, 0xab45
  LDX r4, [r3+0x20]
  LDI r1, 0x1f3b
  LDI r0, 0xB300
  LDI r1, 0x93a
  ST [r0], r1
  POP r0
  JLT L0
  NOT r6
  LDI r0, 0x8d6a
  LDI r1, 0x74b4
  LDI r2, 110
  MSET
  JBE L1
  CALL sub2
  JLE L2
  OR r0, r10
  LDI r0, 0xB300
  LDI r1, 0x83b2
  ST [r0], r1
L0:
  LDI r0, 0xB322
  LDI r1, 31
  STB [r0], r1
  POP r0
L1:
L2:
  HALT
  NEG r12
  LDI r0, 0xB300
  LDI r1, 0xf9b0
  ST [r0], r1
  MULI r1, 0x4
  SHLI r15, 9
  CALLR r11
  LDI r3, 0x7275
  MOV r7, r7
  LDI r2, 0x722b
  STBX [r2+0x7], r1
  NEG r12
  LDI r0, 0xB322
  LDI r1, 33
  STB [r0], r1
  LDI r4, 0xb062
  STBX [r4+0x7a0c], r1
  NOP
  LDI r4, 0xa3cb
  LDI r15, 0x63c4
  CALL sub1
  XORI r2, 0xf
  LDI r9, 0x2866
  LDI r10, 0x6962
  ST [r10], r5
  LDI r9, 0xfffb
  LDX r1, [r9+0xd2cb]
  LDI r0, 0x20
  SRND r3, r12
  XORI r8, 0x20
  LDI r8, 0xb23b
  LDB r11, [r8]
  LDI r1, 0x46c4
  STBX [r1+0xfffe], r8
  LDI r9, 0xbc44
  LDX r7, [r9+0x100]
  LDI r0, 0x83e8
  LDI r1, 0xf682
  LDI r2, 206
  MCPY
  LDI r3, 0x8450
  ST [r3], r12
  CALL sub0
  PUSH r3
  LDI r0, 0x68fe
  LDI r1, 0xb16a
  LDI r2, 262
  MSET
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 28
  STB [r0], r1
  MOV r12, r13
  NOP
  MUL r6, r9
  LDI r0, 0xcac3
  LDI r1, 0xb2e0
  LDI r2, 256
  MSET
  LDI r5, 0x2180
  LD r6, [r5]
  NOP
  LDI r10, 0xb2bf
  ST [r10], r11
  LDI r1, 0x966f
  LDB r1, [r1]
  LDI r0, 0xb03e
  STX [r0+0x622e], r12
  LDI r13, 0x8001
  MOV r8, r13
  LDI r11, 0xa451
  LDBX r4, [r11+0x8000]
  PUSH r11
  PUSH r8
  SHLI r7, 15
  NOP
  CALL sub2
  LDI r12, 0xbcbc
  STX [r12+0x7033], r6
  LDI r3, 0x439f
  SRND r4, r6
  NOT r8
  JBE L3
  MOV r10, r13
  POP r12
  LDI r0, 0x788a
  LDI r1, 0xb2a5
  LDI r2, 261
  MCPY
L3:
  SARI r7, 15
  JMP L4
  MOV r6, r1
  CMP r1, r6
  LDI r11, 0xb1f6
  STB [r11], r7
  NOP
L4:
  NOP
  LDI r4, 0xb3d0
  LDBX r8, [r4+0x1f]
  NOT r3
  CALL sub1
  NOP
  LDI r13, 0x7
  POP r11
  LDI r5, 0x7c85
  ST [r5], r0
  RND r0
  LDI r0, 0xB300
  LDI r1, 0x45bf
  ST [r0], r1
  RND r8
  NOP
  LDI r0, 0xB300
  LDI r1, 0x4145
  ST [r0], r1
  NOT r11
  LDI r11, 0x7359
  ST [r11], r3
  NOP
  LDI r0, 0xB322
  LDI r1, 19
  STB [r0], r1
  LDI r9, 0x9d5b
  ST [r9], r7
  LDI r8, 0xe3e7
  LDI r0, 0x688d
  LDI r1, 0x753d
  LDI r2, 170
  MCPY
  LDI r3, 0x2a16
  LDX r6, [r3+0x7fff]
  PUSH r13
  MOV r12, r10
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r12, 0x7cc3
  LDB r12, [r12]
  PUSH r3
  LDI r0, 0xB300
  LDI r1, 0xc8d0
  ST [r0], r1
  SHRI r5, 5
  LDI r0, 0xad0c
  LDI r1, 0xb256
  LDI r2, 177
  MSET
  RND r11
  SHLI r3, 4
  LDI r3, 0xb3b9
  LDX r10, [r3+0x20]
  SRND r12, r10
  NOP
  CMPI r7, 0x2e63
  LDI r2, 0x6984
  ST [r2], r8
  LDI r0, 0xb134
  LDI r1, 0xb198
  LDI r2, 272
  MSET
  LDI r5, 0xa090
  STB [r5], r1
  CALLR r9
  NOP
  LDI r0, 0x70b6
  LDI r1, 0x6541
  LDI r2, 271
  MCPY
  POP r2
  LDI r0, 0xB322
  LDI r1, 16
  STB [r0], r1
  NOP
  LDI r0, 0xB300
  LDI r1, 0xf594
  ST [r0], r1
  POP r8
  LDI r0, 0xc50e
  LDI r1, 0xb049
  LDI r2, 193
  MCPY
  LDI r8, 0xb2e5
  LD r12, [r8]
  LDI r15, 0
  RET
sub0:
  XOR r0, r10
  XOR r0, r1
  SUB r3, r6
  SUB r8, r4
  SUB r11, r0
  RET
sub1:
  SUB r10, r0
  ADD r6, r10
  ADD r9, r8
  SHL r1, r1
  SHL r2, r5
  RET
sub2:
  SHL r9, r5
  SUB r0, r3
  ADD r1, r4
  SHL r8, r12
  RET
sub3:
  XOR r9, r0
  SUB r10, r3
  XOR r8, r3
  RET
.org 0x2000
  .db 179, 114, 43, 4, 76, 84, 142, 161, 83, 18, 225, 194, 89, 222, 94, 11
  .db 31, 59, 234, 53, 180, 187, 66, 59, 195, 82, 155, 61, 221, 69, 20, 64
  .db 194, 253, 30, 170, 164, 90, 75, 178, 169, 39, 190, 194, 251, 90, 187, 175
  .db 249, 101, 44, 122, 88, 125, 203, 99, 233, 104, 215, 215, 152, 182, 1, 129
  .db 168, 8, 186, 6, 150, 158, 208, 128, 54, 13, 147, 220, 123, 5, 141, 217
  .db 94, 0, 220, 188, 127, 242, 113, 183, 201, 152, 44, 8, 119, 45, 132, 102
  .db 99, 59, 235, 55, 27, 163, 40, 183, 140, 214, 75, 244, 187, 105, 191, 38
  .db 46, 0, 92, 46, 155, 16, 12, 192, 101, 200, 72, 139, 229, 153, 179, 134
.bank 3
  .db 165, 9, 249, 158, 65, 123, 247, 73, 62, 47, 19, 230, 19, 99, 236, 41, 218, 111, 173, 57, 56, 12, 199, 46, 8, 67, 152, 239, 208, 168, 203, 28
.bank 4
  .db 19, 10, 110, 97, 188, 90, 226, 21, 187, 124, 50, 205, 83, 60, 156, 97, 2, 21, 255, 59, 89, 107, 213, 138, 82, 25, 60, 228, 20, 24, 10, 39
.bank 5
  .db 220, 195, 46, 39, 11, 121, 131, 157, 197, 16, 76, 32, 168, 236, 3, 131, 214, 196, 129, 9, 151, 177, 179, 254, 77, 17, 180, 140, 131, 45, 50, 228
