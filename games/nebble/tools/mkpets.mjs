// Generates assets/pets.tiles: egg, baby, child and five adult bodies as shapes (outline and highlights added automatically).
// Colours: 0 clear, 1 light, 2 body, 3 outline. Run: node tools/mkpets.mjs
import fs from 'node:fs';

class Cv {
  constructor(w, h) { this.oy = 0; this.w = w; this.h = h; this.p = Array.from({ length: h }, () => Array(w).fill(0)); }
  px(x, y, c) { x = Math.round(x); y = Math.round(y + this.oy); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y][x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y][x] : 0; }
  ell(cx, cy, rx, ry, c) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy - this.oy) / ry;
      if (dx * dx + dy * dy <= 1) this.p[y][x] = c;
    }
  }
  rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.px(x, y, c); }
  tri(a, b, c, col) {
    const [x1, y1] = [a[0], a[1] + this.oy], [x2, y2] = [b[0], b[1] + this.oy], [x3, y3] = [c[0], c[1] + this.oy];
    const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / d;
      const l2 = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / d;
      if (l1 >= 0 && l2 >= 0 && 1 - l1 - l2 >= 0) this.p[y][x] = col;
    }
  }
  line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) this.px(x0 + (x1 - x0) * i / (n || 1), y0 + (y1 - y0) * i / (n || 1), c); }
  // outline in 3 around every non-empty pixel (4-neighbourhood), keeping existing pixels
  outline() {
    const q = this.p.map((r) => r.slice());
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.p[y][x]) {
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) q[y][x] = 3;
    }
    this.p = q;
  }
  // light rim on the upper-left inside edge of body colour 2
  rim() {
    const q = this.p.map((r) => r.slice());
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.p[y][x] === 2) {
      if (this.get(x - 1, y) === 3 && this.get(x, y - 1) !== 3 || this.get(x, y - 1) === 3 && this.get(x - 1, y) !== 3 ) q[y][x] = 1;
      else if (this.get(x - 1, y - 1) === 3 && this.get(x - 1, y) === 2 && this.get(x, y - 1) === 2) q[y][x] = 1;
    }
    this.p = q;
  }
  // squash: drop one row at `r`, push everything above down by one (feet stay put)
  squash(r) { const q = this.p.map((x) => x.slice()); for (let y = r; y > 0; y--) q[y] = this.p[y - 1].slice(); q[0] = Array(this.w).fill(0); const c = new Cv(this.w, this.h); c.p = q; return c; }
  // widen: duplicate the centre column (shifting the right half) then drop the last column
  rows() { return this.p.map((r) => r.map((c) => (c ? String(c) : '.')).join('')); }
}
const mirrorX = (cv) => { for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w / 2; x++) { const a = cv.p[y][x], b = cv.p[y][cv.w - 1 - x]; if (a && !b) cv.p[y][cv.w - 1 - x] = a; else if (b && !a) cv.p[y][x] = b; } };

const out = [];
const emit = (name, cv, tw) => {
  out.push(`sprite ${name} ${tw}x${tw}:`);
  for (const r of cv.rows()) out.push('  ' + r);
};

// a body is built in 'build(cv)' (colours 1/2 only), then outlined and rimmed. face anchor is documented in game code.
function body(w, build, oy = 0) {
  const cv = new Cv(w, w); cv.oy = oy; build(cv);
  const outlineThen = (c) => { c.outline(); c.rim(); return c; };
  const a = outlineThen(cv);
  return a;
}
function twoFrames(name, size, build, sqRow, oy = 0) {
  const a = body(size, build, oy);
  emit(name + '_a', a, size / 8);
  emit(name + '_b', a.squash(sqRow), size / 8);
}

// ---- EGG (3 stages) ----
function egg(stage) {
  const cv = new Cv(16, 16);
  cv.ell(8, 8.6, 5.6, 7, 2);
  // spots
  cv.px(5, 6, 1); cv.px(6, 6, 1); cv.px(5, 7, 1);
  cv.px(10, 9, 1); cv.px(11, 9, 1); cv.px(10, 10, 1);
  cv.px(7, 12, 1); cv.px(8, 12, 1);
  cv.ell(6.2, 4.2, 1.4, 1.8, 1);
  if (stage >= 1) { // crack zig-zag
    const pts = [[4, 8], [6, 9], [7, 7], [9, 9], [11, 7]];
    for (let i = 0; i < pts.length - 1; i++) cv.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3);
  }
  if (stage >= 2) { // top shell tilted off: remove top, add jagged teeth
    for (let y = 0; y < 7; y++) for (let x = 0; x < 16; x++) if (cv.p[y][x]) cv.p[y][x] = 0;
    const teeth = [[3, 7], [5, 5], [7, 7], [9, 5], [11, 7], [13, 6]];
    for (const [x, y] of teeth) { cv.px(x, y, 2); cv.px(x, y + 1, 2); cv.px(x + 1, y + 1, 2); }
    for (let x = 3; x <= 13; x++) cv.px(x, 7, 2);
    // a bit of baby peeking in 1
    cv.ell(8, 8.6, 3.2, 1.6, 1);
  }
  cv.outline();
  return cv;
}
emit('egg0', egg(0), 2); emit('egg1', egg(1), 2); emit('egg2', egg(2), 2);

// ---- BABY 16x16 ----
twoFrames('baby', 16, (c) => {
  c.ell(8, 9.4, 6.4, 5.6, 2);                 // body
  c.ell(5, 14, 2.2, 1.4, 2); c.ell(11, 14, 2.2, 1.4, 2);   // feet
  c.px(8, 3, 2); c.px(8, 2, 2); c.px(9, 2, 1); c.px(7, 1, 1); c.px(10, 1, 1); // sprout
}, 12, -1);

// ---- CHILD 32x32 ----
twoFrames('child', 32, (c) => {
  c.ell(15.5, 20.5, 9.5, 8.5, 2);
  c.ell(9.5, 12.5, 3.2, 3.6, 2); c.ell(21.5, 12.5, 3.2, 3.6, 2);          // round ears
  c.ell(9.5, 12.8, 1.6, 2, 1); c.ell(21.5, 12.8, 1.6, 2, 1);
  c.ell(10.5, 29, 4.4, 2, 2); c.ell(20.5, 29, 4.4, 2, 2);                 // feet
  c.ell(5.8, 22.5, 2.6, 3, 2); c.ell(25.2, 22.5, 2.6, 3, 2);              // arms
  c.ell(15.5, 25.5, 5.5, 3.2, 1);                                         // belly
  c.px(15, 10, 2); c.px(16, 10, 2); c.px(16, 9, 2); c.px(17, 8, 1); c.px(15, 8, 1);
}, 22, -1);

// ---- ADULTS 32x32 ----
// STAR: balanced, golden, antennae with stars
twoFrames('star', 32, (c) => {
  c.ell(15.5, 19.5, 11.5, 10.5, 2);
  c.ell(10.5, 29, 4.6, 2.2, 2); c.ell(20.5, 29, 4.6, 2.2, 2);
  c.ell(4.5, 21.5, 3, 3.4, 2); c.ell(26.5, 21.5, 3, 3.4, 2);
  c.ell(15.5, 25.5, 6.5, 4, 1);
  c.line(10, 9, 7, 5, 2); c.line(21, 9, 24, 5, 2);
  c.ell(7, 4.2, 2, 2, 1); c.ell(24, 4.2, 2, 2, 1);
  c.px(15, 7, 1); c.px(16, 7, 1); c.px(15, 8, 1); c.px(16, 8, 1); c.px(14, 8, 1); c.px(17, 8, 1); c.px(15, 6, 1); c.px(16, 6, 1);
}, 24, -1);
// DASH: tall, sporty, pointed ears, bolt on the belly, headband
twoFrames('dash', 32, (c) => {
  c.ell(15.5, 18.5, 9, 11.5, 2);
  c.tri([8, 10], [6, 2], [14, 7], 2); c.tri([23, 10], [25, 2], [17, 7], 2);
  c.tri([8.5, 8], [7.5, 4], [12, 6.5], 1); c.tri([22.5, 8], [23.5, 4], [19, 6.5], 1);
  c.ell(10.5, 29, 5, 2.2, 2); c.ell(20.5, 29, 5, 2.2, 2);
  c.ell(5.5, 20, 2.4, 3.6, 2); c.ell(25.5, 20, 2.4, 3.6, 2);
  c.rect(8, 11, 23, 12, 1);                                   // headband
  c.line(17, 21, 13, 25, 1); c.line(18, 21, 14, 25, 1); c.line(13, 25, 17, 25, 1); c.line(17, 25, 13, 29, 1); c.line(18, 25, 14, 29, 1);
  c.line(27, 24, 30, 20, 2); c.line(30, 20, 28, 17, 2);    // tail
}, 24, -1);
// PUDGE: wide, round, small head ears, big belly
twoFrames('pudge', 32, (c) => {
  c.ell(15.5, 21, 14.2, 9.6, 2);
  c.ell(7.5, 13, 3, 3.2, 2); c.ell(23.5, 13, 3, 3.2, 2);
  c.ell(7.5, 13.3, 1.5, 1.8, 1); c.ell(23.5, 13.3, 1.5, 1.8, 1);
  c.ell(9.5, 29.4, 4.2, 1.8, 2); c.ell(21.5, 29.4, 4.2, 1.8, 2);
  c.ell(15.5, 26, 9.5, 4.2, 1);
  c.ell(2.6, 22, 2, 2.6, 2); c.ell(28.4, 22, 2, 2.6, 2);
  c.px(15, 11, 1); c.px(16, 11, 1);
}, 25, -1);
// LUNA: calm, purple, cat-like tall ears, crescent mark, fluffy tail
twoFrames('luna', 32, (c) => {
  c.ell(15.5, 19.5, 10.4, 10, 2);
  c.ell(10, 7, 2.8, 6.2, 2); c.ell(21, 7, 2.8, 6.2, 2);
  c.ell(10, 7.4, 1.2, 4.2, 1); c.ell(21, 7.4, 1.2, 4.2, 1);
  c.ell(10, 29, 4.6, 2.2, 2); c.ell(21, 29, 4.6, 2.2, 2);
  c.ell(4.8, 21, 2.6, 3.2, 2); c.ell(26.2, 21, 2.6, 3.2, 2);
  c.ell(15.5, 25, 6, 4.2, 1);
  c.ell(15.5, 9.3, 2.8, 2.8, 1); c.ell(16.8, 8.7, 2.5, 2.5, 2);        // crescent
  c.ell(28, 27, 3, 3, 2); c.ell(29, 25, 2, 2.4, 1);                      // fluffy tail
}, 23, -1);
// SCAMP: scruffy, spiky tufts, one droopy ear, patches
twoFrames('scamp', 32, (c) => {
  c.ell(15.5, 20.5, 10.3, 9, 2);
  c.ell(9.5, 16.5, 5.5, 5.5, 2);
  c.tri([8, 11], [5, 2], [12, 9], 2); c.tri([13, 10], [13, 1], [17, 9], 2); c.tri([17, 10], [21, 2], [22, 10], 2);
  c.tri([23, 12], [30, 14], [25, 18], 2);                                   // droopy ear
  c.ell(10.5, 29.4, 4.6, 2, 2); c.ell(21, 29.4, 4.6, 2, 2);
  c.ell(5, 23, 2.6, 3.2, 2); c.ell(26, 23, 2.6, 3.2, 2);
  c.px(20, 25, 1); c.px(21, 25, 1); c.px(20, 26, 1); c.px(12, 27, 1); c.px(11, 26, 1);  // grubby patches
  c.px(8, 24, 1); c.px(24, 21, 1);
}, 24, -1);

fs.writeFileSync(new URL('../assets/pets.tiles', import.meta.url), '# generated by tools/mkpets.mjs: pet bodies. 1 light, 2 body, 3 outline\n' + out.join('\n') + '\n');
console.log('pets.tiles written');
