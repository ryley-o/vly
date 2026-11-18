/* VLY-1 hardware abstraction layer.
 *
 * A device port implements these callbacks and nothing else: the portable frame loop in device.c does the rest
 * (running the machine, streaming scanlines, producing audio). Every callback gets the `user` pointer back.
 * Callbacks that are NULL are skipped, except wait_vsync, display_begin, display_line and display_end.
 */
#ifndef VLY_HAL_H
#define VLY_HAL_H

#include <stdint.h>

typedef struct vly_hal {
    void *user;

    /* Block until it is time for the next 60 Hz frame (a timer or the display's tearing-effect pin). */
    void (*wait_vsync)(void *user);

    /* The 8 buttons as a bit mask: UP 1, DOWN 2, LEFT 4, RIGHT 8, A 16, B 32, START 64, SELECT 128 (1 = held). */
    uint8_t (*buttons)(void *user);

    /* One frame is display_begin, then display_line for y = 0..143 in order, then display_end.
     * `px` holds 160 RGB565 pixels (host byte order) and is only valid during the call. */
    void (*display_begin)(void *user);
    void (*display_line)(void *user, int y, const uint16_t *px);
    void (*display_end)(void *user);

    /* Mono signed 16-bit samples at the rate given to vly_device_init, about rate / 60 per frame. */
    void (*audio_push)(void *user, const int16_t *samples, int n);

    /* Persistence. save_load copies the 1,024-byte save into `buf` and returns 1, or returns 0 if there is none.
     * save_store is called each time the cartridge commits its save (SPEC section on save data). */
    int (*save_load)(void *user, uint8_t *buf);
    void (*save_store)(void *user, const uint8_t *buf);
} vly_hal_t;

/* Button bits, as the machine sees them. */
enum { VLY_BTN_UP = 1, VLY_BTN_DOWN = 2, VLY_BTN_LEFT = 4, VLY_BTN_RIGHT = 8,
       VLY_BTN_A = 16, VLY_BTN_B = 32, VLY_BTN_START = 64, VLY_BTN_SELECT = 128 };

#endif
