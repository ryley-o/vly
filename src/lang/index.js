import { compile } from './compiler.js';
import { CompileError } from './lexer.js';
import { assemble, AsmError } from '../asm/assembler.js';

export { compile } from './compiler.js';
export { CompileError } from './lexer.js';
export { STDLIB_SOURCE as stdlibSource } from './stdlib.js';

const FIXED = 16384;        // always visible to the CPU
const FLAT = 24576;         // fixed + bank 2, which is what the bank window shows at power-on
const BANK = 8192;
const STUB = 26;            // bytes of always-visible code per banked function (its far-call stub)

function functionSizes(symbols, end) {
  const sizes = {};
  const labels = Object.entries(symbols).filter(([k, s]) => s.kind === 'label' && k.startsWith('f_') && !k.endsWith('__ret')).sort((x, y) => x[1].offset - y[1].offset);
  const codeEnd = symbols.__code_end ? symbols.__code_end.offset : end;
  labels.forEach(([k, s], i) => { sizes[k.slice(2)] = (i + 1 < labels.length ? labels[i + 1][1].offset : codeEnd) - s.offset; });
  // banked functions: the body lives in its bank (the always-visible part is a small stub)
  for (const [k, s] of Object.entries(symbols)) {
    if (k.startsWith('fb_') && symbols['fbe_' + k.slice(3)]) sizes[k.slice(3)] = symbols['fbe_' + k.slice(3)].offset - s.offset;
  }
  return sizes;
}

/** Lay out just the always-visible part (banks reduced to their labels) to learn how big everything is. */
function measureFlat(asm) {
  const cut = asm.indexOf('\n.bank ');
  const flatPart = cut >= 0 ? asm.slice(0, cut) : asm;
  const stubs = cut >= 0 ? [...asm.slice(cut).matchAll(/^((?:a|fb)_\w+):/gm)].map((m) => `${m[1]}:`).join('\n') : '';
  let probe;
  try { probe = assemble(`${flatPart}\n${stubs}\n`, { filename: 'generated.asm', measure: true }); } catch { return null; }
  const end = probe.symbols.__flat_end;
  return end ? { flatBytes: end.offset, sizes: functionSizes(probe.symbols, end.offset) } : null;
}

/** If one explicit bank holds more than 8 KB, say which and what is in it. */
function fullBankError(asm, file) {
  const parts = asm.split(/\n(?=\.bank \d+\n)/);
  for (const part of parts.slice(1)) {
    const n = Number(/^\.bank (\d+)/.exec(part)[1]);
    const others = [...asm.matchAll(/^((?:a|fb)_\w+):/gm)].map((m) => m[1]).filter((l) => !new RegExp(`^${l}:`, 'm').test(part));
    let probe = null;
    try { probe = assemble(`${parts[0]}\n${others.map((l) => `${l}:`).join('\n')}\n${part.replace(/^\.bank \d+\n/, '')}\n`, { filename: 'generated.asm', measure: true }); } catch { continue; }
    const a0 = probe.symbols[`__bank_${n}`], a1 = probe.symbols[`__bank_${n}_end`];
    if (a0 && a1 && a1.offset - a0.offset > BANK) {
      const inBank = Object.entries(functionSizes(probe.symbols, 0)).filter(([k]) => probe.symbols['fb_' + k] && probe.symbols['fb_' + k].offset >= a0.offset && probe.symbols['fb_' + k].offset < a1.offset);
      return new CompileError({
        file, line: 1, col: 1,
        message: `bank ${n} holds ${a1.offset - a0.offset} bytes, but a bank is ${BANK} (over by ${a1.offset - a0.offset - BANK}). Move some of its functions or assets to another bank` +
          (inBank.length ? `. Functions in bank ${n} (bytes): ${inBank.sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(', ')}.` : '.'),
      });
    }
  }
  return null;
}

/**
 * Choose functions to move out of the always-visible region: the largest first (one stub buys the most room, and big
 * functions are rarely the ones called thousands of times a frame). Bank 2 fills first, then banks above the ones
 * the program names itself. Returns Map(name -> bank), or null if even that cannot make it fit.
 */
function planBanks(meta, sizes, need, usedBanks, already, slack = 0) {
  const plan = new Map(already || []);
  const room = new Map();           // bank -> bytes left
  const cap = BANK - slack;         // spare room per bank: sizes are estimates, and stubs and alignment add a little
  for (const [name, bank] of plan) room.set(bank, (room.get(bank) ?? cap) - (sizes[name] || 0));
  if (!room.has(2)) room.set(2, cap);
  let next = Math.max(3, ...usedBanks.map((b) => b + 1));
  const movable = Object.keys(meta).filter((n) => !meta[n].std && !meta[n].pin && meta[n].bank === null && !plan.has(n) && (sizes[n] || 0) > STUB * 2)
    .sort((x, y) => sizes[y] - sizes[x]);
  for (const name of movable) {
    if (need <= 0) break;
    const size = sizes[name];
    if (size > BANK) continue;
    let bank = [...room.keys()].sort((x, y) => x - y).find((b) => room.get(b) >= size);
    if (bank === undefined) { if (next > 127) continue; bank = next++; room.set(bank, cap); }
    room.set(bank, room.get(bank) - size);
    plan.set(name, bank);
    need -= size - STUB;
  }
  return need <= 0 ? plan : null;
}

/**
 * Compile VLY source text all the way to a cartridge image.
 *
 * Layout: the CPU always sees the first 16 KB of the image, plus one 8 KB bank at a time. A program that never
 * changes banks can treat the first 24 KB as one flat region (bank 2 shows at power-on). A program that does use
 * banks keeps its tables, strings and unbanked functions in the 16 KB, and when those do not fit the compiler moves
 * functions into banks by itself (see planBanks).
 * @param {string} source
 * @param {{filename?: string, readFile?: Function, nostd?: boolean}} [opts]
 * @returns {{bytes: Uint8Array, asm: string, symbols: object, warnings: string[], stats: object}}
 */
export function compileToCartridge(source, opts = {}) {
  // The packer works from estimated sizes; when a bank turns out a few bytes too full, plan again with more spare room per bank.
  let last;
  for (const slack of [0, 192, 640, 1536]) {
    try { return compileWithSlack(source, opts, slack); } catch (e) {
      last = e;
      if (!(e && e.message && /bank \d+ holds \d+ bytes, but a bank is/.test(e.message))) throw e;
    }
  }
  throw last;
}

function compileWithSlack(source, opts, slack) {
  const file = opts.filename || 'main.vly';
  let c = compile(source, opts);
  let plan = null;
  let a = null, asmError = null;
  const tryAssemble = () => {
    a = null; asmError = null;
    try { a = assemble(c.asm, { filename: 'generated.asm' }); } catch (e) { if (e instanceof AsmError) asmError = e; else throw e; }
  };
  const measure = () => (a ? { flatBytes: a.symbols.__flat_end.offset, sizes: functionSizes(a.symbols, a.symbols.__flat_end.offset) } : measureFlat(c.asm));
  const explain = (m, limit) => {
    const meta = c.stats.fnMeta;
    const stay = Object.entries(m.sizes).filter(([k]) => meta[k] && meta[k].bank === null).sort((x, y) => y[1] - x[1]).slice(0, 8)
      .map(([k, v]) => `${k} ${v}${meta[k].std ? ' (standard library)' : meta[k].pin ? ` (${meta[k].pin})` : v > BANK ? ' (bigger than one 8192-byte bank: split it into smaller functions)' : ''}`).join(', ');
    const code = Object.entries(m.sizes).filter(([k]) => !meta[k] || meta[k].bank === null).reduce((x, [, v]) => x + v, 0);
    return new CompileError({
      file, line: 1, col: 1,
      message: `the part of the program that must always be visible takes ${m.flatBytes} bytes, but that region is ${limit} (over by ${m.flatBytes - limit}). ` +
        `It holds tables, strings and unbanked assets (${Math.max(0, m.flatBytes - 16 - code)} bytes here) and every function the compiler cannot move into a bank by itself (${code} bytes). ` +
        `Move art and maps to a bank (tileset art bank auto = "art.tiles"; lets the compiler choose the bank), shorten text, or split the functions named below so the bulk of them can move. ` +
        `Biggest functions still in the region (bytes): ${stay}.`,
    });
  };

  tryAssemble();
  for (let round = 0; round < 5; round++) {
    const m = measure();
    if (!m) break;                                   // could not even measure: report the assembler's message below
    // A program that never touches the bank window may run straight through bank 2 (24 KB flat).
    const limit = c.stats.usesBanks || plan ? FIXED : FLAT;
    if (m.flatBytes <= limit && a) break;
    if (m.flatBytes <= limit) break;                 // fits, but something else failed to assemble
    // Too big: move functions into banks. (Even a program without banks gets this once it passes 24 KB.)
    const usedBanks = [...c.asm.matchAll(/^\.bank (\d+)$/gm)].map((x) => Number(x[1])).filter((b) => !plan || ![...plan.values()].includes(b));
    const next = planBanks(c.stats.fnMeta, m.sizes, m.flatBytes - FIXED + 32 * round, usedBanks, plan, slack);
    if (!next) throw explain(m, FIXED);
    plan = next;
    c = compile(source, { ...opts, autoBank: plan });
    tryAssemble();
  }
  if (!a) {
    const full = /bank boundary|\.bank \d+ is behind/.test(asmError.message) ? fullBankError(c.asm, file) : null;
    if (full) throw full;
    const m = measureFlat(c.asm);
    if (m && m.flatBytes > FIXED && (c.stats.usesBanks || plan)) throw explain(m, FIXED);
    const err = new Error(`internal compiler error (generated assembly failed to assemble); please report this.\n${asmError.message}`);
    err.asm = c.asm;
    throw err;
  }
  const flatEnd = a.symbols.__flat_end;
  const sizes = functionSizes(a.symbols, flatEnd.offset);
  const banked = c.stats.usesBanks || !!plan;
  return {
    bytes: a.bytes, asm: c.asm, symbols: a.symbols, warnings: [...c.warnings, ...a.warnings], listing: a.listing,
    stats: {
      ...c.stats, bytes: a.bytes.length, functionBytes: sizes,
      flatBytes: flatEnd.offset, flatLimit: banked ? FIXED : FLAT,
      bankBytes: Object.fromEntries(Object.entries(a.symbols).filter(([k]) => /^__bank_\d+$/.test(k)).map(([k, v]) => [k.slice(7), a.symbols[k + '_end'].offset - v.offset])),
      autoBanked: plan ? Object.fromEntries(plan) : {},
    },
  };
}
