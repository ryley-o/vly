// Build src/tools/tunelib.json: a curated library of public-domain classical and ragtime melodies, already converted to VLY-1 music data.
// Sources are the Mutopia Project's MIDI files for pieces whose Mutopia page says "Public Domain" (the page was checked when this was built:
// see `sourceUrl`). Run: node scripts/build-tunelib.mjs   (needs network; the MIDI files are cached in $TUNELIB_CACHE or /tmp/tunelib-cache).
// The library file is committed; agents do not need the network.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { midiToSong, barsForSeconds, noteName } from '../src/tools/midi.js';

const CACHE = process.env.TUNELIB_CACHE || '/tmp/tunelib-cache';
fs.mkdirSync(CACHE, { recursive: true });
const pieces = JSON.parse(fs.readFileSync(process.env.TUNELIB_PIECES || '/tmp/sf/crawl/pieces.json', 'utf8'));
const byId = new Map(pieces.map((p) => [p.piece, p]));

// [mutopia id, slug, short title, tags (mood), scenes (where it fits), energy 1-5, bpm override (quarter note) or null, from bar or null, bars or null, note]
const CURATION = JSON.parse(fs.readFileSync(new URL('./tunelib-curation.json', import.meta.url), 'utf8'));

const out = [];
for (const c of CURATION) {
  const meta = byId.get(String(c.id));
  if (!meta) { console.error('not in crawl:', c.id); continue; }
  if (meta.license !== 'publicdomain') { console.error('NOT public domain on Mutopia:', c.id, meta.license); continue; }
  const file = path.join(CACHE, `${c.id}.mid`);
  if (!fs.existsSync(file)) {
    const r = spawnSync('curl', ['-sL', '-m', '60', '-o', file, meta.mid]);
    if (r.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size < 100) { console.error('download failed:', c.id, meta.mid); continue; }
  }
  const bytes = fs.readFileSync(file);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'MThd') { console.error('not a MIDI file:', c.id); fs.unlinkSync(file); continue; }
  try {
    const first = c.from || 1;
    const n = c.bars || barsForSeconds(bytes, 36, c.bpm ? { bpm: c.bpm } : {});
    const song = midiToSong(bytes, { bars: [first, first + n - 1], grid: 'auto', bpm: c.bpm, split: c.split, tracks: c.tracks, transpose: c.transpose });
    const leadSteps = song.lead.reduce((a, [, d]) => a + d, 0), restSteps = song.lead.filter(([x]) => !x).reduce((a, [, d]) => a + d, 0);
    const seconds = song.steps * song.framesPerStep / 60;
    out.push({
      id: c.slug, title: c.title, composer: c.composer || meta.by.replace(/^by\s+/i, ''), form: c.form || meta.title.replace(/\s+/g, ' ').slice(0, 90),
      mutopiaId: Number(c.id), sourceUrl: `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=${c.id}`, midiUrl: meta.mid, license: 'Public Domain (as stated on the Mutopia Project page for this edition)',
      publisher: c.edition || meta.publisher, instrument: c.instrument || meta.instrument.replace(/^for /, ''), style: c.style || meta.style,
      tags: c.tags, scenes: c.scenes, energy: c.energy, note: c.note,
      bars: song.bars, fromBar: first, bpm: Math.round(3600 / (song.framesPerStep * song.grid)), meter: `${song.ts.num}/${song.ts.den}`, key: song.key.name, grid: song.grid, framesPerStep: song.framesPerStep, seconds: Math.round(seconds),
      leadRange: song.range.lead, restShare: Number((restSteps / Math.max(1, leadSteps)).toFixed(2)),
      lead: song.lead, bass: song.bass, arp: song.arp,
    });
    console.log(`${c.slug.padEnd(24)} bars ${first}-${first + n - 1} ${song.ts.num}/${song.ts.den} ${String(song.bpm).padStart(3)} bpm grid ${song.grid} fps ${song.framesPerStep} ${song.key.name.padEnd(9)} ${Math.round(seconds)}s lead ${song.range.lead.join('-')} rests ${(restSteps / leadSteps * 100).toFixed(0)}% first: ${song.lead.slice(0, 6).map(([x]) => (x ? noteName(x + 35) : '-')).join(' ')}`);
  } catch (e) { console.error('convert failed:', c.id, e.message); }
}
fs.writeFileSync(new URL('../src/tools/tunelib.json', import.meta.url), JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: 'Mutopia Project (https://www.mutopiaproject.org/), pieces marked Public Domain', tunes: out }));
console.log(out.length, 'tunes written');
