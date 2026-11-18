#ifndef MOCK_PWM_H
#define MOCK_PWM_H
#include <stdbool.h>
#include <stdint.h>
#include "pico.h"
uint pwm_gpio_to_slice_num(uint gpio);
void pwm_set_wrap(uint slice_num, uint16_t wrap);
void pwm_set_gpio_level(uint gpio, uint16_t level);
void pwm_set_enabled(uint slice_num, bool enabled);
#endif
