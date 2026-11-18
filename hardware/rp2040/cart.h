/* Placeholder so the firmware type-checks without a cartridge. Replace it with the real thing:
 *   node hardware/tools/vlc2c.js game.vlc > hardware/rp2040/cart.h
 * (the CMake build does this for you when you pass -DVLY_CART=game.vlc). */
#include <stdint.h>
static const uint8_t cart_data[16] __attribute__((aligned(4))) = { 0x56, 0x43, 1, 0 };
static const uint32_t cart_size = sizeof cart_data;
