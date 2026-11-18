/* VLY-1 handheld, reference design rev A: pin assignments and display geometry for the RP2040 port.
 * Change these to match your board. The defaults follow the table in docs/hardware.md. */
#ifndef VLY_RP2040_CONFIG_H
#define VLY_RP2040_CONFIG_H

/* ---- display ----
 * Two boards are supported, chosen at build time (cmake -DVLY_DISPLAY=spi|parallel):
 *   spi       rev A: a 1.54" 240x240 ST7789 on SPI0, 1x scale.
 *   parallel  rev B: a 3.5" 480x320 ILI9488 module on an 8-bit parallel bus driven by PIO, 2x scale (a 320x288 picture).
 * The parallel path is the recommended one (docs/hardware-plan.md). Neither has been run on a board. */
#ifdef VLY_DISPLAY_PARALLEL
#define LCD_PARALLEL   1
#define LCD_PIN_D0     10    /* D0..D7 on GPIO 10..17 */
#define LCD_PIN_WR     18
#define LCD_PIN_DC     19
#define LCD_PIN_CS     20
#define LCD_PIN_RST    21
#define LCD_PIN_BL     22
#define LCD_WIDTH      480
#define LCD_HEIGHT     320
#define LCD_SCALE      2
#define LCD_WRITE_NS   66    /* the panel's minimum write cycle; 60 fps of 320x288 needs 90 or less */
#ifdef VLY_LCD_HX8357D
#define LCD_MADCTL     0xA0  /* HX8357D: landscape; flip bits 0x40 / 0x80 if the picture is mirrored on your module */
#else
#define LCD_MADCTL     0x28  /* ILI9488: landscape, BGR; flip bits 0x40 / 0x80 if the picture is mirrored on your module */
#endif
#define LCD_INVERT     0
#define LCD_RAM_X      0
#define LCD_RAM_Y      0
#define AUDIO_PIN      26
#define BATT_ADC_PIN   27    /* the two AA cells through a 1:2 divider; reading it is not wired into the firmware yet */
#else
#define LCD_PARALLEL   0
#define LCD_SPI        spi0
#define LCD_BAUD       62500000u
#define LCD_PIN_SCK    18
#define LCD_PIN_MOSI   19
#define LCD_PIN_CS     17
#define LCD_PIN_DC     20
#define LCD_PIN_RST    21
#define LCD_PIN_BL     22
/* Panel size and where the 160x144 picture sits. 240x240 (1.54" IPS): 1x scale, 40 px side borders, 48 px top and
 * bottom. */
#define LCD_WIDTH      240
#define LCD_HEIGHT     240
#define LCD_SCALE      1
#define LCD_RAM_X      0     /* controller RAM offset of the visible area (some 240x240 modules need 0, 80) */
#define LCD_RAM_Y      0
#define LCD_INVERT     1     /* IPS panels usually need colour inversion on */
#define AUDIO_PIN      10
#endif
#define LCD_X_OFFSET   ((LCD_WIDTH - 160 * LCD_SCALE) / 2)
#define LCD_Y_OFFSET   ((LCD_HEIGHT - 144 * LCD_SCALE) / 2)

/* ---- buttons: active low with internal pull-ups ---- */
#define PIN_UP      2
#define PIN_DOWN    3
#define PIN_LEFT    4
#define PIN_RIGHT   5
#define PIN_A       6
#define PIN_B       7
#define PIN_START   8
#define PIN_SELECT  9

/* ---- audio: PWM on one pin into an RC filter and a small amplifier ---- */
#define AUDIO_RATE  22050u

/* ---- save data: the last flash sector (4 KB) holds the 1 KB save ---- */
#define SAVE_SECTOR_OFFSET (PICO_FLASH_SIZE_BYTES - FLASH_SECTOR_SIZE)

#endif
