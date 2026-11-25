// Test runner for cartridge test specs. Shared by `vly test` and the MCP server. Node only.
//
// A spec file is JSON:
//   {
//     "src": "src/main.vly",          // or "cart": "build/game.vlc"
//     "tests": [
//       { "name": "moves right",
//         "frames": 30, "input": "RIGHT@0-29",       // or "inputFile": "tests/clear.input" for a long recorded script
//         "expect": { "words": { "0xB400": 5 }, "bytes": { "0x8000": [0, 1] },
//                     "frameHash": "auto", "stateHash": "auto", "maxCycles": 20000,
//                     "saves": 1, "saveWords": { "0": 5 } } }   // save requests and the last save's words (byte offsets)
//   A test with a "frameHash" (or "textInside": true) also fails when text is cut by the screen edge on its final screen ("allowClippedText": true on the test turns that off).
//     ]
//   }
// Hash values of "auto" are filled in by `vly test --update`. Faults (div by zero, illegal opcode, writes to ROM,
// cycle overruns) fail a test unless it sets "allowFaults": true.

import fs from 'node:fs';
import path from 'node:path';
import { runCartridge, clippedText } from './run.js';
import { buildFile } from './build.js';
import { resolveAddr } from './names.js';
import { faultSnapshot, firstFaultOf, formatSnapshot } from './snapshot.js';

const num = (v) => (typeof v === 'number' ? v : parseInt(String(v), v && /^\s*0x/i.test(String(v)) ? 16 : 10));

export async function runSpecFile(specPath, { update = false, accept = false } = {}) {
  const abs = path.resolve(specPath);
  const dir = path.dirname(abs);
  const spec = JSON.parse(fs.readFileSync(abs, 'utf8'));
  let rom, ram = {}, symbols;
  if (spec.src || spec.entry) {
    const b = await buildFile(path.resolve(dir, spec.src || spec.entry));
    rom = b.bytes; ram = b.stats?.ram || {}; symbols = b.symbols;
  } else if (spec.cart) {
    const cp = path.resolve(dir, spec.cart);
    rom = new Uint8Array(fs.readFileSync(cp));
    const mf = cp.replace(/\.vlc$/, '') + '.map.json';
    if (fs.existsSync(mf)) ram = JSON.parse(fs.readFileSync(mf, 'utf8')).ram || {};
  } else throw new Error(`${specPath}: spec needs "src", "entry" or "cart"`);

  const results = [];
  let changed = false;
  for (const t of spec.tests || []) {
    const failures = [];
    let res;
    try {
      let save = null;
      if (t.save) save = new Uint8Array(fs.readFileSync(path.resolve(dir, t.save)));
      const input = [t.input || '', t.inputFile ? fs.readFileSync(path.resolve(dir, t.inputFile), 'utf8') : ''].filter(Boolean).join('\n');
      // "set": { "level": 7, "lives": 3 } starts the test from a chosen state (variables are set after init, before the first frame)
      const pokes = Object.entries(t.set || {}).map(([name, val]) => { const base = name.replace(/\[.*$/, ''); return { addr: resolveAddr(name, ram), value: Number(val) | 0, bytes: ram?.[base]?.type === 'byte[]' ? 1 : 2 }; });
      res = runCartridge(rom, { frames: t.frames ?? 60, input, save, pokes });
      res._input = input; res._save = save;
    } catch (e) {
      results.push({ name: t.name, ok: false, failures: [`error: ${e.message}`] });
      continue;
    }
    const ex = t.expect || {};
    const addrOf = (k) => resolveAddr(k, ram);
    for (const [addr, want] of Object.entries(ex.words || {})) {
      const a = addrOf(addr);
      const got = res.machine.read16(a);
      if (got !== (num(want) & 0xffff)) failures.push(`word at ${addr}: expected ${num(want)}, got ${got}`);
    }
    for (const [addr, want] of Object.entries(ex.bytes || {})) {
      const a = addrOf(addr);
      const list = Array.isArray(want) ? want : [want];
      list.forEach((w, i) => {
        const got = res.machine.read8(a + i);
        if (got !== (num(w) & 0xff)) failures.push(`byte at ${addr}+${i}: expected ${num(w)}, got ${got}`);
      });
    }
    const stale = [];                                   // hashes that changed on purpose (vly test --accept)
    for (const key of ['frameHash', 'stateHash']) {
      if (ex[key] === undefined) continue;
      if (ex[key] === 'auto') {
        if (update) { ex[key] = res[key]; changed = true; } else failures.push(`${key} is "auto"; run with --update to record it`);
      } else if (ex[key] !== res[key]) {
        if (accept || (update && t.updateOnMismatch)) { stale.push([key, res[key]]); }
        else failures.push(`${key}: expected ${ex[key]}, got ${res[key]}   (if the change is on purpose and you have looked at it: vly test --accept)`);
      }
    }
    // a picture test (frameHash) also checks the picture: text cut by the screen edge fails it, unless the test says "allowClippedText": true
    // ("textInside": true asks for the same check without a picture hash)
    if ((ex.frameHash !== undefined || ex.textInside === true) && !t.allowClippedText) {
      const cut = clippedText(res.machine.mem);
      if (cut.length) failures.push(`text is cut off by the screen edge on the final screen: ${cut.slice(0, 3).join('; ')}   (draw the text where the scroll cannot move it, or set "allowClippedText": true on this test if the cut is on purpose)`);
    }
    if (ex.saves !== undefined && res.saves.length !== ex.saves) failures.push(`save requests: expected ${ex.saves}, got ${res.saves.length}`);
    if (ex.saveWords) {
      const last = res.saves[res.saves.length - 1];
      if (!last) failures.push('saveWords: the cartridge never requested a save');
      else for (const [off, want] of Object.entries(ex.saveWords)) {
        const o = num(off);
        const got = last.bytes[o] | (last.bytes[o + 1] << 8);
        if (got !== (num(want) & 0xffff)) failures.push(`save word at byte ${off}: expected ${num(want)}, got ${got}`);
      }
    }
    if (ex.maxCycles !== undefined && res.cycles.max > ex.maxCycles) failures.push(`max cycles ${res.cycles.max} exceeds ${ex.maxCycles}`);
    if (!t.allowFaults) {
      if (res.init.overran) failures.push(`init() ran out of its ${res.init.budget}-cycle budget`);
      const f = Object.entries(res.faults).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n} (first at frame ${res.firstFault[k]})`);
      if (f.length) {
        let why = '';
        const first = firstFaultOf(res);
        try { const snap = first && faultSnapshot(rom, { ...first, input: res._input, save: res._save, symbols, ram, watch: spec.watch }); if (snap) why = `\n    ${formatSnapshot(snap)}`; } catch { /* the explanation is extra */ }
        failures.push(`faults: ${f.join(', ')}${why}`);
      }
    }
    let note;
    if (stale.length) {
      if (failures.length) failures.push('(the new hash was not accepted because another expectation failed)');
      else { for (const [key, value] of stale) ex[key] = value; changed = true; note = `accepted a new ${stale.map(([k]) => k).join(' and ')}`; }
    }
    results.push({ name: t.name || '(unnamed)', note, ok: failures.length === 0, failures, frameHash: res.frameHash, stateHash: res.stateHash, cycles: res.cycles });
  }
  if (changed) fs.writeFileSync(abs, JSON.stringify(spec, null, 2) + '\n');
  return { file: specPath, results, updated: changed };
}

export function findSpecFiles(targets) {
  const out = [];
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) {
        if (e === 'node_modules' || e.startsWith('.') || e === 'build') continue;
        walk(path.join(p, e));
      }
    } else if (/\.test\.json$/.test(p) || path.basename(p) === 'vly.json') {
      out.push(p);
    }
  };
  for (const t of targets) {
    if (!fs.existsSync(t)) throw new Error(`no such file or directory: ${t}`);
    if (fs.statSync(t).isFile()) out.push(t); else walk(t);
  }
  return out.filter((f) => {
    try { return Array.isArray(JSON.parse(fs.readFileSync(f, 'utf8')).tests); } catch { return false; }
  });
}
