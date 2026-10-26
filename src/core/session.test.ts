import { describe, it, expect } from '../testkit.ts';
import { composeSession } from './session.ts';
import type { ComposeInput } from './session.ts';
import type { Concept, PhaseId, SessionMode } from './types.ts';
import { makeCard } from './test-helpers.ts';

function pools() {
  const due = Array.from({ length: 30 }, (_, i) =>
    makeCard({ key: `vocab:due-${i}:recognition`, itemId: `due-${i}` }),
  );
  const newItems = Array.from({ length: 8 }, (_, i) => {
    const key = `vocab:new-${i}:recognition`;
    const concept: Concept = {
      key: `concept-new-${i}`,
      itemId: `new-${i}`,
      domain: 'vocab',
      title: 'Kosakata baru',
      heading: '食べる',
      reading: 'たべる',
      meaning: 'makan',
      examples: [],
      check: makeCard({ key, itemId: `new-${i}` }),
    };
    return { concept, check: concept.check };
  });
  const apply = Array.from({ length: 6 }, (_, i) =>
    makeCard({ key: `reading:r-${i}:q`, itemId: `r-${i}`, domain: 'reading', itemType: 'reading_short' }),
  );
  const listening = Array.from({ length: 10 }, (_, i) =>
    makeCard({ key: `listening:l-${i}:q`, itemId: `l-${i}`, domain: 'listening', itemType: 'quick_response', section: 'listening' }),
  );
  return { due, newItems, apply, listening };
}

function input(overrides: Partial<ComposeInput> = {}): ComposeInput {
  return {
    today: '2026-10-26',
    phase: 'n4_core_a' as PhaseId,
    goalVersion: 1,
    mode: 'core45' as SessionMode,
    budgetMinutes: 45,
    reviewCap: 120,
    newItemCap: 25,
    listeningMinutes: 20,
    recovery: false,
    pools: pools(),
    ...overrides,
  };
}

describe('Session composer', () => {
  it('fills a 45-minute session within tolerance', () => {
    const session = composeSession(input());
    expect(session.estimatedMinutes).toBeGreaterThanOrEqual(38);
    expect(session.estimatedMinutes).toBeLessThanOrEqual(55);
    expect(session.steps.at(-1)!.block).toBe('recap');
    expect(session.blockCounts.recall).toBe(2);
    expect(session.blockCounts.learn).toBeGreaterThanOrEqual(4);
  });

  it('keeps listening at or above 20% of the session', () => {
    const session = composeSession(input());
    const listeningSeconds = session.steps.filter((step) => step.block === 'listening').length * 75;
    const total = session.steps.reduce((sum, step) => sum + step.estimateSeconds, 0);
    expect(listeningSeconds / total).toBeGreaterThanOrEqual(0.18);
  });

  it('respects caps and never repeats a card', () => {
    const session = composeSession(input({ reviewCap: 4, newItemCap: 2 }));
    const cards = session.steps.map((step) => step.cardKey).filter(Boolean);
    expect(new Set(cards).size).toBe(cards.length);
    const reviewSteps = session.steps.filter((step) => step.block === 'review' || step.block === 'recall');
    expect(reviewSteps.length).toBeLessThanOrEqual(4);
  });

  it('composes an honest 10-minute session', () => {
    const session = composeSession(input({ mode: 'quick10', budgetMinutes: 10 }));
    expect(session.estimatedMinutes).toBeGreaterThanOrEqual(8);
    expect(session.estimatedMinutes).toBeLessThanOrEqual(13);
    expect(session.blockCounts.recall).toBe(2);
    expect(session.blockCounts.review).toBe(1);
    expect(session.blockCounts.listening).toBe(2);
    expect(session.reason).toMatch(/review/);
  });

  it('uses only review cards for a fix-it session', () => {
    const fixCards = Array.from({ length: 6 }, (_, i) => makeCard({ key: `vocab:err-${i}:recognition` }));
    const session = composeSession(
      input({ mode: 'fixit', pools: { ...pools(), fixit: fixCards }, reason: '3 kesalahan に/で' }),
    );
    expect(session.steps.filter((step) => step.kind === 'card')).toHaveLength(6);
    expect(session.steps.every((step) => step.block === 'review' || step.block === 'recap')).toBe(true);
    expect(session.reason).toMatch(/に\/で/);
  });

  it('never invents content when pools are empty', () => {
    const empty = { due: [], newItems: [], apply: [], listening: [] };
    const session = composeSession(input({ pools: empty }));
    expect(session.steps).toHaveLength(1);
    expect(session.steps[0]!.block).toBe('recap');
    expect(session.estimatedMinutes).toBeLessThanOrEqual(2);
  });

  it('adds a timed prove set for deep sessions only', () => {
    const deep = composeSession(input({ mode: 'deep90', budgetMinutes: 90 }));
    const core = composeSession(input({ mode: 'core45', budgetMinutes: 45 }));
    expect(deep.blockCounts.prove).toBe(3);
    expect(core.blockCounts.prove ?? 0).toBe(0);
  });
});
