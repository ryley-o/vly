/* VLY-1 machine, portable C99. See vly.h and SPEC.md. */
#include "vly.h"

#ifdef VLY_NO_LIBC
void *memcpy(void *dst, const void *src, size_t n);
void *memset(void *dst, int c, size_t n);
#else
#include <string.h>
#endif

/* ---- font (SPEC Appendix A); generated into font_data.h by scripts/gen.js ---- */
#include "font_data.h"

/* ---- memory map ---- */
#define A_SAVE 0x6000u
#define A_FONT 0x6400u
#define A_FONT_END (A_FONT + 1520u)
#define A_TILES 0x8000u
#define A_BGMAP 0xA000u
#define A_WINMAP 0xA800u
#define A_OAM 0xB000u
#define A_BGPAL 0xB200u
#define A_OBJPAL 0xB240u
#define A_LCDC 0xB300u
#define A_SCX 0xB302u
#define A_SCY 0xB303u
#define A_WX 0xB304u
#define A_WY 0xB305u
#define A_FRAME 0xB310u
#define A_INPUT 0xB314u
#define A_PRESSED 0xB316u
#define A_STATUS 0xB318u
#define A_SAVECTL 0xB320u
#define A_ROMBANK 0xB322u
#define A_AUDIO 0xB340u
#define A_AUDIO_END 0xB360u

#define ST_DIV0 0x01
#define ST_RO 0x02
#define ST_ILLEGAL 0x04
#define ST_OVERRUN 0x08

/* ---- instruction metadata: length (2 or 4) and base cycles, 0 length = illegal ---- */
static uint8_t op_len[256];
static uint8_t op_cost[256];
static int tables_ready;

static void setop(uint8_t op, uint8_t len, uint8_t cost) { op_len[op] = len; op_cost[op] = cost; }

static void init_tables(void) {
    if (tables_ready) return;
    tables_ready = 1;
    memset(op_len, 0, sizeof op_len);
    setop(0x00, 2, 1); setop(0x01, 2, 1);
    setop(0x02, 2, 1); setop(0x03, 4, 2); setop(0x04, 2, 3); setop(0x05, 2, 3); setop(0x06, 2, 3); setop(0x07, 2, 3);
    setop(0x08, 4, 4); setop(0x09, 4, 4); setop(0x0a, 4, 4); setop(0x0b, 4, 4); setop(0x0c, 2, 3); setop(0x0d, 2, 3);
    for (int i = 0x10; i <= 0x17; i++) setop((uint8_t)i, 2, 1);
    setop(0x18, 2, 3); setop(0x19, 2, 3); setop(0x1a, 2, 8); setop(0x1b, 2, 8); setop(0x1c, 2, 1); setop(0x1d, 2, 1);
    for (int i = 0x20; i <= 0x23; i++) setop((uint8_t)i, 4, 2);
    setop(0x24, 2, 1); setop(0x25, 2, 1); setop(0x26, 2, 1); setop(0x27, 4, 4);
    setop(0x28, 2, 1); setop(0x29, 4, 2); setop(0x2a, 2, 1);
    for (int i = 0x30; i <= 0x3a; i++) setop((uint8_t)i, 4, 2);
    setop(0x3c, 4, 4); setop(0x3d, 2, 3); setop(0x3e, 2, 2); setop(0x3f, 2, 4);
    setop(0x40, 2, 8); setop(0x41, 2, 8); setop(0x42, 2, 2); setop(0x43, 2, 2);
}

/* ---- memory access ---- */
static void fault(vly_t *m, uint16_t bit) {
    if (bit < 0x100) m->mem[A_STATUS] |= (uint8_t)bit; else m->mem[A_STATUS + 1] |= (uint8_t)(bit >> 8);
}

uint8_t vly_read8(const vly_t *m, uint16_t a) {
    if (a < 0x4000u) return a < m->rom_len ? m->rom[a] : 0;
    if (a < 0x6000u) {
        uint32_t i = (uint32_t)(m->mem[A_ROMBANK] & 0x7f) * 0x2000u + (uint32_t)(a - 0x4000u);
        return i < m->rom_len ? m->rom[i] : 0;
    }
    if (a < 0x6400u) return m->mem[a];
    if (a < A_FONT_END) return VLY_FONT[a - A_FONT];
    if (a < 0x8000u) return 0;
    if (a < 0xb280u) return m->mem[a];
    if (a < 0xb300u) return 0;
    return m->mem[a];
}

static uint16_t read16(const vly_t *m, uint16_t a) {
    return (uint16_t)(vly_read8(m, a) | (vly_read8(m, (uint16_t)(a + 1)) << 8));
}

static void write8(vly_t *m, uint16_t a, uint8_t v) {
    if (a < 0x6000u) { fault(m, ST_RO); return; }
    if (a < 0x6400u) { m->mem[a] = v; return; }
    if (a < A_FONT_END) { fault(m, ST_RO); return; }
    if (a < 0x8000u) return;
    if (a < 0xb280u) { m->mem[a] = v; return; }
    if (a < 0xb300u) return;
    if (a < 0xb400u) {
        if (a >= A_LCDC && a <= A_WY) { m->mem[a] = v; return; }
        if (a == A_SAVECTL) {
            if (v == 1) {
                m->save_requests++;
                if (m->on_save) m->on_save(m->on_save_user, &m->mem[A_SAVE]);
            }
            return;
        }
        if (a == A_ROMBANK) { m->mem[a] = v & 0x7f; return; }
        if (a >= A_AUDIO && a < A_AUDIO_END) { m->mem[a] = v; return; }
        return;
    }
    m->mem[a] = v;
}

static void write16(vly_t *m, uint16_t a, uint16_t v) {
    write8(m, a, (uint8_t)(v & 0xff));
    write8(m, (uint16_t)(a + 1), (uint8_t)(v >> 8));
}

static void put16(vly_t *m, uint16_t a, uint16_t v) { /* direct internal write */
    m->mem[a] = (uint8_t)(v & 0xff);
    m->mem[(uint16_t)(a + 1)] = (uint8_t)(v >> 8);
}

uint16_t vly_status(const vly_t *m) { return (uint16_t)(m->mem[A_STATUS] | (m->mem[A_STATUS + 1] << 8)); }

/* ---- setup ---- */
int vly_init(vly_t *m, const uint8_t *rom, uint32_t len, const uint8_t *save, uint32_t save_len) {
    init_tables();
    if (len < 16 || len > VLY_MAX_ROM) return -1;
    if (rom[0] != 0x56 || rom[1] != 0x43) return -2;
    if (rom[2] != 1) return -3;
    if (rom[3] != 0) return -4;
    for (int i = 8; i < 16; i++) if (rom[i] != 0) return -4;
    if (save && save_len != VLY_SAVE_SIZE) return -5;
    memset(m, 0, sizeof *m);
    m->rom = rom;
    m->rom_len = len;
    m->init_vec = (uint16_t)(rom[4] | (rom[5] << 8));
    m->frame_vec = (uint16_t)(rom[6] | (rom[7] << 8));
    m->prng = 0x9e3779b9u;
    if (save) {
        memcpy(&m->mem[A_SAVE], save, VLY_SAVE_SIZE);
        m->mem[A_STATUS + 1] = 1;
    }
    static const uint16_t ramp[4] = {0x0fff, 0x0aaa, 0x0555, 0x0000};
    for (int p = 0; p < 16; p++) for (int i = 0; i < 4; i++) put16(m, (uint16_t)(A_BGPAL + p * 8 + i * 2), ramp[i]);
    put16(m, A_LCDC, 1);
    m->mem[A_ROMBANK] = 2;
    return 0;
}

/* ---- CPU ---- */
#define SET_ZN(res) do { z = ((res) & 0xffff) == 0; n = (uint8_t)(((res) >> 15) & 1); } while (0)

static void run_routine(vly_t *m, uint16_t vector, uint32_t total) {
    uint32_t budget = total;
    uint16_t pc = vector;
    uint16_t *r = m->r;
    uint8_t z = m->z, n = m->n, c = m->c, v = m->v;
    r[15] = 0;

    for (;;) {
        uint8_t op = vly_read8(m, pc);
        if (op_len[op] == 0) {
            if (budget < 1) { m->overran = 1; break; }
            budget -= 1;
            fault(m, ST_ILLEGAL);
            break;
        }
        uint32_t cost = op_cost[op];
        uint8_t len = op_len[op];
        uint8_t b1 = vly_read8(m, (uint16_t)(pc + 1));
        uint8_t rd = b1 >> 4, rs = b1 & 15;
        uint16_t imm = len == 4 ? read16(m, (uint16_t)(pc + 2)) : 0;
        if (op == 0x40) cost += r[2] >> 2;
        else if (op == 0x41) cost += r[2] >> 3;
        if (cost > budget) { m->overran = 1; break; }
        budget -= cost;
        uint16_t next = (uint16_t)(pc + len);
        pc = next;
        uint32_t a, b, res;

        switch (op) {
        case 0x00: break;
        case 0x01: goto finish;
        case 0x02: r[rd] = r[rs]; break;
        case 0x03: r[rd] = imm; break;
        case 0x04: r[rd] = read16(m, r[rs]); break;
        case 0x05: r[rd] = vly_read8(m, r[rs]); break;
        case 0x06: write16(m, r[rd], r[rs]); break;
        case 0x07: write8(m, r[rd], (uint8_t)r[rs]); break;
        case 0x08: r[rd] = read16(m, (uint16_t)(r[rs] + imm)); break;
        case 0x09: r[rd] = vly_read8(m, (uint16_t)(r[rs] + imm)); break;
        case 0x0a: write16(m, (uint16_t)(r[rd] + imm), r[rs]); break;
        case 0x0b: write8(m, (uint16_t)(r[rd] + imm), (uint8_t)r[rs]); break;
        case 0x0c: { uint16_t val = r[rs]; r[15] = (uint16_t)(r[15] - 2); write16(m, r[15], val); break; }
        case 0x0d: { uint16_t val = read16(m, r[15]); r[15] = (uint16_t)(r[15] + 2); r[rd] = val; break; }

        case 0x10: case 0x20:
            a = r[rd]; b = op == 0x10 ? r[rs] : imm; res = a + b;
            c = res > 0xffff; res &= 0xffff;
            v = (uint8_t)((((a ^ res) & (b ^ res)) & 0x8000) != 0);
            r[rd] = (uint16_t)res; SET_ZN(res); break;
        case 0x11: case 0x28: case 0x29:
            a = r[rd]; b = op == 0x29 ? imm : r[rs]; res = (a - b) & 0xffff;
            c = a < b;
            v = (uint8_t)((((a ^ b) & (a ^ res)) & 0x8000) != 0);
            if (op == 0x11) r[rd] = (uint16_t)res;
            SET_ZN(res); break;
        case 0x12: case 0x21: res = r[rd] & (op == 0x12 ? r[rs] : imm); r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;
        case 0x13: case 0x22: res = r[rd] | (op == 0x13 ? r[rs] : imm); r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;
        case 0x14: case 0x23: res = r[rd] ^ (op == 0x14 ? r[rs] : imm); r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;
        case 0x2a: res = r[rd] & r[rs]; SET_ZN(res); c = 0; v = 0; break;
        case 0x15: case 0x24: {
            uint32_t k = (op == 0x15 ? r[rs] : rs) & 15; a = r[rd];
            if (k == 0) { c = 0; res = a; } else { c = (a >> (16 - k)) & 1; res = (a << k) & 0xffff; }
            r[rd] = (uint16_t)res; SET_ZN(res); v = 0; break; }
        case 0x16: case 0x25: {
            uint32_t k = (op == 0x16 ? r[rs] : rs) & 15; a = r[rd];
            if (k == 0) { c = 0; res = a; } else { c = (a >> (k - 1)) & 1; res = a >> k; }
            r[rd] = (uint16_t)res; SET_ZN(res); v = 0; break; }
        case 0x17: case 0x26: {
            uint32_t k = (op == 0x17 ? r[rs] : rs) & 15; int32_t sa = (int16_t)r[rd];
            if (k == 0) { c = 0; res = (uint32_t)sa & 0xffff; } else { c = (uint8_t)((sa >> (k - 1)) & 1); res = (uint32_t)(sa >> k) & 0xffff; }
            r[rd] = (uint16_t)res; SET_ZN(res); v = 0; break; }
        case 0x18: case 0x27: res = ((uint32_t)r[rd] * (uint32_t)(op == 0x18 ? r[rs] : imm)) & 0xffff; r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;
        case 0x19: { int32_t p = (int32_t)(int16_t)r[rd] * (int32_t)(int16_t)r[rs]; res = (uint32_t)(p >> 8) & 0xffff; r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break; }
        case 0x1a:
            b = r[rs];
            if (b == 0) { r[rd] = 0xffff; fault(m, ST_DIV0); } else r[rd] = (uint16_t)(r[rd] / b);
            res = r[rd]; SET_ZN(res); c = 0; v = 0; break;
        case 0x1b:
            b = r[rs];
            if (b == 0) fault(m, ST_DIV0); else r[rd] = (uint16_t)(r[rd] % b);
            res = r[rd]; SET_ZN(res); c = 0; v = 0; break;
        case 0x1c: res = (0u - r[rd]) & 0xffff; r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;
        case 0x1d: res = (~r[rd]) & 0xffff; r[rd] = (uint16_t)res; SET_ZN(res); c = 0; v = 0; break;

        case 0x30: pc = imm; break;
        case 0x31: if (z) pc = imm; break;
        case 0x32: if (!z) pc = imm; break;
        case 0x33: if (c) pc = imm; break;
        case 0x34: if (!c) pc = imm; break;
        case 0x35: if (n != v) pc = imm; break;
        case 0x36: if (n == v) pc = imm; break;
        case 0x37: if (z || n != v) pc = imm; break;
        case 0x38: if (!z && n == v) pc = imm; break;
        case 0x39: if (!c && !z) pc = imm; break;
        case 0x3a: if (c || z) pc = imm; break;
        case 0x3c: r[15] = (uint16_t)(r[15] - 2); write16(m, r[15], pc); pc = imm; break;
        case 0x3d:
            if (r[15] == 0) goto finish;
            pc = read16(m, r[15]); r[15] = (uint16_t)(r[15] + 2); break;
        case 0x3e: pc = r[rs]; break;
        case 0x3f: { uint16_t target = r[rs]; r[15] = (uint16_t)(r[15] - 2); write16(m, r[15], pc); pc = target; break; }

        case 0x40: {
            uint16_t len2 = r[2];
            if (len2) {
                /* as if all source bytes were read first; the largest copy is 65,535 bytes */
                static uint8_t tmp[65536];
                for (uint32_t i = 0; i < len2; i++) tmp[i] = vly_read8(m, (uint16_t)(r[1] + i));
                for (uint32_t i = 0; i < len2; i++) write8(m, (uint16_t)(r[0] + i), tmp[i]);
            }
            break; }
        case 0x41: {
            uint16_t len2 = r[2]; uint8_t val = (uint8_t)r[1];
            for (uint32_t i = 0; i < len2; i++) write8(m, (uint16_t)(r[0] + i), val);
            break; }
        case 0x42: {
            uint32_t x = m->prng;
            x ^= x << 13; x ^= x >> 17; x ^= x << 5;
            m->prng = x; r[rd] = (uint16_t)(x >> 16);
            break; }
        case 0x43: {
            uint32_t s = ((uint32_t)r[rd] << 16) | r[rs];
            m->prng = s == 0 ? 0x9e3779b9u : s;
            break; }
        default: break;
        }
    }
finish:
    m->pc = pc; m->z = z; m->n = n; m->c = c; m->v = v;
    m->last_cycles = total - budget;
}

void vly_boot(vly_t *m) {
    if (m->booted) return;
    m->booted = 1;
    put16(m, A_FRAME, 0); put16(m, A_FRAME + 2, 0);
    put16(m, A_INPUT, 0); put16(m, A_PRESSED, 0);
    run_routine(m, m->init_vec, VLY_INIT_CYCLES);
    m->init_cycles = m->last_cycles;
}

void vly_run_frame(vly_t *m, uint8_t input) {
    if (!m->booted) vly_boot(m);
    put16(m, A_PRESSED, (uint16_t)(input & ~m->prev_input));
    put16(m, A_INPUT, input);
    m->prev_input = input;
    uint8_t saved = m->mem[A_STATUS + 1] & 1;
    m->mem[A_STATUS] = m->overran ? ST_OVERRUN : 0;
    m->mem[A_STATUS + 1] = saved;
    m->overran = 0;
    run_routine(m, m->frame_vec, VLY_CYCLES_PER_FRAME);
    m->frame++;
    put16(m, A_FRAME, (uint16_t)(m->frame & 0xffff));
    put16(m, A_FRAME + 2, (uint16_t)(m->frame >> 16));
}

/* ---- video ---- */
static uint32_t pal_color(const vly_t *m, uint16_t base, unsigned pal, unsigned idx) {
    uint16_t v = (uint16_t)(m->mem[base + pal * 8 + idx * 2] | (m->mem[base + pal * 8 + idx * 2 + 1] << 8));
    return (uint32_t)(((v >> 8) & 15) * 17) << 16 | (uint32_t)(((v >> 4) & 15) * 17) << 8 | (uint32_t)((v & 15) * 17);
}

static unsigned tile_px(const vly_t *m, unsigned tile, unsigned px, unsigned py) {
    return (m->mem[A_TILES + tile * 16 + py * 2 + (px >> 2)] >> (6 - 2 * (px & 3))) & 3;
}

/* Renders one scanline as packed 0xRRGGBB values. This is the single source of truth for the picture; the
 * full-frame and RGB565 renderers are thin wrappers, so they cannot disagree. It needs no framebuffer, only
 * a 160-entry output line, which is what a microcontroller driving a display wants. */
void vly_render_line_rgb32(const vly_t *m, int y, uint32_t *out) {
    const uint8_t *mem = m->mem;
    unsigned lcdc = mem[A_LCDC];
    int bg_on = lcdc & 1, win_on = lcdc & 2, obj_on = lcdc & 4;
    unsigned scx = mem[A_SCX], scy = mem[A_SCY], wx = mem[A_WX], wy = mem[A_WY];
    static const unsigned tw_of[4] = {1, 1, 2, 4}, th_of[4] = {1, 2, 2, 4};

    /* sprites that touch this line, in OAM order (lowest index has priority) */
    unsigned list[64];
    unsigned nlist = 0;
    if (obj_on) {
        for (unsigned i = 0; i < 64; i++) {
            unsigned o = A_OAM + i * 8;
            int sy = (int16_t)(mem[o + 2] | (mem[o + 3] << 8));
            unsigned attr = mem[o + 6] | (mem[o + 7] << 8);
            int sh = (int)(th_of[(attr >> 6) & 3] * 8);
            if (y >= sy && y < sy + sh) list[nlist++] = i;
        }
    }

    for (int x = 0; x < VLY_SCREEN_W; x++) {
        unsigned cell_addr = 0, px = 0, py = 0;
        int have = 0;
        if (win_on && (unsigned)x >= wx && (unsigned)y >= wy) {
            unsigned ux = (unsigned)x - wx, uy = (unsigned)y - wy;
            cell_addr = A_WINMAP + 2 * ((uy >> 3) * 32 + (ux >> 3)); px = ux & 7; py = uy & 7; have = 1;
        } else if (bg_on) {
            unsigned bx = ((unsigned)x + scx) & 255, by = ((unsigned)y + scy) & 255;
            cell_addr = A_BGMAP + 2 * ((by >> 3) * 32 + (bx >> 3)); px = bx & 7; py = by & 7; have = 1;
        }
        unsigned bgc = 0, bgprio = 0;
        uint32_t color;
        if (have) {
            unsigned cell = mem[cell_addr] | (mem[cell_addr + 1] << 8);
            if (cell & 0x400) px = 7 - px;
            if (cell & 0x800) py = 7 - py;
            bgc = tile_px(m, cell & 0x1ff, px, py);
            color = pal_color(m, A_BGPAL, (cell >> 12) & 7, bgc);
            bgprio = (cell >> 9) & 1;
        } else {
            color = pal_color(m, A_BGPAL, 0, 0);
        }
        for (unsigned k = 0; k < nlist; k++) {
            unsigned i = list[k];
            unsigned o = A_OAM + i * 8;
            int sx = (int16_t)(mem[o] | (mem[o + 1] << 8));
            int sy = (int16_t)(mem[o + 2] | (mem[o + 3] << 8));
            unsigned tile = (mem[o + 4] | (mem[o + 5] << 8)) & 0x1ff;
            unsigned attr = mem[o + 6] | (mem[o + 7] << 8);
            unsigned tw = tw_of[(attr >> 6) & 3], th = th_of[(attr >> 6) & 3];
            int sw = (int)(tw * 8), sh = (int)(th * 8);
            if (x < sx || x >= sx + sw) continue;
            int ox = x - sx, oy = y - sy;
            if (attr & 0x10) ox = sw - 1 - ox;
            if (attr & 0x20) oy = sh - 1 - oy;
            unsigned t = (tile + (unsigned)(oy >> 3) * tw + (unsigned)(ox >> 3)) & 0x1ff;
            unsigned sc = tile_px(m, t, (unsigned)ox & 7, (unsigned)oy & 7);
            if (sc == 0) continue;
            if (bgc != 0 && ((attr & 8) || bgprio)) { /* background wins */ }
            else color = pal_color(m, A_OBJPAL, attr & 7, sc);
            break;
        }
        out[x] = color;
    }
}

void vly_render_line_rgb565(const vly_t *m, int y, uint16_t *out) {
    uint32_t line[VLY_SCREEN_W];
    vly_render_line_rgb32(m, y, line);
    for (int x = 0; x < VLY_SCREEN_W; x++) {
        uint32_t c = line[x];
        out[x] = (uint16_t)(((c >> 8) & 0xf800) | ((c >> 5) & 0x07e0) | ((c >> 3) & 0x001f));
    }
}

void vly_render_rgb(const vly_t *m, uint8_t *out) {
    uint32_t line[VLY_SCREEN_W];
    for (int y = 0; y < VLY_SCREEN_H; y++) {
        vly_render_line_rgb32(m, y, line);
        for (int x = 0; x < VLY_SCREEN_W; x++) {
            uint8_t *p = out + (y * VLY_SCREEN_W + x) * 3;
            p[0] = (uint8_t)(line[x] >> 16); p[1] = (uint8_t)(line[x] >> 8); p[2] = (uint8_t)line[x];
        }
    }
}

/* ---- audio (informative reference synthesis, SPEC section 8) ---- */
void vly_audio_init(vly_audio_t *a) {
    for (int i = 0; i < 4; i++) { a->phase[i] = 0; a->on[i] = 0; }
    a->lfsr = 0x4000;
}

void vly_audio_render(const vly_t *m, vly_audio_t *a, int16_t *out, int n, uint32_t rate) {
    static const uint32_t duty_thr[4] = {0x20000000u, 0x40000000u, 0x80000000u, 0xC0000000u};
    const uint8_t *mem = m->mem;
    uint32_t master = mem[A_AUDIO + 16] & 15;
    uint32_t inc[4], vol[4], thr[4];
    int on[4];
    for (int c = 0; c < 4; c++) {
        unsigned base = A_AUDIO + c * 4;
        uint32_t hz = (uint32_t)(mem[base] | (mem[base + 1] << 8));
        unsigned ctrl = mem[base + 3];
        on[c] = (ctrl & 0x80) != 0;
        vol[c] = mem[base + 2] & 15;
        thr[c] = duty_thr[ctrl & 3];
        inc[c] = (uint32_t)(((uint64_t)hz << 32) / rate);
        if (on[c] && !a->on[c]) { a->phase[c] = 0; if (c == 3) a->lfsr = 0x4000; }
        a->on[c] = (uint8_t)on[c];
    }
    for (int i = 0; i < n; i++) {
        int32_t mix = 0;
        for (int c = 0; c < 4; c++) {
            if (!on[c] || vol[c] == 0) continue;
            uint32_t p = a->phase[c] + inc[c];
            int32_t v;
            if (c == 3) {
                if (p < a->phase[c]) { /* the accumulator wrapped: one LFSR clock (inc < 2^32 means at most one per sample) */
                    uint16_t bit = (uint16_t)((a->lfsr ^ (a->lfsr >> 1)) & 1);
                    a->lfsr = (uint16_t)((a->lfsr >> 1) | (bit << 14));
                }
                v = (a->lfsr & 1) ? 32767 : -32767;
            } else if (c == 2) {
                int32_t t = (int32_t)(p >> 16) - 32768;
                if (t < 0) t = -t;
                v = 2 * t - 32768;
                if (v > 32767) v = 32767;
            } else {
                v = p < thr[c] ? 32767 : -32767;
            }
            a->phase[c] = p;
            mix += v * (int32_t)vol[c] / 15;
        }
        mix = mix / 4 * (int32_t)master / 15;
        if (mix > 32767) mix = 32767;
        if (mix < -32767) mix = -32767;
        out[i] = (int16_t)mix;
    }
}

/* ---- SHA-256 ---- */
static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
};
#define ROR(x, k) (((x) >> (k)) | ((x) << (32 - (k))))

typedef struct { uint32_t h[8]; uint8_t buf[64]; size_t fill; uint64_t total; } sha_t;

static void sha_block(sha_t *s, const uint8_t *p) {
    uint32_t w[64];
    for (int i = 0; i < 16; i++) w[i] = (uint32_t)p[i * 4] << 24 | (uint32_t)p[i * 4 + 1] << 16 | (uint32_t)p[i * 4 + 2] << 8 | p[i * 4 + 3];
    for (int i = 16; i < 64; i++) {
        uint32_t s0 = ROR(w[i - 15], 7) ^ ROR(w[i - 15], 18) ^ (w[i - 15] >> 3);
        uint32_t s1 = ROR(w[i - 2], 17) ^ ROR(w[i - 2], 19) ^ (w[i - 2] >> 10);
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    uint32_t a = s->h[0], b = s->h[1], c = s->h[2], d = s->h[3], e = s->h[4], f = s->h[5], g = s->h[6], h = s->h[7];
    for (int i = 0; i < 64; i++) {
        uint32_t S1 = ROR(e, 6) ^ ROR(e, 11) ^ ROR(e, 25), ch = (e & f) ^ (~e & g);
        uint32_t t1 = h + S1 + ch + K[i] + w[i];
        uint32_t S0 = ROR(a, 2) ^ ROR(a, 13) ^ ROR(a, 22), maj = (a & b) ^ (a & c) ^ (b & c);
        uint32_t t2 = S0 + maj;
        h = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
    }
    s->h[0] += a; s->h[1] += b; s->h[2] += c; s->h[3] += d; s->h[4] += e; s->h[5] += f; s->h[6] += g; s->h[7] += h;
}
static void sha_init(sha_t *s) {
    static const uint32_t iv[8] = {0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19};
    memcpy(s->h, iv, sizeof iv); s->fill = 0; s->total = 0;
}
static void sha_update(sha_t *s, const uint8_t *d, size_t len) {
    s->total += len;
    while (len) {
        size_t k = 64 - s->fill; if (k > len) k = len;
        memcpy(s->buf + s->fill, d, k); s->fill += k; d += k; len -= k;
        if (s->fill == 64) { sha_block(s, s->buf); s->fill = 0; }
    }
}
static void sha_final(sha_t *s, uint8_t out[32]) {
    uint64_t bits = s->total * 8;
    uint8_t pad = 0x80;
    sha_update(s, &pad, 1);
    uint8_t zero = 0;
    while (s->fill != 56) sha_update(s, &zero, 1);
    uint8_t len[8];
    for (int i = 0; i < 8; i++) len[i] = (uint8_t)(bits >> (56 - 8 * i));
    sha_update(s, len, 8);
    for (int i = 0; i < 8; i++) { out[i * 4] = (uint8_t)(s->h[i] >> 24); out[i * 4 + 1] = (uint8_t)(s->h[i] >> 16); out[i * 4 + 2] = (uint8_t)(s->h[i] >> 8); out[i * 4 + 3] = (uint8_t)s->h[i]; }
}

void vly_sha256(const uint8_t *data, size_t len, uint8_t out[32]) {
    sha_t s; sha_init(&s); sha_update(&s, data, len); sha_final(&s, out);
}

void vly_state_hash(const vly_t *m, uint8_t out[32]) {
    static uint8_t buf[38 + 65536];
    for (int i = 0; i < 16; i++) { buf[i * 2] = (uint8_t)(m->r[i] & 0xff); buf[i * 2 + 1] = (uint8_t)(m->r[i] >> 8); }
    buf[32] = (uint8_t)(m->z | (m->n << 1) | (m->c << 2) | (m->v << 3));
    buf[33] = (uint8_t)m->prng; buf[34] = (uint8_t)(m->prng >> 8); buf[35] = (uint8_t)(m->prng >> 16); buf[36] = (uint8_t)(m->prng >> 24);
    buf[37] = m->overran ? 1 : 0;
    for (uint32_t a = 0; a < 65536; a++) buf[38 + a] = vly_read8(m, (uint16_t)a);
    vly_sha256(buf, sizeof buf, out);
}

void vly_frame_hash(const vly_t *m, uint8_t out[32]) {
    static uint8_t img[VLY_SCREEN_W * VLY_SCREEN_H * 3];
    vly_render_rgb(m, img);
    vly_sha256(img, sizeof img, out);
}
