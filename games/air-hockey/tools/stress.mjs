// Tunnelling / sanity stress test: throw the puck at maximum speed at walls, posts and mallets, with the mallet charging at it.
import { build, mulberry, makeReader, BTN } from './sim.mjs';
import { Machine } from '../../../src/core/machine.js';
const { rom, ram } = await build();
const m = new Machine(rom, {}); m.boot();
const rd = makeReader(m, ram);
const wr = (name, v, i = 0) => m.write16(ram[name].addr + i * 2, v & 0xffff);
const rnd = mulberry(+process.argv[3] || 11);
const TRIALS = +process.argv[2] || 2000;
let f = 0;
function press(b, n = 1) { for (let i = 0; i < n; i++) { m.runFrame(b); f++; } }
// get into PLAY
press(0, 5); press(BTN.START, 2); press(0, 30);
while (rd('state') !== 4 && f < 3000) { const st = rd('state'); press(st === 1 ? BTN.A : st === 2 ? BTN.A : 0, 1); if (f % 5) press(0); }
console.log('in play at frame', f, 'state', rd('state'));
const viol = []; const byKind = [0,0,0,0];
const res = { trials: 0, insideMallet: 0, outsideTable: 0, speedOver: 0, minDist: 99, goals: 0, maxSpeed: 0, wallHits: 0, mallHits: 0, postHits: 0 };
for (let t = 0; t < TRIALS; t++) {
  if (rd('state') !== 4) { wr('state', 4); wr('score', 0, 0); wr('score', 0, 1); wr('pend', 0xffff); }
  // random scenario
  const ang = rnd() * Math.PI * 2;
  const speed = (rnd() < 0.5 ? 5.4 : 2 + rnd() * 3.6) * 256;
  const kind = Math.floor(rnd() * 4);
  let px = 14 + rnd() * 132, py = 22 + rnd() * 108;
  const mxp = 18 + rnd() * 54, myp = 25 + rnd() * 102;
  if (kind === 0) { // straight at the player's mallet from the right
    px = mxp + 25 + rnd() * 40; py = myp + (rnd() - 0.5) * 14;
  } else if (kind === 1) { // into a corner / wall
    px = rnd() < 0.5 ? 20 + rnd() * 10 : 130 + rnd() * 18; py = rnd() < 0.5 ? 24 + rnd() * 8 : 120 + rnd() * 10;
  } else if (kind === 2) { // along the goal line, past the posts
    px = rnd() < 0.5 ? 14 + rnd() * 6 : 140 + rnd() * 6; py = rnd() < 0.5 ? 40 + rnd() * 14 : 98 + rnd() * 14;
  }
  wr('pux', px * 64); wr('puy', py * 64);
  let a = kind === 0 ? Math.PI + (rnd() - 0.5) * 0.5 : ang;
  wr('pvx', Math.round(Math.cos(a) * speed)); wr('pvy', Math.round(Math.sin(a) * speed));
  wr('mx', mxp * 64, 0); wr('my', myp * 64, 0); wr('mvx', 0, 0); wr('mvy', 0, 0);
  res.trials++;
  for (let k = 0; k < 90 && rd('state') === 4; k++) {
    // the player's mallet charges at the puck as fast as it can
    const dx = rd('pux') / 64 - rd('mx', 0) / 64, dy = rd('puy') / 64 - rd('my', 0) / 64;
    let b = 0; const tx = Math.min(dx, 73 - rd('mx', 0) / 64 + 40);
    if (dx > 1) b |= BTN.RIGHT; else if (dx < -1) b |= BTN.LEFT;
    if (dy > 1) b |= BTN.DOWN; else if (dy < -1) b |= BTN.UP;
    if (kind === 3) b = [BTN.UP, BTN.DOWN, BTN.LEFT, BTN.RIGHT, BTN.UP | BTN.RIGHT, BTN.DOWN | BTN.LEFT][Math.floor(rnd() * 6)];
    press(b, 1);
    if (rd('state') !== 4) { res.goals++; break; }
    const x = rd('pux') / 64, y = rd('puy') / 64;
    const sp = Math.hypot(rd('pvx'), rd('pvy')) / 256; if (sp > res.maxSpeed) res.maxSpeed = sp; if (sp > 5.52) res.speedOver++;
    if (y < 19.5 || y > 132.5 || x < 3 || x > 157 || ((x < 11.5 || x > 148.5) && (y < 48 || y > 104))) res.outsideTable++;
    for (let i = 0; i < 2; i++) { const d = Math.hypot(x - rd('mx', i) / 64, y - rd('my', i) / 64); if (d < res.minDist) res.minDist = d; if (d < 9.5) { res.insideMallet++; byKind[kind]++; if (viol.length < 12) viol.push({ kind, k, d: +d.toFixed(2), x: +x.toFixed(1), y: +y.toFixed(1), m: [rd('mx', i) / 64, rd('my', i) / 64].map((v) => +v.toFixed(1)), i, v: [rd('pvx')/256, rd('pvy')/256].map((v) => +v.toFixed(2)) }); } }
    if (rd('ev_mallet')) res.mallHits++; if (rd('ev_wall')) res.wallHits++; if (rd('ev_post')) res.postHits++;
  }
}
console.log(JSON.stringify(res)); console.log('byKind', byKind); console.log(viol.map((v) => JSON.stringify(v)).join('\n'));
