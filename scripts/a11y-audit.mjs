#!/usr/bin/env node
/**
 * Accessibility audit: runtime checks on every route (jsdom) + static contrast
 * audit from tokens.css. Warnings are reported but do not fail the gate;
 * critical issues and contrast failures do.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bootApp, collectDomIssues, ROOT } from './lib/app-harness.mjs';
import { auditTokenContrast } from './lib/contrast.mjs';
import { buildScenario } from './lib/scenarios.mjs';
import { APP_ROUTES, DEFAULT_SCENARIO } from './lib/routes.mjs';

const args = process.argv.slice(2);
const get = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const scenario = get('--scenario') ?? DEFAULT_SCENARIO;
const today = get('--today') ?? null;

const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);
const yellow = (text) => paint('33', text);
const dim = (text) => paint('2', text);

const fixture = await buildScenario(scenario, { today });
const app = await bootApp({ state: fixture.state });
const routeIssues = [];
let criticalCount = 0;
let warningCount = 0;

if (app.errors.length > 0) {
  criticalCount += 1;
  routeIssues.push({ route: '(boot)', critical: ['console error saat boot'], warnings: [] });
}

for (const route of APP_ROUTES) {
  await app.visit(route);
  const issues = collectDomIssues(app.document);
  criticalCount += issues.critical.length;
  warningCount += issues.warnings.length;
  routeIssues.push({ route, critical: issues.critical, warnings: issues.warnings });
}

app.close();

const contrast = auditTokenContrast();
const contrastFailures = contrast.failures;

const report = {
  at: new Date().toISOString(),
  scenario,
  today: fixture.today,
  routes: APP_ROUTES.length,
  critical: criticalCount,
  warnings: warningCount,
  contrastFailures: contrastFailures.length,
  routeIssues,
  contrast: contrast.results,
};

fs.mkdirSync(path.join(ROOT, '.metrics'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.metrics', 'a11y.json'), JSON.stringify(report, null, 2));

console.log(`\nN4 Pilot — accessibility audit ${dim(`(scenario: ${scenario})`)}\n`);
for (const entry of routeIssues) {
  const critical = entry.critical.length;
  const warnings = entry.warnings.length;
  const status = critical === 0 ? green('ok') : red('critical');
  console.log(
    `  ${entry.route.padEnd(34)} ${status.padEnd(10)} ${dim(`${critical} critical · ${warnings} warning`)}`,
  );
  for (const issue of entry.critical.slice(0, 3)) console.log(`      ${red('•')} ${issue}`);
  for (const issue of entry.warnings.slice(0, 2)) console.log(`      ${yellow('•')} ${issue}`);
}

console.log(`\nKontras token (WCAG normal text ≥4.5:1)`);
const byTheme = new Map();
for (const result of contrast.results) {
  const list = byTheme.get(result.theme) ?? [];
  list.push(result);
  byTheme.set(result.theme, list);
}
for (const [theme, results] of byTheme) {
  const failures = results.filter((result) => !result.pass);
  console.log(`  ${theme.padEnd(6)} ${failures.length === 0 ? green('lulus') : red(`${failures.length} gagal`)} ${dim(`${results.length} pasangan`)}`);
  for (const failure of failures) {
    console.log(`    ${red('•')} ${failure.label}: ${failure.ratio ?? '?'} : 1`);
  }
}

console.log(
  `\n${criticalCount === 0 && contrastFailures.length === 0 ? green('✓') : red('✗')} ${criticalCount} critical · ${warningCount} warning · ${contrastFailures.length} kontras gagal\n`,
);

process.exit(criticalCount === 0 && contrastFailures.length === 0 ? 0 : 1);
