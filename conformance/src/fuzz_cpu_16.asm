.header init, frame
init:
  LDI r0, 0x8
  LDI r1, 0x9473
  LDI r2, 0xfd5c
  LDI r3, 0xffff
  LDI r4, 0xfffe
  LDI r5, 0x7fff
  LDI r6, 0xe981
  LDI r7, 0x0
  LDI r8, 0x100
  LDI r9, 0xd488
  LDI r10, 0x1f
  LDI r11, 0x100
  LDI r12, 0x5a4c
  LDI r13, 0x80
  RET
frame:
  NOP
  LDI r3, 0xfffb
  LDB r8, [r3]
  XORI r5, 0x89a3
  SRND r3, r12
  SRND r5, r6
  LDI r0, 0xB322
  LDI r1, 12
  STB [r0], r1
  PUSH r15
  NOT r11
  POP r8
  LDI r0, 0xB322
  LDI r1, 32
  STB [r0], r1
  RND r10
  LDI r8, 0xbca0
  LDX r6, [r8+0x4077]
  LDI r0, 0x98bf
  LDI r1, 0xb235
  LDI r2, 227
  MSET
  NOP
  NOT r1
  MOV r9, r8
  NOP
  SRND r8, r4
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NOP
  NOP
  XORI r8, 0xff
  LDI r5, 0xbddf
  LD r0, [r5]
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  SRND r11, r11
  ADD r5, r7
  LDI r3, 0xbe78
  LDX r5, [r3+0x9f60]
  LDI r3, 0x0
  LDI r0, 0xB300
  LDI r1, 0x87fe
  ST [r0], r1
  MUL r8, r8
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  PUSH r14
  LDI r3, 0x6be0
  LDBX r7, [r3+0x12d0]
  CALL sub0
  LDI r1, 0x6915
  LDBX r12, [r1+0x7]
  LDI r0, 0xB322
  LDI r1, 11
  STB [r0], r1
  XORI r8, 0xff
  ORI r13, 0xfffe
  LDI r2, 0xa4ff
  ST [r2], r8
  LDI r0, 0x0
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  JLT L0
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  JBE L1
  LDI r2, 0xb23c
  STX [r2+0x7], r7
  LDI r0, 0xB300
  LDI r1, 0xec0a
  ST [r0], r1
L0:
  AND r9, r7
  CALL sub3
  SRND r5, r8
L1:
  LDI r0, 0xB322
  LDI r1, 15
  STB [r0], r1
  RND r3
  NOP
  MOV r1, r14
  LDI r0, 0x83a4
  LDI r1, 0x52f0
  LDI r2, 259
  MSET
  RND r11
  LDI r3, 0x9a90
  LDI r9, 0xe987
  LDBX r4, [r9+0xff]
  LDI r12, 0xa7cb
  LDBX r5, [r12+0x2]
  JNC L2
  SUB r13, r13
  NOP
  JA L3
  PUSH r4
  SARI r15, 2
  LDI r0, 0x4559
  LDB r2, [r0]
  CALL sub1
L2:
  LDI r10, 0x67f4
  CALL sub1
  LDI r0, 0x2efd
  STBX [r0+0x1], r10
L3:
  MOV r4, r8
  POP r11
  LDI r0, 0xB322
  LDI r1, 25
  STB [r0], r1
  CALL sub2
  JBE L4
  PUSH r12
  LDI r6, 0xd959
  LDX r9, [r6+0x4ab5]
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x2da4
  ST [r0], r1
  RND r12
  LDI r9, 0x754c
  LDB r10, [r9]
L4:
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  POP r13
  NEG r4
  LDI r2, 0x107f
  STX [r2+0x723d], r5
  LDI r3, 0xb2f9
  LDX r3, [r3+0xea3b]
  MOV r6, r3
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  ADD r10, r0
  CALLR r5
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r0, 0xa523
  LDX r3, [r0+0x3ea2]
  SHRI r6, 1
  CALL sub0
  POP r9
  ANDI r7, 0x8001
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r5, 0x6481
  LDB r10, [r5]
  NOT r9
  JBE L5
  NOT r13
  LDI r7, 0xfff6
  LD r11, [r7]
  LDI r4, 0x63e0
  STBX [r4+0x20], r5
L5:
  NEG r7
  LDI r8, 0xaa10
  STX [r8+0x7f], r12
  POP r5
  LDI r5, 0x67ca
  LDX r12, [r5+0x2]
  NEG r0
  NOP
  JGE L6
  NOP
L6:
  NOT r4
  LDI r7, 0x7a5f
  STX [r7+0x9cfa], r11
  NOP
  HALT
  LDI r0, 0xB322
  LDI r1, 27
  STB [r0], r1
  LDI r1, 0x358d
  STB [r1], r2
  RND r12
  CMP r10, r6
  PUSH r11
  LDI r0, 0x5c40
  JA L7
  LDI r6, 0x4
  CALL sub2
  JA L8
L8:
  CALL sub0
L7:
  ANDI r2, 0x7f
  LDI r7, 0xa01c
  CALL sub3
  ORI r3, 0x8
  POP r2
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  NEG r6
  CALL sub2
  JA L9
  LDI r3, 0xb2fa
  LD r11, [r3]
  PUSH r14
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  NOP
  SARI r8, 0
  NOP
  NOP
L9:
  LDI r2, 0x2633
  NOP
  LDI r12, 0x6953
  ST [r12], r0
  LDI r0, 0x41a8
  STX [r0+0x8], r10
  SHL r3, r1
  LDI r3, 0xb24d
  LDB r4, [r3]
  NOP
  CALL sub2
  NOP
  RND r3
  LDI r0, 0xB300
  LDI r1, 0x6f12
  ST [r0], r1
  NOP
  DIV r10, r9
  LDI r10, 0xb715
  POP r5
  NOP
  LDI r3, 0xba87
  STX [r3+0x1f], r3
  NEG r8
  CALL sub1
  NOP
  NOP
  RND r8
  LDI r11, 0x6862
  LD r4, [r11]
  CALLR r4
  NOP
  LDI r3, 0xbb6c
  NOP
  CALL sub0
  RND r7
  JC L10
  SHRI r7, 10
  JBE L11
L11:
  LDI r11, 0x3a85
  SRND r9, r11
L10:
  LDI r0, 0xb28c
  LDX r1, [r0+0xa883]
  LDI r12, 0x60a0
  LDI r0, 0xB322
  LDI r1, 37
  STB [r0], r1
  MOV r3, r8
  LDI r0, 0xB322
  LDI r1, 38
  STB [r0], r1
  LDI r15, 0x4
  PUSH r3
  PUSH r6
  NOP
  NEG r14
  LDI r1, 0xfffe
  ST [r1], r6
  JZ L12
  MUL r12, r11
  LDI r0, 0xB300
  LDI r1, 0x8955
  ST [r0], r1
  MOD r7, r0
  LDI r0, 0xB322
  LDI r1, 11
  STB [r0], r1
L12:
  LDI r0, 0xB322
  LDI r1, 1
  STB [r0], r1
  SARI r13, 0
  POP r2
  LDI r0, 0x7078
  NOP
  PUSH r0
  SHLI r10, 4
  JLE L13
  POP r8
  POP r8
  NOT r13
L13:
  NOT r0
  NEG r7
  SARI r2, 10
  LDI r15, 0
  RET
sub0:
  ADD r0, r6
  SUB r2, r4
  SUB r7, r10
  SUB r11, r4
  RET
sub1:
  XOR r4, r10
  SHL r5, r2
  XOR r11, r1
  RET
sub2:
  ADD r7, r9
  SHL r6, r4
  ADD r10, r9
  RET
sub3:
  XOR r8, r6
  ADD r1, r6
  RET
.org 0x2000
  .db 244, 78, 113, 133, 98, 86, 91, 89, 55, 12, 109, 2, 97, 255, 116, 185
  .db 108, 77, 77, 77, 94, 80, 168, 32, 112, 42, 24, 138, 185, 107, 56, 193
  .db 51, 173, 138, 246, 130, 186, 9, 210, 167, 200, 140, 80, 164, 13, 171, 133
  .db 54, 34, 111, 77, 97, 10, 120, 57, 114, 174, 73, 27, 86, 5, 149, 24
  .db 113, 139, 172, 255, 201, 36, 198, 167, 225, 34, 34, 34, 219, 31, 162, 130
  .db 216, 144, 241, 187, 0, 197, 106, 209, 98, 27, 12, 207, 185, 237, 233, 79
  .db 201, 36, 192, 136, 205, 139, 23, 250, 18, 215, 43, 122, 168, 20, 75, 41
  .db 22, 182, 143, 20, 105, 76, 123, 171, 70, 229, 22, 180, 92, 86, 89, 148
.bank 3
  .db 133, 112, 164, 14, 249, 204, 67, 246, 178, 183, 198, 213, 10, 210, 79, 94, 174, 252, 71, 90, 123, 233, 95, 254, 246, 126, 47, 0, 15, 82, 227, 27
.bank 4
  .db 211, 212, 131, 66, 152, 238, 209, 32, 184, 69, 215, 95, 188, 124, 134, 23, 181, 1, 27, 221, 231, 213, 195, 217, 99, 147, 78, 68, 131, 7, 32, 176
.bank 5
  .db 228, 113, 154, 134, 118, 71, 217, 204, 76, 80, 11, 91, 156, 92, 177, 57, 154, 47, 113, 240, 144, 14, 28, 230, 184, 108, 37, 19, 14, 174, 187, 255
