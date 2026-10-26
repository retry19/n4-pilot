#!/usr/bin/env node
/**
 * `npm run inspect` — evaluate a JavaScript expression inside the project's
 * TypeScript modules, without creating temporary scripts by hand.
 *
 * Usage:
 *   npm run inspect -- "content.CONTENT_SUMMARY"
 *   npm run inspect -- "content.VOCAB_ITEMS.filter(v => v.level === 'n4').length"
 *   npm run inspect -- --state exports.json "helpers.readiness().status"
 *   npm run inspect -- --file checks/gate-audit.js
 *
 * Available globals: content, core, derive, helpers, state, today.
 * The expression may use `await`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CACHE = path.join(ROOT, '.cache');

const HELP = `
N4 Pilot inspect — evaluasi ekspresi terhadap core/content tanpa script sementara.

Pemakaian:
  npm run inspect -- "content.CONTENT_SUMMARY"
  npm run inspect -- --state fixtures/listening-gate.json "helpers.readiness().status"
  npm run inspect -- --file checks/my-audit.js

Flag:
  --state <file>  Muat state JSON (hasil ekspor atau objek AppState mentah)
  --file <file>   Baca ekspresi dari file (satu ekspresi, boleh multi-baris)
  --help          Tampilkan bantuan ini

Tersedia di dalam ekspresi:
  content   seluruh ekspor src/content (KANA_ITEMS, VOCAB_ITEMS, CURRICULUM, …)
  core      { fsrs, planner, readiness, mock, session, errors, date, util, ruby }
  derive    planFor, readinessFor, coveragePools, sessionPools, previewSession, …
  helpers   { plan(), readiness(), coverage(), loadState(path) }
  state     AppState hasil normalisasi (null jika --state tidak diberikan)
  today     tanggal lokal YYYY-MM-DD
`;

const args = process.argv.slice(2);
let statePath = null;
let filePath = null;
const expressionParts = [];

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    console.log(HELP);
    process.exit(0);
  } else if (arg === '--state') {
    statePath = args[++i] ?? null;
    if (!statePath) {
      console.error('--state membutuhkan path file');
      process.exit(1);
    }
  } else if (arg === '--file') {
    filePath = args[++i] ?? null;
    if (!filePath) {
      console.error('--file membutuhkan path file');
      process.exit(1);
    }
  } else {
    expressionParts.push(arg);
  }
}

let expression = filePath ? fs.readFileSync(path.resolve(filePath), 'utf8') : expressionParts.join(' ');
expression = expression.trim().replace(/;\s*$/, '');
if (!expression) {
  console.log(HELP);
  process.exit(1);
}

if (statePath && !fs.existsSync(path.resolve(statePath))) {
  console.error(`state tidak ditemukan: ${statePath}`);
  process.exit(1);
}

const url = (relative) => JSON.stringify(pathToFileURL(path.join(ROOT, relative)).href);
const stateFile = statePath ? JSON.stringify(path.resolve(statePath)) : 'null';

const source = `
import fs from 'node:fs';
import * as content from ${url('src/content/index.ts')};
import * as fsrs from ${url('src/core/fsrs.ts')};
import * as planner from ${url('src/core/planner.ts')};
import * as readiness from ${url('src/core/readiness.ts')};
import * as mock from ${url('src/core/mock.ts')};
import * as session from ${url('src/core/session.ts')};
import * as errors from ${url('src/core/errors.ts')};
import * as date from ${url('src/core/date.ts')};
import * as util from ${url('src/core/util.ts')};
import * as ruby from ${url('src/core/ruby.ts')};
import * as derive from ${url('src/state/derive.ts')};
import * as persistence from ${url('src/state/persistence.ts')};

const core = { fsrs, planner, readiness, mock, session, errors, date, util, ruby };
const statePath = ${stateFile};
const raw = statePath ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
const state = raw ? persistence.normalizeState(raw.state ?? raw) : null;
const today = derive.todayISO();
const helpers = {
  state,
  loadState: (file) => persistence.normalizeState(JSON.parse(fs.readFileSync(file, 'utf8')).state ?? {}),
  plan: (value = state) => derive.planFor(value),
  readiness: (value = state) => derive.readinessFor(value),
  coverage: (value = state) => derive.coveragePools(value),
};

const result = await (async () => (${expression}))();
if (result === undefined) console.log('undefined');
else console.log(JSON.stringify(result, null, 2));
`;

fs.mkdirSync(CACHE, { recursive: true });
const tempFile = path.join(CACHE, `inspect-${process.pid}-${randomUUID().slice(0, 8)}.mjs`);
fs.writeFileSync(tempFile, source, 'utf8');

try {
  await import(pathToFileURL(tempFile).href);
} catch (error) {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  try {
    fs.unlinkSync(tempFile);
  } catch {
    // cache is disposable
  }
}
