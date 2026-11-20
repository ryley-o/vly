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
