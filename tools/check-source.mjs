import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'acorn';
import assert from 'node:assert/strict';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : `${directory}/${entry.name}`))).flat();
}

const files = [...await walk('src'), ...await walk('tools'), 'index.html', 'vite.config.js', 'eslint.config.js'];
for (const file of files) {
  if (!/\.(js|mjs|css|html|py)$/.test(file)) continue;
  const source = await readFile(file, 'utf8');
  assert.ok(!/[\u2013\u2014]/u.test(source), `Long dash in ${file}`);
  if (/\.(js|mjs)$/.test(file)) {
    const comments = [];
    parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
    assert.equal(comments.length, 0, `Comment in ${file}`);
  }
}
console.log('Owned sources: JavaScript parses, no comments or long dashes.');
