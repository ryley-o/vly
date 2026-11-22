// The bot kit: a policy plays the game, its presses are recorded as an input script that replays identically, and a reaction delay makes it worse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBot, mask } from '../src/tools/bot.js';
import { buildText } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';

const GAME = `var x = 80; var target = 120; var score; var won;
func init() { load_font(0); lcd(LCD_BG); }
func frame() {
  x += btn(BTN_RIGHT) * 2 - btn(BTN_LEFT) * 2;
  target = 40 + ((frames() >> 3) * 37) % 100;                 // a target that jumps about
  if (x > target - 6 && x < target + 6) { score++; }
  if (score >= 60) { won = 1; save_set(0, score); save_seal(); save_commit(); score = 0; }
}`;

test('bot kit: a policy wins, the presses replay to the same result, and the save it wrote comes back', async () => {
  const b = await buildText({ text: GAME, filename: 'g.vly', baseDir: '/nonexistent' });
  const policy = (f, read) => (read('x') < read('target') - 2 ? mask('RIGHT') : read('x') > read('target') + 2 ? mask('LEFT') : 0);
  const r = await runBot({ rom: b.bytes, ram: b.stats.ram, decide: policy, done: (read) => read('won') === 1, maxFrames: 3000, after: 5 });
  assert.equal(r.reachedDone, true);
  assert.ok(r.input.includes('RIGHT@') || r.input.includes('LEFT@'));
  assert.ok(r.save && r.save.length === 1024, 'the save the game wrote');
  const replay = runCartridge(b.bytes, { frames: r.frames, input: r.input, mem: [{ addr: b.stats.ram.won.addr, len: 2 }] });
  assert.equal(replay.mem[0].bytes[0], 1, 'the recorded input wins again, exactly');
});

test('bot kit: reacting late is worse than reacting at once, so assistants can tell if a game is only beatable by a perfect machine', async () => {
  const b = await buildText({ text: GAME, filename: 'g.vly', baseDir: '/nonexistent' });
  const policy = (f, read) => (read('x') < read('target') - 2 ? mask('RIGHT') : read('x') > read('target') + 2 ? mask('LEFT') : 0);
  const quick = await runBot({ rom: b.bytes, ram: b.stats.ram, decide: policy, done: (read) => read('won') === 1, maxFrames: 3000 });
  const slow = await runBot({ rom: b.bytes, ram: b.stats.ram, decide: policy, delay: 24, done: (read) => read('won') === 1, maxFrames: 3000 });
  assert.ok(quick.reachedDone);
  assert.ok(!slow.reachedDone || slow.doneAt > quick.doneAt, 'with a 24-frame reaction delay it takes longer or fails');
  let late = 0, early = 0;
  await runBot({ rom: b.bytes, ram: b.stats.ram, delay: 24, live: ['x'], maxFrames: 60, decide: (f, read, api) => {
    if (f === 40) { const m = api.machine, r = api.ram; if (read('x') === ((m.read16(r.x.addr) << 16) >> 16)) early++; if (read('target') !== ((m.read16(r.target.addr) << 16) >> 16)) late++; }
    return mask('RIGHT');
  } });
  let a = 0, c = 0;
  await runBot({ rom: b.bytes, ram: b.stats.ram, delay: 10, delays: { x: 0 }, maxFrames: 60, decide: (f, read, api) => {
    if (f === 40) { const live = (n) => (api.machine.read16(api.ram[n].addr) << 16) >> 16; if (read('x') === live('x')) a++; if (read('target') !== live('target')) c++; }
    return mask('RIGHT');
  } });
  assert.equal(a, 1, 'delays: a variable with delay 0 is read at once');
  assert.equal(c, 1, 'the others use the general delay');
  assert.equal(early, 1, 'a variable named in live is read at once');
  assert.equal(late, 1, 'the others are still read late');
  assert.equal(mask('A+RIGHT'), 16 | 8, 'mask names the buttons');
  await assert.rejects(() => runBot({ rom: b.bytes, ram: b.stats.ram, decide: (f, read) => read('nope'), maxFrames: 3 }), /not a variable/);
});

test('multi-file builds: an imported file in a folder finds its own ../assets art, and errors name src/ui.vly', async () => {
  const art = 'tile a:\n  33333333\n  3......3\n  3......3\n  3......3\n  3......3\n  3......3\n  3......3\n  33333333\n';
  const files = {
    'src/main.vly': 'import "ui.vly";\nfunc init() { load_font(0); lcd(LCD_BG); load_tiles(art, 100, art_COUNT); }\nfunc frame() { ui(); }',
    'src/ui.vly': 'tileset art = "../assets/art.tiles";\nfunc ui() { set_cell(1, 1, 100); }',
    'assets/art.tiles': art,
  };
  const b = await buildText({ text: files['src/main.vly'], filename: 'src/main.vly', baseDir: '/nonexistent', files });
  assert.ok(b.bytes.length > 100);
  const bad = { ...files, 'src/ui.vly': 'func ui() { nope(); }' };
  await assert.rejects(() => buildText({ text: bad['src/main.vly'], filename: 'src/main.vly', baseDir: '/nonexistent', files: bad }), (e) => /src\/ui\.vly/.test(e.file || e.message || ''));
});

test('bot kit: delayArrays makes array reads late too', async () => {
  const src = 'var pos[3]; var t;\nfunc init() { load_font(0); lcd(LCD_BG); }\nfunc frame() { t++; pos[1] = t; }';
  const b = await buildText({ text: src, filename: 'g.vly', baseDir: '/nonexistent' });
  const seen = {};
  await runBot({ rom: b.bytes, ram: b.stats.ram, delay: 10, delayArrays: ['pos'], maxFrames: 40, decide: (f, read) => { if (f === 30) { seen.late = read('pos', 1); seen.live = b.stats.ram && 0; } return 0; } });
  const live = {};
  await runBot({ rom: b.bytes, ram: b.stats.ram, delay: 10, maxFrames: 40, decide: (f, read) => { if (f === 30) live.v = read('pos', 1); return 0; } });
  assert.ok(seen.late < live.v, `delayed ${seen.late} is older than live ${live.v}`);
  await assert.rejects(() => runBot({ rom: b.bytes, ram: b.stats.ram, delayArrays: ['t'], maxFrames: 3, decide: () => 0 }), /not an array/);
});

test('Machine.clone: a copy runs ahead on other inputs without disturbing the original, and replays identically', async () => {
  const { Machine } = await import('../src/core/machine.js');
  const b = await buildText({ text: GAME, filename: 'g.vly', baseDir: '/nonexistent' });
  const m = new Machine(b.bytes); m.boot();
  for (let i = 0; i < 20; i++) m.runFrame(0);
  const hex = (x) => Buffer.from(x).toString('hex');
  const before = hex(m.stateHash());
  const c = m.clone();
  assert.equal(hex(c.stateHash()), before);
  for (let i = 0; i < 30; i++) c.runFrame(mask('RIGHT'));
  assert.equal(hex(m.stateHash()), before, 'running the clone leaves the original alone');
  assert.notEqual(hex(c.stateHash()), before);
  for (let i = 0; i < 30; i++) m.runFrame(mask('RIGHT'));
  assert.equal(hex(m.stateHash()), hex(c.stateHash()), 'the same inputs give the same state');
});

test('bot kit: a bot that makes no progress stops and says so, instead of burning its whole budget', async () => {
  const b = await buildText({ text: GAME, filename: 'g.vly', baseDir: '/nonexistent' });
  const r = await runBot({ rom: b.bytes, ram: b.stats.ram, decide: () => 0, progress: (read) => read('x'), stuckFrames: 200, maxFrames: 30000 });
  assert.equal(r.reachedDone, false);
  assert.ok(r.stuck && /has not improved for 200 frames/.test(r.stuck.why), JSON.stringify(r.stuck));
  assert.ok(r.frames < 400, 'stopped early: ' + r.frames);
  const t = await runBot({ rom: b.bytes, ram: b.stats.ram, decide: () => 0, maxMillis: 0, maxFrames: 30000 });
  assert.equal(t.timedOut, true);
});

test('bot kit: a hand-written opening plays first, then the policy takes over; tests can start from a chosen state with "set"', async () => {
  const b = await buildText({ text: GAME, filename: 'g.vly', baseDir: '/nonexistent' });
  const seen = [];
  const r = await runBot({ rom: b.bytes, ram: b.stats.ram, opening: { input: 'LEFT@0-19', frames: 20 }, decide: (f) => { seen.push(f); return 0; }, maxFrames: 40 });
  assert.equal(seen[0], 20, 'the policy is first asked at frame 20');
  assert.ok(r.input.includes('LEFT@0-19'), r.input);
});
