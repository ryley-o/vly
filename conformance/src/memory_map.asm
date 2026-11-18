; Conformance: reads and writes across every region of the memory map, including read-only and reserved areas,
; I/O registers, SAVECTL and ROMBANK behavior. Results are left in work RAM and in the hashed state.
.header init, frame
OUT = 0xB400
init:
  ; seed some RAM
  LDI r0, 0xB500
  LDI r1, 0xA5A5
  ST [r0], r1
  RET
frame:
  LDI r10, OUT           ; r10 = output pointer
  ; --- ROM writes fault and are ignored (fixed area, window, bank-window edge)
  LDI r0, 0x0000
  LDI r1, 0x1111
  ST [r0], r1
  LDI r0, 0x5FFF
  STB [r0], r1
  LD r2, [r0]            ; byte at 5FFF then wraps to 6000 (save): reads mix
  ST [r10], r2
  ADDI r10, 2
  ; --- SAVE region read/write
  LDI r0, 0x6000
  LDI r1, 0x1234
  ST [r0], r1
  LDI r0, 0x63FF
  LDI r1, 0x77
  STB [r0], r1
  LD r2, [r0]            ; 0x63FF = 0x77, next byte 0x6400 is font 0 (0x00)
  ST [r10], r2
  ADDI r10, 2
  ; --- FONT is read-only; a 16-bit store straddling save/font writes only the save byte
  LDI r0, 0x63FF
  LDI r1, 0xCDAB
  ST [r0], r1
  LDI r0, 0x63FF
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0x6400+16
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  ; --- reserved regions read zero, ignore writes, no fault (reset by next frame)
  LDI r0, 0x69F0
  LDI r1, 0xFFFF
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0xB280
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  ; --- video memory is plain RAM, including reserved bits
  LDI r0, 0xB200
  LDI r1, 0xF123
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0x8000
  LDI r1, 0xBEEF
  ST [r0], r1
  LDI r0, 0xA000
  ST [r0], r1
  ; --- I/O: LCDC stores all bits; FRAME/INPUT/PRESSED/STATUS ignore writes
  LDI r0, 0xB300
  LDI r1, 0xFFFF
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0xB300
  LDI r1, 0x0001
  ST [r0], r1
  LDI r0, 0xB310
  LDI r1, 0x4444
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0xB314
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  ; --- ROMBANK masks to 7 bits and changes the window
  LDI r0, 0xB322
  LDI r1, 0x00FF
  STB [r0], r1
  LDB r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0x4000
  LDB r2, [r0]           ; bank 127: beyond the image -> 0
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0xB322
  LDI r1, 2
  STB [r0], r1
  ; --- SAVECTL: reads 0, only the byte value 1 triggers
  LDI r0, 0xB320
  LDI r1, 2
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r1, 1
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  ; --- audio registers are read/write
  LDI r0, 0xB340
  LDI r1, 0x1234
  ST [r0], r1
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  LDI r0, 0xB360
  ST [r0], r1             ; just past the audio block: ignored
  LD r2, [r0]
  ST [r10], r2
  ADDI r10, 2
  ; --- 16-bit access wrapping at the top of memory, and across 0xFFFF -> 0x0000
  LDI r0, 0xFFFF
  LDI r1, 0x5AA5
  STB [r0], r1
  LD r2, [r0]            ; low byte from FFFF, high byte from ROM[0] = 'V'
  ST [r10], r2
  ADDI r10, 2
  ; --- executing code from RAM: write "LDI r3, 0x7777 ; RET" and call it
  LDI r0, 0xB600
  LDI r1, 0x0003
  ST [r0], r1             ; LDI r0 encoding: op 03, regs 30 -> bytes 03 30
  LDI r1, 0x0000
  LDI r2, 0x3003
  ST [r0], r2             ; bytes 03 30
  LDI r2, 0x7777
  STX [r0+2], r2          ; imm
  LDI r2, 0x003D
  STX [r0+4], r2          ; RET (3D 00)
  LDI r0, 0xB600
  CALLR r0
  ST [r10], r3
  RET
