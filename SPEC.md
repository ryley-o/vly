# VLY-1 Console Specification

**Status:** Draft 0.5 (working title: "VLY-1")
**Purpose:** A tiny, fixed, fully deterministic handheld-style game console whose cartridges are small
programs stored on-chain and executed off-chain by any conforming emulator.

This document is the hardware. A cartridge is just bytes. A save is just 1 KB. Everything else is an
emulator.

---

## 0. Design goals

1. **Constrained on purpose.** Every limit is a fixed constant of the platform, not a cartridge choice.
2. **Deterministic.** Same cartridge + same save + same inputs = bit-identical results on every
   implementation. Integer math only. No wall-clock, no host randomness.
3. **Traditional handheld hardware.** The video system is tile-based like a Game Boy / Game Boy Color:
   a scrolling background layer, a window layer, hardware sprites, and small palettes. There is no
   framebuffer and no free-form pixel drawing. Everything on screen is made of tiles.
4. **Small and easy to implement.** A conforming emulator should be a few hundred lines in any language.
5. **On-chain native.** A cartridge is a list of immutable data contracts (up to 1 MB, banked like classic
   handheld cartridges). A save is one fixed blob.
6. **Runs anywhere.** Browser, phone, desktop, and eventually a cheap microcontroller-class device.
7. **A cartridge is the whole artifact.** There is no external seed or per-token parameter. Variation between
   cartridges is made at deploy time, by the cartridge's creator, in the bytes themselves.

### Spec at a glance

| Item | Value |
|---|---|
| Word size | 16 bits, little-endian |
| Address space | 64 KB, flat, byte-addressed |
| Registers | 16 x 16-bit (R15 = stack pointer by convention) |
| Cartridge ROM | up to 1 MB, banked: 16 KB fixed area + 8 KB switchable window (see 2.1) |
| Save data | exactly 1,024 bytes |
| Work RAM | 19,456 bytes |
| Display | 160 x 144 |
| Tiles | 8 x 8, 2 bits per pixel; tile RAM holds 512 tiles |
| Palettes | 8 background + 8 sprite palettes, 4 colors each, RGB444 |
| Layers | background (32 x 32 cells, scrolling), window (32 x 32 cells), 64 sprites |
| Sprite sizes | 8x8, 8x16, 16x16, 32x32 |
| Built-in font | 95 tile glyphs (ASCII 0x20-0x7E), read-only |
| Frame rate | 60 ticks per second (logical) |
| Compute budget | 120,000 cycles per frame **[TUNE]** |
| Input | 8 buttons |
| Audio | 4 channels (2 pulse, 1 triangle, 1 noise), output-only |
| Math | integer and 8.8 fixed point; no floating point |

Numbers marked **[TUNE]** are expected to change after the first emulator and real cartridges exist.

---

## 1. Conventions

- All multi-byte values are **little-endian**.
- All arithmetic is on **unsigned 16-bit values with wraparound**, unless an instruction says "signed".
- `u8`, `u16`, `u32` mean unsigned integers of that width. `i16` means two's complement signed.
- "MUST", "MUST NOT" and "MAY" have their usual normative meanings.
- Addresses are written in hex, like `0x6000`.
- Screen coordinates start at `(0, 0)` in the top-left corner. X increases right, Y increases down.

---

## 2. Memory map

All 64 KB are addressable by load and store instructions.

| Range | Size | Name | Access |
|---|---|---|---|
| `0x0000`-`0x3FFF` | 16,384 B | ROM, fixed area | read-only |
| `0x4000`-`0x5FFF` | 8,192 B | ROM, bank window (switchable) | read-only |
| `0x6000`-`0x63FF` | 1,024 B | SAVE | read/write |
| `0x6400`-`0x69EF` | 1,520 B | FONT (95 tiles) | read-only |
| `0x69F0`-`0x7FFF` | 5,648 B | reserved | reads 0, writes ignored |
| `0x8000`-`0x9FFF` | 8,192 B | TILE RAM (512 tiles) | read/write |
| `0xA000`-`0xA7FF` | 2,048 B | BG MAP (32 x 32 cells) | read/write |
| `0xA800`-`0xAFFF` | 2,048 B | WINDOW MAP (32 x 32 cells) | read/write |
| `0xB000`-`0xB1FF` | 512 B | OAM (64 sprites) | read/write |
| `0xB200`-`0xB23F` | 64 B | BG PALETTES (8 x 4 colors) | read/write |
| `0xB240`-`0xB27F` | 64 B | SPRITE PALETTES (8 x 4 colors) | read/write |
| `0xB280`-`0xB2FF` | 128 B | reserved | reads 0, writes ignored |
| `0xB300`-`0xB3FF` | 256 B | I/O registers (see 2.4) | mixed |
| `0xB400`-`0xFFFF` | 19,456 B | WORK RAM | read/write |

Video memory (tile RAM, maps, OAM, palettes) is ordinary memory. It can be read and written at any time, with
no restrictions. The screen is drawn from it once per frame (see 3.4 and 4).

Memory map sum check: ROM 24,576 + save 1,024 + font 1,520 + reserved 5,648 = 32,768 (`0x8000`).

### 2.1 ROM and cartridge size

- The cartridge image is a flat array of up to **1,048,576 bytes** (1 MB = 128 banks of 8 KB). The cap is a
  fixed constant of the platform, like the limits of classic handheld mapper chips.
- The CPU sees the image through two ROM areas:
  - the **fixed area** (`0x0000`-`0x3FFF`) always shows image bytes 0-16,383;
  - the **bank window** (`0x4000`-`0x5FFF`) shows 8 KB of the image chosen by the `ROMBANK` register (2.4):
    window address `0x4000 + k` reads image byte `bank*8192 + k`.
- `ROMBANK` uses its low 7 bits (0-127). It powers on as **2**, so a small image of up to 24,576 bytes
  appears as flat ROM at `0x0000`-`0x5FFF` and needs no banking code.
- Bytes past the end of the image read as `0x00`, including whole banks past the end.
- **Fetch hazard:** if code executing in the bank window writes `ROMBANK`, the next instruction is fetched from the
  same address in the *new* bank. Switch banks from code in the fixed area.
- A write to either ROM area or to FONT is ignored and sets fault bit `RO_WRITE` (see 2.4).
- How the image is stored on-chain is outside the machine (see section 10 and `CONTRACTS.md`).

### 2.2 Cartridge header (first 16 bytes)

| Offset | Size | Field | Notes |
|---|---|---|---|
| 0 | 2 | magic | ASCII `VC` (`0x56 0x43`) |
| 2 | 1 | spec_version | `1` for this spec |
| 3 | 1 | flags | MUST be `0` in v1 |
| 4 | 2 | init_vector | address of the init routine |
| 6 | 2 | frame_vector | address of the per-frame routine |
| 8 | 8 | reserved | MUST be zero |

An emulator MUST refuse to run a cartridge with a wrong magic, an unsupported `spec_version`, or non-zero
reserved/flag bytes. Code and data MAY begin at offset 16.

Cartridge metadata (title, artist, description) is NOT part of the cartridge image. It lives in the token
contract's metadata, not on the machine.

### 2.3 Tiles, maps, sprites and palettes (data formats)

**Tile.** 8 x 8 pixels, **2 bits per pixel**, 16 bytes. Each row is 2 bytes; each byte holds 4 pixels with the
leftmost pixel in the **most significant** bits. For pixel `x` (0-7) in row `r` (0-7) of a tile:
```
byte  = tile_base + 2*r + (x >> 2)
shift = 6 - 2 * (x & 3)
color_index = (memory[byte] >> shift) & 3
```
Tile `n` (0-511) is at `0x8000 + 16*n`.

**Background / window map cell.** A `u16` at `map_base + 2*(row*32 + col)`:

| Bits | Field |
|---|---|
| 0-8 | tile index (0-511) |
| 9 | priority: if set, this cell's non-zero pixels draw over sprites |
| 10 | flip X |
| 11 | flip Y |
| 12-14 | palette (0-7, from the background palettes) |
| 15 | reserved (stored, but ignored by the hardware) |

**Palette.** Each palette has 4 colors of 2 bytes each. Palette `p` color `i` is the `u16` at
`palette_base + 8*p + 2*i`, in `0x0RGB` form: bits 8-11 red, 4-7 green, 0-3 blue; bits 12-15 are stored
but ignored by the display. A display expands each 4-bit channel `c` to 8 bits as `c * 17`.
Background palettes start at `0xB200`, sprite palettes at `0xB240`.
In sprite palettes, **color index 0 is transparent** (its stored color is unused). In background and window
palettes, all four indices are opaque.

**Power-on palettes:** every palette (background and sprite) is the grayscale ramp
`[0x0FFF, 0x0AAA, 0x0555, 0x0000]` (index 0 is white, 3 is black).

**Sprite (OAM entry).** 8 bytes at `0xB000 + 8*i` (i = 0-63):

| Offset | Size | Field |
|---|---|---|
| +0 | 2 | x (`i16`): screen x of the sprite's left edge |
| +2 | 2 | y (`i16`): screen y of the sprite's top edge |
| +4 | 2 | tile (bits 0-8: first tile index; bits 9-15 are ignored) |
| +6 | 2 | attributes (below) |

Attributes:

| Bits | Field |
|---|---|
| 0-2 | palette (0-7, from the sprite palettes) |
| 3 | behind background: if set, the sprite is hidden wherever the background pixel is non-zero |
| 4 | flip X (mirrors the whole sprite) |
| 5 | flip Y (mirrors the whole sprite) |
| 6-7 | size: 0 = 8x8 (1x1 tiles), 1 = 8x16 (1 wide x 2 tall), 2 = 16x16 (2x2), 3 = 32x32 (4x4) |
| 8-15 | reserved (stored, but ignored) |

A multi-tile sprite uses tiles in row-major order starting at `tile`:
tile at column `c`, row `r` is `(tile + r*tiles_wide + c) & 0x1FF`.
There is no enable bit: move a sprite off-screen to hide it. There is no limit on sprites per scanline.

### 2.4 I/O registers

| Address | Size | Name | Access | Description |
|---|---|---|---|---|
| `0xB300` | 2 B | LCDC | read/write | Display control (below) |
| `0xB302` | 1 B | SCX | read/write | Background scroll X (0-255) |
| `0xB303` | 1 B | SCY | read/write | Background scroll Y (0-255) |
| `0xB304` | 1 B | WX | read/write | Window left edge on screen (0-255) |
| `0xB305` | 1 B | WY | read/write | Window top edge on screen (0-255) |
| `0xB310` | 4 B | FRAME | read-only | `u32` frame counter (0 during init and the first frame) |
| `0xB314` | 2 B | INPUT | read-only | Buttons held this frame (see 6) |
| `0xB316` | 2 B | PRESSED | read-only | Buttons that went from up to down this frame |
| `0xB318` | 2 B | STATUS | read-only | Fault and state bits (below) |
| `0xB320` | 2 B | SAVECTL | write-only | Write `1` to request a save commit (see 7) |
| `0xB322` | 1 B | ROMBANK | read/write | ROM bank shown in the window (low 7 bits used; see 2.1) |
| `0xB340`-`0xB35F` | 32 B | AUDIO | read/write | Audio registers (see 8) |
| rest | | reserved | | read 0, writes ignored |

**LCDC bits:**

| Bit | Name | Meaning |
|---|---|---|
| 0 | BG_ON | Background layer enabled |
| 1 | WIN_ON | Window layer enabled |
| 2 | OBJ_ON | Sprites enabled |
| 3-15 | | reserved (stored, but ignored) |

**Power-on:** `LCDC = 0x0001` (background on), `SCX = SCY = WX = WY = 0`, `ROMBANK = 2`. Tile RAM, both maps and OAM are zero.
With tile 0 all zeros, the power-on screen is blank white.

**STATUS bits** (cleared at the start of every frame, except `SAVE_LOADED`):

| Bit | Name | Meaning |
|---|---|---|
| 0 | DIV0 | A division or modulo by zero occurred this frame |
| 1 | RO_WRITE | A write to a read-only region (ROM or FONT) was attempted this frame |
| 2 | ILLEGAL | An illegal opcode was executed this frame |
| 3 | OVERRUN | The previous routine (init or a frame) hit its cycle budget and was cut off |
| 8 | SAVE_LOADED | The save region was loaded from an existing save (constant for the session) |

Writes to read-only or reserved I/O bytes are ignored without a fault. Faults never halt the machine by
themselves.

**I/O details.**
- `SAVECTL` reads as 0. A store of the byte value `1` to address `0xB320` requests a save (so both `STB` of 1 and a
  16-bit `ST` of 1 do); any other value is ignored.
- `ROMBANK` stores only its low 7 bits (`value & 0x7F`).
- `FRAME` is a little-endian `u32` at `0xB310` (low word first).
- `INPUT` and `PRESSED` hold only bits 0-7; bits 8-15 are always 0.
- Reserved bits in `LCDC`, map cells, OAM entries and palette entries are stored as written but have no effect.

### 2.5 Font

The font is a fixed hardware table of **95 ready-made tiles** for ASCII `0x20`-`0x7E`, readable at `0x6400`.

- Glyph `c` is a normal tile (16 bytes, same format as 2.3) at `0x6400 + (c - 0x20) * 16`.
- Font tiles use only color indices **0** (background) and **3** (ink).
- To use the font, a cartridge copies the glyph tiles it wants into tile RAM (see `MCPY`) and fills a map with the
  corresponding tile indices. The screen fits 20 columns x 18 rows of 8 x 8 text.
- The glyph bitmaps are defined in Appendix A.

---

## 3. CPU

### 3.1 Registers

- 16 general-purpose 16-bit registers `R0`-`R15`.
- `R15` is the **stack pointer (SP)** by convention. `PUSH`, `POP`, `CALL` and `RET` use it implicitly.
- `PC`: 16-bit program counter.
- Flags: `Z` (zero), `N` (negative, bit 15), `C` (carry/borrow), `V` (signed overflow).

**Power-on state:** all registers `0`, flags clear, `PC` undefined until a vector is called.

### 3.2 Instruction encoding

Every instruction is **2 bytes**, optionally followed by one 2-byte immediate.

```
byte 0:  op        (8 bits)
byte 1:  rd:rs     (high nibble = rd, low nibble = rs)
[optional] bytes 2-3:  imm16, little-endian
```

Instructions that take an `imm16` are marked "+imm" below. Unused `rd`/`rs` fields MUST be zero and are
ignored. Shift-by-immediate (`SHLI`/`SHRI`/`SARI`) takes its count from the `rs` field (0-15) and has no
extra word.

### 3.3 Instruction set

Notation: `rd`/`rs` = registers, `imm` = 16-bit immediate, `[x]` = memory at address x.
Memory addresses wrap modulo 65,536. A 16-bit access at `0xFFFF` reads the low byte from `0xFFFF` and the
high byte from `0x0000`. Unaligned accesses are allowed.

**System**

| Op | Mnemonic | Effect | Cycles |
|---|---|---|---|
| `00` | NOP | | 1 |
| `01` | HALT | End the current routine (like a top-level RET) | 1 |

**Data movement** (do not change flags)

| Op | Mnemonic | Effect | Cycles |
|---|---|---|---|
| `02` | MOV rd, rs | rd = rs | 1 |
| `03` | LDI rd, imm | rd = imm (+imm) | 2 |
| `04` | LD rd, [rs] | rd = 16-bit load | 3 |
| `05` | LDB rd, [rs] | rd = 8-bit load, zero-extended | 3 |
| `06` | ST [rd], rs | 16-bit store | 3 |
| `07` | STB [rd], rs | 8-bit store of low byte | 3 |
| `08` | LDX rd, [rs+imm] | 16-bit load (+imm) | 4 |
| `09` | LDBX rd, [rs+imm] | 8-bit load (+imm) | 4 |
| `0A` | STX [rd+imm], rs | 16-bit store (+imm) | 4 |
| `0B` | STBX [rd+imm], rs | 8-bit store (+imm) | 4 |
| `0C` | PUSH rs | SP -= 2; store rs at [SP] | 3 |
| `0D` | POP rd | rd = [SP]; SP += 2 | 3 |

**ALU** (`rd = rd op rs`; update flags as noted)

| Op | Mnemonic | Effect | Flags | Cycles |
|---|---|---|---|---|
| `10` | ADD | rd + rs | Z N C V (C = carry out) | 1 |
| `11` | SUB | rd - rs | Z N C V (C = borrow, i.e. rd < rs unsigned) | 1 |
| `12` | AND | rd & rs | Z N; C V cleared | 1 |
| `13` | OR | rd \| rs | Z N; C V cleared | 1 |
| `14` | XOR | rd ^ rs | Z N; C V cleared | 1 |
| `15` | SHL | rd << (rs & 15) | Z N; C = last bit shifted out (0 if count 0); V cleared | 1 |
| `16` | SHR | rd >> (rs & 15), logical | same as SHL | 1 |
| `17` | SAR | rd >> (rs & 15), arithmetic | same as SHL | 1 |
| `18` | MUL | low 16 bits of rd * rs | Z N; C V cleared | 3 |
| `19` | FMUL | `(i16(rd) * i16(rs)) >> 8` (signed 8.8 fixed-point multiply, arithmetic shift of the 32-bit product, truncated to 16 bits) | Z N; C V cleared | 3 |
| `1A` | DIV | unsigned rd / rs. If rs = 0: rd = `0xFFFF`, set DIV0 | Z N; C V cleared | 8 |
| `1B` | MOD | unsigned rd % rs. If rs = 0: rd unchanged, set DIV0 | Z N; C V cleared | 8 |
| `1C` | NEG | rd = 0 - rd | Z N; C V cleared | 1 |
| `1D` | NOT | rd = ~rd | Z N; C V cleared | 1 |

**Immediate ALU** (`rd = rd op imm`, same flag rules as the register forms)

| Op | Mnemonic | Cycles |
|---|---|---|
| `20` | ADDI rd, imm (+imm) | 2 |
| `21` | ANDI rd, imm (+imm) | 2 |
| `22` | ORI rd, imm (+imm) | 2 |
| `23` | XORI rd, imm (+imm) | 2 |
| `24` | SHLI rd, n (n in rs field, no extra word) | 1 |
| `25` | SHRI rd, n | 1 |
| `26` | SARI rd, n | 1 |
| `27` | MULI rd, imm (+imm) | 4 |

**Compare** (set flags, discard result)

| Op | Mnemonic | Effect | Cycles |
|---|---|---|---|
| `28` | CMP rd, rs | flags from rd - rs | 1 |
| `29` | CMPI rd, imm | flags from rd - imm (+imm) | 2 |
| `2A` | TST rd, rs | flags from rd & rs (C V cleared) | 1 |

**Control flow** (targets are absolute addresses)

| Op | Mnemonic | Condition | Cycles |
|---|---|---|---|
| `30` | JMP imm | always | 2 |
| `31` | JZ imm | Z | 2 |
| `32` | JNZ imm | !Z | 2 |
| `33` | JC imm | C (unsigned below) | 2 |
| `34` | JNC imm | !C (unsigned above or equal) | 2 |
| `35` | JLT imm | N != V (signed less) | 2 |
| `36` | JGE imm | N == V | 2 |
| `37` | JLE imm | Z or N != V | 2 |
| `38` | JGT imm | !Z and N == V | 2 |
| `39` | JA imm | !C and !Z (unsigned above) | 2 |
| `3A` | JBE imm | C or Z | 2 |
| `3C` | CALL imm | push return address, jump | 4 |
| `3D` | RET | pop address into PC; if `SP == 0x0000` the routine ends instead (nothing is popped) | 3 |
| `3E` | JMPR rs | PC = rs | 2 |
| `3F` | CALLR rs | push return address, PC = rs | 4 |

All jumps and calls carry a 2-byte immediate except `RET`, `JMPR` and `CALLR`.

**Block and random-number hardware.** Block operations take their arguments from fixed registers. They do not
change flags. Their `rd`/`rs` fields MUST be zero.

| Op | Mnemonic | Arguments | Effect | Cycles |
|---|---|---|---|---|
| `40` | MCPY | R0 = destination, R1 = source, R2 = length | Copy `R2` bytes (see below) | 8 + length/4 |
| `41` | MSET | R0 = destination, R1 = value, R2 = length | Set `R2` bytes to the low byte of `R1` | 8 + length/8 |
| `42` | RND | (rd) | rd = next 16-bit pseudorandom value (see 5) | 2 |
| `43` | SRND | (rd, rs) | Reseed the PRNG from rd:rs (see 5) | 2 |

`MCPY` behaves as if all source bytes were read before any byte is written, so overlapping ranges are safe.
Addresses wrap modulo 65,536 per byte. Writes that land in a read-only region are ignored and set `RO_WRITE`.
A length of 0 does nothing (cost 8). Costs use the full length, divisions round down.

Any other opcode is **illegal**: it costs 1 cycle, sets `ILLEGAL`, ends the current routine, and the next frame
proceeds normally.

**Corner cases (normative).**
- `PUSH R15` pushes the value `SP` had before the instruction. `POP R15` loads the value from the stack, adds 2 to
  `SP`, and then writes the loaded value into `R15` (so the loaded value wins).
- `MOD` by zero leaves `rd` unchanged and sets the flags from that unchanged value; `DIV` by zero sets `rd = 0xFFFF`
  and the flags from `0xFFFF`. Both set `DIV0`.
- `SUB`/`CMP` set `C` when `rd < rs` (unsigned) and `V` on signed overflow; `ADD` sets `C` on carry out and `V` on
  signed overflow.
- Instructions can be fetched from any region (ROM, save, RAM). Instruction and operand fetches use the same
  address wrapping and bank window as loads.
- There are no stack overflow checks: `SP` wraps modulo 65,536 like every address.
- A 16-bit store whose second byte lands in a read-only region faults for that byte only; the first byte is still
  written if it is in a writable region.
- `MCPY`/`MSET` perform their byte writes one at a time through the same write rules as `ST`/`STB` (so each byte
  written into a read-only region sets `RO_WRITE`; reserved addresses ignore the write).

### 3.4 Execution model

1. **Boot.** Load the cartridge image into ROM, load the save into SAVE (or zeros if there is none; then
   `SAVE_LOADED` = 0), zero all other RAM, initialize registers and the PRNG (see 5), and set the video
   registers and palettes to their power-on values (2.3, 2.4).
2. **Init.** Call the routine at `init_vector` with `FRAME = 0`, `INPUT = 0`, `PRESSED = 0`. It ends on
   `RET` at entry level, `HALT`, or budget exhaustion.
3. **Frame loop**, forever:
   - Latch input into `INPUT` and `PRESSED`.
   - Clear fault bits in `STATUS` (set `OVERRUN` if the previous frame was cut off).
   - Reset SP to `0x0000` and call the routine at `frame_vector`.
   - Run until the routine ends or **120,000 cycles** [TUNE] have been consumed. An instruction whose
     cost would exceed the remaining budget does not execute; the routine is cut off deterministically
     and the next frame starts fresh at `frame_vector` with registers and memory unchanged.
   - **Render the screen** from the machine state at that moment (see below).
   - Increment `FRAME`.

Registers and RAM persist across frames. Only SP and the call stack reset.

The init routine has a larger budget of **1,200,000 cycles** [TUNE] (ten frames' worth), because nothing is shown
until it ends and cartridges often build maps or unpack data there. If it is cut off, `OVERRUN` is reported in
the first frame's `STATUS`, exactly as for a cut-off frame routine.

**Rendering costs no cycles.** The screen is drawn by hardware after the frame routine ends, from the
final contents of tile RAM, both maps, OAM, palettes, and the registers `LCDC`, `SCX`, `SCY`, `WX`, `WY`. Nothing
is seen mid-frame, so there are no tearing or timing hazards, and no per-scanline effects.

---

## 4. Video rendering

The rendering function is fully defined so every emulator draws identical pixels. For every screen pixel
`(x, y)` with `0 <= x < 160`, `0 <= y < 144`:

**Step 1: background or window pixel.**

- If `LCDC.WIN_ON` and `x >= WX` and `y >= WY`, the pixel comes from the **window**:
  `wx = x - WX`, `wy = y - WY`, cell = window map at column `wx >> 3`, row `wy >> 3`, pixel within the tile
  `(wx & 7, wy & 7)`. The window is never scrolled.
- Otherwise, if `LCDC.BG_ON`, it comes from the **background**:
  `bx = (x + SCX) & 255`, `by = (y + SCY) & 255`, cell = background map at column `bx >> 3`, row `by >> 3`,
  pixel within the tile `(bx & 7, by & 7)`. The 256 x 256 map wraps in both directions.
- Otherwise the background pixel is color index 0 of background palette 0, with no priority flag.

For a cell, apply flip X (`px = 7 - px`) and flip Y (`py = 7 - py`) to the in-tile pixel position, read the
2-bit color index from tile `cell.tile` (2.3), and note the cell's palette and priority bit. Call the color index
`bg_c`.

**Step 2: sprite pixel.** If `LCDC.OBJ_ON`, scan sprites `i = 0` to `63` in order and take the **first** one
(lowest index) that covers `(x, y)` and has a non-zero color index there. For a sprite with top-left `(sx, sy)`,
`W` pixels wide and `H` pixels tall (from its size):
- it covers the pixel if `sx <= x < sx + W` and `sy <= y < sy + H`
- `ox = x - sx`, `oy = y - sy`; if flip X, `ox = W - 1 - ox`; if flip Y, `oy = H - 1 - oy`
- the tile is `(tile + (oy >> 3) * tiles_wide + (ox >> 3)) & 0x1FF`, the pixel within the tile is `(ox & 7, oy & 7)`
- a color index of 0 is transparent, and scanning continues with the next sprite

**Step 3: combine.**
- If no sprite pixel was found, the output is the background pixel.
- If a sprite pixel was found and `bg_c != 0` and (the sprite's *behind* bit is set **or** the background/window
  cell's *priority* bit is set), the output is the background pixel. The decision is made only for the
  first sprite found; lower-priority sprites underneath are not considered.
- Otherwise the output is the sprite pixel.

**Step 4: color.** Look up the palette entry (background palette from the cell, or sprite palette from the
sprite) and convert RGB444 to RGB888 as `c * 17` per channel.

The result is a 160 x 144 image. Hosts SHOULD scale by whole-number factors with nearest-neighbor filtering and
letterbox or pillarbox the rest. At 7x, the screen becomes 1120 x 1008, which fits a 1080p display and a
portrait phone.

---

## 5. Randomness

- There is no seed input. The PRNG starts in a fixed state and is the only built-in source of randomness.
- The PRNG is **xorshift32**:
  ```
  x ^= x << 13;  x ^= x >> 17;  x ^= x << 5;      (all u32, wraparound)
  RND returns the high 16 bits (x >> 16) after advancing.
  ```
- **Initial state:** `0x9E3779B9`.
- `SRND rd, rs` sets the state to `(rd << 16) | rs`. If that value is zero, the state becomes `0x9E3779B9`.
- Because the start state is fixed, a cartridge that wants a different game each time should call `SRND`
  with something that varies, such as the frame counter when the player first presses START, or bytes it
  has kept in the save. This stays deterministic for a given input sequence.
- There is no host entropy, time, or other hidden state.

---

## 6. Input

Eight buttons, exposed as a bitmask in `INPUT` (held) and `PRESSED` (newly pressed this frame):

| Bit | Button |
|---|---|
| 0 | UP |
| 1 | DOWN |
| 2 | LEFT |
| 3 | RIGHT |
| 4 | A |
| 5 | B |
| 6 | START |
| 7 | SELECT |

Bits 8-15 are reserved and read as 0. `PRESSED` = buttons down this frame that were up the previous frame.

Mapping buttons to keyboard, touch, or physical pads is up to the emulator or device. Opposite directions
held together (UP+DOWN, LEFT+RIGHT) are passed through as-is; programs decide what to do.

---

## 7. Save data

- There is exactly one save blob per token: **1,024 bytes**, a constant of the platform. A cartridge cannot
  ask for more or less and MAY ignore any part of it.
- The save is mapped at `0x6000`-`0x63FF`, read/write.
- At boot the emulator fills this region with the token's current save, or zeros if none exists.
  `STATUS.SAVE_LOADED` tells the program which happened.
- To request a save, the program writes `1` to `SAVECTL`. This does not change program state; the host may
  prompt the player and submit the transaction. The host captures the 1,024 bytes of the SAVE region as they
  are at the moment of the write.
- Writes to the save region only change the in-memory copy until committed.
- Saves are trust-based in v1: anyone can write any 1,024 bytes to a token they own.
- Cartridges own the layout of their save. Recommended: bytes 0-1 magic, byte 2 version, last 2 bytes a
  simple checksum, so a cartridge can reject saves written by something else.
- The chain side MUST reject any save that is not exactly 1,024 bytes.

---

## 8. Audio

Audio is **output-only**. A program cannot read audio state back except through the registers it wrote, and
audio never affects program execution. Differences between emulators' sound therefore cannot break
determinism of game state.

Four channels, mono mix, defined at the register level (as on classic handhelds) rather than as samples:

| Channel | Type |
|---|---|
| 0 | Pulse, selectable duty (12.5%, 25%, 50%, 75%) |
| 1 | Pulse, selectable duty |
| 2 | Triangle |
| 3 | Noise (LFSR) |

Registers at `0xB340` (4 bytes per channel, channels 0-3 at `0xB340`, `0xB344`, `0xB348`, `0xB34C`):

| Offset | Size | Field |
|---|---|---|
| +0 | 2 | frequency in Hz (`u16`; ignored for noise, which uses it as a rate divisor) |
| +2 | 1 | volume (0-15) |
| +3 | 1 | control: bit 7 enable, bits 0-1 duty (pulse channels only) |

`0xB350` = master volume (0-15). The rest of the audio block is reserved.

**Reference synthesis** (informative, implemented in `src/core/audio.js`). At a sample rate of 44,100 Hz, for each
channel with its enable bit (control bit 7) set and `vol = register & 15`:
- *Pulse:* `phase += hz / rate` (kept in [0, 1)); output is +1 while `phase < duty`, otherwise -1, with `duty` from
  control bits 0-1 as 0.125, 0.25, 0.5, 0.75.
- *Triangle:* `phase` advances the same way; output is `4 * abs(phase - 0.5) - 1`.
- *Noise:* a 15-bit LFSR starting at `0x4000`. `phase += hz / rate`; each time `phase` reaches 1 the LFSR shifts:
  `bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14)`. Output is +1 when `lfsr & 1`, otherwise -1.
  A frequency of 0 stops the LFSR.
- A channel's sample is `output * vol / 15`; a disabled channel is silent. Setting the enable bit from 0 to 1
  restarts the channel's phase (and the LFSR).
- The mix is `(sum of the four channels) / 4 * master / 15`, clamped to [-1, 1], and converted to a signed 16-bit
  integer.

Sample-exact audio is NOT a conformance requirement; only the registers and their documented behavior are.
A device may use any equivalent or better synthesis.

---

## 9. Conformance

An implementation conforms if, for any cartridge, save, and input sequence, the following are identical to
the reference implementation after every frame:

- all 16 registers and the flags
- the PRNG state, and whether the last routine was cut off by its cycle budget
- the full 64 KB CPU-visible memory image (reading every address 0x0000-0xFFFF as a load would, including the ROM
  areas as currently mapped, the font, and the I/O registers)
- the cycle count consumed by the frame
- the rendered 160 x 144 RGB888 image

The reference definitions of the two hashes are:
- **State hash** = SHA-256 of: the 16 registers as little-endian `u16` (32 bytes), one flags byte
  (`Z | N<<1 | C<<2 | V<<3`), the PRNG state as a little-endian `u32`, one byte (1 if the last routine was cut off by
  its budget, else 0), then the 65,536-byte memory image.
- **Frame hash** = SHA-256 of the 69,120 bytes of the rendered RGB888 image, row-major.

The project provides a test suite of cartridges and input scripts (`conformance/`), with expected state hashes and
frame hashes after selected frames. An emulator that passes the suite for every listed frame
may call itself VLY-1 conformant.

Audio is exempt from bit-exact conformance (see 8).

---

## 10. On-chain representation (informative)

This spec defines the machine, not the contracts, but the intended storage is:

- **Cartridge image:** the concatenation of an ordered list of immutable data contracts (each up to 24,575
  bytes, SSTORE2 style). The image is the whole artifact; there is no separate seed or parameter. A creator
  who wants cartridges that differ writes initcode that assembles the ROM bytes and deploys them, producing
  distinct data contracts. The machine sees only the final bytes.
- **Game and token:** a game is one contract that records the chunk list and acts as the token collection; each
  token is one printed copy of the cartridge. See `CONTRACTS.md`.
- **Save:** exactly 1,024 raw bytes per token, in the token contract's storage, writable only by the token owner,
  accepted via a raw-calldata function (no ABI encoding required).
- **Metadata** (title, artist, description, thumbnail) lives in the token metadata, not on the machine.

---

## 11. Hardware notes (informative)

The spec is intentionally friendly to small devices, in case it ever becomes physical:

- 16-bit integer ALU only, no floating point, no 32-bit memory addressing.
- 64 KB of address space, of which about 33 KB is writable (RAM, video memory, save) and 24 KB is cartridge ROM (a 16 KB fixed area plus an 8 KB bank window).
- There is no framebuffer. A device can render one scanline at a time from tile memory into a 160-pixel line
  buffer and stream it straight to the display, so the video system needs very little RAM beyond the video memory.
- 7.2 million cycles per second (120,000 x 60) is well within a cheap MCU's reach; since rendering is done by
  hardware and costs no cycles, the budget can probably go down.
- The 10:9 screen echoes classic handhelds; integer scaling is recommended on modern displays.

---

## 12. Open questions and deferred features

- **[TUNE]** Cycle budget, instruction costs, frame rate (30 vs 60), sprite count (64), tile count (512),
  based on real cartridges.
- **Raster effects:** per-scanline scroll or palette changes (for parallax, waves, status bars). Deferred; a
  deterministic per-scanline table could be added in a later spec version.
- **Sprite sizes:** 8x8, 8x16, 16x16, 32x32 are a first guess. Larger sizes may suit big characters.
- **Tile depth:** 2 bits per pixel with 8+8 palettes (Game Boy Color style) is chosen for ROM economy. A 4-bit
  mode is a possible later addition.
- **Audio:** per-channel envelope and sweep registers, if cartridges need them.
- **Wider input:** additional buttons (for example X, Y, L, R), analog input, touch.
- **ROM cap:** 1 MB, based on the original handheld mappers. Revisit once real games exist.
- **Name and branding:** "VLY-1" is a working title.
- **Metadata standard:** how cartridges describe controls and instructions to the player.

---

## 13. Reference implementation plan

The repository contains the reference implementation and tooling: `src/core` (JavaScript emulator), `src/asm`
(assembler), `src/lang` (the VLY language compiler), `cli` (the `vly` tool), `c` (an independent C99
implementation used to cross-check this spec and as a path to hardware), `conformance` (golden cartridges and
hashes), `templates` (starter projects), `contracts` (on-chain code) and `site` (documentation and playground).

---

## Appendix A: Font glyphs

The 95 glyph tiles for ASCII `0x20`-`0x7E` are 8 x 8 pixels with color indices 0 (background) and 3 (ink), in the
tile format of 2.3. Each glyph is a 5-pixel-wide design drawn in tile columns 1-5 and rows 0-7 (row 7 is used only
by descenders and the underscore); columns 0, 6 and 7 are always 0.

The authoritative bitmaps are in [`spec/font.json`](spec/font.json) (generated from `src/core/font.js`) and are
shown as a contact sheet in [`spec/font.md`](spec/font.md). A conforming device MUST present exactly these bytes
at `0x6400`-`0x69EF`; the conformance suite includes a hash of that region:

`SHA-256(font bytes) =` see `spec/font.json` field `sha256`.

## Changelog

- **0.5**: clarified edge cases found while implementing (RET at SP 0, PUSH/POP R15, reserved bits are stored but
  ignored, I/O details, hash definitions including PRNG and overrun state); init gets a 1,200,000-cycle budget;
  defined the reference audio synthesis; added the font bitmaps (Appendix A).
- **0.4**: ROM is now banked: a 16 KB fixed area plus an 8 KB bank window selected by `ROMBANK`, with a 1 MB
  image cap; added `CONTRACTS.md` describing the chunk, game and cartridge layers.
- **0.3**: switched to traditional tile-based video hardware: removed the framebuffer and all pixel-drawing
  instructions; added tile RAM (2 bits per pixel, 512 tiles), a scrolling background map, a window map, 64
  hardware sprites, and Game Boy Color-style palettes; the font is now ready-made tiles; added `MCPY` and
  `MSET`; renumbered `RND`/`SRND`; memory map rebuilt.
- **0.2**: removed the seed mechanism; fixed PRNG start state and `SRND`; 160 x 144 display.
- **0.1**: initial draft.
