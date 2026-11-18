.header init, frame
init:
  LDI r0, 0x8001
  LDI r1, 0xffff
  LDI r2, 0x4
  LDI r3, 0xf
  LDI r4, 0x2
  LDI r5, 0x7
  LDI r6, 0x4
  LDI r7, 0x7fff
  LDI r8, 0xff
  LDI r9, 0x7f
  LDI r10, 0x8000
  LDI r11, 0x1
  LDI r12, 0x20
  LDI r13, 0xfffe
  RET
frame:
  MOV r5, r0
  MUL r15, r2
  NOP
  LDI r0, 0xB322
  LDI r1, 23
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  CALL sub2
  LDI r0, 0xB300
  LDI r1, 0x231a
  ST [r0], r1
  POP r9
  LDI r0, 0xB300
  LDI r1, 0xb84
  ST [r0], r1
  JMP L0
  SRND r12, r1
  RND r6
  SHL r10, r11
  SAR r4, r7
  PUSH r4
  MOV r2, r11
  POP r1
  CALL sub2
L0:
  CALL sub3
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  MOV r2, r4
  LDI r4, 0xb2a1
  LDBX r5, [r4+0x0]
  LDI r9, 0xb72d
  LD r2, [r9]
  JGE L1
L1:
  LDI r7, 0x8cd7
  LD r5, [r7]
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r4, 0x3
  LDI r0, 0xffff
  LDI r1, 0xb22d
  LDI r2, 255
  MCPY
  LDI r9, 0x84b9
  LDB r12, [r9]
  NOP
  CMPI r3, 0xa5af
  XORI r11, 0x10
  ANDI r9, 0xbf2e
  CALL sub1
  CALL sub3
  MOV r6, r10
  NOP
  JZ L2
  CALL sub1
  LDI r0, 0xB300
  LDI r1, 0x464f
  ST [r0], r1
  DIV r2, r10
  JC L3
  LDI r0, 0xB322
  LDI r1, 22
  STB [r0], r1
L3:
  POP r3
L2:
  SRND r11, r12
  POP r13
  LDI r10, 0xb2c7
  STB [r10], r11
  LDI r4, 0xb39f
  STB [r4], r10
  LDI r0, 0xB322
  LDI r1, 1
  STB [r0], r1
  MOV r10, r12
  POP r12
  CMPI r7, 0xffff
  LDI r0, 0xfffd
  STBX [r0+0x7f], r7
  SHLI r6, 7
  LDI r0, 0xB300
  LDI r1, 0xfc24
  ST [r0], r1
  SRND r8, r8
  LDI r5, 0x8588
  LDI r0, 0xB322
  LDI r1, 38
  STB [r0], r1
  SRND r4, r6
  JZ L4
L4:
  MOV r10, r0
  CALLR r0
  ANDI r11, 0xecb1
  ORI r15, 0xa8e2
  LDI r2, 0xa4a9
  LDB r9, [r2]
  POP r3
  SRND r8, r12
  MOV r0, r1
  LDI r3, 0x7064
  STB [r3], r4
  LDI r0, 0xB300
  LDI r1, 0x19ae
  ST [r0], r1
  LDI r0, 0x3872
  ST [r0], r2
  POP r8
  SARI r0, 6
  LDI r1, 0xb3b4
  STBX [r1+0x100], r2
  LDI r0, 0xa651
  LDI r1, 0xb13f
  LDI r2, 46
  MSET
  MOV r9, r12
  NEG r4
  NOP
  NOP
  MOV r9, r10
  XOR r13, r0
  LDI r7, 0xb280
  LDBX r0, [r7+0x0]
  LDI r0, 0x8638
  LDI r1, 0x9212
  LDI r2, 77
  MCPY
  JNZ L5
  SHRI r6, 14
  NOT r4
  CALL sub2
  LDI r8, 0x60d8
  LDX r2, [r8+0x10]
L5:
  LDI r4, 0xfffb
  LD r5, [r4]
  JGT L6
  LDI r0, 0x4614
  LDI r1, 0x940a
  LDI r2, 298
  MSET
  LDI r12, 0xfff1
  STX [r12+0xf], r1
L6:
  LDI r0, 0xB300
  LDI r1, 0xeb4a
  ST [r0], r1
  NOP
  LDI r0, 0xB322
  LDI r1, 18
  STB [r0], r1
  POP r2
  LDI r2, 0x7744
  LDX r3, [r2+0x8]
  NEG r0
  MOV r8, r8
  SHR r9, r4
  LDI r2, 0xb2ca
  LD r6, [r2]
  JNZ L7
  RND r12
  MOV r8, r1
  NOP
  LDI r9, 0xfffa
  ST [r9], r1
  LDI r3, 0x975b
  LDBX r3, [r3+0xf]
  JA L8
L7:
  SRND r11, r6
  LDI r4, 0x3c40
  LD r8, [r4]
  MOV r3, r13
  RND r6
  LDI r0, 0x7e8c
  LDI r1, 0xaffe
  LDI r2, 60
  MSET
L8:
  POP r6
  LDI r0, 0xb1b7
  LD r4, [r0]
  JNZ L9
  SARI r3, 10
  RND r0
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  RND r12
L9:
  LDI r0, 0xb26f
  LDI r1, 0xaa54
  LDI r2, 135
  MCPY
  LDI r5, 0x80
  LDI r0, 0xB300
  LDI r1, 0x2b4b
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 18
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  LDI r3, 0xa271
  LDB r4, [r3]
  NOP
  NOP
  SARI r2, 14
  LDI r0, 0xa31a
  LDI r1, 0x3ac2
  LDI r2, 41
  MSET
  LDI r4, 0xf
  ANDI r5, 0x853f
  NOP
  CALL sub2
  LDI r7, 0x662f
  ST [r7], r8
  LDI r0, 0xB322
  LDI r1, 36
  STB [r0], r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r6
  NOP
  POP r6
  CALLR r5
  LDI r0, 0xB300
  LDI r1, 0xba7b
  ST [r0], r1
  LDI r0, 0xfffd
  LDB r5, [r0]
  LDI r3, 0x9e53
  LD r6, [r3]
  MOV r4, r11
  PUSH r6
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  POP r2
  NEG r15
  LDI r0, 0xb2a7
  LDI r1, 0x9e53
  LDI r2, 64
  MCPY
  NOP
  POP r10
  NOT r6
  LDI r5, 0x3bdd
  SRND r5, r8
  ADDI r6, 0x3
  NOP
  PUSH r8
  JLT L10
  NOP
  JGT L11
  NOP
  LDI r0, 0xB300
  LDI r1, 0x7d06
  ST [r0], r1
L10:
  NOP
  NOP
  SRND r6, r10
  DIV r13, r15
  CALL sub1
L11:
  NOP
  MOV r1, r12
  NOP
  LDI r6, 0xb263
  LDB r9, [r6]
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r7, 0xb027
  LD r4, [r7]
  RND r12
  LDI r15, 0
  RET
sub0:
  XOR r5, r6
  XOR r11, r0
  RET
sub1:
  SUB r6, r4
  SUB r9, r10
  ADD r4, r11
  SUB r11, r8
  RET
sub2:
  SUB r2, r2
  SUB r1, r7
  XOR r0, r7
  RET
sub3:
  SHL r6, r2
  XOR r12, r1
  SHL r9, r2
  XOR r4, r0
  RET
.org 0x2000
  .db 201, 27, 49, 165, 215, 188, 129, 73, 9, 64, 143, 73, 44, 187, 118, 82
  .db 206, 142, 129, 211, 12, 61, 4, 94, 203, 71, 131, 8, 49, 88, 104, 164
  .db 12, 143, 148, 94, 227, 45, 136, 20, 221, 130, 141, 182, 136, 139, 28, 152
  .db 182, 26, 110, 163, 173, 209, 25, 162, 112, 155, 41, 145, 10, 18, 190, 180
  .db 19, 38, 5, 4, 131, 139, 235, 112, 227, 140, 64, 6, 189, 149, 148, 118
  .db 189, 187, 233, 242, 155, 24, 42, 207, 18, 2, 145, 224, 145, 233, 162, 90
  .db 157, 253, 166, 84, 47, 215, 87, 0, 3, 3, 78, 155, 119, 86, 85, 119
  .db 124, 1, 176, 221, 227, 40, 18, 244, 133, 81, 155, 149, 50, 213, 32, 135
.bank 3
  .db 79, 103, 161, 39, 33, 145, 45, 237, 19, 41, 115, 139, 237, 165, 201, 145, 241, 213, 7, 105, 103, 248, 237, 27, 27, 16, 183, 181, 226, 146, 199, 26
.bank 4
  .db 25, 49, 89, 28, 111, 100, 30, 70, 140, 241, 150, 64, 53, 179, 86, 0, 62, 75, 187, 172, 176, 31, 41, 120, 170, 65, 187, 40, 38, 181, 124, 13
.bank 5
  .db 140, 10, 82, 110, 213, 28, 141, 62, 122, 119, 167, 156, 219, 179, 114, 205, 60, 242, 175, 196, 78, 144, 227, 97, 2, 91, 219, 9, 74, 35, 78, 141
