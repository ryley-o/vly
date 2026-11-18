#ifndef MOCK_SPI_H
#define MOCK_SPI_H
#include <stddef.h>
#include <stdint.h>
#include "pico.h"
typedef struct spi_inst spi_inst_t;
extern spi_inst_t *const spi0;
extern spi_inst_t *const spi1;
uint spi_init(spi_inst_t *spi, uint baudrate);
int spi_write_blocking(spi_inst_t *spi, const uint8_t *src, size_t len);
#endif
