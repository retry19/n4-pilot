/**
 * Mock exam scoring.
 *
 * JLPT uses IRT-scaled scores; we cannot reproduce that without calibration
 * data. So the report shows a *transparent linear estimate* with a binomial
 * uncertainty range, and always labels it "estimasi, bukan skor resmi".
 */
import type {
  ItemType,
  MockAnswer,
  MockForm,
  MockReport,
  MockSectionId,
  MockSectionResult,
  StudyCard,
} from './types.ts';
import { EXAM, ITEM_TYPE_LABEL } from './types.ts';
import { clamp, mean, round } from './util.ts';

const Z80 = 1.2816;

interface SectionScore {
  result: MockSectionResult;
  cards: StudyCard[];
}

function scaleSection(cards: StudyCard[], answers: Map<string, MockAnswer>, minutes: number, max: number, section: MockSectionId): SectionScore {
  const total = cards.length;
  let correct = 0;
  for (const card of cards) {
    const answer = answers.get(card.key);
    if (answer && answer.optionId === card.correct) correct += 1;
  }
  const ratio = total > 0 ? correct / total : 0;
  const estimate = round(max * ratio, 0);
  const p = clamp(ratio, 0.02, 0.98);
  const se = max * Math.sqrt((p * (1 - p)) / Math.max(1, total));
  const margin = Math.max(3, Z80 * se);
  return {
    cards,
    result: {
      section,
      correct,
      total,
      raw: correct,
      estimate,
      low: round(clamp(estimate - margin, 0, max), 0),
      high: round(clamp(estimate + margin, 0, max), 0),
      minutesUsed: round(minutes, 1),
    },
  };
}

function itemTypeStats(cards: StudyCard[], answers: Map<string, MockAnswer>): { itemType: ItemType; correct: number; total: number }[] {
  const map = new Map<ItemType, { correct: number; total: number }>();
  for (const card of cards) {
    const entry = map.get(card.itemType) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (answers.get(card.key)?.optionId === card.correct) entry.correct += 1;
    map.set(card.itemType, entry);
  }
  return [...map.entries()]
    .map(([itemType, value]) => ({ itemType, ...value }))
    .sort((a, b) => b.total - a.total);
}

export function scoreMock(
  form: MockForm,
  answers: MockAnswer[],
  minutes: Record<MockSectionId, number>,
  submittedAt: string,
): MockReport {
  const answerMap = new Map(answers.map((answer) => [answer.cardKey, answer]));
  const vocab = scaleSection(form.sections.vocabulary, answerMap, minutes.vocabulary, EXAM.krMax, 'vocabulary');
  const grammarReading = scaleSection(
    form.sections.grammar_reading,
    answerMap,
    minutes.grammar_reading,
    EXAM.krMax,
    'grammar_reading',
  );
  const listening = scaleSection(form.sections.listening, answerMap, minutes.listening, EXAM.listeningMax, 'listening');

  // Section 1 and 2 share the 120-point scoring section: combine raw items.
  const krCorrect = vocab.result.correct + grammarReading.result.correct;
  const krTotal = vocab.result.total + grammarReading.result.total;
  const krRatio = krTotal > 0 ? krCorrect / krTotal : 0;
  const krEstimate = round(EXAM.krMax * krRatio, 0);
  const krP = clamp(krRatio, 0.02, 0.98);
  const krSe = EXAM.krMax * Math.sqrt((krP * (1 - krP)) / Math.max(1, krTotal));
  const krMargin = Math.max(4, Z80 * krSe);
  const kr: MockSectionResult = {
    section: 'grammar_reading',
    correct: krCorrect,
    total: krTotal,
    raw: krCorrect,
    estimate: krEstimate,
    low: round(clamp(krEstimate - krMargin, 0, EXAM.krMax), 0),
    high: round(clamp(krEstimate + krMargin, 0, EXAM.krMax), 0),
    minutesUsed: round(minutes.vocabulary + minutes.grammar_reading, 1),
  };

  const totalEstimate = kr.estimate + listening.result.estimate;
  const se = Math.sqrt(krMargin ** 2 + (listening.result.high - listening.result.low) ** 2) / Z80;
  const total = {
    estimate: totalEstimate,
    low: round(clamp(totalEstimate - Z80 * se, 0, EXAM.totalMax), 0),
    high: round(clamp(totalEstimate + Z80 * se, 0, EXAM.totalMax), 0),
  };

  const gates = {
    kr: kr.estimate >= EXAM.krGate,
    listening: listening.result.estimate >= EXAM.listeningGate,
    total: total.estimate >= EXAM.passTotal,
  };

  const allCards = [...form.sections.vocabulary, ...form.sections.grammar_reading, ...form.sections.listening];
  const answered = answers.filter((answer) => allCards.some((card) => card.key === answer.cardKey)).length;
  const completion = allCards.length > 0 ? answered / allCards.length : 0;
  const types = itemTypeStats(allCards, answerMap);

  const strongest = [...types]
    .filter((entry) => entry.total >= 2)
    .sort((a, b) => b.correct / b.total - a.correct / a.total)
    .slice(0, 3);
  const weakest = [...types]
    .filter((entry) => entry.total >= 2)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .slice(0, 3);

  const wins = strongest.map(
    (entry) => `${ITEM_TYPE_LABEL[entry.itemType]}: ${entry.correct}/${entry.total} benar (${Math.round((entry.correct / entry.total) * 100)}%)`,
  );
  const leaks = weakest.map(
    (entry) => `${ITEM_TYPE_LABEL[entry.itemType]}: ${entry.total - entry.correct} salah dari ${entry.total}`,
  );

  if (!gates.listening) {
    leaks.unshift(`Listening ${listening.result.estimate}/60 — di bawah gate 19`);
  }
  if (!gates.kr) {
    leaks.unshift(`Knowledge+Reading ${kr.estimate}/120 — di bawah gate 38`);
  }
  if (wins.length < 3) {
    wins.push(`Kamu menjawab ${answered} dari ${allCards.length} soal`);
    if (completion >= 0.99) wins.push('Tidak ada seksi yang kosong');
  }

  const status: MockReport['status'] =
    completion < 0.9 ? 'weak' : gates.kr && gates.listening && gates.total ? 'above' : 'gate_failed';

  return {
    formId: form.id,
    submittedAt,
    kr,
    listening: listening.result,
    sections: [vocab.result, grammarReading.result, listening.result],
    total,
    gates,
    status,
    wins: wins.slice(0, 3),
    leaks: leaks.slice(0, 3),
    itemTypes: types,
    evidence: answered,
  };
}

/** Average accuracy across all answered mocks, used for calibration copy. */
export function mockTrend(mocks: MockReport[]): { last: number | null; average: number | null; delta: number | null } {
  if (mocks.length === 0) return { last: null, average: null, delta: null };
  const sorted = [...mocks].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const totals = sorted.map((mock) => mock.total.estimate);
  const last = totals.at(-1) ?? null;
  const previous = totals.at(-2) ?? null;
  return {
    last,
    average: round(mean(totals), 0),
    delta: last !== null && previous !== null ? last - previous : null,
  };
}
