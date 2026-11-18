.header init, frame
init:
  LDI r0, 0xae77
  LDI r1, 0xb7c7
  LDI r2, 0xf
  LDI r3, 0x80
  LDI r4, 0x372
  LDI r5, 0x10
  LDI r6, 0xbafd
  LDI r7, 0xf
  LDI r8, 0x7fff
  LDI r9, 0x753b
  LDI r10, 0xffff
  LDI r11, 0xff
  LDI r12, 0x20
  LDI r13, 0xf4ea
  RET
frame:
  CALL sub1
  RND r5
  LDI r1, 0xc5ce
  LDB r9, [r1]
  PUSH r14
  NOP
  RND r8
  LDI r0, 0xB300
  LDI r1, 0x1ba5
  ST [r0], r1
  LDI r12, 0xe35
  STX [r12+0xcb05], r1
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r10, 0x746a
  LDB r6, [r10]
  RND r0
  CALL sub2
  JLT L0
  RND r4
  NOT r6
  LDI r0, 0xB300
  LDI r1, 0x60ac
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 14
  STB [r0], r1
  NOP
  MOV r13, r4
L0:
  ADDI r11, 0x7fff
  LDI r0, 0x61e9
  LDI r1, 0xfff8
  LDI r2, 178
  MCPY
  MUL r2, r10
  POP r6
  NOP
  LDI r8, 0x74c3
  LDB r0, [r8]
  CMP r5, r1
  LDI r5, 0xb21a
  STX [r5+0xffff], r9
  SRND r0, r2
  LDI r10, 0x4b55
  STB [r10], r12
  LDI r0, 0x2e76
  STX [r0+0x100], r6
  NOP
  SRND r9, r12
  NOP
  RND r4
  NOT r13
  LDI r7, 0x6505
  LDX r5, [r7+0x100]
  NOP
  FMUL r5, r4
  NOP
  MOV r7, r2
  NOP
  LDI r6, 0xa759
  STBX [r6+0xfc33], r5
  LDI r0, 0xB300
  LDI r1, 0x3bb0
  ST [r0], r1
  POP r11
  LDI r0, 0x7f8e
  LDI r1, 0xb0b7
  LDI r2, 106
  MSET
  PUSH r12
  CALL sub2
  PUSH r12
  NOP
  RND r9
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  PUSH r3
  LDI r0, 0xB300
  LDI r1, 0xaca8
  ST [r0], r1
  MOV r9, r5
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  LDI r9, 0xffff
  LDX r6, [r9+0x20]
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r4, 0xa56e
  ST [r4], r10
  LDI r0, 0xb3f5
  LDI r1, 0xb224
  LDI r2, 159
  MSET
  JGT L1
  NEG r11
  NOT r6
  LDI r1, 0xb23e
  STX [r1+0x7], r3
  LDI r0, 0x369c
  STB [r0], r4
L1:
  LDI r0, 0xB322
  LDI r1, 19
  STB [r0], r1
  MOV r2, r0
  JNC L2
  PUSH r5
  ORI r1, 0x20
  LDI r4, 0xde21
  LDBX r10, [r4+0x6898]
  POP r14
  SRND r11, r10
  NOT r0
  NOP
  PUSH r15
L2:
  PUSH r15
  NOP
  PUSH r2
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  RND r0
  RND r2
  LDI r0, 0xB300
  LDI r1, 0xcdd4
  ST [r0], r1
  PUSH r4
  JNZ L3
  ADD r4, r6
  ANDI r8, 0xffff
L3:
  MOV r12, r0
  SRND r1, r6
  LDI r6, 0xb7a3
  LDX r8, [r6+0x8001]
  LDI r0, 0x68c
  LDI r1, 0x90c7
  LDI r2, 109
  MCPY
  MOV r12, r0
  XORI r11, 0xfffe
  NOP
  JLT L4
  ADD r7, r4
  SHRI r8, 3
  LDI r11, 0x30c7
  LDX r2, [r11+0xff]
  POP r9
  NOP
  PUSH r12
  PUSH r2
  RND r12
  POP r6
  NOP
L4:
  LDI r0, 0xB300
  LDI r1, 0x40ef
  ST [r0], r1
  RND r0
  SRND r10, r7
  PUSH r10
  PUSH r10
  NOP
  LDI r2, 0x676e
  STB [r2], r1
  LDI r9, 0xfffd
  STBX [r9+0x8001], r5
  NOP
  PUSH r1
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r8, 0xb831
  ST [r8], r11
  NOP
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  LDI r0, 0xb103
  LDI r1, 0xb263
  LDI r2, 70
  MSET
  JGE L5
L5:
  LDI r0, 0xB322
  LDI r1, 26
  STB [r0], r1
  NOT r5
  RND r15
  POP r1
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r15, 0
  RET
sub0:
  SUB r4, r3
  SHL r8, r2
  XOR r4, r5
  RET
sub1:
  XOR r9, r12
  SUB r10, r6
  SHL r4, r3
  RET
sub2:
  ADD r0, r0
  SUB r7, r12
  XOR r10, r3
  ADD r1, r11
  RET
sub3:
  XOR r4, r7
  SHL r8, r12
  SUB r11, r0
  RET
.org 0x2000
  .db 192, 210, 93, 211, 225, 25, 85, 70, 83, 83, 152, 104, 8, 245, 172, 253
  .db 57, 217, 219, 205, 218, 166, 208, 23, 142, 74, 157, 181, 63, 148, 2, 239
  .db 55, 139, 127, 73, 240, 236, 250, 24, 88, 122, 25, 45, 242, 241, 236, 247
  .db 57, 20, 16, 13, 122, 12, 249, 67, 114, 52, 160, 9, 213, 173, 166, 28
  .db 190, 141, 53, 175, 183, 51, 76, 38, 158, 49, 120, 152, 117, 221, 207, 192
  .db 170, 153, 141, 65, 23, 137, 225, 44, 145, 71, 236, 104, 170, 193, 247, 66
  .db 2, 35, 75, 104, 150, 67, 240, 19, 30, 72, 9, 130, 123, 236, 31, 64
  .db 251, 34, 244, 91, 139, 234, 212, 142, 110, 178, 19, 60, 92, 145, 138, 104
.bank 3
  .db 35, 57, 173, 179, 143, 16, 45, 180, 221, 12, 119, 7, 89, 154, 75, 143, 19, 31, 114, 160, 118, 196, 201, 193, 192, 188, 224, 237, 142, 15, 202, 191
.bank 4
  .db 115, 28, 52, 121, 169, 65, 151, 33, 208, 6, 3, 151, 179, 7, 84, 201, 234, 129, 247, 222, 92, 156, 4, 198, 117, 83, 99, 140, 95, 166, 154, 44
.bank 5
  .db 184, 220, 174, 109, 241, 248, 110, 246, 12, 173, 255, 48, 127, 35, 14, 77, 83, 110, 184, 147, 71, 177, 66, 128, 118, 179, 49, 53, 93, 143, 185, 130
