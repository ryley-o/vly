; Conformance: stack corner cases. PUSH/POP of R15, CALL/RET nesting, RET at SP == 0 ends the routine,
; JMPR/CALLR, and SP wrap-around.
.header init, frame
init: RET
frame:
  LDI r0, 0x1111
  PUSH r0
  PUSH r15               ; pushes the old SP value (0xFFFE)
  POP r1                 ; r1 = 0xFFFE
  POP r2                 ; r2 = 0x1111
  LDI r3, 0xAAAA
  PUSH r3
  POP r15                ; SP = 0xAAAA (loaded value wins over SP+2)
  MOV r4, r15
  LDI r15, 0             ; restore the base SP
  CALL sub1
  LDI r5, 0xB400
  ST [r5], r6
  LDI r0, target
  CALLR r0
  ST [r5], r7
  LDI r0, after
  JMPR r0
  LDI r8, 0xDEAD
after:
  LDI r8, 0x8888
  ; wrap SP below zero: push at SP=0 writes to 0xFFFE
  LDI r0, 0x9999
  PUSH r0
  LDI r9, 0xFFFE
  LD r9, [r9]
  POP r10
  RET                    ; SP == 0: ends the routine
  LDI r11, 0xBAD         ; never reached
sub1:
  CALL sub2
  INC r6
  RET
sub2:
  LDI r6, 0x0100
  RET
target:
  LDI r7, 0x7777
  RET
