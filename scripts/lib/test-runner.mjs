/**
 * Test discovery + execution shared by `scripts/test.mjs` and `scripts/report.mjs`.
 * Runs in one process; no child processes (sandbox constraint).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function findTestFiles(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(abs);
      } else if (/\.test\.tsx?$/.test(entry.name)) {
        out.push(abs);
      }
    }
  };
  walk(path.join(root, 'src'));
  return out.sort();
}

/** Import every test file, then execute the registered cases. */
export async function runAllTests(root = ROOT) {
  const files = findTestFiles(root);
  for (const file of files) {
    await import(pathToFileURL(file).href);
  }
  const testkit = await import(pathToFileURL(path.join(root, 'src/testkit.ts')).href);
  const run = await testkit.executeTests();
  return { ...run, files: files.map((file) => path.relative(root, file)) };
}
