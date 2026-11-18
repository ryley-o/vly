// A bot that plays all three stages of NINJA CHEF and records its presses.
//   node tests/bot.mjs [delay=0] [out=tests/win.input] [maxFrames=60000]
// delay: the bot sees the game as it was `delay` frames ago (12 = a quick child, 24 = a slow one). Arrays are delayed too (own history).
import { runBot, mask } from '../../../src/tools/bot.js';
import fs from 'node:fs';
const DELAY = +(process.argv[2] ?? 0), OUT = process.argv[3] ?? 'tests/win.input', MAXF = +(process.argv[4] ?? 60000);
const SCAL = ['state', 'level', 'px', 'py', 'vx', 'vy', 'grounded', 'cam', 'bon', 'bk', 'bx', 'by', 'bst', 'bhp', 'hearts', 'lives', 'face', 'ings', 'chili'];
const ARR = [['ek', 8], ['ex', 8], ['ey', 8], ['pon', 4], ['pxx', 4], ['pyy', 4], ['kon', 2]];
const hist = []; let prevA = 0, log = [], lastState = -1, lastLevel = -1, lastLives = 3;
const r = await runBot({
  source: 'src/main.vly',
  maxFrames: MAXF,
  after: 200,
  decide: (f, read, api) => {
    const live = (n, i) => read(n, i);
    const st = live('state');
    if (st !== lastState || live('level') !== lastLevel || live('lives') !== lastLives) { log.push(`f${f} state=${st} level=${live('level')} lives=${live('lives')} hearts=${live('hearts')} ings=${live("ings")} px=${live("px")} py=${live("py")} bon=${live("bon")} bk=${live("bk")} bhp=${live("bhp")}`); lastState = st; lastLevel = live('level'); lastLives = live('lives'); }
    const snap = { lv: null };
    for (const n of SCAL) snap[n] = live(n);
    for (const [n, c] of ARR) { snap[n] = []; for (let i = 0; i < c; i++) snap[n].push(live(n, i)); }
    hist.push(snap); if (hist.length > DELAY + 2) hist.shift();
    const s = hist[Math.max(0, hist.length - 1 - DELAY)];
    if (st === 0) return f % 40 === 20 ? mask('START') : 0;
    if (st === 6) return f % 30 < 2 ? mask('START') : 0;
    if (st === 5) return f % 30 < 2 ? mask('START') : 0;
    if (st !== 2) return 0;
    const cell = (tx, ty) => (tx < 0 || tx >= 240) ? 1 : (ty < 0 || ty >= 17) ? 0 : live('lv', tx * 17 + ty);
    const solid = (tx, ty) => { const c = cell(tx, ty); return c >= 1 && c <= 4; };
    const below = (x) => { const fr = (s.py + 16) >> 3; for (let d = 0; d < 3; d++) if (solid(x >> 3, fr + d)) return true; return false; };
    let right = 1, left = 0, jump = 0, shoot = 0;
    const px = live('px'), py = live('py');
    const grounded = live('grounded');
    // terrain
    if (grounded) {
      if (!below(px + 15)) jump = 1;
      for (let d = 10; d <= 22; d += 4) { const x = (px + 4 + d) >> 3; for (let ty = (py + 3) >> 3; ty <= (py + 14) >> 3; ty++) if (solid(x, ty) && cell(x, ty) !== 4) jump = 1; if (cell(x, (py + 15) >> 3) === 5 || cell(x, (py + 11) >> 3) === 5) jump = 1; }
    }
    // enemies and fireballs
    for (let i = 0; i < 8; i++) {
      if (!s.ek[i]) continue;
      const dx = s.ex[i] - px, dy = s.ey[i] - py;
      if (s.ek[i] === 3) { if (dx > 0 && dx < 90 && dy > -34 && dy < 6) shoot = 1; if (dx > 0 && dx < 26 && dy > -4 && dy < 12) jump = 1; }
      else { if (dx > 14 && dx < 100 && Math.abs(dy) < 10) shoot = 1; if (dx > 4 && dx < 40 && Math.abs(dy) < 14) jump = 1; }
    }
    for (let i = 0; i < 4; i++) if (s.pon[i]) { const dx = s.pxx[i] - px, dy = s.pyy[i] - (py + 8); if (Math.abs(dy) < 14 && Math.abs(dx) < 46) { if (dx < 0 && dx > -40) { /* behind */ } else jump = 1; } }
    // bosses
    if (s.bon) {
      const bdx = s.bx + 16 - (px + 8);
      const ph = f % 16;
      right = ph >= 10 ? 1 : 0; left = ph < 10 && Math.abs(bdx) < 90 ? 1 : 0;
      if (Math.abs(bdx) > 95) { right = 1; left = 0; }
      shoot = ph === 11 || ph === 13 ? 1 : 0;
      if (s.bk === 1) { const want = bdx - 50; right = want > 6 ? 1 : 0; left = want < -6 ? 1 : 0; if (grounded) jump = 1; shoot = (py < 84 && live('face') === 0) ? 1 : 0; }
      if (s.bk !== 1 && Math.abs(bdx) < 52 && grounded && s.bst !== 0) { jump = 1; right = bdx > 0 ? 1 : 0; left = bdx < 0 ? 1 : 0; }
    }
    if (!s.bon && s.cam > 0 && f > 0) { /* normal travel */ }
    let a = 0;
    if (jump) a = (prevA && grounded) ? 0 : 1;
    else if (!grounded && live('vy') < 0) a = 1;
    else if (!grounded && live('vy') >= 0 && prevA && live('chili') > 0 && false) a = 1;
    prevA = a;
    if (s.bon && s.bk !== 1 && !jump) { /* keep walking */ }
    let m = 0;
    if (right) m |= mask('RIGHT'); if (left) m |= mask('LEFT'); if (a) m |= mask('A'); if (shoot && (f & 3) === 0 || shoot && s.bon) m |= mask('B');
    if (!s.bon && shoot && (f & 7) === 0) m |= mask('B');
    return m;
  },
  done: (read) => read('state') === 7,
});
fs.writeFileSync(OUT, r.input);
console.log(log.join('\n'));
console.log(`delay ${DELAY}: frames ${r.frames} reachedEnding ${r.reachedDone} doneAt ${r.doneAt}`);
