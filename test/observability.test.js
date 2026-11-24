import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeGif, decodeGif } from '../src/tools/gif.js';
import { filmstrip, evenFrames } from '../src/tools/filmstrip.js';
import { runCartridge } from '../src/tools/run.js';
import { buildText } from '../src/tools/build.js';
import { upscale } from '../src/tools/png.js';
import { commands } from '../cli/commands.js';
import { handleMessage } from '../src/mcp/server.js';

const conf = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'conformance', 'carts');
const pong = () => new Uint8Array(fs.readFileSync(path.join(conf, 'template_pong.vlc')));

test('GIF: encode then decode reproduces every frame exactly (scaled, many colors, long runs)', () => {
  const r = runCartridge(pong(), { frames: 60, input: 'START@5', capture: { every: 3 } });
  const frames = r.capturedFrames.map((f) => upscale(160, 144, f, 2).rgba);
  const gif = encodeGif(frames, { width: 320, height: 288, delayCs: 5 });
  assert.equal(String.fromCharCode(...gif.slice(0, 6)), 'GIF89a');
  const d = decodeGif(gif);
  assert.equal(d.frames.length, frames.length);
  d.frames.forEach((idx, k) => {
    for (let i = 0; i < idx.length; i++) {
      const c = d.palette[idx[i]];
      if (((c >> 16) & 255) !== frames[k][i * 4] || ((c >> 8) & 255) !== frames[k][i * 4 + 1] || (c & 255) !== frames[k][i * 4 + 2]) assert.fail(`frame ${k} pixel ${i} differs`);
    }
  });
  // a noisy image with more than 256 colors falls back to 3-3-2 quantization and still decodes
  const noise = new Uint8Array(40 * 30 * 4);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  const q = decodeGif(encodeGif([noise], { width: 40, height: 30 }));
  assert.equal(q.frames[0].length, 1200);
});

test('filmstrip lays frames out in a labelled grid', () => {
  const frame = new Uint8Array(160 * 144 * 4).fill(200);
  const sheet = filmstrip([1, 2, 3, 4, 5].map((n) => ({ label: `FRAME ${n}`, rgba: frame })), { cols: 3, scale: 1 });
  assert.equal(sheet.width, 3 * 160 + 4 * 4);
  assert.equal(sheet.height, 2 * (144 + 9) + 3 * 4);
  assert.equal(sheet.rgba.length, sheet.width * sheet.height * 4);
  assert.deepEqual(evenFrames(120, 4), [30, 60, 90, 120]);
  assert.deepEqual(evenFrames(10, 1), [10]);
});

test('watch timeline records each change with its frame; trace records instructions', () => {
  const r = runCartridge(pong(), { frames: 40, input: 'START@5', watch: [{ name: 'state', addr: 0xb402 }], trace: { frame: 8, limit: 12 } });
  assert.deepEqual(r.changes.map((c) => [c.frame, c.to]), [[-1, 0], [5, 1]]);
  assert.equal(r.trace.length, 12);
  assert.match(r.trace[0].text, /^LDI r13, 0x0000/, 'a compiled frame starts by zeroing r13');
  const push = r.trace.findIndex((t) => /^PUSH /.test(t.text));
  assert.ok(push > 0, 'the trace reaches a PUSH');
  assert.equal((r.trace[push].regs[15] - 2) & 0xffff, r.trace[push + 1].regs[15], 'registers are shown before each instruction executes');
  const init = runCartridge(pong(), { frames: 1, trace: { frame: 'init', limit: 3 } });
  assert.equal(init.trace.length, 3);
});

test('vly run CLI: timeline, trace with function names, filmstrip, gif and wav files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-obs-'));
  const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'pong', 'src', 'main.vly');
  const r = await commands.run.run({ _: [src], flags: { frames: '60', input: 'START@5', watch: 'state,rally', trace: '8:3', 'filmstrip': '4', 'filmstrip-out': path.join(dir, 's.png'), gif: path.join(dir, 'a.gif'), 'gif-every': '3', wav: path.join(dir, 'a.wav') } });
  assert.match(r.text, /timeline of state, rally/);
  assert.match(r.text, /frame\s+5: state 0 -> 1/);
  assert.match(r.text, /frame\+0x/, 'trace lines are symbolized with function names');
  for (const f of ['s.png', 'a.gif', 'a.wav']) assert.ok(fs.statSync(path.join(dir, f)).size > 100, f);
  assert.equal(String.fromCharCode(...fs.readFileSync(path.join(dir, 'a.wav')).subarray(0, 4)), 'RIFF');
  assert.equal(r.data.timeline.length, 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('mcp: vly_run returns a filmstrip image and a timeline', async () => {
  const code = 'var n; func init() { load_font(0); lcd(LCD_BG); } func frame() { n++; if (n % 10 == 0) { print_u(1, 1, n); } }';
  const r = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vly_run', arguments: { code, frames: 60, filmstrip: 4, watch: ['n'], trace: '3:2' } } });
  const kinds = r.result.content.map((c) => c.type);
  assert.equal(kinds.filter((k) => k === 'image').length, 1, 'one filmstrip image, no per-frame screenshots');
  const t = r.result.content[0].text;
  assert.match(t, /timeline/);
  assert.match(t, /instruction trace/);
});

test('input scripts: repeat syntax presses one frame in every P', async () => {
  const { parseInputSpec } = await import('../src/tools/input.js');
  const f = parseInputSpec('A@10-20/3, RIGHT@0-4');
  assert.deepEqual([9, 10, 11, 12, 13, 16, 19, 20].map((n) => f(n) & 16), [0, 16, 0, 0, 16, 16, 16, 0]);
  assert.equal(f(2), 8);
  assert.throws(() => parseInputSpec('A@1-5/0'), /at least 1/);
  assert.throws(() => parseInputSpec('A@1/3x'), /bad input segment/);
});

test('input scripts: newlines separate segments and # starts a comment', async () => {
  const { parseInputSpec } = await import('../src/tools/input.js');
  const f = parseInputSpec('# recorded by a bot\nRIGHT@0-4  # walk\nA@2\n\n# done');
  assert.equal(f(1), 8);
  assert.equal(f(2), 8 | 16);
  assert.equal(f(5), 0);
  assert.equal(parseInputSpec('# only a comment')(0), 0);
});

test('long inputs can live in a file: vly run --input-file, "inputFile" in test specs, and the MCP inputFile argument', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-inputfile-'));
  fs.writeFileSync(path.join(dir, 'in.txt'), '# start the game\nSTART@5\nRIGHT@10-20\n');
  const cart = path.join(conf, 'template_pong.vlc');
  const inline = runCartridge(new Uint8Array(fs.readFileSync(cart)), { frames: 30, input: 'START@5, RIGHT@10-20' });
  // CLI
  const r = await commands.run.run({ _: [cart], flags: { frames: '30', 'input-file': path.join(dir, 'in.txt') } }, { root: path.resolve(conf, '..', '..') });
  assert.ok(r.text.includes(inline.frameHash));
  // test runner
  fs.copyFileSync(cart, path.join(dir, 'pong.vlc'));
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ cart: 'pong.vlc', tests: [{ name: 'from file', frames: 30, inputFile: 'in.txt', expect: { frameHash: inline.frameHash } }] }));
  const { runSpecFile } = await import('../src/tools/testrunner.js');
  const spec = await runSpecFile(path.join(dir, 'vly.json'));
  assert.equal(spec.results[0].ok, true, spec.results[0].failures.join('; '));
  // MCP
  const res = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vly_run', arguments: { path: cart, frames: 30, inputFile: path.join(dir, 'in.txt') } } });
  assert.ok(JSON.stringify(res).includes(inline.frameHash));
});

test('vly chunks --deployer --out-dir writes plan, per-chunk ChunkDeployer calldata and a create config', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-chunks-'));
  const cart = path.join(conf, 'template_shooter.vlc');
  const deployer = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const r = await commands.chunks.run({ _: [cart], flags: { deployer, 'out-dir': dir } }, { root: path.resolve(conf, '..', '..') });
  assert.match(r.text, /1 chunk contract\(s\)/);
  assert.match(r.text, /address 0x[0-9a-f]{40}/);
  const rom = new Uint8Array(fs.readFileSync(cart));
  const { chunkDeployCalldata } = await import('../src/tools/chunks.js');
  assert.equal(fs.readFileSync(path.join(dir, 'chunk_0.calldata'), 'utf8').trim(), chunkDeployCalldata(rom));
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'create-config.json'), 'utf8'));
  assert.equal(cfg.romSize, rom.length);
  assert.equal(cfg.chunks.length, 1);
  assert.equal(cfg.specVersion, 1);
  await assert.rejects(() => commands.chunks.run({ _: [cart], flags: { deployer: '0x12' } }, { root: '' }), /20-byte address/);
});

test('profile: cycles are attributed to the functions that spend them, and add up to the frame total', async () => {
  const { buildText } = await import('../src/tools/build.js');
  const { profileCartridge } = await import('../src/tools/profile.js');
  const { runCartridge } = await import('../src/tools/run.js');
  const src = 'var h[64];\nfunc ground(x) { var s = 0; for (var i = 0; i < 20; i++) { s += (x * i) & 15; } return s; }\nfunc init() {}\nfunc frame() { for (var i = 0; i < 64; i++) { h[i] = ground(i); } }\n';
  const b = await buildText({ text: src, filename: 'p.vly', baseDir: '/nonexistent' });
  const p = profileCartridge(b.bytes, b.symbols, { frames: 20 });
  assert.equal(p.functions[0].name, 'ground', 'the expensive function is first');
  assert.ok(p.functions[0].percent > 90);
  const r = runCartridge(b.bytes, { frames: 20 });
  assert.equal(p.avg_cycles_per_frame, r.cycles.avg, 'the profile accounts for every cycle');
});

test('vly check: prints a verdict with a hint per problem, exits 1 on a FAIL, 0 otherwise', async () => {
  const { spawnSync } = await import('node:child_process');
  const fsm = await import('node:fs'); const osm = await import('node:os'); const pm = await import('node:path');
  const run = (...a) => spawnSync('node', ['cli/vly.js', ...a], { encoding: 'utf8' });
  const ok = run('check', 'templates/pong/src/main.vly', '--frames', '900');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /quality check .*: (PASS|WARN)/);
  assert.match(ok.stdout, /PASS\s+faults/);
  const dir = fsm.mkdtempSync(pm.join(osm.tmpdir(), 'vly-check-'));
  const f = pm.join(dir, 'stuck.vly');
  fsm.writeFileSync(f, 'func init() { load_font(0); lcd(LCD_BG); text(1, 1, "STUCK"); }\nfunc frame() {}\n');
  const bad = run('check', f, '--frames', '900');
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL\s+alive/);
  assert.match(bad.stdout, /->/);
  assert.equal(run('check', f, '--frames', '10').status, 1, 'a too-short run is refused');
});

test('vly check: a repeating shrill tone is flagged, a gentle one is not', async () => {
  const { spawnSync } = await import('node:child_process');
  const fsm = await import('node:fs'); const osm = await import('node:os'); const pm = await import('node:path');
  const dir = fsm.mkdtempSync(pm.join(osm.tmpdir(), 'vly-shrill-'));
  const game = (hz) => `var t;\nfunc init() { load_font(0); lcd(LCD_BG); }\nfunc frame() { t++; text(1, 1, "T"); print_u(1, 3, t); if ((t & 7) < 4) { tone(1, ${hz}, 6, 1); } else { tone_off(1); } }\n`;
  const loud = pm.join(dir, 'shrill.vly'), soft = pm.join(dir, 'soft.vly');
  fsm.writeFileSync(loud, game(2000)); fsm.writeFileSync(soft, game(600));
  const run = (f) => spawnSync('node', ['cli/vly.js', 'check', f, '--frames', '1800'], { encoding: 'utf8' }).stdout;
  assert.match(run(loud), /WARN\s+shrill/);
  assert.doesNotMatch(run(soft), /shrill/);
});

test('vly test --accept takes a changed picture hash, but never when another expectation fails; run --worst names the costliest frames', async () => {
  const { spawnSync } = await import('node:child_process');
  const fsm = await import('node:fs'); const osm = await import('node:os'); const pm = await import('node:path');
  const dir = fsm.mkdtempSync(pm.join(osm.tmpdir(), 'vly-accept-'));
  fsm.writeFileSync(pm.join(dir, 'main.vly'), 'var n;\nfunc init() { load_font(0); lcd(LCD_BG); text(1, 1, "HI"); }\nfunc frame() { n++; if (n == 5) { for (var r = 0; r < 32; r++) { for (var c = 0; c < 32; c++) { set_cell(c, r, 0); } } } }\n');
  const spec = (hash, n) => JSON.stringify({ entry: 'main.vly', tests: [{ name: 'a', frames: 10, expect: { words: { n }, frameHash: hash } }] });
  const vly = (...a) => spawnSync('node', [pm.resolve('cli/vly.js'), ...a], { cwd: dir, encoding: 'utf8' });
  fsm.writeFileSync(pm.join(dir, 'vly.json'), spec('0'.repeat(64), 10));
  assert.equal(vly('test').status, 2, 'a stale hash fails');
  const r = vly('test', '--accept');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /accepted a new frameHash/);
  assert.equal(vly('test').status, 0, 'and the recorded hash holds');
  fsm.writeFileSync(pm.join(dir, 'vly.json'), spec('0'.repeat(64), 99));
  const bad = vly('test', '--accept');
  assert.equal(bad.status, 2, 'a wrong word value is never accepted');
  assert.match(bad.stdout, /not accepted/);
  const w = vly('run', 'main.vly', '--frames', '10', '--worst', '2');
  assert.match(w.stdout, /WARNING: over 80,000/);
  assert.match(w.stdout, /worst frames: 4 \(/, 'the frame that filled the map is the first one listed (frames count from 0)');
});

test('vly run --audio prints how long and how loud the sound was; vly help <command> is vly <command> --help', async () => {
  const { spawnSync } = await import('node:child_process');
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'vly.js');
  const cart = path.join(conf, 'template_pong.vlc');
  const run = spawnSync(process.execPath, [cli, 'run', cart, '--frames', '120', '--audio'], { encoding: 'utf8' });
  assert.match(run.stdout, /audio: audible [\d.]+ of 2 s, peak [\d.]+ of full scale/);
  const a = spawnSync(process.execPath, [cli, 'help', 'release'], { encoding: 'utf8' }).stdout;
  const b = spawnSync(process.execPath, [cli, 'release', '--help'], { encoding: 'utf8' }).stdout;
  assert.equal(a, b);
  assert.match(a, /whole release in one command/);
});

test('vly run --set starts from a chosen state: variables are set after init, before the first frame', async () => {
  const { spawnSync } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-set-'));
  fs.writeFileSync(path.join(dir, 'main.vly'), 'var level; var lives = 3; var seen;\nfunc frame() { seen = level * 10 + lives; }\n');
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'cli', 'vly.js');
  const out = spawnSync(process.execPath, [cli, 'run', 'main.vly', '--frames', '3', '--set', 'level=7,lives=2', '--mem', 'seen', '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(out.stdout); const d = j.data || j;
  assert.equal(d.mem[0].words[0], 72, JSON.stringify(d.mem));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vly run --oam lists the sprites on screen with their slots (a lower slot draws on top)', async () => {
  const text = `func init() { load_font(0); lcd(LCD_OBJ); hide_all_sprites(); }
func frame() { sprite(3, 20, 30, 65, 0); sprite(1, 22, 32, 66, 1); }`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-oam-')); const f = path.join(dir, 'g.vlc'); fs.writeFileSync(f, b.bytes);
  const r = await commands.run.run({ _: [f], flags: { frames: '3', oam: true } });
  assert.match(r.text, /sprites on screen \(2 of 64; a LOWER slot draws on top/);
  assert.deepEqual(r.data.oam.map((s) => [s.slot, s.x, s.y, s.tile]), [[1, 22, 32, 66], [3, 20, 30, 65]]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vly.json tests can start from a chosen state with "set"', async () => {
  const { runSpecFile } = await import('../src/tools/testrunner.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-set-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'main.vly'), 'var level; var shown;\nfunc init() { load_font(0); lcd(LCD_BG); }\nfunc frame() { shown = level * 2; }');
  fs.writeFileSync(path.join(dir, 'vly.json'), JSON.stringify({ name: 't', entry: 'src/main.vly', tests: [
    { name: 'starts at level 7', frames: 3, set: { level: 7 }, expect: { words: { shown: 14 } } },
    { name: 'default is zero', frames: 3, expect: { words: { shown: 0 } } }] }));
  const r = await runSpecFile(path.join(dir, 'vly.json'));
  assert.equal(r.failed ?? r.results?.filter((x) => !x.ok).length, 0, JSON.stringify(r.results || r).slice(0, 400));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vly run --notes lists the notes each channel played, with pitch names', async () => {
  const text = `var n;
func init() { load_font(0); lcd(LCD_BG); }
func frame() { n++; if (n == 5) { tone(0, 440, 12, 0); } if (n == 40) { tone(0, 880, 12, 0); } }`;
  const b = await buildText({ text, filename: 'main.vly', baseDir: '/x' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-notes-')); const f = path.join(dir, 'g.vlc'); fs.writeFileSync(f, b.bytes);
  const r = await commands.run.run({ _: [f], flags: { frames: '90', notes: true } });
  const ch0 = r.data.notes.filter((n) => n.channel === 0);
  assert.deepEqual(ch0.map((n) => n.note), ['A4', 'A5'], JSON.stringify(r.data.notes));
  assert.match(r.text, /ch0: 2 notes, from A4 to A5/);
  assert.match(r.text, /ch1: silent/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('vly docs --list and --section read a long guide in parts', async () => {
  const l = await commands.docs.run({ _: ['design'], flags: { list: true } });
  assert.match(l.text, /Depth and length|The canvas/);
  const s = await commands.docs.run({ _: ['design'], flags: { section: 'the canvas' } });
  assert.match(s.text, /^## 2\. The canvas/);
  assert.ok(s.text.length < 20000 && s.text.length > 500, 'only that section: ' + s.text.length);
  await assert.rejects(() => commands.docs.run({ _: ['design'], flags: { section: 'zzz no such' } }), /no heading containing/);
});
