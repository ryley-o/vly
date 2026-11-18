/* vlyc: minimal command line runner for the C implementation. Used by the differential tests.
 *
 *   vlyc <cart.vlc> <frames> [inputs.bin]
 *
 * With a 4th argument <out.pcm>, also writes the reference audio (16-bit signed little-endian mono, 44100 Hz,
 * 735 samples per frame) to that file.
 * Runs the cartridge for N frames (one input byte per frame from inputs.bin, or 0 if absent or exhausted) and prints,
 * for every frame, one line:  <frame> <cycles> <status> <stateHash> <frameHash>
 * The first line (frame -1) describes the machine after init.
 */
#include <stdio.h>
#include <stdlib.h>

#include "vly.h"

static void hex(const uint8_t *h, char *out) {
    static const char d[] = "0123456789abcdef";
    for (int i = 0; i < 32; i++) { out[i * 2] = d[h[i] >> 4]; out[i * 2 + 1] = d[h[i] & 15]; }
    out[64] = 0;
}

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

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: vlyc <cart.vlc> <frames> [inputs.bin]\n"); return 2; }
    size_t rom_len = 0, in_len = 0;
    uint8_t *rom = slurp(argv[1], &rom_len);
    if (!rom) { fprintf(stderr, "cannot read %s\n", argv[1]); return 2; }
    uint8_t *inputs = argc > 3 ? slurp(argv[3], &in_len) : NULL;
    static vly_t m;
    int rc = vly_init(&m, rom, (uint32_t)rom_len, NULL, 0);
    if (rc) { fprintf(stderr, "invalid cartridge (%d)\n", rc); return 1; }
    int frames = atoi(argv[2]);
    char sh[65], fh[65];
    uint8_t h[32];
    FILE *pcm = argc > 4 ? fopen(argv[4], "wb") : NULL;
    vly_audio_t audio;
    vly_audio_init(&audio);
    vly_boot(&m);
    vly_state_hash(&m, h); hex(h, sh);
    vly_frame_hash(&m, h); hex(h, fh);
    printf("-1 %u %u %s %s\n", m.init_cycles, vly_status(&m), sh, fh);
    for (int i = 0; i < frames; i++) {
        vly_run_frame(&m, (size_t)i < in_len ? inputs[i] : 0);
        vly_state_hash(&m, h); hex(h, sh);
        vly_frame_hash(&m, h); hex(h, fh);
        printf("%d %u %u %s %s\n", i, m.last_cycles, vly_status(&m), sh, fh);
        if (pcm) {
            int16_t buf[735];
            vly_audio_render(&m, &audio, buf, 735, 44100);
            fwrite(buf, sizeof buf[0], 735, pcm);
        }
    }
    if (pcm) fclose(pcm);
    return 0;
}
