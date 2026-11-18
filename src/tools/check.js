// Quality gates: play a cartridge the way a careless player would, for a few minutes of game time, and report what a
// reviewer would want to know. Every WARN is a bug to fix or a decision to explain; every FAIL blocks "finished".
import * as C from '../core/constants.js';
import { toHex } from '../core/sha256.js';
import { runCartridge, screenText } from './run.js';

const MASKS = [0, 0, 1, 2, 4, 8, 1 | 4, 1 | 8, 2 | 4, 2 | 8]; // none, up, down, left, right, and the diagonals

/** A deterministic "careless player": random directions and buttons, with START and A pressed early to leave menus. */
export function monkeyInput(seed = 12345) {
  let s = seed >>> 0;
  const rnd = (n) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 8) % n; };
  let mask = 0, left = 0;
  return (frame) => {
    if (frame === 20 || frame === 90 || frame === 160) return C.BTN.START;
    if (frame === 40 || frame === 60 || frame === 120) return C.BTN.A;
    if (--left <= 0) {
      left = 6 + rnd(19);
      mask = MASKS[rnd(MASKS.length)];
      if (rnd(100) < 45) mask |= C.BTN.A;
      if (rnd(100) < 25) mask |= C.BTN.B;
      if (rnd(100) < 3) mask |= C.BTN.START;
      if (rnd(100) < 2) mask |= C.BTN.SELECT;
    }
    return mask;
  };
}

function audibility(samples, frames) {
  if (!samples) return { seconds: 0, of: frames / 60, peak: 0 };
  let peak = 0, loud = 0;
  for (let i = 0; i + 735 <= samples.length; i += 735) {
    let sum = 0;
    for (let k = 0; k < 735; k++) { const v = samples[i + k]; sum += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
    if (Math.sqrt(sum / 735) > 0.005) loud++;
  }
  return { seconds: loud / 60, of: frames / 60, peak };
}

function spriteStats(mem) {
  let onScreen = 0, blank = 0;
  if (!(mem[C.LCDC] & C.LCDC_OBJ)) return { onScreen, blank };      // sprites are switched off: nothing is drawn
  for (let i = 0; i < C.OAM_COUNT; i++) {
    const o = C.OAM + i * 8;
    const x = ((mem[o] | (mem[o + 1] << 8)) << 16) >> 16, y = ((mem[o + 2] | (mem[o + 3] << 8)) << 16) >> 16;
    if (x >= 160 || y >= 144 || x <= -32 || y <= -32) continue;
    const tile = (mem[o + 4] | (mem[o + 5] << 8)) & 0x1ff;
    const [tw, th] = [[1, 1], [1, 2], [2, 2], [4, 4]][((mem[o + 6] | (mem[o + 7] << 8)) >> 6) & 3];
    let any = false;                                              // blank only if EVERY tile of the sprite is empty
    for (let t = 0; t < tw * th && !any; t++) for (let k = 0; k < 16 && !any; k++) if (mem[C.TILE_RAM + ((tile + t) & 0x1ff) * 16 + k]) any = true;
    onScreen++;
    if (!any) blank++;
  }
  return { onScreen, blank };
}

/**
 * @param {Uint8Array} rom
 * @param {{frames?: number, seed?: number}} [o] frames: how long the careless player plays (default 7200 = 2 minutes)
 */
/** How many frames an input script covers: its last frame plus a little. */
export function inputLength(text) {
  let end = 0;
  for (const m of String(text).matchAll(/@\s*(\d+)(?:\s*-\s*(\d+))?/g)) end = Math.max(end, Number(m[2] ?? m[1]));
  return Math.min(54000, end + 120);
}

export function checkCartridge(rom, o = {}) {
  const frames = o.frames ?? 7200;
  const checks = [];
  const add = (id, status, message, hint) => checks.push({ id, status, message, ...(hint ? { hint } : {}) });

  // scenario 1: nobody touches anything (the title screen)
  const idle = runCartridge(rom, { frames: 600, input: '', audio: true });
  // scenario 2: START, then A, then nothing
  const started = runCartridge(rom, { frames: 300, input: 'START@30,A@120', audio: false });
  // scenario 3: the careless player, sampled
  const monkey = monkeyInput(o.seed ?? 12345);
  const hashes = new Set(), screens = new Set();
  const notes = new Set();
  let maxSprites = 0, maxBlank = 0, maxOverBudget = 0;
  const heavyFrames = [];
  let shrill = 0, voiced = 0;
  const listen = (m) => {                                   // tonal channels 0-2: is anything audible, and is it above 1.4 kHz?
    let any = false, high = false;
    for (let ch = 0; ch < 3; ch++) {
      const a = C.AUDIO + ch * 4;
      if ((m.mem[a + 3] & 0x80) && m.mem[a + 2] >= 3) { any = true; if (m.read16(a) > 1400) high = true; }
    }
    if (any) voiced++;
    if (high) shrill++;
  };
  const run = runCartridge(rom, {
    frames, input: monkey, audio: true,
    onFrame: (f, m) => {
      listen(m);
      if (f % 15 !== 0) return;
      hashes.add(toHex(m.frameHash()));
      const st = screenText(m.mem, { sprites: true });
      screens.add(st.text);
      for (const n of st.notes) if (notes.size < 5) notes.add(n);
      const sp = spriteStats(m.mem);
      maxSprites = Math.max(maxSprites, sp.onScreen); maxBlank = Math.max(maxBlank, sp.blank);
    },
  });

  // scenario 4 (optional): a recorded path, such as a bot's winning run, so late-game screens are checked too
  let script = null;
  if (o.script) {
    script = runCartridge(rom, {
      frames: inputLength(o.script), input: o.script, audio: true, save: o.save || null,
      onFrame: (f, m) => {
        listen(m);
        if (f % 15 !== 0) return;
        const st = screenText(m.mem, { sprites: true });
        screens.add(st.text);
        for (const n of st.notes) if (notes.size < 5) notes.add(n);
        const sp = spriteStats(m.mem);
        maxSprites = Math.max(maxSprites, sp.onScreen); maxBlank = Math.max(maxBlank, sp.blank);
      },
    });
  }

  // faults
  const faultOf = (r) => Object.entries(r.faults).filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n} (first at frame ${r.firstFault[k]})`);
  const faults = [...faultOf(idle), ...faultOf(started), ...faultOf(run), ...(script ? faultOf(script) : [])];
  if (faults.length) add('faults', 'fail', `the machine reported faults: ${[...new Set(faults)].join('; ')}`, 'Division by zero, writing to read-only memory, an illegal instruction or running past the cycle budget. Use watch on the variables involved, or vly run --trace.');
  else add('faults', 'pass', `no faults in ${600 + 300 + frames + (script ? script.frames : 0)} frames of play (idle, START, ${Math.round(frames / 60)} s of careless input${script ? `, and your recorded path of ${Math.round(script.frames / 60)} s` : ''})`);

  // budget
  const worst = Math.max(idle.cycles.max, started.cycles.max, run.cycles.max, script ? script.cycles.max : 0);
  const worstRun = [['the idle title', idle], ['START then A', started], ['the careless run', run], ['your recorded path', script]].filter(([, r]) => r).sort((a, b) => b[1].cycles.max - a[1].cycles.max)[0];
  const where = ` (frame ${worstRun[1].worstFrames[0].frame} of ${worstRun[0]}; replay it: vly run build/x.vlc --worst 5${worstRun[0] === 'your recorded path' ? ' --input-file <your path>' : ''})`;
  const initCycles = Math.max(idle.init.cycles, 0);
  if (idle.init.overran) add('init', 'fail', `init() ran out of its ${idle.init.budget}-cycle budget and was cut off`, 'Spread the setup over several frames (a loading state), or draw less in init().');
  else if (initCycles > 0.6 * idle.init.budget) add('init', 'warn', `init() uses ${initCycles} of ${idle.init.budget} cycles`, 'Close to the limit: it will not survive adding more content.');
  else add('init', 'pass', `init() uses ${initCycles} of ${idle.init.budget} cycles`);
  if (worst > 110000) add('budget', 'fail', `the worst frame uses ${worst} of ${C.CYCLES_PER_FRAME} cycles${where}`, 'It will drop frames. Run with profile on and fix the top function: compute things once per frame, use tiles instead of many sprites, spread work across frames.');
  else if (worst > 80000) add('budget', 'warn', `the worst frame uses ${worst} of ${C.CYCLES_PER_FRAME} cycles${where} (average ${run.cycles.avg})`, 'Little headroom. Find the function with `vly run build/x.vlc --worst 5 [--input-file path]` and fix it before adding anything.');
  else add('budget', 'pass', `the worst frame uses ${worst} of ${C.CYCLES_PER_FRAME} cycles (average ${run.cycles.avg})`);

  // alive
  if (hashes.size <= 2) add('alive', 'fail', `the picture hardly changed in ${Math.round(frames / 60)} seconds of play (${hashes.size} different screens)`, 'The game may be frozen, stuck on a menu that needs a button the test did not press, or crashed into an infinite loop of waiting. Run it with START and A at the title and watch the state variable.');
  else add('alive', 'pass', `the picture changed ${hashes.size} times when sampled (it is not frozen)`);

  // start responds
  if (idle.frameHash === started.frameHash && idle.stateHash === started.stateHash) {
    add('start', 'warn', 'pressing START (then A) on the title changed nothing', 'Players press START or A on a title screen. Make START (and A) begin the game, and show "PRESS START".');
  } else add('start', 'pass', 'pressing START on the title makes something happen');

  // sound
  const ti = audibility(idle.audio, 600), pl = audibility(run.audio, frames);
  if (ti.seconds < 1) add('title_sound', 'warn', `the title screen is nearly silent (${ti.seconds.toFixed(1)} s of 10 s audible)`, 'Start the title music in init(), and call music_update() every frame.');
  else add('title_sound', 'pass', `the title screen has sound (${ti.seconds.toFixed(1)} of 10 s)`);
  if (pl.seconds < 0.3 * pl.of) add('play_sound', 'warn', `only ${pl.seconds.toFixed(0)} of ${pl.of.toFixed(0)} seconds of play had any sound`, 'Add music that plays during the game and a distinct effect for every event (jump, hit, pickup, fail).');
  else add('play_sound', 'pass', `sound is audible for ${pl.seconds.toFixed(0)} of ${pl.of.toFixed(0)} seconds of play`);
  if (Math.max(ti.peak, pl.peak) > 0.6) add('loud', 'warn', `the sound peaks at ${Math.max(ti.peak, pl.peak).toFixed(2)} of full scale`, 'Loud on a small speaker. Lower master_volume() or the channel volumes (music 5-8, effects 9-13).');

  if (shrill >= 180 && shrill > 0.25 * voiced) add('shrill', 'warn', `tones above 1.4 kHz sound for ${(shrill / 60).toFixed(0)} s (${Math.round(100 * shrill / voiced)}% of the time anything is audible)`, 'Shrill on a tiny speaker, and painful when it repeats (a gun, a tick). Keep repeating effects below 800 Hz, volume 3 to 5, 2 to 3 frames; save high pitches for one-off sparkles.');

  // sprites
  if (maxSprites >= 56) add('sprites', 'warn', `up to ${maxSprites} of 64 sprites are on screen at once`, 'Near the hardware limit; use fewer, larger sprites or background tiles for scenery.');
  else add('sprites', 'pass', `at most ${maxSprites} of 64 sprites are on screen`);
  if (maxBlank > 0) add('blank_sprites', 'warn', `${maxBlank} sprite(s) on screen use a blank tile (they draw nothing)`, 'A sprite with an empty tile is usually a wrong tile index or art that was never loaded (load_tiles) at that position.');

  // text covered
  if (notes.size) add('overlap', 'warn', `sprites cover text: ${[...notes].join('; ')}`, 'Keep gameplay out of the HUD zone; put the HUD in the window layer; move the sprite or the text.');
  else add('overlap', 'pass', 'no sprite covered text in the sampled frames');

  // variety
  if (screens.size < 4) add('variety', 'warn', `the sampled play showed only ${screens.size} distinct screens of tile layout`, 'Real depth shows up as more places and states: stages, menus, game over, win. The careless player may simply not reach them; script a full run with input to be sure, and see the design playbook (depth targets).');
  else add('variety', 'pass', `${screens.size} distinct tile layouts were seen (title, play, other screens)`);

  // saves
  if (run.saves.length === 0 && idle.saves.length === 0 && started.saves.length === 0 && !(script && script.saves.length)) add('save', 'info', 'the game never asked to save in the sampled play', 'If it has progress, a high score or unlocks, save them with save_set / save_seal / save_commit (1 KB).');
  else {
    const commits = run.saves.length + (script ? script.saves.length : 0), minutes = (frames + (script ? script.frames : 0)) / 3600;
    if (commits > 4 && commits / minutes > 3) add('save_rate', 'warn', `the game wrote its save ${commits} times in ${minutes.toFixed(0)} minutes of play (${(commits / minutes).toFixed(1)} a minute)`, 'Flash wears out (about 100,000 writes per sector). Save at milestones (a level won, a pet fed, leaving a menu), and at most about once a minute, never on a timer every few seconds.');
    add('save', 'pass', 'the game saves');
  }

  const verdict = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn') ? 'warn' : 'pass';
  return {
    ok: verdict !== 'fail', verdict,
    summary: `${checks.filter((c) => c.status === 'pass').length} passed, ${checks.filter((c) => c.status === 'warn').length} warnings, ${checks.filter((c) => c.status === 'fail').length} failed`,
    checks,
    stats: { frames, worst_frame_cycles: worst, avg_frame_cycles: run.cycles.avg, distinct_screens: screens.size, distinct_pictures: hashes.size, max_sprites: maxSprites },
  };
}
