// A bot that races Hill Racer: gas always, turbo when the engine is cool, and in the air it tilts to match the slope it will land on.
// It records its button presses as an input script, so the game's tests can replay a full, winnable race of each track:
//   node tests/bot.mjs 0 tests/track1.input                       (track 1: record the race, and write the save after the win)
//   SAVE=tests/after-track1.sav node tests/bot.mjs 1 tests/track2.input
// Run it again whenever the physics or the tracks change on purpose, and check that every track is still winnable.
import fs from 'node:fs';
import { Machine } from '../../../src/core/machine.js';
import * as C from '../../../src/core/constants.js';
import { buildFile } from '../../../src/tools/build.js';

const track = Number(process.argv[2] || 0);
const b = await buildFile(new URL('../src/main.vly', import.meta.url).pathname);
const ram = b.stats.ram;
const save = process.env.SAVE ? new Uint8Array(fs.readFileSync(process.env.SAVE)) : null;
let newSave = null;
const m = new Machine(b.bytes, { save, onSave: (bytes) => { newSave = bytes; } });
m.boot();
const w = (n) => (m.read16(ram[n].addr) << 16) >> 16;                       // a variable, as a signed word
const hgt = (c) => m.read8(ram.hgt.addr + c);
const ground = (x) => {                                                       // the same function the game uses
  const c = Math.max(0, x) >> 3, len = w('len');
  if (c >= len - 1) return hgt(len - 1);
  const a = hgt(c), d = hgt(c + 1);
  return a + Math.trunc(((d - a) * (Math.max(0, x) & 7)) / 8);
};
const pitchAt = (x) => Math.trunc(Math.max(-6, Math.min(6, ground(x + 8) - ground(x - 8))) / 3);

const decide = (f) => {
  const st = w('state');
  let mask = 0;
  if (st === 0) {                                                             // the title: pick the track, then START
    if (track > 0 && f < 6 * track && f % 6 === 3) mask = C.BTN.RIGHT;
    if (f === 6 * track + 20) mask = C.BTN.START;
  } else if (st === 3 || st === 5) {                                          // racing (or recovering from a crash)
    mask |= C.BTN.A;
    if (!w('hot') && w('heat') < 120 && w('onground')) mask |= C.BTN.B;
    if (!w('onground')) {
      const target = pitchAt(w('tx') + 26), pitch = w('pitch');
      if (pitch > target) mask |= C.BTN.LEFT; else if (pitch < target) mask |= C.BTN.RIGHT;
    }
  }
  return mask;
};

const names = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
const presses = [];
let last = 0, done = -1, f = 0;
for (; f < 12000; f++) {
  const mask = decide(f);
  m.runFrame(mask);
  if (mask !== last) { presses.push({ mask, from: f }); last = mask; }
  if (w('state') === 6 && done < 0) done = f;
  if (done >= 0 && f > done + 60) break;
}
presses.push({ mask: 0, from: f });
const segs = [];
for (let i = 0; i < presses.length - 1; i++) if (presses[i].mask) segs.push(`${names.filter((_, k) => presses[i].mask & (1 << k)).join('+')}@${presses[i].from}-${presses[i + 1].from - 1}`);
console.log(`track ${track + 1}: state ${w('state')}, place ${w('place')}, time ${w('t_total')} frames (${(w('t_total') / 60).toFixed(1)} s), ${f} frames in all, penalty ${w('penalty')}`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], `# recorded by tests/bot.mjs: the bot races track ${track + 1} and wins\n${segs.join(',\n')}\n`);
if (process.env.OUTSAVE && newSave) fs.writeFileSync(process.env.OUTSAVE, newSave);
