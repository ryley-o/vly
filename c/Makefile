CC ?= cc
CFLAGS ?= -std=c99 -O2 -Wall -Wextra -pedantic

all: build/vlyc

build/vlyc: vly.c vly.h main.c font_data.h
	mkdir -p build
	$(CC) $(CFLAGS) -o $@ vly.c main.c

# Native desktop player (needs SDL2 development files: apt install libsdl2-dev, brew install sdl2, vcpkg install sdl2)
player: build/vly-player

build/vly-player: vly.c vly.h player_sdl.c font_data.h boot_rom.h
	mkdir -p build
	$(CC) $(CFLAGS) $$(pkg-config --cflags sdl2) -o $@ vly.c player_sdl.c $$(pkg-config --libs sdl2)

clean:
	rm -rf build

.PHONY: all player clean
