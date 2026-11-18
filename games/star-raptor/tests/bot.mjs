// A bot that plays STAR RAPTOR: holds fire, dodges bullets and enemies by looking ahead, bombs when cornered.
// It records its button presses as an input script so vly.json can replay a full winning run.
//   node tests/bot.mjs [startStage] [out.input] [maxFrames]
import fs from 'node:fs';
import { Machine } from '../../../src/core/machine.js';
import * as C from '../../../src/core/constants.js';

const startStage = Number(process.argv[2] || 0);
const maxF = Number(process.argv[4] || 40000);
const rom = new Uint8Array(fs.readFileSync(new URL('../build/star-raptor.vlc', import.meta.url).pathname));
const ram = JSON.parse(fs.readFileSync(new URL('../build/star-raptor.map.json', import.meta.url).pathname)).ram;
const saveIn = process.env.SAVE ? new Uint8Array(fs.readFileSync(process.env.SAVE)) : null;
let newSave = null;
const m = new Machine(rom, { save: saveIn, onSave: (bytes) => { newSave = bytes; } });
m.boot();
const s16 = (v) => (v << 16) >> 16;
const w = (n) => s16(m.read16(ram[n].addr));
const a = (n, i) => s16(m.read16(ram[n].addr + 2 * i));

function decide(f) {
  const st = w('state');
  if (w('fading')) return 0;
  if (st === 0) { if (f % 30 === 5 && f > 20) return C.BTN.START; return 0; }
  if (st === 1) { return (w('card_t') > 46 && f % 4 === 0) ? C.BTN.START : 0; }
  if (st === 5 || st === 7) return (f % 8 === 0) ? C.BTN.START : 0;
  if (st !== 2) return 0;
  const px = w('px'), py = w('py');
  let mask = C.BTN.A;
  // threats: [x, y, vx, vy, w, h] in pixels / pixels per frame
  const th = [];
  for (let i = 0; i < 14; i++) if (a('oon', i)) th.push([a('ox', i) / 16 + 2, a('oy', i) / 16 + 2, a('ovx', i) / 16, a('ovy', i) / 16, 4, 4]);
  let boss = -1;
  for (let i = 0; i < 8; i++) {
    const t = a('et', i); if (!t) continue;
    const ww = t === 5 ? 28 : 12;
    th.push([a('ex', i) / 16 + 2, a('ey', i) / 16 + 2, a('evx', i) / 16, a('evy', i) / 16, ww, t === 4 ? 10 : (t === 5 ? 28 : 12)]);
    if (t === 5) boss = i;
  }
  const dirs = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  const risk = (cx, cy) => {
    let r = 0;
    for (const [tx, ty, tvx, tvy, tw, thh] of th) {
      for (let k = 0; k <= 24; k += 3) {
        const x = tx + tvx * k, y = ty + tvy * k;
        const mx = cx + 5, my = cy + 5;
        const pad = k < 12 ? 3 : 1;
        if (x - pad < mx + 6 && x + tw + pad > mx && y - pad < my + 6 && y + thh + pad > my) { r += 100 - k * 2; break; }
      }
    }
    return r;
  };
  // target: align under the lowest enemy that is visible
  let tx = px + 8;
  let best = -1, by = -999;
  for (let i = 0; i < 8; i++) {
    const t = a('et', i); if (!t) continue;
    const y = a('ey', i) / 16;
    if (y > -4 && y < py && (t === 5 || y > by)) { best = i; by = y; if (t === 5) break; }
  }
  if (best >= 0) tx = a('ex', best) / 16 + (a('et', best) === 5 ? 16 : 8) + a('evx', best) / 16 * 6;
  let bestScore = 1e9, bestD = dirs[0];
  for (const [dx, dy] of dirs) {
    const nx = Math.max(0, Math.min(144, px + dx * 2 * 6)), ny = Math.max(24, Math.min(112, py + dy * 2 * 6));
    const ex = Math.max(0, Math.min(144, px + dx * 2)), ey = Math.max(24, Math.min(112, py + dy * 2));
    let sc = risk(ex, ey) + risk(nx, ny) * 0.5;
    sc += Math.abs(nx + 8 - tx) * 0.15 + Math.abs(ny - 100) * 0.12;
    if (sc < bestScore) { bestScore = sc; bestD = [dx, dy]; }
  }
  if (bestD[0] < 0) mask |= C.BTN.LEFT; if (bestD[0] > 0) mask |= C.BTN.RIGHT;
  if (bestD[1] < 0) mask |= C.BTN.UP; if (bestD[1] > 0) mask |= C.BTN.DOWN;
  if (risk(px, py) > 150 && w('bombs') > 0 && w('inv') === 0 && f % 3 === 0) mask |= C.BTN.B;
  return mask;
}

const names = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
const presses = [];
let last = 0, f = 0, lastState = -1, maxStage = 0, selDone = 0;
const log = [];
for (; f < maxF; f++) {
  let mask = decide(f);
  if (w('state') === 0 && startStage > 0 && !selDone && f > 10) { if (w('start_sel') < startStage && f % 6 === 1) mask = C.BTN.SELECT; else if (w('start_sel') >= startStage) selDone = 1; }
  if (w('state') === 0 && startStage > 0 && !selDone) mask &= ~C.BTN.START;
  m.runFrame(mask);
  if (mask !== last) { presses.push({ mask, from: f }); last = mask; }
  const st = w('state');
  if (st !== lastState) { log.push(`${f}: state ${st} stage ${w('stage')} loop ${w('loopn')} score ${w('score')} lives ${w('lives')} power ${w('power')}`); lastState = st; }
  if (st === 7 && f > 100 && !process.env.LOOP) { for (let k = 0; k < 90; k++) m.runFrame(0); f += 90; break; }
  if (st === 5 && f > 100) break;
}
presses.push({ mask: 0, from: f });
const segs = [];
for (let i = 0; i < presses.length - 1; i++) if (presses[i].mask) segs.push(`${names.filter((_, k) => presses[i].mask & (1 << k)).join('+')}@${presses[i].from}-${presses[i + 1].from - 1}`);
console.log(log.join('\n'));
console.log(`final: state ${w('state')} stage ${w('stage')} score ${w('score')} lives ${w('lives')} frames ${f} (${(f / 60).toFixed(0)} s)`);
if (process.env.OUTSAVE && newSave) fs.writeFileSync(process.env.OUTSAVE, newSave);
if (process.argv[3]) fs.writeFileSync(process.argv[3], `# recorded by tests/bot.mjs\n${segs.join(',\n')}\n`);
