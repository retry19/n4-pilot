#!/usr/bin/env node
/**
 * `npm run report` — verified metrics in one place.
 *
 * Reads: content audit, all tests, `.metrics/build.json` (written by build),
 * `.metrics/smoke.json` (written by smoke). Writes `.metrics/latest.json`,
 * which `npm run docs:check` / `docs:sync` consume.
 */
import fs from 'node:fs';
import path from 'node:path';
import { auditContent, ROOT } from './lib/content-audit.mjs';
import { runAllTests } from './lib/test-runner.mjs';
import { renderMetricsBlock } from './lib/metrics-block.mjs';

const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint('32', text);
const yellow = (text) => paint('33', text);
const red = (text) => paint('31', text);
const dim = (text) => paint('2', text);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch {
    return null;
  }
}

const audit = await auditContent();
const tests = await runAllTests();
const build = readJson('.metrics/build.json');
const smoke = readJson('.metrics/smoke.json');
const routes = readJson('.metrics/routes.json');
const a11y = readJson('.metrics/a11y.json');
const copy = readJson('.metrics/copy.json');

const metrics = {
  at: new Date().toISOString(),
  content: {
    counts: audit.counts,
    coverage: audit.coverage,
    integrity: audit.integrity,
    cards: audit.cards,
    curriculum: audit.curriculum,
    mock: audit.mock,
  },
  tests: {
    passed: tests.passed,
    failed: tests.failed,
    skipped: tests.skipped,
    total: tests.total,
    files: tests.files.length,
    durationMs: tests.durationMs,
  },
  build,
  smoke,
  routes,
  a11y,
  copy,
};

const dir = path.join(ROOT, '.metrics');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(metrics, null, 2));

const pad = (label) => label.padEnd(12);
const status = (ok, text) => (ok ? green(text) : red(text));

console.log('\nN4 Pilot — verified metrics\n');
console.log(`${pad('Test')}${status(tests.failed === 0, `${tests.passed}/${tests.total} lulus`)}${dim(
  ` · ${tests.files.length} file · ${(tests.durationMs / 1000).toFixed(2)} dtk${tests.skipped ? ` · ${tests.skipped} skip` : ''}`,
)}`);
console.log(
  `${pad('Konten')}${audit.counts.kana} kana · ${audit.counts.vocab} kata · ${audit.counts.kanji} kanji · ${audit.counts.grammar} grammar · ${audit.counts.reading} bacaan · ${audit.counts.listening} listening`,
);
console.log(`${pad('Kurikulum')}${audit.curriculum.total} unit · ${audit.cards.total} kartu`);
console.log(
  `${pad('Mock')}${audit.mock.forms.length} form × ${audit.mock.forms.map((form) => form.total).join(' / ')} soal`,
);
console.log(`${pad('Integritas')}${status(audit.integrity.ok, audit.integrity.ok ? 'lolos' : `gagal (${audit.integrity.issues.length} jenis)`)}`);
console.log(
  `${pad('Build')}${build ? `${(build.js.gzip / 1024).toFixed(1).replace('.', ',')} KB JS · ${(build.css.gzip / 1024).toFixed(1).replace('.', ',')} KB CSS · ${build.budget.ok ? green('PASS') : red('OVER')}` : yellow('belum ada — jalankan npm run build')}`,
);
console.log(
  `${pad('Smoke')}${smoke ? `${smoke.steps} langkah · ${smoke.passed ? green('lulus') : red('gagal')} ${dim(smoke.at)}` : yellow('belum ada — jalankan npm run smoke')}`,
);
console.log(
  `${pad('Routes')}${routes ? `${routes.passed}/${routes.total} route ${routes.failed === 0 ? green('lulus') : red('gagal')}` : yellow('belum ada — jalankan npm run smoke:routes')}`,
);
console.log(
  `${pad('A11y')}${a11y ? `${a11y.critical} critical · ${a11y.warnings} warning · ${a11y.contrastFailures} kontras gagal ${a11y.critical === 0 && a11y.contrastFailures === 0 ? green('lulus') : red('gagal')}` : yellow('belum ada — jalankan npm run audit:a11y')}`,
);
console.log(
  `${pad('Copy')}${copy ? `${copy.findings} temuan ${copy.findings === 0 ? green('lulus') : red('gagal')}` : yellow('belum ada — jalankan npm run lint:copy')}`,
);

if (tests.failed > 0) {
  console.log('\nTest gagal:');
  for (const failure of tests.results.filter((result) => result.status === 'failed').slice(0, 8)) {
    console.log(`  ✗ ${failure.suite ? `${failure.suite} › ` : ''}${failure.name}`);
  }
}

const missing = [
  ['build', build],
  ['smoke', smoke],
  ['routes', routes],
  ['a11y', a11y],
  ['copy', copy],
].filter(([, value]) => !value);
if (missing.length > 0) {
  console.log(yellow(`\nCatatan: metrik ${missing.map(([name]) => name).join(', ')} belum ada.`));
  console.log(yellow('docs:sync akan menolak sampai semua metrik lengkap; jalankan npm run verify.'));
}

const qualityFailures = [];
if (routes && routes.failed > 0) qualityFailures.push(`${routes.failed} route gagal`);
if (a11y && a11y.critical > 0) qualityFailures.push(`${a11y.critical} a11y critical`);
if (a11y && a11y.contrastFailures > 0) qualityFailures.push(`${a11y.contrastFailures} kontras gagal`);
if (copy && copy.findings > 0) qualityFailures.push(`${copy.findings} temuan copy`);
if (qualityFailures.length > 0) {
  console.log(red(`\nGerbang kualitas gagal: ${qualityFailures.join(' · ')}`));
}

console.log(`\nDitulis ke .metrics/latest.json`);
console.log(dim('Docs block:'));
console.log(renderMetricsBlock(metrics).split('\n').map((line) => `  ${line}`).join('\n'));
console.log(dim('\nSelanjutnya: npm run docs:check (atau npm run docs:sync jika memang berubah).\n'));

process.exit(tests.failed === 0 && audit.integrity.ok && qualityFailures.length === 0 ? 0 : 1);
