.header init, frame
init:
  LDI r0, 0x20
  LDI r1, 0x3
  LDI r2, 0x8000
  LDI r3, 0x8000
  LDI r4, 0x7f
  LDI r5, 0xf5e1
  LDI r6, 0x0
  LDI r7, 0xfffe
  LDI r8, 0x100
  LDI r9, 0xfffe
  LDI r10, 0xb04f
  LDI r11, 0x8000
  LDI r12, 0x457a
  LDI r13, 0x1
  RET
frame:
  CALL sub1
  LDI r6, 0xb22c
  STX [r6+0x1], r10
  LDI r0, 0xcc03
  STX [r0+0x5c6], r5
  NEG r9
  NOP
  PUSH r2
  POP r12
  LDI r4, 0xb0e8
  LDBX r3, [r4+0x100]
  NOP
  CALL sub0
  CALL sub3
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  MOV r6, r1
  NEG r8
  SUB r2, r8
  LDI r13, 0x7a8
  MULI r3, 0xfffe
  JMP L0
  LDI r0, 0xB300
  LDI r1, 0x9c33
  ST [r0], r1
  JBE L1
  CALL sub3
L0:
  RND r10
  SRND r7, r12
  MUL r2, r10
  SRND r7, r0
  LDI r0, 0xB300
  LDI r1, 0x3386
  ST [r0], r1
L1:
  LDI r10, 0xa9c9
  LDX r10, [r10+0x0]
  PUSH r2
  JMP L2
  NOP
  LDI r0, 0x605b
  LDI r1, 0xa24a
  LDI r2, 291
  MSET
  SRND r9, r12
  LDI r6, 0x6350
  STX [r6+0x8000], r11
  LDI r0, 0x861a
  LDI r1, 0x651b
  LDI r2, 82
  MCPY
L2:
  LDI r0, 0x56d4
  LDI r1, 0xb399
  LDI r2, 203
  MSET
  POP r2
  NEG r12
  SRND r6, r7
  CALL sub2
  NOT r13
  NEG r0
  POP r0
  LDI r0, 0xfffa
  LDI r1, 0xa166
  LDI r2, 290
  MSET
  JC L3
  NOP
  CALL sub3
  SRND r1, r0
  JNC L4
L3:
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r8, 0xd8d0
  LDB r0, [r8]
L4:
  LDI r0, 0x63a7
  LDI r1, 0xb21f
  LDI r2, 66
  MSET
  JA L5
  POP r10
  POP r6
  LDI r8, 0x69e0
L5:
  NOT r4
  CALL sub0
  LDI r0, 0xB300
  LDI r1, 0xa174
  ST [r0], r1
  SHRI r3, 4
  RND r12
  LDI r0, 0x8bd6
  LDI r1, 0xcb1c
  LDI r2, 263
  MCPY
  LDI r12, 0x6845
  LDB r3, [r12]
  LDI r0, 0xB300
  LDI r1, 0xde02
  ST [r0], r1
  CALL sub2
  NEG r11
  CALLR r3
  NOP
  LDI r0, 0xB322
  LDI r1, 13
  STB [r0], r1
  CALL sub2
  LDI r0, 0x63c2
  LDI r1, 0x613f
  LDI r2, 102
  MSET
  LDI r2, 0x734f
  LDB r3, [r2]
  CALL sub2
  NEG r4
  LDI r0, 0xB300
  LDI r1, 0x7c
  ST [r0], r1
  PUSH r9
  LDI r0, 0xB300
  LDI r1, 0x4189
  ST [r0], r1
  NOP
  PUSH r8
  LDI r0, 0x621a
  LDI r1, 0xffff
  LDI r2, 47
  MSET
  MOV r2, r13
  CALL sub0
  JLT L6
  SHRI r15, 11
  LDI r0, 0xe7d9
  LDI r1, 0xb2bf
  LDI r2, 15
  MCPY
  JMP L7
L6:
  NOP
  OR r15, r2
  LDI r10, 0xb169
  LDBX r8, [r10+0xffff]
  NOP
  LDI r7, 0x6aa9
  LDB r7, [r7]
L7:
  LDI r0, 0xB322
  LDI r1, 33
  STB [r0], r1
  RND r4
  NOP
  CALL sub3
  LDI r7, 0x20
  LDI r5, 0xfffc
  LD r3, [r5]
  NOP
  MUL r1, r7
  NOT r12
  MOV r11, r12
  CALL sub3
  PUSH r7
  PUSH r6
  LDI r5, 0xb3a2
  STX [r5+0xffff], r3
  JNZ L8
  LDI r10, 0x7f
  LDI r5, 0xb206
  STB [r5], r0
  SRND r12, r4
  NOP
  SHRI r8, 10
  MOV r3, r3
  CALL sub2
L8:
  JZ L9
  MOV r10, r3
  ADDI r2, 0x20
  LDI r0, 0xB300
  LDI r1, 0x5556
  ST [r0], r1
  LDI r0, 0xb283
  LDI r1, 0xf8c8
  LDI r2, 89
  MSET
L9:
  MULI r7, 0xffff
  NOP
  SRND r7, r4
  LDI r8, 0x9d55
  STBX [r8+0x2], r3
  NEG r0
  LDI r6, 0xab7c
  LDB r0, [r6]
  NOT r3
  SHLI r13, 0
  LDI r2, 0xed05
  STX [r2+0x1], r0
  LDI r0, 0xa1af
  LDI r1, 0x67cd
  LDI r2, 109
  MSET
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  ORI r4, 0x8000
  LDI r1, 0xfff6
  ST [r1], r9
  NOP
  JC L10
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  LDI r3, 0xb310
  STX [r3+0xb5d3], r1
  RND r0
  NOP
L10:
  MOV r4, r12
  LDI r15, 0
  RET
sub0:
  XOR r8, r8
  XOR r3, r2
  RET
sub1:
  ADD r0, r0
  SHL r2, r8
  XOR r2, r8
  RET
sub2:
  XOR r1, r8
  XOR r6, r11
  RET
sub3:
  ADD r6, r0
  SUB r12, r5
  RET
.org 0x2000
  .db 218, 183, 202, 245, 117, 86, 83, 233, 106, 187, 254, 221, 1, 58, 104, 69
  .db 179, 40, 18, 144, 31, 243, 191, 158, 233, 92, 26, 41, 99, 18, 65, 85
  .db 28, 222, 198, 224, 167, 190, 34, 117, 213, 111, 30, 228, 109, 8, 245, 242
  .db 134, 81, 12, 92, 184, 108, 53, 174, 137, 215, 232, 198, 145, 84, 139, 36
  .db 138, 228, 90, 43, 92, 87, 3, 110, 84, 125, 64, 143, 53, 243, 83, 97
  .db 253, 206, 170, 1, 209, 124, 196, 156, 4, 95, 90, 127, 224, 168, 214, 122
  .db 23, 104, 57, 134, 15, 212, 210, 104, 162, 144, 236, 143, 147, 35, 223, 232
  .db 222, 237, 41, 117, 144, 12, 136, 194, 88, 185, 30, 35, 86, 85, 80, 236
.bank 3
  .db 29, 55, 101, 245, 223, 140, 47, 200, 107, 149, 240, 29, 198, 164, 90, 202, 24, 205, 80, 238, 201, 72, 105, 225, 24, 154, 100, 84, 120, 220, 94, 126
.bank 4
  .db 177, 41, 6, 174, 120, 85, 161, 209, 42, 180, 84, 188, 219, 196, 186, 6, 59, 31, 89, 78, 232, 57, 152, 65, 150, 31, 193, 43, 99, 110, 202, 243
.bank 5
  .db 217, 238, 119, 190, 27, 191, 13, 116, 1, 211, 43, 28, 17, 4, 50, 181, 145, 118, 36, 157, 81, 189, 36, 57, 158, 24, 111, 76, 23, 221, 31, 224
