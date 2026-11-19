// The campaign analyser: which level first needs each mechanic, a level that does not need what it teaches, a too-easy opening, difficulty dips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCampaign, formatCampaign } from '../src/tools/campaign.js';

// a toy puzzle: level i needs `turns[i]` turns; levels listed in swapOnly cannot be solved without "swap"
const turns = [1, 1, 1, 2, 3, 3, 4, 5, 6, 7];
const needs = { 1: ['swap'], 5: ['swap', 'turn'], 8: ['turn'] };
const solve = (level, allowed) => ({ solvable: (needs[level] || []).every((m) => allowed.includes(m)), optimal: turns[level], wrongRoutes: level });

test('campaign: the first level that needs each mechanic, and levels that do not need what they teach', () => {
  const r = analyzeCampaign({ levels: 10, mechanics: ['turn', 'swap', 'express'], solve, intended: { 1: ['swap'], 2: ['swap'], 5: ['turn', 'swap'] } });
  assert.equal(r.firstNeeding.swap, 1); assert.equal(r.firstNeeding.turn, 5); assert.equal(r.firstNeeding.express, null);
  assert.ok(r.problems.some((p) => p.kind === 'mechanic-not-required' && /level 3 is meant to teach swap/.test(p.message)), 'level 3 claims to teach swap but does not need it');
  assert.ok(!r.problems.some((p) => p.kind === 'mechanic-not-required' && p.level === 1), 'level 2 really needs swap');
  assert.ok(r.problems.some((p) => p.kind === 'mechanic-never-required' && /express/.test(p.message)));
  assert.ok(r.problems.some((p) => p.kind === 'easy-opening'), 'three of the first five levels take one move');
});

test('campaign: unsolvable levels and a difficulty that stops rising are reported; the text report is readable', () => {
  const hard = Array.from({ length: 30 }, (_, i) => (i % 3 === 2 ? 1 : 10 + i));
  const r = analyzeCampaign({ levels: 30, mechanics: ['a'], solve: (l) => ({ solvable: l !== 7, optimal: hard[l] }) });
  assert.ok(r.problems.some((p) => p.kind === 'unsolvable' && p.level === 7));
  assert.ok(r.problems.some((p) => p.kind === 'difficulty-dips'));
  const text = formatCampaign(r);
  assert.match(text, /level\s+optimal\s+wrong-routes\s+needs/);
  assert.match(text, /UNSOLVABLE/);
  assert.match(text, /problems:/);
});
