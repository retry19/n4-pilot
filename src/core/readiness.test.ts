import { describe, it, expect } from '../testkit.ts';
import { computeReadiness } from './readiness.ts';
import type { ReadinessInput } from './readiness.ts';
import type { Attempt, Domain, TargetScore } from './types.ts';
import { makeAttempt, makeMock, seededCards, TODAY } from './test-helpers.ts';

const EMPTY_COVERAGE: Record<Domain, { total: number; seen: number }> = {
  kana: { total: 100, seen: 0 },
  vocab: { total: 60, seen: 0 },
  kanji: { total: 24, seen: 0 },
  grammar: { total: 16, seen: 0 },
  reading: { total: 6, seen: 0 },
  listening: { total: 12, seen: 0 },
};

function input(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    today: TODAY,
    examDate: '2027-12-05',
    targetScore: 90 as TargetScore,
    attempts: [],
    cards: {},
    coverage: EMPTY_COVERAGE,
    mocks: [],
    history: [],
    ...overrides,
  };
}

function attempts(domain: Domain, n: number, accuracy: number, overrides: Partial<Attempt> = {}): Attempt[] {
  return Array.from({ length: n }, (_, i) =>
    makeAttempt({
      domain,
      correct: i / n < accuracy,
      itemType:
        domain === 'listening' ? 'quick_response' : domain === 'grammar' ? 'grammar_form' : domain === 'kanji' ? 'kanji_reading' : 'kanji_reading',
      cardKey: `${domain}:item-${i}:recognition`,
      itemId: `item-${i}`,
      ...overrides,
    }),
  );
}

describe('Readiness', () => {
  it('says "belum cukup data" instead of inventing a score', () => {
    const readiness = computeReadiness(input());
    expect(readiness.evidence).toBe('insufficient');
    expect(readiness.status).toBe('insufficient');
    expect(readiness.probability).toBeNull();
    expect(readiness.canShowProbability).toBe(false);
    expect(readiness.reasonNoProbability).toBeTruthy();
    expect(readiness.status).not.toBe('safe');
  });

  it('always returns a range that contains the estimate', () => {
    const readiness = computeReadiness(
      input({ attempts: [...attempts('vocab', 80, 0.7), ...attempts('listening', 40, 0.6)] }),
    );
    expect(readiness.kr.low).toBeLessThanOrEqual(readiness.kr.estimate);
    expect(readiness.kr.high).toBeGreaterThanOrEqual(readiness.kr.estimate);
    expect(readiness.listening.low).toBeLessThanOrEqual(readiness.listening.estimate);
    expect(readiness.total.low).toBeLessThanOrEqual(readiness.total.estimate);
  });

  it('shows no probability with one mock but low coverage', () => {
    const readiness = computeReadiness(
      input({
        attempts: [...attempts('vocab', 70, 0.75), ...attempts('listening', 40, 0.65)],
        mocks: [makeMock()],
        coverage: { ...EMPTY_COVERAGE, vocab: { total: 60, seen: 20 } },
      }),
    );
    expect(readiness.canShowProbability).toBe(false);
    expect(readiness.probability).toBeNull();
    expect(readiness.reasonNoProbability).toMatch(/coverage/i);
  });

  it('never declares safe when listening is below its gate', () => {
    const readiness = computeReadiness(
      input({
        attempts: [
          ...attempts('vocab', 120, 0.9),
          ...attempts('grammar', 60, 0.85),
          ...attempts('reading', 30, 0.8),
          ...attempts('listening', 60, 0.2),
        ],
        mocks: [
          makeMock({
            kr: { section: 'grammar_reading', correct: 34, total: 40, raw: 34, estimate: 102, low: 94, high: 110, minutesUsed: 80 },
            listening: { section: 'listening', correct: 8, total: 30, raw: 8, estimate: 16, low: 12, high: 20, minutesUsed: 35 },
          }),
          makeMock({
            submittedAt: '2026-10-22T10:00:00.000Z',
            kr: { section: 'grammar_reading', correct: 33, total: 40, raw: 33, estimate: 99, low: 92, high: 106, minutesUsed: 80 },
            listening: { section: 'listening', correct: 7, total: 30, raw: 7, estimate: 14, low: 10, high: 18, minutesUsed: 35 },
          }),
        ],
        coverage: { ...EMPTY_COVERAGE, vocab: { total: 60, seen: 55 }, listening: { total: 12, seen: 12 } },
        cards: seededCards('listening', 10).cards,
      }),
    );
    expect(readiness.gates.listening).toBe(false);
    expect(readiness.status).toBe('at_risk');
    expect(readiness.status).not.toBe('safe');
    expect(readiness.factors[0]?.domain).toBe('listening');
  });

  it('reaches "Aman" only with two mocks, all gates and a lower bound above 95', () => {
    const readiness = computeReadiness(
      input({
        attempts: [
          ...attempts('vocab', 150, 0.95),
          ...attempts('grammar', 80, 0.92),
          ...attempts('reading', 50, 0.9),
          ...attempts('kanji', 50, 0.9),
          ...attempts('listening', 100, 0.88),
        ],
        mocks: [
          makeMock({
            kr: { section: 'grammar_reading', correct: 38, total: 40, raw: 38, estimate: 114, low: 108, high: 120, minutesUsed: 80 },
            listening: { section: 'listening', correct: 27, total: 30, raw: 27, estimate: 54, low: 50, high: 58, minutesUsed: 35 },
            total: { estimate: 168, low: 158, high: 178 },
          }),
          makeMock({
            submittedAt: '2026-10-24T10:00:00.000Z',
            kr: { section: 'grammar_reading', correct: 36, total: 40, raw: 36, estimate: 108, low: 102, high: 114, minutesUsed: 80 },
            listening: { section: 'listening', correct: 25, total: 30, raw: 25, estimate: 50, low: 46, high: 54, minutesUsed: 35 },
          }),
        ],
        coverage: {
          kana: { total: 100, seen: 100 },
          vocab: { total: 60, seen: 58 },
          kanji: { total: 24, seen: 23 },
          grammar: { total: 16, seen: 16 },
          reading: { total: 6, seen: 6 },
          listening: { total: 12, seen: 12 },
        },
      }),
    );
    expect(readiness.gates.kr).toBe(true);
    expect(readiness.gates.listening).toBe(true);
    expect(readiness.total.low).toBeGreaterThanOrEqual(95);
    expect(readiness.status).toBe('safe');
    expect(readiness.probability).not.toBeNull();
    expect(readiness.probability!.value).toBeGreaterThan(0.5);
  });

  it('keeps probability within 0..1 and interval ordered', () => {
    const readiness = computeReadiness(
      input({
        attempts: [...attempts('vocab', 90, 0.8), ...attempts('listening', 70, 0.75), ...attempts('grammar', 40, 0.8)],
        mocks: [makeMock()],
        coverage: {
          kana: { total: 100, seen: 92 },
          vocab: { total: 60, seen: 50 },
          kanji: { total: 24, seen: 20 },
          grammar: { total: 16, seen: 14 },
          reading: { total: 6, seen: 5 },
          listening: { total: 12, seen: 10 },
        },
      }),
    );
    expect(readiness.probability).not.toBeNull();
    const probability = readiness.probability!;
    expect(probability.value).toBeGreaterThanOrEqual(0);
    expect(probability.value).toBeLessThanOrEqual(1);
    expect(probability.low).toBeLessThanOrEqual(probability.value);
    expect(probability.high).toBeGreaterThanOrEqual(probability.value);
    expect(probability.confidence).toBe('low');
  });

  it('never claims certainty from an uncalibrated model', () => {
    const readiness = computeReadiness(
      input({
        attempts: [
          ...attempts('vocab', 200, 0.98),
          ...attempts('grammar', 100, 0.98),
          ...attempts('reading', 60, 0.98),
          ...attempts('kanji', 60, 0.98),
          ...attempts('listening', 120, 0.98),
        ],
        mocks: [
          makeMock({
            kr: { section: 'grammar_reading', correct: 40, total: 40, raw: 40, estimate: 120, low: 116, high: 120, minutesUsed: 80 },
            listening: { section: 'listening', correct: 30, total: 30, raw: 30, estimate: 60, low: 58, high: 60, minutesUsed: 35 },
            total: { estimate: 180, low: 174, high: 180 },
          }),
          makeMock({
            submittedAt: '2026-10-24T10:00:00.000Z',
            kr: { section: 'grammar_reading', correct: 40, total: 40, raw: 40, estimate: 120, low: 116, high: 120, minutesUsed: 80 },
            listening: { section: 'listening', correct: 30, total: 30, raw: 30, estimate: 60, low: 58, high: 60, minutesUsed: 35 },
          }),
        ],
        coverage: {
          kana: { total: 100, seen: 100 },
          vocab: { total: 60, seen: 60 },
          kanji: { total: 24, seen: 24 },
          grammar: { total: 16, seen: 16 },
          reading: { total: 6, seen: 6 },
          listening: { total: 12, seen: 12 },
        },
      }),
    );
    expect(readiness.probability).not.toBeNull();
    expect(readiness.probability!.value).toBeLessThanOrEqual(0.98);
    expect(readiness.probability!.high).toBeLessThanOrEqual(0.99);
    expect(readiness.probability!.high).toBeGreaterThan(readiness.probability!.value);
  });

  it('explains itself with at most three ranked factors', () => {
    const readiness = computeReadiness(
      input({ attempts: [...attempts('vocab', 40, 0.5), ...attempts('listening', 20, 0.5)] }),
    );
    expect(readiness.factors.length).toBeLessThanOrEqual(3);
    expect(readiness.factors.length).toBeGreaterThan(0);
    const contributions = readiness.factors.map((factor) => factor.contribution);
    expect(contributions).toEqual([...contributions].sort((a, b) => b - a));
  });
});
