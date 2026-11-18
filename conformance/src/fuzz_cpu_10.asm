.header init, frame
init:
  LDI r0, 0x8001
  LDI r1, 0xffff
  LDI r2, 0x7f
  LDI r3, 0x8
  LDI r4, 0x100
  LDI r5, 0x100
  LDI r6, 0x7
  LDI r7, 0x2bee
  LDI r8, 0x1
  LDI r9, 0x2
  LDI r10, 0x8
  LDI r11, 0x7fff
  LDI r12, 0x8000
  LDI r13, 0x4
  RET
frame:
  LDI r0, 0xB322
  LDI r1, 35
  STB [r0], r1
  LDI r2, 0x8239
  STB [r2], r6
  JLT L0
  NOT r11
  MOV r3, r4
  CALL sub3
  SARI r4, 5
L0:
  LDI r8, 0x7d1
  ST [r8], r11
  NOP
  SRND r12, r10
  TST r0, r10
  SRND r5, r4
  NOP
  NOP
  MOV r2, r2
  LDI r9, 0xb970
  LDB r6, [r9]
  RND r15
  NOP
  NOT r10
  SRND r11, r10
  POP r3
  RND r12
  RND r14
  SRND r2, r0
  LDI r5, 0x9ad7
  NOP
  NOP
  SRND r12, r6
  PUSH r5
  SARI r13, 2
  NOP
  LDI r3, 0x6426
  LD r9, [r3]
  LDI r0, 0xB322
  LDI r1, 37
  STB [r0], r1
  LDI r0, 0x3302
  LDB r7, [r0]
  SHLI r6, 0
  SHR r6, r8
  LDI r0, 0xB320
  LDI r1, 0
  ST [r0], r1
  POP r1
  MULI r10, 0x7fff
  LDI r0, 0xB300
  LDI r1, 0x7f3c
  ST [r0], r1
  MUL r8, r2
  LDI r6, 0x7
  RND r0
  LDI r4, 0x3001
  STX [r4+0x8000], r6
  LDI r6, 0xb369
  LDBX r0, [r6+0x0]
  LDI r8, 0x6943
  STX [r8+0x7fff], r7
  RND r0
  RND r2
  JBE L1
  SARI r13, 2
  PUSH r1
L1:
  SHLI r2, 10
  CALL sub2
  LDI r14, 0x434d
  PUSH r8
  JBE L2
  LDI r15, 0x7f
  TST r10, r3
  MOV r9, r10
  POP r7
  LDI r8, 0x6311
  NOP
  POP r8
  LDI r0, 0xB300
  LDI r1, 0x9477
  ST [r0], r1
L2:
  LDI r0, 0xB322
  LDI r1, 22
  STB [r0], r1
  LDI r4, 0x6644
  STX [r4+0x642c], r12
  ADDI r5, 0xecbc
  SRND r12, r11
  LDI r10, 0xb466
  STX [r10+0x1f], r0
  MOV r6, r9
  MOV r15, r0
  LDI r3, 0xb0c3
  LDBX r9, [r3+0x7f]
  LDI r7, 0xb2ef
  LDBX r8, [r7+0x0]
  LDI r6, 0x6b50
  LDX r2, [r6+0xff]
  NOP
  LDI r0, 0xB300
  LDI r1, 0x72ba
  ST [r0], r1
  POP r3
  PUSH r5
  LDI r12, 0x7e25
  LDB r2, [r12]
  LDI r13, 0x8000
  LDI r0, 0xB320
  LDI r1, 1
  ST [r0], r1
  MOV r7, r5
  XORI r7, 0x0
  LDI r2, 0x4d2d
  NOP
  POP r2
  LDI r10, 0x9c6a
  LDX r5, [r10+0x8fc7]
  LDI r11, 0xff
  POP r14
  CALL sub2
  LDI r0, 0xB300
  LDI r1, 0x517a
  ST [r0], r1
  JGE L3
L3:
  LDI r6, 0xfffd
  ST [r6], r12
  LDI r4, 0xb225
  LDI r3, 0xffff
  STB [r3], r1
  NOT r7
  CALL sub1
  LDI r8, 0x603e
  LD r6, [r8]
  SRND r12, r10
  LDI r0, 0xadc1
  LDI r1, 0xbba1
  LDI r2, 239
  MSET
  LDI r6, 0xb316
  LD r6, [r6]
  LDI r5, 0x2ea1
  LDB r1, [r5]
  POP r8
  LDI r5, 0xb0f6
  LD r7, [r5]
  XORI r9, 0xfffe
  ADDI r11, 0x20
  RND r5
  JA L4
  SRND r2, r6
  NOP
  CALL sub1
  LDI r0, 0xB322
  LDI r1, 23
  STB [r0], r1
  PUSH r5
L4:
  RND r11
  SARI r5, 5
  SRND r9, r1
  XOR r4, r3
  LDI r10, 0x7f
  LDI r0, 0xB322
  LDI r1, 39
  STB [r0], r1
  NOP
  LDI r0, 0xB300
  LDI r1, 0xec97
  ST [r0], r1
  LDI r3, 0xc1ce
  STB [r3], r3
  ADDI r2, 0xffff
  NEG r1
  AND r7, r9
  CALL sub2
  LDI r6, 0x6c1b
  STB [r6], r12
  CALL sub0
  NEG r5
  RND r12
  NOT r7
  LDI r11, 0xb34b
  LDB r5, [r11]
  CALL sub3
  NOP
  LDI r2, 0xff
  RND r2
  LDI r8, 0xb28c
  STB [r8], r4
  NOP
  JBE L5
  LDI r0, 0xB300
  LDI r1, 0x469d
  ST [r0], r1
  CALL sub2
L5:
  LDI r5, 0xb1da
  LDX r11, [r5+0x3]
  ADD r0, r7
  LDI r7, 0x68ad
  STB [r7], r2
  SHR r2, r6
  LDI r11, 0x6438
  LDB r8, [r11]
  SARI r15, 12
  SHLI r2, 11
  SUB r15, r6
  POP r10
  SHLI r1, 6
  POP r5
  LDI r11, 0xb2a3
  STBX [r11+0x100], r1
  LDI r0, 0xB300
  LDI r1, 0x35fd
  ST [r0], r1
  LDI r15, 0
  RET
sub0:
  SUB r2, r6
  SUB r2, r10
  XOR r10, r1
  SUB r8, r12
  RET
sub1:
  SUB r9, r2
  SHL r7, r9
  ADD r10, r11
  SUB r7, r10
  RET
sub2:
  XOR r9, r10
  SHL r7, r0
  XOR r1, r3
  ADD r10, r3
  XOR r7, r9
  RET
sub3:
  XOR r5, r0
  ADD r5, r1
  SHL r10, r7
  SUB r6, r0
  XOR r3, r9
  RET
.org 0x2000
  .db 35, 80, 247, 12, 207, 160, 84, 68, 194, 158, 88, 5, 254, 87, 252, 1
  .db 75, 211, 48, 229, 166, 29, 97, 233, 192, 39, 29, 206, 59, 213, 215, 91
  .db 72, 214, 200, 38, 24, 55, 131, 65, 219, 187, 113, 16, 76, 181, 248, 58
  .db 67, 78, 252, 81, 128, 203, 18, 57, 145, 209, 159, 96, 107, 173, 96, 240
  .db 212, 170, 158, 115, 125, 242, 179, 62, 18, 3, 6, 41, 83, 40, 6, 137
  .db 7, 148, 59, 150, 118, 162, 32, 195, 227, 216, 102, 18, 92, 233, 10, 132
  .db 151, 252, 7, 150, 98, 143, 100, 236, 211, 115, 126, 190, 11, 195, 60, 47
  .db 92, 137, 91, 67, 193, 114, 73, 255, 115, 251, 131, 97, 213, 178, 28, 245
.bank 3
  .db 177, 82, 86, 63, 127, 226, 45, 146, 226, 163, 169, 14, 226, 21, 44, 147, 136, 249, 98, 1, 127, 167, 66, 96, 165, 188, 184, 180, 79, 252, 91, 170
.bank 4
  .db 143, 32, 222, 105, 243, 193, 226, 52, 217, 16, 116, 193, 26, 190, 77, 246, 254, 181, 138, 199, 124, 63, 8, 20, 107, 240, 125, 173, 70, 175, 125, 170
.bank 5
  .db 52, 108, 25, 70, 243, 218, 17, 51, 113, 32, 27, 238, 176, 185, 110, 199, 85, 252, 7, 84, 238, 60, 144, 127, 129, 148, 180, 218, 104, 239, 199, 202
