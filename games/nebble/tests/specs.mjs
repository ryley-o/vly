// Scenario specs -> vly.json. node tests/specs.mjs print   (shows measured values)   |   node tests/specs.mjs write   (writes vly.json with those values)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const sv = (n) => `tests/saves/${n}.sav`;
export const specs = [
  { name: 'title with no save: PRESS START, egg, no faults', frames: 60, vars: ['state', 'have_save'] },
  { name: 'START on the title opens the name screen', frames: 100, input: 'START@20', vars: ['state'] },
  { name: 'the name screen cycles names with RIGHT', frames: 110, input: 'START@20, RIGHT@80', vars: ['state', 'pname'] },
  { name: 'A names the pet and the egg appears', frames: 220, input: 'START@20, A@80', vars: ['state', 'stage', 'hp'], saves: 1 },
  { name: 'rubbing the egg hatches it in about 8 seconds', frames: 800, input: 'START@20, A@80, A@150-500/7', vars: ['state', 'stage', 'age'] },
  { name: 'an egg nobody touches still hatches by itself after 40 seconds (no dead end)', frames: 3000, input: 'START@20, A@80', vars: ['state', 'stage'] },
  { name: 'CONTINUE enters the room and counts the boot', save: 'baby_new', frames: 160, input: 'START@30', vars: ['state', 'stage', 'boots', 'age'] },
  { name: 'power off is a nap: needs drop a little, energy rises, the day moves on', save: 'full', frames: 130, input: 'START@30', vars: ['hun', 'fun', 'nrg', 'cln', 'clk', 'boots'] },
  { name: 'the nap never pushes a need below 30, and never touches one already lower', save: 'mid', frames: 130, input: 'START@30', vars: ['hun', 'fun', 'nrg', 'cln'] },
  { name: 'a pet at zero on everything is still alive after the nap, and can be fed', save: 'zero', frames: 130, input: 'START@30', vars: ['state', 'hun', 'fun', 'nrg', 'cln', 'mess'] },
  { name: 'feeding a meal fills the tummy', save: 'hungry', frames: 420, input: 'START@30, A@150, A@175', vars: ['hun', 'n_meal', 'fun', 'act'], saves: 1 },
  { name: 'a snack is less filling but fun', save: 'hungry', frames: 420, input: 'START@30, A@150, RIGHT@165, A@180', vars: ['hun', 'fun', 'n_snack', 'n_meal'] },
  { name: 'a second meal straight after a big one is refused (a pet that is full)', save: 'full', frames: 700, input: 'START@30, A@150, A@175, A@360, A@385', vars: ['hun', 'n_meal', 'act'] },
  { name: 'a bath cleans, clears messes and counts', save: 'zero', frames: 420, input: 'START@30, RIGHT@130, RIGHT@145, RIGHT@160, A@180', vars: ['cln', 'mess', 'n_wash'] },
  { name: 'lights out: sleep restores energy and the clock runs faster', save: 'dusk', frames: 1500, input: 'START@30, RIGHT@130, RIGHT@145, A@160', vars: ['sleeping', 'nrg', 'clk', 'n_rest', 'day'] },
  { name: 'a rested pet by day says not sleepy', save: 'full', frames: 300, input: 'START@30, RIGHT@130, RIGHT@145, A@165', vars: ['sleeping', 'nrg'] },
  { name: 'petting gives a little fun, three times, then only purrs', save: 'baby_new', frames: 520, input: 'START@30, B@150, B@220, B@290, B@360, B@430', vars: ['fun'] },
  { name: 'PLAY then CATCH starts the first mini-game', save: 'baby_new', frames: 360, input: 'START@30, RIGHT@130, A@150, A@170', vars: ['state', 'mg_id'] },
  { name: 'a hungry-to-the-bone pet refuses to play', save: 'zero', frames: 360, input: 'START@30, RIGHT@130, A@150, A@170', vars: ['state'] },
  { name: 'ABOUT ME shows the pet pages and B comes back', save: 'adult', frames: 420, input: 'START@30, RIGHT@130, RIGHT@145, RIGHT@160, RIGHT@175, A@190, RIGHT@240, RIGHT@260, B@300', vars: ['state', 'info_page'] },
  { name: 'START pauses: time stands still', save: 'baby_new', frames: 700, input: 'START@30, START@200, START@600', vars: ['state', 'age', 'clk'] },
  { name: 'pause then SAVE + TITLE goes back to the title and saves', save: 'baby_new', frames: 400, input: 'START@30, START@200, DOWN@230, DOWN@245, A@260', vars: ['state'], saves: 1 },
  { name: 'a baby grows into a child at 3 minutes', save: 'baby_evo', frames: 700, input: 'START@30', vars: ['stage', 'age', 'state'] },
  { name: 'balanced care grows a STARRY adult', save: 'child_star', frames: 700, input: 'START@30', vars: ['stage', 'form'] },
  { name: 'lots of snacks grow a PUDGY adult', save: 'child_pudge', frames: 700, input: 'START@30', vars: ['stage', 'form'] },
  { name: 'lots of winning games grow a DASHY adult', save: 'child_dash', frames: 700, input: 'START@30', vars: ['stage', 'form'] },
  { name: 'naps and baths grow a LUNA adult', save: 'child_luna', frames: 700, input: 'START@30', vars: ['stage', 'form'] },
  { name: 'neglect grows a SCAMP, never a dead pet', save: 'child_scamp', frames: 700, input: 'START@30', vars: ['stage', 'form', 'hun'] },
  { name: 'evening arrives on its own (the clock crosses 180)', save: 'evening', frames: 2900, input: 'START@30', vars: ['clk', 'last_ph'] },
  { name: 'the same wait without pausing ages the pet by 7 more seconds', save: 'baby_new', frames: 700, input: 'START@30', vars: ['state', 'age', 'clk'] },
  { name: 'adult CONTINUE shows the room with the day and night look', save: 'adult', frames: 200, input: 'START@30', vars: ['state', 'stage', 'form'] },
  { name: 'CATCH, careful player: 2 stars, fun +24, energy -10', save: 'bored', inputFile: 'tests/runs/catch_careful.input', frames: 1100, vars: ['state', 'mg_id', 'mg_score', 'mg_stars', 'fun', 'nrg', 'hun', 'n_play', 'n_win', 'best[0]'], saves: 1 },
  { name: 'CATCH, sloppy player: 0 stars, still a little fun and nothing is lost', save: 'bored', inputFile: 'tests/runs/catch_sloppy.input', frames: 1100, vars: ['state', 'mg_score', 'mg_stars', 'fun', 'n_play', 'n_win'] },
  { name: 'COPY ME, perfect memory: all 6 rounds, 3 stars', save: 'bored', inputFile: 'tests/runs/copy_perfect.input', frames: 2270, vars: ['state', 'mg_id', 'mg_score', 'mg_stars', 'fun', 'best[1]'] },
  { name: 'COPY ME, many slips: out of lives early, 0 stars', save: 'bored', inputFile: 'tests/runs/copy_sloppy.input', frames: 1260, vars: ['state', 'mg_score', 'mg_stars', 'mg_lives', 'fun'] },
  { name: 'HOP, well timed: all 14 obstacles, 3 stars', save: 'bored', inputFile: 'tests/runs/hop_perfect.input', frames: 1220, vars: ['state', 'mg_id', 'mg_score', 'mg_stars', 'mg_lives', 'fun', 'best[2]'] },
  { name: 'HOP, never jumping: three hits end it, 0 stars', save: 'bored', inputFile: 'tests/runs/hop_idle.input', frames: 595, vars: ['state', 'mg_score', 'mg_stars', 'mg_lives', 'fun'] },
  { name: 'HOP, 12 frames late every time: fails (the window is about +-8 frames)', save: 'bored', inputFile: 'tests/runs/hop_late12.input', frames: 595, vars: ['state', 'mg_score', 'mg_stars', 'mg_lives'] },
  { name: 'LIFE: an attentive player (bot) raises a STARRY adult in 14 minutes', inputFile: 'tests/runs/life_attentive.input', frames: 50400, vars: ['stage', 'form', 'age', 'n_neg', 'hun', 'fun', 'nrg', 'cln'] },
  { name: 'LIFE: a snack-giving player raises a PUDGY adult', inputFile: 'tests/runs/life_snacker.input', frames: 50400, vars: ['stage', 'form', 'n_snack', 'n_meal'] },
  { name: 'LIFE: a play-loving player raises a DASHY adult', inputFile: 'tests/runs/life_player.input', frames: 50400, vars: ['stage', 'form', 'n_play', 'n_win'] },
  { name: 'LIFE: a sleepy, tidy player raises a LUNA adult', inputFile: 'tests/runs/life_sleeper.input', frames: 50400, vars: ['stage', 'form', 'n_rest', 'n_wash'] },
  { name: 'LIFE: a player who only hatches the egg and walks away gets a SCAMP, pet alive and well', inputFile: 'tests/runs/life_neglect.input', frames: 50400, vars: ['stage', 'form', 'n_neg', 'hun', 'fun', 'nrg', 'cln', 'state'] },
];
function runSpec(s, extra = []) {
  const args = ['run', 'build/pal.vlc', '--frames', String(s.frames), '--json', ...extra];
  if (s.save) args.push('--save', sv(s.save));
  if (s.input) args.push('--input', s.input);
  if (s.inputFile) args.push('--input-file', s.inputFile);
  if (s.vars) args.push('--mem', s.vars.join(','));
  const out = execFileSync('vly', args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  return JSON.parse(out);
}
if (process.argv[2]) {
  const tests = [];
  for (const s of specs) {
    const r = runSpec(s);
    const words = {};
    for (const v of s.vars || []) { const m = (r.mem || []).find((x) => x.name === v); if (m) words[v] = m.words[0]; }
    if (process.argv[2] === 'print') console.log(s.name.slice(0, 70).padEnd(72), JSON.stringify(words), Object.values(r.faults).some((x) => x) ? 'FAULTS' : '', 'maxcyc', r.cycles.max, 'saves', r.saveRequests);
    tests.push({ name: s.name, ...(s.save ? { save: sv(s.save) } : {}), frames: s.frames, ...(s.input ? { input: s.input } : {}), ...(s.inputFile ? { inputFile: s.inputFile } : {}), expect: { words, ...(s.saves !== undefined ? { saves: s.saves } : {}), frameHash: 'auto', maxCycles: 80000 } });
  }
  if (process.argv[2] === 'write') {
    const j = JSON.parse(fs.readFileSync('vly.json', 'utf8'));
    j.tests = tests; fs.writeFileSync('vly.json', JSON.stringify(j, null, 2) + '\n'); console.log('wrote', tests.length, 'tests');
  }
}
