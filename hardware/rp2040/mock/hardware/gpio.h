#ifndef MOCK_GPIO_H
#define MOCK_GPIO_H
#include <stdbool.h>
#include "pico.h"
enum gpio_function { GPIO_FUNC_SPI = 1, GPIO_FUNC_PWM = 4, GPIO_FUNC_SIO = 5 };
#define GPIO_OUT 1
#define GPIO_IN 0
void gpio_init(uint gpio);
void gpio_set_dir(uint gpio, bool out);
void gpio_put(uint gpio, bool value);
bool gpio_get(uint gpio);
void gpio_pull_up(uint gpio);
void gpio_set_function(uint gpio, enum gpio_function fn);
#endif
