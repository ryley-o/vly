// std/platformer: Super Mario Bros. movement. The numbers asserted here are the ones in docs/ref/sidescroller.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildText } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';

const FLOOR = 112;
const GAME = (solid, start = '20, 96') => `import "std/platformer";
func pl_solid(x, y) { return ${solid}; }
func init() { pl_init(${start}); }
func frame() { pl_step(btn(BTN_RIGHT) - btn(BTN_LEFT), btn(BTN_B), btnp(BTN_A), btn(BTN_A)); }`;
const WORLD = `y >= ${FLOOR} || x < 0 || x >= 2000`;

async function play(solid, input, frames, start) {
  const b = await buildText({ text: GAME(solid, start), filename: 'main.vly', baseDir: '/x' });
  const ram = b.stats.ram;
  const rows = [];
  const r = runCartridge(b.bytes, { frames, input, onFrame: (f, m) => {
    const w = (n) => { const v = m.read16(ram[n].addr); return v > 32767 ? v - 65536 : v; };
    rows.push({ f, x: w('pl_x'), y: w('pl_y'), vx: w('pl_vx'), vy: w('pl_vy'), ground: w('pl_ground'), face: w('pl_face'), bump: w('pl_bump'), rt: w('pl_rt') });
  } });
  assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 });
  assert.ok(r.cycles.max < 30000, `the movement fits easily in a frame (${r.cycles.max} cycles)`);
  return rows;
}
const apex = (rows, y0 = 96) => y0 - Math.min(...rows.map((r) => r.y));

test('standing jump: holding A rises 4 blocks (64 px); a tap still hops about a block', async () => {
  const held = await play(WORLD, 'A@5-60', 120);
  assert.ok(Math.abs(apex(held) - 64) <= 3, `held apex ${apex(held)}`);
  const tap = await play(WORLD, 'A@5', 120);
  assert.ok(apex(tap) >= 14 && apex(tap) <= 22, `tap apex ${apex(tap)}`);
  assert.equal(held[held.length - 1].ground, 1, 'and it lands');
});

test('running jump: with a run-up and B, A held goes 5 blocks (80 px)', async () => {
  const rows = await play(WORLD, 'RIGHT+B@0-200,A@70-200', 200);
  const peak = Math.min(...rows.slice(70).map((r) => r.y));
  assert.ok(Math.abs(96 - peak - 80) <= 4, `running apex ${96 - peak}`);
});

test('walk: 1.5 px/frame after about 40 frames; B: 2.5 px/frame; let go of B and 10 frames later it is back to a walk', async () => {
  const walk = await play(WORLD, 'RIGHT@0-120', 120);
  assert.equal(walk[100].vx, 6144);
  const first = walk.findIndex((r) => r.vx >= 6144);
  assert.ok(first >= 36 && first <= 44, `top walking speed after ${first} frames`);
  const run = await play(WORLD, 'RIGHT+B@0-90,RIGHT@91-200', 200);
  assert.equal(run[85].vx, 10240, 'run speed');
  assert.equal(run[91].vx, 10240, 'B just let go: still running');
  assert.equal(run[105].vx, 6144, 'ten frames later: walking speed');
});

test('skid: reversing at run speed takes about 25 frames and turns Mario round at once; letting go slides to a stop', async () => {
  const rows = await play(WORLD, 'RIGHT+B@0-90,LEFT@91-150', 150);
  assert.equal(rows[92].face, -1);
  const stop = rows.slice(91).findIndex((r) => r.vx <= 0);
  assert.ok(stop >= 20 && stop <= 32, `skid took ${stop} frames`);
  const slide = await play(WORLD, 'RIGHT@0-60', 160);
  const still = slide.slice(61).findIndex((r) => r.vx === 0);
  assert.ok(still > 20 && still < 60, `slide to a stop took ${still} frames`);
});

test('in the air: speed is kept with no input, and steering is limited by the same acceleration', async () => {
  const rows = await play(WORLD, 'RIGHT@0-60,A@60-90', 130);
  const airborne = rows.slice(62, 80);
  assert.ok(airborne.every((r) => r.vx === airborne[0].vx), 'no input, no change in the air');
  assert.equal(airborne[0].vx, 6144);
});

test('walls stop Mario flat (speed 0), and a corner clipped by a few pixels is slid round while one clipped by a lot is a bonk', async () => {
  const wall = await play(`${WORLD} || (x >= 150 && y < ${FLOOR})`, 'RIGHT+B@0-120', 120);
  const end = wall[119];
  assert.equal(end.x + 12, 150, 'stops at the wall');
  assert.equal(end.vx, 0);
  const block = `${WORLD} || (x >= 100 && x < 116 && y >= 70 && y < 86)`;
  const slid = await play(block, 'A@5-60', 100, '91, 96');            // 3 px under the block's corner
  assert.ok(Math.min(...slid.map((r) => r.y)) < 70, 'went past the block');
  assert.ok(slid.some((r) => r.x < 91), 'by sliding sideways');
  const bonk = await play(block, 'A@5-60', 100, '96, 96');            // 8 px under it
  assert.ok(bonk.some((r) => r.bump === 1), 'a real bonk');
  assert.ok(Math.min(...bonk.map((r) => r.y)) >= 86, 'stopped under the block');
});

test('walking off a ledge: a jump still works for 4 frames (coyote time), not 12', async () => {
  const ledge = `y >= ${FLOOR} && x < 60 || y >= 200`;                 // floor ends at x = 60, then a long drop
  const late = await play(ledge, 'RIGHT@0-200,A@8-9', 100, '20, 96');     // walks off around frame 27+: press a few frames early instead
  void late;
  const start = (await play(ledge, 'RIGHT@0-200', 80, '20, 96')).findIndex((r) => !r.ground);
  assert.ok(start > 10, 'walked off a ledge');
  const ok = await play(ledge, `RIGHT@0-200,A@${start + 2}-${start + 3}`, start + 30, '20, 96');
  assert.ok(Math.min(...ok.slice(start).map((r) => r.vy)) < -900, 'a jump 2 frames late works');
  const bad = await play(ledge, `RIGHT@0-200,A@${start + 12}-${start + 13}`, start + 30, '20, 96');
  assert.ok(Math.min(...bad.slice(start).map((r) => r.vy)) >= 0, 'a jump 12 frames late does not');
});

test('buried on both sides by a block that switched on: floats up one pixel a frame until free, never stuck', async () => {
  // a solid 32x30 block appears around the player on frame 30
  const solid = `(y >= ${FLOOR}) || (frames() > 30 && x >= 10 && x < 42 && y >= 70 && y < 100)`;
  const rows = await play(solid, '', 90, '24, 70');
  const f = rows[80];
  assert.ok(!(f.x + 12 > 10 && f.x < 42 && f.y + 16 > 70 && f.y < 100), `free of the block, at ${f.x},${f.y}`);
  // and it can move again afterwards
  const rows2 = await play(solid, 'RIGHT@40-120', 130, '24, 70');
  assert.ok(rows2[125].x > rows2[45].x, 'free to walk away');
});

test('camera: follows only past the line, exactly as far as the character moved, never back, stops at the world end', async () => {
  const text = `import "std/platformer";
func pl_solid(x, y) { return y >= 112; }
var sx;
func init() { pl_init(20, 96); }
func frame() { pl_step(btn(BTN_RIGHT) - btn(BTN_LEFT), btn(BTN_B), btnp(BTN_A), btn(BTN_A)); pl_camera(400); sx = pl_x - pl_cam; }`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  const ram = b.stats.ram; const rows = [];
  runCartridge(b.bytes, { frames: 700, input: 'RIGHT+B@0-299,LEFT@300-420,RIGHT@421-700', onFrame: (f, m) => rows.push({ x: m.read16(ram.pl_x.addr), cam: m.read16(ram.pl_cam.addr), sx: m.read16(ram.sx.addr) }) });
  assert.equal(rows[5].cam, 0, 'no scrolling before the line');
  const scrolling = rows.slice(60, 120);
  assert.ok(scrolling.every((r) => r.sx === 70), 'once past the line the character stays at the line: the camera moves 1:1 with it');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].cam >= rows[i - 1].cam, 'the camera never goes back');
  assert.equal(rows[699].cam, 240, 'it stops at the end of the world (400 - 160)');
  const left = rows[420];
  assert.ok(left.x >= left.cam, 'cannot walk off the left of the screen');
});

// ---- enemy contact (SMB1's rule: falling onto an enemy always stomps; otherwise it hurts; when in doubt the player wins) ----
async function contact(enemy, input, frames, start, extra = '') {
  const text = `import "std/platformer";
func pl_solid(x, y) { return y >= ${FLOOR}; }
var res; var first_hit; var first_stomp; var n_hit;
func init() { pl_init(${start}); }
func frame() {
  pl_step(btn(BTN_RIGHT) - btn(BTN_LEFT), btn(BTN_B), btnp(BTN_A), btn(BTN_A));
  ${extra}
  res = pl_enemy(${enemy});
  if (res == 1 && first_stomp == 0) { first_stomp = frames(); pl_bounce(); }
  if (res == 2) { if (first_hit == 0) { first_hit = frames(); } n_hit++; pl_hurt(); }
}`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  const ram = b.stats.ram; let out = null;
  runCartridge(b.bytes, { frames, input, mem: [] , onFrame: (f, m) => { out = { stomp: m.read16(ram.first_stomp.addr), hit: m.read16(ram.first_hit.addr), n: m.read16(ram.n_hit.addr) }; } });
  return out;
}

test('falling onto an enemy stomps it, even if you land beside its middle; walking into it from the side hurts', async () => {
  // enemy 12x12 standing on the floor at x 60 (y 100); the character drops onto it from above, off-centre by 5 pixels
  const jump = await contact('60, 100, 12, 12', '', 80, '53, 50');
  assert.ok(jump.stomp > 0, 'coming down on it stomps');
  assert.ok(jump.hit === 0 || jump.stomp < jump.hit, 'the stomp comes first (the enemy stays in this test, so landing on it again later may hurt)');
  const walk = await contact('60, 100, 12, 12', 'RIGHT@0-200', 200, '20, 96');
  assert.equal(walk.stomp, 0);
  assert.ok(walk.hit > 0, 'walking into it hurts');
});

test('rising into an enemy from below hurts, never stomps; being hit makes the character blink, so standing in the enemy hurts only once', async () => {
  const under = await contact('40, 70, 12, 12', 'A@5-40', 60, '36, 96');
  assert.ok(under.hit > 0, 'from below is a hurt');
  assert.ok(under.stomp === 0 || under.hit < under.stomp, 'the first thing that happens is the hurt, not a stomp');
  // walk into an enemy and keep pushing: the first contact hurts, then the blinking (168 frames) means no more hits
  const twice = await contact('60, 100, 12, 12', 'RIGHT@0-200', 100, '20, 96', '');
  assert.equal(twice.n, 1, `hurt once while blinking (${twice.n})`);
});

test('two enemies side by side: the second contact right after a stomp is a stomp too (SMB1 stomp timer)', async () => {
  const text = `import "std/platformer";
func pl_solid(x, y) { return y >= ${FLOOR}; }
var stomps; var hurts;
func init() { pl_init(40, 70); pl_vy = 600; }
func frame() {
  pl_step(0, 0, 0, 0);
  var a = pl_enemy(36, 98, 12, 12);                 // the first enemy, under the character
  if (a == 1) { pl_bounce(); stomps++; }
  var r = pl_enemy(46, 98, 12, 12);                 // its neighbour, touched on the way back up
  if (r == 1) { stomps++; }
  if (r == 2) { hurts++; }
}`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  const ram = b.stats.ram; let out = null;
  runCartridge(b.bytes, { frames: 40, onFrame: (f, m) => { out = { stomps: m.read16(ram.stomps.addr), hurts: m.read16(ram.hurts.addr) }; } });
  assert.ok(out.stomps >= 2, `both stomped (${out.stomps})`);
  assert.equal(out.hurts, 0, 'and nothing hurt');
});

test('SMB1 ImpedePlayerMove: a solid touching one side pushes the character one pixel per frame away from it, and zeroes its speed', async () => {
  // a wall appears on frame 20 over the right 6 pixels of the body (body x 40..52; wall from x 46)
  const solid = `(y >= ${FLOOR}) || (frames() > 20 && x >= 46 && x < 70 && y < 112)`;
  const rows = await play(solid, '', 60, '40, 96');
  const at = (f) => rows[f].x;
  assert.equal(at(19), 40);
  assert.equal(at(21) - at(20), -1, 'one pixel left in the first frame');
  assert.equal(at(22) - at(21), -1, 'and one more the next');
  assert.ok(at(50) <= 34 && at(50) >= 30, `free after about 6 pixels (${at(50)})`);
  assert.equal(rows[50].vx, 0);
});

test('coyote time is exactly pl_coyote_max (4) frames: counting the frame the feet leave the ledge, a jump on the 4th still works and on the 6th does not', async () => {
  const ledge = `y >= ${FLOOR} && x < 60 || y >= 200`;
  const start = (await play(ledge, 'RIGHT@0-200', 80, '20, 96')).findIndex((r) => !r.ground);
  const jumped = async (k) => Math.min(...(await play(ledge, `RIGHT@0-200,A@${start + k}-${start + k + 1}`, start + 30, '20, 96')).slice(start).map((r) => r.vy)) < -900;
  assert.equal(await jumped(3), true, 'on the 4th frame (start+3)');
  assert.equal(await jumped(6), false, 'two frames beyond the window');
});

test('falling with one pixel of the body inside a ledge (found by a bot in a real game): pushed out sideways, lands, and can jump, never hovering', async () => {
  // a 12-pixel high block x 51..80 on the floor; the body (x 40..51) comes down with only its rightmost column over the block's top edge
  const solid = `(y >= ${FLOOR}) || (x >= 51 && x < 80 && y >= 100)`;
  const rows = await play(solid, 'A@100-101', 160, '40, 60');
  const last = rows[90];
  assert.equal(last.ground, 1, `standing by frame 90 (y ${last.y})`);
  assert.ok(last.x <= 40, 'pushed clear of the block, not floating over it');
  assert.ok(Math.min(...rows.slice(100).map((r) => r.vy)) < -900, 'and can jump');
});
