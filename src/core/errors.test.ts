import { describe, it, expect } from '../testkit.ts';
import { classifyError, createErrorEvent, groupErrors, resolveErrorsForCorrect } from './errors.ts';
import { makeCard } from './test-helpers.ts';

describe('Error taxonomy', () => {
  it('classifies a first-time vocabulary miss as an unknown word', () => {
    const card = makeCard({ key: 'vocab:v-taberu:recognition' });
    expect(classifyError({ card, priorAttempts: 0, priorCorrect: 0, ms: 4000, isMock: false })).toBe('unknown_word');
  });

  it('classifies a lapsed item as memory, not as a new gap', () => {
    const card = makeCard({ key: 'vocab:v-taberu:recognition' });
    expect(classifyError({ card, priorAttempts: 3, priorCorrect: 2, ms: 5000, isMock: true })).toBe('memory');
  });

  it('classifies listening failures as decoding', () => {
    const card = makeCard({ key: 'listening:l-1:q', domain: 'listening', section: 'listening', itemType: 'quick_response' });
    expect(classifyError({ card, priorAttempts: 1, priorCorrect: 1, ms: 3000, isMock: true })).toBe('listening_decoding');
  });

  it('protects listening number items as distractor errors', () => {
    const card = makeCard({
      key: 'listening:l-2:q',
      domain: 'listening',
      section: 'listening',
      itemType: 'key_points',
      tags: ['angka'],
    });
    expect(classifyError({ card, priorAttempts: 0, priorCorrect: 0, ms: 3000, isMock: true })).toBe('distractor');
  });

  it('classifies sentence ordering as parsing', () => {
    const card = makeCard({ key: 'grammar:g-1:q', domain: 'grammar', itemType: 'sentence_ordering' });
    expect(classifyError({ card, priorAttempts: 2, priorCorrect: 0, ms: 4000, isMock: false })).toBe('parsing');
  });

  it('flags time pressure when the learner is very slow', () => {
    const card = makeCard({ key: 'reading:r-1:q', domain: 'reading', itemType: 'reading_short', timeTargetSeconds: 20 });
    expect(classifyError({ card, priorAttempts: 2, priorCorrect: 0, ms: 90_000, isMock: false })).toBe('time');
  });

  it('never blames the learner in cause copy', () => {
    const json = JSON.stringify(groupErrors([]));
    expect(json).not.toMatch(/bodoh|gagal/i);
  });
});

describe('Error notebook', () => {
  const card = makeCard({ key: 'vocab:v-1:recognition', itemId: 'v-1' });

  it('groups errors by cause and tag, not by question', () => {
    const errorA = createErrorEvent({
      card,
      chosenOptionId: 'b',
      cause: 'unknown_word',
      at: '2026-10-20T09:00:00.000Z',
      domain: 'vocab',
      itemType: 'kanji_reading',
      question: 'Apa arti 近く?',
      answerText: 'jauh',
      correctText: 'dekat',
    });
    const errorB = { ...errorA, id: 'err-2', cardKey: 'vocab:v-2:recognition', at: '2026-10-21T09:00:00.000Z' };
    const groups = groupErrors([errorA, errorB]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.count).toBe(2);
    expect(groups[0]!.open).toBe(2);
    expect(groups[0]!.remediation).toBeTruthy();
  });

  it('requires two correct answers in different contexts to resolve', () => {
    const error = createErrorEvent({
      card,
      chosenOptionId: 'b',
      cause: 'unknown_word',
      at: '2026-10-20T09:00:00.000Z',
      domain: 'vocab',
      itemType: 'kanji_reading',
      question: 'q',
      answerText: 'x',
      correctText: 'y',
    });
    const sameItem = resolveErrorsForCorrect([error], error.groupKey, error.cardKey, '2026-10-21T09:00:00.000Z');
    expect(sameItem[0]!.status).toBe('open');

    const oneContext = resolveErrorsForCorrect([error], error.groupKey, 'vocab:v-2:recognition', '2026-10-21T09:00:00.000Z');
    expect(oneContext[0]!.status).toBe('in_progress');
    expect(oneContext[0]!.correctAfter).toHaveLength(1);

    const twoContexts = resolveErrorsForCorrect(oneContext, error.groupKey, 'vocab:v-3:recognition', '2026-10-22T09:00:00.000Z');
    expect(twoContexts[0]!.status).toBe('resolved');
    expect(twoContexts[0]!.resolvedAt).toBe('2026-10-22T09:00:00.000Z');
  });

  it('does not resolve unrelated groups', () => {
    const error = createErrorEvent({
      card,
      chosenOptionId: null,
      cause: 'unknown_word',
      at: '2026-10-20T09:00:00.000Z',
      domain: 'vocab',
      itemType: 'kanji_reading',
      question: 'q',
      answerText: 'x',
      correctText: 'y',
    });
    const untouched = resolveErrorsForCorrect([error], 'memory:partikel', 'vocab:other:recognition', '2026-10-21T09:00:00.000Z');
    expect(untouched[0]!.status).toBe('open');
  });
});
