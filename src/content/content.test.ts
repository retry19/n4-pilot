import { describe, it, expect } from '../testkit.ts';
import {
  ALL_CARDS,
  CARD_BY_KEY,
  CONTENT_COUNTS,
  CURRICULUM,
  GRAMMAR_CARDS,
  KANA_ITEMS,
  KANJI_ITEMS,
  LISTENING_ITEMS,
  MOCK_FORMS,
  READING_PASSAGES,
  READING_QUESTIONS,
  VOCAB_ITEMS,
  GRAMMAR_ITEMS,
} from './index.ts';
import { validateRuby, stripRuby } from '../core/ruby.ts';

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・〜、。！？「」（）：※\s]+$/;

describe('Content integrity', () => {
  it('has unique ids per content type', () => {
    const groups: [string, string[]][] = [
      ['kana', KANA_ITEMS.map((item) => item.id)],
      ['vocab', VOCAB_ITEMS.map((item) => item.id)],
      ['kanji', KANJI_ITEMS.map((item) => item.id)],
      ['grammar', GRAMMAR_ITEMS.map((item) => item.id)],
      ['reading', READING_PASSAGES.map((item) => item.id)],
      ['listening', LISTENING_ITEMS.map((item) => item.id)],
    ];
    for (const [label, ids] of groups) {
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.length > 2)).toBe(true);
      expect(`${label}:${new Set(ids).size}`).toBe(`${label}:${ids.length}`);
    }
  });

  it('covers every kana character of both scripts', () => {
    const hiragana = KANA_ITEMS.filter((item) => item.script === 'hiragana' && item.group === 'base');
    const katakana = KANA_ITEMS.filter((item) => item.script === 'katakana' && item.group === 'base');
    expect(hiragana).toHaveLength(46);
    expect(katakana).toHaveLength(46);
    const yoon = KANA_ITEMS.filter((item) => item.group === 'yoon');
    expect(yoon.length).toBeGreaterThan(60);
  });

  it('stores kana-only readings for every vocabulary item', () => {
    for (const item of VOCAB_ITEMS) {
      expect(KANA_ONLY.test(item.reading)).toBe(true);
      expect(item.meaning.length).toBeGreaterThan(1);
      expect(item.example.ja.length).toBeGreaterThan(3);
      expect(KANA_ONLY.test(item.example.reading)).toBe(true);
      const { ok, errors } = validateRuby(item.example.ja);
      expect(`${item.id} ${errors.join('; ')}`).toBe(`${item.id} `);
      expect(ok).toBe(true);
      expect(stripRuby(item.example.ja).includes(item.word.slice(0, 1))).toBe(true);
    }
  });

  it('does not repeat meanings (distractor quality)', () => {
    const meanings = VOCAB_ITEMS.map((item) => item.meaning);
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it('teaches every kanji inside real words', () => {
    for (const item of KANJI_ITEMS) {
      expect(item.words.length).toBeGreaterThanOrEqual(2);
      expect(item.mnemonic.length).toBeGreaterThan(10);
      expect(item.mistake.length).toBeGreaterThan(10);
      expect(item.strokes).toBeGreaterThan(0);
      for (const word of item.words) {
        expect(KANA_ONLY.test(word.reading)).toBe(true);
        expect(word.meaning.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every grammar point a contrast pair, error note and drills', () => {
    for (const item of GRAMMAR_ITEMS) {
      expect(item.contrast.note.length).toBeGreaterThan(20);
      expect(item.commonError.length).toBeGreaterThan(10);
      expect(item.examples.length).toBeGreaterThanOrEqual(2);
      expect(item.drills.length).toBeGreaterThanOrEqual(2);
      for (const drill of item.drills) {
        expect(drill.options).toHaveLength(4);
        expect(drill.options.some((option) => option.id === drill.correct)).toBe(true);
        expect(new Set(drill.options.map((option) => option.text)).size).toBe(4);
        expect(drill.prompt).toContain('（　）');
        expect(drill.explanation.length).toBeGreaterThan(15);
      }
      for (const example of item.examples) {
        expect(validateRuby(example.ja).ok).toBe(true);
      }
    }
  });

  it('gives every reading question four distinct options and real evidence', () => {
    for (const passage of READING_PASSAGES) {
      expect(passage.type === 'short' || passage.type === 'mid' || passage.type === 'info').toBe(true);
      expect(passage.questions.length).toBeGreaterThanOrEqual(1);
      expect(validateRuby(passage.body).ok).toBe(true);
      expect(KANA_ONLY.test(passage.reading)).toBe(true);
      const plain = stripRuby(passage.body);
      for (const question of passage.questions) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.text)).size).toBe(4);
        expect(question.options.some((option) => option.id === question.correct)).toBe(true);
        expect(question.evidence.length).toBeGreaterThan(3);
        expect(plain.includes(question.evidence)).toBe(true);
      }
    }
  });

  it('keeps listening items to the four N4 types with kana transcripts', () => {
    const allowed = new Set(['task_based', 'key_points', 'verbal_expressions', 'quick_response']);
    for (const item of LISTENING_ITEMS) {
      expect(allowed.has(item.type)).toBe(true);
      expect(KANA_ONLY.test(item.scriptReading)).toBe(true);
      expect(item.options.length).toBeGreaterThanOrEqual(3);
      expect(item.options.some((option) => option.id === item.correct)).toBe(true);
      expect(new Set(item.options.map((option) => option.text)).size).toBe(item.options.length);
      expect(item.explanation.length).toBeGreaterThan(10);
      expect(item.script.length).toBeGreaterThan(5);
    }
    const types = new Set(LISTENING_ITEMS.map((item) => item.type));
    expect(types.size).toBe(4);
  });
});

describe('Generated cards', () => {
  it('uses unique keys and always includes valid options', () => {
    const keys = ALL_CARDS.map((card) => card.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const card of ALL_CARDS) {
      expect(card.options.length).toBeGreaterThanOrEqual(3);
      expect(card.options.some((option) => option.id === card.correct)).toBe(true);
      expect(new Set(card.options.map((option) => option.text)).size).toBe(card.options.length);
      expect(card.explanation.length).toBeGreaterThan(5);
      expect(card.examWeight).toBeGreaterThan(0);
      expect(card.examWeight).toBeLessThanOrEqual(1);
      expect(card.timeTargetSeconds).toBeGreaterThan(0);
    }
  });

  it('namespaces card keys by domain for readiness grouping', () => {
    for (const card of ALL_CARDS) {
      expect(card.key.startsWith(`${card.domain}:`)).toBe(true);
    }
  });

  it('builds a curriculum that covers every taught card exactly once', () => {
    const keys = CURRICULUM.map((unit) => unit.card.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const unit of CURRICULUM) {
      expect(CARD_BY_KEY.has(unit.card.key)).toBe(true);
      expect(unit.concept.check.key).toBe(unit.card.key);
      expect(unit.domain).toBe(unit.card.domain);
    }
    const vocabCovered = new Set(CURRICULUM.filter((unit) => unit.domain === 'vocab').map((unit) => unit.itemId));
    expect(vocabCovered.size).toBe(VOCAB_ITEMS.length);
    const kanjiCovered = new Set(CURRICULUM.filter((unit) => unit.domain === 'kanji').map((unit) => unit.itemId));
    expect(kanjiCovered.size).toBe(KANJI_ITEMS.length);
    expect(CURRICULUM.filter((unit) => unit.domain === 'grammar')).toHaveLength(GRAMMAR_CARDS.length);
  });

  it('keeps mock forms usable and inside the N4 structure', () => {
    expect(MOCK_FORMS).toHaveLength(2);
    for (const form of MOCK_FORMS) {
      const all = [...form.sections.vocabulary, ...form.sections.grammar_reading, ...form.sections.listening];
      expect(new Set(all.map((card) => card.key)).size).toBe(all.length);
      expect(form.sections.vocabulary.length).toBe(30);
      expect(form.sections.grammar_reading.length).toBeGreaterThanOrEqual(20);
      expect(form.sections.listening.length).toBe(10);
      for (const card of all) expect(CARD_BY_KEY.has(card.key)).toBe(true);
      for (const card of form.sections.listening) expect(card.section).toBe('listening');
      for (const card of form.sections.vocabulary) expect(card.section).toBe('kr');
    }
    expect(MOCK_FORMS[0]!.sections.vocabulary[0]!.key).not.toBe(MOCK_FORMS[1]!.sections.vocabulary[0]!.key);
  });

  it('reports the honest seed size', () => {
    expect(CONTENT_COUNTS.vocab).toBe(VOCAB_ITEMS.length);
    expect(CONTENT_COUNTS.vocab).toBeGreaterThanOrEqual(60);
    expect(CONTENT_COUNTS.listening).toBeGreaterThanOrEqual(10);
    expect(CONTENT_COUNTS.reading).toBe(READING_PASSAGES.length);
    expect(READING_QUESTIONS.length).toBeGreaterThanOrEqual(7);
  });
});
