#!/usr/bin/env node
/**
 * Keep the verified-metrics block in README.md / PROGRESS.md honest.
 *
 *   npm run docs:check   exit 1 if the block differs from .metrics/latest.json
 *   npm run docs:sync    rewrite the block from the latest metrics
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/content-audit.mjs';
import { DOC_FILES, renderMetricsBlock } from './lib/metrics-block.mjs';

const mode = process.argv.includes('--sync') ? 'sync' : 'check';
const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);
const dim = (text) => paint('2', text);

const latestPath = path.join(ROOT, '.metrics', 'latest.json');
if (!fs.existsSync(latestPath)) {
  console.error(red('Metrik belum ada.'), 'Jalankan `npm run report` lebih dulu (butuh build + smoke).');
  process.exit(1);
}

const metrics = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
if (mode === 'sync') {
  const required = ['build', 'smoke', 'routes', 'a11y', 'copy'];
  const missing = required.filter((key) => !metrics[key]);
  if (missing.length > 0) {
    console.error(red(`Tidak bisa sync: metrik ${missing.join(', ')} belum lengkap.`));
    console.error('Jalankan: npm run verify (atau build + smoke + smoke:routes + audit:a11y + lint:copy + report).');
    process.exit(1);
  }
}

const block = renderMetricsBlock(metrics);
const pattern = /<!-- metrics:start -->[\s\S]*?<!-- metrics:end -->/;
const normalize = (text) => text.replace(/\r\n/g, '\n');
let failed = false;

for (const file of DOC_FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(red(`Tidak ada file ${file}`));
    failed = true;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  if (!pattern.test(content)) {
    console.error(red(`${file}: marker <!-- metrics:start -->…<!-- metrics:end --> tidak ditemukan`));
    failed = true;
    continue;
  }

  if (mode === 'sync') {
    const next = content.replace(pattern, block);
    if (normalize(next) === normalize(content)) {
      console.log(`${dim(file)} ${green('sudah sinkron')}`);
    } else {
      fs.writeFileSync(full, next);
      console.log(`${dim(file)} ${green('diperbarui')}`);
    }
    continue;
  }

  const current = content.match(pattern)[0];
  if (normalize(current) === normalize(block)) {
    console.log(`${dim(file)} ${green('metrik cocok')}`);
  } else {
    console.log(`${red(file)} metrik tidak cocok.`);
    console.log(dim('  docs:'));
    console.log(current.split('\n').map((line) => `    ${line}`).join('\n'));
    console.log(dim('  metrics:'));
    console.log(block.split('\n').map((line) => `    ${line}`).join('\n'));
    failed = true;
  }
}

if (mode === 'check' && failed) {
  console.error(red('\nDocs kedaluwarsa.'), 'Jalankan `npm run docs:sync` setelah memverifikasi angka.');
  process.exit(1);
}
if (failed) process.exit(1);
console.log(green(mode === 'sync' ? '\nDocs metrics tersinkron.\n' : '\nDocs metrics sinkron.\n'));
