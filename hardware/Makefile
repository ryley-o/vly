# Host-side checks for the device layer. No hardware or vendor SDK needed.
CC ?= cc
CFLAGS ?= -std=c99 -O2 -Wall -Wextra -pedantic
CARTS = ../conformance/carts

all: test

build/test_host: host/test_host.c device.c device.h hal.h ../c/vly.c ../c/vly.h
	mkdir -p build
	$(CC) $(CFLAGS) -o $@ host/test_host.c device.c ../c/vly.c

# Runs real cartridges through the device loop and compares every frame with the reference renderer.
test: build/test_host
	./build/test_host $(CARTS)/template_pong.vlc 3000 1
	./build/test_host $(CARTS)/template_platformer.vlc 170
	./build/test_host $(CARTS)/template_shooter.vlc 240
	./build/test_host $(CARTS)/audio.vlc 200

# Type-checks the RP2040 firmware against small stand-in headers for the Pico SDK (see rp2040/mock/).
# This proves the code is consistent with the API as we understand it, not that it works on a board.
check-rp2040: rp2040/main.c device.c
	$(CC) -std=gnu99 -fsyntax-only -Wall -Wextra -I rp2040/mock -I rp2040 -I . rp2040/main.c
	$(CC) -std=gnu99 -fsyntax-only -Wall -Wextra -I . device.c

clean:
	rm -rf build

.PHONY: all test check-rp2040 clean
