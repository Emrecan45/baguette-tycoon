import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)));
  return files.flat();
}
export async function sourceManifest() {
  const files = [...new Set([...await walk('src'), ...await walk('public'), ...await walk('tools/marketing'), 'index.html', 'package-lock.json', 'vite.config.js', 'tools/marketing/record.mjs', 'tools/marketing/recording-plugin.mjs', 'tools/marketing/video-utils.mjs', 'tools/marketing/source-manifest.mjs'])].sort();
  const entries = await Promise.all(files.map(async file => {
    const bytes = await readFile(file);
    return { file: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
  return { fingerprint: createHash('sha256').update(JSON.stringify(entries)).digest('hex'), files: entries };
}
