# VLY-1 handheld firmware for the RP2040.
#   export PICO_SDK_PATH=/path/to/pico-sdk
#   cmake -B build -DVLY_CART=/path/to/game.vlc && cmake --build build
# then copy build/vly1.uf2 to the board in BOOTSEL mode.
cmake_minimum_required(VERSION 3.13)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(vly1 C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

if(NOT VLY_CART)
  message(FATAL_ERROR "pass -DVLY_CART=/path/to/game.vlc")
endif()
set(CART_H ${CMAKE_CURRENT_BINARY_DIR}/cart.h)
add_custom_command(
  OUTPUT ${CART_H}
  COMMAND node ${CMAKE_CURRENT_SOURCE_DIR}/../tools/vlc2c.js ${VLY_CART} > ${CART_H}
  DEPENDS ${VLY_CART} ${CMAKE_CURRENT_SOURCE_DIR}/../tools/vlc2c.js)

add_executable(vly1
  main.c
  ../device.c
  ../../c/vly.c
  ${CART_H})
target_include_directories(vly1 PRIVATE ${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/..)
target_link_libraries(vly1 pico_stdlib hardware_spi hardware_pwm hardware_flash hardware_sync hardware_clocks hardware_vreg)
# -DVLY_DISPLAY=parallel builds rev B: a 3.5" 480x320 module on an 8-bit parallel bus (PIO + DMA), 2x scale.
set(VLY_DISPLAY "spi" CACHE STRING "spi (rev A, 1.54in ST7789) or parallel (rev B, 3.5in ILI9488)")
set(VLY_LCD "ili9488" CACHE STRING "controller of the parallel display: ili9488 (generic 3.5in modules) or hx8357d (Adafruit 3.5in breakout)")
if(VLY_DISPLAY STREQUAL "parallel")
  if(VLY_LCD STREQUAL "hx8357d")
    target_compile_definitions(vly1 PRIVATE VLY_LCD_HX8357D=1)
  endif()
  target_compile_definitions(vly1 PRIVATE VLY_DISPLAY_PARALLEL=1)
  target_link_libraries(vly1 hardware_pio hardware_dma)
  pico_generate_pio_header(vly1 ${CMAKE_CURRENT_LIST_DIR}/lcd_parallel.pio)
endif()
if(PICO_PLATFORM STREQUAL "rp2350-arm-s")
  target_compile_definitions(vly1 PRIVATE SYS_CLOCK_KHZ=200000)
endif()
target_compile_options(vly1 PRIVATE -O2)
pico_add_extra_outputs(vly1)
