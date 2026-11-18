/* VLY-1 handheld firmware for the Raspberry Pi RP2040 (Pico SDK).
 *
 * STATUS: written against the Pico SDK API and type-checked against stand-in headers (make check-rp2040). It has not
 * been run on a board. The portable part (device.c) is tested on the host with real cartridges (make test).
 *
 * Layout: this file implements the HAL (hal.h) for an ST7789 display, eight buttons, PWM audio and flash save data;
 * device.c does the rest. The cartridge is compiled into flash as cart.h (see tools/vlc2c.js) and read in place.
 */
#include <string.h>

#include "pico/stdlib.h"
#include "hardware/clocks.h"
#include "hardware/flash.h"
#include "hardware/gpio.h"
#include "hardware/pwm.h"
#include "hardware/spi.h"
#include "hardware/sync.h"
#include "hardware/vreg.h"

#include "config.h"
#include "device.h"
#include "cart.h"
#include "../../c/boot_rom.h"

#if LCD_PARALLEL
/* ---------------- display, rev B: 3.5" ILI9488 on an 8-bit parallel bus, PIO + DMA ----------------
 * One PIO state machine writes bytes (data on D0..D7, WR as side-set). DMA feeds it from two line buffers, so the CPU
 * renders line n+1 while line n goes out. At 2x each source line becomes two panel lines, sent as one transfer. */
#include "hardware/dma.h"
#include "hardware/pio.h"
#include "lcd_parallel.pio.h"

#define LINE_BYTES (160 * LCD_SCALE * 2 * LCD_SCALE)   /* 160 px, repeated LCD_SCALE times across, in 2 bytes, LCD_SCALE lines */
static PIO lcd_pio = pio0;
static uint lcd_sm, lcd_dma;
static uint8_t line_buf[2][LINE_BYTES];
static int line_sel;

static void lcd_wait_idle(void) {
    lcd_pio->fdebug = 1u << (PIO_FDEBUG_TXSTALL_LSB + lcd_sm);
    while (!(lcd_pio->fdebug & (1u << (PIO_FDEBUG_TXSTALL_LSB + lcd_sm)))) tight_loop_contents();
}
static void lcd_dma_wait(void) { dma_channel_wait_for_finish_blocking(lcd_dma); }

static void lcd_cmd(uint8_t c) {
    lcd_wait_idle();
    gpio_put(LCD_PIN_DC, 0);
    pio_sm_put_blocking(lcd_pio, lcd_sm, c);
    lcd_wait_idle();
    gpio_put(LCD_PIN_DC, 1);
}
static void lcd_data(const uint8_t *d, size_t n) { for (size_t i = 0; i < n; i++) pio_sm_put_blocking(lcd_pio, lcd_sm, d[i]); lcd_wait_idle(); }
static void lcd_cmd_arg(uint8_t c, const uint8_t *args, size_t n) { lcd_cmd(c); if (n) lcd_data(args, n); }

static void lcd_window(int x0, int y0, int x1, int y1) {
    x0 += LCD_RAM_X; x1 += LCD_RAM_X; y0 += LCD_RAM_Y; y1 += LCD_RAM_Y;
    uint8_t cx[4] = { (uint8_t)(x0 >> 8), (uint8_t)x0, (uint8_t)(x1 >> 8), (uint8_t)x1 };
    uint8_t cy[4] = { (uint8_t)(y0 >> 8), (uint8_t)y0, (uint8_t)(y1 >> 8), (uint8_t)y1 };
    lcd_cmd_arg(0x2A, cx, 4);   /* CASET */
    lcd_cmd_arg(0x2B, cy, 4);   /* PASET */
    lcd_cmd(0x2C);              /* RAMWR: pixel data follows */
}

static void lcd_init(void) {
    const uint pins[] = { LCD_PIN_DC, LCD_PIN_CS, LCD_PIN_RST };
    for (unsigned i = 0; i < sizeof pins / sizeof pins[0]; i++) { gpio_init(pins[i]); gpio_set_dir(pins[i], GPIO_OUT); gpio_put(pins[i], 1); }
    /* two PIO cycles per byte: the state machine runs at 2 / LCD_WRITE_NS */
    float div = (float)clock_get_hz(clk_sys) * (LCD_WRITE_NS * 1e-9f) / 2.0f;
    if (div < 1.0f) div = 1.0f;
    lcd_sm = pio_claim_unused_sm(lcd_pio, true);
    uint off = pio_add_program(lcd_pio, &lcd_parallel_program);
    lcd_parallel_program_init(lcd_pio, lcd_sm, off, LCD_PIN_D0, LCD_PIN_WR, div);
    lcd_dma = dma_claim_unused_channel(true);
    dma_channel_config dc = dma_channel_get_default_config(lcd_dma);
    channel_config_set_transfer_data_size(&dc, DMA_SIZE_8);
    channel_config_set_read_increment(&dc, true);
    channel_config_set_write_increment(&dc, false);
    channel_config_set_dreq(&dc, pio_get_dreq(lcd_pio, lcd_sm, true));
    dma_channel_configure(lcd_dma, &dc, &lcd_pio->txf[lcd_sm], line_buf[0], 0, false);

    gpio_put(LCD_PIN_CS, 0);                              /* CS stays low while the console runs */
    gpio_put(LCD_PIN_RST, 0); sleep_ms(20); gpio_put(LCD_PIN_RST, 1); sleep_ms(120);
#ifdef VLY_LCD_HX8357D
    /* Adafruit's 3.5" 320x480 breakout (HX8357D). Start-up sequence from Adafruit's open-source HX8357 library:
     * {command, argument count, arguments}. */
    static const uint8_t init[] = {
        0xB9, 3, 0xFF, 0x83, 0x57,                        /* enable extension commands */
        0xB3, 4, 0x80, 0x00, 0x06, 0x06,                  /* RGB interface */
        0xB6, 1, 0x25,                                    /* VCOM */
        0xB0, 1, 0x68,                                    /* oscillator: 70 Hz normal mode */
        0xCC, 1, 0x05,                                    /* panel: BGR, gate direction */
        0xB1, 6, 0x00, 0x15, 0x1C, 0x1C, 0x83, 0xAA,      /* power control */
        0xC0, 6, 0x50, 0x50, 0x01, 0x3C, 0x1E, 0x08,      /* source option */
        0xB4, 7, 0x02, 0x40, 0x00, 0x2A, 0x2A, 0x0D, 0x78, /* display cycle */
        0xE0, 34, 0x02, 0x0A, 0x11, 0x1D, 0x23, 0x35, 0x41, 0x4B, 0x4B, 0x42, 0x3A, 0x27, 0x1B, 0x08, 0x09, 0x03,
                  0x02, 0x0A, 0x11, 0x1D, 0x23, 0x35, 0x41, 0x4B, 0x4B, 0x42, 0x3A, 0x27, 0x1B, 0x08, 0x09, 0x03, 0x00, 0x01,   /* gamma */
        0x3A, 1, 0x55,                                    /* 16 bits per pixel (RGB565) */
        0x36, 1, LCD_MADCTL,                              /* orientation and colour order */
    };
    for (size_t i = 0; i < sizeof init; i += 2 + init[i + 1]) lcd_cmd_arg(init[i], &init[i + 2], init[i + 1]);
    sleep_ms(300);
    lcd_cmd(LCD_INVERT ? 0x21 : 0x20);                    /* INVON / INVOFF */
    lcd_cmd(0x11); sleep_ms(150);                         /* SLPOUT */
    lcd_cmd(0x29); sleep_ms(50);                          /* DISPON */
#else
    /* The ILI9488 start-up sequence that the widely used TFT_eSPI library uses for these modules (gamma, power, VCOM,
     * interface and frame-rate settings), with 16-bit colour for the parallel bus. {command, argument count, arguments}. */
    static const uint8_t init[] = {
        0xE0, 15, 0x00, 0x03, 0x09, 0x08, 0x16, 0x0A, 0x3F, 0x78, 0x4C, 0x09, 0x0A, 0x08, 0x16, 0x1A, 0x0F,   /* positive gamma */
        0xE1, 15, 0x00, 0x16, 0x19, 0x03, 0x0F, 0x05, 0x32, 0x45, 0x46, 0x04, 0x0E, 0x0D, 0x35, 0x37, 0x0F,   /* negative gamma */
        0xC0, 2, 0x17, 0x15,                              /* power control 1 */
        0xC1, 1, 0x41,                                    /* power control 2 */
        0xC5, 3, 0x00, 0x12, 0x80,                        /* VCOM */
        0x36, 1, LCD_MADCTL,                              /* orientation and colour order */
        0x3A, 1, 0x55,                                    /* 16 bits per pixel (RGB565) */
        0xB0, 1, 0x00,                                    /* interface mode */
        0xB1, 1, 0xA0,                                    /* frame rate */
        0xB4, 1, 0x02,                                    /* display inversion control */
        0xB6, 3, 0x02, 0x02, 0x3B,                        /* display function control */
        0xB7, 1, 0xC6,                                    /* entry mode */
        0xF7, 4, 0xA9, 0x51, 0x2C, 0x82,                  /* adjust control 3 */
    };
    for (size_t i = 0; i < sizeof init; i += 2 + init[i + 1]) lcd_cmd_arg(init[i], &init[i + 2], init[i + 1]);
    lcd_cmd(LCD_INVERT ? 0x21 : 0x20);                    /* INVON / INVOFF */
    lcd_cmd(0x11); sleep_ms(120);                         /* SLPOUT */
    lcd_cmd(0x29); sleep_ms(25);                          /* DISPON */
#endif
    gpio_set_function(LCD_PIN_BL, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(LCD_PIN_BL);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(LCD_PIN_BL, 255);
    pwm_set_enabled(slice, true);
    /* black borders, once */
    static uint8_t zero[256];
    lcd_window(0, 0, LCD_WIDTH - 1, LCD_HEIGHT - 1);
    for (int i = 0; i < LCD_WIDTH * LCD_HEIGHT * 2 / (int)sizeof zero; i++) lcd_data(zero, sizeof zero);
}

static void hal_display_begin(void *user) {
    (void)user;
    lcd_dma_wait();
    lcd_window(LCD_X_OFFSET, LCD_Y_OFFSET, LCD_X_OFFSET + 160 * LCD_SCALE - 1, LCD_Y_OFFSET + 144 * LCD_SCALE - 1);
}

/* big-endian RGB565, each pixel repeated LCD_SCALE times, the whole row repeated LCD_SCALE times */
static void hal_display_line(void *user, int y, const uint16_t *px) {
    (void)user; (void)y;
    uint8_t *out = line_buf[line_sel];
    lcd_dma_wait();                                        /* the buffer we are about to overwrite may still be draining */
    int o = 0;
    for (int x = 0; x < 160; x++)
        for (int k = 0; k < LCD_SCALE; k++) { out[o++] = (uint8_t)(px[x] >> 8); out[o++] = (uint8_t)px[x]; }
    for (int k = 1; k < LCD_SCALE; k++) { memcpy(out + k * 160 * LCD_SCALE * 2, out, 160 * LCD_SCALE * 2); }
    dma_channel_set_read_addr(lcd_dma, out, false);
    dma_channel_set_trans_count(lcd_dma, LINE_BYTES, true);
    line_sel ^= 1;
}

static void hal_display_end(void *user) {
    (void)user;
    lcd_dma_wait();
    lcd_wait_idle();
}

#else
/* ---------------- display, rev A: ST7789 on SPI ---------------- */

static void lcd_cmd(uint8_t c) {
    gpio_put(LCD_PIN_DC, 0);
    gpio_put(LCD_PIN_CS, 0);
    spi_write_blocking(LCD_SPI, &c, 1);
    gpio_put(LCD_PIN_CS, 1);
}

static void lcd_data(const uint8_t *d, size_t n) {
    gpio_put(LCD_PIN_DC, 1);
    gpio_put(LCD_PIN_CS, 0);
    spi_write_blocking(LCD_SPI, d, n);
    gpio_put(LCD_PIN_CS, 1);
}

static void lcd_cmd_arg(uint8_t c, const uint8_t *args, size_t n) {
    lcd_cmd(c);
    if (n) lcd_data(args, n);
}

static void lcd_window(int x0, int y0, int x1, int y1) {
    x0 += LCD_RAM_X; x1 += LCD_RAM_X; y0 += LCD_RAM_Y; y1 += LCD_RAM_Y;
    uint8_t cx[4] = { (uint8_t)(x0 >> 8), (uint8_t)x0, (uint8_t)(x1 >> 8), (uint8_t)x1 };
    uint8_t cy[4] = { (uint8_t)(y0 >> 8), (uint8_t)y0, (uint8_t)(y1 >> 8), (uint8_t)y1 };
    lcd_cmd_arg(0x2A, cx, 4);   /* CASET */
    lcd_cmd_arg(0x2B, cy, 4);   /* RASET */
    lcd_cmd(0x2C);              /* RAMWR: pixel data follows */
}

static void lcd_init(void) {
    spi_init(LCD_SPI, LCD_BAUD);
    gpio_set_function(LCD_PIN_SCK, GPIO_FUNC_SPI);
    gpio_set_function(LCD_PIN_MOSI, GPIO_FUNC_SPI);
    const uint pins[] = { LCD_PIN_CS, LCD_PIN_DC, LCD_PIN_RST };
    for (unsigned i = 0; i < sizeof pins / sizeof pins[0]; i++) { gpio_init(pins[i]); gpio_set_dir(pins[i], GPIO_OUT); gpio_put(pins[i], 1); }
    gpio_put(LCD_PIN_RST, 0); sleep_ms(20); gpio_put(LCD_PIN_RST, 1); sleep_ms(120);
    lcd_cmd(0x01); sleep_ms(150);                         /* SWRESET */
    lcd_cmd(0x11); sleep_ms(120);                         /* SLPOUT */
    const uint8_t colmod = 0x55;                          /* 16 bits per pixel (RGB565) */
    lcd_cmd_arg(0x3A, &colmod, 1);
    const uint8_t madctl = 0x00;
    lcd_cmd_arg(0x36, &madctl, 1);
    if (LCD_INVERT) lcd_cmd(0x21);                        /* INVON */
    lcd_cmd(0x13);                                        /* NORON */
    lcd_cmd(0x29); sleep_ms(20);                          /* DISPON */
    /* backlight: PWM at full brightness */
    gpio_set_function(LCD_PIN_BL, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(LCD_PIN_BL);
    pwm_set_wrap(slice, 255);
    pwm_set_gpio_level(LCD_PIN_BL, 255);
    pwm_set_enabled(slice, true);
    /* clear the borders once, so only the picture is rewritten each frame */
    static uint8_t zero[512];
    lcd_window(0, 0, LCD_WIDTH - 1, LCD_HEIGHT - 1);
    gpio_put(LCD_PIN_DC, 1); gpio_put(LCD_PIN_CS, 0);
    for (int i = 0; i < LCD_WIDTH * LCD_HEIGHT * 2 / (int)sizeof zero + 1; i++) spi_write_blocking(LCD_SPI, zero, sizeof zero);
    gpio_put(LCD_PIN_CS, 1);
}

static void hal_display_begin(void *user) {
    (void)user;
    lcd_window(LCD_X_OFFSET, LCD_Y_OFFSET, LCD_X_OFFSET + 160 * LCD_SCALE - 1, LCD_Y_OFFSET + 144 * LCD_SCALE - 1);
    gpio_put(LCD_PIN_DC, 1);
    gpio_put(LCD_PIN_CS, 0);
}

/* The panel wants big-endian RGB565; the core hands over host-order pixels. LCD_SCALE 2 repeats pixels and lines. */
static void hal_display_line(void *user, int y, const uint16_t *px) {
    (void)user; (void)y;
    static uint8_t out[160 * LCD_SCALE * 2];
    int o = 0;
    for (int x = 0; x < 160; x++) {
        for (int k = 0; k < LCD_SCALE; k++) { out[o++] = (uint8_t)(px[x] >> 8); out[o++] = (uint8_t)px[x]; }
    }
    for (int k = 0; k < LCD_SCALE; k++) spi_write_blocking(LCD_SPI, out, (size_t)o);
}

static void hal_display_end(void *user) {
    (void)user;
    gpio_put(LCD_PIN_CS, 1);
}

#endif

/* ---------------- buttons ---------------- */

static const struct { uint pin; uint8_t bit; } button_pins[] = {
    { PIN_UP, VLY_BTN_UP }, { PIN_DOWN, VLY_BTN_DOWN }, { PIN_LEFT, VLY_BTN_LEFT }, { PIN_RIGHT, VLY_BTN_RIGHT },
    { PIN_A, VLY_BTN_A }, { PIN_B, VLY_BTN_B }, { PIN_START, VLY_BTN_START }, { PIN_SELECT, VLY_BTN_SELECT },
};

static void buttons_init(void) {
    for (unsigned i = 0; i < sizeof button_pins / sizeof button_pins[0]; i++) {
        gpio_init(button_pins[i].pin);
        gpio_set_dir(button_pins[i].pin, GPIO_IN);
        gpio_pull_up(button_pins[i].pin);
    }
}

static uint8_t hal_buttons(void *user) {
    (void)user;
    uint8_t v = 0;
    for (unsigned i = 0; i < sizeof button_pins / sizeof button_pins[0]; i++)
        if (!gpio_get(button_pins[i].pin)) v |= button_pins[i].bit;
    return v;
}

/* ---------------- audio: a ring buffer drained by a timer interrupt into the PWM duty ---------------- */

#define RING 2048u   /* a power of two, about 90 ms at 22 kHz */
static volatile int16_t ring[RING];
static volatile uint32_t ring_r, ring_w;

static bool audio_tick(struct repeating_timer *t) {
    (void)t;
    int32_t s = 0;
    if (ring_r != ring_w) { s = ring[ring_r & (RING - 1)]; ring_r++; }
    pwm_set_gpio_level(AUDIO_PIN, (uint16_t)((s >> 6) + 512));   /* 16-bit signed -> 10-bit unsigned around mid-scale */
    return true;
}

static void audio_init(void) {
    static struct repeating_timer timer;
    gpio_set_function(AUDIO_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(AUDIO_PIN);
    pwm_set_wrap(slice, 1023);                  /* 250 MHz / 1024 = 244 kHz carrier, far above the audio band */
    pwm_set_gpio_level(AUDIO_PIN, 512);
    pwm_set_enabled(slice, true);
    add_repeating_timer_us(-(int64_t)(1000000u / AUDIO_RATE), audio_tick, NULL, &timer);
}

static void hal_audio_push(void *user, const int16_t *samples, int n) {
    (void)user;
    for (int i = 0; i < n; i++) {
        if (ring_w - ring_r >= RING) break;     /* full: drop rather than block the frame */
        ring[ring_w & (RING - 1)] = samples[i];
        ring_w++;
    }
}

/* ---------------- save data in the last flash sector ---------------- */

static const uint8_t *save_flash(void) { return (const uint8_t *)(XIP_BASE + SAVE_SECTOR_OFFSET); }

/* The sector starts with "VLYS" and then holds the 1,024-byte save; an erased sector reads as 0xFF. */
static int hal_save_load(void *user, uint8_t *buf) {
    (void)user;
    const uint8_t *p = save_flash();
    if (memcmp(p, "VLYS", 4) != 0) return 0;
    memcpy(buf, p + 4, VLY_SAVE_SIZE);
    return 1;
}

static void hal_save_store(void *user, const uint8_t *buf) {
    (void)user;
    static uint8_t page[FLASH_PAGE_SIZE * 5];                       /* 4 + 1024 bytes, padded to whole pages */
    memset(page, 0xFF, sizeof page);
    memcpy(page, "VLYS", 4);
    memcpy(page + 4, buf, VLY_SAVE_SIZE);
    /* Flash writes stall the other core and the XIP cache, so keep interrupts off for the duration (a few ms). */
    uint32_t ints = save_and_disable_interrupts();
    flash_range_erase(SAVE_SECTOR_OFFSET, FLASH_SECTOR_SIZE);
    flash_range_program(SAVE_SECTOR_OFFSET, page, sizeof page);
    restore_interrupts(ints);
}

/* ---------------- pacing ---------------- */

static absolute_time_t next_frame;

static void hal_wait_vsync(void *user) {
    (void)user;
    sleep_until(next_frame);
    next_frame = delayed_by_us(next_frame, 16667);   /* 60 Hz (16,666.7 us) */
}

/* ---------------- main ---------------- */

#ifndef SYS_CLOCK_KHZ
#define SYS_CLOCK_KHZ 250000   /* RP2040: overclocked for interpreter headroom; the RP2350 does the same work at its default */
#endif
static vly_device_t device;   /* about 66 KB: lives in RAM, the cartridge stays in flash */

int main(void) {
    /* 250 MHz gives the interpreter headroom; this needs a slightly raised core voltage. */
    vreg_set_voltage(VREG_VOLTAGE_1_20);
    sleep_ms(2);
    set_sys_clock_khz(SYS_CLOCK_KHZ, true);

    lcd_init();
    buttons_init();
    audio_init();

    static const vly_hal_t hal = {
        NULL, hal_wait_vsync, hal_buttons, hal_display_begin, hal_display_line, hal_display_end,
        hal_audio_push, hal_save_load, hal_save_store,
    };
    int rc = vly_device_init_with_boot(&device, &hal, cart_data, cart_size, AUDIO_RATE, vly_boot_rom, sizeof vly_boot_rom, VLY_BOOT_FRAMES);
    if (rc != 0) for (;;) sleep_ms(1000);   /* bad cartridge: a real device would draw an error screen */
    next_frame = get_absolute_time();
    vly_device_run(&device);
    return 0;
}
