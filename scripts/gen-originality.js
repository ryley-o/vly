// Rebuilds src/tools/originality-index.json from the templates and the sample games (run by npm run gen).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, INDEX_FILE } from '../src/tools/originality.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refs = {};
for (const group of ['templates', 'games']) {
  for (const e of fs.readdirSync(path.join(root, group), { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(root, group, e.name, 'src'))) refs[`${group === 'templates' ? 'template ' : ''}${e.name}`] = path.join(root, group, e.name);
}
fs.writeFileSync(INDEX_FILE, JSON.stringify(buildIndex(refs)) + '\n');
console.log(`wrote ${path.relative(root, INDEX_FILE)} (${Object.keys(refs).length} reference games)`);
