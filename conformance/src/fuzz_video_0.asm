.header init, frame
init:
  LDI r2, 0
  LDI r3, 41359
  SRND r3, r3
  ; fill all video memory (tiles, maps, OAM, palettes) with random words
  LDI r0, 0x8000
  LDI r1, 0x1940
.fill:
  RND r2
  ST [r0], r2
  ADDI r0, 2
  DEC r1
  JNZ .fill
  ; place sprites on the screen: x = (rnd & 63) - 40, y = (rnd & 63) - 40 for all 64
  LDI r0, 0xB000
  LDI r1, 64
.spr:
  RND r2
  ANDI r2, 63
  ADDI r2, -40
  ST [r0], r2
  RND r2
  ANDI r2, 63
  ADDI r2, -40
  STX [r0+2], r2
  ADDI r0, 8
  DEC r1
  JNZ .spr
  LDI r0, 0xB300
  LDI r1, 0x7
  ST [r0], r1
  RET
frame:
  ; random scroll/window registers and a random LCDC (bits 0-2 vary, higher bits random)
  RND r2
  LDI r0, 0xB302
  STB [r0], r2
  RND r2
  LDI r0, 0xB303
  STB [r0], r2
  RND r2
  ANDI r2, 0xBF
  LDI r0, 0xB304
  STB [r0], r2
  RND r2
  ANDI r2, 0x9F
  LDI r0, 0xB305
  STB [r0], r2
  RND r2
  ANDI r2, 0x7
  ORI r2, 1
  LDI r0, 0xB300
  ST [r0], r2
  ; mutate 8 random sprites (position, tile, attributes) and some tile bytes
  LDI r4, 8
.m:
  RND r2
  ANDI r2, 63
  SHLI r2, 3
  ADDI r2, 0xB000
  RND r3
  ANDI r3, 63
  ADDI r3, -40
  ST [r2], r3
  RND r3
  STX [r2+4], r3
  RND r3
  STX [r2+6], r3
  RND r2
  ANDI r2, 0x1FFF
  ADDI r2, 0x8000
  RND r3
  ST [r2], r3
  DEC r4
  JNZ .m
  RET
