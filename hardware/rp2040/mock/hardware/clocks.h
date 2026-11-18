#ifndef MOCK_CLOCKS_H
#define MOCK_CLOCKS_H
#include <stdbool.h>
#include <stdint.h>
bool set_sys_clock_khz(uint32_t freq_khz, bool required);
#endif
