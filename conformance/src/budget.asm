; Conformance: cycle budget. Init burns more than one frame's budget but less than init's, the frame routine
; alternates between short and runaway frames (cut off by the budget, flagging OVERRUN in the next frame),
; and an illegal opcode ends a routine early.
.header init, frame
init:
  LDI r0, 20000
.l: DEC r0
  JNZ .l                 ; 20000 * 4 = 80000 cycles
  LDI r0, 20000
.l2: DEC r0
  JNZ .l2                ; another 80000: init total 160000 > 120000 (a frame) but fine for init
  RET
frame:
  LDI r1, 0xB310
  LD r1, [r1]            ; frame counter
  ANDI r1, 3
  CMPI r1, 1
  JZ .runaway
  CMPI r1, 2
  JZ .illegal
  LDI r2, 0xB400
  LD r3, [r2]
  INC r3
  ST [r2], r3
  RET
.runaway:
  INC r4
  JMP .runaway
.illegal:
  LDI r6, 0xB402
  LDI r7, 0x1111
  ST [r6], r7
  .db 0xEE, 0x00
  LDI r7, 0x2222
  ST [r6], r7
  RET
