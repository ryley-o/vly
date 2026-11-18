// JavaScript wrapper around the WebAssembly build of the VLY-1 core (about 14 KB, no imports, no dependencies).
// Same shape as the reference Machine, but several times faster, and bit-identical (it is the C implementation).
//
//   import { WasmMachine } from 'vly/wasm';
//   const m = await WasmMachine.create(romBytes, { save, onSave });
//   m.boot(); m.runFrame(buttons); const rgba = m.renderRGBA();

import { WASM_BASE64 } from './wasm-data.js';

const SCREEN_W = 160, SCREEN_H = 144;

function decodeBase64(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let modulePromise = null;
/** Compile (once) and return the WebAssembly module. Pass your own bytes to override the embedded build. */
export function loadModule(bytes) {
  if (bytes) return WebAssembly.compile(bytes);
  if (!modulePromise) modulePromise = WebAssembly.compile(decodeBase64(WASM_BASE64));
  return modulePromise;
}

const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');

export class WasmMachine {
  /**
   * @param {Uint8Array} rom cartridge image
   * @param {{save?: Uint8Array|null, onSave?: (bytes: Uint8Array) => void, wasm?: Uint8Array}} [opts]
   */
  static async create(rom, opts = {}) {
    const mod = await loadModule(opts.wasm);
    const instance = await WebAssembly.instantiate(mod, {});
    return new WasmMachine(instance, rom, opts);
  }

  constructor(instance, rom, opts) {
    this.x = instance.exports;
    this.onSave = opts.onSave || null;
    this.lastSaveCount = 0;
    this.booted = false;
    const mem = new Uint8Array(this.x.memory.buffer);
    const romPtr = this.x.vly_rom_ptr();
    if (rom.length > 1048576) throw new Error('cartridge is larger than 1 MB');
    mem.set(rom, romPtr);
    let hasSave = 0;
    if (opts.save) {
      if (opts.save.length !== 1024) throw new Error('save must be exactly 1024 bytes');
      mem.set(opts.save, this.x.vly_save_in_ptr());
      hasSave = 1;
    }
    const rc = this.x.vly_load(rom.length, hasSave);
    if (rc) throw new Error(`invalid cartridge (error ${rc}: ${{ '-1': 'bad length', '-2': 'bad magic', '-3': 'unsupported spec version', '-4': 'non-zero flags or reserved bytes' }[rc] || 'unknown'})`);
  }

  get #buf() { return this.x.memory.buffer; }

  boot() { if (!this.booted) { this.booted = true; this.x.vly_boot(); } }

  /** @returns {{cycles: number}} */
  runFrame(input = 0) {
    if (!this.booted) this.boot();
    this.x.vly_frame(input & 0xff);
    const n = this.x.vly_save_requests();
    if (n !== this.lastSaveCount) {
      this.lastSaveCount = n;
      if (this.onSave) this.onSave(new Uint8Array(this.#buf, this.x.vly_save_snapshot_ptr(), 1024).slice());
    }
    return { cycles: this.x.vly_last_cycles() };
  }

  get status() { return this.x.vly_status(); }
  get lastCycles() { return this.x.vly_last_cycles(); }
  get initCycles() { return this.x.vly_init_cycles(); }
  get frame() { return this.x.vly_frame_count(); }
  /** The machine's backing memory (65,536 bytes). Valid until the next call that grows memory (never, here). */
  get mem() { return new Uint8Array(this.#buf, this.x.vly_mem_ptr(), 65536); }
  read8(a) { return this.x.vly_read8(a & 0xffff); }
  read16(a) { return this.read8(a) | (this.read8(a + 1) << 8); }

  /** The screen as RGBA, 160x144x4. A view into WASM memory: copy it if you keep it. */
  renderRGBA() { return new Uint8Array(this.#buf, this.x.vly_render_rgba(), SCREEN_W * SCREEN_H * 4); }
  renderRGB() {
    const rgba = this.renderRGBA();
    const out = new Uint8Array(SCREEN_W * SCREEN_H * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4) { out[j++] = rgba[i]; out[j++] = rgba[i + 1]; out[j++] = rgba[i + 2]; }
    return out;
  }
  frameHash() { return new Uint8Array(this.#buf, this.x.vly_frame_hash(), 32).slice(); }
  stateHash() { return new Uint8Array(this.#buf, this.x.vly_state_hash(), 32).slice(); }
  frameHashHex() { return hex(this.frameHash()); }
  stateHashHex() { return hex(this.stateHash()); }

  /** Render `n` mono samples (at most 4096) as floats in [-1, 1], like the reference Synth. */
  renderAudio(n, rate = 44100) {
    const p = this.x.vly_audio(n, rate);
    const s = new Int16Array(this.#buf, p, Math.min(n, 4096));
    const out = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s[i] / 32767;
    return out;
  }
}
