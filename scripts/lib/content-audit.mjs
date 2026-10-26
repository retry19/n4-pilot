/**
 * Content audit: counts vs beta targets, structural integrity, card/mock balance.
 *
 * Single source of truth for `npm run content:report` and `npm run report`.
 * It deliberately duplicates the strongest assertions from content.test.ts so a
 * failed build is explained, not just reported as a red line.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・〜、。！？「」（）：※\s]+$/;
const ALLOWED_LISTENING = new Set(['task_based', 'key_points', 'verbal_expressions', 'quick_response']);

/** Planning targets from PRD §9.1 (beta column). */
export const CONTENT_TARGETS = {
  kana: { label: 'Kana', target: 92 },
  vocab: { label: 'Kosakata', target: 1200 },
  kanji: { label: 'Kanji', target: 240 },
  grammar: { label: 'Grammar', target: 100 },
  reading: { label: 'Bacaan', target: 40 },
  listening: { label: 'Menyimak', target: 100 },
};

export const MOCK_ITEM_REFERENCE = 88;

let cached = null;

async function loadModules() {
  const content = await import(pathToFileURL(path.join(ROOT, 'src/content/index.ts')).href);
  const ruby = await import(pathToFileURL(path.join(ROOT, 'src/core/ruby.ts')).href);
  return { content, ruby };
}

function uniqueIds(items, domain, fail) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) fail(`${domain}_duplicate_id`, `${domain}: id ganda ${item.id}`);
    seen.add(item.id);
  }
}

export async function auditContent() {
  if (cached) return cached;
  const { content, ruby } = await loadModules();
  const {
    KANA_ITEMS,
    VOCAB_ITEMS,
    KANJI_ITEMS,
    GRAMMAR_ITEMS,
    READING_PASSAGES,
    LISTENING_ITEMS,
    ALL_CARDS,
    CARD_BY_KEY,
    CURRICULUM,
    MOCK_FORMS,
    CONTENT_COUNTS,
  } = content;

  const issueMap = new Map();
  const fail = (code, message) => {
    const entry = issueMap.get(code) ?? { code, count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < 3) entry.examples.push(message);
    issueMap.set(code, entry);
  };

  // --- Kana ---------------------------------------------------------------
  uniqueIds(KANA_ITEMS, 'kana', fail);
  const hiraganaBase = KANA_ITEMS.filter((item) => item.script === 'hiragana' && item.group === 'base');
  const katakanaBase = KANA_ITEMS.filter((item) => item.script === 'katakana' && item.group === 'base');
  const dakuten = KANA_ITEMS.filter((item) => item.group === 'dakuten');
  const yoon = KANA_ITEMS.filter((item) => item.group === 'yoon');
  if (hiraganaBase.length !== 46) fail('kana_hiragana_coverage', `hiragana dasar ${hiraganaBase.length}, harus 46`);
  if (katakanaBase.length !== 46) fail('kana_katakana_coverage', `katakana dasar ${katakanaBase.length}, harus 46`);
  if (dakuten.length < 50) fail('kana_dakuten_coverage', `dakuten ${dakuten.length}, minimal 50`);
  if (yoon.length < 60) fail('kana_yoon_coverage', `yoon ${yoon.length}, minimal 60`);

  // --- Vocabulary ---------------------------------------------------------
  uniqueIds(VOCAB_ITEMS, 'vocab', fail);
  const meanings = new Map();
  for (const item of VOCAB_ITEMS) {
    if (!KANA_ONLY.test(item.reading)) fail('vocab_reading', `${item.id}: reading bukan kana (${item.reading})`);
    if (!KANA_ONLY.test(item.example.reading)) fail('vocab_example_reading', `${item.id}: reading contoh bukan kana`);
    const rubyCheck = ruby.validateRuby(item.example.ja);
    if (!rubyCheck.ok) fail('vocab_ruby', `${item.id}: ruby invalid — ${rubyCheck.errors.join(', ')}`);
    if (!ruby.stripRuby(item.example.ja).includes(item.word.slice(0, 1))) {
      fail('vocab_example_word', `${item.id}: contoh tidak memuat kata target`);
    }
    if (!item.audio) fail('vocab_audio', `${item.id}: audio kosong`);
    const existing = meanings.get(item.meaning);
    if (existing) fail('vocab_duplicate_meaning', `${item.id} dan ${existing} berbagi arti "${item.meaning}"`);
    else meanings.set(item.meaning, item.id);
  }

  // --- Kanji --------------------------------------------------------------
  uniqueIds(KANJI_ITEMS, 'kanji', fail);
  for (const item of KANJI_ITEMS) {
    if (item.words.length < 2) fail('kanji_words', `${item.id}: butuh minimal 2 kata contoh`);
    for (const word of item.words) {
      if (!KANA_ONLY.test(word.reading)) fail('kanji_reading', `${item.id}: reading ${word.word} bukan kana`);
    }
    if (item.mnemonic.length < 10) fail('kanji_mnemonic', `${item.id}: mnemonic terlalu pendek`);
    if (item.mistake.length < 10) fail('kanji_mistake', `${item.id}: kesalahan umum terlalu pendek`);
    if (!(item.strokes > 0)) fail('kanji_strokes', `${item.id}: jumlah goresan tidak valid`);
  }

  // --- Grammar ------------------------------------------------------------
  uniqueIds(GRAMMAR_ITEMS, 'grammar', fail);
  let grammarDrills = 0;
  for (const item of GRAMMAR_ITEMS) {
    grammarDrills += item.drills.length;
    if (item.drills.length < 2) fail('grammar_drills', `${item.id}: minimal 2 drill`);
    if (item.contrast.note.length < 20) fail('grammar_contrast', `${item.id}: contrast terlalu pendek`);
    if (item.commonError.length < 10) fail('grammar_error', `${item.id}: common error terlalu pendek`);
    for (const drill of item.drills) {
      if (drill.options.length !== 4) fail('grammar_options', `${drill.id}: harus 4 opsi`);
      if (!drill.options.some((option) => option.id === drill.correct)) {
        fail('grammar_correct', `${drill.id}: kunci tidak ada di opsi`);
      }
      if (new Set(drill.options.map((option) => option.text)).size !== drill.options.length) {
        fail('grammar_duplicate_options', `${drill.id}: opsi duplikat`);
      }
      if (!drill.prompt.includes('（　）')) fail('grammar_blank', `${drill.id}: prompt tanpa blank`);
      if (drill.explanation.length < 15) fail('grammar_explanation', `${drill.id}: penjelasan terlalu pendek`);
    }
    for (const example of item.examples) {
      if (!ruby.validateRuby(example.ja).ok) fail('grammar_ruby', `${item.id}: ruby contoh invalid`);
    }
  }

  // --- Reading ------------------------------------------------------------
  uniqueIds(READING_PASSAGES, 'reading', fail);
  let readingQuestions = 0;
  for (const passage of READING_PASSAGES) {
    readingQuestions += passage.questions.length;
    if (!ruby.validateRuby(passage.body).ok) fail('reading_ruby', `${passage.id}: ruby invalid`);
    if (!KANA_ONLY.test(passage.reading)) fail('reading_kana', `${passage.id}: reading bukan kana`);
    const plain = ruby.stripRuby(passage.body);
    for (const question of passage.questions) {
      if (question.options.length !== 4) fail('reading_options', `${question.id}: harus 4 opsi`);
      if (new Set(question.options.map((option) => option.text)).size !== 4) {
        fail('reading_duplicate_options', `${question.id}: opsi duplikat`);
      }
      if (!question.options.some((option) => option.id === question.correct)) {
        fail('reading_correct', `${question.id}: kunci tidak ada`);
      }
      if (!plain.includes(question.evidence)) fail('reading_evidence', `${question.id}: bukti tidak ada di teks`);
    }
  }

  // --- Listening ----------------------------------------------------------
  uniqueIds(LISTENING_ITEMS, 'listening', fail);
  const listeningTypes = new Set();
  for (const item of LISTENING_ITEMS) {
    listeningTypes.add(item.type);
    if (!ALLOWED_LISTENING.has(item.type)) fail('listening_type', `${item.id}: tipe tidak ada di blueprint N4`);
    if (!KANA_ONLY.test(item.scriptReading)) fail('listening_kana', `${item.id}: transkrip bukan kana`);
    if (item.options.length < 3) fail('listening_options', `${item.id}: minimal 3 opsi`);
    if (!item.options.some((option) => option.id === item.correct)) {
      fail('listening_correct', `${item.id}: kunci tidak ada`);
    }
    if (new Set(item.options.map((option) => option.text)).size !== item.options.length) {
      fail('listening_duplicate_options', `${item.id}: opsi duplikat`);
    }
    if (item.explanation.length < 10) fail('listening_explanation', `${item.id}: penjelasan terlalu pendek`);
  }
  for (const type of ALLOWED_LISTENING) {
    if (!listeningTypes.has(type)) fail('listening_type_coverage', `tipe ${type} belum ada`);
  }

  // --- Cards --------------------------------------------------------------
  const cardKeys = new Set();
  const byDomain = {};
  const optionCounts = {};
  for (const card of ALL_CARDS) {
    if (cardKeys.has(card.key)) fail('card_duplicate_key', `kartu ganda ${card.key}`);
    cardKeys.add(card.key);
    byDomain[card.domain] = (byDomain[card.domain] ?? 0) + 1;
    optionCounts[card.options.length] = (optionCounts[card.options.length] ?? 0) + 1;
    if (card.options.length < 3) fail('card_options', `${card.key}: kurang dari 3 opsi`);
    if (!card.options.some((option) => option.id === card.correct)) {
      fail('card_correct', `${card.key}: kunci tidak ada`);
    }
    if (new Set(card.options.map((option) => option.text)).size !== card.options.length) {
      fail('card_duplicate_options', `${card.key}: opsi duplikat`);
    }
    if (!card.key.startsWith(`${card.domain}:`)) fail('card_namespace', `${card.key}: prefix domain salah`);
    if (!card.explanation || card.explanation.length < 5) fail('card_explanation', `${card.key}: penjelasan kosong`);
  }

  // --- Curriculum ---------------------------------------------------------
  const curriculumKeys = new Set();
  const phaseCounts = {};
  for (const unit of CURRICULUM) {
    if (curriculumKeys.has(unit.card.key)) fail('curriculum_duplicate', `unit ganda ${unit.card.key}`);
    curriculumKeys.add(unit.card.key);
    phaseCounts[unit.phase] = (phaseCounts[unit.phase] ?? 0) + 1;
    if (unit.concept.check.key !== unit.card.key) fail('curriculum_concept', `${unit.card.key}: concept.check tidak cocok`);
    if (!CARD_BY_KEY.has(unit.card.key)) fail('curriculum_missing_card', `${unit.card.key}: kartu tidak terdaftar`);
  }

  // --- Mock forms ---------------------------------------------------------
  const mockForms = [];
  const sectionKeys = { vocabulary: [], grammar_reading: [], listening: [] };
  const mockIds = new Set();
  for (const form of MOCK_FORMS) {
    if (mockIds.has(form.id)) fail('mock_duplicate_form', `form ganda ${form.id}`);
    mockIds.add(form.id);
    const all = [...form.sections.vocabulary, ...form.sections.grammar_reading, ...form.sections.listening];
    const formKeys = new Set();
    for (const card of all) {
      if (formKeys.has(card.key)) fail('mock_duplicate_card', `${form.id}: kartu ganda ${card.key}`);
      formKeys.add(card.key);
      if (!CARD_BY_KEY.has(card.key)) fail('mock_unknown_card', `${form.id}: ${card.key} tidak ada di katalog`);
    }
    for (const card of form.sections.listening) {
      if (card.section !== 'listening') fail('mock_listening_section', `${form.id}: ${card.key} bukan seksi listening`);
    }
    for (const [section, cards] of Object.entries(form.sections)) {
      if (cards.length === 0) fail('mock_empty_section', `${form.id}/${section}: kosong`);
      sectionKeys[section]?.push(new Set(cards.map((card) => card.key)));
    }
    mockForms.push({
      id: form.id,
      label: form.label,
      sections: {
        vocabulary: form.sections.vocabulary.length,
        grammar_reading: form.sections.grammar_reading.length,
        listening: form.sections.listening.length,
      },
      total: all.length,
    });
  }
  if (MOCK_FORMS.length < 2) fail('mock_form_coverage', `mock form ${MOCK_FORMS.length}, target 2`);
  const mockOverlap = {};
  for (const [section, sets] of Object.entries(sectionKeys)) {
    if (sets.length === 2) {
      mockOverlap[section] = [...sets[0]].filter((key) => sets[1].has(key)).length;
    }
  }

  const counts = {
    kana: KANA_ITEMS.length,
    kanaHiragana: hiraganaBase.length,
    kanaKatakana: katakanaBase.length,
    kanaDakuten: dakuten.length,
    kanaYoon: yoon.length,
    vocab: VOCAB_ITEMS.length,
    vocabN5: VOCAB_ITEMS.filter((item) => item.level === 'n5').length,
    vocabN4: VOCAB_ITEMS.filter((item) => item.level === 'n4').length,
    kanji: KANJI_ITEMS.length,
    grammar: GRAMMAR_ITEMS.length,
    grammarDrills,
    reading: READING_PASSAGES.length,
    readingQuestions,
    listening: LISTENING_ITEMS.length,
    cards: ALL_CARDS.length,
    curriculum: CURRICULUM.length,
    mockForms: MOCK_FORMS.length,
  };

  const coverage = Object.entries(CONTENT_TARGETS).map(([key, meta]) => {
    const count = counts[key] ?? 0;
    return {
      key,
      label: meta.label,
      count,
      target: meta.target,
      ratio: meta.target > 0 ? count / meta.target : 0,
      status: count >= meta.target ? 'ok' : 'seed',
    };
  });

  const issues = [...issueMap.values()];
  const versionMismatch =
    CONTENT_COUNTS.vocab !== counts.vocab ||
    CONTENT_COUNTS.kanji !== counts.kanji ||
    CONTENT_COUNTS.grammar !== counts.grammar ||
    CONTENT_COUNTS.reading !== counts.reading ||
    CONTENT_COUNTS.listening !== counts.listening;
  if (versionMismatch) fail('counts_mismatch', 'CONTENT_COUNTS tidak cocok dengan data aktual');

  const result = {
    at: new Date().toISOString(),
    counts,
    targets: CONTENT_TARGETS,
    coverage,
    integrity: { ok: issues.length === 0, issues },
    cards: { total: ALL_CARDS.length, byDomain, optionCounts },
    curriculum: { total: CURRICULUM.length, byPhase: phaseCounts },
    mock: { forms: mockForms, overlap: mockOverlap, itemReference: MOCK_ITEM_REFERENCE },
    listeningTypes: [...listeningTypes].sort(),
    contentCountsMatch: !versionMismatch,
  };

  cached = result;
  return result;
}

export function coveragePercent(value, target) {
  if (target <= 0) return '—';
  return `${Math.round((value / target) * 100)}%`;
}
