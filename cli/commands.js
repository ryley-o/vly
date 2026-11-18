// vly command implementations. Each command returns {text, data, exitCode?}; the entry point prints text,
// or {ok, ...data} as JSON when --json is given.

import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { buildFile, AsmError } from '../src/tools/build.js';
import { runCartridge, asciiScreen } from '../src/tools/run.js';
import { encodePNG, decodePNG, upscale } from '../src/tools/png.js';
import { encodeGif } from '../src/tools/gif.js';
import { filmstrip, evenFrames } from '../src/tools/filmstrip.js';
import { wavFromFloat } from '../src/core/audio.js';
import { parseUntil } from '../src/tools/names.js';
import { profileCartridge, profileFrames } from '../src/tools/profile.js';
import { checkCartridge } from '../src/tools/check.js';
import { parseTilesText, tilesFromRGBA, tilesToRGBA, pngToTilesText } from '../src/tools/tiles.js';
import { runSpecFile, findSpecFiles } from '../src/tools/testrunner.js';
import { disassemble } from '../src/asm/disasm.js';
import { OPS } from '../src/core/isa.js';
import { validateCartridge } from '../src/core/machine.js';
import { sha256Hex } from '../src/core/sha256.js';
import { resolveAddr } from '../src/tools/names.js';
import * as C from '../src/core/constants.js';

export class CliError extends Error {
  constructor(message, exitCode = 1, details = null) {
    super(message);
    this.exitCode = exitCode;
    if (details) this.details = details;
  }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hex = (v, w = 4) => '0x' + v.toString(16).toUpperCase().padStart(w, '0');
const int = (v) => (/^0x/i.test(String(v)) ? parseInt(v, 16) : parseInt(v, 10));

function loadProjectConfig(dir = process.cwd()) {
  const p = path.join(dir, 'vly.json');
  if (!fs.existsSync(p)) return null;
  try { return { ...JSON.parse(fs.readFileSync(p, 'utf8')), _dir: dir }; } catch (e) { throw new CliError(`vly.json is not valid JSON: ${e.message}`); }
}

function defaultEntry() {
  const cfg = loadProjectConfig();
  if (cfg?.entry) return path.resolve(cfg._dir, cfg.entry);
  for (const c of ['src/main.vly', 'main.vly', 'src/main.asm', 'main.asm']) if (fs.existsSync(c)) return path.resolve(c);
  throw new CliError('no entry file given and none found (looked for vly.json "entry", src/main.vly, main.vly, src/main.asm, main.asm)');
}

function formatBuildError(e) {
  if (e instanceof AsmError) return new CliError(e.message, 1, { errors: e.errors });
  if (e.errors && Array.isArray(e.errors)) return new CliError(e.message, 1, { errors: e.errors });
  return e;
}

async function build(entry, opts) {
  try { return await buildFile(entry, opts); } catch (e) { throw formatBuildError(e); }
}

async function loadCart(target) {
  if (!target) throw new CliError('missing cartridge (a .vlc file, or a .vly/.asm source to build and run)');
  if (!fs.existsSync(target)) throw new CliError(`no such file: ${target}`);
  if (/\.(vly|asm)$/i.test(target)) {
    const b = await build(target);
    return { rom: b.bytes, built: b };
  }
  const rom = new Uint8Array(fs.readFileSync(target));
  const problems = validateCartridge(rom);
  if (problems.length) throw new CliError(`${target} is not a valid cartridge: ${problems.join('; ')}`);
  return { rom };
}

function sizeReport(size) {
  const banks = Math.ceil(size / C.BANK_SIZE);
  return { bytes: size, max: C.MAX_ROM_SIZE, percent: +((size / C.MAX_ROM_SIZE) * 100).toFixed(2), banks, chunks: Math.ceil(size / 24575) };
}

function writePng(file, rgba, scale) {
  const up = upscale(C.SCREEN_W, C.SCREEN_H, rgba, scale);
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, encodePNG(up.width, up.height, up.rgba, 4));
}

// --input SCRIPT and/or --input-file PATH (a file holding a long or recorded input script)
function inputText(args) {
  const parts = [];
  if (args.flags.input) parts.push(String(args.flags.input));
  if (args.flags['input-file']) parts.push(fs.readFileSync(path.resolve(String(args.flags['input-file'])), 'utf8'));
  return parts.join('\n');
}

export const commands = {
  build: {
    help: 'vly build [entry] [-o out.vlc] [--asm] [--listing] [--symbols] [--json]\n  Compile a .vly (or assemble a .asm) file into a cartridge.',
    async run(args) {
      const entry = args._[0] ? path.resolve(args._[0]) : defaultEntry();
      const b = await build(entry);
      const cfg = loadProjectConfig();
      let out = args.flags.out || (cfg?.out ? path.resolve(cfg._dir, cfg.out) : path.join('build', path.basename(entry).replace(/\.[^.]+$/, '') + '.vlc'));
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, b.bytes);
      const problems = validateCartridge(b.bytes);
      const mapFile = out.replace(/\.vlc$/, '') + '.map.json';
      const fnInfo = {};
      for (const [k, sy] of Object.entries(b.symbols || {})) if (sy.kind === 'label' && k.startsWith('f_') && !k.endsWith('__ret')) fnInfo[k.slice(2)] = { addr: sy.addr, bytes: b.stats?.functionBytes?.[k.slice(2)] };
      if (args.flags.asm && b.asm) fs.writeFileSync(out.replace(/\.vlc$/, '') + '.asm', b.asm);
      fs.writeFileSync(mapFile, JSON.stringify({ size: b.bytes.length, ram: b.stats?.ram || {}, functions: fnInfo }, null, 2));
      const symbols = Object.fromEntries(Object.entries(b.symbols || {}).filter(([k, s]) => s.kind === 'label' && !/^L\d+$/.test(k) && !k.endsWith('__ret')).map(([k, s]) => [k, s.addr]));
      const data = { out, map: mapFile, size: sizeReport(b.bytes.length), warnings: b.warnings || [], problems, kind: b.kind, ram: b.stats?.ram, functionBytes: b.stats?.functionBytes, flatBytes: b.stats?.flatBytes, flatLimit: b.stats?.flatLimit, bankBytes: b.stats?.bankBytes, autoBanked: b.stats?.autoBanked, ...(args.flags.symbols ? { symbols } : {}) };
      let text = `built ${out} (${b.bytes.length} bytes, ${data.size.banks} bank${data.size.banks === 1 ? '' : 's'}, ${data.size.percent}% of 1 MB)`;
      if (b.stats?.flatBytes) {
        // how close the program is to the limits that matter
        const lim = b.stats.flatLimit || 24576;
        const moved = Object.entries(b.stats.autoBanked || {});
        const banks = Object.entries(b.stats.bankBytes || {}).map(([n, v]) => `bank ${n}: ${v}/8192`).join(', ');
        text += `\n${lim === 16384 ? 'always-visible region' : 'flat region'}: ${b.stats.flatBytes}/${lim} bytes (${Math.round(b.stats.flatBytes / lim * 100)}%)${banks ? '; ' + banks : ''}`;
        if (moved.length) text += `\nmoved to banks to make room: ${moved.map(([n, bk]) => `${n} (${bk})`).join(', ')}`;
      }
      for (const w of data.warnings) text += `\nwarning: ${w}`;
      for (const p of problems) text += `\nPROBLEM: ${p}`;
      if (args.flags.symbols) {
        text += '\n' + Object.entries(symbols).map(([k, v]) => `  ${hex(v)}  ${k}`).join('\n');
        if (b.stats?.ram) text += '\nRAM:\n' + Object.entries(b.stats.ram).map(([k, r]) => `  ${hex(r.addr)}  ${k} (${r.type}, ${r.bytes} bytes)`).join('\n');
      }
      if (args.flags.listing && b.listing) text += '\n' + b.listing.map((l) => `${hex(l.addr)}  ${Array.from(l.bytes, (x) => x.toString(16).padStart(2, '0')).join(' ').padEnd(12)}  ${l.text}`).join('\n');
      return { text, data, ok: problems.length === 0, exitCode: problems.length ? 1 : 0 };
    },
  },

  run: {
    help: 'vly run <cart.vlc|source> [--frames N] [--input SPEC] [--save file] [--save-out file]\n  [--screenshot file.png] [--scale N] [--shots 0,30,60 --out-dir dir] [--ascii] [--mem ADDR:LEN,...] [--json]\n  [--watch var,var] [--until state==6] [--worst N] [--profile] [--trace FRAME[:LIMIT]|init[:LIMIT]] [--filmstrip N --filmstrip-out strip.png]\n  [--gif out.gif [--gif-every 2] [--gif-scale 2]] [--wav out.wav]\n  Run a cartridge headlessly. Input SPEC example: "RIGHT@0-59,A+RIGHT@60-79,START@100".',
    async run(args) {
      const { rom, built } = await loadCart(args._[0]);
      let ram = built?.stats?.ram;
      if (!ram && /\.vlc$/i.test(args._[0] || '')) {
        const mf = args._[0].replace(/\.vlc$/i, '.map.json');
        if (fs.existsSync(mf)) { try { ram = JSON.parse(fs.readFileSync(mf, 'utf8')).ram; } catch { /* ignore */ } }
      }
      let fnTable = [];
      if (built?.symbols) fnTable = Object.entries(built.symbols).filter(([k, sy]) => sy.kind === 'label' && /^f_/.test(k) && !k.endsWith('__ret')).map(([k, sy]) => ({ name: k.slice(2), addr: sy.addr }));
      else if (/\.vlc$/i.test(args._[0] || '')) {
        const mf = args._[0].replace(/\.vlc$/i, '.map.json');
        if (fs.existsSync(mf)) { try { fnTable = Object.entries(JSON.parse(fs.readFileSync(mf, 'utf8')).functions || {}).map(([name, f]) => ({ name, addr: f.addr })); } catch { /* ignore */ } }
      }
      fnTable.sort((a, b) => a.addr - b.addr);
      const symbolize = (pc) => { let best = null; for (const f of fnTable) if (f.addr <= pc) best = f; else break; return best ? `${best.name}+0x${(pc - best.addr).toString(16)}` : ''; };
      const frames = int(args.flags.frames ?? 60);
      const scale = int(args.flags.scale ?? 4);
      const shotFrames = new Set();
      let stripFrames = null;
      if (args.flags.filmstrip && args.flags.filmstrip !== true) { stripFrames = evenFrames(frames, int(args.flags.filmstrip)); for (const f of stripFrames) shotFrames.add(f); }
      else if (args.flags['filmstrip-out'] && args.flags.shots) stripFrames = String(args.flags.shots).split(',').map(int);
      if (args.flags.screenshot) shotFrames.add(frames);
      if (args.flags.shots) for (const s of String(args.flags.shots).split(',')) shotFrames.add(int(s));
      let mem = [];
      try {
        mem = args.flags.mem ? String(args.flags.mem).split(',').map((s) => { const [a, l] = s.split(':'); const r = ram?.[a.replace(/\[.*$/, '')]; return { name: a, addr: resolveAddr(a, ram || {}), len: int(l || (r && !/\[/.test(a) ? String(r.bytes) : '2')) }; }) : [];
      } catch (e) { throw new CliError(e.message); }
      let save = null;
      if (args.flags.save) save = new Uint8Array(fs.readFileSync(args.flags.save));
      let watch = [];
      try {
        if (args.flags.watch) watch = String(args.flags.watch).split(',').map((n) => ({ name: n, addr: resolveAddr(n, ram || {}), bytes: ram?.[n.replace(/\[.*$/, '')]?.type === 'byte[]' ? 1 : 2 }));
      } catch (e) { throw new CliError(e.message); }
      let trace;
      if (args.flags.trace) {
        const [fr, lim] = String(args.flags.trace).split(':');
        trace = { frame: fr === 'init' ? 'init' : int(fr), limit: lim ? int(lim) : 200 };
      }
      let until = null;
      if (args.flags.until) { try { until = parseUntil(args.flags.until, ram || {}); } catch (e) { throw new CliError(e.message); } }
      const gifEvery = args.flags.gif ? int(args.flags['gif-every'] ?? 2) : 0;
      let r;
      try {
        r = runCartridge(rom, { frames, until, input: inputText(args), save, screenshotFrames: [...shotFrames], mem, watch, trace, worst: args.flags.worst ? int(args.flags.worst) : 5, capture: gifEvery ? { every: gifEvery, max: 900 } : undefined, audio: !!args.flags.wav });
      } catch (e) { throw new CliError(e.message); }
      const files = [];
      if (args.flags.screenshot) {
        writePng(args.flags.screenshot, r.screenshots.get(r.stoppedAt ?? frames), scale);
        files.push(args.flags.screenshot);
      }
      if (args.flags.shots) {
        const dir = args.flags['out-dir'] || '.';
        for (const f of r.screenshots.keys()) {
          if (f === frames && args.flags.screenshot && !String(args.flags.shots).split(',').map(int).includes(f)) continue;
          const file = path.join(dir, `frame_${String(f).padStart(4, '0')}.png`);
          writePng(file, r.screenshots.get(f), scale);
          files.push(file);
        }
      }
      if (stripFrames && stripFrames.length) {
        const out = args.flags['filmstrip-out'] || 'filmstrip.png';
        const fs_ = stripFrames.filter((f) => r.screenshots.has(f));
        const missing = stripFrames.filter((f) => !r.screenshots.has(f));
        if (missing.length) throw new CliError(`internal: no screenshot for frames ${missing.join(',')}`);
        const sheet = filmstrip(fs_.map((f) => ({ label: `FRAME ${f}`, rgba: r.screenshots.get(f) })), { cols: Math.min(4, fs_.length), scale: Math.max(1, Math.floor(scale / 2)) });
        fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
        fs.writeFileSync(out, encodePNG(sheet.width, sheet.height, sheet.rgba, 4));
        files.push(out);
      }
      if (args.flags.gif) {
        const k = int(args.flags['gif-scale'] ?? 2);
        const frs = r.capturedFrames.map((f) => upscale(160, 144, f, k).rgba);
        const gif = encodeGif(frs, { width: 160 * k, height: 144 * k, delayCs: Math.max(2, Math.round((100 * gifEvery) / 60)) });
        fs.mkdirSync(path.dirname(path.resolve(args.flags.gif)), { recursive: true });
        fs.writeFileSync(args.flags.gif, gif);
        files.push(args.flags.gif);
      }
      if (args.flags.wav) {
        fs.mkdirSync(path.dirname(path.resolve(args.flags.wav)), { recursive: true });
        fs.writeFileSync(args.flags.wav, wavFromFloat(r.audio));
        files.push(args.flags.wav);
      }
      if (args.flags['save-out'] && r.saves.length) {
        fs.writeFileSync(args.flags['save-out'], r.saves[r.saves.length - 1].bytes);
        files.push(args.flags['save-out']);
      }
      const faultList = Object.entries(r.faults).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n} (first at frame ${r.firstFault[k]})`);
      const data = {
        frames: r.stoppedAt ?? frames, stoppedAt: r.stoppedAt, init: r.init, cycles: r.cycles, overruns: r.overruns, faults: r.faults, firstFault: r.firstFault,
        worstFrames: r.worstFrames, frameHash: r.frameHash, stateHash: r.stateHash, saveRequests: r.saves.length, files,
        mem: r.mem.map((m, i) => ({ name: mem[i].name, addr: hex(m.addr), bytes: m.bytes, words: m.bytes.length >= 2 ? Array.from({ length: m.bytes.length >> 1 }, (_, k) => m.bytes[k * 2] | (m.bytes[k * 2 + 1] << 8)) : undefined })),
      };
      if (r.init.overran) faultList.unshift(`init() ran out of its ${r.init.budget}-cycle budget and was cut off`);
      let text = `ran ${r.stoppedAt ?? frames} frames: ${faultList.length ? 'FAULTS' : 'ok'}${until ? (r.stoppedAt !== null ? ` (stopped: ${args.flags.until} held)` : ` (${args.flags.until} never held in ${frames} frames)`) : ''}\n`;
      text += `init: ${r.init.cycles} cycles (budget ${r.init.budget})\n`;
      text += `cycles/frame: max ${r.cycles.max}, avg ${r.cycles.avg} (budget ${r.cycles.budget})${r.cycles.max > 80000 ? '  WARNING: over 80,000 in one frame: little headroom' : ''}\n`;
      if (args.flags.worst || r.cycles.max > 80000) text += `worst frames: ${r.worstFrames.map((w) => `${w.frame} (${w.cycles})`).join(', ')}   (see docs/design.md for what is expensive)\n`;
      if ((args.flags.worst || r.cycles.max > 80000) && built?.symbols) {      // with the source we can say WHICH code spent them
        const shown = r.worstFrames.slice(0, 3);
        try {
          for (const p of profileFrames(rom, built.symbols, shown.map((w) => w.frame), { input: inputText(args), save })) text += `  frame ${p.frame}: ${p.functions.map((f) => `${f.name} ${f.cycles}`).join(', ')}\n`;
        } catch { /* the frame list is advice; never fail the run for it */ }
      }
      text += `faults: ${faultList.length ? faultList.join(', ') : 'none'}\n`;
      text += `frame hash: ${r.frameHash}\nstate hash: ${r.stateHash}\n`;
      if (r.saves.length) text += `save requests: ${r.saves.length}\n`;
      r.mem.forEach((m, i) => { text += `mem ${mem[i].name} @ ${hex(m.addr)}: ${m.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}${m.bytes.length === 2 ? `  (= ${m.bytes[0] | (m.bytes[1] << 8)})` : ''}\n`; });
      if (watch.length) {
        text += `timeline of ${watch.map((w) => w.name).join(', ')} (frame -1 = after init):\n`;
        for (const c of r.changes) text += `  frame ${String(c.frame).padStart(4)}: ${c.name} ${c.from === undefined ? '' : c.from + ' -> '}${c.to}\n`;
        data.timeline = r.changes;
      }
      if (trace) {
        text += `instruction trace of ${trace.frame === 'init' ? 'init' : 'frame ' + trace.frame} (first ${r.trace.length}):\n`;
        for (const t of r.trace) text += `  ${t.pc.toString(16).toUpperCase().padStart(4, '0')} ${symbolize(t.pc).padEnd(18)} ${t.text.padEnd(24)} r0=${t.regs[0].toString(16).padStart(4, '0')} r1=${t.regs[1].toString(16).padStart(4, '0')} r2=${t.regs[2].toString(16).padStart(4, '0')} r3=${t.regs[3].toString(16).padStart(4, '0')} fp=${t.regs[14].toString(16).padStart(4, '0')} sp=${t.regs[15].toString(16).padStart(4, '0')}\n`;
        data.trace = r.trace.map((t) => ({ pc: t.pc, symbol: symbolize(t.pc), instruction: t.text, r0: t.regs[0], r1: t.regs[1], r2: t.regs[2], r3: t.regs[3] }));
      }
      if (args.flags.profile) {
        if (!built?.symbols) throw new CliError('--profile needs the source (vly run src/main.vly --profile), because a .vlc does not carry function names');
        const pr = profileCartridge(rom, built.symbols, { frames: Math.min(frames, 300), input: inputText(args) });
        data.profile = pr;
        text += `where the cycles go (average over ${pr.frames} frames, ${pr.avg_cycles_per_frame} per frame):\n`;
        for (const f of pr.functions) text += `  ${String(f.cycles_per_frame).padStart(7)}  ${String(f.percent).padStart(5)}%  ${f.name}\n`;
      }
      for (const f of files) text += `wrote ${f}\n`;
      if (args.flags.ascii) {
        const final = r.machine.renderRGBA();
        text += asciiScreen(final) + '\n';
        data.ascii = asciiScreen(final);
      }
      return { text, data, ok: faultList.length === 0, exitCode: faultList.length ? 3 : 0 };
    },
  },

  play: {
    help: 'vly play <cart or source> [--scale N]\n  Play a cartridge: opens the native player if it is built (make -C c player), otherwise exports a one-file HTML game and opens it in your browser.',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const { spawnSync } = await import('node:child_process');
      const os = await import('node:os');
      const native = path.join(ROOT, 'c', 'build', 'vly-player');
      const tmp = path.join(os.tmpdir(), `vly-play-${process.pid}`);
      fs.mkdirSync(tmp, { recursive: true });
      if (fs.existsSync(native)) {
        const cart = path.join(tmp, 'game.vlc');
        fs.writeFileSync(cart, rom);
        const r = spawnSync(native, [cart, '--scale', String(args.flags.scale ?? 4), '--save', args._[0].replace(/\.[^.]+$/, '') + '.sav'], { stdio: 'inherit' });
        return { text: '', data: { player: 'native' }, exitCode: r.status || 0 };
      }
      const { exportHtml } = await import('../src/export/index.js');
      const file = path.join(tmp, 'game.html');
      fs.writeFileSync(file, exportHtml(rom, { title: path.basename(args._[0]).replace(/\.[^.]+$/, '') }));
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      const r = spawnSync(opener, [file], { stdio: 'ignore', shell: process.platform === 'win32' });
      return { text: `${r.status === 0 ? 'opened' : 'wrote'} ${file}${r.status === 0 ? '' : ' (open it in a browser)'}`, data: { player: 'html', file } };
    },
  },

  watch: {
    help: 'vly watch [entry] [--frames N] [--input SPEC]\n  Rebuild whenever a source file changes and print a one-line result (errors, size, cycles, faults). Ctrl+C to stop.',
    async run(args) {
      const entry = args._[0] ? path.resolve(args._[0]) : defaultEntry();
      const dir = path.dirname(entry);
      const roots = [dir, path.join(dir, '..')].filter((d, i, a) => fs.existsSync(d) && a.indexOf(d) === i);
      const check = async () => {
        const t = new Date().toLocaleTimeString();
        try {
          const b = await buildFile(entry);
          const r = runCartridge(b.bytes, { frames: int(args.flags.frames ?? 60), input: inputText(args) });
          const faults = Object.entries(r.faults).filter(([, n]) => n > 0).map(([k]) => k);
          console.log(`${t}  ok  ${b.bytes.length} bytes, max ${r.cycles.max} cycles/frame${faults.length ? ', FAULTS: ' + faults.join(' ') : ''}${b.warnings?.length ? ', ' + b.warnings.length + ' warning(s)' : ''}`);
        } catch (e) { console.log(`${t}  ERROR\n${e.message}`); }
      };
      await check();
      let timer = null;
      for (const d of roots) fs.watch(d, { recursive: true }, (_, f) => { if (f && /\.(vly|asm|tiles|map|json)$/.test(f)) { clearTimeout(timer); timer = setTimeout(check, 150); } });
      console.log(`watching ${roots.join(', ')} (Ctrl+C to stop)`);
      await new Promise(() => {});
      return {};
    },
  },

  export: {
    help: 'vly export <cart or source> [--html out.html] [--title "Name"]\n  Package a cartridge as ONE self-contained HTML file (emulator, cartridge, touch controls, sound, saves).',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const { exportHtml } = await import('../src/export/index.js');
      const base = path.basename(args._[0]).replace(/\.[^.]+$/, '');
      const out = args.flags.html || args.flags.out || `${base}.html`;
      const title = args.flags.title || base;
      const html = exportHtml(rom, { title, description: args.flags.description });
      fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
      fs.writeFileSync(out, html);
      return { text: `wrote ${out} (${(html.length / 1024).toFixed(0)} KB). Open it in any browser, or host it anywhere as a static file.`, data: { out, bytes: html.length, title } };
    },
  },

  info: {
    help: 'vly info <cart> [--json]\n  Show a cartridge header and size.',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const problems = validateCartridge(rom);
      const init = rom[4] | (rom[5] << 8), frame = rom[6] | (rom[7] << 8);
      const data = {
        size: sizeReport(rom.length), specVersion: rom[2], initVector: hex(init), frameVector: hex(frame),
        sha256: sha256Hex(rom), problems,
      };
      const text = `size: ${rom.length} bytes (${data.size.percent}% of 1 MB, ${data.size.banks} banks, ${data.size.chunks} chunk contract${data.size.chunks === 1 ? '' : 's'})\n` +
        `spec version: ${rom[2]}\ninit: ${hex(init)}  frame: ${hex(frame)}\nsha256: ${data.sha256}\n` +
        (problems.length ? `PROBLEMS: ${problems.join('; ')}\n` : 'valid header\n');
      return { text, data, ok: problems.length === 0 };
    },
  },

  disasm: {
    help: 'vly disasm <cart> [--start ADDR] [--end ADDR]\n  Disassemble (linear sweep). Data regions show up as .db lines.',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const start = args.flags.start ? int(args.flags.start) : 16;
      const end = args.flags.end ? int(args.flags.end) : Math.min(rom.length, 16 + 512);
      const lines = disassemble(rom, { start, end });
      return { text: lines.join('\n'), data: { lines } };
    },
  },

  test: {
    help: 'vly test [paths...] [--update] [--accept]\n  Run test specs: vly.json "tests" and *.test.json files. --update records "auto" hashes. --accept also takes the new picture/state hash of\n  tests whose hash changed (after a change you made on purpose and looked at); a test that fails for any other reason is never accepted.',
    async run(args) {
      const targets = args._.length ? args._ : ['.'];
      const files = findSpecFiles(targets);
      if (!files.length) throw new CliError('no test specs found (vly.json with "tests", or *.test.json files)');
      let pass = 0, fail = 0;
      const out = [];
      const all = [];
      for (const f of files) {
        const r = await runSpecFile(f, { update: !!args.flags.update || !!args.flags.accept, accept: !!args.flags.accept });
        all.push(r);
        for (const t of r.results) {
          if (t.ok) pass++; else fail++;
          out.push(`${t.ok ? 'PASS' : 'FAIL'}  ${f} :: ${t.name}`);
          for (const m of t.failures) out.push(`      ${m}`);
          if (t.note) out.push(`      ${t.note}`);
        }
      }
      out.push(`\n${pass} passed, ${fail} failed`);
      return { text: out.join('\n'), data: { pass, fail, files: all }, ok: fail === 0, exitCode: fail ? 2 : 0 };
    },
  },

  check: {
    help: 'vly check [cart.vlc|source] [--frames N] [--input-file path.input [--save file.sav]] [--json]\n  Quality gates: plays the game with no input, with START, and with a careless player for N frames (default 7200, two\n  minutes), and reports faults, cycle budget, whether it is alive, sound, sprite use, text covered by sprites and variety.\n  Every WARN is a bug to fix or a decision to explain; any FAIL means it is not finished. Exit code 1 on a FAIL.',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const frames = int(args.flags.frames ?? 7200);
      if (!(frames >= 600 && frames <= 18000)) throw new CliError('--frames must be 600 to 18000');
      const script = inputText(args) || null;                              // --input / --input-file: a recorded path (a bot's winning run) to check as well
      const save = args.flags.save ? new Uint8Array(fs.readFileSync(args.flags.save)) : null;
      const r = checkCartridge(rom, { frames, script, save });
      const mark = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
      let text = `quality check (${Math.round(frames / 60)} s of careless play): ${r.verdict.toUpperCase()}, ${r.summary}\n`;
      for (const c of r.checks) text += `  ${mark[c.status]}  ${c.id}: ${c.message}${c.hint ? `\n        -> ${c.hint}` : ''}\n`;
      return { text, data: r, ok: r.ok, exitCode: r.ok ? 0 : 1 };
    },
  },
  import: {
    help: 'vly import <picture.png> [--name hero] [--cell 16x16] [--tile] [-o hero.tiles]\n  Turn a PNG (any size, any colours) into .tiles art. More colours than the hardware allows are reduced by brightness; fully\n  transparent pixels become colour 0. --cell cuts the picture into sprites of that pixel size (hero_0, hero_1, ...), --tile makes\n  8x8 background tiles instead of sprites. Prints the palette to set. Preview with: vly tiles hero.tiles --sheet preview.png',
    async run(args) {
      const file = args._[0];
      if (!file || !fs.existsSync(file)) throw new CliError('give a .png file');
      const img = decodePNG(fs.readFileSync(file));
      const cell = args.flags.cell ? String(args.flags.cell).split('x').map(Number) : null;
      if (cell && (cell.length !== 2 || cell.some((n) => !(n > 0)))) throw new CliError('--cell needs a size like 16x16');
      let r;
      try { r = pngToTilesText(img.width, img.height, img.rgba, { name: args.flags.name || path.basename(file).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]/g, '_'), cell, kind: args.flags.tile ? 'tile' : 'sprite' }); }
      catch (e) { throw new CliError(e.message); }
      const pal = r.palette.map((c) => '#' + c.toString(16).padStart(6, '0')).join(' ');
      if (args.flags.out) { fs.writeFileSync(args.flags.out, r.text); return { text: `wrote ${args.flags.out}: ${r.sprites} ${args.flags.tile ? 'tile' : 'sprite'}(s), ${r.colours} colours${r.colours > (args.flags.tile ? 4 : 3) ? ' reduced' : ''}; palette (light to dark): ${pal}`, data: { out: args.flags.out, colours: r.colours, palette: r.palette } }; }
      return { text: r.text, data: { colours: r.colours, palette: r.palette } };
    },
  },
  tiles: {
    help: 'vly tiles <file.tiles|file.png|file.bin> [-o out.bin] [--sheet preview.png] [--scale N] [--colors c0,c1,c2,c3] [--raw] [--json]\n  Convert tile art to the 2bpp binary format, or preview it. For a .tiles file the sheet shows every tile and sprite\n  assembled with its name (color 0 as a checkerboard); --colors previews with real palette colors (hex, e.g. 9bd,fff,8a5,321);\n  --raw gives the plain grid of 8x8 tiles.',
    async run(args) {
      const file = args._[0];
      if (!file || !fs.existsSync(file)) throw new CliError('give a .tiles, .png or .bin file');
      let data, info = {}, parsed = null;
      if (/\.tiles$/i.test(file) || /\.txt$/i.test(file)) {
        const t = parseTilesText(fs.readFileSync(file, 'utf8'), path.basename(file));
        data = t.data; info = { count: t.count, names: t.names }; parsed = t;
      } else if (/\.png$/i.test(file)) {
        const img = decodePNG(fs.readFileSync(file));
        const t = tilesFromRGBA(img.width, img.height, img.rgba);
        data = t.data; info = { count: t.count, palette: t.palette.map((c) => '#' + c.toString(16).padStart(6, '0')), tilesWide: t.tilesWide, tilesHigh: t.tilesHigh };
      } else {
        data = new Uint8Array(fs.readFileSync(file)); info = { count: Math.floor(data.length / 16) };
      }
      const files = [];
      if (args.flags.out) { fs.writeFileSync(args.flags.out, data); files.push(args.flags.out); }
      if (args.flags.sheet) {
        const colors = args.flags.colors ? String(args.flags.colors).split(',').map((c) => parseInt(c.replace('#', ''), 16)) : undefined;
        if (colors && (colors.length !== 4 || colors.some(Number.isNaN))) throw new CliError('--colors needs four hex colors, e.g. --colors 9bd,fff,8a5,321 or 99bbdd,ffffff,88aa55,332211');
        const palette = colors && colors.map((c, i) => (String(args.flags.colors).split(',')[i].replace('#', '').length === 3 ? ((c >> 8) * 17 << 16) | (((c >> 4) & 15) * 17 << 8) | ((c & 15) * 17) : c));
        if (parsed && parsed.names.length && !args.flags.raw) {
          // named art: every tile and sprite assembled and labelled
          const { tilesContactSheet } = await import('../src/tools/tiles.js');
          const { GLYPHS } = await import('../src/core/font.js');
          const s = tilesContactSheet(parsed, { scale: int(args.flags.scale ?? 6), glyphs: GLYPHS, ...(palette ? { palette } : {}) });
          fs.writeFileSync(args.flags.sheet, encodePNG(s.width, s.height, s.rgba, 4));
        } else {
          const s = tilesToRGBA(data, 16, palette);
          const up = upscale(s.width, s.height, s.rgba, int(args.flags.scale ?? 4));
          fs.writeFileSync(args.flags.sheet, encodePNG(up.width, up.height, up.rgba, 4));
        }
        files.push(args.flags.sheet);
      }
      let text = `${info.count} tiles (${data.length} bytes)`;
      if (info.names) text += '\n' + info.names.map((n) => `  ${n.name}: tile ${n.index}${n.w * n.h > 1 ? ` (${n.w}x${n.h})` : ''}`).join('\n');
      if (info.palette) text += `\npalette (light to dark): ${info.palette.join(' ')}`;
      for (const f of files) text += `\nwrote ${f}`;
      return { text, data: { ...info, bytes: data.length, files } };
    },
  },

  isa: {
    help: 'vly isa [--json]\n  Print the instruction set.',
    async run() {
      const lines = OPS.map((o) => `${hex(o.op, 2)}  ${o.name.padEnd(5)} ${o.form.padEnd(12)} ${String(o.cycles).padStart(2)}cy  ${o.desc}`);
      return { text: 'op    name  operands     cost  description\n' + lines.join('\n'), data: { ops: OPS } };
    },
  },

  docs: {
    help: 'vly docs [topic] [--all]\n  Print documentation. With no topic, lists topics.',
    async run(args) {
      const topics = docTopics();
      if (args.flags.all) {
        const text = Object.values(topics).map((p) => fs.readFileSync(p, 'utf8')).join('\n\n---\n\n');
        return { text, data: { topics: Object.keys(topics), text } };
      }
      const t = args._[0];
      if (!t) {
        const lines = Object.entries(topics).map(([k, p]) => `  ${k.padEnd(12)} ${firstHeading(p)}`);
        return { text: 'Documentation topics (vly docs <topic>):\n' + lines.join('\n'), data: { topics: Object.keys(topics) } };
      }
      const p = topics[t];
      if (!p) throw new CliError(`unknown topic "${t}". Topics: ${Object.keys(topics).join(', ')}`);
      const text = fs.readFileSync(p, 'utf8');
      return { text, data: { topic: t, text } };
    },
  },

  new: {
    help: 'vly new <dir> [--template hello|game|pong|battle|platformer|puzzle|shooter] [--force]\n  Create a starter project.',
    async run(args) {
      const dir = args._[0];
      if (!dir) throw new CliError('usage: vly new <dir>');
      const template = args.flags.template || 'hello';
      const tdir = path.join(ROOT, 'templates', template);
      if (!fs.existsSync(tdir)) {
        const have = fs.existsSync(path.join(ROOT, 'templates')) ? fs.readdirSync(path.join(ROOT, 'templates')).join(', ') : 'none';
        throw new CliError(`unknown template "${template}" (available: ${have})`);
      }
      if (fs.existsSync(dir) && fs.readdirSync(dir).length && !args.flags.force) throw new CliError(`${dir} already exists and is not empty (use --force)`);
      const name = path.basename(path.resolve(dir)).replace(/[^A-Za-z0-9_-]/g, '_');
      const written = [];
      const copy = (src, dst) => {
        fs.mkdirSync(dst, { recursive: true });
        for (const e of fs.readdirSync(src, { withFileTypes: true })) {
          const s = path.join(src, e.name), d = path.join(dst, e.name);
          if (e.isDirectory()) copy(s, d);
          else {
            const buf = fs.readFileSync(s);
            fs.writeFileSync(d, /\.(vly|json|md|tiles|asm|txt)$/.test(e.name) ? buf.toString('utf8').replaceAll('{{name}}', name) : buf);
            written.push(path.relative(dir, d));
          }
        }
      };
      copy(tdir, dir);
      return { text: `created ${dir} from template "${template}":\n  ${written.join('\n  ')}\nnext: edit src/ and the "tests" in vly.json (they check the template's own game, so they fail once you change it), then cd ${dir} && vly build && vly run build/${name}.vlc --frames 60 --screenshot shot.png`, data: { dir, template, files: written } };
    },
  },

  chunks: {
    help: 'vly chunks <cart> [--deployer 0xADDRESS] [--out-dir dir]\n  Plan on-chain storage: split the cartridge into chunk contracts and compute the ROM hash.\n  With --deployer (a ChunkDeployer address) also predict every chunk address; with --out-dir write plan.json, one\n  chunk_N.calldata per chunk (send it as-is to ChunkDeployer) and create-config.json (the chunk list for VlyFactory.create).',
    async run(args) {
      const { rom } = await loadCart(args._[0]);
      const { planChunks, deployBundle } = await import('../src/tools/chunks.js');
      const plan = planChunks(rom);
      const deployer = args.flags.deployer ? String(args.flags.deployer) : null;
      const bundle = deployBundle(rom, deployer);
      if (args.flags['out-dir']) {
        const dir = args.flags['out-dir'];
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 2));
        for (const c of bundle.chunks) fs.writeFileSync(path.join(dir, `chunk_${c.index}.calldata`), c.calldata + '\n');
        fs.writeFileSync(path.join(dir, 'create-config.json'), JSON.stringify({
          note: 'Fill in name, symbol, baseURI, maxSupply, mintPrice, mintStart, payout and royaltyBps, then call VlyFactory.create(config). See CONTRACTS.md.',
          name: '', symbol: '', baseURI: '',
          chunks: bundle.chunkAddresses || '(pass --deployer to predict the chunk addresses)',
          romSize: bundle.romSize, romHash: bundle.romHash, specVersion: bundle.specVersion,
          maxSupply: 0, mintPrice: '0', mintStart: 0, payout: '0x0000000000000000000000000000000000000000', royaltyBps: 0,
        }, null, 2) + '\n');
      }
      const text = `${plan.chunks.length} chunk contract(s), ${plan.romSize} bytes\nromHash (keccak256): ${plan.romHash}\n` +
        plan.chunks.map((c, i) => `  chunk ${i}: ${c.size} bytes, estimated deploy gas ${c.estimatedGas}${bundle.chunks[i].address ? `, address ${bundle.chunks[i].address}` : ''}`).join('\n');
      return { text, data: { ...plan, deployer, chunkAddresses: bundle.chunkAddresses } };
    },
  },

  mcp: {
    help: 'vly mcp\n  Start the Model Context Protocol server on stdio.',
    async run() {
      const { serveStdio } = await import('../src/mcp/server.js');
      await serveStdio();
      return {};
    },
  },

  serve: {
    help: 'vly serve [dir] [--port 8080]\n  Serve the website/playground (default: ./site/dist or the bundled site).',
    async run(args) {
      let dir = args._[0] || (fs.existsSync('site/dist') ? 'site/dist' : path.join(ROOT, 'site', 'dist'));
      if (!fs.existsSync(dir)) throw new CliError(`directory not found: ${dir} (run "npm run docs" in the vly repo to build the site)`);
      const port = int(args.flags.port ?? 8080);
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.vlc': 'application/octet-stream', '.md': 'text/markdown', '.svg': 'image/svg+xml' };
      const server = createServer((req, res) => {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        const base = path.resolve(dir);
        const f = path.resolve(base, '.' + p);
        if (!f.startsWith(base + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(res);
      });
      await new Promise((resolve) => server.listen(port, resolve));
      console.log(`serving ${dir} on http://localhost:${port}`);
      await new Promise(() => {});
      return {};
    },
  },
};

function docTopics() {
  const t = {};
  const add = (k, p) => { if (fs.existsSync(p)) t[k] = p; };
  add('overview', path.join(ROOT, 'README.md'));
  add('spec', path.join(ROOT, 'SPEC.md'));
  add('contracts', path.join(ROOT, 'CONTRACTS.md'));
  add('agents', path.join(ROOT, 'AGENTS.md'));
  add('roadmap', path.join(ROOT, 'ROADMAP.md'));
  const d = path.join(ROOT, 'docs');
  if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.md')) add(f.replace(/\.md$/, ''), path.join(d, f));
  return t;
}

function firstHeading(p) {
  const m = /^#\s+(.+)$/m.exec(fs.readFileSync(p, 'utf8'));
  return m ? m[1] : '';
}
