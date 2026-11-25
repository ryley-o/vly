#!/usr/bin/env node
// vly: the VLY-1 command line tool. Every command supports --json for machine-readable output.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands, CliError } from './commands.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BOOLEAN_FLAGS = new Set(['profile', 'tile', 'accept', 
  'new', 'no-sources', 'no-verify', 'no-publish', 'dry-run', 'json', 'ascii', 'listing', 'symbols', 'asm', 'update', 'help', 'quiet', 'verbose', 'all', 'force', 'no-color', 'version', 'markdown', 'hex', 'audio', 'list', 'oam', 'tags',
]);
// flags whose value is optional: `--notes` or `--notes 40`; `--cvd` or `--cvd deutan,gray`
const OPTIONAL_VALUE = { notes: (v) => /^\d+$/.test(v), cvd: (v) => /^(protan|deutan|tritan|gray|all)(,(protan|deutan|tritan|gray))*$/.test(v) };
const SHORT = { o: 'out', h: 'help', f: 'frames', i: 'input', s: 'screenshot', j: 'json', v: 'version' };

function parseArgv(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { args._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (eq >= 0) args.flags[key] = a.slice(eq + 1);
      else if (BOOLEAN_FLAGS.has(key)) args.flags[key] = true;
      else if (OPTIONAL_VALUE[key]) { const next = argv[i + 1]; if (next !== undefined && OPTIONAL_VALUE[key](next)) { args.flags[key] = next; i++; } else args.flags[key] = true; }
      else {
        const next = argv[i + 1];
        if (next === undefined) throw new CliError(`flag --${key} needs a value`);
        args.flags[key] = next; i++;
      }
    } else if (a.startsWith('-') && a.length === 2 && SHORT[a[1]]) {
      const key = SHORT[a[1]];
      if (BOOLEAN_FLAGS.has(key)) args.flags[key] = true;
      else {
        const next = argv[i + 1];
        if (next === undefined) throw new CliError(`flag -${a[1]} needs a value`);
        args.flags[key] = next; i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const HELP = `vly - VLY-1 console toolchain

Usage: vly <command> [options]

Commands:
  new <dir>             Create a starter project
  build [entry]         Compile .vly or assemble .asm into a cartridge (.vlc)
  run <cart|source>     Run headless; hashes, faults, screenshots, filmstrips, GIFs, timelines, traces
  play <cart|source>    Play it (native player if built, else a one-file HTML game in your browser)
  watch [entry]         Rebuild on every change and print a one-line result
  test [paths...]       Run test specs (vly.json "tests" or *.test.json)
  info <cart>           Show cartridge header, size, hashes
  disasm <cart>         Disassemble a cartridge
  check [cart|source]   Quality gates: play with careless input for two minutes and report faults, budget, frozen game, sound, covered text
  import <picture.png>  Turn a PNG into .tiles art (colours reduced to what the hardware allows)
  tiles <file>          Convert .tiles/.png art to tile data, or preview a tile sheet
  levels <map.txt>      Profile an ASCII level map: dead screens, flat runs, repeated enemies, jumps with no consequence
  tune [id]             Public-domain classical/ragtime/march melodies converted to VLY-1 music: list by mood or scene, print the source
  isa                   Print the instruction set
  docs [topic]          Print documentation (run with no topic to list)
  export <cart>         Package a cartridge as one self-contained HTML file
  publish <cart>       Upload the cartridge and get a verified play link (ask the person first)
  release              Build, test, check, try old saves, publish + verify, write an offline copy
  chunks <cart>         Plan on-chain storage (chunk contracts, ROM hash)
  mcp                   Start the MCP server on stdio (for AI agents)
  serve [dir]           Serve the website/playground locally

Global options: --json (machine-readable output), --help

Examples:
  vly new mygame && cd mygame && vly build && vly run build/mygame.vlc --frames 60 --screenshot shot.png
  vly run game.vly --frames 120 --input "RIGHT@0-59,A@60" --ascii
  vly docs language
`;

async function main() {
  const argv = process.argv.slice(2);
  let args;
  try {
    args = parseArgv(argv);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const json = !!args.flags.json;
  if (args.flags.version) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    console.log(pkg.version);
    return;
  }
  let name = args._.shift();
  if (name === 'help' && args._[0] && commands[args._[0]]) { name = args._.shift(); args.flags.help = true; }   // "vly help check" = "vly check --help"
  if (!name || name === 'help' || (args.flags.help && !commands[name])) {
    console.log(HELP);
    return;
  }
  const cmd = commands[name];
  if (!cmd) {
    const msg = `unknown command "${name}". Run "vly help" for the list.`;
    if (json) console.log(JSON.stringify({ ok: false, error: { message: msg } }));
    else console.error(msg);
    process.exit(1);
  }
  if (args.flags.help) {
    console.log(cmd.help || `vly ${name}`);
    return;
  }
  try {
    const result = await cmd.run(args, { root: ROOT });
    if (json) {
      console.log(JSON.stringify({ ok: result.ok !== false, ...result.data }, null, 2));
    } else if (result.text !== undefined) {
      process.stdout.write(result.text.endsWith('\n') ? result.text : result.text + '\n');
    }
    if (result.exitCode) process.exitCode = result.exitCode;
  } catch (e) {
    const info = e.errors ? { message: e.message, errors: e.errors } : { message: e.message, ...(e.details || {}) };
    if (json) console.log(JSON.stringify({ ok: false, error: info }, null, 2));
    else console.error(e.message);
    if (process.env.VLY_DEBUG) console.error(e.stack);
    process.exitCode = e instanceof CliError && e.exitCode ? e.exitCode : 1;
  }
}

main();
