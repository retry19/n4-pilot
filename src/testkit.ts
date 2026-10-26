/**
 * Testkit — deliberately tiny, dependency-free test harness.
 *
 * Why not Vitest: the sandbox blocks child processes with piped stdio, which
 * esbuild (and therefore Vite/Vitest) requires. Node 24 strips TypeScript types
 * natively, so tests run straight from source with a single process.
 *
 * Usage:
 *   import { describe, it, expect } from '../../testkit.ts';
 */

type Fn = () => void | Promise<void>;

export type TestCase = {
  suite: string;
  name: string;
  fn: Fn;
  skip: boolean;
};

const registry: TestCase[] = [];
let currentSuite = '';

export function describe(name: string, fn: () => void): void {
  const previous = currentSuite;
  currentSuite = previous ? `${previous} › ${name}` : name;
  fn();
  currentSuite = previous;
}

export function it(name: string, fn: Fn): void {
  registry.push({ suite: currentSuite, name, fn, skip: false });
}

it.skip = (name: string, fn: Fn): void => {
  registry.push({ suite: currentSuite, name, fn, skip: true });
};

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

function format(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return String(value);
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as Record<string, unknown>);
    const bk = Object.keys(b as Record<string, unknown>);
    if (ak.length !== bk.length) return false;
    return ak.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  return false;
}

type Matchers = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeCloseTo(expected: number, digits?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toHaveLength(length: number): void;
  toContain(expected: unknown): void;
  toMatch(expected: RegExp | string): void;
  toThrow(expected?: RegExp | string): void;
};

export function expect(actual: unknown): Matchers & { not: Matchers } {
  return { ...buildMatchers(actual, false), not: buildMatchers(actual, true) };
}

function buildMatchers(actual: unknown, negate: boolean): Matchers {
  const fail = (message: string): never => {
    throw new AssertionError(`${negate ? 'NOT: ' : ''}${message}`);
  };
  /** Passes when the underlying expectation holds; negated expectations invert it. */
  const ensure = (holds: boolean, message: string): void => {
    if (negate ? holds : !holds) fail(message);
  };
  return {
    toBe(expected) {
      ensure(Object.is(actual, expected), `Expected ${format(actual)} to be ${format(expected)}`);
    },
    toEqual(expected) {
      ensure(
        deepEqual(actual, expected),
        `Expected deep equal\n  actual:   ${format(actual)}\n  expected: ${format(expected)}`,
      );
    },
    toBeCloseTo(expected, digits = 2) {
      const tolerance = Math.pow(10, -digits) / 2;
      ensure(
        typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
        `Expected ${format(actual)} to be close to ${expected} (±${tolerance})`,
      );
    },
    toBeGreaterThan(expected) {
      ensure(typeof actual === 'number' && actual > expected, `Expected ${format(actual)} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      ensure(typeof actual === 'number' && actual >= expected, `Expected ${format(actual)} >= ${expected}`);
    },
    toBeLessThan(expected) {
      ensure(typeof actual === 'number' && actual < expected, `Expected ${format(actual)} < ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      ensure(typeof actual === 'number' && actual <= expected, `Expected ${format(actual)} <= ${expected}`);
    },
    toBeTruthy() {
      ensure(Boolean(actual), `Expected ${format(actual)} to be truthy`);
    },
    toBeFalsy() {
      ensure(!actual, `Expected ${format(actual)} to be falsy`);
    },
    toBeNull() {
      ensure(actual === null, `Expected ${format(actual)} to be null`);
    },
    toBeUndefined() {
      ensure(actual === undefined, `Expected ${format(actual)} to be undefined`);
    },
    toBeDefined() {
      ensure(actual !== undefined, 'Expected value to be defined');
    },
    toHaveLength(length) {
      ensure(
        (Array.isArray(actual) || typeof actual === 'string') && (actual as ArrayLike<unknown>).length === length,
        `Expected length ${length}, received ${(actual as ArrayLike<unknown> | undefined)?.length}`,
      );
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        ensure(actual.includes(String(expected)), `Expected string to contain ${format(expected)}`);
        return;
      }
      ensure(
        Array.isArray(actual) && actual.some((item) => deepEqual(item, expected)),
        `Expected array to contain ${format(expected)}`,
      );
    },
    toMatch(expected) {
      if (typeof actual !== 'string') fail(`toMatch expects a string, received ${typeof actual}`);
      const text = actual as string;
      const ok = typeof expected === 'string' ? text.includes(expected) : expected.test(text);
      ensure(ok, `Expected ${format(text)} to match ${String(expected)}`);
    },
    toThrow(expected) {
      if (typeof actual !== 'function') fail('toThrow expects a function');
      let threw = false;
      let message = '';
      try {
        (actual as Fn)();
      } catch (error) {
        threw = true;
        message = error instanceof Error ? error.message : String(error);
      }
      if (negate) {
        ensure(!threw, `Expected function not to throw, received ${format(message)}`);
        return;
      }
      ensure(threw, 'Expected function to throw');
      if (expected) {
        const ok = typeof expected === 'string' ? message.includes(expected) : expected.test(message);
        ensure(ok, `Expected thrown message ${format(message)} to match ${String(expected)}`);
      }
    },
  };
}

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  suite: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  error?: unknown;
}

export interface TestRun {
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  startedAt: string;
}

/**
 * Runs every registered test silently. `scripts/test.mjs` prints the results;
 * `scripts/report.mjs` consumes the counts for the metrics document.
 */
export async function executeTests(): Promise<TestRun> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const results: TestResult[] = [];

  for (const test of registry) {
    if (test.skip) {
      results.push({ suite: test.suite, name: test.name, status: 'skipped', durationMs: 0 });
      continue;
    }
    const t0 = performance.now();
    try {
      await test.fn();
      results.push({
        suite: test.suite,
        name: test.name,
        status: 'passed',
        durationMs: performance.now() - t0,
      });
    } catch (error) {
      results.push({
        suite: test.suite,
        name: test.name,
        status: 'failed',
        durationMs: performance.now() - t0,
        error,
      });
    }
  }

  const passed = results.filter((result) => result.status === 'passed').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;

  return {
    results,
    passed,
    failed,
    skipped,
    total: passed + failed,
    durationMs: Date.now() - started,
    startedAt,
  };
}

export async function run(): Promise<number> {
  if (registry.length === 0) {
    console.log(`${COLOR.yellow}No tests registered.${COLOR.reset}`);
    return 0;
  }

  const runResult = await executeTests();
  let activeSuite = '';

  for (const result of runResult.results) {
    if (result.suite !== activeSuite) {
      activeSuite = result.suite;
      console.log(`\n${COLOR.bold}${activeSuite || '(root)'}${COLOR.reset}`);
    }
    if (result.status === 'skipped') {
      console.log(`  ${COLOR.yellow}○${COLOR.reset} ${result.name} ${COLOR.dim}(skipped)${COLOR.reset}`);
      continue;
    }
    if (result.status === 'passed') {
      const ms = result.durationMs;
      console.log(`  ${COLOR.green}✓${COLOR.reset} ${result.name} ${COLOR.dim}${ms < 1 ? '<1' : ms.toFixed(0)}ms${COLOR.reset}`);
      continue;
    }
    console.log(`  ${COLOR.red}✗${COLOR.reset} ${result.name}`);
  }

  const failures = runResult.results.filter((result) => result.status === 'failed');
  if (failures.length > 0) {
    console.log(`\n${COLOR.bold}${COLOR.red}Failures${COLOR.reset}`);
    for (const failure of failures) {
      console.log(`\n${COLOR.red}● ${failure.suite ? failure.suite + ' › ' : ''}${failure.name}${COLOR.reset}`);
      const error = failure.error;
      if (error instanceof AssertionError) {
        console.log(error.message.split('\n').map((line) => `  ${line}`).join('\n'));
      } else if (error instanceof Error) {
        console.log(`  ${error.message}`);
        if (error.stack) {
          const line = error.stack.split('\n').find((l) => l.includes('.test.'));
          if (line) console.log(`${COLOR.dim}  ${line.trim()}${COLOR.reset}`);
        }
      } else {
        console.log(`  ${String(error)}`);
      }
    }
  }

  const duration = (runResult.durationMs / 1000).toFixed(2);
  const summary = `${runResult.passed}/${runResult.total} passed${runResult.skipped ? ` · ${runResult.skipped} skipped` : ''} · ${duration}s`;
  console.log(`\n${runResult.failed === 0 ? COLOR.green + '✓' : COLOR.red + '✗'} ${summary}${COLOR.reset}\n`);
  return runResult.failed === 0 ? 0 : 1;
}

/** Timezone-stable date helper for scheduling tests. */
export function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
