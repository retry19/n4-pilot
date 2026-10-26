import { describe, it, expect } from '../testkit.ts';
import { scoreMock } from './mock.ts';
import type { MockAnswer, MockForm, MockSectionId, StudyCard } from './types.ts';
import { makeCard } from './test-helpers.ts';

function card(key: string, correct = 'a'): StudyCard {
  return makeCard({ key, correct, options: [
    { id: 'a', text: 'benar' },
    { id: 'b', text: 'salah 1' },
    { id: 'c', text: 'salah 2' },
    { id: 'd', text: 'salah 3' },
  ] });
}

function form(vocabCount = 10, grammarCount = 10, listeningCount = 8): MockForm {
  const vocabulary = Array.from({ length: vocabCount }, (_, i) =>
    card(`vocab:v-${i}:q`, i === 0 ? 'b' : 'a'),
  );
  const grammar = Array.from({ length: grammarCount }, (_, i) => card(`grammar:g-${i}:q`));
  const listening = Array.from({ length: listeningCount }, (_, i) =>
    makeCard({
      key: `listening:l-${i}:q`,
      domain: 'listening',
      section: 'listening',
      itemType: 'quick_response',
      options: [
        { id: 'a', text: 'benar' },
        { id: 'b', text: 'salah 1' },
        { id: 'c', text: 'salah 2' },
        { id: 'd', text: 'salah 3' },
      ],
    }),
  );
  return {
    id: 'form-a',
    label: 'Mock A',
    variant: 'A',
    sections: { vocabulary, grammar_reading: grammar, listening },
    note: 'beta',
  };
}

function answerAll(mock: MockForm, options: { correctEverywhere?: boolean; listeningWrong?: boolean } = {}): MockAnswer[] {
  const answers: MockAnswer[] = [];
  for (const [section, cards] of Object.entries(mock.sections) as [MockSectionId, StudyCard[]][]) {
    for (const c of cards) {
      const wrong = options.listeningWrong === true && section === 'listening';
      const optionId = wrong ? 'b' : c.correct;
      answers.push({ cardKey: c.key, optionId, flagged: false, ms: 2000 });
    }
  }
  return answers;
}

const MINUTES: Record<MockSectionId, number> = { vocabulary: 20, grammar_reading: 50, listening: 32 };

describe('Mock scoring', () => {
  it('scores a perfect paper at the section maxima', () => {
    const mock = form();
    const report = scoreMock(mock, answerAll(mock), MINUTES, '2026-10-26T10:00:00.000Z');
    expect(report.total.estimate).toBe(180);
    expect(report.gates).toEqual({ kr: true, listening: true, total: true });
    expect(report.status).toBe('above');
    expect(report.sections).toHaveLength(3);
    expect(report.wins.length).toBeGreaterThan(0);
  });

  it('detects a listening gate failure even when the total would pass', () => {
    const mock = form();
    const report = scoreMock(mock, answerAll(mock, { listeningWrong: true }), MINUTES, '2026-10-26T10:00:00.000Z');
    expect(report.listening.estimate).toBe(0);
    expect(report.gates.listening).toBe(false);
    expect(report.status).toBe('gate_failed');
    expect(report.leaks.join(' ')).toMatch(/Listening/);
  });

  it('keeps every score inside its range and the exam maximum', () => {
    const mock = form();
    const report = scoreMock(mock, answerAll(mock), MINUTES, '2026-10-26T10:00:00.000Z');
    for (const section of report.sections) {
      expect(section.low).toBeLessThanOrEqual(section.estimate);
      expect(section.high).toBeGreaterThanOrEqual(section.estimate);
      expect(section.high).toBeLessThanOrEqual(120);
    }
    expect(report.total.low).toBeLessThanOrEqual(report.total.estimate);
    expect(report.total.high).toBeGreaterThanOrEqual(report.total.estimate);
  });

  it('marks an unfinished paper as weak evidence', () => {
    const mock = form();
    const partial = answerAll(mock).slice(0, 5);
    const report = scoreMock(mock, partial, MINUTES, '2026-10-26T10:00:00.000Z');
    expect(report.status).toBe('weak');
    expect(report.evidence).toBe(5);
  });

  it('lists item-type strengths and leaks with counts', () => {
    const mock = form();
    const report = scoreMock(mock, answerAll(mock), MINUTES, '2026-10-26T10:00:00.000Z');
    expect(report.itemTypes.length).toBeGreaterThan(0);
    expect(report.wins.every((win) => /\d/.test(win))).toBe(true);
    expect(report.leaks.every((leak) => /\d/.test(leak))).toBe(true);
  });
});
