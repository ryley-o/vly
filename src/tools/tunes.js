// The public-domain tune library (src/tools/tunelib.json, built by scripts/build-tunelib.mjs from Mutopia Project MIDI files whose pages say
// "Public Domain"), already converted to VLY-1 music data: a lead, a bass and an arpeggio voice. This module finds, cuts, transposes and prints them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { songToVly, noteName } from './midi.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tunelib.json');
let cache = null;
export function loadTunes() { return (cache ??= JSON.parse(fs.readFileSync(FILE, 'utf8'))); }

const words = (s) => String(s).toLowerCase();
/** Filter by mood tag, scene, energy (1-5, "4" or "4-5"), composer, a search word, and a length in seconds. Every given filter must match. */
export function findTunes({ mood, scene, energy, composer, q, meter, maxSeconds } = {}) {
  let lo = 1, hi = 5;
  if (energy !== undefined && energy !== null) { const m = /^(\d)(?:-(\d))?$/.exec(String(energy)); if (!m) throw new Error('energy is 1 to 5, or a range like 4-5'); lo = +m[1]; hi = +(m[2] || m[1]); }
  const has = (list, w) => list.some((x) => words(x).includes(words(w)));
  return loadTunes().tunes.filter((t) => t.energy >= lo && t.energy <= hi
    && (!mood || has(t.tags, mood)) && (!scene || has(t.scenes, scene))
    && (!composer || words(t.composer).includes(words(composer)))
    && (!meter || t.meter === meter)
    && (!maxSeconds || t.seconds <= Number(maxSeconds))
    && (!q || words([t.id, t.title, t.composer, t.note, t.tags.join(' '), t.scenes.join(' ')].join(' ')).includes(words(q))));
}
/** Ids close to a mistyped one: a shared word, or a small edit distance. */
export function suggest(id, n = 4) {
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const parts = words(id).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  return loadTunes().tunes.map((t) => ({ id: t.id, s: lev(words(id), t.id) - parts.filter((w) => t.id.includes(w)).length * 4 })).filter((x) => x.s <= 4).sort((a, b) => a.s - b.s).slice(0, n).map((x) => x.id);
}
export function getTune(id) { return loadTunes().tunes.find((t) => t.id === id) || null; }
/** Every mood tag and scene word in the library with how many tunes carry it. */
export function vocabulary() {
  const count = (key) => { const m = new Map(); for (const t of loadTunes().tunes) for (const w of t[key]) m.set(w, (m.get(w) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };
  return { tags: count('tags'), scenes: count('scenes') };
}

export const stepsPerBar = (t) => { const [n, d] = t.meter.split('/').map(Number); return Math.round(n * (4 / d) * t.grid); };

/** Cut events (note, steps) to the steps [from, to). A note that began earlier and carries on is played again from the cut. */
function cut(events, from, to) {
  const out = []; let pos = 0;
  for (const [n, d] of events) {
    const a = Math.max(pos, from), b = Math.min(pos + d, to);
    if (b > a) out.push([n, b - a]);
    pos += d;
  }
  return out;
}

/**
 * A library entry as a song object that songToVly can print.
 * @param {object} o bars: "3-10" (bars of the excerpt, 1-based); transpose: semitones; bpm or fps: tempo; arp: false to drop the third voice
 */
export function tuneSong(t, o = {}) {
  const spb = stepsPerBar(t);
  let first = 1, last = t.bars;
  if (o.bars) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(String(o.bars));
    if (!m) throw new Error('bars looks like 3-10 (bars of the excerpt, 1-based)');
    first = +m[1]; last = +(m[2] || m[1]);
    if (first < 1 || last < first || last > t.bars) throw new Error(`this excerpt has bars 1-${t.bars}`);
  }
  const shift = Math.round(Number(o.transpose || 0));
  const move = (ev) => ev.map(([n, d]) => {
    if (!n) return [0, d];
    const x = n + shift;
    if (x < 1 || x > 60) throw new Error(`transposing by ${shift} puts ${noteName(n + 35)} outside the machine's range (C2 to B6)`);
    return [x, d];
  });
  const from = (first - 1) * spb, to = last * spb;
  let framesPerStep = t.framesPerStep, bpm = t.bpm;
  if (o.fps) { framesPerStep = Math.max(1, Math.round(Number(o.fps))); bpm = Math.round(3600 / (framesPerStep * t.grid)); }
  else if (o.bpm) { bpm = Number(o.bpm); framesPerStep = Math.max(1, Math.round(3600 / (bpm * t.grid))); bpm = Math.round(3600 / (framesPerStep * t.grid)); }
  return {
    lead: move(cut(t.lead, from, to)), bass: move(cut(t.bass, from, to)), arp: o.arp === false ? null : move(cut(t.arp, from, to)),
    bpm, framesPerStep, bars: last - first + 1, steps: to - from, key: { name: t.key + (shift ? ` (shifted ${shift > 0 ? '+' : ''}${shift})` : '') },
  };
}

/** The source text for a tune, with a credit comment, ready to paste into a game. */
export function tuneSource(t, o = {}) {
  const song = tuneSong(t, o);
  const name = String(o.name || t.id.replace(/-/g, '_')).replace(/[^a-z0-9_]/gi, '_');
  const credit = `// ${t.title}: a public-domain composition by ${t.composer}, converted from the Mutopia Project edition ${t.sourceUrl} (${t.publisher}).\n// Credit the composer in your store listing and DESIGN.md (not on a play screen).\n`;
  return credit + songToVly(song, name);
}

/** Which library tunes does this source text play with their lead notes unchanged? (a run of 14 pairs from the middle of the lead appears as it is) */
export function libraryTunesIn(text) {
  const flat = String(text).replace(/\s+/g, '');
  if (!/btable/.test(flat)) return [];
  const hit = [];
  for (const t of loadTunes().tunes) {
    const pairs = t.lead.map(([n, d]) => `${n},${d}`);
    if (pairs.length < 20) continue;
    const at = (k) => pairs.slice(k, k + 14).join(',');
    if ([Math.floor(pairs.length / 3), Math.floor(pairs.length / 2), Math.floor(pairs.length * 2 / 3)].some((k) => flat.includes(at(k)))) hit.push(t.id);
  }
  return hit;
}
