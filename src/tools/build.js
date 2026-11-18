// Build helper: turns a source file (.asm or .vly) into a cartridge image. Node only (uses fs).

import fs from 'node:fs';
import path from 'node:path';
import { assemble, AsmError } from '../asm/assembler.js';

export function makeReadFile(baseDir) {
  return (p, from) => {
    const dir = from && from !== '<input>' ? path.dirname(path.resolve(baseDir, from)) : baseDir;
    const candidates = [path.resolve(dir, p), path.resolve(baseDir, p)];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const buf = fs.readFileSync(c);
        return /\.(asm|inc|vly|tiles|txt|map)$/i.test(c) ? buf.toString('utf8') : new Uint8Array(buf);
      }
    }
    throw new Error(`file not found: ${p}`);
  };
}

/**
 * Build a source file into a cartridge.
 * @returns {{bytes: Uint8Array, symbols: object, warnings: string[], kind: 'asm'|'vly', asm?: string}}
 */
export async function buildFile(entry, opts = {}) {
  const abs = path.resolve(entry);
  const baseDir = path.dirname(abs);
  const text = fs.readFileSync(abs, 'utf8');
  const readFile = makeReadFile(baseDir);
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.vly') {
    const { compileToCartridge } = await import('../lang/index.js');
    const r = compileToCartridge(text, { filename: path.basename(abs), readFile, ...opts });
    return { ...r, kind: 'vly' };
  }
  const r = assemble(text, { filename: path.basename(abs), readFile });
  return { bytes: r.bytes, symbols: r.symbols, warnings: r.warnings, listing: r.listing, kind: 'asm' };
}

/**
 * Build from source text (no file needed). Used by the MCP server and tests.
 * @param {{text: string, filename?: string, baseDir?: string, files?: Record<string, string>}} o
 *   `files` is an optional virtual file system for imports/assets (path -> text); falls back to baseDir on disk.
 */
export async function buildText({ text, filename = 'main.vly', baseDir = process.cwd(), files = {} }) {
  const disk = makeReadFile(baseDir);
  const norm = (p) => path.posix.normalize(p).replace(/^\.\//, '');
  const readFile = (p, from) => {
    // virtual files are found by the path as written, or relative to the file that names them ("../assets/a.tiles")
    const key = [p, norm(p), from && from !== '<input>' ? norm(path.posix.join(path.posix.dirname(from), p)) : null].find((k) => k && k in files);
    if (key !== undefined) {
      const v = files[key];
      return typeof v === 'string' && !/\.(asm|inc|vly|tiles|txt|map)$/i.test(key) ? new TextEncoder().encode(v) : v;
    }
    return disk(p, from);
  };
  if (/\.asm$/i.test(filename)) {
    const r = assemble(text, { filename, readFile });
    return { bytes: r.bytes, symbols: r.symbols, warnings: r.warnings, listing: r.listing, kind: 'asm' };
  }
  const { compileToCartridge } = await import('../lang/index.js');
  const r = compileToCartridge(text, { filename, readFile });
  return { ...r, kind: 'vly' };
}

export { AsmError };
