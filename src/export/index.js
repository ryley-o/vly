// Export a cartridge as one self-contained HTML file: the WebAssembly emulator, the cartridge, touch controls,
// sound and battery saves, all inline. Works offline, from file://, on phones, in any static host.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256Hex } from '../core/sha256.js';
import { WASM_BASE64 } from '../wasm/wasm-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * @param {Uint8Array} rom
 * @param {{title?: string, description?: string}} [opts]
 * @returns {string} HTML
 */
export function exportHtml(rom, opts = {}) {
  const title = opts.title || 'VLY-1 game';
  const description = opts.description || `${title}, a VLY-1 cartridge. Plays in any browser.`;
  const template = fs.readFileSync(path.join(here, 'player-template.html'), 'utf8');
  return template
    .replaceAll('__TITLE__', escHtml(title))
    .replaceAll('__DESCRIPTION__', escHtml(description))
    .replaceAll('__ROM_ID__', sha256Hex(rom).slice(0, 16))
    .replace('__WASM_BASE64__', WASM_BASE64)
    .replace('__ROM_BASE64__', Buffer.from(rom).toString('base64'));
}
