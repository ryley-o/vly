.header init, frame
init:
  LDI r0, 0xffff
  LDI r1, 0xf
  LDI r2, 0x4155
  LDI r3, 0x1
  LDI r4, 0xc050
  LDI r5, 0xfb82
  LDI r6, 0x4
  LDI r7, 0x7f63
  LDI r8, 0xacf
  LDI r9, 0x20
  LDI r10, 0xb251
  LDI r11, 0x2
  LDI r12, 0x7fdd
  LDI r13, 0x0
  RET
frame:
  NOP
  LDI r10, 0x7937
  LDX r3, [r10+0x3]
  LDI r2, 0xffff
  POP r7
  MOV r7, r11
  LDI r7, 0xb2bf
  STX [r7+0x3a15], r2
  NOP
  LDI r6, 0x9a88
  LDB r8, [r6]
  NOP
  SHLI r0, 3
  LDI r6, 0x78c3
  ST [r6], r2
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0x2445
  ST [r0], r1
  SHLI r9, 9
  MOV r0, r3
  PUSH r9
  LDI r0, 0xb255
  LDI r1, 0xbb24
  LDI r2, 173
  MSET
  CALL sub1
  RND r10
  LDI r0, 0xB322
  LDI r1, 17
  STB [r0], r1
  PUSH r1
  LDI r0, 0xB300
  LDI r1, 0xf5e4
  ST [r0], r1
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LDI r1, 0xfca3
  ST [r1], r7
  OR r1, r0
  NOP
  HALT
  NOP
  LDI r8, 0xb13d
  ST [r8], r4
  CMPI r12, 0xffff
  RND r7
  LDI r0, 0xB322
  LDI r1, 14
  STB [r0], r1
  XORI r13, 0xff
  NOP
  LDI r0, 0xB322
  LDI r1, 10
  STB [r0], r1
  LDI r2, 0x3405
  STBX [r2+0x2f38], r7
  CALL sub1
  NOP
  NOP
  LDI r10, 0x7
  PUSH r11
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  CALL sub0
  POP r1
  LDI r0, 0xB322
  LDI r1, 0
  STB [r0], r1
  CALL sub3
  LDI r11, 0xb1bb
  ST [r11], r12
  CALL sub0
  SRND r10, r2
  NOP
  LDI r4, 0x7baf
  ST [r4], r9
  NEG r10
  LDI r11, 0x67fb
  STX [r11+0xfffe], r9
  XORI r6, 0x1
  PUSH r3
  LDI r9, 0xb914
  STX [r9+0x0], r9
  AND r11, r12
  RND r9
  SRND r7, r6
  MUL r9, r6
  MULI r12, 0xf
  MOV r6, r3
  LDI r14, 0xbfa9
  SARI r5, 6
  NOP
  RND r7
  NOP
  LDI r0, 0xb2eb
  LDI r1, 0x62aa
  LDI r2, 92
  MCPY
  NOP
  LDI r0, 0x9907
  LDI r1, 0xb3b8
  LDI r2, 270
  MCPY
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  SRND r3, r0
  LDI r0, 0xB322
  LDI r1, 21
  STB [r0], r1
  MOV r12, r9
  LDI r4, 0x8000
  CALL sub3
  NOT r0
  LDI r1, 0xa3dd
  ST [r1], r1
  LDI r0, 0x681a
  LDX r2, [r0+0xffff]
  NOP
  LDI r8, 0x8a8b
  LD r12, [r8]
  LDI r7, 0x5e06
  LDB r5, [r7]
  LDI r6, 0x7640
  LDX r2, [r6+0x8829]
  CALL sub1
  NOP
  LDI r0, 0x1022
  LDI r1, 0x3b61
  LDI r2, 86
  MSET
  NOP
  CMP r1, r12
  PUSH r11
  CALL sub1
  SRND r11, r10
  LDI r8, 0xb4eb
  STX [r8+0x8], r6
  LDI r0, 0xffff
  LDI r1, 0xa05d
  LDI r2, 133
  MCPY
  LDI r6, 0xdd8a
  SARI r8, 4
  LDI r0, 0xb10f
  LDI r1, 0x82d2
  LDI r2, 158
  MSET
  NEG r2
  SHL r12, r6
  NOP
  NEG r8
  CALL sub1
  ADDI r1, 0xd3b0
  SHLI r9, 3
  LDI r0, 0x6034
  LDI r1, 0xb519
  LDI r2, 7
  MSET
  NOP
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  JBE L0
L0:
  NOP
  RND r11
  CALL sub0
  LDI r4, 0x61c2
  STB [r4], r2
  SHRI r12, 2
  SARI r4, 1
  CALLR r1
  LDI r0, 0xB300
  LDI r1, 0x9578
  ST [r0], r1
  LDI r0, 0xB300
  LDI r1, 0xd6ec
  ST [r0], r1
  LDI r5, 0xb30d
  LDB r3, [r5]
  LDI r10, 0x7f
  LDI r15, 0
  RET
sub0:
  SUB r9, r1
  SHL r11, r5
  ADD r3, r12
  ADD r5, r9
  XOR r0, r11
  RET
sub1:
  SUB r9, r5
  SHL r11, r5
  ADD r4, r5
  RET
sub2:
  XOR r6, r2
  SHL r3, r12
  XOR r6, r6
  XOR r4, r4
  SUB r7, r4
  RET
sub3:
  SHL r5, r12
  ADD r4, r6
  SHL r10, r4
  XOR r9, r0
  SHL r4, r3
  RET
.org 0x2000
  .db 218, 31, 41, 217, 120, 183, 121, 51, 230, 15, 243, 20, 132, 198, 120, 34
  .db 197, 2, 248, 72, 71, 85, 89, 236, 77, 155, 196, 118, 226, 89, 255, 182
  .db 91, 19, 116, 117, 188, 121, 235, 98, 160, 194, 44, 59, 20, 158, 234, 25
  .db 138, 219, 177, 141, 43, 128, 234, 128, 252, 94, 4, 248, 224, 125, 196, 17
  .db 49, 105, 73, 118, 170, 18, 115, 73, 221, 11, 44, 86, 184, 178, 201, 204
  .db 72, 122, 244, 85, 179, 172, 173, 140, 173, 129, 141, 77, 14, 146, 239, 238
  .db 234, 244, 198, 118, 106, 219, 121, 180, 193, 241, 100, 35, 63, 21, 169, 70
  .db 12, 230, 135, 112, 114, 65, 153, 32, 77, 246, 71, 37, 200, 211, 47, 89
.bank 3
  .db 222, 64, 60, 230, 183, 35, 33, 197, 72, 109, 202, 31, 115, 164, 111, 44, 227, 12, 225, 206, 177, 206, 38, 24, 149, 215, 22, 147, 145, 254, 159, 38
.bank 4
  .db 158, 255, 201, 66, 140, 142, 110, 189, 43, 81, 23, 173, 81, 64, 77, 204, 110, 1, 85, 4, 218, 131, 207, 54, 132, 76, 32, 193, 124, 63, 203, 137
.bank 5
  .db 44, 0, 157, 241, 159, 209, 57, 171, 152, 75, 199, 83, 36, 27, 23, 181, 213, 223, 81, 203, 72, 225, 200, 159, 254, 136, 60, 102, 216, 229, 254, 17
