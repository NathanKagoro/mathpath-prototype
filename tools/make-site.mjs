// Copies the files visitors need into _site/ for GitHub Pages.
// No transformation: the site is served exactly as committed.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const item of ['index.html', '404.html', 'student', 'teacher', 'assets']) cpSync(join(root, item), join(out, item), { recursive: true });
console.log('site copied to _site/');
