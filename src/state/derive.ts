/**
 * Derived read models. Pure functions over AppState + content; no React.
 *
 * Keeping these out of components makes the UX cheap (no duplicated business
 * logic), testable, and consistent between Today, Progress and the session
 * player.
 */
import type {
  AppState,
  Attempt,
  Concept,
  Domain,
  MockReport,
  PhaseId,
  PlanSnapshot,
  Readiness,
  SessionMode,
  SessionPlan,
  StudyCard,
  SessionRecord,
} from '../core/types.ts';
import { DOMAIN_LABEL, PHASE_ORDER, SESSION_MODES } from '../core/types.ts';
import { buildPlan, entryGate } from '../core/planner.ts';
import { computeReadiness } from '../core/readiness.ts';
import { composeSession } from '../core/session.ts';
import type { ComposeInput } from '../core/session.ts';
import { isDue, isLeech, priority } from '../core/fsrs.ts';
import { addDays, todayISO } from '../core/date.ts';
import { clamp } from '../core/util.ts';
import {
  CARD_BY_KEY,
  CONTENT_COUNTS,
  CURRICULUM,
  GRAMMAR_CARDS,
  LISTENING_CARDS,
  READING_CARDS,
} from '../content/index.ts';

export interface Stats {
  attempts: number;
  correct: number;
  accuracy: number | null;
}

export function statsFor(attempts: Attempt[]): Stats {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  return {
    attempts: attempts.length,
    correct,
    accuracy: attempts.length > 0 ? correct / attempts.length : null,
  };
}

export function domainStats(state: AppState, domain: Domain): Stats {
  return statsFor(state.attempts.filter((attempt) => attempt.domain === domain));
}

export function kanaStats(state: AppState): Stats {
  return domainStats(state, 'kana');
}

export function coveragePools(state: AppState): Record<Domain, { total: number; seen: number }> {
  const domains = Object.keys(DOMAIN_LABEL) as Domain[];
  const result = {} as Record<Domain, { total: number; seen: number }>;
  for (const domain of domains) {
    const seen = new Set(state.attempts.filter((attempt) => attempt.domain === domain).map((attempt) => attempt.itemId));
    result[domain] = { total: CONTENT_COUNTS[domain], seen: seen.size };
  }
  return result;
}

export function overallCoverage(state: AppState): number {
  const pools = coveragePools(state);
  const values = (Object.keys(pools) as Domain[]).map((domain) => {
    const pool = pools[domain];
    return pool.total > 0 ? pool.seen / pool.total : 0;
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function dueCards(state: AppState, now: Date = new Date()): StudyCard[] {
  const cards: StudyCard[] = [];
  for (const [key, scheduler] of Object.entries(state.cards)) {
    if (!isDue(scheduler, now)) continue;
    const card = CARD_BY_KEY.get(key);
    if (!card) continue;
    cards.push(card);
  }
  return cards.sort((a, b) => {
    const stateA = state.cards[a.key]!;
    const stateB = state.cards[b.key]!;
    return priority(stateB, b.examWeight, now) - priority(stateA, a.examWeight, now);
  });
}

export function overdueCards(state: AppState, today: string, now: Date = new Date()): StudyCard[] {
  return dueCards(state, now).filter((card) => {
    const scheduler = state.cards[card.key];
    return scheduler ? todayISO(new Date(scheduler.due)) < today : false;
  });
}

export function leechCards(state: AppState, now: Date = new Date()): StudyCard[] {
  return dueCards(state, now).filter((card) => {
    const scheduler = state.cards[card.key];
    return scheduler ? isLeech(scheduler) : false;
  });
}

export function recentAttemptCutoff(days: number, now: Date = new Date()): number {
  return now.getTime() - days * 86_400_000;
}

export function recentlySeenKeys(state: AppState, days = 2): Set<string> {
  const cutoff = recentAttemptCutoff(days);
  return new Set(
    state.attempts.filter((attempt) => new Date(attempt.at).getTime() >= cutoff).map((attempt) => attempt.cardKey),
  );
}

export function planFor(state: AppState, today: string = todayISO()): PlanSnapshot | null {
  if (!state.goal) return null;
  const kana = kanaStats(state);
  const vocab = domainStats(state, 'vocab');
  const listening = domainStats(state, 'listening');
  const all = statsFor(state.attempts.filter((attempt) => attempt.source !== 'mock'));
  const due = dueCards(state);
  const overdue = overdueCards(state, today);

  return buildPlan({
    goal: state.goal,
    today,
    cardCount: Object.keys(state.cards).length,
    dueCount: due.length,
    overdueCount: overdue.length,
    lastActivityDate: state.lastActivityDate,
    kanaAccuracy: kana.accuracy,
    kanaAttempts: kana.attempts,
    vocabAttempts: vocab.attempts,
    accuracy: all.accuracy,
    listeningAccuracy: listening.accuracy,
    coverage: overallCoverage(state),
    mockCount: state.mocks.length,
  });
}

export function readinessFor(state: AppState, today: string = todayISO()): Readiness | null {
  if (!state.goal) return null;
  return computeReadiness({
    today,
    examDate: state.goal.examDate,
    targetScore: state.goal.targetScore,
    attempts: state.attempts,
    cards: state.cards,
    coverage: coveragePools(state),
    mocks: state.mocks.map((mock) => mock.report),
    history: state.readinessHistory,
  });
}

export function gateChecks(state: AppState) {
  const plan = planFor(state);
  if (!plan) return [];
  const kana = kanaStats(state);
  const vocab = domainStats(state, 'vocab');
  const listening = domainStats(state, 'listening');
  const all = statsFor(state.attempts.filter((attempt) => attempt.source !== 'mock'));
  const stats = {
    kanaAttempts: kana.attempts,
    kanaAccuracy: kana.accuracy,
    vocabAttempts: vocab.attempts,
    accuracy: all.accuracy,
    listeningAccuracy: listening.accuracy,
    coverage: overallCoverage(state),
    mockCount: state.mocks.length,
    totalAttempts: state.attempts.length,
  };
  return PHASE_ORDER.map((phase) => entryGate(phase, stats));
}

const PHASE_INDEX = new Map(PHASE_ORDER.map((phase, index) => [phase, index]));

function unlockedUnits(state: AppState, phase: PhaseId): { unit: (typeof CURRICULUM)[number]; concept: Concept }[] {
  const currentIndex = PHASE_INDEX.get(phase) ?? 0;
  const units = CURRICULUM.filter((unit) => (PHASE_INDEX.get(unit.phase) ?? 0) <= currentIndex);
  const seenItems = new Set<string>();
  const out: { unit: (typeof CURRICULUM)[number]; concept: Concept }[] = [];
  for (const unit of units) {
    if (state.cards[unit.card.key]) continue;
    if (seenItems.has(unit.itemId)) continue;
    seenItems.add(unit.itemId);
    out.push({ unit, concept: unit.concept });
  }
  return out;
}

export interface PoolSummary {
  due: number;
  newItems: number;
  apply: number;
  listening: number;
  leech: number;
  overdue: number;
}

export function sessionPools(
  state: AppState,
  plan: PlanSnapshot,
  today: string,
  now: Date = new Date(),
): ComposeInput['pools'] {
  const due = dueCards(state, now).slice(0, 80);
  const newUnlocked = unlockedUnits(state, plan.currentPhase);
  const recent = recentlySeenKeys(state, 2);

  const introducedGrammar = new Set(
    Object.keys(state.cards)
      .filter((key) => key.startsWith('grammar:'))
      .map((key) => key.split(':')[1] ?? ''),
  );

  const applyPool = [
    ...GRAMMAR_CARDS.filter((card) => introducedGrammar.has(card.itemId)),
    ...(kanaStats(state).attempts >= 20 ? READING_CARDS : []),
  ].filter((card) => !recent.has(card.key));

  const listeningPool = LISTENING_CARDS.filter((card) => !recent.has(card.key));

  const fixit = fixitPool(state);

  return {
    due,
    newItems: newUnlocked.map(({ unit, concept }) => ({ concept, check: unit.card })),
    apply: applyPool.slice(0, 16),
    listening: listeningPool.slice(0, 16),
    fixit,
  };
}

export function fixitPool(state: AppState): StudyCard[] {
  const keys = new Set(
    state.errors
      .filter((error) => error.status !== 'resolved')
      .map((error) => error.cardKey),
  );
  return [...keys]
    .map((key) => CARD_BY_KEY.get(key))
    .filter((card): card is StudyCard => Boolean(card))
    .slice(0, 10);
}

export function poolSummary(state: AppState, plan: PlanSnapshot, today: string): PoolSummary {
  const pools = sessionPools(state, plan, today);
  return {
    due: pools.due.length,
    newItems: pools.newItems.length,
    apply: pools.apply.length,
    listening: pools.listening.length,
    leech: leechCards(state).length,
    overdue: overdueCards(state, today).length,
  };
}

export function previewSession(
  state: AppState,
  mode: SessionMode,
  today: string = todayISO(),
): SessionPlan | null {
  const plan = planFor(state, today);
  if (!plan) return null;
  const pools = sessionPools(state, plan, today);
  return composeSession({
    today,
    phase: plan.currentPhase,
    goalVersion: plan.goalVersion,
    mode,
    budgetMinutes: SESSION_MODES[mode].minutes,
    reviewCap: plan.reviewCap,
    newItemCap: plan.newItemCap,
    listeningMinutes: plan.listeningMinutes,
    recovery: plan.recovery,
    pools,
  });
}

export function mockReports(state: AppState): MockReport[] {
  return [...state.mocks].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).map((mock) => mock.report);
}

export function sessionStats(record: SessionRecord): {
  minutes: number;
  answered: number;
  correct: number;
  accuracy: number | null;
} {
  const answered = record.answers.length;
  const correct = record.answers.filter((answer) => answer.correct).length;
  const minutes = 0;
  return { minutes, answered, correct, accuracy: answered > 0 ? correct / answered : null };
}

export function lastSession(state: AppState): SessionRecord | null {
  return state.sessions.at(-1) ?? null;
}

export function weekFocus(plan: PlanSnapshot): string {
  switch (plan.currentPhase) {
    case 'foundations':
      return 'Kana sampai otomatis: 95% akurasi sebelum kosakata.';
    case 'n5_bridge':
      return 'Kosakata dasar + pola kalimat pertama.';
    case 'n4_core_a':
      return 'Grammar N4 inti + kanji di dalam kata.';
    case 'n4_core_b':
      return 'Semua tipe soal N4; baca kanji dalam kata.';
    case 'integration':
      return 'Reading & listening timed, lalu mock pertama.';
    case 'exam_sim':
      return 'Mock penuh, pacing, dan perbaikan error.';
    case 'taper':
      return 'Review high-yield, tidur, dan logistik ujian.';
  }
}

export function nextDays(state: AppState, today: string, count = 7): { date: string; label: string; isRest: boolean; isMock: boolean }[] {
  const plan = planFor(state, today);
  const rest = new Set(state.goal?.restDays ?? []);
  const mockDates = new Set(plan?.mockDates.map((mock) => mock.date) ?? []);
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return {
      date,
      label: index === 0 ? 'Hari ini' : `${index} hari`,
      isRest: rest.has(weekday),
      isMock: mockDates.has(date),
    };
  });
}

/** Used by Practice: a 7-day focus sentence derived from readiness factors. */
export function nextSevenDaysFocus(readiness: Readiness | null, plan: PlanSnapshot | null): string[] {
  const lines: string[] = [];
  if (readiness?.factors.length) {
    for (const factor of readiness.factors.slice(0, 3)) {
      lines.push(`${factor.label}: ${factor.action}.`);
    }
  } else {
    lines.push('Selesaikan sesi pertama supaya kami punya bukti untuk dibaca.');
  }
  if (readiness && !readiness.canShowProbability) {
    lines.push('Ambil 1 full mock setelah coverage mencapai 60% agar estimasi lebih stabil.');
  }
  if (plan?.nextMock) lines.push(`Mock berikutnya: ${plan.nextMock.label}.`);
  return lines;
}

export { clamp, todayISO };
