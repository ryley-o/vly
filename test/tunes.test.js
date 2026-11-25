import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildFile } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';
import { loadTunes, findTunes, getTune, vocabulary, tuneSong, tuneSource, stepsPerBar } from '../src/tools/tunes.js';
import { parseMidi, midiToSong, songToVly, noteName } from '../src/tools/midi.js';

const lib = loadTunes();
const sum = (ev) => ev.reduce((a, [, d]) => a + d, 0);

test('the tune library: every entry has provenance, sane music data and equal-length voices', () => {
  assert.ok(lib.tunes.length >= 70, `${lib.tunes.length} tunes`);
  const ids = new Set();
  for (const t of lib.tunes) {
    assert.ok(/^[a-z0-9-]+$/.test(t.id) && !ids.has(t.id), `unique slug ${t.id}`); ids.add(t.id);
    assert.match(t.sourceUrl, /^https:\/\/www\.mutopiaproject\.org\/cgibin\/piece-info\.cgi\?id=\d+$/, t.id);
    assert.match(t.license, /^Public Domain/, t.id);
    for (const k of ['title', 'composer', 'note', 'key', 'meter']) assert.ok(String(t[k]).length > 2, `${t.id} has ${k}`);
    assert.ok(t.tags.length >= 2 && t.scenes.length >= 2, `${t.id} has moods and scenes`);
    assert.ok(t.energy >= 1 && t.energy <= 5, t.id);
    assert.ok(t.seconds >= 20 && t.seconds <= 90, `${t.id} lasts ${t.seconds} s`);
    assert.ok(t.framesPerStep >= 1 && t.framesPerStep <= 60, t.id);
    const total = stepsPerBar(t) * t.bars;
    for (const v of ['lead', 'bass', 'arp']) {
      assert.equal(sum(t[v]), total, `${t.id}: ${v} covers ${total} steps (a voice that is shorter drifts when the song loops)`);
      for (const [n, d] of t[v]) assert.ok(Number.isInteger(n) && n >= 0 && n <= 60 && Number.isInteger(d) && d >= 1 && d <= 250, `${t.id} ${v} pair ${n},${d}`);
    }
    assert.ok(t.lead.filter(([n]) => n).length >= 12, `${t.id} has a melody`);
    assert.ok(t.restShare < 0.6, `${t.id} is not mostly rests`);
    const low = t.bass.filter(([n]) => n).map(([n]) => n);
    assert.ok(low.every((n) => n >= 10), `${t.id}: the bass stays at A2 or above (a 40 mm speaker has nothing lower)`);
  }
});

test('known melodies start with the right notes (checks the converter against tunes anyone can hum)', () => {
  const head = (id, n) => getTune(id).lead.filter(([x]) => x).slice(0, n).map(([x]) => noteName(x + 35).replace('#', 's'));
  assert.deepEqual(head('ode-to-joy', 15), 'B4 B4 C5 D5 D5 C5 B4 A4 G4 G4 A4 B4 B4 A4 A4'.replace(/#/g, 's').split(' '));
  assert.deepEqual(head('bach-minuet-in-g', 8), 'D5 G4 A4 B4 C5 D5 G4 G4'.split(' '));
  assert.deepEqual(head('rondo-alla-turca', 5), 'B4 A4 Gs4 A4 C5'.split(' '));
});

test('findTunes filters by scene, mood, energy and composer, and vocabulary lists the words', () => {
  assert.ok(findTunes({ scene: 'boss' }).length >= 5);
  assert.ok(findTunes({ scene: 'boss', energy: '4-5' }).every((t) => t.energy >= 4));
  assert.ok(findTunes({ scene: 'night', energy: '1' }).every((t) => t.energy === 1));
  assert.ok(findTunes({ composer: 'joplin' }).length >= 5);
  assert.ok(findTunes({ mood: 'waltz' }).length >= 3);
  assert.equal(findTunes({ q: 'zzzz-no-such' }).length, 0);
  assert.throws(() => findTunes({ energy: 'loud' }), /energy/);
  const v = vocabulary();
  assert.ok(v.scenes.some(([w]) => w === 'title') && v.tags.some(([w]) => w === 'march'));
  const used = new Set(lib.tunes.flatMap((t) => t.scenes));
  for (const w of ['title', 'hub', 'boss', 'chase', 'victory', 'ending', 'calm', 'night']) assert.ok(used.has(w), `a tune for ${w}`);
});

test('tuneSong cuts bars, transposes, retimes, and refuses what the machine cannot play', () => {
  const t = getTune('ode-to-joy');
  const spb = stepsPerBar(t);
  const s = tuneSong(t, { bars: '2-3' });
  assert.equal(s.bars, 2); assert.equal(sum(s.lead), 2 * spb); assert.equal(sum(s.bass), 2 * spb); assert.equal(sum(s.arp), 2 * spb);
  const up = tuneSong(t, { bars: '1-1', transpose: 2 });
  assert.equal(up.lead[0][0], t.lead[0][0] + 2);
  assert.throws(() => tuneSong(t, { transpose: 40 }), /outside the machine's range/);
  assert.throws(() => tuneSong(t, { bars: '3-99' }), /bars 1-16/);
  assert.throws(() => tuneSong(t, { bars: 'x' }), /bars looks like/);
  assert.equal(tuneSong(t, { fps: 10 }).framesPerStep, 10);
  assert.equal(tuneSong(t, { bpm: 200 }).framesPerStep, Math.round(3600 / (200 * t.grid)));
  assert.equal(tuneSong(t, { arp: false }).arp, null);
});

test('every tune compiles, plays on the machine without a fault and is audible', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-tunes-'));
  try {
    for (const t of lib.tunes) {
      fs.writeFileSync(path.join(dir, 'main.vly'), `import "std/music";\n${tuneSource(t, { name: 'song' })}\nfunc init() { master_volume(10); song_play(); }\nfunc frame() { music_update(); }\n`);
      const b = await buildFile(path.join(dir, 'main.vly'));
      const r = runCartridge(b.bytes, { frames: 240, audio: true });
      assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 }, t.id);
      assert.ok(r.audio.some((v) => Math.abs(v) > 0.02), `${t.id} is audible`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('vly tune: list, filter, show, write a file, and helpful errors', () => {
  const run = (...a) => spawnSync('node', ['cli/vly.js', 'tune', ...a], { encoding: 'utf8' });
  const list = run('--scene', 'water');
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /fits: .*water/);
  assert.match(run('--tags').stdout, /scenes: .*explore/);
  const one = run('gymnopedie-1', '--bars', '5-8', '--name', 'gym');
  assert.equal(one.status, 0, one.stderr);
  assert.match(one.stdout, /btable gym_lead = \{/); assert.match(one.stdout, /func gym_play\(\)/); assert.match(one.stdout, /public-domain composition by E\. Satie/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-tune-cli-'));
  const out = path.join(dir, 'sub', 'song.vly');
  const w = run('ode-to-joy', '--out', out);
  assert.equal(w.status, 0, w.stderr); assert.match(fs.readFileSync(out, 'utf8'), /btable ode_to_joy_lead/);
  fs.rmSync(dir, { recursive: true, force: true });
  const bad = run('ode-to-joi');
  assert.notEqual(bad.status, 0); assert.match(bad.stderr + bad.stdout, /did you mean ode-to-joy/);
  const json = JSON.parse(run('--energy', '5', '--json').stdout);
  assert.ok(JSON.stringify(json).includes('pathetique-1') && !JSON.stringify(json).includes('"lead"'), 'the json listing carries no note data');
  assert.notEqual(run('--energy', 'loud').status, 0);
});

test('the MIDI converter: a small hand-made file becomes lead, bass and arpeggio of equal length', () => {
  // format 0, 480 ticks per quarter, 4/4, 120 bpm: C5 E5 G5 C6 over a C3 bass, one bar
  const ev = []; const vl = (n) => { const o = [n & 127]; while ((n >>= 7)) o.unshift((n & 127) | 128); return o; };
  const add = (dt, ...b) => ev.push(...vl(dt), ...b);
  add(0, 0xff, 0x58, 4, 4, 2, 24, 8); add(0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20);
  add(0, 0x90, 48, 80);
  [72, 76, 79, 84].forEach((p, i) => { add(i ? 0 : 0, 0x90, p, 80); add(480, 0x80, p, 0); });
  add(0, 0x80, 48, 0); add(0, 0xff, 0x2f, 0);
  const trk = Buffer.from(ev);
  const head = Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xe0]);
  const tk = Buffer.concat([Buffer.from('MTrk'), Buffer.from([(trk.length >> 24) & 255, (trk.length >> 16) & 255, (trk.length >> 8) & 255, trk.length & 255]), trk]);
  const bytes = new Uint8Array(Buffer.concat([head, tk]));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-midi-'));
  fs.writeFileSync(path.join(dir, 'My Tune.mid'), bytes);
  const cli = spawnSync('node', ['cli/vly.js', 'tune', '--midi', path.join(dir, 'My Tune.mid'), '--bars', '1-1', '--name', 'my tune'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /btable my_tune_lead = \{ 37,2, 41,2, 44,2, 49,2, 255 \};/); assert.match(cli.stdout, /first notes: C5 E5 G5 C6/);
  assert.notEqual(spawnSync('node', ['cli/vly.js', 'tune', '--midi', path.join(dir, 'nope.mid')], { encoding: 'utf8' }).status, 0);
  fs.rmSync(dir, { recursive: true, force: true });
  const m = parseMidi(bytes);
  assert.equal(m.timesigs[0].num, 4);
  const song = midiToSong(bytes, { grid: 2 });
  assert.deepEqual(song.lead.filter(([n]) => n).map(([n]) => n), [37, 41, 44, 49]);
  assert.equal(sum(song.lead), sum(song.bass)); assert.equal(sum(song.lead), sum(song.arp));
  assert.match(songToVly(song, 'x'), /btable x_lead = \{ 37,2, 41,2, 44,2, 49,2, 255 \};/);
});

test('the guide: the example in docs/ref-classics.md works end to end, and every tune it names exists', async () => {
  const doc = fs.readFileSync('docs/ref-classics.md', 'utf8');
  assert.ok(doc.includes(`library of ${lib.tunes.length} classical`), 'the guide states the number of tunes');
  const ids = new Set(lib.tunes.map((t) => t.id));
  for (const line of doc.split('\n').filter((l) => l.startsWith('| **'))) for (const [, id] of line.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)+)`/g)) assert.ok(ids.has(id), `the guide names "${id}", which is not in the library`);
  for (const [, id] of doc.matchAll(/vly tune ([a-z0-9]+(?:-[a-z0-9]+)+)/g)) assert.ok(ids.has(id), `the guide runs vly tune ${id}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-classics-'));
  try {
    const w = spawnSync('node', [path.resolve('cli/vly.js'), 'tune', 'gymnopedie-1', '--bars', '5-12', '--transpose', '-2', '--name', 'night_theme', '--out', 'night_theme.vly'], { cwd: dir, encoding: 'utf8' });
    assert.equal(w.status, 0, w.stderr);
    fs.writeFileSync(path.join(dir, 'main.vly'), `import "std/music";\nimport "night_theme.vly";\nfunc start_night() { music_stop_all(); night_theme_play(); music_duty(0, 1); }\nfunc init() { master_volume(10); start_night(); }\nfunc frame() { music_update(); }\n`);
    const b = await buildFile(path.join(dir, 'main.vly'));
    const r = runCartridge(b.bytes, { frames: 300, audio: true });
    assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 });
    assert.ok(r.audio.some((v) => Math.abs(v) > 0.02), 'audible');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
