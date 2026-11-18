// A fast headless harness: builds the game once, then plays whole matches with a bot (the player) against the CPU.
//   import { build, playMatch } from './sim.mjs'
import { Machine } from '../../../src/core/machine.js';
import { buildFile } from '../../../src/tools/build.js';
import * as C from '../../../src/core/constants.js';

const NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
export const BTN = Object.fromEntries(NAMES.map((n, i) => [n, 1 << i]));
export async function build(src = 'src/main.vly') { const b = await buildFile(src); return { rom: b.bytes, ram: b.stats.ram }; }

export function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function makeReader(m, ram) {
  return (name, i = 0) => {
    const r = ram[name]; if (!r) throw new Error('no variable ' + name);
    return r.type === 'byte[]' ? m.read8(r.addr + i) : (m.read16(r.addr + i * 2) << 16) >> 16;
  };
}

// The player's policy. params: delay (frames the puck is seen late), aimErr (px), noise (probability of a random wrong button per frame), spd (0..1 of full mallet speed via pwm)
export function makeBot(rd, P, rnd) {
  const hist = [];
  let stuck = 0, aimN = 0, aimT = 0, ch = 0, lastHit = 0;
  return function decide() {
    const mxp = rd('mx', 0) / 64, myp = rd('my', 0) / 64, mvx = rd('mvx', 0) / 256, mvy = rd('mvy', 0) / 256;
    hist.push([rd('pux') / 64, rd('puy') / 64]); if (hist.length > 60) hist.shift();
    const D = Math.min(P.delay, hist.length - 1);
    let [ox, oy] = hist[hist.length - 1 - D];
    const [px3, py3] = hist[Math.max(0, hist.length - 1 - D - 3)];
    const ovx = (ox - px3) / 3, ovy = (oy - py3) / 3;
    const sp = Math.hypot(ovx, ovy);
    if (aimT-- <= 0) { aimT = 20 + Math.floor(rnd() * 20); aimN = (rnd() * 2 - 1) * P.aimErr; }
    const cpuY = rd('my', 1) / 64;
    let tx = 26, ty = 76, charge = false;
    const attack = ox < 84 && sp < 2.5;
    if (attack) {
      stuck++;
      if (P.predict) { ox = Math.min(Math.max(ox + ovx * (D + 12), 14), 74); oy = Math.min(Math.max(oy + ovy * (D + 12), 22), 130); }
      let ax = 152, ay = 76 + aimN;
      if (P.corner) ay = (cpuY > 76 ? 58 : 94) + aimN;
      if (P.bank && Math.abs(cpuY - 76) < 24) ay = cpuY > 76 ? -36 + aimN / 2 : 188 + aimN / 2;
      let dxv = ax - ox, dyv = ay - oy, h = Math.hypot(dxv, dyv) || 1, ux = dxv / h, uy = dyv / h;
      { const u0x = ux, u0y = uy; for (const ang of [0, 40, -40, 80, -80, 120, -120]) { const c = Math.cos(ang * Math.PI / 180), s = Math.sin(ang * Math.PI / 180); ux = u0x * c - u0y * s; uy = u0x * s + u0y * c; const wx = ox - 19 * ux, wy = oy - 19 * uy; if (Math.abs(Math.min(Math.max(wx, 15), 73) - wx) <= 3 && Math.abs(Math.min(Math.max(wy, 24), 128) - wy) <= 3) break; } }
      const rx = mxp - ox, ry = myp - oy;
      const along = rx * ux + ry * uy, perp = ry * ux - rx * uy;
      const side = perp < 0 ? -1 : 1;
      if (stuck > 220) { tx = 26; ty = 76; if (stuck > 270) stuck = 0; }
      else if (ch > 0 && along < 8) { ch--; tx = ox + 16 * ux; ty = oy + 16 * uy; charge = true; }
      else if (along < -12 && Math.abs(perp) < 9) { ch = 24; tx = ox + 16 * ux; ty = oy + 16 * uy; charge = true; }
      else if (along < -12) { tx = ox - 19 * ux; ty = oy - 19 * uy; }
      else if (Math.abs(perp) < 14 && along > -4) { tx = ox - side * 24 * uy; ty = oy + side * 24 * ux; }
      else { tx = ox - 16 * ux - side * 20 * uy; ty = oy - 16 * uy + side * 20 * ux; }
      tx = Math.min(Math.max(tx, 15), 73); ty = Math.min(Math.max(ty, 24), 128);
    } else {
      stuck = 0; ch = 0;
      if (ovx < -0.33) {
        let y = oy;
        if (P.predict) { const dxp = ox - 26; const t = dxp / -ovx; y = oy + ovy * t; let rel = Math.abs(y - 20); rel %= 224; if (rel > 112) rel = 224 - rel; y = rel + 20; }
        ty = Math.min(Math.max(y + (rnd() * 2 - 1) * P.err, 24), 128); tx = 26;
        if (P.counter && ox < 50 && Math.abs(oy - myp) < 13) { tx = ox + 20; ty = oy; }
      } else { ty = 76 + (oy - 76) / 3; tx = 26; }
    }
    decide.dbg = { tx, ty, ch, stuck, attack, ox, oy, sp };
    const lead = charge ? 2 : 5;
    const ux2 = tx - mxp - mvx * lead, uy2 = ty - myp - mvy * lead;
    let b = 0;
    const dz = charge ? 1.0 : 1.5;
    if (ux2 > dz) b |= BTN.RIGHT; else if (ux2 < -dz) b |= BTN.LEFT;
    if (uy2 > dz) b |= BTN.DOWN; else if (uy2 < -dz) b |= BTN.UP;
    if (rnd() < P.noise) b = [0, BTN.UP, BTN.DOWN, BTN.LEFT, BTN.RIGHT][Math.floor(rnd() * 5)];
    return b;
  };
}

// Play one whole match. opts: level, startAt (frame of the first START), bot params, maxFrames, record (return the input script), seed
export function playMatch(rom, ram, opts) {
  const m = new Machine(rom, {}); m.boot();
  const rd = makeReader(m, ram);
  if (opts.unlock) m.write16(ram.rec_w.addr + 4, 1);
  const rnd = mulberry(opts.seed ?? 1);
  const decide = makeBot(rd, opts.bot, rnd);
  const startAt = opts.startAt ?? 20;
  const level = opts.level;
  const segs = []; let last = 0, lastFrom = 0;
  const stats = { goalsFor: 0, goalsAgainst: 0, frames: 0, goalFrames: [], maxPuck: 0, faults: 0, insane: 0, hits: 0 };
  let prevScore = [0, 0], lastGoalFrame = 0, f = 0, menuMoves = 0, winAt = -1;
  const max = opts.maxFrames ?? 60000;
  for (; f < max; f++) {
    const st = rd('state');
    let b = 0;
    if (st === 0) { if (f >= startAt && f < startAt + 3) b = BTN.START; }
    else if (st === 1) {
      const sel = rd('sel');
      if (sel !== level && (f % 6) === 0) b = BTN.DOWN; else if (sel === level && (f % 6) === 0) b = BTN.A;
    } else if (st === 2) { b = (rd('st_t') > 25 && f % 4 === 0) ? BTN.A : 0; }
    else if (st === 4) b = decide();
    else if (st === 7) { winAt = winAt < 0 ? f : winAt; if (f > winAt + 90) break; }
    if (st !== 4) { decide.length; }
    m.runFrame(b);
    if (b !== last) { if (last) segs.push(`${NAMES.filter((_, k) => last & (1 << k)).join('+')}@${lastFrom}-${f - 1}`); last = b; lastFrom = f; }
    if (rd('state') === 4 || rd('state') === 5) {
      const sp = Math.hypot(rd('pvx') / 256, rd('pvy') / 256); if (sp > stats.maxPuck) stats.maxPuck = sp;
      if (opts.sanity && rd('state') === 4) {
        const px = rd('pux') / 64, py = rd('puy') / 64;
        let bad = false;
        if (py < 19 || py > 133 || px < 3 || px > 157) bad = true;
        if ((px < 11 || px > 149) && (py < 48 || py > 104)) bad = true;
        for (let i = 0; i < 2; i++) { const d = Math.hypot(px - rd('mx', i) / 64, py - rd('my', i) / 64); if (d < 9.5) bad = true; }
        if (bad) stats.insane++;
      }
    }
    const s0 = rd('score', 0), s1 = rd('score', 1);
    if (s0 !== prevScore[0] || s1 !== prevScore[1]) { stats.goalFrames.push(f - lastGoalFrame); lastGoalFrame = f; prevScore = [s0, s1]; }
  }
  if (last) segs.push(`${NAMES.filter((_, k) => last & (1 << k)).join('+')}@${lastFrom}-${f - 1}`);
  stats.frames = f;
  const score = [rd('score', 0), rd('score', 1)];
  return { score, state: rd('state'), won: score[0] >= 7, lost: score[1] >= 7, stats, input: segs.join(',\n') + '\n', machine: m, rd, faults: m.faults ?? null };
}

// three bot "humans": how late they see the puck, how well they predict, aim and defend
export const BOTS = {
  novice:  { delay: 22, aimErr: 22, noise: 0.04, predict: 0, bank: 0, counter: 0, err: 16, corner: 0 },
  average: { delay: 14, aimErr: 12, noise: 0.015, predict: 1, bank: 0, counter: 0, err: 9, corner: 1 },
  expert:  { delay: 8, aimErr: 6, noise: 0.005, predict: 1, bank: 1, counter: 1, err: 4, corner: 1 },
};
