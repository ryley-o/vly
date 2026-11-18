#ifndef MOCK_PICO_STDLIB_H
#define MOCK_PICO_STDLIB_H
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "pico.h"
#include "hardware/gpio.h"
#include "hardware/clocks.h"

void sleep_ms(uint32_t ms);
void sleep_until(absolute_time_t t);
absolute_time_t get_absolute_time(void);
absolute_time_t delayed_by_us(absolute_time_t t, uint64_t us);

struct repeating_timer { int64_t delay_us; void *user_data; };
bool add_repeating_timer_us(int64_t delay_us, bool (*cb)(struct repeating_timer *), void *user_data, struct repeating_timer *out);
#endif
