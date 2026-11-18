#include "device.h"

#include <string.h>

static void on_save(void *user, const uint8_t *save) {
    vly_device_t *d = (vly_device_t *)user;
    if (d->hal->save_store) d->hal->save_store(d->hal->user, save);
}

int vly_device_init(vly_device_t *d, const vly_hal_t *hal, const uint8_t *rom, uint32_t len, uint32_t audio_rate) {
    if (audio_rate < 8000 || audio_rate > VLY_DEVICE_MAX_AUDIO_RATE) return -10;
    uint8_t save[VLY_SAVE_SIZE];
    int have = hal->save_load ? hal->save_load(hal->user, save) : 0;
    int rc = vly_init(&d->m, rom, len, have ? save : NULL, have ? VLY_SAVE_SIZE : 0);
    if (rc) return rc;
    d->hal = hal;
    d->audio_rate = audio_rate;
    d->audio_acc = 0;
    d->frames = 0;
    vly_audio_init(&d->audio);
    d->m.on_save = on_save;
    d->m.on_save_user = d;
    vly_boot(&d->m);
    return 0;
}

void vly_device_frame(vly_device_t *d) {
    const vly_hal_t *h = d->hal;
    vly_run_frame(&d->m, h->buttons ? h->buttons(h->user) : 0);

    /* rate / 60 samples per frame, carrying the remainder so a second of frames is exactly `rate` samples */
    d->audio_acc += d->audio_rate;
    int n = (int)(d->audio_acc / 60);
    d->audio_acc -= (uint32_t)n * 60;
    if (h->audio_push && n > 0) {
        vly_audio_render(&d->m, &d->audio, d->abuf, n, d->audio_rate);
        h->audio_push(h->user, d->abuf, n);
    }

    h->display_begin(h->user);
    for (int y = 0; y < VLY_SCREEN_H; y++) {
        vly_render_line_rgb565(&d->m, y, d->line);
        h->display_line(h->user, y, d->line);
    }
    h->display_end(h->user);
    d->frames++;
}

void vly_device_run(vly_device_t *d) {
    for (;;) {
        d->hal->wait_vsync(d->hal->user);
        vly_device_frame(d);
    }
}
