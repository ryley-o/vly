# VLY-1 hardware notes

VLY-1 is designed so a real device is easy: a tiny integer CPU, tile-based video that needs no framebuffer, and
fixed limits. The portable device layer and an RP2040 port are written and tested on a computer; no board has been
built yet. The next section says exactly what is proven and what is not.

## What the spec asks of a device

| Item | Requirement |
|---|---|
| CPU | executes the VLY-1 ISA at about 7.2 million cycles per second (120,000 cycles x 60 Hz); any 32-bit MCU at 100 MHz or more has large headroom |
| RAM | the 64 KB address space is backed by about 33 KB of writable memory (work RAM, video memory, 1 KB save), plus the emulator's own state |
| ROM | up to 1 MB cartridge image, read-only, accessed through a 16 KB fixed area and an 8 KB bank window |
| Display | 160 x 144, 16-bit or 24-bit color; integer scaling 2x gives 320 x 288, and a 240 x 240 or 320 x 240 panel also works with a border |
| Input | 8 buttons: D-pad, A, B, Start, Select |
| Audio | 4 channels; a PWM or I2S DAC at 22-44 kHz mono is enough (see SPEC section 8) |
| Storage | one 1 KB save per cartridge (battery-backed SRAM or flash) |

## Status, plainly

| Piece | State |
|---|---|
| The machine in C (`c/vly.c`), scanline renderer, audio synthesis | done; identical to the JavaScript reference on every conformance case |
| Device layer (`hardware/device.c`, `hal.h`) | done; **tested on a computer** with real cartridges through a stub HAL, frame by frame against the reference renderer, with audio sample counts and a save round trip |
| Firmware (`hardware/rp2040/`) | **builds for real** against Pico SDK 2.1.1 for the RP2040 and the RP2350 (Pico and Pico 2), with two display boards (1.54 inch SPI, 3.5 inch 8-bit parallel through PIO and DMA); about 17 KB of code, 140 KB of RAM; **never run on a board** |
| Schematic, PCB, enclosure | described below; **not drawn** |
| Performance on an RP2040 | **estimated**, not measured (see the budget below) |

The point of the split is that everything that is not a pin or a peripheral is already proven: porting to a new board
means writing about 200 lines of HAL, not touching the machine.

## What the spec asks of a device

| Item | Requirement |
|---|---|
| CPU | executes the VLY-1 ISA at about 7.2 million cycles per second (120,000 cycles x 60 Hz); typical games use 1-10% of that |
| RAM | the 64 KB address space is backed by about 33 KB of writable memory (work RAM, video memory, 1 KB save); the C core keeps a flat 64 KB array, so a device needs about 70 KB in total |
| ROM | up to 1 MB cartridge image, read-only, read in place (memory-mapped flash is ideal) |
| Display | 160 x 144, 16-bit or 24-bit colour; see the display options below |
| Input | 8 buttons: D-pad, A, B, Start, Select |
| Audio | 4 channels; a PWM or I2S DAC at 22-44 kHz mono is enough (SPEC section 8) |
| Storage | one 1 KB save per cartridge (battery-backed SRAM or flash) |

## The device layer

`hardware/hal.h` is the whole contract between a board and the machine:

```c
typedef struct vly_hal {
    void *user;
    void    (*wait_vsync)(void *user);                              // pace to 60 Hz
    uint8_t (*buttons)(void *user);                                 // 8 bits, 1 = held
    void    (*display_begin)(void *user);                           // then 144 lines, in order
    void    (*display_line)(void *user, int y, const uint16_t *px); //   160 RGB565 pixels
    void    (*display_end)(void *user);
    void    (*audio_push)(void *user, const int16_t *s, int n);     // mono, ~rate/60 samples per frame
    int     (*save_load)(void *user, uint8_t *buf);                 // 1 KB; returns 0 if none stored
    void    (*save_store)(void *user, const uint8_t *buf);          // called when the cartridge commits
} vly_hal_t;
```

`vly_device_init` loads the save, starts the cartridge and runs `init()`; `vly_device_frame` does one 60 Hz tick (read
buttons, run 120,000 cycles at most, make audio, render and stream 144 lines); `vly_device_run` loops forever.
Rendering is per scanline from tile memory, so **no framebuffer** is needed: the only buffer is one 160-pixel line.

```sh
make -C hardware test
# ok  template_pong.vlc  3000 frames, 1102500 samples, 1 saves
```

## Performance budget

Measured on a 2.1 GHz Xeon with the C core (`-O2`, no hashing): **about 3.5 ns per VLY cycle**, roughly 7 host
cycles. The templates use 0.8k (battle), 6.4k (platformer) and 10k (shooter) cycles per frame on average, against the
120k budget.

Estimate for the RP2040 at 250 MHz (Cortex-M0+, no cache, 32-bit registers doing 16-bit work): somewhere around 30
host cycles per VLY cycle. A typical game frame (10k cycles) would cost about 1.2 ms and a pathological frame that
burns the whole budget about 14 ms, plus 6 ms to stream 46 KB over SPI at 62.5 MHz. So typical games fit a 16.7 ms frame
with a lot of room; worst-case frames would not, and the device would simply skip a refresh. **Measure it on a board**
before trusting these numbers. The RP2350 (Cortex-M33, 520 KB RAM, hardware floating point and faster integer paths) is
the obvious upgrade if the RP2040 is tight.

## Display options

The picture is 160 x 144. Integer scaling looks best, so pick a panel that fits a whole multiple:

| Panel | Scaling | Notes |
|---|---|---|
| 1.54" 240 x 240 IPS (ST7789) | 1x, 40 px side borders and 48 px top and bottom | cheap, small and sharp (about 31 mm wide picture); the reference design |
| 1.69" 240 x 280 or 2.0" 240 x 320 IPS | 1x, centred | slightly larger panel, same picture size |
| 3.5" 480 x 320 (ILI9488, ST7796) | **2x** = 320 x 288, 80 px side borders | a big comfortable picture (about 63 mm wide); more SPI traffic (184 KB per frame) so it wants DMA or a parallel bus |
| 2.4"-2.8" 320 x 240 | 1x only | 2x would need 288 lines; 1.5x is uneven pixels, which is ugly for pixel art |

For 2x on the RP2040 firmware set `LCD_SCALE 2` (pixels and lines are repeated in `hal_display_line`).

## Reference handheld, rev A

An RP2040 handheld in the shape of the classic portrait handhelds, with the same button layout.

```
        +-----------------------+
        |   +---------------+   |     board outline about 80 x 140 mm, 22 mm thick with the cell
        |   |    240x240    |   |     screen centred, picture 160 x 144 at 1x
        |   |     IPS       |   |
        |   +---------------+   |
        |                       |
        |   [^]            (B)  |     D-pad left, A and B right (A lower right, like the classic layout)
        |  [<][>]        (A)    |
        |   [v]                 |
        |        (SEL) (START)  |
        |   ::::::::    speaker |     power slider on the top edge left of the cartridge (like the Game Boy), battery door on the back
        +-----------------------+
```

### Pinout (RP2040 GPIO numbers; `hardware/rp2040/config.h`)

| Function | GPIO | Notes |
|---|---|---|
| LCD SCK, MOSI | 18, 19 | SPI0, 62.5 MHz |
| LCD CS, DC, RST | 17, 20, 21 | |
| LCD backlight | 22 | PWM |
| UP, DOWN, LEFT, RIGHT | 2, 3, 4, 5 | active low, internal pull-ups |
| A, B, START, SELECT | 6, 7, 8, 9 | active low, internal pull-ups |
| Audio out | 10 | PWM at about 244 kHz carrier, updated at 22.05 kHz from a timer; 1 k + 100 nF RC into the PAM8302A |
| Battery sense (optional) | 26 on rev A, 27 on rev B | ADC through a divider from the cells |

### Power

Two AA cells (not included in the box) through a boost converter to 3.3 V. The product has **no USB port** (decided): it is
programmed at the factory through test pads, and a development unit is a Pico board with its own USB. Rough draw about
150-220 mA with the 3.5 inch display, so roughly 5-9 hours per set of alkaline cells: an estimate, not a measurement. See
hardware-plan.md.

### Cartridges on the device

The product uses physical cartridges (3 below), written at the factory, with the save kept on the cartridge, and there is no
SD slot and no USB (decided; see hardware-plan.md). The other two ways are for development boards. Three ways, from simplest:

1. **Compiled in**: `node hardware/tools/vlc2c.js game.vlc > cart.h` embeds one cartridge in the firmware image. The
   `cart_data` array is `static const`, so it stays in flash and the machine reads it in place.
2. **USB mass storage / UF2**: a menu firmware keeps cartridges in the spare flash and maps the selected one through XIP
   (the 1 MB limit fits a 16 MB flash chip with room for 15 games).
3. **Physical cartridges**: a small PCB with an SPI flash and a 6-pin connector (a spec-compatible "cartridge shell");
   the console reads it in place over QSPI. This is the one that makes it feel like hardware and the one nobody has
   designed yet.

On chain, cartridges are chunk contracts (CONTRACTS.md); a phone app or a desktop tool fetches the chunks, verifies the
ROM hash and copies the `.vlc` to the device. Saves come back as the raw 1,056-byte call.

### Build the firmware (builds; untested on hardware)

```sh
export PICO_SDK_PATH=/path/to/pico-sdk        # 2.1.1 or newer; needs gcc-arm-none-eabi and cmake
cd hardware/rp2040
cmake -B build -DPICO_BOARD=pico2 -DVLY_DISPLAY=parallel -DVLY_CART=/path/to/game.vlc   # or pico / spi
cmake --build build
# hold BOOTSEL, plug in USB, copy build/vly1.uf2 to the drive that appears
```

Bill of materials: [`hardware/bom.csv`](../hardware/bom.csv). The current plan (RP2350, a 3.5 inch display at 2x, physical
cartridges, costs and prototype steps) is in hardware-plan.md; where the two differ, the plan is newer.

### Rev B pinout (3.5 inch parallel display; `-DVLY_DISPLAY=parallel`)

| Function | GPIO |
|---|---|
| LCD D0 to D7 | 10 to 17 (consecutive: PIO needs them in a row) |
| LCD WR, DC, CS, RST, backlight | 18, 19, 20, 21, 22 |
| Buttons | 2 to 9, as above |
| Audio out (PWM) | 26 |

The display runs at the panel's minimum write cycle (66 ns, `LCD_WRITE_NS`): 320 x 288 x 2 bytes x 60 Hz needs a cycle
of 90 ns or less. If a module cannot keep up, raise `LCD_WRITE_NS` and the picture drops to 30 Hz or the borders shrink.

## Reference implementation

`c/` holds a portable C99 implementation (`vly.c`, no dynamic allocation). It passes every case in `conformance/`
identically to the JavaScript reference (`node scripts/difftest.js`). It includes a scanline renderer
(`vly_render_line_rgb565`, `vly_render_line_rgb32`) and the reference audio synthesis (`vly_audio_render`); the SDL2
desktop player and the WebAssembly build use the same code.

## Why the design suits hardware

- No framebuffer: video memory is tile RAM, two maps and a sprite table, about 12.5 KB in total.
- No floating point and no 32-bit addressing.
- Fixed-size everything: save, tile RAM, OAM, palettes.
- Rendering and audio are specified at the register level, so ports differ only in how they output pixels and sound.

## What is left

- Run the RP2040 firmware on a board; measure real frame times; add DMA so the SPI transfer overlaps emulation.
- A cartridge menu firmware (browse, load over USB, show the save slot).
- Draw the schematic and PCB (KiCad), and the enclosure (the dimensions above are placeholders).
- A physical cartridge connector and shell.
- Metadata sidecar (title, icon) for device menus; battery gauge; sleep when idle.
