# Stand-in Pico SDK headers

These files declare just the parts of the Raspberry Pi Pico SDK that `../main.c` uses, with the signatures from the
SDK documentation. `make check-rp2040` type-checks the firmware against them with the host compiler.

That catches typos, wrong argument counts and type mistakes. It does **not** prove the firmware works: the real SDK
and a real board are the only judges of that. Nothing here is linked or run.
