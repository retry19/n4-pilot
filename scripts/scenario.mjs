#!/usr/bin/env node
/**
 * `npm run scenario` — reproducible AppState fixtures.
 *
 * Usage:
 *   npm run scenario                    # list scenarios
 *   npm run scenario -- two-mocks       # write fixtures/two-mocks.json
 *   npm run scenario -- --all
 *   npm run scenario -- recovery --today 2026-10-26
 *   npm run scenario -- two-mocks --out .cache/fixtures
 */
import { SCENARIOS, buildScenario, writeScenarioFile } from './lib/scenarios.mjs';

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--all' || arg === '--list' || arg === '--help' || arg === '-h') flags.set(arg, true);
  else if (arg === '--today' || arg === '--out') {
    const value = args[++i];
    if (!value) {
      console.error(`${arg} membutuhkan nilai`);
      process.exit(1);
    }
    flags.set(arg, value);
  } else positional.push(arg);
}

function list() {
  console.log('\nN4 Pilot — scenarios\n');
  const width = Math.max(...SCENARIOS.map((scenario) => scenario.id.length));
  for (const scenario of SCENARIOS) {
    console.log(`  ${scenario.id.padEnd(width)}  ${scenario.label}`);
    console.log(`  ${' '.repeat(width)}  ${scenario.description}`);
  }
  console.log('\nTulis fixture: npm run scenario -- <id> [--today YYYY-MM-DD]');
  console.log('Semua: npm run scenario -- --all\n');
}

if (flags.has('--help') || flags.has('-h') || flags.has('--list') || (positional.length === 0 && !flags.has('--all'))) {
  list();
  process.exit(0);
}

const today = flags.get('--today') ?? null;
const outDir = flags.get('--out') ?? 'fixtures';
const names = flags.has('--all') ? SCENARIOS.map((scenario) => scenario.id) : positional;

try {
  for (const name of names) {
    const fixture = await buildScenario(name, { today });
    const file = writeScenarioFile(fixture, outDir);
    const { state } = fixture;
    console.log(
      `✓ ${fixture.scenario.id.padEnd(16)} ${String(Object.keys(state.cards).length).padStart(3)} kartu · ${String(
        state.attempts.length,
      ).padStart(3)} attempt · ${state.mocks.length} mock → ${file}`,
    );
  }
  console.log('');
} catch (error) {
  console.error(error?.message ?? error);
  process.exit(1);
}
