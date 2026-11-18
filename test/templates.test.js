import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSpecFile } from '../src/tools/testrunner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const dir of ['templates', 'examples', 'games']) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const name of fs.readdirSync(base)) {
    const spec = path.join(base, name, 'vly.json');
    if (!fs.existsSync(spec)) continue;
    test(`${dir}/${name}: all tests in vly.json pass`, async () => {
      const r = await runSpecFile(spec);
      assert.ok(r.results.length > 0, 'has at least one test');
      for (const t of r.results) assert.deepEqual(t.failures, [], `${t.name}: ${t.failures.join('; ')}`);
    });
  }
}
