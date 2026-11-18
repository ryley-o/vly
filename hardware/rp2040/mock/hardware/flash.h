#ifndef MOCK_FLASH_H
#define MOCK_FLASH_H
#include <stddef.h>
#include <stdint.h>
#include "pico.h"
#define FLASH_PAGE_SIZE 256u
#define FLASH_SECTOR_SIZE 4096u
void flash_range_erase(uint32_t flash_offs, size_t count);
void flash_range_program(uint32_t flash_offs, const uint8_t *data, size_t count);
#endif
