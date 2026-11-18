// VLY-1 machine constants. Source of truth for addresses and limits (see SPEC.md section 2).

export const SPEC_VERSION = 1;

export const SCREEN_W = 160;
export const SCREEN_H = 144;
export const CYCLES_PER_FRAME = 120000; // [TUNE]
export const INIT_CYCLES = 1200000;     // init gets ten frames' worth of cycles [TUNE]
export const FPS = 60;

export const ROM_FIXED_START = 0x0000;
export const ROM_FIXED_END = 0x3fff;
export const ROM_WINDOW_START = 0x4000;
export const ROM_WINDOW_END = 0x5fff;
export const BANK_SIZE = 0x2000;
export const MAX_ROM_SIZE = 1048576;
export const MAX_BANKS = 128;
export const DEFAULT_BANK = 2;

export const SAVE_START = 0x6000;
export const SAVE_SIZE = 1024;
export const FONT_START = 0x6400;
export const FONT_TILES = 95;
export const FONT_SIZE = FONT_TILES * 16; // 1520
export const FONT_END = FONT_START + FONT_SIZE; // exclusive, 0x69F0

export const TILE_RAM = 0x8000;
export const TILE_COUNT = 512;
export const BG_MAP = 0xa000;
export const WIN_MAP = 0xa800;
export const OAM = 0xb000;
export const OAM_COUNT = 64;
export const BG_PAL = 0xb200;
export const OBJ_PAL = 0xb240;

export const IO = 0xb300;
export const LCDC = 0xb300;
export const SCX = 0xb302;
export const SCY = 0xb303;
export const WX = 0xb304;
export const WY = 0xb305;
export const FRAME = 0xb310;
export const INPUT = 0xb314;
export const PRESSED = 0xb316;
export const STATUS = 0xb318;
export const SAVECTL = 0xb320;
export const ROMBANK = 0xb322;
export const AUDIO = 0xb340;
export const AUDIO_END = 0xb360; // exclusive
export const WRAM = 0xb400;

export const LCDC_BG = 1;
export const LCDC_WIN = 2;
export const LCDC_OBJ = 4;

export const ST_DIV0 = 1;
export const ST_RO_WRITE = 2;
export const ST_ILLEGAL = 4;
export const ST_OVERRUN = 8;
export const ST_SAVE_LOADED = 0x100;

export const BTN = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, A: 16, B: 32, START: 64, SELECT: 128 };

export const PRNG_INIT = 0x9e3779b9;
