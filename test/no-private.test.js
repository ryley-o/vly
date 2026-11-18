// The public repository must never contain anything from the private product: keys, database URLs, the hosted service, strategy documents.
// This runs in the public repository's CI (npm test). In the private repository, where those files legitimately exist, it skips.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isPrivateTree = fs.existsSync(path.join(root, 'api')) || fs.existsSync(path.join(root, 'site')) || fs.existsSync(path.join(root, 'ROADMAP.md'));
const forbiddenPaths = ['api', 'site', 'contracts', 'ROADMAP.md', 'vercel.json', '.vercel', '.env', 'docs/build.md', 'docs/chat-guide.md', 'docs/hardware-plan.md', 'docs/hardware-order.md', 'docs/landscape.md'];
const secretPatterns = [
  [/VERCEL_TOKEN/, 'a Vercel token variable'], [/DATABASE_URL/, 'a database URL variable'], [/postgres(ql)?:\/\/[^\s'"]+/i, 'a database connection string'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'], [/AKIA[0-9A-Z]{16}/, 'an AWS access key'], [/\bsk-[A-Za-z0-9_-]{24,}/, 'an API secret key'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'a GitHub token'], [/neon\.tech/, 'a Neon database host'],
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'build'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

test('the public repository has no private files and no secrets', { skip: isPrivateTree ? 'private tree' : false }, () => {
  for (const p of forbiddenPaths) assert.ok(!fs.existsSync(path.join(root, p)), `${p} must stay in the private repository`);
  for (const f of walk(root)) {
    if (/\.(png|gif|wasm|vlc|sav|bin|uf2|stl|tgz)$/i.test(f) || f.endsWith('no-private.test.js')) continue;
    const text = fs.readFileSync(f, 'utf8');
    for (const [re, what] of secretPatterns) assert.ok(!re.test(text), `${path.relative(root, f)} looks like it contains ${what}`);
  }
});
