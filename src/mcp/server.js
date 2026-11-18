// A small Model Context Protocol server (stdio, newline-delimited JSON-RPC 2.0) so AI agents can build, run, test
// and *look at* VLY-1 cartridges. No dependencies. Start it with `vly mcp`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFile, buildText, AsmError } from '../tools/build.js';
import { runCartridge, asciiScreen } from '../tools/run.js';
import { checkCartridge } from '../tools/check.js';
import { encodePNG, upscale } from '../tools/png.js';
import { filmstrip, evenFrames } from '../tools/filmstrip.js';
import { parseTilesText, tilesToRGBA } from '../tools/tiles.js';
import { runSpecFile, findSpecFiles } from '../tools/testrunner.js';
import { resolveAddr } from '../tools/names.js';
import { validateCartridge } from '../core/machine.js';
import { OPS } from '../core/isa.js';
import * as C from '../core/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROTOCOL = '2024-11-05';

const codeOrPath = {
  path: { type: 'string', description: 'Path to a .vly, .asm or .vlc file (relative to the server working directory)' },
  code: { type: 'string', description: 'Inline .vly source text (alternative to path)' },
  filename: { type: 'string', description: 'Name for inline code, e.g. main.vly or main.asm (default main.vly)' },
  files: { type: 'object', description: 'Optional virtual files for inline code: { "assets/hero.tiles": "<text>" }', additionalProperties: { type: 'string' } },
};

export const TOOLS = [
  {
    name: 'vly_build',
    description: 'Compile a VLY program (.vly) or assemble a .asm file. Returns the cartridge size, warnings, RAM map (variable name -> address) and per-function code sizes, or precise compile errors with file:line:column. Use this after every edit.',
    inputSchema: { type: 'object', properties: { ...codeOrPath, out: { type: 'string', description: 'Optional path to write the .vlc cartridge' } } },
  },
  {
    name: 'vly_run',
    description: 'Run a cartridge headlessly for N frames (60 per second) with scripted button input, and report cycles, faults, hashes and memory. Set screenshot=true to get the final screen as a PNG image. Input script example: "RIGHT@0-59, A+RIGHT@60-79, START@100" (buttons UP DOWN LEFT RIGHT A B START SELECT; frames from 0).',
    inputSchema: {
      type: 'object',
      properties: {
        ...codeOrPath,
        frames: { type: 'number', description: 'Frames to run (default 60)' },
        input: { type: 'string', description: 'Input script, e.g. "RIGHT@0-29, A@10"' },
        inputFile: { type: 'string', description: 'Path to a file holding a long input script (# comments allowed)' },
        screenshot: { type: 'boolean', description: 'Return the final frame as a PNG image' },
        shots: { type: 'array', items: { type: 'number' }, description: 'Extra frame numbers to capture as images (0 = after init)' },
        scale: { type: 'number', description: 'Screenshot integer scale (default 3)' },
        mem: { type: 'array', items: { type: 'string' }, description: 'Memory to read at the end: variable names ("score", "buf[2]") or addresses ("0xB400:16")' },
        ascii: { type: 'boolean', description: 'Also include a low-resolution ASCII rendering of the screen' },
        filmstrip: { type: 'number', description: 'Return ONE contact-sheet image of N evenly spaced frames, each labelled with its frame number (best way to see how a game evolves over time)' },
        watch: { type: 'array', items: { type: 'string' }, description: 'Variable names to record: returns a timeline of every change with the frame it happened' },
        trace: { type: 'string', description: 'Record the first instructions of one frame: "FRAME" or "FRAME:LIMIT" or "init:LIMIT"' },
      },
    },
  },
  {
    name: 'vly_check',
    description: 'Quality gates: play the game with no input, with START, and with a careless random player for two minutes of game time, and report faults, cycle budget, whether it is alive or frozen, sound, sprite use, text covered by sprites and variety. Every WARN is a bug to fix or a decision to explain; any FAIL means it is not finished. Run it before calling a game done.',
    inputSchema: { type: 'object', properties: { ...codeOrPath, frames: { type: 'number', description: 'Frames of careless play, 600 to 18000 (default 7200)' } } },
  },
  {
    name: 'vly_test',
    description: 'Run test specs (vly.json "tests" or *.test.json) in a directory or file. Tests assert variable values, memory, hashes, cycle budgets and absence of faults.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Directory or spec file (default ".")' }, update: { type: 'boolean', description: 'Record "auto" hashes' } } },
  },
  {
    name: 'vly_docs',
    description: 'Read the VLY documentation. Without a topic, lists the topics (language, stdlib, assembly, cli, spec, contracts, agents, ...). Read "language" and "stdlib" before writing code.',
    inputSchema: { type: 'object', properties: { topic: { type: 'string' } } },
  },
  {
    name: 'vly_isa',
    description: 'The VLY-1 instruction set table (opcodes, operands, cycle costs).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'vly_tiles',
    description: 'Preview tile art written in the .tiles text format (tile NAME: / sprite NAME WxH: with rows of . 0 1 2 3 #). Returns a PNG contact sheet so you can check what the art looks like, plus the generated constant names.',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: '.tiles source text' }, path: { type: 'string', description: 'or a path to a .tiles file' }, scale: { type: 'number' }, colors: { type: 'array', items: { type: 'string' }, description: 'Four 6-digit hex colors for indices 0-3 to preview with a real palette, e.g. ["99bbdd","ffffff","88aa55","332211"]' } } },
  },
  {
    name: 'vly_new',
    description: 'Create a starter project from a template (hello, game, pong, battle, platformer, puzzle, shooter).',
    inputSchema: { type: 'object', properties: { dir: { type: 'string' }, template: { type: 'string', enum: ['hello', 'game', 'pong', 'battle', 'platformer', 'puzzle', 'shooter'] } }, required: ['dir'] },
  },
];

const text = (t) => ({ type: 'text', text: t });
const png = (rgba, w, h, scale) => {
  const up = upscale(w, h, rgba, scale);
  return { type: 'image', data: encodePNG(up.width, up.height, up.rgba, 4).toString('base64'), mimeType: 'image/png' };
};

async function getRom(a) {
  if (a.path) {
    if (!fs.existsSync(a.path)) throw new Error(`no such file: ${a.path}`);
    if (/\.vlc$/i.test(a.path)) {
      const rom = new Uint8Array(fs.readFileSync(a.path));
      const problems = validateCartridge(rom);
      if (problems.length) throw new Error(`${a.path} is not a valid cartridge: ${problems.join('; ')}`);
      let ram;
      const mf = a.path.replace(/\.vlc$/i, '.map.json');
      if (fs.existsSync(mf)) { try { ram = JSON.parse(fs.readFileSync(mf, 'utf8')).ram; } catch { /* ignore */ } }
      return { rom, ram };
    }
    const b = await buildFile(a.path);
    return { rom: b.bytes, ram: b.stats?.ram, built: b };
  }
  if (typeof a.code === 'string') {
    const b = await buildText({ text: a.code, filename: a.filename || 'main.vly', files: a.files || {} });
    return { rom: b.bytes, ram: b.stats?.ram, built: b };
  }
  throw new Error('give either "path" or "code"');
}

function errorText(e) {
  if (e.errors) return e.message;
  return e.message || String(e);
}

export const handlers = {
  async vly_build(a) {
    const { rom, ram, built } = await getRom(a);
    if (a.out) { fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true }); fs.writeFileSync(a.out, rom); }
    const lines = [`built ${rom.length} bytes (${(rom.length / C.MAX_ROM_SIZE * 100).toFixed(2)}% of 1 MB)${a.out ? `, wrote ${a.out}` : ''}`];
    if (built?.warnings?.length) lines.push('warnings:', ...built.warnings.map((w) => '  ' + w));
    if (ram && Object.keys(ram).length) lines.push('RAM map:', ...Object.entries(ram).map(([k, r]) => `  ${k} @ 0x${r.addr.toString(16).toUpperCase()} (${r.type}, ${r.bytes} bytes)`));
    if (built?.stats?.functionBytes) lines.push('code size by function:', ...Object.entries(built.stats.functionBytes).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([k, v]) => `  ${k}: ${v} bytes`));
    return [text(lines.join('\n'))];
  },

  async vly_check(a) {
    const { rom } = await getRom(a);
    const r = checkCartridge(rom, { frames: a.frames ?? 7200 });
    const mark = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
    return [text([`quality check: ${r.verdict.toUpperCase()}, ${r.summary}`, ...r.checks.map((c) => `  ${mark[c.status]}  ${c.id}: ${c.message}${c.hint ? `\n        -> ${c.hint}` : ''}`)].join('\n'))];
  },

  async vly_run(a) {
    const { rom, ram } = await getRom(a);
    const frames = a.frames ?? 60;
    const mem = (a.mem || []).map((s) => { const [n, l] = String(s).split(':'); const r = ram?.[n.replace(/\[.*$/, '')]; return { name: n, addr: resolveAddr(n, ram || {}), len: l ? parseInt(l) : r && !/\[/.test(n) ? r.bytes : 2 }; });
    const wanted = new Set([...(a.shots || [])]);
    if (a.screenshot) wanted.add(frames);
    const stripFrames = a.filmstrip ? evenFrames(frames, a.filmstrip) : null;
    if (stripFrames) for (const f of stripFrames) wanted.add(f);
    const watch = (a.watch || []).map((n) => ({ name: n, addr: resolveAddr(n, ram || {}), bytes: ram?.[n.replace(/\[.*$/, '')]?.type === 'byte[]' ? 1 : 2 }));
    let trace;
    if (a.trace) { const [fr, lim] = String(a.trace).split(':'); trace = { frame: fr === 'init' ? 'init' : parseInt(fr, 10), limit: lim ? parseInt(lim, 10) : 100 }; }
    const input = [a.input || '', a.inputFile ? fs.readFileSync(path.resolve(a.inputFile), 'utf8') : ''].filter(Boolean).join('\n');
    const r = runCartridge(rom, { frames, input, screenshotFrames: [...wanted], mem, watch, trace });
    const faultList = Object.entries(r.faults).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n} (first at frame ${r.firstFault[k]})`);
    if (r.init.overran) faultList.unshift(`init() ran out of its ${r.init.budget}-cycle budget and was cut off`);
    const lines = [
      `ran ${frames} frames: ${faultList.length ? 'FAULTS' : 'ok'}`,
      `init: ${r.init.cycles} cycles (budget ${r.init.budget}); frame cycles: max ${r.cycles.max}, avg ${r.cycles.avg} (budget ${r.cycles.budget})`,
      `faults: ${faultList.length ? faultList.join(', ') : 'none'}`,
      `frame hash: ${r.frameHash}`,
    ];
    r.mem.forEach((m, i) => lines.push(`${mem[i].name} @ 0x${m.addr.toString(16).toUpperCase()}: ${m.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}${m.bytes.length === 2 ? ` (= ${m.bytes[0] | (m.bytes[1] << 8)})` : ''}`));
    if (r.saves.length) lines.push(`save requests: ${r.saves.length}`);
    if (watch.length) lines.push(`timeline (frame -1 = after init):`, ...r.changes.map((c) => `  frame ${c.frame}: ${c.name} ${c.from === undefined ? '' : c.from + ' -> '}${c.to}`));
    if (trace) lines.push(`instruction trace (${r.trace.length} instructions):`, ...r.trace.map((t) => `  ${t.pc.toString(16).padStart(4, '0')} ${t.text.padEnd(22)} r0=${t.regs[0].toString(16)} r1=${t.regs[1].toString(16)} r2=${t.regs[2].toString(16)}`));
    const out = [text(lines.join('\n'))];
    if (stripFrames) {
      const sheet = filmstrip(stripFrames.map((f) => ({ label: `FRAME ${f}`, rgba: r.screenshots.get(f) })), { cols: Math.min(4, stripFrames.length), scale: 1 });
      out.push(text(`filmstrip of frames ${stripFrames.join(', ')}:`));
      out.push({ type: 'image', data: encodePNG(sheet.width, sheet.height, sheet.rgba, 4).toString('base64'), mimeType: 'image/png' });
    }
    if (a.ascii) out.push(text(asciiScreen(r.machine.renderRGBA())));
    const scale = a.scale ?? 3;
    for (const f of [...r.screenshots.keys()].sort((x, y) => x - y)) {
      if (stripFrames && stripFrames.includes(f) && !(a.screenshot && f === frames) && !(a.shots || []).includes(f)) continue;
      out.push(text(`screenshot after ${f === 0 ? 'init' : `frame ${f}`}:`));
      out.push(png(r.screenshots.get(f), C.SCREEN_W, C.SCREEN_H, scale));
    }
    return out;
  },

  async vly_test(a) {
    const files = findSpecFiles([a.path || '.']);
    if (!files.length) return [text('no test specs found (vly.json with "tests", or *.test.json files)')];
    let pass = 0, fail = 0;
    const lines = [];
    for (const f of files) {
      const r = await runSpecFile(f, { update: !!a.update });
      for (const t of r.results) {
        if (t.ok) pass++; else fail++;
        lines.push(`${t.ok ? 'PASS' : 'FAIL'}  ${f} :: ${t.name}`);
        for (const m of t.failures) lines.push(`      ${m}`);
      }
    }
    lines.push(`${pass} passed, ${fail} failed`);
    return [text(lines.join('\n'))];
  },

  async vly_docs(a) {
    const topics = {};
    const add = (k, p) => { if (fs.existsSync(p)) topics[k] = p; };
    add('overview', path.join(ROOT, 'README.md')); add('spec', path.join(ROOT, 'SPEC.md')); add('contracts', path.join(ROOT, 'CONTRACTS.md')); add('agents', path.join(ROOT, 'AGENTS.md')); add('roadmap', path.join(ROOT, 'ROADMAP.md'));
    const d = path.join(ROOT, 'docs');
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.md')) add(f.replace(/\.md$/, ''), path.join(d, f));
    if (!a.topic) return [text('Topics: ' + Object.keys(topics).join(', '))];
    if (!topics[a.topic]) throw new Error(`unknown topic "${a.topic}". Topics: ${Object.keys(topics).join(', ')}`);
    return [text(fs.readFileSync(topics[a.topic], 'utf8'))];
  },

  async vly_isa() {
    return [text(OPS.map((o) => `${o.op.toString(16).padStart(2, '0')} ${o.name.padEnd(5)} ${o.form.padEnd(12)} ${String(o.cycles).padStart(2)}cy  ${o.desc}`).join('\n'))];
  },

  async vly_tiles(a) {
    const src = a.text ?? (a.path ? fs.readFileSync(a.path, 'utf8') : null);
    if (src === null) throw new Error('give "text" or "path"');
    const t = parseTilesText(src, a.path || 'input.tiles');
    const { tilesContactSheet } = await import('../tools/tiles.js');
    const { GLYPHS } = await import('../core/font.js');
    const palette = Array.isArray(a.colors) && a.colors.length === 4 ? a.colors.map((c) => parseInt(String(c).replace('#', ''), 16)) : undefined;
    const sheet = tilesContactSheet(t, { scale: a.scale ?? 6, glyphs: GLYPHS, ...(palette ? { palette } : {}) });
    return [
      text(`${t.count} tiles. Constants: ${t.names.map((n) => `${n.name}=${n.index}${n.w * n.h > 1 ? ` (${n.w}x${n.h} tiles)` : ''}`).join(', ')}`),
      { type: 'image', data: encodePNG(sheet.width, sheet.height, sheet.rgba, 4).toString('base64'), mimeType: 'image/png' },
    ];
  },

  async vly_new(a) {
    const { commands } = await import('../../cli/commands.js');
    const r = await commands.new.run({ _: [a.dir], flags: { template: a.template || 'hello' } });
    return [text(r.text)];
  },
};

function respond(id, result) { return { jsonrpc: '2.0', id, result }; }
function fail(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

/** Handle one JSON-RPC message; returns the response object or null for notifications. */
export async function handleMessage(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;
  try {
    switch (method) {
      case 'initialize':
        return respond(id, { protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'vly', version: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version }, instructions: 'VLY-1 console toolchain. Start with vly_docs topic "agents", then "language". Typical loop: write src/main.vly, vly_build, vly_run with screenshot=true, vly_test.' });
      case 'notifications/initialized': case 'notifications/cancelled': return null;
      case 'ping': return respond(id, {});
      case 'tools/list': return respond(id, { tools: TOOLS });
      case 'tools/call': {
        const h = handlers[params?.name];
        if (!h) return fail(id, -32602, `unknown tool ${params?.name}`);
        try {
          const content = await h(params.arguments || {});
          return respond(id, { content });
        } catch (e) {
          return respond(id, { content: [text(errorText(e))], isError: true });
        }
      }
      default:
        if (isNotification) return null;
        return fail(id, -32601, `method not found: ${method}`);
    }
  } catch (e) {
    return isNotification ? null : fail(id, -32603, e.message);
  }
}

export async function serveStdio(input = process.stdin, output = process.stdout) {
  let buf = '';
  input.setEncoding('utf8');
  const pending = new Set();
  input.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { output.write(JSON.stringify(fail(null, -32700, 'parse error')) + '\n'); continue; }
      const p = handleMessage(msg).then((r) => { if (r) output.write(JSON.stringify(r) + '\n'); }).finally(() => pending.delete(p));
      pending.add(p);
    }
  });
  await new Promise((resolve) => input.on('end', resolve));
  await Promise.all(pending);
}
