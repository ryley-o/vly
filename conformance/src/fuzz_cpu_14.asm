.header init, frame
init:
  LDI r0, 0x20
  LDI r1, 0x20
  LDI r2, 0x7f
  LDI r3, 0xf
  LDI r4, 0x8966
  LDI r5, 0xf
  LDI r6, 0x9035
  LDI r7, 0x7f
  LDI r8, 0x25f9
  LDI r9, 0x8
  LDI r10, 0x100
  LDI r11, 0xfffe
  LDI r12, 0x7
  LDI r13, 0x7f
  RET
frame:
  LDI r0, 0xB322
  LDI r1, 35
  STB [r0], r1
  NOP
  JC L0
  CALL sub2
  JC L1
L1:
  LDI r0, 0xB322
  LDI r1, 37
  STB [r0], r1
  POP r9
  NEG r11
  LDI r0, 0xb29a
  ST [r0], r9
  LDI r0, 0xB300
  LDI r1, 0xadcd
  ST [r0], r1
L0:
  LDI r0, 0xB300
  LDI r1, 0x538d
  ST [r0], r1
  NOP
  PUSH r6
  SRND r5, r5
  SRND r3, r10
  MULI r13, 0x8001
  PUSH r6
  MOV r9, r9
  NOP
  OR r14, r11
  ORI r7, 0x9825
  LDI r0, 0xB300
  LDI r1, 0xc438
  ST [r0], r1
  LDI r6, 0x6443
  STB [r6], r12
  LDI r0, 0xB300
  LDI r1, 0x14f5
  ST [r0], r1
  CALL sub1
  NOP
  LDI r11, 0x7fff
  SHL r10, r6
  LDI r0, 0xB322
  LDI r1, 16
  STB [r0], r1
  CMP r9, r10
  LDI r7, 0x695c
  LD r4, [r7]
  NOP
  LDI r0, 0xB300
  LDI r1, 0xe771
  ST [r0], r1
  JZ L2
  NOP
  LDI r1, 0x9361
  STX [r1+0xf], r9
  JMP L3
  LDI r6, 0xaeea
  STBX [r6+0x8001], r1
  LDI r0, 0xB322
  LDI r1, 29
  STB [r0], r1
L2:
  SHLI r2, 5
L3:
  RND r2
  LDI r0, 0xB300
  LDI r1, 0xf858
  ST [r0], r1
  SUB r13, r0
  LDI r8, 0xb231
  LDBX r10, [r8+0xf36c]
  LDI r13, 0x4
  LDI r0, 0xB300
  LDI r1, 0x1d01
  ST [r0], r1
  SRND r8, r12
  POP r15
  NOP
  NOP
  PUSH r3
  LDI r14, 0xdb25
  NOP
  RND r12
  LDI r0, 0xfff5
  LDI r1, 0xaef6
  LDI r2, 93
  MSET
  MULI r1, 0x20
  MOV r9, r11
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  LDI r0, 0xB322
  LDI r1, 19
  STB [r0], r1
  CALL sub1
  LDI r0, 0xB322
  LDI r1, 15
  STB [r0], r1
  MOV r5, r11
  RND r12
  PUSH r11
  RND r10
  SARI r13, 5
  RND r3
  ANDI r2, 0x3b43
  ORI r5, 0x4
  NOP
  PUSH r14
  LDI r6, 0x1f
  NOT r7
  MOV r10, r1
  NOP
  CMP r7, r3
  CALL sub0
  LDI r9, 0xb8e2
  LDBX r5, [r9+0x8]
  SHRI r10, 15
  NOT r0
  ADDI r4, 0xff
  NOP
  SHR r11, r4
  PUSH r2
  LDI r4, 0x8
  NOP
  LDI r4, 0xaeb9
  NOP
  LDI r6, 0x4e7b
  LDX r4, [r6+0x966f]
  CALL sub3
  CALL sub1
  SRND r3, r6
  NOP
  LDI r0, 0xB300
  LDI r1, 0xc990
  ST [r0], r1
  CALL sub1
  LDI r1, 0x67de
  ST [r1], r7
  LDI r11, 0x6893
  LDBX r1, [r11+0x3]
  NEG r0
  PUSH r13
  LDI r3, 0x6dd8
  LD r0, [r3]
  POP r4
  MOV r4, r1
  SHLI r9, 13
  CALL sub0
  LDI r5, 0xb235
  LD r7, [r5]
  LDI r11, 0x6f48
  LD r10, [r11]
  NOP
  SRND r5, r1
  RND r8
  LDI r1, 0xb193
  STBX [r1+0xffff], r6
  LDI r0, 0xB300
  LDI r1, 0x7121
  ST [r0], r1
  SRND r7, r11
  LDI r12, 0xb295
  LDB r5, [r12]
  CALL sub2
  LDI r0, 0xB322
  LDI r1, 3
  STB [r0], r1
  LDI r1, 0xf1fc
  STB [r1], r10
  LDI r0, 0xB322
  LDI r1, 30
  STB [r0], r1
  LDI r4, 0xb29f
  STB [r4], r3
  LDI r15, 0
  RET
sub0:
  SHL r1, r5
  XOR r8, r10
  RET
sub1:
  SUB r6, r9
  ADD r7, r1
  ADD r12, r12
  XOR r12, r11
  SUB r11, r0
  RET
sub2:
  SHL r5, r2
  SHL r11, r10
  ADD r9, r12
  XOR r5, r1
  XOR r12, r6
  RET
sub3:
  ADD r11, r1
  XOR r4, r7
  RET
.org 0x2000
  .db 51, 187, 128, 18, 57, 213, 54, 88, 254, 158, 221, 41, 72, 28, 80, 113
  .db 220, 203, 239, 107, 123, 220, 194, 148, 38, 14, 61, 236, 47, 93, 130, 38
  .db 22, 119, 241, 246, 234, 126, 212, 241, 240, 156, 225, 156, 153, 213, 16, 201
  .db 243, 71, 193, 192, 46, 219, 174, 171, 120, 199, 59, 103, 56, 47, 230, 47
  .db 142, 68, 64, 17, 154, 143, 186, 120, 154, 162, 252, 99, 191, 114, 51, 192
  .db 95, 85, 83, 202, 97, 120, 53, 141, 43, 49, 31, 73, 253, 91, 142, 215
  .db 168, 214, 56, 244, 234, 27, 100, 214, 9, 182, 242, 226, 1, 149, 230, 24
  .db 233, 242, 185, 168, 224, 27, 1, 60, 155, 145, 48, 142, 68, 37, 100, 110
.bank 3
  .db 189, 67, 198, 6, 224, 155, 219, 152, 232, 37, 236, 119, 201, 140, 228, 82, 215, 171, 236, 81, 199, 86, 6, 57, 150, 240, 81, 227, 7, 93, 251, 147
.bank 4
  .db 136, 231, 159, 39, 24, 132, 64, 1, 108, 62, 47, 103, 179, 245, 202, 140, 143, 5, 41, 140, 30, 73, 228, 154, 69, 54, 81, 234, 64, 6, 173, 215
.bank 5
  .db 141, 79, 167, 114, 64, 244, 16, 215, 223, 233, 184, 232, 176, 135, 164, 103, 243, 215, 189, 139, 13, 79, 210, 83, 70, 189, 179, 208, 144, 64, 121, 251
