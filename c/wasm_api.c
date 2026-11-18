/* WebAssembly API around the VLY-1 core. Everything is static; the host talks to it through pointers into
 * linear memory. See src/wasm/index.js for the JavaScript wrapper. Build: scripts/build-wasm.sh */
#include "vly.h"

#define EXPORT(name) __attribute__((export_name(name)))

static vly_t machine;
static uint8_t rom_buf[VLY_MAX_ROM];
static uint8_t save_in[VLY_SAVE_SIZE];
static uint8_t save_snapshot[VLY_SAVE_SIZE];
static uint8_t rgba[VLY_SCREEN_W * VLY_SCREEN_H * 4];
static uint8_t hash_out[32];
static int16_t audio_buf[4096];
static vly_audio_t audio;

static void on_save(void *user, const uint8_t *save) {
    (void)user;
    for (int i = 0; i < (int)VLY_SAVE_SIZE; i++) save_snapshot[i] = save[i];
}

EXPORT("vly_rom_ptr") uint8_t *w_rom_ptr(void) { return rom_buf; }
EXPORT("vly_save_in_ptr") uint8_t *w_save_in_ptr(void) { return save_in; }
EXPORT("vly_save_snapshot_ptr") uint8_t *w_save_snapshot_ptr(void) { return save_snapshot; }
EXPORT("vly_mem_ptr") uint8_t *w_mem_ptr(void) { return machine.mem; }

/* Returns 0 on success or a negative cartridge error (see vly.h). */
EXPORT("vly_load") int w_load(uint32_t rom_len, int has_save) {
    int rc = vly_init(&machine, rom_buf, rom_len, has_save ? save_in : 0, has_save ? VLY_SAVE_SIZE : 0);
    if (rc) return rc;
    machine.on_save = on_save;
    vly_audio_init(&audio);
    return 0;
}

EXPORT("vly_boot") void w_boot(void) { vly_boot(&machine); }
EXPORT("vly_frame") void w_frame(uint8_t input) { vly_run_frame(&machine, input); }
EXPORT("vly_status") uint32_t w_status(void) { return vly_status(&machine); }
EXPORT("vly_last_cycles") uint32_t w_last_cycles(void) { return machine.last_cycles; }
EXPORT("vly_init_cycles") uint32_t w_init_cycles(void) { return machine.init_cycles; }
EXPORT("vly_frame_count") uint32_t w_frame_count(void) { return machine.frame; }
EXPORT("vly_save_requests") uint32_t w_save_requests(void) { return machine.save_requests; }
EXPORT("vly_read8") uint32_t w_read8(uint32_t addr) { return vly_read8(&machine, (uint16_t)addr); }

/* Renders the screen as RGBA (160 x 144 x 4) and returns a pointer to it. */
EXPORT("vly_render_rgba") uint8_t *w_render_rgba(void) {
    uint32_t line[VLY_SCREEN_W];
    for (int y = 0; y < VLY_SCREEN_H; y++) {
        vly_render_line_rgb32(&machine, y, line);
        for (int x = 0; x < VLY_SCREEN_W; x++) {
            uint8_t *p = rgba + (y * VLY_SCREEN_W + x) * 4;
            p[0] = (uint8_t)(line[x] >> 16); p[1] = (uint8_t)(line[x] >> 8); p[2] = (uint8_t)line[x]; p[3] = 255;
        }
    }
    return rgba;
}

EXPORT("vly_state_hash") uint8_t *w_state_hash(void) { vly_state_hash(&machine, hash_out); return hash_out; }
EXPORT("vly_frame_hash") uint8_t *w_frame_hash(void) { vly_frame_hash(&machine, hash_out); return hash_out; }

/* Renders up to 4096 mono samples at `rate` Hz and returns a pointer to 16-bit signed samples. */
EXPORT("vly_audio") int16_t *w_audio(int n, uint32_t rate) {
    if (n > 4096) n = 4096;
    vly_audio_render(&machine, &audio, audio_buf, n, rate);
    return audio_buf;
}
