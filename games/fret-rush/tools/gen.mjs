// gen.mjs: turns the song definitions below into
//   assets/songN.bin   5 bytes per 16th-note step: lanes mask, lead pitch, arp pitch, bass pitch, drum bits
//   src/songdata.vly   per-song constants and tables
//   assets/big.tiles   big 16x16 letters (scaled from the built-in font)
//   tests/charts.json  the charts, for the bot (tools/bot.mjs)
// Run:  node tools/gen.mjs
// Notes use std/music numbering: C2 = 1 ... B6 = 60.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = JSON.parse(fs.readFileSync(process.env.VLY_FONT || new URL('../../../spec/font.json', import.meta.url).pathname, 'utf8')).glyphs;

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

// ---------------------------------------------------------------------------------------------------------------
// drum styles: 16-char strings, x = hit.  bits: 1 kick, 2 snare, 4 hat, 8 crash
const DRUMS = {
  none:   { k: '................', s: '................', h: '................' },
  hats:   { k: '................', s: '................', h: 'x...x...x...x...' },
  basic:  { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  drive:  { k: 'x.....x.x.x...x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  four:   { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  rush:   { k: 'x..xx..xx..xx.x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  soft:   { k: 'x...............', s: '........x.......', h: 'x...x...x...x...' },
};
const BASS = {   // offsets from the chord root in semitones: r 0, f +7, o +12, l -5
  none:     '................',
  whole:    'r...............',
  quarters: 'r...r...r...r...',
  eighths:  'r.r.r.r.r.r.r.r.',
  drive:    'r.r.r.o.r.r.r.f.',
  gallop:   'r.rrr.rrr.rrr.rr',
  pump:     'rrrrrrrrrrrrrrrr',
};
const BOFF = { r: 0, f: 7, o: 12, l: -5 };
const ARP = {      // chord tone index 0 root, 1 third, 2 fifth, 3 octave
  none: '................',
  strum: '0...2...1...2...',
  eighth: '0.1.2.1.0.1.2.1.',
  six: '0123210301232103',
  slow: '0.......2.......',
};

function nn(name) { const m = /^([A-G][#b]?)(\d)$/.exec(name); return 1 + (+m[2] - 2) * 12 + PC[m[1]]; }

function makeScale(keyPc, intervals) {
  const set = new Set(intervals.map((i) => (i + keyPc) % 12));
  const sc = [];
  for (let n = 1; n <= 66; n++) if (set.has((n - 1) % 12)) sc.push(n);
  return sc;
}
function nearestIdx(sc, pc, center) {
  let best = -1;
  for (let i = 0; i < sc.length; i++) if ((sc[i] - 1) % 12 === pc && (best < 0 || Math.abs(sc[i] - center) < Math.abs(sc[best] - center))) best = i;
  if (best < 0) throw new Error('chord root ' + pc + ' is not in the key');
  return best;
}

// ---------------------------------------------------------------------------------------------------------------
const SONGS = [
  {
    name: 'FIRST CHORDS', sf: 10, key: 'G', scale: MAJOR, stars: 1, wp: 4, wg: 9, pen: 3, m0: 60,
    lc: 31, ac: 20,
    pats: {
      a1: '3 . . . 5 . . . 8 . . . 5 . . .',
      a2: '5 . . . 3 . 5 . 8 . . . . . . .',
      a3: '1 . . . 3 . . . 5 . 3 . 1 . . .',
      a4: '8 . . . 5 . . . 3 . 5 . 3 . . .',
      b1: '5 . . . 5 . 6 . 5 . . . 3 . . .',
      b2: '3 . 5 . 8 . . . 7 . 5 . . . . .',
      b3: '8 . . . 8 . 7 . 5 . . . 5 . 3 .',
      end: '1 . . . . . . . . . . . . . . .',
    },
    sections: {
      A: { drums: 'basic', bass: 'quarters', arp: 'strum', bars: [['G', 'a1'], ['C', 'a2'], ['G', 'a3'], ['D', 'a4'], ['G', 'a1'], ['C', 'a2'], ['D', 'a4'], ['G', 'a3']] },
      B: { drums: 'basic', bass: 'eighths', arp: 'eighth', bars: [['E', 'b1'], ['C', 'b2'], ['G', 'b3'], ['D', 'b1'], ['E', 'b2'], ['C', 'b3'], ['D', 'b1'], ['D', 'b2']] },
      END: { drums: 'none', bass: 'whole', arp: 'slow', crash: true, bars: [['G', 'end']] },
    },
    order: ['A', 'B', 'A', 'END'],
  },
  {
    name: 'OPEN ROAD', sf: 8, key: 'C', scale: MAJOR, stars: 2, wp: 3, wg: 8, pen: 4, m0: 50,
    lc: 31, ac: 20,
    pats: {
      v1: '5 . 5 . 3 . 5 . 8 . . . 5 . 3 .',
      v2: '3 . 3 . 5 . 3 . 1 . . . 3 . 5 .',
      v3: '8 . 7 . 5 . . . 5 . 7 . 8 . . .',
      v4: '1 . 3 5 . . 3 . 5 . 8 . 5 3 . .',
      c1: '8 . . 8 . 7 5 . 8 . . 8 . 9 8 .',
      c2: '5 . 8 . 5 . 8 . 7 . 5 . 3 . 5 .',
      c3: '8 . 8 . 9 . 8 . 7 . 5 . 7 . 8 .',
      c4: '5 3 5 . 8 . 5 3 5 . 8 . 10 . 8 .',
      end: '1+5 . . . . . . . . . . . . . . .',
    },
    sections: {
      A: { drums: 'basic', bass: 'eighths', arp: 'strum', bars: [['A', 'v1'], ['F', 'v2'], ['C', 'v3'], ['G', 'v4'], ['A', 'v2'], ['F', 'v1'], ['C', 'v4'], ['G', 'v3']] },
      B: { drums: 'drive', bass: 'drive', arp: 'eighth', bars: [['F', 'c1'], ['C', 'c2'], ['G', 'c3'], ['A', 'c4'], ['F', 'c2'], ['C', 'c1'], ['G', 'c3'], ['G', 'c4']] },
      END: { drums: 'none', bass: 'whole', arp: 'slow', crash: true, bars: [['C', 'end']] },
    },
    order: ['A', 'B', 'A', 'B', 'END'],
  },
  {
    name: 'NEON RIFF', sf: 7, key: 'E', scale: MINOR, stars: 3, wp: 3, wg: 7, pen: 5, m0: 50,
    lc: 31, ac: 20,
    pats: {
      r1: '1 . 1 . 3 . 5 . 1 . 1 . 3 . 4 .',
      r2: '5 . 5 . 3 . 5 . 8 . 5 . 3 . 5 .',
      r3: '1 . 3 . 5 . 3 . 1 . 3 . 5 . 6 .',
      r4: '1 3 5 8 5 3 1 . 1 3 5 8 5 3 5 .',
      r5: '1 . 3 . 5 . 8 . 5 . 3 . 1 . . .',
      p1: '8 . 7 . 5 . 7 . 8 . 7 . 5 . 7 .',
      p2: '5 . 5 . 5 . 5 5 6 . 6 . 7 . 8 .',
      p3: '8 . . 8 . . 8 . 8 8 8 8 . . . .',
      c1: '8+5 . . 8 . 7 . 8+5 . . 8 . 9 . 8 .',
      c2: '5 . 7 . 8 . 7 . 5 . 7 . 8 . 9 .',
      c3: '8 . 8 . 7 . 5 . 7 . 8 . 9 . 10 .',
      c4: '8+5 . . . 8+5 . . . 8+5 8 9 10 . . . .',
      end: '1+5 . . . . . . . . . . . . . . .',
    },
    sections: {
      A: { drums: 'drive', bass: 'drive', arp: 'eighth', bars: [['E', 'r1'], ['E', 'r4'], ['C', 'r2'], ['D', 'r3'], ['E', 'r1'], ['E', 'r4'], ['C', 'r2'], ['D', 'r5']] },
      B: { drums: 'four', bass: 'gallop', arp: 'eighth', bars: [['C', 'p1'], ['D', 'p1'], ['E', 'p2'], ['E', 'p3']] },
      C: { drums: 'four', bass: 'pump', arp: 'six', bars: [['E', 'c1'], ['G', 'c2'], ['D', 'c1'], ['C', 'c2'], ['E', 'c1'], ['G', 'c2'], ['D', 'c3'], ['D', 'c4']] },
      END: { drums: 'none', bass: 'whole', arp: 'slow', crash: true, bars: [['E', 'end']] },
    },
    order: ['A', 'B', 'C', 'A', 'C', 'END'],
  },
  {
    name: 'SHRED STORM', sf: 6, key: 'A', scale: MINOR, stars: 4, wp: 3, wg: 7, pen: 6, m0: 50,
    lc: 31, ac: 20,
    pats: {
      s1: '1 . 3 . 5 . 3 . 8 . 5 . 3 5 8 .',
      s2: '8 . 7 8 . 5 . 7 8 . 5 . 3 . 5 .',
      s3: '1 3 5 3 8 5 3 1 3 5 8 5 3 5 8 .',
      s4: '5 . 5 5 . 5 . 6 7 . 7 7 . 8 . .',
      s5: '8 . 8 . 9 . 8 . 7 . 8 . 5 . 7 .',
      s6: '1+5 . . 3 . . 5 . 8 . 5 . 3 . 5 .',
      s7: '1 1 3 3 5 5 8 8 5 5 3 3 1 . . .',
      s8: '8 . . 8 . 7 . 5 7 . 8 . 9 . 8 .',
      s9: '1 3 5 8 5 3 1 3 5 8 10 8 5 8 5 3',
      s10: '8 7 8 10 8 7 5 7 8 10 12 10 8 7 5 .',
      s11: '8 . 8 8 . 8 8 . 8+5 . . . 8+5 . . .',
      end: '1+5+8 . . . . . . . . . . . . . . .',
    },
    sections: {
      A: { drums: 'rush', bass: 'pump', arp: 'six', bars: [['A', 's1'], ['A', 's2'], ['F', 's1'], ['G', 's2'], ['A', 's1'], ['A', 's2'], ['D', 's3'], ['E', 's4']] },
      B: { drums: 'four', bass: 'gallop', arp: 'eighth', bars: [['F', 's5'], ['G', 's5'], ['A', 's6'], ['A', 's7'], ['F', 's5'], ['G', 's5'], ['E', 's6'], ['E', 's8']] },
      C: { drums: 'rush', bass: 'pump', arp: 'six', bars: [['A', 's9'], ['F', 's9'], ['G', 's10'], ['A', 's10'], ['A', 's9'], ['F', 's9'], ['G', 's10'], ['G', 's11']] },
      END: { drums: 'none', bass: 'whole', arp: 'slow', crash: true, bars: [['A', 'end']] },
    },
    order: ['A', 'B', 'C', 'A', 'B', 'END'],
  },
  {   // the title tune: no chart (the sequencer plays the lead itself)
    name: 'TITLE', sf: 9, key: 'A', scale: MINOR, stars: 0, wp: 3, wg: 7, pen: 0, m0: 50, title: true,
    lc: 31, ac: 20,
    pats: {
      t1: '1 . . . 3 . . . 5 . . . 3 . . .',
      t2: '8 . . . 5 . . . 3 . 5 . 3 . . .',
      t3: '5 . . . 8 . . 7 5 . . . 3 . . .',
      t4: '8 . 7 . 5 . 3 . 5 . . . . . . .',
      t5: '1 . 3 . 5 . 8 . 10 . . . 8 . . .',
    },
    sections: {
      A: { drums: 'soft', bass: 'quarters', arp: 'eighth', bars: [['A', 't1'], ['F', 't2'], ['C', 't3'], ['G', 't2'], ['A', 't1'], ['F', 't3'], ['C', 't2'], ['G', 't4']] },
      B: { drums: 'basic', bass: 'eighths', arp: 'six', bars: [['F', 't5'], ['G', 't5'], ['A', 't3'], ['A', 't4'], ['F', 't5'], ['G', 't5'], ['E', 't3'], ['E', 't4']] },
    },
    order: ['A', 'B'],
  },
];

// ---------------------------------------------------------------------------------------------------------------
function build(song) {
  const sc = makeScale(PC[song.key], song.scale);
  const steps = [];   // {lead: [notes], arp, bass, drum}
  let bar = 0;
  const totalBars = song.order.reduce((a, s) => a + song.sections[s].bars.length, 0);
  for (const secName of song.order) {
    const sec = song.sections[secName];
    sec.bars.forEach(([chord, patName], bi) => {
      const rootPc = PC[chord];
      const li = nearestIdx(sc, rootPc, song.lc), ai = nearestIdx(sc, rootPc, song.ac);
      const toks = song.pats[patName].trim().split(/\s+/);
      if (toks.length !== 16) throw new Error(`${song.name}: pattern ${patName} has ${toks.length} tokens`);
      let bassN = 1 + rootPc; if (bassN < 5) bassN += 12;
      const dr = DRUMS[sec.drums];
      const fill = sec.drums !== 'none' && sec.drums !== 'hats' && sec.drums !== 'soft' && bi % 4 === 3 && bar !== totalBars - 2 + 0;
      for (let s = 0; s < 16; s++) {
        const t = toks[s];
        const lead = t === '.' ? [] : t.split('+').map((d) => sc[li + (+d) - 1]);
        const a = ARP[sec.arp][s];
        const arpN = a === '.' ? 0 : sc[ai + [0, 2, 4, 7][+a]];
        const b = BASS[sec.bass][s];
        const bassV = b === '.' ? 0 : bassN + BOFF[b];
        let d = 0;
        if (dr.k[s] === 'x') d |= 1;
        if (dr.s[s] === 'x') d |= 2;
        if (dr.h[s] === 'x') d |= 4;
        if (fill && s >= 12) { d = (d & 1) | 2; if (s === 12 || s === 14) d |= 4; }
        if (sec.crash && s === 0) d = 8 | 1;
        else if (bi === 0 && s === 0 && secName !== song.order[0] && sec.drums !== 'none') d = (d & ~4) | 8 | 1;
        steps.push({ lead, arp: arpN, bass: bassV, drum: d });
      }
      bar++;
    });
  }
  // lanes: rank the distinct lead pitches and split them into four equal groups
  const pitches = [...new Set(steps.flatMap((s) => s.lead))].sort((a, b) => a - b);
  const laneOf = (n) => Math.min(3, Math.floor((pitches.indexOf(n) * 4) / pitches.length));
  for (const s of steps) { s.lanes = 0; for (const n of s.lead) s.lanes |= 1 << laneOf(n); s.top = s.lead.length ? Math.max(...s.lead) : 0; }
  return { steps, pitches };
}

const meta = [];
const charts = [];
let svly = '// generated by tools/gen.mjs: do not edit\n';
SONGS.forEach((song, i) => {
  const { steps, pitches } = build(song);
  const bin = Buffer.alloc(steps.length * 5);
  steps.forEach((s, k) => {
    const lanes = song.title ? 0 : s.lanes;
    bin[k * 5] = lanes; bin[k * 5 + 1] = s.top; bin[k * 5 + 2] = s.arp; bin[k * 5 + 3] = s.bass; bin[k * 5 + 4] = s.drum;
  });
  fs.writeFileSync(path.join(ROOT, `assets/song${i}.bin`), bin);
  const notes = song.title ? 0 : steps.reduce((a, s) => a + [0, 1, 2, 3].filter((l) => s.lanes >> l & 1).length, 0);
  const secs = steps.length * song.sf / 60;
  const maxRun = (() => { let best = 0; for (let l = 0; l < 4; l++) { let last = -99; for (let k = 0; k < steps.length; k++) if (steps[k].lanes >> l & 1) { best = Math.max(best, k - last === 1 ? 1 : 0); last = k; } } return best; })();
  meta.push({ name: song.name, sf: song.sf, steps: steps.length, notes, secs: +secs.toFixed(1), bpm: +(3600 / song.sf / 4).toFixed(1), perSec: +(notes / secs).toFixed(2), pitches: pitches.length, maxRun });
  if (!song.title) charts.push({ name: song.name, sf: song.sf, wp: song.wp, wg: song.wg, lanes: steps.map((s) => s.lanes) });
  // peak notes in any one second
  let peak = 0; const w = Math.round(60 / song.sf);
  for (let k = 0; k + w <= steps.length; k++) peak = Math.max(peak, steps.slice(k, k + w).reduce((a, s) => a + [0, 1, 2, 3].filter((l) => s.lanes >> l & 1).length, 0));
  meta[i].peakPerSec = peak;
});
console.table(meta);

const col = (f) => meta.map(f).join(', ');
svly += `const NSONGS = 4;\nconst TITLE_SONG = 4;\n`;
svly += `table song_sf = { ${col((m) => m.sf)} };\n`;
svly += `table song_steps = { ${col((m) => m.steps)} };\n`;
svly += `table song_notes = { ${col((m) => m.notes)} };\n`;
svly += `table song_bpm = { ${col((m) => Math.round(m.bpm))} };\n`;
svly += `table song_stars = { ${SONGS.map((s) => s.stars).join(', ')} };\n`;
svly += `table song_wp = { ${SONGS.map((s) => s.wp).join(', ')} };\n`;
svly += `table song_wg = { ${SONGS.map((s) => s.wg).join(', ')} };\n`;
svly += `table song_pen = { ${SONGS.map((s) => s.pen).join(', ')} };\n`;
svly += `table song_m0 = { ${SONGS.map((s) => s.m0).join(', ')} };\n`;
svly += `table song_name = { ${SONGS.map((s) => '"' + s.name + '"').join(', ')} };\n`;
SONGS.forEach((s, i) => { svly += `asset song${i} bank ${3 + i} = incbin("../assets/song${i}.bin");\n`; });
svly += `func song_base(i) {\n`;
SONGS.forEach((s, i) => { svly += `  ${i ? 'else ' : ''}if (i == ${i}) { sbank = bankof(song${i}); select_bank(sbank); return song${i}; }\n`; });
svly += `  return song0;\n}\n`;
fs.writeFileSync(path.join(ROOT, 'src/songdata.vly'), svly);
fs.writeFileSync(path.join(ROOT, 'tests/charts.json'), JSON.stringify(charts));

// ---------------------------------------------------------------------------------------------------------------
// big letters: the 5x7 font drawn at 2x with a bold stroke, a gradient and a drop shadow, as 2x2-tile sprites
function bigGlyph(ch) {
  const g = FONT[ch];
  const px = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16 && px[y][x] === '.') px[y][x] = c; };
  const set = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) px[y][x] = c; };
  const on = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') on.push([c, r]);
  for (const [c, r] of on) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) put(2 + c * 2 + dx + 1, 1 + r * 2 + dy + 1, '1');   // shadow
  for (const [c, r] of on) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) set(2 + c * 2 + dx, 1 + r * 2 + dy, r < 4 ? '3' : '2');
  return px.map((row) => row.join(''));
}
const BIGCHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?-';
let bt = '# generated by tools/gen.mjs: big 16x16 letters\n';
for (const ch of BIGCHARS) {
  const name = ch === '!' ? 'bang' : ch === '?' ? 'ques' : ch === '-' ? 'dash' : ch;
  bt += `sprite big_${name} 2x2:\n` + bigGlyph(ch).map((r) => '  ' + r).join('\n') + '\n';
}
// lane labels, 16x8: left arrow, down arrow, B, A (colour 3 = the lane's bright colour)
function label(ch) {
  const g = FONT[ch]; const rows = [];
  for (let r = 0; r < 8; r++) { let row = '.'.repeat(16).split(''); for (let c = 0; c < 5; c++) if (g[r][c] === '1') { row[5 + c] = '3'; row[6 + c] = '3'; } rows.push(row.join('')); }
  return rows;
}
const ARROW_L = ['................', '.....3..........', '....33..........', '...3333333333...', '...3333333333...', '....33..........', '.....3..........', '................'];
const ARROW_D = ['......3333......', '......3333......', '...3333333333...', '....33333333....', '.....333333.....', '......3333......', '.......33.......', '................'];
const labs = { L: ARROW_L, D: ARROW_D, B: label('B'), A: label('A') };
for (const k of Object.keys(labs)) bt += `sprite lab_${k} 2x1:\n` + labs[k].map((r) => '  ' + r).join('\n') + '\n';
// 32x32 beat and bar lines (two of them span the four lanes)
{
  const mk = (rows) => { const g = Array.from({ length: 32 }, () => '.'.repeat(32)); for (const [r, ch] of rows) g[r] = ch.repeat(32); return g; };
  bt += 'sprite beat32 4x4:\n' + mk([[15, '1']]).map((r) => '  ' + r).join('\n') + '\n';
  bt += 'sprite bar32 4x4:\n' + mk([[14, '2'], [15, '3'], [16, '2']]).map((r) => '  ' + r).join('\n') + '\n';
}
// meter / progress bar cells: m0..m8 = that many pixel rows filled from the bottom (6 px wide)
for (let n = 0; n <= 8; n++) {
  const rows = [];
  for (let r = 0; r < 8; r++) rows.push(r >= 8 - n ? '.333333.' : '.2....2.');
  bt += `tile meter${n}:\n` + rows.map((r) => '  ' + r).join('\n') + '\n';
}
fs.writeFileSync(path.join(ROOT, 'assets/big.tiles'), bt);
console.log('ok');
