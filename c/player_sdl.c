/* vly-player: native desktop player for VLY-1 cartridges (SDL2).
 *
 *   vly-player game.vlc [--scale N] [--fullscreen] [--save FILE] [--mute]
 *   vly-player game.vlc --frames 120 --dump shot.ppm      (headless: run N frames, write the screen, exit)
 *
 * Keys: arrows / WASD = D-pad, X or K = A, Z or J = B, Enter or Space = START, Shift or Backspace = SELECT,
 *       P = pause, F11 = fullscreen, F12 = screenshot (BMP), Esc = quit. Game controllers work too.
 * Battery saves are stored next to the cartridge as game.sav and written the moment the game asks to save.
 */
#include <SDL.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "vly.h"
#include "boot_rom.h"

static vly_t machine;
static const char *save_path;

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

static void on_save(void *user, const uint8_t *save) {
    (void)user;
    if (!save_path) return;
    char tmp[1024];
    snprintf(tmp, sizeof tmp, "%s.tmp", save_path);
    FILE *f = fopen(tmp, "wb");
    if (!f) { fprintf(stderr, "cannot write save file %s\n", tmp); return; }
    fwrite(save, 1, VLY_SAVE_SIZE, f);
    fclose(f);
    if (rename(tmp, save_path) != 0) fprintf(stderr, "cannot replace %s\n", save_path);
}

static uint8_t keyboard_buttons(const uint8_t *k) {
    uint8_t b = 0;
    if (k[SDL_SCANCODE_UP] || k[SDL_SCANCODE_W]) b |= 1;
    if (k[SDL_SCANCODE_DOWN] || k[SDL_SCANCODE_S]) b |= 2;
    if (k[SDL_SCANCODE_LEFT] || k[SDL_SCANCODE_A]) b |= 4;
    if (k[SDL_SCANCODE_RIGHT] || k[SDL_SCANCODE_D]) b |= 8;
    if (k[SDL_SCANCODE_X] || k[SDL_SCANCODE_K]) b |= 16;
    if (k[SDL_SCANCODE_Z] || k[SDL_SCANCODE_J]) b |= 32;
    if (k[SDL_SCANCODE_RETURN] || k[SDL_SCANCODE_SPACE]) b |= 64;
    if (k[SDL_SCANCODE_LSHIFT] || k[SDL_SCANCODE_RSHIFT] || k[SDL_SCANCODE_BACKSPACE]) b |= 128;
    return b;
}

static uint8_t pad_buttons(SDL_GameController *pad) {
    if (!pad) return 0;
    uint8_t b = 0;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_DPAD_UP)) b |= 1;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_DPAD_DOWN)) b |= 2;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_DPAD_LEFT)) b |= 4;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_DPAD_RIGHT)) b |= 8;
    /* the console's A/B sit where a Nintendo pad has them: A = east, B = south */
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_B)) b |= 16;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_A)) b |= 32;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_START)) b |= 64;
    if (SDL_GameControllerGetButton(pad, SDL_CONTROLLER_BUTTON_BACK)) b |= 128;
    int lx = SDL_GameControllerGetAxis(pad, SDL_CONTROLLER_AXIS_LEFTX), ly = SDL_GameControllerGetAxis(pad, SDL_CONTROLLER_AXIS_LEFTY);
    if (ly < -16000) b |= 1;
    if (ly > 16000) b |= 2;
    if (lx < -16000) b |= 4;
    if (lx > 16000) b |= 8;
    return b;
}

static void write_ppm(const char *path) {
    static uint8_t rgb[VLY_SCREEN_W * VLY_SCREEN_H * 3];
    vly_render_rgb(&machine, rgb);
    FILE *f = fopen(path, "wb");
    if (!f) { fprintf(stderr, "cannot write %s\n", path); return; }
    fprintf(f, "P6\n%d %d\n255\n", VLY_SCREEN_W, VLY_SCREEN_H);
    fwrite(rgb, 1, sizeof rgb, f);
    fclose(f);
}

int main(int argc, char **argv) {
    const char *cart = NULL, *dump = NULL;
    int no_boot = 0;
    int scale = 4, fullscreen = 0, mute = 0, max_frames = -1;
    char default_save[1024];
    save_path = NULL;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--scale") && i + 1 < argc) scale = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--fullscreen")) fullscreen = 1;
        else if (!strcmp(argv[i], "--mute")) mute = 1;
        else if (!strcmp(argv[i], "--save") && i + 1 < argc) save_path = argv[++i];
        else if (!strcmp(argv[i], "--frames") && i + 1 < argc) max_frames = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--dump") && i + 1 < argc) dump = argv[++i];
        else if (!strcmp(argv[i], "--no-boot")) no_boot = 1;
        else if (argv[i][0] != '-') cart = argv[i];
        else { fprintf(stderr, "unknown option %s\n", argv[i]); return 2; }
    }
    if (!cart) { fprintf(stderr, "usage: vly-player game.vlc [--scale N] [--fullscreen] [--save FILE] [--mute] [--no-boot] [--frames N --dump out.ppm]\n"); return 2; }
    size_t rom_len = 0;
    uint8_t *rom = slurp(cart, &rom_len);
    if (!rom) { fprintf(stderr, "cannot read %s\n", cart); return 1; }
    if (!save_path) {
        snprintf(default_save, sizeof default_save, "%s", cart);
        char *dot = strrchr(default_save, '.');
        if (dot) *dot = 0;
        strncat(default_save, ".sav", sizeof default_save - strlen(default_save) - 1);
        save_path = default_save;
    }
    size_t save_len = 0;
    uint8_t *save = slurp(save_path, &save_len);
    if (save && save_len != VLY_SAVE_SIZE) { fprintf(stderr, "ignoring %s: not a %u-byte save\n", save_path, VLY_SAVE_SIZE); free(save); save = NULL; }
    int rc = vly_init(&machine, rom, (uint32_t)rom_len, save, save ? VLY_SAVE_SIZE : 0);
    if (rc) { fprintf(stderr, "%s is not a valid VLY-1 cartridge (error %d)\n", cart, rc); return 1; }
    machine.on_save = on_save;

    int headless = max_frames >= 0;
    if (headless) {
        vly_boot(&machine);
        for (int i = 0; i < max_frames; i++) vly_run_frame(&machine, 0);
        if (dump) write_ppm(dump);
        return 0;
    }

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_GAMECONTROLLER) != 0) { fprintf(stderr, "SDL_Init: %s\n", SDL_GetError()); return 1; }
    const char *name = strrchr(cart, '/');
    char title[256];
    snprintf(title, sizeof title, "VLY-1: %s", name ? name + 1 : cart);
    SDL_Window *win = SDL_CreateWindow(title, SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, VLY_SCREEN_W * scale, VLY_SCREEN_H * scale,
                                       SDL_WINDOW_RESIZABLE | (fullscreen ? SDL_WINDOW_FULLSCREEN_DESKTOP : 0));
    if (!win) { fprintf(stderr, "SDL_CreateWindow: %s\n", SDL_GetError()); return 1; }
    SDL_Renderer *ren = SDL_CreateRenderer(win, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    if (!ren) ren = SDL_CreateRenderer(win, -1, SDL_RENDERER_SOFTWARE);
    if (!ren) { fprintf(stderr, "SDL_CreateRenderer: %s\n", SDL_GetError()); return 1; }
    SDL_RenderSetLogicalSize(ren, VLY_SCREEN_W, VLY_SCREEN_H);
    SDL_RenderSetIntegerScale(ren, SDL_TRUE);
    SDL_Texture *tex = SDL_CreateTexture(ren, SDL_PIXELFORMAT_RGB24, SDL_TEXTUREACCESS_STREAMING, VLY_SCREEN_W, VLY_SCREEN_H);

    SDL_AudioDeviceID audio_dev = 0;
    vly_audio_t audio;
    vly_audio_init(&audio);
    if (!mute) {
        SDL_AudioSpec want, have;
        SDL_zero(want);
        want.freq = 44100; want.format = AUDIO_S16SYS; want.channels = 1; want.samples = 1024;
        audio_dev = SDL_OpenAudioDevice(NULL, 0, &want, &have, 0);
        if (audio_dev) SDL_PauseAudioDevice(audio_dev, 0);
        else fprintf(stderr, "no audio: %s\n", SDL_GetError());
    }
    SDL_GameController *pad = NULL;
    for (int i = 0; i < SDL_NumJoysticks(); i++) if (SDL_IsGameController(i)) { pad = SDL_GameControllerOpen(i); if (pad) break; }

    /* The boot sequence (a small cartridge: the VLY-1 logo and a chime) runs first, then the game starts fresh. --no-boot skips it. */
    static vly_t boot_machine;
    int boot_left = 0;
    if (!no_boot && vly_init(&boot_machine, vly_boot_rom, sizeof vly_boot_rom, NULL, 0) == 0) { boot_left = VLY_BOOT_FRAMES; vly_boot(&boot_machine); }
    if (!boot_left) vly_boot(&machine);
    vly_t *cur = boot_left ? &boot_machine : &machine;

    static uint8_t rgb[VLY_SCREEN_W * VLY_SCREEN_H * 3];
    int running = 1, paused = 0, shots = 0;
    uint64_t freq = SDL_GetPerformanceFrequency(), last = SDL_GetPerformanceCounter();
    double acc = 0;
    while (running) {
        SDL_Event e;
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) running = 0;
            else if (e.type == SDL_KEYDOWN && !e.key.repeat) {
                if (e.key.keysym.sym == SDLK_ESCAPE) running = 0;
                else if (e.key.keysym.sym == SDLK_p) paused = !paused;
                else if (e.key.keysym.sym == SDLK_F11) { Uint32 f = SDL_GetWindowFlags(win); SDL_SetWindowFullscreen(win, (f & SDL_WINDOW_FULLSCREEN_DESKTOP) ? 0 : SDL_WINDOW_FULLSCREEN_DESKTOP); }
                else if (e.key.keysym.sym == SDLK_F12) {
                    char fn[64]; snprintf(fn, sizeof fn, "vly-shot-%d.bmp", ++shots);
                    SDL_Surface *s = SDL_CreateRGBSurfaceWithFormatFrom(rgb, VLY_SCREEN_W, VLY_SCREEN_H, 24, VLY_SCREEN_W * 3, SDL_PIXELFORMAT_RGB24);
                    if (s) { SDL_SaveBMP(s, fn); SDL_FreeSurface(s); fprintf(stderr, "wrote %s\n", fn); }
                }
            } else if (e.type == SDL_CONTROLLERDEVICEADDED && !pad) pad = SDL_GameControllerOpen(e.cdevice.which);
            else if (e.type == SDL_CONTROLLERDEVICEREMOVED && pad) { SDL_GameControllerClose(pad); pad = NULL; }
        }
        uint64_t now = SDL_GetPerformanceCounter();
        acc += (double)(now - last) / (double)freq;
        last = now;
        if (acc > 0.25) acc = 0.25;
        int stepped = 0;
        while (acc >= 1.0 / 60.0) {
            acc -= 1.0 / 60.0;
            if (paused) continue;
            vly_run_frame(cur, boot_left ? 0 : (uint8_t)(keyboard_buttons(SDL_GetKeyboardState(NULL)) | pad_buttons(pad)));
            if (boot_left && --boot_left == 0) { vly_boot(&machine); cur = &machine; }
            stepped = 1;
            if (audio_dev && SDL_GetQueuedAudioSize(audio_dev) < 735 * 2 * 6) {
                int16_t buf[735];
                vly_audio_render(cur, &audio, buf, 735, 44100);
                SDL_QueueAudio(audio_dev, buf, sizeof buf);
            }
        }
        if (stepped || shots == 0) {
            vly_render_rgb(cur, rgb);
            SDL_UpdateTexture(tex, NULL, rgb, VLY_SCREEN_W * 3);
        }
        SDL_RenderClear(ren);
        SDL_RenderCopy(ren, tex, NULL, NULL);
        SDL_RenderPresent(ren);
        SDL_Delay(1);
    }
    if (audio_dev) SDL_CloseAudioDevice(audio_dev);
    if (pad) SDL_GameControllerClose(pad);
    SDL_DestroyTexture(tex); SDL_DestroyRenderer(ren); SDL_DestroyWindow(win); SDL_Quit();
    return 0;
}
