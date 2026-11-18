/* VLY-1 machine, portable C99. Implements SPEC.md. No dynamic allocation, no libc beyond string.h.
 * This is an independent second implementation used to cross-check the JavaScript reference, and the
 * starting point for running VLY-1 on microcontrollers. */
#ifndef VLY_H
#define VLY_H

#include <stddef.h>
#include <stdint.h>

#define VLY_SCREEN_W 160
#define VLY_SCREEN_H 144
#define VLY_CYCLES_PER_FRAME 120000u
#define VLY_INIT_CYCLES 1200000u
#define VLY_MAX_ROM 1048576u
#define VLY_SAVE_SIZE 1024u

typedef struct vly {
    const uint8_t *rom;      /* cartridge image (not copied) */
    uint32_t rom_len;
    uint8_t mem[65536];      /* backing store for all writable regions */
    uint16_t r[16];
    uint16_t pc;
    uint8_t z, n, c, v;
    uint32_t prng;
    uint32_t frame;
    uint8_t overran;
    uint8_t booted;
    uint8_t prev_input;
    uint32_t last_cycles;
    uint32_t init_cycles;
    uint16_t init_vec, frame_vec;
    uint32_t save_requests;
    /* optional callback when the program requests a save; receives the 1024-byte region */
    void (*on_save)(void *user, const uint8_t *save);
    void *on_save_user;
} vly_t;

/* Returns 0 on success, or a negative error code:
 * -1 bad length, -2 bad magic, -3 unsupported spec version, -4 non-zero flags/reserved bytes, -5 bad save length. */
int vly_init(vly_t *m, const uint8_t *rom, uint32_t len, const uint8_t *save, uint32_t save_len);
void vly_boot(vly_t *m);
void vly_run_frame(vly_t *m, uint8_t input);

uint8_t vly_read8(const vly_t *m, uint16_t addr);

/* Renders the 160x144 RGB888 image (69,120 bytes). */
void vly_render_rgb(const vly_t *m, uint8_t *out);
/* SHA-256 helpers. */
void vly_sha256(const uint8_t *data, size_t len, uint8_t out[32]);
void vly_state_hash(const vly_t *m, uint8_t out[32]);
void vly_frame_hash(const vly_t *m, uint8_t out[32]);
uint16_t vly_status(const vly_t *m);

/* One scanline (y = 0..143) as packed 0xRRGGBB, or RGB565. No framebuffer needed: this is what a
 * microcontroller streams to a display. vly_render_rgb() is just these in a loop. */
void vly_render_line_rgb32(const vly_t *m, int y, uint32_t *out /* 160 entries */);
void vly_render_line_rgb565(const vly_t *m, int y, uint16_t *out /* 160 entries */);

/* Audio: informative reference synthesis (SPEC section 8). Never affects program state. */
typedef struct vly_audio {
    uint32_t phase[4];
    uint16_t lfsr;
    uint8_t on[4];
} vly_audio_t;
void vly_audio_init(vly_audio_t *a);
/* Renders n mono samples at `rate` Hz (typically 44100, 735 per frame) from the current registers. */
void vly_audio_render(const vly_t *m, vly_audio_t *a, int16_t *out, int n, uint32_t rate);

#endif
