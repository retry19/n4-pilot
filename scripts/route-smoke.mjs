#!/usr/bin/env node
/**
 * Route smoke: boot the production bundle in jsdom with a scenario state and
 * visit every route. Fails on render crashes or structural DOM problems.
 *
 * Usage: npm run smoke:routes [-- --scenario listening-gate] [--today 2026-10-26]
 */
import fs from 'node:fs';
import path from 'node:path';
import { bootApp, collectDomIssues, ROOT } from './lib/app-harness.mjs';
import { buildScenario } from './lib/scenarios.mjs';
import { APP_ROUTES, DEFAULT_SCENARIO } from './lib/routes.mjs';

const args = process.argv.slice(2);
const get = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const scenario = get('--scenario') ?? DEFAULT_SCENARIO;
const today = get('--today') ?? null;
const jsonOnly = args.includes('--json');

const color = process.stdout.isTTY;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint('32', text);
const red = (text) => paint('31', text);
const yellow = (text) => paint('33', text);
const dim = (text) => paint('2', text);

const fixture = await buildScenario(scenario, { today });
const app = await bootApp({ state: fixture.state });
const rows = [];
const started = Date.now();

if (app.errors.length > 0) {
  rows.push({ route: '(boot)', ok: false, critical: ['console error saat boot'], consoleErrors: [...app.errors] });
}

for (const route of APP_ROUTES) {
  const newErrors = await app.visit(route);
  const issues = collectDomIssues(app.document);
  rows.push({
    route,
    ok: newErrors.length === 0 && issues.critical.length === 0,
    critical: issues.critical,
    warnings: issues.warnings,
    consoleErrors: newErrors,
    headings: issues.headings,
  });
}

app.close();

const passed = rows.filter((row) => row.ok).length;
const total = rows.length;
const durationMs = Date.now() - started;

const report = {
  at: new Date().toISOString(),
  scenario,
  today: fixture.today,
  total,
  passed,
  failed: total - passed,
  durationMs,
  routes: rows.map((row) => ({
    route: row.route,
    ok: row.ok,
    critical: row.critical,
    warnings: row.warnings,
    consoleErrors: row.consoleErrors,
  })),
};

fs.mkdirSync(path.join(ROOT, '.metrics'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.metrics', 'routes.json'), JSON.stringify(report, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nN4 Pilot — route smoke ${dim(`(scenario: ${scenario})`)}\n`);
  const width = Math.max(...rows.map((row) => row.route.length), 5);
  for (const row of rows) {
    const status = row.ok ? green('ok') : red('fail');
    const critical = row.critical.length > 0 ? red(`${row.critical.length} masalah`) : dim('—');
    const consoleErrors = row.consoleErrors.length > 0 ? red(`${row.consoleErrors.length} error`) : dim('—');
    console.log(`  ${row.route.padEnd(width)}  ${status.padEnd(10)}  ${critical.padEnd(18)}  ${consoleErrors}`);
    if (!row.ok) {
      for (const issue of row.critical.slice(0, 4)) console.log(`      ${red('•')} ${issue}`);
      for (const error of row.consoleErrors.slice(0, 3)) console.log(`      ${red('•')} ${String(error).slice(0, 180)}`);
    }
  }
  console.log(`\n${passed === total ? green('✓') : red('✗')} ${passed}/${total} route · ${durationMs} ms\n`);
  if (passed !== total) {
    console.log(yellow('Perbaiki route yang gagal sebelum menganggap UI selesai.\n'));
  }
}

process.exit(passed === total ? 0 : 1);
