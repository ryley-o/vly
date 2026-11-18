// Builds assets/lv1.bin..lv3.bin (column-major, 17 bytes per column) from level code. Run: node tools/mklevels.mjs
// Cell codes: 0 sky 1 grass 2 dirt 3 brick 4 wood(one-way) 5 spikes 6 lava 7 coin 8 ingredient 9 chili 10 scroll 11 rice ball
//   12 checkpoint 13 bamboo 14 bamboo+leaf 15 lantern | markers: 20 walker 21 hopper 22 crow 23 fire pot
import fs from 'node:fs';
const H = 17, W = 240, ARENA = 220;
const CODE = { sky: 0, grass: 1, dirt: 2, brick: 3, wood: 4, spikes: 5, lava: 6, coin: 7, ing: 8, chili: 9, scroll: 10, rice: 11, cp: 12, b1: 13, b2: 14, lan: 15, walker: 20, hopper: 21, crow: 22, pot: 23 };
function level(build) {
  const g = Array.from({ length: W }, () => Array(H).fill(0));
  const top = Array(W).fill(0);
  const L = {
    put(x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) g[x][y] = CODE[c] ?? c; },
    get(x, y) { return g[x][y]; },
    ground(x0, x1, t) { for (let x = x0; x <= x1; x++) { top[x] = t; for (let y = t; y < H; y++) g[x][y] = y === t ? 1 : 2; } },
    pit(x0, x1, lava) { for (let x = x0; x <= x1; x++) { top[x] = 0; for (let y = 0; y < H; y++) g[x][y] = 0; if (lava) { g[x][15] = 6; g[x][16] = 6; } } },
    plat(x, y, n, c = 'wood') { for (let i = 0; i < n; i++) L.put(x + i, y, c); },
    tower(x, w, h, t) { for (let i = 0; i < w; i++) for (let j = 1; j <= h; j++) L.put(x + i, t - j, 'brick'); },
    coins(x, y, n) { for (let i = 0; i < n; i++) L.put(x + i, y, 'coin'); },
    arc(x, t, n) { for (let i = 0; i < n; i++) L.put(x + i, t - 3 - Math.round(Math.sin(Math.PI * (i + 0.5) / n) * 2), 'coin'); },
    spikes(x, n, t) { for (let i = 0; i < n; i++) L.put(x + i, t - 1, 'spikes'); },
    foe(kind, x, t) { L.put(x, kind === 'crow' ? t : t - 2, kind); },   // for crow, t is the row itself
    top, g,
  };
  build(L);
  return L;
}
function deco(L, c1, c2, seed) {
  let r = seed;
  for (let x = 3; x < ARENA; x++) {
    r = (r * 75 + 74) % 65537;
    const t = L.top[x];
    if (t && r % 5 === 0 && L.get(x, t - 1) === 0 && L.get(x, t - 2) === 0) { L.put(x, t - 1, r % 2 ? c1 : c2); if (c1 !== 'lan') L.put(x, t - 2, c1); }
  }
}
function arena(L) { L.ground(ARENA, W - 1, 13); }

const lv1 = level((L) => {
  L.ground(0, 25, 13); L.arc(8, 13, 6); L.coins(16, 11, 4); L.put(3, 12, 0);
  L.pit(26, 28); L.arc(24, 13, 6);
  L.ground(29, 48, 13); L.foe('walker', 36, 13); L.plat(40, 10, 4); L.coins(40, 9, 4); L.put(42, 8, 'ing');
  L.pit(49, 52); L.plat(50, 11, 2);
  L.ground(53, 80, 13); L.put(55, 12, 'cp'); L.ground(60, 75, 12); L.spikes(66, 2, 12); L.coins(65, 8, 4); L.foe('hopper', 71, 12); L.put(78, 12, 'rice'); L.coins(60, 10, 3);
  L.pit(81, 84);
  L.ground(85, 120, 13); L.foe('walker', 90, 13); L.foe('walker', 96, 13); L.plat(100, 10, 4); L.put(101, 9, 'ing'); L.coins(102, 9, 2); L.tower(108, 2, 2, 13); L.coins(107, 9, 4); L.foe('hopper', 114, 13); L.put(118, 12, 'cp');
  L.pit(121, 124); L.plat(122, 11, 2);
  L.ground(125, 160, 13); L.put(127, 12, 'chili'); L.spikes(131, 3, 13); L.coins(130, 9, 5); L.foe('crow', 138, 7); L.foe('crow', 146, 6);
  L.plat(143, 10, 2); L.plat(146, 7, 3); L.put(147, 6, 'ing'); L.coins(150, 11, 3); L.put(155, 12, 'cp');
  L.pit(161, 164); L.arc(159, 13, 6);
  L.ground(165, 219, 13); L.foe('walker', 170, 13); L.foe('hopper', 176, 13); L.tower(182, 1, 3, 13); L.tower(190, 1, 3, 13); L.put(186, 11, 'ing'); L.coins(184, 10, 5);
  L.put(196, 12, 'scroll'); L.foe('walker', 200, 13); L.foe('crow', 204, 6); L.put(209, 4, 'ing'); L.coins(207, 6, 5); L.put(212, 12, 'rice'); L.put(216, 12, 'cp');
  arena(L);
  deco(L, 'b1', 'b2', 7);
});
const lv2 = level((L) => {
  L.ground(0, 22, 13); L.coins(8, 11, 5);
  L.pit(23, 26); L.plat(24, 11, 2); L.coins(24, 9, 2);
  L.ground(27, 44, 12); L.foe('walker', 32, 12); L.foe('crow', 40, 6); L.put(30, 11, 'rice'); L.put(43, 11, 'cp');
  L.pit(45, 48); L.pit(53, 55); L.ground(49, 52, 12); L.arc(45, 12, 4);
  L.ground(56, 80, 13); L.foe('hopper', 62, 13); L.foe('walker', 70, 13); L.plat(64, 10, 4); L.put(65, 9, 'ing'); L.coins(66, 9, 2); L.spikes(74, 3, 13); L.coins(73, 9, 5); L.put(79, 12, 'cp');
  L.pit(81, 85); L.plat(82, 11, 2); L.plat(84, 9, 1);
  L.ground(86, 118, 13); L.foe('pot', 92, 13); L.foe('walker', 100, 13); L.foe('crow', 104, 7); L.tower(96, 2, 2, 13); L.put(97, 8, 'ing'); L.put(112, 12, 'chili'); L.foe('pot', 114, 13); L.coins(106, 10, 5);
  L.pit(119, 123); L.plat(120, 11, 3);
  L.ground(124, 160, 12); L.put(125, 11, 'cp'); L.foe('hopper', 130, 12); L.foe('hopper', 136, 12); L.plat(132, 9, 3); L.put(133, 8, 'ing'); L.spikes(141, 2, 12); L.foe('crow', 146, 5); L.foe('pot', 150, 12); L.coins(145, 8, 4); L.put(158, 11, 'rice');
  L.pit(161, 165); L.plat(162, 10, 2); L.plat(164, 8, 1); L.put(164, 7, 'coin');
  L.ground(166, 219, 13); L.foe('walker', 170, 13); L.foe('pot', 176, 13); L.foe('hopper', 182, 13); L.tower(188, 2, 3, 13); L.put(189, 9, 'ing'); L.foe('crow', 194, 6);
  L.put(198, 12, 'scroll'); L.plat(202, 9, 2); L.plat(206, 6, 2); L.put(207, 5, 'ing'); L.foe('walker', 208, 13); L.foe('pot', 212, 13); L.put(216, 12, 'cp');
  arena(L);
  deco(L, 'lan', 'lan', 3);
});
const lv3 = level((L) => {
  L.ground(0, 20, 13); L.coins(8, 11, 5); L.foe('walker', 16, 13);
  L.pit(21, 25, true); L.plat(22, 11, 2); L.coins(22, 9, 2);
  L.ground(26, 44, 13); L.foe('hopper', 32, 13); L.foe('pot', 38, 13); L.put(30, 12, 'rice'); L.put(43, 12, 'cp');
  L.pit(45, 50, true); L.plat(46, 11, 1); L.plat(48, 10, 1); L.arc(45, 13, 6);
  L.ground(51, 76, 12); L.foe('crow', 56, 5); L.foe('walker', 60, 12); L.spikes(64, 3, 12); L.plat(63, 8, 5); L.put(65, 7, 'ing'); L.coins(66, 7, 2); L.foe('hopper', 70, 12); L.put(74, 11, 'cp');
  L.pit(77, 82, true); L.plat(78, 10, 1); L.plat(80, 9, 1);
  L.ground(83, 120, 13); L.foe('pot', 88, 13); L.foe('pot', 96, 13); L.tower(92, 1, 2, 13); L.foe('crow', 100, 6); L.foe('hopper', 106, 13); L.put(110, 12, 'chili'); L.coins(104, 9, 5); L.put(118, 12, 'cp');
  L.pit(121, 127, true); L.plat(122, 11, 1); L.plat(124, 9, 1); L.plat(126, 11, 1); L.put(124, 8, 'ing');
  L.ground(128, 165, 12); L.foe('hopper', 134, 12); L.foe('crow', 138, 5); L.foe('walker', 142, 12); L.spikes(146, 4, 12); L.coins(145, 7, 6); L.foe('pot', 152, 12); L.put(158, 11, 'rice'); L.put(160, 11, 'cp'); L.plat(148, 8, 3); L.put(149, 7, 'ing');
  L.pit(166, 172, true); L.plat(167, 10, 1); L.plat(169, 8, 1); L.plat(171, 10, 1); L.put(169, 7, 'ing');
  L.ground(173, 219, 13); L.foe('hopper', 178, 13); L.foe('hopper', 182, 13); L.foe('pot', 188, 13); L.foe('crow', 192, 6); L.tower(196, 2, 2, 13); L.foe('pot', 200, 13);
  L.put(190, 12, 'scroll'); L.plat(205, 9, 3); L.plat(209, 6, 2); L.put(210, 5, 'ing'); L.foe('walker', 206, 13); L.foe('hopper', 212, 13); L.put(216, 12, 'cp');
  arena(L);
  deco(L, 'lan', 'lan', 11);
});
const names = ['lv1', 'lv2', 'lv3'];
[lv1, lv2, lv3].forEach((L, i) => {
  const buf = Buffer.alloc(W * H);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) buf[x * H + y] = L.g[x][y];
  fs.writeFileSync(new URL(`../assets/${names[i]}.bin`, import.meta.url), buf);
  const ing = buf.filter((b) => b === 8).length;
  const sym = '.GDBw^~o*cSRK|Y!'; // preview
  let txt = `${names[i]}: ${W} columns, ${ing} ingredients, enemies ${[20, 21, 22, 23].map((c) => buf.filter((b) => b === c).length)}\n`;
  if (process.argv[2] === 'show') for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) { const c = L.g[x][y]; r += c < 16 ? sym[c] : 'EHCF'[c - 20]; } txt += r + '\n'; }
  console.log(txt);
});
