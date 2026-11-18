.header init, frame
init:
  LDI r0, 0xfffe
  LDI r1, 0xc938
  LDI r2, 0x499
  LDI r3, 0x3
  LDI r4, 0x3
  LDI r5, 0x72fc
  LDI r6, 0xb918
  LDI r7, 0x8000
  LDI r8, 0x8
  LDI r9, 0x9af
  LDI r10, 0x4
  LDI r11, 0x10
  LDI r12, 0x8000
  LDI r13, 0x1f
  RET
frame:
  RND r7
  RND r3
  CMPI r11, 0xed65
  LDI r12, 0x60e6
  STB [r12], r5
  CALL sub2
  LDI r3, 0x2524
  LD r4, [r3]
  CALL sub2
  MOV r12, r5
  CMPI r2, 0x6539
  JNZ L0
  RND r1
  LDI r2, 0xb2b8
  STX [r2+0x8000], r3
  POP r1
  LDI r1, 0x1c00
  STX [r1+0x1f], r8
  LDI r0, 0xB322
  LDI r1, 21
  STB [r0], r1
L0:
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  LDI r2, 0x1
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  SRND r1, r11
  MULI r10, 0x6250
  LDI r0, 0xfff0
  LDI r1, 0x953b
  LDI r2, 196
  MCPY
  LDI r0, 0xB322
  LDI r1, 24
  STB [r0], r1
  NOP
  LDI r0, 0xB300
  LDI r1, 0xa76c
  ST [r0], r1
  NOP
  NOT r13
  CALL sub0
  PUSH r3
  LDI r2, 0x8a5c
  STB [r2], r0
  POP r11
  NOP
  NOP
  LDI r3, 0x6141
  LD r7, [r3]
  OR r12, r7
  PUSH r1
  SAR r10, r5
  PUSH r1
  RND r10
  CMP r13, r5
  LDI r8, 0x8e65
  LD r11, [r8]
  LDI r0, 0xB300
  LDI r1, 0x4253
  ST [r0], r1
  LDI r5, 0xb3b9
  STBX [r5+0xf], r12
  SRND r4, r5
  LDI r0, 0xB300
  LDI r1, 0x6f24
  ST [r0], r1
  LDI r8, 0xb20b
  ST [r8], r10
  LDI r0, 0xB322
  LDI r1, 21
  STB [r0], r1
  LDI r0, 0xb39e
  ST [r0], r6
  SRND r8, r4
  LDI r0, 0xB322
  LDI r1, 7
  STB [r0], r1
  LDI r1, 0x60ef
  LDBX r6, [r1+0x20]
  NOP
  LDI r12, 0x639a
  LD r11, [r12]
  LDI r0, 0xb216
  LDI r1, 0xb233
  LDI r2, 37
  MSET
  NEG r4
  MOV r1, r2
  SRND r2, r0
  LDI r7, 0x6724
  LDI r0, 0xB300
  LDI r1, 0x6e44
  ST [r0], r1
  LDI r4, 0xb594
  LD r6, [r4]
  POP r0
  NOP
  LDI r9, 0x8001
  NOP
  LDI r0, 0xB322
  LDI r1, 34
  STB [r0], r1
  NOP
  MOV r7, r12
  LDI r9, 0xa596
  LDBX r2, [r9+0xffff]
  LDI r12, 0xb2a9
  ST [r12], r8
  NOP
  LDI r7, 0xb221
  LDB r4, [r7]
  POP r10
  LDI r0, 0xb260
  LDI r1, 0xa0ab
  LDI r2, 72
  MSET
  MOV r5, r3
  NOP
  SHLI r9, 10
  LDI r0, 0xB322
  LDI r1, 37
  STB [r0], r1
  MOV r2, r3
  LDI r13, 0xb5fe
  LDI r0, 0xb0d2
  ST [r0], r4
  NOP
  NOP
  SRND r8, r1
  LDI r12, 0x6838
  LDI r12, 0xbeb4
  LDX r9, [r12+0x100]
  LDI r8, 0x1
  ADDI r1, 0x7fff
  CALL sub1
  SRND r11, r1
  JGE L1
  SHLI r0, 14
  SHLI r0, 13
  LDI r4, 0x7449
  STB [r4], r10
  LDI r8, 0xbce6
  LDBX r7, [r8+0x7fff]
  LDI r7, 0x2
  SHRI r9, 12
  ADDI r3, 0xdcb9
  NOP
L1:
  LDI r0, 0xB322
  LDI r1, 8
  STB [r0], r1
  LDI r0, 0x69a3
  LDI r1, 0x665a
  LDI r2, 247
  MCPY
  SRND r5, r12
  LDI r10, 0xbd62
  STB [r10], r11
  RND r14
  LDI r0, 0x79fc
  LDI r1, 0xb1a8
  LDI r2, 206
  MCPY
  OR r13, r7
  NOP
  NOT r6
  NOP
  AND r8, r6
  NOP
  CALL sub2
  LDI r0, 0xB322
  LDI r1, 4
  STB [r0], r1
  RND r4
  LDI r9, 0xd744
  LDX r1, [r9+0x7]
  LDI r9, 0x71fb
  STBX [r9+0x7], r10
  LDI r12, 0xb048
  ST [r12], r1
  LDI r0, 0x625a
  LDI r1, 0x94b6
  LDI r2, 181
  MSET
  RND r13
  NOP
  LDI r0, 0xb2bb
  LDI r1, 0xd898
  LDI r2, 169
  MCPY
  LDI r0, 0xB300
  LDI r1, 0x816b
  ST [r0], r1
  SRND r12, r8
  ADDI r8, 0x100
  NOP
  LDI r1, 0x687d
  LDB r10, [r1]
  LDI r7, 0xb492
  LDB r7, [r7]
  LDI r0, 0xB300
  LDI r1, 0xce83
  ST [r0], r1
  LDI r2, 0x62ac
  STBX [r2+0x4], r0
  SRND r5, r12
  SHRI r13, 0
  LDI r0, 0xB300
  LDI r1, 0xbe75
  ST [r0], r1
  LDI r15, 0
  RET
sub0:
  ADD r5, r11
  SHL r0, r8
  SUB r0, r6
  XOR r1, r11
  ADD r3, r5
  RET
sub1:
  ADD r3, r12
  XOR r9, r2
  SUB r1, r4
  RET
sub2:
  SUB r1, r10
  SUB r8, r5
  XOR r9, r3
  SUB r3, r8
  RET
sub3:
  XOR r2, r2
  SUB r3, r1
  SUB r6, r2
  XOR r6, r2
  RET
.org 0x2000
  .db 227, 37, 44, 164, 163, 126, 113, 110, 245, 80, 6, 179, 194, 42, 110, 30
  .db 72, 140, 186, 232, 49, 152, 115, 168, 69, 136, 148, 180, 161, 96, 171, 91
  .db 203, 251, 70, 63, 3, 94, 49, 111, 72, 95, 38, 163, 45, 73, 59, 164
  .db 93, 90, 199, 34, 184, 239, 104, 166, 33, 66, 186, 218, 49, 166, 134, 237
  .db 175, 37, 169, 205, 26, 42, 20, 38, 85, 50, 114, 6, 89, 111, 235, 24
  .db 80, 218, 64, 6, 4, 57, 144, 226, 14, 51, 131, 94, 105, 76, 145, 141
  .db 166, 82, 163, 102, 243, 239, 16, 194, 82, 163, 43, 132, 1, 151, 175, 96
  .db 218, 122, 183, 235, 169, 169, 27, 242, 89, 148, 63, 53, 224, 43, 26, 66
.bank 3
  .db 19, 28, 247, 189, 203, 99, 15, 250, 61, 63, 139, 30, 204, 97, 59, 224, 221, 86, 233, 17, 96, 74, 25, 61, 132, 22, 60, 130, 78, 31, 220, 202
.bank 4
  .db 167, 246, 164, 209, 152, 180, 104, 76, 193, 241, 14, 102, 43, 215, 187, 156, 166, 198, 114, 248, 83, 143, 40, 221, 24, 6, 164, 62, 40, 108, 19, 86
.bank 5
  .db 50, 152, 183, 34, 216, 11, 200, 243, 201, 121, 134, 42, 46, 143, 222, 123, 78, 62, 194, 19, 159, 15, 240, 87, 167, 246, 194, 211, 40, 90, 241, 52
