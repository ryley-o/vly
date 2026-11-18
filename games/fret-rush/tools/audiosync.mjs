// Measures when sound starts relative to the song clock: for every frame it reads `st` and the audio registers, and lists the frames
// where a channel turned on (or changed pitch up), with st at that frame. Also reports the peak output level of the synthesized audio.
import fs from 'node:fs';
import path from 'node:path';
const HOME = process.env.VLY_HOME || new URL('../../..', import.meta.url).pathname;
const { Machine } = await import(path.join(HOME, 'src/core/machine.js'));
const { Synth } = await import(path.join(HOME, 'src/core/audio.js'));
const { buildFile } = await import(path.join(HOME, 'src/tools/build.js'));
const C = await import(path.join(HOME, 'src/core/constants.js'));
const b = await buildFile(process.argv[2]);
const ram = b.stats.ram;
const m = new Machine(b.bytes); m.boot();
const synth = new Synth(m.mem);
const script = fs.readFileSync(process.argv[3], 'utf8').split(/[\n,]/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
const NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
const frames = +process.argv[4] || 900;
const inp = new Array(frames).fill(0);
for (const seg of script) { const [btn, rng] = seg.split('@'); const [a, z] = rng.split('-').map(Number); const mk = btn.split('+').reduce((x, n) => x | (1 << NAMES.indexOf(n)), 0); for (let f = a; f <= (z ?? a) && f < frames; f++) inp[f] |= mk; }
const rd = (n) => (m.read16(ram[n].addr) << 16) >> 16;
let peak = 0; const on = [false, false, false, false]; const out = [];
for (let f = 0; f < frames; f++) {
  m.runFrame(inp[f]);
  const s = synth.render(735); for (const v of s) peak = Math.max(peak, Math.abs(v));
  const st = rd('st'), state = rd('state');
  for (let c = 0; c < 4; c++) {
    const ctl = m.mem[C.AUDIO + c * 4 + 3], vol = m.mem[C.AUDIO + c * 4 + 2];
    const isOn = (ctl & 0x80) !== 0 && vol > 0;
    if (isOn && !on[c]) out.push({ frame: f, state, st, ch: c, vol });
    on[c] = isOn;
  }
}
console.log('peak sample', peak.toFixed(3));
const play = out.filter((o) => o.state === 2);
console.log('first 24 note-ons during play (frame, st, channel):');
console.log(play.slice(0, 24).map((o) => `f${o.frame} st=${o.st} ch${o.ch}`).join('\n'));
