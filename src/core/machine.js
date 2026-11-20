// VLY-1 reference machine. Deterministic, zero dependencies, runs in Node and browsers.
// See SPEC.md. Keep this file simple: it is the reference other implementations are checked against.

import * as C from './constants.js';
import { OP_BY_CODE, formHasImm } from './isa.js';
import { FONT } from './font.js';
import { sha256 } from './sha256.js';
import { renderRGBA, renderRGB } from './video.js';

// Per-opcode tables built once from the ISA table.
const COST = new Uint8Array(256);
const LEN = new Uint8Array(256);
const VALID = new Uint8Array(256);
for (const op of OP_BY_CODE) {
  if (!op) continue;
  VALID[op.op] = 1;
  COST[op.op] = op.cycles;
  LEN[op.op] = formHasImm(op.form) ? 4 : 2;
}

const s16 = (v) => (v << 16) >> 16;

export class CartridgeError extends Error {}

/** Validate a cartridge image. Returns an array of problems (empty if valid). */
export function validateCartridge(rom) {
  const problems = [];
  if (!(rom instanceof Uint8Array)) return ['cartridge must be a Uint8Array'];
  if (rom.length < 16) problems.push('cartridge is shorter than the 16-byte header');
  if (rom.length > C.MAX_ROM_SIZE) problems.push(`cartridge is ${rom.length} bytes; the maximum is ${C.MAX_ROM_SIZE}`);
  if (rom.length >= 16) {
    if (rom[0] !== 0x56 || rom[1] !== 0x43) problems.push('bad magic (expected "VC")');
    if (rom[2] !== C.SPEC_VERSION) problems.push(`unsupported spec_version ${rom[2]} (this build supports ${C.SPEC_VERSION})`);
    if (rom[3] !== 0) problems.push('header flags must be 0');
    for (let i = 8; i < 16; i++) if (rom[i] !== 0) { problems.push('header reserved bytes (8-15) must be 0'); break; }
  }
  return problems;
}

export class Machine {
  /**
   * @param {Uint8Array} rom cartridge image
   * @param {{save?: Uint8Array|null, onSave?: (bytes: Uint8Array) => void}} [opts]
   */
  constructor(rom, opts = {}) {
    const problems = validateCartridge(rom);
    if (problems.length) throw new CartridgeError(problems.join('; '));
    this.rom = rom;
    this.romLen = rom.length;
    this.initVector = rom[4] | (rom[5] << 8);
    this.frameVector = rom[6] | (rom[7] << 8);
    this.onSave = opts.onSave || null;

    this.mem = new Uint8Array(0x10000); // backing store for all writable regions
    this.r = new Uint16Array(16);
    this.pc = 0;
    this.z = 0; this.n = 0; this.c = 0; this.v = 0;
    this.prng = C.PRNG_INIT;
    this.frame = 0;          // frames completed
    this.overran = false;    // previous routine was cut off by the cycle budget
    this.lastCycles = 0;     // cycles used by the most recent routine
    this.initCycles = 0;     // cycles used by init
    this.initOverran = false;
    this.prevInput = 0;
    this.saveRequests = 0;
    this.booted = false;
    this.tracer = null;      // optional (pc, op, rd, rs, imm, regs) => void, called before each instruction

    // Power-on state (SPEC 2.3, 2.4).
    if (opts.save) {
      if (opts.save.length !== C.SAVE_SIZE) throw new CartridgeError(`save must be exactly ${C.SAVE_SIZE} bytes`);
      this.mem.set(opts.save, C.SAVE_START);
      this._setStatusWord(C.ST_SAVE_LOADED);
    }
    const ramp = [0x0fff, 0x0aaa, 0x0555, 0x0000];
    for (let p = 0; p < 16; p++) for (let i = 0; i < 4; i++) this._w16(C.BG_PAL + p * 8 + i * 2, ramp[i]);
    this._w16(C.LCDC, C.LCDC_BG);
    this.mem[C.ROMBANK] = C.DEFAULT_BANK;
  }

  // ---- memory -----------------------------------------------------------------------------------------

  read8(a) {
    a &= 0xffff;
    if (a < 0x4000) return a < this.romLen ? this.rom[a] : 0;
    if (a < 0x6000) {
      const i = (this.mem[C.ROMBANK] & 0x7f) * C.BANK_SIZE + (a - 0x4000);
      return i < this.romLen ? this.rom[i] : 0;
    }
    if (a < 0x6400) return this.mem[a];
    if (a < C.FONT_END) return FONT[a - C.FONT_START];
    if (a < 0x8000) return 0;
    if (a < 0xb280) return this.mem[a];
    if (a < 0xb300) return 0;
    return this.mem[a]; // I/O and work RAM (read-only/reserved I/O bytes are never written, so they read 0)
  }

  read16(a) {
    return this.read8(a) | (this.read8(a + 1) << 8);
  }

  write8(a, v) {
    a &= 0xffff;
    v &= 0xff;
    if (a < 0x6000) { this._fault(C.ST_RO_WRITE); return; }
    if (a < 0x6400) { this.mem[a] = v; return; }
    if (a < C.FONT_END) { this._fault(C.ST_RO_WRITE); return; }
    if (a < 0x8000) return;
    if (a < 0xb280) { this.mem[a] = v; return; }
    if (a < 0xb300) return;
    if (a < 0xb400) { this._writeIO(a, v); return; }
    this.mem[a] = v;
  }

  write16(a, v) {
    this.write8(a, v & 0xff);
    this.write8(a + 1, (v >> 8) & 0xff);
  }

  _writeIO(a, v) {
    // Writable: LCDC..WY, SAVECTL (trigger), ROMBANK, AUDIO. Everything else is read-only or reserved: ignored.
    if (a >= C.LCDC && a <= C.WY) { this.mem[a] = v; return; }
    if (a === C.SAVECTL) {
      if (v === 1) {
        this.saveRequests++;
        if (this.onSave) this.onSave(this.mem.slice(C.SAVE_START, C.SAVE_START + C.SAVE_SIZE));
      }
      return;
    }
    if (a === C.ROMBANK) { this.mem[a] = v & 0x7f; return; }
    if (a >= C.AUDIO && a < C.AUDIO_END) { this.mem[a] = v; return; }
  }

  _w16(a, v) { // direct internal write, no side effects
    this.mem[a] = v & 0xff;
    this.mem[a + 1] = (v >> 8) & 0xff;
  }

  _fault(bit) {
    // STATUS fault bits live in the low byte of the STATUS word; SAVE_LOADED lives in the high byte.
    if (bit < 0x100) this.mem[C.STATUS] |= bit;
    else this.mem[C.STATUS + 1] |= bit >> 8;
  }

  _setStatusWord(v) {
    this._w16(C.STATUS, v);
  }

  get status() { return this.mem[C.STATUS] | (this.mem[C.STATUS + 1] << 8); }
  get lcdc() { return this.mem[C.LCDC] | (this.mem[C.LCDC + 1] << 8); }

  /** Side-effect-free snapshot of the CPU-visible 64 KB address space. */
  memoryImage() {
    const out = new Uint8Array(0x10000);
    for (let a = 0; a < 0x10000; a++) out[a] = this.read8(a);
    return out;
  }

  // ---- execution --------------------------------------------------------------------------------------

  /** Run the init routine. Called automatically by the first runFrame(). */
  boot() {
    if (this.booted) return;
    this.booted = true;
    this._w16(C.FRAME, 0); this._w16(C.FRAME + 2, 0);
    this._w16(C.INPUT, 0);
    this._w16(C.PRESSED, 0);
    this._runRoutine(this.initVector, C.INIT_CYCLES);
    this.initCycles = this.lastCycles;
    this.initOverran = this.overran;
  }

  /**
   * Run one frame: latch input, call the frame routine, then (conceptually) render.
   * @param {number} input button bitmask (C.BTN)
   * @returns {{cycles: number, overrun: boolean}}
   */
  runFrame(input = 0) {
    if (!this.booted) this.boot();
    input &= 0xff;
    // Latch input.
    this._w16(C.PRESSED, input & ~this.prevInput);
    this._w16(C.INPUT, input);
    this.prevInput = input;
    // Clear fault bits; keep SAVE_LOADED; carry the OVERRUN flag from the previous routine.
    const saveLoaded = this.mem[C.STATUS + 1] & 1;
    this.mem[C.STATUS] = this.overran ? C.ST_OVERRUN : 0;
    this.mem[C.STATUS + 1] = saveLoaded;
    this.overran = false;
    this._runRoutine(this.frameVector, C.CYCLES_PER_FRAME);
    this.frame = (this.frame + 1) >>> 0;
    this._w16(C.FRAME, this.frame & 0xffff);
    this._w16(C.FRAME + 2, this.frame >>> 16);
    return { cycles: this.lastCycles, overrun: this.overran };
  }

  _runRoutine(vector, total) {
    const r = this.r;
    let budget = total;
    let pc = vector & 0xffff;
    r[15] = 0;
    let z = this.z, n = this.n, c = this.c, v = this.v;

    for (;;) {
      const op = this.read8(pc);
      if (!VALID[op]) {
        // Illegal opcode: costs 1 cycle, faults, ends the routine.
        if (budget < 1) { this.overran = true; break; }
        budget -= 1;
        this._fault(C.ST_ILLEGAL);
        break;
      }
      let cost = COST[op];
      const len = LEN[op];
      const b1 = this.read8(pc + 1);
      const rd = b1 >> 4, rs = b1 & 15;
      const imm = len === 4 ? this.read16(pc + 2) : 0;
      const next = (pc + len) & 0xffff;

      if (this.tracer) this.tracer(pc, op, rd, rs, imm, r);
      if (op === 0x40) cost += r[2] >> 2;
      else if (op === 0x41) cost += r[2] >> 3;
      if (cost > budget) { this.overran = true; break; }
      budget -= cost;

      let a, b, res;
      pc = next;
      switch (op) {
        case 0x00: break;
        case 0x01: this.pc = pc; this.z = z; this.n = n; this.c = c; this.v = v; this.lastCycles = total - budget; return;

        case 0x02: r[rd] = r[rs]; break;
        case 0x03: r[rd] = imm; break;
        case 0x04: r[rd] = this.read16(r[rs]); break;
        case 0x05: r[rd] = this.read8(r[rs]); break;
        case 0x06: this.write16(r[rd], r[rs]); break;
        case 0x07: this.write8(r[rd], r[rs]); break;
        case 0x08: r[rd] = this.read16(r[rs] + imm); break;
        case 0x09: r[rd] = this.read8(r[rs] + imm); break;
        case 0x0a: this.write16(r[rd] + imm, r[rs]); break;
        case 0x0b: this.write8(r[rd] + imm, r[rs]); break;
        case 0x0c: { const val = r[rs]; r[15] = (r[15] - 2) & 0xffff; this.write16(r[15], val); break; }
        case 0x0d: { const val = this.read16(r[15]); r[15] = (r[15] + 2) & 0xffff; r[rd] = val; break; }

        // ALU: rd = rd op rs
        case 0x10: case 0x20:
          a = r[rd]; b = op === 0x10 ? r[rs] : imm; res = a + b;
          c = res > 0xffff ? 1 : 0; res &= 0xffff;
          v = ((a ^ res) & (b ^ res) & 0x8000) ? 1 : 0;
          r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; break;
        case 0x11: case 0x28: case 0x29:
          a = r[rd]; b = op === 0x29 ? imm : r[rs]; res = (a - b) & 0xffff;
          c = a < b ? 1 : 0;
          v = ((a ^ b) & (a ^ res) & 0x8000) ? 1 : 0;
          if (op === 0x11) r[rd] = res;
          z = res === 0 ? 1 : 0; n = res >> 15; break;
        case 0x12: case 0x21: res = r[rd] & (op === 0x12 ? r[rs] : imm); r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x13: case 0x22: res = r[rd] | (op === 0x13 ? r[rs] : imm); r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x14: case 0x23: res = r[rd] ^ (op === 0x14 ? r[rs] : imm); r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x2a: res = r[rd] & r[rs]; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;

        case 0x15: case 0x24: { // SHL
          a = r[rd]; const k = (op === 0x15 ? r[rs] : rs) & 15;
          if (k === 0) { c = 0; res = a; } else { c = (a >> (16 - k)) & 1; res = (a << k) & 0xffff; }
          r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; v = 0; break;
        }
        case 0x16: case 0x25: { // SHR
          a = r[rd]; const k = (op === 0x16 ? r[rs] : rs) & 15;
          if (k === 0) { c = 0; res = a; } else { c = (a >> (k - 1)) & 1; res = a >> k; }
          r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; v = 0; break;
        }
        case 0x17: case 0x26: { // SAR
          a = s16(r[rd]); const k = (op === 0x17 ? r[rs] : rs) & 15;
          if (k === 0) { c = 0; res = a & 0xffff; } else { c = (a >> (k - 1)) & 1; res = (a >> k) & 0xffff; }
          r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; v = 0; break;
        }
        case 0x18: case 0x27: res = Math.imul(r[rd], op === 0x18 ? r[rs] : imm) & 0xffff; r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x19: res = ((s16(r[rd]) * s16(r[rs])) >> 8) & 0xffff; r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x1a:
          b = r[rs];
          if (b === 0) { r[rd] = 0xffff; this._fault(C.ST_DIV0); } else r[rd] = Math.floor(r[rd] / b);
          res = r[rd]; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x1b:
          b = r[rs];
          if (b === 0) this._fault(C.ST_DIV0); else r[rd] = r[rd] % b;
          res = r[rd]; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x1c: res = (0 - r[rd]) & 0xffff; r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;
        case 0x1d: res = ~r[rd] & 0xffff; r[rd] = res; z = res === 0 ? 1 : 0; n = res >> 15; c = 0; v = 0; break;

        // Control flow
        case 0x30: pc = imm; break;
        case 0x31: if (z) pc = imm; break;
        case 0x32: if (!z) pc = imm; break;
        case 0x33: if (c) pc = imm; break;
        case 0x34: if (!c) pc = imm; break;
        case 0x35: if (n !== v) pc = imm; break;
        case 0x36: if (n === v) pc = imm; break;
        case 0x37: if (z || n !== v) pc = imm; break;
        case 0x38: if (!z && n === v) pc = imm; break;
        case 0x39: if (!c && !z) pc = imm; break;
        case 0x3a: if (c || z) pc = imm; break;
        case 0x3c: r[15] = (r[15] - 2) & 0xffff; this.write16(r[15], pc); pc = imm; break;
        case 0x3d:
          if (r[15] === 0) { this.pc = pc; this.z = z; this.n = n; this.c = c; this.v = v; this.lastCycles = total - budget; return; }
          pc = this.read16(r[15]); r[15] = (r[15] + 2) & 0xffff; break;
        case 0x3e: pc = r[rs]; break;
        case 0x3f: { const target = r[rs]; r[15] = (r[15] - 2) & 0xffff; this.write16(r[15], pc); pc = target; break; }

        // Hardware
        case 0x40: { // MCPY dest=R0 src=R1 len=R2; as if all source bytes were read first
          const len2 = r[2];
          if (len2) {
            const tmp = new Uint8Array(len2);
            for (let i = 0; i < len2; i++) tmp[i] = this.read8(r[1] + i);
            for (let i = 0; i < len2; i++) this.write8(r[0] + i, tmp[i]);
          }
          break;
        }
        case 0x41: { // MSET dest=R0 value=R1 len=R2
          const len2 = r[2], val = r[1] & 0xff;
          for (let i = 0; i < len2; i++) this.write8(r[0] + i, val);
          break;
        }
        case 0x42: { // RND: xorshift32, return the high 16 bits
          let x = this.prng;
          x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
          this.prng = x;
          r[rd] = x >>> 16;
          break;
        }
        case 0x43: {
          const s = ((r[rd] << 16) | r[rs]) >>> 0;
          this.prng = s === 0 ? C.PRNG_INIT : s;
          break;
        }
        default: throw new Error('unreachable opcode ' + op);
      }
    }
    this.pc = pc; this.z = z; this.n = n; this.c = c; this.v = v;
    this.lastCycles = total - budget;
  }

  // ---- output & hashing -------------------------------------------------------------------------------

  /** 160x144 RGBA image of the current machine state. */
  renderRGBA() { return renderRGBA(this.mem); }
  /** 160x144 RGB888 image (69,120 bytes) used for frame hashes. */
  renderRGB() { return renderRGB(this.mem); }

  frameHash() { return sha256(this.renderRGB()); }

  /** SHA-256 over registers, flags, PRNG state, the overrun carry, then the CPU-visible memory image. */
  stateHash() {
    const head = new Uint8Array(32 + 1 + 4 + 1);
    const dv = new DataView(head.buffer);
    for (let i = 0; i < 16; i++) dv.setUint16(i * 2, this.r[i], true);
    head[32] = this.z | (this.n << 1) | (this.c << 2) | (this.v << 3);
    dv.setUint32(33, this.prng >>> 0, true);
    head[37] = this.overran ? 1 : 0;
    const img = this.memoryImage();
    const all = new Uint8Array(head.length + img.length);
    all.set(head); all.set(img, head.length);
    return sha256(all);
  }

  /**
   * An independent copy of the machine at this instant (same cartridge, memory, registers, flags, PRNG, frame count).
   * Run it ahead with other inputs to look before you leap: a planner bot tries several plans on clones and keeps the best.
   * The copy never calls onSave.
   */
  clone() {
    const m = new Machine(this.rom);
    m.mem.set(this.mem);
    m.r.set(this.r);
    m.pc = this.pc; m.z = this.z; m.n = this.n; m.c = this.c; m.v = this.v;
    m.prng = this.prng; m.frame = this.frame; m.overran = this.overran;
    m.lastCycles = this.lastCycles; m.initCycles = this.initCycles; m.initOverran = this.initOverran;
    m.prevInput = this.prevInput; m.saveRequests = this.saveRequests; m.booted = this.booted;
    return m;
  }

  /** Copy of the 1,024-byte save region as it is now. */
  saveBytes() { return this.mem.slice(C.SAVE_START, C.SAVE_START + C.SAVE_SIZE); }
}
