// Sums hardware/bom.csv into per-unit costs: node hardware/cost.mjs  (add --md for a markdown table)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function parseBom(text) {
  const rows = [];
  const lines = text.trim().split('\n');
  const head = lines.shift().split(',');
  for (const line of lines) {
    const cells = [];
    let cur = '', q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch; }
    cells.push(cur);
    const r = Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
    rows.push({ ...r, qty: Number(r.qty), proto_usd: Number(r.proto_usd), vol1k_usd: Number(r.vol1k_usd) });
  }
  return rows;
}

export function totals(rows) {
  const out = {};
  for (const r of rows) {
    const g = (out[r.group] ??= { proto: 0, vol1k: 0, lines: 0, unverified: 0 });
    g.proto += r.proto_usd; g.vol1k += r.vol1k_usd; g.lines++;
    if (r.confidence !== 'verified') g.unverified += r.vol1k_usd;
  }
  for (const g of Object.values(out)) { g.proto = +g.proto.toFixed(2); g.vol1k = +g.vol1k.toFixed(2); g.unverified = +g.unverified.toFixed(2); }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = parseBom(fs.readFileSync(new URL('./bom.csv', import.meta.url), 'utf8'));
  const t = totals(rows);
  for (const [g, v] of Object.entries(t)) console.log(`${g.padEnd(10)} prototype ${v.proto.toFixed(2).padStart(6)}  at 1000 ${v.vol1k.toFixed(2).padStart(6)}  (${v.lines} lines)`);
  if (process.argv.includes('--md')) {
    console.log('\n| Part | Qty | Prototype | At 1,000 | Confidence |\n|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.part} | ${r.qty} | ${r.proto_usd.toFixed(2)} | ${r.vol1k_usd.toFixed(2)} | ${r.confidence} |`);
  }
}
