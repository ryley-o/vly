/* The portable VLY-1 device loop: everything a handheld needs between the hardware and the machine. */
#ifndef VLY_DEVICE_H
#define VLY_DEVICE_H

#include "hal.h"
#include "../c/vly.h"

#define VLY_DEVICE_MAX_AUDIO_RATE 48000u

typedef struct vly_device {
    vly_t m;                          /* the machine (about 64 KB of RAM) */
    vly_audio_t audio;
    const vly_hal_t *hal;
    uint32_t audio_rate;
    uint32_t audio_acc;               /* fractional samples carried between frames */
    uint32_t frames;
    int16_t abuf[VLY_DEVICE_MAX_AUDIO_RATE / 60];
    uint16_t line[VLY_SCREEN_W];
    const uint8_t *game_rom;          /* while the boot sequence runs: the game to start when it ends */
    uint32_t game_len;
    uint32_t boot_left;               /* boot frames still to run (0: the game is running) */
} vly_device_t;

/* Loads the save (if the HAL has one), starts the cartridge and runs its init(). `rom` must stay valid (it is
 * read in place, so it can live in memory-mapped flash). audio_rate is 8000..48000 Hz.
 * Returns 0, or a negative error: the vly_init codes (-1..-5), or -10 for an unusable audio rate. */
int vly_device_init(vly_device_t *d, const vly_hal_t *hal, const uint8_t *rom, uint32_t len, uint32_t audio_rate);

/* Like vly_device_init, but first runs the boot sequence cartridge (the VLY-1 logo and chime, c/boot_rom.h) for boot_frames,
 * ignoring the buttons, then starts the game on a fresh machine with its save. The game never sees the boot sequence. */
int vly_device_init_with_boot(vly_device_t *d, const vly_hal_t *hal, const uint8_t *rom, uint32_t len, uint32_t audio_rate,
                              const uint8_t *boot_rom, uint32_t boot_len, uint32_t boot_frames);

/* One 60 Hz tick: read buttons, run the frame, push audio, stream 144 lines. Does not wait. */
void vly_device_frame(vly_device_t *d);

/* Forever: wait_vsync, then vly_device_frame. */
void vly_device_run(vly_device_t *d);

#endif
