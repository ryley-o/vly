/* Host test for the device loop: a stub HAL stands in for the hardware, and every frame it receives is compared
 * with the reference renderer. Usage: test_host <cart.vlc> <frames> [expect-saves]
 * Input is a fixed script: START on frame 5, RIGHT held on frames 10..20. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../device.h"
#include "../../c/boot_rom.h"

static uint8_t *slurp(const char *path, size_t *len) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    uint8_t *buf = (uint8_t *)malloc((size_t)n + 1);
    if (!buf || fread(buf, 1, (size_t)n, f) != (size_t)n) { fclose(f); free(buf); return NULL; }
    fclose(f);
    *len = (size_t)n;
    return buf;
}

typedef struct stub {
    uint32_t frame;                    /* frames completed */
    int next_line;                     /* the line we expect next, -1 outside a frame */
    int order_errors;
    uint16_t fb[VLY_SCREEN_H][VLY_SCREEN_W];
    uint32_t samples;
    uint32_t saves;
    uint8_t last_save[VLY_SAVE_SIZE];
    int have_save;
    uint8_t save[VLY_SAVE_SIZE];
} stub_t;

static uint8_t script(uint32_t f) { return (uint8_t)((f == 5 ? VLY_BTN_START : 0) | (f >= 10 && f <= 20 ? VLY_BTN_RIGHT : 0)); }
static uint8_t s_buttons(void *u) { return script(((stub_t *)u)->frame); }
static void s_begin(void *u) { stub_t *s = u; if (s->next_line != -1) s->order_errors++; s->next_line = 0; }
static void s_line(void *u, int y, const uint16_t *px) {
    stub_t *s = u;
    if (y != s->next_line) s->order_errors++;
    s->next_line = y + 1;
    if (y >= 0 && y < VLY_SCREEN_H) memcpy(s->fb[y], px, VLY_SCREEN_W * sizeof(uint16_t));
}
static void s_end(void *u) { stub_t *s = u; if (s->next_line != VLY_SCREEN_H) s->order_errors++; s->next_line = -1; }
static void s_audio(void *u, const int16_t *p, int n) { (void)p; ((stub_t *)u)->samples += (uint32_t)n; }
static int s_load(void *u, uint8_t *buf) { stub_t *s = u; if (!s->have_save) return 0; memcpy(buf, s->save, VLY_SAVE_SIZE); return 1; }
static void s_store(void *u, const uint8_t *buf) { stub_t *s = u; s->saves++; memcpy(s->last_save, buf, VLY_SAVE_SIZE); }
static void s_vsync(void *u) { (void)u; }

static uint16_t to565(uint8_t r, uint8_t g, uint8_t b) { return (uint16_t)(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)); }

#define CHECK(cond, ...) do { if (!(cond)) { fprintf(stderr, "FAIL: " __VA_ARGS__); fprintf(stderr, "\n"); return 1; } } while (0)

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: test_host <cart.vlc> <frames> [expect-saves]\n"); return 2; }
    size_t len;
    uint8_t *rom = slurp(argv[1], &len);
    if (!rom) { fprintf(stderr, "cannot read %s\n", argv[1]); return 2; }
    uint32_t frames = (uint32_t)atoi(argv[2]);
    int expect_saves = argc > 3 ? atoi(argv[3]) : -1;
    static stub_t stub;
    static vly_device_t dev;
    static vly_t ref;
    stub.next_line = -1;
    vly_hal_t hal = { &stub, s_vsync, s_buttons, s_begin, s_line, s_end, s_audio, s_load, s_store };
    const uint32_t rate = 22050;

    CHECK(vly_device_init(&dev, &hal, rom, (uint32_t)len, 4000) == -10, "an audio rate of 4000 Hz must be rejected");
    CHECK(vly_device_init(&dev, &hal, rom, (uint32_t)len, rate) == 0, "device init failed");
    CHECK(vly_init(&ref, rom, (uint32_t)len, NULL, 0) == 0, "reference init failed");
    vly_boot(&ref);

    static uint8_t rgb[VLY_SCREEN_W * VLY_SCREEN_H * 3];
    for (uint32_t f = 0; f < frames; f++) {
        stub.frame = f;
        vly_device_frame(&dev);
        vly_run_frame(&ref, script(f));
        vly_render_rgb(&ref, rgb);
        for (int y = 0; y < VLY_SCREEN_H; y++)
            for (int x = 0; x < VLY_SCREEN_W; x++) {
                const uint8_t *p = &rgb[(y * VLY_SCREEN_W + x) * 3];
                CHECK(stub.fb[y][x] == to565(p[0], p[1], p[2]), "frame %u pixel (%d,%d): device 0x%04x, reference 0x%04x", f, x, y, stub.fb[y][x], to565(p[0], p[1], p[2]));
            }
        if ((f & 63) == 0 || f + 1 == frames) {
            uint8_t a[32], b[32];
            vly_state_hash(&dev.m, a);
            vly_state_hash(&ref, b);
            CHECK(memcmp(a, b, 32) == 0, "state hash differs from the reference at frame %u", f);
        }
    }
    CHECK(stub.order_errors == 0, "%d display calls were out of order", stub.order_errors);
    uint32_t want = (uint32_t)(((uint64_t)frames * rate) / 60);
    CHECK(stub.samples >= want - 1 && stub.samples <= want + 1, "audio: %u samples for %u frames, expected about %u", stub.samples, frames, want);
    if (expect_saves >= 0) CHECK((int)stub.saves == expect_saves, "expected %d save requests, got %u", expect_saves, stub.saves);
    CHECK(dev.frames == frames, "frame counter %u", dev.frames);

    if (stub.saves > 0) {
        /* power-cycle: a device that stored a save must hand it back and the cartridge must see it */
        stub.have_save = 1;
        memcpy(stub.save, stub.last_save, VLY_SAVE_SIZE);
        static vly_device_t dev2;
        CHECK(vly_device_init(&dev2, &hal, rom, (uint32_t)len, rate) == 0, "re-init with a save failed");
        CHECK((vly_status(&dev2.m) & 0x100) != 0, "the cartridge did not see its stored save");
        CHECK(memcmp(&dev2.m.mem[0x6000], stub.last_save, VLY_SAVE_SIZE) == 0, "the save did not round-trip");
    }
    /* with the boot sequence: the logo runs first and ignores the buttons, then the game starts fresh and matches the reference frame for frame */
    uint32_t out_samples = stub.samples, out_saves = stub.saves;
    {
        static vly_device_t dev3;
        static vly_t ref2;
        memset(&stub, 0, sizeof stub);
        stub.next_line = -1;
        CHECK(vly_device_init_with_boot(&dev3, &hal, rom, (uint32_t)len, rate, vly_boot_rom, sizeof vly_boot_rom, VLY_BOOT_FRAMES) == 0, "init with boot failed");
        CHECK(vly_init(&ref2, rom, (uint32_t)len, NULL, 0) == 0, "reference init failed");
        vly_boot(&ref2);
        uint16_t logo_px = 0;
        for (uint32_t f = 0; f < VLY_BOOT_FRAMES + 40; f++) {
            stub.frame = f < VLY_BOOT_FRAMES ? f : f - VLY_BOOT_FRAMES;
            vly_device_frame(&dev3);
            if (f == VLY_BOOT_FRAMES - 1) logo_px = stub.fb[80][72];
            if (f >= VLY_BOOT_FRAMES) {
                vly_run_frame(&ref2, script(f - VLY_BOOT_FRAMES));
                vly_render_rgb(&ref2, rgb);
                for (int y = 0; y < VLY_SCREEN_H; y++)
                    for (int x = 0; x < VLY_SCREEN_W; x++) {
                        const uint8_t *p = &rgb[(y * VLY_SCREEN_W + x) * 3];
                        CHECK(stub.fb[y][x] == to565(p[0], p[1], p[2]), "after the boot, frame %u pixel (%d,%d) differs from the reference", f - VLY_BOOT_FRAMES, x, y);
                    }
            }
        }
        CHECK(logo_px != 0, "the boot logo drew nothing");
        CHECK(stub.order_errors == 0, "%d display calls were out of order during boot", stub.order_errors);
    }
    printf("ok  %s  %u frames, %u samples, %u saves\n", argv[1], frames, out_samples, out_saves);
    free(rom);
    return 0;
}
