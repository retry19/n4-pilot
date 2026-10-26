#!/usr/bin/env node
// Test runner: discovers *.test.ts, runs them in one process, reports.
// Watch mode re-executes a fresh child (module cache must be cleared), which is
// allowed because stdio is inherited rather than piped.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const watch = process.argv.includes('--watch');
const filter = process.argv.find((a) => a.startsWith('--filter='))?.slice('--filter='.length);

function findTests(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...findTests(abs));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

async function main() {
  const files = findTests(path.join(ROOT, 'src'))
    .filter((f) => !filter || f.includes(filter))
    .sort();
  if (files.length === 0) {
    console.log('No *.test.ts files found.');
    return 0;
  }
  console.log(`\n\x1b[2mrunning ${files.length} test file(s) in one process\x1b[0m`);
  for (const file of files) {
    console.log(`\n\x1b[36m▸ ${path.relative(ROOT, file)}\x1b[0m`);
    await import(pathToFileURL(file).href);
  }
  const { run } = await import(pathToFileURL(path.join(ROOT, 'src/testkit.ts')).href);
  return run();
}

if (watch) {
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const child = spawn(process.execPath, [process.argv[1], ...process.argv.slice(2).filter((a) => a !== '--watch')], {
        stdio: 'inherit',
        cwd: ROOT,
      });
      child.on('exit', () => console.log('\n\x1b[2m[watching src/ …]\x1b[0m'));
    }, 120);
  };
  fs.watch(path.join(ROOT, 'src'), { recursive: true }, trigger);
  console.log('\x1b[2m[watch] press Ctrl+C to stop\x1b[0m');
  const code = await main();
  console.log(`\x1b[2m[watch] initial run exited with ${code}\x1b[0m`);
} else {
  const code = await main();
  process.exit(code);
}
