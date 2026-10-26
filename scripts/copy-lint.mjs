#!/usr/bin/env node
/**
 * Copy lint: enforce DESIGN §8 voice rules on user-facing strings.
 *
 * Scans string literals and JSX text in src/ (excluding content/tests) for
 * banned patterns such as "gagal", "Anda", "Salah!", streak shaming and
 * pass guarantees. Code comments, console messages and Error() messages are
 * skipped because they are not learner-facing.
 *
 * Usage: npm run lint:copy [-- --json]
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ROOT } from './lib/app-harness.mjs';

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const write = args.includes('--write') || jsonOnly;

const RULES = [
  { id: 'gagal', pattern: /\bgagal\b/i, message: 'Gunakan “belum aman/berisiko”, bukan “gagal”.' },
  { id: 'anda', pattern: /\bAnda\b/, message: 'Gunakan “kamu”, bukan “Anda”.' },
  { id: 'salah-seru', pattern: /Salah\s*!/i, message: 'Gunakan “Belum tepat”, bukan “Salah!”.' },
  { id: 'streak', pattern: /\bstreak\b/i, message: 'Jangan menjual streak; tunjukkan bukti kesiapan.' },
  { id: 'shaming', pattern: /mengecewakan/i, message: 'Jangan menyalahkan pengguna.' },
  {
    id: 'guarantee',
    pattern: /\b(pasti lulus|dijamin lulus|jaminan lulus)\b/i,
    message: 'Tidak boleh menjanjikan kelulusan.',
  },
  { id: 'klik-disini', pattern: /klik di sini/i, message: 'Tulis label aksi yang spesifik.' },
  { id: 'exclaim', pattern: /!{2,}/, message: 'Hindari nada bersemangat berlebihan.' },
];

const SKIP_DIRS = new Set(['content', 'styles']);
const SKIP_FILES = new Set(['testkit.ts', 'globals.d.ts']);

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(abs, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx') && !SKIP_FILES.has(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function isDeveloperMessage(node) {
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      const expression = current.expression.getText();
      if (expression.startsWith('console.')) return true;
      if (expression === 'notify') return false; // toast copy IS user-facing
    }
    if (ts.isNewExpression(current) && current.expression.getText() === 'Error') return true;
    current = current.parent;
  }
  return false;
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function collectFindings() {
  const findings = [];
  const files = collectFiles(path.join(ROOT, 'src'));

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const relative = path.relative(ROOT, file).replace(/\\/g, '/');

    const report = (text, position) => {
      const normalized = normalize(text);
      if (!/\p{L}/u.test(normalized)) return;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
      const lineText = source.split('\n')[line] ?? '';
      if (lineText.includes('copy-lint:ignore')) return;
      for (const rule of RULES) {
        if (rule.pattern.test(normalized)) {
          findings.push({
            file: relative,
            line: line + 1,
            column: character + 1,
            rule: rule.id,
            message: rule.message,
            text: normalized.slice(0, 120),
          });
        }
      }
    };

    const walk = (node) => {
      if (ts.isJsxText(node)) {
        report(node.getText(sourceFile), node.getStart(sourceFile));
      } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (!isDeveloperMessage(node)) {
          report(node.text, node.getStart(sourceFile) + 1);
        }
      } else if (ts.isTemplateExpression(node)) {
        if (!isDeveloperMessage(node)) {
          report(node.head.text, node.getStart(sourceFile) + 1);
          for (const span of node.templateSpans) report(span.literal.text, span.literal.getStart(sourceFile) + 1);
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(sourceFile);
  }

  return findings;
}

const findings = collectFindings();
const metrics = {
  at: new Date().toISOString(),
  findings: findings.length,
  rules: RULES.map((rule) => rule.id),
  items: findings,
};

if (write) {
  fs.mkdirSync(path.join(ROOT, '.metrics'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.metrics', 'copy.json'), JSON.stringify(metrics, null, 2));
}

if (jsonOnly) {
  console.log(JSON.stringify(metrics, null, 2));
} else if (findings.length === 0) {
  console.log(`\n✓ copy lint: 0 temuan pada ${collectFiles(path.join(ROOT, 'src')).length} file\n`);
} else {
  console.log(`\n✗ copy lint: ${findings.length} temuan\n`);
  for (const finding of findings) {
    console.log(`  ${finding.file}:${finding.line}:${finding.column}  [${finding.rule}]`);
    console.log(`    “${finding.text}”`);
    console.log(`    ${finding.message}`);
  }
  console.log('');
}

process.exit(findings.length === 0 ? 0 : 1);
