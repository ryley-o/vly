// Automatic ROM banking: `bank auto` assets and record tables spread over banks, read from anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFile } from '../src/tools/build.js';
import { runCartridge } from '../src/tools/run.js';

function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-bank-'));
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), data);
  return dir;
}
const records = (n, size) => { const b = Buffer.alloc(n * size); for (let i = 0; i < n; i++) for (let j = 0; j < size; j++) b[i * size + j] = (i * 7 + j * 3) & 255; return b; };
const read = (r, ram, name, i = 0) => r.machine.read16(ram[name].addr + i * 2);

test('a record table is cut into banks and every record reads back, across bank boundaries', async () => {
  const dir = project({
    'levels.bin': records(300, 100),               // 30,000 bytes: 81 records per bank, 4 banks
    'main.vly': `asset levels bank auto records 100 = incbin("levels.bin");
var got[6]; var buf[100];
func init() {}
func frame() {
  got[0] = levels_peek8(0, 0); got[1] = levels_peek8(80, 99); got[2] = levels_peek8(81, 0); got[3] = levels_peek8(299, 50);
  got[4] = levels_peek(250, 2); levels_load(162, buf); got[5] = peek8(buf + 99) * 256 + peek8(buf + 1);
}`,
  });
  const b = await buildFile(path.join(dir, 'main.vly'));
  const a = b.stats.assets.find((x) => x.name === 'levels');
  assert.equal(a.banks, 4);
  assert.equal(a.records, 300);
  const r = runCartridge(b.bytes, { frames: 3 });
  assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 });
  const want = (i, j) => (i * 7 + j * 3) & 255;
  assert.equal(read(r, b.stats.ram, 'got', 0), want(0, 0));
  assert.equal(read(r, b.stats.ram, 'got', 1), want(80, 99));
  assert.equal(read(r, b.stats.ram, 'got', 2), want(81, 0));
  assert.equal(read(r, b.stats.ram, 'got', 3), want(299, 50));
  assert.equal(read(r, b.stats.ram, 'got', 4), want(250, 2) | (want(250, 3) << 8));
  assert.equal(read(r, b.stats.ram, 'got', 5), want(162, 99) * 256 + want(162, 1));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('NAME_COUNT, NAME_RECORD and NAME_PER_BANK are constants', async () => {
  const dir = project({ 'l.bin': records(10, 64), 'main.vly': `asset l bank auto records 64 = incbin("l.bin");\nvar n; var s; var p;\nfunc frame() { n = l_COUNT; s = l_RECORD; p = l_PER_BANK; }` });
  const b = await buildFile(path.join(dir, 'main.vly'));
  const r = runCartridge(b.bytes, { frames: 2 });
  assert.deepEqual([read(r, b.stats.ram, 'n'), read(r, b.stats.ram, 's'), read(r, b.stats.ram, 'p')], [10, 64, 128]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('plain bank auto assets share banks, and avoid the banks you name yourself', async () => {
  const dir = project({
    'a.bin': Buffer.alloc(5000, 1), 'b.bin': Buffer.alloc(3000, 2), 'c.bin': Buffer.alloc(2000, 3), 'x.bin': Buffer.alloc(100, 4),
    'main.vly': `asset a bank auto = incbin("a.bin");
asset b bank auto = incbin("b.bin");
asset c bank auto = incbin("c.bin");
asset x bank 3 = incbin("x.bin");
var o[4];
func frame() { o[0] = bank_peek8(bankof(a), a + 4999); o[1] = bank_peek8(bankof(b), b); o[2] = bank_peek8(bankof(c), c + 1999); o[3] = bank_peek8(bankof(x), x); }`,
  });
  const b = await buildFile(path.join(dir, 'main.vly'));
  const bank = Object.fromEntries(b.stats.assets.map((x) => [x.name, x.bank]));
  assert.notEqual(bank.a, 3, 'bank 3 is taken by x');
  assert.equal(bank.a, bank.b, 'a and b fit together (8000 of 8192)');
  assert.notEqual(bank.c, bank.a, 'c does not fit beside them');
  const r = runCartridge(b.bytes, { frames: 2 });
  assert.deepEqual([0, 1, 2, 3].map((i) => read(r, b.stats.ram, 'o', i)), [1, 2, 3, 4]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a strings asset in an automatic bank still reads through NAME_BANK', async () => {
  const dir = project({ 's.txt': 'HELLO\nWORLD\n', 'main.vly': `strings s bank auto = "s.txt";\nvar buf[20]; var c;\nfunc frame() { str_get(s, s_BANK, 1, buf); c = peek8(buf); }` });
  const b = await buildFile(path.join(dir, 'main.vly'));
  const r = runCartridge(b.bytes, { frames: 2 });
  assert.equal(read(r, b.stats.ram, 'c'), 'W'.charCodeAt(0));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a banked function can read a record table (the accessors switch the bank and put it back)', async () => {
  const dir = project({
    'l.bin': records(200, 100),
    'main.vly': `asset l bank auto records 100 = incbin("l.bin");
var o;
func fetch(i) bank 9 { return l_peek8(i, 5); }
func frame() { o = fetch(150); }`,
  });
  const b = await buildFile(path.join(dir, 'main.vly'));
  const r = runCartridge(b.bytes, { frames: 2 });
  assert.equal(read(r, b.stats.ram, 'o'), (150 * 7 + 15) & 255);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('helpful errors: a file that is not whole records, a plain asset over 8 KB, records with a named bank', async () => {
  const bad = async (files, main) => { const dir = project({ ...files, 'main.vly': main }); try { await buildFile(path.join(dir, 'main.vly')); return null; } catch (e) { return e.message; } finally { fs.rmSync(dir, { recursive: true, force: true }); } };
  assert.match(await bad({ 'l.bin': Buffer.alloc(250) }, 'asset l bank auto records 100 = incbin("l.bin");\nfunc frame() {}'), /not a whole number of 100-byte records/);
  const big = await bad({ 'l.bin': Buffer.alloc(9000) }, 'asset l bank auto = incbin("l.bin");\nfunc frame() {}');
  assert.match(big, /must fit in one 8 KB bank/);
  assert.match(big, /records <bytes per entry>/, 'it points at the record table');
  assert.match(await bad({ 'l.bin': Buffer.alloc(200) }, 'asset l bank 5 records 100 = incbin("l.bin");\nfunc frame() {}'), /records chooses its own banks/);
});

test('records that pack badly are called out', async () => {
  const dir = project({ 'l.bin': Buffer.alloc(9000), 'main.vly': 'asset l bank auto records 3000 = incbin("l.bin");\nvar n;\nfunc frame() { n = l_peek8(2, 0); }' });
  const b = await buildFile(path.join(dir, 'main.vly'));
  assert.ok(b.warnings.some((w) => /leave 2192 bytes of every bank unused/.test(w)), b.warnings.join('\n'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the layout is the same every build', async () => {
  const dir = project({ 'l.bin': records(120, 100), 'a.bin': Buffer.alloc(900, 2), 'main.vly': 'asset l bank auto records 100 = incbin("l.bin");\nasset a bank auto = incbin("a.bin");\nvar n;\nfunc frame() { n = l_peek8(100, 1) + bank_peek8(bankof(a), a); }' });
  const x = await buildFile(path.join(dir, 'main.vly')), y = await buildFile(path.join(dir, 'main.vly'));
  assert.deepEqual(Array.from(x.bytes), Array.from(y.bytes));
  fs.rmSync(dir, { recursive: true, force: true });
});

// A bank a few bytes over must be reported as "bank N holds ..." (so the compiler retries with more spare room), not as
// "internal compiler error ... straddles": the measuring pass used to trip over labels the always-visible part defines too.
import { fullBankError } from '../src/lang/index.js';
test('an overfull bank is explained even when the always-visible part defines asset labels', () => {
  const asm = `.org 0\na_gfx:\n  NOP\n__flat_end:\n.bank 2\n__bank_2:\nfb_big:\n  LDI r0, a_gfx\n${'  NOP\n'.repeat(8195)}fbe_big:\n__bank_2_end:\n`;
  const err = fullBankError(asm, 'main.vly');
  assert.ok(err, 'an error is produced');
  assert.match(err.message, /bank 2 holds \d+ bytes, but a bank is 8192/);
});

test('too much unbanked art: the error names the assets that fill the always-visible region and how to bank them', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-bank-'));
  fs.writeFileSync(path.join(dir, 'big.bin'), Buffer.alloc(20000, 7));
  fs.writeFileSync(path.join(dir, 'small.bin'), Buffer.alloc(100, 3));
  fs.writeFileSync(path.join(dir, 'main.vly'), 'asset sheet = incbin("big.bin");\nasset other bank 3 = incbin("small.bin");\nvar n;\nfunc frame() { n += peek8(sheet) + bank_peek8(bankof(other), other); }\n');
  await assert.rejects(() => buildFile(path.join(dir, 'main.vly')), (e) => /over by \d+\)\. Your unbanked art and data fill 20000 bytes of it \(biggest first: sheet 20000\)\. That is the cause: give each a bank/.test(e.message) && /bank auto/.test(e.message));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the soundtrack recipe in docs/modules.md works: songs in a banked records asset, copied into RAM buffers, played by std/music', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-songs-'));
  const recs = [];
  for (let i = 0; i < 6; i++) { const b = Buffer.alloc(1024); for (let k = 0; k < 32; k++) { b[k * 2] = 20 + (k % 6) * 2 + i; b[k * 2 + 1] = 2; } b[64] = 255; recs.push(b); }
  fs.writeFileSync(path.join(dir, 'songs.bin'), Buffer.concat(recs));
  fs.writeFileSync(path.join(dir, 'main.vly'), `import "std/music";
asset songs bank auto records 1024 = incbin("songs.bin");
byte buf0[1024]; byte buf1[1024]; byte buf2[1024];
func start_song(i) {
  songs_load(3 * i, buf0); songs_load(3 * i + 1, buf1); songs_load(3 * i + 2, buf2);
  music_play(0, 0, buf0, 8); music_play(1, 1, buf1, 6); music_play(2, 2, buf2, 9);
}
func init() { master_volume(10); start_song(1); }
func frame() { music_update(); }
`);
  const b = await buildFile(path.join(dir, 'main.vly'));
  const r = runCartridge(b.bytes, { frames: 120, audio: true });
  assert.deepEqual(r.faults, { DIV0: 0, RO_WRITE: 0, ILLEGAL: 0, OVERRUN: 0 });
  assert.ok(r.audio.some((v) => Math.abs(v) > 0.02), 'the music is audible');
  fs.rmSync(dir, { recursive: true, force: true });
});
