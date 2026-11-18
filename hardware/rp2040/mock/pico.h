#ifndef MOCK_PICO_H
#define MOCK_PICO_H
#include <stdint.h>
typedef unsigned int uint;
typedef struct { uint64_t _private_us; } absolute_time_t;
#define PICO_FLASH_SIZE_BYTES (2 * 1024 * 1024)
#define XIP_BASE 0x10000000u
#endif
