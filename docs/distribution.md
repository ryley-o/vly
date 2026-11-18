# Distributing games and emulators

A VLY-1 cartridge is a plain file (`.vlc`, at most 1 MB). There are several ways to put one in front of a player.

## 1. One HTML file

```sh
vly export build/mygame.vlc --html mygame.html --title "My Game"
```

The result is a single self-contained page (about 30 KB plus your cartridge): the WebAssembly emulator, the
cartridge, keyboard and touch controls, sound, and battery saves in `localStorage`. It works offline, from
`file://`, on phones (use "Add to Home Screen"), and on any static host. The playground has the same thing as an
**Export .html** button.

Controls: arrows or WASD, `X` = A, `Z` = B, `Enter` = Start, `Shift` = Select, `M` toggles sound, `F` is fullscreen.

## 2. The native desktop player

```sh
make -C c player                       # needs SDL2: apt install libsdl2-dev, brew install sdl2
./c/build/vly-player mygame.vlc        # --scale 5, --fullscreen, --mute, --save FILE
```

Keyboard and game controllers, audio, integer scaling, F11 fullscreen, F12 screenshots. Battery saves are written to
`mygame.sav` next to the cartridge the instant the game asks to save. For automation,
`vly-player mygame.vlc --frames 120 --dump shot.ppm` runs headless and writes the screen. Release builds for Linux and
macOS are produced by `.github/workflows/release.yml` when a `v*` tag is pushed.

## 3. The WebAssembly core (embed it anywhere)

`src/wasm/vly.wasm` is the whole emulator in about 14 KB: CPU, scanline renderer, audio synthesis and SHA-256. It has no
imports and needs no runtime, so any host that can run WebAssembly can run VLY-1 (browsers, Node, Deno, Rust and Go
runtimes, game engines). The exports are described in `c/wasm_api.c`; a JavaScript wrapper is included:

```js
import { WasmMachine } from 'vly/wasm';
const m = await WasmMachine.create(romBytes, { save: null, onSave: (bytes) => store(bytes) });
m.boot();
m.runFrame(buttons);                 // once per 1/60 s
ctx.putImageData(new ImageData(new Uint8ClampedArray(m.renderRGBA()), 160, 144), 0, 0);
```

It is the same C implementation that runs on the desktop, and it passes the full conformance suite bit for bit
(`npm test`). It is two to ten times faster than the JavaScript reference. Rebuild with `npm run build:wasm` (needs
clang and wasm-ld).

## 4. The npm package

`npm pack` produces a tarball with the CLI, the emulator (JavaScript and WebAssembly), the compiler, templates and
docs. After publishing, `npx vly new mygame` works anywhere with Node 20 or newer. Library entry points:
`vly/core` (reference emulator), `vly/wasm`, `vly/asm`, `vly/lang`.

## 5. The website and playground

`npm run docs` builds `site/dist`: docs, a live demo and the playground, as an installable, offline-capable web app.
Deploy `site/dist` to any static host (a `vercel.json` is included, GitHub Pages is wired up in
`.github/workflows/pages.yml`). `npm run site:single` also produces one self-contained playground page.

## 6. On chain

`vly chunks` plans how a cartridge is stored (see `CONTRACTS.md`). Players load the chunks, check the ROM hash, and run
the cartridge in any of the emulators above.

## 7. Hardware

See `docs/hardware.md`: the C core renders one scanline at a time, so a microcontroller with a small display can run it.
