// The documents an agent reads first (AGENTS.md, llms.txt, the two skills) are written by hand, and they drifted apart before.
// This test makes them agree: the same key facts, only real commands and files, no stale words, and a first project that works.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { commands } from '../cli/commands.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ENTRY = ['AGENTS.md', 'llms.txt', '.claude/skills/vly/SKILL.md', '.claude/skills/vly-design/SKILL.md'];
const GUIDES = [...ENTRY, 'docs/workflow.md', 'docs/cli.md', 'docs/design.md', 'docs/language.md', 'docs/modules.md'];
const templates = fs.readdirSync(path.join(root, 'templates'));

// what every entry document must say (each a fact an agent acts on), and which documents must say it
const FACTS = [
  ['read the design playbook', /vly docs design|docs\/design\.md/, ENTRY],
  ['the game must be original (no re-skin)', /re-skin/i, ENTRY],
  ['write DESIGN.md first', /DESIGN\.md/, ['AGENTS.md', 'llms.txt', '.claude/skills/vly-design/SKILL.md']],
  ['copy the flow template for the front end', /--template flow|template flow/, ['AGENTS.md', 'llms.txt', '.claude/skills/vly-design/SKILL.md']],
  ['vly release does the whole job', /vly release/, ['AGENTS.md', 'llms.txt', '.claude/skills/vly-design/SKILL.md']],
  ['one menu pattern: UP/DOWN, A or START, B back', /UP\/DOWN[^.]*A or START[^.]*B/, ['AGENTS.md', 'llms.txt', '.claude/skills/vly-design/SKILL.md']],
  ['vly check is the quality gate', /vly check/, ENTRY],
];

test('every entry document says the key facts', () => {
  const missing = [];
  for (const [what, re, docs] of FACTS) for (const d of docs) if (!re.test(read(d))) missing.push(`${d}: ${what}`);
  assert.deepEqual(missing, []);
});

test('every `vly <command>` the guides mention is a real command, and every --template is a real template', () => {
  const bad = [];
  for (const d of GUIDES) {
    const text = read(d);
    for (const m of text.matchAll(/`vly ([a-z][a-z-]*)(?=[\s`])/g)) if (!(m[1] in commands) && !['help'].includes(m[1])) bad.push(`${d}: vly ${m[1]}`);
    for (const m of text.matchAll(/^\s*\$?\s*vly ([a-z][a-z-]*)(?=\s|$)/gm)) if (!(m[1] in commands) && !['help'].includes(m[1])) bad.push(`${d}: vly ${m[1]} (code block)`);
    for (const m of text.matchAll(/--template[ =]([a-z]+)/g)) if (!templates.includes(m[1])) bad.push(`${d}: --template ${m[1]}`);
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('files and docs the entry documents point at exist', () => {
  const bad = [];
  for (const d of ENTRY) {
    for (const m of read(d).matchAll(/\]\(([^)#]+)\)/g)) if (!/^(https?:|\/)/.test(m[1]) && !fs.existsSync(path.join(root, m[1]))) bad.push(`${d}: ${m[1]}`);
    for (const m of read(d).matchAll(/`((?:docs|templates|games)\/[A-Za-z0-9_./-]+?)`/g)) if (!/[*<]/.test(m[1]) && !fs.existsSync(path.join(root, m[1]))) bad.push(`${d}: ${m[1]}`);
    for (const m of read(d).matchAll(/vly docs ([a-z-]+)/g)) if (!fs.existsSync(path.join(root, 'docs', `${m[1]}.md`)) && !['spec', 'overview', 'agents'].includes(m[1])) bad.push(`${d}: vly docs ${m[1]}`);
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('no stale words: removed endpoints, pages and old versions', () => {
  const stale = [/\/api\/(try|build|check|mcp)\b/, /openapi/i, /paste\.html|make\.html/, /chat-guide/, /\b0\.5\.0\b/, /GPT setup|custom GPT/i];
  const bad = [];
  for (const d of GUIDES) for (const re of stale) if (re.test(read(d))) bad.push(`${d}: ${re}`);
  assert.deepEqual(bad, []);
});

test('the controls guidance is a default, not a ban (SELECT and undo are allowed when the game is better with them)', () => {
  for (const d of ENTRY) assert.doesNotMatch(read(d), /do not require select|no select, no undo\b(?! unless)/i, d);
  assert.match(read('docs/design.md'), /rarely needs SELECT while playing/);
});

test('the first project works: vly new makes a blank game that builds and passes its own test', () => {
  assert.ok(templates.includes('blank'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vly-first-'));
  const vly = path.join(root, 'cli', 'vly.js');
  const run = (...a) => spawnSync(process.execPath, [vly, ...a], { cwd: dir, encoding: 'utf8' });
  const made = run('new', 'mygame');
  assert.equal(made.status, 0, made.stderr);
  assert.match(made.stdout, /template "blank"/);
  assert.match(made.stdout, /DESIGN\.md/, 'it points at the plan first');
  assert.match(made.stdout, /vly docs design/, 'and at the playbook');
  const game = path.join(dir, 'mygame');
  const cwd = { cwd: game, encoding: 'utf8' };
  assert.equal(spawnSync(process.execPath, [vly, 'build'], cwd).status, 0);
  const t = spawnSync(process.execPath, [vly, 'test'], cwd);
  assert.equal(t.status, 0, t.stdout + t.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
});
