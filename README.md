# VLY-1

A tiny, deterministic handheld game console, with its own small language and a headless toolchain that lets a person or an AI
agent write a complete game, look at it, test it and prove it works.

- **160 x 144** screen of 8 x 8 tiles, 4 colours, a scrolling background, a window layer, 64 sprites
- **60 frames a second**, 120,000 cycles a frame; 4 sound channels; 8 buttons; a 1 KB save; up to 1 MB of game
- **Fully deterministic:** the same cartridge and the same inputs give the same pixels, so tests can check exact hashes
- A JavaScript reference implementation, an independent C implementation (with a WebAssembly build and a desktop player),
  and a device layer with firmware for the Raspberry Pi RP2040 and RP2350

## Try it

```sh
git clone <this repository> && cd vly                # Node 20 or newer; nothing to install
alias vly="node $PWD/cli/vly.js"
vly new mygame --template game && cd mygame
vly build
vly run build/mygame.vlc --frames 120 --input "RIGHT@0-59" --screenshot shot.png
vly check src/main.vly                              # quality gates: play it with careless input and report problems
```

Start with `vly docs language`, `vly docs stdlib` and `vly docs design` (what makes a game good). The `games/` folder has complete
games with tests (`hill-racer` is the worked example of the design playbook), `templates/` has starting points, `AGENTS.md` is the
fast path for AI agents, and `.claude/skills/` has two skills (`vly` and `vly-design`).

## Layout

| Path | What |
|---|---|
| `SPEC.md`, `spec/` | the console specification, ISA table and font (the source of truth for the machine) |
| `src/core`, `src/asm`, `src/lang`, `src/tools`, `src/mcp` | emulator, assembler, compiler and standard library, headless tools, MCP server |
| `c/` | the C implementation, the WebAssembly build and the desktop player |
| `hardware/` | the device layer, firmware for the RP2040 and RP2350, a printable prototype shell |
| `conformance/` | the conformance suite: cartridges and golden hashes every implementation must match |
| `cli/` | the `vly` command |

## Tests

```sh
npm test              # emulator, assembler, compiler, CLI, templates, conformance, MCP, firmware build (where the Pico SDK is installed)
npm run difftest      # every conformance case in JavaScript and C, hash for hash
```

MIT licensed. The hosted site (https://vly-1.vercel.app: the arcade, publishing play links, the downloadable toolchain) is a separate service and is not part of this repository. Hand an agent that can run code the line *Build me a game for the VLY-1 handheld. Start at https://vly-1.vercel.app/build* and it can start building.
