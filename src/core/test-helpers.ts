import type { Attempt, Domain, MockReport, StudyCard } from './types.ts';
import { newState } from './fsrs.ts';

export function makeCard(overrides: Partial<StudyCard> & { key: string }): StudyCard {
  const options = overrides.options ?? [
    { id: 'a', text: 'dekat' },
    { id: 'b', text: 'jauh' },
    { id: 'c', text: 'di dalam' },
    { id: 'd', text: 'di depan' },
  ];
  return {
    itemId: overrides.itemId ?? overrides.key,
    domain: 'vocab' as Domain,
    modality: 'recognition',
    itemType: 'kanji_reading',
    section: 'kr',
    prompt: { ja: '近く', question: 'Apa arti kata ini?' },
    options,
    correct: 'a',
    explanation: '近く = dekat.',
    examWeight: 0.8,
    difficulty: 2,
    tags: ['partikel'],
    timeTargetSeconds: 10,
    ...overrides,
  };
}

export function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  const correct = overrides.correct ?? true;
  return {
    id: `a_${Math.random().toString(36).slice(2, 8)}`,
    at: '2026-10-20T09:00:00.000Z',
    date: '2026-10-20',
    cardKey: 'vocab:v-taberu:recognition',
    itemId: 'v-taberu',
    domain: 'vocab',
    itemType: 'kanji_reading',
    modality: 'recognition',
    correct,
    ms: 4000,
    source: 'session',
    optionId: correct ? 'a' : 'b',
    firstExposure: false,
    ...overrides,
  };
}

export function makeMock(overrides: Partial<MockReport> = {}): MockReport {
  const krEstimate = overrides.kr?.estimate ?? 78;
  const lsEstimate = overrides.listening?.estimate ?? 34;
  return {
    formId: 'form-a',
    submittedAt: '2026-10-20T10:00:00.000Z',
    kr: {
      section: 'grammar_reading',
      correct: 26,
      total: 40,
      raw: 26,
      estimate: krEstimate,
      low: krEstimate - 8,
      high: krEstimate + 8,
      minutesUsed: 80,
      ...overrides.kr,
    },
    listening: {
      section: 'listening',
      correct: 17,
      total: 30,
      raw: 17,
      estimate: lsEstimate,
      low: lsEstimate - 4,
      high: lsEstimate + 4,
      minutesUsed: 35,
      ...overrides.listening,
    },
    sections: overrides.sections ?? [],
    total: overrides.total ?? { estimate: krEstimate + lsEstimate, low: krEstimate + lsEstimate - 10, high: krEstimate + lsEstimate + 10 },
    gates: overrides.gates ?? { kr: true, listening: true, total: true },
    status: overrides.status ?? 'above',
    wins: overrides.wins ?? [],
    leaks: overrides.leaks ?? [],
    itemTypes: overrides.itemTypes ?? [],
    evidence: overrides.evidence ?? 70,
  };
}

export const TODAY = '2026-10-26';

export function seededCards(domain: string, count: number, reviewedDaysAgo = 3) {
  const cards: Record<string, ReturnType<typeof newState>> = {};
  const meta: Record<string, { itemId: string; domain: Domain; modality: 'recognition'; itemType: 'kanji_reading' }> = {};
  for (let i = 0; i < count; i += 1) {
    const key = `${domain}:i-${i}:recognition`;
    const stamp = new Date('2026-10-23T09:00:00.000Z');
    stamp.setDate(stamp.getDate() - reviewedDaysAgo);
    cards[key] = {
      ...newState(stamp),
      reps: 3,
      stability: 12,
      difficulty: 5,
      lastReview: stamp.toISOString(),
      phase: 'review',
      due: '2026-11-01T09:00:00.000Z',
    };
    meta[key] = { itemId: `i-${i}`, domain: domain as Domain, modality: 'recognition', itemType: 'kanji_reading' };
  }
  return { cards, meta };
}
