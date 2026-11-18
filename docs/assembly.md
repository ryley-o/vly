# VLY-1 assembly language

The assembler turns `.asm` text into a cartridge (`vly build prog.asm`). The compiler also produces assembly; see it
with `vly build --asm`. The instruction set itself is in `vly isa` and SPEC.md section 3.

## Syntax

```
; comment (also //)
label:                  ; labels end with a colon; any name may be used before it is defined
    LDI r0, 0x1234      ; mnemonics and registers are case-insensitive
    LD  r1, [r2]        ; memory operands use brackets
    LDX r1, [r2+4]      ; indexed: [reg + expression] or [reg - expression]
    STX [r2+4], r1      ; store forms put the memory operand first
    JNZ label           ; jumps take an absolute address (label or expression)
NAME = 5 * 3            ; constant (also .equ NAME, expr)
```

Registers: `r0`-`r15`, with `sp` = `r15` and `fp` = `r14`. Numbers: `10`, `0x1F`, `$1F`, `0b101`, `'A'`. Expressions
support `+ - * / % << >> & | ^ ~ ( )`, `$` (the current address), `lo(x)`, `hi(x)`, and `bank(label)` (the ROM bank a
label lives in). Operand forms follow the instruction table: `ADD rd, rs`, `LDI rd, imm`, `SHLI rd, n`, `LD rd, [rs]`,
`ST [rd], rs`, `LDX rd, [rs+imm]`, `STX [rd+imm], rs`, `JMP imm`, `CALL imm`, `PUSH rs`, `POP rd`, `JMPR rs`. The
hardware ops `MCPY`, `MSET` take no operands (arguments in `r0`-`r2`).

Pseudo-instructions: `INC rd`, `DEC rd`, `CLR rd`, `SUBI rd, imm`. Jump aliases: `JEQ`=`JZ`, `JNE`=`JNZ`, `JB`=`JC`,
`JAE`=`JNC`.

## Directives

| Directive | Meaning |
|---|---|
| `.header init, frame` | emit the 16-byte cartridge header; must be first. Arguments are the init and frame routines |
| `.org N` | move to image offset N (zero-filling); may not move backwards |
| `.bank N` | move to the start of ROM bank N (3-127), the window address `0x4000`; banks must be used in increasing order |
| `.db a, b, "text"` | bytes and strings |
| `.dw a, b` | little-endian words |
| `.ascii "x"`, `.asciz "x"` | string, string plus a zero byte |
| `.ds count[, fill]` | reserve bytes |
| `.align N[, fill]` | pad to a multiple of N |
| `.equ NAME, expr` | constant |
| `.include "file"` | include text |
| `.incbin "file"[, offset, length]` | include binary data |

## Addresses and banks

Image offsets below 24,576 appear at the same CPU address (the fixed area plus bank 2 in the window). Above that,
bank `n` shows its 8 KB at `0x4000`; `.bank n` starts a bank and labels in it get window addresses.
`bank(label)` gives the value to write to `ROMBANK` (`0xB322`) before reading the label.
An instruction may not straddle a bank boundary; large data blobs that cross one produce a warning.

## Example

```
.header init, frame
init:
  LDI r0, 0xB300        ; LCDC
  LDI r1, 1             ; background on
  ST [r0], r1
  RET
frame:
  LDI r0, 0xB302        ; SCX
  LDB r1, [r0]
  INC r1
  STB [r0], r1          ; scroll right one pixel per frame
  RET
```

`RET` at the top level (when `sp` is 0) ends the routine; `HALT` ends it from anywhere.

## Errors

Errors carry `file:line` and a hint, and the assembler reports every error it finds, not just the first. Typical ones:
unknown instruction, wrong operand count, a value that does not fit in 16 bits, `[reg+offset]` used with a
non-indexed instruction (use the `X` form), undefined symbol, duplicate label.
