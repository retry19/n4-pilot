#!/usr/bin/env node
/**
 * Content report — coverage against beta targets + structural integrity.
 *
 * Usage:
 *   npm run content:report
 *   npm run content:report -- --json
 *   npm run content:report -- --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { auditContent, ROOT } from './lib/content-audit.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const write = args.includes('--write');
const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint('32', text);
const yellow = (text) => paint('33', text);
const red = (text) => paint('31', text);
const dim = (text) => paint('2', text);

const audit = await auditContent();

if (asJson) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log(`\nN4 Pilot — content report ${dim('(seed → beta, PRD §9.1)')}\n`);
  const header = ['DOMAIN', 'HAVE', 'TARGET', 'COVER', 'STATUS'];
  const rows = audit.coverage.map((entry) => [
    entry.label,
    String(entry.count),
    String(entry.target),
    `${Math.round(entry.ratio * 100)}%`,
    entry.status === 'ok' ? green('ok') : yellow('seed'),
  ]);
  const widths = header.map((cell, index) =>
    Math.max(cell.length, ...rows.map((row) => String(row[index]).replace(/\x1b\[[0-9;]*m/g, '').length)),
  );
  const line = (cells) =>
    cells
      .map((cell, index) => String(cell) + ' '.repeat(Math.max(0, widths[index] - String(cell).replace(/\x1b\[[0-9;]*m/g, '').length)))
      .join('  ');
  console.log(line(header));
  console.log(line(widths.map((width) => '─'.repeat(width))));
  for (const row of rows) console.log(line(row));

  console.log(`\nKartu        ${audit.cards.total} total ${dim(
    Object.entries(audit.cards.byDomain)
      .map(([domain, count]) => `${domain} ${count}`)
      .join(' · '),
  )}`);
  console.log(`Kurikulum    ${audit.curriculum.total} unit ${dim(
    Object.entries(audit.curriculum.byPhase)
      .map(([phase, count]) => `${phase} ${count}`)
      .join(' · '),
  )}`);
  console.log(`Mock         ${audit.mock.forms.length} form`);
  for (const form of audit.mock.forms) {
    console.log(
      `  ${form.label.padEnd(8)} ${form.sections.vocabulary} / ${form.sections.grammar_reading} / ${form.sections.listening} = ${form.total} soal ${dim(
        `(referensi resmi ±${audit.mock.itemReference})`,
      )}`,
    );
  }
  console.log(
    `Overlap A↔B  ${Object.entries(audit.mock.overlap)
      .map(([section, count]) => `${section} ${count}`)
      .join(' · ')}`,
  );
  console.log(`Listening    ${audit.listeningTypes.join(', ')}`);

  if (audit.integrity.ok) {
    console.log(`\n${green('Integritas OK')} — tidak ada pelanggaran struktur.\n`);
  } else {
    console.log(`\n${red('Integritas GAGAL')} — ${audit.integrity.issues.length} jenis masalah:\n`);
    for (const issue of audit.integrity.issues) {
      console.log(`  ${red(issue.code)} ×${issue.count}`);
      for (const example of issue.examples) console.log(`    ${example}`);
    }
    console.log('');
  }
}

if (write) {
  const dir = path.join(ROOT, '.metrics');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify(audit, null, 2));
  if (!asJson) console.log(dim(`Ditulis ke .metrics/content.json`));
}

process.exit(audit.integrity.ok ? 0 : 1);
