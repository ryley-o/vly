// Turn a Standard MIDI File of a public-domain piece into VLY-1 music data: a lead (the top line), a bass (the bottom line) and an arpeggio
// (the chord tones between them cycled fast, which the ear hears as a chord on one channel). Everything is quantised to a grid of "steps",
// the unit of std/music (`music_tempo(frames_per_step)`), and folded into the console's range (C2 to B6, note numbers 1 to 60).
//
//   const song = midiToSong(bytes, { bars: [1, 16], grid: 4, split: 60 });
//   song.lead, song.bass, song.arp : arrays of [note, steps] (note 0 = rest)
//   song.framesPerStep, song.stepsPerBar, song.bpm, song.key (a guess), song.notes (what was kept)
//
// This is a tool for ARRANGING from a score you have checked is old enough (see docs ref-music). It does not decide what you may use.

export function parseMidi(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let p = 0;
  const u32 = () => ((b[p++] << 24) | (b[p++] << 16) | (b[p++] << 8) | b[p++]) >>> 0;
  const u16 = () => (b[p++] << 8) | b[p++];
  const tag = () => String.fromCharCode(b[p++], b[p++], b[p++], b[p++]);
  if (tag() !== 'MThd') throw new Error('not a MIDI file (no MThd header)');
  const hlen = u32(), format = u16(), ntrks = u16(), division = u16();
  p = 8 + hlen;
  if (division & 0x8000) throw new Error('SMPTE time division is not supported');
  const tracks = [], tempos = [], timesigs = [];
  for (let t = 0; t < ntrks && p < b.length; t++) {
    if (tag() !== 'MTrk') throw new Error('bad track header');
    const len = u32(), end = p + len;
    let tick = 0, running = 0, name = '';
    const notes = [], open = new Map(), programs = new Map();
    const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let st = b[p];
      if (st < 0x80) st = running; else { p++; if (st < 0xf0) running = st; }
      if (st === 0xff) {
        const type = b[p++], l = vlq();
        if (type === 0x51 && l === 3) tempos.push({ tick, usq: (b[p] << 16) | (b[p + 1] << 8) | b[p + 2] });
        else if (type === 0x58 && l >= 2) timesigs.push({ tick, num: b[p], den: 1 << b[p + 1] });
        else if (type === 0x03) name = String.fromCharCode(...b.subarray(p, p + l));
        p += l;
      } else if (st === 0xf0 || st === 0xf7) { const l = vlq(); p += l; }
      else {
        const kind = st & 0xf0, ch = st & 0x0f;
        if (kind === 0xc0 || kind === 0xd0) { if (kind === 0xc0) programs.set(ch, b[p]); p += 1; }
        else {
          const a = b[p++], v = b[p++];
          const key = ch * 128 + a;
          if (kind === 0x90 && v > 0) { if (!open.has(key)) open.set(key, tick); }
          else if (kind === 0x80 || (kind === 0x90 && v === 0)) {
            if (open.has(key)) { notes.push({ pitch: a, start: open.get(key), end: tick, ch }); open.delete(key); }
          }
        }
      }
    }
    p = end;
    tracks.push({ name, notes: notes.filter((n) => n.end > n.start), programs: [...programs.entries()] });
  }
  tempos.sort((x, y) => x.tick - y.tick); timesigs.sort((x, y) => x.tick - y.tick);
  return { format, division, tracks, tempos, timesigs };
}

const NOTE_MIN = 36, NOTE_MAX = 95;                       // C2 to B6 are VLY note numbers 1 to 60
const fold = (m) => { while (m < NOTE_MIN) m += 12; while (m > NOTE_MAX) m -= 12; return m; };
const vlyNote = (m) => fold(m) - 35;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

/** A key guess from the pitch classes (Krumhansl-style profiles). Returns e.g. "A minor". */
export function guessKey(notes) {
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[n.pitch % 12] += n.end - n.start;
  const maj = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], min = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  let best = null;
  for (let tonic = 0; tonic < 12; tonic++) for (const [mode, prof] of [['major', maj], ['minor', min]]) {
    let s = 0, mh = 0, mp = 0;
    for (let i = 0; i < 12; i++) { mh += hist[i]; mp += prof[i]; }
    mh /= 12; mp /= 12;
    let num = 0, dh = 0, dp = 0;
    for (let i = 0; i < 12; i++) { const h = hist[(tonic + i) % 12] - mh, q = prof[i] - mp; num += h * q; dh += h * h; dp += q * q; }
    s = num / Math.sqrt((dh * dp) || 1);
    if (!best || s > best.s) best = { s, tonic, mode };
  }
  return { tonic: best.tonic, mode: best.mode, name: `${NAMES[best.tonic]} ${best.mode}` };
}

/**
 * @param {Uint8Array} bytes the MIDI file
 * @param {object} o  bars: [first, last] (1-based, inclusive; default the whole piece, at most 64 bars); grid: steps per beat (2 = eighth notes, 4 = sixteenths; default 4);
 *   split: the MIDI note below which notes are the bass side (default 60); tracks: indexes to use (default all with notes); transpose: semitones;
 *   arp: add an arpeggio voice (default true); bpm: override the tempo; maxLead: highest lead note (default 95).
 */
/** Pick steps-per-quarter-note that keeps onsets close to the grid and the frame count per step close to a whole number. */
function autoGrid(m, div, ts, bpm, o) {
  const notes = (o.tracks ? o.tracks.map((i) => m.tracks[i]) : m.tracks).flatMap((t) => t.notes).filter((n) => n.ch !== 9);
  const sample = notes.slice(0, 4000);
  const candidates = ts.den === 8 && ts.num % 3 === 0 && ts.num >= 6 ? [3, 6] : [2, 4, 8, 3, 6];
  let best = null;
  for (const g of candidates) {
    const st = div / g;
    let err = 0;
    // the share of note starts that fall between steps matters most: a sixteenth-note run on an eighth-note grid loses notes
    for (const n of sample) err += (Math.abs(n.start / st - Math.round(n.start / st)) > 0.2 ? 4 : 0) + Math.abs(n.end / st - Math.round(n.end / st)) * 0.25;
    err /= Math.max(1, sample.length);
    const frames = 3600 / (bpm * g);
    if (frames < 2.5) continue;                                   // too fast to play: steps shorter than two frames
    const fr = Math.abs(frames - Math.round(frames)) / frames;     // relative tempo error from rounding to whole frames
    const score = err + fr * 1.5 + (g > 4 ? 0.02 * (g - 4) : 0) + (candidates[0] === 3 ? 0 : 0);
    if (!best || score < best.score) best = { g, score };
  }
  return best ? best.g : 4;
}

export function midiToSong(bytes, o = {}) {
  const m = parseMidi(bytes);
  const div = m.division;
  const ts = m.timesigs[0] || { num: 4, den: 4 };
  const beatTicks = div * 4 / ts.den;                       // a "beat" in the time signature's own unit
  const barTicks = beatTicks * ts.num;
  const usq = (m.tempos[0] && m.tempos[0].usq) || 500000;
  const bpm = o.bpm || 60000000 / usq;                       // beats per minute of the quarter note
  const grid = o.grid && o.grid !== 'auto' ? o.grid : autoGrid(m, div, ts, bpm, o);
  const stepTicks = div / grid;                              // ticks per step (grid steps per quarter note)
  const useTracks = o.tracks ? o.tracks.map((i) => m.tracks[i]) : m.tracks.filter((t) => t.notes.length);
  let all = useTracks.flatMap((t) => t.notes.filter((n) => n.ch !== 9)).map((n) => ({ ...n, pitch: n.pitch + (o.transpose || 0) }));
  if (!all.length) throw new Error('no notes in the chosen tracks');
  const firstBar = o.bars ? o.bars[0] : 1;
  const lastBar = o.bars ? o.bars[1] : Math.min(64, Math.ceil(Math.max(...all.map((n) => n.end)) / barTicks));
  const t0 = (firstBar - 1) * barTicks, t1 = lastBar * barTicks;
  all = all.filter((n) => n.start >= t0 - 1 && n.start < t1).map((n) => ({ ...n, start: Math.max(n.start, t0) - t0, end: Math.min(n.end, t1) - t0 }));
  const total = Math.max(1, Math.round((t1 - t0) / stepTicks));
  const split = o.split ?? 60;
  const lead = new Array(total).fill(0), bass = new Array(total).fill(0), arpSrc = Array.from({ length: total }, () => []);
  const qs = (t) => Math.round(t / stepTicks);
  // the lead: the highest sounding note of the right-hand side at each step; a held note stays held (we store the onset and let the length follow)
  const onsetLead = new Array(total).fill(0), onsetBass = new Array(total).fill(0);
  for (let s = 0; s < total; s++) {
    const tick = s * stepTicks;
    let hi = 0, lo = 999, starts = false, startsB = false;
    for (const n of all) {
      if (n.start <= tick + stepTicks * 0.49 && n.end > tick + stepTicks * 0.49) {
        if (n.pitch >= split) { if (n.pitch > hi) { hi = n.pitch; starts = qs(n.start) === s; } }
        else { if (n.pitch < lo) { lo = n.pitch; startsB = qs(n.start) === s; } }
        if (n.pitch < 100) arpSrc[s].push(n.pitch);
      }
    }
    lead[s] = hi ? hi : 0; onsetLead[s] = hi && starts ? 1 : 0;
    bass[s] = lo < 999 ? lo : 0; onsetBass[s] = lo < 999 && startsB ? 1 : 0;
  }
  // legato: join a note to the next across a one-step gap (staccato music otherwise plays as mostly rests)
  if (o.legato) for (let s = 1; s < total - 1; s++) if (!lead[s] && lead[s - 1] && lead[s + 1]) lead[s] = lead[s - 1];
  const toEvents = (line, onsets, maxNote, floor = 0) => {
    const ev = [];
    let i = 0;
    while (i < total) {
      const n = line[i];
      let j = i + 1;
      while (j < total && line[j] === n && !(onsets[j] && n !== 0)) j++;
      let v = n === 0 ? 0 : vlyNote(Math.min(n, maxNote));
      while (v && v < floor) v += 12;
      for (let left = j - i; left > 0; left -= 250) ev.push([v, Math.min(left, 250)]);   // a duration is one byte: a longer note or rest is split
      i = j;
    }
    return ev;
  };
  const leadEv = toEvents(lead, onsetLead, o.maxLead || NOTE_MAX);
  const bassEv = toEvents(bass.map((n) => (n ? n : 0)), onsetBass, NOTE_MAX, o.bassFloor ?? 10);   // the triangle below A2 (about 110 Hz) is nearly silent on a 40 mm speaker
  let arpEv = null;
  if (o.arp !== false) {
    // chord tones: the distinct pitch classes sounding at each beat in the middle register, cycled one step at a time
    const arp = new Array(total).fill(0);
    for (let s = 0; s < total; s++) {
      const tones = [...new Set(arpSrc[s].filter((p) => p < 84 && p >= 48).map((p) => p))].sort((a, b) => a - b);
      const uniq = []; for (const p of tones) if (!uniq.some((u) => u % 12 === p % 12)) uniq.push(p);
      const pick = uniq.slice(0, 3);
      arp[s] = pick.length >= 2 ? pick[s % pick.length] : 0;
    }
    arpEv = toEvents(arp, new Array(total).fill(1), NOTE_MAX);
  }
  const stepsPerBar = Math.round(barTicks / stepTicks);
  const framesPerStep = Math.max(1, Math.round(3600 / (bpm * grid)));
  const key = guessKey(all);
  return { lead: leadEv, bass: bassEv, arp: arpEv, bpm: Math.round(bpm), grid, ts, stepsPerBar, steps: total, bars: lastBar - firstBar + 1, framesPerStep, key, notes: all.length,
    range: { lead: [Math.min(...lead.filter(Boolean)), Math.max(...lead.filter(Boolean))].map(noteName) } };
}

/** Source text: three btables and the calls to play them. */
export function songToVly(song, name = 'tune') {
  const fmt = (ev) => ev.map(([n, d]) => `${n},${d}`).join(', ');
  let out = `// ${song.bars} bars, ${song.steps} steps at ${song.bpm} BPM, key ${song.key.name}. music_tempo(${song.framesPerStep}) sets the speed (frames per step).\n`;
  out += `btable ${name}_lead = { ${fmt(song.lead)}, 255 };\n`;
  out += `btable ${name}_bass = { ${fmt(song.bass)}, 255 };\n`;
  if (song.arp) out += `btable ${name}_arp = { ${fmt(song.arp)}, 255 };\n`;
  out += `func ${name}_play() {\n  music_tempo(${song.framesPerStep});\n  music_play(0, 0, ${name}_lead, 9);\n  music_play(1, 2, ${name}_bass, 8);\n${song.arp ? `  music_play(2, 1, ${name}_arp, 4);   // voice 2 on the second pulse channel (an arpeggio): a sound effect on channel 1 takes it over\n` : ''}}\n`;
  return out;
}

/** How many bars the MIDI file holds (the last note's end, rounded up to a whole bar). */
export function midiBars(bytes) {
  const m = parseMidi(bytes);
  const ts = m.timesigs[0] || { num: 4, den: 4 };
  const barTicks = m.division * 4 / ts.den * ts.num;
  let end = 0; for (const t of m.tracks) for (const n of t.notes) if (n.ch !== 9 && n.end > end) end = n.end;
  return Math.max(1, Math.ceil((end - 1) / barTicks));
}

/** How many bars of this MIDI fit in about `seconds` of play, rounded to a multiple of 4 (a phrase), at least 8. */
export function barsForSeconds(bytes, seconds, { bpm } = {}) {
  const m = parseMidi(bytes);
  const ts = m.timesigs[0] || { num: 4, den: 4 };
  const usq = (m.tempos[0] && m.tempos[0].usq) || 500000;
  const b = bpm || 60000000 / usq;
  const secondsPerBar = (ts.num * (4 / ts.den)) * 60 / b;
  return Math.max(8, Math.round(seconds / secondsPerBar / 4) * 4);
}
