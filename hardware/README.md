# VLY-1 hardware

| Path | What |
|---|---|
| `hal.h`, `device.h`, `device.c` | the hardware abstraction layer and the portable device loop (buttons, scanline streaming, audio, saves) |
| `host/test_host.c` | the host test: real cartridges through a stub HAL, compared frame by frame with the reference renderer |
| `rp2040/` | firmware for the Raspberry Pi RP2040: ST7789 display, 8 buttons, PWM audio, flash save data, CMake build |
| `rp2040/mock/` | stand-in Pico SDK headers used only to type-check the firmware on a normal computer |
| `tools/vlc2c.js` | turns a `.vlc` cartridge into a C header that stays in flash |
| `bom.csv`, `cost.mjs` | bill of materials with prototype and 1,000-unit prices and how sure each is; `node hardware/cost.mjs` totals it |
| `enclosure/` | printable prototype shell for a Bambu A1 mini (OpenSCAD): shells, cartridge, buttons |

```sh
make -C hardware test            # device loop vs the reference renderer, on this computer
make -C hardware check-rp2040    # type-check the RP2040 firmware against the stand-in SDK headers
```

The full story, with pinout, display options, power and enclosure, is in [docs/hardware.md](../docs/hardware.md).
Nothing here has been built or run on a real board.
