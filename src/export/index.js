// Export a cartridge as one self-contained HTML file: the WebAssembly emulator, the cartridge, touch controls,
// sound and battery saves, all inline. Works offline, from file://, on phones, in any static host.

import { BOOT_ROM, BOOT_FRAMES } from '../boot/boot-rom.js';
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
/**
 * The key a player's save lives under in the browser. By default it comes from the cartridge's hash, so every new release of a game would start
 * with an empty save. A game that sets a stable id (vly.json "id", or --id) keeps its saves across releases; legacyIds lists older keys whose
 * saves are carried forward (a previous release's hash key, or an earlier id).
 */
export function saveId(rom, opts = {}) {
  const id = opts.id ? String(opts.id).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) : '';
  return id || sha256Hex(rom).slice(0, 16);
}

export function exportHtml(rom, opts = {}) {
  const title = opts.title || 'VLY-1 game';
  const description = opts.description || `${title}, a VLY-1 cartridge. Plays in any browser.`;
  const template = fs.readFileSync(path.join(here, 'player-template.html'), 'utf8');
  return template
    .replaceAll('__TITLE__', escHtml(title))
    .replaceAll('__DESCRIPTION__', escHtml(description))
    .replaceAll('__ROM_ID__', saveId(rom, opts))
    .replace('__LEGACY_IDS__', JSON.stringify((opts.legacyIds || []).map(String)))
    .replace('__WASM_BASE64__', WASM_BASE64)
    .replace('__ROM_BASE64__', Buffer.from(rom).toString('base64'))
    .replace('__BOOT_BASE64__', Buffer.from(BOOT_ROM).toString('base64'))
    .replace('__BOOT_FRAMES__', String(BOOT_FRAMES));
}
