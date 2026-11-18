// Bots for NEBBLE: personas (how they care) and mini-game skill (delay, slips, jitter). Used by sim.mjs and the recorders.
import { runBot, mask } from '../../../src/tools/bot.js';
import { buildFile } from '../../../src/tools/build.js';

export const S = { TITLE: 0, NAME: 1, HATCH: 2, ROOM: 3, CATCH: 4, COPY: 5, HOP: 6, RESULT: 7, EVOLVE: 8, INFO: 9, PAUSE: 10 };
export async function buildGame(src = 'src/main.vly') { const b = await buildFile(src); return { rom: b.bytes, ram: b.stats.ram }; }

// tiny deterministic RNG for bots
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/**
 * persona: 'neglect' | 'attentive' | 'mixed' | 'snacker' | 'player' | 'sleeper' | 'trainer'
 * skill: { delay: frames the bot sees the world late, slip: chance of a wrong COPY press, jitter: +-frames of timing noise, comp: compensate for delay }
 */
export function makePolicy(o) {
  const rand = rng(o.seed || 1);
  const persona = o.persona;
  const skill = Object.assign({ delay: 8, slip: 0.03, jitter: 2, comp: true, gap: 14 }, o.skill || {});
  const q = [];                       // queued per-frame button masks
  const press = (m, n = 2, gap = 4) => { for (let i = 0; i < n; i++) q.push(m); for (let i = 0; i < gap; i++) q.push(0); };
  const wait = (n) => { for (let i = 0; i < n; i++) q.push(0); };
  const stats = { feed: 0, snack: 0, wash: 0, sleep: 0, play: [0, 0, 0], stars: [[], [], []], results: [] };
  const hist = [];                    // array snapshots for delayed observation
  let lastState = -1, mgInit = false, hopPlan = null;
  const ma = (a, b, n) => ((a - b) % n + n) % n;
  const navTo = (cur, want) => { let d = ma(want, cur, 5); if (d === 0) return; if (d <= 2) for (let i = 0; i < d; i++) press(mask('RIGHT')); else for (let i = 0; i < 5 - d; i++) press(mask('LEFT')); };

  function mgInitFor(read) { hist.length = 0; hopPlan = null; }
  function snapArrays(read) {
    const s = { ik: [], ix: [], iy: [], ok: [], ox: [], oh: [] };
    for (let i = 0; i < 6; i++) { s.ik.push(read('ik', i)); s.ix.push(read('ix', i)); s.iy.push(read('iy', i)); }
    for (let i = 0; i < 3; i++) { s.ok.push(read('ok_', i)); s.ox.push(read('ox', i)); s.oh.push(read('oh', i)); }
    hist.push(s); if (hist.length > 60) hist.shift();
    return hist[Math.max(0, hist.length - 1 - skill.delay)];
  }

  function catchPolicy(read) {
    const obs = snapArrays(read);
    const sz = read('stage') <= 1 ? 16 : 32;
    const cx = read('c_x');                         // own position: live
    const center = cx + sz / 2;
    let best = -1, by = -1;
    for (let i = 0; i < 6; i++) if (obs.ik[i] >= 1 && obs.ik[i] <= 3) { const y = obs.iy[i] >> 3; if (y > by) { by = y; best = i; } }
    let dir = 0;
    if (best >= 0) { const tx = obs.ix[best] + 4; if (tx > center + 3) dir = 1; else if (tx < center - 3) dir = -1; }
    // dodge rocks that are high enough to matter and in the way
    for (let i = 0; i < 6; i++) if (obs.ik[i] === 4) {
      const y = obs.iy[i] >> 3, rx = obs.ix[i] + 4;
      if (y > 40 && Math.abs(rx - (center + dir * 6)) < sz / 2 + 7) { dir = rx >= center ? -1 : 1; }
    }
    if (skill.jitter && rand() < 0.04 * skill.jitter) dir = Math.floor(rand() * 3) - 1;       // fumbles
    return dir < 0 ? mask('LEFT') : dir > 0 ? mask('RIGHT') : 0;
  }

  function copyPolicy(read, f) {
    if (read('mg_phase') !== 2 || q.length) return 0;
    const i = read('cp_i');
    let d = read('seq', i);
    if (rand() < skill.slip) d = (d + 1 + Math.floor(rand() * 3)) % 4;
    const names = ['UP', 'RIGHT', 'LEFT', 'DOWN'];
    press(mask(names[d]), 2, skill.gap + Math.floor(rand() * 8));
    return 0;
  }

  function hopPolicy(read) {
    const obs = snapArrays(read);
    const sp = read('h_speed') / 8;                   // px per frame
    const sz = read('stage') <= 1 ? 16 : 32;
    const bxr = 24 + sz / 2 + sz / 4;                 // right edge of the pet's box (h_x = 24)
    let jump = false;
    for (let i = 0; i < 3; i++) {
      const k = obs.ok[i];
      if (k !== 1 && k !== 2) continue;
      if (obs.oh[i]) continue;
      let dist = obs.ox[i] / 8 - bxr;                 // pixels until contact, as last seen
      if (skill.comp) dist -= sp * skill.delay;       // a bot that knows it is late looks ahead
      // jump a bit before contact: the airborne window is about 28 frames; start ~9 frames ahead of contact
      const lead = (9 - (skill.offset || 0)) * sp + (skill.jitter ? (rand() * 2 - 1) * skill.jitter * sp : 0);
      if (dist <= lead && dist > -10 && read('h_jy') === 0) jump = true;
    }
    return jump ? mask('A') : 0;
  }

  return {
    stats, skill,
    decide(f, read, api) {
      if (o.freeze && f % 300 === 0) { const w = (n, v) => api.machine.write16(api.ram[n].addr, v); w('age', 20); w('hun', 90); w('nrg', 90); w('cln', 90); w('mess', 0); w('n_neg', 0); }
      const st = read('state'), trans = read('trans');
      if (st !== lastState) { lastState = st; mgInit = false; q.length = 0; if (st >= S.CATCH && st <= S.HOP) mgInitFor(read); }
      if (q.length) return q.shift();
      if (trans !== 0 && st !== S.TITLE) return 0;
      const nowF = f;
      // ---- title / name / hatch ----
      if (st === S.TITLE) { if (trans === 0 && (nowF % 40) === 5) press(mask('START')); return 0; }
      if (st === S.NAME) { if (nowF % 30 === 0) press(mask('A')); return 0; }
      if (st === S.HATCH) { if (persona !== 'neglect' && nowF % 7 === 0) press(mask('A'), 1, 6); return 0; }
      if (st === S.EVOLVE) { if (read('evo_t') > 215 && nowF % 20 === 0) press(mask('A')); return 0; }
      if (st === S.RESULT) {
        if (read('mg_t') > 40) {
          const g = read('mg_id'); stats.stars[g].push(read('mg_stars')); stats.results.push([g, read('mg_score'), read('mg_stars')]);
          press(mask('A'));
        }
        return 0;
      }
      if (st === S.INFO) { press(mask('B')); return 0; }
      if (st === S.CATCH) return catchPolicy(read);
      if (st === S.COPY) return copyPolicy(read, f);
      if (st === S.HOP) return hopPolicy(read);
      if (st === S.PAUSE) { press(mask('START')); return 0; }
      if (st !== S.ROOM) return 0;
      // ---- the room: decide what to do ----
      if (read('sleeping')) { return 0; }
      if (read('act') !== 0) return 0;
      if (persona === 'neglect') return 0;
      const hun = read('hun'), fun = read('fun'), nrg = read('nrg'), cln = read('cln'), mess = read('mess');
      const mcur = read('mcur'), sub = read('sub');
      if (sub !== 0) { press(mask('B')); return 0; }
      const night = read('clk') >= 240;
      // care parameters per persona: when each need is attended to, and how
      const P = ({
        attentive: { feedAt: 55, food: 0, washAt: 55, sleepAt: 40, nightSleep: true, playAt: 60, pet: true },
        trainer: { feedAt: 55, food: 0, washAt: 55, sleepAt: 45, nightSleep: false, playAt: -1, pet: false },
        snacker: { feedAt: 60, food: 1, washAt: 55, sleepAt: 40, nightSleep: true, playAt: 60, pet: true },
        player: { feedAt: 55, food: 0, washAt: 55, sleepAt: 40, nightSleep: true, playAt: 92, pet: false },
        sleeper: { feedAt: 55, food: 0, washAt: 85, sleepAt: 75, nightSleep: true, playAt: 50, pet: false },
        mixed: { feedAt: 50, food: 0, washAt: 45, sleepAt: 35, nightSleep: true, playAt: 55, pet: true, ignore: 0.45 },
        casual: { feedAt: 40, food: 0, washAt: 35, sleepAt: 30, nightSleep: false, playAt: 50, pet: true, ignore: 0.7 },
        forgetful: { feedAt: 30, food: 0, washAt: 25, sleepAt: 20, nightSleep: false, playAt: 40, pet: false, ignore: 0.85 },
      })[persona];
      const react = () => !P.ignore || rand() >= P.ignore;
      const eat = () => { navTo(mcur, 0); press(mask('A')); if (P.food === 1) press(mask('RIGHT')); press(mask('A')); if (P.food === 1) stats.snack++; else stats.feed++; };
      const playG = (g) => { navTo(mcur, 1); press(mask('A')); for (let i = 0; i < g; i++) press(mask('RIGHT')); press(mask('A')); stats.play[g]++; };
      if (hun < P.feedAt && react()) { eat(); return 0; }
      if ((mess > 0 || cln < P.washAt) && react()) { navTo(mcur, 3); press(mask('A')); stats.wash++; return 0; }
      if ((nrg < P.sleepAt || (P.nightSleep && night && nrg < 92)) && react()) { navTo(mcur, 2); press(mask('A')); stats.sleep++; return 0; }
      if (persona === 'trainer') { playG(o.game || 0); return 0; }
      if (fun < P.playAt && hun >= 25 && nrg >= 25 && react()) { playG(o.game !== undefined ? o.game : Math.floor(rand() * 3)); return 0; }
      if (P.pet && fun < 80 && f % 300 === 0) { press(mask('B')); }
      return 0;
    },
  };
}

// run one session (power on, play, power off); returns { r, policy, save }
export async function session(game, o, save, frames) {
  const policy = o.policy || makePolicy(o);
  const r = await runBot({ rom: game.rom, ram: game.ram, save, decide: policy.decide, maxFrames: frames, delay: 0, done: o.done });
  return { r, policy };
}
