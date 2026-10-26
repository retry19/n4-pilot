/**
 * Error taxonomy (DESIGN §9.7).
 *
 * The point is not to label the learner, it is to choose the next drill. Each
 * cause has exactly one remediation. Classification is deterministic and
 * rule-based — no AI is involved in MVP (FEATURE §0.4).
 */
import type { Domain, ErrorCause, ErrorEvent, ItemType, StudyCard } from './types.ts';
import { ERROR_CAUSE } from './types.ts';
import { id } from './util.ts';

export interface ClassifyInput {
  card: Pick<StudyCard, 'itemType' | 'domain' | 'tags' | 'timeTargetSeconds' | 'section'>;
  /** How many times this item was answered before (any outcome). */
  priorAttempts: number;
  /** Whether any earlier answer was correct. */
  priorCorrect: number;
  ms: number;
  isMock: boolean;
}

/**
 * Order matters: cheap, high-confidence signals first.
 *  - Lapse on a previously-correct item is "memory" even if the content is hard.
 *  - Listening failures default to decoding because the transcript proves the
 *    words were known (DESIGN §9.7 signal).
 */
export function classifyError(input: ClassifyInput): ErrorCause {
  const { card, priorAttempts, priorCorrect, ms, isMock } = input;
  const tooSlow = ms > Math.max(25_000, card.timeTargetSeconds * 1000 * 3);

  if (card.domain === 'listening') {
    if (tooSlow) return 'time';
    if (card.tags.includes('angka') || card.tags.includes('numbers')) return 'distractor';
    return 'listening_decoding';
  }
  if (priorCorrect > 0) return 'memory';
  if (card.itemType === 'sentence_ordering' || card.itemType === 'text_grammar') return 'parsing';
  if (card.domain === 'kanji') return 'kanji_misread';
  if (card.domain === 'grammar') return 'grammar_pattern';
  if (card.domain === 'reading') {
    if (tooSlow) return 'time';
    return priorAttempts === 0 ? 'unknown_word' : 'nuance';
  }
  if (card.domain === 'kana') {
    if (tooSlow) return 'time';
    return priorAttempts === 0 ? 'kana_misread' : 'memory';
  }
  // Vocabulary and everything else.
  if (priorAttempts === 0) return 'unknown_word';
  if (tooSlow) return 'time';
  if (isMock) return 'nuance';
  return 'distractor';
}

const TAG_LABEL: Record<string, string> = {
  partikel: 'partikel',
  angka: 'angka',
  waktu: 'waktu',
  arah: 'arah',
  keluarga: 'keluarga',
  kerja: 'kerja',
  makanan: 'makanan',
  transportasi: 'transportasi',
  kanji: 'kanji',
  bentuk: 'bentuk',
};

export function groupKeyFor(card: Pick<StudyCard, 'domain' | 'itemType' | 'tags'>, cause: ErrorCause): string {
  const tag = card.tags.find((t) => t in TAG_LABEL) ?? card.tags[0] ?? card.itemType;
  return `${cause}:${tag}`;
}

export function groupLabel(groupKey: string): { cause: ErrorCause; label: string } {
  const [causeRaw, tagRaw] = groupKey.split(':');
  const cause = (causeRaw as ErrorCause) ?? 'careless';
  const tag = TAG_LABEL[tagRaw ?? ''] ?? tagRaw ?? '';
  return {
    cause,
    label: `${ERROR_CAUSE[cause]?.label ?? 'Kesalahan'}${tag ? ` · ${tag}` : ''}`,
  };
}

export interface CreateErrorInput {
  card: StudyCard;
  chosenOptionId: string | null;
  cause: ErrorCause;
  at: string;
  domain: Domain;
  itemType: ItemType;
  question: string;
  answerText: string;
  correctText: string;
}

export function createErrorEvent(input: CreateErrorInput): ErrorEvent {
  return {
    id: id('err'),
    at: input.at,
    itemId: input.card.itemId,
    cardKey: input.card.key,
    domain: input.domain,
    itemType: input.itemType,
    cause: input.cause,
    status: 'open',
    wrongOptionId: input.chosenOptionId,
    correctOptionId: input.card.correct,
    groupKey: groupKeyFor(input.card, input.cause),
    correctAfter: [],
    resolvedAt: null,
    question: input.question,
    answerText: input.answerText,
    correctText: input.correctText,
  };
}

/**
 * A correct answer only resolves an error when it happens in a *different*
 * context (DESIGN §5.12: "resolved setelah 2 benar dalam konteks berbeda").
 * Returns updated events.
 */
export function resolveErrorsForCorrect(
  errors: ErrorEvent[],
  groupKey: string,
  cardKey: string,
  at: string,
): ErrorEvent[] {
  let changed = false;
  const next = errors.map((error) => {
    if (error.groupKey !== groupKey || error.status === 'resolved') return error;
    if (error.cardKey === cardKey && error.correctAfter.length === 0) {
      // Answering the same question again is not evidence of transfer.
      return error;
    }
    const contexts = error.correctAfter.includes(cardKey) ? error.correctAfter : [...error.correctAfter, cardKey];
    const resolved = contexts.length >= 2;
    changed = true;
    return {
      ...error,
      status: resolved ? ('resolved' as const) : ('in_progress' as const),
      correctAfter: contexts,
      resolvedAt: resolved ? at : error.resolvedAt,
    };
  });
  return changed ? next : errors;
}

export function groupErrors(errors: ErrorEvent[]): {
  groupKey: string;
  label: string;
  cause: ErrorCause;
  hint: string;
  remediation: string;
  count: number;
  open: number;
  resolved: number;
  lastAt: string;
  items: ErrorEvent[];
}[] {
  const map = new Map<string, ErrorEvent[]>();
  for (const error of errors) {
    const list = map.get(error.groupKey) ?? [];
    list.push(error);
    map.set(error.groupKey, list);
  }
  return [...map.entries()]
    .map(([groupKey, items]) => {
      const { cause, label } = groupLabel(groupKey);
      const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at));
      return {
        groupKey,
        label,
        cause,
        hint: ERROR_CAUSE[cause]?.hint ?? '',
        remediation: ERROR_CAUSE[cause]?.remediation ?? '',
        count: items.length,
        open: items.filter((item) => item.status !== 'resolved').length,
        resolved: items.filter((item) => item.status === 'resolved').length,
        lastAt: sorted[0]?.at ?? '',
        items: sorted,
      };
    })
    .sort((a, b) => b.open - a.open || b.lastAt.localeCompare(a.lastAt));
}

/** Which cause dominates a session? Used for the recap insight. */
export function dominantCause(errors: ErrorEvent[]): ErrorCause | null {
  const counts = new Map<ErrorCause, number>();
  for (const error of errors) {
    if (error.status === 'resolved') continue;
    counts.set(error.cause, (counts.get(error.cause) ?? 0) + 1);
  }
  let best: ErrorCause | null = null;
  let bestCount = 0;
  for (const [cause, count] of counts) {
    if (count > bestCount) {
      best = cause;
      bestCount = count;
    }
  }
  return best;
}
