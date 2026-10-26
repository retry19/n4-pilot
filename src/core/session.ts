/**
 * Session composer: fills a time budget with a purposeful sequence.
 *
 * Order is fixed by the learning loop: recall → review → learn → apply →
 * listening → prove → recap (DESIGN §9.5). Counts come from the current phase's
 * ratios, then are clamped by due cards, new-item caps and pool sizes. If the
 * pools are empty the session still gives the learner something honest to do.
 */
import type {
  Concept,
  PhaseId,
  SessionMode,
  SessionPlan,
  SessionStep,
  StudyCard,
} from './types.ts';
import { PHASE_META, SESSION_MODES } from './types.ts';
import { round } from './util.ts';
import { formatMinutes } from './date.ts';

const SECONDS = {
  review: 24,
  concept: 95,
  check: 35,
  apply: 150,
  listening: 75,
  prove: 45,
  recap: 30,
};

export interface ComposeInput {
  today: string;
  phase: PhaseId;
  goalVersion: number;
  mode: SessionMode;
  budgetMinutes: number;
  reviewCap: number;
  newItemCap: number;
  listeningMinutes: number;
  recovery: boolean;
  reason?: string;
  pools: {
    due: StudyCard[];
    newItems: { concept: Concept; check: StudyCard }[];
    apply: StudyCard[];
    listening: StudyCard[];
    fixit?: StudyCard[];
  };
}

function clampCount(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function composeSession(input: ComposeInput): SessionPlan {
  const { mode, phase, pools } = input;
  const meta = PHASE_META[phase];
  const minutes = SESSION_MODES[mode].minutes;

  let targetReview: number;
  let targetConcept: number;
  let targetApply: number;
  let targetListening: number;
  let targetProve = 0;

  if (mode === 'fixit') {
    targetReview = 6;
    targetConcept = 0;
    targetApply = 0;
    targetListening = 0;
  } else if (mode === 'quick10' || mode === 'recovery') {
    // DESIGN's "4 review + 3 input + 3 listening" overruns 10 minutes once you
    // add feedback and transitions, so we use 3/3/2 and keep the promise honest.
    targetReview = 3;
    targetConcept = 3;
    targetApply = 0;
    targetListening = 2;
  } else {
    targetReview = (minutes * meta.reviewRatio * 60) / SECONDS.review;
    targetConcept = (minutes * meta.newRatio * 60) / (SECONDS.concept + SECONDS.check);
    targetApply = (minutes * meta.applyRatio * 60) / SECONDS.apply;
    targetListening = (minutes * meta.listeningRatio * 60) / SECONDS.listening;
    targetProve = mode === 'sprint150' ? 5 : mode === 'deep90' ? 3 : 0;
  }

  const reviewCountLimit = Math.min(pools.due.length, input.reviewCap);
  let reviewCount = clampCount(targetReview, reviewCountLimit);
  let conceptCount = clampCount(targetConcept, Math.min(pools.newItems.length, input.newItemCap));
  // Reserve a few application items for the timed "prove" block.
  const proveReserve = Math.min(targetProve, pools.apply.length);
  const applyLimit = Math.max(0, pools.apply.length - proveReserve);
  let applyCount = clampCount(targetApply, applyLimit);
  let listeningCount = clampCount(targetListening, pools.listening.length);
  let proveCount = clampCount(
    targetProve,
    Math.max(0, pools.apply.length + pools.listening.length - applyCount - listeningCount),
  );

  const targetSeconds = minutes * 60;
  const estimate = (): number =>
    reviewCount * SECONDS.review +
    conceptCount * (SECONDS.concept + SECONDS.check) +
    applyCount * SECONDS.apply +
    listeningCount * SECONDS.listening +
    proveCount * SECONDS.prove +
    SECONDS.recap;

  // Listening is first-class: at least 20% of learning time from 15 minutes up.
  if (minutes >= 15 && pools.listening.length > 0) {
    const targetListeningSeconds = Math.max(input.listeningMinutes * 60, targetSeconds * 0.2);
    const minimum = Math.ceil(targetListeningSeconds / SECONDS.listening);
    if (listeningCount < minimum) listeningCount = clampCount(minimum, pools.listening.length);
  }

  if (mode !== 'quick10' && mode !== 'recovery' && mode !== 'fixit') {
    // Fill an under-full session instead of ending early; a 45-minute plan that
    // stops at 32 minutes is a broken promise.
    while (estimate() < targetSeconds * 0.9 && reviewCount < reviewCountLimit) reviewCount += 1;
    while (estimate() < targetSeconds * 0.9 && applyCount < applyLimit) applyCount += 1;
    while (estimate() < targetSeconds * 0.9 && listeningCount < pools.listening.length) listeningCount += 1;
    while (estimate() > targetSeconds * 1.15 && proveCount > 0) proveCount -= 1;
    while (estimate() > targetSeconds * 1.15 && applyCount > 0) applyCount -= 1;
    while (estimate() > targetSeconds * 1.15 && reviewCount > 1) reviewCount -= 1;
  }

  const steps: SessionStep[] = [];
  const used = new Set<string>();
  let stepIndex = 0;
  const push = (step: Omit<SessionStep, 'id'>) => {
    stepIndex += 1;
    steps.push({ ...step, id: `step-${stepIndex}` });
  };

  if (mode === 'fixit') {
    const fixCards = (pools.fixit ?? pools.due).slice(0, 6);
    for (const card of fixCards) {
      if (used.has(card.key)) continue;
      used.add(card.key);
      push({ block: 'review', kind: 'card', cardKey: card.key, itemId: card.itemId, estimateSeconds: SECONDS.review });
    }
  } else {
    const reviewCards = pools.due.slice(0, reviewCount);
    for (const [index, card] of reviewCards.entries()) {
      if (used.has(card.key)) continue;
      used.add(card.key);
      push({
        block: index < 2 ? 'recall' : 'review',
        kind: 'card',
        cardKey: card.key,
        itemId: card.itemId,
        estimateSeconds: SECONDS.review,
      });
    }

    for (const item of pools.newItems.slice(0, conceptCount)) {
      if (used.has(item.check.key)) continue;
      push({
        block: 'learn',
        kind: 'concept',
        conceptKey: item.concept.key,
        itemId: item.concept.itemId,
        estimateSeconds: SECONDS.concept,
      });
      used.add(item.check.key);
      push({
        block: 'learn',
        kind: 'card',
        cardKey: item.check.key,
        itemId: item.check.itemId,
        estimateSeconds: SECONDS.check,
      });
    }

    let applied = 0;
    for (const card of pools.apply) {
      if (applied >= applyCount) break;
      if (used.has(card.key)) continue;
      used.add(card.key);
      applied += 1;
      push({
        block: 'apply',
        kind: card.domain === 'reading' ? 'reading' : 'card',
        cardKey: card.key,
        itemId: card.itemId,
        estimateSeconds: SECONDS.apply,
      });
    }

    let listened = 0;
    for (const card of pools.listening) {
      if (listened >= listeningCount) break;
      if (used.has(card.key)) continue;
      used.add(card.key);
      listened += 1;
      push({
        block: 'listening',
        kind: 'listening',
        cardKey: card.key,
        itemId: card.itemId,
        estimateSeconds: SECONDS.listening,
      });
    }

    if (proveCount > 0) {
      const proofPool = [...pools.apply, ...pools.listening].filter((card) => !used.has(card.key));
      for (const card of proofPool.slice(0, proveCount)) {
        used.add(card.key);
        push({ block: 'prove', kind: 'card', cardKey: card.key, itemId: card.itemId, estimateSeconds: SECONDS.prove });
      }
    }
  }

  push({ block: 'recap', kind: 'recap', estimateSeconds: SECONDS.recap });

  const totalSeconds = steps.reduce((sum, step) => sum + step.estimateSeconds, 0);
  const estimatedMinutes = Math.max(1, round(totalSeconds / 60, 0));

  const blockCounts: Record<string, number> = {};
  for (const step of steps) blockCounts[step.block] = (blockCounts[step.block] ?? 0) + 1;

  const parts: string[] = [];
  if (blockCounts.review || blockCounts.recall) parts.push(`${(blockCounts.review ?? 0) + (blockCounts.recall ?? 0)} review`);
  if (conceptCount > 0) parts.push(`${conceptCount} konsep baru`);
  if (blockCounts.apply) parts.push(`${blockCounts.apply} latihan`);
  if (blockCounts.listening) parts.push(`${blockCounts.listening} menyimak`);
  if (mode === 'fixit') parts.push('dari Buku Kesalahan');

  const reason = input.reason ?? (parts.length > 0 ? parts.join(' · ') : 'Sesi ringan untuk menjaga ritme');

  return {
    id: `sess_${input.today}_${mode}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    date: input.today,
    mode,
    goalVersion: input.goalVersion,
    steps,
    blockCounts,
    estimatedMinutes,
    reason,
    recovery: input.recovery || mode === 'recovery',
  };
}

/** Empty-state session: still honest, still one action. */
export function emptySessionReason(pools: ComposeInput['pools']): string {
  if (pools.due.length === 0 && pools.newItems.length === 0) {
    return 'Tidak ada review due. Kamu bisa latihan ringan atau istirahat.';
  }
  return '';
}

export function describeBudget(minutes: number): string {
  return `±${formatMinutes(minutes)}`;
}
