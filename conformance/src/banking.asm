; Conformance: ROM banking. Reads the first byte of many banks, including past the end of the image,
; and executes code that lives in a banked window.
.header init, frame
OUT = 0xB400
init: RET
frame:
  LDI r10, OUT
  LDI r4, 0              ; bank counter
  LDI r5, 0xB322
.next:
  STB [r5], r4
  LDI r6, 0x4000
  LDB r7, [r6]
  ST [r10], r7
  ADDI r10, 2
  LDI r6, 0x5FFF
  LDB r7, [r6]
  ST [r10], r7
  ADDI r10, 2
  ADDI r4, 3
  CMPI r4, 130
  JC .next
  ; call code in bank 6 (window address 0x4000)
  LDI r4, 6
  STB [r5], r4
  LDI r0, 0x4000
  CALLR r0
  ST [r10], r1
  LDI r4, 2
  STB [r5], r4
  RET
.org 16384
.db 0x10, 0x11, 0x12
.bank 3
.db 0x30, 0x31
.bank 6
bank6: LDI r1, 0xC0DE
  RET
.org 6*8192 + 8191
.db 0x66
.bank 9
.db 0x90
.bank 20
.db 0x14
