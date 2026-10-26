/**
 * Card factory — turns canonical content into the single `StudyCard` shape used
 * by the session player, drills and the mock runner.
 *
 * Card keys are namespaced by domain (`vocab:…`, `grammar:…`) because readiness
 * groups evidence by the key prefix. Options are generated deterministically so
 * the same item always presents the same distractors.
 */
import type {
  Concept,
  Domain,
  DrillOption,
  GrammarItem,
  ItemType,
  KanjiItem,
  KanaItem,
  ListeningItem,
  MockForm,
  PhaseId,
  ReadingPassage,
  ReadingQuestion,
  StudyCard,
  VocabItem,
} from '../core/types.ts';
import { pickN, shuffled } from '../core/util.ts';
import { blankRuby, stripRuby } from '../core/ruby.ts';
import { KANA_ITEMS, KANA_ORDER } from './kana.ts';
import { VOCAB_ITEMS } from './vocab.ts';
import { KANJI_ITEMS } from './kanji.ts';
import { GRAMMAR_ITEMS } from './grammar.ts';
import { READING_PASSAGES, READING_QUESTIONS } from './reading.ts';
import { LISTENING_ITEMS } from './listening.ts';

const EXAM_WEIGHT: Record<ItemType, number> = {
  kana_recognition: 0.9,
  kanji_reading: 0.85,
  orthography: 0.7,
  context_expression: 0.9,
  paraphrase: 0.7,
  usage: 0.7,
  grammar_form: 0.8,
  sentence_ordering: 0.8,
  text_grammar: 0.7,
  reading_short: 0.7,
  reading_mid: 0.75,
  info_retrieval: 0.8,
  task_based: 1,
  key_points: 0.95,
  verbal_expressions: 0.9,
  quick_response: 1,
};

const TIME_TARGET: Record<Domain, number> = {
  kana: 5,
  vocab: 12,
  kanji: 15,
  grammar: 25,
  reading: 90,
  listening: 30,
};

function optionsFrom(correctText: string, pool: string[], seed: string): { options: DrillOption[]; correct: string } {
  const unique = [...new Set(pool)].filter((text) => text.length > 0 && text !== correctText);
  const distractors = pickN(unique, 3, seed);
  const all = shuffled([correctText, ...distractors], `${seed}:order`);
  const options = all.map((text, index) => ({ id: String.fromCharCode(97 + index), text }));
  const correct = options.find((option) => option.text === correctText)?.id ?? 'a';
  return { options, correct };
}

export function rubyPlain(text: string): string {
  return stripRuby(text);
}

// ---------------------------------------------------------------------------
// Kana
// ---------------------------------------------------------------------------

export function kanaCard(item: KanaItem, mode: 'recognition' | 'recall' = 'recognition'): StudyCard {
  const sameGroup = KANA_ITEMS.filter(
    (candidate) => candidate.script === item.script && candidate.group === item.group && candidate.romaji !== item.romaji,
  );
  const pool = sameGroup.length >= 3 ? sameGroup : KANA_ITEMS.filter((candidate) => candidate.romaji !== item.romaji);
  const seed = `${item.id}:${mode}`;

  if (mode === 'recognition') {
    const { options, correct } = optionsFrom(item.romaji, pool.map((candidate) => candidate.romaji), seed);
    return {
      key: `kana:${item.id}:recognition`,
      itemId: item.id,
      domain: 'kana',
      modality: 'recognition',
      itemType: 'kana_recognition',
      section: 'kr',
      prompt: { ja: item.kana, text: item.romaji, question: 'Bagaimana bunyi karakter ini?' },
      options,
      correct,
      explanation: `${item.kana} dibaca "${item.romaji}". ${item.mnemonic}`,
      examWeight: EXAM_WEIGHT.kana_recognition,
      difficulty: 1,
      tags: [item.group, item.script],
      timeTargetSeconds: TIME_TARGET.kana,
      audio: item.audio,
    };
  }

  const { options, correct } = optionsFrom(item.kana, pool.map((candidate) => candidate.kana), seed);
  return {
    key: `kana:${item.id}:recall`,
    itemId: item.id,
    domain: 'kana',
    modality: 'recall',
    itemType: 'kana_recognition',
    section: 'kr',
    prompt: { text: item.romaji, question: 'Karakter mana yang berbunyi seperti ini?' },
    options,
    correct,
    explanation: `"${item.romaji}" ditulis ${item.kana}.`,
    examWeight: EXAM_WEIGHT.kana_recognition,
    difficulty: 2,
    tags: [item.group, item.script],
    timeTargetSeconds: TIME_TARGET.kana,
  };
}

export function kanaConcept(item: KanaItem): Concept {
  return {
    key: `concept:${item.id}`,
    itemId: item.id,
    domain: 'kana',
    title: item.script === 'hiragana' ? 'Hiragana' : 'Katakana',
    heading: item.kana,
    reading: item.romaji,
    audio: item.audio,
    meaning: `Bunyi "${item.romaji}".`,
    detail: `Baris ${item.row} · ${item.group === 'base' ? 'dasar' : item.group === 'dakuten' ? 'dakuten' : 'yōon'}`,
    examples: [],
    note: [item.mnemonic, item.confusableWith?.length ? `Sering tertukar dengan: ${item.confusableWith.join(' ')}` : '']
      .filter(Boolean)
      .join(' '),
    check: kanaCard(item),
  };
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

function samePos(item: VocabItem, count = 6): VocabItem[] {
  const same = VOCAB_ITEMS.filter((candidate) => candidate.pos === item.pos && candidate.id !== item.id);
  const others = VOCAB_ITEMS.filter((candidate) => candidate.id !== item.id && candidate.pos !== item.pos);
  return [...same, ...others].slice(0, count);
}

export function vocabMeaningCard(item: VocabItem): StudyCard {
  const { options, correct } = optionsFrom(
    item.meaning,
    samePos(item, 10).map((candidate) => candidate.meaning),
    `${item.id}:meaning`,
  );
  return {
    key: `vocab:${item.id}:meaning`,
    itemId: item.id,
    domain: 'vocab',
    modality: 'recognition',
    itemType: 'kanji_reading',
    section: 'kr',
    prompt: { ja: item.word, reading: item.reading, question: 'Apa arti kata ini?' },
    options,
    correct,
    explanation: `${item.word}（${item.reading}） = ${item.meaning}. Contoh: ${rubyPlain(item.example.ja)}`,
    examWeight: EXAM_WEIGHT.kanji_reading,
    difficulty: item.level === 'n4' ? 3 : 2,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.vocab,
    audio: item.audio,
  };
}

export function vocabReadingCard(item: VocabItem): StudyCard {
  const { options, correct } = optionsFrom(
    item.reading,
    VOCAB_ITEMS.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.reading),
    `${item.id}:reading`,
  );
  return {
    key: `vocab:${item.id}:reading`,
    itemId: item.id,
    domain: 'vocab',
    modality: 'recognition',
    itemType: 'orthography',
    section: 'kr',
    prompt: { ja: item.word, question: 'Bagaimana cara membaca kata ini?' },
    options,
    correct,
    explanation: `${item.word} dibaca ${item.reading}. Artinya ${item.meaning}.`,
    examWeight: EXAM_WEIGHT.orthography,
    difficulty: item.level === 'n4' ? 3 : 2,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.vocab,
    audio: item.audio,
  };
}

export function vocabOrthographyCard(item: VocabItem): StudyCard {
  const { options, correct } = optionsFrom(
    item.word,
    samePos(item, 10).map((candidate) => candidate.word),
    `${item.id}:orthography`,
  );
  return {
    key: `vocab:${item.id}:orthography`,
    itemId: item.id,
    domain: 'vocab',
    modality: 'recall',
    itemType: 'orthography',
    section: 'kr',
    prompt: { text: item.reading, question: 'Bentuk tulisan yang benar untuk kata ini?' },
    options,
    correct,
    explanation: `${item.reading} ditulis ${item.word}.`,
    examWeight: EXAM_WEIGHT.orthography,
    difficulty: 3,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.vocab,
  };
}

export function vocabContextCard(item: VocabItem): StudyCard {
  const blanked = blankRuby(item.example.ja, item.word);
  const blankedReading = item.example.reading.replace(item.reading, '（　）');
  const { options, correct } = optionsFrom(
    item.word,
    samePos(item, 10).map((candidate) => candidate.word),
    `${item.id}:context`,
  );
  return {
    key: `vocab:${item.id}:context`,
    itemId: item.id,
    domain: 'vocab',
    modality: 'recognition',
    itemType: 'context_expression',
    section: 'kr',
    prompt: {
      ja: blanked.text,
      contextReading: blankedReading,
      question: 'Kata mana yang cocok untuk bagian kosong?',
    },
    options,
    correct,
    explanation: `${rubyPlain(item.example.ja)} — ${item.example.reading}. Kata yang tepat: ${item.word}（${item.meaning}）.`,
    examWeight: EXAM_WEIGHT.context_expression,
    difficulty: item.level === 'n4' ? 3 : 2,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.vocab + 4,
    audio: item.audio,
  };
}

export function vocabCards(item: VocabItem): StudyCard[] {
  return [vocabMeaningCard(item), vocabReadingCard(item), vocabOrthographyCard(item), vocabContextCard(item)];
}

export function vocabConcept(item: VocabItem): Concept {
  return {
    key: `concept:${item.id}`,
    itemId: item.id,
    domain: 'vocab',
    title: 'Kosakata baru',
    heading: item.word,
    reading: item.reading,
    audio: item.audio,
    meaning: item.meaning,
    detail: `${item.pos} · ${item.level.toUpperCase()}`,
    examples: [item.example],
    note: item.tags.length ? `Konteks: ${item.tags.join(', ')}` : undefined,
    check: vocabMeaningCard(item),
  };
}

// ---------------------------------------------------------------------------
// Kanji
// ---------------------------------------------------------------------------

export function kanjiMeaningCard(item: KanjiItem): StudyCard {
  const { options, correct } = optionsFrom(
    item.meaning,
    KANJI_ITEMS.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.meaning),
    `${item.id}:meaning`,
  );
  return {
    key: `kanji:${item.id}:meaning`,
    itemId: item.id,
    domain: 'kanji',
    modality: 'recognition',
    itemType: 'kanji_reading',
    section: 'kr',
    prompt: { ja: item.kanji, question: 'Apa arti kanji ini?' },
    options,
    correct,
    explanation: `${item.kanji} = ${item.meaning}. Kata contoh: ${item.words.map((word) => `${word.word}（${word.reading}）`).join(', ')}`,
    examWeight: EXAM_WEIGHT.kanji_reading,
    difficulty: 2,
    tags: ['kanji', item.level],
    timeTargetSeconds: TIME_TARGET.kanji,
    audio: item.words[0]?.reading,
  };
}

export function kanjiReadingCard(item: KanjiItem): StudyCard {
  const first = item.words[0]!;
  const pool = KANJI_ITEMS.flatMap((candidate) => candidate.words.map((word) => word.reading)).filter(
    (reading) => reading !== first.reading,
  );
  const { options, correct } = optionsFrom(first.reading, pool, `${item.id}:reading`);
  return {
    key: `kanji:${item.id}:reading`,
    itemId: item.id,
    domain: 'kanji',
    modality: 'recognition',
    itemType: 'kanji_reading',
    section: 'kr',
    prompt: { ja: first.word, question: 'Bagaimana reading kata ini?' },
    options,
    correct,
    explanation: `${first.word} dibaca ${first.reading} (${first.meaning}). Ini bacaan di dalam kata, bukan bacaan kanji terisolasi.`,
    examWeight: EXAM_WEIGHT.kanji_reading,
    difficulty: 3,
    tags: ['kanji', 'reading'],
    timeTargetSeconds: TIME_TARGET.kanji,
    audio: first.reading,
  };
}

export function kanjiConcept(item: KanjiItem): Concept {
  return {
    key: `concept:${item.id}`,
    itemId: item.id,
    domain: 'kanji',
    title: 'Kanji baru',
    heading: item.kanji,
    meaning: item.meaning,
    detail: `${item.radical} · ${item.strokes} goresan`,
    examples: item.words.map((word) => ({ ja: word.word, reading: word.reading, id: `${item.id}:${word.reading}` })),
    note: `${item.mnemonic} Kesalahan umum: ${item.mistake}`,
    check: kanjiMeaningCard(item),
  };
}

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

export function grammarCard(item: GrammarItem, drillIndex: number): StudyCard {
  const drill = item.drills[drillIndex]!;
  return {
    key: `grammar:${item.id}:${drill.id}`,
    itemId: item.id,
    domain: 'grammar',
    modality: 'recognition',
    itemType: drill.itemType,
    section: 'kr',
    prompt: { text: drill.prompt, question: 'Pilih bentuk yang tepat.' },
    options: drill.options,
    correct: drill.correct,
    explanation: drill.explanation,
    contrast: `Bandingkan dengan ${item.contrast.pattern}: ${item.contrast.note}`,
    examWeight: EXAM_WEIGHT[drill.itemType],
    difficulty: item.level === 'n4' ? 3 : 2,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.grammar,
  };
}

export function grammarConcept(item: GrammarItem, drillIndex: number): Concept {
  const drill = item.drills[drillIndex]!;
  return {
    key: `concept:${item.id}:${drillIndex}`,
    itemId: item.id,
    domain: 'grammar',
    title: 'Pola grammar',
    heading: item.pattern,
    meaning: item.meaning,
    detail: item.formation,
    examples: item.examples,
    note: `Kesalahan umum: ${item.commonError}`,
    contrast: `${item.contrast.pattern} — ${item.contrast.note}`,
    check: grammarCard(item, drillIndex),
  };
}

// ---------------------------------------------------------------------------
// Reading & listening
// ---------------------------------------------------------------------------

export function readingCard(passage: ReadingPassage, question: ReadingQuestion): StudyCard {
  const itemType: ItemType =
    passage.type === 'info' ? 'info_retrieval' : passage.type === 'mid' ? 'reading_mid' : 'reading_short';
  return {
    key: `reading:${passage.id}:${question.id}`,
    itemId: passage.id,
    domain: 'reading',
    modality: 'recognition',
    itemType,
    section: 'kr',
    prompt: {
      context: passage.body,
      contextReading: passage.reading,
      question: question.prompt,
      text: passage.title,
    },
    options: question.options,
    correct: question.correct,
    explanation: question.explanation,
    evidence: question.evidence,
    examWeight: EXAM_WEIGHT[itemType],
    difficulty: passage.type === 'mid' ? 3 : 2,
    tags: ['reading', passage.type],
    timeTargetSeconds: TIME_TARGET.reading,
  };
}

export function listeningCard(item: ListeningItem): StudyCard {
  return {
    key: `listening:${item.id}:question`,
    itemId: item.id,
    domain: 'listening',
    modality: 'listening',
    itemType: item.type,
    section: 'listening',
    prompt: {
      context: item.context,
      question: item.question,
      audioFirst: true,
    },
    options: item.options,
    correct: item.correct,
    explanation: item.explanation,
    evidence: `${item.script}\n\n${item.scriptReading}`,
    examWeight: EXAM_WEIGHT[item.type],
    difficulty: item.type === 'quick_response' ? 3 : 2,
    tags: item.tags,
    timeTargetSeconds: TIME_TARGET.listening,
    audio: item.scriptReading,
  };
}

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export interface CurriculumUnit {
  itemId: string;
  domain: Domain;
  phase: PhaseId;
  concept: Concept;
  card: StudyCard;
}

function interleave<T>(groups: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...groups.map((group) => group.length));
  for (let i = 0; i < max; i += 1) {
    for (const group of groups) {
      const item = group[i];
      if (item !== undefined) out.push(item);
    }
  }
  return out;
}

function buildCurriculum(): CurriculumUnit[] {
  const kanaBase = KANA_ORDER.filter((item) => item.group === 'base');
  const kanaDakuten = KANA_ORDER.filter((item) => item.group === 'dakuten');
  const kanaYoon = KANA_ORDER.filter((item) => item.group === 'yoon');
  const vocabN5 = VOCAB_ITEMS.filter((item) => item.level === 'n5');
  const vocabN4 = VOCAB_ITEMS.filter((item) => item.level === 'n4');
  const grammarN5 = GRAMMAR_ITEMS.filter((item) => item.level === 'n5');
  const grammarN4 = GRAMMAR_ITEMS.filter((item) => item.level === 'n4');

  const unit = (phase: PhaseId, concept: Concept, card: StudyCard): CurriculumUnit => ({
    itemId: card.itemId,
    domain: card.domain,
    phase,
    concept,
    card,
  });

  const foundations = kanaBase.map((item) => unit('foundations', kanaConcept(item), kanaCard(item)));

  const n5Vocab = vocabN5.map((item) => unit('n5_bridge', vocabConcept(item), vocabMeaningCard(item)));
  const n5Grammar = grammarN5.flatMap((item) =>
    item.drills.map((_, index) => unit('n5_bridge', grammarConcept(item, index), grammarCard(item, index))),
  );
  const dakuten = kanaDakuten.map((item) => unit('n5_bridge', kanaConcept(item), kanaCard(item)));
  const n5Bridge = interleave([n5Vocab, n5Grammar, dakuten]);

  const n4Vocab = vocabN4.map((item) => unit('n4_core_a', vocabConcept(item), vocabMeaningCard(item)));
  const n4Grammar = grammarN4.flatMap((item) =>
    item.drills.map((_, index) => unit('n4_core_a', grammarConcept(item, index), grammarCard(item, index))),
  );
  const kanjiMeaning = KANJI_ITEMS.map((item) => unit('n4_core_a', kanjiConcept(item), kanjiMeaningCard(item)));
  const n4CoreA = interleave([n4Vocab, n4Grammar, kanjiMeaning]);

  const kanjiReading = KANJI_ITEMS.map((item) => {
    const card = kanjiReadingCard(item);
    return unit('n4_core_b', { ...kanjiConcept(item), check: card, title: 'Kanji: baca dalam kata' }, card);
  });
  const vocabReading = VOCAB_ITEMS.map((item) => {
    const card = vocabReadingCard(item);
    return unit('n4_core_b', { ...vocabConcept(item), check: card, title: 'Baca kata ini' }, card);
  });
  const yoon = kanaYoon.map((item) => {
    const card = kanaCard(item, 'recall');
    const concept: Concept = { ...kanaConcept(item), check: card, title: 'Kana: ingat bentuknya' };
    return unit('n4_core_b', concept, card);
  });
  const n4CoreB = interleave([vocabReading, kanjiReading, yoon]);

  return [...foundations, ...n5Bridge, ...n4CoreA, ...n4CoreB];
}

export const CURRICULUM: CurriculumUnit[] = buildCurriculum();

export const CURRICULUM_BY_PHASE: Map<PhaseId, CurriculumUnit[]> = new Map(
  (['foundations', 'n5_bridge', 'n4_core_a', 'n4_core_b', 'integration', 'exam_sim', 'taper'] as PhaseId[]).map(
    (phase) => [phase, CURRICULUM.filter((unit) => unit.phase === phase)],
  ),
);

/** Practice pools (not part of the SRS new-item stream). */
export const GRAMMAR_CARDS: StudyCard[] = GRAMMAR_ITEMS.flatMap((item) =>
  item.drills.map((_, index) => grammarCard(item, index)),
);
export const READING_CARDS: StudyCard[] = READING_QUESTIONS.map(({ passage, question }) => readingCard(passage, question));
export const LISTENING_CARDS: StudyCard[] = LISTENING_ITEMS.map(listeningCard);
export const VOCAB_CARDS: StudyCard[] = VOCAB_ITEMS.flatMap(vocabCards);
export const KANJI_CARDS: StudyCard[] = KANJI_ITEMS.flatMap((item) => [kanjiMeaningCard(item), kanjiReadingCard(item)]);

export const ALL_CARDS: StudyCard[] = [
  ...KANA_ORDER.flatMap((item) => [kanaCard(item), kanaCard(item, 'recall')]),
  ...VOCAB_CARDS,
  ...KANJI_CARDS,
  ...GRAMMAR_CARDS,
  ...READING_CARDS,
  ...LISTENING_CARDS,
];

export const CARD_BY_KEY = new Map(ALL_CARDS.map((card) => [card.key, card]));

// ---------------------------------------------------------------------------
// Mock forms
// ---------------------------------------------------------------------------

function pickSection(pool: StudyCard[], count: number, seed: string): StudyCard[] {
  return pickN(pool, count, seed);
}

function buildMockForms(): MockForm[] {
  const vocabPool = shuffled(
    [
      ...VOCAB_ITEMS.flatMap((item) => [vocabMeaningCard(item), vocabReadingCard(item), vocabOrthographyCard(item), vocabContextCard(item)]),
      ...KANJI_ITEMS.map(kanjiReadingCard),
    ],
    'mock-vocab-pool',
  );
  const grammarPool = shuffled(GRAMMAR_CARDS, 'mock-grammar-pool');
  const readingPool = shuffled(READING_CARDS, 'mock-reading-pool');
  const listeningPool = shuffled(LISTENING_CARDS, 'mock-listening-pool');

  const vocabA = pickSection(vocabPool, 30, 'form-a-vocab');
  const vocabB = pickSection(
    vocabPool.filter((card) => !vocabA.some((used) => used.key === card.key)),
    30,
    'form-b-vocab',
  );
  const grammarA = pickSection(grammarPool, 18, 'form-a-grammar');
  const grammarB = pickSection(grammarPool, 18, 'form-b-grammar');

  const make = (id: string, label: string, variant: 'A' | 'B', vocab: StudyCard[], grammar: StudyCard[]): MockForm => ({
    id,
    label,
    variant,
    sections: {
      vocabulary: vocab,
      grammar_reading: [...grammar, ...pickSection(readingPool, Math.min(7, readingPool.length), `${id}-reading`)],
      listening: pickSection(listeningPool, Math.min(10, listeningPool.length), `${id}-listening`),
    },
    note: 'Form beta: jumlah item belum setara bentuk resmi. Timer mengikuti format 2026.',
  });

  return [
    make('form-a', 'Mock A', 'A', vocabA, grammarA),
    make('form-b', 'Mock B', 'B', vocabB, grammarB),
  ];
}

export const MOCK_FORMS: MockForm[] = buildMockForms();

export const MOCK_FORM_BY_ID = new Map(MOCK_FORMS.map((form) => [form.id, form]));

// ---------------------------------------------------------------------------
// Coverage pools
// ---------------------------------------------------------------------------

export const CONTENT_COUNTS = {
  kana: KANA_ITEMS.length,
  vocab: VOCAB_ITEMS.length,
  kanji: KANJI_ITEMS.length,
  grammar: GRAMMAR_ITEMS.length,
  reading: READING_PASSAGES.length,
  listening: LISTENING_ITEMS.length,
} as const;

export const CONTENT_SUMMARY = {
  kana: KANA_ITEMS.length,
  vocab: VOCAB_ITEMS.length,
  kanji: KANJI_ITEMS.length,
  grammar: GRAMMAR_ITEMS.length,
  grammarDrills: GRAMMAR_CARDS.length,
  reading: READING_PASSAGES.length,
  readingQuestions: READING_CARDS.length,
  listening: LISTENING_ITEMS.length,
  cards: ALL_CARDS.length,
  curriculum: CURRICULUM.length,
  mockItems: MOCK_FORMS.map((form) => ({
    form: form.label,
    vocab: form.sections.vocabulary.length,
    grammarReading: form.sections.grammar_reading.length,
    listening: form.sections.listening.length,
    total: form.sections.vocabulary.length + form.sections.grammar_reading.length + form.sections.listening.length,
  })),
};
