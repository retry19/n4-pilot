/**
 * FSRS-4.5 scheduler with exam-aware constraints.
 *
 * Implementation notes:
 *  - 17 default parameters (open-spaced-repetition, FSRS-4.5).
 *  - Desired retention 0.90 by default (DESIGN §9.3).
 *  - Max interval is clamped to the exam date: there is no point scheduling a
 *    review after the test. High-weight items get a final review 5–10 days out.
 *  - "Again" schedules a 10-minute relearning step; multiple choice answers are
 *    auto-graded, manual ratings are only used for open recall.
 */
import type { FsrsState, Rating } from './types.ts';
import { addDays, addMinutes, diffDays, toISODate } from './date.ts';
import { clamp, hashString } from './util.ts';

const DECAY = -0.5;
/** Makes R(t = S) = 0.9. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

/** FSRS-4.5 default weights. */
export const FSRS_WEIGHTS = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const;

export interface ScheduleOptions {
  desiredRetention?: number;
  examDate?: string | null;
  examWeight?: number;
  maxInterval?: number;
  /** Card key, used for deterministic tie-breaking in the exam window. */
  key?: string;
}

export function newState(now: Date): FsrsState {
  return {
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    phase: 'new',
    lastReview: null,
  };
}

function initialStability(rating: Rating): number {
  return Math.max(0.1, FSRS_WEIGHTS[rating - 1] ?? 0.5);
}

function initialDifficulty(rating: Rating): number {
  const value = FSRS_WEIGHTS[4]! - Math.exp(FSRS_WEIGHTS[5]! * (rating - 1)) + 1;
  return clamp(value, 1, 10);
}

function nextDifficulty(difficulty: number, rating: Rating): number {
  const delta = difficulty - FSRS_WEIGHTS[6]! * (rating - 3);
  const reverted = FSRS_WEIGHTS[7]! * initialDifficulty(4) + (1 - FSRS_WEIGHTS[7]!) * delta;
  return clamp(reverted, 1, 10);
}

/** Predicted probability of recall right now. 0 for unseen cards. */
export function retrievability(state: FsrsState, now: Date): number {
  if (!state.lastReview || state.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (now.getTime() - new Date(state.lastReview).getTime()) / 86_400_000);
  return Math.pow(1 + FACTOR * (elapsedDays / state.stability), DECAY);
}

/** Predicted recall on an arbitrary future date (readiness uses exam day). */
export function retrievabilityOn(state: FsrsState, date: Date): number {
  if (!state.lastReview || state.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (date.getTime() - new Date(state.lastReview).getTime()) / 86_400_000);
  return Math.pow(1 + FACTOR * (elapsedDays / state.stability), DECAY);
}

function stabilityAfterRecall(state: FsrsState, difficulty: number, rating: Rating, r: number): number {
  const hardPenalty = rating === 2 ? FSRS_WEIGHTS[15]! : 1;
  const easyBonus = rating === 4 ? FSRS_WEIGHTS[16]! : 1;
  const growth =
    1 +
    Math.exp(FSRS_WEIGHTS[8]!) *
      (11 - difficulty) *
      Math.pow(state.stability, -FSRS_WEIGHTS[9]!) *
      (Math.exp(FSRS_WEIGHTS[10]! * (1 - r)) - 1) *
      hardPenalty *
      easyBonus;
  return Math.max(state.stability, state.stability * growth);
}

function stabilityAfterLapse(state: FsrsState, difficulty: number, r: number): number {
  const value =
    FSRS_WEIGHTS[11]! *
    Math.pow(difficulty, -FSRS_WEIGHTS[12]!) *
    (Math.pow(state.stability + 1, FSRS_WEIGHTS[13]!) - 1) *
    Math.exp(FSRS_WEIGHTS[14]! * (1 - r));
  return Math.max(0.1, value);
}

/** Days until predicted recall drops to `retention`. Equals stability at 0.9. */
export function intervalForStability(stability: number, retention: number): number {
  const raw = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

/**
 * Exam-awareness: never schedule past the exam, and pull high-weight items into
 * a final review window 5–10 days before it. Deterministic per card key.
 */
function applyExamWindow(
  due: Date,
  now: Date,
  intervalDays: number,
  options: ScheduleOptions,
): { due: Date; intervalDays: number } {
  const { examDate, examWeight = 0.5, maxInterval = 365, key = '' } = options;
  if (!examDate) return { due, intervalDays };

  const today = toISODate(now);
  const daysToExam = diffDays(today, examDate);
  if (daysToExam <= 0) {
    // After the exam there are no further reviews until a new goal is set.
    return { due: new Date(Math.max(now.getTime(), due.getTime())), intervalDays };
  }

  const hardCap = Math.min(maxInterval, Math.max(1, daysToExam - 1));

  // Sub-day learning steps (Again → 10 minutes) are already inside the exam
  // window; do not recompute them from a whole-day interval.
  if (intervalDays <= 0) {
    return { due, intervalDays };
  }

  let nextInterval = Math.min(intervalDays, hardCap);
  let nextDue = new Date(now.getTime() + nextInterval * 86_400_000);

  if (daysToExam <= 10 && examWeight >= 0.8) {
    const offset = 5 + (hashString(key) % 6); // 5..10 days before the exam
    const target = new Date(new Date(`${addDays(examDate, -offset)}T09:00:00`).getTime());
    const earliest = now.getTime() + 60 * 60 * 1000;
    if (nextDue.getTime() > target.getTime() && target.getTime() > earliest) {
      nextDue = target;
      nextInterval = Math.max(0, Math.round((target.getTime() - now.getTime()) / 86_400_000));
    }
  }

  const examEnd = new Date(`${examDate}T23:59:59`);
  if (nextDue.getTime() > examEnd.getTime()) {
    nextDue = examEnd;
    nextInterval = Math.max(0, diffDays(today, examDate));
  }

  return { due: nextDue, intervalDays: nextInterval };
}

/** Apply a rating and return the next scheduling state. */
export function schedule(
  state: FsrsState,
  rating: Rating,
  now: Date,
  options: ScheduleOptions = {},
): FsrsState {
  const desiredRetention = options.desiredRetention ?? 0.9;
  const isFirst = state.reps === 0;
  const r = retrievability(state, now);

  let difficulty: number;
  let stability: number;
  let lapses = state.lapses;

  if (isFirst) {
    difficulty = initialDifficulty(rating);
    stability = initialStability(rating);
  } else {
    difficulty = nextDifficulty(state.difficulty, rating);
    if (rating === 1) {
      stability = stabilityAfterLapse(state, state.difficulty, r);
      lapses += 1;
    } else {
      stability = stabilityAfterRecall(state, state.difficulty, rating, r);
    }
  }

  let intervalDays: number;
  if (rating === 1) {
    intervalDays = 0; // relearn in 10 minutes
  } else {
    intervalDays = intervalForStability(stability, desiredRetention);
    intervalDays = clamp(intervalDays, 1, options.maxInterval ?? 365);
  }

  let due =
    rating === 1
      ? new Date(now.getTime() + 10 * 60 * 1000)
      : new Date(now.getTime() + intervalDays * 86_400_000);

  const clamped = applyExamWindow(due, now, intervalDays, { ...options, examWeight: options.examWeight ?? 0.5 });
  due = clamped.due;
  intervalDays = clamped.intervalDays;

  return {
    due: due.toISOString(),
    stability,
    difficulty,
    scheduledDays: rating === 1 ? 0 : Math.max(1, intervalDays),
    reps: state.reps + 1,
    lapses,
    phase: rating === 1 ? (isFirst || state.phase === 'learning' ? 'learning' : 'relearning') : 'review',
    lastReview: now.toISOString(),
  };
}

export interface IntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

function labelInterval(state: FsrsState, rating: Rating, now: Date, options: ScheduleOptions): string {
  const next = schedule(state, rating, now, options);
  const due = new Date(next.due);
  const minutes = Math.round((due.getTime() - now.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} mnt`;
  const days = Math.round(minutes / 1440);
  if (days < 30) return `${Math.max(1, days)} hr`;
  const months = Math.round(days / 30.44);
  return `${Math.max(1, months)} bln`;
}

export function previewIntervals(state: FsrsState, now: Date, options: ScheduleOptions = {}): IntervalPreview {
  return {
    again: labelInterval(state, 1, now, options),
    hard: labelInterval(state, 2, now, options),
    good: labelInterval(state, 3, now, options),
    easy: labelInterval(state, 4, now, options),
  };
}

/**
 * Auto-grade a multiple-choice answer. Manual ratings only appear for open
 * recall; DESIGN §5.3 explicitly asks for this.
 */
export function autoRating(correct: boolean, ms: number, targetMs: number, isNewCard: boolean): Rating {
  if (!correct) return 1;
  if (isNewCard) return 3;
  const ratio = ms / Math.max(1, targetMs);
  if (ratio <= 0.6) return 4;
  if (ratio <= 1) return 3;
  return 2;
}

/** A card that keeps failing needs a different approach, not more repetitions. */
export function isLeech(state: FsrsState): boolean {
  if (state.lapses >= 4) return true;
  return state.reps >= 8 && state.stability < 1;
}

export function isDue(state: FsrsState, now: Date): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}

/** Queue ordering: weighted by exam value, decay and leech status. */
export function priority(state: FsrsState, examWeight: number, now: Date): number {
  const r = retrievability(state, now);
  const overdueDays = Math.max(0, (now.getTime() - new Date(state.due).getTime()) / 86_400_000);
  const leechBoost = isLeech(state) ? 0.35 : 0;
  return examWeight * (1 - r) + Math.min(0.5, overdueDays * 0.05) + leechBoost;
}

export function dueLabel(due: string, now: Date): string {
  const deltaMs = new Date(due).getTime() - now.getTime();
  if (deltaMs <= 0) return 'siap review';
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `dalam ${minutes} mnt`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `dalam ${hours} jam`;
  return `dalam ${Math.round(hours / 24)} hari`;
}

export { addMinutes };
