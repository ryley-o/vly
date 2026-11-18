// Generates assets/art.tiles from small drawing routines (run: node tools/genart.js).
const fs = require('fs');
const out = [];
function mk(w = 16, h = 16) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(0)); g.w = w; g.h = h; return g; }
const px = (g, x, y, c) => { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g[y][x] = c; };
const rect = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
const hl = (g, x, y, w, c) => rect(g, x, y, w, 1, c);
const vl = (g, x, y, h, c) => rect(g, x, y, 1, h, c);
const box = (g, x, y, w, h, c) => { hl(g, x, y, w, c); hl(g, x, y + h - 1, w, c); vl(g, x, y, h, c); vl(g, x + w - 1, y, h, c); };
const fill = (g, c) => rect(g, 0, 0, g.w, g.h, c);
function emit(kind, name, g, wt, ht) {
  if (kind === 'tile') out.push(`tile ${name}:`); else out.push(`sprite ${name} ${wt}x${ht}:`);
  for (const r of g) out.push('  ' + r.map(v => (v ? String(v) : '.')).join(''));
}
function blk(name, fn) { const g = mk(); fn(g); emit('sprite', name, g, 2, 2); }
function ascii(rows) { return rows.map(r => r.split('').map(ch => (ch === '.' ? 0 : +ch))); }
function check(name, rows, w, h) { if (rows.length !== h || rows.some(r => r.length !== w)) throw new Error(name + ' bad size ' + rows.map(r => r.length).join(',')); }
function spr(name, rows) { check(name, rows, 16, 16); const g = ascii(rows); g.w = 16; g.h = 16; emit('sprite', name, g, 2, 2); }
const C = s => { const p = Math.floor((16 - s.length) / 2); return '.'.repeat(p) + s + '.'.repeat(16 - s.length - p); };

// ---------- floors and walls (palette 0 = the room theme) ----------
blk('floor_a', g => { hl(g, 0, 7, 16, 1); hl(g, 0, 15, 16, 1); vl(g, 5, 0, 7, 1); vl(g, 11, 8, 7, 1); });
blk('floor_b', g => { hl(g, 0, 7, 16, 1); hl(g, 0, 15, 16, 1); vl(g, 11, 0, 7, 1); vl(g, 4, 8, 7, 1); });
blk('wall', g => { fill(g, 2); hl(g, 0, 0, 16, 3); hl(g, 0, 1, 16, 1); hl(g, 0, 13, 16, 3); vl(g, 3, 3, 9, 1); vl(g, 11, 3, 9, 1); px(g, 7, 6, 1); px(g, 8, 6, 1); px(g, 7, 7, 1); px(g, 8, 7, 1); });
blk('window', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 2, 1, 12, 12, 1); rect(g, 3, 2, 10, 10, 3); vl(g, 7, 2, 10, 1); vl(g, 8, 2, 10, 1); hl(g, 3, 6, 10, 1); hl(g, 3, 7, 10, 1); px(g, 5, 4, 1); px(g, 11, 9, 1); px(g, 10, 3, 1); });
blk('door', g => { fill(g, 2); rect(g, 2, 0, 12, 16, 1); rect(g, 3, 1, 10, 15, 3); rect(g, 5, 13, 6, 3, 0); });
// locked door (palette 1 wood: 1 light, 2 mid, 3 dark)
blk('door_lock', g => { fill(g, 3); rect(g, 1, 0, 14, 16, 2); vl(g, 5, 0, 16, 3); vl(g, 10, 0, 16, 3); rect(g, 11, 7, 3, 4, 1); px(g, 12, 9, 3); box(g, 0, 0, 16, 16, 3); });
blk('stairs', g => { fill(g, 3); for (let i = 0; i < 5; i++) { hl(g, 2 + i, 1 + i * 3, 12 - i * 2, 1); hl(g, 2 + i, 2 + i * 3, 12 - i * 2, 2); } });
// ---------- furniture ----------
blk('rug', g => { fill(g, 0); rect(g, 0, 1, 16, 14, 1); rect(g, 1, 2, 14, 12, 2); box(g, 3, 4, 10, 8, 3); rect(g, 5, 6, 6, 4, 1); px(g, 7, 7, 3); px(g, 8, 8, 3); hl(g, 0, 0, 16, 0); for (let x = 0; x < 16; x += 2) { px(g, x, 0, 1); px(g, x, 15, 1); } });
blk('desk', g => { rect(g, 1, 2, 14, 10, 3); rect(g, 2, 3, 12, 6, 1); rect(g, 2, 9, 12, 3, 2); rect(g, 2, 12, 3, 4, 3); rect(g, 11, 12, 3, 4, 3); rect(g, 6, 10, 4, 1, 1); rect(g, 3, 4, 3, 3, 2); px(g, 4, 5, 3); rect(g, 10, 4, 3, 2, 2); });
blk('table', g => { rect(g, 1, 3, 14, 8, 3); rect(g, 2, 4, 12, 6, 1); rect(g, 2, 11, 2, 4, 3); rect(g, 12, 11, 2, 4, 3); rect(g, 6, 2, 4, 5, 2); rect(g, 7, 1, 2, 1, 3); px(g, 7, 6, 1); });
blk('chess', g => { rect(g, 1, 3, 14, 10, 3); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) rect(g, 2 + i * 2, 4 + j * 2, 2, 2, (i + j) & 1 ? 2 : 1); rect(g, 2, 13, 2, 3, 3); rect(g, 12, 13, 2, 3, 3); px(g, 5, 5, 3); px(g, 9, 7, 3); });
blk('shelf', g => { fill(g, 3); rect(g, 1, 1, 14, 14, 2); hl(g, 1, 5, 14, 3); hl(g, 1, 10, 14, 3); for (let r = 0; r < 3; r++) { const y = 1 + r * 5; let x = 2; let k = 0; while (x < 14) { const w = 1 + ((k + r) % 3); rect(g, x, y, w, 4, k % 2 ? 1 : 3); vl(g, x, y, 4, 3); x += w + 1; k++; } } });
blk('shelf_odd', g => { fill(g, 3); rect(g, 1, 1, 14, 14, 3); hl(g, 1, 7, 14, 1); rect(g, 2, 2, 3, 5, 1); rect(g, 5, 2, 3, 5, 2); rect(g, 8, 2, 3, 5, 1); rect(g, 11, 2, 3, 5, 2); rect(g, 6, 9, 4, 4, 1); px(g, 7, 10, 3); px(g, 8, 10, 3); hl(g, 1, 8, 14, 2); });
blk('shelf_open', g => { fill(g, 3); rect(g, 1, 1, 14, 14, 3); rect(g, 3, 3, 10, 10, 2); rect(g, 6, 6, 4, 4, 1); px(g, 7, 7, 3); px(g, 8, 8, 3); });
blk('fire', g => { fill(g, 2); rect(g, 0, 0, 16, 16, 2); rect(g, 1, 3, 14, 13, 3); rect(g, 3, 5, 10, 11, 1); rect(g, 4, 6, 8, 10, 3); rect(g, 6, 9, 4, 7, 1); rect(g, 7, 7, 2, 4, 1); hl(g, 0, 2, 16, 3); });
blk('fire2', g => { fill(g, 2); rect(g, 0, 0, 16, 16, 2); rect(g, 1, 3, 14, 13, 3); rect(g, 3, 5, 10, 11, 1); rect(g, 4, 6, 8, 10, 3); rect(g, 5, 10, 6, 6, 1); rect(g, 9, 8, 2, 3, 1); rect(g, 6, 8, 2, 3, 1); hl(g, 0, 2, 16, 3); });
blk('painting', g => { fill(g, 3); rect(g, 1, 1, 14, 13, 1); rect(g, 3, 3, 10, 9, 2); rect(g, 3, 8, 10, 4, 3); px(g, 10, 5, 1); px(g, 11, 5, 1); rect(g, 7, 6, 2, 3, 1); hl(g, 0, 14, 16, 3); });
blk('painting_cats', g => { fill(g, 3); rect(g, 1, 1, 14, 13, 1); rect(g, 3, 3, 10, 9, 2); rect(g, 4, 7, 3, 3, 3); px(g, 4, 6, 3); px(g, 6, 6, 3); rect(g, 9, 7, 3, 3, 3); px(g, 9, 6, 3); px(g, 11, 6, 3); hl(g, 4, 10, 8, 3); hl(g, 0, 14, 16, 3); });
blk('painting_rain', g => { fill(g, 3); rect(g, 1, 1, 14, 13, 1); rect(g, 3, 3, 10, 9, 2); box(g, 4, 4, 8, 8, 1); box(g, 5, 5, 6, 7, 3); box(g, 6, 6, 4, 6, 1); hl(g, 3, 11, 10, 3); });
blk('moonwin', g => { fill(g, 3); rect(g, 1, 0, 14, 14, 1); rect(g, 2, 1, 12, 12, 2); rect(g, 4, 3, 5, 5, 1); rect(g, 6, 3, 4, 5, 2); px(g, 11, 3, 1); px(g, 3, 9, 1); px(g, 12, 10, 1); hl(g, 0, 14, 16, 3); vl(g, 7, 1, 12, 1); });
blk('shells', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 1, 9, 14, 3, 1); hl(g, 1, 12, 14, 3); const xs = [2, 4, 6, 8, 10, 12, 14]; xs.forEach((x, i) => { px(g, x, 8 - (i % 2), 3); px(g, x - 1 < 0 ? 0 : x - 1, 9, 3); }); rect(g, 0, 1, 16, 1, 3); });
blk('safe', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 1, 1, 14, 12, 3); rect(g, 2, 2, 12, 10, 2); rect(g, 5, 4, 6, 6, 1); rect(g, 6, 5, 4, 4, 3); px(g, 8, 6, 1); px(g, 8, 7, 1); rect(g, 12, 6, 1, 3, 1); });
blk('safe_open', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 1, 1, 14, 12, 3); rect(g, 3, 3, 10, 8, 3); rect(g, 1, 1, 3, 12, 1); px(g, 2, 6, 3); });
blk('case', g => { fill(g, 0); rect(g, 3, 11, 10, 5, 3); rect(g, 4, 12, 8, 3, 1); rect(g, 3, 4, 10, 7, 2); rect(g, 4, 5, 8, 5, 3); rect(g, 5, 6, 6, 3, 2); px(g, 12, 13, 3); rect(g, 6, 8, 4, 1, 1); });
blk('plant', g => { rect(g, 4, 10, 8, 6, 3); rect(g, 5, 10, 6, 5, 2); rect(g, 3, 2, 4, 6, 2); rect(g, 9, 3, 4, 5, 2); rect(g, 6, 0, 4, 9, 2); vl(g, 8, 6, 5, 3); px(g, 5, 4, 1); px(g, 11, 5, 1); px(g, 8, 2, 1); });
blk('umbrella', g => { rect(g, 3, 8, 10, 8, 3); rect(g, 4, 9, 8, 6, 2); vl(g, 5, 1, 8, 3); vl(g, 8, 0, 9, 3); vl(g, 11, 2, 7, 3); rect(g, 4, 1, 3, 2, 1); rect(g, 10, 2, 3, 2, 1); });
blk('stove', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 0, 3, 16, 13, 3); rect(g, 1, 4, 14, 11, 2); rect(g, 3, 8, 10, 6, 3); rect(g, 4, 9, 8, 4, 1); rect(g, 2, 4, 4, 2, 3); rect(g, 10, 4, 4, 2, 3); rect(g, 6, 1, 5, 3, 1); hl(g, 6, 1, 5, 3); });
blk('timer', g => { fill(g, 2); hl(g, 0, 13, 16, 3); rect(g, 3, 1, 10, 12, 3); rect(g, 4, 2, 8, 10, 1); rect(g, 5, 3, 6, 8, 2); px(g, 8, 4, 3); vl(g, 8, 5, 3, 3); hl(g, 8, 7, 3, 3); px(g, 5, 2, 3); px(g, 10, 2, 3); });
blk('cupboard', g => { rect(g, 0, 2, 16, 14, 3); rect(g, 1, 3, 14, 12, 2); vl(g, 8, 3, 12, 3); rect(g, 6, 8, 1, 3, 1); rect(g, 10, 8, 1, 3, 1); rect(g, 2, 4, 5, 4, 1); rect(g, 9, 4, 5, 4, 1); });
blk('cupboard_lock', g => { rect(g, 0, 2, 16, 14, 3); rect(g, 1, 3, 14, 12, 2); vl(g, 8, 3, 12, 3); rect(g, 6, 8, 1, 3, 1); rect(g, 10, 8, 1, 3, 1); rect(g, 7, 11, 3, 3, 1); px(g, 8, 12, 3); rect(g, 2, 4, 5, 4, 1); rect(g, 9, 4, 5, 4, 1); });
blk('cupboard_open', g => { rect(g, 0, 2, 16, 14, 3); rect(g, 2, 4, 12, 10, 3); rect(g, 2, 4, 3, 10, 2); rect(g, 11, 4, 3, 10, 2); rect(g, 6, 9, 4, 4, 1); });
blk('barrel', g => { rect(g, 3, 1, 10, 14, 3); rect(g, 2, 4, 12, 8, 3); rect(g, 4, 2, 8, 12, 2); rect(g, 3, 5, 10, 6, 2); hl(g, 3, 4, 10, 3); hl(g, 3, 11, 10, 3); vl(g, 7, 2, 12, 1); vl(g, 9, 2, 12, 1); });
blk('clock', g => { fill(g, 2); rect(g, 1, 0, 14, 15, 3); rect(g, 2, 1, 12, 13, 1); rect(g, 3, 2, 10, 11, 2); rect(g, 4, 3, 8, 9, 1); vl(g, 8, 4, 4, 3); hl(g, 8, 7, 3, 3); px(g, 8, 3, 3); px(g, 8, 11, 3); px(g, 4, 7, 3); px(g, 11, 7, 3); hl(g, 0, 15, 16, 3); });
blk('pend', g => { rect(g, 2, 0, 12, 16, 3); rect(g, 3, 1, 10, 14, 2); vl(g, 8, 2, 7, 3); rect(g, 5, 9, 6, 5, 1); rect(g, 6, 10, 4, 3, 3); });
blk('pend2', g => { rect(g, 2, 0, 12, 16, 3); rect(g, 3, 1, 10, 14, 2); vl(g, 8, 2, 4, 3); px(g, 7, 6, 3); px(g, 6, 7, 3); vl(g, 5, 8, 1, 3); rect(g, 3, 9, 5, 5, 1); rect(g, 4, 10, 3, 3, 3); });
blk('gears', g => { fill(g, 2); hl(g, 0, 13, 16, 3); box(g, 2, 2, 8, 8, 1); rect(g, 4, 4, 4, 4, 3); box(g, 8, 6, 7, 7, 1); rect(g, 10, 8, 3, 3, 3); px(g, 5, 1, 1); px(g, 5, 10, 1); px(g, 1, 5, 1); px(g, 10, 5, 1); });
blk('bench', g => { rect(g, 0, 4, 16, 8, 3); rect(g, 1, 5, 14, 5, 1); rect(g, 1, 12, 3, 4, 3); rect(g, 12, 12, 3, 4, 3); rect(g, 3, 6, 4, 3, 2); rect(g, 9, 6, 5, 3, 2); px(g, 11, 7, 3); });
blk('trunk', g => { rect(g, 1, 3, 14, 12, 3); rect(g, 2, 4, 12, 10, 2); hl(g, 2, 8, 12, 3); rect(g, 7, 7, 2, 3, 1); vl(g, 4, 4, 10, 1); vl(g, 11, 4, 10, 1); });
blk('trunk_open', g => { rect(g, 1, 1, 14, 5, 3); rect(g, 2, 2, 12, 3, 2); rect(g, 1, 6, 14, 9, 3); rect(g, 2, 7, 12, 7, 1); rect(g, 6, 8, 5, 4, 2); px(g, 8, 9, 1); });
blk('hatbox', g => { rect(g, 2, 9, 12, 7, 3); rect(g, 3, 10, 10, 5, 1); rect(g, 4, 3, 8, 6, 3); rect(g, 5, 4, 6, 4, 2); hl(g, 3, 9, 10, 2); rect(g, 6, 11, 4, 2, 2); });
blk('dummy', g => { rect(g, 5, 1, 6, 3, 1); rect(g, 3, 4, 10, 8, 1); rect(g, 4, 5, 8, 6, 2); vl(g, 8, 12, 3, 3); hl(g, 5, 15, 6, 3); vl(g, 3, 4, 8, 3); vl(g, 12, 4, 8, 3); });
blk('mirror', g => { fill(g, 2); rect(g, 2, 0, 12, 15, 3); rect(g, 3, 1, 10, 13, 1); rect(g, 4, 2, 8, 11, 3); vl(g, 6, 3, 4, 1); vl(g, 7, 4, 3, 1); hl(g, 0, 15, 16, 3); });
blk('toys', g => { rect(g, 2, 9, 12, 7, 3); rect(g, 3, 10, 10, 5, 2); rect(g, 4, 4, 5, 5, 1); rect(g, 5, 5, 3, 3, 3); rect(g, 10, 6, 4, 3, 1); px(g, 11, 7, 3); });
// ---------- tiles for the UI, icons, title ----------
function tile(name, rows) { check(name, rows, 8, 8); const g = ascii(rows); g.w = 8; g.h = 8; emit('tile', name, g); }
tile('bx_c', ['........', '.3333333', '.3222222', '.3211111', '.3213333', '.3213...', '.3213...', '.3213...'].map(r => r.replace(/3/g, '3')));
tile('bx_h', ['........', '33333333', '22222222', '11111111', '33333333', '........', '........', '........']);
tile('bx_v', ['.3213...', '.3213...', '.3213...', '.3213...', '.3213...', '.3213...', '.3213...', '.3213...']);
tile('ic_key1', ['........', '..111...', '.1...1..', '.1...1..', '..111...', '...1....', '...11...', '...11...']);
tile('ic_key2', ['........', '..222...', '.2...2..', '.2...2..', '..222...', '...2....', '...22...', '...22...']);
tile('ic_gear', ['...22...', '.2.22.2.', '..2222..', '22.22.22', '22.22.22', '..2222..', '.2.22.2.', '...22...']);
tile('ic_key3', ['........', '..1111..', '.1....1.', '..1111..', '...1....', '...11...', '...1....', '...11...']);
tile('ic_box', ['........', '..3333..', '.322223.', '.322223.', '.311113.', '.311113.', '..3333..', '........']);
tile('ic_book', ['.222222.', '.2111112', '.2111112', '.2122212', '.2111112', '.2111112', '.2222222', '........']);
tile('sil', ['33333333', '33333333', '33333333', '33333333', '33333333', '33333333', '33333333', '33333333']);
tile('sil_win', ['33333333', '33111133', '33111133', '33111133', '33111133', '33333333', '33333333', '33333333']);
tile('sil_roofl', ['.......3', '......33', '.....333', '....3333', '...33333', '..333333', '.3333333', '33333333']);
tile('sil_roofr', ['3.......', '33......', '333.....', '3333....', '33333...', '333333..', '3333333.', '33333333']);
tile('sil_tower', ['...33...', '..3333..', '.333333.', '33333333', '33333333', '33333333', '33333333', '33333333']);
tile('star', ['........', '...1....', '...1....', '.11111..', '...1....', '...1....', '........', '........']);
tile('star2', ['........', '........', '........', '...11...', '........', '........', '........', '........']);
tile('arrow', ['........', '..3.....', '..33....', '..333...', '..33....', '..3.....', '........', '........']);
tile('note_dot', ['........', '........', '..3333..', '.333333.', '.333333.', '..3333..', '........', '........']);

// ---------- characters (palette: 1 skin, 2 clothes, 3 hair / outline) ----------
const hd = {
  hero: [C('333333'), C('33333333'), C('3333333333'), C('3311111133'), C('3131111313'), C('3111111113'), C('33111133'), C('333333')],
  odile: [C('33'), C('333333'), C('3333333333'), C('3311111133'), C('3131111313'), C('3111111113'), C('33111133'), C('333333')],
  vale: [C('222222'), C('22222222'), C('3333333333'), C('3311111133'), C('3131111313'), C('3113333113'), C('33111133'), C('333333')],
  pim: [C('2222'), C('22222222'), C('3333333333'), C('3311111133'), C('3131111313'), C('3111111113'), C('33111133'), C('333333')],
  rook: [C('333333'), C('33333333'), C('3333333333'), C('3311111133'), C('3313113133'), C('3111111113'), C('33111133'), C('333333')],
};
const back = [C('333333'), C('33333333'), C('3333333333'), C('3333333333'), C('3333333333'), C('3333333333'), C('33333333'), C('333333')];
const side = ['.....333333.....', '....3333333.....', '....33333333....', '....33331113....', '....33331313....', '....33331113....', '.....331113.....', '......3333......'];
const bodyF = [C('3322222233'), C('332222222233'), C('312222222213'), C('312222222213'), C('332222222233')];
const bodyB = [C('3322222233'), C('332222222233'), C('332222222233'), C('332222222233'), C('332222222233')];
const bodyS = [C('33222233'), C('3322222233'), C('3322222233'), C('3122222213'), C('3322222233')];
const legs = [['.....33..33.....', '....333..333....'], ['.....33....33...', '....333....333..']];
const skirt = [['...3222222223....'.slice(0, 16), '..333333333333..'], ['...3222222223....'.slice(0, 16), '..333333333333..']];
function fig(name, head, body, lg) { for (const f of [0, 1]) spr(name + '_' + f, ['................', ...head, ...body, ...lg[f]]); }
fig('hero_d', hd.hero, bodyF, legs); fig('hero_u', back, bodyB, legs); fig('hero_s', side, bodyS, legs);
const skirtL = [['..322222222223..', '..333333333333..'], ['..322222222223..', '..333333333333..']];
fig('odile', hd.odile, bodyF, skirtL); fig('vale', hd.vale, bodyF, legs); fig('pim', hd.pim, bodyF, skirtL); fig('rook', hd.rook, bodyF, legs);
// the cat
function cat(name, f) { const g = mk(); rect(g, 3, 9, 8, 5, 2); rect(g, 10, 6, 5, 5, 2); px(g, 10, 5, 3); px(g, 14, 5, 3); px(g, 12, 8, 3); px(g, 14, 8, 3); rect(g, 3, 14, 2, 2, 2); rect(g, 9, 14, 2, 2, 2); hl(g, 4, 9, 6, 1); if (f) { rect(g, 0, 8, 3, 2, 2); px(g, 0, 7, 2); } else { rect(g, 0, 10, 3, 2, 2); px(g, 0, 11, 3); } px(g, 6, 11, 3); px(g, 8, 12, 3); emit('sprite', name, g, 2, 2); }
cat('cat_0', 0); cat('cat_1', 1);
// the moon (4x4 tiles = 32x32 sprite) and sparkle
{ const g = mk(32, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5); if (d < 14) g[y][x] = 1; } for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { if (Math.hypot(x - 20, y - 12) < 6 || Math.hypot(x - 10, y - 21) < 4 || Math.hypot(x - 21, y - 22) < 3) if (g[y][x]) g[y][x] = 2; } emit('sprite', 'moon', g, 4, 4); }
fs.writeFileSync(__dirname + '/../assets/art.tiles', '# generated by tools/genart.js\n' + out.join('\n') + '\n');
console.log('wrote', out.length, 'lines');
